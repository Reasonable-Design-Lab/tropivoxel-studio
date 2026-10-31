import express from 'express';
import dotenv from 'dotenv';
import {createContextApi} from './context-api.mjs';
import { fileURLToPath } from 'node:url';
dotenv.config({path:fileURLToPath(new URL('../.env.local',import.meta.url)),quiet:true});

export function googleError(body, status) {
  const reason=body?.error?.details?.find(d=>d.reason)?.reason ?? body?.error?.status ?? 'UPSTREAM_ERROR';
  const tips={
    SERVICE_DISABLED:'Enable the requested API in the Google Cloud project that owns this key.',
    API_KEY_SERVICE_BLOCKED:'This API is not allowed by the key restrictions. Check API restrictions in Google Cloud.',
    API_KEY_HTTP_REFERRER_BLOCKED:'This key only permits browser referrers. Use a key that permits server requests.',
    API_KEY_INVALID:'Google did not accept the API key. Check that it is valid.',
    BILLING_DISABLED:'Enable billing for this Google Cloud project.',
    NOT_FOUND:'No Solar building data is available near these coordinates. Try a nearby building centre.',
    RESOURCE_EXHAUSTED:'Google API quota is exhausted. Check quota and billing.',
  };
  return {error:{code:reason,status,message:tips[reason] ?? 'Google API request failed. Check API enablement, key restrictions and billing.'}};
}
const finite=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
export function normalizeHour(h,time) {
  const speed=h.wind?.speed;
  const raw=finite(speed?.value,0);
  const windSpeed=speed?.unit==='KILOMETERS_PER_HOUR'?raw/3.6:speed?.unit==='MILES_PER_HOUR'?raw*.44704:raw;
  return {time,temperature:finite(h.temperature?.degrees,31.5),humidity:finite(h.relativeHumidity,75),
    windSpeed,windDirection:finite(h.wind?.direction?.degrees,45),cloudCover:finite(h.cloudCover,25)/100};
}
export function createApi({key=process.env.GOOGLE_MAPS_API_KEY,fetchImpl=fetch}={}) {
  // A full Express app also works as Vite/Connect middleware, which supplies raw
  // Node request/response objects rather than Express-enhanced responses.
  const api=express();
  api.disable('x-powered-by');
  // Results and secrets stay out of browser storage and HTTP caches.
  api.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  api.get('/config',(_req,res)=>res.json({hasKey:!!key && key!=='your_google_maps_key'}));
  api.use(createContextApi({fetchImpl}));
  api.use((req,res,next)=>{
    if(!['/weather','/solar'].includes(req.path)) return res.status(404).json({error:{message:'API endpoint not found.'}});
    if(!key || key==='your_google_maps_key') return res.status(503).json({error:{code:'KEY_MISSING',message:'Set GOOGLE_MAPS_API_KEY in .env.local and restart the server.'}});
    const lat=Number(req.query.lat),lng=Number(req.query.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||!req.query.lat||!req.query.lng||Math.abs(lat)>90||Math.abs(lng)>180)
      return res.status(400).json({error:{code:'INVALID_LOCATION',message:'Enter valid latitude and longitude coordinates.'}});
    res.locals.location={'location.latitude':String(lat),'location.longitude':String(lng)};
    next();
  });
  async function request(url,params) {
    const response=await fetchImpl(url+'?'+new URLSearchParams(params),{
      headers:{'X-Goog-Api-Key':key},signal:AbortSignal.timeout(15000),
    });
    const body=await response.json();
    if(!response.ok) {
      const error=new Error('Google API failed');error.payload=googleError(body,response.status);
      error.status=response.status;throw error;
    }
    return body;
  }
  api.get('/weather',async(_req,res)=>{
    try {
      const [current,forecast]=await Promise.all([
        request('https://weather.googleapis.com/v1/currentConditions:lookup',res.locals.location),
        request('https://weather.googleapis.com/v1/forecast/hours:lookup',{...res.locals.location,hours:'24',pageSize:'24'}),
      ]);
      const hours=(forecast.forecastHours??[]).map(h=>normalizeHour(h,h.interval?.startTime)).filter(h=>h.time);
      if(!hours.length) return res.status(502).json({error:{code:'EMPTY_FORECAST',message:'Google returned no usable hourly forecast.'}});
      res.json({source:'Google Weather API',fetchedAt:new Date().toISOString(),
        current:normalizeHour(current,current.currentTime),hours});
    } catch(e) {
      res.status(e.status??502).json(e.payload??{error:{code:'NETWORK_ERROR',message:'The weather service could not be reached. Try again later.'}});
    }
  });
  api.get('/solar',async(_req,res)=>{
    try {
      const body=await request('https://solar.googleapis.com/v1/buildingInsights:findClosest',
        {...res.locals.location,requiredQuality:'BASE'});
      res.json({source:'Google Solar API',center:body.center,imageryDate:body.imageryDate,quality:body.imageryQuality,
        annualSunshineHours:body.solarPotential?.maxSunshineHoursPerYear??null,
        roofArea:body.solarPotential?.wholeRoofStats?.areaMeters2??null});
    }catch(e) {
      res.status(e.status??502).json(e.payload??{error:{code:'NETWORK_ERROR',message:'The Solar service could not be reached. Try again later.'}});
    }
  });
  return api;
}
