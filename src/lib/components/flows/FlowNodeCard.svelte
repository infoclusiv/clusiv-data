<script lang="ts">
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
  class={`absolute z-10 w-52 rounded-2xl border border-slate-200 bg-white/95 p-4 text-left text-slate-900 shadow-soft transition hover:-translate-y-0.5 ${selected ? "ring-2 ring-brand-200" : ""}`}
  style={`left: ${node.position.x}px; top: ${node.position.y}px;`}
  onclick={() => onselect(node.id)}
>
  <p class="font-semibold">{node.title.trim() || "Nodo sin título"}</p>

  {#if outgoingCount <= 1}
    <span class="pointer-events-none absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-white bg-slate-400"></span>
  {:else}
    <span class="pointer-events-none absolute -right-1.5 top-[35%] h-3 w-3 rounded-full border border-white bg-slate-400"></span>
    <span class="pointer-events-none absolute -right-1.5 top-[65%] h-3 w-3 rounded-full border border-white bg-slate-400"></span>
  {/if}
</button>
