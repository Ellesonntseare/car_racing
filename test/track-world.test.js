import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {TrackWorld} from '../src/engine/TrackWorld.js';
function plane(w=12,l=100){const m=new T.Mesh(new T.PlaneGeometry(w,l),new T.MeshBasicMaterial());m.rotation.x=-Math.PI/2;m.updateMatrixWorld(true);return m;}
function worldWithWall(){const road=plane(),wall=new T.Mesh(new T.BoxGeometry(12,3,.1),new T.MeshBasicMaterial());wall.position.set(0,1.5,-10);wall.updateMatrixWorld(true);return new TrackWorld([road,wall],[road]);}
test('swept body stops at thin walls even at high speed',()=>{const w=worldWithWall();const hit=w.move({x:0,y:.08,z:0,heading:0},{x:0,y:.08,z:-30,heading:0},{keepOnRoad:true});assert.equal(hit.reason,'obstacle');assert.ok(hit.z>-8);});
test('all four wheels stay inside the road at an unguarded edge',()=>{const road=plane(),w=new TrackWorld([road],[road]);const hit=w.move({x:0,y:.08,z:0,heading:0},{x:20,y:.08,z:-5,heading:0},{keepOnRoad:true});assert.equal(hit.reason,'road edge');assert.ok(hit.x<5);assert.ok(w.support(hit));});
test('height follows a sloped road and supplies pitch',()=>{const road=plane();road.rotation.x=-Math.PI/2+.1;road.updateMatrixWorld(true);const w=new TrackWorld([road],[road]);const hit=w.move({x:0,y:.08,z:0,heading:0},{x:0,y:.08,z:-10,heading:0},{keepOnRoad:true});assert.equal(hit.blocked,false);assert.ok(Math.abs(hit.y)>.5);assert.ok(Math.abs(hit.pitch)>.05);});
test('maps without strict road-edge mode still align to slopes',()=>{
 const road=plane();road.rotation.x=-Math.PI/2+.15;road.updateMatrixWorld(true);
 const w=new TrackWorld([road],[road]),start={x:0,y:.08,z:0,heading:0};
 const hit=w.move(start,{...start,z:-10});
 assert.equal(hit.blocked,false);assert.ok(Math.abs(hit.pitch)>.1);
 const nose=new T.Vector3(0,0,-1.65).applyEuler(new T.Euler(hit.pitch,0,hit.roll,'YXZ'));
 const pavement=w.surface(hit.x+nose.x,hit.z+nose.z,hit.y);
 assert.ok(Math.abs(hit.y+nose.y-pavement.y-.08)<.01);
});
test('missing pavement stops movement instead of holding the car in midair',()=>{
 const road=plane(12,20),w=new TrackWorld([road],[road]),start={x:0,y:.08,z:0,heading:0};
 const hit=w.move(start,{...start,z:30});assert.equal(hit.blocked,true);assert.equal(hit.reason,'road edge');assert.ok(hit.z<10.01);
});
test('collision is independent of mesh visibility and face winding',()=>{const w=worldWithWall();assert.ok(w.blocked({x:0,y:.08,z:-10,heading:Math.PI}));});
test('low kerbs do not behave as full-height barriers',()=>{
 const road=plane(),kerb=new T.Mesh(new T.BoxGeometry(12,.3,.2),new T.MeshBasicMaterial());
 kerb.position.set(0,.15,-5);kerb.updateMatrixWorld(true);
 const world=new TrackWorld([road,kerb],[road]),start={x:0,y:.08,z:0,heading:0};
 assert.equal(world.move(start,{...start,z:-10}).blocked,false);
 assert.equal(worldWithWall().move(start,{...start,z:-15}).blocked,true);
});
test('a bridge surface is selected near the vehicle height',()=>{const low=plane(),high=plane();high.position.y=10;high.updateMatrixWorld(true);const w=new TrackWorld([low,high],[low,high]);assert.equal(w.surface(0,0,.08).y,0);assert.equal(w.surface(0,0,10.08).y,10);});

test('reverse can recover from a collision while retaining road support',()=>{
 const w=worldWithWall(),previous={x:0,y:.08,z:0,heading:0};
 const hit=w.move(previous,{...previous,z:-30},{keepOnRoad:true});assert.equal(hit.blocked,true);
 const recovery=w.move(hit,{...hit,z:hit.z+4},{keepOnRoad:true});assert.equal(recovery.blocked,false);assert.ok(w.support(recovery));
});
test('reverse cannot cross the rear road boundary',()=>{
 const road=plane(12,20),w=new TrackWorld([road],[road]),start={x:0,y:.08,z:0,heading:0};
 const hit=w.move(start,{...start,z:30},{keepOnRoad:true});assert.equal(hit.reason,'road edge');assert.ok(hit.z<9);assert.ok(w.support(hit));
});

test('ordinary ground and shoulders are traversable without changing the asphalt route',()=>{
 const road=plane(),ground=plane(60,100);ground.name='Ground';ground.position.y=-.04;ground.updateMatrixWorld(true);
 const w=new TrackWorld([road,ground],[road],{groundMeshes:[ground]}),start={x:0,y:.08,z:0,heading:0};
 assert.equal(w.surface(12,0,0),null,'spawn and route lookups should still use asphalt');
 assert.ok(w.surface(12,0,0,false,true),'ground is available to unrestricted driving');
 const strict=w.move(start,{...start,x:14},{keepOnRoad:true});assert.equal(strict.blocked,true);
 const free=w.move(start,{...start,x:14},{keepOnRoad:false});
 assert.equal(free.blocked,false);assert.ok(Math.abs(free.x-14)<1e-8);assert.ok(w.support(free,1.1,1.65,true));
 assert.equal(w.roadTriangles.length,2);
});

