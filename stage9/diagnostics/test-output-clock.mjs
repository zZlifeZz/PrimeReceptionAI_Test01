import assert from 'node:assert/strict';
import {SpeechPlayer} from '../avatar/speech-player.mjs';
import {performanceMotion} from '../avatar/natural-speech.mjs';
const p=new SpeechPlayer(()=>{});let stopped=0,disconnected=0;
p.source={stop(){stopped++;},disconnect(){disconnected++;}};p.speaking=true;p.started=10;p.packet={duration:5};
p.context={currentTime:11,state:'running',getOutputTimestamp:()=>({contextTime:10.9,performanceTime:performance.now()})};
assert(Math.abs(p.time-.9)<.005);assert(Math.abs(p.cueTime-.9)<.005);
p.context.state='suspended';p.context.getOutputTimestamp=()=>({contextTime:10.8,performanceTime:1});assert(Math.abs(p.time-.9)<.005);
p.lastTime=0;p.context={currentTime:11,outputLatency:.08,baseLatency:.02};assert(Math.abs(p.time-.9)<.00001);
p.context.currentTime=20;assert.equal(p.time,5);const epoch=p.fence.epoch;p.stop();assert.equal(stopped,1);assert.equal(disconnected,1);assert.equal(p.time,0);assert(p.fence.epoch>epoch);
for(let i=0;i<6;i++){const motion=performanceMotion({beats:Array.from({length:6},(_,j)=>({time:j,strength:1}))},i+.1,1);assert(Math.abs(motion.pitch)<.0071);if(i%3!==0)assert.equal(motion.pitch,0);}
console.log('PASS: output-clock synchronization, latency fallback, monotonicity, duration clamp, Stop fence, sparse reduced nods. No provider requests.');
