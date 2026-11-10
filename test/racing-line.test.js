import test from 'node:test';
import assert from 'node:assert/strict';
import {RacingLine} from '../src/shared/RacingLine.js';
import {RACING_LINES,RACING_ROUTES} from '../src/assets/racingLines.js';
import {MAPS} from '../src/assets/catalog.js';

test('each remaining map has a closed AI route with sensible lap distance',()=>{
 for(const map of MAPS){
  const line=new RacingLine(RACING_LINES[map.id]);
  assert.ok(line.length>2000,`${map.name} route is too short to follow the circuit`);
  const start=line.sample(0),end=line.sample(line.length);
  assert.ok(Math.hypot(start.x-end.x,start.z-end.z)<.01);
  assert.ok(Math.abs(line.nearestDistance(start))<1);
  for(const d of [-15,10,line.length*.35,line.length-2]){
   const p=line.sample(d);
   assert.ok([p.x,p.y,p.z,p.heading].every(Number.isFinite));
  }
 }
});

test('canonical circuits have no retraced spurs, reverse joins or unordered checkpoints',()=>{
 for(const map of MAPS){
  const route=RACING_ROUTES[map.id],line=new RacingLine(route.points),seen=new Set();
  for(const point of line.points.slice(0,-1)){
   const key=point.join(',');assert.ok(!seen.has(key),`${map.name}: a circuit node is retraced`);seen.add(key);
  }
  for(let distance=0;distance<line.length;distance+=4){
   const before=line.sample(distance-4),after=line.sample(distance+4);
   const turn=Math.abs(Math.atan2(Math.sin(after.heading-before.heading),Math.cos(after.heading-before.heading)));
   assert.ok(turn<Math.PI*.7,`${map.name}: road route contains a reverse join`);
  }
  assert.deepEqual([...route.checkpointOrder].sort(),[0,1,2,3]);
  assert.ok(route.checkpoints.every((checkpoint,index)=>checkpoint.distance>=0&&(!index||checkpoint.distance>route.checkpoints[index-1].distance)));
  assert.ok(line.project(route.spawn).error<.01);
 }
});

test('route projection unwraps the finish line and uses progress hints at close parallel roads',()=>{
 const line=new RacingLine([[0,0,0],[0,0,-100],[3,0,-100],[3,0,0],[0,0,0]]);
 const nearStart=line.sample(2),crossed=line.project(nearStart,{hint:line.length-1,window:10});
 assert.ok(Math.abs(crossed.distance-(line.length+2))<1e-6);
 const firstLane=line.project({x:2.8,y:0,z:-50},{hint:50,window:10});
 assert.equal(firstLane.distance,50);
 assert.ok(Math.abs(firstLane.error-2.8)<1e-6);
 const backwards=line.project(line.sample(line.length-2),{hint:1,window:10});
 assert.ok(Math.abs(backwards.distance+2)<1e-6);
});
