import * as THREE from 'three';
import { ROCKY_ROAD_MESHES } from '../assets/rocky-road-meshes.js';
import { WOODS_ROAD_MESHES } from '../assets/woods-road-meshes.js';

// These checks run after the user's imported GLB is placed in world coordinates.
// Prefer explicit track/road meshes over generic terrain; every map can use a
// different layout without relying on a made-up (0, 0) spawn.
const ROAD_NAME=/road|street|asphalt|tarmac|highway|route|race.?track|circuit|pavement|(?:^|[\s_.-])lane(?:$|[\s_.-])|runway|course|pista/i;
const TERRAIN_NAME=/ground|terrain|floor|landscape|(?:^|[\s_.-])land(?:$|[\s_.-])|surface/i;
const EXCLUDE_NAME=/wall|roof|window|glass|building|house|tree|leaf|bush|lamp|fence|sign|decal|sky|water|ocean|car|vehicle/i;
export function classifyDriveableMeshes(meshes,mapId){
 const ground=meshes.filter(mesh=>{
  const name=`${mesh.name} ${[mesh.material].flat().map(m=>m?.name||'').join(' ')}`;
  return !/water|ocean|river|lake|sky|cloud|roof|building|house|wall|barrier|fence|tree|bush|leaf|pole|lamp|sign|vehicle|boulder/i.test(name);
 });
 if(mapId==='laguna'){
  // The imported model names sand runoff and kerbs as roads too. Only this
  // material is the asphalt circuit; it keeps spawns and AI off the runoff.
  const asphalt=meshes.filter(m=>m.name.includes('laguna_seca_road_Material__2941_0'));
  if(asphalt.length)return {explicit:asphalt,terrain:[],driveable:asphalt,ground};
 }
 if(mapId==='rocky'||mapId==='woods'){
  const names=mapId==='rocky'?ROCKY_ROAD_MESHES:WOODS_ROAD_MESHES;
  const explicit=meshes.filter(m=>names.has(m.name));
  return {explicit,terrain:[],driveable:explicit,ground};
 }
 const explicit=[],terrain=[];
 for(const mesh of meshes){
  const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const name=`${mesh.name} ${mats.map(m=>m?.name||'').join(' ')}`;
  if(EXCLUDE_NAME.test(name)&&!ROAD_NAME.test(name))continue;
  if(ROAD_NAME.test(name))explicit.push(mesh);
  else if(TERRAIN_NAME.test(name))terrain.push(mesh);
 }
 return {explicit,terrain,driveable:explicit.length?explicit:terrain.length?terrain:meshes,ground};
}

export function spawnSearchPoints(meshes,bounds,limit=85){
 const output=[];const seen=new Set();
 const add=(x,z)=>{
  if(!Number.isFinite(x)||!Number.isFinite(z)||output.length>=limit)return;
  const key=`${Math.round(x*2)},${Math.round(z*2)}`;
  if(!seen.has(key)){seen.add(key);output.push({x,z});}
 };
 const center=bounds.getCenter(new THREE.Vector3());
 // Sample actual upward-facing GLB triangles before falling back to mesh boxes.
 // Winding circuits (Laguna Seca in particular) may have EMPTY bounding-box
 // centers surrounded by paddocks, tents and terrain rather than a road.
 const usedMeshes=meshes.slice(0,30);
 const strideLimit=Math.min(limit-10,Math.max(36,Math.floor(limit*.75)));
 for(const mesh of usedMeshes){
  if(output.length>=strideLimit)break;
  const geometry=mesh.geometry,positions=geometry?.attributes?.position;
  if(!positions)continue;
  const index=geometry.index,count=index?index.count:positions.count;
  const triangles=Math.floor(count/3);
  const sampleCount=Math.min(24,Math.max(5,Math.ceil(strideLimit/Math.min(usedMeshes.length,8))));
  const v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3();
  const a=new THREE.Vector3(),b=new THREE.Vector3();
  for(let n=0;n<sampleCount&&output.length<strideLimit;n++){
   const t=Math.floor((n+.41)*triangles/sampleCount);
   const ix=Math.min(triangles-1,t)*3;
   const i0=index?index.getX(ix):ix;
   const i1=index?index.getX(ix+1):ix+1;
   const i2=index?index.getX(ix+2):ix+2;
   v1.fromBufferAttribute(positions,i0).applyMatrix4(mesh.matrixWorld);
   v2.fromBufferAttribute(positions,i1).applyMatrix4(mesh.matrixWorld);
   v3.fromBufferAttribute(positions,i2).applyMatrix4(mesh.matrixWorld);
   a.subVectors(v2,v1);b.subVectors(v3,v1);
   const cross=a.cross(b);
   if(Math.abs(cross.y)<cross.length()*.85)continue;
   add((v1.x+v2.x+v3.x)/3,(v1.z+v2.z+v3.z)/3);
  }
 }
 add(center.x,center.z);
 // Points on or near named road mesh surfaces are more useful than map center.
 const ordered=meshes.map(m=>({mesh:m,box:new THREE.Box3().setFromObject(m)}))
  .filter(o=>!o.box.isEmpty())
  .sort((a,b)=>{
   const aArea=(a.box.max.x-a.box.min.x)*(a.box.max.z-a.box.min.z);
   const bArea=(b.box.max.x-b.box.min.x)*(b.box.max.z-b.box.min.z);
   return bArea-aArea;
  });
 for(const {box} of ordered.slice(0,22)){
  if(output.length>=limit)break;
  const cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2;
  const w=box.max.x-box.min.x,d=box.max.z-box.min.z;
  add(cx,cz);
  for(const v of [.25,.75]){
   add(box.min.x+w*v,cz);add(cx,box.min.z+d*v);
   add(box.min.x+w*v,box.min.z+d*.25);
   add(box.min.x+w*v,box.min.z+d*.75);
  }
 }
 const horizontal=Math.max(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z,20);
 const step=Math.min(horizontal*.12,35);
 for(let ring=1;ring<=4;ring++)for(let a=0;a<12;a++){
  const t=a*Math.PI/6;add(center.x+Math.cos(t)*step*ring,center.z+Math.sin(t)*step*ring);
 }
 return output;
}

