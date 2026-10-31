import {Building,LandFeature,Point2,SiteContext,SiteScene} from '../types/studio';
import {polygonArea,inPolygon} from './geometry';
import cachedBishan from '../data/bishan-context.json';
export const CONTEXT_PRESETS=[
  {name:'Bishan',latitude:1.3506,longitude:103.8488,cached:true},
  {name:'Punggol Northshore',latitude:1.4162,longitude:103.9021},
  {name:'Tiong Bahru',latitude:1.2847,longitude:103.8321},
];
export const LAND_STYLE={
  grass:{label:'Grassland',fill:'#9FCB83'},park:{label:'Parks & gardens',fill:'#78AF82'},
  water:{label:'Lakes & water',fill:'#83C3D5'},river:{label:'Rivers & canals',fill:'#55A5C3'},
};
interface OsmElement {type:string;id:number;lat?:number;lon?:number;nodes?:number[];geometry?:{lat:number;lon:number}[];tags?:Record<string,string>;members?:{type:string;ref:number;role?:string}[];}
export interface MapData {fetchedAt?:string;elements:OsmElement[];}
function metres(value:string|undefined){
  if(!value)return NaN;const match=value.match(/^\s*(\d+(?:\.\d+)?)\s*(m|metres|meters|ft|feet|')?\s*$/i);
  return match?Number(match[1])*(/ft|feet|'/.test(match[2]??'')?.3048:1):NaN;
}
export function localPoint(lon:number,lat:number,originLat:number,originLng:number):Point2{
  return [100+(lon-originLng)*111320*Math.cos(originLat*Math.PI/180),100-(lat-originLat)*110574];
}
export function normaliseContext(raw:MapData,latitude:number,longitude:number,name:string):SiteContext{
  if(!Array.isArray(raw.elements))throw Error('Invalid map dataset.');
  const nodes=new Map(raw.elements.filter(e=>e.type==='node').map(e=>[e.id,e]));
  const ways=new Map(raw.elements.filter(e=>e.type==='way').map(e=>[e.id,e]));
  function geometry(e:OsmElement):Point2[]{
    if(!e.geometry&&e.nodes?.some(id=>!nodes.has(id)))return [];
    const geo=e.geometry??(e.nodes??[]).map(id=>nodes.get(id)).filter((n):n is OsmElement=>!!n);
    if(geo.some(n=>!Number.isFinite(n.lat)||!Number.isFinite(n.lon)))return [];
    return geo.map(n=>localPoint(n.lon!,n.lat!,latitude,longitude));
  }
  const closed=(points:Point2[])=>points.length>=4&&Math.hypot(points[0][0]-points[points.length-1][0],points[0][1]-points[points.length-1][1])<.1;
  const near=(p:Point2[])=>p.length>0&&Math.max(...p.map(v=>v[0]))>=-150&&Math.min(...p.map(v=>v[0]))<=350&&Math.max(...p.map(v=>v[1]))>=-150&&Math.min(...p.map(v=>v[1]))<=350;
  const buildings:Building[]=[],landcover:LandFeature[]=[];
  for(const e of ways.values()){
    const t=e.tags??{},points=geometry(e);
    if(t.building&&t.building!=='no'&&closed(points)&&near(points)){
      const ring=points.slice(0,-1);if(polygonArea(ring)<4)continue;
      const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),width=Math.max(...xs)-Math.min(...xs),depth=Math.max(...zs)-Math.min(...zs);
      const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
      if(width>400||depth>400)continue;
      const explicit=metres(t.height),levels=Number(t['building:levels']);
      const height=Number.isFinite(explicit)&&explicit>=2?explicit:Number.isFinite(levels)&&levels>0?levels*3:15;
      const heightSource=Number.isFinite(explicit)&&explicit>=2?'osm_height':Number.isFinite(levels)&&levels>0?'estimated_levels':'assumed';
      buildings.push({id:'osm-way-'+e.id,name:t['name:en']??'OSM building '+e.id,x,z,width,depth,rotation:0,
        height:Math.min(300,height),storeys:Math.max(1,Math.min(100,Math.round(height/3))),porosity:0,heightSource,
        editable:x>=0&&x<=200&&z>=0&&z<=200,footprint:ring.map(p=>[p[0]-x,p[1]-z])});
    }
    const kind=landKind(t);
    if(kind&&near(points)&&points.length>=2&&(kind==='river'||closed(points)))
      landcover.push({id:'osm-land-'+e.id,kind,type:kind==='river'&&!closed(points)?'line':'polygon',points:closed(points)?points.slice(0,-1):points,
        width:kind==='river'?Math.min(50,metres(t.width)|| (t.waterway==='river'?8:3)):undefined});
  }
  let omittedRelations=0;
  // Stitch complete mapped land-use rings; preserve available inner rings.
  for(const e of raw.elements.filter(v=>v.type==='relation')){
    const kind=landKind(e.tags??{});if(!kind){if(e.tags?.building)omittedRelations++;continue;}
    const stitch=(role:string)=>{
      const lines=(e.members??[]).filter(m=>m.type==='way'&&(m.role??'outer')===role).map(m=>ways.get(m.ref)).filter((w):w is OsmElement=>!!w).map(geometry).filter(p=>p.length>1);
      const rings:Point2[][]=[];
      while(lines.length){let ring=lines.shift()!;let found=true;
        while(!closed(ring)&&found){found=false;for(let i=0;i<lines.length;i++){
          const line=lines[i],last=ring[ring.length-1],start=line[0],end=line[line.length-1];
          if(Math.hypot(last[0]-start[0],last[1]-start[1])<.1){ring=[...ring,...line.slice(1)];lines.splice(i,1);found=true;break;}
          if(Math.hypot(last[0]-end[0],last[1]-end[1])<.1){ring=[...ring,...line.slice().reverse().slice(1)];lines.splice(i,1);found=true;break;}
        }}
        if(closed(ring))rings.push(ring.slice(0,-1));else omittedRelations++;
      }
      return rings;
    };
    const outers=stitch('outer'),holes=stitch('inner');
    for(let i=0;i<outers.length;i++)if(near(outers[i]))landcover.push({id:'osm-relation-'+e.id+'-'+i,kind,type:'polygon',points:outers[i],holes:holes.filter(h=>inPolygon(outers[i],h[0][0],h[0][1]))});
  }
  if(!buildings.length)throw Error('No usable building outlines were returned. The current design has been kept.');
  const chosen=buildings.sort((a,b)=>Math.hypot(a.x-100,a.z-100)-Math.hypot(b.x-100,b.z-100)).slice(0,300);
  return {name,latitude,longitude,fetchedAt:raw.fetchedAt??new Date().toISOString(),source:'OpenStreetMap',landscapeStatus:landcover.length?'available':'unavailable',
    buildings:chosen,landcover:landcover.slice(0,300),note:'OSM coverage is incomplete. Heights use mapped height, levels × 3 m, or an assumed 15 m. Complex building relations are omitted.'+
      (omittedRelations?' '+omittedRelations+' incomplete/unsupported relations skipped.':'')};
}
function landKind(tags:Record<string,string>):LandFeature['kind']|null{
  if(['river','stream','canal'].includes(tags.waterway??''))return 'river';
  if(tags.natural==='water'||tags.landuse==='reservoir'||tags.waterway==='riverbank')return 'water';
  if(['park','garden'].includes(tags.leisure??'')||tags.landuse==='recreation_ground')return 'park';
  if(['grass','meadow'].includes(tags.landuse??'')||tags.natural==='grassland')return 'grass';
  return null;
}
export function bishanContext(){return normaliseContext(cachedBishan as MapData,1.3506,103.8488,'Bishan');}
export function useContext(scene:SiteScene,context:SiteContext):SiteScene{
  return {...scene,blocks:[],buildings:context.buildings.filter(b=>b.editable).map(b=>({...b,footprint:b.footprint?.map(p=>[...p] as Point2)})),context,edited:false};
}
export function surroundingBuildings(scene:SiteScene){return scene.context?.buildings.filter(b=>!b.editable)??[];}
