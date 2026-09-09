export const VISEMES={
 sil:{},PP:{jawOpen:.02,mouthClose:.95,mouthPressLeft:.40,mouthPressRight:.40},
 FF:{jawOpen:.10,mouthRollLower:.45,mouthUpperUpLeft:.12,mouthUpperUpRight:.12},
 TH:{jawOpen:.18,mouthLowerDownLeft:.12,mouthLowerDownRight:.12},
 DD:{jawOpen:.12,mouthStretchLeft:.14,mouthStretchRight:.14},
 kk:{jawOpen:.22},CH:{jawOpen:.17,mouthFunnel:.25,mouthPucker:.12},
 SS:{jawOpen:.06,mouthStretchLeft:.32,mouthStretchRight:.32},
 nn:{jawOpen:.14},RR:{jawOpen:.18,mouthFunnel:.3,mouthPucker:.12},
 aa:{jawOpen:.38,mouthLowerDownLeft:.12,mouthLowerDownRight:.12},
 E:{jawOpen:.27,mouthStretchLeft:.24,mouthStretchRight:.24},
 I:{jawOpen:.13,mouthStretchLeft:.38,mouthStretchRight:.38},
 O:{jawOpen:.24,mouthFunnel:.74,mouthPucker:.28},U:{jawOpen:.14,mouthPucker:.68,mouthFunnel:.20}
};

export class CurrentModelAdapter {
 role(mesh){return /SK_FemBase2_Head_52ArKit/i.test(mesh.name)?'head':mesh.name==='SK_FemBase2_Teeth'?'teeth':'other';}
 shapes(weights){const out={};for(const [viseme,w]of Object.entries(weights))for(const [name,v]of Object.entries(VISEMES[viseme]||{}))out[name]=(out[name]||0)+w*v;for(const name in out)out[name]=Math.max(0,Math.min(1,out[name]));return out;}
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
