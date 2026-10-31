import {Point2} from '../types/studio';
export function inPolygon(points:Point2[],x:number,z:number){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function polygonArea(points:Point2[]){
  let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}return Math.abs(area)/2;
}
export function pointSegmentDistance(x:number,z:number,a:Point2,b:Point2){
  const dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz;
  const t=den?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/den)):0;
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}
