import {observeNativeCombatBirth,observeNativeHiddenSource,observeNativeSource,observeNativeCombatStorage,observeNativeCombatRecord} from './nativeCombatRecordObservation';
/** Exact original42 campaign/interleaved frame FrameAreaEvents closure.
 * Runtime ownership and native scheduling are separate concrete bindings. */
import type {World} from "./world";
import type {NativeSceneCampaignFrameClosureHost} from "./nativeSceneCampaignFrameClosureHost";
import { localOffset } from '../worldmass/address';
import { angleTo, chance, clamp, dist, pick, rand, randInt, vec, type Vec2 } from '../core/math';
import { mod, type Modifier } from './stats';
import { Actor } from './actor';
import { isDormant, NEUTRAL_RESET } from './ai';
import { makeSkillInstance } from './skills';
import { BOMBARD_CFG, type BombardSpec } from './bombard';
import { resolveLootTable } from './loot';
import { SKILLS } from '../data/skills';
import { FACTIONS, FIXTURE_IDS, MONSTERS } from '../data/monsters';
import { skyOf } from '../data/zones';
import { type Doodad } from './levelgen';
import { placeZoneAt, projectCoord } from './worldgen';
import { WorldSim } from '../world/sim';
import { riderRefusal } from './possess';
import type { WispKindRow, WisplightSurge } from '../packages/overlays/wisplight';
import type { DroveSurge } from '../packages/overlays/drove';
import { coordDist } from '../world/coords';
import { bumpLedger } from '../packages/ledger';
import type { InvasionInfo } from '../packages/overlays/demonInvasion';
import type { DeadwakeInfo, DeadwakeSurge } from '../packages/overlays/deadwake';
import type { MigrationInfo, MigrationSurge } from '../packages/overlays/migration';
import type { SwarmInfo, SwarmingSurge } from '../packages/overlays/swarming';
import type { BrigandInfo, BrigandSurge } from '../packages/overlays/brigands';
import type { WorldBossField, WorldBossMint } from '../packages/overlays/worldboss';
import { WEATHER_DEFS, type WeatherStrike } from '../world/weather';
import { dayCycle, inPhases } from '../world/daynight';
import { hashStr } from './nativeSceneConfig';
export interface ZoneExit {
  pos: Vec2;
  radius: number;
  to: string;
  label: string;
  /** Index into the zone def's exits array (frontier resolution). */
  defIndex: number;
  /** BOUNDARY-GATE treatment id (data/boundaryGates.ts) when this exit
   *  crosses an enclave biome's boundary — restyles the portal (accent,
   *  glyph, dwell ring) and streams to co-op clients like the label. */
  boundary?: string;
  /** BIOME-MELD id (data/melds.ts) when this exit faces a DIFFERENT biome
   *  that declares an edge dressing — the layout pipeline grows the foreign
   *  kit along this edge, and the label wears the meld's breath. Host-side
   *  only (terrain ships as doodads; the label streams verbatim). */
  meld?: string;
}
export const HAUNT_TAGS = new Set([
  'haunt_spawn',   // the streamed apparitions
  'haunt_anchor',  // the standing grief-anchor
  'wailing_one',   // the manifested boss
]);
export const CORPSE_CFG = {
  /** Seconds a fresh corpse stays raisable/detonable. */
  duration: 6,
  /** World cap — the oldest remnant fades first. */
  max: 40,
  /** Producer mints (Exhume's spawnCorpse effect): scatter around the mark,
   *  and the stand-in body's life when no real death backs the corpse. */
  mint: { spread: 42, life: 30, lifePerLevel: 8 },
  /** Multi-corpse feasts (TargetingSpec.plural × the corpseBatch stat). */
  batch: { aoePerExtra: 0.12, durationPerExtra: 0.15, projectilesPerExtra: 1 },
};
export interface WispSceneWisp {
  slot: number; a: Actor; kind: string;
  state: 'standing' | 'kindled' | 'seeking';
  route: Vec2[]; routeAt: number;
  wanderLeft: number; seekLeft: number;
  target: Actor | null;
  bloomAcc: number; bloomsLeft: number; pulseAcc: number;
  /** No-progress insurance on the current waypoint (route.stallSec). */
  stallAcc: number; stallD: number;
}
export interface WispScene {
  id: string;
  wisps: WispSceneWisp[];
  hosts: { slot: number; a: Actor }[];
  sweepAcc: number;
}
export function sceneMaybeOpenCrusadePortal(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (nativeHost.inCave || nativeHost.crusadePortals.length || nativeHost.crusadeRealmContext) return;
    const info = nativeHost.sim.crusadeField?.crusadeOn(nativeHost.zone.id);
    if (!info || !info.isStronghold || !info.sanctumReady) return;
    const at = nativeHost.clearTransitSpot(nativeHost.clampPos(nativeHost.farPoint(440), 30));
    nativeHost.crusadePortals.push({ pos: vec(at.x, at.y), crusadeId: info.crusadeId });
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 120, color: info.color, life: 0.9, maxLife: 0.9 });
    nativeHost.text(vec(at.x, at.y - 44), 'The crusade sanctum gate grinds open!', info.color, 18);
  }

export function sceneMaybeOpenDemonPortal(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (nativeHost.inCave || nativeHost.demonPortals.length || nativeHost.realmContext) return;
    const dfz = nativeHost.sim.demonFieldFor(nativeHost.zone.dimension);
    const info = dfz?.invasionOn(nativeHost.zone.id);
    if (!info || !info.isEpicenter) return;
    // WHEN the rift stands is surge data: 'epicenter' = every epicenter always
    // offers its realm (the premium still scales with the stage you dive at);
    // 'stage'/unset = the classic fester-gate (age/opensPortal).
    if (!(info.portalReady || dfz?.surge()?.portal.openAt === 'epicenter')) return;
    const at = nativeHost.clearTransitSpot(nativeHost.clampPos(nativeHost.farPoint(420), 30));
    nativeHost.demonPortals.push({ pos: vec(at.x, at.y), invId: info.id });
    const realmName = info.type.realm?.name;
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 120, color: info.color ?? '#c81e3a', life: 0.9, maxLife: 0.9 });
    nativeHost.text(vec(at.x, at.y - 44),
      realmName ? `A rift to ${realmName} tears open!` : 'A rift to the demon realm tears open!',
      info.color ?? '#c81e3a', 18);
  }

export function scenePruneEngageTokens(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    for (const [key, held] of nativeHost.engageTokens) {
      const live = held.filter(id => {
        const a = nativeHost.actorById(id);
        return a && !a.dead && a.aiTokenKey === key && nativeHost.time - a.aiTokenAt < 0.5;
      });
      if (live.length === held.length) continue;
      if (live.length) nativeHost.engageTokens.set(key, live);
      else nativeHost.engageTokens.delete(key);
    }
    // Ring claims share the contract: dead, stale, or retargeted claimants
    // release their bearing, and the arc heals for the next arrival.
    for (const [tid, claims] of nativeHost.ringClaims) {
      const live = claims.filter(c => {
        const a = nativeHost.actorById(c.actorId);
        return a && !a.dead && a.aiRingTarget === tid && nativeHost.time - a.aiRingAt < 0.5;
      });
      if (live.length === claims.length) continue;
      if (live.length) nativeHost.ringClaims.set(tid, live);
      else nativeHost.ringClaims.delete(tid);
    }
  }

export function sceneUpdateBombardment(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (nativeHost.zone.objective.kind === 'safe') return;
    // THE GUN CENSUS: almost every zone fields zero guns — skip the whole
    // sweep O(1) unless a bombard-wearing def stands in the list. The flag
    // is derived, never hand-fed: identity/length re-key on any list
    // change, the mint rev on any fresh gun (createMonster), and a stale
    // TRUE just runs the loop below, which decides everything itself.
    const bombardCensus = nativeHost.bombardKey;
    if (bombardCensus.actors?.deref() !== nativeHost.actors || bombardCensus.len !== nativeHost.actors.length
      || bombardCensus.mintRev !== nativeHost.bombardMintRev) {
      bombardCensus.actors = new WeakRef(nativeHost.actors); bombardCensus.len = nativeHost.actors.length; bombardCensus.mintRev = nativeHost.bombardMintRev;
      nativeHost.bombardPresent = nativeHost.actors.some(a =>
        a.defId !== undefined && MONSTERS[a.defId]?.bombard !== undefined);
    }
    if (!nativeHost.bombardPresent) return;
    for (const a of nativeHost.actors) {
      if (a.dead) continue;
      const spec = a.defId ? MONSTERS[a.defId]?.bombard : undefined;
      if (!spec) continue;
      if (isDormant(a)) continue; // un-roused emplacements keep their powder
      if (a.bombardAt === undefined) {
        // Ranging in: the opening delay — a fresh arrival is never alpha-struck.
        const [o0, o1] = spec.opening ?? BOMBARD_CFG.opening;
        a.bombardAt = nativeHost.time + rand(o0, o1);
        continue;
      }
      if (nativeHost.time < a.bombardAt) continue;
      const inst = a.skills.find(s => s?.def.id === spec.skillId) ?? null;
      const target = inst ? nativeHost.bombardTarget(a, spec) : null;
      if (!inst || !target || !nativeHost.useSkill(a, inst, vec(target.pos.x, target.pos.y))) {
        // No gun, no war, or the pipeline said no (mid-cast / cooldown /
        // silenced / held) — a retry, never a crash.
        a.bombardAt = nativeHost.time + BOMBARD_CFG.retrySec;
        continue;
      }
      a.bombardAt = nativeHost.time + rand(spec.cadence[0], spec.cadence[1]);
    }
  }

export function sceneUpdateBrigandRaid(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const bf = nativeHost.sim.brigandField;
    if (!bf || nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') return;
    const cfg = bf.surge();
    // A band that has ARRIVED at this zone drops its pack ONCE, then retires (its map march clears).
    const info = bf.brigandOn(nativeHost.zone.id);
    if (info && !nativeHost.materializedBrigands.has(info.id)) {
      nativeHost.materializedBrigands.add(info.id);
      bumpLedger(nativeHost.ledger, 'brigands_seen'); // surfaces the Vault tuning
      nativeHost.spawnBrigandPack(info, cfg);
      bf.retire(info.id);
    }
    // Always wander/rouse any brigand actors standing in this zone (the band is retired by now).
    nativeHost.updateBrigands(cfg, dt);
  }

export function sceneUpdateClutch(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    nativeHost.clutchScan -= dt;
    if (nativeHost.clutchScan > 0) return;
    nativeHost.clutchScan = 0.25;
    for (const egg of [...nativeHost.actors]) {
      if (egg.dead || !egg.eggHatch || nativeHost.time < egg.eggHatch.at) continue;
      const fx = egg.eggHatch.fx;
      egg.eggHatch = undefined;
      nativeHost.birthAt(egg, null, fx, vec(egg.pos.x, egg.pos.y), { host: true });
      nativeHost.kill(egg, true);
    }
  }

export function sceneUpdateDeadwakeStream(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const df = nativeHost.sim.deadwakeField;
    if (!df) { nativeHost.deadwakeStreamTimer = 0; return; }
    // THE EBB drains first (the haunting's drainDissipated placement — even on
    // ground the stream skips, the queue never backs up): a tide that SPENT its
    // pour well recedes on its own — announce it if it was pouring over us.
    // THE SPLIT DISPATCH (shard M1-W3): the keeper drains once, and "us" is
    // every occupied zone within the tide's reach (its players hear it).
    if (nativeHost.isCampaignFrameOwner()) for (const at of df.drainEbbed()) {
      const to = nativeHost.occupiedAudience(z => {
        const def = nativeHost.zoneMap[z.id];
        return !!def && coordDist(def.map, at) <= df.surge().radius;
      });
      if (to !== null) nativeHost.noticeOccupied(to, df.surge().ebbText, df.surge().color ?? '#7a5aa6', 18, 'events');
    }
    if (nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') {
      nativeHost.deadwakeStreamTimer = 0; return;
    }
    const info = df.deadwakeOn(nativeHost.zone.id);
    if (!info) { nativeHost.deadwakeStreamTimer = 0; return; } // the tide rolled on — it ebbs
    // The host-LEADER lands once per wake-visit (the tide's commander). Its death
    // routs the wake. Bump the discovery ledger here — the player has been caught.
    if (!nativeHost.materializedDeadwakes.has(info.id)) {
      nativeHost.materializedDeadwakes.add(info.id);
      bumpLedger(nativeHost.ledger, 'deadwake_seen'); // surfaces the Vault tuning
      nativeHost.spawnDeadwakeLeader(info);
      if (nativeHost.isPresentLocalPlayer()) nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 150, color: info.color, life: 0.8, maxLife: 0.8 });
      nativeHost.notice(`An undead tide pours into ${nativeHost.zone.name} — the Deadwake breaks!`, info.color, 18, 'events');
    }
    // The relentless STREAM: refill toward the strength-scaled live cap on a cadence.
    const cfg = df.surge();
    if (nativeHost.deadwakeHeadcount() >= info.streamCap) { nativeHost.deadwakeStreamTimer = cfg.streamInterval; return; }
    nativeHost.deadwakeStreamTimer -= dt;
    if (nativeHost.deadwakeStreamTimer > 0) return;
    nativeHost.deadwakeStreamTimer = cfg.streamInterval;
    const batch = randInt(cfg.streamBatch[0], cfg.streamBatch[1]);
    for (let i = 0; i < batch && nativeHost.deadwakeHeadcount() < info.streamCap; i++) nativeHost.spawnDeadwakeStreamer(info, cfg);
  }

export function sceneUpdateDemonStorm(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const df = nativeHost.sim.demonFieldFor(nativeHost.zone.dimension);
    if (!df || nativeHost.zone.objective.kind === 'safe') { nativeHost.meteorTimer = 0; return; }
    const info = df.invasionOn(nativeHost.zone.id);
    if (!info || info.meteorRatePerSec <= 0.02) { nativeHost.meteorTimer = 0; return; }
    nativeHost.meteorTimer -= dt;
    if (nativeHost.meteorTimer <= 0) {
      nativeHost.meteorTimer = 1 / info.meteorRatePerSec;
      nativeHost.fireMeteor(info);
    }
  }

