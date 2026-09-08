export class GenerationFence {
  constructor(){this.epoch=0;this.generation=0;this.responseId=null;this.cancelled=false;}
  begin(packet){if(packet.generation<this.generation)throw Error('Stale generation');this.generation=packet.generation;this.responseId=packet.responseId;this.cancelled=false;return ++this.epoch;}
  valid(epoch,packet){return !this.cancelled&&epoch===this.epoch&&packet.generation===this.generation&&packet.responseId===this.responseId;}
  stop(){this.cancelled=true;this.epoch++;}
}
export const VISEME_NAMES=['sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'];
export function evaluate(cues,time){
 const out={};let total=0;
 for(const c of cues){const attack=.035,release=.045;let w=Math.min(1,(time-c.start+attack)/attack,(c.end+release-time)/release);if(w<=0)continue;w=w*w*(3-2*w)*(c.weight??1);total+=w;out[c.viseme]=(out[c.viseme]||0)+w;}
 if(total>1)for(const k in out)out[k]/=total;
 return out;
}
export class FacialMixer {
 constructor(adapter){this.adapter=adapter;this.entries=new Map();this.amount=0;}
 register(mesh){if(!mesh.morphTargetDictionary||!mesh.morphTargetInfluences)return;this.entries.set(mesh,{base:[...mesh.morphTargetInfluences],role:this.adapter.role(mesh)});}
 set(mesh,index,value){const e=this.entries.get(mesh);if(e&&index!=null)e.base[index]=value;}
 apply(delta,speaking,weights,time){
 this.amount+=(Number(speaking)-this.amount)*(1-Math.exp(-delta*(speaking?24:12)));
 const shapes=this.adapter.shapes(weights);
 for(const [mesh,e]of this.entries)for(const [name,index]of Object.entries(mesh.morphTargetDictionary))mesh.morphTargetInfluences[index]=this.adapter.target(e.role,name,e.base[index]||0,this.amount,shapes,time);
 }
}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function validatePacket(p){if(!Number.isFinite(p.duration)||p.duration<=0||p.duration>60||p.version!==1||!Number.isInteger(p.generation)||p.generation<1||p.segmentId!==0||!p.responseId||!Array.isArray(p.speechCues))throw Error('Invalid packet');let start=-1;for(const c of p.speechCues){if(!VISEME_NAMES.includes(c.viseme)||!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<start||c.start<0||c.end<c.start||c.end>p.duration+.001)throw Error('Invalid timing');start=c.start;}}
