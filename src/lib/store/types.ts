export type ItemType = "task" | "note";
export type AppView = "welcome" | "category" | "board" | "logs" | "quick-texts" | "search" | "ai-assistant";
export type BoardMode = "gallery" | "detail";
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type AiProvider = "nvidia";
export type AiChatRole = "user" | "assistant";
export type AiChatMessageStatus = "done" | "streaming" | "error";
export type AiKnowledgeEntryType = "category" | "note" | "task" | "link" | "quick-text";
export type AiChatStreamEventKind = "started" | "delta" | "complete" | "error";

export interface AiFloatParameterProfile {
  defaultValue: number;
  min: number;
  max: number | null;
  step: number;
}

export interface AiIntegerParameterProfile {
  defaultValue: number;
  min: number;
  max: number | null;
  step: number;
}

export interface AiModelProfile {
  key: string;
  label: string;
  description: string;
  isKnown: boolean;
  temperature: AiFloatParameterProfile;
  topP: AiFloatParameterProfile;
  maxTokens: AiIntegerParameterProfile;
}

export interface Link {
  title: string;
  url: string;
}

export interface QuickText {
  id: string;
  title: string;
  content: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string;
  links: Link[];
  notes: string;
}

export interface ItemImage {
  id: string;
  data_url: string;
  name: string;
}

export interface Item {
  title: string;
  comment: string;
  images: ItemImage[];
  type: ItemType;
  done: boolean;
  category_id: string;
}

export interface AppData {
  __SCHEMA_VERSION__: number;
  __SYSTEM_CATEGORIES__: Record<string, Category>;
  __SYSTEM_TASKS__: Item[];
  __SYSTEM_QUICK_TEXTS__: QuickText[];
}

export interface LogStatus {
  sessionId: string;
  sessionStartedAt: string;
  sessionFilePath: string;
  logDirectory: string;
  entryCount: number;
  lastExportPath: string | null;
  appName: string;
  appVersion: string;
  buildProfile: string;
  platform: string;
}

export interface UIState {
  currentCategoryId: string | null;
  currentView: AppView;
  currentBoardMode: BoardMode;
  currentBoardFilterId: string | null;
}

export interface NavigationSnapshot {
  view: AppView;
  categoryId: string | null;
  boardMode: BoardMode;
  boardFilterId: string | null;
}

export interface CategoryFormInput {
  name: string;
  parentId: string | null;
  icon: string;
}

export interface ItemFormInput {
  title: string;
  comment: string;
  type: ItemType;
  categoryId: string;
  images?: ItemImage[];
}

export interface QuickTextFormInput {
  title: string;
  content: string;
}

export interface AiConfig {
  provider: AiProvider;
  apiBase: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  hasApiKey: boolean;
  apiKeyMask: string | null;
  availableProfiles: AiModelProfile[];
  activeModelProfile: AiModelProfile;
}

export interface AiConfigInput {
  provider: AiProvider;
  apiBase: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  apiKey?: string;
}

export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  createdAt: string;
  status: AiChatMessageStatus;
  requestId: string | null;
}

export interface AiKnowledgeSummary {
  categoryCount: number;
  itemCount: number;
  linkCount: number;
  quickTextCount: number;
  evidenceCount: number;
}

export interface AiCategoryOutlineEntry {
  id: string;
  name: string;
  breadcrumb: string;
  depth: number;
  childCount: number;
  itemCount: number;
  linkCount: number;
  notesPreview: string;
}

export interface AiKnowledgeEntry {
  id: string;
  type: AiKnowledgeEntryType;
  title: string;
  breadcrumb: string;
  preview: string;
  score: number;
  content: string;
}

export interface AiKnowledgeContext {
  query: string;
  summary: AiKnowledgeSummary;
  hierarchyOutline: AiCategoryOutlineEntry[];
  activeCategory: AiKnowledgeEntry | null;
  evidence: AiKnowledgeEntry[];
}

export interface AiChatRequestMessage {
  role: AiChatRole;
  content: string;
}

export interface AiChatRequest {
  requestId: string;
  messages: AiChatRequestMessage[];
  context: AiKnowledgeContext;
}

export interface AiChatStreamEvent {
  requestId: string;
  kind: AiChatStreamEventKind;
  delta?: string;
  message?: string;
}