export function sceneUpdateDroveScene(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    // SOVEREIGNTY: seat — scene seating (the derived census, probe_tiers RIG T).
    const df = nativeHost.sim.droveField;
    if (!df) { nativeHost.droveScene = null; return; }
    if (nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') return;
    const info = df.droveOn(nativeHost.zone.id);
    if (!info) {
      // THE ORPHAN SWEEP (once per visit): a collapse that resolved while
      // nobody stood the ground leaves rails with no live call — hand them
      // to evap (pieces already drying are the gathered pen's own beat).
      if (nativeHost.droveDressChecked !== nativeHost.zone.id) {
        nativeHost.droveDressChecked = nativeHost.zone.id;
        nativeHost.evapDroveDress(3, 26);
      }
      nativeHost.droveScene = null;
      return;
    }
    const cfg = df.surge();
    const lvl = Math.max(1, nativeHost.zone.level);

    // THE MATERIALIZE BEAT (once per visit per collapse): the discovery line
    // + the Vault-surfacing ledger, the straying's exact pattern.
    if (!nativeHost.materializedDroves.has(info.id)) {
      nativeHost.materializedDroves.add(info.id);
      bumpLedger(nativeHost.ledger, 'drove_seen');
      if (nativeHost.isPresentLocalPlayer()) nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 130, color: info.color, life: 0.7, maxLife: 0.7 });
      nativeHost.notice(info.phase === 'scattered'
          ? `The fold of ${nativeHost.zone.name} is gone — scavengers range the shires.`
          : `A pen gave way in ${nativeHost.zone.name} — drive the fold back to it ALIVE.`, info.color, 18, 'events');
    }

    // A scattered fold needs no scene — the ground just wears the scavenger
    // hold (affectSpawns) until the land settles.
    if (info.phase === 'scattered' && (!nativeHost.droveScene || nativeHost.droveScene.phase === 'scattered')) {
      if (nativeHost.droveDressChecked !== nativeHost.zone.id) {
        nativeHost.droveDressChecked = nativeHost.zone.id;
        nativeHost.evapDroveDress(3, 26);
      }
      nativeHost.droveScene = null;
      return;
    }

    // STAGE (fresh entry, or a fresh collapse after a resolved one): seat the
    // pen ONCE (the overlay remembers the wreck forever after — re-entry
    // finds it exactly where it fell), lay the collapsed-pen dress if none
    // stands, post the reeve, scatter the loose heads. Idempotent under zone
    // memory: the reeve is adopted by defId, the dress by its eventDress tag;
    // heads are minted fresh per visit from the overlay's count (older
    // milling bodies blend back into the pasture — the critter contract
    // keeps them honest texture either way).
    if (!nativeHost.droveScene || nativeHost.droveScene.id !== info.id) {
      if (!info.staged) {
        const at = nativeHost.pastureAnchor();
        df.noteStaged(info.id, randInt(cfg.heads[0], cfg.heads[1]), at.x, at.y);
      }
      const live = df.droveOn(nativeHost.zone.id);
      if (!live || !live.penAt) { nativeHost.droveScene = null; return; }
      const penAt = vec(live.penAt.x, live.penAt.y);
      nativeHost.plantDrovePen(penAt, cfg);
      let reeve = nativeHost.actors.find(a => !a.dead && a.defId === FIXTURE_IDS.drove_reeve) ?? null;
      if (!reeve && MONSTERS[FIXTURE_IDS.drove_reeve]) {
        const gapDir = nativeHost.droveGapDir(penAt);
        const at = nativeHost.findFreeSpot(nativeHost.clampPos(vec(
          penAt.x + Math.cos(gapDir) * (cfg.penRingR + 30),
          penAt.y + Math.sin(gapDir) * (cfg.penRingR + 30)), 24), 12);
        const m = nativeHost.createMonster(FIXTURE_IDS.drove_reeve, lvl, 'enemy');
        m.pos = at;
        m.postSpec = { hold: true };
        m.aiPost = vec(at.x, at.y);
        // He watches the mouth his fold poured through.
        m.aiPostFacing = gapDir + Math.PI;
        nativeHost.actors.push(m);
        reeve = m;
      }
      const heads: { a: Actor; drivenFor: number }[] = [];
      for (let i = 0; i < live.loose; i++) {
        const id = nativeHost.weightedPick(cfg.headTable, lvl);
        if (!MONSTERS[id]) continue;
        const ang = rand(0, Math.PI * 2);
        const d = rand(cfg.scatter[0], cfg.scatter[1]);
        const at = nativeHost.findFreeSpot(nativeHost.clampPos(vec(
          penAt.x + Math.cos(ang) * d, penAt.y + Math.sin(ang) * d), 24), 12);
        const m = nativeHost.createMonster(id, lvl, 'enemy');
        m.pos = at;
        m.postSpec = { hold: false, slack: 240, pace: 0.75 }; // it mills, spooked, where it bolted to
        m.aiPost = vec(at.x, at.y);
        nativeHost.actors.push(m);
        heads.push({ a: m, drivenFor: 0 });
      }
      nativeHost.droveScene = { id: info.id, penAt, heads, reeve, phase: info.phase, sweepAcc: 0 };
    }
    const sc = nativeHost.droveScene!;

    // PHASE EDGES (the overlay flips, the engine performs):
    if (info.phase !== sc.phase) {
      if (info.phase === 'gathered') {
        nativeHost.droveGathered(df, info.id, info.color, lvl);
        return;
      } else if (info.phase === 'scattered') {
        bumpLedger(nativeHost.ledger, 'droves_scattered');
        nativeHost.notice('The last head is lost. The fold is gone — scavengers range the shires.', info.color, 18, 'events');
        nativeHost.evapDroveDress(2, 30);
        nativeHost.droveScene = null;
        return;
      }
      sc.phase = info.phase;
    }

    // THE DRIVE WHEEL (every frame — the herding IS the event): a loose head
    // under pressure flees the blended push of every presser. Deliberately
    // pathing-blind: moveActor's own wall-slide is how a fence FUNNELS a
    // fleeing body along the rail toward the gap — flushing along an edge is
    // real herding, and the sheep's own flock brain keeps a pressed knot
    // moving as one drivable body. Quiet for calmSec, a driven head
    // re-plants its milling post where it stands.
    for (const h of sc.heads) {
      const a = h.a;
      if (a.dead || a.heldBy) continue;
      let px = 0, py = 0, pressed = false;
      const press = (from: Vec2, radius: number): void => {
        const d = dist(from, a.pos);
        if (d > radius || d < 1e-3) return;
        const w = 1 - d / radius;
        px += ((a.pos.x - from.x) / d) * w;
        py += ((a.pos.y - from.y) / d) * w;
        pressed = true;
      };
      for (const seat of nativeHost.frameSeats()) {
        if (!seat.actor.dead) press(seat.actor.pos, cfg.driveRadius);
      }
      for (const f of nativeHost.actors) {
        if (f.dead || f.faction !== 'freehold' || isDormant(f)) continue;
        press(f.pos, cfg.assistDriveRadius);
      }
      if (pressed) {
        const n = Math.hypot(px, py);
        if (n > 1e-4) {
          if (h.drivenFor <= 0) { a.postSpec = undefined; a.aiPost = undefined; }
          h.drivenFor = cfg.calmSec;
          a.facing = Math.atan2(py, px);
          nativeHost.moveActor(a, px / n, py / n, dt * cfg.drivePace);
        }
      } else if (h.drivenFor > 0) {
        h.drivenFor -= dt;
        if (h.drivenFor <= 0 && !a.postSpec) {
          a.postSpec = { hold: false, slack: 240, pace: 0.75 };
          a.aiPost = vec(a.pos.x, a.pos.y);
        }
      }
    }

    // THE SWEEP (throttled): pen arrivals + losses.
    sc.sweepAcc += dt;
    if (sc.sweepAcc < 0.2) return;
    sc.sweepAcc = 0;

    for (let i = sc.heads.length - 1; i >= 0; i--) {
      const h = sc.heads[i];
      if (h.a.dead) {
        // The teeth found it first (a wolf, a fox, a careless swing) — lost.
        df.noteLost(info.id);
        nativeHost.text(vec(h.a.pos.x, h.a.pos.y - 24), 'a head is lost…', '#c8b890', 12);
        sc.heads.splice(i, 1);
        continue;
      }
      // PENNED: standing the pen ground, out of anyone's hands (a carried
      // head counts the moment it is set down inside — the grab lane's due).
      if (!h.a.heldBy && dist(h.a.pos, sc.penAt) <= cfg.penRadius) {
        df.notePenned(info.id);
        bumpLedger(nativeHost.ledger, 'drove_heads_penned');
        nativeHost.grantXp(cfg.reward.xpPerHead + cfg.reward.xpPerHeadPerLevel * lvl, sc.penAt); // XP BY PLACE
        nativeHost.text(vec(h.a.pos.x, h.a.pos.y - 24), 'penned!', '#b8e890', 12);
        h.a.postSpec = { hold: false, slack: Math.max(28, cfg.penRingR * 0.55), pace: 0.4 };
        h.a.aiPost = vec(
          sc.penAt.x + rand(-cfg.penRingR * 0.4, cfg.penRingR * 0.4),
          sc.penAt.y + rand(-cfg.penRingR * 0.4, cfg.penRingR * 0.4));
        sc.heads.splice(i, 1);
      }
    }
  }

export function sceneUpdateHauntStream(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const hf = nativeHost.sim.hauntField;
    if (!hf) { nativeHost.hauntStreamTimer = 0; return; }
    // DAWN BANISHMENTS first (drained even from ground the stream skips, so the
    // queue never backs up): a dissolved grief's standing spawns fade out of
    // the zone it held — its spawns only ever live in that zone's actor list.
    // THE SPLIT DISPATCH (shard M1-W3): the keeper drains once; the fade runs
    // in the World standing in the grief's zone.
    if (nativeHost.isCampaignFrameOwner()) for (const gone of hf.drainDissipated()) {
      nativeHost.atZone(gone.zoneId, w => w.dissipateHauntSpawns(gone.color));
    }
    if (nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') {
      nativeHost.hauntStreamTimer = 0; return;
    }
    const info = hf.hauntOn(nativeHost.zone.id);
    // THE WANE + THE WOUND LEDGER, every frame. Wane is re-stamped even when
    // the haunt is gone (0 — a resolved haunt's leftovers snap back solid),
    // and standing anchor/boss wounds sync to the overlay so a dawn
    // banishment — or a zone exit — carries the effort forward.
    const wane = info?.waneFrac ?? 0;
    for (const a of nativeHost.actors) {
      if (a.dead || !a.tag || !HAUNT_TAGS.has(a.tag)) continue;
      a.wane = wane;
      if (!info) continue;
      if (a.tag === 'haunt_anchor') hf.setAnchorLife(info.id, a.life / a.maxLife());
      else if (a.tag === 'wailing_one') hf.setBossLife(info.id, a.life / a.maxLife());
    }
    if (!info) { nativeHost.hauntStreamTimer = 0; return; }
    const lvl = Math.max(1, nativeHost.zone.level + info.levelBonus);
    if (!nativeHost.materializedHaunts.has(info.id)) {
      nativeHost.materializedHaunts.add(info.id);
      bumpLedger(nativeHost.ledger, 'haunt_seen'); // surfaces the Vault tuning
      if (nativeHost.isPresentLocalPlayer()) nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 130, color: info.color, life: 0.7, maxLife: 0.7 });
      if (info.anchorBroken) {
        // The grief already has its throat — no anchor stands; the Wailing One
        // walks at once, still wearing whatever was done to it.
        const boss = nativeHost.createMonster(info.bossId, Math.max(1, nativeHost.zone.level + info.bossLevelBonus), 'enemy');
        boss.tag = 'wailing_one';
        boss.life = Math.max(1, boss.maxLife() * clamp(info.bossLifeFrac, 0.02, 1)); // PRESERVED wounds
        boss.pos = nativeHost.findFreeSpot(nativeHost.clampPos(nativeHost.farPoint(520), 24), boss.radius);
        nativeHost.actors.push(boss);
        nativeHost.notice(`An unfinished grief holds ${nativeHost.zone.name} — the WAILING ONE walks${info.bossLifeFrac < 1 ? ', still wounded' : ''}.`, info.color, 18, 'events');
      } else {
        // The anchor stands where you'll FIND it, not on your toes.
        const at = nativeHost.clampPos(nativeHost.farPoint(520), 24);
        const anchor = nativeHost.createMonster(info.anchorId, lvl, 'enemy');
        anchor.tag = 'haunt_anchor';
        if (info.anchorLifeFrac < 1) {
          anchor.life = Math.max(1, anchor.maxLife() * clamp(info.anchorLifeFrac, 0.02, 1)); // PRESERVED cracks
        }
        anchor.pos = nativeHost.findFreeSpot(at, anchor.radius);
        nativeHost.actors.push(anchor);
        nativeHost.notice(`A grief holds ${nativeHost.zone.name} — find its anchor${info.anchorLifeFrac < 1 ? ' (already cracked)' : ''}.`, info.color, 18, 'events');
      }
    }
    // The slow pour: one apparition at a time toward the dread ceiling. While
    // the Wailing One walks (anchor broken), the pour keeps the pressure on.
    if (nativeHost.hauntHeadcount() >= info.maxAlive) { nativeHost.hauntStreamTimer = rand(info.streamInterval[0], info.streamInterval[1]); return; }
    nativeHost.hauntStreamTimer -= dt;
    if (nativeHost.hauntStreamTimer > 0) return;
    nativeHost.hauntStreamTimer = rand(info.streamInterval[0], info.streamInterval[1]);
    const id = nativeHost.weightedPick(info.roster, lvl);
    if (!MONSTERS[id]) return;
    const m = nativeHost.createMonster(id, lvl, 'enemy');
    m.tag = 'haunt_spawn';
    m.pos = nativeHost.findFreeSpot(nativeHost.farPoint(600), m.radius);
    nativeHost.actors.push(m);
  }

