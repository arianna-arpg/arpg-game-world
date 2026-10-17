/** Native skill arrival paint over actual local flashes and campaign cosmetics. */
import type {Actor} from './actor';
import type {SkillInstance} from './skills';
import type {Vec2} from '../core/math';
import type {World} from './world';
import {cosmeticSkillPaint,type NativeCosmeticHost} from '../meta/cosmetics';
import {skillRiteVoice,skillTargetVoice,TARGET_VISUAL_STYLE} from '../data/skillTargetVisuals';
export interface NativeSceneSkillArrivalHost extends NativeCosmeticHost {readonly flashes:World['flashes']}
export function sceneShowSkillArrival(host:NativeSceneSkillArrivalHost,caster: Actor, inst: SkillInstance, at: Vec2, radius: number, tier: number,
    rite: boolean | string = false, splash = false): void {
    const id = typeof rite === 'string' ? rite : inst.def.id;
    let fx = rite ? skillRiteVoice(id) : skillTargetVoice(id);
    if (rite && (!fx || inst.def.feedingCue === false)) return;
    if (splash && fx) fx = fx.replace('skillTarget:', 'skillTargetSplash:');
    // A multi-effect offering grants several buffs at the same instant.
    if (fx && host.flashes.some(f => f.fx === fx && f.life === f.maxLife && f.pos.x === at.x && f.pos.y === at.y)) return;
    const life = fx ? TARGET_VISUAL_STYLE.life : .25;
    host.flashes.push({ pos: { ...at }, radius, color: cosmeticSkillPaint(host, caster, inst.def.id).color ?? inst.def.color,
      life, maxLife: life, fx, recoveryCueTier: tier });
  }
