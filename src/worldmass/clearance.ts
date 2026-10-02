import type { World } from '../engine/world';
import type { Actor } from '../engine/actor';
import type { MassState } from './state';
import type { MassContent } from './preset';
import type { MassSiteDiscovery } from './sites';
import { objectiveRewardXp, type ObjectiveRewardCurve } from '../data/objectiveRewards';
import { canonical } from './random';

/** A completed garrison is a durable achievement, not a promise of safe ground. */
export const MASS_CLEARANCE_VIEW = { complete: 'Garrison defeated' };
export interface MassClearanceSpec extends ObjectiveRewardCurve { source: string }
export function validateMassClearance(spec: MassClearanceSpec): void {
  if(!spec || typeof spec!=='object' || !spec.source || ![spec.xpBase,spec.xpPerLevel].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=10000))
    throw new Error('Invalid worldmass completion reward');
}
/** Capture the native eligibility decision at admission. Barrels, ambient
 * fauna and no-objective bodies never become mandatory clearance targets. */
export function recordMassGuardian(world: World, state: MassState, id: string, a: Actor): void {
  if(world.objectiveCountable(a))state.claim('site-guardian',id);
}
/** All authored garrison slots share their durable native identity. Fixture
 * roles opt in so an older descriptor does not silently gain new obligations. */
export function massGarrisonSlots(content: MassContent, place: string, count=content.count): string[] {
  return [...Array.from({length:count},(_,i)=>canonical([place,i])),
    ...(content.site?.fixtures??[]).flatMap((f,i)=>f.garrison?[canonical([place,'fixture',i])]:[])];
}
/** A discovered place resolves its original garrison, independently of its
 * chest. Missing population slots cannot count as kills. Roaming neighbours
 * do not become an unbounded mandatory extermination objective. */
export function settleMassClearance(world: World, state: MassState, found: MassSiteDiscovery,
  content: MassContent, present: (id:string)=>boolean, level: number, count=content.count): boolean {
  const spec=content.site?.completion;
  if(!spec || world.player.dead || state.claimed('site-cleared',found.id))return false;
  const ids=massGarrisonSlots(content,found.id,count);
  if(ids.some(id=>!present(id)&&!state.claimed('fallen',id)))return false;
  const guards=ids.filter(id=>state.claimed('site-guardian',id));
  if(!guards.length||guards.some(id=>!state.claimed('fallen',id)))return false;
  if(!state.claim('site-cleared',found.id))return false;
  const xp=objectiveRewardXp(level,spec);
  world.grantXp(xp);
  world.notice(content.site!.name+' · '+MASS_CLEARANCE_VIEW.complete+' · +'+xp+' experience','#d8c08a',15,'civic');
  return true;
}
