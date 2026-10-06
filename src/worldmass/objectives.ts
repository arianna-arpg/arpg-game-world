import type { Vec2 } from '../core/math';
import { ZONES, objectiveEarnsChest, type ObjectiveSpec, type ZoneDef } from '../data/zones';
import type { Chest } from '../engine/world';
import type { Actor } from '../engine/actor';
import { TILESETS, type TilesetDef } from '../data/tilesets';
import type { NativeCountrySpec } from './nativeCountry';
import { PYRE_CFG } from '../data/pyres';
import { RIFT_CFG } from '../data/rifts';
import { DIG_CFG } from '../data/digsites';
import { transitDwell, transitRadius, transitReach, type DwellReach } from '../data/transit';
import { driveHoldObjectives, driveNativeRiftPours, finishNativeDig, resolveHoldContest, type DigFinishConfig, type RiftPourConfig, type HoldFixture, type HoldObjectiveHost } from '../engine/holdObjectives';
import type { MassObjectiveEffects } from './objectiveBodies';
import { address, type MassAddress } from './address';
import { MassHierarchy, massBoundsContains, type MassGeography, type MassControllerSave } from './hierarchy';
import { canonical, freezeData, massRandom } from './random';

const idOf = (kind: NativeMassHoldKind) => 'objective:' + kind;
const chestId = (kind: NativeMassHoldKind) => idOf(kind) + ':chest';
const bodiesId = (kind: NativeMassHoldKind) => idOf(kind) + ':population';
/** The native World.loadZone objective chest roll, frozen when an owner is born. */
export const MASS_NATIVE_OBJECTIVE_CHEST_CHANCE = .75;
export type NativeMassHoldKind = 'pyres' | 'rifts' | 'unearth';
type NativeHoldSpecs = { [K in NativeMassHoldKind]: Extract<ObjectiveSpec, { kind: K }> };
export interface NativeMassHoldSource<K extends NativeMassHoldKind = NativeMassHoldKind> {
  id: string; source: string; tileset?: string; weight: number; totalWeight: number;
  objective: NativeHoldSpecs[K];
}
export type NativeMassPyreSource = NativeMassHoldSource<'pyres'>;
export interface MassHoldContext { source: string; zone: ZoneDef; recipe?: NativeMassHoldSource }
export interface MassPyreContext { source: string; zone: ZoneDef; recipe?: NativeMassPyreSource }
export const isNativeMassHoldKind = (kind: string): kind is NativeMassHoldKind => ['pyres', 'rifts', 'unearth'].includes(kind);
const isNativeHold = (o: ObjectiveSpec): o is NativeHoldSpecs[NativeMassHoldKind] => isNativeMassHoldKind(o.kind);
/** The actual native weighted rows. Bare tileset pyres resolve to {kind:'pyres'}
 * in engine/worldgen.rollObjective; every count/hold override from authored zone
 * specs is retained. This catalogue grants no other tileset mechanism. */
