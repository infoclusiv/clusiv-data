<script lang="ts">
  import { ArrowLeft, Check, ChevronDown, ChevronRight, CirclePlus, Edit3, FileText, Filter, Layers, Link2, Minus, MoreHorizontal, Plus, Search, Target, Trash2, X, ZoomIn, ZoomOut } from "lucide-svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { appState, createConceptNode, deleteConceptNode, goBack, getItemIndex, openItemEditor, saveItem, setCategorySection, updateConceptNode, updateConceptNotes, updateConceptPosition } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import { CONCEPT_COLORS } from "$lib/utils/categoryUtils";
  import { conceptBounds, fitConceptCamera, zoomConceptCamera } from "$lib/utils/conceptMapViewport";
  import { tick } from "svelte";
  import type { MapPoint, MapCamera } from "$lib/utils/conceptMapViewport";
  import type { ConceptNode, Item } from "$lib/store/types";

  interface Props { categoryId: string; categoryName: string; }
  let { categoryId, categoryName }: Props = $props();

  const palette: Record<string, { stroke: string; pale: string; glow: string }> = {
    emerald: { stroke: "#0d9a72", pale: "#e6f9f1", glow: "#c0f3dd" },
    lime: { stroke: "#78a625", pale: "#f1f8de", glow: "#e4f5bd" },
    amber: { stroke: "#e59a27", pale: "#fff2db", glow: "#ffe1ad" },
    sky: { stroke: "#258cc8", pale: "#e3f4fc", glow: "#c8eafd" },
    teal: { stroke: "#15a78c", pale: "#e1f8f3", glow: "#c3f2e7" },
    violet: { stroke: "#8b76c7", pale: "#f0edfa", glow: "#e4dafb" },
    rose: { stroke: "#c77b8f", pale: "#fff0f2", glow: "#ffdce4" },
  };
  const allNodes = $derived(appState.appData?.__SYSTEM_CONCEPT_NODES__ ?? []);
  const nodes = $derived(allNodes.filter((node) => node.category_id === categoryId));
  const allNotes = $derived((appState.appData?.__SYSTEM_TASKS__ ?? []).filter((item) => item.type === "note"));
  let selectedId = $state<string | null>(null);
  let search = $state("");
  let noteQuery = $state("");
  let camera = $state<MapCamera>({ x: 0, y: 0, scale: 1 });
  let mapViewport = $state<HTMLDivElement | null>(null);
  let spaceHeld = $state(false);
  let altLeftHeld = $state(false);
  let isPanning = $state(false);
  let isDragging = $state(false);
  let dragPositions = $state<Record<string, MapPoint>>({});
  let suppressNodeClick = false;
  type NodeDrag = {
    id: string; pointerId: number; startX: number; startY: number;
    origin: MapPoint; moved: boolean;
  };
  let nodeDrag: NodeDrag | null = null;
  let panDrag: { pointerId: number; startX: number; startY: number; originX: number; originY: number } | null = null;
  let showCreate = $state(false);
  let editingConcept = $state(false);
  let newParentId = $state<string | null>(null);
  let draftTitle = $state("");
  let draftColor = $state("emerald");
  let activeTab = $state<"notes" | "children" | "related">("notes");
  let noteTitle = $state("");
  let noteBody = $state("");
  let isSaving = $state(false);
  let checkedIds = $state<string[]>([]);
  let showLinkPicker = $state(false);
  let sectionMenu = $state(false);
  let showDelete = $state(false);

  const selected = $derived(nodes.find((node) => node.id === selectedId) ?? null);
  const directNotes = $derived(allNotes.filter((note) => selected?.linked_note_ids.includes(note.id)));
  const availableNotes = $derived(allNotes.filter((note) => {
    const q = noteQuery.toLocaleLowerCase().trim();
    return !q || (note.title + " " + note.comment).toLocaleLowerCase().includes(q);
  }));
  const children = $derived(nodes.filter((node) => node.parent_id === selectedId));
  const visibleNodes = $derived(nodes.filter((node) =>
    !search.trim() || node.title.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()),
  ));

  // New concepts start in a radial layout. After a node is dragged, its
  // explicit saved position takes priority and never gets overwritten by layout.
  type Positioned = { node: ConceptNode; x: number; y: number; depth: number; color: string };
  const layout = $derived.by(() => {
    const allIds = new Set(nodes.map((node) => node.id));
    const childrenByParent = new Map<string, ConceptNode[]>();
    const roots: ConceptNode[] = [];
    for (const node of nodes) {
      if (!node.parent_id || !allIds.has(node.parent_id)) {
        roots.push(node);
      } else {
        const siblings = childrenByParent.get(node.parent_id) ?? [];
        siblings.push(node);
        childrenByParent.set(node.parent_id, siblings);
      }
    }
    const visited = new Set<string>();
    const result: Positioned[] = [];
    const put = (node: ConceptNode, angle: number, sector: number, depth: number): void => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      const radius = depth === 1 ? 235 : depth === 2 ? 415 : 415 + (depth - 2) * 175;
      const automatic = { x: 650 + Math.cos(angle) * radius, y: 440 + Math.sin(angle) * radius };
      const position = dragPositions[node.id] ?? node.position ?? automatic;
      result.push({ node, x: position.x, y: position.y, depth, color: node.color in palette ? node.color : "emerald" });
      const kids = childrenByParent.get(node.id) ?? [];
      const spread = Math.min(sector * .86, Math.PI * .80);
      kids.forEach((child, index) => put(child,
        angle + (index - (kids.length - 1) / 2) * spread / Math.max(1, kids.length - 1),
        spread / Math.max(1, kids.length), depth + 1));
    };
    roots.forEach((root, index) => put(root, -Math.PI / 2 + index * (2 * Math.PI / roots.length), 2 * Math.PI / roots.length, 1));
    return result;
  });
  const layoutById = $derived(new Map(layout.map((position) => [position.node.id, position])));

  function fitContent(): void {
    if (!mapViewport) return;
    const bounds = conceptBounds(layout);
    camera = fitConceptCamera(bounds, mapViewport.clientWidth, mapViewport.clientHeight);
  }

  function zoomByFactor(factor: number, anchor?: MapPoint): void {
    if (!mapViewport) return;
    camera = zoomConceptCamera(camera, anchor ?? {
      x: mapViewport.clientWidth / 2, y: mapViewport.clientHeight / 2,
    }, factor);
  }

  function wheelZoom(event: WheelEvent): void {
    // Require LEFT Alt, not AltGr/Right Alt. Do not steal ordinary scrolling.
    if (!mapViewport || !altLeftHeld || !event.altKey || selectedId) return;
    event.preventDefault();
    const rect = mapViewport.getBoundingClientRect();
    const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    zoomByFactor(Math.exp(-Math.max(-240, Math.min(240, event.deltaY)) * .0016), anchor);
  }

  function keyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const editable = target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
    if (event.code === "AltLeft" && !editable && !selectedId && !showCreate) {
      altLeftHeld = true;
      return;
    }
    if (event.code === "Space" && !editable && !selectedId && !showCreate && !showDelete) {
      event.preventDefault();
      spaceHeld = true;
    }
  }

  function keyUp(event: KeyboardEvent): void {
    if (event.code === "AltLeft") altLeftHeld = false;
    if (event.code === "Space") spaceHeld = false;
  }

  function cancelGestures(): void {
    nodeDrag = null;
    panDrag = null;
    isPanning = false;
    isDragging = false;
    spaceHeld = false;
    altLeftHeld = false;
    dragPositions = {};
  }

  // Rebind the listeners when the map view mounts again after opening a note.
  $effect(() => {
    const viewport = mapViewport;
    if (!viewport) return;
    viewport.addEventListener("wheel", wheelZoom, { passive: false });
    const observer = new ResizeObserver(() => fitContent());
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      viewport.removeEventListener("wheel", wheelZoom);
    };
  });

  $effect(() => {
    categoryId;
    selectedId = null;
    search = "";
    dragPositions = {};
    nodeDrag = null;
    panDrag = null;
    spaceHeld = false;
    altLeftHeld = false;
    requestAnimationFrame(() => fitContent());
  });

  function nodePointerDown(event: PointerEvent, id: string): void {
    if (event.button !== 0 || spaceHeld) return;
    const current = layoutById.get(id);
    if (!current) return;
    event.stopPropagation();
    suppressNodeClick = false;
    nodeDrag = {
      id, pointerId: event.pointerId, startX: event.clientX,
      startY: event.clientY, origin: { x: current.x, y: current.y }, moved: false,
    };
    (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
  }

  function viewportPointerDown(event: PointerEvent): void {
    if ((!spaceHeld || event.button !== 0) && event.button !== 1) return;
    event.preventDefault();
    panDrag = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      originX: camera.x, originY: camera.y,
    };
    isPanning = true;
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  }

  function viewportPointerMove(event: PointerEvent): void {
    if (nodeDrag?.pointerId === event.pointerId) {
      const dx = event.clientX - nodeDrag.startX;
      const dy = event.clientY - nodeDrag.startY;
      if (Math.hypot(dx, dy) > 4) nodeDrag.moved = true;
      if (!nodeDrag.moved) return;
      isDragging = true;
      dragPositions = {
        ...dragPositions,
        [nodeDrag.id]: {
          x: nodeDrag.origin.x + dx / camera.scale,
          y: nodeDrag.origin.y + dy / camera.scale,
        },
      };
    } else if (panDrag?.pointerId === event.pointerId) {
      camera = {
        ...camera,
        x: panDrag.originX + event.clientX - panDrag.startX,
        y: panDrag.originY + event.clientY - panDrag.startY,
      };
    }
  }

  // Serialize multiple drops on the same item. Fast successive drags should
  // never allow an older save to overwrite the final position.
  const positionWrites = new Map<string, Promise<void>>();
  async function commitNodePosition(id: string, position: MapPoint): Promise<void> {
    const previous = positionWrites.get(id) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
      try {
        await updateConceptPosition(id, position);
      } catch (error) {
        showSnackbar(error instanceof Error ? error.message : "No se pudo guardar la posición.", "error");
      } finally {
        const optimistic = dragPositions[id];
        if (optimistic && optimistic.x === position.x && optimistic.y === position.y) {
          const updated = { ...dragPositions };
          delete updated[id];
          dragPositions = updated;
        }
      }
    });
    positionWrites.set(id, current);
    await current;
    if (positionWrites.get(id) === current) positionWrites.delete(id);
  }

  function viewportPointerUp(event: PointerEvent): void {
    if (panDrag?.pointerId === event.pointerId) {
      panDrag = null;
      isPanning = false;
    }
    if (nodeDrag?.pointerId === event.pointerId) {
      const current = nodeDrag;
      nodeDrag = null;
      isDragging = false;
      if (current.moved) {
        suppressNodeClick = true;
        const position = dragPositions[current.id];
        if (position) void commitNodePosition(current.id, position);
      }
    }
  }

  function viewportPointerCancel(event: PointerEvent): void {
    if (panDrag?.pointerId === event.pointerId) { panDrag = null; isPanning = false; }
    if (nodeDrag?.pointerId === event.pointerId) {
      const updated = { ...dragPositions };
      delete updated[nodeDrag.id];
      dragPositions = updated;
      nodeDrag = null;
      isDragging = false;
      suppressNodeClick = true;
    }
  }

  function openMap(): void {
    selectedId = null;
    void tick().then(() => fitContent());
  }

  function clickConcept(event: MouseEvent, id: string): void {
    if (suppressNodeClick) {
      suppressNodeClick = false;
      event.preventDefault();
      return;
    }
    chooseNode(id);
  }

  function chooseNode(id: string): void {
    selectedId = id;
    activeTab = "notes";
    showLinkPicker = false;
    noteQuery = "";
    checkedIds = [];
    noteTitle = "";
    noteBody = "";
  }

  function showNew(parentId: string | null = null): void {
    newParentId = parentId;
    draftTitle = "";
    draftColor = palette[nodes.find((node) => node.id === parentId)?.color ?? ""] ? nodes.find((node) => node.id === parentId)!.color : CONCEPT_COLORS[nodes.length % CONCEPT_COLORS.length];
    editingConcept = false;
    showCreate = true;
  }

  function showEdit(): void {
    if (!selected) return;
    draftTitle = selected.title;
    draftColor = selected.color;
    editingConcept = true;
    showCreate = true;
  }

  async function saveConcept(): Promise<void> {
    if (!draftTitle.trim() || isSaving) return;
    isSaving = true;
    try {
      if (editingConcept && selected) {
        await updateConceptNode(selected.id, { title: draftTitle, color: draftColor });
      } else {
        const id = await createConceptNode({ categoryId, parentId: newParentId, title: draftTitle, color: draftColor });
        if (newParentId) chooseNode(newParentId);
        else { selectedId = null; await tick(); fitContent(); }
        showSnackbar("Concepto creado.", "success");
      }
      showCreate = false;
    } catch (error) { showSnackbar(error instanceof Error ? error.message : "No se pudo guardar.", "error"); }
    finally { isSaving = false; }
  }

  async function removeConcept(): Promise<void> {
    if (!selected || isSaving) return;
    isSaving = true;
    try {
      await deleteConceptNode(selected.id);
      selectedId = null;
      showDelete = false;
      showSnackbar("Concepto eliminado. Sus notas se conservaron.", "success");
    } catch (error) { showSnackbar(error instanceof Error ? error.message : "No se pudo eliminar.", "error"); }
    finally { isSaving = false; }
  }

  async function createNote(): Promise<void> {
    if (!selected || isSaving || !(noteTitle.trim() || noteBody.trim())) return;
    isSaving = true;
    const conceptId = selected.id;
    try {
      const index = await saveItem({ title: noteTitle.trim() || "Nota sin título", comment: noteBody.trim(), type: "note", categoryId });
      const id = appState.appData?.__SYSTEM_TASKS__[index]?.id;
      if (!id) throw new Error("No se pudo obtener la nota guardada.");
      const currentLinks = appState.appData?.__SYSTEM_CONCEPT_NODES__.find((node) => node.id === conceptId)?.linked_note_ids ?? [];
      await updateConceptNotes(conceptId, [...currentLinks, id]);
      noteTitle = "";
      noteBody = "";
      showSnackbar("Nota creada y vinculada.", "success");
    } catch (error) { showSnackbar(error instanceof Error ? error.message : "No se pudo crear la nota.", "error"); }
    finally { isSaving = false; }
  }

  function openLinks(): void {
    checkedIds = [...(selected?.linked_note_ids ?? [])];
    noteQuery = "";
    showLinkPicker = true;
    activeTab = "related";
  }

  async function applyLinks(): Promise<void> {
    if (!selected || isSaving) return;
    isSaving = true;
    try {
      await updateConceptNotes(selected.id, checkedIds);
      showLinkPicker = false;
      showSnackbar("Relaciones guardadas.", "success");
    } catch (error) { showSnackbar(error instanceof Error ? error.message : "No se pudieron relacionar las notas.", "error"); }
    finally { isSaving = false; }
  }

  function toggleChecked(id: string): void {
    checkedIds = checkedIds.includes(id) ? checkedIds.filter((value) => value !== id) : [...checkedIds, id];
  }
  async function unlinkNote(note: Item): Promise<void> {
    if (!selected) return;
    try { await updateConceptNotes(selected.id, selected.linked_note_ids.filter((id) => id !== note.id)); }
    catch (error) { showSnackbar(error instanceof Error ? error.message : "No se pudo desvincular.", "error"); }
  }
  function editNote(note: Item): void {
    openItemEditor({ editingItem: note, editingIndex: getItemIndex(note) });
  }
