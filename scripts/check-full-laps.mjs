import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadGeometry} from './geometry-audit.mjs';
import {MAPS,CARS} from '../src/assets/catalog.js';
import {classifyDriveableMeshes,findTrackSpawn} from '../src/engine/road.js';
import {TrackWorld} from '../src/engine/TrackWorld.js';
import {LAP_CHECKPOINTS} from '../src/assets/lapCheckpoints.js';
import {RacingLine} from '../src/shared/RacingLine.js';
import {RaceDriver} from '../src/shared/RaceDriver.js';
import {LapTracker} from '../src/shared/LapTracker.js';
import {RACING_LINES} from '../src/assets/racingLines.js';

const report=JSON.parse(fs.readFileSync('road-network.json','utf8'));
const racingLines={};
const auditCar=CARS.find(car=>car.id===process.env.REDLINE_DRIVER_CAR)||CARS[0];
const auditLaps=Math.max(1,Math.min(10,Math.trunc(Number(process.env.REDLINE_DRIVER_LAPS)||1)));
const step=1.5,directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
class Heap{
 constructor(){this.items=[];}
 push(item){const a=this.items;let i=a.length;a.push(item);while(i){const p=(i-1)>>1;if(a[p][0]<=item[0])break;a[i]=a[p];i=p;}a[i]=item;}
 pop(){const a=this.items,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1][0]<a[child][0])child++;if(a[child][0]>=last[0])break;a[i]=a[child];i=child;}a[i]=last;}return top;}
 get length(){return this.items.length;}
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const nearest=(points,target)=>points.reduce((best,p,i)=>{
 const d=distance(p,target);return d<best.distance?{index:i,distance:d}:best;
},{index:-1,distance:Infinity});
function lengthOf(points){return points.slice(1).reduce((sum,p,i)=>sum+distance(p,points[i]),0);}
function extractCircuit(path,points,landmarks){
 const stack=[],positions=new Map(),cycles=[];
 for(const id of path){
  if(positions.has(id)){
   const start=positions.get(id),cycle=[...stack.slice(start),id];
   if(cycle.length>10)cycles.push(cycle);
   for(const removed of stack.slice(start+1))positions.delete(removed);
   stack.length=start+1;
  }else{positions.set(id,stack.length);stack.push(id);}
 }
 const candidates=cycles.filter(ids=>landmarks.every(point=>nearest(ids.map(id=>points[id]),point).distance<35));
 candidates.sort((a,b)=>lengthOf(b.map(id=>points[id]))-lengthOf(a.map(id=>points[id])));
 assert.ok(candidates.length,'No continuous circuit reaches every checkpoint without retracing a spur');
 return candidates[0];
}
function smoothCircuit(points,world,spawn){
 const start=nearest(points,[spawn.x,spawn.y,spawn.z]).index;
 const unique=points.slice(0,-1),rotated=[...unique.slice(start),...unique.slice(0,start)];rotated.push(rotated[0]);
 let line=new RacingLine(rotated),sampled=[];
 const count=Math.ceil(line.length/4);
 for(let i=0;i<count;i++){const p=line.sample(i*line.length/count);sampled.push([p.x,p.y,p.z]);}
 const pose=(p,heading)=>({x:p[0],y:p[1],z:p[2],heading});
 // Shortest grid paths naturally hug inside kerbs. Move them to the middle of
 // each supported cross-section so a physically steering car has recovery room.
 sampled=sampled.map((current,i)=>{
  const before=sampled[(i+sampled.length-1)%sampled.length],after=sampled[(i+1)%sampled.length];
  const heading=Math.atan2(-(after[0]-before[0]),-(after[2]-before[2]));
  const at=offset=>{
   const p=[current[0]+Math.cos(heading)*offset,current[1],current[2]-Math.sin(heading)*offset];
   const floor=world.surface(p[0],p[2],p[1]);if(!floor)return null;p[1]=floor.y+.08;
   return world.support(pose(p,heading),1.4,1.65)&&!world.blocked(pose(p,heading),1.52,2.25)?p:null;
  };
  const offsets=[];
  for(let offset=-7;offset<=7;offset+=.5)if(at(offset))offsets.push(offset);
  if(!offsets.length)return current;
  // Stay in the continuous strip nearest the authored route at split roads.
  let seed=offsets.reduce((best,value)=>Math.abs(value)<Math.abs(best)?value:best),left=seed,right=seed;
  while(offsets.includes(left-.5))left-=.5;while(offsets.includes(right+.5))right+=.5;
  return at((left+right)/2)||current;
 });
 for(let pass=0;pass<16;pass++){
  const next=sampled.map(p=>[...p]);
  for(let i=0;i<sampled.length;i++){
   const before=sampled[(i+sampled.length-1)%sampled.length],current=sampled[i],after=sampled[(i+1)%sampled.length];
   const proposed=[(before[0]+current[0]*2+after[0])/4,current[1],(before[2]+current[2]*2+after[2])/4];
   const floor=world.surface(proposed[0],proposed[2],proposed[1]);if(!floor)continue;proposed[1]=floor.y+.08;
   const heading=Math.atan2(-(after[0]-before[0]),-(after[2]-before[2]));
   if(!world.support(pose(proposed,heading),1.4,1.65)||world.blocked(pose(proposed,heading),1.52,2.25))continue;
   const incoming=Math.atan2(-(proposed[0]-before[0]),-(proposed[2]-before[2]));
   const outgoing=Math.atan2(-(after[0]-proposed[0]),-(after[2]-proposed[2]));
   if(world.move(pose(before,incoming),pose(proposed,heading),{keepOnRoad:true,width:1.4,length:1.65}).blocked)continue;
   if(world.move(pose(proposed,heading),pose(after,outgoing),{keepOnRoad:true,width:1.4,length:1.65}).blocked)continue;
   next[i]=proposed;
  }
  sampled=next;
 }
 sampled.push(sampled[0]);
 return sampled.map(p=>p.map(value=>Math.round(value*1000)/1000));
}
function routeMetadata(points,map){
 const line=new RacingLine(points),spawn=line.sample(0);
 const ahead=line.sample(5),behind=line.sample(-5);spawn.heading=Math.atan2(-(ahead.x-behind.x),-(ahead.z-behind.z));
 const ordered=LAP_CHECKPOINTS[map.id].map((point,index)=>({index,...line.project({x:point[0],y:point[1],z:point[2]})})).sort((a,b)=>a.distance-b.distance);
 return {spawn,checkpointOrder:ordered.map(p=>p.index),checkpoints:ordered.map(p=>({x:p.x,y:p.y,z:p.z,distance:p.distance})),points};
}
function route(points,grid,world,start,goal,edgeCache){
 const costs=new Float64Array(points.length);costs.fill(Infinity);
 const previous=new Int32Array(points.length);previous.fill(-1);
 const heap=new Heap();costs[start]=0;heap.push([distance(points[start],points[goal]),start]);
 let expanded=0;
 while(heap.length){
  const [priority,id]=heap.pop(),from=points[id];
  if(priority>costs[id]+distance(from,points[goal])+1e-6)continue;
  if(id===goal){const path=[];for(let n=id;n>=0;n=previous[n])path.push(n);return {path:path.reverse(),expanded};}
  expanded++;
  const ix=Math.round(from[0]/step),iz=Math.round(from[2]/step);
  for(const [dx,dz] of directions){
   for(const next of grid.get(`${ix+dx},${iz+dz}`)||[]){
    const to=points[next];if(Math.abs(to[1]-from[1])>1.5)continue;
    const edge=id<next?`${id},${next}`:`${next},${id}`;
    let clear=edgeCache.get(edge);
    if(clear===undefined){
     const heading=Math.atan2(-dx,-dz);
     clear=!world.move({x:from[0],y:from[1],z:from[2],heading},
      {x:to[0],y:to[1],z:to[2],heading},{keepOnRoad:true,width:1.4,length:1.65}).blocked;
     edgeCache.set(edge,clear);
    }
    if(!clear)continue;
    const cost=costs[id]+distance(from,to);
    if(cost>=costs[next])continue;
    costs[next]=cost;previous[next]=id;heap.push([cost+distance(to,points[goal]),next]);
   }
  }
 }
 throw new Error(`No car-width route from ${start} to ${goal}`);
}
for(const map of MAPS.filter(m=>!process.env.REDLINE_LAP_MAP||m.id===process.env.REDLINE_LAP_MAP)){
 const data=report.find(r=>r.map===map.id);
 assert.ok(data,`${map.name}: missing road network report`);
 const points=data.components[0].points;
 const grid=new Map();for(let i=0;i<points.length;i++){
  const p=points[i],key=`${Math.round(p[0]/step)},${Math.round(p[2]/step)}`;
  if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);
 }
 const {meshes,bounds}=await loadGeometry('../Car Racing/'+map.file,map.span);
 const roads=classifyDriveableMeshes(meshes,map.id).driveable,world=new TrackWorld(meshes,roads);
 const spawn=findTrackSpawn({roadMeshes:roads,allMeshes:meshes,bounds,
  surfaceHit:(x,z,y,_meshes,wide)=>world.surface(x,z,y,wide),
  canSpawn:p=>!world.blocked(p,1.5,2.5)&&!!world.support(p,1.4,1.7)});
 assert.ok(spawn,`${map.name}: no car-width spawn`);
 const start=nearest(points,[spawn.x,spawn.y,spawn.z]);
 assert.ok(start.distance<8,`${map.name}: spawn is disconnected from the main road`);
 const goals=LAP_CHECKPOINTS[map.id].map(p=>nearest(points,p).index);
 // Nearest-neighbour ordering avoids needless zigzags; the game accepts either direction.
 const ordered=[],remaining=[...goals];let cursor=start.index;
 while(remaining.length){remaining.sort((a,b)=>distance(points[cursor],points[a])-distance(points[cursor],points[b]));cursor=remaining.shift();ordered.push(cursor);}
 const forward=p=>-Math.sin(spawn.heading)*(p[0]-spawn.x)-Math.cos(spawn.heading)*(p[2]-spawn.z);
 const side=p=>Math.cos(spawn.heading)*(p[0]-spawn.x)-Math.sin(spawn.heading)*(p[2]-spawn.z);
 const behind=points.reduce((best,p,i)=>{
  const along=forward(p),across=Math.abs(side(p)),d=Math.abs(along+6)+across;
  return along< -2&&along> -12&&across<4&&Math.abs(p[1]-spawn.y)<1.5&&d<best.distance?{index:i,distance:d}:best;
 },{index:-1,distance:Infinity});
 const ahead=points.reduce((best,p,i)=>{
  const along=forward(p),across=Math.abs(side(p)),d=Math.abs(along-6)+across;
  return along>2&&along<12&&across<4&&Math.abs(p[1]-spawn.y)<1.5&&d<best.distance?{index:i,distance:d}:best;
 },{index:-1,distance:Infinity});
 assert.ok(behind.index>=0&&ahead.index>=0,`${map.name}: finish line has no drivable approach`);
 const edges=new Map(),waypoints=[start.index,...ordered,behind.index,ahead.index],journey=[];
 let expansions=0;
 for(let i=1;i<waypoints.length;i++){
  const segment=route(points,grid,world,waypoints[i-1],waypoints[i],edges);
  expansions+=segment.expanded;journey.push(...(i===1?segment.path:segment.path.slice(1)));
 }
 let canonical;
 if(process.argv.includes('--write-lines')){
  const beforeFinish=journey.slice(0,journey.lastIndexOf(behind.index)+1);
  const closing=route(points,grid,world,behind.index,start.index,edges).path.slice(1);
  const closed=extractCircuit([...beforeFinish,...closing],points,LAP_CHECKPOINTS[map.id]),simplified=[closed[0]];
  let cursor=0;
  while(cursor<closed.length-1){
   let next=Math.min(cursor+5,closed.length-1);
   for(;next>cursor+1;next--){
    const a=points[closed[cursor]],b=points[closed[next]];
    if(distance(a,b)>8)continue;
    const heading=Math.atan2(-(b[0]-a[0]),-(b[2]-a[2]));
    if(!world.move({x:a[0],y:a[1],z:a[2],heading},{x:b[0],y:b[1],z:b[2],heading},{keepOnRoad:true,width:1.4,length:1.65}).blocked)break;
   }
   simplified.push(closed[next]);cursor=next;
  }
  canonical=smoothCircuit(simplified.map(id=>points[id]),world,spawn);
  racingLines[map.id]=routeMetadata(canonical,map);
  console.log(`${map.name}: ${canonical.length} canonical waypoints; spawn=${JSON.stringify(racingLines[map.id].spawn)}`);
 }else canonical=RACING_LINES[map.id];
 const line=new RacingLine(canonical),driver=new RaceDriver({line,world,car:auditCar,width:Number(process.env.REDLINE_DRIVER_WIDTH||1.2),speedLimit:Number(process.env.REDLINE_DRIVER_SPEED||22),keepOnRoad:true});
 const metadata=routeMetadata(canonical,map),tracker=new LapTracker(map.id,auditCar.id,metadata.spawn,world,null,metadata),completed=[];
 let maximumStep=0,checkpoint=0,invalidFrames=0;
 const checkpointDistances=metadata.checkpoints.map(point=>point.distance);
 const maxFrames=Math.ceil(line.length/3*60*2*auditLaps);
 for(let frame=0;frame<maxFrames&&driver.distance<line.length*auditLaps+5;frame++){
  const previous={...driver.state};driver.step(1/60);
  const lap=tracker.update(previous,driver.state,1/60);if(lap)completed.push(lap);
  if(tracker.invalidLap)invalidFrames++;
  maximumStep=Math.max(maximumStep,Math.hypot(driver.state.x-previous.x,driver.state.z-previous.z));
  if(driver.distance>=checkpointDistances[checkpoint])checkpoint++;
  if(frame%6000===0&&frame)console.log(`${map.name}: driven ${(driver.distance/line.length*100).toFixed(1)}%, ${driver.elapsed.toFixed(0)}s, error ${driver.maxError.toFixed(2)}m`);
  if(driver.blockedFrames>60){
   fs.writeFileSync(`race-route-candidate-${map.id}.json`,JSON.stringify(canonical));
   console.error('ACTUAL DRIVING BLOCKER',JSON.stringify({map:map.id,progress:driver.distance,maxError:driver.maxError,projection:line.project(driver.state),pose:driver.state,reason:driver.lastContact.reason,obstacle:world.lastObstacle,controls:driver.controls()}));
   break;
  }
 }
 assert.ok(driver.distance>=line.length*auditLaps,`${map.name}: actual vehicle physics stopped at ${driver.distance.toFixed(1)}/${(line.length*auditLaps).toFixed(1)}m (${driver.lastContact?.reason||'controller'})`);
 assert.equal(checkpoint,checkpointDistances.length,`${map.name}: actual drive missed checkpoint progression`);
 assert.ok(completed.length>=auditLaps,`${map.name}: physically driven lap was not credited by LapTracker`);
 assert.equal(invalidFrames,0,`${map.name}: ordinary steering incorrectly invalidated the lap`);
 assert.ok(maximumStep<1,`${map.name}: physics audit contains a position jump`);
 console.log(`${map.name}: ${auditCar.name} PHYSICALLY DRIVEN ${completed.length} lap(s) ${completed.map(lap=>lap.time.toFixed(1)+'s').join(', ')} credited, ${line.length.toFixed(1)}m circuit, max error ${driver.maxError.toFixed(2)}m, blocked frames ${driver.blockedTotal}, max movement ${maximumStep.toFixed(3)}m`);
}
if(process.argv.includes('--write-lines')){
 const existing=await import('../src/assets/racingLines.js');
 const routes={...(existing.RACING_ROUTES||{}),...racingLines};
 fs.writeFileSync('src/assets/racingLines.js',`// Canonical circuits generated by scripts/check-full-laps.mjs --write-lines and validated using vehicleStep + TrackWorld.move.\nexport const RACING_ROUTES=${JSON.stringify(routes)};\nexport const RACING_LINES=Object.fromEntries(Object.entries(RACING_ROUTES).map(([id,route])=>[id,route.points]));\n`);
}
