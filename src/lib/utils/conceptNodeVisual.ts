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
}

const LEVELS: readonly ConceptNodeVisual[] = [
  { titlePx: 18, notePx: 12, iconPx: 25, minWidthPx: 178, maxWidthPx: 285, paddingXPx: 21, paddingYPx: 14, weight: 700 },
  { titlePx: 16, notePx: 11.5, iconPx: 22, minWidthPx: 160, maxWidthPx: 260, paddingXPx: 19, paddingYPx: 12, weight: 650 },
  { titlePx: 14.5, notePx: 11, iconPx: 19, minWidthPx: 144, maxWidthPx: 238, paddingXPx: 17, paddingYPx: 11, weight: 600 },
  { titlePx: 13.5, notePx: 10.5, iconPx: 18, minWidthPx: 132, maxWidthPx: 222, paddingXPx: 15, paddingYPx: 10, weight: 600 },
  { titlePx: 12.5, notePx: 10, iconPx: 16, minWidthPx: 122, maxWidthPx: 205, paddingXPx: 13, paddingYPx: 9, weight: 600 },
  { titlePx: 12, notePx: 10, iconPx: 15, minWidthPx: 118, maxWidthPx: 196, paddingXPx: 12, paddingYPx: 9, weight: 600 },
];

export function conceptNodeVisual(depth: number): ConceptNodeVisual {
  const index = Number.isFinite(depth) ? Math.max(0, Math.floor(depth) - 1) : 0;
  return LEVELS[Math.min(LEVELS.length - 1, index)];
}
