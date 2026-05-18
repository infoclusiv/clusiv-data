# Phase 2 — Data Model and Safe Migration

## Objective

Add the minimum data model and normalization support needed for grouped quick texts while preserving existing quick texts.

This phase introduces group-capable data structures but should not change the visible UI yet.

---

## Preconditions Before Implementation

Phase 1 must be complete and verified.

Before coding:

```powershell
git status --short
pnpm run check
pnpm run build
```

Confirm the repository still has:

- `QuickText` with only `id`, `title`, `content`.
- `AppData.__SYSTEM_QUICK_TEXTS__`.
- No `AppData.__SYSTEM_QUICK_TEXT_GROUPS__`.

---

## Expected Behavior

After this phase:

- The app still looks the same.
- Existing quick texts still appear in the current flat list.
- Existing quick texts are normalized with:
  - `group_id: null`
  - `sort_order` based on their existing order.
- New `__SYSTEM_QUICK_TEXT_GROUPS__` is initialized as an empty array.
- No grouped UI is shown yet.

---

## Files / Components Involved

Modify:

```text
src/lib/store/types.ts
src/lib/utils/constants.ts
src/lib/utils/categoryUtils.ts
src-tauri/src/models/app_data.rs
```

Do not modify:

```text
src/lib/views/QuickTextsView.svelte
src/lib/components/dialogs/QuickTextDialog.svelte
src/lib/store/appState.svelte.ts
src/App.svelte
src/lib/components/layout/Sidebar.svelte
```

---

## Implementation Steps

### 1. Update TypeScript Types

In `src/lib/store/types.ts`, update `QuickText`:

```ts
export interface QuickText {
  id: string;
  title: string;
  content: string;
  group_id: string | null;
  sort_order: number;
}
```

Add:

```ts
export interface QuickTextGroup {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

Update `AppData`:

```ts
__SYSTEM_QUICK_TEXT_GROUPS__: QuickTextGroup[];
```

Keep `QuickTextFormInput` backward-compatible for now to avoid breaking `QuickTextDialog` before Phase 4:

```ts
export interface QuickTextFormInput {
  title: string;
  content: string;
  group_id?: string | null;
}
```

Add:

```ts
export interface QuickTextGroupFormInput {
  name: string;
  description: string;
}
```

### 2. Update Schema Version

In `src/lib/utils/constants.ts`:

```ts
export const SCHEMA_VERSION = 12;
```

In `src-tauri/src/models/app_data.rs`:

```rust
pub const SCHEMA_VERSION: u32 = 12;
```

### 3. Update Rust Models

In `src-tauri/src/models/app_data.rs`, update `QuickText`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct QuickText {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub group_id: Option<String>,
    #[serde(default)]
    pub sort_order: i32,
}
```

