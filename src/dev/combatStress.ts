// ---------------------------------------------------------------------------
// COMBAT & SWARM STRESS SUITE — deterministic high-density combat, minion,
// projectile, DoT/proc, segmented-worm, and lite-crowd scenarios shared by:
//   - Headless Node forensics (`balance/combat-perf.ts` / `npm run perf:sim`)
//   - Live Electron Canvas2D forensics (`balance/combat-perf-ui.cjs` / `npm run perf:combat`)
//
// Complements `src/dev/perf.ts` (`npm run perf`), which walks biome zones with
// a non-attacking invulnerable hero. Every scenario here runs a kitted high-
// level build with socketed support gems inside a real minted biome zone,
// driving sustained peak-density combat and computing a bit-exact state + RNG
// fingerprint at completion so engine optimizations prove zero gameplay drift.
// ---------------------------------------------------------------------------

import { vec } from '../core/math';
import { PROGRESSION } from '../data/classes';
import { MONSTERS } from '../data/monsters';
import { resetActorIdCounter, type Actor } from '../engine/actor';
import { updateAI } from '../engine/ai';
import {
  PERF_SLABS, SIM_SLAB_IDX,
  perfSlabsAddSim, perfSlabsCommitSim, perfSlabsReset, summarizePerfSlabs,
  type PerfSlabsSummary,
} from '../engine/perfSlabs';
import type { MonsterRarity } from '../engine/rarity';
import { CORPSE_CFG, type World } from '../engine/world';
import type { PlayerInput } from '../net/intent';
import { VIS_TELEMETRY, setVisAblate } from '../render/vis/visConfig';
import { SIM_CFG, makeSimWorld } from '../sim/arena';
import { applyBuild } from '../sim/builds';
import { GEARED_CFG, greedyPassives } from '../sim/data/builds';
import { makePilot } from '../sim/pilots';
import { deriveSeed, seedGlobalRandom } from '../sim/rng';
import type { BuildSkillSpec, BuildSpec, PilotSpec } from '../sim/types';

export interface StressRingSpec {
  atSec: number;
  repeatEverySec?: number;
  maxAliveEnemies?: number;
  distance: number;
  monsters: { id: string; count: number; rarity?: MonsterRarity; levelOffset?: number }[];
}

export interface CombatStressScenario {
  id: string;
  label: string;
  seed: number;
  zoneSeed: number;
  tileset: string;
  spread: number;
  level: number;
  build: BuildSpec;
  pilot: PilotSpec;
  rocks: { bearingDeg: number; distance: number; radius: number }[];
  rings: StressRingSpec[];
  corpseFeed?: { everySec: number; count: number; monsterId: string };
  litePour?: { monsterId: string; count: number };
}

export interface CombatStressOpts {
  /** Comma-separated substring filter on scenario ids ('' = all). */
  filter?: string;
  /** Warmup ticks before slab/heap measurement begins (default 120 = 2.0s). */
  warmupTicks?: number;
  /** Measured steady-state combat ticks per scenario (default 360 = 6.0s). */
  measureTicks?: number;
  /** Render passes to ablate in browser mode. */
  ablate?: string[];
  /** Optional hook invoked right before the measured window opens (e.g. GC + heap mark). */
  beforeMeasure?: (scenarioId: string) => void | Promise<void>;
  /** Optional hook invoked right after the measured window closes (returns custom telemetry). */
  afterMeasure?: (scenarioId: string, ticks: number) => Record<string, unknown> | void | Promise<Record<string, unknown> | void>;
}

export interface CombatStressFingerprint {
  hashHex: string;
  nextRngU32: number;
  liveActors: number;
  liveEnemies: number;
  liveMinions: number;
  projectiles: number;
  zones: number;
  corpses: number;
  lite: number;
}

export interface CombatStressRow {
  id: string;
  label: string;
  tileset: string;
  zoneName: string;
  doodads: number;
  warmupTicks: number;
  measureTicks: number;
  wallMs: number;
  buildWarnings: string[];
  slabs: PerfSlabsSummary;
  fingerprint: CombatStressFingerprint;
  visBakes?: { snowBakes: number; groundBakes: number };
  extra?: Record<string, unknown>;
}

export interface CombatStressReport {
  mode: 'headless' | 'browser';
  warmupTicks: number;
  measureTicks: number;
  scenarios: CombatStressRow[];
}

