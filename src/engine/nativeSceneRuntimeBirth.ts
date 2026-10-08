/** Complete native event births shared by classic World and local areas. Sources retain their installed identities. */
import type {World} from './world';
import type {ZoneDef} from '../data/zones';
import type {Actor,MonsterPartDef} from './actor';
import type {InvasionHost} from '../world/invasion';
import type {Vec2} from '../core/math';
import type {Doodad,DoodadKind} from './levelgen';
import type {Modifier} from './stats';
import type {InvasionInfo} from '../packages/overlays/demonInvasion';
import type {CrusadeInfo} from '../packages/overlays/crusade';
import type {StrainDef} from '../packages/contagionStrains';
import type {FogField} from './fog';
type FractureRun=NonNullable<World['fractureRun']>;
export interface NativeSceneRuntimeBirthSources {
 readonly bumpLedger:typeof import('../packages/ledger').bumpLedger;
 readonly vec:typeof import('../core/math').vec;
 readonly MONSTERS:typeof import('../data/monsters').MONSTERS;
 readonly clamp:typeof import('../core/math').clamp;
 readonly FACTIONS:typeof import('../data/monsters').FACTIONS;
 readonly dist:typeof import('../core/math').dist;
 readonly randInt:typeof import('../core/math').randInt;
 readonly rollRarity:typeof import('./rarity').rollRarity;
 readonly rand:typeof import('../core/math').rand;
 readonly Rng:typeof import('../core/rng').Rng;
 readonly packageSeed:typeof import('../packages/registry').packageSeed;
 readonly hashStr:(s: string) => number;
 readonly gateThroatAt:typeof import('./layoutRecipes').gateThroatAt;
 readonly boundaryGateOf:typeof import('../data/boundaryGates').boundaryGateOf;
 readonly blocksMovement:typeof import('./levelgen').blocksMovement;
 readonly AMALGAM_GRAVE_RING:104;
 readonly SKILLS:typeof import('../data/skills').SKILLS;
 readonly makeSkillInstance:typeof import('./skills').makeSkillInstance;
 readonly SUPPORTS:typeof import('../data/supports').SUPPORTS;
 readonly lordDef:typeof import('../packages/lords').lordDef;
 readonly strainOf:typeof import('../packages/contagionStrains').strainOf;
 readonly STATUS_DEFS:typeof import('./status').STATUS_DEFS;
 readonly WATCH_CFG:typeof import('./watch').WATCH_CFG;
 readonly CONTAGION_GRAFT_KEY:"contagion";
 readonly liquidOf:typeof import('./genkit').liquidOf;
 readonly DEEPWINTER_FROZEN_LIQUID:"ice";
 readonly DEEPWINTER_THAWED_LIQUIDS:string[];
 readonly FOG_BANKS:typeof import('./fog').FOG_BANKS;
 readonly FIXTURE_IDS:typeof import('../data/monsters').FIXTURE_IDS;
 readonly skyOf:typeof import('../data/zones').skyOf;
 readonly STARFALL_CFG:{ faction: string; heartDefId: "fallen_star"; heartChance: number; packCount: [number, number]; packSize: [number, number]; color: string; };
 readonly chance:typeof import('../core/math').chance;
 readonly clearPartScar:typeof import('./anatomyCues').clearPartScar;
 readonly FogField:typeof import('./fog').FogField;
 readonly FOG_CFG:typeof import('./fog').FOG_CFG;
}
export interface NativeSceneRuntimeBirthHost {
 sim:World['sim'];
 inCave:World['inCave'];
 player:World['player'];
 clampPos:World['clampPos'];
 arena:World['arena'];
 zoneEntry:World['zoneEntry'];
 clearTransitSpot:World['clearTransitSpot'];
 ventGeyser:World['ventGeyser'];
 ledger:World['ledger'];
 materializedHosts:World['materializedHosts'];
 zone:World['zone'];
 warbandEntryPoint:World['warbandEntryPoint'];
 createMonster:World['createMonster'];
 weightedPick:World['weightedPick'];
 promoteRarity:World['promoteRarity'];
 actors:World['actors'];
 warbandDestination:World['warbandDestination'];
 warbandMarches:World['warbandMarches'];
 flashes:World['flashes'];
 text:World['text'];
 compassFrom:World['compassFrom'];
 materializedEpicenters:World['materializedEpicenters'];
 farPoint:World['farPoint'];
 notice:World['notice'];
 materializedCrusades:World['materializedCrusades'];
 crusadeWorksAt:World['crusadeWorksAt'];
 materializedHellWar:World['materializedHellWar'];
 materializedWorldBoss:World['materializedWorldBoss'];
 wbBoss:World['wbBoss'];
 doodads:World['doodads'];
 wbBossKey:World['wbBossKey'];
 materializedContagion:World['materializedContagion'];
 infectActorWith:World['infectActorWith'];
 spawnPatientZero:World['spawnPatientZero'];
 freezeStandingWater:World['freezeStandingWater'];
 snowCover:World['snowCover'];
 snowFloor:World['snowFloor'];
 fogEnsure:World['fogEnsure'];
 materializedDeepwinter:World['materializedDeepwinter'];
 tracks:World['tracks'];
 materializedInfestation:World['materializedInfestation'];
 materializedBroods:World['materializedBroods'];
 materializedSwarmWake:World['materializedSwarmWake'];
 materializedCandle:World['materializedCandle'];
 materializedStarfall:World['materializedStarfall'];
 materializedMycelia:World['materializedMycelia'];
 exits:World['exits'];
 materializedHoldfasts:World['materializedHoldfasts'];
 holdfastSite:World['holdfastSite'];
 materializedUnsealing:World['materializedUnsealing'];
 findUnsealingSpot:World['findUnsealingSpot'];
 unsealingSite:World['unsealingSite'];
 markDoodadsChanged:World['markDoodadsChanged'];
 spawnHuntBeast:World['spawnHuntBeast'];
 huntFootprint:World['huntFootprint'];
 materializedFractures:World['materializedFractures'];
 fractureRng:World['fractureRng'];
 manifest:World['manifest'];
 walk:World['walk'];
 fractureRun:World['fractureRun'];
 beginFissure:World['beginFissure'];
 bearingOf:World['bearingOf'];
 fractureRifts:World['fractureRifts'];
 materializedRituals:World['materializedRituals'];
 ritualSite:World['ritualSite'];
 materializedAmalgam:World['materializedAmalgam'];
 amalgamSite:World['amalgamSite'];
 riseAmalgamation:World['riseAmalgamation'];
 materializedAmalgamMobs:World['materializedAmalgamMobs'];
 materializedObservers:World['materializedObservers'];
 materializedWrits:World['materializedWrits'];
 spawnEventActor:World['spawnEventActor'];
 clampNear:World['clampNear'];
 hasNpcRole:World['hasNpcRole'];
 grounds:World['grounds'];
 caveEntrances:World['caveEntrances'];
 zoneMap:World['zoneMap'];
 contagionLeans:World['contagionLeans'];
 graftPart:World['graftPart'];
 dwIceArr:World['dwIceArr'];
 dwIceLen:World['dwIceLen'];
 dwIceRev:World['dwIceRev'];
 doodadsRev:World['doodadsRev'];
 fog:World['fog'];
 currentZoneSeed:World['currentZoneSeed'];
 materializedHunts:World['materializedHunts'];
 huntBeast:World['huntBeast'];
 fracturePoint:World['fracturePoint'];
 actorById:World['actorById'];
}
export function birthSpringVendettaAmbush(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const vf = nativeHost.sim.vendettaField;
    if (!vf) return;
    // One-shot discovery: the first writ POSTED this run (bulletin already
    // announced it) surfaces the Vault card.
    if (vf.consumeSeen()) (0,sources.bumpLedger)(nativeHost.ledger, 'writs_seen');
    if (nativeHost.materializedWrits.has(def.id)) return;
    const spec = vf.wantsAmbush(def);
    if (!spec) return;
    nativeHost.materializedWrits.add(def.id);
    const level = Math.max(1, def.level + spec.levelBonus);
    const at = nativeHost.clampPos(nativeHost.farPoint(430, true), 24);
    let warrant: Actor | null = null;
    for (let i = 0; i < spec.size; i++) {
      const h = nativeHost.spawnEventActor(spec.roster, level, 'enemy', spec.faction, 'vendetta_hunter');
      h.pos = nativeHost.clampNear(at, 70);
      h.eventKey = spec.writId;
      h.aiAwakened = true; // hunters arrive HUNTING — no dormancy gate
      if (!warrant || h.maxLife() > warrant.maxLife()) warrant = h;
    }
    if (warrant) {
      warrant.tag = 'vendetta_warrant';
      warrant.level = Math.max(warrant.level, level + spec.warrant.levelBonus);
      nativeHost.promoteRarity(warrant, spec.warrant.promote);
      warrant.xpValue = Math.max(warrant.xpValue, spec.warrant.xpFloor);
    }
    nativeHost.notice(`${spec.tierLabel} — hunters spring the ambush!`, spec.color, 16, 'events');
  }
export function birthPlaceHuntContent(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const hf = nativeHost.sim.huntField;
    if (!hf) return;
    const info = hf.beastIn(def.id);
    if (info) { nativeHost.spawnHuntBeast(info); return; }
    // The trail leads here and no live track is placed yet — drop one. Guarding on the
    // live object (not a persistent per-zone set) means a player who enters, leaves
    // WITHOUT reading it, and returns finds the track again (no soft-lock); it also
    // makes the per-frame materialize call idempotent within a visit.
    if (!nativeHost.huntFootprint && hf.wantsTrack(def.id)) {
      const at = nativeHost.clampPos(nativeHost.farPoint(420), 18);
      nativeHost.huntFootprint = { pos: (0,sources.vec)(at.x, at.y) };
    }
  }
export function birthSpawnHuntBeast(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, info: { id: string; beastDefId: string; faction: string; color: string; lifeFrac: number; phaseIdx: number }): void {
    if (nativeHost.materializedHunts.has(info.id)) return;
    nativeHost.materializedHunts.add(info.id);
    if (!sources.MONSTERS[info.beastDefId]) return;
    const lvl = Math.max(1, nativeHost.zone.level + 2);
    const beast = nativeHost.createMonster(info.beastDefId, lvl, 'enemy');
    beast.faction = info.faction;
    if (nativeHost.sim.packageActive('warbands', nativeHost.player.level)) nativeHost.promoteRarity(beast, 'crowned');
    beast.tag = 'hunt_beast';
    beast.aiPhaseIdx = info.phaseIdx;   // flee phases already passed → won't re-flee
    beast.aiFleeing = false;
    beast.pos = nativeHost.clampPos(nativeHost.farPoint(540, true), beast.radius);
    beast.fillResources();
    beast.life = Math.max(1, beast.maxLife() * (0,sources.clamp)(info.lifeFrac, 0.02, 1)); // PRESERVED health
    nativeHost.actors.push(beast);
    nativeHost.huntBeast = beast;
    (0,sources.bumpLedger)(nativeHost.ledger, 'hunt_seen');
    nativeHost.flashes.push({ pos: (0,sources.vec)(beast.pos.x, beast.pos.y), radius: 150, color: info.color, life: 0.8, maxLife: 0.8 });
    nativeHost.text((0,sources.vec)(beast.pos.x, beast.pos.y - 60),
      `${beast.name} — the hunt is on!`, info.color, 18);
  }
