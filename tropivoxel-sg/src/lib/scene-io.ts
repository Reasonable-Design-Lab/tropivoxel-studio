import {Environment,DEFAULT_ENV,SiteScene,Building,DEFAULT_LAYOUT,STOREY_METERS,SiteContext,Point2,LandFeature} from '../types/studio';
import {validateLayout} from './layout-typology';
import {validateScene} from './studio-scene';
import {polygonArea} from './geometry';
export function validateEnvironment(data:unknown):Environment {
  const e=data as Environment;
  if(!e||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!Number.isFinite(Date.parse(e.date)))throw Error('Invalid simulation date.');
  const ranges={hour:[0,23.5],latitude:[-90,90],longitude:[-180,180],temperature:[-20,50],humidity:[0,100],windSpeed:[0,25],windDirection:[0,360],cloudCover:[0,1]};
  for(const [k,[lo,hi]]of Object.entries(ranges))if(!Number.isFinite(e[k])||e[k]<lo||e[k]>hi)throw Error('Invalid weather parameter: '+k);
  return {...DEFAULT_ENV,...Object.fromEntries(Object.keys(ranges).map(k=>[k,e[k]])),date:e.date};
}
function readPoints(data:unknown,min=3):Point2[]{
  if(!Array.isArray(data)||data.length<min||data.length>1000)throw Error('Invalid map outline.');
  return data.map(p=>{if(!Array.isArray(p)||p.length!==2||!p.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000))throw Error('Invalid outline coordinates.');return [p[0],p[1]];});
}
function readBuildings(data:unknown,context=false):Building[]{
  if(!Array.isArray(data)||data.length>500)throw Error('Invalid building collection.');
  const ids=new Set<string>();
  return data.map(b=>{
    if(!b||typeof b.id!=='string'||b.id.length>150||ids.has(b.id))throw Error('Invalid building ID.');
    for(const [k,[lo,hi]]of Object.entries({x:context?[-300,500]:[0,200],z:context?[-300,500]:[0,200],width:[.5,400],depth:[.5,400],rotation:[-360,360],storeys:[1,100],porosity:[0,.8]}))
      if(!Number.isFinite(b[k])||b[k]<lo||b[k]>hi)throw Error('Invalid building geometry: '+k);
    if(!Number.isInteger(b.storeys))throw Error('Building storeys must be a whole number.');
    const heightSource=['osm_height','estimated_levels','assumed','design'].includes(b.heightSource)?b.heightSource:undefined;
    const height=heightSource?b.height:b.storeys*STOREY_METERS;
    if(!Number.isFinite(height)||height<2||height>300)throw Error('Invalid building height.');
    const footprint=b.footprint===undefined?undefined:readPoints(b.footprint);
    if(footprint&&polygonArea(footprint)<1)throw Error('Invalid building footprint area.');
    ids.add(b.id);
    return {id:b.id,x:b.x,z:b.z,width:b.width,depth:b.depth,rotation:b.rotation,storeys:b.storeys,height,porosity:b.porosity,
      ...(typeof b.name==='string'?{name:b.name.slice(0,80)}:{}),...(footprint?{footprint}:{}),...(heightSource?{heightSource}:{}),
      ...(context?{editable:b.x>=0&&b.x<=200&&b.z>=0&&b.z<=200}:b.editable===undefined?{}:{editable:b.editable!==false})};
  });
}
function readContext(value:unknown):SiteContext{
  const c=value as SiteContext;
  if(!c||c.source!=='OpenStreetMap'||typeof c.name!=='string'||!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)
    ||c.latitude<1.15||c.latitude>1.5||c.longitude<103.55||c.longitude>104.15||!Number.isFinite(Date.parse(c.fetchedAt)))throw Error('Invalid context metadata.');
  if(!Array.isArray(c.landcover)||c.landcover.length>500)throw Error('Invalid landscape data.');
  const landcover:LandFeature[]=c.landcover.map(f=>{
    if(!f||typeof f.id!=='string'||!['grass','park','water','river'].includes(f.kind)||!['polygon','line'].includes(f.type))throw Error('Invalid land feature.');
    if(f.holes!==undefined&&(!Array.isArray(f.holes)||f.holes.length>100))throw Error('Invalid landscape holes.');
    return {id:f.id,kind:f.kind,type:f.type,points:readPoints(f.points,f.type==='line'?2:3),holes:f.holes?.map(h=>readPoints(h)),width:Number.isFinite(f.width)?Math.max(1,Math.min(50,f.width!)):undefined};
  });
  return {name:c.name.slice(0,80),latitude:c.latitude,longitude:c.longitude,source:'OpenStreetMap',fetchedAt:c.fetchedAt,
    dataDate:typeof c.dataDate==='string'?c.dataDate:undefined,landscapeStatus:landcover.length?'available':'unavailable',
    note:typeof c.note==='string'?c.note.slice(0,700):undefined,buildings:readBuildings(c.buildings,true),landcover};
}
export function validateSite(data:unknown):SiteScene {
  const s=data as SiteScene;
  if(!s)throw Error('Invalid scene file.');
  const config=validateLayout(s.config??DEFAULT_LAYOUT),blocks=validateScene(s.blocks),buildings=readBuildings(s.buildings);
  if(buildings.some(b=>blocks.some(v=>v.id===b.id)))throw Error('Duplicate scene IDs.');
  return {config,blocks,buildings,edited:!!s.edited,context:s.context?readContext(s.context):undefined};
}

