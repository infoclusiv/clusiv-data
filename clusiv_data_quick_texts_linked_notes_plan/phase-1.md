# Phase 1 — Add the Quick Texts linked-notes data contract

## Single objective

Add a persistent AppData field for notes linked to the global **Textos Rápidos** section, including frontend types, frontend normalization, backend Rust models, backend normalization, and schema version bump.

## Expected behavior

After this phase, the app data model supports:

```ts
__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: string[];
```

The field must:

- Exist in newly created/default data.
- Be loaded from existing `data.json` files when present.
- Default to an empty array when missing.
- Deduplicate note IDs.
- Filter out IDs that do not belong to valid notes.
- Persist through `save_data` without being dropped by the Rust backend.
- Not affect existing flows, quick texts, groups, tasks, categories, notes, or links.

No UI is required in this phase.

## Files/components involved

Expected files:

- `src/lib/store/types.ts`
- `src/lib/utils/constants.ts`
- `src/lib/utils/categoryUtils.ts`
- `src-tauri/src/models/app_data.rs`
- `src-tauri/src/commands/data.rs`

Possibly affected by validation:

- `src/lib/store/appState.svelte.ts`
- `package.json`
- `src-tauri/Cargo.toml`

## Implementation details

### 1. Frontend type update

In `src/lib/store/types.ts`, extend `AppData`:

```ts
__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: string[];
```

Keep it near `__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__` for discoverability.

### 2. Frontend default data

In `src/lib/utils/categoryUtils.ts`, update `createDefaultAppData()` so new data includes:

```ts
__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: [],
```

### 3. Frontend normalization

In `normalizeAppData()`:

1. Normalize the new field using the same private `normalizeLinkedNoteIds()` helper used by flows.
2. After valid note IDs are computed, filter the new field against `validNoteIds`, just like `__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__`.

Suggested pattern:

```ts
normalized.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__ = normalizeLinkedNoteIds(
  (normalized as Partial<AppData>).__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__,
);
```

Then later:

```ts
normalized.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__ =
  normalized.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__.filter((noteId) =>
    validNoteIds.has(noteId)
  );
```

### 4. Schema version bump

Increment schema version from `14` to `15` in both places:

- `src/lib/utils/constants.ts`
- `src-tauri/src/models/app_data.rs`

Do not skip the backend constant. Both sides must agree.

### 5. Rust AppData model

In `src-tauri/src/models/app_data.rs`:

1. Add a field to `AppData`:

```rust
#[serde(rename = "__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__", default)]
pub global_quick_text_linked_note_ids: Vec<String>,
```

2. Add `global_quick_text_linked_note_ids: Vec::new()` to `AppData::default_data()`.

Do not add nested note copies.

### 6. Rust persistence normalization

In `src-tauri/src/commands/data.rs`:

1. Add a constant:

```rust
const GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS_KEY: &str = "__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__";
```

2. In `normalize_data()`, remove/read the new root key similarly to `GLOBAL_FLOW_LINKED_NOTE_IDS_KEY`.
3. Default it to an empty array and set `changed = true` when missing.
4. After `valid_note_ids` exists, apply:

```rust
let global_quick_text_linked_note_ids = filter_known_note_ids(
    dedupe_string_values(
        string_array_value(Some(global_quick_text_linked_note_ids_value), &mut changed),
        &mut changed,
    ),
    &valid_note_ids,
    &mut changed,
);
```

5. Include it in the returned `AppData`.

### 7. Backend logging counts

Do not add verbose logging unless existing summaries are already being changed. Keep this phase focused.

## Success criteria

- TypeScript accepts the new `AppData` field.
- New/default app data includes `__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: []`.
- Loading old data without the field does not crash.
- Loading data with duplicate linked-note IDs stores each ID once.
- Loading data with invalid/non-note IDs removes them during normalization.
- Saving data does not drop the new field.
- Existing `__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__` behavior remains unchanged.

## How to verify

Run:

```bash
pnpm check
cargo test --manifest-path src-tauri/Cargo.toml
```

Manual data verification:

1. Create or inspect a sample `data.json` with:
   - at least one valid note item in `__SYSTEM_TASKS__`
   - one task item
   - duplicate note IDs in `__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__`
   - an invalid/missing note ID
2. Load the app or invoke backend normalization through existing tests.
3. Confirm the resulting data keeps only valid unique note IDs.
4. Confirm the original notes remain in `__SYSTEM_TASKS__`.

## Observable failure signals

- `pnpm check` reports missing `AppData` properties.
- Rust compilation fails because `AppData` construction is missing the new field.
- The app starts with default data every time because data parsing fails.
- `save_data` silently removes `__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__`.
- Linked-note IDs include tasks or missing IDs after normalization.
- Existing flow linked-note IDs are unexpectedly cleared.

## Preconditions before implementation

- Confirm current schema version is still `14`.
- Confirm `normalizeLinkedNoteIds()` exists in `src/lib/utils/categoryUtils.ts`.
- Confirm backend `normalize_data()` still filters global flow linked notes with `filter_known_note_ids`.
- Confirm notes are still stored in `__SYSTEM_TASKS__` with `type === "note"`.

## Stop conditions if the plan does not match the real codebase

Stop before editing if:

- `AppData` no longer exists in `src/lib/store/types.ts`.
- Backend `save_data` no longer accepts typed `AppData`.
- Frontend and backend schema versions are already different.
- There is already an equivalent Quick Texts linked-notes field with a different name.
- The app has migrated away from top-level system arrays/fields.
