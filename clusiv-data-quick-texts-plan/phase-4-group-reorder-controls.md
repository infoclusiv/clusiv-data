# Phase 4 — Add quick text group reorder controls

## Objective

Allow the user to change the visual order of quick text groups in the grouped quick texts view.

Use simple, low-risk reorder controls instead of introducing drag-and-drop.

## Expected behavior

- Each real quick text group card has visible move controls, such as `Subir` and `Bajar` icon buttons.
- Clicking move up/down changes the group's `sort_order` and persists the new order.
- The grouped view updates immediately after reorder.
- `Textos sin grupo` is virtual and should not have edit/delete/reorder controls.
- Reordering does not alter quick text membership or content.
- Reordering works with the two-column layout from phase 3.

## Files/components involved

- `src/lib/store/appState.svelte.ts`
- `src/lib/components/quick-texts/QuickTextsGroupedView.svelte`
- `src/lib/components/quick-texts/QuickTextGroupCard.svelte`
- `src/lib/views/QuickTextsView.svelte`
- `src/lib/store/types.ts`

## Preconditions before implementation

- Phase 3 has two-column grouped rendering.
- `QuickTextGroup` still contains `sort_order`.
- `QuickTextsGroupedView.svelte` still sorts groups by `sort_order`.
- `QuickTextGroupCard.svelte` still renders the group header and group action buttons.

## Implementation steps

### 1. Add reorder function to app state

In `src/lib/store/appState.svelte.ts`, add a new exported function:

```ts
export async function moveQuickTextGroup(
  groupId: string,
  direction: "up" | "down",
): Promise<void>
```

Expected logic:

1. Load current groups from `getQuickTextGroups(draft)`.
2. Sort by `sort_order`, then name fallback.
3. Find the target group index.
4. If moving beyond bounds, no-op or throw a user-safe error.
5. Swap the group with the previous/next group.
6. Reassign normalized `sort_order` values sequentially starting at `1`.
7. Update `updated_at` for moved groups.
8. Persist through `mutateAppData`.

### 2. Add observability events

Log events around reorder:

- `move_quick_text_group_started`
- `move_quick_text_group_completed`
- `move_quick_text_group_failed`

Context should include:

- `groupId`
- `direction`
- `fromIndex`
- `toIndex`
- `groupCount`

Do not log quick text content.

### 3. Pass reorder callbacks through the view

In `QuickTextsView.svelte`:

- Import `moveQuickTextGroup`.
- Add a handler like `handleMoveQuickTextGroup(group, direction)`.
- Show success or error snackbar.
- Pass `onmovegroup` into `QuickTextsGroupedView`.

In `QuickTextsGroupedView.svelte`:

- Accept `onmovegroup` prop.
- Pass it to `QuickTextGroupCard`.
- Provide enough metadata to disable move up/down when the group is first/last.

Suggested section metadata:

```ts
canMoveUp: boolean;
canMoveDown: boolean;
```

Important: compute move boundaries using real groups only. The virtual `Textos sin grupo` section should not count as reorderable.

### 4. Add controls to group card header

In `QuickTextGroupCard.svelte`:

- Import icons such as `ArrowUp` and `ArrowDown` from `lucide-svelte`.
- Show move buttons only when the section is not virtual.
- Use accessible labels:
  - `Mover grupo hacia arriba`
  - `Mover grupo hacia abajo`
- Disable the up button for the first group.
- Disable the down button for the last group.

Keep existing edit/delete group behavior.

### 5. Preserve two-column order semantics

Do not manually mutate layout-only arrays. The source of truth should remain `QuickTextGroup.sort_order`.

After moving a group, the sorted sections should rerender, and the two-column placement should update based on the new sorted order.

## Success criteria

- User can move a group up or down.
- Reorder persists after app reload.
- First group cannot move up.
- Last real group cannot move down.
- `Textos sin grupo` cannot be moved.
- Quick text assignments remain unchanged after reorder.
- `pnpm run check` passes.
- `pnpm run build` passes.

## How to verify

1. Create at least three groups: `A`, `B`, `C`.
2. Open grouped quick texts view.
3. Move `C` up once.
4. Confirm order becomes `A`, `C`, `B`.
5. Reload app and confirm order persists.
6. Confirm quick texts inside groups did not change membership.
7. Confirm `Textos sin grupo` has no reorder controls.

## Observable failure signals

- Reorder works visually but resets after reload.
- Group `sort_order` values become duplicated or non-deterministic.
- Reordering one group moves quick texts between groups.
- `Textos sin grupo` receives reorder controls.
- Logs show `move_quick_text_group_failed`.
- Svelte reports prop or type errors around `onmovegroup`.

## Stop conditions

Stop and report if:

- `sort_order` is no longer the intended group order source.
- Another group ordering system already exists and conflicts with this plan.
- The design now explicitly requires drag-and-drop instead of up/down controls.
- Reorder persistence cannot be done through `mutateAppData`.
