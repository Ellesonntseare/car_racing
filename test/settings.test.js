import test from 'node:test';
import assert from 'node:assert/strict';
import {readStoredObject,saveStoredObject,sanitizeSettings} from '../src/shared/settings.js';

test('malformed, scalar and blocked settings storage recover to an object',()=>{
 for(const raw of ['null','[]','17','broken'])assert.deepEqual(readStoredObject({getItem:()=>raw},'settings'),{});
 assert.deepEqual(readStoredObject({getItem(){throw new Error('blocked');}},'settings',{name:'Racer'}),{name:'Racer'});
 assert.deepEqual(readStoredObject({getItem:()=>'{"name":"Alex"}'},'settings'),{name:'Alex'});
});
test('settings writes report quota failures without interrupting game actions',()=>{
 assert.equal(saveStoredObject({setItem(){throw new Error('quota');}},'settings',{}),false);
 assert.equal(saveStoredObject(null,'settings',{}),false);
 let written;assert.equal(saveStoredObject({setItem:(key,value)=>{written=JSON.parse(value);}},'settings',{music:false}),true);assert.equal(written.music,false);
});
test('removed selections and unsupported settings are repaired while valid car builds survive',()=>{
 const settings=sanitizeSettings({carId:'removed',mapId:'city',appearances:{f40:{paint:'#123456',finish:'matte'},removed:{paint:'#ffffff'}},tunings:{f40:{engine:999,handling:-1}},studio:{zoom:999,lighting:'invalid',autoOrbit:false},name:' <Alex> ',music:false},{carIds:['f40','m3'],mapIds:['laguna','woods']});
 assert.equal(settings.carId,'f40');assert.equal(settings.mapId,'laguna');assert.equal(settings.paint,'#123456');assert.equal(settings.style.finish,'matte');
 assert.deepEqual(settings.tuning,{engine:5,handling:0,brakes:0});assert.equal(settings.appearances.removed,undefined);
 assert.deepEqual(settings.studio,{lighting:'redline',autoOrbit:false,zoom:9});assert.equal(settings.name,'Alex');assert.equal(settings.music,false);
});
test('older single-car paint and tuning saves migrate to per-car preferences',()=>{
 const settings=sanitizeSettings({carId:'m3',paint:'#ff1122',tuning:{brakes:4}},{carIds:['f40','m3'],mapIds:['laguna']});
 assert.equal(settings.appearances.m3.paint,'#ff1122');assert.equal(settings.tunings.m3.brakes,4);assert.equal(settings.studio.zoom,6.4);
});
