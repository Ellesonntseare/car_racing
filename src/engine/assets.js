import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
const loader=new GLTFLoader();
const draco=new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
loader.setDRACOLoader(draco);
const pending=new Map();
const subscribers=new Map();
const completed=new Set();
// Imported geometry and textures belong to the asset cache. Only resources
// created for a particular scene instance may be released with that instance.
const ownedResources=new WeakMap();
export function ownResources(owner,...resources){
 if(!ownedResources.has(owner))ownedResources.set(owner,new Set());
 const owned=ownedResources.get(owner);
 for(const resource of resources.flat())if(resource?.dispose)owned.add(resource);
 return owner;
}
export function disposeOwnedResources(root,{remove=true}={}){
 if(!root)return 0;
 const resources=new Set();
 root.traverse(node=>{
  for(const resource of ownedResources.get(node)||[])resources.add(resource);
  ownedResources.delete(node);
 });
 for(const resource of resources)resource.dispose();
 if(remove)root.removeFromParent();
 return resources.size;
}
export function assetUrl(filename){
 if(filename.startsWith('/'))return filename;
 const origin=(import.meta.env.VITE_PUBLIC_SERVER_URL||'').replace(/\/$/,'');
 return `${origin}/assets/${encodeURIComponent(filename)}`;
}
export async function getGLB(filename,onProgress){
 if(onProgress&&!completed.has(filename)){
  if(!subscribers.has(filename))subscribers.set(filename,new Set());
  subscribers.get(filename).add(onProgress);
 }
 if(!pending.has(filename)){
  const promise=new Promise((resolve,reject)=>{
   loader.load(assetUrl(filename), data=>{
    const closedPose=data.animations?.find(clip=>/door.*close/i.test(clip.name));
    if(closedPose){
     const mixer=new THREE.AnimationMixer(data.scene);
     const action=mixer.clipAction(closedPose);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.update(closedPose.duration);
     data.scene.updateMatrixWorld(true);
    }
    completed.add(filename);resolve(data);
   }, evt=>{
    const value=evt.lengthComputable&&evt.total>0
      ?`${Math.round(evt.loaded/evt.total*100)}%`
      :`${(evt.loaded/1048576).toFixed(1)} MB transferred`;
    for(const cb of subscribers.get(filename)||[])cb(value);
   }, error=>reject(new Error(`Failed to load ${filename}. Check the asset host/tunnel and 3D format. ${error?.message||error}`)));
  });
  pending.set(filename,promise);
  promise.finally(()=>subscribers.delete(filename)).catch(()=>{});
  promise.catch(()=>pending.delete(filename));
 }
 return pending.get(filename);
}
export function prepMeshes(root){
 const meshes=[];
 root.traverse(n=>{
  if(n.isMesh){n.castShadow=true;n.receiveShadow=true;meshes.push(n);}
 });
 return meshes;
}
/** Center an imported scene and normalize to a predictable width in game world units. */
export function normalizeScene(object, targetSpan, {floor=true,visibleOnly=false}={}){
 object.updateMatrixWorld(true);
 const rawBox=visibleOnly?vehicleBounds(object).bounds:new THREE.Box3().setFromObject(object);
 const rawSize=rawBox.getSize(new THREE.Vector3());
 const horizontal=Math.max(rawSize.x,rawSize.z,0.0001);
 const scale=targetSpan/horizontal;
 object.scale.multiplyScalar(scale);
 object.updateMatrixWorld(true);
 const box=visibleOnly?vehicleBounds(object).bounds:new THREE.Box3().setFromObject(object);
 const mid=box.getCenter(new THREE.Vector3());
 object.position.x-=mid.x;
 object.position.z-=mid.z;
 if(floor)object.position.y-=box.min.y;
 object.updateMatrixWorld(true);
 return { scale, original:rawSize, bounds:visibleOnly?vehicleBounds(object).bounds:new THREE.Box3().setFromObject(object) };
}
/** Some downloaded car GLBs include a huge showroom ground plane. Exclude it
 * before calculating the vehicle scale, otherwise the actual car becomes tiny.
 * Only exclude flat, oversized mesh objects; never replace real car geometry. */
