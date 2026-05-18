# Phase 7 — Verification, Regression Checks, and Cleanup

## Objective

Verify the full grouped quick-text feature, remove safe dead code if appropriate, and document any remaining warnings or risks.

This phase should not introduce new feature behavior.

---

## Preconditions Before Implementation

Phase 6 must be complete and verified.

Before making any cleanup changes:

```powershell
git status --short
pnpm run check
pnpm run build
pnpm run dev
```

Confirm the grouped quick-text feature works manually.

---

## Expected Behavior

After this phase:

- The feature is stable.
- Build and check pass.
- There are no unused imports.
- There are no obvious dead components still imported.
- No unrelated files were changed.
- The sidepanel remains unchanged.
- The project starts from the normal shortcut if applicable.

---

## Files / Components Involved

Potentially inspect:

```text
src/lib/views/QuickTextsView.svelte
src/lib/components/cards/QuickTextCard.svelte
src/lib/components/quick-texts/
src/lib/components/dialogs/
src/lib/store/
src/lib/utils/
src-tauri/src/models/app_data.rs
```

Only modify files if cleanup is safe and directly related to this feature.

---

## Implementation Steps

### 1. Run Static Validation

Run:

```powershell
pnpm run check
pnpm run build
```

Record warnings.

The existing warning about `allowImportingTsExtensions`, if still present and not caused by this feature, should not be treated as a feature failure.

### 2. Runtime Validation

Run:

```powershell
pnpm run dev
```

Open the app.

Test all workflows listed below.

### 3. Manual Test Matrix

#### Test 1 — Existing Quick Texts

Expected:

- Existing quick texts appear under `Textos sin grupo`.
- No text is lost.

#### Test 2 — Create Group

Expected:

- `+` → `Nuevo grupo`
- Group appears as a card.
- Empty group can render safely.

#### Test 3 — Edit Group

Expected:

- Group name and description can be edited.
- Texts inside the group remain.

#### Test 4 — Create Text in Group

Expected:

- `+` → `Nuevo texto`
- Select existing group.
- Text appears inside selected group.

#### Test 5 — Create Text Without Group

Expected:

- Select `Textos sin grupo`.
- Persisted value is `group_id: null`.
- Text appears under virtual group.

#### Test 6 — Move Text Between Groups

Expected:

- Edit quick text.
- Select another group.
- Text moves without duplication.

#### Test 7 — Move Text to Ungrouped

Expected:

- Edit quick text.
- Select `Textos sin grupo`.
- Text moves under virtual group.
- `group_id` becomes `null`.

#### Test 8 — Delete Group

Expected:

- Deleting a group removes only the group.
- Texts from that group move to `Textos sin grupo`.

#### Test 9 — Copy Text

Expected:

- `Copiar` copies `quickText.content`.
- Success snackbar appears.

#### Test 10 — View Toggle

Expected:

- `Vista agrupada` shows groups.
- `Vista lista` shows all texts with group labels.

#### Test 11 — App Reload

Expected:

- Reload the app.
- Groups and assignments persist.
- Ungrouped texts remain under `Textos sin grupo`.

#### Test 12 — Sidepanel Regression

Expected:

- Sidepanel is visually unchanged.
- Category navigation still works.
- Other app views still open.

### 4. Cleanup

Search for unused imports or obsolete files:

```powershell
pnpm run check
```

If `QuickTextCard.svelte` is no longer imported anywhere, it may be left in place to reduce deletion risk.

Do not delete it unless:

- It is confirmed unused.
- The user or maintainer wants cleanup.
- `pnpm run check` and `pnpm run build` pass after deletion.

### 5. Final Report

Report:

- Files changed.
- Commands run.
- Manual workflows verified.
- Remaining warnings.
- Any known risks.

---

## Success Criteria

- `pnpm run check` passes.
- `pnpm run build` passes.
- App starts.
- Existing quick texts are preserved.
- Grouped view works.
- List view works.
- Group create/edit/delete works.
- Quick text create/edit/delete/copy works.
- Group assignment works.
- Group deletion does not delete texts.
- Sidepanel is unchanged.
- No unrelated refactors were introduced.

---

## Observable Failure Signals

Stop and report if:

- App fails to start.
- Build fails.
- Check fails.
- Existing quick texts disappear.
- Group assignments do not persist after reload.
- Texts duplicate between groups.
- Group deletion deletes texts.
- Sidepanel changes.
- Dependency errors appear.
- `node_modules/.bin` is missing.

---

## Stop Conditions If the Plan Does Not Match the Real Codebase

Stop if:

- Phase 6 implementation is incomplete.
- Data model does not match expected fields.
- Runtime behavior differs from the contracts.
- Cleanup requires unrelated refactors.
