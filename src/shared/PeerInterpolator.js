const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
const fields=['x','y','z','speed','steer','wheelAngle','rpm','nitro','pickupBoost'];

/** Render remote vehicles on a delayed server timeline rather than chasing packets. */
export class PeerInterpolator {
 constructor({delayMs=100,maxExtrapolationMs=80,teleportDistance=35,staleMs=500,maxSamples=32}={}){
  this.delayMs=clamp(delayMs,0,300);this.maxExtrapolationMs=clamp(maxExtrapolationMs,0,150);
  this.teleportDistance=teleportDistance;this.staleMs=staleMs;this.maxSamples=Math.max(2,maxSamples);
  this.clear();
 }
 clear(){this.samples=[];this.offsets=[];this.clockOffset=null;this.lastReceivedAt=null;}
 push(state,serverTime,receivedAt=performance.now()){
  if(!state||!['x','y','z','heading'].every(key=>Number.isFinite(state[key]))||!Number.isFinite(serverTime)||!Number.isFinite(receivedAt))return false;
  const offset=receivedAt-serverTime;
  if(this.clockOffset!==null&&Math.abs(offset-this.clockOffset)>2000)this.clear();
  const latest=this.samples.at(-1);
  if(latest&&serverTime>=latest.time&&Math.hypot(state.x-latest.state.x,state.z-latest.state.z)>this.teleportDistance)this.clear();
  this.offsets.push(offset);if(this.offsets.length>this.maxSamples)this.offsets.shift();
  // The least-delayed recent packet gives a stable clock estimate under jitter.
  this.clockOffset=Math.min(...this.offsets);this.lastReceivedAt=receivedAt;
  const sample={time:serverTime,state:{...state}};
  const existing=this.samples.findIndex(entry=>entry.time===serverTime);
  if(existing>=0)this.samples[existing]=sample;else this.samples.push(sample);
  this.samples.sort((a,b)=>a.time-b.time);
  if(this.samples.length>this.maxSamples)this.samples.splice(0,this.samples.length-this.maxSamples);
  return true;
 }
 sample(now=performance.now()){
  if(!this.samples.length||!Number.isFinite(now))return null;
  const latest=this.samples.at(-1),stale=now-this.lastReceivedAt>this.staleMs;
  const time=now-this.clockOffset-this.delayMs;
  let pose;
  if(time<=this.samples[0].time)pose={...this.samples[0].state};
  else {
   const next=this.samples.findIndex(entry=>entry.time>=time);
   if(next>0){
    const a=this.samples[next-1],b=this.samples[next],alpha=clamp((time-a.time)/(b.time-a.time),0,1);
    pose={...(alpha<.5?a.state:b.state)};
    for(const key of fields)if(Number.isFinite(a.state[key])&&Number.isFinite(b.state[key]))pose[key]=a.state[key]+(b.state[key]-a.state[key])*alpha;
    pose.heading=a.state.heading+angleDelta(a.state.heading,b.state.heading)*alpha;
   }else {
    pose={...latest.state};
    const previous=this.samples.at(-2),extra=Math.min(this.maxExtrapolationMs,Math.max(0,time-latest.time))/1000;
    if(previous&&extra>0){
     const interval=(latest.time-previous.time)/1000;
     if(interval>=.008&&interval<=.5){
      let vx=(latest.state.x-previous.state.x)/interval,vz=(latest.state.z-previous.state.z)/interval;
      const distance=Math.hypot(vx,vz)*extra,limit=Math.min(4,140*extra);
      if(distance>limit){const scale=limit/distance;vx*=scale;vz*=scale;}
      pose.x+=vx*extra;pose.z+=vz*extra;
      pose.y+=clamp((latest.state.y-previous.state.y)/interval,-20,20)*extra;
      pose.heading+=clamp(angleDelta(previous.state.heading,latest.state.heading)/interval,-3,3)*extra;
     }
    }
   }
  }
  if(stale){pose.speed=0;pose.nitroActive=false;}
  return {...pose,stale};
 }
}
