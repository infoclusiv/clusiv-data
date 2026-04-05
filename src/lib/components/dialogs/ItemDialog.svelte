<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { appState, saveItem } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import { getCategoryOptions, getItemCategoryId } from "$lib/utils/categoryUtils";
  import { GENERAL_CATEGORY_ID } from "$lib/utils/constants";
  import type { Item, ItemType } from "$lib/store/types";

  interface Props {
    open: boolean;
    onclose: () => void;
    editingItem?: Item | null;
    editingIndex?: number | null;
    initialCategoryId?: string | null;
    initialType?: ItemType;
    dialogTitle?: string;
  }

  let {
    open,
    onclose,
    editingItem = null,
    editingIndex = null,
    initialCategoryId = null,
    initialType = "task",
    dialogTitle = "Nuevo Elemento",
  }: Props = $props();

  let title = $state("");
  let comment = $state("");
  let itemType = $state<ItemType>("task");
  let categoryId = $state(GENERAL_CATEGORY_ID);
  let titleError = $state<string | null>(null);
  let saving = $state(false);

  const categoryOptions = $derived(
    appState.appData
      ? getCategoryOptions(appState.appData).map(([value, label]) => ({ value, label }))
      : [],
  );

  $effect(() => {
    if (!open) {
      return;
    }

    titleError = null;
    saving = false;

    if (editingItem) {
      title = editingItem.title;
      comment = editingItem.comment;
      itemType = editingItem.type;
      categoryId = getItemCategoryId(editingItem);
      return;
    }

    title = "";
    comment = "";
    itemType = initialType;
    categoryId = initialCategoryId ?? GENERAL_CATEGORY_ID;
  });

  async function handleSave(): Promise<void> {
    if (saving) {
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      titleError = "El título es obligatorio";
      return;
    }

    titleError = null;
    saving = true;

    try {
      await saveItem(
        {
          title: trimmedTitle,
          comment: comment.trim(),
          type: itemType,
          categoryId,
        },
        editingIndex,
      );
      showSnackbar(
        editingItem ? "Elemento actualizado." : "Elemento creado.",
        "success",
      );
      onclose();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar el elemento.",
        "error",
      );
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  {open}
  title={editingItem ? "Editar Elemento" : dialogTitle}
  onclose={onclose}
  widthClass="max-w-2xl"
>
  {#snippet children()}
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <span class="section-label">Tipo</span>
        <div class="grid gap-2 sm:grid-cols-2">
          <label class="card cursor-pointer p-3 text-sm text-slate-700">
            <div class="flex items-center gap-2">
              <input
                type="radio"
                bind:group={itemType}
                value="task"
                class="accent-brand-700"
              />
              Tarea
            </div>
          </label>
          <label class="card cursor-pointer p-3 text-sm text-slate-700">
            <div class="flex items-center gap-2">
              <input
                type="radio"
                bind:group={itemType}
                value="note"
                class="accent-brand-700"
              />
              Nota
            </div>
          </label>
        </div>
      </div>

      <Input label="Título" bind:value={title} error={titleError} autofocus={true} />
      <Select label="Categoría" bind:value={categoryId} options={categoryOptions} />
      <Input
        label="Contenido / Comentario"
        bind:value={comment}
        multiline={true}
        rows={5}
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