test('ground driving never uses a center-only sample to float wheels over a missing shoulder',()=>{
 const left=plane(20,30),right=plane(20,30);left.position.x=-10;right.position.x=12;
 left.updateMatrixWorld(true);right.updateMatrixWorld(true);
 const w=new TrackWorld([left,right],[],{groundMeshes:[left,right]}),start={x:-4,y:.08,z:0,heading:0};
 const hit=w.move(start,{...start,x:8},{keepOnRoad:false});
 assert.equal(hit.blocked,true);assert.equal(hit.reason,'road edge');assert.ok(hit.x<0);
 assert.ok(w.support(hit,1.1,1.65,true));
});

test('steep terrain faces and buildings stay solid while ground beneath them is driveable',()=>{
 const ground=plane(60,100),slope=plane(12,Math.sqrt(200));
 slope.name='terrain';slope.rotation.x=-Math.PI/4;slope.position.set(0,5,-10);slope.updateMatrixWorld(true);
 const w=new TrackWorld([ground,slope],[],{groundMeshes:[ground,slope]}),start={x:0,y:.08,z:0,heading:0};
 const hit=w.move(start,{...start,z:-20},{keepOnRoad:false});
 assert.equal(hit.blocked,true);assert.equal(hit.reason,'obstacle');assert.ok(hit.z>-10);
 const building=new T.Mesh(new T.BoxGeometry(12,4,2),new T.MeshBasicMaterial());
 building.name='Building';building.position.set(0,2,-8);building.updateMatrixWorld(true);
 const town=new TrackWorld([ground,building],[],{groundMeshes:[ground]});
 assert.equal(town.move(start,{...start,z:-15},{keepOnRoad:false}).reason,'obstacle');
});

test('a disconnected upper terrain face cannot act as a climbable vertical step',()=>{
 const low=plane(20,40),high=plane(20,40);low.position.x=-10;high.position.set(10,1.2,0);
 low.updateMatrixWorld(true);high.updateMatrixWorld(true);
 const w=new TrackWorld([low,high],[],{groundMeshes:[low,high]}),start={x:-4,y:.08,z:0,heading:0};
 const hit=w.move(start,{...start,x:8},{keepOnRoad:false});
 assert.equal(hit.blocked,true);assert.equal(hit.reason,'steep step');assert.ok(hit.y<.5);
});

test('grazing a wall preserves supported movement along it without passing through',()=>{
 const road=plane(40,100),wall=new T.Mesh(new T.BoxGeometry(.1,3,100),new T.MeshBasicMaterial());
 wall.name='Wall';wall.position.set(4,1.5,0);wall.updateMatrixWorld(true);
 const w=new TrackWorld([road,wall],[road]),start={x:0,y:.08,z:10,heading:0};
 const hit=w.move(start,{...start,x:8,z:-15},{keepOnRoad:true,allowSlide:true});
 assert.equal(hit.blocked,false);assert.equal(hit.sliding,true);assert.equal(hit.reason,'wall slide');
 assert.ok(hit.x<3&&hit.x>0);assert.ok(Math.abs(hit.z+15)<1e-8);
 assert.ok(hit.motionScale>0&&hit.motionScale<1);assert.ok(w.support(hit));assert.equal(w.blocked(hit,1.22,2.25),false);
 assert.equal(w.move(start,{...start,x:8,z:-15},{keepOnRoad:true}).blocked,true,'route validation must not silently slide away from its requested edge');
});

test('a low raised kerb between ordinary surfaces remains traversable',()=>{
 const ground=plane(40,100),kerb=new T.Mesh(new T.BoxGeometry(12,.3,.4),new T.MeshBasicMaterial());
 kerb.name='Kerb';kerb.position.set(0,.15,-5);kerb.updateMatrixWorld(true);
 const w=new TrackWorld([ground,kerb],[],{groundMeshes:[ground,kerb]}),start={x:0,y:.08,z:0,heading:0};
 const hit=w.move(start,{...start,z:-10},{keepOnRoad:false});
 assert.equal(hit.blocked,false);assert.ok(Math.abs(hit.z+10)<1e-8);assert.ok(w.support(hit,1.1,1.65,true));
});

test('transparent foliage cards leave the road clear while their actual trunks stay solid',()=>{
 const road=plane(40,100),card=new T.Mesh(new T.PlaneGeometry(8,17),new T.MeshBasicMaterial());
 card.name='tree_material_atlas_00002_1_0';
 const positions=card.geometry.attributes.position,uv=card.geometry.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setXY(i,.4633+(positions.getX(i)+4)/8*(.5367-.4633),.8491+(8.5-positions.getY(i))/17*(.9987-.8491));
 card.position.set(0,8.5,-5);card.updateMatrixWorld(true);
 const w=new TrackWorld([road,card],[road]),start={x:0,y:.08,z:0,heading:0};
 const leaves=w.move(start,{...start,z:-10},{keepOnRoad:true});
 assert.equal(leaves.blocked,false,'the large transparent sprite rectangle must not block asphalt');
 const trunkStart={...start,x:4},trunk=w.move(trunkStart,{...trunkStart,z:-10},{keepOnRoad:true});
 assert.equal(trunk.blocked,true);assert.equal(trunk.reason,'obstacle');
 assert.ok(w.lastObstacleTriangle?.foliageTrunk);
});
