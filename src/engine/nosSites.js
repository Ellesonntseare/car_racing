// Pick several road-centre positions across the whole circuit. The seed gives
// each race a different, but identical for every client, arrangement.
export function chooseNosSites(world,spawn,seed=1,count=6){
 const triangles=world.roadTriangles||[...new Set([...world.cells.values()].flat())].filter(t=>t.road);
 const bounds=triangles.reduce((b,t)=>{for(const p of [t.a,t.b,t.c]){b.minX=Math.min(b.minX,p.x);b.maxX=Math.max(b.maxX,p.x);b.minZ=Math.min(b.minZ,p.z);b.maxZ=Math.max(b.maxZ,p.z);}return b;},
  {minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity});
 const spacing=Math.min(42,Math.max(20,Math.hypot(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ)*.07));
 const buckets=new Map();
 for(const t of triangles){
  const x=(t.a.x+t.b.x+t.c.x)/3,z=(t.a.z+t.b.z+t.c.z)/3,y=(t.a.y+t.b.y+t.c.y)/3+.08;
  const key=`${Math.round(x/18)},${Math.round(z/18)}`;
  const centerX=Math.round(x/18)*18,centerZ=Math.round(z/18)*18;
  const score=(x-centerX)**2+(z-centerZ)**2;
  if(!buckets.has(key)||score<buckets.get(key).score)buckets.set(key,{x,y,z,score});
 }
 const candidates=[];
 for(const point of buckets.values()){
  if(Math.hypot(point.x-spawn.x,point.z-spawn.z)<spacing*1.1)continue;
  for(const heading of [0,Math.PI/4,Math.PI/2,3*Math.PI/4]){
   const pose={x:point.x,y:point.y,z:point.z,heading};
   const support=world.support(pose,1.65,2.1);
   if(!support||world.blocked({...pose,...support},1.65,2.1))continue;
   candidates.push({...pose,y:support.y});break;
  }
 }
 if(!candidates.length)return [];
 let random=seed>>>0;
 const rand=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 const selected=[];
 while(selected.length<Math.min(count,candidates.length)){
  let best=-Infinity,choice=-1;
  for(let i=0;i<candidates.length;i++){
   const p=candidates[i];
   const separation=Math.min(...[spawn,...selected].map(q=>Math.hypot(p.x-q.x,p.z-q.z)));
   if(separation<spacing)continue;
   const score=separation*(.83+rand()*.34);
   if(score>best){best=score;choice=i;}
  }
  if(choice<0)break;
  selected.push(candidates.splice(choice,1)[0]);
 }
 return selected.map(({x,y,z,heading})=>({x,y,z,heading}));
}
