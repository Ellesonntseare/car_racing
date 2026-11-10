import { cleanRoomCode } from '../../server/room-utils.js';
export class MultiplayerClient {
 constructor(onMessage,onState){this.onMessage=onMessage;this.onState=onState;this.ws=null;this.room=null;this.id=null;}
 get connected(){return this.ws?.readyState===WebSocket.OPEN;}
 connect(){
  if(this.connected)return Promise.resolve();
  if(this.ws?.readyState===WebSocket.CONNECTING)return this.promise;
  const origin=(import.meta.env.VITE_PUBLIC_SERVER_URL||window.location.origin).replace(/\/$/,'');
  if(!/^https?:/.test(origin)){this.onState('Set VITE_PUBLIC_SERVER_URL for Android multiplayer');return Promise.reject(new Error('Missing multiplayer URL'));}
  const address=origin.replace(/^http/,'ws')+'/socket';
  this.promise=new Promise((resolve,reject)=>{
   const ws=new WebSocket(address);this.ws=ws;
   let opened=false;
   const timeout=setTimeout(()=>{if(opened||this.ws!==ws)return;reject(new Error('Multiplayer connection timed out'));ws.close();},10000);
   ws.onopen=()=>{clearTimeout(timeout);if(this.ws!==ws){ws.close();return;}opened=true;this.onState('Connected to multiplayer server');resolve();};
   ws.onerror=()=>{clearTimeout(timeout);if(this.ws!==ws)return;this.onState('Could not connect to multiplayer server');reject(new Error('WebSocket connection failed'));};
   ws.onclose=()=>{clearTimeout(timeout);if(this.ws!==ws)return;this.room=null;this.id=null;if(!opened)reject(new Error('Multiplayer connection closed'));this.onState('Disconnected from multiplayer');this.onMessage({type:'disconnected'});};
   ws.onmessage=e=>{
    if(this.ws!==ws)return;
    try{const m=JSON.parse(e.data);if(m.type==='hello'||m.type==='joined')this.id=m.id;if(m.type==='room'||m.type==='joined')this.room=m.room;this.onMessage(m);}catch(err){console.warn('Invalid multiplayer message',err);}
   };
  });
  return this.promise;
 }
 send(msg){if(this.connected)this.ws.send(JSON.stringify(msg));}
 async create(code,name,carId,mapId,appearance,tuning){await this.connect();this.send({type:'create',code:cleanRoomCode(code),name,carId,mapId,appearance,tuning});}
 async join(code,name,carId,appearance,tuning){await this.connect();this.send({type:'join',code:cleanRoomCode(code),name,carId,appearance,tuning});}
 leave(){this.send({type:'leave'});this.room=null;}
 close(){this.ws?.close();}
}
