// ---------------------------------------------------------------------------
// SIM SCHEMA — every input to the balance harness is one of these plain-data
// shapes, composed exactly like the rest of the game's content: open string
// ids into registries, optional knobs with sane defaults, no bespoke paths.
//
//   BuildSpec    — a complete character on paper (class, level, gems, tree,
//                  gear recipe). Injected through the SAME seam a saved
//                  character uses (world.adoptSavedMeta), so a sim build is
//                  a real build — no parallel stat math to drift.
//   PilotSpec    — how the seat is driven (a PlayerInputSource policy).
//   ScenarioDef  — build × opponents × stop rules. The unit of measurement.
//   EpisodeResult / ScenarioReport — what comes back out, JSON-safe.
//
// Everything here is browser-safe: no Node imports, so a future in-game dev
// panel can run the same scenarios the CLI does.
// ---------------------------------------------------------------------------

import type { SkillRarity } from '../engine/skills';
import type { ItemRarity } from '../engine/items';
import type { MonsterRarity } from '../engine/rarity';
import type { CharacterSave } from '../meta/character';

// ------------------------------------------------------------------ builds --

/** One worn item, described as a RECIPE (rolled deterministically from the
 *  build's gearSeed through the real itemgen), never as hand-written stats. */
export interface GearSpec {
  /** EQUIP_SLOTS id: helmet | amulet | chest | gloves | belt | ring1 | ring2 | legs | boots. */
  slot: string;
  /** Item level for the roll (default: the build's level). */
  ilvl?: number;
  rarity?: ItemRarity;
  /** Pin an exact base family (itembases.ts id) — else themed by slot. */
  baseId?: string;
  /** Pin an exact unique (implies its base + rarity). */
  uniqueId?: string;
}

export interface BuildSkillSpec {
  /** SKILLS id. */
  id: string;
  /** Gem level (default 1). Uncapped by design — overleveled probes are legal. */
  level?: number;
  /** Gem rarity decides socket count (common 1 … legendary 4). Default: rare,
   *  or the smallest rarity that fits the requested supports. */
  rarity?: SkillRarity;
  /** Socketed support gems, in socket order. */
  supports?: { id: string; level?: number }[];
}

/** A complete character on paper. */
export interface BuildSpec {
  id: string;
  label?: string;
  classId: string;
  level: number;
  /** Absolute base-attribute override (default: the class spread). Attributes
   *  normally grow through the tree — this is the raw hypothesis lever. */
  attributes?: Partial<Record<string, number>>;
  skills: BuildSkillSpec[];
  /** Bar layout (skill ids or null), default: `skills` in listed order. */
  bar?: (string | null)[];
  /** Passive-tree node ids beyond the class start node. Budget at level L is
   *  L points (PROGRESSION.passivePointsPerLevel) + the freebie — the harness
   *  WARNS on over-budget or disconnected picks but still simulates them
   *  (hypotheticals are allowed; the warning keeps reports honest). */
  passives?: string[];
  /** Worn gear recipes. */
  /** Choice-node picks, keyed by node id (the node must also be in `passives`).
   *  Audited against data/passiveChoices.ts with the LIVE legality rule —
   *  unknown groups/options and over-limit picks warn and drop; extra picks
   *  on multi-pick nodes cost budget exactly like live allocation. */
  choices?: Record<string, string[]>;
  gear?: GearSpec[];
  /** Seed for the gear rolls (default: derived from the episode seed). */
  gearSeed?: number;
}

/** An ACTUAL player character, verbatim: the CharacterSave a real save slot
 *  holds, injected through the SAME rebuild path a resumed game uses
 *  (applySavedCharacter → adoptSavedMeta) — exact rolled gear, exact gem
 *  levels, companions and all. This is how "sim my real character" works:
 *  no transcription into a BuildSpec, no fidelity loss. */
export interface SavedBuild {
  id: string;
  label?: string;
  fromSave: CharacterSave;
}

/** Anything the BUILDS registry can hold / a scenario can name. */
export type BuildEntry = BuildSpec | SavedBuild;

// ------------------------------------------------------------------ pilots --

/** How the hero's seat is driven. All pilots aim at the nearest living foe
 *  and are deliberately simple, LEGIBLE policies — the point of a sim is a
 *  reproducible measurement, not a superhuman player. */
