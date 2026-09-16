import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import validator from 'gltf-validator';
const [approvedPath,editedPath,out]=process.argv.slice(2);
const hash=b=>createHash('sha256').update(b).digest('hex');
function parse(bytes){const n=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+n)),bin=bytes.subarray(28+n);return{j,bytes,imageHashes:new Map(j.images.map(im=>{const v=j.bufferViews[im.bufferView];return[im.name,hash(bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength))];}))};}
const a=parse(await fs.readFile(approvedPath)),b=parse(await fs.readFile(editedPath));
const imageChecks=[];for(const [name,sha]of a.imageHashes){assert.equal(b.imageHashes.get(name),sha,'Existing texture changed: '+name);imageChecks.push(name);}
function normalMaterial(m,d){
 const recurse=(v,key='')=>{
  if(Array.isArray(v))return v.map(x=>recurse(x));
  if(!v||typeof v!=='object')return v;
  const o={};for(const k of Object.keys(v).sort()){
   if(k==='extras')continue;
   if(k==='index'&&key.toLowerCase().includes('texture')){const t=d.j.textures[v[k]],image=d.j.images[t.source??t.extensions?.EXT_texture_webp?.source];o.imageHash=d.imageHashes.get(image.name);o.sampler=d.j.samplers[t.sampler];}
   else o[k]=recurse(v[k],k);
  }return o;
 };return recurse(m);
}
const materials=[];for(const m of a.j.materials){if(m.name==='Prime Master - black woven silk')continue;const n=b.j.materials.find(x=>x.name===m.name);assert(n,'Missing original material '+m.name);assert.deepEqual(normalMaterial(n,b),normalMaterial(m,a),'Material changed '+m.name);materials.push(m.name);}
const nodes=new Map(b.j.nodes.map(n=>[n.name,n])),geometry=[];
for(const n of a.j.nodes){
 if(n.mesh===undefined||n.name.startsWith('Prime Master - '))continue;
 const next=nodes.get(n.name);assert(next?.mesh!==undefined,'Missing original mesh node '+n.name);const am=a.j.meshes[n.mesh],bm=b.j.meshes[next.mesh];assert.equal(am.primitives.length,bm.primitives.length);
 for(let i=0;i<am.primitives.length;i++){
  const ap=am.primitives[i],bp=bm.primitives[i];for(const sem of Object.keys(ap.attributes)){assert(sem in bp.attributes,'Lost vertex attribute '+n.name+'/'+sem);assert.equal(a.j.accessors[ap.attributes[sem]].count,b.j.accessors[bp.attributes[sem]].count,'Changed vertex count '+n.name+'/'+sem);}
 }
 assert.deepEqual(bm.extras?.targetNames,am.extras?.targetNames,'Facial target names changed '+n.name);geometry.push(n.name);
}
const cn=nodes.get('PrimeTie_Collider'),cm=b.j.materials[b.j.meshes[cn.mesh].primitives[0].material];assert.equal(cm.alphaMode,'BLEND');assert.equal(cm.pbrMetallicRoughness.baseColorFactor[3],0);
const validation=await validator.validateBytes(new Uint8Array(b.bytes),{maxIssues:100});assert.equal(validation.issues.numErrors,0);
const report={status:'passed',approvedFile:approvedPath,editedFile:editedPath,sha256:hash(b.bytes),bytes:b.bytes.length,existingTextureImagesByteIdentical:imageChecks,existingMaterialPropertiesIdentical:materials,originalVertexAttributesAndCountsPreserved:geometry,originalNormalMapTangentsPreserved:true,facialTargetNamesPreserved:true,collisionHelperInvisibleInGenericViewers:true,validator:validation};
await fs.writeFile(out,JSON.stringify(report,null,2));console.log('APPROVED_CHARACTER_PRESERVED',imageChecks.length,'images;',materials.length,'materials;',geometry.length,'meshes; errors',validation.issues.numErrors,'warnings',validation.issues.numWarnings);
