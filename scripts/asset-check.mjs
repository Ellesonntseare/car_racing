import { ASSET_FILES } from '../src/assets/catalog.js';
const url=(process.env.ASSET_ORIGIN||'https://race.teamtrader.co.za').replace(/\/$/,'');
console.log('Checking the real REDLINE GLBs hosted at', url);
for(const f of ASSET_FILES){
 try {const res=await fetch(`${url}/${encodeURIComponent(f)}`,{method:'HEAD',signal:AbortSignal.timeout(20000)});
  const size=Number(res.headers.get('content-length')||0);
  console.log(res.ok?'OK ':'FAIL',res.status, (size/1024/1024).toFixed(1)+' MB',f);
 }catch(e){console.log('FAIL',f,e.message);}
}