function kittedStressBuild(
  id: string,
  classId: string,
  level: number,
  gearSeed: number,
  skills: BuildSkillSpec[],
): BuildSpec {
  return {
    id,
    classId,
    level,
    skills,
    passives: greedyPassives(classId, PROGRESSION.passivePointsAtLevel(level)),
    gear: GEARED_CFG.slots.map(slot => ({ slot, rarity: 'rare' as const })),
    gearSeed,
  };
}

export const COMBAT_STRESS_SCENARIOS: readonly CombatStressScenario[] = [
  {
    id: 'necromancer_court_siege',
    label: 'Necromancer Summon Court + Chain Lightning vs Undead Siege',
    seed: 0x51e6e101,
    zoneSeed: 0x2c79a11,
    tileset: 'crypt',
    spread: 1,
    level: 36,
    build: kittedStressBuild('stress_necro_court', 'necromancer', 36, 0x9ea701, [
      {
        id: 'chain_lightning', level: 13, rarity: 'legendary',
        supports: [{ id: 'chaining', level: 6 }, { id: 'spell_echo', level: 6 }, { id: 'loaded_dice', level: 6 }],
      },
      {
        id: 'summon_skeleton_archer', level: 13, rarity: 'legendary',
        supports: [{ id: 'splitting', level: 6 }, { id: 'piercing', level: 6 }, { id: 'resonance', level: 6 }, { id: 'fowlers_eye', level: 6 }],
      },
      {
        id: 'summon_skeleton', level: 13, rarity: 'legendary',
        supports: [{ id: 'multistrike', level: 6 }, { id: 'faultfinder', level: 6 }, { id: 'crushing_impact', level: 6 }],
      },
      {
        id: 'summon_bone_golem', level: 13, rarity: 'legendary',
        supports: [{ id: 'crushing_impact', level: 6 }, { id: 'battering_ram', level: 6 }, { id: 'overmatch', level: 6 }],
      },
      {
        id: 'summon_wraith', level: 13, rarity: 'legendary',
        supports: [{ id: 'envenomed_tips', level: 6 }, { id: 'poison_chance', level: 6 }, { id: 'chaining', level: 6 }],
      },
      {
        id: 'summon_raging_spirit', level: 13, rarity: 'rare',
        supports: [{ id: 'multistrike', level: 6 }],
      },
    ]),
    pilot: { kind: 'veteran', hand: { kind: 'caster', range: 175 } },
    rocks: [
      { bearingDeg: 0, distance: 135, radius: 22 },
      { bearingDeg: 45, distance: 155, radius: 24 },
      { bearingDeg: 90, distance: 135, radius: 22 },
      { bearingDeg: 135, distance: 155, radius: 24 },
      { bearingDeg: 180, distance: 135, radius: 22 },
      { bearingDeg: 225, distance: 155, radius: 24 },
      { bearingDeg: 270, distance: 135, radius: 22 },
      { bearingDeg: 315, distance: 155, radius: 24 },
    ],
    rings: [
      {
        atSec: 0, distance: 190,
        monsters: [
          { id: 'skeleton_warrior', count: 24 },
          { id: 'skeleton_archer', count: 18 },
          { id: 'zombie', count: 24 },
          { id: 'skeleton_warrior', count: 6, rarity: 'magic' },
          { id: 'skeleton_archer', count: 3, rarity: 'rare' },
        ],
      },
      {
        atSec: 0, distance: 290,
        monsters: [
          { id: 'blood_mite', count: 20 },
          { id: 'zombie', count: 14 },
        ],
      },
      {
        atSec: 2.0, repeatEverySec: 2.0, maxAliveEnemies: 115, distance: 250,
        monsters: [
          { id: 'skeleton_warrior', count: 12 },
          { id: 'skeleton_archer', count: 8 },
          { id: 'blood_mite', count: 10 },
          { id: 'zombie', count: 2, rarity: 'magic' },
        ],
      },
    ],
    corpseFeed: { everySec: 0.75, count: 3, monsterId: 'zombie' },
  },
  {
    id: 'projectile_masonry_storm',
    label: 'Multi-Projectile Split/Fork/Chain + Ballista Sentries + Segmented Worms + Pillar LoS',
    seed: 0x51e6e202,
    zoneSeed: 0x3b81d22,
    tileset: 'catacombs',
    spread: 2,
    level: 38,
    build: kittedStressBuild('stress_proj_storm', 'sorcerer', 38, 0x9ea702, [
      {
        id: 'frostbolt', level: 13, rarity: 'legendary',
        supports: [{ id: 'splitting', level: 6 }, { id: 'chaining', level: 6 }, { id: 'piercing', level: 6 }, { id: 'loaded_dice', level: 6 }],
      },
      {
        id: 'pyroclast_bolt', level: 13, rarity: 'legendary',
        supports: [{ id: 'forking', level: 6 }, { id: 'spell_echo', level: 6 }, { id: 'concentrated', level: 6 }, { id: 'splitting', level: 6 }],
      },
      {
        id: 'fireball', level: 13, rarity: 'legendary',
        supports: [{ id: 'splitting', level: 6 }, { id: 'forking', level: 6 }, { id: 'spell_echo', level: 6 }, { id: 'concentrated', level: 6 }],
      },
      {
        id: 'ballista_sentry', level: 13, rarity: 'rare',
        supports: [{ id: 'splitting', level: 6 }, { id: 'piercing', level: 6 }, { id: 'fowlers_eye', level: 6 }],
      },
    ]),
    pilot: { kind: 'veteran', hand: { kind: 'caster', range: 190 } },
    rocks: Array.from({ length: 16 }, (_, i) => ({
      bearingDeg: i * 22.5,
      distance: i % 2 === 0 ? 120 : 210,
      radius: i % 3 === 0 ? 28 : 22,
    })),
    rings: [
      {
        atSec: 0, distance: 175,
        monsters: [
          { id: 'skeleton_archer', count: 24 },
          { id: 'zombie', count: 26 },
          { id: 'blood_mite', count: 22 },
          { id: 'marrow_whip', count: 2, rarity: 'rare' },
          { id: 'primeval_wyrm_head', count: 1, rarity: 'rare' },
        ],
      },
      {
        atSec: 0, distance: 280,
        monsters: [
          { id: 'skeleton_warrior', count: 16 },
          { id: 'skeleton_archer', count: 6, rarity: 'magic' },
        ],
      },
      {
        atSec: 1.8, repeatEverySec: 1.8, maxAliveEnemies: 105, distance: 235,
        monsters: [
          { id: 'skeleton_archer', count: 10 },
          { id: 'blood_mite', count: 12 },
          { id: 'zombie', count: 8 },
        ],
      },
    ],
  },
  {
    id: 'affliction_proc_maelstrom',
    label: 'Stacking Ailments, Elites/Crowned Rims, Damage Bursts & AoE Cascades',
    seed: 0x51e6e303,
    zoneSeed: 0x4d92e33,
    tileset: 'forest',
    spread: 3,
    level: 36,
    build: kittedStressBuild('stress_affliction', 'apothecary', 36, 0x9ea703, [
      {
        id: 'venom_bolt', level: 13, rarity: 'legendary',
        supports: [{ id: 'splitting', level: 6 }, { id: 'piercing', level: 6 }, { id: 'poison_chance', level: 6 }, { id: 'putrefaction', level: 6 }],
      },
      {
        id: 'poison_nova', level: 13, rarity: 'rare',
        supports: [{ id: 'spell_echo', level: 6 }, { id: 'concentrated', level: 6 }, { id: 'poison_chance', level: 6 }],
      },
      {
        id: 'fireball', level: 13, rarity: 'legendary',
        supports: [{ id: 'splitting', level: 6 }, { id: 'forking', level: 6 }, { id: 'spell_echo', level: 6 }, { id: 'concentrated', level: 6 }],
      },
      {
        id: 'frost_nova', level: 13, rarity: 'rare',
        supports: [{ id: 'spell_echo', level: 6 }, { id: 'concentrated', level: 6 }, { id: 'loaded_dice', level: 6 }],
      },
    ]),
    pilot: { kind: 'veteran', hand: { kind: 'caster', range: 145 } },
    rocks: [
      { bearingDeg: 30, distance: 145, radius: 24 },
      { bearingDeg: 110, distance: 160, radius: 26 },
      { bearingDeg: 195, distance: 145, radius: 24 },
      { bearingDeg: 285, distance: 160, radius: 26 },
    ],
    rings: [
      {
        atSec: 0, distance: 155,
        monsters: [
          { id: 'zombie', count: 32 },
          { id: 'blood_mite', count: 28 },
          { id: 'skeleton_warrior', count: 20 },
          { id: 'zombie', count: 14, rarity: 'magic' },
          { id: 'skeleton_warrior', count: 6, rarity: 'rare' },
          { id: 'zombie', count: 2, rarity: 'crowned' },
        ],
      },
      {
        atSec: 1.5, repeatEverySec: 1.5, maxAliveEnemies: 120, distance: 210,
        monsters: [
          { id: 'blood_mite', count: 14 },
          { id: 'zombie', count: 10 },
          { id: 'skeleton_warrior', count: 3, rarity: 'magic' },
          { id: 'zombie', count: 1, rarity: 'rare' },
        ],
      },
    ],
  },
  {
    id: 'lite_throng_stampede',
    label: '300 Lite Pool Tide + Melee/Whirlwind Carves + Swarmlings + Segmented Coils',
    seed: 0x51e6e404,
    zoneSeed: 0x5ea3f44,
    tileset: 'sandsea',
    spread: 4,
    level: 36,
    build: kittedStressBuild('stress_lite_stampede', 'berserker', 36, 0x9ea704, [
      {
        id: 'cleave', level: 13, rarity: 'rare',
        supports: [{ id: 'multistrike', level: 6 }, { id: 'faultfinder', level: 6 }, { id: 'serrated_edge', level: 6 }],
      },
      {
        id: 'whirlwind', level: 13, rarity: 'legendary',
        supports: [{ id: 'concentrated', level: 6 }, { id: 'poison_chance', level: 6 }, { id: 'serrated_edge', level: 6 }, { id: 'crushing_impact', level: 6 }],
      },
      {
        id: 'carve', level: 13, rarity: 'rare',
        supports: [{ id: 'multistrike', level: 6 }, { id: 'crushing_impact', level: 6 }, { id: 'serrated_edge', level: 6 }],
      },
      {
        id: 'summon_swarmlings', level: 13, rarity: 'rare',
        supports: [{ id: 'multistrike', level: 6 }, { id: 'poison_chance', level: 6 }, { id: 'serrated_edge', level: 6 }],
      },
    ]),
    pilot: { kind: 'veteran', hand: { kind: 'brawler' } },
    rocks: [
      { bearingDeg: 60, distance: 170, radius: 26 },
      { bearingDeg: 180, distance: 170, radius: 26 },
      { bearingDeg: 300, distance: 170, radius: 26 },
    ],
    rings: [
      {
        atSec: 0, distance: 165,
        monsters: [
          { id: 'blood_mite', count: 24 },
          { id: 'skeleton_warrior', count: 18 },
          { id: 'zombie', count: 14 },
          { id: 'coil_matriarch', count: 2, rarity: 'rare' },
          { id: 'skeleton_warrior', count: 4, rarity: 'magic' },
        ],
      },
      {
        atSec: 2.0, repeatEverySec: 2.0, maxAliveEnemies: 75, distance: 215,
        monsters: [
          { id: 'blood_mite', count: 12 },
          { id: 'skeleton_warrior', count: 8 },
        ],
      },
    ],
    litePour: { monsterId: 'vermin_tide', count: 300 },
  },
];

