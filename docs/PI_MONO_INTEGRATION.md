# pi-mono as chat provider

This app uses an OpenAI-compatible API for chat (see `lib/ai/providers.ts`). The backend is configured via:

- **AI_PROXY_URL** — Base URL for the API (e.g. `http://localhost:8317/v1`). Must expose OpenAI-style `/chat/completions` (or equivalent).
- **AI_PROXY_KEY** — API key if the backend requires it.

## Using pi-mono as the backend

[pi-mono](https://github.com/badlogic/pi-mono) provides `@mariozechner/pi-ai` (unified LLM API) and `@mariozechner/pi-web-ui` (Lit-based chat UI). It does not ship an HTTP server that exposes OpenAI-compatible endpoints.

To use pi-mono as the chat provider for this app you can:

1. **Run an OpenAI-compatible proxy that uses pi-ai**  
   Run a small service (e.g. Node/Express or a pi-mono-based server) that:
   - Exposes `POST /v1/chat/completions` (and optionally `/v1/models`).
   - Forwards requests to pi-ai (e.g. `getModel()`, `stream()` / `complete()`).
   - Returns responses in OpenAI format.  
   Then set `AI_PROXY_URL` to that service (e.g. `http://localhost:8318/v1`) and `AI_PROXY_KEY` if required.

2. **Add a custom provider in this repo (future work)**  
   Add `@mariozechner/pi-ai` as a dependency and implement a Vercel AI SDK custom provider that calls pi-ai directly (no HTTP proxy). This would allow using pi-mono as the backend without a separate service.

## Current behavior

- If `AI_PROXY_URL` is set, the app uses `createOpenAI({ baseURL: AI_PROXY_URL, apiKey: AI_PROXY_KEY })` and sends all chat requests to that URL.
- Models listed in `lib/ai/models.ts` are shown in the UI; the proxy must support the model IDs you use (e.g. map them to pi-ai provider/model names).

## Summary

| Goal                         | Action                                                                 |
|-----------------------------|------------------------------------------------------------------------|
| Use an existing OpenAI API | Set `AI_PROXY_URL` (and `AI_PROXY_KEY` if needed).                     |
| Use pi-mono as backend      | Run or build an OpenAI-compatible proxy over pi-ai; set `AI_PROXY_URL` to it. |
