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
//   • reckoning — THE AGENCY FALL: a commander arrives just off-screen,
//                 marked by the attention fabric's chevron; the world is
//                 NEVER held. After a grace beat the verb musters through
//                 the REAL skill pipeline (a long honest cast bar + ground
//                 telegraph), the player is free to spend the whole windup
//                 trying to stop it — THE ENRAGE answers a commander bled
//                 below his floor: a visible fury and the bar SURGING to
//                 its last breaths (show, never tell; he stays mortal, and
//                 a true kill just fades forward — never a lock) — and the
//                 hero is FELLED, never killed (the scene intercepts the
//                 lethal blow at the one death chokepoint).
//   • home      — teardown: back to the start-zone bedside, the staging
//                 zone deleted from the off-graph map, completion stamped.
//   • mu        — THE HUB BETWEEN LIVES (data/mu.ts): the hero stands as a
//                 wisp in a zone of nothing where the class roster stands
//                 as shaded vessels; a still linger by an awake one asks
//                 the shell for its class card. Never completes — taking a
//                 vessel builds the run's whole new world outside.
//
// THE GATE: a scene only COUNTS once lived to the end — the `ledger` key
// stamps at the 'home' stage (or a 'mu' stage wearing stampComplete), while
// a begun-mark (`<ledger>_begun`) laid at
// START keeps an ABORTED scene due: quit mid-tutorial and the next New Game
// re-launches it from the first card. While a scene plays the shell writes
// NO run save (the tutorial is not a run; the run begins at the wake), so
// an abort leaves nothing to resume. Veteran accounts (any prior play)
// never see a newly-added scene: the due test requires a virgin account
// (engine/scenes.ts `sceneDue`); only a full account reset brings one back.
// A `transient` scene (the standalone Mu hub) sits outside the gate whole:
// no stamps, re-enterable forever, begun deliberately by the shell.
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
  /** How far off the hero it stands (px) — just past the screen's edge, so
   *  the MARK (the attention fabric's chevron) has a beat to say GO. */
  spawnDist: number;
  /** THE AGENCY BEAT: seconds the commander stands marked — named, chevroned,
   *  its own kit banned — before the director orders the muster. The world is
   *  NEVER held: the tide keeps fighting, the player keeps playing, and the
   *  whole windup is a real cast the player is free to spend trying to stop. */
  graceSec: number;
  /** THE ENRAGE (show, never tell — her word replaced the old immune floor):
   *  at/below this life fraction the commander FURIES instead of shrugging —
   *  a visible rally takes him and the cast bar SURGES to its last breaths
   *  (`enrageLeftSec`). No refusal ever prints; he stays honestly mortal,
   *  and a mechanics-breaker who somehow finishes him anyway just fades
   *  forward (the dead-commander lane) — never a lock. 0 = no trigger. */
  floorFrac: number;
  /** Seconds of cast left after the enrage surge (default 1.2). */
  enrageLeftSec?: number;
  /** After the blast lands, seconds before the dark takes the screen. */
  blastWaitSec: number;
  /** Center-screen callout as the commander arrives. */
  announce?: string;
  announceColor?: string;
}
export interface SceneHomeStage extends SceneStageBase { kind: 'home'; }
/** THE MU STAGE (the hub between lives — engine/scenes.ts owns the handler,
 *  data/mu.ts the ground + the apparitions): the hero stands as a WISP in a
 *  zone of nothing, the class roster stands as shaded vessels, and a still
 *  linger by an awake one asks the shell for that class's card. The stage
 *  never completes — taking a vessel builds a whole new world outside. */
export interface SceneMuStage extends SceneStageBase {
  kind: 'mu';
  /** Stamp the scene's completion ledger the moment the spirit arrives (the
   *  prologue: the tutorial is LIVED once you die out of it — a quit from Mu
   *  re-opens Mu on the next Begin, never the war). */
  stampComplete?: boolean;
}

export type SceneStage =
  | SceneCardStage | SceneDrillStage | SceneClashStage
  | SceneAssaultStage | SceneReckoningStage | SceneHomeStage | SceneMuStage
  | (SceneStageBase & Record<string, unknown>);

