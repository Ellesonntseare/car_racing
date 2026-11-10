import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import WebSocket from 'ws';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const waitFor=(ws,predicate,timeout=4000)=>new Promise((resolveMessage,reject)=>{
 const timer=setTimeout(()=>{ws.off('message',receive);reject(new Error('Timed out waiting for multiplayer update'));},timeout);
 const receive=bytes=>{const m=JSON.parse(bytes.toString());if(!predicate(m))return;clearTimeout(timer);ws.off('message',receive);resolveMessage(m);};
 ws.on('message',receive);
});
const send=(ws,message)=>ws.send(JSON.stringify(message));
const connect=url=>new Promise((resolveSocket,reject)=>{const ws=new WebSocket(url);ws.once('open',()=>resolveSocket(ws));ws.once('error',reject);});

test('eight racers appear together in regular snapshots',async t=>{
 const backend=spawn(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,PORT:'0',REDLINE_LOCAL_ASSET_DIR:join(root,'missing-test-assets')},stdio:['ignore','pipe','pipe']});
 t.after(()=>backend.kill());
 const port=await new Promise((resolvePort,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Multiplayer server did not start')),6000);
  backend.stdout.on('data',chunk=>{const match=/http:\/\/localhost:(\d+)/.exec(chunk.toString());if(match){clearTimeout(timer);resolvePort(Number(match[1]));}});
  backend.once('exit',code=>{clearTimeout(timer);reject(new Error(`Server exited: ${code}`));});
 });
 const racers=await Promise.all(Array.from({length:8},()=>connect(`ws://localhost:${port}/socket`)));
 t.after(()=>racers.forEach(ws=>ws.close()));
 const room='EIGHT-TEST';
 const joined=waitFor(racers[0],m=>m.type==='joined');
 send(racers[0],{type:'create',code:room,name:'Racer 1',carId:'f40',mapId:'rocky'});await joined;
 for(let i=1;i<racers.length;i++){
  const done=waitFor(racers[i],m=>m.type==='joined');
  send(racers[i],{type:'join',code:room,name:`Racer ${i+1}`,carId:'f40'});await done;
 }
 const allReady=waitFor(racers[0],m=>m.type==='room'&&m.room.players.length===8&&m.room.players.every(p=>p.ready));
 for(const ws of racers)send(ws,{type:'ready',ready:true});await allReady;
 const preparing=waitFor(racers[0],m=>m.type==='prepare');send(racers[0],{type:'start'});await preparing;
 const started=waitFor(racers[0],m=>m.type==='start');
 for(let i=0;i<racers.length;i++){
  const accepted=waitFor(racers[i],m=>m.type==='spawnAccepted');
  send(racers[i],{type:'spawn',x:i*8,y:0,z:0,heading:0});await accepted;
 }
 const start=await started;await new Promise(resolveWait=>setTimeout(resolveWait,Math.max(0,start.startedAt-Date.now()+50)));
 const samples=[],sizes=[];let lastVehicles=[];
 const listener=bytes=>{const m=JSON.parse(bytes.toString());if(m.type==='snapshot'&&m.vehicles.length===8){samples.push(performance.now());sizes.push(bytes.length);lastVehicles=m.vehicles;}};
 racers[0].on('message',listener);
 const controls={steer:0,throttle:.5,brake:0,drift:false,nitro:false};
 const timer=setInterval(()=>racers.forEach((ws,i)=>send(ws,{type:'input',controls,pose:{x:i*8,y:0,z:0,heading:0,speed:0,nitro:100,resourceVersion:0}})),55);
 await new Promise(resolveWait=>setTimeout(resolveWait,2200));
 clearInterval(timer);racers[0].off('message',listener);
 assert.ok(samples.length>=15,`Only ${samples.length} complete eight-player snapshots arrived`);
 assert.equal(new Set(lastVehicles.map(v=>v.id)).size,8);
 assert.deepEqual(lastVehicles.map(v=>v.x).sort((a,b)=>a-b),Array.from({length:8},(_,i)=>i*8));
 const gaps=samples.slice(1).map((time,i)=>time-samples[i]).sort((a,b)=>a-b);
 const median=Math.round(gaps[Math.floor(gaps.length/2)]),p95=Math.round(gaps[Math.floor(gaps.length*.95)]);
 assert.ok(p95<230,`Eight-player snapshots stalled for ${p95} ms`);
 const averageBytes=Math.round(sizes.reduce((sum,size)=>sum+size,0)/sizes.length);
 assert.ok(averageBytes<4200,`Eight-player snapshots with appearance and resource state grew to ${averageBytes} bytes`);
 console.log(`Eight-player snapshots: median ${median} ms, p95 ${p95} ms, ${averageBytes} bytes each (${samples.length} samples)`);
});
