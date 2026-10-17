import {observeNativeCombatStorage,observeNativeCombatRecord} from './nativeCombatRecordObservation';
import {noteRestoreGain} from './feedingCues';
import {skillTargetVoice} from '../data/skillTargetVisuals';
/** Exact native healing, resource gain, stream construction and float attribution.
 * Ticking, aura/buff application, damage and complete combat remain separate. */
import type {World} from './world';
import {chance,dist,vec,type Vec2} from '../core/math';
import {type SkillTag} from './stats';
import {STATUS_DEFS} from './status';
import {Actor} from './actor';
import {normalizeBrain} from './brain';
import {effectiveSkillLevel,grantedTags,instanceMods,socketSpec,skillContextTags,type SkillInstance} from './skills';
import {sameStory} from './tiers';
import {combatCueFlash} from './combatCues';
export interface NativeSceneRestorationApi {
grantAbsorb(target: Actor, amount: number, duration: number): void;
applyRestore(
    target: Actor,
    fx: { resource: 'life' | 'mana' | 'es' | 'poise'; amount: number; resetEsDelay?: boolean },
    opts?: { noEvent?: boolean; tags?: SkillTag[]; feedingCue?: import('../data/feedingCues').FeedingCueSpec | false },
  ): number;
startRestoreStream(
    target: Actor, caster: Actor, inst: SkillInstance,
    fx: {
      resource: 'life' | 'mana' | 'es'; amount: number; duration: number;
      amountPerLevel?: number; amountPctMax?: number; perCharge?: boolean;
      lane?: 'surge' | 'settle';
      feedingCue?: import('../data/feedingCues').FeedingCueSpec | false;
    },
    chargesSpent: number,
    critMult?: number,
  ): void;
critMendMult(caster: Actor, inst: SkillInstance, at?: Vec2): number;
applyHeal(
    caster: Actor, inst: SkillInstance, target: Actor,
    fx: { amount?: number; pctMax?: number; excludeCaster?: boolean }, mult?: number, quiet?: boolean,
  ): number;
applyHealChained(
    caster: Actor, inst: SkillInstance, target: Actor,
    fx: { amount?: number; pctMax?: number; chain?: number; excludeCaster?: boolean }, mult?: number, quiet?: boolean,
  ): void;
cleanseActor(target: Actor, count?: number): number;
ringAfflictions(target: Actor, portion: number): number;
healAlliesInArea(
    caster: Actor, inst: SkillInstance, accepts: (a: Actor) => boolean,
    mult?: number, quiet?: boolean, once?: Set<number>,
  ): void;
seatText(by: Actor | null | undefined, at: Vec2, text: string, color: string, size?: number, kind?: string): void;
creditFloat(by: Actor | null | undefined, seatId?: string | null): void;
}
export interface NativeSceneRestorationHost extends NativeSceneRestorationApi {
 showSkillArrival:World['showSkillArrival'];
 readonly actors:World['actors'];readonly flashes:World['flashes'];readonly texts:World['texts'];readonly tethers:World['tethers'];
 readonly partyRows:World['partyRows'];readonly seats:World['seats'];text:World['text'];seatOfRoot:World['seatOfRoot'];
}
export function sceneGrantAbsorb(host:NativeSceneRestorationHost,target: Actor, amount: number, duration: number): void {
    target.absorb = Math.max(target.absorb, amount);
    target.absorbTimer = Math.max(target.absorbTimer, duration);
    host.flashes.push({
      pos: vec(target.pos.x, target.pos.y), radius: target.radius + 8,
      color: '#d8e8f8', life: 0.25, maxLife: 0.25,
    });
  }

