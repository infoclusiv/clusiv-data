# Plan de Migración: Clusiv Data
## Flet (Python) → Tauri 2.0 + Svelte 5 + Tailwind CSS

> **Propósito:** Guía exhaustiva para que un agente de IA ejecute la migración completa de Clusiv Data. Cada fase debe completarse en orden antes de pasar a la siguiente.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Shell nativo | Tauri | 2.x |
| Backend | Rust | stable (≥ 1.77) |
| Frontend framework | Svelte | 5.x (runes) |
| Build tool | Vite | 5.x |
| Estilos | Tailwind CSS | 3.x |
| Lenguaje frontend | TypeScript | 5.x |
| Iconos | lucide-svelte | latest |
| Serialización | serde + serde_json | 1.x |

---

## Estructura de archivos objetivo

```
clusiv-data/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── data.rs          # load_data, save_data
│   │   │   ├── backup.rs        # create_backup, cleanup_old_backups
│   │   │   └── shell.rs         # open_url
│   │   └── models/
│   │       ├── mod.rs
│   │       ├── app_data.rs      # AppData raíz
│   │       ├── category.rs      # Category, CategoryType, Link
│   │       └── item.rs          # Item, ItemType
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── app.css                  # Directivas Tailwind
│   ├── main.ts                  # Entry point Vite
│   ├── App.svelte               # Componente raíz
│   ├── lib/
│   │   ├── store/
│   │   │   ├── appState.svelte.ts   # Estado global con runes ($state)
│   │   │   └── types.ts             # Interfaces TypeScript del dominio
│   │   ├── utils/
│   │   │   ├── constants.ts         # Puerto de config.py
│   │   │   └── categoryUtils.ts     # Puerto de category_utils.py
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.svelte
│   │   │   │   └── NavRail.svelte
│   │   │   ├── dialogs/
│   │   │   │   ├── CategoryDialog.svelte
│   │   │   │   ├── ItemDialog.svelte
│   │   │   │   ├── LinkDialog.svelte
│   │   │   │   ├── BulkImportDialog.svelte
│   │   │   │   └── ConfirmDialog.svelte
│   │   │   ├── cards/
│   │   │   │   ├── LinkCard.svelte
│   │   │   │   ├── NoteCard.svelte
│   │   │   │   ├── TaskCard.svelte
│   │   │   │   └── SubcategoryCard.svelte
│   │   │   └── ui/
│   │   │       ├── Button.svelte    # Botón base reutilizable
│   │   │       ├── Input.svelte     # Input base reutilizable
│   │   │       ├── Select.svelte    # Select base reutilizable
│   │   │       ├── Modal.svelte     # Wrapper modal base
│   │   │       ├── Snackbar.svelte  # Notificaciones toast
│   │   │       └── IconButton.svelte
│   │   └── views/
│   │       ├── WelcomeView.svelte
│   │       ├── LinksView.svelte
│   │       ├── NotebookView.svelte
│   │       └── BoardView.svelte
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.ts
```

---

## Fase 1 — Scaffolding del proyecto

### 1.1 Crear el proyecto base

```bash
npm create tauri-app@latest clusiv-data -- --template svelte-ts
cd clusiv-data
```

### 1.2 Instalar dependencias frontend

```bash
npm install -D tailwindcss postcss autoprefixer
npm install lucide-svelte
npx tailwindcss init -p
```

### 1.3 Configurar `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,ts,js}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta central de la app — ajustar a gusto
        brand: {
          50:  "#f0fdfa",
          100: "#ccfbf1",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
        },
      },
      fontFamily: {
        sans: ["Inter Variable", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
```

### 1.4 Configurar `src/app.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Variables CSS globales para coherencia visual */
@layer base {
  :root {
    --sidebar-width: 13rem;
  }

  body {
    @apply bg-white text-gray-900 antialiased select-none;
  }

  /* Scrollbar personalizado */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { @apply bg-transparent; }
  ::-webkit-scrollbar-thumb { @apply bg-gray-300 rounded-full; }
  ::-webkit-scrollbar-thumb:hover { @apply bg-gray-400; }
}

@layer components {
  /* Clases utilitarias reutilizables de la app */
  .card {
    @apply bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow;
  }
  .card-note {
    @apply bg-amber-50 rounded-xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow;
  }
  .card-task-done {
    @apply bg-green-50 rounded-xl border border-green-100 shadow-sm opacity-70;
  }
  .btn-primary {
    @apply bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg
           text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-ghost {
    @apply text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm
           font-medium transition-colors;
  }
  .btn-danger {
    @apply text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm
           font-medium transition-colors;
  }
  .input-base {
    @apply w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
           focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
           placeholder-gray-400 bg-white;
  }
  .input-error {
    @apply border-red-400 focus:ring-red-400;
  }
  .nav-item {
    @apply flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700
           hover:bg-teal-50 hover:text-teal-800 cursor-pointer transition-colors
           w-full text-left;
  }
  .nav-item-active {
    @apply bg-teal-100 text-teal-800 font-medium;
  }
}
```

### 1.5 Configurar `tauri.conf.json`

```json
{
  "productName": "Clusiv Data",
  "version": "1.0.0",
  "identifier": "clusiv.data.app.v1",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Clusiv Data",
        "width": 1100,
        "height": 750,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "decorations": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.png"]
  },
  "plugins": {
    "shell": {
      "open": true
    }
  }
}
```

### 1.6 Configurar `Cargo.toml`

```toml
[package]
name = "clusiv-data"
version = "1.0.0"
edition = "2021"

[lib]
name = "clusiv_data_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4"] }

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

### 1.7 Configurar `vite.config.ts`

```ts
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/vite-plugin-svelte";  // o svelte() si no usas SvelteKit

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
```

---

## Fase 2 — Modelos Rust

### 2.1 `src-tauri/src/models/category.rs`

Puerto directo de las estructuras en `config.py` y `core/category_utils.py`.

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum CategoryType {
    #[default]
    Niche,
    Notebook,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Link {
    pub title: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    #[serde(default = "default_icon")]
    pub icon: String,
    #[serde(rename = "type", default)]
    pub category_type: CategoryType,
    #[serde(default)]
    pub links: Vec<Link>,
    #[serde(default)]
    pub notes: String,
}

fn default_icon() -> String {
    "Carpeta".to_string()
}
```

### 2.2 `src-tauri/src/models/item.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum ItemType {
    #[default]
    Task,
    Note,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub title: String,
    #[serde(default)]
    pub comment: String,
    #[serde(rename = "type", default)]
    pub item_type: ItemType,
    #[serde(default)]
    pub done: bool,
    pub category_id: String,
}
```

### 2.3 `src-tauri/src/models/app_data.rs`

```rust
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use super::{Category, Item};

pub const GENERAL_CATEGORY_ID: &str = "general";
pub const GENERAL_CATEGORY_NAME: &str = "General";
pub const SCHEMA_VERSION: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    #[serde(rename = "__SCHEMA_VERSION__", default)]
    pub schema_version: u32,
    #[serde(rename = "__SYSTEM_CATEGORIES__", default)]
    pub categories: HashMap<String, Category>,
    #[serde(rename = "__SYSTEM_TASKS__", default)]
    pub tasks: Vec<Item>,
}

impl AppData {
    pub fn default_data() -> Self {
        let mut categories = HashMap::new();
        categories.insert(
            GENERAL_CATEGORY_ID.to_string(),
            Category {
                id: GENERAL_CATEGORY_ID.to_string(),
                name: GENERAL_CATEGORY_NAME.to_string(),
                parent_id: None,
                icon: "Carpeta".to_string(),
                category_type: super::CategoryType::Niche,
                links: vec![],
                notes: String::new(),
            },
        );
        Self {
            schema_version: SCHEMA_VERSION,
            categories,
            tasks: vec![],
        }
    }
}
```

### 2.4 `src-tauri/src/models/mod.rs`

```rust
pub mod app_data;
pub mod category;
pub mod item;

pub use app_data::{AppData, GENERAL_CATEGORY_ID, GENERAL_CATEGORY_NAME, SCHEMA_VERSION};
pub use category::{Category, CategoryType, Link};
pub use item::{Item, ItemType};
```

---

## Fase 3 — Comandos Rust

### 3.1 `src-tauri/src/commands/data.rs`

Puerto completo de `core/data_manager.py`. Implementar cada método:

```rust
use std::path::PathBuf;
use std::collections::HashMap;
use tauri::command;
use uuid::Uuid;
use crate::models::*;

