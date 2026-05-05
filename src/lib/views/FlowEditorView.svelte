<script lang="ts">
  import { onDestroy } from "svelte";
  import { ArrowLeft, Plus } from "lucide-svelte";

  import FlowCanvas from "$lib/components/flows/FlowCanvas.svelte";
  import {
    getNextHorizontalNodePosition,
    getNextNodePositionFromNode,
  } from "$lib/components/flows/flowLayout";
  import FlowNodeEditorModal from "$lib/components/flows/FlowNodeEditorModal.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import { appState, closeFlowEditor, updateFlow } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { Flow, FlowNode } from "$lib/store/types";
  import { getCategory, getFlowById } from "$lib/utils/categoryUtils";
  import {
    buildTwoPathNodesAndEdges,
    canOpenTwoPaths,
    getBranchTailFromSource,
    getOutgoingEdges,
    type FlowBranchDirection,
  } from "$lib/utils/flowGraphUtils";

  const flow = $derived(
    appState.appData ? getFlowById(appState.appData, appState.currentFlowId) : null,
  );

  const categoryName = $derived(
    appState.appData && flow
      ? getCategory(appState.appData, flow.category_id)?.name ?? "General"
      : "General",
  );

  let title = $state("");
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

  const selectedNode = $derived(
    selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null,
  );

  const selectedNodeOutgoingEdges = $derived(
    selectedNode ? getOutgoingEdges(edges, selectedNode.id) : [],
  );

  const selectedNodeCanOpenTwoPaths = $derived(
    selectedNode ? canOpenTwoPaths(selectedNode, edges) : false,
  );

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

  function getCurrentFlowPayload(): Pick<Flow, "title" | "nodes" | "edges"> {
    return {
      title: title.trim(),
      nodes: cloneFlowNodes(nodes),
      edges: cloneFlowEdges(edges),
    };
  }

  function getFlowFingerprint(payload: Pick<Flow, "title" | "nodes" | "edges">): string {
    return JSON.stringify({
      title: payload.title,
      nodes: payload.nodes,
      edges: payload.edges,
    });
  }

  $effect(() => {
    if (!flow) {
      loadedFlowId = null;
      hasHydratedFlow = false;
      lastSavedFingerprint = "";
      autosaveStatus = "idle";
      lastAutosaveError = null;
      return;
    }

    if (loadedFlowId === flow.id) {
      return;
    }

    const flowSnapshot = $state.snapshot(flow) as Flow;

    loadedFlowId = flowSnapshot.id;
    title = flowSnapshot.title;
    nodes = cloneFlowNodes(flowSnapshot.nodes);
    edges = cloneFlowEdges(flowSnapshot.edges);
    selectedNodeId = flowSnapshot.nodes[0]?.id ?? null;
    nodeEditorOpen = false;
    saving = false;
    hasHydratedFlow = true;
    lastSavedFingerprint = getFlowFingerprint({
      title: flowSnapshot.title.trim(),
      nodes: cloneFlowNodes(flowSnapshot.nodes),
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
      id: `${flow.id}-node-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
      title: "Nuevo nodo",
      subtitle: "",
      description: "",
      position,
    };
  }

  function addNodeToEnd(): void {
    if (!flow) {
      return;
    }

    const previousNode = nodes.at(-1) ?? null;
    const newNode = createNewFlowNode(getNextHorizontalNodePosition(nodes));

    nodes = [...nodes, newNode];

    if (previousNode) {
      edges = [
        ...edges,
        {
          id: `${flow.id}-edge-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
          source: previousNode.id,
          target: newNode.id,
          label: "",
        },
      ];
    }

    selectedNodeId = newNode.id;
    nodeEditorOpen = true;
    scheduleAutosave("node_added", 100);
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

    nodes = [...nodes, newNode];
    edges = [
      ...edges,
      {
        id: `${flow.id}-edge-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
        source: branchTail.id,
        target: newNode.id,
        label: "",
      },
    ];

    selectedNodeId = newNode.id;
    nodeEditorOpen = true;
    scheduleAutosave("branch_node_added", 100);
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
    field: "title" | "subtitle" | "description",
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

  function deleteNode(nodeId: string): void {
    const nextNodes = nodes.filter((node) => node.id !== nodeId);
    edges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
    nodes = nextNodes;
    selectedNodeId = nextNodes[0]?.id ?? null;
    scheduleAutosave("node_deleted", 100);
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

    nodes = [...nodes, ...branch.nodes];
    edges = [...edges, ...branch.edges];
    selectedNodeId = nodeId;
    nodeEditorOpen = true;
    scheduleAutosave("two_paths_created", 100);

    showSnackbar("Se abrieron dos caminos desde el nodo seleccionado.", "success");
  }

  async function handleBackFromFlowEditor(): Promise<void> {
    await flushAutosave("leave_flow_editor");
    closeFlowEditor();
  }
</script>

{#if flow}
  <div class="page-panel flex h-full flex-1 flex-col overflow-hidden">
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
          <button class="btn-ghost bg-white/70" onclick={() => addNodeToEnd()}>
            <Plus size={16} />
            Agregar nodo
          </button>
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

    <div class="flex-1 overflow-y-auto px-5 py-5 lg:px-8 lg:py-7">
      <div class="space-y-6">
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
        />

        {#if nodeEditorOpen && selectedNode}
          <FlowNodeEditorModal
            node={selectedNode}
            canCreateTwoPaths={selectedNodeCanOpenTwoPaths}
            outgoingCount={selectedNodeOutgoingEdges.length}
            onupdate={updateSelectedNode}
            ondelete={handleDeleteSelectedNode}
            oncreatetwopaths={openTwoPathsFromNode}
            onaddtobranch={addNodeToBranch}
            onclose={() => void closeNodeEditor()}
          />
        {/if}
      </div>
    </div>
  </div>
{/if}
