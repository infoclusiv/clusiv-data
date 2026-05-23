import { invoke } from "@tauri-apps/api/core";

import type {
  AppData,
  AppView,
  BackupInfo,
  BoardMode,
  CategorySection,
  CategoryFormInput,
  CreateFlowInput,
  Flow,
  FlowEdge,
  FlowNode,
  Item,
  ItemEditorState,
  ItemFormInput,
  ItemType,
  Link,
  LinkFormInput,
  LogLevel,
  LogStatus,
  NavigationSnapshot,
  QuickTextFormInput,
  QuickTextGroupFormInput,
  UpdateFlowInput,
} from "$lib/store/types";
import {
  buildCategoryRecord,
  categoryHasChildren,
  generateCategoryId,
  generateItemId,
  getCategory,
  getFlowById,
  getCategoryPathIds,
  getFlatCategoryEntries,
  getItemCategoryId,
  getQuickTextGroups,
  getQuickTextGroupSortOrder,
  normalizeAppData,
  normalizeFlow,
  normalizeFlowEdge,
  normalizeFlowNode,
  normalizeQuickTextGroupSortOrders,
  normalizeQuickTextGroupIds,
  normalizeItemImages,
  normalizeLink,
  normalizeLinks,
  syncLegacyQuickTextGroupId,
} from "$lib/utils/categoryUtils";
import { removeQuickTextGroupMembership } from "$lib/utils/quickTextGrouping";
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
  currentCategorySection: "overview" as CategorySection,
  currentFlowId: null as string | null,
  itemEditor: null as ItemEditorState | null,
  searchQuery: "",
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

const REDACTED_LOG_VALUE = "[REDACTED]";
const SENSITIVE_LOG_FIELD_NAMES = new Set([
  "apikey",
  "authorization",
  "authtoken",
  "accesstoken",
  "refreshtoken",
  "secret",
  "password",
  "token",
  "cookie",
  "setcookie",
  "clientsecret",
]);

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

interface OpenItemEditorOptions {
  editingItem?: Item | null;
  editingIndex?: number | null;
  initialCategoryId?: string | null;
  initialType?: ItemType;
  title?: string;
  recordHistory?: boolean;
}

const DEFAULT_CATEGORY_SECTION: CategorySection = "overview";

function countLinks(appData: AppData): number {
  return Object.values(appData.__SYSTEM_CATEGORIES__).reduce(
    (total, category) => total + category.links.length,
    0,
  );
}

function countQuickTexts(appData: AppData): number {
  return appData.__SYSTEM_QUICK_TEXTS__.length;
}

function countQuickTextGroups(appData: AppData): number {
  return appData.__SYSTEM_QUICK_TEXT_GROUPS__.length;
}

function countFlows(appData: AppData): number {
  return appData.__SYSTEM_FLOWS__.length;
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
    quickTextCount: countQuickTexts(appData),
    quickTextGroupCount: countQuickTextGroups(appData),
    flowCount: countFlows(appData),
  };
}

function getUrlHost(url: string): string | null {
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}

function getUrlLogContext(url: string): Record<string, unknown> {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.host || null,
      protocol: parsed.protocol.replace(/:$/, ""),
      hasCredentials: Boolean(parsed.username || parsed.password),
      hasHash: parsed.hash.length > 0,
      hasQueryString: parsed.search.length > 0,
    };
  } catch {
    return {
      host: getUrlHost(url),
      isValidUrl: false,
    };
  }
}

function isSensitiveLogFieldName(key: string): boolean {
  return SENSITIVE_LOG_FIELD_NAMES.has(key.replace(/[_-]/g, "").toLowerCase());
}

function sanitizeLoggedUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const hadSensitiveParts =
      parsed.username.length > 0 ||
      parsed.password.length > 0 ||
      parsed.search.length > 0 ||
      parsed.hash.length > 0;

    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";

    const sanitizedUrl = parsed.toString();
    return hadSensitiveParts ? `${sanitizedUrl} ${REDACTED_LOG_VALUE}` : sanitizedUrl;
  } catch {
    return rawUrl;
  }
}

function sanitizeLogString(value: string): string {
  return value
    .replace(/\bhttps?:\/\/[^\s"'<>]+/gi, (match) => sanitizeLoggedUrl(match))
    .replace(/(Bearer)\s+[A-Za-z0-9._-]{8,}/gi, `$1 ${REDACTED_LOG_VALUE}`)
    .replace(
      /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|auth|secret|password|token)\s*[:=]\s*)["']?[^"',\s}]+/gi,
      `$1${REDACTED_LOG_VALUE}`,
    )
    .replace(
      /([?&](?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|auth|secret|password|token)=)[^&#\s]+/gi,
      `$1${REDACTED_LOG_VALUE}`,
    );
}

function sanitizeLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) {
    return value ?? null;
  }

  if (typeof value === "string") {
    return sanitizeLogString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeLogValue(entry, seen));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeLogString(value.message),
      stack: value.stack ? sanitizeLogString(value.stack) : null,
    };
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        isSensitiveLogFieldName(key)
          ? REDACTED_LOG_VALUE
          : sanitizeLogValue(nestedValue, seen),
      ]),
    );
  }

  return sanitizeLogString(String(value));
}

function sanitizeLogContext(
  context: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!context) {
    return context;
  }

  const sanitized = sanitizeLogValue(context);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? (sanitized as Record<string, unknown>)
    : { value: sanitized };
}

export function getLogErrorContext(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return sanitizeLogValue({
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    }) as Record<string, unknown>;
  }

  return sanitizeLogValue({
    value: String(error),
  }) as Record<string, unknown>;
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
      message: sanitizeLogString(message),
      context: sanitizeLogContext(context),
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

function normalizeItemFormInput(input: ItemFormInput): ItemFormInput {
  return {
    id: input.id,
    title: input.title,
    comment: input.comment,
    type: input.type,
    categoryId: input.categoryId,
    images: input.type === "note" ? normalizeItemImages(input.images) : [],
  };
}

function buildSafeLinkLogContext(link: Pick<Link, "url" | "images">): Record<string, unknown> {
  const imageCount = link.images.length;

  return {
    ...getUrlLogContext(link.url),
    imageCount,
    hasImages: imageCount > 0,
  };
}

function getItemTypeLabel(itemType: ItemType): string {
  return itemType === "note" ? "Nota" : "Tarea";
}

function buildItemEditorTitle(
  editingItem: Item | null,
  initialType: ItemType,
  title?: string,
): string {
  if (title) {
    return title;
  }

  if (editingItem) {
    return `Editar ${getItemTypeLabel(editingItem.type)}`;
  }

  return `Nueva ${getItemTypeLabel(initialType)}`;
}

function sanitizeCategorySection(section: CategorySection | null | undefined): CategorySection {
  return section ?? DEFAULT_CATEGORY_SECTION;
}

