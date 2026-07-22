// ---------------------------------------------------------------------------
// SCENES — one-time, account-gated cinematic sequences as DATA.
//
// A SceneDef is a short authored experience (the opening prologue, a future
// Odyssey chapter seam) played on ground the save never keeps: its staging
// zone mints OFF-GRAPH (the caveMap idiom — `caveDepth` guarantees the def
// can never serialize, and even a hand-edited save carrying one is culled on
// restore), every scene spawn is stamped rewardless (`noBounty` — no xp, no
// loot, no gems, no orbs; the zone additionally seals `spoils: 'none'`), and
// the whole thing tears down to the ordinary world when the last stage ends.
//
// A scene is a list of STAGES walked in order. Stage kinds are an OPEN
// REGISTRY (engine/scenes.ts `registerSceneStage`) — the core six ship the
// prologue; a new beat is a kind + a handler, never a rewrite:
//   • card      — the world holds; a full-screen story card waits for the
//                 player's continue (DOM surface, engine-ack'd so headless
//                 probes can walk it).
//   • drill     — teach-by-doing: ordered goals (move N px, cast N times)
//                 fill ONE progress bar riding the scene HUD channel.
//   • clash     — spawn a scripted handful, wait for the clear, breathe.
//   • assault   — escalating timed waves (already-hunting, the wave-frenzy
//                 overlay) until the survival clock runs out — or the hero
//                 falls, which fast-forwards to the next 'reckoning'/'card'.
//   • reckoning — the cinematic fall: world held, camera pans to a mustering
//                 executioner, the verb resolves through the REAL skill
//                 pipeline (cast bar + telegraph honest by construction),
//                 and the hero is FELLED, never killed (the scene intercepts
//                 the lethal blow at the one player-death chokepoint).
//   • home      — teardown: back to the start-zone bedside, the staging
//                 zone deleted from the off-graph map, completion stamped.
//
// THE GATE: a scene only COUNTS once lived to the end — the `ledger` key
// stamps at the 'home' stage, while a begun-mark (`<ledger>_begun`) laid at
// START keeps an ABORTED scene due: quit mid-tutorial and the next New Game
// re-launches it from the first card. While a scene plays the shell writes
// NO run save (the tutorial is not a run; the run begins at the wake), so
// an abort leaves nothing to resume. Veteran accounts (any prior play)
// never see a newly-added scene: the due test requires a virgin account
// (engine/scenes.ts `sceneDue`); only a full account reset brings one back.
//
// Pure data leaf: no engine imports. Every number is a knob.
// ---------------------------------------------------------------------------

/** A full-screen story card: fade to black, read, continue. `{bind:…}`
 *  tokens in lines resolve against the LIVE keybinds at display time. */
export interface SceneCardSpec {
  title: string;
  lines: string[];
  /** The continue button's label (default 'Continue'). */
  button?: string;
}

/** One teach-by-doing goal inside a 'drill' stage. Goals run IN ORDER; the
 *  stage's single progress bar spans them all (each goal is an equal share).
 *  Extensible: a new kind is a case in the drill handler (engine/scenes.ts). */
export interface SceneDrillGoal {
  /** 'move' counts px of the local hero's own footwork; 'cast' counts the
   *  hero's seat-pressed casts through the one skill pipeline. */
  kind: 'move' | 'cast';
  amount: number;
  /** HUD prompt while this goal is live ('{bind:…}' tokens ok). */
  prompt: string;
}

/** One spawn row: `count` bodies of `def`, ringed off the hero. */
export interface SceneSpawnRow {
  def: string;
  count: number;
  /** Spawn level (default: the staging zone's level). */
  level?: number;
}

/** One timed wave inside an 'assault' stage. */
export interface SceneWaveRow {
  /** Seconds after the assault begins that this wave pours. */
  at: number;
  spawns: SceneSpawnRow[];
  /** Center-screen callout when the wave lands. */
  announce?: string;
  announceColor?: string;
}

/** The staging ground a scene plays on — minted off-graph via the cave
 *  fabric (never serialized, torn down at 'home'), sealed and silent:
 *  spoils 'none', packDensity 0, cohort 'authored', no exits, no events. */