export function birthSpawnWarband(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, host: InvasionHost): void {
    if (nativeHost.materializedHosts.has(host)) return;
    nativeHost.materializedHosts.add(host);
    if (nativeHost.sim.faction.conquerorOf(nativeHost.zone.id) === host.faction) return; // already theirs
    const roster = sources.FACTIONS[host.faction];
    if (!roster?.table?.length) return;
    let at = nativeHost.warbandEntryPoint(host);
    // Don't materialize ON the player: when they walked in by the same exit the
    // host marched from, the entry == their arrival portal. Shove the cluster
    // inward (away from the player) so there's a reaction window — a march in,
    // not a point-blank ambush. (Mirrors spawnPacks' "found, not delivered".)
    const STANDOFF = 220;
    if ((0,sources.dist)(at, nativeHost.player.pos) < STANDOFF) {
      let dx = at.x - nativeHost.player.pos.x, dy = at.y - nativeHost.player.pos.y;
      if (Math.hypot(dx, dy) < 1) { dx = nativeHost.arena.w / 2 - at.x; dy = nativeHost.arena.h / 2 - at.y; }
      const len = Math.hypot(dx, dy) || 1;
      at = nativeHost.clampPos((0,sources.vec)(at.x + (dx / len) * STANDOFF, at.y + (dy / len) * STANDOFF), 16);
    }
    const lvl = Math.max(1, nativeHost.zone.level);
    // Gate the Crowned leader on the package governing THIS host's faction
    // (demon hosts → demon_invasion, mortal/beast → warbands), not a hardcoded id.
    const crowned = nativeHost.sim.factionInvasionActive(host.faction, nativeHost.player.level);
    const n = (0,sources.randInt)(6, 9);
    const pack: Actor[] = [];
    let leader: Actor | null = null;
    for (let k = 0; k < n; k++) {
      const m = nativeHost.createMonster(nativeHost.weightedPick(roster.table, lvl), lvl, 'enemy');
      // Invasion hosts have a leader/retinue; magicPack rolls belong to ambient cohorts.
      if (k === 0) { const r = (0,sources.rollRarity)(crowned, false); if (r !== 'normal') nativeHost.promoteRarity(m, r, { distinctName: true }); leader = m; }
      m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-70, 70), at.y + (0,sources.rand)(-70, 70)), m.radius);
      nativeHost.actors.push(m);
      pack.push(m);
    }
    // Give the warband a TASK: the champion marches the pack toward a destination
    // exit (continuing the faction's campaign across the zone), the rest heel to
    // it. With no foe in sight they migrate; sight the player and they fall through
    // to their brain and fight. Reuses the patrol-route AI (camp-to-camp marchers).
    if (leader) {
      const goal = nativeHost.warbandDestination(host, at);
      leader.patrolRoute = [(0,sources.vec)(at.x, at.y), goal];
      leader.patrolIdx = 1; // head for the destination first, not back to the entry
      for (const m of pack) if (m !== leader) m.patrolFollow = leader.id;
      nativeHost.warbandMarches.push({ leader, members: pack, goal });
    }
    nativeHost.flashes.push({ pos: (0,sources.vec)(at.x, at.y), radius: 90, color: '#e85050', life: 0.6, maxLife: 0.6 });
    nativeHost.text((0,sources.vec)(at.x, at.y - 44),
      `${roster.name ?? host.faction} warband marches in from the ${nativeHost.compassFrom(at)}!`, '#e85050', 16);
  }
export function birthWarbandDestination(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, host: InvasionHost, entry: Vec2): Vec2 {
    const onward = nativeHost.exits.filter(e => e.to !== host.fromZoneId);
    if (onward.length) {
      const e = onward[(0,sources.randInt)(0, onward.length - 1)];
      return (0,sources.vec)(e.pos.x, e.pos.y);
    }
    // Dead-end zone (only the entry exit): march to the far side, away from entry.
    const cx = nativeHost.arena.w / 2, cy = nativeHost.arena.h / 2;
    let dx = cx - entry.x, dy = cy - entry.y;
    if (Math.hypot(dx, dy) < 1) { dx = 0; dy = 1; }
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(nativeHost.arena.w, nativeHost.arena.h) / 2 - 80;
    return nativeHost.clampPos((0,sources.vec)(cx + (dx / len) * reach, cy + (dy / len) * reach), 16);
  }
export function birthWarbandEntryPoint(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, host: InvasionHost): Vec2 {
    const exit = nativeHost.exits.find(e => e.to === host.fromZoneId);
    if (exit) return (0,sources.vec)(exit.pos.x, exit.pos.y);
    const from = nativeHost.zoneMap[host.fromZoneId];
    const cx = nativeHost.arena.w / 2, cy = nativeHost.arena.h / 2;
    if (from) {
      let dx = from.map.x - nativeHost.zone.map.x, dy = from.map.y - nativeHost.zone.map.y;
      const len = Math.hypot(dx, dy) || 1;
      const reach = Math.min(nativeHost.arena.w, nativeHost.arena.h) / 2 - 80;
      return nativeHost.clampPos((0,sources.vec)(cx + (dx / len) * reach, cy + (dy / len) * reach), 16);
    }
    return nativeHost.clampPos((0,sources.vec)(cx, 90), 16);
  }
export function birthBearingOf(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, from: Vec2, to: Vec2): string {
    const dx = to.x - from.x, dy = to.y - from.y;
    return Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'north' : 'south') : (dx < 0 ? 'west' : 'east');
  }
export function birthCompassFrom(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, at: Vec2): string {
    return nativeHost.bearingOf((0,sources.vec)(nativeHost.arena.w / 2, nativeHost.arena.h / 2), at);
  }
export function birthPlaceFractureContent(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const ff = nativeHost.sim.fractureField;
    if (!ff || nativeHost.inCave) return;
    const info = ff.fractureIn(def.id);
    if (!info) return;
    const key = `${info.id}@${def.id}`;
    if (nativeHost.materializedFractures.has(key)) return;
    nativeHost.materializedFractures.add(key);
    nativeHost.fractureRng = new sources.Rng(((0,sources.packageSeed)(nativeHost.manifest.seed, 'fractures') ^ (0,sources.hashStr)(`${info.id}:${def.id}`)) >>> 0);
    const surge = ff.surge();
    let at = nativeHost.clampPos(nativeHost.farPoint(440, true), 18);
    if (nativeHost.walk && !nativeHost.walk.isWalkable(at.x, at.y)) at = nativeHost.walk.snapToWalkable(at); // start on the mesh in walled zones
    nativeHost.fractureRun = {
      id: info.id, faction: info.faction, color: info.color, variant: info.variant,
      phase: 'dormant', longerTimer: info.longerTimer, span: info.span,
      origin: (0,sources.vec)(at.x, at.y), head: (0,sources.vec)(at.x, at.y), endpoint: (0,sources.vec)(at.x, at.y), crack: [],
      timer: 0, maxTimer: 0, trickle: 0,
      chasm: null, chasmDoodad: null, chasmSpawn: 0, chasmSpawned: new Set(),
      chasmClear: 0, chasmsSealed: 0,
      chasmsTarget: nativeHost.fractureRng.int(surge.chasmsPerZone[0], surge.chasmsPerZone[1]),
      stuck: 0, grace: 0,
    };
    // A DIVERTED fracture arrives ALREADY LIVE (the map marker raced you here) —
    // but under its ARRIVAL GRACE: the collapse clock holds until you first close
    // in (or the grace runs out), so surfacing across a zone you haven't crossed
    // yet is findable, not a silent fail. The ORIGIN fracture sits dormant,
    // waiting to be run over.
    if (info.longerTimer) {
      nativeHost.beginFissure(nativeHost.fractureRun, 'The fracture surfaces here — run it down!');
      // The surface announce above draws at the fissure (likely off-screen);
      // tell the PLAYER where to run, in their own field of view.
      nativeHost.notice(`Fracture · ${nativeHost.bearingOf(nativeHost.player.pos, at)}`, info.color, 15, 'events');
    }
  }
export function birthBeginFissure(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, run: FractureRun, announce: string): void {
    const ff = nativeHost.sim.fractureField;
    if (!ff) return;
    const surge = ff.surge();
    run.phase = 'fissure';
    run.head = (0,sources.vec)(run.origin.x, run.origin.y);
    run.crack = [(0,sources.vec)(run.origin.x, run.origin.y)];
    run.endpoint = nativeHost.fracturePoint(run.origin);
    run.maxTimer = run.longerTimer ? surge.divertTimer : surge.baseTimer;
    run.timer = run.maxTimer;
    run.trickle = 0;
    run.stuck = 0;
    // Only a DIVERTED surface gets the arrival grace — a run-over trigger starts
    // with the player standing on the fissure, so its clock is fair immediately.
    run.grace = run.longerTimer ? surge.divertGrace : 0;
    run.chasmsSealed = 0;
    ff.touch();
    nativeHost.flashes.push({ pos: (0,sources.vec)(run.origin.x, run.origin.y), radius: 90, color: run.color, life: 0.6, maxLife: 0.6 });
    nativeHost.text((0,sources.vec)(run.origin.x, run.origin.y - 30), announce, run.color, 16);
  }
export function birthPlaceFractureRiftContent(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const ff = nativeHost.sim.fractureField;
    if (!ff || nativeHost.inCave) return;
    const info = ff.riftIn(def.id);
    if (!info || nativeHost.fractureRifts.some(r => r.id === info.id)) return;
    const p = nativeHost.clampPos((0,sources.vec)(info.pos.x, info.pos.y), 30);
    nativeHost.fractureRifts.push({
      id: info.id, pos: (0,sources.vec)(p.x, p.y), faction: info.faction, color: info.color,
      variant: info.variant, level: info.level, cap: info.cap,
    });
  }
export function birthFracturePoint(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, from: Vec2): Vec2 {
    const reach = Math.min(nativeHost.arena.w, nativeHost.arena.h);
    const ang = nativeHost.fractureRng.range(0, Math.PI * 2);
    const d = nativeHost.fractureRng.range(reach * 0.32, reach * 0.48);
    let pt = nativeHost.clampPos((0,sources.vec)(from.x + Math.cos(ang) * d, from.y + Math.sin(ang) * d), 24);
    // In a WALK-GRID zone, snap the endpoint ONTO the mesh so the fissure isn't sent
    // chasing a point inside a wall (the stuck-guard is the backstop if it still can't).
    if (nativeHost.walk && !nativeHost.walk.isWalkable(pt.x, pt.y)) pt = nativeHost.walk.snapToWalkable(pt);
    return pt;
  }
