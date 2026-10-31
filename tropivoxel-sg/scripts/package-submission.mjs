import {build} from 'vite';
import {readFile,writeFile,readdir,copyFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=new URL('../../submission/',import.meta.url);
await mkdir(out,{recursive:true});
await build({root,configFile:fileURLToPath(new URL('../vite.submission.config.ts',import.meta.url))});
let html=await readFile(new URL('index.html',out),'utf8');
html=html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/,'<script defer src="$1"></script>')
  .replace(/ crossorigin/g,'').replace(/^.*<link[^>]+href="https:\/\/fonts\.[^>]+>\s*$/gm,'');
html=html.replace('<div id="root"></div>','<div id="root"></div>\n    <noscript>This interactive studio requires JavaScript. Enable JavaScript and reload.</noscript>');
await writeFile(new URL('index.html',out),html);
await copyFile(new URL('../BRIEF.Md',import.meta.url),new URL('BRIEF.Md',out));
const files=(await readdir(out)).sort(),expected=['BRIEF.Md','app.js','index.html','styles.css'].sort();
if(JSON.stringify(files)!==JSON.stringify(expected))throw Error('Unexpected submission contents: '+files.join(', '));
const js=await readFile(new URL('app.js',out),'utf8');
if(/AIza[\w-]{35}/.test(js))throw Error('Unexpected credential found in bundle.');
if(/type="module"|\/src\/main/.test(html))throw Error('Submission HTML is not standalone.');
console.log('Submission verified: '+files.join(', '));
