import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {ArrowUpRight,Focus,Minus,Plus} from 'lucide-react';
import {Block,Building,BlockKind,BuildingDraft,SiteContext,Environment,Layer,Tool,GRID,MAX_STOREYS,BLOCK_METERS,STOREY_METERS,CELL,RESOLUTION as N} from '../types/studio';
import {Simulation} from '../lib/environment-engine';
import {layerColor} from '../lib/layer-scale';
import {LAND_STYLE} from '../lib/context-data';
import {buildingAt} from '../lib/building-editor';
import {footprintsOverlap} from '../lib/layout-typology';
interface Props {
  blocks:Block[];buildings:Building[];kind:BlockKind;tool:Tool;layer:Layer;environment:Environment;result:Simulation;
  onPlace:(x:number,y:number,z:number)=>void;onErase:(id:string)=>void;onInspect:(q:number|null)=>void;
  onSelect:(id:string|null)=>void;selectedId:string|null;draft:BuildingDraft;context?:SiteContext;showContext:boolean;showLandscape:boolean;
}
function disposeGroup(group:THREE.Group){
  group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){
    if(o instanceof THREE.InstancedMesh)o.dispose();
    o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){(m as THREE.MeshBasicMaterial).map?.dispose();m.dispose();}
  }});group.clear();
}
const HALF=GRID/2,LEVEL=STOREY_METERS/BLOCK_METERS;
export function StudioCanvas(props:Props) {
  const host=useRef<HTMLDivElement>(null),live=useRef(props);live.current=props;
  const objects=useRef<THREE.Group>(null),overlay=useRef<THREE.Mesh>(null),windLines=useRef<THREE.Group>(null),landGroup=useRef<THREE.Group>(null);
  const sun=useRef<THREE.DirectionalLight>(null),camera=useRef<THREE.OrthographicCamera>(null),controls=useRef<OrbitControls>(null);
  const pickables=useRef<THREE.Object3D[]>([]);
  const [view,setView]=useState<'iso'|'top'>('iso'),[error,setError]=useState(false);
  const zoom=(factor:number)=>{if(camera.current){camera.current.zoom=THREE.MathUtils.clamp(camera.current.zoom*factor,.5,4);camera.current.updateProjectionMatrix();}};
  const resetView=(next:'iso'|'top')=>{
    setView(next);if(!camera.current||!controls.current)return;
    camera.current.position.set(...(next==='iso'?[65,62,78]:[0,120,.01]) as [number,number,number]);
    camera.current.zoom=live.current.context ? .72 : 1;camera.current.updateProjectionMatrix();controls.current.target.set(0,1.5,0);controls.current.update();
  };
  useEffect(()=>{
    if(!host.current)return;const el=host.current,scene=new THREE.Scene();
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setError(true);return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
    renderer.setClearColor(0,0);el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','Interactive 3D site. Drag to orbit; scroll to zoom. Select a material to place blocks.');
    const cam=new THREE.OrthographicCamera(-34,34,34,-34,.1,1000);cam.position.set(65,62,78);camera.current=cam;
    const orbit=new OrbitControls(cam,renderer.domElement);orbit.target.set(0,1.5,0);orbit.enableDamping=true;
    orbit.minZoom=.5;orbit.maxZoom=4;orbit.maxPolarAngle=Math.PI/2-.05;controls.current=orbit;orbit.update();
    scene.add(new THREE.HemisphereLight(0xfff7ef,0xa39ab5,2.2));
    const light=new THREE.DirectionalLight(0xffe7cf,2.5);light.castShadow=true;
    light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-38,right:38,top:38,bottom:-38,near:.1,far:300});
    light.shadow.camera.updateProjectionMatrix();light.shadow.normalBias=.035;light.shadow.bias=-.00015;light.shadow.radius=4;
    scene.add(light);sun.current=light;
    const fill=new THREE.DirectionalLight(0xd6d0ec,.9);fill.position.set(-55,45,-30);scene.add(fill);
    const mat=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:1});
    const base=new THREE.Mesh(new THREE.BoxGeometry(GRID+.6,.8,GRID+.6),mat('#d6c1bd'));base.position.y=-.48;base.receiveShadow=true;scene.add(base);
    const surface=new THREE.Mesh(new THREE.BoxGeometry(GRID+.6,.08,GRID+.6),mat('#e8e3d4'));surface.position.y=-.035;surface.receiveShadow=true;scene.add(surface);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(GRID,GRID),new THREE.MeshBasicMaterial({visible:false}));
    ground.rotation.x=-Math.PI/2;ground.position.y=.025;scene.add(ground);
    const grid=new THREE.GridHelper(GRID,GRID,0xc7c7b5,0xd6d5c5);grid.position.y=.015;
    (grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.22;scene.add(grid);
    const group=new THREE.Group();scene.add(group);objects.current=group;
    const landscape=new THREE.Group();scene.add(landscape);landGroup.current=landscape;
    const heat=new THREE.Mesh(new THREE.PlaneGeometry(GRID,GRID),new THREE.MeshBasicMaterial({transparent:true,opacity:.86,depthWrite:false,side:THREE.DoubleSide}));
    heat.rotation.x=-Math.PI/2;heat.position.y=.1;heat.renderOrder=1;scene.add(heat);overlay.current=heat;
    const arrows=new THREE.Group();scene.add(arrows);windLines.current=arrows;
    const ghost=new THREE.Mesh(new THREE.BoxGeometry(.99,.99,.99),new THREE.MeshBasicMaterial({color:0x91b6a0,transparent:true,opacity:.42,depthWrite:false}));
    ghost.visible=false;ghost.renderOrder=2;scene.add(ghost);
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down={x:0,y:0},frame=0;
    const hitBlock=(hit:THREE.Intersection)=>hit.object.userData.block as Block|undefined ??
      (hit.instanceId!==undefined?hit.object.userData.blocks?.[hit.instanceId]:undefined);
    function pick(e:PointerEvent) {
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,cam);
      return ray.intersectObjects([...pickables.current,ground],false)[0];
    }
    function coord(hit:THREE.Intersection) {
      const b=hitBlock(hit),building=hit.object.userData.building as Building|undefined;
      if(b){
        if(live.current.kind!=='building'||b.kind!=='building')return {x:b.x,y:0,z:b.z};
        const normal=hit.face?.normal??new THREE.Vector3(0,1,0);
        return {x:b.x+Math.round(normal.x),y:b.y+Math.round(normal.y),z:b.z+Math.round(normal.z)};
      }
      return {x:Math.floor(hit.point.x+HALF),y:building&&live.current.kind==='building'?building.storeys:0,z:Math.floor(hit.point.z+HALF)};
    }
    const onDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
    const onMove=(e:PointerEvent)=>{
      const hit=pick(e);if(!hit){ghost.visible=false;live.current.onInspect(null);return;}
      const c=coord(hit),p=live.current;
      ghost.visible=p.tool==='place'&&c.x>=0&&c.z>=0&&c.x<GRID&&c.z<GRID&&c.y>=0&&c.y<MAX_STOREYS;
      const flat=p.kind==='floor'||p.kind==='grass';
      const w=p.draft.width/BLOCK_METERS,d=p.draft.depth/BLOCK_METERS,h=p.draft.storeys*LEVEL;
      ghost.scale.set(p.kind==='building'?w:p.kind==='tree'?1.9:1,flat?.08:p.kind==='tree'?2.5:h,p.kind==='building'?d:p.kind==='tree'?1.9:1);
      ghost.rotation.y=p.kind==='building'?-p.draft.rotation*Math.PI/180:0;
      ghost.position.set(c.x-HALF+.5,flat?.07:p.kind==='tree'?1.25:h/2+.045,c.z-HALF+.5);
      if(p.kind==='building'){
        const candidate=buildingAt((c.x+.5)*4,(c.z+.5)*4,p.draft);
        const blocked=[...p.buildings,...p.context?.buildings.filter(b=>!b.editable)??[]].some(b=>footprintsOverlap(candidate,b));
        ghost.position.x=candidate.x/4-HALF;ghost.position.z=candidate.z/4-HALF;
        (ghost.material as THREE.MeshBasicMaterial).color.set(blocked?'#ca8d78':'#91b6a0');
      }else (ghost.material as THREE.MeshBasicMaterial).color.set('#91b6a0');
      const qx=Math.floor((hit.point.x+HALF)*BLOCK_METERS/CELL),qz=Math.floor((hit.point.z+HALF)*BLOCK_METERS/CELL);
      if(p.tool==='inspect')p.onInspect(qx>=0&&qz>=0&&qx<N&&qz<N?qz*N+qx:null);
    };
    const onUp=(e:PointerEvent)=>{
      if(e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;
      const hit=pick(e);if(!hit)return;const p=live.current,b=hitBlock(hit),building=hit.object.userData.building as Building|undefined;
      if(p.tool==='select'){p.onSelect(building?.id??null);return;}
      if(building?.editable===false){p.onSelect(building.id);return;}
      if(p.tool==='erase'){if(b||building)p.onErase((b??building)!.id);return;}
      if(p.tool==='inspect'){onMove(e);return;}
      if(building&&p.kind==='building'){p.onSelect(building.id);return;}
      const c=coord(hit);p.onPlace(c.x,c.y,c.z);
    };
    const onLeave=()=>{ghost.visible=false;live.current.onInspect(null);};
    const canvas=renderer.domElement;
    canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointerleave',onLeave);
    const resize=new ResizeObserver(()=>{
      const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);
      const aspect=w/h,size=aspect<1?34/aspect:34;
      cam.left=-size*aspect;cam.right=size*aspect;cam.top=size;cam.bottom=-size;cam.updateProjectionMatrix();
    });resize.observe(el);
    const animate=()=>{frame=requestAnimationFrame(animate);orbit.update();renderer.render(scene,cam);};animate();
    return ()=>{
      cancelAnimationFrame(frame);resize.disconnect();orbit.dispose();
      canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('pointerleave',onLeave);
      scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){if(o instanceof THREE.InstancedMesh)o.dispose();o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){(m as THREE.MeshBasicMaterial).map?.dispose();m.dispose();}}});
      renderer.dispose();canvas.remove();
    };
  },[]);
  useEffect(()=>{if(camera.current){camera.current.zoom=props.context ? .72 : 1;camera.current.updateProjectionMatrix();}},[props.context?.latitude,props.context?.longitude]);
  useEffect(()=>{
    const group=objects.current;if(!group)return;disposeGroup(group);pickables.current=[];
    function box(parent:THREE.Object3D,w:number,h:number,d:number,color:string,x:number,y:number,z:number,tag?:{block?:Block;building?:Building}){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:1}));
      mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
      if(tag){Object.assign(mesh.userData,tag);pickables.current.push(mesh);}return mesh;
    }
    // Grass and paving are instanced: planting density does not add thousands of draw calls.
    for(const kind of ['grass','floor'] as const){
      const items=props.blocks.filter(b=>b.kind===kind);if(!items.length)continue;
      const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.99,.045,.99),new THREE.MeshStandardMaterial({color:kind==='grass'?'#afc19a':'#d8c2ac',roughness:1}),items.length);
      const dummy=new THREE.Object3D();
      items.forEach((b,i)=>{dummy.position.set(b.x-HALF+.5,.04,b.z-HALF+.5);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
      mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;mesh.userData.blocks=items;group.add(mesh);pickables.current.push(mesh);
    }
    for(const b of props.blocks){
      const x=b.x-HALF+.5,z=b.z-HALF+.5,y=b.y*LEVEL;
      if(b.kind==='tree'){
        const width=2*(b.crownRadius??3.8)/BLOCK_METERS;
        box(group,.2,1.3,.2,'#b99a87',x,y+.65,z,{block:b});
        box(group,width,.75,width,'#76a18e',x,y+1.4,z,{block:b});
        box(group,width*.75,.6,width*.75,'#9dbb9f',x-.1,y+1.95,z,{block:b});
        box(group,width*.5,.22,width*.5,'#becba9',x-.1,y+2.36,z,{block:b});
      }else if(b.kind==='building')box(group,.985,LEVEL-.015,.985,'#ead8ce',x,y+LEVEL/2+.04,z,{block:b});
    }
    const surrounding=props.showContext?props.context?.buildings.filter(b=>!b.editable)??[]:[];
    [...props.buildings,...surrounding].forEach((b,index)=>{
      const node=new THREE.Group();node.position.set(b.x/BLOCK_METERS-HALF,0,b.z/BLOCK_METERS-HALF);
      node.rotation.y=-b.rotation*Math.PI/180;group.add(node);
      const w=b.width/BLOCK_METERS,d=b.depth/BLOCK_METERS,h=b.height/BLOCK_METERS,voidDeck=b.porosity>0;
      const selected=b.id===props.selectedId,context=b.editable===false;
      const color=selected?'#91bfa7':context?'#d6d7cf':['#e7d3c9','#d8c6cb','#e9decc'][index%3],offset=voidDeck?LEVEL:0;
      if(b.footprint){
        // The local model uses +Z south. Rotate planar local coordinates into that same 3D convention.
        const shape=new THREE.Shape(b.footprint.map(p=>new THREE.Vector2(p[0]/BLOCK_METERS,-p[1]/BLOCK_METERS)));
        const geometry=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
        const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1}));
        mesh.position.y=.04;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.building=b;node.add(mesh);pickables.current.push(mesh);
        if(selected){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0x44745d}));edge.position.y=.045;node.add(edge);}
        return;
      }
      const body=box(node,w,Math.max(.01,h-offset),d,color,0,(h+offset)/2+.04,0,{building:b});
      if(selected){const outline=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),new THREE.LineBasicMaterial({color:0x44745d}));outline.position.copy(body.position);node.add(outline);}
      if(voidDeck){
        const base=box(node,w,LEVEL,d,color,0,LEVEL/2,0,{building:b});
        (base.material as THREE.MeshStandardMaterial).transparent=true;(base.material as THREE.MeshStandardMaterial).opacity=1-b.porosity;
        base.castShadow=false;
        for(const x of [-w/2+.18,w/2-.18])for(const z of [-d/2+.18,d/2-.18])
          box(node,.18,LEVEL,.18,'#c0b3a3',x,LEVEL/2,z);
      }
      for(let floor=1;floor<b.storeys;floor++){
        const yy=(floor+.55)*LEVEL;
        box(node,w*.82,.055,.014,selected?'#6d9c83':'#a9b8b2',0,yy,d/2+.01,{building:b});
        box(node,.014,.055,d*.74,selected?'#6d9c83':'#b4a8b0',w/2+.01,yy,0,{building:b});
      }
      box(node,w+.04,.075,d+.04,selected?'#bad5b9':'#f2e8dc',0,h+.07,0,{building:b});
    });
  },[props.blocks,props.buildings,props.selectedId,props.showContext,props.context]);
  useEffect(()=>{
    const group=landGroup.current;if(!group)return;disposeGroup(group);
    if(!props.context)return;
    const underlay=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({color:'#e5e3da',roughness:1}));
    underlay.rotation.x=-Math.PI/2;underlay.position.y=-.04;underlay.receiveShadow=true;group.add(underlay);
    // A visible square identifies the editable analysis area; outside remains context.
    const boundary=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-25,.2,-25),new THREE.Vector3(25,.2,-25),new THREE.Vector3(25,.2,25),new THREE.Vector3(-25,.2,25)]),new THREE.LineBasicMaterial({color:0x779883}));
    group.add(boundary);
    if(!props.showLandscape)return;
    for(const feature of props.context.landcover){
      const color=LAND_STYLE[feature.kind].fill,yy=feature.kind==='water'||feature.kind==='river'?.08:.065;
      if(feature.type==='line'){
        for(let i=1;i<feature.points.length;i++){
          const a=feature.points[i-1],b=feature.points[i],dx=(b[0]-a[0])/4,dz=(b[1]-a[1])/4;
          const mesh=new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(dx,dz),(feature.width??3)/4),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
          mesh.rotation.set(-Math.PI/2,0,-Math.atan2(dz,dx));mesh.position.set((a[0]+b[0])/8-HALF,yy,(a[1]+b[1])/8-HALF);group.add(mesh);
        }
      }else{
        const shape=new THREE.Shape(feature.points.map(p=>new THREE.Vector2(p[0]/4-HALF,-p[1]/4+HALF)));
        for(const ring of feature.holes??[])shape.holes.push(new THREE.Path(ring.map(p=>new THREE.Vector2(p[0]/4-HALF,-p[1]/4+HALF))));
        const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.y=yy;group.add(mesh);
      }
    }
  },[props.context,props.showLandscape]);
  useEffect(()=>{
    if(!overlay.current||!windLines.current)return;
    const plane=overlay.current,material=plane.material as THREE.MeshBasicMaterial;
    plane.visible=props.layer!=='design';disposeGroup(windLines.current);material.map?.dispose();material.map=null;
    if(props.layer!=='design'){
      const data=new Uint8Array(N*N*4),values=props.result[props.layer];
      for(let q=0;q<N*N;q++){const c=layerColor(props.layer,values[q]).convertLinearToSRGB(),i=q*4;
        data[i]=Math.round(c.r*255);data[i+1]=Math.round(c.g*255);data[i+2]=Math.round(c.b*255);data[i+3]=props.result.grid.height[q]||props.result.grid.water[q]?0:255;}
      const texture=new THREE.DataTexture(data,N,N,THREE.RGBAFormat);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
      texture.minFilter=THREE.NearestFilter;texture.flipY=true;texture.needsUpdate=true;material.map=texture;
      if(props.layer==='wind'){
        const a=props.environment.windDirection*Math.PI/180,dir=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
        for(let z=4;z<N;z+=8)for(let x=4;x<N;x+=8){
          const q=z*N+x;if(props.result.grid.height[q]||props.result.wind[q]<.05)continue;
          const start=new THREE.Vector3((x+.5)*CELL/BLOCK_METERS-HALF,.15,(z+.5)*CELL/BLOCK_METERS-HALF);
          const end=start.clone().addScaledVector(dir,Math.min(1.5,props.result.wind[q]*.55)),perp=new THREE.Vector3(-dir.z,0,dir.x);
          const points=[start,end,end.clone().addScaledVector(dir,-.3).addScaledVector(perp,.17),end,end.clone().addScaledVector(dir,-.3).addScaledVector(perp,-.17)];
          windLines.current.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x4f6f72,transparent:true,opacity:.7})));
        }
      }
    }
    material.needsUpdate=true;
    if(sun.current){const {azimuth,elevation}=props.result.sp,a=azimuth*Math.PI/180,e=Math.max(3,elevation)*Math.PI/180;
      sun.current.position.set(130*Math.sin(a)*Math.cos(e),130*Math.sin(e),-130*Math.cos(a)*Math.cos(e));sun.current.intensity=elevation>0?2.5:0;}
  },[props.layer,props.result,props.environment]);
  return <div className="canvas-wrap"><div ref={host} className="three-host" data-testid="voxel-canvas"/>
    {error&&<div className="webgl-error">WebGL could not start. Enable hardware acceleration and reload.</div>}
    <div className="north-marker"><ArrowUpRight size={22}/><span>N</span></div>
    <div className="view-controls glass"><button className={view==='iso'?'selected':''} onClick={()=>resetView('iso')}>3D view</button>
      <button className={view==='top'?'selected':''} onClick={()=>resetView('top')}>Plan view</button><i/>
      <button aria-label="Zoom in" onClick={()=>zoom(1.2)}><Plus size={16}/></button><button aria-label="Zoom out" onClick={()=>zoom(1/1.2)}><Minus size={16}/></button>
      <button aria-label="Reset view" onClick={()=>resetView('iso')}><Focus size={16}/></button></div>
    <div className="scale-marker">200 × 200 m <span>Drag to orbit · scroll to zoom</span></div>
  </div>;
}

