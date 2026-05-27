import assert from "node:assert/strict";

import { normalizeAppData } from "$lib/utils/categoryUtils";
import { DEFAULT_HOME_TEXT, SCHEMA_VERSION } from "$lib/utils/constants";

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function buildBaseAppData() {
  return {
    __SCHEMA_VERSION__: SCHEMA_VERSION,
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
    __SYSTEM_TASKS__: [],
    __SYSTEM_QUICK_TEXTS__: [],
    __SYSTEM_QUICK_TEXT_GROUPS__: [],
    __SYSTEM_FLOWS__: [],
    __SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__: [],
    __SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: [],
  };
}

runTest("missing home text normalizes to the default value", () => {
  const normalized = normalizeAppData(buildBaseAppData());

  assert.equal(normalized.__SYSTEM_HOME_TEXT__, DEFAULT_HOME_TEXT);
});

runTest("existing multiline home text is preserved exactly", () => {
  const customHomeText = "Keep going.\nThe work becomes the way.";
  const normalized = normalizeAppData({
    ...buildBaseAppData(),
    __SYSTEM_HOME_TEXT__: customHomeText,
  });

  assert.equal(normalized.__SYSTEM_HOME_TEXT__, customHomeText);
});

runTest("invalid non-string home text falls back safely", () => {
  const normalized = normalizeAppData({
    ...buildBaseAppData(),
    __SYSTEM_HOME_TEXT__: 42,
  });

  assert.equal(normalized.__SYSTEM_HOME_TEXT__, DEFAULT_HOME_TEXT);
});

runTest("blank home text remains blank when intentionally saved", () => {
  const normalized = normalizeAppData({
    ...buildBaseAppData(),
    __SYSTEM_HOME_TEXT__: "",
  });

  assert.equal(normalized.__SYSTEM_HOME_TEXT__, "");
});
