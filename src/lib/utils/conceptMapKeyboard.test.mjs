import assert from "node:assert/strict";
import { canFocusMapFromHover, canPanMapWithSpace } from "./conceptMapKeyboard.ts";

const active = { windowFocused: true, pointerOverMap: true, detailOpen: false, overlayOpen: false };
assert.equal(canFocusMapFromHover(active), true, "hover focuses DOM map only in an active window");
assert.equal(canFocusMapFromHover({ ...active, windowFocused: false }), false, "background windows never focus on hover");
assert.equal(canFocusMapFromHover({ ...active, pointerOverMap: false }), false);
assert.equal(canFocusMapFromHover({ ...active, overlayOpen: true }), false);
assert.equal(canFocusMapFromHover({ ...active, detailOpen: true }), false);
assert.equal(canPanMapWithSpace({
  ...active, mapHasDomFocus: false, isEditableTarget: false,
}), true, "Space should work without a previous click when the app is active");
assert.equal(canPanMapWithSpace({
  ...active, windowFocused: false, mapHasDomFocus: true, isEditableTarget: false,
}), false, "never pan while Chrome or another window is foreground");
assert.equal(canPanMapWithSpace({
  ...active, mapHasDomFocus: true, isEditableTarget: true,
}), false, "text fields must keep their Space key");
assert.equal(canPanMapWithSpace({
  ...active, pointerOverMap: false, mapHasDomFocus: true, isEditableTarget: false,
}), true, "keep keyboard pan while the map itself has DOM focus");
console.log("PASS keyboard focus isolation across foreground/background windows");
