// ---------------------------------------------------------------------------
// ENCOUNTER PRIMITIVE — a generalized in-zone, spatial, timed event (DATA).
//
// An Encounter is a glowing object placed in a zone that, when the player steps
// onto it, OPENS a growing circular field which spawns monsters ONLY inside its
// radius. Each kill feeds a tiny amount of time back (and nudges the radius
// wider), so fast clearing snowballs the event while slowing down lets the timer
// bleed out and the field CLOSE. The SCALE is variable — a short "fracture" or a
// long "tear in reality" — encoded purely as numbers, so a new event type (or a
// whole new expansion) is one more EncounterDef literal. Breach is the first.
//
// Pure leaf: only declarative types. The engine-side runtime is ActiveEncounter
// in engine/encounter.ts; placement / growth / spawning / the kill-fed timer all
// live on World, driven by these numbers.
// ---------------------------------------------------------------------------

import type { ArenaSpec } from '../data/arenas';
import type { EssenceId } from '../data/essences';
import type { ItemRarity } from '../engine/items';
import type { Modifier } from '../engine/stats';

/** One size band an encounter can roll into — the small-vs-large variance. */
export interface EncounterScale {
  id: string;
  label: string;
  /** Relative likelihood this scale is chosen at placement (rng.weighted).
   *  For EXTRACT encounters this is the "long draws are rare" dial: the
   *  richest seams carry the smallest weights. */
  weight: number;
  /** Seconds the field stays open at base — the VARIABLE scale knob. For an
   *  extract encounter this is the rolled DEFENSE clock (the yield ceiling). */
  baseTime: number;
  /** Cap on the total kill-fed time added over baseTime (caps the snowball). */
  maxBonusTime: number;
  startRadius: number;
  maxRadius: number;
  /** Passive spread of the radius per second (independent of kills). */
  growthPerSec: number;
  /** Seconds between spawn pulses (rolled in this range each pulse). */
  spawnInterval: [number, number];
  /** Monsters per pulse (rolled in this range). */
  spawnBatch: [number, number];
  /** Scales the close reward (xp + gems; for extract: the essence pot). */
  rewardMul: number;
  /** EXTRACT-ONLY: multiplier on the node's hit points at this scale (a
   *  longer draw stands a sturdier node). Plain encounters ignore it. */
  nodeLifeMul?: number;
}

/** THE SHARED ENCOUNTER FRAMEWORK KNOBS — engine-side levers every in-zone
 *  encounter obeys, config here rather than constants in world.ts (the same
 *  discipline as LOS_CFG / DROP_CFG). Per-encounter numbers stay on the DEF;
 *  these are the cross-encounter invariants. */
export const ENCOUNTER_CFG = {
  /** Per-qualifying-zone base placement chance at pressure 1 (×ignitionMul
   *  ×zone encounterDensity ×biome eventDensityMul ×mycelia suppression). */
  openChance: 0.16,
  /** Hard ceiling on the folded placement chance — even a cranked run keeps
   *  SOME zones quiet, so encounters never read as guaranteed furniture. */
  openChanceCap: 0.85,
  /** Max living enemies inside an open field — the spawn pulses hold while
   *  the arena is saturated (frame-cost + fairness floor). */
  fieldCap: 26,
  /** Close-reward formula terms: xp = (base + level × perLevel) × rewardMul;
   *  gems = 1 + floor(rewardMul). */
  reward: { xpBase: 40, xpPerLevel: 12 },
} as const;

// --- DEMON INVASION: the spatial, escalating world-event layer ---------------
//
// A Demon Invasion is bigger than an in-zone Encounter: it picks a nearby map
// COORDINATE (charted or not), grows a storm RADIUS over time, rains meteors on
// the zones it covers, and — once it festers long enough — tears a portal to the
// demon realm. All of that escalation is DATA on the surge below (no constants in
// the overlay): a TYPE rolled at ignition (the flavor) and a STAGE ladder walked
// by elapsed age (the severity). Carried by an EncounterDef via `surge`, so a
// plain encounter (Breach) leaves it undefined and is wholly unaffected.

