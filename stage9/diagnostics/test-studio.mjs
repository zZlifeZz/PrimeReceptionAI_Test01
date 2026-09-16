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

// Decode image bytes for Three.js loader verification. This does not simulate GPU rendering.
globalThis.self=globalThis;
globalThis.ProgressEvent=class{constructor(type,values){Object.assign(this,{type},values);}};
let images=0;
globalThis.createImageBitmap=async blob=>{const b=Buffer.from(await blob.arrayBuffer()),meta=await sharp(b).metadata();images++;return {width:meta.width,height:meta.height,close(){}};};
const [modelPath,audioPath,reportPath]=process.argv.slice(2);
if(!modelPath||!audioPath||!reportPath)throw Error('Pass model GLB, original WAV and output JSON');
const bytes=await fs.readFile(modelPath),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const {scene}=await loader.parseAsync(buffer,'');scene.updateMatrixWorld(true);
const adapter=new ReceptionistModelAdapter(),mixer=new FacialMixer(adapter),meshes=[];
scene.traverse(o=>{if(o.morphTargetDictionary){mixer.register(o);meshes.push(o);}});
const face=meshes.find(o=>o.name==='PrimeReception_Face'),teeth=meshes.filter(o=>adapter.role(o)==='teeth');
assert(face);assert.equal(Object.keys(face.morphTargetDictionary).length,51);assert(teeth.length>0);
assert(teeth.every(o=>'jawOpen' in o.morphTargetDictionary));
const value=(mesh,name)=>mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]]||0;
for(let i=0;i<60;i++)mixer.apply(1/60,true,{aa:1},.3);
assert(value(face,'jawOpen')>.3);assert(teeth.every(o=>value(o,'jawOpen')>.3));
for(let i=0;i<60;i++)mixer.apply(1/60,true,{PP:1},.6);
assert(value(face,'jawOpen')<.001);assert(value(face,'mouthPressLeft')>.2);assert(value(face,'mouthClose')<.001);
for(const mesh of meshes){for(const key of ['eyeBlinkLeft','eyeBlinkRight']){const i=mesh.morphTargetDictionary[key];if(i!=null)mixer.set(mesh,i,1);}}
mixer.apply(1/60,true,{aa:1},.9);assert.equal(value(face,'eyeBlinkLeft'),1);
for(let i=0;i<90;i++)mixer.apply(1/60,false,{},0);assert(value(face,'jawOpen')<.001);assert(value(face,'mouthPressLeft')<.001);
const head=scene.getObjectByName('head'),band=scene.getObjectByName('Ponytail_hair_band')||scene.getObjectByName('Ponytail hair band');
assert(head);const boneChildren=[];head.traverse(o=>{if(/band/i.test(o.name))boneChildren.push(o.name);});assert(boneChildren.length>0);
const packet=JSON.parse(await fs.readFile(new URL('../review/sample.json',import.meta.url))),wav=await fs.readFile(audioPath);
validatePacket(packet);assert.equal(await sha256(wav),packet.audioSha256);assert.equal(await sha256(new TextEncoder().encode(packet.transcript)),packet.transcriptSha256);
let maxJaw=0,maxPress=0;
for(let t=0;t<packet.duration;t+=1/60){mixer.apply(1/60,true,naturalVisemes(packet.speechCues,t),t);maxJaw=Math.max(maxJaw,value(face,'jawOpen'));maxPress=Math.max(maxPress,value(face,'mouthPressLeft'));}
assert(maxJaw>.25&&maxJaw<.5);assert(maxPress>.2);
const guard=new Guard();guard.bind('review','nonce');const p={...packet,sessionId:'review'};guard.expect(p);assert(await guard.check(p,wav));
const bad=Buffer.from(wav);bad[bad.length-1]^=1;await assert.rejects(()=>guard.check(p,bad),/Hash rejected/);
const pendingCheck=guard.check(p,wav);guard.stop();assert.equal(await pendingCheck,false);
for(let i=0;i<90;i++)mixer.apply(1/60,false,{},0);assert(value(face,'jawOpen')<.001);
for(const mesh of meshes)assert(mesh.morphTargetInfluences.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
const report={status:'passed',threeRevision:THREE.REVISION,actualGLTFLoader:true,gpuRenderingTested:false,decodedImages:images,faceTargets:51,morphMeshes:meshes.map(o=>({name:o.name,role:adapter.role(o)})),teethMeshes:teeth.length,hairBandAttachedToHead:boneChildren,originalElevenLabsAudioHashVerified:true,duration:packet.duration,alignmentProvenance:packet.timingProvenance,checks:['Open jaw reaches face and teeth','Closed lips do not activate corrective mouthClose','Blink remains independent','Stop clears mouth controls','Original ElevenLabs WAV matches timing packet','Final-audio-clock cues drive the new rig','Tampered audio rejected','In-flight stale verification rejected after Stop'],maxJaw,maxPress,finalJaw:value(face,'jawOpen')};
await fs.writeFile(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
