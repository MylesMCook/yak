# Master fix list (from audits)

Order: CRITICAL > HIGH > MEDIUM > LOW. Source: audit-composition.md, audit-react-best-practices.md, audit-web-guidelines.md.

## CRITICAL

1. **async-parallel** — `app/(chat)/api/chat/route.ts`: parallelize getMessageCountByUserId and getChatById where safe; avoid sequential await when independent.
2. **server-auth-actions** — Dedupe auth(): call once per request in `api/history/route.ts`, `api/document/route.ts`, `api/vote/route.ts`.

## HIGH

3. **server-parallel-fetching** — Chat route: start getChatById and getMessageCountByUserId in parallel after session check.
4. **architecture-avoid-boolean-props** — Toolbar, sidebar, message/messages (isReadonly, isLoading): consider composition or context (see audit-composition.md).

## MEDIUM

5. **architecture / patterns** — Submit-button, reasoning, message-actions, artifact tree: explicit variants or compound components.
6. **rerender-transitions** — Use useTransition for loading/animating states where appropriate.
7. **rendering-conditional-render** — Replace `&&` with ternary where 0 could render.
8. **Web guidelines** — Login form labels and aria; modal focus trap and Escape.

## LOW

9. **Composition** — isReadonly duplication; sidebar/sheet variants.
10. **js-* / advanced-*** — Apply when touching relevant code (cache, init-once, etc.).
