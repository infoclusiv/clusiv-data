# Phase 1 — Add durable home text to the shared app data schema

## Single objective

Add a persisted home/motivation text field to the app’s shared data model so the text survives save/load cycles and app restarts.

## Expected behavior

- Existing `data.json` files load successfully without manual migration.
- After loading, app data contains a string field for the home text.
- New/default app data includes a default motivational text.
- The frontend and Tauri backend agree on the same schema field name.
- Saving app data does not drop the home text.

Recommended field name: `__SYSTEM_HOME_TEXT__`.

## Success criteria

- `AppData` in TypeScript includes `__SYSTEM_HOME_TEXT__: string`.
- Rust `AppData` includes a matching `home_text` field with `#[serde(rename = "__SYSTEM_HOME_TEXT__", default)]`.
- Frontend default data and normalization populate the home text when it is missing or invalid.
- Backend default data and `normalize_data()` populate the home text when it is missing or invalid.
- The schema version is bumped consistently in both frontend and backend constants.
- `pnpm check` passes.
- A manual save/load cycle preserves the home text in `data.json`.

## How to verify

1. Inspect current schema files before editing:
   - `src/lib/store/types.ts`
   - `src/lib/utils/constants.ts`
   - `src/lib/utils/categoryUtils.ts`
   - `src-tauri/src/models/app_data.rs`
   - `src-tauri/src/commands/data.rs`
2. Implement the shared field.
3. Run:
   ```bash
   pnpm check
   ```
4. Run the app in dev mode and confirm `load_data` returns app data with `__SYSTEM_HOME_TEXT__`.
5. Trigger any existing app data save path and confirm the saved `data.json` still contains `__SYSTEM_HOME_TEXT__`.
6. Temporarily test an older `data.json` without the field and confirm it is normalized with the default value.

## Observable failure signals

- TypeScript errors saying `__SYSTEM_HOME_TEXT__` does not exist on `AppData`.
- Rust compile errors around `AppData` construction.
- `save_data` succeeds but `data.json` does not contain the new field.
- The field appears after load but disappears after save/restart.
- The app repeatedly rewrites normalized data on every startup because the frontend and backend defaults differ.
- Logs show `load_app_data_failed`, `load_data_parse_failed`, `save_data_serialize_failed`, or `save_data_write_failed` after this change.

## Files/components involved

- `src/lib/store/types.ts`
- `src/lib/utils/constants.ts`
- `src/lib/utils/categoryUtils.ts`
- `src-tauri/src/models/app_data.rs`
- `src-tauri/src/commands/data.rs`
- Optional only if needed: `data.json` for local manual verification, not for committed test data unless the repository already tracks it intentionally.

## Preconditions before implementation

- Confirm `SCHEMA_VERSION` is currently defined in both frontend and backend.
- Confirm backend `normalize_data()` currently constructs a new `AppData` from known keys.
- Confirm no existing home/motivation/settings field already exists.
- Confirm the repo still uses `load_data` and `save_data` as the durable app data path.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- A home text/settings feature already exists under another name.
- The backend no longer owns durable persistence through `AppData`.
- `AppData` has moved or no longer maps directly between TypeScript and Rust.
- The schema version/migration strategy has changed and requires a different migration approach.
- The implementation would require broad data model refactors beyond adding one string field.
