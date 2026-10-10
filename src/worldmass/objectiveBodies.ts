import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import type { PackTableEntry, ZoneDef } from '../data/zones';
import type { Vec2 } from '../core/math';
import type { DigFinishConfig, HoldFixture, NativeDigFinishHost, NativeRiftPourHost, RiftPourConfig } from '../engine/holdObjectives';
import type { NativeBeaconConfig, NativeBeaconHost, NativeBeaconReinforceConfig, NativeBeaconTables } from '../engine/beaconObjectives';
import { sameStory } from '../engine/tiers';
import { captureNativeActorState, massDormancyPins, nativeDormancyRefusal, restoreNativeActorState, type NativeActorState } from './dormancy';
import { canonical, freezeData, massRandom, streamSeed } from './random';

interface ObjectiveBirthBase { owner: string; slot: number; sequence: number; seed: number; zone: Readonly<ZoneDef>; at: Vec2; table: PackTableEntry[] }
/** Detached native factory request. The complete birth is saved before later
 * registry changes can alter the species/count which this owner already met. */
export type MassObjectiveBirth = ObjectiveBirthBase & (
  { kind: 'rift'; count: number; config: RiftPourConfig } |
  { kind: 'beacon'; count: number; config: NativeBeaconReinforceConfig; mixTable: PackTableEntry[] } |
  { kind: 'dig'; maxBodies: number; config: DigFinishConfig['ambush'] });
export interface MassObjectiveEffects {
  actors(): ReadonlySet<Actor>;
  canRetire(): boolean;
  capture(): unknown;
  detach(): void;
  riftHost(): NativeRiftPourHost;
  digHost(slot: number): NativeDigFinishHost;
  beaconHost(): NativeBeaconHost;
}
export interface MassObjectiveBodyPolicy { population(): number; maxPopulation(owner?:string): number; retainRadius?: number; quietSeconds?: number }

const clone = <T>(v: T): T => JSON.parse(canonical(v)) as T;

interface BodyRow { key: string; ordinal: number; actorId: number; monster: string; dead: boolean; pos: Vec2; life: number; state?: NativeActorState }
interface BirthRow { request: MassObjectiveBirth; bodies: BodyRow[] }
export interface MassObjectiveBodiesSave {
  schema: 1; owner: string; clock: number; playerId: number; draws: number; sequence: number;
  births: BirthRow[]; spills: number[];
  /** Only the owner's live native lure leases; dormant time is not simulated. */
  lures?: { slot: number; remaining: number; radius: number; pace: number; standoff: number }[];
  /** Same explicit boundary as native scene saves: active transients preserve
   * birth identity, position and wounds, not resumable combat controllers. */
  transient: string[];
}
interface LiveBirth { request: MassObjectiveBirth; bodies: Map<string, Actor> }
interface LiveBodies { owner: string; births: LiveBirth[] }

/** Actual native objective populations. This class owns residence, never combat
 * rules or loot. All births use the native table/factory choke points in World. */
