export type ItemType = "task" | "note";
export type AppView = "welcome" | "category" | "board" | "logs" | "quick-texts" | "search";
export type BoardMode = "gallery" | "detail";
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

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
