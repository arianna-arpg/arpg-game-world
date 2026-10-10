/** Exact native scene census, birth and objective services.
 * Complete originals are pinned in probe_nativescenepopulation.ts. Current installed native sources are intentional. No source issuer is claimed. */
import type { World } from './world';
import type { Actor } from './actor';
import type { NativeAreaBirthMemory as ZoneMemory } from './nativeAreaBirth';
import type { ZoneDef, ObjectiveSpec, PackTableEntry } from '../data/zones';
import type { WaveFrenzySpec } from '../data/waves';
import { WAVE_CFG } from '../data/waves';
import { Rng } from '../core/rng';
import { rand, randInt, vec, dist, clamp, type Vec2 } from '../core/math';
import { samplePoint } from '../world/shape';
import { MONSTERS, FACTIONS, AMBIENT_TAGS, WAVE_TABLE } from '../data/monsters';
import { CLEAR_CFG } from '../data/objectives';
import { readMagicPack } from './magicPacks';
import { readEncounterGroup, applyEncounterGroup } from './encounterGroups';
import { restoreMovementTether } from './movementTether';
import { mod } from './stats';
import { coopScale, COOP_SCALING } from '../data/coop';
import { MERC_CFG } from '../meta/mercs';
export interface NativeSceneServiceHost {
  actors:World['actors'];
  createMonster:World['createMonster'];
  nextSquadId:World['nextSquadId'];
  promoteRarity:World['promoteRarity'];
  clampPos:World['clampPos'];
  refreshMagicPacks:World['refreshMagicPacks'];
  objectiveCountable:World['objectiveCountable'];
  isAmbientTag:World['isAmbientTag'];
  confineUnreachable:World['confineUnreachable'];
  pathField:World['pathField'];
  zoneEntry:World['zoneEntry'];
  countedEnemies:World['countedEnemies'];
  sim:World['sim'];
  farPoint:World['farPoint'];
  weightedPick:World['weightedPick'];
  notice:World['notice'];
  wave:World['wave'];
  waveActive:World['waveActive'];
  zone:World['zone'];
  effectiveSpawn:World['effectiveSpawn'];
  baseTable:World['baseTable'];
  player:World['player'];
  spawnPoint:World['spawnPoint'];
  walk:World['walk'];
  pointInSolid:World['pointInSolid'];
  structures:World['structures'];
  applyWaveFrenzy:World['applyWaveFrenzy'];
  text:World['text'];
  arena:World['arena'];
  farthestStand:World['farthestStand'];
  time:World['time'];
  seats:World['seats'];
  partyScaleCount:World['partyScaleCount'];
}
export function restoreSceneEnemies(host:Pick<NativeSceneServiceHost,'actors'|'createMonster'|'nextSquadId'|'promoteRarity'|'clampPos'|'refreshMagicPacks' >, memory: ZoneMemory):void {
    host.actors = host.actors.filter(a => !(a.fromZoneGen && a.team === 'enemy'));
    const magicPackIds = new Map<number, number>();
    const encounterGroupIds = new Map<number, number>();
    for (const e of memory.enemies) {
      if (!MONSTERS[e.defId]) continue;
      const m = host.createMonster(e.defId, Math.max(1, e.level), 'enemy');
      const magicPack = e.rarity === 'magic' ? readMagicPack(e.magicPack) : undefined;
      if (magicPack) {
        if (!magicPackIds.has(magicPack.id)) magicPackIds.set(magicPack.id, host.nextSquadId());
        m.magicPack = { ...magicPack, id: magicPackIds.get(magicPack.id)! };
        m.squadId = m.magicPack.id;
        m.squadLeader = m.magicPack.leader === 1;
      }
      if (e.faction) m.faction = e.faction;
      const encounterGroup = readEncounterGroup(e.encounterGroup);
      if (encounterGroup) {
        if (!encounterGroupIds.has(encounterGroup.id)) encounterGroupIds.set(encounterGroup.id, m.magicPack?.id ?? host.nextSquadId());
        applyEncounterGroup(m, { ...encounterGroup, id: encounterGroupIds.get(encounterGroup.id)! });
      }
      if (e.rarity) host.promoteRarity(m, e.rarity);
      if (e.name) m.name = e.name; // the exact remembered name, never a re-roll
      if (e.tag) m.tag = e.tag;
      if (e.tier) m.tier = e.tier; // the tier fabric: a deck body returns to its deck
      if (e.aiAwakened) m.aiAwakened = true; // the rouse latch — woken stays woken
      m.fromZoneGen = true;
      m.pos = host.clampPos(vec(e.x, e.y), m.radius, undefined, { mover: m });
      m.fillResources();
      m.life = Math.max(1, Math.min(m.maxLife(), e.life));
      m.movementTether = restoreMovementTether(e.movementTether);
      host.actors.push(m);
    }
    host.refreshMagicPacks();
  }