function buildDefaultFlowNodes(flowId: string): FlowNode[] {
  return [
    normalizeFlowNode(
      {
        id: `${flowId}-node-1`,
        type: "input",
        title: "Inicio",
        description: "",
        comments: "",
        linked_note_ids: [],
        position: { x: 80, y: 120 },
      },
      `${flowId}-node-1`,
    ) as FlowNode,
    normalizeFlowNode(
      {
        id: `${flowId}-node-2`,
        type: "process",
        title: "Paso principal",
        description: "",
        comments: "",
        linked_note_ids: [],
        position: { x: 320, y: 120 },
      },
      `${flowId}-node-2`,
    ) as FlowNode,
    normalizeFlowNode(
      {
        id: `${flowId}-node-3`,
        type: "output",
        title: "Resultado",
        description: "",
        comments: "",
        linked_note_ids: [],
        position: { x: 560, y: 120 },
      },
      `${flowId}-node-3`,
    ) as FlowNode,
  ];
}

function buildDefaultFlowEdges(flowId: string): FlowEdge[] {
  return [
    normalizeFlowEdge(
      {
        id: `${flowId}-edge-1`,
        source: `${flowId}-node-1`,
        target: `${flowId}-node-2`,
        label: "",
      },
      `${flowId}-edge-1`,
    ) as FlowEdge,
    normalizeFlowEdge(
      {
        id: `${flowId}-edge-2`,
        source: `${flowId}-node-2`,
        target: `${flowId}-node-3`,
        label: "",
      },
      `${flowId}-edge-2`,
    ) as FlowEdge,
  ];
}

