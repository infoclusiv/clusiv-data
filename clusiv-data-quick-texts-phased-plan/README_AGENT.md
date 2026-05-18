# README_AGENT — Phased Implementation Instructions

## Project

Repository: `clusiv-data`

Goal: Implement grouped quick texts for the **Textos Rápidos** section safely, incrementally, and with phase-by-phase verification.

The implementation must transform the current flat quick-text list into a grouped quick-text workflow:

- Quick texts can belong to a group.
- Quick texts can also remain ungrouped.
- Ungrouped texts must appear under a virtual group named `Textos sin grupo`.
- The floating `+` button must offer two actions:
  - `Nuevo texto`
  - `Nuevo grupo`
- Existing quick texts must be preserved and initially shown under `Textos sin grupo`.
- The left navigation sidepanel must not be modified.

---

## Required Execution Protocol

Read this file completely before making any changes.

Then execute the phase files in order:

1. `phase-1-baseline-and-architecture-validation.md`
2. `phase-2-data-model-and-safe-migration.md`
3. `phase-3-store-actions-and-observability.md`
4. `phase-4-dialogs-and-group-assignment.md`
5. `phase-5-grouped-ui-components.md`
6. `phase-6-quick-texts-view-integration.md`
7. `phase-7-verification-regression-and-cleanup.md`

Implement only one phase at a time.

Do not move to the next phase until the current phase is implemented and verified.

---

## Before Coding Each Phase

Before implementing any phase:

1. Read the entire phase document.
2. Inspect the real current repository files mentioned by the phase.
3. Validate that the plan still matches the current codebase.
4. Identify all affected components.
5. Confirm the phase is still safe to implement.

If the repository has changed or the phase assumptions are wrong, stop and report the mismatch before coding.

---

## During Implementation

Follow the phase scope strictly.

Do not perform unrelated refactors.

Do not change unrelated areas of the app.

Do not modify the left navigation sidepanel.

Do not modify unrelated views such as:

- Categories
- Board
- Backups
- Logs
- Search
- Flows
- Item editor
- Flow editor

Do not manually reconstruct `node_modules`.

Do not change dependency management unless the phase explicitly requires it.

If dependency commands fail because of `node_modules`, permissions, missing `.bin`, or package resolution, stop and report the environment issue. Do not attempt ad-hoc dependency repairs.

---

## After Each Phase

After implementing each phase:

1. Run:

```powershell
pnpm run check
pnpm run build
```

2. If the phase affects runtime UI, also run:

```powershell
pnpm run dev
```

3. Verify all success criteria in the phase document.
4. Check observable failure signals.
5. Report:
   - Files changed
   - Behavior verified
   - Commands run
   - Any warnings
   - Any risks or inconsistencies

Do not continue to the next phase if:

- `pnpm run check` fails.
- `pnpm run build` fails.
- The app does not start.
- Existing quick texts disappear.
- The sidepanel changes unexpectedly.
- The implementation requires changes outside the phase scope.

---

## Dependency Safety Rule

This project recently failed to start because `node_modules/.bin` was missing after a corrupted dependency tree. If commands fail with errors such as:

```text
'vite' is not recognized
svelte-check is not recognized
EPERM
Access denied
node_modules/.bin does not exist
```

Stop and report the environment problem.

Do not manually rebuild `node_modules/.pnpm` links.

The safe dependency recovery path, if the user explicitly approves it, is:

```powershell
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM esbuild.exe /T 2>$null
Remove-Item .\node_modules -Recurse -Force
pnpm install --frozen-lockfile
```

---

## Design Contract

The implementation must preserve this core behavior:

```ts
quickText.group_id === null
```

means the quick text belongs to the virtual group:

```text
Textos sin grupo
```

Do not persist `Textos sin grupo` as a real group.

---

## Final Definition of Done

The feature is complete only when:

- Existing quick texts still load.
- Existing quick texts appear under `Textos sin grupo`.
- Users can create groups.
- Users can edit groups.
- Users can delete groups without deleting texts.
- Deleting a group moves its texts to `Textos sin grupo`.
- Users can create quick texts.
- Users can edit quick texts.
- Users can assign quick texts to groups.
- Users can move quick texts between groups.
- Users can move quick texts back to `Textos sin grupo`.
- Grouped view works.
- List view works.
- Floating `+` opens `Nuevo texto` and `Nuevo grupo`.
- No separate main-content `Nuevo texto` or `Nuevo grupo` buttons are added.
- The left navigation sidepanel is unchanged.
- `pnpm run check` passes.
- `pnpm run build` passes.
