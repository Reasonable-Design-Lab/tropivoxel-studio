// Explicit connectivity check; never prints a key or the raw Google error.
import {fileURLToPath} from 'node:url';
try{process.loadEnvFile(fileURLToPath(new URL('../.env.local',import.meta.url)));}catch{}
const key=process.env.GOOGLE_MAPS_API_KEY;
if(!key){console.error('GOOGLE_MAPS_API_KEY is not configured.');process.exit(1);}
const location={'location.latitude':process.argv[2]??'1.3521','location.longitude':process.argv[3]??'103.8198'};
const services=[
  ['Weather current','https://weather.googleapis.com/v1/currentConditions:lookup',location],
  ['Weather forecast','https://weather.googleapis.com/v1/forecast/hours:lookup',{...location,hours:'24',pageSize:'24'}],
  ['Solar building','https://solar.googleapis.com/v1/buildingInsights:findClosest',{...location,requiredQuality:'BASE'}],
];
for(const [service,endpoint,params] of services){
  if(process.argv.includes('--solar') && !service.startsWith('Solar')) continue;
  try{
    const r=await fetch(endpoint+'?'+new URLSearchParams(params),{headers:{'X-Goog-Api-Key':key},signal:AbortSignal.timeout(20000)});
    const j=await r.json();
    console.log(JSON.stringify({service,status:r.status,
      reason:j.error?.details?.find(d=>d.reason)?.reason??j.error?.status??'OK',
      ...(r.ok?{temperature:j.temperature?.degrees,hours:j.forecastHours?.length,annualSunshineHours:j.solarPotential?.maxSunshineHoursPerYear}:{})}));
  }catch(e){console.log(JSON.stringify({service,reason:e.name==='TimeoutError'?'TIMEOUT':'NETWORK_ERROR'}));}
}
