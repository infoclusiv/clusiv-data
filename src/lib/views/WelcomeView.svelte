<script lang="ts">
  import { Pencil } from "lucide-svelte";

  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { appState, saveHomeText } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";

  let isEditorOpen = $state(false);
  let draftHomeText = $state("");
  let saving = $state(false);

  const homeText = $derived(appState.appData?.__SYSTEM_HOME_TEXT__ ?? "");

  function openEditor(): void {
    draftHomeText = homeText;
    isEditorOpen = true;
  }

  function closeEditor(): void {
    if (saving) {
      return;
    }

    isEditorOpen = false;
  }

  async function handleSave(): Promise<void> {
    saving = true;

    try {
      await saveHomeText(draftHomeText);
      isEditorOpen = false;
      showSnackbar("Texto de inicio guardado.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar el texto de inicio.",
        "error",
      );
    } finally {
      saving = false;
    }
  }
</script>

<div class="relative flex h-full w-full flex-1 items-center justify-center overflow-hidden bg-white px-8 py-12">
  <button
    type="button"
    class="absolute right-5 top-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    onclick={openEditor}
    aria-label="Editar texto de inicio"
    title="Editar texto de inicio"
  >
    <Pencil size={14} />
    Editar
  </button>

  <div class="max-w-4xl text-center">
    <p class="whitespace-pre-wrap font-serif text-4xl italic leading-[1.7] text-slate-700 md:text-5xl">
      {homeText}
    </p>
  </div>
</div>

<Modal
  open={isEditorOpen}
  title="Editar texto de inicio"
  onclose={closeEditor}
  widthClass="max-w-2xl"
>
  {#snippet children()}
    <Input
      label="Texto"
      bind:value={draftHomeText}
      multiline={true}
      rows={8}
      autofocus={true}
      disabled={saving}
      placeholder="Escribe el texto que quieres ver al abrir Clusiv Data."
      spellcheck={true}
    />
  {/snippet}

  {#snippet actions()}
    <Button onclick={closeEditor} disabled={saving}>Cancelar</Button>
    <Button variant="primary" onclick={() => void handleSave()} disabled={saving}>
      {saving ? "Guardando..." : "Guardar"}
    </Button>
  {/snippet}
</Modal>
