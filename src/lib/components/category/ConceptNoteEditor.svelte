<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { save } from "@tauri-apps/plugin-dialog";
  import { ExternalLink, FileImage, FilePlus2, FileText, ImagePlus, Link2, LoaderCircle, Plus, Trash2, X } from "lucide-svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { Item, ItemImage, NoteLink, NoteDocument } from "$lib/store/types";
  import type { ConceptNoteInput } from "$lib/store/appState.svelte";

  interface Props {
    open: boolean;
    note: Item | null;
    conceptTitle: string;
    onclose: () => void;
    onsave: (input: ConceptNoteInput) => Promise<void>;
  }
  let { open, note, conceptTitle, onclose, onsave }: Props = $props();
  let title = $state("");
  let body = $state("");
  let links = $state<NoteLink[]>([]);
  let documents = $state<NoteDocument[]>([]);
  let images = $state<ItemImage[]>([]);
  let linkTitle = $state("");
  let linkUrl = $state("");
  let saving = $state(false);
  let uploading = $state(false);
  let docInput = $state<HTMLInputElement | null>(null);
  let imageInput = $state<HTMLInputElement | null>(null);
  let previousKey = "";

  $effect(() => {
    const key = open ? (note?.id ?? "new") + ":" + conceptTitle : "";
    if (!open) {
      previousKey = "";
    } else if (key !== previousKey) {
      previousKey = key;
      title = note?.title ?? "";
      body = note?.comment ?? "";
      links = [...(note?.links ?? [])];
      documents = [...(note?.documents ?? [])];
      images = [...(note?.images ?? [])];
      linkTitle = "";
      linkUrl = "";
    }
  });

  function addLink(): void {
    const value = linkUrl.trim();
    let parsed: URL;
    try {
      parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) throw Error("Protocol");
    } catch {
      showSnackbar("Introduce un enlace válido que empiece por https:// o http://.", "error");
      return;
    }
    links = [...links, {
      id: crypto.randomUUID(),
      title: linkTitle.trim() || parsed.hostname,
      url: value,
    }];
    linkUrl = "";
    linkTitle = "";
  }

  function toDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string"
        ? resolve(reader.result) : reject(Error("Archivo inválido."));
      reader.onerror = () => reject(reader.error ?? Error("No se pudo leer el archivo."));
      reader.readAsDataURL(file);
    });
  }

  async function attachFiles(event: Event, type: "image" | "document"): Promise<void> {
    const target = event.currentTarget as HTMLInputElement;
    const incoming = Array.from(target.files ?? []);
    target.value = "";
    if (!incoming.length || uploading) return;
    const maxBytes = 8 * 1024 * 1024;
    const storedBytes = [...images.map((file) => file.data_url), ...documents.map((file) => file.data_url)]
      .reduce((total, file) => total + file.length * .75, 0);
    if (incoming.some((file) => file.size > maxBytes) ||
      storedBytes + incoming.reduce((sum, file) => sum + file.size, 0) > 24 * 1024 * 1024) {
      showSnackbar("Máximo 8 MB por archivo y 24 MB por nota, para proteger el tamaño del respaldo.", "error");
      return;
    }
    if (type === "image" && incoming.some((file) => !file.type.startsWith("image/"))) {
      showSnackbar("Solo se pueden adjuntar imágenes en esta sección.", "error");
      return;
    }
    uploading = true;
    try {
      for (const file of incoming) {
        const rawUrl = await toDataUrl(file);
        // Browser file types may be empty for .md or .csv on Windows.
        const data_url = rawUrl.startsWith("data:;base64,")
          ? rawUrl.replace("data:;base64,", "data:application/octet-stream;base64,")
          : rawUrl;
        if (type === "image") {
          images = [...images, { id: crypto.randomUUID(), name: file.name || "Imagen", data_url }];
        } else {
          documents = [...documents, {
            id: crypto.randomUUID(), name: file.name || "Documento",
            mime_type: file.type || "application/octet-stream", data_url,
          }];
        }
      }
      showSnackbar("Adjuntos añadidos a la nota. Guarda para conservarlos.", "success");
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : "No se pudo adjuntar el archivo.", "error");
    } finally { uploading = false; }
  }

  async function openLink(url: string): Promise<void> {
    try { await invoke("open_url", { url }); }
    catch (error) { showSnackbar(String(error), "error"); }
  }

  async function exportFile(file: { name: string; data_url: string }): Promise<void> {
    try {
      const extension = file.name.split(".").pop() ?? "bin";
      const destination = await save({
        defaultPath: file.name,
        filters: [{ name: "Archivo adjunto", extensions: [extension] }],
      });
      if (!destination) return;
      const bytes = Array.from(new Uint8Array(await (await fetch(file.data_url)).arrayBuffer()));
      await invoke("export_note_attachment", { destinationPath: destination, bytes });
      showSnackbar("Adjunto exportado.", "success");
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : "No se pudo exportar.", "error");
    }
  }

  async function submit(): Promise<void> {
    if (saving || uploading || !(title.trim() || body.trim())) return;
    saving = true;
    try {
      await onsave({ title, comment: body, links, documents, images });
      onclose();
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : "No se pudo guardar la nota.", "error");
    } finally { saving = false; }
  }
