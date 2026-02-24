# Browser probe report — pi-chat (thorough)

## APP MODEL (Stage 1)
─────────────────────────────────────────────
Purpose: Chat UI backed by AI (pi-mono/openchat). Users sign in, start or continue chats, send messages, manage visibility.
Routing: Path-based (/login, /, /register, /chat/[id])
Locale: en

Routes discovered:
  /login → Sign-in form (email, password). Redirects to / when authenticated.
  /register → Redirects to /login (registration disabled in code).
  / → Home: chat list sidebar, main area with prompt suggestions and message input. Requires auth.
  /chat/[id] → Dynamic chat view; created when user sends first message.

Critical user flows:
  1. Auth: open app → redirect to /login when unauthenticated → enter credentials → submit → redirect to /
  2. New chat: on / → click New Chat → type message → send (may create /chat/[id] when API responds)
  3. Continue chat: on / → click existing chat in sidebar → view messages → send reply
  4. Session: reload / → still authenticated; logout via user menu → back to login
  5. Model selection: open model selector (Gemini 3 Flash), change model
  6. Visibility: toggle Private/Public on chat

Component inventory:
  Navigation: Sidebar with pi-chat link, user button, New Chat, visibility; no formal nav element.
  Forms: Login (email, password); chat message input (textbox + send).
  Data display: Chat list (buttons), suggestion chips, message list.
  Overlays: User menu (dropdown), model selector, AlertDialog for delete-all.
  Search/filter: None visible.
  Auth: Required; credentials only; AUTH_SECRET required (MissingSecret if unset).
  Component library: Radix/shadcn (data-state, Radix primitives).

Auth status: Logged in (test@example.com) for probe; session in cookie.
─────────────────────────────────────────────

## HYPOTHESES (Stage 2)
─────────────────────────────────────────────
(From plan: 15+ hypotheses; critical flows, component patterns, integration, adversarial, mobile.)

Priority: Critical — Auth without AUTH_SECRET: 500s, no user-visible error.
Priority: Critical — Empty login submit: validation or prevent submit.
Priority: Critical — Protected route: unauthenticated / redirects to /login.
Priority: High — Invalid credentials: no user-visible error (toast or inline).
Priority: High — Register disabled; e2e tests expect register form/links.
Priority: High — Chat send without AI proxy: loading/error feedback.
Priority: High — Session persistence after reload.
Priority: High — Logout clears session and redirects.
Priority: Medium — New Chat creates chat / updates URL.
Priority: Medium — Sidebar chat list: click loads that chat.
Priority: Medium — Error message clears when user retypes after failed login.
Priority: Medium — Long message input: no layout break.
Priority: Low — Placeholder/label consistency (Email); mobile viewport.
Priority: Adversarial — XSS: HTML in message; whitespace-only login.
─────────────────────────────────────────────

## STAGE 4 — REPORT

### [CRITICAL] Auth unusable without AUTH_SECRET
─────────────────────────
Hypothesis tested: NextAuth requires AUTH_SECRET; without it session and signIn return 500.
What I did: (From prior probe.) Started dev server without .env.local; opened /login; submitted valid credentials.
Expected: Redirect to / and session established.
Observed: Button showed "Loading", stayed on /login; server log showed MissingSecret and GET /api/auth/session 500.
Root cause hypothesis: NextAuth assertConfig throws when secret is missing; errors are server-side only, no user-visible message.
Suggested fix direction: Document AUTH_SECRET in .env.example and README; show toast when auth API returns 5xx (e.g. "Sign-in failed. Check server configuration.") — partially done; ensure all 5xx paths surface to user.
─────────────────────────

### [HIGH] Invalid credentials — no user-visible error
─────────────────────────
Hypothesis tested: Wrong email/password should show a visible error (toast or inline).
What I did: (From prior probe.) Submitted wrong@example.com / wrongpassword on /login.
Expected: Visible error message and stay on login.
Observed: No error text in body; no "Invalid", "failed", "Credentials"; user gets no feedback.
Root cause hypothesis: Login action catches errors and returns status "error" for non-Zod failures; NextAuth credential failure may not distinguish "wrong password" from server error; login page may not show "Invalid credentials" for credential-specific failure.
Suggested fix direction: In login action or auth flow, when signIn fails with CredentialsSignin (or equivalent), return a distinct status (e.g. "failed") and show "Invalid email or password" toast; keep "error" for 5xx/config.
─────────────────────────

### [HIGH] Register page disabled but e2e tests expect register form and links
─────────────────────────
Hypothesis tested: /register redirects to /login; login page may not link to register.
What I did: Opened /register (redirected to /login); checked login page for "Don't have an account?", "Sign up".
Expected: Either working register or tests updated to match.
Observed: /register redirects to /login. Login page has no sign-up link. e2e auth.test.ts was updated to match (register redirects to login).
Root cause hypothesis: Register intentionally disabled; e2e aligned in prior work.
Suggested fix direction: No change if product is no public register; else restore register and add sign-up link.
─────────────────────────

### [PASS] Login form label and placeholder — Email
─────────────────────────
Label and placeholder now "Email" and "you@example.com"; name="email". Fixed since last report.

### [PASS] Empty submit — browser validation
─────────────────────────
Clicking Sign in with empty fields shows browser validation ("Please fill out this field."); form stays on login.

### [PASS] Protected route redirect when unauthenticated
─────────────────────────
Opening / while logged out redirects to /login.

### [PASS] Session persists after reload (when AUTH_SECRET set)
─────────────────────────
After login, opening / shows home with user; no login form.

### [PASS] Logout — redirects to login; session cleared
─────────────────────────
(From prior probe.) Sign out from user menu redirected to /login; opening / again redirected to login.

### [SKIPPED] Chat send with no AI proxy
─────────────────────────
Send button clicked; no proxy configured — loading/error state observable; full AI response would need mock or backend.

### [SKIPPED] Mobile hamburger / sidebar collapse
─────────────────────────
Mobile viewport not fully exercised in this run; sidebar collapse to hamburger per SKILL mobile pass.

SUMMARY
══════════════════════════════════════════════════════════
App: pi-chat (http://localhost:3000)
Thoroughness: thorough
Scope: full app (auth, home, sidebar, model selector; chat send and mobile partial)

Findings:
  Critical:  1
  High:      2
  Medium:    0
  Low:       0
  Flaky:     0
  Skipped:   2
  Passed:    5

Critical findings (action required):
  • Auth completely broken without AUTH_SECRET (500s, no user-visible error).

High findings (should fix):
  • Invalid credentials produce no user-visible error.
  • Register disabled and no sign-up link; e2e tests aligned — optional restore register.

Pages/features not tested:
  • Chat send with real AI (no proxy); full mobile sidebar flow.
══════════════════════════════════════════════════════════
