/**
 * Compact, gradually decreasing hierarchy for concept nodes.
 * Depth 1 is a direct child of the category's center.
 * Deep trees bottom out at accessible text sizes instead of shrinking forever.
 */
export interface ConceptNodeVisual {
  titlePx: number;
  notePx: number;
  iconPx: number;
  minWidthPx: number;
  maxWidthPx: number;
  paddingXPx: number;
  paddingYPx: number;
  weight: number;
  borderPx: number;
  shadowPx: number;
}

const LEVELS: readonly ConceptNodeVisual[] = [
  { titlePx: 20, notePx: 12, iconPx: 24, minWidthPx: 185, maxWidthPx: 425, paddingXPx: 20, paddingYPx: 14, weight: 700, borderPx: 2.4, shadowPx: 22 },
  { titlePx: 16, notePx: 11, iconPx: 20, minWidthPx: 155, maxWidthPx: 390, paddingXPx: 17, paddingYPx: 12, weight: 650, borderPx: 2, shadowPx: 17 },
  { titlePx: 14, notePx: 10.5, iconPx: 18, minWidthPx: 140, maxWidthPx: 350, paddingXPx: 15, paddingYPx: 10, weight: 600, borderPx: 1.7, shadowPx: 13 },
  { titlePx: 12.5, notePx: 10, iconPx: 16, minWidthPx: 130, maxWidthPx: 325, paddingXPx: 12, paddingYPx: 9, weight: 500, borderPx: 1.4, shadowPx: 10 },
  { titlePx: 12, notePx: 10, iconPx: 15, minWidthPx: 125, maxWidthPx: 305, paddingXPx: 11, paddingYPx: 8, weight: 500, borderPx: 1.3, shadowPx: 9 },
  { titlePx: 12, notePx: 10, iconPx: 15, minWidthPx: 125, maxWidthPx: 305, paddingXPx: 11, paddingYPx: 8, weight: 500, borderPx: 1.3, shadowPx: 9 },
];

export function conceptNodeVisual(depth: number): ConceptNodeVisual {
  const index = Number.isFinite(depth) ? Math.max(0, Math.floor(depth) - 1) : 0;
  return LEVELS[Math.min(LEVELS.length - 1, index)];
}

/** Default width favors a single line for shorter titles, with user-controlled wrapping. */
export function conceptNodeWidth(title: string, depth: number, savedWidth: number | null): number {
  if (savedWidth !== null && Number.isFinite(savedWidth)) {
    return Math.round(Math.max(120, Math.min(520, savedWidth)));
  }
  const visual = conceptNodeVisual(depth);
  const characters = [...title.trim()].length;
  const estimated = visual.paddingXPx * 2 + visual.iconPx + 14 +
    characters * visual.titlePx * 0.64 + 25;
  return Math.ceil(Math.max(visual.minWidthPx, Math.min(visual.maxWidthPx, estimated)));
}

/** A resize from the lower-right corner preserves the left edge when centered. */
export function resizeConceptGeometry(
  starting: { x: number; y: number; width: number },
  clientDeltaX: number,
  zoom: number,
): { position: { x: number; y: number }; width: number } {
  const dx = clientDeltaX / Math.max(0.02, zoom);
  const width = Math.max(120, Math.min(520, starting.width + dx));
  return {
    width,
    position: { x: starting.x + (width - starting.width) / 2, y: starting.y },
  };
}

/** Conservative text-height estimate used by fit-to-map after narrow resizes. */
export function conceptNodeHeight(title: string, depth: number, width: number): number {
  const visual = conceptNodeVisual(depth);
  const textWidth = Math.max(22, width - 2 * visual.paddingXPx - visual.iconPx - 14);
  const charsPerLine = Math.max(1, Math.floor(textWidth / (visual.titlePx * 0.58)));
  const lines = Math.max(1, Math.ceil([...title].length / charsPerLine));
  const contentHeight = lines * visual.titlePx * 1.18 + 7 + visual.notePx * 1.3;
  return Math.ceil(Math.max(visual.iconPx, contentHeight) + 2 * visual.paddingYPx + 18);
}
