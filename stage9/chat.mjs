const root=document.querySelector('#primeChat'),frame=document.querySelector('#primeAvatar');
if(!root||!frame)throw Error('Prime shell missing');
const BASE='https://prime-backend-stage4.onrender.com/v1/stage9-test/',AVATAR='https://zzlifezz.github.io';
const log=root.querySelector('#primeChatLog'),status=root.querySelector('#primeChatStatus'),input=root.querySelector('input'),form=root.querySelector('form'),stopButton=root.querySelector('#primeChatStop'),explain=root.querySelector('#primeChatExplain');
const labels={demo:'Live AI Demo',why:'Why Prime',services:'Services',features:'Features',industries:'Industries',pricing:'Pricing',consultation:'Consultation',about:'About Prime'};
const unavailable='Prime is temporarily unavailable. Please try again shortly.';
let token='',sessionId='',nonce=crypto.randomUUID(),order=0,intent=0,active=null,ready=false,audioReady=false,initializing=null,currentSection='home',attention={state:'idle_tracking'},attentionTimer=null,watch=null;
const post=(type,data={})=>frame.contentWindow.postMessage({version:1,type,nonce,...data},AVATAR);
function face(state,x=0,y=0){clearTimeout(attentionTimer);attention={state,x,y};post('prime-attention',attention);}
function busy(value){stopButton.hidden=!value;}
function message(role,text){const p=document.createElement('p');p.dataset.role=role;p.textContent=text;log.append(p);while(log.children.length>20)log.firstElementChild.remove();log.scrollTop=log.scrollHeight;}
async function raw(action,body={}){let httpStatus=0;try{const r=await fetch(BASE+action,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(action==='session'?15000:65000),credentials:'omit',redirect:'error'});httpStatus=r.status;const data=await r.json();if(!r.ok){console.error('Prime connection HTTP',{action,httpStatus,code:typeof data.error==='string'?data.error.slice(0,80):'request_failed'});const failure=Error(unavailable);failure.transient=[502,503,504].includes(httpStatus);throw failure;}return data;}catch(e){console.error('Prime connection failed',{action,httpStatus,errorType:e.name});if(!httpStatus&&['TypeError','TimeoutError','AbortError'].includes(e.name))e.transient=true;throw e;}}
async function initialize(){if(sessionId)return;if(initializing)return initializing;initializing=(async()=>{let s;for(let attempt=0;attempt<2;attempt++){try{s=await raw('session');break;}catch(e){if(attempt||!e.transient)throw e;await new Promise(resolve=>setTimeout(resolve,500));}}if(s.scope!=='test-ui-only'||!s.token||!s.sessionId){console.error('Prime session schema rejected',{scope:s.scope,hasToken:!!s.token,hasSessionId:!!s.sessionId});throw Error(unavailable);}token=s.token;sessionId=s.sessionId;if(status.textContent===unavailable)status.textContent='';post('prime-bind',{sessionId});})();try{await initializing;}finally{initializing=null;}}

