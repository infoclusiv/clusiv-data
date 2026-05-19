# Phase 3 — Render grouped quick texts in a two-column layout with multi-group membership

## Objective

Update the grouped quick texts view so quick text groups render in two visual columns and a quick text appears in every group listed in its `group_ids`.

This phase focuses on display behavior only. Reorder controls are handled in phase 4.

## Expected behavior

- Grouped view displays quick text groups in a two-column layout on sufficiently wide screens.
- On smaller screens, the layout gracefully collapses to one column.
- A quick text assigned to two groups appears in both group sections.
- A quick text with no valid `group_ids` appears in `Textos sin grupo`.
- Existing single-group quick texts still appear in their group.
- Group order is still determined by `QuickTextGroup.sort_order` and group name fallback.

## Files/components involved

- `src/lib/components/quick-texts/QuickTextsGroupedView.svelte`
- `src/lib/components/quick-texts/QuickTextGroupCard.svelte`
- `src/lib/components/quick-texts/QuickTextRow.svelte`
- `src/lib/components/quick-texts/QuickTextsListView.svelte` if list mode must display group labels correctly for multi-group texts
- `src/lib/store/types.ts`
- `src/lib/utils/categoryUtils.ts`

## Preconditions before implementation

- Phase 1 has added `group_ids`.
- Phase 2 can save and edit multiple selected groups.
- `QuickTextsGroupedView.svelte` still builds sections from `groups` and `quickTexts`.
- `QuickTextGroupCard.svelte` still receives `texts` and renders `QuickTextRow`.

## Implementation steps

### 1. Add helper to read effective group ids

In `QuickTextsGroupedView.svelte`, add a local helper or import a shared utility:

```ts
function getEffectiveQuickTextGroupIds(quickText: QuickText): string[]
```

Expected logic:

- Prefer `quickText.group_ids`.
- Fall back to `quickText.group_id ? [quickText.group_id] : []`.
- Dedupe.
- Do not include ids that are not present in the current `groups` list.

If this helper is broadly useful, place it in `categoryUtils.ts` instead.

### 2. Build sections using multi-group membership

Change `QuickTextsGroupedView.svelte` section building:

Current behavior:

- One `byGroupId` map entry is populated from `quickText.group_id`.

New behavior:

- For each sorted quick text:
  - Get all valid group ids.
  - Add the quick text to each matching group bucket.
  - If it has zero valid group ids, add it to ungrouped.

### 3. Preserve stable rendering keys

Because the same quick text can appear in multiple groups, ensure keys do not collide inside repeated lists.

In `QuickTextGroupCard.svelte`, if a `QuickTextRow` can appear in multiple cards, the current key `(quickText.id)` is still safe inside each local `{#each}` block. If Svelte warns about duplicate keys in the parent structure, use a composite key where needed:

```svelte
(group?.id ?? "ungrouped") + ":" + quickText.id
```

### 4. Implement two-column group layout

In `QuickTextsGroupedView.svelte`, replace the single-column wrapper:

```svelte
<div class="grid gap-4">
```

with a responsive two-column structure.

Low-risk option A:

```svelte
<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
```

Low-risk option B, if the user wants visually independent left/right columns:

- Split sorted sections by index:
  - even indexes to left column;
  - odd indexes to right column.
- Render two `flex flex-col gap-4` columns inside a `grid grid-cols-1 xl:grid-cols-2 gap-4` container.

Prefer option B if card heights vary heavily, because it creates a clearer left/right column grouping.

### 5. Update list mode labels if needed

`QuickTextsListView.svelte` currently derives a single `groupName`. For multi-group texts, update it to show:

- `Textos sin grupo` if no group ids;
- the single group name if one group;
- a comma-separated list or compact label if multiple groups, e.g. `Grupo A, Grupo B`.

Do not change list mode layout beyond the group label compatibility update.

## Success criteria

- Grouped view shows groups in two columns on wide screens.
- Grouped view collapses to one column on narrow screens.
- A quick text assigned to two groups appears in both cards.
- Ungrouped quick texts appear in `Textos sin grupo`.
- Empty groups still show `Este grupo todavía no tiene textos.`.
- `pnpm run check` passes.
- `pnpm run build` passes.

## How to verify

1. Create groups `Grupo A`, `Grupo B`, and `Grupo C`.
2. Create one quick text assigned to `Grupo A` and `Grupo B`.
3. Open grouped view.
4. Confirm the same quick text appears inside both `Grupo A` and `Grupo B`.
5. Resize the app:
   - wide screen: two columns;
   - narrow screen: one column.
6. Create one quick text with no groups and confirm it appears under `Textos sin grupo`.

## Observable failure signals

- Multi-group quick texts appear only in the first group.
- Ungrouped quick texts disappear.
- Empty groups disappear unintentionally.
- Svelte key warnings appear in the console.
- Layout overflows horizontally or becomes unusable on narrow screens.
- `pnpm run check` fails due to stale `group_id` assumptions.

## Stop conditions

Stop and report if:

- `QuickTextsGroupedView.svelte` has already been replaced by a different grouped rendering architecture.
- The repository now uses a virtualized list where duplicate rendering requires special handling.
- The design system has a dedicated two-column or masonry component that must be used instead.
- Quick texts are no longer represented by `QuickTextRow` inside `QuickTextGroupCard`.
