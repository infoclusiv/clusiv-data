<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { addLink, updateLink } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { Link } from "$lib/store/types";

  interface Props {
    open: boolean;
    categoryId: string;
    editingLink?: Link | null;
    editingLinkIndex?: number | null;
    onclose: () => void;
  }

  let {
    open,
    categoryId,
    editingLink = null,
    editingLinkIndex = null,
    onclose,
  }: Props = $props();

  let linkTitle = $state("");
  let linkUrl = $state("");
  let urlError = $state<string | null>(null);
  let saving = $state(false);

  const isEditing = $derived(editingLink !== null && editingLinkIndex !== null);

  $effect(() => {
    if (!open) {
      return;
    }

    linkTitle = editingLink?.title ?? "";
    linkUrl = editingLink?.url ?? "";
    urlError = null;
    saving = false;
  });

  async function handleSave(): Promise<void> {
    const url = linkUrl.trim();
    if (!url) {
      urlError = "URL requerida";
      return;
    }

    saving = true;

    try {
      const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
      const normalizedTitle = linkTitle.trim() || normalizedUrl;

      if (isEditing && editingLinkIndex !== null) {
        await updateLink(categoryId, editingLinkIndex, {
          title: normalizedTitle,
          url: normalizedUrl,
        });
        showSnackbar("Enlace actualizado.", "success");
      } else {
        await addLink(categoryId, {
          title: normalizedTitle,
          url: normalizedUrl,
        });
        showSnackbar("Enlace agregado.", "success");
      }

      onclose();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar el enlace.",
        "error",
      );
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  {open}
  title={isEditing ? "Editar Enlace" : "Nuevo Enlace"}
  onclose={onclose}
  widthClass="max-w-lg"
>
  {#snippet children()}
    <div class="flex flex-col gap-4">
      <Input label="Titulo (Opcional)" bind:value={linkTitle} />
      <Input label="URL" bind:value={linkUrl} error={urlError} autofocus={true} />
    </div>
  {/snippet}

  {#snippet actions()}
    <Button onclick={onclose}>Cancelar</Button>
    <Button variant="primary" onclick={() => void handleSave()} disabled={saving}>
      {saving ? "Guardando..." : isEditing ? "Actualizar" : "Guardar"}
    </Button>
  {/snippet}
</Modal>