export function birthPlaceRitualSite(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const cf = nativeHost.sim.conclaveField;
    if (!cf || nativeHost.inCave) return;
    const info = cf.ritualIn(def.id);
    if (!info) return;
    const key = `${info.id}@${def.id}`;
    if (nativeHost.materializedRituals.has(key)) return;
    nativeHost.materializedRituals.add(key);
    const cfg = cf.surge().ritual;
    const rng = new sources.Rng(((0,sources.packageSeed)(nativeHost.manifest.seed, 'conclave') ^ (0,sources.hashStr)(`${info.id}:${def.id}`)) >>> 0);
    // Place the pentagram away from the player, kept fully inside the arena.
    const center = nativeHost.clampPos(nativeHost.farPoint(cfg.farFrom, true), cfg.pentagramRadius + 26);
    // A walkable ritual circle the cultists ring (a slight seeded tilt for variety;
    // the renderer otherwise points it up).
    const dood: Doodad = { pos: (0,sources.vec)(center.x, center.y), radius: cfg.pentagramRadius, kind: 'ritual_pentagram', rot: rng.range(-0.15, 0.15) };
    nativeHost.doodads.push(dood);
    const cultistIds: number[] = [];
    const n = Math.max(1, cfg.cultistCount);
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (dood.rot ?? 0) + (i / n) * Math.PI * 2; // matches the drawn star's tilt
      const c = nativeHost.createMonster(cfg.cultistId, Math.max(1, def.level), 'enemy');
      c.tag = 'ritual_cultist'; // drives dormancy (ai.ts), rouse (resolveHit), eruption (kill)
      c.pos = nativeHost.clampPos((0,sources.vec)(center.x + Math.cos(ang) * cfg.pentagramRadius, center.y + Math.sin(ang) * cfg.pentagramRadius), c.radius);
      nativeHost.actors.push(c);
      cultistIds.push(c.id);
    }
    nativeHost.ritualSite = { id: info.id, zoneId: def.id, center: (0,sources.vec)(center.x, center.y), cultistIds, subdued: false };
    (0,sources.bumpLedger)(nativeHost.ledger, 'rituals_seen'); // DISCOVERY — surfaces the Vault unlock
    nativeHost.text((0,sources.vec)(center.x, center.y - cfg.pentagramRadius - 14), 'An Occult ritual is underway…', '#a86ad8', 15);
  }
export function birthPlaceHoldfast(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const hf = nativeHost.sim.holdfastField;
    if (!hf || nativeHost.inCave) return;
    const info = hf.infoFor(def.id);
    // A FAILED slaughter (resolved 'failed', still locked) is TERMINAL — never re-muster
    // payable wardens on re-entry (that would let the player re-pay or re-roll the gamble).
    if (!info || !info.locked || info.resolved === 'failed' || !info.exitAppended) return;
    if (nativeHost.materializedHoldfasts.has(def.id)) return;
    nativeHost.materializedHoldfasts.add(def.id);
    const gdef = hf.def(info.defId);
    // Resolve the portal by the LOCK ID, not a stored array index — eagerChartNeighbors
    // can drop frontiers + rebuild zone.exits after the append, shifting positions (so a
    // persisted index goes stale → gate never raised / stamped on the wrong exit).
    const portal = nativeHost.exits.find(e => nativeHost.zone.exits[e.defIndex]?.lock === info.lockId);
    if (!gdef || !portal) return;
    if (!info.seenBumped) { info.seenBumped = true; (0,sources.bumpLedger)(nativeHost.ledger, 'holdfast_seen'); } // DISCOVERY (once) — surfaces the Vault unlock
    const lvl = Math.max(1, def.level);
    // The gate's geometry — the SAME numbers the terrain carve used
    // (gateThroatAt), so the bar seats flush in the mouth's lane and the
    // wardens stand where the road meets the throat.
    const throat = (0,sources.gateThroatAt)(nativeHost.arena, portal.pos, (0,sources.boundaryGateOf)(gdef.gate));
    const inward = throat.inward, tx = throat.tangent.x, ty = throat.tangent.y;
    // THE BAR: sealed timber across the throat's inner opening while the toll
    // stands — the one piece that must vanish on unlock, so it alone (plus the
    // wardens) is runtime. Palisade-post 'wall' doodads by default; a def may
    // name its own barKind, or '' for an unbarred (purely warded) mouth.
    const gateDoodads: Doodad[] = [];
    const barKind = gdef.barKind ?? 'wall';
    if (barKind) {
      const barR = 13;
      for (let s = -(throat.mouthWidth / 2) + barR * 0.6; s <= throat.mouthWidth / 2 - barR * 0.6; s += barR * 1.5) {
        const d: Doodad = { pos: (0,sources.vec)(throat.inner.x + tx * s, throat.inner.y + ty * s), radius: barR, kind: barKind };
        nativeHost.doodads.push(d);
        gateDoodads.push(d);
      }
    }
    // THE WARDENS: housed at the throat's inner opening — the toll stand on
    // the road where travelers arrive. The keeper (the dwell-target you pay)
    // holds the lane's own axis; the guards flank the mouth. NEUTRAL until roused.
    const standC = nativeHost.clampPos((0,sources.vec)(
      throat.inner.x + inward.x * 64, throat.inner.y + inward.y * 64), 30);
    const g = gdef.guardian;
    // THE POST (GuardianSpec.post): wardens are bodies ON DUTY — each keeps
    // the exact stand it was housed at, so storm-drift, a stray shove, or a
    // rouse-and-retreat all end with the crew RE-FORMED at the gate (and the
    // parley re-opened) instead of scattered across the zone. `false` = a
    // drifter crew; a PostSpec tunes slack/pace per guardian def.
    const postSpec = g.post === false ? undefined
      : (g.post === undefined || g.post === true ? {} : g.post);
    // Eyes on the road: the stand watches the way travelers arrive (inward
    // off the gate throat, where the toll's customers come walking).
    const watchFacing = Math.atan2(inward.y, inward.x);
    const stampPost = (w: Actor): void => {
      if (!postSpec) return;
      w.postSpec = postSpec;
      w.aiPost = (0,sources.vec)(w.pos.x, w.pos.y);
      w.aiPostFacing = watchFacing;
      w.facing = watchFacing;
    };
    const banditIds: number[] = [];
    const keeper = nativeHost.createMonster(g.keeperId, lvl, 'enemy');
    keeper.tag = g.neutralTag;
    // The guardian FACTION claims its crew (over the monster def's own), so a
    // gate's bodies answer to the GATE and not to whatever stock they were
    // minted from — a fiend crew of Legion bodies must never inherit the
    // Legion's wars. How much that stamp buys differs per guardian:
    //   - 'durance_toll' IS relation-less, and the stamp is load-bearing —
    //     the tithe-gate's crew has no diplomacy, so a zone's warring natives
    //     can never pick a fight with it while it sleeps.
    //   - 'roadwarden_toll' (2026-08-01, the bandit ruling's third act) is
    //     relation-less like the durance gate, and the stamp is equally
    //     load-bearing: the surface camp sleeps OUTSIDE the war ledger, so
    //     even an awake armed neutral (the croft warden) never reads it as
    //     a target. The crew swaps to its TRUE COLORS ('bandit', with all
    //     its shipped wars — 'freehold|bandit' and 'compact|bandit' both
    //     KEPT, see THE BANDIT RULING in data/monsters.ts) on the rouse:
    //     GuardianSpec.rousedFactionId → ai.ts registerDormantColors,
    //     reconciled at updateAI's dormancy fork. Full story in the
    //     holdfast header (packages/defs/holdfast.ts).
    //     Note dormancy is NOT a targeting shield: acquireTarget filters
    //     dead/untargetable/downed/passive/invisible, never dormant — the
    //     relation-less calm faction is what closes that door.
    keeper.faction = g.factionId;
    keeper.pos = nativeHost.clampPos((0,sources.vec)(standC.x + tx * (0,sources.rand)(-20, 20) + inward.x * (0,sources.rand)(0, 24),
      standC.y + ty * (0,sources.rand)(-20, 20) + inward.y * (0,sources.rand)(0, 24)), keeper.radius);
    stampPost(keeper);
    nativeHost.actors.push(keeper); banditIds.push(keeper.id);
    const pool = g.rosterIds?.length ? g.rosterIds : [g.keeperId];
    const guards = (0,sources.randInt)(g.count[0], g.count[1]);
    for (let i = 0; i < guards; i++) {
      const c = nativeHost.createMonster(pool[i % pool.length], lvl, 'enemy');
      c.tag = g.neutralTag;
      c.faction = g.factionId;
      const flank = i % 2 === 0 ? 1 : -1;
      c.pos = nativeHost.clampPos((0,sources.vec)(
        standC.x + tx * flank * (throat.mouthWidth / 2 + (0,sources.rand)(10, 62)) + inward.x * (0,sources.rand)(-16, 44),
        standC.y + ty * flank * (throat.mouthWidth / 2 + (0,sources.rand)(10, 62)) + inward.y * (0,sources.rand)(-16, 44)), c.radius);
      stampPost(c);
      nativeHost.actors.push(c); banditIds.push(c.id);
    }
    nativeHost.holdfastSite = { zoneId: def.id, lockId: info.lockId, defId: gdef.id, keeperId: keeper.id, banditIds, gateDoodads };
    nativeHost.flashes.push({ pos: (0,sources.vec)(standC.x, standC.y), radius: 120, color: gdef.marker?.color ?? '#c8a04a', life: 0.7, maxLife: 0.7 });
    nativeHost.text((0,sources.vec)(standC.x, standC.y - 54), `${gdef.name}`, gdef.marker?.color ?? '#c8a04a', 16);
  }
export function birthFindUnsealingSpot(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, r: number): Vec2 {
    const step = 60, m = r + 14;
    let best: Vec2 | null = null, bd = -1;
    for (let y = m; y <= nativeHost.arena.h - m; y += step) {
      for (let x = m; x <= nativeHost.arena.w - m; x += step) {
        if (nativeHost.walk && !nativeHost.walk.isWalkable(x, y)) continue;
        let clear = true;
        for (const d of nativeHost.doodads) {
          if (!(0,sources.blocksMovement)(d)) continue;
          if ((0,sources.dist)((0,sources.vec)(x, y), d.pos) < d.radius + m) { clear = false; break; }
        }
        if (!clear) continue;
        const de = (0,sources.dist)((0,sources.vec)(x, y), nativeHost.zoneEntry);
        if (de > bd) { bd = de; best = (0,sources.vec)(x, y); }
      }
    }
    return best ?? nativeHost.clampPos((0,sources.vec)(nativeHost.arena.w / 2, nativeHost.arena.h / 2), r);
  }
