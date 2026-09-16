import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import * as THREE from 'three';
import {GLTFLoader} from '../avatar/vendor/GLTFLoader.js';
import {MeshoptDecoder} from '../avatar/vendor/meshopt_decoder.mjs';
import {ReceptionistModelAdapter} from '../avatar/receptionist-model-adapter.mjs';
import {FacialMixer,sha256,validatePacket} from '../avatar/speech-core.mjs';
import {Guard} from '../avatar/guard.mjs';
import {naturalVisemes} from '../avatar/natural-speech.mjs';

// Loads the actual asset and computes skinned/morphed vertices. This is not a GPU renderer.
globalThis.self=globalThis;
globalThis.ProgressEvent=class{constructor(type,values){Object.assign(this,{type},values);}};
const images=[];
globalThis.createImageBitmap=async blob=>{const data=Buffer.from(await blob.arrayBuffer()),m=await sharp(data).metadata();images.push({width:m.width,height:m.height});return {width:m.width,height:m.height,close(){}};};
const [modelPath,wavPath,reportPath]=process.argv.slice(2);
const bytes=await fs.readFile(modelPath),{scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const adapter=new ReceptionistModelAdapter({profile:'native'}),mixer=new FacialMixer(adapter),meshes=[],materials=new Set();
scene.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))materials.add(m);if(o.morphTargetDictionary){meshes.push(o);mixer.register(o);}});
const face=meshes.find(o=>o.name==='PrimeReception_Face'),teeth=meshes.filter(o=>adapter.role(o)==='teeth'),lashes=meshes.find(o=>o.name==='Prime_eyelashes'),brows=meshes.find(o=>o.name==='Prime_eyebrows');
assert(face&&lashes&&brows);assert.equal(Object.keys(face.morphTargetDictionary).length,51);assert(teeth.length>0);
const value=(o,key)=>o.morphTargetInfluences[o.morphTargetDictionary[key]]||0;
function positions(mesh){scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});const a=new Float32Array(mesh.geometry.attributes.position.count*3),v=new THREE.Vector3();for(let i=0;i<a.length/3;i++){mesh.getVertexPosition(i,v);v.applyMatrix4(mesh.matrixWorld);v.toArray(a,i*3);}return a;}
function movement(a,b){assert.equal(a.length,b.length);let max=0;for(let i=0;i<a.length;i+=3)max=Math.max(max,Math.hypot(a[i]-b[i],a[i+1]-b[i+1],a[i+2]-b[i+2]));return max;}
function neutral(){for(let i=0;i<90;i++)mixer.apply(1/60,false,{},0);}
neutral();const closed=positions(face),teethClosed=teeth.map(positions);
for(let i=0;i<60;i++)mixer.apply(1/60,true,{aa:1},.3);
const faceJaw=movement(closed,positions(face)),teethJaw=teeth.map((o,i)=>movement(teethClosed[i],positions(o)));
assert(faceJaw>.004&&faceJaw<.08);assert(teethJaw.every(v=>v>.003&&v<.06));assert(value(face,'jawOpen')>.3);
for(let i=0;i<60;i++)mixer.apply(1/60,true,{PP:1},.6);
assert(value(face,'jawOpen')<.001&&value(face,'mouthPressLeft')>.2&&value(face,'mouthClose')<.001);
neutral();const blinkChecks={};
for(const side of ['Left','Right']){
 const before=positions(face),beforeLash=positions(lashes);
 for(const mesh of meshes){const index=mesh.morphTargetDictionary['eyeBlink'+side];if(index!=null)mixer.set(mesh,index,1);}
 mixer.apply(1/60,false,{},0);
 const df=movement(before,positions(face)),dl=movement(beforeLash,positions(lashes));assert(df>.002&&dl>.001);assert.equal(value(face,'eyeBlink'+(side==='Left'?'Right':'Left')),0);
 blinkChecks[side]={faceMovementMeters:df,lashMovementMeters:dl};
 for(const mesh of meshes){const index=mesh.morphTargetDictionary['eyeBlink'+side];if(index!=null)mixer.set(mesh,index,0);}
 mixer.apply(1/60,false,{},0);
}
assert(movement(closed,positions(face))<.00001);
const head=scene.getObjectByName('head'),hairRoot=scene.getObjectByName('Prime_Bob_Hair');assert(head&&hairRoot);
const hair=[];hairRoot.traverse(o=>{if(o.isMesh)hair.push(o);});assert(hair.length);
const hb=hair.map(positions),q=head.quaternion.clone();head.rotateY(.08);const hairMovement=hair.map((o,i)=>movement(hb[i],positions(o)));assert(hairMovement.some(v=>v>.002));head.quaternion.copy(q);assert(hair.every((o,i)=>movement(hb[i],positions(o))<.00001));
const wetEyes=[...materials].filter(m=>m.name.includes('wet cornea'));assert(wetEyes.length>=1&&wetEyes.every(m=>m.transmission>.95));
const eyeMeshes=[];scene.traverse(o=>{if(o.isMesh&&[].concat(o.material).some(m=>m.name.includes('HG_Eyes')))eyeMeshes.push(o);});assert(eyeMeshes.length);
const gazeChecks={};
for(const side of ['L','R']){
 const bone=scene.getObjectByName('eyeball'+side)||scene.getObjectByName('eyeball.'+side);assert(bone,'Missing eye bone '+side);
 const before=eyeMeshes.map(positions),rest=bone.quaternion.clone();bone.rotateZ(.10);
 const amount=Math.max(...eyeMeshes.map((o,i)=>movement(before[i],positions(o))));assert(amount>.0003&&amount<.02);gazeChecks[side]=amount;
 bone.quaternion.copy(rest);assert(eyeMeshes.every((o,i)=>movement(before[i],positions(o))<.00001));
}
const skin=[...materials].find(m=>m.name.includes('Prime_Native_Body'));assert(skin?.map&&skin?.normalMap&&skin?.roughnessMap);assert(skin.map.image.width>=4096&&skin.normalMap.image.width>=4096);
const shirts=[...materials].filter(m=>m.name.includes('Dress_Shirt'));assert(shirts.length&&shirts.every(m=>!m.transparent&&m.opacity===1));
const packet=JSON.parse(await fs.readFile(new URL('../review/sample.json',import.meta.url),'utf8')),wav=await fs.readFile(wavPath);validatePacket(packet);assert.equal(await sha256(wav),packet.audioSha256);assert.equal(await sha256(new TextEncoder().encode(packet.transcript)),packet.transcriptSha256);
let maxJaw=0,maxPress=0;
for(let t=0;t<packet.duration;t+=1/60){mixer.apply(1/60,true,naturalVisemes(packet.speechCues,t),t);maxJaw=Math.max(maxJaw,value(face,'jawOpen'));maxPress=Math.max(maxPress,value(face,'mouthPressLeft'));}
assert(maxJaw>.25&&maxJaw<.5&&maxPress>.2);
const guard=new Guard();guard.bind('review','nonce');const p={...packet,sessionId:'review'};guard.expect(p);assert(await guard.check(p,wav));const bad=Buffer.from(wav);bad[bad.length-1]^=1;await assert.rejects(()=>guard.check(p,bad),/Hash rejected/);const pending=guard.check(p,wav);guard.stop();assert.equal(await pending,false);
neutral();assert(value(face,'jawOpen')<.001&&value(face,'mouthPressLeft')<.001);
for(const m of meshes)assert(m.morphTargetInfluences.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
const report={status:'passed',threeRevision:THREE.REVISION,actualGLTFLoader:true,actualVertexDeformation:true,gpuRenderingTested:false,physicalMobileTested:false,liveProviderCallTested:false,decodedImages:images,faceTargets:51,faceJawMeters:faceJaw,teethJawMeters:teethJaw,independentBlinks:blinkChecks,eyeGazeMeters:gazeChecks,hairHeadAttachmentMeters:hairMovement,wetCorneaRetained:true,opaqueShirt:true,skinTextureWidth:skin.map.image.width,skinNormalWidth:skin.normalMap.image.width,originalElevenLabsAudioHashVerified:true,timingProvenance:packet.timingProvenance,duration:packet.duration,maxJaw,maxPress,stopClearsMouth:true,tamperedAudioRejected:true,stalePacketRejected:true,meshTargets:meshes.map(m=>({name:m.name,role:adapter.role(m),count:Object.keys(m.morphTargetDictionary).length}))};
await fs.writeFile(reportPath,JSON.stringify(report,null,2));console.log('NATIVE_STUDIO_CHECK_PASSED',JSON.stringify({faceJaw,teethJaw,blinkChecks,images:images.length,maxJaw,maxPress}));
