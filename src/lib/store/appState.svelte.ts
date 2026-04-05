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
  NavigationSnapshot,
} from "$lib/store/types";
import {
  buildCategoryRecord,
  categoryHasChildren,
  generateCategoryId,
  getCategory,
  getCategoryPathIds,
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
  navigationHistory: [] as NavigationSnapshot[],
  expandedCategoryIds: [] as string[],
  sidebarWidth: 240,
  editingCategoryId: null as string | null,
  editingItemIndex: null as number | null,
});

const EXPANDED_CATEGORY_IDS_STORAGE_KEY = "clusiv-data:expanded-category-ids";
const SIDEBAR_WIDTH_STORAGE_KEY = "clusiv-data:sidebar-width";

export const DEFAULT_SIDEBAR_WIDTH = 240;
export const MIN_SIDEBAR_WIDTH = 208;
export const MAX_SIDEBAR_WIDTH = 420;

interface FrontendLogEvent {
  level?: LogLevel;
  source: string;
  action: string;
  message: string;
  context?: Record<string, unknown> | null;
}

interface NavigationOptions {
  recordHistory?: boolean;
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

function getAppDataSnapshot(): AppData {
  return $state.snapshot(requireAppData());
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function sanitizeSidebarWidth(width: unknown): number {
  const numericWidth = typeof width === "number" ? width : Number(width);
  if (!Number.isFinite(numericWidth)) {
    return DEFAULT_SIDEBAR_WIDTH;
  }

  return Math.min(
    MAX_SIDEBAR_WIDTH,
    Math.max(MIN_SIDEBAR_WIDTH, Math.round(numericWidth)),
  );
}

function getCurrentNavigation(): NavigationSnapshot {
  return {
    view: appState.currentView,
    categoryId: appState.currentCategoryId,
    boardMode: appState.currentBoardMode,
    boardFilterId: appState.currentBoardFilterId,
  };
}

function navigationMatches(
  left: NavigationSnapshot,
  right: NavigationSnapshot,
): boolean {
  return left.view === right.view
    && left.categoryId === right.categoryId
    && left.boardMode === right.boardMode
    && left.boardFilterId === right.boardFilterId;
}

function sanitizeNavigationHistory(appData: AppData): void {
  const validCategoryIds = new Set(Object.keys(appData.__SYSTEM_CATEGORIES__));
  const nextHistory: NavigationSnapshot[] = [];

  for (const snapshot of appState.navigationHistory) {
    if (
      snapshot.view === "category"
      && (!snapshot.categoryId || !validCategoryIds.has(snapshot.categoryId))
    ) {
      continue;
    }

    const nextSnapshot: NavigationSnapshot = {
      ...snapshot,
      categoryId: snapshot.categoryId && validCategoryIds.has(snapshot.categoryId)
        ? snapshot.categoryId
        : null,
      boardFilterId: snapshot.boardFilterId && validCategoryIds.has(snapshot.boardFilterId)
        ? snapshot.boardFilterId
        : null,
    };

    if (snapshot.boardFilterId && !nextSnapshot.boardFilterId) {
      nextSnapshot.boardMode = "gallery";
    }

    nextHistory.push(nextSnapshot);
  }

  appState.navigationHistory = nextHistory;
}

function getSanitizedExpandedCategoryIds(
  appData: AppData,
  expandedCategoryIds: string[],
): string[] {
  const validExpandedIds = new Set(
    Object.keys(appData.__SYSTEM_CATEGORIES__).filter((categoryId) =>
      categoryHasChildren(appData, categoryId)
    ),
  );

  return [...new Set(expandedCategoryIds)].filter((categoryId) =>
    validExpandedIds.has(categoryId)
  );
}

function persistExpandedCategoryIds(): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(
      EXPANDED_CATEGORY_IDS_STORAGE_KEY,
      JSON.stringify(appState.expandedCategoryIds),
    );
  } catch {
    // Ignore local preference persistence failures.
  }
}

function setExpandedCategoryIds(expandedCategoryIds: string[]): void {
  appState.expandedCategoryIds = expandedCategoryIds;
  persistExpandedCategoryIds();
}

function persistSidebarWidth(): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(
      SIDEBAR_WIDTH_STORAGE_KEY,
      String(appState.sidebarWidth),
    );
  } catch {
    // Ignore local preference persistence failures.
  }
}

export function setSidebarWidth(width: number): void {
  appState.sidebarWidth = sanitizeSidebarWidth(width);
  persistSidebarWidth();
}

function restoreSidebarWidth(): void {
  if (!canUseLocalStorage()) {
    appState.sidebarWidth = DEFAULT_SIDEBAR_WIDTH;
    return;
  }

  try {
    const storedValue = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    appState.sidebarWidth = sanitizeSidebarWidth(storedValue);
  } catch {
    appState.sidebarWidth = DEFAULT_SIDEBAR_WIDTH;
  }
}

