# Composition audit

Audit against vercel-composition-patterns (architecture, state, patterns). No edits applied.

## Findings

### architecture-avoid-boolean-props

Many components use boolean props for mode/state. Prefer composition or explicit variant components.

| File | Recommendation |
|------|----------------|
| `components/ui/sidebar.tsx` | `isMobile` — consider responsive composition or context instead of prop drilling. |
| `components/submit-button.tsx` | `isSuccessful` — consider explicit variant (e.g. `<SubmitButton.Success />`) or state from parent. |
| `components/toolbar.tsx` | `isToolbarVisible`, `isAnimating` — consider compound component or render props for toolbar state. |
| `components/message.tsx` | `isLoading`, `isReadonly` — consider `<Message.Skeleton />` and readonly as context or wrapper. |
| `components/messages.tsx` | `isReadonly`, `isArtifactVisible` — lift to layout or context; avoid threading booleans. |
| `components/chat.tsx`, `chat-header.tsx`, `document.tsx`, `document-preview.tsx` | `isReadonly` repeated — centralize in one context or layout. |
| `components/elements/reasoning.tsx` | `isStreaming`, `isOpen` — consider `<Reasoning.Collapsed />` / `<Reasoning.Streaming />`. |
| `components/artifact.tsx`, `create-artifact.tsx` | `isVisible`, `isCurrentVersion`, `isDisabled` — consider compound artifact component with clear variants. |
| `components/image-editor.tsx`, `sheet-editor.tsx`, `text-editor.tsx` | `isCurrentVersion`, `isInline` — explicit variant components. |

### patterns-explicit-variants

Where behavior is "mode A vs mode B", use named variant components instead of booleans.

| File | Recommendation |
|------|----------------|
| `components/message-actions.tsx` | Upvoted / not upvoted — `<MessageActions.Upvoted />` vs default. |
| `components/preview-attachment.tsx` | `isUploading` — `<PreviewAttachment.Uploading />` or loading slot. |

### state-lift-state / compound components

| File | Recommendation |
|------|----------------|
| `components/ui/sidebar.tsx` | Sidebar state (active item, mobile) — consider SidebarProvider + compound Sidebar.Item, Sidebar.Trigger. |

## Summary

- **High impact:** toolbar, sidebar, message/messages (readonly/loading), artifact tree (isCurrentVersion, isVisible).
- **Medium:** submit-button, reasoning, message-actions, preview-attachment.
- **Low:** individual isReadonly duplication (refactor when touching those files).
