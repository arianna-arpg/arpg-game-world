/** Exact native resource consumption, combo/meta preparation and relocation lookup.
 * Full casting, aura activation, spawning and ticking remain separate. */
import type {World} from './world';
import type {NativeSceneRestorationApi} from './nativeSceneRestoration';
import {PERCEPTION_CFG} from './perception';
import {instanceTreeMods} from './skills';
import {costWard} from './costward';
import {dist} from '../core/math';
import {Actor} from './actor';
import {effectiveSkillLevel,instanceChargeCost,instanceDelivery,instanceMetas,makeSkillInstance,type BuffEffect,type SkillDef,type SkillInstance} from './skills';
import {SKILLS} from '../data/skills';
import {ELEMENTAL_TYPES} from './stats';
import {sameStory} from './tiers';
import {noteProcCue} from './procCues';
export const STEALTH_CHARGE = 'stealth';
export type ComboCursor = { comboIdx?: number; comboAt?: number; comboSelf?: number };
export interface NativeSceneCastingPreparationApi {
paySkillCost(caster: Actor, inst: SkillInstance, cost: { mana: number; life: number }): void;
consumeChargeCost(caster: Actor, inst: SkillInstance): { mult: number; consumed: number };
refundCooldown(caster: Actor, skillId: string): void;
consumeAmmunition(caster: Actor, def: SkillDef): void;
consumeRemnants(caster: Actor, def: SkillDef): void;
consumeStealth(caster: Actor, def: SkillDef): void;
comboCursorOf(caster: Actor, inst: SkillInstance): ComboCursor;
comboStepOf(caster: Actor, inst: SkillInstance, idx: number): SkillInstance | null;
heldSkillInst(actor: Actor, skillId: string): SkillInstance | null;
relocationTarget(caster: Actor, inst: SkillInstance, radius: number): Actor | undefined;
mintMetaInstance(caster: Actor, host: SkillInstance, skillId: string): SkillInstance;
}
export interface NativeSceneCastingPreparationHost {readonly frameArts?:Pick<World['frameArts'],'bindCommand'>;readonly actors:World['actors'];readonly time:World['time'];readonly comboCursors:WeakMap<Actor,Map<string,ComboCursor>>;readonly relocationHosts:WeakMap<SkillInstance,SkillInstance>;grantAbsorb:NativeSceneRestorationApi['grantAbsorb'];seatOf:World['seatOf'];}
export function scenePaySkillCost(scene:NativeSceneCastingPreparationHost,caster: Actor, inst: SkillInstance, cost: { mana: number; life: number }): void {
    const paid = {
      mana: Math.max(0, Math.min(caster.mana, cost.mana)),
      life: caster.overdrive.life && caster.life <= cost.life ? 0 : Math.max(0, cost.life),
    };
    caster.payCost(cost);
    if (caster.construct) return; // synthetic casting pools are not resources
    const ward = costWard(caster, inst, paid);
    if (ward.amount > 0 && ward.duration > 0) scene.grantAbsorb(caster, ward.amount, ward.duration);
  }

export function sceneConsumeChargeCost(scene:NativeSceneCastingPreparationHost,caster: Actor, inst: SkillInstance): { mult: number; consumed: number } {
    const cc = instanceChargeCost(inst);
    if (!cc) return { mult: 1, consumed: 0 };
    const have = caster.charges.get(cc.charge) ?? 0;
    const consumed = cc.amount === 'all' ? have : Math.min(have, cc.amount);
    caster.spendCharge(cc.charge, consumed);
    return {
      mult: cc.damagePerCharge && consumed > 0 ? 1 + cc.damagePerCharge * consumed : 1,
      consumed,
    };
  }

export function sceneRefundCooldown(scene:NativeSceneCastingPreparationHost,caster: Actor, skillId: string): void {
    caster.cooldowns.delete(skillId);
    caster.cooldownTotals.delete(skillId);
  }

export function sceneConsumeAmmunition(scene:NativeSceneCastingPreparationHost,caster: Actor, def: SkillDef): void {
    for (const [id, buff] of [...caster.buffs]) {
      const c = (buff.def as BuffEffect).consumeOnUse;
      if (!c) continue;
      if (c.tags && !c.tags.some(t => def.tags.includes(t))) continue;
      caster.consumeBuffStacks(id, 1);
    }
  }

export function sceneConsumeRemnants(scene:NativeSceneCastingPreparationHost,caster: Actor, def: SkillDef): void {
    for (const el of ELEMENTAL_TYPES) {
      if (def.tags.includes(el) && caster.buffs.has('remnant_' + el)) {
        noteProcCue(caster, caster.buffs.get('remnant_' + el)!.def.storedCue, 'release', 'remnant:' + el);
        caster.removeBuff('remnant_' + el);
      }
    }
  }

