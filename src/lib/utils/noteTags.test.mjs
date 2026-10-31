import assert from "node:assert/strict";
import { normalizeNoteTags, getAvailableNoteTags, filterNotesByTags } from "./noteTags.ts";
const make = (id, tags, title = "", comment = "") =>
  ({ id, title, comment, tags, type: "note", images: [], done: false, category_id: "general" });
assert.deepEqual(normalizeNoteTags(undefined), []);
assert.deepEqual(normalizeNoteTags(["  Trading ", "trading", "IA", " IA ", "", 42]), ["Trading", "IA"]);
const notes = [make("1", ["Trading", "Backtesting"], "Estrategia"),
  make("2", ["IA"], "Machine learning"), make("3", [], "Otra nota")];
assert.deepEqual(getAvailableNoteTags(notes), ["Backtesting", "IA", "Trading"]);
assert.deepEqual(filterNotesByTags(notes, ["trading", "IA"]).map((n) => n.id), ["1", "2"]);
assert.deepEqual(filterNotesByTags(notes, ["trading", "IA"], "machine").map((n) => n.id), ["2"]);
assert.deepEqual(filterNotesByTags(notes, []).map((n) => n.id), ["1", "2", "3"]);
assert.deepEqual(filterNotesByTags(notes, ["Desconocida"]), []);
console.log("Tests de etiquetas de notas: OK");
