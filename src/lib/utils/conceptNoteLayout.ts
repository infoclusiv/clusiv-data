import type { ConceptNode } from "$lib/store/types";

export const NOTE_CARD_WIDTH = 306;
export const NOTE_CARD_HEIGHT = 182;

export interface NoteMapPosition {
  conceptId: string;
  noteId: string;
  key: string;
  x: number;
  y: number;
  color: string;
}

export interface ConceptMapAnchor {
  node: ConceptNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Box { x: number; y: number; width: number; height: number; }

function collides(a: Box, b: Box, gap = 20): boolean {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2 + gap;
}

/**
 * Link notes already stored in legacy maps without changing their IDs or relationships.
 * Explicit per-concept note coordinates take precedence; all others get a deterministic,
 * collision-aware position that avoids the concept nodes and other cards.
 */
export function layoutConceptNoteCards(
  anchors: readonly ConceptMapAnchor[],
  validNoteIds: ReadonlySet<string>,
  root = { x: 650, y: 440, width: 390, height: 140 },
): NoteMapPosition[] {
  const occupied: Box[] = [root, ...anchors.map((p) => ({
    x: p.x, y: p.y, width: p.width, height: p.height,
  }))];
  const result: NoteMapPosition[] = [];
  for (const anchor of anchors) {
    const valid = [...new Set(anchor.node.linked_note_ids)].filter((id) => validNoteIds.has(id));
    for (const [index, noteId] of valid.entries()) {
      const key = `${anchor.node.id}::${noteId}`;
      const saved = anchor.node.note_positions?.[noteId];
      let x = saved?.x ?? 0;
      let y = saved?.y ?? 0;
      if (!saved) {
        const direction = Math.atan2(anchor.y - root.y, anchor.x - root.x);
        // For nodes almost at the center, fan cards alternately left/right.
        const baseline = Math.abs(anchor.x - root.x) + Math.abs(anchor.y - root.y) < 32
          ? -Math.PI / 2 : direction;
        let placed = false;
        for (let attempt = 0; attempt < 160; attempt++) {
          const band = Math.floor(attempt / 9);
          const slot = attempt % 9;
          const angleOffset = slot === 0 ? 0 : Math.ceil(slot / 2) * .42 * (slot % 2 ? 1 : -1);
          // Rotate the starting angle to spread consecutive notes evenly.
          const angle = baseline + angleOffset + (index % 3 - 1) * .27;
          const radius = 320 + band * 118;
          const candidate = { x: anchor.x + Math.cos(angle) * radius,
            y: anchor.y + Math.sin(angle) * radius, width: NOTE_CARD_WIDTH,
            height: NOTE_CARD_HEIGHT };
          if (!occupied.some((box) => collides(candidate, box))) {
            x = Math.round(candidate.x); y = Math.round(candidate.y);
            placed = true;
            break;
          }
        }
        if (!placed) {
          x = anchor.x + 420 + index * 48;
          y = anchor.y + index * (NOTE_CARD_HEIGHT + 22);
        }
      }
      occupied.push({ x, y, width: NOTE_CARD_WIDTH, height: NOTE_CARD_HEIGHT });
      result.push({ conceptId: anchor.node.id, noteId, key, x, y, color: anchor.node.color });
    }
  }
  return result;
}
