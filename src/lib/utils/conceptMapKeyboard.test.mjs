import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canFocusMapFromHover, canPanMapWithSpace, isPointerInsideMap, isMouseMapOpenClick } from "./conceptMapKeyboard.ts";

const active = { windowFocused: true, pointerOverMap: true, detailOpen: false, overlayOpen: false };
assert.equal(canFocusMapFromHover(active), true, "hover focuses DOM map only in an active window");
assert.equal(canFocusMapFromHover({ ...active, windowFocused: false }), false, "background windows never focus on hover");
assert.equal(canFocusMapFromHover({ ...active, pointerOverMap: false }), false);
assert.equal(canFocusMapFromHover({ ...active, overlayOpen: true }), false);
assert.equal(canFocusMapFromHover({ ...active, detailOpen: true }), false);
assert.equal(canPanMapWithSpace({
  ...active, isEditableTarget: false,
}), true, "Space should work without a previous click when the app is active");
assert.equal(canPanMapWithSpace({
  ...active, windowFocused: false, isEditableTarget: false,
}), false, "never pan while Chrome or another window is foreground");
assert.equal(canPanMapWithSpace({
  ...active, isEditableTarget: true,
}), false, "text fields must keep their Space key");
assert.equal(canPanMapWithSpace({
  ...active, pointerOverMap: false, isEditableTarget: false,
}), false, "Space should work only when the cursor is over the map");
console.log("PASS keyboard focus isolation across foreground/background windows");

const component = readFileSync(new URL("../components/category/ConceptMap.svelte", import.meta.url), "utf8");
const capabilities = JSON.parse(readFileSync(
  new URL("../../../src-tauri/capabilities/default.json", import.meta.url), "utf8",
));
assert.ok(!component.includes("getCurrentWebview"), "hover must not focus native webview");
assert.ok(!component.includes(".setFocus("), "hover must never activate the native window");
assert.ok(!capabilities.permissions.includes("core:window:allow-set-focus"));
assert.ok(!capabilities.permissions.includes("core:webview:allow-set-webview-focus"));
console.log("PASS no native focus commands or unnecessary focus permissions");

const mapRect = { left: 60, top: 120, right: 1100, bottom: 850 };
assert.equal(isPointerInsideMap({x:300,y:370},mapRect),true);
assert.equal(isPointerInsideMap({x:60,y:120},mapRect),true);
assert.equal(isPointerInsideMap({x:300,y:115},mapRect),false,"the title/header is not map hover");
assert.equal(isPointerInsideMap({x:1150,y:350},mapRect),false,"other windows and panels cannot pan");
assert.equal(isPointerInsideMap(null,mapRect),false);
assert.equal(isPointerInsideMap({x:300,y:370},null),false);
assert.equal(isMouseMapOpenClick({detail:0}),false,"Space and Enter synthesize a zero-detail click");
assert.equal(isMouseMapOpenClick({detail:1}),true,"physical mouse clicks must still open concepts");
assert.equal(isMouseMapOpenClick({detail:2}),true,"double-click remains mouse input");

assert.ok(component.includes("onkeydowncapture={keyDown}"),"Space handler must run before a focused button activates");
assert.ok(component.includes("onpointermove={trackPointerPosition}"),"pointer position must be tracked during capture");
assert.ok(component.includes("restoreMapKeyboardFocus()"),"after a drag the viewport must regain local DOM focus");
assert.ok(component.includes("!isMouseMapOpenClick(event)"),"keyboard click cannot open concepts");
const noteCard = readFileSync(new URL("../components/category/ConceptNoteCard.svelte", import.meta.url), "utf8");
assert.ok(noteCard.includes("event.detail === 0"),"keyboard click cannot open notes");
console.log("PASS focus after captured drags and mouse-only concept/note openings");
