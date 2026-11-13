import assert from "node:assert/strict";
import { ensurePrimaryMapNotes, removePrimaryMapNode } from "./conceptPrimaryNotes.ts";
const concept=(id,title,parent_id=null,more={})=>({id,title,parent_id,category_id:"trading",
  linked_note_ids:[],note_positions:{},position:null,width:null,color:"emerald",icon:"Layers",primary_note_id:null,...more});
const shared={id:"legacy-note",title:"Documento original",comment:"Important",type:"note",category_id:"trading",
  images:[],documents:[],links:[],tags:[],done:false};
const data={__SYSTEM_CONCEPT_NODES__:[
 concept("source","Fuentes",null,{linked_note_ids:["legacy-note"],note_positions:{"legacy-note":{x:300,y:450}},position:{x:100,y:150},width:320}),
 concept("analysis","Análisis","source"),
],__SYSTEM_TASKS__:[structuredClone(shared)]};
ensurePrimaryMapNotes(data);
assert.equal(data.__SYSTEM_TASKS__.length,3);
assert.equal(data.__SYSTEM_CONCEPT_NODES__[0].primary_note_id,"map-note-source");
assert.equal(data.__SYSTEM_CONCEPT_NODES__[1].primary_note_id,"map-note-analysis");
assert.equal(data.__SYSTEM_TASKS__[1].title,"Fuentes");
assert.equal(data.__SYSTEM_TASKS__[2].title,"Análisis");
assert.equal(data.__SYSTEM_TASKS__[0].comment,"Important");
assert.deepEqual(data.__SYSTEM_CONCEPT_NODES__[0].linked_note_ids,["legacy-note"]);
assert.deepEqual(data.__SYSTEM_CONCEPT_NODES__[0].note_positions,{"legacy-note":{x:300,y:450}});
assert.equal(data.__SYSTEM_CONCEPT_NODES__[0].width,320);
assert.deepEqual(data.__SYSTEM_CONCEPT_NODES__[0].position,{x:100,y:150});
const snapshot=structuredClone(data);
ensurePrimaryMapNotes(data);
assert.deepEqual(data,snapshot,"repeated normalization cannot duplicate notes");
const edited=data.__SYSTEM_TASKS__.find(item=>item.id==="map-note-source");
edited.title="Fuentes de datos";
edited.comment="Resultado de investigación";
edited.links=[{id:"web",title:"Origen",url:"https://example.com"}];
ensurePrimaryMapNotes(data);
assert.equal(data.__SYSTEM_CONCEPT_NODES__[0].title,"Fuentes de datos");
assert.equal(data.__SYSTEM_TASKS__.length,3);
assert.equal(data.__SYSTEM_TASKS__[1].comment,"Resultado de investigación");
const existing=structuredClone(data);
removePrimaryMapNode(data.__SYSTEM_CONCEPT_NODES__,"map-note-source");
assert.equal(data.__SYSTEM_CONCEPT_NODES__.length,1);
assert.equal(data.__SYSTEM_CONCEPT_NODES__[0].parent_id,null,"child is retained and elevated one level");
assert.deepEqual(data.__SYSTEM_TASKS__,existing.__SYSTEM_TASKS__,"node removal alone does not delete notes");
console.log("PASS map node->note migration, idempotence, original links and safe hierarchy deletion");
