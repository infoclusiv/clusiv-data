import type { ConceptNode } from "../store/types";

export interface GroupMapBox {
  id: string;
  parentId: string | null;
  parentNoteId: string | null;
  x: number; y: number; width: number; height: number;
}
export interface GroupBounds {
  left: number; top: number; right: number; bottom: number;
  width: number; height: number; centerX: number; centerY: number;
}

/** Includes the actual descendant concept nodes, but never children of external note cards. */
export function conceptGroupBounds(
  groupId: string, boxes: readonly GroupMapBox[], padX = 24, padY = 26,
): GroupBounds | null {
  const parent = boxes.find((b) => b.id === groupId);
  if (!parent) return null;
  const included = new Set([groupId]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const child of boxes) {
      if (child.parentId && !child.parentNoteId && included.has(child.parentId)
        && !included.has(child.id)) {
        included.add(child.id);
        expanded = true;
      }
    }
  }
  const selected = boxes.filter((b) => included.has(b.id));
  const left = Math.min(...selected.map((b) => b.x - b.width / 2)) - padX;
  const right = Math.max(...selected.map((b) => b.x + b.width / 2)) + padX;
  const top = Math.min(...selected.map((b) => b.y - b.height / 2)) - padY;
  const bottom = Math.max(...selected.map((b) => b.y + b.height / 2)) + padY;
  return { left, right, top, bottom, width: right - left, height: bottom - top,
    centerX: (right + left) / 2, centerY: (bottom + top) / 2 };
}

/** Anchor on the group's border nearest a card, not at its central node. */
export function groupEdgePoint(bounds: GroupBounds, target: { x: number; y: number }): { x: number; y: number } {
  const dx = target.x - bounds.centerX, dy = target.y - bounds.centerY;
  const widthRatio = Math.abs(dx) / Math.max(1, bounds.width / 2);
  const heightRatio = Math.abs(dy) / Math.max(1, bounds.height / 2);
  if (widthRatio >= heightRatio) {
    return { x: dx >= 0 ? bounds.right : bounds.left,
      y: Math.max(bounds.top + 10, Math.min(bounds.bottom - 10, target.y)) };
  }
  return { x: Math.max(bounds.left + 10, Math.min(bounds.right - 10, target.x)),
    y: dy >= 0 ? bounds.bottom : bounds.top };
}

/** True when a regular node is anchored to the note card linked to its parent concept. */
export function linkedNoteParent(
  node: Pick<ConceptNode, "parent_id" | "parent_note_id">,
  relatedCards: readonly { conceptId: string; noteId: string; x: number; y: number }[],
): { x: number; y: number } | null {
  if (!node.parent_id || !node.parent_note_id) return null;
  const card = relatedCards.find((p) => p.conceptId === node.parent_id
    && p.noteId === node.parent_note_id);
  return card ? { x: card.x, y: card.y } : null;
}
