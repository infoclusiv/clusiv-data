<script lang="ts">
  import { Check, ChevronDown, Plus, Search, Tag } from "lucide-svelte";
  import { getNoteTagColor, normalizeNoteTags } from "$lib/utils/noteTags";

  interface Props {
    selected: string[];
    options: string[];
    onchange: (nextTags: string[]) => void;
    allowCreate?: boolean;
  }

  let { selected, options, onchange, allowCreate = false }: Props = $props();
  let root: HTMLDivElement;
  let opened = $state(false);
  let query = $state("");
  let draft = $state<string[]>([]);
  const matches = $derived(options.filter((tag) =>
    tag.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const newTag = $derived(query.trim().replace(/\s+/g, " ").slice(0, 48));
  const canCreate = $derived(allowCreate && newTag.length > 0 &&
    ![...options, ...draft].some((tag) => tag.toLocaleLowerCase() === newTag.toLocaleLowerCase()));

  function toggleOpen(): void {
    if (!opened) { draft = [...selected]; query = ""; }
    opened = !opened;
  }

  function toggle(tag: string): void {
    draft = draft.some((value) => value.toLocaleLowerCase() === tag.toLocaleLowerCase())
      ? draft.filter((value) => value.toLocaleLowerCase() !== tag.toLocaleLowerCase())
      : normalizeNoteTags([...draft, tag]);
  }

  function createTag(): void {
    if (!canCreate) return;
    draft = normalizeNoteTags([...draft, newTag]);
    query = "";
  }

  function apply(): void {
    onchange(normalizeNoteTags(draft));
    opened = false;
  }

  function outsideClick(event: MouseEvent): void {
    if (opened && root && !root.contains(event.target as Node)) opened = false;
  }

  function onEscape(event: KeyboardEvent): void {
    if (opened && event.key === "Escape") { opened = false; event.stopPropagation(); }
  }
</script>

<svelte:window onclick={outsideClick} onkeydown={onEscape} />

<div class="relative inline-block min-w-[190px] max-w-full" bind:this={root}>
  <button
    type="button"
    class="flex w-full items-center justify-between gap-2 rounded-full border border-brand-300 bg-white px-4 py-2 text-left text-sm font-medium text-slate-700 shadow-sm hover:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    aria-expanded={opened}
    aria-label="Seleccionar etiquetas"
    onclick={toggleOpen}
  >
    <span class="flex min-w-0 items-center gap-2 truncate">
      <Tag size={15} class="shrink-0 text-brand-700" />
      {selected.length ? `${selected.length} etiquetas` : "Seleccionar etiquetas"}
    </span>
    <ChevronDown size={16} class="shrink-0 text-brand-700" />
  </button>

  {#if opened}
    <div class="absolute left-0 top-full z-[70] mt-2 w-[min(290px,calc(100vw-40px))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
      <label class="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-500">
        <Search size={15} />
        <input
          bind:value={query}
          class="w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none"
          placeholder="Buscar etiqueta..."
          aria-label="Buscar etiqueta"
          onkeydown={(event) => {
            if (event.key === "Enter" && canCreate) { event.preventDefault(); createTag(); }
          }}
        />
      </label>
      <div class="mt-2 max-h-52 space-y-1 overflow-y-auto">
        {#each matches as tag (tag)}
          <label class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
            <input
              type="checkbox"
              class="accent-brand-700"
              checked={draft.some((value) => value.toLocaleLowerCase() === tag.toLocaleLowerCase())}
              onchange={() => toggle(tag)}
            />
            <span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getNoteTagColor(tag)}`}>{tag}</span>
          </label>
        {/each}
        {#if matches.length === 0 && !canCreate}
          <p class="px-2 py-3 text-xs text-slate-500">No hay etiquetas coincidentes.</p>
        {/if}
        {#if canCreate}
          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-brand-700 hover:bg-brand-50" onclick={createTag}>
            <Plus size={14} /> Crear "{newTag}"
          </button>
        {/if}
      </div>
      {#if draft.length > 0}
        <div class="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
          {#each draft as tag (tag)}
            <span class={`rounded-full px-2 py-0.5 text-[11px] ${getNoteTagColor(tag)}`}>{tag}</span>
          {/each}
        </div>
      {/if}
      <div class="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span class="text-xs text-slate-500">{draft.length} seleccionadas</span>
        <div class="flex gap-2">
          <button type="button" class="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" onclick={() => (opened = false)}>Cancelar</button>
          <button type="button" class="inline-flex items-center gap-1 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800" onclick={apply}>
            <Check size={13} /> Aplicar
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
