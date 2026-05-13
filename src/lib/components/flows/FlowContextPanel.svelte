<script lang="ts">
  import { Link, Plus, Trash2 } from "lucide-svelte";

  import type { AppData } from "$lib/store/types";
  import { getLinkedNotesByIds, getNoteOptions } from "$lib/utils/noteUtils";

  interface Props {
    appData: AppData | null;
    linkedNoteIds: string[];
    comments: string;
    onlinknote: (noteId: string) => void;
    onunlinknote: (noteId: string) => void;
    oncommentschange: (value: string) => void;
  }

  let {
    appData,
    linkedNoteIds,
    comments,
    onlinknote,
    onunlinknote,
    oncommentschange,
  }: Props = $props();

  let linkingNotes = $state(false);
  let noteSearch = $state("");

  const linkedNoteIdSet = $derived(new Set(linkedNoteIds ?? []));
  const noteOptions = $derived(appData ? getNoteOptions(appData) : []);
  const linkedNotes = $derived(appData ? getLinkedNotesByIds(appData, linkedNoteIds ?? []) : []);
  const availableNotes = $derived(
    noteOptions.filter((note) => !linkedNoteIdSet.has(note.id)),
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

  function handleLinkNote(noteId: string): void {
    onlinknote(noteId);
    noteSearch = "";
    linkingNotes = false;
  }
</script>

<section class="grid grid-cols-1 gap-4 xl:grid-cols-2">
  <div class="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm lg:p-6">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="section-label">Notas del flujo</p>
        <p class="mt-2 text-xs text-slate-500">
          Adjunta notas ya creadas relacionadas con este flujo completo.
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
                <p class="mt-1 line-clamp-2 text-xs text-slate-500">
                  {note.preview || "Sin vista previa"}
                </p>
                <p class="mt-2 text-[11px] font-medium text-slate-400">
                  {note.categoryPath || "Sin categoria"}
                </p>
              </button>
            {/each}
          {/if}
        </div>
      </div>
    {/if}

    <div class="mt-5">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                onclick={() => onunlinknote(note.id)}
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

  <div class="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm lg:p-6">
    <div>
      <p class="section-label">Comentarios del flujo</p>
      <p class="mt-2 text-xs text-slate-500">
        Apuntes generales para este flujo.
      </p>
    </div>

    <textarea
      class="input-base mt-3 min-h-[220px] resize-y text-sm leading-6"
      placeholder="Anade comentarios generales sobre este flujo..."
      spellcheck={false}
      oninput={(event) =>
        oncommentschange((event.currentTarget as HTMLTextAreaElement).value)}
    >{comments ?? ""}</textarea>
  </div>
</section>