export type PilotSpec =
  /** Stand still, press nothing. The punching-bag baseline. */
  | { kind: 'idle' }
  /** Stand still, work the rotation. For dummy-DPS measurement. */
  | { kind: 'turret'; rotation?: number[]; openers?: number[] }
  /** Close to melee gap, then work the rotation. */
  | { kind: 'brawler'; engage?: number; rotation?: number[]; openers?: number[] }
  /** Hold a range band (kite in/out), work the rotation. */
  | { kind: 'caster'; range?: number; rotation?: number[]; openers?: number[] };

// --------------------------------------------------------------- scenarios --

/** One group of monsters entering the arena together. */
export interface WaveSpec {
  /** Seconds after episode start (default 0). */
  at?: number;
  /** Spawn distance from the hero (default 260 px), evenly ringed. */
  distance?: number;
  monsters: {
    id: string;
    /** Absolute monster level, or omit to use the scenario's parityLevel. */
    level?: number;
    count?: number;
    /** Promote via the real promoteMonster path (magic/rare/champion/crowned). */
    rarity?: MonsterRarity;
  }[];
  /** Re-spawn this wave every N seconds (throughput pressure). Unbounded —
   *  pair with a duration stop. */
  repeatEvery?: number;
  /** Re-spawn this many seconds after the wave DIES (matchup duels): every
   *  kill cycle fights a fresh body, so poise bars, shells, and energy
   *  shields re-arm and ttk_wave_mean samples each cycle cleanly. Feeds the
   *  edps_cycle_mean metric. Unbounded — pair with a duration stop.
   *  Mutually exclusive with repeatEvery (repeatEvery wins, with a warning). */
  respawnOnClear?: number;
}

export type StopRule =
  | 'duration'      // run the clock out regardless
  | 'waves_dead'    // stop early once every spawned (non-repeating) wave is dead
  | 'player_dead';  // only the hero's death ends it early (survival probes)

/** The unit of measurement: one build in one arena against one script. */
export interface ScenarioDef {
  id: string;
  label?: string;
  /** A BUILDS registry id, or an inline spec (authored or save-backed). */
  build: string | BuildEntry;
  pilot?: PilotSpec;
  /** Default monster level for waves that don't pin one (default: build level). */
  parityLevel?: number;
  waves: WaveSpec[];
  /** Sim-seconds cap. */
  duration: number;
  stop?: StopRule;
  /** Freeze XP so mid-episode level-ups don't pollute the measurement
   *  (default true — set false to study the leveling flow itself). */
  freezeXp?: boolean;
  /** Extra ticks/second sampling of hero vitals (default 5 Hz). */
  sampleHz?: number;
  notes?: string;
}

// ----------------------------------------------------------------- results --

/** Per-episode scalar metrics. Open record — collectors may add keys; the
 *  aggregator handles any numeric field. Canonical keys are documented in
 *  docs/balance/README.md (the metrics glossary). */
export type MetricRecord = Record<string, number>;

export interface EpisodeResult {
  scenarioId: string;
  seed: number;
  /** Simulated seconds actually run. */
  simSeconds: number;
  /** Why the episode ended: 'duration' | 'waves_dead' | 'player_dead' | 'error'. */
  ended: string;
  metrics: MetricRecord;
  /** Cast counts per skill id (presses and mechanical repeats separated). */
  casts: Record<string, { presses: number; repeats: number }>;
  /** Deaths in order: t = sim time, who = defId or 'player', team. */
  deaths: { t: number; who: string; team: string; killer?: string }[];
  /** Anything suspicious: NaN vitals, over-budget passives, misfit supports… */
  warnings: string[];
}

/** One metric aggregated over an episode batch. */
export interface MetricSummary {
  n: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  p10: number;
  p90: number;
  sd: number;
}

export interface ScenarioReport {
  scenarioId: string;
  label?: string;
  episodes: number;
  baseSeed: number;
  metrics: Record<string, MetricSummary>;
  /** Union of episode warnings (deduped, with counts). */
  warnings: Record<string, number>;
  /** Target-band grading, filled by the reporter when targets apply:
   *  metric → 'ok' | 'low' | 'high'. */
  grades?: Record<string, string>;
}
