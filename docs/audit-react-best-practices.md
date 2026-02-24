# React best-practices audit

Audit against vercel-react-best-practices (async, bundle, server, client, rerender, rendering, js, advanced). No edits applied.

## CRITICAL

### async (waterfalls)

| Location | Issue | Rule |
|----------|--------|------|
| `app/(chat)/api/chat/route.ts` | After `auth()`, sequential: getMessageCountByUserId, then getChatById, then getMessagesByChatId or saveChat/saveMessages. getChatById and getMessageCountByUserId could run in parallel; titlePromise is already deferred. | async-parallel: parallelize independent awaits where safe. |
| `app/(chat)/api/history/route.ts` | Two separate `await auth()` calls (lines 20 and 37) — dedupe to one auth at top. | async-defer-await: single auth, reuse. |
| `app/(chat)/api/document/route.ts` | Multiple `await auth()` (21, 53, 106) — call once per request. | server-auth-actions: authenticate once. |
| `app/(chat)/api/vote/route.ts` | Two `await auth()` (16, 52). | Same. |

### server-auth-actions

| Location | Finding |
|----------|--------|
| All API routes under `app/(chat)/api/*` | Auth is present (auth() at start). Good. Ensure no route skips auth. |
| Server actions in `app/(auth)/actions.ts` | Verify actions validate session; do not trust client-only. |

## HIGH

### server-parallel-fetching

| Location | Recommendation |
|----------|----------------|
| `app/(chat)/api/chat/route.ts` | In POST: after session check, start getChatById and getMessageCountByUserId in parallel; then branch on chat existence. |

### bundle

| Location | Finding |
|----------|--------|
| Imports | No barrel (index.ts) re-exports found; direct imports from `@/components/...`, `@/lib/...`. Good. |
| Heavy components | Consider next/dynamic for Codemirror, xyflow, or other heavy UI if they are above-the-fold. |

### server-serialization

| Location | Recommendation |
|----------|----------------|
| RSC payloads | Minimize data passed to client (e.g. chat list: only id, title, updatedAt where possible). |

## MEDIUM

### rerender / rendering

| Location | Recommendation |
|----------|----------------|
| Components with isLoading / isAnimating | Consider useTransition for non-urgent UI updates (rerender-transitions). |
| Conditional render with && | Prefer ternary to avoid 0 rendering (rendering-conditional-render). |
| Memo | Audit components that receive object/array props (rerender-memo-with-default-value: hoist defaults). |

### client

| Location | Finding |
|----------|--------|
| Event listeners | Ensure global listeners (resize, etc.) are deduplicated or in a single subscriber (client-event-listeners). |

## LOW

- js-* rules: apply when touching loops, regex, storage (e.g. cache localStorage reads).
- advanced-*: init-once, useLatest for callbacks if needed.

## Summary

- **CRITICAL:** Parallelize independent awaits in chat route; dedupe auth() in history, document, vote routes.
- **HIGH:** Parallel fetch in chat route; keep bundle lean (dynamic import if needed).
- **MEDIUM:** useTransition for loading states; ternary for conditionals; memo defaults.