export function removeVehicleBackdrops(root){
 root.updateMatrixWorld(true);
 const candidates=[];
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible)return;
  const box=new THREE.Box3().setFromObject(mesh);
  if(box.isEmpty())return;
  const size=box.getSize(new THREE.Vector3());
  candidates.push({mesh,size,horizontal:Math.max(size.x,size.z),flatness:size.y/Math.max(.001,size.x,size.z)});
 });
 const widths=candidates.map(c=>c.horizontal).filter(x=>x>.001).sort((a,b)=>b-a);
 const typical=widths[Math.min(widths.length-1,Math.max(1,Math.floor(widths.length*.12)))]||1;
 let removed=0;
 for(const item of candidates){
  const name=`${item.mesh.name} ${item.mesh.material?.name||''}`.toLowerCase();
  const clearlyBackdrop=/(?:^|[_.\s-])(backdrop|studio.?floor|ground.?plane|showroom.?floor|display.?base)(?:$|[_.\s-])/.test(name);
  const enormousFlat=item.flatness<.018&&item.horizontal>Math.max(typical*5,10);
  if((clearlyBackdrop||enormousFlat)&&candidates.length>1){item.mesh.visible=false;removed++;}
 }
 return removed;
}

/** Returns actual visible vehicle bounds; a valid model has real renderable meshes. */
export function vehicleBounds(model){
 model.updateMatrixWorld(true);
 let meshCount=0,triangles=0;
 const box=new THREE.Box3();
 model.traverse(obj=>{
  if(!obj.isMesh||!obj.visible)return;
  const geom=obj.geometry;
  if(!geom?.attributes?.position)return;
  meshCount++;
  const verts=geom.index?.count||geom.attributes.position.count;
  triangles+=Math.floor(verts/3);
  box.expandByObject(obj);
 });
 const size=box.isEmpty()?new THREE.Vector3():box.getSize(new THREE.Vector3());
 return {meshCount,triangles,size,bounds:box};
}

