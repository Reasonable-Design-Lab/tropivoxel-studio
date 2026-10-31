import {existsSync,mkdirSync,appendFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const logDir=path.resolve(root,'../artifacts');
mkdirSync(logDir,{recursive:true});
const logFile=path.join(logDir,'startup.log');
function log(value){const line=String(value).replace(/AIza[\w-]{35}/g,'[redacted]');console.log(line);appendFileSync(logFile,line+'\n');}
log('\nTropiVoxel Studio | '+new Date().toISOString());
log('Node '+process.versions.node+' | '+process.execPath);
const check=process.argv.includes('--check'),noOpen=check||process.argv.includes('--no-open');
let server;
try {
  const [major,minor]=process.versions.node.split('.').map(Number);
  if(!((major===20&&minor>=19)||(major===22&&minor>=12)||major>=24))
    throw Error('Use Node.js 22 LTS (22.12+) or Node.js 24. The current runtime is unsupported.');
  if(!existsSync(path.join(root,'node_modules/vite/bin/vite.js'))){
    log('Installing project dependencies...');
    const child=spawn(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm install'],{cwd:root,windowsHide:true});
    child.stdout.on('data',s=>log(s));child.stderr.on('data',s=>log(s));
    await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Dependency installation failed. Check your network and npm.')));});
  }
  const url='http://127.0.0.1:3000/';
  let existing=false;
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(1000)});
    const html=await response.text();
    if(response.ok&&html.includes('TropiVoxel')) existing=true;
    else throw Error('Port 3000 is already used by another application. Close it and try again.');
  }catch(e){if(e.message?.includes('already used'))throw e;}
  if(!existing){
    const {createServer}=await import(pathToFileURL(path.join(root,'node_modules/vite/dist/node/index.js')).href);
    server=await createServer({root,server:{host:'127.0.0.1',port:3000,strictPort:true}});
    await server.listen();
  }
  const response=await fetch(url+'api/config',{signal:AbortSignal.timeout(5000)});
  const config=await response.json();
  if(!response.ok||typeof config.hasKey!=='boolean')throw Error('The local API did not pass its startup check.');
  log('READY: '+url+' | API OK | Google key '+(config.hasKey?'configured':'not configured'));
  log('Startup log: '+logFile);
  if(!noOpen)spawn('explorer.exe',[url],{stdio:'ignore',windowsHide:true}).on('error',e=>log('Open '+url+' manually: '+e.message));
  if(check){await server?.close();log('Startup check passed.');}
  else if(existing){log('Opened the existing studio server.');}
  else {
    log('Keep this window open. Press Ctrl+C to stop the studio.');
    const stop=async()=>{await server.close();process.exit(0);};
    process.once('SIGINT',stop);process.once('SIGTERM',stop);
  }
}catch(e){log('STARTUP FAILED: '+e.message);log('See '+logFile);await server?.close();process.exitCode=1;}
