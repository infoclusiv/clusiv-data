<script lang="ts">
  import { onDestroy } from "svelte";
  import { Bug, Clipboard, Download, FolderOpen, ListChecks, Search } from "lucide-svelte";

  import NavRail from "$lib/components/layout/NavRail.svelte";
  import {
    DEFAULT_SIDEBAR_WIDTH,
    MAX_SIDEBAR_WIDTH,
    MIN_SIDEBAR_WIDTH,
    appState,
    createBackup,
    openBackupDirectory,
    setSidebarWidth,
    showBoard,
    showLogs,
    showQuickTexts,
    showSearch,
  } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";

  let stopResize: (() => void) | null = null;

  function cleanupResize(): void {
    stopResize?.();
    stopResize = null;
  }

  function openBoardGallery(): void {
    showBoard("gallery");
  }

  function handleResizeStart(event: PointerEvent): void {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = appState.sidebarWidth;
    const previousCursor = document.body.style.cursor;

    document.body.style.cursor = "col-resize";

    const handlePointerMove = (moveEvent: PointerEvent): void => {
      setSidebarWidth(startWidth + (moveEvent.clientX - startX));
    };

    const handlePointerUp = (): void => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = previousCursor;
      stopResize = null;
    };

    cleanupResize();
    stopResize = handlePointerUp;

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  onDestroy(() => {
    cleanupResize();
  });

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

<aside
  class="relative flex h-full shrink-0 flex-col overflow-hidden border-r border-white/70 bg-white/45 backdrop-blur-xl"
  style={`width: ${appState.sidebarWidth}px`}
>
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

  <div class="px-3 pb-2">
    <button
      class={`btn-ghost w-full justify-start ${appState.currentView === "quick-texts" ? "bg-white text-brand-800 shadow-sm ring-1 ring-brand-100" : "bg-white/65"}`}
      onclick={() => showQuickTexts()}
    >
      <Clipboard size={16} />
      Textos Rápidos
    </button>
  </div>

  <div class="px-3 pb-3">
    <button
      class={`btn-ghost w-full justify-start ${appState.currentView === "search" ? "bg-white text-brand-800 shadow-sm ring-1 ring-brand-100" : "bg-white/65"}`}
      onclick={() => showSearch()}
    >
      <Search size={16} />
      Buscar
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

  <button
    class="group absolute inset-y-0 right-0 z-20 w-3 cursor-col-resize bg-transparent"
    ondblclick={() => setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
    onpointerdown={handleResizeStart}
    title={`Redimensionar panel izquierdo (${MIN_SIDEBAR_WIDTH}px a ${MAX_SIDEBAR_WIDTH}px). Doble clic para restaurar ${DEFAULT_SIDEBAR_WIDTH}px.`}
    aria-label="Redimensionar panel izquierdo"
  >
    <span class="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 rounded-full bg-slate-300/75 transition group-hover:bg-brand-300"></span>
  </button>
</aside>
