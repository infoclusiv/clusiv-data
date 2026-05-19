<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { saveQuickTextGroup } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { QuickTextGroup } from "$lib/store/types";

  interface Props {
    open: boolean;
    onclose: () => void;
    editingGroup?: QuickTextGroup | null;
  }

  let {
    open,
    onclose,
    editingGroup = null,
  }: Props = $props();

  let name = $state("");
  let description = $state("");
  let nameError = $state<string | null>(null);
  let saving = $state(false);

  const isEditing = $derived(editingGroup !== null);

  $effect(() => {
    if (!open) {
      return;
    }

    name = editingGroup?.name ?? "";
    description = editingGroup?.description ?? "";
    nameError = null;
    saving = false;
  });

  async function handleSave(): Promise<void> {
    if (saving) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    nameError = null;
    if (!trimmedName) {
      nameError = "El nombre es obligatorio";
      return;
    }

    saving = true;

    try {
      await saveQuickTextGroup(
        {
          name: trimmedName,
          description: trimmedDescription,
        },
        editingGroup?.id ?? null,
      );
      showSnackbar(isEditing ? "Grupo actualizado." : "Grupo creado.", "success");
      onclose();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar el grupo.",
        "error",
      );
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  {open}
  title={isEditing ? "Editar Grupo" : "Nuevo Grupo"}
  onclose={onclose}
  widthClass="max-w-lg"
>
  {#snippet children()}
    <div class="flex flex-col gap-4">
      <Input
        label="Nombre del grupo"
        bind:value={name}
        error={nameError}
        autofocus={true}
      />

      <Input
        label="Descripción opcional"
        bind:value={description}
        multiline={true}
        rows={4}
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
