import {RacingLine} from './RacingLine.js';

const separation=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Signed, continuous progress on a closed route; reversing across zero stays negative. */
export class RaceProgress {
 constructor(route,{maxError=12,window=40}={}){
  this.line=route instanceof RacingLine?route:new RacingLine(Array.isArray(route)?route:route.points);
  this.maxError=maxError;this.window=window;this.reset();
 }
 reset(pose=this.line.sample(0),distance=0){
  this.distance=distance;this.validForwardDistance=0;this.valid=true;this.onRoute=true;this.error=0;
  this.lastPose={...pose};this.projection=this.line.project(pose,{hint:distance,window:this.window});
  if(this.projection.error>this.maxError){this.valid=false;this.onRoute=false;this.error=this.projection.error;}
 }
 update(pose,travelBudget){
  if(!pose||!['x','z'].every(key=>Number.isFinite(pose[key])))return this.distance;
  const moved=separation(this.lastPose,pose);
  const budget=Number.isFinite(travelBudget)?Math.max(0,travelBudget):Math.min(moved,12);
  const projection=this.line.project(pose,{hint:this.distance,window:this.window+budget});
  this.projection=projection;this.error=projection.error;this.onRoute=projection.error<=this.maxError;
  const delta=projection.distance-this.distance;
  // Projection can fall back to another branch; never credit that jump or a respawn.
  const allowance=Math.max(.4,budget*1.5+.15);
  // A closest point can switch between adjoining corner segments even though
  // the car moved only centimetres. Retain validity locally, but bound credit.
  const localCorner=Math.abs(delta)<=Math.max(1.5,allowance*2)&&projection.error<=2;
  const continuous=moved<=Math.max(.6,budget*1.8+.2)&&(Math.abs(delta)<=allowance||localCorner)&&Math.abs(delta)<=this.window+budget;
  if(this.onRoute&&continuous){const credit=Math.max(-allowance,Math.min(allowance,delta));this.distance+=credit;this.validForwardDistance+=Math.max(0,credit);}
  else this.valid=false;
  this.lastPose={...pose};return this.distance;
 }
}
