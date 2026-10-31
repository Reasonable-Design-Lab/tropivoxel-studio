// Extracted/adapted from Cooler Estates Studio/package/cooler-estates.html.
// Concept-stage screening: UTCI is the original linear proxy, wind is a wake heuristic.
import { Block, Building, LandFeature, Environment, BLOCK_METERS, STOREY_METERS, CELL, RESOLUTION as N } from '../types/studio';
import {containsPoint} from './layout-typology';
import {inPolygon,pointSegmentDistance} from './geometry';
const RAD=Math.PI/180, PERSON=1.1, SIG=5.67e-8;
const inside=(x:number,z:number)=>x>=0 && z>=0 && x<N && z<N;
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));

export function sunPosition(env: Pick<Environment,'date'|'hour'|'latitude'|'longitude'>) {
  const date=new Date(env.date+'T12:00:00Z');
  const doy=Math.floor((date.getTime()-Date.UTC(date.getUTCFullYear(),0,0))/86400000);
  const decl=23.45*Math.sin(2*Math.PI*(284+doy)/365)*RAD, b=2*Math.PI*(doy-81)/364;
  const eot=9.87*Math.sin(2*b)-7.53*Math.cos(b)-1.5*Math.sin(b);
  // Site editor uses Singapore local time (UTC+8); +x east, +z south.
  const h=(env.hour+(4*(env.longitude-120)+eot)/60-12)*15*RAD, lat=env.latitude*RAD;
  const elevation=Math.asin(clamp(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(h),-1,1))/RAD;
  const azimuth=(Math.atan2(Math.sin(h),Math.cos(h)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))/RAD+540)%360;
  return {elevation,azimuth};
}

const PAD=100,OUTER=N+2*PAD;
export function rasterize(blocks: Block[], buildings:Building[] = [],landcover:LandFeature[]=[]) {
  const height=new Float32Array(N*N), canopy=new Float32Array(N*N), treeHeight=new Float32Array(N*N);
  const surface=new Uint8Array(N*N), porosity=new Float32Array(N*N),water=new Uint8Array(N*N);
  const occluderHeight=new Float32Array(OUTER*OUTER),occluderPorosity=new Float32Array(OUTER*OUTER);
  const ratio=BLOCK_METERS/CELL;
  // Rasterize the exact rotated metre-based footprints used by the renderer.
  for(const b of buildings) {
    const radius=Math.hypot(b.width,b.depth)/2;
    for(let z=Math.max(-PAD,Math.floor((b.z-radius)/CELL));z<Math.min(N+PAD,Math.ceil((b.z+radius)/CELL));z++)
      for(let x=Math.max(-PAD,Math.floor((b.x-radius)/CELL));x<Math.min(N+PAD,Math.ceil((b.x+radius)/CELL));x++) {
        if(!containsPoint(b,(x+.5)*CELL,(z+.5)*CELL))continue;
        const outer=(z+PAD)*OUTER+x+PAD;
        if(b.height>=occluderHeight[outer]){occluderHeight[outer]=b.height;occluderPorosity[outer]=b.porosity;}
        if(inside(x,z)){const q=z*N+x;if(b.height>=height[q]) {height[q]=b.height;porosity[q]=b.porosity;}}
      }
  }
  for(const b of blocks) {
    if(b.kind==='tree') continue;
    for(let z=b.z*ratio;z<(b.z+1)*ratio;z++) for(let x=b.x*ratio;x<(b.x+1)*ratio;x++) {
      const q=z*N+x;
      if(b.kind==='building' && (b.y+1)*STOREY_METERS>height[q]) {height[q]=(b.y+1)*STOREY_METERS;if(b.y===0) porosity[q]=b.porosity??0;}
      if(b.kind==='grass') surface[q]=1;
      if(b.kind==='floor') surface[q]=0;
    }
  }
  for(const b of blocks.filter(b=>b.kind==='tree')) {
    const cx=(b.x+.5)*ratio,cz=(b.z+.5)*ratio,r=(b.crownRadius??3.8)/CELL;
    for(let z=Math.max(0,Math.floor(cz-r));z<Math.min(N,cz+r);z++) for(let x=Math.max(0,Math.floor(cx-r));x<Math.min(N,cx+r);x++) {
      if(Math.hypot(x+.5-cx,z+.5-cz)<=r) {
        const q=z*N+x;canopy[q]=1;treeHeight[q]=Math.max(treeHeight[q],b.y*STOREY_METERS+10);
      }
    }
  }
  for(let z=0;z<N;z++)for(let x=0;x<N;x++){const q=z*N+x,k=(z+PAD)*OUTER+x+PAD;occluderHeight[k]=height[q];occluderPorosity[k]=porosity[q];}
  for(const land of landcover.filter(l=>l.kind==='water'||l.kind==='river')){
    const points=land.points,margin=land.type==='line'?(land.width??3)/2:0;
    const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
    for(let z=Math.max(0,Math.floor((Math.min(...zs)-margin)/CELL));z<Math.min(N,Math.ceil((Math.max(...zs)+margin)/CELL));z++)
      for(let x=Math.max(0,Math.floor((Math.min(...xs)-margin)/CELL));x<Math.min(N,Math.ceil((Math.max(...xs)+margin)/CELL));x++){
        const px=(x+.5)*CELL,pz=(z+.5)*CELL;
        const wet=land.type==='polygon'?inPolygon(points,px,pz)&&!(land.holes??[]).some(h=>inPolygon(h,px,pz)):
          points.slice(1).some((p,i)=>pointSegmentDistance(px,pz,points[i],p)<=margin);
        if(wet)water[z*N+x]=1;
      }
  }
  return {height,canopy,treeHeight,surface,porosity,water,occluderHeight,occluderPorosity};
}
export type Raster=ReturnType<typeof rasterize>;
const inContext=(x:number,z:number)=>x>=-PAD&&z>=-PAD&&x<N+PAD&&z<N+PAD;
const obstacle=(g:Raster,x:number,z:number)=>g.occluderHeight[(z+PAD)*OUTER+x+PAD];

