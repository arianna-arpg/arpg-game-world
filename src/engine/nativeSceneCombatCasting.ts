/** Exact native combat casting algorithms from Git 42f95716294995cbdd83785f0a0782ddda971f76.
 * Extraction is not an admitted runtime: all capabilities must be bound by the actual area aggregate. */
import { updateCastAim } from './castAim';
import { markBodyAction } from './bodyAction';
import { skillBurstVoice } from '../data/skillVisuals';
import { skillBeamVoice } from '../data/skillFlightVisuals';
import { skillStrikeVoice } from '../data/skillStrikeVisuals';
import { skillMovementVoice } from '../data/skillMovementVisuals';
import { skillRiteVoice } from '../data/skillTargetVisuals';
import { skillSelfVoice } from '../data/skillSelfVisuals';
import { skillPresenceVoice } from '../data/skillPresenceVisuals';
import { feedingCueFlash } from './feedingCues';
import { summonReservationUnit } from './companionGrants';
import { summonContractSlots } from './summonContracts';
import { throngTravelProtected } from './throngEvolution';
import { cosmeticSkillPaint } from '../meta/cosmetics';
import { COSMETIC_CFG } from '../data/cosmetics';
import { guardCapacity } from './guardArtsSpec';
import { instanceCastMode } from './skills';
import { challengeOf } from './challengeSpec';
import { instanceCastCycle, instanceTreeOver } from './skills';
import { DEED_CFG } from '../data/classdeeds';
import { skillAbsorbAmount } from './absorb';
import { instanceEffects } from './skills';
import { angleDiff, angleTo, chance, dist, pick, rand, vec, type Vec2 } from '../core/math';
import { replenishingDelivery } from './replenishment';
import { mod, type DamageType, type Modifier, type SkillTag } from './stats';
import { STATUS_DEFS } from './status';
import { Actor, type CastingState } from './actor';
import { mitigateTyped } from './damage';
import { nearestBody, noteBodyHit, reachTo, type SegBody } from './segments';
import { DEFENSE_CFG } from './defense';
import { COMMAND_CFG, hasCommandKind, issueCommand, obedienceOf } from './ai';
import { BEHAVIOR_STATS, normalizeBrain } from './brain';
import { convertRuleHolds, effectiveSkillLevel, grantedTags, grimoireForm, guardBashSpec, guardBashReady, hostSockets, instanceAim, instanceCascadePlan, instanceChargeCost, instanceChargeGain, instanceConvert, instanceDelivery, instanceEchoes, instanceFuse, instanceMods, instanceOvercharge, instancePulsePlan, instanceSelfStack, instanceSizeOver, instanceStrikeTiming, instanceBirth, instanceSummon, instanceTargeting, instanceTethers, instanceTurret, instanceUseCharges, instanceVariance, instanceCurseField, instanceTrigger, instanceTriggerArmed, instanceTriggerLimit, instanceTriggerPermit, makeSkillInstance, rampValue, resolveSizeOver, rollCount, socketSpec, instanceChannel, CONSTRUCT_FORWARD_CFG, UNLEASH_CFG, CONCENTRATION_CFG, TRIGGER_CFG, REFLEX_CFG, AOE_SHAPE, bandSwingGeo, skillContextTags, type AuraDelivery, type ChannelSpec, type GroundDelivery, type GroundCascadeSpec, type SkillDef, type SkillEffect, type DropZoneSpec, type SkillInstance } from './skills';
import { evalCurve } from './curves';
import { SKILLS } from '../data/skills';
import { MONSTERS, defLeavesRemains } from '../data/monsters';
import { resolveInvocation, RUNE_INFO, type RuneId } from '../data/invocations';
import { instanceInvocation, makeInvocationPayload } from './invocation';
import { applyGuardSurge } from './guardSurge';
import { COMBO_CFG, comboRepeatedNow, comboStat, comboVariedNow, matchComboRule, type ComboRuleDef } from './sequence';
import { mimicCapture, mimicPowerMods, mimicRefreshWatch, mimicSelect, mimicSelected } from './mimic';
import { COMBO_LIST } from '../data/combos';
import { ELEMENTAL_TYPES } from './stats';
import { sameStory } from './tiers';
import { gaugeSpend } from './gauge';
import { isThrongBody, THRONG_CFG } from './throng';
import { castSealShuts, type CastSealSpec } from './castseal';
import { GRAB_CFG } from './grab';
import { caromCapacity, payloadTransition } from './payloadCues';
import { noteProcCue } from './procCues';
import { combatCueFlash, timingCueFlash } from './combatCues';
import { castingEventFlash } from './castingCues';
import { reserveCostOf } from './reserves';
import { CONJURE_CFG, type ConjureGrant } from './flux';
import { CONJURE_RIDERS } from '../data/conjury';
import { affordTravel, LOS_CFG } from './los';
import { SIM_TAP } from './tap';
import type { Corpse, ResolvedTarget } from "./world";
import type { NativeSceneCombatHost, DashConjureStash, Flash, Zone } from "./nativeSceneCombatHost";
import { CORPSE_CFG, inAoe, inAoeBody, statusReqs } from "./nativeSceneCombatResolution";
import { flattenPulseQueue } from "./nativeSceneGroundFollowUps";

export function sceneCastSealed(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance): CastSealSpec | null {
    const seal = nativeHost.zone.castSeal;
    if (!seal) return null;
    return castSealShuts(seal, { world: nativeHost, caster, inst, seated: nativeHost.seatOf(caster) !== undefined })
      ? seal : null;
  }

export function sceneResolveTargeting(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, aim: Vec2): ResolvedTarget | null {
    // SOVEREIGNTY: targeting — picks ride hostility (rim duels are authored); the corpse haul is gated (the derived census, probe_tiers RIG T).
    const t = instanceTargeting(inst)!;
    const search = t.searchRadius ?? 70;

    if (t.target === 'corpse') {
      // THE GRIMOIRE: an attuned form frees the skill from the ground — no
      // corpse sought, no corpse needed; the cast targets the aim point
      // like any plain summon (the summon branch reads the form).
      if (grimoireForm(inst)) return { pos: vec(aim.x, aim.y) };
      const tags = skillContextTags(inst);
      const extra = instanceMods(inst);
      // THE WAGON: a plural spec loads up to 1 + corpseBatch bodies nearest
      // the mark in one find. Single-appetite skills keep the classic one.
      const want = t.plural
        ? 1 + Math.max(0, Math.round(caster.sheet.get('corpseBatch', tags, extra)))
        : 1;
      // THE SAME-STORY LAW: a corpse lying on another story is nobody's
      // fuel from here (a stamped body's own story, else the floor's word).
      const haul = nativeHost.corpses
        .filter(c => (c.tier ?? nativeHost.spoilStoryAt(c.pos)) === caster.tier
          && dist(caster.pos, c.pos) <= t.castRange && dist(aim, c.pos) < search)
        .sort((a, b) => dist(aim, a.pos) - dist(aim, b.pos))
        .slice(0, want);
      // Soulwalk-style fallback keeps FIRST CLAIM on a bare field: no corpse
      // at all? Target a minion WITHOUT harming it (Corpse Shift teleports
      // to it; nothing is consumed).
      if (!haul.length && caster.sheet.get('targetMinionFallback', tags, extra) > 0) {
        let pick2: Actor | null = null; let pd = Math.max(search, 160);
        for (const a of nativeHost.actors) {
          if (a.owner !== caster || a.dead || a.construct) continue;
          if (dist(caster.pos, a.pos) > t.castRange) continue;
          const dd = dist(aim, a.pos) - a.radius;
          if (dd < pd) { pd = dd; pick2 = a; }
        }
        if (pick2) return { pos: vec(pick2.pos.x, pick2.pos.y), actor: pick2 };
      }
      // Sacrificial Rites: short of the load? Your nearest minions fill the
      // wagon, nearest first (with no wagon the load is 1 — the classic
      // none-available fallback, unchanged).
      if (haul.length < want && caster.sheet.get('sacrificeMinions', tags, extra) > 0) {
        const victims = nativeHost.actors
          .filter(a => a.owner === caster && !a.dead && !a.construct && !!a.defId
            // Sacrifice yields a CORPSE — only the organic qualify (the
            // same remains gate as the kill path: a stone hound spills no
            // fuel, so the knife passes it by rather than wasting it).
            && (!MONSTERS[a.defId] || defLeavesRemains(MONSTERS[a.defId]))
            && dist(caster.pos, a.pos) <= t.castRange
            && dist(aim, a.pos) - a.radius < Math.max(search, 160))
          .sort((a, b) => (dist(aim, a.pos) - a.radius) - (dist(aim, b.pos) - b.radius));
        for (const victim of victims) {
          if (haul.length >= want) break;
          const corpse: Corpse = {
            pos: vec(victim.pos.x, victim.pos.y),
            defId: victim.defId!, level: victim.level,
            maxLife: victim.maxLife(), remaining: CORPSE_CFG.duration,
            tier: victim.tier,
          };
          nativeHost.kill(victim); // a real death — Martyrdom and friends apply
          {
let nativeStorage: typeof nativeHost.corpses;
let nativeRecord: typeof nativeHost.corpses[number];
(nativeStorage = nativeHost.corpses).push(nativeRecord = corpse);
nativeHost.issueCombatRecord("corpses", nativeStorage, nativeRecord, undefined, undefined);
}
          haul.push(corpse);
        }
      }
      if (haul.length) {
        const found: ResolvedTarget = { pos: vec(haul[0].pos.x, haul[0].pos.y), corpse: haul[0] };
        if (haul.length > 1) found.corpses = haul;
        return found;
      }
      return null;
    }

    const pool = t.target === 'enemy' ? nativeHost.enemiesOf(caster)
      : t.target === 'minion'
        ? nativeHost.actors.filter(a => a.owner === caster && !a.dead && !a.construct)
        : nativeHost.actors.filter(a => a.team === caster.team && !a.dead && a !== caster);
    const reqs = statusReqs(t.requiresStatus);
    // FIRING LINE gate (occlusion): HOSTILE targeting refuses victims the
    // caster has no line of fire to — you cannot Ignite through masonry.
    // Ally mends stay free (a wall never blocks succor), and phasing skills
    // target through anything. The AI's cast-validity check shares this
    // resolve, so a monster never winds up a targeted cast into a wall.
    const needLoF = t.target === 'enemy'
      && nativeHost.skillOcclusion(caster, inst) === 'blocked';
    const qualifies = (a: Actor): boolean => {
      if (reqs && !a.statuses.some(s => reqs.includes(s.id))) return false;
      // TAXONOMY gate (requiresMonsterTags): the target's KIND must match —
      // Tame finds only beasts; aiming at anything else finds nothing.
      if (t.requiresMonsterTags) {
        const mtags = a.defId ? MONSTERS[a.defId]?.tags : undefined;
        if (!mtags || !t.requiresMonsterTags.some(tag => mtags.includes(tag))) return false;
      }
      if (needLoF && !nativeHost.lineOfFire(caster.pos, a.pos, caster.tier)) return false;
      return true;
    };
    let best: Actor | null = null, bd = search;
    for (const a of pool) {
      if (dist(caster.pos, a.pos) > t.castRange) continue;
      if (!qualifies(a)) continue;
      // SEGMENT FABRIC: the cursor finds the creature by its NEAREST
      // hittable body — hover a coil, target the worm (plain monsters:
      // the classic edge distance, byte-identical).
      const dd = reachTo(a, aim);
      if (dd < bd) { bd = dd; best = a; }
    }
    // AUTO-TARGET: nothing near the cursor — take the nearest valid target
    // in cast range instead, so consume-combos (Eviscerate, Flash Freeze)
    // flow without pixel-hunting the afflicted. HEAL skills auto-target
    // the most WOUNDED ally instead of the nearest — triage by default.
    if (!best) {
      const triage = t.target === 'ally'
        && inst.def.effects.some(fx => fx.type === 'heal');
      if (triage) {
        let worst = 0.999;
        for (const a of pool) {
          if (!qualifies(a) || a.construct) continue;
          if (dist(caster.pos, a.pos) - a.radius > t.castRange) continue;
          const frac = a.life / Math.max(1, a.maxLife());
          if (frac < worst) { worst = frac; best = a; }
        }
      } else {
        let cd = t.castRange;
        for (const a of pool) {
          if (!qualifies(a)) continue;
          const dd = dist(caster.pos, a.pos) - a.radius;
          if (dd < cd) { cd = dd; best = a; }
        }
      }
    }
    if (best) return { pos: vec(best.pos.x, best.pos.y), actor: best };
    if (t.fallback === 'self') return { pos: vec(caster.pos.x, caster.pos.y), self: true };
    return null;
  }

export function sceneUseSkill(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, aim: Vec2, seatPress = false): boolean {
    // THE CAST SEAL (engine/castseal.ts, ZoneDef.castSeal): the ground's
    // first word at the door — a sealed cast pays nothing, toggles
    // nothing and interrupts no dwell (it sits BEFORE markSeatActed), and
    // is SILENT unless the seal authored a line (a reason, never a
    // caption; seat presses only — the AI's refusals never speak). Mu
    // wears it whole; carve-outs are the seal's own rows, never code.
    {
      const seal = nativeHost.castSealed(caster, inst);
      if (seal) {
        if (seal.line && seatPress) nativeHost.failNote(caster, 'castseal', seal.line);
        return false;
      }
    }
    if (caster.hiveForm && inst.def.hivecall) return nativeHost.hivecallMeta(caster, inst) ?? false;
    if (throngTravelProtected(caster) || caster.throngDriven || caster.throngCarried) return false;
    if (replenishingDelivery(inst)) {
      if (seatPress && replenishingDelivery(inst)?.replenish?.toggle
        && !caster.dead && !caster.downed && caster.skills.includes(inst)) {
        if (inst.replenishmentPaused) delete inst.replenishmentPaused;
        else inst.replenishmentPaused = true;
        nativeHost.replenishment.forget(caster, inst);
        const replenishmentSeat = nativeHost.seatOf(caster);
        if (replenishmentSeat) nativeHost.markMetaDirty(replenishmentSeat);
        nativeHost.charDirty = true;
        nativeHost.text(vec(caster.pos.x, caster.pos.y - 20), inst.replenishmentPaused ? 'replenishment paused' : 'replenishment enabled', inst.def.color, 13);
        return true;
      }
      if (seatPress) nativeHost.failNote(caster, inst.def.id + ':replenish', 'replenishes while on your bar');
      return false;
    }
    nativeHost.markSeatActed(caster); // a cast/attack interrupts THAT seat's dwell
    // HELD FAST (the grab fabric): a body in someone's grip cannot cast —
    // except the reflex lane (flasks are never locked out) — and every
    // refused press MASHES the break meter: the button IS the struggle.
    if (caster.heldBy !== undefined && !caster.isReflex(inst)) {
      const holder = nativeHost.actorById(caster.heldBy);
      const hold = holder?.gripping;
      if (hold && hold.id === caster.id) hold.struggle += GRAB_CFG.break.mashPress;
      nativeHost.failNote(caster, 'grab:held', 'held fast — struggle!');
      return false;
    }
    // THE GNAW's quiet kit (engine/cling.ts): while a gnaw-tempered body
    // holds a ride, its ONLY blow is its teeth — the one pipeline refuses
    // casts exactly like the mover contract refuses steps (moveActor's
    // latched early-out). The chew itself lands in the latch sweep. Seats
    // exempt: a possessed body answers to its rider's hands, not its
    // temper; cast-kit clingers (no gnaw) keep whacking untouched.
    if (caster.clingTo && caster.cling?.gnaw && !nativeHost.seatOf(caster)) return false;
    // A SADDLE holds no footwork (the mount fabric): movement-tagged skills
    // refuse while mounted — the seat pin would stomp the dash the same
    // frame it fired, a cast paid for nothing. A rider's dashes stay its
    // DISMOUNTED craft (the unhorse beat hands them back); every other verb
    // casts freely from the saddle.
    if (caster.mountId !== undefined && inst.def.tags?.includes('movement')) return false;
    // An overdrive toggle with debt outstanding is LOCKED ON — canUse would
    // refuse silently; this supplies the why.
    {
      const dv = inst.def.delivery;
      if (dv.type === 'aura' && dv.mode === 'toggle' && dv.overdrive
        && caster.activeAuras.has(inst.def.id)
        && (caster.overdrive[dv.overdrive.lane]?.debt ?? 0) > 0) {
        nativeHost.failNote(caster, inst.def.id + ':debt', 'debt outstanding');
        return false;
      }
      // A life-locked toggle (Berserk) refuses to release a healthy host.
      if (dv.type === 'aura' && dv.mode === 'toggle' && dv.lockAboveLife !== undefined
        && caster.activeAuras.has(inst.def.id)
        && caster.life > dv.lockAboveLife * caster.maxLife()) {
        nativeHost.failNote(caster, inst.def.id + ':locked', 'it will not let go');
        return false;
      }
    }
    // TRIGGER-SOCKETED skills (SupportDef.trigger) are no longer castable:
    // a seat press TOGGLES the trigger armed/disarmed — free, instant,
    // always available (a disarmed trigger neither fires nor drains). AI
    // presses fail outright and the brain moves on to a real button.
    {
      const trig = instanceTrigger(inst);
      if (trig) {
        if (!seatPress) return false;
        const st = (inst.state ??= {});
        st.triggerOff = instanceTriggerArmed(inst);
        const triggerSeat = nativeHost.seats.find(s => s.actor === caster);
        if (triggerSeat) nativeHost.markMetaDirty(triggerSeat);
        caster.useLock = Math.max(caster.useLock, 0.25);
        return true;
      }
      // A stale chain-depth stamp on a NO-LONGER-triggered skill must not
      // dampen its events — direct casts always count as real actions.
      if (inst.state?.trigDepth) inst.state.trigDepth = 0;
    }
    // THE CAST-TIME REQUIREMENT GATE (backlog #90): a learned gem's attribute
    // law binds at the press, not only at the learn — castReqRefusal carries
    // the full scope (seatless casters, the possession seam, mints, live
    // toggles). Sits AFTER the trigger lane (a disarm always lands; live
    // toggles release through the predicate's own exemption) and BEFORE the
    // convert/mimic redirects and every cost, so a refused press pays
    // nothing and the refusal names the slot actually pressed.
    {
      const why = nativeHost.castReqRefusal(caster, inst);
      if (why) { nativeHost.failNote(caster, inst.def.id + ':req', why); return false; }
    }
    // SKILL CONVERSION (SkillDef.convert): while the rule holds, this press
    // IS the converted skill — minted per host at the host's effective
    // level with hostSkillId stamped (the meta/combo idiom), so a full
    // Tame's press whistles ITS OWN companion. The HUD already presented
    // this face (slotFaceOf); the button does what it showed.
    {
      const conv = instanceConvert(inst); // innate OR a munition graft's rack
      if (conv && SKILLS[conv.skillId]
        && convertRuleHolds(conv.when, caster, inst, nativeHost)) {
        const minted = nativeHost.mintMetaInstance(caster, inst, conv.skillId);
        // The slot's GEMS ride its converted face — a press of this slot
        // IS the converted skill, so the socket array is SHARED and the
        // hostSockets tag-admission decides per face what actually fits
        // (Swift Hands in the gun quickens the gun's own reload; a melee
        // gem stays inert on it). Live reference: re-socketing propagates.
        minted.sockets = inst.sockets;
        return nativeHost.useSkill(caster, minted, aim, seatPress);
      }
    }
    // THE MIMIC SLOT (SkillDef.mimic — engine/mimic.ts): the press IS the
    // selected captured art, minted per host at the host's effective level
    // (the convert idiom: shared sockets, hostSkillId stamped — the HUD
    // already presented this face). The power factor rides as instance
    // mods; the minted cast then runs the whole ordinary pipeline, so the
    // ring records the art's REAL tags and its own cooldown paces it.
    if (inst.def.mimic) {
      const sel = mimicSelected(caster, nativeHost.time);
      if (!sel || !SKILLS[sel.sid]) {
        nativeHost.failNote(caster, inst.def.id + ':empty', 'no art captured');
        return false;
      }
      const minted = nativeHost.mintMetaInstance(caster, inst, sel.sid);
      minted.sockets = inst.sockets;
      minted.extraMods = mimicPowerMods(inst.def.mimic);
      return nativeHost.useSkill(caster, minted, aim, seatPress);
    }
    // PREREQUISITE GATES: an unmet gate is the ONE canUse refusal worth a
    // note — the player should learn "not ready", not wonder about mana.
    // The gate speaks its own note where it carries one (a flask's thirst
    // gate says 'brimming') — and refusing HERE is what keeps a moot press
    // from eating its cost: a use is a use, or it is nothing.
    {
      const unmet = caster.unmetGate(inst);
      if (unmet) {
        nativeHost.failNote(caster, inst.def.id + ':gate', unmet.note ?? 'not ready');
        return false;
      }
    }
    for (const fx of instanceEffects(inst)) {
      if (fx.type === 'relocateConstruct' && !nativeHost.relocationTarget(caster, inst, fx.radius)) {
        nativeHost.failNote(caster, inst.def.id + ':device', 'no device from this skill in reach');
        return false;
      }
    }
    if (!caster.canUse(inst)) return false;
    // THE RESERVE PRICE (engine/reserves.ts): this body's own fuel, spent
    // by its own casting. Sits HERE — after every redirect that re-enters
    // useSkill (convert / mimic / trigger), so the price is charged once
    // and against the skill that actually fires, and after canUse, so a
    // cast refused for any other reason never quietly drains the pool.
    //
    // COSTS REFUSE, THEY NEVER DEBT: short of fuel the cast does not fire
    // and the brain falls through to its next rule exactly as it does on
    // short mana. That refusal IS the denial the player is buying — bait
    // the expensive move and the expensive move is gone.
    if (caster.reserves && caster.reserveSpecs) {
      let short = false;
      for (const spec of caster.reserveSpecs) {
        const cost = reserveCostOf(spec, inst.def.id);
        if (!cost) continue;
        const st = caster.reserves.get(spec.id);
        if (!st || st.cur < cost || st.ventUntil > nativeHost.time) { short = true; break; }
      }
      if (short) {
        // Belt only: canUse already refused this press (the affordability
        // read lives there so AI rotations fall through cleanly) — this
        // enforcement catches any path that skipped it.
        nativeHost.failNote(caster, inst.def.id + ':reserve', 'nothing left');
        return false;
      }
      for (const spec of caster.reserveSpecs) {
        const cost = reserveCostOf(spec, inst.def.id);
        if (!cost) continue;
        const st = caster.reserves.get(spec.id)!;
        st.cur = Math.max(0, st.cur - cost);
        st.lastSpendAt = nativeHost.time;
      }
    }
    // A PIERCED press: canUse admitted it THROUGH a live commitment (the
    // reflex lane / a hold combo). Resolve it AROUND the running action —
    // no facing jerk, no aim restamp, no bar-growing conversions, and no
    // recovery stamp (reflexes pace on their own reflexLock instead).
    const pierced = !caster.canAct();
    // COMBO CHAIN (Unisect → Bisect → Trisect): consecutive presses within
    // the window WALK the chain — this press redirects to the queued step,
    // an ordinary catalog skill at the host's effective level. The cursor
    // advances on a successful press and resets past the end or the window.
    if (inst.def.comboChain?.skills.length) {
      const chain = inst.def.comboChain;
      const st = nativeHost.comboCursorOf(caster, inst); // THE HAND'S CURSOR
      const fresh = st.comboAt !== undefined && nativeHost.time - st.comboAt <= chain.window;
      const idx = fresh ? (st.comboIdx ?? 0) : 0;
      if (idx > 0 && chain.skills[idx - 1] === inst.def.id) {
        // THE REPEATED STEP (jab, jab, CROSS — 2026-09-11): a chain naming
        // its own host plays the host's OWN press for this beat — the
        // same instance, sockets, tree and level by construction — and
        // hands the cursor to the commit site below (comboSelf), which
        // walks it on instead of re-arming step one. Fall through.
        st.comboSelf = idx;
      } else if (idx > 0 && SKILLS[chain.skills[idx - 1]]) {
        // The step is ONE resolver's mint (comboStepOf — the face the bar
        // showed and the judgment the AI made press the same instance).
        const step = nativeHost.comboStepOf(caster, inst, idx)!;
        const ok = nativeHost.useSkill(caster, step, aim);
        if (ok) {
          st.comboAt = nativeHost.time;
          st.comboIdx = idx + 1 > chain.skills.length ? 0 : idx + 1;
        }
        return ok;
      } else {
        // The base press arms step one (advanced below only on success —
        // fall through to the ordinary pipeline).
        st.comboIdx = 0;
        st.comboSelf = undefined;
      }
    }
    // Monsters/minions refresh their aim point per cast (player seats refresh
    // per frame in applyInputs) — guided projectiles steer toward it.
    // CONSTRUCTS deliberately DON'T stamp: guidePointOf falls through to the
    // OWNER's live cursor, so a rift's (or a mirage's) guided missiles are
    // the player's marionettes — the documented Hell Rift behavior.
    // PIERCED presses don't stamp either: a mid-cast sip must never steer
    // the missiles the RUNNING cast is guiding.
    if (!caster.construct && !pierced) caster.aimPos = vec(aim.x, aim.y);
    const def = inst.def;

    // Befuddlement: cursed actors may fumble the attempt entirely, stunning
    // themselves — an interrupt that costs them the action.
    if (def.tags.includes('attack') || def.tags.includes('spell')) {
      for (const s of caster.statuses) {
        const sd = STATUS_DEFS[s.id];
        // THE POWER LANE reaches the knob (the ailment audit): a harder-
        // applied befuddlement fumbles MORE — chance × the application's
        // power, capped under certainty (a hex is a risk, never a lock).
        if (sd?.interruptChance && chance(Math.min(0.9, sd.interruptChance * (s.power ?? 1)))) {
          nativeHost.withCombatStatusSource(caster, caster, inst, () => caster.applyStatus('stun', 0, 0.75, sd.label));
          return false;
        }
      }
    }
    // THE ADDLED HAND (StatusDef.scrambleChance — befuddlement's misfiring
    // sibling): a volitional press may fire a DIFFERENT ready skill from
    // the caster's own kit — the hand goes to the wrong button, and
    // cooldowns burn at the worst moment. Symmetric by construction:
    // player bar slots and a monster's aiActionInsts are one pool law.
    // Exempt: internal mints (hostSkillId — metas/converts), triggered
    // fires (trigDepth), the reflex lane BOTH ways (flasks are never
    // touched, pressed or substituted), and the substitute call itself
    // (the latch — one turn per press, no scramble chains).
    if (!nativeHost.scrambleLatch && !inst.hostSkillId && !inst.state?.trigDepth
      && !def.reflex && (def.tags.includes('attack') || def.tags.includes('spell'))) {
      for (const s of caster.statuses) {
        const sd = STATUS_DEFS[s.id];
        // The power lane reaches this knob too (the ailment audit) —
        // same certainty cap as the interrupt.
        if (!sd?.scrambleChance || !chance(Math.min(0.9, sd.scrambleChance * (s.power ?? 1)))) continue;
        const pool: SkillInstance[] = [];
        const admit = (k: SkillInstance | null | undefined): void => {
          if (!k || k === inst || k.def.id === def.id || k.def.reflex) return;
          if (!(k.def.tags.includes('attack') || k.def.tags.includes('spell'))) return;
          if (instanceTrigger(k) !== undefined) return; // armed triggers are not buttons
          if (k.def.delivery.type === 'aura') return;   // never thrash a stance
          if (!caster.canUse(k)) return; // the wrong button still has to WORK
          pool.push(k);
        };
        for (const k of caster.skills) admit(k);
        if (caster.aiActionInsts) for (const k of caster.aiActionInsts.values()) admit(k);
        if (pool.length) {
          const sub = pool[Math.min(pool.length - 1, Math.floor(rand(0, pool.length)))];
          nativeHost.text(vec(caster.pos.x, caster.pos.y - 16), 'addled!', sd.color, 12, 'combat');
          nativeHost.scrambleLatch = true;
          const ok = nativeHost.useSkill(caster, sub, aim, seatPress);
          nativeHost.scrambleLatch = false;
          return ok;
        }
        break; // a one-button kit: the addled hand still finds it
      }
    }

    // Toggling an active aura off: free, instant, no delivery execution.
    if (def.delivery.type === 'aura' && def.delivery.mode === 'toggle'
      && caster.activeAuras.has(def.id)) {
      nativeHost.deactivateAura(caster, def.id);
      caster.useLock = 0.25;
      return true;
    }
    // Toggling a summon CONTRACT off: dismiss the bodies, free the mana.
    if (def.delivery.type === 'summon' && def.delivery.persistent?.toggle
      && caster.summonToggles.has(def.id)) {
      nativeHost.dismissSummonToggle(caster, def.id);
      caster.useLock = 0.25;
      return true;
    }
    // STROBE STANCE (GroundDelivery.strobe — Restless Earth): the press is
    // a TOGGLE. On: pay the ignition cost, reserve the stance's mana, and
    // let updateStrobes re-cast the placement on the beat. Off: seat
    // presses only (an AI re-press fails and it moves on) — refund + rest.
    if (def.delivery.type === 'ground' && def.delivery.strobe) {
      const strobe = def.delivery.strobe;
      const held = caster.strobes.get(def.id);
      if (held) {
        if (!seatPress) return false;
        caster.reservedMana = Math.max(0, caster.reservedMana - held.reserved);
        caster.strobes.delete(def.id);
        nativeHost.text(caster.pos, 'the earth rests', def.color, 11);
        caster.useLock = 0.25;
        return true;
      }
      const reserve = Math.round(caster.maxMana() * (strobe.reservePct ?? 0.2));
      if (caster.reservedMana + reserve > caster.maxMana()) {
        nativeHost.failNote(caster, def.id + ':reserve', 'mana locked');
        return false;
      }
      nativeHost.paySkillCost(caster, inst, caster.skillCost(inst));
      caster.reservedMana += reserve;
      // First beat lands almost at once — the toggle should feel alive.
      caster.strobes.set(def.id, { inst, timer: 0.05, reserved: reserve });
      if (def.cooldown > 0) {
        caster.cooldowns.set(def.id, def.cooldown);
        caster.cooldownTotals.set(def.id, def.cooldown);
      }
      caster.useLock = 0.25;
      return true;
    }
    // CURSE ON HIT (SupportDef.curseOnHit — Hexbrand): the socketed curse
    // stops being a cast. The press TOGGLES it: while DRAWN (reserving
    // mana), every top-level hit the owner lands ALSO strikes the victim
    // with this curse at a scale of its roll — statuses, procs and
    // ruptures ride the ordinary pipeline. Seat presses toggle; AI
    // re-presses fail and the brain moves on.
    {
      const coh = socketSpec(inst, 'curseOnHit');
      if (coh) {
        const drawn = caster.hexToggles.get(def.id);
        if (drawn) {
          if (!seatPress) return false;
          caster.reservedMana = Math.max(0, caster.reservedMana - drawn.reserved);
          caster.hexToggles.delete(def.id);
          nativeHost.text(caster.pos, 'hex sheathed', def.color, 11, 'combat');
          caster.useLock = 0.25;
          return true;
        }
        const reserve = Math.round(caster.maxMana() * (coh.reservePct ?? 0.25));
        if (caster.reservedMana + reserve > caster.maxMana()) {
          nativeHost.failNote(caster, def.id + ':reserve', 'mana locked');
          return false;
        }
        nativeHost.paySkillCost(caster, inst, caster.skillCost(inst));
        caster.reservedMana += reserve;
        caster.hexToggles.set(def.id, { inst, reserved: reserve });
        nativeHost.text(caster.pos, 'hex drawn', def.color, 11, 'combat');
        caster.useLock = 0.25;
        return true;
      }
    }
    // MIASMA (curseField 'follow'): the worn curse-field is a TOGGLE —
    // pressing again extinguishes it (the reservation refunds through
    // expireZone, whichever cleanup path ever runs).
    if (instanceCurseField(inst)?.mode === 'follow') {
      const zi = nativeHost.zones.findIndex(z =>
        z.caster === caster && z.toggled && z.follow && z.inst.def.id === def.id);
      if (zi !== -1) {
        nativeHost.expireZone(nativeHost.zones[zi]);
        nativeHost.zones.splice(zi, 1);
        caster.useLock = 0.25;
        return true;
      }
    }

    // Spirit Totem: the totem is planted and uses this skill INSTEAD of
    // you — intercepted here at press time so it covers EVERY cast mode:
    // an Ice Shield totem is a deployable guard post raising its own shell.
    // (Constructs are exempt, or totems would plant totems; pure self-buffs
    // and movement skills stay on the caster — an anchored totem can't dash.)
    {
      const dt0 = def.delivery.type;
      const totemable = !['construct', 'aura', 'detonate', 'summon', 'mark', 'dash', 'blink', 'leap'].includes(dt0)
        && !(dt0 === 'self' && instanceCastMode(inst) !== 'guard');
      // Pierced presses refuse the conversion: the plant needs a bar of its
      // own, and a reflex must never clobber the cast already on the spine.
      if (!caster.construct && totemable && !pierced
        && caster.sheet.get('castAsTotem', skillContextTags(def), instanceMods(inst)) > 0) {
        nativeHost.paySkillCost(caster, inst, caster.skillCost(inst));
        caster.facing = angleTo(caster.pos, aim);
        // THE DETRIMENT: planting inherits the spell's cast bar × the
        // totemPlaceTime stat (base DOUBLE, investable down) — a real,
        // visible, interruptible cast. Instants still pay a minimum plant;
        // the totem then casts on its own clock (constructCastRate).
        const placeTime = Math.max(0.3, caster.skillUseTime(inst)
          * caster.sheet.get('totemPlaceTime', skillContextTags(def), instanceMods(inst)));
        {
let nativeStorage: typeof caster;
let nativeRecord: NonNullable<typeof caster.casting>;
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = caster).casting = nativeRecord = {
          inst: (nativeRecordInstance = inst), mode: 'cast', aim: vec(aim.x, aim.y),
          elapsed: 0, total: placeTime, held: true, baseMult: 1,
          plantTotem: true,
        };
nativeHost.issueCombatRecord("casting", nativeStorage, nativeRecord, nativeStorage, nativeRecordInstance);
}
        return true;
      }
    }

    // Targeted skills resolve their target FIRST — no target, no cost.
    // A socketed graft WINS over the innate spec (Closing Instinct hands a
    // plain dash the auto-lunge); fallback 'aim' proceeds UNTARGETED so a
    // grafted movement skill never refuses the button on an empty field.
    // A curse→field conversion (Miasma) SKIPS targeting outright: the
    // field needs no victim to be lit — it afflicts whoever wanders in.
    let targetInfo: ResolvedTarget | null = null;
    const targetSpec = instanceCurseField(inst) ? undefined : instanceTargeting(inst);
    if (targetSpec) {
      targetInfo = nativeHost.resolveTargeting(caster, inst, aim);
      // THE GRAB BOUNDARY (engine/lite.ts): a seize whose reach found no
      // full body PROMOTES the nearest opposing pool row at the aim, then
      // re-resolves through the ordinary targeting — you cannot hold a
      // row of floats, so the row stands up to be held.
      if (!targetInfo && nativeHost.lite.liveCount
        && def.effects.some(f => f.type === 'grabSeize')) {
        const stood = nativeHost.litePromoteNearest(aim, {
          within: 90, max: 1, opposing: caster.team, story: caster.tier,
        });
        if (stood.length) targetInfo = nativeHost.resolveTargeting(caster, inst, aim);
      }
      if (!targetInfo && targetSpec.fallback !== 'aim') {
        nativeHost.failNote(caster, def.id + ':notarget', 'no valid target');
        return false;
      }
    }

    // A pierced press leaves the body alone: the shoulders stay square to
    // the cast/dash they belong to — only the wrist moves.
    if (!pierced) caster.facing = angleTo(caster.pos, aim);
    // GuardArts cast conversion shares this commitment read with scopes and fit.
    const mode = instanceCastMode(inst);

    // USE-CHARGES: the press spends one round off the bank (canUse already
    // refused an empty one) — the pacing device for the cadence family.
    // stepsFromBank (Riftstep): the bank AT PRESS TIME is the step count —
    // 3 banked = a 3-step flicker off ONE spent round. Captured before the
    // spend; deeper reserves buy quadratic storms (more steps AND presses).
    const useCharges = instanceUseCharges(inst); // native bank OR a munition graft's
    const bankSteps = useCharges?.stepsFromBank
      ? Math.max(1, caster.skillChargeBank(inst).count) : undefined;
    // The press that runs the bank DRY: finalRoundDamage pays off (base ×1,
    // a pure opt-in lever), and a MAGAZINE stamps its reload clock NOW —
    // the skill's own cooldown starts as the last round leaves (mid-mag
    // presses never touch it; executeSkill skips magazine stamps entirely),
    // flagging the bank so expiry pours the refill in updateTimers.
    let roundMult = 1;
    // THE VENT PRESS (useCharges.ventAll — THE SCALD KIT K2's Blowhole): the
    // press SPENDS THE WHOLE BANK and hands the count to the cast, which
    // grows by it (executeSkill opts.ventRounds — storm strikes, projectile
    // shots, or extra resolutions); a dry press casts plain (canUse never
    // refused it, the convert face never presented — the empower law).
    let ventRounds: number | undefined;
    if (useCharges?.ventAll) {
      const bank = caster.skillChargeBank(inst);
      ventRounds = bank.count;
      bank.count = 0;
    } else if (useCharges?.empower !== undefined) {
      // THE EMPOWER BANK: a round in the pot is DRUNK for MORE on this
      // use; a dry press casts plain — never refused, never converted,
      // never finalRoundDamage (that lever belongs to true ammunition).
      // The spammable keeps its cadence and gains a watchable beat.
      if (caster.skillChargeBank(inst).count > 0) {
        caster.spendSkillCharge(inst);
        roundMult = 1 + useCharges.empower;
      }
    } else if (useCharges) {
      caster.spendSkillCharge(inst);
      const bank = caster.skillChargeBank(inst);
      if (bank.count <= 0) {
        roundMult = caster.sheet.get('finalRoundDamage',
          skillContextTags(def), instanceMods(inst));
        if (useCharges.magazine && def.cooldown > 0) {
          nativeHost.stampSkillCooldown(caster, inst, def.cooldown);
          bank.reloading = true;
        }
      }
    }
    // THE REST LAW (2026-07-22, the user's call): the bank's second clock
    // is a REST clock — every true press restarts it, so a drip or trickle
    // never completes ACROSS a cast. No waiting a near-done clock out,
    // casting the ready press, and pocketing the round a beat later: the
    // round is earned by deliberately NOT casting (Unleash's true-rest
    // covenant, applied to the whole use-charge axis). Re-fires (echoes,
    // salvos) never pass through this press site, so one press resets once.
    if (useCharges) caster.skillChargeBank(inst).timer = 0;

    // A committed BASE press arms the combo chain's first step — and a
    // committed REPEATED STEP (comboSelf, the redirect's hand-off) walks
    // the cursor on from the beat it just played.
    if (def.comboChain?.skills.length) {
      const st = nativeHost.comboCursorOf(caster, inst); // THE HAND'S CURSOR
      st.comboAt = nativeHost.time;
      const next = (st.comboSelf ?? 0) + 1;
      st.comboIdx = next > def.comboChain.skills.length ? 0 : next;
      st.comboSelf = undefined;
    }

    // THE RESOLVED CHANNEL (skill-mode audit, M1): ONE binding for the
    // whole channel block — a spent tree node's ramp/rampMove fold here;
    // unpicked instances get the def's own object back by reference.
    const chan = instanceChannel(inst);
    // RITUAL GROUND (channelPersist): the channel CONVERTS to a cast that
    // PLANTS a channeler at the mark — the held beam persists at the
    // location, independent of the caster (constructs exempt: no nesting).
    if (mode === 'channel' && chan && !caster.construct
      && caster.sheet.get('channelPersist', skillContextTags(def), instanceMods(inst)) > 0) {
      nativeHost.paySkillCost(caster, inst, caster.skillCost(inst));
      caster.facing = angleTo(caster.pos, aim);
      {
let nativeStorage: typeof caster;
let nativeRecord: NonNullable<typeof caster.casting>;
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = caster).casting = nativeRecord = {
        inst: (nativeRecordInstance = inst), mode: 'cast', aim: vec(aim.x, aim.y),
        elapsed: 0, total: Math.max(0.45, caster.skillUseTime(inst) || 0.6),
        held: true, baseMult: 1,
        plantChannel: true,
      };
nativeHost.issueCombatRecord("casting", nativeStorage, nativeRecord, nativeStorage, nativeRecordInstance);
}
      return true;
    }

    // GATHERED CASTING (SupportDef.gather): the socketed gem CONVERTS a
    // bar-cast into a brim GATHER — the long cast becomes a held channel
    // banking its own cast time in a persistent bar (the skill as its own
    // powerbank), fired on the caster's schedule at fill-scaled power.
    // Cast speed still fills the bank; the gem's premium stretches the
    // full-bank time past the honest bar. Instants, channels and sub-0.3s
    // flicks refuse the conversion (nothing worth banking). EVERY field
    // below binds — movement included (the move law reads this same spec:
    // the gather trades the bar's rooting for a slowed channel walk; ruled
    // 2026-08-20, probe_skillmodes THE GATHER'S STRIDE).
    let gather: ChannelSpec | undefined;
    if (mode === 'cast' && !def.concentration && def.useTime >= 0.3) {
      const g = socketSpec(inst, 'gather');
      if (g) {
        gather = {
          interval: 0.4, move: 'slowed', moveFactor: 0.5, windup: 0.2,
          release: { pulses: false },
          brim: {
            fillTime: Math.max(0.5, def.useTime * (g.premium ?? 1.5)),
            decay: g.decay,
            minRelease: g.minRelease ?? 0.15,
            minScale: g.minScale ?? 0.25,
            maxScale: g.maxScale ?? 1,
            curve: g.curve,
          },
        };
      }
    }

    // Channels pay per pulse (inside updateCasting), everything else now.
    if (gather || (mode === 'channel' && chan)) {
      const chSpec = gather ?? chan!;
      const total = Math.max(0.1, chSpec.interval / caster.speedFactor(inst));
      const cc = nativeHost.consumeChargeCost(caster, inst);
      {
let nativeStorage: typeof caster;
let nativeRecord: NonNullable<typeof caster.casting>;
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = caster).casting = nativeRecord = {
        inst: (nativeRecordInstance = inst), mode: 'channel', aim: vec(aim.x, aim.y),
        elapsed: 0,
        total,
        held: true,
        baseMult: cc.mult * roundMult,
        chargesSpent: cc.consumed,
        targetInfo: targetInfo ?? undefined,
        // trackAim:false channels fire their pulses at THIS stamped point
        // forever after — the black hole does not follow the cursor.
        lockedAim: vec(aim.x, aim.y),
        hitSpool: 0,
        // SPOOL-UP: the first pulse arrives after the windup (default one full
        // interval), never on the press frame — tapping a channel yields
        // NOTHING; you have to actually hold the thing.
        channelTime: 0,
        pulseTimer: chSpec.windup !== undefined
          ? Math.max(0, chSpec.windup / caster.speedFactor(inst))
          : total,
        gather,
      };
nativeHost.issueCombatRecord("casting", nativeStorage, nativeRecord, nativeStorage, nativeRecordInstance);
}
      return true;
    }

    const cost = caster.skillCost(inst);
    nativeHost.paySkillCost(caster, inst, cost); // mana, then ES (Thought Siphon), then life
    // THE GAUGE FABRIC (engine/gauge.ts): THE PRESS PAYS — the bank spends
    // beside mana (a use is a use: an interrupted bar still spent its
    // souls) and the lockout arms. Readiness was the gate's business above.
    // The press's POWER (the partial/overflow law) rides into the use as a
    // damage multiplier here and as a count/stack scale at execution.
    const gPower = def.gauge ? gaugeSpend(inst, def.gauge, caster.gaugeEff(inst)!) : 1;
    // The honesty datum for resource-as-damage: constructs' payments are
    // ceremonial (999-mana pools), so their casts carry no paidCost.
    const paid = caster.construct ? undefined : cost;
    // UNLEASH HONESTY: the seal bank's rest window ENDS at the PRESS —
    // stamped here so the cast bar's own runtime never banks its seals.
    (inst.state ??= {}).pressAt = nativeHost.time;
    // THE CLOCK-AT-PRESS LEVER (SkillDef.cooldownAt 'press'): the
    // commitment starts the cooldown — the bar's runtime counts against
    // its own clock, and an interrupted cast still pays it.
    if (def.cooldown > 0 && def.cooldownAt === 'press'
      && !instanceUseCharges(inst)?.magazine) {
      nativeHost.stampSkillCooldown(caster, inst, def.cooldown);
    }
    const cc = nativeHost.consumeChargeCost(caster, inst);
    const baseMult = cc.mult * roundMult * gPower;
    nativeHost.attackSequences.opening(caster, inst, aim, baseMult);

    // CONCENTRATION (the precision cast): the held bar fills only while the
    // cursor rides the QUARRY resolved at press — no quarry, no cast (the
    // targeting spec already refused upstream when nothing qualified).
    // updateCasting owns the focus/break/drain machinery.
    if (def.concentration) {
      if (!targetInfo?.actor) {
        nativeHost.failNote(caster, def.id + ':noquarry', 'no quarry held');
        return false;
      }
      {
let nativeStorage: typeof caster;
let nativeRecord: NonNullable<typeof caster.casting>;
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = caster).casting = nativeRecord = {
        inst: (nativeRecordInstance = inst), mode: 'concentration', aim: vec(aim.x, aim.y),
        elapsed: 0,
        total: Math.max(0.2, def.concentration.time / caster.speedFactor(inst)),
        held: true, baseMult,
        chargesSpent: cc.consumed,
        targetInfo: targetInfo ?? undefined,
        paidCost: paid,
        quarryId: targetInfo.actor.id,
      };
nativeHost.issueCombatRecord("casting", nativeStorage, nativeRecord, nativeStorage, nativeRecordInstance);
}
      return true;
    }

    // Guard: raise the shield and hold it — its health IS the cast state.
    if (mode === 'guard' && def.guard) {
      const maxShield = guardCapacity(caster, inst);
      {
let nativeStorage: typeof caster;
let nativeRecord: NonNullable<typeof caster.casting>;
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = caster).casting = nativeRecord = {
        inst: (nativeRecordInstance = inst), mode, aim: vec(aim.x, aim.y),
        elapsed: 0, total: 1, held: true, baseMult,
        shield: maxShield, maxShield,
        channelTime: 0,
      };
nativeHost.issueCombatRecord("casting", nativeStorage, nativeRecord, nativeStorage, nativeRecordInstance);
}
      // The bash tic is live from the first frame the wall is up.
      nativeHost.refreshGuardBash(caster, caster.casting!);
      nativeHost.guardArts.raised(caster, inst);
      // GRAFTED CARAPACE (SupportDef.shellGraft): the raised stance ALSO
      // wears a directional shell — the shield's blind side, armored.
      // Priced by guardStrength like the shield itself; stripped when the
      // stance drops (release or interrupt — the fromAura removal rule).
      const graft = socketSpec(inst, 'shellGraft');
      if (graft) {
        const gs = caster.sheet.get('guardStrength', skillContextTags(def), instanceMods(inst));
        const gmax = graft.max * gs;
        caster.shellGuard = {
          side: graft.side ?? 'rear', arcDeg: graft.arcDeg ?? 200,
          max: gmax, pool: gmax,
          regenDelay: graft.regenDelay ?? 4,
          regenRate: graft.regenRate ?? gmax / 5,
          lastHitAt: -999, broken: false,
          color: graft.color ?? def.color, shellVisual: graft.shellVisual,
          fromAura: def.id,
        };
      }
      return true;
    }

    if (mode === 'charge' && def.chargeUp) {
      {
let nativeStorage: typeof caster;
let nativeRecord: NonNullable<typeof caster.casting>;
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = caster).casting = nativeRecord = {
        inst: (nativeRecordInstance = inst), mode, aim: vec(aim.x, aim.y),
        elapsed: 0,
        total: Math.max(0.2, def.chargeUp.maxTime
          * caster.sheet.get('effectDuration', skillContextTags(def), instanceMods(inst))),
        held: true, baseMult,
        chargesSpent: cc.consumed,
        targetInfo: targetInfo ?? undefined,
        paidCost: paid,
      };
nativeHost.issueCombatRecord("casting", nativeStorage, nativeRecord, nativeStorage, nativeRecordInstance);
}
      return true;
    }

    // OVERCHARGE (innate or support-grafted): the held cast refills its
    // bar, banking a stage per completed fill. The graft CONVERTS plain,
    // perfect and timed bar-casts — a grafted/innate STRIKE-TIMING
    // discipline survives the conversion as a RELEASE window on the
    // refilling bar (hold for stages, let go on the gold).
    {
      const ocSpec = instanceOvercharge(inst);
      // (Pierced presses skip the conversion — the refilling bar it grows
      // would clobber the commitment the press just pierced.)
      if (ocSpec && !pierced && (mode === 'cast' || mode === 'perfect' || mode === 'timed'
        || mode === 'overcharge')) {
        const tags = skillContextTags(def);
        const extra = instanceMods(inst);
        const timing = instanceStrikeTiming(inst);
        {
let nativeStorage: typeof caster;
let nativeRecord: NonNullable<typeof caster.casting>;
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = caster).casting = nativeRecord = {
          inst: (nativeRecordInstance = inst), mode: 'overcharge', aim: vec(aim.x, aim.y),
          elapsed: 0,
          // The stage bar FLOORS at the skill's real cast time: a slow cast
          // can't be squeezed into a near-instant refill — the bar you hold
          // is at least the bar you'd have cast (cast-speed honors both).
          total: Math.max(0.2,
            Math.max(ocSpec.time, def.useTime) / caster.speedFactor(inst)),
          held: true, baseMult,
          chargesSpent: cc.consumed,
          targetInfo: targetInfo ?? undefined,
          paidCost: paid,
          stage: 0, sinceStage: 999, channelTime: 0,
          indicatorAt: timing?.kind === 'timed' ? rand(0.3, 0.85) : undefined,
          sparkWindow: caster.sheet.get('sparkWindow', tags, extra, ocSpec.window ?? 0),
        };
nativeHost.issueCombatRecord("casting", nativeStorage, nativeRecord, nativeStorage, nativeRecordInstance);
}
        return true;
      }
    }

    // A grafted strike-timing discipline promotes a plain bar cast into
    // the perfect/timed machinery (Snipe's golden window on anything) —
    // except on a pierced press, which owns no bar to hang a window on.
    const timing = instanceStrikeTiming(inst);
    const effMode = mode === 'cast' && timing && !pierced ? timing.kind : mode;

    const castTime = caster.skillUseTime(inst);
    nativeHost.assaults.lock(caster, inst, aim);
    if (effMode === 'cast' && castTime <= 0.001) {
      // THE PRIMED POUR: a true-full pour press BANKS its sip instead of
      // pouring — decided HERE, after every cost is paid, so the press
      // stays a real press while the payload defers (the gate already
      // admitted it through primedPourOpen; a life-cost dent between
      // press and here honestly demotes the bank to an ordinary pour).
      const primed = caster.primedPourOpen(inst);
      // Instant: resolves on press. A stepsFromBank flicker resolves once
      // per BANKED round (movement deliveries stagger into the train).
      const reflexFacing = caster.facing;
      nativeHost.executeSkill(caster, inst, aim, {
        targetInfo: targetInfo ?? undefined, dmgMult: baseMult, paidCost: paid,
        chargesSpent: cc.consumed,
        repeat: bankSteps,
        ventRounds,
        primed: primed || undefined,
      });
      if (pierced) caster.facing = reflexFacing;
      // A REFLEX that pierced paces on its own clock and stamps NO recovery
      // — it must never lengthen the action it slipped through. Hold combos
      // and idle presses keep the classic instant-use lock.
      if (pierced && caster.isReflex(inst)) caster.reflexLock = REFLEX_CFG.lock;
      else caster.useLock = 0.12;
      return true;
    }

    {
let nativeStorage: typeof caster;
let nativeRecord: NonNullable<typeof caster.casting>;
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = caster).casting = nativeRecord = {
      inst: (nativeRecordInstance = inst), mode: effMode, aim: vec(aim.x, aim.y),
      elapsed: 0, total: Math.max(0.2, castTime),
      held: true, baseMult,
      chargesSpent: cc.consumed,
      targetInfo: targetInfo ?? undefined,
      indicatorAt: effMode === 'timed' ? rand(0.3, 0.85) : undefined,
      presses: effMode === 'multitude' ? 1 : undefined,
      paidCost: paid,
      ventRounds,
    };
