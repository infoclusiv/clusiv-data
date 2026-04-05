<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    open: boolean;
    title: string;
    onclose: () => void;
    widthClass?: string;
    children?: Snippet;
    actions?: Snippet;
  }

  let {
    open,
    title,
    onclose,
    widthClass = "max-w-xl",
    children,
    actions,
  }: Props = $props();

  let backdrop = $state<HTMLDivElement | null>(null);
  let panel = $state<HTMLDivElement | null>(null);
  let pointerStartedOnBackdrop = $state(false);

  $effect(() => {
    if (!open) {
      pointerStartedOnBackdrop = false;
      return;
    }

    queueMicrotask(() => panel?.focus());
  });

  $effect(() => {
    if (!open) {
      return;
    }

    const handleWindowPointerUp = (event: PointerEvent): void => {
      const releasedOnBackdrop = event.target === backdrop;

      if (pointerStartedOnBackdrop && releasedOnBackdrop) {
        onclose();
      }

      pointerStartedOnBackdrop = false;
    };

    const resetBackdropPointer = (): void => {
      pointerStartedOnBackdrop = false;
    };

    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", resetBackdropPointer);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", resetBackdropPointer);
      pointerStartedOnBackdrop = false;
    };
  });

  function handleBackdropPointerDown(event: PointerEvent): void {
    pointerStartedOnBackdrop = event.target === backdrop;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      onclose();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={backdrop}
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
    onkeydown={handleKeydown}
    onpointerdown={handleBackdropPointerDown}
  >
    <div
      bind:this={panel}
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      class={`flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-soft outline-none ${widthClass}`}
    >
      <div class="border-b border-slate-200/80 px-6 py-5">
        <h2 class="text-lg font-semibold text-slate-900">{title}</h2>
      </div>

      <div class="overflow-y-auto px-6 py-5">
        {#if children}
          {@render children()}
        {/if}
      </div>

      {#if actions}
        <div class="flex justify-end gap-2 border-t border-slate-200/80 px-6 py-4">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
{/if}