export function nativeMassPyreSources(country?: NativeCountrySpec): readonly Readonly<NativeMassPyreSource>[] {
  return nativeMassHoldSources(country).filter((row): row is Readonly<NativeMassPyreSource> => row.objective.kind === 'pyres');
}
export function nativeMassHoldSources(country?: NativeCountrySpec): readonly Readonly<NativeMassHoldSource>[] {
  const rows: NativeMassHoldSource[] = [];
  const tilesets = country ? (country.sources as { tilesets: { definition: TilesetDef }[] }).tilesets.map(t => t.definition) : Object.values(TILESETS);
  for (const ts of tilesets) for (const [i, row] of ts.objectives.entries()) if (isNativeMassHoldKind(row.kind) && row.weight > 0)
    rows.push({ id: `tilesets/${ts.id}/objectives/${i}`, source: 'data/tilesets', tileset: ts.id, weight: row.weight,
      totalWeight: ts.objectives.reduce((n, o) => n + Math.max(0, o.weight), 0), objective: { kind: row.kind } });
  for (const z of Object.values(ZONES)) if (z.objective.kind === 'pyres' || z.objective.kind === 'rifts' || z.objective.kind === 'unearth') rows.push({
    id: `zones/${z.id}/objective`, source: 'data/zones', ...(z.tileset ? { tileset: z.tileset } : {}), weight: 1, totalWeight: 1, objective: clone(z.objective),
  });
  return freezeData(rows.sort((a, b) => a.id.localeCompare(b.id)));
}
export function resolveMassPyreContext(zone: ZoneDef, source: NativeMassPyreSource, level = zone.level): Readonly<MassPyreContext> {
  if (!Number.isSafeInteger(level) || level < 1 || !source.id || !source.source || source.objective.kind !== 'pyres') throw Error('Invalid native pyre context');
  return freezeData(clone({ source: source.source + '/' + source.id, zone: { ...zone, level, objective: source.objective }, recipe: source }));
}
export function resolveMassHoldContext(zone: ZoneDef, source: NativeMassHoldSource, level = zone.level): Readonly<MassHoldContext> {
  if (!Number.isSafeInteger(level) || level < 1 || !source.id || !source.source || !isNativeMassHoldKind(source.objective.kind)) throw Error('Invalid native hold context');
  return freezeData(clone({ source: source.source + '/' + source.id, zone: { ...zone, level, objective: source.objective }, recipe: source }));
}
export interface MassObjectiveHost {
  readonly now: number;
  hold: HoldObjectiveHost;
  /** Ordinary native fixtures become visible to the renderer/lightwell fabric. */
  installPyres(owner: string, fixtures: HoldFixture[]): () => void;
  installHolds?(owner: string, kind: NativeMassHoldKind, fixtures: HoldFixture[]): () => void;
  installEffects?(owner: string, zone: Readonly<ZoneDef>, fixtures: HoldFixture[], saved?: unknown): MassObjectiveEffects | null;
  installChest(owner: string, chest: Chest): () => void;
  /** Same-story nearby actors, ongoing interaction and references must pin. */
  canRetire(fixtures: HoldFixture[], owned?: ReadonlySet<Actor>): boolean;
  /** Native objectiveRewardXp + native text; called only after durable receipt. */
  complete(owner: string, zone: Readonly<ZoneDef>, label: string): void;
}
interface PyreDefinition {
  kind: NativeMassHoldKind; source: string; zone: ZoneDef; recipe?: NativeMassHoldSource; positions: MassAddress[]; need: number;
  radius: number; holdRadius: number; reach: DwellReach; cold: string; lit: string; accent: string;
  contest: ReturnType<typeof resolveHoldContest>;
  pour?: RiftPourConfig; dig?: DigFinishConfig;
  /** Absence belongs to a historical owner born before native chest ownership. */
  reward?: { chance: number; source: string; position: MassAddress | null };
}
interface PyreState { fixtures: { charge: number; recoup: number; pourRemaining?: number | null }[] }
interface ChestState { opened: boolean; openedAt?: number }
interface Resident { owner: string; definition: Readonly<PyreDefinition>; fixtures: HoldFixture[]; chest?: Chest; effects?: MassObjectiveEffects; detach: () => void; held: HoldFixture | null }
export interface MassPyreView {
  owner: string; kind: NativeMassHoldKind; name: string; pos: Vec2; frac: number; done: boolean; lit: number; count: number;
  contested: boolean; draining: boolean; recouping: boolean;
}
export interface MassObjectiveTarget {
  owner: string; kind: NativeMassHoldKind; source: string; definitionHash: string;
  name: string; level: number; center: MassAddress; complete: boolean;
}
const clone = <T>(v: T): T => JSON.parse(canonical(v)) as T;
const nativeConfig = (kind: NativeMassHoldKind) => kind === 'pyres' ? { ...PYRE_CFG, transit: 'pyre', fallback: 110, done: PYRE_CFG.kindLit, flare: 130,
  stir: 'the kindling catches — hold the ground…', complete: 'Every pyre burns — the dark gives ground!' }
  : kind === 'rifts' ? { ...RIFT_CFG, transit: 'rift', fallback: 120, done: RIFT_CFG.kindSealed, flare: 150,
    stir: 'the seal takes — the tear howls against it…', complete: 'The last rift is sealed — the ground rests!' }
    : { ...DIG_CFG, transit: 'digsite', fallback: 100, done: DIG_CFG.kindDug, flare: 110,
      stir: 'the spade bites — stand your ground…', complete: 'Every cache is unearthed!' };

