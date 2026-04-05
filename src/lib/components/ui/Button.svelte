<script lang="ts">
  import type { Snippet } from "svelte";

  type ButtonVariant = "primary" | "ghost" | "danger";

  interface Props {
    variant?: ButtonVariant;
    disabled?: boolean;
    onclick?: (event: MouseEvent) => void;
    type?: "button" | "submit";
    class?: string;
    children?: Snippet;
  }

  let {
    variant = "ghost",
    disabled = false,
    onclick,
    type = "button",
    class: className = "",
    children,
  }: Props = $props();

  const classes = {
    primary: "btn-primary",
    ghost: "btn-ghost",
    danger: "btn-danger",
  };
</script>

<button
  {type}
  {disabled}
  class={`${classes[variant]} ${className}`.trim()}
  onclick={onclick}
>
  {#if children}
    {@render children()}
  {/if}
</button>