/** One flavor a Demon Invasion can ignite as (Imp Incursion / Hell-Host /
 *  Balor's Rite). Rolled by weight at trigger; adding a flavor is one entry. */
export interface InvasionType {
  id: string;
  /** Shown in bulletins / the minimap ("Imp Incursion"). */
  label: string;
  /** Relative likelihood this flavor is rolled when an invasion ignites. */
  weight: number;
  /** Faction rosters this flavor fields (default ['demon']). A future bespoke
   *  sub-faction is one FactionSpec + naming it here — pure data. */
  factions?: string[];
  /** Age-clock multiplier: >1 ramps the stages + portal SOONER (Balor's Rite),
   *  <1 is a slow creep. The lever behind "ramps to the portal fastest". */
  ageScale: number;
  /** Multiplier on this flavor's demon strength (added-level), heavy vs swarm. */
  strengthMul: number;
  /** Multiplier on meteor cadence (a swarm rains more, lighter strikes). */
  meteorMul: number;
  /** Tint for the minimap epicenter wash (defaults to the demon red). */
  color?: string;
  /** THIS TYPE'S OWN REALM ARENA (data/arenas.ts) — the underworld its portal
   *  opens onto: tileset, layout recipe, name, pack density, and (the Chaos-
   *  Sanctuary move) ward seals the player must break before the Balor
   *  manifests. Absent = the surge's shared portal.tileset, classic behavior. */
  realm?: ArenaSpec;
}

/** One duration THRESHOLD row of the escalation ladder — the modular, no-
 *  hardcoding core. The overlay picks the LAST row whose atSeconds <= elapsed
 *  age (a step function over time), so "the longer it festers, the stronger +
 *  wider it grows" is a table lookup, never a constant. Each value is then
 *  scaled LIVE by the package's pressure in the overlay. */
export interface InvasionStage {
  /** Elapsed seconds at which this stage takes over (0 = the opening stage). */
  atSeconds: number;
  /** Shown in the HUD / bulletins ("Demon Siege", "Cataclysm"). */
  label: string;
  /** Added monster levels on demon spawns at this stage. */
  strengthBonus: number;
  /** Additive node-space radius the storm reaches at this stage. */
  radiusBonus: number;
  /** Meteor strikes per second in an in-radius zone (before pressure scaling). */
  meteorRatePerSec: number;
  /** Chance a meteor impact spawns a demon / leaves a raisable corpse. */
  meteorSpawnChance: number;
  /** Multiplier on the repel/close reward at this stage (the risk→reward dial). */
  rewardMul: number;
  /** Once reached, the epicenter may tear open a portal to the demon realm. */
  opensPortal?: boolean;
}

/** The spatial + storm + portal config a demon-invasion encounter carries — the
 *  block EncounterScale lacks. Attached via EncounterDef.surge; undefined for a
 *  plain encounter (Breach) → byte-identical, current behavior. */
