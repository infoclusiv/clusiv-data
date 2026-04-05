<script lang="ts">
  import { Plus } from "lucide-svelte";
  import type { ComponentType } from "svelte";

  interface FloatingAction {
    id: string;
    label: string;
    icon: ComponentType;
    onclick: () => void;
  }

  interface Props {
    actions: FloatingAction[];
    title?: string;
  }

  let { actions, title = "Crear" }: Props = $props();

  let menuOpen = $state(false);

  function closeMenu(): void {
    menuOpen = false;
  }

  function handleAction(action: FloatingAction): void {
    closeMenu();
    action.onclick();
  }
</script>

{#if menuOpen}
  <button
    class="fixed inset-0 z-30 bg-transparent"
    onclick={closeMenu}
    aria-label="Cerrar menú de creación"
  ></button>
{/if}

<div class="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
  {#if menuOpen}
    <div class="flex flex-col items-end gap-2">
      {#each actions as action (action.id)}
        {@const Icon = action.icon}
        <button
          class="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-800"
          onclick={() => handleAction(action)}
        >
          <Icon size={18} />
          <span>{action.label}</span>
        </button>
      {/each}
    </div>
  {/if}

  <button
    class="fab"
    onclick={() => (menuOpen = !menuOpen)}
    title={title}
    aria-label={title}
  >
    <Plus size={22} class={`transition-transform ${menuOpen ? "rotate-45" : ""}`} />
  </button>
</div>