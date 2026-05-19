# Phase 2 — Update quick text editor and save flow for multiple groups

## Objective

Allow the user to assign one quick text to zero, one, or many quick text groups from the quick text create/edit dialog.

This phase should update the input UI and save flow, but it does not yet need to change the grouped display layout.

## Expected behavior

- The quick text dialog displays all existing groups as selectable membership options.
- The user can select multiple groups for one quick text.
- The user can leave all groups unselected, which means the quick text belongs to **Textos sin grupo**.
- Editing an existing quick text preselects its existing `group_ids`.
- Saving persists all selected group ids.
- Legacy `group_id` remains synchronized to the first selected group id for compatibility.

## Files/components involved

- `src/lib/components/dialogs/QuickTextDialog.svelte`
- `src/lib/store/appState.svelte.ts`
- `src/lib/store/types.ts`
- `src/lib/utils/categoryUtils.ts`

Optional new component if needed:

- `src/lib/components/quick-texts/QuickTextGroupMultiSelect.svelte`

## Preconditions before implementation

- Phase 1 has been completed and verified.
- `QuickText` has `group_ids: string[]` available.
- `QuickTextFormInput` accepts `group_ids?: string[]`.
- `saveQuickText` still accepts a `QuickTextFormInput` and persists quick texts through `mutateAppData`.

## Implementation steps

### 1. Replace single-group select with multi-group selection UI

In `QuickTextDialog.svelte`, replace the single `Select` field currently labeled `Grupo` with a multi-select interface.

Low-risk implementation option:

- Use a list of checkboxes with existing Tailwind styling.
- Do not add a new dependency.
- Label the section as `Grupos`.
- Add helper text: `Puedes seleccionar uno o varios grupos.`
- Include a clear action such as `Quitar todos` only if it is simple and does not add state complexity.

Avoid using a native `<select multiple>` if it creates poor usability or inconsistent styling.

### 2. Update local dialog state

Replace:

```ts
let selectedGroupId = $state(UNGROUPED_OPTION);
```

with something like:

```ts
let selectedGroupIds = $state<string[]>([]);
```

On dialog open:

- If `editingQuickText?.group_ids` exists, use it.
- Else, fall back to `editingQuickText?.group_id ? [editingQuickText.group_id] : []`.
- Dedupe selected ids.
- Filter against available `quickTextGroups`.

### 3. Save multiple group ids

Update `handleSave()` so `saveQuickText` receives:

```ts
group_ids: selectedGroupIds
```

Optionally also send:

```ts
group_id: selectedGroupIds[0] ?? null
```

for compatibility during the transition.

### 4. Update `saveQuickText` normalization

In `src/lib/store/appState.svelte.ts`, update `saveQuickText` so it resolves selected group ids using a helper like:

```ts
function resolveQuickTextGroupIds(appData: AppData, groupIds: string[] | undefined, legacyGroupId?: string | null): string[]
```

Expected helper behavior:

- Accept `input.group_ids`.
- Include `input.group_id` if no `group_ids` were provided or as compatibility fallback.
- Filter ids that do not exist in `getQuickTextGroups(appData)`.
- Dedupe while preserving order.

Update `normalizedInput` to include:

```ts
group_ids: nextGroupIds,
group_id: nextGroupIds[0] ?? null
```

### 5. Sort order handling

Do not attempt per-group quick text ordering in this phase.

Because the current data model has one `sort_order` per quick text, keep existing `sort_order` behavior. The multi-group membership should not introduce a new per-group order structure unless a later requirement explicitly asks for ordering texts independently inside each group.

### 6. Logging / observability

Update existing quick text create/update log context to include:

- `previousGroupIds`
- `nextGroupIds`
- `groupCount`
- `groupChanged`

Avoid logging quick text content.

## Success criteria

- A quick text can be saved with multiple selected groups.
- Reopening the dialog preselects all assigned groups.
- A quick text can be saved with no selected groups.
- Existing single-group quick texts still edit correctly.
- `pnpm run check` passes.
- `pnpm run build` passes.

## How to verify

1. Create two groups: `Grupo A` and `Grupo B`.
2. Create a quick text and select both groups.
3. Inspect app state or persisted `data.json` and confirm:

```json
"group_ids": ["grupo_a_id", "grupo_b_id"]
```

4. Reopen the quick text editor and confirm both groups are selected.
5. Unselect all groups, save, and confirm:

```json
"group_ids": [],
"group_id": null
```

## Observable failure signals

- Dialog opens but selected groups reset unexpectedly.
- Saving one quick text removes its group membership.
- `saveQuickText` logs show incorrect `nextGroupIds` or `groupCount`.
- Frontend logs show `update_quick_text_failed` or `create_quick_text_failed`.
- TypeScript errors occur because callers still expect `group_id` only.

## Stop conditions

Stop and report if:

- Phase 1 was not completed or `group_ids` is not available.
- The current repository already has a multi-group selector with a different state contract.
- `QuickTextDialog.svelte` no longer owns the quick text form state.
- `saveQuickText` has been moved or replaced by another persistence path.
- The app now stores quick text/group relations in a separate join table or collection.
