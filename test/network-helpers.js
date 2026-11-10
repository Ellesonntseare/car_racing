import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import WebSocket from 'ws';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const delay=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
export const send=(ws,message)=>ws.send(JSON.stringify(message));
export const waitFor=(ws,predicate,timeout=5000)=>new Promise((resolveMessage,reject)=>{
 const timer=setTimeout(()=>{ws.off('message',receive);reject(new Error('Timed out waiting for multiplayer update'));},timeout);
 const receive=bytes=>{const message=JSON.parse(bytes.toString());if(!predicate(message))return;clearTimeout(timer);ws.off('message',receive);resolveMessage(message);};
 ws.on('message',receive);
});
export async function startBackend(t){
 const backend=spawn(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,PORT:'0',REDLINE_LOCAL_ASSET_DIR:join(root,'missing-test-assets')},stdio:['ignore','pipe','pipe']});
 t.after(()=>backend.kill());
 const port=await new Promise((resolvePort,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Multiplayer server did not start')),6000);
  backend.stdout.on('data',chunk=>{const match=/http:\/\/localhost:(\d+)/.exec(chunk.toString());if(match){clearTimeout(timer);resolvePort(Number(match[1]));}});
  backend.once('exit',code=>{clearTimeout(timer);reject(new Error(`Multiplayer server exited: ${code}`));});
 });
 return async()=>{
  const ws=await new Promise((resolveSocket,reject)=>{const socket=new WebSocket(`ws://localhost:${port}/socket`);socket.once('open',()=>resolveSocket(socket));socket.once('error',reject);});
  t.after(()=>ws.terminate());return ws;
 };
}
export async function createAndJoin(host,guest,code='NET-TEST',options={}){
 let done=waitFor(host,message=>message.type==='joined');
 send(host,{type:'create',code,name:'Host',carId:'f40',mapId:'laguna',...options});
 const joined=await done;
 if(guest){done=waitFor(guest,message=>message.type==='joined');send(guest,{type:'join',code,name:'Guest',carId:'f40'});await done;}
 return joined;
}
export async function prepare(host,players){
 const ready=waitFor(host,message=>message.type==='room'&&message.room.players.length===players.length&&message.room.players.every(player=>player.ready));
 for(const ws of players)send(ws,{type:'ready',ready:true});await ready;
 const preparing=waitFor(host,message=>message.type==='prepare');send(host,{type:'start'});return preparing;
}
export async function spawnPlayer(ws,index=0){
 const accepted=waitFor(ws,message=>message.type==='spawnAccepted');
 send(ws,{type:'spawn',x:index*2,y:0,z:0,heading:0});return accepted;
}
