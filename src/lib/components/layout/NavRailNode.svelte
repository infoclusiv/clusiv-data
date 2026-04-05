<script lang="ts">
  import { ChevronRight, Inbox } from "lucide-svelte";

  import NavRailNode from "$lib/components/layout/NavRailNode.svelte";

  import {
    appState,
    isCategoryExpanded,
    selectCategory,
    toggleCategoryExpansion,
  } from "$lib/store/appState.svelte";
  import { GENERAL_CATEGORY_ID } from "$lib/utils/constants";
  import { getChildCategories } from "$lib/utils/categoryUtils";
  import { getIcon } from "$lib/utils/getIconComponent";
  import type { Category } from "$lib/store/types";

  interface Props {
    category: Category;
    depth?: number;
  }

  let { category, depth = 0 }: Props = $props();

  const childCategories = $derived(
    appState.appData ? getChildCategories(appState.appData, category.id) : [],
  );

  const expanded = $derived(
    childCategories.length > 0 && isCategoryExpanded(category.id),
  );

  const Icon = $derived(
    category.id === GENERAL_CATEGORY_ID ? Inbox : getIcon(category.icon),
  );

  function handleToggle(event: MouseEvent): void {
    event.stopPropagation();
    toggleCategoryExpansion(category.id);
  }
</script>

<div class="space-y-1" style={`padding-left: ${depth * 0.55}rem`}>
  <div class="flex min-w-0 items-center gap-0.5">
    {#if childCategories.length > 0}
      <button
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/70 hover:text-brand-800"
        onclick={handleToggle}
        title={expanded ? "Colapsar subcategorías" : "Expandir subcategorías"}
        aria-label={expanded ? "Colapsar subcategorías" : "Expandir subcategorías"}
      >
        <ChevronRight size={16} class={`transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
    {:else}
      <span class="h-7 w-7 shrink-0"></span>
    {/if}

    <button
      class={`nav-item min-w-0 flex-1 ${appState.currentCategoryId === category.id && appState.currentView === "category" ? "nav-item-active" : ""}`}
      onclick={() => selectCategory(category.id)}
      title={category.name}
    >
      <Icon size={15} class="shrink-0" />
      <span class="truncate">{category.name}</span>
    </button>
  </div>

  {#if expanded}
    <div class="space-y-1">
      {#each childCategories as child (child.id)}
        <NavRailNode category={child} depth={depth + 1} />
      {/each}
    </div>
  {/if}
</div>