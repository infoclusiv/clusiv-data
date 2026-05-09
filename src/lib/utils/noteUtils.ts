import type { AppData, FlowNode, Item } from "$lib/store/types";
import {
  getCategoryBreadcrumb,
  getItemDisplayTitle,
  getItemPreview,
  getTasks,
} from "$lib/utils/categoryUtils";

export interface NoteOption {
  id: string;
  title: string;
  preview: string;
  categoryId: string;
  categoryPath: string;
}

export function getAllNotes(appData: AppData): Item[] {
  return getTasks(appData).filter((item) => item.type === "note");
}

export function getNoteById(appData: AppData, noteId: string): Item | null {
  return getAllNotes(appData).find((item) => item.id === noteId) ?? null;
}

export function getLinkedNotesByIds(appData: AppData, linkedNoteIds: string[]): Item[] {
  const notesById = new Map(getAllNotes(appData).map((note) => [note.id, note]));

  return linkedNoteIds
    .map((noteId) => notesById.get(noteId) ?? null)
    .filter((note): note is Item => note !== null);
}

export function getGlobalFlowLinkedNotes(appData: AppData): Item[] {
  return getLinkedNotesByIds(
    appData,
    appData.__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__ ?? [],
  );
}

export function getLinkedNotesForNode(appData: AppData, node: FlowNode): Item[] {
  return getLinkedNotesByIds(appData, node.linked_note_ids ?? []);
}

export function getNoteOptions(appData: AppData): NoteOption[] {
  return getAllNotes(appData).map((note) => ({
    id: note.id,
    title: getItemDisplayTitle(note),
    preview: getItemPreview(note.comment, 160),
    categoryId: note.category_id,
    categoryPath: getCategoryBreadcrumb(appData, note.category_id),
  }));
}
