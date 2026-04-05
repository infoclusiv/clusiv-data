import { invoke } from "@tauri-apps/api/core";

import type {
  AppData,
  AppView,
  BoardMode,
  CategoryFormInput,
  Item,
  ItemFormInput,
  Link,
} from "$lib/store/types";
import {
  buildCategoryRecord,
  categoryHasChildren,
  generateCategoryId,
  getCategory,
  getFlatCategoryEntries,
  getItemCategoryId,
  normalizeAppData,
} from "$lib/utils/categoryUtils";
import {
  GENERAL_CATEGORY_ID,
  GENERAL_CATEGORY_NAME,
} from "$lib/utils/constants";

export const appState = $state({
  appData: null as AppData | null,
  currentCategoryId: null as string | null,
  currentView: "welcome" as AppView,
  currentBoardMode: "gallery" as BoardMode,
  currentBoardFilterId: null as string | null,
  editingCategoryId: null as string | null,
  editingItemIndex: null as number | null,
});

function requireAppData(): AppData {
  if (!appState.appData) {
    throw new Error("La aplicación todavía no cargó los datos.");
  }
  return appState.appData;
}

function setAppData(appData: AppData): AppData {
  const normalized = normalizeAppData(appData);
  appState.appData = normalized;
  return normalized;
}

export async function loadAppData(): Promise<AppData> {
  const data = await invoke<AppData>("load_data");
  return setAppData(data);
}

export async function persistData(): Promise<void> {
  if (!appState.appData) {
    return;
  }

  const normalized = normalizeAppData(appState.appData);
  appState.appData = normalized;
  await invoke("save_data", { data: normalized });
}

export async function createBackup(manual: boolean): Promise<string> {
  return invoke<string>("create_backup", { manual });
}

export async function openUrl(url: string): Promise<void> {
  await invoke("open_url", { url });
}

export function selectCategory(categoryId: string): void {
  appState.currentCategoryId = categoryId;
  appState.currentView = "category";
  appState.currentBoardFilterId = null;
}

export function showBoard(mode: BoardMode, filterId: string | null = null): void {
  appState.currentView = "board";
  appState.currentBoardMode = mode;
  appState.currentBoardFilterId = filterId;
}

export function showWelcome(): void {
  appState.currentView = "welcome";
  appState.currentCategoryId = null;
  appState.currentBoardFilterId = null;
}

export async function initializeApp(): Promise<void> {
  const data = await loadAppData();

  try {
    await createBackup(false);
  } catch {
    // Ignore automatic backup failures to preserve first-run UX.
  }

  if (getCategory(data, GENERAL_CATEGORY_ID)) {
    selectCategory(GENERAL_CATEGORY_ID);
    return;
  }

  const firstCategoryId = getFlatCategoryEntries(data)[0]?.[0].id ?? null;
  if (firstCategoryId) {
    selectCategory(firstCategoryId);
  } else {
    showWelcome();
  }
}

export async function mutateAppData(
  mutator: (draft: AppData) => void,
): Promise<AppData> {
  const draft = normalizeAppData(structuredClone(requireAppData()));
  mutator(draft);
  const normalized = setAppData(draft);
  await persistData();
  return normalized;
}

export async function saveCategory(
  input: CategoryFormInput,
  editingCategoryId: string | null = null,
): Promise<string> {
  let resolvedCategoryId = editingCategoryId;

  await mutateAppData((draft) => {
    const categories = draft.__SYSTEM_CATEGORIES__;

    if (editingCategoryId) {
      const category = categories[editingCategoryId];
      if (!category) {
        throw new Error("La categoría a editar ya no existe.");
      }

      category.icon = input.icon;
      if (editingCategoryId !== GENERAL_CATEGORY_ID) {
        category.name = input.name;
        category.parent_id = input.parentId;
      } else {
        category.name = GENERAL_CATEGORY_NAME;
        category.parent_id = null;
      }
    } else {
      resolvedCategoryId = generateCategoryId(draft);
      categories[resolvedCategoryId] = buildCategoryRecord(
        resolvedCategoryId,
        input.name,
        input.parentId,
        input.icon,
        input.type,
      );
    }
  });

  if (!resolvedCategoryId) {
    throw new Error("No se pudo resolver la categoría guardada.");
  }

  appState.currentCategoryId = resolvedCategoryId;
  appState.currentView = "category";
  return resolvedCategoryId;
}