export function sceneUpdateLongNight(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const lnf = nativeHost.sim.longNightField;
    if (!lnf) { nativeHost.longNightStreamTimer = 0; return; }
    // THE SPLIT DISPATCH (shard M1-W3): the sky feed, the announcements and
    // the warp reconcile are the world's, run once by the keeper; the ground,
    // the coach and the pour below are each World's own zone.
    if (nativeHost.isCampaignFrameOwner()) nativeHost.longNightWorldChores(lnf);
    if (nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') {
      nativeHost.longNightStreamTimer = 0; return;
    }
    const info = lnf.groundOn(nativeHost.zone.id);
    // THE WOUND LEDGER, every frame: the parked coach's and the seated
    // Countess's hurts sync to the overlay, so a zone exit — or a relaunch —
    // keeps every blow (the Hunt's preserved-health pattern).
    if (info) {
      for (const a of nativeHost.actors) {
        if (a.dead || !a.tag) continue;
        if (a.tag === 'long_night_coach') lnf.setCoachLife(info.id, a.life / a.maxLife());
        else if (a.tag === 'long_night_court') lnf.setCountessLife(info.id, a.life / a.maxLife());
      }
    }
    if (!info) { nativeHost.longNightStreamTimer = 0; return; }
    const lvl = Math.max(1, nativeHost.zone.level + info.levelBonus);
    if (!nativeHost.materializedLongNights.has(info.id)) {
      nativeHost.materializedLongNights.add(info.id);
      bumpLedger(nativeHost.ledger, 'long_night_seen'); // surfaces the Vault tuning
      // The parked coach, wearing every prior blow. Its def carries the duty
      // post (MonsterDef.post) — wherever it parks IS its stand.
      const coach = nativeHost.createMonster(info.coachId, lvl, 'enemy');
      coach.tag = 'long_night_coach';
      if (info.coachLifeFrac < 1) {
        coach.life = Math.max(1, coach.maxLife() * clamp(info.coachLifeFrac, 0.02, 1));
      }
      coach.pos = nativeHost.findFreeSpot(nativeHost.clampPos(nativeHost.farPoint(520), 24), coach.radius);
      nativeHost.actors.push(coach);
      nativeHost.flashes.push({ pos: vec(coach.pos.x, coach.pos.y), radius: 130, color: info.color, life: 0.7, maxLife: 0.7 });
      nativeHost.notice(info.converted
          ? `The Court holds ${nativeHost.zone.name} — its coach stands gloom-warded. Burn it by day.`
          : `A gloom coach is parked in ${nativeHost.zone.name} — the Court is feeding here (night ${Math.min(info.fedNights + 1, info.nightsToConvert)} of ${info.nightsToConvert}).`, info.color, 17, 'events');
      // A SEATED COURT: the Countess walks her most-fed estate, crowned.
      if (info.countessHere && MONSTERS[info.countessId]) {
        const boss = nativeHost.createMonster(info.countessId,
          Math.max(1, nativeHost.zone.level + info.countessLevelBonus), 'enemy');
        boss.tag = 'long_night_court';
        if (info.countessLifeFrac < 1) {
          boss.life = Math.max(1, boss.maxLife() * clamp(info.countessLifeFrac, 0.02, 1));
        }
        nativeHost.promoteRarity(boss, 'crowned');
        boss.pos = nativeHost.findFreeSpot(nativeHost.clampPos(nativeHost.farPoint(420), 24), boss.radius);
        nativeHost.actors.push(boss);
        nativeHost.notice(`The COUNTESS holds court here${info.countessLifeFrac < 1 ? ', still wounded' : ''} — break it and the Long Night breaks.`, info.color, 18, 'events');
      }
    }
    // THE POUR: Court bodies stream in ONLY through the dark hours — by day
    // the ground stands with whatever survived the night (and its bearers).
    if (!inPhases(nativeHost.time, ['dusk', 'night'])) { nativeHost.longNightStreamTimer = 0; return; }
    if (nativeHost.longNightHeadcount() >= info.maxAlive) {
      nativeHost.longNightStreamTimer = rand(info.streamInterval[0], info.streamInterval[1]); return;
    }
    nativeHost.longNightStreamTimer -= dt;
    if (nativeHost.longNightStreamTimer > 0) return;
    nativeHost.longNightStreamTimer = rand(info.streamInterval[0], info.streamInterval[1]);
    const id = nativeHost.weightedPick(info.roster, lvl);
    if (!MONSTERS[id]) return;
    const m = nativeHost.createMonster(id, lvl, 'enemy');
    m.tag = 'long_night_spawn';
    m.pos = nativeHost.findFreeSpot(nativeHost.farPoint(600), m.radius);
    nativeHost.actors.push(m);
  }

export function sceneUpdateLooters(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (!nativeHost.drops.length) return;
    for (const a of nativeHost.actors) {
      if (a.dead || !a.defId) continue;
      const spec = MONSTERS[a.defId]?.looter;
      if (!spec) continue;
      const kinds = spec.kinds ?? ['skill', 'support'];
      const reach = (spec.reach ?? 30) + a.radius;
      for (let i = nativeHost.drops.length - 1; i >= 0; i--) {
        const d = nativeHost.drops[i];
        if (d.droppedBy || d.grace) continue;
        if (!kinds.includes(d.item.kind)) continue;
        if ((d.tier ??= nativeHost.spoilStoryAt(d.pos)) !== a.tier) continue; // its own story's shinies only
        if (dist(a.pos, d.pos) > reach) continue;
        (a.lootSack ??= []).push(d.item);
        nativeHost.drops.splice(i, 1);
        nativeHost.text(vec(a.pos.x, a.pos.y - 16), 'snatched!', '#e8c84a', 12, 'combat');
      }
    }
  }

export function sceneUpdateMigrationStream(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const mf = nativeHost.sim.migrationField;
    if (!mf || nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') {
      nativeHost.migrationStreamTimer = 0; return;
    }
    // STRAGGLERS FINISH THE CROSSING: wheel standing migrants toward their exit
    // whether or not the band still covers this zone. A crossing that ends (the
    // tail recedes past us, or the whole herd arrives) must not freeze its
    // stragglers mid-stride — they amble on and out. Only the REPLENISHING
    // stream below is gated on live coverage.
    nativeHost.updateMigrants(dt);
    const info = mf.migrationOn(nativeHost.zone.id);
    if (!info) { nativeHost.migrationStreamTimer = 0; return; } // the herd crossed on — the flow ebbs, the last walkers leave
    // First time this crossing catches the player here: a bulletin + the discovery ledger.
    if (!nativeHost.materializedMigrations.has(info.id)) {
      nativeHost.materializedMigrations.add(info.id);
      bumpLedger(nativeHost.ledger, 'migration_seen'); // surfaces the Vault tuning
      if (nativeHost.isPresentLocalPlayer()) nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 140, color: info.color, life: 0.7, maxLife: 0.7 });
      nativeHost.notice(`A great herd crosses ${nativeHost.zone.name} — give them room…`, info.color, 17, 'events');
    }
    // Wheel the neutral, un-roused herd across the zone toward the far exit (ai.ts holds
    // them dormant; the engine is what moves them — a flowing migration, not a milling mob).
    nativeHost.updateMigrants(dt);
    // Keep the herd's flow topped up to the band's cap.
    const cfg = mf.surge();
    if (nativeHost.migrantHeadcount() >= info.streamCap) { nativeHost.migrationStreamTimer = cfg.streamInterval; return; }
    nativeHost.migrationStreamTimer -= dt;
    if (nativeHost.migrationStreamTimer > 0) return;
    nativeHost.migrationStreamTimer = cfg.streamInterval;
    const batch = randInt(cfg.streamBatch[0], cfg.streamBatch[1]);
    for (let i = 0; i < batch && nativeHost.migrantHeadcount() < info.streamCap; i++) nativeHost.spawnMigrant(info, cfg);
  }

export function sceneUpdateNecropolis(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const df = nativeHost.sim.deadwakeField;
    const n = df?.necropolisInfo();
    if (!df || !n || nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.floating
      || nativeHost.zone.eventOwned || nativeHost.zone.pocket
      || nativeHost.zone.objective.kind === 'safe' || nativeHost.necropolisRealmContext) {
      nativeHost.necropolisPortals.length = 0; return;
    }
    const near = Math.hypot(nativeHost.zone.map.x - n.coord.x, nativeHost.zone.map.y - n.coord.y)
      <= df.surge().necropolis.accessRadius;
    if (near && !nativeHost.necropolisPortals.length) {
      const at = nativeHost.clearTransitSpot(nativeHost.clampPos(nativeHost.farPoint(440), 30));
      nativeHost.necropolisPortals.push({ pos: vec(at.x, at.y) });
      nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 130, color: '#d8cdb0', life: 1, maxLife: 1 });
      nativeHost.text(vec(at.x, at.y - 44), 'A gate to the Necropolis yawns open!', '#e8dcb0', 18);
    } else if (!near && nativeHost.necropolisPortals.length) {
      nativeHost.necropolisPortals.length = 0; // the seat drifted on — the gate closes
      nativeHost.notice('The Necropolis drifts beyond reach…', '#b0a888', 15, 'events');
    }
  }

export function sceneUpdateNeutralCooldown(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    for (const a of nativeHost.actors) {
      if (a.dead || !a.aiAwakened || !a.tag) continue;
      const rule = NEUTRAL_RESET[a.tag];
      if (!rule) continue; // absent ⇒ latched-once (never cools)
      if (nativeHost.time - a.lastCombatAt < rule.coolDownSecs) continue; // still hot
      if (nativeHost.nearestSeatDist(a.pos) < rule.disengageDist) continue; // a player is still close — keep hunting
      a.aiAwakened = false; // back to NEUTRAL
      a.aggroed = false;
      a.aiFleeing = false; a.aiPhaseIdx = -1; // a fleeing calf rejoins the herd; phases reset
      a.sheet.setSource('aiPhase', []); // clear any phase-archetype mods (defensive — no current neutral installs them)
    }
  }

export function sceneUpdateQuickening(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const fields = nativeHost.sim.quickeningFieldsAll();
    if (!fields.length) return;

    // THE RECONCILE (0.5s cadence; a property walk over the graph — cheap).
    // THE SPLIT DISPATCH (shard M1-W3): the stamps are the chart's, the
    // keeper's alone; the presence underfoot below is each World's own zone.
    if (nativeHost.isCampaignFrameOwner()) {
    if (nativeHost.isCampaignFrameOwner()) nativeHost.quickenSweepAcc += dt;
    if (nativeHost.quickenSweepAcc >= 0.5) {
      nativeHost.quickenSweepAcc = 0;
      const arcByZone = new Map<string, { id: string; level: number; until: number; onSurge: boolean; onFade: boolean }>();
      for (const f of fields) {
        const r = f.surge().refresh;
        for (const a of f.peek()) {
          arcByZone.set(a.zoneId, { id: a.id, level: a.level, until: a.until, onSurge: r.onSurge, onFade: r.onFade });
        }
      }
      for (const z of Object.values(nativeHost.zoneMap)) {
        const arc = arcByZone.get(z.id);
        if (arc && z.quickened?.key !== arc.id) {
          // APPLY (or adopt — a fresh arc over ground still wearing an old
          // stamp keeps the ORIGINAL baseLevel: the only honest revert).
          if (!z.quickened) z.quickened = { key: arc.id, baseLevel: z.level, until: arc.until };
          else { z.quickened.key = arc.id; z.quickened.until = arc.until; }
          z.level = Math.max(1, arc.level);
          if (arc.onSurge) nativeHost.zoneMemory.delete(z.id);
        } else if (!arc && z.quickened) {
          // REVERT: the window closed (or its arc was pruned/lost).
          z.level = Math.max(1, z.quickened.baseLevel);
          delete z.quickened;
          const r = fields[0].surge().refresh;
          if (r.onFade) nativeHost.zoneMemory.delete(z.id);
        }
      }
    }

    }

    // The surge's PRESENCE underfoot (caves are off-graph; authored specials
    // never seat — the wisplight's own guard).
    if (nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') return;
    const f = fields.find(x => (x.dimension ?? 'surface') === (nativeHost.zone.dimension ?? 'surface'));
    const info = f?.quickeningOn(nativeHost.zone.id);
    if (!f || !info) { nativeHost.quickenPulseAcc = 0; return; }
    const cfg = f.surge();

    // THE MATERIALIZE BEAT (once per ARC, ever — the flag persists on the
    // overlay): the discovery line + the Vault-surfacing ledger.
    if (!info.seen) {
      f.noteSeen(info.id);
      bumpLedger(nativeHost.ledger, 'quickenings_seen');
      if (nativeHost.isPresentLocalPlayer()) nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 140, color: cfg.color, life: 0.8, maxLife: 0.8 });
      nativeHost.notice(`The ground here runs QUICK — level ${info.level} while the window holds. Reap it.`, cfg.color, 18, 'events');
    }

    // THE KIN PULSE: every living enemy on quick ground wears the mark.
    // Pulse-refreshed (the status outlives the beat by a breath), so late
    // spawns join on the next beat and the mark dies with the window.
    nativeHost.quickenPulseAcc += dt;
    if (nativeHost.quickenPulseAcc >= cfg.kin.pulseSec) {
      nativeHost.quickenPulseAcc = 0;
      for (const a of nativeHost.actors) {
        if (a.dead || a.team !== 'enemy') continue;
        a.applyStatus(cfg.kin.status, 0, 1, 'The Quickening');
      }
    }

    // THE SURGE ECHO (once per arc): the window's one named face — minted at
    // the zone's SURGED level + its own bonus, champion-promoted, standing
    // far enough out that it is hunted, never handed over. Gated on the
    // STAMP being down (key match) so the echo always stands at the surged
    // measure, whatever order restore/dev seams arrive in.
    if (cfg.echo && !info.echoStaged && nativeHost.zone.quickened?.key === info.id) {
      f.noteEchoStaged(info.id);
      const lvl = Math.max(1, nativeHost.zone.level + cfg.echo.levelBonus);
      const m = nativeHost.createMonster(cfg.echo.monster, lvl, 'enemy');
      m.pos = nativeHost.findFreeSpot(nativeHost.clampPos(nativeHost.farPoint(520), 60), m.radius);
      nativeHost.promoteRarity(m, 'champion');
      nativeHost.actors.push(m);
      nativeHost.notice(cfg.echo.announce.replace('{zone}', nativeHost.zone.name), cfg.color, 16, 'events');
    }
  }

export function sceneUpdateStorm(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    // SOVEREIGNTY: sky — native hitAll hazards use physical coverage and roof shelter.
    const mass=nativeHost.massRuntime;
    if(mass?.storms){
      const bodies=nativeHost.actors.filter(a=>!a.dead&&!a.downed);
      mass.storms.update(dt,nativeHost.time,bodies.map(a=>mass.walk.at(a.pos.x,a.pos.y)),{
        contextAt:at=>mass.geography?.contextAt(at),
        weatherAt:(at,context)=>mass.weather!.sample(at,context),
        fire:(strike,at)=>{
          const pos=localOffset(at,{...mass.origin,x:0,y:0},mass.config.terrain.addressSpan);
          if(!bodies.some(a=>dist(a.pos,pos)<=mass.config.populationRadius)
            ||mass.settlement?.reserves(pos.x,pos.y,strike.radius)||!mass.walk.isWalkable(pos.x,pos.y)
            ||!strike.throughRoofs&&nativeHost.underRoofAt(pos))return false;
          nativeHost.fireStrikeAt(strike,pos);return true;
        },
      });
      return;
    }
    if (nativeHost.zone.objective.kind === 'safe') { nativeHost.lightningTimer = 0; return; }
    // skyFront: a sheltered zone (a cave, the cellar) never takes a bolt —
    // the sky cannot see its floor.
    const front = nativeHost.skyFront();
    const strike = front ? WEATHER_DEFS[front.kind].strike : undefined;
    if (!front || !strike) { nativeHost.lightningTimer = 0; return; }
    const rate = strike.ratePerSec * front.intensity; // strikes per second
    if (rate <= 0.02) return; // a faint front barely stirs
    nativeHost.lightningTimer -= dt;
    if (nativeHost.lightningTimer <= 0) {
      nativeHost.lightningTimer = 1 / rate;
      nativeHost.fireLightning(strike);
    }
  }

