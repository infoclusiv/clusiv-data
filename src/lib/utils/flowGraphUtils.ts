import {
  FLOW_NODE_HEIGHT,
  FLOW_NODE_WIDTH,
} from "$lib/components/flows/flowLayout";
import type { FlowEdge, FlowNode } from "$lib/store/types";

export { FLOW_NODE_HEIGHT, FLOW_NODE_WIDTH };
export type FlowBranchDirection = "upper" | "lower";

export const FLOW_HORIZONTAL_GAP = FLOW_NODE_WIDTH + 72;
export const FLOW_BRANCH_VERTICAL_GAP = 170;
const FLOW_BRANCH_MIN_Y = 40;

export function createFlowNodeId(flowId: string): string {
  return `${flowId}-node-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

export function createFlowEdgeId(flowId: string): string {
  return `${flowId}-edge-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

export function createFlowNode(input: {
  id: string;
  title: string;
  type?: FlowNode["type"];
  subtitle?: string;
  description?: string;
  linked_note_ids?: string[];
  x: number;
  y: number;
}): FlowNode {
  return {
    id: input.id,
    type: input.type ?? "process",
    title: input.title,
    subtitle: input.subtitle ?? "",
    description: input.description ?? "",
    linked_note_ids: input.linked_note_ids ?? [],
    position: {
      x: input.x,
      y: input.y,
    },
  };
}

export function createFlowEdge(input: {
  id: string;
  source: string;
  target: string;
  label?: string;
}): FlowEdge {
  return {
    id: input.id,
    source: input.source,
    target: input.target,
    label: input.label ?? "",
  };
}

export function getOutgoingEdges(edges: FlowEdge[], nodeId: string): FlowEdge[] {
  return edges.filter((edge) => edge.source === nodeId);
}

export function getBranchStartEdge(input: {
  sourceNode: FlowNode;
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction: FlowBranchDirection;
}): FlowEdge | null {
  const outgoingEdges = getOutgoingEdges(input.edges, input.sourceNode.id);

  if (outgoingEdges.length < 2) {
    return null;
  }

  const edgeByLabel = outgoingEdges.find((edge) => {
    const label = edge.label.trim().toLowerCase();

    return input.direction === "upper" ? label === "superior" : label === "inferior";
  });

  if (edgeByLabel) {
    return edgeByLabel;
  }

  const edgesWithTargets = outgoingEdges
    .map((edge) => ({
      edge,
      target: input.nodes.find((node) => node.id === edge.target) ?? null,
    }))
    .filter((item): item is { edge: FlowEdge; target: FlowNode } => item.target !== null)
    .sort((a, b) => a.target.position.y - b.target.position.y);

  if (!edgesWithTargets.length) {
    return null;
  }

  return input.direction === "upper"
    ? edgesWithTargets[0].edge
    : edgesWithTargets[edgesWithTargets.length - 1].edge;
}

export function getLinearBranchTail(input: {
  startNodeId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}): FlowNode | null {
  let currentNode = input.nodes.find((node) => node.id === input.startNodeId) ?? null;

  if (!currentNode) {
    return null;
  }

  const visited = new Set<string>();

  while (currentNode && !visited.has(currentNode.id)) {
    visited.add(currentNode.id);

    const outgoingEdges = getOutgoingEdges(input.edges, currentNode.id);

    if (outgoingEdges.length !== 1) {
      break;
    }

    const nextNode = input.nodes.find((node) => node.id === outgoingEdges[0].target) ?? null;

    if (!nextNode) {
      break;
    }

    currentNode = nextNode;
  }

  return currentNode;
}

export function getBranchTailFromSource(input: {
  sourceNode: FlowNode;
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction: FlowBranchDirection;
}): FlowNode | null {
  const branchStartEdge = getBranchStartEdge({
    sourceNode: input.sourceNode,
    nodes: input.nodes,
    edges: input.edges,
    direction: input.direction,
  });

  if (!branchStartEdge) {
    return null;
  }

  return getLinearBranchTail({
    startNodeId: branchStartEdge.target,
    nodes: input.nodes,
    edges: input.edges,
  });
}

export function canOpenTwoPaths(node: FlowNode, edges: FlowEdge[]): boolean {
  return node.type !== "output" && getOutgoingEdges(edges, node.id).length === 0;
}

export function buildTwoPathNodesAndEdges(input: {
  flowId: string;
  sourceNode: FlowNode;
  existingNodes: FlowNode[];
}): {
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  const { flowId, sourceNode } = input;

  const startX = sourceNode.position.x + FLOW_HORIZONTAL_GAP;
  const secondX = startX + FLOW_HORIZONTAL_GAP;
  const upperY = Math.max(FLOW_BRANCH_MIN_Y, sourceNode.position.y - FLOW_BRANCH_VERTICAL_GAP);
  const lowerY = sourceNode.position.y + FLOW_BRANCH_VERTICAL_GAP;

  const upperStart = createFlowNode({
    id: createFlowNodeId(flowId),
    title: "Camino superior",
    subtitle: "Ruta alternativa superior",
    description: "Primer paso del camino superior.",
    x: startX,
    y: upperY,
  });

  const upperNext = createFlowNode({
    id: createFlowNodeId(flowId),
    title: "Nodo superior 1",
    subtitle: "Acción superior",
    description: "",
    x: secondX,
    y: upperY,
  });

  const lowerStart = createFlowNode({
    id: createFlowNodeId(flowId),
    title: "Camino inferior",
    subtitle: "Ruta alternativa inferior",
    description: "Primer paso del camino inferior.",
    x: startX,
    y: lowerY,
  });

  const lowerNext = createFlowNode({
    id: createFlowNodeId(flowId),
    title: "Nodo inferior 1",
    subtitle: "Acción inferior",
    description: "",
    x: secondX,
    y: lowerY,
  });

  const nodes = [upperStart, upperNext, lowerStart, lowerNext];
  const edges = [
    createFlowEdge({
      id: createFlowEdgeId(flowId),
      source: sourceNode.id,
      target: upperStart.id,
      label: "Superior",
    }),
    createFlowEdge({
      id: createFlowEdgeId(flowId),
      source: upperStart.id,
      target: upperNext.id,
    }),
    createFlowEdge({
      id: createFlowEdgeId(flowId),
      source: sourceNode.id,
      target: lowerStart.id,
      label: "Inferior",
    }),
    createFlowEdge({
      id: createFlowEdgeId(flowId),
      source: lowerStart.id,
      target: lowerNext.id,
    }),
  ];

  return {
    nodes,
    edges,
  };
}
