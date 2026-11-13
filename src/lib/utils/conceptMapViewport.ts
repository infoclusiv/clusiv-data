/** Ctrl + wheel belongs to the map only when Alt/Meta are not held. */
export function isMapZoomShortcut(modifiers: {
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}): boolean {
  return modifiers.ctrlKey && !modifiers.altKey && !modifiers.metaKey;
}

/** Allow Space immediately after Ctrl zoom, even if Ctrl has not been released yet. */
export function isMapPanShortcut(event: {
  code: string;
  altKey: boolean;
  metaKey: boolean;
}): boolean {
  return event.code === "Space" && !event.altKey && !event.metaKey;
}

export interface MapPoint { x: number; y: number; }
export interface MapCamera { x: number; y: number; scale: number; }
export interface MapBounds {
  left: number; top: number; right: number; bottom: number;
  width: number; height: number;
}

/** Coordinates are in unscaled map units and are not limited to the viewport. */
export function conceptBounds(
  positions: readonly MapPoint[],
  { centerX = 650, centerY = 440, margin = 65 } = {},
): MapBounds {
  let left = centerX - 140;
  let right = centerX + 140;
  let top = centerY - 58;
  let bottom = centerY + 58;
  for (const point of positions) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    left = Math.min(left, point.x - 145);
    right = Math.max(right, point.x + 145);
    top = Math.min(top, point.y - 60);
    bottom = Math.max(bottom, point.y + 60);
  }
  left -= margin;
  right += margin;
  top -= margin;
  bottom += margin;
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

/** Returns a fit-to-content camera that shows the complete node bounding box. */
export function fitConceptCamera(
  bounds: MapBounds,
  viewportWidth: number,
  viewportHeight: number,
  padding = 24,
): MapCamera {
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  const scale = Math.min(1.5, availableWidth / Math.max(1, bounds.width), availableHeight / Math.max(1, bounds.height));
  return {
    scale,
    x: viewportWidth / 2 - (bounds.left + bounds.right) / 2 * scale,
    y: viewportHeight / 2 - (bounds.top + bounds.bottom) / 2 * scale,
  };
}

/** Keeps the world point underneath the mouse stable while zooming. */
export function zoomConceptCamera(
  camera: MapCamera,
  anchor: MapPoint,
  factor: number,
  minScale = 0.02,
  maxScale = 3.5,
): MapCamera {
  const scale = Math.max(minScale, Math.min(maxScale, camera.scale * factor));
  const ratio = scale / camera.scale;
  return {
    scale,
    x: anchor.x - (anchor.x - camera.x) * ratio,
    y: anchor.y - (anchor.y - camera.y) * ratio,
  };
}
