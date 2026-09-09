import {preparePerformance} from './natural-speech.mjs?v=outputclock1';
import {connectVoice} from './presentation.mjs?v=outputclock1';
import {GenerationFence,sha256,validatePacket} from './speech-core.mjs';
export class SpeechPlayer{
 constructor(onstate){this.fence=new GenerationFence();this.onstate=onstate;this.speaking=false;this.packet=null;this.context=null;this.source=null;this.ready=null;}
 async load(){if(this.ready)return this.ready;this.ready=(async()=>{const r=await fetch('./speech.json');if(!r.ok)throw Error('Timing unavailable');const p=await r.json();validatePacket(p);const a=await fetch('./speech.wav');if(!a.ok)throw Error('Audio unavailable');const bytes=await a.arrayBuffer();if(await sha256(bytes)!==p.audioSha256||await sha256(new TextEncoder().encode(p.transcript))!==p.transcriptSha256)throw Error('Audio/text identity mismatch');this.packet=p;this.bytes=bytes;return p;})();return this.ready;}
 async play(){
 this.stop();const intent=this.fence.epoch;let activeEpoch=intent;
 try{this.context ||= new AudioContext();await this.context.resume();if(this.fence.epoch!==intent)return;
 const p=await this.load();if(this.fence.epoch!==intent)return;
 const epoch=this.fence.begin(p);activeEpoch=epoch;const buffer=await this.context.decodeAudioData(this.bytes.slice(0));if(!this.fence.valid(epoch,p))return;
 if(Math.abs(buffer.duration-p.duration)>.003)throw Error('Audio duration mismatch');
 this.performance=preparePerformance(buffer);
 const source=this.context.createBufferSource();source.buffer=buffer;source.playbackRate.value=1;
 this.source=source;this.disposeVoice=connectVoice(this.context,source,p.transcript);
 source.onended=()=>{if(!this.fence.valid(epoch,p))return;this.stop();};
 this.started=this.context.currentTime;this.lastTime=0;
 source.start(this.started);this.speaking=true;this.onstate('Speaking');
 }catch(e){if(this.fence.epoch!==activeEpoch)return;this.stop();this.onstate('Unable to play — '+e.message);}
 }
 // Animation follows the output device clock, not an independently buffered media element.
 get time(){
  if(!this.speaking||!this.source)return 0;
  const c=this.context;let heard=c.currentTime;
  const stamp=c.getOutputTimestamp?.();
  if(stamp&&stamp.performanceTime>0&&Number.isFinite(stamp.contextTime)){
   heard=stamp.contextTime+(c.state==='running'?Math.max(0,performance.now()-stamp.performanceTime)/1000:0);
  }else heard-=Math.max(0,c.outputLatency||0)+Math.max(0,c.baseLatency||0);
  const t=Math.min(this.packet.duration,Math.max(0,Math.min(c.currentTime,heard)-this.started));
  this.lastTime=Math.max(this.lastTime||0,t);return this.lastTime;
 }
 get cueTime(){return this.time;}
 stop(){this.fence.stop();this.speaking=false;
 if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}
 this.disposeVoice?.();this.disposeVoice=null;this.lastTime=0;
 this.onstate('Ready');}
}
