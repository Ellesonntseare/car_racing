import test from 'node:test';import assert from 'node:assert/strict';
import {FixedStepper} from '../src/shared/FixedStepper.js';
import {createVehicleState,vehicleStep} from '../src/shared/physics.js';
function run(fps){const clock=new FixedStepper(),state=createVehicleState();let tick=0;for(let frame=0;frame<fps*10;frame++)clock.advance(1/fps,dt=>{vehicleStep(state,{throttle:tick<420?1:0,brake:tick>=420?1:0,steer:tick>120&&tick<300?.6:0},{},dt);tick++;});return {tick,state};}
test('30, 60 and 144 FPS produce identical driving results',()=>{const baseline=run(60);assert.equal(baseline.tick,600);for(const fps of [30,144])assert.deepEqual(run(fps),baseline);});
test('a long stall has bounded catch-up and does not leave a simulation backlog',()=>{const clock=new FixedStepper();let ticks=0;clock.advance(10,()=>ticks++);assert.equal(ticks,8);clock.advance(1/60,()=>ticks++);assert.equal(ticks,9);});
test('render interpolation remains bounded on uneven frames',()=>{const clock=new FixedStepper();for(const elapsed of [0,.004,.014,.05,.001,.1,NaN,-1]){const alpha=clock.advance(elapsed,()=>{});assert.ok(alpha>=0&&alpha<=1);}});
test('steering ramps up and recenters instead of snapping',()=>{const s={...createVehicleState(),speed:20};vehicleStep(s,{steer:1},{},1/60);assert.ok(s.steer>0&&s.steer<.2);for(let i=0;i<60;i++)vehicleStep(s,{}, {},1/60);assert.ok(Math.abs(s.steer)<.001);assert.ok(Math.abs(s.yawRate)<.005);});
test('high-speed cornering stays within the grip limit',()=>{const s={...createVehicleState(),speed:60};for(let i=0;i<120;i++)vehicleStep(s,{steer:1,throttle:1},{handling:8},1/60);assert.ok(Math.abs(s.yawRate)*s.speed<15);});
test('handbrake sheds speed and drift slip decays on release',()=>{const s={...createVehicleState(),speed:30};for(let i=0;i<60;i++)vehicleStep(s,{steer:1,drift:true},{},1/60);assert.ok(s.speed<30);assert.ok(s.drifting);const slip=Math.abs(s.sideSlip);for(let i=0;i<60;i++)vehicleStep(s,{}, {},1/60);assert.ok(Math.abs(s.sideSlip)<slip*.01);});
test('boost release preserves the same gradual momentum loss at 30, 60 and 144 FPS',()=>{
 const cap=320/3.6;
 const runBoost=fps=>{
  const clock=new FixedStepper(),state={...createVehicleState(),speed:cap*1.14,nitro:100};let tick=0,maxLoss=0;
  for(let frame=0;frame<fps*2;frame++)clock.advance(1/fps,dt=>{
   const before=state.speed;
   vehicleStep(state,{throttle:1,nitro:tick<60},{topSpeed:320},dt);
   maxLoss=Math.max(maxLoss,before-state.speed);tick++;
  });
  return {tick,state,maxLoss};
 };
 const baseline=runBoost(60);
 assert.equal(baseline.tick,120);
 assert.ok(baseline.state.speed>cap&&baseline.state.speed<cap*1.14);
 assert.ok(baseline.maxLoss<.2);
 for(const fps of [30,144])assert.deepEqual(runBoost(fps),baseline);
});
