<script lang="ts">
  import { onMount } from "svelte";
  import { Bug, Download, FolderOpen, RefreshCw } from "lucide-svelte";

  import Button from "$lib/components/ui/Button.svelte";
  import { exportLogs, getLogStatus, openLogDirectory } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { LogStatus } from "$lib/store/types";

  let status = $state<LogStatus | null>(null);
  let loading = $state(true);
  let exporting = $state(false);
  let openingDirectory = $state(false);

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

  async function refreshStatus(): Promise<void> {
    loading = true;

    try {
      status = await getLogStatus();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo cargar el estado de los logs.",
        "error",
      );
    } finally {
      loading = false;
    }
  }

  async function handleExport(): Promise<void> {
    if (exporting) {
      return;
    }

    exporting = true;

    try {
      const exportPath = await exportLogs();
      await refreshStatus();
      showSnackbar(`Logs exportados en ${exportPath}`, "success", 5200);
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudieron exportar los logs.",
        "error",
      );
    } finally {
      exporting = false;
    }
  }

  async function handleOpenDirectory(): Promise<void> {
    if (openingDirectory) {
      return;
    }

    openingDirectory = true;

    try {
      await openLogDirectory();
      showSnackbar("Carpeta de logs abierta.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo abrir la carpeta de logs.",
        "error",
      );
    } finally {
      openingDirectory = false;
    }
  }

  onMount(() => {
    void refreshStatus();
  });
</script>

<div class="page-panel flex h-full flex-1 flex-col overflow-hidden">
  <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 px-8 py-7">
    <div class="flex items-start gap-4">
      <div class="rounded-2xl bg-slate-100 p-3 text-slate-700">
        <Bug size={22} />
      </div>

      <div>
        <p class="section-label">Depuración</p>
        <h1 class="mt-2 text-3xl font-semibold text-slate-900">Logs de la aplicación</h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Exporta un JSON detallado con eventos de frontend y backend para sesiones de debugging profesional.
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <Button onclick={() => void refreshStatus()} disabled={loading || exporting} class="bg-white/70">
        <RefreshCw size={16} />
        {loading ? "Actualizando..." : "Actualizar"}
      </Button>

      <Button onclick={() => void handleOpenDirectory()} disabled={openingDirectory || exporting} class="bg-white/70">
        <FolderOpen size={16} />
        {openingDirectory ? "Abriendo carpeta..." : "Abrir carpeta de logs"}
      </Button>

      <Button variant="primary" onclick={() => void handleExport()} disabled={loading || exporting}>
        <Download size={16} />
        {exporting ? "Exportando..." : "Exportar logs JSON"}
      </Button>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto px-8 py-6">
    {#if status}
      <section class="grid gap-4 lg:grid-cols-2">
        <div class="card p-5">
          <p class="section-label">Sesión activa</p>
          <div class="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <p class="font-semibold text-slate-900">ID de sesión</p>
              <p class="mt-1 font-mono text-xs text-slate-500">{status.sessionId}</p>
            </div>

            <div>
              <p class="font-semibold text-slate-900">Iniciada</p>
              <p class="mt-1">{formatTimestamp(status.sessionStartedAt)}</p>
            </div>

            <div>
              <p class="font-semibold text-slate-900">Entradas registradas</p>
              <p class="mt-1 text-2xl font-semibold text-brand-800">{status.entryCount}</p>
            </div>
          </div>
        </div>

        <div class="card p-5">
          <p class="section-label">Destino de archivos</p>
          <div class="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <p class="font-semibold text-slate-900">Carpeta de logs</p>
              <p class="mt-1 break-all font-mono text-xs text-slate-500">{status.logDirectory}</p>
            </div>

            <div>
              <p class="font-semibold text-slate-900">Archivo de sesión</p>
              <p class="mt-1 break-all font-mono text-xs text-slate-500">{status.sessionFilePath}</p>
            </div>

            <div>
              <p class="font-semibold text-slate-900">Último export</p>
              <p class="mt-1 break-all font-mono text-xs text-slate-500">
                {status.lastExportPath ?? "Todavía no hay exports generados."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div class="card p-6">
          <p class="section-label">Incluye</p>
          <div class="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div class="rounded-2xl bg-slate-50/90 p-4">
              <p class="font-semibold text-slate-900">Eventos de frontend</p>
              <p class="mt-2 leading-relaxed">
                Navegación, acciones CRUD, apertura de URLs, backups solicitados y errores no manejados.
              </p>
            </div>

            <div class="rounded-2xl bg-slate-50/90 p-4">
              <p class="font-semibold text-slate-900">Eventos de backend</p>
              <p class="mt-2 leading-relaxed">
                Carga y guardado de datos, backups, shell y exportación de logs con contexto estructurado.
              </p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <p class="section-label">Entorno</p>
          <div class="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <p class="font-semibold text-slate-900">Aplicación</p>
              <p class="mt-1">{status.appName} {status.appVersion}</p>
            </div>

            <div>
              <p class="font-semibold text-slate-900">Build</p>
              <p class="mt-1">{status.buildProfile}</p>
            </div>

            <div>
              <p class="font-semibold text-slate-900">Plataforma</p>
              <p class="mt-1">{status.platform}</p>
            </div>
          </div>
        </div>
      </section>
    {:else if loading}
      <div class="card p-8 text-sm text-slate-500">
        Cargando el estado de los logs...
      </div>
    {:else}
      <div class="card p-8 text-sm text-slate-500">
        No se pudo recuperar el estado actual de los logs.
      </div>
    {/if}
  </div>
</div>