function liveEnemyCount(world: World): number {
  let n = 0;
  for (let i = 0; i < world.actors.length; i++) {
    const a = world.actors[i];
    if (!a.dead && a.team === 'enemy') n++;
  }
  return n;
}

function spawnRing(world: World, ring: StressRingSpec, baseLevel: number): void {
  if (ring.maxAliveEnemies !== undefined && liveEnemyCount(world) >= ring.maxAliveEnemies) return;
  const hero = world.player;
  let total = 0;
  for (const m of ring.monsters) total += m.count;
  let idx = 0;
  for (const m of ring.monsters) {
    if (!MONSTERS[m.id]) continue;
    for (let k = 0; k < m.count; k++) {
      if (ring.maxAliveEnemies !== undefined && liveEnemyCount(world) >= ring.maxAliveEnemies) return;
      const ang = (idx / Math.max(1, total)) * Math.PI * 2 + Math.random() * 0.25;
      idx++;
      const a: Actor = world.createMonster(m.id, Math.max(1, baseLevel + (m.levelOffset ?? 0)), 'enemy');
      const raw = vec(hero.pos.x + Math.cos(ang) * ring.distance, hero.pos.y + Math.sin(ang) * ring.distance);
      a.pos = world.clampPos(raw, a.radius, hero.pos);
      a.facing = Math.atan2(hero.pos.y - a.pos.y, hero.pos.x - a.pos.x);
      world.actors.push(a);
      if (m.rarity && m.rarity !== 'normal') world.promoteMonster(a, m.rarity);
    }
  }
}

