import type { AppData } from "$lib/store/types";

/**
 * Delete a stored note rather than merely unlinking it from one concept.
 * Run inside the existing atomic app-data transaction. Every reference must
 * be removed, including the saved map-card coordinates and flow references.
 */
export function deleteNoteEverywhere(draft: AppData, noteId: string): void {
  const index = draft.__SYSTEM_TASKS__.findIndex((item) => item.id === noteId && item.type === "note");
  if (index < 0) throw new Error("La nota ya no existe.");

  draft.__SYSTEM_TASKS__.splice(index, 1);

  for (const concept of draft.__SYSTEM_CONCEPT_NODES__) {
    concept.linked_note_ids = concept.linked_note_ids.filter((id) => id !== noteId);
    delete concept.note_positions[noteId];
  }

  for (const flow of draft.__SYSTEM_FLOWS__) {
    flow.linked_note_ids = flow.linked_note_ids.filter((id) => id !== noteId);
    for (const node of flow.nodes) {
      node.linked_note_ids = node.linked_note_ids.filter((id) => id !== noteId);
    }
  }

  draft.__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__ =
    draft.__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__.filter((id) => id !== noteId);
  draft.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__ =
    draft.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__.filter((id) => id !== noteId);
}
