<script lang="ts">
  import { Clipboard, Pencil, Trash2 } from "lucide-svelte";

  import type { QuickText } from "$lib/store/types";
  import { getQuickTextDisplayTitle, getQuickTextPreview } from "$lib/utils/categoryUtils";

  interface Props {
    quickText: QuickText;
    index: number;
    groupName?: string;
    showGroupLabel?: boolean;
    oncopy: () => void;
    onedit: () => void;
    ondelete: () => void;
  }

  let {
    quickText,
    index,
    groupName = "Textos sin grupo",
    showGroupLabel = false,
    oncopy,
    onedit,
    ondelete,
  }: Props = $props();

  const trimmedTitle = $derived(quickText.title.trim());
  const hasTitle = $derived(trimmedTitle.length > 0);
  const displayTitle = $derived(getQuickTextDisplayTitle(quickText));
  const preview = $derived(getQuickTextPreview(quickText, hasTitle ? 180 : 240) || "Texto vacío");
</script>

<div class="card flex items-start gap-3 px-4 py-3">
  <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
    {index + 1}
  </div>

  <div class="min-w-0 flex-1">
    {#if showGroupLabel}
      <p class="section-label mb-1">{groupName}</p>
    {/if}

    {#if hasTitle}
      <p class="truncate text-sm font-semibold text-slate-800">{displayTitle}</p>
      <p class="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">{preview}</p>
    {:else}
      <p class="line-clamp-3 text-sm leading-relaxed text-slate-700">{preview}</p>
    {/if}
  </div>

  <div class="flex shrink-0 items-center gap-1">
    <button
      class="btn-ghost px-3 py-2 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
      type="button"
      onclick={oncopy}
      title="Copiar"
      aria-label="Copiar texto rápido"
    >
      <Clipboard size={16} />
      <span>Copiar</span>
    </button>

    <button
      class="btn-ghost px-3 py-2"
      type="button"
      onclick={onedit}
      title="Editar"
      aria-label="Editar texto rápido"
    >
      <Pencil size={16} />
      <span>Editar</span>
    </button>

    <button
      class="btn-danger px-3 py-2"
      type="button"
      onclick={ondelete}
      title="Borrar"
      aria-label="Borrar texto rápido"
    >
      <Trash2 size={16} />
    </button>
  </div>
</div>
