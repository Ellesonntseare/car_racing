import * as THREE from 'three';
import {getGLB,buildCarModel,vehicleBounds,disposeOwnedResources} from './assets.js';
import {WheelRig} from './WheelRig.js';
import {CARS} from '../assets/catalog.js';
import {RACING_LINES} from '../assets/racingLines.js';
import {RacingLine} from '../shared/RacingLine.js';
import {RaceDriver} from '../shared/RaceDriver.js';

// Opponents steer, accelerate and brake using the same vehicle/collision steps
// as the player. Route distance measures progress; it never sets car position.
export class RacingBots {
 constructor(scene,world,mapId,makeShadow){
  this.scene=scene;this.world=world;this.line=new RacingLine(RACING_LINES[mapId]);
  this.makeShadow=makeShadow;this.bots=[];this.elapsed=0;this.active=true;
 }
 async load(playerCarId){
  const cars=CARS.filter(car=>car.id!==playerCarId).slice(0,2);
  for(const [index,car] of cars.entries()){
   const gltf=await getGLB(car.file);
   if(!this.active)return;
   const model=buildCarModel(gltf.scene,car.accent,0,car.modelHeading);
   const group=new THREE.Group();group.add(model,this.makeShadow());
   const halfWidth=Math.max(.85,Math.min(1.4,vehicleBounds(model).size.x*.48));
   const driver=new RaceDriver({line:this.line,world:this.world,car,width:halfWidth,
    startDistance:-(index+1)*10,speedLimit:22+index*1.5,keepOnRoad:false});
   const bot={car,group,wheelRig:new WheelRig(model,car.id),halfWidth,driver,
    distance:driver.distance,finishTime:null};
   this.bots.push(bot);this.scene.add(group);
   this.place(bot,0);
  }
 }
 place(bot,dt){
  const state=bot.driver.state;
  bot.group.position.set(state.x,state.y,state.z);
  bot.group.rotation.set(state.pitch||0,state.heading,state.roll||0,'YXZ');
  bot.wheelRig.animate(state,this.world,bot.group,dt);
 }
 update(dt,started){
  if(!this.active||!started)return;
  this.elapsed+=dt;
  for(const [index,bot] of this.bots.entries()){
   if(bot.finishTime!==null)continue;
   bot.driver.step(dt);bot.distance=bot.driver.distance;
   if(bot.distance>=this.line.length*3){bot.finishTime=this.elapsed;bot.driver.state.speed=0;}
   this.place(bot,dt);
  }
 }
 reset(){
  this.elapsed=0;
  for(const [index,bot] of this.bots.entries()){
   bot.driver.reset();bot.distance=bot.driver.distance;bot.finishTime=null;
   this.place(bot,0);
  }
 }
 standings(playerDistance,playerFinishTime=null){
  const entries=[{name:'YOU',distance:playerDistance,player:true,finishTime:playerFinishTime},
   ...this.bots.map(bot=>({name:bot.car.name,distance:bot.distance,finishTime:bot.finishTime}))];
  entries.sort((a,b)=>a.finishTime!==null&&b.finishTime!==null?a.finishTime-b.finishTime:b.distance-a.distance);
  return entries.map((entry,index)=>({...entry,position:index+1}));
 }
 markers(){return this.bots.map(bot=>({x:bot.group.position.x,z:bot.group.position.z}));}
 clear(){this.active=false;for(const bot of this.bots)disposeOwnedResources(bot.group);this.bots=[];}
}
