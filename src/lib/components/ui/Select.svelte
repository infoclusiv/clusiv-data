<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    id?: string;
    label: string;
    value: string;
    options: Option[];
    error?: string | null;
    disabled?: boolean;
  }

  let {
    id = `select-${Math.random().toString(36).slice(2, 10)}`,
    label,
    value = $bindable(""),
    options,
    error = null,
    disabled = false,
  }: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
  <label class="section-label" for={id}>{label}</label>
  <select
    {id}
    bind:value
    {disabled}
    class={`input-base ${error ? "input-error" : ""}`.trim()}
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>

  {#if error}
    <p class="text-xs text-red-500">{error}</p>
  {/if}
</div>