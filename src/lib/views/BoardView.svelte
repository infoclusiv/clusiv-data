<script lang="ts">
  import {
    ArrowLeft,
    CheckCircle2,
    Folder,
    Inbox,
    Plus,
    StickyNote,
  } from "lucide-svelte";

  import NoteCard from "$lib/components/cards/NoteCard.svelte";
  import SubcategoryCard from "$lib/components/cards/SubcategoryCard.svelte";
  import TaskCard from "$lib/components/cards/TaskCard.svelte";
  import ItemDialog from "$lib/components/dialogs/ItemDialog.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import {
    appState,
    deleteItem,
    getItemIndex,
    showBoard,
    toggleTaskStatus,
  } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import { CATEGORY_TYPE_NOTEBOOK, GENERAL_CATEGORY_ID, getCategoryTypeLabel } from "$lib/utils/constants";
  import {
    formatItemCounts,
    getCategory,
    getCategoryBreadcrumb,
    getCategoryCounts,
    getChildCategories,
    getFlatCategoryEntries,
    getNotesForCategory,
    getTasksForCategory,
  } from "$lib/utils/categoryUtils";
  import { getIcon, NOTEBOOK_ICON } from "$lib/utils/getIconComponent";
  import type { Category, Item } from "$lib/store/types";

  let showItemDialog = $state(false);
  let editingItem = $state<Item | null>(null);
  let editingIndex = $state<number | null>(null);
  let pendingDeleteIndex = $state<number | null>(null);

  const flatCategories = $derived(
    appState.appData ? getFlatCategoryEntries(appState.appData) : [],
  );

  const detailCategory = $derived(
    appState.appData && appState.currentBoardFilterId
      ? getCategory(appState.appData, appState.currentBoardFilterId)
      : null,
  );

  const detailBreadcrumb = $derived(
    appState.appData && detailCategory
      ? getCategoryBreadcrumb(appState.appData, detailCategory.id)
      : "",
  );

  const detailChildren = $derived(
    appState.appData && detailCategory
      ? getChildCategories(appState.appData, detailCategory.id)
      : [],
  );

  const detailNotes = $derived(
    appState.appData && detailCategory
      ? getNotesForCategory(appState.appData, detailCategory.id)
      : [],
  );

  const detailTasks = $derived(
    appState.appData && detailCategory
      ? getTasksForCategory(appState.appData, detailCategory.id)
      : [],
  );

  $effect(() => {
    if (appState.currentBoardMode === "detail" && appState.currentBoardFilterId && !detailCategory) {
      showBoard("gallery");
    }
  });

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
    try {
      await toggleTaskStatus(getItemIndex(item), done);
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo actualizar la tarea.",
        "error",
      );
    }
  }

  function getCategoryIcon(category: Category) {
    if (category.id === GENERAL_CATEGORY_ID) {
      return Inbox;
    }
    if (category.type === CATEGORY_TYPE_NOTEBOOK) {
      return NOTEBOOK_ICON;
    }
    return getIcon(category.icon);
  }

  function getGalleryTone(category: Category, depth: number): string {
    if (category.id === GENERAL_CATEGORY_ID) {
      return "bg-brand-50/85 border-brand-100";
    }
    if (category.type === CATEGORY_TYPE_NOTEBOOK) {
      return "bg-amber-50/90 border-amber-200/70";
    }
    if (depth > 0) {
      return "bg-slate-50/90 border-slate-200/80";
    }
    return "bg-white/85 border-white/75";
  }
</script>

