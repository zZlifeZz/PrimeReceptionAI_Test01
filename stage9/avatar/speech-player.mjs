import {connectVoice} from './presentation.mjs?v=polish1';
import {GenerationFence,sha256,validatePacket} from './speech-core.mjs';
export class SpeechPlayer{
 constructor(onstate){this.fence=new GenerationFence();this.onstate=onstate;this.speaking=false;this.packet=null;this.context=null;this.source=null;this.ready=null;}
 async load(){if(this.ready)return this.ready;this.ready=(async()=>{const r=await fetch('./speech.json');if(!r.ok)throw Error('Timing unavailable');const p=await r.json();validatePacket(p);const a=await fetch('./speech.wav');if(!a.ok)throw Error('Audio unavailable');const bytes=await a.arrayBuffer();if(await sha256(bytes)!==p.audioSha256||await sha256(new TextEncoder().encode(p.transcript))!==p.transcriptSha256)throw Error('Audio/text identity mismatch');this.packet=p;this.bytes=bytes;return p;})();return this.ready;}
 async play(){
 this.stop();const intent=this.fence.epoch;
 try{this.context ||= new AudioContext();await this.context.resume();if(this.fence.epoch!==intent)return;
 const p=await this.load();if(this.fence.epoch!==intent)return;
 const epoch=this.fence.begin(p);const buffer=await this.context.decodeAudioData(this.bytes.slice(0));if(!this.fence.valid(epoch,p))return;
 if(Math.abs(buffer.duration-p.duration)>.003)throw Error('Audio duration mismatch');
 const source=this.context.createBufferSource();source.buffer=buffer;this.disposeVoice=connectVoice(this.context,source,p.transcript);this.source=source;this.started=this.context.currentTime+.04;
 source.onended=()=>{source.disconnect();this.disposeVoice?.();this.disposeVoice=null;if(this.fence.valid(epoch,p)){this.speaking=false;this.source=null;this.onstate('Ready');}};
 source.start(this.started);this.speaking=true;this.onstate('Speaking');
 }catch(e){this.stop();this.onstate('Unable to play — '+e.message);}
 }
 get time(){return this.context?Math.max(0,this.context.currentTime-this.started):0;}
 stop(){this.disposeVoice?.();this.disposeVoice=null;this.fence.stop();this.speaking=false;if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}this.onstate('Ready');}
}
