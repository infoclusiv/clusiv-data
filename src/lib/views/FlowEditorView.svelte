<script lang="ts">
  import { onDestroy } from "svelte";
  import { ArrowLeft, Plus, Trash2 } from "lucide-svelte";

  import FlowCanvas from "$lib/components/flows/FlowCanvas.svelte";
  import FlowContextPanel from "$lib/components/flows/FlowContextPanel.svelte";
  import FlowNodeEditorPanel from "$lib/components/flows/FlowNodeEditorPanel.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import {
    getNextHorizontalNodePosition,
    getNextNodePositionFromNode,
    layoutFlowGraph,
  } from "$lib/components/flows/flowLayout";
  import Input from "$lib/components/ui/Input.svelte";
  import {
    appState,
    closeFlowEditor,
    deleteFlow,
    logClientEvent,
    updateFlow,
  } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { Flow, FlowNode } from "$lib/store/types";
  import { getFlowById, getFlowCategoryDisplayLabel } from "$lib/utils/categoryUtils";
  import {
    buildTwoPathNodesAndEdges,
    canOpenTwoPaths,
    createFlowEdge,
    createFlowEdgeId,
    createFlowNodeId,
    deleteNodeAndReconnect,
    getBranchTailFromSource,
    getFirstFlowNode,
    getLastFlowNode,
    getOutgoingEdges,
    insertNodeAfterSource,
    insertNodeBeforeTarget,
    insertNodeBetweenEdge,
    type FlowBranchDirection,
  } from "$lib/utils/flowGraphUtils";

  const flow = $derived(
    appState.appData ? getFlowById(appState.appData, appState.currentFlowId) : null,
  );

  const UNLINKED_FLOW_LABEL = "Sin categoria";
  const MISSING_FLOW_CATEGORY_LABEL = "Categoria no disponible";
  const categoryName = $derived(
    appState.appData && flow
      ? getFlowCategoryDisplayLabel(appState.appData, flow.category_id, {
        unlinked: UNLINKED_FLOW_LABEL,
        missing: MISSING_FLOW_CATEGORY_LABEL,
      })
      : "General",
  );

  let title = $state("");
  let flowComments = $state("");
  let flowLinkedNoteIds = $state<string[]>([]);
  let nodes = $state<FlowNode[]>([]);
  let edges = $state<Flow["edges"]>([]);
  let selectedNodeId = $state<string | null>(null);
  let nodeEditorOpen = $state(false);
  let saving = $state(false);
  let loadedFlowId = $state<string | null>(null);
  let hasHydratedFlow = $state(false);
  let lastSavedFingerprint = $state("");
  let autosaveStatus = $state<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  let saveRequestedWhileSaving = $state(false);
  let lastAutosaveError = $state<string | null>(null);
  let confirmDeleteFlow = $state(false);

  const selectedNode = $derived(
    selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null,
  );

  const selectedNodeOutgoingEdges = $derived(
    selectedNode ? getOutgoingEdges(edges, selectedNode.id) : [],
  );

  const selectedNodeCanOpenTwoPaths = $derived(
    selectedNode ? canOpenTwoPaths(selectedNode, edges) : false,
  );

  const isNodeEditorActive = $derived(nodeEditorOpen && selectedNode);

  const autosaveStatusLabel = $derived(
    autosaveStatus === "saving"
      ? "Guardando..."
      : autosaveStatus === "error"
        ? "Error al autoguardar"
        : autosaveStatus === "dirty"
          ? "Cambios pendientes"
          : "Guardado automático",
  );

  function cloneFlowNodes(sourceNodes: FlowNode[]): FlowNode[] {
    return sourceNodes.map((node) => ({
      ...node,
      comments: node.comments ?? "",
      linked_note_ids: [...(node.linked_note_ids ?? [])],
      position: {
        ...node.position,
      },
    }));
  }

  function cloneFlowEdges(sourceEdges: Flow["edges"]): Flow["edges"] {
    return sourceEdges.map((edge) => ({
      ...edge,
    }));
  }

  function getCurrentFlowPayload(): Pick<
    Flow,
    "title" | "comments" | "linked_note_ids" | "nodes" | "edges"
  > {
    return {
      title: title.trim(),
      comments: flowComments,
      linked_note_ids: [...new Set(flowLinkedNoteIds)],
      nodes: cloneFlowNodes(nodes),
      edges: cloneFlowEdges(edges),
    };
  }

  function getFlowFingerprint(
    payload: Pick<Flow, "title" | "comments" | "linked_note_ids" | "nodes" | "edges">,
  ): string {
    return JSON.stringify({
      title: payload.title,
      comments: payload.comments,
      linked_note_ids: payload.linked_note_ids,
      nodes: payload.nodes,
      edges: payload.edges,
    });
  }

  function applyLayout(nextNodes: FlowNode[], nextEdges: Flow["edges"]): void {
    nodes = layoutFlowGraph({
      nodes: cloneFlowNodes(nextNodes),
      edges: cloneFlowEdges(nextEdges),
    });
    edges = cloneFlowEdges(nextEdges);
  }

  $effect(() => {
    if (!flow) {
      loadedFlowId = null;
      hasHydratedFlow = false;
      title = "";
      flowComments = "";
      flowLinkedNoteIds = [];
      nodes = [];
      edges = [];
      selectedNodeId = null;
      nodeEditorOpen = false;
      lastSavedFingerprint = "";
      autosaveStatus = "idle";
      lastAutosaveError = null;
      return;
    }

    if (loadedFlowId === flow.id) {
      return;
    }

    const flowSnapshot = $state.snapshot(flow) as Flow;
    const hydratedNodes = layoutFlowGraph({
      nodes: cloneFlowNodes(flowSnapshot.nodes),
      edges: cloneFlowEdges(flowSnapshot.edges),
    });

    loadedFlowId = flowSnapshot.id;
    title = flowSnapshot.title;
    flowComments = flowSnapshot.comments ?? "";
    flowLinkedNoteIds = [...(flowSnapshot.linked_note_ids ?? [])];
    nodes = hydratedNodes;
    edges = cloneFlowEdges(flowSnapshot.edges);
    selectedNodeId = hydratedNodes[0]?.id ?? null;
    nodeEditorOpen = false;
    saving = false;
    hasHydratedFlow = true;
    lastSavedFingerprint = getFlowFingerprint({
      title: flowSnapshot.title.trim(),
      comments: flowSnapshot.comments ?? "",
      linked_note_ids: [...(flowSnapshot.linked_note_ids ?? [])],
      nodes: cloneFlowNodes(hydratedNodes),
      edges: cloneFlowEdges(flowSnapshot.edges),
    });
    autosaveStatus = "saved";
    lastAutosaveError = null;
  });

  $effect(() => {
    if (!flow || !hasHydratedFlow) {
      return;
    }

    const fingerprint = getFlowFingerprint(getCurrentFlowPayload());

    if (fingerprint === lastSavedFingerprint) {
      return;
    }

    scheduleAutosave("flow_local_state_changed");
  });

  onDestroy(() => {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
  });

  async function runAutosave(reason = "flow_changed"): Promise<void> {
    if (!flow || !hasHydratedFlow) {
      return;
    }

    if (saving) {
      saveRequestedWhileSaving = true;
      return;
    }

    const payload = getCurrentFlowPayload();
    const nextFingerprint = getFlowFingerprint(payload);

    if (nextFingerprint === lastSavedFingerprint) {
      autosaveStatus = "saved";
      return;
    }

    saving = true;
    autosaveStatus = "saving";
    lastAutosaveError = null;

    try {
      await updateFlow(flow.id, payload);
      lastSavedFingerprint = nextFingerprint;
      autosaveStatus = "saved";
    } catch (error) {
      autosaveStatus = "error";
      lastAutosaveError =
        error instanceof Error ? error.message : "No se pudo autoguardar el flujo.";
      showSnackbar(lastAutosaveError, "error");
    } finally {
      saving = false;

      if (saveRequestedWhileSaving) {
        saveRequestedWhileSaving = false;
        await runAutosave(`${reason}_queued`);
      }
    }
  }

  function scheduleAutosave(reason = "flow_changed", delay = 650): void {
    if (!flow || !hasHydratedFlow) {
      return;
    }

    autosaveStatus = "dirty";

    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
    }

    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      void runAutosave(reason);
    }, delay);
  }

  async function flushAutosave(reason = "flush"): Promise<void> {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }

    await runAutosave(reason);
  }

  function createNewFlowNode(position: FlowNode["position"]): FlowNode {
    if (!flow) {
      throw new Error("No hay flujo activo.");
    }

    return {
      id: createFlowNodeId(flow.id),
      type: "process",
      title: "Nuevo nodo",
      description: "",
      comments: "",
      linked_note_ids: [],
      position,
    };
  }

  function commitInsertedNode(input: {
    nextNodes: FlowNode[];
    nextEdges: Flow["edges"];
    insertedNodeId: string;
    autosaveReason: string;
  }): void {
    applyLayout(input.nextNodes, input.nextEdges);
    selectedNodeId = input.insertedNodeId;
    nodeEditorOpen = true;
    scheduleAutosave(input.autosaveReason, 100);
  }

  function addNodeToEnd(): void {
    if (!flow) {
      return;
    }

    const previousNode = getLastFlowNode(nodes, edges);
    const newNode = createNewFlowNode(getNextHorizontalNodePosition(nodes));
    const nextNodes = [...nodes, newNode];
    const nextEdges = previousNode
      ? [
          ...edges,
          createFlowEdge({
            id: createFlowEdgeId(flow.id),
            source: previousNode.id,
            target: newNode.id,
          }),
        ]
      : edges;

    commitInsertedNode({
      nextNodes,
      nextEdges,
      insertedNodeId: newNode.id,
      autosaveReason: "node_added",
    });
  }

  function addNodeToBranch(
    sourceNodeId: string,
    direction: FlowBranchDirection,
  ): void {
    if (!flow) {
      return;
    }

    const sourceNode = nodes.find((node) => node.id === sourceNodeId) ?? null;

    if (!sourceNode) {
      showSnackbar("No se encontró el nodo que abrió los caminos.", "error");
      return;
    }

    const branchTail = getBranchTailFromSource({
      sourceNode,
      nodes,
      edges,
      direction,
    });

    if (!branchTail) {
      showSnackbar(
        direction === "upper"
          ? "No se encontró el camino superior."
          : "No se encontró el camino inferior.",
        "error",
      );
      return;
    }

    const newNode = createNewFlowNode(getNextNodePositionFromNode(branchTail));
    const nextNodes = [...nodes, newNode];
    const nextEdges = [
      ...edges,
      createFlowEdge({
        id: createFlowEdgeId(flow.id),
        source: branchTail.id,
        target: newNode.id,
      }),
    ];

    commitInsertedNode({
      nextNodes,
      nextEdges,
      insertedNodeId: newNode.id,
      autosaveReason: "branch_node_added",
    });
  }

  function insertNodeBeforeFirst(): void {
    if (!flow) {
      return;
    }

    const firstNode = getFirstFlowNode(nodes, edges);

    if (!firstNode) {
      const newNode = createNewFlowNode(getNextHorizontalNodePosition(nodes));
      commitInsertedNode({
        nextNodes: [...nodes, newNode],
        nextEdges: edges,
        insertedNodeId: newNode.id,
        autosaveReason: "node_inserted_before_first_empty_flow",
      });
      return;
    }

    insertNodeBeforeNode(firstNode.id, "node_inserted_before_first");
  }

  function insertNodeBeforeNode(
    targetNodeId: string,
    autosaveReason = "node_inserted_before",
  ): void {
    if (!flow) {
      return;
    }

    const targetNode = nodes.find((node) => node.id === targetNodeId);

    if (!targetNode) {
      showSnackbar("No se encontro el nodo objetivo.", "error");
      return;
    }

    const newNode = createNewFlowNode({
      x: Math.max(0, targetNode.position.x - 240),
      y: targetNode.position.y,
    });

    try {
      const result = insertNodeBeforeTarget({
        flowId: flow.id,
        nodes,
        edges,
        targetNodeId,
        insertedNode: newNode,
      });

      commitInsertedNode({
        nextNodes: result.nodes,
        nextEdges: result.edges,
        insertedNodeId: result.insertedNode.id,
        autosaveReason,
      });
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo insertar el nodo.",
        "error",
      );
    }
  }

  function insertNodeAfterNode(sourceNodeId: string): void {
    if (!flow) {
      return;
    }

    const sourceNode = nodes.find((node) => node.id === sourceNodeId);

    if (!sourceNode) {
      showSnackbar("No se encontro el nodo seleccionado.", "error");
      return;
    }

    const newNode = createNewFlowNode(getNextNodePositionFromNode(sourceNode));

    try {
      const result = insertNodeAfterSource({
        flowId: flow.id,
        nodes,
        edges,
        sourceNodeId,
        insertedNode: newNode,
      });

      commitInsertedNode({
        nextNodes: result.nodes,
        nextEdges: result.edges,
        insertedNodeId: result.insertedNode.id,
        autosaveReason: "node_inserted_after",
      });
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo insertar el nodo.",
        "error",
      );
    }
  }

  function insertNodeOnEdge(edgeId: string): void {
    if (!flow) {
      return;
    }

    const edge = edges.find((candidate) => candidate.id === edgeId);

    if (!edge) {
      showSnackbar("No se encontro la conexion seleccionada.", "error");
      return;
    }

    const sourceNode = nodes.find((node) => node.id === edge.source);
    const targetNode = nodes.find((node) => node.id === edge.target);
    const fallbackPosition = getNextHorizontalNodePosition(nodes);
    const newNode = createNewFlowNode({
      x: sourceNode && targetNode
        ? (sourceNode.position.x + targetNode.position.x) / 2
        : fallbackPosition.x,
      y: sourceNode && targetNode
        ? (sourceNode.position.y + targetNode.position.y) / 2
        : fallbackPosition.y,
    });

    try {
      const result = insertNodeBetweenEdge({
        flowId: flow.id,
        nodes,
        edges,
        edgeId,
        insertedNode: newNode,
      });

      commitInsertedNode({
        nextNodes: result.nodes,
        nextEdges: result.edges,
        insertedNodeId: result.insertedNode.id,
        autosaveReason: "node_inserted_between_edge",
      });
    } catch (error) {
      showSnackbar(
        error instanceof Error
          ? error.message
          : "No se pudo insertar el nodo en la conexion.",
        "error",
      );
    }
  }

  function openNodeEditor(nodeId: string): void {
    selectedNodeId = nodeId;
    nodeEditorOpen = true;
  }

  async function closeNodeEditor(): Promise<void> {
    await flushAutosave("node_editor_done");
    nodeEditorOpen = false;
  }

  function updateSelectedNode(
    field: "title" | "description" | "comments",
    value: string,
  ): void {
    if (!selectedNodeId) {
      return;
    }

    nodes = nodes.map((node) => {
      if (node.id !== selectedNodeId) {
        return node;
      }

      return { ...node, [field]: value };
    });

    scheduleAutosave("node_updated");
  }

  function updateSelectedNodeLinkedNotes(linkedNoteIds: string[]): void {
    if (!selectedNodeId) {
      return;
    }

    nodes = nodes.map((node) => {
      if (node.id !== selectedNodeId) {
        return node;
      }

      return {
        ...node,
        linked_note_ids: [...new Set(linkedNoteIds)],
      };
    });

    scheduleAutosave("node_linked_notes_updated");
  }

  function updateFlowComments(value: string): void {
    flowComments = value;
    scheduleAutosave("flow_comments_updated");
  }

  function updateFlowLinkedNotes(linkedNoteIds: string[]): void {
    flowLinkedNoteIds = [...new Set(linkedNoteIds)];
    scheduleAutosave("flow_linked_notes_updated");
  }

  function linkNoteToFlow(noteId: string): void {
    updateFlowLinkedNotes([...flowLinkedNoteIds, noteId]);
  }

  function unlinkNoteFromFlow(noteId: string): void {
    updateFlowLinkedNotes(flowLinkedNoteIds.filter((id) => id !== noteId));
  }

  function linkNoteToSelectedNode(noteId: string): void {
    if (!selectedNode) {
      return;
    }

    updateSelectedNodeLinkedNotes([
      ...(selectedNode.linked_note_ids ?? []),
      noteId,
    ]);
  }

  function unlinkNoteFromSelectedNode(noteId: string): void {
    if (!selectedNode) {
      return;
    }

    updateSelectedNodeLinkedNotes(
      (selectedNode.linked_note_ids ?? []).filter((id) => id !== noteId),
    );
  }

  function deleteNode(nodeId: string): void {
    if (!flow) {
      return;
    }

    try {
      const result = deleteNodeAndReconnect({
        flowId: flow.id,
        nodes,
        edges,
        nodeId,
      });

      logClientEvent({
        source: "flows",
        action: "delete_node_reconnect_completed",
        message: "Deleted flow node and reconnected surrounding graph edges.",
        context: {
          flowId: flow.id,
          deletedNodeId: result.deletedNode.id,
          incomingEdgeCount: result.removedEdges.filter(
            (edge) => edge.target === result.deletedNode.id,
          ).length,
          outgoingEdgeCount: result.removedEdges.filter(
            (edge) => edge.source === result.deletedNode.id,
          ).length,
          removedEdgeCount: result.removedEdges.length,
          reconnectedEdgeCount: result.reconnectedEdges.length,
          reconnectedEdges: result.reconnectedEdges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
          })),
          remainingNodeCount: result.nodes.length,
          remainingEdgeCount: result.edges.length,
        },
      });

      applyLayout(result.nodes, result.edges);

      selectedNodeId =
        result.nodes.find((node) =>
          result.reconnectedEdges.some(
            (edge) => edge.source === node.id || edge.target === node.id,
          ),
        )?.id ??
        result.nodes[0]?.id ??
        null;

      scheduleAutosave("node_deleted_reconnected", 100);
    } catch (error) {
      logClientEvent({
        level: "error",
        source: "flows",
        action: "delete_node_reconnect_failed",
        message: "Failed to delete flow node with reconnection.",
        context: {
          flowId: flow.id,
          nodeId,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      showSnackbar(
        error instanceof Error ? error.message : "No se pudo eliminar el nodo.",
        "error",
      );
    }
  }

  function handleDeleteSelectedNode(nodeId: string): void {
    deleteNode(nodeId);
    nodeEditorOpen = false;
  }

  function openTwoPathsFromNode(nodeId: string): void {
    if (!flow) {
      return;
    }

    const sourceNode = nodes.find((node) => node.id === nodeId);

    if (!sourceNode) {
      showSnackbar("No se encontró el nodo seleccionado.", "error");
      return;
    }

    const outgoingEdges = getOutgoingEdges(edges, sourceNode.id);

    if (outgoingEdges.length > 0) {
      showSnackbar(
        outgoingEdges.length >= 2
          ? "Este nodo ya tiene dos o más caminos abiertos."
          : "Para abrir dos caminos, usa un nodo sin salidas o elimina la salida existente.",
        "error",
      );
      return;
    }

    const branch = buildTwoPathNodesAndEdges({
      flowId: flow.id,
      sourceNode,
      existingNodes: nodes,
    });

    applyLayout([...nodes, ...branch.nodes], [...edges, ...branch.edges]);
    selectedNodeId = nodeId;
    nodeEditorOpen = true;
    scheduleAutosave("two_paths_created", 100);

    showSnackbar("Se abrieron dos caminos desde el nodo seleccionado.", "success");
  }

  async function handleBackFromFlowEditor(): Promise<void> {
    if (nodeEditorOpen) {
      await closeNodeEditor();
      return;
    }

    await flushAutosave("leave_flow_editor");
    closeFlowEditor();
  }

  async function handleDeleteCurrentFlow(): Promise<void> {
    if (!flow) {
      return;
    }

    try {
      await flushAutosave("delete_flow_before_confirm");
      await deleteFlow(flow.id);
      showSnackbar("Flujo eliminado.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo eliminar el flujo.",
        "error",
      );
    } finally {
      confirmDeleteFlow = false;
    }
  }
</script>

{#if flow}
  <div class="page-panel flex h-full min-w-0 flex-1 flex-col overflow-hidden">
    <div class="border-b border-slate-200/70 px-6 py-6 lg:px-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <button class="btn-ghost -ml-1" onclick={() => void handleBackFromFlowEditor()}>
            <ArrowLeft size={16} />
            Atrás
          </button>
          <p class="section-label mt-4">Editor de flujo</p>
          <h1 class="mt-2 text-3xl font-semibold text-slate-900">
            {title.trim() || "Nuevo flujo"}
          </h1>
          <p class="mt-2 text-sm text-slate-500">
            Categoría: {categoryName}. El editor visual se abre solo cuando eliges un flujo
            concreto.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button class="btn-ghost bg-white/70" onclick={() => insertNodeBeforeFirst()}>
            <Plus size={16} />
            Insertar antes del inicio
          </button>
          <button class="btn-ghost bg-white/70" onclick={() => addNodeToEnd()}>
            <Plus size={16} />
            Agregar al final
          </button>
          {#if !isNodeEditorActive}
            <button class="btn-ghost bg-white/70 text-red-700 hover:bg-red-50" onclick={() => (confirmDeleteFlow = true)}>
              <Trash2 size={16} />
              Eliminar flujo
            </button>
          {/if}
          <div
            class="rounded-full bg-white/70 px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm"
            class:text-red-600={autosaveStatus === "error"}
            title={lastAutosaveError ?? autosaveStatusLabel}
          >
            {autosaveStatusLabel}
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 min-h-0 min-w-0 overflow-y-auto px-5 py-5 lg:px-8 lg:py-7">
      <div class={`min-w-0 ${nodeEditorOpen && selectedNode ? "" : "space-y-6"}`}>
        {#if nodeEditorOpen && selectedNode}
          <FlowNodeEditorPanel
            node={selectedNode}
            appData={appState.appData}
            canCreateTwoPaths={selectedNodeCanOpenTwoPaths}
            canInsertAfter={selectedNodeOutgoingEdges.length <= 1}
            outgoingCount={selectedNodeOutgoingEdges.length}
            onupdate={updateSelectedNode}
            ondelete={handleDeleteSelectedNode}
            oncreatetwopaths={openTwoPathsFromNode}
            oninsertbefore={insertNodeBeforeNode}
            oninsertafter={insertNodeAfterNode}
            onaddtobranch={addNodeToBranch}
            onlinknote={linkNoteToSelectedNode}
            onunlinknote={unlinkNoteFromSelectedNode}
            onclose={() => void closeNodeEditor()}
          />
        {:else}
          <section class="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm">
            <Input
              label="Título del flujo"
              bind:value={title}
              placeholder="Ej. Flujo de aprobación"
            />
          </section>

          <FlowCanvas
            {nodes}
            {edges}
            {selectedNodeId}
            onselectnode={openNodeEditor}
            oninsertbetween={insertNodeOnEdge}
          />

          <FlowContextPanel
            appData={appState.appData}
            linkedNoteIds={flowLinkedNoteIds}
            comments={flowComments}
            onlinknote={linkNoteToFlow}
            onunlinknote={unlinkNoteFromFlow}
            oncommentschange={updateFlowComments}
          />
        {/if}
      </div>
    </div>
  </div>

  <ConfirmDialog
    open={confirmDeleteFlow}
    title="Eliminar flujo"
    message="¿Seguro que quieres eliminar este flujo? Esta acción no se puede deshacer."
    confirmLabel="Sí, eliminar"
    oncancel={() => (confirmDeleteFlow = false)}
    onconfirm={() => void handleDeleteCurrentFlow()}
  />
{/if}