function sanitizeExpandedCategoryIds(appData: AppData): void {
  setExpandedCategoryIds(
    getSanitizedExpandedCategoryIds(appData, appState.expandedCategoryIds),
  );
}

function restoreExpandedCategoryIds(appData: AppData): void {
  if (!canUseLocalStorage()) {
    sanitizeExpandedCategoryIds(appData);
    return;
  }

  try {
    const storedValue = window.localStorage.getItem(EXPANDED_CATEGORY_IDS_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    const expandedCategoryIds = Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === "string")
      : [];

    setExpandedCategoryIds(
      getSanitizedExpandedCategoryIds(appData, expandedCategoryIds),
    );
  } catch {
    sanitizeExpandedCategoryIds(appData);
  }
}

function expandCategoryPath(categoryId: string | null): void {
  if (!appState.appData || !categoryId) {
    return;
  }

  const pathIds = getCategoryPathIds(appState.appData, categoryId)
    .slice(0, -1)
    .filter((pathCategoryId) => categoryHasChildren(appState.appData as AppData, pathCategoryId));

  if (pathIds.length === 0) {
    return;
  }

  setExpandedCategoryIds(
    getSanitizedExpandedCategoryIds(appState.appData, [
      ...appState.expandedCategoryIds,
      ...pathIds,
    ]),
  );
}

function applyNavigation(snapshot: NavigationSnapshot): void {
  appState.currentView = snapshot.view;
  appState.currentCategoryId = snapshot.categoryId;
  appState.currentBoardMode = snapshot.boardMode;
  appState.currentBoardFilterId = snapshot.boardFilterId;
}

function navigate(
  snapshot: NavigationSnapshot,
  { recordHistory = true }: NavigationOptions = {},
): void {
  const currentNavigation = getCurrentNavigation();

  if (recordHistory && !navigationMatches(currentNavigation, snapshot)) {
    appState.navigationHistory = [
      ...appState.navigationHistory,
      currentNavigation,
    ];
  }

  applyNavigation(snapshot);

  if (snapshot.view === "category") {
    expandCategoryPath(snapshot.categoryId);
  }
}

