// Fast metadata validation for all four map GLBs, with no 3D rendering library.
// Inspecting scene composition does NOT prove a physical driving route works;
// runtime raycasts/calibration still need testing on the user's computer.
import {existsSync,openSync,readSync,closeSync,readdirSync,statSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {MAPS,CARS} from '../src/assets/catalog.js';
const root=process.env.REDLINE_LOCAL_ASSET_DIR;
if(!root||!existsSync(root)){
 console.error('Set REDLINE_LOCAL_ASSET_DIR to the folder containing your GLB assets (subfolders supported).');
 process.exitCode=1;
}else{
 const found=new Map(),stack=[{dir:resolve(root),depth:0}];
 while(stack.length){
  const {dir,depth}=stack.pop();
  for(const item of readdirSync(dir,{withFileTypes:true})){
   if(item.isDirectory()&&depth<8&&!['node_modules','.git','android'].includes(item.name))stack.push({dir:join(dir,item.name),depth:depth+1});
   if(item.isFile()&&item.name.toLowerCase().endsWith('.glb'))found.set(item.name.toLowerCase(),join(dir,item.name));
  }
 }
 const inspect=(file)=>{
  const descriptor=openSync(file,'r');
  try{
   const header=Buffer.alloc(20);readSync(descriptor,header,0,20,0);
   if(header.toString('ascii',0,4)!=='glTF'||header.readUInt32LE(4)!==2)throw Error('Invalid GLB version/header');
   const declared=header.readUInt32LE(8),actual=statSync(file).size;
   if(declared!==actual)throw Error(`GLB length mismatch: declared ${declared}, actual ${actual}`);
   const jsonLength=header.readUInt32LE(12);
   if(header.readUInt32LE(16)!==0x4e4f534a||jsonLength>40_000_000)throw Error('Invalid/missing JSON chunk');
   const jsonBytes=Buffer.alloc(jsonLength);readSync(descriptor,jsonBytes,0,jsonLength,20);
   const gltf=JSON.parse(jsonBytes.toString('utf8').replace(/\0+$/,''));
   const meshes=gltf.meshes||[],nodes=gltf.nodes||[];
   const roadNames=[...meshes.map(m=>m.name||''),...nodes.map(n=>n.name||''),...(gltf.materials||[]).map(m=>m.name||'')].filter(n=>/road|street|asphalt|track|circuit|highway|pavement|lane|tarmac/i.test(n));
   const accessors=gltf.accessors||[];
   const bounding=accessors.filter(a=>a.type==='VEC3'&&a.min?.length===3&&a.max?.length===3);
   return {meshes:meshes.length,nodes:nodes.length,materialCount:(gltf.materials||[]).length,
     roadNamed:roadNames.slice(0,7),boxAttributes:bounding.length,extensions:gltf.extensionsUsed||[],bytes:actual};
  }finally{closeSync(descriptor);}
 };
 console.log('\nREDLINE LOCAL MODEL AUDIT (no GLBs are uploaded)\n');
 let failures=0;
 for(const map of MAPS){
  const file=found.get(map.file.toLowerCase());
  if(!file){console.error(`MISSING MAP: ${map.name} (${map.file})`);failures++;continue;}
  try{
   const data=inspect(file);
   if(data.meshes===0)throw Error('Map does not contain any GLB meshes');
   console.log(`OK ${map.name} · ${(data.bytes/1048576).toFixed(1)} MB · ${data.meshes} meshes · ${data.nodes} nodes · ${data.materialCount} materials`);
   console.log(`   ${relative(root,file)} · road labels: ${data.roadNamed.join(', ')||'none (runtime terrain fallback)'}`);
   if(data.extensions.length)console.log('   Extensions:',data.extensions.join(', '));
  }catch(e){console.error(`INVALID MAP ${map.name}: ${e.message}`);failures++;}
 }
 console.log('\nCAR FILE CHECK');
 for(const car of CARS){
  const file=found.get(car.file.toLowerCase());
  if(!file){console.error(`MISSING CAR: ${car.name} (${car.file})`);failures++;continue;}
  try{const data=inspect(file);if(data.meshes===0)throw Error('No meshes');console.log(`OK ${car.name} · ${(data.bytes/1048576).toFixed(1)} MB`);}
  catch(e){console.error(`INVALID CAR ${car.name}: ${e.message}`);failures++;}
 }
 console.log(`\n${failures?'PROBLEMS DETECTED: '+failures:'File-header checks passed.'} Note: road/camera placement still requires actual in-game tests.`);
 if(failures)process.exitCode=1;
}
