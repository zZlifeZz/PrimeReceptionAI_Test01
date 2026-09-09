// Presentation schedule: packet audio/text/hashes remain untouched.
export function welcomePause(packet){
 if(!/^Welcome to Prime Reception AI\.[\s]+I'm Aurelia\b/.test(packet.transcript))return null;
 const words=packet.wordBoundaries;if(!Array.isArray(words))return null;
 const target='welcometoprimereceptionai';let prefix='';
 for(let i=0;i<Math.min(words.length-1,8);i++){
  prefix+=String(words[i].word).toLowerCase().replace(/[^a-z]/g,'');
  if(prefix===target){
   const end=words[i].end,next=words[i+1].start;
   if(!Number.isFinite(end)||!Number.isFinite(next)||end<0||next<end||next>=packet.duration)return null;
   // Ensure at least 550ms breathing room; preserve an already longer natural pause.
   const length=Math.max(0,.55-(next-end));
   return length>.001?{at:(end+next)/2,length}:null;
  }
  if(!target.startsWith(prefix))return null;
 }
 return null;
}
export function mapPlaybackTime(elapsed,duration,pause){
 const paused=!!pause&&elapsed>=pause.at&&elapsed<pause.at+pause.length;
 const removed=pause?Math.max(0,Math.min(pause.length,elapsed-pause.at)):0;
 return {time:Math.max(0,Math.min(duration,elapsed-removed)),paused};
}
