import assert from "node:assert/strict";
import { conceptBounds, fitConceptCamera, zoomConceptCamera, isMapZoomShortcut, isMapPanShortcut } from "./conceptMapViewport.ts";

const equal = (x, y, epsilon = 1e-8) => assert.ok(Math.abs(x - y) < epsilon, `${x} !== ${y}`);

{
  const bounds = conceptBounds([{x: -1500,y: 1200},{x: 2600,y: -1750}]);
  assert.ok(bounds.left < -1500 && bounds.right > 2600);
  assert.ok(bounds.top < -1750 && bounds.bottom > 1200);
  const camera = fitConceptCamera(bounds, 1024, 720);
  const left = bounds.left * camera.scale + camera.x;
  const top = bounds.top * camera.scale + camera.y;
  const right = bounds.right * camera.scale + camera.x;
  const bottom = bounds.bottom * camera.scale + camera.y;
  assert.ok(left >= 23.9 && top >= 23.9);
  assert.ok(right <= 1000.1 && bottom <= 696.1);
  console.log("PASS fit entire map after freely moving nodes, including negative coordinates");
}
{
  const camera = {x: -550,y: 120,scale: 0.8};
  const anchor = {x: 400,y: 230};
  const world = {x: (anchor.x - camera.x) / camera.scale,y: (anchor.y - camera.y) / camera.scale};
  const zoomed = zoomConceptCamera(camera,anchor,1.45);
  equal(world.x * zoomed.scale + zoomed.x, anchor.x);
  equal(world.y * zoomed.scale + zoomed.y, anchor.y);
  console.log("PASS zoom stays under mouse pointer");
}
{
  const camera = fitConceptCamera(conceptBounds([]), 800, 600);
  assert.ok(camera.scale > 0);
  const newCamera = fitConceptCamera(conceptBounds([{x:850,y:440}]), 500, 320);
  assert.ok(newCamera.scale < camera.scale);
  console.log("PASS initial and resized viewport fit");
}

{
  assert.equal(isMapZoomShortcut({ctrlKey:true,altKey:false,metaKey:false}),true);
  assert.equal(isMapZoomShortcut({ctrlKey:false,altKey:true,metaKey:false}),false);
  assert.equal(isMapZoomShortcut({ctrlKey:true,altKey:true,metaKey:false}),false);
  assert.equal(isMapZoomShortcut({ctrlKey:false,altKey:false,metaKey:false}),false);
  assert.equal(isMapPanShortcut({code:"Space",altKey:false,metaKey:false}),true);
  assert.equal(isMapPanShortcut({code:"Space",altKey:true,metaKey:false}),false);
  assert.equal(isMapPanShortcut({code:"ControlLeft",altKey:false,metaKey:false}),false);
  console.log("PASS Ctrl+wheel zoom and immediate Space pan without Windows Alt+Space");
}
