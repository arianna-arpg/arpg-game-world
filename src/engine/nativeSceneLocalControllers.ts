/** Exact original42 complete local-frame LocalControllers closure.
 * Runtime ownership and native scheduling are separate concrete bindings. */
import {nativeFractureBirthCalls,type NativeFractureBirthReceipt} from './nativeSceneRuntimeBirth';
import {nativeFractureLifetimeCalls,type FractureField,type NativeFractureLifetime} from '../packages/overlays/fractures';
import type {NativeSceneFrameHost} from "./nativeSceneFrameHost";
import { separateNativeExits } from './nativeExitPreparation';
import { feedingCueFlash, noteRestoreGain } from './feedingCues';
import { throngEvolution, THRONG_EVOLUTION } from './throngEvolution';
import { siteZoneExits } from './exitSiting';
import { angleTo, chance, clamp, dist, rand, randInt, vec, type Vec2 } from '../core/math';
import { weaveVel } from './flight';
import { mod, type DamageType, type Modifier } from './stats';
import { Actor } from './actor';
import { landLifeDamage, mitigateTyped } from './damage';
import { HIVECALL, hivecallNode, hivecallState } from './hivecall';
import { segR } from './segments';
import { isDormant, issueCommand } from './ai';
import { type CommandState } from './brain';
import { grantedTags, instanceDelivery, instanceMods, instanceTargeting, makeSkillInstance, skillContextTags, type SkillInstance } from './skills';
import { ESSENCE_IDS, type EssenceId } from '../data/essences';
import { SKILLS } from '../data/skills';
import { FACTIONS, MONSTERS, temperOf } from '../data/monsters';
import { ATTUNEMENT_LIST, TERRAFORM_LIST, attuneStat, terraformFxStat, terraformStat } from '../data/attunements';
import { DAMAGE_COLOR } from './stats';
import { doodadRuleOf, hitSurfaceOf, type Doodad } from './levelgen';
import { fellableDoodad, fellJitter, fellProgress, RAMPAGE_CFG, rampageSpecOf, type RampageSpec } from './rampage';
import { sameStory } from './tiers';
import { shapeContains } from './shapes';
import { DWELL_CFG, transitDwell, transitRadius, transitReach } from '../data/transit';
import { bestiaryEligible, bestiaryKey, bestiaryKills, bestiaryThreshold } from '../data/bestiary';
import { driveOccSites } from './occurrences';
import { MINION_COMBAT } from './minionCombat';
import { batchScaleOf, buildWornThrongDef, isThrongBody, THRONG_CFG, throngMarkerOf, throngSpecsOn, WORN_THRONGS, wornThrongDefOfSkillId, wornThrongStat, type ThrongSourceRow, type ThrongSpec } from './throng';
import { clingSeatsOf } from './cling';
import { LITE_CFG, liteNoise, liteRingOffset, liteSeatHash, type LiteCond, type LitePocket } from './lite';
import { plyFloorOf } from './plies';
import { bumpLedger } from '../packages/ledger';
import type { FractureCapstone, FractureSurge } from '../packages/overlays/fractures';
import { CLASSIC_EXTRACT_TEMPER, ENCOUNTER_CFG } from '../packages/encounters';
import type { ExtractDisperseSpec, ExtractTemperSpec } from '../packages/encounters';
import { courtLord } from '../packages/courts';
import type { ActiveEncounter, VeilKnot } from './encounter';
import { noteSoulsSheltered } from '../data/boroughs';
import { factionTemper } from '../world/traits';
import { extractionLookFor } from '../data/extraction';
import { THEATER_CFG } from './theater';
import { hashStr } from './nativeSceneConfig';
export const FRACTURE_FOE_CAP = 24;
export const ATTUNE_TICK = 0.3;
export interface ResolvedTarget {
  pos: Vec2;
  actor?: Actor;
  corpse?: Corpse;
  /** THE WAGON's haul: every body a plural corpse find gathered (primary
   *  included, nearest-the-mark first). Absent on single finds — readers
   *  treat absence as [corpse]. */
  corpses?: Corpse[];
  self?: boolean;
}
export interface FractureRun {
  id: string;
  faction: string;
  color: string;
  variant: string;
  phase: 'dormant' | 'fissure' | 'chasm' | 'done';
  /** A diverted (longer-timer) instance? */
  longerTimer: boolean;
  /** Total zones this fracture spans (the capstone rift gate reads it on the
   *  final collapse — only a full max-span run can open a reward rift). */
  span: number;
  /** The volatile fracture object — run over it to start (shown while dormant). */
  origin: Vec2;
  /** The crawling fissure head + the endpoint it creeps toward this leg. */
  head: Vec2;
  endpoint: Vec2;
  /** Breadcrumb of the laid crack (the renderer draws the jagged line). */
  crack: Vec2[];
  /** Nested timer: PAUSES while you chase the head, TICKS during a chasm. */
  timer: number;
  maxTimer: number;
  /** Trickle-spawner countdown by the moving head (the crawl-out foes). */
  trickle: number;
  /** The open chasm centre (a real 'chasm' doodad while open), or null between legs. */
  chasm: Vec2 | null;
  chasmDoodad: Doodad | null;
  chasmSpawn: number;
  chasmSpawned: Set<number>;
  /** Foes that must be SEEDED before the chasm can seal (scaled by zone level). */
  chasmClear: number;
  chasmsSealed: number;
  chasmsTarget: number;
  /** Seconds the crawling head has failed to close on its endpoint (a wall between
   *  them in a walled zone). When it can't make progress, the chasm ERUPTS where the
   *  head stands — so a fissure can never crawl forever (the permanent-fracture bug). */
  stuck: number;
  /** ARRIVAL GRACE (a diverted surface only): seconds the freshly-surfaced fissure
   *  waits before its collapse clock arms — the player still has to CROSS the zone
   *  to reach it, and a timer that drains before they could possibly have seen the
   *  fracture reads as "it never spawned". Spent by first engagement (entering
   *  chaseRadius) or by expiry, whichever first; 0 = armed (normal nested rules). */
  grace: number;
}
export interface Corpse {
  pos: Vec2;
  defId: string;
  level: number;
  maxLife: number;
  remaining: number;
  /** M-SPILL (show-dont-tell §3c): a body SPILLED out of a breaking host
   *  tumbles from the host's seat to its own over a short arc — the renderer
   *  poses a fresh corpse off (laidAt, from); both runtime-only. */
  laidAt?: number;
  from?: Vec2;
  /** THE SPOILS STORY (see GemDrop.tier): the story the body lies on —
   *  corpse targeting and the drag answer only to a caster on the same
   *  story. Stamped at death, else derived at the sweep. */
  tier?: number;
}
export function sceneSyncZoneExits(nativeHost:NativeSceneFrameHost): void {
    if (nativeHost.inCave) return;
    if (nativeHost.exits.length >= nativeHost.zone.exits.length) return;
    siteZoneExits(nativeHost.zone, nativeHost.exits.length);
    const defs = nativeHost.zone.exits;
    for (let i = nativeHost.exits.length; i < defs.length; i++) {
      const ze = nativeHost.placeExit(defs[i], i);
      nativeHost.exits.push(ze);
      // A mid-session append resolves ONLY itself against the standing portals —
      // never sliding one the player already saw.
      nativeHost.separateOverlappingExits(nativeHost.exits.length - 1);
      const dest = ze.to === '?' ? null : (nativeHost.zoneMap[ze.to] ?? nativeHost.caveMap[ze.to]);
      nativeHost.flashes.push({ pos: vec(ze.pos.x, ze.pos.y), radius: 64, color: '#7ec8d8', life: 0.8, maxLife: 0.8 });
      nativeHost.text(vec(ze.pos.x, ze.pos.y - 38),
        dest ? `a path to ${dest.name} opens!` : 'a new path opens!', '#9ad0e0', 15);
    }
  }

export function sceneUpdateOccurrences(nativeHost:NativeSceneFrameHost, dt: number): void {
    nativeHost.massRuntime?.updateOccurrences(dt, nativeHost.occDisturbs);
    if (nativeHost.occs.length) driveOccSites(nativeHost.occHost(), nativeHost.occs, dt);
    if (nativeHost.occDisturbs.length) nativeHost.occDisturbs.length = 0;
  }

export function sceneUpdateEncounters(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const e of nativeHost.encounters) {
      if (e.def.extract) { nativeHost.updateExtraction(e, dt); continue; }
      if (e.def.borough) { nativeHost.updateBorough(e, dt); continue; }
      if (e.phase === 'collapsing') { nativeHost.updateVeilCollapse(e, dt); continue; }
      if (e.phase !== 'open') continue;
      e.radius = Math.min(e.scale.maxRadius, e.radius + e.scale.growthPerSec * dt);
      if (e.veil) {
        nativeHost.updateVeil(e);
      } else {
        e.spawnTimer -= dt;
        if (e.spawnTimer <= 0 && nativeHost.insideCount(e) < ENCOUNTER_CFG.fieldCap) {
          e.spawnTimer = nativeHost.encRng.range(e.scale.spawnInterval[0], e.scale.spawnInterval[1]);
          nativeHost.spawnInRadius(e, nativeHost.encRng.int(e.scale.spawnBatch[0], e.scale.spawnBatch[1]));
        }
      }
      e.timer -= dt;
      if (e.timer <= 0) {
        if (e.veil) nativeHost.beginCollapse(e);
        else nativeHost.closeEncounter(e);
      }
    }
    for (let i = nativeHost.encounters.length - 1; i >= 0; i--) {
      if (nativeHost.encounters[i].phase === 'closing') nativeHost.encounters.splice(i, 1);
    }
    // Dispersal orders OUTLIVE their encounter (the walk home continues after
    // the seam entry is spliced) — swept here, every frame, host-side.
    nativeHost.updateExtractionDepartures(dt);
    // …and so does the refugees' road to Lastlight.
    nativeHost.updateBoroughRefugees(dt);
  }

export function sceneUpdateHunt(nativeHost:NativeSceneFrameHost, dt: number): void {
    const hf = nativeHost.sim.huntField;
    if (!hf) return;
    if (nativeHost.huntFootprint && nativeHost.isPresentLocalPlayer() && !nativeHost.player.dead && !nativeHost.player.downed) {
      if (dist(nativeHost.player.pos, nativeHost.huntFootprint.pos) <= 50 + nativeHost.player.radius
        && nativeHost.dwellReachable(nativeHost.player.pos, nativeHost.huntFootprint.pos, DWELL_CFG.reach, nativeHost.storyPair(nativeHost.player))) {
        nativeHost.huntFootprintDwell += dt;
        if (nativeHost.huntFootprintDwell >= hf.surge().dwellSeconds) {
          nativeHost.huntFootprint = null;
          nativeHost.huntFootprintDwell = 0;
          bumpLedger(nativeHost.ledger, 'hunt_seen');
          // Read the trail: it either RELOCATES to an adjacent zone (more to follow)
          // or LOCATES the beast in an adjacent zone (the final find → the unchanged
          // beast flow takes over on entry). A dead-end zone locates the beast here.
          const step = hf.advanceTrail();
          const dest = nativeHost.pickHuntDest();
          if (step === 'locate' || !dest) {
            const where = dest ?? nativeHost.zone.id;
            hf.locateBeast(where);
            nativeHost.notice(`Cornered · ${nativeHost.zoneMap[where]?.name ?? where}`, '#d8a83a', 16, 'events');
          } else {
            hf.relocateTrack(dest);
            nativeHost.notice(`Beast Tracks · ${nativeHost.zoneMap[dest]?.name ?? dest}`, '#d8a83a', 16, 'events');
          }
        }
      } else {
        nativeHost.huntFootprintDwell = 0;
      }
    }
    // Persist the live beast's health into the hunt's cross-zone remembrance.
    if (nativeHost.huntBeast && !nativeHost.huntBeast.dead) {
      hf.setLife(nativeHost.huntBeast.life / Math.max(1, nativeHost.huntBeast.maxLife()));
    }
  }

export function sceneUpdateFractures(nativeHost:NativeSceneFrameHost, dt: number): void {
    const ff = nativeHost.sim.fractureField;
    const run = nativeHost.fractureRun;
    if (!ff || !run) return;
    ff.touch(); // we're engaged in its zone — keep it from idling out
    const surge = ff.surge();
    if (run.phase === 'fissure') {
      const chasing = nativeHost.touchers().some(h => dist(h.pos, run.head) <= surge.chaseRadius + h.radius); // THE ACTING SEAT: any standing player chases it
      if (chasing) {
        run.grace = 0; // first engagement SPENDS the arrival grace — nested rules own it now
        nativeHost.advanceFissure(dt, surge);
        run.trickle -= dt;
        if (run.trickle <= 0 && nativeHost.fractureFoeCount() < 6) {
          run.trickle = nativeHost.fractureRng.range(surge.fissureSpawnInterval[0], surge.fissureSpawnInterval[1]);
          nativeHost.spawnFractureFoes(run.head, 1, surge.chasm.radius * 0.5);
        }
      } else if (run.grace > 0) {
        // Freshly surfaced after a divert: the collapse clock holds while the
        // player crosses the zone toward it (grace expires → it arms anyway).
        run.grace = Math.max(0, run.grace - dt);
      } else {
        run.timer -= dt;
        if (run.timer <= 0) { nativeHost.failFracture(); return; }
      }
    } else if (run.phase === 'chasm') {
      run.timer -= dt;
      if (run.timer <= 0) { nativeHost.failFracture(); return; }
      run.chasmSpawn -= dt;
      if (run.chasmSpawn <= 0 && run.chasmSpawned.size < run.chasmClear && nativeHost.fractureFoeCount() < FRACTURE_FOE_CAP) {
        run.chasmSpawn = nativeHost.fractureRng.range(surge.chasm.spawnInterval[0], surge.chasm.spawnInterval[1]);
        nativeHost.spawnFractureFoes(run.chasm!, nativeHost.fractureRng.int(surge.chasm.spawnBatch[0], surge.chasm.spawnBatch[1]), surge.chasm.radius);
      }
      // Sealed once enough have crawled out AND every fracture foe is down.
      if (run.chasmSpawned.size >= run.chasmClear && nativeHost.fractureFoeCount() === 0) nativeHost.sealChasm();
    }
  }

export function sceneUpdateBoss(nativeHost:NativeSceneFrameHost): void {
    const run = nativeHost.bossRun;
    if (!run) return;
    if (!nativeHost.actors.some(a => !a.dead && a.defId === run.bossId)) {
      const ghost = nativeHost.constructCombatSource(() => new Actor('gone', 'enemy', vec(run.anchor.x, run.anchor.y)));
      ghost.defId = run.bossId;
      nativeHost.restoreArena(ghost);
      nativeHost.arenaWash = null;
    }
  }

export function sceneUpdateRitualSite(nativeHost:NativeSceneFrameHost): void {
    const site = nativeHost.ritualSite;
    if (!site || site.subdued) return;
    let alive = 0;
    for (const id of site.cultistIds) { const a = nativeHost.actorById(id); if (a && !a.dead) alive++; }
    if (alive > 0) return;
    site.subdued = true;
    nativeHost.sim.conclaveField?.clearRitual(site.zoneId);
    bumpLedger(nativeHost.ledger, 'rituals_subdued');
    const cfg = nativeHost.sim.conclaveField?.surge().ritual;
    if (cfg) {
      nativeHost.grantXp(Math.round(cfg.clearReward.xpBase + nativeHost.zone.level * cfg.clearReward.xpPerLevel), site.center); // XP BY PLACE
      for (let i = 0; i < cfg.clearReward.gems; i++) nativeHost.dropGemAt(site.center);
    }
    nativeHost.flashes.push({ pos: vec(site.center.x, site.center.y), radius: (cfg?.pentagramRadius ?? 80) * 1.6, color: '#a86ad8', life: 0.7, maxLife: 0.7 });
    nativeHost.text(vec(site.center.x, site.center.y - 40), 'The ritual is broken!', '#ffd700', 18);
  }

export function sceneUpdateHoldfastSite(nativeHost:NativeSceneFrameHost): void {
    const site = nativeHost.holdfastSite;
    const hf = nativeHost.sim.holdfastField;
    if (!site || !hf || !hf.isLocked(site.zoneId, site.lockId)) return;
    if (site.banditIds.some(id => { const a = nativeHost.actorById(id); return !!a && !a.dead; })) return;
    const gdef = hf.def(site.defId);
    if (gdef && chance(gdef.slaughterOpensChance)) {
      nativeHost.openHoldfastExit('the wardens fall — the gate bursts open!');
    } else {
      hf.markFailed(site.zoneId); // sealed for the run — reroute
      if (nativeHost.isPresentLocalPlayer()) nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 40), 'the wardens are dead — the gate stays shut', '#d05050', 14);
      nativeHost.holdfastSite = null;
    }
  }

