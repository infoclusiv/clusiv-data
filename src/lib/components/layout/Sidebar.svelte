<script lang="ts">
  import { Download, ListChecks, Plus } from "lucide-svelte";

  import CategoryDialog from "$lib/components/dialogs/CategoryDialog.svelte";
  import NavRail from "$lib/components/layout/NavRail.svelte";
  import { appState, createBackup, showBoard } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";

  let showCategoryDialog = $state(false);

  function openBoardGallery(): void {
    appState.currentCategoryId = null;
    showBoard("gallery");
  }

  async function handleBackup(): Promise<void> {
    try {
      const message = await createBackup(true);
      showSnackbar(message, "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo crear el backup.",
        "error",
      );
    }
  }
</script>

<aside class="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col border-r border-white/70 bg-white/45 backdrop-blur-xl">
  <div class="px-4 pb-3 pt-5">
    <div class="rounded-[1.5rem] bg-white/80 p-4 shadow-soft">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Clusiv Data</p>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Migración activa a Tauri + Svelte con compatibilidad de datos existente.
      </p>
    </div>
  </div>

  <div class="px-3 pb-2">
    <button
      class="btn-primary w-full justify-start"
      onclick={openBoardGallery}
    >
      <ListChecks size={16} />
      Notas y Tareas
    </button>
  </div>

  <div class="px-3 pb-3">
    <button
      class="btn-ghost w-full justify-start bg-white/65"
      onclick={() => (showCategoryDialog = true)}
    >
      <Plus size={16} />
      Nueva Categoría
    </button>
  </div>

  <div class="mx-3 mb-2 h-px bg-slate-200/80"></div>

  <NavRail />

  <div class="mx-3 mt-2 h-px bg-slate-200/80"></div>

  <div class="px-3 py-4">
    <button
      class="btn-ghost w-full justify-start bg-white/65"
      onclick={() => void handleBackup()}
    >
      <Download size={16} />
      Crear Backup
    </button>
  </div>
</aside>

<CategoryDialog
  open={showCategoryDialog}
  onclose={() => (showCategoryDialog = false)}
  initialParentId={appState.currentCategoryId}
/>