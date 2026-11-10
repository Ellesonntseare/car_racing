import { existsSync,readFileSync,writeFileSync } from 'node:fs';
const p='android/app/src/main/AndroidManifest.xml';
if(!existsSync(p)){console.error('Android project missing. Run npx cap add android first.');process.exit(1);}
const old=readFileSync(p,'utf8');
let next=old;
next=next.replace(/(<activity\b[^>]*\bandroid:name="\.MainActivity"[^>]*)(>)/s,(full,opening,ending)=>{
 if(opening.includes('android:screenOrientation='))return full.replace(/android:screenOrientation="[^"]*"/,'android:screenOrientation="sensorLandscape"');
 return opening+' android:screenOrientation="sensorLandscape"'+ending;
});
if(next===old&&!old.includes('sensorLandscape')){console.error('Could not find the Capacitor MainActivity declaration. Edit AndroidManifest.xml manually.');process.exit(1);}
writeFileSync(p,next);console.log('Android sensor-landscape orientation configured.');