function feedCorpses(world: World, count: number, monsterId: string, level: number): void {
  if (!MONSTERS[monsterId]) return;
  const hero = world.player;
  for (let i = 0; i < count; i++) {
    const ang = i * 2.0943951;
    const r = i === 0 ? 48 : 84;
    world.corpses.push({
      pos: world.clampPos(vec(hero.pos.x + Math.cos(ang) * r, hero.pos.y + Math.sin(ang) * r), 12, hero.pos),
      defId: monsterId,
      level,
      maxLife: CORPSE_CFG.mint.life + level * CORPSE_CFG.mint.lifePerLevel,
      remaining: CORPSE_CFG.duration,
    });
    if (world.corpses.length > CORPSE_CFG.max) world.corpses.shift();
  }
}

function fnvMix(h: number, val: number): number {
  let x = val | 0;
  for (let b = 0; b < 4; b++) {
    h ^= x & 0xff;
    h = Math.imul(h, 0x01000193);
    x >>>= 8;
  }
  return h >>> 0;
}

export function computeStressFingerprint(world: World): CombatStressFingerprint {
  const nextRngU32 = Math.floor(Math.random() * 0x100000000) >>> 0;
  let h = 0x811c9dc5;
  h = fnvMix(h, nextRngU32);
  h = fnvMix(h, world.actors.length);
  h = fnvMix(h, world.projectiles.length);
  h = fnvMix(h, world.zones.length);
  h = fnvMix(h, world.corpses.length);
  h = fnvMix(h, world.lite.liveCount);

  let liveActors = 0;
  let liveEnemies = 0;
  let liveMinions = 0;
  for (let i = 0; i < world.actors.length; i++) {
    const a = world.actors[i];
    if (a.dead) continue;
    liveActors++;
    if (a.team === 'enemy') liveEnemies++;
    if (a.isMinion()) liveMinions++;
    h = fnvMix(h, a.id);
    h = fnvMix(h, Math.round(a.pos.x * 100));
    h = fnvMix(h, Math.round(a.pos.y * 100));
    h = fnvMix(h, Math.round(a.life * 100));
    h = fnvMix(h, a.statuses.length);
  }
  for (let i = 0; i < world.projectiles.length; i++) {
    const p = world.projectiles[i];
    h = fnvMix(h, Math.round(p.pos.x * 100));
    h = fnvMix(h, Math.round(p.pos.y * 100));
  }

  return {
    hashHex: (h >>> 0).toString(16).padStart(8, '0'),
    nextRngU32,
    liveActors,
    liveEnemies,
    liveMinions,
    projectiles: world.projectiles.length,
    zones: world.zones.length,
    corpses: world.corpses.length,
    lite: world.lite.liveCount,
  };
}

