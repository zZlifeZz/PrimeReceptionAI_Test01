// Stage 9 interaction policy; the facial mixer and model rig remain unchanged.
export class Attention {
 constructor(clock=()=>performance.now()){this.clock=clock;this.state='idle_tracking';this.x=0;this.y=0;this.changed=clock();this.section=null;}
 set(state,x=0,y=0){
  if(!['idle_tracking','attentive_processing','speaking','returning_to_idle','section'].includes(state))return false;
  this.state=state;this.changed=this.clock();this.x=Math.max(-.65,Math.min(.65,x));this.y=Math.max(-.4,Math.min(.4,y));
  if(state==='section')this.section={x:this.x,y:this.y};
  else if(state==='idle_tracking'||state==='attentive_processing')this.section=null;
  return true;
 }
 target(cursor){
  const elapsed=this.clock()-this.changed;
  if(this.state==='returning_to_idle'){
   if(elapsed>1100){this.set('idle_tracking');return {...cursor,speed:3};}
   const t=Math.max(0,Math.min(1,(elapsed-300)/800));const mix=t*t*(3-2*t);
   return {x:cursor.x*mix,y:cursor.y*mix,speed:3};
  }
  if(this.state==='idle_tracking')return {...cursor,speed:8.2};
  if(this.state==='section')return elapsed<1200?{x:this.x,y:this.y,speed:3}:{x:0,y:0,speed:3};
  // A short glance during section speech, then sustained visitor eye contact.
  if(this.state==='speaking'&&this.section&&elapsed>2600&&elapsed<3400)return {...this.section,speed:2.5};
  return {x:0,y:0,speed:4};
 }
}
