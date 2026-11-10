import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildCarModel,repaintCar,carAppearanceSupport,ownResources,disposeOwnedResources } from '../src/engine/assets.js';
import { WheelRig } from '../src/engine/WheelRig.js';

test('single-material car meshes retain renderable single materials',()=>{
 const source=new THREE.Group();
 const geometry=new THREE.BoxGeometry(2,1,4); geometry.clearGroups();
 const original=new THREE.MeshStandardMaterial({name:'body',metalness:.6});
 source.add(new THREE.Mesh(geometry,original));
 const car=buildCarModel(source,'#ff2233');
 let mesh;car.traverse(n=>{if(n.isMesh)mesh=n;});
 assert.equal(Array.isArray(mesh.material),false);
 assert.notEqual(mesh.material,original);
 assert.equal(mesh.material.color.getHexString(),'ff2233');
 assert.equal(car.userData.vehicleAudit.meshCount,1);
});
test('grouped multi-material car geometry keeps its groups and materials',()=>{
 const source=new THREE.Group();
 source.add(new THREE.Mesh(new THREE.BoxGeometry(2,1,4),Array.from({length:6},()=>new THREE.MeshStandardMaterial())));
 const car=buildCarModel(source,null);let mesh;car.traverse(n=>{if(n.isMesh)mesh=n;});
 assert.equal(mesh.material.length,6);assert.equal(mesh.geometry.groups.length,6);
});

test('skinned cars clone bones together with the vehicle',()=>{
 const source=new THREE.Group(),bone=new THREE.Bone();
 const geometry=new THREE.BoxGeometry(2,1,4),count=geometry.attributes.position.count;
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(count*4),4));
 const weights=new Float32Array(count*4);for(let i=0;i<count;i++)weights[i*4]=1;
 geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial());
 mesh.add(bone);mesh.bind(new THREE.Skeleton([bone]));source.add(mesh);
 const car=buildCarModel(source,null);let cloned;car.traverse(n=>{if(n.isSkinnedMesh)cloned=n;});
 assert.notEqual(cloned.skeleton.bones[0],bone);
 assert.equal(cloned.skeleton.bones[0].parent,cloned);
});

test('garage finishes change only supported parts and stock restores original materials',()=>{
 const source=new THREE.Group();
 for(const name of ['Paint','Wheel1A','GlassMtl','CaliperAZone']){
  const material=new THREE.MeshStandardMaterial({name,color:'#ffffff',metalness:.5,roughness:.5});
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);
  mesh.position.x=source.children.length*1.2;source.add(mesh);
 }
 const car=buildCarModel(source,'#ff2233');
 assert.deepEqual(carAppearanceSupport(car),{paint:true,rim:true,glass:true,caliper:true});
 repaintCar(car,'#2244dd',{finish:'matte',rim:'gold',glass:'smoke',caliper:'yellow'});
 const materials={};car.traverse(n=>{if(n.isMesh)materials[n.material.name]=n.material;});
 assert.equal(materials.Paint.color.getHexString(),'2244dd');
 assert.equal(materials.Paint.roughness,.82);
 assert.equal(materials.Wheel1A.color.getHexString(),'cfaa58');
 assert.equal(materials.CaliperAZone.color.getHexString(),'ffd143');
 assert.ok(materials.GlassMtl.color.r<.5);
 repaintCar(car,'#a9adb9',{finish:'gloss',rim:'stock',glass:'stock',caliper:'stock'});
 assert.equal(materials.Wheel1A.color.getHexString(),'ffffff');
 assert.equal(materials.GlassMtl.color.getHexString(),'ffffff');
 assert.equal(materials.CaliperAZone.color.getHexString(),'ffffff');
});