function generateQuickTextGroupId(appData: AppData): string {
  const existingIds = new Set(getQuickTextGroups(appData).map((group) => group.id));

  while (true) {
    const candidate = `quick_text_group_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
}

function getNextQuickTextGroupSortOrder(appData: AppData): number {
  return getQuickTextGroups(appData).reduce(
    (maxOrder, group) => Math.max(maxOrder, group.sort_order),
    0,
  ) + 1;
}

function getNextQuickTextSortOrder(appData: AppData, groupId: string | null): number {
  return appData.__SYSTEM_QUICK_TEXTS__
    .filter((quickText) => quickText.group_id === groupId)
    .reduce((maxOrder, quickText) => Math.max(maxOrder, quickText.sort_order), 0) + 1;
}

function getNextQuickTextOrderForGroup(
  appData: AppData,
  groupId: string,
  excludeId?: string | null,
): number {
  return appData.__SYSTEM_QUICK_TEXTS__
    .filter((quickText) =>
      quickText.id !== excludeId && quickText.group_ids.includes(groupId)
    )
    .reduce(
      (maxOrder, quickText) => Math.max(maxOrder, getQuickTextGroupSortOrder(quickText, groupId)),
      0,
    ) + 1;
}

function resolveQuickTextGroupIds(
  appData: AppData,
  groupIds: string[] | null | undefined,
  legacyGroupId: string | null | undefined = null,
): string[] {
  const candidateGroupIds = normalizeQuickTextGroupIds({
    group_ids: groupIds,
    group_id: legacyGroupId,
  });

  if (candidateGroupIds.length === 0) {
    return candidateGroupIds;
  }

  const validGroupIds = new Set(getQuickTextGroups(appData).map((group) => group.id));
  return candidateGroupIds.filter((groupId) => validGroupIds.has(groupId));
}

function resolveQuickTextGroupId(
  appData: AppData,
  groupId: string | null | undefined,
): string | null {
  return resolveQuickTextGroupIds(appData, [], groupId)[0] ?? null;
}

function buildQuickTextGroupState(
  appData: AppData,
  input: Pick<QuickTextFormInput, "group_id" | "group_ids">,
): { group_ids: string[]; group_id: string | null } {
  const group_ids = resolveQuickTextGroupIds(appData, input.group_ids, input.group_id);
  return syncLegacyQuickTextGroupId({
    group_ids,
    group_id: null,
  });
}

function buildQuickTextGroupSortOrders(
  appData: AppData,
  groupIds: string[],
  sortOrder: number,
  existingQuickText: AppData["__SYSTEM_QUICK_TEXTS__"][number] | null = null,
): Record<string, number> {
  const normalizedExistingGroupSortOrders = existingQuickText
    ? normalizeQuickTextGroupSortOrders(existingQuickText)
    : {};
  const nextGroupSortOrders: Record<string, number> = {};

  for (const groupId of groupIds) {
    nextGroupSortOrders[groupId] = normalizedExistingGroupSortOrders[groupId]
      ?? getNextQuickTextOrderForGroup(appData, groupId, existingQuickText?.id);
  }

  return normalizeQuickTextGroupSortOrders({
    group_ids: groupIds,
    group_id: groupIds[0] ?? null,
    sort_order: sortOrder,
    group_sort_orders: nextGroupSortOrders,
  });
}

function quickTextGroupIdsMatch(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((groupId, index) => groupId === right[index]);
}

function normalizeFlowDraft(flowId: string, input: CreateFlowInput | UpdateFlowInput): Flow {
  return normalizeFlow(
    {
      id: flowId,
      category_id: input.categoryId,
      title: input.title ?? "",
      comments: input.comments ?? "",
      linked_note_ids: input.linked_note_ids ?? [],
      nodes: input.nodes ?? buildDefaultFlowNodes(flowId),
      edges: input.edges ?? buildDefaultFlowEdges(flowId),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    flowId,
  ) as Flow;
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
    categorySection: appState.currentCategorySection,
    flowId: appState.currentFlowId,
  };
}

function navigationMatches(
  left: NavigationSnapshot,
  right: NavigationSnapshot,
): boolean {
  return left.view === right.view
    && left.categoryId === right.categoryId
    && left.boardMode === right.boardMode
    && left.boardFilterId === right.boardFilterId
    && left.categorySection === right.categorySection
    && left.flowId === right.flowId;
}

function sanitizeNavigationHistory(appData: AppData): void {
  const validCategoryIds = new Set(Object.keys(appData.__SYSTEM_CATEGORIES__));
  const validFlowIds = new Set(appData.__SYSTEM_FLOWS__.map((flow) => flow.id));
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
      categorySection: sanitizeCategorySection(snapshot.categorySection),
      flowId: snapshot.flowId && validFlowIds.has(snapshot.flowId)
        ? snapshot.flowId
        : null,
    };

    if (snapshot.boardFilterId && !nextSnapshot.boardFilterId) {
      nextSnapshot.boardMode = "gallery";
    }

    if (snapshot.view === "flow-editor" && !nextSnapshot.flowId) {
      continue;
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
  appState.currentCategorySection = sanitizeCategorySection(snapshot.categorySection);
  appState.currentFlowId = snapshot.flowId ?? null;

  if (snapshot.view !== "item-editor") {
    appState.itemEditor = null;
  }
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
  if (appState.currentFlowId && !getFlowById(normalized, appState.currentFlowId)) {
    appState.currentFlowId = null;
    if (appState.currentView === "flow-editor") {
      appState.currentView = "category";
      appState.currentCategorySection = "flows";
    }
  }
  return normalized;
}

async function persistNormalizedSnapshotIfNeeded(
  original: AppData,
  normalized: AppData,
): Promise<void> {
  if (JSON.stringify(original) === JSON.stringify(normalized)) {
    return;
  }

  try {
    await invoke("save_data", { data: normalized });
    logClientEvent({
      source: "appState",
      action: "load_app_data_migration_persisted",
      message: "Normalized application data persisted after migration.",
      context: getAppDataSummary(normalized),
    });
  } catch (error) {
    logClientError(
      "appState",
      "load_app_data_migration_persist_failed",
      "Failed to persist normalized application data after migration.",
      error,
      getAppDataSummary(normalized),
    );
  }
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
    await persistNormalizedSnapshotIfNeeded(data, normalized);

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
  const urlContext = getUrlLogContext(url);

  logClientEvent({
    source: "appState",
    action: "open_url_started",
    message: "Requesting URL open through the backend.",
    context: urlContext,
  });

  try {
    await invoke("open_url", { url });
    logClientEvent({
      source: "appState",
      action: "open_url_completed",
      message: "URL open request completed.",
      context: urlContext,
    });
  } catch (error) {
    logClientError(
      "appState",
      "open_url_failed",
      "Failed to open URL through the backend.",
      error,
      urlContext,
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

export async function listBackups(): Promise<BackupInfo[]> {
  logClientEvent({
    source: "appState",
    action: "list_backups_started",
    message: "User requested available backups list.",
  });

  try {
    const backups = await invoke<BackupInfo[]>("list_backups");
    logClientEvent({
      source: "appState",
      action: "list_backups_completed",
      message: "Available backups loaded successfully.",
      context: {
        backupCount: backups.length,
      },
    });
    return backups;
  } catch (error) {
    logClientError(
      "appState",
      "list_backups_failed",
      "Failed to list available backups.",
      error,
    );
    throw error;
  }
}

export async function restoreBackup(backupName: string): Promise<string> {
  logClientEvent({
    source: "appState",
    action: "restore_backup_started",
    message: "User requested backup restoration.",
    context: { backupName },
  });

  try {
    const message = await invoke<string>("restore_backup", { backupName });
    await loadAppData();

    logClientEvent({
      source: "appState",
      action: "restore_backup_completed",
      message: "Backup restored successfully and app data reloaded.",
      context: {
        backupName,
        backendMessage: message,
      },
    });

    return message;
  } catch (error) {
    logClientError(
      "appState",
      "restore_backup_failed",
      "Failed to restore backup.",
      error,
      { backupName },
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
      categorySection: previousNavigation.categorySection,
      flowId: previousNavigation.flowId,
    },
  });
}

export function setCategorySection(section: CategorySection): void {
  appState.currentCategorySection = section;
  if (section !== "flows") {
    appState.currentFlowId = null;
  }
}

export function openItemEditor({
  editingItem = null,
  editingIndex = null,
  initialCategoryId = null,
  initialType = "task",
  title,
  recordHistory = true,
}: OpenItemEditorOptions = {}): void {
  const resolvedType = editingItem?.type ?? initialType;
  const resolvedCategoryId = editingItem
    ? getItemCategoryId(editingItem)
    : initialCategoryId ?? appState.currentCategoryId ?? GENERAL_CATEGORY_ID;

  appState.itemEditor = {
    editingItem,
    editingIndex,
    initialCategoryId: resolvedCategoryId,
    initialType: resolvedType,
    title: buildItemEditorTitle(editingItem, resolvedType, title),
  };

  navigate(
    {
      view: "item-editor",
      categoryId: appState.currentCategoryId,
      boardMode: appState.currentBoardMode,
      boardFilterId: appState.currentBoardFilterId,
      categorySection: appState.currentCategorySection,
      flowId: null,
    },
    { recordHistory: recordHistory && appState.currentView !== "item-editor" },
  );

  if (resolvedCategoryId) {
    expandCategoryPath(resolvedCategoryId);
  }
}

export function closeItemEditor(): void {
  if (appState.currentView !== "item-editor") {
    appState.itemEditor = null;
    return;
  }

  appState.itemEditor = null;

  if (appState.navigationHistory.length > 0) {
    goBack();
    return;
  }

  selectCategory(appState.currentCategoryId ?? GENERAL_CATEGORY_ID, { recordHistory: false });
}

export function openFlowEditor(flowId: string): void {
  const appData = requireAppData();
  const flow = getFlowById(appData, flowId);

  logClientEvent({
    source: "flows",
    action: "open_flow_started",
    message: "Opening flow editor.",
    context: {
      flowId,
      categoryId: flow?.category_id ?? null,
    },
  });

  if (!flow) {
    const error = new Error("El flujo ya no existe.");
    logClientError(
      "flows",
      "open_flow_failed",
      "Failed to open flow editor.",
      error,
      { flowId },
    );
    throw error;
  }

  navigate(
    {
      view: "flow-editor",
      categoryId: flow.category_id,
      boardMode: appState.currentBoardMode,
      boardFilterId: appState.currentBoardFilterId,
      categorySection: "flows",
      flowId,
    },
    { recordHistory: appState.currentView !== "flow-editor" || appState.currentFlowId !== flowId },
  );

  expandCategoryPath(flow.category_id);

  logClientEvent({
    source: "flows",
    action: "open_flow_completed",
    message: "Opened flow editor.",
    context: {
      flowId,
      categoryId: flow.category_id,
      title: flow.title,
      nodeCount: flow.nodes.length,
    },
  });
}

export function closeFlowEditor(): void {
  if (appState.currentView !== "flow-editor") {
    appState.currentFlowId = null;
    return;
  }

  appState.currentFlowId = null;

  if (appState.navigationHistory.length > 0) {
    goBack();
    return;
  }

  navigate(
    {
      view: "category",
      categoryId: appState.currentCategoryId ?? GENERAL_CATEGORY_ID,
      boardMode: appState.currentBoardMode,
      boardFilterId: null,
      categorySection: "flows",
      flowId: null,
    },
    { recordHistory: false },
  );
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
      categorySection: DEFAULT_CATEGORY_SECTION,
      flowId: null,
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
      categorySection: appState.currentCategorySection,
      flowId: null,
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
      categorySection: appState.currentCategorySection,
      flowId: null,
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
      categorySection: appState.currentCategorySection,
      flowId: null,
    },
    options,
  );

  logClientEvent({
    source: "navigation",
    action: "show_logs",
    message: "Navigated to debugging logs view.",
  });
}

export function showBackups(options: NavigationOptions = {}): void {
  navigate(
    {
      view: "backups",
      categoryId: appState.currentCategoryId,
      boardMode: appState.currentBoardMode,
      boardFilterId: appState.currentBoardFilterId,
      categorySection: appState.currentCategorySection,
      flowId: null,
    },
    options,
  );

  logClientEvent({
    source: "navigation",
    action: "show_backups",
    message: "Navigated to backups management view.",
  });
}

export function showQuickTexts(options: NavigationOptions = {}): void {
  navigate(
    {
      view: "quick-texts",
      categoryId: appState.currentCategoryId,
      boardMode: appState.currentBoardMode,
      boardFilterId: null,
      categorySection: appState.currentCategorySection,
      flowId: null,
    },
    options,
  );

  logClientEvent({
    source: "navigation",
    action: "show_quick_texts",
    message: "Navigated to quick texts view.",
  });
}

export function showSearch(options: NavigationOptions = {}): void {
  navigate(
    {
      view: "search",
      categoryId: appState.currentCategoryId,
      boardMode: appState.currentBoardMode,
      boardFilterId: null,
      categorySection: appState.currentCategorySection,
      flowId: null,
    },
    options,
  );

  logClientEvent({
    source: "navigation",
    action: "show_search",
    message: "Navigated to global search view.",
    context: {
      queryLength: appState.searchQuery.trim().length,
    },
  });
}

export function showFlows(options: NavigationOptions = {}): void {
  navigate(
    {
      view: "flows",
      categoryId: null,
      boardMode: appState.currentBoardMode,
      boardFilterId: null,
      categorySection: "flows",
      flowId: null,
    },
    options,
  );

  logClientEvent({
    source: "navigation",
    action: "show_flows",
    message: "Navigated to global flows view.",
  });
}

export function setSearchQuery(query: string): void {
  appState.searchQuery = query;
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
  const reassignedFlowCount = currentData.__SYSTEM_FLOWS__.filter(
    (flow) => flow.category_id === categoryId,
  ).length;
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
      reassignedFlowCount,
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

      for (const flow of draft.__SYSTEM_FLOWS__) {
        if (flow.category_id === categoryId) {
          flow.category_id = fallbackCategoryId;
          flow.updated_at = new Date().toISOString();
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
        reassignedFlowCount,
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
        reassignedFlowCount,
        removedLinkCount,
      },
    );
    throw error;
  }
}

export async function addLink(categoryId: string, link: LinkFormInput): Promise<void> {
  const normalizedLink = normalizeLink(link, 1);
  if (!normalizedLink) {
    throw new Error("No se pudo normalizar el enlace.");
  }

  logClientEvent({
    source: "links",
    action: "add_link_started",
    message: "Adding a link to category.",
    context: {
      categoryId,
      title: normalizedLink.title,
      url: normalizedLink.url,
      ...buildSafeLinkLogContext(normalizedLink),
    },
  });

  try {
    await mutateAppData((draft) => {
      const category = draft.__SYSTEM_CATEGORIES__[categoryId];
      if (!category) {
        throw new Error("La categoría no existe.");
      }
      category.links.push(normalizedLink);
    });

    logClientEvent({
      source: "links",
      action: "add_link_completed",
      message: "Link added successfully.",
      context: {
        categoryId,
        title: normalizedLink.title,
        url: normalizedLink.url,
        ...buildSafeLinkLogContext(normalizedLink),
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
        title: normalizedLink.title,
        url: normalizedLink.url,
        ...buildSafeLinkLogContext(normalizedLink),
      },
    );
    throw error;
  }
}

export async function updateLink(
  categoryId: string,
  linkIndex: number,
  input: LinkFormInput,
): Promise<void> {
  const currentData = requireAppData();
  const existingLink = currentData.__SYSTEM_CATEGORIES__[categoryId]?.links[linkIndex];
  const normalizedUrl = input.url.trim();
  const normalizedTitle = input.title.trim() || normalizedUrl;
  const normalizedImages = normalizeItemImages(input.images ?? existingLink?.images ?? []);

  if (!normalizedUrl) {
    throw new Error("La URL es requerida.");
  }

  logClientEvent({
    source: "links",
    action: "update_link_started",
    message: "Updating link in category.",
    context: {
      categoryId,
      linkIndex,
      previousTitle: existingLink?.title ?? null,
      previousUrl: existingLink?.url ?? null,
      previousImageCount: existingLink?.images.length ?? 0,
      title: normalizedTitle,
      url: normalizedUrl,
      ...buildSafeLinkLogContext({
        url: normalizedUrl,
        images: normalizedImages,
      }),
    },
  });

  try {
    await mutateAppData((draft) => {
      const category = draft.__SYSTEM_CATEGORIES__[categoryId];
      if (!category) {
        throw new Error("La categorÃ­a no existe.");
      }

      if (linkIndex < 0 || linkIndex >= category.links.length) {
        throw new Error("No se encontrÃ³ el enlace.");
      }

      category.links = category.links.map((link, index) =>
        index === linkIndex
          ? {
              ...link,
              title: normalizedTitle,
              url: normalizedUrl,
              images: normalizedImages,
            }
          : link,
      );
    });

    logClientEvent({
      source: "links",
      action: "update_link_completed",
      message: "Link updated successfully.",
      context: {
        categoryId,
        linkIndex,
        title: normalizedTitle,
        url: normalizedUrl,
        ...buildSafeLinkLogContext({
          url: normalizedUrl,
          images: normalizedImages,
        }),
      },
    });
  } catch (error) {
    logClientError(
      "links",
      "update_link_failed",
      "Failed to update link in category.",
      error,
      {
        categoryId,
        linkIndex,
        previousTitle: existingLink?.title ?? null,
        previousUrl: existingLink?.url ?? null,
        previousImageCount: existingLink?.images.length ?? 0,
        title: normalizedTitle,
        url: normalizedUrl,
        ...buildSafeLinkLogContext({
          url: normalizedUrl,
          images: normalizedImages,
        }),
      },
    );
    throw error;
  }
}

export async function importLinks(categoryId: string, links: LinkFormInput[]): Promise<void> {
  const normalizedLinks = normalizeLinks(links);
  if (normalizedLinks.length === 0) {
    return;
  }

  const linkImageCount = normalizedLinks.reduce((total, link) => total + link.images.length, 0);

  logClientEvent({
    source: "links",
    action: "import_links_started",
    message: "Importing links in bulk.",
    context: {
      categoryId,
      linkCount: normalizedLinks.length,
      imageCount: linkImageCount,
      hasImages: linkImageCount > 0,
    },
  });

  try {
    await mutateAppData((draft) => {
      const category = draft.__SYSTEM_CATEGORIES__[categoryId];
      if (!category) {
        throw new Error("La categoría no existe.");
      }
      category.links.push(...normalizedLinks);
    });

    logClientEvent({
      source: "links",
      action: "import_links_completed",
      message: "Bulk link import completed.",
      context: {
        categoryId,
        linkCount: normalizedLinks.length,
        imageCount: linkImageCount,
        hasImages: linkImageCount > 0,
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
        linkCount: normalizedLinks.length,
        imageCount: linkImageCount,
        hasImages: linkImageCount > 0,
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
      imageCount: link?.images.length ?? 0,
      hasImages: (link?.images.length ?? 0) > 0,
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
        imageCount: link?.images.length ?? 0,
        hasImages: (link?.images.length ?? 0) > 0,
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
        imageCount: link?.images.length ?? 0,
        hasImages: (link?.images.length ?? 0) > 0,
      },
    );
    throw error;
  }
}

export async function createFlow(input: CreateFlowInput): Promise<string> {
  const flowId = `flow_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const normalizedFlow = normalizeFlowDraft(flowId, input);

  logClientEvent({
    source: "flows",
    action: "create_flow_started",
    message: "Creating a new flow.",
    context: {
      flowId,
      categoryId: normalizedFlow.category_id,
      title: normalizedFlow.title,
      nodeCount: normalizedFlow.nodes.length,
    },
  });

  try {
    await mutateAppData((draft) => {
      draft.__SYSTEM_FLOWS__.unshift(normalizedFlow);
    });

    logClientEvent({
      source: "flows",
      action: "create_flow_completed",
      message: "Flow created successfully.",
      context: {
        flowId,
        categoryId: normalizedFlow.category_id,
        title: normalizedFlow.title,
        nodeCount: normalizedFlow.nodes.length,
      },
    });

    return flowId;
  } catch (error) {
    logClientError(
      "flows",
      "create_flow_failed",
      "Failed to create flow.",
      error,
      {
        flowId,
        categoryId: normalizedFlow.category_id,
        title: normalizedFlow.title,
      },
    );
    throw error;
  }
}

export async function updateFlow(flowId: string, input: UpdateFlowInput): Promise<void> {
  const currentFlow = getFlowById(requireAppData(), flowId);
  if (!currentFlow) {
    throw new Error("El flujo ya no existe.");
  }

  const nextTimestamp = new Date().toISOString();

  logClientEvent({
    source: "flows",
    action: "update_flow_started",
    message: "Updating flow.",
    context: {
      flowId,
      categoryId: input.categoryId ?? currentFlow.category_id,
      title: input.title ?? currentFlow.title,
    },
  });

  try {
    await mutateAppData((draft) => {
      const flowIndex = draft.__SYSTEM_FLOWS__.findIndex((entry) => entry.id === flowId);
      if (flowIndex === -1) {
        throw new Error("El flujo ya no existe.");
      }

      const previousFlow = draft.__SYSTEM_FLOWS__[flowIndex];
      const normalizedFlow = normalizeFlow(
        {
          ...previousFlow,
          category_id: input.categoryId ?? previousFlow.category_id,
          title: input.title ?? previousFlow.title,
          comments: input.comments ?? previousFlow.comments,
          linked_note_ids: input.linked_note_ids ?? previousFlow.linked_note_ids,
          nodes: input.nodes ?? previousFlow.nodes,
          edges: input.edges ?? previousFlow.edges,
          created_at: previousFlow.created_at,
          updated_at: nextTimestamp,
        },
        flowId,
      );

      if (!normalizedFlow) {
        throw new Error("No se pudo normalizar el flujo.");
      }

      draft.__SYSTEM_FLOWS__[flowIndex] = normalizedFlow;
    });

    logClientEvent({
      source: "flows",
      action: "update_flow_completed",
      message: "Flow updated successfully.",
      context: {
        flowId,
        updatedAt: nextTimestamp,
      },
    });
  } catch (error) {
    logClientError(
      "flows",
      "update_flow_failed",
      "Failed to update flow.",
      error,
      {
        flowId,
        categoryId: input.categoryId ?? currentFlow.category_id,
        title: input.title ?? currentFlow.title,
      },
    );
    throw error;
  }
}

export async function deleteFlow(flowId: string): Promise<void> {
  const flow = getFlowById(requireAppData(), flowId);
  if (!flow) {
    throw new Error("El flujo ya no existe.");
  }

  logClientEvent({
    source: "flows",
    action: "delete_flow_started",
    message: "Deleting flow.",
    context: {
      flowId,
      categoryId: flow.category_id,
      title: flow.title,
      nodeCount: flow.nodes.length,
    },
  });

  try {
    await mutateAppData((draft) => {
      const flowIndex = draft.__SYSTEM_FLOWS__.findIndex((entry) => entry.id === flowId);
      if (flowIndex === -1) {
        throw new Error("El flujo ya no existe.");
      }
      draft.__SYSTEM_FLOWS__.splice(flowIndex, 1);
    });

    if (appState.currentFlowId === flowId) {
      appState.currentFlowId = null;
    }

    if (appState.currentView === "flow-editor") {
      closeFlowEditor();
    }

    logClientEvent({
      source: "flows",
      action: "delete_flow_completed",
      message: "Flow deleted successfully.",
      context: {
        flowId,
        categoryId: flow.category_id,
      },
    });
  } catch (error) {
    logClientError(
      "flows",
      "delete_flow_failed",
      "Failed to delete flow.",
      error,
      {
        flowId,
        categoryId: flow.category_id,
        title: flow.title,
      },
    );
    throw error;
  }
}

export async function updateGlobalFlowLinkedNotes(noteIds: string[]): Promise<void> {
  const appData = requireAppData();

  const validNoteIds = new Set(
    appData.__SYSTEM_TASKS__
      .filter((item) => item.type === "note")
      .map((item) => item.id),
  );

  appData.__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__ = [...new Set(noteIds)]
    .filter((noteId) => validNoteIds.has(noteId));

  logClientEvent({
    source: "globalFlows",
    action: "global_flow_linked_notes_updated",
    message: "Global flow linked notes were updated.",
    context: {
      linkedNoteCount: appData.__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__.length,
    },
  });

  await persistData();
}

export async function updateGlobalQuickTextLinkedNotes(noteIds: string[]): Promise<void> {
  const appData = requireAppData();

  const validNoteIds = new Set(
    appData.__SYSTEM_TASKS__
      .filter((item) => item.type === "note")
      .map((item) => item.id),
  );

  appData.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__ = [...new Set(noteIds)]
    .filter((noteId) => validNoteIds.has(noteId));

  logClientEvent({
    source: "globalQuickTexts",
    action: "global_quick_text_linked_notes_updated",
    message: "Global quick text linked notes were updated.",
    context: {
      linkedNoteCount: appData.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__.length,
    },
  });

  await persistData();
}

export async function linkNoteToGlobalFlows(noteId: string): Promise<void> {
  const appData = requireAppData();

  await updateGlobalFlowLinkedNotes([
    ...(appData.__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__ ?? []),
    noteId,
  ]);
}

export async function linkNoteToGlobalQuickTexts(noteId: string): Promise<void> {
  const appData = requireAppData();

  await updateGlobalQuickTextLinkedNotes([
    ...(appData.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__ ?? []),
    noteId,
  ]);
}

export async function unlinkNoteFromGlobalFlows(noteId: string): Promise<void> {
  const appData = requireAppData();

  await updateGlobalFlowLinkedNotes(
    (appData.__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__ ?? [])
      .filter((id) => id !== noteId),
  );
}

export async function unlinkNoteFromGlobalQuickTexts(noteId: string): Promise<void> {
  const appData = requireAppData();

  await updateGlobalQuickTextLinkedNotes(
    (appData.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__ ?? [])
      .filter((id) => id !== noteId),
  );
}

export async function saveQuickText(
  input: QuickTextFormInput,
  editingQuickTextId: string | null = null,
): Promise<string> {
  const currentData = requireAppData();
  const existingQuickText = editingQuickTextId
    ? currentData.__SYSTEM_QUICK_TEXTS__.find((entry) => entry.id === editingQuickTextId) ?? null
    : null;
  const previousGroupIds = existingQuickText?.group_ids ?? [];
  const previousGroupId = existingQuickText?.group_id ?? null;
  const nextGroupState = buildQuickTextGroupState(currentData, input);
  const nextGroupIds = nextGroupState.group_ids;
  const nextGroupId = nextGroupState.group_id;
  const groupChanged = Boolean(existingQuickText)
    && !quickTextGroupIdsMatch(previousGroupIds, nextGroupIds);
  const sortOrder = editingQuickTextId
    ? (existingQuickText
      ? (groupChanged
        ? getNextQuickTextSortOrder(currentData, nextGroupId)
        : existingQuickText.sort_order)
      : 0)
    : getNextQuickTextSortOrder(currentData, nextGroupId);
  const normalizedInput = {
    id: editingQuickTextId ?? crypto.randomUUID(),
    title: input.title.trim(),
    content: input.content.trim(),
    group_ids: nextGroupState.group_ids,
    group_id: nextGroupId,
    sort_order: sortOrder,
    group_sort_orders: buildQuickTextGroupSortOrders(
      currentData,
      nextGroupState.group_ids,
      sortOrder,
      existingQuickText,
    ),
  };

  logClientEvent({
    source: "quickTexts",
    action: editingQuickTextId ? "update_quick_text_started" : "create_quick_text_started",
    message: editingQuickTextId
      ? "Updating quick text."
      : "Creating quick text.",
    context: {
      quickTextId: normalizedInput.id,
      editingQuickTextId,
      hasTitle: normalizedInput.title.length > 0,
      contentLength: normalizedInput.content.length,
      previousGroupIds,
      nextGroupIds,
      previousGroupId,
      nextGroupId,
      groupCount: nextGroupIds.length,
      groupChanged,
      sortOrder: normalizedInput.sort_order,
      groupSortOrders: normalizedInput.group_sort_orders,
    },
  });

  try {
    await mutateAppData((draft) => {
      const quickTexts = draft.__SYSTEM_QUICK_TEXTS__;
      const existingIndex = quickTexts.findIndex((entry) => entry.id === normalizedInput.id);

      if (editingQuickTextId) {
        if (existingIndex === -1) {
          throw new Error("El texto rápido ya no existe.");
        }

        const previousDraftGroupId = quickTexts[existingIndex].group_id;
        const nextDraftGroupState = buildQuickTextGroupState(draft, input);
        const nextDraftGroupId = nextDraftGroupState.group_id;
        const sortOrderForDraft = previousDraftGroupId === nextDraftGroupId
          ? quickTexts[existingIndex].sort_order
          : getNextQuickTextSortOrder(draft, nextDraftGroupId);
        const nextGroupSortOrdersForDraft = buildQuickTextGroupSortOrders(
          draft,
          nextDraftGroupState.group_ids,
          sortOrderForDraft,
          quickTexts[existingIndex],
        );

        quickTexts[existingIndex] = syncLegacyQuickTextGroupId({
          ...quickTexts[existingIndex],
          ...normalizedInput,
          group_ids: nextDraftGroupState.group_ids,
          group_id: nextDraftGroupId,
          sort_order: sortOrderForDraft,
          group_sort_orders: nextGroupSortOrdersForDraft,
        });
        return;
      }

      const resolvedGroupState = buildQuickTextGroupState(draft, input);
      const resolvedSortOrder = getNextQuickTextSortOrder(draft, resolvedGroupState.group_id);
      quickTexts.unshift(syncLegacyQuickTextGroupId({
        ...normalizedInput,
        group_ids: resolvedGroupState.group_ids,
        group_id: resolvedGroupState.group_id,
        sort_order: resolvedSortOrder,
        group_sort_orders: buildQuickTextGroupSortOrders(
          draft,
          resolvedGroupState.group_ids,
          resolvedSortOrder,
        ),
      }));
    });

    logClientEvent({
      source: "quickTexts",
      action: editingQuickTextId ? "update_quick_text_completed" : "create_quick_text_completed",
      message: editingQuickTextId
        ? "Quick text updated successfully."
        : "Quick text created successfully.",
      context: {
        quickTextId: normalizedInput.id,
        hasTitle: normalizedInput.title.length > 0,
        contentLength: normalizedInput.content.length,
        previousGroupIds,
        nextGroupIds,
        previousGroupId,
        nextGroupId,
        groupCount: nextGroupIds.length,
        groupChanged,
        sortOrder: normalizedInput.sort_order,
        groupSortOrders: normalizedInput.group_sort_orders,
      },
    });

    return normalizedInput.id;
  } catch (error) {
    logClientError(
      "quickTexts",
      editingQuickTextId ? "update_quick_text_failed" : "create_quick_text_failed",
      editingQuickTextId
        ? "Failed to update quick text."
        : "Failed to create quick text.",
      error,
      {
        quickTextId: normalizedInput.id,
        editingQuickTextId,
        hasTitle: normalizedInput.title.length > 0,
        contentLength: normalizedInput.content.length,
        previousGroupIds,
        nextGroupIds,
        previousGroupId,
        nextGroupId,
        groupCount: nextGroupIds.length,
        groupChanged,
        sortOrder: normalizedInput.sort_order,
        groupSortOrders: normalizedInput.group_sort_orders,
      },
    );
    throw error;
  }
}

export async function saveQuickTextGroup(
  input: QuickTextGroupFormInput,
  editingGroupId: string | null = null,
): Promise<string> {
  const normalizedName = input.name.trim();
  const normalizedDescription = input.description.trim();
  const currentData = requireAppData();
  const existingGroup = editingGroupId
    ? getQuickTextGroups(currentData).find((group) => group.id === editingGroupId) ?? null
    : null;
  const groupId = editingGroupId ?? generateQuickTextGroupId(currentData);
  const startedAction = editingGroupId
    ? "update_quick_text_group_started"
    : "create_quick_text_group_started";
  const completedAction = editingGroupId
    ? "update_quick_text_group_completed"
    : "create_quick_text_group_completed";
  const failedAction = editingGroupId
    ? "update_quick_text_group_failed"
    : "create_quick_text_group_failed";

  logClientEvent({
    source: "quickTextGroups",
    action: startedAction,
    message: editingGroupId ? "Updating quick text group." : "Creating quick text group.",
    context: {
      groupId,
      editingGroupId,
      hasName: normalizedName.length > 0,
      hasDescription: normalizedDescription.length > 0,
      previousName: existingGroup?.name ?? null,
    },
  });

  try {
    await mutateAppData((draft) => {
      if (!normalizedName) {
        throw new Error("El nombre del grupo es obligatorio.");
      }

      const groups = getQuickTextGroups(draft);
      const timestamp = new Date().toISOString();

      if (editingGroupId) {
        const groupIndex = groups.findIndex((group) => group.id === editingGroupId);
        if (groupIndex === -1) {
          throw new Error("El grupo de textos rápidos ya no existe.");
        }

        const existingDraftGroup = groups[groupIndex];
        groups[groupIndex] = {
          ...existingDraftGroup,
          id: existingDraftGroup.id,
          name: normalizedName,
          description: normalizedDescription,
          created_at: existingDraftGroup.created_at,
          updated_at: timestamp,
        };
        return;
      }

      groups.push({
        id: groupId,
        name: normalizedName,
        description: normalizedDescription,
        sort_order: getNextQuickTextGroupSortOrder(draft),
        created_at: timestamp,
        updated_at: timestamp,
      });
    });

    logClientEvent({
      source: "quickTextGroups",
      action: completedAction,
      message: editingGroupId
        ? "Quick text group updated successfully."
        : "Quick text group created successfully.",
      context: {
        groupId,
        hasName: normalizedName.length > 0,
        hasDescription: normalizedDescription.length > 0,
      },
    });

    return groupId;
  } catch (error) {
    logClientError(
      "quickTextGroups",
      failedAction,
      editingGroupId
        ? "Failed to update quick text group."
        : "Failed to create quick text group.",
      error,
      {
        groupId,
        editingGroupId,
        hasName: normalizedName.length > 0,
        hasDescription: normalizedDescription.length > 0,
      },
    );
    throw error;
  }
}

export async function deleteQuickTextGroup(groupId: string): Promise<void> {
  const currentData = requireAppData();
  const group = getQuickTextGroups(currentData).find((entry) => entry.id === groupId) ?? null;
  const assignedTextCount = currentData.__SYSTEM_QUICK_TEXTS__
    .filter((quickText) => quickText.group_ids.includes(groupId))
    .length;

  logClientEvent({
    source: "quickTextGroups",
    action: "delete_quick_text_group_started",
    message: "Deleting quick text group.",
    context: {
      groupId,
      name: group?.name ?? null,
      assignedTextCount,
    },
  });

  try {
    await mutateAppData((draft) => {
      const groups = getQuickTextGroups(draft);
      const groupIndex = groups.findIndex((entry) => entry.id === groupId);

      if (groupIndex === -1) {
        throw new Error("El grupo de textos rápidos ya no existe.");
      }

      groups.splice(groupIndex, 1);

      let nextUngroupedSortOrder = getNextQuickTextSortOrder(draft, null);
      for (const quickText of draft.__SYSTEM_QUICK_TEXTS__) {
        if (!quickText.group_ids.includes(groupId)) {
          continue;
        }

        removeQuickTextGroupMembership(quickText, groupId);

        if (quickText.group_id === null) {
          quickText.sort_order = nextUngroupedSortOrder;
          nextUngroupedSortOrder += 1;
        }
      }
    });

    logClientEvent({
      source: "quickTextGroups",
      action: "delete_quick_text_group_completed",
      message: "Quick text group deleted successfully.",
      context: {
        groupId,
        assignedTextCount,
      },
    });
  } catch (error) {
    logClientError(
      "quickTextGroups",
      "delete_quick_text_group_failed",
      "Failed to delete quick text group.",
      error,
      {
        groupId,
        name: group?.name ?? null,
        assignedTextCount,
      },
    );
    throw error;
  }
}

export async function moveQuickTextGroup(
  groupId: string,
  direction: "up" | "down",
): Promise<void> {
  const currentData = requireAppData();
  const sortedGroups = getQuickTextGroups(currentData)
    .slice()
    .sort((left, right) =>
      left.sort_order - right.sort_order || left.name.localeCompare(right.name)
    );
  const fromIndex = sortedGroups.findIndex((group) => group.id === groupId);
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
  const targetGroup = fromIndex >= 0 ? sortedGroups[fromIndex] : null;

  logClientEvent({
    source: "quickTextGroups",
    action: "move_quick_text_group_started",
    message: "Moving quick text group.",
    context: {
      groupId,
      direction,
      fromIndex,
      toIndex,
      groupCount: sortedGroups.length,
      name: targetGroup?.name ?? null,
    },
  });

  if (fromIndex === -1) {
    const error = new Error("El grupo de textos rápidos ya no existe.");
    logClientError(
      "quickTextGroups",
      "move_quick_text_group_failed",
      "Failed to move quick text group.",
      error,
      {
        groupId,
        direction,
        fromIndex,
        toIndex,
        groupCount: sortedGroups.length,
      },
    );
    throw error;
  }

  if (toIndex < 0 || toIndex >= sortedGroups.length) {
    return;
  }

  try {
    await mutateAppData((draft) => {
      const groups = getQuickTextGroups(draft);
      const orderedGroups = groups
        .slice()
        .sort((left, right) =>
          left.sort_order - right.sort_order || left.name.localeCompare(right.name)
        );
      const currentIndex = orderedGroups.findIndex((group) => group.id === groupId);
      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex === -1) {
        throw new Error("El grupo de textos rápidos ya no existe.");
      }

      if (nextIndex < 0 || nextIndex >= orderedGroups.length) {
        return;
      }

      const movedGroup = orderedGroups[currentIndex];
      const swappedGroup = orderedGroups[nextIndex];
      orderedGroups[currentIndex] = swappedGroup;
      orderedGroups[nextIndex] = movedGroup;

      const timestamp = new Date().toISOString();
      orderedGroups.forEach((group, index) => {
        const originalGroup = groups.find((entry) => entry.id === group.id);
        if (!originalGroup) {
          return;
        }

        originalGroup.sort_order = index + 1;
        if (group.id === movedGroup.id || group.id === swappedGroup.id) {
          originalGroup.updated_at = timestamp;
        }
      });
    });

    logClientEvent({
      source: "quickTextGroups",
      action: "move_quick_text_group_completed",
      message: "Quick text group moved successfully.",
      context: {
        groupId,
        direction,
        fromIndex,
        toIndex,
        groupCount: sortedGroups.length,
        name: targetGroup?.name ?? null,
      },
    });
  } catch (error) {
    logClientError(
      "quickTextGroups",
      "move_quick_text_group_failed",
      "Failed to move quick text group.",
      error,
      {
        groupId,
        direction,
        fromIndex,
        toIndex,
        groupCount: sortedGroups.length,
        name: targetGroup?.name ?? null,
      },
    );
    throw error;
  }
}

