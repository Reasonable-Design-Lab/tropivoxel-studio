import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createServer} from 'node:http';
import {createApi,normalizeHour,googleError} from '../server/api.mjs';
import {createContextApi,compactMap} from '../server/context-api.mjs';

test('Weather API km/h values are converted to m/s',()=>{
  const h=normalizeHour({temperature:{degrees:30},relativeHumidity:80,cloudCover:25,
    wind:{speed:{value:18,unit:'KILOMETERS_PER_HOUR'},direction:{degrees:90}}},'2026-10-31T06:00:00Z');
  assert.equal(h.windSpeed,5);assert.equal(h.cloudCover,.25);assert.equal(h.windDirection,90);
});
test('Google errors expose actionable reasons without echoing upstream messages',()=>{
  const result=googleError({error:{message:'secret-test-key',details:[{reason:'SERVICE_DISABLED'}]}},403);
  assert.equal(result.error.code,'SERVICE_DISABLED');
  assert.ok(!JSON.stringify(result).includes('secret-test-key'));
});
test('context map compaction keeps required outline nodes and strips irrelevant roads',()=>{
  const raw={elements:[
    {type:'node',id:1,lat:1.3,lon:103.8},{type:'node',id:2,lat:1.3,lon:103.81},
    {type:'node',id:3,lat:1.31,lon:103.81},{type:'node',id:4,lat:1.33,lon:103.83},
    {type:'way',id:10,tags:{building:'yes'},nodes:[1,2,3,1]},
    {type:'way',id:11,tags:{highway:'residential'},nodes:[3,4]},
  ]};
  const compact=compactMap(raw);
  assert.deepEqual(compact.elements.map(e=>e.id),[1,2,3,10]);
});
test('context API validates location and works without a Google key',async()=>{
  let calls=0;
  const app=createContextApi({fetchImpl:async(url,options)=>{
    calls++;assert.ok(url.startsWith('https://api.openstreetmap.org/api/0.6/map.json?bbox='));
    assert.ok(!options.headers['X-Goog-Api-Key']);
    return new Response(JSON.stringify({elements:[
      {type:'node',id:1,lat:1.3506,lon:103.8488,user:'private-contributor',uid:123},
      {type:'way',id:4,nodes:[1,1,1,1],tags:{building:'yes',name:'Test'}},
    ]}),{status:200});
  }});
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const root='http://127.0.0.1:'+(server.address() as {port:number}).port;
  try{
    assert.equal((await fetch(root+'/context?lat=45&lng=103')).status,400);assert.equal(calls,0);
    const r=await fetch(root+'/context?lat=1.3506&lng=103.8488'),data=await r.json();
    assert.equal(r.status,200);assert.equal(data.elements.length,2);assert.ok(!JSON.stringify(data).includes('private-contributor'));assert.ok(!JSON.stringify(data).includes('uid'));
  }finally{server.close();}
});
test('API works with raw Node responses, as used by Vite Connect',async()=>{
  const server=createServer(createApi({key:'test-key'}));
  server.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  try {
    const r=await fetch('http://127.0.0.1:'+(server.address() as {port:number}).port+'/config');
    assert.equal(r.status,200);assert.deepEqual(await r.json(),{hasKey:true});
  }finally{server.close();}
});
test('API proxy keeps key server-side, validates coordinates and handles both providers',async()=>{
  let calls=0;
  const app=express();app.use('/api',createApi({key:'test-key',fetchImpl:async(url,options)=>{
    calls++;assert.equal(options.headers['X-Goog-Api-Key'],'test-key');assert.ok(!url.includes('test-key'));
    const hour={temperature:{degrees:30},relativeHumidity:80,cloudCover:20,wind:{speed:{value:18,unit:'KILOMETERS_PER_HOUR'}}};
    const body=url.includes('forecast')?{forecastHours:[{...hour,interval:{startTime:'2026-10-31T06:00:00Z'}}]}:
      url.includes('solar')?{solarPotential:{maxSunshineHoursPerYear:1300,wholeRoofStats:{areaMeters2:100}}}:
      {...hour,currentTime:'2026-10-31T06:00:00Z'};
    return new Response(JSON.stringify(body),{status:200});
  }}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const root='http://127.0.0.1:'+(server.address() as {port:number}).port;
  try{
    const config=await (await fetch(root+'/api/config')).json();assert.deepEqual(config,{hasKey:true});
    assert.equal((await fetch(root+'/api/weather?lat=oops&lng=103')).status,400);assert.equal(calls,0);
    const response=await fetch(root+'/api/weather?lat=1.35&lng=103.82'),weather=await response.json();
    assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(weather.hours[0].windSpeed,5);
    assert.equal(weather.hours.length,1);assert.ok(!JSON.stringify(weather).includes('test-key'));
    const solar=await (await fetch(root+'/api/solar?lat=1.35&lng=103.82')).json();assert.equal(solar.annualSunshineHours,1300);
    assert.equal(calls,3);
  }finally{server.close();}
});
