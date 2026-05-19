<script lang="ts">
  type QuickTextsViewMode = "grouped" | "list";

  interface Props {
    viewMode: QuickTextsViewMode;
    onchange: (viewMode: QuickTextsViewMode) => void;
  }

  let { viewMode, onchange }: Props = $props();

  const options: Array<{ value: QuickTextsViewMode; label: string }> = [
    { value: "grouped", label: "Vista agrupada" },
    { value: "list", label: "Vista lista" },
  ];
</script>

<div class="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/75 p-1 shadow-soft backdrop-blur-sm">
  {#each options as option (option.value)}
    <button
      class={`btn-ghost px-4 py-2 ${viewMode === option.value ? "bg-brand-50 text-brand-800 shadow-sm ring-1 ring-brand-100" : "bg-transparent"}`}
      type="button"
      aria-pressed={viewMode === option.value}
      onclick={() => onchange(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
