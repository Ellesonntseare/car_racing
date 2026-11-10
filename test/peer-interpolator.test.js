import test from 'node:test';
import assert from 'node:assert/strict';
import {PeerInterpolator} from '../src/shared/PeerInterpolator.js';

const pose=(x,heading=0)=>({x,y:0,z:0,heading,speed:20,wheelAngle:x});
test('remote vehicles follow server timestamps despite uneven packet arrival',()=>{
 const buffer=new PeerInterpolator({delayMs:100});
 buffer.push(pose(0),1000,0);buffer.push(pose(10),1100,130);buffer.push(pose(20),1200,200);
 assert.equal(buffer.sample(250).x,15);assert.equal(buffer.sample(250).wheelAngle,15);
});
test('remote interpolation takes the short arc across heading wraparound',()=>{
 const buffer=new PeerInterpolator({delayMs:50});
 buffer.push(pose(0,Math.PI-.1),1000,0);buffer.push(pose(10,-Math.PI+.1),1100,100);
 assert.ok(Math.abs(Math.abs(buffer.sample(100).heading)-Math.PI)<1e-8);
});
test('missing packets extrapolate only a bounded distance and stale cars stop',()=>{
 const buffer=new PeerInterpolator({delayMs:0,maxExtrapolationMs:80});
 buffer.push(pose(0),1000,0);buffer.push(pose(10),1100,100);
 assert.equal(buffer.sample(200).x,14);assert.equal(buffer.sample(400).x,14);
 const stale=buffer.sample(700);assert.equal(stale.x,14);assert.equal(stale.speed,0);assert.equal(stale.stale,true);
});
test('respawns snap to the new pose rather than interpolate across the map',()=>{
 const buffer=new PeerInterpolator();buffer.push(pose(0),1000,0);buffer.push(pose(200),1100,100);
 assert.equal(buffer.sample(100).x,200);assert.equal(buffer.samples.length,1);
 assert.equal(buffer.push({...pose(1),x:NaN},1200,200),false);
 buffer.clear();assert.equal(buffer.sample(100),null);
});
