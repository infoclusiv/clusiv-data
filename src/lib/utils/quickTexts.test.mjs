import assert from "node:assert/strict";

import {
  getQuickTextGroupSortOrder,
  normalizeQuickTextGroupSortOrders,
  removeQuickTextGroupMembership,
} from "./quickTextGrouping.ts";

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function sortQuickTextsForGroup(quickTexts, groupId) {
  return quickTexts
    .slice()
    .sort((left, right) =>
      getQuickTextGroupSortOrder(left, groupId) - getQuickTextGroupSortOrder(right, groupId)
      || left.title.localeCompare(right.title)
      || left.id.localeCompare(right.id)
    );
}

runTest("supports different per-group order values for the same texts", () => {
  const quickTexts = [
    {
      id: "alpha",
      title: "Alpha",
      content: "",
      group_ids: ["group-a", "group-b"],
      group_id: "group-a",
      sort_order: 50,
      group_sort_orders: {
        "group-a": 2,
        "group-b": 1,
      },
    },
    {
      id: "beta",
      title: "Beta",
      content: "",
      group_ids: ["group-a", "group-b"],
      group_id: "group-a",
      sort_order: 60,
      group_sort_orders: {
        "group-a": 1,
        "group-b": 2,
      },
    },
  ];

  assert.deepEqual(
    sortQuickTextsForGroup(quickTexts, "group-a").map((quickText) => quickText.id),
    ["beta", "alpha"],
  );
  assert.deepEqual(
    sortQuickTextsForGroup(quickTexts, "group-b").map((quickText) => quickText.id),
    ["alpha", "beta"],
  );
});

runTest("removing one group leaves the text in its other groups", () => {
  const quickText = {
    id: "shared-text",
    title: "Shared",
    content: "",
    group_ids: ["group-a", "group-b"],
    group_id: "group-a",
    sort_order: 7,
    group_sort_orders: {
      "group-a": 2,
      "group-b": 9,
    },
  };

  removeQuickTextGroupMembership(quickText, "group-a");

  assert.deepEqual(quickText.group_ids, ["group-b"]);
  assert.equal(quickText.group_id, "group-b");
  assert.deepEqual(quickText.group_sort_orders, { "group-b": 9 });
});

runTest("removing the last group leaves the text ungrouped and clears legacy group_id", () => {
  const quickText = {
    id: "solo-text",
    title: "Solo",
    content: "",
    group_ids: ["group-a"],
    group_id: "group-a",
    sort_order: 4,
    group_sort_orders: {
      "group-a": 11,
    },
  };

  removeQuickTextGroupMembership(quickText, "group-a");

  assert.deepEqual(quickText.group_ids, []);
  assert.equal(quickText.group_id, null);
  assert.deepEqual(quickText.group_sort_orders, {});
});

runTest("normalization drops orphan group orders and falls back for invalid values", () => {
  const groupSortOrders = normalizeQuickTextGroupSortOrders(
    {
      group_ids: ["group-a", "ghost-group"],
      group_id: "group-a",
      sort_order: 13,
      group_sort_orders: {
        "group-a": "invalid",
        "ghost-group": 2,
        "group-b": 99,
      },
    },
    new Set(["group-a", "group-b"]),
  );

  assert.deepEqual(groupSortOrders, { "group-a": 13 });
});

runTest("legacy sort_order still works as the fallback group order", () => {
  const quickText = {
    id: "legacy-text",
    title: "Legacy",
    content: "",
    group_ids: ["group-a"],
    group_id: "group-a",
    sort_order: 21,
    group_sort_orders: {},
  };

  assert.equal(getQuickTextGroupSortOrder(quickText, "group-a"), 21);
  assert.equal(getQuickTextGroupSortOrder(quickText, null), 21);
});
