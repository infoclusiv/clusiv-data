# Phase 3 — Store Actions and Observability

## Objective

Add state-management support for quick-text groups and group assignment, without changing the main UI yet.

This phase introduces the mutation logic needed by later UI phases.

---

## Preconditions Before Implementation

Phase 2 must be complete and verified.

Before coding:

```powershell
git status --short
pnpm run check
pnpm run build
```

Confirm:

- `QuickText` has `group_id` and `sort_order`.
- `QuickTextGroup` exists.
- `__SYSTEM_QUICK_TEXT_GROUPS__` exists.
- Existing quick texts still appear in the old flat UI.

---

## Expected Behavior

After this phase:

- The UI can still behave exactly as before.
- Existing quick text create/edit/delete still works.
- `saveQuickText` can accept an optional `group_id`.
- New store functions exist:
  - `saveQuickTextGroup`
  - `deleteQuickTextGroup`
- Deleting a group moves its texts to `group_id: null`.
- Logs contain group-related observability events.

---

## Files / Components Involved

Modify:

```text
src/lib/store/appState.svelte.ts
```

Do not modify:

```text
src/lib/views/QuickTextsView.svelte
src/lib/components/dialogs/QuickTextDialog.svelte
src/lib/components/cards/QuickTextCard.svelte
src/App.svelte
src/lib/components/layout/Sidebar.svelte
```

---

## Implementation Steps

### 1. Update Imports

Add:

```ts
QuickTextGroupFormInput
```

from `src/lib/store/types.ts`.

If needed, import:

```ts
getQuickTextGroups
```

from `categoryUtils.ts`.

### 2. Update App Data Summary

Add:

```ts
function countQuickTextGroups(appData: AppData): number {
  return appData.__SYSTEM_QUICK_TEXT_GROUPS__.length;
}
```

Add to `getAppDataSummary`:

```ts
quickTextGroupCount: countQuickTextGroups(appData),
```

### 3. Add Helpers

Add:

```ts
function generateQuickTextGroupId(appData: AppData): string {
  const existingIds = new Set(appData.__SYSTEM_QUICK_TEXT_GROUPS__.map((group) => group.id));

  while (true) {
    const candidate = `quick_text_group_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
}
```

Add:

```ts
function getNextQuickTextGroupSortOrder(appData: AppData): number {
  return appData.__SYSTEM_QUICK_TEXT_GROUPS__.reduce(
    (maxOrder, group) => Math.max(maxOrder, group.sort_order),
    0,
  ) + 1;
}

function getNextQuickTextSortOrder(appData: AppData, groupId: string | null): number {
  return appData.__SYSTEM_QUICK_TEXTS__
    .filter((quickText) => quickText.group_id === groupId)
    .reduce((maxOrder, quickText) => Math.max(maxOrder, quickText.sort_order), 0) + 1;
}

function resolveQuickTextGroupId(appData: AppData, groupId: string | null | undefined): string | null {
  if (!groupId) {
    return null;
  }

  return appData.__SYSTEM_QUICK_TEXT_GROUPS__.some((group) => group.id === groupId)
    ? groupId
    : null;
}
```

### 4. Add `saveQuickTextGroup`

Add a new exported function:

```ts
export async function saveQuickTextGroup(
  input: QuickTextGroupFormInput,
  editingGroupId: string | null = null,
): Promise<string>
```

Requirements:

- Trim `name`.
- Trim `description`.
- Reject empty group name.
- If editing, update existing group.
- If creating, generate new ID and sort order.
- Set `created_at` and `updated_at`.
- Preserve existing `created_at` when editing.
- Log started/completed/failed events.

Required log actions:

```text
create_quick_text_group_started
create_quick_text_group_completed
create_quick_text_group_failed
update_quick_text_group_started
update_quick_text_group_completed
update_quick_text_group_failed
```

### 5. Add `deleteQuickTextGroup`

Add a new exported function:

```ts
export async function deleteQuickTextGroup(groupId: string): Promise<void>
```

Requirements:

- Find the group.
- Count texts assigned to it.
- Remove the group.
- Reassign all quick texts from that group to `group_id: null`.
- Do not delete quick texts.
- Log started/completed/failed events.

Required log actions:

```text
delete_quick_text_group_started
delete_quick_text_group_completed
delete_quick_text_group_failed
```

### 6. Update `saveQuickText`

Current behavior saves only:

- `id`
- `title`
- `content`

Update it to also save:

- `group_id`
- `sort_order`

Rules:

- If `input.group_id` is missing, use `null`.
- If `input.group_id` does not exist in `__SYSTEM_QUICK_TEXT_GROUPS__`, use `null`.
- On create, assign `sort_order` to the end of the target group.
- On edit:
  - Preserve existing `sort_order` if group did not change.
  - Move to the end of the new group if group changed.
- Preserve current `id` on edit.
- Preserve existing behavior when `QuickTextDialog` still does not pass a group.

Required observability context:

```ts
{
  quickTextId,
  editingQuickTextId,
  hasTitle,
  contentLength,
  previousGroupId,
  nextGroupId,
  groupChanged,
  sortOrder
}
```

---

## Success Criteria

- `saveQuickText` still works with old calls that only provide `title` and `content`.
- `saveQuickText` works with new calls that provide `group_id`.
- `saveQuickTextGroup` creates groups.
- `saveQuickTextGroup` edits groups.
- `deleteQuickTextGroup` deletes groups without deleting texts.
- Deleting a group reassigns texts to `group_id: null`.
- Relevant logs are emitted.
- `pnpm run check` passes.
- `pnpm run build` passes.

---

## How to Verify

Run:

```powershell
pnpm run check
pnpm run build
pnpm run dev
```

Manual UI check:

1. Existing quick texts still display.
2. Create/edit/delete current quick texts still works using the old UI.

Optional temporary verification:

- Use dev instrumentation or temporary local calls only if necessary.
- Do not leave temporary test code committed.

---

## Observable Failure Signals

Stop if:

- `QuickTextDialog` can no longer save quick texts.
- Existing quick texts disappear.
- Creating a quick text causes type errors.
- Group deletion deletes quick texts.
- `group_id` is saved as an invalid string instead of `null`.
- Logs expose sensitive full content.
- `pnpm run check` or `pnpm run build` fails.

---

## Stop Conditions If the Plan Does Not Match the Real Codebase

Stop if:

- `saveQuickText` has moved to another file.
- `mutateAppData` no longer exists.
- Logging helpers were changed or removed.
- App state no longer stores quick texts inside `__SYSTEM_QUICK_TEXTS__`.
