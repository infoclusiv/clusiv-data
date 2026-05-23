# Phase 4 — Add tests and final regression verification

## Single objective

Add focused automated coverage for Quick Texts linked-note data normalization and complete final regression verification across Quick Texts, Notes, Flows, and persistence.

## Expected behavior

After this phase:

- Automated tests prove invalid linked-note IDs are filtered.
- Automated tests prove duplicate linked-note IDs are deduplicated.
- Automated tests prove only valid notes can remain linked.
- Manual verification proves unlinking from Quick Texts is non-destructive.
- Existing test commands still pass.
- The implementation agent has a clear final report of what changed and what was verified.

## Files/components involved

Expected files:

- `src/lib/utils/quickTexts.test.mjs` or a new file such as `src/lib/utils/linkedNotes.test.mjs`
- `package.json`
- `src/lib/utils/categoryUtils.ts`
- `src-tauri/src/commands/data.rs` tests if backend coverage is added

Do not add broad end-to-end infrastructure unless it already exists.

## Implementation details

### 1. Frontend normalization test

Add a small Node-based test, following the existing style in `src/lib/utils/quickTexts.test.mjs`.

Recommended new file:

```txt
src/lib/utils/linkedNotes.test.mjs
```

Import `normalizeAppData` from `./categoryUtils.ts`.

Test data should include:

- one valid note item
- one task item
- one missing/ghost note ID
- duplicate valid note IDs
- the new field `__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__`

Assertions:

- Result contains the valid note ID only once.
- Result does not contain the task ID.
- Result does not contain the missing ID.
- The valid original note still exists in `__SYSTEM_TASKS__`.

### 2. Add package script

In `package.json`, add:

```json
"test:linked-notes": "node --experimental-strip-types src/lib/utils/linkedNotes.test.mjs"
```

Optionally add a grouped script:

```json
"test:quick-texts-linked-notes": "pnpm test:quick-texts && pnpm test:linked-notes"
```

Keep existing scripts unchanged.

### 3. Backend test coverage

If low-risk, add or extend a Rust unit test in `src-tauri/src/commands/data.rs` to prove backend `normalize_data()`:

- defaults missing `__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__` to `[]`
- deduplicates the field
- filters unknown IDs and task IDs
- preserves valid note IDs

Do not expose private functions solely for tests unless the existing test module can already access them.

### 4. Final regression run

Run:

```bash
pnpm check
pnpm test:quick-texts
pnpm test:linked-notes
pnpm test:flow-layout
pnpm test:flow-graph
cargo test --manifest-path src-tauri/Cargo.toml
```

If the repo has a build pipeline available locally, also run:

```bash
pnpm build
```

### 5. Final manual verification

Repeat the manual UI flow from Phase 3 after all tests pass.

## Success criteria

- New linked-note normalization tests pass.
- Existing Quick Texts tests pass.
- Existing flow tests pass.
- `pnpm check` passes.
- Rust tests pass.
- The app can link notes in Quick Texts.
- The app can unlink notes in Quick Texts without deleting original notes.
- Existing Flows linked-notes behavior remains unchanged.
- Existing Quick Texts grouped/list behavior remains unchanged.
- The implementation agent can report exact commands run and results.

## How to verify

Automated:

```bash
pnpm check
pnpm test:quick-texts
pnpm test:linked-notes
pnpm test:flow-layout
pnpm test:flow-graph
cargo test --manifest-path src-tauri/Cargo.toml
```

Manual:

1. Create a note in a category.
2. Link it from **Textos Rápidos**.
3. Reload the app.
4. Confirm the link persists.
5. Remove/unlink it from **Textos Rápidos**.
6. Confirm it disappears from the Quick Texts linked-notes panel.
7. Confirm the original note still exists in its category.
8. Link a different note in **Flujos**.
9. Confirm Quick Texts and Flows use independent linked-note lists.

## Observable failure signals

- Tests fail because the new AppData field is undefined.
- Tests show task IDs can be linked as notes.
- Tests show duplicate linked-note IDs persist.
- Manual test shows the original note is deleted after unlinking.
- Manual test shows Quick Texts and Flows share the same linked-note list.
- `save_data` drops the new field after reload.
- `pnpm check` reports Svelte prop or import errors.
- `cargo test` fails because Rust `AppData` construction is incomplete.

## Preconditions before implementation

- Phases 1–3 are implemented and verified.
- The app can run locally.
- Existing tests can run locally.
- The implementation agent has not introduced broad refactors outside the requested scope.

## Stop conditions if the plan does not match the real codebase

Stop and report if:

- Existing test style has changed and there is no straightforward place for a focused normalization test.
- `normalizeAppData` is no longer importable from a Node test.
- Backend tests cannot access `normalize_data()` anymore.
- Test failures reveal a pre-existing persistence bug unrelated to Quick Texts linked notes.
