# pi-chat: what's done and what to fix next

## Run locally (minimal)

1. Copy `.env.example` to `.env.local`.
2. Set **AUTH_SECRET** (required). Example: `openssl rand -base64 32`.
3. Optionally set **DATABASE_PATH** (default: `./data/pi-chat.sqlite`).
4. Run:
   ```bash
   pnpm install
   pnpm db:migrate
   pnpm dev
   ```
5. To actually send messages, point at a chat backend: set **AI_PROXY_URL** (and **AI_PROXY_KEY** if needed) for your pi-mono or other OpenAI-compatible API (see docs/PI_MONO_INTEGRATION.md).

No Postgres, Redis, or BLOB token needed. File uploads are disabled (API returns 501).

---

## Done

- Phase 5: SQLite only; renamed to pi-chat; Redis/Postgres removed.
- Browser probe (thorough): report in docs/BROWSER_PROBE_REPORT.md.
- Fixes from probe: AUTH_SECRET and README clarified; login form label/placeholder "Email"; e2e auth tests aligned with current app (no register form, register redirects).
- Auth 5xx UX: login page shows toast "Sign-in failed. Check server configuration." on non-Zod errors; actions return `{ status: "error" }`.
- Lint/format: prompts block statement fixed; `pnpm lint` and format clean.
- E2e: auth setup project (login, save storage state), e2e-auth and e2e-app projects; chat API mocked in api.test.ts so chat/redirect/stop tests pass without a backend. See **E2e** below.

---

## E2e (Playwright)

1. **Install browsers once:** `pnpm exec playwright install chromium`
2. **Create test user** (so setup can log in):  
   `TEST_EMAIL=test@example.com TEST_PASSWORD=yourpassword pnpm exec tsx tests/seed-test-user.ts`  
   Use the same `TEST_EMAIL` and `TEST_PASSWORD` when running tests (e.g. in `.env.local` or env).
3. **Run:** `pnpm test` (or `pnpm exec playwright test`). Config loads `.env.local`; ensure `AUTH_SECRET`, `TEST_EMAIL`, and `TEST_PASSWORD` are set.

Details: [tests/README.md](../tests/README.md).

---

## Fix next (priority)

1. **Optional: file uploads**  
   To enable uploads, implement `/api/files/upload` (e.g. with Vercel Blob or local disk), set BLOB_READ_WRITE_TOKEN (or equivalent) in env, and document in .env.example.

2. **Optional: Phase 4 waves**  
   From the main plan: composition, React best practices, web guidelines in waves. See chat_web_app_fixes plan Phase 4.

---

## Deploy

- **Docker:** `docker compose up`; app uses `DATABASE_PATH=/data/pi-chat.sqlite` and the `pichatdata` volume. Set AUTH_SECRET (and AI_PROXY_* if needed) in the environment.
- **Vercel:** Not a natural fit (SQLite is local filesystem). Prefer a Node host (e.g. a VPS or container) where the process can write to a persistent volume for the SQLite file.
