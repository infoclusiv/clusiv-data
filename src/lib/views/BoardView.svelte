<script lang="ts">
  import { Inbox } from "lucide-svelte";

  import { appState, selectCategory } from "$lib/store/appState.svelte";
  import { GENERAL_CATEGORY_ID } from "$lib/utils/constants";
  import {
    formatItemCounts,
    getCategoryCounts,
    getCategoryChildrenSummary,
    getRootCategories,
  } from "$lib/utils/categoryUtils";
  import { getIcon } from "$lib/utils/getIconComponent";
  import type { Category } from "$lib/store/types";

  const rootCategories = $derived(
    appState.appData ? getRootCategories(appState.appData) : [],
  );

  function getCategoryIcon(category: Category) {
    if (category.id === GENERAL_CATEGORY_ID) {
      return Inbox;
    }
    return getIcon(category.icon);
  }

  function getGalleryTone(category: Category): string {
    if (category.id === GENERAL_CATEGORY_ID) {
      return "bg-brand-50/85 border-brand-100";
    }
    return "bg-white/85 border-white/75";
  }

  function getCategorySummary(category: Category): string {
    if (!appState.appData) {
      return "Categoría principal";
    }

    const counts = getCategoryCounts(appState.appData, category.id);
    const parts = [getCategoryChildrenSummary(appState.appData, category.id)];

    if (category.links.length > 0) {
      parts.push(category.links.length === 1 ? "1 enlace" : `${category.links.length} enlaces`);
    }

    if (counts.noteCount > 0 || counts.taskCount > 0) {
      parts.push(formatItemCounts(counts.noteCount, counts.taskCount));
    }

    return parts.join(" · ");
  }
</script>

{#if appState.appData}
  <div class="page-panel relative flex h-full flex-1 flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto px-8 py-7">
      <div class="mb-6">
        <p class="section-label">Board</p>
        <h1 class="mt-2 text-3xl font-semibold text-slate-900">Categorías</h1>
        <p class="mt-2 text-sm text-slate-500">
          Elige una categoría principal para abrir su vista completa con enlaces, notas, tareas y subcategorías.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {#each rootCategories as category}
          {@const Icon = getCategoryIcon(category)}
          {@const counts = getCategoryCounts(appState.appData, category.id)}
          <button
            class={`card card-hover flex min-h-[220px] flex-col items-start p-5 text-left ${getGalleryTone(category)}`}
            onclick={() => selectCategory(category.id)}
          >
            <div class="mb-5 flex w-full items-center justify-between">
              <div class="rounded-2xl bg-white/80 p-3 text-brand-700 shadow-sm">
                <Icon size={22} />
              </div>
              <span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Principal
              </span>
            </div>

            <p class="text-lg font-semibold text-slate-900">{category.name}</p>
            <p class="mt-2 text-sm leading-relaxed text-slate-500">
              {getCategorySummary(category)}
            </p>

            <div class="mt-auto pt-6 text-sm font-semibold text-slate-700">
              {formatItemCounts(counts.noteCount, counts.taskCount)}
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}