import {mountReceptionist} from './studio-scene.mjs';
import {createBridge,parentOrigin} from './bridge.mjs?v=playbackdiagnostic1';
const approved=new Set(['https://primereceptionai.ca','https://primetesti.carrd.co']);
let referringOrigin=null;try{referringOrigin=new URL(document.referrer).origin;}catch{}
const query=new URLSearchParams(location.search),isReview=query.get('review')==='1'&&parentOrigin===location.origin;
const embedded=parent!==window;
const trustedOrigin=approved.has(parentOrigin)?parentOrigin:approved.has(referringOrigin)?referringOrigin:null;
const player=embedded&&(approved.has(parentOrigin)||isReview)?createBridge():null;
const stage=document.querySelector('#stage');
let view;
try{
 view=mountReceptionist(stage,{player,parentOrigin:trustedOrigin||isReview&&parentOrigin});
 // A poster fallback remains speech-capable even when the device cannot create WebGL.
 if(view.report.rendering==='poster')window.dispatchEvent(new Event('prime-model-ready'));
 else{await view.load();window.dispatchEvent(new Event('prime-model-ready'));}
}catch(error){
 console.error('Prime receptionist:',error.message);
 if(view){view.report.errors.push('model_load_failed');const text=stage.querySelector('[role=status]');if(text)text.textContent='';window.dispatchEvent(new Event('prime-model-ready'));}
 else{const text=document.createElement('p');text.textContent='Your receptionist is temporarily unavailable.';stage.append(text);}
}
window.addEventListener('pagehide',()=>view?.dispose(),{once:true});
