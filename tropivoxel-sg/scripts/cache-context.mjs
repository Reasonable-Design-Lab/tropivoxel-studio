import {writeFile,mkdir} from 'node:fs/promises';
import {fetchMap} from '../server/context-api.mjs';
const out=new URL('../src/data/',import.meta.url);await mkdir(out,{recursive:true});
try{
  const data=await fetchMap(1.3506,103.8488);
  const buildings=data.elements.filter(e=>e.type==='way'&&e.tags?.building);
  console.log(JSON.stringify({elements:data.elements.length,buildings:buildings.length,fetchedAt:data.fetchedAt}));
  if(!buildings.length)throw Error('No buildings returned; the existing cache was preserved.');
  await writeFile(new URL('bishan-context.json',out),JSON.stringify(data));
}catch(e){console.error(e.message);process.exitCode=1;}
