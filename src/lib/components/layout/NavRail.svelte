<script lang="ts">
  import { appState, selectCategory } from "$lib/store/appState.svelte";
  import { CATEGORY_TYPE_NOTEBOOK } from "$lib/utils/constants";
  import { getFlatCategoryEntries } from "$lib/utils/categoryUtils";
  import { getIcon, NOTEBOOK_ICON } from "$lib/utils/getIconComponent";

  const categories = $derived(
    appState.appData ? getFlatCategoryEntries(appState.appData) : [],
  );
</script>

<nav class="flex-1 overflow-y-auto px-3 pb-4">
  <div class="space-y-1">
    {#each categories as [category, depth]}
      {@const Icon = category.type === CATEGORY_TYPE_NOTEBOOK ? NOTEBOOK_ICON : getIcon(category.icon)}
      <button
        class={`nav-item ${appState.currentCategoryId === category.id && appState.currentView === "category" ? "nav-item-active" : ""}`}
        style={`padding-left: ${0.75 + depth * 1}rem`}
        onclick={() => selectCategory(category.id)}
        title={category.name}
      >
        <Icon size={16} />
        <span class="truncate">{category.name}</span>
      </button>
    {/each}
  </div>
</nav>