import * as THREE from 'three';
import { getGLB,buildCarModel,ownResources,disposeOwnedResources } from './assets.js';
import { CARS } from '../assets/catalog.js';

const metal=new THREE.MeshStandardMaterial({color:0x191d25,metalness:.84,roughness:.29});
const edge=new THREE.MeshStandardMaterial({color:0x7e8995,metalness:.88,roughness:.24});
const red=new THREE.MeshStandardMaterial({color:0xc81332,metalness:.55,roughness:.24});
const rubber=new THREE.MeshStandardMaterial({color:0x121417,roughness:.9});
const glow=new THREE.MeshBasicMaterial({color:0xff2449});
const disk=new THREE.MeshStandardMaterial({color:0x767e87,metalness:.92,roughness:.27});

function box(parent,x,y,z,w,h,d,material){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 ownResources(mesh,mesh.geometry);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylinder(parent,x,y,z,top,bottom,height,material,segments=24){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,segments),material);
 ownResources(mesh,mesh.geometry);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function sign(text,width=3){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#10141d';ctx.fillRect(0,0,768,160);
 ctx.fillStyle='#e11e3e';ctx.fillRect(0,0,12,160);
 ctx.fillStyle='#d9e5eb';ctx.font='bold 62px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,85);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width*160/768),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
 ownResources(mesh,mesh.geometry,mesh.material,texture);
 return mesh;
}
function shelf(parent,x,z,floor,label){
 const group=new THREE.Group();group.position.set(x,floor,z);parent.add(group);
 for(const sx of [-2,2])for(const sz of [-.47,.47])box(group,sx,1.45,sz,.09,2.9,.09,metal);
 for(const y of [.18,1.14,2.18]){
  box(group,0,y,0,4.1,.10,1.05,metal);
  box(group,0,y+.055,.48,4.1,.025,.055,edge);
 }
 box(group,0,2.91,0,4.18,.14,1.08,red);
 const plate=sign(label,3.5);plate.position.set(0,2.57,.55);group.add(plate);
 for(const sx of [-1.88,1.88])box(group,sx,1.47,.54,.045,2.85,.045,red);
 return group;
}
function brakeSet(parent,x,y,z){
 const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);
 const rotor=new THREE.Mesh(new THREE.TorusGeometry(.31,.11,12,32),disk);ownResources(rotor,rotor.geometry);rotor.position.y=.36;group.add(rotor);
 const hub=cylinder(group,0,.36,0,.1,.1,.12,edge);hub.rotation.x=Math.PI/2;
 const caliper=box(group,.27,.38,.02,.20,.27,.19,red);caliper.rotation.z=-.35;
 return group;
}
function aeroPart(parent,x,y,z){
 const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);
 for(const sx of [-.61,.61])box(group,sx,.23,0,.08,.43,.12,edge);
 const blade=box(group,0,.47,0,1.85,.09,.43,red);blade.rotation.x=.08;
 for(const sx of [-.91,.91])box(group,sx,.52,0,.035,.22,.48,metal);
 return group;
}
function exhaustSet(parent,x,y,z){
 const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);
 for(const sx of [-.27,.27]){
  const pipe=new THREE.Mesh(new THREE.TorusGeometry(.21,.065,10,32,Math.PI*1.36),edge);
  ownResources(pipe,pipe.geometry);
  pipe.position.set(sx,.21,0);pipe.rotation.x=Math.PI/2;group.add(pipe);
  cylinder(group,sx+.11,.17,.27,.09,.09,.55,disk).rotation.x=Math.PI/2;
 }
 return group;
}
function serviceStand(parent,x,z,y){
 const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);
 box(group,0,.12,0,2.45,.24,1.25,metal);
 box(group,0,.27,.56,2.45,.045,.06,red);
 for(const sx of [-1.06,1.06]){
  box(group,sx,1.38,-.32,.12,2.45,.12,edge);
  box(group,sx,1.38,.28,.12,2.45,.12,edge);
 }
 for(const h of [.68,1.65,2.48])box(group,0,h,-.32,2.3,.09,.12,metal);
 const plate=sign('REDLINE SERVICE',2.12);plate.position.set(0,2.36,.35);group.add(plate);
 return group;
}
function strip(parent,x,y,z,length,vertical=false){
 const mesh=box(parent,x,y,z,vertical?.055:length,vertical?length:.055,.06,glow);
 mesh.castShadow=false;return mesh;
}
function addModel(parent,scene,x,y,z,targetWidth,rotation=0){
 const model=scene.clone(true);model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 const scale=targetWidth/Math.max(size.x,size.z,.001);model.scale.multiplyScalar(scale);
 model.updateMatrixWorld(true);
 const placed=new THREE.Box3().setFromObject(model),center=placed.getCenter(new THREE.Vector3());
 model.position.set(x-center.x,y-placed.min.y,z-center.z);model.rotation.y=rotation;
 model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
 parent.add(model);return model;
}

