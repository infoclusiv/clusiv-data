<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { appState, saveCategory } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import {
    buildCategoryRecord,
    getAvailableParentEntries,
    getCategory,
    isNameTakenUnderParent,
    resolveParentSelection,
    wouldCreateCycle,
  } from "$lib/utils/categoryUtils";
  import {
    CATEGORY_TYPE_NICHE,
    CATEGORY_TYPE_NOTEBOOK,
    GENERAL_CATEGORY_ID,
    GENERAL_CATEGORY_NAME,
    ICON_KEYS,
    ROOT_CATEGORY_OPTION,
  } from "$lib/utils/constants";
  import type { CategoryType } from "$lib/store/types";

  interface Props {
    open: boolean;
    onclose: () => void;
    editingCategoryId?: string | null;
    initialParentId?: string | null;
  }

  let {
    open,
    onclose,
    editingCategoryId = null,
    initialParentId = null,
  }: Props = $props();

  let name = $state("");
  let icon = $state("Carpeta");
  let categoryType = $state<CategoryType>(CATEGORY_TYPE_NICHE);
  let parentId = $state(ROOT_CATEGORY_OPTION);
  let nameError = $state<string | null>(null);
  let parentError = $state<string | null>(null);
  let saving = $state(false);

  const isEditing = $derived(Boolean(editingCategoryId));
  const isGeneral = $derived(editingCategoryId === GENERAL_CATEGORY_ID);

  const parentOptions = $derived(
    appState.appData
      ? [
          {
            value: ROOT_CATEGORY_OPTION,
            label: "Sin categoría padre (nivel superior)",
          },
          ...getAvailableParentEntries(appState.appData, editingCategoryId).map(
            ([value, label]) => ({ value, label }),
          ),
        ]
      : [{ value: ROOT_CATEGORY_OPTION, label: "Sin categoría padre (nivel superior)" }],
  );

  const iconOptions = ICON_KEYS.map((value) => ({ value, label: value }));

  $effect(() => {
    if (!open || !appState.appData) {
      return;
    }

    nameError = null;
    parentError = null;
    saving = false;

    if (editingCategoryId) {
      const category = getCategory(appState.appData, editingCategoryId);
      if (!category) {
        return;
      }

      name = category.name;
      icon = category.icon || "Carpeta";
      categoryType = category.type;
      parentId = category.parent_id ?? ROOT_CATEGORY_OPTION;
      return;
    }

    name = "";
    icon = "Carpeta";
    categoryType = CATEGORY_TYPE_NICHE;
    parentId = initialParentId ?? ROOT_CATEGORY_OPTION;
  });

  async function handleSave(): Promise<void> {
    if (!appState.appData || saving) {
      return;
    }

    const trimmedName = isGeneral ? GENERAL_CATEGORY_NAME : name.trim();
    const resolvedParentId = isGeneral ? null : resolveParentSelection(parentId);

    nameError = null;
    parentError = null;

    if (!trimmedName) {
      nameError = "Requerido";
      return;
    }

    if (
      editingCategoryId &&
      wouldCreateCycle(appState.appData, editingCategoryId, resolvedParentId)
    ) {
      parentError = "La categoría padre no es válida";
      return;
    }

    if (
      isNameTakenUnderParent(
        appState.appData,
        trimmedName,
        resolvedParentId,
        editingCategoryId,
      )
    ) {
      nameError = "Ya existe dentro de esa categoría padre";
      return;
    }

    saving = true;

    try {
      await saveCategory(
        {
          name: trimmedName,
          parentId: resolvedParentId,
          icon,
          type: categoryType,
        },
        editingCategoryId,
      );
      showSnackbar(
        isEditing ? "Categoría actualizada." : "Categoría creada.",
        "success",
      );
      onclose();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar la categoría.",
        "error",
      );
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  {open}
  title={isEditing ? "Editar Categoría" : "Nueva Categoría"}
  onclose={onclose}
  widthClass="max-w-lg"
>
  {#snippet children()}
    <div class="flex flex-col gap-4">
      {#if !isEditing}
        <div class="flex flex-col gap-2">
          <span class="section-label">Tipo</span>
          <div class="grid gap-2 sm:grid-cols-2">
            <label class="card cursor-pointer p-3 text-sm text-slate-700">
              <div class="flex items-center gap-2">
                <input
                  type="radio"
                  bind:group={categoryType}
                  value={CATEGORY_TYPE_NICHE}
                  class="accent-brand-700"
                />
                Nicho (con enlaces)
              </div>
            </label>
            <label class="card cursor-pointer p-3 text-sm text-slate-700">
              <div class="flex items-center gap-2">
                <input
                  type="radio"
                  bind:group={categoryType}
                  value={CATEGORY_TYPE_NOTEBOOK}
                  class="accent-brand-700"
                />
                Bloc de notas
              </div>
            </label>
          </div>
        </div>
      {:else}
        <p class="text-xs text-slate-500">
          Tipo: {categoryType === CATEGORY_TYPE_NOTEBOOK ? "Bloc de notas" : "Nicho (con enlaces)"}
          (no editable)
        </p>
      {/if}

      <Input
        label="Nombre"
        bind:value={name}
        error={nameError}
        disabled={isGeneral}
        autofocus={true}
      />

      <Select
        label="Categoría padre"
        bind:value={parentId}
        options={parentOptions}
        error={parentError}
        disabled={isGeneral}
      />

      <Select label="Icono" bind:value={icon} options={iconOptions} />
    </div>
  {/snippet}

  {#snippet actions()}
    <Button onclick={onclose}>Cancelar</Button>
    <Button variant="primary" onclick={() => void handleSave()} disabled={saving}>
      {saving ? "Guardando..." : "Guardar"}
    </Button>
  {/snippet}
</Modal>