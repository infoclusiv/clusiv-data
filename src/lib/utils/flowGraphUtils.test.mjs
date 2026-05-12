import assert from "node:assert/strict";

import {
  deleteNodeAndReconnect,
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
    comments: "",
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

runTest("deletes a middle node and reconnects previous and next nodes", () => {
  const nodes = [makeNode("A"), makeNode("X"), makeNode("B")];
  const edges = [makeEdge("A", "X"), makeEdge("X", "B")];

  const result = deleteNodeAndReconnect({
    flowId: "flow-1",
    nodes,
    edges,
    nodeId: "X",
  });

  assert.equal(result.nodes.some((node) => node.id === "X"), false);
  assert.equal(getEdge(result.edges, "A", "X"), null);
  assert.equal(getEdge(result.edges, "X", "B"), null);
  assert.ok(getEdge(result.edges, "A", "B"));
  assert.equal(result.reconnectedEdges.length, 1);
});

runTest("deletes a first node without creating reconnection", () => {
  const nodes = [makeNode("X"), makeNode("B")];
  const edges = [makeEdge("X", "B")];

  const result = deleteNodeAndReconnect({
    flowId: "flow-1",
    nodes,
    edges,
    nodeId: "X",
  });

  assert.equal(result.nodes.some((node) => node.id === "X"), false);
  assert.equal(result.edges.length, 0);
  assert.equal(result.reconnectedEdges.length, 0);
});

runTest("deletes a last node without creating reconnection", () => {
  const nodes = [makeNode("A"), makeNode("X")];
  const edges = [makeEdge("A", "X")];

  const result = deleteNodeAndReconnect({
    flowId: "flow-1",
    nodes,
    edges,
    nodeId: "X",
  });

  assert.equal(result.nodes.some((node) => node.id === "X"), false);
  assert.equal(result.edges.length, 0);
  assert.equal(result.reconnectedEdges.length, 0);
});

runTest("preserves incoming branch label when deleting a branch node", () => {
  const nodes = [makeNode("A"), makeNode("X"), makeNode("B")];
  const edges = [makeEdge("A", "X", "Superior"), makeEdge("X", "B")];

  const result = deleteNodeAndReconnect({
    flowId: "flow-1",
    nodes,
    edges,
    nodeId: "X",
  });

  const edge = getEdge(result.edges, "A", "B");

  assert.ok(edge);
  assert.equal(edge.label, "Superior");
});

runTest("does not create duplicate reconnect edges", () => {
  const nodes = [makeNode("A"), makeNode("X"), makeNode("B")];
  const edges = [
    makeEdge("A", "X"),
    makeEdge("X", "B"),
    makeEdge("A", "B"),
  ];

  const result = deleteNodeAndReconnect({
    flowId: "flow-1",
    nodes,
    edges,
    nodeId: "X",
  });

  const directEdges = result.edges.filter(
    (edge) => edge.source === "A" && edge.target === "B",
  );

  assert.equal(directEdges.length, 1);
});

runTest("does not create self-loop when deleting a cyclic middle node", () => {
  const nodes = [makeNode("A"), makeNode("X")];
  const edges = [makeEdge("A", "X"), makeEdge("X", "A")];

  const result = deleteNodeAndReconnect({
    flowId: "flow-1",
    nodes,
    edges,
    nodeId: "X",
  });

  assert.equal(getEdge(result.edges, "A", "A"), null);
  assert.equal(result.reconnectedEdges.length, 0);
});

runTest("reconnects multiple incoming edges to multiple outgoing edges safely", () => {
  const nodes = [
    makeNode("A"),
    makeNode("C"),
    makeNode("X"),
    makeNode("B"),
    makeNode("D"),
  ];

  const edges = [
    makeEdge("A", "X"),
    makeEdge("C", "X"),
    makeEdge("X", "B"),
    makeEdge("X", "D"),
  ];

  const result = deleteNodeAndReconnect({
    flowId: "flow-1",
    nodes,
    edges,
    nodeId: "X",
  });

  assert.ok(getEdge(result.edges, "A", "B"));
  assert.ok(getEdge(result.edges, "A", "D"));
  assert.ok(getEdge(result.edges, "C", "B"));
  assert.ok(getEdge(result.edges, "C", "D"));
  assert.equal(result.reconnectedEdges.length, 4);
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