{#if appState.appData}
  <div class="page-panel relative flex h-full flex-1 flex-col overflow-hidden">
    {#if appState.currentBoardMode === "gallery"}
      <div class="flex-1 overflow-y-auto px-8 py-7">
        <div class="mb-6">
          <p class="section-label">Board</p>
          <h1 class="mt-2 text-3xl font-semibold text-slate-900">Notas y Tareas</h1>
          <p class="mt-2 text-sm text-slate-500">
            Elige una categoría para ver sólo sus notas y tareas.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {#each flatCategories as [category, depth]}
            {@const Icon = getCategoryIcon(category)}
            {@const counts = getCategoryCounts(appState.appData, category.id)}
            <button
              class={`card card-hover flex min-h-[220px] flex-col items-start p-5 text-left ${getGalleryTone(category, depth)}`}
              onclick={() => showBoard("detail", category.id)}
            >
              <div class="mb-5 flex w-full items-center justify-between">
                <div class="rounded-2xl bg-white/80 p-3 text-brand-700 shadow-sm">
                  <Icon size={22} />
                </div>
                <span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {depth > 0 ? `Nivel ${depth + 1}` : "Principal"}
                </span>
              </div>

              <p class="text-lg font-semibold text-slate-900">{category.name}</p>
              <p class="mt-2 text-sm leading-relaxed text-slate-500">
                {category.id === GENERAL_CATEGORY_ID
                  ? "Notas y tareas generales"
                  : getCategoryBreadcrumb(appState.appData, category.id)}
              </p>

              <div class="mt-auto pt-6 text-sm font-semibold text-slate-700">
                {formatItemCounts(counts.noteCount, counts.taskCount)}
              </div>
            </button>
          {/each}
        </div>
      </div>
    {:else if detailCategory}
      {@const DetailIcon = getCategoryIcon(detailCategory)}
      <div class="flex-1 overflow-y-auto px-8 py-7">
        <button class="btn-ghost mb-5" onclick={() => showBoard("gallery")}>
          <ArrowLeft size={16} />
          Volver a categorías
        </button>

        <div class="mb-6 flex items-center gap-3">
          <div class="rounded-2xl bg-brand-50 p-3 text-brand-700">
            <DetailIcon size={22} />
          </div>
          <div>
            <p class="section-label">Categoría filtrada</p>
            <h1 class="mt-1 text-3xl font-semibold text-slate-900">{detailCategory.name}</h1>
            <p class="mt-2 text-sm text-slate-500">{detailBreadcrumb}</p>
          </div>
        </div>

        {#if detailChildren.length > 0}
          <section class="mb-8">
            <p class="section-label mb-4">Subcategorías</p>
            <div class="flex flex-wrap gap-4">
              {#each detailChildren as child}
                {@const Icon = getCategoryIcon(child)}
                <SubcategoryCard
                  label={child.name}
                  subtitle={getCategoryTypeLabel(child.type)}
                  icon={Icon}
                  onopen={() => showBoard("detail", child.id)}
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
                {detailNotes.length === 0 ? "No hay notas en esta categoría." : `${detailNotes.length} notas disponibles.`}
              </p>
            </div>
          </div>

          {#if detailNotes.length === 0}
            <div class="card border-dashed p-8 text-center text-sm text-slate-500">
              No hay notas en esta categoría.
            </div>
          {:else}
            <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {#each detailNotes as item}
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
                {detailTasks.length === 0 ? "No hay tareas en esta categoría." : `${detailTasks.length} tareas disponibles.`}
              </p>
            </div>
          </div>

          {#if detailTasks.length === 0}
            <div class="card border-dashed p-8 text-center text-sm text-slate-500">
              No hay tareas en esta categoría.
            </div>
          {:else}
            <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {#each detailTasks as item}
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

      <button class="fab" onclick={openNewDialog} title="Nuevo ítem" aria-label="Nuevo ítem">
        <Plus size={22} />
      </button>
    {/if}
  </div>

  <ItemDialog
    open={showItemDialog}
    onclose={() => (showItemDialog = false)}
    {editingItem}
    {editingIndex}
    initialCategoryId={detailCategory?.id ?? GENERAL_CATEGORY_ID}
    initialType="task"
    dialogTitle="Nuevo Elemento"
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