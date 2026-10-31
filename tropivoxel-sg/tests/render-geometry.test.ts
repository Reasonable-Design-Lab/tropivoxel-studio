import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {containsPoint,footprintCorners} from '../src/lib/layout-typology';
import {Building} from '../src/types/studio';
test('Three.js polygon extrusion matches the analysis coordinate convention at multiple rotations',()=>{
  const b:Building={id:'test',x:73,z:92,width:26,depth:18,height:24,storeys:8,rotation:0,porosity:0,
    footprint:[[-13,-9],[13,-9],[13,0],[0,0],[0,9],[-13,9]]};
  for(const rotation of [-90,-30,0,15,90]){
    const building={...b,rotation},shape=new THREE.Shape(b.footprint!.map(p=>new THREE.Vector2(p[0]/4,-p[1]/4)));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:b.height/4,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
    const mesh=new THREE.Mesh(geometry);mesh.rotation.y=-rotation*Math.PI/180;mesh.position.set(b.x/4-25,.04,b.z/4-25);mesh.updateMatrixWorld();
    const world=footprintCorners(building);
    for(let i=0;i<b.footprint!.length;i++){
      const p=b.footprint![i],v=new THREE.Vector3(p[0]/4,0,p[1]/4).applyMatrix4(mesh.matrixWorld);
      assert.ok(Math.abs((v.x+25)*4-world[i][0])<1e-6);
      assert.ok(Math.abs((v.z+25)*4-world[i][1])<1e-6);
    }
    const a=rotation*Math.PI/180;
    const filled=[-7,4],empty=[7,4];
    assert.ok(containsPoint(building,b.x+filled[0]*Math.cos(a)-filled[1]*Math.sin(a),b.z+filled[0]*Math.sin(a)+filled[1]*Math.cos(a)));
    assert.ok(!containsPoint(building,b.x+empty[0]*Math.cos(a)-empty[1]*Math.sin(a),b.z+empty[0]*Math.sin(a)+empty[1]*Math.cos(a)));
    geometry.dispose();(mesh.material as THREE.Material).dispose();
  }
});
