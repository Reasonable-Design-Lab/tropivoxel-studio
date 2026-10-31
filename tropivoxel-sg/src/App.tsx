import {useState,useEffect,useMemo,useRef,useCallback} from 'react';
import {Box,Check,CloudSun,Download,Eraser,Layers3,Leaf,MousePointer2,Sun,Thermometer,TreePine,Undo2,Upload,Wind,X,Redo2,Info,Plug,Loader2,MapPin,MousePointer} from 'lucide-react';
import {BlockKind,Layer,Tool,Building,BuildingDraft,Environment,WeatherData,DEFAULT_ENV,DEFAULT_LAYOUT,DEFAULT_BUILDING,BLOCK_INFO,SiteScene,LayoutConfig,RESOLUTION as N,CELL} from './types/studio';
import {placeBlock,eraseObject,validateScene} from './lib/studio-scene';
import {generateLayout,TYPOLOGIES,hasOverlaps} from './lib/layout-typology';
import {validateSite,validateEnvironment} from './lib/scene-io';
import {simulateEnvironment,weatherForTime} from './lib/environment-engine';
import {StudioCanvas} from './components/StudioCanvas';
import {LAYER_SCALE} from './lib/layer-scale';
import {BuildingEditor,NewBuildingEditor} from './components/BuildingEditor';
import {newBuilding,updateBuilding,duplicateBuilding} from './lib/building-editor';
import {bishanContext,CONTEXT_PRESETS,LAND_STYLE,normaliseContext,useContext,surroundingBuildings} from './lib/context-data';
const STORAGE='tropivoxel-studio-v3';
const STATIC_SUBMISSION=import.meta.env.VITE_STATIC_SUBMISSION==='true';
type SceneSnapshot={scene:SiteScene;environment:Environment};
const icons={building:Box,tree:TreePine,grass:Leaf,floor:Layers3};
const layers:{id:Layer;name:string;icon:typeof Box}[]=[
  {id:'design',name:'Design',icon:Box},{id:'utci',name:'Comfort',icon:Thermometer},{id:'sun',name:'Sun / shade',icon:Sun},{id:'wind',name:'Wind',icon:Wind}];