Add:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct QuickTextGroup {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub sort_order: i32,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}
```

Update `AppData`:

```rust
#[serde(rename = "__SYSTEM_QUICK_TEXT_GROUPS__", default)]
pub quick_text_groups: Vec<QuickTextGroup>,
```

Update `default_data()`:

```rust
quick_text_groups: Vec::new(),
```

### 4. Update `createDefaultAppData`

In `src/lib/utils/categoryUtils.ts`, add:

```ts
__SYSTEM_QUICK_TEXT_GROUPS__: [],
```

### 5. Add Quick Text Group Accessor

Add:

```ts
export function getQuickTextGroups(appData: AppData): QuickTextGroup[] {
  if (!appData.__SYSTEM_QUICK_TEXT_GROUPS__) {
    appData.__SYSTEM_QUICK_TEXT_GROUPS__ = [];
  }

  return appData.__SYSTEM_QUICK_TEXT_GROUPS__;
}
```

### 6. Add Group Normalization

Add:

```ts
function normalizeQuickTextGroup(value: unknown, fallbackIndex: number): QuickTextGroup | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<QuickTextGroup>;
  const now = new Date().toISOString();

  return {
    id: typeof candidate.id === "string" && candidate.id.trim().length > 0
      ? candidate.id
      : `quick-text-group-${fallbackIndex}`,
    name: typeof candidate.name === "string" && candidate.name.trim().length > 0
      ? candidate.name
      : "Sin nombre",
    description: typeof candidate.description === "string"
      ? candidate.description
      : "",
    sort_order: Number.isFinite(Number(candidate.sort_order))
      ? Number(candidate.sort_order)
      : fallbackIndex,
    created_at: typeof candidate.created_at === "string" && candidate.created_at.trim().length > 0
      ? candidate.created_at
      : now,
    updated_at: typeof candidate.updated_at === "string" && candidate.updated_at.trim().length > 0
      ? candidate.updated_at
      : now,
  };
}
```

Add:

```ts
export function normalizeQuickTextGroups(value: unknown): QuickTextGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeQuickTextGroup(entry, index + 1))
    .filter((entry): entry is QuickTextGroup => entry !== null)
    .sort((left, right) => left.sort_order - right.sort_order);
}
```

### 7. Update Quick Text Normalization

Change `normalizeQuickText` so old quick texts are migrated:

```ts
function normalizeQuickText(value: unknown, fallbackIndex: number): QuickText | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<QuickText>;

  return {
    id: typeof candidate.id === "string" && candidate.id.trim().length > 0
      ? candidate.id
      : `quick-text-${fallbackIndex}`,
    title: typeof candidate.title === "string" ? candidate.title : "",
    content: typeof candidate.content === "string" ? candidate.content : "",
    group_id: typeof candidate.group_id === "string" && candidate.group_id.trim().length > 0
      ? candidate.group_id
      : null,
    sort_order: Number.isFinite(Number(candidate.sort_order))
      ? Number(candidate.sort_order)
      : fallbackIndex,
  };
}
```

Update `normalizeQuickTexts` accordingly:

```ts
export function normalizeQuickTexts(value: unknown): QuickText[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeQuickText(entry, index + 1))
    .filter((entry): entry is QuickText => entry !== null);
}
```

### 8. Update `normalizeAppData`

Add:

```ts
normalized.__SYSTEM_QUICK_TEXT_GROUPS__ = normalizeQuickTextGroups(
  (normalized as Partial<AppData>).__SYSTEM_QUICK_TEXT_GROUPS__,
);
```

Validate quick-text group references:

```ts
const validQuickTextGroupIds = new Set(
  normalized.__SYSTEM_QUICK_TEXT_GROUPS__.map((group) => group.id),
);

for (const quickText of normalized.__SYSTEM_QUICK_TEXTS__) {
  if (quickText.group_id && !validQuickTextGroupIds.has(quickText.group_id)) {
    quickText.group_id = null;
  }
}
```

---

## Success Criteria

- TypeScript understands `QuickTextGroup`.
- Rust model accepts `quick_text_groups`.
- Existing quick texts are normalized with `group_id: null`.
- Existing quick texts still display in the old flat UI.
- No grouped UI is introduced yet.
- `pnpm run check` passes.
- `pnpm run build` passes.

---

## How to Verify

Run:

```powershell
pnpm run check
pnpm run build
pnpm run dev
```

Manual UI check:

1. Open `Textos Rápidos`.
2. Confirm the current flat list still appears.
3. Confirm existing quick texts are still visible.
4. Confirm creating/editing/deleting quick texts still works as before.

Optional data inspection:

- Load app data after startup.
- Confirm `__SYSTEM_QUICK_TEXT_GROUPS__` exists and is `[]`.
- Confirm old quick texts now have `group_id: null`.

---

## Observable Failure Signals

Stop if:

- Existing quick texts disappear.
- `QuickTextDialog` no longer saves texts.
- `pnpm run check` reports type errors from missing `group_id`.
- App data fails to load.
- Rust model deserialization fails.
- The app UI changes unexpectedly.
- The sidepanel changes.

---

## Stop Conditions If the Plan Does Not Match the Real Codebase

Stop if:

- `QuickText` already has group fields.
- `AppData` already has `__SYSTEM_QUICK_TEXT_GROUPS__`.
- `normalizeAppData` has been substantially rewritten.
- Rust models no longer mirror frontend app data.