// Equivale a config.DATA_FILE — busca data.json junto al ejecutable
fn get_data_path() -> PathBuf {
    std::env::current_exe()
        .unwrap_or_default()
        .parent()
        .unwrap_or(&PathBuf::from("."))
        .join("data.json")
}

// Puerto de DataManager.load_data()
#[command]
pub fn load_data() -> Result<AppData, String> {
    let path = get_data_path();
    if !path.exists() {
        return Ok(AppData::default_data());
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| e.to_string())?;
    let raw: serde_json::Value = serde_json::from_str(&content)
        .map_err(|_| "JSON inválido".to_string())?;
    let (data, _changed) = normalize_data(raw);
    Ok(data)
}

// Puerto de DataManager.save_data()
#[command]
pub fn save_data(data: AppData) -> Result<(), String> {
    let path = get_data_path();
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())
}

// Puerto de DataManager._normalize_data()
// Retorna (AppData normalizada, bool indicando si hubo cambios)
fn normalize_data(raw: serde_json::Value) -> (AppData, bool) {
    // 1. Si no es objeto o no tiene __SYSTEM_CATEGORIES__, migrar desde legacy
    // 2. Asegurar que GENERAL_CATEGORY_ID existe en categories
    // 3. Para cada category: setdefault icon, type, links, notes, parent_id
    //    - Si parent_id no existe en categories → asignar GENERAL_CATEGORY_ID
    // 4. Para cada task: si category_id no existe en categories → GENERAL_CATEGORY_ID
    // 5. Actualizar schema_version a SCHEMA_VERSION
    // Ver implementación detallada abajo
    todo!()
}

// Puerto de DataManager._migrate_legacy_data()
fn migrate_legacy_data(raw: serde_json::Value) -> AppData {
    // Convierte formato anterior (categorías como claves top-level del JSON)
    // al formato con __SYSTEM_CATEGORIES__ y __SYSTEM_TASKS__
    // Ver lógica completa en core/data_manager.py líneas 60-110
    todo!()
}

// Puerto de generate_category_id() de category_utils.py
pub fn generate_unique_category_id(existing_ids: &std::collections::HashSet<String>) -> String {
    loop {
        let id = format!("cat_{}", &Uuid::new_v4().to_string().replace("-", "")[..10]);
        if !existing_ids.contains(&id) {
            return id;
        }
    }
}
```

> **Nota para el agente:** Implementar `normalize_data` y `migrate_legacy_data` con lógica idéntica a `DataManager._normalize_data()` y `DataManager._migrate_legacy_data()` en Python. Es la parte más delicada de la migración — un error aquí puede corromper datos del usuario.

### 3.2 `src-tauri/src/commands/backup.rs`

Puerto completo de `core/backup_manager.py`:

```rust
use std::path::PathBuf;
use chrono::Local;
use tauri::command;

fn get_backup_dir() -> PathBuf {
    std::env::current_exe()
        .unwrap_or_default()
        .parent()
        .unwrap_or(&PathBuf::from("."))
        .join("backups")
}

fn get_data_path() -> PathBuf {
    std::env::current_exe()
        .unwrap_or_default()
        .parent()
        .unwrap_or(&PathBuf::from("."))
        .join("data.json")
}

// Puerto de BackupManager.create_backup()
#[command]
pub fn create_backup(manual: bool) -> Result<String, String> {
    let data_path = get_data_path();
    if !data_path.exists() {
        return Err("No hay datos para respaldar.".to_string());
    }
    let backup_dir = get_backup_dir();
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S");
    let prefix = if manual { "manual_" } else { "auto_" };
    let backup_name = format!("backup_{}{}.json", prefix, timestamp);
    let backup_path = backup_dir.join(&backup_name);

    std::fs::copy(&data_path, &backup_path).map_err(|e| e.to_string())?;
    cleanup_old_backups(5);
    Ok(format!("Backup creado: {}", backup_name))
}

// Puerto de BackupManager.cleanup_old_backups()
fn cleanup_old_backups(max_backups: usize) {
    let backup_dir = get_backup_dir();
    let Ok(entries) = std::fs::read_dir(&backup_dir) else { return };

    let mut files: Vec<(PathBuf, std::time::SystemTime)> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |x| x == "json"))
        .filter_map(|e| {
            let path = e.path();
            let mtime = e.metadata().ok()?.modified().ok()?;
            Some((path, mtime))
        })
        .collect();

    // Ordenar del más reciente al más antiguo
    files.sort_by(|a, b| b.1.cmp(&a.1));

    // Eliminar los que exceden el máximo
    for (path, _) in files.iter().skip(max_backups) {
        let _ = std::fs::remove_file(path);
    }
}
```

### 3.3 `src-tauri/src/commands/shell.rs`

```rust
use tauri::command;
use tauri_plugin_shell::ShellExt;

#[command]
pub async fn open_url(url: String, app: tauri::AppHandle) -> Result<(), String> {
    app.shell()
        .open(&url, None)
        .map_err(|e| e.to_string())
}
```

### 3.4 `src-tauri/src/commands/mod.rs`

```rust
pub mod backup;
pub mod data;
pub mod shell;
```

### 3.5 `src-tauri/src/lib.rs`

```rust
mod commands;
mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::data::load_data,
            commands::data::save_data,
            commands::backup::create_backup,
            commands::shell::open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3.6 `src-tauri/src/main.rs`

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    clusiv_data_lib::run();
}
```

---

## Fase 4 — Tipos y utilidades TypeScript

### 4.1 `src/lib/store/types.ts`

```typescript
export type CategoryType = "niche" | "notebook";
export type ItemType = "task" | "note";

export interface Link {
  title: string;
  url: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string;
  type: CategoryType;
  links: Link[];
  notes: string;
}

export interface Item {
  title: string;
  comment: string;
  type: ItemType;
  done: boolean;
  category_id: string;
}

export interface AppData {
  __SCHEMA_VERSION__: number;
  __SYSTEM_CATEGORIES__: Record<string, Category>;
  __SYSTEM_TASKS__: Item[];
}

// Estado de la UI — equivale a AppState en state/app_state.py
export interface UIState {
  currentCategoryId: string | null;
  currentView: "welcome" | "category" | "board";
  currentBoardMode: "gallery" | "detail";
  currentBoardFilterId: string | null;
}
```

### 4.2 `src/lib/utils/constants.ts`

Puerto directo de `config.py`:

```typescript
export const GENERAL_CATEGORY_ID = "general";
export const GENERAL_CATEGORY_NAME = "General";
export const ROOT_CATEGORY_OPTION = "__ROOT_CATEGORY__";
export const CATEGORY_TYPE_NICHE = "niche";
export const CATEGORY_TYPE_NOTEBOOK = "notebook";
export const SCHEMA_VERSION = 2;

// Mapeo de claves de icono a nombres de componentes de lucide-svelte
// Equivale a ICON_MAP en config.py
export const ICON_KEYS = [
  "Carpeta", "Trabajo", "Casa", "Escuela", "Código",
  "Juegos", "Música", "Video", "Favorito", "Dinero",
  "Viajes", "Compras", "Ideas",
] as const;

export type IconKey = typeof ICON_KEYS[number];
```

### 4.3 `src/lib/utils/categoryUtils.ts`

Puerto **completo y fiel** de `core/category_utils.py`. Implementar cada función:

```typescript
import { GENERAL_CATEGORY_ID, GENERAL_CATEGORY_NAME, ROOT_CATEGORY_OPTION } from "./constants";
import type { AppData, Category, Item } from "../store/types";

// --- Accesores básicos ---

export function getCategoryMap(appData: AppData): Record<string, Category> {
  // Puerto de get_category_map()
  // Asegurar que GENERAL_CATEGORY_ID existe
  return appData.__SYSTEM_CATEGORIES__;
}

export function getTasks(appData: AppData): Item[] {
  return appData.__SYSTEM_TASKS__;
}

export function getCategory(appData: AppData, categoryId: string | null): Category | null {
  // Puerto de get_category()
  if (!categoryId) return null;
  return appData.__SYSTEM_CATEGORIES__[categoryId] ?? null;
}

