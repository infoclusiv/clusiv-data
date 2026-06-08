<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { appState, createFlow } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { AppData } from "$lib/store/types";
  import {
    buildFlowCategoryOptions,
    flowCategoryIdToValue,
    flowCategoryValueToId,
    UNLINKED_FLOW_OPTION_LABEL,
  } from "$lib/utils/flowCreateDialog";

  interface Props {
    open: boolean;
    onclose: () => void;
    oncreated?: ((flowId: string) => void) | null;
    initialCategoryId?: string | null;
    dialogTitle?: string;
  }

  let {
    open,
    onclose,
    oncreated = null,
    initialCategoryId = null,
    dialogTitle = "Nuevo flujo",
  }: Props = $props();

  let title = $state("");
  let selectedCategoryValue = $state("");
  let saving = $state(false);

  const categoryOptions = $derived(
    appState.appData ? buildFlowCategoryOptions(appState.appData as AppData) : [],
  );

  const selectedCategorySummary = $derived(
    categoryOptions.find((option) => option.value === selectedCategoryValue)?.label
      ?? UNLINKED_FLOW_OPTION_LABEL,
  );

  $effect(() => {
    if (!open) {
      return;
    }

    title = "";
    selectedCategoryValue = flowCategoryIdToValue(initialCategoryId);
    saving = false;
  });

  async function handleSave(): Promise<void> {
    if (saving) {
      return;
    }

    saving = true;

    try {
      const flowId = await createFlow({
        categoryId: flowCategoryValueToId(selectedCategoryValue),
        title: title.trim(),
      });

      showSnackbar("Flujo creado.", "success");
      oncreated?.(flowId);
      onclose();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo crear el flujo.",
        "error",
      );
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  {open}
  title={dialogTitle}
  onclose={onclose}
  widthClass="max-w-2xl"
>
  {#snippet children()}
    <div class="flex flex-col gap-4">
      <Input
        label="Titulo (opcional)"
        bind:value={title}
        placeholder="Ej. Flujo de aprobacion"
        autofocus={true}
        disabled={saving}
      />

      <Select
        label="Categoria"
        bind:value={selectedCategoryValue}
        options={categoryOptions}
        disabled={saving}
      />

      <div class="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
        {#if selectedCategoryValue === flowCategoryIdToValue(null)}
          El flujo se creara sin vincularse a ninguna categoria.
        {:else}
          El flujo se creara vinculado a: <span class="font-medium text-slate-700">{selectedCategorySummary}</span>.
        {/if}
      </div>
    </div>
  {/snippet}

  {#snippet actions()}
    <Button onclick={onclose} disabled={saving}>Cancelar</Button>
    <Button variant="primary" onclick={() => void handleSave()} disabled={saving}>
      {saving ? "Guardando..." : "Crear flujo"}
    </Button>
  {/snippet}
</Modal>
