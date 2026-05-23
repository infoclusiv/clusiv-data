<script lang="ts">
  import { Plus } from "lucide-svelte";

  import GlobalFlowLinkedNotes from "$lib/components/flows/GlobalFlowLinkedNotes.svelte";
  import QuickTextDialog from "$lib/components/dialogs/QuickTextDialog.svelte";
  import QuickTextGroupDialog from "$lib/components/dialogs/QuickTextGroupDialog.svelte";
  import QuickTextCreateMenu from "$lib/components/quick-texts/QuickTextCreateMenu.svelte";
  import QuickTextsGroupedView from "$lib/components/quick-texts/QuickTextsGroupedView.svelte";
  import QuickTextsListView from "$lib/components/quick-texts/QuickTextsListView.svelte";
  import QuickTextsViewToggle from "$lib/components/quick-texts/QuickTextsViewToggle.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import {
    appState,
    deleteQuickText,
    deleteQuickTextGroup,
    getItemIndex,
    linkNoteToGlobalQuickTexts,
    moveQuickTextInGroup,
    moveQuickTextGroup,
    openItemEditor,
    removeQuickTextFromGroup,
    unlinkNoteFromGlobalQuickTexts,
  } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import { getQuickTextGroups, getQuickTexts } from "$lib/utils/categoryUtils";
  import { getNoteById } from "$lib/utils/noteUtils";
  import type { QuickText, QuickTextGroup } from "$lib/store/types";

  type QuickTextsViewMode = "grouped" | "list";

  let viewMode = $state<QuickTextsViewMode>("grouped");
  let showCreateMenu = $state(false);
  let showQuickTextDialog = $state(false);
  let showQuickTextGroupDialog = $state(false);
  let editingQuickText = $state<QuickText | null>(null);
  let editingQuickTextGroup = $state<QuickTextGroup | null>(null);
  let pendingDeleteQuickTextId = $state<string | null>(null);
  let pendingRemoveQuickTextFromGroup = $state<{
    quickTextId: string;
    groupId: string;
    groupName: string;
  } | null>(null);
  let pendingDeleteQuickTextGroupId = $state<string | null>(null);

  const quickTexts = $derived(
    appState.appData ? getQuickTexts(appState.appData) : [],
  );
  const quickTextGroups = $derived(
    appState.appData ? getQuickTextGroups(appState.appData) : [],
  );
  const globalQuickTextLinkedNoteIds = $derived(
    appState.appData?.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__ ?? [],
  );

  function openLinkedNote(noteId: string): void {
    if (!appState.appData) {
      return;
    }

    const note = getNoteById(appState.appData, noteId);

    if (!note) {
      return;
    }

    openItemEditor({
      editingItem: note,
      editingIndex: getItemIndex(note),
    });
  }

  function openNewQuickText(): void {
    editingQuickText = null;
    showCreateMenu = false;
    showQuickTextDialog = true;
  }

  function openNewQuickTextGroup(): void {
    editingQuickTextGroup = null;
    showCreateMenu = false;
    showQuickTextGroupDialog = true;
  }

  function openEditDialog(quickText: QuickText): void {
    editingQuickText = quickText;
    showCreateMenu = false;
    showQuickTextDialog = true;
  }

  function openEditQuickTextGroup(group: QuickTextGroup): void {
    editingQuickTextGroup = group;
    showCreateMenu = false;
    showQuickTextGroupDialog = true;
  }

  async function handleMoveQuickTextGroup(
    group: QuickTextGroup,
    direction: "up" | "down",
  ): Promise<void> {
    try {
      await moveQuickTextGroup(group.id, direction);
      showSnackbar(
        direction === "up"
          ? "Grupo movido hacia arriba."
          : "Grupo movido hacia abajo.",
        "success",
        1800,
      );
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo mover el grupo.",
        "error",
      );
    }
  }

  async function handleMoveQuickTextInGroup(
    quickText: QuickText,
    group: QuickTextGroup,
    direction: "up" | "down",
  ): Promise<void> {
    try {
      await moveQuickTextInGroup(quickText.id, group.id, direction);
      showSnackbar(
        direction === "up"
          ? "Texto movido hacia arriba."
          : "Texto movido hacia abajo.",
        "success",
        1800,
      );
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo mover el texto en el grupo.",
        "error",
      );
    }
  }

  async function handleCopy(quickText: QuickText): Promise<void> {
    try {
      await navigator.clipboard.writeText(quickText.content);
      showSnackbar("Texto copiado al portapapeles.", "success", 1800);
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo copiar el texto.",
        "error",
      );
    }
  }

  async function handleDeleteQuickText(): Promise<void> {
    if (!pendingDeleteQuickTextId) {
      return;
    }

    try {
      await deleteQuickText(pendingDeleteQuickTextId);
      showSnackbar("Texto rápido eliminado.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo borrar el texto rápido.",
        "error",
      );
    } finally {
      pendingDeleteQuickTextId = null;
    }
  }

  async function handleDeleteQuickTextGroup(): Promise<void> {
    if (!pendingDeleteQuickTextGroupId) {
      return;
    }

    try {
      await deleteQuickTextGroup(pendingDeleteQuickTextGroupId);
      showSnackbar(
        "Grupo eliminado. Sus textos conservaron sus otros grupos o pasaron a Textos sin grupo.",
        "success",
      );
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo eliminar el grupo.",
        "error",
      );
    } finally {
      pendingDeleteQuickTextGroupId = null;
    }
  }

  async function handleRemoveQuickTextFromGroup(): Promise<void> {
    if (!pendingRemoveQuickTextFromGroup) {
      return;
    }

    const { quickTextId, groupId, groupName } = pendingRemoveQuickTextFromGroup;

    try {
      await removeQuickTextFromGroup(quickTextId, groupId);
      showSnackbar(`Texto quitado de ${groupName}.`, "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo quitar el texto del grupo.",
        "error",
      );
    } finally {
      pendingRemoveQuickTextFromGroup = null;
    }
  }