export function sceneApplyRestore(host:NativeSceneRestorationHost,
    target: Actor,
    fx: { resource: 'life' | 'mana' | 'es' | 'poise'; amount: number; resetEsDelay?: boolean },
    opts?: { noEvent?: boolean; tags?: SkillTag[]; feedingCue?: import('../data/feedingCues').FeedingCueSpec | false },
  ): number {
    let landed = 0;
    if (fx.resource === 'life') {
      landed = target.healBy(fx.amount);
    } else if (fx.resource === 'mana') {
      const before = target.mana;
      target.mana = Math.min(target.availableMaxMana(), target.mana + fx.amount);
      landed = target.mana - before;
    } else if (fx.resource === 'poise') {
      landed = target.gainPoise(fx.amount);
    } else {
      landed = target.gainEs(fx.amount);
      if (fx.resetEsDelay) target.esDelay = 0;
    }
    if (fx.resource !== 'poise') noteRestoreGain(target, fx.resource, landed, opts?.feedingCue);
    if (landed > 0 && !opts?.noEvent && target.gainEvents.length < 64) {
      target.gainEvents.push({
        kind: 'restore', id: fx.resource, depth: 0,
        n: landed, tags: opts?.tags,
      });
    }
    return landed;
  }

export function sceneStartRestoreStream(host:NativeSceneRestorationHost,
    target: Actor, caster: Actor, inst: SkillInstance,
    fx: {
      resource: 'life' | 'mana' | 'es'; amount: number; duration: number;
      amountPerLevel?: number; amountPctMax?: number; perCharge?: boolean;
      lane?: 'surge' | 'settle';
      feedingCue?: import('../data/feedingCues').FeedingCueSpec | false;
    },
    chargesSpent: number,
    critMult?: number,
  ): void {
    const tags = skillContextTags(inst);
    const extra = instanceMods(inst);
    const maxPool = fx.resource === 'life' ? target.maxLife()
      : fx.resource === 'mana' ? target.availableMaxMana() : target.maxEs();
    const pct = (fx.amountPctMax ?? 0)
      + (fx.lane !== 'surge' ? caster.sheet.get('restorePctMax', tags, extra) : 0)
      + (fx.lane ? caster.sheet.get('pourPct_' + fx.lane, tags, extra) : 0);
    const base = fx.amount
      + (fx.amountPerLevel ?? 0) * Math.max(0, effectiveSkillLevel(inst) - 1)
      + pct * maxPool;
    const total = base * (fx.perCharge ? Math.max(1, chargesSpent) : 1)
      * caster.sheet.get('restorePower', tags, extra)
      * (fx.lane ? caster.sheet.get('pourPower_' + fx.lane, tags, extra) : 1)
      // THE LUCKY POUR: the whole stream may crit at the pour (a flask
      // with Deadly Precision socketed pours deeper on its crits).
      * (critMult ?? host.critMendMult(caster, inst, target.pos));
    if (total <= 0) return;
    const dur = Math.max(0.2, fx.duration
      * caster.sheet.get('effectDuration', tags, extra));
    target.restoreStreams.push({
      resource: fx.resource, perSec: total / dur, remaining: total,
      feedingCue: fx.feedingCue ?? inst.def.feedingCue,
    });
    // The pour is a GAIN EVENT (depth 0 — a drink is real play): sympathy
    // links replay it on kin (the tamed-beast flask bond). Echo streams are
    // granted directly and never re-event, so pours can't chain.
    if (target.gainEvents.length < 64) {
      target.gainEvents.push({
        kind: 'restore', id: fx.resource, depth: 0,
        n: total, dur, tags: inst.def.tags,
      });
    }
    // feedingCue gains are emitted by actual ticks, including primed releases.
  }

export function sceneCritMendMult(host:NativeSceneRestorationHost,caster: Actor, inst: SkillInstance, at?: Vec2): number {
    const tags = skillContextTags(inst, grantedTags(inst));
    const extra = instanceMods(inst);
    if (!chance(caster.sheet.get('critChance', tags, extra))) return 1;
    const mult = caster.sheet.get('critMulti', tags, extra);
    if (at) host.flashes.push(combatCueFlash(at, 'mend', 18));
    return mult;
  }

