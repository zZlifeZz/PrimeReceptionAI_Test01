import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from '../avatar/vendor/GLTFLoader.js';
import {MeshoptDecoder} from '../avatar/vendor/meshopt_decoder.mjs';
import {TieSecondaryMotion} from '../avatar/tie-secondary-motion.mjs';
import {tieReviewMotion} from '../avatar/tie-review-motion.mjs';
globalThis.self=globalThis;globalThis.ProgressEvent=class{};globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
const [file,output,framesPath]=process.argv.slice(2),b=await fs.readFile(file);
const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
scene.updateMatrixWorld(true);const solver=new TieSecondaryMotion(scene);assert(solver.enabled&&solver.bones.length===5);
const chest=scene.getObjectByName('spine003'),lower=scene.getObjectByName('spine002'),head=scene.getObjectByName('head');assert(chest&&lower&&head);
const cq=chest.quaternion.clone(),lq=lower.quaternion.clone(),cp=chest.position.clone();
const originals=new Map();scene.traverse(o=>{if(o.isBone&&!o.name.startsWith('PrimeTie'))originals.set(o.name,{q:o.quaternion.toArray(),p:o.position.toArray()});});
const shirt=scene.getObjectByName('HG_Dress_Shirt_Female001')||scene.getObjectByName('HG_Dress_Shirt_Female.001');assert(shirt?.isSkinnedMesh);
const parts=[shirt,solver.blade,scene.getObjectByName('PrimeTie_Knot'),scene.getObjectByName('PrimeReception_Face')];assert(parts.every(Boolean));
const v=new THREE.Vector3(),q=new THREE.Quaternion(),zaxis=new THREE.Vector3(0,0,1),xaxis=new THREE.Vector3(1,0,0),yaxis=new THREE.Vector3(0,1,0);
const pts=(mesh)=>{mesh.skeleton?.update();const a=new Float32Array(mesh.geometry.attributes.position.count*3);for(let i=0;i<a.length/3;i++){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);v.toArray(a,i*3);}return a;};
function normals(mesh){
 const normal=mesh.geometry.attributes.normal,si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight,morph=mesh.geometry.morphAttributes.normal||[],out=new Float32Array(normal.count*3),n=new THREE.Vector3(),d=new THREE.Vector3(),pre=new THREE.Vector4(),sum=new THREE.Vector4(),one=new THREE.Vector4(),bone=new THREE.Matrix4(),world=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
 const active=morph.map((m,i)=>[m,mesh.morphTargetInfluences?.[i]||0]).filter(x=>x[1]);
 for(let i=0;i<normal.count;i++){
  n.fromBufferAttribute(normal,i);for(const [m,w]of active){d.fromBufferAttribute(m,i);if(!mesh.geometry.morphTargetsRelative)d.sub(new THREE.Vector3().fromBufferAttribute(normal,i));n.addScaledVector(d,w);}
  if(si){
   pre.set(n.x,n.y,n.z,0).applyMatrix4(mesh.bindMatrix);sum.set(0,0,0,0);
   for(let j=0;j<4;j++){const weight=sw.getComponent(i,j);if(!weight)continue;bone.fromArray(mesh.skeleton.boneMatrices,si.getComponent(i,j)*16);one.copy(pre).applyMatrix4(bone).multiplyScalar(weight);sum.add(one);}
   sum.applyMatrix4(mesh.bindMatrixInverse);n.set(sum.x,sum.y,sum.z);
  }
  n.applyMatrix3(world).normalize().toArray(out,i*3);
 }return out;
}
function rotateWorld(bone,rest,yaw,pitch,roll){
 const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()),base=parent.clone().multiply(rest),offset=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ'));
 bone.quaternion.copy(parent.invert().multiply(offset).multiply(base));bone.updateMatrixWorld(true);
}
// Actual fully skinned shirt triangles, independent of the reduced live proxy.
function actualSurface(){
 const a=pts(shirt),index=shirt.geometry.index,vs=[];for(let i=0;i<a.length;i+=3)vs.push(new THREE.Vector3(a[i],a[i+1],a[i+2]).applyMatrix4(solver.inverse));
 const bins=Array.from({length:64},()=>[]);
 for(let i=0;i<index.count;i+=3){
  const p=vs[index.getX(i)],q=vs[index.getX(i+1)],r=vs[index.getX(i+2)];
  if(Math.max(p.x,q.x,r.x)<-.065||Math.min(p.x,q.x,r.x)>.065||Math.max(p.z,q.z,r.z)<.02)continue;
  const lo=Math.max(0,Math.floor((Math.min(p.y,q.y,r.y)-1)/.009)),hi=Math.min(63,Math.floor((Math.max(p.y,q.y,r.y)-1)/.009));
  for(let j=lo;j<=hi;j++)bins[j].push([p,q,r]);
 }
 return (x,y)=>{
  const bin=bins[Math.max(0,Math.min(63,Math.floor((y-1)/.009)))];let z=-Infinity;
  for(const [a,b,c] of bin){
   if(x<Math.min(a.x,b.x,c.x)-1e-7||x>Math.max(a.x,b.x,c.x)+1e-7)continue;
   const d=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(d)<1e-12)continue;
   const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/d,w=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/d;
   if(Math.min(u,w,1-u-w)>=-1e-5)z=Math.max(z,u*a.z+w*b.z+(1-u-w)*c.z);
  }return z;
 };
}
const trace=[],timings=[],geometry={fps:24,duration:8,includesSkinnedNormals:true,frames:[],parts:parts.map(m=>({name:m.name,vertices:m.geometry.attributes.position.count,indices:Array.from(m.geometry.index.array),uv:Array.from({length:m.geometry.attributes.uv?.count||0},(_,i)=>[m.geometry.attributes.uv.getX(i),m.geometry.attributes.uv.getY(i)]),material:[].concat(m.material).map(x=>x.name)}))};
let frameFile=framesPath?await fs.open(framesPath,'w'):null;let minClearance=Infinity,maxLag=0,maxAngle=0,maxSettle=0,checks=0,byteOffset=0;
const knotBind=pts(parts[2]);let knotError=0;
const anchor=scene.getObjectByName('PrimeTie_Anchor'),anchorQ=anchor.quaternion.clone(),anchorP=anchor.position.clone();
for(let frame=0;frame<192;frame++){
 const t=frame/24,m= tieReviewMotion(t);
 rotateWorld(lower,lq,0,m.lean*.4,m.roll*.3);rotateWorld(chest,cq,m.yaw,m.lean*.6,m.roll*.7);chest.position.copy(cp);chest.position.x+=m.shift;scene.updateMatrixWorld(true);
 const stateBefore=new Map();scene.traverse(o=>{if(o.isBone&&!o.name.startsWith('PrimeTie'))stateBefore.set(o.name,[o.quaternion.toArray(),o.position.toArray()]);});
 const start=performance.now();solver.update(1/24);timings.push(performance.now()-start);
 for(const [name,value]of stateBefore){const bone=scene.getObjectByName(name);assert.deepEqual([bone.quaternion.toArray(),bone.position.toArray()],value,'Solver changed host bone '+name);}
 assert(anchor.quaternion.angleTo(anchorQ)<1e-6&&anchor.position.distanceTo(anchorP)<1e-8,'Knot anchor changed');
 const ka=pts(parts[2]);for(let i=0;i<ka.length;i+=3){v.set(ka[i],ka[i+1],ka[i+2]).applyMatrix4(solver.inverse);knotError=Math.max(knotError,v.distanceTo(new THREE.Vector3(knotBind[i],knotBind[i+1],knotBind[i+2])));}
 const lag=solver.report.tipLagMeters||0;maxLag=Math.max(maxLag,lag);if(t>7)maxSettle=Math.max(maxSettle,lag);
 for(let i=0;i<5;i++)maxAngle=Math.max(maxAngle,solver.bones[i].quaternion.angleTo(solver.restQ[i]));
 let clear=null;
 {
  const surface=actualSurface(),bp=pts(solver.blade);clear=Infinity;
  for(let i=0;i<bp.length;i+=3){v.set(bp[i],bp[i+1],bp[i+2]).applyMatrix4(solver.inverse);const z=surface(v.x,v.y);if(Number.isFinite(z)){clear=Math.min(clear,v.z-z);checks++;}}
  minClearance=Math.min(minClearance,clear);
 }
 trace.push({t,lag,clearance:clear,localQuaternions:solver.bones.map(b=>b.quaternion.toArray())});
 if(frameFile){
  geometry.frames.push({frame,t,byteOffset});
  for(const part of parts){const positions=pts(part),ns=normals(part);await frameFile.write(Buffer.from(positions.buffer));await frameFile.write(Buffer.from(ns.buffer));byteOffset+=positions.byteLength+ns.byteLength;}
 }
}
await frameFile?.close();
// Pause/resume and reduced-motion behavior must remain finite and contact-safe.
chest.quaternion.copy(cq);chest.position.copy(cp);lower.quaternion.copy(lq);scene.updateMatrixWorld(true);solver.update(1);solver.update(1/60,{reducedMotion:true});
assert(solver.bones.every(b=>b.quaternion.toArray().every(Number.isFinite)));
timings.sort((a,b)=>a-b);
const report={status:minClearance>=.0003&&maxLag<.025&&maxSettle<.0015?'passed':'needs_adjustment',actualGLTFLoader:true,actualThreeSkinnedVertices:true,gpuBrowserVisualCheck:false,hostBonesUntouchedBySolver:true,anchorErrorMeters:knotError,segments:5,frames:192,fps:24,durationSeconds:8,minimumActualShirtClearanceMeters:minClearance,checkedBladeVertexSamples:checks,maxTipLagMeters:maxLag,settledTipLagMeters:maxSettle,maxLocalBoneAngleRadians:maxAngle,solverMedianMs:timings[Math.floor(timings.length*.5)],solverP95Ms:timings[Math.floor(timings.length*.95)],reducedMotionAndPauseReset:true,trace};
await fs.writeFile(output,JSON.stringify(report,null,2));if(framesPath)await fs.writeFile(framesPath+'.json',JSON.stringify(geometry));console.log('TIE_MOTION_RESULT',JSON.stringify({...report,trace:undefined}));
assert.equal(report.status,'passed','Tie motion or clearance requires adjustment');
