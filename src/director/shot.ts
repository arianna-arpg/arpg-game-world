// ---------------------------------------------------------------------------
// THE SHOT — one staged piece of real play, as data: where (a minted zone of
// any tileset, pinned by seed), when (the day clock, the weather), who (a
// hero BuildSpec through the balance harness's own injector, allies, foes in
// packs and rings), how it plays (THE AGENT's temperament and scripted
// orders), how it is seen (the director's camera) and what happens on cue.
// A shot list is plain JSON, so a trailer, a store page capture or a
// regression film can author one without code. Contract:
// docs/engine/director.md.
// ---------------------------------------------------------------------------

import type { AgentOptions, Directive } from '../agent/agent';
import type { MonsterRarity } from '../engine/rarity';
import type { BuildSpec } from '../sim/types';
import type { CameraSpec, Pt } from './camera';

/** Where a body stands: absolute world point, relative to the hero, or on
 *  a ring / arc around the hero (degrees, 0 = east, 90 = south). */
export type Place =
  | Pt
  | { offset: Pt }
  | { ring: number; from?: number; to?: number; jitter?: number };

export interface SpawnSpec {
  def: string;
  count?: number;
  level?: number;
  rarity?: MonsterRarity;
  at?: Place;
  /** Random scatter radius around each placed point. */
  spread?: number;
  team?: 'enemy' | 'player';
  /** Lock onto the hero (or the nearest player body) at once. */
  provoke?: boolean;
  /** Hold still (no brain) until this many shot seconds have passed. */
  sleepUntil?: number;
  /** Start at this share of life. */
  life?: number;
  /** A handle for cues (kill by name). */
  name?: string;
}

/** A synthetic pointer gesture on the page (UI shots): at a selector's
 *  element (or the viewport), at a fractional point inside it. */
export interface DomAction {
  type: 'move' | 'down' | 'up' | 'click' | 'wheel' | 'key' | 'style';
  selector?: string;
  /** Fraction of the element's (or viewport's) box; default the centre. */
  at?: [number, number];
  deltaY?: number;
  key?: string;
  /** 'style': CSS appended to the selector's element (capture framing, e.g. a
   *  panel enlarged to fill the frame for the take). */
  css?: string;
}

/** A timed event inside a shot. */
export interface Cue {
  /** Shot seconds; NEGATIVE times fire during the warm-up (rendered, not
   *  captured), so a long setup can play out before the first filmed frame. */
  at: number;
  /** Orders for the hero agent (appended). */
  order?: Directive[];
  /** Replace the agent's queue with these orders. */
  orders?: Directive[];
  spawn?: SpawnSpec[];
  /** Set the hero's life share. */
  heroLife?: number;
  /** Lift the hero's shot-long guard (huge life) so a blow can land for real. */
  mortal?: boolean;
  /** Change the camera (merged). */
  camera?: Partial<CameraSpec>;
  /** Sim seconds per real second from here (slow motion < 1). */
  timeScale?: number;
  /** Kill these spawned names (or 'foes' for every live foe). */
  kill?: string[] | 'foes';
  /** Provoke every live foe onto the hero. */
  provoke?: boolean;
  /** Call UI methods (e.g. { call: 'toggleInventory' }) — page shots. */
  ui?: { call: string; args?: unknown[] }[];
  /** Synthetic pointer/keyboard gestures on the page — page shots. */
  dom?: DomAction[];
  /** Make named spawns use one of their own skills now, through the one
   *  skill pipeline (World.useSkill): telegraphs, cast bars and all. */
  force?: { who: string; skill: string; at?: 'hero' | { offset: Pt } }[];
  /** Socket a bag support gem into a known skill through the game's own
   *  gesture (World.socketSupport): the panels re-render as they would. */
  socket?: { support: string; skill: string }[];
}

