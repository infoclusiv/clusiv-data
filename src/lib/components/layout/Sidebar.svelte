<script lang="ts">
  import { Bug, Download, FolderOpen, ListChecks, Plus } from "lucide-svelte";

  import CategoryDialog from "$lib/components/dialogs/CategoryDialog.svelte";
  import NavRail from "$lib/components/layout/NavRail.svelte";
  import {
    appState,
    createBackup,
    openBackupDirectory,
    showBoard,
    showLogs,
  } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";

  let showCategoryDialog = $state(false);

  function openBoardGallery(): void {
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

  async function handleOpenBackups(): Promise<void> {
    try {
      await openBackupDirectory();
      showSnackbar("Carpeta de backups abierta.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo abrir la carpeta de backups.",
        "error",
      );
    }
  }
</script>

<aside class="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col border-r border-white/70 bg-white/45 backdrop-blur-xl">
  <div class="px-4 pb-2 pt-5">
    <p class="px-1 text-lg font-semibold tracking-[0.18em] text-brand-700">Clusiv Data</p>
  </div>

  <div class="px-3 pb-2">
    <button
      class="btn-primary w-full justify-start"
      onclick={openBoardGallery}
    >
      <ListChecks size={16} />
      Categorías
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
      class="btn-ghost mb-2 w-full justify-start bg-white/65"
      onclick={() => showLogs()}
    >
      <Bug size={16} />
      Depuración
    </button>

    <button
      class="btn-ghost w-full justify-start bg-white/65"
      onclick={() => void handleBackup()}
    >
      <Download size={16} />
      Crear Backup
    </button>

    <button
      class="btn-ghost mt-2 w-full justify-start bg-white/65"
      onclick={() => void handleOpenBackups()}
    >
      <FolderOpen size={16} />
      Abrir Backups
    </button>
  </div>
</aside>

<CategoryDialog
  open={showCategoryDialog}
  onclose={() => (showCategoryDialog = false)}
/>