import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadGeometry} from './geometry-audit.mjs';
import {MAPS} from '../src/assets/catalog.js';
import {classifyDriveableMeshes} from '../src/engine/road.js';
import {TrackWorld} from '../src/engine/TrackWorld.js';

// Scan imported asphalt at full vehicle size. This complements lap checks:
// it also inspects road patches which the chosen race route might avoid.
const round=value=>Math.round(value*1000)/1000;
const width=1.4,length=1.65,reports=[];
// Reproductions of imported transparent tree rectangles crossing asphalt.
const knownClearRoad={woods:[[259.955,54.357,602.197],[-13.718,56.012,734.313],[-637.12,45.584,94.138]]};
for(const map of MAPS.filter(m=>!process.env.REDLINE_LAP_MAP||m.id===process.env.REDLINE_LAP_MAP)){
 const {meshes}=await loadGeometry('../Car Racing/'+map.file,map.span);
 const classified=classifyDriveableMeshes(meshes,map.id);
 const world=new TrackWorld(meshes,classified.driveable,{groundMeshes:classified.ground||[]});
 const seen=new Set(),collisions=[],obstacles=new Map();let clear=0,unsupported=0,middleBlocked=0;
 for(const triangle of world.roadTriangles){
  const p={x:(triangle.a.x+triangle.b.x+triangle.c.x)/3,
   y:(triangle.a.y+triangle.b.y+triangle.c.y)/3+.08,
   z:(triangle.a.z+triangle.b.z+triangle.c.z)/3};
  const key=[p.x,p.y,p.z].map(v=>Math.round(v*2)).join(',');if(seen.has(key))continue;seen.add(key);
  let supported=false,passable=false,record=null;
  for(let k=0;k<12;k++){
   const pose={...p,heading:k*Math.PI/12},contact=world.support(pose,width,length);
   if(!contact)continue;supported=true;Object.assign(pose,contact);
   if(!world.blocked(pose,width+.12,length+.6)){passable=true;break;}
   const obstacle=world.lastObstacleTriangle;
   const middle=!!world.support(pose,width+1.1,length+.5);
   if(!record||middle&&!record.middle)record={position:[p.x,p.y,p.z].map(round),heading:round(pose.heading),middle,
    road:triangle.name,obstacle:obstacle?.name||world.lastObstacle,
    normal:obstacle?.normal.toArray().map(round),
    triangle:obstacle?[obstacle.a,obstacle.b,obstacle.c].map(v=>v.toArray().map(round)):null};
  }
  if(passable){clear++;continue;}
  if(!supported){unsupported++;continue;}
  collisions.push(record);if(record.middle)middleBlocked++;
  obstacles.set(record.obstacle,(obstacles.get(record.obstacle)||0)+1);
 }
 let regressions=0;
 for(const [x,y,z] of knownClearRoad[map.id]||[]){
  let passable=false;
  for(let k=0;k<12;k++){
   const pose={x,y,z,heading:k*Math.PI/12},contact=world.support(pose,width,length);
   if(contact&&!world.blocked({...pose,...contact},width+.12,length+.6)){passable=true;break;}
  }
  assert.ok(passable,`${map.name}: reproduced invisible road blocker at ${x},${y},${z}`);regressions++;
 }
 const report={map:map.id,samples:seen.size,clear,unsupported,blocked:collisions.length,middleBlocked,regressions,
  obstacleCounts:[...obstacles].sort((a,b)=>b[1]-a[1]),collisions};reports.push(report);
 console.log(JSON.stringify({...report,collisions:collisions.slice(0,4)}));
}
if(process.argv.includes('--write-report'))fs.writeFileSync('road-clearance.json',JSON.stringify(reports,null,2)+'\n');
