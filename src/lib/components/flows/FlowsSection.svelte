<script lang="ts">
  import { Filter, Grid2X2, List, Plus, Search, SlidersHorizontal } from "lucide-svelte";

  import FlowCard from "$lib/components/flows/FlowCard.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import type { Flow } from "$lib/store/types";

  interface Props {
    categoryName: string;
    flows: Flow[];
    oncreate: () => void;
    onopen: (flowId: string) => void;
  }

  let { categoryName, flows, oncreate, onopen }: Props = $props();

  let search = $state("");
  let sortBy = $state("updated");
  let viewMode = $state<"grid" | "list">("grid");

  const filteredFlows = $derived.by(() => {
    const query = search.trim().toLowerCase();
    const nextFlows = flows.filter((flow) => {
      const matchesSearch = query.length === 0
        || flow.title.toLowerCase().includes(query);
      return matchesSearch;
    });

    return [...nextFlows].sort((left, right) => {
      if (sortBy === "title") {
        return left.title.localeCompare(right.title);
      }
      if (sortBy === "nodes") {
        return right.nodes.length - left.nodes.length;
      }
      return right.updated_at.localeCompare(left.updated_at);
    });
  });
</script>

<section class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p class="section-label">Flujos guardados</p>
      <h2 class="mt-2 text-2xl font-semibold text-slate-900">Flujos en {categoryName}</h2>
      <p class="mt-2 text-sm text-slate-500">
        Revisa, filtra y abre los flujos de esta categoria sin salir de la vista principal.
      </p>
    </div>

    <button class="btn-primary" onclick={oncreate}>
      <Plus size={16} />
      Nuevo flujo
    </button>
  </div>

  <div class="card p-4">
    <div class="grid gap-3 lg:grid-cols-[minmax(16rem,1.5fr)_repeat(2,minmax(0,0.7fr))]">
      <div class="flex flex-col gap-1.5">
        <label class="section-label" for="flow-search">Buscar</label>

        <div class="relative">
          <Search
            size={16}
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id="flow-search"
            bind:value={search}
            placeholder="Titulo del flujo"
            spellcheck={false}
            class="input-base pl-9"
          />
        </div>
      </div>

      <Select
        label="Ordenar"
        bind:value={sortBy}
        options={[
          { value: "updated", label: "Mas recientes" },
          { value: "title", label: "Titulo" },
          { value: "nodes", label: "Mas nodos" },
        ]}
      />

      <div class="flex flex-col gap-1.5">
        <span class="section-label">Vista</span>
        <div class="flex gap-2">
          <button
            class={`btn-ghost flex-1 ${viewMode === "grid" ? "bg-brand-50 text-brand-800" : "bg-white/70"}`}
            onclick={() => (viewMode = "grid")}
          >
            <Grid2X2 size={16} />
            Grid
          </button>
          <button
            class={`btn-ghost flex-1 ${viewMode === "list" ? "bg-brand-50 text-brand-800" : "bg-white/70"}`}
            onclick={() => (viewMode = "list")}
          >
            <List size={16} />
            Lista
          </button>
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
      <Filter size={13} />
      <span>{filteredFlows.length} flujo{filteredFlows.length === 1 ? "" : "s"} visible{filteredFlows.length === 1 ? "" : "s"}</span>
      <SlidersHorizontal size={13} class="ml-2" />
      <span>{flows.length} total</span>
    </div>
  </div>

  {#if flows.length === 0}
    <div class="card border-dashed px-8 py-12 text-center">
      <p class="section-label">Sin flujos</p>
      <h3 class="mt-3 text-xl font-semibold text-slate-900">Crear nuevo flujo</h3>
      <p class="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
        Empieza con un canvas vacio conectado a esta categoria. Luego podras editar nodos y conexiones.
      </p>
      <div class="mt-6">
        <button class="btn-primary" onclick={oncreate}>
          <Plus size={16} />
          Crear nuevo flujo
        </button>
      </div>
    </div>
  {:else if filteredFlows.length === 0}
    <div class="card border-dashed px-8 py-12 text-center text-sm text-slate-500">
      No hay flujos que coincidan con los filtros actuales.
    </div>
  {:else}
    <div class={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "grid gap-4"}>
      {#each filteredFlows as flow (flow.id)}
        <FlowCard
          {flow}
          onopen={onopen}
        />
      {/each}
    </div>
  {/if}
</section>
