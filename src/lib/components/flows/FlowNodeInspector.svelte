<script lang="ts">
  import { Trash2 } from "lucide-svelte";

  import type { FlowNode } from "$lib/store/types";

  interface Props {
    node: FlowNode | null;
    onupdate: (field: "title" | "description" | "comments", value: string) => void;
    ondelete?: (nodeId: string) => void;
  }

  let { node, onupdate, ondelete }: Props = $props();

</script>

<section class="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm">
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="section-label">Inspector</p>
      <h3 class="mt-2 text-lg font-semibold text-slate-900">Editar nodo</h3>
    </div>

    {#if node && ondelete}
      <button class="btn-ghost text-red-700 hover:bg-red-50" onclick={() => ondelete(node.id)}>
        <Trash2 size={16} />
        Quitar
      </button>
    {/if}
  </div>

  {#if !node}
    <div class="mt-6 rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
      Selecciona un nodo del canvas para editarlo.
    </div>
  {:else}
    <div class="mt-6 space-y-4">
      <div class="flex flex-col gap-1.5">
        <label class="section-label" for="flow-node-title">Título</label>
        <input
          id="flow-node-title"
          class="input-base"
          value={node.title}
          placeholder="Ej. Validar información"
          spellcheck={false}
          oninput={(event) => onupdate("title", (event.currentTarget as HTMLInputElement).value)}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="section-label" for="flow-node-description">Descripción</label>
        <textarea
          id="flow-node-description"
          class="input-base resize-none"
          rows="5"
          placeholder="Explica qué hace este nodo"
          spellcheck={false}
          oninput={(event) => onupdate("description", (event.currentTarget as HTMLTextAreaElement).value)}
        >{node.description}</textarea>
      </div>
    </div>
  {/if}
</section>
