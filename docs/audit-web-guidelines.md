# Web interface guidelines audit

Audit for accessibility, keyboard, forms, and performance. Guidelines source: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md (fetch when running full check). Below: findings from static scan.

## Accessibility (a11y)

| File / area | Finding |
|-------------|--------|
| `app/(auth)/login` | Login form: ensure inputs have associated labels (label[for] or aria-label); submit button has accessible name. |
| `components/multimodal-input.tsx` | Model selector and input: ensure focus order and aria-expanded for dropdowns. |
| `components/ui/sidebar.tsx` | Sidebar nav: use nav landmark, aria-current for active item. |
| Modals / dialogs | Ensure role="dialog", aria-modal, focus trap, and Escape to close. |
| Buttons / links | Use semantic button vs a; avoid div with onClick without role and keyboard handler. |

## Keyboard

| Area | Recommendation |
|------|----------------|
| Chat input | Enter to send; Shift+Enter for newline (if not already). |
| Model selector | Arrow keys to move, Enter to select; Tab to leave. |
| Modals | Focus trap; Tab cycles within modal; Escape closes. |

## Forms

| Area | Recommendation |
|------|----------------|
| Login | Required fields: aria-required or required; validation errors: role="alert" or aria-describedby. |
| Chat input | If file upload: clear label and error state. |

## Performance

| Area | Recommendation |
|------|----------------|
| Streaming | Already using streamed responses; avoid layout thrash during stream. |
| Images | next/image in use; ensure remotePatterns cover all needed hosts. |

## Notes

- Full checklist: run with fetched command.md and apply each rule to pages/components.
- Radix UI (sidebar, dialog, dropdown) provides baseline a11y; verify focus and keyboard for custom pieces.