export function birthMaterializeUnsealing(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef, _live: boolean): void {
    const uf = nativeHost.sim.unsealingField;
    if (!uf || def.biome !== 'sepulcher' || def.caveDepth == null) return;
    const role = uf.roleFor(def.seed ?? 0);
    if (role.kind === 'none') return;
    const cfg = uf.surge();
    const lvl = Math.max(1, def.level);
    if (!nativeHost.materializedUnsealing.has(def.id)) {
      nativeHost.materializedUnsealing.add(def.id);
      if (role.kind === 'tomb') {
        // FOUND: latch the overworld marker on the pocket's host zone (the
        // sole exit home — pockets are off-graph, the parent carries the pin).
        const parent = def.exits[0]?.to;
        if (parent && uf.foundTomb(parent, def.id)) {
          (0,sources.bumpLedger)(nativeHost.ledger, 'unsealing_tomb_found');
          nativeHost.notice('You have found the REGENT\'S TOMB — the map remembers it', cfg.gold, 17, 'world');
        }
        // The door at the deep end, its talisman arc facing the way in.
        const at = nativeHost.findUnsealingSpot(cfg.door.radius + cfg.door.brazierRing);
        const toEntry = Math.atan2(nativeHost.zoneEntry.y - at.y, nativeHost.zoneEntry.x - at.x);
        const opened = uf.allFlared();
        const door: Doodad = {
          pos: at, radius: cfg.door.radius,
          kind: opened ? 'regent_door_open' : 'regent_door', rot: toEntry,
        };
        nativeHost.doodads.push(door);
        const braziers: (Doodad | null)[] = [];
        for (let i = 0; i < cfg.wards.length; i++) {
          const spread = (i - (cfg.wards.length - 1) / 2) * 0.55;
          const a = toEntry + spread;
          const b: Doodad = {
            pos: nativeHost.clampPos((0,sources.vec)(
              at.x + Math.cos(a) * cfg.door.brazierRing,
              at.y + Math.sin(a) * cfg.door.brazierRing), cfg.door.brazierRadius),
            radius: cfg.door.brazierRadius,
            kind: uf.flared(cfg.wards[i].id) ? 'regent_brazier_lit' : 'regent_brazier',
          };
          nativeHost.doodads.push(b);
          braziers.push(b);
        }
        // The threshold watch: wardens posted at the door until the Regent
        // has no further need of them.
        if (!uf.regentSlain()) {
          const n = (0,sources.randInt)(cfg.door.guards[0], cfg.door.guards[1]);
          for (let i = 0; i < n; i++) {
            const flank = i % 2 === 0 ? 1 : -1;
            const g = nativeHost.createMonster(cfg.door.guardId, lvl, 'enemy');
            g.pos = nativeHost.clampPos((0,sources.vec)(
              at.x + Math.cos(toEntry + flank * 1.5) * (cfg.door.radius + 46),
              at.y + Math.sin(toEntry + flank * 1.5) * (cfg.door.radius + 46)), g.radius);
            g.postSpec = {};
            g.aiPost = (0,sources.vec)(g.pos.x, g.pos.y);
            g.aiPostFacing = toEntry; g.facing = toEntry;
            nativeHost.actors.push(g);
          }
        }
        nativeHost.unsealingSite = { zoneId: def.id, doorPos: at, door, braziers, opened, woken: false };
      } else {
        // A CANOPIC HOST: the rolled ward — or, once that talisman burns, the
        // next unflared one (progress converges; all lit = an emptied vault).
        const wardId = uf.nextWard(role.ward);
        if (wardId) {
          const ward = cfg.wards.find(w => w.id === wardId);
          if (ward) {
            const at = nativeHost.findUnsealingSpot(30);
            const m = nativeHost.createMonster(ward.monsterId, lvl, 'enemy');
            m.pos = nativeHost.clampPos((0,sources.vec)(at.x, at.y), m.radius);
            m.tag = 'canopic_seal';
            m.eventKey = wardId; // the kill row resolves the WARD from this
            nativeHost.promoteRarity(m, cfg.canopic.rarity, { distinctName: false });
            nativeHost.actors.push(m);
            const guards = (0,sources.randInt)(cfg.canopic.guards[0], cfg.canopic.guards[1]);
            for (let i = 0; i < guards; i++) {
              const g = nativeHost.createMonster(cfg.canopic.guardId, lvl, 'enemy');
              g.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-70, 70), at.y + (0,sources.rand)(-70, 70)), g.radius);
              nativeHost.actors.push(g);
            }
            nativeHost.notice(`${m.name} · ${ward.label}`, cfg.gold, 15, 'events');
          }
        }
      }
    }
    // LIVE SYNC (tomb sites only, cheap): braziers mirror the ledger, the
    // door swaps once on the last flare, the Regent wakes on approach.
    const site = nativeHost.unsealingSite;
    if (!site || site.zoneId !== def.id) return;
    for (let i = 0; i < site.braziers.length; i++) {
      const b = site.braziers[i];
      if (!b || !uf.flared(cfg.wards[i].id) || b.kind === 'regent_brazier_lit') continue;
      b.kind = 'regent_brazier_lit';
      nativeHost.flashes.push({ pos: (0,sources.vec)(b.pos.x, b.pos.y), radius: 60, color: cfg.gold, life: 0.6, maxLife: 0.6 });
      nativeHost.markDoodadsChanged();
    }
    if (!site.opened && uf.allFlared()) {
      site.opened = true;
      site.door.kind = 'regent_door_open';
      nativeHost.markDoodadsChanged();
      nativeHost.flashes.push({ pos: (0,sources.vec)(site.doorPos.x, site.doorPos.y), radius: 160, color: cfg.gold, life: 0.9, maxLife: 0.9 });
      nativeHost.text((0,sources.vec)(site.doorPos.x, site.doorPos.y - 60),
        'The last talisman burns — the Regent\'s door stands OPEN', cfg.gold, 17);
    }
    if (site.opened && !site.woken && !uf.regentSlain()
      && (0,sources.dist)(nativeHost.player.pos, site.doorPos) <= cfg.door.wakeRadius) {
      site.woken = true;
      const r = nativeHost.createMonster(cfg.regent.monsterId, lvl, 'enemy');
      const toEntry = Math.atan2(nativeHost.zoneEntry.y - site.doorPos.y, nativeHost.zoneEntry.x - site.doorPos.x);
      r.pos = nativeHost.clampPos((0,sources.vec)(
        site.doorPos.x + Math.cos(toEntry) * (cfg.door.radius + r.radius + 12),
        site.doorPos.y + Math.sin(toEntry) * (cfg.door.radius + r.radius + 12)), r.radius);
      r.tag = 'sand_regent';
      nativeHost.promoteRarity(r, cfg.regent.rarity, { distinctName: false });
      nativeHost.actors.push(r);
      nativeHost.flashes.push({ pos: (0,sources.vec)(r.pos.x, r.pos.y), radius: 200, color: cfg.gold, life: 1, maxLife: 1 });
      nativeHost.text((0,sources.vec)(site.doorPos.x, site.doorPos.y - 70),
        'THE SAND REGENT WAKES — at full strength, as promised', '#ffd890', 18);
    }
  }
export function birthPlaceAmalgamation(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const af = nativeHost.sim.amalgamationField;
    if (!af || nativeHost.inCave) return;
    const info = af.activeIn(def.id);
    if (!info) return;
    const key = `${info.id}@${def.id}`;
    if (nativeHost.materializedAmalgam.has(key)) return;
    nativeHost.materializedAmalgam.add(key);
    const cfg = af.surge();
    const rng = new sources.Rng(((0,sources.packageSeed)(nativeHost.manifest.seed, 'amalgamation') ^ (0,sources.hashStr)(`${info.id}:${def.id}`)) >>> 0);
    const center = nativeHost.clampPos(nativeHost.farPoint(cfg.farFrom, true), cfg.ringRadius + 30);
    // The Bonewright — neutral, inert, UNTARGETABLE (flags come from its def).
    const necro = nativeHost.createMonster(cfg.necromancerId, Math.max(1, def.level), 'enemy');
    necro.tag = 'amalgam_necromancer';
    necro.pos = nativeHost.clampPos((0,sources.vec)(center.x, center.y), necro.radius);
    nativeHost.actors.push(necro);
    // A ring of graves — one per part to gather; the ones already grafted are CRACKED
    // open (a viscera pool), the visual countdown to the Amalgamation's rising.
    const tilt = rng.range(-0.3, 0.3);
    for (let i = 0; i < info.partsNeeded; i++) {
      const ang = -Math.PI / 2 + tilt + (i / Math.max(1, info.partsNeeded)) * Math.PI * 2;
      const gp = nativeHost.clampPos((0,sources.vec)(center.x + Math.cos(ang) * sources.AMALGAM_GRAVE_RING, center.y + Math.sin(ang) * sources.AMALGAM_GRAVE_RING), 16);
      nativeHost.doodads.push({ pos: gp, radius: 14, kind: i < info.stage ? 'gore' : 'tombstone', rot: rng.range(-0.3, 0.3) });
    }
    nativeHost.amalgamSite = { id: info.id, zoneId: def.id, center: (0,sources.vec)(center.x, center.y), necroId: necro.id, bossId: null };
    (0,sources.bumpLedger)(nativeHost.ledger, 'necromancers_seen'); // DISCOVERY — surfaces the Vault unlock
    nativeHost.text((0,sources.vec)(center.x, center.y - cfg.ringRadius - 14), 'The Bonewright', '#9ad0b0', 15);
    if (info.quest === 'boss') nativeHost.riseAmalgamation();
  }
export function birthPlaceAmalgamMiniboss(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const af = nativeHost.sim.amalgamationField;
    if (!af || nativeHost.inCave) return;
    const mb = af.minibossIn(def.id);
    if (!mb || !sources.MONSTERS[mb.defId]) return;
    const key = `${mb.id}@${def.id}`;
    if (nativeHost.materializedAmalgamMobs.has(key)) return;
    nativeHost.materializedAmalgamMobs.add(key);
    const cfg = af.surge();
    const m = nativeHost.createMonster(mb.defId, Math.max(1, def.level + cfg.minibossLevelBonus), 'enemy');
    m.faction = 'amalgam';
    m.tag = 'amalgam_miniboss';
    nativeHost.promoteRarity(m, 'champion');
    m.pos = nativeHost.clampPos(nativeHost.farPoint(420, true), m.radius);
    nativeHost.actors.push(m);
    nativeHost.flashes.push({ pos: (0,sources.vec)(m.pos.x, m.pos.y), radius: 130, color: '#e8e0c8', life: 0.8, maxLife: 0.8 });
    nativeHost.text((0,sources.vec)(m.pos.x, m.pos.y - 50), `${m.name}`, '#e8e0c8', 16);
  }
export function birthRiseAmalgamation(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources): void {
    const site = nativeHost.amalgamSite;
    const af = nativeHost.sim.amalgamationField;
    if (!site || !af) return;
    if (site.bossId != null && nativeHost.actorById(site.bossId)) return; // already risen this visit
    const info = af.activeIn(site.zoneId);
    if (!info || info.quest !== 'boss') return;
    const cfg = af.surge();
    const boss = nativeHost.createMonster(cfg.bossBaseId, Math.max(1, nativeHost.zone.level + 1), 'enemy');
    // Graft the chosen parts: stat mods (one source), skills + supports, a name.
    const partMods: Modifier[] = [];
    const skillLevel = 1 + Math.floor((boss.level - 1) / 4);
    const supLevel = 1 + Math.floor((boss.level - 1) / 5);
    const epithets: string[] = [];
    for (const pid of info.chosenParts) {
      const part = af.partById(pid);
      if (!part) continue;
      partMods.push(...part.mods);
      if (part.epithet) epithets.push(part.epithet);
      if (part.grantSkill && sources.SKILLS[part.grantSkill]) boss.skills.push((0,sources.makeSkillInstance)(sources.SKILLS[part.grantSkill], skillLevel));
      if (part.grantSupport && sources.SUPPORTS[part.grantSupport]) {
        const target = boss.skills[0];
        if (target) {
          const slot = target.sockets.findIndex(x => x === null);
          if (slot >= 0) target.sockets[slot] = { def: sources.SUPPORTS[part.grantSupport], level: supLevel };
        }
      }
    }
    if (partMods.length) boss.sheet.setSource('amalgam', partMods);
    if (epithets.length) boss.name = `Amalgamation of ${epithets.join(' & ')}`;
    boss.faction = 'amalgam';
    boss.tag = 'amalgam_boss';
    nativeHost.promoteRarity(boss, 'crowned'); // re-fills resources after mods land
    boss.pos = nativeHost.clampPos((0,sources.vec)(site.center.x, site.center.y - 44), boss.radius);
    boss.life = Math.max(1, boss.maxLife() * (0,sources.clamp)(info.bossLifeFrac, 0.02, 1)); // preserved health
    nativeHost.actors.push(boss);
    site.bossId = boss.id;
    nativeHost.flashes.push({ pos: (0,sources.vec)(boss.pos.x, boss.pos.y), radius: 180, color: '#9ad0b0', life: 0.9, maxLife: 0.9 });
    nativeHost.text((0,sources.vec)(boss.pos.x, boss.pos.y - 64), `${boss.name} rises!`, '#9ad0b0', 20);
  }
