import {readFile,writeFile} from 'node:fs/promises';
import {compactMap} from '../server/context-api.mjs';
const file=new URL('../src/data/bishan-context.json',import.meta.url);
const original=JSON.parse(await readFile(file,'utf8'));
const compact=compactMap(original);
await writeFile(file,JSON.stringify(compact));
console.log(JSON.stringify({original:original.elements.length,retained:compact.elements.length,bytes:JSON.stringify(compact).length,buildings:compact.elements.filter(e=>e.type==='way'&&e.tags?.building).length}));