export interface SceneZoneSpec {
  /** Tileset registry id (the dress — e.g. 'meadow'). */
  tileset: string;
  /** Force a layout recipe (absent = the tileset's own roll). */
  layoutType?: string;
  layoutParams?: Record<string, unknown>;
  /** The fixed zone name (HUD top-left; no rolled names on scripted ground). */
  name: string;
  level: number;
  /** The 'none' objective's HUD label while the scene plays. */
  objectiveLabel?: string;
  /** Mint seed (fixed — a scene's ground is not a roll). */
  seed: number;
  /** PERPETUAL GROUND (the Descent-abyss methodology): the arena streams
   *  under the walker with no rim and no reachable edge — dash any
   *  direction forever and the world keeps coming. The authored dress
   *  stays near the heart; every scene spawn rings off the hero's LIVE
   *  position anyway, so the script follows wherever they run. */
  boundless?: boolean;
}

// --- stage specs (the open union: core kinds typed, the registry may grow) --
export interface SceneStageBase { kind: string; }
export interface SceneCardStage extends SceneStageBase { kind: 'card'; card: SceneCardSpec; }
/** Where a stage's bar + prompt sit: 'hero' rides just above the player's
 *  head (world-anchored — unmissable, and it trains the eye UPWARD toward
 *  the objectives to come), 'top' takes the encounter bar's screen seat
 *  (the assault's dawn clock). Each stage kind picks its own default. */
export type SceneHudSeat = 'hero' | 'top';

export interface SceneDrillStage extends SceneStageBase {
  kind: 'drill';
  goals: SceneDrillGoal[];
  /** Bar label while the drill runs. */
  label: string;
  /** HUD seat (default 'hero' — teaching lives at the player's eye). */
  hud?: SceneHudSeat;
}
export interface SceneClashStage extends SceneStageBase {
  kind: 'clash';
  spawns: SceneSpawnRow[];
  announce?: string;
  announceColor?: string;
  /** Breather after the clear before the next stage (seconds). */
  pauseSec: number;
  /** Bar label while the clash stands (progress = bodies downed). */
  label?: string;
  /** HUD seat (default 'hero' — the first blood is a lesson too). */
  hud?: SceneHudSeat;
}
export interface SceneAssaultStage extends SceneStageBase {
  kind: 'assault';
  rows: SceneWaveRow[];
  /** After the scripted rows exhaust, the LAST row repours on this cadence
   *  (seconds) — the tide that never ebbs. 0/absent = no repeat. */
  repeatLastEvery?: number;
  /** The survival clock: the stage completes (into the reckoning) after
   *  this many seconds, whether the hero stands or not. */
  surviveSec: number;
  /** Bar label; the bar runs the survival clock. */
  label?: string;
  /** HUD seat (default 'top' — the dawn clock hangs over the whole field). */
  hud?: SceneHudSeat;
}
export interface SceneReckoningStage extends SceneStageBase {
  kind: 'reckoning';
  /** The executioner's MonsterDef id (spawned rewardless like every scene body). */
  def: string;
  /** The verb it musters — cast through the real pipeline (useSkill), so the
   *  cast bar and ground telegraph are honest by construction. */
  verb: string;
  /** Spawn level (the reveal should read impossible, not just big). */
  level: number;
  /** How far off the hero it stands (px). */
  spawnDist: number;
  /** Camera glide out to it (seconds, raw clock — the world is held). */
  panSec: number;
  /** Beat ON the mustering figure before the verb begins (drink it in). */
  dwellSec: number;
  /** After the blast lands, seconds before the dark takes the screen. */
  blastWaitSec: number;
}
export interface SceneHomeStage extends SceneStageBase { kind: 'home'; }

export type SceneStage =
  | SceneCardStage | SceneDrillStage | SceneClashStage
  | SceneAssaultStage | SceneReckoningStage | SceneHomeStage
  | (SceneStageBase & Record<string, unknown>);

export interface SceneDef {
  id: string;
  /** Account-ledger key: stamped at COMPLETION (the 'home' stage) — the
   *  scene only counts once lived whole. A begun-mark (`<ledger>_begun`)
   *  stamps at start so an aborted scene stays due and re-launches. */
  ledger: string;
  zone: SceneZoneSpec;
  stages: SceneStage[];
}

export const SCENE_CFG = {
  /** Screen-fade ramp speeds (fade units/sec): `up` toward black, `down`
   *  back into the world. */
  fade: { up: 0.9, down: 0.55 },
  /** The one cinematic TimeHold id every scene stage shares (refresh
   *  semantics — re-holding replaces; releasing ends the freeze). */
  holdId: 'scene:cinematic',
  /** Scene spawns ring the hero inside this band (px) unless a stage says
   *  otherwise — the wave-frenzy grammar's own entry ring. */
  entryBand: [340, 460] as [number, number],
  /** Camera pan easing: smoothstep over the stage's panSec. */
  panEase: 'smooth' as const,
  /** The reckoning's screen-shake at detonation. */
  blastShake: 26,
  /** Drill 'move' goals ignore displacement finer than this per tick (px) —
   *  wall-grind jitter teaches nothing. */
  moveEpsilon: 0.5,
} as const;

