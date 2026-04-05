<script lang="ts">
  import { Clipboard, FolderOpen, Link2, ListChecks, Search, StickyNote } from "lucide-svelte";

  import { appState, selectCategory, setSearchQuery, showQuickTexts } from "$lib/store/appState.svelte";
  import { getFlatCategoryEntries, getQuickTexts, getTasks } from "$lib/utils/categoryUtils";
  import { searchAppData, type SearchResult } from "$lib/utils/searchUtils";

  let searchInput = $state<HTMLInputElement | null>(null);

  const hasQuery = $derived(appState.searchQuery.trim().length > 0);
  const results = $derived(
    appState.appData ? searchAppData(appState.appData, appState.searchQuery) : [],
  );
  const categoryResults = $derived(results.filter((result) => result.type === "category"));
  const noteResults = $derived(results.filter((result) => result.type === "note"));
  const taskResults = $derived(results.filter((result) => result.type === "task"));
  const linkResults = $derived(results.filter((result) => result.type === "link"));
  const quickTextResults = $derived(results.filter((result) => result.type === "quick-text"));

  const totalCategories = $derived(
    appState.appData ? getFlatCategoryEntries(appState.appData).length : 0,
  );
  const totalItems = $derived(
    appState.appData ? getTasks(appState.appData).length : 0,
  );
  const totalQuickTexts = $derived(
    appState.appData ? getQuickTexts(appState.appData).length : 0,
  );

  $effect(() => {
    queueMicrotask(() => searchInput?.focus());
  });

  function openResult(result: SearchResult): void {
    if (result.type === "quick-text") {
      showQuickTexts();
      return;
    }

    if (result.categoryId) {
      selectCategory(result.categoryId);
    }
  }

  function getResultIcon(type: SearchResult["type"]) {
    switch (type) {
      case "category":
        return FolderOpen;
      case "note":
        return StickyNote;
      case "task":
        return ListChecks;
      case "link":
        return Link2;
      case "quick-text":
        return Clipboard;
    }
  }

  function getResultTone(type: SearchResult["type"]): string {
    switch (type) {
      case "category":
        return "bg-brand-50 text-brand-700";
      case "note":
        return "bg-amber-50 text-amber-700";
      case "task":
        return "bg-emerald-50 text-emerald-700";
      case "link":
        return "bg-blue-50 text-blue-700";
      case "quick-text":
        return "bg-violet-50 text-violet-700";
    }
  }
</script>

{#if appState.appData}
  <div class="page-panel flex h-full flex-1 flex-col overflow-hidden">
    <div class="border-b border-slate-200/70 px-8 py-7">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="section-label">Global</p>
          <h1 class="mt-2 text-3xl font-semibold text-slate-900">Buscar</h1>
          <p class="mt-2 text-sm text-slate-500">
            Busca por categorías, subcategorías, notas, tareas, comentarios, enlaces y textos rápidos.
          </p>
        </div>

        <div class="hidden flex-wrap gap-2 md:flex">
          <span class="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
            {totalCategories} categorías
          </span>
          <span class="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
            {totalItems} notas y tareas
          </span>
          <span class="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
            {totalQuickTexts} textos rápidos
          </span>
        </div>
      </div>

      <div class="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-3 shadow-sm">
        <div class="flex items-center gap-3 rounded-[1.1rem] bg-slate-50 px-4 py-3">
          <Search size={18} class="text-slate-400" />
          <input
            bind:this={searchInput}
            type="text"
            value={appState.searchQuery}
            placeholder="Escribe una o varias palabras..."
            class="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            oninput={(event) => setSearchQuery((event.currentTarget as HTMLInputElement).value)}
          />
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-8 py-6">
      {#if !hasQuery}
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="card p-5">
            <p class="section-label">Cobertura</p>
            <p class="mt-3 text-lg font-semibold text-slate-900">Busca en toda la app</p>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              El buscador revisa nombres de categorías, contenido de notas y tareas, enlaces y textos rápidos.
            </p>
          </div>

          <div class="card p-5">
            <p class="section-label">Cómo buscar</p>
            <p class="mt-3 text-lg font-semibold text-slate-900">Usa varias palabras</p>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              La búsqueda compara todas las palabras que escribas y prioriza coincidencias en títulos y nombres.
            </p>
          </div>

          <div class="card p-5">
            <p class="section-label">Navegación</p>
            <p class="mt-3 text-lg font-semibold text-slate-900">Abre el resultado</p>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              Al abrir un resultado irás a la categoría correspondiente o a la sección de textos rápidos.
            </p>
          </div>
        </div>
      {:else if results.length === 0}
        <div class="card border-dashed p-10 text-center text-sm text-slate-500">
          No encontré coincidencias para “{appState.searchQuery.trim()}”. Intenta con menos palabras o con otra forma de escribirlo.
        </div>
      {:else}
        <div class="mb-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span class="rounded-full bg-white/85 px-3 py-1 shadow-sm">{results.length} resultados</span>
          {#if categoryResults.length > 0}
            <span class="rounded-full bg-white/85 px-3 py-1 shadow-sm">{categoryResults.length} categorías</span>
          {/if}
          {#if noteResults.length > 0}
            <span class="rounded-full bg-white/85 px-3 py-1 shadow-sm">{noteResults.length} notas</span>
          {/if}
          {#if taskResults.length > 0}
            <span class="rounded-full bg-white/85 px-3 py-1 shadow-sm">{taskResults.length} tareas</span>
          {/if}
          {#if linkResults.length > 0}
            <span class="rounded-full bg-white/85 px-3 py-1 shadow-sm">{linkResults.length} enlaces</span>
          {/if}
          {#if quickTextResults.length > 0}
            <span class="rounded-full bg-white/85 px-3 py-1 shadow-sm">{quickTextResults.length} textos rápidos</span>
          {/if}
        </div>

        <div class="space-y-6">
          {#each [
            { label: "Categorías", results: categoryResults },
            { label: "Notas", results: noteResults },
            { label: "Tareas", results: taskResults },
            { label: "Enlaces", results: linkResults },
            { label: "Textos rápidos", results: quickTextResults },
          ] as section}
            {#if section.results.length > 0}
              <section>
                <p class="section-label mb-3">{section.label}</p>
                <div class="space-y-3">
                  {#each section.results as result}
                    {@const ResultIcon = getResultIcon(result.type)}
                    <button
                      class="card card-hover w-full px-4 py-4 text-left"
                      onclick={() => openResult(result)}
                    >
                      <div class="flex items-start gap-3">
                        <div class={`rounded-xl p-2 ${getResultTone(result.type)}`}>
                          <ResultIcon size={18} />
                        </div>

                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <p class="text-sm font-semibold text-slate-900">{result.title}</p>
                            <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {result.matchLabel}
                            </span>
                          </div>

                          <p class="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                            {result.breadcrumb}
                          </p>

                          <p class="mt-2 text-sm leading-relaxed text-slate-600">{result.preview}</p>
                        </div>
                      </div>
                    </button>
                  {/each}
                </div>
              </section>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}