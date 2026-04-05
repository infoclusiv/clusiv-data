<script lang="ts">
  import { ChevronRight } from "lucide-svelte";
  import type { ComponentType } from "svelte";

  interface Props {
    label: string;
    subtitle: string;
    icon: ComponentType;
    onopen: () => void;
  }

  let { label, subtitle, icon: Icon, onopen }: Props = $props();

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onopen();
    }
  }
</script>

<div
  class="card card-hover group w-full cursor-pointer p-4 sm:w-[15.5rem]"
  role="button"
  tabindex="0"
  onclick={onopen}
  onkeydown={handleKeydown}
>
  <div class="mb-3 flex items-center justify-between">
    <div class="rounded-xl bg-brand-50 p-2 text-brand-700">
      <Icon size={18} />
    </div>
    <ChevronRight size={16} class="text-slate-400 transition group-hover:text-brand-700" />
  </div>

  <p class="line-clamp-2 text-sm font-bold text-slate-800">{label}</p>
  <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{subtitle}</p>
</div>