async function api(action,body={}){await initialize();return raw(action,body);}
function clearPlayback(){post('prime-speech-stop');active=null;clearInterval(watch);watch=null;}
async function stop(restore=true){intent++;clearPlayback();if(restore){face('idle_tracking');busy(false);status.textContent='';}if(sessionId)await api('stop',{clientOrder:++order});}
frame.addEventListener('load',()=>{ready=false;if(sessionId)post('prime-bind',{sessionId});});
stopButton.onclick=()=>stop().catch(()=>{status.textContent=unavailable;});
window.addEventListener('prime:sound',e=>{if(typeof e.detail?.enabled==='boolean'){post('prime-sound',{enabled:e.detail.enabled});if(!e.detail.enabled)stop().catch(()=>{status.textContent=unavailable;});}});
const matches=(a,b)=>a&&b&&['sessionId','responseId','generation','segmentId','transcriptSha256','audioSha256'].every(k=>a[k]===b[k]);
window.addEventListener('message',async e=>{
 const d=e.data;if(e.source!==frame.contentWindow||e.origin!==AVATAR||d?.version!==1||d.nonce!==nonce)return;
 if(d.type==='prime-ready'){ready=true;post('prime-sound',{enabled:window.PrimeSite?.state.soundOn!==false});post('prime-attention',attention);return;}
 if(d.type==='prime-audio-ready'){audioReady=true;return;}
 if(!matches(d.ref,active))return;
 const state={'prime-speaking-start':'speaking','prime-speaking-stop':'ended','prime-error':'error'}[d.type];if(!state)return;
 const ref=active;try{await api('ack',{...ref,state});if(ref!==active)return;if(state==='speaking'){face('speaking');status.textContent='';}else{clearPlayback();face('idle_tracking');busy(false);status.textContent=state==='error'?'Your answer is available above.':'';}}catch{clearPlayback();face('idle_tracking');busy(false);status.textContent=unavailable;}
});
async function submit(text,kind='turn'){
 const mine=intent+1;face('attentive_processing');busy(true);status.textContent='Thinking…';
 try{await stop(false);if(mine!==intent)return;await initialize();if(mine!==intent)return;
  if(kind==='turn')message('user',text);
  const section=labels[currentSection]?currentSection:'demo';
  const r=await api(kind,kind==='section'?{section,clientOrder:++order}:{text,section,clientOrder:++order});if(mine!==intent)return;
  if(r.ref?.sessionId!==sessionId||!Number.isInteger(r.ref.generation)||typeof r.text!=='string')throw Error(unavailable);
  message('assistant',r.text);status.textContent='';
  if(!r.speech){face('idle_tracking');busy(false);return;}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(r.text))),n=>n.toString(16).padStart(2,'0')).join('');if(mine!==intent)return;
  if(r.speech.transcript!==r.text||r.speech.transcriptSha256!==hash||!['sessionId','responseId','generation','segmentId'].every(k=>r.speech[k]===r.ref[k]))throw Error(unavailable);
  active={...r.ref,transcriptSha256:hash,audioSha256:r.speech.audioSha256};
  if(!ready||!audioReady||window.PrimeSite?.state.soundOn===false){await api('ack',{...active,state:'stopped'});active=null;face('idle_tracking');busy(false);return;}
  post('prime-speech-play',{packet:r.speech,expectedRef:{...active,transcript:r.text}});
  // Lease acknowledgement protects against a disconnected or suspended avatar.
  watch=setInterval(async()=>{const ref=active;if(!ref)return;try{const s=await api('status');if(active===ref&&(!s.active||s.active.responseId!==ref.responseId)){clearPlayback();face('idle_tracking');busy(false);}}catch{if(active===ref){clearPlayback();face('idle_tracking');busy(false);status.textContent=unavailable;}}},4000);
 }catch{if(mine!==intent)return;clearPlayback();face('idle_tracking');busy(false);status.textContent=unavailable;}
}
form.onsubmit=e=>{e.preventDefault();const text=input.value;if(!text.trim()||text.length>2000)return;input.value='';submit(text);};
function sectionChanged(section){if(section===currentSection)return;currentSection=section;stop().catch(()=>{});explain.hidden=!labels[section];if(labels[section]){explain.textContent='Explain '+labels[section];const el=document.getElementById(window.PrimeSite?.sectionIds?.[section]);const r=(el?.querySelector('h1,h2')||el)?.getBoundingClientRect();if(r){face('section',Math.max(-.7,Math.min(.7,(r.x+r.width/2)/innerWidth*2-1)),Math.max(-.5,Math.min(.5,1-(r.y+r.height/2)/innerHeight*2)));attentionTimer=setTimeout(()=>face('idle_tracking'),2200);}}}
window.addEventListener('prime:section-changed',e=>sectionChanged(e.detail?.section));
explain.onclick=()=>submit('','section');
const shell=document.getElementById('primeHome');if(shell){let menuOpen=false;new MutationObserver(()=>{sectionChanged(shell.dataset.currentSection||'home');const open=shell.classList.contains('menu-open');if(open!==menuOpen){menuOpen=open;if(!active){face(open?'section':'idle_tracking',open?.55:0,.1);if(open)attentionTimer=setTimeout(()=>face('idle_tracking'),1800);}}}).observe(shell,{attributes:true,attributeFilter:['data-current-section','class']});}
window.addEventListener('pagehide',()=>{clearPlayback();if(token)fetch(BASE+'stop',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({clientOrder:++order}),keepalive:true}).catch(()=>{});});
initialize().catch(()=>{status.textContent=unavailable;});