function configureStressWorld(world: World, sc: CombatStressScenario): string[] {
  world.devMintTileset(sc.tileset, sc.spread, sc.level, { seed: sc.zoneSeed });
  const warnings = applyBuild(world, sc.build, deriveSeed(sc.seed, 0x9ea7));
  world.meta.xpNeeded = Number.MAX_SAFE_INTEGER;
  const hero = world.player;
  hero.invulnerable = true;
  hero.sheet.setSource('stress_sustain', [{ stat: 'manaRegen', kind: 'flat', value: 2500 }]);
  hero.life = hero.maxLife();
  hero.mana = hero.maxMana();

  // Plant deterministic masonry pillars around the landing clearing to stress
  // shot/sight raycasts, multi-cell doodad spatial buckets, and sightVeil.
  for (const r of sc.rocks) {
    const ang = (r.bearingDeg * Math.PI) / 180;
    const rx = hero.pos.x + Math.cos(ang) * r.distance;
    const ry = hero.pos.y + Math.sin(ang) * r.distance;
    if (rx > 48 && ry > 48 && rx < world.arena.w - 48 && ry < world.arena.h - 48) {
      world.doodads.push({ pos: vec(rx, ry), radius: r.radius, kind: 'rock' });
    }
  }
  if (sc.litePour) {
    world.devLitePour(sc.litePour.monsterId, sc.litePour.count);
  }
  return warnings;
}

