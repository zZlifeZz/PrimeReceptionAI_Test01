// Stage 9 presentation calibration. Original packets, hashes and Stage 7 mixer are unchanged.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const plans=new WeakMap();
function plan(cues){
 if(plans.has(cues))return plans.get(cues);
 const out=cues.map(c=>({...c}));
 for(let i=1;i<out.length-1;i++){
  const c=out[i];
  // Character boundaries are not necessarily audible pauses. Bridge only brief gaps.
  if(c.viseme==='sil'&&c.end-c.start<.09){
   const mid=(c.start+c.end)/2;
   if(out[i-1].viseme!=='sil')out[i-1].end=mid;
   if(out[i+1].viseme!=='sil')out[i+1].start=mid;
   c.skip=true;
  }
 }
 plans.set(cues,out);return out;
}
export function naturalVisemes(cues,time){
 const out={};let total=0,closure=0;
 for(const c of plan(cues)){
  if(c.skip)continue;
  const duration=c.end-c.start;
  const edge=Math.max(.005,Math.min(.028,duration*.4));
  const w=smooth((time-c.start+edge)/edge)*smooth((c.end+edge-time)/edge)*(c.weight??1);
  if(w<=0)continue;
  if(c.viseme==='PP')closure=Math.max(closure,w);
  out[c.viseme]=(out[c.viseme]||0)+w;total+=w;
 }
 if(total>1)for(const k in out)out[k]/=total;
 // Bilabial closure is a constraint, not an average of an open vowel and closed lips.
 if(closure>0){for(const k in out)if(k!=='PP')out[k]*=1-closure;out.PP=closure;}
 return out;
}
export function preparePerformance(buffer){
 const hop=Math.max(1,Math.round(buffer.sampleRate*.02));
 const samples=buffer.getChannelData(0),energy=[];
 for(let start=0;start<samples.length;start+=hop){let sum=0;const end=Math.min(samples.length,start+hop);for(let i=start;i<end;i++)sum+=samples[i]*samples[i];energy.push(Math.sqrt(sum/(end-start)));}
 const sorted=[...energy].sort((a,b)=>a-b),level=sorted[Math.floor(sorted.length*.85)]||1;
 const e=energy.map(x=>clamp(x/level));const beats=[];let previous=-2;
 for(let i=2;i<e.length-2;i++)if(e[i]>.65&&e[i]>=e[i-1]&&e[i]>e[i+1]&&i*.02-previous>.85){previous=i*.02;beats.push({time:previous,strength:e[i]});}
 return {energy:e,beats,duration:buffer.duration};
}
export function performanceMotion(track,time,amount){
 const out={yaw:0,pitch:0,roll:0,bodyYaw:0,bodyRoll:0};if(!track||!amount)return out;
 for(let i=0;i<track.beats.length;i++){
  const b=track.beats[i],phase=(time-b.time+.08)/.72;
  if(phase<0||phase>1)continue;
  const envelope=Math.sin(Math.PI*phase)**2*b.strength*amount;
  const side=(i%3===0?-1:1)*(i%2===0?1:.6);
  out.yaw+=side*.028*envelope;
  out.pitch+=.021*envelope*Math.sin(Math.PI*2*phase);
  out.roll+=side*.010*envelope;
  // No torso/body movement: expressive head and face only.

 }
 return out;
}

export function performanceExpression(track,time,amount){
 if(!track||!amount)return {emphasis:0,warmth:0};
 let emphasis=0,warmth=0;
 for(const beat of track.beats){
  const phase=(time-beat.time+.05)/.65;
  if(phase>=0&&phase<=1)emphasis=Math.max(emphasis,Math.sin(Math.PI*phase)**2*beat.strength*amount);
  const settling=(time-beat.time-.12)/.85;
  if(settling>=0&&settling<=1)warmth=Math.max(warmth,Math.sin(Math.PI*settling)**2*amount);
 }
 return {emphasis,warmth};
}
