/** Exact native kill pickup rolls and deferred death-burst construction.
 * Attribution, death execution, pickup/burst ticking and retirement remain separate. */
import type {World} from "./world";
import {chance,rand,vec,type Vec2} from '../core/math';
import {type DamageType} from './stats';
import {Actor} from './actor';
import {grantedTags,hostSockets,instanceMods,skillContextTags,type SkillInstance} from './skills';
import {type DeathBurstDef} from '../data/monsters';
import {STAT_DEFS,DAMAGE_COLOR} from './stats';
import {REMNANT_KINDS,remnantDropStat} from '../data/remnants';
import {ORB_DEFS,ORB_CAP,orbOnKillStat} from '../data/orbs';
export interface NativeSceneKillAftermathApi {
rollKillOrbs(caster: Actor, inst: SkillInstance, victim: Actor): void;
rollKillRemnants(caster: Actor, inst: SkillInstance, at: Vec2): void;
spawnDeathBurst(a: Actor, cfg: DeathBurstDef): void;
}
export interface NativeSceneKillAftermathHost {readonly orbs:World["orbs"];readonly remnants:World["remnants"];readonly deathBursts:World["deathBursts"];readonly shedOrb:World["shedOrb"];readonly clampPos:World["clampPos"]}
export function sceneRollKillOrbs(host:NativeSceneKillAftermathHost,caster: Actor, inst: SkillInstance, victim: Actor): void {
    if (caster.construct || victim.noBounty || host.orbs.length >= ORB_CAP) return;
    const tags = skillContextTags(inst, grantedTags(inst));
    const extra = instanceMods(inst);
    const rate = caster.sheet.get('orbShedRate', tags, extra);
    // THE GRANTED SHED (orbShedGraft — Abundant Harvest's mechanism
    // unlock): where an orb kind has NO base at all, the graft's low
    // floor stands the lane up — multiplied by GLOBAL orbShedRate
    // sources only (the gem's own skill-local rate bonus deliberately
    // never compounds its own floor). Kinds WITH a base keep the innate
    // lane: floor added flat, every rate source multiplying as ever.
    const graft = hostSockets(inst).map(s => s.def.orbShedGraft).find(g => g);
    // No tags/extra on the floor's rate read: skill-local mods (the
    // granting gem's own +rate) live in `extra`, so omitting it IS the
    // no-self-compounding law — global passives/gear still multiply.
    const globalRate = graft ? caster.sheet.get('orbShedRate') : 0;
    for (const id of Object.keys(ORB_DEFS)) {
      const base = caster.sheet.get(orbOnKillStat(id), tags, extra);
      const grafted = graft?.orbs.includes(id) ? graft.chance : 0;
      const c = base > 0
        ? (base + grafted) * rate
        : grafted * globalRate;
      if (c > 0 && chance(Math.min(0.75, c))) {
        host.shedOrb(id, victim.pos, { scatter: 26, tier: victim.tier });
      }
    }
  }

export function sceneRollKillRemnants(host:NativeSceneKillAftermathHost,caster: Actor, inst: SkillInstance, at: Vec2): void {
    if (caster.construct || host.remnants.length >= 14) return;
    const tags = skillContextTags(inst, grantedTags(inst));
    const extra = instanceMods(inst);
    for (const kind of Object.values(REMNANT_KINDS)) {
      const c = caster.sheet.get(remnantDropStat(kind.id), tags, extra);
      if (c <= 0 || !chance(Math.min(0.75, c))) continue;
      const ang = rand(0, Math.PI * 2);
      const r = rand(10, 40);
      host.remnants.push({
        pos: host.clampPos(vec(at.x + Math.cos(ang) * r, at.y + Math.sin(ang) * r), 8),
        kind: kind.id, bob: rand(0, Math.PI * 2), life: 12,
      });
      if (host.remnants.length >= 14) break;
    }
  }

export function sceneSpawnDeathBurst(host:NativeSceneKillAftermathHost,a: Actor, cfg: DeathBurstDef): void {
    const type: DamageType = cfg.damageType ?? 'fire';
    // The increased-DURATION stat rides BOTH timers: a longer coalesce (bigger escape
    // window) and a longer-hounding orb. So `enduring` etc. lengthen every burst phase.
    const dur = a.sheet.get('effectDuration');
    const life = (cfg.orbDuration ?? 2.6) * dur;
    // Outrun cap derived from the player's BASE move speed (not a literal) so it tracks
    // any retune; at base speed the orb is always escapable, and its sloppy turn keeps
    // it dodgeable even under slows.
    const escapeCap = STAT_DEFS.moveSpeed.base * 0.75;
    host.deathBursts.push({
      phase: 'gather', mode: cfg.mode,
      pos: vec(a.pos.x, a.pos.y), team: a.team, tier: a.tier,
      dmg: a.maxLife() * cfg.damageFrac,
      radius: cfg.radius ?? (45 + a.radius * 2),
      type, color: cfg.color ?? DAMAGE_COLOR[type],
      t: 0, coalesce: (cfg.coalesce ?? 0.8) * dur,
      life, armAt: life * 0.25,
      speed: Math.min(cfg.orbSpeed ?? 110, escapeCap),
      turn: cfg.orbTurn ?? 2.0,
      dir: 0, trail: [], arming: false,
      contact: cfg.detonateOnContact ?? false, stuck: false,
      contactFuse: cfg.contactFuse ?? 0.3, contactRadius: cfg.contactRadius ?? 12,
    });
  }