nativeHost.issueCombatRecord("casting", nativeStorage, nativeRecord, nativeStorage, nativeRecordInstance);
}
    return true;
  }

export function scenePlantSpiritTotem(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, aim: Vec2): void {
    const def = inst.def;
    nativeHost.spawnConstruct(caster, inst, {
      type: 'construct', kind: 'totem',
      range: def.ai?.range ?? 420,
      duration: 8, maxActive: 1, life: 45, placeRange: 90,
    }, aim, inst);
  }

export function sceneCastPress(nativeHost: NativeSceneCombatHost, caster: Actor): void {
    nativeHost.markSeatActed(caster);
    const cs = caster.casting;
    if (!cs) return;
    const frac = cs.total > 0 ? cs.elapsed / cs.total : 0;
    const timing = instanceStrikeTiming(cs.inst);
    if (cs.mode === 'perfect' && !cs.pressUsed) {
      cs.pressUsed = true;
      if (frac >= 0.72) {
        cs.empowered = 1 + (timing?.bonus ?? 0.7);
        nativeHost.flashes.push(timingCueFlash(caster, 'perfect', cs.aim));
        // The made window IS an event — skill expression as a trigger.
        nativeHost.rollTriggers(caster, 'flawless',
          { aim: vec(cs.aim.x, cs.aim.y), sourceInst: cs.inst });
      }
    } else if (cs.mode === 'timed' && !cs.pressUsed) {
      cs.pressUsed = true;
      if (cs.indicatorAt !== undefined && Math.abs(frac - cs.indicatorAt) <= 0.08) {
        cs.empowered = 1 + (timing?.bonus ?? 1.2);
        nativeHost.flashes.push(timingCueFlash(caster, 'flawless', cs.aim));
        nativeHost.rollTriggers(caster, 'flawless',
          { aim: vec(cs.aim.x, cs.aim.y), sourceInst: cs.inst });
      }
    } else if (cs.mode === 'multitude') {
      cs.presses = Math.min(15, (cs.presses ?? 1) + 1);
    }
  }

