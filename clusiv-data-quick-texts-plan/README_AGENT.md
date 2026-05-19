# README_AGENT — Quick Texts Two-Column Groups + Multi-Group Membership

## Purpose

This archive contains an incremental implementation plan for the `clusiv-data` repository. The requested feature affects the global **Textos Rápidos** view.

User request summary:

1. In the quick texts view, grouped quick texts must be displayed in a two-column layout.
2. Quick text groups must be reorderable so the user can change their visual position.
3. A single quick text must be able to belong to two or more groups.
4. The explicit quick text `Copiar` button must be removed.
5. Clicking anywhere on a quick text box/card must copy the quick text content to the clipboard.
6. The only quick text action buttons that should remain visible are `Editar` and `Eliminar`.

## Repository findings used for this plan

The current implementation is a Svelte 5 + Tauri app.

Relevant frontend files:

- `src/App.svelte`
- `src/lib/views/QuickTextsView.svelte`
- `src/lib/components/quick-texts/QuickTextsGroupedView.svelte`
- `src/lib/components/quick-texts/QuickTextGroupCard.svelte`
- `src/lib/components/quick-texts/QuickTextRow.svelte`
- `src/lib/components/quick-texts/QuickTextsListView.svelte`
- `src/lib/components/dialogs/QuickTextDialog.svelte`
- `src/lib/store/types.ts`
- `src/lib/store/appState.svelte.ts`
- `src/lib/utils/categoryUtils.ts`
- `src/lib/utils/constants.ts`

Relevant backend/persistence files:

- `src-tauri/src/models/app_data.rs`
- `src-tauri/src/commands/data.rs`

Current root cause / architectural constraint:

- `QuickText` currently has a single `group_id: string | null` in the frontend type and `group_id: Option<String>` in the Rust model.
- Grouped rendering currently builds one section per group by assigning each quick text to only one group.
- The quick text row currently exposes an explicit `Copiar` button and copies only when that button is clicked.
- `QuickTextGroup` already has `sort_order`, but there is no visible reorder action in the quick texts grouped UI.

## Required execution workflow

Read this file first, then execute the phase files in order:

1. `phase-1-data-contract-and-migration.md`
2. `phase-2-multi-group-editor-and-save-flow.md`
3. `phase-3-two-column-grouped-rendering.md`
4. `phase-4-group-reorder-controls.md`
5. `phase-5-click-to-copy-row-interaction.md`

Implement only one phase at a time.

Before coding each phase:

- Read the entire phase document.
- Re-analyze the current repository state.
- Confirm the files and APIs mentioned in the phase still exist.
- Validate that the proposed implementation matches the current codebase behavior.
- Stop and report if the codebase has diverged from this plan.

During implementation:

- Follow the current phase scope strictly.
- Avoid unrelated refactors.
- Avoid changing unrelated views or application behavior.
- Preserve existing data whenever possible.
- Keep changes small and reversible.
- Prefer existing app patterns over introducing new dependencies.
- Use `pnpm` for install/run commands whenever possible.

After each phase:

- Verify every success criterion listed in that phase.
- Confirm expected observable signals.
- Report any inconsistency, missing information, or architectural conflict before continuing.
- Do not continue to the next phase until the current phase is implemented and verified.

## Recommended verification commands

Run these after each phase when possible:

```bash
pnpm run check
pnpm run build
```

If Rust code changed, also run from the repository root or `src-tauri` as appropriate:

```bash
cargo test
```

If the local environment cannot run one of these commands, document the reason and perform the strongest available manual verification instead.

## Important implementation constraints

- Do not remove support for existing `data.json` files that still use `group_id`.
- Do not destroy or silently drop quick text group membership data during migration.
- Do not change the global app data file location or Tauri command names.
- Do not introduce a drag-and-drop dependency unless the repository already has one. Prefer simple move up/down controls for low regression risk.
- Do not modify the create menu, sidebar, flows, categories, notes, or backups unless a phase explicitly requires it.
- Keep the quick text row action buttons limited to edit and delete after phase 5.