export function birthPlaceAscentGeyser(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const af = nativeHost.sim.ascentField;
    if (!af || nativeHost.inCave || def.caveDepth != null) return;
    if ((def.dimension ?? 'surface') !== 'surface') return; // geysers vent from the world's own ground
    if (def.special || def.eventOwned) return;
    if (def.objective.kind === 'safe' || def.objective.kind === 'waves') return;
    if (def.theme.ambientDark != null) return; // open sky only — a roofed geyser goes nowhere
    const surge = af.surge();
    if (surge.geyserBiomes.length && !surge.geyserBiomes.includes(def.biome ?? '')) return;
    if (!af.geyserAllowed(nativeHost.player.level)) return;
    const roll = new sources.Rng(((def.seed ?? 0) ^ 0xa5ce47) >>> 0); // stable per zone
    if (!roll.chance(af.geyserChanceNow())) return;
    // The spring: a seeded pick well clear of the door + the transit spots.
    let at: Vec2 | null = null;
    for (let tries = 0; tries < 24 && !at; tries++) {
      const p = nativeHost.clampPos((0,sources.vec)(
        roll.range(140, Math.max(160, nativeHost.arena.w - 140)),
        roll.range(140, Math.max(160, nativeHost.arena.h - 140))), 34);
      if ((0,sources.dist)(p, nativeHost.zoneEntry) < 420) continue; // not at the door
      at = nativeHost.clearTransitSpot(p);
    }
    if (!at) return;
    nativeHost.ventGeyser(at, (0,sources.hashStr)(`${def.id}:sky_geyser`));
    (0,sources.bumpLedger)(nativeHost.ledger, 'geysers_seen'); // DISCOVERY — surfaces the Vault unlock
  }
export function birthVentGeyser(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, at: Vec2, pocketSeed: number): void {
    nativeHost.doodads.push({ pos: (0,sources.vec)(at.x, at.y), radius: 30, kind: 'sky_geyser' });
    // The spring's pool: warm water lapping the terrace (ground overlay —
    // wading, wake rings, the works ride the ordinary region machinery).
    for (let i = 0; i < 3; i++) {
      const a = (0,sources.rand)(0, Math.PI * 2);
      const pool = { pos: (0,sources.vec)(at.x + Math.cos(a) * 26, at.y + Math.sin(a) * 26), radius: (0,sources.rand)(22, 32), kind: 'water' as const };
      nativeHost.doodads.push(pool);
      nativeHost.grounds.push(pool);
    }
    nativeHost.caveEntrances.push({
      pos: nativeHost.clampPos((0,sources.vec)(at.x, at.y), 28),
      seed: pocketSeed,
      kind: 'sky_geyser',
    });
    nativeHost.text((0,sources.vec)(at.x, at.y - 36), 'A geyser roars toward the sky…', '#9fd8ff', 15);
  }
export function birthMaterializeObserver(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const inc = nativeHost.sim.incursionField;
    if (!inc || nativeHost.inCave || nativeHost.materializedObservers.has(def.id)) return;
    const info = inc.epicenterInfo(def.id);
    if (!info) return;
    const term = info.archetype.termination;
    if (term.policy !== 'hybridCleanseObserver' || !term.observer || !sources.MONSTERS[term.observer]) return;
    nativeHost.materializedObservers.add(def.id);
    const obs = nativeHost.createMonster(term.observer, Math.max(1, def.level + 2), 'enemy');
    obs.faction = info.archetype.factions[0];
    nativeHost.promoteRarity(obs, 'crowned');
    obs.tag = 'eldritch_observer';
    obs.xpValue = Math.max(obs.xpValue, 160);
    obs.pos = nativeHost.clampPos(nativeHost.farPoint(440, true), obs.radius);
    nativeHost.actors.push(obs);
    nativeHost.flashes.push({ pos: (0,sources.vec)(obs.pos.x, obs.pos.y), radius: 150, color: '#7fce6a', life: 0.8, maxLife: 0.8 });
    nativeHost.text((0,sources.vec)(obs.pos.x, obs.pos.y - 50), 'The Observer turns its gaze upon you.', '#7fce6a', 18);
  }
export function birthSpawnEpicenter(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, info: InvasionInfo, live = false): void {
    if (nativeHost.materializedEpicenters.has(info.id)) return;
    nativeHost.materializedEpicenters.add(info.id);
    // The strike's RESOLVED faction: an attributed strike fields its sending
    // LORD'S host (the War Below's banner made flesh); legacy keeps the Legion.
    const facId = info.faction;
    const roster = sources.FACTIONS[facId];
    if (!roster?.table?.length) return;
    const lvl = Math.max(1, nativeHost.zone.level + info.strengthBonus);
    // When the invasion attaches to the zone you're STANDING in, the Balor lands
    // CLOSER (so the eruption-in-fire reads as happening to you, not across the
    // map) — but past a standoff so it's a warning, not a point-blank ambush.
    const at = nativeHost.clampPos(live ? nativeHost.farPoint(280, true) : nativeHost.farPoint(360, true), 28);
    // DIMENSION-CORRECT field (the surface-only shortcut spawned the surface
    // champion at a hell epicenter — every sibling read already went through
    // demonFieldFor; this was the straggler). An attributed strike is led by
    // its lord's MARSHAL (the lord never leaves its throne); the Balor remains
    // the unattributed default.
    const champId = info.champion
      ?? nativeHost.sim.demonFieldFor(nativeHost.zone.dimension)?.surge()?.portal?.champion?.monsterId ?? 'balor_warlord';
    const balor = nativeHost.createMonster(champId, lvl + 2, 'enemy');
    balor.faction = facId;
    if (nativeHost.sim.factionInvasionActive(facId, nativeHost.player.level)) nativeHost.promoteRarity(balor, 'crowned');
    balor.tag = 'balor_epicenter';
    balor.pos = nativeHost.clampPos((0,sources.vec)(at.x, at.y), balor.radius);
    nativeHost.actors.push(balor);
    const pool = roster.table.filter(e => e.id !== champId);
    const n = (0,sources.randInt)(5, 8);
    for (let k = 0; k < n; k++) {
      const m = nativeHost.createMonster(nativeHost.weightedPick(pool.length ? pool : roster.table, lvl), lvl, 'enemy');
      m.faction = facId;
      m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-90, 90), at.y + (0,sources.rand)(-90, 90)), m.radius);
      nativeHost.actors.push(m);
    }
    (0,sources.bumpLedger)(nativeHost.ledger, 'demon_invasion_seen'); // DISCOVERY — surfaces the Vault tiers
    nativeHost.flashes.push({ pos: (0,sources.vec)(at.x, at.y), radius: 130, color: info.color, life: 0.7, maxLife: 0.7 });
    // An attributed strike is announced under its LORD'S name — the tie-in the
    // War Below exists for: the surface reads WHO reached up, not just what.
    const lord = info.lordId ? (0,sources.lordDef)(info.lordId) : undefined;
    const champName = lord ? `${lord.short}'s marshal` : 'the Balor';
    if (live) {
      // A STORM OF FIRE heralds the descent — a burst of (cosmetic) meteor flashes
      // around the champion as it lands, the alert/warning the player gets when an
      // invasion erupts ON the zone they're already in. (The real, damaging Demon
      // Storm then rains via updateDemonStorm, since this zone is now an epicenter.)
      for (let i = 0; i < 7; i++) {
        const mp = (0,sources.vec)(at.x + (0,sources.rand)(-120, 120), at.y + (0,sources.rand)(-120, 120));
        nativeHost.flashes.push({ pos: mp, radius: 34 + (0,sources.rand)(0, 30), color: info.color, life: 0.45 + (0,sources.rand)(0, 0.5), maxLife: 1 });
      }
      nativeHost.notice(`${info.type.label} ERUPTS — ${champName} descends in a storm of fire!`, info.color, 19, 'events');
    } else {
      nativeHost.text((0,sources.vec)(at.x, at.y - 50),
        lord ? `${info.type.label} — ${lord.short}, ${lord.epithet}, sends his marshal!`
          : `${info.type.label} — the Balor holds court!`, info.color, 18);
    }
  }
export function birthSpawnHellMarshal(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const key = `front_${def.id}`;
    if (nativeHost.materializedHellWar.has(key)) return;
    const front = nativeHost.sim.hellWarField?.frontStage(def.id);
    if (!front) return;
    nativeHost.materializedHellWar.add(key);
    const lord = front.attacker;
    const roster = sources.FACTIONS[lord.faction];
    if (!sources.MONSTERS[lord.marshal] || !roster?.table?.length) return;
    const lvl = Math.max(1, def.level + 1);
    const at = nativeHost.clampPos(nativeHost.farPoint(420, true), 24);
    const marshal = nativeHost.createMonster(lord.marshal, lvl + 2, 'enemy');
    marshal.faction = lord.faction;
    marshal.tag = 'hell_marshal';
    marshal.eventKey = `hellwar:${lord.id}`;
    marshal.xpValue = Math.max(marshal.xpValue, 120); // a marshal's bounty — the
    // top bar stays with the LORDS (authored bosses; World.bossBarInfo): a
    // field commander wears the champion ring, not the marquee.
    nativeHost.promoteRarity(marshal, 'champion');
    marshal.pos = nativeHost.clampPos((0,sources.vec)(at.x, at.y), marshal.radius);
    nativeHost.actors.push(marshal);
    const n = (0,sources.randInt)(3, 5);
    for (let k = 0; k < n; k++) {
      const m = nativeHost.createMonster(nativeHost.weightedPick(roster.table, lvl), lvl, 'enemy');
      m.faction = lord.faction;
      m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-90, 90), at.y + (0,sources.rand)(-90, 90)), m.radius);
      nativeHost.actors.push(m);
    }
    nativeHost.text((0,sources.vec)(at.x, at.y - 40), `${lord.short}'s marshal drives the front!`, lord.color, 15);
  }
export function birthSpawnHellCourt(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const key = `seat_${def.id}`;
    if (nativeHost.materializedHellWar.has(key)) return;
    const lord = nativeHost.sim.hellWarField?.manifestHere(def.id);
    if (!lord) return;
    nativeHost.materializedHellWar.add(key);
    const roster = sources.FACTIONS[lord.faction];
    if (!sources.MONSTERS[lord.lord] || !roster?.table?.length) return;
    const lvl = Math.max(1, def.level + 2);
    const at = nativeHost.clampPos(nativeHost.farPoint(520, true), 30);
    const body = nativeHost.createMonster(lord.lord, lvl + 2, 'enemy');
    body.faction = lord.faction;
    body.tag = 'hell_lord';
    body.eventKey = `hellwar:${lord.id}`;
    nativeHost.promoteRarity(body, 'crowned');
    body.pos = nativeHost.clampPos((0,sources.vec)(at.x, at.y), body.radius);
    nativeHost.actors.push(body);
    const n = (0,sources.randInt)(6, 9);
    for (let k = 0; k < n; k++) {
      const m = nativeHost.createMonster(nativeHost.weightedPick(roster.table, lvl), lvl, 'enemy');
      m.faction = lord.faction;
      m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-110, 110), at.y + (0,sources.rand)(-110, 110)), m.radius);
      nativeHost.actors.push(m);
    }
    nativeHost.text((0,sources.vec)(at.x, at.y - 48),
      `${lord.name} MANIFESTS — this ground is ${lord.throne.name} now. ${lord.creed}`, lord.color, 17);
  }
