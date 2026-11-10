import {cleanAppearance,cleanTuning,cleanName} from '../../server/room-utils.js';

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function readStoredObject(storage,key,fallback={}){
 try{const value=JSON.parse(storage?.getItem(key)||'null');return object(value)?value:{...fallback};}
 catch{return {...fallback};}
}
export function saveStoredObject(storage,key,value){
 if(!object(value)||typeof storage?.setItem!=='function')return false;
 try{storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}
}
/** Keep old saves usable while excluding removed cars, tracks and invalid options. */
export function sanitizeSettings(value,{carIds=[],mapIds=[],defaultCarId='f40',defaultMapId=mapIds[0]}={}){
 const source=object(value)?value:{};
 const carId=carIds.includes(source.carId)?source.carId:carIds.includes(defaultCarId)?defaultCarId:carIds[0]||defaultCarId;
 const mapId=mapIds.includes(source.mapId)?source.mapId:mapIds.includes(defaultMapId)?defaultMapId:mapIds[0];
 const appearances={},tunings={};
 for(const id of carIds){
  if(object(source.appearances)&&Object.hasOwn(source.appearances,id))appearances[id]=cleanAppearance(source.appearances[id]);
  if(object(source.tunings)&&Object.hasOwn(source.tunings,id))tunings[id]=cleanTuning(source.tunings[id]);
 }
 const legacyStyle=object(source.style)?source.style:{paint:source.paint};
 const style=appearances[carId]||cleanAppearance(legacyStyle),tuning=tunings[carId]||cleanTuning(source.tuning);
 appearances[carId]={...style};tunings[carId]={...tuning};
 const studio=object(source.studio)?source.studio:{},zoom=Number(studio.zoom);
 return {
  carId,mapId,paint:style.paint,style:{...style},appearances,tuning:{...tuning},tunings,
  studio:{lighting:['redline','daylight','midnight'].includes(studio.lighting)?studio.lighting:'redline',autoOrbit:typeof studio.autoOrbit==='boolean'?studio.autoOrbit:true,zoom:Number.isFinite(zoom)?Math.max(6,Math.min(9,zoom)):6.4},
  name:cleanName(source.name),music:typeof source.music==='boolean'?source.music:true
 };
}
