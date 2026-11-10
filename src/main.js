import './style.css';
import { createUI } from './ui/template.js';
import { Game3D } from './engine/Game3D.js';
import { MultiplayerClient } from './net/MultiplayerClient.js';
import { CARS,MAPS,findCar,findMap } from './assets/catalog.js';
import { cleanName } from '../server/room-utils.js';
import { lapTime,LAP_ROUTE_VERSION } from './shared/LapTracker.js';
import { multiplayerGridSpawn } from './engine/gridSpawn.js';
import { normalizeSteeringAxis } from './shared/controls.js';
import { readStoredObject,saveStoredObject,sanitizeSettings } from './shared/settings.js';
createUI();
const el=id=>document.getElementById(id);
const query=(s)=>document.querySelector(s);
const all=(s)=>[...document.querySelectorAll(s)];
const safeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='redline_0_1_settings';
const saved=sanitizeSettings(readStoredObject(localStorage,STORE),{carIds:CARS.map(c=>c.id),mapIds:MAPS.map(m=>m.id),defaultCarId:CARS[0].id,defaultMapId:MAPS[0].id});
const STYLE_DEFAULT={paint:'#a9adb9',finish:'gloss',rim:'stock',glass:'stock',caliper:'stock'};
const TUNE_DEFAULT={engine:0,handling:0,brakes:0};
const appearances=saved.appearances&&typeof saved.appearances==='object'?saved.appearances:{};
const tunings=saved.tunings&&typeof saved.tunings==='object'?saved.tunings:{};
const activeId=saved.carId||'f40';
const initialStyle={...STYLE_DEFAULT,...(appearances[activeId]||{paint:saved.paint||STYLE_DEFAULT.paint})};
const model={page:'home',carId:activeId,mapId:findMap(saved.mapId).id,paint:initialStyle.paint,style:initialStyle,appearances,tunings,orientation:0,raceMode:false,
 tuning:{...TUNE_DEFAULT,...(tunings[activeId]||saved.tuning||{})},studio:{lighting:'redline',autoOrbit:true,zoom:6.4,...saved.studio},name:saved.name||'Racer',paused:false,session:false,ready:false,lobby:null,createMode:true,music:saved.music};
