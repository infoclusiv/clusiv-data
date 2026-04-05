<script lang="ts">
  import { BookOpen, CheckCircle2, Plus, StickyNote } from "lucide-svelte";

  import NoteCard from "$lib/components/cards/NoteCard.svelte";
  import SubcategoryCard from "$lib/components/cards/SubcategoryCard.svelte";
  import TaskCard from "$lib/components/cards/TaskCard.svelte";
  import ItemDialog from "$lib/components/dialogs/ItemDialog.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import { appState, deleteItem, getItemIndex, selectCategory, toggleTaskStatus } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import { CATEGORY_TYPE_NOTEBOOK, getCategoryTypeLabel } from "$lib/utils/constants";
  import {
    getCategory,
    getCategoryBreadcrumb,
    getChildCategories,
    getNotesForCategory,
    getTasksForCategory,
  } from "$lib/utils/categoryUtils";
  import { getIcon, NOTEBOOK_ICON } from "$lib/utils/getIconComponent";
  import type { Item } from "$lib/store/types";

  let showItemDialog = $state(false);
  let editingItem = $state<Item | null>(null);
  let editingIndex = $state<number | null>(null);
  let pendingDeleteIndex = $state<number | null>(null);

  const category = $derived(
    appState.appData && appState.currentCategoryId
      ? getCategory(appState.appData, appState.currentCategoryId)
      : null,
  );

  const breadcrumb = $derived(
    appState.appData && category
      ? getCategoryBreadcrumb(appState.appData, category.id)
      : "",
  );

  const childCategories = $derived(
    appState.appData && category
      ? getChildCategories(appState.appData, category.id)
      : [],
  );

  const notes = $derived(
    appState.appData && category
      ? getNotesForCategory(appState.appData, category.id)
      : [],
  );

  const tasks = $derived(
    appState.appData && category
      ? getTasksForCategory(appState.appData, category.id)
      : [],
  );

  function openNewDialog(): void {
    editingItem = null;
    editingIndex = null;
    showItemDialog = true;
  }

  function openEditDialog(item: Item): void {
    editingItem = item;
    editingIndex = getItemIndex(item);
    showItemDialog = true;
  }

  async function handleDeleteItem(): Promise<void> {
    if (pendingDeleteIndex === null) {
      return;
    }

    try {
      await deleteItem(pendingDeleteIndex);
      showSnackbar("Elemento eliminado.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo eliminar el elemento.",
        "error",
      );
    } finally {
      pendingDeleteIndex = null;
    }
  }

  async function handleToggle(item: Item, done: boolean): Promise<void> {
    const itemIndex = getItemIndex(item);
    try {
      await toggleTaskStatus(itemIndex, done);
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo actualizar la tarea.",
        "error",
      );
    }
  }
</script>

{#if category && appState.appData}
  <div class="page-panel relative flex h-full flex-1 flex-col overflow-hidden">
    <div class="border-b border-slate-200/70 px-8 py-7">
      <div class="flex items-center gap-3">
        <div class="rounded-2xl bg-brand-50 p-3 text-brand-700">
          <BookOpen size={22} />
        </div>
        <div>
          <p class="section-label">Notebook</p>
          <h1 class="mt-1 text-3xl font-semibold text-slate-900">{category.name}</h1>
        </div>
      </div>
      <p class="mt-3 text-sm text-slate-500">{breadcrumb}</p>
    </div>

    <div class="flex-1 overflow-y-auto px-8 py-6">
      {#if childCategories.length > 0}
        <section class="mb-8">
          <p class="section-label mb-4">Subcategorías</p>
          <div class="flex flex-wrap gap-4">
            {#each childCategories as child}
              {@const Icon = child.type === CATEGORY_TYPE_NOTEBOOK ? NOTEBOOK_ICON : getIcon(child.icon)}
              <SubcategoryCard
                label={child.name}
                subtitle={getCategoryTypeLabel(child.type)}
                icon={Icon}
                onopen={() => selectCategory(child.id)}
              />
            {/each}
          </div>
        </section>
      {/if}

      <section class="mb-8">
        <div class="mb-4 flex items-center gap-3">
          <StickyNote size={18} class="text-amber-700" />
          <div>
            <p class="section-label">Notas</p>
            <p class="mt-1 text-sm text-slate-500">
              {notes.length === 0 ? "No hay notas en esta categoría." : `${notes.length} notas disponibles.`}
            </p>
          </div>
        </div>

        {#if notes.length === 0}
          <div class="card border-dashed p-8 text-center text-sm text-slate-500">
            No hay notas en esta categoría.
          </div>
        {:else}
          <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {#each notes as item}
              <NoteCard
                {item}
                onedit={() => openEditDialog(item)}
                ondelete={() => (pendingDeleteIndex = getItemIndex(item))}
              />
            {/each}
          </div>
        {/if}
      </section>

      <section>
        <div class="mb-4 flex items-center gap-3">
          <CheckCircle2 size={18} class="text-emerald-700" />
          <div>
            <p class="section-label">Tareas</p>
            <p class="mt-1 text-sm text-slate-500">
              {tasks.length === 0 ? "No hay tareas en esta categoría." : `${tasks.length} tareas disponibles.`}
            </p>
          </div>
        </div>

        {#if tasks.length === 0}
          <div class="card border-dashed p-8 text-center text-sm text-slate-500">
            No hay tareas en esta categoría.
          </div>
        {:else}
          <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {#each tasks as item}
              <TaskCard
                {item}
                onedit={() => openEditDialog(item)}
                ondelete={() => (pendingDeleteIndex = getItemIndex(item))}
                ontoggle={(done) => void handleToggle(item, done)}
              />
            {/each}
          </div>
        {/if}
      </section>
    </div>

    <button class="fab" onclick={openNewDialog} title="Nueva nota o tarea" aria-label="Nueva nota o tarea">
      <Plus size={22} />
    </button>
  </div>

  <ItemDialog
    open={showItemDialog}
    onclose={() => (showItemDialog = false)}
    {editingItem}
    {editingIndex}
    initialCategoryId={category.id}
    initialType="note"
    dialogTitle={`Nueva Nota en '${breadcrumb}'`}
  />

  <ConfirmDialog
    open={pendingDeleteIndex !== null}
    title="Eliminar Elemento"
    message="¿Estás seguro de que quieres borrar esta nota o tarea?"
    confirmLabel="Sí, borrar"
    oncancel={() => (pendingDeleteIndex = null)}
    onconfirm={() => void handleDeleteItem()}
  />
{/if}