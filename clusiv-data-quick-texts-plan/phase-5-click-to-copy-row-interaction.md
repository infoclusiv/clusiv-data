# Phase 5 — Remove copy button and copy on quick text box click

## Objective

Change quick text card interaction so the whole quick text box copies its content to the clipboard, while removing the explicit `Copiar` button. The only visible quick text action buttons should be edit and delete.

## Expected behavior

- The `Copiar` button is no longer visible in quick text rows/cards.
- Clicking anywhere on the quick text box copies its content to the clipboard.
- Edit and delete buttons remain visible.
- Clicking edit or delete does not trigger copy.
- Keyboard users can focus the quick text row and press Enter or Space to copy.
- A success snackbar appears after copy.
- Copy failures show the existing error snackbar behavior.

## Files/components involved

- `src/lib/components/quick-texts/QuickTextRow.svelte`
- `src/lib/components/quick-texts/QuickTextGroupCard.svelte`
- `src/lib/components/quick-texts/QuickTextsListView.svelte`
- `src/lib/views/QuickTextsView.svelte`

Optional:

- `src/lib/store/appState.svelte.ts` if copy observability events are added centrally

## Preconditions before implementation

- Grouped and list views still use `QuickTextRow`.
- `QuickTextsView.svelte` still owns `handleCopy(quickText)` and passes `oncopy` down to child components.
- Edit and delete handlers are still passed separately as `onedit` and `ondelete`.

## Implementation steps

### 1. Remove clipboard icon/button import

In `QuickTextRow.svelte`, remove:

```ts
Clipboard
```

from the `lucide-svelte` import.

### 2. Remove the visible copy button

Remove the button with label/span `Copiar` from the row actions.

The remaining action buttons should be:

- Editar
- Borrar / Eliminar icon button

### 3. Make the row/card clickable

Update the outer wrapper in `QuickTextRow.svelte` so it behaves as a clickable card.

Suggested approach:

```svelte
<div
  class="card ... cursor-pointer ..."
  role="button"
  tabindex="0"
  onclick={oncopy}
  onkeydown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      oncopy();
    }
  }}
>
```

Use styling that communicates clickability without making the UI noisy:

- `cursor-pointer`
- subtle hover background/shadow if consistent with existing cards
- optional `focus-visible` ring classes

### 4. Prevent edit/delete clicks from copying

For edit and delete buttons, stop event propagation:

```svelte
onclick={(event) => {
  event.stopPropagation();
  onedit();
}}
```

and similarly for delete.

Also ensure keyboard activation on those buttons does not bubble into the row copy behavior.

### 5. Confirm copy behavior in both views

Because both grouped and list mode use `QuickTextRow`, verify:

- grouped view copies on row click;
- list view copies on row click;
- edit/delete do not copy in either mode.

### 6. Optional observability improvement

In `QuickTextsView.svelte`, update `handleCopy` to log frontend events using existing `logClientEvent` if appropriate:

- `copy_quick_text_started`
- `copy_quick_text_completed`
- `copy_quick_text_failed`

Context should include:

- `quickTextId`
- `hasTitle`
- `contentLength`

Do not log quick text content.

## Success criteria

- No visible `Copiar` button remains in quick text rows/cards.
- Clicking the card copies quick text content.
- Edit and delete remain visible and work normally.
- Edit/delete clicks do not copy content.
- Keyboard copy works with Enter and Space.
- `pnpm run check` passes.
- `pnpm run build` passes.

## How to verify

1. Open **Textos Rápidos** in grouped mode.
2. Click the body/title/preview area of a quick text card.
3. Paste elsewhere and confirm the content was copied.
4. Click `Editar` and confirm the edit dialog opens without copying.
5. Click delete and confirm the delete confirmation opens without copying.
6. Switch to list mode and repeat the same checks.
7. Use keyboard Tab to focus a row and press Enter/Space to copy.

## Observable failure signals

- The copy button still appears.
- Clicking the row does nothing.
- Clicking edit/delete also copies content.
- Clipboard errors appear even when clicking edit/delete.
- Focus styles are missing or keyboard activation does not work.
- `QuickTextRow` has invalid accessibility warnings.

## Stop conditions

Stop and report if:

- `QuickTextRow` is no longer the shared component for grouped/list quick texts.
- Copy handling has moved out of `QuickTextsView.svelte` and the new copy architecture is unclear.
- The current UI already implemented card-level copy in another branch.
- Removing the copy button conflicts with another explicit product requirement in the repository.
