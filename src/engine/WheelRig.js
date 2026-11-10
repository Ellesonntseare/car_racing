import * as THREE from 'three';
import { ownResources } from './assets.js';

const WHEELS={
 f40:['Wheel_Front_L_23','Wheel_Front_R_25','Wheel_Rear_L_27','Wheel_Rear_R_29'],
 f296:['Wheel_Front_L_59','Wheel_Front_R_61','Wheel_Rear_L_63','Wheel_Rear_R_65'],
 nascar:['DEF-WheelFtL_Car_Rig','DEF-WheelFtR_Car_Rig','DEF-WheelBkL_Car_Rig','DEF-WheelBkR_Car_Rig'],
 bentley:['3DWheel_Front_L','3DWheel_Front_R','3DWheel_Rear_L','3DWheel_Rear_R'],
 ccxr:['ccxWHEEL_LF_SUB4','ccxWHEEL_RF_SUB4','ccxWHEEL_LR_SUB4','ccxWHEEL_RR_SUB4']
};
const UP=new THREE.Vector3(0,1,0),AXLE=new THREE.Vector3(1,0,0);

// AMG's exporter combined all four tires into one mesh. Split its original
// indexed triangles by wheel position, retaining the supplied UVs/material.
export function splitAmgTires(model){
 const visual=model.userData.redlineVisual,source=visual.getObjectByName('Object_222');
 if(!source?.isMesh)return [];
 visual.updateMatrixWorld(true);
 const relative=new THREE.Matrix4().copy(visual.matrixWorld).invert().multiply(source.matrixWorld);
 const original=source.geometry.clone().applyMatrix4(relative),attr=original.attributes.position,index=original.index;
 const sets=[[],[],[],[]],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<(index?.count||attr.count);i+=3){
  const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);
  a.fromBufferAttribute(attr,ids[0]);b.fromBufferAttribute(attr,ids[1]);c.fromBufferAttribute(attr,ids[2]);
  const x=(a.x+b.x+c.x)/3,z=(a.z+b.z+c.z)/3;
  sets[(z<0?0:2)+(x<0?0:1)].push(...ids);
 }
 const nodes=[];
 for(let i=0;i<4;i++){
  if(!sets[i].length)continue;
  const geometry=new THREE.BufferGeometry();
  for(const [name,attribute] of Object.entries(original.attributes)){
   const values=new attribute.array.constructor(sets[i].length*attribute.itemSize);
   for(let j=0;j<sets[i].length;j++)for(let k=0;k<attribute.itemSize;k++)values[j*attribute.itemSize+k]=attribute.getComponent(sets[i][j],k);
   geometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize,attribute.normalized));
  }
  geometry.computeBoundingBox();
  const center=geometry.boundingBox.getCenter(new THREE.Vector3());
  geometry.translate(-center.x,-center.y,-center.z);
  const node=new THREE.Group(),tire=new THREE.Mesh(geometry,source.material);
  ownResources(tire,geometry);
  tire.castShadow=source.castShadow;tire.receiveShadow=source.receiveShadow;
  node.position.copy(center);node.add(tire);visual.add(node);nodes.push(node);
 }
 source.removeFromParent();original.dispose();return nodes;
}

export class WheelRig {
 constructor(model,carId){
  this.model=model;this.carId=carId;this.wheels=[];this.lastAngle=0;
  const visual=model.userData.redlineVisual;
  let nodes=carId==='amg'?splitAmgTires(model):WHEELS[carId]?.map(name=>model.getObjectByName(name))||[];
  if(carId==='ccxr'){
   // The imported CCXR tire groups share a distant parent origin. Give each
   // group a pivot at its actual axle, preserving its world transform.
   visual.updateMatrixWorld(true);
   nodes=nodes.map(node=>{
    const center=new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
    const pivot=new THREE.Group();pivot.position.copy(visual.worldToLocal(center.clone()));visual.add(pivot);pivot.attach(node);return pivot;
   });
  }
  model.updateMatrixWorld(true);
  const modelQ=model.getWorldQuaternion(new THREE.Quaternion()).invert();
  nodes.forEach((node,i)=>{
   if(!node)return;
   const world=model.worldToLocal(node.getWorldPosition(new THREE.Vector3()));
   const localQ=modelQ.clone().multiply(node.getWorldQuaternion(new THREE.Quaternion())).invert();
   const parentQ=modelQ.clone().multiply(node.parent.getWorldQuaternion(new THREE.Quaternion())).invert();
   const axisSpin=AXLE.clone().applyQuaternion(localQ).normalize();
   const axisSteer=UP.clone().applyQuaternion(localQ).normalize();
   const axisLift=UP.clone().applyQuaternion(parentQ).normalize();
   this.wheels.push({node,front:world.z<0,x:world.x,z:world.z,y:world.y,
    radius:carId==='bentley'?.37:carId==='ccxr'&&i>=2?.38:.35,
    axisSpin,axisSteer,axisLift,baseQ:node.quaternion.clone(),basePos:node.position.clone(),travel:0});
  });
 }
 animate(state,track,carRoot,dt){
  if(!this.wheels.length)return;
  const angle=state.wheelAngle||0,steer=state.steer||0;
  // Contact locations use the vehicle's matrix, not its wheel descendants.
  // Updating a detailed car hierarchy once per wheel repeated hundreds of
  // unrelated mesh/bone updates for every nearby vehicle on every frame.
  if(track){carRoot.updateWorldMatrix(true,false);this.model.updateWorldMatrix(false,false);}
  // Derive the four world contact locations from the authored wheel pivots.
  // Their original Y can differ slightly between front and rear tires.
  for(const wheel of this.wheels){
   const node=wheel.node;
   const spin=new THREE.Quaternion().setFromAxisAngle(wheel.axisSpin,angle*(.35/wheel.radius));
   const turn=new THREE.Quaternion().setFromAxisAngle(wheel.axisSteer,wheel.front?-steer*.35:0);
   node.quaternion.copy(wheel.baseQ).multiply(turn).multiply(spin);
   node.position.copy(wheel.basePos);
   if(track){
    const baseWorld=new THREE.Vector3(wheel.x,0,wheel.z).applyMatrix4(carRoot.matrixWorld);
    const hit=track.surface(baseWorld.x,baseWorld.z,state.y,false,true);
    const centerNow=new THREE.Vector3(wheel.x,wheel.y,wheel.z).applyMatrix4(this.model.matrixWorld);
    const desired=hit?hit.y+wheel.radius:baseWorld.y+wheel.radius;
    const delta=THREE.MathUtils.clamp(desired-centerNow.y,-.18,.18);
    wheel.travel+=(delta-wheel.travel)*(1-Math.exp(-18*dt));
    node.position.copy(wheel.basePos).addScaledVector(wheel.axisLift,wheel.travel);
   }
  }
  this.lastAngle=angle;
 }
}
