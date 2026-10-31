import {Block,Building,LayoutConfig,SiteScene,DEFAULT_LAYOUT,STOREY_METERS,GRID,BLOCK_METERS} from '../types/studio';
import {inPolygon,pointSegmentDistance} from './geometry';
const RAD=Math.PI/180;
export const TYPOLOGIES = [
  {id:'slab',name:'Parallel slab blocks',geometry:'6 blocks · 52 × 14 m',description:'Directional streets, continuous shade and sheltered wakes.'},
  {id:'tower',name:'Point towers',geometry:'6 towers · 23 × 23 m',description:'Open ground between compact towers. Look for windy, sunlit spaces.'},
  {id:'courtyard',name:'Courtyard blocks',geometry:'4 blocks · 64 × 15 m',description:'Four sides of a shared courtyard, with open corners at the default setting.'},
] as const;

export function containsPoint(b:Building,x:number,z:number,margin=0) {
  const a=b.rotation*RAD,dx=x-b.x,dz=z-b.z;
  const u=dx*Math.cos(a)+dz*Math.sin(a),v=-dx*Math.sin(a)+dz*Math.cos(a);
  if(!b.footprint)return Math.abs(u)<=b.width/2+margin && Math.abs(v)<=b.depth/2+margin;
  return inPolygon(b.footprint,u,v)||margin>0&&b.footprint.some((p,i)=>pointSegmentDistance(u,v,p,b.footprint![(i+1)%b.footprint!.length])<=margin);
}
export function footprintCorners(b:Building) {
  const a=b.rotation*RAD,c=Math.cos(a),s=Math.sin(a);
  return (b.footprint??[[-b.width/2,-b.depth/2],[b.width/2,-b.depth/2],[b.width/2,b.depth/2],[-b.width/2,b.depth/2]]).map(([u,v])=>[
    b.x+u*c-v*s,b.z+u*s+v*c,
  ]);
}
export function footprintsOverlap(a:Building,b:Building) {
  const aa=footprintCorners(a),bb=footprintCorners(b);
  // Imported outlines can be concave; use exact edge intersections and containment.
  if(a.footprint||b.footprint){
    const cross=(p:number[],q:number[],r:number[])=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
    if(aa.some(p=>containsPoint(b,p[0],p[1]))||bb.some(p=>containsPoint(a,p[0],p[1])))return true;
    return aa.some((p,i)=>bb.some((r,j)=>cross(p,aa[(i+1)%aa.length],r)*cross(p,aa[(i+1)%aa.length],bb[(j+1)%bb.length])<0&&
      cross(r,bb[(j+1)%bb.length],p)*cross(r,bb[(j+1)%bb.length],aa[(i+1)%aa.length])<0));
  }
  for(const r of [a.rotation,b.rotation])for(const angle of [r*RAD,r*RAD+Math.PI/2]){
    const project=(p:number[])=>p[0]*Math.cos(angle)+p[1]*Math.sin(angle);
    const x=aa.map(project),y=bb.map(project);
    if(Math.max(...x)<=Math.min(...y)+.001 || Math.max(...y)<=Math.min(...x)+.001)return false;
  }
  return true;
}
export function hasOverlaps(buildings:Building[]) {
  return buildings.some((a,i)=>buildings.slice(i+1).some(b=>footprintsOverlap(a,b)));
}
export function validateLayout(data:unknown):LayoutConfig {
  const c=data as LayoutConfig;
  if(!c || !TYPOLOGIES.some(t=>t.id===c.typology))throw Error('Unknown layout typology.');
  const limits={storeys:[6,30],spacing:[32,58],orientation:[-90,90],porosity:[0,.8],trees:[0,80],greenCover:[0,100]};
  for(const [k,[lo,hi]] of Object.entries(limits))if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw Error('Invalid layout parameter: '+k);
  if(!Number.isInteger(c.storeys)||!Number.isInteger(c.trees))throw Error('Storeys and tree count must be whole numbers.');
  return {...DEFAULT_LAYOUT,...Object.fromEntries(Object.keys(limits).map(k=>[k,c[k]])),typology:c.typology};
}
export function generateBuildings(c:LayoutConfig):Building[] {
  const rows:{x:number;z:number;base:number}[]=[],s=c.spacing;
  if(c.typology==='courtyard') {
    rows.push({x:100,z:100-s,base:0},{x:100,z:100+s,base:0},
      {x:100-s,z:100,base:90},{x:100+s,z:100,base:90});
  }else for(const x of [100-.84*s,100+.84*s])for(const z of [100-s,100,100+s])rows.push({x,z,base:0});
  const width=c.typology==='tower'?23:c.typology==='slab'?52:64,depth=c.typology==='tower'?23:c.typology==='slab'?14:15;
  return rows.map((r,i)=>({id:'layout-'+i,x:r.x,z:r.z,width,depth,rotation:r.base+c.orientation,
    storeys:c.storeys,height:c.storeys*STOREY_METERS,porosity:c.porosity}));
}
const rank=(x:number,z:number)=>((Math.imul(x+11,73856093)^Math.imul(z+7,19349663))>>>0)/4294967296;
export function generateLayout(config:LayoutConfig):SiteScene {
  const c=validateLayout(config),buildings=generateBuildings(c),blocks:Block[]=[];
  // A fixed, nested planting pattern. Its target does not equal measured open-ground coverage.
  for(let z=0;z<GRID;z++)for(let x=0;x<GRID;x++){
    const px=(x+.5)*BLOCK_METERS,pz=(z+.5)*BLOCK_METERS;
    if(Math.abs(px-100)<6||Math.abs(pz-100)<6)continue;
    const score=.65*rank(Math.floor(x/3),Math.floor(z/3))+.35*rank(x,z);
    if(score<c.greenCover/100 && !buildings.some(b=>containsPoint(b,px,pz,2)))
      blocks.push({id:'ground-'+x+'-'+z,x,y:0,z,kind:'grass'});
  }
  const candidates:{x:number;z:number;order:number}[]=[];
  for(let z=2;z<GRID-2;z+=3)for(let x=2;x<GRID-2;x+=3)candidates.push({x,z,order:rank(x*3,z*7)});
  candidates.sort((a,b)=>a.order-b.order||a.x-b.x||a.z-b.z);
  let count=0;
  for(const p of candidates){
    if(count>=c.trees)break;
    const x=(p.x+.5)*BLOCK_METERS,z=(p.z+.5)*BLOCK_METERS;
    if(Math.abs(x-100)<9||Math.abs(z-100)<9||buildings.some(b=>containsPoint(b,x,z,4)))continue;
    blocks.push({id:'tree-'+p.x+'-'+p.z,x:p.x,y:0,z:p.z,kind:'tree',crownRadius:3.8});count++;
  }
  return {config:c,buildings,blocks};
}
