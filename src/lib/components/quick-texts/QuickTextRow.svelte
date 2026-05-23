<script lang="ts">
  import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-svelte";

  import type { QuickText } from "$lib/store/types";
  import { getQuickTextDisplayTitle, getQuickTextPreview } from "$lib/utils/categoryUtils";

  interface Props {
    quickText: QuickText;
    index: number;
    groupName?: string;
    showGroupLabel?: boolean;
    deleteTitle?: string;
    deleteAriaLabel?: string;
    showMoveControls?: boolean;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    onmoveup?: () => void;
    onmovedown?: () => void;
    oncopy: () => void;
    onedit: () => void;
    ondelete: () => void;
  }

  let {
    quickText,
    index,
    groupName = "Textos sin grupo",
    showGroupLabel = false,
    deleteTitle = "Borrar",
    deleteAriaLabel = "Borrar texto rápido",
    showMoveControls = false,
    canMoveUp = false,
    canMoveDown = false,
    onmoveup,
    onmovedown,
    oncopy,
    onedit,
    ondelete,
  }: Props = $props();

  const trimmedTitle = $derived(quickText.title.trim());
  const hasTitle = $derived(trimmedTitle.length > 0);
  const displayTitle = $derived(getQuickTextDisplayTitle(quickText));
  const preview = $derived(getQuickTextPreview(quickText, hasTitle ? 180 : 240) || "Texto vacío");
</script>

<div
  class="card flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:border-slate-200 hover:bg-slate-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
  role="button"
  tabindex="0"
  onclick={oncopy}
  onkeydown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      oncopy();
    }
  }}
>
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
    {#if showMoveControls}
      <button
        class="btn-ghost p-2"
        type="button"
        onclick={(event) => {
          event.stopPropagation();
          onmoveup?.();
        }}
        disabled={!canMoveUp}
        title="Mover texto hacia arriba"
        aria-label="Mover texto hacia arriba"
      >
        <ArrowUp size={16} />
      </button>

      <button
        class="btn-ghost p-2"
        type="button"
        onclick={(event) => {
          event.stopPropagation();
          onmovedown?.();
        }}
        disabled={!canMoveDown}
        title="Mover texto hacia abajo"
        aria-label="Mover texto hacia abajo"
      >
        <ArrowDown size={16} />
      </button>
    {/if}

    <button
      class="btn-ghost p-2"
      type="button"
      onclick={(event) => {
        event.stopPropagation();
        onedit();
      }}
      title="Editar"
      aria-label="Editar texto rápido"
    >
      <Pencil size={16} />
    </button>

    <button
      class="btn-danger p-2"
      type="button"
      onclick={(event) => {
        event.stopPropagation();
        ondelete();
      }}
      title={deleteTitle}
      aria-label={deleteAriaLabel}
    >
      <Trash2 size={16} />
    </button>
  </div>
</div>
