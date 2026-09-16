import * as THREE from 'three';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const V=()=>new THREE.Vector3();

/** Small accessory solver. Call AFTER all body/head animation and BEFORE render.
 * Owns only PrimeTie_01..05, never the host skeleton or facial controls.
 * Spring targets follow the actual torso; a skinned shirt patch provides contact.
 * No autonomous sine-wave tie animation and no real-time cloth simulation.
 */
export class TieSecondaryMotion {
 constructor(model){
  this.model=model;this.rig=model.getObjectByName('PrimeTie_Rig');this.enabled=Boolean(this.rig);
  this.report={enabled:this.enabled,segments:0,contactCorrections:0,resets:0,maxTipLagMeters:0};
  if(!this.enabled)return;
  this.config=this.rig.userData.primeTie;
  if(!this.config?.segments?.length)throw Error('Tie metadata is missing');
  this.bones=this.config.segments.map(n=>model.getObjectByName(n));
  this.collider=model.getObjectByName(this.config.collisionProxy);
  this.blade=model.getObjectByName('PrimeTie_Blade');
  if(this.bones.some(b=>!b?.isBone)||!this.collider?.isSkinnedMesh||!this.blade?.isSkinnedMesh)throw Error('Tie rig or collision skin is incomplete');
  this.collider.visible=false;model.updateMatrixWorld(true);
  this.bindInverse=this.rig.matrixWorld.clone().invert();
  this.restQ=this.bones.map(b=>b.quaternion.clone());
  this.rest=this.bones.map(b=>b.getWorldPosition(V()));
  this.rest.push(new THREE.Vector3(0,this.config.lengths.at(-1),0).applyMatrix4(this.bones.at(-1).matrixWorld));
  this.lengths=this.rest.slice(1).map((p,i)=>p.distanceTo(this.rest[i]));
  this.points=this.rest.map(p=>p.clone());this.vel=this.points.map(V);
  this.targets=this.points.map(p=>p.clone());this.old=this.points.map(p=>p.clone());
  this.transform=new THREE.Matrix4();this.inverse=new THREE.Matrix4();
  this.verts=Array.from({length:this.collider.geometry.attributes.position.count},V);
  const ix=this.collider.geometry.index;this.triangles=[];
  for(let i=0;i<ix.count;i+=3)this.triangles.push([ix.getX(i),ix.getX(i+1),ix.getX(i+2)]);
  this.bins=Array.from({length:64},()=>[]);this.binMin=1.0;this.binStep=.009;
  this.widths=this.config.widths;this.gaps=[];
  this.tmp=V();this.tmp2=V();this.dir=V();this.parentQ=new THREE.Quaternion();this.baseQ=new THREE.Quaternion();this.turnQ=new THREE.Quaternion();
  this.lastOrigin=this.rig.getWorldPosition(V());this.accumulator=0;
  this.updateCollision();
  this.gaps=this.rest.map((p,i)=>Math.max(.0027,p.z-this.surfaceAcross(p.x,p.y,this.widths[i])));
  // A small collection of the actual blade's rear-edge/centre vertices supplies
  // a second contact check after skinning. No assumed exporter vertex ordering.
  const samples=new Set();const pos=this.blade.geometry.attributes.position;
  for(let row=0;row<19;row++)for(const side of [-1,0,1]){
   const y=THREE.MathUtils.lerp(this.rest[0].y-.007,this.rest.at(-1).y+.003,row/18);let best=-1,score=Infinity;
   for(let i=0;i<pos.count;i++){
    this.blade.getVertexPosition(i,this.tmp).applyMatrix4(this.blade.matrixWorld);
    const t=clamp((this.rest[0].y-this.tmp.y)/(this.rest[0].y-this.rest.at(-1).y),0,1),w=THREE.MathUtils.lerp(.008,.021,Math.min(t/.87,1));
    const d=Math.abs(this.tmp.y-y)*4+Math.abs(this.tmp.x-side*w)+this.tmp.z*.002;
    if(d<score){score=d;best=i;}
   }
   samples.add(best);
  }
  this.sampleIds=[...samples];this.report.segments=this.bones.length;
  this.reset();
 }
 updateCollision(){
  this.model.updateMatrixWorld(true);
  this.transform.copy(this.rig.matrixWorld).multiply(this.bindInverse);this.inverse.copy(this.transform).invert();
  this.collider.skeleton.update();
  for(let i=0;i<this.verts.length;i++)this.collider.getVertexPosition(i,this.verts[i]).applyMatrix4(this.collider.matrixWorld).applyMatrix4(this.inverse);
  for(const bin of this.bins)bin.length=0;
  for(const ids of this.triangles){
   const a=this.verts[ids[0]],b=this.verts[ids[1]],c=this.verts[ids[2]];
   const lo=clamp(Math.floor((Math.min(a.y,b.y,c.y)-this.binMin)/this.binStep),0,63),hi=clamp(Math.floor((Math.max(a.y,b.y,c.y)-this.binMin)/this.binStep),0,63);
   for(let j=lo;j<=hi;j++)this.bins[j].push(ids);
  }
 }
 surface(x,y){
  let front=-Infinity;
  const bin=this.bins[clamp(Math.floor((y-this.binMin)/this.binStep),0,63)];
  for(const ids of bin){
   const a=this.verts[ids[0]],b=this.verts[ids[1]],c=this.verts[ids[2]];
   if(x<Math.min(a.x,b.x,c.x)-1e-7||x>Math.max(a.x,b.x,c.x)+1e-7)continue;
   const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-12)continue;
   const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den,v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den,w=1-u-v;
   if(Math.min(u,v,w)>=-1e-5)front=Math.max(front,u*a.z+v*b.z+w*c.z);
  }
  return front;
 }
 surfaceAcross(x,y,width){return Math.max(this.surface(x-width,y),this.surface(x,y),this.surface(x+width,y));}
 contact(p,width,margin=.0040){
  this.tmp.copy(p).applyMatrix4(this.inverse);const z=this.surfaceAcross(this.tmp.x,this.tmp.y,width);
  if(Number.isFinite(z)&&this.tmp.z<z+margin){this.tmp.z=z+margin;p.copy(this.tmp).applyMatrix4(this.transform);this.report.contactCorrections++;}
 }
 makeTargets(){
  for(let i=0;i<this.rest.length;i++){
   const p=this.targets[i].copy(this.rest[i]);
   if(i){const z=this.surfaceAcross(p.x,p.y,this.widths[i]);if(Number.isFinite(z))p.z=z+this.gaps[i];}
   p.applyMatrix4(this.transform);
  }
 }
 constrain(iterations=5){
  for(let k=0;k<iterations;k++){
   this.points[0].copy(this.targets[0]);
   for(let i=1;i<this.points.length;i++){
    const a=this.points[i-1],b=this.points[i];this.dir.subVectors(b,a);const d=this.dir.length();if(d>1e-8)b.copy(a).addScaledVector(this.dir,this.lengths[i-1]/d);
    this.contact(b,Math.max(this.widths[i],i===5?.009:0));
   }
   // Mid-segment chest projection protects the blade between joint locations.
   for(let i=0;i<this.points.length-1;i++){
    this.tmp2.copy(this.points[i]).lerp(this.points[i+1],.5);const old=this.tmp2.clone();this.contact(this.tmp2,Math.max(this.widths[i],this.widths[i+1]));
    this.dir.subVectors(this.tmp2,old);if(this.dir.lengthSq()>0){this.points[i+1].add(this.dir);if(i)this.points[i].add(this.dir);}
   }
  }
 }
 applyPose(){
  for(let i=0;i<this.bones.length;i++){
   const b=this.bones[i];b.parent.getWorldQuaternion(this.parentQ);this.baseQ.copy(this.parentQ).multiply(this.restQ[i]);
   const head=b.getWorldPosition(this.tmp),direction=this.dir.subVectors(this.points[i+1],head).normalize();
   this.tmp2.set(0,1,0).applyQuaternion(this.baseQ);this.turnQ.setFromUnitVectors(this.tmp2,direction);
   const angle=2*Math.acos(clamp(Math.abs(this.turnQ.w),-1,1));if(angle>.14)this.turnQ.slerp(new THREE.Quaternion(),1-.14/angle);
   b.quaternion.copy(this.parentQ.invert()).multiply(this.turnQ).multiply(this.baseQ);b.updateMatrixWorld(true);
  }
  this.blade.skeleton.update();
 }
 correctSkinContact(){
  let min=Infinity;
  for(let pass=0;pass<3;pass++){
   min=Infinity;let correction=0;
   for(const i of this.sampleIds){
    this.blade.getVertexPosition(i,this.tmp).applyMatrix4(this.blade.matrixWorld).applyMatrix4(this.inverse);
    const z=this.surface(this.tmp.x,this.tmp.y);if(Number.isFinite(z)){const gap=this.tmp.z-z;min=Math.min(min,gap);correction=Math.max(correction,.0023-gap);}
   }
   if(correction<.00005)break;
   correction=Math.min(.003,correction);
   for(let i=1;i<this.points.length;i++){this.tmp.copy(this.points[i]).applyMatrix4(this.inverse);this.tmp.z+=correction;this.points[i].copy(this.tmp).applyMatrix4(this.transform);}
   this.constrain(2);this.applyPose();
  }
  this.report.sampledClearanceMeters=min;
 }
 reset(){
  if(!this.enabled)return;
  for(let i=0;i<this.bones.length;i++)this.bones[i].quaternion.copy(this.restQ[i]);
  this.updateCollision();this.makeTargets();
  for(let i=0;i<this.points.length;i++){this.points[i].copy(this.targets[i]);this.vel[i].set(0,0,0);}
  this.constrain();this.applyPose();this.correctSkinContact();this.accumulator=0;this.lastOrigin.copy(this.rig.getWorldPosition(this.tmp));this.report.resets++;
 }
 update(dt,{reducedMotion=false}={}){
  if(!this.enabled)return;
  if(!Number.isFinite(dt)||dt<=0)return;
  const origin=this.rig.getWorldPosition(this.tmp);
  if(dt>.20||origin.distanceTo(this.lastOrigin)>.12){this.reset();return;}
  this.lastOrigin.copy(origin);this.updateCollision();this.makeTargets();
  if(reducedMotion){for(let i=0;i<this.points.length;i++){this.points[i].copy(this.targets[i]);this.vel[i].set(0,0,0);}this.constrain();this.applyPose();this.correctSkinContact();return;}
  this.accumulator+=Math.min(dt,1/15);const h=1/120;
  while(this.accumulator>=h){
   this.accumulator-=h;
   for(let i=1;i<this.points.length;i++){
    this.old[i].copy(this.points[i]);const omega=10.5-i*.6;
    this.dir.subVectors(this.targets[i],this.points[i]).multiplyScalar(omega*omega).addScaledVector(this.vel[i],-2.05*omega);
    this.vel[i].addScaledVector(this.dir,h);this.points[i].addScaledVector(this.vel[i],h);
    this.dir.subVectors(this.points[i],this.targets[i]);const limit=.002+.010*i/5;
    if(this.dir.length()>limit)this.points[i].copy(this.targets[i]).addScaledVector(this.dir,limit/this.dir.length());
   }
   this.constrain();
   for(let i=1;i<this.points.length;i++)this.vel[i].subVectors(this.points[i],this.old[i]).divideScalar(h).multiplyScalar(.985);
  }
  this.applyPose();this.correctSkinContact();
  const lag=this.points.at(-1).distanceTo(this.targets.at(-1));this.report.tipLagMeters=lag;this.report.maxTipLagMeters=Math.max(this.report.maxTipLagMeters,lag);
 }
 dispose(){if(!this.enabled)return;for(let i=0;i<this.bones.length;i++)this.bones[i].quaternion.copy(this.restQ[i]);this.enabled=false;}
}
