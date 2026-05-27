# Phase 5 — Add focused verification coverage and run final regression checks

## Single objective

Add a small, focused automated test for home text normalization/persistence assumptions and run final manual and automated regression checks.

## Expected behavior

- The repository has lightweight coverage proving older app data gets a default home text and valid custom home text is preserved by frontend normalization.
- The added test follows the repository’s current Node-based test style.
- Existing test scripts and checks continue to pass.
- Final manual verification confirms the full requested workflow works end to end.

## Success criteria

- A focused test file exists, for example `src/lib/utils/homeText.test.mjs`, covering at least:
  - Missing `__SYSTEM_HOME_TEXT__` is normalized to the default.
  - Existing string `__SYSTEM_HOME_TEXT__` is preserved exactly, including multiline text.
  - Invalid non-string `__SYSTEM_HOME_TEXT__` is normalized safely.
- `package.json` includes a script for the new test, for example:
  ```json
  "test:home-text": "node --experimental-strip-types --experimental-loader ./scripts/test-alias-loader.mjs src/lib/utils/homeText.test.mjs"
  ```
- The new test uses the existing `scripts/test-alias-loader.mjs` when importing `$lib` modules.
- The following commands pass:
  ```bash
  pnpm run test:home-text
  pnpm check
  ```
- Existing relevant tests still pass where practical:
  ```bash
  pnpm run test:quick-texts
  pnpm run test:linked-notes
  pnpm run test:flows
  ```
- If the Rust toolchain is available, backend compile validation passes:
  ```bash
  cd src-tauri
  cargo check
  ```

## How to verify

1. Inspect existing test style first:
   - `src/lib/utils/quickTexts.test.mjs`
   - `scripts/test-alias-loader.mjs`
   - `package.json`
2. Add the smallest possible test and script.
3. Run the new test.
4. Run frontend type checking.
5. Run existing relevant tests.
6. Run `cargo check` if available.
7. Perform final manual end-to-end verification:
   - Start the app.
   - Confirm it opens on the home screen.
   - Confirm the home screen is white/minimal.
   - Confirm `Clusiv Data` in the sidepanel is clickable and returns home.
   - Edit the home text with multiple lines.
   - Save and confirm the home screen updates.
   - Restart/reload the app and confirm the edited text persists.
   - Navigate through categories, board, flows, search, quick texts, logs, and backups to confirm no obvious regressions.

## Observable failure signals

- New tests require broad mocking or a heavy test framework not already used by the repo.
- The new test cannot import `$lib` modules even with the existing alias loader.
- `pnpm check` fails due to new `AppData` typing errors.
- Existing tests fail because schema defaults broke current normalization assumptions.
- `cargo check` fails because Rust `AppData` construction or serde mappings are inconsistent.
- Manual restart loses the edited home text.
- The app does not start on home after all phases.

## Files/components involved

- `src/lib/utils/homeText.test.mjs` or another small focused test file matching current conventions.
- `package.json`
- Existing support file: `scripts/test-alias-loader.mjs`
- Indirectly tested:
  - `src/lib/utils/categoryUtils.ts`
  - `src/lib/utils/constants.ts`
  - `src/lib/store/types.ts`
  - `src-tauri/src/models/app_data.rs`
  - `src-tauri/src/commands/data.rs`

## Preconditions before implementation

- Phases 1 through 4 are implemented and verified.
- Confirm the repository still uses Node-based `.test.mjs` scripts rather than a full test runner.
- Confirm `scripts/test-alias-loader.mjs` still resolves `$lib` aliases.
- Confirm `package.json` scripts are still the correct place to expose small test commands.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- The repository has moved to a different test framework and adding a Node `.test.mjs` file would be inconsistent.
- `normalizeAppData()` is no longer the right unit to test home text normalization.
- Adding a package script conflicts with a newer consolidated test command.
- The implementation agent cannot run the verification commands in the current environment; in that case, report exactly which commands could not be run and why.
