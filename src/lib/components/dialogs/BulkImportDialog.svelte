<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { importLinks } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";

  interface Props {
    open: boolean;
    categoryId: string;
    onclose: () => void;
  }

  let { open, categoryId, onclose }: Props = $props();

  let rawText = $state("");
  let saving = $state(false);

  $effect(() => {
    if (open) {
      rawText = "";
      saving = false;
    }
  });

  async function handleProcess(): Promise<void> {
    if (saving) {
      return;
    }

    const links = rawText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((url) => ({
        title: url.startsWith("http") ? url : `https://${url}`,
        url: url.startsWith("http") ? url : `https://${url}`,
      }));

    if (links.length === 0) {
      onclose();
      return;
    }

    saving = true;

    try {
      await importLinks(categoryId, links);
      showSnackbar(`Se importaron ${links.length} enlaces.`, "success");
      onclose();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudieron importar los enlaces.",
        "error",
      );
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  {open}
  title="Importar Enlaces"
  onclose={onclose}
  widthClass="max-w-2xl"
>
  {#snippet children()}
    <textarea
      bind:value={rawText}
      rows="10"
      placeholder="Pega tus URLs aquí, una por línea..."
      class="input-base resize-none font-mono text-xs"
    ></textarea>
  {/snippet}

  {#snippet actions()}
    <Button onclick={onclose}>Cancelar</Button>
    <Button variant="primary" onclick={() => void handleProcess()} disabled={saving}>
      {saving ? "Procesando..." : "Procesar"}
    </Button>
  {/snippet}
</Modal>