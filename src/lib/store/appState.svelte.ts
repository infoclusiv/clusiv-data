import { invoke } from "@tauri-apps/api/core";

import type {
  AppData,
  AppView,
  BoardMode,
  CategoryFormInput,
  Item,
  ItemFormInput,
  Link,
  LogLevel,
  LogStatus,
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

interface FrontendLogEvent {
  level?: LogLevel;
  source: string;
  action: string;
  message: string;
  context?: Record<string, unknown> | null;
}

function countLinks(appData: AppData): number {
  return Object.values(appData.__SYSTEM_CATEGORIES__).reduce(
    (total, category) => total + category.links.length,
    0,
  );
}

function getAppDataSummary(appData: AppData | null): Record<string, unknown> {
  if (!appData) {
    return { hasData: false };
  }

  return {
    hasData: true,
    categoryCount: Object.keys(appData.__SYSTEM_CATEGORIES__).length,
    taskCount: appData.__SYSTEM_TASKS__.length,
    linkCount: countLinks(appData),
  };
}

function getUrlHost(url: string): string | null {
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}

export function getLogErrorContext(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    value: String(error),
  };
}

export function logClientEvent({
  level = "info",
  source,
  action,
  message,
  context = null,
}: FrontendLogEvent): void {
  void invoke("append_frontend_log", {
    entry: {
      level,
      source,
      action,
      message,
      context,
    },
  }).catch(() => undefined);
}

function logClientError(
  source: string,
  action: string,
  message: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  logClientEvent({
    level: "error",
    source,
    action,
    message,
    context: {
      ...context,
      error: getLogErrorContext(error),
    },
  });
}

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
  logClientEvent({
    source: "appState",
    action: "load_app_data_started",
    message: "Requesting application data from the backend.",
  });

  try {
    const data = await invoke<AppData>("load_data");
    const normalized = setAppData(data);

    logClientEvent({
      source: "appState",
      action: "load_app_data_completed",
      message: "Application data loaded into frontend state.",
      context: getAppDataSummary(normalized),
    });

    return normalized;
  } catch (error) {
    logClientError(
      "appState",
      "load_app_data_failed",
      "Failed to load application data from the backend.",
      error,
    );
    throw error;
  }
}

export async function persistData(): Promise<void> {
  if (!appState.appData) {
    return;
  }

  const normalized = normalizeAppData(appState.appData);
  appState.appData = normalized;

  logClientEvent({
    source: "appState",
    action: "persist_data_started",
    message: "Persisting current frontend data snapshot.",
    context: {
      ...getAppDataSummary(normalized),
      currentView: appState.currentView,
      currentCategoryId: appState.currentCategoryId,
    },
  });

  try {
    await invoke("save_data", { data: normalized });
    logClientEvent({
      source: "appState",
      action: "persist_data_completed",
      message: "Frontend data snapshot persisted successfully.",
      context: {
        ...getAppDataSummary(normalized),
        currentView: appState.currentView,
        currentCategoryId: appState.currentCategoryId,
      },
    });
  } catch (error) {
    logClientError(
      "appState",
      "persist_data_failed",
      "Failed to persist frontend data snapshot.",
      error,
      {
        ...getAppDataSummary(normalized),
        currentView: appState.currentView,
        currentCategoryId: appState.currentCategoryId,
      },
    );
    throw error;
  }
}

export async function createBackup(manual: boolean): Promise<string> {
  logClientEvent({
    source: "appState",
    action: manual ? "create_backup_manual_started" : "create_backup_auto_started",
    message: "Requesting backup creation.",
    context: {
      manual,
      currentView: appState.currentView,
      currentCategoryId: appState.currentCategoryId,
    },
  });

  try {
    const message = await invoke<string>("create_backup", { manual });
    logClientEvent({
      source: "appState",
      action: manual ? "create_backup_manual_completed" : "create_backup_auto_completed",
      message: "Backup request completed.",
      context: {
        manual,
        backendMessage: message,
      },
    });
    return message;
  } catch (error) {
    logClientError(
      "appState",
      manual ? "create_backup_manual_failed" : "create_backup_auto_failed",
      "Backup request failed.",
      error,
      { manual },
    );
    throw error;
  }
}

export async function openUrl(url: string): Promise<void> {
  const host = getUrlHost(url);

  logClientEvent({
    source: "appState",
    action: "open_url_started",
    message: "Requesting URL open through the backend.",
    context: {
      url,
      host,
    },
  });

  try {
    await invoke("open_url", { url });
    logClientEvent({
      source: "appState",
      action: "open_url_completed",
      message: "URL open request completed.",
      context: {
        url,
        host,
      },
    });
  } catch (error) {
    logClientError(
      "appState",
      "open_url_failed",
      "Failed to open URL through the backend.",
      error,
      {
        url,
        host,
      },
    );
    throw error;
  }
}

