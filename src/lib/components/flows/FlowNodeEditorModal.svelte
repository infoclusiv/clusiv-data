<script lang="ts">
  import { GitBranchPlus, Trash2, X } from "lucide-svelte";

  import type { FlowNode } from "$lib/store/types";

  interface Props {
    node: FlowNode;
    canCreateTwoPaths?: boolean;
    outgoingCount?: number;
    onupdate: (field: "title" | "subtitle" | "description" | "type", value: string) => void;
    ondelete?: (nodeId: string) => void;
    oncreatetwopaths?: (nodeId: string) => void;
    onclose: () => void;
  }

  let {
    node,
    canCreateTwoPaths = false,
    outgoingCount = 0,
    onupdate,
    ondelete,
    oncreatetwopaths,
    onclose,
  }: Props = $props();

  function handleOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      onclose();
    }
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape") {
      onclose();
    }
  }}
/>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-sm"
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-labelledby="flow-node-editor-title"
  onclick={handleOverlayClick}
  onkeydown={(event) => {
    if (event.key === "Escape") {
      onclose();
    }
  }}
>
  <section
    class="w-full max-w-xl rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-2xl"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="section-label">Nodo seleccionado</p>
        <h3 id="flow-node-editor-title" class="mt-2 text-lg font-semibold text-slate-900">
          Editar nodo
        </h3>
      </div>

      <button class="btn-ghost" type="button" onclick={onclose} aria-label="Cerrar editor">
        <X size={16} />
      </button>
    </div>

    <div class="mt-6 space-y-4">
      <div class="flex flex-col gap-1.5">
        <label class="section-label" for="flow-node-type">Tipo</label>
        <select
          id="flow-node-type"
          class="input-base"
          value={node.type}
          onchange={(event) => onupdate("type", (event.currentTarget as HTMLSelectElement).value)}
        >
          <option value="input">Entrada</option>
          <option value="process">Proceso</option>
          <option value="decision">Decisión</option>
          <option value="output">Salida</option>
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="section-label" for="flow-node-title">Título</label>
        <input
          id="flow-node-title"
          class="input-base"
          value={node.title}
          placeholder="Ej. Validar información"
          oninput={(event) => onupdate("title", (event.currentTarget as HTMLInputElement).value)}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="section-label" for="flow-node-subtitle">Subtítulo</label>
        <input
          id="flow-node-subtitle"
          class="input-base"
          value={node.subtitle}
          placeholder="Texto breve de apoyo"
          oninput={(event) => onupdate("subtitle", (event.currentTarget as HTMLInputElement).value)}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="section-label" for="flow-node-description">Descripción</label>
        <textarea
          id="flow-node-description"
          class="input-base resize-none"
          rows="6"
          placeholder="Explica qué hace este nodo"
          oninput={(event) =>
            onupdate("description", (event.currentTarget as HTMLTextAreaElement).value)}
        >{node.description}</textarea>
      </div>
    </div>

    <div class="mt-6 rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4">
      <p class="section-label">Acciones del flujo</p>
      <p class="mt-2 text-sm text-slate-500">
        Crea una ruta superior y una inferior desde este nodo. No usa un nodo condicional.
      </p>

      <button
        class="btn-ghost mt-4 w-full justify-center bg-white"
        type="button"
        disabled={!canCreateTwoPaths || !oncreatetwopaths}
        onclick={() => oncreatetwopaths?.(node.id)}
        title={
          node.type === "output"
            ? "Un nodo de salida no puede abrir nuevos caminos."
            : outgoingCount > 0
              ? "Este nodo ya tiene una salida. Elimina la salida existente para abrir dos caminos."
              : "Abrir dos caminos desde este nodo."
        }
      >
        <GitBranchPlus size={16} />
        Abrir dos caminos
      </button>

      {#if node.type === "output"}
        <p class="mt-2 text-xs text-slate-400">
          Los nodos de salida representan el final del flujo.
        </p>
      {:else if outgoingCount > 0}
        <p class="mt-2 text-xs text-slate-400">
          Este nodo ya tiene {outgoingCount} salida{outgoingCount === 1 ? "" : "s"}.
        </p>
      {/if}
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
      {#if ondelete}
        <button
          class="btn-ghost text-red-700 hover:bg-red-50"
          type="button"
          onclick={() => ondelete?.(node.id)}
        >
          <Trash2 size={16} />
          Quitar nodo
        </button>
      {/if}

      <button class="btn-primary ml-auto" type="button" onclick={onclose}>
        Listo
      </button>
    </div>
  </section>
</div>