export interface DemonSurge {
  /** Skill id the meteor strike casts (a telegraphed AoE in the storm pipeline). */
  meteorSkillId: string;
  /** Blast radius of a meteor impact. */
  meteorRadius: number;
  /** Telegraph seconds before a meteor lands (the dodge window). */
  meteorTelegraph: number;
  /** How the epicenter coordinate is rolled. `spread` = node-units the coordinate
   *  may roll BEYOND the visible map's bounding box (so an invasion erupts within
   *  what the player can see, at most ~one node past the charted frontier).
   *  `bias` skews WHERE in that box: -1 = as FAR from the player's current zone as
   *  possible (always a trek), 0 = uniform, +1 = right ON TOP of the player. */
  epicenter: { spread: number; bias: number };
  /** Tileset the demon-blighted epicenter zone is minted with (a rift biome). */
  epicenterTileset: string;
  /** Node-space storm radius: where it starts, the cap, and passive growth/sec. */
  startRadius: number;
  maxRadius: number;
  radiusGrowthPerSec: number;
  /** Slack added to a zone's in-radius test (a forgiving edge). */
  inRadiusSlack: number;
  /** Live in-zone demon headcount past which a meteor impact leaves a raisable
   *  CORPSE instead of another body (density cap + the corpse-compounding feed). */
  meteorHeadcountCap: number;
  /** Ambient walk-in spawn-table multiplier on the invasion's factions inside
   *  the storm radius (the storm bleeding into the ordinary monster mix). */
  stormFactionMul: number;
  /** Hard lifetime cap (seconds); an utterly ignored invasion finally burns out. */
  maxLifeSec: number;
  /** Per-second base chance (×pressure) a fresh invasion ignites. */
  triggerChance: number;
  /** Most invasions live at once (a high Vault tier could raise this later). */
  maxConcurrent: number;
  /** The flavors this invasion can ignite as (rolled by weight). */
  types: InvasionType[];
  /** The escalation ladder (ascending atSeconds; the overlay walks it). */
  stages: InvasionStage[];
  /** The portal-to-realm config (wired in Phase 4); declared now so the type is
   *  stable and the tier tests that read its ledger keys don't drift. */
  portal: {
    /** Elapsed seconds after which the epicenter tears a portal open. */
    atSeconds: number;
    /** WHEN the rift stands: 'epicenter' = as soon as the epicenter zone
     *  materializes (every epicenter always offers its realm — the reward
     *  premium still scales with the stage you dive at); 'stage' (default) =
     *  only once age/opensPortal say so, the classic fester-gate. */
    openAt?: 'epicenter' | 'stage';
    tileset: string;
    champion: { monsterId: string; levelBonus: number; ledgerKill: string };
    /** Reward multiplier per stage reached when the realm is cleared. */
    rewardMulPerStage: number;
  };
}

// --- EXTRACTION: the defend-the-node INVERSION of the encounter clock --------
//
// An Extract encounter flips the breach contract end-for-end. The placed object
// is not a door for monsters — it is the PRIZE: a seam where the world's marrow
// wells up. The player DWELLS to tap it (an act of attention, never a step-on),
// a defense clock runs DOWN rather than bleeding out, and the zone itself
// objects to the disturbance — the LOCAL population pours in fixated on the
// node (the per-body tuning graft + the threat chart), turning on the player
// only when given a reason and drifting back when the reason melts. The yield
// is ESSENCE, scaled by how long the defense stood; the rolled clock is the
// ceiling. When it ends — drained dry or torn down — the spawns cease and the
// swarm DISPERSES back the way it came, each body by its own temper.
//
// Attached via EncounterDef.extract (the DemonSurge promotion pattern):
// undefined = a plain encounter, byte-identical, wholly unaffected.

/** The node body's mechanics (its per-biome FACE lives in data/extraction.ts —
 *  the EXTRACTION_LOOKS registry; these numbers are look-independent). */
export interface ExtractNodeSpec {
  /** Node hit points: (lifeBase + zoneLevel × lifePerLevel) × scale.nodeLifeMul. */
  lifeBase: number;
  lifePerLevel: number;
}

/** The dwell that ARMS the draw (the transit row 'extraction' carries the
 *  ring feel; these are the mechanics). */
export interface ExtractArmSpec {
  /** Seconds lingered in reach before the tap begins. */
  dwellSec: number;
  /** Engage ring around the node within which the dwell builds. */
  radius: number;
}

/** THE SWARM DIRECTOR — who pours in, and how the pour escalates while the
 *  clock drains. All cadences LERP from their Start band to their End band
 *  along elapsed^rampPower, so a long draw ends in a crescendo. */
