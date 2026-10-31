import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LAYOUT,DEFAULT_BUILDING,DEFAULT_ENV} from '../src/types/studio';
import {generateLayout,footprintCorners} from '../src/lib/layout-typology';
import {newBuilding,updateBuilding,duplicateBuilding,buildingAt} from '../src/lib/building-editor';
import {eraseObject} from '../src/lib/studio-scene';
import {simulateEnvironment} from '../src/lib/environment-engine';
test('editing one building preserves every other building and changes real analysis',()=>{
  const scene=generateLayout(DEFAULT_LAYOUT),id=scene.buildings[0].id;
  const edited=updateBuilding(scene,id,{storeys:22,rotation:20,x:35,porosity:.6});
  assert.equal(edited.buildings[0].height,66);
  assert.equal(edited.buildings[0].rotation,20);
  for(let i=1;i<scene.buildings.length;i++)assert.deepEqual(edited.buildings[i],scene.buildings[i]);
  const a=simulateEnvironment(scene.blocks,DEFAULT_ENV,scene.buildings),b=simulateEnvironment(edited.blocks,DEFAULT_ENV,edited.buildings);
  assert.notDeepEqual([...a.sun],[...b.sun]);assert.notDeepEqual([...a.wind],[...b.wind]);
  assert.deepEqual(scene.buildings[0].height,42);
});
test('a new box defaults to 16 × 16 × 18 m and clamps its actual footprint to the site',()=>{
  const empty={...generateLayout(DEFAULT_LAYOUT),buildings:[],blocks:[]};
  const added=newBuilding(empty,1,1,DEFAULT_BUILDING),b=added.scene.buildings[0];
  assert.equal(b.width,16);assert.equal(b.depth,16);assert.equal(b.height,18);
  for(const [x,z]of footprintCorners(b))assert.ok(x>=0&&x<=200&&z>=0&&z<=200);
  assert.throws(()=>newBuilding(added.scene,b.x,b.z,DEFAULT_BUILDING),/overlaps/);
});
test('new building sizes are configurable and edits remain exportable',()=>{
  const empty={...generateLayout(DEFAULT_LAYOUT),buildings:[],blocks:[]};
  const {scene,id}=newBuilding(empty,100,100,{...DEFAULT_BUILDING,width:24,depth:20,storeys:10});
  const changed=updateBuilding(scene,id,{width:32,depth:24,height:36.5,name:'Test block'});
  assert.equal(changed.buildings[0].width,32);assert.equal(changed.buildings[0].height,36.5);
  assert.equal(scene.buildings[0].height,30);
  assert.throws(()=>updateBuilding(scene,id,{height:NaN}));
  assert.throws(()=>updateBuilding(scene,id,{width:-10}));
});
test('mapped outlines rotate and move without stretching; read-only buildings cannot be edited',()=>{
  const empty={...generateLayout(DEFAULT_LAYOUT),blocks:[]};
  const b={...empty.buildings[0],x:40,z:40,width:20,depth:20,footprint:[[-10,-10],[10,-10],[0,10]]as [number,number][],editable:true};
  const scene={...empty,buildings:[b]};
  const next=updateBuilding(scene,b.id,{x:70,rotation:30,height:27});
  assert.deepEqual(next.buildings[0].footprint,b.footprint);assert.equal(next.buildings[0].x,70);
  assert.throws(()=>updateBuilding(scene,b.id,{width:30}),/Mapped outlines/);
  const fixed={...scene,buildings:[{...b,editable:false}]};assert.equal(updateBuilding(fixed,b.id,{height:60}),fixed);
});
test('a duplicate is independent and a delete keeps other building properties',()=>{
  const empty={...generateLayout(DEFAULT_LAYOUT),buildings:[],blocks:[]};
  const {scene,id}=newBuilding(empty,70,100,DEFAULT_BUILDING);
  const copy=duplicateBuilding(scene,id);
  assert.equal(copy.scene.buildings.length,2);assert.notEqual(copy.id,id);
  const edited=updateBuilding(copy.scene,copy.id,{storeys:14});
  assert.equal(edited.buildings[0].height,18);assert.equal(edited.buildings[1].height,42);
  assert.equal(eraseObject(edited,copy.id).buildings.length,1);
});
test('moving and renaming an estimated building preserves height provenance until its height changes',()=>{
  const base=generateLayout(DEFAULT_LAYOUT),source={...base.buildings[0],heightSource:'assumed' as const,height:15,storeys:5};
  const scene={...base,buildings:[source]};
  const moved=updateBuilding(scene,source.id,{name:'Site block',x:80});
  assert.equal(moved.buildings[0].heightSource,'assumed');
  const raised=updateBuilding(moved,source.id,{height:30});
  assert.equal(raised.buildings[0].heightSource,'design');
});
test('preview geometry is identical to placed geometry, including rotated boundary clamping',()=>{
  const empty={...generateLayout(DEFAULT_LAYOUT),buildings:[],blocks:[]};
  const draft={...DEFAULT_BUILDING,width:24,depth:16,rotation:35};
  const preview=buildingAt(1,199,draft);
  const placed=newBuilding(empty,1,199,draft).scene.buildings[0];
  for(const key of ['x','z','width','depth','height','rotation']as const)assert.equal(placed[key],preview[key]);
  for(const [x,z]of footprintCorners(placed))assert.ok(x>=-1e-8&&x<=200+1e-8&&z>=-1e-8&&z<=200+1e-8);
});
test('non-finite new dimensions are rejected before creating geometry',()=>{
  const empty={...generateLayout(DEFAULT_LAYOUT),buildings:[],blocks:[]};
  assert.throws(()=>newBuilding(empty,100,100,{...DEFAULT_BUILDING,width:NaN}));
  assert.throws(()=>buildingAt(Infinity,100,DEFAULT_BUILDING));
});
test('duplication avoids fixed context buildings and a fixed building cannot be erased',()=>{
  const base=generateLayout(DEFAULT_LAYOUT),source={...base.buildings[0],x:80,z:100,width:16,depth:16,editable:true};
  const obstacle={...source,id:'surrounding',x:104,editable:false};
  const scene={...base,blocks:[],buildings:[source],context:{name:'test',latitude:1.35,longitude:103.84,source:'OpenStreetMap' as const,fetchedAt:new Date().toISOString(),landscapeStatus:'unavailable' as const,buildings:[obstacle],landcover:[]}};
  const copy=duplicateBuilding(scene,source.id);
  assert.notEqual(copy.scene.buildings[1].x,104);
  const fixed={...base,buildings:[obstacle]};assert.equal(eraseObject(fixed,obstacle.id),fixed);
});
