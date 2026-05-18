# Phase 6 — QuickTextsView Integration

## Objective

Replace the old flat `Textos Rápidos` page with the new grouped/list view system and floating create menu.

This phase wires together the data model, store actions, dialogs, and UI components created in previous phases.

---

## Preconditions Before Implementation

Phase 5 must be complete and verified.

Before coding:

```powershell
git status --short
pnpm run check
pnpm run build
```

Confirm:

- New quick-text UI components exist and compile.
- `QuickTextDialog` supports group selection.
- `QuickTextGroupDialog` exists.
- `saveQuickTextGroup` and `deleteQuickTextGroup` exist.
- `getQuickTextGroups` exists.
- Existing quick texts still appear in the old flat UI.

---

## Expected Behavior

After this phase:

- `Textos Rápidos` defaults to `Vista agrupada`.
- Users can switch to `Vista lista`.
- Existing quick texts appear under `Textos sin grupo`.
- Floating `+` opens:
  - `Nuevo texto`
  - `Nuevo grupo`
- Users can create groups.
- Users can create quick texts and assign them to groups.
- Users can edit quick texts and move them between groups.
- Users can delete groups without deleting quick texts.
- The sidepanel remains unchanged.

---

## Files / Components Involved

Modify:

```text
src/lib/views/QuickTextsView.svelte
```

Use existing/new components:

```text
src/lib/components/dialogs/QuickTextDialog.svelte
src/lib/components/dialogs/QuickTextGroupDialog.svelte
src/lib/components/quick-texts/QuickTextsViewToggle.svelte
src/lib/components/quick-texts/QuickTextsGroupedView.svelte
src/lib/components/quick-texts/QuickTextsListView.svelte
src/lib/components/quick-texts/QuickTextCreateMenu.svelte
```

Do not modify:

```text
src/App.svelte
src/lib/components/layout/Sidebar.svelte
```

---

## Implementation Steps

### 1. Update Imports

Remove unused old imports:

```ts
Clipboard
QuickTextCard
```

Add:

```ts
import QuickTextsViewToggle from "$lib/components/quick-texts/QuickTextsViewToggle.svelte";
import QuickTextsGroupedView from "$lib/components/quick-texts/QuickTextsGroupedView.svelte";
import QuickTextsListView from "$lib/components/quick-texts/QuickTextsListView.svelte";
import QuickTextCreateMenu from "$lib/components/quick-texts/QuickTextCreateMenu.svelte";
import QuickTextGroupDialog from "$lib/components/dialogs/QuickTextGroupDialog.svelte";
```

Update store imports:

```ts
import {
  appState,
  deleteQuickText,
  deleteQuickTextGroup,
} from "$lib/store/appState.svelte";
```

Update utilities:

```ts
import {
  getQuickTexts,
  getQuickTextGroups,
} from "$lib/utils/categoryUtils";
```

Update types:

```ts
import type {
  QuickText,
  QuickTextGroup,
} from "$lib/store/types";
```

### 2. Add View State

Add:

```ts
type QuickTextsViewMode = "grouped" | "list";

let viewMode = $state<QuickTextsViewMode>("grouped");
let showCreateMenu = $state(false);
let showQuickTextGroupDialog = $state(false);
let editingQuickTextGroup = $state<QuickTextGroup | null>(null);
let pendingDeleteQuickTextGroupId = $state<string | null>(null);
```

### 3. Add Group Derived Data

Add:

```ts
const quickTextGroups = $derived(
  appState.appData ? getQuickTextGroups(appState.appData) : [],
);
```

### 4. Add Create/Edit Group Functions

Add:

```ts
function openNewQuickText(): void {
  editingQuickText = null;
  showCreateMenu = false;
  showQuickTextDialog = true;
}

function openNewQuickTextGroup(): void {
  editingQuickTextGroup = null;
  showCreateMenu = false;
  showQuickTextGroupDialog = true;
}

function openEditQuickTextGroup(group: QuickTextGroup): void {
  editingQuickTextGroup = group;
  showQuickTextGroupDialog = true;
}
```

Update the old `openNewDialog` usage so it is no longer directly attached to the floating button.

### 5. Add Delete Group Handler

Add:

```ts
async function handleDeleteQuickTextGroup(): Promise<void> {
  if (!pendingDeleteQuickTextGroupId) {
    return;
  }

  try {
    await deleteQuickTextGroup(pendingDeleteQuickTextGroupId);
    showSnackbar("Grupo eliminado. Sus textos pasaron a Textos sin grupo.", "success");
  } catch (error) {
    showSnackbar(
      error instanceof Error ? error.message : "No se pudo eliminar el grupo.",
      "error",
    );
  } finally {
    pendingDeleteQuickTextGroupId = null;
  }
}
```

### 6. Replace Main Content Area

