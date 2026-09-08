import {connectVoice} from './presentation.mjs?v=polish3';
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
 const media=new Audio();media.preload='auto';media.playbackRate=.5;media.preservesPitch=true;
 const url=URL.createObjectURL(new Blob([this.bytes],{type:'audio/wav'}));media.src=url;
 const source=this.context.createMediaElementSource(media);this.source=source;this.media=media;this.mediaUrl=url;
 this.disposeVoice=connectVoice(this.context,source,p.transcript);
 media.onended=()=>{if(!this.fence.valid(epoch,p))return;this.stop();};
 media.onerror=()=>{if(!this.fence.valid(epoch,p))return;this.stop();this.onstate('Unable to play — Audio playback failed');};
 await media.play();
 if(!this.fence.valid(epoch,p)){media.pause();return;}
 this.started=this.context.currentTime;this.speaking=true;this.onstate('Speaking');
 }catch(e){if(this.fence.epoch!==activeEpoch)return;this.stop();this.onstate('Unable to play — '+e.message);}
 }
 // Media time is in original transcript seconds even at half-speed playback.
 get time(){return this.media?Math.max(0,this.media.currentTime):0;}
 get cueTime(){return this.time+.025;}
 stop(){this.fence.stop();this.speaking=false;
 if(this.media){this.media.onended=null;this.media.onerror=null;this.media.pause();this.media.removeAttribute('src');this.media.load();this.media=null;}
 this.disposeVoice?.();this.disposeVoice=null;
 if(this.source){this.source.disconnect();this.source=null;}
 if(this.mediaUrl){URL.revokeObjectURL(this.mediaUrl);this.mediaUrl=null;}
 this.onstate('Ready');}
}
