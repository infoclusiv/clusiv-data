import assert from "node:assert/strict";

import {
  buildFlowCategoryOptions,
  flowCategoryIdToValue,
  flowCategoryValueToId,
  UNLINKED_FLOW_OPTION_LABEL,
  UNLINKED_FLOW_OPTION_VALUE,
} from "./flowCreateDialog.ts";

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("buildFlowCategoryOptions prepends the unlinked option and keeps breadcrumbs", () => {
  const options = buildFlowCategoryOptions({
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
      subflow: {
        id: "subflow",
        name: "Subproceso",
        parent_id: "project",
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

  assert.equal(options[0]?.value, UNLINKED_FLOW_OPTION_VALUE);
  assert.equal(options[0]?.label, UNLINKED_FLOW_OPTION_LABEL);
  assert.equal(options[1]?.label, "General");
  assert.equal(options[2]?.label, "General / Proyecto");
  assert.equal(options[3]?.label, "General / Proyecto / Subproceso");
});

runTest("flow category value conversion preserves explicit null", () => {
  assert.equal(flowCategoryIdToValue(null), UNLINKED_FLOW_OPTION_VALUE);
  assert.equal(flowCategoryValueToId(UNLINKED_FLOW_OPTION_VALUE), null);
  assert.equal(flowCategoryValueToId("project"), "project");
});
