<script lang="ts">
  import {
    FLOW_NODE_HEIGHT,
    FLOW_NODE_WIDTH,
  } from "$lib/components/flows/flowLayout";
  import type { FlowNode } from "$lib/store/types";

  interface Props {
    node: FlowNode;
    selected?: boolean;
    outgoingCount?: number;
    onselect: (nodeId: string) => void;
  }

  let { node, selected = false, outgoingCount = 0, onselect }: Props = $props();
</script>

<button
  class={`absolute z-10 rounded-2xl border bg-white/95 p-4 text-left text-slate-900 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg ${selected ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-200"}`}
  style={`left: ${node.position.x}px; top: ${node.position.y}px; width: ${FLOW_NODE_WIDTH}px; height: ${FLOW_NODE_HEIGHT}px;`}
  onclick={() => onselect(node.id)}
>
  <p
    class="text-sm font-semibold leading-6 text-slate-900"
    style="-webkit-box-orient: vertical; -webkit-line-clamp: 4; display: -webkit-box; overflow: hidden;"
  >
    {node.title.trim() || "Nodo sin título"}
  </p>

  {#if outgoingCount <= 1}
    <span class="pointer-events-none absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-white bg-emerald-500 shadow-sm"></span>
  {:else}
    <span class="pointer-events-none absolute -right-1.5 top-[35%] h-3 w-3 rounded-full border border-white bg-emerald-500 shadow-sm"></span>
    <span class="pointer-events-none absolute -right-1.5 top-[65%] h-3 w-3 rounded-full border border-white bg-emerald-500 shadow-sm"></span>
  {/if}
</button>