export function birthMaterializeCrusade(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, info: CrusadeInfo): void {
    if (nativeHost.materializedCrusades.has(nativeHost.zone.id)) return;
    nativeHost.materializedCrusades.add(nativeHost.zone.id);
    const roster = sources.FACTIONS[info.faction];
    if (!roster?.table?.length) return;
    (0,sources.bumpLedger)(nativeHost.ledger, 'crusade_seen'); // DISCOVERY — surfaces the Vault tuning
    const lvl = Math.max(1, nativeHost.zone.level);
    // THE WORKS are real structures now — injected at zone GENERATION as
    // fixtures (crusadeFixtureSpecs → generateLayout extraFixtures), so plan
    // walls carve the walk grid, gates are true doors, tower slots man, and
    // nothing ever stamps over a portal. This muster fields only the LIVING:
    // the garrison + its tier-promoted, tagged commander, at the works.
    const center = nativeHost.crusadeWorksAt ?? nativeHost.clampPos(nativeHost.farPoint(420, true), 24);
    // The garrison: a crusade pack with a tier-promoted, tagged commander. The
    // converted city's defenders are untagged — you reach the Leader through the
    // sanctum gate, not by clearing the streets. ENTRENCHMENT scales the head
    // count (CrusadeInfo.entrenchMul — age buys ranks): a war found late
    // fields a deeper yard than one caught kindling.
    const n = Math.max(1, Math.round((0,sources.randInt)(info.garrison[0], info.garrison[1]) * info.entrenchMul));
    for (let k = 0; k < n; k++) {
      const m = nativeHost.createMonster(nativeHost.weightedPick(roster.table, lvl), lvl, 'enemy');
      m.faction = info.faction;
      m.pos = nativeHost.clampPos((0,sources.vec)(center.x + (0,sources.rand)(-100, 100), center.y + (0,sources.rand)(-100, 100)), m.radius);
      if (k === 0 && info.leaderRarity !== 'none') {
        nativeHost.promoteRarity(m, info.leaderRarity === 'crowned' ? 'crowned' : 'champion');
        if (info.leaderTag) { m.tag = info.leaderTag; m.xpValue = Math.max(m.xpValue, 90); }
      }
      nativeHost.actors.push(m);
    }
    nativeHost.flashes.push({ pos: (0,sources.vec)(center.x, center.y), radius: 110, color: info.color, life: 0.6, maxLife: 0.6 });
    const fname = (roster.name ?? info.faction).replace(/^the /, '');
    nativeHost.notice(`${fname} — ${info.label} crusade ground!`, info.color, 16, 'war');
  }
export function birthMaterializeContagion(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const cf = nativeHost.sim.contagionField;
    if (!cf) return;
    const info = cf.contagionOn(def.id);
    if (!info) return;
    if (nativeHost.materializedContagion.has(def.id)) return;
    nativeHost.materializedContagion.add(def.id);
    // DISCOVERY — being caught in an infected zone surfaces the Vault tuning (one-shot
    // per outbreak), exactly like the Deadwake / Migration "you've been caught" bump.
    if (cf.markDiscovered(def.id)) (0,sources.bumpLedger)(nativeHost.ledger, 'contagion_seen');
    // THE KIN-BORNE SEAM (Movement II): a VISIT births one more carrier here —
    // the bodies infected on this ground spread onward on their own after
    // infection (capped by the surge; a curing outbreak births none).
    cf.seedCarrierAt(def.id);
    const cfg = cf.surge();
    const strain = (0,sources.strainOf)(info.strain);
    const lvl = Math.max(1, def.level);
    const roster = sources.FACTIONS[cfg.faction];
    // The diseased: pack COUNT scales with intensity (denser nearer the source).
    // Every fielded body wears the outbreak's STRAIN — the Plaguebound court IS
    // the infection (the SYMPTOMS re-flavor: mycelia's packs are an attackable
    // network, the plague's are the sickness worn on bodies).
    if (roster?.table?.length) {
      const packs = Math.max(1, Math.round(
        cfg.packCount[0] + (cfg.packCount[1] - cfg.packCount[0]) * (0,sources.clamp)(info.intensity, 0, 1)));
      for (let pk = 0; pk < packs; pk++) {
        const at = nativeHost.farPoint(460);
        const type = nativeHost.weightedPick(roster.table, lvl);
        const n = (0,sources.randInt)(cfg.packSize[0], cfg.packSize[1]);
        for (let k = 0; k < n; k++) {
          const m = nativeHost.createMonster(type, lvl, 'enemy');
          m.faction = cfg.faction;
          m.tag = 'contagion';
          m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-80, 80), at.y + (0,sources.rand)(-80, 80)), m.radius);
          nativeHost.actors.push(m);
          if (strain && !info.curing) nativeHost.infectActorWith(m, strain);
        }
      }
    }
    // PATIENT ZERO stands here — the ROAMING seat resolves to this zone (one
    // zone at a time; Movement III): a tagged, named boss whose fall CUTS the
    // source wherever it is caught.
    const pz = cf.patientZeroIn(def.id);
    if (pz && sources.MONSTERS[pz.bossDefId]) {
      nativeHost.spawnPatientZero(pz);
    } else if (roster?.table?.length) {
      nativeHost.notice(strain?.arrive ?? 'The air here is thick with rot…', cfg.color, 15, 'events');
    }
  }
export function birthSpawnPatientZero(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, pz: { bossDefId: string; promote: 'none' | 'champion' | 'crowned'; name?: string }): void {
    const cfg = nativeHost.sim.contagionField?.surge();
    if (!cfg) return;
    if (nativeHost.actors.some(x => !x.dead && x.tag === 'patient_zero')) return;
    const boss = nativeHost.createMonster(pz.bossDefId, Math.max(1, nativeHost.zone.level), 'enemy');
    boss.faction = cfg.faction;
    boss.tag = 'patient_zero';
    if (pz.promote !== 'none') {
      nativeHost.promoteRarity(boss, pz.promote === 'crowned' ? 'crowned' : 'champion',
        pz.name ? { distinctName: pz.name } : undefined);
    } else if (pz.name) {
      boss.name = pz.name;
    }
    boss.pos = nativeHost.clampPos(nativeHost.farPoint(520, true), boss.radius);
    nativeHost.actors.push(boss);
    nativeHost.flashes.push({ pos: (0,sources.vec)(boss.pos.x, boss.pos.y), radius: 150, color: cfg.color, life: 0.8, maxLife: 0.8 });
    nativeHost.text((0,sources.vec)(boss.pos.x, boss.pos.y - 60),
      `${boss.name} festers here — cut out the source!`, cfg.color, 18);
  }
export function birthInfectActorWith(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, a: Actor, strain: StrainDef): void {
    const cfg = nativeHost.sim.contagionField?.surge();
    if (!cfg || !sources.STATUS_DEFS[strain.statusId]) return;
    if (!nativeHost.contagionLeans.has(a.id)) {
      nativeHost.contagionLeans.set(a.id, { watch: a.watch });
      a.watch = {
        ...(a.watch ?? {}),
        riseSec: (a.watch?.riseSec ?? sources.WATCH_CFG.riseSec) * cfg.infection.dullMul,
      };
    }
    a.applyStatus(strain.statusId, 0, 1, 'the contagion');
    // THE MUTANT'S GROWTH (Movement III): a strain that declares a graft
    // SPROUTS it on the taken body — once per infection (the leans entry is
    // the latch, so a killed tentacle STAYS killed; the cure's revert clears
    // the entry and a later outbreak grows fresh). Rides the ONE graft verb:
    // host death kills the growth, the growth's death frees the host — the
    // composite fabric's standing asymmetry, inherited whole.
    const lean = nativeHost.contagionLeans.get(a.id);
    if (strain.graft && lean && !lean.grafted) {
      lean.grafted = true;
      nativeHost.graftPart(a, strain.graft, { key: sources.CONTAGION_GRAFT_KEY, flash: true });
    }
  }
export function birthFreezeStandingWater(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources): boolean {
    const ice = (0,sources.liquidOf)(sources.DEEPWINTER_FROZEN_LIQUID).doodad;
    if (!ice) return false;
    if (nativeHost.dwIceArr === nativeHost.doodads && nativeHost.dwIceLen === nativeHost.doodads.length
      && nativeHost.dwIceRev === nativeHost.doodadsRev) return false;
    const thaws = new Set<string>(sources.DEEPWINTER_THAWED_LIQUIDS
      .map(id => (0,sources.liquidOf)(id).doodad)
      .filter((k): k is DoodadKind => !!k));
    thaws.delete(ice); // never swap ice for ice (a row aliased to the frozen kind)
    const iced: Doodad[] = [];
    for (const d of nativeHost.doodads) if (thaws.has(d.kind)) iced.push(d);
    // Bump ONLY when something actually changed, and only the FAMILIES the
    // swap touched (neither kind blocks a foot, so the nav grid never
    // re-rasterizes for it) — a re-entry onto already-frozen ground finds
    // nothing and stays perfectly silent. TWICE, though, and deliberately:
    // family bits are read off d.kind, so the kind we VACATE must be told
    // before the swap and the kind we ARRIVE AT after it. (Water and ice sit
    // in exactly the same families today, so the pair is a formality — but
    // the swap must not quietly depend on that staying true.)
    if (iced.length) {
      nativeHost.markDoodadsChanged(iced);
      for (const d of iced) {
        d.kind = ice;
        delete d.shallow; // "water only: a ford" — a frozen ford is just ice
      }
      nativeHost.markDoodadsChanged(iced);
    }
    nativeHost.dwIceArr = nativeHost.doodads;
    nativeHost.dwIceLen = nativeHost.doodads.length;
    nativeHost.dwIceRev = nativeHost.doodadsRev; // AFTER the bump — our own change is settled
    return iced.length > 0;
  }