export function sceneConsumeStealth(scene:NativeSceneCastingPreparationHost,caster: Actor, def: SkillDef): void {
    if (def.effects.some(fx => fx.type === 'gainCharge' && fx.charge === STEALTH_CHARGE)) return;
    const offensive = def.breaksStealth
      ?? (!!def.baseDamage || def.effects.some(fx =>
        fx.type === 'damage' || fx.type === 'knockback' || fx.type === 'pull'));
    if (!offensive) return;
    caster.concealmentExposedUntil = scene.time + PERCEPTION_CFG.exposureSec;
    const have = caster.charges.get(STEALTH_CHARGE) ?? 0;
    if (have > 0) caster.spendCharge(STEALTH_CHARGE, 1);
    for (const [id, b] of [...caster.buffs]) {
      if (b.def.mods.some(m => m.stat === 'invisible')) caster.removeBuff(id);
    }
  }

export function sceneComboCursorOf(scene:NativeSceneCastingPreparationHost,caster: Actor, inst: SkillInstance): ComboCursor {
    if (!caster.construct || caster.skills.includes(inst)) return (inst.state ??= {});
    let m = scene.comboCursors.get(caster);
    if (!m) { m = new Map(); scene.comboCursors.set(caster, m); }
    let c = m.get(inst.def.id);
    if (!c) { c = {}; m.set(inst.def.id, c); }
    return c;
  }

export function sceneComboStepOf(scene:NativeSceneCastingPreparationHost,caster: Actor, inst: SkillInstance, idx: number): SkillInstance | null {
    const chain = inst.def.comboChain;
    if (!chain || idx <= 0 || idx > chain.skills.length) return null;
    const sid = chain.skills[idx - 1];
    if (sid === inst.def.id || !SKILLS[sid]) return null;
    const key = inst.def.id + ':combo' + idx;
    const level = inst.level + Math.floor(inst.bonusLevels ?? 0);
    let step = caster.metaInsts.get(key);
    if (!step || step.def.id !== sid || step.level !== level) {
      step = makeSkillInstance(SKILLS[sid], level);
      step.hostSkillId = inst.def.id;
      step.chainOf = inst.def.id; // THE BEAT MARK — the ring records the host's beat
      caster.metaInsts.set(key, step);
    }
    step.sockets = inst.sockets; // live references — re-socketing propagates
    step.grafts = inst.grafts;
    step.comboTreeMods = instanceTreeMods(inst);
    return step;
  }

export function sceneHeldSkillInst(scene:NativeSceneCastingPreparationHost,actor: Actor, skillId: string): SkillInstance | null {
    for (const s of actor.skills) if (s?.def.id === skillId) return s;
    const seat = scene.seatOf(actor);
    if (!seat) return null;
    return seat.grantedInsts?.get(skillId) ?? seat.meta.knownSkills.get(skillId) ?? null;
  }

export function sceneRelocationTarget(scene:NativeSceneCastingPreparationHost,caster: Actor, inst: SkillInstance, radius: number): Actor | undefined {
    const host = scene.relocationHosts.get(inst);
    if (!host || !caster.skills.includes(host) || caster.dead || caster.downed
      || !instanceMetas(host).some(m => m.skillId === inst.def.id)) return;
    const d = instanceDelivery(host);
    if (d.type !== 'construct' || !['totem', 'sentry'].includes(d.kind) || !d.castSkillId) return;
    let best: Actor | undefined, bestD = radius;
    for (const c of scene.actors) {
      if (c.dead || c.downed || c.owner !== caster || c.summonInst !== host
        || !c.construct || !['totem', 'sentry'].includes(c.construct.kind)
        || !sameStory(c, caster) || c.team !== caster.team || !(c.lifespan! > 0)) continue;
      const dd = dist(caster.pos, c.pos);
      if (dd <= bestD && (!best || dd < bestD)) { best = c; bestD = dd; }
    }
    return best;
  }

export function sceneMintMetaInstance(scene:NativeSceneCastingPreparationHost,caster: Actor, host: SkillInstance, skillId: string): SkillInstance {
    const key = host.def.id + ':' + skillId;
    let inst = caster.metaInsts.get(key);
    const relocateConstruct = SKILLS[skillId].effects.some(fx => fx.type === 'relocateConstruct');
    if (!inst || inst.level !== effectiveSkillLevel(host)
      || (relocateConstruct && scene.relocationHosts.get(inst) !== host)) {
      inst = makeSkillInstance(SKILLS[skillId], effectiveSkillLevel(host));
      // minionCombat: a command's meta inherits its whole-court scope.
      // Summon-hosted meta payloads still name their own roster anchor.
      inst.hostSkillId = host.def.effects.some(e => e.type === 'commandMinions')
        ? undefined : host.def.id;
      caster.metaInsts.set(key, inst);
      if (relocateConstruct) scene.relocationHosts.set(inst, host);
    }
    scene.frameArts?.bindCommand(host,inst);
    return inst;
  }
