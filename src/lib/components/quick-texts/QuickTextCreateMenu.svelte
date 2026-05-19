<script lang="ts">
  import { FileText, FolderPlus } from "lucide-svelte";

  interface Props {
    open: boolean;
    onnewtext: () => void;
    onnewgroup: () => void;
  }

  let { open, onnewtext, onnewgroup }: Props = $props();
</script>

{#if open}
  <div class="fixed bottom-24 right-6 z-[60] flex flex-col items-end gap-2">
    <button
      class="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-800"
      type="button"
      onclick={onnewtext}
    >
      <FileText size={18} />
      <span>Nuevo texto</span>
    </button>

    <button
      class="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-800"
      type="button"
      onclick={onnewgroup}
    >
      <FolderPlus size={18} />
      <span>Nuevo grupo</span>
    </button>
  </div>
{/if}