export function sceneCountedEnemies(host:Pick<NativeSceneServiceHost,'actors'|'objectiveCountable' >):Actor[] {
    return host.actors.filter(a => !a.dead && host.objectiveCountable(a));
  }

export function sceneObjectiveCountable(host:Pick<NativeSceneServiceHost,'isAmbientTag'|'confineUnreachable' >, a: Actor):boolean {
    return a.team === 'enemy'
      && !host.isAmbientTag(a.tag)
      // ACTOR-level scenery armor is the same soft-lock guard one layer
      // down: a planted body no build can even FIGHT — a throng husk
      // waiting to be claimed, an extraction node — must never gate a
      // clear (the Hivecaller's own unclaimed husks were walling the
      // objective). Def-level passive/noObjective below covers KINDS;
      // this covers the armor stamped onto ordinary kinds at plant time.
      // Deliberately the full pair — a merely-untargetable body (a phased
      // boss, a warded heart) still counts and still gates.
      && !(a.passive && a.untargetable)
      && !(a.defId && (MONSTERS[a.defId]?.passive || MONSTERS[a.defId]?.noObjective))
      && !host.confineUnreachable(a);
  }

export function sceneConfineUnreachable(host:Pick<NativeSceneServiceHost,'pathField'|'zoneEntry' >, a: Actor):boolean {
    const c = a.confine;
    if (!c) return false;
    const f = host.pathField();
    if (!f || !f.reachable) return false;
    if (!f.isWalkable(host.zoneEntry.x, host.zoneEntry.y)) return false;
    return !f.reachable(host.zoneEntry, vec(c.x, c.y));
  }

export function sceneRollCullNeed(host:Pick<NativeSceneServiceHost,'countedEnemies' >, o: Extract<ObjectiveSpec, { kind: 'clear' }>, rng: Rng):number {
    if (typeof o.need === 'number') return Math.max(1, Math.floor(o.need));
    if (o.need) return Math.max(1, rng.int(Math.floor(o.need[0]), Math.floor(o.need[1])));
    const pop = host.countedEnemies().length;
    if (!pop) return 0;
    return Math.min(pop, clamp(Math.round(pop * (o.frac ?? CLEAR_CFG.frac)), CLEAR_CFG.min, CLEAR_CFG.max));
  }

export function sceneLivingSpawners(host:Pick<NativeSceneServiceHost,'actors' >):Actor[] {
    return host.actors.filter(a => !a.dead && !!a.defId && !!MONSTERS[a.defId]?.spawner);
  }

export function spawnSceneContest(host:Pick<NativeSceneServiceHost,'sim'|'farPoint'|'weightedPick'|'createMonster'|'clampPos'|'actors'|'notice' >, def: ZoneDef, factions: string[]):void {
    if (factions.length < 1) return;
    const multi = factions.length >= 2;
    const order = multi ? host.sim.rankContest(def.id, factions) : factions;
    order.forEach((fid, rank) => {
      const roster = FACTIONS[fid];
      if (!roster) return;
      // Two+ contenders: the dominant fields more. A lone invader pours in a
      // full warband — the zone's own packs are the defenders it crashes into.
      const packs = multi ? (rank === 0 ? 2 : 1) : 2;
      for (let pk = 0; pk < packs; pk++) {
        const at = host.farPoint(650);
        const type = host.weightedPick(roster.table, Math.max(1, def.level));
        for (let k = 0; k < randInt(3, 5); k++) {
          const m = host.createMonster(type, Math.max(1, def.level), 'enemy');
          // Contest bodies fight under the CONTESTANT'S banner, not their def's
          // — a conscript roster (a hell lord's host fielding Legion rabble)
          // must brawl AS the host, or the two sides read as one census and
          // never fight (every sibling spawner stamps the same way).
          m.faction = fid;
          m.pos = host.clampPos(vec(at.x + rand(-80, 80), at.y + rand(-80, 80)), m.radius);
          host.actors.push(m);
        }
      }
    });
    if (multi) {
      host.notice(`${FACTIONS[order[0]]?.name ?? order[0]} contests ${FACTIONS[order[1]]?.name ?? order[1]}!`, '#e85050', 15, 'war');
    } else {
      host.notice(`${FACTIONS[order[0]]?.name ?? order[0]} invades!`, '#e8a050', 15, 'war');
    }
  }

