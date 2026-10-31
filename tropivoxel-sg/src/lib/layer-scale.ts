import * as THREE from 'three';
import {Layer} from '../types/studio';
export const LAYER_SCALE = {
  utci:{min:20,max:50,colors:['#738fbb','#a2bfa9','#e4dca3','#eeb08d','#cc7185','#755178'],unit:'°C',label:'Comfort · UTCI proxy'},
  sun:{min:0,max:1,colors:['#72769e','#a9a7bd','#e2d1aa','#f4ca82'],unit:'%',label:'Sun / shade · direct transmission'},
  wind:{min:0,max:3,colors:['#d5b8b1','#ece0c9','#a8c9c3','#6aa5af','#596eaa'],unit:'m/s',label:'Wind · pedestrian-level estimate'},
};
export function layerColor(layer:Exclude<Layer,'design'>,value:number) {
  const scale=LAYER_SCALE[layer],t=THREE.MathUtils.clamp((value-scale.min)/(scale.max-scale.min),0,1)*(scale.colors.length-1);
  const i=Math.min(scale.colors.length-2,Math.floor(t));
  return new THREE.Color(scale.colors[i]).lerp(new THREE.Color(scale.colors[i+1]),t-i);
}
