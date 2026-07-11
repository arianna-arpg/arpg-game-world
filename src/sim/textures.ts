// ---------------------------------------------------------------------------
// DEFENSE-TEXTURE CLASSIFIER — the doctrine ("enemies differ by defense
// texture: armor, evasion, energy shield, poise, shell — full-shell+poise is
// the rare apex") turned into MEASUREMENT.
//
// Nothing here is hand-tagged: every profile is read off a REAL specimen
// (world.createMonster at the probe level, the same path `audit monsters`
// uses), and pole membership is judged against the LIVE cohort's medians —
// so the classification recalibrates itself as the bestiary grows, and an
// empty pole (say, no ES-glass monster exists yet) shows up as a finding
// instead of a stale label saying otherwise.
//
// Consumers: target panels (src/sim/data/panels.ts) resolve texture QUERIES
// through this, and `audit textures` prints the whole ledger (with
// --check-panels as the drift gate for curated claims).
// ---------------------------------------------------------------------------

import { MONSTERS } from '../data/monsters';
import type { World } from '../engine/world';
import { seedGlobalRandom } from './rng';

export type TextureId = 'armor' | 'evasion' | 'es' | 'poise' | 'shell' | 'apex' | 'plain';

/** Open classifier knobs — the instrument's thresholds, never inline magic. */
export const TEXTURE_CFG = {
  /** Default specimen level when a caller doesn't pin one. */
  probeLevel: 8,
  /** A stat is a POLE when it reaches this multiple of the cohort median. */
  poleMultiple: 1.75,
  /** Median floors per rated pole — a cohort of zeros must not make every
   *  nonzero value a pole. Values below the floor never qualify. */
  poleFloors: { armor: 25, evasion: 25, poise: 20 },
  /** ES pole: shield fraction of the effective pool (es / (es + life)). */
  esFracMin: 0.30,
  /** Shell pole: guard plate as a fraction of the AUTHORED body (shell.max /
   *  level-1 life). Plates are flat while life scales with level, so the
   *  LIVE ratio fades as levels rise — the def's design identity is the
   *  authored ratio; both are reported (shell.fracAuthored / fracLive). */
  shellFracMin: 0.25,
  /** Seed for specimen reads — scaleVariance rolls must not jitter a
   *  borderline monster across classification runs. */
  specimenSeed: 0x7e47,
};

