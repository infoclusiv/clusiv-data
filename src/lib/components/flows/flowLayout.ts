import type { FlowNode } from "$lib/store/types";

export const FLOW_NODE_WIDTH = 208;
export const FLOW_NODE_HEIGHT = 104;

export const FLOW_NODE_START_X = 80;
export const FLOW_NODE_START_Y = 120;

export const FLOW_NODE_HORIZONTAL_GAP = 80;
export const FLOW_NODE_VERTICAL_GAP = 80;

export const FLOW_CANVAS_MIN_WIDTH = 920;
export const FLOW_CANVAS_MIN_HEIGHT = 560;
export const FLOW_CANVAS_PADDING_RIGHT = 160;
export const FLOW_CANVAS_PADDING_BOTTOM = 120;

export function getNextHorizontalNodePosition(nodes: FlowNode[]): FlowNode["position"] {
  const lastNode = nodes.at(-1);

  if (!lastNode) {
    return {
      x: FLOW_NODE_START_X,
      y: FLOW_NODE_START_Y,
    };
  }

  return {
    x: lastNode.position.x + FLOW_NODE_WIDTH + FLOW_NODE_HORIZONTAL_GAP,
    y: lastNode.position.y,
  };
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
