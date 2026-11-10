import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSteeringAxis} from '../src/shared/controls.js';

test('controller center noise is neutral and steering begins continuously at the deadzone',()=>{
 for(const axis of [-.16,-.1,0,.1,.16])assert.equal(normalizeSteeringAxis(axis),0);
 assert.ok(normalizeSteeringAxis(.160001)>0&&normalizeSteeringAxis(.160001)<.00001);
 assert.ok(normalizeSteeringAxis(-.160001)<0&&normalizeSteeringAxis(-.160001)>-.00001);
});

test('the usable stick range gives symmetric proportional steering and reaches full lock',()=>{
 assert.ok(Math.abs(normalizeSteeringAxis(.58)-.5)<1e-10);
 assert.ok(Math.abs(normalizeSteeringAxis(-.58)+.5)<1e-10);
 assert.equal(normalizeSteeringAxis(1),1);assert.equal(normalizeSteeringAxis(-1),-1);
 let prior=0;
 for(let i=0;i<=100;i++){
  const steer=normalizeSteeringAxis(i/100);
  assert.ok(steer>=prior&&steer<=1);prior=steer;
 }
});

test('invalid controller axes are neutral and out-of-range values stay bounded',()=>{
 for(const value of [NaN,Infinity,-Infinity,undefined,null,'1'])assert.equal(normalizeSteeringAxis(value),0);
 assert.equal(normalizeSteeringAxis(3),1);assert.equal(normalizeSteeringAxis(-3),-1);
 assert.equal(normalizeSteeringAxis(.2,.2),0);
 assert.ok(Math.abs(normalizeSteeringAxis(.6,.2)-.5)<1e-10);
 assert.equal(normalizeSteeringAxis(.3,0),.3);
});
