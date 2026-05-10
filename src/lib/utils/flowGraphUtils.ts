import {
  FLOW_COLUMN_STEP,
  FLOW_LANE_STEP,
  FLOW_NODE_HEIGHT,
  FLOW_NODE_WIDTH,
} from "../components/flows/flowLayout.ts";
import type { FlowEdge, FlowNode } from "../store/types.ts";

export { FLOW_NODE_HEIGHT, FLOW_NODE_WIDTH };
export type FlowBranchDirection = "upper" | "lower";
export interface FlowInsertResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  insertedNode: FlowNode;
}

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
  description?: string;
  linked_note_ids?: string[];
  x: number;
  y: number;
}): FlowNode {
  return {
    id: input.id,
    type: input.type ?? "process",
    title: input.title,
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

export function getIncomingEdges(edges: FlowEdge[], nodeId: string): FlowEdge[] {
  return edges.filter((edge) => edge.target === nodeId);
}

export function sortNodesByVisualOrder(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((a, b) => {
    if (a.position.x !== b.position.x) {
      return a.position.x - b.position.x;
    }

    if (a.position.y !== b.position.y) {
      return a.position.y - b.position.y;
    }

    return a.id.localeCompare(b.id);
  });
}

export function getRootNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const targetNodeIds = new Set(edges.map((edge) => edge.target));
  return nodes.filter((node) => !targetNodeIds.has(node.id));
}

export function getTailNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const sourceNodeIds = new Set(edges.map((edge) => edge.source));
  return nodes.filter((node) => !sourceNodeIds.has(node.id));
}

export function getFirstFlowNode(nodes: FlowNode[], edges: FlowEdge[]): FlowNode | null {
  if (!nodes.length) {
    return null;
  }

  const roots = getRootNodes(nodes, edges);
  const candidates = roots.length ? roots : nodes;

  return sortNodesByVisualOrder(candidates)[0] ?? null;
}

export function getLastFlowNode(nodes: FlowNode[], edges: FlowEdge[]): FlowNode | null {
  if (!nodes.length) {
    return null;
  }

  const tails = getTailNodes(nodes, edges);
  const candidates = tails.length ? tails : nodes;

  return [...candidates].sort((a, b) => {
    if (a.position.x !== b.position.x) {
      return b.position.x - a.position.x;
    }

    if (a.position.y !== b.position.y) {
      return a.position.y - b.position.y;
    }

    return a.id.localeCompare(b.id);
  })[0] ?? null;
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

  const startX = sourceNode.position.x + FLOW_COLUMN_STEP;
  const secondX = startX + FLOW_COLUMN_STEP;
  const upperY = Math.max(FLOW_BRANCH_MIN_Y, sourceNode.position.y - FLOW_LANE_STEP);
  const lowerY = sourceNode.position.y + FLOW_LANE_STEP;

  const upperStart = createFlowNode({
    id: createFlowNodeId(flowId),
    title: "Camino superior",
    description: "Primer paso del camino superior.",
    x: startX,
    y: upperY,
  });

  const upperNext = createFlowNode({
    id: createFlowNodeId(flowId),
    title: "Nodo superior 1",
    description: "",
    x: secondX,
    y: upperY,
  });

  const lowerStart = createFlowNode({
    id: createFlowNodeId(flowId),
    title: "Camino inferior",
    description: "Primer paso del camino inferior.",
    x: startX,
    y: lowerY,
  });

  const lowerNext = createFlowNode({
    id: createFlowNodeId(flowId),
    title: "Nodo inferior 1",
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

export function insertNodeBeforeTarget(input: {
  flowId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  targetNodeId: string;
  insertedNode: FlowNode;
}): FlowInsertResult {
  const targetNode = input.nodes.find((node) => node.id === input.targetNodeId);

  if (!targetNode) {
    throw new Error("No se encontro el nodo objetivo.");
  }

  const incomingEdges = getIncomingEdges(input.edges, input.targetNodeId);

  if (!incomingEdges.length) {
    return {
      nodes: [...input.nodes, input.insertedNode],
      edges: [
        ...input.edges,
        createFlowEdge({
          id: createFlowEdgeId(input.flowId),
          source: input.insertedNode.id,
          target: input.targetNodeId,
        }),
      ],
      insertedNode: input.insertedNode,
    };
  }

  const incomingEdgeIds = new Set(incomingEdges.map((edge) => edge.id));

  return {
    nodes: [...input.nodes, input.insertedNode],
    edges: [
      ...input.edges.map((edge) =>
        incomingEdgeIds.has(edge.id)
          ? { ...edge, target: input.insertedNode.id }
          : edge,
      ),
      createFlowEdge({
        id: createFlowEdgeId(input.flowId),
        source: input.insertedNode.id,
        target: input.targetNodeId,
      }),
    ],
    insertedNode: input.insertedNode,
  };
}

export function insertNodeAfterSource(input: {
  flowId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  sourceNodeId: string;
  insertedNode: FlowNode;
}): FlowInsertResult {
  const sourceNode = input.nodes.find((node) => node.id === input.sourceNodeId);

  if (!sourceNode) {
    throw new Error("No se encontro el nodo fuente.");
  }

  const outgoingEdges = getOutgoingEdges(input.edges, input.sourceNodeId);

  if (outgoingEdges.length > 1) {
    throw new Error(
      "Este nodo tiene varias salidas. Usa el boton + de la conexion especifica.",
    );
  }

  if (!outgoingEdges.length) {
    return {
      nodes: [...input.nodes, input.insertedNode],
      edges: [
        ...input.edges,
        createFlowEdge({
          id: createFlowEdgeId(input.flowId),
          source: input.sourceNodeId,
          target: input.insertedNode.id,
        }),
      ],
      insertedNode: input.insertedNode,
    };
  }

  const originalEdge = outgoingEdges[0];

  return {
    nodes: [...input.nodes, input.insertedNode],
    edges: [
      ...input.edges.map((edge) =>
        edge.id === originalEdge.id
          ? { ...edge, target: input.insertedNode.id }
          : edge,
      ),
      createFlowEdge({
        id: createFlowEdgeId(input.flowId),
        source: input.insertedNode.id,
        target: originalEdge.target,
      }),
    ],
    insertedNode: input.insertedNode,
  };
}

export function insertNodeBetweenEdge(input: {
  flowId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  edgeId: string;
  insertedNode: FlowNode;
}): FlowInsertResult {
  const originalEdge = input.edges.find((edge) => edge.id === input.edgeId);

  if (!originalEdge) {
    throw new Error("No se encontro la conexion seleccionada.");
  }

  return {
    nodes: [...input.nodes, input.insertedNode],
    edges: [
      ...input.edges.map((edge) =>
        edge.id === input.edgeId
          ? { ...edge, target: input.insertedNode.id }
          : edge,
      ),
      createFlowEdge({
        id: createFlowEdgeId(input.flowId),
        source: input.insertedNode.id,
        target: originalEdge.target,
      }),
    ],
    insertedNode: input.insertedNode,
  };
}