test('disposing one car releases its materials while preserving cached geometry and textures',()=>{
 const source=new THREE.Group(),geometry=new THREE.BoxGeometry(2,1,4),texture=new THREE.Texture();
 const material=new THREE.MeshStandardMaterial({name:'body',map:texture});
 source.add(new THREE.Mesh(geometry,material));
 const first=buildCarModel(source,'#ff2233'),second=buildCarModel(source,'#2244ff');
 const firstMaterial=first.userData.redlineVisual.children[0].material;
 const secondMaterial=second.userData.redlineVisual.children[0].material;
 let materialDisposals=0,cachedDisposals=0,otherCarDisposals=0;
 firstMaterial.addEventListener('dispose',()=>materialDisposals++);
 for(const resource of [geometry,texture,material])resource.addEventListener('dispose',()=>cachedDisposals++);
 secondMaterial.addEventListener('dispose',()=>otherCarDisposals++);
 const parent=new THREE.Group();parent.add(first,second);
 disposeOwnedResources(first);disposeOwnedResources(first);
 assert.equal(materialDisposals,1);
 assert.equal(cachedDisposals,0);
 assert.equal(otherCarDisposals,0);
 assert.equal(first.parent,null);
 assert.equal(second.parent,parent);
 repaintCar(second,'#44ff22',{finish:'matte'});
 assert.equal(secondMaterial.color.getHexString(),'44ff22');
});

test('shared body pieces reuse a material per car without mixing customizable parts',()=>{
 const source=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.6});
 for(const name of ['body_front','body_rear','rim']){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);mesh.name=name;
  mesh.position.x=source.children.length;source.add(mesh);
 }
 const car=buildCarModel(source,'#ff2233'),pieces=car.userData.redlineVisual.children;
 assert.equal(pieces[0].material,pieces[1].material);
 assert.notEqual(pieces[0].material,pieces[2].material);
 repaintCar(car,'#aa2200',{rim:'gold'});
 assert.equal(pieces[0].material.color.getHexString(),'aa2200');
 assert.equal(pieces[2].material.color.getHexString(),'cfaa58');
});

test('owned procedural resources are disposed once and unowned resources survive',()=>{
 const root=new THREE.Group(),child=new THREE.Group(),geometry=new THREE.BoxGeometry(),shared=new THREE.Texture();
 root.add(child);let disposals=0,sharedDisposals=0;
 geometry.addEventListener('dispose',()=>disposals++);shared.addEventListener('dispose',()=>sharedDisposals++);
 ownResources(root,geometry);ownResources(child,geometry);
 child.userData.sharedTexture=shared;
 assert.equal(disposeOwnedResources(root,{remove:false}),1);
 assert.equal(disposals,1);assert.equal(sharedDisposals,0);
 assert.equal(disposeOwnedResources(root),0);
});

test('wheel contact sampling uses the vehicle transform without traversing its mesh hierarchy',()=>{
 const source=new THREE.Group();
 source.add(new THREE.Mesh(new THREE.BoxGeometry(2,1,4),new THREE.MeshStandardMaterial()));
 for(const [name,x,z] of [['Wheel_Front_L_23',-.8,-1.3],['Wheel_Front_R_25',.8,-1.3],['Wheel_Rear_L_27',-.8,1.3],['Wheel_Rear_R_29',.8,1.3]]){
  const wheel=new THREE.Group();wheel.name=name;wheel.position.set(x,.35,z);source.add(wheel);
 }
 const model=buildCarModel(source,null),rig=new WheelRig(model,'f40'),carRoot=new THREE.Group();
 carRoot.add(model);carRoot.position.set(12,.08,-7);carRoot.rotation.y=.8;
 carRoot.updateMatrixWorld(true);
 const expected=rig.wheels.map(wheel=>new THREE.Vector3(wheel.x,0,wheel.z).applyMatrix4(carRoot.matrixWorld));
 let deepUpdates=0;carRoot.updateMatrixWorld=()=>deepUpdates++;
 const samples=[];
 rig.animate({wheelAngle:2,steer:.6,y:.08},{surface(x,z){samples.push({x,z});return {y:0};}},carRoot,1/60);
 assert.equal(deepUpdates,0);assert.equal(samples.length,4);
 samples.forEach((sample,index)=>{
  assert.ok(Math.abs(sample.x-expected[index].x)<1e-9);
  assert.ok(Math.abs(sample.z-expected[index].z)<1e-9);
 });
});
