<script lang="ts">
  import { MousePointer2 } from "lucide-svelte";

  import {
    FLOW_NODE_HEIGHT,
    FLOW_NODE_WIDTH,
    getFlowCanvasSize,
  } from "$lib/components/flows/flowLayout";
  import FlowNodeCard from "$lib/components/flows/FlowNodeCard.svelte";
  import type { FlowEdge, FlowNode } from "$lib/store/types";

  interface Props {
    nodes: FlowNode[];
    edges: FlowEdge[];
    selectedNodeId: string | null;
    onselectnode: (nodeId: string) => void;
  }

  let { nodes, edges, selectedNodeId, onselectnode }: Props = $props();

  let viewportElement = $state<HTMLDivElement | null>(null);
  let zoom = $state(1);

  const minZoom = 0.5;
  const maxZoom = 1.5;
  const zoomStep = 0.1;

  const canvasSize = $derived(getFlowCanvasSize(nodes));
  const canvasWidth = $derived(canvasSize.width);
  const canvasHeight = $derived(canvasSize.height);
  const zoomedCanvasWidth = $derived(canvasWidth * zoom);
  const zoomedCanvasHeight = $derived(canvasHeight * zoom);

  function getNodeCenter(node: FlowNode): { x: number; y: number } {
    return {
      x: node.position.x + FLOW_NODE_WIDTH / 2,
      y: node.position.y + FLOW_NODE_HEIGHT / 2,
    };
  }

  function zoomIn(): void {
    zoom = Math.min(maxZoom, Number((zoom + zoomStep).toFixed(2)));
  }

  function zoomOut(): void {
    zoom = Math.max(minZoom, Number((zoom - zoomStep).toFixed(2)));
  }

  function resetZoom(): void {
    zoom = 1;
  }

  $effect(() => {
    if (!viewportElement || !selectedNodeId) {
      return;
    }

    const selectedNode = nodes.find((node) => node.id === selectedNodeId);

    if (!selectedNode) {
      return;
    }

    viewportElement.scrollTo({
      left: Math.max(0, selectedNode.position.x * zoom - 80),
      top: Math.max(0, selectedNode.position.y * zoom - 80),
      behavior: "smooth",
    });
  });
</script>

<section class="rounded-[1.75rem] border border-slate-200/80 bg-paper-50/85 p-5 shadow-soft backdrop-blur-sm">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="section-label">Canvas</p>
      <p class="mt-2 text-sm text-slate-500">
        Haz clic en cualquier nodo para abrir sus opciones de edición.
      </p>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm transition hover:bg-white"
        onclick={zoomOut}
      >
        -
      </button>
      <button
        type="button"
        class="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm transition hover:bg-white"
        onclick={resetZoom}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        class="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm transition hover:bg-white"
        onclick={zoomIn}
      >
        +
      </button>
      <div class="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
        <MousePointer2 size={13} class="mr-1 inline" />
        {nodes.length} nodos
      </div>
    </div>
  </div>

  <div
    bind:this={viewportElement}
    class="max-w-full overflow-auto rounded-[1.5rem] border border-white/70 bg-white/75 p-4"
  >
    <div style={`width: ${zoomedCanvasWidth}px; height: ${zoomedCanvasHeight}px;`}>
      <div
        class="relative rounded-[1.25rem] border border-dashed border-brand-100 bg-gradient-to-br from-white via-brand-50/40 to-emerald-50/50"
        style={`width: ${canvasWidth}px; height: ${canvasHeight}px; transform: scale(${zoom}); transform-origin: top left;`}
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
  </div>
</section>
