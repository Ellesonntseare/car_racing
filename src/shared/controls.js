/** Suppress stick drift and use the complete remaining range for steering. */
export function normalizeSteeringAxis(value,deadzone=.16){
 const axis=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;
 const zone=Math.max(0,Math.min(.95,Number.isFinite(deadzone)?deadzone:.16));
 const magnitude=Math.abs(axis);
 return magnitude<=zone?0:Math.sign(axis)*(magnitude-zone)/(1-zone);
}
