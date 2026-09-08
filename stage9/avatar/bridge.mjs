import {Attention} from './attention.mjs';
import {SpeechPlayer} from './speech-player.mjs?v=polish3';
import {GenerationFence} from './speech-core.mjs';
import {Guard,messageAllowed} from './guard.mjs';
export const parentOrigin=new URLSearchParams(location.search).get('parentOrigin');
const parents=new Set(['https://primetesti.carrd.co','https://primereceptionai.ca']);
export function createBridge(){
 if(!parents.has(parentOrigin))throw Error('Unapproved parent');
 const origin=parentOrigin,guard=new Guard();let ready=false,pending=null,muted=false;
 const post=(type,extra={})=>parent.postMessage({version:1,type,nonce:guard.nonce,...extra},origin);
 let player;player=new SpeechPlayer(state=>{if(!guard.ref)return;if(state==='Speaking')post('prime-speaking-start',{ref:guard.ref,playbackTiming:{scheduledStartEpochMs:performance.timeOrigin+performance.now()+Math.max(0,player.started-player.context.currentTime)*1000,outputLatencyMs:(player.context.outputLatency||0)*1000}});else if(state.startsWith('Unable'))post('prime-error',{ref:guard.ref,message:state});else if(state==='Ready'&&player?.source===null&&pending===null)post('prime-speaking-stop',{ref:guard.ref});});
 // Supply a packet through a transport adapter; frozen player and mixer are untouched.
 player.load=async()=>{
 const p=pending,serial=guard.serial;let bytes;
 if(typeof p?.audioBase64==='string'){
  if(p.audioBase64.length>4000000)throw Error('Audio size rejected');
  bytes=Uint8Array.from(atob(p.audioBase64),c=>c.charCodeAt(0)).buffer;
 }else{
  let r;try{r=await fetch('/audio.wav');}catch(e){if(serial!==guard.serial)return p;throw e;}
  if(!r.ok){if(serial!==guard.serial)return p;throw Error('Audio unavailable');}
  bytes=await r.arrayBuffer();
 }
 if(serial!==guard.serial)return p;
 try{if(!await guard.check(p,bytes))return p;}catch(e){if(serial!==guard.serial)return p;throw e;}
 player.packet=p;player.bytes=bytes;pending=null;return p;
 };
 player.attention=new Attention();
 // Audio remains owned by this iframe; top-bar activation is origin/nonce checked.
 async function unlockAudio(){
  player.context ||= new AudioContext();
  player.context.resume().then(()=>{if(player.context.state==='running')post('prime-audio-ready');}).catch(()=>post('prime-audio-blocked'));
  setTimeout(()=>{if(player.context.state!=='running')post('prime-audio-blocked');},1500);
 }
 window.addEventListener('prime-model-ready',()=>{ready=true;post('prime-ready');});
 window.addEventListener('pagehide',()=>{guard.stop();player.stop();});
 window.addEventListener('message',async e=>{
 const d=e.data;if(e.source!==parent||e.origin!==origin||!d)return;
 if(d.type==='prime-sound'&&typeof d.enabled==='boolean'){muted=!d.enabled;if(muted){guard.stop();pending=null;player.stop();}return;}
 if(d.version!==1)return;
 if(d.type==='prime-bind'&&typeof d.sessionId==='string'&&typeof d.nonce==='string'){guard.stop();player.stop();pending=null;guard.bind(d.sessionId,d.nonce);window.primeStage8Nonce=d.nonce;player.fence=new GenerationFence();post('prime-bound');if(ready)post('prime-ready');if(player.context?.state==='running')post('prime-audio-ready');return;}
 if(!messageAllowed(e,parent,origin,guard.nonce))return;
 if(d.type==='prime-audio-enable'){await unlockAudio();return;}
 if(d.type==='prime-attention'&&['idle_tracking','attentive_processing','speaking','returning_to_idle','section'].includes(d.state)){player.attention.set(d.state,Number.isFinite(d.x)?d.x:0,Number.isFinite(d.y)?d.y:0);document.documentElement.dataset.primeInteraction=player.attention.state;post('prime-attention-applied',{state:player.attention.state});return;}
 if(d.type==='prime-speech-stop'){guard.stop();pending=null;player.stop();return;}
 if(d.type==='prime-sound'){muted=d.muted===true;if(muted){guard.stop();pending=null;player.stop();}return;}
 if(d.type==='prime-speech-play'){
 try{if(muted||!ready)throw Error('Audio not ready');guard.expect(d.expectedRef);pending=d.packet;await player.play();}catch(err){post('prime-error',{ref:d.packet,message:'Speech rejected or unavailable'});}
 }
 });
 return player;
}
