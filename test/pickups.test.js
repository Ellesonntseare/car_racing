import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicleState,vehicleStep} from '../src/shared/physics.js';
import {applyNosPickup} from '../src/shared/pickups.js';

test('NOS pickup gives a bounded push, refills nitro, then boost expires',()=>{
 const car={topSpeed:300,acceleration:8,handling:8,brake:8};
 const state=createVehicleState();state.speed=18;state.nitro=70;
 applyNosPickup(state,car);
 assert.ok(state.speed>=29&&state.speed<=31);
 assert.equal(state.nitro,100);
 assert.ok(state.pickupBoost>2.9);
 for(let i=0;i<240;i++)vehicleStep(state,{throttle:1},car,1/60);
 assert.equal(state.pickupBoost,0);
 assert.ok(Number.isFinite(state.speed));
});
