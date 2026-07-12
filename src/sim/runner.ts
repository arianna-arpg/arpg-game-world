// ---------------------------------------------------------------------------
// THE EPISODE RUNNER — one scenario × one seed → one measured episode.
//
// The loop is the HOST frame loop, verbatim (main.ts order): poll every seat's
// input source → world.applyInputs → updateAI per actor → world.update(dt).
// Fixed 60 Hz ticks, wall-clock free, Math.random seeded per episode — the
// same seed replays the same episode exactly.
//
// Wave bookkeeping (who belongs to wave N, when did its last member die)
// lives here because only the runner knows the spawn schedule; everything
// event-shaped comes from the SimTap collector.
// ---------------------------------------------------------------------------

import { vec } from '../core/math';
import { updateAI } from '../engine/ai';
import type { Actor } from '../engine/actor';
import { setSimTap } from '../engine/tap';
import type { World } from '../engine/world';
import { MONSTERS } from '../data/monsters';
import type { PlayerInput } from '../net/intent';
import { SIM_CFG, makeSimWorld } from './arena';
import { applyAnyBuild, entryClassId, entryLevel } from './builds';
import { Collector, aggregate, collectMetrics, round2, summarize } from './metrics';
import { makePilot } from './pilots';
import { deriveSeed, seedGlobalRandom } from './rng';
import { BUILDS } from './data/builds';
import type { BuildEntry, EpisodeResult, ScenarioDef, ScenarioReport, WaveSpec } from './types';

export function resolveBuild(ref: string | BuildEntry): BuildEntry {
  if (typeof ref !== 'string') return ref;
  const spec = BUILDS[ref];
  if (!spec) throw new Error(`sim: unknown build '${ref}' (have: ${Object.keys(BUILDS).join(', ')})`);
  return spec;
}

interface LiveWave {
  spec: WaveSpec;
  nextAt: number;          // next (or first) spawn time
  spawned: number;         // how many times this wave has spawned
  members: Actor[];        // the LATEST spawn's members (repeat waves overwrite)
  spawnedAt: number;
  clearedAt: number | null;
  /** Effective kill pool (life + ES, post-promotion) of the latest spawn —
   *  the numerator of edps_cycle_mean. */
  cyclePool: number;
}

function spawnWave(world: World, wave: WaveSpec, parityLevel: number, warnings: string[]): Actor[] {
  const hero = world.player;
  const ring = wave.distance ?? SIM_CFG.spawnDistance;
  const entries = wave.monsters.flatMap(m => new Array(m.count ?? 1).fill(m) as typeof wave.monsters);
  const members: Actor[] = [];
  entries.forEach((m, i) => {
    if (!MONSTERS[m.id]) {
      warnings.push(`unknown monster '${m.id}' — not spawned`);
      return;
    }
    const a = world.createMonster(m.id, Math.max(1, m.level ?? parityLevel), 'enemy');
    const ang = (i / Math.max(1, entries.length)) * Math.PI * 2 + Math.random() * 0.4;
    a.pos = world.clampPos(
      vec(hero.pos.x + Math.cos(ang) * ring, hero.pos.y + Math.sin(ang) * ring), a.radius);
    world.actors.push(a);
    if (m.rarity && m.rarity !== 'normal') world.promoteMonster(a, m.rarity);
    members.push(a);
  });
  return members;
}

