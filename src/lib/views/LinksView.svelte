<script lang="ts">
  import {
    ClipboardList,
    Inbox,
    Pencil,
    Plus,
    Rocket,
    StickyNote,
    Trash2,
    Upload,
  } from "lucide-svelte";

  import LinkCard from "$lib/components/cards/LinkCard.svelte";
  import SubcategoryCard from "$lib/components/cards/SubcategoryCard.svelte";
  import BulkImportDialog from "$lib/components/dialogs/BulkImportDialog.svelte";
  import CategoryDialog from "$lib/components/dialogs/CategoryDialog.svelte";
  import ItemDialog from "$lib/components/dialogs/ItemDialog.svelte";
  import LinkDialog from "$lib/components/dialogs/LinkDialog.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import IconButton from "$lib/components/ui/IconButton.svelte";
  import {
    appState,
    deleteCategory,
    deleteLink,
    openUrl,
    selectCategory,
    showBoard,
  } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import { GENERAL_CATEGORY_ID } from "$lib/utils/constants";
  import {
    getCategory,
    getCategoryBreadcrumb,
    getCategoryChildrenSummary,
    getChildCategories,
  } from "$lib/utils/categoryUtils";
  import { getIcon } from "$lib/utils/getIconComponent";

  let showLinkDialog = $state(false);
  let showBulkDialog = $state(false);
  let showCategoryDialog = $state(false);
  let showQuickNoteDialog = $state(false);
  let pendingDeleteLinkIndex = $state<number | null>(null);
  let confirmDeleteCategory = $state(false);

  const category = $derived(
    appState.appData && appState.currentCategoryId
      ? getCategory(appState.appData, appState.currentCategoryId)
      : null,
  );

  const childCategories = $derived(
    appState.appData && category
      ? getChildCategories(appState.appData, category.id)
      : [],
  );

  const breadcrumb = $derived(
    appState.appData && category
      ? getCategoryBreadcrumb(appState.appData, category.id)
      : "",
  );

  const links = $derived(category ? category.links ?? [] : []);

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
  <div class="page-panel relative flex h-full flex-1 flex-col overflow-hidden">
    <div class="flex items-start justify-between gap-4 border-b border-slate-200/70 px-8 py-7">
      <div>
        <p class="section-label">Categoría</p>
        <h1 class="mt-2 text-3xl font-semibold text-slate-900">{category.name}</h1>
        <p class="mt-2 text-sm text-slate-500">{breadcrumb}</p>
      </div>

      <div class="flex flex-wrap items-center gap-1">
        <IconButton icon={Rocket} label="Abrir todos los enlaces" tone="success" onclick={() => void handleOpenAll()} />
        <IconButton icon={ClipboardList} label="Ver notas y tareas" tone="warning" onclick={() => showBoard("detail", category.id)} />
        <IconButton icon={Upload} label="Importar enlaces" tone="accent" onclick={() => (showBulkDialog = true)} />
        <IconButton icon={Pencil} label="Editar categoría" onclick={() => (showCategoryDialog = true)} />
        <IconButton
          icon={Trash2}
          label="Borrar categoría"
          tone="danger"
          onclick={() => (confirmDeleteCategory = true)}
          disabled={category.id === "general"}
        />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-8 py-6">
      {#if childCategories.length > 0}
        <section class="mb-8">
          <div class="mb-4 flex items-center gap-2">
            <span class="section-label">Subcategorías</span>
          </div>
          <div class="flex flex-wrap gap-4">
            {#each childCategories as child}
              {@const Icon = child.id === GENERAL_CATEGORY_ID ? Inbox : getIcon(child.icon)}
              <SubcategoryCard
                label={child.name}
                subtitle={getCategoryChildrenSummary(appState.appData, child.id)}
                icon={Icon}
                onopen={() => selectCategory(child.id)}
              />
            {/each}
          </div>
        </section>
      {/if}

      <section>
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <p class="section-label">Enlaces guardados</p>
            <p class="mt-2 text-sm text-slate-500">
              {links.length === 0 ? "No hay enlaces en esta categoría." : `${links.length} enlaces disponibles.`}
            </p>
          </div>

          <button class="btn-ghost" onclick={() => (showQuickNoteDialog = true)}>
            <StickyNote size={16} />
            Agregar Nota a esta Categoría
          </button>
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
    </div>

    <button class="fab" onclick={() => (showLinkDialog = true)} title="Agregar enlace" aria-label="Agregar enlace">
      <Plus size={22} />
    </button>
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
    open={showCategoryDialog}
    onclose={() => (showCategoryDialog = false)}
    editingCategoryId={category.id}
  />

  <ItemDialog
    open={showQuickNoteDialog}
    onclose={() => (showQuickNoteDialog = false)}
    initialCategoryId={category.id}
    initialType="note"
    dialogTitle={`Nueva Nota en '${breadcrumb}'`}
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
    message="¿Estás seguro? Se borrarán los enlaces de esta categoría y sus notas/tareas pasarán a General."
    confirmLabel="Sí, eliminar"
    oncancel={() => (confirmDeleteCategory = false)}
    onconfirm={() => void handleDeleteCategory()}
  />
{/if}