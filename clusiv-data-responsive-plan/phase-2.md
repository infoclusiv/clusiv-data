# Phase 2 — Stabilize the parent flow editor scroll and sizing contract

## Single objective
Make `FlowEditorView.svelte` provide a safe, predictable layout container for the node editor so child content can scroll vertically instead of overflowing or visually escaping its parent.

## Expected behavior
When a node is being edited, the flow editor body should behave as a bounded vertical scrolling area. The node editor should be allowed to grow naturally in height when the window is short, and the user should be able to scroll to all sections. The header and top actions should continue wrapping without covering the body.

## Success criteria
- Opening a node editor no longer forces the entire node editor content into a fixed-height box that clips or causes child overflow.
- The main content region keeps `min-width: 0` behavior so children cannot force the app wider than the available content area.
- At 1366×768 and 1280×720, the page body scrolls vertically when needed.
- The flow header remains usable and does not overlap the editor body.
- The non-node-editor mode still shows title editing, `FlowCanvas`, and `FlowContextPanel` as before.

## Suggested implementation direction
Work only in `src/lib/views/FlowEditorView.svelte` unless the current code proves another parent component is the real cause.

Consider these low-risk adjustments after validating them against the real DOM:

- Add `min-w-0` to the top-level `.page-panel` or immediate content wrappers that participate in flex layout.
- Ensure the body wrapper is both `min-h-0` and `min-w-0`.
- Replace the node-editor-open wrapper pattern equivalent to `h-full min-h-0` with a pattern that does not force the child to fit into a single viewport-height slot. Examples to evaluate:
  - `min-h-full min-w-0`
  - `min-h-0 min-w-0`
  - a natural-height wrapper inside the existing `overflow-y-auto` body
- Keep the existing autosave, selected-node, and event handler wiring unchanged.
- Avoid global `.page-panel` changes unless direct component-level classes cannot fix the parent sizing contract.

## How to verify
1. Run `pnpm run check`.
2. Open the app, open a flow, and select a node.
3. Test with long node description content.
4. Resize to approximately 1366×768, 1280×720, and 1100×700.
5. Confirm vertical scrolling reveals all node editor content.
6. Return to the flow canvas mode with `Listo` and confirm the canvas/context view still scrolls exactly as before.
7. Confirm no horizontal scrollbar appears on the main app shell or `.page-panel`.

## Observable failure signals
- The node editor still appears clipped to the viewport height with child content visibly escaping.
- The body stops scrolling vertically when the window is short.
- The flow canvas/context view breaks when no node editor is open.
- The top header or action buttons overlap the body content.
- A horizontal scrollbar appears on the full app window.

## Files/components involved
- Primary: `src/lib/views/FlowEditorView.svelte`
- Context only: `src/App.svelte`, `src/app.css`, `src/lib/components/layout/Sidebar.svelte`

## Preconditions before implementation
- Phase 1 has confirmed the current parent sizing contract contributes to the issue.
- Baseline screenshots or notes exist for at least one failing window size.
- The selected node editor can be opened reliably.

## Stop conditions if the plan does not match the real codebase
Stop and report if:

- Parent sizing in `FlowEditorView.svelte` is not involved in the actual overflow.
- A change to the global shell in `App.svelte` is required to solve the issue safely.
- The relevant wrapper classes have already been changed in a way that makes this phase obsolete.
- The fix would require modifying autosave logic, selected-node state, or flow graph mutation handlers.
