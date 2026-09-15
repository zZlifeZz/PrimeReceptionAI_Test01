import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/meshopt_decoder.mjs';
import {FacialMixer} from './speech-core.mjs';
import {ReceptionistModelAdapter} from './receptionist-model-adapter.mjs';
import {Attention} from './attention.mjs';
import {naturalVisemes,performanceMotion,performanceExpression} from './natural-speech.mjs';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const damp=(a,b,s,dt)=>a+(b-a)*(1-Math.exp(-s*dt));
const asset=name=>new URL(name,import.meta.url).href;

// Shared by the Carrd iframe and the private review. Audio has one owner.
export function mountReceptionist(stage,{player,posterURL=asset('studio-poster.png'),parentOrigin=null,onReport=()=>{}}={}){
 const events=new AbortController(),signal=events.signal;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xc5c8c6);
 const camera=new THREE.OrthographicCamera(-.64,.64,.64,-.64,.05,30);
 camera.position.set(0,1.35,3);camera.lookAt(0,1.22,0);
 const adapter=new ReceptionistModelAdapter(),mixer=new FacialMixer(adapter);
 const meshes=[],bones=new Map(),pointer={x:0,y:0},cursor={x:0,y:0};
 const attention=player?.attention||new Attention();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const report={loaded:false,rendering:'initializing',morphMeshes:0,faceTargets:0,teethTargets:0,frames:0,speechFrames:0,blinkFrames:0,maxJaw:0,maxLipPress:0,errors:[]};
 const fallback=document.createElement('img');fallback.alt='Aurelia, Prime Reception’s virtual receptionist';fallback.className='prime-studio-poster';fallback.src=posterURL;
 stage.append(fallback);
 const status=document.createElement('div');status.className='prime-studio-status';status.setAttribute('role','status');status.textContent='Preparing your receptionist…';stage.append(status);
 let renderer=null,model=null,environment=null,raf=0,last=performance.now(),elapsed=0,blinkStart=-1,blinkAt=2.8,disposed=false;
 let staticPose=null,staticBlink=null,loadStarted=false;
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<600?1.25:1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
  stage.append(renderer.domElement);report.rendering='webgl';
 }catch{
  report.rendering='poster';report.errors.push('webgl_unavailable');status.textContent='';
 }
 scene.add(new THREE.HemisphereLight(0xe4efff,0x544331,1.15));
 for(const [colour,intensity,position]of [[0xffeee0,2.6,[-1,2.5,2]],[0xe2f4ff,.85,[1,1.7,1]],[0xd6f0ff,.5,[1,2,-1]]]){
  const light=new THREE.DirectionalLight(colour,intensity);light.position.set(...position);scene.add(light);
 }
 function resize(){
  const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight),aspect=w/h;
  const halfHeight=Math.max(.64,.56/aspect);camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
  renderer?.setSize(w,h,false);report.viewport={width:w,height:h};
 }
 const observer=new ResizeObserver(resize);observer.observe(stage);resize();
 function base(name,value){for(const mesh of meshes){if(adapter.role(mesh)!=='head')continue;const i=mesh.morphTargetDictionary[name];if(i!=null)mixer.set(mesh,i,value);}}
 const world=new THREE.Quaternion(),offset=new THREE.Quaternion(),baseWorld=new THREE.Quaternion();
 function rotateBone(name,yaw,pitch,roll=0){
  const entry=bones.get(name);if(!entry)return;const {bone,rest}=entry;
  bone.parent.getWorldQuaternion(world);baseWorld.copy(world).multiply(rest);
  offset.setFromEuler(new THREE.Euler(-pitch,yaw,roll,'YXZ'));
  bone.quaternion.copy(world.invert().multiply(offset).multiply(baseWorld));bone.updateMatrixWorld(true);
 }
 function setPointer(x,y){if(Number.isFinite(x)&&Number.isFinite(y)){cursor.x=clamp(x,-1,1);cursor.y=clamp(y,-1,1);}}
 stage.addEventListener('pointermove',e=>{const b=stage.getBoundingClientRect();setPointer((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);},{signal});
 stage.addEventListener('pointerleave',()=>setPointer(0,0),{signal});
 window.addEventListener('message',e=>{
  if(!parentOrigin||e.source!==parent||e.origin!==parentOrigin||e.data?.type!=='prime-pointer')return;
  setPointer(Number(e.data.x),Number(e.data.y));
 },{signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)player?.stop();},{signal});
 if(renderer)renderer.domElement.addEventListener('webglcontextlost',e=>{
  e.preventDefault();player?.stop();fallback.hidden=false;renderer.domElement.hidden=true;
  report.rendering='poster';report.errors.push('webgl_context_lost');onReport({...report});
 },{signal});
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 async function parse(source){return source instanceof ArrayBuffer?loader.parseAsync(source,''):loader.loadAsync(source);}
 async function load({avatar=asset('Prime_Receptionist_Web.glb'),office=asset('Reception_Office_Environment.glb')}={}){
  if(disposed)throw Error('Receptionist disposed');if(loadStarted)throw Error('Receptionist already loading or loaded; reload to retry');loadStarted=true;
  const avatarResult=await parse(avatar);model=avatarResult.scene;scene.add(model);
  model.traverse(o=>{
   if(o.isMesh){o.frustumCulled=false;if(o.morphTargetDictionary&&o.morphTargetInfluences){mixer.register(o);meshes.push(o);}}
   if(o.isBone&&['head','neck','eyeball.L','eyeball.R'].includes(o.name))bones.set(o.name,{bone:o,rest:o.quaternion.clone()});
  });
  const face=meshes.find(o=>o.name==='PrimeReception_Face');
  if(!face||!bones.has('head'))throw Error('Receptionist rig is incomplete');
  const teeth=meshes.filter(o=>adapter.role(o)==='teeth');
  if(!teeth.some(o=>'jawOpen' in o.morphTargetDictionary))throw Error('Receptionist teeth rig is incomplete');
  report.morphMeshes=meshes.length;report.faceTargets=Object.keys(face.morphTargetDictionary).length;report.teethTargets=teeth.length;
  base('mouthSmileLeft',.055);base('mouthSmileRight',.055);
  try{if(office){environment=(await parse(office)).scene;scene.add(environment);}}catch{report.errors.push('office_unavailable');}
  report.loaded=true;status.textContent='';if(renderer&&report.rendering==='webgl')fallback.hidden=true;onReport({...report});return report;
 }
 function frame(now){
  if(disposed)return;const dt=clamp((now-last)/1000,0,.06);last=now;elapsed+=dt;
  if(!document.hidden){
   const speaking=Boolean(player?.speaking),time=player?.time||0,cueTime=player?.cueTime??time;
   if(model){
    const target=attention.target(cursor);pointer.x=damp(pointer.x,reduced.matches?0:target.x,4,dt);pointer.y=damp(pointer.y,reduced.matches?0:target.y,4,dt);
    if(elapsed>=blinkAt&&blinkStart<0){blinkStart=elapsed;blinkAt=elapsed+3+Math.random()*3;}
    let blink=0;if(blinkStart>=0){const t=(elapsed-blinkStart)/.17;blink=t<1?Math.sin(Math.PI*t):0;if(t>=1)blinkStart=-1;}
    if(staticBlink!==null)blink=staticBlink;base('eyeBlinkLeft',blink);base('eyeBlinkRight',blink);if(blink>.5)report.blinkFrames++;
    const motion=reduced.matches?{yaw:0,pitch:0,roll:0}:performanceMotion(player?.performance,time,Number(speaking));
    rotateBone('neck',pointer.x*.020,pointer.y*.015);
    rotateBone('head',pointer.x*.075+motion.yaw,pointer.y*.045+motion.pitch,motion.roll);
    rotateBone('eyeball.L',pointer.x*.04,pointer.y*.03);rotateBone('eyeball.R',pointer.x*.04,pointer.y*.03);
    adapter.expression=performanceExpression(player?.performance,time,Number(speaking));
    const active=staticPose!==null||speaking;
    const weights=staticPose!==null?{[staticPose]:1}:speaking&&cueTime>=0?naturalVisemes(player.packet?.speechCues||[],cueTime):{};
    mixer.apply(dt,active,weights,time);
    const face=meshes.find(o=>o.name==='PrimeReception_Face'),dict=face.morphTargetDictionary,values=face.morphTargetInfluences;
    report.jaw=values[dict.jawOpen]||0;report.lipPress=values[dict.mouthPressLeft]||0;report.blink=values[dict.eyeBlinkLeft]||0;
    report.maxJaw=Math.max(report.maxJaw,report.jaw);report.maxLipPress=Math.max(report.maxLipPress,report.lipPress);
    if(speaking)report.speechFrames++;
   }
   report.speaking=speaking;report.audioTime=time;report.frames++;
   if(renderer&&report.rendering==='webgl')renderer.render(scene,camera);
   if(report.frames%12===0)onReport({...report});
  }
  raf=requestAnimationFrame(frame);
 }
 raf=requestAnimationFrame(frame);
 function dispose(){if(disposed)return;disposed=true;player?.stop();cancelAnimationFrame(raf);observer.disconnect();events.abort();
  const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const mat of [].concat(o.material||[])){materials.add(mat);for(const v of Object.values(mat))if(v?.isTexture)textures.add(v);}});
  geometries.forEach(o=>o.dispose());materials.forEach(o=>o.dispose());textures.forEach(o=>o.dispose());renderer?.dispose();stage.replaceChildren();
 }
 return {load,dispose,report,scene,camera,mixer,adapter,player,setPose(v){staticPose=v;},setBlink(v){staticBlink=v;},setPointer};
}
