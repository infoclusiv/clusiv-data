<script lang="ts">
  import { MousePointer2 } from "lucide-svelte";

  import {
    FLOW_NODE_HEIGHT,
    FLOW_NODE_WIDTH,
    getFlowCanvasSize,
    sortOutgoingEdgesForLayout,
  } from "$lib/components/flows/flowLayout";
  import FlowNodeCard from "$lib/components/flows/FlowNodeCard.svelte";
  import type { FlowEdge, FlowNode } from "$lib/store/types";
  import { getOutgoingEdges } from "$lib/utils/flowGraphUtils";

  interface Props {
    nodes: FlowNode[];
    edges: FlowEdge[];
    selectedNodeId: string | null;
    onselectnode: (nodeId: string) => void;
    oninsertbetween?: (edgeId: string) => void;
  }

  let { nodes, edges, selectedNodeId, onselectnode, oninsertbetween }: Props = $props();

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

  function getSourceConnectionPoint(
    node: FlowNode,
    edge: FlowEdge,
  ): { x: number; y: number } {
    const outgoing = sortOutgoingEdgesForLayout({
      edges: getOutgoingEdges(edges, node.id),
      nodesById: new Map(nodes.map((candidate) => [candidate.id, candidate])),
    });
    const ratio = getSourcePortRatio(edge, outgoing);

    return {
      x: node.position.x + FLOW_NODE_WIDTH,
      y: node.position.y + FLOW_NODE_HEIGHT * ratio,
    };
  }

  function getTargetConnectionPoint(node: FlowNode): { x: number; y: number } {
    return {
      x: node.position.x,
      y: node.position.y + FLOW_NODE_HEIGHT / 2,
    };
  }

  function getEdgePath(source: { x: number; y: number }, target: { x: number; y: number }): string {
    const distanceX = Math.max(1, target.x - source.x);
    const curveOffset = Math.min(96, Math.max(48, distanceX * 0.45));

    return [
      `M ${source.x} ${source.y}`,
      `C ${source.x + curveOffset} ${source.y}`,
      `${target.x - curveOffset} ${target.y}`,
      `${target.x} ${target.y}`,
    ].join(" ");
  }

  function getEdgeActionPoint(
    source: { x: number; y: number },
    target: { x: number; y: number },
  ): { x: number; y: number } {
    return {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
    };
  }

  function getSourcePortRatio(edge: FlowEdge, outgoingEdges: FlowEdge[]): number {
    const label = edge.label.trim().toLowerCase();

    if (label === "superior") {
      return 0.35;
    }

    if (label === "inferior") {
      return 0.65;
    }

    if (outgoingEdges.length <= 1) {
      return 0.5;
    }

    const index = outgoingEdges.findIndex((candidate) => candidate.id === edge.id);
    return index === 0 ? 0.35 : 0.65;
  }

  function getOutgoingCount(nodeId: string): number {
    return getOutgoingEdges(edges, nodeId).length;
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
        style={`width: ${canvasWidth}px; height: ${canvasHeight}px; transform: scale(${zoom}); transform-origin: top left; background-image: radial-gradient(circle, rgba(15, 23, 42, 0.08) 1px, transparent 1px); background-size: 18px 18px;`}
      >
        <svg class="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <marker
              id="flow-arrow"
              markerWidth="12"
              markerHeight="12"
              refX="9"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,7 L9,3.5 z" fill="#059669" />
            </marker>
          </defs>

          {#each edges as edge (edge.id)}
            {@const source = nodes.find((node) => node.id === edge.source)}
            {@const target = nodes.find((node) => node.id === edge.target)}
            {#if source && target}
              {@const sourcePoint = getSourceConnectionPoint(source, edge)}
              {@const targetPoint = getTargetConnectionPoint(target)}
              {@const edgePath = getEdgePath(sourcePoint, targetPoint)}
              <path
                d={edgePath}
                fill="none"
                stroke="#a7f3d0"
                stroke-width="7"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-opacity="0.42"
                vector-effect="non-scaling-stroke"
              />
              <path
                d={edgePath}
                fill="none"
                stroke="#059669"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-opacity="0.95"
                vector-effect="non-scaling-stroke"
                marker-end="url(#flow-arrow)"
              />
              {#if edge.label.trim()}
                <text
                  x={(sourcePoint.x + targetPoint.x) / 2}
                  y={(sourcePoint.y + targetPoint.y) / 2 - 10}
                  text-anchor="middle"
                  class="fill-slate-500 text-[11px] font-semibold"
                >
                  {edge.label}
                </text>
              {/if}
            {/if}
          {/each}
        </svg>

        {#if oninsertbetween}
          {#each edges as edge (edge.id)}
            {@const source = nodes.find((node) => node.id === edge.source)}
            {@const target = nodes.find((node) => node.id === edge.target)}
            {#if source && target}
              {@const sourcePoint = getSourceConnectionPoint(source, edge)}
              {@const targetPoint = getTargetConnectionPoint(target)}
              {@const actionPoint = getEdgeActionPoint(sourcePoint, targetPoint)}
              {@const labelOffset = edge.label.trim() ? 12 : 0}
              <button
                type="button"
                class="absolute z-20 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-white text-sm font-bold text-emerald-700 shadow-sm transition hover:scale-105 hover:border-emerald-400 hover:bg-emerald-50"
                style={`left: ${actionPoint.x - 14}px; top: ${actionPoint.y + labelOffset - 14}px;`}
                title="Insertar nodo entre estos dos nodos"
                aria-label="Insertar nodo entre estos dos nodos"
                onclick={(event) => {
                  event.stopPropagation();
                  oninsertbetween?.(edge.id);
                }}
              >
                +
              </button>
            {/if}
          {/each}
        {/if}

        {#each nodes as node (node.id)}
          <FlowNodeCard
            {node}
            selected={selectedNodeId === node.id}
            outgoingCount={getOutgoingCount(node.id)}
            onselect={onselectnode}
          />
        {/each}
      </div>
    </div>
  </div>
</section>
