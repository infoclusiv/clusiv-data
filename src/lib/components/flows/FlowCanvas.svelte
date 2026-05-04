<script lang="ts">
  import { MousePointer2 } from "lucide-svelte";

  import FlowNodeCard from "$lib/components/flows/FlowNodeCard.svelte";
  import type { FlowEdge, FlowNode } from "$lib/store/types";

  interface Props {
    nodes: FlowNode[];
    edges: FlowEdge[];
    selectedNodeId: string | null;
    onselectnode: (nodeId: string) => void;
  }

  let { nodes, edges, selectedNodeId, onselectnode }: Props = $props();

  const canvasHeight = 560;
  const canvasWidth = $derived(
    Math.max(
      920,
      ...nodes.map((node) => node.position.x + 260),
    ),
  );

  function getNodeCenter(node: FlowNode): { x: number; y: number } {
    return {
      x: node.position.x + 104,
      y: node.position.y + 52,
    };
  }
</script>

<section class="rounded-[1.75rem] border border-slate-200/80 bg-paper-50/85 p-5 shadow-soft backdrop-blur-sm">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="section-label">Canvas</p>
      <p class="mt-2 text-sm text-slate-500">
        Haz clic en cualquier nodo para abrir sus opciones de edición.
      </p>
    </div>
    <div class="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
      <MousePointer2 size={13} class="mr-1 inline" />
      {nodes.length} nodos
    </div>
  </div>

  <div class="overflow-auto rounded-[1.5rem] border border-white/70 bg-white/75 p-4">
    <div
      class="relative w-full rounded-[1.25rem] border border-dashed border-brand-100 bg-gradient-to-br from-white via-brand-50/40 to-emerald-50/50"
      style={`min-width: ${canvasWidth}px; height: ${canvasHeight}px;`}
    >
      <svg class="pointer-events-none absolute inset-0 h-full w-full">
        {#each edges as edge (edge.id)}
          {@const source = nodes.find((node) => node.id === edge.source)}
          {@const target = nodes.find((node) => node.id === edge.target)}
          {#if source && target}
            {@const sourceCenter = getNodeCenter(source)}
            {@const targetCenter = getNodeCenter(target)}
            <line
              x1={sourceCenter.x}
              y1={sourceCenter.y}
              x2={targetCenter.x}
              y2={targetCenter.y}
              stroke="rgba(15, 23, 42, 0.2)"
              stroke-width="3"
              stroke-linecap="round"
            />
            {#if edge.label.trim()}
              <text
                x={(sourceCenter.x + targetCenter.x) / 2}
                y={(sourceCenter.y + targetCenter.y) / 2 - 8}
                text-anchor="middle"
                class="fill-slate-500 text-[11px] font-semibold"
              >
                {edge.label}
              </text>
            {/if}
          {/if}
        {/each}
      </svg>

      {#each nodes as node (node.id)}
        <FlowNodeCard
          {node}
          selected={selectedNodeId === node.id}
          onselect={onselectnode}
        />
      {/each}
    </div>
  </div>
</section>
