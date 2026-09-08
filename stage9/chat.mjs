import {WelcomeFlow} from './welcome-flow.mjs?v=aurelia1';
const root=document.querySelector('#primeChat'),frame=document.querySelector('#primeAvatar');
if(!root||!frame)throw Error('Prime shell missing');
const BASE='https://prime-backend-stage4.onrender.com/v1/stage9-test/',AVATAR='https://zzlifezz.github.io';
const status=root.querySelector('#primeChatStatus'),input=root.querySelector('input'),form=root.querySelector('form'),stopButton=root.querySelector('#primeChatStop');
root.querySelector('#primeChatLog')?.remove();root.querySelector('#primeChatExplain')?.remove();
const labels={demo:'Live AI Demo',why:'Why Prime',services:'Services',features:'Features',industries:'Industries',pricing:'Pricing',consultation:'Consultation',about:'About Prime'};
const unavailable='Aurelia is temporarily unavailable. Please try again shortly.';
const welcome=new WelcomeFlow();
let welcomeActive=false,voiceRequested=false;
input.placeholder='Aurelia awaits your question…';input.setAttribute('aria-label','Ask Aurelia a question');root.setAttribute('aria-label','Talk with Aurelia');
const voiceButton=document.createElement('button');voiceButton.id='primeEnableVoice';voiceButton.type='button';voiceButton.className='prime-menu-button';voiceButton.textContent='Enable Voice';voiceButton.disabled=true;
const menuButton=document.getElementById('primeMenuButton');menuButton?.before(voiceButton);
voiceButton.onclick=()=>{voiceRequested=true;voiceButton.disabled=true;if(window.PrimeSite?.state.soundOn===false)document.getElementById('primeSound')?.click();post('prime-audio-enable');};
function beginWelcome(){if(!ready||!audioReady||!welcome.start())return;welcomeActive=true;submit('','welcome');}
function finishWelcome(stopped=false){if(!welcomeActive)return;welcomeActive=false;const next=stopped?welcome.stop():welcome.finish();if(next)queueMicrotask(()=>submit(next.text,next.kind));}
const arrivalURL=new URL(location.href);let arrivalTicket=arrivalURL.searchParams.get('primeAcceptance');
let token='',sessionId='',nonce=crypto.randomUUID(),order=0,intent=0,active=null,ready=false,audioReady=false,initializing=null,currentSection='home',state='idle_tracking',focus={x:0,y:0},watch=null,settle=null,errorTimer=null,pending=null,cancelQueue=Promise.resolve(),liveArmed=false;
const post=(type,data={})=>frame.contentWindow.postMessage({version:1,type,nonce,...data},AVATAR);
function face(next){clearTimeout(settle);state=next;root.dataset.interaction=state;post('prime-attention',{state,...focus});}
function idle(){face('returning_to_idle');settle=setTimeout(()=>face('idle_tracking'),1200);stopButton.hidden=true;status.textContent='';}
function fail(){idle();finishWelcome(true);status.textContent=unavailable;clearTimeout(errorTimer);errorTimer=setTimeout(()=>status.textContent='',6500);}
async function raw(action,body={},signal){const r=await fetch(BASE+action,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:signal||AbortSignal.timeout(65000),credentials:'omit',redirect:'error'});const d=await r.json();if(!r.ok){console.error('Prime request failed',{action,status:r.status});throw Error(unavailable);}return d;}
function bind(){if(sessionId)post('prime-bind',{sessionId});}
async function initialize(){
 if(sessionId)return;if(initializing)return initializing;
 initializing=(async()=>{const s=await raw('session',{},AbortSignal.timeout(20000));if(s.scope!=='test-ui-only'||!s.token||!s.sessionId)throw Error(unavailable);token=s.token;sessionId=s.sessionId;bind();root.dataset.connection='available';
 // Optional one-use acceptance credential, never a provider/bridge credential.
 const url=new URL(location.href),ticket=arrivalTicket;
 if(ticket){url.searchParams.delete('primeAcceptance');history.replaceState(history.state,'',url);await raw('acceptance',{ticket});arrivalTicket=null;liveArmed=true;}
 })();try{await initializing;}finally{initializing=null;}
}
function clear(){post('prime-speech-stop');active=null;clearInterval(watch);watch=null;pending?.abort();pending=null;}
async function cancel(restore=true){const mine=++intent;clear();if(restore)idle();
 if(sessionId){const body={clientOrder:++order};cancelQueue=cancelQueue.catch(()=>{}).then(()=>raw('stop',body));await cancelQueue;root.dataset.stop='acknowledged';}
 return mine;
}
stopButton.onclick=()=>{finishWelcome(true);cancel().catch(fail);};
frame.addEventListener('load',()=>{ready=false;bind();});
const matches=(a,b)=>a&&b&&['sessionId','responseId','generation','segmentId','transcriptSha256','audioSha256'].every(k=>a[k]===b[k]);
window.addEventListener('message',async e=>{
 const d=e.data;if(e.source!==frame.contentWindow||e.origin!==AVATAR||d?.version!==1||d.nonce!==nonce)return;
 if(d.type==='prime-bound'){post('prime-attention',{state,...focus});return;}
 if(d.type==='prime-attention-applied'){root.dataset.avatarInteraction=d.state;return;}
 if(d.type==='prime-ready'){ready=true;voiceButton.disabled=audioReady||voiceRequested;post('prime-sound',{enabled:window.PrimeSite?.state.soundOn!==false});post('prime-attention',{state,...focus});beginWelcome();return;}
 if(d.type==='prime-audio-ready'){audioReady=true;root.dataset.voice='enabled';voiceButton.remove();beginWelcome();return;}
 if(d.type==='prime-audio-blocked'){voiceRequested=false;voiceButton.disabled=false;return;}
 if(!matches(d.ref,active))return;
 const ack={'prime-speaking-start':'speaking','prime-speaking-stop':'ended','prime-error':'error'}[d.type];if(!ack)return;
 const ref=active;
 // Reflect playback immediately; network acknowledgement cannot delay the expression.
 if(ack==='speaking'){if(welcomeActive)welcome.speaking();face('speaking');status.textContent='';}else idle();
 try{await raw('ack',{...ref,state:ack});if(ref!==active)return;if(ack!=='speaking'){clear();if(ack==='error')fail();else finishWelcome();}}catch{if(ref===active){clear();fail();}}
});
async function submit(text,kind='turn'){
 if(kind!=='welcome'&&welcome.queue(text,kind)){status.textContent=welcomeActive?'Aurelia will answer after her welcome.':'Enable Voice to meet Aurelia.';return;}
 const mine=intent+1;const cancelled=cancel(false);face(kind==='section'?'section':'attentive_processing');stopButton.hidden=false;status.textContent=kind==='welcome'?'Aurelia is getting ready…':'Aurelia is thinking…';clearTimeout(errorTimer);
 try{
  await cancelled;if(mine!==intent)return;await initialize();if(mine!==intent)return;
  if(!ready||!audioReady)throw Error(!ready?'avatar_not_ready':'audio_not_enabled');
  const controller=new AbortController();pending=controller;
  const action=kind==='turn'?'live-turn':kind;
  // No automatic retry; the backend enforces the shared visit allowance.
  if(action==='live-turn')liveArmed=false;
  const started=performance.now();
  const r=await raw(action,kind==='welcome'?{clientOrder:++order}:kind==='section'?{section:currentSection,clientOrder:++order}:{text,section:labels[currentSection]?currentSection:'demo',clientOrder:++order},controller.signal);
  if(mine!==intent)return;pending=null;
  if(r.ref?.sessionId!==sessionId||!Number.isInteger(r.ref.generation)||typeof r.text!=='string')throw Error('Identity');
  root.dataset.reply='received';root.dataset.speech=r.speech?'prepared':'unavailable';root.dataset.roundTripMs=String(Math.round(performance.now()-started));status.textContent='';
  // Context remains in the expiring backend session; no transcript DOM/browser storage.
  if(!r.speech){idle();finishWelcome(true);if(r.fallback)fail();return;}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(r.text))),n=>n.toString(16).padStart(2,'0')).join('');if(mine!==intent)return;
  if(r.speech.transcript!==r.text||r.speech.transcriptSha256!==hash||!['sessionId','responseId','generation','segmentId'].every(k=>r.speech[k]===r.ref[k]))throw Error('Identity');
  active={...r.ref,transcriptSha256:hash,audioSha256:r.speech.audioSha256};
  if(!ready||!audioReady||window.PrimeSite?.state.soundOn===false){await raw('ack',{...active,state:'stopped'});active=null;idle();finishWelcome(true);return;}
  post('prime-speech-play',{packet:r.speech,expectedRef:{...active,transcript:r.text}});
  watch=setInterval(async()=>{const ref=active;if(!ref)return;try{const s=await raw('status');if(ref===active&&(!s.active||s.active.responseId!==ref.responseId)){clear();idle();finishWelcome(true);}}catch{if(ref===active){clear();fail();}}},4000);
 }catch(e){if(mine!==intent)return;clear();if(e.name!=='AbortError'){console.error('Prime turn stopped',{reason:['avatar_not_ready','audio_not_enabled'].includes(e.message)?e.message:'request_or_packet_failed'});fail();}}
}
if(arrivalURL.searchParams.get('primeReplay')==='1'){const replay=document.createElement('button');replay.type='button';replay.textContent='Replay saved answer';replay.id='primeReplay';replay.onclick=()=>submit('Replay saved answer','replay');form.append(replay);}
form.onsubmit=e=>{e.preventDefault();const text=input.value;if(!text.trim()||text.length>2000)return;input.value='';submit(text);};
function sectionChanged(section){
 if(section===currentSection||(!labels[section]&&section!=='home'))return;currentSection=section;root.dataset.section=section;
 if(!labels[section]){if(!welcomeActive&&welcome.state==='complete')cancel().catch(fail);return;}
 const el=document.getElementById(window.PrimeSite?.sectionIds?.[section]);const r=(el?.querySelector('h1,h2')||el)?.getBoundingClientRect();focus=r?{x:Math.max(-.65,Math.min(.65,(r.x+r.width/2)/innerWidth*2-1)),y:Math.max(-.4,Math.min(.4,1-(r.y+r.height/2)/innerHeight*2))}:{x:.4,y:.1};
 submit('','section');
}
window.addEventListener('prime:section-changed',e=>sectionChanged(e.detail?.section));
const shell=document.getElementById('primeHome');if(shell){currentSection=shell.dataset.currentSection||'home';new MutationObserver(()=>sectionChanged(shell.dataset.currentSection||'home')).observe(shell,{attributes:true,attributeFilter:['data-current-section']});}
window.addEventListener('prime:sound',e=>{if(typeof e.detail?.enabled==='boolean'){post('prime-sound',{enabled:e.detail.enabled});if(!e.detail.enabled){finishWelcome(true);cancel().catch(fail);}}});
window.addEventListener('pagehide',()=>{clear();if(token)fetch(BASE+'close',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:'{}',keepalive:true,credentials:'omit'}).catch(()=>{});token='';sessionId='';});
window.addEventListener('pageshow',e=>{if(e.persisted)initialize().catch(fail);});
initialize().catch(fail);
