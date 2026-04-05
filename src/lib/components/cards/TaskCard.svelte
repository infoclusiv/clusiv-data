<script lang="ts">
  import { MessageSquare, Trash2 } from "lucide-svelte";

  import type { Item } from "$lib/store/types";

  interface Props {
    item: Item;
    onedit: () => void;
    ondelete: () => void;
    ontoggle: (done: boolean) => void;
    categoryLabel?: string | null;
  }

  let { item, onedit, ondelete, ontoggle, categoryLabel = null }: Props = $props();

  const hasComment = $derived(item.comment.trim().length > 0);

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onedit();
    }
  }
</script>

<div
  class={`${item.done ? "card-task-done" : "card card-hover"} flex min-h-[168px] cursor-pointer flex-col gap-3 p-4`}
  role="button"
  tabindex="0"
  title={hasComment ? item.comment : "Sin comentarios adicionales"}
  onclick={onedit}
  onkeydown={handleKeydown}
>
  {#if categoryLabel}
    <div class="w-fit rounded-full bg-slate-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
      {categoryLabel}
    </div>
  {/if}

  <div class="flex items-start gap-3">
    <input
      type="checkbox"
      checked={item.done}
      class="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-brand-700"
      onclick={(event) => event.stopPropagation()}
      onchange={(event) => ontoggle((event.currentTarget as HTMLInputElement).checked)}
    />
    <p class={`flex-1 text-sm font-bold ${item.done ? "text-slate-500 line-through" : "text-slate-800"}`}>
      {item.title}
    </p>
  </div>

  {#if hasComment}
    <p class="line-clamp-4 text-sm leading-relaxed text-slate-600">{item.comment}</p>
  {/if}

  <div class="mt-auto flex items-center justify-end gap-2 pt-1">
    {#if hasComment}
      <MessageSquare size={14} class="mr-auto text-brand-600" />
    {/if}

    <button
      class="rounded-xl p-2 text-red-500 transition hover:bg-red-50"
      onclick={(event) => {
        event.stopPropagation();
        ondelete();
      }}
      title="Borrar"
      aria-label="Borrar tarea"
    >
      <Trash2 size={15} />
    </button>
  </div>
</div>