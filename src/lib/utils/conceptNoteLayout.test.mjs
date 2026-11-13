import assert from "node:assert/strict";
import { NOTE_CARD_WIDTH, NOTE_CARD_HEIGHT, layoutConceptNoteCards } from "./conceptNoteLayout.ts";
const node=(id,linked_note_ids,position=null,note_positions={})=>({id,title:id,color:"teal",category_id:"trading",parent_id:null,icon:"Layers",width:null,position,linked_note_ids,note_positions});
const anchors=[
 {node:node("fuentes",["n1","n2","n1"]),x:650,y:180,width:260,height:100},
 {node:node("analisis",["n3"]),x:900,y:670,width:200,height:90},
];
const valid = new Set(["n1","n2","n3"]);
const result=layoutConceptNoteCards(anchors,valid);
assert.equal(result.length,3,"existing note relations migrate visually without duplicates");
assert.deepEqual(result.map((p)=>p.noteId),["n1","n2","n3"]);
const coordinates=result.map((p)=>({x:p.x,y:p.y}));
assert.deepEqual(layoutConceptNoteCards(anchors,valid).map((p)=>({x:p.x,y:p.y})),coordinates);
for(const card of result){
 assert.ok(Math.abs(card.x-650)>150 || Math.abs(card.y-440)>110);
 for(const anchor of anchors)assert.ok(
  Math.abs(card.x-anchor.x) >= (NOTE_CARD_WIDTH+anchor.width)/2+15 ||
  Math.abs(card.y-anchor.y) >= (NOTE_CARD_HEIGHT+anchor.height)/2+15);
}
const customized=layoutConceptNoteCards([
 {node:node("fuentes",["n1"],null,{n1:{x:-1400,y:2450}}),x:650,y:180,width:260,height:100},
],valid);
assert.equal(customized[0].x,-1400);
assert.equal(customized[0].y,2450);
assert.deepEqual(layoutConceptNoteCards([{...anchors[0],node:node("fuentes",["gone"])}],valid),[]);
console.log("PASS existing note cards, stable automatic positions, user layouts and missing note cleanup");