function sunlight(g:Raster, sp:ReturnType<typeof sunPosition>) {
  const tr=new Float32Array(N*N);
  if(sp.elevation<=.5) return tr;
  const tan=Math.tan(sp.elevation*RAD),dx=Math.sin(sp.azimuth*RAD),dz=-Math.cos(sp.azimuth*RAD);
  for(let z=0;z<N;z++) for(let x=0;x<N;x++) {
    const q=z*N+x;if(g.height[q]>0) continue;
    let t=g.canopy[q] ? .25 : 1,treeHit=!!g.canopy[q];
    for(let s=1;s<N*2;s++) {
      const i=Math.floor(x+.5+dx*s),j=Math.floor(z+.5+dz*s);
      if(!inContext(i,j)) break;
      const k=j*N+i,need=PERSON+s*CELL*tan;
      if(obstacle(g,i,j)>=need){t=0;break;}
      if(inside(i,j)&&!treeHit && g.canopy[k] && need>g.treeHeight[k]-7 && need<g.treeHeight[k]) {t*=.25;treeHit=true;}
    }
    tr[q]=t;
  }
  return tr;
}

function skyView(g:Raster) {
  const result=new Float32Array(N*N);
  for(let z=0;z<N;z++) for(let x=0;x<N;x++) {
    const q=z*N+x;if(g.height[q]) continue;
    let sum=0;
    for(let a=0;a<12;a++) {
      const dx=Math.sin(a*Math.PI/6),dz=Math.cos(a*Math.PI/6);let horizon=0;
      for(let s=1;s<N*2;s++) {
        const i=Math.floor(x+.5+dx*s),j=Math.floor(z+.5+dz*s);if(!inContext(i,j)) break;
        const k=j*N+i,h=Math.max(obstacle(g,i,j),inside(i,j)?g.treeHeight[k]*.5:0);
        horizon=Math.max(horizon,(h-PERSON)/(s*CELL));
      }
      sum+=1/(1+horizon*horizon);
    }
    result[q]=sum/12*(1-.7*g.canopy[q]);
  }
  return result;
}

function windFactor(g:Raster, direction:number) {
  const result=new Float32Array(N*N),dx=Math.sin(direction*RAD),dz=-Math.cos(direction*RAD),px=-dz,pz=dx;
  for(let z=0;z<N;z++) for(let x=0;x<N;x++) {
    const q=z*N+x;if(g.height[q]) continue;let sum=0;
    for(const offset of [-1.5,0,1.5]) {
      let k=1;
      for(let s=1;s<N*2;s++){
        const i=Math.floor(x+.5+px*offset+dx*s),j=Math.floor(z+.5+pz*offset+dz*s);
        if(!inContext(i,j)) break;
        const h=obstacle(g,i,j),porosity=g.occluderPorosity[(j+PAD)*OUTER+i+PAD];
        if(h){k=1-.8*(1-Math.min(1,porosity*1.6))*Math.exp(-s*CELL/(1.5*h+10));break;}
      }
      sum+=k;
    }
    let k=sum/3,left=false,right=false;
    if(k>.8) for(let s=1;s<=5;s++) {
      const ix=Math.floor(x+.5+px*s),iz=Math.floor(z+.5+pz*s),jx=Math.floor(x+.5-px*s),jz=Math.floor(z+.5-pz*s);
      if(inside(ix,iz)&&g.height[iz*N+ix]) left=true;
      if(inside(jx,jz)&&g.height[jz*N+jx]) right=true;
    }
    if(left&&right) k*=1.25;
    result[q]=k*(1-.2*g.canopy[q]);
  }
  return result;
}

