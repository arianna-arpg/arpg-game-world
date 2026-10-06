import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import type { Vec2 } from '../core/math';
import type { ZoneDef } from '../data/zones';
import type { Doodad } from '../engine/levelgen';
import { bootPlacedOccSites, driveOccSites, type OccHost, type OccKinRow, type OccKinSpec, type OccSite } from '../engine/occurrences';
import { sameStory } from '../engine/tiers';
import { captureNativeActorState, massDormancyPins, nativeDormancyRefusal, restoreNativeActorState, type NativeActorState } from './dormancy';
import type { NativeFeatureInstance, NativeResidencySave } from './nativeResidency';
import { canonical, freezeData, massRandom, streamSeed } from './random';

/** Complete detached native birth. Replay consumes its frozen roster and seed,
 * never today's faction registry, weather, geography or neighboring event RNG. */
export interface MassOccurrenceBirth {
  owner: string; geographicZone: string; site: number; sequence: number; seed: number;
  zone: Readonly<ZoneDef>; spec: OccKinSpec; table: OccKinRow[];
  at: Vec2; band: [number, number]; count: number;
}
export interface MassOccurrenceDisturbance extends Vec2 { tier: number }
/** These hooks use ordinary native body factories, pit policy and presentation.
 * No event-completion XP or substitute loot lane belongs to this adapter. */
export interface MassOccurrenceWorldHooks {
  massOccurrenceSpawnTable(spec: OccKinSpec): OccKinRow[];
  createMassOccurrenceBodies(request: MassOccurrenceBirth): readonly Actor[];
  installMassOccurrenceDecor(owner: string, zone: Readonly<ZoneDef>, rows: readonly Doodad[]): () => void;
}

interface SiteSave {
  geographicZone: string; state: 'armed' | 'sprung'; bank: number; told: boolean; cracked: boolean;
  pourAt: number; clockMark: number;
}
interface BodySave { key: string; actorId: number; monster: string; dead: boolean; life: number; pos: Vec2; tag?: string; state?: NativeActorState }
interface BirthSave { request: MassOccurrenceBirth; bodies: BodySave[] }
export interface MassOccurrencesSave {
  schema: 1; owner: string; descriptor: string; clock: number; playerId: number; draws: number; sequence: number;
  sites: SiteSave[]; decor: Doodad[]; births: BirthSave[];
  /** Ordinary native Continue boundary for active combat, never streaming retirement. */
  transient: string[];
  transientDecor: number[];
}
export interface MassOccurrencePolicy {
  population(): number; maxPopulation(): number; zoneOwner?: (pos: Vec2) => string;
  retainRadius: number; quietSeconds: number;
}
export interface MassOccurrenceBinding {
  mount(): void; actors(): ReadonlySet<Actor>; capture(): MassOccurrencesSave;
  canRetire(otherOwned?: ReadonlySet<Actor>): boolean; detach(): void;
  update(dt: number, disturbances: readonly MassOccurrenceDisturbance[]): void;
}
interface LiveBirth { request: MassOccurrenceBirth; bodies: Map<string, Actor> }
interface LiveRun {
  instance: NativeFeatureInstance; sites: OccSite[]; geographicZones: string[];
  births: LiveBirth[]; binding: MassOccurrenceBinding;
}
interface DormantCensus { geographicZone: string; tag: string; count: number }
// Native mutable records commonly write optional fields as undefined. Their
// JSON representation is absence; finite values and unsupported behaviors must
// still never be silently discarded from an owner checkpoint.
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v, (_key, value: unknown) => {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint'
    || typeof value === 'number' && !Number.isFinite(value)) throw Error('Unserializable native occurrence state');
  return value;
})) as T;
const initialWave = (site: OccSite): number => site.state === 'armed' ? site.def?.spring.wave?.count[1] ?? 0 : 0;
const stateOf = (site: OccSite, geographicZone: string): SiteSave => ({ geographicZone, state: site.state,
  bank: site.bank, told: site.told, cracked: site.cracked, pourAt: site.pourAt, clockMark: site.clockMark });

/** Only the complete shipped surface fracture is currently bound. Other
 * occurrence families keep their explicit capability refusal. */
