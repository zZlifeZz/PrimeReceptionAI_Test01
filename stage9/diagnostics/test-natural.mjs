// Run with the local saved WAV path as the first argument. No provider requests.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {naturalVisemes,preparePerformance,performanceMotion} from '../avatar/natural-speech.mjs';
import {evaluate} from '../avatar/speech-core.mjs';
import {CurrentModelAdapter} from '../avatar/current-model-adapter.mjs';
const dir=new URL('../../../..',import.meta.url);
const fixture=new URL('../review/',import.meta.url);
const p=JSON.parse(fs.readFileSync(new URL('sample.json',fixture))),wav=fs.readFileSync(process.argv[2] || new URL('sample.wav',fixture));
assert.equal(crypto.createHash('sha256').update(wav).digest('hex'),p.audioSha256);
let offset=12,pcm,rate;while(offset+8<wav.length){const name=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4);if(name==='fmt ')rate=wav.readUInt32LE(offset+12);if(name==='data')pcm=wav.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}
const samples=Float32Array.from({length:pcm.length/2},(_,i)=>pcm.readInt16LE(i*2)/32768);
const begin=performance.now();const track=preparePerformance({sampleRate:rate,duration:p.duration,getChannelData:()=>samples});const prepMs=performance.now()-begin;
const original=JSON.stringify(p);const a=new CurrentModelAdapter();const closures=p.speechCues.filter(c=>c.viseme==='PP').map(c=>{const time=(c.start+c.end)/2;const before=evaluate(p.speechCues,time).PP,after=naturalVisemes(p.speechCues,time).PP;assert(after>.98);const s=a.shapes(naturalVisemes(p.speechCues,time));assert(s.jawOpen<.025);assert.equal(a.target('head','jawOpen',0,1,s,time),a.target('teeth','jawOpen',0,1,s,time));return {time,before,after};});
let frames=0;for(let time=0;time<p.duration+.3;time+=1/120){const weights=naturalVisemes(p.speechCues,time);for(const n of Object.values(weights))assert(Number.isFinite(n)&&n>=0&&n<=1);const motion=performanceMotion(track,time,1);assert(Math.abs(motion.yaw)<=.0281&&Math.abs(motion.pitch)<=.0211&&Math.abs(motion.bodyYaw)<=.0041);frames++;}
assert.deepEqual(naturalVisemes(p.speechCues,p.duration+.2),{});
assert.deepEqual(performanceMotion(track,2,0),{yaw:0,pitch:0,roll:0,bodyYaw:0,bodyRoll:0});
assert.equal(JSON.stringify(p),original);
const longPause=[{start:0,end:.1,viseme:'U'},{start:.1,end:.5,viseme:'sil'},{start:.5,end:.6,viseme:'aa'}];assert.deepEqual(naturalVisemes(longPause,.3),{sil:1});
const report={fixtureSha256:p.audioSha256,duration:p.duration,frames,closures,performancePreparationMs:prepMs,emphasisBeats:track.beats.length,providerRequests:0,tests:'PASS',limitations:'Phoneme timing remains estimated from character timing; cloud browser WebGL unavailable. Not a visual acceptance result.'};
fs.writeFileSync(new URL('results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
