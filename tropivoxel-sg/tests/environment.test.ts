import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_ENV,Block,GRID,RESOLUTION as N} from '../src/types/studio';
import {simulateEnvironment,sunPosition,weatherForTime} from '../src/lib/environment-engine';
import {placeBlock,removeBlock,validateScene,gardenScene,originalScene} from '../src/lib/studio-scene';
const block=(x:number,z:number,y=0,kind:Block['kind']='building'):Block=>({id:[kind,x,y,z].join('-'),x,y,z,kind});
const clear={...DEFAULT_ENV,cloudCover:0,hour:14};

test('solar position uses date, coordinates and Singapore local time',()=>{
  assert.ok(sunPosition({...clear,hour:13}).elevation>sunPosition({...clear,hour:8}).elevation);
  assert.ok(sunPosition({...clear,hour:0}).elevation<0);
  assert.notEqual(sunPosition(clear).elevation,sunPosition({...clear,date:'2026-06-21'}).elevation);
});
test('building geometry produces real shade and wind changes',()=>{
  const open=simulateEnvironment([],clear);
  const tower=simulateEnvironment(Array.from({length:9},(_,y)=>block(7,7,y)),clear);
  const shaded=[...tower.sun].filter((v,q)=>!tower.grid.height[q]&&v<.1);
  assert.ok(shaded.length>0);
  assert.ok(tower.metrics.sun!<open.metrics.sun!);
  assert.ok(tower.metrics.wind!<open.metrics.wind!);
  assert.ok([...tower.utci].every(Number.isFinite));
});
test('trees and grass reduce radiation and thermal proxy',()=>{
  const open=simulateEnvironment([],clear);
  const green=simulateEnvironment([block(7,7,0,'tree'),block(6,7,0,'grass')],clear);
  const q=15*N+15;
  assert.ok(green.sun[q]<open.sun[q]);
  assert.ok(green.utci[q]<open.utci[q]);
  const grass=simulateEnvironment([block(7,7,0,'grass')],clear);
  assert.ok(grass.tmrt[q]<open.tmrt[q]);
});
test('night has no direct sun; a fully occupied site has no fabricated averages',()=>{
  const night=simulateEnvironment([], {...clear,hour:0});
  assert.equal(night.metrics.sun,0);assert.equal(night.metrics.shade,null);
  const full=Array.from({length:GRID*GRID},(_,q)=>block(q%GRID,Math.floor(q/GRID)));
  const r=simulateEnvironment(full,clear);assert.equal(r.metrics.utci,null);assert.equal(r.metrics.wind,null);assert.equal(r.metrics.count,0);
});
test('zero reference wind remains zero; climate changes drive results',()=>{
  assert.equal(simulateEnvironment([], {...clear,windSpeed:0}).metrics.wind,0);
  assert.ok(simulateEnvironment([], {...clear,temperature:35}).metrics.utci!>simulateEnvironment([],clear).metrics.utci!);
  assert.ok(simulateEnvironment([], {...clear,cloudCover:1}).metrics.utci!<simulateEnvironment([],clear).metrics.utci!);
});
test('weather is used only for the exact valid forecast hour in SGT',()=>{
  const hours=[{time:'2026-10-31T06:00:00Z'}];
  assert.equal(weatherForTime(hours,'2026-10-31',14),hours[0]);
  assert.equal(weatherForTime(hours,'2026-10-31',14.5),hours[0]);
  assert.equal(weatherForTime(hours,'2026-10-31',15),undefined);
  assert.equal(weatherForTime(hours,'2026-11-01',14),undefined);
});
test('placing requires support, deduplicates and rejects off-site edits',()=>{
  const empty:Block[]=[];
  assert.equal(placeBlock(empty,'building',2,1,2),empty);
  assert.equal(placeBlock(empty,'building',GRID,0,2),empty);
  const first=placeBlock(empty,'building',2,0,2);
  assert.equal(first.length,1);assert.equal(placeBlock(first,'building',2,0,2),first);
  const stack=placeBlock(first,'building',2,1,2);assert.equal(stack.length,2);
  assert.equal(removeBlock(stack,first[0].id).length,0);
});
test('imports validate both existing scene adapters and reject invalid coordinates',()=>{
  assert.equal(validateScene(gardenScene()).length,gardenScene().length);
  assert.equal(validateScene(originalScene()).length,originalScene().length);
  assert.throws(()=>validateScene([{...block(2,2),x:99}]));
  assert.throws(()=>validateScene([block(2,2),block(2,2)]));
});
