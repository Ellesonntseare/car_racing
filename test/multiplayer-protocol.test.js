import test from 'node:test';
import assert from 'node:assert/strict';
import {startBackend,createAndJoin,prepare,spawnPlayer,waitFor,send,delay} from './network-helpers.js';

test('the countdown waits for every loaded player and a departing host cannot deadlock it',async t=>{
 const connect=await startBackend(t),host=await connect(),guest=await connect();
 await createAndJoin(host,guest,'LOAD-TEST');
 let started=false;const observe=bytes=>{if(JSON.parse(bytes.toString()).type==='start')started=true;};guest.on('message',observe);
 const preparing=await prepare(host,[host,guest]);assert.ok(Number.isInteger(preparing.nosSeed));
 await spawnPlayer(guest,1);await delay(180);assert.equal(started,false,'A missing loaded acknowledgement must hold the countdown');
 const countdown=waitFor(guest,message=>message.type==='start');
 const promoted=waitFor(guest,message=>message.type==='room'&&message.room.players.length===1&&message.room.status==='driving');
 const sitesRequested=waitFor(guest,message=>message.type==='requestNosSites');
 send(host,{type:'leave'});
 const start=await countdown,room=(await promoted).room;await sitesRequested;
 assert.equal(room.host,room.players[0].id);assert.ok(start.startedAt>=Date.now()+2900);
 assert.equal(room.players[0].loaded,true);guest.off('message',observe);
});

test('shared NOS grants survive stale poses and fuel remains server-owned',async t=>{
 const connect=await startBackend(t),host=await connect(),guest=await connect();
 const {id:hostId}=await createAndJoin(host,guest,'NOS-TEST');
 await prepare(host,[host,guest]);
 const started=waitFor(host,message=>message.type==='start');
 await spawnPlayer(host);await spawnPlayer(guest,1);const start=await started;
 const stateHost=waitFor(host,message=>message.type==='nosState'),stateGuest=waitFor(guest,message=>message.type==='nosState');
 send(host,{type:'nosSites',sites:[{x:0,y:0,z:0},{x:50,y:0,z:0},{x:100,y:0,z:0}]});
 assert.deepEqual((await stateHost).cooldowns,[0,0,0]);await stateGuest;
 const early=waitFor(host,message=>message.type==='nosRejected');send(host,{type:'nosClaim',index:0});await early;
 await delay(Math.max(0,start.startedAt-Date.now()+30));
 const pose={x:0,y:0,z:0,heading:0,speed:20,nitro:999,resourceVersion:0};
 const controls={throttle:1,nitro:true};
 const pumping=setInterval(()=>send(host,{type:'input',controls,pose}),55);t.after(()=>clearInterval(pumping));
 send(host,{type:'input',controls,pose});
 const drained=await waitFor(host,message=>message.type==='snapshot'&&message.vehicles.find(player=>player.id===hostId)?.nitro<96);
 assert.ok(drained.vehicles.find(player=>player.id===hostId).nitro>=0);clearInterval(pumping);
 const collectedHost=waitFor(host,message=>message.type==='nosCollected'),collectedGuest=waitFor(guest,message=>message.type==='nosCollected');
 send(host,{type:'nosClaim',index:0});const claim=await collectedHost;await collectedGuest;
 assert.equal(claim.collectorId,hostId);assert.equal(claim.resourceVersion,1);assert.equal(claim.nitro,100);assert.equal(claim.speed,32);assert.equal(claim.pickupBoost,3);
 const rejected=waitFor(guest,message=>message.type==='nosRejected');send(guest,{type:'nosClaim',index:0});assert.equal((await rejected).readyAt,claim.readyAt);
 await delay(20);send(host,{type:'input',controls:{},pose:{...pose,speed:0,nitro:0}});
 const confirmed=(await waitFor(host,message=>message.type==='snapshot'&&message.vehicles.some(player=>player.id===hostId&&player.resourceVersion===1))).vehicles.find(player=>player.id===hostId);
 assert.ok(confirmed.nitro>90,'An old client fuel value must not erase the grant');assert.equal(confirmed.speed,32,'A pre-grant pose must not erase the power push');assert.ok(confirmed.pickupBoost>0);
 await delay(20);send(host,{type:'input',controls:{},pose:{...pose,speed:21,resourceVersion:1}});
 await waitFor(host,message=>message.type==='snapshot'&&message.vehicles.some(player=>player.id===hostId&&player.speed===21));
 const acceptedReset=waitFor(host,message=>message.type==='resetAccepted');send(host,{type:'reset'});const reset=await acceptedReset;
 assert.deepEqual(reset.pose,{x:0,y:0,z:0,heading:0});assert.equal(reset.resourceVersion,2);assert.equal(reset.nitro,100);
 const rejectedReset=waitFor(host,message=>message.type==='resetRejected');send(host,{type:'reset'});await rejectedReset;
});

test('failed room switches preserve membership and collection configuration is sanitized',async t=>{
 const connect=await startBackend(t),host=await connect(),guest=await connect();
 const joined=await createAndJoin(host,guest,'KEEP-TEST',{
  appearance:{paint:'#ff0000',finish:'matte',rim:'gold',glass:'invalid',caliper:'red',extra:'discard'},
  tuning:{engine:999,handling:-4,brakes:'3'}
 });
 assert.deepEqual(joined.room.players[0].appearance,{paint:'#ff0000',finish:'matte',rim:'gold',glass:'stock',caliper:'red'});
 assert.deepEqual(joined.room.players[0].tuning,{engine:5,handling:0,brakes:3});
 let error=waitFor(host,message=>message.type==='error');send(host,{type:'join',code:'MISSING'});await error;
 error=waitFor(host,message=>message.type==='error');send(host,{type:'create',code:'KEEP-TEST'});await error;
 const stillHere=waitFor(guest,message=>message.type==='chat'&&message.message==='still here');send(host,{type:'chat',message:'still here'});await stillHere;
 const updated=waitFor(guest,message=>message.type==='room'&&message.room.players.find(player=>player.id===joined.id)?.appearance.paint==='#123456');
 send(host,{type:'car',carId:'f40',appearance:{paint:'#123456',rim:'chrome'},tuning:{engine:2}});
 const config=(await updated).room.players.find(player=>player.id===joined.id);
 assert.equal(config.appearance.rim,'chrome');assert.equal(config.tuning.engine,2);assert.equal(config.ready,false);
});