</script>

{#if appState.appData}
  <div class="page-panel relative flex h-full flex-1 flex-col overflow-hidden">
    <div class="flex items-start justify-between gap-4 border-b border-slate-200/70 px-8 py-7">
      <div>
        <p class="section-label">Global</p>
        <h1 class="mt-2 text-3xl font-semibold text-slate-900">Textos Rápidos</h1>
        <p class="mt-2 text-sm text-slate-500">
          Guarda textos reutilizables para copiarlos al portapapeles en un clic.
        </p>
      </div>

      <div class="rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
        {quickTexts.length === 1 ? "1 texto guardado" : `${quickTexts.length} textos guardados`}
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-8 py-6">
      <div class="mb-5 flex items-center justify-between gap-4">
        <QuickTextsViewToggle
          {viewMode}
          onchange={(nextViewMode) => (viewMode = nextViewMode)}
        />
      </div>

      {#if quickTexts.length === 0 && quickTextGroups.length === 0}
        <div class="card border-dashed p-10 text-center text-sm text-slate-500">
          Aquí aparecerán tus textos reutilizables. Crea el primero para copiarlo rápido cuando lo necesites.
        </div>
      {:else if viewMode === "grouped"}
        <QuickTextsGroupedView
          groups={quickTextGroups}
          {quickTexts}
          oncopy={(quickText) => void handleCopy(quickText)}
          onedit={(quickText) => openEditDialog(quickText)}
          ondelete={(quickText) => (pendingDeleteQuickTextId = quickText.id)}
          onremovefromgroup={(quickText, group) => {
            pendingRemoveQuickTextFromGroup = {
              quickTextId: quickText.id,
              groupId: group.id,
              groupName: group.name,
            };
          }}
          onmovequicktextingroup={(quickText, group, direction) =>
            void handleMoveQuickTextInGroup(quickText, group, direction)}
          oneditgroup={openEditQuickTextGroup}
          ondeletegroup={(group) => (pendingDeleteQuickTextGroupId = group.id)}
          onmovegroup={(group, direction) => void handleMoveQuickTextGroup(group, direction)}
        />
      {:else}
        <QuickTextsListView
          groups={quickTextGroups}
          {quickTexts}
          oncopy={(quickText) => void handleCopy(quickText)}
          onedit={(quickText) => openEditDialog(quickText)}
          ondelete={(quickText) => (pendingDeleteQuickTextId = quickText.id)}
        />
      {/if}

      <GlobalFlowLinkedNotes
        appData={appState.appData}
        linkedNoteIds={globalQuickTextLinkedNoteIds}
        onlinknote={(noteId) => void linkNoteToGlobalQuickTexts(noteId)}
        onunlinknote={(noteId) => void unlinkNoteFromGlobalQuickTexts(noteId)}
        onopennote={(noteId) => openLinkedNote(noteId)}
      />
    </div>

    <QuickTextCreateMenu
      open={showCreateMenu}
      onnewtext={openNewQuickText}
      onnewgroup={openNewQuickTextGroup}
    />

    <button
      class="fab"
      onclick={() => (showCreateMenu = !showCreateMenu)}
      title="Crear texto o grupo"
      aria-label="Crear texto o grupo"
    >
      <Plus size={22} />
    </button>
  </div>

  <QuickTextDialog
    open={showQuickTextDialog}
    quickTextGroups={quickTextGroups}
    onclose={() => {
      showQuickTextDialog = false;
      editingQuickText = null;
    }}
    {editingQuickText}
  />

  <QuickTextGroupDialog
    open={showQuickTextGroupDialog}
    editingGroup={editingQuickTextGroup}
    onclose={() => {
      showQuickTextGroupDialog = false;
      editingQuickTextGroup = null;
    }}
  />

  <ConfirmDialog
    open={pendingDeleteQuickTextId !== null}
    title="Eliminar Texto Rápido"
    message="¿Quieres borrar este texto rápido?"
    confirmLabel="Sí, borrar"
    oncancel={() => (pendingDeleteQuickTextId = null)}
    onconfirm={() => void handleDeleteQuickText()}
  />

  <ConfirmDialog
    open={pendingRemoveQuickTextFromGroup !== null}
    title="Quitar texto del grupo"
    message={pendingRemoveQuickTextFromGroup
      ? `¿Quieres quitar este texto de ${pendingRemoveQuickTextFromGroup.groupName}? El texto seguirá existiendo en sus otros grupos o en Textos sin grupo.`
      : ""}
    confirmLabel="Sí, quitar"
    oncancel={() => (pendingRemoveQuickTextFromGroup = null)}
    onconfirm={() => void handleRemoveQuickTextFromGroup()}
  />

  <ConfirmDialog
    open={pendingDeleteQuickTextGroupId !== null}
    title="Eliminar grupo"
    message="¿Quieres eliminar este grupo? Sus textos no se borrarán; conservarán sus otros grupos o pasarán a Textos sin grupo."
    confirmLabel="Sí, eliminar grupo"
    oncancel={() => (pendingDeleteQuickTextGroupId = null)}
    onconfirm={() => void handleDeleteQuickTextGroup()}
  />
{/if}
