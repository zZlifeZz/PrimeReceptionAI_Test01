// Stage 9 Carrd adapter. No routing replacement; one existing avatar owns playback.
const root=document.querySelector('#primeChat'),frame=document.querySelector('#primeAvatar');
if(!root||!frame)throw Error('Prime shell missing');
const SITE='https://prime-stage8-harness.prime-recept-2344.chatgpt.site',AVATAR='https://zzlifezz.github.io';
const log=root.querySelector('#primeChatLog'),status=root.querySelector('#primeChatStatus'),input=root.querySelector('input'),form=root.querySelector('form'),connect=root.querySelector('#primeChatConnect');
let relay=null,nonce=crypto.randomUUID(),sessionId='',order=0,intent=0,active=null,ready=false;
const requests=new Map();
function say(s){status.textContent=s;}
function post(type,data={}){frame.contentWindow.postMessage({version:1,type,nonce,...data},AVATAR);}
function bind(){if(sessionId)post('prime-bind',{sessionId});}
frame.addEventListener('load',bind);
function rpc(action,body){return new Promise((resolve,reject)=>{if(!relay||relay.closed||!sessionId)return reject(Error('Connect your private session first'));const id=crypto.randomUUID(),timer=setTimeout(()=>{requests.delete(id);post('prime-speech-stop');reject(Error('Connection timed out; no retry made'));},65000);requests.set(id,{resolve,reject,timer});relay.postMessage({version:1,type:'prime-site-request',nonce,id,action,body},SITE);});}
function refMatches(a,b){return a&&b&&['sessionId','responseId','generation','segmentId','transcriptSha256','audioSha256'].every(k=>a[k]===b[k]);}
async function stop(){intent++;post('prime-speech-stop');active=null;if(!sessionId)return;say('Stopping…');await rpc('stop',{clientOrder:++order});say('Stopped · Render acknowledged');}
connect.onclick=()=>{relay=window.open(SITE+'/stage9-relay.html?origin='+encodeURIComponent(location.origin)+'&nonce='+nonce,'primePrivateConnection','popup,width=460,height=340');say(relay?'Connecting private session…':'Allow the private connection popup');};
root.querySelector('#primeChatStop').onclick=()=>stop().catch(e=>say(e.message));
window.addEventListener('prime:sound',e=>{if(typeof e.detail?.enabled==='boolean'){post('prime-sound',{enabled:e.detail.enabled});if(!e.detail.enabled)stop().catch(e=>say(e.message));}});
window.addEventListener('message',async e=>{
 const d=e.data;if(d?.version!==1||d.nonce!==nonce)return;
 if(e.source===relay&&e.origin===SITE&&d.type==='prime-site-result'){
  if(d.ready&&typeof d.sessionId==='string'){sessionId=d.sessionId;order=0;bind();say(d.mode==='live'?'Private live connection ready':'Private Render mock connected · providers locked');connect.textContent='Reconnect';form.querySelector('button').disabled=false;return;}
  const p=requests.get(d.id);if(p){clearTimeout(p.timer);requests.delete(d.id);d.error?p.reject(Error(d.error)):p.resolve(d.result);}else if(d.error)say(d.error);return;
 }
 if(e.source!==frame.contentWindow||e.origin!==AVATAR)return;
 if(d.type==='prime-ready'){ready=true;post('prime-sound',{enabled:window.PrimeSite?.state.soundOn!==false});return;}
 if(d.type==='prime-audio-ready'){say('Voice ready');return;}
 if(!refMatches(d.ref,active))return;
 const state={'prime-speaking-start':'speaking','prime-speaking-stop':'ended','prime-error':'error'}[d.type];
 if(state){const ref=active;try{await rpc('ack',{...ref,state});if(active===ref){say(state==='speaking'?'Speaking':state==='ended'?'Online':'Text preserved · audio unavailable');if(state!=='speaking')active=null;}}catch(e){post('prime-speech-stop');active=null;say(e.message);}}
});
form.onsubmit=async e=>{
 e.preventDefault();const text=input.value;if(!text.trim()||text.length>2000)return;
 try{const mine=intent+1;await stop();if(mine!==intent)return;input.value='';say('Thinking…');log.textContent='You: '+text;
  const selected=window.PrimeSite?.state.currentSection;const section=['demo','why','services','features','industries','pricing','consultation','about'].includes(selected)?selected:'demo';
  const result=await rpc('turn',{text,section,clientOrder:++order});if(mine!==intent)return;
  if(result.ref?.sessionId!==sessionId||!Number.isInteger(result.ref.generation))throw Error('Session identity rejected');
  log.textContent='You: '+text+'\n\nPrime: '+result.text;
  if(!result.speech){say(result.fallback||'Text response ready');return;}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(result.text))),n=>n.toString(16).padStart(2,'0')).join('');
  if(mine!==intent)return;
  if(result.speech.transcript!==result.text||result.speech.transcriptSha256!==hash||!['sessionId','responseId','generation','segmentId'].every(k=>result.speech[k]===result.ref[k]))throw Error('Speech identity rejected');
  active={...result.ref,transcriptSha256:hash,audioSha256:result.speech.audioSha256};
  if(!ready||window.PrimeSite?.state.soundOn===false){await rpc('ack',{...active,state:'stopped'});active=null;say('Text ready · sound is off or avatar is loading');return;}
  say('Preparing speech…');post('prime-speech-play',{packet:result.speech,expectedRef:{...active,transcript:result.text}});
 }catch(err){post('prime-speech-stop');say(err.message+' · no automatic retry');}
};
window.addEventListener('pagehide',()=>{post('prime-speech-stop');if(sessionId)rpc('stop',{clientOrder:++order}).catch(()=>{});});
