// Cache the real road triangles once; only the car marker changes while driving.
export class Minimap {
 constructor(canvas){
  this.canvas=canvas;this.context=canvas.getContext('2d');
  this.background=document.createElement('canvas');
  this.background.width=this.background.height=320;
  canvas.width=canvas.height=320;
 }
 setWorld(world){
  const triangles=world.roadTriangles||[...new Set([...world.cells.values()].flat())].filter(t=>t.road);
  const ctx=this.background.getContext('2d');ctx.clearRect(0,0,320,320);
  if(!triangles.length){this.project=null;return;}
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const t of triangles)for(const p of [t.a,t.b,t.c]){
   minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);
  }
  const scale=284/Math.max(maxX-minX,maxZ-minZ,1),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  this.project=(x,z)=>[160+(x-cx)*scale,160+(z-cz)*scale];
  ctx.fillStyle='#b7dde5';ctx.strokeStyle='#b7dde5';ctx.lineWidth=1.4;ctx.lineJoin='round';
  ctx.beginPath();
  for(const t of triangles){
   const a=this.project(t.a.x,t.a.z),b=this.project(t.b.x,t.b.z),c=this.project(t.c.x,t.c.z);
   ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.closePath();
  }
  ctx.fill();ctx.stroke();
 }
 draw(pose,{checkpoints=[],visited=0,activeCheckpoint=-1,bots=[],nos=[]}={}){
  const ctx=this.context;ctx.clearRect(0,0,320,320);
  if(!this.project)return;
  ctx.drawImage(this.background,0,0);
  for(const [i,point] of checkpoints.entries()){
   const [cx,cy]=this.project(point.x,point.z);
   ctx.beginPath();ctx.arc(cx,cy,i===activeCheckpoint?7:5,0,Math.PI*2);
   ctx.fillStyle=visited&(1<<i)?'#5bffad':i===activeCheckpoint?'#ffcd62':'#7798ab';ctx.fill();
   ctx.strokeStyle='#071221';ctx.lineWidth=1.5;ctx.stroke();
   ctx.font='bold 8px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#071221';ctx.fillText(String(i+1),cx,cy+.5);
  }
  for(const bot of bots){
   const [bx,by]=this.project(bot.x,bot.z);
   ctx.beginPath();ctx.arc(bx,by,5,0,Math.PI*2);ctx.fillStyle='#aa67ff';ctx.fill();
   ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.stroke();
  }
  for(const point of nos){
   const [cx,cy]=this.project(point.x,point.z);
   ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.PI/4);
   ctx.fillStyle='#35ddff';ctx.fillRect(-3.5,-3.5,7,7);
   ctx.strokeStyle='#071221';ctx.lineWidth=1;ctx.strokeRect(-3.5,-3.5,7,7);ctx.restore();
  }
  const [x,y]=this.project(pose.x,pose.z);
  ctx.save();ctx.translate(x,y);ctx.rotate(-pose.heading);
  ctx.shadowColor='#000';ctx.shadowBlur=5;
  ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,7);ctx.lineTo(0,4);ctx.lineTo(-7,7);ctx.closePath();
  ctx.fillStyle='#ff3655';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.restore();
 }
}
