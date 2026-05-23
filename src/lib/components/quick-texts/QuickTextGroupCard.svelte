<script lang="ts">
  import { ArrowDown, ArrowUp, ChevronDown, Folder, Pencil, Trash2 } from "lucide-svelte";

  import QuickTextRow from "$lib/components/quick-texts/QuickTextRow.svelte";
  import type { QuickText, QuickTextGroup } from "$lib/store/types";

  interface Props {
    group: QuickTextGroup | null;
    texts: QuickText[];
    virtual?: boolean;
    oncopy: (quickText: QuickText) => void;
    onedit: (quickText: QuickText) => void;
    ondelete: (quickText: QuickText) => void;
    onremovefromgroup?: (quickText: QuickText, group: QuickTextGroup) => void;
    onmovequicktextingroup?: (
      quickText: QuickText,
      group: QuickTextGroup,
      direction: "up" | "down",
    ) => void;
    oneditgroup?: (group: QuickTextGroup) => void;
    ondeletegroup?: (group: QuickTextGroup) => void;
    onmovegroup?: (group: QuickTextGroup, direction: "up" | "down") => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
  }

  let {
    group,
    texts,
    virtual = false,
    oncopy,
    onedit,
    ondelete,
    onremovefromgroup,
    onmovequicktextingroup,
    oneditgroup,
    ondeletegroup,
    onmovegroup,
    canMoveUp = false,
    canMoveDown = false,
  }: Props = $props();

  const heading = $derived(group?.name ?? "Textos sin grupo");
  const description = $derived(group?.description?.trim() || "Textos no asignados a ningún grupo");
  const canEditGroup = $derived(!virtual && group !== null && oneditgroup !== undefined);
  const canDeleteGroup = $derived(!virtual && group !== null && ondeletegroup !== undefined);
  const canMoveGroup = $derived(!virtual && group !== null && onmovegroup !== undefined);
  let expanded = $state(false);

  function toggleExpanded(): void {
    expanded = !expanded;
  }
</script>

<section class="card overflow-hidden">
  <div class="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4">
    <button
      class="flex min-w-0 flex-1 items-start gap-3 rounded-2xl text-left transition hover:bg-slate-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
      type="button"
      onclick={toggleExpanded}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Contraer" : "Expandir"} ${heading}`}
    >
      <div class={`rounded-xl p-2 ${virtual ? "bg-slate-100 text-slate-600" : "bg-brand-50 text-brand-800"}`}>
        <Folder size={18} />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="truncate text-base font-semibold text-slate-900">{heading}</h2>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {texts.length} {texts.length === 1 ? "texto" : "textos"}
          </span>
        </div>

        <p class="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <span
        class={`mt-1 flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-1 text-slate-500 transition ${expanded ? "rotate-180" : ""}`}
        aria-hidden="true"
      >
        <ChevronDown size={16} />
      </span>
    </button>

    {#if canMoveGroup || canEditGroup || canDeleteGroup}
      <div class="flex shrink-0 items-center gap-2">
        {#if canMoveGroup && group}
          <div class="flex items-center gap-1">
            <button
              class="btn-ghost p-2"
              type="button"
              onclick={() => onmovegroup?.(group, "up")}
              disabled={!canMoveUp}
              title="Mover grupo hacia arriba"
              aria-label="Mover grupo hacia arriba"
            >
              <ArrowUp size={16} />
            </button>

            <button
              class="btn-ghost p-2"
              type="button"
              onclick={() => onmovegroup?.(group, "down")}
              disabled={!canMoveDown}
              title="Mover grupo hacia abajo"
              aria-label="Mover grupo hacia abajo"
            >
              <ArrowDown size={16} />
            </button>
          </div>
        {/if}

        {#if canEditGroup && group}
          <button
            class="btn-ghost p-2"
            type="button"
            onclick={() => oneditgroup?.(group)}
            title="Editar grupo"
            aria-label="Editar grupo"
          >
            <Pencil size={16} />
          </button>
        {/if}

        {#if canDeleteGroup && group}
          <button
            class="btn-danger p-2"
            type="button"
            onclick={() => ondeletegroup?.(group)}
            title="Borrar grupo"
            aria-label="Borrar grupo"
          >
            <Trash2 size={16} />
          </button>
        {/if}
      </div>
    {/if}
  </div>

  {#if expanded}
    <div class="flex flex-col gap-3 px-4 py-4">
      {#if texts.length === 0}
        <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
          Este grupo todavía no tiene textos.
        </div>
      {:else}
        {#each texts as quickText, index (quickText.id)}
          <QuickTextRow
            {quickText}
            {index}
            deleteTitle={virtual ? "Borrar" : "Quitar de este grupo"}
            deleteAriaLabel={virtual ? "Borrar texto rapido" : "Quitar texto de este grupo"}
            showMoveControls={!virtual && group !== null && onmovequicktextingroup !== undefined}
            canMoveUp={index > 0}
            canMoveDown={index < texts.length - 1}
            onmoveup={() => {
              if (group && onmovequicktextingroup) {
                onmovequicktextingroup(quickText, group, "up");
              }
            }}
            onmovedown={() => {
              if (group && onmovequicktextingroup) {
                onmovequicktextingroup(quickText, group, "down");
              }
            }}
            oncopy={() => oncopy(quickText)}
            onedit={() => onedit(quickText)}
            ondelete={() => {
              if (!virtual && group && onremovefromgroup) {
                onremovefromgroup(quickText, group);
                return;
              }

              ondelete(quickText);
            }}
          />
        {/each}
      {/if}
    </div>
  {/if}
</section>
