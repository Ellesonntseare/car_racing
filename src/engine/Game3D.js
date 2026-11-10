import * as THREE from 'three';
import { getGLB,prepMeshes,normalizeScene,buildCarModel,repaintCar,carAppearanceSupport,vehicleBounds,ownResources,disposeOwnedResources } from './assets.js';
import { AudioEngine } from './AudioEngine.js';
import { createVehicleState,vehicleStep,distance3,sanitizeControls } from '../shared/physics.js';
import { CARS,MAPS,GARAGE,NOS,findCar,findMap } from '../assets/catalog.js';
import { classifyDriveableMeshes,findTrackSpawn } from './road.js';
import { TrackWorld } from './TrackWorld.js';
import { FixedStepper } from '../shared/FixedStepper.js';
import { Minimap } from './Minimap.js';
import { WheelRig } from './WheelRig.js';
import { createGarageProps,createGarageCollection } from './GarageProps.js';
import { LapTracker } from '../shared/LapTracker.js';
import { applyNosPickup } from '../shared/pickups.js';
import { chooseNosSites } from './nosSites.js';
import { RacingBots } from './RacingBots.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RACING_ROUTES } from '../assets/racingLines.js';
import { PeerInterpolator } from '../shared/PeerInterpolator.js';
const UP=new THREE.Vector3(0,1,0);
const temp=new THREE.Vector3();
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));