export function sceneUpdateIncursionEvents(nativeHost:NativeSceneFrameHost, dt: number): void {
    const inc = nativeHost.sim.incursionField;
    if (!inc || nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') return;
    if (!nativeHost.isPresentLocalPlayer() || nativeHost.player.dead || nativeHost.player.downed) return; // no events while you're out of the fight
    const ctx = inc.eventContext(nativeHost.zone.id);
    if (!ctx) { nativeHost.incursionEventAcc = 0; return; }
    const a = ctx.archetype;
    nativeHost.incursionEventAcc += dt;
    if (nativeHost.incursionEventAcc < a.eventInterval) return;
    nativeHost.incursionEventAcc = 0;
    if (!a.events.length) return;
    // One independent roll per influence SOURCE — overlapping epicenters → more rolls.
    for (const intensity of ctx.sources) {
      if (!chance(a.eventChance * clamp(intensity, 0, 1))) continue;
      const id = nativeHost.weightedPick(a.events);
      nativeHost.incursionEvents[id]?.(clamp(intensity, 0, 1), a);
    }
  }

export function sceneUpdateRampage(nativeHost:NativeSceneFrameHost, dt: number): void {
    // 1. THE PLOW (per frame, before the movers step): every rampager's
    //    footprint — the head and, for worms, every trailing coil (the whole
    //    animal is the plow) — crushes at true-surface contact + reach.
    //    Free while no rampager stands.
    let liveCauses: Set<string> | null = null;
    for (const a of nativeHost.actors) {
      if (a.dead || !a.defId) continue;
      const spec = rampageSpecOf(MONSTERS[a.defId]);
      if (!spec) continue;
      const cause = nativeHost.rampageCauseOf(a);
      (liveCauses ??= new Set()).add(cause);
      nativeHost.rampageCrush(a, a.pos.x, a.pos.y, a.radius, spec, cause);
      const segs = (spec.segments ?? true) ? a.worm?.segments : null;
      if (segs) {
        for (let i = 0; i < segs.length; i++) {
          nativeHost.rampageCrush(a, segs[i].x, segs[i].y, segR(a, i), spec, cause);
        }
      }
    }
    // 2. THE REGROWTH (cadenced): the land waits while the cause still stands
    //    (the hold — wake pushed, never pulled), then stands its pieces back
    //    up staggered; completion defers around bodies (the entomb law) and
    //    each stand-up is announced by the piece's own flash.
    nativeHost.rampageTimer -= dt;
    if (nativeHost.rampageTimer > 0 || !nativeHost.regrowing.length) return;
    nativeHost.rampageTimer = RAMPAGE_CFG.sweepSec;
    const now = nativeHost.time;
    for (let i = nativeHost.regrowing.length - 1; i >= 0; i--) {
      const d = nativeHost.regrowing[i];
      const f = d.felled;
      if (!f || d.gone) { nativeHost.regrowing.splice(i, 1); continue; }
      if (f.k && liveCauses?.has(f.k)) {
        // The hold re-carries each piece's own jitter, so however long the
        // fight ran, the release still re-stands the country piecewise.
        f.wake = Math.max(f.wake, now + RAMPAGE_CFG.holdSec + fellJitter(d));
        continue;
      }
      if (fellProgress(f, now) < 1) continue;
      if (nativeHost.rampageBlockedStand(d)) continue; // wait for them to move (never entombs)
      delete d.felled;
      nativeHost.regrowing.splice(i, 1);
      nativeHost.markDoodadsChanged(d);
      nativeHost.flashes.push({
        pos: vec(d.pos.x, d.pos.y), radius: Math.min(46, d.radius + 8),
        color: '#7fb069', life: 0.4, maxLife: 0.4,
      });
    }
  }

export function sceneUpdateDoodadEffects(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const d of nativeHost.doodads) {
      const eff = d.effect;
      if (!eff) continue;
      const invoke = nativeHost.massNativeEffectInvokers.get(d);
      if (invoke && d.gone) continue;
      if (d.felled) continue; // a crushed vent sleeps until it stands again (the rampage fabric)
      eff.cd = (eff.cd ?? 0) - dt;
      if (eff.cd > 0) continue;
      eff.cd = eff.interval;
      if (invoke) invoke(() => nativeHost.doodadEffects[eff.id]?.(d, eff));
      else nativeHost.doodadEffects[eff.id]?.(d, eff);
    }
  }

export function sceneUpdateArenaCrowd(nativeHost:NativeSceneFrameHost): void {
    // SOVEREIGNTY: seat — scripted crowd seating (the derived census, probe_tiers RIG T).
    const ac = nativeHost.arenaCrowd;
    if (!ac || ac.dispersed || ac.bossId == null) return;
    const boss = nativeHost.actors.find(x => x.id === ac.bossId);
    if (!boss) return;
    const kind = ac.spec.kind ?? 'crowd_row';
    if (boss.dead) {
      // The crown has fallen: the stands empty in a stagger (each row its own
      // ttl → a wave of departures, not a blink).
      const win = ac.spec.disperseOnBossDeathSec ?? 0;
      ac.dispersed = true;
      if (win <= 0) return;
      for (const d of nativeHost.doodads) {
        if (d.kind !== kind) continue;
        const stagger = (hashStr(`${d.pos.x | 0},${d.pos.y | 0}`) % 997) / 997;
        const life = win * (0.35 + 0.65 * stagger);
        d.wilt = 0;
        nativeHost.transientDoodads.push({ d, ttl: life, maxTtl: life, owner: boss, kind: 'arena_crowd' });
      }
      nativeHost.text(vec(boss.pos.x, boss.pos.y - 70),
        ac.spec.disperseAnnounce ?? 'The stands fall silent — and empty.', '#e8d8a8', 16);
      return;
    }
    const calls = ac.spec.championCalls ?? [];
    if (ac.callIdx >= calls.length) return;
    const call = calls[ac.callIdx];
    if (boss.life / boss.maxLife() > call.atLifeFrac) return;
    ac.callIdx++;
    if (!ac.roster.length) return;
    // The nearest rows answer the call — members vault the rail as fighters,
    // and the benches that answered empty on the spot.
    const rows = nativeHost.doodads
      .filter(d => d.kind === kind && (d.wilt ?? 0) <= 0)
      .sort((p, q) => dist(p.pos, boss.pos) - dist(q.pos, boss.pos));
    const lvl = Math.max(1, nativeHost.zone.level + ac.levelBonus);
    const n = randInt(call.count[0], call.count[1]);
    let called = 0;
    for (let k = 0; k < rows.length && called < n; k++) {
      const row = rows[k];
      const m = nativeHost.createMonster(nativeHost.weightedPick(ac.roster, lvl), lvl, 'enemy');
      m.faction = boss.faction;
      m.tag = 'arena_challenger';
      // Step down off the stands, toward the fight.
      const dx = boss.pos.x - row.pos.x, dy = boss.pos.y - row.pos.y;
      const dl = Math.hypot(dx, dy) || 1;
      m.pos = nativeHost.clampPos(vec(row.pos.x + (dx / dl) * 70, row.pos.y + (dy / dl) * 70), m.radius);
      { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
      called++;
      nativeHost.flashes.push({ pos: vec(row.pos.x, row.pos.y), radius: 46, color: '#e8c85a', life: 0.4, maxLife: 0.4 });
      const life = 0.7;
      row.wilt = 0;
      nativeHost.transientDoodads.push({ d: row, ttl: life, maxTtl: life, owner: boss, kind: 'arena_crowd' });
    }
    if (called > 0) {
      nativeHost.text(vec(boss.pos.x, boss.pos.y - 64),
        call.announce ?? 'Challengers vault the rail!', '#e8c85a', 17);
    }
  }

export function sceneUpdateAttunements(nativeHost:NativeSceneFrameHost, dt: number): void {
    nativeHost.attuneTimer -= dt;
    if (nativeHost.attuneTimer > 0) return;
    const step = ATTUNE_TICK - nativeHost.attuneTimer + dt; // elapsed since last pass ran
    nativeHost.attuneTimer = ATTUNE_TICK;
    for (const a of nativeHost.actors) {
      if (a.dead) continue;
      for (const def of ATTUNEMENT_LIST) {
        if (a.sheet.get(attuneStat(def.id)) <= 0) continue;
        // One-bucket candidate set is complete because def.radius ≤ queryPad
        // (validated at boot) — never a full doodad scan.
        let near = false;
        for (const d of nativeHost.doodadsAt(a.pos.x, a.pos.y)) {
          if (!def.kinds.includes(d.kind) || d.felled) continue; // crushed shrines don't attune
          if ((d.tier ?? 0) !== a.tier) continue; // a shrine attunes its own story (the sovereignty gate)
          const dx = a.pos.x - d.pos.x, dy = a.pos.y - d.pos.y;
          const reach = def.radius + d.radius;
          if (dx * dx + dy * dy <= reach * reach) { near = true; break; }
        }
        const prog = a.attuneProgress ?? (a.attuneProgress = {});
        if (!near) { prog[def.id] = 0; continue; }
        prog[def.id] = (prog[def.id] ?? 0) + step;
        if (prog[def.id] >= def.attuneTime) {
          nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(def.status, 0, 1, def.label)); // re-apply = refresh the linger
        }
      }
    }
  }

export function sceneUpdateTerraforms(nativeHost:NativeSceneFrameHost, dt: number): void {
    // Age every growth each pass (cheap: the list is tiny and zone-local).
    if (nativeHost.transientDoodads.length) {
      let expired = false;
      for (const t of nativeHost.transientDoodads) {
        t.ttl -= dt;
        t.d.wilt = clamp(1 - t.ttl / t.maxTtl, 0, 1);
        if (t.ttl <= 0) expired = true;
      }
      if (expired) {
        const dead = new Set(nativeHost.transientDoodads.filter(t => t.ttl <= 0).map(t => t.d));
        nativeHost.transientDoodads = nativeHost.transientDoodads.filter(t => t.ttl > 0);
        nativeHost.doodads = nativeHost.doodads.filter(d => !dead.has(d)); // length change → index re-syncs
      }
    }
    for (const a of nativeHost.actors) {
      if (a.dead) continue;
      for (const def of TERRAFORM_LIST) {
        const rate = a.sheet.get(terraformStat(def.id));
        if (rate <= 0) continue;
        const cds = a.terraformCd ?? (a.terraformCd = {});
        cds[def.id] = (cds[def.id] ?? def.interval * 0.4) - dt * rate; // first growth arrives fast
        if (cds[def.id] > 0) continue;
        cds[def.id] = def.interval;
        // Per-bearer cap: release the OLDEST growth early (fast-wilt, not pop).
        const mine = nativeHost.transientDoodads.filter(t => t.owner === a && t.kind === def.id);
        if (mine.length >= def.maxAlive) {
          const oldest = mine.reduce((m, t) => (t.ttl < m.ttl ? t : m));
          oldest.ttl = Math.min(oldest.ttl, 0.8);
        }
        const ang = rand(0, Math.PI * 2);
        const r = rand(def.radius[0], def.radius[1]);
        const at = nativeHost.findFreeSpot(
          vec(a.pos.x + Math.cos(ang) * r, a.pos.y + Math.sin(ang) * r), def.size[1]);
        const d: Doodad = {
          pos: at, radius: rand(def.size[0], def.size[1]),
          kind: def.doodadKind, rot: rand(0, Math.PI * 2), wilt: 0,
        };
        // ARMED GROWTHS (TerraformDef.effect + the terraformFx_<id> gate): the
        // growth carries an owner-serving combat effect — Bramble Ward's
        // lashing saplings. Power stamped from the planter's level at growth.
        if (def.effect && a.sheet.get(terraformFxStat(def.id)) > 0) {
          d.effect = {
            id: def.effect.id, target: 'owner', ownerId: a.id,
            interval: def.effect.interval, radius: def.effect.radius,
            chance: def.effect.chance,
            power: def.effect.base + def.effect.perLevel * Math.max(0, a.level - 1),
          };
        }
        nativeHost.doodads.push(d);
        const life = rand(def.ttl[0], def.ttl[1]);
        nativeHost.transientDoodads.push({ d, ttl: life, maxTtl: life, owner: a, kind: def.id });
      }
    }
  }

export function sceneUpdateTheater(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const r of nativeHost.theaterRuns) if (!r.done) r.tick(dt);
    if (nativeHost.theaterRuns.some(r => r.done)) {
      nativeHost.theaterRuns = nativeHost.theaterRuns.filter(r => !r.done);
    }
    if (nativeHost.theaterQuiet) return;
    nativeHost.theaterDwellSec += dt;
    while (nativeHost.theaterDwellSec >= (nativeHost.theaterBeatIdx + 1) * THEATER_CFG.dwell.everySec) {
      nativeHost.theaterBeatIdx += 1;
      nativeHost.theaterRunBeat(nativeHost.theaterBeatIdx);
    }
  }

