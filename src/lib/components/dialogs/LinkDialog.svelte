<script lang="ts">
  import { ImagePlus, Trash2, Upload } from "lucide-svelte";

  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { addLink, updateLink } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { ItemImage, Link } from "$lib/store/types";
  import { normalizeItemImages } from "$lib/utils/categoryUtils";

  interface Props {
    open: boolean;
    categoryId: string;
    editingLink?: Link | null;
    editingLinkIndex?: number | null;
    onclose: () => void;
  }

  let {
    open,
    categoryId,
    editingLink = null,
    editingLinkIndex = null,
    onclose,
  }: Props = $props();

  let linkTitle = $state("");
  let linkUrl = $state("");
  let linkComments = $state("");
  let images = $state<ItemImage[]>([]);
  let selectedImageId = $state<string | null>(null);
  let urlError = $state<string | null>(null);
  let saving = $state(false);
  let importingImages = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

  const isEditing = $derived(editingLink !== null && editingLinkIndex !== null);
  const selectedImage = $derived(
    selectedImageId
      ? images.find((image) => image.id === selectedImageId) ?? null
      : null,
  );

  $effect(() => {
    if (!open) {
      return;
    }

    linkTitle = editingLink?.title ?? "";
    linkUrl = editingLink?.url ?? "";
    linkComments = editingLink?.comments ?? "";
    images = editingLink ? [...normalizeItemImages(editingLink.images)] : [];
    selectedImageId = null;
    urlError = null;
    saving = false;
    importingImages = false;
  });

  $effect(() => {
    if (!selectedImageId) {
      return;
    }

    if (!images.some((image) => image.id === selectedImageId)) {
      selectedImageId = null;
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

  async function buildLinkImage(file: File): Promise<ItemImage> {
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
      const nextImages = await Promise.all(imageFiles.map((file) => buildLinkImage(file)));
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
    if (!open) {
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
    const url = linkUrl.trim();
    if (!url) {
      urlError = "URL requerida";
      return;
    }

    saving = true;

    try {
      const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
      const normalizedTitle = linkTitle.trim() || normalizedUrl;
      const normalizedComments = linkComments;
      const nextImages = getSerializableImages();

      if (isEditing && editingLinkIndex !== null) {
        await updateLink(categoryId, editingLinkIndex, {
          title: normalizedTitle,
          url: normalizedUrl,
          images: nextImages,
          comments: normalizedComments,
        });
        showSnackbar("Enlace actualizado.", "success");
      } else {
        await addLink(categoryId, {
          title: normalizedTitle,
          url: normalizedUrl,
          images: nextImages,
          comments: normalizedComments,
        });
        showSnackbar("Enlace agregado.", "success");
      }

      onclose();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar el enlace.",
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
  title={isEditing ? "Editar Enlace" : "Nuevo Enlace"}
  onclose={onclose}
  widthClass="max-w-4xl"
>
  {#snippet children()}
    <div class="flex flex-col gap-4">
      <Input label="Titulo (Opcional)" bind:value={linkTitle} disabled={saving} />
      <Input label="URL" bind:value={linkUrl} error={urlError} autofocus={true} disabled={saving} />

      <section class="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-5 shadow-soft backdrop-blur-sm">
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
            <span>Con este diálogo abierto también puedes pegar imágenes directamente desde el portapapeles.</span>
          </div>
        </div>

        {#if images.length === 0}
          <div class="rounded-[1.25rem] bg-white/75 px-4 py-6 text-center text-sm text-slate-500">
            Este enlace todavía no tiene imágenes.
          </div>
        {:else}
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

      <Input
        label="Comentarios"
        bind:value={linkComments}
        multiline={true}
        rows={4}
        placeholder="Agrega notas o contexto sobre este enlace..."
        disabled={saving}
      />
    </div>
  {/snippet}

  {#snippet actions()}
    <Button onclick={onclose}>Cancelar</Button>
    <Button variant="primary" onclick={() => void handleSave()} disabled={saving}>
      {saving ? "Guardando..." : isEditing ? "Actualizar" : "Guardar"}
    </Button>
  {/snippet}
</Modal>

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
