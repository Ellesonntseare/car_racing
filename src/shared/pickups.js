export function applyNosPickup(state,car){
 state.nitro=Math.min(100,(state.nitro||0)+45);
 state.speed=Math.min(((car?.topSpeed||320)/3.6)*1.08,Math.max(0,state.speed)+12);
 state.pickupBoost=3;
}