export interface ExtractSwarmSpec {
  /** 'native' = the zone's own (conquest-aware) population — the disturbed-
   *  locals thesis; the def's `factions` rosters are then a MINORITY seasoning
   *  rolled at `mixChance` (the essence-drawn opportunists that follow seams
   *  anywhere). 'factions' = classic roster-only filling (breach behavior). */
  source: 'native' | 'factions';
  /** Chance a pulse body rolls from the def's factions instead of the zone. */
  mixChance: number;
  intervalStart: [number, number];
  intervalEnd: [number, number];
  batchStart: [number, number];
  batchEnd: [number, number];
  /** Escalation curve exponent over elapsed fraction (1 = linear). */
  rampPower: number;
  /** Living swarmers cap — deliberately below ENCOUNTER_CFG.fieldCap so a
   *  defense stays a stand, not a drowning. */
  fieldCap: number;
  /** Swarm level over zone level. */
  levelBonus: number;
  /** Spawn ring distance from the node (rolled; rim entry, never on top). */
  entryRadius: [number, number];
  // --- the FIXATION numbers (the tuning graft + the threat chart) ------------
  /** Threat toward the node stamped at spawn (× the body's aggro.fixation). */
  seedThreat: number;
  /** Threat re-seeded every beaconSec while the node stands — the standing
   *  disturbance that pulls wandering attention back. */
  pulseThreat: number;
  beaconSec: number;
  /** Grafted threat decay per second (× aggro.waver; the chart default is
   *  0.08). High = player grudges melt fast and the swarm returns to work. */
  decay: number;
  /** Grafted lock loyalty (>1 = a challenger must beat the hold by margin). */
  stickiness: number;
}

/** THE YIELD — paid as essence PACKETS on the ground (dropEssenceAt →
 *  grantEssence → the essence_touched ledger, so the Vault's salvage station
 *  surfaces through play with zero extra wiring). Deliberately SMALL numbers:
 *  the seam is a bootstrap faucet, never a fortune (the essence economy is
 *  reined tight on purpose). */
export interface ExtractYieldSpec {
  /** Base grade every packet starts at ('coarse'). */
  essence: string;
  /** Full-completion packet budget: (potBase + zoneLevel × potPerLevel) ×
   *  scale.rewardMul, then × frac^partialPower for a broken stand. */
  potBase: number;
  potPerLevel: number;
  /** Ground packets the pot is scattered across (each rolls its own grade). */
  packets: number;
  /** Early-shatter penalty exponent (>1 = breaking early pays LESS than
   *  time-linear — the defense is worth finishing). */
  partialPower: number;
  /** Stands shorter than this fraction of the clock pay nothing at all. */
  minFrac: number;
  /** Grade-climb rungs (the essences.ts tierRungs idiom): rolled per packet
   *  IN ORDER, stopping at the first level-fail or chance-miss. */
  rungs: { atLevel: number; chance: number }[];
  /** Added to every rung chance when the clock ran its FULL course. */
  fullDefenseRungBonus: number;
  /** A little xp so the stand is never dead time (× rewardMul × frac). */
  xpBase: number;
  xpPerLevel: number;
}

/** DISPERSAL — the disturbance ends (drained OR torn down): spawns cease and
 *  every living swarmer goes home along its own entry bearing. HOW it leaves
 *  is its temper (MonsterDef.temper → FACTION_TRAITS.temper → 'wary'):
 *  skittish keeps walking even under fire, wary re-awakens if struck,
 *  territorial holds the ground a while first — a small expedition. */
export interface ExtractDisperseSpec {
  /** Territorial hold before leaving, rolled per body (a staggered ebb). */
  lingerSec: [number, number];
  /** Close enough to the entry point = gone (the slipAway exit). */
  arriveDist: number;
}

/** The whole extract block. Every string the HUD speaks lives in `text` —
 *  tone is data, not engine prose. */
export interface ExtractSpec {
  node: ExtractNodeSpec;
  arm: ExtractArmSpec;
  swarm: ExtractSwarmSpec;
  yield: ExtractYieldSpec;
  disperse: ExtractDisperseSpec;
  /** Bumped when a defended node is DESTROYED (the loss half of the ledger;
   *  onClose stays the completion). Unread by tiers today — a future "learn
   *  from failure" rung may read it, and the bump is already honest. */
  ledgerLost: string;
  text: {
    /** Floated when the node is first sighted (discovery flavor). */
    found: string;
    /** Floated when the dwell fires and the clock starts. */
    armed: string;
    /** Full completion. */
    depleted: string;
    /** The node fell. */
    shattered: string;
  };
}

