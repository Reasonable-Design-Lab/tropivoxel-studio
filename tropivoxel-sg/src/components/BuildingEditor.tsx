import {useEffect,useState} from 'react';
import {Copy,Trash2,X,Check} from 'lucide-react';
import {Building,BuildingDraft} from '../types/studio';
export function BuildingEditor({building,onChange,onDelete,onDuplicate,onClose}:{
  building:Building;onChange:(patch:Partial<Building>)=>void;onDelete:()=>void;onDuplicate:()=>void;onClose:()=>void;
}){
  return <section className="building-editor" aria-label="Selected building editor">
    <header><div><span className="eyebrow">EDIT ONE BUILDING</span><h2>{building.name??'Building'}</h2></div><button className="icon-button" aria-label="Close building editor" onClick={onClose}><X size={17}/></button></header>
    <p className="selection-hint"><Check size={13}/> Only the highlighted building changes.</p>
    <label className="name-field">Building name<TextValue value={building.name??'Building'} onCommit={name=>onChange({name})}/></label>
    <div className="building-fields">
      <NumberField label="East position" unit="m" value={building.x} min={0} max={200} onCommit={x=>onChange({x})}/>
      <NumberField label="South position" unit="m" value={building.z} min={0} max={200} onCommit={z=>onChange({z})}/>
      {!building.footprint&&<><NumberField label="Length" unit="m" value={building.width} min={4} max={120} onCommit={width=>onChange({width})}/>
        <NumberField label="Depth" unit="m" value={building.depth} min={4} max={120} onCommit={depth=>onChange({depth})}/></>}
      <NumberField label="Storeys" value={building.storeys} min={1} max={100} step={1} onCommit={storeys=>onChange({storeys})}/>
      <NumberField label="Height" unit="m" value={building.height} min={3} max={300} step={.5} onCommit={height=>onChange({height})}/>
      <NumberField label="Orientation" unit="°" value={building.rotation} min={-180} max={180} step={5} onCommit={rotation=>onChange({rotation})}/>
      <NumberField label="Void-deck porosity" unit="%" value={building.porosity*100} min={0} max={80} step={5} onCommit={v=>onChange({porosity:v/100})}/>
    </div>
    {building.footprint&&<p className="editor-note">Mapped footprint retained · {building.width.toFixed(1)} × {building.depth.toFixed(1)} m bounds. Move, rotate or change height; no automatic stretching.</p>}
    <p className="editor-note">{building.heightSource==='assumed'?'Height assumed at 15 m.':building.heightSource==='estimated_levels'?'Height estimated from OSM storeys.':building.heightSource==='osm_height'?'Height from an OSM tag.':'Design dimensions.'} Position is measured from the northwest corner.</p>
    <div className="building-actions"><button className="button subtle" onClick={onDuplicate}><Copy size={14}/>Duplicate</button><button className="button danger" onClick={onDelete}><Trash2 size={14}/>Delete</button></div>
  </section>;
}
export function NewBuildingEditor({draft,onChange}:{draft:BuildingDraft;onChange:(draft:BuildingDraft)=>void}){
  return <section className="new-building-settings" aria-label="New building dimensions"><span className="eyebrow">NEW BUILDING BOX</span><strong>{draft.width} × {draft.depth} × {draft.storeys*3} m</strong>
    <div className="building-fields"><NumberField label="New length" unit="m" value={draft.width} min={4} max={80} step={4} onCommit={width=>onChange({...draft,width})}/>
      <NumberField label="New depth" unit="m" value={draft.depth} min={4} max={80} step={4} onCommit={depth=>onChange({...draft,depth})}/>
      <NumberField label="New storeys" value={draft.storeys} min={1} max={30} step={1} onCommit={storeys=>onChange({...draft,storeys})}/></div>
    <p className="editor-note">Click open ground to place a full building. A green preview fits; red means an overlap. Select it afterwards for individual edits.</p>
  </section>;
}
function NumberField({label,value,min,max,step=1,unit,onCommit}:{label:string;value:number;min:number;max:number;step?:number;unit?:string;onCommit:(v:number)=>void}){
  const [draft,setDraft]=useState(String(Number(value.toFixed(2)))),[invalid,setInvalid]=useState(false);
  useEffect(()=>{setDraft(String(Number(value.toFixed(2))));setInvalid(false);},[value]);
  const commit=()=>{const v=Number(draft);if(!draft.trim()||!Number.isFinite(v)||v<min||v>max||step===1&&label.toLowerCase().includes('storeys')&&!Number.isInteger(v)){setDraft(String(Number(value.toFixed(2))));setInvalid(true);return;}setInvalid(false);if(v!==value)onCommit(v);};
  return <label className="building-number"><span>{label}{unit&&<small>{unit}</small>}</span><input type="number" aria-label={label} aria-invalid={invalid} min={min} max={max} step={step} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>{invalid&&<small className="field-error">Use {min}–{max}{label.toLowerCase().includes('storeys')?' whole numbers':''}.</small>}</label>;
}
function TextValue({value,onCommit}:{value:string;onCommit:(v:string)=>void}){
  const [draft,setDraft]=useState(value);useEffect(()=>setDraft(value),[value]);
  return <input aria-label="Building name" value={draft} maxLength={80} onChange={e=>setDraft(e.target.value)} onBlur={()=>{const name=draft.trim()||'Building';if(name!==value)onCommit(name);}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>;
}
