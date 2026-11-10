const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const wrap=(distance,length)=>((distance%length)+length)%length;

/** A continuous closed road route. Distances can remain unwrapped across laps. */
export class RacingLine {
 constructor(points){
  if(!Array.isArray(points)||points.length<3)throw new Error('Racing line needs a closed road route');
  this.points=[];
  for(const point of points){
   if(!Array.isArray(point)||point.length<3||!point.every(Number.isFinite))throw new Error('Racing line contains invalid coordinates');
   const previous=this.points.at(-1);
   if(!previous||Math.hypot(point[0]-previous[0],point[2]-previous[2])>1e-5)this.points.push([...point]);
  }
  const first=this.points[0],last=this.points.at(-1);
  if(Math.hypot(first[0]-last[0],first[2]-last[2])>1e-5)this.points.push([...first]);
  this.distances=[0];
  for(let i=1;i<this.points.length;i++)this.distances.push(this.distances[i-1]+Math.hypot(this.points[i][0]-this.points[i-1][0],this.points[i][2]-this.points[i-1][2]));
  this.length=this.distances.at(-1);
  if(!Number.isFinite(this.length)||this.length<1)throw new Error('Racing line has no usable length');
 }
 sample(distance){
  const d=wrap(distance,this.length);
  let lo=1,hi=this.distances.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(this.distances[mid]<d)lo=mid+1;else hi=mid;}
  const a=this.points[lo-1],b=this.points[lo],span=this.distances[lo]-this.distances[lo-1];
  const f=span>0?(d-this.distances[lo-1])/span:0;
  return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,z:a[2]+(b[2]-a[2])*f,
   heading:Math.atan2(-(b[0]-a[0]),-(b[2]-a[2]))};
 }
 project(pose,{hint=null,window=Infinity}={}){
  let best=null;
  for(let i=1;i<this.points.length;i++){
   const a=this.points[i-1],b=this.points[i],dx=b[0]-a[0],dz=b[2]-a[2],den=dx*dx+dz*dz;
   if(den<1e-6)continue;
   const f=clamp(((pose.x-a[0])*dx+(pose.z-a[2])*dz)/den,0,1);
   let distance=this.distances[i-1]+Math.sqrt(den)*f;
   if(Number.isFinite(hint))distance+=Math.round((hint-distance)/this.length)*this.length;
   if(Number.isFinite(hint)&&Math.abs(distance-hint)>window)continue;
   const x=a[0]+dx*f,z=a[2]+dz*f,y=a[1]+(b[1]-a[1])*f;
   const error=(pose.x-x)**2+(pose.z-z)**2+Math.min(100,((pose.y??y)-y)**2)*2;
   if(!best||error<best.error*best.error)best={distance,x,y,z,error:Math.sqrt(error),heading:Math.atan2(-dx,-dz)};
  }
  return best||this.project(pose);
 }
 nearestDistance(pose){return wrap(this.project(pose).distance,this.length);}
}
