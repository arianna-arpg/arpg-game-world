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

/** One size band an encounter can roll into — the small-vs-large variance. */
export interface EncounterScale {
  id: string;
  label: string;
  /** Relative likelihood this scale is chosen at placement (rng.weighted). */
  weight: number;
  /** Seconds the field stays open at base — the VARIABLE scale knob. */
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
  /** Scales the close reward (xp + gems). */
  rewardMul: number;
}

/** The reality-collapse variant config (Phase 3 — a closed breach may collapse
 *  into a timed sub-zone leading to a champion). Declared now so the type is
 *  stable; unused until the collapse chain ships. */
export interface EncounterCollapse {
  chance: number;
  findTime: number;
  timePerKill: number;
  tileset: string;
  champion: { monsterId: string; levelBonus: number; ledgerKill: string };
}

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
    tileset: string;
    champion: { monsterId: string; levelBonus: number; ledgerKill: string };
    /** Reward multiplier per stage reached when the realm is cleared. */
    rewardMulPerStage: number;
  };
}

/** The ledger keys an encounter bumps — these drive the discovery ladder. */
export interface EncounterLedger {
  /** Bumped when the player OPENS one (first time → the feature is discovered). */
  onEncounter: string;
  /** Bumped when one closes (the investment milestone, e.g. breaches_closed). */
  onClose: string;
  onCollapse?: string;
  onChampion?: string;
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
  collapse?: EncounterCollapse;
  /** Promotes this encounter into a spatial, escalating DEMON INVASION world
   *  event (growing storm radius + meteors + portal). Undefined = a plain in-zone
   *  encounter (Breach). The overlay reads this; the in-zone field uses scales. */
  surge?: DemonSurge;
}
