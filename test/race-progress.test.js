import test from 'node:test';
import assert from 'node:assert/strict';
import {RacingLine} from '../src/shared/RacingLine.js';
import {RaceProgress} from '../src/shared/RaceProgress.js';

const line=new RacingLine([[0,0,0],[0,0,-100],[100,0,-100],[100,0,0],[0,0,0]]);
test('reversing from the start produces negative progress instead of a near-complete lap',()=>{
 const progress=new RaceProgress(line);
 for(let distance=-1;distance>=-10;distance--)progress.update(line.sample(distance),1);
 assert.ok(Math.abs(progress.distance+10)<1e-6);assert.equal(progress.validForwardDistance,0);assert.equal(progress.valid,true);
});
test('continuous forward route progress remains unwrapped across multiple laps',()=>{
 const progress=new RaceProgress(line);
 for(let distance=2;distance<=line.length*2+10;distance+=2)progress.update(line.sample(distance),2);
 assert.ok(Math.abs(progress.distance-810)<1e-6);assert.equal(progress.valid,true);
 for(let distance=808;distance>=800;distance-=2)progress.update(line.sample(distance),2);
 assert.ok(Math.abs(progress.distance-800)<1e-6);
});
test('teleports and off-road shortcuts cannot manufacture race progress',()=>{
 const progress=new RaceProgress(line);
 progress.update(line.sample(100),1);assert.equal(progress.distance,0);assert.equal(progress.valid,false);
 progress.reset();progress.update({x:30,y:0,z:-30},1);assert.equal(progress.distance,0);assert.equal(progress.onRoute,false);
 progress.update(line.sample(150),1);assert.equal(progress.distance,0);
});
test('nearby parallel road branches cannot replace the hinted route section',()=>{
 const hairpin=new RacingLine([[0,0,0],[0,0,-100],[5,0,-100],[5,0,0],[0,0,0]]);
 const progress=new RaceProgress(hairpin);progress.reset(hairpin.sample(20),20);
 progress.update({x:5,y:0,z:-21},6);
 assert.ok(progress.distance<30,'Projection must remain on the outbound branch');
});
test('a real Woods corner projection switch preserves validity without awarding a jump',()=>{
 // Local section of the corner where physically driven closest-point projection
 // advances about .59m even though the vehicle moves only .17m.
 const corner=new RacingLine([[0,0,0],[-3.972,-.039,.516],[-7.929,-.058,1.186],[-10.204,-.099,4.443],[-10.744,-.114,8.369],[0,0,15],[0,0,0]]);
 const current={x:-8.0878,y:-.0609,z:1.4133,heading:2.531877};
 const previous={...current,x:current.x+Math.sin(current.heading)*.17,z:current.z+Math.cos(current.heading)*.17};
 const progress=new RaceProgress(corner),start=7.703164727;
 progress.reset(previous,start);const projected=corner.project(current,{hint:start,window:40}).distance;
 assert.ok(projected-start>.5);
 progress.update(current,.17456);assert.equal(progress.valid,true);assert.ok(progress.distance>start&&progress.distance<projected);
 progress.update(current,.1);assert.ok(Math.abs(progress.distance-projected)<1e-6);
});
