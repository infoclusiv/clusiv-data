import type { QuickText } from "../store/types.ts";

export function normalizeQuickTextGroupIds(value: {
  group_ids?: unknown;
  group_id?: unknown;
}): string[] {
  const groupIds: string[] = [];

  if (Array.isArray(value.group_ids)) {
    for (const entry of value.group_ids) {
      if (typeof entry !== "string") {
        continue;
      }

      const trimmedEntry = entry.trim();
      if (trimmedEntry.length === 0 || groupIds.includes(trimmedEntry)) {
        continue;
      }

      groupIds.push(trimmedEntry);
    }
  }

  if (typeof value.group_id === "string") {
    const trimmedGroupId = value.group_id.trim();
    if (trimmedGroupId.length > 0 && !groupIds.includes(trimmedGroupId)) {
      groupIds.push(trimmedGroupId);
    }
  }

  return groupIds;
}

export function syncLegacyQuickTextGroupId<T extends {
  group_ids: string[];
  group_id: string | null;
}>(quickText: T): T {
  quickText.group_id = quickText.group_ids[0] ?? null;
  return quickText;
}

export function getEffectiveQuickTextGroupIds(
  quickText: Pick<QuickText, "group_ids" | "group_id">,
  validGroupIds?: Set<string>,
): string[] {
  const groupIds = normalizeQuickTextGroupIds(quickText);
  return validGroupIds ? groupIds.filter((groupId) => validGroupIds.has(groupId)) : groupIds;
}

export function normalizeQuickTextGroupSortOrders(
  quickText: Pick<QuickText, "group_ids" | "group_id" | "sort_order"> & {
    group_sort_orders?: unknown;
  },
  validGroupIds?: Set<string>,
): Record<string, number> {
  const effectiveGroupIds = getEffectiveQuickTextGroupIds(quickText, validGroupIds);
  const nextGroupSortOrders: Record<string, number> = {};
  const fallbackSortOrder = Number.isFinite(Number(quickText.sort_order))
    ? Number(quickText.sort_order)
    : 0;
  const candidateGroupSortOrders = quickText.group_sort_orders;

  for (const groupId of effectiveGroupIds) {
    const rawValue = candidateGroupSortOrders
      && typeof candidateGroupSortOrders === "object"
      && !Array.isArray(candidateGroupSortOrders)
      ? (candidateGroupSortOrders as Record<string, unknown>)[groupId]
      : undefined;
    const normalizedValue = Number(rawValue);

    nextGroupSortOrders[groupId] = Number.isFinite(normalizedValue)
      ? normalizedValue
      : fallbackSortOrder;
  }

  return nextGroupSortOrders;
}

export function getQuickTextGroupSortOrder(
  quickText: Pick<QuickText, "sort_order" | "group_sort_orders">,
  groupId: string | null,
): number {
  if (groupId === null) {
    return quickText.sort_order;
  }

  return quickText.group_sort_orders[groupId] ?? quickText.sort_order;
}

export function removeQuickTextGroupMembership<
  T extends Pick<QuickText, "group_ids" | "group_id" | "group_sort_orders" | "sort_order">,
>(quickText: T, groupId: string): T {
  quickText.group_ids = quickText.group_ids.filter((entry) => entry !== groupId);
  syncLegacyQuickTextGroupId(quickText);
  quickText.group_sort_orders = normalizeQuickTextGroupSortOrders(
    quickText,
    new Set(quickText.group_ids),
  );
  return quickText;
}
