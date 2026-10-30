/** Nominal observation at the actual Actor constructor, with exact synchronous
 * nested frames. This does not confer physical admission or combat authority. */
import type {Actor} from './actor';
interface Frame {readonly parent:Frame|null;readonly bodies:Set<Actor>;active:boolean}
let top:Frame|null=null;
export function nativeActorConstructed(actor:Actor):void{if(top?.active)top.bodies.add(actor);}
export function captureNativeActorConstruction<T>(construct:()=>T):{value:T;created:ReadonlySet<Actor>}{
 const frame:Frame={parent:top,bodies:new Set(),active:true};top=frame;
 try{return {value:construct(),created:frame.bodies};}finally{frame.active=false;top=frame.parent;}
}