function selectScenarios(filter?: string): CombatStressScenario[] {
  const tokens = (filter ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (tokens.length === 0) return [...COMBAT_STRESS_SCENARIOS];
  return COMBAT_STRESS_SCENARIOS.filter(sc => tokens.some(t => sc.id.includes(t)));
}

/** Headless deterministic combat stress runner (Node / `balance/combat-perf.ts`). */
export async function runCombatStressHeadless(opts: CombatStressOpts = {}): Promise<CombatStressReport> {
  const warmupTicks = opts.warmupTicks ?? 120;
  const measureTicks = opts.measureTicks ?? 360;
  const dt = SIM_CFG.dt;
  const list = selectScenarios(opts.filter);
  const rows: CombatStressRow[] = [];

  for (const sc of list) {
    const restoreRandom = seedGlobalRandom(sc.seed);
    resetActorIdCounter();
    PERF_SLABS.active = false;
    try {
      const world = makeSimWorld(sc.build.classId, sc.seed);
      const buildWarnings = configureStressWorld(world, sc);
      const pilot = makePilot(sc.pilot);
      world.localSeat.input = pilot;

      const ringDue = sc.rings.map(r => r.atSec);
      let nextCorpseAt = 0;
      const totalTicks = warmupTicks + measureTicks;
      const inputs = new Map<string, PlayerInput>();
      let wallT0 = 0;

      for (let tick = 0; tick < totalTicks; tick++) {
        if (tick === warmupTicks) {
          await opts.beforeMeasure?.(sc.id);
          perfSlabsReset(measureTicks + 64);
          PERF_SLABS.active = true;
          wallT0 = performance.now();
        }

        const simSec = tick * dt;
        for (let ri = 0; ri < sc.rings.length; ri++) {
          const r = sc.rings[ri];
          if (simSec >= ringDue[ri]) {
            spawnRing(world, r, sc.level);
            ringDue[ri] = r.repeatEverySec !== undefined ? simSec + r.repeatEverySec : Infinity;
          }
        }
        if (sc.corpseFeed && simSec >= nextCorpseAt) {
          feedCorpses(world, sc.corpseFeed.count, sc.corpseFeed.monsterId, sc.level);
          nextCorpseAt = simSec + sc.corpseFeed.everySec;
        }
        if (sc.litePour && tick % 60 === 0 && world.lite.liveCount < sc.litePour.count) {
          world.devLitePour(sc.litePour.monsterId, sc.litePour.count - world.lite.liveCount);
        }

        const tickT0 = PERF_SLABS.active ? performance.now() : 0;
        let tMark = tickT0;

        inputs.clear();
        for (const seat of world.seats) {
          const intent = seat.input.poll(seat.actor, world, dt);
          if (intent) inputs.set(seat.id, intent);
        }
        world.applyInputs(inputs, dt);
        if (PERF_SLABS.active) {
          const now = performance.now();
          perfSlabsAddSim(SIM_SLAB_IDX.input, now - tMark);
          tMark = now;
        }

        for (const a of world.actors) updateAI(a, world, dt);
        if (PERF_SLABS.active) {
          const now = performance.now();
          perfSlabsAddSim(SIM_SLAB_IDX.ai, now - tMark);
        }

        world.update(dt);

        if (PERF_SLABS.active) {
          perfSlabsCommitSim(performance.now() - tickT0);
        }
      }

      const wallMs = Math.round((performance.now() - wallT0) * 100) / 100;
      PERF_SLABS.active = false;
      const extra = (await opts.afterMeasure?.(sc.id, measureTicks)) ?? undefined;
      const slabs = summarizePerfSlabs();
      const fingerprint = computeStressFingerprint(world);

      rows.push({
        id: sc.id,
        label: sc.label,
        tileset: sc.tileset,
        zoneName: world.zone.name,
        doodads: world.doodads.length,
        warmupTicks,
        measureTicks,
        wallMs,
        buildWarnings,
        slabs,
        fingerprint,
        ...(extra ? { extra } : {}),
      });
    } finally {
      PERF_SLABS.active = false;
      restoreRandom();
    }
  }

  return { mode: 'headless', warmupTicks, measureTicks, scenarios: rows };
}

/** Live Electron / browser Canvas2D stress runner (`window.__game.combatStress`). */
export async function runCombatStressBrowser(opts: CombatStressOpts = {}): Promise<CombatStressReport> {
  const g = window.__game;
  if (!g) throw new Error('combatStress: window.__game is not mounted');
  await g.hydrated();

  const warmupTicks = opts.warmupTicks ?? 120;
  const measureTicks = opts.measureTicks ?? 360;
  const dtMs = 1000 / 60;
  const dt = 1 / 60;
  const list = selectScenarios(opts.filter);
  const rows: CombatStressRow[] = [];

  setVisAblate(opts.ablate ?? []);
  g.hold(true);

  const nextRaf = (): Promise<number> => new Promise(resolve => {
    let done = false;
    const t = window.setTimeout(() => { if (!done) { done = true; resolve(performance.now()); } }, 20);
    requestAnimationFrame(now => { if (!done) { done = true; window.clearTimeout(t); resolve(now); } });
  });

  try {
    for (const sc of list) {
      const restoreRandom = seedGlobalRandom(sc.seed);
      resetActorIdCounter();
      PERF_SLABS.active = false;
      try {
        g.account().ledger.prologue_lived = 1;
        g.devStartRun(sc.build.classId);
        g.ui.hideAll();
        const world = g.world();
        const buildWarnings = configureStressWorld(world, sc);
        const pilot = makePilot(sc.pilot);
        g.pilot(pilot);

        const ringDue = sc.rings.map(r => r.atSec);
        let nextCorpseAt = 0;
        const totalTicks = warmupTicks + measureTicks;
        let wallT0 = 0;

        for (let tick = 0; tick < totalTicks; tick++) {
          if (tick === warmupTicks) {
            (window as unknown as { gc?: () => void }).gc?.();
            await nextRaf();
            await opts.beforeMeasure?.(sc.id);
            VIS_TELEMETRY.snowBakes = 0;
            VIS_TELEMETRY.groundBakes = 0;
            g.perfRingSize(measureTicks + 128);
            g.perfFrames(true);
            perfSlabsReset(measureTicks + 64);
            PERF_SLABS.active = true;
            wallT0 = performance.now();
          }

          const simSec = tick * dt;
          for (let ri = 0; ri < sc.rings.length; ri++) {
            const r = sc.rings[ri];
            if (simSec >= ringDue[ri]) {
              spawnRing(world, r, sc.level);
              ringDue[ri] = r.repeatEverySec !== undefined ? simSec + r.repeatEverySec : Infinity;
            }
          }
          if (sc.corpseFeed && simSec >= nextCorpseAt) {
            feedCorpses(world, sc.corpseFeed.count, sc.corpseFeed.monsterId, sc.level);
            nextCorpseAt = simSec + sc.corpseFeed.everySec;
          }
          if (sc.litePour && tick % 60 === 0 && world.lite.liveCount < sc.litePour.count) {
            world.devLitePour(sc.litePour.monsterId, sc.litePour.count - world.lite.liveCount);
          }

          await nextRaf();
          g.step(1, dtMs);
        }

        const wallMs = Math.round((performance.now() - wallT0) * 100) / 100;
        PERF_SLABS.active = false;
        const extra = (await opts.afterMeasure?.(sc.id, measureTicks)) ?? undefined;
        const slabs = summarizePerfSlabs();
        const fingerprint = computeStressFingerprint(world);

        rows.push({
          id: sc.id,
          label: sc.label,
          tileset: sc.tileset,
          zoneName: world.zone.name,
          doodads: world.doodads.length,
          warmupTicks,
          measureTicks,
          wallMs,
          buildWarnings,
          slabs,
          fingerprint,
          visBakes: { snowBakes: VIS_TELEMETRY.snowBakes, groundBakes: VIS_TELEMETRY.groundBakes },
          ...(extra ? { extra } : {}),
        });
      } finally {
        PERF_SLABS.active = false;
        g.pilot(null);
        restoreRandom();
      }
    }
  } finally {
    PERF_SLABS.active = false;
    g.pilot(null);
    g.hold(false);
    setVisAblate([]);
  }

  return { mode: 'browser', warmupTicks, measureTicks, scenarios: rows };
}