export function simulateEnvironment(blocks:Block[], env:Environment, buildings:Building[] = [],landcover:LandFeature[] = []) {
  const grid=rasterize(blocks,buildings,landcover), sp=sunPosition(env), sun=sunlight(grid,sp), svf=skyView(grid);
  const k=windFactor(grid,env.windDirection),utci=new Float32Array(N*N),wind=new Float32Array(N*N),tmrt=new Float32Array(N*N);
  const sin=Math.max(0,Math.sin(sp.elevation*RAD)),cloud=clamp(env.cloudCover,0,1);
  const direct=sp.elevation>.5?1353*Math.pow(.7,Math.pow(1/sin,.678))*.85*Math.pow(1-cloud,1.2):0;
  const diffuse=sp.elevation>0?(60+180*sin)*(1+.6*cloud):0;
  const fp=sp.elevation>0?.308*Math.cos(RAD*sp.elevation*(1-sp.elevation*sp.elevation/48402)):0;
  let count=0,uSum=0,wSum=0,sSum=0,skySum=0,radiantSum=0,green=0,shaded=0,comfortable=0;
  const histogram=new Array(12).fill(0);
  for(let z=0;z<N;z++) for(let x=0;x<N;x++) {
    const q=z*N+x;if(grid.height[q]||grid.water[q]) continue;
    let veg=0,n=0;
    for(let dz=-4;dz<=4;dz++) for(let dx=-4;dx<=4;dx++) {
      if(!inside(x+dx,z+dz)) continue;
      const j=(z+dz)*N+x+dx;veg+=grid.height[j]?0:Math.max(grid.canopy[j],grid.surface[j]*.5);n++;
    }
    const ta=env.temperature-1.6*veg/Math.max(1,n), grass=grid.surface[q]===1;
    const ts=ta+1+(grass?9:20)*sin*sun[q],tw=ta+2+4*sin,tsky=ta-10;
    const ld=svf[q]*SIG*(tsky+273.15)**4+(1-svf[q])*SIG*(tw+273.15)**4;
    const lu=.95*SIG*(ts+273.15)**4,reflected=(grass?.22:.15)*(direct*sin*sun[q]+diffuse*svf[q]);
    const absorbed=.7*(fp*direct*sun[q]+.5*diffuse*svf[q]+.5*reflected)+.97*.5*(ld+lu);
    const radiant=(absorbed/(.97*SIG))**.25-273.15;
    const v10=Math.max(.5,env.windSpeed*k[q]);
    tmrt[q]=radiant;wind[q]=Math.max(0,env.windSpeed*.7*k[q]);
    utci[q]=3.21+.872*ta+.2459*radiant-2.5078*v10-.0176*env.humidity;
    count++;uSum+=utci[q];wSum+=wind[q];sSum+=sun[q];skySum+=svf[q];radiantSum+=tmrt[q];green+=grid.surface[q];
    if(sp.elevation>.5 && sun[q]<.5) shaded++;
    if(utci[q]<32) comfortable++;
    histogram[clamp(Math.floor((utci[q]-20)/2.5),0,11)]++;
  }
  return {grid,sun,wind,utci,tmrt,svf,sp,histogram,
    metrics:{count,utci:count?uSum/count:null,wind:count?wSum/count:null,sun:count?sSum/count:null,
      svf:count?skySum/count:null,tmrt:count?radiantSum/count:null,green:count?green/count:null,
      shade:count&&sp.elevation>.5?shaded/count:null,comfortable:count?comfortable/count:null,area:count*CELL*CELL}};
}
export type Simulation=ReturnType<typeof simulateEnvironment>;

export function weatherForTime(hours:{time:string}[],date:string,hour:number) {
  const time=new Date(`${date}T00:00:00+08:00`).getTime()+hour*3600000;
  return hours.find(h=>time>=Date.parse(h.time)&&time<Date.parse(h.time)+3600000);
}
