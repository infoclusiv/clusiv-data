# Phase 1 — Convert Grouped View to a Single-Column Collapsible List

## Single objective

Change only the grouped quick texts layout so groups render as a **single-column vertical list** and each group is **collapsed by default**, expanding downward when the user clicks the group header.

## Expected behavior

- The grouped view no longer distributes groups into two columns.
- Every group section appears in one vertical list, ordered by existing group `sort_order`.
- The virtual `Textos sin grupo` section remains visible when it has texts.
- Groups are collapsed by default when entering the grouped view.
- Clicking the group header expands/collapses its texts downward.
- Clicking action buttons in the group header must not accidentally toggle the group.
- Existing copy, edit, delete, edit group, delete group, and move group callbacks continue to work exactly as before.
- No data model or persistence changes in this phase.

## Success criteria

- `QuickTextsGroupedView.svelte` no longer uses `splitSections()` or renders two columns.
- The grouped view has one root list container, for example `flex flex-col gap-4` or `grid gap-4`.
- `QuickTextGroupCard.svelte` has local collapsed/expanded UI behavior or receives expanded state from the parent.
- Text rows inside a group are rendered only when that group is expanded.
- The group header remains visible while collapsed.
- Existing group counts still show the number of texts.
- Existing callbacks still receive the same quick text/group objects they received before this phase.
- `pnpm check` passes.
- `pnpm build` passes.

## How to verify

1. Start the app with sample data that contains at least:
   - Two quick text groups.
   - One quick text assigned to a group.
   - One quick text assigned to more than one group.
   - One ungrouped quick text.
2. Open **Textos Rápidos**.
3. Select grouped view.
4. Confirm there is one vertical column, not two columns at wide screen sizes.
5. Confirm all sections are collapsed initially.
6. Click a group header.
7. Confirm its rows expand below that same group.
8. Click it again.
9. Confirm its rows collapse.
10. Click group action buttons and confirm they do not expand/collapse the group accidentally.
11. Run:

```bash
pnpm check
pnpm build
```

## Observable failure signals

- Groups still appear in two columns on large screens.
- A group expands horizontally or in a separate column instead of downward.
- Clicking an action button also toggles collapse unexpectedly.
- `Textos sin grupo` disappears when it has texts.
- Existing group move/edit/delete actions stop firing.
- Copying a text no longer copies to clipboard.
- Svelte check/build fails because of prop or rune errors.

## Files/components involved

Primary:

- `src/lib/components/quick-texts/QuickTextsGroupedView.svelte`
- `src/lib/components/quick-texts/QuickTextGroupCard.svelte`

Possible secondary:

- `src/lib/components/quick-texts/QuickTextRow.svelte` only if keyboard/click propagation needs a minor adjustment.

## Preconditions before implementation

- Confirm `QuickTextsGroupedView.svelte` still builds `sections` from `groups` and `quickTexts`.
- Confirm `QuickTextGroupCard.svelte` is still responsible for rendering a group header and its text rows.
- Confirm `QuickTextGroupCard.svelte` still receives group-level callbacks from `QuickTextsGroupedView.svelte`.
- Confirm no existing global UI state already tracks group expansion.

## Implementation notes

Recommended low-risk approach:

1. Remove `splitSections()` from `QuickTextsGroupedView.svelte`.
2. Replace the current two-column container with a single list:

```svelte
<div class="flex flex-col gap-4">
  {#each sections as section (`${section.group?.id ?? "virtual"}`)}
    <QuickTextGroupCard ... />
  {/each}
</div>
```

3. Add local expansion state in `QuickTextGroupCard.svelte`, for example:

```ts
let expanded = $state(false);
```

4. Make the header clickable with `role="button"`, `tabindex="0"`, Enter/Space keyboard support, and clear `aria-expanded`.
5. Use `event.stopPropagation()` in action buttons if the header click handler wraps or overlaps them.
6. Render the row body only when expanded.
7. Keep the empty-group message inside the expanded body; do not show it while collapsed unless the current UI design intentionally requires it.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- `QuickTextsGroupedView.svelte` no longer owns grouped sections.
- `QuickTextGroupCard.svelte` has already been replaced by another component.
- The grouped layout is controlled by a shared layout component not considered here.
- The app already has persisted expansion state for quick text groups and changing it locally would conflict.
