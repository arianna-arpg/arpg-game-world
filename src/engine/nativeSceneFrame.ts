import { updateWatchGaze } from './watchGaze';
import type {DashConjureStash} from './nativeSceneCombatHost';
import { movementDiagnosticsEnabled, recordMovement } from './movementDiagnostics';
import {speedLingerMul} from './nativeSceneCombatResolution';
/** Exact original42 complete local-frame sections, in original order.
 * This source extraction does not constitute scheduler/runtime activation. */
import type {NativeSceneFrameHost} from "./nativeSceneFrameHost";
import { PUSH_DAMPING } from './nativeSceneDisplacement';
import { skillSelfVoice } from '../data/skillSelfVisuals';
import { anatomyFlash } from './anatomyCues';
import { takeWeakPointBreaks } from './weakpoints';
import { noteResourceFlow } from './feedingCues';
import { updateMovementTethers } from './movementTether';
import { assaultNode } from './assault';
import { finishAIRecovery, faceAlongTravel } from './handling';
import { angleDiff, angleTo, chance, clamp, dist, rand, vec, type Vec2 } from '../core/math';
import { FOURTH_WALL_CFG, frameReflect } from './fourthwall';
import { type DamageType } from './stats';
import { baselineStatusDps, STATUS_DEFS } from './status';
import { Actor, shellArcFactor } from './actor';
import { mitigateTyped } from './damage';
import { nearestBody, noteBodyHit } from './segments';
import { MASS_CFG } from './mass';
import { BEHAVIOR_CFG } from './brain';
import { grantedTags, guardBashSpec, instanceMods, makeSkillInstance, BASH_CFG, skillContextTags, BLOOM_CFG, type DropZoneSpec, type SkillInstance } from './skills';
import { SKILLS } from '../data/skills';
import { MONSTERS } from '../data/monsters';
import { landingTier, tierEnclosed, tierFloorAt, TIER_CFG } from './tiers';
import { batchScaleOf } from './throng';
import { syncAttributeBequests } from './bequests';
import { GRAB_CFG } from './grab';
import { procCueStyle } from './procCues';
import { PROC_CUE_CFG } from '../data/procCues';
import { defenseCueFlash } from './defenseCues';
import { combatCueFlash } from './combatCues';
import { ROOTED_CFG, standsRooted } from './rooted';
import { updateEncounterGroups } from './encounterGroups';
import { updateEncounterCombat } from './encounterCombat';
import { pruneNotices, prunePickupFeed } from '../world/bulletins';
import { inPhases } from '../world/daynight';
import { ORB_DEFS, ORB_CAP, orbTrickleStat, ORB_TRICKLE } from '../data/orbs';
export function sceneFramePreActors(nativeHost:NativeSceneFrameHost,dt:number):void {
nativeHost.syncZoneExits();
    // LIVE EVENTS: if a Demon Invasion or Crusade ATTACHES to the zone the player
    // is already standing in (the overlay bound/spread to it this tick), the
    // content FIRES NOW — the Balor erupts in a storm of fire, the crusade musters
    // its works — instead of waiting for a leave-and-reenter.
    nativeHost.materializeLiveZoneEvents();

    nativeHost.updateObjective(dt);
    nativeHost.updatePuzzles(dt);
    nativeHost.updateOccurrences(dt);
    nativeHost.updateEncounters(dt);
    nativeHost.updateHunt(dt);
    nativeHost.updateFractures(dt);
    if (nativeHost.bossRun) nativeHost.updateBoss();
    if (nativeHost.shake > 0) nativeHost.shake = Math.max(0, nativeHost.shake - dt * 26); // decay screen-shake
    nativeHost.updateRitualSite();
    nativeHost.updateHoldfastSite();
    nativeHost.updateIncursionEvents(dt);
    // THE RAMPAGE (engine/rampage.ts): fell-before-move — the plow runs
    // ahead of the actor step below, so a crushed wall is already down when
    // its crusher's moveActor arrives (no bypass inside the shared confine).
    nativeHost.updateRampage(dt);
    nativeHost.updateDoodadEffects(dt);
    nativeHost.updateArenaCrowd();
    nativeHost.updateAttunements(dt);
    nativeHost.updateTerraforms(dt);
    nativeHost.updateTheater(dt);
    nativeHost.updateRepeats(dt);
    nativeHost.updateAmbushes();
    nativeHost.updatePendingMetas(dt);
    nativeHost.updatePendingPersists(dt);
    nativeHost.updateMinionMeta(dt);
    nativeHost.updateThrongEvolution(dt);
    nativeHost.updateHivecall(dt);
    for (const seat of nativeHost.frameSeats()) {
      const host = seat.actor.skills.find(s => s?.def.id === 'command_assault');
      if (host && assaultNode(host, 'renewed_advance')) nativeHost.promoteCommandThrong(seat.actor, host, 'minions', 200);
    }
    nativeHost.assaults.update(dt);
    nativeHost.updateThrong(dt); // THE THRONG's source/collection sweep (engine/throng.ts)
    nativeHost.updateLite(dt);   // THE LITE TIER's batched sweep (engine/lite.ts)
    for (const id of nativeHost.grantedTrailMemory.keys()) {
      const actor = nativeHost.actorById(id);
      if (!actor || actor.dead) nativeHost.grantedTrailMemory.delete(id);
    }
    if (nativeHost.lockHint > 0) nativeHost.lockHint -= dt;

    // Actors: timers, DoT, dash movement, lifespans.
    nativeHost.refreshMagicPacks(dt);
}