export interface DefenseProfile {
  id: string;
  name: string;
  level: number;
  // -- the sheet, read off the live specimen --
  life: number;
  es: number;
  armor: number;
  evasion: number;
  poise: number;
  moveSpeed: number;
  /** MonsterDef.shellGuard, when worn (the ablative plate, direction and all).
   *  fracAuthored = max / level-1 life (design identity, drives the texture);
   *  fracLive = max / probe-level life (what the fight actually meets). */
  shell?: { side: string; max: number; regenRate: number; regenDelay: number; fracAuthored: number; fracLive: number };
  /** Effective kill pool: life + ES (shell is directional coverage, reported
   *  separately — a rear plate costs a brawler nothing). */
  pool: number;
  // -- def flags a scenario author filters on --
  boss: boolean;
  passive: boolean;
  spawner: boolean;
  untargetable: boolean;
  immortal: boolean;
  tags: string[];
  /** Pole strengths: value / max(floor, cohort median). ≥ TEXTURE_CFG.poleMultiple
   *  ⇒ the texture applies. es/shell use their fraction rules instead. */
  poles: { armor: number; evasion: number; poise: number };
  /** Assigned texture labels (multi-label; 'plain' only when nothing else). */
  textures: TextureId[];
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** Raw sheet read for one specimen — never pushed into the world. */
function readSpecimen(world: World, id: string, level: number): Omit<DefenseProfile, 'poles' | 'textures'> {
  const def = MONSTERS[id];
  const a = world.createMonster(id, level, 'enemy');
  const life = a.maxLife();
  const es = a.maxEs();
  // The authored body: the level-1 twin, for ratios against def constants
  // (shell plates don't scale with level; life does).
  const life1 = level === 1 ? life : world.createMonster(id, 1, 'enemy').maxLife();
  return {
    id, name: def.name, level,
    life: Math.round(life),
    es: Math.round(es),
    armor: Math.round(a.sheet.get('armor')),
    evasion: Math.round(a.sheet.get('evasion')),
    poise: Math.round(a.maxPoise()),
    moveSpeed: Math.round(a.sheet.get('moveSpeed')),
    ...(def.shellGuard ? {
      shell: {
        side: def.shellGuard.side,
        max: def.shellGuard.max,
        regenRate: def.shellGuard.regenRate ?? 0,
        regenDelay: def.shellGuard.regenDelay ?? 0,
        fracAuthored: Math.round((def.shellGuard.max / Math.max(life1, 1)) * 100) / 100,
        fracLive: Math.round((def.shellGuard.max / Math.max(life, 1)) * 100) / 100,
      },
    } : {}),
    pool: Math.round(life + es),
    boss: !!def.boss,
    passive: !!def.passive,
    spawner: !!def.spawner,
    untargetable: !!def.untargetable,
    immortal: !!def.immortal,
    tags: [...(def.tags ?? [])],
  };
}

/** Classify every monster (or a subset) at one level. Cohort medians come from
 *  ordinary combatants only — passive scenery, spawner posts, untargetables,
 *  immortal fixtures and bosses don't get to define "normal". */
export function defenseProfiles(world: World, level = TEXTURE_CFG.probeLevel, ids?: string[]): DefenseProfile[] {
  const all = (ids ?? Object.keys(MONSTERS)).filter(id => MONSTERS[id]);
  // Deterministic specimens: scaleVariance and any other spawn-time rolls
  // must give the SAME classification every run at the same content.
  const restoreRandom = seedGlobalRandom(TEXTURE_CFG.specimenSeed);
  let raw: ReturnType<typeof readSpecimen>[];
  try {
    raw = all.map(id => readSpecimen(world, id, level));
  } finally {
    restoreRandom();
  }
  const cohort = raw.filter(r => !r.passive && !r.spawner && !r.untargetable && !r.immortal && !r.boss);
  const med = {
    armor: Math.max(TEXTURE_CFG.poleFloors.armor, median(cohort.map(r => r.armor))),
    evasion: Math.max(TEXTURE_CFG.poleFloors.evasion, median(cohort.map(r => r.evasion))),
    poise: Math.max(TEXTURE_CFG.poleFloors.poise, median(cohort.map(r => r.poise))),
  };
  const r2 = (x: number): number => Math.round(x * 100) / 100;
  return raw.map(r => {
    const poles = {
      armor: r2(r.armor / med.armor),
      evasion: r2(r.evasion / med.evasion),
      poise: r2(r.poise / med.poise),
    };
    const textures: TextureId[] = [];
    if (poles.armor >= TEXTURE_CFG.poleMultiple) textures.push('armor');
    if (poles.evasion >= TEXTURE_CFG.poleMultiple) textures.push('evasion');
    if (r.pool > 0 && r.es / r.pool >= TEXTURE_CFG.esFracMin) textures.push('es');
    if (poles.poise >= TEXTURE_CFG.poleMultiple) textures.push('poise');
    if (r.shell && r.shell.fracAuthored >= TEXTURE_CFG.shellFracMin) textures.push('shell');
    // The doctrine's deliberate exception: a FULL wraparound plate on a body
    // with real poise — the wall that is supposed to be rare.
    if (textures.includes('shell') && r.shell?.side === 'all' && textures.includes('poise')) textures.push('apex');
    if (!textures.length) textures.push('plain');
    return { ...r, poles, textures };
  });
}

/** One monster's profile (cohort medians still computed over everyone). */
export function classifyDefense(world: World, id: string, level = TEXTURE_CFG.probeLevel): DefenseProfile | undefined {
  return defenseProfiles(world, level).find(p => p.id === id);
}
