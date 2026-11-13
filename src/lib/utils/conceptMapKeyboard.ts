/**
 * A concept map may take keyboard focus only when its own window is already
 * foreground. Pointer movement is never a reason to activate a native window.
 */
export function canFocusMapFromHover(state: {
  windowFocused: boolean;
  pointerOverMap: boolean;
  detailOpen: boolean;
  overlayOpen: boolean;
}): boolean {
  return state.windowFocused && state.pointerOverMap
    && !state.detailOpen && !state.overlayOpen;
}

export function canPanMapWithSpace(state: {
  windowFocused: boolean;
  pointerOverMap: boolean;
  isEditableTarget: boolean;
  detailOpen: boolean;
  overlayOpen: boolean;
}): boolean {
  return state.windowFocused
    && state.pointerOverMap
    && !state.isEditableTarget && !state.detailOpen && !state.overlayOpen;
}

/**
 * Pointer captures used by draggable nodes may suppress pointerenter/leave
 * notifications. Determine map hover from real viewport coordinates instead.
 */
export function isPointerInsideMap(
  pointer: { x: number; y: number } | null,
  rect: { left: number; top: number; right: number; bottom: number } | null,
): boolean {
  if (!pointer || !rect) return false;
  return pointer.x >= rect.left && pointer.x <= rect.right
    && pointer.y >= rect.top && pointer.y <= rect.bottom;
}

/** Browser-generated keyboard clicks have detail=0. Only a real mouse click opens a concept. */
export function isMouseMapOpenClick(click: { detail: number }): boolean {
  return click.detail > 0;
}