export function sceneUpdateRepeats(nativeHost:NativeSceneFrameHost, dt: number): void {
    // SOVEREIGNTY: self — a skill's own repeats (the derived census, probe_tiers RIG T).
    // Salvos: one shot per beat, re-aimed at the caster's LIVE aim point —
    // the crossbow keeps tracking after the trigger's been pulled. A fixed
    // cursor-origin (Cold Spot barrage) keeps firing from the mark.
    for (let i = nativeHost.pendingSalvos.length - 1; i >= 0; i--) {
      const s = nativeHost.pendingSalvos[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingSalvos", s);
try {
      if (s.caster.dead) { nativeHost.pendingSalvos.splice(i, 1); continue; }
      // A held caster's train holds with it (engine/timeflow.ts) — a frozen
      // crossbowman's salvo does not keep firing around the freeze.
      s.timer -= dt * nativeHost.timeflow.actorScale(s.caster);
      if (s.timer > 0) continue;
      s.timer += s.interval;
      const aim = s.caster.aimPos ?? s.aim;
      const from = s.origin ?? s.caster.pos;
      nativeHost.spawnProjectile(s.caster, s.inst, vec(from.x, from.y),
        angleTo(from, aim), { mult: s.mult, flat: s.flat });
      if (--s.shots <= 0) nativeHost.pendingSalvos.splice(i, 1);
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
    // Sequence steps (AimSpec.sequence): deliver each baked bearing on its
    // beat. noRepeat keeps a step from re-arming Multistrike; the step's own
    // executeSkill skips the transform (strikeAngle), so figures never nest.
    for (let i = nativeHost.pendingSteps.length - 1; i >= 0; i--) {
      const s = nativeHost.pendingSteps[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingSteps", s);
try {
      if (s.caster.dead) { nativeHost.pendingSteps.splice(i, 1); continue; }
      s.timer -= dt * nativeHost.timeflow.actorScale(s.caster); // figures hold with their dancer
      if (s.timer > 0) continue;
      nativeHost.pendingSteps.splice(i, 1);
      nativeHost.executeSkill(s.caster, s.inst, s.aim, {
        strikeAngle: s.angle, dmgMult: s.dmgMult, aoeMult: s.aoeMult,
        noCooldown: true, noRepeat: true, keepFacing: true,
        paidCost: s.paidCost,
      });
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
    for (let i = nativeHost.pendingRepeats.length - 1; i >= 0; i--) {
      const r = nativeHost.pendingRepeats[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingRepeats", r);
try {
      if (r.caster.dead) { nativeHost.pendingRepeats.splice(i, 1); continue; }
      r.timer -= dt * nativeHost.timeflow.actorScale(r.caster); // echoes hold with their voice
      if (r.timer > 0) continue;
      r.timer += r.interval;
      // Multistrike re-aims each strike at the nearest enemy in reach.
      // THE TRUE RE-LUNGE (2026-07-22): where the instance carries a
      // targeting spec (Closing Instinct's graft, Shadow Step's innate),
      // the repeat resolves through it — castRange/searchRadius/fallback
      // honored — and hands the resolved BODY onward, so the movement
      // snap re-aims the echo exactly like the press. The bare-stat lane
      // (repeatRetarget with no spec) keeps the nearest-in-220 scan.
      let aim = r.aim;
      let targetInfo: ResolvedTarget | undefined;
      if (r.retarget) {
        const spec = instanceTargeting(r.inst);
        const resolved = spec && spec.target !== 'corpse'
          ? nativeHost.resolveTargeting(r.caster, r.inst, r.aim) : null;
        if (resolved?.actor && !resolved.actor.dead) {
          aim = vec(resolved.actor.pos.x, resolved.actor.pos.y);
          targetInfo = resolved;
        } else {
          let best: Actor | null = null, bd = 220;
          for (const e of nativeHost.enemiesOf(r.caster)) {
            const dd = dist(r.caster.pos, e.pos);
            if (dd < bd) { bd = dd; best = e; }
          }
          if (best) aim = best.pos;
        }
      }
      // THE ECHO'S MARK: an echo of a targeted strike or mend re-resolves
      // through the skill's own spec, anchored on the press's body: the same
      // victim while it still qualifies (status gates, line of fire, reach),
      // else whatever a fresh press would find. Nothing found, nothing struck.
      if (!targetInfo && r.mark) {
        const found = nativeHost.resolveTargeting(r.caster, r.inst, r.mark.dead ? r.aim : r.mark.pos);
        if (found) { aim = vec(found.pos.x, found.pos.y); targetInfo = found; }
      }
      const factor = Math.max(0.2, 1 + r.scaleStep * r.k);
      nativeHost.executeSkill(r.caster, r.inst, aim, {
        dmgMult: r.dmgMult * factor,
        aoeMult: r.aoeMult * factor,
        noCooldown: true, noRepeat: true,
        targetInfo,
      });
      r.k++;
      if (--r.n <= 0) nativeHost.pendingRepeats.splice(i, 1);
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdateAmbushes(nativeHost:NativeSceneFrameHost): void {
    for (let i = nativeHost.pendingAmbushes.length - 1; i >= 0; i--) {
      const am = nativeHost.pendingAmbushes[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingAmbushes", am);
try {
      const arrows = am.arrowIds
        .map(id => nativeHost.actorById(id))
        .filter((a): a is Actor => !!a && !a.dead);
      if (am.caster.dead || nativeHost.time >= am.deadline
        || arrows.length < am.arrowIds.length) {
        for (const a of arrows) nativeHost.kill(a, true);
        nativeHost.pendingAmbushes.splice(i, 1);
        continue;
      }
      const sprung = nativeHost.enemiesOf(am.caster).some(e =>
        arrows.some(a => dist(a.pos, e.pos) - e.radius <= am.triggerRadius));
      if (sprung) nativeHost.triggerAmbush(i, 1);
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdatePendingMetas(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (let i = nativeHost.pendingMetas.length - 1; i >= 0; i--) {
      const m = nativeHost.pendingMetas[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingMetas", m);
try {
      if (m.caster.dead || !SKILLS[m.skillId]) { nativeHost.pendingMetas.splice(i, 1); continue; }
      m.timer -= dt;
      if (m.timer > 0) continue;
      nativeHost.pendingMetas.splice(i, 1);
      m.caster.useLock = 0; // the chain is one committed order, not N presses
      nativeHost.useSkill(m.caster, nativeHost.mintMetaInstance(m.caster, m.host, m.skillId), m.aim);
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdatePendingPersists(nativeHost:NativeSceneFrameHost, dt: number): void {
    // BANKED FUSES: due resolutions detonate at the caster's LIVE stats,
    // × the fusePower stat. A dead party on either side fizzles the
    // promise — the fuse is a bet on both bodies still standing.
    for (let i = nativeHost.pendingFuses.length - 1; i >= 0; i--) {
      const pf = nativeHost.pendingFuses[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingFuses", pf);
try {
      if (nativeHost.time < pf.due) continue;
      nativeHost.pendingFuses.splice(i, 1);
      if (pf.caster.dead) continue;
      const fTags = skillContextTags(pf.inst.def, grantedTags(pf.inst));
      const fPow = pf.caster.sheet.get('fusePower', fTags, instanceMods(pf.inst));
      if (pf.kind === 'hit') {
        const target = nativeHost.actorById(pf.targetId);
        if (!target || target.dead) continue;
        nativeHost.flashes.push({
          pos: vec(target.pos.x, target.pos.y), radius: target.radius + 14,
          color: pf.inst.def.color, life: 0.3, maxLife: 0.3,
        });
        nativeHost.resolveHit(pf.caster, pf.inst, target,
          pf.mult * fPow, pf.depth, pf.flat, pf.force, true, pf.hitEffects, pf.hitOrigin, pf.hitTier);
      } else {
        nativeHost.flashes.push({
          pos: vec(pf.caster.pos.x, pf.caster.pos.y), radius: pf.caster.radius + 12,
          color: pf.inst.def.color, life: 0.3, maxLife: 0.3,
        });
        nativeHost.applyBuffEffect(pf.caster, pf.inst, pf.fx, pf.durScale, pf.mult * fPow);
      }
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
    for (let i = nativeHost.pendingPersists.length - 1; i >= 0; i--) {
      const pp = nativeHost.pendingPersists[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingPersists", pp);
try {
      pp.remaining -= dt;
      if (pp.caster.dead || pp.remaining <= 0) { nativeHost.pendingPersists.splice(i, 1); continue; }
      pp.timer -= dt;
      if (pp.timer > 0) continue;
      pp.timer += pp.interval;
      const lived = 1 - pp.remaining / pp.total;
      const decay = 1 + (pp.fade - 1) * lived;
      nativeHost.executeSkill(pp.caster, pp.inst,
        vec(pp.caster.pos.x, pp.caster.pos.y), {
          dmgMult: pp.powerMult * decay,
          noCooldown: true, noRepeat: true, keepFacing: true,
        });
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdateMinionMeta(nativeHost:NativeSceneFrameHost, dt: number): void {
    // SOVEREIGNTY: self — a court's own bookkeeping (the derived census, probe_tiers RIG T).
    nativeHost.minionMetaScan -= dt;
    if (nativeHost.minionMetaScan > 0) return;
    nativeHost.minionMetaScan = 0.4;
    // UNLEARN SWEEP: a player minion/construct whose ANCHOR skill has left
    // the bar simply CEASES — silently (no Martyrdom, no drops, no
    // Deadwake): a body whose reason was unlearned never really died.
    // The anchor is the payload's HOST when one exists (brood_hatch's pods
    // answer to Broodpod), else the source skill itself; engine-internal
    // sources ('__proc:*') are exempt.
    for (const m of [...nativeHost.actors]) {
      if (m.dead || !m.owner || m.owner.kind !== 'player') continue;
      if (m.summonInst?.companionGrant) continue; // companionGrants owns this lifecycle
      const anchor = m.summonInst?.hostSkillId ?? m.sourceSkillId;
      if (!anchor || anchor.startsWith('__')) continue;
      if (m.owner.skills.some(s => s?.def.id === anchor)) continue;
      nativeHost.releaseContract(m, false); // free any reservation, no respawn
      nativeHost.kill(m, true);
    }
    // THE LIFELINE SWEEP: borrowed unlife ends with its lender. Anything
    // whose lifeline keeper no longer stands UNMAKES — silently (no bounty,
    // drops, bursts, or rattles): what the raiser held together lets go.
    // Chains cascade naturally: a raised raiser's own risen fall on the
    // next pass, generation by generation.
    for (const m of [...nativeHost.actors]) {
      if (m.dead || m.lifelineId === undefined) continue;
      const keeper = nativeHost.actorById(m.lifelineId);
      if (!keeper || keeper.dead) {
        nativeHost.releaseContract(m, false);
        nativeHost.kill(m, true);
      }
    }
    // Collect, per owner, the live apex presences (one entry per skill).
    const presence = new Map<Actor, { key: string; skillId: string; mods: Modifier[] }[]>();
    for (const a of nativeHost.actors) {
      if (a.dead || !a.owner || a.construct || !a.sourceSkillId) continue;
      const d = a.summonInst?.def.delivery;
      if (d?.type !== 'summon' || !d.presence) continue;
      const list = presence.get(a.owner) ?? [];
      if (!list.some(p => p.skillId === a.sourceSkillId)) {
        list.push({
          key: 'presence:' + a.sourceSkillId, skillId: a.sourceSkillId,
          mods: d.presence.minionMods,
        });
        presence.set(a.owner, list);
      }
    }
    for (const m of nativeHost.actors) {
      if (m.dead || !m.owner || m.construct || !m.isMinion()) continue;
      // The apex never wears its own shadow; everything else does.
      const want = (presence.get(m.owner) ?? []).filter(p => p.skillId !== m.sourceSkillId);
      const worn = m.wornPresence ?? [];
      if (!want.length && !worn.length) continue;
      for (const key of worn) {
        if (!want.some(p => p.key === key)) m.sheet.removeSource(key);
      }
      for (const p of want) {
        if (!worn.includes(p.key)) m.sheet.setSource(p.key, p.mods);
      }
      m.wornPresence = want.map(p => p.key);
    }
    // DEVOUR: the beat's meal — nearest other minion in reach.
    for (const eater of nativeHost.actors) {
      if (eater.dead || !eater.devour || !eater.owner) continue;
      if (nativeHost.time < eater.devour.next) continue;
      const spec = eater.devour.spec;
      let meal: Actor | null = null, bd = spec.radius ?? 220;
      for (const m of nativeHost.actors) {
        if (m === eater || m.dead || m.owner !== eater.owner || m.construct || m.untargetable) continue;
        if (m.sourceSkillId === eater.sourceSkillId) continue; // never a sibling
        if (m.devour) continue; // devourers don't eat devourers
        const dd = dist(eater.pos, m.pos);
        if (dd < bd) { bd = dd; meal = m; }
      }
      if (!meal) continue; // the beat holds until food exists
      eater.devour.next = nativeHost.time + spec.interval;
      if (spec.heal) noteRestoreGain(eater, 'life', eater.healBy(meal.maxLife() * spec.heal), spec.feedingCue);
      if (spec.mods?.length) {
        eater.addBuff({
          type: 'buff', id: 'devour_feast', duration: spec.duration ?? 15,
          mods: spec.mods, maxStacks: spec.maxStacks ?? 5,
        });
      }
      nativeHost.kill(meal, false, eater); // devour is an attributed REAL death — Martyrdom, contracts, Deadwake apply
      const feedingCue = meal.dead ? feedingCueFlash(meal.pos, eater, spec.feedingCue, 'flesh', meal.tier, meal.radius) : undefined;
      if (feedingCue) nativeHost.flashes.push(feedingCue);
    }
  }

export function sceneUpdateThrongEvolution(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const seat of nativeHost.frameSeats()) {
      const keeper = seat.actor;
      if (keeper.dead || keeper.downed) continue;
      for (const { inst, spec } of throngSpecsOn(keeper.skills)) {
        const evo = throngEvolution(inst), st = inst.state ??= {};
        const active = Object.keys(evo).length > 0;
        if (!active && !nativeHost.throngEvolutionActive.has(inst)) continue;
        if (active) nativeHost.throngEvolutionActive.add(inst);
        else nativeHost.throngEvolutionActive.delete(inst);
        if (active && spec.tier === 'lite') {
          const kindIdx = nativeHost.liteKindOf(spec.monsterId);
          if (kindIdx >= 0 && nativeHost.lite.countOwned(keeper.id, kindIdx))
            nativeHost.litePromoteNearest(keeper.pos, { within: Infinity, max: nativeHost.lite.used, owner: keeper.id, kindIdx });
        }
        nativeHost.throngKeepMinimum(keeper, inst);
        const cap = nativeHost.throngRecruitCap(keeper, inst);
        if (evo.accumulateSec && nativeHost.throngRosterCount(keeper, inst) < cap) {
          st.throngEvolutionClock = (st.throngEvolutionClock ?? 0) + dt;
          while (st.throngEvolutionClock >= evo.accumulateSec && nativeHost.throngRosterCount(keeper, inst) < cap) {
            st.throngEvolutionClock -= evo.accumulateSec;
            nativeHost.throngGain(keeper, inst, 1);
          }
        } else st.throngEvolutionClock = 0;
        if (evo.hitFill) st.throngEvolutionGauge ??= 0;
        else st.throngEvolutionGauge = 0;
        let bodies = nativeHost.throngBodiesOf(keeper, inst.def.id);
        // A cluster is one actor with a counted cargo. Merging cannot repair damage.
        if (evo.cluster && bodies.length > 1) {
          const eligible = bodies.filter(b => !b.throngDive);
          const lead = eligible[0];
          if (lead && eligible.length > 1) {
            const units = eligible.reduce((n, b) => n + (b.throngUnits ?? 1), 0);
            const lifeFrac = eligible.reduce((n, b) => n + b.life / b.maxLife() * (b.throngUnits ?? 1), 0) / units;
            const spent = eligible.reduce((n, b) => n + Math.max(0, b.pliesMax - b.plies), 0);
            lead.throngUnits = units;
            for (const b of eligible.slice(1)) nativeHost.kill(b, true);
            nativeHost.bakeMinionOwnerStats(lead, keeper, inst, batchScaleOf(spec));
            lead.life = lead.maxLife() * lifeFrac;
            lead.plies = Math.max(0, lead.pliesMax - spent);
            bodies = nativeHost.throngBodiesOf(keeper, inst.def.id);
          }
        } else if (!evo.cluster) {
          for (const b of bodies) if ((b.throngUnits ?? 1) > 1) {
            const count = b.throngUnits!, frac = b.life / b.maxLife(), plies = b.plies;
            b.throngUnits = undefined;
            nativeHost.bakeMinionOwnerStats(b, keeper, inst, batchScaleOf(spec));
            b.life = b.maxLife() * frac;
            b.plies = Math.min(b.pliesMax, plies);
            let left = Math.max(0, plies - b.plies);
            for (let i = 1; i < count; i++) {
              const child = nativeHost.mintThrongBody(keeper, inst, b.pos, b.level);
              child.life = child.maxLife() * frac;
              child.plies = Math.min(child.pliesMax, left);
              left -= child.plies;
              child.throngCarried = b.throngCarried;
            }
          }
          bodies = nativeHost.throngBodiesOf(keeper, inst.def.id);
        }
        const conducting = keeper.casting?.inst === inst;
        let protectedUnits = nativeHost.throngCapOf(keeper, inst);
        const foes = active && conducting ? [...nativeHost.enemiesOf(keeper)] : [];
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i], units = b.throngUnits ?? 1;
          const excess = Math.max(0, units - Math.max(0, protectedUnits));
          protectedUnits -= units;
          if (evo.overflowCap && excess > 0) {
            b.decay ??= { t: 0, dps0: 0, growth: THRONG_EVOLUTION.decayGrowth };
            const lifeInvestment = b.sheet.getSourceMods('owner')?.find(m => m.stat === 'life' && m.kind === 'more')?.value ?? 0;
            b.decay.dps0 = b.maxLife() / Math.max(0.01, 1 + lifeInvestment) * excess / units * THRONG_EVOLUTION.decayFraction;
          } else b.decay = undefined;
          const enraged = !!(conducting && evo.conductFury);
          if (enraged !== !!b.throngEnraged) b.sheet.setSource('throngEvolution:conduct', enraged ? [
            mod('moveSpeed', 'more', THRONG_EVOLUTION.furyMove),
            mod('attackSpeed', 'more', THRONG_EVOLUTION.furyHaste),
            mod('castSpeed', 'more', THRONG_EVOLUTION.furyHaste),
            mod('damage', 'more', THRONG_EVOLUTION.furyDamage),
          ] : []);
          b.throngEnraged = enraged;
          if (!active) {
            b.throngCarried = false;
            b.throngDive = undefined;
            nativeHost.bakeMinionOwnerStats(b, keeper, inst, batchScaleOf(spec));
          }
          const old = { ...b.pos };
          b.throngDriven = !!b.throngDive || !!(conducting && evo.whirlwind);
          if (b.throngDive) {
            if (!evo.fullDive) { b.throngDive = undefined; b.throngDriven = false; }
            else {
              const d = dist(b.pos, b.throngDive), step = b.sheet.get('moveSpeed') * 2 * dt;
              if (d <= Math.max(8, step)) {
                b.pos = { ...b.throngDive };
                b.throngDive = undefined;
                b.throngDriven = false;
                nativeHost.throngEvolutionBurst(b, b.pos, THRONG_EVOLUTION.diveRadius, THRONG_EVOLUTION.diveScale);
                nativeHost.kill(b);
                continue;
              }
              b.pos = nativeHost.clampPos(vec(b.pos.x + (b.throngDive.x - b.pos.x) / d * step,
                b.pos.y + (b.throngDive.y - b.pos.y) / d * step), b.radius, undefined, { mover: b });
            }
          } else if (conducting && evo.whirlwind) {
            if (b.clingTo) nativeHost.clingRelease(b);
            b.throngCarried = false;
            b.casting = null;
            const angle = nativeHost.time * THRONG_EVOLUTION.orbitSpeed + i / bodies.length * Math.PI * 2;
            const r = THRONG_EVOLUTION.orbitRadius + (i % 3 - 1) * 14;
            b.pos = nativeHost.clampPos(vec(keeper.pos.x + Math.cos(angle) * r, keeper.pos.y + Math.sin(angle) * r),
              b.radius, undefined, { mover: b });
            b.tier = keeper.tier;
          } else if (b.throngCarried && !conducting) {
            const angle = nativeHost.time + i * 2.4;
            b.pos = vec(keeper.pos.x + Math.cos(angle) * (keeper.radius + 7), keeper.pos.y + Math.sin(angle) * (keeper.radius + 7));
            b.tier = keeper.tier;
          } else if (conducting) b.throngCarried = false;
          const scale = evo.whirlwind ? 1 : evo.contactScale ?? 0;
          if (conducting && scale && !b.throngDive) {
            const previous = b.throngContactPos ?? old;
            for (const victim of foes) {
              if ((b.throngContact?.get(victim.id) ?? 0) > nativeHost.time) continue;
              const dx = b.pos.x - previous.x, dy = b.pos.y - previous.y;
              const q = Math.max(0, Math.min(1, ((victim.pos.x - previous.x) * dx + (victim.pos.y - previous.y) * dy) / (dx * dx + dy * dy || 1)));
              if (dist(victim.pos, vec(previous.x + dx * q, previous.y + dy * q)) > victim.radius + b.radius + 5) continue;
              (b.throngContact ??= new Map()).set(victim.id, nativeHost.time + THRONG_EVOLUTION.contactInterval);
              nativeHost.throngEvolutionHit(b, victim, scale);
            }
            for (const [id, until] of b.throngContact ?? []) if (until <= nativeHost.time) b.throngContact!.delete(id);
          }
          b.throngContactPos = { ...b.pos };
        }
      }
    }
  }

export function sceneUpdateHivecall(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const a of nativeHost.hivecallHooks) for (const key of a.lifeDamageInterceptors?.keys() ?? []) {
      if (key.startsWith('hivecall:')) a.lifeDamageInterceptors?.delete(key);
    }
    nativeHost.hivecallHooks.clear();
    for (const seat of nativeHost.frameSeats()) {
      const hero = seat.home ?? seat.actor;
      const host = hero.skills.find(s => s?.def.hivecall);
      if (!host || hero.dead) {
        hero.hivecallHud = undefined;
        if (seat.actor.hiveForm) nativeHost.seatEject(seat, 'released');
        continue;
      }
      const st = hivecallState(host);
      let form = seat.actor.hiveForm;
      if (form) { hero.pos = { ...seat.actor.pos }; hero.tier = seat.actor.tier; }
      if (form && (!hivecallNode(host, 'royal_guard') || form.host !== host)) {
        nativeHost.seatEject(seat, 'released'); form = undefined;
      }
      if (!hivecallNode(host, 'royal_guard')) st.meter = 0;
      if (form) {
        nativeHost.syncHivecallFormDamage(seat.actor, host);
        form.remaining -= dt;
        if (form.remaining <= 0) { nativeHost.seatEject(seat, 'duration'); form = undefined; }
      }
      const roster = nativeHost.hivecallRoster(hero, host), cap = nativeHost.hivecallCap(hero, host);
      if (roster.length && hivecallNode(host, 'royal_guard')) {
        const passiveGain = HIVECALL.passiveGain * dt;
        if (!form) st.meter = Math.min(HIVECALL.meterMax, st.meter + passiveGain);
        else if (hivecallNode(host, 'regal_execution')) form.remaining = Math.min(HIVECALL.duration, form.remaining + passiveGain * HIVECALL.duration / HIVECALL.meterMax);
      }
      if (hero.summonToggles.has(host.def.id) && roster.length < cap) {
        const d = instanceDelivery(host);
        const speed = hero.sheet.get('minionRespawnTime', skillContextTags(host), instanceMods(host));
        const delay = (d.type === 'summon' ? d.persistent?.respawnTime ?? 4 : 4) * speed;
        st.rebirthAt ??= nativeHost.time + delay;
        if (nativeHost.time >= st.rebirthAt) {
          nativeHost.spawnMinion(hero, host);
          st.rebirthAt = nativeHost.hivecallRoster(hero, host).length >= cap ? undefined
            : nativeHost.time + (hivecallNode(host, 'crowded_cells') ? HIVECALL.rapidInterval * speed : delay);
        }
      } else st.rebirthAt = undefined;
      for (const guard of roster) {
        if (!hivecallNode(host, 'brood_nourishment') || guard.defId !== 'hive_royal_guard') { guard.hiveBroodAt = undefined; continue; }
        guard.hiveBroodAt ??= nativeHost.time + HIVECALL.broodDelay;
        if (nativeHost.time < guard.hiveBroodAt) continue;
        guard.hiveBroodAt = nativeHost.time + HIVECALL.broodDelay;
        const child = { ...host, treeNodes: host.treeNodes?.filter(id => !['scurrying_tide', 'needle_mandibles', 'brood_nourishment'].includes(id)), state: {} };
        const d = instanceDelivery(child);
        if (d.type !== 'summon') continue;
        for (let n = 0; n < 2; n++) nativeHost.spawnMinion(hero, child, {
          monsterId: 'swarmling', pos: { x: guard.pos.x + (n ? 15 : -15), y: guard.pos.y },
          delivery: { ...d, persistent: undefined, duration: HIVECALL.broodLife },
          offspring: { maxActive: cap * 2, size: 1, life: 1, damage: 1 },
        });
      }
      hero.hivecallHud = { meter: st.meter, remaining: form?.remaining, rebirth: st.rebirthAt === undefined ? undefined : Math.max(0, st.rebirthAt - nativeHost.time), ready: Math.max(0, (st.readyAt ?? 0) - nativeHost.time) };
      seat.actor.hivecallHud = hero.hivecallHud;
      const aura = !!form && hivecallNode(host, 'royal_carapace');
      const recipients = aura ? nativeHost.actors.filter(a => !a.dead && a.team === seat.actor.team && sameStory(a, seat.actor) && dist(a.pos, seat.actor.pos) <= HIVECALL.auraRadius) : [hero];
      for (const a of recipients) {
        nativeHost.hivecallHooks.add(a);
        (a.lifeDamageInterceptors ??= new Map()).set(`hivecall:${hero.id}`, (amount: number) => {
          if (amount <= 0) return amount;
          if (aura && seat.actor.hiveForm && sameStory(a, seat.actor) && dist(a.pos, seat.actor.pos) <= HIVECALL.auraRadius) {
            a.addBuff({ type: 'buff', id: 'hivecall_fury', duration: 3, mods: [mod('damage', 'more', 0.3), mod('attackSpeed', 'increased', 0.4), mod('castSpeed', 'increased', 0.4)] });
            if (nativeHost.hivecallRedirecting) return amount; // Shared wounds enrage, but never redirect recursively.
            const shields = nativeHost.hivecallRoster(hero, host).filter(m => m !== a && sameStory(m, a) && dist(m.pos, seat.actor.pos) <= HIVECALL.auraRadius);
            if (shields.length) {
              const share = amount * HIVECALL.redirect / shields.length;
              let absorbed = 0;
              nativeHost.hivecallRedirecting = true;
              try {
                for (const m of shields) {
                  const wound = Math.min(share, Math.max(0, m.life)); absorbed += wound;
                  landLifeDamage(m, wound);
                  if (m.life <= 0) nativeHost.kill(m, false, a);
                }
              } finally { nativeHost.hivecallRedirecting = false; }
              amount -= absorbed;
            }
          }
          if (a === hero && amount >= hero.life && hero.life > 0 && hivecallNode(host, 'knitted_regents') && nativeHost.hivecallTransform(hero, host, true)) return Math.max(0, hero.life - 1);
          return amount;
        });
      }
    }
  }

export function sceneUpdateThrong(nativeHost:NativeSceneFrameHost, dt: number): void {
    nativeHost.throngScan -= dt;
    if (nativeHost.throngScan > 0) return;
    nativeHost.throngScan = 0.2;
    const t = nativeHost.time;
    // Mote evaporation + THE DISBAND RULE: a roster whose anchor left the
    // bar RELEASES where it stands — re-wilded as claimable husks that
    // linger a while, never a silent delete. Losses you can regather.
    for (const m of [...nativeHost.actors]) {
      if (m.dead) continue;
      if (m.throngWild && m.throngExpiresAt !== undefined && t >= m.throngExpiresAt) {
        nativeHost.kill(m, true);
        continue;
      }
      if (!m.owner || !isThrongBody(m)) continue;
      const anchored = m.owner.skills.some(s =>
        s?.def.throng && throngMarkerOf(s.def.id) === m.sourceSkillId)
        || nativeHost.wornThrongAnchored(m.owner, m.sourceSkillId);
      if (!anchored) {
        const defId = m.defId;
        const releasedSpec = m.summonInst?.def.throng;
        nativeHost.kill(m, true);
        if (defId && releasedSpec?.release !== 'dismiss') for (let i = 0; i < (m.throngUnits ?? 1); i++) nativeHost.mintThrongHusk(defId, m.pos,
          { ttl: THRONG_CFG.motes.ttl * 2, tier: m.tier, affinity: releasedSpec?.monsterId });
      }
    }
    // THE LIVE REBAKE (1s cadence): standing bodies re-fold the owner's
    // CURRENT minion investment at the batch scale — socketing a gem or
    // taking a passive reaches the gathered army without re-gathering it.
    nativeHost.throngRebake -= 0.2;
    const rebake = nativeHost.throngRebake <= 0;
    if (rebake) nativeHost.throngRebake = 1;
    for (const seat of nativeHost.frameSeats()) {
      const keeper = seat.actor;
      if (keeper.dead || keeper.downed) continue;
      // Bar anchors first, then the WORN anchors (gear-granted throngs —
      // engine/throng.ts WORN_THRONGS): both are ordinary anchors to
      // every consumer below (claim, rebake, clocks, the disband law).
      for (const { inst, spec } of [
        ...throngSpecsOn(keeper.skills), ...nativeHost.wornThrongAnchorsOf(keeper),
      ]) {
        if (rebake) {
          if (spec.tier === 'lite' && nativeHost.minionNeedsFullDurability(keeper, inst)) {
            const kindIdx = nativeHost.liteKindOf(spec.monsterId);
            if (kindIdx >= 0) nativeHost.litePromoteNearest(keeper.pos, {
              within: Infinity, max: nativeHost.lite.used, owner: keeper.id, kindIdx,
            });
          }
          for (const b of nativeHost.throngBodiesOf(keeper, inst.def.id)) {
            nativeHost.bakeMinionOwnerStats(b, keeper, inst, batchScaleOf(spec));
          }
        }
        // COLLECTION: sighted husks in reach join while cap room remains.
        // A lite-tier roster counts its POOL rows beside any promoted
        // bodies (engine/lite.ts) — the cap is the cap either way.
        let roster = nativeHost.throngRosterCount(keeper, inst);
        const cap = nativeHost.throngRecruitCap(keeper, inst);
        if (roster < cap) {
          for (const a of [...nativeHost.actors]) {
            if (a.dead || a.throngWild !== spec.monsterId) continue;
            if (a.tier !== keeper.tier) continue; // THE SAME-STORY LAW: a pluck is contact
            const reach = THRONG_CFG.collect.reach + keeper.radius + a.radius;
            if (dist(keeper.pos, a.pos) > reach) continue;
            nativeHost.claimThrongHusk(keeper, inst, a);
            roster = nativeHost.throngRosterCount(keeper, inst);
            if (roster >= cap) break;
          }
        }
        // MOTE SCHEDULING (one motes row per skill — the first wins; a
        // second row is a validator warning, never a silent double-clock).
        // Grafted rows resolve through throngSources like every consumer.
        const rows = nativeHost.throngSources(inst, spec);
        const moteRow = rows.find((r): r is Extract<ThrongSourceRow, { kind: 'motes' }> => r.kind === 'motes');
        if (moteRow) {
          const st = inst.state ??= {};
          if (st.throngMoteAt === undefined) {
            st.throngMoteAt = t + rand(moteRow.every[0], moteRow.every[1]);
          } else if (t >= st.throngMoteAt) {
            st.throngMoteAt = t + rand(moteRow.every[0], moteRow.every[1]);
            const pos = nativeHost.throngMoteSpot(keeper, moteRow.at);
            if (pos) {
              // THE FIND-SIZE FOLD: a grown yield condenses a CLUTCH at
              // the spot — the first mote exactly there (byte-identical
              // at yield 1), the rest scattered beside it.
              const n = nativeHost.throngYieldCount(keeper, inst, 1);
              for (let i = 0; i < n; i++) {
                nativeHost.mintThrongFind(keeper, inst,
                  i === 0 ? pos : nativeHost.throngStandNear(pos, keeper.tier),
                  { ttl: moteRow.ttl ?? THRONG_CFG.motes.ttl, tier: keeper.tier });
              }
            }
          }
        }
        // THE RECURRING BROOD (trickle — one row per skill, first wins):
        // one body per everySec while the roster stands below cap. 'near'
        // condenses a claimable husk at the keeper's feet (the collection
        // thesis kept — a stoop, not a button); 'roster' replenishes
        // DIRECTLY. At cap the clock stands DISARMED and re-arms with a
        // full wait when a body is lost — the brood never banks time.
        const trickleRow = rows.find((r): r is Extract<ThrongSourceRow, { kind: 'trickle' }> => r.kind === 'trickle');
        if (trickleRow) {
          const st = inst.state ??= {};
          if (roster >= cap) {
            st.throngTrickleAt = undefined;
          } else if (st.throngTrickleAt === undefined) {
            st.throngTrickleAt = t + trickleRow.everySec;
          } else if (t >= st.throngTrickleAt) {
            st.throngTrickleAt = t + trickleRow.everySec;
            let n = nativeHost.throngYieldCount(keeper, inst, trickleRow.count ?? 1);
            if ((trickleRow.at ?? 'near') === 'roster') {
              n = Math.min(n, cap - roster);
              for (let i = 0; i < n; i++) {
                const b = nativeHost.mintThrongBody(keeper, inst,
                  nativeHost.throngStandNear(keeper.pos), keeper.level);
                nativeHost.text(vec(b.pos.x, b.pos.y - 14), '+1', THRONG_CFG.joinColor, 11);
                roster++;
              }
              if (n > 0) nativeHost.charDirty = true;
            } else {
              // 'ring' condenses the finds in the mote near-band AROUND
              // the keeper (the worn brood's grain — a short walk, the
              // collection thesis); 'near' keeps the at-feet stoop.
              for (let i = 0; i < n; i++) {
                const spot = trickleRow.at === 'ring'
                  ? nativeHost.throngMoteSpot(keeper, 'near') ?? nativeHost.throngStandNear(keeper.pos)
                  : nativeHost.throngStandNear(keeper.pos, keeper.tier);
                nativeHost.mintThrongFind(keeper, inst, spot,
                  { ttl: trickleRow.ttl ?? THRONG_CFG.motes.ttl, tier: keeper.tier });
              }
            }
          }
        }
        // THE UNTAMED DRIVE rides the rebake beat (1s): self-issued hunt
        // orders that outlive the beat by a breath (orderSec), so the
        // stance never gaps mid-fight.
        if (spec.untamed && rebake) nativeHost.driveUntamedThrong(keeper, inst, spec);
      }
    }
  }

export function sceneUpdateLite(nativeHost:NativeSceneFrameHost, dt: number): void {
    nativeHost.liteDemoteClock -= dt;
    if (nativeHost.liteDemoteClock <= 0) {
      nativeHost.liteDemoteClock = LITE_CFG.demote.every;
      nativeHost.liteDemoteSweep();
    }
    // THE REGROWTH SWEEP (primed at 0 — colony anchors seed their
    // collective on the first tick after load, before the player blinks).
    nativeHost.liteRegenClock -= dt;
    if (nativeHost.liteRegenClock <= 0) {
      nativeHost.liteRegenClock = LITE_CFG.regen.every;
      nativeHost.liteRegenSweep();
    }
    if (nativeHost.lite.liveCount > 0) nativeHost.liteSteerAndBite(dt);
    if (nativeHost.liteXpAcc >= 1) {
      const n = Math.floor(nativeHost.liteXpAcc);
      nativeHost.liteXpAcc -= n;
      nativeHost.grantXp(n);
    }
    if (nativeHost.liteKills.size) nativeHost.liteFlushKills();
  }

export function sceneSeparateOverlappingExits(nativeHost:NativeSceneFrameHost, fromIdx = 1): void { return separateNativeExits(nativeHost.nativeExitPreparationHost(),nativeHost.nativeExitPreparationSources(),fromIdx); }

export function sceneUpdateExtraction(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, dt: number): void {
    const spec = e.def.extract!;
    const ex = e.ex;
    if (!ex) { e.phase = 'closing'; return; }
    const node = nativeHost.actorById(ex.nodeId);
    if (e.phase === 'dormant') {
      if (!node || node.dead) { e.phase = 'closing'; return; } // paranoia — dormant nodes are invulnerable
      const engaged = nativeHost.isPresentLocalPlayer() && !nativeHost.player.dead
        && dist(nativeHost.player.pos, e.pos) <= spec.arm.radius + nativeHost.player.radius
        && nativeHost.dwellReachable(nativeHost.player.pos, e.pos, transitReach('extraction'), nativeHost.storyPair(nativeHost.player));
      if (!engaged || !nativeHost.playerIdle()) { ex.dwellStart = 0; return; }
      if (ex.dwellStart === 0) {
        ex.dwellStart = nativeHost.time;
        if (!ex.spoke) {
          ex.spoke = true;
          nativeHost.text(vec(e.pos.x, e.pos.y - 40), spec.text.found, extractionLookFor(nativeHost.zone.biome).accent, 13);
        }
      }
      if (nativeHost.time - ex.dwellStart >= transitDwell('extraction', spec.arm.dwellSec)) nativeHost.armExtraction(e);
      return;
    }
    if (e.phase !== 'open') return;
    if (!node || node.dead) { nativeHost.settleExtraction(e, 'shattered'); return; }
    ex.stood += dt;
    e.timer -= dt;
    // The swarm director: cadence + batch LERP from their start bands to their
    // end bands along elapsed^rampPower — the long draw ends in a crescendo.
    const frac = clamp(ex.stood / Math.max(1, e.scale.baseTime), 0, 1);
    const ramp = Math.pow(frac, spec.swarm.rampPower);
    e.spawnTimer -= dt;
    if (e.spawnTimer <= 0 && nativeHost.extractionSwarmAlive(e) < spec.swarm.fieldCap) {
      const i0 = spec.swarm.intervalStart, i1 = spec.swarm.intervalEnd;
      e.spawnTimer = nativeHost.encRng.range(i0[0] + (i1[0] - i0[0]) * ramp, i0[1] + (i1[1] - i0[1]) * ramp);
      const b0 = spec.swarm.batchStart, b1 = spec.swarm.batchEnd;
      const batch = Math.round(nativeHost.encRng.range(b0[0] + (b1[0] - b0[0]) * ramp, b0[1] + (b1[1] - b0[1]) * ramp));
      nativeHost.spawnExtractionSwarm(e, Math.max(1, batch));
    }
    // The standing disturbance: re-seed node threat so decayed grudges drift
    // back to the work (× each body's own fixation).
    if (nativeHost.time >= ex.reseedAt) {
      ex.reseedAt = nativeHost.time + spec.swarm.beaconSec;
      const focus = nativeHost.extractTemperOf(e).focus; // THE TEMPER scales the standing pull too
      for (const id of e.spawned) {
        const a = nativeHost.actorById(id);
        if (!a || a.dead) continue;
        const fix = (a.defId ? MONSTERS[a.defId]?.aggro?.fixation : undefined) ?? 1;
        a.addThreat(ex.nodeId, spec.swarm.pulseThreat * fix * focus);
      }
    }
    if (e.timer <= 0) nativeHost.settleExtraction(e, 'depleted');
  }

export function sceneUpdateBorough(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, dt: number): void {
    const spec = e.def.borough!;
    const bo = e.bo;
    if (!bo) { e.phase = 'closing'; return; }
    if (e.phase === 'closing') return;
    if (e.phase === 'dormant') {
      // DISCOVERY: an honest sighting starts the muster (roving-arrival
      // fairness — no clock ever runs before the player could have seen it).
      if (nativeHost.isPresentLocalPlayer() && !nativeHost.player.dead
        && dist(nativeHost.player.pos, e.pos) <= spec.muster.discoverRadius
        && nativeHost.dwellReachable(nativeHost.player.pos, e.pos, DWELL_CFG.reach, nativeHost.storyPair(nativeHost.player))) {
        nativeHost.startBoroughMuster(e);
      }
      return;
    }
    const folk = nativeHost.boroughFolkAlive(e);
    if (!folk.length) { nativeHost.settleBorough(e, 'lost'); return; }
    if (spec.muster.armWindow === 'always' || bo.stage === 'muster') {
      nativeHost.updateBoroughArming(e, folk);
    }
    if (bo.stage === 'muster') {
      e.timer -= dt;
      if (e.timer <= 0) nativeHost.beginBoroughAssault(e);
      return;
    }
    if (bo.stage === 'assault') {
      bo.stood += dt;
      e.timer = Math.max(0, e.timer - dt);
      // The swarm director: cadence + batch LERP start→end along
      // elapsed^rampPower — the assault ends in a crescendo (shared shape).
      const sw = spec.assault.swarm;
      const frac = clamp(bo.stood / Math.max(1, e.scale.baseTime), 0, 1);
      const ramp = Math.pow(frac, sw.rampPower);
      e.spawnTimer -= dt;
      if (e.spawnTimer <= 0 && nativeHost.boroughSwarmAlive(e) < sw.fieldCap) {
        const i0 = sw.intervalStart, i1 = sw.intervalEnd;
        e.spawnTimer = nativeHost.encRng.range(i0[0] + (i1[0] - i0[0]) * ramp, i0[1] + (i1[1] - i0[1]) * ramp);
        const b0 = sw.batchStart, b1 = sw.batchEnd;
        const batch = Math.round(nativeHost.encRng.range(b0[0] + (b1[0] - b0[0]) * ramp, b0[1] + (b1[1] - b0[1]) * ramp));
        nativeHost.spawnBoroughWave(e, Math.max(1, batch));
      }
      // The standing peril: re-seed folk threat so a Goad's stolen grudges
      // drift back to the village — each body's own quarry, re-picked live.
      if (nativeHost.time >= bo.reseedAt) {
        bo.reseedAt = nativeHost.time + sw.beaconSec;
        for (const id of e.spawned) {
          const a = nativeHost.actorById(id);
          if (!a || a.dead) continue;
          const q = bo.quarry.get(id);
          let qa = q !== undefined ? nativeHost.actorById(q) : undefined;
          if (!qa || qa.dead) {
            qa = folk[nativeHost.encRng.int(0, folk.length - 1)];
            bo.quarry.set(id, qa.id);
          }
          const fix = (a.defId ? MONSTERS[a.defId]?.aggro?.fixation : undefined) ?? 1;
          a.addThreat(qa.id, sw.pulseThreat * fix);
        }
      }
      if (e.timer <= 0) {
        bo.stage = 'grace';
        bo.graceUntil = nativeHost.time + spec.assault.graceSec;
        e.hudLabel = `${e.scale.label} — drive them off!`;
      }
      return;
    }
    // 'grace': the pour has lapsed — the stand resolves when the field
    // clears or the stragglers' clock runs out (they disperse either way).
    if (nativeHost.boroughSwarmAlive(e) === 0 || nativeHost.time >= bo.graceUntil) {
      nativeHost.settleBorough(e, 'held');
    }
  }

export function sceneUpdateVeilCollapse(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, dt: number): void {
    // SOVEREIGNTY: census — scripted event ground (the derived census, probe_tiers RIG T).
    const v = e.def.veil!;
    const run = e.veil!;
    const lord = e.lordId ? courtLord(e.lordId) : undefined;
    const tint = lord?.color ?? e.def.trigger.color;
    e.radius = Math.max(0, e.radius - (run.collapseFrom / Math.max(0.1, v.collapseSec)) * dt);
    for (const a of nativeHost.actors) {
      if (a.dead || !e.spawned.has(a.id)) continue;
      if (dist(a.pos, e.pos) - a.radius <= e.radius) continue; // still on veiled ground
      if (MONSTERS[a.defId ?? '']?.boss || a.rarity === 'crowned'
        || (v.spareEngagedWithin > 0 && nativeHost.heroWithin(a.pos, v.spareEngagedWithin))) {
        e.spawned.delete(a.id); // CROSSED OVER — the rim never claims it now
        continue;
      }
      e.spawned.delete(a.id);
      nativeHost.slipAway(a, '', tint);
    }
    let shardGone = false;
    for (let i = run.shards.length - 1; i >= 0; i--) {
      const d = run.shards[i];
      if (dist(d.pos, e.pos) <= e.radius) continue;
      const di = nativeHost.doodads.indexOf(d);
      if (di >= 0) nativeHost.doodads.splice(di, 1);
      run.shards.splice(i, 1);
      shardGone = true;
      nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: 38, color: tint, life: 0.4, maxLife: 0.4 });
    }
    if (shardGone) nativeHost.markDoodadsChanged();
    if (e.radius <= 0) nativeHost.sealVeiled(e);
  }

export function sceneUpdateVeil(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): void {
    const v = e.def.veil!;
    const run = e.veil!;
    run.peakRadius = Math.max(run.peakRadius, e.radius);
    while (run.cursor < run.knots.length && run.knots[run.cursor].d <= e.radius + v.uncoverSlack) {
      run.pending.push(run.cursor++);
    }
    const door = e.def.court?.door;
    if (door && !run.deepened && run.peakRadius / e.scale.maxRadius >= door.atUncoverFrac) {
      run.deepened = true;
      const lord = e.lordId ? courtLord(e.lordId) : undefined;
      if (lord) {
        nativeHost.text(vec(e.pos.x, e.pos.y - 48), lord.deeds.deepen, lord.color, 16);
        nativeHost.flashes.push({ pos: vec(e.pos.x, e.pos.y), radius: 90, color: lord.color, life: 0.6, maxLife: 0.6 });
      }
    }
    let drained = 0;
    while (run.pending.length && drained < v.maxPerTick && nativeHost.insideCount(e) < ENCOUNTER_CFG.fieldCap) {
      nativeHost.activateKnot(e, run.knots[run.pending.shift()!]);
      drained++;
    }
  }

export function sceneInsideCount(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): number {
    // SOVEREIGNTY: census — a count (the derived census, probe_tiers RIG T).
    let n = 0;
    for (const a of nativeHost.actors) {
      if (a.dead || a.team !== 'enemy') continue;
      if (dist(a.pos, e.pos) - a.radius <= e.radius) n++;
    }
    return n;
  }

export function sceneSpawnInRadius(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, n: number): void {
    for (let i = 0; i < n; i++) {
      const facId = nativeHost.encRng.pick(e.def.factions);
      const roster = FACTIONS[facId];
      if (!roster?.table.length) continue;
      const type = nativeHost.weightedPick(roster.table, nativeHost.zone.level);
      const m = nativeHost.createMonster(type, nativeHost.zone.level, 'enemy');
      m.faction = facId;
      const ang = nativeHost.encRng.range(0, Math.PI * 2);
      const r = Math.sqrt(nativeHost.encRng.next()) * e.radius; // sqrt → even areal density
      m.pos = nativeHost.clampPos(vec(e.pos.x + Math.cos(ang) * r, e.pos.y + Math.sin(ang) * r), m.radius);
      e.spawned.add(m.id);
      { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
      nativeHost.emergeBody(m, {}); // THE EMERGENCE GRAMMAR: a pour's bodies arrive by the ground they stand on
    }
  }

export function sceneBeginCollapse(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): void {
    const v = e.def.veil!;
    const run = e.veil!;
    e.phase = 'collapsing';
    run.collapseFrom = Math.max(1, e.radius);
    run.pending.length = 0;
    nativeHost.text(vec(e.pos.x, e.pos.y - 30), v.text.collapse, e.def.trigger.color, 18);
  }

export function sceneCloseEncounter(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): void {
    e.phase = 'closing';
    bumpLedger(nativeHost.ledger, e.def.ledger.onClose);
    nativeHost.text(vec(e.pos.x, e.pos.y - 30), `${e.def.label} sealed!`, e.def.trigger.color, 18);
    nativeHost.flashes.push({ pos: vec(e.pos.x, e.pos.y), radius: e.radius, color: e.def.trigger.color, life: 0.5, maxLife: 0.5 });
    const mul = e.scale.rewardMul;
    nativeHost.grantXp(Math.round((ENCOUNTER_CFG.reward.xpBase + nativeHost.zone.level * ENCOUNTER_CFG.reward.xpPerLevel) * mul), e.pos); // XP BY PLACE
    const gems = 1 + Math.floor(mul);
    for (let i = 0; i < gems; i++) nativeHost.dropGemAt(e.pos);
  }

export function sceneUpdateExtractionDepartures(nativeHost:NativeSceneFrameHost, dt: number): void {
    if (!nativeHost.extractionDepartures.length) return;
    for (let i = nativeHost.extractionDepartures.length - 1; i >= 0; i--) {
      const d = nativeHost.extractionDepartures[i];
      const a = nativeHost.actorById(d.id);
      if (!a || a.dead) { nativeHost.extractionDepartures.splice(i, 1); continue; }
      if (nativeHost.time < d.leaveAt) continue; // the expedition holds
      if (!d.walking) {
        d.walking = true;
        a.aiTuning = undefined;      // the graft lifts — and the brain sleeps below
        a.threat.clear();
        a.aiTargetId = undefined;
        a.aiCommand = undefined;
        a.aiAwakened = false;
        a.aiFleeGoal = vec(d.goal.x, d.goal.y);
        a.tag = d.mode === 'resolute' ? 'extraction_leaver_resolute' : 'extraction_leaver';
      }
      if (d.mode === 'wary' && a.aiAwakened) {
        // Struck on the way out — the departure is off; the native brain fights.
        a.tag = 'extraction_spawn';
        nativeHost.extractionDepartures.splice(i, 1);
        continue;
      }
      const goal = a.aiFleeGoal!;
      a.facing = angleTo(a.pos, goal);
      nativeHost.moveActor(a, goal.x - a.pos.x, goal.y - a.pos.y, dt);
      if (dist(a.pos, goal) < d.arrive) {
        nativeHost.slipAway(a, '');
        nativeHost.extractionDepartures.splice(i, 1);
      }
    }
  }

export function sceneUpdateBoroughRefugees(nativeHost:NativeSceneFrameHost, dt: number): void {
    if (!nativeHost.boroughRefugees.length) return;
    for (let i = nativeHost.boroughRefugees.length - 1; i >= 0; i--) {
      const r = nativeHost.boroughRefugees[i];
      const a = nativeHost.actorById(r.id);
      if (!a || a.dead) { nativeHost.boroughRefugees.splice(i, 1); continue; }
      a.facing = angleTo(a.pos, r.goal);
      nativeHost.moveActor(a, r.goal.x - a.pos.x, r.goal.y - a.pos.y, dt);
      if (dist(a.pos, r.goal) < r.arrive) {
        nativeHost.slipAway(a, '');
        nativeHost.boroughRefugees.splice(i, 1);
      }
    }
  }

export function scenePickHuntDest(nativeHost:NativeSceneFrameHost): string | null {
    const valid = nativeHost.zone.exits.filter(e => {
      if (e.to === '?') return true;
      if (e.to === nativeHost.zone.id) return false;
      const z = nativeHost.zoneMap[e.to];
      return !!z && z.caveDepth == null && !z.floating && !z.eventOwned && !z.pocket
        && z.objective.kind !== 'safe';
    });
    if (!valid.length) return null;
    const e = valid[Math.floor(rand(0, valid.length))];
    if (e.to !== '?') return e.to;
    const gen = nativeHost.chartFrontier(nativeHost.zone, e);
    e.to = gen.id; // the frontier now leads to the freshly-charted (or linked) zone
    return gen.id;
  }

export function sceneTouchers(nativeHost:NativeSceneFrameHost): Actor[] {
    const out: Actor[] = [];
    for (const s of nativeHost.frameSeats()) {
      if (s.keeper || s.merc || s.actor.dead || s.actor.downed) continue;
      out.push(s.actor);
    }
    return out;
  }

export function sceneAdvanceFissure(nativeHost:NativeSceneFrameHost, dt: number, surge: FractureSurge): void {
    const run = nativeHost.fractureRun!;
    const dx = run.endpoint.x - run.head.x, dy = run.endpoint.y - run.head.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d <= 30) { nativeHost.openChasm(); return; }
    const ux = dx / d, uy = dy / d;
    const wob = Math.sin(nativeHost.time * 2.3 + run.crack.length * 0.7) * 0.6;
    const step = surge.fissureSpeed * dt;
    // SWEPT clamp (pass `from`): the head SLIDES along walls instead of teleporting.
    const c = nativeHost.clampPos(vec(run.head.x + (ux - uy * wob) * step, run.head.y + (uy + ux * wob) * step), 8, run.head);
    run.head.x = c.x; run.head.y = c.y;
    const last = run.crack[run.crack.length - 1];
    if (!last || dist(last, run.head) >= 20) run.crack.push(vec(run.head.x, run.head.y));
    // STUCK GUARD: if a wall sits between the head and its endpoint (a walled zone like
    // the Mountain), the head can never close the gap — and the player chasing it keeps
    // the timer PAUSED, so the fracture would crawl FOREVER. So if the head makes no
    // real progress toward the endpoint for a beat, ERUPT the chasm where it stands
    // (always reachable — it got here on walkable ground). This guarantees the run
    // always advances to seal/divert.
    const newD = Math.hypot(run.endpoint.x - run.head.x, run.endpoint.y - run.head.y);
    if (newD < d - step * 0.25) run.stuck = 0;
    else { run.stuck += dt; if (run.stuck >= 1.4) nativeHost.openChasm(); }
  }

export function sceneFractureFoeCount(nativeHost:NativeSceneFrameHost): number {
    let n = 0;
    for (const a of nativeHost.actors) if (!a.dead && a.tag === 'fracture_foe') n++;
    return n;
  }

export function sceneSpawnFractureFoes(nativeHost:NativeSceneFrameHost, center: Vec2, n: number, radius: number): void {
    const run = nativeHost.fractureRun;
    if (!run) return;
    const roster = FACTIONS[run.faction];
    if (!roster?.table.length) return;
    for (let i = 0; i < n; i++) {
      const type = nativeHost.weightedPick(roster.table, nativeHost.zone.level);
      const m = nativeHost.createMonster(type, nativeHost.zone.level, 'enemy');
      m.faction = run.faction;
      m.tag = 'fracture_foe';
      if (nativeHost.sim.packageActive('warbands', nativeHost.player.level) && nativeHost.fractureRng.chance(0.05)) {
        nativeHost.promoteRarity(m, 'crowned');
      }
      const ang = nativeHost.fractureRng.range(0, Math.PI * 2);
      const r = Math.sqrt(nativeHost.fractureRng.next()) * radius;
      m.pos = nativeHost.clampPos(vec(center.x + Math.cos(ang) * r, center.y + Math.sin(ang) * r), m.radius);
      if (run.phase === 'chasm') run.chasmSpawned.add(m.id);
      { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
    }
  }

export function sceneFailFracture(nativeHost:NativeSceneFrameHost): void {
    const ff = nativeHost.sim.fractureField;
    const run = nativeHost.fractureRun;
    if (!ff || !run) return;
    const at = run.chasm ?? run.head;
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 90, color: '#5a3a8a', life: 0.5, maxLife: 0.5 });
    nativeHost.notice('Fracture Sealed', '#9a7ad0', 15, 'events');
    ff.endFracture();
    run.phase = 'done';
    nativeHost.clearFractureRun(true);
  }

export function sceneSealChasm(nativeHost:NativeSceneFrameHost): void {
    const ff = nativeHost.sim.fractureField;
    const run = nativeHost.fractureRun;
    if (!ff || !run) return;
    const surge = ff.surge();
    const at = run.chasm ?? run.head;
    nativeHost.removeFractureChasmDoodad();
    run.chasmsSealed++;
    bumpLedger(nativeHost.ledger, 'fracture_chasms_cleared');
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: surge.chasm.radius, color: run.color, life: 0.5, maxLife: 0.5 });
    nativeHost.grantXp(Math.round(surge.chasmRewardXp + nativeHost.zone.level * surge.chasmXpPerLevel), at); // XP BY PLACE
    nativeHost.dropGemAt(at);
    if (run.chasmsSealed < run.chasmsTarget) {
      run.phase = 'fissure';
      run.head = vec(at.x, at.y);
      run.crack = [vec(at.x, at.y)];
      run.endpoint = nativeHost.fracturePoint(at);
      run.timer = run.maxTimer; // REFRESH
      run.trickle = 0;
      run.stuck = 0;
      run.chasm = null;
      nativeHost.text(vec(at.x, at.y - 30), 'The fissure splits onward!', run.color, 15);
    } else {
      nativeHost.divertOrEndFracture(at);
    }
  }

export function sceneOpenHoldfastExit(nativeHost:NativeSceneFrameHost, msg: string): void {
    const site = nativeHost.holdfastSite;
    const hf = nativeHost.sim.holdfastField;
    if (!site || !hf) return;
    hf.unlock(site.zoneId);
    bumpLedger(nativeHost.ledger, 'holdfasts_opened');
    if (site.gateDoodads.length) nativeHost.doodads = nativeHost.doodads.filter(d => !site.gateDoodads.includes(d));
    const portal = nativeHost.exits.find(e => nativeHost.zone.exits[e.defIndex]?.lock === site.lockId);
    if (portal || nativeHost.isPresentLocalPlayer()) {
    const at = portal ? portal.pos : nativeHost.player.pos;
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 90, color: '#9ad0e0', life: 0.8, maxLife: 0.8 });
    nativeHost.text(vec(at.x, at.y - 40), msg, '#9ad0e0', 16);
    }
    nativeHost.holdfastSite = null;
  }

export function sceneRampageCauseOf(nativeHost:NativeSceneFrameHost, a: Actor): string {
    return a.eventKey ?? `def:${a.defId ?? a.name}`;
  }

export function sceneRampageCrush(nativeHost:NativeSceneFrameHost, a: Actor, px: number, py: number, pr: number, spec: RampageSpec, cause: string): void {
    const reach = (spec.reach ?? RAMPAGE_CFG.reach) + pr;
    for (const d of nativeHost.doodadsNear(px, py, reach + 12)) {
      if ((d.tier ?? 0) !== (a.tier ?? 0)) continue; // its own story's furniture only
      if (!fellableDoodad(d)) continue;
      const ch = doodadRuleOf(d.kind).blocksMove ? 'move' : 'shot';
      if (!shapeContains(hitSurfaceOf(d, ch), d.pos.x, d.pos.y, px, py, reach)) continue;
      nativeHost.fellDoodad(d, cause, spec);
    }
  }

export function sceneRampageBlockedStand(nativeHost:NativeSceneFrameHost, d: Doodad): boolean {
    // SOVEREIGNTY: self — the rampager's own stand (the derived census, probe_tiers RIG T).
    if (!doodadRuleOf(d.kind).blocksMove) return false; // never pushes → can never entomb
    const s = hitSurfaceOf(d, 'move');
    for (const a of nativeHost.actors) {
      if (a.dead) continue;
      if (shapeContains(s, d.pos.x, d.pos.y, a.pos.x, a.pos.y, a.radius * 0.8)) return true;
    }
    return false;
  }

export function sceneWornThrongAnchored(nativeHost:NativeSceneFrameHost, owner: Actor, marker: string | undefined): boolean {
    if (!marker?.startsWith('__throng:worn:')) return false;
    const def = wornThrongDefOfSkillId(marker.slice('__throng:'.length));
    return !!def && owner.sheet.get(wornThrongStat(def.id)) > 0;
  }

export function sceneWornThrongAnchorsOf(nativeHost:NativeSceneFrameHost, keeper: Actor): { inst: SkillInstance; spec: ThrongSpec }[] {
    let out: { inst: SkillInstance; spec: ThrongSpec }[] | null = null;
    let mine = nativeHost.wornThrongInsts.get(keeper.id);
    for (const def of Object.values(WORN_THRONGS)) {
      const rank = keeper.sheet.get(wornThrongStat(def.id));
      if (rank <= 0) { mine?.delete(def.id); continue; }
      if (!mine) nativeHost.wornThrongInsts.set(keeper.id, mine = new Map());
      let row = mine.get(def.id);
      if (!row) {
        row = { inst: makeSkillInstance(buildWornThrongDef(def, rank), 1), rank };
        mine.set(def.id, row);
      } else if (row.rank !== rank) {
        row.inst.def = buildWornThrongDef(def, rank);
        row.rank = rank;
      }
      (out ??= []).push({ inst: row.inst, spec: row.inst.def.throng! });
    }
    return out ?? [];
  }

export function sceneMinionNeedsFullDurability(nativeHost:NativeSceneFrameHost, caster: Actor, inst: SkillInstance): boolean {
    if (inst.def.hivecall || (inst.def.throng && inst.treeNodes?.length)) return true;
    const tags = skillContextTags(inst), extra = instanceMods(inst);
    return MINION_COMBAT.actorDurabilityStats.some(stat => caster.sheet.get(stat, tags, extra) > 0);
  }

export function sceneClaimThrongHusk(nativeHost:NativeSceneFrameHost, keeper: Actor, inst: SkillInstance, husk: Actor): void {
    if (husk.throngEgg) {
      const count = Math.min(husk.throngEgg, nativeHost.throngRecruitCap(keeper, inst) - nativeHost.throngRosterCount(keeper, inst));
      if (count <= 0) return;
      const at = { ...husk.pos };
      const bodies = nativeHost.throngGain(keeper, inst, count);
      if (bodies.length) nativeHost.throngEvolutionBurst(bodies[0], at, THRONG_EVOLUTION.eggRadius,
        THRONG_EVOLUTION.eggScale * bodies.length);
      if (husk.throngPocketKey) nativeHost.throngClaimed.add(husk.throngPocketKey);
      nativeHost.kill(husk, true);
      return;
    }
    const bodyKind = husk.defId;
    if (husk.throngPocketKey) nativeHost.throngClaimed.add(husk.throngPocketKey);
    husk.throngWild = undefined;
    const at = vec(husk.pos.x, husk.pos.y);
    let radius = husk.radius;
    nativeHost.kill(husk, true);
    const spec = inst.def.throng!;
    if (spec.tier === 'lite' && bodyKind === spec.monsterId && !nativeHost.minionNeedsFullDurability(keeper, inst)) {
      // THE LITE TIER (engine/lite.ts): the claim joins the POOL — a row,
      // not a minion. Promotion mints the real body when a boundary asks.
      const kindIdx = nativeHost.liteKindOf(spec.monsterId);
      if (kindIdx >= 0) {
        nativeHost.lite.spawn(kindIdx, at.x, at.y, 1, keeper.id, nativeHost.liteKinds[kindIdx].plies0);
      }
    } else {
      const body = nativeHost.mintThrongBody(keeper, inst, at, keeper.level, bodyKind);
      at.x = body.pos.x; at.y = body.pos.y;
      radius = body.radius;
    }
    nativeHost.text(vec(at.x, at.y - 14), '+1', THRONG_CFG.joinColor, 11);
    nativeHost.flashes.push({
      pos: vec(at.x, at.y), radius: radius + 8,
      color: THRONG_CFG.joinColor, life: 0.35, maxLife: 0.35,
    });
    nativeHost.charDirty = true;
  }

export function sceneThrongMoteSpot(nativeHost:NativeSceneFrameHost, keeper: Actor, at: 'near' | 'far' | 'lastKill' | 'mixed'): Vec2 | null {
    if (at === 'mixed') at = chance(0.5) ? 'near' : 'far';
    if (at === 'lastKill') {
      const p = nativeHost.throngLastKill.get(keeper.id);
      if (p && nativeHost.walk?.isWalkable(p.x, p.y)) return nativeHost.throngStandNear(p);
    }
    if (at === 'far') {
      for (let i = 0; i < 14; i++) {
        const x = rand(80, nativeHost.arena.w - 80), y = rand(80, nativeHost.arena.h - 80);
        if (dist(vec(x, y), keeper.pos) < THRONG_CFG.motes.farMin) continue;
        if (nativeHost.walk && !nativeHost.walk.isWalkable(x, y)) continue;
        if (nativeHost.pointInSolid(x, y, 10)) continue;
        return vec(x, y);
      }
      const stand = nativeHost.farthestStand(10, false);
      if (stand) return stand;
    }
    const band = THRONG_CFG.motes.near;
    for (let i = 0; i < 10; i++) {
      const ang = rand(0, Math.PI * 2);
      const d = rand(band[0], band[1]);
      const x = keeper.pos.x + Math.cos(ang) * d, y = keeper.pos.y + Math.sin(ang) * d;
      if (nativeHost.walk && !nativeHost.walk.isWalkable(x, y)) continue;
      if (nativeHost.pointInSolid(x, y, 10)) continue;
      return vec(x, y);
    }
    return null;
  }

export function sceneDriveUntamedThrong(nativeHost:NativeSceneFrameHost, keeper: Actor, inst: SkillInstance, spec: ThrongSpec): void {
    // SOVEREIGNTY: self — the keeper's own throng (the derived census, probe_tiers RIG T).
    const bodies = nativeHost.throngBodiesOf(keeper, inst.def.id);
    if (!bodies.length) return;
    const reach = spec.untamed?.huntRadius ?? THRONG_CFG.untamed.huntRadius;
    const until = nativeHost.time + THRONG_CFG.untamed.orderSec;
    const prey: Actor[] = [];
    for (const e of nativeHost.enemiesOf(keeper)) {
      if (e.dead || e.passive || e.untargetable || e.sheet.get('invisible') > 0) continue;
      if (dist(e.pos, keeper.pos) > reach) continue;
      prey.push(e);
    }
    if (!prey.length) return;
    for (const b of bodies) {
      // minionCombat: a keeper's recall or focus order outranks self-hunting.
      if (b.aiCommand && b.aiCommand.until > nativeHost.time && !b.aiCommand.autonomous) continue;
      let best: Actor | null = null;
      let bd = Infinity;
      for (const e of prey) {
        const dd = dist(b.pos, e.pos);
        if (dd < bd) { bd = dd; best = e; }
      }
      if (!best) continue;
      const cmd: CommandState = {
        kind: 'assault', pos: vec(best.pos.x, best.pos.y), until,
        radius: THRONG_CFG.direct.radius, issuerId: keeper.id, targetId: best.id,
        autonomous: true, // minionCombat: subordinate to the keeper's next order
      };
      issueCommand(b, cmd);
    }
  }

export function sceneLiteDemoteSweep(nativeHost:NativeSceneFrameHost): void {
    const pool = nativeHost.lite;
    for (const a of [...nativeHost.actors]) {
      if (a.dead || !a.owner || !isThrongBody(a)) continue;
      const inst = a.owner.skills.find(s => s && throngMarkerOf(s.def.id) === a.sourceSkillId);
      const spec = inst?.def.throng;
      if (!spec || spec.tier !== 'lite') continue;
      if (a.defId !== spec.monsterId) continue; // Substitutions keep their body kind and original anchor.
      // minionCombat: the pool has no life pool or owner-derived ply budget.
      // Invested/wounded bodies retain their full actor state instead of
      // losing bought armor or silently recovering it on a round trip.
      if (nativeHost.minionNeedsFullDurability(a.owner, inst)
        || a.plies < a.pliesMax || a.life < a.maxLife() || a.assaultOrbit
        || a.sheet.getSourceMods('assault:formation')?.length) continue;
      if (a.clingTo || a.heldBy !== undefined || a.gripping || a.casting) continue;
      if (a.aiCommand || a.aiTargetId !== undefined) continue;
      if (a.statuses.length > 0 || a.buffs.size > 0) continue;
      const kindIdx = nativeHost.liteKindOf(spec.monsterId);
      if (kindIdx < 0) continue;
      const k = nativeHost.liteKinds[kindIdx];
      const spent = a.pliesMax > 0 ? Math.max(0, a.pliesMax - a.plies) : 0;
      if (pool.spawn(kindIdx, a.pos.x, a.pos.y, 1, a.owner.id,
        Math.max(1, k.plies0 - spent), -1, a.tier) < 0) continue; // the row keeps its keeper's story
      nativeHost.kill(a, true);
    }
    for (let i = 0; i < pool.used; i++) {
      if (!pool.alive[i] || !pool.owner[i]) continue;
      const k = nativeHost.liteKinds[pool.kind[i]];
      if (!k) { pool.free(i); continue; }
      const keeper = nativeHost.actorById(pool.owner[i]);
      const anchored = keeper && !keeper.dead && keeper.skills.some(s =>
        s?.def.throng?.tier === 'lite' && s.def.throng.monsterId === k.defId);
      if (anchored) continue;
      const hx = pool.x[i], hy = pool.y[i];
      pool.free(i);
      nativeHost.mintThrongHusk(k.defId, vec(hx, hy), { ttl: THRONG_CFG.motes.ttl * 2 });
    }
  }

export function sceneLiteRegenSweep(nativeHost:NativeSceneFrameHost): void {
    // SOVEREIGNTY: census — native pocket bookkeeping (probe_tiers RIG T).
    if (nativeHost.liteWhenCueDraws.length) {
      const still: LiteCond[] = [];
      for (const when of nativeHost.liteWhenCueDraws) {
        if (nativeHost.liteCondHeld(when)) {
          for (let seat = 0; seat < nativeHost.frameSeats().length; seat++) rand(-10, 10);
        } else still.push(when);
      }
      nativeHost.liteWhenCueDraws = still;
    }
    // Anchor discovery: any living body wearing MonsterDef.colony.
    for (const a of nativeHost.actors) {
      if (a.dead || !a.defId || nativeHost.liteColonySeen.has(a.id)) continue;
      const spec = MONSTERS[a.defId]?.colony;
      if (!spec) continue;
      nativeHost.liteColonySeen.add(a.id);
      const kindIdx = nativeHost.liteKindOf(spec.monsterId);
      if (kindIdx < 0) continue;
      const pk = nativeHost.litePockets.length;
      const p = nativeHost.litePocketPush(spec, kindIdx, a.pos.x, a.pos.y, spec.cap, a.id, spec.radius);
      const seed = Math.min(p.cap,
        Math.round(p.cap * (spec.seedFrac ?? LITE_CFG.regen.seedFrac)));
      for (let s = 0; s < seed; s++) nativeHost.litePocketBirth(pk, p);
    }
    const pks = nativeHost.litePockets;
    if (!pks.length) return;
    // Census — one pass over the pool.
    for (const p of pks) p.live = 0;
    const pool = nativeHost.lite;
    for (let i = 0; i < pool.used; i++) {
      if (!pool.alive[i]) continue;
      const pk = pool.pocket[i];
      if (pk >= 0 && pk < pks.length) pks[pk].live++;
    }
    for (let pk = 0; pk < pks.length; pk++) {
      const p = pks[pk];
      if (p.extinct) continue;
      // THE POUR'S HOUR (LiteSwarmRow.when → LitePocket.when): resolved
      // once per pocket per sweep — everything below branches on it.
      const held = nativeHost.liteCondHeld(p.when);
      if (p.anchorId) {
        const anchor = nativeHost.actorById(p.anchorId);
        if (!anchor || anchor.dead) { nativeHost.litePocketExtinct(pk, p); continue; }
        // The heart WALKS with a living anchor — a lumbering brood carries
        // its collective's home on its back.
        p.x = anchor.pos.x; p.y = anchor.pos.y;
      } else if (p.poured && p.live === 0) {
        // THE EXTERMINATION LAW: an ambient pocket wiped to zero has
        // nothing left to breed back — the burrow seals. A CONDITIONED
        // pocket out of its hour is exempt: a tide that receded at dawn
        // drained itself, and what the hour took the hour returns.
        if (held) {
          nativeHost.litePocketExtinct(pk, p);
          continue;
        }
      }
      if (!held) {
        // THE RECEDING TIDE: out of its hour a conditioned pocket stops
        // breeding and gently culls toward empty — at its own regrowth
        // rate, so the dusk that raises a tide in minutes is the dawn
        // that lowers it in minutes. No disturbance stamp, no extinction:
        // the hour is weather, not violence.
        p.acc = 0;
        if (p.live > 0) nativeHost.litePocketRecede(pk, p);
        continue;
      }
      if (p.live >= p.cap) { p.acc = 0; continue; }
      if (nativeHost.time < p.disturbedUntil) continue;
      // The calm gate: nothing breeds under a predator's shadow.
      let calm = true;
      for (const seat of nativeHost.frameSeats()) {
        const s = seat.actor;
        if (s.dead) continue;
        const dx = s.pos.x - p.x, dy = s.pos.y - p.y;
        if (dx * dx + dy * dy <= p.calmRadius * p.calmRadius) { calm = false; break; }
      }
      if (!calm) continue;
      p.acc += p.rate * LITE_CFG.regen.every;
      let n = Math.floor(p.acc);
      if (n <= 0) continue;
      p.acc -= n;
      n = Math.min(n, p.cap - p.live);
      for (let s = 0; s < n; s++) nativeHost.litePocketBirth(pk, p);
    }
  }

export function sceneLiteSteerAndBite(nativeHost:NativeSceneFrameHost, dt: number): void {
    const pool = nativeHost.lite;
    const kinds = nativeHost.liteKinds;
    pool.rebuildBuckets();
    nativeHost.litePromoteBudget = LITE_CFG.promote.latchPerSweep;
    const t = nativeHost.time;
    const wobTick = (t * LITE_CFG.steer.wobbleHz) | 0;
    const s = nativeHost.liteVec;
    const keepers = nativeHost.liteKeeperScratch;
    keepers.clear();
    for (let i = 0; i < pool.used; i++) {
      if (!pool.alive[i]) continue;
      const k = kinds[pool.kind[i]];
      if (!k) { pool.free(i); continue; }
      // FIXTURE kinds (speed 0): truly pinned — no goal, no weave, no
      // separation shove; any residual nudge bleeds off. A speed-0 row is
      // a prop with plies (barnacles, eggs), not a slow walker.
      if (k.speed <= 0) {
        pool.vx[i] *= 0.7;
        pool.vy[i] *= 0.7;
        continue;
      }
      const px = pool.x[i], py = pool.y[i];
      let gx = px, gy = py, arrive = 10;
      const own = pool.owner[i];
      if (own) {
        let keeper = keepers.get(own);
        if (keeper === undefined) { keeper = nativeHost.actorById(own) ?? null; keepers.set(own, keeper); }
        const order = nativeHost.liteOrders.get(own * 256 + pool.kind[i]);
        if (order && t < order.until) {
          const tgt = order.targetId !== undefined ? nativeHost.actorById(order.targetId) : undefined;
          if (tgt && !tgt.dead) { gx = tgt.pos.x; gy = tgt.pos.y; arrive = tgt.radius + k.radius + 2; }
          else { gx = order.x; gy = order.y; arrive = 14; }
        } else if (keeper && !keeper.dead) {
          liteRingOffset(pool.seat[i], t, s);
          gx = keeper.pos.x + s.x; gy = keeper.pos.y + s.y;
          arrive = 8;
        } else { gx = pool.hx[i]; gy = pool.hy[i]; }
      } else {
        let bd = k.aggro * k.aggro, found = false;
        for (const seat of nativeHost.frameSeats()) {
          const a = seat.actor;
          if (a.dead || a.downed) continue;
          if (a.tier !== pool.story[i]) continue; // the tide hunts its own story (the sovereignty gate)
          const dx = a.pos.x - px, dy = a.pos.y - py;
          const dd = dx * dx + dy * dy;
          if (dd < bd) { bd = dd; gx = a.pos.x; gy = a.pos.y; found = true; }
        }
        if (found) arrive = 6;
        else {
          const slow = (t * 0.25) | 0;
          const wang = liteNoise(i, slow) * Math.PI;
          gx = pool.hx[i] + Math.cos(wang) * LITE_CFG.homeLeash * Math.abs(liteNoise(i + 7717, slow));
          gy = pool.hy[i] + Math.sin(wang) * LITE_CFG.homeLeash * Math.abs(liteNoise(i + 3191, slow));
          arrive = 18;
        }
      }
      const dx = gx - px, dy = gy - py;
      const d = Math.hypot(dx, dy);
      let dvx = 0, dvy = 0;
      if (d > arrive) {
        const jit = 1 + (((pool.seat[i] >>> 8) & 0xff) / 255 - 0.5) * 2 * LITE_CFG.steer.speedJitter;
        const speed = k.speed * jit;
        const head = Math.atan2(dy, dx)
          + liteNoise(i, wobTick) * LITE_CFG.steer.erratic * k.erratic;
        dvx = Math.cos(head) * speed;
        dvy = Math.sin(head) * speed;
        weaveVel(LITE_CFG.steer.weave * k.weave, LITE_CFG.steer.weaveAmp,
          t + pool.phase[i], head, s);
        dvx += s.x; dvy += s.y;
      }
      pool.sepFold(i, k.radius * 2.4, LITE_CFG.steer.sepIters, s);
      dvx += s.x * LITE_CFG.steer.sep * k.separation;
      dvy += s.y * LITE_CFG.steer.sep * k.separation;
      const cr = Math.min(1, LITE_CFG.steer.accel * dt);
      pool.vx[i] += (dvx - pool.vx[i]) * cr;
      pool.vy[i] += (dvy - pool.vy[i]) * cr;
      const nx = px + pool.vx[i] * dt, ny = py + pool.vy[i] * dt;
      if (nativeHost.liteOpenAt(nx, ny)) { pool.x[i] = nx; pool.y[i] = ny; }
      else if (nativeHost.liteOpenAt(nx, py)) { pool.x[i] = nx; pool.vy[i] *= -0.4; }
      else if (nativeHost.liteOpenAt(px, ny)) { pool.y[i] = ny; pool.vx[i] *= -0.4; }
      else { pool.vx[i] *= -0.5; pool.vy[i] *= -0.5; }
    }
    // THE POOLED BITE + THE LATCH BOUNDARY, per victim.
    const victims = nativeHost.liteVictimScratch;
    victims.length = 0;
    for (const a of nativeHost.actors) {
      if (a.dead || a.downed || a.untargetable || a.passive || a.throngWild) continue;
      if (isDormant(a)) continue;
      victims.push(a);
    }
    for (const v of victims) nativeHost.liteBiteVictim(v, t);
    victims.length = 0;
    if (nativeHost.liteBeatAt.size > 512) nativeHost.liteBeatAt.clear();
  }

export function sceneLiteFlushKills(nativeHost:NativeSceneFrameHost): void {
    if (nativeHost.metaProgressionActive()) {
      for (const [defId, n] of nativeHost.liteKills) {
        const def = MONSTERS[defId];
        if (!def || !bestiaryEligible(def)) continue;
        const need = bestiaryThreshold(def);
        const have = bestiaryKills(nativeHost.account, defId);
        if (have >= need) continue;
        const key = bestiaryKey(defId);
        nativeHost.account.ledger[key] = (nativeHost.account.ledger[key] ?? 0) + Math.min(n, need - have);
      }
    }
    nativeHost.liteKills.clear();
  }

export function sceneArmExtraction(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): void {
    const spec = e.def.extract!;
    const ex = e.ex!;
    const node = nativeHost.actorById(ex.nodeId);
    if (!node || node.dead) return;
    e.phase = 'open';
    e.timer = e.scale.baseTime;
    e.maxTimer = e.scale.baseTime;
    e.spawnTimer = 1.4; // one breath before the first pulse — see it begin
    node.untargetable = false;
    node.invulnerable = false;
    bumpLedger(nativeHost.ledger, e.def.ledger.onEncounter); // DISCOVERY — the Vault card surfaces
    const look = extractionLookFor(nativeHost.zone.biome);
    // The armed line names the roll ("Deep Seam, a wary swarm — …"): the
    // swarm's conduct is the rest of the tell.
    nativeHost.text(vec(e.pos.x, e.pos.y - 30), `${e.scale.label}, ${nativeHost.extractTemperOf(e).label} — ${spec.text.armed}`, look.accent, 16);
    nativeHost.flashes.push({ pos: vec(e.pos.x, e.pos.y), radius: 90, color: look.accent, life: 0.6, maxLife: 0.6 });
  }

export function sceneSettleExtraction(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, outcome: 'depleted' | 'shattered'): void {
    const spec = e.def.extract!;
    const ex = e.ex!;
    if (ex.settled) return;
    ex.settled = outcome;
    e.phase = 'closing';
    const look = extractionLookFor(nativeHost.zone.biome);
    const full = outcome === 'depleted';
    const frac = full ? 1 : clamp(ex.stood / Math.max(1, e.scale.baseTime), 0, 1);
    nativeHost.payExtraction(e, frac, full);
    if (full) bumpLedger(nativeHost.ledger, e.def.ledger.onClose);
    else bumpLedger(nativeHost.ledger, spec.ledgerLost);
    nativeHost.text(vec(e.pos.x, e.pos.y - 30), full ? spec.text.depleted : spec.text.shattered, look.accent, 16);
    nativeHost.flashes.push({ pos: vec(e.pos.x, e.pos.y), radius: 130, color: look.accent, life: 0.6, maxLife: 0.6 });
    // The node body: a drained seam empties quietly; a shattered one already fell.
    const node = nativeHost.actorById(ex.nodeId);
    if (node && !node.dead && full) nativeHost.slipAway(node, '');
    // The well stills — the same painter, spent (the ward-seal kind-swap).
    if (ex.well && !ex.well.kind.endsWith('_spent')) ex.well.kind = `${ex.well.kind}_spent`;
    // Map memory: this ground is spent until it replenishes.
    nativeHost.sim.extractionField?.markSpent(nativeHost.zone.id, nativeHost.time);
    // DISPERSAL — the swarm goes home the way it came, each by its temper.
    nativeHost.disperseSwarmBodies(e.spawned, ex.entries, e.pos, spec.arm.radius + 190, spec.disperse);
  }

export function sceneExtractionSwarmAlive(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): number {
    let n = 0;
    for (const id of e.spawned) {
      const a = nativeHost.actorById(id);
      if (a && !a.dead) n++;
    }
    return n;
  }

export function sceneSpawnExtractionSwarm(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, n: number): void {
    const spec = e.def.extract!;
    const ex = e.ex!;
    const lvl = Math.max(1, nativeHost.zone.level + spec.swarm.levelBonus);
    const native = spec.swarm.source === 'native'
      ? nativeHost.effectiveSpawn(nativeHost.zone, nativeHost.baseTable(nativeHost.zone)).table : [];
    for (let i = 0; i < n; i++) {
      let table = native;
      let fac: string | undefined;
      if (!table.length || (spec.swarm.mixChance > 0 && nativeHost.encRng.chance(spec.swarm.mixChance))) {
        const facId = nativeHost.encRng.pick(e.def.factions);
        const roster = FACTIONS[facId];
        if (roster?.table.length) { table = roster.table; fac = facId; }
      }
      if (!table.length) continue;
      const type = nativeHost.weightedPick(table, lvl);
      const m = nativeHost.createMonster(type, lvl, 'enemy');
      m.faction = fac ?? MONSTERS[type]?.faction;
      m.tag = 'extraction_spawn';
      m.eventKey = `extraction:${nativeHost.zone.id}`;
      const at = nativeHost.extractionEntryPoint(e);
      m.pos = nativeHost.clampPos(vec(at.x + rand(-30, 30), at.y + rand(-30, 30)), m.radius);
      ex.entries.set(m.id, vec(m.pos.x, m.pos.y));
      // THE FIXATION GRAFT: the disturbance is the enemy — until you out-shout
      // it on the chart (resolveHit books your damage × your threatGen), then
      // decay melts the grudge and the body drifts back to work.
      const ag = m.defId ? MONSTERS[m.defId]?.aggro : undefined;
      m.aiTuning = {
        target: {
          prefer: 'highestThreat', relentless: true, stickiness: spec.swarm.stickiness,
          threat: { damage: ag?.fury ?? 1, decay: spec.swarm.decay * (ag?.waver ?? 1) },
        },
      };
      // THE TEMPER (her ask 2026-09-11): the node's seed × the roll's focus,
      // and a player-first temper stamps its hero threat at the nearest local
      // hand — the swarm comes for the defender, the seam is its fallback.
      const temper = nativeHost.extractTemperOf(e);
      m.addThreat(ex.nodeId, spec.swarm.seedThreat * (ag?.fixation ?? 1) * temper.focus);
      if (temper.heroThreat > 0) {
        // SOVEREIGNTY: targeting — a threat seed toward the nearest defender
        // is aim, never a touch; the chase itself rides the AI's own story law.
        let hero: Actor | null = null, hd = Infinity;
        for (const s of nativeHost.localHumanSeats()) {
          if (s.actor.dead || s.actor.downed) continue;
          const d = dist(s.actor.pos, m.pos);
          if (d < hd) { hd = d; hero = s.actor; }
        }
        if (hero) m.addThreat(hero.id, temper.heroThreat);
      }
      m.aiTargetId = ex.nodeId;
      m.aggroed = true;
      e.spawned.add(m.id);
      { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
    }
  }

export function sceneExtractTemperOf(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): ExtractTemperSpec {
    const rows = e.def.extract!.swarm.tempers;
    if (!rows?.length) return CLASSIC_EXTRACT_TEMPER;
    return rows.find(t => t.id === e.ex?.temper) ?? rows[0];
  }

export function sceneStartBoroughMuster(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): void {
    const spec = e.def.borough!;
    e.phase = 'open';
    e.bo!.stage = 'muster';
    e.timer = spec.muster.seconds;
    e.maxTimer = spec.muster.seconds;
    e.hudLabel = `${e.scale.label} — the horde comes`;
    bumpLedger(nativeHost.ledger, e.def.ledger.onEncounter); // DISCOVERY — the Vault card surfaces
    for (const f of nativeHost.boroughFolkAlive(e)) { f.untargetable = false; f.invulnerable = false; }
    nativeHost.text(vec(e.pos.x, e.pos.y - 34), spec.text.found, e.def.trigger.color, 15);
    nativeHost.flashes.push({ pos: vec(e.pos.x, e.pos.y), radius: 110, color: e.def.trigger.color, life: 0.6, maxLife: 0.6 });
  }

export function sceneBoroughFolkAlive(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): Actor[] {
    const out: Actor[] = [];
    for (const id of e.bo?.folkIds ?? []) {
      const a = nativeHost.actorById(id);
      if (a && !a.dead) out.push(a);
    }
    return out;
  }

export function sceneSettleBorough(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, outcome: 'held' | 'lost'): void {
    const spec = e.def.borough!;
    const bo = e.bo!;
    if (bo.settled) return;
    bo.settled = outcome;
    e.phase = 'closing';
    const held = outcome === 'held';
    const survivors = nativeHost.boroughFolkAlive(e);
    if (held) bumpLedger(nativeHost.ledger, e.def.ledger.onClose);
    else bumpLedger(nativeHost.ledger, spec.ledgerLost);
    nativeHost.text(vec(e.pos.x, e.pos.y - 30), held ? spec.text.held : spec.text.lost, e.def.trigger.color, 16);
    nativeHost.flashes.push({ pos: vec(e.pos.x, e.pos.y), radius: 130, color: e.def.trigger.color, life: 0.6, maxLife: 0.6 });
    // Map memory: this ground is settled (either way) until it resettles.
    nativeHost.sim.boroughField?.markSpent(nativeHost.zone.id, nativeHost.time);
    if (held && survivors.length) {
      // THE REFUGE: population grows NOW — the walk out is theatre, and
      // leaving the zone mid-stride never uncounts a soul who made it.
      const souls = survivors.length * spec.refugees.populationPer;
      nativeHost.sim.boroughField?.addRefugees(souls);
      bumpLedger(nativeHost.ledger, spec.ledgerRefugees, souls);
      // THE SHELTERED: the ACCOUNT counts them the moment they arrive (the
      // quest-turn-in durability precedent) — Lastlight's residents
      // (data/boroughs.ts TOWN_RESIDENTS) read this lifetime count, so a
      // family that settles stays settled across runs.
      if (nativeHost.metaProgressionActive()) {
        noteSoulsSheltered(nativeHost.account, souls);
        nativeHost.accountDirty = true;
      }
      const xp = Math.round((spec.refugees.xpBase + spec.refugees.xpPerSurvivor * survivors.length) * e.scale.rewardMul);
      if (xp > 0) nativeHost.grantXp(xp, e.pos); // XP BY PLACE
      // The road out: dormant resolute walkers, wheeled by the world tick.
      for (const f of survivors) {
        f.tag = 'borough_refugee';
        f.aiAwakened = false;
        f.threat.clear();
        f.aiTargetId = undefined;
        f.aiTuning = undefined;
        const goal = nativeHost.nearestExitPos(f.pos) ?? vec(e.pos.x, e.pos.y);
        f.aiFleeGoal = vec(goal.x, goal.y);
        nativeHost.boroughRefugees.push({ id: f.id, goal: vec(goal.x, goal.y), arrive: spec.refugees.arriveDist });
      }
    }
    // DISPERSAL — the horde goes home the way it came, each by its temper.
    nativeHost.disperseSwarmBodies(e.spawned, bo.entries, e.pos, e.scale.startRadius + 190, spec.assault.disperse);
  }

export function sceneUpdateBoroughArming(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, folk: Actor[]): void {
    const spec = e.def.borough!;
    const bo = e.bo!;
    const reach = transitReach('borough_arm');
    const radius = transitRadius('borough_arm', spec.arming.radius);
    let nearest: Actor | null = null;
    let nd = Infinity;
    for (const f of folk) {
      const nativePlayerPresent = nativeHost.isPresentLocalPlayer();
      const d = nativePlayerPresent ? dist(nativeHost.player.pos, f.pos) : Infinity;
      if (!nativePlayerPresent || d > radius + nativeHost.player.radius || !nativeHost.dwellReachable(nativeHost.player.pos, f.pos, reach, nativeHost.storyPair(nativeHost.player, f))) {
        bo.armDwellStart.delete(f.id);
        bo.armAsked.delete(f.id); // out of reach = the approach ended; re-ask next time
        continue;
      }
      if (d < nd) { nd = d; nearest = f; }
    }
    if (!nearest || nativeHost.player.dead) return;
    for (const f of folk) if (f !== nearest) bo.armDwellStart.delete(f.id);
    if (bo.armAsked.has(nearest.id)) return;
    if (!nativeHost.playerIdle()) { bo.armDwellStart.delete(nearest.id); return; }
    const start = bo.armDwellStart.get(nearest.id) ?? 0;
    if (start === 0) { bo.armDwellStart.set(nearest.id, nativeHost.time); return; }
    if (nativeHost.time - start >= transitDwell('borough_arm', spec.arming.dwellSec)) {
      bo.armAsked.add(nearest.id);
      bo.armDwellStart.delete(nearest.id);
      nativeHost.boroughArmFolkId = nearest.id;
      nativeHost.boroughArmRequested = true; // main.ts opens the panel (station-menu indirection)
    }
  }

export function sceneBeginBoroughAssault(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): void {
    const bo = e.bo!;
    bo.stage = 'assault';
    bo.stood = 0;
    bo.reseedAt = 0;
    e.timer = e.scale.baseTime;
    e.maxTimer = e.scale.baseTime;
    e.spawnTimer = 1.4; // one breath before the first pour — see it begin
    e.hudLabel = `${e.scale.label} — hold the line!`;
    nativeHost.text(vec(e.pos.x, e.pos.y - 34), e.def.borough!.text.assault, '#d85a4a', 16);
    nativeHost.flashes.push({ pos: vec(e.pos.x, e.pos.y), radius: 150, color: '#d85a4a', life: 0.7, maxLife: 0.7 });
  }

export function sceneBoroughSwarmAlive(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): number {
    let n = 0;
    for (const id of e.spawned) {
      const a = nativeHost.actorById(id);
      if (a && !a.dead) n++;
    }
    return n;
  }

export function sceneSpawnBoroughWave(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, n: number): void {
    const spec = e.def.borough!;
    const bo = e.bo!;
    const folk = nativeHost.boroughFolkAlive(e);
    if (!folk.length) return;
    const sw = spec.assault.swarm;
    const lvl = Math.max(1, nativeHost.zone.level + sw.levelBonus);
    const native = sw.source === 'native'
      ? nativeHost.effectiveSpawn(nativeHost.zone, nativeHost.baseTable(nativeHost.zone)).table : [];
    for (let i = 0; i < n; i++) {
      let table = native;
      let fac: string | undefined;
      if (!table.length || (sw.mixChance > 0 && nativeHost.encRng.chance(sw.mixChance))) {
        const facId = e.def.factions.length ? nativeHost.encRng.pick(e.def.factions) : undefined;
        const roster = facId ? FACTIONS[facId] : undefined;
        if (roster?.table.length) { table = roster.table; fac = facId; }
      }
      if (!table.length) continue;
      const type = nativeHost.weightedPick(table, lvl);
      const m = nativeHost.createMonster(type, lvl, 'enemy');
      m.faction = fac ?? MONSTERS[type]?.faction;
      m.tag = 'borough_raider';
      m.eventKey = `borough:${nativeHost.zone.id}`;
      const at = nativeHost.swarmEntryPoint(e.pos, sw.entryRadius);
      m.pos = nativeHost.clampPos(vec(at.x + rand(-30, 30), at.y + rand(-30, 30)), m.radius);
      bo.entries.set(m.id, vec(m.pos.x, m.pos.y));
      // THE FIXATION GRAFT: the FOLK are the enemy — until the player
      // out-books them on the chart (damage × threatGen), then decay melts
      // the grudge and the body returns to the sack.
      const quarry = folk[nativeHost.encRng.int(0, folk.length - 1)];
      bo.quarry.set(m.id, quarry.id);
      const ag = m.defId ? MONSTERS[m.defId]?.aggro : undefined;
      m.aiTuning = {
        target: {
          prefer: 'highestThreat', relentless: true, stickiness: sw.stickiness,
          threat: { damage: ag?.fury ?? 1, decay: sw.decay * (ag?.waver ?? 1) },
        },
      };
      m.addThreat(quarry.id, sw.seedThreat * (ag?.fixation ?? 1));
      m.aiTargetId = quarry.id;
      m.aggroed = true;
      e.spawned.add(m.id);
      { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
    }
  }

export function sceneHeroWithin(nativeHost:NativeSceneFrameHost, p: Vec2, r: number): boolean {
    // SOVEREIGNTY: census — a count (the derived census, probe_tiers RIG T).
    for (const s of nativeHost.frameSeats()) {
      if (!s.actor.dead && dist(s.actor.pos, p) <= r) return true;
    }
    return false;
  }

export function sceneSealVeiled(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): void {
    const v = e.def.veil!;
    const run = e.veil!;
    bumpLedger(nativeHost.ledger, e.def.ledger.onClose);
    const uncovered = clamp(run.peakRadius / e.scale.maxRadius, 0, 1);
    const mul = e.scale.rewardMul * (1 + uncovered * v.rewardUncoverBonus);
    nativeHost.grantXp(Math.round((ENCOUNTER_CFG.reward.xpBase + nativeHost.zone.level * ENCOUNTER_CFG.reward.xpPerLevel) * mul), e.pos); // XP BY PLACE
    const gems = 1 + Math.floor(mul);
    for (let i = 0; i < gems; i++) nativeHost.dropGemAt(e.pos);
    const lord = e.lordId ? courtLord(e.lordId) : undefined;
    if (e.def.court?.door && lord && run.deepened) {
      e.phase = 'door';
      e.doorAt = nativeHost.clearTransitSpot(vec(e.pos.x, e.pos.y), 60);
      nativeHost.text(vec(e.pos.x, e.pos.y - 30), lord.deeds.stands, lord.color, 18);
      nativeHost.flashes.push({ pos: vec(e.pos.x, e.pos.y), radius: 130, color: lord.color, life: 0.8, maxLife: 0.8 });
    } else {
      e.phase = 'closing';
      nativeHost.text(vec(e.pos.x, e.pos.y - 30), `${e.def.label} sealed!`, e.def.trigger.color, 18);
      nativeHost.flashes.push({ pos: vec(e.pos.x, e.pos.y), radius: Math.max(90, run.collapseFrom * 0.5), color: e.def.trigger.color, life: 0.5, maxLife: 0.5 });
    }
  }

export function sceneActivateKnot(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, k: VeilKnot): void {
    const v = e.def.veil!;
    const lord = e.lordId ? courtLord(e.lordId) : undefined;
    const share = e.def.court?.rosterShare ?? 0;
    for (let i = 0; i < k.n; i++) {
      const facId = nativeHost.encRng.pick(e.def.factions);
      const fromLord = !!lord?.roster.length && nativeHost.encRng.chance(share);
      let type: string;
      if (fromLord) {
        type = nativeHost.weightedPick(lord!.roster, nativeHost.zone.level);
      } else {
        const roster = FACTIONS[facId];
        if (!roster?.table.length) continue;
        type = nativeHost.weightedPick(roster.table, nativeHost.zone.level);
      }
      const m = nativeHost.createMonster(type, nativeHost.zone.level, 'enemy');
      m.faction = facId;
      const ang = nativeHost.encRng.range(0, Math.PI * 2);
      const rr = nativeHost.encRng.range(0, 26); // a tight knot, not a scatter
      m.pos = nativeHost.clampPos(vec(k.pos.x + Math.cos(ang) * rr, k.pos.y + Math.sin(ang) * rr), m.radius);
      e.spawned.add(m.id);
      { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
    }
    nativeHost.flashes.push({ pos: vec(k.pos.x, k.pos.y), radius: 46, color: lord?.color ?? e.def.trigger.color, life: 0.45, maxLife: 0.45 });
    if (v.shard && nativeHost.encRng.chance(v.shard.chance)) {
      const spot = nativeHost.findFreeSpot(vec(k.pos.x, k.pos.y), 12);
      if (spot) {
        const d = { pos: spot, radius: nativeHost.encRng.range(7, 11), kind: v.shard.kind };
        nativeHost.doodads.push(d);
        e.veil!.shards.push(d);
        nativeHost.markDoodadsChanged();
      }
    }
  }

export function sceneOpenChasm(nativeHost:NativeSceneFrameHost): void {
    const ff = nativeHost.sim.fractureField;
    const run = nativeHost.fractureRun;
    if (!ff || !run) return;
    const surge = ff.surge();
    run.phase = 'chasm';
    run.chasm = vec(run.head.x, run.head.y);
    run.chasmSpawn = 0; // first pulse immediately
    // FOLD IN the fissure's trickle foes: they crawled from the same fissure, so
    // they count toward this chasm's wave. (Else they'd block the seal — which
    // gates on fractureFoeCount()===0 — while sitting outside chasmSpawned, and
    // the chasm would over-spawn a full batch ON TOP of them.)
    run.chasmSpawned = new Set();
    for (const a of nativeHost.actors) if (!a.dead && a.tag === 'fracture_foe') run.chasmSpawned.add(a.id);
    run.chasmClear = Math.round(surge.chasm.clearKills + nativeHost.zone.level * surge.chasm.clearPerLevel);
    const dood: Doodad = { pos: vec(run.chasm.x, run.chasm.y), radius: 34, kind: 'chasm' };
    nativeHost.doodads.push(dood);
    run.chasmDoodad = dood;
    nativeHost.flashes.push({ pos: vec(run.chasm.x, run.chasm.y), radius: surge.chasm.radius, color: run.color, life: 0.6, maxLife: 0.6 });
    nativeHost.text(vec(run.chasm.x, run.chasm.y - 30), 'Chasm', run.color, 17);
  }

export function sceneClearFractureRun(nativeHost:NativeSceneFrameHost, despawnFoes: boolean): void {
    nativeHost.removeFractureChasmDoodad();
    if (despawnFoes) {
      for (let i = nativeHost.actors.length - 1; i >= 0; i--) {
        if (!nativeHost.actors[i].dead && nativeHost.actors[i].tag === 'fracture_foe') { const nativeRemovedBodies = nativeHost.actors.splice(i, 1); for (const nativeRemovedBody of nativeRemovedBodies) nativeHost.retireCombatBody(nativeRemovedBody); }
      }
    }
    nativeHost.fractureRun = null;
  }

export function sceneRemoveFractureChasmDoodad(nativeHost:NativeSceneFrameHost): void {
    const run = nativeHost.fractureRun;
    if (!run?.chasmDoodad) return;
    const i = nativeHost.doodads.indexOf(run.chasmDoodad);
    if (i >= 0) nativeHost.doodads.splice(i, 1);
    run.chasmDoodad = null;
  }

export interface NativeFractureCompletionScope {readonly host:NativeSceneFrameHost;readonly field:FractureField;readonly run:NonNullable<NativeSceneFrameHost['fractureRun']>;readonly birth:NativeFractureBirthReceipt|undefined;readonly lifetime:NativeFractureLifetime|undefined}
const nativeFractureCompletions=new WeakMap<object,NativeFractureCompletionScope>();
export const nativeFractureCompletionCalls=Object.freeze({read(host:object):NativeFractureCompletionScope|undefined{return nativeFractureCompletions.get(host);}});
function beginNativeFractureClear(host:NativeSceneFrameHost,field:FractureField,run:NonNullable<NativeSceneFrameHost['fractureRun']>):()=>void {
 const prior=nativeFractureCompletions.get(host),scope=Object.freeze({host,field,run,birth:nativeFractureBirthCalls.read(run),lifetime:Reflect.apply(nativeFractureLifetimeCalls.read,field,[])});nativeFractureCompletions.set(host,scope);
 return()=>{if(nativeFractureCompletions.get(host)===scope){if(prior)nativeFractureCompletions.set(host,prior);else nativeFractureCompletions.delete(host);}};
}
export function sceneDivertOrEndFracture(nativeHost:NativeSceneFrameHost, at: Vec2): void {
    const ff = nativeHost.sim.fractureField;
    const run = nativeHost.fractureRun;
    if (!ff || !run) return;
    const surge = ff.surge();
    if (ff.canDivert()) {
      // The nearest VALID adjacent zone (never the safe town / a cave / event-owned
      // ground) — generating a frontier if that's the closest avenue.
      const dest = nativeHost.pickRovingDest(at);
      if (dest) {
        // The marker first TRAVELS to the next zone (purely visual) before surfacing —
        // from this zone's node toward the destination's node.
        ff.divert(dest, nativeHost.zone.map, nativeHost.zoneMap[dest].map);
        nativeHost.grantXp(Math.round((surge.chasmRewardXp + nativeHost.zone.level * surge.chasmXpPerLevel) * surge.divertRewardMul), at); // XP BY PLACE
        nativeHost.dropGemAt(at);
        nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 130, color: run.color, life: 0.7, maxLife: 0.7 });
        nativeHost.text(vec(at.x, at.y - 30),
          `The fracture tears toward ${nativeHost.zoneMap[dest]?.name ?? dest}! (M)`, run.color, 16);
        run.phase = 'done';
        const nativeFractureClearEnd=beginNativeFractureClear(nativeHost,ff,run);
        try{
        nativeHost.clearFractureRun(false);
        }finally{nativeFractureClearEnd();}
        return;
      }
    }
    // No hops left (or nowhere to divert): the fracture is run through — big payout.
    bumpLedger(nativeHost.ledger, 'fractures_sealed');
    nativeHost.grantXp(Math.round(surge.sealReward.xpBase + nativeHost.zone.level * surge.sealReward.xpPerLevel), at); // XP BY PLACE
    for (let i = 0; i < surge.sealReward.gems; i++) nativeHost.dropGemAt(at);
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 150, color: run.color, life: 0.7, maxLife: 0.7 });
    nativeHost.text(vec(at.x, at.y - 36), 'The fracture collapses — sealed!', '#ffd700', 18);
    // STACKED RNG (the capstone): only a FULL max-span run (span ≥ minSpan) gets a
    // chance to tear open its variant's reward RIFT — an off-graph boss chamber.
    // Rolled on the SEEDED fracture rng (determinism), BEFORE the run is cleared.
    const cap = surge.capstone;
    const variant = surge.variants.find(v => v.variant === run.variant);
    if (run.span >= cap.minSpan && variant?.capstone
      && nativeHost.fractureRng.chance(clamp(cap.portalChance, 0, 1))) {
      nativeHost.openFractureRift(run, variant.capstone);
    }
    ff.endFracture();
    run.phase = 'done';
    const nativeFractureClearEnd=beginNativeFractureClear(nativeHost,ff,run);
    try{
    nativeHost.clearFractureRun(false);
    }finally{nativeFractureClearEnd();}
  }

export function sceneLitePocketBirth(nativeHost:NativeSceneFrameHost, pk: number, p: LitePocket): void {
    const h = liteSeatHash(p.births++ + pk * 8191, LITE_CFG.salt);
    const ang = ((h & 0xffff) / 0xffff) * Math.PI * 2;
    const d = 4 + ((h >>> 16) / 0xffff) * p.scatter;
    const bx = p.x + Math.cos(ang) * d, by = p.y + Math.sin(ang) * d;
    const open = nativeHost.liteOpenAt(bx, by);
    if (nativeHost.lite.spawn(p.kindIdx, open ? bx : p.x, open ? by : p.y, 0, 0,
      nativeHost.liteKinds[p.kindIdx].plies0, pk) >= 0) {
      p.poured = true;
      p.live++;
    }
  }

export function sceneLitePocketExtinct(nativeHost:NativeSceneFrameHost, pk: number, p: LitePocket): void {
    p.extinct = true;
    const burrow = nativeHost.liteBurrows[pk];
    if (burrow && !burrow.gone && !burrow.evap) {
      burrow.evap = { t: 0.4, rate: 22 };
      nativeHost.evaporating.push(burrow);
      nativeHost.markDoodadsChanged();
    }
    nativeHost.liteBurrows[pk] = undefined;
  }

export function sceneLitePocketRecede(nativeHost:NativeSceneFrameHost, pk: number, p: LitePocket): void {
    let n = Math.max(1, Math.round(p.rate * LITE_CFG.regen.every + 0.5));
    const pool = nativeHost.lite;
    for (let i = 0; i < pool.used && n > 0; i++) {
      if (!pool.alive[i] || pool.pocket[i] !== pk) continue;
      if (pool.owner[i]) continue;
      pool.free(i);
      p.live--;
      n--;
    }
    if (p.live <= 0) p.poured = false;
  }

export function sceneLiteBiteVictim(nativeHost:NativeSceneFrameHost, v: Actor, t: number): void {
    const pool = nativeHost.lite;
    const kinds = nativeHost.liteKinds;
    if (nativeHost.liteCounts.length < kinds.length) nativeHost.liteCounts = new Int32Array(kinds.length * 2);
    const counts = nativeHost.liteCounts;
    counts.fill(0, 0, kinds.length);
    const vTeam = v.team === 'player' ? 1 : 0;
    // THE TRAMPLE LANE (LiteSpec.trample): this actor's crossing SPEED (the
    // behavior fabric's honest displacement estimate — walk, dash, launch
    // alike) and trample MASS (effectiveWeight + the `trample` stat), read
    // once; per-kind gates decide inside. Zero cost when no zone kind
    // tramples: speed 0 never meets a real gate.
    let trSpeed = 0, trMass = 0, tramples = 0, trX = 0, trY = 0;
    if (nativeHost.liteHasTrample) {
      trSpeed = Math.hypot(v.velEst.x, v.velEst.y);
      if (trSpeed >= nativeHost.liteMinTrampleSpeed) {
        trMass = v.effectiveWeight() + v.sheet.get('trample');
      } else trSpeed = 0;
    }
    let pressed = false, creditOwner = 0, latchIdx = -1, latchD = Infinity;
    pool.forEachIn(v.pos.x, v.pos.y, v.radius + nativeHost.liteMaxR + LITE_CFG.contact.pad, 0, i => {
      if (pool.team[i] === vTeam) return;
      if (pool.story[i] !== v.tier) return; // the pool's own story (the sovereignty gate)
      const k = kinds[pool.kind[i]];
      if (!k) return;
      const dx = pool.x[i] - v.pos.x, dy = pool.y[i] - v.pos.y;
      const dd = dx * dx + dy * dy;
      // TRAMPLED: stepped ON (touching rims, no pad) by a qualified mover —
      // the crossing itself is the kill, plies notwithstanding (a boot
      // crushes the beetle whole). Fliers never resolve a finite gate.
      if (trSpeed >= k.trampleMinSpeed && trMass >= k.trampleMinWeight) {
        const crush = v.radius + k.radius;
        if (dd <= crush * crush) {
          tramples++;
          trX += pool.x[i]; trY += pool.y[i];
          if (tramples <= LITE_CFG.fx.flashes) {
            nativeHost.flashes.push({
              pos: vec(pool.x[i], pool.y[i]), radius: k.radius + 5,
              color: k.color, life: 0.2, maxLife: 0.2,
            });
          }
          nativeHost.liteNoteDeath(k, pool.team[i], v);
          nativeHost.litePocketDisturb(pool.pocket[i]);
          pool.free(i);
          return;
        }
      }
      const rr = v.radius + k.radius + LITE_CFG.contact.pad;
      if (dd > rr * rr) return;
      counts[pool.kind[i]]++;
      pressed = true;
      if (!creditOwner && pool.owner[i]) creditOwner = pool.owner[i];
      if (k.clings && dd < latchD) { latchD = dd; latchIdx = i; }
    });
    if (tramples >= LITE_CFG.fx.countTextAt) {
      nativeHost.text(vec(trX / tramples, trY / tramples - 10), `×${tramples}`, '#d8c8a0', 13);
    }
    if (!pressed) return;
    // THE LATCH BOUNDARY: a clinging kind at the rim stands up as a real
    // body (budgeted per sweep; free seats only — the coat law holds).
    if (latchIdx >= 0 && nativeHost.litePromoteBudget > 0 && !v.untargetable && !v.passive) {
      let riders = 0;
      for (const r of nativeHost.actors) if (!r.dead && r.clingTo?.id === v.id) riders++;
      if (riders < clingSeatsOf(v)) {
        nativeHost.litePromoteBudget--;
        const body = nativeHost.promoteLite(latchIdx);
        if (body) body.aiTargetId = v.id;
      }
    }
    let due = nativeHost.liteBeatAt.get(v.id);
    let beat = Infinity;
    let total = 0;
    for (let ki = 0; ki < kinds.length; ki++) {
      if (!counts[ki] || kinds[ki].contactDamage <= 0) continue;
      beat = Math.min(beat, kinds[ki].contactBeat);
      total++;
    }
    if (!total) return;
    if (due === undefined) {
      // First press arms a staggered clock — no instant bite on a brush,
      // and a crowd of victims never spikes one frame.
      const frac = ((v.id * 2654435761) >>> 16 & 0xff) / 255;
      nativeHost.liteBeatAt.set(v.id, t + beat * (LITE_CFG.contact.stagger + frac * (1 - LITE_CFG.contact.stagger)));
      return;
    }
    if (t < due) return;
    nativeHost.liteBeatAt.set(v.id, t + beat);
    const amounts: Partial<Record<DamageType, number>> = {};
    for (let ki = 0; ki < kinds.length; ki++) {
      if (!counts[ki]) continue;
      const k = kinds[ki];
      if (k.contactDamage <= 0) continue;
      amounts[k.contactType] = (amounts[k.contactType] ?? 0)
        + k.contactDamage * Math.min(counts[ki], k.countCap);
    }
    const credit = creditOwner ? nativeHost.actorById(creditOwner) : undefined;
    nativeHost.litePooledHit(v, amounts, credit);
  }

export function scenePayExtraction(nativeHost:NativeSceneFrameHost, e: ActiveEncounter, frac: number, full: boolean): void {
    const y = e.def.extract!.yield;
    if (frac < y.minFrac) return;
    const lvl = Math.max(1, nativeHost.zone.level);
    // THE POT (her ruling 2026-09-11): level + the seconds the stand held,
    // × the rolled clock's pot, × the temper's price; a broken stand keeps
    // its held fraction's power. Must beat a single harvest node.
    const stood = e.ex?.stood ?? 0;
    const temper = nativeHost.extractTemperOf(e);
    const pot = Math.round((y.potBase + lvl * y.potPerLevel + y.potPerSec * stood) * e.scale.rewardMul * temper.yieldMul
      * (full ? 1 : Math.pow(frac, y.partialPower)));
    if (pot <= 0) return;
    const packets = Math.min(y.packets, pot);
    const per = Math.floor(pot / packets);
    let rem = pot - per * packets;
    for (let i = 0; i < packets; i++) {
      const count = per + (rem-- > 0 ? 1 : 0);
      // The grade climb — the essences.ts tierRungs idiom, sweetened on a
      // full stand; stops at the first level-fail or chance-miss.
      let tier = Math.max(0, ESSENCE_IDS.indexOf(y.essence as EssenceId));
      for (const rung of y.rungs) {
        if (tier >= ESSENCE_IDS.length - 1) break;
        if (lvl < rung.atLevel) break;
        if (!nativeHost.encRng.chance(Math.min(1, rung.chance + (full ? y.fullDefenseRungBonus : 0)))) break;
        tier++;
      }
      nativeHost.dropEssenceAt(vec(e.pos.x + rand(-34, 34), e.pos.y + rand(-30, 30)),
        { essence: ESSENCE_IDS[tier], count });
    }
    const xp = Math.round((y.xpBase + lvl * y.xpPerLevel) * e.scale.rewardMul * temper.yieldMul * frac);
    if (xp > 0) nativeHost.grantXp(xp, e.pos); // XP BY PLACE
  }

export function sceneDisperseSwarmBodies(nativeHost:NativeSceneFrameHost, 
    spawned: Set<number>, entries: Map<number, Vec2>, anchor: Vec2,
    leashRadius: number, disperse: ExtractDisperseSpec,
  ): void {
    for (const id of spawned) {
      const a = nativeHost.actorById(id);
      if (!a || a.dead) continue;
      const goal = entries.get(id) ?? nativeHost.nearestExitPos(a.pos) ?? vec(a.pos.x, a.pos.y);
      const temper = temperOf(a.defId ? MONSTERS[a.defId] : undefined, factionTemper(a.faction));
      if (temper === 'territorial') {
        // The expedition: drop the fixation, hold the ground on a leash, then go.
        a.aiTuning = { target: { leash: { radius: leashRadius } } };
        a.aiAnchor = vec(anchor.x, anchor.y);
        nativeHost.extractionDepartures.push({
          id, goal, arrive: disperse.arriveDist, mode: 'resolute',
          leaveAt: nativeHost.time + nativeHost.encRng.range(disperse.lingerSec[0], disperse.lingerSec[1]),
        });
      } else {
        nativeHost.extractionDepartures.push({
          id, goal, arrive: disperse.arriveDist,
          mode: temper === 'skittish' ? 'resolute' : 'wary', leaveAt: nativeHost.time,
        });
      }
    }
  }

export function sceneExtractionEntryPoint(nativeHost:NativeSceneFrameHost, e: ActiveEncounter): Vec2 {
    return nativeHost.swarmEntryPoint(e.pos, e.def.extract!.swarm.entryRadius);
  }

export function sceneNearestExitPos(nativeHost:NativeSceneFrameHost, from: Vec2): Vec2 | null {
    let best: Vec2 | null = null, bd = Infinity;
    for (const e of nativeHost.exits) {
      const d = dist(from, e.pos);
      if (d < bd) { bd = d; best = e.pos; }
    }
    return best ? vec(best.x, best.y) : null;
  }

export function sceneSwarmEntryPoint(nativeHost:NativeSceneFrameHost, at: Vec2, band: [number, number]): Vec2 {
    let last = vec(at.x, at.y);
    for (let tries = 0; tries < 5; tries++) {
      const ang = nativeHost.encRng.range(0, Math.PI * 2);
      const r = nativeHost.encRng.range(band[0], band[1]);
      last = nativeHost.clampPos(vec(at.x + Math.cos(ang) * r, at.y + Math.sin(ang) * r), 14);
      if (!nativeHost.isPresentLocalPlayer() || dist(last, nativeHost.player.pos) >= 170) break;
    }
    return last;
  }

export function scenePickRovingDest(nativeHost:NativeSceneFrameHost, from: Vec2): string | null {
    const ok = (id: string): boolean => {
      const z = nativeHost.zoneMap[id];
      // (!pocket: a roving event never barges into purchased ground either.)
      return !!z && z.caveDepth == null && !z.floating && !z.eventOwned && !z.pocket
        && z.objective.kind !== 'safe';
    };
    const cands = nativeHost.exits.filter(e => e.to !== nativeHost.zone.id)
      .sort((a, b) => dist(from, a.pos) - dist(from, b.pos));
    for (const e of cands) {
      if (e.to === '?') {
        const def = nativeHost.zone.exits[e.defIndex];
        const gen = nativeHost.chartFrontier(nativeHost.zone, def);
        def.to = gen.id;
        return gen.id; // a fresh frontier is always a non-safe, valid host
      }
      if (ok(e.to)) return e.to;
    }
    return null;
  }

export function sceneOpenFractureRift(nativeHost:NativeSceneFrameHost, run: FractureRun, cap: FractureCapstone): void {
    const ff = nativeHost.sim.fractureField;
    if (!ff || ff.peekRift()) return; // one pending rift at a time
    const p = nativeHost.clearTransitSpot(nativeHost.clampPos(nativeHost.farPoint(460), 30));
    // PERSIST the rift on the overlay so it SURVIVES leaving the zone (the engine
    // re-materializes its portal on every re-entry until the boss is slain — the
    // capstone is too rare to lose to an accidental exit). Then place it here, now.
    ff.openRift({
      zoneId: nativeHost.zone.id, id: run.id, pos: { x: p.x, y: p.y },
      faction: run.faction, color: run.color, variant: run.variant,
      level: nativeHost.zone.level, cap,
    });
    nativeHost.placeFractureRiftContent(nativeHost.zone);
    bumpLedger(nativeHost.ledger, 'fracture_rifts_opened');
    nativeHost.flashes.push({ pos: vec(p.x, p.y), radius: 150, color: run.color, life: 1.1, maxLife: 1.1 });
    nativeHost.text(vec(p.x, p.y - 46), `${run.variant} Rift`, run.color, 18);
  }

export function sceneLitePooledHit(nativeHost:NativeSceneFrameHost, 
    v: Actor, amounts: Partial<Record<DamageType, number>>, credit: Actor | undefined,
  ): void {
    if (v.dead || v.invulnerable) return;
    let domType: DamageType = 'physical', domAmt = 0;
    for (const ty of Object.keys(amounts) as DamageType[]) {
      if ((amounts[ty] ?? 0) > domAmt) { domAmt = amounts[ty]!; domType = ty; }
    }
    const taken = mitigateTyped(v, amounts, { armorDamageFloor: credit ? THRONG_EVOLUTION.armorFloor : 0 });
    if (v.plies > 0) {
      if (taken >= plyFloorOf(v)) {
        v.plies--;
        v.assaultPlyBreak?.(credit); // Unowned pooled contact is an enemy bite.
        if (v.plies === 0 && v.plySpec?.spentStatus) {
          nativeHost.withCombatStatusSource(v, undefined, undefined, () => v.applyStatus(v.plySpec!.spentStatus!, 0, 1, 'plies'));
        }
      }
      v.hitFlash = 0.12;
      v.hitFlashType = domType;
      return;
    }
    landLifeDamage(v, taken);
    if (credit) nativeHost.assaults.pooledHit(credit, v, taken, amounts);
    v.hitFlash = 0.15;
    v.hitFlashType = domType;
    if (taken > 0.5) nativeHost.text(v.pos, Math.round(taken).toString(), DAMAGE_COLOR[domType], 11);
    if (v.life <= 0 && !v.dead) {
      // Pooled companions carry their keeper as kill credit, not an Actor body.
      nativeHost.kill(v, false, credit);
      if (v.dead && credit === nativeHost.player && nativeHost.deedEnemy(v)) nativeHost.recordDeed({ kind: 'kill', flags: ['companion'] });
    }
  }

