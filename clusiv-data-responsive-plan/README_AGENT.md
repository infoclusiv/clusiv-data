# README_AGENT — Responsive Flow Node Editor Plan

## Mission
Fix the responsive layout failure inside the Clusiv Data flow node editor. The visible bug is that, when the app window is laptop-sized or reduced, the node editing layout stops respecting its available bounds: the description textarea/card can overflow, the notes/comments panel can visually overlap other content, and sections collapse over each other. On larger screens the same screen may appear acceptable, so this must be validated at multiple viewport/window sizes.

## Repository context observed before generating this plan
This repository is a Svelte 5 + Vite + Tauri application. The relevant architecture is:

- `src/App.svelte` owns the desktop shell: a fixed-height full-window flex layout with `<Sidebar />` and a `<main>` region that renders the active view.
- `src/lib/components/layout/Sidebar.svelte` owns a resizable left sidebar whose width can range from 208px to 420px.
- `src/app.css` defines shared UI classes such as `.page-panel`, `.input-base`, `.btn-primary`, `.btn-ghost`, and `.section-label`.
- `src/lib/views/FlowEditorView.svelte` owns the flow editor screen, autosave state, current selected node state, and decides whether to show the visual canvas/context panel or `FlowNodeEditorPanel`.
- `src/lib/components/flows/FlowNodeEditorPanel.svelte` owns the problematic node editor layout: the edit card, description textarea, notes panel, comments textarea, and node action buttons.
- Flow data is typed in `src/lib/store/types.ts` and persisted through state operations in `src/lib/store/appState.svelte.ts`; the responsive fix should not require schema or persistence changes.

## Required execution protocol
Read this file first. Then execute the phase files in order:

1. `phase-1.md`
2. `phase-2.md`
3. `phase-3.md`
4. `phase-4.md`
5. `phase-5.md`

Implement only one phase at a time.

Before coding each phase:

- Read the phase document completely.
- Re-analyze the current repository and fully understand the related architecture and affected components.
- Validate that the proposed implementation matches the real root cause and the current codebase behavior.
- Compare the current code against the file/component paths named in the phase.
- Stop and report if the codebase has materially changed or if the phase assumptions are false.

During implementation:

- Follow the phase scope strictly.
- Avoid unrelated refactors or unnecessary changes.
- Preserve existing functionality and minimize regression risk.
- Do not change persistence models, Tauri backend commands, flow graph logic, autosave logic, note-linking behavior, or category/navigation behavior unless a phase explicitly says so.
- Prefer class/layout changes in the affected Svelte components over global CSS changes.

After implementation of each phase:

- Verify all success criteria defined in that phase.
- Confirm the expected behavior and observable signals.
- Run the relevant checks listed in the phase.
- Report any inconsistencies, architectural conflicts, missing information, or evidence that the plan may be incorrect before continuing.
- Do not move to the next phase until the current phase is implemented and verified.

## General verification commands
Use the package manager already expected by this repository.

```bash
pnpm install
pnpm run check
pnpm run build
```

If Rust/Tauri is available locally and the change needs native-shell validation, also run:

```bash
pnpm run tauri dev
```

Manual responsive verification is required because the current repository does not show an existing browser E2E test suite for layout screenshots.

## Manual responsive windows to test
At minimum, verify the flow node editor at these approximate app/window sizes:

- 1600×900 or larger: two-column layout may be allowed if there is enough content width.
- 1366×768: laptop-sized window, the issue reported by the user.
- 1280×720: reduced laptop window.
- 1100×700: narrow main content after sidebar.
- 900×700 or equivalent with sidebar still visible: stacked layout must remain usable.

For each size:

- Open any flow.
- Select a node to enter `FlowNodeEditorPanel`.
- Use a node with a long description and long comments.
- Confirm the description textarea stays inside its card.
- Confirm the notes/comments panel does not overlay the description card.
- Confirm the page can scroll vertically when content does not fit.
- Confirm no unintended horizontal scrollbar appears on the main page/panel.
- Confirm the “Listo”, “Quitar nodo”, “Enlazar nota”, and node action buttons remain reachable.

## Non-goals
These phases do not aim to redesign the UI, change the data model, change flow graph layout algorithms, modify autosave behavior, or add new product features. The objective is a low-risk responsive layout correction for the node editor section.