export function massOccurrenceSupported(instance: NativeFeatureInstance): boolean {
  const rows = instance.blueprint.descriptor.sidechannels?.occurrences ?? [];
  if (!rows.length) return true;
  if ((instance.zone.caveDepth ?? 0) > 0 || instance.zone.theme.pitfall && instance.zone.theme.pitfall.kind !== 'fall'
    || instance.zone.spoils === 'none' || instance.zone.bounty !== undefined && instance.zone.bounty !== 1
    || instance.zone.castSeal !== undefined || instance.zone.quickened !== undefined
    || instance.zone.objective.kind !== 'none') return false;
  return rows.every(({ definition: d }) => d.id === 'abyssal_fracture' && d.trigger.kind === 'dwell'
    && d.aftermath?.kind === 'fixture'
    && [...(d.telegraph?.dress ?? []), ...(d.spring.dress ?? [])].every(r => ['abyss_crack', 'abyssal_rent'].includes(r.kind))
    && (!d.spring.wave || d.spring.wave.count.every(n => Number.isSafeInteger(n) && n >= 0 && n <= 256)));
}

/** Native occurrence controller/scenery/population ownership. Its dormant
 * index is derived from the feature checkpoint; CharacterSave stays the only
 * persistence authority. No actors are hydrated merely to count a distant tag. */
