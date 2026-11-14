/** Curved paths share the same border and handle geometry for groups and notes. */
export function curvedNotePath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  bend = 0,
): string {
  const direction = end.x >= start.x ? 1 : -1;
  const curve = Math.max(24, Math.min(105, Math.abs(end.x - start.x) * 0.42));
  return `M ${start.x} ${start.y} C ${start.x + curve * direction} ${start.y - bend}, ${end.x - curve * direction} ${end.y - bend}, ${end.x} ${end.y}`;
}

export function cardBorderPoint(
  source: { x: number; y: number },
  center: { x: number; y: number },
  width: number,
  height: number,
): { x: number; y: number } {
  const dx = center.x - source.x;
  const dy = center.y - source.y;
  const factor = Math.max(
    width > 0 ? Math.abs(dx) / (width / 2) : 0,
    height > 0 ? Math.abs(dy) / (height / 2) : 0,
  );
  return factor > 1 ? { x: center.x - dx / factor, y: center.y - dy / factor } : source;
}

/** Draw a smooth connection ending exactly on the outline of an opaque note card. */
export function noteCardConnection(
  source: { x: number; y: number },
  target: { x: number; y: number },
  width: number,
  height: number,
): { path: string; end: { x: number; y: number } } {
  const end = cardBorderPoint(source, target, width, height);
  return { path: curvedNotePath(source, end), end };
}
