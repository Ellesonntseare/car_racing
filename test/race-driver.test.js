import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RaceDriver} from '../src/shared/RaceDriver.js';
import {RacingLine} from '../src/shared/RacingLine.js';
import {TrackWorld} from '../src/engine/TrackWorld.js';
import {CARS} from '../src/assets/catalog.js';

function circuit(withWall=false){
 const road=new THREE.Mesh(new THREE.RingGeometry(34,46,128),new THREE.MeshBasicMaterial());
 road.rotation.x=-Math.PI/2;road.updateMatrixWorld(true);road.name='road';
 const meshes=[road];
 if(withWall){
  const wall=new THREE.Mesh(new THREE.BoxGeometry(.6,3,14),new THREE.MeshBasicMaterial());
  wall.position.set(9,1.5,39);wall.name='barrier';wall.updateMatrixWorld(true);meshes.push(wall);
 }
 const points=Array.from({length:129},(_,index)=>{const angle=index/128*Math.PI*2;return [Math.sin(angle)*40,.08,Math.cos(angle)*40];});
 return {line:new RacingLine(points),world:new TrackWorld(meshes,[road])};
}

test('race driver steers an actual vehicle around a complete collision-checked circuit',()=>{
 const {line,world}=circuit(),driver=new RaceDriver({line,world,car:CARS[0],speedLimit:20});
 let maximumStep=0;
 for(let frame=0;frame<60*50&&driver.distance<line.length+3;frame++){
  const previous={...driver.state};driver.step(1/60);
  maximumStep=Math.max(maximumStep,Math.hypot(driver.state.x-previous.x,driver.state.z-previous.z));
 }
 assert.ok(driver.distance>line.length,'must physically cross the start line');
 assert.equal(driver.blockedTotal,0);
 assert.ok(driver.maxError<2,'must remain close to the road route');
 assert.ok(maximumStep<.4,'must not snap its position to a waypoint');
 assert.ok(driver.state.wheelAngle>100,'wheel rotation comes from travelled physics distance');
});

test('race driver cannot advance through a real barrier or teleport to the next waypoint',()=>{
 const {line,world}=circuit(true),driver=new RaceDriver({line,world,car:CARS[0],speedLimit:20});
 for(let frame=0;frame<600;frame++)driver.step(1/60);
 assert.ok(driver.blockedTotal>0);
 assert.ok(driver.state.x<8);
 assert.ok(driver.distance<15);
 assert.equal(driver.state.speed,0);
});
