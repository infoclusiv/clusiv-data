# Phase 4 — Make node editor internals resilient to small width and short height

## Single objective
Fix internal overflow inside `FlowNodeEditorPanel.svelte` so the title/actions row, description textarea, linked notes, comments textarea, and footer controls remain readable and reachable at smaller window sizes.

## Expected behavior
Inside the node editor, content should flow naturally and respect card boundaries. Textareas should have practical responsive minimum heights, action buttons should wrap without covering other content, and long linked-note/comment content should scroll or wrap inside its own area rather than forcing overlap.

## Success criteria
- The description textarea stays inside the edit card at all tested sizes.
- The description textarea is usable on short windows without forcing the footer buttons off-screen with no scroll path.
- `Quitar nodo` and `Listo` remain reachable through normal vertical scrolling.
- The title input and flow action buttons wrap into safe rows/columns instead of compressing or overlapping.
- The notes/comments panel content remains within its card and does not visually cover the edit card.
- The change does not alter node update callbacks, note linking callbacks, or delete/insert/two-path actions.

## Suggested implementation direction
Work only in `src/lib/components/flows/FlowNodeEditorPanel.svelte` unless current inspection proves a shared UI class must be adjusted.

Evaluate and apply minimal class/layout changes such as:

- Add `min-w-0` to edit-card and aside-card wrappers where child content can force width.
- Replace the internal header/action grid breakpoint with a content-safe layout. Avoid viewport-only `xl` for the title/actions row if it can force overflow inside a narrow parent.
- Remove or reduce rigid textarea constraints equivalent to:
  - `flex-1` on the description textarea when the parent is allowed to grow naturally.
  - `xl:min-h-[420px]` when it creates excessive vertical pressure.
- Use responsive textarea minimums such as a smaller base height with larger heights only when there is enough room.
- Ensure textareas use `max-w-full`/`w-full` and `overflow-y-auto` where appropriate.
- For linked-note card grids, consider an auto-fit/minmax pattern or keep a one-column layout until enough actual width exists.
- Keep `resize-y` if it improves user control, but do not allow resizing to break the card layout.

Example direction, not final copy-paste code:

```svelte
<textarea
  class="input-base min-h-[220px] w-full max-w-full resize-y overflow-y-auto leading-7 sm:min-h-[280px] lg:min-h-[320px]"
>
```

Use the real UI to decide the final minimum heights.

## How to verify
1. Run `pnpm run check`.
2. Test node editor at 1366×768, 1280×720, 1100×700, and a very short window if possible.
3. Paste or create a long node description and long node comments.
4. Confirm typing in description and comments still updates/autosaves.
5. Confirm copy-description still works when the description has content.
6. Link/unlink a note if test data permits.
7. Use these node actions if available:
   - Insert before
   - Insert after
   - Open two paths
   - Add to branch when applicable
   - Delete node
8. Confirm no section overlaps another section during any of those actions.

## Observable failure signals
- The description textarea still exceeds the card or appears underneath the notes/comments panel.
- The footer buttons disappear without page scroll access.
- The action buttons overlap the title input or become truncated/unreadable.
- Linked-note cards force horizontal overflow.
- Textarea typing no longer persists or autosave stops working.
- Copy, link, unlink, delete, or insert actions stop firing.

## Files/components involved
- Primary: `src/lib/components/flows/FlowNodeEditorPanel.svelte`
- Callback/context verification: `src/lib/views/FlowEditorView.svelte`, `src/lib/store/appState.svelte.ts`

## Preconditions before implementation
- Phase 3 is complete and the outer edit/notes column behavior is safe.
- The agent has verified that remaining issues are inside the component, not parent container sizing.
- A test flow with at least one editable node is available.

## Stop conditions if the plan does not match the real codebase
Stop and report if:

- The internal overlap disappears after Phase 3 and no further changes are needed.
- The remaining issue is caused by global button/input styles rather than local node editor layout.
- Fixing this phase would require changing data updates, autosave scheduling, note lookup utilities, or flow graph utilities.
- The desired behavior conflicts with an existing product requirement not reflected in this plan.