export async function getLogStatus(): Promise<LogStatus> {
  try {
    return await invoke<LogStatus>("get_log_status");
  } catch (error) {
    logClientError(
      "appState",
      "get_log_status_failed",
      "Failed to retrieve current log session status.",
      error,
    );
    throw error;
  }
}

export async function exportLogs(): Promise<string> {
  logClientEvent({
    source: "appState",
    action: "export_logs_started",
    message: "User requested log export to JSON.",
  });

  try {
    const exportPath = await invoke<string>("export_logs");
    logClientEvent({
      source: "appState",
      action: "export_logs_completed",
      message: "Application logs exported to JSON.",
      context: {
        exportPath,
      },
    });
    return exportPath;
  } catch (error) {
    logClientError(
      "appState",
      "export_logs_failed",
      "Failed to export application logs.",
      error,
    );
    throw error;
  }
}

export function selectCategory(categoryId: string): void {
  const category = appState.appData
    ? getCategory(appState.appData, categoryId)
    : null;

  appState.currentCategoryId = categoryId;
  appState.currentView = "category";
  appState.currentBoardFilterId = null;

  logClientEvent({
    source: "navigation",
    action: "select_category",
    message: "Navigated to a category view.",
    context: {
      categoryId,
      categoryName: category?.name ?? null,
      categoryType: category?.type ?? null,
    },
  });
}

export function showBoard(mode: BoardMode, filterId: string | null = null): void {
  const category = filterId && appState.appData
    ? getCategory(appState.appData, filterId)
    : null;

  appState.currentView = "board";
  appState.currentBoardMode = mode;
  appState.currentBoardFilterId = filterId;

  logClientEvent({
    source: "navigation",
    action: "show_board",
    message: "Navigated to board view.",
    context: {
      mode,
      filterId,
      categoryName: category?.name ?? null,
    },
  });
}

export function showWelcome(): void {
  appState.currentView = "welcome";
  appState.currentCategoryId = null;
  appState.currentBoardFilterId = null;

  logClientEvent({
    source: "navigation",
    action: "show_welcome",
    message: "Navigated to welcome view.",
  });
}

export function showLogs(): void {
  appState.currentView = "logs";
  appState.currentBoardFilterId = null;

  logClientEvent({
    source: "navigation",
    action: "show_logs",
    message: "Navigated to debugging logs view.",
  });
}

