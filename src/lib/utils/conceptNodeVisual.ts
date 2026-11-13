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
  // Direct branches: clearly primary, with bold type and larger surfaces.
  { titlePx: 22, notePx: 12.5, iconPx: 29, minWidthPx: 205, maxWidthPx: 315, paddingXPx: 24, paddingYPx: 17, weight: 800, borderPx: 3, shadowPx: 28 },
  // Second-level concepts: recognizable but visibly subordinate.
  { titlePx: 18, notePx: 11.5, iconPx: 23, minWidthPx: 166, maxWidthPx: 264, paddingXPx: 18, paddingYPx: 13, weight: 700, borderPx: 2.4, shadowPx: 21 },
  // Third-level ideas: compact, medium weight.
  { titlePx: 15, notePx: 10.5, iconPx: 19, minWidthPx: 140, maxWidthPx: 230, paddingXPx: 15, paddingYPx: 11, weight: 600, borderPx: 1.8, shadowPx: 15 },
  { titlePx: 13, notePx: 10, iconPx: 17, minWidthPx: 125, maxWidthPx: 205, paddingXPx: 12, paddingYPx: 9, weight: 500, borderPx: 1.5, shadowPx: 12 },
  { titlePx: 12, notePx: 10, iconPx: 15, minWidthPx: 116, maxWidthPx: 190, paddingXPx: 11, paddingYPx: 8, weight: 500, borderPx: 1.3, shadowPx: 10 },
  { titlePx: 12, notePx: 10, iconPx: 15, minWidthPx: 116, maxWidthPx: 190, paddingXPx: 11, paddingYPx: 8, weight: 500, borderPx: 1.3, shadowPx: 10 },
];

export function conceptNodeVisual(depth: number): ConceptNodeVisual {
  const index = Number.isFinite(depth) ? Math.max(0, Math.floor(depth) - 1) : 0;
  return LEVELS[Math.min(LEVELS.length - 1, index)];
}
