# Phase 1 — Confirm the real responsive failure and isolate the layout root cause

## Single objective
Establish a reliable baseline for the bug and confirm the exact layout constraints that cause the node editor to overflow or overlap before any code changes are made.

## Expected behavior
No production behavior changes are made in this phase. The implementation agent should produce a short local note or PR comment documenting the confirmed root cause and the exact files/classes involved.

## Success criteria
- The bug is reproducible in a laptop-sized or reduced window.
- The agent confirms whether the issue is caused by `FlowNodeEditorPanel.svelte`, `FlowEditorView.svelte`, or another actual component in the current codebase.
- The agent confirms whether the active layout is using viewport breakpoints instead of available content width.
- The agent confirms whether fixed/full-height constraints and large textarea minimum heights are contributing to vertical overflow.
- The agent confirms that no backend/data-model change is needed for this bug.

## How to verify
1. Run the app in development mode.
2. Open a flow and select a node so the node editor panel opens.
3. Resize the window to approximately 1366×768 and then smaller.
4. Inspect these elements/classes in devtools:
   - `src/App.svelte`: the `h-screen w-screen overflow-hidden` shell and `main` region.
   - `src/lib/components/layout/Sidebar.svelte`: resizable sidebar width.
   - `src/lib/views/FlowEditorView.svelte`: the scroll container and node-editor conditional wrapper.
   - `src/lib/components/flows/FlowNodeEditorPanel.svelte`: outer grid, edit card, aside panel, description textarea, comments textarea.
5. Check whether the current code includes patterns equivalent to:
   - Outer node editor grid using `h-full min-h-0`.
   - Outer node editor grid switching to a two-column layout at `xl` with a fixed `400px` right column.
   - Description textarea using large minimum heights and `flex-1`.
   - Parent view wrapping the node editor in an `h-full` wrapper inside a scrolling region.

## Observable failure signals
- At 1366×768 or smaller, the right notes/comments panel overlaps the edit card or appears visually floating over the description area.
- The description textarea extends beyond its card boundaries.
- The action/header areas compress into unreadable or unreachable controls.
- The page has a horizontal scrollbar outside intentionally scrollable areas.
- The `Listo` or `Quitar nodo` buttons are hidden without an obvious vertical scroll path.

## Files/components involved
- `src/App.svelte`
- `src/app.css`
- `src/lib/components/layout/Sidebar.svelte`
- `src/lib/views/FlowEditorView.svelte`
- `src/lib/components/flows/FlowNodeEditorPanel.svelte`
- Read-only context as needed:
  - `src/lib/components/flows/FlowCanvas.svelte`
  - `src/lib/components/flows/FlowContextPanel.svelte`
  - `src/lib/store/types.ts`
  - `src/lib/store/appState.svelte.ts`

## Preconditions before implementation
- The app can be installed and checked with `pnpm install` and `pnpm run check`.
- The current branch is clean or the agent has explicitly recorded existing local changes.
- The flow editor is reachable with existing local data, test data, or a temporary manual flow created through the UI.

## Stop conditions if the plan does not match the real codebase
Stop and report before coding if:

- `FlowNodeEditorPanel.svelte` no longer exists or is not the component used by the node editor.
- The overlap is caused by a global transform, app zoom setting, webview bug, or third-party window manager rather than component layout constraints.
- The current code has already replaced the fixed `xl` two-column layout with a container-aware layout.
- The bug cannot be reproduced even with long content at laptop-sized windows.
- Fixing the issue would require changing flow data structures, autosave semantics, or Tauri backend commands.
