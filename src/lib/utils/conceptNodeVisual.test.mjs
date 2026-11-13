import assert from "node:assert/strict";
import { conceptNodeVisual } from "./conceptNodeVisual.ts";

const first = conceptNodeVisual(1);
assert.equal(first.titlePx, 18);
assert.equal(first.weight, 700);
for (let depth = 2; depth <= 16; depth++) {
  const previous = conceptNodeVisual(depth - 1);
  const current = conceptNodeVisual(depth);
  assert.ok(current.titlePx <= previous.titlePx, `title grows from ${depth - 1} to ${depth}`);
  assert.ok(current.iconPx <= previous.iconPx, `icon grows from ${depth - 1} to ${depth}`);
  assert.ok(current.minWidthPx <= previous.minWidthPx, `node grows from ${depth - 1} to ${depth}`);
  assert.ok(current.titlePx >= 12, "titles must stay legible at deep levels");
}
assert.ok(conceptNodeVisual(1).titlePx > conceptNodeVisual(2).titlePx);
assert.ok(conceptNodeVisual(2).titlePx > conceptNodeVisual(3).titlePx);
assert.deepEqual(conceptNodeVisual(6), conceptNodeVisual(30));
console.log("PASS graduated concept hierarchy levels 1–6 and deeper floor");
