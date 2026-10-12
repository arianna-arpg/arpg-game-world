/** Exact native tether construction. Damage, healing, ticking and crossing retain their own runtime boundary. */
import type {World} from './world';
import {dist} from '../core/math';
import {type DamageType} from './stats';
import {Actor} from './actor';
import {applyConversion} from './damage';
import {instanceMods,instanceTethers,skillContextTags,type SkillInstance,type TetherSpec} from './skills';
import {DAMAGE_COLOR} from './stats';
export const TETHER_TICK = 0.4;
export interface NativeSceneTetherHost {
 tethers:World['tethers'];
 readonly actors:World['actors'];
 addTether:World['addTether'];
}
export function sceneAddTether(host:NativeSceneTetherHost,a: Actor, b: Actor, spec: TetherSpec, inst: SkillInstance, owner: Actor): void {
    if (a === b || a.dead || b.dead) return;
    host.tethers = host.tethers.filter(t => !(t.skillId === inst.def.id
      && ((t.a === a && t.b === b) || (t.a === b && t.b === a))));
    const extra = instanceMods(inst);
    const type: DamageType = spec.damageType ?? 'physical';
    const tags = skillContextTags(inst, [type]);
    const amounts: Partial<Record<DamageType, number>> = {};
    // Beam damage and width are INVESTABLE: damage × tetherDamage for the
    // dps, aoeRadius × tetherWidth for the band (yes, Widening fits a wire).
    if (spec.dps) {
      amounts[type] = spec.dps
        * owner.sheet.get('damage', tags, extra)
        * owner.sheet.get('tetherDamage', tags, extra);
    }
    applyConversion(owner, amounts, tags, extra);
    const width = (spec.width ?? 10)
      * owner.sheet.get('aoeRadius', tags, extra)
      * owner.sheet.get('tetherWidth', tags, extra);
    // The band's colour follows its dominant POST-conversion type — the
    // damage-type tell stays honest through any conversion chain.
    let domType: DamageType | null = null, domAmt = 0;
    for (const [k, v] of Object.entries(amounts)) {
      if ((v ?? 0) > domAmt) { domAmt = v ?? 0; domType = k as DamageType; }
    }
    host.tethers.push({
      a, b, owner, skillId: inst.def.id, link: spec.link, inst,
      visual: spec.visual, visualAge: 0,
      amounts, heal: spec.healPerSec ?? 0,
      affects: spec.affects ?? 'enemies',
      width,
      remaining: spec.link === 'target'
        ? (spec.duration ?? 8) * owner.sheet.get('effectDuration', tags, extra)
        : Infinity,
      tickTimer: TETHER_TICK,
      color: spec.color ?? (domType ? DAMAGE_COLOR[domType] : '#7ec88a'),
      ax: a.pos.x, ay: a.pos.y, bx: b.pos.x, by: b.pos.y,
    });
  }

export function sceneAttachObjectTethers(host:NativeSceneTetherHost,spawned: Actor, inst: SkillInstance, caster: Actor): void {
    // SOVEREIGNTY: self — a caster's own constructs (the derived census, probe_tiers RIG T).
    for (const spec of instanceTethers(inst)) {
      if (spec.link === 'caster') {
        host.addTether(spawned, caster, spec, inst, caster);
      } else if (spec.link === 'network') {
        const reach = spec.radius ?? 360;
        for (const other of host.actors) {
          if (other === spawned || other.dead || other.owner !== caster) continue;
          if (other.sourceSkillId !== inst.def.id) continue;
          if (dist(spawned.pos, other.pos) > reach) continue;
          host.addTether(spawned, other, spec, inst, caster);
        }
      }
    }
  }
