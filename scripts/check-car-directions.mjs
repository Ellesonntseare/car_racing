import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadGeometry } from './geometry-audit.mjs';
import { buildCarModel } from '../src/engine/assets.js';
import { CARS } from '../src/assets/catalog.js';
import { createVehicleState, vehicleStep } from '../src/shared/physics.js';

// Actual imported axle landmarks; AMG's anonymous meshes use the pedal/seat
// positions instead, which establish the same rear-to-front direction.
const landmarks = {
 f40:['Wheel_Front_L_23','Wheel_Rear_L_27'],
 ccxr:['ccxWHEEL_RF_SUB4_ccxtire3_0','ccxWHEEL_RR_SUB4_ccxtire3_0'],
 bentley:['3DWheel_Front_L','3DWheel_Rear_L'],
 f296:['Wheel_Front_L_59','Wheel_Rear_L_63'],
 nascar:['DEF-WheelFtL_Car_Rig','DEF-WheelBkL_Car_Rig'],
 amg:['Object_142','Object_14'],
};
for (const car of CARS) {
 const {root}=await loadGeometry('../Car Racing/'+car.file);
 const model=buildCarModel(root,null,0,car.modelHeading);
 for (const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]) {
  model.rotation.y=heading;model.updateMatrixWorld(true);
  const points=landmarks[car.id].map(name=>{
   const node=model.getObjectByName(name);assert.ok(node,`${car.id}: missing ${name}`);
   return node.isBone?node.getWorldPosition(new THREE.Vector3()):new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
  });
  const nose=points[0].sub(points[1]);nose.y=0;nose.normalize();
  const state=createVehicleState();state.heading=heading;
  vehicleStep(state,{throttle:1,brake:0,steer:0},car,1/60);
  const motion=new THREE.Vector3(state.x,0,state.z).normalize();
  assert.ok(nose.dot(motion)>.95,`${car.id}: model nose opposes forward motion at ${heading}`);
 }
 console.log(`PASS ${car.name}: nose follows forward movement at all four headings`);
}
