# Phase 5 — Add Text Reordering Within Each Expanded Group

## Single objective

Add UI controls and state mutation to move quick texts up/down within a specific group using the per-group ordering model from Phase 4.

## Expected behavior

- Expanded real groups show icon-only up/down controls for each quick text row.
- Moving a text up/down changes its position only inside that group.
- If the same text appears in another group, its position in the other group does not change.
- Move up is disabled for the first text in that group.
- Move down is disabled for the last text in that group.
- The virtual `Textos sin grupo` can either:
  - keep no text move controls in this phase, or
  - use existing legacy `sort_order` for ungrouped movement if implemented with equal care.
- Reordered positions persist after reload.
- Group move up/down behavior from previous phases remains unchanged.

## Success criteria

- A new store mutation exists, recommended:

```ts
export async function moveQuickTextInGroup(
  quickTextId: string,
  groupId: string,
  direction: "up" | "down",
): Promise<void> { ... }
```

- `QuickTextsGroupedView.svelte` sorts texts within each group using group-specific order from `group_sort_orders`.
- `QuickTextGroupCard.svelte` passes group context and move capability to rows.
- `QuickTextRow.svelte` can render icon-only move controls when provided move callbacks and boundary flags.
- Moving a text updates only `group_sort_orders[groupId]` for affected texts.
- The UI immediately reflects the new order after movement.
- The order persists after app reload.
- `pnpm check` passes.
- `pnpm build` passes.

## How to verify

Create sample data:

- Group A with Text 1, Text 2, Text 3.
- Group B with Text 2 and Text 3.

Manual verification:

1. Open grouped view.
2. Expand Group A.
3. Confirm Text 1 is first and its move-up button is disabled.
4. Confirm the last text has move-down disabled.
5. Move Text 3 up in Group A.
6. Confirm Text 3 changes position only in Group A.
7. Expand Group B.
8. Confirm Text 3's position in Group B did not change unless it was explicitly moved there.
9. Reload the app.
10. Confirm Group A order is preserved.
11. Confirm Group B order is preserved independently.
12. Run:

```bash
pnpm check
pnpm build
```

## Observable failure signals

- Moving a text in Group A changes its position in Group B.
- Move up/down controls are visible but disabled incorrectly.
- Moving causes duplicate `group_sort_orders` values that render unstable ordering.
- Moving causes a text to disappear from a group.
- Moving causes `group_id` or `group_ids` to change unexpectedly.
- Reordered state is lost after reload.
- Clicking move controls copies the text because event propagation is not stopped.
- Svelte check/build fails.

## Files/components involved

Primary:

- `src/lib/store/appState.svelte.ts`
- `src/lib/utils/categoryUtils.ts`
- `src/lib/components/quick-texts/QuickTextsGroupedView.svelte`
- `src/lib/components/quick-texts/QuickTextGroupCard.svelte`
- `src/lib/components/quick-texts/QuickTextRow.svelte`

Possible secondary:

- `src/lib/store/types.ts` only if row props or helper types require a shared type.

## Preconditions before implementation

- Phases 1 through 4 must be implemented and verified.
- `QuickText.group_sort_orders` must exist and be normalized.
- Grouped sorting must be ready to use a helper like `getQuickTextGroupSortOrder(quickText, groupId)`.
- Existing group move controls from Phase 2 must remain icon-only.

## Implementation notes

Recommended sorting update in grouped view:

- Do not globally sort all quick texts once before grouping, because group-specific order differs per group.
- Build `byGroupId` first, then sort each group's array with the group id:

```ts
function sortTextsForGroup(items: QuickText[], groupId: string | null): QuickText[] {
  return items.slice().sort((left, right) =>
    getQuickTextGroupSortOrder(left, groupId) - getQuickTextGroupSortOrder(right, groupId)
    || left.title.localeCompare(right.title)
  );
}
```

Recommended mutation behavior:

1. In `moveQuickTextInGroup()`:
   - Build ordered texts for the target group from current data.
   - Locate `fromIndex` and `toIndex`.
   - If out of bounds, return without mutation.
   - Swap the order positions for the moved text and adjacent text or reindex all texts in that group to `index + 1`.
   - Update only `group_sort_orders[groupId]` for texts that belong to that group.
   - Do not mutate `group_ids`.
   - Do not mutate unrelated groups' order values.
   - Persist via `mutateAppData()`.

2. Add log events:
   - `move_quick_text_in_group_started`
   - `move_quick_text_in_group_completed`
   - `move_quick_text_in_group_failed`

Include context:

- `quickTextId`
- `groupId`
- `direction`
- `fromIndex`
- `toIndex`
- `groupTextCount`

Recommended row UI:

- Add optional props:

```ts
onmoveup?: () => void;
onmovedown?: () => void;
canMoveUp?: boolean;
canMoveDown?: boolean;
showMoveControls?: boolean;
```

- Render icon-only `ArrowUp` and `ArrowDown` buttons when `showMoveControls` is true.
- Use `title` and `aria-label`.
- Stop propagation so move buttons do not trigger copy.

Do not add drag-and-drop in this phase. Up/down controls are lower risk and match existing group movement patterns.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- Phase 4 was implemented with a different order model and this phase's helper names/assumptions no longer apply.
- Product direction requires drag-and-drop instead of up/down controls.
- `QuickTextRow.svelte` is not the right place for row move controls due to a newer design component.
- The app has virtualization or row recycling that would make local index-based moves unsafe.
