<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { saveQuickText } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import { normalizeQuickTextGroupIds } from "$lib/utils/categoryUtils";
  import type { QuickText, QuickTextGroup } from "$lib/store/types";

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
  let selectedGroupIds = $state<string[]>([]);
  let contentError = $state<string | null>(null);
  let saving = $state(false);

  const sortedQuickTextGroups = $derived(
    quickTextGroups
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order),
  );

  function getValidSelectedGroupIds(groupIds: string[]): string[] {
    const validGroupIds = new Set(quickTextGroups.map((group) => group.id));
    return groupIds.filter((groupId) => validGroupIds.has(groupId));
  }

  function toggleGroupSelection(groupId: string): void {
    selectedGroupIds = selectedGroupIds.includes(groupId)
      ? selectedGroupIds.filter((entry) => entry !== groupId)
      : [...selectedGroupIds, groupId];
  }

  $effect(() => {
    if (!open) {
      return;
    }

    title = editingQuickText?.title ?? "";
    content = editingQuickText?.content ?? "";
    selectedGroupIds = getValidSelectedGroupIds(
      normalizeQuickTextGroupIds({
        group_ids: editingQuickText?.group_ids,
        group_id: editingQuickText?.group_id ?? null,
      }),
    );
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
          group_ids: selectedGroupIds,
          group_id: selectedGroupIds[0] ?? null,
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

      <div class="flex flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-700">Grupos</p>
            <p class="mt-1 text-xs text-slate-500">Puedes seleccionar uno o varios grupos.</p>
          </div>

          {#if selectedGroupIds.length > 0}
            <button
              type="button"
              class="text-xs font-medium text-slate-500 transition hover:text-slate-700"
              onclick={() => (selectedGroupIds = [])}
            >
              Quitar todos
            </button>
          {/if}
        </div>

        {#if sortedQuickTextGroups.length === 0}
          <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
            No hay grupos creados. Si lo dejas asÃ­, el texto quedarÃ¡ en Textos sin grupo.
          </div>
        {:else}
          <div class="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            {#each sortedQuickTextGroups as group (group.id)}
              <label
                class="flex cursor-pointer items-start gap-3 rounded-2xl border border-transparent bg-white px-3 py-3 text-sm transition hover:border-slate-200 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  checked={selectedGroupIds.includes(group.id)}
                  onchange={() => toggleGroupSelection(group.id)}
                />

                <span class="min-w-0 flex-1">
                  <span class="block font-medium text-slate-700">{group.name}</span>
                  {#if group.description.trim().length > 0}
                    <span class="mt-1 block text-xs text-slate-500">{group.description}</span>
                  {/if}
                </span>
              </label>
            {/each}
          </div>
        {/if}
      </div>

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