const fmt=(v:number|null,d=1)=>v===null?'—':v.toFixed(d);
const timeLabel=(h:number)=>String(Math.floor(h)).padStart(2,'0')+':'+(h%1>=.5?'30':'00');
function initialScene(){try{const s=localStorage.getItem(STORAGE)??localStorage.getItem('tropivoxel-studio-v2');if(s)return validateSite(JSON.parse(s));}catch{}return generateLayout(DEFAULT_LAYOUT);}
function initialEnvironment(scene:SiteScene){
  try{const saved=JSON.parse(localStorage.getItem(STORAGE)??'null');if(saved?.environment)return validateEnvironment(saved.environment);}catch{}
  return {...DEFAULT_ENV,latitude:scene.context?.latitude??DEFAULT_ENV.latitude,longitude:scene.context?.longitude??DEFAULT_ENV.longitude};
}
function exportScene(scene:SiteScene,environment:Environment){
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:3,...scene,environment},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='tropivoxel-scene.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function App(){
  const [scene,setScene]=useState<SiteScene>(initialScene);
  const [env,setEnv]=useState<Environment>(()=>initialEnvironment(scene));
  const [kind,setKind]=useState<BlockKind>('building'),[tool,setTool]=useState<Tool>('select'),[layer,setLayer]=useState<Layer>('design');
  const [past,setPast]=useState<SceneSnapshot[]>([]),[future,setFuture]=useState<SceneSnapshot[]>([]);
  const [weather,setWeather]=useState<WeatherData|null>(null),[useGoogle,setUseGoogle]=useState(false);
  const [modal,setModal]=useState<'weather'|'model'|'context'|null>(null),[hasKey,setHasKey]=useState<boolean|null>(null);
  const [loading,setLoading]=useState<'weather'|'solar'|null>(null),[apiError,setApiError]=useState('');
  const [solar,setSolar]=useState<{annualSunshineHours:number|null;roofArea:number|null}|null>(null);
  const [inspect,setInspect]=useState<number|null>(null),[toast,setToast]=useState(''),[saveFailed,setSaveFailed]=useState(false);
  const [baseline,setBaseline]=useState<SiteScene|null>(null);
  const [selectedId,setSelectedId]=useState<string|null>(null),[sidebar,setSidebar]=useState<'layout'|'building'>('layout');
  const [draft,setDraft]=useState<BuildingDraft>({...DEFAULT_BUILDING});
  const [showContext,setShowContext]=useState(true),[showLandscape,setShowLandscape]=useState(true);
  const [contextLat,setContextLat]=useState(1.3506),[contextLng,setContextLng]=useState(103.8488),[contextName,setContextName]=useState('Bishan');
  const [contextLoading,setContextLoading]=useState(false),[contextError,setContextError]=useState('');
  const [apiAvailable,setApiAvailable]=useState(false);
  const selected=scene.buildings.find(b=>b.id===selectedId);
  const upload=useRef<HTMLInputElement>(null);
  const matchingHour=weatherForTime(weather?.hours??[],env.date,env.hour) as WeatherData['hours'][0]|undefined;
  const liveWeather=useGoogle&&!!matchingHour;
  const effectiveEnv=useMemo(()=>liveWeather?{...env,...matchingHour}:env,[env,matchingHour,liveWeather]);
  const result=useMemo(()=>simulateEnvironment(scene.blocks,effectiveEnv,[...scene.buildings,...surroundingBuildings(scene)],scene.context?.landcover),[scene,effectiveEnv]);
  const before=useMemo(()=>baseline?simulateEnvironment(baseline.blocks,effectiveEnv,[...baseline.buildings,...surroundingBuildings(baseline)],baseline.context?.landcover):null,[baseline,effectiveEnv]);
  const overlaps=useMemo(()=>hasOverlaps(scene.buildings),[scene.buildings]);
  const m=result.metrics,c=scene.config,typology=TYPOLOGIES.find(t=>t.id===c.typology)!;
  const change=useCallback((next:SiteScene)=>{
    if(next===scene)return;setPast(p=>[...p.slice(-29),{scene,environment:env}]);setFuture([]);setScene(next);setInspect(null);
  },[scene,env]);
  const layoutChange=(key:keyof LayoutConfig,value:number|string)=>{change({...generateLayout({...c,[key]:value}),context:scene.context});setSelectedId(null);};
  const selectBuilding=(id:string|null)=>{
    if(id&&scene.context?.buildings.some(b=>b.id===id&&b.editable===false)){setToast('Surrounding building · read-only context. Select a building inside the outlined design area.');return;}
    setSelectedId(id);if(id){setSidebar('building');setTool('select');}
  };
  const editBuilding=(patch:Partial<Building>)=>{if(!selectedId)return;try{change(updateBuilding(scene,selectedId,patch));}catch(e){setToast(e instanceof Error?e.message:'Could not edit this building.');}};
  const deleteBuilding=(id:string)=>{change(eraseObject(scene,id));if(id===selectedId)setSelectedId(null);};
  const copyBuilding=()=>{if(!selectedId)return;try{const copy=duplicateBuilding(scene,selectedId);change(copy.scene);selectBuilding(copy.id);}catch(e){setToast(e instanceof Error?e.message:'Could not duplicate.');}};
  function place(x:number,y:number,z:number){
    try{
      if(kind==='building'){const added=newBuilding(scene,(x+.5)*4,(z+.5)*4,draft);change(added.scene);selectBuilding(added.id);}
      else{const blocks=placeBlock(scene.blocks,kind,x,y,z,scene.buildings);if(blocks!==scene.blocks)change({...scene,blocks,edited:true});}
    }catch(e){setToast(e instanceof Error?e.message:'Choose an open location.');}
  }
  function applyContext(context:ReturnType<typeof bishanContext>){
    change(useContext(scene,context));setEnv(e=>({...e,latitude:context.latitude,longitude:context.longitude}));
    setWeather(null);setSolar(null);setUseGoogle(false);setBaseline(null);setSelectedId(null);setTool('select');setSidebar('building');setModal(null);
    setToast(context.name+' loaded. Select a building inside the 200 m design area.');
  }
  async function loadLiveContext(){
    setContextLoading(true);setContextError('');
    try{
      const response=await fetch('/api/context?'+new URLSearchParams({lat:String(contextLat),lng:String(contextLng)}));
      if(!(response.headers.get('content-type')??'').includes('application/json'))throw Error('Live context needs the local API server. The bundled Bishan sample works offline.');
      const raw=await response.json();if(!response.ok)throw Error(raw.error?.message??'Context request failed.');
      applyContext(normaliseContext(raw,contextLat,contextLng,contextName));
    }catch(e){setContextError(e instanceof Error?e.message:'Context data is unavailable.');}finally{setContextLoading(false);}
  }
  const restore=(snapshot:SceneSnapshot)=>{
    setScene(snapshot.scene);setEnv(snapshot.environment);setInspect(null);
    if(snapshot.environment.latitude!==env.latitude||snapshot.environment.longitude!==env.longitude){setUseGoogle(false);setWeather(null);setSolar(null);}
  };
  const undo=()=>{if(!past.length)return;setFuture(f=>[{scene,environment:env},...f]);restore(past[past.length-1]);setPast(p=>p.slice(0,-1));};
  const redo=()=>{if(!future.length)return;setPast(p=>[...p,{scene,environment:env}]);restore(future[0]);setFuture(f=>f.slice(1));};
  const update=(key:keyof Environment,value:number|string)=>{
    if(key==='date'||key==='hour'){setEnv(e=>({...e,[key]:value}));return;}
    setEnv({...effectiveEnv,[key]:value});setUseGoogle(false);
    if(key==='latitude'||key==='longitude'){setWeather(null);setSolar(null);}
  };
  useEffect(()=>{
    if(STATIC_SUBMISSION){setHasKey(false);return;}
    fetch('/api/config').then(r=>{if(!r.ok)throw Error('API unavailable');return r.json();}).then(j=>{setHasKey(!!j.hasKey);setApiAvailable(true);}).catch(()=>setHasKey(false));
  },[]);
  useEffect(()=>{if(selectedId&&!scene.buildings.some(b=>b.id===selectedId))setSelectedId(null);},[scene.buildings,selectedId]);
  useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify({...scene,environment:env}));setSaveFailed(false);}catch{setSaveFailed(true);}},[scene,env]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(t);},[toast]);
  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement).closest('input,select,textarea,[contenteditable]')||modal)return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const key=e.key.toLowerCase(),material=Object.entries(BLOCK_INFO).find(([,v])=>v.key.toLowerCase()===key);
      if(material){setKind(material[0] as BlockKind);setTool('place');}
      if(key==='e')setTool('erase');if(key==='i')setTool('inspect');if(key==='v')setTool('select');
      const index=Number(key)-1;if(index>=0&&index<4)setLayer(layers[index].id);
    };window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[undo,redo,modal]);
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setModal(null);};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  async function callApi(service:'weather'|'solar'){
    setLoading(service);setApiError('');
    try{
      const response=await fetch('/api/'+service+'?'+new URLSearchParams({lat:String(env.latitude),lng:String(env.longitude)}));
      const data=await response.json();if(!response.ok)throw Error((data.error?.code??response.status)+' · '+data.error?.message);
      if(service==='weather'){
        setWeather(data);setUseGoogle(true);const local=new Date(Date.parse(data.hours[0].time)+8*3600000);
        setEnv(e=>({...e,date:local.toISOString().slice(0,10),hour:local.getUTCHours()}));setToast('24-hour Google forecast loaded.');
      }else{setSolar(data);setToast('Existing-roof Solar data loaded.');}
    }catch(e){setApiError(e instanceof Error?e.message:'Connection failed.');}finally{setLoading(null);}
  }
  async function importFile(file:File|undefined){
    if(!file)return;
    try{
      if(file.size>5e6)throw Error('Choose a scene file smaller than 5 MB.');
      const data=JSON.parse(await file.text());
      const next=data.version===1?{config:{...DEFAULT_LAYOUT},blocks:validateScene(data.blocks).map(b=>({...b,x:b.x+17,z:b.z+17})),buildings:[],edited:true}:validateSite(data);
      const nextEnv=data.environment?validateEnvironment(data.environment):env;
      change(next);setEnv(nextEnv);setUseGoogle(false);setBaseline(null);setSelectedId(null);setToast('Scene imported.');
    }catch(e){setToast(e instanceof Error?e.message:'Import failed.');}
  }
  const delta=before&&m.utci!==null&&before.metrics.utci!==null?m.utci-before.metrics.utci:null;
  const stress=m.utci===null?'No open ground':m.utci>=46?'Extreme heat stress':m.utci>=38?'Very strong heat stress':m.utci>=32?'Strong heat stress':m.utci>=26?'Moderate heat stress':m.utci>=9?'No heat stress':'Cold stress range';
  return <div className="studio-shell">
    <header className="topbar"><div className="brand"><span className="brand-icon"><Box size={25}/></span><span>TropiVoxel<small>Microclimate studio</small></span></div>
      <span className="header-caption">Build. Compare. Cool.</span><div className="topbar-spacer"/>
      <button className="button subtle" onClick={()=>setModal('context')}><MapPin size={15}/><span>{scene.context?.name??'Site context'}</span></button>
      <button className="button subtle" onClick={()=>setModal('weather')}><span className={'status-dot '+(liveWeather?'live':'')}/><CloudSun size={16}/>{liveWeather?'Google weather':'Weather'}</button>
      <button className="button subtle compact" aria-label="Import scene" onClick={()=>upload.current?.click()}><Upload size={15}/><span>Import</span></button>
      <button className="button compact" onClick={()=>{exportScene(scene,env);setToast('Scene exported. API keys and forecast data are excluded.');}}><Download size={15}/><span>Export</span></button>
    </header>
    <div className="workspace">
      <aside className="design-panel">
        <div className="sidebar-tabs"><button className={sidebar==='layout'?'active':''} onClick={()=>setSidebar('layout')}>Layout</button><button className={sidebar==='building'?'active':''} onClick={()=>{setSidebar('building');setTool('select');}}>Building</button><button className="context-shortcut" onClick={()=>setModal('context')}><MapPin size={12}/>Context</button></div>
        {scene.context&&<div className="context-summary"><strong>{scene.context.name}</strong><span>{scene.buildings.length} editable · {surroundingBuildings(scene).length} surrounding</span><div>
          <label><input type="checkbox" checked={showContext} onChange={e=>setShowContext(e.target.checked)}/>Surroundings</label>
          <label><input type="checkbox" checked={showLandscape} onChange={e=>setShowLandscape(e.target.checked)}/>Landscape</label></div><small>Display only · hiding context does not change analysis.</small></div>}
        {tool==='place'&&kind==='building'&&<NewBuildingEditor draft={draft} onChange={setDraft}/>}
        {sidebar==='building'?<>
          <label className="building-picker">Select a building<select aria-label="Select individual building" value={selectedId??''} onChange={e=>selectBuilding(e.target.value||null)}><option value="">Click a building or choose here</option>{scene.buildings.map((b,i)=><option key={b.id} value={b.id}>{b.name??'Building '+(i+1)}</option>)}</select></label>
          {selected?<BuildingEditor key={selected.id} building={selected} onChange={editBuilding} onDelete={()=>deleteBuilding(selected.id)} onDuplicate={copyBuilding} onClose={()=>setSelectedId(null)}/>:<div className="empty-selection"><MousePointer size={27}/><h2>Edit one building</h2><p>Click a building inside the design boundary. Its height, position, orientation and porosity update independently.</p><button className="button" onClick={()=>{setKind('building');setTool('place');}}>Add a 16 × 16 m box</button></div>}
        </>:<>
        <div className="sidebar-heading"><div><span className="eyebrow">DESIGN CONTROLS</span><h1>Layout typology</h1></div><button className="icon-button" aria-label="Model and layout notes" onClick={()=>setModal('model')}><Info size={18}/></button></div>
        <div className="typology-options">{TYPOLOGIES.map(t=><button key={t.id} className={c.typology===t.id?'active':''} aria-pressed={c.typology===t.id} onClick={()=>layoutChange('typology',t.id)}>
          <span className={'typology-glyph '+t.id}><i/><i/><i/><i/></span><span><strong>{t.name}</strong><small>{t.geometry}</small></span>{c.typology===t.id&&<Check size={14}/>}</button>)}</div>
        <p className="layout-description">{typology.description}</p>
        <div className="layout-parameters">
          <Range label="Building height" value={c.storeys} min={6} max={30} step={1} display={c.storeys+' storeys · '+c.storeys*3+' m'} onChange={v=>layoutChange('storeys',v)}/>
          <Range label="Block spacing" value={c.spacing} min={32} max={58} step={1} display={c.spacing+' m'} onChange={v=>layoutChange('spacing',v)} note="Layout parameter, not wall-to-wall distance."/>
          <Range label="Block orientation" value={c.orientation} min={-90} max={90} step={5} display={c.orientation+'°'} onChange={v=>layoutChange('orientation',v)} note="Each building rotates about its own centre."/>
          <Range label="Void-deck porosity" value={c.porosity*100} min={0} max={80} step={5} display={Math.round(c.porosity*100)+'%'} onChange={v=>layoutChange('porosity',v/100)}/>
          <Range label="Canopy trees" value={c.trees} min={0} max={80} step={1} display={c.trees+' requested'} onChange={v=>layoutChange('trees',v)}/>
          <Range label="Green ground cover" value={c.greenCover} min={0} max={100} step={5} display={c.greenCover+'% target'} onChange={v=>layoutChange('greenCover',v)}/>
        </div>
        <div className="layout-facts"><span>{scene.buildings.length} buildings</span><span>{scene.blocks.filter(b=>b.kind==='tree').length} trees placed</span><span>{fmt(m.green===null?null:m.green*100,0)}% outdoor grass</span></div>
        {overlaps&&<p className="setting-note">Building footprints overlap at this setting; the model uses their combined footprint.</p>}
        <p className="generation-note">{scene.edited?'Custom edits applied. ':''}Layout controls replace the editable design area and planting. Surrounding context stays fixed. Use Building for individual edits.</p>
        </>}
        <div className="sidebar-foot"><span className="status-dot live"/>{saveFailed?'Auto-save unavailable. Export to keep your scene.':'Scene saved locally'}<button onClick={()=>{change({...generateLayout(DEFAULT_LAYOUT),context:scene.context});setSelectedId(null);setToast('Default layout restored. Weather is unchanged.');}}>Reset layout</button></div>
      </aside>
      <main className="world-panel">
        <StudioCanvas blocks={scene.blocks} buildings={scene.buildings} kind={kind} tool={tool} layer={layer} environment={effectiveEnv} result={result}
          onPlace={place} onErase={deleteBuilding} onInspect={setInspect} onSelect={selectBuilding} selectedId={selectedId} draft={draft} context={scene.context} showContext={showContext} showLandscape={showLandscape}/>
        <div className="layer-switch glass" aria-label="Analysis layers">{layers.map(({id,name,icon:Icon})=><button key={id} className={layer===id?'selected':''} aria-pressed={layer===id} onClick={()=>setLayer(id)}><Icon size={15}/>{name}</button>)}</div>
        <section className="results-card glass" aria-label="Environmental performance">
          <div className="results-title"><span>GROUND PERFORMANCE</span><button aria-label="Explain model" onClick={()=>setModal('model')}><Info size={14}/></button></div>
          <div className="hero-metric"><strong>{fmt(m.utci)}</strong><span>°C<small>UTCI proxy</small></span></div><p className="stress-line">{stress}</p>
          <div className="result-grid"><div><Sun size={15}/><span>Direct sun</span><strong>{fmt(m.sun===null?null:m.sun*100,0)}<small>%</small></strong></div>
            <div><Leaf size={15}/><span>Shaded</span><strong>{fmt(m.shade===null?null:m.shade*100,0)}<small>%</small></strong></div>
            <div><Wind size={15}/><span>Wind</span><strong>{fmt(m.wind)}<small>m/s</small></strong></div></div>
          <div className="compare-line"><button onClick={()=>{setBaseline(structuredClone(scene));setToast('Reference saved. Both layouts use the same weather.');}}>{baseline?'Update reference':'Save reference'}</button>{before&&<strong className={delta!==null&&delta<0?'improved':''}>{delta===null?'—':(delta>0?'+':'')+delta.toFixed(2)} °C</strong>}</div>
          <p className="model-caption">Open-ground means · concept estimates</p>
          {liveWeather&&<p className="google-attribution" translate="no">Includes data from Google Maps</p>}
        </section>
        {layer!=='design'&&<div className="map-legend glass"><span>{LAYER_SCALE[layer].label}</span><div style={{background:'linear-gradient(90deg,'+LAYER_SCALE[layer].colors.join(',')+')'}}/><footer><small>{LAYER_SCALE[layer].min}{layer==='sun'?'%':''}</small><small>{layer==='sun'?100:LAYER_SCALE[layer].max} {LAYER_SCALE[layer].unit}</small></footer></div>}
        {tool==='inspect'&&inspect!==null&&<div className="inspect-readout glass" role="status">{result.grid.water[inspect]?'Mapped water · excluded from walking analysis':result.grid.height[inspect]>0?<><Box size={14}/>Building · {fmt(result.grid.height[inspect],0)} m</>:<>
          <span>{Math.round((inspect%N+.5)*CELL)}, {Math.round((Math.floor(inspect/N)+.5)*CELL)} m</span><strong>{fmt(result.utci[inspect])} °C</strong><span>Sun {fmt(result.sun[inspect]*100,0)}%</span><span>Wind {fmt(result.wind[inspect])} m/s</span><span>Sky view {fmt(result.svf[inspect],2)}</span><span>Tmrt {fmt(result.tmrt[inspect])} °C</span></>}</div>}
        <div className="edit-toolbar glass" aria-label="Scene editing tools">
          <button className={tool==='select'?'active':''} aria-label="Select building" title="Select building · V" onClick={()=>{setTool('select');setSidebar('building');}}><MousePointer size={18}/></button><i/>
          {(Object.keys(BLOCK_INFO)as BlockKind[]).map(k=>{const Icon=icons[k];return <button key={k} className={kind===k&&tool==='place'?'active':''} aria-label={'Place '+BLOCK_INFO[k].name.toLowerCase()} title={BLOCK_INFO[k].name+' · '+BLOCK_INFO[k].key} onClick={()=>{setKind(k);setTool('place');}}><Icon size={18}/><span>{BLOCK_INFO[k].name}</span></button>;})}
          <i/><button className={tool==='erase'?'active':''} aria-label="Erase" title="Erase · E" onClick={()=>setTool('erase')}><Eraser size={18}/></button>
          <button className={tool==='inspect'?'active':''} aria-label="Inspect" title="Inspect · I" onClick={()=>setTool('inspect')}><MousePointer2 size={18}/></button><i/>
          <button disabled={!past.length} aria-label="Undo" onClick={undo}><Undo2 size={18}/></button><button disabled={!future.length} aria-label="Redo" onClick={redo}><Redo2 size={18}/></button>
        </div>
        <div className="tool-hint">{tool==='select'?'Click a building to edit it individually':tool==='inspect'?'Hover to inspect ground conditions':tool==='erase'?'Click to remove a building or block':kind==='building'?`Click open ground · new box ${draft.width} × ${draft.depth} × ${draft.storeys*3} m`:'Click open ground to place '+BLOCK_INFO[kind].name.toLowerCase()}</div>
        {scene.context&&<div className="context-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a><span>Mapped outlines · heights may be estimated</span></div>}
        <footer className="timeline"><label className="timeline-clock"><Sun size={19}/><strong>{timeLabel(env.hour)}</strong><span>SGT</span></label>
          <div className="time-input"><input type="range" aria-label="Time of day" min="0" max="23.5" step=".5" value={env.hour} onChange={e=>update('hour',+e.target.value)}/><div><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:30</span></div></div>
          <button className="weather-summary" onClick={()=>setModal('weather')}><CloudSun size={20}/><span><strong>{effectiveEnv.temperature.toFixed(1)}°C</strong><small>{liveWeather?'Google forecast':'Manual weather'} · {env.date}</small></span></button>
        </footer>
      </main>
    </div>
    <input ref={upload} hidden type="file" accept=".json,application/json" onChange={e=>{importFile(e.target.files?.[0]);e.target.value='';}}/>
    {toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
    {modal==='context'&&<Modal title="Real site context" onClose={()=>setModal(null)}>
      <p className="context-intro">Load mapped buildings and landscape around a Singapore location. The outlined 200 × 200 m design area is editable; surrounding buildings stay fixed and cast shade into the site.</p>
      <div className="cached-context"><div><strong>Bishan · bundled OSM sample</strong><small>117 source building ways · downloaded 31 Oct 2026</small></div><button className="button" onClick={()=>applyContext(bishanContext())}><MapPin size={14}/>Load Bishan sample</button><p>Works offline, including in the four-file submission. Loading a site replaces the current design area; Undo restores it.</p></div>
      {STATIC_SUBMISSION&&<p className="offline-mode">Offline submission · the Bishan sample is included. Other locations and Google services are available through the full local project server.</p>}
      <details className="manual-settings"><summary>Load another Singapore location · online</summary>
        <label className="context-location">Location<select aria-label="Context location" value={CONTEXT_PRESETS.find(p=>p.latitude===contextLat&&p.longitude===contextLng)?.name??'custom'} onChange={e=>{const p=CONTEXT_PRESETS.find(v=>v.name===e.target.value);if(p){setContextName(p.name);setContextLat(p.latitude);setContextLng(p.longitude);}}}>{CONTEXT_PRESETS.map(p=><option key={p.name}>{p.name}</option>)}<option value="custom">Custom coordinates</option></select></label>
        <div className="location-fields"><label>Context latitude<input aria-label="Context latitude" type="number" min="1.15" max="1.50" step=".0001" value={contextLat} onChange={e=>{setContextLat(+e.target.value);setContextName('Custom site');}}/></label><label>Context longitude<input aria-label="Context longitude" type="number" min="103.55" max="104.15" step=".0001" value={contextLng} onChange={e=>{setContextLng(+e.target.value);setContextName('Custom site');}}/></label></div>
        <button className="button" disabled={contextLoading||!apiAvailable} onClick={loadLiveContext}>{contextLoading?<Loader2 size={15} className="spin"/>:<MapPin size={15}/>}Load mapped context</button>
        {!apiAvailable&&<p className="modal-note">Open the full local project with Start Studio.cmd to load another location. The bundled sample above is ready now.</p>}
      </details>
      {contextError&&<div className="api-error" role="alert">{contextError}</div>}
      {scene.context&&<div className="active-context"><strong>Loaded: {scene.context.name}</strong><p>{scene.buildings.length} design buildings · {surroundingBuildings(scene).length} read-only surroundings</p><p>{scene.context.buildings.filter(b=>b.heightSource!=='osm_height').length} mapped building heights are estimated or assumed.</p><p>{scene.context.landscapeStatus==='available'?scene.context.landcover.length+' mapped landscape features.':'No mapped landscape coverage returned. Unmapped ground stays neutral.'}</p><button className="text-action" onClick={()=>{change(generateLayout(c));setSelectedId(null);setBaseline(null);setModal(null);}}>Return to typology without context</button></div>}
      <div className="land-legend">{Object.entries(LAND_STYLE).map(([kind,s])=><span key={kind}><i style={{background:s.fill}}/>{s.label}</span>)}</div>
      <p className="modal-note">Public OpenStreetMap data, not survey-grade reconstruction. Height uses mapped height → storeys × 3 m → assumed 15 m. Complex building relations may be absent. Mapped landscape is visible background; no extra evaporation or cooling is assumed. Water stays excluded from pedestrian analysis even when hidden.</p>
      <p className="google-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a></p>
    </Modal>}
    {modal==='weather'&&<Modal title="Weather & data" onClose={()=>setModal(null)}>
      <div className="weather-source"><CloudSun size={27}/><div><strong>{liveWeather?'Google hourly forecast':'Manual weather scenario'}</strong><small>{STATIC_SUBMISSION?'Offline submission · manual climate controls available':hasKey?'Server API key configured':'Configure GOOGLE_MAPS_API_KEY in .env.local'}</small></div></div>
      {STATIC_SUBMISSION&&<p className="offline-mode">This four-file version works without a server. Open Weather parameters & location below to adjust the climate. Google APIs require the full local project.</p>}
      {useGoogle&&!matchingHour&&<p className="setting-note">This hour is outside the loaded forecast. Manual values are being used.</p>}
      <DateField value={env.date} onChange={value=>update('date',value)}/>
      <div className="api-buttons"><button className="button" disabled={!!loading||!hasKey} onClick={()=>callApi('weather')}>{loading==='weather'?<Loader2 className="spin" size={15}/>:<Plug size={15}/>}Load 24-hour weather</button>
        <button className="button subtle" disabled={!!loading||!hasKey} onClick={()=>callApi('solar')}>{loading==='solar'?<Loader2 className="spin" size={15}/>:<Sun size={15}/>}Check Solar API</button></div>
      {apiError&&<div className="api-error" role="alert">{apiError}</div>}
      {weather&&<div className="loaded-weather"><Check size={14}/>{weather.hours.length} forecast hours loaded <button onClick={()=>setUseGoogle(v=>!v)}>{useGoogle?'Use manual values':'Use loaded forecast'}</button></div>}
      {solar&&<p className="api-success">Existing roof: {fmt(solar.roofArea,0)} m² · {fmt(solar.annualSunshineHours,0)} equivalent sunshine hours/year.<br/><span className="google-attribution" translate="no">Google Maps</span></p>}
      <details className="manual-settings"><summary>Weather parameters & location</summary>
        <Range label="Air temperature" value={effectiveEnv.temperature} min={-5} max={45} step={.5} display={fmt(effectiveEnv.temperature)+' °C'} onChange={v=>update('temperature',v)}/>
        <Range label="Relative humidity" value={effectiveEnv.humidity} min={10} max={100} step={1} display={fmt(effectiveEnv.humidity,0)+'%'} onChange={v=>update('humidity',v)}/>
        <Range label="Reference wind · 10 m" value={effectiveEnv.windSpeed} min={0} max={10} step={.1} display={fmt(effectiveEnv.windSpeed)+' m/s'} onChange={v=>update('windSpeed',v)}/>
        <Range label="Wind from · 0° = north" value={effectiveEnv.windDirection} min={0} max={360} step={5} display={fmt(effectiveEnv.windDirection,0)+'°'} onChange={v=>update('windDirection',v)}/>
        <Range label="Cloud cover" value={effectiveEnv.cloudCover*100} min={0} max={100} step={1} display={fmt(effectiveEnv.cloudCover*100,0)+'%'} onChange={v=>update('cloudCover',v/100)}/>
        <div className="location-fields"><label>Latitude<input type="number" step=".0001" min="-90" max="90" value={env.latitude} onChange={e=>{const v=+e.target.value;if(Math.abs(v)<=90)update('latitude',v);}}/></label><label>Longitude<input type="number" step=".0001" min="-180" max="180" value={env.longitude} onChange={e=>{const v=+e.target.value;if(Math.abs(v)<=180)update('longitude',v);}}/></label></div>
      </details>
      <p className="modal-note">Weather drives the concept model. Solar reports existing-roof data only; shade in your edited scene is calculated locally. Requests are made only when you click a data button.</p>
      {liveWeather&&<p className="google-attribution" translate="no">Google Maps<br/><small>Source: Includes weather data from Google</small></p>}
    </Modal>}
    {modal==='model'&&<Modal title="How to read the experiment" onClose={()=>setModal(null)}>
      <div className="method-list">
        <h3>Real context & individual buildings</h3><p>The Bishan sample is downloaded OpenStreetMap geometry. Editable buildings sit inside the 200 m design square; read-only surrounding footprints also affect shade, sky view and heuristic wind. Mapped footprints keep their shape when moved or rotated. New rectangular buildings start at 16 × 16 m and 6 storeys (18 m), with adjustable dimensions. Selecting or hiding geometry does not change the physical model.</p>
        <h3>One site, three spatial structures</h3><p>All layouts share a 200 × 200 m site. Switching typology regenerates geometry and recalculates shade, sky view, radiant temperature and heuristic wind. It keeps the selected weather hour.</p>
        <h3>Spacing & orientation</h3><p>For slabs and towers, row centres are s apart and the two column centres are 1.68s apart. For the courtyard, opposing centres are 2s apart. Spacing is not a facade gap. Every building rotates about its own centre; centres stay fixed. Square towers are unchanged by a 90° turn.</p>
        <h3>Trees & planting</h3><p>Trees use a fixed candidate sequence, excluding buildings and the central paths. Locations can change between layouts. Green cover is a pattern target; the sidebar separately reports the measured outdoor grass fraction.</p>
        <h3>Sun, comfort & wind</h3><p>Sun is instantaneous direct-light transmission on a 2 m ground grid. Trees transmit 25% of direct sun. Sky visibility and simplified radiation produce mean radiant temperature (Tmrt). Comfort uses a linear UTCI proxy, not the standard UTCI polynomial. Wind uses wake, porosity and gap rules, not CFD.</p>
        <h3>Compare the places people use</h3><p>Inspect the courtyard centre, openings, paths and sunlit tower gaps. Save a reference before editing. The comparison uses the same weather, but each design's own open-ground area. Building footprints are excluded, including porous ground floors. All building storeys are 3 m; calculations use Singapore UTC+8.</p>
      </div>
    </Modal>}
  </div>;
}
function Range({label,value,min,max,step,display,note,onChange}:{label:string;value:number;min:number;max:number;step:number;display:string;note?:string;onChange:(v:number)=>void}){
  return <label className="parameter"><span>{label}<strong>{display}</strong></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)}/>{note&&<small>{note}</small>}</label>;
}
function DateField({value,onChange}:{value:string;onChange:(value:string)=>void}){
  const [draft,setDraft]=useState(value),[invalid,setInvalid]=useState(false);
  useEffect(()=>{setDraft(value);setInvalid(false);},[value]);
  const commit=()=>{
    const date=new Date(draft+'T12:00:00Z');
    const valid=/^\d{4}-\d{2}-\d{2}$/.test(draft)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===draft;
    if(valid){setInvalid(false);if(draft!==value)onChange(draft);}
    else{setDraft(value);setInvalid(true);}
  };
  return <label className="date-field">Simulation date · Singapore UTC+8
    <input type="text" aria-label="Simulation date" placeholder="YYYY-MM-DD" value={draft} aria-invalid={invalid} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>
    {invalid&&<small role="alert">Enter a valid date as YYYY-MM-DD.</small>}
  </label>;
}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement;ref.current?.focus();
    const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const nodes=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,[tabindex="0"],summary')??[]).filter(el=>el.getClientRects().length>0);if(!nodes.length)return;
      const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus();}
      if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
    document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);previous?.focus();};
  },[]);
  return <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={ref} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" aria-label="Close" onClick={onClose}><X size={21}/></button></header>{children}</div></div>;
}

