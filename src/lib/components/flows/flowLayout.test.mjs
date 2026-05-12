import assert from "node:assert/strict";

import {
  FLOW_COLUMN_STEP,
  FLOW_LANE_STEP,
  FLOW_NODE_HEIGHT,
  FLOW_NODE_WIDTH,
  doNodeBoxesOverlap,
  layoutFlowGraph,
} from "./flowLayout.ts";

function makeNode(id, title = id) {
  return {
    id,
    type: "process",
    title,
    description: "",
    comments: "",
    linked_note_ids: [],
    position: { x: 0, y: 0 },
  };
}

function makeEdge(source, target, label = "") {
  return {
    id: `${source}-${target}-${label || "edge"}`,
    source,
    target,
    label,
  };
}

function getNodeById(nodes, nodeId) {
  const node = nodes.find((candidate) => candidate.id === nodeId);

  assert.ok(node, `Node ${nodeId} should exist`);
  return node;
}

function assertNoOverlaps(nodes) {
  for (let index = 0; index < nodes.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < nodes.length; nextIndex += 1) {
      assert.equal(
        doNodeBoxesOverlap(nodes[index], nodes[nextIndex]),
        false,
        `Nodes ${nodes[index].id} and ${nodes[nextIndex].id} should not overlap`,
      );
    }
  }
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("layouts a linear flow with constant horizontal spacing", () => {
  const nodes = [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")];
  const edges = [makeEdge("A", "B"), makeEdge("B", "C"), makeEdge("C", "D")];
  const laidOutNodes = layoutFlowGraph({ nodes, edges });

  const a = getNodeById(laidOutNodes, "A");
  const b = getNodeById(laidOutNodes, "B");
  const c = getNodeById(laidOutNodes, "C");
  const d = getNodeById(laidOutNodes, "D");

  assert.equal(a.position.y, b.position.y);
  assert.equal(b.position.y, c.position.y);
  assert.equal(c.position.y, d.position.y);
  assert.equal(b.position.x - a.position.x, FLOW_COLUMN_STEP);
  assert.equal(c.position.x - b.position.x, FLOW_COLUMN_STEP);
  assert.equal(d.position.x - c.position.x, FLOW_COLUMN_STEP);
  assertNoOverlaps(laidOutNodes);
});

runTest("places superior and inferior branches on separate lanes", () => {
  const nodes = [makeNode("A"), makeNode("B"), makeNode("C")];
  const edges = [
    makeEdge("A", "B", "Superior"),
    makeEdge("A", "C", "Inferior"),
  ];
  const laidOutNodes = layoutFlowGraph({ nodes, edges });

  const b = getNodeById(laidOutNodes, "B");
  const c = getNodeById(laidOutNodes, "C");

  assert.equal(b.position.x, c.position.x);
  assert.equal(c.position.y - b.position.y, FLOW_LANE_STEP);
  assert.ok(b.position.y < c.position.y);
  assertNoOverlaps(laidOutNodes);
});

runTest("opens four visible lanes when upper and lower branches subdivide", () => {
  const nodes = [
    makeNode("A"),
    makeNode("B"),
    makeNode("C"),
    makeNode("D"),
    makeNode("E"),
    makeNode("F"),
    makeNode("G"),
  ];
  const edges = [
    makeEdge("A", "B", "Superior"),
    makeEdge("A", "C", "Inferior"),
    makeEdge("B", "D", "Superior"),
    makeEdge("B", "E", "Inferior"),
    makeEdge("C", "F", "Superior"),
    makeEdge("C", "G", "Inferior"),
  ];
  const laidOutNodes = layoutFlowGraph({ nodes, edges });

  const d = getNodeById(laidOutNodes, "D");
  const e = getNodeById(laidOutNodes, "E");
  const f = getNodeById(laidOutNodes, "F");
  const g = getNodeById(laidOutNodes, "G");
  const lanes = new Set([d.position.y, e.position.y, f.position.y, g.position.y]);

  assert.equal(lanes.size, 4);
  assert.ok(d.position.y < e.position.y);
  assert.ok(e.position.y < f.position.y);
  assert.ok(f.position.y < g.position.y);
  assert.equal(e.position.x - d.position.x, 0);
  assert.equal(f.position.x - e.position.x, 0);
  assertNoOverlaps(laidOutNodes);
});

runTest("keeps node dimensions stable with long titles", () => {
  const longTitle =
    "Nodo con un titulo extremadamente largo que no deberia cambiar el tamano del layout";
  const laidOutNodes = layoutFlowGraph({
    nodes: [makeNode("A", longTitle)],
    edges: [],
  });

  const node = getNodeById(laidOutNodes, "A");

  assert.equal(FLOW_NODE_WIDTH, 208);
  assert.equal(FLOW_NODE_HEIGHT, 112);
  assert.equal(typeof node.title, "string");
  assertNoOverlaps(laidOutNodes);
});

runTest("recalculates cleanly after removing a branch node", () => {
  const nodes = [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")];
  const edges = [
    makeEdge("A", "B", "Superior"),
    makeEdge("A", "C", "Inferior"),
    makeEdge("B", "D"),
  ];

  const nextNodes = nodes.filter((node) => node.id !== "B");
  const nextEdges = edges.filter((edge) => edge.source !== "B" && edge.target !== "B");
  const laidOutNodes = layoutFlowGraph({ nodes: nextNodes, edges: nextEdges });

  assert.equal(laidOutNodes.some((node) => node.id === "B"), false);
  assert.equal(laidOutNodes.length, 3);
  assertNoOverlaps(laidOutNodes);
});
