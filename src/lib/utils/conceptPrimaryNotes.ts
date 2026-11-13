import type { AppData, ConceptNode, Item } from "$lib/store/types";

/**
 * The map keeps structural node IDs (for layout and parent/child edges), but
 * each map node now owns an actual editable note. Old concept records are
 * upgraded idempotently: no linked notes are copied or removed.
 */
export function ensurePrimaryMapNotes(data: AppData): void {
  const itemById = new Map(data.__SYSTEM_TASKS__.map((item) => [item.id, item]));
  for (const node of data.__SYSTEM_CONCEPT_NODES__) {
    const primary = node.primary_note_id
      ? itemById.get(node.primary_note_id) : undefined;
    if (primary?.type === "note") {
      node.title = primary.title || "Nota sin título";
      continue;
    }
    let newId = `map-note-${node.id}`;
    let suffix = 1;
    while (itemById.has(newId)) newId = `map-note-${node.id}-${++suffix}`;
    const note: Item = {
      id: newId, title: node.title, comment: "", type: "note", done: false,
      category_id: node.category_id, tags: [], images: [], links: [], documents: [],
    };
    data.__SYSTEM_TASKS__.push(note);
    itemById.set(newId, note);
    node.primary_note_id = newId;
  }
}

/** Primary map-note deletion removes its structural node, not its descendants. */
export function removePrimaryMapNode(
  nodes: ConceptNode[], noteId: string,
): void {
  const primary = nodes.find((node) => node.primary_note_id === noteId);
  if (!primary) return;
  for (const child of nodes) {
    if (child.parent_id === primary.id) child.parent_id = primary.parent_id;
  }
  const index = nodes.findIndex((node) => node.id === primary.id);
  if (index >= 0) nodes.splice(index, 1);
}