export function sceneUpdateStrayingScene(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    // SOVEREIGNTY: seat — scene seating (the derived census, probe_tiers RIG T).
    const sf = nativeHost.sim.strayField;
    if (!sf) { nativeHost.strayScene = null; return; }
    if (nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') return;
    const info = sf.strayingOn(nativeHost.zone.id);
    if (!info) { nativeHost.strayScene = null; return; }
    const cfg = sf.surge();
    const lvl = Math.max(1, nativeHost.zone.level);

    // THE MATERIALIZE BEAT (once per visit per call): the discovery line +
    // the Vault-surfacing ledger, the haunting's exact pattern.
    if (!nativeHost.materializedStrayings.has(info.id)) {
      nativeHost.materializedStrayings.add(info.id);
      bumpLedger(nativeHost.ledger, 'straying_seen');
      if (nativeHost.isPresentLocalPlayer()) nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 130, color: info.color, life: 0.7, maxLife: 0.7 });
      nativeHost.notice(info.phase === 'overrun'
          ? `${nativeHost.zone.name} has gone feral — the fold is broken here.`
          : `The fold has gone astray in ${nativeHost.zone.name} — a bell calls it away. Walk the strays home.`, info.color, 18, 'events');
    }

    // A lost fold needs no scene — the ground just wears the feral hold
    // (affectSpawns) until the land settles.
    if (info.phase === 'overrun' && (!nativeHost.strayScene || nativeHost.strayScene.phase === 'overrun')) {
      nativeHost.strayScene = null;
      return;
    }

    // STAGE (fresh entry, or a new call after a resolved one): anchor the fold
    // on the living pasture, seat the rally out past it, scatter the loose
    // heads between, and post the still court. Idempotent under zone memory —
    // court bodies are adopted back by tag before any top-up spawn.
    if (!nativeHost.strayScene || nativeHost.strayScene.id !== info.id) {
      const fold = nativeHost.pastureAnchor();
      const rally = nativeHost.strayingRallySeat(fold, cfg.rallyDist);
      if (!info.staged) {
        sf.noteStaged(info.id, randInt(cfg.strays[0], cfg.strays[1]), randInt(cfg.callers[0], cfg.callers[1]));
      }
      const live = sf.strayingOn(nativeHost.zone.id);
      if (!live) { nativeHost.strayScene = null; return; }
      const callers: Actor[] = nativeHost.actors.filter(a => !a.dead && a.tag === 'drove_call');
      const thralls: Actor[] = nativeHost.actors.filter(a => !a.dead && a.tag === 'drove_thrall');
      const callerLvl = Math.max(1, lvl + cfg.callerLevelBonus);
      const ringN = Math.max(1, live.callersLeft);
      for (let i = callers.length; i < live.callersLeft; i++) {
        const ang = (i / ringN) * Math.PI * 2;
        const at = nativeHost.findFreeSpot(nativeHost.clampPos(vec(rally.x + Math.cos(ang) * 58, rally.y + Math.sin(ang) * 58), 24), 14);
        const id = nativeHost.weightedPick(cfg.callerTable, callerLvl);
        if (!MONSTERS[id]) continue;
        const m = nativeHost.createMonster(id, callerLvl, 'enemy');
        m.tag = 'drove_call';
        m.pos = at;
        m.postSpec = { hold: true };
        m.aiPost = vec(at.x, at.y);
        m.aiPostFacing = Math.atan2(fold.y - at.y, fold.x - at.x); // it watches the farm
        nativeHost.actors.push(m);
        callers.push(m);
      }
      const strays: { a: Actor; state: 'loose' | 'homing'; bellLeft: number }[] = [];
      for (let i = 0; i < live.straysLeft; i++) {
        const id = nativeHost.weightedPick(cfg.strayTable, lvl);
        if (!MONSTERS[id]) continue;
        const t = rand(0.3, 0.8);
        const at = nativeHost.findFreeSpot(nativeHost.clampPos(vec(
          fold.x + (rally.x - fold.x) * t + rand(-150, 150),
          fold.y + (rally.y - fold.y) * t + rand(-150, 150)), 24), 12);
        const m = nativeHost.createMonster(id, lvl, 'enemy');
        m.pos = at;
        m.postSpec = { hold: false, slack: 60, pace: 0.5 }; // it grazes where it wandered
        m.aiPost = vec(at.x, at.y);
        nativeHost.actors.push(m);
        strays.push({ a: m, state: 'loose', bellLeft: rand(cfg.bellPull[0], cfg.bellPull[1]) });
      }
      nativeHost.strayScene = { id: info.id, fold, rally, strays, callers, thralls, phase: info.phase, sweepAcc: 0 };
    }
    const sc = nativeHost.strayScene!;

    // PHASE EDGES (the overlay flips, the engine performs):
    if (info.phase !== sc.phase) {
      if (info.phase === 'raid') {
        // THE BELL TURNS: the whole court rouses as one and marches the fold
        // (the wheel below carries the march; their own brains take over the
        // moment the fight finds them).
        for (const a of [...sc.callers, ...sc.thralls]) {
          if (a.dead) continue;
          a.aiAwakened = true;
          a.postSpec = undefined;
          a.aiPost = undefined;
        }
        nativeHost.flashes.push({ pos: vec(sc.rally.x, sc.rally.y), radius: 150, color: info.color, life: 0.8, maxLife: 0.8 });
        nativeHost.notice('THE BELL TURNS — the changed march on the steading!', info.color, 18, 'events');
      } else if (info.phase === 'relieved') {
        nativeHost.strayingRelief(sf, info.id, info.color, lvl, 'The call breaks — the strays remember themselves.');
        return;
      } else if (info.phase === 'overrun') {
        // The raid pressed its whole ttl: the bell recedes with what it took.
        for (const a of [...sc.callers, ...sc.thralls]) {
          if (!a.dead) nativeHost.slipAway(a, '', info.color);
        }
        bumpLedger(nativeHost.ledger, 'strayings_overrun');
        nativeHost.notice('The bell recedes — the changed go with it. The fields run feral.', info.color, 18, 'events');
        nativeHost.strayScene = null;
        return;
      }
      sc.phase = info.phase;
    }

    // THE WHEEL (the migrant/procession precedent): the scene's treks are
    // walked by the event tick itself — pathing on the zone's authority,
    // straight where the line is clean — so a rescue runs however far the
    // player ranges (the AI's activity scoping never stalls it). The duty
    // post keeps only the PLANTED texture (the court's watch, graze orbits).
    const wheel = (a: Actor, to: Vec2, pace: number): void => {
      let goal = to;
      const pf = nativeHost.pathField();
      if (pf?.pathStep && !(pf.lineWalkable?.(a.pos, to) ?? false)) {
        goal = pf.pathStep(a.pos, to) ?? to;
      }
      a.facing = angleTo(a.pos, goal);
      nativeHost.moveActor(a, goal.x - a.pos.x, goal.y - a.pos.y, dt * pace);
    };
    for (const s of sc.strays) {
      if (s.state === 'homing' && !s.a.dead && !s.a.heldBy) wheel(s.a, sc.fold, cfg.homePace);
    }
    if (info.phase === 'raid') {
      for (const a of [...sc.callers, ...sc.thralls]) {
        if (!a.dead && !a.aiTargetId && !a.heldBy) wheel(a, sc.fold, cfg.marchPace);
      }
    } else {
      // The changed sleepwalk to the rally and PLANT there, facing the farm.
      for (const a of sc.thralls) {
        if (a.dead || a.heldBy || !isDormant(a)) continue;
        if (dist(a.pos, sc.rally) > 34) wheel(a, sc.rally, cfg.thrallPace);
        else if (!a.postSpec) {
          a.postSpec = { hold: true };
          a.aiPost = vec(a.pos.x, a.pos.y);
          a.aiPostFacing = Math.atan2(sc.fold.y - a.pos.y, sc.fold.x - a.pos.x);
        }
      }
    }

    // BELL CLOCKS tick every frame (cheap — a handful of heads).
    for (const s of sc.strays) if (s.state === 'loose' && !s.a.dead) s.bellLeft -= dt;

    // THE SWEEP (throttled): proximity herding, arrivals, conversions, deaths.
    sc.sweepAcc += dt;
    if (sc.sweepAcc < 0.2) return;
    sc.sweepAcc = 0;

    for (let i = sc.strays.length - 1; i >= 0; i--) {
      const s = sc.strays[i];
      if (s.a.dead) {
        // A head simply died out there (a wolf, a stray blade) — lost.
        sf.noteStrayLost(info.id);
        nativeHost.text(vec(s.a.pos.x, s.a.pos.y - 24), 'a head is lost…', '#c8b890', 12);
        sc.strays.splice(i, 1);
        continue;
      }
      if (s.state === 'loose') {
        // A player's touch — or a farmhand's — turns it home. The duty post
        // does the walking; the panic fabric may interrupt, the post resumes.
        // A head in someone's HANDS is not herded (the Drove's pen law, one
        // law for both events): the grip owns its feet, so the trek home
        // begins the moment it is set down — never while it is carried.
        let touched = false;
        if (!s.a.heldBy) {
          for (const seat of nativeHost.frameSeats()) {
            if (!seat.actor.dead && dist(seat.actor.pos, s.a.pos) <= cfg.herdRadius) { touched = true; break; }
          }
          if (!touched) {
            for (const f of nativeHost.actors) {
              if (f.dead || f.faction !== 'freehold' || isDormant(f)) continue;
              if (dist(f.pos, s.a.pos) <= cfg.assistRadius) { touched = true; break; }
            }
          }
        }
        if (touched) {
          // The wheel owns the trek home — the graze post lets go until the
          // fold takes it back (arrival re-plants it as pasture).
          s.state = 'homing';
          s.a.postSpec = undefined;
          s.a.aiPost = undefined;
          nativeHost.text(vec(s.a.pos.x, s.a.pos.y - 24), `${s.a.name} remembers the fold`, info.color, 12);
        } else if (s.bellLeft <= 0) {
          // THE BELL'S WORK: the head turns where it stands — silent swap, no
          // bounty, no corpse — and the changed body walks to the rally still
          // dormant (the duty post carries it; the sight is the point).
          const convId = cfg.convertTo[s.a.defId ?? ''] ?? cfg.convertFallback;
          const at = vec(s.a.pos.x, s.a.pos.y);
          const idx = nativeHost.actors.indexOf(s.a);
          if (idx >= 0) nativeHost.actors.splice(idx, 1);
          sc.strays.splice(i, 1);
          if (MONSTERS[convId]) {
            // No post yet — the wheel sleepwalks it to the rally, where it
            // PLANTS (the still congregation growing one head at a time).
            const m = nativeHost.createMonster(convId, lvl, 'enemy');
            m.tag = 'drove_thrall';
            m.pos = at;
            nativeHost.actors.push(m);
            sc.thralls.push(m);
          }
          nativeHost.flashes.push({ pos: at, radius: 44, color: info.color, life: 0.5, maxLife: 0.5 });
          nativeHost.text(vec(at.x, at.y - 24), 'a head goes to the bell…', info.color, 13);
          sf.noteConverted(info.id);
        }
      } else if (!s.a.heldBy && dist(s.a.pos, sc.fold) <= cfg.arriveRadius) {
        // HOME SAFE: standing the fold ground, out of anyone's hands (the
        // Drove's pen law again — a carried head counts the moment it is set
        // down inside). The head rejoins the pasture (a graze post at the
        // fold) and the drovers pay by the head (the Drover tier counts it).
        sf.noteReturned(info.id);
        bumpLedger(nativeHost.ledger, 'strays_returned');
        nativeHost.grantXp(cfg.reward.xpPerHead + cfg.reward.xpPerHeadPerLevel * lvl, sc.fold); // XP BY PLACE
        nativeHost.text(vec(s.a.pos.x, s.a.pos.y - 24), 'home safe', '#b8e890', 12);
        s.a.postSpec = { hold: false, slack: 200 };
        s.a.aiPost = vec(sc.fold.x, sc.fold.y);
        sc.strays.splice(i, 1);
      }
    }

    // Court losses: each fallen caller is a note (the LAST breaks the call).
    for (let i = sc.callers.length - 1; i >= 0; i--) {
      if (sc.callers[i].dead) { sc.callers.splice(i, 1); sf.noteCallerDown(info.id); }
    }
    for (let i = sc.thralls.length - 1; i >= 0; i--) {
      if (sc.thralls[i].dead) sc.thralls.splice(i, 1);
    }

    // THE DEFENSE: a marching court broken to the last body holds the fold.
    if (info.phase === 'raid' && sc.callers.length === 0 && sc.thralls.length === 0) {
      nativeHost.strayingRelief(sf, info.id, info.color, lvl, 'The fold holds. The drovers breathe.');
    }
  }

export function sceneUpdateSwarmStream(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const sf = nativeHost.sim.swarmingField;
    if (!sf || nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') {
      nativeHost.swarmStreamTimer = 0; return;
    }
    const info = sf.swarmOn(nativeHost.zone.id);
    if (!info) { nativeHost.swarmStreamTimer = 0; return; }
    // First time this flight catches the player: bulletin + discovery ledger.
    if (!nativeHost.materializedSwarmings.has(info.id)) {
      nativeHost.materializedSwarmings.add(info.id);
      bumpLedger(nativeHost.ledger, 'swarming_seen');
      if (nativeHost.isPresentLocalPlayer()) nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 150, color: info.color, life: 0.8, maxLife: 0.8 });
      nativeHost.notice(`The sky crawls — the Swarming pours over ${nativeHost.zone.name}!`, info.color, 17, 'events');
    }
    if (nativeHost.swarmHeadcount() >= info.streamCap) { nativeHost.swarmStreamTimer = sf.surge().streamInterval; return; }
    nativeHost.swarmStreamTimer -= dt;
    if (nativeHost.swarmStreamTimer > 0) return;
    const cfg = sf.surge();
    nativeHost.swarmStreamTimer = cfg.streamInterval;
    const batch = randInt(cfg.streamBatch[0], cfg.streamBatch[1]);
    for (let i = 0; i < batch && nativeHost.swarmHeadcount() < info.streamCap; i++) nativeHost.spawnSwarmFlier(info, cfg);
  }

