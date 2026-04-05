import type { AppData, Category, Item, ItemImage, Link, QuickText } from "$lib/store/types";
import {
  GENERAL_CATEGORY_ID,
  GENERAL_CATEGORY_NAME,
  ROOT_CATEGORY_OPTION,
  SCHEMA_VERSION,
} from "$lib/utils/constants";

export function buildCategoryRecord(
  categoryId: string,
  name: string,
  parentId: string | null,
  icon = "Carpeta",
  links: Link[] = [],
  notes = "",
): Category {
  return {
    id: categoryId,
    name,
    parent_id: parentId,
    icon,
    links: [...links],
    notes,
  };
}

export function createDefaultAppData(): AppData {
  return {
    __SCHEMA_VERSION__: SCHEMA_VERSION,
    __SYSTEM_CATEGORIES__: {
      [GENERAL_CATEGORY_ID]: buildCategoryRecord(
        GENERAL_CATEGORY_ID,
        GENERAL_CATEGORY_NAME,
        null,
      ),
    },
    __SYSTEM_TASKS__: [],
    __SYSTEM_QUICK_TEXTS__: [],
  };
}

export function getCategoryMap(appData: AppData): Record<string, Category> {
  if (!appData.__SYSTEM_CATEGORIES__) {
    appData.__SYSTEM_CATEGORIES__ = {};
  }

  if (!appData.__SYSTEM_CATEGORIES__[GENERAL_CATEGORY_ID]) {
    appData.__SYSTEM_CATEGORIES__[GENERAL_CATEGORY_ID] = buildCategoryRecord(
      GENERAL_CATEGORY_ID,
      GENERAL_CATEGORY_NAME,
      null,
    );
  }

  return appData.__SYSTEM_CATEGORIES__;
}

export function getTasks(appData: AppData): Item[] {
  if (!appData.__SYSTEM_TASKS__) {
    appData.__SYSTEM_TASKS__ = [];
  }
  return appData.__SYSTEM_TASKS__;
}

export function getQuickTexts(appData: AppData): QuickText[] {
  if (!appData.__SYSTEM_QUICK_TEXTS__) {
    appData.__SYSTEM_QUICK_TEXTS__ = [];
  }
  return appData.__SYSTEM_QUICK_TEXTS__;
}

function normalizeItemImage(image: unknown, fallbackId: string): ItemImage | null {
  if (!image || typeof image !== "object") {
    return null;
  }

  const candidate = image as Partial<ItemImage>;
  if (typeof candidate.data_url !== "string" || candidate.data_url.trim().length === 0) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" && candidate.id.trim().length > 0
      ? candidate.id
      : fallbackId,
    data_url: candidate.data_url,
    name: typeof candidate.name === "string" ? candidate.name : "Imagen",
  };
}

export function normalizeItemImages(images: unknown): ItemImage[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image, index) => normalizeItemImage(image, `image-${index + 1}`))
    .filter((image): image is ItemImage => image !== null);
}

function normalizeQuickText(value: unknown, fallbackId: string): QuickText | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<QuickText>;

  return {
    id: typeof candidate.id === "string" && candidate.id.trim().length > 0
      ? candidate.id
      : fallbackId,
    title: typeof candidate.title === "string" ? candidate.title : "",
    content: typeof candidate.content === "string" ? candidate.content : "",
  };
}

export function normalizeQuickTexts(value: unknown): QuickText[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeQuickText(entry, `quick-text-${index + 1}`))
    .filter((entry): entry is QuickText => entry !== null);
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function getFirstNonEmptyLine(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";
}

export function getQuickTextDisplayTitle(
  quickText: Pick<QuickText, "title" | "content">,
): string {
  const trimmedTitle = quickText.title.trim();
  if (trimmedTitle.length > 0) {
    return trimmedTitle;
  }

  const firstLine = getFirstNonEmptyLine(quickText.content);
  return firstLine.length > 0 ? firstLine : "Sin título";
}

