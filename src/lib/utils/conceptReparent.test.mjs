import assert from "node:assert/strict";
import { assertConceptReparent, canReparentConcept, descendantsOfConcept } from "./conceptReparent.ts";

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
