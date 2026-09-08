// Stage 9 presentation only: no changes to audio identity or speech timing.
export const VOICE_GAIN = 0.58;
export function connectVoice(context, source, transcript) {
 const master=context.createGain();master.gain.value=VOICE_GAIN;
 // A mild high-shelf cut softens close-mic brightness without delaying the dry voice.
 const tone=context.createBiquadFilter();tone.type='highshelf';tone.frequency.value=3200;tone.gain.value=-2.5;
 master.connect(tone);tone.connect(context.destination);
 const nodes=[master,tone];
 const welcome=transcript.startsWith("Welcome to Prime Reception AI. I'm Aurelia,");
 if(welcome){
  const dry=context.createGain();dry.gain.value=.86;source.connect(dry);dry.connect(master);nodes.push(dry);
  // Quiet, short room reflections; no feedback or long echo masking consonants.
  for(const [seconds,level] of [[.043,.065],[.079,.04],[.127,.025]]){
   const delay=context.createDelay(.2),filter=context.createBiquadFilter(),wet=context.createGain();
   delay.delayTime.value=seconds;filter.type='lowpass';filter.frequency.value=3800;wet.gain.value=level;
   source.connect(delay);delay.connect(filter);filter.connect(wet);wet.connect(master);nodes.push(delay,filter,wet);
  }
 }else source.connect(master);
 let disposed=false;
 return ()=>{if(disposed)return;disposed=true;for(const node of nodes)node.disconnect();};
}
export function speakingMotion(time,amount){
 const t=Math.max(0,time),fade=Math.min(1,t/1.1)*amount;
 // Small independent head movement, keeping the gaze close to the visitor.
 return {yaw:fade*(.026*Math.sin(t*1.15)+.013*Math.sin(t*.49)),
 pitch:fade*(.015*Math.sin(t*1.7)+.009*Math.sin(t*.71)),
 roll:fade*.009*Math.sin(t*.85)};
}