export function sceneFrameActors(nativeHost:NativeSceneFrameHost,dt:number,rawDt:number):void {
const flowDt = dt; // the world-scaled frame; each body bends it below
    for (const a of nativeHost.actors) {
const nativeActorScope = nativeHost.beginCombatActor(a);
try {
      if (a.dead) continue;
      // A downed co-op seat is frozen: no timers, DoT, regen, casting or movement
      // until an ally revives it. (life is 0; skipping avoids re-entering kill.)
      if (a.downed) continue;
      nativeHost.syncPocketGrants(a);
      a.statusRelay ??= nativeHost.relayStatus;
      nativeHost.updateGrantedTrails(a);
      // Bound companions refresh with their host/body context. Other owned
      // companions still need the generic bequest refresh and retraction.
      if ((a.owner || a.bequestSignature) && (!a.companion || !nativeHost.companionBonds.host(a))) {
        const anchor = a.summonInst;
        syncAttributeBequests(a, anchor?.def.throng ? batchScaleOf(anchor.def.throng) : 1,
          anchor ? skillContextTags(anchor.def) : undefined, anchor ? instanceMods(anchor) : undefined);
      }
      // THE TIMEFLOW BEND (engine/timeflow.ts): each body lives at its own
      // rate. A fully held one (stasis, a chronomancer's stop) suspends
      // WHOLESALE — everything this loop body does: timers, DoTs, casting,
      // dash, decay, lifespan — except its chrono statuses, which burn on
      // raw seconds so the freeze can expire. Fractional rates SHADOW `dt`,
      // so the entire body below inherits the bend untouched.
      const atf = nativeHost.timeflow.actorScale(a);
      if (atf <= 0) { a.tickChronoStatuses(rawDt); continue; }
      const dt = atf === 1 ? flowDt : flowDt * atf;
      // EXPONENTIAL UNLIFE (decay minions): the survival meter drains at an
      // accelerating rate — unmitigable, only healing races it, and healing
      // loses on schedule. Death is REAL (Martyrdom, contracts, Deadwake).
      if (a.decay && !a.dead) {
        a.decay.t += dt;
        if (a.decay.t > 0) {
          a.life -= a.decay.dps0 * Math.pow(a.decay.growth, a.decay.t) * dt;
          if (a.life <= 0) {
            nativeHost.kill(a);
            if (a.dead) nativeHost.showCompanionCue(a, 'unravel');
            continue;
          }
        }
      }
      // THE BLOOM (Actor.bloomIn — THE LEGEND FABRIC, Gravebloom): the
      // ripened minion detonates for its OWNER's live bloom power as a
      // fraction of ITS max life (BLOOM_CFG's type — explodeActor's
      // mitigated, owner-team burst lane), then ends as an EXPIRY:
      // contracts released, the expiry-is-death lever deciding the rites,
      // so a bloom never double-fires a death explosion. Life investment
      // IS the bomb; the marker status counted the seconds down.
      if (a.bloomIn > 0 && !a.dead) {
        a.bloomIn -= dt;
        if (a.bloomIn <= 0) {
          a.bloomIn = 0;
          const owner = a.owner;
          const power = owner && !owner.dead
            ? owner.sheet.get('minionBloomPower',
              a.summonInst ? skillContextTags(a.summonInst.def) : undefined,
              a.summonInst ? instanceMods(a.summonInst) : undefined)
            : 0;
          if (power > 0) nativeHost.explodeActor(a, power, { type: BLOOM_CFG.type, color: BLOOM_CFG.color, recoveryCue: 'companion_bloom' });
          nativeHost.releaseContract(a, true);
          nativeHost.kill(a, !a.expiryTriggersDeath);
          continue;
        }
      }
      // Duration-based minions expire naturally (and may respawn if persistent).
      if (a.lifespan > 0) {
        a.lifespan -= dt;
        if (a.lifespan <= 0) {
          if (!a.presenceBadge) nativeHost.flashes.push({ pos: vec(a.pos.x, a.pos.y), radius: a.radius * 1.4, color: a.color, life: 0.3, maxLife: 0.3 });
          // Explosive CONSTRUCTS go off even on natural expiry — a bone
          // prison under Unstable Flesh is a timed demolition charge.
          if (a.construct && a.explodeOnDeath > 0) {
            nativeHost.explodeActor(a, a.explodeOnDeath);
          }
          // THE ANSWERING WALL EXPIRES (guardBash beyond the stance): a
          // quiet end answers with what still stood — the standing life
          // pays the bash the break would have paid in full.
          if (a.construct && a.summonInst) {
            const eBash = guardBashSpec(a.summonInst);
            if (eBash && a.life > 0) {
              nativeHost.guardBash(a, a.summonInst, { ...eBash, arcDeg: 360 }, a.life);
            }
          }
          // MATURITY: a pod's expiry IS the incubation completing — the
          // payload hatches before the shell is swept away.
          if (a.construct?.hatch) nativeHost.hatchPod(a);
          nativeHost.releaseContract(a, true);
          // THE RAGING-SPIRITS LEVER (minionExpiryIsDeath): a flagged
          // minion's duration lapse IS a death — every on-death rite
          // (explosions, death heals, allyDeath taps) fires on schedule.
          nativeHost.kill(a, !a.expiryTriggersDeath, undefined, 'expire');
          continue;
        }
      }
      // THE AMBIENT TRICKLE (orbTrickle_<id>, equip-carried — Requiem's
      // standalone lane): every ORB_TRICKLE.everySec, each carried trickle
      // stat rolls its chance to shed that orb at a walk-to spot nearby.
      // Stat-gated before the registry loop so trickle-less actors pay one
      // meter tick and nothing else.
      a.orbTrickleT += dt;
      if (a.orbTrickleT >= ORB_TRICKLE.everySec) {
        a.orbTrickleT -= ORB_TRICKLE.everySec;
        if (nativeHost.orbs.length < ORB_CAP) {
          for (const id of Object.keys(ORB_DEFS)) {
            const c = a.sheet.get(orbTrickleStat(id));
            if (c > 0 && chance(Math.min(0.75, c))) {
              nativeHost.shedOrb(id, a.pos, { scatter: ORB_TRICKLE.scatter, tier: a.tier });
            }
          }
        }
      }
      nativeHost.deedDotAmounts = undefined;
      const trackDeedDot = nativeHost.metaProgressionActive() && !a.dead && a.life > 0
        && (nativeHost.deedEnemy(a) || (a === nativeHost.player && nativeHost.hasDeedEnemyNearby()));
      const dot = a.updateTimers(dt, rawDt, trackDeedDot ? nativeHost.collectDeedDot : undefined);
      // World-space procPopEvents survive a lethal payout and replicate as flashes.
      for (const procCue of a.procPopEvents) {
        const style = procCueStyle(procCue.profile ?? 'blood');
        nativeHost.flashes.push(combatCueFlash(a.pos, style.pop ?? 'proc_pop', a.radius + PROC_CUE_CFG.popPad, a.facing, procCue.color ?? style.color));
      }
      a.procPopEvents.length = 0;
      // THE LANDING RE-SEAT (engine/tiers.ts landingTier): wings folded —
      // the story re-derives from the floor under the body, so a
      // bench-spawned condor that settles over the valley is the valley's
      // (hostility, sight and the elevation law all honest again; the
      // stoop's grounded punish window now lands on ITS victim's story).
      // The latch HOLDS through leap/dash flight: a stoop's wings fold
      // mid-dive, but touch-down means FEET ON GROUND — the re-seat reads
      // the floor the body finally stands on, never the dive's midpoint
      // (measured live: mid-leap folds seated divers on the story they
      // left, 99px past their rim). Flat zones: clearing it is the cost.
      if (a.touchdown && !a.flying && !a.leap && !a.dash) {
        a.touchdown = false;
        if (nativeHost.zone.tiers && nativeHost.walk?.regionAt) {
          a.tier = landingTier(nativeHost.walk.regionAt(a.pos.x, a.pos.y), a.tier);
        }
      }
      if (dot) {
        // TYPED ticks: each element pools separately so tag-filtered DoT
        // interactions (esDotBypass per element, tagged damageTaken) apply.
        // The floating text keeps showing the pre-soak total, as ever.
        let raw = 0;
        for (const [ty, amt] of Object.entries(dot)) {
          if (!amt || amt <= 0) continue;
          raw += amt;
          nativeHost.applyDeedDot(a, amt, ty as DamageType | 'untyped');
        }
        if (raw > 0) nativeHost.accumulateDotText(a, raw, dt, 'afflictions'); // THE WIRE'S EYES: the wounds' authors
        // A DoT emptied the shield — the esBreak proc seam fires here too.
        if (a.esBroke) {
          a.esBroke = false;
          nativeHost.rollOwnProcs(a, 'esBreak');
        }
        // Pain is pain: DoT feeds the damage-taken trigger banks too —
        // and licenses the counter-blow window like any wound.
        if (raw > 0) {
          nativeHost.bankDamageTakenTriggers(a, raw);
          a.recentHurt = 0;
          // THE PRIMED POUR: a DoT tick is a wound — the banked sip
          // answers the bleed the instant it opens (pourPrime).
          nativeHost.releasePrimedPours(a);
        }
      }
      // The per-frame defense-event sweep: harvests TIMER-driven flips the
      // damage paths never see — a broken bar re-arming, a recharge delay
      // expiring into flow, a calm refill topping off (depth 0: these are
      // real state changes, not proc output).
      nativeHost.sweepDefenseEvents(a);
      // GAIN EVENTS: charges/buffs gained since last frame feed the
      // chargeGain/buffGain triggers. Payload grants land as NEW events
      // (one link deeper) swept NEXT frame — chains propagate a link per
      // frame and die at the depth lid, never recurse.
      // THE TALENT FABRIC's per-frame sweep (docs/engine/talents.md):
      // condition edges, the heal event, the last gasp, pulse beats and the
      // derived-gauge samples — each null-cost until something on the
      // actor names it.
      nativeHost.sweepTalentEvents(a);
      if (a.gainEvents.length) {
        const evs = a.gainEvents;
        a.gainEvents = [];
        for (const ev of evs) {
          nativeHost.rollGainProcs(a, ev);
          // THE SYMPATHY FABRIC: the same events, replayed on kin (echoes
          // land one link deeper and deep sources don't re-echo — loop-free
          // by the same depth discipline the proc chains obey).
          nativeHost.echoSympathy(a, ev);
        }
      }
      // BROOD clauses (BroodSpec): banked tick-damage rolls to HATCH a
      // short-lived creature serving the APPLIER. Chance scales with the
      // damage dealt — the ailment's strength IS its fecundity; capped
      // alive per applier so a poison bloom never becomes a swarm bomb.
      for (const s of a.statuses) {
const nativeStatusScope = nativeHost.beginCombatStatus(a, s);
try {
        if (!s.brood || !((s.broodAcc ?? 0) > 0)) continue;
        const p = (s.broodAcc ?? 0) * s.brood.perDamage;
        s.broodAcc = 0;
        if (!chance(Math.min(0.35, p))) continue;
        const owner = s.casterId !== undefined
          ? nativeHost.actors.find(x => x.id === s.casterId && !x.dead) : undefined;
        if (!owner) continue;
        const key = '__brood:' + s.brood.monsterId;
        if (nativeHost.actors.filter(m => m.owner === owner && !m.dead
          && m.sourceSkillId === key).length >= s.brood.max) continue;
        const hatch = nativeHost.createMonster(s.brood.monsterId, owner.level, owner.team, owner);
        hatch.sourceSkillId = key;
        // BORROWED UNLIFE: the hatch binds to its APPLIER — casterId names
        // the keeper directly (no owner hop: the per-applier cap's own
        // grain), so a crew minion's broodlings unmake when it falls (the
        // actor-doc's raised-broodmother promise, status form). Seat and
        // enemy appliers stamp undefined by conjurationLifeline's own gate.
        hatch.lifelineId = nativeHost.conjurationLifeline(owner);
        hatch.lifespan = s.brood.duration;
        hatch.pos = nativeHost.clampPos(
          vec(a.pos.x + rand(-24, 24), a.pos.y + rand(-24, 24)), hatch.radius);
        { nativeHost.actors.push(hatch); nativeHost.admitCombatBirth(hatch); }
        nativeHost.emergeBody(hatch, { host: true }); // THE EMERGENCE GRAMMAR: the broodling bursts out of its parent
      
} finally { nativeHost.endCombatStatus(nativeStatusScope); }
}
      // DOT LEECH: banked ticks flow home to the APPLIER as healing —
      // "5% of bleed damage leeched as life", paid quietly on the beat.
      for (const s of a.statuses) {
const nativeStatusScope = nativeHost.beginCombatStatus(a, s);
try {
        if (!s.leechAcc || s.leechAcc <= 0 || s.casterId === undefined) continue;
        const sip = s.leechAcc;
        s.leechAcc = 0;
        const applier = nativeHost.actors.find(x => x.id === s.casterId && !x.dead);
        if (applier) noteResourceFlow(applier, a, 'life', applier.healBy(sip));
      
} finally { nativeHost.endCombatStatus(nativeStatusScope); }
}
      // TERRAIN-BOUND upkeep: derive a missing confinement from the nearest
      // matching ground (zone-memory restores, summons — every path self-
      // heals), then CLAMP the body into its disc, whatever moved it.
      if (a.habitat && !a.dead) {
        if (!a.confine) {
          const h = a.habitat;
          let bx = 0, by = 0, br = -1, bd = Infinity;
          for (const d of nativeHost.doodads) {
            if (d.kind !== h.kind || d.gone || d.radius < (h.minRadius ?? 0)) continue;
            const dd = dist(a.pos, d.pos);
            if (dd < bd) { bd = dd; bx = d.pos.x; by = d.pos.y; br = d.radius; }
          }
          a.confine = br >= 0
            ? { x: bx, y: by, r: br + (h.grace ?? 24) }
            : { x: a.pos.x, y: a.pos.y, r: 120 }; // no ground left: hold this spot
        }
        const cdx = a.pos.x - a.confine.x, cdy = a.pos.y - a.confine.y;
        const cd = Math.hypot(cdx, cdy);
        if (cd > a.confine.r) {
          const s = a.confine.r / cd;
          a.pos.x = a.confine.x + cdx * s;
          a.pos.y = a.confine.y + cdy * s;
        }
      }
      // ARMED AMBUSH: scenery until an enemy strays inside the wake radius —
      // then the reveal (flash + tell) and an ordinary fight. Instance
      // specs (spawner-armed) win over the def row; pack springs CHAIN, so
      // a penned herd empties as one event.
      if (a.ambushArmed && !a.dead) {
        const spec = a.ambushSpec ?? (a.defId ? MONSTERS[a.defId]?.ambush : undefined);
        const wake = spec?.radius ?? 130;
        for (const e of nativeHost.enemiesOf(a)) {
          if (e.dead || e.sheet.get('invisible') > 0) continue;
          if (dist(a.pos, e.pos) > wake) continue;
          nativeHost.springAmbush(a);
          break;
        }
      }
      // LIVE BURROW: submerge → dust-line travel → telegraphed emergence.
      if (a.burrow && !a.dead) nativeHost.stepBurrow(a, dt);
      // PACK BOND (MonsterDef.bond): worn only while a living bond-holder
      // stands near — the source moves on EDGES, never per frame. Burst the
      // holder first and the pack softens (the priority counterplay).
      if (a.defId && !a.dead) {
        const bond = MONSTERS[a.defId]?.bond;
        if (bond) {
          const r = bond.radius ?? 520;
          // THE PACK LAYER (engine/pack.ts): this scan does not merely answer
          // WHETHER a holder stands near — it records WHICH ONE, and that
          // record IS the drawn link. Taking the NEAREST rather than the
          // first in array order costs nothing (squared compare, no sqrt —
          // strictly cheaper per candidate than the old dist() call, and the
          // holder-less worst case already walked the whole roster) and buys
          // the honest read: a body's line runs to the warden actually
          // standing over it. The boolean is unchanged either way, so the
          // mods and the line are one answer — drawn == tested.
          const r2 = r * r;
          let from: Actor | undefined;
          let bd = Infinity;
          for (const o of nativeHost.actors) {
            if (o === a || o.dead || o.team !== a.team) continue;
            if (bond.kin
              ? (o.defId !== bond.kin && o.tag !== bond.kin && o.faction !== bond.kin)
              : (a.squadId === undefined || o.squadId !== a.squadId)) continue;
            const dx = a.pos.x - o.pos.x, dy = a.pos.y - o.pos.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > r2 || d2 >= bd) continue;
            bd = d2; from = o;
          }
          const held = !!from;
          const companionCueFrom = a.bondFrom;
          a.bondFrom = from;
          if (held !== a.bondHeld) {
            a.bondHeld = held;
            a.sheet.setSource('bond', held ? bond.mods : []);
            if (!held) nativeHost.showCompanionCue(a, 'sever', companionCueFrom);
          }
        }
      }
      // PHASE-WORN MODS (MonsterDef.nocturne): worn only while the world
      // clock stands in the def's hours — the Court runs quick in the dark,
      // its coach armors in gloom, its pallbearers stand hardest at noon.
      // Edge-triggered like the pack bond; the WHEEL moves it, not the frame.
      if (a.defId && !a.dead) {
        const noct = MONSTERS[a.defId]?.nocturne;
        if (noct) {
          const held = inPhases(nativeHost.time, noct.phases);
          if (held !== a.nocturneHeld) {
            a.nocturneHeld = held;
            a.sheet.setSource('nocturne', held ? noct.mods : []);
          }
        }
      }
      // GROUND-WORN MODS (MonsterDef.rooted — engine/rooted.ts): the
      // conditional-mod family's THIRD axis. Bond asks who is near,
      // nocturne asks what hour it is; this asks WHERE THIS BODY STANDS.
      // Edge-triggered like both, and gated by a GRACE on the way OUT
      // only: a creep rim breathes on the warren's pulse, so an instant
      // edge test would flap the sheet every beat — but STEPPING BACK ON
      // is instant, because that half is the reward.
      if (a.defId && !a.dead) {
        const root = MONSTERS[a.defId]?.rooted;
        if (root) {
          const on = standsRooted(root, a.pos, {
            // THE GRID ROOT (the cistern crone): a body standing on a
            // PAINTED region (the cistern's water, the soulriver's sea —
            // the walk grid's own cell, stamped beside the doodad ground
            // by the region-sense sweep) roots on it exactly as on a
            // poured disc; the doodad ground keeps precedence where both
            // stand. Absent rows read undefined as before.
            groundKind: a.groundKind ?? a.gridRegion,
            creepCover: nativeHost.creep ? (k, x, y) => nativeHost.creep!.coverOf(k, x, y) : undefined,
          });
          if (on) a.rootedOffAt = 0;
          else if (a.rootedOffAt === 0) a.rootedOffAt = nativeHost.time;
          const held = on
            || nativeHost.time - a.rootedOffAt < (root.grace ?? ROOTED_CFG.grace);
          if (held !== a.rootedHeld) {
            a.rootedHeld = held;
            a.sheet.setSource('rooted', held ? root.mods : (root.off ?? []));
            const note = held ? root.noteOn : root.note;
            if (note) {
              nativeHost.text(vec(a.pos.x, a.pos.y - 18), note,
                held ? ROOTED_CFG.onColor : ROOTED_CFG.offColor, 11);
            }
          }
        }
      }
      // SHELL REGROWTH: quiet seconds knit the pool back; a broken shell
      // re-forms once a real fraction has regrown (the burst window closes).
      const sg = a.shellGuard;
      if (sg && !a.dead && sg.pool < sg.max && nativeHost.time - sg.lastHitAt >= sg.regenDelay) {
        sg.pool = Math.min(sg.max, sg.pool + sg.regenRate * dt);
        if (sg.broken && sg.pool >= sg.max * (sg.reformFraction ?? 0.4)) {
          sg.broken = false;
          nativeHost.flashes.push(defenseCueFlash(a, 'shell', 'reform', sg.color, { style: sg.shellVisual,
            facing: a.facing + (sg.side === 'rear' ? Math.PI : 0),
            arc: sg.side === 'all' ? Math.PI * 2 : sg.arcDeg * Math.PI / 180 * shellArcFactor(sg, nativeHost.time) }));
        }
      }
      // CAST LOCK: a running cast bar PINS the body on its STAMPED aim —
      // the wind-up points where the blow will actually land (the resolve
      // fires at cs.aim, so a body that keeps tracking its target is lying).
      // Channels and guards steer their own facing inside updateCasting
      // (trackAim / autoSpin / turnRate) — their tracking is the design.
      {
        const cl = a.casting;
        if (cl && cl.mode !== 'channel' && cl.mode !== 'guard' && !a.dead
          && dist(a.pos, cl.aim) > 2) {
          a.facing = angleTo(a.pos, cl.aim);
        }
      }
      // Share the ordinary per-frame turn budget with the main game.
      updateWatchGaze(a, nativeHost.time, dt);
      // Committed minion lunges/charges keep their travel bearing even when
      // the quarry moves. Cast locks and player-controlled seats still win.
      if (a.isMinion() && a.dash && !a.frameCharging
        && !a.frameState?.order && !a.frameState?.terminal && !nativeHost.seatOf(a))
        faceAlongTravel(a, Math.cos(a.dash.dir), Math.sin(a.dash.dir));
      // TURN CLAMP (BEHAVIOR_STATS.turnSpeed ← Actor.turnSpeed as the innate
      // base): facing may only swing so far per frame — big bodies LUMBER,
      // their shell arcs and their aim lag the fight, and circling them
      // becomes real play. Runs AFTER the cast lock, so a lumbering body
      // still SWINGS onto its stamp believably. The rate reads THROUGH the
      // sheet (the aim knobs' law), so curses, auras and ground can bend the
      // pivot; a body with nothing folded — every player seat — resolves 0
      // and keeps its instant facing.
      const steeredCast = a.casting?.mode === 'channel' || a.casting?.mode === 'guard';
      if (steeredCast && a.facingPrev !== undefined) {
        // These casts spend their ONE pivot budget inside updateCasting.
        // AI's desired facing must not turn them once here and once there.
        a.facing = a.facingPrev;
      } else if (a.facingPrev !== undefined && !a.dead) {
        const rate = nativeHost.actorTurnRate(a);
        if (rate > 0) {
          const want = angleDiff(a.facingPrev, a.facing);
          const cap = rate * dt;
          if (Math.abs(want) > cap) a.facing = a.facingPrev + Math.sign(want) * cap;
        }
      }
      a.facingPrev = a.facing;
      // VELOCITY ESTIMATE (the behavior fabric): an EMA of the actual frame
      // displacement — whatever moved the body (walk, dash, knockback), this
      // is the motion a shot-leading mind (BehaviorSpec.aimLead) reads.
      if (dt > 0) {
        if (a.posPrev) {
          // Teleports read as a blink, not a ballistic launch: samples clamp
          // to a fast sprint, so one warped frame can't poison the read.
          const cap = BEHAVIOR_CFG.velSampleMax;
          const ix = clamp((a.pos.x - a.posPrev.x) / dt, -cap, cap);
          const iy = clamp((a.pos.y - a.posPrev.y) / dt, -cap, cap);
          const k = Math.min(1, dt * BEHAVIOR_CFG.velEmaRate);
          a.velEst.x += (ix - a.velEst.x) * k;
          a.velEst.y += (iy - a.velEst.y) * k;
          a.posPrev.x = a.pos.x; a.posPrev.y = a.pos.y;
        } else {
          a.posPrev = { x: a.pos.x, y: a.pos.y };
        }
      }
      // THE LEDGER's beat: escalating upkeep + the low-mana vent.
      nativeHost.updateActorLedgers(a, dt);
      // One sweep for EVERYTHING updateTimers can bleed — DoTs, staggered
      // wounds landing, upkeep starvation — so no drain path forgets to kill.
      if (a.life <= 0 && !a.dead) nativeHost.kill(a);
      // Rupture supports: statuses that expired this frame may detonate.
      if (a.expiredStatuses.length) {
        for (const s of a.expiredStatuses) {
const nativeStatusScope = nativeHost.beginCombatStatus(a, s);
try {
          if (s.rupture && s.rupture > 0 && !a.dead && !STATUS_DEFS[s.id]?.dischargeMatchingType) nativeHost.ruptureStatus(a, s);
        
} finally { nativeHost.endCombatStatus(nativeStatusScope); }
}
        { const nativeExpiredStatuses = a.expiredStatuses; nativeExpiredStatuses.length = 0; nativeHost.finishCombatExpiredStatuses(a, nativeExpiredStatuses); }
      }
      // BRAND ZAPS (StatusDef.zapNearby — Fulgurweb): while the mark rides,
      // bolts lash the victim's ALLIES on the brand's beat. Caster-less
      // baseline damage; standing next to the marked is the mistake.
      for (const s of a.statuses) {
const nativeStatusScope = nativeHost.beginCombatStatus(a, s);
try {
        const zn = STATUS_DEFS[s.id]?.zapNearby;
        if (!zn || a.dead) continue;
        s.zapAt ??= nativeHost.time + zn.interval;
        if (nativeHost.time < s.zapAt) continue;
        s.zapAt = nativeHost.time + zn.interval;
        const dmg = baselineStatusDps(s.id, nativeHost.zone.level) * zn.factor * s.stacks;
        const el = STATUS_DEFS[s.id]?.element ?? 'lightning';
        let lashed = false;
        for (const kin of nativeHost.actors) {
          if (kin === a || kin.dead || kin.untargetable || kin.passive) continue;
          if (kin.team !== a.team || kin.invulnerable) continue;
          if (dist(a.pos, kin.pos) > zn.radius) continue;
          const taken = mitigateTyped(kin, { [el]: dmg });
          if (taken > 0) {
            kin.life -= taken;
            kin.hitFlash = 0.1;
            kin.hitFlashType = el;
            nativeHost.accumulateDotText(kin, taken, zn.interval);
            if (kin.life <= 0 && !kin.dead) nativeHost.kill(kin);
            lashed = true;
          }
        }
        if (lashed) {
          nativeHost.flashes.push({
            pos: vec(a.pos.x, a.pos.y), radius: zn.radius,
            color: STATUS_DEFS[s.id]?.color ?? '#e8e05a', life: 0.15, maxLife: 0.15,
          });
        }
      
} finally { nativeHost.endCombatStatus(nativeStatusScope); }
}
      // MADNESS (StatusDef.lashOut — the cursed-ground betrayal): the
      // afflicted STRIKES whatever is nearest, friend or foe alike, on the
      // fog's beat. Caster-less baseline damage, mitigated normally.
      for (const s of a.statuses) {
const nativeStatusScope = nativeHost.beginCombatStatus(a, s);
try {
        const lo = STATUS_DEFS[s.id]?.lashOut;
        if (!lo || a.dead || a.isStunned()) continue;
        s.lashAt ??= nativeHost.time + lo.interval;
        if (nativeHost.time < s.lashAt) continue;
        s.lashAt = nativeHost.time + lo.interval;
        let prey: Actor | null = null;
        let best = lo.radius;
        for (const other of nativeHost.actors) {
          if (other === a || other.dead || other.untargetable || other.passive
            || other.invulnerable || other.construct) continue;
          const dd = dist(a.pos, other.pos);
          if (dd <= best) { best = dd; prey = other; }
        }
        if (!prey) continue;
        const dmg = baselineStatusDps(s.id, nativeHost.zone.level) * lo.factor;
        const taken = mitigateTyped(prey, { physical: dmg });
        if (taken > 0) {
          prey.life -= taken;
          prey.hitFlash = 0.12;
          prey.hitFlashType = 'physical';
          nativeHost.text(prey.pos, Math.round(taken).toString(), '#d84a9a', 12);
          if (prey.life <= 0 && !prey.dead) nativeHost.kill(prey);
        }
        nativeHost.flashes.push({
          pos: vec(a.pos.x, a.pos.y), radius: a.radius + 10,
          color: '#d84a9a', life: 0.15, maxLife: 0.15,
        });
      
} finally { nativeHost.endCombatStatus(nativeStatusScope); }
}
      // IRON WARD: the ward ends — everything it banked DETONATES.
      if (a.ironWard && nativeHost.time >= a.ironWard.until) {
        const iw = a.ironWard;
        a.ironWard = undefined;
        const amount = Math.min(iw.cap, iw.stored) * iw.ratio;
        if (amount > 0 && !a.dead) {
          nativeHost.burstDamage(vec(a.pos.x, a.pos.y), iw.radius, amount,
            'physical', iw.visualColor ?? '#c8c0a8', a.team, 0, undefined, undefined, skillSelfVoice('iron_ward', 'burst'));
        }
      }
      // weakPointBonus reads the live interval at each damage resolution; this
      // sweep retires spent windows and leaves an attributable body fracture.
      for (const cue of takeWeakPointBreaks(a)) nativeHost.flashes.push(anatomyFlash(a.pos, a.radius, a.facing, cue));
      if (a.casting) {
        const cast = a.casting;
        const castFacing = a.facing;
        nativeHost.updateCasting(a, dt);
        // Completing a stamped cast can write facing in executeSkill.
        // Its payload keeps the committed aim, but the body has already
        // spent its turn budget; resolution is not a free snap-turn.
        if (!steeredCast && nativeHost.actorTurnRate(a) > 0) a.facing = castFacing;
        if (steeredCast) a.facingPrev = a.facing;
        if (a.casting !== cast && cast.aiRecovery !== undefined
          && !a.dead && !a.isStunned() && !nativeHost.seatOf(a)) {
          finishAIRecovery(a, nativeHost.time, cast.aiRecovery);
        }
      }
      // THE FRAME LOCK re-derive (StatusDef.frameLock — the fourth wall):
      // stamped once at the rising edge from the frame that governs the
      // bearer THAT instant (copied — the live published rect mutates),
      // held while any declaring status is worn, cleared at the falling
      // edge. The flight-state idiom: status traffic is the whole law.
      {
        let frameLocked = false;
        for (const s of a.statuses) {
const nativeStatusScope = nativeHost.beginCombatStatus(a, s);
try {
          if (STATUS_DEFS[s.id]?.frameLock) { frameLocked = true; break; }
        
} finally { nativeHost.endCombatStatus(nativeStatusScope); }
}
        if (frameLocked) {
          if (!a.frameLockRect) a.frameLockRect = { ...nativeHost.viewRectFor(a) };
        } else if (a.frameLockRect) a.frameLockRect = null;
      }
      if (a.dash) {
        const inst = (a as Actor & { dashSkill?: SkillInstance }).dashSkill;
        const hits = (a as Actor & { dashHits?: Set<number> }).dashHits;
        const visualFrom = { ...a.pos }, visualTier = a.tier;
        const step = a.dash.speed * Math.min(dt, Math.max(0, a.dash.remaining));
        nativeHost.steppedClamp(a, vec(
          a.pos.x + Math.cos(a.dash.dir) * step,
          a.pos.y + Math.sin(a.dash.dir) * step,
        ), a.pos);
        if (inst && a.tier === visualTier && dist(visualFrom, a.pos) <= step + .01) {
          nativeHost.noteMovementTravel(a, inst, visualFrom, 1 - a.dash.remaining / Math.max(.01,
            inst.def.delivery.type === 'dash' ? inst.def.delivery.distance / a.dash.speed : 1));
        }
        if (inst && hits && inst.def.delivery.type === 'dash' && inst.def.delivery.width > 0) {
          for (const enemy of nativeHost.enemiesOf(a)) {
            if (hits.has(enemy.id)) continue;
            // SEGMENT FABRIC: the corridor clips the nearest hittable body.
            const nb = nearestBody(enemy, a.pos);
            if (dist(a.pos, nb.pos) - nb.r <= inst.def.delivery.width / 2 + a.radius) {
              hits.add(enemy.id);
              noteBodyHit(enemy, nb.seg);
              // Corridor grazes can be tuned down (Closing Fang: the
              // arrival is the bite, not the trip past).
              nativeHost.resolveHit(a, inst, enemy, inst.def.delivery.corridorScale ?? 1);
              // THE CHARGE CARRY (DashDelivery.onContact — the grab
              // fabric): the run's first valid CONTACT is seized and
              // dragged for the remainder of the run. The catch is a BODY
              // event (the bull's mass — dodged with your feet by leaving
              // the corridor, the wall doctrine), so it rides the contact,
              // not the gore's accuracy roll; every other gate is
              // grabSeize's own (mass law, policy tiers, grace, dormancy,
              // hostility — 'hands full' makes it first-catch-wins). The
              // hold's patience is clamped to the run's own clock: the
              // drag can never outlive the charge that authored it,
              // however the run ends.
              const carry = inst.def.delivery.onContact;
              if (carry && nativeHost.grabSeize(a, inst, enemy, carry.grab)) {
                if (carry.maxCarryDistance !== undefined) {
                  // This beat already moved; the end-of-beat decrement
                  // must leave exactly the authored post-contact budget.
                  a.dash.remaining = Math.min(a.dash.remaining,
                    dt + Math.max(0, carry.maxCarryDistance) / Math.max(1, a.dash.speed));
                }
                const hold = a.gripping;
                if (hold && hold.id === enemy.id) {
                  hold.until = Math.min(hold.until, nativeHost.time + a.dash.remaining);
                }
              }
            }
          }
          // THE MALLET: the corridor rings bells / pops pots it passes
          // over, once per dash (the same hits ledger the bodies ride).
          nativeHost.strikeSurfaces(a, a.pos,
            inst.def.delivery.width / 2 + a.radius, undefined, hits);
        }
        // Trailblaze / Fire Walker: the dash sows burning ground. The
        // drop-zone composables ride (DropZoneSpec): envelopes breathe
        // each drop, and durationBySpeed reads the DASH's own pace — a
        // laden charge-dash (speedAtFull) sows different ground than a
        // full-tilt one.
        // CLOUD TRAIL (Zephyr Step / the cloudTrail stat, stashed at cast):
        // the dash lays standing cloud as it travels — every ~30 units,
        // one conjure (sky-road over conjurable void; over honest land the
        // presence stands as a wind-lane granting the stash's gifts).
        const conjSpec = (a as Actor & { dashConjureSpec?: DashConjureStash }).dashConjureSpec;
        if (conjSpec) {
          const cc = a as Actor & { conjTrailDist?: number };
          cc.conjTrailDist = (cc.conjTrailDist ?? 99) + step;
          if (cc.conjTrailDist >= 30) {
            cc.conjTrailDist = 0;
            nativeHost.conjureCloud(a.pos.x, a.pos.y, conjSpec.radius, conjSpec.duration, {
              caster: a, grants: conjSpec.grants,
              ...(conjSpec.look !== undefined ? { look: conjSpec.look } : {}),
            });
          }
        }
        // THE STEAM TRAIL (DashDelivery.trailVent — Vent Hop): a fog bank
        // planted every `spacing` units of travel, the conjure trail's
        // sibling (reach + life already folded at the cast).
        const ventSpec = (a as Actor & { dashVentSpec?: { bank: string; radius: number; duration: number; spacing: number } }).dashVentSpec;
        if (ventSpec) {
          const vc = a as Actor & { ventTrailDist?: number };
          vc.ventTrailDist = (vc.ventTrailDist ?? 1e9) + step;
          if (vc.ventTrailDist >= ventSpec.spacing) {
            vc.ventTrailDist = 0;
            nativeHost.plantVent({ bank: ventSpec.bank, radius: ventSpec.radius, duration: ventSpec.duration },
              vec(a.pos.x, a.pos.y), 1, 1, a.tier);
          }
        }
        const trail = (a as Actor & { dashTrailSpec?: DropZoneSpec }).dashTrailSpec;
        if (inst && trail) {
          const carrier = a as Actor & { trailDist?: number };
          carrier.trailDist = (carrier.trailDist ?? 99) + step;
          if (carrier.trailDist >= 42) {
            carrier.trailDist = 0;
            nativeHost.mintTrailPatch(a, inst, trail, a.pos, a.dash.dir,
              trail.duration * speedLingerMul(trail.durationBySpeed, a.dash.speed));
          }
        }
        a.dash.remaining -= dt;
        if (a.dash.remaining <= 0) {
          // THE RUN'S-END SHED (DashDelivery.onContact — the charge
          // carry's release): a catch this run's corridor seized leaves
          // NOW — re-seated at the stopped charger's leading rim (the
          // crack of the whip: the towed body overtakes the tower that
          // stopped; the throw's own rim constant) and handed shove ×
          // the run's speed forward with authority ALREADY SPENT (the
          // bowling lane's hand-off — pushActor noAuthority). A wall
          // answers with the mass fabric's arrest wound, a rim with the
          // pit-aware push law, charger-credited both. An early escape
          // (struggle/sever/CC) already released through the standing
          // ladder and finds nothing here.
          {
            const hold = a.gripping;
            const carryD = inst && inst.def.delivery.type === 'dash'
              ? inst.def.delivery.onContact : undefined;
            if (inst && carryD && hold && hold.skillId === inst.def.id) {
              const v = nativeHost.actorById(hold.id);
              nativeHost.grabRelease(a);
              if (v && !v.dead) {
                v.pos = nativeHost.clampPos(vec(
                  a.pos.x + Math.cos(a.dash.dir) * (a.radius + v.radius) * 0.9,
                  a.pos.y + Math.sin(a.dash.dir) * (a.radius + v.radius) * 0.9), v.radius);
                v.facing = a.dash.dir + Math.PI;
                nativeHost.pushActor(v, a.dash.dir,
                  a.dash.speed * (carryD.shove ?? GRAB_CFG.runCarry.shoveFrac) / PUSH_DAMPING,
                  a, inst, { noAuthority: true });
                nativeHost.flashes.push({
                  pos: vec(v.pos.x, v.pos.y), radius: a.radius + v.radius + 10,
                  color: '#d8a06a', life: 0.2, maxLife: 0.2,
                });
              }
            }
          }
          a.dash = null;
          // A later AI-only rush must not inherit this skill's corridor,
          // grab or trail payload. Clear before arrival effects, which may
          // themselves launch a fresh dash with its own metadata.
          Object.assign(a, {
            dashSkill: undefined, dashHits: undefined,
            dashConjureSpec: undefined, conjTrailDist: undefined,
            dashVentSpec: undefined, ventTrailDist: undefined,
            dashTrailSpec: undefined, trailDist: undefined,
          });
          // Dive Bomb: the arrival erupts; No Man's Land fields drop here.
          if (inst) {
            nativeHost.movementMoment(a, inst, 'arrive');
            nativeHost.moveBlast(a, inst, a.pos);
            nativeHost.dropLingerField(a, inst, a.pos);
            // THE ANSWERING CHARGE (guardBash beyond the stance,
            // 2026-07-22): a guard-tagged dash with a bash spec answers
            // at ARRIVAL — the shield that battered the corridor swings
            // once more at the stop, paying the poolless stand-in.
            const dBash = guardBashSpec(inst);
            if (dBash) {
              nativeHost.guardBash(a, inst, dBash, BASH_CFG.poollessShield
                * a.sheet.get('guardStrength',
                  skillContextTags(inst, grantedTags(inst)), instanceMods(inst)));
            }
          }
        }
      }
      // THE CAROM MOTOR (the fourth wall — CaromDelivery): the body is the
      // ball. The worn ride status is the ONE clock — when it leaves
      // (expiry, dispel, cleanse) the ride ends through endCarom's single
      // door, stop-blast paid. A grab, a saddle, hard CC, a downing and
      // death all end it early; walls and the governing frame bank the
      // heading through the one shared reflection (drawn == banked).
      if (a.caromRun) {
        const run = a.caromRun;
        const caromC = a as Actor & {
          caromSkill?: SkillInstance; caromHits?: Map<number, number>; caromRung?: Set<number>;
        };
        const inst = caromC.caromSkill;
        if (!a.statuses.some(s => s.id === run.status) || a.dead || a.downed
          || a.isStunned() || a.heldBy !== undefined || a.mountId !== undefined) {
          nativeHost.endCarom(a);
        } else {
          const C = FOURTH_WALL_CFG.carom;
          const spec = inst?.def.delivery.type === 'carom' ? inst.def.delivery : undefined;
          const step = run.speed * dt;
          const beforeX = a.pos.x, beforeY = a.pos.y;
          const wantX = Math.cos(run.dir) * step, wantY = Math.sin(run.dir) * step;
          nativeHost.steppedClamp(a, vec(a.pos.x + wantX, a.pos.y + wantY), a.pos);
          // WALL BANK: whichever axis the clamp refused flips — the
          // projectile grid-bounce's axis law at body scale, through the
          // ONE mover every walker shares (drawn == banked, no forked
          // collision fabric).
          let cdx = Math.cos(run.dir), cdy = Math.sin(run.dir), banked = false;
          if (Math.abs(wantX) > C.blockedMin
            && (a.pos.x - beforeX) / wantX < C.blockedFrac) { cdx = -cdx; banked = true; }
          if (Math.abs(wantY) > C.blockedMin
            && (a.pos.y - beforeY) / wantY < C.blockedFrac) { cdy = -cdy; banked = true; }
          if (banked) run.dir = Math.atan2(cdy, cdx);
          // FRAME BANK: the governing rect — the stamped lock while one
          // holds, the live drawn frame otherwise.
          const fw = frameReflect(a.pos.x, a.pos.y, run.dir, a.radius, nativeHost.viewRectFor(a));
          if (fw) {
            a.pos.x = fw.x;
            a.pos.y = fw.y;
            run.dir = fw.dir;
          }
          a.facing = run.dir;
          if (inst) {
            if (dist({ x: beforeX, y: beforeY }, a.pos) <= step + .01) nativeHost.noteMovementTravel(a, inst, { x: beforeX, y: beforeY }, nativeHost.time % 1);
            if (banked || fw) nativeHost.movementMoment(a, inst, 'bank');
          }
          // CONTACT: the skill's whole payload through the one pipeline,
          // per victim on the rehit clock (segment-aware — coils are real
          // bodies; the corridor's noteBodyHit grammar verbatim).
          if (inst) {
            const rehit = spec?.rehit ?? C.rehitSec;
            const reach = a.radius + C.contactPad;
            for (const enemy of nativeHost.enemiesOf(a)) {
              const nb = nearestBody(enemy, a.pos);
              if (dist(a.pos, nb.pos) - nb.r > reach) continue;
              if ((caromC.caromHits?.get(enemy.id) ?? -1) > nativeHost.time) continue;
              caromC.caromHits?.set(enemy.id, nativeHost.time + rehit);
              noteBodyHit(enemy, nb.seg);
              nativeHost.resolveHit(a, inst, enemy, spec?.contactScale ?? 1);
            }
            // THE MALLET: bells rung and pots popped along the roll, once
            // per ride (the dash corridor's own ledger law).
            nativeHost.strikeSurfaces(a, a.pos, reach, undefined, caromC.caromRung);
          }
        }
      }
      // BODY WAKE (MonsterDef.wake): the body itself SHEDS its ground
      // payload as it travels — every everyDist units of ACTUAL
      // displacement (walks, dashes, shoves alike) the named catalog skill
      // free-casts at its feet through the ordinary ground pipeline, so
      // envelopes, exposure grace, telegraphs and Foresight all ride. A
      // hidden ambusher or burrower (untargetable) sheds nothing, and a
      // stationary body never leaks: the trail IS the travel.
      // FIRE WALKER'S SPRINT (the walking trail — moveTrail while a
      // movement buff holds): the same odometer grammar as the body
      // wake, expiring with the working. One drop per beat, however far
      // a frame jumped — a teleport writes one patch, not a rope.
      {
        const wt = a as Actor & {
          walkTrail?: { spec: DropZoneSpec; until: number; inst: SkillInstance };
          walkTrailPrev?: Vec2; walkTrailOdo?: number;
        };
        if (wt.walkTrail && !a.dead) {
          if (nativeHost.time >= wt.walkTrail.until) {
            wt.walkTrail = undefined;
            wt.walkTrailPrev = undefined;
          } else {
            const prev = wt.walkTrailPrev;
            wt.walkTrailPrev = vec(a.pos.x, a.pos.y);
            if (prev) {
              wt.walkTrailOdo = (wt.walkTrailOdo ?? 0) + dist(prev, a.pos);
              if (wt.walkTrailOdo >= 42) {
                wt.walkTrailOdo = 0;
                nativeHost.mintTrailPatch(a, wt.walkTrail.inst, wt.walkTrail.spec, a.pos, a.facing);
              }
            }
          }
        }
      }
      if (a.wake && !a.dead && !a.untargetable) {
        const prev = a.wakePrev;
        a.wakePrev = vec(a.pos.x, a.pos.y);
        if (prev) {
          // One shed per beat, however far a single frame jumped — a
          // teleport writes one drop, not a rope of them.
          a.wakeOdo = (a.wakeOdo ?? 0) + dist(prev, a.pos);
          if (a.wakeOdo >= a.wake.everyDist) {
            a.wakeOdo = 0;
            const wdef = SKILLS[a.wake.skillId];
            if (wdef) {
              a.wakeInst ??= makeSkillInstance(wdef, Math.max(1, Math.round(a.level)));
              nativeHost.executeSkill(a, a.wakeInst, vec(a.pos.x, a.pos.y), {
                dmgMult: a.wake.dmgMult ?? 1,
                noCooldown: true, noRepeat: true, keepFacing: true,
              });
            }
          }
        }
      }
      // BRIM DECAY (ChannelSpec.brim.decay): un-held bars bleed — unless
      // banked at/above bankAt (the kept plateau) or the spec simply
      // holds. The ledger carries the live instance so socketed support
      // mods reach the drain query (Stillwater's stopped clock).
      if (a.brims?.size) {
        for (const [sid, bs] of a.brims) {
          if (a.casting?.mode === 'channel' && a.casting.held
            && a.casting.inst.def.id === sid) continue;
          if (bs.fill <= 0) { a.brims.delete(sid); continue; }
          const spec = bs.spec;
          if (!spec.decay) continue;
          if (spec.bankAt !== undefined && bs.fill >= spec.bankAt) continue;
          bs.fill -= spec.decay
            * a.sheet.get('brimDecay', skillContextTags(bs.inst.def), instanceMods(bs.inst))
            * dt;
          if (bs.fill <= 0) a.brims.delete(sid);
        }
      }
      // Knockback shoves in flight: smooth, and collision stops them. A collision
      // (wall or void) reports back, so it can FALL into a void and roll the
      // caster's 'collision' procs ONCE (the knockback-collision-damage support).
      if (a.push) {
        const p = a.push;
const nativeRecordScope=nativeHost.beginCombatRecord("push", p);
try {
        const from = a.pos;
        const speed = Math.hypot(p.vx, p.vy);
        const sc = nativeHost.cScratch; sc.hit = 'none';
        a.pos = nativeHost.clampPos(vec(
          a.pos.x + p.vx * dt,
          a.pos.y + p.vy * dt), a.radius, from, { out: sc, mover: a });
        if (movementDiagnosticsEnabled) recordMovement(nativeHost, a, 'knockback', from, a.pos, { vx:p.vx, vy:p.vy, hit:sc.hit });
        const hit = sc.hit as string;
        // THE BOWLING LANE (engine/mass.ts): a body flying fast enough
        // slams through — or is arrested by — bodies in its path. Swept
        // BEFORE the wall verdict so a plow that sheds speed below the
        // impact gate honestly arrives soft.
        if (speed >= MASS_CFG.slam.minSpeed) nativeHost.sweepBodySlam(a, p, speed);
        // FORCED displacement (the shove in flight): the one lane a hostile
        // can truly be put past a pit's lip — the pitfall fabric's descend
        // routing pays the shover for it (walkers merely arrested at a rim
        // by their own steering are held, never dropped).
        if (hit === 'void') nativeHost.resolveBoundary(a, sc, from, true);
        // THE RIM FALL (engine/tiers.ts): an elevated body SHOVED past its
        // layer's rim — where its floor ends but a LOWER floor stands —
        // FALLS: it lands on the HIGHEST standing story beneath the
        // overshoot, staggered. Off a butte that's the valley; off a summit
        // terrace it's the bench below — the mountain is descended one
        // shove at a time. Walking never drops (the rim is a wall to feet).
        // THE ENCLOSURE LAW (engine/tiers.ts tierEnclosure): an ENCLOSED
        // stack — an under-layer's ceiling, a building's storey — has no
        // rim to fall off: the clamp above already held the body at its
        // story's edge exactly as it holds feet (the same view willed
        // movement confines against), so nothing more happens — the inn's
        // lodger shoved into a hanging wall stays upstairs, the duct runner
        // shoved at the duct's side stays in the duct. Only OPEN country
        // (buttes, summits — knock-off is the identity) reads on.
        if (hit === 'wall' && a.tier >= 1 && nativeHost.walk && nativeHost.zone.tiers && !tierEnclosed(nativeHost.zone.tiers)) {
          const rawX = from.x + p.vx * dt, rawY = from.y + p.vy * dt;
          const kRaw = nativeHost.walk.regionAt?.(rawX, rawY);
          if (!tierFloorAt(kRaw, a.tier)) {
            let land = -1;
            for (let t = a.tier - 1; t >= 0; t--) { if (tierFloorAt(kRaw, t)) { land = t; break; } }
            if (land >= 0) {
              a.tier = land;
              a.pos = nativeHost.clampPos(vec(rawX, rawY), a.radius, undefined, { mover: a });
              nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus('stun', 0, TIER_CFG.fallStunSec, 'the fall'));
              p.vx *= 0.4; p.vy *= 0.4;
            }
          }
        }
        if ((hit === 'wall' || hit === 'void') && !p.collided && p.caster && p.inst && !p.caster.dead) {
          p.collided = true;
          nativeHost.rollCollisionProcs(p.caster, p.inst, a);
        }
        // IMPACT (the mass fabric): the wall arrest itself wounds — momentum
        // made damage, hostile-authored (or MASS_CFG.impact.casterless for
        // authorless shoves). Void lips stay the pitfall fabric's own
        // resolution (never double-punished).
        if (hit === 'wall') nativeHost.resolveImpactHit(a, speed, p);
        // Exponential ease-out: the shove bleeds off like momentum, not a timer.
        const decay = Math.exp(-PUSH_DAMPING * dt);
        p.vx *= decay; p.vy *= decay;
        if (Math.hypot(p.vx, p.vy) < 40) a.push = null;
      
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
      // Slippery ground: momentum carries you on even with no input.
      if (!a.dash && !a.caromRun && !a.casting && !a.leap && a.lastMoveAt < nativeHost.time - 0.05) {
        const sp = Math.hypot(a.vel.x, a.vel.y);
        if (sp > 4) {
          const traction = clamp(a.sheet.get('traction'), 0.05, 1);
          if (traction < 0.999) {
            nativeHost.steppedClamp(a, vec(a.pos.x + a.vel.x * dt, a.pos.y + a.vel.y * dt), a.pos);
            const decay = Math.exp(-dt * (1.2 + traction * 9));
            a.vel.x *= decay;
            a.vel.y *= decay;
          } else {
            a.vel.x = 0;
            a.vel.y = 0;
          }
        }
      }
    
} finally { nativeHost.endCombatActor(nativeActorScope); }
}
}

