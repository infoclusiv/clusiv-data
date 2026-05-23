# Phase 6 — Add Targeted Regression Tests and Final Verification

## Single objective

Add or update targeted tests/checks for quick text grouping behavior, membership removal, and per-group ordering, then run final verification.

## Expected behavior

- Tests cover the highest-risk behavior introduced by the feature.
- Tests can run with existing project tooling and do not require external services.
- Test coverage focuses on pure helper/store logic where possible.
- Existing app build/check still passes.

## Success criteria

- A quick text test script exists in `package.json`, recommended:

```json
"test:quick-texts": "node --experimental-strip-types src/lib/utils/quickTexts.test.mjs"
```

or another project-consistent path/name.

- Tests verify at least:
  - A text assigned to multiple groups can have different order values per group.
  - Removing a text from one group leaves it in other groups.
  - Removing the last group from a text makes it ungrouped and syncs `group_id` to `null`.
  - Group-specific sort ignores orphan/invalid order entries after normalization.
  - Existing legacy `sort_order` remains usable as fallback.
- `pnpm test:quick-texts` passes.
- `pnpm check` passes.
- `pnpm build` passes.

## How to verify

1. Run:

```bash
pnpm test:quick-texts
pnpm check
pnpm build
```

2. Manually verify the full feature path:
   - Grouped view shows one-column collapsed groups.
   - Click group header expands/collapses downward.
   - Group action buttons are icon-only.
   - Quick text edit action is icon-only.
   - Removing a text from one group does not delete it globally.
   - Moving text order in one group does not alter order in another group.
   - Reload preserves membership and order.

## Observable failure signals

- Tests require a browser/Tauri runtime when they should be pure logic tests.
- Tests pass but manual grouped UI behavior fails.
- `pnpm check` fails because test imports do not resolve Svelte aliases.
- `pnpm build` fails because test-only code is included incorrectly in production bundle.
- Tests mutate real `data.json`.
- Tests depend on timing, local storage, or clipboard.

## Files/components involved

Primary:

- `package.json`
- `src/lib/utils/categoryUtils.ts`
- New test file, recommended: `src/lib/utils/quickTexts.test.mjs`

Possible secondary:

- A small pure helper module, for example `src/lib/utils/quickTextOrdering.ts`, only if direct testing of current helpers is awkward because they live inside Svelte/store modules.

## Preconditions before implementation

- Phases 1 through 5 must be implemented and verified.
- The final names of helper functions and mutation functions must be known.
- Confirm the current project uses node-based tests with `--experimental-strip-types` for TypeScript utility tests.
- Confirm `pnpm` is available in the implementation environment.

## Implementation notes

Recommended low-risk test design:

1. Prefer pure helper tests over UI tests.
2. Avoid importing Svelte components in Node tests.
3. If necessary, extract pure group/order helper functions from `QuickTextsGroupedView.svelte` or `appState.svelte.ts` into a utility module that can be tested without Tauri or Svelte runtime side effects.
4. Keep test fixtures small and explicit.
5. Do not read or write the real `data.json`.

Example test cases:

- `getQuickTextGroupSortOrder()` returns a group-specific order when present.
- `getQuickTextGroupSortOrder()` falls back to `sort_order` for legacy data.
- Normalization removes `group_sort_orders` keys not present in `group_ids`.
- Sorting Group A and Group B with the same two texts can produce different orders.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- The repository has migrated to a different test runner and `node --experimental-strip-types` is no longer appropriate.
- Utility functions cannot be imported safely without initializing Tauri/Svelte state.
- Product direction forbids adding tests in this change set.
- Earlier phases were intentionally implemented without a per-group order model, making these tests invalid.