export interface ShotSpec {
  id: string;
  /** Global RNG seed: same seed + same build = the same take. */
  seed?: number;
  /** The ground. 'town' = Lastlight (the run's own start). */
  zone?: { tileset: string; seed?: number; variant?: string; layoutType?: string; level?: number } | 'town';
  /** Where the hero stands at the start (world point), or 'open' = the most
   *  open spot near the arena's centre, or 'entry' = where the zone landed us. */
  at?: Pt | 'open' | 'entry';
  /** Remove ambient enemies within this radius of the hero ('all' = every one). */
  clear?: number | 'all';
  /** Day clock: a fraction of the day (0 = dawn … 0.2 = noon … 0.7 = midnight). */
  day?: number;
  /** Paint a weather front over the zone. */
  weather?: { kind: string; intensity?: number } | null;
  hero: BuildSpec;
  /** Keep the hero standing until a 'mortal' cue. 'pool' (default, true) =
   *  a deep life pool, so blows land and flash but never kill; 'floor' = a
   *  35% life floor; false = mortal from the first frame. */
  guard?: boolean | 'pool' | 'floor';
  /** The guard pool's flat life (default 250000). A HUD shot wants a value
   *  that reads like a late-game life total on the orb (e.g. 12000). */
  guardLife?: number;
  /** Skill attribute requirements: 'ignore' (default; the engine's own dev
   *  lever, World.devIgnoreSkillAttributes) or 'real'. Costs and cooldowns
   *  still apply either way. */
  attributes?: 'ignore' | 'real';
  /** Account access the shot needs, through the dev progression catalog's own
   *  recipes (dev/progression.ts ids, e.g. 'power:awakening'); prerequisites
   *  resolve on their own. */
  progression?: string[];
  /** Shot-scoped kill-path drop levers (engine/loot.ts DROP_CFG numbers),
   *  restored when the shot ends: a loot beat without a thousand kills. */
  drops?: { killItemChance?: number; killGemChance?: number; vestigeChance?: number; bossGemDrops?: number };
  /** The world map's development lens for the shot (ui/mapLens.ts), reset
   *  when it ends: omniscient = the whole painted world. */
  lens?: { omniscient?: boolean };
  /** Loose items in the hero's pack after the build: support gems and gear
   *  rolled through the ordinary roller (seeded by the shot). */
  /** false = no nemesis forms from this shot (a staged death is not a
   *  vendetta: the slayer and survivor rolls are zeroed, then restored). */
  nemesis?: boolean;
  bag?: { supports?: { id: string; level?: number }[]; gear?: { rarity?: string; baseId?: string; uniqueId?: string; ilvl?: number }[] };
  /** Awaken these skills' secondary mechanics (their trees) for the account:
   *  sugar for their 'memory:skill:<id>' progression rows. 'hero' = every
   *  skill the shot's build carries. */
  awaken?: string[] | 'hero';
  /** THE GATEKEEPER (the skill showcase's): keep what the hero's casts spend
   *  or wait on ready (damage pools, gauges, charge banks) and cap cooldowns
   *  at this many seconds, so a take shows the skills rather than their bars.
   *  Absent = the real economy. */
  keep?: { cooldownCap?: number; mana?: boolean; ultimates?: boolean };
  allies?: SpawnSpec[];
  foes?: SpawnSpec[];
  /** The agent driving the hero (absent = the hero stands still). */
  agent?: AgentOptions & { enabled?: boolean };
  camera?: CameraSpec;
  /** Seconds simulated (and rendered) before the take starts. */
  warmup?: number;
  /** Seconds captured. */
  duration: number;
  /** Frames per second captured (sim dt = timeScale / fps). */
  fps?: number;
  /** 'canvas' (default) reads the world canvas; 'page' photographs the whole
   *  composited page (DOM panels included) at the window's size. */
  capture?: 'canvas' | 'page';
  /** Page shots: real seconds the recorder waits after staging so the page's
   *  asynchronous painters (the atlas chart) finish before the first frame. */
  settle?: number;
  /** Show the HUD (default false: world only). */
  hud?: boolean;
  /** THE POWER DIAL: a stand-in for a late-game build's gear and tree — a
   *  'more' multiplier on the hero's (and its minions') damage. 1 = honest. */
  power?: number;
  /** Supersampled sprite bakes: device pixels per world unit for bodies and
   *  glows (render/vis/bakeScale.ts). Default 1; 2–3 keeps close cameras crisp. */
  bakeScale?: number;
  cues?: Cue[];
  /** THE CLEAN PLATE: hide overhead bars and cast bars (default true). */
  clean?: boolean;
  /** Keep the positional sight veil (default false: lifted for the camera). */
  sightVeil?: boolean;
  /** With the HUD off, still draw the action's own screen moments (eyecatch,
   *  held-time wash, death flash). Default true. */
  cinematic?: boolean;
}
