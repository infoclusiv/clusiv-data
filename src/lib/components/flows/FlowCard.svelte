<script lang="ts">
  import { Clock3, GitBranchPlus, Play, Trash2 } from "lucide-svelte";

  import FlowThumbnail from "$lib/components/flows/FlowThumbnail.svelte";
  import type { Flow } from "$lib/store/types";

  interface Props {
    flow: Flow;
    onopen: (flowId: string) => void;
    ondelete?: (flowId: string) => void;
    categoryLabel?: string | null;
  }

  let { flow, onopen, ondelete, categoryLabel = null }: Props = $props();

  function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Sin fecha";
    }

    return new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }
</script>

<article class="card flex h-full flex-col p-4">
  <FlowThumbnail {flow} />

  <div class="mt-4">
    <div class="min-w-0">
      <p class="truncate text-lg font-semibold text-slate-900">
        {flow.title.trim() || "Nuevo flujo"}
      </p>

      {#if categoryLabel}
        <p class="mt-1 truncate text-xs font-medium text-slate-500">
          {categoryLabel}
        </p>
      {/if}
    </div>
  </div>

  <div class="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
    <span class="rounded-full bg-slate-100 px-3 py-1">
      <GitBranchPlus size={12} class="mr-1 inline" />
      {flow.nodes.length} nodos
    </span>
    <span class="rounded-full bg-slate-100 px-3 py-1">
      {flow.edges.length} conexiones
    </span>
    <span class="rounded-full bg-slate-100 px-3 py-1">
      <Clock3 size={12} class="mr-1 inline" />
      {formatDate(flow.updated_at)}
    </span>
  </div>

  <div class="mt-auto flex items-center justify-between gap-3 pt-5">
    {#if ondelete}
      <button class="btn-ghost text-red-700 hover:bg-red-50" onclick={() => ondelete(flow.id)}>
        <Trash2 size={16} />
        Eliminar
      </button>
    {:else}
      <span></span>
    {/if}

    <button class="btn-primary" onclick={() => onopen(flow.id)}>
      <Play size={16} />
      Abrir flujo
    </button>
  </div>
</article>
