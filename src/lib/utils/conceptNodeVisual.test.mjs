import assert from "node:assert/strict";
import { conceptNodeVisual, conceptNodeWidth, conceptNodeHeight, resizeConceptGeometry } from "./conceptNodeVisual.ts";

const first = conceptNodeVisual(1);
assert.equal(first.titlePx, 20);
assert.equal(first.weight, 700);
for (let depth = 2; depth <= 16; depth++) {
  const previous = conceptNodeVisual(depth - 1);
  const current = conceptNodeVisual(depth);
  assert.ok(current.titlePx <= previous.titlePx, `title grows from ${depth - 1} to ${depth}`);
  assert.ok(current.iconPx <= previous.iconPx, `icon grows from ${depth - 1} to ${depth}`);
  assert.ok(current.weight <= previous.weight, `font weight grows from ${depth - 1} to ${depth}`);
  assert.ok(current.borderPx <= previous.borderPx, `border grows from ${depth - 1} to ${depth}`);
  assert.ok(current.minWidthPx <= previous.minWidthPx, `node grows from ${depth - 1} to ${depth}`);
  assert.ok(current.titlePx >= 12, "titles must stay legible at deep levels");
}
assert.ok(conceptNodeVisual(1).titlePx > conceptNodeVisual(2).titlePx);
assert.ok(conceptNodeVisual(2).titlePx > conceptNodeVisual(3).titlePx);
assert.ok(conceptNodeVisual(1).titlePx - conceptNodeVisual(3).titlePx >= 6, "primary hierarchy must be pronounced");
assert.ok(conceptNodeVisual(1).weight - conceptNodeVisual(4).weight >= 200, "font weights must be clearly distinct");
assert.deepEqual(conceptNodeVisual(6), conceptNodeVisual(30));
console.log("PASS graduated concept hierarchy levels 1–6 and deeper floor");

{
  const width = conceptNodeWidth("Concepto 1", 1, null);
  assert.ok(width >= 220, "short titles must fit on one line by default");
  assert.equal(conceptNodeWidth("Concepto 1", 1, 175), 175);
  assert.equal(conceptNodeWidth("Concepto 1", 1, 1000), 520);
  assert.equal(conceptNodeWidth("Concepto 1", 1, 30), 120);
  const start = { x: 900, y: 450, width: 240 };
  const next = resizeConceptGeometry(start, 100, 2);
  assert.equal(next.width, 290);
  assert.equal(next.position.x, 925);
  assert.equal(next.position.x - next.width / 2, start.x - start.width / 2);
  assert.equal(next.position.y, start.y);
  const narrow = resizeConceptGeometry(start, -900, 1);
  assert.equal(narrow.width, 120);
  assert.ok(conceptNodeHeight("A rather long concept title that needs wrapping", 1, 120) >
    conceptNodeHeight("A rather long concept title that needs wrapping", 1, 480));
  console.log("PASS widths, manual wrapping and anchored resize at zoom");
}
