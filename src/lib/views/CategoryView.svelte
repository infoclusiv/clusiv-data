<script lang="ts">
  import {
    ArrowLeft,
    CheckCircle2,
    FolderPlus,
    GitBranch,
    Inbox,
    Link2,
    Pencil,
    Rocket,
    StickyNote,
    Trash2,
    Upload,
  } from "lucide-svelte";

  import CategorySectionTabs from "$lib/components/category/CategorySectionTabs.svelte";
  import LinkCard from "$lib/components/cards/LinkCard.svelte";
  import NoteCard from "$lib/components/cards/NoteCard.svelte";
  import SubcategoryCard from "$lib/components/cards/SubcategoryCard.svelte";
  import TaskCard from "$lib/components/cards/TaskCard.svelte";
  import FlowSection from "$lib/components/flows/FlowsSection.svelte";
  import BulkImportDialog from "$lib/components/dialogs/BulkImportDialog.svelte";
  import CategoryDialog from "$lib/components/dialogs/CategoryDialog.svelte";
  import LinkDialog from "$lib/components/dialogs/LinkDialog.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import FloatingActionMenu from "$lib/components/ui/FloatingActionMenu.svelte";
  import IconButton from "$lib/components/ui/IconButton.svelte";
  import {
    appState,
    createFlow,
    deleteCategory,
    deleteItem,
    deleteLink,
    getItemIndex,
    goBack,
    openFlowEditor,
    openItemEditor,
    openUrl,
    selectCategory,
    setCategorySection,
    toggleTaskStatus,
  } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { Category, Item, ItemType, Link } from "$lib/store/types";
  import { GENERAL_CATEGORY_ID, GENERAL_CATEGORY_NAME } from "$lib/utils/constants";
  import {
    formatItemCounts,
    getCategory,
    getCategoryBreadcrumb,
    getCategoryChildrenSummary,
    getCategoryCounts,
    getChildCategories,
    getFlowsForCategory,
    getNotesForCategory,
    getTasksForCategory,
  } from "$lib/utils/categoryUtils";
  import { getIcon } from "$lib/utils/getIconComponent";

  let showLinkDialog = $state(false);
  let showBulkDialog = $state(false);
  let pendingDeleteIndex = $state<number | null>(null);
  let pendingDeleteLinkIndex = $state<number | null>(null);
  let editingLinkIndex = $state<number | null>(null);
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

  const flows = $derived(
    appState.appData && category
      ? getFlowsForCategory(appState.appData, category.id)
      : [],
  );

  const links = $derived(category ? category.links ?? [] : []);
  const canGoBack = $derived(appState.navigationHistory.length > 0);
  const recentNote = $derived(notes[0] ?? null);
  const pendingTask = $derived(tasks.find((task) => !task.done) ?? tasks[0] ?? null);
  const firstLink = $derived(links[0] ?? null);
  const firstFlow = $derived(flows[0] ?? null);
  const editingLink = $derived<Link | null>(
    editingLinkIndex !== null ? links[editingLinkIndex] ?? null : null,
  );

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

  function pluralize(count: number, singular: string, plural: string): string {
    return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
  }

  function getSubcategoryCountLabel(count: number): string {
    return pluralize(count, "subcategoría", "subcategorías");
  }

  function getNoteCountLabel(count: number): string {
    return pluralize(count, "nota", "notas");
  }

  function getTaskCountLabel(count: number): string {
    return pluralize(count, "tarea", "tareas");
  }

  function getFlowCountLabel(count: number): string {
    return pluralize(count, "flujo", "flujos");
  }

  function getItemPreview(item: Item | null, fallback = "Sin contenido"): string {
    if (!item) {
      return fallback;
    }

    const content = item.comment.trim();
    return content.length > 0 ? content : fallback;
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
    if (!category) {
      return;
    }

    openItemEditor({
      initialCategoryId: category.id,
      initialType: itemType,
      title: itemType === "note"
        ? `Nueva Nota en '${breadcrumb}'`
        : `Nueva Tarea en '${breadcrumb}'`,
    });
  }

  function openEditDialog(item: Item): void {
    openItemEditor({
      editingItem: item,
      editingIndex: getItemIndex(item),
    });
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

  async function handleCreateFlow(): Promise<void> {
    if (!category) {
      return;
    }

    try {
      const flowId = await createFlow({
        categoryId: category.id,
        title: `Flujo de ${category.name}`,
      });
      setCategorySection("flows");
      openFlowEditor(flowId);
      showSnackbar("Flujo creado.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo crear el flujo.",
        "error",
      );
    }
  }

  function openCreateLinkDialog(): void {
    editingLinkIndex = null;
    showLinkDialog = true;
  }

  function openEditLinkDialog(index: number): void {
    editingLinkIndex = index;
    showLinkDialog = true;
  }

  function closeLinkDialog(): void {
    showLinkDialog = false;
    editingLinkIndex = null;
  }

  const fabActions = $derived.by(() => {
    if (appState.currentCategorySection === "notes") {
      return [
        {
          id: "note",
          label: "Nueva nota",
          icon: StickyNote,
          onclick: () => openNewItemDialog("note"),
        },
      ];
    }

    if (appState.currentCategorySection === "links") {
      return [
        {
          id: "link",
          label: "Agregar enlace",
          icon: Link2,
          onclick: openCreateLinkDialog,
        },
      ];
    }

    if (appState.currentCategorySection === "subcategories") {
      return [
        {
          id: "subcategory",
          label: "Nueva subcategoría",
          icon: FolderPlus,
          onclick: () => (categoryDialogMode = "create-child"),
        },
      ];
    }

    if (appState.currentCategorySection === "flows") {
      return [
        {
          id: "flow",
          label: "Nuevo flujo",
          icon: GitBranch,
          onclick: () => void handleCreateFlow(),
        },
      ];
    }

    return [
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
    ];
  });
</script>

{#if category && appState.appData}
  {@const CategoryIcon = getCategoryIcon(category)}

  <div class="relative flex h-full flex-1">
    <div class="page-panel relative flex h-full flex-1 flex-col overflow-hidden">
      <div class="border-b border-slate-200/70 px-8 py-7">
        <div class="mb-5 flex items-start justify-between gap-4">
          <button class="btn-ghost -ml-1" onclick={goBack} disabled={!canGoBack}>
            <ArrowLeft size={16} />
            Atrás
          </button>

          <div class="flex flex-wrap items-center gap-1">
            <IconButton icon={Link2} label="Agregar enlace" tone="accent" onclick={openCreateLinkDialog} />
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
                {getSubcategoryCountLabel(childCategories.length)}
              </span>
              <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                {formatLinkCount(links.length)}
              </span>
              <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                {getNoteCountLabel(notes.length)}
              </span>
              <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                {getTaskCountLabel(tasks.length)}
              </span>
              <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                {getFlowCountLabel(flows.length)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <CategorySectionTabs
        activeSection={appState.currentCategorySection}
        onselect={setCategorySection}
      />

      <div class="flex-1 overflow-y-auto px-8 py-6">
        {#if appState.currentCategorySection === "overview"}
          <section class="space-y-6">
            <div class="flex items-center gap-3">
              <GitBranch size={18} class="text-brand-700" />
              <div>
                <p class="section-label">Resumen general</p>
                <p class="mt-1 text-sm text-slate-500">
                  Accesos rápidos para revisar qué hay en esta categoría.
                </p>
              </div>
            </div>

            <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <button
                type="button"
                class="card flex min-h-[18rem] flex-col justify-between p-6 text-left hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                onclick={() => setCategorySection("links")}
              >
                <div>
                  <div class="mb-5 flex items-center gap-4">
                    <div class="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                      <Link2 size={30} />
                    </div>
                    <div>
                      <p class="text-4xl font-semibold text-slate-900">{links.length}</p>
                      <p class="mt-1 text-sm font-semibold text-slate-700">
                        {links.length === 1 ? "Enlace" : "Enlaces"}
                      </p>
                    </div>
                  </div>

                  <p class="text-sm font-medium text-slate-500">
                    {links.length === 0 ? "Sin enlaces guardados" : formatLinkCount(links.length)}
                  </p>
                </div>

                {#if firstLink}
                  <div class="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <p class="truncate text-sm font-semibold text-slate-900">{firstLink.title}</p>
                    <p class="mt-1 truncate text-xs text-slate-500">{firstLink.url}</p>
                    {#if firstLink.images.length > 0}
                      <p class="mt-2 text-xs font-semibold text-emerald-700">
                        {firstLink.images.length === 1 ? "1 imagen adjunta" : `${firstLink.images.length} imágenes adjuntas`}
                      </p>
                    {/if}
                  </div>
                {:else}
                  <div class="mt-6 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                    Agrega enlaces importantes para esta categoría.
                  </div>
                {/if}
              </button>

              <button
                type="button"
                class="card flex min-h-[18rem] flex-col justify-between p-6 text-left hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                onclick={() => setCategorySection("subcategories")}
              >
                <div>
                  <div class="mb-5 flex items-center gap-4">
                    <div class="rounded-2xl bg-blue-50 p-4 text-blue-600">
                      <FolderPlus size={30} />
                    </div>
                    <div>
                      <p class="text-4xl font-semibold text-slate-900">{childCategories.length}</p>
                      <p class="mt-1 text-sm font-semibold text-slate-700">Subcategorías</p>
                    </div>
                  </div>

                  <p class="text-sm font-medium text-slate-500">
                    {getSubcategoryCountLabel(childCategories.length)}
                  </p>
                </div>

                {#if childCategories.length > 0}
                  <div class="mt-6 space-y-2">
                    {#each childCategories.slice(0, 3) as child}
                      <div class="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        {child.name}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="mt-6 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                    Crea subcategorías para dividir mejor el contenido.
                  </div>
                {/if}
              </button>

              <button
                type="button"
                class="card flex min-h-[18rem] flex-col justify-between p-6 text-left hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                onclick={() => setCategorySection("notes")}
              >
                <div>
                  <div class="mb-5 flex items-center gap-4">
                    <div class="rounded-2xl bg-amber-50 p-4 text-amber-600">
                      <StickyNote size={30} />
                    </div>
                    <div>
                      <p class="text-4xl font-semibold text-slate-900">{notes.length}</p>
                      <p class="mt-1 text-sm font-semibold text-slate-700">Notas</p>
                    </div>
                  </div>

                  <p class="text-sm font-medium text-slate-500">
                    {getNoteCountLabel(notes.length)}
                  </p>
                </div>

                {#if recentNote}
                  <div class="mt-6 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                    <p class="truncate text-sm font-semibold text-slate-900">
                      {recentNote.title.trim() || "Nota sin título"}
                    </p>
                    <p class="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">
                      {getItemPreview(recentNote)}
                    </p>
                  </div>
                {:else}
                  <div class="mt-6 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                    No hay notas en esta categoría.
                  </div>
                {/if}
              </button>

              <button
                type="button"
                class="card flex min-h-[18rem] flex-col justify-between p-6 text-left hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                onclick={() => setCategorySection("tasks")}
              >
                <div>
                  <div class="mb-5 flex items-center gap-4">
                    <div class="rounded-2xl bg-purple-50 p-4 text-purple-600">
                      <CheckCircle2 size={30} />
                    </div>
                    <div>
                      <p class="text-4xl font-semibold text-slate-900">{tasks.length}</p>
                      <p class="mt-1 text-sm font-semibold text-slate-700">
                        {tasks.length === 1 ? "Tarea" : "Tareas"}
                      </p>
                    </div>
                  </div>

                  <p class="text-sm font-medium text-slate-500">
                    {tasks.length === 0 ? "Sin tareas" : getTaskCountLabel(tasks.length)}
                  </p>
                </div>

                {#if pendingTask}
                  <div class="mt-6 rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
                    <p class="truncate text-sm font-semibold text-slate-900">
                      {pendingTask.title.trim() || "Tarea sin título"}
                    </p>
                    <p class={`mt-2 text-xs font-semibold ${pendingTask.done ? "text-emerald-600" : "text-red-500"}`}>
                      {pendingTask.done ? "Tarea completada" : "Tarea pendiente"}
                    </p>
                  </div>
                {:else}
                  <div class="mt-6 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                    No hay tareas pendientes.
                  </div>
                {/if}
              </button>

              <button
                type="button"
                class="card flex min-h-[18rem] flex-col justify-between p-6 text-left hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                onclick={() => setCategorySection("flows")}
              >
                <div>
                  <div class="mb-5 flex items-center gap-4">
                    <div class="rounded-2xl bg-slate-100 p-4 text-slate-600">
                      <GitBranch size={30} />
                    </div>
                    <div>
                      <p class="text-4xl font-semibold text-slate-900">{flows.length}</p>
                      <p class="mt-1 text-sm font-semibold text-slate-700">Flujos</p>
                    </div>
                  </div>

                  <p class="text-sm font-medium text-slate-500">
                    {flows.length === 0 ? "Sin flujos" : getFlowCountLabel(flows.length)}
                  </p>
                </div>

                {#if firstFlow}
                  <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p class="truncate text-sm font-semibold text-slate-900">
                      {firstFlow.title.trim() || "Nuevo flujo"}
                    </p>
                    <p class="mt-2 text-xs text-slate-500">
                      {firstFlow.nodes.length} nodos · {firstFlow.edges.length} conexiones
                    </p>
                  </div>
                {:else}
                  <div class="mt-6 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                    Aún no hay flujos en esta categoría.
                  </div>
                {/if}
              </button>
            </div>
          </section>
        {:else if appState.currentCategorySection === "subcategories"}
          <section>
            <div class="mb-4 flex items-center gap-3">
              <FolderPlus size={18} class="text-brand-700" />
              <div>
                <p class="section-label">Subcategorías</p>
                <p class="mt-1 text-sm text-slate-500">
                  {childCategories.length === 0
                    ? "No hay subcategorías en esta categoría."
                    : `${childCategories.length} subcategorías disponibles.`}
                </p>
              </div>
            </div>

            {#if childCategories.length === 0}
              <div class="card border-dashed p-8 text-center text-sm text-slate-500">
                Crea subcategorías para dividir mejor el contenido.
              </div>
            {:else}
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
            {/if}
          </section>
        {:else if appState.currentCategorySection === "links"}
          <section>
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
                <button class="btn-ghost bg-white/70" onclick={openCreateLinkDialog}>
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
                    onedit={() => openEditLinkDialog(index)}
                    ondelete={() => (pendingDeleteLinkIndex = index)}
                  />
                {/each}
              </div>
            {/if}
          </section>
        {:else if appState.currentCategorySection === "notes"}
          <section>
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
        {:else if appState.currentCategorySection === "flows"}
          <FlowSection
            categoryName={category.name}
            {flows}
            oncreate={() => void handleCreateFlow()}
            onopen={(flowId) => openFlowEditor(flowId)}
          />
        {:else if appState.currentCategorySection === "tasks"}
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
        {:else}
          <section class="card border-dashed p-8 text-center text-sm text-slate-500">
            No se encontró esta sección.
          </section>
        {/if}
      </div>
    </div>

    <FloatingActionMenu
      title="Crear en esta categoría"
      actions={fabActions}
    />
  </div>

  <LinkDialog
    open={showLinkDialog}
    categoryId={category.id}
    {editingLink}
    {editingLinkIndex}
    onclose={closeLinkDialog}
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
