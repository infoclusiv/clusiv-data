<script lang="ts">
  import type { ComponentType } from "svelte";

  type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

  interface Props {
    icon: ComponentType;
    label: string;
    tone?: Tone;
    onclick?: (event: MouseEvent) => void;
    disabled?: boolean;
    class?: string;
  }

  let {
    icon: Icon,
    label,
    tone = "neutral",
    onclick,
    disabled = false,
    class: className = "",
  }: Props = $props();

  const toneClasses = {
    neutral: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    accent: "text-brand-700 hover:bg-brand-50 hover:text-brand-800",
    success: "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
    warning: "text-amber-700 hover:bg-amber-50 hover:text-amber-800",
    danger: "text-red-700 hover:bg-red-50 hover:text-red-800",
  };
</script>

<button
  class={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-45 ${toneClasses[tone]} ${className}`.trim()}
  {disabled}
  onclick={onclick}
  title={label}
  aria-label={label}
>
  <Icon size={18} />
</button>