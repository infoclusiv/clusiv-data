# README_AGENT — Quick Texts Linked Notes Implementation Plan

## Purpose

Implement a bottom linked-notes section in the global **Textos Rápidos** view, matching the existing bottom linked-notes behavior already used in the global **Flujos** view.

The requested behavior is **global to the Quick Texts section**, not per individual quick text:

- The user can link existing notes from categories/subcategories.
- Linked notes appear at the bottom of the Quick Texts view.
- Opening a linked note should open the original note in the existing item editor.
- Removing a note from this section must only unlink it from the Quick Texts section.
- Removing/unlinking must **not** delete the original note from `__SYSTEM_TASKS__` or from the category/subcategory where it was created.

## Repository alignment summary

Before implementing, verify these current architecture facts against the live codebase:

- The project is a Svelte 5 + Vite + Tauri app.
- Frontend app state is centralized in `src/lib/store/appState.svelte.ts`.
- Shared frontend data types are in `src/lib/store/types.ts`.
- Frontend data normalization lives in `src/lib/utils/categoryUtils.ts`.
- Shared note discovery helpers live in `src/lib/utils/noteUtils.ts`.
- The global flows view already uses a bottom linked-notes panel:
  - `src/lib/views/FlowsView.svelte`
  - `src/lib/components/flows/GlobalFlowLinkedNotes.svelte`
- The existing flow implementation stores only note IDs in:
  - `AppData.__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__`
- Notes are normal items with `type: "note"` stored in:
  - `AppData.__SYSTEM_TASKS__`
- Backend persistence and migration logic is in:
  - `src-tauri/src/models/app_data.rs`
  - `src-tauri/src/commands/data.rs`
- Current schema version is `14` in both:
  - `src/lib/utils/constants.ts`
  - `src-tauri/src/models/app_data.rs`
- `package.json` currently exposes validation scripts such as:
  - `check`
  - `test:quick-texts`
  - `test:flow-layout`
  - `test:flow-graph`

## Important implementation decision

Use a new AppData field analogous to the global flows field:

```ts
__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: string[];
```

Do **not** store copies of notes inside quick texts. Store IDs only. This preserves the note as a single original entity in `__SYSTEM_TASKS__` and makes unlinking non-destructive.

## Execution rules

1. Read this `README_AGENT.md` first.
2. Execute the phase `.md` files in order.
3. Implement only one phase at a time.
4. Before coding each phase:
   - Read the phase document completely.
   - Analyze the repository and fully understand the related architecture and affected components.
   - Validate that the proposed implementation matches the real root cause and current codebase behavior.
5. During implementation:
   - Follow the phase scope strictly.
   - Avoid unrelated refactors or unnecessary changes.
   - Preserve existing functionality and minimize regression risk.
   - Prefer `pnpm` for package/script commands where possible.
6. After implementation:
   - Verify all success criteria defined in the phase document.
   - Confirm observable signals and expected behavior.
   - Report any inconsistencies, architectural conflicts, missing information, or signs that the proposed plan may be incorrect before continuing.
7. Do not move to the next phase until the current phase is implemented and verified.

## Stop immediately if

Stop and report before coding or continuing if any of these are true:

- The repository no longer contains `QuickTextsView.svelte`.
- `GlobalFlowLinkedNotes.svelte` no longer exists or its props are no longer compatible with the plan.
- Notes are no longer represented as `Item` objects with `type: "note"` in `__SYSTEM_TASKS__`.
- Backend persistence no longer uses the Rust `AppData` model in `save_data`.
- The current schema version is no longer `14` and there are migration rules that conflict with adding a new top-level field.
- The requested behavior turns out to be per quick text rather than global to the Quick Texts section.

## Phase order

1. `phase-1.md` — Add the data contract and schema support.
2. `phase-2.md` — Add frontend state operations for linking/unlinking Quick Texts notes.
3. `phase-3.md` — Render and wire the linked-notes panel in the Quick Texts view.
4. `phase-4.md` — Add tests and final regression verification.