/** Native pyres with geographic enrollment. Several owners use exactly the same
 * native contest engine concurrently; there is no temporary World.zone swap. */
export class MassObjectives {
  private live = new Map<string, Resident>();
  private kinds = new Map<string, NativeMassHoldKind>();
  constructor(readonly hierarchy: MassHierarchy, readonly maxResident = 8) {
    if (!Number.isSafeInteger(maxResident) || maxResident < 1 || maxResident > 64) throw Error('Invalid native objective residency budget');
    for (const row of hierarchy.controllers()) {
      const objectives = row.controllers.filter(c => ['pyres', 'rifts', 'unearth'].some(k => c.id === 'objective:' + k));
      if (objectives.length > 1) throw Error('Multiple native local objectives share one zone');
      const objective = objectives[0], kind = (objective?.definition as PyreDefinition | undefined)?.kind;
      const chest = row.controllers.find(c => ['pyres', 'rifts', 'unearth'].some(k => c.id === 'objective:' + k + ':chest'));
      if (objective) {
        const { definition } = this.read(row.owner, objective);
        this.kinds.set(row.owner.id, definition.kind);
        if (definition.reward?.position) this.readChest(row.owner.id, definition);
        else if (chest) throw Error('Orphan native objective chest checkpoint');
        if (kind !== 'pyres' && !row.controllers.some(c => c.id === bodiesId(definition.kind))) throw Error('Missing native objective population checkpoint');
      } else if (chest) throw Error('Orphan native objective chest checkpoint');
    }
  }
  get residentCount(): number { return this.live.size; }
  has(owner: string): boolean { return this.kinds.has(owner); }
  /** Read only admitted, persistent work. Bounty boards do not create targets,
   * reveal unvisited plans, or traverse population checkpoint graphs. */
  target(owner: string): Readonly<MassObjectiveTarget> | undefined {
    const kind = this.kinds.get(owner); if (!kind) return;
    const c = this.hierarchy.controller(owner, idOf(kind)), place = this.hierarchy.owner(owner);
    if (!c || !place || c.phase === 'failed') return;
    const d = c.definition as PyreDefinition;
    return freezeData({ owner, kind, source: d.source, definitionHash: c.definitionHash, name: d.zone.name,
      level: d.zone.level, center: clone(place.center), complete: c.phase === 'complete' });
  }
  targets(limit: number, slate: string): readonly Readonly<MassObjectiveTarget>[] {
    if (!Number.isSafeInteger(limit) || limit < 0 || limit > 128 || typeof slate !== 'string' || !slate || slate.length > 4096)
      throw Error('Invalid native objective target slate');
    if (!limit) return [];
    const rows = [...this.kinds.keys()].sort().flatMap(id => { const t = this.target(id); return t && !t.complete ? [t] : []; });
    if (!rows.length) return [];
    const start = massRandom(this.hierarchy.seed, ['native-objective/target-slate', slate]).int(0, rows.length - 1);
    return Object.freeze(Array.from({ length: Math.min(limit, rows.length) }, (_, i) => rows[(start + i) % rows.length]));
  }
  count(owner: MassGeography, context?: MassHoldContext): number {
    const o = (context?.zone ?? owner.native?.zone)?.objective;
    if (owner.kind !== 'zone' || !o || !isNativeHold(o)) return 0;
    const band = o.count ?? nativeConfig(o.kind).count;
    if (band.length !== 2 || !band.every(n => Number.isSafeInteger(n) && n > 0 && n <= 32) || band[0] > band[1])
      throw Error('Invalid native pyre count');
    return massRandom(this.hierarchy.seed, [owner.id, 'native-' + o.kind + '/count']).int(band[0], band[1]);
  }
  chestWanted(owner: MassGeography, context?: MassHoldContext): boolean {
    const zone = context?.zone ?? owner.native?.zone, kind = this.kinds.get(owner.id) ?? zone?.objective.kind;
    if (!kind || !isNativeMassHoldKind(kind)) return false;
    const old = this.hierarchy.controller(owner.id, idOf(kind));
    if (old) return !!(old.definition as PyreDefinition).reward?.position;
    return !!zone && !zone.special && objectiveEarnsChest(zone.objective)
      && massRandom(this.hierarchy.seed, [owner.id, idOf(kind), 'native-chest']).chance(MASS_NATIVE_OBJECTIVE_CHEST_CHANCE);
  }
  /** Positions are actual collision/reach-verified stands supplied by the host's
   * native placement seam. A plan does not become live until enrollment succeeds. */
  admit(owner: MassGeography, positions: readonly MassAddress[], host: MassObjectiveHost, local: (at: MassAddress) => Vec2,
    context?: MassHoldContext, chestPosition?: MassAddress): boolean {
    const oldKind = this.kinds.get(owner.id), existing = oldKind && this.hierarchy.controller(owner.id, idOf(oldKind));
    if (existing) return this.mount(owner, existing, host, local);
    const count = this.count(owner, context), zone = context?.zone ?? owner.native?.zone, o = zone?.objective;
    if (!count || !o || !isNativeHold(o) || this.live.size >= this.maxResident) return false;
    if (o.kind !== 'pyres' && (!host.installHolds || !host.installEffects)) return false;
    const cfg = nativeConfig(o.kind), ID = idOf(o.kind);
    if (positions.length !== count || new Set(positions.map(canonical)).size !== count
      || positions.some(at => canonical(address(at.dimension, at.cx, at.cy, at.x, at.y, this.hierarchy.addressSpan)) !== canonical(at)
        || !massBoundsContains(owner.bounds, at, this.hierarchy.addressSpan))) throw Error('Invalid native pyre placement');
    const need = o.kind === 'pyres' ? o.kindleSec ?? transitDwell('pyre', PYRE_CFG.kindleSec)
      : o.kind === 'rifts' ? o.sealSec ?? transitDwell('rift', RIFT_CFG.sealSec) : o.digSec ?? transitDwell('digsite', DIG_CFG.digSec);
    if (!Number.isFinite(need) || need <= 0) throw Error('Invalid native pyre duration');
    const source = context?.source ?? owner.native!.source;
    const wanted = this.chestWanted(owner, context);
    if (wanted && (!chestPosition || !massBoundsContains(owner.bounds, chestPosition, this.hierarchy.addressSpan)))
      throw Error('Native objective chest requires its own legal stand');
    if (!wanted && chestPosition) throw Error('Unrolled native objective chest');
    const reward: NonNullable<PyreDefinition['reward']> = { chance: MASS_NATIVE_OBJECTIVE_CHEST_CHANCE,
      source: canonical([owner.id, ID, 'chest']), position: wanted ? clone(chestPosition!) : null };
    const definition: PyreDefinition = { kind: o.kind, source, zone: clone(zone!), ...(context?.recipe ? { recipe: clone(context.recipe) } : {}), positions: clone([...positions]), need,
      radius: cfg.radius, holdRadius: transitRadius(cfg.transit, cfg.fallback), reach: transitReach(cfg.transit), cold: cfg.kind, lit: cfg.done, accent: cfg.accent,
      contest: clone(resolveHoldContest(cfg.contest, o.contest)), reward,
      ...(o.kind === 'rifts' ? { pour: clone(RIFT_CFG.pour) } : o.kind === 'unearth' ? { dig: clone({ spoilGemChance: DIG_CFG.spoilGemChance, ambush: DIG_CFG.ambush }) } : {}) };
    const c = this.hierarchy.enroll(owner, ID, source, definition,
      { fixtures: positions.map(() => ({ charge: 0, recoup: 0, ...(o.kind === 'rifts' ? { pourRemaining: null } : {}) })) }, host.now);
    this.kinds.set(owner.id, o.kind);
    if (reward.position) this.hierarchy.enroll(owner, chestId(o.kind), 'engine/world/objective-chest', reward, { opened: false }, host.now);
    if (o.kind !== 'pyres') this.hierarchy.enroll(owner, bodiesId(o.kind), 'engine/world/native-objective-bodies', { kind: o.kind, source }, null, host.now);
    return this.mount(owner, c, host, local);
  }
  sync(wanted: readonly MassGeography[], host: MassObjectiveHost, local: (at: MassAddress) => Vec2): void {
    const keep = new Set(wanted.map(o => o.id));
    for (const [id, run] of this.live) if (!keep.has(id) && (!run.effects || run.effects.canRetire()) && host.canRetire(run.fixtures, run.effects?.actors())) {
      this.checkpoint(run, host.now, 'dormant'); this.checkpointEffects(run, host.now, 'dormant'); run.detach(); this.live.delete(id);
    }
    for (const owner of wanted) {
      const kind = this.kinds.get(owner.id), c = kind && this.hierarchy.controller(owner.id, idOf(kind));
      if (c) this.mount(owner, c, host, local);
    }
  }
  update(dt: number, host: MassObjectiveHost): void {
    if (!Number.isFinite(dt) || dt < 0) throw Error('Invalid native objective step');
    host.hold.held(null);
    for (const run of this.live.values()) {
      const ID = idOf(run.definition.kind), c = this.hierarchy.status(run.owner, ID)!;
      if (c.phase === 'complete' || c.phase === 'failed') continue;
      const d = run.definition, cfg = nativeConfig(d.kind);
      driveHoldObjectives(dt, {
        fixtures: run.fixtures, need: d.need, transitKind: cfg.transit, holdFallback: cfg.fallback, holdRadius: d.holdRadius, reach: d.reach, contest: d.contest,
        doneKind: d.lit, accent: d.accent, flareColor: d.accent, flareR: cfg.flare,
        stirText: cfg.stir,
        onFill: s => {
          const left = run.fixtures.filter(x => x.charge < d.need).length;
          if (d.kind === 'unearth') finishNativeDig(s, d.dig!, run.effects!.digHost(run.fixtures.indexOf(s)));
          if (left > 0) host.hold.text({ x: s.pos.x, y: s.pos.y - (d.kind === 'unearth' ? 72 : 56) },
            d.kind === 'pyres' ? `the pyre burns — ${left} still cold` : d.kind === 'rifts' ? `the tear seals — ${left} remain${left === 1 ? 's' : ''}`
              : `${left} mound${left === 1 ? '' : 's'} left unopened`, d.accent, d.kind === 'unearth' ? 13 : 14);
        },
      }, { ...host.hold, held: s => { run.held = s; if (s) host.hold.held(s); } });
      if (d.kind === 'rifts') driveNativeRiftPours(run.fixtures, d.need, d.pour!, d.accent, run.effects!.riftHost());
      const done = run.fixtures.every(s => s.charge >= d.need);
      this.checkpoint(run, host.now, done ? 'complete' : 'active');
      if (done) {
        const latest = this.hierarchy.status(run.owner, ID)!;
        if (this.hierarchy.receipt(run.owner, ID, latest.revision, {
          id: 'native-objective-payout', source: 'data/objectiveRewards', subject: run.owner, kind: 'objective-complete', at: host.now,
        })) host.complete(run.owner, d.zone, cfg.complete);
        this.unlockChest(run, host.now);
      }
    }
  }
  chestReady(chest: Chest): boolean {
    const run = this.chestRun(chest);
    return !!run && this.hierarchy.status(run.owner, idOf(run.definition.kind))?.phase === 'complete';
  }
  chestContext(chest: Chest): Readonly<ZoneDef> | undefined { return this.chestRun(chest)?.definition.zone; }
  /** Called by native openChest immediately after its opened latch, so a save
   * between opening and the next objective tick never refills this container. */
  chestOpened(chest: Chest, now: number): void {
    const run = this.chestRun(chest);
    if (!run || !chest.opened || !this.chestReady(chest) || !Number.isFinite(now)) throw Error('Unowned native objective chest opening');
    const CHEST_ID = chestId(run.definition.kind), c = this.hierarchy.status(run.owner, CHEST_ID)!;
    if (c.phase === 'complete') return;
    this.unlockChest(run, now);
    const ready = this.hierarchy.status(run.owner, CHEST_ID)!;
    const openedAt = chest.openedAt ?? now;
    if (!Number.isFinite(openedAt) || openedAt < 0 || openedAt > now || now < ready.updatedAt) throw Error('Invalid native objective chest clock');
    if (!this.hierarchy.update(run.owner, CHEST_ID, ready.revision, now, { opened: true, openedAt }, 'complete'))
      throw Error('Concurrent native objective chest checkpoint');
    const complete = this.hierarchy.status(run.owner, CHEST_ID)!;
    if (!this.hierarchy.receipt(run.owner, CHEST_ID, complete.revision, { id: 'opened', source: 'engine/world/openChest',
      subject: chest.rewardSource!, kind: 'chest-opened', at: now })) throw Error('Duplicate native objective chest opening');
  }
  /** Native objective projections; caller chooses its existing HUD/attention seat. */
  views(player: Vec2, kind?: NativeMassHoldKind): MassPyreView[] {
    const result: MassPyreView[] = [];
    for (const run of this.live.values()) {
      if (kind && run.definition.kind !== kind) continue;
      const need = run.definition.need, lit = run.fixtures.filter(s => s.charge >= need).length;
      const pending = run.fixtures.filter(s => s.charge < need);
      const pick = run.held && pending.includes(run.held) ? run.held : [...(pending.length ? pending : run.fixtures)]
        .sort((a, b) => Math.hypot(a.pos.x - player.x, a.pos.y - player.y) - Math.hypot(b.pos.x - player.x, b.pos.y - player.y))[0];
      result.push({ owner: run.owner, kind: run.definition.kind, name: run.definition.zone.name, pos: { ...pick.pos }, frac: Math.min(1, pick.charge / need),
        done: lit === run.fixtures.length, lit, count: run.fixtures.length,
        contested: pick.holdRead?.contested ?? false, draining: pick.holdRead?.draining ?? false, recouping: pick.holdRead?.recouping ?? false });
    }
    return result.sort((a, b) => Math.hypot(a.pos.x - player.x, a.pos.y - player.y) - Math.hypot(b.pos.x - player.x, b.pos.y - player.y));
  }
  rings(): { pos: Vec2; frac: number; kind: string }[] {
    return [...this.live.values()].flatMap(r => r.fixtures.filter(s => s.charge < r.definition.need)
      .map(s => ({ pos: { ...s.pos }, frac: s.charge / r.definition.need, kind: nativeConfig(r.definition.kind).transit })));
  }
  private mount(owner: MassGeography, c: Readonly<MassControllerSave>, host: MassObjectiveHost, local: (at: MassAddress) => Vec2): boolean {
    if (this.live.has(owner.id)) return true;
    if (this.live.size >= this.maxResident) return false;
    const { definition, state } = this.read(owner, c);
    const fixtures: HoldFixture[] = definition.positions.map((at, i) => {
      const pos = local(at), charge = state.fixtures[i].charge;
      const remaining = state.fixtures[i].pourRemaining;
      return { owner: owner.id, pos: { ...pos }, charge, recoup: state.fixtures[i].recoup, pourAt: remaining == null ? 0 : host.now + remaining,
        doodad: { pos: { ...pos }, radius: definition.radius, kind: charge >= definition.need ? definition.lit : definition.cold } };
    });
    let effects: MassObjectiveEffects | undefined;
    if (definition.kind !== 'pyres') {
      if (!host.installHolds || !host.installEffects) return false;
      const body = this.hierarchy.controller(owner.id, bodiesId(definition.kind));
      if (!body || body.source !== 'engine/world/native-objective-bodies') throw Error('Missing native objective population checkpoint');
      const binding = host.installEffects(owner.id, definition.zone, fixtures, body.state ?? undefined);
      if (!binding) return false;
      effects = binding;
    }
    let detach: () => void;
    try { detach = host.installHolds ? host.installHolds(owner.id, definition.kind, fixtures) : host.installPyres(owner.id, fixtures); }
    catch (error) { effects?.detach(); throw error; }
    let chest: Chest | undefined, detachChest: (() => void) | undefined;
    try {
      if (definition.reward?.position) {
        const state = this.readChest(owner.id, definition);
        chest = { massObjectiveOwner: owner.id, rewardSource: definition.reward.source, rewardLevel: definition.zone.level,
          pos: local(definition.reward.position), kind: 'objective', mimic: false, lockTime: 0, maxLock: 0,
          opened: state.opened, ...(state.openedAt === undefined ? {} : { openedAt: state.openedAt }) };
        detachChest = host.installChest(owner.id, chest);
      }
    } catch (error) { detach(); effects?.detach(); throw error; }
    const run: Resident = { owner: owner.id, definition, fixtures, ...(chest ? { chest } : {}),
      ...(effects ? { effects } : {}), detach: () => { effects?.detach(); detachChest?.(); detach(); }, held: null };
    this.live.set(owner.id, run);
    if (effects) this.checkpointEffects(run, host.now, 'active');
    if (c.phase !== 'complete' && c.phase !== 'failed') this.checkpoint(run, host.now, 'active');
    else if (c.phase === 'complete') this.unlockChest(run, host.now);
    return true;
  }
  private chestRun(chest: Chest): Resident | undefined {
    const run = chest.massObjectiveOwner ? this.live.get(chest.massObjectiveOwner) : undefined;
    return run?.chest === chest && chest.rewardSource === run.definition.reward?.source ? run : undefined;
  }
  private unlockChest(run: Resident, now: number): void {
    const ID = idOf(run.definition.kind), CHEST_ID = chestId(run.definition.kind);
    if (!run.chest || this.hierarchy.status(run.owner, ID)?.phase !== 'complete') return;
    const c = this.hierarchy.status(run.owner, CHEST_ID)!;
    if (c.phase === 'waiting' && !this.hierarchy.update(run.owner, CHEST_ID, c.revision, now, { opened: false }, 'active'))
      throw Error('Concurrent native objective chest unlock');
  }
  private readChest(owner: string, definition: Readonly<PyreDefinition>): ChestState {
    const ID = idOf(definition.kind), c = this.hierarchy.controller(owner, chestId(definition.kind)), state = c?.state as ChestState;
    if (!c || c.source !== 'engine/world/objective-chest' || canonical(c.definition) !== canonical(definition.reward)
      || !state || typeof state.opened !== 'boolean' || !['waiting', 'active', 'complete'].includes(c.phase)
      || state.opened !== (c.phase === 'complete') || state.opened && (!Number.isFinite(state.openedAt) || state.openedAt! < 0 || state.openedAt! > c.updatedAt)
      || !state.opened && state.openedAt !== undefined
      || state.opened && !c.receipts.some(r => r.id === 'opened' && r.subject === definition.reward?.source && r.kind === 'chest-opened')
      || state.opened && this.hierarchy.controller(owner, ID)?.phase !== 'complete') throw Error('Invalid native objective chest checkpoint');
    return clone(state);
  }
  private checkpoint(run: Resident, now: number, phase: 'active' | 'dormant' | 'complete'): void {
    const ID = idOf(run.definition.kind), c = this.hierarchy.status(run.owner, ID)!;
    if (c.phase === 'complete' || c.phase === 'failed') return;
    const state: PyreState = { fixtures: run.fixtures.map(s => ({ charge: s.charge, recoup: s.recoup,
      ...(run.definition.kind === 'rifts' ? { pourRemaining: s.pourAt === 0 ? null : Math.max(0, s.pourAt - now) } : {}) })) };
    if (!this.hierarchy.update(run.owner, ID, c.revision, now, state, phase)) throw Error('Concurrent native objective checkpoint');
  }
  /** Called before hierarchy.snapshot, not every frame: native actor graphs are
   * captured once per actual save or safe retirement, avoiding hot-loop work. */
  captureEffects(host: MassObjectiveHost): void {
    for (const run of this.live.values()) { this.checkpoint(run, host.now, 'active'); this.checkpointEffects(run, host.now, 'active'); }
  }
  private checkpointEffects(run: Resident, now: number, phase: 'active' | 'dormant'): void {
    if (!run.effects) return;
    const id = bodiesId(run.definition.kind), c = this.hierarchy.status(run.owner, id)!;
    if (!this.hierarchy.update(run.owner, id, c.revision, now, run.effects.capture(), phase)) throw Error('Concurrent native objective population checkpoint');
  }
  private read(owner: MassGeography, c: Readonly<MassControllerSave>): { definition: Readonly<PyreDefinition>; state: PyreState } {
    const d = c.definition as PyreDefinition, state = c.state as PyreState;
    if (owner.kind !== 'zone' || c.source !== d?.source || !isNativeMassHoldKind(d?.kind) || c.id !== idOf(d.kind) || d.zone?.objective.kind !== d.kind
      || !Number.isFinite(d.need) || d.need <= 0 || !Number.isFinite(d.radius) || d.radius <= 0
      || !Number.isFinite(d.holdRadius) || d.holdRadius <= 0 || !['radius', 'sight', 'roof'].includes(d.reach)
      || !d.cold || !d.lit || !d.accent || !Array.isArray(d.positions) || !d.positions.length || d.positions.length > 32
      || new Set(d.positions.map(canonical)).size !== d.positions.length || d.positions.some(at => !massBoundsContains(owner.bounds, at, this.hierarchy.addressSpan))
      || d.reward && (!Number.isFinite(d.reward.chance) || d.reward.chance < 0 || d.reward.chance > 1
        || d.reward.source !== canonical([owner.id, idOf(d.kind), 'chest']) || d.reward.position !== null && !massBoundsContains(owner.bounds, d.reward.position, this.hierarchy.addressSpan))
      || !Array.isArray(state?.fixtures) || state.fixtures.length !== d.positions.length
      || state.fixtures.some(s => !Number.isFinite(s.charge) || s.charge < 0 || s.charge > d.need || !Number.isFinite(s.recoup) || s.recoup < 0)
      || d.kind === 'rifts' && (!d.pour || state.fixtures.some(s => s.pourRemaining !== null && (!Number.isFinite(s.pourRemaining) || s.pourRemaining! < 0)))
      || d.kind === 'unearth' && !d.dig
      || c.phase === 'complete' && (state.fixtures.some(s => s.charge !== d.need)
        || !c.receipts.some(r => r.id === 'native-objective-payout' && r.subject === owner.id && r.kind === 'objective-complete')))
      throw Error('Invalid native pyre checkpoint');
    return { definition: freezeData(clone(d)), state: clone(state) };
  }
}
