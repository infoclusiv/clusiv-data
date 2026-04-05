<script lang="ts">
  import { MessageSquare, StickyNote, Trash2 } from "lucide-svelte";

  import type { Item } from "$lib/store/types";

  interface Props {
    item: Item;
    onedit: () => void;
    ondelete: () => void;
    categoryLabel?: string | null;
  }

  let { item, onedit, ondelete, categoryLabel = null }: Props = $props();

  const hasComment = $derived(item.comment.trim().length > 0);

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onedit();
    }
  }
</script>

<div
  class="card-note card-hover flex min-h-[168px] cursor-pointer flex-col gap-3 p-4"
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

  <div class="flex items-start gap-2">
    <StickyNote size={16} class="mt-1 shrink-0 text-amber-700" />
    <p class="line-clamp-3 flex-1 text-sm font-bold text-slate-800">{item.title}</p>
  </div>

  {#if hasComment}
    <p class="line-clamp-5 text-sm leading-relaxed text-slate-600">{item.comment}</p>
  {/if}

  <div class="mt-auto flex items-center justify-end gap-2 pt-1">
    {#if hasComment}
      <MessageSquare size={14} class="mr-auto text-brand-600" />
    {/if}

    <button
      class="rounded-xl p-2 text-red-500 transition hover:bg-red-100"
      onclick={(event) => {
        event.stopPropagation();
        ondelete();
      }}
      title="Borrar"
      aria-label="Borrar nota"
    >
      <Trash2 size={15} />
    </button>
  </div>
</div>