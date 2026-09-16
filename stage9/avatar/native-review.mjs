import {mountReceptionist} from './studio-scene.mjs';
import {SpeechPlayer} from './speech-player.mjs';
import {Attention} from './attention.mjs';
import {sha256,validatePacket} from './speech-core.mjs';
import sample from '../review/sample.json';
import * as THREE from 'three';
import {tieReviewMotion} from './tie-review-motion.mjs';

const status=document.querySelector('#status'),metrics=document.querySelector('#metrics');
const play=document.querySelector('#play'),stop=document.querySelector('#stop');
const payload=JSON.parse(document.querySelector('#private-assets').textContent);
const decode=base64=>Uint8Array.from(atob(base64),c=>c.charCodeAt(0)).buffer;
let generation=0,view,motionTime=null,reviewBones=null;
function bodyReview({model,dt}){
 if(motionTime===null||!reviewBones)return;
 const {chest,lower,cq,lq,cp}=reviewBones,m= tieReviewMotion(motionTime);
 const rotate=(bone,rest,yaw,pitch,roll)=>{const p=bone.parent.getWorldQuaternion(new THREE.Quaternion()),base=p.clone().multiply(rest),o=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ'));bone.quaternion.copy(p.invert().multiply(o).multiply(base));bone.updateMatrixWorld(true);};
 rotate(lower,lq,0,m.lean*.4,m.roll*.3);rotate(chest,cq,m.yaw,m.lean*.6,m.roll*.7);chest.position.copy(cp);chest.position.x+=m.shift;model.updateMatrixWorld(true);motionTime+=dt;
 if(motionTime>=8){resetBody();status.textContent='Movement test complete — the tie has settled.';}
}
function resetBody(){motionTime=null;if(reviewBones){const {chest,lower,cq,lq,cp}=reviewBones;chest.quaternion.copy(cq);chest.position.copy(cp);lower.quaternion.copy(lq);view.scene.updateMatrixWorld(true);}}
function framing(name){
 const c=view.camera,w=document.querySelector('#stage').clientWidth,h=document.querySelector('#stage').clientHeight,aspect=w/h;
 const specs={office:[[0,1.35,3],[0,1.22,0],Math.max(.64,.56/aspect)],knot:[[0,1.49,3],[0,1.469,.055],.092],front:[[0,1.315,3],[0,1.275,.09],.285],quarter:[[.9,1.37,1.5],[0,1.285,.07],.30]};
 const [p,t,half]=specs[name]||specs.office;c.position.set(...p);c.lookAt(...t);c.left=-half*aspect;c.right=half*aspect;c.top=half;c.bottom=-half;c.updateProjectionMatrix();
}
const player=new SpeechPlayer(state=>{status.textContent=state;player.attention.set(state==='Speaking'?'speaking':'returning_to_idle');});
player.attention=new Attention();
const bytes=decode(payload.wav);
player.load=async()=>{const p={...sample,generation:++generation};validatePacket(p);if(await sha256(bytes)!==p.audioSha256)throw Error('Saved speech recording failed verification');player.packet=p;player.bytes=bytes;return p;};
async function initialize(){try{
 if(await sha256(bytes)!==sample.audioSha256)throw Error('Speech recording mismatch');
 view=mountReceptionist(document.querySelector('#stage'),{player,posterURL:payload.poster,beforeAnimation:bodyReview,onReport:report=>{metrics.textContent=JSON.stringify({...report,source:'Private saved model and original ElevenLabs recording',newSynthesisRequests:0},null,2);}});
 await view.load({avatar:decode(payload.avatar),office:decode(payload.office)});
 const chest=view.scene.getObjectByName('spine003'),lower=view.scene.getObjectByName('spine002');if(chest&&lower)reviewBones={chest,lower,cq:chest.quaternion.clone(),lq:lower.quaternion.clone(),cp:chest.position.clone()};
 document.querySelectorAll('button').forEach(b=>b.disabled=false);
 const tieButton=document.querySelector('#tie-test');if(tieButton)tieButton.disabled=!view.tieMotion?.enabled||view.report.rendering!=='webgl';
 status.textContent=view.report.rendering==='webgl'?'Ready — press Play saved speech.':'3D is unavailable in this browser. The image is a still preview; speech controls remain available.';
 document.querySelector('#transcript').textContent=sample.transcript;
}catch(error){status.textContent=error.message;}}
initialize();
play.onclick=()=>{view.setPose(null);view.setBlink(null);player.play();};
stop.onclick=()=>{player.stop();resetBody();view?.tieMotion?.reset();view.setPose(null);view.setBlink(null);status.textContent='Stopped';};
document.querySelectorAll('[data-pose]').forEach(button=>button.onclick=()=>{player.stop();view.setBlink(null);view.setPose(button.dataset.pose||null);status.textContent=button.textContent;});
document.querySelector('#blink').onclick=()=>{player.stop();view.setPose(null);view.setBlink(1);status.textContent='Closed eyes — press Neutral to reset.';};
document.querySelector('#viewport').onchange=e=>{const [w,h]=e.target.value.split('x').map(Number);const f=document.querySelector('#frame');f.style.width=w+'px';f.style.height=h+'px';};
window.addEventListener('pagehide',()=>view?.dispose(),{once:true});
document.querySelector('#tie-test')?.addEventListener('click',()=>{resetBody();view.tieMotion?.reset();motionTime=0;status.textContent='Eight-second torso movement and tie-settling test…';});
document.querySelectorAll('[data-tie-view]').forEach(b=>b.addEventListener('click',()=>framing(b.dataset.tieView)));
