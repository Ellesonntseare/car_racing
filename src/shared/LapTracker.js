import {LAP_CHECKPOINTS} from '../assets/lapCheckpoints.js';
import * as routeAssets from '../assets/racingLines.js';
import {RacingLine} from './RacingLine.js';
import {RaceProgress} from './RaceProgress.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const numeric=value=>Number.isFinite(value)?value:0;
export const LAP_ROUTE_VERSION=2;
export const lapTime=seconds=>Number.isFinite(seconds)?`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toFixed(2).padStart(5,'0')}`:'--:--.--';

function canonicalRoute(mapId,spawn){
 const route=routeAssets.RACING_ROUTES?.[mapId];if(route)return route;
 const points=routeAssets.RACING_LINES?.[mapId];
 if(!points)throw new Error(`No canonical race route is available for ${mapId}`);
 const line=new RacingLine(points);
 // Compatibility for route files generated before metadata was introduced.
 const checkpoints=(LAP_CHECKPOINTS[mapId]||[]).map(point=>line.project({x:point[0],y:point[1],z:point[2]})).sort((a,b)=>a.distance-b.distance);
 return {points,spawn,checkpoints};
}
function validBest(saved,line){
 if(saved?.routeVersion!==LAP_ROUTE_VERSION||!Number.isFinite(saved.time)||saved.time<=0||!Number.isFinite(saved.routeLength)||Math.abs(saved.routeLength-line.length)>1||!Array.isArray(saved.frames)||saved.frames.length<2||saved.frames.length>9000)return false;
 let previous=-1;
 return saved.frames.every(frame=>{
  if(!Array.isArray(frame)||frame.length<5||!frame.every(Number.isFinite)||frame[0]<previous||frame[0]<0||frame[0]>saved.time+.1)return false;
  previous=frame[0];return true;
 });
}

export class LapTracker {
 constructor(mapId,carId,spawn,_world,storage=globalThis.localStorage,route=canonicalRoute(mapId,spawn)){
  this.mapId=mapId;this.carId=carId;this.storage=storage;this.line=new RacingLine(route.points);
  this.spawn={...(route.spawn||spawn)};
  this.checkpoints=(route.checkpoints||[]).map(point=>({...point})).sort((a,b)=>a.distance-b.distance);
  this.progress=new RaceProgress(this.line);this.routeProgress=this.progress;
  this.radius=Math.max(12,Math.min(24,this.line.length*.005));this.minTravel=this.line.length*.95;
  this.key=`redline_best_lap_${mapId}_${carId}`;this.best=null;
  try{const saved=JSON.parse(storage?.getItem(this.key)||'null');if(validBest(saved,this.line))this.best=saved;}catch{}
  this.reset();
 }
 get raceDistance(){return this.progress.distance;}
 reset(){
  this.lapStartDistance=0;this.progress.reset(this.spawn);this.resetLap();this.lastLap=null;
 }
 resetLap(current=null){
  this.elapsed=0;this.travel=0;this.visited=0;this.nextCheckpoint=0;this.running=!!current;this.frames=[];this.sampleClock=0;this.invalidLap=false;
  this.progress.validForwardDistance=0;this.progress.valid=true;
  if(current)this.frames.push(this.frame(current));
 }
 update(previous,current,dt){
  dt=Math.max(0,Math.min(.25,numeric(dt)));
  const speed=Math.max(Math.abs(numeric(previous.speed)),Math.abs(numeric(current.speed)))+Math.abs(numeric(current.sideSlip));
  this.progress.update(current,Math.max(.1,speed*dt+.08));
  this.invalidLap=!this.progress.valid;
  if(!this.running){if(Math.abs(current.speed)<2)return null;this.running=true;this.frames.push(this.frame(previous));}
  this.elapsed+=dt;this.travel+=distance(previous,current);this.sampleClock+=dt;
  const next=this.checkpoints[this.nextCheckpoint];
  if(next&&this.progress.onRoute&&distance(current,next)<this.radius&&Math.abs(current.y-next.y)<6&&Math.abs(this.raceDistance-(this.lapStartDistance+next.distance))<this.radius*1.5){this.visited|=1<<this.nextCheckpoint;this.nextCheckpoint++;}
  if(this.sampleClock>=.1){this.sampleClock=0;this.frames.push(this.frame(current));}
  const h=this.spawn.heading,forward=p=>-Math.sin(h)*(p.x-this.spawn.x)-Math.cos(h)*(p.z-this.spawn.z);
  const side=p=>Math.cos(h)*(p.x-this.spawn.x)-Math.sin(h)*(p.z-this.spawn.z);
  const crossed=forward(previous)<0&&forward(current)>=0&&Math.abs(side(current))<this.radius&&Math.abs(current.y-this.spawn.y)<6;
  if(!crossed||this.elapsed<15)return null;
  const complete=this.nextCheckpoint===this.checkpoints.length&&this.progress.valid&&this.raceDistance-this.lapStartDistance>=this.minTravel&&this.progress.validForwardDistance>=this.minTravel;
  if(!complete){
   // Starting another attempt never turns a shortcut into a credited lap.
   if(this.travel>this.line.length*.2){this.progress.reset(current,this.lapStartDistance);this.resetLap(current);}
   return null;
  }
  this.frames.push(this.frame(current));const time=this.elapsed,best=!this.best||time<this.best.time;
  if(best){this.best={routeVersion:LAP_ROUTE_VERSION,routeLength:this.line.length,time,frames:this.frames.slice(0,9000)};try{this.storage?.setItem(this.key,JSON.stringify(this.best));}catch{}}
  this.lapStartDistance+=this.line.length;this.resetLap(current);this.lastLap=time;
  return {time,best};
 }
 frame(p){return [Math.round(this.elapsed*100)/100,...['x','y','z'].map(key=>+numeric(p[key]).toFixed(2)),...['heading','pitch','roll','steer','wheelAngle','speed'].map(key=>+numeric(p[key]).toFixed(4))];}
 ghostPose(){
  const frames=this.best?.frames;if(!frames?.length||!this.running)return null;
  const t=this.elapsed;if(t>this.best.time)return null;
  let low=0,high=frames.length-1;
  while(low<high){const mid=(low+high)>>1;if(frames[mid][0]<t)low=mid+1;else high=mid;}
  const b=frames[low],a=frames[Math.max(0,low-1)],f=a===b||b[0]===a[0]?0:Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));
  const interpolate=index=>numeric(a[index])+(numeric(b[index])-numeric(a[index]))*f;
  return {x:interpolate(1),y:interpolate(2),z:interpolate(3),heading:a[4]+angle(a[4],b[4])*f,pitch:interpolate(5),roll:interpolate(6),steer:interpolate(7),wheelAngle:interpolate(8),speed:interpolate(9)};
 }
}
