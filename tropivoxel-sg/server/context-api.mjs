import express from 'express';
const USER_AGENT='TropiVoxelStudio/0.3 (local educational architecture and microclimate prototype)';
const cache=new Map();
export function compactMap(data){
  const relevant=e=>{const t=e.tags??{};return t.building||['water','grassland'].includes(t.natural)||['grass','meadow','reservoir','recreation_ground'].includes(t.landuse)||['park','garden'].includes(t.leisure)||['river','stream','canal','riverbank'].includes(t.waterway);};
  const ids=new Set(data.elements.filter(e=>(e.type==='way'||e.type==='relation')&&relevant(e)).map(e=>e.type+':'+e.id));
  for(const e of data.elements)if(e.type==='relation'&&ids.has('relation:'+e.id))
    for(const member of e.members??[])if(member.type==='way')ids.add('way:'+member.ref);
  for(const e of data.elements)if(e.type==='way'&&ids.has('way:'+e.id))for(const id of e.nodes??[])ids.add('node:'+id);
  return {...data,elements:data.elements.filter(e=>ids.has(e.type+':'+e.id))};
}
export async function fetchMap(lat,lng,fetchImpl=fetch){
  const deltaLat=240/110574,deltaLng=240/(111320*Math.cos(lat*Math.PI/180));
  const bbox=[lng-deltaLng,lat-deltaLat,lng+deltaLng,lat+deltaLat].join(',');
  const response=await fetchImpl('https://api.openstreetmap.org/api/0.6/map.json?'+new URLSearchParams({bbox}),{
    headers:{Accept:'application/json','User-Agent':USER_AGENT},signal:AbortSignal.timeout(25000),
  });
  if(!response.ok)throw Error('OpenStreetMap returned HTTP '+response.status+'. Try again later or use the bundled Bishan sample.');
  const data=await response.json();
  if(!Array.isArray(data.elements))throw Error('The map service returned an invalid dataset.');
  // Strip contributor identifiers and unrelated map objects before returning map geometry.
  return compactMap({fetchedAt:new Date().toISOString(),elements:data.elements.map(e=>({
    type:e.type,id:e.id,lat:e.lat,lon:e.lon,nodes:e.nodes,members:e.members,
    tags:e.tags?Object.fromEntries(Object.entries(e.tags).filter(([k])=>['building','building:levels','height','name','name:en','landuse','leisure','natural','waterway','width','type'].includes(k))):undefined,
  }))});
}
export function createContextApi({fetchImpl=fetch}={}){
  const api=express();
  api.get('/context',async(req,res)=>{
    res.set('Cache-Control','no-store');
    const lat=Number(req.query.lat),lng=Number(req.query.lng);
    if(!req.query.lat||!req.query.lng||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<1.15||lat>1.5||lng<103.55||lng>104.15)
      return res.status(400).json({error:{message:'Choose coordinates within Singapore (1.15–1.50° N, 103.55–104.15° E).'}});
    const key=lat.toFixed(5)+','+lng.toFixed(5),entry=cache.get(key);
    if(entry&&Date.now()-entry.time<30*60*1000)return res.json(entry.data);
    try{const data=await fetchMap(lat,lng,fetchImpl);cache.set(key,{time:Date.now(),data});if(cache.size>12)cache.delete(cache.keys().next().value);res.json(data);}
    catch(e){res.status(502).json({error:{message:e instanceof Error?e.message:'Context data is temporarily unavailable.'}});}
  });
  return api;
}
