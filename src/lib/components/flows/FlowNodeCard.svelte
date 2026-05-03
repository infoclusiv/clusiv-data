<script lang="ts">
  import type { FlowNode } from "$lib/store/types";

  interface Props {
    node: FlowNode;
    selected?: boolean;
    onselect: (nodeId: string) => void;
  }

  let { node, selected = false, onselect }: Props = $props();

  function getTone(type: FlowNode["type"]): string {
    if (type === "input") {
      return "border-emerald-200 bg-emerald-50/85 text-emerald-900";
    }
    if (type === "decision") {
      return "border-amber-200 bg-amber-50/85 text-amber-900";
    }
    if (type === "output") {
      return "border-sky-200 bg-sky-50/85 text-sky-900";
    }
    return "border-slate-200 bg-white/95 text-slate-900";
  }

  function getBadgeLabel(type: FlowNode["type"]): string {
    if (type === "input") {
      return "Entrada";
    }
    if (type === "decision") {
      return "Decisión";
    }
    if (type === "output") {
      return "Salida";
    }
    return "Proceso";
  }
</script>

<button
  class={`absolute w-52 rounded-2xl border p-4 text-left shadow-soft transition hover:-translate-y-0.5 ${getTone(node.type)} ${selected ? "ring-2 ring-brand-200" : ""}`}
  style={`left: ${node.position.x}px; top: ${node.position.y}px;`}
  onclick={() => onselect(node.id)}
>
  <span class="section-label text-[10px] text-current opacity-70">{getBadgeLabel(node.type)}</span>
  <p class="mt-2 font-semibold">{node.title.trim() || "Nodo sin título"}</p>
  <p class="mt-1 text-xs opacity-75">{node.subtitle.trim() || "Sin subtítulo"}</p>
  {#if node.description.trim()}
    <p class="mt-3 text-xs leading-relaxed opacity-80">
      {node.description}
    </p>
  {/if}
</button>
