import assert from "node:assert/strict";

import {
  getLastFlowNode,
  insertNodeAfterSource,
  insertNodeBeforeTarget,
  insertNodeBetweenEdge,
} from "./flowGraphUtils.ts";

function makeNode(id, x = 0, y = 0, title = id) {
  return {
    id,
    type: "process",
    title,
    description: "",
    linked_note_ids: [],
    position: { x, y },
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

function getEdge(edges, source, target) {
  return edges.find((edge) => edge.source === source && edge.target === target) ?? null;
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

runTest("inserts a node before the first node in a linear flow", () => {
  const nodes = [makeNode("A", 0, 120), makeNode("B", 240, 120), makeNode("C", 480, 120)];
  const edges = [makeEdge("A", "B"), makeEdge("B", "C")];
  const insertedNode = makeNode("X", -240, 120);

  const result = insertNodeBeforeTarget({
    flowId: "flow-1",
    nodes,
    edges,
    targetNodeId: "A",
    insertedNode,
  });

  assert.equal(result.nodes.some((node) => node.id === "X"), true);
  assert.ok(getEdge(result.edges, "X", "A"));
  assert.ok(getEdge(result.edges, "A", "B"));
  assert.ok(getEdge(result.edges, "B", "C"));
  assert.equal(result.edges.length, 3);
});

runTest("inserts a node on a specific edge", () => {
  const nodes = [makeNode("A"), makeNode("B")];
  const edges = [makeEdge("A", "B")];
  const insertedNode = makeNode("X");

  const result = insertNodeBetweenEdge({
    flowId: "flow-1",
    nodes,
    edges,
    edgeId: edges[0].id,
    insertedNode,
  });

  assert.ok(getEdge(result.edges, "A", "X"));
  assert.ok(getEdge(result.edges, "X", "B"));
  assert.equal(getEdge(result.edges, "A", "B"), null);
});

runTest("inserts a node after a source with one outgoing edge", () => {
  const nodes = [makeNode("A"), makeNode("B")];
  const edges = [makeEdge("A", "B")];
  const insertedNode = makeNode("X");

  const result = insertNodeAfterSource({
    flowId: "flow-1",
    nodes,
    edges,
    sourceNodeId: "A",
    insertedNode,
  });

  assert.ok(getEdge(result.edges, "A", "X"));
  assert.ok(getEdge(result.edges, "X", "B"));
  assert.equal(getEdge(result.edges, "A", "B"), null);
});

runTest("inserts a node after a source with no outgoing edges", () => {
  const nodes = [makeNode("A")];
  const insertedNode = makeNode("X");

  const result = insertNodeAfterSource({
    flowId: "flow-1",
    nodes,
    edges: [],
    sourceNodeId: "A",
    insertedNode,
  });

  assert.ok(getEdge(result.edges, "A", "X"));
  assert.equal(result.edges.length, 1);
});

runTest("rejects insert after when a node has multiple outgoing edges", () => {
  const nodes = [makeNode("A"), makeNode("B"), makeNode("C")];
  const edges = [makeEdge("A", "B"), makeEdge("A", "C")];
  const insertedNode = makeNode("X");

  assert.throws(
    () =>
      insertNodeAfterSource({
        flowId: "flow-1",
        nodes,
        edges,
        sourceNodeId: "A",
        insertedNode,
      }),
    /varias salidas/,
  );
});

runTest("preserves the branch label on the first segment when inserting on an edge", () => {
  const nodes = [makeNode("A"), makeNode("B")];
  const edges = [makeEdge("A", "B", "Superior")];
  const insertedNode = makeNode("X");

  const result = insertNodeBetweenEdge({
    flowId: "flow-1",
    nodes,
    edges,
    edgeId: edges[0].id,
    insertedNode,
  });

  const firstSegment = getEdge(result.edges, "A", "X");
  const secondSegment = getEdge(result.edges, "X", "B");

  assert.ok(firstSegment);
  assert.ok(secondSegment);
  assert.equal(firstSegment.label, "Superior");
  assert.equal(secondSegment.label, "");
});

runTest("finds the logical last node without depending on array order", () => {
  const a = makeNode("A", 0, 120);
  const b = makeNode("B", 240, 120);
  const c = makeNode("C", 480, 120);
  const nodes = [c, a, b];
  const edges = [makeEdge("A", "B"), makeEdge("B", "C")];

  const lastNode = getLastFlowNode(nodes, edges);

  assert.equal(lastNode?.id, "C");
});
