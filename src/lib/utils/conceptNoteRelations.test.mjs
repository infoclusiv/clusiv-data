import assert from "node:assert/strict";
import { moveNoteLink } from "./conceptNoteRelations.ts";
const note = { id: "n1", type: "note", title: "Datos de mercado", comment: "Original",
  links: [{id:"l1",url:"https://example.com",title:"Fuente"}],
  documents: [{id:"d1",name:"doc.pdf",mime_type:"application/pdf",data_url:"data:application/pdf;base64,SGVsbG8="}],
  images: [],tags: [],done:false,category_id:"trading"};
const nodes=[
 {id:"fuentes",category_id:"trading",linked_note_ids:["n1"],note_positions:{n1:{x:-900,y:1500}}},
 {id:"analisis",category_id:"trading",linked_note_ids:[],note_positions:{}},
 {id:"compartido",category_id:"trading",linked_note_ids:["n1"],note_positions:{}},
 {id:"otro",category_id:"other",linked_note_ids:[],note_positions:{}},
];
const before=structuredClone(note);
assert.equal(moveNoteLink(nodes,[note],"n1","fuentes","analisis",{x:801.4,y:462.7}),true);
assert.deepEqual(nodes[0].linked_note_ids,[]);
assert.deepEqual(nodes[0].note_positions,{});
assert.deepEqual(nodes[1].linked_note_ids,["n1"]);
assert.deepEqual(nodes[1].note_positions.n1,{x:801,y:463});
assert.deepEqual(nodes[2].linked_note_ids,["n1"],"a separate link to the shared note is preserved");
assert.deepEqual(note,before,"body and attachments must never change");
const previous=structuredClone(nodes);
assert.throws(()=>moveNoteLink(nodes,[note],"n1","analisis","otro",{x:1,y:1}),/mismo mapa/);
assert.throws(()=>moveNoteLink(nodes,[note],"n1","fuentes","analisis",{x:1,y:1}),/no existe/);
assert.throws(()=>moveNoteLink(nodes,[note],"n1","analisis","fuentes",{x:NaN,y:1}),/Coordenadas/);
assert.deepEqual(nodes,previous,"invalid drops never modify relationships");
assert.equal(moveNoteLink(nodes,[note],"n1","analisis","analisis",{x:1,y:1}),false);
console.log("PASS note reattachment preserves other links, note contents, attachments and location");

const branchedNodes = [
  {id:"markets",category_id:"trading",linked_note_ids:["n1"],note_positions:{n1:{x:800,y:400}}},
  {id:"futures",category_id:"trading",linked_note_ids:[],note_positions:{}},
  {id:"child",category_id:"trading",parent_id:"markets",parent_note_id:"n1",
    linked_note_ids:[],note_positions:{},position:{x:1200,y:400}},
];
assert.equal(moveNoteLink(branchedNodes,[note],"n1","markets","futures",{x:910,y:460}),true);
assert.equal(branchedNodes[2].parent_id,"futures","child branch follows moved note");
assert.equal(branchedNodes[2].parent_note_id,"n1","its source note ID stays stable");
assert.deepEqual(branchedNodes[2].position,{x:1200,y:400},"moving the relation does not move the child");
console.log("PASS note child branches preserve parent note and coordinates after relink");
