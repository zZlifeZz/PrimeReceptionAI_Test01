// One priority welcome per visit. Normal interaction cannot interrupt it.
export class WelcomeFlow {
 constructor(){this.state='waiting';this.pending=null;}
 queue(text,kind){if(this.state==='complete')return false;if(kind==='turn'||!this.pending||this.pending.kind!=='turn')this.pending={text,kind};return true;}
 start(){if(this.state!=='waiting')return false;this.state='preparing';return true;}
 speaking(){if(this.state==='preparing')this.state='playing';}
 finish(){this.state='complete';const next=this.pending;this.pending=null;return next;}
 stop(){this.pending=null;return this.finish();}
}
