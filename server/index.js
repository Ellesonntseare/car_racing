import http from 'node:http';
import { createReadStream, existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, extname, join } from 'node:path';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { ASSET_FILES, CARS, MAPS } from '../src/assets/catalog.js';
import { createVehicleState, vehicleStep, sanitizeControls } from '../src/shared/physics.js';
import { FixedStepper } from '../src/shared/FixedStepper.js';
import { cleanName, cleanRoomCode, validRoomCode, validChat, roomPublic, cleanAppearance, cleanTuning } from './room-utils.js';
import { applyNosPickup } from '../src/shared/pickups.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST=join(ROOT,'dist');
const ASSET_ORIGIN=(process.env.ASSET_ORIGIN||'https://race.teamtrader.co.za').replace(/\/$/,'');
const PORT=Number(process.env.PORT||3001);
const ASSET_CACHE_DIR=resolve(process.env.REDLINE_ASSET_CACHE_DIR||join(ROOT,'asset-cache'));
// Fastest option when REDLINE and the downloaded 3D assets are on the same PC.
const bundledAssetDir=resolve(ROOT,'..','Car Racing');
const LOCAL_ASSET_DIR=process.env.REDLINE_LOCAL_ASSET_DIR?resolve(process.env.REDLINE_LOCAL_ASSET_DIR):(existsSync(bundledAssetDir)?bundledAssetDir:null);
const allowList=new Set(ASSET_FILES);
// Resolve known asset basenames across folders such as Cars/, Maps/, Garage/.
// Only allow catalog files to be served. Symlinked directories are never traversed.
const assetPaths=new Map();
let lastAssetIndexAt=0;
function indexLocalAssets(){
 lastAssetIndexAt=Date.now();
 assetPaths.clear();
 if(!LOCAL_ASSET_DIR||!existsSync(LOCAL_ASSET_DIR))return;
 const stack=[{dir:LOCAL_ASSET_DIR,depth:0}];
 const skip=new Set(['node_modules','.git','android','build','dist','.gradle','.idea']);
 let checked=0;
 while(stack.length&&checked<15000){
  const {dir,depth}=stack.pop();
  let entries=[];
  try{entries=readdirSync(dir,{withFileTypes:true});}catch(e){console.warn('[REDLINE] Could not scan:',dir,e.message);continue;}
  entries.sort((a,b)=>a.name.localeCompare(b.name));
  for(const entry of entries){
   if(++checked>15000)break;
   const full=join(dir,entry.name);
   if(entry.isDirectory()&&depth<8&&!skip.has(entry.name.toLowerCase()))stack.push({dir:full,depth:depth+1});
   else if(entry.isFile()&&entry.name.toLowerCase().endsWith('.glb')){
    const key=entry.name.toLowerCase();
    // Prefer the shortest path when duplicate basenames exist.
    if(!assetPaths.has(key)||full.length<assetPaths.get(key).length)assetPaths.set(key,full);
   }
  }
 }
 console.log(`[REDLINE] Indexed ${assetPaths.size} GLB filenames from ${LOCAL_ASSET_DIR}`);
 for(const filename of ASSET_FILES)if(!assetPaths.has(filename.toLowerCase()))console.warn(`[REDLINE] Missing local file: ${filename}`);
}
indexLocalAssets();
function findLocalAsset(filename){
 if(!LOCAL_ASSET_DIR)return null;
 let local=assetPaths.get(filename.toLowerCase());
 if(local&&!existsSync(local)){indexLocalAssets();local=assetPaths.get(filename.toLowerCase());}
 if(!local&&Date.now()-lastAssetIndexAt>15000){indexLocalAssets();local=assetPaths.get(filename.toLowerCase());}
 return local&&existsSync(local)?local:null;
}

