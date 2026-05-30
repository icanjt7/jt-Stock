import asyncio
import base64
import os
import tempfile
import time

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response as FastAPIResponse
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
        raise HTTPException(500, "Adobe credentials not configured")
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
    image_base64: str | None = None


@app.get("/")
def health():
    return {"status": "ok", "service": "Video Studio API"}


_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
    "Referer": "https://www.google.com/",
}


def _extract_og_image(html: str) -> str | None:
    import re
    patterns = [
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+name=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'"image"\s*:\s*"(https://[^"]+\.(jpg|jpeg|png|webp)[^"]*)"',
    ]
    for pattern in patterns:
        m = re.search(pattern, html, re.IGNORECASE)
        if m:
            return m.group(1).replace("&amp;", "&").replace("&#39;", "'")
    return None


@app.get("/api/proxy-image")
async def proxy_image(url: str):
    """외부 이미지/웹페이지 URL → 이미지 반환 (CORS 우회 + og:image 자동 추출)"""
    try:
        async with httpx.AsyncClient(
            timeout=30, follow_redirects=True, headers=_BROWSER_HEADERS
        ) as client:
            res = await client.get(url)

        ct = res.headers.get("content-type", "").split(";")[0].strip().lower()

        # HTML 페이지이면 og:image 추출 후 실제 이미지 재요청
        if "html" in ct:
            image_url = _extract_og_image(res.text)
            if not image_url:
                raise HTTPException(404, "페이지에서 이미지를 찾을 수 없습니다. 직접 이미지 URL을 사용해주세요.")
            async with httpx.AsyncClient(
                timeout=30, follow_redirects=True, headers=_BROWSER_HEADERS
            ) as client:
                res = await client.get(image_url)
            ct = res.headers.get("content-type", "image/jpeg").split(";")[0].strip()

        if not res.is_success:
            raise HTTPException(res.status_code, f"이미지 요청 실패: HTTP {res.status_code}")

        return FastAPIResponse(content=res.content, media_type=ct or "image/jpeg")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"이미지 프록시 오류: {e}")


@app.post("/api/generate-video")
async def generate_video_adobe(req: VideoRequest):
    """Adobe Firefly 영상 생성"""
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
        raise HTTPException(res.status_code, f"Adobe Firefly 오류: {res.text}")

    job_data = res.json()
    job_id = job_data.get("jobId") or job_data.get("job_id")
    if not job_id:
        return _extract_video_output(job_data)

    async with httpx.AsyncClient(timeout=30) as client:
        for _ in range(60):
            await asyncio.sleep(5)
            poll = await client.get(f"{FIREFLY_BASE}/v3/videos/{job_id}", headers=headers)
            status_data = poll.json()
            if status_data.get("status") == "succeeded":
                return _extract_video_output(status_data)
            elif status_data.get("status") in ("failed", "error"):
                raise HTTPException(500, f"영상 생성 실패: {status_data}")
    raise HTTPException(504, "영상 생성 시간 초과")


def _extract_video_output(data: dict) -> dict:
    outputs = data.get("outputs", [data])
    video = outputs[0] if outputs else data
    url = video.get("video", {}).get("url") or video.get("url") or video.get("href")
    return {"status": "success", "video_url": url, "raw": video}


@app.post("/api/generate-video-hf")
async def generate_video_hf(request: Request):
    """HuggingFace Spaces (Gradio) 경유 무료 영상 생성"""
    body = await request.json()
    prompt = body.get("prompt", "")
    if not prompt:
        raise HTTPException(400, "prompt 필요")

    hf_token = os.environ.get("HF_TOKEN", "")
    image_base64 = body.get("image_base64")

    # 이미지를 임시 파일로 저장
    image_path = None
    if image_base64:
        try:
            img_bytes = base64.b64decode(image_base64)
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            tmp.write(img_bytes)
            tmp.close()
            image_path = tmp.name
        except Exception:
            pass

    # gradio_client는 동기 라이브러리이므로 스레드풀에서 실행
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(
            None, _generate_video_gradio, prompt, image_path, hf_token
        )
        return {"status": "success", "video_url": result}
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        if image_path:
            try:
                os.unlink(image_path)
            except Exception:
                pass


def _generate_video_gradio(prompt: str, image_path: str | None, hf_token: str) -> str:
    """gradio_client로 HF Space 호출 (동기, 스레드풀용)"""
    from gradio_client import Client, handle_file

    spaces = [
        "Lightricks/LTX-Video",
        "multimodalart/stable-video-diffusion",
        "wangfuyun/AnimateLCM-SVD",
    ]

    last_err = ""
    for space_id in spaces:
        try:
            client = Client(space_id, hf_token=hf_token or None)

            # API 구조 파악
            try:
                api = client.view_api(return_format="dict")
            except Exception:
                api = {}

            named = api.get("named_endpoints", {})

            # 프롬프트 파라미터가 있는 엔드포인트 찾기
            target_ep = None
            for ep_name, ep_info in named.items():
                params = ep_info.get("parameters", [])
                if any("prompt" in p.get("label", "").lower() for p in params):
                    target_ep = ep_name
                    break

            # 엔드포인트 없으면 첫 번째 사용
            if not target_ep and named:
                target_ep = list(named.keys())[0]

            # kwargs 빌드
            kwargs: dict = {}
            if target_ep and named.get(target_ep):
                for p in named[target_ep].get("parameters", []):
                    label = p.get("label", "").lower()
                    name = p.get("parameter_name", "")
                    if not name:
                        continue
                    if "prompt" in label and "negative" not in label:
                        kwargs[name] = prompt
                    elif "negative" in label:
                        kwargs[name] = "worst quality, blurry, jittery"
                    elif "seed" in label:
                        kwargs[name] = 42
                    elif "image" in label and image_path:
                        kwargs[name] = handle_file(image_path)
            else:
                # 엔드포인트 정보 없으면 최소 인자
                kwargs = {"prompt": prompt}
                if image_path:
                    kwargs["image"] = handle_file(image_path)

            # 실행 (최대 5분 대기)
            result = client.predict(
                **kwargs,
                api_name=target_ep or "/predict",
            )

            # 결과에서 URL 추출
            return _extract_gradio_video_url(result)

        except Exception as e:
            last_err = f"{space_id}: {e}"
            continue

    raise Exception(f"모든 Space 시도 실패.\n{last_err}")


def _extract_gradio_video_url(result) -> str:
    if isinstance(result, str):
        if result.startswith("http") or result.endswith((".mp4", ".webm")):
            return result
    if isinstance(result, (list, tuple)):
        for item in result:
            url = _extract_gradio_video_url(item)
            if url:
                return url
    if isinstance(result, dict):
        for key in ("url", "path", "video", "output"):
            if key in result:
                url = _extract_gradio_video_url(result[key])
                if url:
                    return url
    return ""
