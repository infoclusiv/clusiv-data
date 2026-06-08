import type { AppData } from "$lib/store/types";
import { getCategoryOptions } from "$lib/utils/categoryUtils";

export const UNLINKED_FLOW_OPTION_VALUE = "__FLOW_CATEGORY_NONE__";
export const UNLINKED_FLOW_OPTION_LABEL = "Sin categoria";

export interface FlowCategoryOption {
  value: string;
  label: string;
}

export function buildFlowCategoryOptions(appData: AppData): FlowCategoryOption[] {
  return [
    { value: UNLINKED_FLOW_OPTION_VALUE, label: UNLINKED_FLOW_OPTION_LABEL },
    ...getCategoryOptions(appData).map(([value, label]) => ({ value, label })),
  ];
}

export function flowCategoryIdToValue(categoryId: string | null): string {
  return categoryId ?? UNLINKED_FLOW_OPTION_VALUE;
}

export function flowCategoryValueToId(value: string): string | null {
  return value === UNLINKED_FLOW_OPTION_VALUE ? null : value;
}
