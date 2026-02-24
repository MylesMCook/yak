# E2E tests

## First-time setup

1. **Install browsers** (once per machine):
   ```bash
   pnpm exec playwright install chromium
   ```

2. **Create the test user** in the SQLite DB so the setup project can log in:
   ```bash
   TEST_EMAIL=test@example.com TEST_PASSWORD=yourpassword pnpm exec tsx tests/seed-test-user.ts
   ```
   Use any email/password; the script hashes the password and inserts into the users table. For CI, set the same `TEST_EMAIL` and `TEST_PASSWORD` in the environment.

3. **Run tests** with the same env so the setup project can authenticate:
   ```bash
   AUTH_SECRET=your-secret TEST_EMAIL=test@example.com TEST_PASSWORD=yourpassword pnpm test
   ```
   Or copy `.env.example` to `.env.local`, set `AUTH_SECRET`, `TEST_EMAIL`, and `TEST_PASSWORD`; Playwright loads `.env.local` via dotenv in the config.

## Project layout

- **setup**: Runs `auth.setup.ts` once; logs in and saves storage state to `tests/.auth/user.json`.
- **e2e-auth**: Runs `auth.test.ts` (login page, register redirect, protected route) without auth.
- **e2e-app**: Runs `chat.test.ts`, `api.test.ts`, `model-selector.test.ts` using the saved storage state (already logged in).

Chat/API tests that need an AI response use a mock for `/api/chat` so they pass without a real backend.
