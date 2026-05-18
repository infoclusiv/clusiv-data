# Phase 1 — Baseline and Architecture Validation

## Objective

Validate the current repository state before making any code changes.

This phase must not change source code.

The purpose is to avoid repeating the previous failure, where the project stopped starting because the local dependency tree became corrupted while the implementation was being attempted.

---

## Preconditions Before Implementation

Before doing anything:

1. Confirm the working tree is clean or intentionally backed up:

```powershell
git status --short
```

2. Confirm the expected scripts exist:

```powershell
Get-Content package.json
```

Expected scripts include:

```json
"dev": "vite dev",
"build": "vite build",
"check": "svelte-check --tsconfig ./tsconfig.json"
```

3. Confirm local dependencies are healthy:

```powershell
Test-Path .\node_modules\.bin\vite.cmd
Test-Path .\node_modules\.bin\svelte-check.cmd
pnpm run check
pnpm run build
```

4. Confirm the app starts:

```powershell
pnpm run dev
```

---

## Current Architecture to Validate

Inspect these files:

```text
src/App.svelte
src/lib/views/QuickTextsView.svelte
src/lib/components/cards/QuickTextCard.svelte
src/lib/components/dialogs/QuickTextDialog.svelte
src/lib/store/types.ts
src/lib/store/appState.svelte.ts
src/lib/utils/categoryUtils.ts
src/lib/utils/constants.ts
src-tauri/src/models/app_data.rs
```

Validate the following current facts:

1. `App.svelte` renders `Sidebar` separately from the selected main view.
2. `QuickTextsView.svelte` is responsible for the `Textos Rápidos` page.
3. `QuickTextsView.svelte` currently renders a flat list of quick texts.
4. `QuickTextCard.svelte` currently renders one quick text card.
5. `QuickTextDialog.svelte` currently edits only title and content.
6. `QuickText` currently has only:
   - `id`
   - `title`
   - `content`
7. `AppData` currently has `__SYSTEM_QUICK_TEXTS__` but no `__SYSTEM_QUICK_TEXT_GROUPS__`.
8. `categoryUtils.ts` currently normalizes quick texts without group fields.
9. `appState.svelte.ts` currently has `saveQuickText` and `deleteQuickText`, but no group actions.
10. `src-tauri/src/models/app_data.rs` currently has Rust models for `QuickText` but no `QuickTextGroup`.

---

## Expected Behavior

After this phase:

- No files are changed.
- The app still starts.
- `pnpm run check` passes with 0 errors.
- `pnpm run build` passes.
- The implementation agent has confirmed that the real repository still matches the assumptions used by later phases.

---

## Success Criteria

This phase is successful only if:

- `git status --short` is reviewed.
- `pnpm run check` runs.
- `pnpm run build` runs.
- The app starts with `pnpm run dev`.
- The agent confirms the current quick-text architecture still matches the plan.

---

## How to Verify

Run:

```powershell
git status --short
Test-Path .\node_modules\.bin\vite.cmd
Test-Path .\node_modules\.bin\svelte-check.cmd
pnpm run check
pnpm run build
pnpm run dev
```

Manual UI check:

1. Open the app.
2. Navigate to `Textos Rápidos`.
3. Confirm existing quick texts appear in the current flat list.
4. Confirm the left sidepanel looks and behaves as before.

---

## Observable Failure Signals

Stop if any of these occur:

- `node_modules/.bin/vite.cmd` is missing.
- `pnpm run dev` fails with `'vite' is not recognized`.
- `pnpm run check` fails.
- `pnpm run build` fails.
- The app does not start.
- Current quick texts are not visible before implementation.
- The repository already contains partially applied grouped quick-text changes.

---

## Files / Components Involved

Read-only inspection:

```text
package.json
src/App.svelte
src/lib/views/QuickTextsView.svelte
src/lib/components/cards/QuickTextCard.svelte
src/lib/components/dialogs/QuickTextDialog.svelte
src/lib/store/types.ts
src/lib/store/appState.svelte.ts
src/lib/utils/categoryUtils.ts
src/lib/utils/constants.ts
src-tauri/src/models/app_data.rs
```

---

## Stop Conditions If the Plan Does Not Match the Real Codebase

Stop and report if:

- `QuickTextsView.svelte` is no longer the main quick-text view.
- `QuickText` already has group fields.
- `__SYSTEM_QUICK_TEXT_GROUPS__` already exists.
- The app uses a different persistence model than expected.
- `saveQuickText` was already changed to support groups.
- The sidepanel or app shell has been significantly changed.
- The dependency tree is broken.
