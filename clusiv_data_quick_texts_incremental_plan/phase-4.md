# Phase 4 — Add Backwards-Compatible Per-Group Quick Text Ordering Data

## Single objective

Introduce a backwards-compatible data model for ordering quick texts independently inside each group, without changing the UI controls yet.

## Expected behavior

- Each `QuickText` can store per-group ordering without breaking existing data.
- Existing data without the new field still loads and normalizes correctly.
- Existing `sort_order` remains available as legacy/fallback ordering.
- Existing `group_id` remains a legacy compatibility mirror of the first group.
- The app can compute a quick text's order for a specific group without affecting its order in another group.
- No visible move-text UI is required yet in this phase.

## Success criteria

- Frontend `QuickText` type includes a backwards-compatible per-group order structure, recommended:

```ts
group_sort_orders: Record<string, number>;
```

- Rust `QuickText` model includes the same field with serde default, recommended:

```rust
#[serde(default)]
pub group_sort_orders: HashMap<String, i32>,
```

- Frontend normalization initializes and sanitizes `group_sort_orders` for valid `group_ids`.
- Rust normalization initializes and sanitizes `group_sort_orders` for valid quick text groups.
- Schema version is bumped consistently in:
  - `src/lib/utils/constants.ts`
  - `src-tauri/src/models/app_data.rs`
- Existing quick texts get a group order value for every effective group membership.
- Orphan `group_sort_orders` entries for groups the text no longer belongs to are removed during normalization.
- `pnpm check` passes.
- `pnpm build` passes.

## How to verify

1. Prepare data with:
   - Quick text assigned to one group and no `group_sort_orders`.
   - Quick text assigned to two groups and no `group_sort_orders`.
   - Quick text with an orphan `group_sort_orders` entry for a non-existing group.
2. Run the app or invoke data load through normal startup.
3. Confirm data loads successfully.
4. Confirm normalized data has `group_sort_orders` only for valid group memberships.
5. Confirm the app still renders grouped and list quick texts.
6. Confirm edit/save of a quick text preserves valid group order data.
7. Run:

```bash
pnpm check
pnpm build
```

## Observable failure signals

- Existing `data.json` fails to deserialize in Rust.
- Existing quick texts disappear after normalization.
- A quick text in multiple groups has only one order value and cannot later be sorted independently per group.
- `group_id` legacy field stops syncing.
- `sort_order` disappears from saved data unexpectedly.
- Schema version differs between frontend and Rust.
- Svelte check/build fails.

## Files/components involved

Primary frontend:

- `src/lib/store/types.ts`
- `src/lib/utils/categoryUtils.ts`
- `src/lib/store/appState.svelte.ts`
- `src/lib/utils/constants.ts`

Primary backend:

- `src-tauri/src/models/app_data.rs`
- `src-tauri/src/commands/data.rs`

Possible secondary:

- Any existing sample `data.json` only if the repository includes one and tests require it. Do not manually rewrite user data unless the app migration/normalization flow performs it.

## Preconditions before implementation

- Phases 1 through 3 must be implemented and verified.
- Confirm `QuickText` still has `group_ids`, `group_id`, and `sort_order`.
- Confirm Rust and frontend schema versions are still both `13` before this phase, or identify the current shared schema version and bump from that value.
- Confirm the backend `normalize_data()` path is still responsible for migration/normalization.

## Implementation notes

Recommended model:

```ts
interface QuickText {
  id: string;
  title: string;
  content: string;
  group_ids: string[];
  group_id: string | null;
  sort_order: number;
  group_sort_orders: Record<string, number>;
}
```

Rationale:

- It preserves the current quick text object model.
- It avoids introducing a new membership table in one risky step.
- It allows different ordering for the same quick text in different groups.
- It keeps old data compatible because the field can default to `{}`.

Frontend helper recommendations:

- Add a helper that normalizes group sort orders against effective group ids:

```ts
export function normalizeQuickTextGroupSortOrders(
  quickText: Pick<QuickText, "group_ids" | "group_id" | "sort_order"> & {
    group_sort_orders?: unknown;
  },
): Record<string, number> { ... }
```

- Add a helper for reading a group-specific order:

```ts
export function getQuickTextGroupSortOrder(
  quickText: QuickText,
  groupId: string | null,
): number { ... }
```

- For `groupId === null` / `Textos sin grupo`, continue using `sort_order` unless a deliberate ungrouped order model is added later.

Rust normalization recommendations:

- Parse optional `group_sort_orders` object from JSON.
- Keep only finite integer values.
- Keep only entries whose key is in the quick text's final `group_ids` and in the valid quick text group set.
- For missing entries, initialize from existing `sort_order` or fallback index.
- Keep `sort_order` as a legacy/fallback/primary-order value.

Important: do **not** add UI move controls in this phase. This phase is only about safe schema and normalization groundwork.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- The repository already has a many-to-many membership/order model separate from `QuickText`.
- Backend deserialization is generated from TypeScript or another schema source and should not be manually duplicated.
- There is a formal migration system not reflected in `commands/data.rs`.
- The schema version has already advanced and there is a pending migration requiring coordination.
