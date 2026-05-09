<script lang="ts">
  import { ArrowLeft, Link, Plus, Trash2 } from "lucide-svelte";

  import type { AppData } from "$lib/store/types";
  import {
    getCategory,
    getCategoryBreadcrumb,
    getChildCategories,
    getDescendantIds,
  } from "$lib/utils/categoryUtils";
  import { getLinkedNotesByIds, getNoteOptions } from "$lib/utils/noteUtils";

  interface Props {
    appData: AppData;
    linkedNoteIds: string[];
    onlinknote: (noteId: string) => void | Promise<void>;
    onunlinknote: (noteId: string) => void | Promise<void>;
  }

  let { appData, linkedNoteIds, onlinknote, onunlinknote }: Props = $props();

  let linkingNotes = $state(false);
  let noteSearch = $state("");
  let selectedCategoryId = $state<string | null>(null);
  let categoryCursorId = $state<string | null>(null);
  let includeDescendants = $state(true);

  const linkedNoteIdSet = $derived(new Set(linkedNoteIds));
  const noteOptions = $derived(getNoteOptions(appData));
  const noteOptionById = $derived(new Map(noteOptions.map((note) => [note.id, note])));
  const linkedNotes = $derived(getLinkedNotesByIds(appData, linkedNoteIds));
  const availableNotes = $derived(
    noteOptions.filter((note) => !linkedNoteIdSet.has(note.id)),
  );
  const cursorCategory = $derived(
    categoryCursorId ? getCategory(appData, categoryCursorId) : null,
  );
  const cursorCategoryChildren = $derived(getChildCategories(appData, categoryCursorId));
  const cursorCategoryLabel = $derived(
    cursorCategory ? getCategoryBreadcrumb(appData, cursorCategory.id) : "Todas las categorias",
  );
  const selectedCategoryLabel = $derived(
    selectedCategoryId ? getCategoryBreadcrumb(appData, selectedCategoryId) : "Todas las categorias",
  );

  function getAllowedCategoryIds(): Set<string> | null {
    if (!selectedCategoryId) {
      return null;
    }

    const ids = new Set([selectedCategoryId]);

    if (includeDescendants) {
      for (const descendantId of getDescendantIds(appData, selectedCategoryId)) {
        ids.add(descendantId);
      }
    }

    return ids;
  }

  const filteredAvailableNotes = $derived.by(() => {
    const query = noteSearch.trim().toLowerCase();
    const allowedCategoryIds = getAllowedCategoryIds();

    return availableNotes.filter((note) => {
      const matchesCategory =
        !allowedCategoryIds || allowedCategoryIds.has(note.categoryId);

      const matchesSearch =
        !query
        || note.title.toLowerCase().includes(query)
        || note.preview.toLowerCase().includes(query)
        || note.categoryPath.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  });

  async function handleLinkNote(noteId: string): Promise<void> {
    await onlinknote(noteId);
    noteSearch = "";
    linkingNotes = false;
  }

  async function handleUnlinkNote(noteId: string): Promise<void> {
    await onunlinknote(noteId);
  }

  function clearCategoryFilter(): void {
    selectedCategoryId = null;
    categoryCursorId = null;
  }

  function applyCursorCategoryFilter(): void {
    selectedCategoryId = categoryCursorId;
  }

  function goToParentCategory(): void {
    categoryCursorId = cursorCategory?.parent_id ?? null;
  }
</script>

<section class="mt-6 rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p class="section-label">Notas enlazadas</p>
      <h2 class="mt-2 text-xl font-semibold text-slate-900">
        Notas vinculadas a la vista global de flujos
      </h2>
      <p class="mt-2 text-sm text-slate-500">
        Adjunta notas creadas previamente para tenerlas visibles junto a todos los flujos.
      </p>
      <p class="mt-2 text-xs font-medium text-slate-400">
        Filtro activo: {selectedCategoryLabel}
      </p>
    </div>

    <button class="btn-primary" type="button" onclick={() => (linkingNotes = !linkingNotes)}>
      <Link size={15} />
      Enlazar nota
    </button>
  </div>

  {#if linkingNotes}
    <div class="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div>
          <label class="section-label" for="global-flow-linked-note-search">Buscar nota</label>
          <input
            id="global-flow-linked-note-search"
            class="input-base mt-2"
            placeholder="Titulo, contenido o categoria"
            bind:value={noteSearch}
            spellcheck={false}
          />

          <div class="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div class="flex flex-wrap items-center gap-2">
              <button
                class={`btn-ghost border ${!selectedCategoryId ? "border-brand-200 bg-brand-50 text-brand-800" : "border-slate-200 bg-white"}`}
                type="button"
                onclick={clearCategoryFilter}
              >
                Todas las categorias
              </button>

              <button
                class={`btn-ghost border ${selectedCategoryId === categoryCursorId && selectedCategoryId !== null ? "border-brand-200 bg-brand-50 text-brand-800" : "border-slate-200 bg-white"}`}
                type="button"
                disabled={!categoryCursorId}
                onclick={applyCursorCategoryFilter}
              >
                Usar esta categoria
              </button>
            </div>

            <div class="mt-4">
              <p class="section-label">Ruta actual</p>
              <p class="mt-2 text-sm text-slate-600">{cursorCategoryLabel}</p>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <button
                class="btn-ghost border border-slate-200 bg-white"
                type="button"
                disabled={!cursorCategory}
                onclick={goToParentCategory}
              >
                <ArrowLeft size={15} />
                Volver
              </button>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              {#if cursorCategoryChildren.length === 0}
                <p class="text-sm text-slate-500">
                  No hay subcategorias dentro de esta ruta.
                </p>
              {:else}
                {#each cursorCategoryChildren as category (category.id)}
                  <button
                    class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800"
                    type="button"
                    onclick={() => (categoryCursorId = category.id)}
                  >
                    {category.name}
                  </button>
                {/each}
              {/if}
            </div>

            <label class="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                bind:checked={includeDescendants}
                class="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-200"
              />
              <span>Incluir subcategorias</span>
            </label>
          </div>
        </div>

        <div>
          <p class="section-label">Notas disponibles</p>

          <div class="mt-2 max-h-[22rem] space-y-2 overflow-y-auto pr-1">
            {#if noteOptions.length === 0}
              <div class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                Aun no tienes notas creadas. Crea una nota primero desde una categoria y luego vuelve para enlazarla.
              </div>
            {:else if availableNotes.length === 0}
              <div class="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                Todas las notas disponibles ya estan enlazadas en esta seccion.
              </div>
            {:else if filteredAvailableNotes.length === 0}
              <div class="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                No hay notas disponibles con ese filtro. Prueba con otra categoria o limpia la busqueda.
              </div>
            {:else}
              {#each filteredAvailableNotes as note (note.id)}
                <button
                  type="button"
                  class="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
                  onclick={() => void handleLinkNote(note.id)}
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
      </div>
    </div>
  {/if}

  {#if linkedNotes.length === 0}
    <div class="mt-5 rounded-[1.25rem] border border-dashed border-slate-200 bg-white/70 px-5 py-8 text-center">
      <p class="text-sm font-semibold text-slate-700">No hay notas enlazadas todavia.</p>
      <p class="mt-2 text-sm text-slate-500">
        Enlaza notas creadas previamente para verlas aqui.
      </p>
      <button class="btn-primary mt-4" type="button" onclick={() => (linkingNotes = true)}>
        <Plus size={16} />
        Enlazar nota
      </button>
    </div>
  {:else}
    <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each linkedNotes as note (note.id)}
        {@const noteMeta = noteOptionById.get(note.id)}
        <article class="min-h-36 rounded-[1.1rem] border border-amber-200 bg-amber-50/40 p-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="line-clamp-2 text-sm font-semibold text-slate-800">
                {noteMeta?.title || note.title.trim() || "Sin titulo"}
              </p>
              <p class="mt-1 text-[11px] font-medium text-slate-400">
                {noteMeta?.categoryPath || "Sin categoria"}
              </p>
            </div>

            <button
              class="btn-ghost h-8 w-8 rounded-full p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
              type="button"
              aria-label="Quitar nota enlazada"
              onclick={() => void handleUnlinkNote(note.id)}
            >
              <Trash2 size={14} />
            </button>
          </div>

          <p class="mt-3 line-clamp-4 text-xs leading-5 text-slate-600">
            {noteMeta?.preview || "Sin contenido"}
          </p>
        </article>
      {/each}
    </div>
  {/if}
</section>
