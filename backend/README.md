---
title: Video Studio API
emoji: 🎬
colorFrom: purple
colorTo: blue
sdk: docker
pinned: false
---

# Video Studio API

FastAPI backend for AI Video Studio.
Proxies Adobe Firefly video generation requests from the GitHub Pages frontend.

## Endpoints

- `GET /` — health check
- `POST /api/generate-video` — Adobe Firefly video generation

## Required Secrets (HF Space Settings → Repository secrets)

- `ADOBE_CLIENT_ID` — Adobe Developer Console Client ID
- `ADOBE_CLIENT_SECRET` — Adobe Developer Console Client Secret
