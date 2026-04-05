<script lang="ts">
  import NavRailNode from "$lib/components/layout/NavRailNode.svelte";
  import { appState } from "$lib/store/appState.svelte";
  import { getRootCategories } from "$lib/utils/categoryUtils";

  const rootCategories = $derived(
    appState.appData ? getRootCategories(appState.appData) : [],
  );
</script>

<nav class="flex-1 overflow-x-hidden overflow-y-auto px-2 pb-4">
  <div class="space-y-1">
    {#each rootCategories as category (category.id)}
      <NavRailNode {category} depth={0} />
    {/each}
  </div>
</nav>