// --- BOROUGH: the defend-the-FOLK promotion — a village worth saving ---------
//
// A Borough encounter places a small settlement of FRIENDLY townsfolk in wild
// country. Found, it musters: a countdown to an incoming horde (the deadwake
// thesis pointed at a home). During the muster the player may ARM the folk —
// gifting real gear (its compiled mods graft onto the body) or spending the
// essence wallet on data-defined stat packages — and an armed villager steps
// out of the huddle and FIGHTS through the one shared pipeline. Unarmed folk
// stay huddled (a dormant tag with no rouse rule: helpless on purpose). The
// horde is the zone's own population poured through the extraction swarm
// director, fixated on the FOLK via the threat chart — so the attention-craft
// levers (Goad, the Quiet Hand) are, emergently, the bodyguard lane. Survivors
// emigrate to Lastlight and its population GROWS (the BoroughField overlay) —
// the founding stone of the run's town-building layer.
//
// Attached via EncounterDef.borough (the ExtractSpec promotion pattern):
// undefined = a plain encounter, byte-identical, wholly unaffected.

/** The townsfolk themselves — who lives here, and how many. */
export interface BoroughFolkSpec {
  /** Weighted roster of folk bodies (MonsterDef ids, spawned team-player). */
  roster: { id: string; weight: number }[];
  /** Folk count rolled at placement, keyed by the rolled scale's id — a
   *  bigger settlement shelters (and can lose) more souls. Every scale id
   *  must have a row (validated). */
  byScale: Record<string, [number, number]>;
  /** Folk level over zone level (their bodies' scaling base). */
  levelBonus: number;
  /** Huddle ring radius around the hearth where the folk cluster. */
  huddleRadius: number;
}

/** The muster — discovery starts a fair, visible countdown (roving-arrival
 *  doctrine: no clock ever runs before the player could have seen it). */
export interface BoroughMusterSpec {
  /** Countdown seconds between discovery and the assault. */
  seconds: number;
  /** Coming within this range (with an honest sight line) DISCOVERS the
   *  settlement and starts the muster. */
  discoverRadius: number;
  /** When arming is allowed: only during the muster, or right through the
   *  assault (battlefield triage). */
  armWindow: 'muster' | 'always';
}

/** THE ARMING TABLE — every way a villager can be made to matter, as data.
 *  Both channels graft named mod bundles onto the folk's own StatSheet
 *  (the garrison-claim idiom), so arming rides the ordinary stat engine. */
export interface BoroughArmingSpec {
  /** Reach around a folk body within which the arming dwell builds. */
  radius: number;
  /** Idle seconds before the arming panel is offered (transit row
   *  'borough_arm' can retune; this is the fallback). */
  dwellSec: number;
  /** Most gear gifts one villager can carry. */
  maxGifts: number;
  /** Baseline granted by ANY gear gift — the act of being armed at all —
   *  scaled by the gift's rarity multiplier below, then folded in WITH the
   *  item's own compiled mods. */
  gearBaseline: Modifier[];
  /** × gearBaseline per gift rarity (a rare blade arms harder than a stick). */
  giftRarityMul: Record<ItemRarity, number>;
  /** Per-tier essence packages: each application costs `cost` of that tint
   *  and stacks its mods linearly up to `maxStacks`. `label` is the panel's
   *  honest description of one stack. */
  essence: Record<EssenceId, { cost: number; maxStacks: number; label: string; mods: Modifier[] }>;
}

/** The assault — the horde itself rides the SHARED swarm director shape
 *  (ExtractSwarmSpec): cadence/batch ramp bands, fixation seeding, the
 *  threat-chart numbers. One shape, two consumers, zero drift. */
export interface BoroughAssaultSpec {
  /** Spawner duration is the rolled scale's baseTime; after it lapses,
   *  stragglers get this long before the field force-settles. */
  graceSec: number;
  swarm: ExtractSwarmSpec;
  /** How the leftover horde goes home when it ends (the extraction
   *  dispersal fabric, reused verbatim). */
  disperse: ExtractDisperseSpec;
}

