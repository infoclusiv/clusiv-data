<script lang="ts">
  import type { Flow } from "$lib/store/types";

  interface Props {
    flow: Flow;
  }

  let { flow }: Props = $props();

  const width = 220;
  const height = 120;

  function normalizeX(value: number): number {
    const bounded = Math.max(0, Math.min(640, value));
    return 16 + (bounded / 640) * (width - 32);
  }

  function normalizeY(value: number): number {
    const bounded = Math.max(0, Math.min(360, value));
    return 16 + (bounded / 360) * (height - 32);
  }

  function getNodeTone(type: Flow["nodes"][number]["type"]): string {
    if (type === "input") {
      return "fill-emerald-200 stroke-emerald-400";
    }
    if (type === "decision") {
      return "fill-amber-200 stroke-amber-400";
    }
    if (type === "output") {
      return "fill-sky-200 stroke-sky-400";
    }
    return "fill-white stroke-slate-300";
  }
</script>

<div class="overflow-hidden rounded-[1.25rem] border border-emerald-100/70 bg-gradient-to-br from-emerald-50 via-white to-brand-50/70 p-3">
  <svg viewBox={`0 0 ${width} ${height}`} class="h-28 w-full">
    {#each flow.edges as edge (edge.id)}
      {@const source = flow.nodes.find((node) => node.id === edge.source)}
      {@const target = flow.nodes.find((node) => node.id === edge.target)}
      {#if source && target}
        <line
          x1={normalizeX(source.position.x)}
          y1={normalizeY(source.position.y)}
          x2={normalizeX(target.position.x)}
          y2={normalizeY(target.position.y)}
          stroke="rgba(15, 23, 42, 0.22)"
          stroke-width="2"
          stroke-linecap="round"
        />
      {/if}
    {/each}

    {#each flow.nodes as node (node.id)}
      <g transform={`translate(${normalizeX(node.position.x)}, ${normalizeY(node.position.y)})`}>
        {#if node.type === "decision"}
          <polygon
            points="-12,0 0,-12 12,0 0,12"
            class={`${getNodeTone(node.type)} stroke-[1.5]`}
          />
        {:else}
          <rect
            x="-16"
            y="-10"
            width="32"
            height="20"
            rx={node.type === "output" ? 10 : 6}
            class={`${getNodeTone(node.type)} stroke-[1.5]`}
          />
        {/if}
      </g>
    {/each}
  </svg>
</div>
