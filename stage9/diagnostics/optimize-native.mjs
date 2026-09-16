import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,textureCompress,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import validator from 'gltf-validator';
const [input,output,reportPath]=process.argv.slice(2);
if(!reportPath)throw Error('Pass source.glb web.glb validation.json');
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(input),targets=doc.getRoot().listMeshes().filter(m=>m.getExtras().targetNames).map(m=>({name:m.getName(),targets:m.getExtras().targetNames}));
// Preserve 4K skin colour/normal. Hair alpha edges remain lossless.
await doc.transform(dedup(),textureCompress({encoder:sharp,targetFormat:'webp',pattern:/hair/i,lossless:true,resize:[2048,2048],effort:80}),textureCompress({encoder:sharp,targetFormat:'webp',pattern:/^(?!.*hair).*$/i,resize:[4096,4096],quality:96,effort:80}),meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeNormal:14,quantizeTexcoord:16,quantizeWeight:16}));
await io.write(output,doc);const bytes=await fs.readFile(output),back=await io.read(output);
for(const {name,targets:keys}of targets){const m=back.getRoot().listMeshes().find(m=>m.getName()===name);if(JSON.stringify(m?.getExtras().targetNames)!==JSON.stringify(keys))throw Error('Lost morphs: '+name);}
const validation=await validator.validateBytes(new Uint8Array(bytes),{maxIssues:100});
const report={sourceBytes:(await fs.stat(input)).size,webBytes:bytes.length,morphNamesPreserved:true,textures:back.getRoot().listTextures().map(t=>({name:t.getName(),size:t.getSize(),bytes:t.getImage().length})),extensions:back.getRoot().listExtensionsUsed().map(e=>e.extensionName),validator:validation};
await fs.writeFile(reportPath,JSON.stringify(report,null,2));if(validation.issues.numErrors)throw Error('glTF validation failed; see report');console.log('WEB_OPTIMIZED',report.sourceBytes,report.webBytes,'errors',validation.issues.numErrors);
