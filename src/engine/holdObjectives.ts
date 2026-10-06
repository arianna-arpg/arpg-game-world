import type { Vec2 } from '../core/math';
import type { Doodad } from './levelgen';
import { CONTEST_CFG, pressureRampAt, pressureRampCadence, type ContestSpec, type ContestRecoupSpec } from '../data/objectives';
import type { ObjectiveSpec } from '../data/zones';
import { transitRadius, transitReach, type DwellReach } from '../data/transit';

/** Native fixture state, shared by the ordinary zone and seamless owner lanes.
 * The owner marker changes enrollment only; it never changes contest rules. */
export interface HoldFixture {
  pos: Vec2; charge: number; doodad: Doodad; pourAt: number; recoup: number;
  owner?: string;
  holdRead?: { contested: boolean; draining: boolean; recouping: boolean };
}
export interface HoldObjectiveOptions {
  fixtures: HoldFixture[]; need: number;
  transitKind: string; holdFallback: number; contest: ContestSpec | null;
  /** Resolved native transit row for an already-born geographic operation. */
  holdRadius?: number; reach?: DwellReach;
  doneKind: string; accent: string; flareColor: string; flareR: number;
  stirText?: string; onFill?: (s: HoldFixture) => void;
}
export interface HoldObjectiveHost {
  player: { dead: boolean; pos: Vec2 };
  reachable(s: HoldFixture, reach: DwellReach): boolean;
  pressers(s: HoldFixture, contest: ContestSpec): number;
  held(s: HoldFixture | null): void;
  text(pos: Vec2, text: string, color: string, size: number): void;
  flash(pos: Vec2, radius: number, color: string, life: number): void;
  changed(): void;
}
export function resolveHoldContest(base: ContestSpec, tuning: ObjectiveSpec['contest']): ContestSpec | null {
  if (tuning === false) return null;
  if (!tuning) return base;
  const merged = { ...base, ...tuning } as ContestSpec;
  if (tuning.recoup && typeof tuning.recoup === 'object') {
    const floor = (base.recoup || CONTEST_CFG.recoup) as ContestRecoupSpec;
    merged.recoup = { ...floor, ...tuning.recoup };
  }
  return merged;
}
/** Extracted native driveHoldFixtures algorithm. The host supplies exact native
 * story/reach/countability tests; geographic owners do not replace those rules. */
export function driveHoldObjectives(dt: number, opts: HoldObjectiveOptions, host: HoldObjectiveHost):
  { filled: HoldFixture | null; contested: boolean; draining: boolean; recouping: boolean } {
  const holdR = opts.holdRadius ?? transitRadius(opts.transitKind, opts.holdFallback);
  const rec = opts.contest && opts.contest.recoup && opts.contest.recoup.boost > 1 ? opts.contest.recoup : null;
  const recCap = rec ? opts.need * rec.capFrac : 0;
  let held: HoldFixture | null = null;
  if (!host.player.dead) {
    let bd = Infinity;
    for (const s of opts.fixtures) {
      if (s.charge >= opts.need) continue;
      const d = Math.hypot(host.player.pos.x - s.pos.x, host.player.pos.y - s.pos.y);
      if (d <= holdR && d < bd && host.reachable(s, opts.reach ?? transitReach(opts.transitKind))) { bd = d; held = s; }
    }
  }
  let contested = false, draining = false, recouping = false;
  let filled: HoldFixture | null = null;
  host.held(held);
  for (const s of opts.fixtures) {
    const read = s.holdRead ??= { contested: false, draining: false, recouping: false };
    read.contested = read.draining = read.recouping = false;
    if (s.charge >= opts.need || s !== held && s.charge <= 0) continue;
    const pressers = opts.contest ? host.pressers(s, opts.contest) : 0;
    if (opts.contest && pressers >= opts.contest.drainAt) {
      const preSmother = s.charge;
      s.charge = Math.max(0, s.charge - opts.contest.drainPerSec * dt);
      if (rec && s === held) s.recoup = Math.min(recCap, s.recoup + dt + (preSmother - s.charge) * rec.drainRefund);
      draining = read.draining = true;
      continue;
    }
    if (s !== held) continue;
    if (opts.contest && pressers >= opts.contest.stallAt) {
      contested = read.contested = true;
      if (rec) s.recoup = Math.min(recCap, s.recoup + dt);
      continue;
    }
    const was = s.charge;
    let build = dt;
    if (rec && s.recoup > 0) {
      const extra = Math.min(s.recoup, dt * (rec.boost - 1));
      s.recoup -= extra; build += extra;
      if (extra > 0) recouping = read.recouping = true;
    }
    s.charge = Math.min(opts.need, s.charge + build);
    if (was <= 0 && s.charge > 0 && opts.stirText) {
      host.text({ x: s.pos.x, y: s.pos.y - 40 }, opts.stirText, opts.accent, 14);
      host.flash({ ...s.pos }, 90, opts.accent, .5);
    }
    if (s.charge >= opts.need) {
      s.doodad.kind = opts.doneKind;
      host.changed();
      host.flash({ ...s.pos }, opts.flareR, opts.flareColor, .8);
      filled = s; opts.onFill?.(s);
    }
  }
  return { filled, contested, draining, recouping };
}