export async function moveQuickTextInGroup(
  quickTextId: string,
  groupId: string,
  direction: "up" | "down",
): Promise<void> {
  const currentData = requireAppData();
  const orderedQuickTexts = currentData.__SYSTEM_QUICK_TEXTS__
    .filter((quickText) => quickText.group_ids.includes(groupId))
    .slice()
    .sort((left, right) =>
      getQuickTextGroupSortOrder(left, groupId) - getQuickTextGroupSortOrder(right, groupId)
      || left.title.localeCompare(right.title)
    );
  const fromIndex = orderedQuickTexts.findIndex((quickText) => quickText.id === quickTextId);
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;

  logClientEvent({
    source: "quickTexts",
    action: "move_quick_text_in_group_started",
    message: "Moving quick text within group.",
    context: {
      quickTextId,
      groupId,
      direction,
      fromIndex,
      toIndex,
      groupTextCount: orderedQuickTexts.length,
    },
  });

  if (fromIndex === -1) {
    const error = new Error("El texto rápido ya no pertenece a este grupo.");
    logClientError(
      "quickTexts",
      "move_quick_text_in_group_failed",
      "Failed to move quick text within group.",
      error,
      {
        quickTextId,
        groupId,
        direction,
        fromIndex,
        toIndex,
        groupTextCount: orderedQuickTexts.length,
      },
    );
    throw error;
  }

  if (toIndex < 0 || toIndex >= orderedQuickTexts.length) {
    return;
  }

  try {
    await mutateAppData((draft) => {
      const targetQuickTexts = draft.__SYSTEM_QUICK_TEXTS__
        .filter((quickText) => quickText.group_ids.includes(groupId))
        .slice()
        .sort((left, right) =>
          getQuickTextGroupSortOrder(left, groupId) - getQuickTextGroupSortOrder(right, groupId)
          || left.title.localeCompare(right.title)
        );
      const currentIndex = targetQuickTexts.findIndex((quickText) => quickText.id === quickTextId);
      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex === -1) {
        throw new Error("El texto rápido ya no pertenece a este grupo.");
      }

      if (nextIndex < 0 || nextIndex >= targetQuickTexts.length) {
        return;
      }

      const movedQuickText = targetQuickTexts[currentIndex];
      const swappedQuickText = targetQuickTexts[nextIndex];
      targetQuickTexts[currentIndex] = swappedQuickText;
      targetQuickTexts[nextIndex] = movedQuickText;

      targetQuickTexts.forEach((quickText, index) => {
        quickText.group_sort_orders[groupId] = index + 1;
      });
    });

    logClientEvent({
      source: "quickTexts",
      action: "move_quick_text_in_group_completed",
      message: "Quick text moved within group successfully.",
      context: {
        quickTextId,
        groupId,
        direction,
        fromIndex,
        toIndex,
        groupTextCount: orderedQuickTexts.length,
      },
    });
  } catch (error) {
    logClientError(
      "quickTexts",
      "move_quick_text_in_group_failed",
      "Failed to move quick text within group.",
      error,
      {
        quickTextId,
        groupId,
        direction,
        fromIndex,
        toIndex,
        groupTextCount: orderedQuickTexts.length,
      },
    );
    throw error;
  }
}