export async function initializeApp(): Promise<void> {
  logClientEvent({
    source: "appState",
    action: "initialize_app_started",
    message: "Initializing application state.",
  });

  const data = await loadAppData();

  try {
    await createBackup(false);
  } catch (error) {
    logClientEvent({
      level: "warn",
      source: "appState",
      action: "initialize_app_auto_backup_ignored",
      message: "Automatic backup failed during startup and was ignored to preserve first-run UX.",
      context: {
        error: getLogErrorContext(error),
      },
    });
    // Ignore automatic backup failures to preserve first-run UX.
  }

  if (getCategory(data, GENERAL_CATEGORY_ID)) {
    selectCategory(GENERAL_CATEGORY_ID);
    logClientEvent({
      source: "appState",
      action: "initialize_app_completed",
      message: "Application initialized with the General category selected.",
      context: {
        defaultCategoryId: GENERAL_CATEGORY_ID,
        ...getAppDataSummary(data),
      },
    });
    return;
  }

  const firstCategoryId = getFlatCategoryEntries(data)[0]?.[0].id ?? null;
  if (firstCategoryId) {
    selectCategory(firstCategoryId);
    logClientEvent({
      source: "appState",
      action: "initialize_app_completed",
      message: "Application initialized with the first available category selected.",
      context: {
        defaultCategoryId: firstCategoryId,
        ...getAppDataSummary(data),
      },
    });
  } else {
    showWelcome();
    logClientEvent({
      source: "appState",
      action: "initialize_app_completed",
      message: "Application initialized without categories and fell back to welcome view.",
      context: getAppDataSummary(data),
    });
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

  logClientEvent({
    source: "category",
    action: editingCategoryId ? "update_category_started" : "create_category_started",
    message: editingCategoryId
      ? "Updating category metadata."
      : "Creating a new category.",
    context: {
      editingCategoryId,
      name: input.name,
      parentId: input.parentId,
      icon: input.icon,
      type: input.type,
    },
  });

  try {
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

    logClientEvent({
      source: "category",
      action: editingCategoryId ? "update_category_completed" : "create_category_completed",
      message: editingCategoryId
        ? "Category updated successfully."
        : "Category created successfully.",
      context: {
        categoryId: resolvedCategoryId,
        name: editingCategoryId === GENERAL_CATEGORY_ID ? GENERAL_CATEGORY_NAME : input.name,
        parentId: editingCategoryId === GENERAL_CATEGORY_ID ? null : input.parentId,
        icon: input.icon,
        type: input.type,
      },
    });

    return resolvedCategoryId;
  } catch (error) {
    logClientError(
      "category",
      editingCategoryId ? "update_category_failed" : "create_category_failed",
      editingCategoryId
        ? "Failed to update category."
        : "Failed to create category.",
      error,
      {
        editingCategoryId,
        name: input.name,
        parentId: input.parentId,
        icon: input.icon,
        type: input.type,
      },
    );
    throw error;
  }
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
  const reassignedTaskCount = currentData.__SYSTEM_TASKS__.filter(
    (item) => getItemCategoryId(item) === categoryId,
  ).length;

  logClientEvent({
    source: "category",
    action: "delete_category_started",
    message: "Deleting category.",
    context: {
      categoryId,
      categoryName: currentCategory.name,
      fallbackCategoryId,
      reassignedTaskCount,
    },
  });

  try {
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

    logClientEvent({
      source: "category",
      action: "delete_category_completed",
      message: "Category deleted successfully.",
      context: {
        categoryId,
        fallbackCategoryId: appState.currentCategoryId,
        reassignedTaskCount,
      },
    });

    return appState.currentCategoryId;
  } catch (error) {
    logClientError(
      "category",
      "delete_category_failed",
      "Failed to delete category.",
      error,
      {
        categoryId,
        fallbackCategoryId,
        reassignedTaskCount,
      },
    );
    throw error;
  }
}

export async function addLink(categoryId: string, link: Link): Promise<void> {
  logClientEvent({
    source: "links",
    action: "add_link_started",
    message: "Adding a link to category.",
    context: {
      categoryId,
      title: link.title,
      url: link.url,
      host: getUrlHost(link.url),
    },
  });

  try {
    await mutateAppData((draft) => {
      const category = draft.__SYSTEM_CATEGORIES__[categoryId];
      if (!category) {
        throw new Error("La categoría no existe.");
      }
      category.links.push(link);
    });

    logClientEvent({
      source: "links",
      action: "add_link_completed",
      message: "Link added successfully.",
      context: {
        categoryId,
        title: link.title,
        url: link.url,
        host: getUrlHost(link.url),
      },
    });
  } catch (error) {
    logClientError(
      "links",
      "add_link_failed",
      "Failed to add link to category.",
      error,
      {
        categoryId,
        title: link.title,
        url: link.url,
      },
    );
    throw error;
  }
}

export async function importLinks(categoryId: string, links: Link[]): Promise<void> {
  if (links.length === 0) {
    return;
  }

  logClientEvent({
    source: "links",
    action: "import_links_started",
    message: "Importing links in bulk.",
    context: {
      categoryId,
      linkCount: links.length,
    },
  });

  try {
    await mutateAppData((draft) => {
      const category = draft.__SYSTEM_CATEGORIES__[categoryId];
      if (!category) {
        throw new Error("La categoría no existe.");
      }
      category.links.push(...links);
    });

    logClientEvent({
      source: "links",
      action: "import_links_completed",
      message: "Bulk link import completed.",
      context: {
        categoryId,
        linkCount: links.length,
      },
    });
  } catch (error) {
    logClientError(
      "links",
      "import_links_failed",
      "Failed to import links in bulk.",
      error,
      {
        categoryId,
        linkCount: links.length,
      },
    );
    throw error;
  }
}

export async function deleteLink(categoryId: string, linkIndex: number): Promise<void> {
  const currentData = requireAppData();
  const link = currentData.__SYSTEM_CATEGORIES__[categoryId]?.links[linkIndex];

  logClientEvent({
    source: "links",
    action: "delete_link_started",
    message: "Deleting link from category.",
    context: {
      categoryId,
      linkIndex,
      title: link?.title ?? null,
      url: link?.url ?? null,
    },
  });

  try {
    await mutateAppData((draft) => {
      const category = draft.__SYSTEM_CATEGORIES__[categoryId];
      if (!category) {
        throw new Error("La categoría no existe.");
      }

      category.links.splice(linkIndex, 1);
    });

    logClientEvent({
      source: "links",
      action: "delete_link_completed",
      message: "Link deleted successfully.",
      context: {
        categoryId,
        linkIndex,
        title: link?.title ?? null,
        url: link?.url ?? null,
      },
    });
  } catch (error) {
    logClientError(
      "links",
      "delete_link_failed",
      "Failed to delete link from category.",
      error,
      {
        categoryId,
        linkIndex,
        title: link?.title ?? null,
        url: link?.url ?? null,
      },
    );
    throw error;
  }
}

export function getItemIndex(item: Item): number {
  return requireAppData().__SYSTEM_TASKS__.indexOf(item);
}

export async function saveItem(
  input: ItemFormInput,
  editingIndex: number | null = null,
): Promise<number> {
  let resolvedIndex = editingIndex ?? -1;

  logClientEvent({
    source: "items",
    action: editingIndex !== null ? "update_item_started" : "create_item_started",
    message: editingIndex !== null
      ? "Updating note or task."
      : "Creating note or task.",
    context: {
      editingIndex,
      title: input.title,
      type: input.type,
      categoryId: input.categoryId,
      hasComment: input.comment.trim().length > 0,
    },
  });

  try {
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

    logClientEvent({
      source: "items",
      action: editingIndex !== null ? "update_item_completed" : "create_item_completed",
      message: editingIndex !== null
        ? "Note or task updated successfully."
        : "Note or task created successfully.",
      context: {
        itemIndex: resolvedIndex,
        title: input.title,
        type: input.type,
        categoryId: input.categoryId,
      },
    });

    return resolvedIndex;
  } catch (error) {
    logClientError(
      "items",
      editingIndex !== null ? "update_item_failed" : "create_item_failed",
      editingIndex !== null
        ? "Failed to update note or task."
        : "Failed to create note or task.",
      error,
      {
        editingIndex,
        title: input.title,
        type: input.type,
        categoryId: input.categoryId,
      },
    );
    throw error;
  }
}

export async function deleteItem(itemIndex: number): Promise<void> {
  const item = requireAppData().__SYSTEM_TASKS__[itemIndex];

  logClientEvent({
    source: "items",
    action: "delete_item_started",
    message: "Deleting note or task.",
    context: {
      itemIndex,
      title: item?.title ?? null,
      type: item?.type ?? null,
      categoryId: item?.category_id ?? null,
    },
  });

  try {
    await mutateAppData((draft) => {
      if (itemIndex < 0 || itemIndex >= draft.__SYSTEM_TASKS__.length) {
        throw new Error("El elemento ya no existe.");
      }
      draft.__SYSTEM_TASKS__.splice(itemIndex, 1);
    });

    logClientEvent({
      source: "items",
      action: "delete_item_completed",
      message: "Note or task deleted successfully.",
      context: {
        itemIndex,
        title: item?.title ?? null,
        type: item?.type ?? null,
        categoryId: item?.category_id ?? null,
      },
    });
  } catch (error) {
    logClientError(
      "items",
      "delete_item_failed",
      "Failed to delete note or task.",
      error,
      {
        itemIndex,
        title: item?.title ?? null,
        type: item?.type ?? null,
        categoryId: item?.category_id ?? null,
      },
    );
    throw error;
  }
}

export async function toggleTaskStatus(itemIndex: number, done: boolean): Promise<void> {
  const item = requireAppData().__SYSTEM_TASKS__[itemIndex];

  logClientEvent({
    source: "items",
    action: "toggle_task_status_started",
    message: "Updating task completion state.",
    context: {
      itemIndex,
      title: item?.title ?? null,
      categoryId: item?.category_id ?? null,
      done,
    },
  });

  try {
    await mutateAppData((draft) => {
      const currentItem = draft.__SYSTEM_TASKS__[itemIndex];
      if (!currentItem) {
        throw new Error("La tarea ya no existe.");
      }
      currentItem.done = done;
    });

    logClientEvent({
      source: "items",
      action: "toggle_task_status_completed",
      message: "Task completion state updated successfully.",
      context: {
        itemIndex,
        title: item?.title ?? null,
        categoryId: item?.category_id ?? null,
        done,
      },
    });
  } catch (error) {
    logClientError(
      "items",
      "toggle_task_status_failed",
      "Failed to update task completion state.",
      error,
      {
        itemIndex,
        title: item?.title ?? null,
        categoryId: item?.category_id ?? null,
        done,
      },
    );
    throw error;
  }
}