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
  mapHasDomFocus: boolean;
  isEditableTarget: boolean;
  detailOpen: boolean;
  overlayOpen: boolean;
}): boolean {
  return state.windowFocused
    && (state.pointerOverMap || state.mapHasDomFocus)
    && !state.isEditableTarget && !state.detailOpen && !state.overlayOpen;
}
