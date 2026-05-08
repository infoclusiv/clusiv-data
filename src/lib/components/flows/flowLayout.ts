import type { FlowEdge, FlowNode } from "$lib/store/types";

export const FLOW_NODE_WIDTH = 208;
export const FLOW_NODE_HEIGHT = 112;

export const FLOW_NODE_START_X = 80;
export const FLOW_NODE_START_Y = 160;

export const FLOW_NODE_HORIZONTAL_GAP = 88;
export const FLOW_LANE_VERTICAL_GAP = 72;

export const FLOW_COLUMN_STEP = FLOW_NODE_WIDTH + FLOW_NODE_HORIZONTAL_GAP;
export const FLOW_LANE_STEP = FLOW_NODE_HEIGHT + FLOW_LANE_VERTICAL_GAP;

export const FLOW_CANVAS_MIN_WIDTH = 920;
export const FLOW_CANVAS_MIN_HEIGHT = 560;
export const FLOW_CANVAS_PADDING_RIGHT = 180;
export const FLOW_CANVAS_PADDING_BOTTOM = 160;
export const FLOW_CANVAS_PADDING_TOP = 80;

type LayoutNodeMeta = {
  depth: number;
  lane: number;
};

type Point = {
  x: number;
  y: number;
};

export function getNextHorizontalNodePosition(nodes: FlowNode[]): FlowNode["position"] {
  const lastNode = nodes.at(-1);

  if (!lastNode) {
    return {
      x: FLOW_NODE_START_X,
      y: FLOW_NODE_START_Y,
    };
  }

  return {
    x: lastNode.position.x + FLOW_COLUMN_STEP,
    y: lastNode.position.y,
  };
}

export function getNextNodePositionFromNode(node: FlowNode): FlowNode["position"] {
  return {
    x: node.position.x + FLOW_COLUMN_STEP,
    y: node.position.y,
  };
}

function getSortedNodes(nodes: FlowNode[]): FlowNode[] {
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

export function sortOutgoingEdgesForLayout(input: {
  edges: FlowEdge[];
  nodesById: Map<string, FlowNode>;
}): FlowEdge[] {
  const getPriority = (edge: FlowEdge): number => {
    const label = edge.label.trim().toLowerCase();

    if (label === "superior") {
      return -1;
    }

    if (label === "inferior") {
      return 1;
    }

    return 0;
  };

  return [...input.edges].sort((a, b) => {
    const priorityDifference = getPriority(a) - getPriority(b);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const targetA = input.nodesById.get(a.target);
    const targetB = input.nodesById.get(b.target);

    if (targetA && targetB && targetA.position.y !== targetB.position.y) {
      return targetA.position.y - targetB.position.y;
    }

    if (targetA && targetB && targetA.position.x !== targetB.position.x) {
      return targetA.position.x - targetB.position.x;
    }

    const targetIdDifference = a.target.localeCompare(b.target);

    if (targetIdDifference !== 0) {
      return targetIdDifference;
    }

    return a.id.localeCompare(b.id);
  });
}

function getDepthByNodeId(input: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  sortedNodeIds: string[];
}): Map<string, number> {
  const incomingCounts = new Map<string, number>();
  const outgoingBySource = new Map<string, FlowEdge[]>();

  for (const nodeId of input.sortedNodeIds) {
    incomingCounts.set(nodeId, 0);
    outgoingBySource.set(nodeId, []);
  }

  for (const edge of input.edges) {
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
    outgoingBySource.set(edge.source, [...(outgoingBySource.get(edge.source) ?? []), edge]);
  }

  const roots = input.sortedNodeIds.filter((nodeId) => (incomingCounts.get(nodeId) ?? 0) === 0);
  const queue = roots.length ? [...roots] : [...input.sortedNodeIds];
  const depths = new Map<string, number>(queue.map((nodeId) => [nodeId, 0]));
  const visited = new Set<string>();

  while (queue.length) {
    const currentNodeId = queue.shift();

    if (!currentNodeId) {
      continue;
    }

    visited.add(currentNodeId);

    const currentDepth = depths.get(currentNodeId) ?? 0;
    const outgoingEdges = outgoingBySource.get(currentNodeId) ?? [];

    for (const edge of outgoingEdges) {
      const nextDepth = currentDepth + 1;
      const previousDepth = depths.get(edge.target);

      if (previousDepth === undefined || nextDepth > previousDepth) {
        depths.set(edge.target, nextDepth);
      }

      incomingCounts.set(edge.target, Math.max(0, (incomingCounts.get(edge.target) ?? 0) - 1));

      if ((incomingCounts.get(edge.target) ?? 0) === 0) {
        queue.push(edge.target);
      }
    }
  }

  for (const nodeId of input.sortedNodeIds) {
    if (!visited.has(nodeId) && !depths.has(nodeId)) {
      depths.set(nodeId, 0);
    }
  }

  return depths;
}