export function birthMaterializeDeepwinter(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const df = nativeHost.sim.deepwinterField;
    if (!df) return;
    const info = df.frostOn(def.id);
    if (!info) return;
    const cfg = df.surge();
    // THE ENTRY FREEZE (idempotent, per entry — and live): a whiteout standing
    // over open, flowing water is the one contradiction the MINT-TIME freeze
    // cannot reach. layoutRecipes' `freezeAt` only shapes ground minted AFTER
    // the front arrived; this hook converts zones that were charted long
    // before it. The swap itself (and its whole story — registry resolution,
    // scope, transience, the scan memo) is freezeStandingWater: ONE
    // implementation, shared with the co-op wire's client apply.
    nativeHost.freezeStandingWater();
    // CONVERSION DRESSING (idempotent, per entry): the ground wakes deep in
    // snow and HOLDS it (the runtime floor), and the whiteout walks the zone.
    nativeHost.snowCover = Math.max(nativeHost.snowCover, cfg.snow.cover);
    nativeHost.snowFloor = Math.max(nativeHost.snowFloor, cfg.snow.floor);
    const fog = nativeHost.fogEnsure();
    const bankDef = sources.FOG_BANKS[cfg.whiteout.kind];
    if (fog && bankDef) {
      const have = fog.banks.filter(b => b.def.id === cfg.whiteout.kind).length;
      const want = (0,sources.randInt)(cfg.whiteout.banks[0], cfg.whiteout.banks[1]);
      for (let i = have; i < want; i++) {
        const b = fog.spawnBank(bankDef);
        b.age = (0,sources.rand)(0, b.life * 0.6); // staggered — the white never breathes in unison
      }
    }
    // THE MUSTER — once per zone visit.
    if (nativeHost.materializedDeepwinter.has(def.id)) return;
    nativeHost.materializedDeepwinter.add(def.id);
    // DISCOVERY — walking held ground surfaces the Vault tuning (one-shot per
    // front), exactly like the Contagion "you've stumbled in" bump.
    if (df.markDiscovered(def.id)) (0,sources.bumpLedger)(nativeHost.ledger, 'deepwinter_seen');
    const lvl = Math.max(1, def.level);
    const roster = sources.FACTIONS[cfg.faction];
    // The court: pack COUNT scales with intensity (thicker near the heart);
    // the thaw fields HALF (a retreating army leaves rearguards, not hosts).
    if (roster?.table?.length) {
      let packs = Math.max(1, Math.round(
        cfg.packCount[0] + (cfg.packCount[1] - cfg.packCount[0]) * (0,sources.clamp)(info.intensity, 0, 1)));
      if (info.thawing) packs = Math.max(1, Math.round(packs / 2));
      for (let pk = 0; pk < packs; pk++) {
        const at = nativeHost.farPoint(460);
        const type = nativeHost.weightedPick(roster.table, lvl);
        const n = (0,sources.randInt)(cfg.packSize[0], cfg.packSize[1]);
        for (let k = 0; k < n; k++) {
          const m = nativeHost.createMonster(type, lvl, 'enemy');
          m.faction = cfg.faction;
          m.tag = 'deepwinter';
          m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-80, 80), at.y + (0,sources.rand)(-80, 80)), m.radius);
          nativeHost.actors.push(m);
        }
      }
    }
    // THE WINTER KING holds the glacial heart — a tagged (Crowned) boss whose
    // fall breaks the winter and starts the thaw. He crowns himself AT THE
    // WHEEL: the grafted arena's rotor lane (the smallest track wearing his
    // ownerTag) marks the dais, so the King rises among his own blades —
    // spared by their faction grammar, anchored by his ice habitat. Hearts
    // from older saves (plain frozen_lake, no lanes) keep the far-point rise.
    const king = df.kingIn(def.id);
    if (king && sources.MONSTERS[king.bossDefId]) {
      const boss = nativeHost.createMonster(king.bossDefId, lvl, 'enemy');
      boss.faction = cfg.faction;
      boss.tag = 'winter_king';
      if (king.promote !== 'none') nativeHost.promoteRarity(boss, king.promote === 'crowned' ? 'crowned' : 'champion');
      let daisAt: Vec2 | null = null;
      let daisArea = Infinity;
      for (const tr of nativeHost.tracks) {
        if (tr.spec.ownerTag !== 'winter_king') continue;
        const area = (tr.bound.x1 - tr.bound.x0) * (tr.bound.y1 - tr.bound.y0);
        if (area < daisArea) {
          daisArea = area;
          daisAt = (0,sources.vec)((tr.bound.x0 + tr.bound.x1) / 2, (tr.bound.y0 + tr.bound.y1) / 2);
        }
      }
      boss.pos = nativeHost.clampPos(daisAt ?? nativeHost.farPoint(520, true), boss.radius);
      nativeHost.actors.push(boss);
      nativeHost.flashes.push({ pos: (0,sources.vec)(boss.pos.x, boss.pos.y), radius: 150, color: cfg.color, life: 0.8, maxLife: 0.8 });
      nativeHost.text((0,sources.vec)(boss.pos.x, boss.pos.y - 60),
        `${boss.name} holds his court here — break the winter!`, cfg.color, 18);
    } else if (roster?.table?.length) {
      nativeHost.notice(info.thawing ? 'The frost here is in retreat — the court covers its withdrawal…'
          : 'The winter holds this land — the air itself bites…', cfg.color, 15, 'events');
    }
  }
export function birthMaterializeInfestation(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const vf = nativeHost.sim.verminfallField;
    if (!vf) return;
    const info = vf.infestOn(def.id);
    if (!info) return;
    if (nativeHost.materializedInfestation.has(def.id)) return;
    nativeHost.materializedInfestation.add(def.id);
    // DISCOVERY — walking a claimed zone surfaces the Vault tuning (one-shot per
    // infestation), exactly like the Contagion "you've stumbled in" bump.
    if (vf.markDiscovered(def.id)) (0,sources.bumpLedger)(nativeHost.ledger, 'infestation_seen');
    const cfg = vf.surge();
    const lvl = Math.max(1, def.level);
    // THE NESTS: exactly the standing count — a broken warren stays broken.
    for (let i = 0; i < info.nestsRemaining; i++) {
      const nest = nativeHost.createMonster(sources.FIXTURE_IDS.warren_nest, lvl, 'enemy');
      nest.faction = cfg.faction;
      nest.tag = 'warren_nest';
      nest.pos = nativeHost.clampPos(nativeHost.farPoint(430), nest.radius);
      nativeHost.actors.push(nest);
    }
    // THE TIDE: pack count lerps with how much of the warren still stands.
    const roster = sources.FACTIONS[cfg.faction];
    if (roster?.table?.length) {
      const seethe = info.nestsTotal > 0 ? info.nestsRemaining / info.nestsTotal : 0;
      const packs = Math.max(1, Math.round(
        cfg.packCount[0] + (cfg.packCount[1] - cfg.packCount[0]) * seethe));
      for (let pk = 0; pk < packs; pk++) {
        const at = nativeHost.farPoint(460);
        const type = nativeHost.weightedPick(roster.table, lvl);
        const n = (0,sources.randInt)(cfg.packSize[0], cfg.packSize[1]);
        for (let k = 0; k < n; k++) {
          const m = nativeHost.createMonster(type, lvl, 'enemy');
          m.faction = cfg.faction;
          m.tag = 'vermin';
          m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-80, 80), at.y + (0,sources.rand)(-80, 80)), m.radius);
          nativeHost.actors.push(m);
        }
      }
    }
    // THE KING, if he was left walking (all nests broken, the ground unclaimed).
    if (info.kingArmed && sources.MONSTERS[cfg.kingDefId]) {
      const king = nativeHost.createMonster(cfg.kingDefId, Math.max(1, lvl + cfg.kingLevelBonus), 'enemy');
      king.faction = cfg.faction;
      king.tag = 'rat_king_manifest';
      king.pos = nativeHost.clampPos(nativeHost.farPoint(520, true), king.radius);
      nativeHost.actors.push(king);
      nativeHost.text((0,sources.vec)(king.pos.x, king.pos.y - 60),
        `${king.name} still walks the broken warren!`, cfg.color, 18);
    } else if (info.nestsRemaining > 0) {
      nativeHost.notice('The ground here is riddled with warrens…', cfg.color, 15, 'events');
    }
  }
export function birthMaterializeCandle(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const lc = nativeHost.sim.longCandleField;
    if (!lc) return;
    const info = lc.candleOn(def.id);
    if (!info) return;
    if (nativeHost.materializedCandle.has(def.id)) return;
    nativeHost.materializedCandle.add(def.id);
    const cfg = lc.surge();
    const lvl = Math.max(1, def.level);
    const muster = (facId: string, tag: string): void => {
      const roster = sources.FACTIONS[facId];
      if (!roster?.table?.length) return;
      const packs = (0,sources.randInt)(cfg.packCount[0], cfg.packCount[1]);
      for (let pk = 0; pk < packs; pk++) {
        const at = nativeHost.farPoint(460);
        const type = nativeHost.weightedPick(roster.table, lvl);
        const n = (0,sources.randInt)(cfg.packSize[0], cfg.packSize[1]);
        for (let k = 0; k < n; k++) {
          const m = nativeHost.createMonster(type, lvl, 'enemy');
          m.faction = facId;
          m.tag = tag;
          m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-80, 80), at.y + (0,sources.rand)(-80, 80)), m.radius);
          nativeHost.actors.push(m);
        }
      }
    };
    if (info.vigil) {
      (0,sources.bumpLedger)(nativeHost.ledger, 'vigil_seen'); // the WAX side only — a convene-only claim never stamps it
      const n = (0,sources.randInt)(cfg.shrines[0], cfg.shrines[1]);
      for (let i = 0; i < n; i++) {
        const shrine = nativeHost.createMonster(sources.FIXTURE_IDS.candle_shrine, lvl, 'enemy');
        shrine.faction = cfg.waxFaction;
        shrine.tag = 'candle_shrine';
        shrine.pos = nativeHost.clampPos(nativeHost.farPoint(430), shrine.radius);
        nativeHost.actors.push(shrine);
      }
      muster(cfg.waxFaction, 'wax_vigil');
    }
    if (info.convene) muster(cfg.umbralFaction, 'umbral_parliament');
    const line = info.vigil && info.convene
      ? 'Wax and shadow war over this ground — the candles say whose night it is.'
      : info.vigil
        ? 'The Wax Court processes here — candle-shrines hold the dark open.'
        : 'The Parliament convenes — the dark here is a chamber in session.';
    nativeHost.notice(line, info.vigil ? cfg.waxColor : cfg.umbralColor, 15, 'events');
  }
export function birthMaterializeStarfall(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    if ((0,sources.skyOf)(def) === 'sheltered') return; // no meteors indoors
    const front = nativeHost.sim.weather.sample(def);
    if (front?.kind !== 'starfall') return;
    if (nativeHost.materializedStarfall.has(def.id)) return;
    nativeHost.materializedStarfall.add(def.id);
    (0,sources.bumpLedger)(nativeHost.ledger, 'starfall_seen');
    const cfg = sources.STARFALL_CFG;
    const lvl = Math.max(1, def.level);
    const roster = sources.FACTIONS[cfg.faction];
    if (roster?.table?.length) {
      const packs = (0,sources.randInt)(cfg.packCount[0], cfg.packCount[1]);
      for (let pk = 0; pk < packs; pk++) {
        const at = nativeHost.farPoint(460);
        const type = nativeHost.weightedPick(roster.table, lvl);
        const n = (0,sources.randInt)(cfg.packSize[0], cfg.packSize[1]);
        for (let k = 0; k < n; k++) {
          const m = nativeHost.createMonster(type, lvl, 'enemy');
          m.faction = cfg.faction;
          m.tag = 'starfall';
          m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-80, 80), at.y + (0,sources.rand)(-80, 80)), m.radius);
          nativeHost.actors.push(m);
        }
      }
    }
    // THE HEART: sometimes an impact STOOD — an anchored lattice worth breaking.
    if ((0,sources.chance)(cfg.heartChance) && sources.MONSTERS[cfg.heartDefId]) {
      const heart = nativeHost.createMonster(cfg.heartDefId, lvl, 'enemy');
      heart.faction = cfg.faction;
      heart.tag = 'fallen_star';
      heart.pos = nativeHost.clampPos(nativeHost.farPoint(500, true), heart.radius);
      nativeHost.actors.push(heart);
    }
    nativeHost.notice('The sky is coming down in crystal — and something grew where it landed…', cfg.color, 15, 'events');
  }
