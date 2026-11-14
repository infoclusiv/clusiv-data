/** Draw a smooth connection ending exactly on the outline of an opaque note card. */
export function noteCardConnection(
  source: { x: number; y: number },
  target: { x: number; y: number },
  width: number,
  height: number,
): { path: string; end: { x: number; y: number } } {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  // Intersect the segment from the source to the card center with its border.
  const factor = Math.max(
    width > 0 ? Math.abs(dx) / (width / 2) : 0,
    height > 0 ? Math.abs(dy) / (height / 2) : 0,
  );
  const end = factor > 1
    ? { x: target.x - dx / factor, y: target.y - dy / factor }
    : { x: source.x, y: source.y };
  const curve = Math.max(28, Math.min(120, Math.abs(end.x - source.x) * 0.42));
  const sign = end.x >= source.x ? 1 : -1;
  return {
    path: `M ${source.x} ${source.y} C ${source.x + curve * sign} ${source.y}, ${end.x - curve * sign} ${end.y}, ${end.x} ${end.y}`,
    end,
  };
}
