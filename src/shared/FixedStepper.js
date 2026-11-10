/** Fixed simulation ticks with bounded catch-up after stalls/background tabs. */
export class FixedStepper {
 constructor(step=1/60,maxSteps=8){this.step=step;this.maxSteps=maxSteps;this.remainder=0;}
 reset(){this.remainder=0;}
 advance(elapsed,tick){
  this.remainder+=Math.max(0,Math.min(Number.isFinite(elapsed)?elapsed:0,this.step*this.maxSteps));
  let count=0;
  while(this.remainder+1e-10>=this.step&&count<this.maxSteps){
   tick(this.step);this.remainder=Math.max(0,this.remainder-this.step);count++;
  }
  return Math.min(1,this.remainder/this.step);
 }
}
