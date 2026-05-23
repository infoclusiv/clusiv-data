# Phase 3 — Make Grouped-View Text Deletion Remove Only the Group Membership

## Single objective

Change deletion behavior **inside a concrete group** so clicking the quick text trash/remove action removes the text only from that group, not from every group where the text exists.

## Expected behavior

- In grouped view, inside a real group, deleting/removing a text removes only that group id from the quick text's `group_ids`.
- If the text belongs to multiple groups, it remains visible in the other groups.
- If the text belongs only to the removed group, it becomes visible in `Textos sin grupo` after removal.
- `group_id` legacy compatibility is resynced to the first remaining `group_ids` entry or `null`.
- In `Textos sin grupo`, the delete/trash action may continue to mean global delete because there is no group membership to remove.
- In list view, existing global delete behavior should remain unchanged unless the UI explicitly adds group-context actions there later.
- Confirmation text in grouped view should make the semantics clear: remove from this group, not delete permanently.

## Success criteria

- A new store mutation exists, for example `removeQuickTextFromGroup(quickTextId, groupId)`.
- The grouped view passes group context when triggering removal from a real group.
- `deleteQuickText(id)` remains available and unchanged for global deletion contexts.
- Removing a text from one group does not remove its object from `__SYSTEM_QUICK_TEXTS__` unless the action is explicitly the global delete action.
- Removing a text from a group persists through `save_data` / app reload.
- `pnpm check` passes.
- `pnpm build` passes.

## How to verify

Create or use sample data:

- Group A.
- Group B.
- Text X assigned to both Group A and Group B.
- Text Y assigned only to Group A.

Manual verification:

1. Open grouped view.
2. Expand Group A and Group B.
3. Remove Text X from Group A.
4. Confirm Text X disappears from Group A.
5. Confirm Text X remains in Group B.
6. Confirm Text X still exists in the list view.
7. Remove Text Y from Group A.
8. Confirm Text Y disappears from Group A.
9. Confirm Text Y appears under `Textos sin grupo`.
10. Reload the app.
11. Confirm the same memberships remain.
12. Run:

```bash
pnpm check
pnpm build
```

## Observable failure signals

- Removing a text from one group deletes it from all groups.
- Text remains in the group after reload.
- Text with only one group disappears entirely instead of becoming ungrouped.
- `group_id` remains stale and points to a removed group.
- The confirmation dialog still says the text will be permanently deleted while the action is only removing group membership.
- List view global delete behavior changes unexpectedly.
- Svelte check/build fails.

## Files/components involved

Primary:

- `src/lib/store/appState.svelte.ts`
- `src/lib/views/QuickTextsView.svelte`
- `src/lib/components/quick-texts/QuickTextsGroupedView.svelte`
- `src/lib/components/quick-texts/QuickTextGroupCard.svelte`

Possible secondary:

- `src/lib/components/quick-texts/QuickTextRow.svelte` if the row needs a more generic `onremove` label/title.
- `src/lib/utils/categoryUtils.ts` only if existing helper functions are insufficient for resyncing legacy group fields.

## Preconditions before implementation

- Phase 1 and Phase 2 must be implemented and verified.
- Confirm `QuickText.group_ids` is still the authoritative multi-group membership field.
- Confirm `syncLegacyQuickTextGroupId()` still exists in `categoryUtils.ts` and updates `group_id` based on `group_ids[0]`.
- Confirm `QuickTextsView.svelte` still owns confirmation dialog state for quick text deletion.

## Implementation notes

Recommended low-risk approach:

1. Add a new exported mutation to `appState.svelte.ts`:

```ts
export async function removeQuickTextFromGroup(
  quickTextId: string,
  groupId: string,
): Promise<void> { ... }
```

2. Inside the mutation:
   - Find the quick text by `id`.
   - Validate it exists.
   - Validate `groupId` is present in `quickText.group_ids`.
   - Replace `group_ids` with `group_ids.filter((entry) => entry !== groupId)`.
   - Call `syncLegacyQuickTextGroupId(quickText)`.
   - Persist using `mutateAppData()`.
   - Add AI-ready log events with `previousGroupIds`, `nextGroupIds`, `removedGroupId`, and `quickTextId`.

3. Update grouped-view props so `QuickTextGroupCard` can call a group-context handler:

```ts
onremovefromgroup?: (quickText: QuickText, group: QuickTextGroup) => void;
```

4. In `QuickTextGroupCard.svelte`:
   - For real groups, call `onremovefromgroup(quickText, group)` from the row delete/trash button.
   - For virtual `Textos sin grupo`, keep calling the existing global `ondelete(quickText)`.

5. In `QuickTextsView.svelte`:
   - Keep existing `pendingDeleteQuickTextId` for global delete.
   - Add separate pending state for group removal, for example:

```ts
let pendingRemoveQuickTextFromGroup = $state<{
  quickTextId: string;
  groupId: string;
  groupName: string;
} | null>(null);
```

6. Add a separate confirmation dialog:
   - Title: `Quitar texto del grupo`.
   - Message: clearly state it will only remove the text from this group.
   - Confirm action: call `removeQuickTextFromGroup()`.

Do not alter `deleteQuickText()` in this phase except maybe to preserve naming clarity.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- Quick text membership is no longer represented by `group_ids`.
- `deleteQuickTextGroup()` already provides a reusable membership-removal helper that should be reused instead.
- The UI already has separate permanent delete and remove-from-group actions that this plan would duplicate.
- The product owner expects the trash icon inside a group to permanently delete the quick text, contrary to the current task wording.