/** Creates a showroom edge around the existing circular platform. Props stay outside the car's orbit. */
export function createGarageProps({floorAt=()=>0,isCurrent=()=>true}={}){
 const root=new THREE.Group();root.name='garage-customization-props';
 let active=true;
 ownResources(root,{dispose(){active=false;}});
 const floor=(x,z)=>floorAt(x,z);
 const left=shelf(root,-16,-15.4,floor(-16,-15.4),'WHEELS / BRAKES');left.rotation.y=Math.PI/2;
 const right=shelf(root,15,-13.5,floor(15,-13.5),'AERO / PARTS');right.rotation.y=-Math.PI/2;
 const engine=shelf(root,-15.3,-4.7,floor(-15.3,-4.7),'ENGINE / TUNING');engine.rotation.y=.45;
 const side=shelf(root,5,-12.4,floor(5,-12.4),'EXHAUST / KITS');side.rotation.y=-Math.PI/2;
 for(const x of [-1.35,0,1.35])brakeSet(left,x,1.23,.03);
 aeroPart(right,0,1.25,.03);
 exhaustSet(side,-.95,1.25,.01);exhaustSet(side,1.02,1.25,.01);
 for(const x of [-1.2,0,1.2]){
  cylinder(engine,x,1.29,0,.26,.29,.3,disk);
  box(engine,x,1.54,.13,.45,.13,.36,red);
 }
 for(const x of [-1.34,1.34]){
  box(right,x,1.47,0,.43,.32,.55,metal);
  strip(right,x,1.66,.30,.36);
 }
 // The red light bars make the parts readable from each side of the 360-degree orbit.
 for(const [x,z] of [[-16,-15.4],[15,-13.5]]){
  strip(root,x,floor(x,z)+3.15,z+.55,4.12);
  box(root,x,floor(x,z)+3.25,z+.53,4.28,.07,.09,metal);
 }
 const pedestal=(x,z,w)=>{
  const y=floor(x,z);box(root,x,y+.13,z,w,.26,w,metal);
  box(root,x,y+.28,z,w+.07,.035,w+.07,red);return y+.30;
 };
 const chestY=pedestal(-14,-2.2,2.2);
 const cartY=pedestal(3.4,-7.0,2.2);
 const tyreY=pedestal(-13.2,-7.3,1.75);
 serviceStand(root,-12.4,-2.5,floor(-12.4,-2.5));
 serviceStand(root,4.6,-3.5,floor(4.6,-3.5));
 for(const [x,z] of [[-14.3,-11.5],[4.5,-16]]){
  const y=floor(x,z);box(root,x,y+.04,z,2.25,.07,1.3,metal);
  strip(root,x,y+.09,z+.63,2.2);
 }
 // These CC0 Poly Haven models are local game assets; no external runtime request.
 const assets=[
  ['metal_tool_chest',scene=>addModel(root,scene,-14,chestY,-2.2,1.95,Math.PI)],
  ['tool_cart',scene=>addModel(root,scene,3.4,cartY,-7,1.8,-.5)],
  ['old_tyre',scene=>{for(let i=0;i<3;i++)addModel(root,scene,-13.2,tyreY+i*.34,-7.3,1.4,0);addModel(left,scene,-1.15,1.22,.02,.83,Math.PI/2);addModel(left,scene,1.2,1.22,.02,.83,Math.PI/2);}],
  ['metal_toolbox',scene=>{addModel(right,scene,0,.26,.01,.75,0);addModel(engine,scene,-.4,.26,.01,.75,0);}],
  ['portable_welding_cart',scene=>addModel(root,scene,4.5,floor(4.5,-16)+.07,-16,1.55,Math.PI/2)],
  ['rusted_wheel_rim_01',scene=>{for(const x of [-1.1,0,1.1])addModel(left,scene,x,.26,.01,.78,Math.PI/2);}],
  ['oil_tin',scene=>{for(const x of [-1.35,-.65,.65,1.35])addModel(engine,scene,x,.27,.01,.35,0);addModel(side,scene,1.15,.27,.01,.42,0);}]
 ];
 const ready=Promise.allSettled(assets.map(async([id,place])=>{
  const data=await getGLB(`/garage/${id}/${id}_1k.gltf`);
  if(active&&isCurrent())place(data.scene);
 }));
 return {root,ready,dispose:()=>disposeOwnedResources(root)};
}

