# Phase 3 — Render the linked-notes panel in QuickTextsView

## Single objective

Add the bottom linked-notes UI to the global **Textos Rápidos** page and wire it to the new Quick Texts state operations.

## Expected behavior

After this phase, the Quick Texts view shows a bottom section where the user can:

- Click **Enlazar nota**.
- Search available notes by title, content preview, or category path.
- Filter notes by category/subcategory using the existing linked-notes panel behavior.
- Link a note to the Quick Texts section.
- See linked notes as cards at the bottom.
- Open a linked note in the existing item editor.
- Remove/unlink a linked note from the Quick Texts section without deleting it.

The existing Quick Texts features must continue to work:

- grouped/list toggle
- create quick text
- create quick text group
- copy quick text
- edit quick text
- delete quick text
- remove quick text from a group
- move quick text/group ordering

## Files/components involved

Expected files:

- `src/lib/views/QuickTextsView.svelte`
- `src/lib/components/flows/GlobalFlowLinkedNotes.svelte`
- `src/lib/store/appState.svelte.ts`
- `src/lib/utils/noteUtils.ts`
- `src/lib/store/types.ts`

Optional only if needed:

- A thin wrapper component such as `src/lib/components/quick-texts/QuickTextLinkedNotes.svelte`

## Implementation details

### 1. Reuse the existing linked-notes panel

The existing `GlobalFlowLinkedNotes.svelte` is visually and functionally generic even though its name is flow-specific. It accepts:

```ts
appData
linkedNoteIds
onlinknote
onunlinknote
onopennote
```

For lowest risk, use it directly in `QuickTextsView.svelte`.

Do **not** rename or move the existing component in this phase, because that would create unnecessary risk for the Flows view.

A future cleanup may extract/rename it to `GlobalLinkedNotes.svelte`, but that is not part of this task.

### 2. Update imports in QuickTextsView

Add imports from `appState.svelte.ts`:

```ts
getItemIndex,
linkNoteToGlobalQuickTexts,
openItemEditor,
unlinkNoteFromGlobalQuickTexts,
```

Add import:

```ts
import GlobalFlowLinkedNotes from "$lib/components/flows/GlobalFlowLinkedNotes.svelte";
```

Add import:

```ts
import { getNoteById } from "$lib/utils/noteUtils";
```

### 3. Add derived linked-note IDs

Inside `QuickTextsView.svelte`:

```ts
const globalQuickTextLinkedNoteIds = $derived(
  appState.appData?.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__ ?? [],
);
```

### 4. Add open-linked-note handler

Inside `QuickTextsView.svelte`, add:

```ts
function openLinkedNote(noteId: string): void {
  if (!appState.appData) {
    return;
  }

  const note = getNoteById(appState.appData, noteId);

  if (!note) {
    return;
  }

  openItemEditor({
    editingItem: note,
    editingIndex: getItemIndex(note),
  });
}
```

This mirrors the existing global Flows behavior.

### 5. Render the panel at the bottom

Inside the scrollable content area in `QuickTextsView.svelte`, after the grouped/list Quick Texts content block, render:

```svelte
<GlobalFlowLinkedNotes
  appData={appState.appData}
  linkedNoteIds={globalQuickTextLinkedNoteIds}
  onlinknote={(noteId) => void linkNoteToGlobalQuickTexts(noteId)}
  onunlinknote={(noteId) => void unlinkNoteFromGlobalQuickTexts(noteId)}
  onopennote={(noteId) => openLinkedNote(noteId)}
/>
```

Place it at the bottom of the same scroll container so it behaves like the Flows page lower linked-notes section.

### 6. Empty-state behavior

Even when there are no quick texts and no quick text groups, the user should still be able to access the linked-notes section below the empty-state message.

Do not hide the linked-notes panel behind `quickTexts.length > 0`.

## Success criteria

- The Quick Texts page displays a bottom linked-notes section.
- The panel appears even when there are no quick texts.
- Clicking **Enlazar nota** shows available notes.
- Linked notes are excluded from available-note options after linking.
- Linked notes persist after reload.
- Clicking a linked note opens the original note in the existing item editor.
- Clicking the trash icon removes the note only from the Quick Texts linked-notes section.
- The original note remains visible in its original category/subcategory.
- Flows page linked notes still work exactly as before.
- Existing Quick Texts create/edit/copy/delete/group actions still work.

## How to verify

Run:

```bash
pnpm check
pnpm dev
```

Manual UI verification:

1. Create at least one note inside a category/subcategory.
2. Open **Textos Rápidos**.
3. Scroll to the bottom.
4. Click **Enlazar nota**.
5. Link the note.
6. Reload the app.
7. Confirm the note remains linked in the Quick Texts section.
8. Click the linked note card.
9. Confirm the original note opens in the item editor.
10. Return to **Textos Rápidos**.
11. Click the trash icon on the linked note card.
12. Confirm the linked note card disappears.
13. Go to the original category/subcategory.
14. Confirm the original note still exists.

Regression verification:

1. Open **Flujos**.
2. Confirm its bottom linked-notes panel still behaves normally.
3. Open **Textos Rápidos** and verify existing grouped/list quick text behavior.

## Observable failure signals

- Quick Texts view crashes when `appState.appData` is loaded.
- Linked-notes panel is hidden when there are no quick texts.
- Linking a note in Quick Texts also links it to Flows.
- Unlinking a Quick Texts note deletes the original note.
- Opening a linked note opens the wrong item or fails silently.
- Existing Quick Texts dialogs stop opening.
- Existing Flows linked-note panel changes unexpectedly.

## Preconditions before implementation

- Phase 1 and Phase 2 are implemented and verified.
- `linkNoteToGlobalQuickTexts` and `unlinkNoteFromGlobalQuickTexts` are exported.
- `GlobalFlowLinkedNotes.svelte` still accepts the expected props.
- `getNoteById`, `getItemIndex`, and `openItemEditor` still work as in the Flows view.

## Stop conditions if the plan does not match the real codebase

Stop before editing if:

- `QuickTextsView.svelte` has been replaced by another component/view.
- The Flows linked-notes component has become tightly flow-specific and can no longer be reused safely.
- The app now requires a different navigation API to open notes.
- Product behavior requires linked notes per individual quick text instead of global to the Quick Texts section.
