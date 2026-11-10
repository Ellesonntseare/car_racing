import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/engine/AudioEngine.js';
test('neutral or missing audio inputs never interrupt rendering',()=>{
 const audio=new AudioEngine(),values=[];
 const param={setTargetAtTime(value){assert.ok(Number.isFinite(value));values.push(value);}};
 audio.ctx={currentTime:1};audio.oscs=[{o:{frequency:param},mul:1}];audio.gain={gain:param};audio.filter={frequency:param};
 audio.update(0,undefined,false);audio.update(NaN,NaN,false);
 assert.equal(values.length,6);
});