Replace old flat list rendering with:

```svelte
{#if quickTexts.length === 0 && quickTextGroups.length === 0}
  <div class="card border-dashed p-10 text-center text-sm text-slate-500">
    Aquí aparecerán tus textos reutilizables. Crea el primero para copiarlo rápido cuando lo necesites.
  </div>
{:else if viewMode === "grouped"}
  <QuickTextsGroupedView
    groups={quickTextGroups}
    {quickTexts}
    oncopy={(quickText) => void handleCopy(quickText)}
    onedit={(quickText) => openEditDialog(quickText)}
    ondelete={(quickText) => (pendingDeleteQuickTextId = quickText.id)}
    oneditgroup={openEditQuickTextGroup}
    ondeletegroup={(group) => (pendingDeleteQuickTextGroupId = group.id)}
  />
{:else}
  <QuickTextsListView
    groups={quickTextGroups}
    {quickTexts}
    oncopy={(quickText) => void handleCopy(quickText)}
    onedit={(quickText) => openEditDialog(quickText)}
    ondelete={(quickText) => (pendingDeleteQuickTextId = quickText.id)}
  />
{/if}
```

### 7. Add View Toggle

Place it under the header or inside the header area:

```svelte
<QuickTextsViewToggle
  {viewMode}
  onchange={(nextViewMode) => (viewMode = nextViewMode)}
/>
```

### 8. Replace Floating Button Behavior

Add:

```svelte
<QuickTextCreateMenu
  open={showCreateMenu}
  onnewtext={openNewQuickText}
  onnewgroup={openNewQuickTextGroup}
/>
```

Update floating button:

```svelte
<button
  class="fab"
  onclick={() => (showCreateMenu = !showCreateMenu)}
  title="Crear texto o grupo"
  aria-label="Crear texto o grupo"
>
  <Plus size={22} />
</button>
```

### 9. Update Dialogs

Pass groups to `QuickTextDialog`:

```svelte
<QuickTextDialog
  open={showQuickTextDialog}
  quickTextGroups={quickTextGroups}
  onclose={() => {
    showQuickTextDialog = false;
    editingQuickText = null;
  }}
  {editingQuickText}
/>
```

Add group dialog:

```svelte
<QuickTextGroupDialog
  open={showQuickTextGroupDialog}
  editingGroup={editingQuickTextGroup}
  onclose={() => {
    showQuickTextGroupDialog = false;
    editingQuickTextGroup = null;
  }}
/>
```

Add confirm dialog for group deletion:

```svelte
<ConfirmDialog
  open={pendingDeleteQuickTextGroupId !== null}
  title="Eliminar grupo"
  message="¿Quieres eliminar este grupo? Sus textos no se borrarán; pasarán a Textos sin grupo."
  confirmLabel="Sí, eliminar grupo"
  oncancel={() => (pendingDeleteQuickTextGroupId = null)}
  onconfirm={() => void handleDeleteQuickTextGroup()}
/>
```

---

## Success Criteria

- Default view is grouped.
- Existing quick texts appear under `Textos sin grupo`.
- List view is available.
- Floating `+` opens two options.
- `Nuevo texto` opens quick-text dialog.
- `Nuevo grupo` opens group dialog.
- Group creation works.
- Quick text assignment works.
- Group deletion moves texts to `Textos sin grupo`.
- Existing copy/edit/delete behavior still works.
- No sidepanel changes.
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

Manual test:

1. Open `Textos Rápidos`.
2. Confirm default grouped view.
3. Confirm old texts appear under `Textos sin grupo`.
4. Click `+`.
5. Confirm menu has `Nuevo texto` and `Nuevo grupo`.
6. Create a group.
7. Create a quick text assigned to that group.
8. Edit the quick text and move it to `Textos sin grupo`.
9. Move it back to the group.
10. Delete the group.
11. Confirm the text remains and appears under `Textos sin grupo`.
12. Switch to `Vista lista`.
13. Confirm all texts are visible.
14. Confirm sidepanel is unchanged.

---

## Observable Failure Signals

Stop if:

- Existing quick texts disappear.
- Ungrouped texts do not render.
- `Textos sin grupo` is stored as a real group.
- Floating `+` no longer works.
- Group deletion deletes quick texts.
- Texts appear duplicated in multiple groups.
- Copy action no longer copies content.
- Edit action opens the wrong text.
- `pnpm run check` or `pnpm run build` fails.
- Sidepanel changes.

---

## Stop Conditions If the Plan Does Not Match the Real Codebase

Stop if:

- `QuickTextsView.svelte` structure is no longer similar to expected.
- Components created in Phase 5 are missing or have different APIs.
- Dialogs from Phase 4 are missing.
- Store actions from Phase 3 are missing.
- Utility functions from Phase 2 are missing.