/** The available game cars park in the open bay beyond the display ring. */
export function createGarageCollection({floorAt=()=>0,isCurrent=()=>true,selectedId}={}){
 const root=new THREE.Group();root.name='garage-parked-collection';
 const parked=new Map();
 let active=true,queue=Promise.resolve();
 ownResources(root,{dispose(){active=false;}});
 // Parked cars use a soft contact patch on their bay; their tires sit at its
 // top surface instead of hovering above the platform.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const context=canvas.getContext('2d'),fade=context.createRadialGradient(64,64,12,64,64,62);
 fade.addColorStop(0,'rgba(0,0,0,.62)');fade.addColorStop(.6,'rgba(0,0,0,.35)');fade.addColorStop(1,'rgba(0,0,0,0)');
 context.fillStyle=fade;context.fillRect(0,0,128,128);
 const shadowTexture=new THREE.CanvasTexture(canvas),shadowGeometry=new THREE.PlaneGeometry(5.05,2.55);
 const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false});
 ownResources(root,shadowTexture,shadowGeometry,shadowMaterial);
 // Four cars occupy a 2x2 grid by the pink wall; the fifth has a service bay by green.
 const spaces=[[0,0],[7,0],[0,5],[7,5],[13,-5]];
 let selected=selectedId;
 const loadParked=()=>{
  queue=queue.then(async()=>{
   for(const car of CARS){
    if(!active||!isCurrent())return;
    const pad=parked.get(car.id);
    if(car.id===selected||pad.userData.vehicle)continue;
    try{
     const gltf=await getGLB(car.file);
     if(!active||!isCurrent())return;
     if(car.id===selected)continue;
     const model=buildCarModel(gltf.scene,car.accent,0,car.modelHeading);
     model.rotation.y=Math.PI/2;model.position.y=.092;
     model.traverse(node=>{if(node.isMesh)node.castShadow=false;});
     pad.add(model);pad.userData.vehicle=model;pad.userData.shadow.visible=true;
    }catch(error){console.warn(`[REDLINE] Parked ${car.name} unavailable:`,error);}
   }
  });
  return queue;
 };
 const setSelected=id=>{
  selected=id;
  let spaceIndex=0;
  for(const car of CARS){
   const slot=parked.get(car.id);
   if(!slot)continue;
   slot.visible=car.id!==id;
   if(!slot.visible){
    if(slot.userData.vehicle){disposeOwnedResources(slot.userData.vehicle);slot.userData.vehicle=null;}
    slot.userData.shadow.visible=false;
    continue;
   }
   const [x,z]=spaces[spaceIndex++];
   slot.position.set(x,floorAt(x,z),z);
   slot.userData.label.position.z=z<0?1.43:-1.43;
  }
  return loadParked();
 };
 for(const [index,car] of CARS.entries()){
  const pad=new THREE.Group();root.add(pad);
  box(pad,0,.045,0,5.15,.09,2.75,metal);
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.092;shadow.renderOrder=1;shadow.visible=false;
  pad.add(shadow);pad.userData.shadow=shadow;
  for(const dz of [-1.33,1.33])strip(pad,0,.105,dz,4.95);
  const label=sign(`${String(index+1).padStart(2,'0')} / ${car.name.toUpperCase()}`,2.65);
  label.position.set(0,.49,-1.43);pad.add(label);pad.userData.label=label;
  parked.set(car.id,pad);
 }
 const ready=setSelected(selectedId);
 return {root,ready,setSelected,dispose:()=>disposeOwnedResources(root)};
}
