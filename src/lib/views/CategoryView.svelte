<script lang="ts">
  import {
    ArrowLeft,
    CheckCircle2,
    FolderPlus,
    Inbox,
    Link2,
    Pencil,
    Rocket,
    StickyNote,
    Trash2,
    Upload,
  } from "lucide-svelte";

  import LinkCard from "$lib/components/cards/LinkCard.svelte";
  import NoteCard from "$lib/components/cards/NoteCard.svelte";
  import SubcategoryCard from "$lib/components/cards/SubcategoryCard.svelte";
  import TaskCard from "$lib/components/cards/TaskCard.svelte";
  import BulkImportDialog from "$lib/components/dialogs/BulkImportDialog.svelte";
  import CategoryDialog from "$lib/components/dialogs/CategoryDialog.svelte";
  import ItemDialog from "$lib/components/dialogs/ItemDialog.svelte";
  import LinkDialog from "$lib/components/dialogs/LinkDialog.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import FloatingActionMenu from "$lib/components/ui/FloatingActionMenu.svelte";
  import IconButton from "$lib/components/ui/IconButton.svelte";
  import {
    appState,
    deleteCategory,
    deleteItem,
    deleteLink,
    getItemIndex,
    goBack,
    openUrl,
    selectCategory,
    toggleTaskStatus,
  } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { Category, Item, ItemType } from "$lib/store/types";
  import { GENERAL_CATEGORY_ID, GENERAL_CATEGORY_NAME } from "$lib/utils/constants";
  import {
    formatItemCounts,
    getCategory,
    getCategoryBreadcrumb,
    getCategoryChildrenSummary,
    getCategoryCounts,
    getChildCategories,
    getNotesForCategory,
    getTasksForCategory,
  } from "$lib/utils/categoryUtils";
  import { getIcon } from "$lib/utils/getIconComponent";

  let showLinkDialog = $state(false);
  let showBulkDialog = $state(false);
  let showItemDialog = $state(false);
  let editingItem = $state<Item | null>(null);
  let editingIndex = $state<number | null>(null);
  let itemDialogInitialType = $state<ItemType>("note");
  let pendingDeleteIndex = $state<number | null>(null);
  let pendingDeleteLinkIndex = $state<number | null>(null);
  let confirmDeleteCategory = $state(false);
  let categoryDialogMode = $state<"edit" | "create-child" | null>(null);

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

  const links = $derived(category ? category.links ?? [] : []);

  const canGoBack = $derived(appState.navigationHistory.length > 0);

  const fallbackCategoryName = $derived(
    appState.appData && category
      ? getCategory(
          appState.appData,
          category.parent_id ?? GENERAL_CATEGORY_ID,
        )?.name ?? GENERAL_CATEGORY_NAME
      : GENERAL_CATEGORY_NAME,
  );

  function formatLinkCount(linkCount: number): string {
    return linkCount === 1 ? "1 enlace" : `${linkCount} enlaces`;
  }

  function getCategoryIcon(categoryValue: Category) {
    if (categoryValue.id === GENERAL_CATEGORY_ID) {
      return Inbox;
    }

    return getIcon(categoryValue.icon);
  }

  function getSubcategorySubtitle(categoryValue: Category): string {
    if (!appState.appData) {
      return "Categoría";
    }

    const counts = getCategoryCounts(appState.appData, categoryValue.id);
    const parts: string[] = [];

    if (categoryValue.links.length > 0) {
      parts.push(formatLinkCount(categoryValue.links.length));
    }

    if (counts.noteCount > 0 || counts.taskCount > 0) {
      parts.push(formatItemCounts(counts.noteCount, counts.taskCount));
    }

    if (parts.length > 0) {
      return parts.join(" · ");
    }

    return getCategoryChildrenSummary(appState.appData, categoryValue.id);
  }

  function openNewItemDialog(itemType: ItemType): void {
    editingItem = null;
    editingIndex = null;
    itemDialogInitialType = itemType;
    showItemDialog = true;
  }

  function openEditDialog(item: Item): void {
    editingItem = item;
    editingIndex = getItemIndex(item);
    itemDialogInitialType = item.type;
    showItemDialog = true;
  }

  async function handleOpenAll(): Promise<void> {
    if (!category) {
      return;
    }

    if (links.length === 0) {
      showSnackbar("No hay enlaces para abrir.");
      return;
    }

    showSnackbar(`Abriendo ${links.length} enlaces...`, "success", 2200);

    for (const link of links) {
      try {
        await openUrl(link.url);
      } catch {
        // Keep opening remaining URLs.
      }
    }
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

  async function handleDeleteLink(): Promise<void> {
    if (!category || pendingDeleteLinkIndex === null) {
      return;
    }

    try {
      await deleteLink(category.id, pendingDeleteLinkIndex);
      showSnackbar("Enlace eliminado.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo borrar el enlace.",
        "error",
      );
    } finally {
      pendingDeleteLinkIndex = null;
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

  async function handleDeleteCategory(): Promise<void> {
    if (!category) {
      return;
    }

    try {
      await deleteCategory(category.id);
      showSnackbar("Categoría eliminada.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo eliminar la categoría.",
        "error",
      );
    } finally {
      confirmDeleteCategory = false;
    }
  }
</script>

{#if category && appState.appData}
  {@const CategoryIcon = getCategoryIcon(category)}

  <div class="page-panel relative flex h-full flex-1 flex-col overflow-hidden">
    <div class="border-b border-slate-200/70 px-8 py-7">
      <div class="mb-5 flex items-start justify-between gap-4">
        <button class="btn-ghost -ml-1" onclick={goBack} disabled={!canGoBack}>
          <ArrowLeft size={16} />
          Atrás
        </button>

        <div class="flex flex-wrap items-center gap-1">
          <IconButton icon={Link2} label="Agregar enlace" tone="accent" onclick={() => (showLinkDialog = true)} />
          <IconButton icon={Upload} label="Importar enlaces" tone="warning" onclick={() => (showBulkDialog = true)} />
          <IconButton icon={Pencil} label="Editar categoría" onclick={() => (categoryDialogMode = "edit")} />
          <IconButton
            icon={Trash2}
            label="Borrar categoría"
            tone="danger"
            onclick={() => (confirmDeleteCategory = true)}
            disabled={category.id === GENERAL_CATEGORY_ID}
          />
        </div>
      </div>

      <div class="flex items-start gap-3">
        <div class="rounded-2xl bg-brand-50 p-3 text-brand-700">
          <CategoryIcon size={22} />
        </div>

        <div class="min-w-0 flex-1">
          <p class="section-label">Categoría</p>
          <h1 class="mt-1 text-3xl font-semibold text-slate-900">{category.name}</h1>
          <p class="mt-2 text-sm text-slate-500">{breadcrumb}</p>

          <div class="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              {getCategoryChildrenSummary(appState.appData, category.id)}
            </span>
            <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              {formatLinkCount(links.length)}
            </span>
            <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              {formatItemCounts(notes.length, tasks.length)}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-8 py-6">
      {#if childCategories.length > 0}
        <section class="mb-8">
          <p class="section-label mb-4">Subcategorías</p>
          <div class="flex flex-wrap gap-4">
            {#each childCategories as child}
              {@const Icon = getCategoryIcon(child)}
              <SubcategoryCard
                label={child.name}
                subtitle={getSubcategorySubtitle(child)}
                icon={Icon}
                onopen={() => selectCategory(child.id)}
              />
            {/each}
          </div>
        </section>
      {/if}

      <section class="mb-8">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <Link2 size={18} class="text-brand-700" />
            <div>
              <p class="section-label">Enlaces</p>
              <p class="mt-1 text-sm text-slate-500">
                {links.length === 0 ? "No hay enlaces en esta categoría." : `${links.length} enlaces disponibles.`}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button class="btn-ghost bg-white/70" onclick={() => (showLinkDialog = true)}>
              <Link2 size={16} />
              Agregar Enlace
            </button>
            <button class="btn-ghost bg-white/70" onclick={() => (showBulkDialog = true)}>
              <Upload size={16} />
              Importar
            </button>
            {#if links.length > 0}
              <button class="btn-ghost bg-white/70" onclick={() => void handleOpenAll()}>
                <Rocket size={16} />
                Abrir Todos
              </button>
            {/if}
          </div>
        </div>

        {#if links.length === 0}
          <div class="card border-dashed p-8 text-center text-sm text-slate-500">
            Empieza agregando enlaces individuales o importándolos en bloque.
          </div>
        {:else}
          <div class="space-y-3">
            {#each links as link, index}
              <LinkCard
                {link}
                onopen={(url) => void openUrl(url)}
                ondelete={() => (pendingDeleteLinkIndex = index)}
              />
            {/each}
          </div>
        {/if}
      </section>

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

    <FloatingActionMenu
      title="Crear en esta categoría"
      actions={[
        {
          id: "task",
          label: "Nueva tarea",
          icon: CheckCircle2,
          onclick: () => openNewItemDialog("task"),
        },
        {
          id: "note",
          label: "Nueva nota",
          icon: StickyNote,
          onclick: () => openNewItemDialog("note"),
        },
        {
          id: "subcategory",
          label: "Nueva subcategoría",
          icon: FolderPlus,
          onclick: () => (categoryDialogMode = "create-child"),
        },
      ]}
    />
  </div>

  <LinkDialog
    open={showLinkDialog}
    categoryId={category.id}
    onclose={() => (showLinkDialog = false)}
  />

  <BulkImportDialog
    open={showBulkDialog}
    categoryId={category.id}
    onclose={() => (showBulkDialog = false)}
  />

  <CategoryDialog
    open={categoryDialogMode !== null}
    onclose={() => (categoryDialogMode = null)}
    editingCategoryId={categoryDialogMode === "edit" ? category.id : null}
    initialParentId={categoryDialogMode === "create-child" ? category.id : null}
  />

  <ItemDialog
    open={showItemDialog}
    onclose={() => (showItemDialog = false)}
    {editingItem}
    {editingIndex}
    initialCategoryId={category.id}
    initialType={itemDialogInitialType}
    dialogTitle={itemDialogInitialType === "note"
      ? `Nueva Nota en '${breadcrumb}'`
      : `Nueva Tarea en '${breadcrumb}'`}
  />

  <ConfirmDialog
    open={pendingDeleteIndex !== null}
    title="Eliminar Elemento"
    message="¿Estás seguro de que quieres borrar esta nota o tarea?"
    confirmLabel="Sí, borrar"
    oncancel={() => (pendingDeleteIndex = null)}
    onconfirm={() => void handleDeleteItem()}
  />

  <ConfirmDialog
    open={pendingDeleteLinkIndex !== null}
    title="Eliminar Enlace"
    message="¿Estás seguro de que quieres borrar este enlace?"
    confirmLabel="Sí, borrar"
    oncancel={() => (pendingDeleteLinkIndex = null)}
    onconfirm={() => void handleDeleteLink()}
  />

  <ConfirmDialog
    open={confirmDeleteCategory}
    title="Eliminar Categoría"
    message={`¿Estás seguro? Se eliminarán sus enlaces y las notas/tareas pasarán a '${fallbackCategoryName}'.`}
    confirmLabel="Sí, eliminar"
    oncancel={() => (confirmDeleteCategory = false)}
    onconfirm={() => void handleDeleteCategory()}
  />
{/if}