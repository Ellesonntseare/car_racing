import assert from 'node:assert/strict';
import {loadGeometry} from './geometry-audit.mjs';
import {MAPS} from '../src/assets/catalog.js';
import {classifyDriveableMeshes,findTrackSpawn} from '../src/engine/road.js';
import {TrackWorld} from '../src/engine/TrackWorld.js';
import {multiplayerGridSpawn} from '../src/engine/gridSpawn.js';
import {chooseNosSites} from '../src/engine/nosSites.js';
import {LAP_CHECKPOINTS} from '../src/assets/lapCheckpoints.js';

for(const map of MAPS){
 const {meshes,bounds}=await loadGeometry('../Car Racing/'+map.file,map.span);
 const roads=classifyDriveableMeshes(meshes,map.id).driveable;
 const world=new TrackWorld(meshes,roads);
 const spawn=findTrackSpawn({roadMeshes:roads,allMeshes:meshes,bounds,
  surfaceHit:(x,z,y,_meshes,wide)=>world.surface(x,z,y,wide),
  canSpawn:p=>!!world.support(p,1.4,1.7)&&!world.blocked(p,1.5,2.5)});
 assert.ok(spawn,`${map.name}: road spawn missing`);
 const slots=Array.from({length:8},(_,i)=>multiplayerGridSpawn(world,spawn,i));
 for(const [i,p] of slots.entries()){
  assert.ok(world.support(p,1.4,1.75),`${map.name}: player ${i} is off road`);
  assert.ok(!world.blocked(p,1.52,2.4),`${map.name}: player ${i} intersects scenery`);
  for(let j=0;j<i;j++)assert.ok(Math.hypot(p.x-slots[j].x,p.z-slots[j].z)>3,
   `${map.name}: players ${i} and ${j} overlap`);
 }
 const sites=chooseNosSites(world,spawn,12345);
 for(const [i,[x,y,z]] of LAP_CHECKPOINTS[map.id].entries()){
  const floor=world.surface(x,z,y+.08);
  assert.ok(floor&&Math.abs(floor.y-y)<1.5,`${map.name}: lap checkpoint ${i} is not on the drivable circuit`);
 }
 assert.ok(sites.length>=5,`${map.name}: NOS is not spread across the map`);
 assert.deepEqual(sites,chooseNosSites(world,spawn,12345),`${map.name}: clients disagree on NOS sites`);
 for(const [i,p] of sites.entries()){
  assert.ok(world.support(p,1.4,1.75),`${map.name}: NOS pickup ${i} is off road`);
  assert.ok(!world.blocked(p,1.4,1.75),`${map.name}: NOS pickup ${i} intersects scenery`);
  for(let j=0;j<i;j++)assert.ok(Math.hypot(p.x-sites[j].x,p.z-sites[j].z)>19,`${map.name}: NOS sites overlap`);
 }
 console.log(`${map.name}: 8 centered road spawns and ${sites.length} spread NOS sites verified`);
}