export function sceneUpdateWispScene(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    // SOVEREIGNTY: seat — scene seating (the derived census, probe_tiers RIG T).
    const wf = nativeHost.sim.wisplightField;
    if (!wf) { nativeHost.wispScene = null; return; }
    if (nativeHost.inCave || nativeHost.zone.special || nativeHost.zone.objective.kind === 'safe') return;
    const info = wf.wisplightOn(nativeHost.zone.id);
    if (!info) { nativeHost.wispScene = null; return; }
    const cfg = wf.surge();
    const lvl = Math.max(1, nativeHost.zone.level);
    const col = cfg.color ?? '#b8f0a0';

    // THE MATERIALIZE BEAT (once per visit per gathering): the discovery
    // line + the Vault-surfacing ledger, the haunting's exact pattern.
    if (!nativeHost.materializedWisplights.has(info.id)) {
      nativeHost.materializedWisplights.add(info.id);
      bumpLedger(nativeHost.ledger, 'wisplights_seen');
      if (nativeHost.isPresentLocalPlayer()) nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 130, color: col, life: 0.7, maxLife: 0.7 });
      nativeHost.notice(info.ridden > 0 && info.standing === 0 && info.kindled === 0
          ? `Something ridden waits in ${nativeHost.zone.name} — a light found a body here.`
          : `Lights wait in the reeds of ${nativeHost.zone.name}. Touch one, and see.`, col, 18, 'events');
    }

    // STAGE (fresh entry, or a fresh gathering): roll the kinds ONCE, stand
    // the lights out where they must be walked to, and re-raise any ridden
    // hosts. Idempotent under zone memory — a remembered host is adopted by
    // its ride mark before any re-mint.
    if (!nativeHost.wispScene || nativeHost.wispScene.id !== info.id) {
      if (!info.staged) {
        const n = randInt(cfg.wisps[0], cfg.wisps[1]);
        const kinds: string[] = [];
        for (let i = 0; i < n; i++) kinds.push(nativeHost.weightedPick(cfg.kinds, lvl));
        wf.noteStaged(info.id, kinds.filter(k => cfg.kinds.some(x => x.id === k)));
      }
      const live = wf.wisplightOn(nativeHost.zone.id);
      if (!live) { nativeHost.wispScene = null; return; }
      const sc: WispScene = { id: live.id, wisps: [], hosts: [], sweepAcc: 0 };
      live.slots.forEach((slot, i) => {
        const kind = cfg.kinds.find(k => k.id === slot.kind);
        if (!kind) return;
        if (slot.state === 'standing' || slot.state === 'kindled') {
          const m = nativeHost.mintWispBody(kind.monster, cfg.standMinDist);
          if (!m) return;
          const w: WispSceneWisp = {
            slot: i, a: m, kind: kind.id, state: 'standing',
            route: [], routeAt: 0, wanderLeft: 0, seekLeft: 0, target: null,
            bloomAcc: 0, bloomsLeft: cfg.bloom?.max ?? 0, pulseAcc: 0,
            stallAcc: 0, stallD: Infinity,
          };
          // A light left mid-walk resumes walking (fresh route — the walk
          // is transient; the STATE is the overlay's).
          if (slot.state === 'kindled') nativeHost.kindleWisp(w, cfg, false);
          sc.wisps.push(w);
        } else if (slot.state === 'ridden') {
          let host = nativeHost.actors.find(a => !a.dead && a.defId === slot.hostDef
            && a.statuses.some(s => s.id === kind.rideStatus));
          if (!host) {
            // Re-raise it — rolling the body from the zone's own fauna if
            // the absent die left the def unnamed.
            let defId = slot.hostDef;
            if (!defId || !MONSTERS[defId]) {
              defId = nativeHost.zone.packs?.table?.length
                ? nativeHost.weightedPick(nativeHost.zone.packs.table, lvl) : undefined;
            }
            if (!defId || !MONSTERS[defId]) { wf.noteGuttered(live.id, i); return; }
            const m = nativeHost.createMonster(defId, lvl, 'enemy');
            m.pos = nativeHost.findFreeSpot(nativeHost.clampPos(nativeHost.farPoint(420), 60), m.radius);
            nativeHost.actors.push(m);
            nativeHost.applyWispRide(m, kind, cfg);
            wf.noteRidden(live.id, i, defId);
            host = m;
          }
          sc.hosts.push({ slot: i, a: host });
        }
      });
      nativeHost.wispScene = sc;
    }
    const sc = nativeHost.wispScene!;

    // THE GLIDE (the wheel's bodiless cousin): a light has no body and no
    // brain — it drifts dead straight between its validated waypoints,
    // over bog and brush alike. Direct integration + a BOUNDS-ONLY clamp:
    // the walk grid and the mover contract are for things with feet (live
    // QA watched a flying light pinned a whole wander at a pond's shore —
    // clampPos resolves positions OUT of unwalkable cells, and half the
    // marsh is honestly unwalkable). The scene drives it, so it wanders
    // however far the player ranges.
    const glide = (a: Actor, to: Vec2, pace: number): void => {
      const d = dist(a.pos, to);
      if (d <= 1) return;
      const stepLen = Math.min(d, a.sheet.get('moveSpeed') * pace * dt);
      a.facing = angleTo(a.pos, to);
      a.pos.x = clamp(a.pos.x + Math.cos(a.facing) * stepLen, 8, nativeHost.arena.w - 8);
      a.pos.y = clamp(a.pos.y + Math.sin(a.facing) * stepLen, 8, nativeHost.arena.h - 8);
    };

    for (let wi = sc.wisps.length - 1; wi >= 0; wi--) {
      const w = sc.wisps[wi];
      if (w.state === 'kindled') {
        const goal = w.route[w.routeAt];
        if (goal) {
          const from = vec(w.a.pos.x, w.a.pos.y);
          glide(w.a, goal, cfg.wanderPace);
          w.bloomAcc += dist(from, w.a.pos);
          const dNow = dist(w.a.pos, goal);
          if (dNow <= 22) {
            w.routeAt++;
            w.stallAcc = 0;
            w.stallD = Infinity;
          } else if (dNow >= w.stallD - 1) {
            // Gaining no ground (a border band, a confinement pass): the
            // light loses interest and drifts for the next waypoint.
            w.stallAcc += dt;
            if (w.stallAcc >= cfg.route.stallSec) {
              w.routeAt++;
              w.stallAcc = 0;
              w.stallD = Infinity;
            }
          } else {
            w.stallAcc = 0;
            w.stallD = dNow;
          }
        }
        w.wanderLeft -= dt;
        if (w.routeAt >= w.route.length || w.wanderLeft <= 0) {
          // Route's end or the clock's — whichever comes first, the light
          // turns purposeful.
          w.state = 'seeking';
          w.seekLeft = cfg.seekSec;
          nativeHost.text(vec(w.a.pos.x, w.a.pos.y - 18), 'the light grows purposeful…', col, 13);
        }
        // THE FLOURISH: the blessing pulsed around the glow as it walks.
        w.pulseAcc += dt;
        if (w.pulseAcc >= cfg.aura.pulseSec) {
          w.pulseAcc = 0;
          for (const a of nativeHost.actors) {
            if (a.dead || a.team !== 'enemy' || a.untargetable) continue;
            if (dist(a.pos, w.a.pos) > cfg.aura.radius) continue;
            a.applyStatus(cfg.aura.status, 0, 1, 'The Wisplight');
          }
        }
        // THE BLOOM TRAIL: little lights bud where it walked, then dry on
        // their own (Doodad.evap — the transience doctrine's own fabric).
        if (cfg.bloom && w.bloomsLeft > 0 && w.bloomAcc >= cfg.bloom.every) {
          w.bloomAcc = 0;
          w.bloomsLeft--;
          const b = cfg.bloom;
          const d: Doodad = {
            pos: nativeHost.clampPos(vec(w.a.pos.x + rand(-16, 16), w.a.pos.y + rand(-16, 16)), 8),
            radius: rand(b.radius[0], b.radius[1]), kind: b.kind as Doodad['kind'],
            evap: { t: rand(b.dwell[0], b.dwell[1]), rate: b.rate },
          };
          nativeHost.doodads.push(d);
          nativeHost.evaporating.push(d);
          nativeHost.markDoodadsChanged();
        }
      } else if (w.state === 'seeking') {
        w.seekLeft -= dt;
        if (w.target && (w.target.dead || riderRefusal(w.target) !== null)) w.target = null;
        if (w.target) {
          // THE DRAWL: the same glide, slower — and straight through the
          // target's own body (no separation: it is going INSIDE).
          const t = w.target;
          glide(w.a, t.pos, cfg.seekPace);
          if (dist(w.a.pos, t.pos) <= w.a.radius + t.radius + cfg.rideRadius) {
            nativeHost.wispRideLands(sc, w, t, cfg);
            sc.wisps.splice(wi, 1);
            continue;
          }
        }
        if (w.seekLeft <= 0) {
          // Nothing worth blessing in reach: the light gutters out.
          wf.noteGuttered(sc.id, w.slot);
          nativeHost.slipAway(w.a, 'the light gutters out…', col);
          sc.wisps.splice(wi, 1);
        }
      }
    }

    // THE SWEEP (throttled): touches, seek scans, the bounty watch.
    sc.sweepAcc += dt;
    if (sc.sweepAcc < 0.2) return;
    sc.sweepAcc = 0;

    // THE TOUCH: any seat brushing a standing light kindles it.
    for (const w of sc.wisps) {
      if (w.state !== 'standing') continue;
      for (const seat of nativeHost.frameSeats()) {
        if (seat.actor.dead) continue;
        if (dist(seat.actor.pos, w.a.pos) <= cfg.kindleRadius + w.a.radius + seat.actor.radius) {
          nativeHost.kindleWisp(w, cfg, true);
          wf.noteKindled(sc.id, w.slot);
          break;
        }
      }
    }
    // THE SEEK SCAN: the strongest eligible body in reach (re-checked while
    // seeking — a better host wandering closer draws the light off).
    for (const w of sc.wisps) {
      if (w.state !== 'seeking' || w.target) continue;
      w.target = nativeHost.wispSeekTarget(w.a, cfg);
    }
    // THE BOUNTY WATCH: a broken host spills the light's hoard.
    for (let i = sc.hosts.length - 1; i >= 0; i--) {
      const h = sc.hosts[i];
      if (!h.a.dead) continue;
      sc.hosts.splice(i, 1);
      wf.noteHostSlain(sc.id, h.slot);
      bumpLedger(nativeHost.ledger, 'wisplight_hosts_slain');
      nativeHost.grantXp(cfg.reward.xpBase + cfg.reward.xpPerLevel * lvl, h.a.pos); // XP BY PLACE
      for (let g = 0; g < cfg.reward.gems; g++) nativeHost.dropGemAt(vec(h.a.pos.x, h.a.pos.y), undefined, false, nativeHost.provenanceOf(h.a));
      nativeHost.flashes.push({ pos: vec(h.a.pos.x, h.a.pos.y), radius: 90, color: col, life: 0.6, maxLife: 0.6 });
      nativeHost.text(vec(h.a.pos.x, h.a.pos.y - 24), 'the light spills out…', col, 14);
    }
  }

export function sceneUpdateWorldBosses(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    // 1. MINT DRAIN — every instance (each dimension's sovereigns take ground
    //    in their own graph). THE SPLIT DISPATCH (shard M1-W3): the chart's
    //    mints are the keeper's; the walls, the passing and the fight sync
    //    below stay with each World's own zone.
    if (nativeHost.isCampaignFrameOwner()) for (const f of nativeHost.sim.worldBossFieldsAll()) {
      for (const req of f.pendingMints()) nativeHost.mintWorldBossZone(f, req);
    }
    const f = nativeHost.sim.worldBossFieldFor(nativeHost.zone.dimension);
    if (!f) return;
    nativeHost.updateWorldBossWalls(f);
    nativeHost.updateWorldBossPassing(f, dt);
    // 2. THE STANDING FIGHT — mirror health; despawn a sovereign whose stay ran out.
    if (nativeHost.wbBoss) {
      const m = nativeHost.wbBoss;
      const fight = f.fightAt(nativeHost.zone.id);
      if (m.dead) {
        nativeHost.wbBoss = null; // the kill row already resolved the fall
      } else if (!fight || fight.instanceId !== nativeHost.wbBossKey) {
        // Departed unbeaten (the apparition's clock ran out) — it sinks away
        // whole; slipAway's despawnPartsOf sweep takes its silhouette parts
        // with it.
        nativeHost.flashes.push({ pos: vec(m.pos.x, m.pos.y), radius: 180, color: '#c8a03c', life: 0.9, maxLife: 0.9 });
        nativeHost.slipAway(m, `${m.name} sinks away…`);
        nativeHost.wbBoss = null;
      } else {
        f.setBossLife(fight.instanceId, Math.max(0.005, m.life / m.maxLife()));
      }
    }
  }

export function sceneUpdateWraithsailDock(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const wf = nativeHost.sim.wraithsailField;
    if (!wf || nativeHost.inCave || nativeHost.zone.special) return;
    const dock = wf.dockedOn(nativeHost.zone.id);
    if (!dock) return;
    const key = `${dock.id}:${dock.dockSeq}`;
    if (!nativeHost.materializedDocks.has(key)) {
      nativeHost.materializedDocks.add(key);
      bumpLedger(nativeHost.ledger, 'wraithsail_seen'); // ashore counts as sighting her
      const lvl = Math.max(1, nativeHost.zone.level + dock.partyLevelBonus);
      const at = nativeHost.portDock()?.pos ?? nativeHost.farPoint(320);
      const herald = nativeHost.spawnEventActor([{ id: dock.heraldId, weight: 1 }], lvl, 'enemy', 'deep', 'wraithsail_ashore');
      nativeHost.promoteRarity(herald, 'rare');
      herald.pos = nativeHost.findFreeSpot(nativeHost.clampPos(vec(at.x, at.y), 24), herald.radius);
      const n = randInt(dock.partyCount[0], dock.partyCount[1]);
      for (let i = 0; i < n; i++) {
        const a = nativeHost.spawnEventActor(dock.party, lvl, 'enemy', 'deep', 'wraithsail_ashore');
        a.pos = nativeHost.findFreeSpot(nativeHost.clampPos(nativeHost.clampNear(at, 150), 24), a.radius);
      }
      nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 140, color: dock.color, life: 0.8, maxLife: 0.8 });
      nativeHost.notice(`the WRAITHSAIL lies alongside ${nativeHost.zone.name} — the Drowned Court walks ashore!`, '#bfe8ec', 18, 'events');
    } else if (!nativeHost.actors.some(a => !a.dead && a.tag === 'wraithsail_ashore')) {
      // The party is broken to the last — she wants no more of this harbor.
      if (wf.onPartyBroken(nativeHost.zone.id)) {
        bumpLedger(nativeHost.ledger, 'wraithsail_repelled');
        nativeHost.notice('the court is driven back to the water — the Wraithsail slips her mooring', '#bfe8ec', 16, 'events');
      }
    }
  }

export function sceneBombardTarget(nativeHost:NativeSceneCampaignFrameClosureHost, a: Actor, spec: BombardSpec): Actor | null {
    if (a.owner) {
      const r = spec.assistRadius ?? BOMBARD_CFG.assistRadius;
      const keeper = a.owner;
      const pool = nativeHost.actors.filter(e => !e.dead && !e.untargetable
        && nativeHost.hostileTo(a, e) && !isDormant(e) && dist(keeper.pos, e.pos) <= r);
      return pool.length ? pick(pool) : null;
    }
    const seats = nativeHost.frameSeats().filter(s => !s.actor.dead).map(s => s.actor);
    return seats.length ? pick(seats) : null;
  }

export function sceneSpawnBrigandPack(nativeHost:NativeSceneCampaignFrameClosureHost, info: BrigandInfo, cfg: BrigandSurge): void {
    const roster = cfg.roster.filter(e => MONSTERS[e.id]); // a typo'd/removed id never shrinks the pack
    if (!roster.length) return;
    const flow = nativeHost.bandFlow(info.dir); // the trailing-edge entry = the side they came from
    let at = flow.entry;
    const STANDOFF = 200;
    if (nativeHost.isPresentLocalPlayer() && dist(at, nativeHost.player.pos) < STANDOFF) {
      let dx = at.x - nativeHost.player.pos.x, dy = at.y - nativeHost.player.pos.y;
      if (Math.hypot(dx, dy) < 1) { dx = nativeHost.arena.w / 2 - at.x; dy = nativeHost.arena.h / 2 - at.y; }
      const len = Math.hypot(dx, dy) || 1;
      at = nativeHost.clampPos(vec(at.x + (dx / len) * STANDOFF, at.y + (dy / len) * STANDOFF), 16);
    }
    const lvl = Math.max(1, nativeHost.zone.level + cfg.levelBonus);
    // The band IS a squad: shared id, first body leads — roused brigands
    // fight with pack discipline (muster/tokens/formations per their brains).
    const squadId = nativeHost.nextSquadId();
    for (let k = 0; k < info.packSize; k++) {
      const m = nativeHost.createMonster(nativeHost.weightedPick(roster, lvl), lvl, 'enemy');
      m.faction = info.faction;
      m.tag = 'brigand';
      m.squadId = squadId;
      m.squadLeader = k === 0;
      m.pos = nativeHost.clampPos(vec(at.x + rand(-70, 70), at.y + rand(-70, 70)), m.radius);
      m.aiFleeGoal = nativeHost.brigandWanderPoint(); // an initial wander mark (re-rolled on arrival)
      nativeHost.actors.push(m);
    }
    // Start the "prowl then move on" clock fresh for this pack.
    nativeHost.brigandLingerLeft = rand(cfg.lingerSeconds[0], cfg.lingerSeconds[1]);
    nativeHost.brigandsDrifting = false;
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 110, color: info.color, life: 0.7, maxLife: 0.7 });
    nativeHost.text(vec(at.x, at.y - 44),
      `Brigands fall upon ${nativeHost.zone.name} — a ${info.variant} from the ${nativeHost.compassFrom(at)}!`, info.color, 16);
  }

