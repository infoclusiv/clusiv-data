<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";

  interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let {
    open,
    title,
    message,
    confirmLabel = "Confirmar",
    onconfirm,
    oncancel,
  }: Props = $props();
</script>

<Modal {open} {title} onclose={oncancel} widthClass="max-w-md">
  {#snippet children()}
    <p class="text-sm leading-relaxed text-slate-600">{message}</p>
  {/snippet}

  {#snippet actions()}
    <Button onclick={oncancel}>Cancelar</Button>
    <Button variant="danger" onclick={() => onconfirm()}>{confirmLabel}</Button>
  {/snippet}
</Modal>