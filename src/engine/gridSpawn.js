// A deterministic, single-file grid follows the road center instead of
// pushing the second player onto a shoulder or a raised pavement.
const STEP=.5,MAX_SIDE=12,SPACING=7.4;

function valid(world,pose,halfWidth){
 const contact=world.support(pose,halfWidth,1.75);
 return contact&&!world.blocked({...pose,...contact},halfWidth+.12,2.4)
  ?{...pose,...contact}:null;
}

function offset(base,right,back=0,heading=base.heading){
 return {x:base.x+Math.cos(heading)*right+Math.sin(heading)*back,
  z:base.z-Math.sin(heading)*right+Math.cos(heading)*back,
  y:base.y,heading};
}

function centered(world,base,halfWidth){
 const samples=[];
 for(let n=-MAX_SIDE/STEP;n<=MAX_SIDE/STEP;n++){
  const side=n*STEP,candidate=offset(base,side);
  const floor=world.surface(candidate.x,candidate.z,base.y);
  if(floor)candidate.y=floor.y+.08;
  samples.push({side,pose:floor?valid(world,candidate,halfWidth):null});
 }
 const runs=[];let run=null;
 for(const sample of samples){
  if(sample.pose){if(!run){run=[];runs.push(run);}run.push(sample);}
  else run=null;
 }
 if(!runs.length)return null;
 runs.sort((a,b)=>{
  const centerA=(a[0].side+a.at(-1).side)/2,centerB=(b[0].side+b.at(-1).side)/2;
  return Math.abs(centerA)-Math.abs(centerB)||b.length-a.length;
 });
 const chosen=runs[0],mid=(chosen[0].side+chosen.at(-1).side)/2;
 return {pose:chosen.reduce((best,s)=>Math.abs(s.side-mid)<Math.abs(best.side-mid)?s:best).pose,
  shift:Math.abs(mid),clearance:chosen.length*STEP};
}

export function multiplayerGridSpawn(world,base,index,halfWidth=1.4){
 if(!world||index<0)return base;
 const first=centered(world,base,halfWidth);
 if(!first)return base;
 const slots=[first.pose];
 for(let i=1;i<=Math.max(3,index);i++){
  const prior=slots.at(-1);let best=null;
  for(const turn of [0,-.09,.09,-.18,.18,-.3,.3,-.45,.45,-.6,.6]){
   const heading=prior.heading+turn;
   const guess=offset(prior,0,SPACING,heading);
   const next=centered(world,guess,halfWidth);
   if(!next)continue;
   const distance=Math.hypot(next.pose.x-prior.x,next.pose.z-prior.z);
   if(distance<6.4||distance>12||slots.some(p=>Math.hypot(next.pose.x-p.x,next.pose.z-p.z)<6.4))continue;
   const score=Math.abs(turn)*12+next.shift*.7+Math.abs(distance-SPACING)+Math.abs(next.pose.y-prior.y)*.25;
   if(!best||score<best.score)best={...next.pose,score};
  }
  if(!best)break;
  slots.push(best);
 }
 if(slots.length>=4){
  const grid=slots.slice(0,4).map(p=>[-1.55,1.55].map(side=>{
   const candidate=offset(p,side);
   const floor=world.surface(candidate.x,candidate.z,p.y);
   if(floor)candidate.y=floor.y+.08;
   return floor?valid(world,candidate,halfWidth):null;
  }));
  if(grid.every(row=>row.every(Boolean)))return grid[Math.floor(index/2)]?.[index%2]||slots.at(-1);
 }
 return slots[Math.min(index,slots.length-1)];
}

export function roadCenterAhead(world,base,steps,halfWidth=1.4){
 const first=centered(world,base,halfWidth);
 if(!first)return [];
 const path=[first.pose];
 for(let i=0;i<steps;i++){
  const prior=path.at(-1);let best=null;
  for(const turn of [0,-.09,.09,-.18,.18,-.3,.3,-.45,.45,-.6,.6]){
   const heading=prior.heading+turn;
   const next=centered(world,offset(prior,0,-SPACING,heading),halfWidth);
   if(!next)continue;
   const distance=Math.hypot(next.pose.x-prior.x,next.pose.z-prior.z);
   if(distance<6.4||distance>12||path.slice(0,-1).some(p=>Math.hypot(next.pose.x-p.x,next.pose.z-p.z)<5))continue;
   const score=Math.abs(turn)*12+next.shift*.7+Math.abs(distance-SPACING)+Math.abs(next.pose.y-prior.y)*.25;
   if(!best||score<best.score)best={...next.pose,score};
  }
  if(!best)break;
  path.push(best);
 }
 return path;
}
