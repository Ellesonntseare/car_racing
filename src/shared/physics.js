/** Compact deterministic arcade physics. Coordinates: forward -Z; heading=0 faces -Z. */
export function createVehicleState() {
  return {x:0,y:0,z:0,heading:0,speed:0,sideSlip:0,nitro:100,nitroActive:false,pickupBoost:0,drifting:false,travel:0,gear:1,rpm:850,shiftLeft:0,wheelAngle:0,longitudinalAccel:0};
}
export function sanitizeControls(input={}) {
  const n=v => Math.min(1,Math.max(-1,Number.isFinite(+v) ? +v : 0));
  return { steer:n(input.steer), throttle:Math.max(0,n(input.throttle)), brake:Math.max(0,n(input.brake)), drift:!!input.drift, nitro:!!input.nitro };
}
export function vehicleStep(state, rawControls={}, car={}, dt=1/60) {
  const v=state; const c=sanitizeControls(rawControls);
  dt=Math.max(0,Math.min(dt,0.05));
  const topKmh=Math.max(80, Math.min(450, (car.topSpeed || 320) + (car.speedBonus || 0)));
  const cap=topKmh/3.6;
  const drive=car.drive||{},gears=Math.max(1,drive.gears||6),idle=drive.idle||850,redline=drive.redline||7500;
  v.gear=Math.max(1,Math.min(gears,v.gear||1));v.shiftLeft=Math.max(0,(v.shiftLeft||0)-dt);
  // These are gameplay tune curves, not claims of factory dyno measurements.
  const gearLimit=g=>cap*(.18+.82*Math.pow(g/gears,.72));
  const speedBefore=v.speed,gearSpeed=Math.abs(v.speed);
  if(gearSpeed>gearLimit(v.gear)*.94&&v.gear<gears&&v.shiftLeft===0){v.gear++;v.shiftLeft=drive.shift||.23;}
  else if(v.gear>1&&gearSpeed<gearLimit(v.gear-1)*.7&&v.shiftLeft===0){v.gear--;v.shiftLeft=drive.shift||.23;}
  const targetRpm=v.speed<0?idle+Math.min(2000,gearSpeed*240):Math.min(redline,idle+(redline-idle)*gearSpeed/gearLimit(v.gear)+ (gearSpeed<2?c.throttle*1000:0));
  v.rpm=(v.rpm||idle)+(targetRpm-(v.rpm||idle))*(1-Math.exp(-(drive.response||1)*11*dt));
  const peak=drive.peak||redline*.75,band=redline*.43;
  const torque=.7+.4*Math.exp(-(((v.rpm-peak)/band)**2));
  const gearPull=1.25-.35*(v.gear-1)/Math.max(1,gears-1);
  const acceleration=(8.6+((car.acceleration||8)-7)*1.7)*torque*gearPull*(v.shiftLeft>0?.12:1);
  const braking=14+((car.brake||7)-7)*1.2;
  const canNitro=c.nitro && c.throttle>0.05 && c.brake<.01 && v.nitro>0.3 && v.speed>4;
  v.pickupBoost=Math.max(0,(v.pickupBoost||0)-dt);
  const boost=(canNitro ? 1.8 : 1)*(v.pickupBoost>0?1.35:1);
  v.nitroActive=canNitro;
  if(canNitro) v.nitro=Math.max(0,v.nitro-(21+(car.nitroDrain||0))*dt);
  else v.nitro=Math.min(100, v.nitro+(c.drift&&v.speed>10 ? 8 : 1.8)*dt);
  const drag=0.7+Math.abs(v.speed)*0.013+0.0006*v.speed*v.speed;
  // Hold the brake at rest briefly to select reverse; braking never crosses zero.
  if(c.brake>.01){
   if(v.speed>0){v.speed=Math.max(0,v.speed-braking*c.brake*dt);v.reverseHold=0;}
   else if(c.throttle>.01){v.speed=Math.min(0,v.speed+braking*dt);v.reverseHold=0;}
   else {v.reverseHold=(v.reverseHold||0)+dt;if(v.reverseHold>=.35)v.speed-=6*c.brake*dt;}
  }else{
   v.reverseHold=0;
   if(c.throttle>.01)v.speed=v.speed<0?Math.min(0,v.speed+braking*c.throttle*dt):v.speed+acceleration*c.throttle*boost*Math.max(.18,1-.78*(v.speed/cap)**2)*dt;
   else v.speed=Math.sign(v.speed)*Math.max(0,Math.abs(v.speed)-drag*dt);
  }
  const forwardCap=cap*(canNitro?1.14:v.pickupBoost>0?1.08:1);
  // An expired boost removes extra engine pull, not the car's momentum. Above
  // the current cap, shed overspeed with drag while retaining stronger braking.
  const speedLimit=speedBefore>forwardCap?Math.max(forwardCap,speedBefore-drag*dt):forwardCap;
  v.speed=Math.max(-25/3.6,Math.min(speedLimit,v.speed));
  // Progressive steering and a speed-dependent grip limit prevent instant spins.
  const steerRate=Math.abs(c.steer)<Math.abs(v.steer||0)?16:10.5;
  v.steer=(v.steer||0)+(c.steer-(v.steer||0))*(1-Math.exp(-steerRate*dt));
  const speed=Math.abs(v.speed),grip=11.7+(car.handling||8)*.36;
  v.drifting=!!(c.drift&&v.speed>8&&Math.abs(v.steer)>.15);
  const angle=v.steer*.56/(1+speed/38);
  const yawLimit=grip/Math.max(speed,4)*(v.drifting?1.45:1);
  const targetYaw=Math.max(-yawLimit,Math.min(yawLimit,-v.speed/2.7*Math.tan(angle)));
  v.yawRate=(v.yawRate||0)+(targetYaw-(v.yawRate||0))*(1-Math.exp(-(v.drifting?7:16)*dt));
  if(speed<.05)v.yawRate=0;
  const slipTarget=v.drifting?v.steer*speed*.16:0;
  v.sideSlip+=(slipTarget-v.sideSlip)*(1-Math.exp(-(v.drifting?3:8)*dt));
  if(c.drift)v.speed=Math.sign(v.speed)*Math.max(0,speed-(2+speed*.12)*dt);
  v.heading+=v.yawRate*dt;
  v.x+=(-Math.sin(v.heading)*v.speed+Math.cos(v.heading)*v.sideSlip)*dt;
  v.z+=(-Math.cos(v.heading)*v.speed-Math.sin(v.heading)*v.sideSlip)*dt;
  v.travel+=Math.abs(v.speed)*dt;
  v.wheelAngle=(v.wheelAngle||0)+v.speed/.35*dt;
  v.longitudinalAccel=(v.speed-speedBefore)/Math.max(dt,.0001);
  return v;
}
export function distance3(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
