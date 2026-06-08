import assert from "node:assert/strict";

import {
  getFlowCategoryDisplayLabel,
  normalizeAppData,
  normalizeFlow,
} from "./categoryUtils.ts";

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("normalizeFlow preserves explicit null category_id", () => {
  const flow = normalizeFlow(
    {
      id: "flow_unlinked",
      category_id: null,
      title: "Flujo sin categoria",
      comments: "",
      linked_note_ids: [],
      nodes: [],
      edges: [],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    "flow_unlinked",
  );

  assert.ok(flow);
  assert.equal(flow.category_id, null);
});

runTest("normalizeAppData preserves null flow category and filters category views by exact id only", () => {
  const normalized = normalizeAppData({
    __SCHEMA_VERSION__: 16,
    __SYSTEM_HOME_TEXT__: "",
    __SYSTEM_CATEGORIES__: {
      general: {
        id: "general",
        name: "General",
        parent_id: null,
        icon: "Carpeta",
        links: [],
        notes: "",
      },
      work: {
        id: "work",
        name: "Trabajo",
        parent_id: "general",
        icon: "Carpeta",
        links: [],
        notes: "",
      },
    },
    __SYSTEM_TASKS__: [],
    __SYSTEM_QUICK_TEXTS__: [],
    __SYSTEM_QUICK_TEXT_GROUPS__: [],
    __SYSTEM_FLOWS__: [
      {
        id: "flow_unlinked",
        category_id: null,
        title: "Sin categoria",
        comments: "",
        linked_note_ids: [],
        nodes: [],
        edges: [],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "flow_work",
        category_id: "work",
        title: "Vinculado",
        comments: "",
        linked_note_ids: [],
        nodes: [],
        edges: [],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    __SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__: [],
    __SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: [],
  });

  assert.equal(normalized.__SYSTEM_FLOWS__[0].category_id, null);
  assert.equal(normalized.__SYSTEM_FLOWS__[1].category_id, "work");
  assert.deepEqual(
    normalized.__SYSTEM_FLOWS__.filter((flow) => flow.category_id === "work").map((flow) => flow.id),
    ["flow_work"],
  );
});

runTest("getFlowCategoryDisplayLabel distinguishes null and missing categories", () => {
  const normalized = normalizeAppData({
    __SCHEMA_VERSION__: 16,
    __SYSTEM_HOME_TEXT__: "",
    __SYSTEM_CATEGORIES__: {
      general: {
        id: "general",
        name: "General",
        parent_id: null,
        icon: "Carpeta",
        links: [],
        notes: "",
      },
      project: {
        id: "project",
        name: "Proyecto",
        parent_id: "general",
        icon: "Carpeta",
        links: [],
        notes: "",
      },
    },
    __SYSTEM_TASKS__: [],
    __SYSTEM_QUICK_TEXTS__: [],
    __SYSTEM_QUICK_TEXT_GROUPS__: [],
    __SYSTEM_FLOWS__: [],
    __SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__: [],
    __SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: [],
  });

  assert.equal(
    getFlowCategoryDisplayLabel(normalized, null),
    "Sin categoria",
  );
  assert.equal(
    getFlowCategoryDisplayLabel(normalized, "project"),
    "General / Proyecto",
  );
  assert.equal(
    getFlowCategoryDisplayLabel(normalized, "missing_category"),
    "Categoria no disponible",
  );
});
