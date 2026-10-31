import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bishanContext,localPoint,useContext,surroundingBuildings,normaliseContext} from '../src/lib/context-data';
import {DEFAULT_ENV,DEFAULT_LAYOUT,Building,LandFeature} from '../src/types/studio';
import {generateLayout,containsPoint} from '../src/lib/layout-typology';
import {validateSite} from '../src/lib/scene-io';
import {simulateEnvironment,rasterize} from '../src/lib/environment-engine';
test('the bundled Bishan sample contains real mapped outlines and explicitly estimated heights',()=>{
  const context=bishanContext();
  assert.equal(context.source,'OpenStreetMap');assert.ok(context.buildings.length>50);
  assert.ok(context.buildings.every(b=>b.id.startsWith('osm-way-')&&b.footprint&&b.footprint.length>=3));
  assert.ok(context.buildings.some(b=>b.heightSource==='assumed'||b.heightSource==='estimated_levels'));
  assert.ok(context.buildings.some(b=>b.editable)&&context.buildings.some(b=>!b.editable));
  const site=useContext(generateLayout(DEFAULT_LAYOUT),context);
  assert.ok(site.buildings.every(b=>b.editable));assert.ok(surroundingBuildings(site).every(b=>!b.editable));
  assert.equal(site.buildings.length+surroundingBuildings(site).length,context.buildings.length);
  assert.equal(validateSite(JSON.parse(JSON.stringify(site))).context!.buildings.length,context.buildings.length);
});
test('WGS84 east/north coordinates map consistently to +X east, +Z south',()=>{
  assert.deepEqual(localPoint(103.8488,1.3506,1.3506,103.8488),[100,100]);
  assert.ok(localPoint(103.8498,1.3506,1.3506,103.8488)[0]>100);
  assert.ok(localPoint(103.8488,1.3516,1.3506,103.8488)[1]<100);
});
test('a concave mapped footprint preserves its recess after rotation',()=>{
  const b:Building={id:'mapped',x:100,z:100,width:40,depth:40,rotation:0,storeys:5,height:15,porosity:0,
    footprint:[[-20,-20],[20,-20],[20,0],[0,0],[0,20],[-20,20]]};
  assert.ok(containsPoint(b,90,110));assert.ok(!containsPoint(b,110,110));
  const rotated={...b,rotation:90};assert.ok(!containsPoint(rotated,90,110));assert.ok(containsPoint(rotated,90,90));
});
test('a read-only building outside the design square still casts shade and obstructs sky and wind',()=>{
  const b:Building={id:'outside',x:-25,z:100,width:30,depth:180,rotation:0,storeys:30,height:90,porosity:0,editable:false};
  const env={...DEFAULT_ENV,hour:16,windDirection:270,cloudCover:0};
  const open=simulateEnvironment([],env),context=simulateEnvironment([],env,[b]);
  assert.equal(context.metrics.count,10000);
  assert.ok(context.metrics.sun!<open.metrics.sun!);assert.ok(context.metrics.svf!<open.metrics.svf!);assert.ok(context.metrics.wind!<open.metrics.wind!);
});
test('known water and river buffers are excluded while polygon holes stay walkable',()=>{
  const water:LandFeature={id:'lake',kind:'water',type:'polygon',points:[[40,40],[160,40],[160,160],[40,160]],holes:[[[80,80],[120,80],[120,120],[80,120]]]};
  const river:LandFeature={id:'river',kind:'river',type:'line',width:6,points:[[0,20],[200,20]]};
  const a=rasterize([],[],[water,river]);assert.equal(a.water[25*100+25],1);assert.equal(a.water[50*100+50],0);
  assert.ok(simulateEnvironment([],DEFAULT_ENV,[],[water,river]).metrics.count<10000);
});
test('invalid or incomplete map results do not fabricate buildings',()=>{
  assert.throws(()=>normaliseContext({elements:[]},1.3506,103.8488,'Empty'),/No usable/);
  const raw={elements:[{type:'way',id:1,nodes:[1,2,3,1],tags:{building:'yes'}}]};
  assert.throws(()=>normaliseContext(raw,1.3506,103.8488,'Missing nodes'),/No usable/);
});
