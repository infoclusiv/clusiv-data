import type {
  AiCategoryOutlineEntry,
  AiKnowledgeContext,
  AiKnowledgeEntry,
  AppData,
} from "$lib/store/types";
import {
  collapseWhitespace,
  getCategory,
  getCategoryBreadcrumb,
  getCategoryCounts,
  getCategoryPathIds,
  getChildCategories,
  getFlatCategoryEntries,
  getItemDisplayTitle,
  getItemsForCategory,
  getQuickTextDisplayTitle,
  getQuickTextPreview,
  getQuickTexts,
} from "$lib/utils/categoryUtils";
import { searchAppData } from "$lib/utils/searchUtils";

const MAX_ENTRY_CONTENT_LENGTH = 1200;
const MAX_HIERARCHY_ENTRIES = 18;
const MAX_EVIDENCE_ENTRIES = 12;
const MAX_CATEGORY_ITEMS = 6;
const MAX_CATEGORY_LINKS = 6;
const MAX_CATEGORY_CHILDREN = 6;

function countLinks(appData: AppData): number {
  return Object.values(appData.__SYSTEM_CATEGORIES__).reduce(
    (total, category) => total + category.links.length,
    0,
  );
}

function truncateText(value: string, maxLength = MAX_ENTRY_CONTENT_LENGTH): string {
  const collapsed = collapseWhitespace(value);
  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function summarizeCategory(appData: AppData, categoryId: string, score: number): AiKnowledgeEntry | null {
  const category = getCategory(appData, categoryId);
  if (!category) {
    return null;
  }

  const breadcrumb = getCategoryBreadcrumb(appData, category.id);
  const childCategories = getChildCategories(appData, category.id)
    .slice(0, MAX_CATEGORY_CHILDREN)
    .map((child) => child.name);
  const links = category.links
    .slice(0, MAX_CATEGORY_LINKS)
    .map((link) => `${link.title.trim() || link.url.trim()}: ${link.url.trim()}`);
  const items = getItemsForCategory(appData, category.id)
    .slice(0, MAX_CATEGORY_ITEMS)
    .map((item) => `${item.type === "note" ? "Nota" : "Tarea"}: ${getItemDisplayTitle(item)} - ${truncateText(item.comment, 180)}`);

  const content = truncateText(
    [
      `Ruta: ${breadcrumb}`,
      category.notes.trim().length > 0 ? `Notas de categoría: ${category.notes.trim()}` : "",
      childCategories.length > 0 ? `Subcategorías directas: ${childCategories.join(", ")}` : "",
      links.length > 0 ? `Enlaces directos: ${links.join(" | ")}` : "",
      items.length > 0 ? `Notas y tareas directas: ${items.join(" | ")}` : "",
    ]
      .filter((section) => section.length > 0)
      .join("\n"),
  );

  return {
    id: `category:${category.id}`,
    type: "category",
    title: category.name,
    breadcrumb,
    preview: category.notes.trim().length > 0 ? truncateText(category.notes, 180) : "Abrir categoría",
    score,
    content,
  };
}

function summarizeItem(appData: AppData, itemType: "note" | "task", index: number, score: number): AiKnowledgeEntry | null {
  const item = appData.__SYSTEM_TASKS__[index];
  if (!item || item.type !== itemType) {
    return null;
  }

  return {
    id: `${item.type}:${index}`,
    type: item.type,
    title: getItemDisplayTitle(item),
    breadcrumb: getCategoryBreadcrumb(appData, item.category_id),
    preview: item.comment.trim().length > 0
      ? truncateText(item.comment, 180)
      : item.type === "note"
        ? "Nota sin contenido."
        : item.done
          ? "Tarea completada."
          : "Tarea pendiente.",
    score,
    content: truncateText(
      [
        `Tipo: ${item.type === "note" ? "Nota" : "Tarea"}`,
        `Ruta: ${getCategoryBreadcrumb(appData, item.category_id)}`,
        item.done ? "Estado: completada" : item.type === "task" ? "Estado: pendiente" : "",
        item.comment.trim(),
      ]
        .filter((section) => section.length > 0)
        .join("\n"),
    ),
  };
}

function summarizeLink(appData: AppData, categoryId: string, index: number, score: number): AiKnowledgeEntry | null {
  const category = getCategory(appData, categoryId);
  const link = category?.links[index];

  if (!category || !link) {
    return null;
  }

  const title = link.title.trim() || link.url.trim() || "Enlace sin título";

  return {
    id: `link:${category.id}:${index}`,
    type: "link",
    title,
    breadcrumb: getCategoryBreadcrumb(appData, category.id),
    preview: link.url.trim() || "Sin URL",
    score,
    content: truncateText(
      [
        `Ruta: ${getCategoryBreadcrumb(appData, category.id)}`,
        `Título: ${title}`,
        `URL: ${link.url.trim()}`,
      ].join("\n"),
    ),
  };
}

function summarizeQuickText(appData: AppData, quickTextId: string, score: number): AiKnowledgeEntry | null {
  const quickText = getQuickTexts(appData).find((entry) => entry.id === quickTextId);
  if (!quickText) {
    return null;
  }

  return {
    id: `quick-text:${quickText.id}`,
    type: "quick-text",
    title: getQuickTextDisplayTitle(quickText),
    breadcrumb: "Textos rápidos",
    preview: getQuickTextPreview(quickText, 180) || "Texto vacío.",
    score,
    content: truncateText(quickText.content),
  };
}

function resolveEvidenceEntry(appData: AppData, resultId: string, score: number): AiKnowledgeEntry | null {
  const [type, ...parts] = resultId.split(":");

  if (type === "category") {
    return summarizeCategory(appData, parts[0] ?? "", score);
  }

  if (type === "note" || type === "task") {
    const index = Number(parts[0]);
    return Number.isInteger(index) ? summarizeItem(appData, type, index, score) : null;
  }

  if (type === "link") {
    const index = Number(parts[1]);
    return Number.isInteger(index) ? summarizeLink(appData, parts[0] ?? "", index, score) : null;
  }

  if (type === "quick-text") {
    return summarizeQuickText(appData, parts.join(":"), score);
  }

  return null;
}

function buildHierarchyOutline(
  appData: AppData,
  evidence: AiKnowledgeEntry[],
  activeCategoryId: string | null,
): AiCategoryOutlineEntry[] {
  const flatEntries = getFlatCategoryEntries(appData);
  const orderedIds: string[] = [];
  const seen = new Set<string>();

  const pushCategory = (categoryId: string | null): void => {
    if (!categoryId) {
      return;
    }

    for (const pathId of getCategoryPathIds(appData, categoryId)) {
      if (seen.has(pathId)) {
        continue;
      }

      seen.add(pathId);
      orderedIds.push(pathId);
    }
  };

  pushCategory(activeCategoryId);

  for (const entry of evidence) {
    if (entry.type === "quick-text") {
      continue;
    }

    const categoryId = entry.type === "category"
      ? entry.id.replace(/^category:/, "")
      : flatEntries.find(([category]) => entry.breadcrumb === getCategoryBreadcrumb(appData, category.id))?.[0].id ?? null;
    pushCategory(categoryId);
  }

  for (const [category] of flatEntries) {
    if (orderedIds.length >= MAX_HIERARCHY_ENTRIES) {
      break;
    }

    if (seen.has(category.id)) {
      continue;
    }

    seen.add(category.id);
    orderedIds.push(category.id);
  }

  return orderedIds
    .slice(0, MAX_HIERARCHY_ENTRIES)
    .map((categoryId) => {
      const category = getCategory(appData, categoryId);
      if (!category) {
        return null;
      }

      const [, depth = 0] = flatEntries.find(([entry]) => entry.id === categoryId) ?? [category, 0];
      const counts = getCategoryCounts(appData, categoryId);

      return {
        id: category.id,
        name: category.name,
        breadcrumb: getCategoryBreadcrumb(appData, category.id),
        depth,
        childCount: getChildCategories(appData, category.id).length,
        itemCount: counts.noteCount + counts.taskCount,
        linkCount: category.links.length,
        notesPreview: truncateText(category.notes, 140),
      } satisfies AiCategoryOutlineEntry;
    })
    .filter((entry): entry is AiCategoryOutlineEntry => entry !== null);
}

export function buildAiKnowledgeContext(
  appData: AppData,
  query: string,
  activeCategoryId: string | null,
): AiKnowledgeContext {
  const results = searchAppData(appData, query).slice(0, MAX_EVIDENCE_ENTRIES * 2);
  const evidence: AiKnowledgeEntry[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const entry = resolveEvidenceEntry(appData, result.id, result.score);
    if (!entry || seen.has(entry.id)) {
      continue;
    }

    seen.add(entry.id);
    evidence.push(entry);

    if (evidence.length >= MAX_EVIDENCE_ENTRIES) {
      break;
    }
  }

  const activeCategory = activeCategoryId
    ? summarizeCategory(appData, activeCategoryId, 0)
    : null;

  if (evidence.length === 0 && activeCategory) {
    evidence.push(activeCategory);
  }

  return {
    query: query.trim(),
    summary: {
      categoryCount: Object.keys(appData.__SYSTEM_CATEGORIES__).length,
      itemCount: appData.__SYSTEM_TASKS__.length,
      linkCount: countLinks(appData),
      quickTextCount: getQuickTexts(appData).length,
      evidenceCount: evidence.length,
    },
    hierarchyOutline: buildHierarchyOutline(appData, evidence, activeCategoryId),
    activeCategory,
    evidence,
  };
}