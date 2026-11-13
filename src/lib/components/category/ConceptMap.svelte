<script lang="ts">
  import { ArrowLeft, Check, ChevronDown, ChevronRight, CirclePlus, Edit3, FileText, Filter, Layers, Link2, Minus, MoreHorizontal, Plus, Search, Target, Trash2, X, ZoomIn, ZoomOut } from "lucide-svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import ConceptNoteCard from "$lib/components/category/ConceptNoteCard.svelte";
  import ConceptNoteEditor from "$lib/components/category/ConceptNoteEditor.svelte";
  import { NOTE_CARD_WIDTH, NOTE_CARD_HEIGHT, layoutConceptNoteCards } from "$lib/utils/conceptNoteLayout";
  import type { ConceptNoteInput } from "$lib/store/appState.svelte";
  import { appState, createConceptNode, deleteConceptNode, goBack, saveItem, setCategorySection, updateConceptNode, updateConceptNotes, updateConceptPosition, updateConceptGeometry, reparentConceptNode, createMapNoteNode, createNoteOnConcept, updateConceptNote, deleteConceptNote, updateConceptNotePosition, moveConceptNote } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import { CONCEPT_COLORS } from "$lib/utils/categoryUtils";
  import { canReparentConcept } from "$lib/utils/conceptReparent";
  import { conceptNodeVisual, conceptNodeWidth, conceptNodeHeight, resizeConceptGeometry } from "$lib/utils/conceptNodeVisual";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { isTauri } from "@tauri-apps/api/core";
  import { canFocusMapFromHover, canPanMapWithSpace, isPointerInsideMap, isMouseMapOpenClick } from "$lib/utils/conceptMapKeyboard";
  import { conceptBounds, fitConceptCamera, zoomConceptCamera, isMapZoomShortcut, isMapPanShortcut } from "$lib/utils/conceptMapViewport";
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
  const noteById = $derived(new Map(allNotes.map((note) => [note.id, note])));
  const editingNote = $derived(allNotes.find((item) => item.id === editingNoteId) ?? null);
  const linkedNoteCandidates = $derived(allNotes.filter((note) => {
    const q = pickerSearch.toLocaleLowerCase().trim();
    return !q || (note.title + " " + note.comment).toLocaleLowerCase().includes(q);
  }));
  let selectedId = $state<string | null>(null);
  let search = $state("");
  let noteQuery = $state("");
  let camera = $state<MapCamera>({ x: 0, y: 0, scale: 1 });
  let mapViewport = $state<HTMLDivElement | null>(null);
  let spaceHeld = $state(false);
  let pointerOverMap = $state(false);
  // Last physical pointer coordinates survive captured drag gestures, which
  // can temporarily suppress pointerenter/pointerleave in the WebView.
  let lastPointerPosition: MapPoint | null = null;
  let windowFocused = $state(!isTauri() && document.hasFocus());
  let focusRequestRunning = false;
  let isPanning = $state(false);
  let isDragging = $state(false);
  let dragPositions = $state<Record<string, MapPoint>>({});
  let resizeDraftWidths = $state<Record<string, number>>({});
  type ResizeDrag = {
    id: string; pointerId: number; startX: number; startY: number;
    origin: MapPoint; width: number; moved: boolean;
  };
  let resizeDrag = $state<ResizeDrag | null>(null);
  const CATEGORY_ROOT_TARGET = "__category_root__";
  type LinkDrag = {
    conceptId: string; pointerId: number; startX: number; startY: number;
    currentX: number; currentY: number;
  };
  let linkDrag = $state<LinkDrag | null>(null);
  let linkHoverTargetId = $state<string | null>(null);
  let quickMenuId = $state<string | null>(null);
  let noteEditorOpen = $state(false);
  // Undefined means an existing note or a linked-note card is being edited.
  // null means a new top-level map note; a string means a new child note.
  let newMapParentId = $state<string | null | undefined>(undefined);
  let editingNoteId = $state<string | null>(null);
  let noteTargetConceptId = $state<string | null>(null);
  let showNotePicker = $state(false);
  let pickerSearch = $state("");
  let notePositionOverlay = $state<Record<string, MapPoint>>({});
  type NoteDrag = {
    key: string; noteId: string; conceptId: string; pointerId: number;
    startX: number; startY: number; origin: MapPoint; moved: boolean;
  };
  type NoteLinkDrag = {
    noteId: string; sourceConceptId: string; pointerId: number;
    x: number; y: number; currentX: number; currentY: number;
  };
  let noteDrag = $state<NoteDrag | null>(null);
  let noteLinkDrag = $state<NoteLinkDrag | null>(null);
  let noteHoverTargetId = $state<string | null>(null);
  let suppressNoteClick = false;
  let savingLink = $state(false);
  let suppressNodeClick = false;
  type NodeDrag = {
    id: string; pointerId: number; startX: number; startY: number;
    origin: MapPoint; moved: boolean;
  };
  let nodeDrag = $state<NodeDrag | null>(null);
  let panDrag = $state<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
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
  const notePlacements = $derived(layoutConceptNoteCards(layout.map((position) => ({
    node: position.node, x: position.x, y: position.y,
    width: resizeDraftWidths[position.node.id] ??
      conceptNodeWidth(position.node.title, position.depth, position.node.width),
    height: conceptNodeHeight(position.node.title, position.depth,
      resizeDraftWidths[position.node.id] ?? conceptNodeWidth(position.node.title, position.depth, position.node.width)) + 78,
  })), new Set(allNotes.map((note) => note.id))));
  const shownNotes = $derived(notePlacements.map((placement) => ({
    ...placement,
    x: notePositionOverlay[placement.key]?.x ?? placement.x,
    y: notePositionOverlay[placement.key]?.y ?? placement.y,
  })));

  function fitContent(): void {
    if (!mapViewport) return;
    const bounds = conceptBounds([...layout.map((position) => ({
      x: position.x,
      y: position.y,
      width: resizeDraftWidths[position.node.id] ??
        conceptNodeWidth(position.node.title, position.depth, position.node.width),
      height: conceptNodeHeight(position.node.title, position.depth, resizeDraftWidths[position.node.id] ??
        conceptNodeWidth(position.node.title, position.depth, position.node.width)) + 78,
    })), ...shownNotes.map((note) => ({
      x: note.x, y: note.y, width: NOTE_CARD_WIDTH, height: NOTE_CARD_HEIGHT,
    }))], { centerWidth: 420, centerHeight: 170 });
    camera = fitConceptCamera(bounds, mapViewport.clientWidth, mapViewport.clientHeight);
  }

  function zoomByFactor(factor: number, anchor?: MapPoint): void {
    if (!mapViewport) return;
    camera = zoomConceptCamera(camera, anchor ?? {
      x: mapViewport.clientWidth / 2, y: mapViewport.clientHeight / 2,
    }, factor);
  }

  function wheelZoom(event: WheelEvent): void {
    // Ctrl+wheel is deliberately used instead of Alt+wheel:
    // Windows reserves Alt+Space for its native window menu.
    if (!mapViewport || !isMapZoomShortcut(event) || selectedId || showCreate || showDelete || noteEditorOpen || showNotePicker) return;
    event.preventDefault();
    const rect = mapViewport.getBoundingClientRect();
    const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    zoomByFactor(Math.exp(-Math.max(-240, Math.min(240, event.deltaY)) * .0016), anchor);
  }

  function isPointerCurrentlyOverMap(): boolean {
    const rect = mapViewport?.getBoundingClientRect() ?? null;
    return isPointerInsideMap(lastPointerPosition, rect);
  }

  function trackPointerPosition(event: PointerEvent): void {
    lastPointerPosition = { x: event.clientX, y: event.clientY };
    const inside = isPointerCurrentlyOverMap();
    pointerOverMap = inside;
    if (!inside && !panDrag) spaceHeld = false;
  }

  function restoreMapKeyboardFocus(): void {
    // DOM-only focus; never call native Window.setFocus or Webview.setFocus.
    // Wait until the pointer capture and its synthetic click have completed.
    queueMicrotask(() => {
      pointerOverMap = isPointerCurrentlyOverMap();
      focusMapElementIfAllowed();
    });
  }

  // Hover never raises or activates the application. It can only move DOM
  // keyboard focus if the native window is already foreground.
  function focusMapElementIfAllowed(): void {
    const viewport = mapViewport;
    if (!viewport || !canFocusMapFromHover({
      windowFocused, pointerOverMap,
      detailOpen: Boolean(selectedId),
      overlayOpen: showCreate || showDelete || noteEditorOpen || showNotePicker,
    })) return;
    viewport.focus({ preventScroll: true });
  }

  async function activateMapOnHover(event: PointerEvent): Promise<void> {
    trackPointerPosition(event);
    if (!mapViewport || focusRequestRunning || selectedId || showCreate || showDelete || noteEditorOpen || showNotePicker) return;
    if (!isTauri()) {
      windowFocused = document.hasFocus();
      focusMapElementIfAllowed();
      return;
    }
    focusRequestRunning = true;
    try {
      // Read-only: never call Window.setFocus or Webview.setFocus here.
      const focused = await getCurrentWindow().isFocused();
      windowFocused = focused;
      if (pointerOverMap) focusMapElementIfAllowed();
    } catch (error) {
      console.debug("Unable to check foreground state:", error);
    } finally {
      focusRequestRunning = false;
    }
  }

  function releaseKeyboardOnBlur(): void {
    spaceHeld = false;
    lastPointerPosition = null;
    pointerOverMap = false;
    if (panDrag) { panDrag = null; isPanning = false; }
    if (!isTauri()) windowFocused = false;
  }

  // Handles switching back to Clusiv-Data via taskbar / Alt+Tab, even if the
  // pointer is already over the map and pointerenter does not fire again.
  $effect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const nativeWindow = getCurrentWindow();
    void nativeWindow.onFocusChanged(({ payload: focused }) => {
      if (disposed) return;
      windowFocused = focused;
      if (!focused) releaseKeyboardOnBlur();
      else if (pointerOverMap) focusMapElementIfAllowed();
    }).then((off) => {
      if (disposed) off();
      else unlisten = off;
    }).catch((error) => console.debug("Window focus listener unavailable:", error));

    void nativeWindow.isFocused().then((focused) => {
      if (disposed) return;
      windowFocused = focused;
      if (focused && pointerOverMap) focusMapElementIfAllowed();
    }).catch((error) => console.debug("Window focus query unavailable:", error));
    return () => { disposed = true; unlisten?.(); };
  });

  function leaveMap(event: PointerEvent): void {
    // Never trust pointerleave alone during setPointerCapture() on a node.
    trackPointerPosition(event);
  }

  function keyDown(event: KeyboardEvent): void {
    if (!isMapPanShortcut(event)) return;
    const target = event.target as HTMLElement | null;
    const editable = Boolean(target?.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "") ||
      target?.closest('[contenteditable="true"]'));
    pointerOverMap = isPointerCurrentlyOverMap();
    if (!canPanMapWithSpace({
      windowFocused, pointerOverMap,
      isEditableTarget: editable,
      detailOpen: Boolean(selectedId),
      overlayOpen: showCreate || showDelete || noteEditorOpen || showNotePicker,
    })) return;

    // Capture-phase keyboard interception prevents a focused draggable
    // button from converting Space into an unwanted synthetic click.
    event.preventDefault();
    event.stopPropagation();
    spaceHeld = true;
    focusMapElementIfAllowed();
  }

  function keyUp(event: KeyboardEvent): void {
    if (event.code !== "Space") return;
    if (spaceHeld) {
      event.preventDefault();
      event.stopPropagation();
    }
    spaceHeld = false;
  }

  function cancelGestures(): void {
    nodeDrag = null;
    panDrag = null;
    isPanning = false;
    isDragging = false;
    spaceHeld = false;
    pointerOverMap = false;
    lastPointerPosition = null;
    dragPositions = {};
    resizeDraftWidths = {};
    resizeDrag = null;
    linkDrag = null;
    linkHoverTargetId = null;
    noteDrag = null;
    noteLinkDrag = null;
    noteHoverTargetId = null;
    notePositionOverlay = {};
    quickMenuId = null;
  }

  // Rebind the listeners when the map view mounts again after opening a note.
  $effect(() => {
    const viewport = mapViewport;
    if (!viewport) return;
    viewport.addEventListener("wheel", wheelZoom, { passive: false });
    let lastWidth = viewport.clientWidth;
    let lastHeight = viewport.clientHeight;
    const observer = new ResizeObserver(() => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      if (width > 0 && height > 0 && lastWidth > 0 && lastHeight > 0
        && (width !== lastWidth || height !== lastHeight)) {
        // Keep the center world point stable; never invoke fitContent here.
        camera = { ...camera,
          x: camera.x + (width - lastWidth) / 2,
          y: camera.y + (height - lastHeight) / 2 };
      }
      lastWidth = width;
      lastHeight = height;
    });
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
    resizeDraftWidths = {};
    resizeDrag = null;
    linkDrag = null;
    linkHoverTargetId = null;
    noteDrag = null;
    noteLinkDrag = null;
    noteHoverTargetId = null;
    notePositionOverlay = {};
    quickMenuId = null;
    nodeDrag = null;
    panDrag = null;
    spaceHeld = false;
    pointerOverMap = false;
    lastPointerPosition = null;
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

  function resizePointerDown(event: PointerEvent, id: string, width: number): void {
    if (event.button !== 0 || spaceHeld) return;
    const current = layoutById.get(id);
    if (!current) return;
    event.preventDefault();
    event.stopPropagation();
    resizeDrag = {
      id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      origin: { x: current.x, y: current.y }, width, moved: false,
    };
    (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
  }

  /** Drag an existing relationship to another concept or the category root. */
  function linkPointerDown(event: PointerEvent, conceptId: string): void {
    if (event.button !== 0 || spaceHeld || savingLink) return;
    const origin = layoutById.get(conceptId);
    if (!origin) return;
    event.preventDefault();
    event.stopPropagation();
    linkHoverTargetId = null;
    linkDrag = {
      conceptId, pointerId: event.pointerId,
      startX: origin.x, startY: origin.y,
      currentX: origin.x, currentY: origin.y,
    };
    (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
  }

  function findLinkDropTarget(event: PointerEvent, sourceId: string): string | null {
    // Pointer capture is active on the drag handle. Hit-test the real screen
    // position instead of event.target, which always remains the handle.
    const underlying = document.elementFromPoint(event.clientX, event.clientY);
    if (!(underlying instanceof Element)) return null;
    const concept = underlying.closest<HTMLElement>("[data-concept-node]");
    const possibleId = concept?.dataset.conceptNode;
    if (possibleId && canReparentConcept(nodes, sourceId, possibleId)) {
      return possibleId;
    }
    const root = underlying.closest<HTMLElement>("[data-map-root]");
    if (root && canReparentConcept(nodes, sourceId, null)) {
      return CATEGORY_ROOT_TARGET;
    }
    return null;
  }

  async function commitLinkDrop(sourceId: string, targetId: string): Promise<void> {
    savingLink = true;
    try {
      const newParentId = targetId === CATEGORY_ROOT_TARGET ? null : targetId;
      // The hierarchy can change all automatic radial sectors. Freeze the
      // existing layout while changing the parent for a seamless connection.
      await reparentConceptNode(sourceId, newParentId, layout.map(({ node, x, y }) => ({
        id: node.id, x, y,
      })));
      showSnackbar("Jerarquía del mapa actualizada.", "success");
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : "No se pudo cambiar la conexión.", "error");
    } finally {
      savingLink = false;
    }
  }

  function startNoteDrag(event: PointerEvent, conceptId: string, noteId: string, key: string): void {
    if (event.button !== 0 || spaceHeld || savingLink) return;
    const note = shownNotes.find((entry) => entry.key === key);
    if (!note) return;
    suppressNoteClick = false;
    noteDrag = {
      key, conceptId, noteId, pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY,
      origin: { x: note.x, y: note.y }, moved: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function startNoteLink(event: PointerEvent, conceptId: string, noteId: string, key: string): void {
    if (event.button !== 0 || spaceHeld || savingLink) return;
    const note = shownNotes.find((entry) => entry.key === key);
    if (!note) return;
    event.preventDefault();
    noteHoverTargetId = null;
    noteLinkDrag = {
      noteId, sourceConceptId: conceptId, pointerId: event.pointerId,
      x: note.x, y: note.y, currentX: note.x, currentY: note.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function findNoteDropTarget(event: PointerEvent, sourceConceptId: string): string | null {
    const underlying = document.elementFromPoint(event.clientX, event.clientY);
    if (!(underlying instanceof Element)) return null;
    const target = underlying.closest<HTMLElement>("[data-concept-node]")?.dataset.conceptNode;
    return target && target !== sourceConceptId && nodes.some((node) => node.id === target) ? target : null;
  }

  async function commitNotePosition(conceptId: string, noteId: string, key: string, position: MapPoint): Promise<void> {
    const previous = positionWrites.get("note:" + key) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
      try {
        await updateConceptNotePosition(conceptId, noteId, position);
      } catch (error) {
        showSnackbar(error instanceof Error ? error.message : "No se pudo guardar la posición de la nota.", "error");
      } finally {
        const optimistic = notePositionOverlay[key];
        if (optimistic && optimistic.x === position.x && optimistic.y === position.y) {
          const copy = { ...notePositionOverlay };
          delete copy[key];
          notePositionOverlay = copy;
        }
      }
    });
    positionWrites.set("note:" + key, current);
    await current;
    if (positionWrites.get("note:" + key) === current) positionWrites.delete("note:" + key);
  }

  async function commitNoteLink(sourceId: string, noteId: string, targetId: string, position: MapPoint): Promise<void> {
    savingLink = true;
    try {
      await moveConceptNote(noteId, sourceId, targetId, position);
      showSnackbar("Nota conectada al nuevo concepto.", "success");
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : "No se pudo reconectar la nota.", "error");
    } finally { savingLink = false; }
  }

  function openNoteEditor(noteId: string | null, conceptId: string): void {
    newMapParentId = undefined;
    editingNoteId = noteId;
    noteTargetConceptId = conceptId;
    noteEditorOpen = true;
    quickMenuId = null;
  }

  function createMapNote(parentId: string | null): void {
    newMapParentId = parentId;
    noteTargetConceptId = parentId;
    editingNoteId = null;
    noteEditorOpen = true;
    quickMenuId = null;
  }

  async function saveNoteFromMap(input: ConceptNoteInput): Promise<void> {
    if (newMapParentId !== undefined) {
      const parent = nodes.find((node) => node.id === newMapParentId);
      await createMapNoteNode({
        categoryId,
        parentId: newMapParentId,
        color: parent?.color ?? CONCEPT_COLORS[nodes.length % CONCEPT_COLORS.length],
        note: input,
      });
      showSnackbar("Nota creada en el mapa.", "success");
      // Never change zoom/pan when creating or editing a node.
      return;
    }
    if (editingNoteId) {
      await updateConceptNote(editingNoteId, input);
      showSnackbar("Nota actualizada.", "success");
      return;
    }
    if (!noteTargetConceptId) throw new Error("Selecciona dónde conectar la nota.");
    await createNoteOnConcept(noteTargetConceptId, input);
    showSnackbar("Nota creada y conectada.", "success");
  }

  async function deleteNoteFromMap(noteId: string): Promise<void> {
    await deleteConceptNote(noteId);
    notePositionOverlay = Object.fromEntries(
      Object.entries(notePositionOverlay).filter(([key]) => !key.endsWith("::" + noteId)),
    );
    showSnackbar("Nota eliminada de Clusiv-Data y de sus relaciones.", "success");
  }

  function openExistingNotePicker(conceptId: string): void {
    noteTargetConceptId = conceptId;
    pickerSearch = "";
    showNotePicker = true;
    quickMenuId = null;
  }

  async function attachExistingNote(noteId: string): Promise<void> {
    const targetId = noteTargetConceptId;
    if (!targetId) return;
    const target = nodes.find((node) => node.id === targetId);
    if (!target || target.linked_note_ids.includes(noteId)) return;
    try {
      await updateConceptNotes(targetId, [...target.linked_note_ids, noteId]);
      showNotePicker = false;
      showSnackbar("Nota existente vinculada.", "success");
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : "No se pudo vincular la nota.", "error");
    }
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
    if (noteLinkDrag?.pointerId === event.pointerId) {
      const rect = mapViewport?.getBoundingClientRect();
      if (!rect) return;
      noteHoverTargetId = findNoteDropTarget(event, noteLinkDrag.sourceConceptId);
      noteLinkDrag = {
        ...noteLinkDrag,
        currentX: (event.clientX - rect.left - camera.x) / camera.scale,
        currentY: (event.clientY - rect.top - camera.y) / camera.scale,
      };
      return;
    }
    if (noteDrag?.pointerId === event.pointerId) {
      const dx = event.clientX - noteDrag.startX;
      const dy = event.clientY - noteDrag.startY;
      if (Math.hypot(dx, dy) > 4) noteDrag.moved = true;
      if (!noteDrag.moved) return;
      isDragging = true;
      notePositionOverlay = { ...notePositionOverlay, [noteDrag.key]: {
        x: noteDrag.origin.x + dx / camera.scale,
        y: noteDrag.origin.y + dy / camera.scale,
      }};
      return;
    }
    if (linkDrag?.pointerId === event.pointerId) {
      const rect = mapViewport?.getBoundingClientRect();
      if (!rect) return;
      const worldX = (event.clientX - rect.left - camera.x) / camera.scale;
      const worldY = (event.clientY - rect.top - camera.y) / camera.scale;
      linkHoverTargetId = findLinkDropTarget(event, linkDrag.conceptId);
      linkDrag = { ...linkDrag, currentX: worldX, currentY: worldY };
      return;
    }
    if (resizeDrag?.pointerId === event.pointerId) {
      const dx = event.clientX - resizeDrag.startX;
      const dy = event.clientY - resizeDrag.startY;
      if (Math.hypot(dx, dy) > 3) resizeDrag.moved = true;
      if (!resizeDrag.moved) return;
      isDragging = true;
      const next = resizeConceptGeometry({
        x: resizeDrag.origin.x, y: resizeDrag.origin.y, width: resizeDrag.width,
      }, dx, camera.scale);
      resizeDraftWidths = { ...resizeDraftWidths, [resizeDrag.id]: next.width };
      dragPositions = { ...dragPositions, [resizeDrag.id]: next.position };
      return;
    }
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

  async function commitNodeResize(id: string, width: number, position: MapPoint): Promise<void> {
    const previous = positionWrites.get(id) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
      try {
        await updateConceptGeometry(id, { width, position });
      } catch (error) {
        showSnackbar(error instanceof Error ? error.message : "No se pudo guardar el tamaño.", "error");
      } finally {
        const currentWidth = resizeDraftWidths[id];
        if (currentWidth !== undefined && Math.abs(currentWidth - width) < 0.01) {
          const copy = { ...resizeDraftWidths };
          delete copy[id];
          resizeDraftWidths = copy;
        }
        const currentPosition = dragPositions[id];
        if (currentPosition && currentPosition.x === position.x && currentPosition.y === position.y) {
          const copy = { ...dragPositions };
          delete copy[id];
          dragPositions = copy;
        }
      }
    });
    positionWrites.set(id, current);
    await current;
    if (positionWrites.get(id) === current) positionWrites.delete(id);
  }

  function viewportPointerUp(event: PointerEvent): void {
    trackPointerPosition(event);
    if (noteLinkDrag?.pointerId === event.pointerId) {
      const drag = noteLinkDrag;
      const destination = findNoteDropTarget(event, drag.sourceConceptId);
      noteLinkDrag = null;
      noteHoverTargetId = null;
      if (destination) void commitNoteLink(drag.sourceConceptId, drag.noteId, destination, { x: drag.x, y: drag.y });
      restoreMapKeyboardFocus();
      return;
    }
    if (noteDrag?.pointerId === event.pointerId) {
      const drag = noteDrag;
      noteDrag = null;
      isDragging = false;
      if (drag.moved) {
        suppressNoteClick = true;
        const next = notePositionOverlay[drag.key];
        if (next) void commitNotePosition(drag.conceptId, drag.noteId, drag.key, next);
        restoreMapKeyboardFocus();
      }
      return;
    }
    if (linkDrag?.pointerId === event.pointerId) {
      const sourceId = linkDrag.conceptId;
      // Recompute the drop target in case the mouse was moved and released
      // without an intervening pointermove event.
      const destination = findLinkDropTarget(event, sourceId);
      linkDrag = null;
      linkHoverTargetId = null;
      if (destination) void commitLinkDrop(sourceId, destination);
      restoreMapKeyboardFocus();
      return;
    }
    if (resizeDrag?.pointerId === event.pointerId) {
      const current = resizeDrag;
      resizeDrag = null;
      isDragging = false;
      if (current.moved) {
        const width = resizeDraftWidths[current.id];
        const position = dragPositions[current.id];
        if (width !== undefined && position) void commitNodeResize(current.id, width, position);
        restoreMapKeyboardFocus();
      }
      return;
    }
    if (panDrag?.pointerId === event.pointerId) {
      panDrag = null;
      isPanning = false;
      restoreMapKeyboardFocus();
    }
    if (nodeDrag?.pointerId === event.pointerId) {
      const current = nodeDrag;
      nodeDrag = null;
      isDragging = false;
      if (current.moved) {
        suppressNodeClick = true;
        const position = dragPositions[current.id];
        if (position) void commitNodePosition(current.id, position);
        restoreMapKeyboardFocus();
      }
    }
  }

  function viewportPointerCancel(event: PointerEvent): void {
    if (noteLinkDrag?.pointerId === event.pointerId) {
      noteLinkDrag = null; noteHoverTargetId = null; return;
    }
    if (noteDrag?.pointerId === event.pointerId) {
      const copy = { ...notePositionOverlay };
      delete copy[noteDrag.key];
      notePositionOverlay = copy;
      noteDrag = null;
      isDragging = false;
      suppressNoteClick = true;
      return;
    }
    if (linkDrag?.pointerId === event.pointerId) {
      linkDrag = null;
      linkHoverTargetId = null;
      return;
    }
    if (resizeDrag?.pointerId === event.pointerId) {
      const widths = { ...resizeDraftWidths };
      const positions = { ...dragPositions };
      delete widths[resizeDrag.id];
      delete positions[resizeDrag.id];
      resizeDraftWidths = widths;
      dragPositions = positions;
      resizeDrag = null;
      isDragging = false;
      return;
    }
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
    // Every visual map node is backed by an editable note.
    // Space/Enter activation is not navigation. Only pointer clicks enter.
    if (!isMouseMapOpenClick(event) || spaceHeld) {
      event.preventDefault();
      return;
    }
    if (suppressNodeClick) {
      suppressNodeClick = false;
      event.preventDefault();
      return;
    }
    const node = nodes.find((candidate) => candidate.id === id);
    if (node?.primary_note_id) openNoteEditor(node.primary_note_id, id);
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
        // A child created on the map stays on the map; when creating from the
        // detail pane, keep that pane open instead of changing navigation.
        if (selectedId && newParentId) chooseNode(newParentId);
        else {
          selectedId = null;
          await tick();
          fitContent();
        }
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
    if (selected) openNoteEditor(note.id, selected.id);
  }
</script>

<svelte:window onkeydowncapture={keyDown} onkeyupcapture={keyUp} onpointermove={trackPointerPosition} onblur={releaseKeyboardOnBlur} onfocus={() => { if (!isTauri()) { windowFocused = document.hasFocus(); if (pointerOverMap) focusMapElementIfAllowed(); } }}/>

<div class="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/60 shadow-soft backdrop-blur-xl">
    <header class="flex flex-wrap items-center gap-3 border-b border-slate-200/60 px-5 py-4 lg:px-6">
      <div class="flex min-w-0 flex-1 items-center gap-3"><button class="btn-ghost !px-2" title="Volver" onclick={goBack} disabled={appState.navigationHistory.length === 0}><ArrowLeft size={19}/></button><Target size={25} class="shrink-0 text-brand-700"/><h1 class="truncate text-xl font-bold tracking-tight text-brand-800">{categoryName}</h1></div>
      <label class="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm sm:w-72 lg:w-80"><Search size={17} class="shrink-0 text-slate-400"/><input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" bind:value={search} placeholder="Buscar notas..."/></label>
      <button class="btn-primary !rounded-full !px-3" onclick={() => createMapNote(null)}
        title="Crear nota principal" aria-label="Crear nueva nota principal"><Plus size={20}/></button>
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
      role="region"
      tabindex="0"
      aria-label="Lienzo interactivo del mapa de conceptos"
      class="concept-map-background relative min-h-0 flex-1 overflow-hidden select-none"
      class:space-mode={spaceHeld}
      class:panning={isPanning}
      onpointerenter={(event) => void activateMapOnHover(event)}
      onpointerleave={leaveMap}
      onpointerdown={viewportPointerDown}
      onpointermove={viewportPointerMove}
      onpointerup={viewportPointerUp}
      onpointercancel={viewportPointerCancel}
      ondragstart={(event) => event.preventDefault()}
    >
      {#if nodes.length === 0}
        <div class="flex h-full min-h-[380px] flex-col items-center justify-center gap-4 text-center"><div class="rounded-[2rem] bg-brand-50 p-6 text-brand-700 shadow-sm"><Layers size={40}/></div><h2 class="text-xl font-bold text-brand-800">Comienza tu mapa de conceptos</h2><p class="max-w-sm text-sm leading-relaxed text-slate-500">Organiza notas de investigación en una jerarquía visual y conéctalas libremente.</p><button class="btn-primary" onclick={() => createMapNote(null)}><CirclePlus size={18}/> Crear primera nota</button></div>
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
            {#each shownNotes as notePosition (notePosition.key)}
              {@const parent = layoutById.get(notePosition.conceptId)}
              {#if parent}
                <path
                  d={`M ${parent.x} ${parent.y} C ${(parent.x + notePosition.x) / 2} ${parent.y}, ${(parent.x + notePosition.x) / 2} ${notePosition.y}, ${notePosition.x} ${notePosition.y}`}
                  stroke={palette[notePosition.color]?.stroke ?? "#0d9a72"} stroke-width="2.1"
                  stroke-linecap="round" fill="none" opacity=".8"
                />
                <circle cx={notePosition.x} cy={notePosition.y} r="3.4" fill={palette[notePosition.color]?.stroke ?? "#0d9a72"}/>
              {/if}
            {/each}
            {#if noteLinkDrag}
              <path
                d={`M ${noteLinkDrag.x} ${noteLinkDrag.y} C ${(noteLinkDrag.x + noteLinkDrag.currentX) / 2} ${noteLinkDrag.y}, ${(noteLinkDrag.x + noteLinkDrag.currentX) / 2} ${noteLinkDrag.currentY}, ${noteLinkDrag.currentX} ${noteLinkDrag.currentY}`}
                stroke="#059669" stroke-width="3" stroke-dasharray="8 6" fill="none"
                class="concept-link-preview"
              />
              <circle cx={noteLinkDrag.currentX} cy={noteLinkDrag.currentY} r="5" fill="#059669" stroke="white" stroke-width="2"/>
            {/if}
            {#if linkDrag}
              <path
                class="concept-link-preview-halo"
                d={`M ${linkDrag.startX} ${linkDrag.startY} C ${(linkDrag.startX + linkDrag.currentX) / 2} ${linkDrag.startY}, ${(linkDrag.startX + linkDrag.currentX) / 2} ${linkDrag.currentY}, ${linkDrag.currentX} ${linkDrag.currentY}`}
                stroke="#10b981" stroke-opacity=".18" stroke-width="11"
                stroke-linecap="round" fill="none"
              />
              <path
                class="concept-link-preview"
                d={`M ${linkDrag.startX} ${linkDrag.startY} C ${(linkDrag.startX + linkDrag.currentX) / 2} ${linkDrag.startY}, ${(linkDrag.startX + linkDrag.currentX) / 2} ${linkDrag.currentY}, ${linkDrag.currentX} ${linkDrag.currentY}`}
                stroke="#059669" stroke-width="3.25"
                stroke-linecap="round" stroke-dasharray="8 6" fill="none"
              />
              <circle cx={linkDrag.currentX} cy={linkDrag.currentY} r="5.5" fill="#059669" stroke="#ffffff" stroke-width="2"/>
            {/if}
          </svg>
          <div data-map-root="true" class:concept-link-target={linkHoverTargetId === CATEGORY_ROOT_TARGET} class="concept-category-root absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-4 rounded-[2rem] border-[3px] border-brand-500 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 px-8 py-6 shadow-xl" style:left="650px" style:top="440px" style:width="390px" style:min-height="126px">
            <Target size={38} class="shrink-0 text-brand-800"/>
            <span class="min-w-0 flex-1 break-words text-[34px] font-extrabold leading-tight tracking-tight text-brand-900">{categoryName}</span>
            {#if linkHoverTargetId === CATEGORY_ROOT_TARGET}
              <span class="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white shadow-md">Mover al nivel principal</span>
            {/if}
          </div>
          {#each layout as position (position.node.id)}
            {@const shade = palette[position.color]}
            {@const visual = conceptNodeVisual(position.depth)}
            {@const primaryNote = noteById.get(position.node.primary_note_id ?? "")}
            {@const boxWidth = resizeDraftWidths[position.node.id] ??
              conceptNodeWidth(position.node.title, position.depth, position.node.width)}
            <div
              data-concept-node={position.node.id}
              class="concept-node-shell group absolute -translate-x-1/2 -translate-y-1/2"
              class:concept-link-target={linkHoverTargetId === position.node.id || noteHoverTargetId === position.node.id}
              class:menu-open={quickMenuId === position.node.id}
              class:concept-link-source={linkDrag?.conceptId === position.node.id}
              class:node-resizing={resizeDrag?.id === position.node.id}
              style:left={position.x + "px"}
              style:top={position.y + "px"}
              style:width={boxWidth + "px"}
              style:opacity={visibleNodes.some((node) => node.id === position.node.id) ? 1 : .24}
            >
              <button
                class="concept-map-node relative flex w-full items-center gap-3 rounded-[1.45rem] text-left focus:outline-none focus:ring-4 focus:ring-brand-100"
                class:node-moving={isDragging && nodeDrag?.id === position.node.id}
                style:padding={visual.paddingYPx + "px " + visual.paddingXPx + "px"}
                style:border-width={visual.borderPx + "px"}
                style:background={shade.pale}
                style:border-color={shade.stroke}
                style:box-shadow={"0 " + Math.round(visual.shadowPx * .28) + "px " + visual.shadowPx + "px " + shade.glow}
                onpointerdown={(event) => nodePointerDown(event, position.node.id)}
                onclick={(event) => clickConcept(event, position.node.id)}
                title={"Arrastrar para mover · clic para editar nota " + position.node.title}
                aria-label={"Editar o mover nota " + position.node.title}
              >
                <span class="shrink-0" style:color={shade.stroke}><FileText size={visual.iconPx}/></span>
                <span class="min-w-0 flex-1">
                  <span
                    class="block min-w-0 whitespace-normal break-words leading-[1.17] text-slate-900"
                    style:font-size={visual.titlePx + "px"}
                    style:font-weight={visual.weight}
                  >{primaryNote?.title ?? position.node.title}</span>
                  {#if primaryNote?.comment}
                    <span class="mt-1 block line-clamp-2 text-[12px] font-normal leading-relaxed text-slate-600">{primaryNote.comment}</span>
                  {:else}
                    <span class="mt-1 block text-[11px] font-normal text-slate-400">Añadir contenido a esta nota...</span>
                  {/if}
                  {#if primaryNote && (primaryNote.links.length || primaryNote.documents.length || primaryNote.images.length)}
                    <span class="mt-2 flex items-center gap-3 text-[11px] font-medium text-slate-500">
                      {#if primaryNote.links.length}<span class="inline-flex items-center gap-1"><Link2 size={12}/>{primaryNote.links.length}</span>{/if}
                      {#if primaryNote.documents.length}<span class="inline-flex items-center gap-1"><FileText size={12}/>{primaryNote.documents.length}</span>{/if}
                      {#if primaryNote.images.length}<span class="inline-flex items-center gap-1">▧ {primaryNote.images.length}</span>{/if}
                    </span>
                  {/if}
                </span>
              </button>
              <button
                class="concept-add-child absolute -right-3 -top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 bg-white/90 text-brand-700 shadow-sm"
                title={"Añadir nota hija a " + position.node.title}
                aria-label={"Añadir nota hija a " + position.node.title}
                onpointerdown={(event) => event.stopPropagation()}
                onclick={(event) => { event.stopPropagation(); quickMenuId = quickMenuId === position.node.id ? null : position.node.id; }}
              ><Plus size={15}/></button>
              {#if quickMenuId === position.node.id}
                <div class="concept-node-quick-menu absolute -right-3 top-10 z-30 w-[205px] space-y-1 rounded-2xl border border-brand-100 bg-white/95 p-2 shadow-xl backdrop-blur-xl"
                  onpointerdown={(event) => event.stopPropagation()} role="group" aria-label="Añadir al concepto">
                  <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                    onclick={() => createMapNote(position.node.id)}><FileText size={16} class="text-brand-700"/> Nueva nota hija</button>
                  <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                    onclick={() => openExistingNotePicker(position.node.id)}><Link2 size={16} class="text-brand-700"/> Relacionar nota existente</button>
                </div>
              {/if}
              <button
                class="concept-link-handle absolute -left-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-brand-200 bg-white/90 text-brand-700 shadow-sm"
                title={"Arrastrar conexión para reorganizar " + position.node.title}
                aria-label={"Reorganizar conexión de " + position.node.title}
                disabled={savingLink}
                onpointerdown={(event) => linkPointerDown(event, position.node.id)}
                onclick={(event) => { event.preventDefault(); event.stopPropagation(); }}
              ><Link2 size={15}/></button>
              <button
                class="concept-resize-handle absolute -bottom-2.5 -right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border border-brand-200 bg-white/90 text-brand-600 shadow-sm"
                title={"Arrastrar para cambiar el ancho de " + position.node.title}
                aria-label={"Cambiar el ancho de " + position.node.title}
                onpointerdown={(event) => resizePointerDown(event, position.node.id, boxWidth)}
                onclick={(event) => { event.preventDefault(); event.stopPropagation(); }}
              ><svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M12 3L3 12M12 8L8 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
            </div>
          {/each}
          {#each shownNotes as placement (placement.key)}
            {@const note = noteById.get(placement.noteId)}
            {#if note}
              <ConceptNoteCard
                {note}
                conceptId={placement.conceptId}
                color={placement.color}
                x={placement.x} y={placement.y}
                dragging={noteDrag?.key === placement.key && isDragging}
                highlighted={false}
                dimmed={Boolean(search.trim()) && !note.title.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()) &&
                  !note.comment.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()) &&
                  !visibleNodes.some((node) => node.id === placement.conceptId)}
                onopen={() => { if (suppressNoteClick) { suppressNoteClick = false; return; } openNoteEditor(note.id, placement.conceptId); }}
                ondrag={(event) => startNoteDrag(event, placement.conceptId, note.id, placement.key)}
                onlink={(event) => startNoteLink(event, placement.conceptId, note.id, placement.key)}
              />
            {/if}
          {/each}
        </div>
      {/if}
      <div class="pointer-events-none absolute bottom-3 left-4 rounded-full border border-slate-200/70 bg-white/75 px-3 py-1.5 text-[11px] text-slate-500 shadow-sm backdrop-blur-sm">
        Arrastra notas · reconecta la relación al otro nodo · Espacio para moverte · Ctrl + rueda para zoom
      </div>
    </div>
</div>

<ConceptNoteEditor
  open={noteEditorOpen}
  note={editingNote}
  conceptTitle={nodes.find((node) => node.id === noteTargetConceptId)?.title ?? categoryName}
  onclose={() => { noteEditorOpen = false; editingNoteId = null; newMapParentId = undefined; }}
  onsave={saveNoteFromMap}
  ondelete={deleteNoteFromMap}
/>
<Modal open={showNotePicker} title="Relacionar una nota existente" onclose={() => showNotePicker = false} widthClass="max-w-2xl">
  <div class="space-y-3">
    <p class="text-sm text-slate-500">Selecciona una nota ya guardada para mostrarla en el mapa. No se duplicará.</p>
    <label class="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
      <Search size={17} class="text-slate-400"/>
      <input class="min-w-0 flex-1 text-sm outline-none" bind:value={pickerSearch} placeholder="Buscar notas..." />
    </label>
    <div class="max-h-[45vh] space-y-2 overflow-y-auto">
      {#each linkedNoteCandidates as candidate (candidate.id)}
        <button class="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-brand-300 hover:bg-emerald-50/40"
          disabled={nodes.find((node) => node.id === noteTargetConceptId)?.linked_note_ids.includes(candidate.id)}
          onclick={() => void attachExistingNote(candidate.id)}
        >
          <FileText size={18} class="mt-0.5 shrink-0 text-brand-700"/>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-bold text-slate-800">{candidate.title || "Nota sin título"}</span>
            <span class="mt-1 block truncate text-xs text-slate-500">{candidate.comment || "Sin contenido"}</span>
          </span>
        </button>
      {:else}
        <p class="py-8 text-center text-sm text-slate-500">No hay notas disponibles.</p>
      {/each}
    </div>
  </div>
</Modal>

<style>
  .concept-map-background { background: radial-gradient(circle at 15% 18%,rgba(252,230,191,.28),transparent 31%),radial-gradient(circle at 77% 75%,rgba(157,224,199,.22),transparent 37%),#fbfaf6; }
  .concept-node-shell { z-index: 2; transition: width 170ms cubic-bezier(.22,1,.36,1); will-change: left, top; }
  .concept-node-shell.node-resizing { transition: none; z-index: 5; }
  .concept-node-shell.menu-open { z-index: 12; }
  .concept-node-quick-menu { user-select: none; }
  .concept-map-node { cursor: grab; touch-action: none; user-select: none; min-height: 56px; }
  .concept-add-child, .concept-resize-handle, .concept-link-handle { opacity: .32; transition: opacity 150ms ease, transform 150ms cubic-bezier(.22,1,.36,1), box-shadow 150ms ease; }
  .concept-node-shell:hover .concept-add-child, .concept-add-child:focus-visible,
  .concept-node-shell:hover .concept-resize-handle, .concept-resize-handle:focus-visible,
  .concept-node-shell:hover .concept-link-handle, .concept-link-handle:focus-visible { opacity: 1; }
  .concept-add-child:hover { transform: scale(1.1); box-shadow: 0 5px 18px rgba(15,75,55,.16); }
  .concept-link-handle { cursor: crosshair; touch-action: none; }
  .concept-link-handle:hover { transform: translateY(-50%) scale(1.08); }
  .concept-link-target .concept-map-node, .concept-category-root.concept-link-target {
    outline: 4px solid rgba(16,185,129,.45);
    outline-offset: 5px;
    box-shadow: 0 0 0 9px rgba(16,185,129,.10), 0 12px 30px rgba(16,185,129,.20) !important;
    transition: outline-color 150ms ease, box-shadow 150ms ease;
  }
  .concept-link-source .concept-map-node { opacity: .84; }
  .concept-link-preview { animation: concept-flow 1.4s linear infinite; }
  @keyframes concept-flow { to { stroke-dashoffset: -28; } }
  .concept-resize-handle { cursor: nwse-resize; touch-action: none; }
  .concept-resize-handle:hover { transform: scale(1.08); }
  .concept-map-node:hover { filter: brightness(1.02); }
  .concept-map-node:active, .concept-map-node.node-moving { cursor: grabbing; }
  .concept-map-background.space-mode, .concept-map-background.space-mode .concept-map-node,
  .concept-map-background.space-mode .concept-resize-handle,
  .concept-map-background.space-mode .concept-link-handle,
  .concept-map-background.space-mode .concept-add-child,
  .concept-map-background.space-mode :global(.concept-note-card),
  .concept-map-background.space-mode :global(.note-link-handle) { cursor: grab !important; }
  .concept-map-background.panning, .concept-map-background.panning .concept-map-node,
  .concept-map-background.panning .concept-resize-handle,
  .concept-map-background.panning .concept-link-handle,
  .concept-map-background.panning :global(.concept-note-card) { cursor: grabbing !important; }
  .concept-map-background > div.origin-top-left { transition: transform 190ms cubic-bezier(.22,1,.36,1); will-change: transform; }
  .concept-map-background > div.origin-top-left.camera-moving { transition: none; }
  .concept-map-background { touch-action: none; }
</style>