/** The refuge — survivors walk out and join Lastlight. */
export interface BoroughRefugeeSpec {
  /** Lastlight population added per surviving villager. */
  populationPer: number;
  /** Close enough to the exit = away (the slipAway despawn). */
  arriveDist: number;
  /** Close xp: (xpBase + xpPerSurvivor × survivors) × scale.rewardMul. */
  xpBase: number;
  xpPerSurvivor: number;
}

/** The whole borough block. Every string the HUD speaks lives in `text`. */
export interface BoroughSpec {
  folk: BoroughFolkSpec;
  muster: BoroughMusterSpec;
  arming: BoroughArmingSpec;
  assault: BoroughAssaultSpec;
  refugees: BoroughRefugeeSpec;
  /** The settlement's dressing: a hearth doodad at the green plus ring-
   *  scattered camp scatter (the extraction dressing idiom — small kinds
   *  only, so a runtime stamp can never wall a path). */
  site: {
    center: { kind: string };
    dressing: { kind: string; count: [number, number]; ring: [number, number] }[];
  };
  /** Bumped when the folk are wiped (the loss half; onClose stays the hold). */
  ledgerLost: string;
  /** Bumped BY survivor count when refugees reach Lastlight (a tally future
   *  account rungs may read; already honest). */
  ledgerRefugees: string;
  text: {
    /** Floated at discovery, as the muster clock starts. */
    found: string;
    /** Floated when the muster lapses and the horde breaks. */
    assault: string;
    /** The stand held — survivors take the road. */
    held: string;
    /** Every villager fell. */
    lost: string;
  };
}

/** The ledger keys an encounter bumps — these drive the discovery ladder.
 *  EVERY key here must be READ by some unlock/tier (and vice versa): the
 *  event QA harness enforces the contract in both directions, so a key only
 *  enters this type alongside the code that bumps it. */
export interface EncounterLedger {
  /** Bumped when the player OPENS one (first time → the feature is discovered). */
  onEncounter: string;
  /** Bumped when one closes (the investment milestone, e.g. breaches_closed). */
  onClose: string;
}

/** A declarative in-zone encounter. Lives on ContentPackage.encounters[]. */
export interface EncounterDef {
  id: string;
  /** Links the encounter to its package's gate (pressure/start-level) + ledger. */
  packageId: string;
  /** Short label for the in-zone HUD ("Breach"). */
  label: string;
  /** Faction ids whose rosters fill the field (resolved via FACTIONS[id].table). */
  factions: string[];
  /** The placed object the player steps onto to open it. */
  trigger: { glyph: string; color: string; activateRadius: number };
  scales: EncounterScale[];
  /** Tiny time added per kill inside the field (the kill-fed timer). */
  timePerKill: number;
  /** Tiny radius nudge per kill. */
  radiusPerKill: number;
  ledger: EncounterLedger;
  /** The DIMENSIONS this encounter may place in (default ['surface']) — the
   *  same seam the overlays use (WorldHooks.dimensions), so "breaches tear in
   *  hell too" is one data line, never an engine edit. */
  dimensions?: string[];
  /** BIOME allowlist (ZoneDef.biome ids): absent = anywhere the structural
   *  floor admits; present = ONLY these grounds may seed it (a village
   *  settles temperate country; a seam wells up anywhere). The generic
   *  companion to `dimensions`, checked at the same placement gate. */
  biomes?: string[];
  /** Promotes this encounter into a spatial, escalating DEMON INVASION world
   *  event (growing storm radius + meteors + portal). Undefined = a plain in-zone
   *  encounter (Breach). The overlay reads this; the in-zone field uses scales. */
  surge?: DemonSurge;
  /** Promotes this encounter into a DEFEND-THE-NODE extraction (the inverse
   *  clock: dwell-armed, counting DOWN, the placed object is the prize and the
   *  zone's own population comes to break it). Undefined = a plain encounter,
   *  byte-identical. Mutually exclusive with `surge`. */
  extract?: ExtractSpec;
  /** Promotes this encounter into a DEFEND-THE-FOLK borough (a friendly
   *  settlement, a mustered countdown, an armable militia, refugees for
   *  Lastlight). Undefined = a plain encounter, byte-identical. Mutually
   *  exclusive with `surge` and `extract`. */
  borough?: BoroughSpec;
}