</script>

<Modal {open} title={note ? "Editar nota" : "Nueva nota"} {onclose} widthClass="max-w-5xl">
  <div class="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(270px,.85fr)]">
    <section class="space-y-4">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
        <FileText size={15}/> {conceptTitle}
      </div>
      <label class="block text-sm font-semibold text-slate-700">
        Título
        <input class="input-base mt-2 w-full" bind:value={title} maxlength="180" placeholder="Ej. Fuentes y calidad de los datos"/>
      </label>
      <label class="block text-sm font-semibold text-slate-700">
        Contenido
        <textarea class="input-base mt-2 min-h-[280px] w-full resize-y text-[15px] leading-7" bind:value={body}
          placeholder="Escribe tus hallazgos, preguntas o conclusiones de investigación..."></textarea>
      </label>
      <p class="text-xs text-slate-400">Las notas siguen estando disponibles en la sección general y conservan sus relaciones.</p>
    </section>

    <section class="space-y-5">
      <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
        <h3 class="mb-3 flex items-center gap-2 font-semibold text-slate-800"><Link2 size={18} class="text-brand-700"/> Enlaces <span class="text-xs font-normal text-slate-500">({links.length})</span></h3>
        <div class="space-y-2">
          <input class="input-base w-full" bind:value={linkTitle} placeholder="Título (opcional)" aria-label="Título del enlace"/>
          <input class="input-base w-full" bind:value={linkUrl} placeholder="https://..." aria-label="URL del enlace" inputmode="url"/>
          <button class="btn-ghost w-full border border-brand-200 bg-white text-brand-700" onclick={addLink}><Plus size={16}/> Añadir enlace</button>
        </div>
        <div class="mt-3 space-y-2">
          {#each links as link (link.id)}
            <div class="flex items-center gap-2 rounded-xl bg-white p-2 text-xs">
              <button class="min-w-0 flex-1 truncate text-left font-medium text-brand-700 hover:underline" title={link.url} onclick={() => void openLink(link.url)}>{link.title || link.url} <ExternalLink size={12} class="inline"/></button>
              <button class="rounded-md p-1 text-slate-400 hover:text-rose-600" aria-label={"Quitar enlace " + link.title} onclick={() => links = links.filter((item) => item.id !== link.id)}><X size={15}/></button>
            </div>
          {/each}
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
        <h3 class="mb-3 flex items-center gap-2 font-semibold text-slate-800"><FileText size={18} class="text-brand-700"/> Documentos <span class="text-xs font-normal text-slate-500">({documents.length})</span></h3>
        <input bind:this={docInput} type="file" class="hidden" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.zip" onchange={(event) => void attachFiles(event, "document")}/>
        <button class="btn-ghost w-full border border-brand-200 bg-white text-brand-700" disabled={uploading} onclick={() => docInput?.click()}><FilePlus2 size={16}/> Adjuntar documento</button>
        <div class="mt-3 space-y-2">
          {#each documents as document (document.id)}
            <div class="flex items-center gap-2 rounded-xl bg-white p-2 text-xs">
              <FileText size={16} class="shrink-0 text-brand-700"/>
              <button class="min-w-0 flex-1 truncate text-left hover:underline" title={document.name} onclick={() => void exportFile(document)}>{document.name}</button>
              <button class="rounded-md p-1 text-slate-400 hover:text-rose-600" aria-label={"Quitar documento " + document.name} onclick={() => documents = documents.filter((item) => item.id !== document.id)}><Trash2 size={14}/></button>
            </div>
          {/each}
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
        <h3 class="mb-3 flex items-center gap-2 font-semibold text-slate-800"><FileImage size={18} class="text-brand-700"/> Imágenes <span class="text-xs font-normal text-slate-500">({images.length})</span></h3>
        <input bind:this={imageInput} type="file" class="hidden" multiple accept="image/*" onchange={(event) => void attachFiles(event, "image")}/>
        <button class="btn-ghost w-full border border-brand-200 bg-white text-brand-700" disabled={uploading} onclick={() => imageInput?.click()}><ImagePlus size={16}/> Adjuntar imagen</button>
        <div class="mt-3 grid grid-cols-3 gap-2">
          {#each images as image (image.id)}
            <div class="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
              <button title={"Exportar " + image.name} onclick={() => void exportFile(image)} class="block h-24 w-full">
                <img src={image.data_url} alt={image.name} class="h-full w-full object-cover"/>
              </button>
              <button class="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-slate-500 hover:text-rose-600" aria-label={"Quitar " + image.name} onclick={() => images = images.filter((item) => item.id !== image.id)}><X size={13}/></button>
            </div>
          {/each}
        </div>
      </div>
    </section>
  </div>
  <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
    <button class="btn-ghost border border-slate-200" disabled={saving} onclick={onclose}>Cancelar</button>
    <button class="btn-primary" disabled={saving || uploading || !(title.trim() || body.trim())} onclick={() => void submit()}>
      {#if saving}<LoaderCircle size={16} class="animate-spin"/>{/if} Guardar nota
    </button>
  </div>
</Modal>
