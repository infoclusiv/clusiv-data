import assert from "node:assert/strict";
import { assertConceptReparent, canReparentConcept, descendantsOfConcept, applyConceptReparent } from "./conceptReparent.ts";

const nodes = [
  {id:"data",category_id:"trading",parent_id:null},
  {id:"sources",category_id:"trading",parent_id:"data"},
  {id:"csv",category_id:"trading",parent_id:"sources"},
  {id:"analysis",category_id:"trading",parent_id:null},
  {id:"model",category_id:"other",parent_id:null},
];
assert.deepEqual(descendantsOfConcept(nodes,"data"), new Set(["sources","csv"]));
assert.deepEqual(descendantsOfConcept(nodes,"analysis"), new Set());
assert.equal(canReparentConcept(nodes,"sources","analysis"),true);
assert.equal(canReparentConcept(nodes,"csv","analysis"),true);
assert.equal(canReparentConcept(nodes,"sources",null),true);
assert.equal(canReparentConcept(nodes,"analysis",null),false);
assert.equal(canReparentConcept(nodes,"sources","sources"),false);
assert.equal(canReparentConcept(nodes,"data","csv"),false);
assert.equal(canReparentConcept(nodes,"sources","csv"),false);
assert.equal(canReparentConcept(nodes,"sources","model"),false);
assert.equal(canReparentConcept(nodes,"sources","data"),false);
assert.throws(()=>assertConceptReparent(nodes,"data","csv"),/descendientes/);
assert.throws(()=>assertConceptReparent(nodes,"sources","sources"),/propio padre/);
assert.throws(()=>assertConceptReparent(nodes,"sources","model"),/distintas categorías/);
assert.throws(()=>assertConceptReparent(nodes,"none","analysis"),/ya no existe/);
assert.throws(()=>assertConceptReparent(nodes,"sources","none"),/ya no existe/);
assert.doesNotThrow(()=>assertConceptReparent(nodes,"sources","analysis"));
assert.doesNotThrow(()=>assertConceptReparent(nodes,"sources",null));
const cyclic=[{id:"a",category_id:"trading",parent_id:"b"},{id:"b",category_id:"trading",parent_id:"a"},{id:"c",category_id:"trading",parent_id:null}];
assert.throws(()=>assertConceptReparent(cyclic,"c","a"),/ciclo/);
console.log("PASS reparent valid, detach root, subtree, prevent cycles, self, cross-category, no-op");

const testNodes = [
  {id:"data",category_id:"trading",parent_id:null,position:null,width:220,title:"Datos",color:"teal",icon:"Layers",linked_note_ids:["note-1"]},
  {id:"sources",category_id:"trading",parent_id:"data",position:null,width:320,title:"Fuentes",color:"amber",icon:"Layers",linked_note_ids:["note-2"]},
  {id:"csv",category_id:"trading",parent_id:"sources",position:null,width:null,title:"CSV",color:"sky",icon:"Layers",linked_note_ids:[]},
  {id:"analysis",category_id:"trading",parent_id:null,position:null,width:260,title:"Análisis",color:"lime",icon:"Layers",linked_note_ids:[]},
  {id:"foreign",category_id:"other",parent_id:null,position:{x:50,y:60},width:250,title:"Otra categoría",color:"sky",icon:"Layers",linked_note_ids:[]},
];
const originalNotes = testNodes.map((node)=>[node.id,[...node.linked_note_ids]]);
const frozen = [
  {id:"data",x:150.3,y:180.7},
  {id:"sources",x:410.4,y:280.6},
  {id:"csv",x:530.1,y:420.1},
  {id:"analysis",x:820.9,y:250.2},
  {id:"foreign",x:1200,y:1200},
];
assert.equal(applyConceptReparent(testNodes,"sources","analysis",frozen), true);
assert.equal(testNodes[1].parent_id,"analysis");
assert.deepEqual(testNodes[1].position,{x:410,y:281});
assert.deepEqual(testNodes[2].position,{x:530,y:420});
assert.deepEqual(testNodes[3].position,{x:821,y:250});
assert.deepEqual(testNodes[4].position,{x:50,y:60},"unrelated category must remain untouched");
assert.deepEqual(testNodes.map((node)=>[node.id,node.linked_note_ids]), originalNotes);
assert.equal(testNodes[1].width,320,"manual widths remain unchanged");
assert.equal(applyConceptReparent(testNodes,"sources",null,frozen),true,"may drop on category root");
assert.equal(testNodes[1].parent_id,null);
assert.equal(applyConceptReparent(testNodes,"sources",null,frozen),false,"no-op change does not write");
const copy=structuredClone(testNodes);
assert.throws(()=>applyConceptReparent(testNodes,"analysis","csv",frozen),/descendientes/);
assert.deepEqual(testNodes,copy,"invalid drops leave data untouched");
assert.throws(()=>applyConceptReparent(testNodes,"sources","analysis",[{id:"sources",x:Infinity,y:0}]),/coordenadas/);
assert.deepEqual(testNodes,copy,"nonfinite positions leave data untouched");
console.log("PASS atomic reparent preserves coordinates, widths, note links and unrelated categories");