export function birthMaterializeMycelia(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const mf = nativeHost.sim.myceliaField;
    if (!mf) return;
    const info = mf.sporeOn(def.id);
    if (!info) return;
    if (nativeHost.materializedMycelia.has(def.id)) return;
    nativeHost.materializedMycelia.add(def.id);
    if ((nativeHost.ledger.mycelia_seen ?? 0) === 0) (0,sources.bumpLedger)(nativeHost.ledger, 'mycelia_seen'); // DISCOVERY (once)
    const cfg = mf.surge();
    const lvl = Math.max(1, def.level);
    const roster = sources.FACTIONS[cfg.faction];
    // Pour the horde FROM the exit facing the core (the bloom creeping in from that road);
    // a core zone (or a dead-end) pours from a far point instead.
    const coreId = mf.activeBloom()?.coreZoneId;
    let from = nativeHost.farPoint(440);
    if (coreId && coreId !== def.id) {
      const ex = nativeHost.exits.find(e => e.to === coreId);
      if (ex) from = (0,sources.vec)(ex.pos.x, ex.pos.y);
    }
    if (roster?.table?.length) {
      const packs = Math.max(1, Math.round(1 + 3 * (0,sources.clamp)(info.density, 0, 1))); // 1..4 by density
      for (let pk = 0; pk < packs; pk++) {
        const at = nativeHost.clampPos((0,sources.vec)(from.x + (0,sources.rand)(-110, 110), from.y + (0,sources.rand)(-110, 110)), 24);
        const type = nativeHost.weightedPick(roster.table, lvl);
        const n = (0,sources.randInt)(2, 4);
        for (let k = 0; k < n; k++) {
          const m = nativeHost.createMonster(type, lvl, 'enemy');
          m.faction = cfg.faction;
          m.tag = 'mycelia';
          m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-50, 50), at.y + (0,sources.rand)(-50, 50)), m.radius);
          nativeHost.actors.push(m);
        }
      }
    }
    // THE HEARTBLOOM holds the core (toggleable) — felling it FORCES the bloom's collapse.
    const hb = mf.heartbloomIn(def.id);
    if (hb && sources.MONSTERS[hb.defId]) {
      const boss = nativeHost.createMonster(hb.defId, lvl, 'enemy');
      boss.faction = cfg.faction;
      boss.tag = 'mycelia_heart';
      if (hb.promote !== 'none') {
        // THE EARNED CROWN: below the spec's promoteAt the bloom stands champion instead.
        const crowned = hb.promote === 'crowned' && (hb.promoteAt == null || lvl >= hb.promoteAt);
        nativeHost.promoteRarity(boss, crowned ? 'crowned' : 'champion');
      }
      boss.pos = nativeHost.clampPos(nativeHost.farPoint(520, true), boss.radius);
      nativeHost.actors.push(boss);
      nativeHost.flashes.push({ pos: (0,sources.vec)(boss.pos.x, boss.pos.y), radius: 150, color: cfg.color, life: 0.8, maxLife: 0.8 });
      nativeHost.text((0,sources.vec)(boss.pos.x, boss.pos.y - 60),
        `${boss.name} pulses at the bloom's heart — strike it to collapse the spread!`, cfg.color, 18);
    } else if (roster?.table?.length) {
      nativeHost.notice('Spores choke the air — the Bloom has taken this ground…', cfg.color, 15, 'events');
    }
  }
export function birthMaterializeBrood(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const sf = nativeHost.sim.swarmingField;
    if (!sf) return;
    const info = sf.broodOn(def.id);
    if (!info || nativeHost.materializedBroods.has(def.id)) return;
    nativeHost.materializedBroods.add(def.id);
    // DISCOVERY — walking a brood ground surfaces the Vault tuning (one-shot
    // per ground), exactly like the herd's first catch.
    if (sf.markBroodSeen(def.id)) (0,sources.bumpLedger)(nativeHost.ledger, 'swarming_seen');
    const cfg = sf.surge();
    if (!sources.MONSTERS[cfg.hiveNodeId]) return;
    const lvl = Math.max(1, def.level);
    for (let i = 0; i < info.standing; i++) {
      const node = nativeHost.createMonster(cfg.hiveNodeId, lvl, 'enemy');
      node.faction = cfg.faction;
      node.tag = 'swarm_brood_node';
      node.pos = nativeHost.clampPos(nativeHost.farPoint(420), node.radius);
      nativeHost.actors.push(node);
    }
    if (info.standing > 0) {
      nativeHost.notice(`The sand hums — ${info.standing} hive throat${info.standing === 1 ? '' : 's'} stand here (${info.tally}/${info.threshold} and the swarm wings)`, info.color, 15, 'events');
    }
  }
export function birthMaterializeSwarmWake(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const sf = nativeHost.sim.swarmingField;
    if (!sf) return;
    const n = sf.cachesIn(def.id);
    if (n <= 0 || nativeHost.materializedSwarmWake.has(def.id)) return;
    nativeHost.materializedSwarmWake.add(def.id);
    const cfg = sf.surge();
    if (!sources.MONSTERS[cfg.cacheId]) return;
    const lvl = Math.max(1, def.level);
    for (let i = 0; i < n; i++) {
      const cache = nativeHost.createMonster(cfg.cacheId, lvl, 'enemy');
      cache.tag = 'royal_cache';
      cache.pos = nativeHost.clampPos(nativeHost.farPoint(380), cache.radius);
      nativeHost.actors.push(cache);
    }
    nativeHost.notice('Amber glistens in the swarm\'s wake…', '#f0c060', 14, 'events');
  }
export function birthMaterializeWorldBossFight(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    const f = nativeHost.sim.worldBossFieldFor(def.dimension);
    if (!f) return;
    const fight = f.fightAt(def.id);
    if (!fight || nativeHost.materializedWorldBoss.has(fight.instanceId) || nativeHost.wbBoss) return;
    const at = nativeHost.clearTransitSpot(nativeHost.clampPos(nativeHost.farPoint(340), 80), 110);
    // The LAIR's throne rises first — the habitat ground the sovereign binds to
    // (the per-frame confine sweep welds the body to the nearest matching dais).
    if (fight.archetype === 'lair' && fight.def.lair) {
      nativeHost.doodads.push({ pos: (0,sources.vec)(at.x, at.y), radius: fight.def.lair.radius ?? 130, kind: fight.def.lair.structureKind });
    }
    // Ground minted FOR the fight (a venue-'arena' coil, a lair) already
    // carries the level bonus in its ZoneDef; a fight standing on ORDINARY
    // world ground — an apparition, or a settled serpent under THE SETTLED
    // GROUND venue — takes it here.
    const lvl = Math.max(1, def.level + (!def.special ? (fight.def.levelBonus ?? 0) : 0));
    const m = nativeHost.createMonster(fight.def.monster, lvl, 'enemy');
    m.pos = (0,sources.vec)(at.x, at.y);
    m.tag = 'worldboss_boss';
    m.eventKey = fight.instanceId;
    nativeHost.actors.push(m);
    if (fight.bossLifeFrac < 1) m.life = Math.max(1, m.maxLife() * fight.bossLifeFrac);
    const esc = fight.def.escort;
    if (esc && esc.table.length) {
      const n = (0,sources.randInt)(esc.count[0], esc.count[1]);
      for (let k = 0; k < n; k++) {
        const g = nativeHost.createMonster(nativeHost.weightedPick(esc.table, lvl), lvl, 'enemy');
        g.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-150, 150), at.y + (0,sources.rand)(-150, 150)), g.radius);
        nativeHost.actors.push(g);
      }
    }
    if (fight.archetype === 'apparition') {
      nativeHost.flashes.push({ pos: (0,sources.vec)(at.x, at.y), radius: 200, color: fight.def.color, life: 0.9, maxLife: 0.9 });
      nativeHost.text((0,sources.vec)(at.x, at.y - 70), `${fight.def.name} has RISEN!`, fight.def.color, 18);
    }
    nativeHost.wbBoss = m;
    nativeHost.wbBossKey = fight.instanceId;
    nativeHost.materializedWorldBoss.add(fight.instanceId);
    (0,sources.bumpLedger)(nativeHost.ledger, 'worldboss_seen');
  }
export function birthHasNpcRole(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, a: Actor, role: string): boolean {
    return !a.dead && !!a.defId && sources.MONSTERS[a.defId]?.npcRole === role;
  }
export function birthPlaceCaravanReturn(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {
    if (!def.id.startsWith('caravan_band_')) return;
    if (nativeHost.actors.some(a => nativeHost.hasNpcRole(a, 'caravanner'))) return;
    const c = nativeHost.createMonster(sources.FIXTURE_IDS.townsfolk_caravanner, 1, 'player');
    c.untargetable = true; // the band's monsters ignore the escort
    c.pos = nativeHost.clampPos((0,sources.vec)(nativeHost.player.pos.x + 54, nativeHost.player.pos.y + 28), c.radius);
    nativeHost.actors.push(c);
  }
export function birthActorById(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, id: number): Actor | undefined {
    return nativeHost.actors.find(a => a.id === id);
  }
export function birthGraftPart(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, host: Actor, pd: MonsterPartDef, opts?: { key?: string; flash?: boolean }): Actor | null {
    if (host.dead || host.partLink || !sources.MONSTERS[pd.monster]) return null;
    const part = nativeHost.createMonster(pd.monster, host.level, host.team);
    part.faction = host.faction;
    part.anchored = true;          // rigid: never shoved off the frame
    part.xpValue = 0;              // the HOST pays any bounty
    part.fromZoneGen = false;      // never snapshotted apart from it
    part.partLink = { root: host, def: pd };
    (0,sources.clearPartScar)(host, pd);
    part.graftKey = opts?.key;
    if (pd.lifeFrac) {
      // Aim the FINAL pool at frac × host max: set the base, measure what
      // the level curve turns it into, and rescale — so a part is exactly
      // its share of the beast at any spawn level.
      const target = Math.max(1, Math.round(host.maxLife() * pd.lifeFrac));
      part.sheet.setBase('life', target);
      const got = part.maxLife();
      if (got > 1 && Math.abs(got - target) > 1) {
        part.sheet.setBase('life', Math.max(1, target * (target / got)));
      }
      part.fillResources();
    }
    // Seat it in the host's facing frame NOW (updateParts re-holds it every
    // tick) — a runtime graft must never flash into the world at a stranger's
    // coordinates for one frame.
    const c = Math.cos(host.facing), s = Math.sin(host.facing);
    part.pos.x = host.pos.x + (pd.dx * c - pd.dy * s) * host.radius;
    part.pos.y = host.pos.y + (pd.dx * s + pd.dy * c) * host.radius;
    (host.partActors ??= []).push(part);
    nativeHost.actors.push(part);
    if (opts?.flash) {
      nativeHost.flashes.push({
        pos: (0,sources.vec)(part.pos.x, part.pos.y), radius: part.radius * 1.6,
        color: part.color, life: 0.35, maxLife: 0.35,
      });
    }
    return part;
  }
export function birthFogEnsure(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources): FogField | null {
    if (nativeHost.fog) return nativeHost.fog;
    if (nativeHost.arena.boundless) return null;
    nativeHost.fog = new sources.FogField(
      new sources.Rng((nativeHost.currentZoneSeed ^ sources.FOG_CFG.salt) >>> 0),
      nativeHost.arena.w, nativeHost.arena.h);
    return nativeHost.fog;
  }