export class MassOccurrences {
  private live = new Map<string, LiveRun>();
  private dormant = new Map<string, readonly DormantCensus[]>();
  constructor(readonly world: World, readonly policy: MassOccurrencePolicy, saved?: NativeResidencySave) {
    for (const born of saved?.born ?? []) {
      const state = (born.changes.native as { occurrences?: MassOccurrencesSave } | undefined)?.occurrences;
      if (!state) continue;
      this.validateShape(state);
      if (state.owner !== born.placement.id || state.descriptor !== born.descriptor.hash) throw Error('Foreign native occurrence checkpoint');
      this.rememberCensus(state);
    }
  }
  get hasOccurrences(): boolean { return this.live.size > 0; }
  private rememberCensus(state: MassOccurrencesSave): void {
    const rows = new Map<string, DormantCensus>();
    for (const birth of state.births) for (const body of birth.bodies) if (!body.dead && body.tag !== undefined) {
      const key = canonical([birth.request.geographicZone, body.tag]), prior = rows.get(key);
      if (prior) prior.count++;
      else rows.set(key, { geographicZone: birth.request.geographicZone, tag: body.tag, count: 1 });
    }
    // This index is derived only. The authoritative full owner graph remains
    // in the native feature checkpoint, never duplicated just for a tag count.
    this.dormant.set(state.owner, [...rows.values()]);
  }
  get population(): number {
    let count = 0;
    for (const run of this.live.values()) {
      count += run.sites.reduce((n, s) => n + initialWave(s), 0);
      for (const birth of run.births) for (const a of birth.bodies.values()) if (!a.dead) count++;
    }
    return count;
  }
  views() { return [...this.live.values()].flatMap(run => run.sites.map((site, index) => ({
    owner: run.instance.id, index, pos: { x: site.x, y: site.y }, ...stateOf(site, run.geographicZones[index]), reserved: initialWave(site) }))); }
  private validateShape(s: MassOccurrencesSave): void {
    if (!s || s.schema !== 1 || !s.owner || !s.descriptor || !Number.isFinite(s.clock) || s.clock < 0
      || !Number.isSafeInteger(s.playerId) || !Number.isSafeInteger(s.draws) || s.draws < 0
      || !Number.isSafeInteger(s.sequence) || s.sequence < 0 || !Array.isArray(s.sites) || !Array.isArray(s.decor)
      || !Array.isArray(s.births) || !Array.isArray(s.transient) || !Array.isArray(s.transientDecor)
      || s.transientDecor.some(i => !Number.isSafeInteger(i) || i < 0 || i >= s.decor.length)) throw Error('Invalid native occurrence checkpoint');
    canonical(s);
    for (const site of s.sites) if (!site.geographicZone || !['armed', 'sprung'].includes(site.state)
      || ![site.bank, site.pourAt, site.clockMark].every(n => Number.isFinite(n) && n >= 0)
      || typeof site.told !== 'boolean' || typeof site.cracked !== 'boolean') throw Error('Invalid native occurrence site');
    for (const d of s.decor) if (!d.pos || ![d.pos.x, d.pos.y, d.radius, d.rot ?? 0].every(Number.isFinite)
      || d.radius <= 0 || !['abyss_crack', 'abyssal_rent'].includes(d.kind) || (d.tier ?? 0) !== 0)
      throw Error('Invalid native occurrence decor');
    const keys = new Set<string>(), ids = new Set<number>(), sequences = new Set<number>();
    for (const birth of s.births) {
      const r = birth.request;
      if (!r || r.owner !== s.owner || !Number.isSafeInteger(r.site) || r.site < 0 || r.site >= s.sites.length
        || r.geographicZone !== s.sites[r.site].geographicZone || !Number.isSafeInteger(r.sequence) || r.sequence < 0
        || r.sequence >= s.sequence || sequences.has(r.sequence) || !Number.isInteger(r.seed) || !r.zone || !r.spec
        || !r.at || ![r.at.x, r.at.y].every(Number.isFinite) || !Array.isArray(r.band) || r.band.length !== 2
        || !r.band.every(n => Number.isFinite(n) && n >= 0) || r.band[0] > r.band[1]
        || !Number.isSafeInteger(r.count) || r.count < 0 || r.count > 256 || !Array.isArray(r.table) || !r.table.length
        || r.table.some(t => !t.id || !Number.isFinite(t.weight) || t.weight < 0)
        || !Array.isArray(birth.bodies) || birth.bodies.length !== r.count) throw Error('Invalid native occurrence birth');
      sequences.add(r.sequence);
      for (const [i, b] of birth.bodies.entries()) {
        if (b.key !== canonical([s.owner, r.site, r.sequence, i]) || keys.has(b.key) || !b.monster
          || !Number.isSafeInteger(b.actorId) || b.actorId === s.playerId || ids.has(b.actorId) || typeof b.dead !== 'boolean'
          || !b.pos || ![b.pos.x, b.pos.y, b.life].every(Number.isFinite) || b.life < 0 || !b.dead && b.life <= 0
          || b.tag !== undefined && typeof b.tag !== 'string'
          || !b.dead && !b.state && !s.transient.includes(b.key)) throw Error('Invalid native occurrence body receipt');
        keys.add(b.key); ids.add(b.actorId);
      }
    }
    if (new Set(s.transient).size !== s.transient.length || s.transient.some(key => !s.births.some(b => b.bodies.some(a => a.key === key && !a.dead && !a.state))))
      throw Error('Invalid native occurrence transient receipt');
  }
  private saved(instance: NativeFeatureInstance, value?: MassOccurrencesSave): MassOccurrencesSave | undefined {
    if (!value) return;
    this.validateShape(value);
    const rows = instance.blueprint.descriptor.sidechannels?.occurrences ?? [];
    if (value.owner !== instance.id || value.descriptor !== instance.blueprint.descriptor.hash || value.sites.length !== rows.length)
      throw Error('Native occurrence source ownership changed');
    for (const birth of value.births) if (canonical(birth.request.zone) !== canonical(instance.zone)
      || birth.request.seed !== streamSeed(instance.placement.request.seed, [instance.id, 'native-occurrence/birth', birth.request.sequence]))
      throw Error('Native occurrence birth source changed');
    return value;
  }
  requiredPopulation(instance: NativeFeatureInstance, value?: MassOccurrencesSave): number {
    if (!massOccurrenceSupported(instance)) throw Error('Unbound native occurrence mechanism');
    const s = this.saved(instance, value), rows = instance.blueprint.descriptor.sidechannels?.occurrences ?? [];
    if (rows.length && !this.policy.zoneOwner) throw Error('Native occurrence needs physical zone ownership');
    for (const { definition } of rows) for (const spec of [definition.spring.wave, definition.aftermath?.pour])
      if (spec && !this.world.massOccurrenceSpawnTable(spec).length) throw Error('Native occurrence lost its kin roster');
    return rows.reduce((n, row, i) => n + (s?.sites[i].state === 'sprung' ? 0 : row.definition.spring.wave?.count[1] ?? 0), 0)
      + (s?.births.reduce((n, b) => n + b.bodies.filter(a => !a.dead).length, 0) ?? 0);
  }
  private tagCount(zone: string, tag: string): number {
    let n = 0;
    for (const run of this.live.values()) for (const birth of run.births) if (birth.request.geographicZone === zone)
      for (const actor of birth.bodies.values()) if (!actor.dead && actor.tag === tag) n++;
    for (const [owner, rows] of this.dormant) if (!this.live.has(owner)) for (const row of rows)
      if (row.geographicZone === zone && row.tag === tag) n += row.count;
    return n;
  }
  update(dt: number, disturbances: readonly MassOccurrenceDisturbance[]): void {
    if (!Number.isFinite(dt) || dt < 0) throw Error('Invalid native occurrence tick');
    for (const run of this.live.values()) run.binding.update(dt, disturbances);
  }
  prepare(instance: NativeFeatureInstance, value?: MassOccurrencesSave): MassOccurrenceBinding | undefined {
    const rows = instance.blueprint.descriptor.sidechannels?.occurrences ?? [];
    if (!rows.length) { if (value) throw Error('Native occurrence checkpoint lost its source'); return; }
    this.requiredPopulation(instance, value);
    if (this.live.has(instance.id)) throw Error('Duplicate native occurrence owner');
    const saved = this.saved(instance, value), world = this.world, owner = instance.id;
    const sites = bootPlacedOccSites(instance.zone.id,
      rows.map(r => ({ ...r.site, x: r.site.x + instance.offset.x, y: r.site.y + instance.offset.y })),
      rows.map(r => clone(r.definition)));
    const geographicZones = sites.map(s => this.policy.zoneOwner!({ x: s.x, y: s.y }));
    if (geographicZones.some(id => !id)) throw Error('Missing native occurrence geographic zone');
    sites.forEach((site, i) => {
      const old = saved?.sites[i]; if (!old) return;
      if (old.geographicZone !== geographicZones[i]) throw Error('Native occurrence physical zone changed');
      Object.assign(site, { state: old.state, bank: old.bank, told: old.told, cracked: old.cracked, pourAt: old.pourAt, clockMark: old.clockMark });
    });
    let draws = saved?.draws ?? 0, sequence = saved?.sequence ?? 0, mounted = false, detached = false;
    const decor = clone(saved?.decor ?? []), detachDecor: (() => void)[] = [], births: LiveBirth[] = [];
    const actors = new Map<number, Actor>(); if (saved) actors.set(saved.playerId, world.player);
    for (const row of saved?.births ?? []) {
      const born = world.createMassOccurrenceBodies(row.request);
      if (born.length !== row.bodies.length) throw Error('Native occurrence replay changed its birth count');
      const bodies = new Map<string, Actor>();
      row.bodies.forEach((b, i) => {
        const actor = born[i]; if (actor.defId !== b.monster || world.actors.includes(actor)) throw Error('Native occurrence replay changed species');
        actors.set(b.actorId, actor); bodies.set(b.key, actor);
      });
      births.push({ request: freezeData(clone(row.request)), bodies });
    }
    for (const [i, row] of (saved?.births ?? []).entries()) for (const old of row.bodies) {
      const actor = births[i].bodies.get(old.key)!;
      if (old.dead) { actor.dead = true; actor.life = 0; continue; }
      if (old.life > actor.maxLife()) throw Error('Native occurrence wound exceeds its body');
      if (old.state) restoreNativeActorState(actor, old.state, actors);
      else { actor.pos = { ...old.pos }; actor.life = old.life; actor.tag = old.tag; }
      if (actor.dead || actor.life !== old.life || actor.pos.x !== old.pos.x || actor.pos.y !== old.pos.y || actor.tag !== old.tag) throw Error('Native occurrence body state disagrees');
    }
    const owned = () => new Map(births.flatMap(b => [...b.bodies]));
    const capture = (): MassOccurrencesSave => {
      const ours = owned(), pins = massDormancyPins(world, ours), known = new Set([world.player.id, ...[...ours.values()].map(a => a.id)]), transient: string[] = [];
      const captured = births.map(b => ({ request: clone(b.request), bodies: [...b.bodies].map(([key, actor]): BodySave => {
        let state = actor.dead ? null : captureNativeActorState(actor);
        if (!actor.dead && (pins.has(actor) || nativeDormancyRefusal(actor, world, this.policy.quietSeconds, state))) state = null;
        if (state && state.nodes.some(n => n.entries.some(pair => pair.some(v => v !== null && typeof v === 'object'
          && ('actor' in v && !known.has(v.actor) || 'squad' in v))))) state = null;
        if (!actor.dead && !state) transient.push(key);
        return { key, actorId: actor.id, monster: actor.defId!, dead: actor.dead, life: Math.max(0, actor.life), pos: { ...actor.pos },
          ...(actor.tag === undefined ? {} : { tag: actor.tag }), ...(state ? { state } : {}) };
      }) }));
      const result: MassOccurrencesSave = { schema: 1, owner, descriptor: instance.blueprint.descriptor.hash, clock: world.time,
        playerId: world.player.id, draws, sequence, sites: sites.map((s, i) => stateOf(s, geographicZones[i])),
        decor: decor.map(d => { const { contactSource: _source, ...plain } = d; return clone({ ...plain, ...(!world.doodads.includes(d) && mounted ? { gone: true } : {}) }); }),
        births: captured, transient, transientDecor: decor.flatMap((d, i) => d.contactSource ? [i] : []) };
      this.rememberCensus(result); return result;
    };
    const binding: MassOccurrenceBinding = {
      mount: () => {
        if (mounted || detached) throw Error('Native occurrence mounted twice');
        try {
          if (decor.some(d => !d.gone)) detachDecor.push(world.installMassOccurrenceDecor(owner, instance.zone, decor.filter(d => !d.gone)));
          world.actors.push(...[...owned().values()].filter(a => !a.dead)); world.actorGridRev++;
          this.live.set(owner, { instance, sites, geographicZones, births, binding }); mounted = true;
        } catch (error) { for (const remove of detachDecor.splice(0)) remove(); throw error; }
      },
      actors: () => new Set(owned().values()), capture,
      canRetire: (otherOwned = new Set()) => {
        if (detached) return true;
        if (decor.some(d => d.contactSource || d.felled || d.evap)) return false;
        const ours = new Set(owned().values());
        if (world.actors.some(a => !a.dead && !ours.has(a) && !otherOwned.has(a) && sameStory(a, { tier: 0 })
          && (sites.some(s => Math.hypot(a.pos.x - s.x, a.pos.y - s.y) <= this.policy.retainRadius)
            || [...ours].some(b => !b.dead && Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) <= this.policy.retainRadius)))) return false;
        // The same closure test governs snapshot eligibility and retirement.
        // Streaming can never downgrade an unresolved actor graph to wounds.
        return capture().transient.length === 0;
      },
      detach: () => {
        if (detached) return;
        if (decor.some(d => d.contactSource || d.felled || d.evap) || capture().transient.length) throw Error('Native occurrence has active dependencies');
        const ours = new Set(owned().values()); world.actors = world.actors.filter(a => !ours.has(a)); world.actorGridRev++;
        for (const remove of detachDecor.splice(0)) remove(); this.live.delete(owner); mounted = false; detached = true;
      },
      update: (dt, disturbances) => {
        if (!mounted || detached) throw Error('Retired native occurrence cannot update');
        for (const [index, site] of sites.entries()) {
          // Reservation normally makes this true. Keep a defensive preflight
          // before native spring mutates state, bank, cues or the random stream.
          if (site.state === 'armed' && this.policy.population() > this.policy.maxPopulation()) continue;
          const draw = () => massRandom(instance.placement.request.seed, [owner, 'native-occurrence/draw', draws++]);
          const host: OccHost = {
            timeOf: () => world.time, zoneLevel: () => instance.zone.level,
            heroDist: (x, y) => world.player.dead || !sameStory(world.player, { tier: 0 }) ? Infinity : Math.hypot(world.player.pos.x - x, world.player.pos.y - y),
            disturbedNear: (x, y, r) => disturbances.some(p => p.tier === 0 && Math.hypot(p.x - x, p.y - y) <= r),
            dice: (lo, hi) => draw().range(lo, hi), diceInt: (lo, hi) => draw().int(lo, hi),
            plant: row => {
              const d: Doodad = { pos: { x: row.x, y: row.y }, radius: row.r, kind: row.kind,
                ...(row.rot === undefined ? {} : { rot: row.rot }), ...(row.fall ? { fall: true } : {}) };
              detachDecor.push(world.installMassOccurrenceDecor(owner, instance.zone, [d])); decor.push(d);
            },
            pour: (spec, x, y, band, count) => {
              const available = Math.max(0, Math.floor(this.policy.maxPopulation() - this.policy.population()));
              // Initial waves consume their released reservation in full.
              // Recurring beats may use fewer shared slots, like other owners.
              const n = Math.min(count, available); if (!n) return 0;
              const table = world.massOccurrenceSpawnTable(spec); if (!table.length) throw Error('Native occurrence lost its kin roster');
              const request: MassOccurrenceBirth = { owner, geographicZone: geographicZones[index], site: index, sequence,
                seed: streamSeed(instance.placement.request.seed, [owner, 'native-occurrence/birth', sequence]), zone: clone(instance.zone),
                spec: clone(spec), table: clone(table), at: { x, y }, band: [...band], count: n };
              const born = world.createMassOccurrenceBodies(request);
              if (born.length !== n || new Set(born).size !== n || born.some(a => a.dead || a.team !== 'enemy' || world.actors.includes(a)))
                throw Error('Native occurrence birth violated its reservation');
              births.push({ request: freezeData(request), bodies: new Map(born.map((a, i) => [canonical([owner, index, sequence, i]), a])) });
              sequence++; world.actors.push(...born); world.actorGridRev++; return born.length;
            },
            tagCount: tag => this.tagCount(geographicZones[index], tag),
            announce: () => { /* Show, don't tell: native cracks, tremor, flash and bodies carry this local event. */ },
            rumble: magnitude => { world.shake = Math.max(world.shake, magnitude); },
            flash: (x, y, radius, color) => world.flashes.push({ pos: { x, y }, radius, color, life: .5, maxLife: .5 }),
          };
          driveOccSites(host, [site], dt);
        }
      },
    };
    return binding;
  }
}