export function sceneUpdateBrigands(nativeHost:NativeSceneCampaignFrameClosureHost, cfg: BrigandSurge, dt: number): void {
    // SOVEREIGNTY: sound — a rouse by earshot (the derived census, probe_tiers RIG T).
    const REPICK = 48; // within this of the wander mark = pick a fresh one
    const ARRIVE = 52; // within this of the exit = the brigand has drifted out
    // Survey the pack for the prowl-clock: an active robbery (any roused) pauses + refills it.
    let anyRoused = false, anyNeutral = false;
    for (const a of nativeHost.actors) {
      if (a.dead || a.tag !== 'brigand') continue;
      if (a.aiAwakened) anyRoused = true; else anyNeutral = true;
    }
    if (!anyRoused && !anyNeutral) return; // no brigands in this zone
    if (anyRoused) {
      nativeHost.brigandsDrifting = false;
      nativeHost.brigandLingerLeft = Math.max(nativeHost.brigandLingerLeft, cfg.lingerSeconds[0]); // a fresh window after a fight
    } else if (!nativeHost.brigandsDrifting) {
      nativeHost.brigandLingerLeft -= dt;
      if (nativeHost.brigandLingerLeft <= 0) {
        nativeHost.brigandsDrifting = true;
        nativeHost.notice('The brigands drift on, seeking easier marks…', '#d8a24a', 14, 'events');
      }
    }
    let announced = false; // one "they close in!" per pass, not per roused brigand
    for (let i = nativeHost.actors.length - 1; i >= 0; i--) {
      const a = nativeHost.actors[i];
      if (a.dead || a.tag !== 'brigand' || a.aiAwakened) continue;
      // proximity rouse — a mark strayed close; the cohort turns.
      if (nativeHost.nearestSeatDist(a.pos) <= cfg.aggroRadius) {
        for (const k of nativeHost.actors) {
          if (k.dead || k.tag !== 'brigand' || k.aiAwakened) continue;
          if (dist(k.pos, a.pos) <= cfg.rouseRadius) k.aiAwakened = true;
        }
        if (!announced) { announced = true; nativeHost.text(vec(a.pos.x, a.pos.y - 24), 'The brigands close in!', '#d8a24a', 14); }
        continue; // roused this frame — let ai.ts take it next tick
      }
      if (nativeHost.brigandsDrifting) {
        // drift OFF: make for the nearest exit; despawn on arrival (they've moved on).
        const ex = nativeHost.nearestExitPos(a.pos) ?? vec(nativeHost.arena.w / 2, nativeHost.arena.h / 2);
        a.facing = angleTo(a.pos, ex);
        nativeHost.moveActor(a, ex.x - a.pos.x, ex.y - a.pos.y, dt);
        if (dist(a.pos, ex) < ARRIVE) nativeHost.actors.splice(i, 1);
        continue;
      }
      // still prowling: WANDER — amble toward the mark; re-roll on arrival OR if wall-stuck.
      let goal = a.aiFleeGoal;
      if (!goal || dist(a.pos, goal) < REPICK) { goal = nativeHost.brigandWanderPoint(); a.aiFleeGoal = goal; }
      a.facing = angleTo(a.pos, goal);
      const px = a.pos.x, py = a.pos.y;
      nativeHost.moveActor(a, goal.x - a.pos.x, goal.y - a.pos.y, dt);
      // Axis-slide yields ~zero progress against an inside corner / unreachable mark: abandon it.
      if (Math.hypot(a.pos.x - px, a.pos.y - py) < 0.5 && dist(a.pos, goal) >= REPICK) a.aiFleeGoal = undefined;
    }
  }

export function sceneSpawnDeadwakeLeader(nativeHost:NativeSceneCampaignFrameClosureHost, info: DeadwakeInfo): void {
    const cfg = nativeHost.sim.deadwakeField?.surge();
    if (!cfg?.leaderPool.length) return;
    const lvl = Math.max(1, nativeHost.zone.level + info.leaderLevelBonus);
    const leaderId = nativeHost.weightedPick(cfg.leaderPool, lvl);
    if (!MONSTERS[leaderId]) return;
    const leader = nativeHost.createMonster(leaderId, lvl, 'enemy');
    leader.faction = info.faction;
    nativeHost.promoteRarity(leader, 'crowned');
    leader.tag = 'deadwake_leader';
    leader.xpValue = Math.max(leader.xpValue, info.leaderXpFloor);
    const at = nativeHost.deadwakeEntryPoint(info);
    leader.pos = nativeHost.clampPos(vec(at.x + rand(-30, 30), at.y + rand(-30, 30)), leader.radius);
    nativeHost.actors.push(leader);
  }

export function sceneDeadwakeHeadcount(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    let n = 0;
    for (const a of nativeHost.actors) if (!a.dead && a.team === 'enemy' && a.tag === 'deadwake_spawn') n++;
    return n;
  }

export function sceneSpawnDeadwakeStreamer(nativeHost:NativeSceneCampaignFrameClosureHost, info: DeadwakeInfo, cfg: DeadwakeSurge): void {
    if (!cfg.floodRoster.length) return;
    const lvl = Math.max(1, nativeHost.zone.level + info.levelBonus);
    const id = nativeHost.weightedPick(cfg.floodRoster, lvl);
    if (!MONSTERS[id]) return;
    const m = nativeHost.createMonster(id, lvl, 'enemy');
    m.faction = info.faction;
    m.tag = 'deadwake_spawn';
    const at = nativeHost.deadwakeEntryPoint(info);
    m.pos = nativeHost.clampPos(vec(at.x + rand(-55, 55), at.y + rand(-55, 55)), m.radius);
    nativeHost.actors.push(m);
  }

export function sceneFireMeteor(nativeHost:NativeSceneCampaignFrameClosureHost, info: InvasionInfo): void {
    const surge = nativeHost.sim.demonFieldFor(nativeHost.zone.dimension)?.surge();
    if (!surge) return;
    const skill = SKILLS[surge.meteorSkillId];
    if (!skill) return;
    if (!nativeHost.demonCaster) {
      const c = observeNativeHiddenSource(nativeHost,()=>new Actor('Demon Storm', 'player', vec(0, 0)));
      c.untargetable = true;
      c.invulnerable = true;
      nativeHost.demonCaster = c;
    }
    const caster = observeNativeSource(nativeHost,nativeHost.demonCaster);
    caster.level = Math.max(1, nativeHost.zone.level + info.strengthBonus);
    const at = vec(rand(70, nativeHost.arena.w - 70), rand(70, nativeHost.arena.h - 70));
    caster.pos = vec(at.x, at.y);
    const inst = makeSkillInstance(skill, 1 + Math.floor(nativeHost.zone.level / 3) + info.strengthBonus);
    let nativeQueue:typeof nativeHost.zones;let nativeRecord:(typeof nativeHost.zones)[number];
    (nativeQueue=observeNativeCombatStorage(nativeHost,'zones',nativeHost.zones)).push(nativeRecord={ tier: caster.tier,
      pos: at, radius: surge.meteorRadius, caster, inst, color: skill.color,
      delay: surge.meteorTelegraph, exploded: false, linger: 0,
      tickInterval: 0, tickTimer: 0, shape: 0, facing: 0,
      dmgMult: 1, depth: 1, hitAll: true, meteor: true, spareDormant: true,
      spareRoofed: true, // sky-borne: the roof takes the fire, not the family under it
      onImpact: () => nativeHost.onMeteorImpact(info, vec(at.x, at.y)),
    });
    observeNativeCombatRecord(nativeHost,'zones',nativeQueue,nativeRecord,caster,inst);
  }

export function sceneEvapDroveDress(nativeHost:NativeSceneCampaignFrameClosureHost, t: number, rate: number): void {
    for (const d of nativeHost.doodads) {
      if (d.eventDress !== 'drove' || d.gone || d.evap) continue;
      d.evap = { t, rate };
      nativeHost.evaporating.push(d);
    }
  }

export function scenePastureAnchor(nativeHost:NativeSceneCampaignFrameClosureHost): Vec2 {
    let x = 0, y = 0, n = 0;
    for (const a of nativeHost.actors) {
      if (a.dead || a.team !== 'enemy') continue;
      if (a.faction !== 'beast' || !a.defId || MONSTERS[a.defId]?.tag !== 'critter') continue;
      x += a.pos.x; y += a.pos.y; n++;
    }
    if (n >= 2) return nativeHost.clampPos(vec(x / n, y / n), 60);
    return nativeHost.clampPos(nativeHost.farPoint(420), 60);
  }

export function scenePlantDrovePen(nativeHost:NativeSceneCampaignFrameClosureHost, penAt: Vec2, cfg: DroveSurge): void {
    if (nativeHost.doodads.some(d => d.eventDress === 'drove' && !d.gone)) return;
    const h = (n: number): number => nativeHost.droveHash(penAt, n);
    const gapDir = nativeHost.droveGapDir(penAt);
    const gapHalf = 0.62; // the torn mouth — wide enough to drive an ox through
    const ringN = 10;
    for (let i = 0; i < ringN; i++) {
      const ang = (i / ringN) * Math.PI * 2;
      const da = Math.abs(Math.atan2(Math.sin(ang - gapDir), Math.cos(ang - gapDir)));
      if (da < gapHalf) continue; // the collapsed side stands open
      const r = cfg.penRingR + (h(10 + i) - 0.5) * 8;
      const p = nativeHost.clampPos(vec(penAt.x + Math.cos(ang) * r, penAt.y + Math.sin(ang) * r), 12);
      nativeHost.doodads.push({ pos: p, radius: 21, kind: 'rail_fence', rot: ang + Math.PI / 2, eventDress: 'drove' });
    }
    // The spill: rails down at the mouth, thrown outward as the fold burst through.
    for (let i = 0; i < 3; i++) {
      const ang = gapDir + (h(30 + i) - 0.5) * 1.1;
      const r = cfg.penRingR + 16 + h(40 + i) * 30;
      const p = nativeHost.clampPos(vec(penAt.x + Math.cos(ang) * r, penAt.y + Math.sin(ang) * r), 12);
      nativeHost.doodads.push({ pos: p, radius: 17, kind: 'rail_fence', rot: h(50 + i) * Math.PI * 2, eventDress: 'drove' });
    }
    const bale = nativeHost.clampPos(vec(
      penAt.x + Math.cos(gapDir + 2.4) * (cfg.penRingR + 30),
      penAt.y + Math.sin(gapDir + 2.4) * (cfg.penRingR + 30)), 12);
    nativeHost.doodads.push({ pos: bale, radius: 13, kind: 'hay_bale', rot: h(60) * Math.PI * 2, eventDress: 'drove' });
    if (h(61) < 0.6) {
      const cart = nativeHost.clampPos(vec(
        penAt.x + Math.cos(gapDir - 2.2) * (cfg.penRingR + 44),
        penAt.y + Math.sin(gapDir - 2.2) * (cfg.penRingR + 44)), 12);
      nativeHost.doodads.push({ pos: cart, radius: 17, kind: 'broken_cart', rot: h(62) * Math.PI * 2, eventDress: 'drove' });
    }
    nativeHost.markDoodadsChanged(); // rail blockers — nav/veil/bake consumers re-derive
  }

export function sceneDroveGapDir(nativeHost:NativeSceneCampaignFrameClosureHost, penAt: Vec2): number {
    return nativeHost.droveHash(penAt, 1) * Math.PI * 2;
  }

export function sceneDroveGathered(nativeHost:NativeSceneCampaignFrameClosureHost, df: NonNullable<WorldSim['droveField']>, id: string, color: string, lvl: number): void {
    const sc = nativeHost.droveScene;
    const info = df.droveOn(nativeHost.zone.id);
    if (sc && info) {
      const cfg = df.surge();
      const at = sc.penAt;
      nativeHost.grantXp(cfg.reward.gatherXpBase + cfg.reward.gatherXpPerLevel * lvl, at); // XP BY PLACE
      if (chance(cfg.reward.gemChance)) nativeHost.dropGemAt(at, undefined, true);
      const pay = (tableId: string): void => {
        for (const res of resolveLootTable(tableId, { ilvl: nativeHost.zone.level })) {
          const p = nativeHost.clampPos(vec(at.x + rand(-26, 26), at.y + rand(-26, 26)), 10);
          nativeHost.mintLootResult(p, res, true);
        }
      };
      pay(cfg.reward.purseTable);
      if (info.lost === 0 && info.penned > 0) {
        pay(cfg.reward.flawlessTable);
        nativeHost.text(vec(at.x, at.y - 44), 'every head alive — the flawless rate', color, 14);
      }
      if (sc.reeve && !sc.reeve.dead) {
        nativeHost.text(vec(sc.reeve.pos.x, sc.reeve.pos.y - 28), 'That’s the lot. Dig in the chest.', color, 13);
      }
      nativeHost.evapDroveDress(45, 8); // the mended pen stands a while, then dries away
      nativeHost.droveDressChecked = nativeHost.zone.id;
    }
    bumpLedger(nativeHost.ledger, 'droves_gathered');
    nativeHost.notice('The fold is gathered — the reeve settles up.', color, 18, 'events');
    df.resolve(id);
    nativeHost.droveScene = null;
  }

export function sceneHauntHeadcount(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    let n = 0;
    for (const a of nativeHost.actors) if (!a.dead && a.team === 'enemy' && a.tag === 'haunt_spawn') n++;
    return n;
  }

