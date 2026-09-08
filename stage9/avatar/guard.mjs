import {validatePacket,sha256} from './speech-core.mjs';
export class Guard{
 constructor(){this.bind('', '');}
 bind(sessionId,nonce){this.sessionId=sessionId;this.nonce=nonce;this.generation=0;this.ref=null;this.serial=0;}
 stop(){this.serial++;this.ref=null;}
 expect(r){if(r.sessionId!==this.sessionId||r.generation<=this.generation)throw Error('Stale turn');this.serial++;this.generation=r.generation;this.ref=r;}
 async check(p,bytes){const serial=this.serial,r=this.ref;if(!r||p.sessionId!==this.sessionId||p.responseId!==r.responseId||p.generation!==r.generation||p.segmentId!==0||p.transcript!==r.transcript||p.transcriptSha256!==r.transcriptSha256||p.audioSha256!==r.audioSha256)throw Error('Speech identity rejected');validatePacket(p);if(await sha256(bytes)!==p.audioSha256||await sha256(new TextEncoder().encode(p.transcript))!==p.transcriptSha256)throw Error('Hash rejected');return serial===this.serial&&this.ref===r;}
}
export function messageAllowed(e,parent,origin,nonce){return e.source===parent&&e.origin===origin&&e.data?.version===1&&e.data?.nonce===nonce;}
