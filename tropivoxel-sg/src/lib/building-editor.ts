import {Building,BuildingDraft,SiteScene,STOREY_METERS,MAX_STOREYS} from '../types/studio';
import {containsPoint,footprintCorners,footprintsOverlap} from './layout-typology';
export function fitBuilding(b:Building):Building {
  const points=footprintCorners({...b,x:0,z:0});
  const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  if(Math.max(...xs)-Math.min(...xs)>200||Math.max(...zs)-Math.min(...zs)>200)throw Error('The footprint must fit inside the 200 m design area.');
  return {...b,x:Math.max(-Math.min(...xs),Math.min(200-Math.max(...xs),b.x)),
    z:Math.max(-Math.min(...zs),Math.min(200-Math.max(...zs),b.z))};
}
function cleanBlocks(scene:SiteScene,buildings:Building[]){
  const supported=new Set<string>();
  const ordered=scene.blocks.filter(b=>b.kind==='building').sort((a,b)=>a.y-b.y);
  for(const b of ordered)if(b.y===0||supported.has(`${b.x},${b.y-1},${b.z}`)||
    buildings.some(v=>Math.abs(v.height-b.y*STOREY_METERS)<.01&&containsPoint(v,(b.x+.5)*4,(b.z+.5)*4)))supported.add(`${b.x},${b.y},${b.z}`);
  return scene.blocks.filter(b=>{
    if(b.kind==='building')return supported.has(`${b.x},${b.y},${b.z}`)&&!buildings.some(v=>v.height>b.y*3&&containsPoint(v,(b.x+.5)*4,(b.z+.5)*4));
    if(b.kind==='tree')return !buildings.some(v=>containsPoint(v,(b.x+.5)*4,(b.z+.5)*4,b.crownRadius??3.8));
    return true;
  });
}
export function updateBuilding(scene:SiteScene,id:string,patch:Partial<Pick<Building,'name'|'x'|'z'|'width'|'depth'|'rotation'|'storeys'|'height'|'porosity'>>):SiteScene {
  const original=scene.buildings.find(b=>b.id===id);if(!original||original.editable===false)return scene;
  const b={...original,...patch,heightSource:patch.height!==undefined||patch.storeys!==undefined?'design' as const:original.heightSource};
  if(!Number.isFinite(b.x)||!Number.isFinite(b.z))throw Error('Enter a valid position.');
  if(!b.footprint&&(!Number.isFinite(b.width)||!Number.isFinite(b.depth)||b.width<4||b.depth<4||b.width>120||b.depth>120))throw Error('Length and depth must be 4–120 m.');
  if(!Number.isFinite(b.rotation)||b.rotation< -180||b.rotation>180)throw Error('Rotation must be between -180° and 180°.');
  if(!Number.isFinite(b.porosity)||b.porosity<0||b.porosity>.8)throw Error('Porosity must be 0–80%.');
  if(patch.height!==undefined){if(!Number.isFinite(b.height)||b.height<3||b.height>300)throw Error('Height must be 3–300 m.');b.storeys=Math.max(1,Math.round(b.height/3));}
  else if(patch.storeys!==undefined){if(!Number.isInteger(b.storeys)||b.storeys<1||b.storeys>100)throw Error('Choose 1–100 storeys.');b.height=b.storeys*STOREY_METERS;}
  if(original.footprint&&(patch.width!==undefined||patch.depth!==undefined))throw Error('Mapped outlines retain their original footprint; edit height, position or rotation.');
  if(b.name)b.name=b.name.slice(0,80);
  const fitted=b.footprint?{...b,x:Math.max(0,Math.min(200,b.x)),z:Math.max(0,Math.min(200,b.z))}:fitBuilding(b);
  const buildings=scene.buildings.map(v=>v.id===id?fitted:v);
  return {...scene,buildings,blocks:cleanBlocks(scene,buildings),edited:true};
}
export function newBuilding(scene:SiteScene,x:number,z:number,draft:BuildingDraft):{scene:SiteScene;id:string} {
  if(scene.buildings.length>=500)throw Error('The scene supports up to 500 editable buildings.');
  const id='design-'+crypto.randomUUID();
  const b=buildingAt(x,z,draft,id,'Building '+(scene.buildings.length+1));
  if([...scene.buildings,...scene.context?.buildings.filter(v=>!v.editable)??[]].some(v=>footprintsOverlap(b,v)))throw Error('This footprint overlaps a building. Choose an open area or reduce its size.');
  const buildings=[...scene.buildings,b];
  return {id,scene:{...scene,buildings,blocks:cleanBlocks(scene,buildings),edited:true}};
}
export function duplicateBuilding(scene:SiteScene,id:string):{scene:SiteScene;id:string}{
  if(scene.buildings.length>=500)throw Error('The scene supports up to 500 editable buildings.');
  const source=scene.buildings.find(b=>b.id===id);if(!source||source.editable===false)throw Error('Select an editable building.');
  for(const [dx,dz]of [[source.width+8,0],[-source.width-8,0],[0,source.depth+8],[0,-source.depth-8],[30,30],[-30,-30],[45,-45],[-45,45]]){
    const b=fitBuilding({...source,x:source.x+dx,z:source.z+dz});
    if([...scene.buildings,...scene.context?.buildings.filter(v=>!v.editable)??[]].some(v=>footprintsOverlap(b,v)))continue;
    const next={...b,id:'design-'+crypto.randomUUID(),name:(source.name??'Building')+' copy'};
    const buildings=[...scene.buildings,next];return {id:next.id,scene:{...scene,buildings,blocks:cleanBlocks(scene,buildings),edited:true}};
  }
  throw Error('No clear space for a copy. Move a building or reduce its size first.');
}
export function buildingAt(x:number,z:number,draft:BuildingDraft,id='preview',name='New building'):Building{
  if(![x,z,draft.width,draft.depth,draft.storeys,draft.rotation,draft.porosity].every(Number.isFinite)||
    !Number.isInteger(draft.storeys)||draft.storeys<1||draft.storeys>MAX_STOREYS||
    draft.width<4||draft.depth<4||draft.width>80||draft.depth>80||Math.abs(draft.rotation)>180||draft.porosity<0||draft.porosity>.8)
    throw Error('Invalid new building dimensions.');
  return fitBuilding({id,name,x,z,...draft,height:draft.storeys*STOREY_METERS,heightSource:'design',editable:true});
}