export function sceneExecuteSkill(nativeHost: NativeSceneCombatHost, 
    caster: Actor, inst: SkillInstance, aim: Vec2,
    opts: {
      targetInfo?: ResolvedTarget; dmgMult?: number; aoeMult?: number;
      repeat?: number; noCooldown?: boolean; keepFacing?: boolean;
      /** Set on scheduled repeats so they don't schedule more repeats. */
      noRepeat?: boolean;
      /** An authored component of a paid cast owns its support repeat train,
       * fissures, echoes and follow-throughs. It does not repay resources or
       * replay the parent's cast events. Generated descendants omit this. */
      componentUse?: boolean;
      /** Set on follow-up fires so a payload never chains its own. */
      noFollowUp?: boolean;
      /** Set on fuse-sweep resumes so a banked resolution never re-banks. */
      fromFuse?: boolean;
      /** Set on scheduled SEQUENCE steps: the absolute strike bearing, baked
       *  at cast time (skips the aim transform — the figure is locked). */
      strikeAngle?: number;
      /** Extra projectiles wound up by channel spooling. */
      bonusProjectiles?: number;
      /** Cone/melee ARC multiplier from a channel's rampArc — the converging
       *  ray squeezing its wedge (aoeMult stretches reach; this bends width). */
      arcMult?: number;
      /** What the press ACTUALLY PAID (resource-as-damage). Absent = unpaid
       *  execution (echo riders, totems, constructs): zero cost bonus. */
      paidCost?: { mana: number; life: number };
      /** Combo charges the press consumed — perCharge effects scale by it. */
      chargesSpent?: number;
      /** MOVEMENT-speed factor from a charge release (ChargeSpec.speedAtFull:
       *  Immolation Rush's laden comet travels SLOWER, distance held). */
      speedMult?: number;
      /** THE PRIMED POUR (pourPrime): the press is REAL — mana, charges
       *  and the clock all pay — but the pool stood at true full, so the
       *  self-payload BANKS instead of applying (released whole by the
       *  first life-damage event; see releasePrimedPours). */
      primed?: boolean;
      /** THE VENT PRESS (useCharges.ventAll — THE SCALD KIT K2): rounds the
       *  press spent from its bank — COUNT deliveries (storm strikes,
       *  projectile shots) add them to their count; every other delivery
       *  resolves that many EXTRA times through the multitude train. */
      ventRounds?: number;
    } = {},
  ): boolean {
    // Replenishment is a birth clock, never an echo/trigger/proc cast.
    if (replenishingDelivery(inst)) return false;
    inst = nativeHost.challenges.prepare(caster, inst, !opts.noRepeat && !opts.noCooldown && !opts.fromFuse);
    inst = nativeHost.attackSequences.prepare(caster, inst, aim, opts.dmgMult ?? 1);
    const def = inst.def;
    const cosmeticPaint = cosmeticSkillPaint(nativeHost, caster, def.id);
    const cosmeticColor = cosmeticPaint.color ?? def.color;
    const extra = instanceMods(inst);
    SIM_TAP.current?.onCast?.(caster, inst, !!opts.noRepeat);
    // THE TOLL (SkillDef.selfCleanse): firing rings a portion of the
    // caster's OWN afflictions off — once per press (scheduled repeats
    // re-fire the delivery, never the absolution), and hit-independent:
    // an empty field still buys the relief.
    if (def.selfCleanse && !opts.noRepeat) {
      nativeHost.ringAfflictions(caster, def.selfCleanse.stacksPortion);
    }
    // Tags granted by socketed supports count here too: a Dive-Bombed
    // dash IS an aoe skill for every stat query this use makes.
    const tags = skillContextTags(inst, grantedTags(inst));
    if (caster === nativeHost.player && !opts.noRepeat && !opts.noCooldown && !opts.fromFuse
      && (tags.has('spell') || tags.has('warcry')) && nativeHost.metaProgressionActive()
      && nativeHost.actors.some(a => !a.dead && nativeHost.deedEnemy(a) && sameStory(a, caster) && dist(a.pos, caster.pos) <= DEED_CFG.combatRadius)) {
      nativeHost.recordDeed({ kind: 'cast', tags: [...tags], keys: [def.id] });
    }
    let useMult = opts.dmgMult ?? 1;
    // THE GAUGE's POWER (engine/gauge.ts): the press stamped what this use
    // is worth — damage already rode in through dmgMult; counts (shots,
    // strikes, summons) and powerStacks buffs scale here. 1 for every
    // gauge-less skill by construction.
    const gPow = def.gauge ? (inst.state?.gaugePower ?? 1) : 1;
    let targetInfo = opts.targetInfo ?? null;
    // THE GRAB BOUNDARY, melee half (engine/lite.ts): a grab SWING with no
    // full body in reach promotes the nearest opposing pool row first, so
    // the hand closes on something real — the swing alone would only carve
    // it. Lives HERE (not useSkill) so every execution path — player press,
    // monster AI, echo repeats — crosses the boundary.
    if (nativeHost.lite.liveCount && def.delivery.type === 'melee'
      && def.effects.some(f => f.type === 'grabSeize')) {
      const reach = caster.radius + (def.delivery.range ?? 60) + 24;
      let anyClose = false;
      for (const e of nativeHost.enemiesOf(caster)) {
        if (dist(caster.pos, e.pos) - e.radius <= reach) { anyClose = true; break; }
      }
      if (!anyClose) {
        nativeHost.litePromoteNearest(caster.pos,
          { within: reach, max: 1, opposing: caster.team, rank: aim, story: caster.tier });
      }
    }
    // CROWD EMPOWERMENT (SkillDef.empower — the warcry-power shape): tally
    // the weighted enemies in reach (a boss counts for six men) and let
    // the POWER score feed the use's damage and/or a stacked buff.
    if (def.empower && !opts.noRepeat) {
      const w = DEFENSE_CFG.empower.weights;
      let power = 0;
      for (const e of nativeHost.enemiesOf(caster)) {
        if (e.dead || e.untargetable) continue;
        if (dist(caster.pos, e.pos) > def.empower.radius) continue;
        power += e.defId && MONSTERS[e.defId]?.boss ? w.boss
          : e.rarity === 'crowned' ? w.crowned
          : e.rarity === 'champion' ? w.champion
          : e.rarity === 'rare' ? w.rare
          : e.rarity === 'magic' ? w.magic : w.normal;
      }
      if (power > 0) {
        if (def.empower.dmgPerPower) useMult *= 1 + def.empower.dmgPerPower * power;
        if (def.empower.buffPerPower) {
          caster.addBuff({ ...def.empower.buffPerPower, stacksOnApply: power },
            caster.sheet.get('effectDuration', tags, extra));
        }
        nativeHost.text(vec(caster.pos.x, caster.pos.y - 22), `power ${power}`, def.color, 11);
      }
    }
    // THE ULTIMATE MARK (SkillDef.ultimate → engine/ultimates.ts): the
    // super art's EYECATCH — the pane, and (solo) the held beat — fires as
    // the cast commits, for ANY caster through this one pipeline. Scheduled
    // repeats never re-flash (the chrono law's sibling, below).
    if (def.ultimate && !opts.noRepeat) nativeHost.ultimateFlash(caster, def);
    // CHRONOMANCY (SkillDef.chrono → engine/timeflow.ts): the cast bends
    // TIME ITSELF — a timeflow hold exempting the caster's chosen circle,
    // its span riding effectDuration investment like any other duration.
    // One hold id per caster+skill, so a re-cast refreshes rather than
    // stacking; scheduled repeats/sequence steps never re-mint it.
    if (def.chrono && !opts.noRepeat) {
      nativeHost.castChrono(caster, def.chrono, `chrono:${caster.id}:${def.id}`,
        def.chrono.duration * caster.sheet.get('effectDuration', tags, extra),
        def.name);
    }
    // SACRIFICE (support graft): the cast CONSUMES your nearest minion —
    // its remaining life becomes MORE damage on this use. The altar always
    // takes; a flock-less cast just casts.
    {
      const sac = socketSpec(inst, 'sacrifice');
      if (sac && !opts.noRepeat) {
        let pick2: Actor | null = null;
        let best = sac.radius;
        for (const m of nativeHost.actors) {
          if (m.owner !== caster || m.dead || m.construct) continue;
          const dd = dist(caster.pos, m.pos);
          if (dd <= best) { best = dd; pick2 = m; }
        }
        if (pick2) {
          useMult *= 1 + pick2.life * sac.dmgPerLife;
          nativeHost.kill(pick2, true);
          const feedingCue = pick2.dead ? feedingCueFlash(pick2.pos, caster, def.feedingCue, 'ritual', pick2.tier, pick2.radius) : undefined;
          if (feedingCue) nativeHost.flashes.push(feedingCue);
          if (pick2.dead) nativeHost.showSkillArrival(caster, inst, pick2.pos, pick2.radius + 12, pick2.tier, 'sacrifice');
        }
      }
    }
    // MOVEMENT AUTO-TARGETING (Closing Fang / the Closing Instinct graft):
    // a resolved enemy REDIRECTS the movement itself — the lunge, blink or
    // leap re-aims at the prey's LIVE position, not the fumbled cursor.
    if (targetInfo?.actor && !targetInfo.actor.dead
      && (def.delivery.type === 'dash' || def.delivery.type === 'blink'
        || def.delivery.type === 'leap' || def.delivery.type === 'carom')) {
      aim = vec(targetInfo.actor.pos.x, targetInfo.actor.pos.y);
    }
    if (!opts.keepFacing) caster.facing = angleTo(caster.pos, aim);

    // Revalidate what was resolved at press time (the cast took a moment).
    if (targetInfo?.actor && targetInfo.actor.dead) {
      nativeHost.failNote(caster, def.id + ':lost', 'target lost');
      return false;
    }
    if (targetInfo?.corpse && !nativeHost.corpses.includes(targetInfo.corpse)) {
      // The body is gone — rotted mid-gesture, or eaten by an earlier beat
      // of an echo train. Corpse casts RE-SEEK at the mark (so each echo
      // eats its own wagon-load); only a truly bare field refuses the cast.
      const fresh = nativeHost.resolveTargeting(caster, inst, aim);
      if (fresh?.corpse) {
        targetInfo = fresh;
      } else {
        nativeHost.failNote(caster, def.id + ':lost', 'corpse lost');
        return false;
      }
    }
    // A SECONDARY execution (echo beat, figure step, hatched payload) arrives
    // with no find of its own — a corpse skill's beat SEEKS fresh at its own
    // aim, so each echo eats (and is fueled by) its own load off the pile. A
    // bare field refuses the beat, exactly as it would refuse the press —
    // no free unfueled novas from a skill whose whole grammar is the fuel.
    if (!targetInfo && !instanceCurseField(inst)
      && instanceTargeting(inst)?.target === 'corpse') {
      targetInfo = nativeHost.resolveTargeting(caster, inst, aim);
      if (!targetInfo) {
        nativeHost.failNote(caster, def.id + ':lost', 'corpse lost');
        return false;
      }
    }

    // DAMAGE-POOL release (DamagePoolSpec): 'vent' toggles the leaking aura,
    // 'burst' spends the whole bank at once through the shared typed blast.
    // Pool skills resolve entirely here — their delivery is ceremonial.
    if (def.pool) {
      const banked = caster.pools.get(def.pool.id) ?? 0;
      const rel = def.pool.release;
      if (rel.mode === 'vent') {
        if (caster.venting.has(def.pool.id)) {
          caster.venting.delete(def.pool.id);
        } else if (banked > 0) {
          caster.venting.add(def.pool.id);
          nativeHost.showSelfRelease(caster, inst);
          // poolCues follows this held flag and its real bank/footprint.
        }
      } else {
        caster.pools.set(def.pool.id, 0);
        const radius = rel.radius * caster.sheet.get('aoeRadius', tags, extra);
        nativeHost.burstDamage(vec(caster.pos.x, caster.pos.y), radius,
          banked * (rel.ratio ?? 1), def.pool.damageType, cosmeticColor, caster.team, caster.tier, undefined, undefined,
          banked > 0 ? skillSelfVoice(def.id, 'burst') : undefined);
      }
      return true;
    }

    // INVOCATION (SkillDef.invokes): consume the banked rune sequence —
    // combination-and-order picks the payload from the registry, the LAST
    // rune sets its damage type (an instance-local full conversion riding
    // the one conversion path), and every rune burned is MORE.
    if (def.invokes) {
      const runes = caster.runes;
      const rule = resolveInvocation(runes);
      if (!rule || !SKILLS[rule.skillId]) {
        nativeHost.failNote(caster, def.id + ':norunes', 'no runes woven');
        return false;
      }
      const count = runes.length;
      const last = runes[runes.length - 1] as RuneId;
      caster.runes = [];
      nativeHost.showSelfRelease(caster, inst);
      const payload = makeInvocationPayload(inst, SKILLS[rule.skillId], last);
      noteProcCue(caster, rule.releaseCue === false ? false : {
        profile: 'rune', color: RUNE_INFO[last]?.color ?? def.color, ...rule.releaseCue,
      }, 'invoke', rule.id, count);
      nativeHost.executeSkill(caster, payload, aim, {
        dmgMult: (1 + (instanceInvocation(inst)?.damagePerRune ?? rule.dmgPerRune ?? 0.15) * count) * useMult,
        noCooldown: true, noRepeat: true,
      });
      return true;
    }

    // Target-BOND tethers: a targeted skill may string a band between the
    // caster and whoever it resolved (Lifeline's healing bond, Witchfire
    // Leash's burning one). Re-casting the same pair refreshes.
    if (targetInfo?.actor) {
      for (const ts of instanceTethers(inst)) {
        if (ts.link === 'target') nativeHost.addTether(caster, targetInfo.actor, ts, inst, caster);
      }
    }

    // AIM TRANSFORMS (AimSpec — skill-innate or support-grafted): a random
    // bearing inside a locked sector, or a PLAYED SEQUENCE of bearings.
    // Scheduled steps arrive with their absolute bearing pre-baked; repeats
    // (Multistrike) arrive fresh and replay the whole figure.
    if (opts.strikeAngle !== undefined) {
      const reach = Math.max(48, dist(caster.pos, aim));
      aim = vec(caster.pos.x + Math.cos(opts.strikeAngle) * reach,
        caster.pos.y + Math.sin(opts.strikeAngle) * reach);
      caster.facing = opts.strikeAngle;
    } else {
      const aimSpec = instanceAim(inst);
      if (aimSpec?.sequence?.steps.length) {
        const seq = aimSpec.sequence;
        const baseAng = angleTo(caster.pos, aim);
        const reach = Math.max(48, dist(caster.pos, aim));
        // Attack/cast speed quickens the figure's beat.
        const pause = Math.max(0.05, seq.pause / caster.speedFactor(inst));
        for (let i = 1; i < seq.steps.length; i++) {
          {
let nativeStorage: typeof nativeHost.pendingSteps;
let nativeRecord: typeof nativeHost.pendingSteps[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingSteps).push(nativeRecord = {
            caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), aim: vec(aim.x, aim.y),
            angle: baseAng + seq.steps[i] * Math.PI / 180,
            timer: pause * i,
            dmgMult: useMult, aoeMult: opts.aoeMult ?? 1,
            paidCost: opts.paidCost,
          });
nativeHost.issueCombatRecord("pendingSteps", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        }
        const a0 = baseAng + seq.steps[0] * Math.PI / 180;
        aim = vec(caster.pos.x + Math.cos(a0) * reach, caster.pos.y + Math.sin(a0) * reach);
        caster.facing = a0;
      } else if (aimSpec?.random) {
        const baseAng = angleTo(caster.pos, aim);
        const reach = Math.max(48, dist(caster.pos, aim));
        const spread = Math.min(Math.PI * 2,
          (aimSpec.random.spreadDeg * Math.PI / 180)
          * caster.sheet.get('randomArc', tags, extra));
        const ang = baseAng + (aimSpec.random.offsetDeg ?? 0) * Math.PI / 180
          + rand(-spread / 2, spread / 2);
        aim = vec(caster.pos.x + Math.cos(ang) * reach, caster.pos.y + Math.sin(ang) * reach);
        caster.facing = ang;
      }
    }

    // THE VENT PRESS (useCharges.ventAll — THE SCALD KIT K2): the rounds the
    // press spent GROW the cast. COUNT deliveries fold them into their own
    // count below (storm strikes, projectile shots — more columns, more
    // bolts); every other delivery resolves that many EXTRA times through
    // the multitude train (the stepsFromBank law, spending all).
    const ventRounds = opts.ventRounds ?? 0;
    const ventCounts = def.delivery.type === 'storm' || def.delivery.type === 'projectile';
    // Multitude strikes: one full resolution per press.
    const repeats = Math.max(1, opts.repeat ?? 1) + (ventCounts ? 0 : ventRounds);
    if (repeats > 1) {
      // MOVEMENT MULTITUDE (Flickerstep): presses become a staggered TRAIN,
      // not a synchronous loop — N same-frame blinks collapse into one jump
      // (aim never moves between them). Each beat re-aims via retarget, so
      // the banked presses spend themselves as a flicker of knives.
      const dv = def.delivery.type;
      if (dv === 'blink' || dv === 'dash' || dv === 'leap' || dv === 'carom') {
        {
let nativeStorage: typeof nativeHost.pendingRepeats;
let nativeRecord: typeof nativeHost.pendingRepeats[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingRepeats).push(nativeRecord = {
          caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), aim: vec(aim.x, aim.y),
          n: repeats - 1, k: 1, timer: 0.16, interval: 0.16,
          dmgMult: useMult, aoeMult: opts.aoeMult ?? 1,
          scaleStep: caster.sheet.get('repeatScale', tags, extra),
          retarget: caster.sheet.get('repeatRetarget', tags, extra) > 0,
        });
nativeHost.issueCombatRecord("pendingRepeats", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        return nativeHost.executeSkill(caster, inst, aim, { ...opts, repeat: 1, ventRounds: ventCounts ? opts.ventRounds : 0 });
      }
      let ok = true;
      for (let i = 0; i < repeats; i++) {
        ok = nativeHost.executeSkill(caster, inst, aim,
          { ...opts, repeat: 1, noCooldown: i > 0 || opts.noCooldown, ventRounds: ventCounts ? opts.ventRounds : 0 }) && ok;
      }
      return ok;
    }

    // Resolve target-derived payloads, then consume what should be consumed.
    let flatBonus: Partial<Record<DamageType, number>> | undefined;
    /** Bodies past the first this use consumed (THE WAGON) — widens the
     *  footprint (aoeScale below) and stretches effect durations (durScale),
     *  both dialed by CORPSE_CFG.batch. */
    let corpseFeast = 0;
    const targetSpec = instanceTargeting(inst);
    if (targetInfo && targetSpec) {
      const t = targetSpec;
      if (targetInfo.corpse) {
        // The whole gathered haul — survivors only (a body can rot, or be
        // eaten by an earlier echo beat, between the press and the landing).
        const feast = (targetInfo.corpses ?? [targetInfo.corpse])
          .filter(c => nativeHost.corpses.includes(c));
        if (t.corpseLifeDamage) {
          let fuel = 0;
          for (const c of feast) fuel += c.maxLife * t.corpseLifeDamage;
          flatBonus = { fire: fuel };
        }
        if (t.consumesCorpse !== false && def.delivery.type !== 'summon') {
          for (const c of feast) nativeHost.withCombatRecord("corpses", c, () => nativeHost.removeCorpse(c));
          for (const c of feast) nativeHost.showSkillArrival(caster, inst, c.pos, 28, c.tier ?? nativeHost.spoilStoryAt(c.pos), true);
          corpseFeast = Math.max(0, feast.length - 1);
          // DEVOUR (corpseLifeRestore — Corpse Feast): each body eaten
          // returns a share of its life force, through the one restore path.
          if (t.corpseLifeRestore) {
            const rr = t.corpseLifeRestore;
            let meat = 0;
            for (const c of feast) meat += c.maxLife;
            if (rr.life) nativeHost.applyRestore(caster, { resource: 'life', amount: meat * rr.life }, { tags: def.tags, feedingCue: def.feedingCue });
            if (rr.mana) nativeHost.applyRestore(caster, { resource: 'mana', amount: meat * rr.mana }, { tags: def.tags, feedingCue: def.feedingCue });
            for (const corpse of feast) {
              const feedingCue = feedingCueFlash(corpse.pos, caster, def.feedingCue, 'flesh', corpse.tier);
              if (feedingCue) nativeHost.flashes.push(feedingCue);
            }
          }
          // HIVEBORN (corpseSpawn graft): the bodies eaten by this offering
          // crawl back out changed — one crawler per corpse consumed.
          nativeHost.corpseSpawn(caster, inst, targetInfo.corpse.pos, feast.length);
        }
      }
      if (targetInfo.actor && t.requiresStatus && t.consumesStatus) {
        // Consume the status(es): remaining damage lands NOW (Eviscerate).
        const reqs = statusReqs(t.requiresStatus)!;
        let payload = 0;
        for (let i = targetInfo.actor.statuses.length - 1; i >= 0; i--) {
          const s = targetInfo.actor.statuses[i];
          if (!reqs.includes(s.id)) continue;
          payload += s.dps * s.stacks * Math.max(0, s.remaining);
          targetInfo.actor.statuses.splice(i, 1);
          targetInfo.actor.sheet.removeSource('status:' + s.id);
        }
        if (payload > 0) {
          flatBonus = { ...(flatBonus ?? {}), physical: (flatBonus?.physical ?? 0) + payload };
        }
      }
      if (t.drainsTargetLife) {
        const victim = targetInfo.actor ?? (targetInfo.self ? caster : null);
        if (victim) victim.life = Math.max(1, victim.life - victim.life * t.drainsTargetLife);
      }
    }
    // POISE REAP (the executioner's license): vs a poise-BROKEN target the
    // hit carries the cleaved bar itself — mult × the victim's max poise as
    // flat physical, folded into the ordinary roll (crits, conversions and
    // riders all apply). Keys on the LIVE broken bar, so the usability
    // window (targeting requiresStatus 'sundered') and the payoff can be
    // tuned independently — and enemies reap broken players the same way.
    if (def.poiseReap && targetInfo?.actor?.poiseBroken) {
      const reap = targetInfo.actor.maxPoise() * def.poiseReap.mult;
      if (reap > 0) {
        flatBonus = { ...(flatBonus ?? {}), physical: (flatBonus?.physical ?? 0) + reap };
      }
    }
    // RESOURCE-AS-DAMAGE: what the press ACTUALLY PAID returns as flat
    // damage of the skill's OWN types (pro-rata over baseDamage, so it
    // feels like more of the skill and converts like everything typed),
    // scaled by addedEffectiveness — the multi-hit valve. Unpaid executions
    // (echo riders, totems) carry no paidCost and earn nothing.
    if (opts.paidCost) {
      const perMana = caster.sheet.get('costDamage_mana', tags, extra);
      const perLife = caster.sheet.get('costDamage_life', tags, extra);
      const total = (opts.paidCost.mana * perMana + opts.paidCost.life * perLife)
        * (def.addedEffectiveness ?? 1);
      if (total > 0) {
        flatBonus = { ...(flatBonus ?? {}) };
        const entries = Object.entries(def.baseDamage ?? {}) as [DamageType, [number, number]][];
        let mass = 0;
        for (const [, r] of entries) mass += (r[0] + r[1]) / 2;
        if (mass > 0) {
          for (const [k, r] of entries) {
            flatBonus[k] = (flatBonus[k] ?? 0) + total * ((r[0] + r[1]) / 2 / mass);
          }
        } else {
          flatBonus.physical = (flatBonus.physical ?? 0) + total;
        }
      }
    }
    /** Point-based deliveries center on the resolved target when present. */
    const origin = targetInfo?.pos ?? caster.pos;
    // The addedCooldown LEVY (Austerity / Apotheosis): supports impose a
    // long clock in trade — flat seconds joining the base, still divided
    // by cooldownRecovery (an imposed cooldown stays a reducible one).
    // MAGAZINE skills never stamp here: their cooldown IS the reload cycle,
    // stamped by the press that spends the last round (useSkill) — a
    // mid-mag use must never touch the clock. cooldownAt 'press' skills
    // stamped at the press already (the clock-at lever).
    if (!opts.noCooldown && !instanceUseCharges(inst)?.magazine
      && def.cooldownAt !== 'press') {
      nativeHost.stampSkillCooldown(caster, inst, def.cooldown);
    }
    nativeHost.guardArts.cast(caster, inst);

    // THE PRIMED POUR (pourPrime): everything above paid — mana at press,
    // charges at press, the clock just now ("a use is a use") — and here
    // the payload DEFERS: push the bank entry, apply nothing. The first
    // life-damage event replays the def's whole self-payload fresh
    // (releasePrimedPours: % of the max at RELEASE, a fresh lucky roll,
    // the quaffing buff starting with the live pour). Prime outranks
    // thirstless at true full by her ruling — the press that could bank
    // banks, it never spills.
    if (opts.primed) {
      caster.primedPours.push({ skillId: def.id, chargesSpent: opts.chargesSpent ?? 0, aim: vec(aim.x, aim.y) });
      const payloadCues = payloadTransition(caster, inst, 'prime');
      if (payloadCues) nativeHost.flashes.push(payloadCues);
      return true;
    }

    // THE SKILL-MODE SEAM (M0): the cast's delivery reads through the
    // resolved view — a spent tree node's typed overrides fold in; an
    // unpicked instance gets the def's own object back, byte-identical by
    // construction. ONE binding covers every delivery read below.
    const d = instanceDelivery(inst);
    let aoeScale = caster.sheet.get('aoeRadius', tags, extra) * (opts.aoeMult ?? 1);
    // PER-CAST VARIANCE (VarianceSpec.aoe): the whole footprint rolls
    // ONCE per cast — impact, linger, envelope anchors and cascades all
    // breathe together — and channel beats pass through here per pulse,
    // so each detonation wears its own size.
    // A multi-corpse feast casts a WIDER shadow: each body past the first
    // grows the footprint — the wagon's "larger explosion", data-dialed in
    // CORPSE_CFG.batch (durations stretch the same way, below).
    if (corpseFeast > 0) aoeScale *= 1 + CORPSE_CFG.batch.aoePerExtra * corpseFeast;
    {
      const vAoe = instanceVariance(inst)?.aoe;
      if (vAoe) aoeScale *= rand(vAoe[0], vAoe[1]);
    }
    /** One WIDTH lever for every arc geometry: the swingArc stat (Wild
     *  Abandon widens, Measured Blade tightens) × any channel rampArc
     *  convergence — melee swings, cone wedges, and crescent zones agree. */
    const arcScale = caster.sheet.get('swingArc', tags, extra) * (opts.arcMult ?? 1);
    /** Where a No Man's Land lingering field should settle, if anywhere.
     *  Every delivery that HAS an area is expected to report one — a
     *  support grafting onto "the skill's area" must never silently no-op
     *  because the delivery kind forgot to say where its area was. */
    let fieldAt: Vec2 | null = null;

    // MELEE FISSURE LASH (SupportDef.meleeFissure — Faultfinder): the blow
    // has a chance to PROJECT a crack out along the strike bearing. The
    // lash is laid through the HOST instance, so the host's OTHER fissure
    // gems (volatility, arming, warps, recloses) all ride the tear — and
    // fissureBranches forks it. Primary uses only: repeats, echoes and
    // emitted payloads never roll (opts.noRepeat).
    {
      const lash = socketSpec(inst, 'meleeFissure');
      if (lash && (!opts.noRepeat || opts.componentUse) && chance(lash.chance)) {
        const lashD: GroundDelivery = {
          type: 'ground', radius: lash.radius, castRange: 0,
          lingerDuration: lash.linger, tickInterval: lash.tickInterval ?? 0.5,
          fissure: { length: lash.length, speed: lash.speed, close: lash.close },
        };
        nativeHost.layFissure(caster, inst, vec(caster.pos.x, caster.pos.y), caster.facing,
          lashD, useMult * lash.damageScale, flatBonus,
          Math.round(caster.sheet.get('fissureBranches', tags, extra)));
      }
    }

    // (Spirit Totem interception now happens in useSkill, so it covers
    // guard stances, channels and charges too.)

    // CURSE → FIELD (the Miasma family): the cast stops being a cast — the
    // curse becomes a FIELD whose ticks run the full hit pipeline (damage
    // at a scale, statuses, procs, ruptures: everything the curse IS).
    // 'follow' wears it as a toggled aura, reserving mana while it burns;
    // 'ground' plants a long-lived patch at the cursor — recasting
    // relocates the one patch.
    {
      const cf = instanceCurseField(inst);
      if (cf && tags.has('curse')) {
        const cfRadius = cf.radius * aoeScale;
        const cfTick = cf.tickInterval ?? 0.7;
        const cfMult = (cf.damageScale ?? 0.5) * useMult;
        if (cf.mode === 'follow') {
          const reserve = (cf.reservePct ?? 0.25) * caster.maxMana();
          if (caster.reservedMana + reserve > caster.maxMana()) {
            nativeHost.failNote(caster, def.id + ':reserve', 'cannot sustain');
            return false;
          }
          caster.reservedMana += reserve;
          caster.mana = Math.min(caster.mana, caster.availableMaxMana());
          {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
            pos: vec(caster.pos.x, caster.pos.y), radius: cfRadius,
            caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: cosmeticColor,
            delay: 0, exploded: true,
            linger: 1, tickInterval: cfTick, tickTimer: 0,
            shape: 0, facing: caster.facing,
            dmgMult: cfMult, depth: 1,
            follow: true, toggled: true, reserved: reserve,
            madden: nativeHost.maddenBankOf(inst),
            flatBonus,
          });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        } else {
          for (let zi = nativeHost.zones.length - 1; zi >= 0; zi--) {
            const z = nativeHost.zones[zi];
            if (z.caster === caster && z.inst.def.id === def.id) {
              nativeHost.expireZone(z);
              nativeHost.zones.splice(zi, 1);
            }
          }
          const reach = instanceTargeting(inst)?.castRange ?? 460;
          const dd = Math.min(dist(caster.pos, aim), reach);
          const at = nativeHost.clampPos(vec(
            caster.pos.x + Math.cos(caster.facing) * dd,
            caster.pos.y + Math.sin(caster.facing) * dd), 10);
          {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
            pos: at, radius: cfRadius,
            caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: cosmeticColor,
            delay: 0, exploded: true,
            linger: (cf.duration ?? 10) * caster.sheet.get('effectDuration', tags, extra),
            tickInterval: cfTick, tickTimer: 0,
            shape: 0, facing: caster.facing,
            dmgMult: cfMult, depth: 1,
            // The relocated patch keeps the skill's bank (one bank per skill).
            madden: nativeHost.maddenBankOf(inst),
            flatBonus,
          });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
          fieldAt = at;
        }
        const fieldCueZone = nativeHost.zones[nativeHost.zones.length - 1];
        if (def.fieldCue !== false) {
          fieldCueZone.fieldCue = def.fieldCue ?? {};
          fieldCueZone.tier = caster.tier ?? 0;
          nativeHost.flashes.push({ ...combatCueFlash(fieldCueZone.pos, fieldCueZone.fieldCue.form ?? 'field_form', fieldCueZone.radius, 0, def.fieldCue?.color ?? cosmeticColor), recoveryCueTier: fieldCueZone.tier });
        }
        return true;
      }
    }

    if (cosmeticPaint.motif) nativeHost.flashes.push({
      pos: { ...caster.pos }, radius: caster.radius * COSMETIC_CFG.cast.radiusScale, color: cosmeticColor,
      life: COSMETIC_CFG.cast.lifetime, maxLife: COSMETIC_CFG.cast.lifetime, cosmeticMotif: cosmeticPaint.motif,
    });
    switch (d.type) {
      case 'projectile': {
        let count = rollCount(d.count, Math.round(caster.sheet.get('projectileCount', tags, extra)))
          + (opts.bonusProjectiles ?? 0)
          // THE VENT PRESS's spent rounds (useCharges.ventAll): more shots.
          + ventRounds
          // Charge-fed volleys (Gyre Hurl): every charge burned is a blade.
          + Math.round((instanceChargeCost(inst)?.projectilesPerCharge ?? 0) * (opts.chargesSpent ?? 0))
          // A wagon-fed corpse volley (Volatile Cinders): every extra body
          // eaten is one more flight — the pile rises together.
          + corpseFeast * CORPSE_CFG.batch.projectilesPerExtra;
        if (gPow !== 1) count = Math.max(1, Math.round(count * gPow));
        // A rolled chance to fire ONE more — the random counterpart to the
        // flat projectileCount. Flows through both the nova and spread paths.
        const projChance = caster.sheet.get('projectileCountChance', tags, extra);
        if (projChance > 0 && chance(projChance)) count += 1;
        // Fewer-projectile gems (Pinpoint) can push the roll negative —
        // a volley always keeps its one focused shot.
        count = Math.max(1, count);
        // CAROMS: presses PLANT anchors at the cursor; the final press
        // releases the volley, which shuttles anchor-to-anchor for its
        // whole flight (patrol + rehit = the ping-pong killing line).
        // KINDRED CAROMS (2026-07-22): projBounce deepens the NATIVE knob
        // — a ricochet gem on a carom volley plants MORE anchors (a longer
        // killing line), and the patrol claims the stat whole: the shuttle
        // never wall-bounces on top (see spawnProjectile's bounce read).
        const caromCap = caromCapacity(caster, inst);
        if (d.caroms?.hang) {
          // HANGING VOLLEY: presses hang PASSIVE ETHEREAL ARROWS (embed
          // constructs — visible, waiting) instead of bare anchors. A full
          // set ARMS; prey straying near ANY arrow — or this re-press —
          // COLLAPSES them into the patrol volley.
          const armedIdx = nativeHost.pendingAmbushes.findIndex(am =>
            am.caster === caster && am.inst.def.id === def.id);
          if (armedIdx !== -1) {
            nativeHost.triggerAmbush(armedIdx, useMult, flatBonus);
            break;
          }
          const arrow = nativeHost.spawnConstruct(caster, inst, {
            type: 'construct', kind: 'embed',
            range: 0, duration: d.caroms.hang.duration ?? 24,
            maxActive: caromCap, invulnerable: true,
            placeRange: 9999,
          }, aim, undefined, nativeHost.clampPos(vec(aim.x, aim.y), 10));
          const arrows = nativeHost.minionsOfSkill(caster, def.id)
            .filter(a => a.construct?.kind === 'embed');
          if (arrow && arrows.length >= caromCap) {
            {
let nativeStorage: typeof nativeHost.pendingAmbushes;
let nativeRecord: typeof nativeHost.pendingAmbushes[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingAmbushes).push(nativeRecord = {
              caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst),
              points: arrows.map(a2 => vec(a2.pos.x, a2.pos.y)),
              arrowIds: arrows.map(a2 => a2.id),
              triggerRadius: d.caroms.hang.triggerRadius ?? 90,
              deadline: nativeHost.time + (d.caroms.hang.duration ?? 24),
            });
nativeHost.issueCombatRecord("pendingAmbushes", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
            // payloadCueRows draws the now-armed arrows and true trigger reach.
          }
          fieldAt = vec(aim.x, aim.y);
          break;
        }
        if (d.caroms) {
          const st = (inst.state ??= {});
          const stale = st.anchorsAt !== undefined
            && nativeHost.time - st.anchorsAt > d.caroms.window;
          if (!st.anchors || stale) st.anchors = [];
          st.anchorsAt = nativeHost.time;
          const anchorAt = nativeHost.clampPos(vec(aim.x, aim.y), 10);
          st.anchors.push({ x: anchorAt.x, y: anchorAt.y });
          nativeHost.flashes.push({ pos: vec(anchorAt.x, anchorAt.y), radius: 16, color: cosmeticColor, life: 0.35, maxLife: 0.35 });
          if (st.anchors.length < caromCap) {
            // payloadCueRows retains the placed point and remaining window.
            break;
          }
          const pts = st.anchors.map(a2 => vec(a2.x, a2.y));
          st.anchors = [];
          for (let i = 0; i < count; i++) {
            nativeHost.spawnProjectile(caster, inst, vec(pts[0].x, pts[0].y),
              angleTo(pts[0], pts[1 % pts.length]),
              { mult: useMult, flat: flatBonus, patrol: pts });
          }
          fieldAt = vec(pts[0].x, pts[0].y);
          break;
        }
        // CURSOR ORIGIN (delivery data or the castAtCursor stat — Displaced
        // Conjuring): the volley MATERIALIZES at the aim point (clamped to
        // originRange, slid out of walls) and flies onward along the cast
        // bearing — the air itself turns hostile where you point.
        let origin = caster.pos;
        if (d.origin === 'cursor' || caster.sheet.get('castAtCursor', tags, extra) > 0) {
          const reach = Math.min(dist(caster.pos, aim), d.originRange ?? 420);
          const ang = angleTo(caster.pos, aim);
          origin = nativeHost.clampPos(vec(
            caster.pos.x + Math.cos(ang) * reach,
            caster.pos.y + Math.sin(ang) * reach), d.radius);
        }
        // Nova Release: extra projectiles, and the whole volley rings out
        // in a full circle around the origin instead of toward the aim.
        // (It outranks the firing styles below — a ring is already a style.)
        const nova = Math.round(caster.sheet.get('projNova', tags, extra));
        if (nova > 0) {
          const total = count + nova;
          for (let i = 0; i < total; i++) {
            nativeHost.spawnProjectile(caster, inst, origin,
              caster.facing + (i / total) * Math.PI * 2, { mult: useMult, flat: flatBonus });
          }
          break;
        }
        // FIRING STYLE: innate delivery data, stat-converted by Rattling
        // Salvo / Firing Line (salvo outranks volley when both are granted).
        const style = caster.sheet.get('fireSalvo', tags, extra) > 0 ? 'salvo'
          : caster.sheet.get('fireVolley', tags, extra) > 0 ? 'volley'
          : (d.fire ?? 'fan');
        if (style === 'salvo') {
          // One shot NOW (the cast already wound up), the rest on the beat —
          // re-aimed at the live cursor as they go. A canceled bar fired
          // nothing; a resolved one commits the whole burst.
          const interval = Math.max(0.03, (d.salvoInterval ?? 0.09) / caster.speedFactor(inst));
          const fixedOrigin = origin !== caster.pos ? vec(origin.x, origin.y) : null;
          nativeHost.spawnProjectile(caster, inst, origin, caster.facing, { mult: useMult, flat: flatBonus });
          if (count > 1) {
            {
let nativeStorage: typeof nativeHost.pendingSalvos;
let nativeRecord: typeof nativeHost.pendingSalvos[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingSalvos).push(nativeRecord = {
              caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), aim: vec(aim.x, aim.y), origin: fixedOrigin,
              shots: count - 1, timer: interval, interval, mult: useMult,
              flat: flatBonus,
            });
nativeHost.issueCombatRecord("pendingSalvos", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
          }
          break;
        }
        if (style === 'volley') {
          // The firing squad: ranks fan outward from the center on the
          // perpendicular (0, right, left, right…), all flying PARALLEL.
          const gap = (d.volleySpacing ?? 34) * caster.sheet.get('volleySpacing', tags, extra);
          const perp = caster.facing + Math.PI / 2;
          for (let i = 0; i < count; i++) {
            const rank = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 === 1 ? 1 : -1);
            const at = nativeHost.clampPos(vec(
              origin.x + Math.cos(perp) * gap * rank,
              origin.y + Math.sin(perp) * gap * rank), d.radius);
            nativeHost.spawnProjectile(caster, inst, at, caster.facing, { mult: useMult, flat: flatBonus });
          }
          break;
        }
        // RING NOVA (ProjectileDelivery.ring): a full circle of EVENLY spaced
        // rays; the whole ring rotates by a random phase within one slice per
        // cast (unless pinned) — the D2 Poison Nova coverage lottery at range.
        if (d.ring) {
          const phase = d.ring.phaseJitter === false
            ? 0 : rand(0, (Math.PI * 2) / Math.max(1, count));
          for (let i = 0; i < count; i++) {
            const ang = phase + (i / Math.max(1, count)) * Math.PI * 2;
            nativeHost.spawnProjectile(caster, inst, origin, ang, { mult: useMult, flat: flatBonus });
          }
          break;
        }
        // SPREAD BY AIM (Splayshot): the cone's width is AIMED — tight at
        // the cursor's reach, splayed point-blank (or the reverse; data).
        let spreadBase = d.spreadDeg ?? 14;
        if (d.spreadByAim) {
          const f = Math.min(1, dist(caster.pos, aim) / Math.max(1, d.spreadByAim.range));
          spreadBase = d.spreadByAim.near + (d.spreadByAim.far - d.spreadByAim.near) * f;
        }
        const spread = (spreadBase * Math.PI / 180)
          * caster.sheet.get('spreadAngle', tags, extra);
        for (let i = 0; i < count; i++) {
          const off = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
          nativeHost.spawnProjectile(caster, inst, origin, caster.facing + off,
            { mult: useMult, flat: flatBonus, dest: vec(aim.x, aim.y) });
        }
        break;
      }

      case 'melee': {
        // SWEEPING BLOW (meleeSweep stat): the anchored arc LEAVES YOUR
        // HANDS — a crescent wave built from the cone's own geometry
        // travels forward, striking each enemy exactly once (surface
        // semantics). The firing-styles precedent applied to melee.
        // The conversion replaces only the swing's PRIMARY strike (plus the
        // cast-time flash/heal/mallet, which the traveling surface replays
        // per crossing through the zone tick) — the shared tail below,
        // reverberation and the aftermath minter, runs for BOTH deliveries
        // off whichever geometry the cast actually drew.
        const sweeping = caster.sheet.get('meleeSweep', tags, extra) > 0;
        // meleeReach: the strike-distance lever swingArc trades against
        // (Reckless Breadth — a wider, shorter swing).
        const reach = (caster.radius + d.range)
          * caster.sheet.get('meleeReach', tags, extra);
        const arcRad = Math.min(Math.PI * 2,
          (d.arcDeg * Math.PI / 180) * Math.sqrt(aoeScale) * arcScale);
        // THE SIGIL ON THE SWING (2026-07-21): a shape override re-geometries
        // the arc itself — a square sigil turns the swing into a surround
        // slam that covers the corners, a triangle into the pointed wedge
        // along the facing (inAoe's own geometry; the crescent/sector kinds
        // keep the classic arc test — shape 0 is byte-identical bare).
        // The delivery's innate figure is the stat query's BASE (the ground
        // delivery's pattern) — a socketed sigil's override still wins.
        const swingShape = caster.sheet.get('aoeShape', tags, extra,
          AOE_SHAPE[d.shape ?? 'circle']);
        // THE CROSSING STRIP (AOE_SHAPE.band — the Cross Jab's figure): the
        // swing lands as a strip ACROSS the front, seated by bandSwingGeo
        // off the same reach/arc every lever folds into (the far edge at
        // reach, the width the arc's chord). ONE figure (bandC + bandGeo)
        // feeds the victim test, the flash, the mend, the mallet and the
        // aftermath minter — drawn == tested through one mapping.
        const banded = swingShape === AOE_SHAPE.band;
        const bandGeo = banded ? bandSwingGeo(reach, arcRad) : null;
        const bandC = bandGeo
          ? vec(caster.pos.x + Math.cos(caster.facing) * bandGeo.standoff,
                caster.pos.y + Math.sin(caster.facing) * bandGeo.standoff)
          : caster.pos;
        // ONE struck ledger for the whole cast: the swing's hits, the
        // reverb's picks and — sweeping — the wave's crossings all mark it.
        const struck = new Set<number>();
        const assaultLockedTarget = nativeHost.assaults.locked(caster, inst);
        if (assaultLockedTarget) {
          struck.add(assaultLockedTarget.id);
          nativeHost.resolveHit(caster, inst, assaultLockedTarget, useMult, 0, flatBonus);
          nativeHost.flashes.push({ pos: { ...assaultLockedTarget.pos }, radius: 18, color: cosmeticColor, life: 0.18, maxLife: 0.18 });
        }
        // The crescent's geometry, hoisted for the shared tail below.
        let sweepR = 0, sweepArc = 0;
        if (sweeping) {
          sweepR = Math.min(140, Math.max(70, (caster.radius + d.range) * 1.35));
          sweepArc = (d.arcDeg * Math.PI / 180) * Math.sqrt(aoeScale) * arcScale;
          const speed = 480 * caster.sheet.get('sweepSpeed', tags, extra);
          const travel = 210 * caster.sheet.get('sweepRange', tags, extra)
            * Math.min(2, caster.sheet.get('effectDuration', tags, extra));
          {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
            pos: vec(caster.pos.x, caster.pos.y), radius: sweepR,
            caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: cosmeticColor,
            delay: 0, exploded: true,
            linger: travel / speed,
            tickInterval: 0, tickTimer: 0,
            shape: AOE_SHAPE.crescent, facing: caster.facing,
            dmgMult: useMult, depth: 0,
            drift: speed, arcRad: sweepArc,
            struck,
            flatBonus,
          });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
          nativeHost.flashes.push({
            pos: vec(caster.pos.x, caster.pos.y), radius: sweepR * 0.6, color: cosmeticColor,
            life: 0.2, maxLife: 0.2, arc: { facing: caster.facing, arcRad: sweepArc }, fx: d.fx ?? skillStrikeVoice(inst.def.id),
          });
          // The wave's launch point is the sweep's area anchor.
          fieldAt = vec(caster.pos.x, caster.pos.y);
        } else {
          nativeHost.releaseStruckSummons(caster, inst, body => {
            if (banded) return inAoe(bandC, bandGeo!.halfWidth, AOE_SHAPE.band, caster.facing, body.pos, body.radius);
            if (swingShape >= 1 && swingShape <= 2) return inAoe(caster.pos, reach, swingShape, caster.facing, body.pos, body.radius);
            return dist(caster.pos, body.pos) - body.radius <= reach
              && Math.abs(angleDiff(caster.facing, angleTo(caster.pos, body.pos))) <= arcRad / 2;
          });
          for (const enemy of nativeHost.enemiesOf(caster)) {
            if (!sameStory(caster, enemy)) continue; // a swing is a TOUCH: its own story, rim duels or no
            // SEGMENT FABRIC: the swing connects with the NEAREST hittable
            // body — the coil beside you, not only the head across the room.
            // Plain monsters: nearest body IS the head, byte-identical.
            if (struck.has(enemy.id)) continue;
            const nb = nearestBody(enemy, caster.pos);
            if (banded) {
              if (!inAoe(bandC, bandGeo!.halfWidth, AOE_SHAPE.band, caster.facing, nb.pos, nb.r)) continue;
            } else if (swingShape >= 1 && swingShape <= 2) {
              if (!inAoe(caster.pos, reach, swingShape, caster.facing, nb.pos, nb.r)) continue;
            } else {
              if (dist(caster.pos, nb.pos) - nb.r > reach) continue;
              if (Math.abs(angleDiff(caster.facing, angleTo(caster.pos, nb.pos))) > arcRad / 2) continue;
            }
            struck.add(enemy.id);
            noteBodyHit(enemy, nb.seg);
            nativeHost.resolveHit(caster, inst, enemy, useMult, 0, flatBonus);
          }
        }
        // Reverberation: the blow rings outward to extra nearby enemies.
        // SWEEPING: the ring fires AT CAST with the ledger still empty — the
        // wave has struck no one yet, so the reverb picks the true nearest
        // bodies (including behind the caster, where the wave never looks).
        // No double-dip BY CONSTRUCTION: the ledger IS the wave's own struck
        // Set, so a reverb-rung body reads as already crossed when the
        // crescent reaches it — one cast strikes each body at most once,
        // the swing's own reverb law (EXTRA bodies, never repeats) extended
        // to the traveling surface. Deferring the ring to the wave's expiry
        // was rejected: it would need bespoke zone-expiry machinery for a
        // mechanic whose whole feel is the blow's immediate ring-out.
        const reverb = Math.round(caster.sheet.get('meleeReverb', tags, extra));
        for (let r = 0; r < reverb; r++) {
          let next: Actor | null = null, bd = reach + 140;
          for (const e of nativeHost.enemiesOf(caster)) {
            if (struck.has(e.id)) continue;
            const dd = dist(caster.pos, e.pos);
            if (dd < bd) { bd = dd; next = e; }
          }
          if (!next) break;
          struck.add(next.id);
          nativeHost.resolveHit(caster, inst, next, useMult, 0, flatBonus);
          nativeHost.flashes.push({ pos: vec(next.pos.x, next.pos.y), radius: 18, color: cosmeticColor, life: 0.15, maxLife: 0.15 });
        }
        if (!sweeping) {
          // Drawn == tested: a sigil-shaped swing flashes its SHAPE; the
          // classic swing keeps its arc sweep. (The sweep pushed its own
          // crescent flash above.)
          // A banded swing flashes its STRIP at the strip's own seat; every
          // melee flash may speak a registered voice (MeleeDelivery.fx —
          // the crossjab knuckle streak), unset = the classic costume.
          nativeHost.flashes.push(banded
            ? {
              pos: vec(bandC.x, bandC.y), radius: bandGeo!.halfWidth, color: cosmeticColor,
              life: 0.18, maxLife: 0.18, shape: AOE_SHAPE.band, facing: caster.facing, fx: d.fx ?? skillStrikeVoice(inst.def.id),
            }
            : swingShape >= 1 && swingShape <= 2
            ? {
              pos: vec(caster.pos.x, caster.pos.y), radius: reach, color: cosmeticColor,
              life: 0.18, maxLife: 0.18, shape: swingShape, facing: caster.facing, fx: d.fx ?? skillStrikeVoice(inst.def.id),
            }
            : {
              pos: vec(caster.pos.x, caster.pos.y), radius: reach, color: cosmeticColor,
              life: 0.18, maxLife: 0.18, arc: { facing: caster.facing, arcRad }, fx: d.fx ?? skillStrikeVoice(inst.def.id),
            });
          // Melee 'aoe' swings have an area too (Cleave + No Man's Land
          // scorches where the blade passed) — the arc's centroid; a
          // surround slam centers on the caster.
          fieldAt = banded ? vec(bandC.x, bandC.y)
            : swingShape === 1
            ? vec(caster.pos.x, caster.pos.y)
            : vec(caster.pos.x + Math.cos(caster.facing) * reach * 0.6,
                  caster.pos.y + Math.sin(caster.facing) * reach * 0.6);
        }
        // The cascade family beyond ground: the swing's sequels — the
        // same slam detonating again, Seismic March quaking forward out
        // of it — mint off the swing's own geometry (sigil shapes true;
        // the classic swing re-strikes as its own SECTOR, and a SWEEPING
        // cast re-strikes as the CRESCENT it actually drew — the wave's
        // anchor, facing and arc, never the swing's sector).
        // (A banded swing's sequels mint off its strip — Seismic March walks
        // a band of the same width; the kindred rule reads the true figure.)
        nativeHost.mintAftermath(caster, inst,
          banded && !sweeping ? vec(bandC.x, bandC.y) : vec(caster.pos.x, caster.pos.y),
          sweeping ? sweepR : banded ? bandGeo!.halfWidth : reach,
          sweeping ? AOE_SHAPE.crescent
            : banded ? AOE_SHAPE.band
            : swingShape >= 1 && swingShape <= 2 ? swingShape : AOE_SHAPE.sector,
          caster.facing, useMult, tags, extra,
          sweeping ? sweepArc
            : banded || (swingShape >= 1 && swingShape <= 2) ? undefined : arcRad);
        if (!sweeping) {
          // Heal-and-harm swings (Sanctified Strike): the same arc MENDS the
          // allies standing in it — one swing, both congregations. (A
          // sweeping cast skips the cast-time mend and mallet: the wave
          // zone replays both per crossing through its own tick.)
          nativeHost.healAlliesInArea(caster, inst, a =>
            banded
              ? inAoe(bandC, bandGeo!.halfWidth, AOE_SHAPE.band, caster.facing, a.pos, a.radius)
              : dist(caster.pos, a.pos) - a.radius <= reach
                && Math.abs(angleDiff(caster.facing, angleTo(caster.pos, a.pos))) <= arcRad / 2,
            useMult);
          // THE MALLET: the swing's own arc rings castOnStruck constructs
          // and pops brittle 'hit' scenery through the shared strike-surface
          // seam — walk up and play the bell on purpose (the PoE2 combo),
          // smash the pots on the follow-through. Team-wide by design:
          // minions and co-op allies swing mallets too.
          nativeHost.frontSplash(caster, inst, caster.pos, reach);
          nativeHost.strikeSurfaces(caster, banded ? bandC : caster.pos, banded ? bandGeo!.halfWidth : reach, (p, r) =>
            banded
              ? inAoe(bandC, bandGeo!.halfWidth, AOE_SHAPE.band, caster.facing, p, r)
              : dist(caster.pos, p) - r <= reach
                && Math.abs(angleDiff(caster.facing, angleTo(caster.pos, p))) <= arcRad / 2,
            undefined, undefined, skillContextTags(inst).has('aoe')); // minionCombat area classification
        }
        break;
      }

      case 'nova': {
        const radius = d.radius * aoeScale;
        const shape = caster.sheet.get('aoeShape', tags, extra);
        // WALLS SHAPE BURSTS (occlusion): the wash reaches only what the
        // origin has a firing line to — cover is cover even inside the ring.
        const phase = nativeHost.skillOcclusion(caster, inst) === 'free';
        let pool = d.affects === 'all'
          ? nativeHost.actors.filter(a => !a.dead && !a.untargetable)
          : d.affects === 'allies'
            ? nativeHost.actors.filter(a => !a.dead && a.team === caster.team)
            : nativeHost.enemiesOf(caster);
        // The author is not the audience (NovaDelivery.spareCaster): a burst
        // wearing the spare never strikes its own caster — nor the caster's
        // CARRIED PARTS (a wound to the horn is a wound to the horn-blower:
        // part damage bleeds to the root, and a composite would break its
        // own voice with its own verb).
        if (d.spareCaster) pool = pool.filter(a => a !== caster && a.partLink?.root !== caster);
        pool = pool.filter(v => sameStory(v, caster)); // a burst from the body touches its own story only (the sovereignty gate)
        // Capped-target novas (Galvanic Reserve): the burst picks the
        // NEAREST N instead of washing the whole room — walled-off bodies
        // never consume a slot.
        // SEGMENT FABRIC: containment, the edge band and the firing line
        // all judge PER BODY — a coil in the burst is honestly struck while
        // the head shelters behind stone, and the hollow of an edge-band
        // nova spares only bodies wholly inside it. One contact per
        // creature; plain monsters take the exact head-circle test.
        const novaBody = (v: Actor): SegBody | null =>
          inAoeBody(origin, radius, shape, caster.facing, v, undefined,
            (bp, br) =>
              !(d.edgeOnly && dist(origin, bp) + br < radius * d.edgeOnly)
              && (phase || v === caster || nativeHost.lineOfFire(origin, bp, caster.tier)));
        if (d.maxTargets !== undefined) {
          pool = pool
            .filter(v => novaBody(v) !== null)
            .sort((a, b) => dist(origin, a.pos) - dist(origin, b.pos))
            .slice(0, Math.max(1, d.maxTargets));
        }
        for (const victim of pool) {
          // Status-gated novas (Soul Glut): only the afflicted are devoured.
          if (d.requiresStatus
            && !victim.statuses.some(s => d.requiresStatus!.includes(s.id))) continue;
          const nb = novaBody(victim);
          if (!nb) continue;
          noteBodyHit(victim, nb.seg);
          nativeHost.resolveHit(caster, inst, victim, useMult, 0, flatBonus);
          // LANCE VISUALS (Lancing Flurry): every victim is struck down a
          // drawn line from the origin — simultaneous razor lances.
          if (d.lanceFx) {
            nativeHost.flashes.push({
              pos: vec(origin.x, origin.y),
              radius: dist(origin, nb.pos) + nb.r,
              color: cosmeticColor, life: 0.22, maxLife: 0.22,
              beam: true, facing: angleTo(origin, nb.pos),
            });
          }
        }
        nativeHost.flashes.push({
          pos: vec(origin.x, origin.y), radius, color: cosmeticColor,
          life: 0.3, maxLife: 0.3, shape, facing: caster.facing,
          edgeFrac: d.edgeOnly,
          fx: d.fx ?? skillBurstVoice(inst.def.id),
        });
        nativeHost.spawnAftershocks(caster, inst, origin, radius, shape);
        // The cascade family beyond ground: the burst's sequels (armed
        // second detonations, marching ripples) mint off the strike area
        // — EDGE BAND included (the inheritance law): a Shock Nova sequel
        // is a ring with the same safe eye the nova itself keeps.
        nativeHost.mintAftermath(caster, inst, origin, radius, shape,
          caster.facing, useMult, tags, extra, undefined, d.edgeOnly);
        fieldAt = vec(origin.x, origin.y);
        // Enemy-facing novas with a mend side (Radiant Nova): allies in the
        // burst are healed. Ally/'all' novas already resolved them above.
        if (d.affects === undefined) {
          nativeHost.healAlliesInArea(caster, inst, a =>
            inAoe(origin, radius, shape, caster.facing, a.pos, a.radius)
            && !(d.edgeOnly && dist(origin, a.pos) + a.radius < radius * d.edgeOnly),
            useMult);
          // THE MALLET: the burst's own footprint (shape, edge band, walls)
          // rings bells and pops brittle scenery. Mend-washes ('allies')
          // strike nothing — a blessing is not a blow — and 'all' bursts
          // already reach the bell as a victim (resolveHit rings it).
          nativeHost.frontSplash(caster, inst, origin, radius);
          nativeHost.strikeSurfaces(caster, origin, radius, (p, r) =>
            inAoe(origin, radius, shape, caster.facing, p, r)
            && !(d.edgeOnly && dist(origin, p) + r < radius * d.edgeOnly)
            && (phase || nativeHost.lineOfFire(origin, p, caster.tier)));
        }
        break;
      }

      case 'target': {
        // FRIENDLY resolution: an ally (or self-fallback) target never runs
        // the hit pipeline — mends, cleanses, and wards land directly.
        const friendly = targetInfo?.actor?.team === caster.team
          ? targetInfo.actor
          : targetInfo?.self ? caster : null;
        if (friendly) {
          // THE LUCKY POUR's one roll per press: every restore stream this
          // use opens (a two-lane sip) shares it — rolled lazily at the
          // first pour so pourless mends never consult the dice.
          let pourCrit: number | undefined;
          for (const fx of instanceEffects(inst)) {
            if (fx.type === 'heal') nativeHost.applyHealChained(caster, inst, friendly, fx, useMult);
            else if (fx.type === 'cleanse') nativeHost.cleanseActor(friendly, fx.count ?? 2);
            else if (fx.type === 'absorb') {
              nativeHost.grantAbsorb(friendly, skillAbsorbAmount(caster, inst, fx.amount),
                fx.duration * caster.sheet.get('effectDuration', tags, extra));
            } else if (fx.type === 'restore') nativeHost.applyRestore(friendly, fx, { tags: def.tags });
            else if (fx.type === 'ward') {
              friendly.gainWard(fx.amount
                * (fx.perCharge ? Math.max(1, opts.chargesSpent ?? 0) : 1));
            } else if (fx.type === 'restoreOverTime') {
              pourCrit ??= nativeHost.critMendMult(caster, inst, friendly.pos);
              nativeHost.startRestoreStream(friendly, caster, inst, fx, opts.chargesSpent ?? 0, pourCrit);
            }
          }
          nativeHost.showSkillArrival(caster, inst, friendly.pos, friendly.radius + 14, friendly.tier);
          break;
        }
        if (targetInfo?.actor) {
          // THE TAMING: a tame-bearing cast never harms — it CLAIMS. The
          // whole hit pipeline is bypassed; the bond succeeds or the beast
          // shrugs it off with a note.
          const tameFx = def.effects.find((f): f is Extract<SkillEffect, { type: 'tame' }> => f.type === 'tame');
          if (tameFx) {
            nativeHost.tryTame(caster, inst, targetInfo.actor, tameFx);
            if (targetInfo.actor.owner === caster) nativeHost.showSkillArrival(caster, inst, targetInfo.actor.pos, targetInfo.actor.radius + 14, targetInfo.actor.tier);
            break;
          }
          nativeHost.resolveHit(caster, inst, targetInfo.actor, useMult, 0, flatBonus);
          // Forked Focus: targeted skills land on extra nearby victims —
          // Ignite three things at once.
          const extraTargets = Math.round(caster.sheet.get('multiTarget', tags, extra));
          if (extraTargets > 0) {
            const need = statusReqs(instanceTargeting(inst)?.requiresStatus);
            const more = nativeHost.enemiesOf(caster)
              .filter(e => e !== targetInfo.actor
                && dist(targetInfo.pos, e.pos) <= 170
                && (!need || e.statuses.some(s => need.includes(s.id))))
              .sort((a, b) => dist(targetInfo.pos, a.pos) - dist(targetInfo.pos, b.pos))
              .slice(0, extraTargets);
            for (const e of more) {
              nativeHost.resolveHit(caster, inst, e, useMult, 0, flatBonus);
              nativeHost.showSkillArrival(caster, inst, e.pos, e.radius + 14, e.tier);
            }
          }
          if (d.splash) {
            const splash = d.splash * aoeScale;
            for (const enemy of nativeHost.enemiesOf(caster)) {
              if (enemy === targetInfo.actor) continue;
              // SEGMENT FABRIC: splash reaches the nearest hittable body.
              const nb = nearestBody(enemy, targetInfo.pos);
              if (dist(targetInfo.pos, nb.pos) - nb.r <= splash) {
                noteBodyHit(enemy, nb.seg);
                nativeHost.resolveHit(caster, inst, enemy, useMult * 0.5, 0);
              }
            }
            // THE MALLET: the named strike's splash is a blast too.
            nativeHost.frontSplash(caster, inst, targetInfo.pos, splash);
            nativeHost.strikeSurfaces(caster, targetInfo.pos, splash);
          }
        }
        if (!targetInfo?.corpse || targetSpec?.consumesCorpse === false || !skillRiteVoice(def.id)) {
          nativeHost.showSkillArrival(caster, inst, targetInfo?.actor?.pos ?? origin,
            d.splash ? d.splash * aoeScale : (targetInfo?.actor?.radius ?? 12) + 14,
            targetInfo?.actor?.tier ?? caster.tier, false, !!d.splash);
        }
        fieldAt = vec(origin.x, origin.y);
        break;
      }

      case 'cone': {
        const range = d.range * aoeScale
          * caster.sheet.get('meleeReach', tags, extra);
        const arcRad = Math.min(Math.PI * 2,
          (d.arcDeg * Math.PI / 180) * arcScale);
        // THE INVERTED SIGILS (2026-07-22, minter round 2): a sigiled cone
        // abandons the wedge for the sigil's own figure — SQUARE fills the
        // wedge's near corners into a caster-anchored square of the cone's
        // reach (centered half-range ahead); TRIANGLE INVERTS the read:
        // the standard zone wedge stood at the FAR point facing home, so
        // the cast is WIDEST AT THE CASTER'S FEET and comes to a point at
        // range — the melee-ish figure, deliberately distinct from the
        // cone it replaces. The sigil replaces the wedge's WHOLE geometry
        // (edge bands included); drawn == tested through one mapping.
        const coneSigil = Math.round(caster.sheet.get('aoeShape', tags, extra));
        const sigiled = coneSigil === 1 || coneSigil === 2;
        // Triangle: inAoe's equilateral (apex toward facing, circumradius
        // = R×1.25) mapped so the APEX lands exactly at range and the
        // BASE SIDE passes through the caster's feet — center a third of
        // the way out, circumradius 2/3·range (radius = range×8/15). The
        // inversion is the MAPPING, not a flipped facing: base at the
        // feet, point at the far end. Square: the same axis-aligned box
        // every square sigil tests, centered half-range ahead.
        const sigilC = coneSigil === 2
          ? vec(caster.pos.x + Math.cos(caster.facing) * range / 3,
                caster.pos.y + Math.sin(caster.facing) * range / 3)
          : vec(caster.pos.x + Math.cos(caster.facing) * range / 2,
                caster.pos.y + Math.sin(caster.facing) * range / 2);
        const sigilR = coneSigil === 2 ? range * (8 / 15) : range / 2;
        const sigilF = caster.facing;
        // WALLS EAT RAYS (occlusion): victims without a firing line from the
        // origin are spared — the wedge licks around corners it can SEE past,
        // never through stone. A phasing use burns through everything.
        const phase = nativeHost.skillOcclusion(caster, inst) === 'free';
        for (const enemy of nativeHost.enemiesOf(caster)) {
          // SEGMENT FABRIC: the wedge judges range, rim, angle and firing
          // line against the NEAREST hittable body (head for everything
          // plain — the classic test, byte-identical).
          const nb = nearestBody(enemy, caster.pos);
          if (sigiled) {
            if (!inAoe(sigilC, sigilR, coneSigil, sigilF, nb.pos, nb.r)) continue;
          } else {
            const dd = dist(caster.pos, nb.pos);
            if (dd - nb.r > range) continue;
            // Edge-band cones (Surgical Strike): only the far rim cuts.
            if (d.edgeOnly && dd + nb.r < range * d.edgeOnly) continue;
            if (Math.abs(angleDiff(caster.facing, angleTo(caster.pos, nb.pos))) > arcRad / 2) continue;
          }
          if (!phase && !nativeHost.lineOfFire(caster.pos, nb.pos, caster.tier)) continue;
          noteBodyHit(enemy, nb.seg);
          nativeHost.resolveHit(caster, inst, enemy, useMult, 0, flatBonus);
        }
        // LASER presentation (beamFx): razor cones ARE hitscan — draw the
        // crystal-beam line instead of an invisible sliver of wedge. The
        // drawn ray CLIPS at the first wall (honest laser: the stone eats it).
        if (d.beamFx && !sigiled) {
          const beamLen = phase ? range : dist(caster.pos, nativeHost.clipShot(caster.pos,
            vec(caster.pos.x + Math.cos(caster.facing) * range,
                caster.pos.y + Math.sin(caster.facing) * range), caster.tier));
          nativeHost.flashes.push({
            pos: vec(caster.pos.x, caster.pos.y), radius: beamLen, color: cosmeticColor,
            life: 0.22, maxLife: 0.22, beam: true, facing: caster.facing,
            fx: skillBeamVoice(inst.def.id), arc: { facing: caster.facing, arcRad },
          });
        } else if (sigiled) {
          // The sigil's figure IS the flash (drawn == tested).
          nativeHost.flashes.push({
            pos: vec(sigilC.x, sigilC.y), radius: sigilR, color: cosmeticColor,
            life: 0.25, maxLife: 0.25, shape: coneSigil, facing: sigilF, fx: skillStrikeVoice(inst.def.id),
          });
        } else {
          nativeHost.flashes.push({
            pos: vec(caster.pos.x, caster.pos.y), radius: range, color: cosmeticColor,
            life: 0.25, maxLife: 0.25, arc: { facing: caster.facing, arcRad },
            edgeFrac: d.edgeOnly, fx: skillStrikeVoice(inst.def.id),
          });
        }
        // A cone's area is the wedge — the field settles on its centroid
        // (a sigiled figure settles on its own).
        fieldAt = sigiled && coneSigil === 2
          ? vec(caster.pos.x + Math.cos(caster.facing) * range * 0.33,
                caster.pos.y + Math.sin(caster.facing) * range * 0.33)
          : vec(caster.pos.x + Math.cos(caster.facing) * range * 0.55,
                caster.pos.y + Math.sin(caster.facing) * range * 0.55);
        // The wedge's mend side (channelled healing streams wash allies).
        nativeHost.healAlliesInArea(caster, inst, a => {
          if (sigiled) return inAoe(sigilC, sigilR, coneSigil, sigilF, a.pos, a.radius);
          const dd = dist(caster.pos, a.pos);
          return dd - a.radius <= range
            && !(d.edgeOnly && dd + a.radius < range * d.edgeOnly)
            && Math.abs(angleDiff(caster.facing, angleTo(caster.pos, a.pos))) <= arcRad / 2;
        }, useMult);
        // THE MALLET: the wedge rings bells and pops brittle scenery it can
        // see — same range/arc/edge/occlusion gates as its victims (razor
        // beamFx cones included: the laser is a mallet too).
        nativeHost.frontSplash(caster, inst, caster.pos, range);
        nativeHost.strikeSurfaces(caster, caster.pos, range, (p, r) => {
          if (sigiled) {
            return inAoe(sigilC, sigilR, coneSigil, sigilF, p, r)
              && (phase || nativeHost.lineOfFire(caster.pos, p, caster.tier));
          }
          const dd = dist(caster.pos, p);
          return dd - r <= range
            && !(d.edgeOnly && dd + r < range * d.edgeOnly)
            && Math.abs(angleDiff(caster.facing, angleTo(caster.pos, p))) <= arcRad / 2
            && (phase || nativeHost.lineOfFire(caster.pos, p, caster.tier));
        });
        // The cascade family reaches the WAVE (minter round 2): the cone's
        // sequels mint off its true figure — the sigiled square/inverted
        // triangle or the classic wedge as its own sector — with the walk
        // still marching the CAST bearing (an inverted sigil faces home;
        // the quake does not).
        nativeHost.mintAftermath(caster, inst,
          sigiled ? sigilC : vec(caster.pos.x, caster.pos.y),
          sigiled ? sigilR : range,
          sigiled ? coneSigil : AOE_SHAPE.sector,
          sigiled ? sigilF : caster.facing,
          useMult, tags, extra,
          sigiled ? undefined : arcRad,
          sigiled ? undefined : d.edgeOnly,
          caster.facing);
        break;
      }

      case 'ground': {
        const at = nativeHost.clampGroundTarget(caster, aim, d, inst);
        // CONJURED CLOUD lands at the GROUND TARGET (the generic effect
        // executor's origin is the caster — Shatterstep departure
        // semantics; a CALLED cloud goes where you point it).
        for (const fx of instanceEffects(inst)) {
          // A KINDLED LIGHT goes where you point it too (the lightwell
          // fabric): pool scales with effectDuration, reach with area.
          if (fx.type === 'kindle') {
            nativeHost.plantKindle(caster, fx.kind, at, aoeScale, caster.sheet.get('effectDuration', tags, extra));
            continue;
          }
          // A PLANTED STEAM BANK goes where you point it (the 'vent' effect —
          // the fog fabric): reach with area, life with effectDuration.
          if (fx.type === 'vent') {
            nativeHost.plantVent(fx, at, aoeScale, caster.sheet.get('effectDuration', tags, extra), caster.tier);
            continue;
          }
          if (fx.type === 'conjure') {
            const cr = fx.radius * aoeScale;
            const cd = fx.duration * caster.sheet.get('effectDuration', tags, extra);
            const conjOpts = {
              caster,
              grants: nativeHost.conjureGrantsFor(caster, tags, extra, fx.grants),
              ...(fx.look !== undefined ? { look: fx.look } : {}),
              ...(fx.follow ? { follow: true } : {}),
            };
            if (fx.line) {
              // THE CAUSEWAY: pave discs from the caster's feet to the aim
              // point — spacing/cap are framework knobs, never the skill's.
              const ldx = at.x - caster.pos.x, ldy = at.y - caster.pos.y;
              const len = Math.hypot(ldx, ldy);
              const lstep = Math.max(1, cr * CONJURE_CFG.lineStep);
              const hops = Math.min(CONJURE_CFG.lineMaxHops, Math.max(1, Math.round(len / lstep)));
              for (let h = 1; h <= hops; h++) {
                nativeHost.conjureCloud(caster.pos.x + (ldx * h) / hops,
                  caster.pos.y + (ldy * h) / hops, cr, cd, conjOpts);
              }
            } else {
              nativeHost.conjureCloud(at.x, at.y, cr, cd, conjOpts);
            }
          }
        }
        // A BIRTH goes where you point it (THE CLUTCH FABRIC — engine/
        // clutch.ts): bodies stand at the ground target, the kindle/vent
        // law. instanceBirth reads the native row first, else the socketed
        // graft; onHit rows wait for resolveHit instead.
        {
          const gb = instanceBirth(inst);
          if (gb && !gb.onHit) nativeHost.birthAt(caster, inst, gb, at);
        }
        const isCurse = def.tags.includes('curse');
        const curseAllies = isCurse && caster.sheet.get('hedonism', tags, extra) > 0;
        // EXCLUSIVE placements (Netherfissure): the new wound extinguishes
        // the old — one live placement per skill per caster.
        if (d.exclusive) {
          for (let zi = nativeHost.zones.length - 1; zi >= 0; zi--) {
            const z = nativeHost.zones[zi];
            if (z.caster === caster && z.inst.def.id === def.id) {
              nativeHost.expireZone(z);
              nativeHost.zones.splice(zi, 1);
            }
          }
        }
        // RISEN OFFERING (SupportDef.turret): the field rises as a TURRET
        // at the caster's feet — the zone rides it (anchor) and dies with
        // it, and the turret casts its payload at enemies inside the
        // field's radius. maxActive 1 makes recasts exclusive: the evicted
        // turret takes its zone down with it.
        let zoneAnchor: Actor | undefined;
        const turret = instanceTurret(inst);
        if (turret && (d.lingerDuration ?? 0) > 0 && SKILLS[turret.castSkillId]) {
          const turretCast = makeSkillInstance(SKILLS[turret.castSkillId], effectiveSkillLevel(inst));
          // The sub-cast board (the construct-flight synergy): the risen
          // turret's payload wears the host's rideable gems too — priced
          // at the totem lane's dial (it rises as kind 'totem' below).
          nativeHost.forwardSummonSockets(inst, [turretCast], {
            scale: CONSTRUCT_FORWARD_CFG.scale['totem'] ?? CONSTRUCT_FORWARD_CFG.scaleDefault,
          });
          const built = nativeHost.spawnConstruct(caster, inst, {
            type: 'construct', kind: 'totem',
            range: d.radius * aoeScale,
            duration: d.lingerDuration ?? 6, maxActive: 1,
            life: turret.life ?? 45, placeRange: 0,
            look: turret.look, // the support's own effigy body
          }, caster.pos, turretCast, vec(caster.pos.x, caster.pos.y));
          if (built) { zoneAnchor = built; at.x = built.pos.x; at.y = built.pos.y; }
        }
        // FISSURE: the placement is a traveling CRACK — chains of zones
        // tearing open along the facing, forking branches, snapping shut.
        // The fissureCount stat fans extra whole cracks per cast.
        if (d.fissure) {
          const fans = 1 + Math.round(caster.sheet.get('fissureCount', tags, extra));
          const fanSpread = Math.PI / 5;
          const baseAng = dist(caster.pos, at) < 1 ? caster.facing : angleTo(caster.pos, at);
          const from = dist(caster.pos, at) < 1 ? vec(caster.pos.x, caster.pos.y) : at;
          for (let f = 0; f < fans; f++) {
            const off = fans === 1 ? 0 : (f / (fans - 1) - 0.5) * fanSpread * (fans - 1);
            nativeHost.layFissure(caster, inst, from, baseAng + off, d, useMult, flatBonus,
              Math.round(caster.sheet.get('fissureBranches', tags, extra, d.fissure.branches ?? 0)), f);
          }
          fieldAt = at;
          break;
        }
        // The delivery's innate shape is the stat query's BASE — sigil
        // overrides still win (a crescent Reap under a Square Sigil is a
        // traveling wall; the registry composes).
        const groundShape = caster.sheet.get('aoeShape', tags, extra,
          AOE_SHAPE[d.shape ?? 'circle']);
        // GROUND PULSE (innate, support-grafted, or purely stat-granted):
        // the placement lies DORMANT and detonates AGAIN on a beat — the
        // earthquake's aftershock. Bare pulseCount with no spec anywhere
        // conjures a 1s-beat pulse from nothing (the aoeCascade "adds to
        // either" rule). A pulse whose skill brings no linger IMPOSES one
        // just long enough to quake (the fissure-texture "a texture needs
        // a surface" rule) — and an imposed surface carries NO ordinary
        // ticks (tick clocks pinned to Infinity): the pulse is the zone's
        // whole life, not a lingering field's. The `next` minted here is
        // refreshed at the actual impact, so delay-collapsed placements
        // (Thundermark's ripple) keep an honest clock; noImpact zones are
        // born live and keep this one. Every zone this case places —
        // primary, wall segment, cascade ripple — quakes on its own clock.
        // A socketed CADENCE (Accelerando/Ritardando) retunes every beat
        // the placement keeps — pulse gaps, cascade skips, emitter salvos
        // — overriding each spec's own intervalStep. One knob, every clock.
        const cadence = socketSpec(inst, 'cadence')?.intervalStep;
        // THE PULSE PLAN (kindred rule): the native rhythm (innate spec,
        // deepened by the pulseCount stat) plays first; appended gems'
        // beats follow in their own authored character via the queue —
        // the quake tolls, then the buried charge answers.
        const pPlan = instancePulsePlan(inst);
        const pSpec = pPlan.native;
        const pulseN = Math.max(0, (pSpec ? (pSpec.count ?? 1) : 0)
          + Math.round(caster.sheet.get('pulseCount', tags, extra)));
        const pDelay = pSpec?.delay ?? 1;
        const pInterval = pSpec?.interval ?? pDelay;
        const pStep = cadence ?? pSpec?.intervalStep ?? 1;
        const pQueue = flattenPulseQueue(pPlan.appended, cadence);
        const mintPulse = (telegraph: number): Zone['pulse'] => pulseN > 0
          ? {
            delay: pDelay, interval: pInterval, intervalStep: pStep,
            dmgMult: pSpec?.dmgMult ?? 1, dmgStep: pSpec?.dmgStep ?? 1,
            radiusMult: pSpec?.radiusMult ?? 1, radiusStep: pSpec?.radiusStep ?? 1,
            left: pulseN, next: nativeHost.time + Math.max(0, telegraph) + pDelay,
            queue: pQueue.length ? [...pQueue] : undefined,
          } : undefined;
        // The pulse clock is FIXED (an armed charge, not a duration) — the
        // imposed linger is exactly the beats + a settling breath, and an
        // effectDuration-shortened innate linger is still floored to it.
        // The beats walk the bouncing-ball curve (geometric), so the span
        // is the geometric sum — a settling ball's whole life is finite.
        let pulseSpan = 0;
        if (pulseN > 0) {
          pulseSpan = pDelay + 0.1;
          let gap = pInterval;
          for (let k = 1; k < pulseN; k++) {
            pulseSpan += gap;
            gap = Math.max(0.05, gap * pStep);
          }
          for (const q of pQueue) pulseSpan += q.delay;
        }
        const pulseLinger = (secs: number): number => Math.max(secs, pulseSpan);
        const ownLinger = (d.lingerDuration ?? 0) > 0;
        const groundTick = ownLinger || pulseN === 0 ? (d.tickInterval ?? 0.5) : Infinity;
        const groundTick0 = ownLinger || pulseN === 0 ? 0 : Infinity;
        // LINGERING FUME (GroundDelivery.exposure / SupportDef.exposure —
        // a socketed graft wins over the delivery's own): each placement
        // carries its own per-occupant dwell ledger — breath is local to a
        // surface. The DOMAIN gate (exposureDomain) rides the primary
        // placement only, where domains live.
        const expGraft = socketSpec(inst, 'exposure');
        const expAfter = expGraft?.after ?? d.exposure;
        const expDomain = (expGraft ? expGraft.domain : d.exposureDomain) ? true as const : undefined;
        const mintExposure = (): Zone['exposure'] =>
          expAfter ? { after: expAfter, dwell: new Map<number, number>() } : undefined;
        // THE MADNESS BANK (SupportDef.madden): unlike breath, madness is
        // one ledger for the whole skill — every placement below (wall
        // segments, the primary, march ripples, the clap twin, re-cast
        // clones) wears the instance's same bank.
        const maddenBank = nativeHost.maddenBankOf(inst);
        // SIZE ENVELOPE (GroundDelivery.sizeOver / SupportDef.zoneSizeOver —
        // a socketed graft wins, the trail rule): resolved ONCE; every
        // placement this cast lays (wall segments, the primary, cascade
        // ripples) breathes the same walk from its OWN birth radius. Birth
        // radius is stamped from-scaled so telegraphs and the opening hit
        // stay honest — what you see at detonation is what hits.
        const sizeOver = resolveSizeOver(instanceSizeOver(inst));
        if (d.line) {
          // Flame Wall: segments across the facing — or, with a sigil
          // socketed, arranged around a square / triangle outline.
          const pts: Vec2[] = [];
          const n = d.line.segments;
          if (groundShape >= 1) {
            const R = (d.line.spacing * n) / (Math.PI * 2) * 1.45;
            for (let i = 0; i < n; i++) {
              const ang = caster.facing + (i / n) * Math.PI * 2;
              let r: number;
              if (groundShape >= 2) {
                // equilateral triangle boundary (inradius R/2)
                const rel = ((ang - caster.facing) % (Math.PI * 2 / 3) + Math.PI * 2 / 3) % (Math.PI * 2 / 3);
                r = (R * 0.5) / Math.max(0.2, Math.cos(rel - Math.PI / 3));
              } else {
                // axis-aligned square boundary
                r = R / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang)));
              }
              pts.push(vec(at.x + Math.cos(ang) * r, at.y + Math.sin(ang) * r));
            }
          } else {
            const perp = caster.facing + Math.PI / 2;
            for (let i = 0; i < n; i++) {
              const off = (i - (n - 1) / 2) * d.line.spacing;
              pts.push(vec(at.x + Math.cos(perp) * off, at.y + Math.sin(perp) * off));
            }
          }
          for (const pt of pts) {
            {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
              pos: nativeHost.clampPos(pt, 10), radius: d.radius * aoeScale * (sizeOver?.from ?? 1),
              caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: cosmeticColor,
              delay: d.delay ?? 0, exploded: (d.delay ?? 0) <= 0,
              impactDress: d.impactDress,
              linger: pulseLinger((d.lingerDuration ?? 0) * caster.sheet.get('effectDuration', tags, extra)),
              linger0: pulseLinger((d.lingerDuration ?? 0) * caster.sheet.get('effectDuration', tags, extra)),
              tickInterval: groundTick, tickTimer: groundTick0,
              shape: 0, facing: caster.facing,
              dmgMult: useMult, depth: 0,
              curseAllies,
              // Wall crossings (Glacial Rampart): per-crossing surfaces —
              // each segment is its own hit surface, re-armed on exit.
              struck: d.hitOnce ? new Set() : undefined,
              rearm: d.rearmOnExit || undefined,
              // Each wall segment quakes and breathes on its own ledger —
              // and each rides the envelope from its own birth radius (a
              // contracting wall THINS; a blooming one closes its gaps).
              // Madness is the exception: the wall is one ground, one bank.
              pulse: mintPulse(d.delay ?? 0),
              exposure: mintExposure(),
              madden: maddenBank,
              sizeOver,
              radius0: sizeOver ? d.radius * aoeScale : undefined,
              flatBonus,
            });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
          }
          fieldAt = at;
          break;
        }
        // THUNDERMARK cap: the live marker set is bounded (cap + the
        // stormCount stat) — the OLDEST marker fades to make room.
        if (d.marker) {
          const cap = Math.max(1, d.marker.cap
            + Math.round(caster.sheet.get('stormCount', tags, extra)));
          const mine = nativeHost.zones.filter(z =>
            z.caster === caster && z.inst.def.id === def.id && z.marker && !z.exploded);
          while (mine.length >= cap) {
            const oldest = mine.shift()!;
            const zi = nativeHost.zones.indexOf(oldest);
            if (zi !== -1) { nativeHost.expireZone(oldest); nativeHost.zones.splice(zi, 1); }
          }
        }
        const fillTime = d.fillTime ?? (d.lingerDuration ?? 1);
        {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
          pos: at, radius: d.radius * aoeScale * (sizeOver?.from ?? 1),
          caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: cosmeticColor,
          marker: d.marker ? true : undefined,
          // noImpact (Scythe Arc): the zone begins LIVE — no opening hit,
          // no telegraph pop; the linger does all the cutting.
          delay: d.delay ?? 0, exploded: !!d.noImpact,
          impactDress: d.impactDress,
          linger: pulseLinger((d.lingerDuration ?? 0) * caster.sheet.get('effectDuration', tags, extra)),
          tickInterval: groundTick, tickTimer: groundTick0,
          shape: groundShape,
          facing: caster.facing,
          dmgMult: useMult, depth: 0,
          curseAllies,
          pulse: mintPulse(d.delay ?? 0),
          exposure: mintExposure(),
          exposureDomain: expDomain,
          pull: d.pull,
          pullRadius: d.pullRadius ? d.pullRadius * aoeScale : undefined,
          drift: d.drift,
          // Growth: innate (Upheaval) or grafted (Overgrowth's zoneGrow —
          // the delivery's own is the base and wins when present).
          grow: d.grow ?? socketSpec(inst, 'zoneGrow'),
          // The breathing envelope (resolved above): radius0 anchors the
          // walk; while it rides, grow/retract stand down.
          sizeOver,
          radius0: sizeOver ? d.radius * aoeScale : undefined,
          // Revolution rides the aoeSpin stat (innate rotate = the base) —
          // Whirling Sigil spins any faced zone from nothing.
          rotate: (() => {
            const r = caster.sheet.get('aoeSpin', tags, extra, d.rotate ?? 0);
            return r !== 0 ? r : undefined;
          })(),
          // Worn fields: innate (Blizzard Coil's mantle) or grafted
          // (Carried Edge's zoneFollow) — the placement RIDES its caster.
          // A sweep's arc keeps its own trajectory; only the anchor walks.
          follow: d.follow || (socketSpec(inst, 'zoneFollow') ? true : undefined),
          retract: d.retract,
          // Seeking grounds (Creeping Frost's slinking winter).
          seek: d.seek ? { speed: d.seek.speed, range: d.seek.range ?? 420 } : undefined,
          // Maddening cursed ground rides ANY standing ground skill
          // (SupportDef.madden — the instance's one bank).
          madden: maddenBank,
          endBurst: d.endBurst,
          // A socketed Metronome grafts the back-and-forth onto any
          // lingering zone; the delivery's own spec is the innate base.
          pendulum: (() => {
            const ps = hostSockets(inst).find(s => s.def.pendulum)?.def.pendulum ?? d.pendulum;
            return ps
              ? { arc: ps.arcDeg * Math.PI / 180, period: ps.period, base: caster.facing }
              : undefined;
          })(),
          // CONVERGE (Closing Shears): the primary becomes the LEFT hand —
          // half the span, closing onto the cast bearing; its mirrored
          // twin is pushed just after the placement (negative arc walks
          // the same formula backwards — one integrator, two directions).
          sweep: d.sweep
            ? (d.sweep.converge
              ? {
                arc: (d.sweep.arcDeg / 2) * Math.PI / 180,
                base: caster.facing - (d.sweep.arcDeg / 4) * Math.PI / 180,
              }
              : { arc: d.sweep.arcDeg * Math.PI / 180, base: caster.facing })
            : undefined,
          linger0: pulseLinger((d.lingerDuration ?? 0) * caster.sheet.get('effectDuration', tags, extra)),
          leaveTerrain: d.leaveTerrain,
          edge: d.fillFrom,
          fillRate: d.fillFrom ? d.fillFrom / Math.max(0.2, fillTime) : undefined,
          // Emitters & domains ride the PRIMARY placement only — cascades'
          // ripples stay plain zones (no source spam, no bolt storms²).
          // A zoneEmit graft (the pulse-cadence cursed ground) supplies an
          // emitter where the skill brings none.
          emit: d.emit ?? (() => {
            const ze = socketSpec(inst, 'zoneEmit');
            return ze ? { skillId: ze.skillId, interval: ze.interval, at: ze.at } : undefined;
          })(),
          // The emitter's cadence: a socketed graft retunes the spec's own
          // (Volcano's settling eruption; Accelerando's gathering storm).
          emitStep: cadence ?? d.emit?.intervalStep,
          domain: d.domain,
          domainKey: d.domain ? `domain:${nativeHost.domainSeq++}` : undefined,
          // Sweep vocabulary: crescent width (melee-style arc scaling) and
          // once-per-crossing surface semantics (Reap).
          arcRad: d.arcDeg !== undefined
            ? (d.arcDeg * Math.PI / 180) * Math.sqrt(aoeScale) * arcScale
            : undefined,
          struck: d.hitOnce ? new Set() : undefined,
          rearm: d.rearmOnExit || undefined,
          anchor: zoneAnchor,
          flatBonus,
        });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        // The primary placement — captured for the CLAP's twin and the
        // re-cast lane's clones alike (the inheritance law: a re-cast
        // point plays THIS cast, displaced).
        const prime = nativeHost.zones[nativeHost.zones.length - 1];
        // THE CLAP (GroundDelivery.sweep.converge): the mirrored RIGHT
        // hand closes from the other wing onto the same bearing — fresh
        // hit ledger and fresh clocks, no emitter/domain (the cascade-
        // ripple rule: one source per cast). Whatever stands on the
        // meeting line takes BOTH hands; convergence is the crunch, by
        // design. Two hands, one cost.
        if (d.sweep?.converge) {
          {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativePreparation: ReturnType<NativeSceneCombatHost["prepareCombatRecord"]>;
(nativeStorage = nativeHost.zones).push((nativeRecord = {
            ...prime,
            pos: vec(prime.pos.x, prime.pos.y),
            sweep: {
              arc: -((d.sweep.arcDeg / 2) * Math.PI / 180),
              base: caster.facing + (d.sweep.arcDeg / 4) * Math.PI / 180,
            },
            struck: d.hitOnce ? new Set() : undefined,
            emit: undefined, emitTimer: undefined, emitInst: undefined,
            emitInterval: undefined, emitStep: undefined,
            domain: undefined, domainKey: undefined, domainAffected: undefined,
            exposureDomain: undefined,
            marker: undefined, onImpact: undefined,
            madden: maddenBank,
            pulse: mintPulse(d.delay ?? 0),
            exposure: mintExposure(),
          }, nativePreparation = nativeHost.prepareCombatRecord("zones", nativeRecord, "caster", "inst"), nativeRecord));
nativeHost.issuePreparedCombatRecord("zones", nativeStorage, nativeRecord, nativePreparation);
}
        }
        // GROUND CASCADE (the kindred rule + the inheritance law,
        // 2026-07-21): the NATIVE march — the innate spec, ELONGATED by
        // kindred same-direction gems and the aoeCascade stat — ripples
        // out from the impact like a skipped stone, each shock echoing
        // weaker (dmgStep) on a beat (interval). Different-direction
        // cascade gems open the RE-CAST lane instead: their displaced
        // points each play the host's FULL native cast — the primary's
        // clone (linger, ticks, quake, fill) plus the native march
        // walking on from that point — never other grafts (graft →
        // native → terminal: recursion impossible by construction).
        // Composes with temporal repeats: a Crescendo'd Storm Call
        // cascades per echo — the crescendoing, cascading storm.
        {
          const plan = instanceCascadePlan(inst, 'axis');
          const extraCasc = Math.round(caster.sheet.get('aoeCascade', tags, extra));
          const nativeCount = (plan.native?.count ?? 0) + extraCasc;
          // castRange-0 skills (Reap) place AT the caster — angleTo of a
          // zero vector is due EAST; the FACING is the honest axis there.
          const axisAng = dist(caster.pos, at) < 1 ? caster.facing : angleTo(caster.pos, at);
          const stepScale = caster.sheet.get('cascadeStep', tags, extra);
          // One walk serves every lane: the spec's dir draws the points,
          // the BOUNCING BALL (intervalStep / a socketed cadence — each
          // later gap × step, floored so a deep taper never divides by
          // the frame) paces the beats.
          const walkPoints = (
            spec: GroundCascadeSpec | undefined, count: number, from: Vec2,
          ): { x: number; y: number; beatAt: number; k: number }[] => {
            const pts: { x: number; y: number; beatAt: number; k: number }[] = [];
            if (count <= 0) return pts;
            const dir = spec?.dir ?? 'axis';
            const stepLen = (spec?.step ?? d.radius * 1.4) * stepScale;
            const beatStep = cadence ?? spec?.intervalStep ?? 1;
            let beatAt = 0;
            let beatGap = spec?.interval ?? 0;
            for (let k = 1; k <= count; k++) {
              beatAt += beatGap;
              beatGap = Math.max(0.02, beatGap * beatStep);
              if (dir === 'random') {
                const ra = rand(0, Math.PI * 2);
                const rd = stepLen * rand(0.5, 1.5);
                pts.push({ x: from.x + Math.cos(ra) * rd, y: from.y + Math.sin(ra) * rd, beatAt, k });
              } else {
                const sign = dir === 'forward' ? 1 : dir === 'backward' ? -1
                  : (k % 2 === 1 ? 1 : -1);            // 'axis' alternates beyond/short
                const reach = dir === 'axis' ? Math.ceil(k / 2) * stepLen : k * stepLen;
                pts.push({
                  x: from.x + Math.cos(axisAng) * reach * sign,
                  y: from.y + Math.sin(axisAng) * reach * sign, beatAt, k,
                });
              }
            }
            return pts;
          };
          // THE NATIVE MARCH from a base point at a base multiplier — the
          // primary's own walk, and each re-cast point's (the march IS
          // part of the native cast a re-cast replicates).
          const mintMarch = (from: Vec2, baseMult: number, delayBase: number): void => {
            const spec = plan.native;
            const scaleStep = spec?.scaleStep ?? 1;
            const dmgStep = spec?.dmgStep ?? 0.75;
            for (const p of walkPoints(spec, nativeCount, from)) {
              {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
                pos: vec(p.x, p.y),
                radius: d.radius * aoeScale * Math.pow(scaleStep, p.k) * (sizeOver?.from ?? 1),
                caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: cosmeticColor,
                delay: delayBase + p.beatAt, exploded: false,
                linger: pulseLinger((d.lingerDuration ?? 0) * caster.sheet.get('effectDuration', tags, extra)),
                linger0: pulseLinger((d.lingerDuration ?? 0) * caster.sheet.get('effectDuration', tags, extra)),
                tickInterval: groundTick, tickTimer: groundTick0,
                shape: groundShape,
                facing: axisAng,
                dmgMult: baseMult * Math.pow(dmgStep, p.k), depth: 0,
                curseAllies,
                pull: d.pull,
                drift: d.drift,
                grow: d.grow ?? socketSpec(inst, 'zoneGrow'),
                // Ripples breathe too — each on the same walk from its own
                // (scaleStep-shrunk) birth radius.
                sizeOver,
                radius0: sizeOver ? d.radius * aoeScale * Math.pow(scaleStep, p.k) : undefined,
                // Ripples quake too — each on its own displaced clock, its
                // pulse damage riding the ripple's own dmgStep falloff.
                pulse: mintPulse(delayBase + p.beatAt),
                exposure: mintExposure(),
                madden: maddenBank,
                // Ripples inherit the sweep vocabulary — each with a FRESH
                // struck set (per-zone crossing semantics).
                arcRad: d.arcDeg !== undefined
                  ? (d.arcDeg * Math.PI / 180) * Math.sqrt(aoeScale) * arcScale
                  : undefined,
                struck: d.hitOnce ? new Set() : undefined,
                flatBonus,
              });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
            }
          };
          mintMarch(at, useMult, d.delay ?? 0);
          // THE RE-CAST LANE: each different-direction gem's points play
          // the primary's clone — the CLAP's one-source-per-cast strip
          // (no emitter, no domain, no marker) with fresh ledgers and
          // clocks — then march the native walk on from there. The
          // gem's own dmgStep decays its points; its skill-local mods
          // (Spell Cascade's area shrink) already ride the instance.
          for (const r of plan.recasts) {
            const rDmgStep = r.dmgStep ?? 0.75;
            const rScaleStep = r.scaleStep ?? 1;
            for (const p of walkPoints(r, r.count, at)) {
              const mult = useMult * Math.pow(rDmgStep, p.k);
              const delayBase = (d.delay ?? 0) + p.beatAt;
              const scale = Math.pow(rScaleStep, p.k);
              {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativePreparation: ReturnType<NativeSceneCombatHost["prepareCombatRecord"]>;
(nativeStorage = nativeHost.zones).push((nativeRecord = {
                ...prime,
                pos: vec(p.x, p.y),
                radius: prime.radius * scale,
                radius0: prime.radius0 !== undefined ? prime.radius0 * scale : undefined,
                delay: delayBase, exploded: !!d.noImpact,
                linger: prime.linger0 ?? prime.linger,
                linger0: prime.linger0,
                tickInterval: groundTick, tickTimer: groundTick0,
                dmgMult: mult,
                struck: d.hitOnce ? new Set() : undefined,
                madden: maddenBank,
                exposure: mintExposure(),
                pulse: mintPulse(delayBase),
                emit: undefined, emitTimer: undefined, emitInst: undefined,
                emitInterval: undefined, emitStep: undefined,
                domain: undefined, domainKey: undefined, domainAffected: undefined,
                exposureDomain: undefined,
                marker: undefined, onImpact: undefined,
              }, nativePreparation = nativeHost.prepareCombatRecord("zones", nativeRecord, "caster", "inst"), nativeRecord));
nativeHost.issuePreparedCombatRecord("zones", nativeStorage, nativeRecord, nativePreparation);
}
              mintMarch(vec(p.x, p.y), mult, delayBase);
            }
          }
        }
        // Hex Blast: the cursed ground detonates shortly after the cast.
        const hex = caster.sheet.get('hexBlast', tags, extra);
        if (isCurse && hex > 0) {
          {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
            pos: vec(at.x, at.y), radius: d.radius * aoeScale,
            caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: '#b06bd4',
            delay: (d.delay ?? 0) + 0.9, exploded: false,
            linger: 0, tickInterval: 0.5, tickTimer: 0,
            shape: caster.sheet.get('aoeShape', tags, extra),
            facing: caster.facing,
            dmgMult: hex * useMult, depth: 1,
            forceDamage: true,
          });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        }
        fieldAt = at;
        break;
      }

      case 'self':
        nativeHost.showSkillArrival(caster, inst, caster.pos, caster.radius + 18, caster.tier, true);
        // Rites already receipt their real payment. Destructive orders speak
        // at the body actually consumed below, never on an empty command.
        if (!skillRiteVoice(def.id) && !instanceEffects(inst).some(f => f.type === 'detonateMinions' || f.type === 'shatterConstructs'))
          nativeHost.showSelfRelease(caster, inst);
        // FIRE WALKER'S SPRINT (the moveTrail fabric on a movement BUFF —
        // stealth's burning wake): while the working holds, the runner
        // drops trail patches behind every stride, and the trail dies
        // with the buff — unstealthed feet leave no fire. The window is
        // the skill's own primary effect duration (its buff or status,
        // × effectDuration), else the default walk.
        {
          const mtWalk = caster.sheet.get('moveTrail', tags, extra);
          if (mtWalk > 0) {
            let dur = 0;
            for (const fx of instanceEffects(inst)) {
              if (fx.type === 'buff' && fx.duration) dur = Math.max(dur, fx.duration);
              else if (fx.type === 'status') {
                dur = Math.max(dur, STATUS_DEFS[fx.status]?.duration ?? 0);
              }
            }
            const hold = (dur > 0 ? dur : 4)
              * caster.sheet.get('effectDuration', tags, extra);
            const wt = caster as Actor & {
              walkTrail?: { spec: DropZoneSpec; until: number; inst: SkillInstance };
              walkTrailPrev?: Vec2; walkTrailOdo?: number;
            };
            wt.walkTrail = { spec: nativeHost.statTrailSpec(mtWalk), until: nativeHost.time + hold, inst };
            wt.walkTrailPrev = vec(caster.pos.x, caster.pos.y);
            wt.walkTrailOdo = 0;
          }
        }
        // THE AMALGAM: each channel pulse CONSUMES one nearby minion —
        // the mass banks on the casting state; the release fuses it.
        // (Through Ritual Ground, the channeler consumes its OWNER's pack.)
        if (def.amalgam && caster.casting?.mode === 'channel') {
          const lord = caster.owner ?? caster;
          const cs2 = caster.casting;
          if ((cs2.amalgamFed ?? 0) < def.amalgam.cap) {
            let meal: Actor | null = null, bd = def.amalgam.radius;
            for (const m of nativeHost.actors) {
              if (m.owner !== lord || m.dead || m.construct || m.untargetable) continue;
              const dd = dist(caster.pos, m.pos);
              if (dd < bd) { bd = dd; meal = m; }
            }
            if (meal) {
              cs2.amalgamFed = (cs2.amalgamFed ?? 0) + 1;
              nativeHost.kill(meal, true);
              const feedingCue = meal.dead ? feedingCueFlash(meal.pos, caster, def.feedingCue, 'ritual', meal.tier, meal.radius) : undefined;
              if (feedingCue) nativeHost.flashes.push(feedingCue);
            }
          }
        }
        // Other effects below handle the rest (buffs / self-statuses).
        break;

      case 'summon': {
        // Corpse summons (Raise Spectre / Revive): the minion IS the corpse.
        if (d.fromCorpse) {
          // THE GRIMOIRE: mastery replaces scavenging — an attuned bestiary
          // form summons outright, no corpse read or consumed (targeting
          // already resolved to the plain aim point).
          const form = grimoireForm(inst);
          if (form && MONSTERS[form]) {
            nativeHost.spawnMinion(caster, inst, { monsterId: form });
            break;
          }
          if (!targetInfo?.corpse) break;
          // THE WAGON: a plural find hands the rite its whole haul — raise
          // as many as the roster has ROOM for (free slots only; a full
          // roster keeps the classic single-raise rotate), and eat ONLY
          // what stands back up. Cap math mirrors spawnMinion's own.
          const haul = (targetInfo.corpses ?? [targetInfo.corpse])
            .filter(c => nativeHost.corpses.includes(c));
          if (!haul.length) break;
          const rosterCap = Math.max(1, Math.round(
            caster.sheet.get('minionMaxCount', tags, extra, d.maxActive)));
          const standing = (d.poolGroup
            ? nativeHost.minionsOfGroup(caster, d.poolGroup)
            : nativeHost.minionsOfSkill(caster, inst.def.id)).filter(a => !a.summonOffspring).length;
          const raise = Math.max(1, Math.min(haul.length, rosterCap - standing));
          for (let ri = 0; ri < raise; ri++) {
            const corpse = haul[ri];
            nativeHost.withCombatRecord("corpses", corpse, () => nativeHost.removeCorpse(corpse));
            nativeHost.spawnMinion(caster, inst, { monsterId: corpse.defId, pos: corpse.pos });
          }
          nativeHost.corpseSpawn(caster, inst, haul[0].pos, raise);
          break;
        }
        // TOGGLED CONTRACT (PoE2 Spirit style): the SKILL owns the money —
        // reserve × effective SLOTS, priced here at toggle-ON and held
        // across every death (the reconciler queues respawns). Recasting
        // toggles OFF (the useSkill intercept) and frees it.
        if (d.persistent?.toggle) {
          // Already toggled = idempotent (the useSkill intercept handles the
          // OFF-press; a re-entrant ON must never overwrite-and-leak).
          if (caster.summonToggles.has(def.id)) break;
          // Explicit type exclusivity frees rival reservations. Capacity
          // sharing alone never dismisses another type's contract.
          const slots = summonContractSlots(caster, inst, d);
          const reserve = summonReservationUnit(caster, inst, d) * slots;
          let freed = 0;
          if (d.exclusiveGroup) for (const t of caster.summonToggles.values()) {
            const td = instanceDelivery(t.inst);
            if (td.type === 'summon' && td.exclusiveGroup === d.exclusiveGroup) freed += t.reserved;
          }
          if (slots <= 0 || caster.reservedMana - freed + reserve > caster.maxMana()) {
            nativeHost.text(caster.pos, 'cannot sustain', '#d05050', 12);
            break;
          }
          nativeHost.dismissExclusiveSummons(caster, inst, d);
          caster.reservedMana += reserve;
          caster.mana = Math.min(caster.mana, caster.availableMaxMana());
          caster.summonToggles.set(def.id, { inst, reserved: reserve, slots });
          const first = def.hivecall ? 1 : Math.min(slots, Math.max(1, Math.round(
            (d.count + Math.round(caster.sheet.get('summonCount', tags, extra))) * gPow)));
          // A sequencing gem ("scattered in sequence") holds on toggled
          // contracts too: the ON-fill emerges through the SAME grammar
          // the plain path uses below — first body now, the rest on the
          // standing beat. Bare toggles keep the one-frame muster. The
          // reconciler counts the still-emerging bodies as already owed
          // (updateSummonContracts), so a stagger never double-queues
          // respawns; dismissSummonToggle purges the trickle with the
          // contract, so a dead toggle never keeps birthing.
          const seqFill = caster.sheet.get('summonSequence', tags, extra) > 0;
          if (seqFill && first > 1) {
            nativeHost.spawnMinion(caster, inst, { dmgMult: useMult });
            {
let nativeStorage: typeof nativeHost.pendingSummons;
let nativeRecord: typeof nativeHost.pendingSummons[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingSummons).push(nativeRecord = {
              caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), remaining: first - 1, timer: 0.35, interval: 0.35,
              mult: useMult,
            });
nativeHost.issueCombatRecord("pendingSummons", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
          } else {
            for (let i = 0; i < first; i++) nativeHost.spawnMinion(caster, inst, { dmgMult: useMult });
          }
          break;
        }
        nativeHost.dismissExclusiveSummons(caster, inst, d);
        const total = Math.max(1, Math.round(
          (d.count + Math.round(caster.sheet.get('summonCount', tags, extra))) * gPow));
        // Where the bodies emerge: the default ring around the caster, or
        // boiling out of the ground at the CURSOR (Bombardment's portal —
        // the summonAtCursor stat converts any summon the same way).
        const cursorRange = d.placeAt?.range ?? 420;
        const wantCursor = d.placeAt?.at === 'cursor'
          || caster.sheet.get('summonAtCursor', tags, extra) > 0;
        const summonAt = wantCursor
          ? nativeHost.clampPos(dist(caster.pos, aim) <= cursorRange
            ? vec(aim.x, aim.y)
            : vec(caster.pos.x + Math.cos(caster.facing) * cursorRange,
                  caster.pos.y + Math.sin(caster.facing) * cursorRange), 10)
          : undefined;
        const scatter = d.placeAt?.scatter ?? 60;
        const spot = (): Vec2 | undefined => summonAt
          ? vec(summonAt.x + rand(-scatter, scatter), summonAt.y + rand(-scatter, scatter))
          : undefined;
        // CHANNEL-BUT-CASTED: one cast commits N waves on the beat, each
        // re-aimed at the caster's live cursor (the Barrage salvo rule).
        if (d.waves && d.waves.count > 1) {
          for (let i = 0; i < total; i++) nativeHost.spawnMinion(caster, inst, { pos: spot(), dmgMult: useMult });
          // #43: later waves can RE-BILL a fraction of the skill's cost —
          // running dry fizzles the remainder (updatePendingSummons pays).
          const perWave = d.waves.costFactor
            ? (() => {
              const c = caster.skillCost(inst);
              return { mana: c.mana * d.waves!.costFactor!, life: c.life * d.waves!.costFactor! };
            })()
            : undefined;
          {
let nativeStorage: typeof nativeHost.pendingSummons;
let nativeRecord: typeof nativeHost.pendingSummons[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingSummons).push(nativeRecord = {
            caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), remaining: (d.waves.count - 1) * total,
            timer: d.waves.interval, interval: d.waves.interval,
            batch: total, at: summonAt ? vec(summonAt.x, summonAt.y) : undefined,
            trackAim: d.waves.trackAim, scatter,
            range: d.placeAt?.range ?? 420, mult: useMult,
            costPer: perWave,
          });
nativeHost.issueCombatRecord("pendingSummons", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
          break;
        }
        const sequential = caster.sheet.get('summonSequence', tags, extra) > 0;
        if (sequential && total > 1) {
          // First emerges now, the rest scatter out over time.
          nativeHost.spawnMinion(caster, inst, { pos: spot(), dmgMult: useMult });
          {
let nativeStorage: typeof nativeHost.pendingSummons;
let nativeRecord: typeof nativeHost.pendingSummons[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingSummons).push(nativeRecord = {
            caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), remaining: total - 1, timer: 0.35, interval: 0.35,
            at: summonAt, scatter,
          });
nativeHost.issueCombatRecord("pendingSummons", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        } else {
          for (let i = 0; i < total; i++) nativeHost.spawnMinion(caster, inst, { pos: spot(), dmgMult: useMult });
        }
        break;
      }

      case 'storm': {
        // The CAST POINT respects walls (occlusion): clipped to the first
        // shot-blocker along the line — the strikes themselves still fall
        // from the SKY inside the disc (zoneSees never gates storm zones).
        const wantAt = dist(caster.pos, aim) <= d.castRange ? vec(aim.x, aim.y)
          : vec(caster.pos.x + Math.cos(caster.facing) * d.castRange,
                caster.pos.y + Math.sin(caster.facing) * d.castRange);
        const at = nativeHost.clampPos(nativeHost.skillOcclusion(caster, inst) === 'blocked'
          ? nativeHost.clipShot(caster.pos, wantAt, caster.tier) : wantAt, 10);
        // (+ the VENT PRESS's spent rounds — Blowhole: every banked round is
        // one more column, the storm's own count shift.)
        const strikes = Math.max(1, Math.round(
          rollCount(d.count, Math.round(caster.sheet.get('stormCount', tags, extra)) + ventRounds) * gPow));
        // stormImmediate is a FRACTION: that share of the strikes crashes
        // down up-front (nearest enemies first via the sparkfield sort),
        // the rest keep the cadence. 1 = the old all-at-once flag.
        const immFrac = d.interval <= 0 ? 1 : caster.sheet.get('stormImmediate', tags, extra);
        const immCount = Math.round(strikes * immFrac);
        const shape = caster.sheet.get('aoeShape', tags, extra);
        // TELEGRAPHED AREA (Levinfall): the whole scatter disc is SHOWN
        // first — an honest circle every strike then lands inside.
        const fuse = d.telegraph ?? 0;
        if (fuse > 0) {
          nativeHost.flashes.push({
            pos: vec(at.x, at.y), radius: d.areaRadius * aoeScale,
            color: cosmeticColor, life: fuse, maxLife: fuse, edgeFrac: 0.94,
          });
        }
        // SPARKFIELD (atEnemies): strikes plant UNDER the enemies standing
        // in the disc, nearest-first; leftovers scatter as usual. The
        // `scatter` variance offsets each planting — semi-random placement,
        // honest about where it actually lands.
        const sVar = d.scatter ?? 0;
        const under: Vec2[] = d.atEnemies
          ? nativeHost.enemiesOf(caster)
            .filter(e => dist(at, e.pos) <= d.areaRadius * aoeScale)
            .sort((e1, e2) => dist(at, e1.pos) - dist(at, e2.pos))
            .slice(0, strikes)
            .map(e => vec(e.pos.x + rand(-sVar, sVar), e.pos.y + rand(-sVar, sVar)))
          : [];
        // AWAIT RELEASE: strikes placed by a HELD CHANNEL of this skill arm
        // silently — the release sweep detonates them when the hold ends.
        const arming = d.awaitRelease !== undefined
          && caster.casting?.mode === 'channel'
          && caster.casting.inst.def.id === def.id;
        // THE BURIED STRIKE (minter round 2): each storm strike arms the
        // composed pulse plan — Buried Charge re-detonates EVERY strike's
        // ground on the armed beat. The cascade/cadence walks stay OFF
        // storms (a scatter has no bearing to march — deliberately
        // unwired); the imposed afterlife carries NO ordinary ticks (the
        // imposed-surface law: the pulse is the strike's whole linger).
        const stCad = socketSpec(inst, 'cadence')?.intervalStep;
        const stPlan = instancePulsePlan(inst);
        const stSpec = stPlan.native;
        const stN = Math.max(0, (stSpec ? (stSpec.count ?? 1) : 0)
          + Math.round(caster.sheet.get('pulseCount', tags, extra)));
        const stDelay = stSpec?.delay ?? 1;
        const stInterval = stSpec?.interval ?? stDelay;
        const stStep = stCad ?? stSpec?.intervalStep ?? 1;
        const stQueue = flattenPulseQueue(stPlan.appended, stCad);
        let stSpan = 0;
        if (stN > 0) {
          stSpan = stDelay + 0.1;
          let gap = stInterval;
          for (let k = 1; k < stN; k++) { stSpan += gap; gap = Math.max(0.05, gap * stStep); }
          for (const q of stQueue) stSpan += q.delay;
        }
        // THE CLUTCH FABRIC: a birth-bearing storm births at EVERY strike's
        // own landing (the mortar law — the shell is a womb). Stamped on
        // the strike zone, executed at its detonation; onHit rows ride
        // resolveHit's per-victim gate instead of the ring.
        const strikeBirth = (() => {
          const b = instanceBirth(inst);
          return b && !b.onHit ? b : undefined;
        })();
        for (let i = 0; i < strikes; i++) {
          const ang = rand(0, Math.PI * 2);
          const r = Math.sqrt(Math.random()) * d.areaRadius * aoeScale;
          const zDelay = arming ? 9999
            : fuse + (i < immCount ? rand(0.15, 0.3) : 0.3 + (i - immCount) * d.interval);
          {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
            pos: nativeHost.clampPos(i < under.length
              ? vec(under[i].x, under[i].y)
              : vec(at.x + Math.cos(ang) * r, at.y + Math.sin(ang) * r), 10),
            radius: d.hitRadius * aoeScale,
            caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: cosmeticColor,
            delay: zDelay,
            // SKY-BORNE (StormDelivery.sky): the strikes are weather — they
            // hit EVERY side (the caster's own ranks included), pass over
            // dormant un-roused neutrals, and spare anyone under a roof.
            hitAll: d.sky || undefined,
            spareDormant: d.sky || undefined,
            spareRoofed: d.sky || undefined,
            // LOBBED SHOT (render-only): the comet flies caster → landing
            // ring across this strike's own countdown. Armed strikes wait
            // silently — no comet hangs in the air for a held channel.
            lobFrom: d.lob && !arming ? vec(caster.pos.x, caster.pos.y) : undefined,
            lobArc: d.lob?.arc,
            delay0: !arming ? zDelay : undefined,
            impactDress: d.impactDress,
            birth: strikeBirth, // THE CLUTCH FABRIC: the landing is a womb
            fx: skillPresenceVoice(def.id, 'pulse') ?? d.fx,
            onGround: d.onGround, // THE GROUNDED STRIKE: the water boils, the shore does not

            armed: arming || undefined,
            armSeq: arming ? nativeHost.sparkSeq++ : undefined,
            exploded: false,
            linger: stN > 0 ? stSpan : 0,
            tickInterval: stN > 0 ? Infinity : 0.5,
            tickTimer: stN > 0 ? Infinity : 0,
            shape, facing: ang,
            dmgMult: useMult, depth: 0, // storms compose with Aftershocks etc.
            flatBonus,
            pulse: stN > 0
              ? {
                delay: stDelay, interval: stInterval, intervalStep: stStep,
                dmgMult: stSpec?.dmgMult ?? 1, dmgStep: stSpec?.dmgStep ?? 1,
                radiusMult: stSpec?.radiusMult ?? 1, radiusStep: stSpec?.radiusStep ?? 1,
                left: stN, next: 0, // re-stamped at the strike's detonation
                queue: stQueue.length ? [...stQueue] : undefined,
              } : undefined,
          });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        }
        // The storm's AREA is its scatter disc: No Man's Land settles at
        // the storm center (each Meteoric Bombardment pulse refreshes the
        // field at the live cursor — the ground-delivery precedent).
        fieldAt = at;
        break;
      }

      case 'dash': {
        // A willed dash quits a live carom ride first (the saddle law).
        if (caster.caromRun) nativeHost.endCarom(caster, { quiet: true });
        // A mirage left at the launch point that draws enemy attention.
        if (d.decoyDuration) {
          const mirage = nativeHost.constructCombatActor(() => new Actor(`${caster.name}?`, caster.team, vec(caster.pos.x, caster.pos.y)));
          mirage.owner = caster;
          mirage.sourceSkillId = def.id;
          mirage.summonInst = inst;
          mirage.tier = caster.tier;
          // A convincing double wears the full silhouette, not just the tint.
          mirage.shape = caster.shape;
          mirage.color = caster.color;
          mirage.radius = caster.radius;
          mirage.facing = caster.facing;
          mirage.look = caster.look;
          mirage.adorn = caster.adorn;
          mirage.material = caster.material;
          mirage.taunt = true;
          mirage.construct = { kind: 'decoy', range: 0, timer: 0 };
          mirage.sheet.setBase('life', 25 + caster.maxLife() * 0.2);
          mirage.fillResources();
          mirage.lifespan = d.decoyDuration
            * caster.sheet.get('effectDuration', tags, extra);
          { nativeHost.actors.push(mirage); nativeHost.admitCombatBirth(mirage); }
        }
        // A charge release may weight the launch (speedAtFull): the laden
        // comet travels SLOWER — remaining is TIME, so distance holds.
        const dashSpeed = d.speed * (opts.speedMult ?? 1);
        caster.dash = { dir: caster.facing, speed: dashSpeed, remaining: d.distance / dashSpeed };
        nativeHost.movementFlashes.delete(caster);
        nativeHost.movementMoment(caster, inst, 'depart');
        // PHASING dash (DashDelivery.phase — the Iai draw): the ordinary
        // 'phasing' STATUS for the flight plus a breath, so the body goes
        // THROUGH the crowd regardless of mass or poise (separateActors
        // honors the stat) and the icon tells the truth about why.
        if (d.phase) {
          const want = d.distance / dashSpeed + 0.25;
          nativeHost.withCombatStatusSource(caster, caster, inst, () => caster.applyStatus('phasing', 0,
            want / (STATUS_DEFS['phasing']?.duration ?? 4), def.name));
        }
        // Damage along the corridor is applied during movement (update()).
        (caster as Actor & { dashSkill?: SkillInstance }).dashSkill = inst;
        (caster as Actor & { dashHits?: Set<number> }).dashHits = new Set();
        // Fire Walker: a trail spec from the delivery OR the moveTrail stat.
        const mt = caster.sheet.get('moveTrail', tags, extra);
        (caster as Actor & { dashTrailSpec?: typeof d.trailZone }).dashTrailSpec =
          d.trailZone ?? (mt > 0
            ? { radius: 32, duration: 2.2, tickInterval: 0.4, damageScale: mt }
            : undefined);
        // THE STEAM TRAIL (DashDelivery.trailVent — THE SCALD KIT K2's Vent
        // Hop): the run plants a registered FOG BANK every `spacing` units,
        // the Fire Walker trail grammar aimed at the fog fabric. Reach and
        // life are resolved HERE with the cast's own context (the travel
        // ticks carry no tags/extra), the conjure-trail stash's idiom.
        (caster as Actor & { dashVentSpec?: { bank: string; radius: number; duration: number; spacing: number } }).dashVentSpec =
          d.trailVent
            ? {
              bank: d.trailVent.bank,
              radius: d.trailVent.radius * aoeScale,
              duration: d.trailVent.duration * caster.sheet.get('effectDuration', tags, extra),
              spacing: Math.max(20, d.trailVent.spacing ?? 90),
            }
            : undefined;
        // Zephyr Step / Cloudborne: a conjure-trail spec from the delivery
        // OR the cloudTrail stat — the dash lays standing cloud as it
        // travels (sky-road over conjurable void, wind-lane vapor over
        // honest land). Grants resolve HERE, with the cast's context —
        // the travel ticks have no tags/extra to read riders with.
        const ct = caster.sheet.get('cloudTrail', tags, extra);
        const stCT = CONJURE_CFG.statTrail;
        const baseCT = d.trailConjure
          ?? (ct > 0 ? { radius: stCT.radius + ct * stCT.radiusPer, duration: stCT.hold + ct * stCT.holdPer } : undefined);
        (caster as Actor & { dashConjureSpec?: DashConjureStash }).dashConjureSpec = baseCT
          ? {
            radius: baseCT.radius, duration: baseCT.duration,
            grants: nativeHost.conjureGrantsFor(caster, tags, extra,
              (baseCT as { grants?: readonly ConjureGrant[] }).grants),
            ...((baseCT as { look?: string }).look !== undefined
              ? { look: (baseCT as { look?: string }).look } : {}),
          }
          : undefined;
        // Dive Bomb: the launch point erupts (and THE DEPARTURE SPLASH —
        // the Afterspray support — pays here alone).
        nativeHost.moveBlast(caster, inst, caster.pos, 'depart');
        break;
      }

      case 'carom': {
        // THE CAROM MOTOR (the fourth wall — engine/fourthwall.ts): the
        // caster becomes the ball. The worn ride status is the ONE clock —
        // expiry, dispel and the cleanse family all end the ride through
        // the same door — and its def's frameLock is what seals the camera
        // (the status's law, never this delivery's). The payload pays per
        // contact in update() through resolveHit: baseDamage, effects,
        // supports and credit all ride the one pipeline, the dash
        // corridor's grammar on a per-victim rehit clock.
        if (caster.caromRun) nativeHost.endCarom(caster, { quiet: true });
        const caromSpeed = d.speed * (opts.speedMult ?? 1);
        const caromDur = d.duration * caster.sheet.get('effectDuration', tags, extra);
        const rideStatus = d.status ?? 'caroming';
        caster.caromRun = { dir: caster.facing, speed: caromSpeed, status: rideStatus };
        nativeHost.movementFlashes.delete(caster);
        nativeHost.movementMoment(caster, inst, 'depart');
        (caster as Actor & { caromSkill?: SkillInstance }).caromSkill = inst;
        (caster as Actor & { caromHits?: Map<number, number> }).caromHits = new Map();
        (caster as Actor & { caromRung?: Set<number> }).caromRung = new Set();
        // effectDuration folded into the scale here — applyStatus must not
        // fold it twice, so the ride's true seconds ride the ratio alone.
        const rideDef = STATUS_DEFS[rideStatus];
        if (rideDef) nativeHost.withCombatStatusSource(caster, caster, inst, () => caster.applyStatus(rideStatus, 0, caromDur / (rideDef.duration || 1), def.name));
        // Dive Bomb & kin: the launch pays the departure half, so the
        // movement-blast support family composes unchanged.
        nativeHost.moveBlast(caster, inst, caster.pos, 'depart');
        break;
      }

      case 'blink': {
        // A willed blink quits a live carom ride first (the saddle law).
        if (caster.caromRun) nativeHost.endCarom(caster, { quiet: true });
        let dest: Vec2;
        if (d.behindTarget && targetInfo?.actor) {
          // A rear-target blink follows the victim's body heading, not the
          // approach line: flanking an unaware foe must not move us in front.
          const foe = targetInfo.actor;
          const ang = foe.facing + Math.PI;
          dest = vec(
            foe.pos.x + Math.cos(ang) * (foe.radius + caster.radius + 10),
            foe.pos.y + Math.sin(ang) * (foe.radius + caster.radius + 10));
        } else if (targetInfo) {
          dest = vec(targetInfo.pos.x, targetInfo.pos.y);
        } else {
          const dd = Math.min(dist(caster.pos, aim), d.range);
          dest = vec(
            caster.pos.x + Math.cos(caster.facing) * dd,
            caster.pos.y + Math.sin(caster.facing) * dd);
        }
        // THE AFFORDANCE DOCTRINE: the travel line is gated (walls clip it,
        // corners forgive, chasms still jump) — the cast itself never
        // refuses. A Shadow Step at a wall-cornered foe lands on YOUR side
        // of the foe instead of phasing through the masonry behind it.
        // (THE STORY'S OWN CLAMP — the enclosure law: a blink lands on the
        // caster's own story's floor, never through the boards beneath it.)
        dest = nativeHost.affordedDest(caster, inst,
          nativeHost.clampPos(dest, caster.radius, undefined, { mover: caster }));
        // Cloudborne: the vanish-point keeps a cloud where you left (the
        // arrival is already confined to standing ground — departure is
        // the honest half a blink can gift).
        const ctB = caster.sheet.get('cloudTrail', tags, extra);
        if (ctB > 0) {
          const st = CONJURE_CFG.statTrail;
          nativeHost.conjureCloud(caster.pos.x, caster.pos.y,
            st.radius + ctB * st.radiusPer, st.hold + ctB * st.holdPer,
            { caster, grants: nativeHost.conjureGrantsFor(caster, tags, extra) });
        }
        // Fire Walker on a BLINK (the moveTrail fabric beyond dashes): the
        // travel is instantaneous, so the trail is its two truths — a
        // patch where you vanish and one where you arrive (a delayed warp
        // pre-marks the arrival: the fire calls where you land).
        const mtBlink = caster.sheet.get('moveTrail', tags, extra);
        if (mtBlink > 0) {
          const spec = nativeHost.statTrailSpec(mtBlink);
          nativeHost.mintTrailPatch(caster, inst, spec, caster.pos, caster.facing);
          nativeHost.mintTrailPatch(caster, inst, spec, dest, caster.facing);
        }
        // Dive Bomb: erupt where you vanish... (THE DEPARTURE SPLASH — the
        // Afterspray support — pays at this end alone).
        nativeHost.moveBlast(caster, inst, caster.pos, 'depart');
        if (d.delay && d.delay > 0) {
          const visual: Flash = { pos: vec(dest.x, dest.y), radius: caster.radius * 1.6, color: cosmeticColor, life: d.delay, maxLife: d.delay,
            fx: skillMovementVoice(def.id, 'wait'), facing: caster.facing, recoveryCueTier: caster.tier };
          {
let nativeStorage: typeof nativeHost.pendingBlinks;
let nativeRecord: typeof nativeHost.pendingBlinks[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingBlinks).push(nativeRecord = { actor: (nativeRecordSource = caster), dest, timer: d.delay, color: cosmeticColor, inst: (nativeRecordInstance = inst), visual,
            ...(d.behindTarget && targetInfo?.actor ? { faceTarget: targetInfo.actor } : {}) });
nativeHost.issueCombatRecord("pendingBlinks", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
          nativeHost.flashes.push(visual);
        } else {
          nativeHost.teleportActor(caster, dest, cosmeticColor, undefined, caster.tier, def.id);
          if (d.behindTarget && targetInfo?.actor) {
            // Arrival is an atomic turn; the ordinary turn-rate cap must not undo it.
            caster.facingPrev = caster.facing = angleTo(caster.pos, targetInfo.actor.pos);
          }
          // ...and where you reappear (No Man's Land fields drop here too).
          nativeHost.moveBlast(caster, inst, caster.pos);
          nativeHost.dropLingerField(caster, inst, caster.pos);
        }
        break;
      }

      case 'leap': {
        // Echoes and repeats don't re-launch (a mid-air re-leap left the
        // caster permanently untargetable) — the SLAM repeats instead.
        if (caster.leap || opts.noRepeat) {
          const radius = d.radius * aoeScale;
          for (const e of nativeHost.enemiesOf(caster)) {
            if (!sameStory(caster, e)) continue; // (the sovereignty gate)
            if (dist(caster.pos, e.pos) - e.radius <= radius) {
              nativeHost.resolveHit(caster, inst, e, useMult);
            }
          }
          // THE MALLET: the repeated slam is a blast where it stands.
          nativeHost.strikeSurfaces(caster, caster.pos, radius);
          nativeHost.flashes.push({
            pos: vec(caster.pos.x, caster.pos.y), radius,
            color: cosmeticColor, life: 0.3, maxLife: 0.3,
            fx: skillMovementVoice(def.id, 'impact'), facing: caster.facing, recoveryCueTier: caster.tier,
          });
          break;
        }
        const dd = Math.min(dist(caster.pos, aim), d.range);
        // THE AFFORDANCE DOCTRINE: the flight line is gated exactly like the
        // blink's — barred ground shortens the arc to the last afforded
        // point (a leap cast against a wall lands where it began, slam and
        // all), and the telegraph ring below draws at the TRUE landing by
        // construction (drawn == tested).
        // THE STORY'S OWN CLAMP (the tier fabric's enclosure law): the arc
        // ends where the caster's OWN story's floor ends — the mover
        // contract every walker shares (a storey leap stops at the hanging
        // wall, a duct leap at the duct's side; the valley is no landing
        // for a body that never crossed). Flat zones and ground bodies walk
        // the identical base-grid clamp.
        const dest = nativeHost.affordedDest(caster, inst, nativeHost.clampPos(vec(
          caster.pos.x + Math.cos(caster.facing) * dd,
          caster.pos.y + Math.sin(caster.facing) * dd), caster.radius, undefined, { mover: caster }));
        caster.leap = {
          from: vec(caster.pos.x, caster.pos.y), dest,
          total: d.airTime, timer: d.airTime,
          radius: d.radius * aoeScale,
          inst, dmgMult: useMult,
          wasUntargetable: caster.untargetable,
          // CAST HONESTY (LeapDelivery.telegraph): the landing ring rides
          // the leap state — drawn at dest all flight, dodge-readable.
          telegraph: d.telegraph
            ? { color: (typeof d.telegraph === 'object' ? d.telegraph.color : undefined) ?? def.color }
            : undefined,
          // THE VENT-RIDE (LeapDelivery.vent): the flight remembers its
          // column so the renderer draws the steam jet under the rising body.
          vent: d.vent ? { columnR: d.vent.columnR * aoeScale } : undefined,
        };
        caster.untargetable = true; // airborne: nothing can touch them
        nativeHost.movementFlashes.delete(caster);
        nativeHost.movementMoment(caster, inst, 'depart');
        caster.dash = null;
        if (caster.caromRun) nativeHost.endCarom(caster, { quiet: true }); // wings beat the ball

        caster.useLock = Math.max(caster.useLock, d.airTime + 0.1);
        // THE VENT-RIDE's take-off: the departure point ERUPTS — the skill's
        // own hit on every enemy standing in the column (× the vent's scale:
        // the column is the smaller half, the landing the slam), the bells
        // rung, the flash drawn at the tested disc. Owner-safe through the
        // ordinary pipeline (enemiesOf): a player's vent is not terrain.
        // The dodge-minds read the broil through imminentThreatTo during the
        // cast, so a body that stayed chose to.
        if (d.vent) {
          const vr = d.vent.columnR * aoeScale;
          const vScale = useMult * (d.vent.scale ?? 0.6);
          for (const e of nativeHost.enemiesOf(caster)) {
            if (dist(caster.pos, e.pos) - e.radius <= vr) nativeHost.resolveHit(caster, inst, e, vScale);
          }
          nativeHost.strikeSurfaces(caster, caster.pos, vr);
          nativeHost.flashes.push({
            pos: vec(caster.pos.x, caster.pos.y), radius: vr,
            color: '#d9f7fb', life: 0.35, maxLife: 0.35,
          });
        }
        // Cloudborne: the take-off point keeps a cloud underfoot — leap
        // OFF a fraying pad and leave yourself a way back (the landing is
        // already confined to standing ground).
        const ctL = caster.sheet.get('cloudTrail', tags, extra);
        if (ctL > 0) {
          const st = CONJURE_CFG.statTrail;
          nativeHost.conjureCloud(caster.pos.x, caster.pos.y,
            st.radius + ctL * st.radiusPer, st.hold + ctL * st.holdPer,
            { caster, grants: nativeHost.conjureGrantsFor(caster, tags, extra) });
        }
        // Fire Walker on a LEAP: the launch point scorches now, the
        // landing scorches on arrival (updateLeaps) — the two footprints
        // of a flight that touches ground exactly twice.
        const mtLeap = caster.sheet.get('moveTrail', tags, extra);
        if (mtLeap > 0) {
          nativeHost.mintTrailPatch(caster, inst, nativeHost.statTrailSpec(mtLeap), caster.pos, caster.facing);
        }
        // Dive Bomb: the take-off point erupts (and THE DEPARTURE SPLASH —
        // the Afterspray support — pays here alone).
        nativeHost.moveBlast(caster, inst, caster.pos, 'depart');
        break;
      }

      case 'mark': {
        const st = (inst.state ??= {});
        if (st.markPos) {
          // Recall: one-way trip home, then re-arm Mark.
          nativeHost.teleportActor(caster, vec(st.markPos.x, st.markPos.y), cosmeticColor, undefined, undefined, def.id);
          st.markPos = null;
        } else {
          const dd = Math.min(dist(caster.pos, aim), d.castRange);
          const at = nativeHost.clampPos(vec(
            caster.pos.x + Math.cos(caster.facing) * dd,
            caster.pos.y + Math.sin(caster.facing) * dd), 10);
          st.markPos = { x: at.x, y: at.y };
          nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 28, color: cosmeticColor, life: 0.4, maxLife: 0.4,
            fx: skillSelfVoice(def.id), recoveryCueTier: caster.tier });
        }
        break;
      }

      case 'construct': {
        if (challengeOf(inst)?.device) {
          nativeHost.challenges.toss(caster, inst, aim, d, useMult);
          break;
        }
        // A SUMMON graft (Vessel of Shadow) converts the spawn outright:
        // the ghost becomes flesh — a real minion on minion scaling, and no
        // echo construct ever exists to mimic anything. Exclusive by build.
        const sum = instanceSummon(inst);
        if (sum) {
          nativeHost.spawnMinion(caster, inst, { delivery: sum });
          break;
        }
        // Sub-skill instances honor OVER-CAP investment like emit payloads do.
        const castInst = d.castSkillId
          ? makeSkillInstance(SKILLS[d.castSkillId], effectiveSkillLevel(inst))
          : undefined;
        // THE SUB-CAST BOARD (2026-07-22 — the construct-flight synergy):
        // the host's rideable gems board the construct's FIRED payload
        // through the standard fit-gated fixpoint — a Scorched Wake in
        // the ballista burns behind every bolt. The construct BODY still
        // receives no forwarding (the resync rule); only what it CASTS
        // wears the sockets. THE FORWARD PRICE (the user's construct-deck
        // ruling): the forwarded copies fold at the kind's dial — the
        // balance lever over "go ham with it".
        if (castInst) {
          nativeHost.forwardSummonSockets(inst, [castInst], {
            scale: CONSTRUCT_FORWARD_CFG.scale[d.kind ?? ''] ?? CONSTRUCT_FORWARD_CFG.scaleDefault,
          });
        }
        // ECHO RIDERS (Mirage Archer, Shadow Clone): ghosts, not furniture —
        // count/refresh/eviction ride the mirageCount economy.
        if (d.kind === 'echo' && d.echo) {
          nativeHost.spawnEchoRiders(caster, inst, d.echo, def.id + ':self', aim, castInst);
          break;
        }
        // Bone Prison / Cage: a ring of segments around the point (or the
        // resolved target — origin already honors targeting).
        if (d.ring) {
          const reach = Math.min(dist(caster.pos, aim), d.placeRange ?? 320);
          const center = targetInfo?.pos ?? nativeHost.clampPos(vec(
            caster.pos.x + Math.cos(caster.facing) * reach,
            caster.pos.y + Math.sin(caster.facing) * reach), 10);
          const R = d.ring.radius * aoeScale;
          for (let i = 0; i < d.ring.segments; i++) {
            const ang = (i / d.ring.segments) * Math.PI * 2;
            nativeHost.spawnConstruct(caster, inst, d, aim, castInst,
              vec(center.x + Math.cos(ang) * R, center.y + Math.sin(ang) * R));
          }
          break;
        }
        // Barrier walls deploy a line of segments across the facing.
        const segs = d.wallSegments ?? 1;
        if (segs > 1) {
          const reach = Math.min(dist(caster.pos, aim), d.placeRange ?? 100);
          const base = vec(
            caster.pos.x + Math.cos(caster.facing) * reach,
            caster.pos.y + Math.sin(caster.facing) * reach);
          const perp = caster.facing + Math.PI / 2;
          const spacing = 34;
          for (let i = 0; i < segs; i++) {
            const off = (i - (segs - 1) / 2) * spacing;
            nativeHost.spawnConstruct(caster, inst, d, aim, castInst,
              vec(base.x + Math.cos(perp) * off, base.y + Math.sin(perp) * off));
          }
        } else {
          // Charged constructs (Volcano) grow with the hold: useMult from
          // the charge release scales duration and spew rate.
          nativeHost.spawnConstruct(caster, inst, d, aim, castInst, undefined,
            def.castMode === 'charge' ? useMult : 1);
        }
        break;
      }

      case 'aura': {
        nativeHost.activateAura(caster, inst, d, aoeScale);
        break;
      }

      case 'detonateProjectile': {
        // Cold Snap: pop your own in-flight projectile where it flies —
        // or, with nothing in the air, detonate around yourself.
        let best: typeof nativeHost.projectiles[number] | null = null;
        let bd = Infinity;
        for (const pr of nativeHost.projectiles) {
const nativeRecordScope = nativeHost.beginCombatRecord("projectiles", pr);
try {
          if (pr.caster !== caster) continue;
          if (d.requireTag && !pr.inst.def.tags.includes(d.requireTag)) continue;
          const dd = dist(pr.pos, aim);
          if (dd < bd) { bd = dd; best = pr; }
        
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
        const at = best ? vec(best.pos.x, best.pos.y) : vec(caster.pos.x, caster.pos.y);
        if (best) nativeHost.projectiles.splice(nativeHost.projectiles.indexOf(best), 1);
        const mult = (best ? (d.consumeBonus ?? 1.5) : 1) * useMult;
        const radius = d.radius * aoeScale;
        const shape = caster.sheet.get('aoeShape', tags, extra);
        for (const victim of nativeHost.enemiesOf(caster)) {
          if (!inAoe(at, radius, shape, caster.facing, victim.pos, victim.radius)) continue;
          nativeHost.resolveHit(caster, inst, victim, mult, 0, flatBonus);
        }
        // THE MALLET: the pop's own shape strikes the surfaces.
        nativeHost.frontSplash(caster, inst, at, radius);
        nativeHost.strikeSurfaces(caster, at, radius, (p, r) =>
          inAoe(at, radius, shape, caster.facing, p, r));
        nativeHost.flashes.push({
          pos: at, radius, color: cosmeticColor,
          life: 0.35, maxLife: 0.35, shape, facing: caster.facing,
          fx: skillSelfVoice(def.id, 'burst'), recoveryCueTier: caster.tier,
        });
        nativeHost.spawnAftershocks(caster, inst, at, radius, shape);
        // The cascade family beyond ground: the pop's sequels mint here.
        nativeHost.mintAftermath(caster, inst, at, radius, shape,
          caster.facing, useMult, tags, extra);
        fieldAt = at;
        break;
      }

      case 'detonate': {
        const mines = nativeHost.actors.filter(a =>
          a.owner === caster && !a.dead && a.construct?.kind === 'mine');
        mines.forEach((mine, i) => {
          const timer = 0.05 + i * 0.08, fx = skillSelfVoice(def.id, 'prepare');
          const visual: Flash | undefined = fx ? { pos: { ...mine.pos }, radius: mine.radius + 18,
            color: cosmeticColor, life: timer, maxLife: timer, fx, recoveryCueTier: mine.tier } : undefined;
          if (visual) nativeHost.flashes.push(visual);
          {
let nativeStorage: typeof nativeHost.pendingDetonations;
let nativeRecord: typeof nativeHost.pendingDetonations[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
(nativeStorage = nativeHost.pendingDetonations).push(nativeRecord = { mine: (nativeRecordSource = mine), timer, visual });
nativeHost.issueCombatRecord("pendingDetonations", nativeStorage, nativeRecord, nativeRecordSource, undefined);
}
        });
        if (mines.length) nativeHost.showSelfRelease(caster, inst);
        if (!mines.length) nativeHost.text(caster.pos, 'no mines placed', '#8a8678', 11);
        break;
      }
    }

    // No Man's Land: the skill's area leaves a lingering damage field.
    if (fieldAt) nativeHost.dropLingerField(caster, inst, fieldAt, useMult);

    // Caster-side effects (buffs, charges, zones) apply once per use.
    // A wagon-fed use burns LONGER too: offerings and rites stretch per
    // extra body consumed (CORPSE_CFG.batch.durationPerExtra).
    const durScale = caster.sheet.get('effectDuration', tags, extra)
      * (corpseFeast > 0 ? 1 + CORPSE_CFG.batch.durationPerExtra * corpseFeast : 1);
    // THE LUCKY POUR's one roll per press: every restore stream this use
    // opens (the two-lane flask sip) shares it — rolled lazily at the
    // first pour so non-drinking casts never consult the dice.
    let pourCrit: number | undefined;
    for (const fx of instanceEffects(inst)) {
      if (fx.type === 'buff') {
        // THE FUSE defers the worn payload too — the blessing that lands
        // when the powder burns down (delayed buffs). The routing itself
        // (minion war-cry lane, offering share, powerScaled) lives in
        // applyBuffEffect, shared with the fuse sweep's late deliveries.
        const buffFuse = instanceFuse(inst);
        if (buffFuse && !opts.fromFuse) {
          {
let nativeStorage: typeof nativeHost.pendingFuses;
let nativeRecord: typeof nativeHost.pendingFuses[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingFuses).push(nativeRecord = {
            kind: 'buff',
            due: nativeHost.time + buffFuse.delay
              * caster.sheet.get('fuseDelay', tags, extra),
            caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), fx, durScale, mult: useMult,
          });
nativeHost.issueCombatRecord("pendingFuses", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
          nativeHost.text(vec(caster.pos.x, caster.pos.y - caster.radius - 10),
            buffFuse.tell ?? '…', def.color, 11);
        } else {
          nativeHost.applyBuffEffect(caster, inst, fx, durScale, useMult);
        }
      }
      // ABSOLUTION (payLedger): bleed the HOST toggle's account down early
      // — deferral as investment, not a time bomb.
      if (fx.type === 'payLedger') {
        const hostAura = inst.hostSkillId
          ? caster.activeAuras.get(inst.hostSkillId) : undefined;
        if (hostAura?.ledger && hostAura.ledger.balance > 0.5) {
          const paid = Math.min(hostAura.ledger.balance,
            (fx.flat ?? 0) + (fx.pct ?? 0) * hostAura.ledger.balance);
          hostAura.ledger.balance -= paid;
          nativeHost.text(caster.pos, `absolved ${Math.round(paid)}`, '#d8c878', 12);
          nativeHost.flashes.push({
            pos: vec(caster.pos.x, caster.pos.y), radius: caster.radius + 14,
            color: '#d8c878', life: 0.3, maxLife: 0.3,
          });
        } else {
          nativeHost.failNote(caster, def.id + ':noledger', 'nothing owed');
        }
      }
      // THE THRONG SWEEP (throngDirect — the Overlord verb): the carrying
      // skill's whole roster re-aims at the cursor through assault orders;
      // fired per channel pulse, the held sweep TRACKS (engine/throng.ts).
      if (fx.type === 'throngDirect') nativeHost.throngDirect(caster, inst, aim, fx);
      // THE THROW (the grab fabric): release the current catch toward the
      // aim — the holding gate already refused an empty-handed press, so
      // a missing hold here (a race, a monster's optimism) is just quiet.
      // A handoff-tempered throw offers the catch to kin FIRST (THE
      // FRIENDLY CATCH — grabHandoff); only when no eligible receiver
      // stands does the press fall back to the ordinary launch.
      if (fx.type === 'grabThrow' && caster.gripping) {
        const hv = fx.handoff ? nativeHost.actorById(caster.gripping.id) : undefined;
        if (!(fx.handoff && hv && nativeHost.grabHandoff(caster, hv, fx.handoff))) {
          const dir = dist(aim, caster.pos) > 4 ? angleTo(caster.pos, aim) : caster.facing;
          nativeHost.grabThrowRelease(caster, fx.impulse, dir, inst, fx.damageMult);
        }
      }
      // THE RETURN (the possession seam): end the caster's current
      // embodiment, seat home — the Relinquish / Return to Flesh press,
      // reached via the granting gem's 'seatAway' convert face. Quiet
      // no-op when the caster is already home.
      if (fx.type === 'possessEnd') {
        const s = nativeHost.seatOf(caster);
        if (s?.home) nativeHost.seatEject(s, 'press');
      }
      // THE SHAPESHIFT (the possession seam): mint the form at the
      // caster's level through the one createMonster path and move in.
      if (fx.type === 'shapeshift') nativeHost.shapeshiftPress(caster, inst, fx.shift);
      // ORDER THE PACK (minionCast — Skeletal Strike, the Harvester's Reap):
      // every living minion of the HOST skill executes the order skill — at
      // the caster's mark, or each at its own nearest prey. The pack acts;
      // you conduct.
      if (fx.type === 'minionCast' && SKILLS[fx.skillId]) {
        const lord = caster.owner ?? caster;
        const hostId = inst.hostSkillId;
        // THE CONDUCTED-ORDER BOUNDARY (engine/lite.ts): a lite-tier host
        // roster promotes its nearest rows FIRST so the one-voice delegate
        // below has real actors to speak through.
        if (hostId) {
          const hostSpec = lord.skills.find(s => s?.def.id === hostId)?.def.throng;
          if (hostSpec?.tier === 'lite') {
            const kindIdx = nativeHost.liteKindOf(hostSpec.monsterId);
            if (kindIdx >= 0) {
              nativeHost.litePromoteNearest(aim, {
                within: 1e9, max: THRONG_CFG.metaDelegate, story: caster.tier,
                owner: lord.id, kindIdx,
              });
            }
          }
        }
        let troops = nativeHost.actors.filter(m =>
          m.owner === lord && !m.dead && !m.construct
          && (!hostId || nativeHost.minionServes(m, hostId)));
        // ONE VOICE, ONE ACTOR (THE THRONG RULE): a conducted act executes
        // on the NEAREST throng bodies only (THRONG_CFG.metaDelegate) —
        // fifty gathered imps never each cast the execute. Classic minions
        // in the same order are untouched.
        const throngTroops = troops.filter(isThrongBody);
        if (throngTroops.length > THRONG_CFG.metaDelegate) {
          throngTroops.sort((x, y) => dist(x.pos, aim) - dist(y.pos, aim));
          const keep = new Set(throngTroops.slice(0, THRONG_CFG.metaDelegate));
          troops = troops.filter(m => !isThrongBody(m) || keep.has(m));
        }
        let sent = 0;
        for (const m of troops) {
          let orderAt: Vec2 | null = null;
          if ((fx.at ?? 'aim') === 'enemy') {
            let best: Actor | null = null, bd = fx.range ?? 340;
            for (const e of nativeHost.enemiesOf(m)) {
              const dd = dist(m.pos, e.pos);
              if (dd < bd) { bd = dd; best = e; }
            }
            if (best) orderAt = vec(best.pos.x, best.pos.y);
          } else {
            orderAt = vec(aim.x, aim.y);
          }
          if (!orderAt) continue;
          // EXECUTE, never cast (the trap rule): an order with a bar would
          // fight the minion's own AI for the body.
          const order = makeSkillInstance(SKILLS[fx.skillId], effectiveSkillLevel(inst));
          // Conducted casts inherit the minion's OWN loadout: the summon
          // skill that minted m forwards its gems, so an ordered volley
          // splits like a willed one.
          nativeHost.forwardSummonSockets(m.summonInst, [order]);
          m.useLock = 0; m.mana = Math.max(m.mana, m.maxMana());
          nativeHost.executeSkill(m, order, orderAt, { noRepeat: true });
          sent++;
        }
        if (sent === 0) nativeHost.failNote(caster, def.id + ':nominions', 'no minions to command');
      }
      // COMMAND (Attack! / the enemy warcaller's bark): recipients are put
      // UNDER a standing order (the command fabric — ai.ts COMMAND_KINDS):
      // they drop their current agenda, finish any swing in flight, and
      // obey until the order is fulfilled or expires. WHO answers is data
      // (`affects`): the caster's summoned court, or its SQUAD — stamped
      // squadmates plus same-faction kin in earshot (the enemy-command
      // lever). Fired as a META (hostSkillId set), a court order scopes to
      // THAT skill's retinue alone — your bruisers charge without dragging
      // the fragile casters along; the bar-skill form commands the whole
      // court. Every recipient rolls OBEDIENCE (brain tuning, default 1 =
      // utterly loyal) against the issuer's discipline — an unruly pack
      // heeds only in part, and the defiant say so.
      if (fx.type === 'commandMinions') {
        const kind = fx.command ?? 'assault';
        if (!hasCommandKind(kind)) {
          console.warn(`[commandMinions] unknown command kind '${kind}' on ${def.id}`);
        } else {
          const affects = fx.affects ?? 'minions';
          nativeHost.promoteCommandThrong(caster, inst, affects, fx.radius);
          const until = nativeHost.time + (fx.duration ?? COMMAND_CFG.duration);
          const mark = vec(aim.x, aim.y);
          // Point AT a foe and the order PINS it — focus fire, not geography.
          let quarry: Actor | undefined; let qd = COMMAND_CFG.pinRadius;
          for (const e of nativeHost.enemiesOf(caster)) {
            if (e.passive || e.sheet.get('invisible') > 0) continue;
            const dq = dist(e.pos, mark);
            if (dq < qd) { qd = dq; quarry = e; }
          }
          const discipline = (fx.discipline ?? 0) + caster.sheet.get('commandDiscipline');
          let sent = 0, balked = 0;
          const assaultRecipients: Actor[] = [];
          for (const m of nativeHost.actors) {
            if (m === caster || m.dead || m.construct) continue;
            // The whole ownership CHAIN answers the horn: a spectre'd
            // shaman's risen march with the shaman (grand-minions obey
            // the mastermind, not just the first rank).
            const owned = m.ownedBy(caster);
            const squadmate = !m.owner && !m.passive
              && ((caster.squadId !== undefined && m.squadId === caster.squadId)
                || (caster.faction !== undefined && m.faction === caster.faction
                  && dist(m.pos, caster.pos) <= (fx.radius ?? COMMAND_CFG.earshot)));
            const takes = affects === 'minions' ? owned
              : affects === 'squad' ? squadmate : (owned || squadmate);
            if (!takes) continue;
            if (inst.hostSkillId && !nativeHost.minionServes(m, inst.hostSkillId)) continue;
            if (fx.radius !== undefined && dist(m.pos, caster.pos) > fx.radius) continue;
            // THE OBEDIENCE ROLL: loyalty is the recipient's brain dial,
            // discipline the issuer's pressure — both plain data.
            if (!chance(Math.min(1, obedienceOf(m) + discipline))) {
              balked++;
              nativeHost.text(vec(m.pos.x, m.pos.y - 14), 'defies!', '#c08a68', 10);
              continue;
            }
            issueCommand(m, {
              kind, pos: vec(mark.x, mark.y), until,
              radius: fx.markRadius, targetId: quarry?.id, issuerId: caster.id,
            });
            assaultRecipients.push(m);
            sent++;
          }
          nativeHost.assaults.command(caster, inst, assaultRecipients, kind === 'recall');
          if (sent > 0) {
            nativeHost.flashes.push({
              pos: vec(mark.x, mark.y), radius: 40, color: cosmeticColor,
              life: 0.3, maxLife: 0.3,
            });
          } else if (balked > 0) {
            // The whole pack shrugged — the bark alone marks the moment.
            nativeHost.text(vec(caster.pos.x, caster.pos.y - 18), 'unheeded!', '#c08a68', 11);
          } else {
            nativeHost.failNote(caster, def.id + ':nominions', 'no minions to command');
          }
        }
      }
      // THE WHISTLE (the tame skill's meta payload): the bonded companion
      // is pulled to the keeper's side, revived if downed, healed to full.
      // hostSkillId scopes the call to the whistling skill's own bond; a
      // bar-cast whistle (no host) reaches any bond the keeper holds.
      if (fx.type === 'whistleCompanion') {
        // EVERY bonded body answers (one bond today; a full kennel or a
        // hound-pack later — the whistle never picks favorites).
        const bonded = inst.hostSkillId
          ? nativeHost.companionsOfSkill(caster, inst.hostSkillId)
          : nativeHost.actors.filter(a => a.companion && !a.dead && a.owner === caster);
        if (!bonded.length) {
          nativeHost.failNote(caster, def.id + ':nobond', 'no companion bonded');
          nativeHost.refundCooldown(caster, def.id);
        } else {
          bonded.forEach((comp, i) => {
            if (comp.companionDormant) return;
            if (comp.downed) nativeHost.reviveCompanion(comp, 1);
            else nativeHost.recoverCompanion(comp);
            comp.life = comp.maxLife();
            const ang = caster.facing + Math.PI * 0.75 + i * 0.7;
            nativeHost.teleportActor(comp, vec(
              caster.pos.x + Math.cos(ang) * 40,
              caster.pos.y + Math.sin(ang) * 40), '#a8d8a0');
            nativeHost.showCompanionCue(comp, 'answer', caster);
          });
          nativeHost.companionBonds.whistle(caster, inst, aim);
        }
      }
      // THE STANCE SHIFT (the tame skill's meta payload — engine/
      // companionStances.ts): the pressing seat's standing conduct for the
      // host bond walks the cycle (or lands on the named stance). Scoped by
      // hostSkillId like the whistle; a bar-cast shift (no host) walks every
      // bond on the bar; a seatless caster has no conduct to keep — refund.
      if (fx.type === 'companionStance') {
        const seat = nativeHost.seatOf(caster);
        if (!seat) nativeHost.refundCooldown(caster, def.id);
        else nativeHost.cycleCompanionStance(seat, inst.hostSkillId, fx.stance);
      }
      // THE RELOAD (restoreSkillCharges): rounds pour back into use-charge
      // banks. hostSkillId scopes it to the skill this press was minted for
      // (the empty gun's own 'chargesEmpty' convert or meta rack); a skill
      // carrying its own bank tops itself; 'all' sweeps every equipped bank
      // (the bandolier). A host refill also WIPES the host's running
      // cooldown — the ACTIVE reload beats the magazine's lazy clock — and
      // a rack with nothing to load refunds itself (the whistle rule).
      if (fx.type === 'restoreSkillCharges') {
        const banks: SkillInstance[] = [];
        if (fx.scope === 'all') {
          for (const s of caster.skills) if (s && instanceUseCharges(s)) banks.push(s);
        } else if (fx.scope === 'still') {
          // THE PATIENT BANKS only (THE SCALD KIT K2 — Head of Steam feeds
          // the PRESSURE family and nothing else): every equipped bank
          // wearing useCharges.still, native or grafted. Flasks and guns
          // keep their own clocks.
          for (const s of caster.skills) if (s && instanceUseCharges(s)?.still) banks.push(s);
        } else {
          const host = inst.hostSkillId
            ? caster.skills.find(s => s?.def.id === inst.hostSkillId)
            : undefined;
          const own = host ?? (def.useCharges ? inst : undefined);
          if (own && instanceUseCharges(own)) banks.push(own);
        }
        let loaded = 0;
        for (const b of banks) {
          const bank = caster.skillChargeBank(b);
          const cap = caster.skillChargeCap(b);
          const add = Math.min(cap - bank.count, fx.amount ?? cap);
          if (add <= 0) continue;
          bank.count += add;
          bank.reloading = false; // the hands beat the clock
          nativeHost.refundCooldown(caster, b.def.id);
          loaded += add;
          const payloadCues = fx.scope === 'still' ? undefined : payloadTransition(caster, b, 'ammo');
          if (payloadCues) nativeHost.flashes.push(payloadCues);
        }
        if (loaded > 0) {
          // payloadCues and the bank's pips show the rounds actually restored.
          // A per-beat CHANNEL reload that tops its (single) host releases
          // the hands — the drum is full, the pulses stop themselves.
          const cs = caster.casting;
          if (cs && cs.inst === inst && cs.mode === 'channel'
            && (fx.scope ?? 'host') === 'host' && banks.length
            && caster.skillChargeBank(banks[0]).count >= caster.skillChargeCap(banks[0])) {
            cs.held = false;
          }
        } else if (banks.length) {
          nativeHost.refundCooldown(caster, def.id); // nothing to load — never a wasted rack
        }
      }
      if (fx.type === 'relocateConstruct') {
        const c = nativeHost.relocationTarget(caster, inst, fx.radius);
        const host = nativeHost.relocationHosts.get(inst);
        const deployed = host && instanceDelivery(host);
        if (c && deployed?.type === 'construct') {
          const ang = angleTo(caster.pos, aim);
          const reach = Math.min(dist(caster.pos, aim), deployed.placeRange ?? 100);
          c.pos = nativeHost.clampPos(vec(caster.pos.x + Math.cos(ang) * reach,
            caster.pos.y + Math.sin(ang) * reach), c.radius, undefined, { mover: c });
          c.facing = ang;
          c.casting = null; c.push = null;
          nativeHost.flashes.push({ pos: { ...c.pos }, radius: 28, color: cosmeticColor, life: 0.25, maxLife: 0.25 });
          // Keep the same actor, payload, health, lifespan, timers, useLock and
          // cooldowns. No arrival effect, death event, refund or replacement.
        }
      }
      if (fx.type === 'recallMinions') {
        // Convocation: every MOBILE minion blinks to an even ring at the
        // caster. Anchored things stay: constructs, totems, the mid-leap.
        const mobile = nativeHost.actors.filter(m =>
          m.owner === caster && !m.dead && m.isMinion() && !m.construct
          && !m.anchored && !m.leap
          // Ordnance is spent where it lands (the AI leash-recall rule).
          && !MONSTERS[m.defId ?? '']?.noRecall);
        const R = fx.radius ?? caster.radius + 34;
        mobile.forEach((m, i) => {
          const ang = (i / Math.max(1, mobile.length)) * Math.PI * 2;
          m.push = null; // an in-flight shove must not carry through the blink
          // THE SUMMON'S STORY, re-called: the ring seats on the CASTER's
          // layer (the spawn law's sibling — a court convoked upstairs
          // stands upstairs), the arrival confined to that story's floor.
          nativeHost.teleportActor(m, vec(
            caster.pos.x + Math.cos(ang) * R,
            caster.pos.y + Math.sin(ang) * R), def.color, undefined, caster.tier);
        });
      }
      if (d.type === 'self' && fx.type === 'status') {
        nativeHost.withCombatStatusSource(caster, caster, inst, () => caster.applyStatus(fx.status, 0, durScale, def.name));
      }
      if (d.type === 'self' && fx.type === 'absorb') {
        nativeHost.grantAbsorb(caster, skillAbsorbAmount(caster, inst, fx.amount), fx.duration * durScale);
      }
      if (d.type === 'self' && fx.type === 'restore') {
        nativeHost.applyRestore(caster, fx, { tags: def.tags });
      }
      // WARD: the decaying shield pours onto the caster (self deliveries;
      // perCharge scales with what the press consumed — Soul Glut).
      if (d.type === 'self' && fx.type === 'ward') {
        caster.gainWard(fx.amount
          * (fx.perCharge ? Math.max(1, opts.chargesSpent ?? 0) : 1));
      }
      // The flask POUR: a restore stream ticking on the actor (self).
      if (d.type === 'self' && fx.type === 'restoreOverTime') {
        pourCrit ??= nativeHost.critMendMult(caster, inst, caster.pos);
        nativeHost.startRestoreStream(caster, caster, inst, fx, opts.chargesSpent ?? 0, pourCrit);
      }
      // Self-delivered mends and cleanses land on the caster directly.
      if (d.type === 'self' && fx.type === 'heal') {
        nativeHost.applyHealChained(caster, inst, caster, fx, useMult);
      }
      if (d.type === 'self' && fx.type === 'cleanse') {
        nativeHost.cleanseActor(caster, fx.count ?? 2);
      }
      // THE FORM-DROP (ShedEffect): strip one named status off the CASTER
      // through the deliberate dispel lane — delivery-agnostic (a stooping
      // leap folds its own wings at cast; flight re-derives next tick).
      if (fx.type === 'shed') {
        caster.endStatus(fx.status);
      }
      // Terrain effects land at the resolution origin — for blinks that is
      // the DEPARTURE point (Shatterstep's ice patch where you stood).
      if (fx.type === 'terrain') {
        nativeHost.addTempGround(origin, fx.kind, fx.radius * aoeScale, fx.duration * durScale);
      }
      // CONJURED CLOUD (the flux fabric's second half): a standing cloud
      // called into being at the resolution origin — the walkable half
      // holds over conjurable void, the PRESENCE half stands anywhere,
      // granting the call's gifts. Ground deliveries handle their own
      // conjures AT THE TARGET (the case block above); everything else
      // conjures where the skill resolved.
      if (fx.type === 'conjure' && d.type !== 'ground') {
        nativeHost.conjureCloud(origin.x, origin.y, fx.radius * aoeScale, fx.duration * durScale, {
          caster,
          grants: nativeHost.conjureGrantsFor(caster, tags, extra, fx.grants),
          ...(fx.look !== undefined ? { look: fx.look } : {}),
          ...(fx.follow ? { follow: true } : {}),
        });
      }
      // A KINDLED LIGHT from any non-ground delivery stands where the skill
      // resolved (ground deliveries plant at the target, in the case block).
      if (fx.type === 'kindle' && d.type !== 'ground') {
        nativeHost.plantKindle(caster, fx.kind, origin, aoeScale, durScale);
      }
      if (fx.type === 'townPortal') {
        const seat = nativeHost.seats.find(s => s.actor === caster);
        if (seat) nativeHost.openTownPortal(seat);
      }
      // A PLANTED STEAM BANK from any non-ground delivery stands where the
      // skill resolved (ground deliveries plant at the target, above) — a
      // self-cast veils the caster's own feet, a leap's vent its departure.
      if (fx.type === 'vent' && d.type !== 'ground') {
        nativeHost.plantVent(fx, origin, aoeScale, durScale, caster.tier);
      }
      // A POURED SWARM (engine/lite.ts): pool bodies stand at the
      // resolution point — the nest's vent, the shepherd's call. A
      // PROJECTILE delivery pours at the FLIGHT'S END instead (the lobbed
      // pod bursts where it lands — the projectile sweep's own hook).
      if (fx.type === 'litePour' && d.type !== 'projectile') {
        nativeHost.litePourAt(caster, fx, origin);
      }
      // A PLANTED LURE (World.setLure — the beacon fabric's bait lane,
      // finally wearing a skill): a false attraction standing at the
      // resolution point for its seconds. Draws only the UNAWARE — idle,
      // enemy-team, non-passive — never overriding combat, orders or fear;
      // the moths were never a threat and stay none. Projectile deliveries
      // plant at the flight's end (the litePour hook's twin).
      if (fx.type === 'lure' && d.type !== 'projectile') {
        nativeHost.setLure(`skill#${caster.id}#${inst.def.id}`, origin, fx.radius,
          fx.pace ?? 0.5, fx.standoff ?? 90, fx.sec, caster.tier);
      }
      if (fx.type === 'gainCharge') {
        caster.gainCharge(fx.charge, fx.amount, fx.max, inst);
      }
      // MIMIC SELECTION (the slot's meta press — engine/mimic.ts): step or
      // jump the caster's selected captured art; the new face speaks.
      if (fx.type === 'mimicSelect') {
        const sel = mimicSelect(caster, nativeHost.time, fx.sid ?? fx.step ?? 1);
        if (sel && SKILLS[sel.sid]) {
          nativeHost.text(vec(caster.pos.x, caster.pos.y - 24),
            SKILLS[sel.sid].name, SKILLS[sel.sid].color, 12);
        } else if (!sel) {
          nativeHost.failNote(caster, 'mimic:none', 'no art captured');
        }
      }
      // STATUS SIPHON (Draw Corruption — the martyr's draw): PULL the
      // afflictions off nearby flesh onto the CASTER, clocks still
      // running; each drawn wound pays a little healing. The vessel
      // fills itself — Transfusion is how it empties.
      if (fx.type === 'siphonStatus') {
        const radius = fx.radius * aoeScale;
        let drawn = 0;
        for (const a of nativeHost.actors) {
          if (a === caster || a.dead || a.untargetable || a.construct) continue;
          const ally = a.team === caster.team;
          if (fx.from === 'allies' && !ally) continue;
          if (fx.from === 'enemies' && ally) continue;
          if (dist(caster.pos, a.pos) - a.radius > radius) continue;
          for (let i = a.statuses.length - 1; i >= 0; i--) {
            const s = a.statuses[i];
            if (fx.statuses && !fx.statuses.includes(s.id)) continue;
            nativeHost.transplantStatus(caster, s, def.name, { duration: 'remaining' });
            a.statuses.splice(i, 1);
            a.sheet.removeSource('status:' + s.id);
            drawn++;
            if (fx.healPer) {
              caster.healBy(fx.healPer * caster.sheet.get('healPower', tags, extra));
            }
          }
        }
        if (drawn > 0) {
          nativeHost.text(vec(caster.pos.x, caster.pos.y - 22), drawn + ' drawn', def.color, 13);
          nativeHost.flashes.push({
            pos: vec(caster.pos.x, caster.pos.y), radius,
            color: cosmeticColor, life: 0.3, maxLife: 0.3,
          });
        } else {
          nativeHost.failNote(caster, def.id + ':nothing', 'nothing to draw');
        }
      }
      // EXTRACTION (recallImpales): every lodged spear in reach is
      // WRENCHED FREE — the bank pops on its host at damageScale, and the
      // spear flies HOME as a real projectile flat-loaded with a share of
      // the bank, piercing whatever stands along the way to the caster.
      if (fx.type === 'recallImpales') {
        const radius = fx.radius * aoeScale;
        let wrenched = 0;
        for (const e of nativeHost.enemiesOf(caster)) {
          if (e.construct?.breakable) continue;
          if (dist(caster.pos, e.pos) - e.radius > radius) continue;
          for (let si = e.statuses.length - 1; si >= 0; si--) {
            const s = e.statuses[si];
            if (!STATUS_DEFS[s.id]?.dischargeOnHit || !s.rupture || s.rupture <= 0) continue;
            e.statuses.splice(si, 1);
            e.sheet.removeSource('status:' + s.id);
            const bank = s.rupture;
            const burst: Partial<Record<DamageType, number>> = {
              [s.ruptureType ?? 'physical']: bank * (fx.damageScale ?? 1),
            };
            const taken = mitigateTyped(e, burst);
            if (taken > 0) {
              e.life -= taken;
              e.hitFlash = 0.12;
              e.hitFlashType = s.ruptureType ?? 'physical';
              nativeHost.text(e.pos, Math.round(taken).toString(), STATUS_DEFS[s.id]?.color ?? '#c8ccd8', 12);
              if (e.life <= 0 && !e.dead) nativeHost.kill(e, false, caster);
            }
            // The spear itself carries the bank share homeward. Native recalls
            // share a cached payload; tree recalls track their exact source.
            if (SKILLS.impale_spear) {
              const recallImpalesTree = instanceTreeOver(inst)?.recallImpales;
              let spear = recallImpalesTree ? undefined : caster.metaInsts.get('__impale_spear');
              if (!spear || spear.level !== effectiveSkillLevel(inst)) {
                spear = makeSkillInstance(SKILLS.impale_spear, effectiveSkillLevel(inst));
                if (recallImpalesTree) nativeHost.recallTreeSpears.set(spear, inst);
                else caster.metaInsts.set('__impale_spear', spear);
              }
              nativeHost.spawnProjectile(caster, spear, vec(e.pos.x, e.pos.y),
                angleTo(e.pos, caster.pos),
                { flat: { physical: bank * (fx.spearShare ?? 0.5) } });
            }
            wrenched++;
          }
        }
        if (wrenched > 0) {
          nativeHost.text(vec(caster.pos.x, caster.pos.y - 22), wrenched + ' wrenched free!', def.color, 13);
        } else {
          nativeHost.failNote(caster, def.id + ':nospears', 'nothing lodged');
        }
      }
      // UNLEASH (Bloodlust): start the one-way burn — the bank drains and
      // cannot be fed until empty (per-charge mods fade as it goes).
      if (fx.type === 'drainCharge') {
        caster.startChargeDrain(fx.charge, fx.perSec);
      }
      // IRON WARD: arm the accumulate-then-detonate ward (the reduce rides
      // an ordinary buff; the bank lives on the actor until it blows).
      if (fx.type === 'ironWard') {
        const dur = fx.duration * durScale;
        caster.ironWard = {
          stored: 0, cap: fx.cap * caster.sheet.get('poolCap', tags, extra),
          until: nativeHost.time + dur, ratio: fx.ratio,
          radius: fx.radius * aoeScale,
          visualColor: cosmeticColor,
        };
        caster.addBuff({
          type: 'buff', id: 'iron_ward', duration: fx.duration,
          mods: [mod('damageTaken', 'more', -fx.reduce)],
        }, durScale);
      }
      // SELF-DESTRUCT (detonateMinions): the horde's last instruction —
      // hard-resummonables only; contract bodies were never theirs to spend.
      // UNTARGETABLE minions (Raging Spirits) still obey: untargetability
      // shields them from ENEMIES, never from their own summoner's order.
      // Fired as a META (hostSkillId set), the order spends ONLY that
      // skill's bodies — Apotheosis'd spirits pop, the skeletons stand.
      // The bar-skill form (Last Rite) spends the whole congregation.
      if (fx.type === 'detonateMinions') {
        let spent = 0;
        for (const m of [...nativeHost.actors]) {
          if (m.owner !== caster || m.dead || m.construct) continue;
          if (inst.hostSkillId && m.sourceSkillId !== inst.hostSkillId) continue;
          if (m.manaReserved > 0) continue; // persistent contracts refuse
          const sd2 = m.summonInst?.def.delivery;
          if (sd2?.type === 'summon' && sd2.persistent) continue;
          nativeHost.explodeActor(m, fx.fraction, { color: cosmeticColor, visual: skillSelfVoice(def.id, 'burst') });
          if (!m.dead) nativeHost.kill(m, false, caster);
          spent++;
        }
        if (!spent) nativeHost.failNote(caster, def.id + ':nobodies', 'no minions to spend');
      }
      // EXHUME (spawnCorpse): fresh fuel for the corpse economy. THE WAGON,
      // INVERTED: on a producer the corpseBatch stat digs MORE bodies per
      // cast — the same stat that widens a consumer's appetite trades cast
      // cadence for quantity here.
      if (fx.type === 'spawnCorpse' && MONSTERS[fx.monsterId]) {
        const spread = CORPSE_CFG.mint.spread;
        const dug = fx.count
          + Math.max(0, Math.round(caster.sheet.get('corpseBatch', tags, extra)));
        for (let ci = 0; ci < dug; ci++) {
          if (nativeHost.corpses.length >= CORPSE_CFG.max) nativeHost.corpses.shift();
          {
let nativeStorage: typeof nativeHost.corpses;
let nativeRecord: typeof nativeHost.corpses[number];
(nativeStorage = nativeHost.corpses).push(nativeRecord = {
            pos: nativeHost.clampPos(vec(aim.x + rand(-spread, spread), aim.y + rand(-spread, spread)), 10, undefined, { mover: caster }),
            defId: fx.monsterId, level: nativeHost.zone.level,
            tier: caster.tier, // THE SPOILS STORY: dug on the caster's own story
            maxLife: CORPSE_CFG.mint.life + nativeHost.zone.level * CORPSE_CFG.mint.lifePerLevel,
            remaining: CORPSE_CFG.duration,
          });
nativeHost.issueCombatRecord("corpses", nativeStorage, nativeRecord, undefined, undefined);
}
        }
        nativeHost.flashes.push({ pos: vec(aim.x, aim.y), radius: 44, color: cosmeticColor, life: 0.3, maxLife: 0.3 });
      }
      // GATHER THE DEAD (dragCorpses): the graveyard walks — every corpse in
      // reach steps to the mark and piles TIGHT (inside one corpse-find's
      // default search), fuel arranged for whatever comes next. The wagon
      // hauls from farther afield: corpseBatch widens the sweep the same way
      // it widens a feast's footprint.
      if (fx.type === 'dragCorpses') {
        const reach = fx.radius * aoeScale * (1 + CORPSE_CFG.batch.aoePerExtra
          * Math.max(0, Math.round(caster.sheet.get('corpseBatch', tags, extra))));
        let gathered = 0;
        for (const c of nativeHost.corpses) {
          if (dist(aim, c.pos) > reach) continue;
          if ((c.tier ?? nativeHost.spoilStoryAt(c.pos)) !== caster.tier) continue; // its own story's dead only
          const k = gathered++;
          const r = k === 0 ? 0 : 22 + 8 * Math.floor(k / 3);
          c.pos = nativeHost.clampPos(vec(aim.x + Math.cos(k * 2.1) * r, aim.y + Math.sin(k * 2.1) * r), 8);
        }
        if (gathered) {
          nativeHost.flashes.push({ pos: vec(aim.x, aim.y), radius: 40, color: cosmeticColor, life: 0.3, maxLife: 0.3 });
        } else {
          nativeHost.failNote(caster, def.id + ':nobodies', 'no dead to gather');
        }
      }
      // SHATTERRITE (shatterConstructs): the totem-into-mine conversion —
      // your own standing family, spent as ordnance.
      if (fx.type === 'shatterConstructs') {
        let blown = 0;
        for (const t of [...nativeHost.actors]) {
          if (t.owner !== caster || t.dead || !t.construct) continue;
          // BREAKABLE ORDNANCE: burst-bearing objects (spires, walls) are
          // rite-detonable too — their own deathBurst rides the kill
          // artery, so the rite is an ACTIVATION, not a second payload.
          if (t.construct.deathBurst) {
            nativeHost.showSelfRelease(caster, inst, t.pos, t.radius + 18, t.tier);
            nativeHost.kill(t, true);
            blown++;
            continue;
          }
          if (!['totem', 'sentry', 'pylon'].includes(t.construct.kind)) continue;
          nativeHost.burstDamage(vec(t.pos.x, t.pos.y), fx.radius,
            t.maxLife() * fx.fraction, 'physical', cosmeticColor, caster.team, caster.tier, undefined, undefined, skillSelfVoice(def.id, 'burst'));
          nativeHost.kill(t, true);
          blown++;
        }
        if (!blown) nativeHost.failNote(caster, def.id + ':nototems', 'nothing standing to shatter');
      }
      // CHRONO (#19): wind every OTHER clock — never this skill's own.
      if (fx.type === 'reduceCooldowns') {
        let wound = 0;
        for (const [id, t] of [...caster.cooldowns]) {
          if (id === def.id) continue;
          const left = t - (fx.seconds ?? 0) - t * (fx.fraction ?? 0);
          if (left <= 0) caster.cooldowns.delete(id);
          else caster.cooldowns.set(id, left);
          wound++;
        }
        if (wound > 0) nativeHost.text(caster.pos, 'time slips', '#8ae0e8', 12, 'combat');
      }
      if (fx.type === 'guardSurge' && applyGuardSurge(caster, inst, fx)) {
        nativeHost.text(caster.pos, 'TRANSGRESSION!', '#8ab8d8', 14, 'combat');
        nativeHost.flashes.push({ pos: vec(caster.pos.x, caster.pos.y), radius: caster.radius + 16,
          color: '#8ab8d8', life: 0.3, maxLife: 0.3 });
      }
      // LINGERING GROUND: the pool stands at the resolved point — for a
      // BLINK, where the caster STOOD (origin binds pre-step on purpose:
      // Shatterstep erupts behind the escape). A PROJECTILE delivery
      // blooms at the FLIGHT'S END instead (the projectile sweep's hook,
      // the litePour/lure law — the lobbed rite pools where it lands).
      if (fx.type === 'spawnZone' && d.type !== 'projectile') {
        {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
          pos: vec(origin.x, origin.y),
          radius: fx.radius * aoeScale,
          caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: cosmeticColor,
          delay: 0, exploded: true,
          linger: fx.duration * durScale,
          tickInterval: fx.tickInterval ?? 0.5, tickTimer: 0,
          shape: caster.sheet.get('aoeShape', tags, extra),
          facing: caster.facing,
          dmgMult: (fx.damageScale ?? 0.5) * useMult, depth: 1,
        });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
      }
    }

    // A BIRTH from any remaining delivery stands where the skill resolved
    // (THE CLUTCH FABRIC — the kindle/vent law's third sibling): ground
    // births at the target (its case block), storms at every strike's ring
    // (stamped there), projectiles at the flight's end (the sweep's hook),
    // and onHit rows at resolveHit's per-victim gate — so this generic
    // origin lane serves only the rest (novas, dashes, self-rites).
    {
      const cb = instanceBirth(inst);
      if (cb && !cb.onHit && d.type !== 'ground' && d.type !== 'storm'
        && d.type !== 'projectile') {
        nativeHost.birthAt(caster, inst, cb, origin);
      }
    }

    // Repeats & salvos: Multistrike / Spell Echo / Cascade re-executions,
    // plus Unleash seals banked while the skill rested. ECHO RIDERS are
    // exempt: an echo is already a repeat (an ancestral ghost swings ONCE,
    // never a Multistrike train), and their casts must never stamp the
    // shared instance's Unleash bank (inst.state belongs to the owner).
    if (((!opts.noRepeat && !opts.noCooldown) || opts.componentUse) && !caster.construct?.echo) {
      let repeats = Math.round(caster.sheet.get('repeatCount', tags, extra))
        // Charge-fed trains (Riftstorm): every charge burned is one more
        // beat — the Multistrike twin of projectilesPerCharge.
        + Math.round((instanceChargeCost(inst)?.repeatsPerCharge ?? 0) * (opts.chargesSpent ?? 0));
      const unleashMax = caster.sheet.get('unleashMax', tags, extra);
      if (unleashMax > 0) {
        const st = (inst.state ??= {});
        // The rest window runs from the LAST COMPLETION to the PRESS that
        // began this use — the bar itself banks nothing (a long cast must
        // never self-seal; the tradeoff is true idleness).
        const restEnd = st.pressAt ?? nativeHost.time;
        repeats += Math.min(Math.round(unleashMax), Math.max(0,
          Math.floor((restEnd - (st.lastUseAt ?? -999)) / UNLEASH_CFG.interval)));
        st.lastUseAt = nativeHost.time;
      }
      if (repeats > 0) {
        // Independent paid components have no second windup of their own;
        // their repeat beat carries their local attack/cast-speed investment.
        const interval = 0.22 / (opts.componentUse ? caster.speedFactor(inst) : 1);
        // THE ECHO'S MARK: a targeted strike or mend re-finds its body at the
        // drain through the skill's own spec. Corpse specs stay out (their
        // beats already re-seek a fresh load inside executeSkill), engine-
        // handed spec-less payloads have no spec to ask, and a CLAIM keeps one
        // roll per press (the cooldown is tryTame's retry economy).
        const echoSpec = instanceTargeting(inst);
        const echoMark = instanceDelivery(inst).type === 'target' && targetInfo
          && echoSpec && echoSpec.target !== 'corpse' && !def.effects.some(f => f.type === 'tame')
          ? targetInfo.actor ?? (targetInfo.self ? caster : undefined) : undefined;
        {
let nativeStorage: typeof nativeHost.pendingRepeats;
let nativeRecord: typeof nativeHost.pendingRepeats[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingRepeats).push(nativeRecord = {
          caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), aim: vec(aim.x, aim.y),
          n: repeats, k: 1, timer: interval, interval,
          dmgMult: useMult, aoeMult: opts.aoeMult ?? 1,
          scaleStep: caster.sheet.get('repeatScale', tags, extra),
          retarget: caster.sheet.get('repeatRetarget', tags, extra) > 0,
          mark: echoMark,
          // THE FEEDER LOCALITY (2026-07-22, the user's ruling): the train
          // carries NO payment — cost-as-damage mints once, on the pressed
          // cast, as if the skill wore the feeder alone. Echo riders were
          // always unpaid; now the multistrike/unleash train is too.
        });
nativeHost.issueCombatRecord("pendingRepeats", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        if (caster.sheet.get('repeatLock', tags, extra) > 0) {
          caster.useLock = Math.max(caster.useLock, repeats * interval + 0.1);
        }
      }
    }
    // A picked-up remnant empowered THIS cast; now it's spent.
    if (!opts.noRepeat && !opts.noCooldown) nativeHost.consumeRemnants(caster, def);
    // AMMUNITION (imbuements): a completed REAL use of a matching skill
    // spends one round off every consumeOnUse buff (same predicate as
    // remnants — echo/pulse/repeat executions never eat a round).
    if (!opts.noRepeat && !opts.noCooldown) nativeHost.consumeAmmunition(caster, def);
    // THE TALENT FABRIC's cast events (same REAL-use predicate): the
    // recency stamp for movement arts, and the 'cast' proc trigger rolled
    // with the cast's own context (tag-scoped grants work as on hits).
    if (!opts.noRepeat && !opts.noCooldown) {
      if (def.tags.includes('movement')) caster.noteRecent('move');
      // The cast's own aim rides along, so a 'cast' proc's payload (the
      // trigger-on-spell legends) lands where the spell was pointed.
      nativeHost.rollOwnProcs(caster, 'cast', { tags, extra, inst, aim });
    }
    // SELF-STACKS (instanceSelfStack): every completed REAL use feeds the
    // skill's OWN pile — mods that exist only inside this instance's fold
    // (the per-skill frenzy). Decay bleeds in Actor.updateTimers; echo
    // ghosts and pulses never feed it (same predicate as the cycle below).
    if (!opts.noRepeat && !opts.noCooldown) {
      const ss = instanceSelfStack(inst);
      if (ss) {
        const st = (inst.state ??= {});
        st.stackN = Math.min(ss.maxStacks, (st.stackN ?? 0) + 1);
        st.stackT = ss.duration;
      }
    }
    // CAST CYCLE (SkillDef.castCycle): every Nth completed REAL use grants
    // the cycle's buff, then the count resets — "the third cast imbues".
    const castCycle = instanceCastCycle(inst);
    if (!opts.noRepeat && !opts.noCooldown && castCycle) {
      const n = (caster.castCycles.get(def.id) ?? 0) + 1;
      if (n >= castCycle.count) {
        caster.castCycles.set(def.id, 0);
        const cycleBuff = { ...castCycle.buff };
        nativeHost.treeBuffSources.set(cycleBuff, { caster, inst });
        caster.addBuff(cycleBuff, caster.sheet.get('effectDuration', tags, extra));
        nativeHost.text(vec(caster.pos.x, caster.pos.y - 18),
          castCycle.buff.id.replace(/_/g, ' ') + '!', def.color, 12);
      } else {
        caster.castCycles.set(def.id, n);
      }
    }
    // 'use' CHARGE TAPS (skill-innate + support grafts): a completed real
    // use banks its charges — the meta-banking discipline (Stored Verdict).
    if (!opts.noRepeat && !opts.noCooldown) {
      for (const spec of instanceChargeGain(inst)) {
        if (spec.on !== 'use') continue;
        if (spec.chance !== undefined && !chance(spec.chance)) continue;
        caster.gainCharge(spec.charge, spec.amount, spec.max, inst);
      }
    }
    // REMNANT ON CAST (Remnant Conduit): a real use of an elemental school
    // may leave a remnant a step away — collect it to empower the NEXT cast.
    // Sits AFTER consume so this cast's drop can't feed itself.
    if (!opts.noRepeat && !opts.noCooldown && !caster.construct && !caster.owner
      && nativeHost.remnants.length < 14) {
      const rc = caster.sheet.get('remnantOnCast', tags, extra);
      if (rc > 0 && chance(Math.min(0.5, rc))) {
        const els = ELEMENTAL_TYPES.filter(el => def.tags.includes(el));
        if (els.length) {
          const ang = rand(0, Math.PI * 2);
          const r = rand(40, 70);
          {
let nativeStorage: typeof nativeHost.remnants;
let nativeRecord: typeof nativeHost.remnants[number];
(nativeStorage = nativeHost.remnants).push(nativeRecord = {
            pos: nativeHost.clampPos(vec(caster.pos.x + Math.cos(ang) * r,
              caster.pos.y + Math.sin(ang) * r), 8),
            element: pick(els),
            bob: rand(0, Math.PI * 2), life: 14,
          });
nativeHost.issueCombatRecord("remnants", nativeStorage, nativeRecord, undefined, undefined);
}
        }
      }
    }
    // STEALTH: a completed OFFENSIVE use spends one charge and shatters any
    // invisibility — movement and utility keep you hidden (breaksStealth
    // overrides either way; granting skills never self-consume).
    if (!opts.noRepeat && !opts.noCooldown) nativeHost.consumeStealth(caster, def);
    // INVOCATION RUNES: runeForCast selects elemental or schoolless spell fuel while an
    // invoking skill sits on the bar. Channels bank on their own 1/s tick
    // instead (their pulses arrive here noCooldown and stay silent), and
    // invoke payloads never re-bank what they burned.
    if (!opts.noRepeat && !opts.noCooldown && !caster.construct && !def.invokes) {
      nativeHost.bankRune(caster, def);
    }
    // THE COMBO GRAMMAR (engine/sequence.ts): a completed REAL use joins
    // the caster's recent-cast ring and settles any equipped grammar —
    // the runes' real-use gate, minus the invoke exemption (an invoke IS
    // a cast the grammar may read; only what it BURNED never re-banks).
    if (!opts.noRepeat && !opts.noCooldown && !caster.construct) {
      // THE BEAT LAW: a chain step joins the ring as its HOST's beat.
      nativeHost.recordCast(caster, def, inst.chainOf);
      markBodyAction(caster, inst, nativeHost.time, angleTo(caster.pos, aim));
    }
    // THE WITNESS LANE (engine/mimic.ts mimicWitness): a completed enemy
    // art may teach watching seats WITHOUT the blow — reach is each seat's
    // cached witness radius (0 for every build without the lever) and
    // SIGHT referees: an art cast behind a wall teaches nothing.
    if (!opts.noRepeat && !opts.noCooldown && !caster.construct
      && caster.team === 'enemy') {
      for (const s of nativeHost.seats) {
        const p = s.actor;
        if (p.dead || p.kind !== 'player') continue;
        mimicRefreshWatch(p, nativeHost.time);
        if (!p.mimicWatch || p.mimicWitnessR <= 0) continue;
        if (dist(p.pos, caster.pos) > p.mimicWitnessR) continue;
        if (!nativeHost.lineOfSight(p.pos, caster.pos, p.tier, caster.tier)) continue;
        if (mimicCapture(nativeHost, p, caster, def)) {
          nativeHost.notice(`ART WITNESSED: ${def.name}`, '#c8a0e8', 14, 'world'); // off the head, onto the feed (M-CRY: a ledger note is news)
        }
      }
    }
    // ECHO RIDERS (support grafts): a completed REAL use raises/refreshes
    // the ghosts. Channel pulses and scheduled repeats never mint them, and
    // ghosts never mint ghosts (the Spirit-Totem recursion guard). Echo
    // SKILLS route through their construct case — a gem socketed into one
    // contributes only its flat +1 mirageCount (the two-archer rule).
    if (((!opts.noRepeat && !opts.noCooldown) || opts.componentUse) && !caster.construct
      && def.delivery.type !== 'construct') {
      for (const e of instanceEchoes(inst)) {
        nativeHost.spawnEchoRiders(caster, inst, e.spec, e.key, aim, inst);
      }
    }
    // WARDEN RELICS: standing relics ANSWER their owner's completed uses —
    // each casts its payload at itself on its own throttle (construct.timer
    // holds the next-answer world time).
    if (!opts.noRepeat && !opts.noCooldown && !caster.construct) {
      for (const r of nativeHost.actors) {
        const rc2 = r.construct;
        if (!rc2 || rc2.kind !== 'relic' || r.dead || r.owner !== caster) continue;
        if (rc2.timer > nativeHost.time || !rc2.castInst) continue;
        rc2.timer = nativeHost.time + (rc2.castInterval ?? 0.8);
        r.useLock = 0; r.mana = r.maxMana();
        nativeHost.executeSkill(r, rc2.castInst, vec(r.pos.x, r.pos.y),
          { keepFacing: true, noCooldown: true, noRepeat: true });
      }
    }
    // FOLLOW-UP CASTS (SkillDef.followUp / SupportDef.followUp): the
    // swing's follow-through — each spec riding the instance schedules its
    // payload a beat after this completed REAL use, fired FREE (unpaid, no
    // cooldown) at the same aim and minted at the host's effective level
    // (the meta-instance rule). Repeats, echo replays and channel pulses
    // never follow through (the standard real-use gate), and a follow-up
    // never chains follow-ups of its own (noFollowUp rides the fire).
    if (((!opts.noRepeat && !opts.noCooldown) || opts.componentUse) && !opts.noFollowUp && !caster.construct) {
      nativeHost.queueFollowUps(caster, inst, aim, opts.chargesSpent ?? 0);
    }
    // SHADOW MIMIC: living clones replay this use from where they stand.
    // Channel pulses ARE eligible — the per-clone throttle samples a beam
    // into a periodic shadow-lash; repeats and echo replays are not.
    if (!opts.noRepeat && !caster.construct) {
      if (!opts.noCooldown) nativeHost.challenges.completed(caster, inst);
      nativeHost.companionBonds.onCast(caster, inst, aim);
      nativeHost.echoToClones(caster, inst, aim, useMult,
        opts.targetInfo as ResolvedTarget | undefined);
    }
    if (!caster.dead) nativeHost.presenceMoment(caster, 'pulse');
    return true;
  }

export function sceneRecordCast(nativeHost: NativeSceneCombatHost, caster: Actor, def: SkillDef, asId?: string): void {
    // "Does anything here read casts?" — re-asked at most once per
    // watchRefresh: an equipped grammar (combo_<id>, sheet-granted by
    // passives / vocation nodes / equipMods / affixes / MonsterDef mods),
    // a sheet-level comboVaried/comboRepeated conditional, or — players
    // and mercenaries only, the bars that carry support gems — an
    // instance-level conditional from a socketed gem.
    if (nativeHost.time >= caster.comboWatchAt) {
      caster.comboWatchAt = nativeHost.time + COMBO_CFG.watchRefresh;
      let rules: ComboRuleDef[] | null = null;
      for (const rule of COMBO_LIST) {
        if (caster.sheet.get(comboStat(rule.id)) > 0) (rules ??= []).push(rule);
      }
      let watch = !!rules || caster.sheet.usesCondition('comboVaried')
        || caster.sheet.usesCondition('comboRepeated');
      if (!watch && (caster.kind === 'player' || caster.kind === 'mercenary')) {
        outer: for (const inst of caster.skills) {
          if (!inst) continue;
          for (const m of instanceMods(inst)) {
            if (m.when === 'comboVaried' || m.when === 'comboRepeated') {
              watch = true;
              break outer;
            }
          }
        }
      }
      caster.comboRules = rules;
      caster.comboWatch = watch;
      // Un-watched again (grammar unslotted): release the ring — the
      // history is combat-transient, never a leak.
      if (!watch && caster.castRing) {
        caster.castRing = null;
        caster.comboCondBits = 0;
        caster.comboCondLeft = 0;
      }
    }
    if (!caster.comboWatch) return;
    const ring = (caster.castRing ??= []);
    // THE BEAT LAW (`asId` — SkillInstance.chainOf): a comboChain step is
    // recorded as its host's own beat (sid), wearing the step's own tags.
    ring.push({ sid: asId ?? def.id, tags: def.tags, at: nativeHost.time, seq: ++caster.castSeq });
    if (ring.length > COMBO_CFG.ringCap) ring.shift();
    // The starter conditions: stamped now from the fresh tail, decayed by
    // the actor's own clock (Actor.comboCondLeft in updateTimers).
    const varied = comboVariedNow(ring, nativeHost.time);
    const repeated = comboRepeatedNow(ring, nativeHost.time);
    caster.comboCondBits = (varied ? 1 : 0) | (repeated ? 2 : 0);
    caster.comboCondLeft = varied || repeated ? COMBO_CFG.conditionWindow : 0;
    if (!caster.comboRules) return;
    // Settle equipped grammars: match → consume-fresh + icd → payoff. The
    // payoff is an owner-scoped ProcEffect through executeProc — comboCues
    // read the real firing below; canonical gain gates and riders (host
    // 'combo:<id>') all ride the one pipeline.
    const windowScale = caster.sheet.get('comboWindow');
    for (const rule of caster.comboRules) {
      const span = matchComboRule(ring, rule, nativeHost.time, windowScale);
      if (span <= 0) continue;
      const fire = caster.comboFire?.get(rule.id);
      if (fire) {
        if (nativeHost.time - fire.at < (rule.icd ?? COMBO_CFG.defaultIcd)) continue;
        // Spent casts stay spent: the span must hold at least one cast
        // newer than the last firing's consume line (overlap opts out).
        if (!rule.overlap && ring[ring.length - span].seq <= fire.seq) continue;
      }
      (caster.comboFire ??= new Map()).set(rule.id, { at: nativeHost.time, seq: caster.castSeq });
      nativeHost.executeProc({
        id: 'combo:' + rule.id, name: rule.name, color: rule.color,
        trigger: 'hit', effect: rule.effect, announceName: false,
      }, caster, null, null, 0);
    }
  }

export function sceneClampGroundTarget(nativeHost: NativeSceneCombatHost, caster: Actor, aim: Vec2, d: GroundDelivery, inst: SkillInstance): Vec2 {
    const from = caster.pos;
    const dd = dist(from, aim);
    let at: Vec2;
    if (dd <= d.castRange) at = vec(aim.x, aim.y);
    else {
      const ang = angleTo(from, aim);
      at = vec(from.x + Math.cos(ang) * d.castRange, from.y + Math.sin(ang) * d.castRange);
    }
    // WALLS EAT PLACEMENTS (occlusion): the drop point clips to the near
    // side of the first shot-blocker along the cast line — no seeding fire
    // through masonry. Sky-called skills (occlusion 'free') and phasing
    // uses place anywhere in range.
    if (nativeHost.skillOcclusion(caster, inst) === 'blocked') {
      const clipped = nativeHost.clipShot(from, at, caster.tier);
      if (clipped.x !== at.x || clipped.y !== at.y) {
        SIM_TAP.current?.onOccluded?.('place');
        at = clipped;
      }
    }
    return at;
  }

export function sceneEchoToClones(nativeHost: NativeSceneCombatHost, 
    owner: Actor, inst: SkillInstance, aim: Vec2, useMult: number,
    targetInfo?: ResolvedTarget,
  ): void {
    const def = inst.def;
    // Plain damage deliveries only: no spawners, no travel, no banked
    // economies, no side-effect target eaters (corpses stay eaten once).
    if (!['projectile', 'melee', 'nova', 'cone', 'ground', 'storm'].includes(def.delivery.type)) return;
    if (def.pool || instanceTargeting(inst)) return;
    if (!def.baseDamage && !def.effects.some(fx => fx.type === 'damage')) return;
    let clone: Actor | null = null;
    for (const a of nativeHost.actors) {
      if (a.owner !== owner || a.dead || a.construct?.echo?.mode !== 'mimic') continue;
      if (nativeHost.time < (a.construct.echoReadyAt ?? 0)) continue;
      if (!clone || (a.construct.echoReadyAt ?? 0) < (clone.construct!.echoReadyAt ?? 0)) clone = a;
    }
    if (!clone) return;
    const st = clone.construct!;
    // The throttle: deliberate heavy blows echo every time; machine-gun spam
    // and channel beams get SAMPLED — your cadence is the clone's ceiling.
    // The beat was stamped at spawn (spec.interval ÷ constructCastRate, so
    // Synchronicity in the CLONE skill quickens it).
    st.echoReadyAt = nativeHost.time + Math.max(0.25, st.castInterval ?? 0.9);
    const at = targetInfo?.actor && !targetInfo.actor.dead
      ? vec(targetInfo.actor.pos.x, targetInfo.actor.pos.y)
      : vec(aim.x, aim.y);
    clone.facing = angleTo(clone.pos, at);
    {
let nativeStorage: typeof nativeHost.pendingRepeats;
let nativeRecord: typeof nativeHost.pendingRepeats[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingRepeats).push(nativeRecord = {
      caster: (nativeRecordSource = clone), inst: (nativeRecordInstance = inst), aim: at,
      n: 1, k: 0, timer: 0.2, interval: 0.2,
      dmgMult: useMult * (st.echoPower ?? 0.35), aoeMult: 1,
      scaleStep: 0, retarget: false,
    });
nativeHost.issueCombatRecord("pendingRepeats", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
  }

export function sceneActivateAura(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, d: AuraDelivery, aoeScale: number): void {
    if (caster.activeAuras.has(inst.def.id)) return; // duration refresh below
    // OVERDRIVE toggles: ONE per lane (a second same-lane toggle would
    // corrupt the ledger). Checked here; the lane INSTALLS only after every
    // bail-out below has passed (an orphaned lane would be unreachable by
    // all cleanup paths, which key off activeAuras).
    if (d.overdrive && caster.overdrive[d.overdrive.lane]) {
      nativeHost.failNote(caster, inst.def.id + ':lane', 'already overdriven');
      return;
    }
    const tags = skillContextTags(inst);
    const extra = instanceMods(inst);
    // DURATION AURAS (auraDuration graft): the aura burns for a span and
    // COSTS its mana (paid by the press) instead of reserving — capped by
    // the durationAuraCap stat; the OLDEST burning duration-aura gives way.
    const asDuration = socketSpec(inst, 'auraDuration');
    // LIFE RESERVATION (reserveLife graft): the toggle locks LIFE instead
    // of mana — the blood pact rides the same ceiling as overdrive.
    const bloodPact = !asDuration && socketSpec(inst, 'reserveLife') !== undefined;
    let reserved = 0;
    if (d.mode === 'toggle' && d.upkeep?.reserveMana && !asDuration) {
      reserved = d.upkeep.reserveMana * caster.sheet.get('manaCost', tags, extra);
      if (bloodPact) {
        if (caster.reservedLife + reserved > caster.maxLife() * 0.9) {
          nativeHost.text(caster.pos, 'cannot sustain', '#d05050', 12);
          return;
        }
        caster.reservedLife += reserved;
        caster.life = Math.min(caster.life, caster.lifeCeiling());
      } else {
        if (caster.reservedMana + reserved > caster.maxMana()) {
          nativeHost.text(caster.pos, 'cannot sustain', '#d05050', 12);
          return;
        }
        caster.reservedMana += reserved;
        caster.mana = Math.min(caster.mana, caster.availableMaxMana());
      }
    }
    if (asDuration) {
      // Enforce the burning-aura cap: finite-remaining auras count.
      const cap = Math.max(1, Math.round(caster.sheet.get('durationAuraCap', tags, extra)));
      const burning = [...caster.activeAuras.entries()]
        .filter(([, a2]) => Number.isFinite(a2.remaining));
      while (burning.length >= cap) {
        const [oldId] = burning.shift()!;
        nativeHost.deactivateAura(caster, oldId);
      }
    }
    if (d.overdrive) {
      caster.overdrive[d.overdrive.lane] = { inst, debt: 0, idle: 0 };
    }
    // Supports can inject extra ally modifiers into the aura: Capacitor
    // (ES recharge) and Insulation (ES delay) read as skill-local stats
    // here and ride the aura onto everyone it covers.
    let allyMods = d.aura.allyMods;
    const esRecharge = caster.sheet.get('auraEsRecharge', tags, extra);
    const esDelay = caster.sheet.get('auraEsDelay', tags, extra);
    if (esRecharge > 0 || esDelay > 0) {
      allyMods = [...(allyMods ?? [])];
      if (esRecharge > 0) allyMods.push(mod('esRechargeRate', 'increased', esRecharge));
      if (esDelay > 0) allyMods.push(mod('esRechargeDelay', 'increased', -esDelay));
    }
    caster.activeAuras.set(inst.def.id, {
      inst, spec: d.aura,
      allyMods,
      radius: d.aura.radius * aoeScale,
      // Sigils shape auras too: the area test and the rendering both honor it.
      shape: caster.sheet.get('aoeShape', tags, extra),
      remaining: asDuration
        ? asDuration.seconds * caster.sheet.get('effectDuration', tags, extra)
        : d.mode === 'duration'
          ? (d.duration ?? 5) * caster.sheet.get('effectDuration', tags, extra)
          : Infinity,
      lifeLane: bloodPact || undefined,
      reserved, pulseTimer: 0,
      affected: new Set(),
      since: nativeHost.time,
      // THE LEDGER opens at zero — the account accrues from here.
      ledger: d.ledger ? { balance: 0 } : undefined,
    });
    // LIFE SEAL (Mortis Seal): the pool's top locks where it stands —
    // heals pour against the seal until the toggle releases. A SECOND seal
    // can only lock LOWER: stacked seals never raise a standing lock (the
    // Seal of Death → Mortis Seal regen-past-the-lock bug).
    if (d.seal) caster.lifeSealAt = Math.min(caster.lifeSealAt ?? Infinity, caster.life);
    // Bearer-only Form mods (AuraSpec.selfMods): Stormbind's surge — set
    // once here, stripped in deactivateAura. Static by design.
    if (d.aura.selfMods) {
      caster.sheet.setSource('auraself:' + inst.def.id, d.aura.selfMods);
    }
    // REAR-GUARD SHELL (AuraDelivery.shellGuard): the toggle installs a
    // DIRECTIONAL absorb on the bearer — the "energy shield you wear on
    // your back". Pool scales with the guardStrength stat (the guard-hall
    // economy prices this shield too); the toggle-off removes only its own.
    if (d.shellGuard) {
      const s = d.shellGuard;
      const strength = caster.sheet.get('guardStrength', tags, extra);
      const max = s.max * strength;
      caster.shellGuard = {
        side: s.side ?? 'rear', arcDeg: s.arcDeg ?? 180,
        max, pool: max,
        regenDelay: s.regenDelay ?? 3,
        regenRate: s.regenRate ?? max / 5,
        lastHitAt: -999, broken: false,
        color: s.color ?? inst.def.color, shellVisual: s.shellVisual,
        fromAura: inst.def.id,
      };
    }
  }

export function sceneAiHoldOf(nativeHost: NativeSceneCombatHost, cs: CastingState): number {
    const hold = cs.aiHold ?? Infinity;
    if (cs.mode !== 'guard' || cs.aiGuardEarly || cs.bashAt === undefined) return hold;
    const armAt = cs.bashArmAt ?? 0;
    return armAt > 0 && guardBashReady(cs).line ? Math.max(hold, armAt) : hold;
  }

export function sceneReleasePrimedPours(nativeHost: NativeSceneCombatHost, a: Actor): void {
    if (!a.primedPours.length || a.dead) return;
    const banked = a.primedPours;
    a.primedPours = [];
    for (const b of banked) {
      const inst = a.skills.find(s => s?.def.id === b.skillId);
      if (!inst) continue;
      const payloadCues = payloadTransition(a, inst, 'prime', true);
      if (payloadCues) nativeHost.flashes.push(payloadCues);
      const durScale = a.sheet.get('effectDuration',
        skillContextTags(inst), instanceMods(inst));
      const pourCrit = nativeHost.critMendMult(a, inst, a.pos);
      for (const fx of instanceEffects(inst)) {
        if (fx.type === 'restoreOverTime') {
          nativeHost.startRestoreStream(a, a, inst, fx, b.chargesSpent, pourCrit);
        } else if (fx.type === 'buff') {
          nativeHost.applyBuffEffect(a, inst, fx, durScale, 1);
        } else if (fx.type === 'cleanse') {
          nativeHost.cleanseActor(a, fx.count ?? 2);
        } else if (fx.type === 'restore') {
          nativeHost.applyRestore(a, fx, { tags: inst.def.tags });
        } else if (fx.type === 'heal') {
          nativeHost.applyHealChained(a, inst, a, fx, 1);
        } else if (fx.type === 'absorb') {
          nativeHost.grantAbsorb(a, skillAbsorbAmount(a, inst, fx.amount), fx.duration * durScale);
        } else if (fx.type === 'ward') {
          a.gainWard(fx.amount * (fx.perCharge ? Math.max(1, b.chargesSpent) : 1));
        }
      }
      nativeHost.queueFollowUps(a, inst, b.aim ?? a.pos, b.chargesSpent);
    }
  }

export function sceneConjureGrantsFor(nativeHost: NativeSceneCombatHost, caster: Actor, tags: ReadonlySet<SkillTag>, extra: Modifier[],
    base?: readonly ConjureGrant[]): readonly ConjureGrant[] {
    let out: ConjureGrant[] | null = base ? [...base] : null;
    for (const rider of CONJURE_RIDERS) {
      if (caster.sheet.get(rider.stat, tags, extra) > 0) {
        (out ??= []).push(rider.grant);
      }
    }
    return out ?? [];
  }

export function sceneAffordedDest(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, dest: Vec2): Vec2 {
    if (nativeHost.skillOcclusion(caster, inst) !== 'travel') return dest;
    const len = dist(caster.pos, dest);
    if (len <= 1e-6) return dest;
    const hit = affordTravel(nativeHost, caster.pos, dest,
      nativeHost.shotElev(caster.pos, caster.tier));
    if (!hit) return dest;
    const back = Math.max(0, hit.d - LOS_CFG.clipBackoff);
    return nativeHost.clampPos(vec(
      caster.pos.x + (dest.x - caster.pos.x) * (back / len),
      caster.pos.y + (dest.y - caster.pos.y) * (back / len)), caster.radius, undefined, { mover: caster });
  }

export function sceneAiNeedsFireLine(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance): boolean {
    return !!LOS_CFG.aiHoldFire[inst.def.delivery.type]
      && nativeHost.skillOcclusion(caster, inst) === 'blocked';
  }

export function sceneActorTurnRate(nativeHost: NativeSceneCombatHost, a: Actor): number {
    return a.sheet.get(BEHAVIOR_STATS.turnSpeed, undefined, undefined,
      nativeHost.seatOf(a) ? 0 : a.turnSpeed);
  }

export function sceneCastTurnRate(nativeHost: NativeSceneCombatHost, a: Actor, authored: number): number {
    const body = nativeHost.actorTurnRate(a);
    return body > 0 ? Math.min(body, authored) : authored;
  }

export function sceneUpdateCasting(nativeHost: NativeSceneCombatHost, a: Actor, dt: number): void {
    const cs = a.casting;
    if (!cs) return;
const nativeRecordScope = nativeHost.beginCombatRecord("casting", cs);
try {
    if (a.isStunned()) {
      if (cs.mode === 'guard') nativeHost.guardArts.lower(a, cs.inst);
      // A stance-grafted shell (Grafted Carapace) drops with the stance —
      // the interrupt strips both, or the carapace would outlive its guard.
      if (a.shellGuard?.fromAura === cs.inst.def.id) a.shellGuard = undefined;
      a.casting = null;
      const cue = castingEventFlash(a, cs, 'interrupt');
      if (cue) nativeHost.flashes.push(cue);
      return;
    }
    updateCastAim(a);
    // THE LATCHED HAND (engine/cling.ts): a rider casts FROM a seat that
    // moves with its victim — an aim stamped at press goes stale the
    // moment the carried fight turns, and the bite whiffs at the ghost of
    // where the body stood. While the ride holds, every bar tracks the
    // victim's LIVE body instead (the ride IS the fight — updateClings
    // pins aiTargetId to the ridden id, so this is the same law). Seats
    // exempt: a possessed clinger aims with its rider's hands.
    if (a.clingTo && !nativeHost.seatOf(a)) {
      const rv = nativeHost.actorById(a.clingTo.id);
      if (rv && !rv.dead) { cs.aim.x = rv.pos.x; cs.aim.y = rv.pos.y; }
    }
    const def = cs.inst.def;
    const targetInfo = cs.targetInfo as ResolvedTarget | undefined;

    // Monsters hold channels/charges/guards for a little while, then let go.
    // THE ACTING SEAT: a seated body's hold is its own hand's (applyInputs feeds
    // cs.held from the input), every shard player and co-op guest alike, never
    // only this machine's hero. A hired blade keeps the monster's clock: its
    // pilot (MercInput) presses an edge and never holds the button down.
    const holdSeat = nativeHost.seatOf(a);
    if ((!holdSeat || holdSeat.merc) && (cs.mode === 'channel' || cs.mode === 'charge'
      || cs.mode === 'guard' || cs.mode === 'overcharge')) {
      // A completion-gated gather (release.requireFull) is all-or-nothing:
      // the monster holds TO the cap — the readable doom-cast is the
      // design, and breaking it is the player's counterplay. Brim
      // channels (innate or a Gathered Casting conversion) hold to the
      // BRIM: a monster releases at full power or not at all.
      const chSpec = cs.mode === 'channel' ? (cs.gather ?? instanceChannel(cs.inst)) : undefined;
      cs.aiHold ??= chSpec?.release?.requireFull
        ? (chSpec.maxHold ?? 4) + 0.5
        : chSpec?.brim
          ? chSpec.brim.fillTime + 0.4
          : rand(1.2, 2.6);
      // Charge bars release at FULL CHARGE at the latest: elapsed CAPS at
      // total, so an aiHold rolled above it would otherwise hold the cast
      // open forever (wedged monsters, totems, and echo riders mid-charge).
      // A GUARD's hold reads through aiHoldOf — THE SHIELD HAND'S HOLD
      // extends the roll to the bash's arm clock (the mind waits for the
      // answer the player's meter shows) unless the brain opted out.
      const hold = cs.mode === 'charge' ? Math.min(cs.aiHold, cs.total) : nativeHost.aiHoldOf(cs);
      cs.held = (cs.mode === 'charge' ? cs.elapsed : cs.channelTime ?? 0) < hold;
      // A WALLED firing line loses the grip (occlusion): grace, then release
      // — the ray doesn't gnaw stone while the prey walks away. The wall is
      // the player's counterplay; repositioning is the monster's answer.
      if (cs.held && cs.mode === 'channel') {
        const prey = a.aiTargetId !== undefined ? nativeHost.actorById(a.aiTargetId) : undefined;
        if (prey && !prey.dead && nativeHost.aiNeedsFireLine(a, cs.inst)
          && !nativeHost.lineOfFire(a.pos, prey.pos, a.tier)) {
          cs.losLost = (cs.losLost ?? 0) + dt;
          if (cs.losLost >= LOS_CFG.channelGrace) cs.held = false;
        } else if (cs.losLost) {
          cs.losLost = 0;
        }
      }
    }
    // AI FINESSE: monsters with a practiced hand (skillUse.finesse) work the
    // PLAYER's timing mechanics — they "click" the perfect/timed bar through
    // the very same castPress the player uses, earning the same Perfect! /
    // Flawless! empower on a made roll and fumbling the press on a miss.
    if (!nativeHost.seatOf(a) && (cs.mode === 'perfect' || cs.mode === 'timed') && !cs.pressUsed) {
      if (cs.aiClickAt === undefined) {
        const fin = a.brain ? normalizeBrain(a.brain).base.skillUse?.finesse : undefined;
        if (!fin) {
          cs.aiClickAt = -1; // an unpracticed hand never presses
        } else if (Math.random() < fin.chance) {
          // A made roll: land the press inside the window.
          cs.aiClickAt = cs.mode === 'perfect'
            ? rand(0.78, 0.96)
            : Math.max(0.04, Math.min(0.96, (cs.indicatorAt ?? 0.5) + rand(-0.05, 0.05)));
        } else {
          // A fumble: commit the press somewhere it won't land.
          cs.aiClickAt = cs.mode === 'perfect'
            ? rand(0.15, 0.6)
            : Math.max(0.04, Math.min(0.96,
              (cs.indicatorAt ?? 0.5) + (Math.random() < 0.5 ? -1 : 1) * rand(0.16, 0.35)));
        }
      }
      if (cs.aiClickAt >= 0 && cs.total > 0 && cs.elapsed / cs.total >= cs.aiClickAt) {
        nativeHost.castPress(a);
      }
    }

    switch (cs.mode) {
      case 'concentration': {
        // THE PRECISION CAST (ConcentrationSpec): the bar fills only while
        // the live cursor rides the quarry. Focus breaks → the spec's
        // policy (cancel / partial release / drain-to-fizzle). The cooldown
        // stamps however the cast ENDS — refocusing lives INSIDE the bar
        // ('drain'), never in retry spam.
        const spec = def.concentration!;
        const quarry = cs.quarryId !== undefined ? nativeHost.actorById(cs.quarryId) : undefined;
        const quarryLive = !!quarry && !quarry.dead && !quarry.downed
          && !quarry.untargetable && quarry.sheet.get('invisible') <= 0;
        // A brain has no cursor: its focus IS its quarry (auto-track) — to
        // a monster this reads as a slow, interruptible wind-up.
        if (!nativeHost.seatOf(a) && quarryLive) cs.aim = vec(quarry.pos.x, quarry.pos.y);
        const slack = spec.slack ?? CONCENTRATION_CFG.slack;
        const focused = cs.held && quarryLive
          && dist(cs.aim, quarry.pos) <= quarry.radius + slack;
        cs.focusBroken = !focused;
        const end = (fire: boolean, mult = 1): void => {
          if (!fire) cs.aiRecovery = undefined; // abandoned focus earns no completed-cast recovery
          a.casting = null;
          a.useLock = 0.15;
          if (fire) {
            nativeHost.executeSkill(a, cs.inst, vec(cs.aim.x, cs.aim.y), {
              targetInfo: quarryLive
                ? { pos: vec(quarry.pos.x, quarry.pos.y), actor: quarry }
                : { pos: vec(cs.aim.x, cs.aim.y) },
              dmgMult: cs.baseMult * mult,
              paidCost: cs.paidCost, chargesSpent: cs.chargesSpent,
            });
          } else {
            // A fizzle still stamps the clock (executeSkill would have) —
            // the retry economy is the skill's cooldown, not free spam.
            const cue = castingEventFlash(a, cs, 'fizzle');
            if (cue) nativeHost.flashes.push(cue);
            if (def.cooldown > 0) {
              const tags = skillContextTags(def);
              const extra = instanceMods(cs.inst);
              const cd = def.cooldown / Math.max(0.1,
                a.sheet.get('cooldownRecovery', tags, extra) / a.sheet.get('cooldownRecovery'));
              a.cooldowns.set(def.id, cd);
              a.cooldownTotals.set(def.id, cd);
            }
          }
        };
        if (focused) {
          cs.elapsed += dt;
          if (cs.elapsed >= cs.total) end(true, 1);
        } else if ((spec.onBreak ?? 'drain') === 'cancel') {
          end(false);
        } else if ((spec.onBreak ?? 'drain') === 'release') {
          const frac = cs.elapsed / cs.total;
          if (frac >= (spec.minRelease ?? CONCENTRATION_CFG.minRelease)) end(true, frac);
          else end(false);
        } else {
          // 'drain': concentration bleeds until the cursor finds the quarry
          // again. A released BUTTON abandons the cast outright — both
          // hands of focus must hold.
          if (!cs.held) { end(false); return; }
          cs.elapsed -= dt * (spec.drainRate ?? 1);
          if (cs.elapsed <= 0) end(false);
        }
        return;
      }
      case 'guard': {
        const spec = def.guard!;
        const guardHoldTime = spec.maxDuration === undefined ? undefined
          : Math.max(0.05, spec.maxDuration + a.sheet.get('guardHoldTime', skillContextTags(cs.inst), instanceMods(cs.inst)));
        // A player taking the seat owns the hand immediately.
        if (nativeHost.seatOf(a)) {
          cs.aiGuardReleaseAt = undefined;
          cs.aiGuardFacing = undefined;
        }
        cs.channelTime = (cs.channelTime ?? 0) + dt;
        // Facing tracks the aim, but slowly — the shield is heavy.
        const want = angleTo(a.pos, cs.aim);
        const diff = angleDiff(a.facing, want);
        const turn = Math.min(Math.abs(diff), nativeHost.castTurnRate(a, spec.turnRate ?? 2.5) * dt);
        if (cs.aiGuardFacing === undefined) a.facing += Math.sign(diff) * turn;
        else a.facing = cs.aiGuardFacing;
        // The bash tic tracks LIVE stats (a buff landing mid-stance moves
        // the arming line the same frame — and the release check below
        // reads exactly what the bar showed).
        nativeHost.refreshGuardBash(a, cs);
        nativeHost.tickChannelSupports(a, cs, dt);
        // CAST-WHILE-GUARDING metronome: the held stance raises a guardBeat
        // trigger event on its own slow clock — the shield-hand sibling of
        // channelBeat, aimed along the shield. The beat only OFFERS a cast;
        // each gem's LARGE default ICD (TRIGGER_CFG.icd.guardBeat) decides
        // how often one is taken. Depth 0: guards can never be triggered.
        cs.trigBeat = (cs.trigBeat ?? TRIGGER_CFG.guardInterval) - dt;
        if (cs.trigBeat <= 0) {
          cs.trigBeat += TRIGGER_CFG.guardInterval;
          nativeHost.rollTriggers(a, 'guardBeat',
            { aim: vec(cs.aim.x, cs.aim.y), sourceInst: cs.inst });
        }
        // GUARD PULSE (GuardSpec.pulse): the stance tolls its component
        // skill on its own clock while held — free and cooldown-less, the
        // strobe discipline (Defiant Bulwark's rolling challenge).
        if (spec.pulse) {
          cs.guardPulseT = (cs.guardPulseT ?? spec.pulse.interval) - dt;
          if (cs.guardPulseT <= 0) {
            cs.guardPulseT += spec.pulse.interval;
            nativeHost.executeSkill(a, nativeHost.mintMetaInstance(a, cs.inst, spec.pulse.skillId),
              vec(cs.aim.x, cs.aim.y),
              { noCooldown: true, noRepeat: true, keepFacing: true });
          }
        }
        // Timed stances (Riposte) drop themselves.
        if (guardHoldTime && (cs.channelTime ?? 0) >= guardHoldTime) {
          cs.held = false;
        }
        // An authored AI release becomes a readable, committed warning.
        // The guard stays damageable: de-arming it during this beat denies
        // the bash, and breaking/stunning it clears this state with the cast.
        if (!nativeHost.seatOf(a) && !a.dead && (cs.aiGuardWindup ?? 0) > 0) {
          const holdLeft = Math.min(nativeHost.aiHoldOf(cs), guardHoldTime ?? Infinity) - (cs.channelTime ?? 0);
          if ((!cs.held || holdLeft <= cs.aiGuardWindup!)
            && cs.aiGuardReleaseAt === undefined && cs.bashAt !== undefined) {
            // The warning is owed only to a release that WILL convert: the
            // wall on the armed side of its line AND the arm clock run by
            // the end of the windup (guardBashReady's own terms — an early-
            // policy drop before the clock owes nothing, like a battered
            // wall below its line).
            if (guardBashReady(cs).line
              && (cs.channelTime ?? 0) + cs.aiGuardWindup! + 1e-6 >= (cs.bashArmAt ?? 0)) {
              cs.aiGuardReleaseAt = nativeHost.time + cs.aiGuardWindup!;
              cs.aiGuardFacing = a.facing;
              a.aiPlantUntil = Math.max(a.aiPlantUntil, cs.aiGuardReleaseAt);
              // guardReleaseCue reads this live commitment; pressure can erase the threat.
            }
          }
          if (cs.aiGuardReleaseAt !== undefined) cs.held = nativeHost.time + 1e-9 < cs.aiGuardReleaseAt;
        }
        if (!cs.held || a.dead) {
          nativeHost.guardArts.lower(a, cs.inst);
          // SHIELD BASH: releasing at/past the arming line converts the
          // stance into a blow. Everything here is the data the tic
          // showed: cs.bashAt/bashLow are refreshGuardBash's (the one
          // resolver), the payload is what the bar held — or, inverted,
          // what it LOST — and guardBashSpec covers grafted answers too.
          const bash = guardBashSpec(cs.inst);
          const maxShield = cs.maxShield || 1;
          const shieldLeft = Math.max(0, cs.shield ?? 0);
          a.casting = null;
          a.useLock = 0.2;
          // The grafted carapace drops with the stance (fromAura rule).
          if (a.shellGuard?.fromAura === def.id) a.shellGuard = undefined;
          if (def.cooldown > 0) nativeHost.stampSkillCooldown(a, cs.inst, def.cooldown);
          if (bash && !a.dead && cs.bashAt !== undefined) {
            // THE READIED READ: the arm clock has run AND the wall sits on
            // the armed side of its line — exactly the fold the meter and
            // the tic drew gold (guardBashReady). A release before the
            // clock is the plain drop above: cooldown stamped, no blow.
            const payload = cs.bashLow ? maxShield - shieldLeft : shieldLeft;
            if (guardBashReady(cs).ready) nativeHost.guardBash(a, cs.inst, bash, payload);
          }
        }
        return;
      }
      case 'channel': {
        // A Gathered Casting conversion runs on its SYNTHESIZED spec —
        // the def itself has no channel to read. (Skill-mode audit: the
        // resolved view folds a spent node's ramps; the gather wins whole.)
        const ch = cs.gather ?? instanceChannel(cs.inst)!;
        cs.channelTime = (cs.channelTime ?? 0) + dt;
        // CAPPED CHANNEL: the gather has a ceiling — the hold force-
        // releases at maxHold (× effectDuration), payload and all. The
        // cap is TRUE COMPLETION: requireFull payloads read the stamp,
        // and the 'channelFinish' trigger event fires once per unbroken
        // channel (a stun clears casting without ever reaching here —
        // interrupts DENY the finish; that counterplay is the point).
        if (ch.maxHold !== undefined && cs.channelTime >= ch.maxHold
          * a.sheet.get('effectDuration', skillContextTags(def), instanceMods(cs.inst))) {
          cs.held = false;
          cs.hitCap = true;
          if (!cs.finishRolled) {
            cs.finishRolled = true;
            nativeHost.rollTriggers(a, 'channelFinish',
              { aim: vec(cs.aim.x, cs.aim.y), sourceInst: cs.inst });
            nativeHost.tapCharges(a, 'channelFinish');
          }
        }
        // THE BRIM (ChannelSpec.brim): held seconds pour into the skill's
        // PERSISTENT gauge — ÷ fillTime, × cast/attack speed and the
        // brimFill stat, so haste genuinely reaches full sooner. Filling
        // it is a completion too: the finish trigger rolls, and
        // autoRelease lets the brimming bar force its own payoff.
        if (ch.brim) {
          const bm = a.brims ?? (a.brims = new Map());
          let bs = bm.get(def.id);
          if (!bs) { bs = { fill: 0, inst: cs.inst, spec: ch.brim }; bm.set(def.id, bs); }
          bs.inst = cs.inst; // the LIVE loadout (sockets may have changed)
          bs.spec = ch.brim; // …and the LIVE spec (a conversion has no def.channel)
          const rate = a.speedFactor(cs.inst)
            * a.sheet.get('brimFill', skillContextTags(def), instanceMods(cs.inst))
            / Math.max(0.2, ch.brim.fillTime);
          const before = bs.fill;
          bs.fill = Math.min(1, bs.fill + dt * rate);
          if (before < 1 && bs.fill >= 1) {
            const cue = castingEventFlash(a, cs, 'ready');
            if (cue) nativeHost.flashes.push(cue);
            if (!cs.finishRolled) {
              cs.finishRolled = true;
              nativeHost.rollTriggers(a, 'channelFinish',
                { aim: vec(cs.aim.x, cs.aim.y), sourceInst: cs.inst });
              nativeHost.tapCharges(a, 'channelFinish');
            }
            if (ch.brim.autoRelease) { cs.held = false; cs.hitCap = true; }
          }
          // A full bar counts as the cap even on a manual release mid-hold.
          if (bs.fill >= 1) cs.hitCap = true;
        }
        // CAST-WHILE-CHANNELING metronome: the held channel raises a
        // channelBeat trigger event every TRIGGER_CFG.channelInterval —
        // depth 0 (channels can never themselves be triggered), aimed at
        // the live channel aim. Each gem's own ICD paces it further.
        cs.trigBeat = (cs.trigBeat ?? TRIGGER_CFG.channelInterval) - dt;
        if (cs.trigBeat <= 0) {
          cs.trigBeat += TRIGGER_CFG.channelInterval;
          nativeHost.rollTriggers(a, 'channelBeat',
            { aim: vec(cs.aim.x, cs.aim.y), sourceInst: cs.inst });
        }
        // INVOCATION weave: bankRune banks one eligible rune per held
        // second (its pulses stay silent — this tick is the channel's rate).
        cs.runeTick = (cs.runeTick ?? 0) + dt;
        if (cs.runeTick >= 1) {
          cs.runeTick -= 1;
          nativeHost.bankRune(a, def);
        }
        // The aim TRACKS unless the data says locked — or the
        // channelLockAim stat converts it (Anchored Focus: the gather
        // stays at the original mark, Event-Horizon style).
        const track = ch.trackAim !== false
          && a.sheet.get('channelLockAim', skillContextTags(def), instanceMods(cs.inst)) <= 0;
        // ORBITAL SWEEP (channelAutoSpin): the held beam becomes a
        // LIGHTHOUSE — facing revolves at a fixed rate, aim be damned. The
        // pulses still fire along the live facing (aim rides the facing).
        const autoSpin = a.sheet.get('channelAutoSpin', skillContextTags(def), instanceMods(cs.inst));
        if (autoSpin > 0) {
          a.facing += autoSpin * dt;
          const reach = Math.max(60, dist(a.pos, cs.aim));
          cs.aim = vec(a.pos.x + Math.cos(a.facing) * reach,
            a.pos.y + Math.sin(a.facing) * reach);
        }
        // Facing: track the aim, optionally rate-limited (Infernal Ray) —
        // the limit itself is investable (channelTurnRate; Weathervane).
        if (autoSpin <= 0 && track) {
          const want = angleTo(a.pos, cs.aim);
          const rate = nativeHost.castTurnRate(a, ch.turnRate
            ? ch.turnRate * a.sheet.get('channelTurnRate', skillContextTags(def), instanceMods(cs.inst))
            : Infinity);
          if (Number.isFinite(rate)) {
            const diff = angleDiff(a.facing, want);
            const turn = Math.min(Math.abs(diff), rate * dt);
            a.facing += Math.sign(diff) * turn;
          } else {
            a.facing = want;
          }
        }
        if (!cs.held || a.dead) {
          const rel = ch.release;
          const heldT = cs.channelTime ?? 0;
          a.casting = null;
          a.useLock = 0.15;
          if (def.cooldown > 0 && ch.cooldownOnEnd) {
            a.cooldowns.set(def.id, def.cooldown);
          }
          // MINE-CHANNEL (Arcswarm): letting go DETONATES every orb this
          // skill still has in the air — the bank goes up together.
          if (ch.releaseDetonate && !a.dead) {
            for (let pi = nativeHost.projectiles.length - 1; pi >= 0; pi--) {
              const pr = nativeHost.projectiles[pi];
              const nativeMineScope = nativeHost.beginCombatRecord("projectiles", pr);
              try {
              if (pr.caster !== a || pr.inst.def.id !== def.id) continue;
              pr.mult *= ch.releaseDetonate.damageScale;
              nativeHost.explodeProjectile(pr);
              nativeHost.projectiles.splice(pi, 1);
              } finally { nativeHost.endCombatRecord(nativeMineScope); }
            }
          }
          // THE AMALGAM: the release FUSES the fed mass into one horror —
          // size, blows and life scaled by every body consumed.
          if (def.amalgam && !a.dead && (cs.amalgamFed ?? 0) > 0) {
            const lord = a.owner ?? a;
            const n = Math.min(def.amalgam.cap, cs.amalgamFed ?? 0);
            const big = nativeHost.createMonster(def.amalgam.monsterId, lord.level, lord.team, lord);
            big.sourceSkillId = def.id;
            big.radius *= 1 + def.amalgam.perMinion.size * n;
            big.sheet.setSource('amalgam', [
              mod('damage', 'more', def.amalgam.perMinion.damage * n),
              mod('life', 'more', def.amalgam.perMinion.life * n),
            ]);
            big.fillResources();
            big.lifespan = (def.amalgam.duration ?? 20)
              * lord.sheet.get('effectDuration', skillContextTags(def), instanceMods(cs.inst));
            big.pos = nativeHost.clampPos(vec(a.pos.x + 34, a.pos.y), big.radius);
            { nativeHost.actors.push(big); nativeHost.admitCombatBirth(big); }
            nativeHost.showRecoveryCue(big, 'arrive', cs.inst);
          }
          // RELEASE payload (Flame Blast): the gather resolves ONE final
          // time — scaled by held time through the pulse ramp vocabulary,
          // or, with a BRIM riding, by the PERSISTENT bar's fill (the
          // brim's scale walk on its named curve, × the brimPower stat).
          // Taps under minHold fizzle; brim releases under minRelease
          // fizzle WITHOUT spending; requireFull payloads fire only when
          // the hold truly completed (maxHold's ceiling / a filled brim)
          // — an early let-go gets nothing, and a stun never even reaches
          // this branch (the interrupt idiom clears casting outright).
          if (rel && !a.dead && heldT >= (rel.minHold ?? 0)) {
            const brim = ch.brim;
            const bs = brim ? a.brims?.get(def.id) : undefined;
            const bFill = bs?.fill ?? 0;
            const thin = brim !== undefined && bFill < (brim.minRelease ?? 0);
            const unfinished = !!rel.requireFull && !cs.hitCap;
            if (thin || unfinished) {
              const cue = castingEventFlash(a, cs, 'fizzle');
              if (cue) nativeHost.flashes.push(cue);
            } else {
              const power = brim
                ? Math.max(0.05,
                    ((brim.minScale ?? 0.25)
                      + ((brim.maxScale ?? 1) - (brim.minScale ?? 0.25))
                        * evalCurve(brim.curve, bFill))
                    * a.sheet.get('brimPower', skillContextTags(def), instanceMods(cs.inst)))
                : Math.max(0.1, 1 + (rel.dmgRamp ? rampValue(rel.dmgRamp, heldT) : 0));
              nativeHost.executeSkill(a, cs.inst,
                track ? cs.aim : (cs.lockedAim ?? cs.aim), {
                  dmgMult: power * cs.baseMult,
                  aoeMult: Math.max(0.15,
                    1 + (rel.aoeRamp ? rampValue(rel.aoeRamp, heldT) : 0)),
                  keepFacing: true,
                  targetInfo,
                  noCooldown: !!ch.cooldownOnEnd,
                });
              // The payoff drains the bar (BrimSpec.spend, default true).
              if (brim && bs && (brim.spend ?? true)) bs.fill = 0;
            }
          }
          // BUILD → PERSIST-AND-DECAY (Hailcrown): the released work keeps
          // pulsing on its own — duration bought by the hold, power frozen
          // at the released ramp and fading as the clock runs out.
          if (ch.persist && !a.dead && heldT >= (ch.persist.minHold ?? 0.4)) {
            const pTags = skillContextTags(def);
            const pExtra = instanceMods(cs.inst);
            const total = Math.min(
              ch.persist.maxDuration ?? 8,
              heldT * ch.persist.perHeldSec,
            ) * a.sheet.get('effectDuration', pTags, pExtra);
            if (total > 0.1) {
              {
let nativeStorage: typeof nativeHost.pendingPersists;
let nativeRecord: typeof nativeHost.pendingPersists[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingPersists).push(nativeRecord = {
                caster: (nativeRecordSource = a), inst: (nativeRecordInstance = cs.inst),
                interval: Math.max(0.1, ch.interval / a.speedFactor(cs.inst)),
                timer: 0,
                remaining: total, total,
                powerMult: Math.max(0.1,
                  (1 + (ch.ramp ? rampValue(ch.ramp, heldT) : 0)) * cs.baseMult),
                fade: ch.persist.fade ?? 0.35,
              });
nativeHost.issueCombatRecord("pendingPersists", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
            }
          }
          return;
        }
        nativeHost.tickChannelSupports(a, cs, dt);
        cs.pulseTimer = (cs.pulseTimer ?? 0) - dt;
        if (cs.pulseTimer <= 0) {
          // TARGETED channels re-acquire per pulse (Healing Stream follows
          // the wounded around the fight); a beat with no valid target
          // HOLDS — nothing paid, nothing fired, the channel stays up.
          let pulseTarget: ResolvedTarget | undefined;
          if (instanceTargeting(cs.inst)) {
            const ti = nativeHost.resolveTargeting(a, cs.inst, cs.aim);
            if (!ti) { cs.pulseTimer += cs.total; break; }
            pulseTarget = ti;
          }
          const t = cs.channelTime;
          const tags = skillContextTags(def);
          const extra = instanceMods(cs.inst);
          // Skill-data ramps plus the Patient Fury support's stat-driven ramp.
          // Ramp CURVES let a channel back-load its power: quadratic starts
          // feeble and compounds; exponential doubles each held second — a
          // short hold is a fraction of the linear payout, a long one eclipses it.
          const rampT = (r: { per: number; max: number; curve?: string }): number =>
            Math.min(r.max, r.per * (r.curve === 'quadratic' ? t * t
              : r.curve === 'exponential' ? Math.pow(2, t) - 1 : t));
          // Each pulse pays the skill's cost — GROWN by the cost ramp when
          // the channel declares one (the Black Hole's escalating price);
          // running dry ends the channel.
          const cost = a.skillCost(cs.inst);
          // GATHERED CASTING pays in micro-beats: interval/fillTime of the
          // full price per pulse — a complete bank totals ≈ one honest cast.
          if (cs.gather?.brim) {
            const f = cs.gather.interval / Math.max(0.2, cs.gather.brim.fillTime);
            cost.mana *= f;
            cost.life *= f;
          }
          if (ch.costRamp) {
            const costMult = 1 + rampT(ch.costRamp);
            cost.mana *= costMult;
            cost.life *= costMult;
          }
          if (!a.canAfford(cost)) {
            cs.held = false;
            return;
          }
          nativeHost.paySkillCost(a, cs.inst, cost);
          // ERRATIC CADENCE (ChannelSpec.intervalJitter): each fired beat
          // reschedules the next on its own fresh die — stutters and
          // lulls around the same average drumbeat.
          cs.pulseTimer += cs.total * (ch.intervalJitter
            ? rand(ch.intervalJitter[0], ch.intervalJitter[1]) : 1);
          const rampStat = a.sheet.get('channelRamp', tags, extra);
          // Negative ramps CONVERGE — floored so a long hold squeezes the
          // wedge toward a line without inverting or vanishing entirely.
          const dmg = Math.max(0.1, 1 + (ch.ramp ? rampT(ch.ramp) : 0)
            + (rampStat > 0 ? Math.min(1.5, rampStat * t) : 0));
          const aoe = Math.max(0.15, 1 + (ch.rampAoe ? rampT(ch.rampAoe) : 0));
          const arc = Math.max(0.1, 1 + (ch.rampArc ? rampT(ch.rampArc) : 0));
          // Spooling: channeled projectile skills wind up extra shots —
          // time-fed (channelSpool) and hit-fed (channelHitSpool ×
          // landed hits this channel) alike, under ONE investable cap.
          const spool = a.sheet.get('channelSpool', tags, extra);
          const hitSpool = a.sheet.get('channelHitSpool', tags, extra);
          const spooled = Math.min(
            Math.floor(a.sheet.get('channelSpoolCap', tags, extra)),
            (spool > 0 ? Math.floor(spool * t) : 0)
            + (hitSpool > 0 ? Math.floor(hitSpool * (cs.hitSpool ?? 0)) : 0));
          // Pure GATHERS (release.pulses === false) pay the beat but fire
          // nothing — the release delivers everything banked.
          if (ch.release?.pulses === false) {
            nativeHost.flashes.push({
              pos: vec(a.pos.x, a.pos.y),
              radius: 16 + 30 * Math.min(1, t / 4), color: def.color,
              life: 0.15, maxLife: 0.15,
            });
            break;
          }
          nativeHost.executeSkill(a, cs.inst,
            track ? cs.aim : (cs.lockedAim ?? cs.aim), {
            dmgMult: dmg * cs.baseMult, aoeMult: aoe,
            arcMult: ch.rampArc ? arc : undefined,
            noCooldown: true, keepFacing: true,
            bonusProjectiles: spooled,
            targetInfo: pulseTarget,
            // Each pulse's bonus keys on THAT pulse's actual (costRamp-grown)
            // price — greed is the damage plan, and running dry ends it.
            paidCost: a.construct ? undefined : { mana: cost.mana, life: cost.life },
          });
        }
        break;
      }

      case 'charge': {
        if (cs.held && !a.dead) {
          cs.elapsed = Math.min(cs.total, cs.elapsed + dt);
          break;
        }
        // Released: the burst scales with how long the button was held.
        const spec = def.chargeUp!;
        const frac = cs.total > 0 ? cs.elapsed / cs.total : 1;
        const lo = spec.minScale ?? 0.5;
        const hi = spec.maxScale ?? 2;
        a.casting = null;
        a.useLock = 0.15;
        nativeHost.executeSkill(a, cs.inst, cs.aim, {
          dmgMult: (lo + (hi - lo) * frac) * cs.baseMult,
          aoeMult: 1 + ((spec.aoeScaleMax ?? 1.4) - 1) * frac,
          // arcTaper (Sunpiercer): a tap washes WIDE and weak; the full
          // gather converges the wedge to its narrow data arc.
          arcMult: spec.arcTaper !== undefined
            ? spec.arcTaper + (1 - spec.arcTaper) * frac
            : undefined,
          // speedAtFull (Immolation Rush): the INVERSE axis — a full gather
          // launches SLOWER (damage/area already climbed above).
          speedMult: spec.speedAtFull !== undefined
            ? 1 + (spec.speedAtFull - 1) * frac
            : undefined,
          targetInfo,
          paidCost: cs.paidCost,
          chargesSpent: cs.chargesSpent,
        });
        break;
      }

      case 'overcharge': {
        const spec = instanceOvercharge(cs.inst)!;
        cs.channelTime = (cs.channelTime ?? 0) + dt;
        cs.sinceStage = (cs.sinceStage ?? 999) + dt;
        const tags = skillContextTags(def);
        const extra = instanceMods(cs.inst);
        const maxStages = Math.max(1, Math.floor(
          a.sheet.get('overchargeStages', tags, extra, spec.stages)));
        if (cs.held && !a.dead) {
          if ((cs.stage ?? 0) < maxStages) {
            cs.elapsed += dt;
            if (cs.elapsed >= cs.total) {
              // A completed bar BANKS a stage — if its surcharge is paid.
              // Unaffordable stages leave the bar stuck at the brim.
              const cost = a.skillCost(cs.inst);
              const per = spec.costPerStage ?? 1;
              cost.mana *= per; cost.life *= per;
              if (per > 0 && !a.canAfford(cost)) {
                cs.elapsed = cs.total;
              } else {
                if (per > 0) nativeHost.paySkillCost(a, cs.inst, cost);
                cs.stage = (cs.stage ?? 0) + 1;
                cs.sinceStage = 0;
                cs.elapsed = 0;
                // A timed discipline re-rolls its marker for the new bar.
                if (cs.indicatorAt !== undefined) cs.indicatorAt = rand(0.3, 0.85);
                // The SPARK: each banked stage flashes its arrival.
                nativeHost.flashes.push({
                  pos: vec(a.pos.x, a.pos.y), radius: 18 + 7 * cs.stage,
                  color: '#ffd700', life: 0.18, maxLife: 0.18,
                });
                // CAST-ON-OVERCHARGE: every stage BANKED raises a trigger
                // event (depth 0 — a held overcharge is a real action),
                // aimed at the live hold aim.
                nativeHost.rollTriggers(a, 'overchargeStage',
                  { aim: vec(cs.aim.x, cs.aim.y), sourceInst: cs.inst });
              }
            }
          }
          break;
        }
        // RELEASED: banked stages multiply the payoff, and the release
        // DISCIPLINES compound on top, each its own mechanic:
        //  - a strike-timing zone met on the still-refilling bar (Perfect
        //    Draw's golden tail / Wandering Mark's marker — deliberately
        //    unreachable at max stages: timing stops one stage short);
        //  - the SPARK window met within a breath of a stage banking
        //    (sparkWindow stat — works at max stages; greed's discipline).
        const stages = cs.stage ?? 0;
        const timing = instanceStrikeTiming(cs.inst);
        const frac = cs.total > 0 ? cs.elapsed / cs.total : 0;
        let strikeMult = 1;
        if (timing?.kind === 'perfect' && frac >= 0.72) {
          strikeMult = 1 + (timing.bonus ?? 0.7);
        } else if (timing?.kind === 'timed' && cs.indicatorAt !== undefined
          && Math.abs(frac - cs.indicatorAt) <= 0.08) {
          strikeMult = 1 + (timing.bonus ?? 1.2);
        }
        const window = cs.sparkWindow ?? 0;
        const spark = window > 0 && stages > 0 && (cs.sinceStage ?? 999) <= window;
        const sparkMult = spark
          ? 1 + a.sheet.get('sparkBonus', tags, extra, spec.windowBonus ?? 0.35)
          : 1;
        a.casting = null;
        a.useLock = 0.15;
        if (!a.dead) {
          nativeHost.executeSkill(a, cs.inst, cs.aim, {
            dmgMult: (1 + spec.perStage * stages) * strikeMult * sparkMult * cs.baseMult,
            aoeMult: 1 + (spec.aoePerStage ?? 0) * stages,
            targetInfo,
            paidCost: cs.paidCost,
            chargesSpent: cs.chargesSpent,
          });
          if (strikeMult > 1) {
            nativeHost.flashes.push(timingCueFlash(a, timing?.kind === 'timed' ? 'flawless' : 'perfect', cs.aim));
          }
          if (spark) nativeHost.flashes.push(timingCueFlash(a, 'spark', cs.aim));
        }
        break;
      }

      default: { // cast / perfect / timed / multitude: a bar, then resolution
        cs.elapsed += dt;
        if (cs.elapsed >= cs.total) {
          a.casting = null;
          a.useLock = 0.1;
          if (cs.plantTotem) {
            nativeHost.plantSpiritTotem(a, cs.inst, cs.aim);
            // #32: the placement INHERITS the base skill's cooldown — a
            // long-clock skill can't spam-plant its way to max totems.
            if (def.cooldown > 0) a.cooldowns.set(def.id, def.cooldown);
            break;
          }
          // RITUAL GROUND: the bar plants a CHANNELER — an anchored vessel
          // that holds the channel at the mark for the persist window.
          if (cs.plantChannel) {
            const persist = a.sheet.get('channelPersist',
              skillContextTags(def), instanceMods(cs.inst));
            const vessel = nativeHost.spawnConstruct(a, cs.inst, {
              type: 'construct', kind: 'eruptor',
              range: 240, duration: Math.max(1.5, persist),
              maxActive: 2, life: 40, placeRange: 440,
              interval: 0.4,
            }, cs.aim, cs.inst);
            // ONE channel per vessel: it holds the working for the persist
            // window and releases as it crumbles — never a re-cast loop.
            if (vessel?.construct) vessel.construct.holdOnce = true;
            if (def.cooldown > 0) a.cooldowns.set(def.id, def.cooldown);
            break;
          }
          nativeHost.executeSkill(a, cs.inst, cs.aim, {
            dmgMult: (cs.empowered ?? 1) * cs.baseMult,
            repeat: cs.mode === 'multitude' ? Math.max(1, cs.presses ?? 1) : 1,
            targetInfo,
            paidCost: cs.paidCost,
            chargesSpent: cs.chargesSpent,
            ventRounds: cs.ventRounds,
          });
        }
      }
    }
  
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}

export function sceneTickChannelSupports(nativeHost: NativeSceneCombatHost, a: Actor, cs: CastingState, dt: number): void {
    const tags = skillContextTags(cs.inst.def);
    const extra = instanceMods(cs.inst);
    const speed = a.speedFactor(cs.inst);

    // GUARD MEND: while the stance is HELD, allies in the aegis' shadow
    // heal per second — the shield that shelters, not just blocks.
    if (cs.mode === 'guard') {
      const mend = a.sheet.get('guardMend', tags, extra);
      if (mend > 0) {
        const hp = a.sheet.get('healPower', tags, extra);
        for (const ally of nativeHost.actors) {
          if (ally.dead || ally.team !== a.team || ally === a || !sameStory(ally, a)) continue; // (the sovereignty gate)
          if (dist(a.pos, ally.pos) > 160) continue;
          ally.healBy(mend * hp * dt);
        }
      }
    }

    const burst = a.sheet.get('channelBurst', tags, extra);
    if (burst > 0) {
      cs.burstTimer = (cs.burstTimer ?? 2 / speed) - dt;
      if (cs.burstTimer <= 0) {
        cs.burstTimer = 2 / speed;
        const radius = 95 * a.sheet.get('aoeRadius', tags, extra);
        for (const e of nativeHost.enemiesOf(a)) {
          if (!sameStory(a, e)) continue; // the channel's pulse touches its own story (the sovereignty gate)
          if (dist(a.pos, e.pos) - e.radius <= radius) {
            nativeHost.resolveHit(a, cs.inst, e, burst, 1, undefined, true);
          }
        }
        nativeHost.flashes.push({
          pos: vec(a.pos.x, a.pos.y), radius,
          color: '#ff8a4a', life: 0.25, maxLife: 0.25,
        });
      }
    }

    const storm = a.sheet.get('channelStorm', tags, extra);
    if (storm > 0) {
      cs.stormTimer = (cs.stormTimer ?? 1.1 / speed) - dt;
      if (cs.stormTimer <= 0) {
        cs.stormTimer = 1.1 / speed;
        const ang = rand(0, Math.PI * 2);
        const r = rand(40, 210);
        {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
          pos: nativeHost.clampPos(vec(a.pos.x + Math.cos(ang) * r, a.pos.y + Math.sin(ang) * r), 10),
          radius: 52 * a.sheet.get('aoeRadius', tags, extra),
          caster: (nativeRecordSource = a), inst: (nativeRecordInstance = cs.inst), color: '#ffe14a',
          delay: 0.25, exploded: false, linger: 0,
          tickInterval: 0.5, tickTimer: 0,
          shape: 0, facing: ang,
          dmgMult: storm, depth: 1,
          forceDamage: true,
        });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
      }
    }
  }

export function sceneTriggerEligible(nativeHost: NativeSceneCombatHost, owner: Actor, inst: SkillInstance): boolean {
    if (replenishingDelivery(inst)) return false;
    const def = inst.def;
    if (def.channel || instanceCastMode(inst) === 'guard'
      || def.delivery.type === 'aura' || def.delivery.type === 'dash'
      || def.delivery.type === 'blink' || def.delivery.type === 'leap'
      || def.delivery.type === 'carom'
      || def.pool || def.invokes || def.comboChain
      || (def.delivery.type === 'ground' && def.delivery.strobe)) return false;
    // Status locks still bind (a Silenced hero's spells stay silenced) and
    // a stunned owner triggers nothing. Deliberately NOT canUse: its
    // casting gate would break the whole point of Cast-while-Channeling
    // (instant executions never clobber a held cast).
    if (owner.isStunned() || owner.tagsForbidden(inst)) return false;
    if (nativeHost.castSealed(owner, inst)) return false; // THE CAST SEAL reaches the side door too
    // THE CAST-TIME REQUIREMENT GATE reaches the trigger artery too — an
    // armed gem below its wielder's live attributes must not fire by the
    // side door (silent, by the artery's own law).
    if (nativeHost.castReqRefusal(owner, inst) !== undefined) return false;
    if (def.useTime > instanceTriggerLimit(inst)) {
      if (!instanceTriggerPermit(inst)) return false;
      // A bar cast needs the caster FREE — never interrupt a held channel
      // or a running bar for a trigger.
      if (owner.casting) return false;
    }
    if (owner.cooldowns.has(def.id)) return false;
    const cost = owner.skillCost(inst);
    return owner.canAfford({
      mana: cost.mana * TRIGGER_CFG.costMult,
      life: cost.life * TRIGGER_CFG.costMult,
    });
  }

