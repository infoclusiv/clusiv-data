import type { ConceptNode } from "$lib/store/types";

type HierarchyNode = Pick<ConceptNode, "id" | "category_id" | "parent_id">;

export function descendantsOfConcept(nodes: readonly HierarchyNode[], sourceId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const group = children.get(node.parent_id) ?? [];
    group.push(node.id);
    children.set(node.parent_id, group);
  }
  const found = new Set<string>();
  const pending = [...(children.get(sourceId) ?? [])];
  while (pending.length) {
    const id = pending.pop()!;
    if (found.has(id) || id === sourceId) continue;
    found.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return found;
}

/** Reject invalid links before saving, even if the UI becomes stale mid-drag. */
export function assertConceptReparent(
  nodes: readonly HierarchyNode[], sourceId: string, parentId: string | null,
): void {
  const source = nodes.find((node) => node.id === sourceId);
  if (!source) throw new Error("El concepto de origen ya no existe.");
  if (parentId === null) return; // Dropping on the fixed category root.
  if (sourceId === parentId) throw new Error("Un concepto no puede ser su propio padre.");

  const parent = nodes.find((node) => node.id === parentId);
  if (!parent) throw new Error("El concepto de destino ya no existe.");
  if (source.category_id !== parent.category_id) {
    throw new Error("No se pueden conectar conceptos de distintas categorías.");
  }

  const seen = new Set<string>();
  let current: HierarchyNode | undefined = parent;
  while (current) {
    if (current.id === sourceId) {
      throw new Error("No se puede mover un concepto debajo de uno de sus descendientes.");
    }
    if (seen.has(current.id)) throw new Error("La jerarquía contiene un ciclo.");
    seen.add(current.id);
    current = current.parent_id ? nodes.find((node) => node.id === current!.parent_id) : undefined;
  }
}

export function canReparentConcept(
  nodes: readonly HierarchyNode[], sourceId: string, parentId: string | null,
): boolean {
  const source = nodes.find((node) => node.id === sourceId);
  if (!source || source.parent_id === parentId) return false;
  try {
    assertConceptReparent(nodes, sourceId, parentId);
    return true;
  } catch {
    return false;
  }
}

/** Atomically rewrite the relationship and preserve the whole visible layout. */
export function applyConceptReparent(
  nodes: ConceptNode[],
  sourceId: string,
  newParentId: string | null,
  visiblePositions: ReadonlyArray<{ id: string; x: number; y: number }>,
): boolean {
  assertConceptReparent(nodes, sourceId, newParentId);
  const source = nodes.find((node) => node.id === sourceId)!;
  if (source.parent_id === newParentId) return false;

  for (const point of visiblePositions) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error("El mapa contiene coordenadas inválidas.");
    }
  }
  const byId = new Map(visiblePositions.map((point) => [point.id, point]));
  for (const node of nodes) {
    if (node.category_id !== source.category_id) continue;
    const point = byId.get(node.id);
    if (point) node.position = { x: Math.round(point.x), y: Math.round(point.y) };
  }
  source.parent_id = newParentId;
  // A card-relative parent only makes sense while the same concept owns the card.
  source.parent_note_id = null;
  return true;
}
