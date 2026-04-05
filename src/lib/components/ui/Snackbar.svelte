<script lang="ts">
  import { hideSnackbar, snackbarState } from "$lib/store/snackbar.svelte";

  const toneClasses = {
    default: "bg-slate-900 text-white",
    success: "bg-brand-700 text-white",
    error: "bg-red-600 text-white",
  };
</script>

{#if snackbarState.visible}
  <div class="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4">
    <button
      class={`pointer-events-auto rounded-2xl px-5 py-3 text-sm font-medium shadow-soft transition ${toneClasses[snackbarState.tone]}`}
      onclick={hideSnackbar}
    >
      {snackbarState.message}
    </button>
  </div>
{/if}