export function getQuickTextPreview(
  quickText: Pick<QuickText, "content">,
  maxLength = 140,
): string {
  const collapsed = collapseWhitespace(quickText.content);
  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function getItemDisplayTitle(item: Pick<Item, "title" | "comment" | "type">): string {
  const trimmedTitle = item.title.trim();
  if (trimmedTitle.length > 0) {
    return trimmedTitle;
  }

  if (item.type === "note") {
    const firstLine = getFirstNonEmptyLine(item.comment);
    if (firstLine.length > 0) {
      return firstLine;
    }
  }

  return "Sin título";
}

export function normalizeAppData(appData: AppData | null | undefined): AppData {
  const normalized = structuredClone(appData ?? createDefaultAppData());
  normalized.__SCHEMA_VERSION__ = SCHEMA_VERSION;

  const categories = getCategoryMap(normalized);
  const tasks = getTasks(normalized);
  normalized.__SYSTEM_QUICK_TEXTS__ = normalizeQuickTexts(getQuickTexts(normalized));
  const validCategoryIds = new Set(Object.keys(categories));

  const generalCategory = categories[GENERAL_CATEGORY_ID];
  generalCategory.id = GENERAL_CATEGORY_ID;
  generalCategory.name = GENERAL_CATEGORY_NAME;
  generalCategory.parent_id = null;
  generalCategory.icon ||= "Carpeta";
  generalCategory.links ||= [];
  generalCategory.notes ||= "";
  delete (generalCategory as Category & { type?: string }).type;

  for (const [categoryId, category] of Object.entries(categories)) {
    category.id ||= categoryId;
    category.name ||= categoryId === GENERAL_CATEGORY_ID ? GENERAL_CATEGORY_NAME : "Sin nombre";
    category.icon ||= "Carpeta";
    category.links ||= [];
    category.notes ||= "";
    delete (category as Category & { type?: string }).type;
    if (categoryId === GENERAL_CATEGORY_ID) {
      category.parent_id = null;
      continue;
    }
    if (category.parent_id && !validCategoryIds.has(category.parent_id)) {
      category.parent_id = GENERAL_CATEGORY_ID;
    }
  }

  for (const item of tasks) {
    item.title ||= "";
    item.comment ||= "";
    item.images = normalizeItemImages(item.images);
    item.type ||= "task";
    item.done ||= false;
    if (!item.category_id || !validCategoryIds.has(item.category_id)) {
      item.category_id = GENERAL_CATEGORY_ID;
    }
  }

  return normalized;
}

export function getCategory(appData: AppData, categoryId: string | null): Category | null {
  if (!categoryId) {
    return null;
  }
  return getCategoryMap(appData)[categoryId] ?? null;
}

export function getItemCategoryId(item: Item): string {
  return item.category_id || GENERAL_CATEGORY_ID;
}

export function generateCategoryId(appData: AppData): string {
  const existingIds = new Set(Object.keys(getCategoryMap(appData)));
  while (true) {
    const candidate = `cat_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
}

function categorySortKey(category: Category): [number, string, string] {
  const isGeneral = category.id === GENERAL_CATEGORY_ID ? 0 : 1;
  return [isGeneral, category.name.toLowerCase(), category.id];
}

function compareCategoryOrder(left: Category, right: Category): number {
  const leftKey = categorySortKey(left);
  const rightKey = categorySortKey(right);
  for (let index = 0; index < leftKey.length; index += 1) {
    if (leftKey[index] < rightKey[index]) {
      return -1;
    }
    if (leftKey[index] > rightKey[index]) {
      return 1;
    }
  }
  return 0;
}

export function getRootCategories(appData: AppData): Category[] {
  return Object.values(getCategoryMap(appData))
    .filter((category) => category.parent_id === null)
    .sort(compareCategoryOrder);
}

export function getChildCategories(appData: AppData, parentId: string | null): Category[] {
  return Object.values(getCategoryMap(appData))
    .filter((category) => category.parent_id === parentId)
    .sort(compareCategoryOrder);
}

export function getFlatCategoryEntries(appData: AppData): Array<[Category, number]> {
  const entries: Array<[Category, number]> = [];

  function walk(parentId: string | null, depth: number): void {
    for (const category of getChildCategories(appData, parentId)) {
      entries.push([category, depth]);
      walk(category.id, depth + 1);
    }
  }

  walk(null, 0);
  return entries;
}

export function getDescendantIds(appData: AppData, categoryId: string): Set<string> {
  const descendants = new Set<string>();
  for (const child of getChildCategories(appData, categoryId)) {
    descendants.add(child.id);
    for (const descendantId of getDescendantIds(appData, child.id)) {
      descendants.add(descendantId);
    }
  }
  return descendants;
}

export function categoryHasChildren(appData: AppData, categoryId: string): boolean {
  return Object.values(getCategoryMap(appData)).some(
    (category) => category.parent_id === categoryId,
  );
}

export function wouldCreateCycle(
  appData: AppData,
  categoryId: string,
  newParentId: string | null,
): boolean {
  if (!newParentId) {
    return false;
  }
  if (categoryId === newParentId) {
    return true;
  }
  return getDescendantIds(appData, categoryId).has(newParentId);
}

export function isNameTakenUnderParent(
  appData: AppData,
  name: string,
  parentId: string | null,
  excludeCategoryId: string | null = null,
): boolean {
  const normalizedName = name.trim().toLowerCase();
  return getChildCategories(appData, parentId).some((category) => {
    if (category.id === excludeCategoryId) {
      return false;
    }
    return category.name.trim().toLowerCase() === normalizedName;
  });
}

export function getCategoryBreadcrumb(
  appData: AppData,
  categoryId: string | null,
  includeGeneral = true,
): string {
  if (!categoryId) {
    return GENERAL_CATEGORY_NAME;
  }

  const parts: string[] = [];
  const seen = new Set<string>();
  let current = getCategory(appData, categoryId);

  while (current) {
    if (seen.has(current.id)) {
      break;
    }

    seen.add(current.id);
    if (includeGeneral || current.id !== GENERAL_CATEGORY_ID) {
      parts.unshift(current.name);
    }
    current = current.parent_id ? getCategory(appData, current.parent_id) : null;
  }

  return parts.length > 0 ? parts.join(" / ") : GENERAL_CATEGORY_NAME;
}

export function getCategoryPathIds(appData: AppData, categoryId: string | null): string[] {
  if (!categoryId) {
    return [];
  }

  const pathIds: string[] = [];
  const seen = new Set<string>();
  let current = getCategory(appData, categoryId);

  while (current) {
    if (seen.has(current.id)) {
      break;
    }

    seen.add(current.id);
    pathIds.unshift(current.id);
    current = current.parent_id ? getCategory(appData, current.parent_id) : null;
  }

  return pathIds;
}

export function getAvailableParentEntries(
  appData: AppData,
  editingCategoryId: string | null = null,
): Array<[string, string]> {
  const excludedIds = new Set<string>();

  if (editingCategoryId) {
    excludedIds.add(editingCategoryId);
    for (const descendantId of getDescendantIds(appData, editingCategoryId)) {
      excludedIds.add(descendantId);
    }
  }

  return getFlatCategoryEntries(appData)
    .filter(([category]) => !excludedIds.has(category.id))
    .map(([category]) => [category.id, getCategoryBreadcrumb(appData, category.id)]);
}

export function getCategoryOptions(appData: AppData): Array<[string, string]> {
  return getFlatCategoryEntries(appData).map(([category]) => [
    category.id,
    getCategoryBreadcrumb(appData, category.id),
  ]);
}

export function resolveParentSelection(value: string): string | null {
  return value === ROOT_CATEGORY_OPTION ? null : value;
}

export function getCategoryChildrenSummary(appData: AppData, categoryId: string): string {
  const childCount = getChildCategories(appData, categoryId).length;
  if (childCount === 0) {
    return "Sin subcategorías";
  }
  return childCount === 1 ? "1 subcategoría" : `${childCount} subcategorías`;
}

export function getItemsForCategory(appData: AppData, categoryId: string): Item[] {
  return getTasks(appData).filter((item) => getItemCategoryId(item) === categoryId);
}

export function getNotesForCategory(appData: AppData, categoryId: string): Item[] {
  return getItemsForCategory(appData, categoryId).filter((item) => item.type === "note");
}

export function getTasksForCategory(appData: AppData, categoryId: string): Item[] {
  return getItemsForCategory(appData, categoryId).filter((item) => item.type !== "note");
}

export function getCategoryCounts(appData: AppData, categoryId: string): {
  noteCount: number;
  taskCount: number;
} {
  return getItemsForCategory(appData, categoryId).reduce(
    (counts, item) => {
      if (item.type === "note") {
        counts.noteCount += 1;
      } else {
        counts.taskCount += 1;
      }
      return counts;
    },
    { noteCount: 0, taskCount: 0 },
  );
}

export function formatItemCounts(noteCount: number, taskCount: number): string {
  const noteLabel = noteCount === 1 ? "nota" : "notas";
  const taskLabel = taskCount === 1 ? "tarea" : "tareas";
  return `${noteCount} ${noteLabel} • ${taskCount} ${taskLabel}`;
}