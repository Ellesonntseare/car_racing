import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadGeometry} from './geometry-audit.mjs';
import {MAPS} from '../src/assets/catalog.js';
import {classifyDriveableMeshes} from '../src/engine/road.js';
import {TrackWorld} from '../src/engine/TrackWorld.js';
import {LAP_CHECKPOINTS} from '../src/assets/lapCheckpoints.js';
const reports=[],spacing=1.5,bodyWidth=Number(process.env.REDLINE_CAR_WIDTH||1.4);
function enclosedCells(points){
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const [x,,z] of points){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
 const x0=Math.round(minX/spacing)-1,z0=Math.round(minZ/spacing)-1;
 const w=Math.round((maxX-minX)/spacing)+3,h=Math.round((maxZ-minZ)/spacing)+3,grid=new Uint8Array(w*h);
 for(const [x,,z] of points)grid[(Math.round(z/spacing)-z0)*w+Math.round(x/spacing)-x0]=1;
 const queue=[0];grid[0]=2;
 for(let i=0;i<queue.length;i++){
  const n=queue[i],x=n%w,z=Math.floor(n/w);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,nz=z+dz;if(nx<0||nx>=w||nz<0||nz>=h)continue;
   const next=nz*w+nx;if(!grid[next]){grid[next]=2;queue.push(next);}
  }
 }
 return grid.reduce((total,value)=>total+(value===0),0);
}
for(const map of MAPS){
 const {meshes}=await loadGeometry('../Car Racing/'+map.file,map.span);
 const world=new TrackWorld(meshes,classifyDriveableMeshes(meshes,map.id).driveable);
 const triangles=[...new Set([...world.cells.values()].flat())].filter(t=>t.road),candidates=new Map();
 for(const {a,b,c} of triangles){
  const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-8)continue;
  for(let ix=Math.ceil(Math.min(a.x,b.x,c.x)/spacing);ix<=Math.floor(Math.max(a.x,b.x,c.x)/spacing);ix++)
  for(let iz=Math.ceil(Math.min(a.z,b.z,c.z)/spacing);iz<=Math.floor(Math.max(a.z,b.z,c.z)/spacing);iz++){
   const x=ix*spacing,z=iz*spacing,u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,w=1-u-v;
   if(Math.min(u,v,w)<-1e-6)continue;
   const y=u*a.y+v*b.y+w*c.y+.08,key=`${ix},${iz}`;
   if(!candidates.has(key))candidates.set(key,[]);
   if(!candidates.get(key).some(p=>Math.abs(p.y-y)<.4))candidates.get(key).push({x,z,y,ix,iz,key,heading:0});
  }
 }
 const nodes=new Map();
 for(const [key,ps] of candidates){
  for(const p of ps){
   const support=world.support(p,.85,.85);
   if(!support||world.blocked({...p,...support},1.02,1.02))continue;
   if(!nodes.has(key))nodes.set(key,[]);nodes.get(key).push({...p,...support});
  }
 }
 const seen=new Set(),components=[];
 for(const ps of nodes.values())for(const seed of ps){
  if(seen.has(seed))continue;
  const queue=[seed];seen.add(seed);let edges=0;
  for(let i=0;i<queue.length;i++){
   const p=queue[i];
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    for(const q of nodes.get(`${p.ix+dx},${p.iz+dz}`)||[]){
     if(Math.abs(q.y-p.y)>1.5)continue;
     // Swept body, using the actual travel direction, not just connected pixels.
     const h=Math.atan2(-dx,-dz);
     const result=world.move({...p,heading:h},{...q,heading:h},{keepOnRoad:true,width:bodyWidth,length:1.65});
     if(result.blocked)continue;edges++;
     if(!seen.has(q)){seen.add(q);queue.push(q);}
    }
   }
  }
  components.push({size:queue.length,edges,points:queue.map(p=>[p.x,p.y,p.z])});
 }
 components.sort((a,b)=>b.size-a.size);
 for(const [index,checkpoint] of LAP_CHECKPOINTS[map.id].entries()){
  const nearest=components[0].points.reduce((best,p)=>Math.min(best,Math.hypot(p[0]-checkpoint[0],p[1]-checkpoint[1],p[2]-checkpoint[2])),Infinity);
  assert.ok(nearest<2.5,`${map.name}: lap checkpoint ${index} is disconnected for ${bodyWidth}m car width`);
 }
 const loopArea=enclosedCells(components[0].points)*spacing**2;
 assert.ok(loopArea>10000,`${map.name}: the drivable circuit must enclose its infield, not end at an invisible gap`);
 reports.push({map:map.id,loopArea,components,candidates:[...candidates.values()].flat().map(p=>[p.x,p.y,p.z])});
 console.log(map.id,'connected circuit infield area:',Math.round(loopArea),'m²');
 console.log(map.id,'traversable components:',components.slice(0,10).map(c=>({points:c.size,edges:c.edges})),'total',components.reduce((s,c)=>s+c.size,0));
}
fs.writeFileSync('road-network.json',JSON.stringify(reports));
