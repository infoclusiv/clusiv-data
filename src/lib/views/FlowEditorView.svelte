<script lang="ts">
  import { ArrowLeft, Plus, Save } from "lucide-svelte";

  import FlowCanvas from "$lib/components/flows/FlowCanvas.svelte";
  import {
    getNextHorizontalNodePosition,
    getNextNodePositionFromNode,
  } from "$lib/components/flows/flowLayout";
  import FlowNodeEditorModal from "$lib/components/flows/FlowNodeEditorModal.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import { appState, closeFlowEditor, updateFlow } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { Flow, FlowNode, FlowNodeType } from "$lib/store/types";
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

  const selectedNode = $derived(
    selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null,
  );

  const selectedNodeOutgoingEdges = $derived(
    selectedNode ? getOutgoingEdges(edges, selectedNode.id) : [],
  );

  const selectedNodeCanOpenTwoPaths = $derived(
    selectedNode ? canOpenTwoPaths(selectedNode, edges) : false,
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

  $effect(() => {
    if (!flow) {
      return;
    }

    const flowSnapshot = $state.snapshot(flow) as Flow;

    title = flowSnapshot.title;
    nodes = cloneFlowNodes(flowSnapshot.nodes);
    edges = cloneFlowEdges(flowSnapshot.edges);
    selectedNodeId = flowSnapshot.nodes[0]?.id ?? null;
    nodeEditorOpen = false;
    saving = false;
  });

  function createNewFlowNode(type: FlowNodeType, position: FlowNode["position"]): FlowNode {
    if (!flow) {
      throw new Error("No hay flujo activo.");
    }

    return {
      id: `${flow.id}-node-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
      type,
      title: type === "decision" ? "Nueva decisión" : "Nuevo nodo",
      subtitle: "",
      description: "",
      position,
    };
  }

  function addNodeToEnd(type: FlowNodeType = "process"): void {
    if (!flow) {
      return;
    }

    const previousNode = nodes.at(-1) ?? null;
    const newNode = createNewFlowNode(type, getNextHorizontalNodePosition(nodes));

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
  }

  function addNodeToBranch(
    sourceNodeId: string,
    direction: FlowBranchDirection,
    type: FlowNodeType = "process",
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

    const newNode = createNewFlowNode(type, getNextNodePositionFromNode(branchTail));

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
  }

  function openNodeEditor(nodeId: string): void {
    selectedNodeId = nodeId;
    nodeEditorOpen = true;
  }

  function closeNodeEditor(): void {
    nodeEditorOpen = false;
  }

  function updateSelectedNode(
    field: "title" | "subtitle" | "description" | "type",
    value: string,
  ): void {
    if (!selectedNodeId) {
      return;
    }

    nodes = nodes.map((node) => {
      if (node.id !== selectedNodeId) {
        return node;
      }

      if (field === "type") {
        return { ...node, type: value as FlowNodeType };
      }

      return { ...node, [field]: value };
    });
  }

  function deleteNode(nodeId: string): void {
    const nextNodes = nodes.filter((node) => node.id !== nodeId);
    edges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
    nodes = nextNodes;
    selectedNodeId = nextNodes[0]?.id ?? null;
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

    if (sourceNode.type === "output") {
      showSnackbar("Un nodo de salida no puede abrir nuevos caminos.", "error");
      return;
    }

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

    showSnackbar("Se abrieron dos caminos desde el nodo seleccionado.", "success");
  }

  async function handleSave(): Promise<void> {
    if (!flow || saving) {
      return;
    }

    saving = true;

    try {
      await updateFlow(flow.id, {
        title: title.trim(),
        nodes,
        edges,
      });
      showSnackbar("Flujo actualizado.", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar el flujo.",
        "error",
      );
    } finally {
      saving = false;
    }
  }
</script>

{#if flow}
  <div class="page-panel flex h-full flex-1 flex-col overflow-hidden">
    <div class="border-b border-slate-200/70 px-6 py-6 lg:px-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <button class="btn-ghost -ml-1" onclick={closeFlowEditor}>
            <ArrowLeft size={16} />
            Atrás
          </button>
          <p class="section-label mt-4">Editor de flujo</p>
          <h1 class="mt-2 text-3xl font-semibold text-slate-900">
            {title.trim() || "Nuevo flujo"}
          </h1>
          <p class="mt-2 text-sm text-slate-500">
            Categoría: {categoryName}. El editor visual se abre solo cuando eliges un flujo concreto.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button class="btn-ghost bg-white/70" onclick={() => addNodeToEnd("process")}>
            <Plus size={16} />
            Agregar nodo
          </button>
          <button class="btn-ghost bg-white/70" onclick={() => addNodeToEnd("decision")}>
            <Plus size={16} />
            Nueva decisión
          </button>
          <button class="btn-primary" onclick={() => void handleSave()} disabled={saving}>
            <Save size={16} />
            {saving ? "Guardando..." : "Guardar flujo"}
          </button>
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
            onclose={closeNodeEditor}
          />
        {/if}
      </div>
    </div>
  </div>
{/if}
