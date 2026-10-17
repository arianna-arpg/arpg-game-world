import type {Actor} from '../engine/actor';
import {MONSTERS} from '../data/monsters';
import {MOVEMENT_TETHER_CFG} from '../engine/movementTether';
import {canonical} from './random';

const equal=(a:unknown,b:unknown)=>a===undefined||b===undefined?a===b:canonical(JSON.parse(JSON.stringify(a)))===canonical(JSON.parse(JSON.stringify(b)));
const only=(value:object,keys:string[])=>Object.keys(value).every(key=>keys.includes(key));
const point=(p:{x:number;y:number})=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
/** Certificates for factory-owned, self-contained, settled anatomy. Call only
 * after exact capture and every ordinary action/resource/dependency veto. These
 * components update solely through their actor; external bindings and native
 * pending work remain live. No state is cleared, normalized or reconstructed. */
export function nativeQuietAnatomy(a:Actor,key:string,time:number,quiet:number):boolean {
 const def=a.defId&&MONSTERS[a.defId];if(!def)return false;
 try{
  if(key==='volatile')return !!def.volatile&&equal(a.volatile,def.volatile)&&!a.volatileInst&&a.volatileReadyAt<=time;
  if(key==='movementTether'){
   const t=a.movementTether,s=def.movementTether;
   return !!t&&!!s&&equal(t.spec,s)&&equal(a.movementTetherSpec,s)
    &&only(t,['spec','point','tier','anchorId','returning','released','safe'])
    &&t.anchorId===undefined&&!t.returning&&!t.released&&point(t.point)&&point(t.safe)&&t.tier===a.tier
    &&Math.hypot(a.pos.x-t.point.x,a.pos.y-t.point.y)<s.length*(s.taut??MOVEMENT_TETHER_CFG.taut);
  }
  if(key==='shellGuard'){
   const g=a.shellGuard,s=def.shellGuard;if(!g||!s||g.fromAura!==undefined||g.reformFraction!==undefined)return false;
   return only(g,['side','arcDeg','max','pool','regenDelay','regenRate','lastHitAt','broken','color','shellVisual','breathe'])
    &&g.pool===g.max&&!g.broken&&g.lastHitAt<=time-quiet
    &&equal({side:g.side,arcDeg:g.arcDeg,max:g.max,regenDelay:g.regenDelay,regenRate:g.regenRate,color:g.color,shellVisual:g.shellVisual,breathe:g.breathe},
      {side:s.side,arcDeg:s.arcDeg??180,max:s.max,regenDelay:s.regenDelay??4,regenRate:s.regenRate??s.max/6,color:s.color??'#c8b87a',shellVisual:s.shellVisual,breathe:s.breathe});
  }
  if(key==='worm'){
   const w=a.worm,s=def.worm;if(!w||!s||s.drive!==undefined&&s.drive!=='trail'||a.segTears?.length)return false;
   return only(w,['length','spacing','taper','segments','hittable','looks','wounds','flash','woundHp','wounded'])
    &&w.length===s.length&&w.spacing===(s.spacing??def.radius*1.1)&&w.taper===(s.taper??.88)
    &&!!w.hittable===!!s.hittable&&equal(w.looks,s.looks)&&equal(w.wounds,s.wounds)
    &&w.segments.length<=w.length&&w.segments.every(point)
    &&!(w.flash?.some(t=>t>0))&&!(w.woundHp?.some(h=>!Number.isFinite(h)||h<0));
  }
 }catch{return false;}
 return false;
}
/** Include the entire retained anatomy, never merely the head, in wake/sleep
 * proximity. A point tether remains visible/physical at its original root. */
export function nativeQuietAnatomyNear(a:Actor,p:{x:number;y:number},radius:number):boolean {
 return !!a.worm?.segments.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<=radius+a.radius)
  ||!!(a.movementTether&&!a.movementTether.released&&Math.hypot(a.movementTether.point.x-p.x,a.movementTether.point.y-p.y)<=radius);
}

/** Conservative header bound for page readiness, covering every retained tail
 * segment and fixed root. It is captured beside the exact native actor codec. */
export function nativeQuietAnatomyRadius(a:Actor):number {
 let radius=0;
 for(const p of a.worm?.segments??[])radius=Math.max(radius,Math.hypot(p.x-a.pos.x,p.y-a.pos.y)+a.radius);
 if(a.movementTether&&!a.movementTether.released){const p=a.movementTether.point;radius=Math.max(radius,Math.hypot(p.x-a.pos.x,p.y-a.pos.y));}
 return radius;
}
export const validNativeQuietRadius=(r:unknown):boolean=>r===undefined||typeof r==='number'&&Number.isFinite(r)&&r>=0;
