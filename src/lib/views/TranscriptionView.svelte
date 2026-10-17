<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { open, save } from "@tauri-apps/plugin-dialog";
  import { getCurrentWebview } from "@tauri-apps/api/webview";
  import { AudioLines, CheckCircle2, Download, FileAudio, FileText, FolderOpen, LoaderCircle, Mic, Settings2, UploadCloud, X } from "lucide-svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";

  type OutputFile = { kind: string; name: string; sourcePath: string };
  type Result = {
    audioName: string;
    outputDir: string;
    preview: string;
    previewTruncated: boolean;
    files: OutputFile[];
  };

  const AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "mp4", "flac", "ogg"];
  let audioPath = $state("");
  let executablePath = $state("");
  let language = $state("auto");
  let running = $state(false);
  let exporting = $state(false);
  let dragging = $state(false);
  let result = $state<Result | null>(null);
  let errorMessage = $state("");
  let showSettings = $state(false);

  const fileName = $derived(audioPath.split(/[\\/]/).pop() ?? "");

  function isAudio(path: string): boolean {
    const extension = path.split(".").pop()?.toLowerCase();
    return Boolean(extension && AUDIO_EXTENSIONS.includes(extension));
  }

  function setAudio(path: string): void {
    if (running) return;
    if (!isAudio(path)) {
      showSnackbar("Selecciona un audio MP3, WAV, M4A, MP4, FLAC u OGG.", "error");
      return;
    }
    audioPath = path;
    result = null;
    errorMessage = "";
  }

  async function chooseAudio(): Promise<void> {
    try {
      const chosen = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Audio y video", extensions: AUDIO_EXTENSIONS }],
      });
      if (typeof chosen === "string") setAudio(chosen);
    } catch (error) {
      showSnackbar(String(error), "error");
    }
  }

  async function chooseWhisperX(): Promise<void> {
    try {
      const chosen = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Ejecutable de WhisperX", extensions: ["exe"] }],
      });
      if (typeof chosen === "string") {
        executablePath = chosen;
        localStorage.setItem("clusiv-data:whisperx-executable", chosen);
      }
    } catch (error) {
      showSnackbar(String(error), "error");
    }
  }

  async function transcribe(): Promise<void> {
    if (!audioPath || running) return;
    running = true;
    errorMessage = "";
    result = null;
    try {
      result = await invoke<Result>("transcribe_audio", {
        audioPath,
        executablePath: executablePath || null,
        language,
      });
      showSnackbar("Transcripción completada y guardada localmente.", "success");
    } catch (error) {
      errorMessage = String(error);
      showSnackbar("No se pudo completar la transcripción.", "error");
    } finally {
      running = false;
    }
  }

  async function exportFile(file: OutputFile): Promise<void> {
    if (exporting) return;
    exporting = true;
    try {
      const destination = await save({
        defaultPath: file.name,
        filters: [{ name: file.kind.toUpperCase(), extensions: [file.kind] }],
      });
      if (!destination) return;
      await invoke("export_transcription_file", {
        sourcePath: file.sourcePath,
        destinationPath: destination,
      });
      showSnackbar("Archivo guardado correctamente.", "success");
    } catch (error) {
      showSnackbar(String(error), "error");
    } finally {
      exporting = false;
    }
  }

  async function openFolder(): Promise<void> {
    try {
      await invoke("open_transcription_directory");
    } catch (error) {
      showSnackbar(String(error), "error");
    }
  }

  onMount(() => {
    executablePath = localStorage.getItem("clusiv-data:whisperx-executable") ?? "";
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") {
        dragging = true;
      } else if (event.payload.type === "leave") {
        dragging = false;
      } else if (event.payload.type === "drop") {
        dragging = false;
        const candidate = event.payload.paths.find(isAudio);
        if (candidate) setAudio(candidate);
        else showSnackbar("Arrastra un archivo de audio compatible.", "error");
      }
    });
    return () => { void unlisten.then(fn => fn()); };
  });
</script>