export function sceneFrameEffects(nativeHost:NativeSceneFrameHost,dt:number):void {
nativeHost.updateSummonShells();
    nativeHost.actorGridRev++;

    nativeHost.updateTempGrounds(dt);
    nativeHost.updateEvaporation(dt);
    nativeHost.updatePendingBursts();
    nativeHost.updatePendingContagions();
    nativeHost.updateTerrainEffects(dt);
    nativeHost.updateScorch(dt);
    nativeHost.updateWindchill(dt);
    nativeHost.updateGaze(dt);
    nativeHost.updateFog(dt);
    nativeHost.updateWetSky(dt);
    nativeHost.updateCreep(dt);
    nativeHost.updateCollapse(dt);
    nativeHost.updateFlux(dt);
    nativeHost.updateSpans(dt);
    nativeHost.updateTracks(dt);
    nativeHost.updateGeysers(dt);
    nativeHost.updateVentDwellers(dt);
    nativeHost.updateScaldHeat(dt); // THE SCALD HEAT SWEEP (data/scald.ts): the scorch bar's hazard sources + THE BASKER
    nativeHost.updateCharRegrowth(dt); // THE REGROWTH CYCLE (data/scald.ts REGROWTH_CFG): ash → flush → meadow, minutes-grade
    nativeHost.updateSoulriver(dt);
    nativeHost.updateTrapworks(dt);
    nativeHost.conjured?.update(dt, nativeHost.actors);
    nativeHost.updateShrines();
    nativeHost.updateAltars(dt);
    nativeHost.updateChests(dt);

    nativeHost.updateLeaps(dt);
    nativeHost.updateWorms(dt);
    nativeHost.updateParts();
    nativeHost.updateCreepHearts();
    nativeHost.refreshSatellites(dt);
    nativeHost.refreshAuroras(dt);
    nativeHost.refreshGuardians(dt);
    nativeHost.refreshCreepers(dt);
    nativeHost.updateProjectiles(dt);
    nativeHost.updateZones(dt);
    nativeHost.updateEnemyTethers(dt);
    nativeHost.updateTethers(dt);
    nativeHost.updateVents(dt);
    nativeHost.updateDischarges();
    nativeHost.updateConstructs(dt);
    nativeHost.updateAuras(dt);
    nativeHost.updateStrobes(dt);
    nativeHost.updateDetonations(dt);
    nativeHost.updateFollowUps(dt);
    nativeHost.updateDeathBursts(dt);
    nativeHost.updatePendingSummons(dt);
    nativeHost.updatePendingRespawns(dt);
    nativeHost.updateSummonContracts();
    nativeHost.updateSummonReforms(dt);
    nativeHost.updateCompanionGrants(dt);
    nativeHost.updateReplenishment(dt);
    nativeHost.updatePendingBlinks(dt);
    nativeHost.checkMinionDetonations();
    nativeHost.separateActors();
    nativeHost.updateSquish();
    nativeHost.updateWindPush(dt);
    nativeHost.updateBrittle(dt);
    nativeHost.updateSnow(dt);
    nativeHost.updateWeatherDress(dt);
    nativeHost.updateDrops(dt);
    nativeHost.updateOrbs(dt);
    nativeHost.updateRemnants(dt);
}