function setAppData(appData: AppData): AppData {
  const normalized = normalizeAppData(appData);
  appState.appData = normalized;
  sanitizeNavigationHistory(normalized);
  sanitizeExpandedCategoryIds(normalized);
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

  const normalized = normalizeAppData(getAppDataSnapshot());
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

export async function openLogDirectory(): Promise<void> {
  logClientEvent({
    source: "appState",
    action: "open_log_directory_started",
    message: "User requested to open the local logs directory.",
  });

  try {
    await invoke("open_log_directory");
    logClientEvent({
      source: "appState",
      action: "open_log_directory_completed",
      message: "Local logs directory opened successfully.",
    });
  } catch (error) {
    logClientError(
      "appState",
      "open_log_directory_failed",
      "Failed to open the local logs directory.",
      error,
    );
    throw error;
  }
}

export async function openBackupDirectory(): Promise<void> {
  logClientEvent({
    source: "appState",
    action: "open_backup_directory_started",
    message: "User requested to open the local backups directory.",
  });

  try {
    await invoke("open_backup_directory");
    logClientEvent({
      source: "appState",
      action: "open_backup_directory_completed",
      message: "Local backups directory opened successfully.",
    });
  } catch (error) {
    logClientError(
      "appState",
      "open_backup_directory_failed",
      "Failed to open the local backups directory.",
      error,
    );
    throw error;
  }
}

export function isCategoryExpanded(categoryId: string): boolean {
  return appState.expandedCategoryIds.includes(categoryId);
}

export function toggleCategoryExpansion(categoryId: string): void {
  if (!appState.appData || !categoryHasChildren(appState.appData, categoryId)) {
    return;
  }

  if (isCategoryExpanded(categoryId)) {
    setExpandedCategoryIds(
      appState.expandedCategoryIds.filter((expandedCategoryId) => expandedCategoryId !== categoryId),
    );
    return;
  }

  setExpandedCategoryIds(
    getSanitizedExpandedCategoryIds(appState.appData, [
      ...appState.expandedCategoryIds,
      categoryId,
    ]),
  );
}

export function goBack(): void {
  const previousNavigation = appState.navigationHistory.at(-1);

  if (!previousNavigation) {
    return;
  }

  appState.navigationHistory = appState.navigationHistory.slice(0, -1);
  applyNavigation(previousNavigation);

  if (previousNavigation.view === "category") {
    expandCategoryPath(previousNavigation.categoryId);
  }

  logClientEvent({
    source: "navigation",
    action: "go_back",
    message: "Navigated back to the previous view.",
    context: {
      view: previousNavigation.view,
      categoryId: previousNavigation.categoryId,
      boardMode: previousNavigation.boardMode,
      boardFilterId: previousNavigation.boardFilterId,
    },
  });
}

export function selectCategory(
  categoryId: string,
  options: NavigationOptions = {},
): void {
  const category = appState.appData
    ? getCategory(appState.appData, categoryId)
    : null;

  if (appState.appData && !category) {
    return;
  }

  navigate(
    {
      view: "category",
      categoryId,
      boardMode: appState.currentBoardMode,
      boardFilterId: null,
    },
    options,
  );

  logClientEvent({
    source: "navigation",
    action: "select_category",
    message: "Navigated to a category view.",
    context: {
      categoryId,
      categoryName: category?.name ?? null,
    },
  });
}

export function showBoard(
  mode: BoardMode,
  filterId: string | null = null,
  options: NavigationOptions = {},
): void {
  const category = filterId && appState.appData
    ? getCategory(appState.appData, filterId)
    : null;

  navigate(
    {
      view: "board",
      categoryId: mode === "detail" ? filterId : null,
      boardMode: mode,
      boardFilterId: filterId,
    },
    options,
  );

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

export function showWelcome(options: NavigationOptions = {}): void {
  navigate(
    {
      view: "welcome",
      categoryId: null,
      boardMode: "gallery",
      boardFilterId: null,
    },
    options,
  );

  logClientEvent({
    source: "navigation",
    action: "show_welcome",
    message: "Navigated to welcome view.",
  });
}

export function showLogs(options: NavigationOptions = {}): void {
  navigate(
    {
      view: "logs",
      categoryId: appState.currentCategoryId,
      boardMode: appState.currentBoardMode,
      boardFilterId: null,
    },
    options,
  );

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
  appState.navigationHistory = [];
  restoreExpandedCategoryIds(data);
  restoreSidebarWidth();

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
    selectCategory(GENERAL_CATEGORY_ID, { recordHistory: false });
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
    selectCategory(firstCategoryId, { recordHistory: false });
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
    showWelcome({ recordHistory: false });
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
  const draft = normalizeAppData(getAppDataSnapshot());
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
        );
      }
    });

    if (!resolvedCategoryId) {
      throw new Error("No se pudo resolver la categoría guardada.");
    }

    selectCategory(resolvedCategoryId);

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

  const categoryItemCount = currentData.__SYSTEM_TASKS__.filter(
    (item) => getItemCategoryId(item) === categoryId,
  ).length;

  const fallbackCategoryId = currentCategory.parent_id || GENERAL_CATEGORY_ID;
  const reassignedItemCount = categoryItemCount;
  const removedLinkCount = currentCategory.links.length;

  logClientEvent({
    source: "category",
    action: "delete_category_started",
    message: "Deleting category.",
    context: {
      categoryId,
      categoryName: currentCategory.name,
      fallbackCategoryId,
      reassignedItemCount,
      removedLinkCount,
    },
  });

  try {
    await mutateAppData((draft) => {
      for (const item of draft.__SYSTEM_TASKS__) {
        if (getItemCategoryId(item) === categoryId) {
          item.category_id = fallbackCategoryId;
        }
      }

      delete draft.__SYSTEM_CATEGORIES__[categoryId];
    });

    if (appState.currentBoardFilterId === categoryId) {
      showBoard("gallery", null, { recordHistory: false });
    }

    const nextCategoryId = getCategory(requireAppData(), fallbackCategoryId)
      ? fallbackCategoryId
      : GENERAL_CATEGORY_ID;

    if (appState.currentView === "category" && appState.currentCategoryId === categoryId) {
      selectCategory(nextCategoryId, { recordHistory: false });
    } else {
      appState.currentCategoryId = nextCategoryId;
      expandCategoryPath(nextCategoryId);
    }

    logClientEvent({
      source: "category",
      action: "delete_category_completed",
      message: "Category deleted successfully.",
      context: {
        categoryId,
        fallbackCategoryId: appState.currentCategoryId,
        reassignedItemCount,
        removedLinkCount,
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
        reassignedItemCount,
        removedLinkCount,
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
  const images = input.images ?? [];

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
      hasImages: images.length > 0,
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
          images,
          type: input.type,
          category_id: input.categoryId,
        };
        return;
      }

      draft.__SYSTEM_TASKS__.push({
        title: input.title,
        comment: input.comment,
        images,
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
        hasImages: images.length > 0,
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
        hasImages: images.length > 0,
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