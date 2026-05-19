<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { saveQuickText } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { QuickText, QuickTextGroup } from "$lib/store/types";

  const UNGROUPED_OPTION = "__UNGROUPED__";

  interface Props {
    open: boolean;
    onclose: () => void;
    editingQuickText?: QuickText | null;
    quickTextGroups?: QuickTextGroup[];
  }

  let {
    open,
    onclose,
    editingQuickText = null,
    quickTextGroups = [],
  }: Props = $props();

  let title = $state("");
  let content = $state("");
  let selectedGroupId = $state(UNGROUPED_OPTION);
  let contentError = $state<string | null>(null);
  let saving = $state(false);

  const groupOptions = $derived([
    { value: UNGROUPED_OPTION, label: "Textos sin grupo" },
    ...quickTextGroups
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((group) => ({
        value: group.id,
        label: group.name,
      })),
  ]);

  $effect(() => {
    if (!open) {
      return;
    }

    title = editingQuickText?.title ?? "";
    content = editingQuickText?.content ?? "";
    selectedGroupId = editingQuickText?.group_id ?? UNGROUPED_OPTION;
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
          group_id: selectedGroupId === UNGROUPED_OPTION ? null : selectedGroupId,
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

      <Select
        label="Grupo"
        bind:value={selectedGroupId}
        options={groupOptions}
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
