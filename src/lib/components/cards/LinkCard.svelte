<script lang="ts">
  import { ExternalLink, Link as LinkIcon, Trash2 } from "lucide-svelte";

  import type { Link } from "$lib/store/types";

  interface Props {
    link: Link;
    onopen: (url: string) => void;
    ondelete: () => void;
  }

  let { link, onopen, ondelete }: Props = $props();

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
  <div class="rounded-xl bg-blue-50 p-2 text-blue-700">
    <LinkIcon size={18} />
  </div>

  <div class="min-w-0 flex-1">
    <p class="truncate text-sm font-semibold text-slate-800">{link.title}</p>
    <p class="truncate text-xs text-slate-500">{link.url}</p>
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