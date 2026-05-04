import {
  FLOW_NODE_HEIGHT,
  FLOW_NODE_WIDTH,
} from "$lib/components/flows/flowLayout";
import type { FlowEdge, FlowNode, FlowNodeType } from "$lib/store/types";

export { FLOW_NODE_HEIGHT, FLOW_NODE_WIDTH };

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
  type?: FlowNodeType;
  title: string;
  subtitle?: string;
  description?: string;
  x: number;
  y: number;
}): FlowNode {
  return {
    id: input.id,
    type: input.type ?? "process",
    title: input.title,
    subtitle: input.subtitle ?? "",
    description: input.description ?? "",
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

export function canOpenTwoPaths(node: FlowNode, edges: FlowEdge[]): boolean {
  if (node.type === "output") {
    return false;
  }

  return getOutgoingEdges(edges, node.id).length === 0;
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
