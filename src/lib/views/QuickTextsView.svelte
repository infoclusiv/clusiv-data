<script lang="ts">
  import { Clipboard, Plus } from "lucide-svelte";

  import QuickTextCard from "$lib/components/cards/QuickTextCard.svelte";
  import QuickTextDialog from "$lib/components/dialogs/QuickTextDialog.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import { appState, deleteQuickText } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import { getQuickTexts } from "$lib/utils/categoryUtils";
  import type { QuickText } from "$lib/store/types";

  let showQuickTextDialog = $state(false);
  let editingQuickText = $state<QuickText | null>(null);
  let pendingDeleteQuickTextId = $state<string | null>(null);

  const quickTexts = $derived(
    appState.appData ? getQuickTexts(appState.appData) : [],
  );

  function openNewDialog(): void {
    editingQuickText = null;
    showQuickTextDialog = true;
  }

  function openEditDialog(quickText: QuickText): void {
    editingQuickText = quickText;
    showQuickTextDialog = true;
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
      {#if quickTexts.length === 0}
        <div class="card border-dashed p-10 text-center text-sm text-slate-500">
          Aquí aparecerán tus textos reutilizables. Crea el primero para copiarlo rápido cuando lo necesites.
        </div>
      {:else}
        <div class="space-y-3">
          {#each quickTexts as quickText}
            <QuickTextCard
              {quickText}
              onedit={() => openEditDialog(quickText)}
              oncopy={() => void handleCopy(quickText)}
              ondelete={() => (pendingDeleteQuickTextId = quickText.id)}
            />
          {/each}
        </div>
      {/if}
    </div>

    <button class="fab" onclick={openNewDialog} title="Nuevo texto rápido" aria-label="Nuevo texto rápido">
      <Plus size={22} />
    </button>
  </div>

  <QuickTextDialog
    open={showQuickTextDialog}
    onclose={() => {
      showQuickTextDialog = false;
      editingQuickText = null;
    }}
    {editingQuickText}
  />

  <ConfirmDialog
    open={pendingDeleteQuickTextId !== null}
    title="Eliminar Texto Rápido"
    message="¿Estás seguro de que quieres borrar este texto rápido?"
    confirmLabel="Sí, borrar"
    oncancel={() => (pendingDeleteQuickTextId = null)}
    onconfirm={() => void handleDeleteQuickText()}
  />
{/if}