export function spawnSceneWave(host:Pick<NativeSceneServiceHost,'wave'|'waveActive'|'zone'|'effectiveSpawn'|'baseTable'|'weightedPick'|'player'|'spawnPoint'|'createMonster'|'walk'|'pointInSolid'|'structures'|'zoneEntry'|'clampPos'|'applyWaveFrenzy'|'actors'|'text' >):void {
    host.wave++;
    host.waveActive = true;
    // Leveled zones draw a WEIGHTED table so day/night, weather, and a faction
    // contest actually reshape who attacks; a PACKLESS arena (The Pit) runs
    // the flat WAVE_TABLE escalation at zone level — which the Pit re-stamps
    // from the CHARACTER on every entry (levelWith), creeping +1 per 2 waves.
    // (A hypothetical level-0 arena keeps the classic level = wave ladder.)
    const level = host.zone.level > 0
      ? host.zone.level + Math.floor((host.wave - 1) / 2)
      : host.wave;
    let pickType: () => string;
    if (host.zone.packs) {
      const e = host.effectiveSpawn(host.zone, host.baseTable(host.zone));
      const table: PackTableEntry[] = e.table
        .filter(en => MONSTERS[en.id])
        .map(en => ({ id: en.id, weight: en.weight, presence: en.presence }));
      // Contested ground bleeds into the assault — the rival rosters join in.
      for (const fid of e.inject) {
        for (const en of FACTIONS[fid]?.table ?? []) {
          if (!MONSTERS[en.id]) continue;
          const ex = table.find(t => t.id === en.id);
          if (ex) ex.weight += en.weight;
          else table.push({ id: en.id, weight: en.weight, presence: en.presence });
        }
      }
      pickType = (): string => host.weightedPick(table, level);
    } else {
      // Wave tiers gate entry; def-level presence still shapes the pool — but
      // folded at the WAVE number, the axis the table is designed on. Folding
      // at the (now character-stamped) zone level would let a high-level hero's
      // wave 1 exclude every early-band monster and thin the pool toward empty;
      // composition follows the wave ladder, STATS follow the hero (`level`).
      const pool: PackTableEntry[] = [];
      for (const tier of WAVE_TABLE) {
        if (host.wave >= tier.minWave) pool.push(...tier.ids.map(id => ({ id, weight: 1 })));
      }
      pickType = (): string => host.weightedPick(pool, host.wave);
    }
    // COUNT scales with the wave AND the character (data/waves.ts): an arena
    // that grows with whoever dares it, not a fixed drip.
    const cfg = WAVE_CFG;
    const count = Math.min(
      Math.round(cfg.count.base + host.wave * cfg.count.perWave + host.player.level * cfg.count.perLevel),
      cfg.count.max);
    // SURGE GROUPS: the wave breaks from a few points, not an even sprinkle —
    // every anchor is a fully-legal spawn point (reachability-checked); the
    // members ring their anchor and clamp legal, falling back onto it where
    // the ring leaves the mesh.
    const anchors: Vec2[] = [];
    for (let k = 0, n = Math.max(1, Math.ceil(count / cfg.cluster.size)); k < n; k++) {
      anchors.push(host.spawnPoint(24));
    }
    const o = host.zone.objective;
    const frenzy = o.kind === 'waves' && o.frenzy !== false ? cfg.frenzy : null;
    for (let i = 0; i < count; i++) {
      const m = host.createMonster(pickType(), level, 'enemy');
      const a = anchors[i % anchors.length];
      const ang = rand(0, Math.PI * 2), rr = rand(12, cfg.cluster.spread);
      let p = vec(a.x + Math.cos(ang) * rr, a.y + Math.sin(ang) * rr);
      // A ring position keeps ALL of spawnPoint's guarantees or falls back to
      // its anchor (which holds them by construction): on-mesh, not embedded
      // in a solid (a member born inside a boulder can strand un-killable and
      // stall the endless objective), and not across a wall into a sealed
      // interior in structure zones.
      const bad = (host.walk && !host.walk.isWalkable(p.x, p.y))
        || host.pointInSolid(p.x, p.y, m.radius * 0.5)
        || (host.structures.length > 0 && !!host.walk?.reachable
          && !host.walk.reachable(host.zoneEntry, p));
      if (bad) p = vec(a.x, a.y);
      m.pos = host.clampPos(p, m.radius);
      if (frenzy) host.applyWaveFrenzy(m, frenzy);
      // Wave bodies ARE this zone's population: flag them for Zone Memory so a
      // boundary cross remembers the mid-wave survivors alongside the counter.
      m.fromZoneGen = true;
      host.actors.push(m);
    }
    // Boss cadence is the OBJECTIVE'S data (bossEveryWaves/bossId) — any
    // survival arena declares its own lord; nothing is keyed to a zone id.
    if (o.kind === 'waves' && o.bossEveryWaves && o.bossId && host.wave % o.bossEveryWaves === 0) {
      const boss = host.createMonster(o.bossId, level + 1, 'enemy');
      boss.pos = host.spawnPoint(boss.radius);
      if (frenzy) host.applyWaveFrenzy(boss, frenzy);
      boss.fromZoneGen = true; // the wave's lord is remembered like its rank and file
      host.actors.push(boss);
      host.text(vec(host.player.pos.x, host.player.pos.y - 60), `${boss.name} emerges!`, '#ff5050', 20);
    }
  }



