<script lang="ts">
  import { Clipboard, Copy, Trash2 } from "lucide-svelte";

  import type { QuickText } from "$lib/store/types";
  import { getQuickTextDisplayTitle, getQuickTextPreview } from "$lib/utils/categoryUtils";

  interface Props {
    quickText: QuickText;
    onedit: () => void;
    oncopy: () => void;
    ondelete: () => void;
  }

  let { quickText, onedit, oncopy, ondelete }: Props = $props();

  const trimmedTitle = $derived(quickText.title.trim());
  const hasTitle = $derived(trimmedTitle.length > 0);
  const displayTitle = $derived(getQuickTextDisplayTitle(quickText));
  const preview = $derived(getQuickTextPreview(quickText, hasTitle ? 160 : 220) || "Texto vacío");

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onedit();
    }
  }
</script>

<div
  class="card card-hover group flex cursor-pointer items-center gap-3 px-4 py-3"
  role="button"
  tabindex="0"
  title={preview}
  onclick={onedit}
  onkeydown={handleKeydown}
>
  <div class="rounded-xl bg-emerald-50 p-2 text-emerald-700">
    <Clipboard size={18} />
  </div>

  <div class="min-w-0 flex-1">
    {#if hasTitle}
      <p class="truncate text-sm font-semibold text-slate-800">{displayTitle}</p>
      <p class="line-clamp-2 text-xs leading-relaxed text-slate-500">{preview}</p>
    {:else}
      <p class="line-clamp-3 text-sm leading-relaxed text-slate-700">{preview}</p>
    {/if}
  </div>

  <button
    class="rounded-xl p-2 text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-800"
    onclick={(event) => {
      event.stopPropagation();
      oncopy();
    }}
    title="Copiar"
    aria-label="Copiar texto rápido"
  >
    <Copy size={16} />
  </button>

  <button
    class="rounded-xl p-2 text-red-500 opacity-0 transition hover:bg-red-50 group-hover:opacity-100"
    onclick={(event) => {
      event.stopPropagation();
      ondelete();
    }}
    title="Borrar"
    aria-label="Borrar texto rápido"
  >
    <Trash2 size={16} />
  </button>
</div>