export function sceneApplyHeal(host:NativeSceneRestorationHost,
    caster: Actor, inst: SkillInstance, target: Actor,
    fx: { amount?: number; pctMax?: number; excludeCaster?: boolean }, mult = 1, quiet = false,
  ): number {
    if (target.dead || target.downed || (fx.excludeCaster && target === caster)) return 0;
    const tags = skillContextTags(inst, grantedTags(inst));
    const extra = instanceMods(inst);
    const raw = ((fx.amount ?? 0) + (fx.pctMax ?? 0) * target.maxLife())
      * caster.sheet.get('healPower', tags, extra) * mult
      * host.critMendMult(caster, inst, quiet ? undefined : target.pos);
    if (raw <= 0) return 0;
    // HEAL-OVER-TIME conversion (Mending Echoes): the direct mend POURS
    // instead — total × factor over the graft's seconds, riding the
    // restore-stream machinery (healTaken gates each sip via healBy).
    const hot = socketSpec(inst, 'healOverTime');
    if (hot) {
      const total = raw * hot.factor;
      target.restoreStreams.push({
        resource: 'life', perSec: total / hot.seconds, remaining: total,
        feedingCue: inst.def.feedingCue,
      });
      return 0;
    }
    const landed = target.healBy(raw);
    // A landed mend is a GAIN EVENT (sympathy 'heal' channel — tick-rate
    // sources call healBy directly and stay quiet here). Echoes heal via
    // healBy alone and never re-event: heal chains are structurally dead.
    if (landed > 0 && target.gainEvents.length < 64) {
      target.gainEvents.push({
        kind: 'heal', id: 'life', depth: 0, n: landed, tags: inst.def.tags,
      });
    }
    // OVERMEND: spilled healing becomes a ward (grantAbsorb keeps the max).
    const spill = raw * target.sheet.get('healTaken') - landed;
    if (spill > 0.5) {
      const oh = caster.sheet.get('overheal', tags, extra);
      if (oh > 0) host.grantAbsorb(target, Math.min(target.maxLife() * 0.5, spill * oh), 6);
    }
    if (!quiet && landed >= 1) {
      host.seatText(caster, target.pos, '+' + Math.round(landed), '#6fc06f', 12); // THE WIRE'S EYES: the healer's seat
    }
    // HEALER AGGRO: anyone locked onto the healed victim books threat against
    // the mender (their brain's TargetSpec.threat.heal weighs it) — keeping a
    // warband alive is its own provocation.
    if (landed > 0 && caster !== target) {
      for (const e of host.actors) {
        if (e.dead || e.team === caster.team || !e.brain || e.aiTargetId !== target.id) continue;
        const hw = normalizeBrain(e.brain).base.target?.threat?.heal ?? 0.5;
        if (hw > 0) e.addThreat(caster.id, landed * hw);
      }
    }
    return landed;
  }

export function sceneApplyHealChained(host:NativeSceneRestorationHost,
    caster: Actor, inst: SkillInstance, target: Actor,
    fx: { amount?: number; pctMax?: number; chain?: number; excludeCaster?: boolean }, mult = 1, quiet = false,
  ): void {
    host.applyHeal(caster, inst, target, fx, mult, quiet);
    const tags = skillContextTags(inst, grantedTags(inst));
    const extra = instanceMods(inst);
    let hops = (fx.chain ?? 0) + Math.round(caster.sheet.get('chainCount', tags, extra));
    const visited = new Set<Actor>([target]);
    let from = target;
    let scale = mult;
    while (hops-- > 0) {
      let next: Actor | null = null; let worst = 0.999;
      for (const a of host.actors) {
        if (a.dead || a.downed || a.untargetable || a.construct || visited.has(a)) continue;
        // Every hop carries the original heal's recipient exclusions.
        if (fx.excludeCaster && a === caster) continue;
        if (a.team !== caster.team || !sameStory(a, from)) continue; // (the sovereignty gate: the chain hops its own story)
        if (dist(from.pos, a.pos) > 220) continue;
        const frac = a.life / Math.max(1, a.maxLife());
        if (frac < worst) { worst = frac; next = a; }
      }
      if (!next) break;
      scale *= 0.75;
      // A momentary mending arc (the discharge-zap visual pattern).
      { let nativeTetherQueue:NativeSceneRestorationHost['tethers']; let nativeTetherRow:NativeSceneRestorationHost['tethers'][number];
      (nativeTetherQueue=observeNativeCombatStorage(host,'tethers',host.tethers)).push(nativeTetherRow={
        a: from, b: next, owner: caster, skillId: inst.def.id, link: 'zap',
        visual: 'healing_chain', visualAge: 0,
        amounts: {}, heal: 0, affects: 'allies', width: 5,
        remaining: 0.16, tickTimer: 99,
        color: '#7ec88a',
        ax: from.pos.x, ay: from.pos.y, bx: next.pos.x, by: next.pos.y,
      });
      observeNativeCombatRecord(host,'tethers',nativeTetherQueue,nativeTetherRow,caster,inst);
    }
      host.applyHeal(caster, inst, next, fx, scale, quiet);
      if (skillTargetVoice(inst.def.id)) host.showSkillArrival(caster, inst, next.pos, next.radius + 14, next.tier);
      visited.add(next);
      from = next;
    }
  }

