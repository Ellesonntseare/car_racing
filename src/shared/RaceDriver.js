import {createVehicleState,vehicleStep} from './physics.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const angle=value=>Math.atan2(Math.sin(value),Math.cos(value));

/** Road-following controller; every movement uses the player's vehicle physics. */
export class RaceDriver {
 constructor({line,world,car,width=1.1,length=1.65,startDistance=0,speedLimit=25,keepOnRoad=true}){
  this.line=line;this.world=world;this.car=car;this.width=width;this.bodyLength=length;
  this.speedLimit=speedLimit;this.keepOnRoad=keepOnRoad;this.startDistance=startDistance;
  this.reset(startDistance);
 }
 reset(distance=this.startDistance){
  const pose=this.line.sample(distance),support=this.world.support(pose,this.width,this.bodyLength,!this.keepOnRoad);
  this.state={...createVehicleState(),...pose,...support};this.distance=distance;
  this.elapsed=0;this.blockedFrames=0;this.blockedTotal=0;this.maxError=0;this.lastContact=null;
 }
 controls(){
  const state=this.state,speed=Math.abs(state.speed),lookahead=3+speed*.32;
  const target=this.line.sample(this.distance+lookahead);
  const dx=target.x-state.x,dz=target.z-state.z,distance=Math.max(1,Math.hypot(dx,dz));
  const error=angle(Math.atan2(-dx,-dz)-state.heading);
  const closest=this.line.sample(this.distance);
  const lateral=(state.x-closest.x)*Math.cos(closest.heading)-(state.z-closest.z)*Math.sin(closest.heading);
  const steering=(-Math.atan2(2*2.7*Math.sin(error),distance)-Math.atan2(2*lateral,speed+4))*(1+speed/38)/.56;
  let targetSpeed=this.speedLimit;
  for(let ahead=0;ahead<=Math.max(35,speed*2.2);ahead+=5){
   const a=this.line.sample(this.distance+ahead-4),b=this.line.sample(this.distance+ahead+4);
   const curvature=Math.abs(angle(b.heading-a.heading))/8;
   const cornerSpeed=Math.sqrt(3.8/Math.max(.002,curvature));
   targetSpeed=Math.min(targetSpeed,Math.sqrt(cornerSpeed*cornerSpeed+2*6*Math.max(0,ahead-5)));
  }
  targetSpeed=Math.max(3.2,targetSpeed*Math.max(.35,Math.cos(error)));
  const delta=targetSpeed-state.speed;
  return {steer:clamp(steering,-1,1),throttle:delta>0?clamp(delta*.45,.12,1):0,
   brake:delta<-.5?clamp(-delta*.16,0,.8):0,drift:false,nitro:false};
 }
 step(dt){
  const previous={...this.state},controls=this.controls();
  vehicleStep(this.state,controls,this.car,dt);
  const contact=this.world.move(previous,this.state,{keepOnRoad:this.keepOnRoad,width:this.width,length:this.bodyLength});
  Object.assign(this.state,{x:contact.x,y:contact.y,z:contact.z,heading:contact.heading,pitch:contact.pitch||0,roll:contact.roll||0});
  this.lastContact=contact;
  if(contact.blocked){this.blockedFrames++;this.blockedTotal++;this.state.speed=0;this.state.sideSlip=0;this.state.yawRate=0;}
  else this.blockedFrames=0;
  const projection=this.line.project(this.state,{hint:this.distance,window:Math.max(25,Math.abs(this.state.speed)*2)});
  this.distance=projection.distance;this.maxError=Math.max(this.maxError,projection.error);this.elapsed+=dt;
  return this.state;
 }
}
