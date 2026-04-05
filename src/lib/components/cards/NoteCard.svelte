<script lang="ts">
  import { Image as ImageIcon, MessageSquare, StickyNote, Trash2 } from "lucide-svelte";

  import type { Item } from "$lib/store/types";
  import { getItemDisplayTitle } from "$lib/utils/categoryUtils";

  interface Props {
    item: Item;
    onedit: () => void;
    ondelete: () => void;
    categoryLabel?: string | null;
  }

  let { item, onedit, ondelete, categoryLabel = null }: Props = $props();

  const explicitTitle = $derived(item.title.trim());
  const hasComment = $derived(item.comment.trim().length > 0);
  const imageCount = $derived(item.images.length);
  const hasImages = $derived(imageCount > 0);
  const hasTitle = $derived(explicitTitle.length > 0);
  const displayTitle = $derived(getItemDisplayTitle(item));
  const fallbackTitle = $derived(hasImages ? "Nota con imágenes" : displayTitle);

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
  title={hasComment ? item.comment : hasTitle ? explicitTitle : fallbackTitle}
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
    {#if hasTitle}
      <p class="line-clamp-3 flex-1 text-sm font-bold text-slate-800">{explicitTitle}</p>
    {:else if hasComment}
      <p class="line-clamp-6 flex-1 text-sm font-bold leading-relaxed text-slate-800">
        {item.comment}
      </p>
    {:else}
      <p class="flex-1 text-sm font-bold text-slate-800">{fallbackTitle}</p>
    {/if}
  </div>

  {#if hasTitle && hasComment}
    <p class="line-clamp-5 text-sm leading-relaxed text-slate-600">{item.comment}</p>
  {/if}

  <div class="mt-auto flex items-center justify-end gap-2 pt-1">
    {#if hasImages || hasComment}
      <div class="mr-auto flex items-center gap-2">
        {#if hasImages}
          <div class="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-amber-700">
            <ImageIcon size={13} />
            <span>{imageCount}</span>
          </div>
        {/if}

        {#if hasComment}
          <MessageSquare size={14} class="text-brand-600" />
        {/if}
      </div>
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