export async function deleteCategory(categoryId: string): Promise<string> {
  const currentData = requireAppData();
  const currentCategory = getCategory(currentData, categoryId);
  if (!currentCategory) {
    throw new Error("La categoría ya no existe.");
  }

  if (categoryId === GENERAL_CATEGORY_ID) {
    throw new Error("La categoría General no se puede eliminar.");
  }

  if (categoryHasChildren(currentData, categoryId)) {
    throw new Error("No puedes borrar una categoría que tiene subcategorías.");
  }

  const fallbackCategoryId = currentCategory.parent_id || GENERAL_CATEGORY_ID;

  await mutateAppData((draft) => {
    for (const item of draft.__SYSTEM_TASKS__) {
      if (getItemCategoryId(item) === categoryId) {
        item.category_id = GENERAL_CATEGORY_ID;
      }
    }

    delete draft.__SYSTEM_CATEGORIES__[categoryId];
  });

  if (appState.currentBoardFilterId === categoryId) {
    appState.currentBoardMode = "gallery";
    appState.currentBoardFilterId = null;
  }

  appState.currentCategoryId = getCategory(requireAppData(), fallbackCategoryId)
    ? fallbackCategoryId
    : GENERAL_CATEGORY_ID;

  return appState.currentCategoryId;
}

export async function addLink(categoryId: string, link: Link): Promise<void> {
  await mutateAppData((draft) => {
    const category = draft.__SYSTEM_CATEGORIES__[categoryId];
    if (!category) {
      throw new Error("La categoría no existe.");
    }
    category.links.push(link);
  });
}

export async function importLinks(categoryId: string, links: Link[]): Promise<void> {
  if (links.length === 0) {
    return;
  }

  await mutateAppData((draft) => {
    const category = draft.__SYSTEM_CATEGORIES__[categoryId];
    if (!category) {
      throw new Error("La categoría no existe.");
    }
    category.links.push(...links);
  });
}

export async function deleteLink(categoryId: string, linkIndex: number): Promise<void> {
  await mutateAppData((draft) => {
    const category = draft.__SYSTEM_CATEGORIES__[categoryId];
    if (!category) {
      throw new Error("La categoría no existe.");
    }

    category.links.splice(linkIndex, 1);
  });
}

export function getItemIndex(item: Item): number {
  return requireAppData().__SYSTEM_TASKS__.indexOf(item);
}

export async function saveItem(
  input: ItemFormInput,
  editingIndex: number | null = null,
): Promise<number> {
  let resolvedIndex = editingIndex ?? -1;

  await mutateAppData((draft) => {
    if (editingIndex !== null && editingIndex >= 0 && draft.__SYSTEM_TASKS__[editingIndex]) {
      const current = draft.__SYSTEM_TASKS__[editingIndex];
      draft.__SYSTEM_TASKS__[editingIndex] = {
        ...current,
        title: input.title,
        comment: input.comment,
        type: input.type,
        category_id: input.categoryId,
      };
      return;
    }

    draft.__SYSTEM_TASKS__.push({
      title: input.title,
      comment: input.comment,
      type: input.type,
      done: false,
      category_id: input.categoryId,
    });
    resolvedIndex = draft.__SYSTEM_TASKS__.length - 1;
  });

  return resolvedIndex;
}

export async function deleteItem(itemIndex: number): Promise<void> {
  await mutateAppData((draft) => {
    if (itemIndex < 0 || itemIndex >= draft.__SYSTEM_TASKS__.length) {
      throw new Error("El elemento ya no existe.");
    }
    draft.__SYSTEM_TASKS__.splice(itemIndex, 1);
  });
}

export async function toggleTaskStatus(itemIndex: number, done: boolean): Promise<void> {
  await mutateAppData((draft) => {
    const item = draft.__SYSTEM_TASKS__[itemIndex];
    if (!item) {
      throw new Error("La tarea ya no existe.");
    }
    item.done = done;
  });
}