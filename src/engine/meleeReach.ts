import type { Actor } from './actor';
import { AOE_SHAPE, instanceDelivery, instanceMods, instanceVariance, skillContextTags, grantedTags } from './skills';

export interface MeleeReachCue { reach:number; arc:number; shape:number; facing:number; }
/** The direct, fixed melee footprint during an ordinary committed cast.
 * Traveling/variable/target-derived and held-mode attacks keep their own reads. */
export function meleeReachCueOf(a:Actor):MeleeReachCue|undefined {
  const cs=a.casting;
  if(!cs||a.dead||a.downed)return;
  if(cs.resolvedMeleeReach!==undefined)return cs.resolvedMeleeReach??undefined;
  if(cs.mode!=='cast'||cs.plantTotem||cs.targetInfo||!cs.inst.def.delivery||cs.inst.def.reachCue===false)return;
  const d=instanceDelivery(cs.inst);if(d.type!=='melee'||instanceVariance(cs.inst)?.aoe)return;
  const tags=skillContextTags(cs.inst,grantedTags(cs.inst)),extra=instanceMods(cs.inst);
  if(a.sheet.get('meleeSweep',tags,extra)>0)return;
  const aim=cs.lockedAim??cs.aim;
  return {
    reach:(a.radius+d.range)*a.sheet.get('meleeReach',tags,extra),
    arc:Math.min(Math.PI*2,d.arcDeg*Math.PI/180*Math.sqrt(a.sheet.get('aoeRadius',tags,extra))*a.sheet.get('swingArc',tags,extra)),
    shape:a.sheet.get('aoeShape',tags,extra,AOE_SHAPE[d.shape??'circle']),
    facing:Math.hypot(aim.x-a.pos.x,aim.y-a.pos.y)<2?a.facing:Math.atan2(aim.y-a.pos.y,aim.x-a.pos.x),
  };
}
