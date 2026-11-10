import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { normalizeScene } from '../src/engine/assets.js';
export async function loadGeometry(file,span){
 const bytes=fs.readFileSync(file),length=bytes.readUInt32LE(12);
 const json=JSON.parse(bytes.toString('utf8',20,20+length)),bin=bytes.subarray(28+length);
 for(let i=0;i<(json.images?.length||0);i++){
  const view=json.bufferViews[json.images[i].bufferView];
  if(process.env.EXTRACT_TEXTURES)fs.writeFileSync(`audit-texture-${i}.png`,bin.subarray(view.byteOffset,view.byteOffset+view.byteLength));
 }
 json.materials=(json.materials||[]).map(m=>({name:m.name,doubleSided:true}));delete json.textures;delete json.images;
 json.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
 globalThis.ProgressEvent??=class ProgressEvent{constructor(type,init){Object.assign(this,init);}};
 const gltf=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
 const metrics=span?normalizeScene(gltf.scene,span):{bounds:new THREE.Box3().setFromObject(gltf.scene)};const meshes=[];gltf.scene.traverse(n=>{if(n.isMesh)meshes.push(n);});
 return {root:gltf.scene,meshes,bounds:metrics.bounds,animations:gltf.animations};
}
if(process.argv[1]?.endsWith('geometry-audit.mjs')&&process.argv[2]){
 const {meshes,bounds}=await loadGeometry(process.argv[2],560);
 const records=meshes.map(m=>{
  const pos=m.geometry.attributes.position,uv=m.geometry.attributes.uv,idx=m.geometry.index;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();let flat=0,area=0;
  for(let i=0;i<(idx?.count||pos.count);i+=3){a.fromBufferAttribute(pos,idx?idx.getX(i):i).applyMatrix4(m.matrixWorld);b.fromBufferAttribute(pos,idx?idx.getX(i+1):i+1).applyMatrix4(m.matrixWorld);c.fromBufferAttribute(pos,idx?idx.getX(i+2):i+2).applyMatrix4(m.matrixWorld);normal.subVectors(b,a).cross(c.sub(a));area+=normal.length()/2;if(Math.abs(normal.y)>normal.length()*.9)flat+=normal.length()/2;}
  const box=new THREE.Box3().setFromObject(m),center=box.getCenter(new THREE.Vector3());
  return {name:m.name,area:+area.toFixed(1),flat:+(flat/area).toFixed(2),center:center.toArray().map(x=>+x.toFixed(2)),uv:uv?Array.from(uv.array).slice(0,8):null};
 });
 fs.writeFileSync('geometry-audit.json',JSON.stringify(records,null,2));
 console.log('Bounds',bounds,'meshes',meshes.length);console.log(records.filter(r=>r.flat>.85).slice(0,12));
}
