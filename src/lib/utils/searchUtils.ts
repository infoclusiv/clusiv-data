import type { AppData } from "$lib/store/types";
import {
  collapseWhitespace,
  getCategoryBreadcrumb,
  getFlatCategoryEntries,
  getItemCategoryId,
  getItemDisplayTitle,
  getQuickTextDisplayTitle,
  getQuickTextPreview,
  getQuickTexts,
  getTasks,
} from "$lib/utils/categoryUtils";

export type SearchResultType = "category" | "note" | "task" | "link" | "quick-text";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  preview: string;
  breadcrumb: string;
  categoryId: string | null;
  matchLabel: string;
  score: number;
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenizeQuery(query: string): string[] {
  return normalizeSearchValue(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function includesAllTokens(value: string, tokens: string[]): boolean {
  return tokens.every((token) => value.includes(token));
}

function createSnippet(value: string, maxLength = 140): string {
  const collapsed = collapseWhitespace(value);
  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function calculateScore(tokens: string[], primaryFields: string[], secondaryFields: string[]): number {
  const normalizedPrimaryFields = primaryFields.map((field) => normalizeSearchValue(field));
  const normalizedSecondaryFields = secondaryFields.map((field) => normalizeSearchValue(field));
  const normalizedPrimary = normalizedPrimaryFields.join(" ");
  const normalizedSecondary = normalizedSecondaryFields.join(" ");

  let score = 0;

  if (includesAllTokens(normalizedPrimary, tokens)) {
    score += 320;
  }

  if (includesAllTokens(normalizedSecondary, tokens)) {
    score += 150;
  }

  for (const token of tokens) {
    if (normalizedPrimaryFields.some((field) => field.startsWith(token))) {
      score += 40;
      continue;
    }

    if (normalizedPrimary.includes(token)) {
      score += 20;
      continue;
    }

    if (normalizedSecondary.includes(token)) {
      score += 8;
    }
  }

  return score;
}

export function searchAppData(appData: AppData, query: string): SearchResult[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const [category] of getFlatCategoryEntries(appData)) {
    const breadcrumb = getCategoryBreadcrumb(appData, category.id);
    const name = category.name.trim();
    const notes = category.notes.trim();
    const combined = normalizeSearchValue([name, notes, breadcrumb].join(" "));

    if (!includesAllTokens(combined, tokens)) {
      continue;
    }

    const normalizedName = normalizeSearchValue(name);
    const normalizedNotes = normalizeSearchValue(notes);
    const matchLabel = includesAllTokens(normalizedName, tokens)
      ? "Nombre"
      : includesAllTokens(normalizedNotes, tokens)
        ? "Notas"
        : "Ruta";

    results.push({
      id: `category:${category.id}`,
      type: "category",
      title: name,
      preview: notes ? createSnippet(notes) : "Abrir categoría",
      breadcrumb,
      categoryId: category.id,
      matchLabel,
      score: calculateScore(tokens, [name], [notes, breadcrumb]),
    });

    for (const [index, link] of category.links.entries()) {
      const linkTitle = link.title.trim() || link.url.trim();
      const linkUrl = link.url.trim();
      const linkCombined = normalizeSearchValue([linkTitle, linkUrl, breadcrumb].join(" "));

      if (!includesAllTokens(linkCombined, tokens)) {
        continue;
      }

      const normalizedLinkTitle = normalizeSearchValue(linkTitle);
      const normalizedLinkUrl = normalizeSearchValue(linkUrl);
      const linkMatchLabel = includesAllTokens(normalizedLinkTitle, tokens)
        ? "Título"
        : includesAllTokens(normalizedLinkUrl, tokens)
          ? "URL"
          : "Categoría";

      results.push({
        id: `link:${category.id}:${index}`,
        type: "link",
        title: linkTitle || "Enlace sin título",
        preview: linkUrl,
        breadcrumb,
        categoryId: category.id,
        matchLabel: linkMatchLabel,
        score: calculateScore(tokens, [linkTitle, linkUrl], [breadcrumb, category.name]),
      });
    }
  }

  for (const [index, item] of getTasks(appData).entries()) {
    const categoryId = getItemCategoryId(item);
    const breadcrumb = getCategoryBreadcrumb(appData, categoryId);
    const explicitTitle = item.title.trim();
    const title = explicitTitle || (item.type === "note" ? "Nota sin título" : getItemDisplayTitle(item));
    const comment = item.comment.trim();
    const combined = normalizeSearchValue([explicitTitle, comment, breadcrumb].join(" "));

    if (!includesAllTokens(combined, tokens)) {
      continue;
    }

    const normalizedExplicitTitle = normalizeSearchValue(explicitTitle);
    const normalizedComment = normalizeSearchValue(comment);
    const matchLabel = explicitTitle && includesAllTokens(normalizedExplicitTitle, tokens)
      ? "Título"
      : includesAllTokens(normalizedComment, tokens)
        ? "Contenido"
        : "Categoría";

    results.push({
      id: `${item.type}:${index}`,
      type: item.type,
      title,
      preview: comment ? createSnippet(comment) : item.type === "note" ? "Abrir nota" : "Abrir tarea",
      breadcrumb,
      categoryId,
      matchLabel,
      score: calculateScore(tokens, [explicitTitle, comment], [breadcrumb]),
    });
  }

  for (const quickText of getQuickTexts(appData)) {
    const title = getQuickTextDisplayTitle(quickText);
    const preview = getQuickTextPreview(quickText, 160) || "Texto vacío";
    const combined = normalizeSearchValue([quickText.title, quickText.content, title].join(" "));

    if (!includesAllTokens(combined, tokens)) {
      continue;
    }

    const normalizedTitle = normalizeSearchValue(quickText.title);
    const normalizedContent = normalizeSearchValue(quickText.content);
    const matchLabel = quickText.title.trim().length > 0 && includesAllTokens(normalizedTitle, tokens)
      ? "Título"
      : includesAllTokens(normalizedContent, tokens)
        ? "Contenido"
        : "Texto";

    results.push({
      id: `quick-text:${quickText.id}`,
      type: "quick-text",
      title,
      preview,
      breadcrumb: "Textos rápidos",
      categoryId: null,
      matchLabel,
      score: calculateScore(tokens, [quickText.title, quickText.content], [title]),
    });
  }

  const typeOrder: Record<SearchResultType, number> = {
    category: 0,
    note: 1,
    task: 2,
    link: 3,
    "quick-text": 4,
  };

  return results.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (typeOrder[left.type] !== typeOrder[right.type]) {
      return typeOrder[left.type] - typeOrder[right.type];
    }

    return left.title.localeCompare(right.title, "es", { sensitivity: "base" });
  });
}