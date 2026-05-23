# Phase 2 — Make Quick Text and Group Actions Icon-Only

## Single objective

Convert the requested action buttons to icon-only buttons while preserving accessibility through `title` and `aria-label`.

## Expected behavior

- In group headers, these buttons show only icons and no visible text:
  - Move group up.
  - Move group down.
  - Edit group.
  - Delete group.
- In quick text rows, the edit button shows only the pencil icon and no visible `Editar` text.
- The quick text delete button already appears icon-only and should remain icon-only.
- Actions keep their existing behavior.
- Buttons remain accessible through `title` and `aria-label`.
- No persistence/data changes.

## Success criteria

- The visible `<span>Subir</span>`, `<span>Bajar</span>`, `<span>Editar grupo</span>`, `<span>Borrar grupo</span>`, and quick text row `<span>Editar</span>` are removed or visually hidden according to project conventions.
- Buttons have explicit `title` and `aria-label` values.
- Button spacing is compact and aligned in the existing UI.
- Disabled states for group move up/down still work.
- `pnpm check` passes.
- `pnpm build` passes.

## How to verify

1. Open **Textos Rápidos** grouped view.
2. Confirm group action buttons show only icons.
3. Hover each group action and confirm the tooltip/title is meaningful.
4. Use a screen reader or inspect DOM to confirm each icon button has `aria-label`.
5. Expand a group and confirm quick text edit action shows only a pencil icon.
6. Click each action and confirm behavior did not change.
7. Run:

```bash
pnpm check
pnpm build
```

## Observable failure signals

- Visible button text remains next to icons.
- Icon-only buttons become too small to click reliably.
- Buttons lose their accessible names.
- Move group buttons no longer disable at the top/bottom boundaries.
- Clicking quick text edit/delete accidentally copies the text because event propagation regressed.
- Svelte check/build fails.

## Files/components involved

Primary:

- `src/lib/components/quick-texts/QuickTextGroupCard.svelte`
- `src/lib/components/quick-texts/QuickTextRow.svelte`

Possible secondary:

- Shared button CSS/classes only if current `btn-ghost` / `btn-danger` spacing looks broken after removing text. Avoid broad CSS changes unless necessary.

## Preconditions before implementation

- Phase 1 must be implemented and verified.
- Confirm `QuickTextGroupCard.svelte` still imports `ArrowDown`, `ArrowUp`, `Pencil`, and `Trash2` from `lucide-svelte`.
- Confirm `QuickTextRow.svelte` still imports `Pencil` and `Trash2` from `lucide-svelte`.

## Implementation notes

Recommended low-risk approach:

1. Remove visible text spans from the requested buttons.
2. Change classes from wide text-button padding to compact icon-button padding, for example `p-2` or a project-consistent equivalent.
3. Ensure every button has both `title` and `aria-label`.
4. Keep click handlers unchanged.
5. Keep `event.stopPropagation()` in row action buttons.

Do not change:

- Copy behavior.
- Delete semantics.
- Data model.
- Group ordering behavior.
- Collapsed/expanded behavior from Phase 1.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- The project already has a dedicated `IconButton` component and the current components are expected to use it.
- Styling is centralized in a way that forbids direct utility class changes in these components.
- The quick text row component no longer owns the edit/delete buttons.
