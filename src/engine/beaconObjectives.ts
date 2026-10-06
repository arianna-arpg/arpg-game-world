import type { Vec2 } from '../core/math';
import { BEACON_CFG } from '../data/beacons';
import { pressureRampAt, pressureRampCadence } from '../data/objectives';
import type { ObjectiveSpec, PackTableEntry } from '../data/zones';
import { transitDwell, transitRadius, transitReach, type DwellReach } from '../data/transit';
import { driveHoldObjectives, resolveHoldContest, type HoldFixture, type HoldObjectiveHost, type NativeHoldRandom } from './holdObjectives';

export type NativeBeaconSpec = Extract<ObjectiveSpec, { kind: 'beacon' }>;
export { resolveNativeBeacon } from './beaconSpec';
export interface NativeBeaconReinforceConfig {
  every: readonly [number, number]; batch: readonly [number, number]; cap: number;
  mixFactions: readonly string[]; mixChance: number; radius: readonly [number, number]; levelBonus: number; levelScale: boolean;
}
export interface NativeBeaconConfig {
  need: number; radius: number; cold: string; lit: string; holdRadius: number; reach: DwellReach;
  contest: ReturnType<typeof resolveHoldContest>; accent: string; flareColor: string; flareRadius: number;
  lureRadius: number; lurePace: number; lureStandoff: number; revealRadius: number; revealCount: number; revealSalt: number;
  reinforce: NativeBeaconReinforceConfig | false;
}
/** Resolve once at owner birth. Saved owners retain this complete tuning. */
export function nativeBeaconConfig(o: NativeBeaconSpec): NativeBeaconConfig {
  const circuit = (o.count ?? 1) > 1;
  return { need: o.chargeSec ?? transitDwell('beacon', BEACON_CFG.chargeSec), radius: circuit ? BEACON_CFG.wayRadius : BEACON_CFG.radius,
    cold: circuit ? BEACON_CFG.kindWay : BEACON_CFG.kind, lit: circuit ? BEACON_CFG.kindWayLit : BEACON_CFG.kindLit,
    holdRadius: transitRadius('beacon', BEACON_CFG.holdRadius), reach: transitReach('beacon'), contest: resolveHoldContest(BEACON_CFG.contest, o.contest),
    accent: BEACON_CFG.accent, flareColor: BEACON_CFG.flare, flareRadius: circuit ? 160 : 240,
    lureRadius: o.lureRadius ?? BEACON_CFG.lureRadius, lurePace: BEACON_CFG.lurePace, lureStandoff: BEACON_CFG.lureStandoff,
    revealRadius: o.revealRadius ?? BEACON_CFG.revealRadius, revealCount: o.revealCount ?? BEACON_CFG.revealCount, revealSalt: BEACON_CFG.revealSalt,
    reinforce: o.reinforce === false ? false : { ...BEACON_CFG.reinforce, ...o.reinforce } };
}
export interface NativeBeaconState { reinforceAt: number }
export interface NativeBeaconTables { native: readonly PackTableEntry[]; mix: readonly PackTableEntry[] }
export interface NativeBeaconHost {
  now: number; level: number; player: Vec2; random: NativeHoldRandom;
  /** Native spire_drawn census over this entire physical objective zone. */
  born(): number;
  tables(at: Vec2, config: NativeBeaconReinforceConfig): NativeBeaconTables;
  spawn(fixture: HoldFixture, count: number, config: NativeBeaconReinforceConfig, tables: NativeBeaconTables): number;
  lure(fixture: HoldFixture, slot: number, config: NativeBeaconConfig): void;
  flash(pos: Vec2, radius: number, color: string, life: number): void;
}
/** Exact native scheduler ordering, including the beat before cap/table checks,
 * no first-tick group, mix-only rosters, and one operation clock for a circuit. */
export function driveNativeBeaconReinforce(fixtures: HoldFixture[], need: number, config: NativeBeaconReinforceConfig | false,
  accent: string, state: NativeBeaconState, host: NativeBeaconHost): void {
  if (config === false || !fixtures.some(s => s.charge > 0 && s.charge < need)) return;
  const ramp = config.levelScale === false ? 1 : pressureRampAt(host.level);
  const beat = () => host.random.range(config.every[0], config.every[1]) / pressureRampCadence(ramp);
  if (state.reinforceAt === 0) { state.reinforceAt = host.now + beat(); return; }
  if (host.now < state.reinforceAt) return;
  state.reinforceAt = host.now + beat();
  const cap = Math.max(1, Math.round(config.cap * ramp)), drawn = host.born();
  if (drawn >= cap) return;
  let at: HoldFixture | undefined, distance = Infinity;
  for (const s of fixtures) if (s.charge > 0 && s.charge < need) {
    const d = Math.hypot(s.pos.x - host.player.x, s.pos.y - host.player.y);
    if (d < distance) { at = s; distance = d; }
  }
  if (!at) return;
  const tables = host.tables(at.pos, config);
  if (!tables.native.length && !tables.mix.length) return;
  const count = Math.min(host.random.int(Math.max(1, Math.round(config.batch[0] * ramp)), Math.max(1, Math.round(config.batch[1] * ramp))), cap - drawn);
  host.spawn(at, count, config, tables);
  host.flash({ ...at.pos }, 40, accent, .35);
}
/** The same hold, lure, reinforcement order used by the ordinary native driver.
 * Completion/reveal and rewards remain in the owning scene's receipt fabric. */
export function driveNativeBeacon(dt: number, fixtures: HoldFixture[], config: NativeBeaconConfig, state: NativeBeaconState,
  hold: HoldObjectiveHost, host: NativeBeaconHost): ReturnType<typeof driveHoldObjectives> {
  const result = driveHoldObjectives(dt, { fixtures, need: config.need, transitKind: 'beacon', holdFallback: config.holdRadius,
    holdRadius: config.holdRadius, reach: config.reach, contest: config.contest, doneKind: config.lit, accent: config.accent,
    flareColor: config.flareColor, flareR: config.flareRadius,
    // This native string triggers the first-charge flash; presentation owns silence.
    stirText: `the ${fixtures.length > 1 ? 'waystone' : 'spire'} stirs — the wilds turn toward its light…` }, hold);
  fixtures.forEach((s, i) => { if (s.charge > 0 && s.charge < config.need) host.lure(s, i, config); });
  driveNativeBeaconReinforce(fixtures, config.need, config.reinforce, config.accent, state, host);
  return result;
}
