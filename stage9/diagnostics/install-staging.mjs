import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../../',import.meta.url));
const dir=path.join(root,'stage9/avatar');
const inputs=process.argv.slice(2);
if(inputs.length!==3)throw Error('Provide the approved tie GLB, office GLB and office preview paths.');
const targets=[
 ['Prime_Reception_Native_Web.glb','cc33c127b1a45f0e00884c38f926378000b2b5d58a5ce57da4208c42e76f5f79'],
 ['Reception_Office_Environment.glb','fd9903eb74fe0065d62c3d7336df1deca7d08167936b8555702356574dbac390'],
 ['studio-poster.png','5bc252bee902694ebce2198171690524f4c63c8a8676463e768d10b9ae18c4e9']
];
const hash=b=>createHash('sha256').update(b).digest('hex');
const data=await Promise.all(inputs.map(p=>fs.readFile(p)));
for(let i=0;i<3;i++)if(hash(data[i])!==targets[i][1])throw Error('Unapproved asset bytes: '+targets[i][0]);
const rootBefore=hash(await fs.readFile(path.join(root,'index.html')));
const entry=path.join(dir,'index.html');
const old=await fs.readFile(entry);
const template=(await fs.readFile(path.join(dir,'studio-index.html'),'utf8'))
 .replace('src="./studio-entry.mjs"','src="./studio-entry.mjs?v=native-tie-20260916"');
if(old.toString()!==template){
 const backup=path.join(dir,'index.before-native.html');
 try{await fs.writeFile(backup,old,{flag:'wx'});}
 catch(e){if(e.code!=='EEXIST')throw e;if(hash(await fs.readFile(backup))!==hash(old))throw Error('An earlier entry checkpoint exists; inspect it before replacing the current entry.');}
}
for(let i=0;i<3;i++)await fs.writeFile(path.join(dir,targets[i][0]),data[i]);
await fs.writeFile(entry,template);
if(rootBefore!==hash(await fs.readFile(path.join(root,'index.html'))))throw Error('Production entry changed unexpectedly.');
console.log(JSON.stringify({installed:true,published:false,productionEntryUnchanged:true,assets:targets.map(([file,sha256])=>({file,sha256}))},null,2));
