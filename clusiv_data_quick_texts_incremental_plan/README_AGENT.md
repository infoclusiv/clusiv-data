# README_AGENT — Incremental Implementation Plan for Quick Text Grouped View

## Purpose

This archive contains an AI-safe, phase-by-phase implementation plan for the `clusiv-data` repository.

The requested feature is limited to the **Textos Rápidos** section:

1. In the grouped view, replace the current two-column layout with a single-column list of collapsed groups.
2. Clicking a group should expand/collapse the texts that belong to that group.
3. Allow ordering the position of quick texts within the group flow/list.
4. When deleting/removing a text from a group, remove it only from that group, not from every group where it appears.
5. Group actions for move up, move down, edit, and delete must be icon-only.
6. The quick text edit action must be icon-only.

## Repository facts observed before planning

The plan is aligned to the current Svelte/Tauri architecture:

- Frontend framework: Svelte 5 + TypeScript + Vite.
- Desktop shell/persistence: Tauri v2 Rust backend.
- Main app view switch: `src/App.svelte` renders `QuickTextsView` when `appState.currentView === "quick-texts"`.
- Main quick text view: `src/lib/views/QuickTextsView.svelte`.
- Grouped view: `src/lib/components/quick-texts/QuickTextsGroupedView.svelte`.
- Group card: `src/lib/components/quick-texts/QuickTextGroupCard.svelte`.
- Text row: `src/lib/components/quick-texts/QuickTextRow.svelte`.
- Dialog for text creation/editing: `src/lib/components/dialogs/QuickTextDialog.svelte`.
- Frontend state and mutations: `src/lib/store/appState.svelte.ts`.
- Frontend types: `src/lib/store/types.ts`.
- Frontend normalization/helpers: `src/lib/utils/categoryUtils.ts`.
- Frontend schema version: `src/lib/utils/constants.ts`.
- Rust model: `src-tauri/src/models/app_data.rs`.
- Rust data commands/migration/normalization: `src-tauri/src/commands/data.rs`.

## Important current behavior to preserve

- `QuickText.group_ids` is the preferred multi-group field.
- `QuickText.group_id` is legacy compatibility and currently mirrors the first effective group.
- `QuickText.sort_order` currently exists as a single legacy/global ordering field.
- `QuickTextsGroupedView.svelte` currently derives sections from groups and quick texts, including a virtual `Textos sin grupo` section.
- Deleting a quick text today through `deleteQuickText(id)` removes the whole quick text from `__SYSTEM_QUICK_TEXTS__`.
- Deleting a group today removes the group and removes only that group id from quick text memberships.

## Execution rules for the implementation agent

Read this file first.

Execute the phase `.md` files in order:

1. `phase-1.md`
2. `phase-2.md`
3. `phase-3.md`
4. `phase-4.md`
5. `phase-5.md`
6. `phase-6.md`

Implement only one phase at a time.

Before coding each phase:

- Read the phase document completely.
- Analyze the repository and fully understand the related architecture and affected components.
- Validate that the proposed implementation matches the real root cause and current codebase behavior.
- Confirm the files named in the phase still exist and still contain the expected responsibilities.
- Confirm the current data model still matches the assumptions in this plan.

During implementation:

- Follow the phase scope strictly.
- Avoid unrelated refactors or unnecessary changes.
- Preserve existing functionality and minimize regression risk.
- Prefer small, local component/store changes over broad rewrites.
- Keep Svelte 5 rune patterns consistent with the existing codebase.
- Use `pnpm` for commands whenever package-manager commands are needed.
- Do not hardcode secrets or environment-specific absolute paths.

After implementation:

- Verify all success criteria defined in the phase document.
- Confirm observable signals and expected behavior.
- Report any inconsistencies, architectural conflicts, missing information, or signs that the proposed plan may be incorrect before continuing.
- Do not move to the next phase until the current phase is implemented and verified.

## Recommended baseline commands

Run these before the first phase and after each phase where feasible:

```bash
pnpm check
pnpm build
```

If a phase adds a specific quick text test script, also run:

```bash
pnpm test:quick-texts
```

## Global stop conditions

Stop before coding and report the mismatch if any of these are true:

- The repository no longer uses Svelte components for quick texts.
- `QuickTextsView.svelte` is no longer the entry point for the quick text screen.
- `QuickText` no longer uses `group_ids` for multi-group membership.
- Persistence no longer flows through `save_data` / `load_data` Tauri commands.
- A newer implementation already fully supports collapsed grouped lists, group-only removal, and per-group text ordering.
- The current codebase has already replaced `sort_order` with a different membership/order model.

## Architectural intent

The implementation should avoid treating `QuickText.sort_order` as the authoritative ordering for every group. Because a quick text can belong to multiple groups, each group needs its own ordering data. The safest path is:

1. First change only the visual grouped layout and collapse behavior.
2. Then change icon-only action presentation.
3. Then make delete/remove group-context-aware.
4. Then add a small backwards-compatible per-group ordering model.
5. Then add move controls for quick texts inside each group.
6. Then add targeted tests/regression checks.