model.appearances[activeId]={...model.style};model.tunings[activeId]={...model.tuning};
const save=()=>saveStoredObject(localStorage,STORE,{carId:model.carId,mapId:model.mapId,paint:model.paint,style:model.style,appearances:model.appearances,tuning:model.tuning,tunings:model.tunings,studio:model.studio,name:model.name,music:model.music});
const toast=(text,timeout=4300)=>{const t=el('toast');t.textContent=text;t.classList.remove('is-hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add('is-hidden'),timeout);};
let statusTimer;
const setStatus=(msg)=>{
 el('load-message').textContent=msg;
 el('load-alert').classList.remove('is-hidden');
 clearTimeout(statusTimer);
 if(/ready/.test(msg))statusTimer=setTimeout(()=>el('load-alert').classList.add('is-hidden'),1600);
};
let currentTelemetry={};
const diagnosticPanel=document.createElement('pre');
diagnosticPanel.id='redline-diagnostics';
diagnosticPanel.setAttribute('aria-label','REDLINE 3D asset diagnostics');
diagnosticPanel.style.cssText='position:fixed;z-index:100000;right:12px;top:172px;max-width:min(480px,95vw);max-height:55vh;overflow:auto;white-space:pre-wrap;word-break:break-word;padding:16px;border:1px solid #17c2fb;background:rgba(2,8,20,.96);color:#eaf5ff;font:12px/1.55 Consolas,monospace;pointer-events:none;display:none';
document.body.append(diagnosticPanel);
const game=new Game3D(el('world'),{onStatus:setStatus,onLap:lap=>{
 toast(`${lap.best?'NEW BEST LAP':'LAP COMPLETE'} · ${lapTime(lap.time)}`,6500);
 refreshBestLapBoard();
 if(game.raceMode&&lap.raceLaps>=3)finishSoloRace();
},onPickup:()=>toast('NITRO REFILLED',2600),
 onNosSites:sites=>{if(model.session&&client.room?.host===client.id)client.send({type:'nosSites',sites});},
 onNosClaim:index=>client.send({type:'nosClaim',index}),onTelemetry:v=>{
 currentTelemetry=v;el('speed-number').textContent=v.speedKmh;el('drive-direction').textContent=v.speed<-.05?'R · REVERSE':'D · DRIVE';
 el('nitro-number').textContent=`${Math.round(v.nitro)}%`;
 el('nitro-progress-bar').style.width=`${v.nitro}%`;
 el('hud-camera').textContent=v.camera.toUpperCase()+' POV';
 el('hud-gear').textContent=v.speed<-.05?'R':v.gear||1;
 el('hud-rpm').textContent=`${Math.round(v.rpm||850)} RPM`;
 el('lap-panel').classList.toggle('is-hidden',!v.lapEnabled);
 if(v.lapEnabled){el('hud-lap').textContent=lapTime(v.lapTime||0);el('hud-best').textContent=lapTime(v.bestLap);el('hud-checkpoint').textContent=`${Math.min(v.checkpoint+1,v.checkpointCount)} / ${v.checkpointCount}`;el('lap-status').textContent=v.lapInvalid?'LAP INVALID · RESTART AT THE FINISH':'FOLLOW THE CHECKPOINTS';}
 el('race-panel').classList.toggle('is-hidden',!v.raceMode||model.page!=='drive');
 if(v.raceMode){
  const order=v.raceStandings||[],mine=order.find(entry=>entry.player);
  el('race-position').textContent=`${mine?.position||1} / ${order.length||3}`;
  el('race-laps').textContent=`LAP ${Math.min(3,v.raceLaps+1)} / 3`;
  el('race-time').textContent=lapTime(v.raceElapsed);
  el('race-order').textContent=order.map(entry=>`${entry.position} ${entry.player?'YOU':entry.name}`).join(' · ');
 }
}});
game.setStudio(model.studio);game.tuning=model.tuning;
const client=new MultiplayerClient(onServerMessage,()=>{});
const touchState={left:false,right:false,throttle:false,brake:false,drift:false,nitro:false};
const keyState=new Set();
let driveRevision=0;
const isTextField=target=>target?.matches?.('input,textarea,select,[contenteditable]');
function getControls(){
 const pressed=(...keys)=>keys.some(k=>keyState.has(k));
 let steer=(touchState.right||pressed('d','ArrowRight')?1:0)-(touchState.left||pressed('a','ArrowLeft')?1:0);
 let throttle=touchState.throttle||pressed('w','ArrowUp')?1:0;
 let brake=touchState.brake||pressed('s','ArrowDown')?1:0;
 let drift=touchState.drift||pressed(' '), nitro=touchState.nitro||pressed('Shift');
 const pads=navigator.getGamepads?.()||[];const pad=[...pads].find(Boolean);
 if(pad){const axis=normalizeSteeringAxis(pad.axes[0]);if(axis!==0)steer=axis;
  throttle=Math.max(throttle,pad.buttons[7]?.value||0,pad.buttons[0]?.pressed?1:0);
  brake=Math.max(brake,pad.buttons[6]?.value||0,pad.buttons[1]?.pressed?1:0);
  nitro ||= !!pad.buttons[5]?.pressed;drift ||= !!pad.buttons[4]?.pressed;
 }
 return {steer,throttle,brake,drift,nitro};
}
window.addEventListener('keydown',e=>{
 if(e.key==='F8'){
  e.preventDefault();
  diagnosticPanel.style.display=diagnosticPanel.style.display==='none'?'block':'none';
  game.diagnosticEnabled=diagnosticPanel.style.display!=='none';
  diagnosticPanel.textContent=game.diagnostics();
  return;
 }
 if(isTextField(e.target))return;
 if(model.page==='drive'&&!e.target.closest?.('button,[role="tab"],input,select,textarea')&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
 keyState.add(e.key.length===1?e.key.toLowerCase():e.key);
 if(e.repeat)return;
 if(e.key.toLowerCase()==='c'&&model.page==='drive') {game.cycleCamera();toast(`${game.cameraMode.toUpperCase()} POV`);}
 if(e.key.toLowerCase()==='r'&&model.page==='drive'){resetVehicle();toast('Car repositioned');}
 if(e.key==='Escape'&&model.page==='drive'&&!game.raceFinished)pauseGame(!model.paused);
});
window.addEventListener('keyup',e=>keyState.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>{keyState.clear();Object.keys(touchState).forEach(k=>touchState[k]=false);if(model.page==='drive'&&!model.session&&!model.paused)pauseGame(true);});
all('[data-control]').forEach(btn=>{
 const prop=btn.dataset.control;
 const set=on=>{touchState[prop]=on;btn.classList.toggle('held',on);};
 btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);set(true);game.audio.start();});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(ev,()=>set(false));
});
function tuneValue(k){return Math.max(0,Math.min(5,Number(model.tuning[k])||0));}
function syncStyleControls(){
 all('[data-paint]').forEach(b=>b.classList.toggle('active',b.dataset.paint===model.paint));
 el('paint-custom').value=model.paint;el('paint-hex').textContent=model.paint.toUpperCase();
 for(const key of ['finish','rim','glass','caliper'])all(`[data-${key}]`).forEach(b=>b.classList.toggle('active',b.dataset[key]===model.style[key]));
 all('[data-lighting]').forEach(b=>b.classList.toggle('active',b.dataset.lighting===model.studio.lighting));
 el('auto-orbit').setAttribute('aria-pressed',String(model.studio.autoOrbit));
 el('auto-orbit').querySelector('span').textContent=model.studio.autoOrbit?'ON':'OFF';
 el('garage-zoom').value=model.studio.zoom;el('zoom-value').textContent=`${Number(model.studio.zoom).toFixed(1)} M`;
}
function syncAppearanceSupport(){
 const support=game.appearanceSupport();
 for(const part of ['paint','rim','glass','caliper']){
  all(`[data-part-group="${part}"]`).forEach(group=>group.classList.toggle('part-unavailable',!support[part]));
  all(part==='paint'?'[data-paint],#paint-custom':`[data-${part}]`).forEach(control=>control.disabled=!support[part]);
 }
 const unavailable=Object.entries(support).filter(([,available])=>!available).map(([part])=>part);
 el('part-support-note').textContent=unavailable.length?`${unavailable.map(part=>part.toUpperCase()).join(', ')} ${unavailable.length>1?'are':'is'} unavailable for this car.`:'';
}
function syncCarLabels(){
 const car=findCar(model.carId);
 el('home-car-name').textContent=car.name.toUpperCase();el('home-car-brand').textContent=car.maker.toUpperCase();
 el('garage-car-title').textContent=car.name.toUpperCase();
 el('stat-top').textContent=Math.round(car.topSpeed+tuneValue('engine')*4);
 el('stat-accel').textContent=(car.acceleration+tuneValue('engine')*.24).toFixed(1);
 el('stat-handling').textContent=(car.handling+tuneValue('handling')*.3).toFixed(1);
 all('[data-car]').forEach(b=>b.classList.toggle('active',b.dataset.car===model.carId));
 syncStyleControls();
 for(const k of ['engine','handling','brakes']){
  el(`${k}-label`).textContent=`LV ${tuneValue(k)}`;
  query(`[data-tune="${k}"]`).value=tuneValue(k);
 }
}
function syncMapLabels(){
 const mp=findMap(model.mapId);
 el('map-title').textContent=mp.name.toUpperCase();el('map-detail').textContent=mp.detail;
 el('map-kind').textContent=mp.kind.toUpperCase();el('map-climate').textContent=mp.climate.toUpperCase();
 all('[data-map]').forEach(b=>b.classList.toggle('active',b.dataset.map===model.mapId));
 refreshBestLapBoard();
}
function refreshBestLapBoard(){
 const board=el('best-lap-board');board.replaceChildren();
 const results=[];
 for(const car of CARS){
  try{
   const saved=JSON.parse(localStorage.getItem(`redline_best_lap_${model.mapId}_${car.id}`)||'null');
   if(saved?.routeVersion===LAP_ROUTE_VERSION&&Number.isFinite(saved.time)&&saved.time>0)results.push({car,time:saved.time});
  }catch{}
 }
 results.sort((a,b)=>a.time-b.time);
 if(!results.length){const empty=document.createElement('p');empty.className='best-lap-empty';empty.textContent='No lap times yet. The road is yours.';board.append(empty);return;}
 for(const [index,result] of results.slice(0,5).entries()){
  const row=document.createElement('div');row.className='best-lap-row';
  const name=document.createElement('span');name.textContent=`${index+1}. ${result.car.name}`;
  const time=document.createElement('b');time.textContent=lapTime(result.time);
  row.append(name,time);board.append(row);
 }
}
function finishSoloRace(){
 game.finishRace();model.paused=true;
 const order=game.raceStandings(),mine=order.find(entry=>entry.player);
 el('race-result-title').textContent=mine?.position===1?'VICTORY':`P${mine?.position||3} FINISH`;
 el('race-result-time').textContent=lapTime(game.raceElapsed);
 const list=el('race-result-order');list.replaceChildren();
 for(const entry of order){
  const row=document.createElement('div');if(entry.player)row.className='you';
  const name=document.createElement('span');name.textContent=`${entry.position} · ${entry.name}`;
  const time=document.createElement('span');time.textContent=entry.finishTime===null?'ON TRACK':lapTime(entry.finishTime);
  row.append(name,time);list.append(row);
 }
 setDialog('race-result',true);
}
async function transition(next){
 if(next!=='drive'){driveRevision++;game.loadingDrive=false;clearInterval(showCountdown.timer);el('countdown').classList.add('is-hidden');}
 const prev=model.page;model.page=next;
 all('.screen').forEach(p=>p.classList.toggle('is-hidden',p.id!==`page-${next}`));
 all('[data-nav]').forEach(b=>b.classList.toggle('selected',b.dataset.nav===next));
 game.setView(next);
 if(next==='drive')return;
 model.paused=false;model.raceMode=false;setDialog('pause-modal',false);setDialog('race-result',false);
 if(prev==='drive'){game.clearPeers();if(model.session){client.leave();model.session=false;renderRoom(null);}}
 try{
  // Fast menus: don't download a massive map merely to display the map picker.
  // The real warehouse is streamed only when the user enters the garage.
  if(next==='garage'&&game.loadedEnvironment!=='garage')await game.loadEnvironment('garage');
 }catch(e){assetError(e);}
}
function assetError(error){
 console.error(error);setStatus('Could not prepare this drive.');
 diagnosticPanel.dataset.error='true';diagnosticPanel.textContent=error.stack||String(error);
 toast('This car or road could not be loaded. Please try again.',8000);
}
async function selectCar(id){
 model.appearances[model.carId]={...model.style};model.tunings[model.carId]={...model.tuning};
 model.carId=id;model.style={...STYLE_DEFAULT,...(model.appearances[id]||{})};model.paint=model.style.paint;
 model.tuning={...TUNE_DEFAULT,...(model.tunings[id]||{})};game.tuning=model.tuning;
 save();syncCarLabels();
 try{await game.loadCar(id,{tint:model.paint,style:model.style,orientation:model.orientation});syncAppearanceSupport();}catch(e){assetError(e);}
 publishBuild();
}
function publishBuild(){if(client.room?.status==='lobby')client.send({type:'car',carId:model.carId,appearance:model.style,tuning:model.tuning});}
function updateStyle(key,value){
 model.style={...model.style,[key]:value};model.paint=model.style.paint;
 model.appearances[model.carId]={...model.style};save();syncStyleControls();
 game.customize({tint:model.paint,style:model.style}).catch(assetError);
 publishBuild();
}
async function selectMap(id){
 model.mapId=id;save();syncMapLabels();
 // Maps menu uses a lightweight preview; full GLB streams only on START DRIVING.
 if(client.room?.host===client.id&&client.room.status==='lobby')client.send({type:'map',mapId:id});
}
function showCountdown(startedAt){
 clearInterval(showCountdown.timer);
 el('countdown').classList.remove('is-hidden');
 const tick=()=>{const left=Math.ceil((startedAt-Date.now())/1000);el('countdown').textContent=left>0?left:'GO!';if(left<=0){clearInterval(showCountdown.timer);setTimeout(()=>el('countdown').classList.add('is-hidden'),750);}};
 tick();showCountdown.timer=setInterval(tick,200);
}
async function drive(multiplayer=false,startedAt=null,nosSeed=null,soloRace=false){
 const revision=++driveRevision;
 const current=()=>revision===driveRevision&&model.page==='drive';
 game.audio.start();game.paused=false;model.session=multiplayer;model.paused=false;game.driveReady=false;game.personalSpawn=null;
 game.loadingDrive=true;game.resourceVersion=0;
 game.clearRaceBots();model.raceMode=soloRace&&!multiplayer;setDialog('race-result',false);
 game.multiplayer=multiplayer;game.nosSeed=nosSeed??Math.floor(Math.random()*0xffffffff);
 model.page='drive';
 all('.screen').forEach(p=>p.classList.toggle('is-hidden',p.id!=='page-drive'));
 all('[data-nav]').forEach(b=>b.classList.remove('selected'));
 game.setView('drive');game.raceStart=startedAt??Infinity;
 el('hud-map').textContent=findMap(model.mapId).name.toUpperCase();
 el('drive-mode-label').textContent=multiplayer?'ONLINE DRIVE':soloRace?'3-LAP RACE':'FREE DRIVE';
 el('hud-session').textContent=multiplayer?`ROOM ${client.room?.code||''}`:soloRace?'RACE THE FIELD':'THE ROAD IS OPEN';
 try{
  // Do not enter a blank playable scene if the selected car is missing.
  if(game.loadedCarId!==model.carId||!game.model)await game.loadCar(model.carId,{tint:model.paint,orientation:model.orientation});
  if(!current())return;
  if(game.loadedEnvironment!==model.mapId)await game.loadEnvironment(model.mapId);
  else {game.resetCar();game.driveReady=true;game.nosCooldowns=[];await game.createNosPickups(model.mapId);}
  if(!current())return;
  if(game.roadSpawn?.warning)toast('Road alignment needs attention on this track.',8000);
  if(multiplayer){
   const room=client.room;
   // Each player is initialized from the real track spawn, not (0, 0).
   const playerIndex=Math.max(0,(room?.players||[]).findIndex(p=>p.id===client.id));
   const gridPose=multiplayerGridSpawn(game.trackWorld,game.roadSpawn,playerIndex);
   game.applySpawn(gridPose);
   game.personalSpawn={x:game.state.x,y:game.state.y,z:game.state.z,heading:game.state.heading};
   await Promise.all((room?.players||[]).filter(p=>p.id!==client.id).map(p=>game.addPeer(p.id,p.carId,p.name,p.appearance)));
   if(!current())return;
   setStatus('Waiting for the drivers…');
   client.send({type:'spawn',x:game.state.x,y:game.state.y,z:game.state.z,heading:game.state.heading});
  }else if(soloRace){
   setStatus('Preparing the grid…');
   await game.prepareRaceBots();
   if(!current())return;
   setStatus('Race ready');
   game.raceStart=Date.now()+3200;
   game.loadingDrive=false;
   showCountdown(game.raceStart);
  }else {game.raceStart=null;game.loadingDrive=false;}
 }catch(e){
  if(!current())return;
  game.loadingDrive=false;
  assetError(e);
  // Show a menu instead of an empty roadway or invisible car.
  if(multiplayer)client.leave();
  model.session=false;model.raceMode=false;game.multiplayer=false;game.clearPeers();model.page='maps';game.setView('maps');
  all('.screen').forEach(p=>p.classList.toggle('is-hidden',p.id!=='page-maps'));
  all('[data-nav]').forEach(b=>b.classList.toggle('selected',b.dataset.nav==='maps'));
 }
}
function resetVehicle(){if(model.session)client.send({type:'reset'});else game.resetCar();}
function setDialog(id,open){
 const dialog=el(id),wasOpen=!dialog.classList.contains('is-hidden');
 if(open&&!wasOpen){dialog.previousFocus=document.activeElement;dialog.classList.remove('is-hidden');dialog.querySelector('button')?.focus();}
 else if(!open&&wasOpen){dialog.classList.add('is-hidden');dialog.previousFocus?.focus?.();}
}
window.addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const dialog=[el('pause-modal'),el('race-result')].find(d=>!d.classList.contains('is-hidden'));
 if(!dialog)return;
 const buttons=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')];
 if(!buttons.length)return;
 const first=buttons[0],last=buttons.at(-1);
 if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}
});
function pauseGame(pause){if(game.raceFinished)return;model.paused=pause;game.paused=pause&&!model.session;setDialog('pause-modal',pause);if(pause)game.setInput({});}
function renderRoom(room){
 model.lobby=room;el('lobby-code').textContent=room?.code||'NOT CONNECTED';
 el('lobby-status').textContent=room?.status==='driving'?'ON ROAD':room?.status?.toUpperCase()||'OFFLINE';
 const list=el('lobby-players');list.replaceChildren();
 if(!room){const p=document.createElement('div');p.className='empty-state';p.textContent='Your crew will appear here.';list.append(p);}
 else for(const player of room.players){
  const row=document.createElement('div');row.className='lobby-player';
  const left=document.createElement('span');left.textContent=`◉  ${player.name}${player.id===room.host?' ♛':''}${player.id===client.id?' (You)':''}`;
  const right=document.createElement('span');right.textContent=room.status==='loading'?(player.loaded?'LOADED':'LOADING'):player.ready?'READY':'NOT READY';right.className=player.ready?'tag-ready':'tag-wait';
  row.append(left,right);list.append(row);
 }
 const mine=room?.players.find(p=>p.id===client.id);model.ready=mine?.ready||false;
 el('ready-button').disabled=!room||room.status!=='lobby';
 el('ready-button').textContent=model.ready?'✓ READY — CLICK TO UNREADY':'✓ I\'M READY';
 el('start-session').disabled=!room||room.status!=='lobby'||room.host!==client.id||!room.players.every(p=>p.ready);
 el('leave-room').disabled=!room;
 if(room?.status==='driving'&&model.page!=='drive')toast('Session started — join the road!');
}
function appendChat(from,message){
 const line=document.createElement('div');line.className='chat-line';
 const name=document.createElement('b');name.textContent=from+': ';
 const text=document.createElement('span');text.textContent=message;line.append(name,text);
 const log=el('chat-log');log.append(line);while(log.children.length>35)log.firstElementChild.remove();log.scrollTop=log.scrollHeight;
}
function onServerMessage(m){
 if(m.type==='error'){toast(m.message,8000);return;}
 if(m.type==='joined'){renderRoom(m.room);appendChat('REDLINE',`Joined ${m.room.code}`);return;}
 if(m.type==='room')renderRoom(m.room);
 if(m.type==='chat')appendChat(m.from,m.message);
 if(m.type==='disconnected'){
  renderRoom(null);
  if(model.session){model.session=false;game.multiplayer=false;game.loadingDrive=false;game.raceStart=null;game.clearPeers();el('drive-mode-label').textContent='FREE DRIVE';el('hud-session').textContent='THE ROAD IS OPEN';toast('Connection lost. Continue driving solo.');}
 }
 if(m.type==='left'){renderRoom(null);}
 if(m.type==='resetAccepted'){game.resetCar();game.resourceVersion=m.resourceVersion;game.state.nitro=m.nitro;return;}
 if(m.type==='spawnAccepted'){game.resourceVersion=m.resourceVersion;game.state.nitro=m.nitro;return;}
 if(m.type==='requestNosSites'){if(game.nosSites?.length)client.send({type:'nosSites',sites:game.nosSites});return;}
 if(m.type==='resetRejected'){toast('Wait a moment before resetting again');return;}
 if(m.type==='nosState'){game.setNosState(m.cooldowns||[]);return;}
 if(m.type==='nosCollected'){
  if(m.collectorId===client.id&&m.resourceVersion>game.resourceVersion){
   game.resourceVersion=m.resourceVersion;
   game.grantNos(m.index,m.readyAt,{nitro:m.nitro,speed:m.speed,pickupBoost:m.pickupBoost});
  }
  else game.setNosCooldown(m.index,m.readyAt);
  return;
 }
 if(m.type==='nosRejected'){game.rejectNosClaim(m.index);if(Number.isFinite(m.readyAt))game.setNosCooldown(m.index,m.readyAt);return;}
 if(m.type==='prepare'){
  if(findMap(m.mapId).id!==model.mapId) {model.mapId=m.mapId;syncMapLabels();save();}
  drive(true,null,m.nosSeed);
 }
 if(m.type==='start'&&model.session&&model.page==='drive'){
  game.raceStart=m.startedAt;game.loadingDrive=false;setStatus('Drive ready');showCountdown(m.startedAt);
 }
 if(m.type==='snapshot'&&model.session&&game.driveReady){
  const me=m.vehicles?.find(v=>v.id===client.id);
  if(me){
   const d=Math.hypot(game.state.x-me.x,game.state.z-me.z);const blend=d>20?.8:d>4?.3:.07;
   game.state.x+=(me.x-game.state.x)*blend;game.state.z+=(me.z-game.state.z)*blend;
   game.state.heading+=Math.atan2(Math.sin(me.heading-game.state.heading),Math.cos(me.heading-game.state.heading))*blend;
   game.state.speed+=(me.speed-game.state.speed)*.1;
   if(me.resourceVersion>=game.resourceVersion){game.resourceVersion=me.resourceVersion;game.state.nitro=me.nitro;game.state.pickupBoost=me.pickupBoost;}
  }
  for(const v of m.vehicles||[]){if(v.id===client.id)continue;
   if(!game.peers.has(v.id)){
    const user=client.room?.players?.find(p=>p.id===v.id);
    game.addPeer(v.id,v.carId,user?.name||'Racer',v.appearance||user?.appearance).catch(assetError);
   }
   game.syncPeer(v.id,v,m.timestamp);
  }
  const connected=new Set((m.vehicles||[]).map(v=>v.id));
  for(const id of game.peers.keys())if(!connected.has(id))game.removePeer(id);
  for(const id of game.pendingPeers.keys())if(!connected.has(id))game.removePeer(id);
 }
}
all('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>transition(btn.dataset.nav)));
all('[data-car]').forEach(btn=>btn.addEventListener('click',()=>selectCar(btn.dataset.car)));
all('[data-map]').forEach(btn=>btn.addEventListener('click',()=>selectMap(btn.dataset.map)));
all('[data-paint]').forEach(btn=>btn.addEventListener('click',()=>updateStyle('paint',btn.dataset.paint)));
el('paint-custom').addEventListener('input',e=>updateStyle('paint',e.target.value));
for(const key of ['finish','rim','glass','caliper'])all(`[data-${key}]`).forEach(btn=>btn.addEventListener('click',()=>updateStyle(key,btn.dataset[key])));
el('reset-style').addEventListener('click',()=>{model.style={...STYLE_DEFAULT};model.paint=model.style.paint;model.appearances[model.carId]={...model.style};save();syncStyleControls();game.customize({tint:model.paint,style:model.style}).catch(assetError);publishBuild();});
all('[data-tune]').forEach(slider=>slider.addEventListener('input',()=>{model.tuning[slider.dataset.tune]=Number(slider.value);model.tunings[model.carId]={...model.tuning};save();syncCarLabels();game.tuning=model.tuning;publishBuild();}));
all('[data-custom-tab]').forEach(btn=>btn.addEventListener('click',()=>{
 const active=btn.dataset.customTab;
 all('[data-custom-tab]').forEach(tab=>{const selected=tab===btn;tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
 all('[data-custom-panel]').forEach(panel=>panel.classList.toggle('is-hidden',panel.dataset.customPanel!==active));
}));
all('[data-custom-tab]').forEach(btn=>btn.addEventListener('keydown',e=>{
 const tabs=all('[data-custom-tab]'),index=tabs.indexOf(btn);
 const next=e.key==='ArrowRight'?(index+1)%tabs.length:e.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:null;
 if(next!==null){e.preventDefault();tabs[next].click();tabs[next].focus();}
}));
all('[data-lighting]').forEach(btn=>btn.addEventListener('click',()=>{model.studio.lighting=btn.dataset.lighting;game.setStudio(model.studio);save();syncStyleControls();}));
el('auto-orbit').addEventListener('click',()=>{model.studio.autoOrbit=!model.studio.autoOrbit;game.setStudio(model.studio);save();syncStyleControls();});
el('garage-zoom').addEventListener('input',e=>{model.studio.zoom=Number(e.target.value);game.setStudio(model.studio);save();syncStyleControls();});
el('rotate-model').addEventListener('click',()=>{game.orbitAngle+=Math.PI/2;});
el('garage-view-toggle').addEventListener('click',()=>{
 const page=el('page-garage');
 const wide=page.classList.toggle('wide-view');
 el('garage-view-toggle').textContent=wide?'✕  BACK TO CUSTOMIZE':'◉  WIDE GARAGE VIEW';
});
for(const id of ['quick-drive','garage-test-drive','map-drive'])el(id).addEventListener('click',()=>drive(false));
el('map-race').addEventListener('click',()=>drive(false,null,null,true));
el('race-again').addEventListener('click',()=>drive(false,null,null,true));
el('race-to-maps').addEventListener('click',()=>transition('maps'));
el('camera-btn').addEventListener('click',()=>game.cycleCamera());
el('respawn-btn').addEventListener('click',()=>resetVehicle());
el('pause-btn').addEventListener('click',()=>pauseGame(true));
el('resume-game').addEventListener('click',()=>pauseGame(false));
el('exit-drive').addEventListener('click',()=>{pauseGame(false);if(model.session){client.leave();model.session=false;renderRoom(null);}transition('garage');});
function syncAudio(){game.audio.setEnabled(model.music);el('audio-toggle').textContent=model.music?'♫':'♪̸';el('audio-toggle').setAttribute('aria-pressed',String(model.music));}
syncAudio();
el('audio-toggle').addEventListener('click',()=>{model.music=!model.music;syncAudio();if(model.music)game.audio.start();save();});
function setRoomTab(create){model.createMode=create;el('tab-create').classList.toggle('active',create);el('tab-join').classList.toggle('active',!create);el('room-action').innerHTML=create?'CREATE ROOM <span>↗</span>':'JOIN ROOM <span>↗</span>';}
el('tab-create').addEventListener('click',()=>setRoomTab(true));el('tab-join').addEventListener('click',()=>setRoomTab(false));
el('room-action').addEventListener('click',async()=>{
 model.name=cleanName(el('player-name').value);save();el('profile-name').textContent=model.name.toUpperCase();
 const code=el('room-code').value;
 try{if(model.createMode)await client.create(code,model.name,model.carId,model.mapId,model.style,model.tuning);else await client.join(code,model.name,model.carId,model.style,model.tuning);}catch(e){toast('Could not join the room. Check the code and try again.');console.error(e);}
});
el('ready-button').addEventListener('click',()=>client.send({type:'ready',ready:!model.ready}));
el('start-session').addEventListener('click',()=>client.send({type:'start'}));
el('leave-room').addEventListener('click',()=>{client.leave();renderRoom(null);});
el('chat-form').addEventListener('submit',e=>{e.preventDefault();const input=el('chat-input');if(input.value.trim()){client.send({type:'chat',message:input.value});input.value='';}});
el('player-name').value=model.name;el('profile-name').textContent=model.name.toUpperCase();
el('room-code').value='REDLINE-1';
syncCarLabels();syncMapLabels();
let lastNet=0;
function runInput(time){
 const controls=model.page==='drive'&&!model.paused?getControls():{steer:0,throttle:0,brake:0,drift:false,nitro:false};
 game.setInput(controls);
 if(model.session&&model.page==='drive'&&client.connected&&time-lastNet>55){
  const {x,y,z,heading,speed,nitro,wheelAngle,steer,rpm,gear}=game.state;
  client.send({type:'input',controls,pose:{x,y,z,heading,speed,nitro,wheelAngle,steer,rpm,gear,resourceVersion:game.resourceVersion||0}});lastNet=time;
 }
 requestAnimationFrame(runInput);
}
requestAnimationFrame(runInput);
setInterval(()=>{if(diagnosticPanel.style.display!=='none'&&diagnosticPanel.dataset.error!=='true')diagnosticPanel.textContent=game.diagnostics();},750);
// Fast boot: show the UI immediately and fetch ONLY the selected real car.
// Garage and map GLBs are lazy-loaded only when their screens actually need them.
game.loadCar(model.carId,{tint:model.paint,style:model.style,orientation:model.orientation})
 .then(()=>{syncAppearanceSupport();})
 .catch(assetError);