export function getItemCategoryId(item: Item): string {
  // Puerto de get_item_category_id()
  return item.category_id || GENERAL_CATEGORY_ID;
}

// --- Generación de IDs ---

export function generateCategoryId(appData: AppData): string {
  // Puerto de generate_category_id()
  // Usar crypto.randomUUID() o similar, prefijo "cat_", garantizar unicidad
  const existing = new Set(Object.keys(appData.__SYSTEM_CATEGORIES__));
  while (true) {
    const candidate = `cat_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    if (!existing.has(candidate)) return candidate;
  }
}

// --- Consultas del árbol ---

function categorySortKey(category: Category): [number, string, string] {
  // Puerto de _category_sort_key()
  const isGeneral = category.id === GENERAL_CATEGORY_ID ? 0 : 1;
  return [isGeneral, category.name.toLowerCase(), category.id];
}

export function getRootCategories(appData: AppData): Category[] {
  // Puerto de get_root_categories()
  return Object.values(appData.__SYSTEM_CATEGORIES__)
    .filter(c => c.parent_id === null)
    .sort((a, b) => {
      const ka = categorySortKey(a);
      const kb = categorySortKey(b);
      for (let i = 0; i < ka.length; i++) {
        if (ka[i] < kb[i]) return -1;
        if (ka[i] > kb[i]) return 1;
      }
      return 0;
    });
}

export function getChildCategories(appData: AppData, parentId: string | null): Category[] {
  // Puerto de get_child_categories()
  return Object.values(appData.__SYSTEM_CATEGORIES__)
    .filter(c => c.parent_id === parentId)
    .sort((a, b) => {
      const ka = categorySortKey(a);
      const kb = categorySortKey(b);
      for (let i = 0; i < ka.length; i++) {
        if (ka[i] < kb[i]) return -1;
        if (ka[i] > kb[i]) return 1;
      }
      return 0;
    });
}

export function getFlatCategoryEntries(appData: AppData): Array<[Category, number]> {
  // Puerto de get_flat_category_entries()
  const entries: Array<[Category, number]> = [];
  function walk(parentId: string | null, depth: number) {
    for (const category of getChildCategories(appData, parentId)) {
      entries.push([category, depth]);
      walk(category.id, depth + 1);
    }
  }
  walk(null, 0);
  return entries;
}

export function getDescendantIds(appData: AppData, categoryId: string): Set<string> {
  // Puerto de get_descendant_ids()
  const descendants = new Set<string>();
  for (const child of getChildCategories(appData, categoryId)) {
    descendants.add(child.id);
    for (const id of getDescendantIds(appData, child.id)) {
      descendants.add(id);
    }
  }
  return descendants;
}

// --- Validaciones ---

export function categoryHasChildren(appData: AppData, categoryId: string): boolean {
  // Puerto de category_has_children()
  return Object.values(appData.__SYSTEM_CATEGORIES__)
    .some(c => c.parent_id === categoryId);
}

export function wouldCreateCycle(
  appData: AppData,
  categoryId: string,
  newParentId: string | null,
): boolean {
  // Puerto de would_create_cycle()
  if (!newParentId) return false;
  if (categoryId === newParentId) return true;
  return getDescendantIds(appData, categoryId).has(newParentId);
}

export function isNameTakenUnderParent(
  appData: AppData,
  name: string,
  parentId: string | null,
  excludeCategoryId?: string | null,
): boolean {
  // Puerto de is_name_taken_under_parent()
  const normalized = name.trim().toLowerCase();
  return getChildCategories(appData, parentId).some(c => {
    if (c.id === excludeCategoryId) return false;
    return c.name.trim().toLowerCase() === normalized;
  });
}

// --- Breadcrumb y opciones ---

export function getCategoryBreadcrumb(
  appData: AppData,
  categoryId: string | null,
  includeGeneral = true,
): string {
  // Puerto de get_category_breadcrumb()
  if (!categoryId) return GENERAL_CATEGORY_NAME;
  const parts: string[] = [];
  const seen = new Set<string>();
  let current = getCategory(appData, categoryId);
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    if (includeGeneral || current.id !== GENERAL_CATEGORY_ID) {
      parts.unshift(current.name);
    }
    current = current.parent_id ? getCategory(appData, current.parent_id) : null;
  }
  return parts.length > 0 ? parts.join(" / ") : GENERAL_CATEGORY_NAME;
}

export function getAvailableParentEntries(
  appData: AppData,
  editingCategoryId?: string | null,
): Array<[string, string]> {
  // Puerto de get_available_parent_entries()
  const excluded = new Set<string>();
  if (editingCategoryId) {
    excluded.add(editingCategoryId);
    for (const id of getDescendantIds(appData, editingCategoryId)) {
      excluded.add(id);
    }
  }
  return getFlatCategoryEntries(appData)
    .filter(([c]) => !excluded.has(c.id))
    .map(([c]) => [c.id, getCategoryBreadcrumb(appData, c.id)]);
}

export function getCategoryOptions(appData: AppData): Array<[string, string]> {
  // Puerto de get_category_options()
  return getFlatCategoryEntries(appData)
    .map(([c]) => [c.id, getCategoryBreadcrumb(appData, c.id)]);
}

// --- Constructor ---

export function buildCategoryRecord(
  categoryId: string,
  name: string,
  parentId: string | null,
  icon = "Carpeta",
  categoryType = "niche" as const,
  links: Array<{ title: string; url: string }> = [],
  notes = "",
): import("../store/types").Category {
  // Puerto de build_category_record()
  return { id: categoryId, name, parent_id: parentId, icon, type: categoryType, links, notes };
}
```

---

## Fase 5 — Estado global con Svelte 5 Runes

### `src/lib/store/appState.svelte.ts`

En Svelte 5 el estado reactivo se maneja con runes directamente en archivos `.svelte.ts`. No se necesita Zustand ni stores de Svelte 4.

```typescript
import { invoke } from "@tauri-apps/api/core";
import type { AppData, Item, Category } from "./types";
import {
  getCategory,
  getFlatCategoryEntries,
  getChildCategories,
} from "../utils/categoryUtils";
import { GENERAL_CATEGORY_ID } from "../utils/constants";

// Estado principal de la aplicación
export const appState = $state({
  // Datos persistidos
  appData: null as AppData | null,

  // Navegación
  currentCategoryId: null as string | null,
  currentView: "welcome" as "welcome" | "category" | "board",
  currentBoardMode: "gallery" as "gallery" | "detail",
  currentBoardFilterId: null as string | null,

  // Estado temporal de edición
  editingItemObj: null as Item | null,
  editingCategoryId: null as string | null,
});

// Datos derivados — equivalen a propiedades computadas
export const currentCategory = $derived(
  appState.appData && appState.currentCategoryId
    ? getCategory(appState.appData, appState.currentCategoryId)
    : null
);

export const navCategories = $derived(
  appState.appData ? getFlatCategoryEntries(appState.appData) : []
);

// Acciones — equivalen a los métodos de AppState + handlers de Python

export async function loadAppData(): Promise<void> {
  const data = await invoke<AppData>("load_data");
  appState.appData = data;
}

export async function persistData(): Promise<void> {
  if (!appState.appData) return;
  await invoke("save_data", { data: appState.appData });
}

export async function createBackup(manual: boolean): Promise<string> {
  return await invoke<string>("create_backup", { manual });
}

export async function openUrl(url: string): Promise<void> {
  await invoke("open_url", { url });
}

export function selectCategory(categoryId: string): void {
  appState.currentCategoryId = categoryId;
  appState.currentView = "category";
  appState.currentBoardFilterId = null;
}

export function showBoard(mode: "gallery" | "detail", filterId?: string | null): void {
  appState.currentView = "board";
  appState.currentBoardMode = mode;
  appState.currentBoardFilterId = filterId ?? null;
}
```

> **Nota para el agente:** El archivo usa la extensión `.svelte.ts` para que el compilador de Svelte 5 procese las runes (`$state`, `$derived`). Sin esa extensión, las runes no funcionan en archivos `.ts` normales.

---

## Fase 6 — Componentes UI base (`src/lib/components/ui/`)

Estos son los primitivos reutilizables que reemplazan los widgets de Flet. Construirlos primero facilita el trabajo en las fases siguientes.

### 6.1 `Modal.svelte`

Reemplaza `ft.AlertDialog`. Manejar: backdrop click, tecla Escape, focus trap.

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    open: boolean;
    title: string;
    onclose: () => void;
    children: Snippet;
    actions: Snippet;
    width?: string;
  }

  let { open, title, onclose, children, actions, width = "max-w-md" }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onclose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    onkeydown={handleKeydown}
    onclick={(e) => e.target === e.currentTarget && onclose()}
  >
    <div class="bg-white rounded-2xl shadow-xl w-full {width} mx-4 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div class="px-6 py-4">
        {@render children()}
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
        {@render actions()}
      </div>
    </div>
  </div>
{/if}
```

### 6.2 `ConfirmDialog.svelte`

Reemplaza los `dlg_confirm_*` de `AppDialogs`.

```svelte
<script lang="ts">
  import Modal from "./Modal.svelte";

  interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let {
    open, title, message,
    confirmLabel = "Sí, eliminar",
    onconfirm, oncancel,
  }: Props = $props();
</script>

<Modal {open} {title} onclose={oncancel}>
  {#snippet children()}
    <p class="text-sm text-gray-600">{message}</p>
  {/snippet}
  {#snippet actions()}
    <button class="btn-ghost" onclick={oncancel}>Cancelar</button>
    <button class="btn-danger" onclick={onconfirm}>{confirmLabel}</button>
  {/snippet}
</Modal>
```

### 6.3 `Snackbar.svelte`

Reemplaza `ft.SnackBar`. Sistema de notificaciones toast global.

```svelte
<script lang="ts" module>
  // Estado compartido del snackbar — accesible desde cualquier componente
  let message = $state("");
  let color = $state<"default" | "success" | "error">("default");
  let visible = $state(false);
  let timer: ReturnType<typeof setTimeout>;

  export function showSnackbar(
    msg: string,
    type: "default" | "success" | "error" = "default",
    duration = 3000,
  ) {
    clearTimeout(timer);
    message = msg;
    color = type;
    visible = true;
    timer = setTimeout(() => { visible = false; }, duration);
  }
</script>

{#if visible}
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl
           shadow-lg text-sm font-medium transition-all
           {color === 'success' ? 'bg-teal-700 text-white' :
            color === 'error'   ? 'bg-red-600 text-white' :
                                  'bg-gray-800 text-white'}"
  >
    {message}
  </div>
{/if}
```

### 6.4 `Button.svelte`

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    variant?: "primary" | "ghost" | "danger";
    disabled?: boolean;
    onclick?: () => void;
    children: Snippet;
    type?: "button" | "submit";
  }

  let {
    variant = "ghost", disabled = false,
    onclick, children, type = "button",
  }: Props = $props();

  const classes = {
    primary: "btn-primary",
    ghost:   "btn-ghost",
    danger:  "btn-danger",
  };
</script>

<button
  {type}
  {disabled}
  {onclick}
  class={classes[variant]}
>
  {@render children()}
</button>
```

### 6.5 `Input.svelte`

```svelte
<script lang="ts">
  interface Props {
    label: string;
    value: string;
    error?: string | null;
    multiline?: boolean;
    rows?: number;
    placeholder?: string;
    disabled?: boolean;
    autofocus?: boolean;
  }

  let {
    label, value = $bindable(""), error = null,
    multiline = false, rows = 3,
    placeholder = "", disabled = false, autofocus = false,
  }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">
    {label}
  </label>
  {#if multiline}
    <textarea
      bind:value
      {rows}
      {placeholder}
      {disabled}
      class="input-base resize-none {error ? 'input-error' : ''}"
    ></textarea>
  {:else}
    <input
      bind:value
      type="text"
      {placeholder}
      {disabled}
      {autofocus}
      class="input-base {error ? 'input-error' : ''}"
    />
  {/if}
  {#if error}
    <p class="text-xs text-red-500">{error}</p>
  {/if}
</div>
```

### 6.6 `Select.svelte`

```svelte
<script lang="ts">
  interface Option { value: string; label: string; }

  interface Props {
    label: string;
    value: string;
    options: Option[];
    error?: string | null;
    disabled?: boolean;
  }

  let {
    label, value = $bindable(""),
    options, error = null, disabled = false,
  }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">
    {label}
  </label>
  <select
    bind:value
    {disabled}
    class="input-base {error ? 'input-error' : ''}"
  >
    {#each options as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
  {#if error}
    <p class="text-xs text-red-500">{error}</p>
  {/if}
</div>
```

---

## Fase 7 — Mapeo de iconos Flet → lucide-svelte

Instalar: `npm install lucide-svelte`

| Flet Icon | Componente lucide-svelte |
|---|---|
| `ft.Icons.FOLDER` | `<Folder />` |
| `ft.Icons.WORK` | `<Briefcase />` |
| `ft.Icons.HOME` | `<Home />` |
| `ft.Icons.SCHOOL` | `<GraduationCap />` |
| `ft.Icons.CODE` | `<Code2 />` |
| `ft.Icons.GAMES` | `<Gamepad2 />` |
| `ft.Icons.MUSIC_NOTE` | `<Music />` |
| `ft.Icons.VIDEO_LIBRARY` | `<Video />` |
| `ft.Icons.STAR` | `<Star />` |
| `ft.Icons.ATTACH_MONEY` | `<DollarSign />` |
| `ft.Icons.FLIGHT` | `<Plane />` |
| `ft.Icons.SHOPPING_CART` | `<ShoppingCart />` |
| `ft.Icons.LIGHTBULB` | `<Lightbulb />` |
| `ft.Icons.BOOK` | `<BookOpen />` |
| `ft.Icons.NOTE` | `<StickyNote />` |
| `ft.Icons.CHECK_CIRCLE` | `<CheckCircle />` |
| `ft.Icons.ADD` | `<Plus />` |
| `ft.Icons.DELETE` | `<Trash2 />` |
| `ft.Icons.EDIT` | `<Pencil />` |
| `ft.Icons.LINK` | `<Link />` |
| `ft.Icons.OPEN_IN_NEW` | `<ExternalLink />` |
| `ft.Icons.ROCKET_LAUNCH` | `<Rocket />` |
| `ft.Icons.ARROW_BACK` | `<ArrowLeft />` |
| `ft.Icons.SAVE_ALT` | `<Download />` |
| `ft.Icons.UPLOAD_FILE` | `<Upload />` |
| `ft.Icons.CHECKLIST_RTL` | `<ListChecks />` |
| `ft.Icons.FOLDER_OPEN` | `<FolderOpen />` |
| `ft.Icons.CHEVRON_RIGHT` | `<ChevronRight />` |
| `ft.Icons.INSERT_COMMENT` | `<MessageSquare />` |
| `ft.Icons.ADD_COMMENT` | `<MessageSquarePlus />` |
| `ft.Icons.INBOX` | `<Inbox />` |
| `ft.Icons.ASSIGNMENT` | `<ClipboardList />` |
| `ft.Icons.DELETE_FOREVER` | `<Trash2 />` |
| `ft.Icons.DELETE_OUTLINE` | `<Trash2 />` |

### Helper `getIconComponent.ts`

```typescript
// src/lib/utils/getIconComponent.ts
// Retorna el componente Svelte correspondiente a una clave de icono
import {
  Folder, Briefcase, Home, GraduationCap, Code2,
  Gamepad2, Music, Video, Star, DollarSign,
  Plane, ShoppingCart, Lightbulb, BookOpen,
} from "lucide-svelte";
import type { IconKey } from "./constants";

export const ICON_COMPONENTS: Record<IconKey, typeof Folder> = {
  "Carpeta": Folder,
  "Trabajo": Briefcase,
  "Casa": Home,
  "Escuela": GraduationCap,
  "Código": Code2,
  "Juegos": Gamepad2,
  "Música": Music,
  "Video": Video,
  "Favorito": Star,
  "Dinero": DollarSign,
  "Viajes": Plane,
  "Compras": ShoppingCart,
  "Ideas": Lightbulb,
};

export function getIcon(key: IconKey) {
  return ICON_COMPONENTS[key] ?? Folder;
}
```

Uso en Svelte:
```svelte
<script>
  import { getIcon } from "$lib/utils/getIconComponent";
  const Icon = getIcon(category.icon);
</script>

<Icon size={18} class="text-teal-700" />
```

---

## Fase 8 — Tarjetas (`src/lib/components/cards/`)

### 8.1 `LinkCard.svelte`

Puerto de `ui/components/link_card.py`:

```svelte
<script lang="ts">
  import { ExternalLink, Trash2, Link } from "lucide-svelte";
  import type { Link as LinkType } from "$lib/store/types";

  interface Props {
    link: LinkType;
    onopen: (url: string) => void;
    ondelete: (link: LinkType) => void;
  }

  let { link, onopen, ondelete }: Props = $props();
</script>

<div class="card flex items-center gap-3 px-4 py-3 cursor-pointer group"
     onclick={() => onopen(link.url)}
     role="button" tabindex="0"
     onkeydown={(e) => e.key === "Enter" && onopen(link.url)}
>
  <Link size={18} class="text-blue-600 shrink-0" />
  <span class="text-sm font-medium text-gray-800 flex-1 truncate">{link.title}</span>
  <button
    class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-blue-50"
    onclick={(e) => { e.stopPropagation(); onopen(link.url); }}
    title="Abrir"
  >
    <ExternalLink size={16} class="text-gray-500" />
  </button>
  <button
    class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
    onclick={(e) => { e.stopPropagation(); ondelete(link); }}
    title="Borrar"
  >
    <Trash2 size={16} class="text-red-500" />
  </button>
</div>
```

### 8.2 `NoteCard.svelte`

Puerto de `build_note_card()` en `ui/components/board_card.py`:

```svelte
<script lang="ts">
  import { StickyNote, Trash2, MessageSquare } from "lucide-svelte";
  import type { Item } from "$lib/store/types";

  interface Props {
    item: Item;
    onedit: (item: Item) => void;
    ondelete: (item: Item) => void;
    showCategoryLabel?: boolean;
  }

  let { item, onedit, ondelete, showCategoryLabel = true }: Props = $props();
  const hasComment = item.comment.trim().length > 0;
</script>

<div
  class="card-note p-4 cursor-pointer flex flex-col gap-2 min-h-[120px]"
  title={hasComment ? item.comment : "Sin comentarios adicionales"}
  onclick={() => onedit(item)}
  role="button" tabindex="0"
  onkeydown={(e) => e.key === "Enter" && onedit(item)}
>
  <div class="flex items-start gap-2">
    <StickyNote size={16} class="text-amber-700 shrink-0 mt-0.5" />
    <p class="text-sm font-bold text-gray-800 line-clamp-3 flex-1">{item.title}</p>
  </div>
  {#if hasComment}
    <p class="text-xs text-gray-600 line-clamp-4">{item.comment}</p>
  {/if}
  <div class="flex items-center justify-end mt-auto pt-1">
    {#if hasComment}
      <MessageSquare size={14} class="text-teal-500 mr-auto" />
    {/if}
    <button
      class="p-1 rounded hover:bg-red-100 transition-colors"
      onclick={(e) => { e.stopPropagation(); ondelete(item); }}
      title="Borrar"
    >
      <Trash2 size={15} class="text-red-400" />
    </button>
  </div>
</div>
```

### 8.3 `TaskCard.svelte`

Puerto de `build_task_card()` en `ui/components/board_card.py`:

```svelte
<script lang="ts">
  import { Trash2, MessageSquare } from "lucide-svelte";
  import type { Item } from "$lib/store/types";

  interface Props {
    item: Item;
    onedit: (item: Item) => void;
    ondelete: (item: Item) => void;
    ontoggle: (item: Item, done: boolean) => void;
    showCategoryLabel?: boolean;
  }

  let { item, onedit, ondelete, ontoggle, showCategoryLabel = true }: Props = $props();
  const hasComment = item.comment.trim().length > 0;
</script>

<div
  class="{item.done ? 'card-task-done' : 'card'} p-4 cursor-pointer flex flex-col gap-2 min-h-[120px]"
  title={hasComment ? item.comment : "Sin comentarios adicionales"}
  onclick={() => onedit(item)}
  role="button" tabindex="0"
  onkeydown={(e) => e.key === "Enter" && onedit(item)}
>
  <div class="flex items-start gap-2">
    <input
      type="checkbox"
      checked={item.done}
      class="mt-1 accent-teal-600 shrink-0 cursor-pointer"
      onclick={(e) => { e.stopPropagation(); ontoggle(item, (e.target as HTMLInputElement).checked); }}
    />
    <p class="text-sm font-bold text-gray-800 flex-1 line-clamp-3
              {item.done ? 'line-through text-gray-500' : ''}">
      {item.title}
    </p>
  </div>
  {#if hasComment}
    <p class="text-xs text-gray-500 line-clamp-3">{item.comment}</p>
  {/if}
  <div class="flex items-center justify-end mt-auto pt-1">
    {#if hasComment}
      <MessageSquare size={14} class="text-teal-500 mr-auto" />
    {/if}
    <button
      class="p-1 rounded hover:bg-red-100 transition-colors"
      onclick={(e) => { e.stopPropagation(); ondelete(item); }}
      title="Borrar"
    >
      <Trash2 size={15} class="text-red-400" />
    </button>
  </div>
</div>
```

### 8.4 `SubcategoryCard.svelte`

Puerto de `ui/components/subcategory_card.py`:

```svelte
<script lang="ts">
  import { ChevronRight } from "lucide-svelte";
  import type { Component } from "svelte";

  interface Props {
    label: string;
    subtitle: string;
    icon: Component;
    onopen: () => void;
  }

  let { label, subtitle, icon: Icon, onopen }: Props = $props();
</script>

<div
  class="bg-slate-50 border border-slate-200 rounded-xl p-4 w-52 cursor-pointer
         hover:border-teal-300 hover:bg-teal-50 transition-colors group"
  onclick={onopen}
  role="button" tabindex="0"
  onkeydown={(e) => e.key === "Enter" && onopen()}
>
  <div class="flex items-center justify-between mb-2">
    <Icon size={20} class="text-teal-700" />
    <ChevronRight size={16} class="text-gray-400 group-hover:text-teal-600 transition-colors" />
  </div>
  <p class="text-sm font-bold text-gray-800 line-clamp-2">{label}</p>
  <p class="text-xs text-gray-500 line-clamp-2 mt-1">{subtitle}</p>
</div>
```

---

## Fase 9 — Diálogos (`src/lib/components/dialogs/`)

### 9.1 `CategoryDialog.svelte`

Puerto completo del bloque de categorías en `ui/dialogs.py` + lógica de `handlers/category_handlers.py`.

```svelte
<script lang="ts">
  import Modal from "$lib/components/ui/Modal.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { appState, persistData, selectCategory } from "$lib/store/appState.svelte";
  import {
    buildCategoryRecord, generateCategoryId, getAvailableParentEntries,
    wouldCreateCycle, isNameTakenUnderParent, getCategory, getCategoryMap,
  } from "$lib/utils/categoryUtils";
  import { showSnackbar } from "$lib/components/ui/Snackbar.svelte";
  import {
    GENERAL_CATEGORY_ID, GENERAL_CATEGORY_NAME,
    ROOT_CATEGORY_OPTION, CATEGORY_TYPE_NICHE, CATEGORY_TYPE_NOTEBOOK, ICON_KEYS,
  } from "$lib/utils/constants";

  interface Props {
    open: boolean;
    onclose: () => void;
    editingCategoryId?: string | null;
    // Categoría padre pre-seleccionada al abrir (para "Nueva subcategoría")
    initialParentId?: string | null;
  }

  let { open, onclose, editingCategoryId = null, initialParentId = null }: Props = $props();

  // --- Estado local del formulario ---
  let name = $state("");
  let icon = $state("Carpeta");
  let categoryType = $state<"niche" | "notebook">(CATEGORY_TYPE_NICHE);
  let parentId = $state<string>(ROOT_CATEGORY_OPTION);
  let nameError = $state<string | null>(null);
  let parentError = $state<string | null>(null);

  const isEditing = $derived(!!editingCategoryId);
  const isGeneral = $derived(editingCategoryId === GENERAL_CATEGORY_ID);

  // Opciones del selector de padre
  const parentOptions = $derived(
    appState.appData
      ? [
          { value: ROOT_CATEGORY_OPTION, label: "Sin categoría padre (nivel superior)" },
          ...getAvailableParentEntries(appState.appData, editingCategoryId)
            .map(([id, label]) => ({ value: id, label })),
        ]
      : []
  );

  const iconOptions = $derived(
    ICON_KEYS.map((k) => ({ value: k, label: k }))
  );

  // Inicializar formulario cuando se abre el diálogo
  $effect(() => {
    if (!open || !appState.appData) return;
    if (editingCategoryId) {
      const cat = getCategory(appState.appData, editingCategoryId);
      if (!cat) return;
      name = cat.name;
      icon = cat.icon;
      categoryType = cat.type;
      parentId = cat.parent_id ?? ROOT_CATEGORY_OPTION;
    } else {
      name = "";
      icon = "Carpeta";
      categoryType = CATEGORY_TYPE_NICHE;
      parentId = initialParentId ?? ROOT_CATEGORY_OPTION;
    }
    nameError = null;
    parentError = null;
  });

  async function handleSave() {
    if (!appState.appData) return;

    // Equivale a CategoryHandlers.save()
    const trimmedName = isGeneral ? GENERAL_CATEGORY_NAME : name.trim();
    const resolvedParentId = (isGeneral || parentId === ROOT_CATEGORY_OPTION) ? null : parentId;

    // Validaciones
    if (!trimmedName) { nameError = "Requerido"; return; }

    if (editingCategoryId && wouldCreateCycle(appState.appData, editingCategoryId, resolvedParentId)) {
      parentError = "La categoría padre no es válida"; return;
    }

    if (isNameTakenUnderParent(appState.appData, trimmedName, resolvedParentId, editingCategoryId)) {
      nameError = "Ya existe dentro de esa categoría padre"; return;
    }

    // Mutar appData de forma inmutable
    const newData = structuredClone(appState.appData);
    const categories = newData.__SYSTEM_CATEGORIES__;

    if (editingCategoryId) {
      const cat = categories[editingCategoryId];
      cat.icon = icon;
      if (!isGeneral) {
        cat.name = trimmedName;
        cat.parent_id = resolvedParentId;
      }
      appState.currentCategoryId = editingCategoryId;
    } else {
      const newId = generateCategoryId(newData);
      categories[newId] = buildCategoryRecord(newId, trimmedName, resolvedParentId, icon, categoryType);
      appState.currentCategoryId = newId;
    }

    appState.appData = newData;
    await persistData();
    onclose();
  }
</script>

<Modal {open} title={isEditing ? "Editar Categoría" : "Nueva Categoría"} onclose={onclose}>
  {#snippet children()}
    <div class="flex flex-col gap-4">
      {#if !isEditing}
        <!-- Tipo: solo visible al crear -->
        <div>
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo</p>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" bind:group={categoryType} value={CATEGORY_TYPE_NICHE} class="accent-teal-600" />
              Nicho (con enlaces)
            </label>
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" bind:group={categoryType} value={CATEGORY_TYPE_NOTEBOOK} class="accent-teal-600" />
              Bloc de notas
            </label>
          </div>
        </div>
      {:else}
        <p class="text-xs text-gray-400">
          Tipo: {categoryType === CATEGORY_TYPE_NICHE ? "Nicho (con enlaces)" : "Bloc de notas"} (no editable)
        </p>
      {/if}

      <Input label="Nombre" bind:value={name} error={nameError} autofocus={true} disabled={isGeneral} />
      <Select label="Categoría padre" bind:value={parentId} options={parentOptions} error={parentError} disabled={isGeneral} />
      <Select label="Icono" bind:value={icon} options={iconOptions} />
    </div>
  {/snippet}
  {#snippet actions()}
    <button class="btn-ghost" onclick={onclose}>Cancelar</button>
    <button class="btn-primary" onclick={handleSave}>Guardar</button>
  {/snippet}
</Modal>
```

### 9.2 `ItemDialog.svelte`

Puerto del diálogo de ítem + lógica de `handlers/board_handlers.py`:

```svelte
<script lang="ts">
  import Modal from "$lib/components/ui/Modal.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { appState, persistData } from "$lib/store/appState.svelte";
  import { getCategoryOptions, getItemCategoryId } from "$lib/utils/categoryUtils";
  import { GENERAL_CATEGORY_ID } from "$lib/utils/constants";
  import type { Item } from "$lib/store/types";

  interface Props {
    open: boolean;
    onclose: () => void;
    editingItem?: Item | null;
    initialCategoryId?: string | null;
    initialType?: "task" | "note";
  }

  let {
    open, onclose,
    editingItem = null,
    initialCategoryId = null,
    initialType = "task",
  }: Props = $props();

  let title = $state("");
  let comment = $state("");
  let itemType = $state<"task" | "note">("task");
  let categoryId = $state(GENERAL_CATEGORY_ID);
  let titleError = $state<string | null>(null);

  const categoryOptions = $derived(
    appState.appData
      ? getCategoryOptions(appState.appData).map(([id, label]) => ({ value: id, label }))
      : []
  );

  $effect(() => {
    if (!open) return;
    if (editingItem) {
      title = editingItem.title;
      comment = editingItem.comment;
      itemType = editingItem.type;
      categoryId = getItemCategoryId(editingItem);
    } else {
      title = "";
      comment = "";
      itemType = initialType;
      categoryId = initialCategoryId ?? GENERAL_CATEGORY_ID;
    }
    titleError = null;
  });

  async function handleSave() {
    if (!appState.appData) return;
    const trimmed = title.trim();
    if (!trimmed) { titleError = "El título es obligatorio"; return; }

    const newData = structuredClone(appState.appData);

    if (editingItem) {
      // Editar ítem existente — encontrar por referencia en el array
      const idx = newData.__SYSTEM_TASKS__.findIndex(
        (t) => t.title === editingItem!.title &&
               t.category_id === editingItem!.category_id
      );
      if (idx >= 0) {
        newData.__SYSTEM_TASKS__[idx] = {
          ...newData.__SYSTEM_TASKS__[idx],
          title: trimmed, comment: comment.trim(),
          type: itemType, category_id: categoryId,
        };
      }
    } else {
      newData.__SYSTEM_TASKS__.push({
        title: trimmed, comment: comment.trim(),
        type: itemType, done: false, category_id: categoryId,
      });
    }

    appState.appData = newData;
    await persistData();
    onclose();
  }
</script>

<Modal {open} title={editingItem ? "Editar Elemento" : "Nuevo Elemento"} onclose={onclose} width="max-w-lg">
  {#snippet children()}
    <div class="flex flex-col gap-4">
      <div>
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo</p>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" bind:group={itemType} value="task" class="accent-teal-600" />
            Tarea
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" bind:group={itemType} value="note" class="accent-teal-600" />
            Nota
          </label>
        </div>
      </div>
      <Input label="Título" bind:value={title} error={titleError} autofocus={true} />
      <Select label="Categoría" bind:value={categoryId} options={categoryOptions} />
      <Input label="Contenido / Comentario" bind:value={comment} multiline={true} rows={4} />
    </div>
  {/snippet}
  {#snippet actions()}
    <button class="btn-ghost" onclick={onclose}>Cancelar</button>
    <button class="btn-primary" onclick={handleSave}>Guardar</button>
  {/snippet}
</Modal>
```

### 9.3 `LinkDialog.svelte`

Puerto del diálogo de enlace + lógica de `handlers/link_handlers.py`:

```svelte
<script lang="ts">
  import Modal from "$lib/components/ui/Modal.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import { appState, persistData } from "$lib/store/appState.svelte";
  import { getCategory } from "$lib/utils/categoryUtils";

  interface Props {
    open: boolean;
    categoryId: string;
    onclose: () => void;
  }

  let { open, categoryId, onclose }: Props = $props();

  let linkTitle = $state("");
  let linkUrl = $state("");
  let urlError = $state<string | null>(null);

  $effect(() => {
    if (open) { linkTitle = ""; linkUrl = ""; urlError = null; }
  });

  async function handleSave() {
    const url = linkUrl.trim();
    if (!url) { urlError = "URL requerida"; return; }
    if (!appState.appData) return;

    const finalUrl = url.startsWith("http") ? url : `https://${url}`;
    const finalTitle = linkTitle.trim() || finalUrl;

    const newData = structuredClone(appState.appData);
    const cat = newData.__SYSTEM_CATEGORIES__[categoryId];
    if (!cat) return;
    cat.links.push({ title: finalTitle, url: finalUrl });

    appState.appData = newData;
    await persistData();
    onclose();
  }
</script>

<Modal {open} title="Nuevo Enlace" onclose={onclose}>
  {#snippet children()}
    <div class="flex flex-col gap-4">
      <Input label="Título (Opcional)" bind:value={linkTitle} />
      <Input label="URL" bind:value={linkUrl} error={urlError} autofocus={true} />
    </div>
  {/snippet}
  {#snippet actions()}
    <button class="btn-ghost" onclick={onclose}>Cancelar</button>
    <button class="btn-primary" onclick={handleSave}>Guardar</button>
  {/snippet}
</Modal>
```

### 9.4 `BulkImportDialog.svelte`

Puerto de `link_handlers.process_bulk_import()`:

```svelte
<script lang="ts">
  import Modal from "$lib/components/ui/Modal.svelte";
  import { appState, persistData } from "$lib/store/appState.svelte";

  interface Props {
    open: boolean;
    categoryId: string;
    onclose: () => void;
  }

  let { open, categoryId, onclose }: Props = $props();
  let rawText = $state("");

  $effect(() => { if (open) rawText = ""; });

  async function handleProcess() {
    if (!appState.appData || !rawText.trim()) { onclose(); return; }

    const newData = structuredClone(appState.appData);
    const cat = newData.__SYSTEM_CATEGORIES__[categoryId];
    if (!cat) { onclose(); return; }

    for (const line of rawText.split("\n")) {
      const url = line.trim();
      if (!url) continue;
      const finalUrl = url.startsWith("http") ? url : `https://${url}`;
      cat.links.push({ title: finalUrl, url: finalUrl });
    }

    appState.appData = newData;
    await persistData();
    onclose();
  }
</script>

<Modal {open} title="Importar Enlaces" onclose={onclose} width="max-w-lg">
  {#snippet children()}
    <textarea
      bind:value={rawText}
      rows={10}
      placeholder="Pega tus URLs aquí, una por línea..."
      class="input-base resize-none font-mono text-xs"
    ></textarea>
  {/snippet}
  {#snippet actions()}
    <button class="btn-ghost" onclick={onclose}>Cancelar</button>
    <button class="btn-primary" onclick={handleProcess}>Procesar</button>
  {/snippet}
</Modal>
```

---

## Fase 10 — Layout (`src/lib/components/layout/`)

### 10.1 `NavRail.svelte`

Puerto de `ui/nav_rail.py`:

```svelte
<script lang="ts">
  import { appState, selectCategory } from "$lib/store/appState.svelte";
  import { navCategories } from "$lib/store/appState.svelte";
  import { getIcon } from "$lib/utils/getIconComponent";
  import { BookOpen } from "lucide-svelte";
  import { CATEGORY_TYPE_NOTEBOOK } from "$lib/utils/constants";

  interface Props {
    onboardclick: () => void;
  }
  let { onboardclick }: Props = $props();
</script>

<nav class="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
  {#each navCategories as [category, depth]}
    {@const Icon = category.type === CATEGORY_TYPE_NOTEBOOK
      ? BookOpen
      : getIcon(category.icon as any)}
    <button
      class="nav-item {appState.currentCategoryId === category.id && appState.currentView === 'category'
        ? 'nav-item-active' : ''}"
      style="padding-left: {0.75 + depth * 1}rem"
      onclick={() => selectCategory(category.id)}
      title={category.name}
    >
      <Icon size={15} />
      <span class="truncate">{category.name}</span>
    </button>
  {/each}
</nav>
```

### 10.2 `Sidebar.svelte`

Puerto de la columna izquierda de `main.py`:

```svelte
<script lang="ts">
  import { Plus, ListChecks, Download } from "lucide-svelte";
  import NavRail from "./NavRail.svelte";
  import CategoryDialog from "$lib/components/dialogs/CategoryDialog.svelte";
  import { appState, showBoard, createBackup } from "$lib/store/appState.svelte";
  import { showSnackbar } from "$lib/components/ui/Snackbar.svelte";

  let showCategoryDialog = $state(false);

  async function handleBackup() {
    try {
      const msg = await createBackup(true);
      showSnackbar("✅ " + msg, "success");
    } catch (e) {
      showSnackbar("❌ Error al crear backup", "error");
    }
  }

  function handleBoardClick() {
    appState.currentCategoryId = null;
    showBoard("gallery");
  }
</script>

<aside class="w-[var(--sidebar-width)] flex flex-col border-r border-gray-100 bg-gray-50 shrink-0">
  <!-- Botón Notas y Tareas -->
  <div class="px-3 pt-4 pb-2">
    <button
      class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
             text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      onclick={handleBoardClick}
    >
      <ListChecks size={16} />
      Notas y Tareas
    </button>
  </div>

  <!-- Botón Nueva Categoría -->
  <div class="px-3 pb-2">
    <button
      class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
             text-gray-700 hover:bg-gray-200 transition-colors"
      onclick={() => showCategoryDialog = true}
    >
      <Plus size={16} />
      Nueva Categoría
    </button>
  </div>

  <div class="h-px bg-gray-200 mx-3 mb-1" />

  <!-- NavRail con scroll -->
  <NavRail onboardclick={handleBoardClick} />

  <div class="h-px bg-gray-200 mx-3 mt-1" />

  <!-- Botón Backup -->
  <div class="px-3 py-3">
    <button
      class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
             text-gray-600 hover:bg-gray-200 transition-colors"
      onclick={handleBackup}
    >
      <Download size={16} />
      Crear Backup
    </button>
  </div>
</aside>

<CategoryDialog
  open={showCategoryDialog}
  onclose={() => showCategoryDialog = false}
/>
```

---

## Fase 11 — Vistas (`src/lib/views/`)

### 11.1 `WelcomeView.svelte`

Puerto de `ui/views/welcome_view.py`:

```svelte
<script>
  import { LayoutDashboard } from "lucide-svelte";
</script>

<div class="flex-1 flex flex-col items-center justify-center text-gray-400">
  <LayoutDashboard size={60} class="mb-4 opacity-40" />
  <p class="text-xl">Selecciona una opción del menú</p>
</div>
```

### 11.2 `LinksView.svelte`

Puerto completo de `ui/views/links_view.py`. Incluye:
- Cabecera con nombre de categoría y breadcrumb
- Botones: abrir todos, ver notas, importar, editar cat., borrar cat., agregar nota
- Sección de subcategorías (con `SubcategoryCard`)
- Lista de enlaces (con `LinkCard`)
- Diálogos: `LinkDialog`, `BulkImportDialog`, `CategoryDialog`, `ConfirmDialog` (borrar enlace), `ConfirmDialog` (borrar categoría), `ItemDialog` (agregar nota rápida)

Lógica equivalente a `handlers/link_handlers.py` y `handlers/category_handlers.py` incrustada directamente en el componente o extraída a funciones locales.

### 11.3 `NotebookView.svelte`

Puerto completo de `ui/views/notebook_view.py`. Incluye:
- Cabecera con icono de libro, nombre y breadcrumb
- Sección de subcategorías
- Grid de notas (`NoteCard`) con estado vacío
- Grid de tareas (`TaskCard`) con estado vacío
- Scroll completo de la vista
- Diálogos: `ItemDialog`, `ConfirmDialog`

### 11.4 `BoardView.svelte`

Puerto completo de `ui/views/board_view.py`. Dos modos:

**Modo galería:** Grid de tarjetas por categoría con conteo de notas/tareas. Clic en tarjeta → modo detalle.

**Modo detalle:** Botón volver, cabecera de categoría, subcategorías, grid de notas y grid de tareas. Botón flotante para agregar ítem.

---

## Fase 12 — App.svelte y arranque

### `src/App.svelte`

Puerto directo de la función `main()` en `main.py`:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { appState, loadAppData, createBackup, selectCategory } from "$lib/store/appState.svelte";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import WelcomeView from "$lib/views/WelcomeView.svelte";
  import LinksView from "$lib/views/LinksView.svelte";
  import NotebookView from "$lib/views/NotebookView.svelte";
  import BoardView from "$lib/views/BoardView.svelte";
  import Snackbar from "$lib/components/ui/Snackbar.svelte";
  import { GENERAL_CATEGORY_ID, CATEGORY_TYPE_NICHE, CATEGORY_TYPE_NOTEBOOK } from "$lib/utils/constants";
  import { getCategory, getFlatCategoryEntries } from "$lib/utils/categoryUtils";

  let ready = $state(false);

  const currentCategoryType = $derived(
    appState.appData && appState.currentCategoryId
      ? getCategory(appState.appData, appState.currentCategoryId)?.type
      : null
  );

  onMount(async () => {
    // Equivale al inicio de main() en Flet
    await loadAppData();

    // Backup automático al arrancar
    createBackup(false).catch(() => {});

    // Seleccionar categoría inicial
    if (appState.appData) {
      const generalExists = !!getCategory(appState.appData, GENERAL_CATEGORY_ID);
      if (generalExists) {
        selectCategory(GENERAL_CATEGORY_ID);
      } else {
        const entries = getFlatCategoryEntries(appState.appData);
        if (entries.length > 0) selectCategory(entries[0][0].id);
      }
    }
    ready = true;
  });
</script>

{#if !ready}
  <div class="h-screen w-screen flex items-center justify-center text-gray-400 text-sm">
    Cargando...
  </div>
{:else}
  <div class="flex h-screen w-screen overflow-hidden">
    <Sidebar />
    <div class="w-px bg-gray-200 shrink-0"></div>
    <main class="flex-1 overflow-hidden flex">
      {#if appState.currentView === "welcome"}
        <WelcomeView />
      {:else if appState.currentView === "category" && currentCategoryType === CATEGORY_TYPE_NICHE}
        <LinksView />
      {:else if appState.currentView === "category" && currentCategoryType === CATEGORY_TYPE_NOTEBOOK}
        <NotebookView />
      {:else if appState.currentView === "board"}
        <BoardView />
      {/if}
    </main>
  </div>
{/if}

<Snackbar />
```

### `src/main.ts`

```typescript
import "./app.css";
import App from "./App.svelte";
import { mount } from "svelte";

const app = mount(App, { target: document.getElementById("app")! });
export default app;
```

---

## Fase 13 — Compatibilidad de datos existentes

### Regla de ruta del archivo

El `data.json` debe encontrarse en el mismo lugar que antes para no perder datos del usuario. En Flet el archivo se ubicaba junto al ejecutable Python. En Tauri, replicar ese comportamiento en Rust:

```rust
fn get_data_path() -> PathBuf {
    std::env::current_exe()
        .unwrap_or_default()
        .parent()
        .unwrap_or(&PathBuf::from("."))
        .join("data.json")
}
```

Si se prefiere usar el directorio estándar de la app (`AppData` en Windows, `~/.local/share` en Linux), agregar lógica de migración automática en el primer arranque: detectar si existe un `data.json` junto al ejecutable y copiarlo al nuevo destino.

### Regla de backups

El directorio `backups/` sigue la misma lógica de ruta. El formato de nombre de archivo debe ser idéntico al Python para que los backups existentes sean reconocidos:

```
backup_auto_2024-01-15_14-30-00.json
backup_manual_2024-01-15_14-30-00.json
```

---

## Fase 14 — Testing y checklist de validación

### Funcionalidades a verificar

**Datos**
- [ ] Cargar `data.json` existente sin pérdida ni corrupción
- [ ] Migración de datos legacy (schema < 2) en Rust idéntica al Python
- [ ] `save_data` genera JSON válido con la misma estructura

**Categorías**
- [ ] Crear categoría de tipo Nicho
- [ ] Crear categoría de tipo Bloc de notas
- [ ] Crear subcategoría (con padre)
- [ ] Editar nombre, icono y padre de una categoría
- [ ] Detección y bloqueo de ciclos al editar padre
- [ ] Bloqueo de nombres duplicados bajo el mismo padre
- [ ] Eliminar categoría sin hijos (ítems se mueven a General)
- [ ] Bloqueo de eliminación si tiene subcategorías
- [ ] Categoría General no se puede eliminar ni renombrar
- [ ] Breadcrumb correcto en todos los niveles

**Ítems (notas y tareas)**
- [ ] Crear nota y tarea
- [ ] Editar título, contenido, tipo y categoría
- [ ] Marcar/desmarcar tarea como completada
- [ ] Eliminar ítem con confirmación
- [ ] Ítems aparecen en la categoría correcta

**Enlaces**
- [ ] Agregar enlace (con y sin título)
- [ ] Abrir enlace individual en navegador
- [ ] Abrir todos los enlaces de una categoría
- [ ] Importar URLs en bulk (una por línea)
- [ ] Eliminar enlace con confirmación

**Navegación**
- [ ] NavRail muestra jerarquía con indentación correcta
- [ ] Seleccionar categoría cambia la vista
- [ ] Subcategorías visibles en `LinksView` y `NotebookView`
- [ ] Vista Board en modo galería y detalle
- [ ] Botón volver desde detalle a galería

**Sistema**
- [ ] Backup automático al iniciar la app
- [ ] Backup manual con mensaje de confirmación
- [ ] Máximo 5 backups, los más antiguos se eliminan

---

## Orden de implementación recomendado

| # | Tarea | Fase |
|---|---|---|
| 1 | Scaffolding y configuración | 1 |
| 2 | Modelos Rust | 2 |
| 3 | Comando `load_data` + `normalize_data` | 3.1 |
| 4 | Comando `save_data` | 3.1 |
| 5 | Comando `create_backup` | 3.2 |
| 6 | Comando `open_url` | 3.3 |
| 7 | Registrar comandos en `lib.rs` | 3.5–3.6 |
| 8 | Tipos TypeScript | 4.1 |
| 9 | Constantes | 4.2 |
| 10 | `categoryUtils.ts` — módulo crítico | 4.3 |
| 11 | Estado global (`appState.svelte.ts`) | 5 |
| 12 | Componentes UI base (Modal, Input, Select, Snackbar) | 6 |
| 13 | Mapeo de iconos y helper | 7 |
| 14 | Tarjetas (Link, Note, Task, Subcategory) | 8 |
| 15 | Diálogos | 9 |
| 16 | Sidebar + NavRail | 10 |
| 17 | `WelcomeView` | 11.1 |
| 18 | `LinksView` | 11.2 |
| 19 | `NotebookView` | 11.3 |
| 20 | `BoardView` | 11.4 |
| 21 | `App.svelte` y arranque | 12 |
| 22 | Verificar compatibilidad de datos | 13 |
| 23 | Testing completo | 14 |

---

## Notas críticas para el agente

1. **`categoryUtils.ts` es el archivo más importante.** Toda la lógica de árbol, ciclos, breadcrumbs y validaciones vive ahí. Verificar cada función con casos de prueba antes de continuar.

2. **`normalize_data` en Rust** debe replicar exactamente `DataManager._normalize_data()` en Python. Un error aquí puede corromper datos del usuario.

3. **Svelte 5 usa runes.** No usar la API de Svelte 4 (`writable`, `readable`, `derived` de `svelte/store`). Usar `$state`, `$derived`, `$effect` en archivos `.svelte` y `.svelte.ts`.

4. **Snippets en Svelte 5.** Los slots de Svelte 4 se reemplazan con `{#snippet nombre()}` y `{@render nombre()}`. Usar esa sintaxis en todos los componentes.

5. **Inmutabilidad del estado.** Antes de mutar `appState.appData`, siempre hacer `structuredClone(appState.appData)`. Las runes de Svelte 5 detectan cambios por referencia en objetos anidados.

6. **`persistData()` siempre después de mutar.** Cada acción que modifica datos debe llamar `await persistData()` al final, antes de cerrar diálogos.

7. **No hay `page.update()`.** En Svelte, la reactividad es automática. Nunca llamar un equivalente manual de actualización de UI.

8. **Los FABs (Floating Action Buttons)** se implementan con `fixed bottom-6 right-6 z-50` en Tailwind dentro de cada vista que los necesite.

9. **Identificación de ítems.** En Python los ítems se identifican por referencia de objeto. En TypeScript/JSON, al editar un ítem del array hay que buscarlo por índice (`findIndex`). Considerar agregar un campo `id` uuid a los ítems para robustez futura.

10. **El campo `type` en JSON.** En Rust usar `#[serde(rename = "type")]` en el campo. En TypeScript el campo se llama directamente `type` sin problema.
