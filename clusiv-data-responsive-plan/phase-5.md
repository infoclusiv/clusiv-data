# Phase 5 — Final responsive regression verification and cleanup

## Single objective
Validate that the phased layout fixes solve the reported issue without regressing flow editing, canvas mode, note linking, autosave, or the broader app shell.

## Expected behavior
The node editor should be fully responsive across tested window sizes. The flow editor should remain stable in both node-editor mode and canvas/context mode. No unrelated UI or data behavior should change.

## Success criteria
- `pnpm run check` passes.
- `pnpm run build` passes.
- The node editor is usable at all manual test sizes listed in `README_AGENT.md`.
- No unintended horizontal scrollbar appears on the app shell or flow editor page.
- In smaller windows, the layout stacks safely and uses vertical scroll instead of overlap.
- In sufficiently wide windows, the two-column layout, if enabled, does not overflow.
- Autosave status still transitions correctly when editing title, description, comments, linked notes, or flow comments.
- Flow graph operations still work:
  - Add node to end.
  - Insert before first.
  - Insert before selected node.
  - Insert after selected node when allowed.
  - Insert between edge from canvas.
  - Delete selected node and reconnect graph.
  - Open two paths / add to branch when conditions allow.
- Non-node-editor flow mode still renders title section, `FlowCanvas`, and `FlowContextPanel`.

## How to verify
1. Run:

```bash
pnpm run check
pnpm run build
pnpm run test:flows
```

2. If local setup supports it, run:

```bash
pnpm run tauri dev
```

3. Manual responsive matrix:

| Window size | Expected result |
| --- | --- |
| 1600×900+ | Two-column layout may appear only if the editor content width is sufficient; no overflow. |
| 1366×768 | Layout must not overlap; stacked mode is acceptable and preferred if content width is constrained by sidebar. |
| 1280×720 | Layout must stack or otherwise stay within bounds; all controls reachable. |
| 1100×700 | Layout must stack; vertical scroll reveals all content. |
| 900×700 | Layout must remain usable with sidebar visible, or any existing app-level limitations must be clearly reported. |

4. Test with sidebar width near minimum and near maximum. The layout should adapt to the remaining content width.
5. Test with long text in:
   - Flow title
   - Node title
   - Node description
   - Node comments
   - Linked note previews
6. Confirm there is no console error after opening/closing node editor repeatedly.
7. Confirm the screenshots from the original bug can no longer be reproduced.

## Observable failure signals
- Any tested size still shows notes/comments overlaying the description card.
- The flow editor body cannot scroll to hidden controls.
- There is horizontal overflow on the full app window.
- The visual canvas mode regresses.
- `pnpm run check`, `pnpm run build`, or `pnpm run test:flows` fails due to the layout changes.
- Autosave stops persisting node fields or flow comments.
- Node graph actions throw errors or stop updating the graph.

## Files/components involved
Likely changed files:

- `src/lib/views/FlowEditorView.svelte`
- `src/lib/components/flows/FlowNodeEditorPanel.svelte`

Verification-only files/components:

- `src/App.svelte`
- `src/app.css`
- `src/lib/components/layout/Sidebar.svelte`
- `src/lib/components/flows/FlowCanvas.svelte`
- `src/lib/components/flows/FlowContextPanel.svelte`
- `src/lib/store/appState.svelte.ts`
- `src/lib/store/types.ts`
- `src/lib/utils/flowGraphUtils.ts`
- `src/lib/components/flows/flowLayout.ts`

## Preconditions before implementation
- Phases 1 through 4 have been completed or explicitly marked unnecessary with evidence.
- Any local screenshots or notes from the original failure are available for comparison.
- The working tree contains only the intended responsive changes.

## Stop conditions if the plan does not match the real codebase
Stop and report if:

- Verification reveals the root cause was only partially addressed.
- Fixing remaining issues would require global app shell changes outside the phase scope.
- Any flow graph, persistence, or autosave behavior regresses.
- The responsive fix introduces accessibility or usability regressions, such as unreachable buttons or broken keyboard focus order.

## Final report required before merging
The implementation agent should report:

- Which phases were implemented.
- Which files changed.
- Commands run and their results.
- Manual window sizes tested.
- Whether the original overlap/overflow is fixed.
- Any remaining limitations or follow-up recommendations.