export function sceneSpawnPoint(host:Pick<NativeSceneServiceHost,'arena'|'walk'|'pointInSolid'|'structures'|'zoneEntry'|'player'|'clampPos'|'farthestStand' >, radius: number):Vec2 {
    for (let tries = 0; tries < 30; tries++) {
      const sp = samplePoint(host.arena, 60, rand);
      const p = vec(sp.x, sp.y);
      if (host.walk && !host.walk.isWalkable(p.x, p.y)) continue; // walk zones: on-mesh only
      if (host.pointInSolid(p.x, p.y, radius * 0.5)) continue;    // not inside a wall/rock/thicket
      // Zones with plan structures: AMBIENT spawns must not strand inside a
      // sealed interior (a walkable-but-unreachable courtyard would jam clear/
      // wave objectives). Explicit garrison/slot spawns bypass this by design.
      if (host.structures.length && host.walk?.reachable
        && !host.walk.reachable(host.zoneEntry, p)) continue;
      if (dist(p, host.player.pos) > 450) {
        // THE CLAMPED BAR (hfpocket II, 2026-08-07): clampPos resolves the
        // body's FULL radius (the solid gate above cleared only radius*0.5)
        // and can push a marginal candidate back INSIDE the grace disc — the
        // 08-07 nightly's 448-under-450 (probe_holdfast_pocket seed 471714).
        // The bar judges the point the caller actually RECEIVES: clamp
        // first, and a pulled-under candidate keeps sampling — the
        // farthestStand degrade below still floors cramped ground.
        const q = host.clampPos(p, radius);
        if (dist(q, host.player.pos) > 450) return q;
      }
    }
    // Sampling failed — usually a CRAMPED zone where nothing clears the
    // player-distance bar. The old fallback stacked everything at the entry
    // (±140) — which is exactly where an arriving player STANDS: in a tiny
    // carve the whole population teleported onto the portal (the pocket
    // death-ball). Degrade honestly instead: the reachable stand FARTHEST
    // from the player, jittered so repeated calls don't pile one spot.
    const far = host.farthestStand(radius, host.structures.length > 0);
    if (far) {
      return host.clampPos(vec(far.x + rand(-70, 70), far.y + rand(-70, 70)), radius);
    }
    // No stand at all (degenerate ground): the old last resorts.
    if (host.structures.length) {
      return host.clampPos(vec(host.zoneEntry.x + rand(-140, 140), host.zoneEntry.y + rand(-140, 140)), radius);
    }
    return host.clampPos(vec(host.arena.w / 2, host.arena.h / 2), radius); // clampPos snaps to walkable
  }

