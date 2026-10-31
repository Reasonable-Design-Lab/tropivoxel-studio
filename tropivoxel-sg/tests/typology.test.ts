import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LAYOUT,DEFAULT_ENV,LayoutConfig} from '../src/types/studio';
import {generateLayout,generateBuildings,containsPoint,hasOverlaps,validateLayout,footprintCorners} from '../src/lib/layout-typology';
import {rasterize,simulateEnvironment} from '../src/lib/environment-engine';
import {validateSite} from '../src/lib/scene-io';
import {placeBlock,eraseObject} from '../src/lib/studio-scene';
const scene=(patch:Partial<LayoutConfig>={})=>generateLayout({...DEFAULT_LAYOUT,...patch});
const clear={...DEFAULT_ENV,hour:15,cloudCover:0};

test('typologies use the requested exact metre dimensions and 3 m storeys',()=>{
  for(const [typology,count,width,depth] of [['slab',6,52,14],['tower',6,23,23],['courtyard',4,64,15]]as const){
    const s=scene({typology});assert.equal(s.buildings.length,count);
    for(const b of s.buildings){assert.equal(b.width,width);assert.equal(b.depth,depth);assert.equal(b.height,42);assert.equal(b.storeys,14);}
  }
  for(const storeys of [6,30])assert.ok(scene({storeys}).buildings.every(b=>b.height===storeys*3));
});
test('spacing is a centre-location parameter, with different meanings by typology',()=>{
  const b=scene({spacing:50}).buildings;
  assert.equal(b[1].z-b[0].z,50);assert.equal(b[3].x-b[0].x,84);
  const c=scene({typology:'courtyard',spacing:50}).buildings;
  assert.equal(c[1].z-c[0].z,100);assert.equal(c[3].x-c[2].x,100);
});
test('orientation rotates each footprint while leaving every centre fixed',()=>{
  for(const typology of ['slab','tower','courtyard']as const){
    const a=scene({typology}).buildings,b=scene({typology,orientation:30}).buildings;
    a.forEach((v,i)=>{assert.equal(v.x,b[i].x);assert.equal(v.z,b[i].z);assert.equal(b[i].rotation-v.rotation,30);});
  }
  assert.deepEqual(scene({typology:'courtyard'}).buildings.map(b=>b.rotation),[0,0,90,90]);
  assert.equal(hasOverlaps(scene({typology:'courtyard'}).buildings),false);
});
test('point-tower occupancy is invariant under a 90 degree turn; slabs are not',()=>{
  const mask=(typology:'tower'|'slab',orientation:number)=>[...rasterize([],generateBuildings({...DEFAULT_LAYOUT,typology,orientation})).height];
  assert.deepEqual(mask('tower',0),mask('tower',90));
  assert.notDeepEqual(mask('slab',0),mask('slab',90));
});
test('trees are deterministic, avoid buildings and paths, and adapt to the layout',()=>{
  const a=scene({trees:80}),b=scene({trees:80});
  const trees=a.blocks.filter(v=>v.kind==='tree');assert.deepEqual(trees,b.blocks.filter(v=>v.kind==='tree'));
  assert.ok(trees.length>0&&trees.length<=80);
  for(const t of trees){
    const x=(t.x+.5)*4,z=(t.z+.5)*4;
    assert.ok(Math.abs(x-100)>=9&&Math.abs(z-100)>=9);
    assert.ok(!a.buildings.some(v=>containsPoint(v,x,z,4)));
  }
  const small=scene({trees:20}).blocks.filter(v=>v.kind==='tree').map(v=>v.id);
  assert.deepEqual(small,trees.slice(0,20).map(v=>v.id));
  assert.notDeepEqual(trees.map(v=>v.id),scene({typology:'tower',trees:80}).blocks.filter(v=>v.kind==='tree').map(v=>v.id));
});
test('green cover is a deterministic nested pattern and keeps central paths clear',()=>{
  const low=scene({greenCover:20}),high=scene({greenCover:80});
  const highIds=new Set(high.blocks.filter(v=>v.kind==='grass').map(v=>v.id));
  for(const b of low.blocks.filter(v=>v.kind==='grass')){
    assert.ok(highIds.has(b.id));assert.ok(Math.abs((b.x+.5)*4-100)>=6);assert.ok(Math.abs((b.z+.5)*4-100)>=6);
  }
  assert.ok(highIds.size>low.blocks.filter(v=>v.kind==='grass').length);
});
test('switching typology recalculates sun, sky view, radiation and wind',()=>{
  const a=scene(),b=scene({typology:'tower'});
  const ra=simulateEnvironment(a.blocks,clear,a.buildings),rb=simulateEnvironment(b.blocks,clear,b.buildings);
  for(const field of ['sun','svf','tmrt','wind']as const)assert.notDeepEqual([...ra[field]],[...rb[field]]);
  assert.ok(Number.isFinite(ra.metrics.utci));assert.ok(Number.isFinite(rb.metrics.utci));
});
test('void-deck porosity weakens the modelled wind wake without changing solar geometry',()=>{
  const a=scene({porosity:0}),b=scene({porosity:.8});
  const ra=simulateEnvironment(a.blocks,clear,a.buildings),rb=simulateEnvironment(b.blocks,clear,b.buildings);
  assert.deepEqual([...ra.sun],[...rb.sun]);assert.ok(rb.metrics.wind!>ra.metrics.wind!);
});
test('regenerated geometry remains inside the 200 m site at parameter extremes',()=>{
  for(const typology of ['slab','tower','courtyard']as const)for(const spacing of [32,58])for(const orientation of [-90,-45,0,45,90]){
    for(const b of scene({typology,spacing,orientation}).buildings)for(const [x,z] of footprintCorners(b))assert.ok(x>=0&&x<=200&&z>=0&&z<=200);
  }
});
test('scene round trips preserve layout and geometry, and imported heights are derived from storeys',()=>{
  const a=scene({typology:'courtyard',orientation:15,storeys:22});
  assert.deepEqual(validateSite(JSON.parse(JSON.stringify(a))).buildings,a.buildings);
  assert.equal(validateSite({...a,buildings:a.buildings.map(b=>({...b,height:999}))}).buildings[0].height,66);
  assert.throws(()=>validateLayout({...DEFAULT_LAYOUT,storeys:31}));
  assert.throws(()=>validateLayout({...DEFAULT_LAYOUT,orientation:91}));
  assert.throws(()=>validateSite({...a,buildings:[{...a.buildings[0],storeys:Infinity}]}));
});
test('manual blocks can rest on generated roofs and are removed when that support is erased',()=>{
  const a=scene(),b=a.buildings[0],x=Math.floor(b.x/4),z=Math.floor(b.z/4);
  const blocks=placeBlock(a.blocks,'building',x,b.storeys,z,a.buildings);
  assert.equal(blocks.length,a.blocks.length+1);
  const removed=eraseObject({...a,blocks},b.id);
  assert.equal(removed.buildings.length,5);
  assert.ok(!removed.blocks.some(v=>v.kind==='building'&&v.x===x&&v.z===z));
});
