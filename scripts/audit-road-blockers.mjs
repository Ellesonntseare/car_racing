import fs from 'node:fs';
import * as T from 'three';
import {loadGeometry} from './geometry-audit.mjs';
import {MAPS} from '../src/assets/catalog.js';
import {classifyDriveableMeshes} from '../src/engine/road.js';
import {TrackWorld} from '../src/engine/TrackWorld.js';
const report=[];
for(const map of MAPS){
 const {meshes}=await loadGeometry('../Car Racing/'+map.file,map.span);
 const roads=classifyDriveableMeshes(meshes,map.id).driveable,world=new TrackWorld(meshes,roads);
 const tris=[...new Set([...world.cells.values()].flat())].filter(t=>t.road),seen=new Set(),points=[],obstacles={};
 for(const t of tris){
  const p=t.a.clone().add(t.b).add(t.c).multiplyScalar(1/3),key=`${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.z)}`;
  if(seen.has(key))continue;seen.add(key);
  let support=false,clear=false,obstacle=null;
  for(let k=0;k<12;k++){
   const pose={x:p.x,y:p.y+.08,z:p.z,heading:k*Math.PI/12};
   const ground=world.support(pose,.95,1.4);if(!ground)continue;support=true;
   Object.assign(pose,ground);
   if(!world.blocked(pose,1.07,2.25)){clear=true;break;}obstacle=world.lastObstacle;
  }
  points.push([+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2),clear?0:support?1:2,t.name]);
  if(support&&!clear)obstacles[obstacle]=(obstacles[obstacle]||0)+1;
 }
 const result={map:map.id,points,counts:[0,1,2].map(s=>points.filter(p=>p[3]===s).length)};
 report.push(result);console.log(map.id,result.counts,'clear / obstacle / no footprint',Object.entries(obstacles).sort((a,b)=>b[1]-a[1]).slice(0,10));
}
fs.writeFileSync('road-blockers.json',JSON.stringify(report));
