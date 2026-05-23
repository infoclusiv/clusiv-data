# Phase 2 — Add frontend state operations for Quick Texts linked notes

## Single objective

Add small frontend state functions that link, unlink, validate, and persist note IDs for the global **Textos Rápidos** linked-notes section.

## Expected behavior

After this phase, code can call state operations to:

- Replace the full Quick Texts linked-note ID list.
- Link one existing note ID to the Quick Texts section.
- Unlink one note ID from the Quick Texts section.
- Deduplicate linked note IDs.
- Filter linked note IDs to valid notes only.
- Persist all changes through the existing `persistData()` path.
- Leave the original note untouched in `__SYSTEM_TASKS__`.

No UI is required in this phase.

## Files/components involved

Expected files:

- `src/lib/store/appState.svelte.ts`
- `src/lib/store/types.ts`
- `src/lib/utils/noteUtils.ts` only if a small helper is justified
- `src/lib/utils/categoryUtils.ts` only if Phase 1 normalization needs minor follow-up

## Implementation details

### 1. Add three exported operations

In `src/lib/store/appState.svelte.ts`, add functions analogous to the global flow linked-notes functions:

```ts
export async function updateGlobalQuickTextLinkedNotes(noteIds: string[]): Promise<void>
export async function linkNoteToGlobalQuickTexts(noteId: string): Promise<void>
export async function unlinkNoteFromGlobalQuickTexts(noteId: string): Promise<void>
```

Keep them near:

```ts
updateGlobalFlowLinkedNotes
linkNoteToGlobalFlows
unlinkNoteFromGlobalFlows
```

### 2. Validation behavior

`updateGlobalQuickTextLinkedNotes()` should:

1. Call `requireAppData()`.
2. Build `validNoteIds` from `appData.__SYSTEM_TASKS__` where `item.type === "note"`.
3. Assign:

```ts
appData.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__ = [...new Set(noteIds)]
  .filter((noteId) => validNoteIds.has(noteId));
```

4. Log a concise event using the existing logging convention.
5. Call `persistData()`.

### 3. Link behavior

`linkNoteToGlobalQuickTexts(noteId)` should append the incoming note ID to the existing list and delegate to `updateGlobalQuickTextLinkedNotes()`.

### 4. Unlink behavior

`unlinkNoteFromGlobalQuickTexts(noteId)` should filter the incoming note ID out of the existing list and delegate to `updateGlobalQuickTextLinkedNotes()`.

This is the key non-destructive behavior. It must only remove the ID from `__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__`.

### 5. Logging

Use source/action names that are easy to search in exported logs, for example:

- source: `globalQuickTexts`
- action: `global_quick_text_linked_notes_updated`

Context should include at least:

```ts
{
  linkedNoteCount: appData.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__.length
}
```

Avoid logging note content.

## Success criteria

- The three functions are exported from `appState.svelte.ts`.
- Linking a valid note adds its ID once.
- Linking the same note twice does not duplicate it.
- Linking a task ID or missing ID does not persist it.
- Unlinking a note removes only its ID from the Quick Texts linked-note field.
- Unlinking does not remove any item from `__SYSTEM_TASKS__`.
- `persistData()` is called after successful updates.
- Existing global flow linked-note functions are unchanged.

## How to verify

Recommended checks:

```bash
pnpm check
```

Manual/agent verification:

1. Inspect `appState.svelte.ts` and confirm the new functions mirror the existing global flow functions.
2. Use a temporary local test harness or debugger to simulate:
   - app data with two notes and one task
   - call `linkNoteToGlobalQuickTexts(noteId)`
   - call `unlinkNoteFromGlobalQuickTexts(noteId)`
3. Confirm:
   - the note item remains in `__SYSTEM_TASKS__`
   - only the ID array changes
   - invalid IDs are filtered out

## Observable failure signals

- `pnpm check` reports missing fields or exports.
- Calling unlink removes the note from `__SYSTEM_TASKS__`.
- Calling link creates duplicate IDs.
- Calling link persists task IDs as if they were notes.
- Exported logs contain note body text or sensitive content.
- Existing flow linked-note behavior changes.

## Preconditions before implementation

- Phase 1 is implemented and verified.
- `__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__` exists in `AppData`.
- `persistData()` and `requireAppData()` still exist.
- Existing global flow linked-note functions still exist as the implementation pattern.

## Stop conditions if the plan does not match the real codebase

Stop before editing if:

- `appState.svelte.ts` no longer owns persistence mutations.
- `persistData()` no longer persists the active app data snapshot.
- Existing global flow linked-note functions were removed or significantly redesigned.
- Note identity is no longer based on `Item.id`.
