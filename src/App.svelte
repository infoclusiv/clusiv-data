<script lang="ts">
  import { onMount } from "svelte";

  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import Snackbar from "$lib/components/ui/Snackbar.svelte";
  import { appState, initializeApp } from "$lib/store/appState.svelte";
  import BoardView from "$lib/views/BoardView.svelte";
  import CategoryView from "$lib/views/CategoryView.svelte";
  import LogsView from "$lib/views/LogsView.svelte";
  import WelcomeView from "$lib/views/WelcomeView.svelte";
  import QuickTextsView from "./lib/views/QuickTextsView.svelte";
  import SearchView from "./lib/views/SearchView.svelte";

  let ready = $state(false);

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
        {:else if appState.currentView === "category"}
          <CategoryView />
        {:else if appState.currentView === "board"}
          <BoardView />
        {:else if appState.currentView === "logs"}
          <LogsView />
        {:else if appState.currentView === "quick-texts"}
          <QuickTextsView />
        {:else if appState.currentView === "search"}
          <SearchView />
        {:else}
          <WelcomeView />
        {/if}
      </div>
    </main>
  </div>
{/if}

<Snackbar />