export async function removeQuickTextFromGroup(
  quickTextId: string,
  groupId: string,
): Promise<void> {
  const quickText = requireAppData().__SYSTEM_QUICK_TEXTS__.find(
    (entry) => entry.id === quickTextId,
  );
  const previousGroupIds = quickText?.group_ids ?? [];
  const nextGroupIds = previousGroupIds.filter((entry) => entry !== groupId);

  logClientEvent({
    source: "quickTexts",
    action: "remove_quick_text_from_group_started",
    message: "Removing quick text from group.",
    context: {
      quickTextId,
      removedGroupId: groupId,
      previousGroupIds,
      nextGroupIds,
      hasTitle: (quickText?.title.trim().length ?? 0) > 0,
      contentLength: quickText?.content.length ?? 0,
    },
  });

  try {
    await mutateAppData((draft) => {
      const targetQuickText = draft.__SYSTEM_QUICK_TEXTS__.find(
        (entry) => entry.id === quickTextId,
      );

      if (!targetQuickText) {
        throw new Error("El texto rÃ¡pido ya no existe.");
      }

      if (!targetQuickText.group_ids.includes(groupId)) {
        throw new Error("El texto rÃ¡pido ya no pertenece a este grupo.");
      }

      removeQuickTextGroupMembership(targetQuickText, groupId);
    });

    logClientEvent({
      source: "quickTexts",
      action: "remove_quick_text_from_group_completed",
      message: "Quick text removed from group successfully.",
      context: {
        quickTextId,
        removedGroupId: groupId,
        previousGroupIds,
        nextGroupIds,
      },
    });
  } catch (error) {
    logClientError(
      "quickTexts",
      "remove_quick_text_from_group_failed",
      "Failed to remove quick text from group.",
      error,
      {
        quickTextId,
        removedGroupId: groupId,
        previousGroupIds,
        nextGroupIds,
      },
    );
    throw error;
  }
}

