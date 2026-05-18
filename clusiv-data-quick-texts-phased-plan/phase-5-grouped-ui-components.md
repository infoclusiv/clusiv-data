# Phase 5 — Grouped UI Components

## Objective

Create the modular UI components for grouped quick texts without wiring them into the main view yet.

This keeps risk low by making the components compile independently before replacing the current page layout.

---

## Preconditions Before Implementation

Phase 4 must be complete and verified.

Before coding:

```powershell
git status --short
pnpm run check
pnpm run build
```

Confirm:

- `QuickTextGroup` type exists.
- `QuickText` has `group_id` and `sort_order`.
- `getQuickTextDisplayTitle` and `getQuickTextPreview` still exist.
- `QuickTextDialog` still works.

---

## Expected Behavior

After this phase:

- New grouped quick-text components exist.
- The current `Textos Rápidos` page still uses the old layout.
- The new components compile.
- No main behavior changes yet.

---

## Files / Components Involved

Create directory:

```text
src/lib/components/quick-texts/
```

Create files:

```text
src/lib/components/quick-texts/QuickTextsViewToggle.svelte
src/lib/components/quick-texts/QuickTextsGroupedView.svelte
src/lib/components/quick-texts/QuickTextGroupCard.svelte
src/lib/components/quick-texts/QuickTextRow.svelte
src/lib/components/quick-texts/QuickTextsListView.svelte
src/lib/components/quick-texts/QuickTextCreateMenu.svelte
```

Do not modify yet:

```text
src/lib/views/QuickTextsView.svelte
src/App.svelte
src/lib/components/layout/Sidebar.svelte
```

---

## Implementation Steps

### 1. Create `QuickTextsViewToggle.svelte`

Purpose:

Switch between:

- `Vista agrupada`
- `Vista lista`

Recommended props:

```ts
type QuickTextsViewMode = "grouped" | "list";

interface Props {
  viewMode: QuickTextsViewMode;
  onchange: (viewMode: QuickTextsViewMode) => void;
}
```

Use real `<button>` elements.

### 2. Create `QuickTextRow.svelte`

Purpose:

Render one quick text inside a group or list.

Recommended props:

```ts
interface Props {
  quickText: QuickText;
  index: number;
  groupName?: string;
  showGroupLabel?: boolean;
  oncopy: () => void;
  onedit: () => void;
  ondelete: () => void;
}
```

Use helpers:

```ts
getQuickTextDisplayTitle
getQuickTextPreview
```

Actions:

- `Copiar`
- `Editar`
- overflow/delete action

Use explicit buttons instead of making the entire row clickable.

### 3. Create `QuickTextGroupCard.svelte`

Purpose:

Render one group card.

Recommended props:

```ts
interface Props {
  group: QuickTextGroup | null;
  texts: QuickText[];
  virtual?: boolean;
  oncopy: (quickText: QuickText) => void;
  onedit: (quickText: QuickText) => void;
  ondelete: (quickText: QuickText) => void;
  oneditgroup?: (group: QuickTextGroup) => void;
  ondeletegroup?: (group: QuickTextGroup) => void;
}
```

Virtual group behavior:

- Name: `Textos sin grupo`
- Description: `Textos no asignados a ningún grupo`
- No edit-group button.
- No delete-group action.

Real group behavior:

- Show folder icon.
- Show group name.
- Show text count.
- Show description if present.
- Show `Editar grupo`.
- Show delete group action, preferably behind an overflow or danger button.

### 4. Create `QuickTextsGroupedView.svelte`

Purpose:

Build grouped rendering.

Recommended props:

```ts
interface Props {
  groups: QuickTextGroup[];
  quickTexts: QuickText[];
  oncopy: (quickText: QuickText) => void;
  onedit: (quickText: QuickText) => void;
  ondelete: (quickText: QuickText) => void;
  oneditgroup: (group: QuickTextGroup) => void;
  ondeletegroup: (group: QuickTextGroup) => void;
}
```

Rules:

- Sort groups by `sort_order`.
- Sort texts by `sort_order`.
- Show real groups, including empty groups.
- Show `Textos sin grupo` if there are any ungrouped texts.
- Do not persist the virtual group.

### 5. Create `QuickTextsListView.svelte`

Purpose:

Render all quick texts in a flat list with group labels.

Recommended props:

```ts
interface Props {
  groups: QuickTextGroup[];
  quickTexts: QuickText[];
  oncopy: (quickText: QuickText) => void;
  onedit: (quickText: QuickText) => void;
  ondelete: (quickText: QuickText) => void;
}
```

Rules:

- Sort texts by group and `sort_order`, or preserve current array order if safer.
- Show group label:
  - Real group name
  - `Textos sin grupo`

### 6. Create `QuickTextCreateMenu.svelte`

Purpose:

Render the floating `+` menu.

Recommended props:

```ts
interface Props {
  open: boolean;
  onnewtext: () => void;
  onnewgroup: () => void;
}
```

Actions:

- `Nuevo texto`
- `Nuevo grupo`

Use buttons.

---

## Success Criteria

- All new components compile.
- No existing UI behavior changes yet.
- No sidepanel changes.
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

Manual check:

1. Open the app.
2. Go to `Textos Rápidos`.
3. Confirm the old flat UI still appears.
4. Confirm create/edit/delete still works.
5. Confirm no sidepanel changes.

---

## Observable Failure Signals

Stop if:

- New components produce TypeScript/Svelte errors.
- `pnpm run build` fails.
- Current `Textos Rápidos` page changes unexpectedly.
- Existing quick-text actions stop working.
- Sidepanel changes.

---

## Stop Conditions If the Plan Does Not Match the Real Codebase

Stop if:

- Existing styling classes such as `card`, `btn-ghost`, `section-label`, or `input-base` are unavailable.
- `lucide-svelte` icons are unavailable.
- Quick-text helper functions have moved or changed.