export function runEpisode(scenario: ScenarioDef, seed: number): EpisodeResult {
  const restoreRandom = seedGlobalRandom(seed);
  const warnings: string[] = [];
  let world: World | null = null;
  try {
    const build = resolveBuild(scenario.build);
    world = makeSimWorld(entryClassId(build), seed);
    warnings.push(...applyAnyBuild(world, build, deriveSeed(seed, 0x9ea7)));
    // Freeze XP by default: mid-episode level-ups would move the thing being
    // measured. xpNeeded is per-seat data, so a data-sized freeze suffices.
    if (scenario.freezeXp !== false) world.meta.xpNeeded = Number.MAX_SAFE_INTEGER;
    world.localSeat.input = makePilot(scenario.pilot);
    // The injected hero's sheet at spawn — a report should explain its own
    // survivability numbers without anyone re-deriving the build by hand.
    const heroMaxLife = world.player.maxLife();
    const heroMaxMana = world.player.maxMana();

    const collector = new Collector(world);
    setSimTap(collector);

    const dt = SIM_CFG.dt;
    const parity = scenario.parityLevel ?? entryLevel(build);
    const waves: LiveWave[] = scenario.waves.map(w => ({
      spec: w, nextAt: w.at ?? 0, spawned: 0, members: [], spawnedAt: 0, clearedAt: null, cyclePool: 0,
    }));
    for (const w of waves) {
      if (w.spec.repeatEvery !== undefined && w.spec.respawnOnClear !== undefined) {
        warnings.push(`wave sets both repeatEvery and respawnOnClear — repeatEvery wins`);
      }
    }
    const repeating = waves.some(w => w.spec.repeatEvery !== undefined || w.spec.respawnOnClear !== undefined);
    let stop = scenario.stop ?? (repeating ? 'duration' : 'waves_dead');
    if (stop === 'waves_dead' && repeating) {
      warnings.push(`stop 'waves_dead' with repeating waves — falling back to 'duration'`);
      stop = 'duration';
    }

    const sampleEvery = Math.max(1, Math.round(1 / ((scenario.sampleHz ?? SIM_CFG.sampleHz) * dt)));
    const maxTicks = Math.min(Math.ceil(scenario.duration / dt), SIM_CFG.maxTicksHardCap);
    const clearTimes: number[] = [];
    // One entry per CLEARED spawn cycle: how big the body was and how long it
    // took — pool/ttk is the effective-DPS-into-this-texture reading.
    const cycles: { ttk: number; pool: number }[] = [];
    let ended = 'duration';
    let t = 0;

    for (let tick = 0; tick < maxTicks; tick++) {
      t = tick * dt;
      collector.tick(t);

      // Wave spawns due this tick. respawnOnClear waves re-arm nextAt in the
      // clear hook below, so "nextAt is finite and due" is the whole gate.
      for (const w of waves) {
        if (w.nextAt <= t && (w.spawned === 0 || w.spec.repeatEvery !== undefined
          || (w.spec.respawnOnClear !== undefined && w.clearedAt !== null))) {
          w.members = spawnWave(world, w.spec, parity, warnings);
          // Post-promotion sheet read: the pool a kill actually chews through.
          w.cyclePool = w.members.reduce((s, a) => s + a.maxLife() + a.maxEs(), 0);
          w.spawnedAt = t;
          w.clearedAt = null;
          w.spawned++;
          w.nextAt = w.spec.repeatEvery !== undefined ? t + w.spec.repeatEvery : Infinity;
        }
      }

      // ---- the host frame, verbatim -------------------------------------
      const inputs = new Map<string, PlayerInput>();
      for (const seat of world.seats) {
        const intent = seat.input.poll(seat.actor, world, dt);
        if (intent) inputs.set(seat.id, intent);
      }
      world.applyInputs(inputs, dt);
      for (const a of world.actors) updateAI(a, world, dt);
      world.update(dt);
      // --------------------------------------------------------------------

      // Wave clears (TTK) — check after the sim tick so same-tick deaths count.
      for (const w of waves) {
        if (w.spawned > 0 && w.clearedAt === null && w.members.length && w.members.every(a => a.dead)) {
          w.clearedAt = t;
          const ttk = round2(t - w.spawnedAt);
          clearTimes.push(ttk);
          cycles.push({ ttk, pool: w.cyclePool });
          // Matchup duels: schedule the next fresh body (repeatEvery wins the
          // conflict — its clock is already armed).
          if (w.spec.respawnOnClear !== undefined && w.spec.repeatEvery === undefined) {
            w.nextAt = t + w.spec.respawnOnClear;
          }
        }
      }

      if (tick % sampleEvery === 0 && !collector.sample()) { ended = 'error'; break; }

      const hero = world.player;
      if (hero.dead || hero.downed || world.gameOver) { ended = 'player_dead'; break; }
      if (stop === 'waves_dead'
        && waves.every(w => w.spawned > 0 && w.clearedAt !== null)) {
        ended = 'waves_dead';
        break;
      }
    }

    const simSeconds = Math.min(t + dt, scenario.duration);
    const metrics = collectMetrics(collector, simSeconds);
    if (clearTimes.length) {
      const s = summarize(clearTimes);
      metrics.ttk_wave_mean = s.mean;
      metrics.ttk_wave_max = s.max;
    }
    if (cycles.length) {
      // Effective DPS through kill cycles: pool ÷ time-to-kill, per cycle.
      // THE matchup headline — comparable across defense textures because a
      // bigger pool and a longer kill cancel where raw ttk would mislead.
      metrics.cycles_cleared = cycles.length;
      metrics.cycle_pool_mean = summarize(cycles.map(c => c.pool)).mean;
      metrics.edps_cycle_mean = summarize(cycles.map(c => c.pool / Math.max(c.ttk, dt))).mean;
    }
    const heroDeath = collector.deaths.find(d => d.who === 'player');
    if (heroDeath) metrics.died_at = heroDeath.t;
    metrics.hero_level = entryLevel(resolveBuild(scenario.build));
    metrics.hero_max_life = round2(heroMaxLife);
    metrics.hero_max_mana = round2(heroMaxMana);
    metrics.warning_count = warnings.length + collector.warnings.length;

    return {
      scenarioId: scenario.id,
      seed,
      simSeconds: round2(simSeconds),
      ended,
      metrics,
      fingerprint: collector.fingerprint(),
      casts: Object.fromEntries(collector.casts),
      deaths: collector.deaths.slice(0, 200),
      warnings: [...warnings, ...collector.warnings],
    };
  } finally {
    setSimTap(null);
    restoreRandom();
  }
}

export interface RunOpts {
  seeds: number;
  baseSeed?: number;
}

export function runScenario(scenario: ScenarioDef, opts: RunOpts): { report: ScenarioReport; episodes: EpisodeResult[] } {
  const baseSeed = opts.baseSeed ?? 0xa11ce;
  const episodes: EpisodeResult[] = [];
  for (let i = 0; i < Math.max(1, opts.seeds); i++) {
    episodes.push(runEpisode(scenario, deriveSeed(baseSeed, i + 1)));
  }
  const warnings: Record<string, number> = {};
  for (const ep of episodes) {
    for (const w of ep.warnings) warnings[w] = (warnings[w] ?? 0) + 1;
  }
  const report: ScenarioReport = {
    scenarioId: scenario.id,
    label: scenario.label,
    episodes: episodes.length,
    baseSeed,
    metrics: aggregate(episodes.map(e => e.metrics)),
    warnings,
  };
  return { report, episodes };
}