export async function deleteQuickText(quickTextId: string): Promise<void> {
  const quickText = requireAppData().__SYSTEM_QUICK_TEXTS__.find(
    (entry) => entry.id === quickTextId,
  );

  logClientEvent({
    source: "quickTexts",
    action: "delete_quick_text_started",
    message: "Deleting quick text.",
    context: {
      quickTextId,
      hasTitle: (quickText?.title.trim().length ?? 0) > 0,
      contentLength: quickText?.content.length ?? 0,
    },
  });

  try {
    await mutateAppData((draft) => {
      const quickTextIndex = draft.__SYSTEM_QUICK_TEXTS__.findIndex(
        (entry) => entry.id === quickTextId,
      );

      if (quickTextIndex === -1) {
        throw new Error("El texto rápido ya no existe.");
      }

      draft.__SYSTEM_QUICK_TEXTS__.splice(quickTextIndex, 1);
    });

    logClientEvent({
      source: "quickTexts",
      action: "delete_quick_text_completed",
      message: "Quick text deleted successfully.",
      context: {
        quickTextId,
      },
    });
  } catch (error) {
    logClientError(
      "quickTexts",
      "delete_quick_text_failed",
      "Failed to delete quick text.",
      error,
      {
        quickTextId,
      },
    );
    throw error;
  }
}

