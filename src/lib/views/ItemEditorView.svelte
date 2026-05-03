<script lang="ts">
  import { ImagePlus, Trash2, Upload } from "lucide-svelte";

  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { appState, closeItemEditor, saveItem } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import {
    getCategoryOptions,
    getItemCategoryId,
    normalizeItemImages,
  } from "$lib/utils/categoryUtils";
  import { GENERAL_CATEGORY_ID } from "$lib/utils/constants";
  import type { ItemImage, ItemType } from "$lib/store/types";

  let title = $state("");
  let comment = $state("");
  let itemType = $state<ItemType>("task");
  let categoryId = $state(GENERAL_CATEGORY_ID);
  let images = $state<ItemImage[]>([]);
  let selectedImageId = $state<string | null>(null);
  let titleError = $state<string | null>(null);
  let saving = $state(false);
  let importingImages = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);
  let contentControl = $state<HTMLTextAreaElement | null>(null);

  const editorState = $derived(appState.itemEditor);
  const editingItem = $derived(editorState?.editingItem ?? null);
  const editingIndex = $derived(editorState?.editingIndex ?? null);
  const editorTitle = $derived(editorState?.title ?? "Nuevo Elemento");
  const selectedImage = $derived(
    selectedImageId
      ? images.find((image) => image.id === selectedImageId) ?? null
      : null,
  );
  const categoryOptions = $derived(
    appState.appData
      ? getCategoryOptions(appState.appData).map(([value, label]) => ({ value, label }))
      : [],
  );

  $effect(() => {
    if (!editorState) {
      selectedImageId = null;
      return;
    }

    titleError = null;
    saving = false;

    if (editorState.editingItem) {
      title = editorState.editingItem.title;
      comment = editorState.editingItem.comment;
      itemType = editorState.editingItem.type;
      categoryId = getItemCategoryId(editorState.editingItem);
      images = [...normalizeItemImages(editorState.editingItem.images)];
      return;
    }

    title = "";
    comment = "";
    itemType = editorState.initialType;
    categoryId = editorState.initialCategoryId ?? GENERAL_CATEGORY_ID;
    images = [];
  });

  $effect(() => {
    if (!editorState || !contentControl) {
      return;
    }

    queueMicrotask(() => contentControl?.focus());
  });

  $effect(() => {
    if (!selectedImageId) {
      return;
    }

    if (!images.some((image) => image.id === selectedImageId)) {
      selectedImageId = null;
    }
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
    if (appState.currentView !== "item-editor" || itemType !== "note") {
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

  function openImagePreview(imageId: string): void {
    selectedImageId = imageId;
  }

  function closeImagePreview(): void {
    selectedImageId = null;
  }

  function getSerializableImages(): ItemImage[] {
    return normalizeItemImages(
      images.map((image) => ({
        id: image.id,
        data_url: image.data_url,
        name: image.name,
      })),
    );
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
    const nextImages = itemType === "note" ? getSerializableImages() : [];

    try {
      await saveItem(
        {
          title: trimmedTitle,
          comment: comment.trim(),
          images: nextImages,
          type: itemType,
          categoryId,
        },
        editingIndex,
      );
      showSnackbar(editingItem ? "Elemento actualizado." : "Elemento creado.", "success");
      closeItemEditor();
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

{#if editorState}
  <div class="page-panel flex h-full flex-1 flex-col">
    <div class="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-6 lg:px-8">
      <div class="min-w-0">
        <p class="section-label">Editor de elemento</p>
        <h1 class="mt-2 text-2xl font-semibold text-slate-900 lg:text-3xl">{editorTitle}</h1>
        <p class="mt-2 text-sm text-slate-500">
          {itemType === "note"
            ? "El contenido ocupa la vista principal y las imágenes quedan justo debajo."
            : "Usa esta vista ampliada para redactar y clasificar la tarea con más espacio."}
        </p>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <button type="button" class="btn-ghost" onclick={closeItemEditor} disabled={saving}>Cancelar</button>
        <button type="button" class="btn-primary" onclick={() => void handleSave()} disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-5 lg:px-8 lg:py-7">
      <div class="grid min-h-full gap-6 pb-10 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <div class="overflow-visible">
          <div class="flex flex-col gap-4">
            <section class="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm">
              <p class="section-label">Tipo</p>
              <div class="mt-4 grid gap-3">
                <label class="card cursor-pointer p-3 text-sm text-slate-700">
                  <div class="flex items-center gap-2">
                    <input
                      type="radio"
                      bind:group={itemType}
                      value="task"
                      class="accent-brand-700"
                      disabled={saving}
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
                      disabled={saving}
                    />
                    Nota
                  </div>
                </label>
              </div>
            </section>

            <section class="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm">
              <Input
                label={itemType === "note" ? "Título (opcional)" : "Título"}
                bind:value={title}
                error={titleError}
                placeholder={itemType === "note"
                  ? "Si lo dejas vacío, se usará la primera línea del contenido."
                  : "Escribe un título"}
                disabled={saving}
              />
            </section>

            <section class="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm">
              <Select label="Categoría" bind:value={categoryId} options={categoryOptions} />
            </section>
          </div>
        </div>

        <div class="overflow-visible">
          <div class="flex flex-col gap-6">
            <section class="flex min-h-[24rem] flex-col rounded-[1.75rem] border border-slate-200/80 bg-paper-50/80 p-5 shadow-soft backdrop-blur-sm lg:p-6">
              <div class="mb-4">
                <p class="section-label">Contenido / Comentario</p>
                <p class="mt-2 text-sm text-slate-500">
                  {itemType === "note"
                    ? "Este espacio es la vista principal del editor."
                    : "Añade contexto, pasos o detalles que necesites conservar."}
                </p>
              </div>

              <textarea
                bind:this={contentControl}
                bind:value={comment}
                placeholder={itemType === "note" ? "Escribe tu nota aquí..." : "Detalles adicionales"}
                disabled={saving}
                class="input-base min-h-[24rem] flex-1 resize-none px-4 py-3 text-[15px] leading-6"
              ></textarea>
            </section>

            {#if itemType === "note"}
              <section class="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-soft backdrop-blur-sm lg:p-6">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="section-label">Imágenes</p>
                    <p class="mt-2 text-sm text-slate-500">
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
                    disabled={importingImages || saving}
                  >
                    <Upload size={16} />
                    {importingImages ? "Cargando..." : "Seleccionar imágenes"}
                  </button>
                </div>

                <div class="rounded-[1.25rem] border border-dashed border-slate-300/80 bg-white/70 px-4 py-3 text-sm text-slate-500">
                  <div class="flex items-center gap-2 text-slate-600">
                    <ImagePlus size={16} />
                    <span>Con el editor abierto también puedes pegar imágenes directamente desde el portapapeles.</span>
                  </div>
                </div>

                {#if images.length === 0}
                  <div class="rounded-[1.25rem] bg-white/75 px-4 py-6 text-center text-sm text-slate-500">
                    Esta nota todavía no tiene imágenes.
                  </div>
                {:else}
                  <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {#each images as image (image.id)}
                      <div class="overflow-hidden rounded-[1.25rem] border border-white/80 bg-white shadow-sm">
                        <div class="aspect-[4/3] bg-slate-100">
                          <button
                            type="button"
                            class="h-full w-full cursor-zoom-in"
                            onclick={() => openImagePreview(image.id)}
                            title="Ver imagen completa"
                            aria-label={`Ver imagen completa: ${image.name}`}
                          >
                            <img src={image.data_url} alt={image.name} class="h-full w-full object-cover" />
                          </button>
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
              </section>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<Modal
  open={selectedImage !== null}
  title={selectedImage?.name ?? "Imagen"}
  onclose={closeImagePreview}
  widthClass="max-w-6xl"
>
  {#snippet children()}
    {#if selectedImage}
      <div class="rounded-[1.5rem] bg-slate-950/95 p-4">
        <img
          src={selectedImage.data_url}
          alt={selectedImage.name}
          class="max-h-[75vh] w-full rounded-[1.25rem] object-contain"
        />
      </div>
    {/if}
  {/snippet}
</Modal>
