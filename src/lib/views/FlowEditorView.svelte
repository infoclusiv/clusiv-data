<script lang="ts">
  import { ArrowLeft, Plus, Save } from "lucide-svelte";

  import FlowCanvas from "$lib/components/flows/FlowCanvas.svelte";
  import FlowNodeInspector from "$lib/components/flows/FlowNodeInspector.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { appState, closeFlowEditor, updateFlow } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/store/snackbar.svelte";
  import type { Flow, FlowNode, FlowNodeType } from "$lib/store/types";
  import { getCategory, getFlowById } from "$lib/utils/categoryUtils";

  const flow = $derived(
    appState.appData ? getFlowById(appState.appData, appState.currentFlowId) : null,
  );

  const categoryName = $derived(
    appState.appData && flow
      ? getCategory(appState.appData, flow.category_id)?.name ?? "General"
      : "General",
  );

  let title = $state("");
  let description = $state("");
  let status = $state<Flow["status"]>("draft");
  let nodes = $state<FlowNode[]>([]);
  let edges = $state<Flow["edges"]>([]);
  let selectedNodeId = $state<string | null>(null);
  let saving = $state(false);

  const selectedNode = $derived(
    selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null,
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
    description = flowSnapshot.description;
    status = flowSnapshot.status;
    nodes = cloneFlowNodes(flowSnapshot.nodes);
    edges = cloneFlowEdges(flowSnapshot.edges);
    selectedNodeId = flowSnapshot.nodes[0]?.id ?? null;
    saving = false;
  });

  function addNode(type: FlowNodeType = "process"): void {
    if (!flow) {
      return;
    }

    const nodeId = `${flow.id}-node-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const newNode: FlowNode = {
      id: nodeId,
      type,
      title: type === "decision" ? "Nueva decisión" : "Nuevo nodo",
      subtitle: "",
      description: "",
      position: {
        x: 80 + (nodes.length % 3) * 240,
        y: 120 + Math.floor(nodes.length / 3) * 150,
      },
    };

    const previousNode = nodes.at(-1) ?? null;
    nodes = [...nodes, newNode];

    if (previousNode) {
      edges = [
        ...edges,
        {
          id: `${flow.id}-edge-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
          source: previousNode.id,
          target: nodeId,
          label: "",
        },
      ];
    }

    selectedNodeId = nodeId;
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

  async function handleSave(): Promise<void> {
    if (!flow || saving) {
      return;
    }

    saving = true;

    try {
      await updateFlow(flow.id, {
        title: title.trim(),
        description: description.trim(),
        status,
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
          <button class="btn-ghost bg-white/70" onclick={() => addNode("process")}>
            <Plus size={16} />
            Agregar nodo
          </button>
          <button class="btn-ghost bg-white/70" onclick={() => addNode("decision")}>
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
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="space-y-6">
          <section class="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm">
            <div class="grid gap-4 lg:grid-cols-2">
              <Input
                label="Título del flujo"
                bind:value={title}
                placeholder="Ej. Flujo de aprobación"
              />

              <Select
                label="Estado"
                bind:value={status}
                options={[
                  { value: "draft", label: "Borrador" },
                  { value: "active", label: "Activo" },
                  { value: "archived", label: "Archivado" },
                ]}
              />
            </div>

            <div class="mt-4">
              <Input
                label="Descripción"
                bind:value={description}
                multiline={true}
                rows={4}
                placeholder="Describe el objetivo de este flujo"
              />
            </div>
          </section>

          <FlowCanvas
            {nodes}
            {edges}
            {selectedNodeId}
            onselectnode={(nodeId) => (selectedNodeId = nodeId)}
          />
        </div>

        <FlowNodeInspector
          node={selectedNode}
          onupdate={updateSelectedNode}
          ondelete={deleteNode}
        />
      </div>
    </div>
  </div>
{/if}
