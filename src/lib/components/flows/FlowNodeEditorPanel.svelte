<script lang="ts">
  import { Copy, GitBranchPlus, Link, Plus, Trash2 } from "lucide-svelte";

  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { AppData, FlowNode } from "$lib/store/types";
  import type { FlowBranchDirection } from "$lib/utils/flowGraphUtils";
  import { getNoteOptions, getLinkedNotesForNode } from "$lib/utils/noteUtils";

  interface Props {
    node: FlowNode;
    appData: AppData | null;
    canCreateTwoPaths?: boolean;
    canInsertAfter?: boolean;
    outgoingCount?: number;
    onupdate: (field: "title" | "description" | "comments", value: string) => void;
    ondelete?: (nodeId: string) => void;
    oncreatetwopaths?: (nodeId: string) => void;
    oninsertbefore?: (nodeId: string) => void;
    oninsertafter?: (nodeId: string) => void;
    onaddtobranch?: (nodeId: string, direction: FlowBranchDirection) => void;
    onlinknote?: (noteId: string) => void;
    onunlinknote?: (noteId: string) => void;
    onclose: () => void;
  }

  let {
    node,
    appData,
    canCreateTwoPaths = false,
    canInsertAfter = true,
    outgoingCount = 0,
    onupdate,
    ondelete,
    oncreatetwopaths,
    oninsertbefore,
    oninsertafter,
    onaddtobranch,
    onlinknote,
    onunlinknote,
    onclose,
  }: Props = $props();

  let linkingNotes = $state(false);
  let noteSearch = $state("");

  const linkedNoteIds = $derived(new Set(node.linked_note_ids ?? []));
  const noteOptions = $derived(appData ? getNoteOptions(appData) : []);
  const linkedNotes = $derived(appData ? getLinkedNotesForNode(appData, node) : []);
  const availableNotes = $derived(
    noteOptions.filter((note) => !linkedNoteIds.has(note.id)),
  );
  const filteredAvailableNotes = $derived(
    availableNotes.filter((note) => {
      const query = noteSearch.trim().toLowerCase();
      if (!query) {
        return true;
      }

      return note.title.toLowerCase().includes(query)
        || note.preview.toLowerCase().includes(query)
        || note.categoryPath.toLowerCase().includes(query);
    }),
  );

  const createTwoPathsTitle = $derived(
    node.type === "output"
      ? "Los nodos de salida no pueden abrir caminos nuevos."
      : outgoingCount > 0
        ? "Este nodo ya tiene una salida. Elimina la salida existente para abrir dos caminos."
        : "Abrir dos caminos desde este nodo."
  );

  const insertAfterTitle = $derived(
    canInsertAfter
      ? "Insertar un nodo despues de este nodo."
      : "Este nodo tiene varias salidas. Usa el boton + de la conexion especifica."
  );

  function handleLinkNote(noteId: string): void {
    onlinknote?.(noteId);
    noteSearch = "";
    linkingNotes = false;
  }

  async function handleCopyDescription(): Promise<void> {
    const description = node.description ?? "";

    if (!description.trim()) {
      showSnackbar("No hay descripcion para copiar.", "error", 1800);
      return;
    }

    try {
      await navigator.clipboard.writeText(description);
      showSnackbar("Descripcion copiada al portapapeles.", "success", 1800);
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo copiar la descripcion.",
        "error",
      );
    }
  }
</script>

