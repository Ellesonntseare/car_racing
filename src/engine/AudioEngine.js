export class AudioEngine {
 constructor(){this.ctx=null;this.oscs=[];this.gain=null;this.enabled=true;this.sfx=[];}
 start(){
  if(!this.enabled)return;
  try{
   if(this.ctx){this.ctx.resume();return;}
   this.ctx=new (window.AudioContext||window.webkitAudioContext)();
   this.gain=this.ctx.createGain();this.gain.gain.value=.0001;
   const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;
   filter.connect(this.gain);this.gain.connect(this.ctx.destination);
   for(const [wave,mul,gain] of [['sawtooth',1,.16],['triangle',.5,.36],['sawtooth',2,.08]]){
    const o=this.ctx.createOscillator(),amp=this.ctx.createGain();o.type=wave;o.frequency.value=65*mul;amp.gain.value=gain;o.connect(amp);amp.connect(filter);o.start();this.oscs.push({o,mul});
   }
   this.filter=filter;
  }catch(e){console.warn('Audio engine unavailable:',e);}
 }
 update(speed,throttle,nitro,rpm,redline=8000){if(!this.ctx||!this.enabled)return;
  speed=Number.isFinite(speed)?Math.max(0,speed):0;
  throttle=Number.isFinite(throttle)?Math.max(0,Math.min(1,throttle)):0;
  const rev=Number.isFinite(rpm)?Math.max(0,Math.min(1,rpm/redline)):Math.min(1,speed/95);
  const t=this.ctx.currentTime,freq=58+rev*132+throttle*12;
  for(const {o,mul} of this.oscs)o.frequency.setTargetAtTime(freq*mul,t,.08);
  this.gain.gain.setTargetAtTime(.018+Math.min(speed/130,.055)+Math.max(0,throttle)*.013,t,.08);
  this.filter.frequency.setTargetAtTime(320+rev*1250+(nitro?800:0),t,.09);
 }
 setEnabled(v){this.enabled=v;if(!v&&this.gain&&this.ctx)this.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.08);}
 dispose(){for(const {o} of this.oscs)o.stop();this.ctx?.close();}
}