export function getItemIndex(item: Item): number {
  return requireAppData().__SYSTEM_TASKS__.findIndex((entry) => entry.id === item.id);
}

export async function saveItem(
  input: ItemFormInput,
  editingIndex: number | null = null,
): Promise<number> {
  const normalizedInput = normalizeItemFormInput(input);
  let resolvedIndex = editingIndex ?? -1;
  const images = normalizedInput.images ?? [];

  logClientEvent({
    source: "items",
    action: editingIndex !== null ? "update_item_started" : "create_item_started",
    message: editingIndex !== null
      ? "Updating note or task."
      : "Creating note or task.",
    context: {
      editingIndex,
      title: normalizedInput.title,
      type: normalizedInput.type,
      categoryId: normalizedInput.categoryId,
      hasComment: normalizedInput.comment.trim().length > 0,
      hasImages: images.length > 0,
    },
  });

  try {
    await mutateAppData((draft) => {
      if (editingIndex !== null && editingIndex >= 0 && draft.__SYSTEM_TASKS__[editingIndex]) {
        const current = draft.__SYSTEM_TASKS__[editingIndex];
        draft.__SYSTEM_TASKS__[editingIndex] = {
          ...current,
          id: normalizedInput.id ?? current.id,
          title: normalizedInput.title,
          comment: normalizedInput.comment,
          images,
          type: normalizedInput.type,
          category_id: normalizedInput.categoryId,
        };
        return;
      }

      draft.__SYSTEM_TASKS__.push({
        id: normalizedInput.id ?? generateItemId(),
        title: normalizedInput.title,
        comment: normalizedInput.comment,
        images,
        type: normalizedInput.type,
        done: false,
        category_id: normalizedInput.categoryId,
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
        title: normalizedInput.title,
        type: normalizedInput.type,
        categoryId: normalizedInput.categoryId,
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
        title: normalizedInput.title,
        type: normalizedInput.type,
        categoryId: normalizedInput.categoryId,
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
