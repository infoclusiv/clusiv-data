<script lang="ts">
  import { onMount } from "svelte";

  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import Snackbar from "$lib/components/ui/Snackbar.svelte";
  import { appState, initializeApp } from "$lib/store/appState.svelte";
  import { getCategory } from "$lib/utils/categoryUtils";
  import { CATEGORY_TYPE_NOTEBOOK } from "$lib/utils/constants";
  import BoardView from "$lib/views/BoardView.svelte";
  import LinksView from "$lib/views/LinksView.svelte";
  import NotebookView from "$lib/views/NotebookView.svelte";
  import WelcomeView from "$lib/views/WelcomeView.svelte";

  let ready = $state(false);

  const currentCategoryType = $derived(
    appState.appData && appState.currentCategoryId
      ? getCategory(appState.appData, appState.currentCategoryId)?.type ?? null
      : null,
  );

  onMount(async () => {
    await initializeApp();
    ready = true;
  });
</script>

{#if !ready}
  <div class="flex h-screen w-screen items-center justify-center bg-paper-50 text-sm text-slate-500">
    Cargando...
  </div>
{:else}
  <div class="flex h-screen w-screen overflow-hidden">
    <Sidebar />

    <main class="flex-1 overflow-hidden p-4">
      <div class="flex h-full">
        {#if appState.currentView === "welcome"}
          <WelcomeView />
        {:else if appState.currentView === "category" && currentCategoryType === CATEGORY_TYPE_NOTEBOOK}
          <NotebookView />
        {:else if appState.currentView === "category"}
          <LinksView />
        {:else if appState.currentView === "board"}
          <BoardView />
        {:else}
          <WelcomeView />
        {/if}
      </div>
    </main>
  </div>
{/if}

<Snackbar />