// ---------------------------------------------------------------------------
// THE PROLOGUE — "The Last Mile". A brand-new account's very first walk:
// learn to move, learn to strike, meet the goblinkin, drown in them, and be
// ended by the Hordefather — then wake in the Waking House owing Mireille a
// life. Runs ONCE per account, ever (the flask-lesson graduation pattern).
// ---------------------------------------------------------------------------

export const PROLOGUE_SCENE: SceneDef = {
  id: 'prologue',
  ledger: 'prologue_lived',
  zone: {
    tileset: 'meadow',
    name: 'The Last Mile',
    level: 1,
    objectiveLabel: 'Reach Lastlight by dawn',
    seed: 0x1a57,
    boundless: true, // the last mile has no edge — the road is longer than you
  },
  stages: [
    {
      kind: 'card',
      card: {
        title: 'HOLLOW WAKE',
        lines: [
          'The old roads run longer than they used to. The towns grow few, and the lights grow far between.',
          'You have walked for days on the promise of one: LASTLIGHT, where the candles are said never to gutter.',
          'One more mile. The dark does not feel empty tonight.',
        ],
        button: 'Walk on',
      },
    },
    {
      kind: 'drill',
      label: 'The Last Mile',
      goals: [
        { kind: 'move', amount: 480, prompt: 'Keep moving — {bind:moveUp}{bind:moveLeft}{bind:moveDown}{bind:moveRight}' },
        { kind: 'cast', amount: 5, prompt: 'Something in the grass. Strike at it — {bind:skillSlot0}' },
      ],
    },
    {
      kind: 'clash',
      spawns: [{ def: 'goblin_skirmisher', count: 1 }],
      announce: 'a goblin skulks out of the grass…',
      announceColor: '#9fdc6a',
      pauseSec: 2.6,
      label: 'Put it down',
    },
    {
      kind: 'assault',
      label: 'Hold the road',
      rows: [
        { at: 0, spawns: [{ def: 'goblin_skirmisher', count: 4 }], announce: 'more of them — hold the road!', announceColor: '#9fdc6a' },
        { at: 13, spawns: [{ def: 'goblin_skirmisher', count: 4 }, { def: 'goblin_brute', count: 1 }] },
        { at: 26, spawns: [{ def: 'goblin_skirmisher', count: 5 }, { def: 'goblin_shaman', count: 2 }], announce: 'the grass is moving everywhere—', announceColor: '#c8e070' },
        { at: 40, spawns: [{ def: 'goblin_brute', count: 2 }, { def: 'goblin_skirmisher', count: 6 }] },
        { at: 54, spawns: [{ def: 'goblin_chief', count: 1 }, { def: 'goblin_skirmisher', count: 6 }, { def: 'goblin_shaman', count: 2 }], announce: 'they just keep coming.', announceColor: '#c8e070' },
      ],
      repeatLastEvery: 12,
      surviveSec: 78,
    },
    {
      kind: 'reckoning',
      def: 'goblin_colossus',
      verb: 'hordefathers_reckoning',
      level: 12,
      spawnDist: 640,
      panSec: 2.2,
      dwellSec: 1.1,
      blastWaitSec: 1.4,
    },
    {
      kind: 'card',
      card: {
        title: 'THE WAKE',
        lines: [
          'The horn. The green tide. The world going white — then nothing at all.',
          'Strong hands lifting you out of the ruts of the road. A low voice keeping you talking while the miles went by.',
          'You wake beneath a low roof in Lastlight, aching in every bone, owing somebody your life.',
          'Find her. Thank her. Then decide what you mean to do about the road.',
        ],
        button: 'Wake',
      },
    },
    { kind: 'home' },
  ],
};

/** The scene registry — id → def. Adding a scene is one entry (plus, if it
 *  needs a new beat, a registered stage kind). */
export const SCENES: Record<string, SceneDef> = {
  [PROLOGUE_SCENE.id]: PROLOGUE_SCENE,
};

export function registerScene(def: SceneDef): void {
  SCENES[def.id] = def;
}