export function sceneLongNightWorldChores(nativeHost:NativeSceneCampaignFrameClosureHost, lnf: NonNullable<World['sim']['longNightField']>): void {
    // THE SKY FEED: grounds under a covering BLOOD MOON feed double tonight —
    // engine-side because overlays can't see the weather field (and sheltered
    // ground has no sky to bleed under: skyOf, the one exposure gate).
    if (dayCycle(nativeHost.time).phase === 'night') {
      const under: string[] = [];
      for (const zid of lnf.groundZoneIds()) {
        const z = nativeHost.zoneMap[zid];
        if (!z || skyOf(z) === 'sheltered') continue;
        const f = nativeHost.sim.weather.sample(z);
        if (f && f.kind === 'bloodmoon') under.push(zid);
      }
      if (under.length) lnf.markBloodmoon(under);
    }
    // World-facing beats → toasts + ledgers (conversions announce wherever
    // the player is — a zone quietly turning is the one thing this event
    // must never do silently; the map pulse + warp label carry the rest).
    for (const a of lnf.consumeAnnouncements()) {
      const name = nativeHost.zoneMap[a.zoneId]?.name ?? 'charted ground';
      if (a.kind === 'converted') {
        bumpLedger(nativeHost.ledger, 'long_night_converted');
        nativeHost.notice(`Three nights fed — ${name} belongs to the Court now. Burn its coach by day.`, lnf.surge().color, 17, 'events');
      } else {
        nativeHost.notice(`The COUNTESS takes court at ${name} — the Long Night deepens.`, lnf.surge().color, 18, 'events');
      }
    }
    nativeHost.reconcileLongNightWarps();
  }

export function sceneLongNightHeadcount(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    let n = 0;
    for (const a of nativeHost.actors) if (!a.dead && a.team === 'enemy' && a.tag === 'long_night_spawn') n++;
    return n;
  }

export function sceneUpdateMigrants(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const ARRIVE = 52;
    for (let i = nativeHost.actors.length - 1; i >= 0; i--) {
      const a = nativeHost.actors[i];
      if (a.dead || a.tag !== 'migrant' || a.aiAwakened) continue;
      const goal = a.aiFleeGoal;
      if (!goal) continue;
      a.facing = angleTo(a.pos, goal);
      nativeHost.moveActor(a, goal.x - a.pos.x, goal.y - a.pos.y, dt);
      if (dist(a.pos, goal) < ARRIVE) nativeHost.actors.splice(i, 1); // ambled out of the zone
    }
  }

export function sceneMigrantHeadcount(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    let n = 0;
    for (const a of nativeHost.actors) if (!a.dead && a.tag === 'migrant') n++;
    return n;
  }

export function sceneSpawnMigrant(nativeHost:NativeSceneCampaignFrameClosureHost, info: MigrationInfo, cfg: MigrationSurge): void {
    if (!cfg.roster.length) return;
    const lvl = Math.max(1, nativeHost.zone.level + cfg.levelBonus);
    const id = nativeHost.weightedPick(cfg.roster, lvl);
    if (!MONSTERS[id]) return;
    const m = nativeHost.createMonster(id, lvl, 'enemy');
    m.faction = info.faction;
    m.tag = 'migrant';
    // The herd crossing THIS zone shares one squad (minted lazily, reset per
    // zone) — a roused herd defends itself with herd discipline.
    nativeHost.migrantSquadId ??= nativeHost.nextSquadId();
    m.squadId = nativeHost.migrantSquadId;
    const flow = nativeHost.bandFlow(info.dir);
    m.pos = nativeHost.clampPos(vec(flow.entry.x + rand(-80, 80), flow.entry.y + rand(-80, 80)), m.radius);
    m.aiFleeGoal = vec(flow.dest.x, flow.dest.y);
    nativeHost.actors.push(m);
  }

export function sceneNearestSeatDist(nativeHost:NativeSceneCampaignFrameClosureHost, p: Vec2): number {
    // SOVEREIGNTY: census — a distance read (the derived census, probe_tiers RIG T).
    let best = Infinity;
    for (const s of nativeHost.frameSeats()) {
      if (s.actor.dead || s.actor.downed) continue;
      const d = dist(p, s.actor.pos);
      if (d < best) best = d;
    }
    return best;
  }

export function sceneFireLightning(nativeHost:NativeSceneCampaignFrameClosureHost, strike: WeatherStrike): void {
    const reach = nativeHost.massRuntime?.config.populationRadius ?? 0;
    const at = nativeHost.massRuntime ? vec(nativeHost.player.pos.x + rand(-reach, reach), nativeHost.player.pos.y + rand(-reach, reach))
      : vec(rand(70, nativeHost.arena.w - 70), rand(70, nativeHost.arena.h - 70));
    if (nativeHost.massRuntime?.settlement?.reserves(at.x, at.y, strike.radius)) return;
    if (nativeHost.massRuntime?.weather) {
      const local = nativeHost.skyFront(at), localStrike = local ? WEATHER_DEFS[local.kind].strike : undefined;
      if (!local || !localStrike || local.intensity <= .02) return;
      nativeHost.fireStrikeAt(localStrike, at);
      return;
    }
    nativeHost.fireStrikeAt(strike, at);
  }

export function sceneStrayingRallySeat(nativeHost:NativeSceneCampaignFrameClosureHost, fold: Vec2, rallyDist: number): Vec2 {
    let best: Vec2 | null = null;
    let bd = -1;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const c = nativeHost.clampPos(vec(fold.x + Math.cos(ang) * rallyDist, fold.y + Math.sin(ang) * rallyDist), 60);
      const d = nativeHost.isPresentLocalPlayer() ? Math.min(dist(c, nativeHost.player.pos), dist(c, fold)) : dist(c, fold);
      if (d > bd) { bd = d; best = c; }
    }
    return nativeHost.findFreeSpot(best ?? nativeHost.clampPos(nativeHost.farPoint(rallyDist), 60), 20);
  }

export function sceneStrayingRelief(nativeHost:NativeSceneCampaignFrameClosureHost, sf: NonNullable<WorldSim['strayField']>, id: string, color: string, lvl: number, line: string): void {
    const sc = nativeHost.strayScene;
    if (sc) {
      for (const s of sc.strays) {
        if (s.a.dead) continue;
        s.a.postSpec = { hold: false, slack: 200, pace: 0.8 };
        s.a.aiPost = vec(sc.fold.x, sc.fold.y);
      }
      for (const a of [...sc.callers, ...sc.thralls]) {
        if (!a.dead) nativeHost.slipAway(a, '', color);
      }
      const cfg = sf.surge();
      nativeHost.grantXp(cfg.reward.reliefXpBase + cfg.reward.reliefXpPerLevel * lvl, sc.fold); // XP BY PLACE
      for (let i = 0; i < cfg.reward.reliefGems; i++) nativeHost.dropGemAt(vec(sc.fold.x, sc.fold.y));
    }
    bumpLedger(nativeHost.ledger, 'strayings_relieved');
    nativeHost.notice(line, color, 18, 'events');
    sf.resolve(id);
    nativeHost.strayScene = null;
  }

export function sceneSwarmHeadcount(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    let n = 0;
    for (const a of nativeHost.actors) {
      if (!a.dead && (a.tag === 'swarm_flier' || a.tag === 'swarm_alate')) n++;
    }
    return n;
  }

export function sceneSpawnSwarmFlier(nativeHost:NativeSceneCampaignFrameClosureHost, info: SwarmInfo, cfg: SwarmingSurge): void {
    if (!cfg.flightRoster.length) return;
    const lvl = Math.max(1, nativeHost.zone.level + cfg.levelBonus);
    const id = nativeHost.weightedPick(cfg.flightRoster, lvl);
    if (!MONSTERS[id]) return;
    const m = nativeHost.createMonster(id, lvl, 'enemy');
    m.faction = info.faction;
    m.tag = id === cfg.alateId ? 'swarm_alate' : 'swarm_flier';
    const flow = nativeHost.bandFlow(info.dir);
    m.pos = nativeHost.clampPos(vec(flow.entry.x + rand(-70, 70), flow.entry.y + rand(-70, 70)), m.radius);
    nativeHost.actors.push(m);
  }

export function sceneMintWispBody(nativeHost:NativeSceneCampaignFrameClosureHost, defId: string, minDist: number): Actor | null {
    if (!MONSTERS[defId]) return null;
    const m = nativeHost.createMonster(defId, Math.max(1, nativeHost.zone.level), 'enemy');
    m.untargetable = true;
    m.invulnerable = true;
    let at: Vec2 | null = null;
    for (let i = 0; i < 24 && !at; i++) {
      const c = nativeHost.clampPos(vec(rand(60, nativeHost.arena.w - 60), rand(60, nativeHost.arena.h - 60)), 40);
      if (!nativeHost.isPresentLocalPlayer() || dist(c, nativeHost.player.pos) >= minDist) at = c;
    }
    m.pos = nativeHost.findFreeSpot(at ?? nativeHost.clampPos(nativeHost.farPoint(minDist + 120), 40), 10);
    nativeHost.actors.push(m);
    return m;
  }

export function sceneKindleWisp(nativeHost:NativeSceneCampaignFrameClosureHost, w: WispSceneWisp, cfg: WisplightSurge, announce: boolean): void {
    w.state = 'kindled';
    w.route = nativeHost.wispRoute(w.a.pos, cfg);
    w.routeAt = 0;
    w.wanderLeft = rand(cfg.wanderSec[0], cfg.wanderSec[1]);
    if (announce) {
      bumpLedger(nativeHost.ledger, 'wisplights_kindled');
      nativeHost.grantXp(cfg.reward.kindleXp, w.a.pos); // XP BY PLACE
      nativeHost.flashes.push({ pos: vec(w.a.pos.x, w.a.pos.y), radius: 70, color: cfg.color ?? '#b8f0a0', life: 0.6, maxLife: 0.6 });
      nativeHost.text(vec(w.a.pos.x, w.a.pos.y - 22), 'the light wakes — the mire stirs around it', cfg.color ?? '#b8f0a0', 14);
    }
  }

export function sceneApplyWispRide(nativeHost:NativeSceneCampaignFrameClosureHost, host: Actor, kind: WispKindRow, cfg: WisplightSurge): void {
    host.applyStatus(kind.rideStatus, 0, 1, 'The Wisplight');
    const mods: Modifier[] = [];
    if (kind.grant?.es) mods.push(mod('energyShield', 'flat', kind.grant.es[0] + kind.grant.es[1] * host.level));
    if (kind.grant?.armor) mods.push(mod('armor', 'flat', kind.grant.armor[0] + kind.grant.armor[1] * host.level));
    if (mods.length) host.sheet.setSource('wisp_ride', mods);
    const gl = Math.max(1, 1 + Math.floor((host.level - 1) / Math.max(1, cfg.grantSkillLevelDiv)));
    for (const gid of kind.grantSkills ?? []) {
      if (SKILLS[gid] && !host.skills.some(s => s?.def.id === gid)) {
        host.skills.push(makeSkillInstance(SKILLS[gid], gl));
      }
    }
    if (!host.name.startsWith(kind.epithet)) host.name = `${kind.epithet} ${host.name}`;
    // The gift arrives whole: life topped, the new shield already up.
    host.life = host.maxLife();
    host.es = Math.max(host.es, host.sheet.get('energyShield'));
    host.aiAwakened = true;
  }

export function sceneWispRideLands(nativeHost:NativeSceneCampaignFrameClosureHost, sc: WispScene, w: WispSceneWisp, host: Actor, cfg: WisplightSurge): void {
    const kind = cfg.kinds.find(k => k.id === w.kind);
    const wf = nativeHost.sim.wisplightField;
    if (!kind || !wf) return;
    const at = vec(host.pos.x, host.pos.y);
    const idx = nativeHost.actors.indexOf(w.a);
    if (idx >= 0) nativeHost.actors.splice(idx, 1);
    nativeHost.applyWispRide(host, kind, cfg);
    wf.noteRidden(sc.id, w.slot, host.defId ?? '');
    bumpLedger(nativeHost.ledger, 'wisplights_ridden');
    sc.hosts.push({ slot: w.slot, a: host });
    nativeHost.flashes.push({ pos: at, radius: host.radius + 30, color: cfg.color ?? '#b8f0a0', life: 0.6, maxLife: 0.6 });
    nativeHost.text(vec(at.x, at.y - host.radius - 14), kind.line, cfg.color ?? '#b8f0a0', 15);
  }

export function sceneWispSeekTarget(nativeHost:NativeSceneCampaignFrameClosureHost, body: Actor, cfg: WisplightSurge): Actor | null {
    // SOVEREIGNTY: targeting — the wisp's own hunt (the derived census, probe_tiers RIG T).
    let best: Actor | null = null;
    let bestScore = 0;
    for (const a of nativeHost.actors) {
      if (a.dead || a.team !== 'enemy' || a.untargetable || a === body) continue;
      const def = a.defId ? MONSTERS[a.defId] : undefined;
      // The lights never ride each other — a light's body is consumed, not worn.
      if (def && cfg.kinds.some(k => k.monster === def.id)) continue;
      const dtags = def ? [def.tag, ...(def.tags ?? [])].filter((t): t is string => !!t) : [];
      if (dtags.some(t => cfg.seek.denyTags.includes(t))) continue;
      const rw = cfg.seek.rarity[a.rarity ?? 'normal'] ?? 1;
      if (rw <= 0) continue;
      if (dist(a.pos, body.pos) > cfg.seekRadius) continue;
      if (riderRefusal(a) !== null) continue;
      const touched = a.statuses.some(s => s.id === cfg.aura.status);
      const score = rw * (1 + cfg.seek.levelWeight * a.level) * (touched ? cfg.seek.emboldenedMul : 1);
      if (score > bestScore) { bestScore = score; best = a; }
    }
    return best;
  }

export function sceneMintWorldBossZone(nativeHost:NativeSceneCampaignFrameClosureHost, f: WorldBossField, req: WorldBossMint): void {
    const anchor = nativeHost.zoneMap[req.anchorZoneId];
    if (!anchor) return;
    const id = `wb_${req.kind}_${req.instanceId}`;
    if (nativeHost.zoneMap[id]) { f.bindMint(req.instanceId, id); return; }
    // A free flank: one node-step off the anchor, preferring an empty side
    // (placeZoneAt's anti-crowd nudge handles the rest).
    let target = projectCoord(anchor.map, 's');
    for (const side of ['e', 'w', 's', 'n'] as const) {
      const c = projectCoord(anchor.map, side);
      if (!Object.values(nativeHost.zoneMap).some(z => coordDist(z.map, c) < 60)) { target = c; break; }
    }
    const gen = placeZoneAt(target, anchor, nativeHost.zoneMap, nativeHost.nextGenId++, {
      id,
      name: req.zoneName,
      level: Math.max(1, anchor.level + (req.def.levelBonus ?? 0)),
      special: true,          // fixed arena theme + eventOwned (the overlay claims it in ownedZones)
      linkBack: true,         // a real road from the anchor — findable, walkable
      objective: { kind: 'clear' }, // slaying the sovereign IS clearing the ground
      seed: (nativeHost.manifest.seed ^ hashStr(id)) >>> 0,
      ...(anchor.dimension ? { dimension: anchor.dimension } : {}),
      // A colossus guarantees itself room to sweep (WorldBossDef.arenaBand →
      // the pocket-form sizeBand seam; absent = the anchor's own bands).
      ...(req.def.arenaBand ? { sizeBand: req.def.arenaBand } : {}),
    });
    nativeHost.zoneMap[id] = gen;
    nativeHost.sim.onNodeCharted(gen, nativeHost.simView());
    f.bindMint(req.instanceId, id);
  }

