# README_AGENT — Clusiv Data home/motivation screen plan

Read this file first before touching the code.

## Repository context already validated

The repository is `infoclusiv/clusiv-data`, default branch `main`. The app is a Svelte 5 + Vite frontend packaged with Tauri 2. The frontend entrypoint is `src/App.svelte`; it renders views from `appState.currentView`. `src/lib/store/appState.svelte.ts` owns navigation, data loading, persistence, logs, sidebar width, and view state. `src/lib/views/WelcomeView.svelte` is currently the fallback/welcome view, but startup currently selects the `General` category when it exists. The backend persists `AppData` through Tauri commands in `src-tauri/src/commands/data.rs` and Rust structs in `src-tauri/src/models/app_data.rs`.

The goal is to turn the app title `Clusiv Data` in the left sidepanel into a clickable home link and make that home view the first screen shown every time the app starts. The home view must be extremely minimal: a white screen, a motivational text, and one small edit button in a corner.

## Execution order

Execute the phase files in this exact order:

1. `phase-1.md`
2. `phase-2.md`
3. `phase-3.md`
4. `phase-4.md`
5. `phase-5.md`

Do not skip phases. Do not merge phases. Implement only one phase at a time.

## Before coding each phase

1. Read the phase document completely.
2. Re-analyze the repository files listed in that phase.
3. Fully understand the related architecture and affected components.
4. Validate that the proposed implementation matches the real root cause and current codebase behavior.
5. Confirm the files, functions, type names, and persistence paths still exist exactly as expected.
6. Stop and report if the codebase has changed in a way that invalidates the phase.

## During implementation

1. Follow the current phase scope strictly.
2. Avoid unrelated refactors, renames, formatting-only churn, or broad architecture changes.
3. Preserve existing functionality and minimize regression risk.
4. Use the repository’s existing patterns: Svelte 5 runes, existing store functions, existing `Modal`, `Input`, `Button`, `Snackbar`, and Tauri `invoke` persistence flow.
5. Do not hardcode secrets or credentials.
6. Do not install packages unless explicitly approved. If commands are needed, prefer `pnpm` for Node/Svelte scripts.
7. Keep each phase independently testable and commit-ready.

## After each phase

1. Verify every success criterion in the phase document.
2. Confirm expected behavior manually where UI behavior is involved.
3. Confirm observable failure signals are absent.
4. Report any inconsistencies, architectural conflicts, missing information, or signs that the plan may be incorrect before continuing.
5. Do not move to the next phase until the current phase is implemented and verified.

## Important architectural constraints

- Do not store the home/motivation text only in frontend `localStorage` unless the codebase has changed and `AppData` persistence is no longer the source of durable app content. Current durable app content goes through `load_data` / `save_data` and `data.json`.
- If a new `AppData` field is added in TypeScript only, it can be lost because the Rust `AppData` struct serializes the persisted data. Update both frontend and backend schema together.
- Startup currently navigates away from `welcome` by selecting the `General` category when it exists. The home screen cannot become the default startup screen unless `initializeApp()` changes this behavior.
- The existing `welcome` view can be reused as the home screen to avoid adding unnecessary routing surface area.

