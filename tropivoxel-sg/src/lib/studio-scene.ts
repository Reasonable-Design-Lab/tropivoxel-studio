import { PRESETS } from './presets';
import { Block, BlockKind, Building, SiteScene, GRID, MAX_STOREYS, BLOCK_METERS } from '../types/studio';
import {containsPoint} from './layout-typology';

export function gardenScene(): Block[] {
  const blocks: Block[] = [];
  const add = (kind: BlockKind, x: number, y: number, z: number) =>
    blocks.push({ id: `${kind}-${x}-${y}-${z}`, x, y, z, kind });
  for (let x = 2; x < 14; x++) for (let z = 2; z < 14; z++) {
    if ((x >= 6 && x <= 9) || (z >= 7 && z <= 8)) add('floor', x, 0, z);
    else add('grass', x, 0, z);
  }
  const towers = [{x:3,z:3,w:3,d:2,h:5}, {x:10,z:4,w:2,d:3,h:7},
    {x:3,z:10,w:3,d:2,h:3}, {x:10,z:10,w:3,d:2,h:4}];
  for (const b of towers) for (let x=b.x;x<b.x+b.w;x++) for (let z=b.z;z<b.z+b.d;z++)
    for(let y=0;y<b.h;y++) add('building',x,y,z);
  for (const [x,z] of [[3,6],[5,6],[3,9],[5,9],[10,2],[12,2],[9,9],[13,9],[7,4],[8,11],[7,12],[12,13]])
    add('tree',x,0,z);
  return blocks;
}

// Adapts the original PPVC builder's scene into the shared environment model.
export function originalScene(): Block[] {
  return PRESETS[0].voxels.map(v => ({
    id: v.id, x: v.x, y: v.y, z: v.z,
    kind: v.moduleType === 'sky_garden' ? 'tree' : 'building',
    porosity: v.moduleType === 'void_colonnade' ? 0.88 : 0,
  }));
}

export function placeBlock(blocks: Block[], kind: BlockKind, x: number, y: number, z: number,buildings:Building[]=[]): Block[] {
  if (![x,y,z].every(Number.isInteger) || x<0 || z<0 || x>=GRID || z>=GRID || y<0 || y>=MAX_STOREYS) return blocks;
  if (kind !== 'building') y = 0;
  const column = blocks.filter(b=>b.x===x && b.z===z);
  const below=buildings.filter(b=>containsPoint(b,(x+.5)*BLOCK_METERS,(z+.5)*BLOCK_METERS));
  if (kind === 'building') {
    if (column.some(b=>b.kind==='building' && b.y===y)) return blocks;
    if(below.some(b=>y<b.storeys))return blocks;
    if (y>0 && !column.some(b=>b.kind==='building' && b.y===y-1) && !below.some(b=>y===b.storeys)) return blocks;
    return [...blocks.filter(b=>!(b.x===x && b.z===z && b.kind==='tree')), {id:crypto.randomUUID(),kind,x,y,z}];
  }
  if ((column.some(b=>b.kind==='building')||below.length) && kind==='tree') return blocks;
  if (column.some(b=>b.kind===kind && b.y===0)) return blocks;
  return [...blocks.filter(b=>!(b.x===x && b.z===z && (kind==='tree' ? b.kind==='tree' : b.kind==='grass'||b.kind==='floor'))),
    {id:crypto.randomUUID(),kind,x,y,z}];
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  const source=blocks.find(b=>b.id===id);
  if (!source) return blocks;
  // Removing a support also removes its stack; no invisible floating obstruction.
  return blocks.filter(b=>b.id!==id && !(source.kind==='building' && b.kind==='building' && b.x===source.x && b.z===source.z && b.y>source.y));
}

export function eraseObject(scene:SiteScene,id:string):SiteScene {
  if(scene.buildings.some(b=>b.id===id&&b.editable===false))return scene;
  if(!scene.buildings.some(b=>b.id===id)){
    const blocks=removeBlock(scene.blocks,id);
    return blocks===scene.blocks?scene:{...scene,blocks,edited:true};
  }
  const buildings=scene.buildings.filter(b=>b.id!==id),supported=new Set<string>();
  const candidates=scene.blocks.filter(b=>b.kind==='building').sort((a,b)=>a.y-b.y);
  for(const b of candidates){
    const base=buildings.some(v=>v.storeys===b.y&&containsPoint(v,(b.x+.5)*BLOCK_METERS,(b.z+.5)*BLOCK_METERS));
    if(b.y===0||base||supported.has(`${b.x},${b.y-1},${b.z}`))supported.add(`${b.x},${b.y},${b.z}`);
  }
  return {...scene,buildings,blocks:scene.blocks.filter(b=>b.kind!=='building'||supported.has(`${b.x},${b.y},${b.z}`)),edited:true};
}

export function validateScene(data: unknown): Block[] {
  if (!Array.isArray(data) || data.length>10000) throw new Error('Invalid scene. A maximum of 10,000 blocks is supported.');
  const ids=new Set<string>(), slots=new Set<string>();
  return data.map(b=>{
    if (!b || typeof b.id!=='string' || ids.has(b.id) || !['building','tree','grass','floor'].includes(b.kind)
      || ![b.x,b.y,b.z].every(Number.isInteger) || b.x<0 || b.x>=GRID || b.z<0 || b.z>=GRID || b.y<0 || b.y>=MAX_STOREYS
      || ((b.kind==='grass'||b.kind==='floor') && b.y!==0)) throw new Error('Invalid or duplicate scene blocks.');
    const slot=`${b.kind}:${b.x}:${b.y}:${b.z}`;
    if (slots.has(slot)) throw new Error('Duplicate block coordinates.');
    ids.add(b.id);slots.add(slot);
    return {id:b.id,x:b.x,y:b.y,z:b.z,kind:b.kind,porosity:Number.isFinite(b.porosity)?Math.max(0,Math.min(1,b.porosity)):0,
      crownRadius:Number.isFinite(b.crownRadius)?Math.max(1,Math.min(6,b.crownRadius)):3.8};
  });
}
