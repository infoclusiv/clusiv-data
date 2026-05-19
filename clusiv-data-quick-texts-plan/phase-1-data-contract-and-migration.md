# Phase 1 — Add backward-compatible multi-group data contract

## Objective

Introduce a backward-compatible data contract that allows a quick text to belong to multiple groups, without changing the visible UI behavior yet.

This phase should make the app capable of loading, normalizing, saving, and preserving a new `group_ids: string[]` field while still accepting existing saved data that only contains `group_id`.

## Expected behavior

- Existing quick texts with `group_id: "some_group"` are normalized to `group_ids: ["some_group"]`.
- Existing ungrouped quick texts with `group_id: null` become `group_ids: []`.
- New-format quick texts with `group_ids: ["g1", "g2"]` survive load/save without losing membership.
- Invalid group ids are removed from `group_ids` during normalization.
- Duplicate group ids are deduplicated while preserving order.
- Existing UI should continue to work during this phase, even if it still uses the first group as the effective group.

## Files/components involved

Frontend:

- `src/lib/store/types.ts`
- `src/lib/utils/categoryUtils.ts`
- `src/lib/store/appState.svelte.ts`

Backend:

- `src-tauri/src/models/app_data.rs`
- `src-tauri/src/commands/data.rs`
- `src/lib/utils/constants.ts`

## Preconditions before implementation

- Confirm `QuickText` still has `group_id: string | null` in `src/lib/store/types.ts`.
- Confirm Rust `QuickText` still has `group_id: Option<String>` in `src-tauri/src/models/app_data.rs`.
- Confirm frontend normalization is still handled in `normalizeQuickText` / `normalizeAppData` in `src/lib/utils/categoryUtils.ts`.
- Confirm backend normalization is still handled in `quick_text_from_value` / `normalize_data` in `src-tauri/src/commands/data.rs`.

## Implementation steps

### 1. Update TypeScript quick text type

In `src/lib/store/types.ts`, extend `QuickText` with a new multi-group field:

```ts
group_ids: string[];
```

Keep the legacy `group_id: string | null` temporarily during migration compatibility. Mark it with a comment such as:

```ts
// Legacy compatibility field. Prefer group_ids for new logic.
```

Do not remove `group_id` in this phase.

### 2. Update TypeScript form input contract

In `QuickTextFormInput`, add:

```ts
group_ids?: string[];
```

Keep `group_id?: string | null` temporarily so existing callers continue to compile.

### 3. Add helper normalization utilities in `categoryUtils.ts`

Add helper logic to resolve quick text group ids from either old or new shapes:

- Read `candidate.group_ids` if it is an array.
- Read `candidate.group_id` if it is a non-empty string and append it if not already present.
- Trim invalid/empty ids.
- Dedupe ids.
- During `normalizeAppData`, filter `group_ids` to only valid quick text group ids.
- Keep `group_id` synchronized to the first valid group id or `null`.

Recommended helper names:

- `normalizeQuickTextGroupIds(...)`
- `syncLegacyQuickTextGroupId(...)`

### 4. Update Rust quick text model

In `src-tauri/src/models/app_data.rs`, extend `QuickText` with:

```rust
#[serde(default)]
pub group_ids: Vec<String>,
```

Keep `group_id: Option<String>` temporarily for backward compatibility.

### 5. Update backend JSON parsing and normalization

In `src-tauri/src/commands/data.rs`:

- Update `quick_text_from_value` to read both `group_ids` and `group_id`.
- Add helper logic equivalent to frontend:
  - parse array of strings from `group_ids`;
  - append legacy `group_id` when valid;
  - dedupe;
  - keep `group_id` equal to first valid group id or `None`.
- In `normalize_data`, filter each quick text's `group_ids` against `valid_quick_text_group_ids`.
- Keep `group_id` synchronized after filtering.

### 6. Bump schema version carefully

In both places, increment the schema version from `12` to `13`:

- `src/lib/utils/constants.ts`
- `src-tauri/src/models/app_data.rs`

Only do this after migration logic is implemented.

### 7. Add or update backend tests

In `src-tauri/src/commands/data.rs`, add tests covering:

- legacy `group_id` becomes `group_ids`;
- invalid group ids are removed;
- duplicate group ids are deduplicated;
- `group_id` remains synchronized with the first `group_ids` value.

## Success criteria

- Existing data with only `group_id` loads successfully.
- New data with `group_ids` loads and saves without losing multiple memberships.
- `pnpm run check` passes.
- `pnpm run build` passes.
- `cargo test` passes if available.
- The existing grouped quick texts UI still renders without crashing.

## How to verify

1. Create or inspect a sample `data.json` quick text with:

```json
{
  "id": "qt1",
  "title": "Sample",
  "content": "Sample content",
  "group_id": "group_a",
  "sort_order": 1
}
```

After load/normalization, it should contain:

```json
"group_ids": ["group_a"]
```

and still keep:

```json
"group_id": "group_a"
```

2. Test a quick text with:

```json
"group_ids": ["group_a", "group_b", "group_a", "missing_group"]
```

Expected normalized output:

```json
"group_ids": ["group_a", "group_b"],
"group_id": "group_a"
```

3. Launch the app and open **Textos Rápidos**. Existing single-group rendering should still work.

## Observable failure signals

- App fails to load data after schema version bump.
- `QuickTextsView` crashes because `group_id` is missing or `group_ids` is undefined.
- Saved `data.json` drops existing group membership.
- Backend logs show `load_data_parse_failed`, `load_data_normalized_save_failed`, or `save_data_serialize_failed`.
- Frontend logs show `load_app_data_failed` or `persist_data_failed`.

## Stop conditions

Stop before coding and report if:

- `QuickText` no longer uses `group_id` in the current repository.
- The data model has already been migrated to a different relationship structure.
- `SCHEMA_VERSION` is no longer defined in both frontend and backend.
- `normalizeAppData` or `normalize_data` has been removed or replaced by another persistence layer.
- Any backend persistence file path differs from this plan and the correct migration point is unclear.