export interface SceneDef {
  id: string;
  /** Account-ledger key: stamped at COMPLETION (the 'home' stage, or a 'mu'
   *  stage wearing stampComplete) — the scene only counts once lived whole.
   *  A begun-mark (`<ledger>_begun`) stamps at start so an aborted scene
   *  stays due and re-launches. */
  ledger: string;
  /** TRANSIENT scene (the Mu hub's standalone lane): stamps NOTHING — no
   *  begun-mark, no completion key — and is enterable any number of times.
   *  sceneDue never applies to one; it is begun deliberately by the shell. */
  transient?: boolean;
  /** THE RESOLVE SEAM (data/commanders.ts assigns the prologue's): called at
   *  sceneBegin to produce the EFFECTIVE def the runtime walks — the tutorial
   *  factions swap the clash/assault/reckoning rows per the account's rolled
   *  legion. Must keep id + ledger identical (the gate stamps read the base).
   *  Absent = the def walks as authored. (Type-only World import — the data
   *  leaf stays engine-import-free at runtime.) */
  resolve?: (w: import('../engine/world').World, def: SceneDef) => SceneDef;
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
  /** THE FAR-FIELD DRESS (boundless stages): a boundless arena streams
   *  GROUND under the walker by construction (tiles + no confine), but the
   *  authored dress used to stop at the minted heart's rim — walk far
   *  enough and the world degraded to bare tessellation. The director now
   *  re-scatters the heart's OWN palette in seeded chunks around the party
   *  (engine/scenes.ts streamSceneDress): deterministic per chunk
   *  (position-hashed off the stage seed, so culled ground re-mints
   *  identically on return — the persistent-geography idiom), thinner than
   *  the heart (the road's shoulders, never a second heart), seeded
   *  off-screen and culled far behind. */
  dressStream: {
    /** Chunk grain (px) — the seed/cull unit. */
    chunk: 720,
    /** Seed chunks within this reach of any player seat (px). */
    reach: 1600,
    /** Drop streamed chunks beyond this of every seat (px). */
    cull: 2600,
    /** Far-field density as a fraction of the heart's own, per kind. */
    thin: 0.55,
    /** Hard cap on streamed pieces per chunk. */
    maxPerChunk: 12,
    /** Never seed a chunk whose center is nearer any seat than this (px) —
     *  fresh terrain always lands off-screen, never pops at the feet. */
    seedAhead: 760,
    /** Kinds that never stream even when the heart holds them: masonry and
     *  other LINE-PATTERNED stamps (hedgerows, structure walls) whose shape
     *  IS their meaning — re-scattered at random they read as orphan dots,
     *  not as the country. Structural exclusions (state-carriers, hazards,
     *  seed-paired, clearways) live in the streamer's own predicate; this
     *  list is the taste dial for pattern-bound kinds. */
    skipKinds: ['wall', 'rampart', 'palisade', 'drystone', 'hedgewall', 'parapet', 'window', 'door'],
  },
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
        { kind: 'move', amount: 480, prompt: 'Keep moving: {bind:moveUp}{bind:moveLeft}{bind:moveDown}{bind:moveRight}' },
        { kind: 'cast', amount: 5, prompt: 'Something in the grass. Strike at it: {bind:skillSlot0}' },
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
        { at: 0, spawns: [{ def: 'goblin_skirmisher', count: 4 }], announce: 'more of them, hold the road!', announceColor: '#9fdc6a' },
        { at: 13, spawns: [{ def: 'goblin_skirmisher', count: 4 }, { def: 'goblin_brute', count: 1 }] },
        { at: 26, spawns: [{ def: 'goblin_skirmisher', count: 5 }, { def: 'goblin_shaman', count: 2 }], announce: 'the grass is moving everywhere…', announceColor: '#c8e070' },
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
      spawnDist: 560,
      graceSec: 2.2,
      floorFrac: 0.1,
      enrageLeftSec: 1.2,
      blastWaitSec: 1.6,
      announce: 'the Hordefather himself comes to end the road.',
      announceColor: '#9fdc6a',
    },
    {
      kind: 'card',
      card: {
        title: 'THE HOLLOW WAKE',
        lines: [
          'The horn. The green tide. The world going white — then nothing at all.',
          'No road underfoot. No weight. No breath left to catch. Only a pale country of nothing, and you: a small light adrift in it.',
          'Shapes stand in the stillness ahead — every one of them a life you might yet wear back to the world.',
          'Drift to one. Be still. Take its hands.',
        ],
        button: 'Drift',
      },
    },
    { kind: 'mu', stampComplete: true },
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
