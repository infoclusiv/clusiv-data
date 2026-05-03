<script lang="ts">
  import { Clock3, GitBranchPlus, Play, Trash2 } from "lucide-svelte";

  import FlowThumbnail from "$lib/components/flows/FlowThumbnail.svelte";
  import type { Flow } from "$lib/store/types";

  interface Props {
    flow: Flow;
    onopen: (flowId: string) => void;
    ondelete?: (flowId: string) => void;
  }

  let { flow, onopen, ondelete }: Props = $props();

  function getStatusLabel(status: Flow["status"]): string {
    if (status === "active") {
      return "Activo";
    }
    if (status === "archived") {
      return "Archivado";
    }
    return "Borrador";
  }

  function getStatusTone(status: Flow["status"]): string {
    if (status === "active") {
      return "bg-emerald-50 text-emerald-800";
    }
    if (status === "archived") {
      return "bg-slate-200/70 text-slate-700";
    }
    return "bg-amber-50 text-amber-800";
  }

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

  <div class="mt-4 flex items-start justify-between gap-3">
    <div class="min-w-0">
      <p class="truncate text-lg font-semibold text-slate-900">
        {flow.title.trim() || "Nuevo flujo"}
      </p>
      <p class="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-slate-500">
        {flow.description.trim() || "Flujo visual listo para estructurar tareas, decisiones y salidas."}
      </p>
    </div>

    <span class={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(flow.status)}`}>
      {getStatusLabel(flow.status)}
    </span>
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