export class MassObjectiveBodies {
  private live = new Map<string, LiveBodies>();
  readonly retainRadius: number;
  readonly quietSeconds: number;
  constructor(readonly world: World, readonly seed: number, readonly policy: MassObjectiveBodyPolicy) {
    this.retainRadius = policy.retainRadius ?? 512; this.quietSeconds = policy.quietSeconds ?? 15;
    if (!Number.isSafeInteger(seed) || !Number.isFinite(this.retainRadius) || this.retainRadius < 256
      || !Number.isFinite(this.quietSeconds) || this.quietSeconds < 5) throw Error('Invalid native objective population policy');
  }
  get population(): number { let n = 0; for (const r of this.live.values()) for (const b of r.births) for (const a of b.bodies.values()) if (!a.dead) n++; return n; }
  private saved(owner: string, zone: Readonly<ZoneDef>, fixtures: HoldFixture[], value?: unknown): MassObjectiveBodiesSave | undefined {
    if (value === undefined) return;
    const s = value as MassObjectiveBodiesSave;
    if (!s || s.schema !== 1 || s.owner !== owner || !Number.isFinite(s.clock) || s.clock < 0
      || !Number.isSafeInteger(s.playerId) || !Number.isSafeInteger(s.draws) || s.draws < 0
      || !Number.isSafeInteger(s.sequence) || s.sequence < 0 || !Array.isArray(s.births) || !Array.isArray(s.spills)
      || !Array.isArray(s.transient) || new Set(s.spills).size !== s.spills.length || new Set(s.transient).size !== s.transient.length
      || s.spills.some(n => !Number.isSafeInteger(n) || n < 0 || n >= fixtures.length)) throw Error('Invalid native objective population checkpoint');
    const keys = new Set<string>(), ids = new Set<number>(), sequences = new Set<number>();
    for (const b of s.births) {
      const r = b.request;
      if (!r || r.owner !== owner || !Number.isSafeInteger(r.sequence) || r.sequence < 0 || r.sequence >= s.sequence
        || sequences.has(r.sequence) || !Number.isSafeInteger(r.slot) || r.slot < 0 || r.slot >= fixtures.length
        || r.seed !== streamSeed(this.seed, [owner, 'native-objective/birth', r.sequence])
        || canonical(r.zone) !== canonical(zone) || !r.at || ![r.at.x, r.at.y].every(Number.isFinite)
        || !Array.isArray(r.table) || r.kind !== 'beacon' && !r.table.length || r.table.some(t => !t.id || !Number.isFinite(t.weight) || t.weight < 0)
        || !Array.isArray(b.bodies) || b.bodies.length > 256
        || !r.config || !Number.isSafeInteger(r.config.levelBonus) || !Array.isArray(r.config.radius) || r.config.radius.length !== 2
        || !r.config.radius.every(n => Number.isFinite(n) && n >= 0) || r.config.radius[0] > r.config.radius[1]
        || r.kind === 'rift' && (!Number.isSafeInteger(r.count) || r.count < 0 || r.count > 256 || b.bodies.length !== r.count)
        || r.kind === 'beacon' && (!Number.isSafeInteger(r.count) || r.count < 0 || r.count > 256 || b.bodies.length !== r.count
          || !Array.isArray(r.mixTable) || !r.table.length && !r.mixTable.length
          || r.mixTable.some(t => !t.id || !Number.isFinite(t.weight) || t.weight < 0)
          || !Number.isFinite(r.config.mixChance) || r.config.mixChance < 0 || r.config.mixChance > 1)
        || r.kind === 'dig' && (!Number.isSafeInteger(r.maxBodies) || r.maxBodies < 0 || !Array.isArray(r.config.count)
          || r.config.count.length !== 2 || !r.config.count.every(n => Number.isSafeInteger(n) && n >= 0 && n <= 256)
          || r.config.count[0] > r.config.count[1] || b.bodies.length > r.maxBodies)
        || (zone.objective.kind === 'rifts' ? r.kind !== 'rift' : zone.objective.kind === 'unearth' ? r.kind !== 'dig' : zone.objective.kind === 'beacon' ? r.kind !== 'beacon' : true))
        throw Error('Invalid native objective birth checkpoint');
      sequences.add(r.sequence);
      for (const [i, a] of b.bodies.entries()) {
        if (!a || a.ordinal !== i || a.key !== canonical([owner, r.slot, r.sequence, i]) || keys.has(a.key)
          || !Number.isSafeInteger(a.actorId) || a.actorId === s.playerId || ids.has(a.actorId) || !a.monster || typeof a.dead !== 'boolean'
          || !a.pos || ![a.pos.x, a.pos.y, a.life].every(Number.isFinite) || a.life < 0 || !a.dead && a.life <= 0)
          throw Error('Invalid native objective body receipt');
        keys.add(a.key); ids.add(a.actorId);
        if (!a.dead && !a.state && !s.transient.includes(a.key)) throw Error('Unlabelled native objective transient');
      }
    }
    if (s.transient.some(key => !s.births.some(b => b.bodies.some(a => a.key === key && !a.dead && !a.state))))
      throw Error('Invalid native objective transient receipt');
    if (s.lures !== undefined && (!Array.isArray(s.lures) || zone.objective.kind !== 'beacon' || new Set(s.lures.map(l => l.slot)).size !== s.lures.length
      || s.lures.some(l => !Number.isSafeInteger(l.slot) || l.slot < 0 || l.slot >= fixtures.length
        || ![l.remaining, l.radius, l.pace, l.standoff].every(n => Number.isFinite(n) && n >= 0) || l.remaining > .6)))
      throw Error('Invalid native beacon lure checkpoint');
    return s;
  }
  canInstall(owner: string, zone: Readonly<ZoneDef>, fixtures: HoldFixture[], value?: unknown): boolean {
    const saved = this.saved(owner, zone, fixtures, value);
    return !this.live.has(owner) && this.policy.population() + (saved?.births.reduce((n, b) => n + b.bodies.filter(a => !a.dead).length, 0) ?? 0) <= this.policy.maxPopulation(owner);
  }
  install(owner: string, zone: Readonly<ZoneDef>, fixtures: HoldFixture[], value?: unknown): MassObjectiveEffects | null {
    if (!this.canInstall(owner, zone, fixtures, value)) return null;
    const saved = this.saved(owner, zone, fixtures, value), world = this.world;
    let draws = saved?.draws ?? 0, sequence = saved?.sequence ?? 0, detached = false;
    const spills = new Set(saved?.spills ?? []), run: LiveBodies = { owner, births: [] };
    const lures = new Map<number, { until: number; radius: number; pace: number; standoff: number }>();
    const lureId = (slot: number) => canonical([owner, 'native-beacon/lure', slot]);
    const actors = new Map<number, Actor>(); if (saved) actors.set(saved.playerId, world.player);
    // Replay saved native births detached; no day/weather/roster selection here.
    for (const row of saved?.births ?? []) {
      const body = world.createMassObjectiveBodies(row.request);
      if (body.length !== row.bodies.length) throw Error('Native objective birth count changed');
      const bodies = new Map<string, Actor>();
      row.bodies.forEach((s, i) => {
        const a = body[i]; if (a.defId !== s.monster) throw Error('Native objective species changed');
        actors.set(s.actorId, a); bodies.set(s.key, a);
      });
      run.births.push({ request: freezeData(clone(row.request)), bodies });
    }
    for (const [i, row] of (saved?.births ?? []).entries()) for (const s of row.bodies) {
      const a = run.births[i].bodies.get(s.key)!;
      if (s.dead) { a.dead = true; a.life = 0; continue; }
      if (s.life > a.maxLife()) throw Error('Native objective wound exceeds body');
      if (s.state) restoreNativeActorState(a, s.state, actors);
      else { a.pos = { ...s.pos }; a.life = s.life; }
      if (a.dead || a.life !== s.life || a.pos.x !== s.pos.x || a.pos.y !== s.pos.y) throw Error('Inconsistent native objective body receipt');
    }
    const owned = () => new Map(run.births.flatMap(b => [...b.bodies]));
    world.actors.push(...[...owned().values()].filter(a => !a.dead)); world.actorGridRev++; this.live.set(owner, run);
    for (const l of saved?.lures ?? []) if (l.remaining > 0) {
      lures.set(l.slot, { until: world.time + l.remaining, radius: l.radius, pace: l.pace, standoff: l.standoff });
      world.setLure(lureId(l.slot), fixtures[l.slot].pos, l.radius, l.pace, l.standoff, l.remaining, 0);
    }
    const random = {
      range: (lo: number, hi: number) => massRandom(this.seed, [owner, 'native-objective/draw', draws++]).range(lo, hi),
      int: (lo: number, hi: number) => massRandom(this.seed, [owner, 'native-objective/draw', draws++]).int(lo, hi),
    };
    const capacity = () => Math.max(0, Math.floor(this.policy.maxPopulation(owner) - this.policy.population()));
    const spawn = (slot: number, at: Vec2, config: RiftPourConfig | DigFinishConfig['ambush'] | NativeBeaconReinforceConfig, count?: number,
      beaconTables?: NativeBeaconTables): number => {
      if (detached) throw Error('Retired objective cannot create bodies');
      const available = capacity(); if (!available) return 0;
      const table = beaconTables?.native ?? world.massObjectiveSpawnTable(zone, at); if (!table.length && !beaconTables?.mix.length) return 0;
      const base: ObjectiveBirthBase = { owner, slot, sequence, seed: streamSeed(this.seed, [owner, 'native-objective/birth', sequence]), zone,
        at: { ...at }, table: clone([...table]) };
      const request: MassObjectiveBirth = beaconTables
        ? { ...base, kind: 'beacon', count: Math.min(count!, available), config: config as NativeBeaconReinforceConfig, mixTable: clone([...beaconTables.mix]) }
        : count === undefined
        ? { ...base, kind: 'dig', maxBodies: available, config: config as DigFinishConfig['ambush'] }
        : { ...base, kind: 'rift', count: Math.min(count, available), config: config as RiftPourConfig };
      const born = world.createMassObjectiveBodies(request);
      if (born.length > available || new Set(born).size !== born.length || born.some(a => a.dead || a.team !== 'enemy' || world.actors.includes(a)))
        throw Error('Native objective birth violated population reservation');
      const bodies = new Map(born.map((a, i) => [canonical([owner, slot, sequence, i]), a]));
      sequence++; run.births.push({ request: freezeData(clone(request)), bodies });
      world.actors.push(...born); world.actorGridRev++; return born.length;
    };
    const captures = () => new Map([...owned()].map(([key, a]) => [key, a.dead ? null : captureNativeActorState(a)]));
    const safe = (states: ReturnType<typeof captures>) => {
      const bodies = owned(); if (massDormancyPins(world, bodies).size) return false;
      const known = new Set([world.player.id, ...[...bodies.values()].map(a => a.id)]);
      for (const [key, a] of bodies) if (!a.dead && nativeDormancyRefusal(a, world, this.quietSeconds, states.get(key))) return false;
      // Streaming must never degrade a closed native state into the explicitly
      // weaker active-Continue lane used by capture().
      for (const state of states.values()) if (state && state.nodes.some(n => n.entries.some(pair => pair.some(v => v !== null && typeof v === 'object'
        && ('actor' in v && !known.has(v.actor) || 'squad' in v))))) return false;
      return true;
    };
    const capture = (): MassObjectiveBodiesSave => {
      const bodies = owned(), states = captures(), pins = massDormancyPins(world, bodies), transient: string[] = [];
      const known = new Set([world.player.id, ...[...bodies.values()].map(a => a.id)]);
      const births = run.births.map(b => ({ request: clone(b.request), bodies: [...b.bodies].map(([key, a], ordinal): BodyRow => {
        let state = states.get(key) ?? null;
        if (!a.dead && (pins.has(a) || nativeDormancyRefusal(a, world, this.quietSeconds, state))) state = null;
        if (state && state.nodes.some(n => n.entries.some(pair => pair.some(v => v !== null && typeof v === 'object'
          && ('actor' in v && !known.has(v.actor) || 'squad' in v))))) state = null;
        if (!a.dead && !state) transient.push(key);
        return { key, ordinal, actorId: a.id, monster: a.defId!, dead: a.dead, pos: { ...a.pos }, life: Math.max(0, a.life), ...(state ? { state } : {}) };
      }) }));
      return { schema: 1, owner, clock: world.time, playerId: world.player.id, draws, sequence, births, spills: [...spills], transient,
        ...(zone.objective.kind === 'beacon' ? { lures: [...lures].filter(([, l]) => l.until > world.time).map(([slot, l]) => ({ slot,
          remaining: Math.min(.6, l.until - world.time), radius: l.radius, pace: l.pace, standoff: l.standoff })) } : {}) };
    };
    return {
      actors: () => new Set(owned().values()),
      capture,
      canRetire: () => {
        if (detached) return true;
        const bodies = owned(), ours = new Set(bodies.values());
        if (world.actors.some(a => !a.dead && !ours.has(a) && sameStory(a, { tier: 0 })
          && [...bodies.values()].some(b => !b.dead && Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) < this.retainRadius))) return false;
        return safe(captures());
      },
      detach: () => {
        if (detached) return;
        if (!safe(captures())) throw Error('Cannot retire native objective live dependencies');
        const ours = new Set(owned().values()); world.actors = world.actors.filter(a => !ours.has(a)); world.actorGridRev++;
        for (const slot of lures.keys()) world.removeMassLure(lureId(slot)); lures.clear();
        this.live.delete(owner); detached = true;
      },
      riftHost: () => ({ now: world.time, level: zone.level, hasPacks: !!zone.packs, random,
        born: () => [...owned().values()].filter(a => !a.dead && a.tag === 'rift_born').length,
        spawn: (fixture, count, config) => { const slot = fixtures.indexOf(fixture); if (slot < 0) throw Error('Foreign rift fixture'); return spawn(slot, fixture.pos, config, count); },
        flash: (pos, radius, color, life) => world.flashes.push({ pos, radius, color, life, maxLife: life }) }),
      beaconHost: () => ({ now: world.time, level: zone.level, player: world.player.pos, random,
        born: () => [...owned().values()].filter(a => !a.dead && a.tag === 'spire_drawn').length,
        tables: (at, config) => world.massObjectiveBeaconTables(zone, at, config),
        spawn: (fixture, count, config, tables) => {
          const slot = fixtures.indexOf(fixture); if (slot < 0) throw Error('Foreign beacon fixture');
          return spawn(slot, fixture.pos, config, count, tables);
        },
        lure: (fixture, slot, config: NativeBeaconConfig) => {
          if (fixtures[slot] !== fixture || detached) throw Error('Foreign beacon lure');
          lures.set(slot, { until: world.time + .6, radius: config.lureRadius, pace: config.lurePace, standoff: config.lureStandoff });
          world.setLure(lureId(slot), fixture.pos, config.lureRadius, config.lurePace, config.lureStandoff, undefined, 0);
        },
        flash: (pos, radius, color, life) => world.flashes.push({ pos, radius, color, life, maxLife: life }) }),
      digHost: slot => {
        if (!Number.isSafeInteger(slot) || slot < 0 || slot >= fixtures.length) throw Error('Foreign dig fixture');
        return { hasPacks: !!zone.packs, random,
          spillGem: at => {
            if (spills.has(slot)) throw Error('Duplicate native mound spill');
            spills.add(slot);
            world.spillMassObjectiveGem(zone, at, streamSeed(this.seed, [owner, 'native-objective/gem', slot]), canonical([owner, 'dig-spill', slot]));
          },
          ambush: (at, config) => { spawn(slot, at, config); },
          // The native mound flare and emerging ambush carry this local cue.
          text: () => {} };
      },
    };
  }
}