function getLaneByNodeId(input: {
  rootNodeIds: string[];
  sortedNodeIds: string[];
  outgoingBySource: Map<string, FlowEdge[]>;
}): Map<string, number> {
  const lanes = new Map<string, number>();
  const visiting = new Set<string>();
  let nextLeafLane = 0;

  const assignLane = (nodeId: string): number => {
    const cachedLane = lanes.get(nodeId);

    if (cachedLane !== undefined) {
      return cachedLane;
    }

    if (visiting.has(nodeId)) {
      const fallbackLane = nextLeafLane;
      nextLeafLane += 1;
      lanes.set(nodeId, fallbackLane);
      return fallbackLane;
    }

    visiting.add(nodeId);

    const outgoingEdges = input.outgoingBySource.get(nodeId) ?? [];

    if (!outgoingEdges.length) {
      const lane = nextLeafLane;
      nextLeafLane += 1;
      lanes.set(nodeId, lane);
      visiting.delete(nodeId);
      return lane;
    }

    const childLanes = outgoingEdges.map((edge) => assignLane(edge.target));
    const lane = childLanes.reduce((sum, value) => sum + value, 0) / childLanes.length;

    lanes.set(nodeId, lane);
    visiting.delete(nodeId);

    return lane;
  };

  const roots = input.rootNodeIds.length ? input.rootNodeIds : input.sortedNodeIds;

  for (const nodeId of roots) {
    assignLane(nodeId);
  }

  for (const nodeId of input.sortedNodeIds) {
    if (!lanes.has(nodeId)) {
      assignLane(nodeId);
    }
  }

  return lanes;
}

function resolveLaneCollisions(metaByNodeId: Map<string, LayoutNodeMeta>): Map<string, LayoutNodeMeta> {
  const nextMetaByNodeId = new Map<string, LayoutNodeMeta>();
  const nodeIdsByDepth = new Map<number, string[]>();

  for (const [nodeId, meta] of metaByNodeId.entries()) {
    nodeIdsByDepth.set(meta.depth, [...(nodeIdsByDepth.get(meta.depth) ?? []), nodeId]);
  }

  for (const [depth, nodeIds] of nodeIdsByDepth.entries()) {
    const sortedNodeIds = [...nodeIds].sort((a, b) => {
      const laneDifference = (metaByNodeId.get(a)?.lane ?? 0) - (metaByNodeId.get(b)?.lane ?? 0);

      if (laneDifference !== 0) {
        return laneDifference;
      }

      return a.localeCompare(b);
    });

    let previousLane = Number.NEGATIVE_INFINITY;

    for (const nodeId of sortedNodeIds) {
      const meta = metaByNodeId.get(nodeId);

      if (!meta) {
        continue;
      }

      const lane = Math.max(meta.lane, previousLane + 1);
      previousLane = lane;
      nextMetaByNodeId.set(nodeId, { depth, lane });
    }
  }

  return nextMetaByNodeId;
}

function getLayoutShiftY(nodes: FlowNode[]): number {
  if (!nodes.length) {
    return 0;
  }

  const minY = Math.min(...nodes.map((node) => node.position.y));

  if (minY >= FLOW_CANVAS_PADDING_TOP) {
    return 0;
  }

  return FLOW_CANVAS_PADDING_TOP - minY;
}