const rooms=new Map();
const send=(ws,obj)=>{ if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj)); };
const sendRoom=(room,obj)=>{ for(const p of room.players.values())send(p.ws,obj); };
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.webp':'image/webp','.glb':'model/gltf-binary'};
// The optional local mirror is populated by `npm run assets:cache`.
// Cached files are served at local disk speed and support partial/range requests.
function serveAssetFile(req,res,path,source){
 if(!existsSync(path))return false;
 const info=statSync(path);
 if(!info.isFile())return false;
 const total=info.size;
 let start=0,end=total-1,status=200;
 const range=req.headers.range;
 if(range){
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match || (!match[1]&&!match[2])){
   res.writeHead(416,{'content-range':`bytes */${total}`});res.end();return true;
  }
  if(!match[1]){const count=Number(match[2]);start=Math.max(0,total-count);}
  else {start=Number(match[1]);end=match[2]?Number(match[2]):total-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start> end||start>=total){
   res.writeHead(416,{'content-range':`bytes */${total}`});res.end();return true;
  }
  end=Math.min(total-1,end);status=206;
 }
 const headers={'content-type':'model/gltf-binary','content-length':end-start+1,
  'cache-control':'public, max-age=86400','accept-ranges':'bytes',
  'access-control-allow-origin':'*','x-redline-asset-source':source};
 if(status===206)headers['content-range']=`bytes ${start}-${end}/${total}`;
 res.writeHead(status,headers);
 if(req.method==='HEAD'){res.end();return true;}
 createReadStream(path,{start,end}).on('error',()=>res.destroy()).pipe(res);
 return true;
}
const server=http.createServer(async(req,res)=>{
 try {
  const u=new URL(req.url||'/', `http://${req.headers.host||'localhost'}`);
  if(u.pathname==='/api/health') { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ok:true,players:[...rooms.values()].reduce((s,r)=>s+r.players.size,0),source:LOCAL_ASSET_DIR?'local-directory':ASSET_ORIGIN})); return; }
  if(u.pathname==='/api/assets/status'){
   const items=ASSET_FILES.map(filename=>{
    const local=findLocalAsset(filename),cached=join(ASSET_CACHE_DIR,filename);
    const path=local||(existsSync(cached)?cached:null);
    return {filename,available:!!path,source:local?'local-folder':path?'asset-cache':'remote-unverified',bytes:path?statSync(path).size:null};
   });
   res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
   res.end(JSON.stringify({localFolderConfigured:!!LOCAL_ASSET_DIR,assets:items}));return;
  }
  if(u.pathname.startsWith('/assets/')){
   const filename=decodeURIComponent(u.pathname.slice('/assets/'.length));
   if(!allowList.has(filename)){res.writeHead(404);res.end('Asset not listed in REDLINE catalog');return;}
   const localPath=findLocalAsset(filename);
   if(localPath&&serveAssetFile(req,res,localPath,'local-folder'))return;
   if(serveAssetFile(req,res,join(ASSET_CACHE_DIR,filename),'local-cache'))return;
   if(LOCAL_ASSET_DIR){
    // Avoid an opaque 502 from the tunnel when the explicitly configured local folder lacks the file.
    res.writeHead(404,{'content-type':'text/plain','cache-control':'no-store'});
    res.end(`REDLINE could not find ${filename} inside your configured local folder or its subfolders. Check the filename and unzip the GLB if needed.`);
    console.warn(`[REDLINE] Missing ${filename} in configured asset folder (including subfolders)`);
    return;
   }
   const headers={}; if(req.headers.range)headers.Range=req.headers.range;
   const upstream=await fetch(`${ASSET_ORIGIN}/${encodeURIComponent(filename)}`, { method: req.method==='HEAD'?'HEAD':'GET', headers, signal:AbortSignal.timeout(120000) });
   if(!upstream.ok && upstream.status!==206){res.writeHead(upstream.status);res.end('Remote asset unavailable');return;}
   const returned={ 'content-type':upstream.headers.get('content-type')||'model/gltf-binary', 'cache-control':'public, max-age=7200', 'access-control-allow-origin':'*', 'x-redline-asset-source':'remote-host' };
   for(const k of ['content-length','content-range','accept-ranges','etag','last-modified']){const v=upstream.headers.get(k);if(v)returned[k]=v;}
   res.writeHead(upstream.status,returned);
   if(req.method==='HEAD'||!upstream.body){res.end();return;}
   Readable.fromWeb(upstream.body).on('error',()=>res.destroy()).pipe(res);
   return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let filename=decodeURIComponent(u.pathname); if(filename==='/')filename='/index.html';
  let path=resolve(DIST, `.${filename}`);
  if(!(path===DIST||path.startsWith(DIST+'/')||path.startsWith(DIST+'\\'))){res.writeHead(403);res.end();return;}
  if(!existsSync(path)||!statSync(path).isFile()){
   if(filename.startsWith('/assets/')){res.writeHead(404);res.end();return;}
   path=join(DIST,'index.html');
  }
  if(!existsSync(path)){res.writeHead(503,{'content-type':'text/plain'});res.end('Build not found. Run npm install && npm run dev, or npm run build && npm start.');return;}
  res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':path.endsWith('index.html')?'no-cache':'public, max-age=3600'});
  if(req.method==='HEAD'){res.end();return;}
  createReadStream(path).pipe(res);
 }catch(e){console.error('HTTP error:',e.message);if(!res.headersSent)res.writeHead(502);res.end('REDLINE backend failed to load resource');}
});
const wss=new WebSocketServer({server,path:'/socket',maxPayload:25000,perMessageDeflate:false});
function beginWhenLoaded(room){
 if(room.status!=='loading'||!room.players.size||![...room.players.values()].every(p=>p.spawned))return;
 room.status='driving';room.startedAt=Date.now()+3200;
 for(const p of room.players.values())p.input=sanitizeControls();
 sendRoom(room,{type:'room',room:roomPublic(room)});
 sendRoom(room,{type:'start',mapId:room.mapId,startedAt:room.startedAt,nosSeed:room.nosSeed});
}
function leave(ws){
 const room=rooms.get(ws.roomCode); if(!room)return;
 room.players.delete(ws.playerId); ws.roomCode='';
 if(room.players.size===0){rooms.delete(room.code);return;}
 const hostChanged=room.host===ws.playerId;
 if(hostChanged)room.host=room.players.keys().next().value;
 sendRoom(room,{type:'room',room:roomPublic(room)});
 if(hostChanged&&room.status!=='lobby'&&!room.nosSites)send(room.players.get(room.host).ws,{type:'requestNosSites'});
 beginWhenLoaded(room);
}
function joinRoom(room,ws,name,carId,appearance,tuning){
 if(room.players.size>=8){send(ws,{type:'error',message:'Room is full (8 racers max)'});return;}
 const id=ws.playerId;
 room.players.set(id,{id,ws,name:cleanName(name),carId:CARS.some(c=>c.id===carId)?carId:CARS[0].id,appearance:cleanAppearance(appearance),tuning:cleanTuning(tuning),ready:false,spawned:false,resourceVersion:0,input:sanitizeControls(),state:createVehicleState()});
 ws.roomCode=room.code;
 send(ws,{type:'joined',id,room:roomPublic(room)});
 sendRoom(room,{type:'room',room:roomPublic(room)});
}
wss.on('connection',ws=>{
 ws.playerId=randomUUID(); ws.roomCode=''; ws.lastInput=0;ws.lastChat=0;ws.isAlive=true;
 ws.on('pong',()=>{ws.isAlive=true;});
 send(ws,{type:'hello',id:ws.playerId});
 ws.on('message',raw=>{
  let m;try { m=JSON.parse(raw.toString()); }catch{return;}
  if(!m||typeof m.type!=='string')return;
  if(m.type==='create'){
   const code=cleanRoomCode(m.code);
   if(!validRoomCode(code)){send(ws,{type:'error',message:'Room code must be 4–12 letters, numbers or hyphens'});return;}
   if(rooms.has(code)){send(ws,{type:'error',message:'That room code is already in use'});return;}
    if(ws.roomCode)leave(ws);
   const room={code,host:ws.playerId,mapId:MAPS.some(x=>x.id===m.mapId)?m.mapId:MAPS[0].id,status:'lobby',startedAt:null,players:new Map()};
    rooms.set(code,room);joinRoom(room,ws,m.name,m.carId,m.appearance,m.tuning);return;
  }
  if(m.type==='join'){
   const room=rooms.get(cleanRoomCode(m.code));
   if(!room){send(ws,{type:'error',message:'Room not found'});return;}
   if(room.status!=='lobby'){send(ws,{type:'error',message:'Session already underway'});return;}
    if(room.code===ws.roomCode){send(ws,{type:'joined',id:ws.playerId,room:roomPublic(room)});return;}
    if(room.players.size>=8){send(ws,{type:'error',message:'Room is full (8 racers max)'});return;}
    if(ws.roomCode)leave(ws);
    joinRoom(room,ws,m.name,m.carId,m.appearance,m.tuning);return;
  }
  const room=rooms.get(ws.roomCode);const player=room?.players.get(ws.playerId);if(!player)return;
  if(m.type==='leave'){leave(ws);send(ws,{type:'left'});return;}
  if(m.type==='ready'&&room.status==='lobby'){player.ready=!!m.ready;sendRoom(room,{type:'room',room:roomPublic(room)});return;}
  if(m.type==='car'&&room.status==='lobby'){
   if(CARS.some(c=>c.id===m.carId)){player.carId=m.carId;player.appearance=cleanAppearance(m.appearance);player.tuning=cleanTuning(m.tuning);player.ready=false;sendRoom(room,{type:'room',room:roomPublic(room)});}
   return;
  }
  if(m.type==='map'&&room.status==='lobby'&&room.host===player.id){
   if(MAPS.some(mp=>mp.id===m.mapId)){room.mapId=m.mapId;for(const p of room.players.values())p.ready=false;sendRoom(room,{type:'room',room:roomPublic(room)});}return;
  }
  if(m.type==='start'&&room.host===player.id&&room.status==='lobby'){
   if(![...room.players.values()].every(p=>p.ready)){send(ws,{type:'error',message:'All racers must be ready'});return;}
   room.status='loading';room.startedAt=null;
   room.nosSeed=Math.floor(Math.random()*0xffffffff);room.nosSites=null;room.nosCooldowns=[];
   for(const p of room.players.values()){p.state=createVehicleState();p.spawned=false;p.resourceVersion=0;}
   sendRoom(room,{type:'room',room:roomPublic(room)});
   sendRoom(room,{type:'prepare',mapId:room.mapId,nosSeed:room.nosSeed});return;
  }
  if(m.type==='spawn'&&room.status==='loading'&&!player.spawned){
   const x=Number(m.x),y=Number(m.y),z=Number(m.z),heading=Number(m.heading);
   if([x,y,z,heading].every(Number.isFinite)&&Math.abs(x)<10000&&Math.abs(y)<5000&&Math.abs(z)<10000&&Math.abs(heading)<1000){
    player.state.x=x;player.state.y=y;player.state.z=z;player.state.heading=heading;
    player.spawned=true;player.initialSpawn={x,y,z,heading};
    player.lastPose=Date.now();
    send(ws,{type:'spawnAccepted',resourceVersion:player.resourceVersion,nitro:player.state.nitro});
    if(room.nosSites)send(ws,{type:'nosState',cooldowns:room.nosCooldowns});
    sendRoom(room,{type:'room',room:roomPublic(room)});
    beginWhenLoaded(room);
   }
   return;
  }
  if(m.type==='reset'&&room.status==='driving'){
   const now=Date.now();if(player.spawned&&player.initialSpawn&&(!player.lastReset||now-player.lastReset>3000)){
    player.lastReset=now;player.state=createVehicleState();Object.assign(player.state,player.initialSpawn);
    player.input=sanitizeControls();player.lastPose=now;player.resourceVersion++;
    send(ws,{type:'resetAccepted',pose:player.initialSpawn,resourceVersion:player.resourceVersion,nitro:player.state.nitro});
   }else send(ws,{type:'resetRejected'});
   return;
  }
  if(m.type==='nosSites'&&['loading','driving'].includes(room.status)&&room.host===player.id&&!room.nosSites){
   const sites=m.sites;
   if(!Array.isArray(sites)||sites.length<3||sites.length>8||!sites.every(p=>p&&[p.x,p.y,p.z].every(Number.isFinite)&&Math.abs(p.x)<10000&&Math.abs(p.y)<5000&&Math.abs(p.z)<10000))return;
   room.nosSites=sites.map(({x,y,z})=>({x,y,z}));room.nosCooldowns=sites.map(()=>0);
   sendRoom(room,{type:'nosState',cooldowns:room.nosCooldowns});return;
  }
  if(m.type==='nosClaim'&&room.status==='driving'){
   const index=m.index,site=room.nosSites?.[index],now=Date.now();
   if(!Number.isInteger(index)||!site||!player.spawned||now<room.startedAt){send(ws,{type:'nosRejected',index});return;}
   if(now<room.nosCooldowns[index]||Math.hypot(player.state.x-site.x,player.state.z-site.z)>4.5||Math.abs(player.state.y-site.y)>3.5){
    send(ws,{type:'nosRejected',index,readyAt:room.nosCooldowns[index]});return;
   }
   room.nosCooldowns[index]=now+14000;
   applyNosPickup(player.state,CARS.find(c=>c.id===player.carId));player.resourceVersion++;
   const {nitro,speed,pickupBoost}=player.state;
   sendRoom(room,{type:'nosCollected',index,readyAt:room.nosCooldowns[index],collectorId:player.id,resourceVersion:player.resourceVersion,nitro,speed,pickupBoost});return;
  }
  if(m.type==='input'&&room.status==='driving'){
   const now=Date.now();if(now-ws.lastInput<15)return;ws.lastInput=now;
   player.input=now>=room.startedAt?sanitizeControls(m.controls):sanitizeControls();
   const pose=m.pose;
   if(player.spawned&&pose&&['x','y','z','heading','speed'].every(k=>Number.isFinite(pose[k]))){
    const elapsed=Math.max(.05,Math.min(1,(now-(player.lastPose||now))/1000));
    const moved=Math.hypot(pose.x-player.state.x,pose.z-player.state.z);
    const car=CARS.find(c=>c.id===player.carId),cap=(car.topSpeed+player.tuning.engine*4)/3.6*1.15;
    if(now>=room.startedAt&&Math.abs(pose.x)<10000&&Math.abs(pose.z)<10000&&Math.abs(pose.y)<5000&&pose.speed>=-25/3.6&&pose.speed<=cap&&moved<Math.max(7,elapsed*cap*1.2)){
     for(const key of ['x','y','z','heading','wheelAngle','steer','rpm','gear'])if(Number.isFinite(pose[key]))player.state[key]=pose[key];
     if(pose.resourceVersion===player.resourceVersion)player.state.speed=pose.speed;
     player.lastPose=now;
    }
   }
   return;
  }
  if(m.type==='chat'){
   const now=Date.now();if(now-ws.lastChat<800)return;ws.lastChat=now;
   const message=validChat(m.message);if(message)sendRoom(room,{type:'chat',from:player.name,message,time:now});return;
  }
 });
 ws.on('close',()=>leave(ws));ws.on('error',()=>leave(ws));
});
let last=performance.now(),lastSnapshot=0;
const simulationClock=new FixedStepper();
setInterval(()=>{
 const now=performance.now(),elapsed=(now-last)/1000;last=now;
 simulationClock.advance(elapsed,dt=>{
  for(const room of rooms.values()){
   if(room.status!=='driving'||Date.now()<room.startedAt)continue;
   for(const player of room.players.values())if(player.spawned){
    const car=CARS.find(c=>c.id===player.carId),tuning=player.tuning;
    const simulationCar={...car,acceleration:car.acceleration+tuning.engine*.24,handling:car.handling+tuning.handling*.3,brake:car.brake+tuning.brakes*.25,speedBonus:tuning.engine*4};
    // The client supplies road-constrained poses; the server always owns fuel and pickup grants.
    // Hold a stalled pose rather than drive it through scenery without track geometry.
    const projected=vehicleStep({...player.state},player.input,simulationCar,dt);
    player.state.nitro=projected.nitro;player.state.nitroActive=projected.nitroActive;player.state.pickupBoost=projected.pickupBoost;
    if(Date.now()-(player.lastPose||0)>500){player.input=sanitizeControls();player.state.speed=0;}
   }
  }
 });
 for(const room of rooms.values()){
  if(room.status!=='driving'||Date.now()<room.startedAt)continue;
  if(now-lastSnapshot>=35)sendRoom(room,{type:'snapshot',timestamp:Date.now(),vehicles:[...room.players.values()].filter(p=>p.spawned).map(p=>{
   const {x,y,z,heading,speed,nitro,pickupBoost,wheelAngle,steer,rpm,gear}=p.state;
   return {id:p.id,carId:p.carId,appearance:p.appearance,tuning:p.tuning,resourceVersion:p.resourceVersion,x,y,z,heading,speed,nitro,pickupBoost,wheelAngle,steer,rpm,gear};
  })});
 }
 if(now-lastSnapshot>=35)lastSnapshot=now;
},1000/30);
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue;}ws.isAlive=false;ws.ping();}},30000);
heartbeat.unref();wss.on('close',()=>clearInterval(heartbeat));
server.listen(PORT,'0.0.0.0',()=>console.log(`[REDLINE] backend listening at http://localhost:${server.address().port} (asset origin: ${LOCAL_ASSET_DIR||ASSET_ORIGIN})`));
