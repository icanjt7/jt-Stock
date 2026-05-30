import asyncio
import base64
import os
import time

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Video Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://icanjt7.github.io",
        "http://localhost:5173",
        "http://localhost:4173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

ADOBE_TOKEN_URL = "https://ims-na1.adobelogin.com/ims/token/v3"
FIREFLY_BASE = "https://firefly-api.adobe.io"

_token_cache: dict = {"token": None, "expires_at": 0.0}


async def get_adobe_token() -> str:
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["token"]

    client_id = os.environ.get("ADOBE_CLIENT_ID", "")
    client_secret = os.environ.get("ADOBE_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise HTTPException(500, "Adobe credentials not configured (ADOBE_CLIENT_ID / ADOBE_CLIENT_SECRET)")

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            ADOBE_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
                "scope": "openid,AdobeID,firefly_api,ff_apis",
            },
        )
    data = res.json()
    if "access_token" not in data:
        raise HTTPException(500, f"Adobe 인증 실패: {data.get('error_description', data)}")

    _token_cache["token"] = data["access_token"]
    _token_cache["expires_at"] = now + data.get("expires_in", 3600)
    return data["access_token"]


async def upload_image_to_adobe(image_bytes: bytes, token: str, client_id: str) -> str:
    """이미지를 Adobe Storage에 업로드하고 uploadId 반환"""
    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            f"{FIREFLY_BASE}/v2/storage/image",
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-key": client_id,
                "Content-Type": "image/png",
            },
            content=image_bytes,
        )
    if res.status_code not in (200, 201):
        raise HTTPException(res.status_code, f"이미지 업로드 실패: {res.text}")
    return res.json().get("images", [{}])[0].get("id", "")


class VideoRequest(BaseModel):
    prompt: str
    image_base64: str | None = None  # 선택: 이미지→영상


@app.get("/")
def health():
    return {"status": "ok", "service": "Video Studio API"}


@app.post("/api/generate-video")
async def generate_video(req: VideoRequest):
    if not req.prompt:
        raise HTTPException(400, "prompt 필요")

    token = await get_adobe_token()
    client_id = os.environ.get("ADOBE_CLIENT_ID", "")

    headers = {
        "Authorization": f"Bearer {token}",
        "x-api-key": client_id,
        "Content-Type": "application/json",
    }

    payload: dict = {
        "numVariations": 1,
        "prompt": req.prompt,
        "size": {"width": 1920, "height": 1080},
    }

    # 이미지가 있으면 Image-to-Video, 없으면 Text-to-Video
    if req.image_base64:
        image_bytes = base64.b64decode(req.image_base64)
        upload_id = await upload_image_to_adobe(image_bytes, token, client_id)
        payload["image"] = {"source": {"uploadId": upload_id}}

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            f"{FIREFLY_BASE}/v3/videos/generate-async",
            headers=headers,
            json=payload,
        )

    if res.status_code not in (200, 202):
        raise HTTPException(res.status_code, f"Adobe Firefly 오류 ({res.status_code}): {res.text}")

    job_data = res.json()
    job_id = job_data.get("jobId") or job_data.get("job_id")

    # 동기 응답이면 바로 반환
    if not job_id:
        return _extract_video_output(job_data)

    # 비동기 폴링 (최대 5분)
    async with httpx.AsyncClient(timeout=30) as client:
        for _ in range(60):
            await asyncio.sleep(5)
            poll = await client.get(
                f"{FIREFLY_BASE}/v3/videos/{job_id}",
                headers=headers,
            )
            status_data = poll.json()
            status = status_data.get("status", "")

            if status == "succeeded":
                return _extract_video_output(status_data)
            elif status in ("failed", "error"):
                raise HTTPException(500, f"영상 생성 실패: {status_data}")

    raise HTTPException(504, "영상 생성 시간 초과 (5분)")


def _extract_video_output(data: dict) -> dict:
    outputs = data.get("outputs", [data])
    video = outputs[0] if outputs else data
    url = (
        video.get("video", {}).get("url")
        or video.get("url")
        or video.get("href")
    )
    return {"status": "success", "video_url": url, "raw": video}
