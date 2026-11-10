import test from 'node:test';
import assert from 'node:assert/strict';
import { createVehicleState,vehicleStep,sanitizeControls } from '../src/shared/physics.js';
test('accelerator moves the vehicle forward along -Z',()=>{
 let v=createVehicleState(); for(let i=0;i<120;i++)vehicleStep(v,{throttle:1},{topSpeed:300},1/60);
 assert.ok(v.speed>1); assert.ok(v.z<0); assert.equal(v.x,0);
});
test('braking slows the vehicle',()=>{
 let v={...createVehicleState(),speed:30};vehicleStep(v,{brake:1},undefined,1/30);assert.ok(v.speed<30);
});
test('nitro uses a finite energy budget',()=>{
 let v={...createVehicleState(),speed:20,nitro:10};for(let i=0;i<90;i++)vehicleStep(v,{nitro:true,throttle:1},undefined,1/60);
 assert.ok(v.nitro>=0); assert.ok(v.nitro<10);
});
test('control values are bounded',()=>{
 assert.deepEqual(sanitizeControls({steer:99,throttle:-3,brake:8,drift:1}),{steer:1,throttle:0,brake:1,drift:true,nitro:false});
});

test('right steering turns right and left steering turns left',()=>{
 for(const steer of [-1,1]){
  const v={...createVehicleState(),speed:20};
  for(let i=0;i<30;i++)vehicleStep(v,{steer,throttle:1},{},1/60);
  assert.equal(Math.sign(v.x),steer);
  assert.equal(Math.sign(v.heading),-steer);
 }
});

test('holding brake selects reverse after stopping and caps it at 25 km/h',()=>{
 const v=createVehicleState();for(let i=0;i<600;i++)vehicleStep(v,{brake:1},{},1/60);
 assert.ok(v.z>0);assert.equal(v.speed,-25/3.6);assert.ok(v.travel>0);
});
test('braking cannot change from forward to reverse in the same step',()=>{
 const v={...createVehicleState(),speed:.1};vehicleStep(v,{brake:1},{},.05);assert.equal(v.speed,0);
 for(let i=0;i<5;i++)vehicleStep(v,{brake:1},{},.05);assert.equal(v.speed,0);
});
test('throttle brakes reverse before moving forward and coasting never reverses direction',()=>{
 const v={...createVehicleState(),speed:-.1};vehicleStep(v,{throttle:1},{},.05);assert.equal(v.speed,0);
 vehicleStep(v,{throttle:1},{},.05);assert.ok(v.speed>0);
 for(const speed of [-.01,.01]){const s={...createVehicleState(),speed};vehicleStep(s,{}, {},.05);assert.equal(Math.abs(s.speed),0);}
});
test('reverse steering reverses yaw and reverse never activates nitro',()=>{
 const v={...createVehicleState(),speed:-4};vehicleStep(v,{brake:1,steer:1,nitro:true},{},1/60);
 assert.ok(v.heading>0);assert.equal(v.nitroActive,false);
});

test('releasing nitro preserves momentum and gradually returns to the normal speed cap',()=>{
 const car={topSpeed:320},cap=car.topSpeed/3.6;
 const v={...createVehicleState(),speed:cap*1.14,nitro:50};
 const boosted=v.speed;
 vehicleStep(v,{throttle:1},car,1/60);
 assert.equal(v.nitroActive,false);
 assert.ok(v.speed>cap,'boost release must not instantly remove all overspeed');
 assert.ok(v.speed<boosted&&boosted-v.speed<.2,'one frame must lose only ordinary drag');
 assert.ok(Math.abs(v.longitudinalAccel)<10);
 for(let i=0;i<600;i++){
  const before=v.speed;
  vehicleStep(v,{throttle:1},car,1/60);
  assert.ok(v.speed<=before+1e-10,'holding throttle must not sustain expired boost');
 }
 assert.ok(Math.abs(v.speed-cap)<1e-8);
});

test('brakes remain stronger than coasting when slowing from nitro overspeed',()=>{
 const car={topSpeed:320},speed=car.topSpeed/3.6*1.14;
 const coast={...createVehicleState(),speed},braked={...coast};
 vehicleStep(coast,{},car,1/60);
 vehicleStep(braked,{brake:1},car,1/60);
 assert.ok(braked.speed<coast.speed);
 assert.ok(braked.speed>car.topSpeed/3.6,'braking must also preserve a continuous speed change');
 for(let i=0;i<600;i++)vehicleStep(braked,{throttle:1,brake:1},car,1/60);
 assert.equal(braked.speed,0,'holding throttle and brake must stop without selecting reverse');
});

test('pickup acceleration stays bounded and expiration decays its overspeed smoothly',()=>{
 const car={topSpeed:320},cap=car.topSpeed/3.6;
 const v={...createVehicleState(),speed:cap*1.08-.01,pickupBoost:3};
 for(let i=0;i<120;i++){
  vehicleStep(v,{throttle:1},car,1/60);
  assert.ok(v.speed<=cap*1.08+1e-10,'a pickup alone must not exceed its own speed cap');
 }
 const boosted=v.speed;
 v.pickupBoost=1/120;
 vehicleStep(v,{throttle:1},car,1/60);
 assert.equal(v.pickupBoost,0);
 assert.ok(v.speed>cap&&v.speed<boosted&&boosted-v.speed<.2);
 for(let i=0;i<600;i++)vehicleStep(v,{throttle:1},car,1/60);
 assert.ok(Math.abs(v.speed-cap)<1e-8);
});
