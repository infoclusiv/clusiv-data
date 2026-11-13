import assert from "node:assert/strict";
import { deleteNoteEverywhere } from "./conceptNoteDeletion.ts";

function makeFixture() {
  return {
    __SYSTEM_TASKS__: [
      { id: "note-target", type: "note", title: "Fuentes", comment: "Importante",
        category_id: "trading", done: false, images: [{ id: "image-1", data_url: "data:image/png;base64,AA==", name: "A" }],
        documents: [{ id: "document-1", data_url: "data:application/pdf;base64,AA==", name: "F", mime_type: "application/pdf" }],
        links: [{ id: "link-1", url: "https://example.com", title: "Origen" }], tags: [] },
      { id: "note-keep", type: "note", title: "Conservar", comment: "", images: [], documents: [], links: [], tags: [],
        category_id: "trading", done: false },
      { id: "task-keep", type: "task", title: "Tarea", category_id: "trading", done: false },
    ],
    __SYSTEM_CONCEPT_NODES__: [
      { id: "source", linked_note_ids: ["note-target", "note-keep"], note_positions: {
        "note-target": { x: -900, y: 1234 }, "note-keep": { x: 100, y: 200 },
      } },
      { id: "analysis", linked_note_ids: ["note-target", "note-target"], note_positions: {
        "note-target": { x: 200, y: 300 },
      } },
      { id: "other", linked_note_ids: ["note-keep"], note_positions: {} },
    ],
    __SYSTEM_FLOWS__: [
      { id: "flow", linked_note_ids: ["note-target", "note-keep"], nodes: [
        { id: "node", linked_note_ids: ["note-target", "note-keep"] },
      ] },
    ],
    __SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__: ["note-target", "note-keep"],
    __SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__: ["note-target", "note-keep"],
  };
}

const draft = makeFixture();
const savedKeep = structuredClone(draft.__SYSTEM_TASKS__[1]);
deleteNoteEverywhere(draft, "note-target");
assert.deepEqual(draft.__SYSTEM_TASKS__.map((item) => item.id), ["note-keep", "task-keep"]);
assert.deepEqual(draft.__SYSTEM_TASKS__[0], savedKeep, "unrelated note content and attachments stay unchanged");
assert.deepEqual(draft.__SYSTEM_CONCEPT_NODES__[0].linked_note_ids, ["note-keep"]);
assert.deepEqual(draft.__SYSTEM_CONCEPT_NODES__[0].note_positions, {
  "note-keep": { x: 100, y: 200 },
});
assert.deepEqual(draft.__SYSTEM_CONCEPT_NODES__[1].linked_note_ids, []);
assert.deepEqual(draft.__SYSTEM_CONCEPT_NODES__[1].note_positions, {});
assert.deepEqual(draft.__SYSTEM_CONCEPT_NODES__[2].linked_note_ids, ["note-keep"]);
assert.deepEqual(draft.__SYSTEM_FLOWS__[0].linked_note_ids, ["note-keep"]);
assert.deepEqual(draft.__SYSTEM_FLOWS__[0].nodes[0].linked_note_ids, ["note-keep"]);
assert.deepEqual(draft.__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__, ["note-keep"]);
assert.deepEqual(draft.__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__, ["note-keep"]);

const retained = structuredClone(draft);
assert.throws(() => deleteNoteEverywhere(draft, "note-target"), /ya no existe/);
assert.throws(() => deleteNoteEverywhere(draft, "task-keep"), /ya no existe/);
assert.deepEqual(draft, retained, "missing or non-note IDs cannot mutate the dataset");
console.log("PASS permanent note removal clears all concept, map, flow and global references");
