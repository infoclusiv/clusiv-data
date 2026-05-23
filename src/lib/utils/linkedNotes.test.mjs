import assert from "node:assert/strict";

import { normalizeAppData } from "./categoryUtils.ts";

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("normalization keeps only valid unique global quick text note ids", () => {
  const normalized = normalizeAppData({
    __SCHEMA_VERSION__: 15,
    __SYSTEM_CATEGORIES__: {
      general: {
        id: "general",
        name: "General",
        parent_id: null,
        icon: "Carpeta",
        links: [],
        notes: "",
      },
    },
    __SYSTEM_TASKS__: [
      {
        id: "note_1",
        title: "Nota 1",
        comment: "Contenido",
        images: [],
        type: "note",
        done: false,
        category_id: "general",
      },
      {
        id: "task_1",
        title: "Tarea 1",
        comment: "",
        images: [],
        type: "task",
        done: false,
        category_id: "general",
      },
    ],
    __SYSTEM_QUICK_TEXTS__: [],
    __SYSTEM_QUICK_TEXT_GROUPS__: [],
    __SYSTEM_FLOWS__: [],
    __SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__: [],
    __SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: [
      "note_1",
      "task_1",
      "missing_note",
      "note_1",
    ],
  });

  assert.deepEqual(normalized.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__, ["note_1"]);
  assert.equal(normalized.__SYSTEM_TASKS__.length, 2);
  assert.equal(normalized.__SYSTEM_TASKS__[0]?.id, "note_1");
  assert.equal(normalized.__SYSTEM_TASKS__[1]?.id, "task_1");
});
