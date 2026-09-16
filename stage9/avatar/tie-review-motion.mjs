// Review-only torso input. Production secondary motion consumes real body motion.
export function tieReviewMotion(t){
 const pulse=(a,b)=>t<=a||t>=b?0:Math.sin(Math.PI*(t-a)/(b-a))**2;
 return {yaw:.062*pulse(.7,2.6)-.057*pulse(2.6,4.6),lean:.032*pulse(2.4,4.8),roll:.013*pulse(.7,2.6)-.011*pulse(2.6,4.6),shift:.0045*pulse(.7,2.6)-.004*pulse(2.6,4.6)};
}
