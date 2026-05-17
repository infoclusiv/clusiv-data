<script lang="ts">
  import { ExternalLink, Image as ImageIcon, Link as LinkIcon, Pencil, Trash2 } from "lucide-svelte";

  import type { Link } from "$lib/store/types";

  interface Props {
    link: Link;
    onopen: (url: string) => void;
    onedit: () => void;
    ondelete: () => void;
  }

  let { link, onopen, onedit, ondelete }: Props = $props();
  const imageCount = $derived(link.images?.length ?? 0);
  const hasImages = $derived(imageCount > 0);
  const firstImage = $derived(hasImages ? link.images[0] : null);

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onopen(link.url);
    }
  }
</script>

<div
  class="card card-hover group flex cursor-pointer items-center gap-3 px-4 py-3"
  role="button"
  tabindex="0"
  onclick={() => onopen(link.url)}
  onkeydown={handleKeydown}
>
  <div class="flex items-center gap-2">
    <div class="rounded-xl bg-blue-50 p-2 text-blue-700">
      <LinkIcon size={18} />
    </div>

    {#if firstImage}
      <div class="relative h-11 w-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        <img
          src={firstImage.data_url}
          alt={firstImage.name}
          class="h-full w-full object-cover"
        />
      </div>
    {/if}
  </div>

  <div class="min-w-0 flex-1">
    <p class="truncate text-sm font-semibold text-slate-800">{link.title}</p>
    <div class="flex items-center gap-2">
      <p class="min-w-0 flex-1 truncate text-xs text-slate-500">{link.url}</p>
      {#if hasImages}
        <span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
          <ImageIcon size={12} />
          {imageCount === 1 ? "1 imagen" : `${imageCount} imágenes`}
        </span>
      {/if}
    </div>
  </div>

  <button
    class="rounded-xl p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
    onclick={(event) => {
      event.stopPropagation();
      onopen(link.url);
    }}
    title="Abrir"
    aria-label="Abrir enlace"
  >
    <ExternalLink size={16} />
  </button>

  <button
    class="rounded-xl p-2 text-slate-500 opacity-0 transition hover:bg-amber-50 hover:text-amber-700 group-hover:opacity-100"
    onclick={(event) => {
      event.stopPropagation();
      onedit();
    }}
    title="Editar"
    aria-label="Editar enlace"
  >
    <Pencil size={16} />
  </button>

  <button
    class="rounded-xl p-2 text-red-500 opacity-0 transition hover:bg-red-50 group-hover:opacity-100"
    onclick={(event) => {
      event.stopPropagation();
      ondelete();
    }}
    title="Borrar"
    aria-label="Borrar enlace"
  >
    <Trash2 size={16} />
  </button>
</div>
