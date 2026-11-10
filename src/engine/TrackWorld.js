import * as THREE from 'three';

// These source-atlas tiles were checked against the Country Woods PNG. They
// contain half-tree sprites whose trunks lie at the maximum-U vertical edge.
// A merged sprite mesh's transparent rectangle is not a physical wall.
const WOODS_TREE_TILES=[[.4633,.8491,.5367,.9987],[.0013,.8318,.0828,.9987],[.0854,.8318,.1669,.9987]];
function treeTile(mesh){
 const uv=mesh.geometry?.attributes.uv;
 if(!uv||!/material_atlas_00002_1/.test(mesh.name))return null;
 let minU=Infinity,minV=Infinity,maxU=-Infinity,maxV=-Infinity;
 for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=uv.getY(i);minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v);}
 return WOODS_TREE_TILES.find(([u0,v0,u1,v1])=>minU>=u0-.0002&&maxU<=u1+.0002&&minV>=v0-.0002&&maxV<=v1+.0002&&maxU-minU>(u1-u0)*.8)||null;
}

// World-space triangles indexed in X/Z cells. No dependence on render visibility.
export class TrackWorld {
 constructor(meshes,roads,{cellSize=12,groundMeshes=[]}={}){
  this.cellSize=cellSize;this.cells=new Map();this.triangleCount=0;this.roadTriangles=[];this.groundTriangles=[];
  const roadSet=new Set(roads),groundSet=new Set(groundMeshes),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(const mesh of meshes){
   const p=mesh.geometry?.attributes.position,index=mesh.geometry?.index;if(!p)continue;
   const foliage=treeTile(mesh),uv=mesh.geometry.attributes.uv;
   for(let i=0;i<(index?.count||p.count);i+=3){
    a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
    const normal=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a));if(normal.lengthSq()<1e-12)continue;normal.normalize();
    if(foliage&&Math.abs(normal.y)<.1){
     const points=[a,b,c],us=points.map((_,k)=>uv.getX(index?index.getX(i+k):i+k));
     const left=points[us.indexOf(Math.min(...us))],axis=points[us.indexOf(Math.max(...us))].clone();
     const across=new THREE.Vector3(axis.x-left.x,0,axis.z-left.z).normalize();
     const base=Math.min(a.y,b.y,c.y),height=Math.max(a.y,b.y,c.y)-base;
     const radius=Math.max(.22,Math.min(.45,height*.022));
     for(let k=0;k<points.length;k++){
      const side=((us[k]-foliage[0])/(foliage[2]-foliage[0])-.5)*radius*2;
      points[k].x=axis.x+across.x*side;points[k].z=axis.z+across.z*side;
      points[k].y=base+(points[k].y-base)*Math.min(1,2.5/Math.max(height,.001));
     }
    }
    const road=roadSet.has(mesh)&&Math.abs(normal.y)>.68;
     // Ground is supplied separately from the asphalt route. Its steep faces
     // remain obstacles, while ordinary shoulders and terrain support wheels.
     const ground=groundSet.has(mesh)&&Math.abs(normal.y)>.82;
    // Include sloped rocks and flat faces of solid roadside objects. Ground
    // surfaces stay out of the wall index so the road remains traversable.
    const solidName=/barrier|fence|building|house|wall|rock|boulder|tree|pole|sign|lamp|gate|bridge|rail/i.test(mesh.name);
     const wall=!road&&!ground&&(Math.abs(normal.y)<.85||solidName);
     if(!road&&!ground&&!wall)continue;
     const t={a:a.clone(),b:b.clone(),c:c.clone(),road,ground,wall,foliageTrunk:!!foliage,name:mesh.name,normal,minY:Math.min(a.y,b.y,c.y),maxY:Math.max(a.y,b.y,c.y)};
    this.triangleCount++;
    if(road)this.roadTriangles.push(t);
     if(ground)this.groundTriangles.push(t);
    const minX=Math.floor(Math.min(a.x,b.x,c.x)/cellSize),maxX=Math.floor(Math.max(a.x,b.x,c.x)/cellSize);
    const minZ=Math.floor(Math.min(a.z,b.z,c.z)/cellSize),maxZ=Math.floor(Math.max(a.z,b.z,c.z)/cellSize);
    for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){const key=`${x},${z}`;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(t);}
   }
  }
 }
 surface(x,z,y=0,wide=false,allowGround=false){
  let best=null;
  for(const t of this.cells.get(`${Math.floor(x/this.cellSize)},${Math.floor(z/this.cellSize)}`)||[]){
   if(!t.road&&!(allowGround&&t.ground))continue;
   const {a,b,c}=t,den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-9)continue;
   const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den;
   const v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,w=1-u-v;
   if(Math.min(u,v,w)<-1e-5)continue;
   const height=u*a.y+v*b.y+w*c.y;
   if(!wide&&Math.abs(height-y)>3)continue;
   if(!best||(wide?height>best.y:Math.abs(height-y)<Math.abs(best.y-y)))best={y:height,object:{name:t.name},normal:t.normal};
  }
  return best;
 }
 support(pose,width=1.1,length=1.65,allowGround=false){
  const cos=Math.cos(pose.heading),sin=Math.sin(pose.heading),heights=[];
  for(const [right,back] of [[0,0],[-width,-length],[width,-length],[-width,length],[width,length]]){
   const hit=this.surface(pose.x+cos*right+sin*back,pose.z-sin*right+cos*back,pose.y,false,allowGround);
   if(!hit)return null;heights.push(hit.y);
  }
  if(Math.max(...heights)-Math.min(...heights)>2.5)return null;
  return {y:heights[0]+.08,pitch:Math.atan2((heights[1]+heights[2]-heights[3]-heights[4])/2,length*2),roll:Math.atan2((heights[2]+heights[4]-heights[1]-heights[3])/2,width*2)};
 }
 blocked(pose,width=1.25,length=2.3){
  this.lastObstacle=null;this.lastObstacleNormal=null;this.lastObstacleTriangle=null;
  const radius=Math.hypot(width,length),size=this.cellSize,seen=new Set();
  const box=new THREE.Box3(new THREE.Vector3(-width,.22,-length),new THREE.Vector3(width,1.25,length));
  const inverse=new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.pitch||0,pose.heading,pose.roll||0,'YXZ')).invert();
  const local=v=>new THREE.Vector3(v.x-pose.x,v.y-pose.y,v.z-pose.z).applyQuaternion(inverse);
  for(let x=Math.floor((pose.x-radius)/size);x<=Math.floor((pose.x+radius)/size);x++)for(let z=Math.floor((pose.z-radius)/size);z<=Math.floor((pose.z+radius)/size);z++){
   for(const t of this.cells.get(`${x},${z}`)||[]){
    if(!t.wall||seen.has(t)||t.maxY<pose.y+.22||t.minY>pose.y+1.25)continue;seen.add(t);
    const triangle=new THREE.Triangle(local(t.a),local(t.b),local(t.c));
    // Small kerbs and mesh lips are traversable; keep fences/buildings solid.
    if(Math.max(triangle.a.y,triangle.b.y,triangle.c.y)<.38)continue;
    if(box.intersectsTriangle(triangle)){this.lastObstacle=t.name;this.lastObstacleNormal=t.normal;this.lastObstacleTriangle=t;return true;}
   }
  }
  return false;
 }
 move(previous,next,{keepOnRoad=false,width=1.1,length=1.65,allowSlide=false}={}){
  const dx=next.x-previous.x,dz=next.z-previous.z,distance=Math.hypot(dx,dz);
  const turn=Math.atan2(Math.sin(next.heading-previous.heading),Math.cos(next.heading-previous.heading));
  const steps=Math.max(1,Math.ceil(distance/.35),Math.ceil(Math.abs(turn)/.04));let accepted={...previous},sliding=false;
  const attempt=pose=>{
   const support=this.support(pose,width,length,!keepOnRoad);
   if(!support)return {reason:'road edge'};
   // A terrain top within the vertical lookup range is not necessarily a
   // climbable step. Reject ledges instead of snapping onto their upper face.
   const maxStep=.38+Math.hypot(pose.x-accepted.x,pose.z-accepted.z)*.8;
   if(Math.abs(support.y-accepted.y)>maxStep)return {reason:'steep step'};
   Object.assign(pose,support);
   return this.blocked(pose,width+.12,length+.6)?{reason:'obstacle',normal:this.lastObstacleNormal}: {pose};
  };
  for(let i=1;i<=steps;i++){
   const f=i/steps,pose={x:accepted.x+dx/steps,z:accepted.z+dz/steps,y:accepted.y,heading:previous.heading+turn*f};
   const result=attempt(pose);
   if(result.pose){accepted=result.pose;continue;}
   if(allowSlide&&result.reason==='obstacle'&&result.normal&&distance>0){
    const nx=result.normal.x,nz=result.normal.z,normalLength=nx*nx+nz*nz;
    if(normalLength>1e-6){
     const into=(dx*nx+dz*nz)/steps/normalLength;
     const slideX=dx/steps-nx*into,slideZ=dz/steps-nz*into;
     if(Math.hypot(slideX,slideZ)>distance/steps*.2){
      const slide={x:accepted.x+slideX,z:accepted.z+slideZ,y:accepted.y,heading:pose.heading};
      let tangent=attempt(slide);
      // Turning the body into a wall may be blocked even though its previous
      // orientation can continue along that wall safely.
      if(!tangent.pose&&slide.heading!==accepted.heading)tangent=attempt({...slide,heading:accepted.heading});
      if(tangent.pose){accepted=tangent.pose;sliding=true;continue;}
     }
    }
   }
   return {...accepted,blocked:true,reason:result.reason};
  }
  return {...accepted,blocked:false,sliding,reason:sliding?'wall slide':undefined,
   motionScale:distance>0?Math.min(1,Math.hypot(accepted.x-previous.x,accepted.z-previous.z)/distance):1};
 }
}
