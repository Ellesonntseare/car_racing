import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanRoomCode,validRoomCode,validChat,cleanAppearance,cleanTuning } from '../server/room-utils.js';
test('players may set a valid room code',()=>{assert.equal(cleanRoomCode(' rush-01 '),'RUSH-01');assert.ok(validRoomCode('RUSH-01'));assert.ok(!validRoomCode('AB'));});
test('chat is bounded and strips angle brackets',()=>{assert.equal(validChat('<hi>'),'hi');assert.ok(validChat('a'.repeat(300)).length<=180);});
test('vehicle configuration only accepts supported finishes and bounded upgrade levels',()=>{
 assert.deepEqual(cleanTuning({engine:Infinity,handling:6,brakes:-2}),{engine:0,handling:5,brakes:0});
 assert.equal(cleanAppearance({paint:'url(evil)',rim:'script'}).paint,'#a9adb9');
 assert.equal(cleanAppearance({paint:'#AABBCC',rim:'chrome'}).paint,'#aabbcc');
 assert.equal(cleanAppearance({rim:'script'}).rim,'stock');
});
