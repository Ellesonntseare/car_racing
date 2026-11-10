import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyDriveableMeshes} from '../src/engine/road.js';
const mesh=name=>({name,material:{name:''}});
test('Plane building names do not match lane roads',()=>{
 const building=mesh('Plane009_Material002_0'),road=mesh('main_lane_0');
 assert.deepEqual(classifyDriveableMeshes([building,road],'test').driveable,[road]);
});
test('Country Woods includes its checkered finish strip but excludes bridge roofs',()=>{
 const finish=mesh('0022_material_atlas_00002_1_0'),roof=mesh('0004037_material_atlas_00002_1_0');
 assert.deepEqual(classifyDriveableMeshes([finish,roof],'woods').driveable,[finish]);
});
