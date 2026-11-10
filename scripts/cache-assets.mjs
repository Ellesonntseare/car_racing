// Optional: mirror user's own hosted GLBs to the REDLINE backend disk once.
// Usage: npm run assets:cache [-- --core | --cars | --maps | --all]
import { mkdir, rename, rm, stat, open } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARS, MAPS, GARAGE, NOS, DRIVER, ASSET_FILES } from '../src/assets/catalog.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cache=resolve(process.env.REDLINE_ASSET_CACHE_DIR||join(ROOT,'asset-cache'));
const origin=(process.env.ASSET_ORIGIN||'https://race.teamtrader.co.za').replace(/\/$/,'');
const args=process.argv.slice(2);
const mode=args.includes('--all')?'all':args.includes('--cars')?'cars':args.includes('--maps')?'maps':args.includes('--garage')?'garage':'core';
const chosen={
 core:[CARS[0].file,GARAGE.file,MAPS[0].file],
 cars:CARS.map(x=>x.file), maps:MAPS.map(x=>x.file),
 garage:[GARAGE.file,NOS.file,DRIVER.file], all:ASSET_FILES
}[mode];
await mkdir(cache,{recursive:true});
console.log(`[REDLINE] ${mode} local asset cache from ${origin}`);
console.log('Source must remain online while downloading; large GLBs can take several minutes each.');
let fail=0,skip=0,ok=0;
for(const name of new Set(chosen)){
 const path=join(cache,name),tmp=`${path}.part`;
 try{
  const old=await stat(path).catch(()=>null);
  if(old?.size>0){console.log(`CACHED ${(old.size/1048576).toFixed(1)} MB  ${name}`);skip++;continue;}
  console.log(`DOWNLOADING  ${name}`);
  const r=await fetch(`${origin}/${encodeURIComponent(name)}`,{signal:AbortSignal.timeout(900000)});
  if(!r.ok||!r.body)throw new Error(`HTTP ${r.status}`);
  await pipeline(Readable.fromWeb(r.body),createWriteStream(tmp,{flags:'w'}));
  const size=(await stat(tmp)).size;
  if(size<12)throw new Error('File is too small / incomplete');
  const fh=await open(tmp,'r');
  let valid=false;
  try{const header=Buffer.alloc(4);await fh.read(header,0,4,0);valid=header.toString('ascii')==='glTF';}
  finally{await fh.close();}
  if(!valid)throw new Error('Downloaded file is not a valid GLB (missing glTF header)');
  await rename(tmp,path);
  console.log(`READY ${(size/1048576).toFixed(1)} MB  ${name}`);ok++;
 }catch(e){fail++;console.error(`FAILED  ${name}: ${e.message}`);await rm(tmp,{force:true}).catch(()=>{});}
}
console.log(`Finished: ${ok} downloaded, ${skip} already cached, ${fail} failed.`);
console.log(`Stored in ${cache}; restart REDLINE to use local files automatically.`);
if(fail)process.exitCode=1;