export class Game3D {
 constructor(host,{onStatus=()=>{},onTelemetry=()=>{},onLap=()=>{},onPickup=()=>{},onNosSites=()=>{},onNosClaim=()=>{}}={}){
  this.host=host;this.onStatus=onStatus;this.onTelemetry=onTelemetry;this.onLap=onLap;this.onPickup=onPickup;this.onNosSites=onNosSites;this.onNosClaim=onNosClaim;
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  this.mobile=matchMedia('(pointer:coarse)').matches;
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,this.mobile?1:1.35));
  this.renderer.setSize(host.clientWidth,host.clientHeight);
  this.renderer.shadowMap.enabled=true;
  this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=1.22;
  host.appendChild(this.renderer.domElement);
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#070b14');this.scene.fog=new THREE.Fog('#0a1423',90,460);
  const reflectionRoom=new RoomEnvironment(),reflectionGenerator=new THREE.PMREMGenerator(this.renderer);
  this.garageReflection=reflectionGenerator.fromScene(reflectionRoom,.04);
  reflectionRoom.dispose();reflectionGenerator.dispose();this.scene.environment=this.garageReflection.texture;
  this.camera=new THREE.PerspectiveCamera(64,host.clientWidth/Math.max(1,host.clientHeight),.08,4200);
  this.scene.add(new THREE.HemisphereLight(0xb9d7ff,0x24202b,2.1));
  this.sun=new THREE.DirectionalLight(0xffd4ad,2.5);this.sun.position.set(80,160,-100);this.sun.castShadow=true;
  this.sun.shadow.mapSize.set(this.mobile?512:1024,this.mobile?512:1024);this.sun.shadow.camera.left=-90;this.sun.shadow.camera.right=90;
  this.sun.shadow.camera.top=90;this.sun.shadow.camera.bottom=-90;
  this.sun.shadow.camera.near=.1;this.sun.shadow.camera.far=600;this.sun.shadow.bias=-0.00022;
  this.scene.add(this.sun,this.sun.target);this.sunOffset=new THREE.Vector3(80,160,-100);
  const accents=[['#ff2449',-9,4,-8],['#29c2ff',9,5,3]];
  this.garageLights=accents.map(([color,x,y,z])=>{
   const light=new THREE.PointLight(color,48,29,2);light.position.set(x,y,z);this.scene.add(light);return light;
  });
  this.mapRoot=new THREE.Group();this.scene.add(this.mapRoot);
  this.checkpointRoot=new THREE.Group();this.scene.add(this.checkpointRoot);
  this.nosRoot=new THREE.Group();this.scene.add(this.nosRoot);this.nosItems=[];this.nosCooldowns=[];this.nosSeed=1;this.nosRevision=0;
  this.carRoot=new THREE.Group();this.scene.add(this.carRoot);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const shadowCtx=shadowCanvas.getContext('2d');
  const shadowFade=shadowCtx.createRadialGradient(64,64,8,64,64,63);
  shadowFade.addColorStop(0,'rgba(0,0,0,.42)');shadowFade.addColorStop(.6,'rgba(0,0,0,.22)');shadowFade.addColorStop(1,'rgba(0,0,0,0)');
  shadowCtx.fillStyle=shadowFade;shadowCtx.fillRect(0,0,128,128);
  this.contactShadowGeometry=new THREE.PlaneGeometry(3.8,5.5);
  this.contactShadowMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,side:THREE.DoubleSide});
  this.carShadow=this.makeContactShadow();this.carRoot.add(this.carShadow);
  ownResources(this.carRoot,this.contactShadowGeometry,this.contactShadowMaterial,this.contactShadowMaterial.map);
  // Real cars come from hosted GLBs; small additive sprites are only the exhaust VFX.
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;
  const ctx=canvas.getContext('2d');const grad=ctx.createRadialGradient(32,80,3,32,70,60);
  grad.addColorStop(0,'rgba(235,255,255,1)');grad.addColorStop(.26,'rgba(67,212,255,.96)');grad.addColorStop(.58,'rgba(0,98,255,.52)');grad.addColorStop(1,'rgba(0,30,220,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,64,128);
  const tex=new THREE.CanvasTexture(canvas);
  ownResources(this.carRoot,tex);
  this.flames=[-.58,.58].map(x=>{
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
   sprite.position.set(x,.55,2.55);sprite.scale.set(.54,1.3,1);sprite.visible=false;this.carRoot.add(sprite);return sprite;
  });
  this.flames.forEach(sprite=>ownResources(sprite,sprite.material));
  this.peers=new Map();this.pendingPeers=new Map();this.peerStates=new Map();this.peerTracks=new Map();this.peerEpochs=new Map();this.cameraMode='chase';this.view='home';this.map=MAPS[0];this.car=CARS[0];
  this.tint='#a9adb9';this.appearance={finish:'gloss',rim:'stock',glass:'stock',caliper:'stock'};this.orientation=0;this.tuning={engine:0,handling:0,brakes:0};
  this.studio={lighting:'redline',autoOrbit:true};
  this.state=createVehicleState();this.input={steer:0,throttle:0,brake:0,drift:false,nitro:false};
  this.clock=new THREE.Clock();this.running=true;this.lastTelemetry=0;this.frame=0;
  this.down=new THREE.Raycaster();this.down.ray.direction.set(0,-1,0);this.down.far=65;
  this.cameraCollisionRay=new THREE.Raycaster();this.cameraGroundHeight=null;this.lastCarVisibility=null;
  this.roadMeshes=[];this.allMeshes=[];this.currentGround=0;this.roadSpawn=null;
  this.loadedEnvironment=null;this.loadedCarId=null;this.driveReady=false;this.snapCamera=true;
  this.audio=new AudioEngine();this.raceStart=null;this.multiplayer=false;
  this.raceMode=false;this.raceFinished=false;this.raceLaps=0;this.raceElapsed=0;this.raceBots=null;
  const minimapCanvas=document.getElementById('minimap');
  this.minimap=minimapCanvas?new Minimap(minimapCanvas):null;
  this.orbitAngle=-.35;this.orbitRadius=8;this.previewTurn=0;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
  this.renderer.domElement.addEventListener('pointerdown',e=>{ if(this.view==='garage'||this.view==='home'||this.view==='maps'){this.dragging=true;this.pointerX=e.clientX;this.audio.start();} });
  window.addEventListener('pointerup',()=>{this.dragging=false;});
  this.renderer.domElement.addEventListener('pointermove',e=>{if(this.dragging){this.orbitAngle+=(e.clientX-this.pointerX)*.006;this.pointerX=e.clientX;}});
  this.renderer.domElement.addEventListener('wheel',e=>{if(this.view!=='drive'){this.orbitRadius=clamp(this.orbitRadius+Math.sign(e.deltaY)*.55,this.loadedEnvironment==='garage'?6:4.8,this.loadedEnvironment==='garage'?9:16);}}, {passive:true});
  this.stepper=new FixedStepper();
  this.previousState={...this.state};this.renderState={...this.state};
  this.last=performance.now();this.animate();
 }
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
 makeContactShadow(){
  const shadow=new THREE.Mesh(this.contactShadowGeometry,this.contactShadowMaterial);
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.065;shadow.renderOrder=1;
  return shadow;
 }
 async loadCar(id,options={}){
  const target=findCar(id);this.car=target;
  if(options.tint!==undefined)this.tint=options.tint;
  if(options.style)this.appearance={...this.appearance,...options.style};
  if(this.loadedCarId===target.id&&this.model){
   this.applyCarAppearance();
   return;
  }

  this.onStatus(`Preparing ${target.name}…`);
  const gltf=await getGLB(target.file,p=>this.onStatus(`Preparing your car ${p}`));
  if(this.car.id!==target.id)return;
  const model=buildCarModel(gltf.scene,this.tint,0,target.modelHeading);
  if(this.model)disposeOwnedResources(this.model);this.carRoot.add(model);this.model=model;
  const carAudit=vehicleBounds(model);
  if(carAudit.meshCount<1||carAudit.size.y<.03)throw new Error(`Car ${target.name} imported but its geometry is invisible or nearly flat. Inspect the GLB in Blender.`);
  this.carAudit=model.userData.vehicleAudit;
  this.wheelRig=new WheelRig(model,id);
  this.loadedCarId=target.id;
  this.garageCollection?.setSelected(id);
  this.setupLapTracker();
  console.info('[REDLINE] Car imported:',target.file,this.carAudit);
  this.onStatus(`${target.name} ready`);
  this.applyCarAppearance();
 }
 applyCarAppearance(){
  if(!this.model)return;
  repaintCar(this.model,this.tint,this.appearance);
  const visual=this.model.userData.redlineVisual;
  if(visual)visual.rotation.y=(this.model.userData.redlineDefaultAngle||0);
 }
 appearanceSupport(){return carAppearanceSupport(this.model);}
 setStudio({lighting=this.studio.lighting,autoOrbit=this.studio.autoOrbit,zoom=this.orbitRadius}={}){
  this.studio={lighting,autoOrbit};this.orbitRadius=clamp(zoom,6,9);
  const palettes={redline:['#ff2449','#29c2ff'],daylight:['#fff3da','#cadfff'],midnight:['#7157ff','#12d7ef']};
  this.garageLights.forEach((light,i)=>{light.color.set((palettes[lighting]||palettes.redline)[i]);light.intensity=lighting==='daylight'?60:48;});
 }
 async customize({tint=this.tint,style=this.appearance,orientation=this.orientation,tuning=this.tuning}={}){
  this.tint=tint;this.appearance={...this.appearance,...style};this.orientation=orientation;this.tuning=tuning;
  // No repeated GLB downloads, scene clones or material allocations for each paint click.
  if(this.model){
   repaintCar(this.model,tint,this.appearance);
   const visual=this.model.userData.redlineVisual;
   if(visual)visual.rotation.y=(this.model.userData.redlineDefaultAngle||0);
   return;
  }
  if(this.car)await this.loadCar(this.car.id,{tint,style:this.appearance,orientation});
 }
 async loadEnvironment(id){
  this.clearRaceBots();
  const requested=id==='garage'?'garage':findMap(id).id;
  this.requestedEnvironment=requested;
  const isGarage=requested==='garage';
  const chosen=isGarage?GARAGE:findMap(requested);
  this.onStatus(`Preparing ${isGarage?'the garage':chosen.name}…`);
  this.driveReady=false;
  const data=await getGLB(chosen.file,p=>this.onStatus(`Preparing the road ${p}`));
  if(this.requestedEnvironment!==requested)return;
  const root=data.scene.clone(true);
  for(const child of [...this.mapRoot.children])disposeOwnedResources(child);
  this.mapRoot.add(root);
  this.garageCollection=null;
  this.clearNos();
  this.mapRoot.visible=this.view==='garage'||this.view==='drive';
  const metrics=normalizeScene(root,isGarage?GARAGE.span:chosen.span);
  this.allMeshes=prepMeshes(root);
  if(isGarage){
   const props=createGarageProps({
    floorAt:(x,z)=>this.surfaceHit(x,z,0,this.allMeshes)?.y??0,
    isCurrent:()=>this.requestedEnvironment==='garage'
   });
   this.garageProps=props;this.mapRoot.add(props.root);
   props.ready.then(results=>{for(const result of results)if(result.status==='rejected')console.warn('[REDLINE] Garage prop unavailable:',result.reason);});
   this.garageCollection=createGarageCollection({
    floorAt:(x,z)=>this.surfaceHit(x,z,0,this.allMeshes)?.y??0,
    isCurrent:()=>this.requestedEnvironment==='garage',selectedId:this.car.id
   });
   this.mapRoot.add(this.garageCollection.root);
  }
  if(this.mobile)for(const mesh of this.allMeshes)mesh.castShadow=false;
  const classified=classifyDriveableMeshes(this.allMeshes,requested);
  this.roadMeshes=classified.driveable;
  this.trackWorld=isGarage?null:new TrackWorld(this.allMeshes,this.roadMeshes,{groundMeshes:classified.ground});
  if(this.trackWorld)this.minimap?.setWorld(this.trackWorld);
  this.keepOnRoad=false;
  this.prepareDistanceCulling();
  this.roadQuality=classified.explicit.length?'named-road':classified.terrain.length?'terrain-fallback':'unknown-surfaces';
  this.map=isGarage?this.map:chosen;
  // In gameplay the camera sees only the next stretch of road, not an overview
  // of the entire imported map. Frustum culling hides objects outside POV.
  this.scene.fog=new THREE.Fog(isGarage?'#080b12':'#0a1423',isGarage?45:85,isGarage?155:Math.min(480,Math.max(250,chosen.span*.72)));
  this.camera.far=isGarage?220:Math.min(620,Math.max(340,chosen.span*.85));
  this.camera.updateProjectionMatrix();
  this.garageLights.forEach(l=>l.visible=isGarage);
  this.sun.intensity=isGarage?1:2.0;
  this.scene.environment=isGarage?this.garageReflection.texture:null;
  this.scene.background=new THREE.Color(isGarage?'#080b12':'#0a1123');
  this.mapSpan=Math.max(metrics.bounds.max.x-metrics.bounds.min.x,metrics.bounds.max.z-metrics.bounds.min.z);
  this.state=createVehicleState();this.currentGround=0;this.cameraGroundHeight=null;
  if(isGarage){
   // Center of the circular display rail in the supplied warehouse model.
   this.state.x=-5.45;this.state.z=-12;
   const floor=this.surfaceHit(this.state.x,this.state.z,0,this.allMeshes);
   this.state.y=(floor?.y??0)+.01;
   this.orbitRadius=clamp(this.orbitRadius,6,9);
  }
  this.mapBounds=metrics.bounds;
  this.roadSpawn=null;
  if(!isGarage){
   const canonical=RACING_ROUTES[chosen.id]?.spawn;
   const contact=canonical&&this.trackWorld.support(canonical,1.15,1.65);
   const spawn=contact&&!this.trackWorld.blocked({...canonical,...contact},1.27,2.25)?{...canonical,...contact,mesh:'circuit start'}:this.findSpawn();
   if(!spawn||spawn.warning){
    throw new Error(`No reliable road surface found in ${chosen.name}. The map GLB must include a drivable, upward-facing road mesh; run CHECK_REDLINE_ASSETS.bat, then inspect the map in Blender.`);
   }
   this.roadSpawn=spawn;
   this.applySpawn(spawn);
   this.setupLapTracker();
   this.driveReady=true;
   console.info(`[REDLINE] ${chosen.name}: ${this.allMeshes.length} meshes; road type=${this.roadQuality}; spawn=`,spawn);
  }
  this.carRoot.position.set(this.state.x,this.state.y,this.state.z);
  this.loadedEnvironment=requested;this.snapCamera=true;
  if(!isGarage)this.createNosPickups(requested).catch(e=>console.warn('[REDLINE] NOS model unavailable:',e));
  this.onStatus(`${isGarage?'Garage':chosen.name} ready`);
 }
 clearNos(resetCooldowns=true){
  this.nosRevision++;
  for(const item of this.nosItems)disposeOwnedResources(item.group);
  this.nosRoot.clear();this.nosItems=[];if(resetCooldowns)this.nosCooldowns=[];
 }
 async createNosPickups(mapId){
  this.clearNos(false);
  const revision=this.nosRevision;
  const sites=chooseNosSites(this.trackWorld,this.roadSpawn,this.nosSeed);
  this.nosSites=sites;
  if(!sites.length)return;
  this.onNosSites(sites);
  const gltf=await getGLB(NOS.file);
  if(this.requestedEnvironment!==mapId||this.nosRevision!==revision)return;
  const bottle=gltf.scene.clone(true);
  normalizeScene(bottle,.54);
  for(const [index,pose] of sites.entries()){
   const group=new THREE.Group(),model=cloneSkeleton(bottle);
   model.traverse(n=>{if(n.isMesh)n.castShadow=true;});group.add(model);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.64,.07,8,32),new THREE.MeshBasicMaterial({color:0x35ddff,transparent:true,opacity:.82,depthWrite:false}));
   ring.rotation.x=Math.PI/2;ring.position.y=.9;group.add(ring);
   ownResources(ring,ring.geometry,ring.material);
   const floor=this.trackWorld.surface(pose.x,pose.z,pose.y);
   const height=floor?.y??pose.y-.08;
   group.position.set(pose.x,height+.45,pose.z);
   this.nosRoot.add(group);
   this.nosItems.push({group,ring,x:pose.x,z:pose.z,floor:height,readyAt:this.nosCooldowns[index]||0,pending:false,phase:index*1.8});
  }
 }
 setNosCooldown(index,readyAt){
  if(!Number.isInteger(index)||index<0||index>20)return;
  this.nosCooldowns[index]=readyAt;
  const item=this.nosItems[index];if(item){item.readyAt=readyAt;item.pending=false;item.group.visible=Date.now()>=readyAt;}
 }
 setNosState(cooldowns){for(const [index,readyAt] of cooldowns.entries())this.setNosCooldown(index,readyAt);}
 rejectNosClaim(index){const item=this.nosItems[index];if(item)item.pending=false;}
 grantNos(index,readyAt,resources=null){this.setNosCooldown(index,readyAt);if(resources)Object.assign(this.state,resources);else applyNosPickup(this.state,this.car);this.onPickup();}
 prepareDistanceCulling(){
  this.distanceCull=[];
  const maxDistance=360;
  for(const mesh of this.allMeshes){
   mesh.visible=true;
   if(!mesh.isMesh)continue;
   const box=new THREE.Box3().setFromObject(mesh);
   const dimensions=box.getSize(new THREE.Vector3());
   // Huge track/terrain meshes must remain visible: they can extend under the car.
   const radius=Math.hypot(dimensions.x,dimensions.z)*.5;
   if(radius>maxDistance||!Number.isFinite(radius))continue;
   const center=box.getCenter(new THREE.Vector3());
   this.distanceCull.push({mesh,x:center.x,z:center.z,radius});
  }
 }
 updateDistanceCulling(){
  if(!this.distanceCull)return;
  const x=this.state.x,z=this.state.z;
  const maxDistance=Math.min(430,this.camera.far*.82);
  for(const {mesh,x:mx,z:mz,radius} of this.distanceCull){
   mesh.visible=(x-mx)**2+(z-mz)**2<(maxDistance+radius)**2;
  }
 }
 /** Scan the actual imported roads on EACH map; do not drop the car at map origin. */
 findSpawn(){
  if(this.roadSpawn)return {...this.roadSpawn};
  const result=findTrackSpawn({
   roadMeshes:this.roadMeshes,allMeshes:this.allMeshes,
   bounds:this.mapBounds||new THREE.Box3().setFromObject(this.mapRoot),
   surfaceHit:(x,z,y,meshes,wide)=>this.surfaceHit(x,z,y,meshes,wide),
   canSpawn:pose=>!this.trackWorld?.blocked(pose,1.5,2.5)&&!!this.trackWorld?.support(pose,1.4,1.7),
  });
  if(result)return result;
  console.warn('[REDLINE] No verifiable road found; map needs a manually calibrated spawn!');
  return null;
 }
 applySpawn(spawn){
  this.state.x=spawn.x;this.state.z=spawn.z;this.state.y=spawn.y;
  this.state.heading=spawn.heading||0;this.currentGround=spawn.y-.1;
  this.state.steer=0;this.state.yawRate=0;this.roadPitch=0;this.roadRoll=0;
  this.previousState={...this.state,pitch:0,roll:0};this.renderState={...this.state};
  this.stepper?.reset();
  this.snapCamera=true;
 }
 surfaceHit(x,z,y=0,meshes=null,wide=false){
  if(this.trackWorld&&(!meshes||meshes===this.roadMeshes))return this.trackWorld.surface(x,z,y,wide,!this.keepOnRoad);
  const colliders=meshes|| (this.roadMeshes.length?this.roadMeshes:this.allMeshes);
  if(colliders.length===0)return null;
  this.down.ray.origin.set(x,wide?1200:y+5,z);this.down.far=wide?2500:35;
  const hits=this.down.intersectObjects(colliders,false);
  for(const hit of hits){
   if(!hit.face)continue;
   const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
   if(normal.y<.68)continue;
   if(!wide&&Math.abs(hit.point.y-y)>8)continue;
   return {y:hit.point.y,object:hit.object};
  }
  return null;
 }
 setView(v){
  this.host.closest('#game-shell').dataset.view=v;
  this.view=v;this.dragging=false;this.cameraMode=v==='drive'?this.cameraMode:'chase';
  this.scene.environment=v==='drive'?null:this.garageReflection.texture;
  this.mapRoot.visible=v==='drive'||v==='garage';
  if(v==='drive'){this.audio.start();this.snapCamera=true;}
  else this.clearRaceBots();
 }
 setInput(input){this.input=sanitizeControls(input);}
 setCamera(mode){this.cameraMode=mode;}
 cycleCamera(){const modes=['chase','cockpit','hood','bumper'];this.cameraMode=modes[(modes.indexOf(this.cameraMode)+1)%modes.length];return this.cameraMode;}
 resetCar(){
  this.state=createVehicleState();
  const target=this.personalSpawn||this.roadSpawn||this.findSpawn();if(target)this.applySpawn(target);
  this.lapTracker?.reset();
  if(this.raceMode){this.raceLaps=0;this.raceElapsed=0;this.raceFinished=false;this.raceBots?.reset();}
  this.updateCheckpointVisuals();
 }
 clearRaceBots(){this.raceBots?.clear();this.raceBots=null;this.raceMode=false;this.raceFinished=false;}
 async prepareRaceBots(){
  this.clearRaceBots();
  const bots=new RacingBots(this.scene,this.trackWorld,this.map.id,()=>this.makeContactShadow());
  this.raceBots=bots;
  await bots.load(this.car.id);
  if(this.raceBots!==bots){bots.clear();return;}
  this.raceMode=true;this.raceLaps=0;this.raceElapsed=0;this.raceFinished=false;
 }
 finishRace(){this.raceFinished=true;this.paused=true;}
 raceStandings(){
  if(!this.raceBots)return [];
  const distance=Math.min(this.raceBots.line.length*3,this.lapTracker?.raceDistance||0);
  return this.raceBots.standings(distance,this.raceLaps>=3?this.raceElapsed:null);
 }
 clearCheckpoints(){
  for(const child of [...this.checkpointRoot.children])disposeOwnedResources(child);
  this.checkpointRoot.clear();this.checkpointMarkers=[];
 }
 buildCheckpoints(){
  this.clearCheckpoints();
  if(!this.lapTracker)return;
  for(const [index,point] of this.lapTracker.checkpoints.entries()){
   const group=new THREE.Group();group.position.set(point.x,point.y,point.z);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(2.45,.13,8,32),new THREE.MeshBasicMaterial({color:0x7da9be,transparent:true,opacity:.68,depthWrite:false}));
   ring.position.y=3.2;group.add(ring);
   ownResources(ring,ring.geometry,ring.material);
   const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.8,6),new THREE.MeshBasicMaterial({color:0x7da9be,transparent:true,opacity:.65}));
   pole.position.y=1.4;group.add(pole);
   ownResources(pole,pole.geometry,pole.material);
   const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
   const context=canvas.getContext('2d');context.fillStyle='#08121d';context.beginPath();context.arc(64,64,53,0,Math.PI*2);context.fill();
   context.strokeStyle='#f8d36a';context.lineWidth=7;context.stroke();context.fillStyle='#ffffff';context.font='900 70px Arial';context.textAlign='center';context.textBaseline='middle';context.fillText(String(index+1),64,68);
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));
   sprite.position.y=4.6;sprite.scale.set(2.2,2.2,1);group.add(sprite);
   ownResources(sprite,sprite.material,sprite.material.map);
   this.checkpointRoot.add(group);this.checkpointMarkers.push({ring,pole,group});
  }
  this.updateCheckpointVisuals();
 }
 updateCheckpointVisuals(){
  for(const [index,marker] of (this.checkpointMarkers||[]).entries()){
   const active=index===this.lapTracker?.nextCheckpoint,passed=index<(this.lapTracker?.nextCheckpoint||0);
   const color=passed?0x49f8a9:active?0xffce5b:0x7da9be;
   marker.ring.material.color.setHex(color);marker.pole.material.color.setHex(color);
   marker.ring.material.opacity=active?1:.55;
  }
 }
 setupLapTracker(){
  this.lapTracker=this.trackWorld&&this.roadSpawn&&this.loadedCarId
   ?new LapTracker(this.map.id,this.loadedCarId,this.roadSpawn,this.trackWorld):null;
  this.buildCheckpoints();
  this.refreshGhost();
 }
 refreshGhost(){
  if(this.ghostCar)disposeOwnedResources(this.ghostCar);this.ghostCar=null;this.ghostWheelRig=null;
  if(!this.lapTracker?.best||!this.model)return;
  this.ghostCar=cloneSkeleton(this.model);
  this.ghostCar.traverse(n=>{
   if(!n.isMesh)return;
   n.material=(Array.isArray(n.material)?n.material:[n.material]).map(m=>{
    const c=m.clone();c.color?.lerp(new THREE.Color('#40dfff'),.65);c.transparent=true;c.opacity=.29;c.depthWrite=false;ownResources(n,c);return c;
   });
   if(n.material.length===1)n.material=n.material[0];
   n.castShadow=false;n.receiveShadow=false;
   if(n.skeleton)ownResources(n,n.skeleton);
  });
  this.ghostWheelRig=new WheelRig(this.ghostCar,this.loadedCarId);
  this.ghostCar.visible=false;this.scene.add(this.ghostCar);
 }
 updateCar(dt){
  const simulationCar={...this.car,acceleration:this.car.acceleration+this.tuning.engine*.24,handling:this.car.handling+this.tuning.handling*.3,brake:this.car.brake+this.tuning.brakes*.25,speedBonus:this.tuning.engine*4};
  if(this.view==='drive'&&this.driveReady&&!this.loadingDrive&&!this.paused&&(!this.raceStart||Date.now()>=this.raceStart)){
   if(this.raceMode){this.raceElapsed+=dt;this.raceBots?.update(dt,true);}
   const previous={...this.state};
   vehicleStep(this.state,this.input,simulationCar,dt);
   if(this.trackWorld){
    const width=Math.max(.85,Math.min(1.4,(this.carAudit?.dimensions?.[0]||2.5)*.48));
    const result=this.trackWorld.move(previous,this.state,{keepOnRoad:this.keepOnRoad,width,allowSlide:true});
    Object.assign(this.state,{x:result.x,y:result.y,z:result.z,heading:result.heading});
    this.roadPitch=result.pitch||0;this.roadRoll=result.roll||0;
    this.state.pitch=this.roadPitch;this.state.roll=this.roadRoll;
    if(result.blocked)this.lastContact=result.reason; else if(Math.hypot(result.x-previous.x,result.z-previous.z)>.001)this.lastContact='on road';
    if(result.blocked){this.state.speed=0;this.state.sideSlip=0;this.state.yawRate=0;this.state.nitroActive=false;}
    this.currentGround=this.state.y-.08;
   }
   if(this.lapTracker&&!this.multiplayer){
    const checkpointBefore=this.lapTracker.nextCheckpoint;
    const lap=this.lapTracker.update(previous,this.state,dt);
    if(this.lapTracker.nextCheckpoint!==checkpointBefore)this.updateCheckpointVisuals();
    if(lap){
     if(this.raceMode)this.raceLaps++;
     this.onLap({...lap,raceLaps:this.raceLaps,raceElapsed:this.raceElapsed});
     if(lap.best)this.refreshGhost();this.updateCheckpointVisuals();
    }
   }
   for(const [index,pickup] of this.nosItems.entries()){
    if(pickup.pending||Date.now()<pickup.readyAt||Math.hypot(this.state.x-pickup.x,this.state.z-pickup.z)>2||Math.abs(this.state.y-pickup.floor)>2.5)continue;
    if(this.multiplayer){pickup.pending=true;this.onNosClaim(index);}
    else this.grantNos(index,Date.now()+14000);
   }
  }
  if(this.view==='drive'&&this.driveReady&&!this.trackWorld){
   const floor=this.surfaceHit(this.state.x,this.state.z,this.state.y);
   if(floor)this.currentGround=floor.y;
   this.state.y+=clamp(this.currentGround+.08-this.state.y,-.9,.9)*.36;
   // Respect the actual map bounding rectangle, rather than assuming a square.
   const b=this.mapBounds;
   if(b&&(this.state.x<b.min.x||this.state.x>b.max.x||this.state.z<b.min.z||this.state.z>b.max.z)){
    this.state.x=clamp(this.state.x,b.min.x+.5,b.max.x-.5);
    this.state.z=clamp(this.state.z,b.min.z+.5,b.max.z-.5);
    this.state.speed*=.2;
   }
  }
 }
 renderCar(dt,alpha){
  const previous=this.previousState||this.state,v=this.state;
  const headingDelta=Math.atan2(Math.sin(v.heading-previous.heading),Math.cos(v.heading-previous.heading));
  const blend=(key)=>(previous[key]??v[key])+(v[key]-(previous[key]??v[key]))*alpha;
  this.renderState={...v,x:blend('x'),y:blend('y'),z:blend('z'),heading:previous.heading+headingDelta*alpha,wheelAngle:blend('wheelAngle'),steer:blend('steer')};
  this.carRoot.position.set(this.renderState.x,this.renderState.y,this.renderState.z);
  if(this.view==='drive'&&this.driveReady&&this.frame%16===0)this.updateDistanceCulling();
  // Sample the interpolated render position too: delaying slope rotation makes
  // the nose cut through uphill asphalt even when simulation contact is valid.
  const width=Math.max(.85,Math.min(1.4,(this.carAudit?.dimensions?.[0]||2.5)*.48));
  const contact=this.view==='drive'&&this.trackWorld?.support(this.renderState,width,1.65,!this.keepOnRoad);
  this.visualPitch=contact?.pitch??this.roadPitch??0;
  this.visualRoll=contact?.roll??this.roadRoll??0;
  if(contact){this.renderState.y=contact.y;this.carRoot.position.y=contact.y;}
  this.carRoot.rotation.set(this.view==='drive'?this.visualPitch:0,this.renderState.heading,this.view==='drive'?this.visualRoll:0,'YXZ');
  if(this.view==='drive'&&this.driveReady)this.wheelRig?.animate(this.renderState,this.trackWorld,this.carRoot,dt);
  if(this.ghostCar){
   const ghost=this.view==='drive'&&!this.multiplayer?this.lapTracker?.ghostPose():null;
   this.ghostCar.visible=!!ghost;
   if(ghost){
    const contact=this.trackWorld?.support(ghost,width,1.65,!this.keepOnRoad);
    const y=contact?.y??ghost.y;
    this.ghostCar.position.set(ghost.x,y,ghost.z);this.ghostCar.rotation.set(contact?.pitch??ghost.pitch??0,ghost.heading,contact?.roll??ghost.roll??0,'YXZ');
    this.ghostWheelRig?.animate({...ghost,y},this.trackWorld,this.ghostCar,dt);
   }
  }
  for(const flame of this.flames){flame.visible=this.view==='drive'&&this.state.nitroActive;flame.scale.y=1.2+Math.sin(performance.now()*.04)*.23;}
  // Do not roll the wheels through the road to simulate body suspension.
  if(this.model)this.model.rotation.z=0;
  this.audio.update(this.view==='drive'?Math.abs(this.state.speed):0,this.input.throttle,this.state.nitroActive,this.state.rpm,this.car?.drive?.redline);
  if(this.view==='drive'&&this.frame%3===0)this.minimap?.draw(this.renderState,{
   checkpoints:this.multiplayer?[]:this.lapTracker?.checkpoints||[],visited:this.lapTracker?.visited||0,
   activeCheckpoint:this.lapTracker?.nextCheckpoint??-1,bots:this.raceBots?.markers()||[],
   nos:this.nosItems.filter(item=>Date.now()>=item.readyAt)
  });
  this.checkpointRoot.visible=this.view==='drive'&&!this.multiplayer;
  this.nosRoot.visible=this.view==='drive';
  this.carShadow.visible=this.view==='drive';
  for(const pickup of this.nosItems){
   pickup.group.visible=Date.now()>=pickup.readyAt;
   if(pickup.group.visible){
    const pulse=performance.now()*.003+pickup.phase;
    pickup.group.position.y=pickup.floor+.48+Math.sin(pulse)*.19;
    pickup.group.rotation.y+=dt*1.35;
    pickup.ring.scale.setScalar(1+Math.sin(pulse*2)*.18);
    pickup.ring.material.opacity=.62+Math.sin(pulse*2)*.2;
   }
  }
 }
 updateCamera(dt){
  if(this.view!=='drive'){
   if(this.studio.autoOrbit)this.orbitAngle+=dt*.085;
   const ang=this.orbitAngle,r=this.orbitRadius;
   const focus=this.carRoot.position.clone().add(new THREE.Vector3(0,1.3,0));
   const desired=focus.clone().add(new THREE.Vector3(Math.sin(ang)*r,r*.34,Math.cos(ang)*r));
   if(this.loadedEnvironment==='garage'&&this.mapBounds){
    const b=this.mapBounds;
    desired.x=clamp(desired.x,b.min.x+1.3,b.max.x-1.3);
    desired.z=clamp(desired.z,b.min.z+1.3,b.max.z-1.3);
    desired.y=clamp(desired.y,b.min.y+1.1,b.max.y-1.5);
    const ray=desired.clone().sub(focus),distance=ray.length();
    if(distance>1){
     this.cameraCollisionRay.set(focus,ray.normalize());this.cameraCollisionRay.near=.35;this.cameraCollisionRay.far=distance;
     const obstruction=this.cameraCollisionRay.intersectObjects(this.allMeshes,false).find(hit=>hit.distance>.75);
     if(obstruction)desired.copy(focus).addScaledVector(ray,Math.max(.65,obstruction.distance-.4));
    }
   }
   this.camera.position.lerp(desired,Math.min(1,dt*3.1));this.camera.lookAt(focus);
   this.camera.fov+=((this.loadedEnvironment==='garage'?56:48)-this.camera.fov)*Math.min(1,dt*3);this.camera.updateProjectionMatrix();return;
  }
  const v=this.renderState||this.state;
  const right=new THREE.Vector3(1,0,0).applyQuaternion(this.carRoot.quaternion);
  const back=new THREE.Vector3(0,0,1).applyQuaternion(this.carRoot.quaternion);
  const localUp=new THREE.Vector3(0,1,0).applyQuaternion(this.carRoot.quaternion);
  const bodyHeight=this.carAudit?.dimensions?.[1]||1.4;
  const origin=this.carRoot.position;
  const desired=new THREE.Vector3();const focus=new THREE.Vector3();
  if(this.cameraMode==='cockpit'){
   const eye=bodyHeight*.77;
   desired.copy(origin).addScaledVector(back,.22).addScaledVector(right,-.26).addScaledVector(localUp,eye);
   focus.copy(desired).addScaledVector(back,-24);
  }else if(this.cameraMode==='hood'){
   desired.copy(origin).addScaledVector(back,-1.4).addScaledVector(localUp,bodyHeight*.81+.12);
   focus.copy(origin).addScaledVector(back,-28).addScaledVector(localUp,bodyHeight*.55);
  }else if(this.cameraMode==='bumper'){
   desired.copy(origin).addScaledVector(back,-2.6).addScaledVector(localUp,bodyHeight*.38);
   focus.copy(origin).addScaledVector(back,-28).addScaledVector(localUp,bodyHeight*.55);
  }else{
   // Chase POV: always just behind the car, never a high-altitude map camera.
   desired.copy(origin).addScaledVector(back,6.8+Math.min(1.8,Math.abs(v.speed)*.016)).add(new THREE.Vector3(0,2.55+Math.min(.35,Math.abs(v.speed)*.006),0));
   focus.copy(origin).addScaledVector(back,-8).add(new THREE.Vector3(0,1.25,0));
  }
  if(this.cameraMode==='chase'){
   // Some imported tracks have banks, hills or elevated scenery behind the car.
   // If the chase camera is below asphalt, the road itself masks the entire car.
   if(this.frame%5===0||this.cameraGroundHeight===null){
    const floor=this.surfaceHit(desired.x,desired.z,desired.y,this.roadMeshes,false);
    this.cameraGroundHeight=floor?.y??null;
   }
   if(this.cameraGroundHeight!==null){
    desired.y=Math.max(desired.y,this.cameraGroundHeight+1.75);
   }
   // Pull the camera in front of any nearby intervening track surface.
   // The ray deliberately ignores the vehicle's own meshes.
   const rayVector=desired.clone().sub(focus),length=rayVector.length();
   if(length>.25&&this.allMeshes.length){
    this.cameraCollisionRay.set(focus,rayVector.multiplyScalar(1/length));
    this.cameraCollisionRay.near=.4;
    this.cameraCollisionRay.far=length;
    const collision=this.cameraCollisionRay.intersectObjects(this.allMeshes,false).find(hit=>hit.distance>2);
    if(collision)desired.copy(focus).addScaledVector(this.cameraCollisionRay.ray.direction,Math.max(2,collision.distance-.6));
   }
  }
  // Snap immediately on entering a track or resetting so the player never
  // sees the entire map during a long fly-in from the menu's orbit camera.
  if(this.snapCamera){this.camera.position.copy(desired);this.snapCamera=false;}
  else this.camera.position.lerp(desired,1-Math.exp(-dt*(this.cameraMode==='chase'?8:19)));
  this.camera.lookAt(focus);
  // If imported track geometry still obstructs the camera-to-car sightline,
  // raise the chase camera rather than showing a road surface with no car.
  if(this.cameraMode==='chase'&&this.frame%6===0&&this.allMeshes.length){
   const target=origin.clone().add(new THREE.Vector3(0,1.1,0));
   const direction=target.clone().sub(this.camera.position);
   const length=direction.length();
   if(length>2){
    this.cameraCollisionRay.set(this.camera.position,direction.multiplyScalar(1/length));
    this.cameraCollisionRay.near=.05;
    this.cameraCollisionRay.far=length-.5;
    const obstruction=this.cameraCollisionRay.intersectObjects(this.allMeshes,false)[0];
    if(obstruction){
     this.camera.position.y=Math.max(this.camera.position.y,obstruction.point.y+2.75);
     this.camera.lookAt(focus);
     this.snapCamera=true;
    }
   }
  }
  const fov=(this.cameraMode==='chase'?66:72)+Math.min(10,Math.abs(v.speed)*.11)+(v.nitroActive?5:0);
  this.camera.fov+=(fov-this.camera.fov)*(1-Math.exp(-dt*3.5));this.camera.updateProjectionMatrix();
 }
 async addPeer(id,carId,name,appearance){
  if(this.peers.has(id))return;
  if(this.pendingPeers.has(id))return this.pendingPeers.get(id);
  const epoch=this.peerEpochs.get(id)||0;
  const promise=(async()=>{
   const gltf=await getGLB(findCar(carId).file);
   if(this.peers.has(id)||(this.peerEpochs.get(id)||0)!==epoch||this.view!=='drive'||!this.multiplayer)return;
   const obj=buildCarModel(gltf.scene,appearance?.paint||null,0,findCar(carId).modelHeading);
   if(appearance)repaintCar(obj,appearance.paint,appearance);
   const bounds=vehicleBounds(obj);
   const wheelRig=new WheelRig(obj,carId);
   const halfWidth=Math.max(.85,Math.min(1.4,bounds.size.x*.48));
   const group=new THREE.Group();group.add(obj,this.makeContactShadow());
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
   const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,0,512,96);
   ctx.font='bold 46px Arial';ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.fillText(String(name).slice(0,18),256,62);
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false}));
   sprite.position.y=2.75;sprite.scale.set(4,.75,1);group.add(sprite);
   ownResources(sprite,sprite.material,sprite.material.map);
   const target=this.peerStates.get(id);
   if(target){group.position.set(target.x,target.y,target.z);group.rotation.y=target.heading;}
   if(!this.peerTracks.has(id))this.peerTracks.set(id,new PeerInterpolator());
   group.visible=!!target;this.scene.add(group);this.peers.set(id,{group,sprite,obj,appearance:JSON.stringify(appearance),interpolator:this.peerTracks.get(id),target:target||{x:0,y:0,z:0,heading:0},carId,halfWidth,wheelRig});
  })();
  this.pendingPeers.set(id,promise);
  try{await promise;}finally{if(this.pendingPeers.get(id)===promise)this.pendingPeers.delete(id);}
 }
 removePeer(id){
  this.peerEpochs.set(id,(this.peerEpochs.get(id)||0)+1);this.pendingPeers.delete(id);
  const p=this.peers.get(id);
  if(p){disposeOwnedResources(p.group);this.peers.delete(id);}
  this.peerStates.delete(id);
  this.peerTracks.delete(id);
 }
 clearPeers(){for(const id of new Set([...this.peers.keys(),...this.pendingPeers.keys(),...this.peerTracks.keys(),...this.peerStates.keys()]))this.removePeer(id);}
 syncPeer(id,state,timestamp){
  this.peerStates.set(id,state);
  if(!this.peerTracks.has(id))this.peerTracks.set(id,new PeerInterpolator());
  this.peerTracks.get(id).push(state,timestamp,performance.now());
  const p=this.peers.get(id);if(p){
   p.target=state;p.group.visible=true;
   const style=JSON.stringify(state.appearance);
   if(state.appearance&&style!==p.appearance){repaintCar(p.obj,state.appearance.paint,state.appearance);p.appearance=style;}
  }
 }
 updatePeers(dt){for(const peer of this.peers.values()){
  if(!peer.group.visible)continue;
  const target=peer.interpolator.sample(performance.now())||peer.target;
  peer.group.position.x=target.x;peer.group.position.z=target.z;
  const pose={x:target.x,z:target.z,y:target.y,heading:target.heading};
  const contact=this.trackWorld?.support(pose,peer.halfWidth,1.65,!this.keepOnRoad);
  const center=contact?null:this.trackWorld?.surface(pose.x,pose.z,pose.y,false,!this.keepOnRoad);
  peer.group.position.y=contact?.y??(center?center.y+.08:peer.target.y);
  peer.group.rotation.set(contact?.pitch||0,pose.heading,contact?.roll||0,'YXZ');
  peer.wheelRig.animate({...target,y:peer.group.position.y},this.trackWorld,peer.group,dt);
 }}
 animate(){
  if(!this.running)return;requestAnimationFrame(()=>this.animate());
  const elapsed=this.clock.getDelta(),dt=Math.min(elapsed,.1);this.frame++;
  this.averageFrameTime=(this.averageFrameTime||elapsed)+(elapsed-(this.averageFrameTime||elapsed))*.05;
  const alpha=this.stepper.advance(elapsed,step=>{
   this.previousState={...this.state};
   this.updateCar(step);
  });
  this.renderCar(dt,alpha);this.updatePeers(dt);this.updateCamera(dt);
  const shadowTarget=this.carRoot.position.clone(),texel=180/this.sun.shadow.mapSize.x;
  shadowTarget.x=Math.round(shadowTarget.x/texel)*texel;shadowTarget.z=Math.round(shadowTarget.z/texel)*texel;
  this.sun.target.position.copy(shadowTarget);this.sun.position.copy(shadowTarget).add(this.sunOffset);
  this.renderer.render(this.scene,this.camera);
  this.telemetryElapsed=(this.telemetryElapsed||0)+dt;
  if(this.telemetryElapsed>=.1){this.telemetryElapsed=0;this.onTelemetry({...this.state,speedKmh:Math.round(Math.abs(this.state.speed)*3.6),camera:this.cameraMode,lapTime:this.lapTracker?.running?this.lapTracker.elapsed:null,bestLap:this.lapTracker?.best?.time||null,lapEnabled:!!this.lapTracker&&!this.multiplayer,lapInvalid:!!this.lapTracker?.invalidLap,checkpoint:this.lapTracker?.nextCheckpoint??0,checkpointCount:this.lapTracker?.checkpoints.length??0,raceMode:this.raceMode,raceLaps:this.raceLaps,raceElapsed:this.raceElapsed,raceStandings:this.raceMode?this.raceStandings():[],redline:this.car?.drive?.redline||8000});}
  if(this.diagnosticEnabled && this.frame%90===0 && this.view==='drive' && this.model){
   const bounds=vehicleBounds(this.model),center=bounds.bounds.getCenter(new THREE.Vector3());
   const coords=center.project(this.camera);
   this.lastCarVisibility={meshCount:bounds.meshCount,carSize:bounds.size.toArray().map(x=>Number(x.toFixed(2))),
    clip:coords.toArray().map(x=>Number(x.toFixed(2))),cameraY:Number(this.camera.position.y.toFixed(2)),
    spawnMesh:this.roadSpawn?.mesh||'unknown',roadQuality:this.roadQuality};
   if(!bounds.meshCount || !coords.toArray().every(Number.isFinite))this.onStatus('Vehicle render diagnostic failed — press F8 for scene information');
  }
 }
 diagnostics(){
  const v=this.lastCarVisibility;
  return [
   `REDLINE diagnostics  (F8 to close)`,
   `Render: ${Math.round(1/(this.averageFrameTime||1))} FPS | Physics: fixed 60 Hz`,
   `Car: ${this.car?.file||'-'}`,
   `Loaded: ${this.loadedCarId||'NO'} | visible meshes: ${this.carAudit?.meshCount??0}`,
   `Car size (x,y,z): ${this.carAudit?.dimensions?.join(', ')||'unavailable'}`,
   `Excluded extra car backdrop meshes: ${this.carAudit?.excludedBackdropCount??0}`,
   `Map: ${this.loadedEnvironment||'NO'} | road: ${this.roadQuality||'-'}`,
   `Spawn surface: ${this.roadSpawn?.mesh||'NO'}`,
   `Position x/y/z: ${this.state.x.toFixed(1)}, ${this.state.y.toFixed(1)}, ${this.state.z.toFixed(1)}`,
   `Camera y: ${this.camera.position.y.toFixed(1)} | POV: ${this.cameraMode}`,
   `Car projected (x/y/z): ${v?.clip?.join(', ')||'unknown'}`,
   `Ready: ${this.driveReady} | Scene meshes: ${this.allMeshes?.length||0}`,
   `Road meshes: ${this.roadMeshes.length} | Contact: ${this.lastContact||'-'} | Edge protection: ${!!this.keepOnRoad}`,
   `If car remains hidden, send a screenshot of THIS overlay and the console.`
  ].join('\n');
 }
 destroy(){this.running=false;this.audio.dispose();this.resizeObserver.disconnect();this.clearPeers();this.clearRaceBots();this.clearCheckpoints();this.clearNos();for(const child of [...this.mapRoot.children])disposeOwnedResources(child);if(this.ghostCar)disposeOwnedResources(this.ghostCar);disposeOwnedResources(this.carRoot);this.garageReflection.dispose();this.renderer.dispose();}
}
