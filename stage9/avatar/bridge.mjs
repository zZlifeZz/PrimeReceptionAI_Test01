import {SpeechPlayer} from './speech-player.mjs';
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
 const enable=document.createElement('button');enable.textContent='Enable voice';enable.style.cssText='position:fixed;z-index:99;bottom:18px;left:50%;transform:translateX(-50%);padding:12px 20px;background:#d6b765;color:#111;border:0;border-radius:7px;font:16px Arial';document.body.append(enable);
 enable.onclick=async()=>{player.context ||= new AudioContext();await player.context.resume();enable.textContent='Voice ready';post('prime-audio-ready');};
 window.addEventListener('prime-model-ready',()=>{ready=true;post('prime-ready');});
 window.addEventListener('pagehide',()=>{guard.stop();player.stop();});
 window.addEventListener('message',async e=>{
 const d=e.data;if(e.source!==parent||e.origin!==origin||!d)return;
 if(d.type==='prime-sound'&&typeof d.enabled==='boolean'){muted=!d.enabled;if(muted){guard.stop();pending=null;player.stop();}return;}
 if(d.version!==1)return;
 if(d.type==='prime-bind'&&typeof d.sessionId==='string'&&typeof d.nonce==='string'){guard.stop();player.stop();pending=null;guard.bind(d.sessionId,d.nonce);window.primeStage8Nonce=d.nonce;player.fence=new GenerationFence();if(ready)post('prime-ready');return;}
 if(!messageAllowed(e,parent,origin,guard.nonce))return;
 if(d.type==='prime-speech-stop'){guard.stop();pending=null;player.stop();return;}
 if(d.type==='prime-sound'){muted=d.muted===true;if(muted){guard.stop();pending=null;player.stop();}return;}
 if(d.type==='prime-speech-play'){
 try{if(muted||!ready)throw Error('Audio not ready');guard.expect(d.expectedRef);pending=d.packet;await player.play();}catch(err){post('prime-error',{ref:d.packet,message:'Speech rejected or unavailable'});}
 }
 });
 return player;
}
