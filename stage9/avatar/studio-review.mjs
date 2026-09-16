import {mountReceptionist} from './studio-scene.mjs';
import {SpeechPlayer} from './speech-player.mjs';
import {Attention} from './attention.mjs';
import {sha256,validatePacket} from './speech-core.mjs';
import sample from '../review/sample.json';

const status=document.querySelector('#status'),metrics=document.querySelector('#metrics');
const controls=[...document.querySelectorAll('[data-motion]')];
const play=document.querySelector('#play'),stop=document.querySelector('#stop');
let bytes=null,generation=0,view=null,latest={},history=[],rejected=0,startedAt=0;
const player=new SpeechPlayer(state=>{
 history.push(state);if(history.length>12)history.shift();status.textContent=state;
 if(state==='Speaking'){startedAt=performance.now();player.attention.set('speaking');}
 else if(state==='Ready')player.attention?.set('returning_to_idle');
});player.attention=new Attention();
player.load=async()=>{if(!bytes)throw Error('Select the saved recording');const p={...sample,generation:++generation};validatePacket(p);if(await sha256(bytes)!==p.audioSha256||await sha256(new TextEncoder().encode(p.transcript))!==p.transcriptSha256)throw Error('Hash rejected');player.packet=p;player.bytes=bytes;return p;};
function show(report){latest=report;metrics.textContent=JSON.stringify({...report,audioVerified:Boolean(bytes),audioContext:player.context?.state||'not-started',history,rejected,playbackWallSeconds:player.speaking?(performance.now()-startedAt)/1000:0},null,2);}
try{view=mountReceptionist(document.querySelector('#stage'),{player,posterURL:'studio-poster.png',onReport:show});show(view.report);}catch(e){status.textContent=e.message;}
document.querySelector('#files').addEventListener('change',async e=>{
 const files=Array.from(e.target.files),avatar=files.find(f=>f.name==='Prime_Receptionist_Web.glb'),office=files.find(f=>f.name==='Reception_Office_Environment.glb'),audio=files.find(f=>/\.wav$/i.test(f.name));
 try{
  if(avatar&&!view.report.loaded){status.textContent='Checking model and facial controls…';await view.load({avatar:await avatar.arrayBuffer(),office:office?await office.arrayBuffer():null});controls.forEach(b=>b.disabled=false);stop.disabled=false;}
  if(audio){const candidate=await audio.arrayBuffer();if(await sha256(candidate)!==sample.audioSha256){rejected++;throw Error('Choose the original timestamp-validation recording');}bytes=candidate;document.querySelector('#transcript').textContent=sample.transcript;}
  play.disabled=!bytes||!view.report.loaded;
  status.textContent=bytes&&view.report.loaded?'Model and original ElevenLabs recording verified.':view.report.loaded?'Model ready. Select the saved speech recording to test audio.':'Select both model files and the saved recording.';show(view.report);
 }catch(e){status.textContent=e.message;show(view.report);}
});
play.onclick=()=>{view.setPose(null);view.setBlink(null);player.play();};
stop.onclick=()=>{player.stop();view.setPose(null);view.setBlink(null);status.textContent='Stopped';};
document.querySelectorAll('[data-pose]').forEach(button=>button.onclick=()=>{player.stop();view.setPose(button.dataset.pose||null);view.setBlink(null);status.textContent=button.textContent;});
document.querySelector('#blink').onclick=()=>{player.stop();view.setPose(null);view.setBlink(1);status.textContent='Closed eyes';};
document.querySelector('#viewport').onchange=e=>{const [width,height]=e.target.value.split('x').map(Number);const frame=document.querySelector('#frame');frame.style.width=width+'px';frame.style.height=height+'px';};
window.addEventListener('pagehide',()=>view?.dispose(),{once:true});
