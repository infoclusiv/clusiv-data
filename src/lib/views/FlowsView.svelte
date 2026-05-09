<script lang="ts">
  import { Filter, GitBranch, Search, SlidersHorizontal } from "lucide-svelte";

  import FlowCard from "$lib/components/flows/FlowCard.svelte";
  import GlobalFlowLinkedNotes from "$lib/components/flows/GlobalFlowLinkedNotes.svelte";
  import {
    appState,
    getItemIndex,
    linkNoteToGlobalFlows,
    openFlowEditor,
    openItemEditor,
    unlinkNoteFromGlobalFlows,
  } from "$lib/store/appState.svelte";
  import type { Flow } from "$lib/store/types";
  import { GENERAL_CATEGORY_NAME } from "$lib/utils/constants";
  import { getCategory, getCategoryBreadcrumb, getFlows } from "$lib/utils/categoryUtils";
  import { getNoteById } from "$lib/utils/noteUtils";

  let search = $state("");

  function getFlowCategoryLabel(flow: Flow): string {
    if (!appState.appData) {
      return GENERAL_CATEGORY_NAME;
    }

    const category = getCategory(appState.appData, flow.category_id);

    if (!category) {
      return GENERAL_CATEGORY_NAME;
    }

    return getCategoryBreadcrumb(appState.appData, category.id);
  }

  const flows = $derived.by(() => {
    if (!appState.appData) {
      return [] as Flow[];
    }

    return [...getFlows(appState.appData)].sort((left, right) =>
      right.updated_at.localeCompare(left.updated_at),
    );
  });

  const filteredFlows = $derived.by(() => {
    const query = search.trim().toLowerCase();

    if (query.length === 0) {
      return flows;
    }

    return flows.filter((flow) => {
      const title = flow.title.toLowerCase();
      const categoryLabel = getFlowCategoryLabel(flow).toLowerCase();

      return title.includes(query) || categoryLabel.includes(query);
    });
  });

  const globalFlowLinkedNoteIds = $derived(
    appState.appData?.__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__ ?? [],
  );

  function openLinkedNote(noteId: string): void {
    if (!appState.appData) {
      return;
    }

    const note = getNoteById(appState.appData, noteId);

    if (!note) {
      return;
    }

    openItemEditor({
      editingItem: note,
      editingIndex: getItemIndex(note),
    });
  }
</script>

{#if appState.appData}
  <div class="page-panel relative flex h-full flex-1 flex-col overflow-hidden">
    <div class="flex items-start justify-between gap-4 border-b border-slate-200/70 px-8 py-7">
      <div>
        <p class="section-label">Global</p>
        <h1 class="mt-2 flex items-center gap-2 text-3xl font-semibold text-slate-900">
          <GitBranch size={28} class="text-brand-700" />
          Flujos
        </h1>
        <p class="mt-2 text-sm text-slate-500">
          Visualiza todos los flujos guardados en todas las categorias.
        </p>
      </div>

      <div class="rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
        {flows.length === 1 ? "1 flujo guardado" : `${flows.length} flujos guardados`}
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-8 py-6">
      <div class="card mb-6 p-4">
        <div class="max-w-xl">
          <div class="flex flex-col gap-1.5">
            <label class="section-label" for="global-flow-search">Buscar</label>

            <div class="relative">
              <Search
                size={16}
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="global-flow-search"
                bind:value={search}
                placeholder="Titulo del flujo o categoria"
                spellcheck={false}
                class="input-base pl-9"
              />
            </div>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          <Filter size={13} />
          <span>
            {filteredFlows.length} flujo{filteredFlows.length === 1 ? "" : "s"} visible{filteredFlows.length === 1 ? "" : "s"}
          </span>
          <SlidersHorizontal size={13} class="ml-2" />
          <span>{flows.length} total</span>
        </div>
      </div>

      {#if flows.length === 0}
        <div class="card border-dashed p-10 text-center text-sm text-slate-500">
          Aun no hay flujos guardados. Crea un flujo desde la pestana Flujos dentro de una categoria.
        </div>
      {:else if filteredFlows.length === 0}
        <div class="card border-dashed p-10 text-center text-sm text-slate-500">
          No hay flujos que coincidan con la busqueda actual.
        </div>
      {:else}
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {#each filteredFlows as flow (flow.id)}
            <FlowCard
              {flow}
              categoryLabel={getFlowCategoryLabel(flow)}
              onopen={(flowId) => openFlowEditor(flowId)}
            />
          {/each}
        </div>
      {/if}

      <GlobalFlowLinkedNotes
        appData={appState.appData}
        linkedNoteIds={globalFlowLinkedNoteIds}
        onlinknote={(noteId) => void linkNoteToGlobalFlows(noteId)}
        onunlinknote={(noteId) => void unlinkNoteFromGlobalFlows(noteId)}
        onopennote={(noteId) => openLinkedNote(noteId)}
      />
    </div>
  </div>
{/if}
