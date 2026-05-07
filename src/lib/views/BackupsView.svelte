<script lang="ts">
  import { onMount } from "svelte";
  import { FolderOpen, RefreshCw, RotateCcw, ShieldAlert } from "lucide-svelte";

  import Button from "$lib/components/ui/Button.svelte";
  import {
    listBackups,
    openBackupDirectory,
    restoreBackup,
  } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { BackupInfo } from "$lib/store/types";

  let backups = $state<BackupInfo[]>([]);
  let selectedBackupName = $state<string | null>(null);
  let loading = $state(true);
  let openingDirectory = $state(false);
  let restoring = $state(false);

  const selectedBackup = $derived(
    backups.find((backup) => backup.name === selectedBackupName) ?? null,
  );

  function formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(date);
  }

  function formatKind(kind: BackupInfo["kind"]): string {
    if (kind === "manual") {
      return "Manual";
    }

    if (kind === "auto") {
      return "Automático";
    }

    return "Desconocido";
  }

  async function loadBackups(): Promise<void> {
    loading = true;

    try {
      backups = await listBackups();

      if (selectedBackupName && !backups.some((backup) => backup.name === selectedBackupName)) {
        selectedBackupName = null;
      }
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudieron cargar los backups.",
        "error",
      );
    } finally {
      loading = false;
    }
  }

  async function handleOpenBackupDirectory(): Promise<void> {
    if (openingDirectory) {
      return;
    }

    openingDirectory = true;

    try {
      await openBackupDirectory();
      showSnackbar("Carpeta de backups abierta.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo abrir la carpeta de backups.",
        "error",
      );
    } finally {
      openingDirectory = false;
    }
  }

  async function handleRestore(): Promise<void> {
    if (!selectedBackup) {
      showSnackbar("Selecciona un backup para restaurar.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Vas a restaurar el backup: ${selectedBackup.name}. Los datos actuales serán reemplazados, pero primero se creará un backup automático de seguridad. ¿Quieres continuar?`,
    );

    if (!confirmed) {
      return;
    }

    restoring = true;

    try {
      const message = await restoreBackup(selectedBackup.name);
      showSnackbar(message, "success");
      selectedBackupName = null;
      await loadBackups();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo restaurar el backup.",
        "error",
      );
    } finally {
      restoring = false;
    }
  }

  onMount(() => {
    void loadBackups();
  });
</script>

<div class="page-panel flex h-full flex-1 flex-col overflow-hidden">
  <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 px-8 py-7">
    <div class="flex items-start gap-4">
      <div class="rounded-2xl bg-amber-50 p-3 text-amber-700">
        <ShieldAlert size={22} />
      </div>

      <div>
        <p class="section-label">Gestión de datos</p>
        <h1 class="mt-2 text-3xl font-semibold text-slate-900">Backups</h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Gestiona tus copias de seguridad y restaura datos anteriores.
        </p>
      </div>
    </div>

    <Button onclick={() => void loadBackups()} disabled={loading || restoring} class="bg-white/70">
      <RefreshCw size={16} />
      {loading ? "Actualizando..." : "Actualizar"}
    </Button>
  </div>

  <div class="flex-1 overflow-y-auto px-8 py-6">
    <section class="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <article class="card p-6">
        <div class="flex items-start gap-4">
          <div class="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <FolderOpen size={20} />
          </div>

          <div>
            <p class="section-label">Acceso rápido</p>
            <h2 class="mt-2 text-xl font-semibold text-slate-900">Abrir carpeta de backups</h2>
            <p class="mt-2 text-sm leading-relaxed text-slate-500">
              Abre la ubicación local donde se guardan las copias para revisarlas o copiar archivos.
            </p>
          </div>
        </div>

        <div class="mt-5">
          <Button
            variant="primary"
            onclick={() => void handleOpenBackupDirectory()}
            disabled={openingDirectory || restoring}
          >
            <FolderOpen size={16} />
            {openingDirectory ? "Abriendo..." : "Abrir carpeta"}
          </Button>
        </div>
      </article>

      <article class="card p-6">
        <div class="flex items-start gap-4">
          <div class="rounded-2xl bg-amber-50 p-3 text-amber-700">
            <RotateCcw size={20} />
          </div>

          <div>
            <p class="section-label">Restauración</p>
            <h2 class="mt-2 text-xl font-semibold text-slate-900">Restaurar backup anterior</h2>
            <p class="mt-2 text-sm leading-relaxed text-slate-500">
              Selecciona una copia disponible. Antes de restaurar se creará una copia automática del estado actual.
            </p>
          </div>
        </div>

        {#if loading}
          <div class="mt-5 rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-sm text-slate-500">
            Cargando backups...
          </div>
        {:else if backups.length === 0}
          <div class="mt-5 rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-sm text-slate-500">
            No hay backups disponibles todavía.
          </div>
        {:else}
          <div class="mt-5 max-h-[30rem] space-y-3 overflow-y-auto pr-1">
            {#each backups as backup}
              <button
                class={`w-full rounded-3xl border p-4 text-left transition ${selectedBackupName === backup.name ? "border-brand-300 bg-brand-50/80 ring-1 ring-brand-200" : "border-slate-200/80 bg-white/70 hover:bg-white"}`}
                onclick={() => selectedBackupName = backup.name}
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="font-medium text-slate-900">{backup.name}</p>
                    <p class="mt-1 text-sm text-slate-500">
                      {formatKind(backup.kind)} · {backup.createdLabel}
                    </p>
                  </div>

                  <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {formatSize(backup.sizeBytes)}
                  </span>
                </div>

                <div class="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <p>Tipo: {formatKind(backup.kind)}</p>
                  <p>Tamaño: {formatSize(backup.sizeBytes)}</p>
                  <p>Fecha estimada: {backup.createdLabel}</p>
                  <p>Modificado: {formatTimestamp(backup.modifiedAt)}</p>
                </div>
              </button>
            {/each}
          </div>

          <div class="mt-5 flex justify-end">
            <Button
              variant="primary"
              onclick={() => void handleRestore()}
              disabled={!selectedBackup || restoring}
            >
              <RotateCcw size={16} />
              {restoring ? "Restaurando..." : "Restaurar backup seleccionado"}
            </Button>
          </div>
        {/if}
      </article>
    </section>
  </div>
</div>
