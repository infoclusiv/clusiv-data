import assert from "node:assert/strict";
import { conceptGroupBounds, groupEdgePoint, linkedNoteParent } from "./conceptGroupGeometry.ts";
const boxes = [
  {id:"g",parentId:null,parentNoteId:null,x:500,y:300,width:220,height:80},
  {id:"a",parentId:"g",parentNoteId:null,x:280,y:430,width:130,height:55},
  {id:"b",parentId:"g",parentNoteId:null,x:760,y:430,width:130,height:55},
  {id:"noteChild",parentId:"g",parentNoteId:"note1",x:1400,y:400,width:160,height:60},
];
const group=conceptGroupBounds("g",boxes);
assert.ok(group);
assert.equal(group.left,191);
assert.equal(group.right,849);
assert.ok(group.bottom < 800);
const right=groupEdgePoint(group,{x:1250,y:430});
assert.equal(right.x,group.right);
assert.equal(right.y,430);
const top=groupEdgePoint(group,{x:500,y:-300});
assert.equal(top.y,group.top);
assert.deepEqual(linkedNoteParent({parent_id:"g",parent_note_id:"note1"},[
  {conceptId:"g",noteId:"note1",x:1150,y:430}
]),{x:1150,y:430});
assert.equal(linkedNoteParent({parent_id:"g",parent_note_id:"missing"},[]),null);
console.log("PASS nested group geometry and connected note card child anchors");
