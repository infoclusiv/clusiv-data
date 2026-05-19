<script lang="ts">
  import { Plus } from "lucide-svelte";

  import QuickTextDialog from "$lib/components/dialogs/QuickTextDialog.svelte";
  import QuickTextGroupDialog from "$lib/components/dialogs/QuickTextGroupDialog.svelte";
  import QuickTextCreateMenu from "$lib/components/quick-texts/QuickTextCreateMenu.svelte";
  import QuickTextsGroupedView from "$lib/components/quick-texts/QuickTextsGroupedView.svelte";
  import QuickTextsListView from "$lib/components/quick-texts/QuickTextsListView.svelte";
  import QuickTextsViewToggle from "$lib/components/quick-texts/QuickTextsViewToggle.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import {
    appState,
    deleteQuickText,
    deleteQuickTextGroup,
  } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import { getQuickTextGroups, getQuickTexts } from "$lib/utils/categoryUtils";
  import type { QuickText, QuickTextGroup } from "$lib/store/types";

  type QuickTextsViewMode = "grouped" | "list";

  let viewMode = $state<QuickTextsViewMode>("grouped");
  let showCreateMenu = $state(false);
  let showQuickTextDialog = $state(false);
  let showQuickTextGroupDialog = $state(false);
  let editingQuickText = $state<QuickText | null>(null);
  let editingQuickTextGroup = $state<QuickTextGroup | null>(null);
  let pendingDeleteQuickTextId = $state<string | null>(null);
  let pendingDeleteQuickTextGroupId = $state<string | null>(null);

  const quickTexts = $derived(
    appState.appData ? getQuickTexts(appState.appData) : [],
  );
  const quickTextGroups = $derived(
    appState.appData ? getQuickTextGroups(appState.appData) : [],
  );

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

  function openEditDialog(quickText: QuickText): void {
    editingQuickText = quickText;
    showCreateMenu = false;
    showQuickTextDialog = true;
  }

  function openEditQuickTextGroup(group: QuickTextGroup): void {
    editingQuickTextGroup = group;
    showCreateMenu = false;
    showQuickTextGroupDialog = true;
  }

  async function handleCopy(quickText: QuickText): Promise<void> {
    try {
      await navigator.clipboard.writeText(quickText.content);
      showSnackbar("Texto copiado al portapapeles.", "success", 1800);
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo copiar el texto.",
        "error",
      );
    }
  }

  async function handleDeleteQuickText(): Promise<void> {
    if (!pendingDeleteQuickTextId) {
      return;
    }

    try {
      await deleteQuickText(pendingDeleteQuickTextId);
      showSnackbar("Texto rápido eliminado.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo borrar el texto rápido.",
        "error",
      );
    } finally {
      pendingDeleteQuickTextId = null;
    }
  }

  async function handleDeleteQuickTextGroup(): Promise<void> {
    if (!pendingDeleteQuickTextGroupId) {
      return;
    }

    try {
      await deleteQuickTextGroup(pendingDeleteQuickTextGroupId);
      showSnackbar(
        "Grupo eliminado. Sus textos pasaron a Textos sin grupo.",
        "success",
      );
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo eliminar el grupo.",
        "error",
      );
    } finally {
      pendingDeleteQuickTextGroupId = null;
    }
  }
</script>

{#if appState.appData}
  <div class="page-panel relative flex h-full flex-1 flex-col overflow-hidden">
    <div class="flex items-start justify-between gap-4 border-b border-slate-200/70 px-8 py-7">
      <div>
        <p class="section-label">Global</p>
        <h1 class="mt-2 text-3xl font-semibold text-slate-900">Textos Rápidos</h1>
        <p class="mt-2 text-sm text-slate-500">
          Guarda textos reutilizables para copiarlos al portapapeles en un clic.
        </p>
      </div>

      <div class="rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
        {quickTexts.length === 1 ? "1 texto guardado" : `${quickTexts.length} textos guardados`}
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-8 py-6">
      <div class="mb-5 flex items-center justify-between gap-4">
        <QuickTextsViewToggle
          {viewMode}
          onchange={(nextViewMode) => (viewMode = nextViewMode)}
        />
      </div>

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
    </div>

    <QuickTextCreateMenu
      open={showCreateMenu}
      onnewtext={openNewQuickText}
      onnewgroup={openNewQuickTextGroup}
    />

    <button
      class="fab"
      onclick={() => (showCreateMenu = !showCreateMenu)}
      title="Crear texto o grupo"
      aria-label="Crear texto o grupo"
    >
      <Plus size={22} />
    </button>
  </div>

  <QuickTextDialog
    open={showQuickTextDialog}
    quickTextGroups={quickTextGroups}
    onclose={() => {
      showQuickTextDialog = false;
      editingQuickText = null;
    }}
    {editingQuickText}
  />

  <QuickTextGroupDialog
    open={showQuickTextGroupDialog}
    editingGroup={editingQuickTextGroup}
    onclose={() => {
      showQuickTextGroupDialog = false;
      editingQuickTextGroup = null;
    }}
  />

  <ConfirmDialog
    open={pendingDeleteQuickTextId !== null}
    title="Eliminar Texto Rápido"
    message="¿Quieres borrar este texto rápido?"
    confirmLabel="Sí, borrar"
    oncancel={() => (pendingDeleteQuickTextId = null)}
    onconfirm={() => void handleDeleteQuickText()}
  />

  <ConfirmDialog
    open={pendingDeleteQuickTextGroupId !== null}
    title="Eliminar grupo"
    message="¿Quieres eliminar este grupo? Sus textos no se borrarán; pasarán a Textos sin grupo."
    confirmLabel="Sí, eliminar grupo"
    oncancel={() => (pendingDeleteQuickTextGroupId = null)}
    onconfirm={() => void handleDeleteQuickTextGroup()}
  />
{/if}