export function sceneUpdateWorldBossWalls(nativeHost:NativeSceneCampaignFrameClosureHost, f: WorldBossField): void {
    // SOVEREIGNTY: seat — walls seated clear of bodies (the derived census, probe_tiers RIG T).
    const walls = f.wallsFor(nativeHost.zone.id);
    const live = new Set<string>();
    const wcfg = f.surge().roamer.wall;
    for (const w of walls) {
      live.add(w.toZoneId);
      const e = nativeHost.exits.find(x => x.to === w.toZoneId);
      if (!e) continue;
      let placed = nativeHost.wbWalls.get(w.toZoneId);
      if (!placed) {
        placed = [];
        nativeHost.wbWalls.set(w.toZoneId, placed);
        if (!nativeHost.materializedWorldBoss.has(`wall:${w.serpentId}`)) {
          nativeHost.materializedWorldBoss.add(`wall:${w.serpentId}`);
          bumpLedger(nativeHost.ledger, 'worldboss_seen');
          nativeHost.text(vec(e.pos.x, e.pos.y - 46), 'the coils close on this pass!', w.color, 14);
        }
      }
      const want = Math.min(wcfg.count, Math.round(clamp(w.sealFrac, 0, 1) * wcfg.count));
      if (placed.length >= want) continue;
      const spots = nativeHost.wyrmWallSpots(e, wcfg.count, wcfg.dist);
      for (let i = placed.length; i < want && i < spots.length; i++) {
        const p = spots[i];
        // Never entomb a hero: a segment that would land on a player-team body
        // waits for them to move (it fills in on a later frame).
        if (nativeHost.actors.some(a => !a.dead && a.team === 'player'
          && dist(a.pos, p) < wcfg.radius + a.radius + 10)) break;
        const d: Doodad = { pos: vec(p.x, p.y), radius: wcfg.radius, kind: w.wallKind, rot: (i * 2.39996) % (Math.PI * 2) };
        nativeHost.doodads.push(d);
        placed.push(d);
        nativeHost.flashes.push({ pos: vec(p.x, p.y), radius: 42, color: w.color, life: 0.35, maxLife: 0.35 });
      }
    }
    // The serpent died (or its blockade healed): its plugs crumble where we stand.
    for (const [key, list] of [...nativeHost.wbWalls]) {
      if (live.has(key)) continue;
      for (const d of list) {
        d.gone = true;
        const i = nativeHost.doodads.indexOf(d);
        if (i >= 0) nativeHost.doodads.splice(i, 1);
        nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: 44, color: '#8a7a5c', life: 0.5, maxLife: 0.5 });
      }
      nativeHost.wbWalls.delete(key);
      if (list.length) {
        nativeHost.notice('the coils crumble — the pass is open!', '#c8a03c', 15, 'events');
      }
    }
  }

export function sceneUpdateWorldBossPassing(nativeHost:NativeSceneCampaignFrameClosureHost, f: WorldBossField, dt: number): void {
    const pass = f.passingIn(nativeHost.zone.id);
    const key = pass ? `${pass.serpentId}:${pass.toZoneId}` : '';
    if (pass && pass.def.roam && !nativeHost.wbPassing && nativeHost.wbPassingKey !== key) {
      const doorOut = nativeHost.exits.find(x => x.to === pass.toZoneId);
      if (doorOut) {
        const doorIn = pass.fromZoneId ? nativeHost.exits.find(x => x.to === pass.fromZoneId) : null;
        const start = doorIn ? vec(doorIn.pos.x, doorIn.pos.y)
          : nativeHost.clampPos(vec(nativeHost.arena.w / 2, nativeHost.arena.h / 2), 60);
        const m = nativeHost.createMonster(pass.def.roam.passingMonster, nativeHost.zone.level, 'enemy');
        m.pos = nativeHost.clampPos(vec(start.x, start.y), m.radius);
        m.tag = 'wb_passing';
        nativeHost.actors.push(m);
        nativeHost.wbPassing = m;
        nativeHost.wbPassingKey = key;
        nativeHost.wbPassingGoal = vec(doorOut.pos.x, doorOut.pos.y);
        if (!nativeHost.materializedWorldBoss.has(`pass:${pass.serpentId}`)) {
          nativeHost.materializedWorldBoss.add(`pass:${pass.serpentId}`);
          bumpLedger(nativeHost.ledger, 'worldboss_seen');
        }
        nativeHost.text(vec(m.pos.x, m.pos.y - 60),
          `${pass.def.name} passes through — slip by before the coils seal!`, pass.def.color, 15);
      }
    }
    if (nativeHost.wbPassing) {
      const m = nativeHost.wbPassing;
      const goal = nativeHost.wbPassingGoal;
      if (m.dead || !goal) {
        nativeHost.wbPassing = null; nativeHost.wbPassingGoal = null;
      } else if (dist(m.pos, goal) < 46 || !f.passingIn(nativeHost.zone.id)) {
        nativeHost.slipAway(m, 'the earth swallows it whole');
        nativeHost.wbPassing = null; nativeHost.wbPassingGoal = null;
      } else {
        nativeHost.moveActor(m, goal.x - m.pos.x, goal.y - m.pos.y, dt);
      }
    }
  }

export function sceneBandFlow(nativeHost:NativeSceneCampaignFrameClosureHost, dir: { x: number; y: number }): { entry: Vec2; dest: Vec2 } {
    const cx = nativeHost.arena.w / 2, cy = nativeHost.arena.h / 2;
    let dx = dir.x, dy = dir.y;
    if (Math.hypot(dx, dy) < 1e-3) { dx = 0; dy = 1; }
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const pickExit = (sx: number, sy: number): Vec2 => {
      let best: ZoneExit | null = null, bestDot = -Infinity;
      for (const e of nativeHost.exits) {
        const ex = e.pos.x - cx, ey = e.pos.y - cy;
        const el = Math.hypot(ex, ey) || 1;
        const dot = (ex / el) * sx + (ey / el) * sy;
        if (dot > bestDot) { bestDot = dot; best = e; }
      }
      if (best) {
        let ix = cx - best.pos.x, iy = cy - best.pos.y;
        const il = Math.hypot(ix, iy) || 1;
        return nativeHost.clampPos(vec(best.pos.x + (ix / il) * 60, best.pos.y + (iy / il) * 60), 16);
      }
      const reach = Math.min(nativeHost.arena.w, nativeHost.arena.h) / 2 - 70;
      return nativeHost.clampPos(vec(cx + sx * reach, cy + sy * reach), 16);
    };
    const entry = pickExit(-dx, -dy);
    const dest = pickExit(dx, dy);
    // SINGLE / clustered-exit zone: both picks can collapse onto the SAME avenue, so a
    // migrant would spawn on its own goal and despawn instantly (a flickering churn).
    // Fall back to a straight corridor across the arena along the flow direction.
    if (dist(entry, dest) >= 140) return { entry, dest };
    const reach = Math.min(nativeHost.arena.w, nativeHost.arena.h) / 2 - 70;
    return {
      entry: nativeHost.clampPos(vec(cx - dx * reach, cy - dy * reach), 16),
      dest: nativeHost.clampPos(vec(cx + dx * reach, cy + dy * reach), 16),
    };
  }

export function sceneBrigandWanderPoint(nativeHost:NativeSceneCampaignFrameClosureHost): Vec2 {
    return nativeHost.clampPos(vec(rand(80, nativeHost.arena.w - 80), rand(80, nativeHost.arena.h - 80)), 16);
  }

export function sceneDeadwakeEntryPoint(nativeHost:NativeSceneCampaignFrameClosureHost, info: DeadwakeInfo): Vec2 {
    const cx = nativeHost.arena.w / 2, cy = nativeHost.arena.h / 2;
    // Node-space direction the tide comes FROM (its coord relative to this zone's
    // node) maps directly onto world/screen orientation (MAP_DIR: N=-y, E=+x).
    let dx = info.coord.x - nativeHost.zone.map.x, dy = info.coord.y - nativeHost.zone.map.y;
    if (Math.hypot(dx, dy) < 1) { dx = 0; dy = -1; } // dead-on → default to the north
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    let best: ZoneExit | null = null, bestDot = -Infinity;
    for (const e of nativeHost.exits) {
      const ex = e.pos.x - cx, ey = e.pos.y - cy;
      const el = Math.hypot(ex, ey) || 1;
      const dot = (ex / el) * dx + (ey / el) * dy;
      if (dot > bestDot) { bestDot = dot; best = e; }
    }
    let at: Vec2;
    if (best) {
      // A touch INWARD from the rim exit — toward the centre (the avenue's inward
      // normal), so even a non-aligned fallback exit forms the column just inside it.
      let ix = cx - best.pos.x, iy = cy - best.pos.y;
      const il = Math.hypot(ix, iy) || 1;
      at = nativeHost.clampPos(vec(best.pos.x + (ix / il) * 60, best.pos.y + (iy / il) * 60), 16);
    } else {
      const reach = Math.min(nativeHost.arena.w, nativeHost.arena.h) / 2 - 70;
      at = nativeHost.clampPos(vec(cx + dx * reach, cy + dy * reach), 16);
    }
    // Never materialize ON a player camping the entry exit — shove the column inward
    // (away from them) so the host MARCHES in, not a point-blank Crowned ambush
    // (mirrors spawnWarband's STANDOFF; covers both the streamers and the leader).
    const STANDOFF = 200;
    if (nativeHost.isPresentLocalPlayer() && dist(at, nativeHost.player.pos) < STANDOFF) {
      let px = at.x - nativeHost.player.pos.x, py = at.y - nativeHost.player.pos.y;
      if (Math.hypot(px, py) < 1) { px = cx - at.x; py = cy - at.y; }
      const pl = Math.hypot(px, py) || 1;
      at = nativeHost.clampPos(vec(at.x + (px / pl) * STANDOFF, at.y + (py / pl) * STANDOFF), 16);
    }
    return at;
  }

export function sceneOnMeteorImpact(nativeHost:NativeSceneCampaignFrameClosureHost, info: InvasionInfo, at: Vec2): void {
    if (!chance(info.meteorSpawnChance)) return;
    // The strike's RESOLVED faction (an attributed strike fields its lord's
    // host; legacy strikes keep the Legion) — one truth, resolved on the info.
    const facId = info.faction;
    const roster = FACTIONS[facId];
    if (!roster?.table?.length) return;
    const surge = nativeHost.sim.demonFieldFor(nativeHost.zone.dimension)?.surge();
    const champId = surge?.portal?.champion?.monsterId;
    const pool = roster.table.filter(e => e.id !== champId); // craters spit lessers, not the Balor
    const meteorLvl = Math.max(1, nativeHost.zone.level + info.strengthBonus);
    const m = nativeHost.createMonster(nativeHost.weightedPick(pool.length ? pool : roster.table, meteorLvl),
      meteorLvl, 'enemy');
    m.faction = facId;
    m.pos = nativeHost.clampPos(vec(at.x, at.y), m.radius);
    if (surge && nativeHost.demonHeadcount(facId) >= surge.meteorHeadcountCap && m.defId) {
      // Zone already swarming → the crater leaves a raisable corpse instead of
      // another live demon (caps density; feeds necromancers — corpse compounding).
      let nativeQueue:typeof nativeHost.corpses;let nativeRecord:(typeof nativeHost.corpses)[number];
      (nativeQueue=observeNativeCombatStorage(nativeHost,'corpses',nativeHost.corpses)).push(nativeRecord={ pos: vec(at.x, at.y), defId: m.defId, level: m.level, maxLife: m.maxLife(), remaining: CORPSE_CFG.duration });
      observeNativeCombatRecord(nativeHost,'corpses',nativeQueue,nativeRecord,undefined,undefined);
      if (nativeHost.corpses.length > CORPSE_CFG.max) nativeHost.corpses.shift();
    } else {
      nativeHost.actors.push(m);
      observeNativeCombatBirth(nativeHost,m);
    }
  }

export function sceneDroveHash(nativeHost:NativeSceneCampaignFrameClosureHost, penAt: Vec2, n: number): number {
    const s = Math.sin(n * 127.1 + penAt.x * 0.173 + penAt.y * 0.291) * 43758.5453;
    return s - Math.floor(s);
  }

export function sceneReconcileLongNightWarps(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const lnf = nativeHost.sim.longNightField;
    if (!lnf) return;
    const bf = nativeHost.sim.biomeField;
    const cfg = lnf.surge();
    const want = new Set<string>(lnf.convertedZones());
    for (const zid of want) {
      if (nativeHost.longNightWarped.has(zid)) continue;
      const z = nativeHost.zoneMap[zid];
      if (!z) continue;
      bf.setWarp(`long_night:${zid}`, {
        id: `long_night:${zid}`, center: { x: z.map.x, y: z.map.y },
        radius: cfg.warp.radius, biome: cfg.warp.biome, strength: cfg.warp.strength,
        label: 'The Long Night — a feeding ground of the Court',
      });
      nativeHost.longNightWarped.add(zid);
    }
    for (const zid of [...nativeHost.longNightWarped]) {
      if (want.has(zid)) continue;
      bf.unwarp(`long_night:${zid}`);
      nativeHost.longNightWarped.delete(zid);
    }
  }

export function sceneWispRoute(nativeHost:NativeSceneCampaignFrameClosureHost, from: Vec2, cfg: WisplightSurge): Vec2[] {
    const pts: Vec2[] = [];
    let heading = rand(0, Math.PI * 2);
    let cur = vec(from.x, from.y);
    const n = randInt(cfg.route.points[0], cfg.route.points[1]);
    for (let i = 0; i < n; i++) {
      heading += rand(-1, 1) * (cfg.route.jitterDeg * Math.PI / 180);
      const seg = rand(cfg.route.segLen[0], cfg.route.segLen[1]);
      // edgeMargin keeps the way off the arena's border band — a rim
      // waypoint is an unreachable waypoint (the stall insurance would
      // skip it, but a route that never flirts with the rim reads better).
      cur = nativeHost.findFreeSpot(
        nativeHost.clampPos(vec(cur.x + Math.cos(heading) * seg, cur.y + Math.sin(heading) * seg), cfg.route.edgeMargin), 10);
      pts.push(vec(cur.x, cur.y));
    }
    return pts;
  }

export function sceneWyrmWallSpots(nativeHost:NativeSceneCampaignFrameClosureHost, e: ZoneExit, count: number, reach: number): Vec2[] {
    const inward = Math.atan2(nativeHost.arena.h / 2 - e.pos.y, nativeHost.arena.w / 2 - e.pos.x);
    const spread = Math.PI * 0.85;
    const arc: Vec2[] = [];
    for (let k = 0; k < count; k++) {
      const t = count === 1 ? 0.5 : k / (count - 1);
      const ang = inward + (t - 0.5) * spread;
      arc.push(nativeHost.clampPos(vec(e.pos.x + Math.cos(ang) * reach, e.pos.y + Math.sin(ang) * reach), 20));
    }
    const order: Vec2[] = [];
    let lo = 0, hi = count - 1;
    while (lo <= hi) {
      order.push(arc[lo]);
      if (hi !== lo) order.push(arc[hi]);
      lo++; hi--;
    }
    return order;
  }

export function sceneDemonHeadcount(nativeHost:NativeSceneCampaignFrameClosureHost, faction = 'demon'): number {
    let n = 0;
    for (const a of nativeHost.actors) if (!a.dead && a.team === 'enemy' && a.faction === faction) n++;
    return n;
  }