<div class="page-panel flex h-full flex-1 flex-col overflow-hidden">
  <header class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 px-8 py-7">
    <div>
      <p class="section-label">Herramientas locales</p>
      <h1 class="mt-2 flex items-center gap-3 text-3xl font-semibold text-slate-900">
        <Mic size={28} class="text-brand-700" /> Transcribir audio
      </h1>
      <p class="mt-2 text-sm text-slate-500">Convierte audio en texto con WhisperX instalado en tu computadora. Sin subir archivos a la nube.</p>
    </div>
    <button class="btn-ghost border border-slate-200 bg-white" onclick={() => (showSettings = !showSettings)}>
      <Settings2 size={17} /> Configuración
    </button>
  </header>

  <div class="flex-1 space-y-6 overflow-y-auto px-8 py-6">
    {#if showSettings}
      <section class="card space-y-3 p-5">
        <h2 class="font-semibold text-slate-800">Instalación local de WhisperX</h2>
        <p class="text-sm text-slate-500">Si WhisperX está disponible en el PATH de Windows, no necesitas configurar nada. De lo contrario, selecciona el archivo whisperx.exe de tu entorno Python.</p>
        <div class="flex gap-2">
          <input class="input-base min-w-0 flex-1" readonly value={executablePath} placeholder="Usar whisperx desde el PATH" aria-label="Ruta de WhisperX" />
          <button class="btn-ghost border border-slate-200 bg-white" onclick={chooseWhisperX}>Examinar</button>
          <button class="btn-ghost border border-slate-200 bg-white" onclick={() => { executablePath = ""; localStorage.removeItem("clusiv-data:whisperx-executable"); }}>Restablecer</button>
        </div>
      </section>
    {/if}

    <section class="card p-6">
      <div class="mb-5 flex items-center gap-3">
        <div class="rounded-2xl bg-emerald-50 p-3 text-brand-700"><FileAudio size={22} /></div>
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Seleccionar audio</h2>
          <p class="text-sm text-slate-500">MP3, WAV, M4A, MP4, FLAC u OGG</p>
        </div>
      </div>

      <button
        class={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${dragging ? "border-brand-600 bg-emerald-50" : "border-brand-200 bg-white/55 hover:border-brand-500 hover:bg-emerald-50/50"}`}
        onclick={chooseAudio}
        disabled={running}
        aria-label="Seleccionar archivo de audio"
      >
        <div class="mb-4 rounded-full bg-emerald-50 p-4 text-brand-700"><UploadCloud size={32} /></div>
        <p class="text-base font-semibold text-slate-800">Arrastra aquí tu archivo de audio</p>
        <p class="mt-2 text-sm text-slate-500">o haz clic para seleccionar un archivo de tu computadora</p>
        <span class="btn-primary mt-5">Seleccionar archivo</span>
      </button>

      {#if audioPath}
        <div class="mt-4 flex min-w-0 items-center gap-3 rounded-xl border border-brand-100 bg-emerald-50/60 px-4 py-3">
          <AudioLines size={20} class="shrink-0 text-brand-700" />
          <span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-800" title={audioPath}>{fileName}</span>
          {#if !running}
            <button class="text-slate-500 hover:text-slate-900" title="Quitar audio" onclick={() => { audioPath = ""; result = null; }}><X size={18} /></button>
          {/if}
        </div>
      {/if}

      <div class="mt-5 flex flex-wrap items-end justify-between gap-4">
        <label class="block text-sm font-medium text-slate-700">
          Idioma del audio
          <select class="input-base mt-2" bind:value={language} disabled={running}>
            <option value="auto">Detectar automáticamente</option>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>
        </label>
        <button class="btn-primary" disabled={!audioPath || running} onclick={transcribe}>
          {#if running}<LoaderCircle size={17} class="animate-spin" /> Transcribiendo...{:else}<Mic size={17} /> Iniciar transcripción{/if}
        </button>
      </div>
      {#if running}
        <div class="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-brand-800" role="status">
          WhisperX está procesando el audio en tu computadora. Los archivos se guardarán al finalizar. Los audios largos pueden tardar varios minutos.
        </div>
      {/if}
      {#if errorMessage}
        <div class="mt-4 whitespace-pre-wrap break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{errorMessage}</div>
      {/if}
    </section>

    {#if result}
      <section class="card p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <CheckCircle2 size={24} class="text-emerald-600" />
            <div>
              <h2 class="text-lg font-semibold text-slate-900">Transcripción completada</h2>
              <p class="text-sm text-slate-500">{result.audioName}</p>
            </div>
          </div>
          <button class="btn-ghost bg-white" onclick={openFolder}><FolderOpen size={17} /> Abrir resultados</button>
        </div>
        <div class="mt-5 flex flex-wrap gap-2">
          {#each result.files as file}
            <button class="btn-ghost border border-slate-200 bg-white" disabled={exporting} onclick={() => exportFile(file)}>
              <Download size={16} /> Descargar {file.kind.toUpperCase()}
            </button>
          {/each}
        </div>
        <div class="mt-6">
          <h3 class="mb-3 flex items-center gap-2 font-semibold text-slate-800"><FileText size={17} /> Vista previa</h3>
          <div class="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 select-text">{result.preview || "El archivo TXT no contiene texto para mostrar."}</div>
          {#if result.previewTruncated}<p class="mt-2 text-xs text-slate-500">Vista previa limitada. Descarga TXT para consultar toda la transcripción.</p>{/if}
        </div>
      </section>
    {/if}
  </div>
</div>
