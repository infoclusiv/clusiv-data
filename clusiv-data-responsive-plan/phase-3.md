# Phase 3 — Make the node editor columns responsive to available content width

## Single objective
Prevent the node editor from forcing a two-column layout when the actual editor content area is too narrow after accounting for the sidebar and page padding.

## Expected behavior
The edit card and the notes/comments panel should stack vertically when the available content width is insufficient. They should only become two columns when the node editor container itself has enough usable width, not merely because the viewport reached Tailwind's `xl` breakpoint.

## Success criteria
- At laptop-sized windows such as 1366×768, with the sidebar visible, the node editor uses a safe one-column stacked layout if the content area is too narrow.
- On genuinely wide content areas, the edit card and notes/comments panel can use a two-column layout without overlap.
- The right panel no longer has a fixed `400px` column that forces the left editor card to become too small.
- The layout decision accounts for actual container width, not only global viewport width.
- The notes/comments panel remains below the edit card in stacked mode and never floats over the description textarea.

## Suggested implementation direction
Work primarily in `src/lib/components/flows/FlowNodeEditorPanel.svelte`.

The current risk pattern to eliminate is a layout equivalent to:

```svelte
<section class="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
```

Prefer one of these approaches after validating browser/WebView support and current project constraints:

### Preferred approach: local container-aware layout
Use a local wrapper class and Svelte component-scoped CSS so the breakpoint is based on the node editor container width.

Example direction, not final copy-paste code:

```svelte
<section class="flow-node-editor-grid grid min-w-0 grid-cols-1 gap-4">
  ...
</section>

<style>
  .flow-node-editor-grid {
    container-type: inline-size;
  }

  @container (min-width: 1120px) {
    .flow-node-editor-grid {
      grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
      align-items: stretch;
    }
  }
</style>
```

The exact container threshold should be validated in the real UI. Start around 1080px–1120px of actual editor container width. The threshold must leave enough room for the edit card, the notes panel, gaps, and padding.

### Acceptable fallback: conservative viewport breakpoint
If container queries are not acceptable for this Tauri/WebView target, change the two-column breakpoint from `xl` to a safer breakpoint such as `2xl`, and/or reduce the right column to `minmax(320px,380px)`. This is less precise than the preferred approach but lower-risk than the current `xl` layout.

## How to verify
1. Run `pnpm run check`.
2. Open node editor with a long description.
3. Resize the app to these widths:
   - 1600px or larger: verify two columns only if content width is enough.
   - 1366px: verify stacked layout or a non-overflowing layout.
   - 1280px and below: verify stacked layout.
4. Resize the sidebar wider and narrower. Confirm the node editor adapts to the remaining content width.
5. Confirm the notes/comments panel is below the edit panel in stacked mode.
6. Confirm there is no global horizontal scrollbar.

## Observable failure signals
- The right notes/comments panel still overlays the edit card at laptop width.
- The app shows a horizontal scrollbar because the node editor grid is wider than its parent.
- The two-column layout activates at 1366px viewport even though the content area after sidebar is not wide enough.
- The notes/comments panel becomes unreachable or is clipped.
- The CSS container query causes invalid Svelte styles or fails `svelte-check`.

## Files/components involved
- Primary: `src/lib/components/flows/FlowNodeEditorPanel.svelte`
- Verification context: `src/lib/views/FlowEditorView.svelte`, `src/lib/components/layout/Sidebar.svelte`

## Preconditions before implementation
- Phase 2 is complete and the parent flow editor scroll area is stable.
- The agent has confirmed the outer two-column breakpoint is still present or an equivalent width-forcing layout remains.
- The agent has tested at least one failing width with the sidebar visible.

## Stop conditions if the plan does not match the real codebase
Stop and report if:

- The node editor no longer uses a grid/fixed-column layout.
- The overlap remains after forcing a single-column layout, which would indicate a different root cause.
- The target WebView/browser does not support the selected responsive technique and the fallback also fails.
- The correct fix would require a larger design decision, such as a mobile sidebar drawer or a global layout system rewrite.