export function sceneIsAmbientTag(host:Pick<NativeSceneServiceHost,'sim' >, tag: string | undefined):boolean {
    if (!tag) return false;
    return AMBIENT_TAGS.has(tag) || !!host.sim.holdfastField?.guardianTags().has(tag);
  }

export function applySceneWaveFrenzy(host:Pick<NativeSceneServiceHost,'time' >, m: Actor, fz: WaveFrenzySpec):void {
    m.aggroed = true; // came here for you — with relentless below, detection is ∞ from frame one
    // A huge FINITE horizon, not Infinity: every other alert writer uses
    // time + duration, and a JSON round-trip (snapshots, future saves) turns
    // Infinity into null — which would read as never-alerted.
    m.alertUntil = host.time + 1e9;
    const b: NonNullable<Actor['brain']> = m.brain ?? {};
    m.brain = {
      ...b,
      perception: {
        ...b.perception,
        xray: true,
        arcDeg: 360,
        alertShout: Math.max(fz.shoutRadius, b.perception?.alertShout ?? 0),
        memory: Math.max(fz.memory, b.perception?.memory ?? 0),
        attentionSpan: undefined, // a wave never forgets you
      },
      target: {
        ...b.target,
        relentless: true,
        detectMul: Math.max(fz.detectMul, b.target?.detectMul ?? 0),
        leash: undefined,         // no giving up and walking home
        kindBias: { ...fz.kindBias },
      },
      move: {
        ...b.move,
        style: 'direct',
        closeFrac: Math.min(fz.closeFrac, b.move?.closeFrac ?? fz.closeFrac),
        pathing: 'route',         // charge AROUND walls, never pile into them
        withdraw: undefined,      // no post-strike backpedal (skirmish presets)
      },
      // NULL clears the AXIS through the archetype preset too (mergeTuning):
      // an artillery/caster body in a wave keeps its guns but loses the kite
      // budget and duty-cycle pauses its preset ships — a wave does not
      // hesitate, and it never routs.
      morale: null,
      tempo: null,
    };
    if (fz.moveSpeedMore) m.sheet.setSource('waveFrenzy', [mod('moveSpeed', 'more', fz.moveSpeedMore)]);
  }

/** keeperSeat — THE NEAR LAW (data/coop.ts shareRadius): with `at` given and a radius set, only the seats
 *  within reach of that place count; the keeper seat (the parked warden) never counts. 0 = the whole party. */
export function scenePartyScaleCount(host:Pick<NativeSceneServiceHost,'player'|'seats' >, at?: Vec2):number {
    const ease = Math.min(1, Math.max(0, host.player.sheet.get('mercEase')));
    const mercWeight = MERC_CFG.partyScaleWeight * (1 - ease);
    const near = at && COOP_SCALING.shareRadius > 0 ? COOP_SCALING.shareRadius : 0;
    return Math.max(1, host.seats.reduce((n, s) =>
      n + (s.actor.dead || s.keeper || (near > 0 && dist(at!, s.actor.pos) > near) ? 0 : s.merc ? mercWeight : 1), 0)); // keeperSeat: the warden is no party
  }

export function applyScenePartyScale(host:Pick<NativeSceneServiceHost,'partyScaleCount' >, a: Actor):void {
    const s = coopScale(host.partyScaleCount(a.pos)); // keeperSeat: scaled by the seats near the enemy itself
    if (s.life > 0 || s.damage > 0) {
      a.sheet.setSource('partyScale', [mod('life', 'more', s.life), mod('damage', 'more', s.damage)]);
    } else {
      a.sheet.removeSource('partyScale');
    }
  }
