<script lang="ts">
  import { ImagePlus, Trash2, Upload } from "lucide-svelte";

  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { appState, saveItem } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import {
    getCategoryOptions,
    getItemCategoryId,
    normalizeItemImages,
  } from "$lib/utils/categoryUtils";
  import { GENERAL_CATEGORY_ID } from "$lib/utils/constants";
  import type { Item, ItemImage, ItemType } from "$lib/store/types";

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
  let images = $state<ItemImage[]>([]);
  let titleError = $state<string | null>(null);
  let saving = $state(false);
  let importingImages = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

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
      images = [...normalizeItemImages(editingItem.images)];
      return;
    }

    title = "";
    comment = "";
    itemType = initialType;
    categoryId = initialCategoryId ?? GENERAL_CATEGORY_ID;
    images = [];
  });

  $effect(() => {
    if (itemType === "note") {
      titleError = null;
    }
  });

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("No se pudo leer la imagen."));
      };
      reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    });
  }

  async function buildItemImage(file: File): Promise<ItemImage> {
    return {
      id: crypto.randomUUID(),
      data_url: await readFileAsDataUrl(file),
      name: file.name || "Imagen",
    };
  }

  async function addImages(nextFiles: File[]): Promise<void> {
    const imageFiles = nextFiles.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      return;
    }

    importingImages = true;

    try {
      const nextImages = await Promise.all(imageFiles.map((file) => buildItemImage(file)));
      images = [...images, ...nextImages];
      showSnackbar(
        nextImages.length === 1 ? "Imagen añadida." : `${nextImages.length} imágenes añadidas.`,
        "success",
        1800,
      );
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudieron cargar las imágenes.",
        "error",
      );
    } finally {
      importingImages = false;
      if (fileInput) {
        fileInput.value = "";
      }
    }
  }

  async function handleFileSelection(event: Event): Promise<void> {
    const target = event.currentTarget as HTMLInputElement | null;
    const nextFiles = Array.from(target?.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    await addImages(nextFiles);
  }

  async function handlePaste(event: ClipboardEvent): Promise<void> {
    if (!open || itemType !== "note") {
      return;
    }

    const nextFiles = Array.from(event.clipboardData?.items ?? [])
      .map((item) => item.kind === "file" && item.type.startsWith("image/") ? item.getAsFile() : null)
      .filter((file): file is File => file !== null);

    if (nextFiles.length === 0) {
      return;
    }

    event.preventDefault();
    await addImages(nextFiles);
  }

  function removeImage(imageId: string): void {
    images = images.filter((image) => image.id !== imageId);
  }

  async function handleSave(): Promise<void> {
    if (saving) {
      return;
    }

    const trimmedTitle = title.trim();
    if (itemType === "task" && !trimmedTitle) {
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
          images: itemType === "note" ? images : [],
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

<svelte:window onpaste={handlePaste} />

<Modal
  {open}
  title={editingItem ? "Editar Elemento" : dialogTitle}
  onclose={onclose}
  widthClass="max-w-4xl"
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

      <Input
        label={itemType === "note" ? "Título (opcional)" : "Título"}
        bind:value={title}
        error={titleError}
        placeholder={itemType === "note" ? "Si lo dejas vacío, se usará la primera línea del contenido." : "Escribe un título"}
        autofocus={true}
      />
      <Select label="Categoría" bind:value={categoryId} options={categoryOptions} />
      <Input
        label="Contenido / Comentario"
        bind:value={comment}
        multiline={true}
        rows={5}
        placeholder={itemType === "note" ? "Escribe tu nota aquí..." : "Detalles adicionales"}
      />

      {#if itemType === "note"}
        <div class="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200/80 bg-paper-50/70 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="section-label">Imágenes</p>
              <p class="mt-1 text-sm text-slate-500">
                Pega una imagen con Ctrl+V o selecciónala desde tu PC.
              </p>
            </div>

            <input
              bind:this={fileInput}
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              onchange={(event) => void handleFileSelection(event)}
            />

            <button
              type="button"
              class="btn-ghost bg-white/80"
              onclick={() => fileInput?.click()}
              disabled={importingImages}
            >
              <Upload size={16} />
              {importingImages ? "Cargando..." : "Seleccionar imágenes"}
            </button>
          </div>

          <div class="rounded-[1.25rem] border border-dashed border-slate-300/80 bg-white/70 px-4 py-3 text-sm text-slate-500">
            <div class="flex items-center gap-2 text-slate-600">
              <ImagePlus size={16} />
              <span>Con el diálogo abierto también puedes pegar imágenes directamente desde el portapapeles.</span>
            </div>
          </div>

          {#if images.length === 0}
            <div class="rounded-[1.25rem] bg-white/75 px-4 py-5 text-center text-sm text-slate-500">
              Esta nota todavía no tiene imágenes.
            </div>
          {:else}
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {#each images as image (image.id)}
                <div class="overflow-hidden rounded-[1.25rem] border border-white/80 bg-white shadow-sm">
                  <div class="aspect-[4/3] bg-slate-100">
                    <img src={image.data_url} alt={image.name} class="h-full w-full object-cover" />
                  </div>

                  <div class="flex items-center gap-2 px-3 py-2">
                    <p class="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">
                      {image.name}
                    </p>

                    <button
                      type="button"
                      class="rounded-lg p-1.5 text-red-500 transition hover:bg-red-100"
                      onclick={() => removeImage(image.id)}
                      title="Quitar imagen"
                      aria-label="Quitar imagen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet actions()}
    <Button onclick={onclose}>Cancelar</Button>
    <Button variant="primary" onclick={() => void handleSave()} disabled={saving}>
      {saving ? "Guardando..." : "Guardar"}
    </Button>
  {/snippet}
</Modal>