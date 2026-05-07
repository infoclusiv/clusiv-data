<script lang="ts">
  import { Clock3, GitBranchPlus } from "lucide-svelte";

  import FlowThumbnail from "$lib/components/flows/FlowThumbnail.svelte";
  import type { Flow } from "$lib/store/types";

  interface Props {
    flow: Flow;
    onopen: (flowId: string) => void;
    categoryLabel?: string | null;
  }

  let { flow, onopen, categoryLabel = null }: Props = $props();

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

<button
  type="button"
  class="card group flex h-full w-full cursor-pointer flex-col p-4 text-left focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 hover:-translate-y-0.5 hover:shadow-lg"
  onclick={() => onopen(flow.id)}
  aria-label={`Abrir flujo ${flow.title.trim() || "Nuevo flujo"}`}
>
  <FlowThumbnail {flow} />

  <div class="mt-4">
    <div class="min-w-0">
      <p class="truncate text-lg font-semibold text-slate-900 group-hover:text-brand-800">
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

  <div class="mt-auto pt-5 text-sm font-semibold text-brand-700 opacity-0 transition group-hover:opacity-100">
    Clic para abrir →
  </div>
</button>
