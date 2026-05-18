# Phase 4 — Dialogs and Group Assignment

## Objective

Add the UI dialogs needed to create/edit quick-text groups and assign quick texts to groups.

This phase should not yet replace the main `QuickTextsView` layout.

---

## Preconditions Before Implementation

Phase 3 must be complete and verified.

Before coding:

```powershell
git status --short
pnpm run check
pnpm run build
```

Confirm:

- `saveQuickText` accepts optional `group_id`.
- `saveQuickTextGroup` exists.
- `deleteQuickTextGroup` exists.
- Existing quick-text dialog still works.

---

## Expected Behavior

After this phase:

- `QuickTextDialog` supports selecting a group.
- `QuickTextDialog` can still save ungrouped quick texts.
- A new `QuickTextGroupDialog` exists for creating/editing groups.
- A reusable `Select.svelte` exists.
- The main page may still use the old flat layout until Phase 6.

---

## Files / Components Involved

Modify:

```text
src/lib/components/dialogs/QuickTextDialog.svelte
```

Create:

```text
src/lib/components/ui/Select.svelte
src/lib/components/dialogs/QuickTextGroupDialog.svelte
```

Do not modify yet:

```text
src/lib/views/QuickTextsView.svelte
src/App.svelte
src/lib/components/layout/Sidebar.svelte
```

---

## Implementation Steps

### 1. Create `Select.svelte`

Create:

```text
src/lib/components/ui/Select.svelte
```

Recommended API:

```ts
interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  id?: string;
  label: string;
  value: string;
  options: SelectOption[];
  error?: string | null;
  disabled?: boolean;
}
```

Use the existing styling pattern from `Input.svelte`:

- `section-label`
- `input-base`
- error text if needed

The component must use a real `<select>` element.

### 2. Update `QuickTextDialog.svelte`

Add props:

```ts
quickTextGroups?: QuickTextGroup[];
```

Add state:

```ts
const UNGROUPED_OPTION = "__UNGROUPED__";
let selectedGroupId = $state(UNGROUPED_OPTION);
```

Build options:

```ts
const groupOptions = $derived([
  { value: UNGROUPED_OPTION, label: "Textos sin grupo" },
  ...quickTextGroups
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((group) => ({
      value: group.id,
      label: group.name,
    })),
]);
```

When opening:

```ts
selectedGroupId = editingQuickText?.group_id ?? UNGROUPED_OPTION;
```

When saving:

```ts
group_id: selectedGroupId === UNGROUPED_OPTION ? null : selectedGroupId
```

Important:

- Do not save `"__UNGROUPED__"` as a real group ID.
- If no groups exist, the selector should still show `Textos sin grupo`.
- The dialog must still work if `quickTextGroups` is omitted or empty.

### 3. Create `QuickTextGroupDialog.svelte`

Create:

```text
src/lib/components/dialogs/QuickTextGroupDialog.svelte
```

Props:

```ts
interface Props {
  open: boolean;
  onclose: () => void;
  editingGroup?: QuickTextGroup | null;
}
```

Fields:

- `Nombre del grupo`
- `Descripción opcional`

Validation:

- Name is required.
- Description is optional.

Save action:

```ts
await saveQuickTextGroup(
  {
    name: trimmedName,
    description: trimmedDescription,
  },
  editingGroup?.id ?? null,
);
```

Snackbar messages:

- Create success: `Grupo creado.`
- Update success: `Grupo actualizado.`
- Error: actual error message or `No se pudo guardar el grupo.`

---

## Success Criteria

- `Select.svelte` compiles.
- `QuickTextDialog` compiles with and without group options.
- Existing quick text creation still works.
- Existing quick text editing still works.
- Selecting `Textos sin grupo` saves `group_id: null`.
- `QuickTextGroupDialog` can create/edit groups when invoked later.
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

Manual check:

1. Open the existing quick-text creation dialog.
2. Confirm it still opens.
3. Confirm the group selector appears.
4. Confirm `Textos sin grupo` is selected by default.
5. Save a quick text.
6. Confirm the text still appears in the old flat list.

If `QuickTextGroupDialog` is not wired yet, verification is compile-level only for that component in this phase.

---

## Observable Failure Signals

Stop if:

- `QuickTextDialog` no longer opens.
- Saving a quick text fails.
- `"__UNGROUPED__"` appears in persisted data.
- TypeScript errors appear from optional `quickTextGroups`.
- Group dialog imports create circular dependencies.
- `pnpm run check` or `pnpm run build` fails.

---

## Stop Conditions If the Plan Does Not Match the Real Codebase

Stop if:

- `Input.svelte`, `Modal.svelte`, or `Button.svelte` have incompatible APIs.
- `QuickTextDialog` has already been rewritten.
- `saveQuickTextGroup` does not exist after Phase 3.
- `saveQuickText` does not accept group assignment after Phase 3.
