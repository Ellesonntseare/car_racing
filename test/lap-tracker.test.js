import test from 'node:test';
import assert from 'node:assert/strict';
import {LapTracker,LAP_ROUTE_VERSION} from '../src/shared/LapTracker.js';
import {RacingLine} from '../src/shared/RacingLine.js';

const points=[[0,0,0],[0,0,-100],[100,0,-100],[100,0,100],[0,0,100],[0,0,0]],line=new RacingLine(points);
const route={points,spawn:{...line.sample(0),heading:0},checkpoints:[50,200,400,550].map(distance=>({...line.sample(distance),distance}))};
const storage=()=>{const saved=new Map();return {saved,getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};};
const tracker=store=>new LapTracker('test','f40',route.spawn,null,store,route);
const pose=distance=>({...line.sample(distance),speed:20,pitch:.1,roll:.05,steer:.2,wheelAngle:distance/.35});

test('canonical checkpoints and continuous route driving produce a valid forward lap',()=>{
 const store=storage(),lap=tracker(store);let previous={...route.spawn,speed:0},result=null;
 for(let distance=2;distance<=line.length;distance+=2){const current=pose(distance);result=lap.update(previous,current,.1)||result;previous=current;}
 assert.ok(result?.best);assert.ok(result.time>=29.9&&result.time<=30.1);assert.equal(lap.raceDistance,line.length);
 const saved=JSON.parse(store.saved.get('redline_best_lap_test_f40'));
 assert.equal(saved.routeVersion,LAP_ROUTE_VERSION);assert.equal(saved.routeLength,line.length);assert.equal(saved.frames[0].length,10);
 assert.deepEqual(lap.checkpoints.map(point=>point.distance),[50,200,400,550]);
});
test('completed laps retain unwrapped race progress and reversing reduces it',()=>{
 const lap=tracker(storage());let previous={...route.spawn,speed:0},laps=0;
 for(let distance=2;distance<=line.length*2;distance+=2){const current=pose(distance);if(lap.update(previous,current,.1))laps++;previous=current;}
 assert.equal(laps,2);assert.equal(lap.raceDistance,line.length*2);
 for(let distance=line.length*2-2;distance>=line.length*2-10;distance-=2){const current={...pose(distance),speed:-20};lap.update(previous,current,.1);previous=current;}
 assert.equal(lap.raceDistance,line.length*2-10);
});
test('touching checkpoints by teleport or shortcut never awards a valid lap',()=>{
 const lap=tracker(storage());let previous={...route.spawn,speed:0},result=null;
 for(const distance of [50,200,400,550,598,602]){const current=pose(distance);result=lap.update(previous,current,.25)||result;previous=current;}
 assert.equal(result,null);assert.equal(lap.best,null);assert.ok(lap.raceDistance<line.length*.95);
});
test('incompatible old route records and malformed ghost frames are ignored',()=>{
 for(const record of [
  {time:20,frames:[[0,0,0,0,0],[20,0,0,0,0]]},
  {routeVersion:2,routeLength:line.length+50,time:20,frames:[[0,0,0,0,0],[20,0,0,0,0]]},
  {routeVersion:2,routeLength:line.length,time:20,frames:[[0,0,0,0,0],[5,'bad',0,0,0]]}
 ])assert.equal(tracker({getItem:()=>JSON.stringify(record)}).best,null);
});
test('ghost replay interpolates suspension, steering and wheel motion across heading wrap',()=>{
 const record={routeVersion:2,routeLength:line.length,time:30,frames:[
  [0,0,0,0,Math.PI-.1,.1,.2,-.5,0,20],
  [30,30,10,-10,-Math.PI+.1,.3,.4,.5,20,40]
 ]};
 const lap=tracker({getItem:()=>JSON.stringify(record)});lap.running=true;lap.elapsed=15;
 const ghost=lap.ghostPose();assert.equal(ghost.x,15);assert.equal(ghost.y,5);assert.equal(ghost.z,-5);
 assert.ok(Math.abs(ghost.heading-Math.PI)<1e-8);assert.ok(Math.abs(ghost.pitch-.2)<1e-8);assert.ok(Math.abs(ghost.roll-.3)<1e-8);
 assert.equal(ghost.steer,0);assert.equal(ghost.wheelAngle,10);assert.equal(ghost.speed,30);
});
