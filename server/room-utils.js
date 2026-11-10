export const cleanName = value => String(value||'Racer').trim().replace(/[<>]/g,'').slice(0,22)||'Racer';
export const cleanRoomCode = value => String(value||'').trim().toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,12);
export const validRoomCode = code => /^[A-Z0-9][A-Z0-9-]{3,11}$/.test(code);
export const validChat = value => String(value||'').trim().slice(0,180).replace(/[<>]/g,'');
export const cleanAppearance = value => {
 const source=value&&typeof value==='object'?value:{};
 const choice=(key,choices,fallback)=>choices.includes(source[key])?source[key]:fallback;
 return {
  paint:typeof source.paint==='string'&&/^#[0-9a-f]{6}$/i.test(source.paint)?source.paint.toLowerCase():'#a9adb9',
  finish:choice('finish',['gloss','satin','matte','metallic'],'gloss'),
  rim:choice('rim',['stock','graphite','chrome','gold'],'stock'),
  glass:choice('glass',['stock','smoke','limo','blue'],'stock'),
  caliper:choice('caliper',['stock','red','yellow','blue'],'stock')
 };
};
export const cleanTuning = value => Object.fromEntries(['engine','handling','brakes'].map(key=>{
 const level=Number(value?.[key]);return [key,Number.isFinite(level)?Math.max(0,Math.min(5,Math.round(level))):0];
}));
export const roomPublic = room => ({
  code:room.code, host:room.host, mapId:room.mapId, status:room.status, startedAt:room.startedAt||null,
 players:[...room.players.values()].map(p=>({id:p.id,name:p.name,carId:p.carId,ready:p.ready,loaded:!!p.spawned,appearance:p.appearance,tuning:p.tuning}))
});