export function doNodeBoxesOverlap(a: FlowNode, b: FlowNode): boolean {
  const aLeft = a.position.x;
  const aRight = a.position.x + FLOW_NODE_WIDTH;
  const aTop = a.position.y;
  const aBottom = a.position.y + FLOW_NODE_HEIGHT;

  const bLeft = b.position.x;
  const bRight = b.position.x + FLOW_NODE_WIDTH;
  const bTop = b.position.y;
  const bBottom = b.position.y + FLOW_NODE_HEIGHT;

  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

export function layoutFlowGraph(input: { nodes: FlowNode[]; edges: FlowEdge[] }): FlowNode[] {
  if (!input.nodes.length) {
    return [];
  }

  const sortedNodes = getSortedNodes(input.nodes);
  const sortedNodeIds = sortedNodes.map((node) => node.id);
  const nodesById = new Map(sortedNodes.map((node) => [node.id, node]));

  const outgoingBySource = new Map<string, FlowEdge[]>();
  const incomingCounts = new Map<string, number>();

  for (const nodeId of sortedNodeIds) {
    outgoingBySource.set(nodeId, []);
    incomingCounts.set(nodeId, 0);
  }

  for (const edge of input.edges) {
    outgoingBySource.set(edge.source, [...(outgoingBySource.get(edge.source) ?? []), edge]);
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  }

  for (const [nodeId, outgoingEdges] of outgoingBySource.entries()) {
    outgoingBySource.set(
      nodeId,
      sortOutgoingEdgesForLayout({
        edges: outgoingEdges,
        nodesById,
      }),
    );
  }

  const rootNodeIds = sortedNodeIds.filter((nodeId) => (incomingCounts.get(nodeId) ?? 0) === 0);
  const depthByNodeId = getDepthByNodeId({
    nodes: sortedNodes,
    edges: input.edges,
    sortedNodeIds,
  });
  const laneByNodeId = getLaneByNodeId({
    rootNodeIds,
    sortedNodeIds,
    outgoingBySource,
  });

  const anchorRootId = (rootNodeIds.length ? rootNodeIds : sortedNodeIds)[0];
  const anchorLane = laneByNodeId.get(anchorRootId) ?? 0;
  const metaByNodeId = new Map<string, LayoutNodeMeta>();

  for (const nodeId of sortedNodeIds) {
    metaByNodeId.set(nodeId, {
      depth: depthByNodeId.get(nodeId) ?? 0,
      lane: (laneByNodeId.get(nodeId) ?? 0) - anchorLane,
    });
  }

  const resolvedMetaByNodeId = resolveLaneCollisions(metaByNodeId);

  const laidOutNodes = sortedNodes.map((node) => {
    const meta = resolvedMetaByNodeId.get(node.id) ?? { depth: 0, lane: 0 };
    const position: Point = {
      x: FLOW_NODE_START_X + meta.depth * FLOW_COLUMN_STEP,
      y: FLOW_NODE_START_Y + meta.lane * FLOW_LANE_STEP,
    };

    return {
      ...node,
      position,
    };
  });

  const shiftY = getLayoutShiftY(laidOutNodes);

  if (!shiftY) {
    return laidOutNodes;
  }

  return laidOutNodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x,
      y: node.position.y + shiftY,
    },
  }));
}

export function getFlowCanvasSize(nodes: FlowNode[]): { width: number; height: number } {
  if (!nodes.length) {
    return {
      width: FLOW_CANVAS_MIN_WIDTH,
      height: FLOW_CANVAS_MIN_HEIGHT,
    };
  }

  const maxX = Math.max(...nodes.map((node) => node.position.x));
  const maxY = Math.max(...nodes.map((node) => node.position.y));

  return {
    width: Math.max(
      FLOW_CANVAS_MIN_WIDTH,
      maxX + FLOW_NODE_WIDTH + FLOW_CANVAS_PADDING_RIGHT,
    ),
    height: Math.max(
      FLOW_CANVAS_MIN_HEIGHT,
      maxY + FLOW_NODE_HEIGHT + FLOW_CANVAS_PADDING_BOTTOM,
    ),
  };
}
