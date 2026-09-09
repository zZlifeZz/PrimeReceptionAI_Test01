const frame=document.querySelector('iframe'),play=document.querySelector('#play'),status=document.querySelector('#status');
const nonce=crypto.randomUUID(),sessionId=crypto.randomUUID(),origin=location.origin;let generation=0,ready=false,audioReady=false,wanted=false,packet,bytes,active;
const post=(type,data={})=>frame.contentWindow.postMessage({version:1,type,nonce,...data},origin);
frame.onload=()=>post('prime-bind',{sessionId});
frame.src='../avatar/index.html?review=1&parentOrigin='+encodeURIComponent(origin)+'&v=outputclock1';
const prepared=fetch('./sample.json').then(r=>r.json()).then(p=>{packet=p;});
document.querySelector('#file').onchange=async e=>{const file=e.target.files[0];if(!file)return;await prepared;const b=await file.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==packet.audioSha256){status.textContent='Please select the original Stage 7 timestamp-validation WAV.';return;}bytes=b;play.disabled=!ready;status.textContent='Saved WAV verified. Ready to play.';};
async function start(){await prepared;if(!wanted||!bytes)return;wanted=false;post('prime-attention',{state:'attentive_processing'});let binary='';for(const b of new Uint8Array(bytes))binary+=String.fromCharCode(b);active={...packet,sessionId,generation:++generation};post('prime-speech-play',{expectedRef:active,packet:{...active,audioBase64:btoa(binary)}});}
play.onclick=()=>{wanted=true;post('prime-speech-stop');post('prime-audio-enable');if(audioReady)start();};
document.querySelector('#stop').onclick=()=>{wanted=false;post('prime-speech-stop');post('prime-attention',{state:'returning_to_idle'});status.textContent='Stopped';};
window.addEventListener('message',e=>{const d=e.data;if(e.origin!==origin||e.source!==frame.contentWindow||d?.nonce!==nonce)return;
if(d.type==='prime-ready'){ready=true;play.disabled=!bytes;status.textContent=bytes?'Ready for review — original recording speed':'Select the saved timestamp-validation WAV to begin.';}
if(d.type==='prime-audio-ready'){audioReady=true;if(wanted)start();}
if(d.type==='prime-speaking-start'){post('prime-attention',{state:'speaking'});status.textContent='Playing saved speech';}
if(d.type==='prime-speaking-stop'){post('prime-attention',{state:'returning_to_idle'});status.textContent='Finished — replay anytime';}
if(d.type==='prime-error'||d.type==='prime-audio-blocked'){wanted=false;play.disabled=!ready;status.textContent='Playback unavailable. Click Play to enable audio again.';}
});
window.addEventListener('pagehide',()=>post('prime-speech-stop'));
