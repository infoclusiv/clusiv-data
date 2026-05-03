<script lang="ts">
  import type { CategorySection } from "$lib/store/types";

  interface TabOption {
    id: CategorySection;
    label: string;
  }

  interface Props {
    activeSection: CategorySection;
    onselect: (section: CategorySection) => void;
  }

  let { activeSection, onselect }: Props = $props();

  const tabs: TabOption[] = [
    { id: "tasks", label: "Tareas" },
    { id: "notes", label: "Notas" },
    { id: "links", label: "Enlaces" },
    { id: "subcategories", label: "Subcategorías" },
    { id: "flows", label: "Flujos" },
  ];
</script>

<div class="border-b border-slate-200/70 px-8 py-4">
  <div class="flex flex-wrap gap-2">
    {#each tabs as tab}
      <button
        class={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
          activeSection === tab.id
            ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm"
            : "border-transparent bg-white/70 text-slate-600 hover:border-brand-100 hover:text-slate-900"
        }`}
        onclick={() => onselect(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>
</div>
