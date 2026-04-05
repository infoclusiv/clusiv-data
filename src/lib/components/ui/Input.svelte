<script lang="ts">
  interface Props {
    id?: string;
    label: string;
    value: string;
    error?: string | null;
    multiline?: boolean;
    rows?: number;
    placeholder?: string;
    disabled?: boolean;
    autofocus?: boolean;
    type?: string;
  }

  let {
    id = `input-${Math.random().toString(36).slice(2, 10)}`,
    label,
    value = $bindable(""),
    error = null,
    multiline = false,
    rows = 3,
    placeholder = "",
    disabled = false,
    autofocus = false,
    type = "text",
  }: Props = $props();

  let control = $state<HTMLInputElement | HTMLTextAreaElement | null>(null);

  $effect(() => {
    if (!autofocus || !control) {
      return;
    }

    queueMicrotask(() => control?.focus());
  });
</script>

<div class="flex flex-col gap-1.5">
  <label class="section-label" for={id}>{label}</label>

  {#if multiline}
    <textarea
      bind:this={control}
      {id}
      bind:value
      {rows}
      {placeholder}
      {disabled}
      class={`input-base resize-none ${error ? "input-error" : ""}`.trim()}
    ></textarea>
  {:else}
    <input
      bind:this={control}
      {id}
      bind:value
      {type}
      {placeholder}
      {disabled}
      class={`input-base ${error ? "input-error" : ""}`.trim()}
    />
  {/if}

  {#if error}
    <p class="text-xs text-red-500">{error}</p>
  {/if}
</div>