export function sceneCleanseActor(host:NativeSceneRestorationHost,target: Actor, count = 2): number {
    const stripped = target.cleanseDebuffs(count);
    if (stripped > 0) host.text(target.pos, 'cleansed', '#a8e8d8', 12, 'combat');
    return stripped;
  }

export function sceneRingAfflictions(host:NativeSceneRestorationHost,target: Actor, portion: number): number {
    if (portion <= 0) return 0;
    let rung = 0;
    for (let i = target.statuses.length - 1; i >= 0; i--) {
      const s = target.statuses[i];
      const def = STATUS_DEFS[s.id];
      if (def?.beneficial) continue;
      if (s.stacks > 1) {
        s.stacks -= Math.max(1, Math.round(s.stacks * portion));
        if (s.stacks <= 0) {
          target.statuses.splice(i, 1);
          if (!target.statuses.some(o => o.id === s.id)) {
            target.sheet.removeSource('status:' + s.id);
          }
        } else if (def?.mods && def.modsPerStack) {
          // The sunscorch-dwindle discipline: per-stack mods re-sync on
          // every shed so the sheet never wears stacks the body lost.
          target.sheet.setSource('status:' + s.id,
            def.mods.map(m => ({ ...m, value: m.value * s.stacks })));
        }
      } else {
        s.remaining *= 1 - portion;
      }
      rung++;
    }
    if (rung > 0) host.text(target.pos, 'rung clean', '#d8c8a0', 12, 'combat');
    return rung;
  }

export function sceneHealAlliesInArea(host:NativeSceneRestorationHost,
    caster: Actor, inst: SkillInstance, accepts: (a: Actor) => boolean,
    mult = 1, quiet = false, once?: Set<number>,
  ): void {
    // `once` is a per-CROSSING ledger (the sweep zones' own struck set):
    // a drifting crescent mends each ally exactly once per pass — a
    // blade-pass, not a per-frame fountain. Lingering fields pass nothing
    // and keep their per-tick wash. Ids are shared with the zone's damage
    // victims and rung bells; the sets are disjoint by team, so nothing
    // collides.
    const fxs = inst.def.effects.filter(fx => fx.type === 'heal' || fx.type === 'cleanse');
    if (!fxs.length) return;
    for (const a of host.actors) {
      if (a.dead || a.downed || a.untargetable || a.construct || a.team !== caster.team || !sameStory(a, caster)) continue; // (the sovereignty gate)
      if (once?.has(a.id)) continue;
      if (!accepts(a)) continue;
      let touched = false;
      for (const fx of fxs) {
        if (fx.type === 'heal' && fx.excludeCaster && a === caster) continue;
        touched = true;
        if (fx.type === 'heal') host.applyHealChained(caster, inst, a, fx, mult, quiet);
        else host.cleanseActor(a, fx.count ?? 2);
      }
      if (touched) once?.add(a.id);
    }
  }

export function sceneSeatText(host:NativeSceneRestorationHost,by: Actor | null | undefined, at: Vec2, text: string, color: string, size = 13, kind?: string): void {
    host.text(at, text, color, size, kind);
    host.creditFloat(by);
  }

export function sceneCreditFloat(host:NativeSceneRestorationHost,by: Actor | null | undefined, seatId?: string | null): void {
    if (host.partyRows === null || !host.texts.length) return; // keeperSeat: the solo invariant (no owner off a hosted world)
    const seat = seatId !== undefined ? seatId : host.seatOfRoot(by)?.id;
    if (seat && !host.seats.find(s => s.id === seat)?.keeper) host.texts[host.texts.length - 1].seat = seat;
  }
