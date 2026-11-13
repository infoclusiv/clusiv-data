import type { ConceptNode, Item } from "$lib/store/types";

export function moveNoteLink(
  concepts: ConceptNode[],
  items: readonly Item[],
  noteId: string,
  sourceConceptId: string,
  targetConceptId: string,
  position: { x: number; y: number },
): boolean {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Coordenadas inválidas.");
  }
  const source = concepts.find((node) => node.id === sourceConceptId);
  const target = concepts.find((node) => node.id === targetConceptId);
  if (!source || !target || source.category_id !== target.category_id) {
    throw new Error("Solo se pueden conectar notas entre conceptos del mismo mapa.");
  }
  if (!source.linked_note_ids.includes(noteId)) throw new Error("La relación ya no existe.");
  if (!items.some((item) => item.id === noteId && item.type === "note")) {
    throw new Error("La nota ya no existe.");
  }
  if (source.id === target.id) return false;
  source.linked_note_ids = source.linked_note_ids.filter((id) => id !== noteId);
  delete source.note_positions[noteId];
  if (!target.linked_note_ids.includes(noteId)) target.linked_note_ids.push(noteId);
  target.note_positions[noteId] = { x: Math.round(position.x), y: Math.round(position.y) };
  return true;
}