export function buildCarModel(scene, tint, headingOffset=0, modelHeading=0){
 const pivot=new THREE.Group();
 const visual=cloneSkeleton(scene);
 // Closed-door poses change skinned bounds. Refresh before scale/grounding,
 // otherwise cached open-door bounds can shrink or lift the entire car.
 visual.updateMatrixWorld(true);
 visual.traverse(obj=>{
  if(obj.isSkinnedMesh){
   ownResources(obj,obj.skeleton);
   obj.skeleton.update();obj.computeBoundingBox();obj.computeBoundingSphere();
  }
 });
 const excludedBackdropCount=removeVehicleBackdrops(visual);
 const extents=vehicleBounds(visual).size;
 const defaultAngle=(extents.x>extents.z*1.08 ? Math.PI/2 : 0)+modelHeading;
 visual.rotation.y=defaultAngle+headingOffset;
 pivot.userData.redlineVisual=visual;
 pivot.userData.redlineDefaultAngle=defaultAngle;
 normalizeScene(visual,4.75,{visibleOnly:true});
 const audit=vehicleBounds(visual);
 if(!audit.meshCount||audit.size.lengthSq()<0.001||!Number.isFinite(audit.size.length()))throw new Error("Car GLB has no valid visible 3D mesh after import.");
 pivot.userData.vehicleAudit={meshCount:audit.meshCount,triangles:audit.triangles,dimensions:audit.size.toArray().map(n=>Number(n.toFixed(2))),excludedBackdropCount};
 const materialVariants=new Map();
 visual.traverse(obj=>{
  if(!obj.isMesh)return;
  obj.castShadow=true;obj.receiveShadow=true;
  const materials=Array.isArray(obj.material)?obj.material:[obj.material];
  const usesMaterialGroups=Array.isArray(obj.material);
  const clonedMaterials=materials.map(mat=>{
   if(!mat)return mat;
   const name=`${obj.name} ${mat.name}`.toLowerCase();
   const paintable=/(paint|body|shell|carpaint|car_base)/.test(name) || (!/(glass|window|wheel|rim|tire|tyre|light|grill|chrome|interior|seat|caliper|calliper|brake|badge|carbon|engine|suspension)/.test(name)&&mat.color&&mat.metalness>0.35);
   const part=/(rim|wheel1a)/.test(name)&&!/(tire|tyre|brake)/.test(name)?'rim'
    :/(glass|window)/.test(name)&&!/(light|red|amber|sticker)/.test(name)?'glass'
    :/(caliper|calliper)/.test(name)&&!/(badge)/.test(name)?'caliper'
    :paintable?'paint':null;
   // The same source material can serve many mesh pieces. Share one variant
   // per customizable part, while keeping this car independent of other cars.
   if(!materialVariants.has(mat))materialVariants.set(mat,new Map());
   const variants=materialVariants.get(mat),key=`${part||'original'}:${!!paintable}`;
   if(variants.has(key))return variants.get(key);
   const m=mat.clone();ownResources(pivot,m);variants.set(key,m);
   if(part&&m.color){
    m.userData.redlinePart=part;
    m.userData.redlineOriginal={color:m.color.clone(),metalness:m.metalness,roughness:m.roughness};
   }
   if(paintable && m.color){
    m.userData.redlinePaintable=true;
    if(tint){m.color.set(tint);m.metalness=Math.max(.52,m.metalness||0);m.roughness=Math.min(.34,m.roughness??.34);}
   }
   return m;
  });
  obj.material=usesMaterialGroups?clonedMaterials:clonedMaterials[0];
 });
 pivot.add(visual);
 return pivot;
}

/** Repaint materials already cloned for this car; no new GLB download, parsing or scene rebuild. */
export function carAppearanceSupport(model){
 const support={paint:false,rim:false,glass:false,caliper:false};
 model?.traverse(obj=>{
  if(!obj.isMesh)return;
  for(const material of Array.isArray(obj.material)?obj.material:[obj.material]){
   if(material?.userData?.redlinePart)support[material.userData.redlinePart]=true;
  }
 });
 return support;
}
export function repaintCar(model,tint,style={}){
 if(!model)return;
 const finish={gloss:[.68,.22],satin:[.42,.48],matte:[.08,.82],metallic:[.84,.3]}[style.finish]||[.68,.22];
 const rimColors={graphite:'#343a44',chrome:'#e4ebf3',gold:'#cfaa58'};
 const glassColors={smoke:'#59616c',limo:'#252b35',blue:'#76a9c9'};
 const caliperColors={red:'#de2343',yellow:'#ffd143',blue:'#2487ed'};
 model.traverse(obj=>{
  if(!obj.isMesh)return;
  const materials=Array.isArray(obj.material)?obj.material:[obj.material];
  for(const material of materials){
   if(!material?.color)continue;
   const part=material.userData?.redlinePart,original=material.userData?.redlineOriginal;
   if(!part||!original)continue;
   material.color.copy(original.color);
   material.metalness=original.metalness;
   material.roughness=original.roughness;
   if(part==='paint'&&tint){material.color.set(tint);material.metalness=finish[0];material.roughness=finish[1];}
   if(part==='rim'&&rimColors[style.rim]){material.color.set(rimColors[style.rim]);material.metalness=style.rim==='graphite'?.68:.94;material.roughness=style.rim==='chrome'?.13:.31;}
   if(part==='glass'&&glassColors[style.glass])material.color.multiply(new THREE.Color(glassColors[style.glass]));
   if(part==='caliper'&&caliperColors[style.caliper])material.color.set(caliperColors[style.caliper]);
  }
 });
}