</script>

<svelte:window onkeydown={keyDown} onkeyup={keyUp} onblur={cancelGestures}/>

<div class="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/60 shadow-soft backdrop-blur-xl">
  {#if selected}
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 lg:px-7">
      <div class="flex min-w-0 items-center gap-2 text-sm">
        <button class="btn-ghost !px-2" onclick={openMap} aria-label="Volver al mapa"><ArrowLeft size={18}/></button>
        <button class="font-medium text-slate-500 hover:text-brand-700" onclick={openMap}>{categoryName}</button>
        <ChevronRight size={15} class="text-slate-400"/>
        <span class="truncate font-semibold text-brand-800">{selected.title}</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-ghost border border-slate-200 bg-white/80" onclick={openMap}><Layers size={16}/> Ver mapa</button>
        <button class="btn-ghost !px-2" onclick={showEdit} aria-label="Editar concepto" title="Editar concepto"><Edit3 size={17}/></button>
        <button class="btn-ghost !px-2 text-rose-600" onclick={() => (showDelete = true)} aria-label="Eliminar concepto" title="Eliminar concepto"><Trash2 size={17}/></button>
      </div>
    </div>
    <div class="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(310px,1fr)] lg:overflow-hidden lg:p-5">
      <div class="flex min-h-[420px] flex-col overflow-hidden rounded-[1.4rem] border border-slate-200/70 bg-white/85">
        <div class="border-b border-slate-200/70 p-5">
          <div class="flex items-center gap-4">
            <div class="rounded-2xl p-4" style:background={palette[selected.color]?.pale ?? palette.emerald.pale} style:color={palette[selected.color]?.stroke ?? palette.emerald.stroke}><Layers size={28}/></div>
            <div class="min-w-0"><h2 class="text-2xl font-bold tracking-tight text-slate-900">{selected.title}</h2><p class="mt-1 text-sm text-slate-500">{directNotes.length} {directNotes.length === 1 ? "nota" : "notas"}</p></div>
          </div>
          <div class="mt-5 flex flex-wrap gap-2 border-b border-slate-100">
            <button class:concept-active-tab={activeTab === "notes"} class="concept-detail-tab" onclick={() => {activeTab = "notes"; showLinkPicker = false;}}><FileText size={16}/> Notas ({directNotes.length})</button>
            <button class:concept-active-tab={activeTab === "children"} class="concept-detail-tab" onclick={() => {activeTab = "children"; showLinkPicker = false;}}><Layers size={16}/> Subconceptos ({children.length})</button>
            <button class:concept-active-tab={activeTab === "related"} class="concept-detail-tab" onclick={openLinks}><Link2 size={16}/> Relacionar notas</button>
          </div>
        </div>
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 lg:p-5">
          {#if activeTab === "children"}
            <button class="btn-primary mb-3" onclick={() => showNew(selected.id)}><Plus size={16}/> Nuevo subconcepto</button>
            {#each children as child (child.id)}
              <button class="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-paper-50 px-4 py-3 text-left hover:border-brand-200" onclick={() => chooseNode(child.id)}><Layers size={18} class="text-brand-700"/><span class="flex-1 font-semibold">{child.title}</span><ChevronRight size={16}/></button>
            {:else}
              <div class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Aún no hay subconceptos.</div>
            {/each}
          {:else if activeTab === "related"}
            <p class="mb-2 text-sm text-slate-500">Selecciona notas existentes de cualquier categoría. No se crearán duplicados.</p>
            <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><Search size={17} class="text-slate-400"/><input class="w-full bg-transparent text-sm outline-none" bind:value={noteQuery} placeholder="Buscar notas guardadas..."/></label>
            {#each availableNotes as note (note.id)}
              <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-paper-50/65 p-3 hover:border-brand-200">
                <input class="mt-1 accent-brand-700" type="checkbox" checked={checkedIds.includes(note.id)} onchange={() => toggleChecked(note.id)}/>
                <FileText size={18} class="mt-0.5 shrink-0 text-brand-700"/>
                <span class="min-w-0 flex-1"><span class="block truncate text-sm font-semibold text-slate-900">{note.title || "Nota sin título"}</span><span class="mt-1 block truncate text-xs text-slate-500">{note.comment || "Sin contenido"}</span></span>
              </label>
            {:else}
              <p class="py-8 text-center text-sm text-slate-500">No se encontraron notas.</p>
            {/each}
            <div class="sticky bottom-0 flex items-center justify-between gap-2 border-t border-slate-100 bg-white/95 py-3"><span class="text-xs text-slate-500">{checkedIds.length} seleccionadas</span><button class="btn-primary" disabled={isSaving} onclick={() => void applyLinks()}><Link2 size={16}/> Guardar relaciones</button></div>
          {:else}
            {#each directNotes as note (note.id)}
              <div class="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div class="rounded-xl bg-brand-50 p-2.5 text-brand-700"><FileText size={19}/></div>
                <button class="min-w-0 flex-1 text-left" onclick={() => editNote(note)}><h3 class="truncate text-sm font-semibold text-slate-900">{note.title || "Nota sin título"}</h3><p class="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{note.comment || "Sin contenido"}</p></button>
                <button class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Desvincular nota" title="Desvincular, sin eliminar" onclick={() => void unlinkNote(note)}><X size={16}/></button>
              </div>
            {:else}
              <div class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Este concepto aún no tiene notas. Crea una o relaciona una existente.</div>
            {/each}
          {/if}
        </div>
      </div>
      <div class="flex min-h-[380px] flex-col gap-4 overflow-y-auto lg:min-h-0">
        <section class="rounded-[1.4rem] border border-brand-100 bg-gradient-to-br from-brand-50/90 to-white p-4 shadow-sm">
          <h3 class="flex items-center gap-2 text-base font-bold text-brand-800"><Edit3 size={19}/> Nueva nota</h3>
          <div class="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <input class="w-full border-b border-slate-100 px-4 py-3 text-sm font-semibold outline-none placeholder:font-normal" bind:value={noteTitle} placeholder="Título de la nota (opcional)"/>
            <textarea class="min-h-[140px] w-full resize-y p-4 text-sm outline-none" bind:value={noteBody} placeholder="Escribe una nota sobre este concepto..."></textarea>
            <div class="flex justify-end border-t border-slate-100 p-2"><button class="btn-primary" disabled={isSaving || !(noteTitle.trim() || noteBody.trim())} onclick={() => void createNote()}><Plus size={16}/> Crear nota</button></div>
          </div>
        </section>
        <section class="rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
          <h3 class="flex items-center gap-2 text-base font-bold text-brand-800"><Link2 size={19}/> Relacionar notas existentes</h3>
          <p class="mt-2 text-sm leading-relaxed text-slate-500">Busca y vincula notas que ya tienes guardadas, incluso de otras categorías.</p>
          <button class="btn-ghost mt-3 w-full border border-brand-100 bg-brand-50/60 text-brand-800" onclick={openLinks}><Search size={16}/> Buscar notas para relacionar</button>
        </section>
      </div>
    </div>
  {:else}
    <header class="flex flex-wrap items-center gap-3 border-b border-slate-200/60 px-5 py-4 lg:px-6">
      <div class="flex min-w-0 flex-1 items-center gap-3"><button class="btn-ghost !px-2" title="Volver" onclick={goBack} disabled={appState.navigationHistory.length === 0}><ArrowLeft size={19}/></button><Target size={25} class="shrink-0 text-brand-700"/><h1 class="truncate text-xl font-bold tracking-tight text-brand-800">{categoryName}</h1></div>
      <label class="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm sm:w-72 lg:w-80"><Search size={17} class="shrink-0 text-slate-400"/><input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" bind:value={search} placeholder="Buscar conceptos..."/></label>
      <button class="btn-primary !rounded-full !px-3" onclick={() => showNew(null)} title="Nuevo concepto" aria-label="Nuevo concepto"><Plus size={20}/></button>
      <div class="relative">
        <button class="btn-ghost rounded-full border border-slate-200 bg-white/85" onclick={() => (sectionMenu = !sectionMenu)}><Filter size={16}/> Secciones <ChevronDown size={14}/></button>
        {#if sectionMenu}
          <div class="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            {#each [{id:"overview",name:"Vista general"},{id:"notes",name:"Notas"},{id:"tasks",name:"Tareas"},{id:"links",name:"Enlaces"},{id:"subcategories",name:"Subcategorías"},{id:"flows",name:"Flujos"}] as section}
              <button class="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50" onclick={() => setCategorySection(section.id as import("$lib/store/types").CategorySection)}>{section.name}</button>
            {/each}
          </div>
        {/if}
      </div>
      <button class="btn-ghost !rounded-full border border-slate-200 bg-white/85" onclick={fitContent} title="Ajustar el zoom para mostrar todo el mapa"><Target size={16}/> Centrar</button>
      <div class="flex rounded-full border border-slate-200 bg-white/85">
        <button class="px-3 py-2 hover:text-brand-700" title="Alejar" aria-label="Alejar" onclick={() => zoomByFactor(1 / 1.2)}><Minus size={16}/></button>
        <span class="my-auto min-w-11 text-center text-xs text-slate-500">{Math.round(camera.scale * 100)}%</span>
        <button class="px-3 py-2 hover:text-brand-700" title="Acercar" aria-label="Acercar" onclick={() => zoomByFactor(1.2)}><Plus size={16}/></button>
      </div>
    </header>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={mapViewport}
      class="concept-map-background relative min-h-0 flex-1 overflow-hidden select-none"
      class:space-mode={spaceHeld}
      class:panning={isPanning}
      onpointerdown={viewportPointerDown}
      onpointermove={viewportPointerMove}
      onpointerup={viewportPointerUp}
      onpointercancel={viewportPointerCancel}
      ondragstart={(event) => event.preventDefault()}
    >
      {#if nodes.length === 0}
        <div class="flex h-full min-h-[380px] flex-col items-center justify-center gap-4 text-center"><div class="rounded-[2rem] bg-brand-50 p-6 text-brand-700 shadow-sm"><Layers size={40}/></div><h2 class="text-xl font-bold text-brand-800">Comienza tu mapa de conceptos</h2><p class="max-w-sm text-sm leading-relaxed text-slate-500">Organiza ideas en conceptos y subconceptos, y vincula tus notas guardadas.</p><button class="btn-primary" onclick={() => showNew(null)}><CirclePlus size={18}/> Crear primer concepto</button></div>
      {:else}
        <div
          class="absolute left-0 top-0 origin-top-left"
          class:camera-moving={isDragging || isPanning}
          style:transform={`translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`}
        >
          <!-- SVG overflows intentionally: freely positioned items may have negative coordinates. -->
          <svg class="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1" aria-hidden="true">
            {#each layout as position (position.node.id)}
              {@const parent = position.node.parent_id ? layoutById.get(position.node.parent_id) : null}
              {@const startX = parent?.x ?? 650}
              {@const startY = parent?.y ?? 440}
              <path
                d={`M ${startX} ${startY} C ${(startX + position.x) / 2} ${startY}, ${(startX + position.x) / 2} ${position.y}, ${position.x} ${position.y}`}
                stroke={palette[position.color].stroke}
                stroke-width="2.4"
                stroke-linecap="round"
                fill="none"
                opacity=".85"
              />
              <circle cx={position.x} cy={position.y} r="4" fill={palette[position.color].stroke}/>
            {/each}
          </svg>
          <div class="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-[2rem] border-[2px] border-brand-400 bg-gradient-to-br from-emerald-50 to-teal-100 px-7 py-5 shadow-lg" style:left="650px" style:top="440px"><Target size={32} class="text-brand-700"/><span class="max-w-52 truncate text-2xl font-bold text-brand-800">{categoryName}</span></div>
          {#each layout as position (position.node.id)}
            {@const shade = palette[position.color]}
            <button
              class="concept-map-node absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-[1.5rem] border-2 px-5 py-3 text-left hover:brightness-[1.02] focus:outline-none focus:ring-4 focus:ring-brand-100"
              class:node-moving={isDragging && nodeDrag?.id === position.node.id}
              style:left={position.x + "px"}
              style:top={position.y + "px"}
              style:background={shade.pale}
              style:border-color={shade.stroke}
              style:box-shadow={"0 8px 25px " + shade.glow}
              style:opacity={visibleNodes.some((node) => node.id === position.node.id) ? 1 : .24}
              onpointerdown={(event) => nodePointerDown(event, position.node.id)}
              onclick={(event) => clickConcept(event, position.node.id)}
              title={"Arrastrar para mover · clic para abrir " + position.node.title}
              aria-label={"Abrir o mover " + position.node.title}
            >
              <span class="shrink-0" style:color={shade.stroke}><Layers size={position.depth === 1 ? 24 : 19}/></span>
              <span class="min-w-0"><span class:font-bold={position.depth === 1} class="block max-w-[190px] text-sm font-semibold leading-tight text-slate-900">{position.node.title}</span><span class="mt-1 block text-xs text-slate-500">{position.node.linked_note_ids.length} {position.node.linked_note_ids.length === 1 ? "nota" : "notas"}</span></span>
            </button>
          {/each}
        </div>
      {/if}
      <div class="pointer-events-none absolute bottom-3 left-4 rounded-full border border-slate-200/70 bg-white/75 px-3 py-1.5 text-[11px] text-slate-500 shadow-sm backdrop-blur-sm">
        Arrastra conceptos · Espacio + arrastrar para desplazarte · Alt izquierdo + rueda para zoom
      </div>
    </div>
  {/if}
</div>

<Modal open={showCreate} title={editingConcept ? "Editar concepto" : newParentId ? "Nuevo subconcepto" : "Nuevo concepto"} onclose={() => (showCreate = false)}>
  <div class="space-y-4">
    <label class="block text-sm font-semibold text-slate-700">Nombre del concepto<input class="input-base mt-2" bind:value={draftTitle} maxlength="90" placeholder="Ej. Estrategias"/></label>
    <p class="text-sm font-semibold text-slate-700">Color del concepto</p>
    <div class="flex flex-wrap gap-3">{#each CONCEPT_COLORS as color}<button class="flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm" style:background={palette[color].pale} style:border-color={draftColor === color ? palette[color].stroke : "#e2e8f0"} aria-label={"Color " + color} title={color} onclick={() => (draftColor = color)}>{#if draftColor === color}<span style:color={palette[color].stroke}><Check size={19}/></span>{/if}</button>{/each}</div>
    <div class="flex justify-end gap-2 pt-3"><button class="btn-ghost" onclick={() => (showCreate = false)}>Cancelar</button><button class="btn-primary" disabled={isSaving || !draftTitle.trim()} onclick={() => void saveConcept()}>Guardar concepto</button></div>
  </div>
</Modal>
<Modal open={showDelete} title="Eliminar concepto" onclose={() => (showDelete = false)}>
  <p class="text-sm text-slate-600">Se eliminará este concepto y sus relaciones. Las notas guardadas no se eliminarán y los subconceptos pasarán al nivel superior.</p>
  <div class="mt-5 flex justify-end gap-2"><button class="btn-ghost" onclick={() => (showDelete = false)}>Cancelar</button><button class="btn-danger" disabled={isSaving} onclick={() => void removeConcept()}>Eliminar concepto</button></div>
</Modal>

<style>
  .concept-map-background { background: radial-gradient(circle at 15% 18%,rgba(252,230,191,.28),transparent 31%),radial-gradient(circle at 77% 75%,rgba(157,224,199,.22),transparent 37%),#fbfaf6; }
  .concept-map-node { min-width: 148px; max-width: 265px; z-index: 2; cursor: grab; touch-action: none; user-select: none; will-change: left, top; }
  .concept-map-node:active, .concept-map-node.node-moving { cursor: grabbing; z-index: 4; }
  .concept-map-background.space-mode, .concept-map-background.space-mode .concept-map-node { cursor: grab !important; }
  .concept-map-background.panning, .concept-map-background.panning .concept-map-node { cursor: grabbing !important; }
  .concept-map-background > div.origin-top-left { transition: transform 190ms cubic-bezier(.22,1,.36,1); will-change: transform; }
  .concept-map-background > div.origin-top-left.camera-moving { transition: none; }
  .concept-map-background { touch-action: none; }
  .concept-detail-tab { display:inline-flex;align-items:center;gap:.4rem;padding:.65rem .8rem;border-bottom:2px solid transparent;font-size:.85rem;font-weight:600;color:#64748b; }
  .concept-active-tab { border-color:#0f766e;color:#0f5448;background:rgba(216,245,233,.35); }
</style>