export interface RiftPourConfig {
  every: readonly [number, number]; batch: readonly [number, number]; cap: number;
  radius: readonly [number, number]; levelBonus: number; levelScale?: boolean;
}
export interface DigFinishConfig {
  spoilGemChance: number;
  ambush: { chance: number; count: readonly [number, number]; radius: readonly [number, number]; levelBonus: number };
}
export interface NativeHoldRandom {
  range(lo: number, hi: number): number;
  int(lo: number, hi: number): number;
}
export interface NativeRiftPourHost {
  now: number; level: number; hasPacks: boolean;
  /** The native zone-wide rift_born census, scoped to the owning place. */
  born(): number;
  random: NativeHoldRandom;
  /** Native effective table, weighted species, factory and placement artery. */
  spawn(fixture: HoldFixture, count: number, config: RiftPourConfig): number;
  flash(pos: Vec2, radius: number, color: string, life: number): void;
}
/** Exact native updateRiftPours scheduler. Source population, native factories
 * and residency remain host-owned; the routine never substitutes monster rules. */
export function driveNativeRiftPours(fixtures: HoldFixture[], need: number, config: RiftPourConfig,
  accent: string, host: NativeRiftPourHost): void {
  if (!host.hasPacks) return;
  const ramp = config.levelScale === false ? 1 : pressureRampAt(host.level);
  const cap = Math.max(1, Math.round(config.cap * ramp));
  let born = host.born();
  for (const fixture of fixtures) {
    if (fixture.charge >= need) continue;
    if (fixture.pourAt === 0) {
      fixture.pourAt = host.now + host.random.range(config.every[0], config.every[1]) / pressureRampCadence(ramp);
      continue;
    }
    if (host.now < fixture.pourAt) continue;
    fixture.pourAt = host.now + host.random.range(config.every[0], config.every[1]) / pressureRampCadence(ramp);
    if (born >= cap) continue;
    const count = Math.min(host.random.int(Math.max(1, Math.round(config.batch[0] * ramp)),
      Math.max(1, Math.round(config.batch[1] * ramp))), cap - born);
    born += host.spawn(fixture, count, config);
    host.flash({ ...fixture.pos }, 60, accent, .4);
  }
}
export interface NativeDigFinishHost {
  hasPacks: boolean; random: NativeHoldRandom;
  spillGem(pos: Vec2): void;
  /** Pick the native table/type FIRST, then the native count and birth band.
   * Keeping this whole artery in the host preserves the native RNG draw order. */
  ambush(pos: Vec2, config: DigFinishConfig['ambush']): void;
  text(pos: Vec2, text: string, color: string, size: number): void;
}
/** Exact native unearthed-mound spill/spring rules. The ordinary native loot
 * choke point keeps its spoils policy; this extraction does not mint loot. */
export function finishNativeDig(fixture: HoldFixture, config: DigFinishConfig, host: NativeDigFinishHost): void {
  if (host.random.range(0, 1) < config.spoilGemChance)
    host.spillGem({ x: fixture.pos.x, y: fixture.pos.y + 18 });
  const ambush = config.ambush;
  if (host.random.range(0, 1) < ambush.chance && host.hasPacks) {
    host.ambush({ ...fixture.pos }, ambush);
    host.text({ x: fixture.pos.x, y: fixture.pos.y - 56 }, 'the turned earth answers!', '#d05050', 14);
  }
}