<section class="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
  <div class="flex min-h-0 flex-col rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm lg:p-6">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="section-label">Nodo seleccionado</p>
        <h2 class="mt-2 text-2xl font-semibold text-slate-900">Editar nodo</h2>
      </div>
    </div>

    <div class="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,420px)_minmax(0,1fr)]">
      <div class="flex max-w-[420px] flex-col gap-1.5">
        <label class="section-label" for="flow-node-title">Titulo</label>
        <input
          id="flow-node-title"
          class="input-base"
          value={node.title}
          placeholder="Ej. Validar informacion"
          spellcheck={false}
          oninput={(event) => onupdate("title", (event.currentTarget as HTMLInputElement).value)}
        />
      </div>

      <div class="flex min-w-0 flex-col gap-1.5">
        <span class="section-label">Acciones del flujo</span>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            class="btn-ghost justify-center bg-white"
            type="button"
            disabled={!oninsertbefore}
            onclick={() => oninsertbefore?.(node.id)}
            title="Insertar un nodo antes de este nodo."
          >
            <Plus size={16} />
            Insertar antes
          </button>

          <button
            class="btn-ghost justify-center bg-white"
            type="button"
            disabled={!canInsertAfter || !oninsertafter}
            onclick={() => oninsertafter?.(node.id)}
            title={insertAfterTitle}
          >
            <Plus size={16} />
            Insertar despues
          </button>

          <button
            class="btn-ghost justify-center bg-white"
            type="button"
            disabled={!canCreateTwoPaths || !oncreatetwopaths}
            onclick={() => oncreatetwopaths?.(node.id)}
            title={createTwoPathsTitle}
          >
            <GitBranchPlus size={16} />
            Abrir caminos
          </button>
        </div>
      </div>
    </div>

    {#if outgoingCount >= 2 && onaddtobranch}
      <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          class="btn-ghost justify-center bg-white"
          type="button"
          onclick={() => onaddtobranch?.(node.id, "upper")}
        >
          <Plus size={16} />
          Agregar arriba
        </button>

        <button
          class="btn-ghost justify-center bg-white"
          type="button"
          onclick={() => onaddtobranch?.(node.id, "lower")}
        >
          <Plus size={16} />
          Agregar abajo
        </button>
      </div>
    {/if}

    {#if outgoingCount > 0}
      <p class="mt-3 text-xs text-slate-400">
        Este nodo ya tiene {outgoingCount} salida{outgoingCount === 1 ? "" : "s"}.
      </p>
    {/if}

    <div class="mt-5 flex min-h-0 flex-1 flex-col gap-1.5">
      <div class="flex items-center justify-between gap-2">
        <label class="section-label" for="flow-node-description">Descripcion</label>
        <button
          class="btn-ghost h-8 w-8 justify-center rounded-full p-0"
          type="button"
          title="Copiar descripcion"
          aria-label="Copiar descripcion"
          disabled={!node.description.trim()}
          onclick={() => void handleCopyDescription()}
        >
          <Copy size={15} />
        </button>
      </div>
      <textarea
        id="flow-node-description"
        class="input-base min-h-[320px] flex-1 resize-none leading-7 xl:min-h-[420px]"
        placeholder="Describe con detalle que ocurre en este nodo"
        spellcheck={false}
        oninput={(event) =>
          onupdate("description", (event.currentTarget as HTMLTextAreaElement).value)}
      >{node.description}</textarea>
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
      {#if ondelete}
        <button
          class="btn-ghost text-red-700 hover:bg-red-50"
          type="button"
          onclick={() => ondelete?.(node.id)}
        >
          <Trash2 size={16} />
          Quitar nodo
        </button>
      {/if}

      <button class="btn-primary ml-auto" type="button" onclick={onclose}>
        Listo
      </button>
    </div>
  </div>

  <aside class="flex min-h-0 flex-col rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm lg:p-6">
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="section-label">Notas del nodo</p>
          <p class="mt-2 text-xs text-slate-500">
            Adjunta notas ya creadas relacionadas con este nodo.
          </p>
        </div>

        <button class="btn-primary" type="button" onclick={() => (linkingNotes = !linkingNotes)}>
          <Link size={15} />
          Enlazar nota
        </button>
      </div>

      {#if linkingNotes}
        <div class="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-3">
          <input
            class="input-base"
            placeholder="Buscar nota por titulo, texto o categoria..."
            bind:value={noteSearch}
            spellcheck={false}
          />

          <div class="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
            {#if filteredAvailableNotes.length === 0}
              <div class="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                No hay notas disponibles con ese filtro.
              </div>
            {:else}
              {#each filteredAvailableNotes as note}
                <button
                  type="button"
                  class="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-emerald-300 hover:bg-emerald-50/40"
                  onclick={() => handleLinkNote(note.id)}
                >
                  <p class="text-sm font-semibold text-slate-800">{note.title}</p>
                  <p class="mt-1 line-clamp-2 text-xs text-slate-500">{note.preview || "Sin vista previa"}</p>
                  <p class="mt-2 text-[11px] font-medium text-slate-400">
                    {note.categoryPath || "Sin categoria"}
                  </p>
                </button>
              {/each}
            {/if}
          </div>
        </div>
      {/if}

      <div class="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
          {#each linkedNotes as note}
            <article class="min-h-40 rounded-[1.1rem] border border-amber-200 bg-amber-50/40 p-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="line-clamp-2 text-sm font-semibold text-slate-800">
                    {note.title.trim() || "Sin titulo"}
                  </p>
                  <p class="mt-1 text-[11px] font-medium text-slate-400">
                    {noteOptions.find((option) => option.id === note.id)?.categoryPath || "Sin categoria"}
                  </p>
                </div>

                <button
                  class="text-red-500 hover:text-red-700"
                  type="button"
                  aria-label="Quitar nota enlazada"
                  onclick={() => onunlinknote?.(note.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <p class="mt-3 line-clamp-6 text-xs leading-5 text-slate-600">
                {noteOptions.find((option) => option.id === note.id)?.preview || "Sin contenido"}
              </p>
            </article>
          {/each}

          <button
            type="button"
            class="flex min-h-40 flex-col items-center justify-center rounded-[1.1rem] border border-dashed border-slate-300 bg-white/70 text-slate-400 hover:border-emerald-300 hover:text-emerald-700"
            onclick={() => (linkingNotes = true)}
          >
            <Plus size={24} />
            <span class="mt-2 text-xs font-medium">Enlazar nota</span>
          </button>
        </div>
      </div>
    </div>

    <div class="mt-5 border-t border-slate-200 pt-4">
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="section-label">Comentarios del nodo</p>
          <p class="mt-1 text-xs text-slate-400">
            Apuntes rapidos para este nodo.
          </p>
        </div>
      </div>

      <textarea
        class="input-base mt-3 min-h-[120px] resize-none text-sm leading-6"
        placeholder="Anade comentarios breves sobre este nodo..."
        spellcheck={false}
        oninput={(event) =>
          onupdate("comments", (event.currentTarget as HTMLTextAreaElement).value)}
      >{node.comments ?? ""}</textarea>
    </div>
  </aside>
</section>
