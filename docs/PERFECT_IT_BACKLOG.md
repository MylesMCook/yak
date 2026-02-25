# Perfect-it backlog — Yak

Prioritized list of work to make Yak a full-featured, production-ready web app. Sources: browser-probe report, Web Interface Guidelines audit, and React best-practices audit. Order by severity; group by area.

---

## Critical (action required)

| # | Title | Source | Area | Description |
|---|--------|--------|------|-------------|
| 1 | Auth unusable without AUTH_SECRET | probe | Auth | When AUTH_SECRET is missing, NextAuth returns 500; user sees only "Loading" with no error. Ensure 5xx from auth APIs surface as toast (e.g. "Sign-in failed. Check server configuration.") and document AUTH_SECRET in .env.example and README. |

---

## High (should fix)

| # | Title | Source | Area | Description |
|---|--------|--------|------|-------------|
| 2 | Invalid credentials — no user-visible error | probe | Auth | Wrong email/password leaves user on login with no toast or inline message. Differentiate credential failure from server error in login action; show "Invalid email or password" for credential failure. |
| 3 | Register disabled vs e2e expectations | probe | Auth | /register redirects to /login; no sign-up link. e2e tests are aligned. Optionally restore register and add "Sign up" link if product wants it. |
| 4 | Icon-only buttons need aria-label | web-guidelines | Sidebar | app-sidebar.tsx: TrashIcon and PlusIcon (New Chat) buttons are icon-only; add aria-label (e.g. "Delete all chats", "New chat") for a11y when tooltip is not visible. |
| 5 | Email input type | web-guidelines | Auth | components/auth-form.tsx:35 — use type="email" for the email field (currently type="text") for correct inputmode and validation. |

---

## Medium (notable UX / quality)

| # | Title | Source | Area | Description |
|---|--------|--------|------|-------------|
| 6 | Loading state copy | web-guidelines | Auth | components/submit-button.tsx:33 — use "Loading…" (ellipsis character) per guidelines for loading states. |
| 7 | Navigation via pushState | web-guidelines | Chat | components/suggested-actions.tsx:39 — uses window.history.pushState + sendMessage; prefer &lt;Link&gt; or router for navigation so Cmd/Ctrl+click and middle-click work. |
| 8 | Barrel imports (icons) | react-best-practices | Code quality | bundle-barrel-imports: Import icons directly from lucide-react (or source) instead of @/components/icons in app-sidebar.tsx, submit-button.tsx, artifacts/*/client.tsx, etc., to reduce bundle and improve tree-shaking. |
| 9 | File uploads disabled | GO_FORWARD | Chat | /api/files/upload returns 501. Implement upload (e.g. Vercel Blob or local disk) and document env, or document as intentionally disabled. |
| 10 | Empty login validation UX | probe (prior) | Auth | Optional: show inline or toast message for invalid_data (e.g. "Email and password are required") in addition to browser validation. |

---

## Low (polish / edge cases)

| # | Title | Source | Area | Description |
|---|--------|--------|------|-------------|
| 11 | Placeholder pattern | web-guidelines | Auth | Placeholders for example patterns can end with "…" per guidelines; auth-form placeholders are acceptable as-is; optional consistency pass. |
| 12 | Mobile viewport pass | probe | Mobile | Run full mobile pass (390px): sidebar collapse, hamburger, navigate 2–3 routes; record responsive issues. |
| 13 | Chat send without proxy | probe | Chat | With AI_PROXY_URL set, verify loading and error states and that /chat/[id] updates after send. |

---

## Web Interface Guidelines — file:line (terse)

## app/(auth)/login/page.tsx

- Toast for errors: ensure toast component or region has aria-live="polite" for async updates (submit-button has sr-only output with aria-live; login page toasts should be announced).

## components/auth-form.tsx

- components/auth-form.tsx:35 — email input type="text" → use type="email".
- components/auth-form.tsx:34 — placeholder "you@example.com" — optional: end with "…" for example pattern per guidelines.

## components/app-sidebar.tsx

- components/app-sidebar.tsx:80–87 — icon-only button (TrashIcon) needs aria-label (e.g. "Delete all chats").
- components/app-sidebar.tsx:96–100 — icon-only button (New Chat area) ensure aria-label if not text (e.g. "New chat").

## components/submit-button.tsx

- components/submit-button.tsx:33 — "Loading" → "Loading…" (ellipsis character).

## components/suggested-actions.tsx

- components/suggested-actions.tsx:39 — navigation via window.history.pushState; prefer &lt;Link&gt; or router for Cmd+click support.

## components/ui (shared)

- ui/button.tsx, ui/input.tsx, etc. use focus-visible:outline-none with focus-visible:ring-2 — focus replacement present; no change required for outline rule.

---

## React best-practices — file:line + rule

- **bundle-barrel-imports** (CRITICAL): Prefer direct imports over barrel.
  - components/app-sidebar.tsx:10 — `from "@/components/icons"` → import PlusIcon, TrashIcon from "lucide-react" (or actual source).
  - components/submit-button.tsx:5 — `from "@/components/icons"` → direct LoaderIcon import.
  - artifacts/image/client.tsx, artifacts/sheet/client.tsx, artifacts/text/client.tsx, artifacts/code/client.tsx — same for icons.
- **async-parallel**: app/(chat)/api/chat/route.ts uses Promise.all for messageCount + chat — good; no change.

---

## Summary

- **Critical:** 1 (auth without AUTH_SECRET).
- **High:** 4 (invalid credentials UX, register/e2e, icon aria-labels, email input type).
- **Medium:** 5 (loading copy, suggested-actions nav, barrel imports, file uploads, empty validation UX).
- **Low:** 3 (placeholder pattern, mobile pass, chat send with proxy).

Implement in order: Critical first, then High, then Medium. Low and skipped items (mobile, chat send verification) can follow or run in parallel.
