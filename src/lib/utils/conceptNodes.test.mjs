import assert from "node:assert/strict";
import { createDefaultAppData, normalizeAppData, normalizeConceptNodes } from "./categoryUtils.ts";

function test(name, check) {
  check();
  console.log(`PASS ${name}`);
}

function fixture() {
  const data = createDefaultAppData();
  data.__SYSTEM_CATEGORIES__.research = {
    id: "research", name: "Investigacion", parent_id: "general",
    icon: "Ideas", links: [], notes: "",
  };
  data.__SYSTEM_TASKS__.push(
    { id: "note_1", title: "Apunte", comment: "Texto", type: "note", done: false, category_id: "general", tags: [], images: [] },
    { id: "task_1", title: "Tarea", comment: "", type: "task", done: false, category_id: "general", tags: [], images: [] },
  );
  return data;
}

test("older datasets acquire an empty concept map without losing notes", () => {
  const legacy = fixture();
  delete legacy.__SYSTEM_CONCEPT_NODES__;
  const normalized = normalizeAppData(legacy);
  assert.deepEqual(normalized.__SYSTEM_CONCEPT_NODES__, []);
  assert.equal(normalized.__SYSTEM_TASKS__.length, 2);
});

test("normalization deduplicates concept identifiers and linked note IDs", () => {
  const nodes = normalizeConceptNodes([
    { id: "a", category_id: "general", title: " A ", color: "not-a-color", linked_note_ids: ["note_1", "note_1", "", null] },
    { id: "a", category_id: "general", title: "Duplicate" },
    { id: "b", category_id: "general", title: "" },
    null,
  ]);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].title, "A");
  assert.equal(nodes[0].color, "emerald");
  assert.deepEqual(nodes[0].linked_note_ids, ["note_1"]);
});

test("multiple concepts can link the same existing note without moving or duplicating it", () => {
  const data = fixture();
  data.__SYSTEM_CONCEPT_NODES__ = [
    { id: "root", category_id: "research", parent_id: null, title: "Mercados", color: "teal", icon: "Layers", linked_note_ids: ["note_1", "task_1", "missing"] },
    { id: "child", category_id: "research", parent_id: "root", title: "Opciones", color: "amber", icon: "Layers", linked_note_ids: ["note_1"] },
  ];
  const normalized = normalizeAppData(data);
  assert.deepEqual(normalized.__SYSTEM_CONCEPT_NODES__[0].linked_note_ids, ["note_1"]);
  assert.deepEqual(normalized.__SYSTEM_CONCEPT_NODES__[1].linked_note_ids, ["note_1"]);
  assert.equal(normalized.__SYSTEM_CONCEPT_NODES__[1].parent_id, "root");
  assert.equal(normalized.__SYSTEM_TASKS__.length, 2);
  assert.equal(normalized.__SYSTEM_TASKS__[0].category_id, "general");
});

test("manually dragged positions survive normalization and old nodes remain automatic", () => {
  const data = fixture();
  data.__SYSTEM_CONCEPT_NODES__ = [
    { id: "manual", category_id: "general", parent_id: null, title: "Moved", color: "teal", icon: "Layers", linked_note_ids: [], position: { x: -824.6, y: 1360.4 } },
    { id: "automatic", category_id: "general", parent_id: "manual", title: "Fresh", color: "teal", icon: "Layers", linked_note_ids: [] },
  ];
  const normalized = normalizeAppData(data);
  assert.deepEqual(normalized.__SYSTEM_CONCEPT_NODES__[0].position, { x: -825, y: 1360 });
  assert.equal(normalized.__SYSTEM_CONCEPT_NODES__[1].position, null);
});

test("invalid parents and cyclic concept links cannot break the tree", () => {
  const data = fixture();
  data.__SYSTEM_CONCEPT_NODES__ = [
    { id: "one", category_id: "research", parent_id: "two", title: "One", color: "teal", icon: "Layers", linked_note_ids: [] },
    { id: "two", category_id: "research", parent_id: "one", title: "Two", color: "teal", icon: "Layers", linked_note_ids: [] },
    { id: "three", category_id: "general", parent_id: "one", title: "Other", color: "teal", icon: "Layers", linked_note_ids: [] },
    { id: "orphan", category_id: "missing", parent_id: null, title: "Lost", color: "teal", icon: "Layers", linked_note_ids: [] },
  ];
  const normalized = normalizeAppData(data);
  assert.equal(normalized.__SYSTEM_CONCEPT_NODES__.length, 3);
  assert.equal(normalized.__SYSTEM_CONCEPT_NODES__.find((item) => item.id === "three").parent_id, null);
  const parents = new Map(normalized.__SYSTEM_CONCEPT_NODES__.map((item) => [item.id, item.parent_id]));
  for (const node of normalized.__SYSTEM_CONCEPT_NODES__) {
    const seen = new Set([node.id]);
    let cursor = node.parent_id;
    while (cursor) {
      assert.equal(seen.has(cursor), false, `cycle found at ${cursor}`);
      seen.add(cursor);
      cursor = parents.get(cursor) ?? null;
    }
  }
});
