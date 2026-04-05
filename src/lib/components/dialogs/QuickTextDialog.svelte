<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { saveQuickText } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { QuickText } from "$lib/store/types";

  interface Props {
    open: boolean;
    onclose: () => void;
    editingQuickText?: QuickText | null;
  }

  let {
    open,
    onclose,
    editingQuickText = null,
  }: Props = $props();

  let title = $state("");
  let content = $state("");
  let contentError = $state<string | null>(null);
  let saving = $state(false);

  $effect(() => {
    if (!open) {
      return;
    }

    title = editingQuickText?.title ?? "";
    content = editingQuickText?.content ?? "";
    contentError = null;
    saving = false;
  });

  async function handleSave(): Promise<void> {
    if (saving) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    contentError = null;
    if (!trimmedContent) {
      contentError = "El contenido es obligatorio";
      return;
    }

    saving = true;

    try {
      await saveQuickText(
        {
          title: trimmedTitle,
          content: trimmedContent,
        },
        editingQuickText?.id ?? null,
      );
      showSnackbar(
        editingQuickText ? "Texto rápido actualizado." : "Texto rápido creado.",
        "success",
      );
      onclose();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar el texto rápido.",
        "error",
      );
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  {open}
  title={editingQuickText ? "Editar Texto Rápido" : "Nuevo Texto Rápido"}
  onclose={onclose}
  widthClass="max-w-2xl"
>
  {#snippet children()}
    <div class="flex flex-col gap-4">
      <Input
        label="Título (opcional)"
        bind:value={title}
        placeholder="Ejemplo: Firma, respuesta rápida, dirección..."
        autofocus={true}
      />

      <Input
        label="Contenido"
        bind:value={content}
        error={contentError}
        multiline={true}
        rows={8}
        placeholder="Escribe el texto que quieres guardar para copiar rápido..."
      />
    </div>
  {/snippet}

  {#snippet actions()}
    <Button onclick={onclose}>Cancelar</Button>
    <Button variant="primary" onclick={() => void handleSave()} disabled={saving}>
      {saving ? "Guardando..." : "Guardar"}
    </Button>
  {/snippet}
</Modal>