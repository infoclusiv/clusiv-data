export type ItemType = "task" | "note";
export type FlowNodeType = "input" | "process" | "decision" | "output";
export type AppView =
  | "welcome"
  | "category"
  | "board"
  | "logs"
  | "backups"
  | "quick-texts"
  | "search"
  | "flows"
  | "item-editor"
  | "flow-editor";
export type BoardMode = "gallery" | "detail";
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type CategorySection =
  | "overview"
  | "tasks"
  | "notes"
  | "links"
  | "subcategories"
  | "flows";
export interface Link {
  title: string;
  url: string;
  images: ItemImage[];
  comments: string;
}

export interface LinkFormInput {
  title: string;
  url: string;
  images?: ItemImage[];
  comments?: string;
}

export interface QuickText {
  id: string;
  title: string;
  content: string;
  group_ids: string[];
  // Legacy compatibility field. Prefer group_ids for new logic.
  group_id: string | null;
  sort_order: number;
  group_sort_orders: Record<string, number>;
}

export interface QuickTextGroup {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
  id: string;
  title: string;
  comment: string;
  images: ItemImage[];
  type: ItemType;
  done: boolean;
  category_id: string;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  title: string;
  description: string;
  comments: string;
  linked_note_ids: string[];
  position: {
    x: number;
    y: number;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface Flow {
  id: string;
  category_id: string | null;
  title: string;
  comments: string;
  linked_note_ids: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  created_at: string;
  updated_at: string;
}

export interface ItemEditorState {
  editingItem: Item | null;
  editingIndex: number | null;
  initialCategoryId: string | null;
  initialType: ItemType;
  title: string;
}

export interface AppData {
  __SCHEMA_VERSION__: number;
  __SYSTEM_HOME_TEXT__: string;
  __SYSTEM_CATEGORIES__: Record<string, Category>;
  __SYSTEM_TASKS__: Item[];
  __SYSTEM_QUICK_TEXTS__: QuickText[];
  __SYSTEM_QUICK_TEXT_GROUPS__: QuickTextGroup[];
  __SYSTEM_FLOWS__: Flow[];
  __SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__: string[];
  __SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: string[];
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

export interface BackupInfo {
  name: string;
  kind: "manual" | "auto" | "unknown";
  sizeBytes: number;
  modifiedAt: string;
  createdLabel: string;
}

export interface UIState {
  currentCategoryId: string | null;
  currentView: AppView;
  currentBoardMode: BoardMode;
  currentBoardFilterId: string | null;
  currentCategorySection: CategorySection;
  currentFlowId: string | null;
}

export interface NavigationSnapshot {
  view: AppView;
  categoryId: string | null;
  boardMode: BoardMode;
  boardFilterId: string | null;
  categorySection: CategorySection;
  flowId: string | null;
}

export interface CategoryFormInput {
  name: string;
  parentId: string | null;
  icon: string;
}

export interface ItemFormInput {
  id?: string;
  title: string;
  comment: string;
  type: ItemType;
  categoryId: string;
  images?: ItemImage[];
}

export interface QuickTextFormInput {
  title: string;
  content: string;
  group_ids?: string[];
  group_id?: string | null;
}

export interface QuickTextGroupFormInput {
  name: string;
  description: string;
}

export interface FlowNodeInput {
  id?: string;
  type?: FlowNodeType;
  title?: string;
  description?: string;
  comments?: string;
  linked_note_ids?: string[];
  position?: {
    x?: number;
    y?: number;
  };
}

export interface FlowEdgeInput {
  id?: string;
  source?: string;
  target?: string;
  label?: string;
}

export interface CreateFlowInput {
  categoryId: string | null;
  title?: string;
  comments?: string;
  linked_note_ids?: string[];
  nodes?: FlowNodeInput[];
  edges?: FlowEdgeInput[];
}

export interface UpdateFlowInput {
  categoryId?: string | null;
  title?: string;
  comments?: string;
  linked_note_ids?: string[];
  nodes?: FlowNodeInput[];
  edges?: FlowEdgeInput[];
}
