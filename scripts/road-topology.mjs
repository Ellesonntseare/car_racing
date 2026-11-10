import fs from 'node:fs';import * as T from 'three';import {loadGeometry} from './geometry-audit.mjs';
const {meshes}=await loadGeometry('../Car Racing/nfs_iii_hot_pursuit_-_rocky_pass.glb',560);const out=[];
for(const m of meshes){const g=m.geometry,p=g.attributes.position,uv=g.attributes.uv,idx=g.index;let triangles=[];
for(let i=0;i<(idx?.count||p.count);i+=3){const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);const v=ids.map(j=>new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(m.matrixWorld));const n=new T.Vector3().subVectors(v[1],v[0]).cross(new T.Vector3().subVectors(v[2],v[0])).normalize();if(Math.abs(n.y)<.85)continue;triangles.push(v.map(a=>a.toArray()));}
if(triangles.length){let u=0,v=0;for(let i=0;i<uv.count;i++){u+=uv.getX(i);v+=uv.getY(i);}out.push({name:m.name,uv:[u/uv.count,v/uv.count],triangles});}}
fs.writeFileSync('road-topology.json',JSON.stringify(out));
