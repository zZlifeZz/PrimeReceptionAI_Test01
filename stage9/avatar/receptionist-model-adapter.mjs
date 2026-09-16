// Calibrated against rendered poses. mouthClose is a jaw corrective here; do not drive it near 1 on a neutral closed jaw.
export const VISEMES={
 sil:{},PP:{jawOpen:0,mouthPressLeft:.25,mouthPressRight:.25,mouthRollLower:.06,mouthRollUpper:.04},
 FF:{jawOpen:.07,mouthRollLower:.22,mouthUpperUpLeft:.08,mouthUpperUpRight:.08},
 TH:{jawOpen:.18,mouthLowerDownLeft:.12,mouthLowerDownRight:.12},
 DD:{jawOpen:.12,mouthStretchLeft:.14,mouthStretchRight:.14},
 kk:{jawOpen:.22},CH:{jawOpen:.17,mouthFunnel:.25,mouthPucker:.12},
 SS:{jawOpen:.06,mouthStretchLeft:.32,mouthStretchRight:.32},
 nn:{jawOpen:.14},RR:{jawOpen:.18,mouthFunnel:.3,mouthPucker:.12},
 aa:{jawOpen:.38,mouthLowerDownLeft:.12,mouthLowerDownRight:.12},
 E:{jawOpen:.27,mouthStretchLeft:.24,mouthStretchRight:.24},
 I:{jawOpen:.13,mouthStretchLeft:.38,mouthStretchRight:.38},
 O:{jawOpen:.18,mouthFunnel:.20,mouthPucker:.48},U:{jawOpen:.10,mouthPucker:.56,mouthFunnel:.10}
};

// The native HG face needs stronger lip rounding than the previous transferred face.
export const NATIVE_VISEMES={...VISEMES,
 O:{jawOpen:.16,mouthFunnel:.65,mouthPucker:.60},
 U:{jawOpen:.10,mouthPucker:.72,mouthFunnel:.40}
};

export class ReceptionistModelAdapter {
 constructor({profile='legacy'}={}){this.profile=profile;}
 role(mesh){for(let node=mesh;node;node=node.parent){if(['PrimeReception_Face','Prime_eyebrows','Prime_eyelashes'].includes(node.name))return 'head';if(node.name==='HG_TeethLower')return 'teeth';}return 'other';}
 shapes(weights){const poses=this.profile==='native'?NATIVE_VISEMES:VISEMES,out={};for(const [viseme,w]of Object.entries(weights))for(const [name,v]of Object.entries(poses[viseme]||{}))out[name]=(out[name]||0)+w*v;for(const name in out)out[name]=Math.max(0,Math.min(1,out[name]));return out;}
 target(role,name,base,amount,shapes,time){let value=base;const expression=this.expression||{emphasis:0,warmth:0};
 if(role==='head'&&(name.startsWith('mouth')||name.startsWith('jaw')))value=base*(1-amount)+(shapes[name]||0)*amount;
 if(role==='head'&&(name==='mouthSmileLeft'||name==='mouthSmileRight')){
 // Retain warmth continuously, relaxing corners only where rounding/closure needs it.
 const conflict=Math.min(1,Math.max(shapes.mouthPucker||0,shapes.mouthFunnel||0,(shapes.mouthClose||0)*.7));
 const warm=base*(.28+.18*(1-conflict))+expression.warmth*.035*(1-conflict);
 value=base*(1-amount)+warm*amount;
 }
 if(role==='teeth'&&name.startsWith('jaw'))value=base*(1-amount)+(shapes[name]||0)*amount;
 if(role==='head'&&name==='browInnerUp')value+=expression.emphasis*.055;
 if(role==='head'&&(name==='browOuterUpLeft'||name==='browOuterUpRight'))value+=expression.emphasis*.025;
 return Math.max(0,Math.min(1,value));}
}