/** Heading 0 means forward towards -Z, matching REDLINE's vehicle physics. */
export function drivingDirection(heading){return {x:-Math.sin(heading),z:-Math.cos(heading)};}

export function findTrackSpawn({roadMeshes,allMeshes,bounds,surfaceHit,canSpawn=()=>true,maxProbes=240}){
 const surfaces=roadMeshes.length?roadMeshes:allMeshes;
 if(!surfaces.length)return null;
 const center=bounds.getCenter(new THREE.Vector3());
 const points=spawnSearchPoints(surfaces,bounds,maxProbes);
 const possibilities=[];
 // Phase one is intentionally cheap: probe candidate ground points only once.
 // The expensive forward/side raycasts run on the best few candidates only.
 for(const p of points){
  const hit=surfaceHit(p.x,p.z,0,surfaces,true);
  if(!hit)continue;
  const distance=Math.hypot(p.x-center.x,p.z-center.z);
  const elevation=Math.max(0,hit.y-bounds.min.y);
  possibilities.push({...p,hit,priority:distance*.07+elevation*.05});
 }
 possibilities.sort((a,b)=>a.priority-b.priority);
 let best=null;
 for(const p of possibilities.slice(0,40)){
  const hit=p.hit;
  let bestHeading=0,continuity=0;
  for(let k=0;k<12;k++){
   const heading=k*Math.PI/6,d=drivingDirection(heading);
   if(!canSpawn({x:p.x,z:p.z,y:hit.y+.08,heading}))continue;
   let score=0;
   for(const dist of [4,10,17,28]){
    const ahead=surfaceHit(p.x+d.x*dist,p.z+d.z*dist,hit.y,surfaces,false);
    if(!ahead||Math.abs(ahead.y-hit.y)>=Math.max(2,dist*.23)||!canSpawn({x:p.x+d.x*dist,z:p.z+d.z*dist,y:ahead.y+.08,heading}))break;
    score+=dist===4?3:dist===10?2:1;
   }
   const sideX=-d.z,sideZ=d.x;
   for(const dir of [-1,1]){
    const side=surfaceHit(p.x+sideX*dir*1.3,p.z+sideZ*dir*1.3,hit.y,surfaces,false);
    if(side&&Math.abs(side.y-hit.y)<1.6)score+=1.5;
   }
   if(score>continuity){continuity=score;bestHeading=heading;}
  }
  const score=continuity*23-p.priority;
  if(!best||score>best.score)best={x:p.x,z:p.z,y:hit.y+.1,heading:bestHeading,score,continuity,mesh:hit.object?.name||'unnamed'};
 }

 return best&&best.continuity>=6?best:null;
}
