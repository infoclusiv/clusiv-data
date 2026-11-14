<script lang="ts">
  import { FileText, FileImage, Link2, MoreHorizontal, Move, ArrowRight } from "lucide-svelte";
  import type { Item } from "$lib/store/types";

  interface Props {
    note: Item;
    conceptId: string;
    color: string;
    x: number;
    y: number;
    dimmed?: boolean;
    dragging?: boolean;
    highlighted?: boolean;
    onopen: () => void;
    ondrag: (event: PointerEvent) => void;
    onlink: (event: PointerEvent) => void;
  }
  let { note, conceptId, color, x, y, dimmed = false, dragging = false,
    highlighted = false, onopen, ondrag, onlink }: Props = $props();
  let menuOpen = $state(false);
  function openFromMouse(event: MouseEvent): void {
    // A previously focused note button must never activate when Space is held.
    if (event.detail === 0) {
      event.preventDefault();
      return;
    }
    onopen();
  }

  const shades: Record<string, string> = {
    emerald: "#10b981", lime: "#84a02b", amber: "#ef9e26", sky: "#38a5d2",
    teal: "#0d967d", violet: "#9078d1", rose: "#d58ca1",
  };
  const stroke = $derived(shades[color] ?? shades.emerald);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  role="group"
  tabindex="0"
  data-note-key={conceptId + "::" + note.id}
  class="concept-note-card group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-visible rounded-[1.35rem] border bg-white p-4 text-slate-900 shadow-lg"
  class:note-moving={dragging}
  class:note-dimmed={dimmed}
  class:note-highlighted={highlighted}
  style:left={x + "px"}
  style:top={y + "px"}
  style:border-color={stroke + "44"}
  style:box-shadow={"0 10px 26px " + stroke + "1b"}
  onpointerdown={ondrag}
  ondragstart={(event) => event.preventDefault()}
>
  <div class="flex items-start gap-2.5">
    <FileText size={20} class="mt-0.5 shrink-0" color={stroke}/>
    <button class="min-w-0 flex-1 break-words text-left text-[15px] font-bold leading-5 hover:text-brand-700"
      title={"Abrir nota: " + note.title}
      onpointerdown={(event) => event.stopPropagation()} onclick={openFromMouse}
    >{note.title || "Nota sin título"}</button>
    <div class="relative shrink-0">
      <button class="rounded-lg p-1 text-slate-400 hover:bg-slate-100" title="Opciones de la nota"
        aria-label="Opciones de la nota" onpointerdown={(event) => event.stopPropagation()}
        onclick={() => menuOpen = !menuOpen}><MoreHorizontal size={17}/></button>
      {#if menuOpen}
        <div class="absolute right-0 top-7 z-30 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <button class="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-emerald-50" onpointerdown={(event) => event.stopPropagation()} onclick={(event) => { menuOpen = false; openFromMouse(event); }}>Editar nota y adjuntos</button>
        </div>
      {/if}
    </div>
  </div>
  <p class="mt-2 min-h-0 flex-1 overflow-hidden text-[13px] leading-[1.45] text-slate-600 line-clamp-3">{note.comment || "Añade tus observaciones, fuentes o conclusiones a esta nota."}</p>
  <div class="mt-2 flex items-center gap-3 text-[11px] font-medium text-slate-500">
    {#if note.links?.length}<span class="inline-flex items-center gap-1"><Link2 size={14}/> {note.links.length}</span>{/if}
    {#if note.documents?.length}<span class="inline-flex items-center gap-1"><FileText size={14}/> {note.documents.length}</span>{/if}
    {#if note.images?.length}<span class="inline-flex items-center gap-1"><FileImage size={14}/> {note.images.length}</span>{/if}
    {#if !note.links?.length && !note.documents?.length && !note.images?.length}<span class="text-slate-400">Sin adjuntos</span>{/if}
  </div>
  <button
    class="mt-2 flex items-center justify-between rounded-xl bg-emerald-50/65 px-3 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-emerald-100"
    onpointerdown={(event) => event.stopPropagation()} onclick={openFromMouse}
  >Ver nota completa <ArrowRight size={16}/></button>
  <button
    class="note-link-handle absolute -left-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-brand-200 bg-white/95 text-brand-700 shadow-sm"
    aria-label={"Arrastrar nota " + note.title + " a otro concepto"}
    title="Arrastra esta conexión hasta otro concepto"
    onpointerdown={(event) => { event.stopPropagation(); onlink(event); }}
    onclick={(event) => { event.preventDefault(); event.stopPropagation(); }}
  ><Link2 size={15}/></button>
  <span class="note-drag-hint pointer-events-none absolute -right-2 -top-2 rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm"><Move size={11}/></span>
</div>

<style>
  .concept-note-card {
    width: 306px; height: 182px; z-index: 3;
    cursor: grab; user-select: none; touch-action: none;
    transition: left 180ms cubic-bezier(.22,1,.36,1), top 180ms cubic-bezier(.22,1,.36,1),
      border-color 180ms ease, box-shadow 180ms ease, opacity 150ms ease;
  }
  .concept-note-card.note-moving { transition: none; z-index: 8; cursor: grabbing; }
  .concept-note-card.note-dimmed { opacity: .26; }
  .concept-note-card.note-highlighted { outline: 3px solid rgba(16,185,129,.4); outline-offset: 3px; }
  .note-link-handle, .note-drag-hint { opacity: .30; transition: opacity 160ms ease, transform 160ms ease; }
  .concept-note-card:hover .note-link-handle, .concept-note-card:hover .note-drag-hint,
  .note-link-handle:focus-visible { opacity: 1; }
  .note-link-handle { cursor: crosshair; }
  .note-link-handle:hover { transform: translateY(-50%) scale(1.08); }
</style>