export function sceneFrameLateBodies(nativeHost:NativeSceneFrameHost,dt:number):void {
nativeHost.updateCarriers(dt);
    // THE LATCH slave step LAST among movers — the seat wins the frame
    // (drawn == held; engine/cling.ts).
    nativeHost.updateClings();
    // THE GRAB sweep rides right behind it (engine/grab.ts): the release
    // ladder, then the held body's seat wins ITS frame the same way.
    nativeHost.updateGrabs(dt);
    // THE MOUNT sweep rides behind the grabs (engine/mounts.ts): pairing,
    // then the saddle pin — after the grab ladder so a grip landed THIS
    // frame tears its rider from the saddle this frame, and the remaining
    // riders' seats still win the frame.
    nativeHost.updateMounts();
    nativeHost.updateSummonShells();
    updateMovementTethers(nativeHost, dt); // movementTether wins after body displacement
    updateEncounterGroups(nativeHost.actors);
    updateEncounterCombat(nativeHost);
    // THE POSSESSION SEAM sweep rides behind the grabs (engine/possess.ts):
    // the ride clock + the husk ladder — a hold landed on the husk THIS
    // frame is seen this frame.
    nativeHost.updatePossessions(dt);
    // THE WATCH FABRIC's behavior sweep (engine/watch.ts) rides just ahead
    // of the tells: rung cache, stand-downs, the scanning gaze and the
    // tracker's nose all settle, THEN the worn gauges read them — a tell
    // never shows last frame's ladder.
    nativeHost.updateWatch();
    // THE RESERVE FABRIC's sweep (engine/reserves.ts) rides beside it, and
    // for the same reason: the burn, the leak, the recovery and the vent
    // windows all settle BEFORE the gauges read them, so a bladder never
    // draws last frame's breath. Its travel odometer also wants every
    // mover to have finished moving.
    nativeHost.updateReserves();
    // THE PACK SWEEP (engine/pack.ts) — the social folds (a warden's court,
    // a squad's shared appetite, a ward's guardian) settle here, AFTER the
    // bond scan and the movers, BEFORE the gauges that read them.
    nativeHost.updatePack();
    // THE TELL FABRIC's value sweep (engine/tells.ts) — after every mover
    // and state machine has spoken for the frame, the worn gauges read.
    nativeHost.updateTells();
    // THE COUCH EDGE LAW dead last among movers: whatever moved a local hero
    // this frame — intent, dash, shove, carrier — the shared frame's wall
    // answers it (no-op outside couch play; see couchConfine).
    nativeHost.applyCouchConfine();

    // Corpses decay
    for (let i = nativeHost.corpses.length - 1; i >= 0; i--) {
let nativeDecayRow:typeof nativeHost.corpses[number];
let nativeDecayScope:ReturnType<NativeSceneFrameHost["beginCombatRecord"]>|undefined;
try {
      (nativeDecayRow=nativeHost.corpses[i], nativeDecayScope=nativeHost.beginCombatRecord("corpses",nativeDecayRow), nativeDecayRow).remaining -= dt;
      nativeHost.corpses[i].tier ??= nativeHost.spoilStoryAt(nativeHost.corpses[i].pos); // THE SPOILS STORY, settled once
      if (nativeHost.corpses[i].remaining <= 0) nativeHost.corpses.splice(i, 1);
    
} finally { if(nativeDecayScope) nativeHost.endCombatRecord(nativeDecayScope); }
}

    // Texts & flashes
    for (let i = nativeHost.texts.length - 1; i >= 0; i--) {
      const t = nativeHost.texts[i];
      t.life -= dt; t.pos.y -= 28 * dt;
      if (t.life <= 0) nativeHost.texts.splice(i, 1);
    }
    // The INFO-STREAM feeds age on the same beat (world clock — a held menu
    // freezes the news mid-breath; the caps live in the fabric's own laws).
    pruneNotices(nativeHost.notices, nativeHost.time);
    prunePickupFeed(nativeHost.pickupFeed, nativeHost.time);
    for (let i = nativeHost.flashes.length - 1; i >= 0; i--) {
      nativeHost.flashes[i].life -= dt;
      if (nativeHost.flashes[i].life <= 0) nativeHost.flashes.splice(i, 1);
    }
    // THE DISSOLUTION GRAMMAR's break records age on the same beat (zero
    // cost while none stand — the common case).
    for (let i = nativeHost.dissolves.length - 1; i >= 0; i--) {
      nativeHost.dissolves[i].life -= dt;
      if (nativeHost.dissolves[i].life <= 0) nativeHost.dissolves.splice(i, 1);
    }
    // THE EMERGENCE GRAMMAR's arrivals age on the same beat; an expired hold
    // RELEASES its body (targetable + thinking again — drawn == tested).
    if (nativeHost.emergences.length) nativeHost.updateEmergences(dt);
    // THE FLOOR PRE-CRACK rows retire at their plant clock (the view drops
    // them too — this keeps a headless world tidy; gated on the empty case).
    if (nativeHost.dissolveFloorCracks.length) {
      for (let i = nativeHost.dissolveFloorCracks.length - 1; i >= 0; i--) {
        if (nativeHost.time >= nativeHost.dissolveFloorCracks[i].until) nativeHost.dissolveFloorCracks.splice(i, 1);
      }
    }

    // Sweep the dead (keep every player-kind seat — the local hero for the death
    // screen, and downed/dead co-op allies so they can still be revived / linger).
    {
let nativeRetirementActors:typeof nativeHost.actors;
let nativeRetirement:ReturnType<NativeSceneFrameHost["prepareCombatRetirement"]>|undefined;
try {
nativeHost.actors = (nativeRetirementActors=nativeHost.actors, nativeRetirement=nativeHost.prepareCombatRetirement(nativeRetirementActors), nativeRetirementActors).filter(a => !a.dead || a.isPlayerKind());
nativeHost.finishCombatRetirement(nativeRetirement);
} finally { if(nativeRetirement) nativeHost.cancelCombatRetirement(nativeRetirement); }
}
}
