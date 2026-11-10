import assert from 'node:assert/strict';
import {loadGeometry} from './geometry-audit.mjs';
import {classifyDriveableMeshes,findTrackSpawn} from '../src/engine/road.js';
import {TrackWorld} from '../src/engine/TrackWorld.js';
const {meshes,bounds}=await loadGeometry('../Car Racing/nfs_iii_hot_pursuit_-_rocky_pass.glb',1400);
const roads=classifyDriveableMeshes(meshes,'rocky').driveable;const world=new TrackWorld(meshes,roads);
const spawn=findTrackSpawn({roadMeshes:roads,allMeshes:meshes,bounds,surfaceHit:(x,z,y,m,wide)=>world.surface(x,z,y,wide),canSpawn:p=>!!world.support(p,1.4,1.7)&&!world.blocked(p,1.5,2.5)});
assert.ok(spawn,'Rocky Pass must have a safe spawn');assert.ok(world.support(spawn,1.4,1.7));assert.equal(world.blocked(spawn,1.5,2.5),false);
let state=spawn;for(let i=0;i<300;i++){const next={...state,x:state.x-Math.sin(state.heading)*.25,z:state.z-Math.cos(state.heading)*.25};const move=world.move(state,next,{keepOnRoad:true,width:1.4});assert.ok(world.support(move,1.4));if(move.blocked){console.log('Safely stopped:',move.reason,'after',i*.25,'m');break;}state=move;}
console.log(JSON.stringify({roads:roads.length,triangles:world.triangleCount,spawn},null,2));
