import { empowermentRank, skillInstanceName } from '../engine/skillEmpowerment';
import { afflictionPressureOf } from '../engine/afflictionPressure';
import { armedStatusCues } from '../engine/armedCues';
import { reactiveCueOf, wardCueActive, wardGuardians } from '../engine/combatReadability';
import { memoryAccessView } from '../meta/memoryUnlocks';
import { castingCompletion, castingCueOf } from '../engine/castingCues';
import { bodyActionPoseOf } from '../engine/bodyAction';
import { bodyWalkPoseOf } from '../engine/bodyWalk';
import { guardReleaseCue } from '../engine/warningCues';
import { encounterCueOf } from '../engine/encounterCombat';
import { parryCueStrength, guardArcRadians } from '../engine/combatCues';
import { meleeReachCueOf } from '../engine/meleeReach';
import type { TitanScenePiece } from '../engine/titans';
import { cosmeticStyle, COSMETIC_PROJECTILES } from '../data/cosmeticStyles';
import { cosmeticLoadoutFor, cosmeticSummonSkill, sanitizeCosmeticLoadout } from '../meta/cosmetics';
import type { CosmeticLoadout, CosmeticMotif } from '../engine/cosmetics';
const EMPTY_COSMETIC_LOADOUT: CosmeticLoadout = { slots: {}, skills: {} };
import { flaskChargeBanks, restoreFlaskChargeBanks } from '../engine/flaskState';
// ---------------------------------------------------------------------------
// SNAPSHOT — the host→client render-state wire format + (de)serialization.
//
// Host-authoritative co-op: only the host runs the sim. Each wire tick the host
// SERIALIZES the renderable world into a flat, JSON-safe StateSnapshot (no Actor
// objects, no StatSheets, no Maps — ids/numbers/strings only); clients APPLY it
// onto a render-only World they never simulate, then draw it with the EXISTING
// renderer untouched. To make the renderer work unchanged, applySnapshot rebuilds
// lightweight Actor objects and re-installs the few StatSheet bases the renderer
// reads (maxLife/maxMana/maxEs, invisible, detectability) so actor.maxLife() etc.
// return the host's numbers.
//
// MVP fidelity: heroes, enemies, projectiles, drops, orbs, texts, flashes render
// faithfully. Exotic per-actor FX (cast bars, auras, worm tails, constructs) are
// NOT shipped and degrade gracefully — the renderer guards every one of them, so
// they simply don't draw on a client. The HOST always sees full fidelity.
// ---------------------------------------------------------------------------

import type { RefugeDeparture } from '../engine/refugeDeparture';
import { replenishingDelivery } from '../engine/replenishment';
import { Actor, type ActorAdorn, type ActorShape, type Team,
  type CastingState, type ActiveAura, type ConstructState, type LeapState, type WormBody } from '../engine/actor';
import type { CourseJourney } from '../world/courseStages';
import type { AnnexSpec, Doodad, DoodadDoor, HollowSpec, PlacedStructure } from '../engine/levelgen';
import { bagBoard } from '../engine/inventory';
import { containerBoard, containerList, packContainerBoard, type ContainerBoardW } from '../engine/containers';
import type { HitShape } from '../engine/shapes';
import type { TrackSpec } from '../engine/tracks';
import type { TrapworkSpec } from '../engine/trapworks';
import { eyecatchElapsed } from '../engine/ultimates';
import type { PartSpec } from '../render/vis/parts';
import type { ZoneDef, ZoneTheme } from '../data/zones';
import { hullOf, type ZoneShape } from '../world/shape';
import { GridWalkField, type PackedWalk } from '../world/gridWalk';
import { emptyAbilityEssences, emptyEssences } from '../engine/world';
import type { World, Seat, VendorEntry } from '../engine/world';
import { HONEST_INPUT_CFG } from './intent'; // THE HONEST INPUT: the walk fold's row
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { MONSTERS } from '../data/monsters';
import { PASSIVE_NODES } from '../data/passives';
import { sanitizeChoices, sanitizeGrafts } from '../data/passiveChoices';
import { makeSkillInstance, validTreeNodes, type SkillInstance, type SupportInstance, type SkillRarity } from '../engine/skills';
import { rebuildItem } from '../engine/itemgen';
import { rebuildAnyItem } from '../engine/gemitems';
import { sanitizeCompanionStances } from '../engine/companionStances';
import { ITEM_RARITIES, type ItemInstance } from '../engine/items';
import { VESTIGES } from '../data/vestiges';
import { abilityEssenceOfTier, ESSENCES } from '../data/essences';
import type { Attributes } from '../engine/stats';
import { comboCueRows } from '../engine/comboCues';
import { comboConditionRows, type ComboConditionId } from '../engine/comboConditions';
import { poolCueRows } from '../engine/reserveCues';
import { payloadCueRows } from '../engine/payloadCues';
import { procCueRows } from '../engine/procCues';
import { anatomyCueState, cloneAnatomyCues } from '../engine/anatomyCues';
import { feedingCueState, cloneFeedingCues } from '../engine/feedingCues';
import { companionCueState, cloneCompanionCues, cloneRecoveryCue } from '../engine/companionCues';
import { GRAB_VERB_LABEL } from '../engine/grab';
import { tellSpecsOf } from '../engine/tells';
import { fellProgress } from '../engine/rampage';
import { watchRungOf, watchValueOf } from '../engine/watch';
import { gaugeFloor, gaugeFrac, gaugeLocked, gaugeReady } from '../engine/gauge'; // THE WIRE'S EYES: the bar's gauge rows
import { COOP_SCALING } from '../data/coop'; // THE WIRE'S EYES: the zone rows' reach (THE NEAR LAW's radius)
import { applyCounterRows, applyCounterZone, counterZoneOf, harvestRowOf, journalRowOf, type HarvestW, type JournalW } from './journalWire'; // THE COUNTERS AND THE JOURNAL
import { roadDwellRow } from '../engine/shardRoads'; // THE ROADS PER PLAYER (shard M1 W2): the road ring

export type Vec2W = [number, number];

/** THE PING on the wire (engine/pings.ts WorldPing): seat, point, story, at, until. */
export interface PingW { s: string; p: Vec2W; k: number; a: number; u: number; }

/** THE WIRE DISCIPLINE (docs/design/shard-world.md §3.9): account-derived
 *  views ship on a BEAT, not every tick. The memoryAccess row is ~44 KB and
 *  changes only when the keeper's memory unlocks do, yet it rode all 20
 *  snapshots a second (the whole rest of a quiet snapshot is ~1 KB). It now
 *  rides every `memoryAccessBeat`-th snapshot — the meta-delta lesson kept:
 *  a dropped frame self-heals on the next beat, and a client keeps the last
 *  row it saw (applySnapshot only overwrites when the row is present). */
export const WIRE_CFG = {
  /** Snapshots between memoryAccess rows (30 at 20 Hz = 1.5 s, the META_HEARTBEAT's own cadence). */
  memoryAccessBeat: 30,
  /** THE SHELF BEAT (the memoryAccess idiom for the vendor rows: `vendor`, `vendorRestockAt`,
   *  `vendorCap`): a changed shelf ships on the next snapshot, an unchanged one only every
   *  `vendorBeat`-th (30 = 1.5 s), so a client that applied only the newest of a queued run
   *  heals on the beat. A client keeps the last rows it saw (absent = unchanged). */
  vendorBeat: 30,
  /** THE WIRE'S EYES (docs/engine/shard.md): the dials of the rows a client draws from. */
  eyes: {
    /** A ground field or telegraph (`zones`) ships while its edge lies within this many px of
     *  any seated player's body (the keeper is never a viewer); 0 = THE NEAR LAW's own radius
     *  (COOP_SCALING.shareRadius), and 0 there too = every zone (the co-op lanes). */
    zoneReach: 0,
    /** At most this many zone rows ride one snapshot, the nearest to a seated player first. */
    zoneMax: 160,
    /** The own seat's cooldown clocks (`SeatW.cd`) ride this grid in seconds, the remainder
     *  rounded UP so a client never reads a skill ready before the host does. */
    clockGrid: 0.05,
    /** A client extrapolates a projectile along its `v` for at most this many seconds past
     *  the newest snapshot (a late snapshot's flight never freezes, never runs away). */
    projAheadSec: 0.1,
  },
};

/** One renderer-visible actor on the wire. Short keys keep the JSON small. */
export interface ActorW {
  bodyActionPose?: import('../engine/bodyAction').BodyActionPose;
  bodyWalkPose?: import('../engine/bodyWalk').BodyWalkPose;
  movementTether?: Actor['movementTether'];
  encounterGroup?: Actor['encounterGroup'];
  encounterCue?: import('../engine/warningCues').EncounterCue;
  afflictionPressure?: import('../engine/afflictionPressure').AfflictionPressure;
  armedCues?: import('../engine/armedCues').ArmedCue[];
  reactiveCue?: import('../engine/combatReadability').ReactiveCue;
  poolCues?: import('../engine/reserveCues').PoolCueRow[];
  payloadCues?: import('../engine/payloadCues').PayloadCueRow[];
  procCues?: import('../engine/procCues').ProcCueRow[];
  anatomyCues?: import('../engine/anatomyCues').AnatomyCueState;
  feedingCues?: import('../engine/feedingCues').FeedingCueState;
  companionCues?: import('../engine/companionCues').CompanionCueState;
  wardCue?: { profile?: string; sources: number[] };
  encounterOrder?: Pick<NonNullable<Actor['encounterOrder']>, 'group' | 'recipe' | 'plan' | 'leader' | 'phase' | 'until'>;
  cosmeticKind?: 'wisp';
  cosmeticLoadout?: CosmeticLoadout;
  id: number;
  p: Vec2W; f: number; r: number; c: string; sh: ActorShape;
  team: Team; name: string;
  life: number; maxLife: number; es: number; maxEs: number;
  hf: number;                  // hitFlash
  downed: boolean; dead: boolean;
  mn: boolean;                 // isMinion() (purple outline)
  passive: boolean;
  ut: boolean;                 // untargetable (ghostly alpha)
  summonReform?: [number, number]; // remaining / full reconstruction time
  thu?: number; // throngUnits: constituent count in a cluster
  the?: number; // throngEgg: batch held by a find
  thg?: Record<string, number>; // native hatch gauges by equipped skill
  assault?: Actor['assaultHud'];
  assaultOrbit?: boolean;
  assaultAura?: boolean;
  hive?: Actor['hivecallHud'];
  thr?: Record<string, number>; // host-authored full roster counts
  tw?: string;                 // throngWild husk kind (per-viewer sight gate)
  /** THE GRAB FABRIC's held-meter row, host-computed on the HELD body
   *  ([verb label, struggle 0..1] — the boss-bar idiom; clients hold no
   *  pair state). Everyone reads the same bar: victim, holder, rescuers. */
  gb?: [string, number];
  pl?: number;                 // plies remaining (THE PLY FABRIC pips)
  plm?: number;                // plies ceiling (omit both when the fabric is off)
  /** THE TELL FABRIC's quantized values (engine/tells.ts), host-swept —
   *  the DERIVED scalars, never the source state (drives/morale live only
   *  in the host's brains). Omitted when every reading is 0: the client
   *  materializes zeros and the dress is identical. */
  tl?: number[];
  /** Rolled brainVariants index — the client rebuilds the same variant
   *  tell rows from its own def registry (tellSpecsOf). */
  bv?: number;
  /** THE PACK LAYER's bond holder (engine/pack.ts): the HOST id of the body
   *  currently empowering this one. Absent = no bond worn. The client
   *  re-points it at its own pooled shell, then derives the same link list
   *  the host draws — over live positions, so lines track moving bodies. */
  bl?: number;
  /** THE WATCH FABRIC's drawn read (engine/watch.ts), host-stamped —
   *  [reach base, arc half-angle (rad, 3dp), rear fraction (3dp),
   *  alerted 0|1, ladder value (3dp)]. DERIVED scalars in the tell wire's
   *  own idiom: the client re-folds the same fan from the same numbers
   *  (its own hero's detectability/stealth fold locally) — suspicion
   *  sources never cross the wire. Omitted until the first scan stamps. */
  wp?: [number, number, number, number, number];
  tr?: number;                 // THE TIER FABRIC: walkable layer (omit at 0)
  aims?: false;                // Actor.aims=false (no aim tick) — omit when it aims
  wn?: number;                 // waning presence pulse, 0..1 (omit when 0)
  inv?: number;                // sheet invisible (omit when 0)
  concealment?: number;
  concealmentExposedUntil?: number;
  det?: number;                // sheet detectability (omit when 1)
  seat?: string;               // player-seat id (own-hero + party identity)
  adorn?: ActorAdorn;
  /** Surface material (render bake key) — the client skins bodies identically. */
  mat?: string;
  /** Part-grammar look id — same reason. */
  lk?: string;
  /** Runtime tack (Actor.extraParts — the tamed collar): render-only parts
   *  worn over the body; the client bakes them identically. */
  ep?: PartSpec[];
  rarity?: string;
  magicPack?: import('../engine/magicPacks').MagicPackState;
  magicPackFrom?: number;
  magicPackPower?: number;
  magicPackRole?: Actor['magicPackRole'];
  magicPackDonors?: number;
  magicPackPending?: number;
  defId?: string;
  cosmeticSourceSkill?: string; // resolved cosmeticSummonSkill; no skill instance or combat payload
  ss?: Actor['summonShell'];
  sg?: Actor['shellGuard'];
  pb?: true; // persistent broken-poise cue, cleared on rearm/removal
  faction?: string;
  /** THE BOSS BAR row, host-computed (World.bossBarInfo — clients have no
   *  brain to derive pips from): [pips, lit, highlight]. Present only while
   *  this body owns the top-center bar. */
  bb?: [number, number, number];
  /** INVOCATION RUNES (players only, while banked) — the client's own bar
   *  draws the woven sequence the host is holding for it. */
  rn?: string[];
  /** THE PRIMED POUR's banked sips (players, while held) — the SKILL IDS
   *  only (the runes idiom: one derived label per hotbar glint;
   *  chargesSpent and the release live host-side, host-authoritative). */
  pp?: string[];
  /** Host-owned flask ammunition for the remote hotbar. */
  fq?: Record<string, number>;
  /** COMBO GRAMMAR chips, host-computed like the boss bar (clients hold no
   *  ring): per equipped rule [id, lit, len, glow]. Players only. */
  cb?: [string, number, number, number][];
  /** Native condition progress and remaining active seconds, host resolved. */
  cc?: [ComboConditionId, number, number, number][];
  /** THE MIMIC BANK (players only, while filled — engine/mimic.ts): the
   *  captured arts as [skillId, sourceMonsterId] pairs, oldest first, plus
   *  the selection. The client's own build flap/bar draws the chips; the
   *  bank itself only ever fills host-side through the capture gates. */
  mk?: [string, string][];
  ms?: string;
  // --- FX (all omitted when absent → renderer skips them gracefully) ---
  ab?: number;                 // absorb pool (white bar)
  st?: StatusW[];              // active statuses (pips + screen ailment FX)
  cast?: CastW;                // cast bar + guard arc
  auras?: AuraW[];             // emanating aura fields
  con?: { kind: string; domeRadius?: number };  // construct (dome bubble)
  fuse?: number;               // armed bomber fuse
  leap?: { timer: number; total: number; vent?: number;  // airborne leap (body swell; `vent` = the vent-ride's column radius: the steam jet draws)
    /** THE WIRE'S EYES: a TELEGRAPHED dive's landing ring (LeapDelivery.telegraph): where it
     *  lands, how wide, and the ring's color. Absent on an untelegraphed leap (nothing draws). */
    dest?: Vec2W; radius?: number; telegraph?: string; };
  /** Snake/worm trailing segments. SEGMENT-FABRIC extras ride only when
   *  live (bosses, briefly): `ht` = hittable chain (solid draw + hitbox
   *  overlay truth), `wd` = torn-segment bitmask (torn draws/tests smaller),
   *  `sf` = per-segment flash countdowns. Kit-part looks are NOT shipped —
   *  the client re-resolves them from MONSTERS[defId].worm.looks. */
  worm?: { seg: Vec2W[]; taper: number; ht?: 1; wd?: number; sf?: number[] };
}

/** `bk` = THE BANK READ (StatusDef.bank — ActiveStatus.bankFrac, 0..1 at
 *  two decimals): the derived scalar the body FX scale by (the tells-wire
 *  idiom — never the bank's source numbers). Absent = no bank worn. */
export interface StatusW { id: string; stacks: number; bk?: number; dot?: 1; rem?: number; statusDuration?: number; }
export interface AuraW { c: string; r: number; sh: number; }
/** A cast in progress — the few fields the renderer's cast bar + guard arc read. */
export interface CastW { parryCue?: number;
  meleeReach?: import('../engine/meleeReach').MeleeReachCue;
  castingCompletion?: number;
  castingCue?: import('../engine/castingCues').CastingCue;
  focusBroken?: boolean;
  guardReleaseCue?: import('../engine/warningCues').GuardReleaseCue;
  c: string; mode: string; total: number; elapsed: number;
  pulseTimer?: number; shield?: number; maxShield?: number;
  indicatorAt?: number; presses?: number; channelTime?: number;
  guardArc?: number;           // resolved guard coverage in degrees (mode === 'guard')
  /** Guard bash tic: live arming line + inverted contract (mode 'guard'). */
  bashAt?: number; bashLow?: boolean;
  /** THE ARM CLOCK (held seconds before the bash may convert): with the
   *  shipped channelTime the client re-folds guardBashReady exactly as the
   *  host did — the arm meter and the readied gold agree across the wire. */
  bashArmAt?: number;
  /** THE VENT-RIDE's broil (LeapDelivery.vent): the column radius a casting
   *  vent-leaper will erupt at take-off — the client draws the same roil
   *  under the caster's feet (render/vis/ventRideLayer.ts). */
  vent?: number;
  /** THE SMOOTH SHELL: a seated hero's cast names its skill, so the shell's own hero
   *  casts its real instance (its replay walks a mobile cast, a guard or a channel at the
   *  host's factor) and THE PREDICTED ROOT reconciles against it. Players' rows only. */
  sk?: string;
}

/** `a` = flight age (sim seconds): the deterministic phase clock the form
 *  painters roll on (wave crest, square tumble) — client and host draw the
 *  same curve the host's hit test sampled. */
export interface ProjW { reflectedCue?: true; orbPaint?: import('../engine/skills').OrbPaint; cosmeticProjectile?: string; cosmeticMotif?: CosmeticMotif; p: Vec2W; d: number; r: number; c: string; sh: string; a: number;
  /** THE WIRE'S EYES: the flight's stable wire id (the client glides a flight it saw before
   *  by id) and its velocity in px/s (the displacement since the host's last snapshot, the
   *  heading times speed at birth), which a late snapshot's flight extrapolates along. */
  id?: number; v?: Vec2W; }
/** A tether band, RENDER-ONLY on the client (the host owns the damage ticks). `ai`/`bi` =
 *  THE WIRE'S EYES: the endpoint bodies' host ids (the `bl` idiom), so the client's band
 *  follows its own interpolated bodies; the coords stand in for an endpoint it lacks. */
export interface TetherW { ax: number; ay: number; bx: number; by: number; c: string; w: number; ai?: number; bi?: number; }
export interface DropW { p: Vec2W; bob: number; kind: 'skill' | 'support' | 'gear' | 'vestige' | 'essence' | 'abilityEssence'; color: string; rarity?: string; name?: string; baseId?: string; dropUid?: number; vid?: string; eid?: string; tid?: number; cnt?: number; }
/** kind is an ORB_DEFS registry id — the client renders from the registry. */
export interface OrbW { p: Vec2W; bob: number; life: number; kind: string; }
export interface TextW { p: Vec2W; life: number; maxLife: number; size: number; color: string; text: string;
  /** INFO-STREAM float kind — ships so each CLIENT gates the draw by its own
   *  Settings.floatKinds (the host mints one truth; every seat curates). */
  k?: string;
  /** Reward feedback uses each client's visible-combat clearance. */
  yieldToCombat?: boolean;
  /** Optional exact gear identity for duplicate announcement curation. */
  dropUid?: number;
  /** THE WIRE'S EYES: the owner seat of a damage or heal number (the striker's or healer's
   *  credited seat, its owner chain's root), so a hosted client draws all, its party's or
   *  its own (Settings.floatOwners). Absent on every other float, which always draws. */
  o?: string; }
/** A notice-feed line (screen-anchored world news) — the client filters by
 *  its own channel mutes and draws at its own anchor/duration. */
export interface NoticeW { text: string; color: string; size: number; ch: string; born: number; }
/** A pickup-feed row — `s` is the owning seat id; each client lists only its
 *  own seat's rows on its flank. */
export interface PickupW { s: string; l: string; c: string; n: number; born: number; }
/** THE EFFECT VOICE ON THE WIRE (the tell-wire idiom): `fx` is a registry
 *  KIND — the client rebuilds the painter from its OWN effectVoice registry,
 *  never from shipped draw state — and `bolt`/`meteor` carry the lightning/
 *  demon-sky flags so those skies stop landing generic on remote seats. All
 *  three absent (an old host, an unkeyed flash) = the classic ring, byte-
 *  identical to the pre-wire client. Other flash costumes (beam, haze, arc,
 *  shapes) remain deliberately unshipped — MVP fidelity, renderer-guarded. */
export interface FlashW { combatCue?: import('../engine/combatCues').CombatCue; defenseCue?: import('../engine/defenseCues').DefenseCue; cosmeticMotif?: CosmeticMotif; p: Vec2W; radius: number; color: string; life: number; maxLife: number;
  feedingCue?: import('../engine/feedingCues').FeedingTransfer;
  companionCue?: import('../engine/companionCues').CompanionCueFlash;
  recoveryCueTier?: number;
  fx?: string; bolt?: boolean; meteor?: boolean; departure?: RefugeDeparture; }
/** A death-burst telegraph (coalesce gather → tracking orb). RENDER-ONLY: the client
 *  never simulates these (homing is host-authoritative via nearestSeatPos over the seats);
 *  it just draws the host's state so the remote seat gets the same escape window. Carries
 *  only the fields drawDeathBursts reads — phase/t/coalesce/radius/color/pos/arming/trail
 *  + team (`tm`: THE SPARED RING softens command cues for the team a burst cannot hurt).
 *  `tm` is optional on the wire: absent — an old host — the client row's team stays
 *  undefined and the ring draws classic full-strength, never a false "safe". */
export interface DeathBurstW { p: Vec2W; ph: 0 | 1; r: number; c: string; arm: 0 | 1; t: number; co: number; trail: Vec2W[]; tm?: Team; }

/** THE WIRE'S EYES: one ground telegraph or lingering field (World.zones) as the
 *  renderer's zone pass and the hotbar read it, never its gameplay state (no damage,
 *  victims, clocks of ticks or domains cross). Sparse: every optional row is absent
 *  in its common case. Rebuilt as render stubs by applySnapshot (the cast-stub idiom). */
export interface ZoneW {
  /** The zone's wire id (stable for its life): the client glides p/r/f/fill by it. */
  id: number;
  p: Vec2W; r: number; c: string;
  /** AoeShape (absent = the circle) and, for a faced shape, its facing (rad) and arc. */
  sh?: number; f?: number; arc?: number;
  /** Exploded: the live field. Absent = the telegraph, whose countdown `fill` (0..1) rises. */
  ex?: 1; fill?: number;
  /** The field's story (Zone.tier, else its caster's); absent = 0. */
  tier?: number;
  /** THE GROUNDED STRIKE's named grounds (telegraph only: the roil draws on those cells). */
  og?: string[];
  /** A FISSURE segment [ax, ay, bx, by]; `sa` = armed now (aftershock ready / roulette
   *  armed), `sv` = volatile: the crack's two lit faces (live fields only). */
  seg?: [number, number, number, number]; sa?: 1; sv?: 1;
  /** The EDGE BAND's safe eye (telegraph) and the fill-in cage's closing edge (live field). */
  ef?: number; ed?: number;
  /** A LOBBED SHOT's launch point and apex factor (the incoming comet across the countdown). */
  lf?: Vec2W; la?: number;
  /** An ARMED PULSE's next beat: [seconds to it at this snapshot, radiusMult]. */
  pr?: [number, number];
  /** A field that RIDES a body (follow / anchor): its host id, so the stub sits on it. */
  ri?: number;
  /** A seated hero's own field, for its hotbar: caster host id, skill id, toggled. */
  ci?: number; sk?: string; tg?: 1;
}

/** Per-seat camera + HUD anchor (broadcast for all seats; each client reads its own). */
export interface SeatW {
  pos: Vec2W;
  life: number; maxLife: number; mana: number; maxMana: number; es: number; maxEs: number;
  dead: boolean; downed: boolean;
  /** THE WIRE'S EYES, THE OWN ENTRY (SEAT_OWN_ROWS): the seat's running cooldowns as
   *  skill id -> [remaining, total] on WIRE_CFG.eyes.clockGrid; absent = none running. */
  cd?: Record<string, [number, number]>;
  /** THE WIRE'S EYES, THE OWN ENTRY: the bar's gauge banks as skill id -> [fill 0..1
   *  (floored, 2dp), locked 0|1, ready 0|1]; absent = every bank empty and open. */
  gg?: Record<string, [number, 0 | 1, 0 | 1]>;
  /** THE ACTING SEAT, THE OWN ENTRY (SEAT_OWN_ROWS): the seat's newest refusal note (text +
   *  host world time); its client floats it once over its own head (net/seatView.ts). */
  fn?: { text: string; at: number };
  /** THE ACTING SEAT, THE OWN ENTRY: seconds left on the seat's hit-while-low surge (its
   *  client's own low-life glow reads it). */
  lh?: number;
  /** THE COUNTERS AND THE JOURNAL, THE OWN ENTRY (net/journalWire.ts): the seat's journal
   *  row (its quests, offers, rewards, pins and boards) on a change and on the beat; absent =
   *  unchanged. Hosted worlds alone. */
  jn?: JournalW;
  /** THE COUNTERS AND THE JOURNAL, THE OWN ENTRY: the seat's harvest view while it stands
   *  near a node or works a rite; absent = none. Hosted worlds alone. */
  hv?: HarvestW;
  /** THE SHELF PER BUYER, THE OWN ENTRY (card 29 ruled): the buyer's own shelf at Brandt's
   *  counter, its restock mark and its reserve capacity, on a change and on THE SHELF BEAT
   *  (the root vendor rows' own grammar, per buyer); absent = unchanged. Hosted worlds alone. */
  vd?: ShelfW;
  /** THE ROADS PER PLAYER, THE OWN ENTRY (engine/shardRoads.ts roadDwellRow): the road dwell
   *  the host is filling for this seat, [x, y, fill 0..1 (floored, 2dp), transit kind], so its
   *  client draws the ring the host fills (World.netRoadDwell); absent = none. Hosted worlds alone. */
  rd?: [number, number, number, string];
  /** Movement-PREDICTION fields: `seq` = the last input the host applied for this
   *  seat (the client replays its unacked inputs forward from `pos`); `rooted` =
   *  the host has this hero movement-locked (so the client stops predicting forward);
   *  `slippery` = low-traction ground (ice) whose momentum physics the client can't
   *  reproduce — so it anchors to the authoritative pos instead of predicting. */
  seq?: number;
  rooted?: boolean;
  slippery?: boolean;
  /** THE HONEST INPUT (docs/engine/shard.md): the seat's walk speed, the fold its
   *  moveActor walks (Actor.walkSpeed: the moveSpeed stat with its status sources);
   *  a client's own hero predicts at it (World.ownWalk). It rides a WALKING seat's row
   *  (HONEST_INPUT_CFG.walkRowSec): absent, the shell keeps the fold it last heard. */
  spd?: number;
  /** THE HONEST INPUT: the seat's traction (Actor.walkTraction), beside spd; absent = 1, firm. */
  trc?: number;
  /** Environmental-survival meters (breath, light) — only rows BELOW max ride
   *  (the HUD hides full meters, and most frames most seats carry none). The
   *  client rebuilds its own hero's Actor.survival map from this so the
   *  registry-driven survival bars draw exactly as on the host. */
  survival?: Record<string, number>;
}

// --- per-seat META wire (Layer 2: the build/progression the client UI reads) ---
// JSON-safe replicas — NEVER ship def bodies (a SkillDef is huge); ship def IDS
// + level/sockets/rarity and rehydrate via the SKILLS/SUPPORTS catalogs on apply.
// Sent only when a seat's meta CHANGES (dirty-flagged), so it's nearly free.
/** `lk` = THE KEEPER'S MARK (salvageLock) — 1 when the gem is locked, absent
 *  otherwise (the derived-bit idiom; the client renders 🔒 and computes its
 *  toggle asks from it — the host stays the authority). */
export interface SupportInstW { id: string; lvl: number; lk?: 1; }
/** `tn` = THE SKILL-MODE TREE picks (spent node ids, spend order) — absent
 *  when unpicked (the sparse idiom); the client rehydrates through
 *  validTreeNodes so its tooltip/pip/panel read the same truth the host
 *  spends (orphans from a version-skewed host drop with a note). */
export interface SkillInstW { id: string; lvl: number; rarity?: string; sockets: (SupportInstW | null)[]; mark?: { x: number; y: number } | null; g?: boolean; lk?: 1; tn?: string[]; rp?: 1; triggerOff?: boolean; empowermentRank?: number; }
/** The client OWN-seat build: enough to render the char-sheet / skill-book / tree
 *  and re-derive the stat sheet (recalcSeat) on the client. */
export interface SeatMetaW {
  level: number;
  xp: number; xpNeeded: number;
  passivePoints: number;
  vocationPoints: number;
  vocations: string[];              // granted vocations (center-tree render + gates)
  baseAttrs: Attributes;            // recalcSeat derives `attrs` from this + allocated
  allocated: string[];              // passive node ids
  /** Choice-node picks by node id (optional → tolerant of an older host). */
  choices?: Record<string, string[]>;
  /** Realm-currency wallet + graft bindings (optional, same tolerance). */
  realmPoints?: Record<string, number>;
  grafts?: Record<string, string | null>;
  known: Record<string, SkillInstW>;
  // THE RESIDENCE (skill-items M1): loose gems ride `gear.items` as their
  // 1×1 wrapper items (pure JSON, payload included) — the old inv/skillInv
  // arms retired with the side arrays they mirrored.
  bar: (string | null)[];          // bar slot → learned skill id
  /** THE STAMPED OPENING (PlayerMeta.opening) — the client's starter strip
   *  reads it; the hatch itself is host-judged. Optional → a host one
   *  wire-version behind ships the class's base bar. */
  op?: (string | null)[];
  /** THE COMPANION STANCES (PlayerMeta.stances) — the client's meta button
   *  wears the current stance off it; the shift itself is host-judged.
   *  Optional → a host one wire-version behind ships the default. */
  st?: Record<string, string>;
  /** GEAR: bag + doll. ItemInstances are already pure JSON (ids + rolls —
   *  never def bodies), so the instance IS the wire shape; rebuildItem
   *  re-validates against the client's registries on apply. Optional →
   *  tolerant of a host one wire-version behind. */
  gear?: {
    items: ItemInstance[]; equipped: Record<string, ItemInstance>;
    /** THE CONTAINER FABRIC (engine/containers.ts): seated pieces by board
     *  id, seat cells included. Optional → a host one wire-version behind
     *  ships bare boards. */
    containers?: Record<string, ItemInstance[]>;
    relicEmpowerment?: number;
    relicEnabled?: boolean;
  };
  /** Essence wallet (salvage currency), per essence id. */
  ess?: Record<string, number>;
  /** Ability Essence wallet (skill food), per tier id. */
  abil?: Record<string, number>;
  /** Vestige wallet (socket material), per vestige id. */
  vest?: Record<string, number>;
  /** THE ECHO LAW (net/shell.ts, docs/engine/shard.md THE SMOOTH SHELL): the newest client
   *  action seq the host has judged for this seat (applied, refused or dropped alike); a
   *  shell holds its optimistic state against any build older than its own newest action.
   *  Absent = the host has judged none (and every lane that sends no seq). */
  as?: number;
}

const supW = (s: SupportInstance): SupportInstW =>
  ({ id: s.def.id, lvl: s.level, lk: s.locked ? 1 : undefined });
const skillInstW = (s: SkillInstance): SkillInstW => ({
  empowermentRank: empowermentRank(s) || undefined,
  id: s.def.id, lvl: s.level, rarity: s.rarity,
  sockets: s.sockets.map(x => (x ? supW(x) : null)),
  mark: s.state?.markPos ?? undefined,
  g: s.granted || undefined,
  lk: s.locked ? 1 : undefined,
  tn: s.treeNodes?.length ? [...s.treeNodes] : undefined,
  rp: s.replenishmentPaused ? 1 : undefined,
  triggerOff: s.state?.triggerOff,
});

/** THE ECHO LAW (host side): the newest client action seq judged per seat. Noted by the
 *  host's action drain (the shard's and main.ts's WebRTC host's) for every queued action of a
 *  standing seat, whatever the action did, and shipped on that seat's build (SeatMetaW.as). */
const ACTION_ECHOES = new WeakMap<Seat, number>();
/** THE ECHO LAW: the host judged this seat's action `seq` (marks the seat's build dirty, so
 *  the echo rides the very next snapshot). A seq that is not a whole number is no echo. */
export function noteActionEcho(world: World, seat: Seat, seq: unknown): void {
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0) return;
  ACTION_ECHOES.set(seat, Math.max(seq, ACTION_ECHOES.get(seat) ?? 0));
  world.markMetaDirty(seat);
}
/** THE ECHO LAW: a resumed seat's new shell counts its actions from zero again. */
export function resetActionEcho(seat: Seat): void { ACTION_ECHOES.delete(seat); }

/** Host: serialize one seat's build/progression for its owning client.
 *  Level + bar read the HERO body (the possession seam, engine/possess.ts):
 *  a seat riding a borrowed body still ships ITS OWN build — the char
 *  sheet never wears a monster's level. */
export function serializeSeatMeta(seat: Seat): SeatMetaW {
  const m = seat.meta;
  const hero = seat.home ?? seat.actor;
  return {
    level: hero.level,
    xp: m.xp, xpNeeded: m.xpNeeded,
    passivePoints: m.passivePoints,
    vocationPoints: m.vocationPoints,
    vocations: [...m.vocations],
    baseAttrs: { ...m.baseAttrs },
    allocated: [...m.allocated],
    choices: Object.fromEntries(Object.entries(m.choices).map(([k, v]) => [k, [...v]])),
    realmPoints: { ...m.realmPoints },
    grafts: { ...m.grafts },
    known: Object.fromEntries([...m.knownSkills].map(([id, inst]) => [id, skillInstW(inst)])),
    bar: hero.skills.map(s => (s ? s.def.id : null)),
    op: [...m.opening],
    st: { ...m.stances },
    gear: {
      relicEmpowerment: m.relicEmpowerment ?? 0,
      relicEnabled: m.relicEnabled !== false,
      items: m.items.map(i => ({ ...i })),
      equipped: Object.fromEntries(
        Object.entries(m.equipped).flatMap(([k, v]) => (v ? [[k, { ...v }] as const] : [])),
      ),
      containers: Object.fromEntries(
        Object.entries(m.containers).map(([id, held]) => [id, held.map(i => ({ ...i }))]),
      ),
    },
    ess: { ...m.essences },
    abil: { ...m.abilityEssences },
    vest: { ...m.vestiges },
    ...(ACTION_ECHOES.has(seat) ? { as: ACTION_ECHOES.get(seat)! } : {}), // THE ECHO LAW
  };
}

const rehydrateSupport = (w: SupportInstW): SupportInstance | null => {
  const def = SUPPORTS[w.id];
  return def ? { def, level: w.lvl, ...(w.lk ? { locked: true } : {}) } : null;
};
const rehydrateSkill = (w: SkillInstW): SkillInstance | null => {
  const def = SKILLS[w.id];
  if (!def) return null;
  const inst = makeSkillInstance(def, w.lvl, w.sockets.length);
  inst.rarity = w.rarity as SkillRarity | undefined;
  if (empowermentRank(w)) inst.empowermentRank = empowermentRank(w);
  inst.sockets = w.sockets.map(s => (s ? rehydrateSupport(s) : null));
  if (w.mark) inst.state = { markPos: w.mark };
  if (w.g) inst.granted = true;
  if (w.lk) inst.locked = true; // the keeper's mark (salvageLock)
  // Untrusted wire → the one validation seam (structure + budget), so the
  // client's panels can never render a state the host would refuse.
  if (w.tn?.length) inst.treeNodes = validTreeNodes(def, w.tn, w.lvl, inst);
  if (typeof w.triggerOff === 'boolean') (inst.state ??= {}).triggerOff = w.triggerOff;
  if (w.rp === 1 && replenishingDelivery(inst)?.replenish?.toggle) inst.replenishmentPaused = true;
  return inst;
};

// --- vendor stock wire (shared, not per-seat) -------------------------------
// Brandt's wares live on the host's world and the client never ticks the sim, so
// its local stock would diverge — and a buyVendor intent addresses stock by INDEX.
// Replicate the host's stock so the client renders the authoritative list + its
// indices line up. Reuses the skill/support instance wire shapes (defId only).
export type VendorEntryW = (
  | { kind: 'skill'; s: SkillInstW }
  | { kind: 'support'; g: SupportInstW }
  // Rolled GEAR rides as the full instance (already pure JSON — the same
  // stance as seat gear); rebuildItem re-validates on the client.
  | { kind: 'item'; i: ItemInstance }
) & {
  /** THE PATRON'S HOLD, on the wire: 1 = reserved row, 2 = the standing
   *  order's find. Rides ON the entry (never a parallel array — a row that
   *  fails rehydrate must take its flag down with it). */
  lk?: 1 | 2;
};

const vendorEntryW = (e: VendorEntry, world: World): VendorEntryW => {
  const base: VendorEntryW =
    e.kind === 'skill' ? { kind: 'skill', s: skillInstW(e.inst) }
      : e.kind === 'support' ? { kind: 'support', g: supW(e.gem) }
      : { kind: 'item', i: { ...e.item } };
  const row = world.vendorEntryHold('brandt', e);
  if (row) base.lk = row.commission ? 2 : 1;
  return base;
};

const rehydrateVendor = (w: VendorEntryW): VendorEntry | null => {
  if (w.kind === 'skill') { const inst = rehydrateSkill(w.s); return inst ? { kind: 'skill', inst } : null; }
  if (w.kind === 'item') { const item = rebuildItem(w.i); return item ? { kind: 'item', item } : null; }
  const gem = rehydrateSupport(w.g); return gem ? { kind: 'support', gem } : null;
};

/** Client: graft a replicated build onto a seat's meta + re-derive the stat sheet.
 *  recalcSeat installs the build's stat SOURCES over the actor's clean STAT_DEFS
 *  base — so maxLife()/maxMana()/derived stats match the host bit-for-bit, AS LONG
 *  AS the per-frame apply NEVER setBase's those for the local hero (it doesn't). */
export function applySeatMeta(world: World, seat: Seat, w: SeatMetaW): void {
  const m = seat.meta;
  seat.actor.level = w.level;
  m.xp = w.xp; m.xpNeeded = w.xpNeeded;
  m.passivePoints = w.passivePoints;
  // Tolerant of a host one wire-version behind (fields absent from old JSON).
  m.vocationPoints = w.vocationPoints ?? 0;
  m.vocations = [...(w.vocations ?? [])];
  m.baseAttrs = { ...w.baseAttrs };
  m.allocated = new Set(w.allocated);
  // Untrusted wire → the same registry-tolerant rebuild the disk save gets.
  m.choices = sanitizeChoices(w.choices, PASSIVE_NODES, m.allocated);
  m.realmPoints = { ...(w.realmPoints ?? {}) };
  const known = new Map<string, SkillInstance>();
  for (const [id, sw] of Object.entries(w.known)) { const inst = rehydrateSkill(sw); if (inst) known.set(id, inst); }
  m.knownSkills = known;
  // Graft bindings resolve against the freshly rehydrated book + allocation.
  m.grafts = sanitizeGrafts(w.grafts, m.allocated, m.choices, PASSIVE_NODES, id => known.has(id));
  // THE ONE BAG: gear tiles and gem wrappers alike — re-validate every
  // instance (payloads included) against the client's live registries.
  m.items = (w.gear?.items ?? []).map(rebuildAnyItem).filter((x): x is ItemInstance => !!x);
  m.equipped = {};
  for (const [slot, it] of Object.entries(w.gear?.equipped ?? {})) {
    const item = rebuildItem(it);
    if (item) m.equipped[slot] = item;
  }
  // THE CONTAINER FABRIC: every board's seated pieces, re-validated like
  // the doll's (a client whose registry lacks a board keeps the rows — the
  // host is the authority on what sits where).
  m.relicEmpowerment = Number.isFinite(w.gear?.relicEmpowerment) ? Math.max(0, w.gear!.relicEmpowerment!) : 0;
  m.relicEnabled = w.gear?.relicEnabled !== false;
  m.containers = {};
  for (const [cid, held] of Object.entries(w.gear?.containers ?? {})) {
    m.containers[cid] = (held ?? []).map(rebuildItem).filter((x): x is ItemInstance => !!x);
  }
  m.essences = { ...emptyEssences(), ...(w.ess ?? {}) };
  m.abilityEssences = { ...emptyAbilityEssences(), ...(w.abil ?? {}) };
  m.vestiges = { ...(w.vest ?? {}) };
  // Rebuild the action bar from slot ids → the (just-rehydrated) learned
  // instances, or the GRANTED lane (seatSkillById mints a worn grant on
  // demand off the rehydrated gear — THE LEGEND FABRIC), so the client's
  // bar seats a granted skill exactly where the host's does.
  seat.actor.skills = w.bar.map(id => (id ? world.seatSkillById(seat, id) : null));
  // THE STAMPED OPENING: the host's stamp verbatim (an older host ships none —
  // the class's base bar stands in, the pre-stamp reading).
  m.opening = [...(w.op ?? m.classDef.bar)];
  // THE COMPANION STANCES: the host's held choices, registry-sanitized (an
  // older host ships none — every bond reads the default).
  m.stances = sanitizeCompanionStances(w.st);
  world.recalcSeat(seat);            // derive attrs + the full stat sheet from the build
}

/** The full render-state replace a client draws each frame. */
export interface StateSnapshot {
  satellites?: import('../engine/satellites').SatelliteVisual[];
  guardArts?: import('../engine/guardArts').GuardArtVisual[];
  satelliteFlights?: import('../engine/satelliteFlights').SatelliteFlightVisual[];
  auroras?: import('../engine/auroras').AuroraVisual[];
  guardians?: import('../engine/guardians').GuardianVisual[];
  creepers?: import('../engine/creepers').CreeperVisual[];
  magicPackEffects?: import('../engine/magicPackMechanics').MagicPackVisual[];
  /** Per-owner terrain grants: replicas draw exactly the host's circles. */
  grantedPockets?: { owner: number; pockets: import('../engine/fieldgrants').GrantedPocket[] }[];
  tick: number;
  time: number;
  zoneId: string;
  arena: { w: number; h: number };
  seats: Record<string, SeatW>;
  /** THE PARTY (net/partyWire.ts): every party's composition — ids only, a few bytes — on EVERY
   *  snapshot of a hosted world (a client that applies only the newest of a queue must never
   *  miss a change; absent = not a hosted world). */
  parties?: import('./partyWire').PartyRow[];
  /** THE PING (card 17 A, engine/pings.ts): the live marks — present on every snapshot of a hosted
   *  world (the host's list is the truth each beat; a client expires them on the clock it follows). */
  pings?: PingW[];
  /** Per-seat build/progression — present ONLY for seats whose meta CHANGED since
   *  the last broadcast (dirty-flagged), so it rides along cheaply. Each client
   *  applies its OWN entry (snap.seatMeta[clientSeatId]). THE OWN META: a shard
   *  ships each socket its own seat's entry alone (ownEntryView), so the key is
   *  absent on a socket whose seat carries none on that snapshot. */
  seatMeta?: Record<string, SeatMetaW>;
  /** Brandt's shared vendor stock (host-authoritative) + its restock clock — so a
   *  client renders the SAME list the host will resolve a buyVendor index against.
   *  THE SHELF BEAT (WIRE_CFG.vendorBeat): the three vendor rows ride together, on a
   *  change and on the beat; absent = unchanged (the client keeps the last it saw). */
  vendor?: VendorEntryW[];
  vendorRestockAt?: number;
  /** The HOST account's reserve capacity (World.vendorLockCap) — the client
   *  panel draws toggles against the counter's true ledger, not its own. */
  vendorCap?: number;
  memoryAccess?: import('../meta/memoryUnlocks').MemoryAccess;
  /** THE KEEPER'S GATE, mirrored (World.vendorTradeRefusal === null /
   *  vendorGemsOpen): the host's trade-gate + gem-case verdicts, so a client
   *  panel disables and seals with the keeper's own truth. Absent (older
   *  host) reads as open. */
  vendorTradeOpen?: boolean;
  vendorGemsOpen?: boolean;
  /** THE BAG BOARD, shipped: the keeper's bag dims (engine/inventory.ts
   *  bagBoard — base + the host account's expansions), so a client draws
   *  and tests the board the host places on. Absent (older host) = base. */
  bagBoard?: { w: number; h: number };
  /** THE CONTAINER BOARDS, shipped (engine/containers.ts packContainerBoard):
   *  the keeper's live fold per owned side board — a board absent here does
   *  not exist for the run. Absent whole (older host) = no containers. */
  containerBoards?: Record<string, ContainerBoardW>;
  actors: ActorW[];
  projectiles: ProjW[];
  tethers: TetherW[];
  /** THE WIRE'S EYES: the ground telegraphs and lingering fields near a seated player, as
   *  the zone painter reads them (ZoneW); absent = none stand. Render stubs on the client. */
  zones?: ZoneW[];
  drops: DropW[];
  townPortalViews?: import('../engine/townportal').TownPortalView[];
  orbs: OrbW[];
  texts: TextW[];
  /** THE NOTICE FEED + PICKUP FEED (world/bulletins.ts) — absent from older
   *  hosts reads as empty (the client simply has no news to stack). */
  no?: NoticeW[];
  pfd?: PickupW[];
  flashes: FlashW[];
  recoveryCues?: import('../engine/world').EmergeRecord[];
  /** THE EYECATCH (engine/ultimates.ts) — the live super-art pane, shipped
   *  as ELAPSED seconds (`el`) so client clocks need no shared epoch: the
   *  client re-stamps t0 against its own timeflow age (the tell-wire idiom
   *  — derived scalars, the pane rebuilt from the client's own registry).
   *  Absent = no pane (older hosts read as none). */
  ec?: {
    ci: number; sk: string; st: string; ti: string; sb?: string;
    tn: string; sd: 'ally' | 'enemy'; el: number; ps: number; av?: string;
  };
  deathBursts: DeathBurstW[];
  /** Structure-door states (id → open/broken), present only when any door has
   *  flipped — rides the 20 Hz snapshot so a dropped packet SELF-HEALS on the
   *  next one (the meta-delta lesson: a one-shot door msg is a permanent
   *  desync when the channel hiccups). Clients apply via the shared
   *  setDoorState path (their own grid repaint included). */
  doors?: Record<string, 'open' | 'broken'>;
  /** Opened SECRET HOLLOWS (the hollows fabric) — the same meta-delta lesson
   *  as doors: the 20 Hz repeat converges a client that missed the reveal
   *  (openHollow is idempotent, applied in bare mode: carve + seam splice;
   *  the contents ride the host's own streams). */
  hollows?: string[];
  /** Revealed ANNEX pieces (the composite bound) — the hollows row's twin:
   *  the 20 Hz repeat converges a client that missed a reveal (annexReveal
   *  is idempotent; the geometry shipped with the zone message). */
  annexes?: string[];
  /** LIVE POOLED LIGHTWELLS (engine/lightwells.ts): runtime-spawned light
   *  sources with per-tick power (dim) state. They never ride the one-shot
   *  zone doodad list — this 20 Hz reconcile IS their client existence
   *  (upsert by id, absent = dissipated; the gutter-out flash rides the
   *  ordinary flash stream). Present only while any pooled well stands. */
  wells?: WellW[];
  titans?: TitanScenePiece[];
  /** The current zone's eased GLOOM (the Gloaming) — the client's ambient
   *  darkness, wash, and zone-info read it off the world exactly as the
   *  host's renderer does. Present only while > 0. */
  gloom?: number;
  /** RUNTIME LANE STATE (the track fabric's trapworks levers). `laneArm` =
   *  the complete tag→armed map whenever any TAGGED lane stands (both-ways
   *  toggles need the full map — a reverted flip must still converge);
   *  `laneOnce` = every live ONCE-lane's spec (the loosed boulder, the
   *  volley in flight) — the wells idiom: this 20 Hz reconcile IS their
   *  client existence, absence culls, a dropped packet self-heals. */
  laneArm?: Record<string, 0 | 1>;
  laneOnce?: TrackSpec[];
  /** TRAPWORK states (engine/trapworks.ts): id + armed/sprung + spring
   *  clock, shipped while any mechanism stands — the same idempotent 20 Hz
   *  convergence; an armed→sprung edge replays each effect's MIRROR half
   *  client-side (visuals only; lanes ride laneArm/laneOnce). */
  trapState?: { i: string; s: 0 | 1; t: number }[];
  /** THE LITE TIER's pool draw list (engine/lite.ts): `k` = kind table
   *  (MonsterDef ids), `b` = flat (kindIdx, x, y) triples. Present only
   *  while the host's pool holds bodies; the client renders it verbatim
   *  (World.liteWire) — host-authoritative, self-healing at 20 Hz. */
  lt?: { k: string[]; b: number[] };
  /** THE RAMPAGE FABRIC's felled set (engine/rampage.ts): position-keyed
   *  (doodad positions are seed-shared and immutable — splice-proof where
   *  indices are not) with the host-resolved stand-up progress `p` (-1 =
   *  crushed flat, 0..1 = the regrow swell). The wells idiom throughout:
   *  this 20 Hz reconcile IS the client's felled truth (absence = standing),
   *  the stamped `p` drives both the guest's drawn face (fellFace) and its
   *  predicted collision (the blocking trio reads Doodad.felled), and a
   *  dropped packet self-heals on the next beat. Present only while any
   *  piece lies crushed — the whole-ground common case ships zero bytes. */
  fell?: { x: number; y: number; p: number }[];
  /** THE EVAPORATING GROUND's drying set (World.updateEvaporation): position-
   *  keyed rows shipping the host-resolved DERIVED draw scalar — the radius,
   *  the fabric's one truth — for every doodad mid-dry (rubble pocks, weather
   *  dress, creep wakes, blast pocks). The wells idiom throughout: this 20 Hz
   *  reconcile IS the client's drying truth — a listed row restates radius
   *  (and MINTS a runtime-planted piece the one-shot zone list never carried),
   *  a TRACKED row's disappearance retires the piece (the host spliced it
   *  dry), and a dropped packet self-heals on the next beat. Clients never
   *  run the sweep — they draw what the wire says. Present only while ground
   *  dries: the whole-ground common case ships zero bytes (absent == the
   *  pre-evap wire, byte for byte). */
  ev?: EvapW[];
  /** THE ENTRY FREEZE's mid-visit wire (World.freezeStandingWater): 1 while a
   *  Deepwinter front holds the host's zone. Join/entry guests already meet
   *  frozen KINDS on the one-shot zone list (the host materializes before
   *  serving) — this bit reaches the guest who was STANDING in the zone when
   *  the marching front swallowed it: the client runs the SAME registry swap
   *  over its own replicated list (idempotent by the same scan memo, so the
   *  20 Hz repeat is free). ABSENCE NEVER THAWS — the host has no unfreeze
   *  pass either; on both sides the only thaw road is the next zone (re)apply
   *  minting ordinary water (transience by construction). Absent while no
   *  front holds — the common case ships zero bytes. */
  dwf?: 1;
}

/** One drying doodad on the wire: position key, current radius (the derived
 *  draw scalar — quantized host-side by the sweep itself), kind + shallow so
 *  a client can mint a piece planted after its join (the wells push lane). */
export interface EvapW { x: number; y: number; r: number; k: string; s?: 1 }

/** One live pooled lightwell: id, kind, pos, doodad radius, power fraction. */
export interface WellW { i: number; k: string; x: number; y: number; r: number; pf: number; }

const v2 = (p: { x: number; y: number }): Vec2W => [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100];

function actorToW(a: Actor, world: World): ActorW {
  const inv = a.sheet.get('invisible');
  const det = a.sheet.get('detectability');
  const w: ActorW = {
    id: a.id, p: v2(a.pos), f: a.facing, r: a.radius, c: a.color, sh: a.shape,
    team: a.team, name: a.name,
    life: Math.max(0, Math.round(a.life)), maxLife: Math.round(a.maxLife()),
    es: Math.round(a.es), maxEs: Math.round(a.maxEs()),
    hf: a.hitFlash, downed: a.downed, dead: a.dead, mn: a.isMinion(), passive: a.passive, ut: a.untargetable,
    summonReform: a.summonReform ? [a.summonReform.remaining, a.summonReform.duration] : undefined,
  };
  if (inv > 0) w.inv = inv;
  if (a.movementTether && !a.movementTether.released) w.movementTether = {
    ...a.movementTether, point: { ...a.movementTether.point }, safe: { ...a.movementTether.safe },
  };
  if (det !== 1) w.det = det;
  if (a.sheet.get('concealment') > 0) w.concealment = a.sheet.get('concealment');
  if (a.concealmentExposedUntil > world.time) w.concealmentExposedUntil = a.concealmentExposedUntil;
  if (!a.aims) w.aims = false;
  // THE THRONG's husk marker rides the wire so a co-op client's renderer
  // sight-gates against ITS OWN bar (engine/throng.ts).
  if (a.throngWild) w.tw = a.throngWild;
  if (a.throngUnits) w.thu = a.throngUnits;
  const throngAnchors = a.skills.filter(s => s?.def.throng);
  if (throngAnchors.length) w.thr = Object.fromEntries(throngAnchors.map(s => [s!.def.id, world.throngRosterCount(a, s!)]));
  if (a.throngEgg) w.the = a.throngEgg;
  if (a.hivecallHud) w.hive = a.hivecallHud;
  if (a.assaultHud) w.assault = a.assaultHud;
  if (a.assaultOrbit) w.assaultOrbit = true;
  if (a.assaultAura) w.assaultAura = true;
  const throngEvolutionGauges = a.skills.filter(s => s?.state?.throngEvolutionGauge !== undefined);
  if (throngEvolutionGauges.length) w.thg = Object.fromEntries(throngEvolutionGauges.map(s => [s!.def.id, s!.state!.throngEvolutionGauge!]));
  // THE GRAB FABRIC's held meter (engine/grab.ts): computed off the LIVE
  // pair on the holder, shipped on the held body's own row.
  const gbHold = GRAB_HUD_OF(a);
  if (gbHold) w.gb = gbHold;
  // THE PLY FABRIC's pips (engine/plies.ts).
  if (a.pliesMax > 0) { w.pl = a.plies; w.plm = a.pliesMax; }
  // THE TELL FABRIC (engine/tells.ts): derived scalars + the variant roll.
  if (a.tellSpecs?.length) {
    if (a.brainVariant !== undefined) w.bv = a.brainVariant;
    if (a.tells?.some(v => v > 0)) w.tl = a.tells;
  }
  // THE PACK LAYER's drawn bond (engine/pack.ts): the HOLDER whose mods this
  // body wears, shipped as the host's actor id and re-pointed client-side
  // through the same pool the snapshot already keys on. We ship the holder
  // rather than the derived line so the client runs the IDENTICAL link
  // derivation over its OWN interpolated positions — the link then tracks
  // smoothly between moving bodies instead of snapping at 20 Hz, and host
  // and client cannot draw different structures.
  if (a.bondHeld && a.bondFrom && !a.bondFrom.dead) w.bl = a.bondFrom.id;
  // THE WATCH FABRIC (engine/watch.ts): the stamped sense + the ladder,
  // quantized to the wire grid — the client draws the same fan from the
  // same numbers (never the suspicion sources).
  if (a.watch && a.senseDetect > 0) {
    w.wp = [
      Math.round(a.senseDetect),
      Math.round(a.senseArcHalf * 1000) / 1000,
      Math.round(a.senseRearMul * 1000) / 1000,
      a.senseAlerted ? 1 : 0,
      Math.round(WATCH_V_OF(a) * 1000) / 1000,
    ];
  }
  // THE TIER FABRIC's layer (engine/tiers.ts) — clients gate draw + veil on it.
  if (a.tier) w.tr = a.tier;
  if (a.wane > 0) w.wn = Math.round(a.wane * 100) / 100;
  if (a.kind === 'player') { const s = SEAT_OF(a); if (s) w.seat = s; }
  if (a.adorn) w.adorn = a.adorn;
  if (a.material) w.mat = a.material;
  if (a.look) w.lk = a.look;
  if (a.extraParts?.length) w.ep = a.extraParts;
  if (a.rarity) w.rarity = a.rarity;
  if (a.magicPack) w.magicPack = { ...a.magicPack, runtime: undefined };
  w.encounterCue = encounterCueOf(a, world);
  if (a.kind === 'player' && a.statuses.length) w.afflictionPressure = afflictionPressureOf(a);
  const armedCues = armedStatusCues(a);
  if (armedCues.length) w.armedCues = armedCues.map(cue => ({ ...cue }));
  w.reactiveCue = reactiveCueOf(a, world.time);
  w.bodyActionPose = bodyActionPoseOf(a, world.time);
  w.bodyWalkPose = bodyWalkPoseOf(a, world.time);
  const poolCues = poolCueRows(a);
  if (poolCues.length) w.poolCues = poolCues;
  const payloadCues = payloadCueRows(a, world);
  if (payloadCues.length) w.payloadCues = payloadCues;
  const procCues = procCueRows(a);
  if (procCues.length) w.procCues = procCues.map(row => ({ ...row }));
  const anatomyState = anatomyCueState(a);
  const feedingCues = feedingCueState(a);
  const companionCues = companionCueState(a, world);
  if (companionCues.links.length || companionCues.marks.length || companionCues.stance) w.companionCues = cloneCompanionCues(companionCues);
  if (feedingCues.gains.length || feedingCues.meal || feedingCues.mass) w.feedingCues = cloneFeedingCues(feedingCues);
  if (anatomyState.weakpoints.length || anatomyState.parts.length || anatomyState.segments.length || anatomyState.part)
    w.anatomyCues = cloneAnatomyCues(anatomyState);
  if (wardCueActive(a)) w.wardCue = { profile: a.wardCueProfile, sources: wardGuardians(a, world.actors).map(x => x.id) };
  if (a.encounterGroup) w.encounterGroup = { ...a.encounterGroup };
  if (a.encounterOrder) {
    const {group,recipe,plan,leader,phase,until}=a.encounterOrder;
    w.encounterOrder={group,recipe,plan,leader,phase,until};
  }
  if (a.magicPackRole) w.magicPackRole = a.magicPackRole;
  if (a.magicPackDonors) w.magicPackDonors = a.magicPackDonors;
  if (a.magicPackPending) w.magicPackPending = a.magicPackPending;
  if (a.magicPackFrom && !a.magicPackFrom.dead) w.magicPackFrom = a.magicPackFrom.id;
  if (a.magicPackPower) w.magicPackPower = a.magicPackPower;
  if (a.defId) w.defId = a.defId;
  if (a.isMinion()) w.cosmeticSourceSkill = cosmeticSummonSkill(a);
  if (a.summonShell) w.ss = { ...a.summonShell };
  if (a.shellGuard) w.sg = { ...a.shellGuard, breathe: a.shellGuard.breathe ? { ...a.shellGuard.breathe } : undefined };
  if (a.poiseBroken) w.pb = true;
  if (a.faction) w.faction = a.faction;
  // THE BOSS BAR row rides the wire host-computed (clients have no brain
  // to derive pips from, and the policy must not fork): see BOSS_BAR_OF.
  const bb = BOSS_BAR_OF(a);
  if (bb) w.bb = [bb.pips, bb.lit, bb.hl ? 1 : 0];
  // comboCueRows also carries enemy/companion completion, with no client cast simulation.
  const comboConditions = comboConditionRows(a, world.time);
  if (comboConditions.length) w.cc = comboConditions.map(row => [row.id, row.lit, row.len, Math.round(row.remaining * 100) / 100]);
  const comboCues = comboCueRows(a, world.time);
  if (comboCues.length) w.cb = comboCues.map(row => [row.id, row.lit, row.len, Math.round(row.glow * 100) / 100]);
  // Player bar readouts the host owns: banked runes (comboCueRows lives above).
  if (a.kind === 'player') {
    if (a.runes.length) w.rn = a.runes.slice();
    // THE PRIMED POUR's glints (pourPrime) — ids only, the runes idiom.
    if (a.primedPours.length) w.pp = a.primedPours.map(e => e.skillId);
    w.fq = flaskChargeBanks(a);
    if (a.mimicBank?.length) {
      w.mk = a.mimicBank.map(e => [e.sid, e.src] as [string, string]);
      if (a.mimicSel) w.ms = a.mimicSel;
    }
  }
  if (a.absorbTotal > 0) w.ab = Math.round(a.absorbTotal);
  if (a.statuses.length) {
    w.st = a.statuses.map(s => ({ id: s.id, stacks: s.stacks,
      ...(Number.isFinite(s.statusDuration ?? s.total) ? { statusDuration: s.statusDuration ?? s.total } : {}),
      ...(Number.isFinite(s.remaining) ? { rem: Math.ceil(Math.max(0, s.remaining) * 10) / 10 } : {}),
      ...(s.dps > 0 ? { dot: 1 as const } : {}),
      ...(s.bankFrac !== undefined ? { bk: Math.round(s.bankFrac * 100) / 100 } : {}) }));
  }
  if (a.casting) {
    const cs = a.casting;
    const cw: CastW = { c: cs.inst.def.color, mode: cs.mode, total: cs.total, elapsed: cs.elapsed };
    if (a.kind === 'player') cw.sk = cs.inst.def.id; // THE SMOOTH SHELL: the own cast's real instance
    // THE VENT-RIDE's broil rides the cast wire (the client draws the roil).
    const cd = cs.inst.def.delivery;
    if (cd.type === 'leap' && cd.vent) cw.vent = cd.vent.columnR;
    if (cs.pulseTimer !== undefined) cw.pulseTimer = cs.pulseTimer;
    if (cs.shield !== undefined) cw.shield = cs.shield;
    if (cs.maxShield !== undefined) cw.maxShield = cs.maxShield;
    if (cs.indicatorAt !== undefined) cw.indicatorAt = cs.indicatorAt;
    if (cs.presses !== undefined) cw.presses = cs.presses;
    if (cs.channelTime !== undefined) cw.channelTime = cs.channelTime;
    if (cs.mode === 'guard') cw.parryCue = parryCueStrength(a);
    cw.guardReleaseCue = guardReleaseCue(a, world.time);
    cw.castingCompletion = castingCompletion(a);
    cw.castingCue = castingCueOf(a);
    if(a.kind==='player')cw.meleeReach = meleeReachCueOf(a);
    cw.focusBroken = cs.focusBroken;
    if (cs.mode === 'guard' && cs.inst.def.guard) cw.guardArc = guardArcRadians(a)*180/Math.PI;
    if (cs.bashAt !== undefined) cw.bashAt = cs.bashAt;
    if (cs.bashLow) cw.bashLow = true;
    if (cs.bashArmAt !== undefined) cw.bashArmAt = cs.bashArmAt;
    w.cast = cw;
  }
  if (a.activeAuras.size) {
    w.auras = [...a.activeAuras.values()].map(au => ({ c: au.inst.def.color, r: au.radius, sh: au.shape }));
  }
  if (a.construct) w.con = { kind: a.construct.kind, domeRadius: a.construct.domeRadius };
  if (a.fuse !== undefined) w.fuse = a.fuse;
  if (a.leap) {
    w.leap = a.leap.vent
      ? { timer: a.leap.timer, total: a.leap.total, vent: a.leap.vent.columnR }
      : { timer: a.leap.timer, total: a.leap.total };
    // THE WIRE'S EYES: a telegraphed dive ships its landing ring (renderer drawZones).
    if (a.leap.telegraph) Object.assign(w.leap, { dest: v2(a.leap.dest), radius: Math.round(a.leap.radius * 10) / 10, telegraph: a.leap.telegraph.color });
  }
  if (a.worm) {
    w.worm = { seg: a.worm.segments.map(v2), taper: a.worm.taper };
    // SEGMENT FABRIC: hittable/torn/flash state rides only while present.
    if (a.worm.hittable) w.worm.ht = 1;
    if (a.worm.wounded?.some(t => t)) {
      let bits = 0;
      a.worm.wounded.forEach((t, i) => { if (t && i < 30) bits |= (1 << i); });
      w.worm.wd = bits;
    }
    if (a.worm.flash?.some(f => f > 0)) {
      w.worm.sf = a.worm.flash.map(f => Math.round(f * 100) / 100);
    }
  }
  return w;
}

// Set per-serialize so actorToW can tag player actors with their seat id.
let SEAT_OF: (a: Actor) => string | undefined = () => undefined;
// Set per-serialize so actorToW ships the host's boss-bar read (one policy —
// World.bossBarInfo — for the local renderer and every client alike).
let BOSS_BAR_OF: (a: Actor) => { pips: number; lit: number; hl: boolean } | null = () => null;
// Set per-serialize: the grab fabric's held-meter row for a HELD body
// (engine/grab.ts — pair state lives host-side only; the same bar the
// host renderer draws off the live pair).
let GRAB_HUD_OF: (a: Actor) => [string, number] | null = () => null;
// Set per-serialize: the watch fabric's ladder read at the host clock
// (engine/watch.ts — suspicion decay is a function of world.time, which
// actorToW does not otherwise carry).
let WATCH_V_OF: (a: Actor) => number = () => 0;

/** THE WIRE DISCIPLINE: the account view this world last shipped, as the JSON it went out
 *  as. The view is built every tick as it always was (its cost was never the problem — the
 *  44 KB on the wire was); it ships on its beat, or on any tick it differs from the last
 *  shipped view, so a graduation reaches every client on the next snapshot while an
 *  unchanged view rides only the beat (the first snapshot a joiner sees ships it). */
const lastShippedMemoryAccess = new WeakMap<World, string>();
export function serializeSnapshot(world: World, tick: number): StateSnapshot {
  const seatById = new Map<Actor, string>();
  for (const s of world.seats) seatById.set(s.actor, s.id);
  SEAT_OF = (a) => seatById.get(a);
  BOSS_BAR_OF = (a) => world.bossBarInfo(a);
  GRAB_HUD_OF = (a) => {
    if (a.heldBy === undefined) return null;
    const hold = world.actors.find(h => h.id === a.heldBy)?.gripping;
    if (!hold || hold.id !== a.id) return null;
    return [GRAB_VERB_LABEL[hold.verb], Math.round(Math.min(1, hold.struggle) * 100) / 100];
  };
  WATCH_V_OF = (a) => (a.watch ? watchValueOf(a, a.watch, world.time) : 0);

  const seats: Record<string, SeatW> = {};
  for (const s of world.seats) if (!s.keeper) seats[s.id] = seatW(s, world); // keeperSeat: the warden is no party member
  // THE COUNTERS AND THE JOURNAL (net/journalWire.ts): each seat's journal and rite rows, THE OWN
  // ENTRY's, on a hosted world alone (each absent in its common case); a rite holds the hands.
  if (world.localSeat.keeper) world.withApproachPass(() => { for (const s of world.seats) { // one pass: each board's routes once
    const row = seats[s.id];
    if (!row) continue;
    const jn = journalRowOf(world, s, tick);
    if (jn) row.jn = jn;
    const hv = harvestRowOf(world, s);
    if (hv) row.hv = hv;
    if (world.harvestHolds(s)) row.rooted = true;
  } });
  // THE SHELF PER BUYER (card 29 ruled): each buyer's own shelf, THE OWN ENTRY's (hosted worlds alone).
  if (world.localSeat.keeper) for (const s of world.seats) {
    const row = seats[s.id], vd = row ? ownShelfOf(world, s, tick) : undefined;
    if (row && vd) row.vd = vd;
  }

  // META: ship a seat's build only when it CHANGED (level/pickup/mutation marked
  // it dirty). The host clears world.metaDirty after the broadcast (main.ts).
  let seatMeta: Record<string, SeatMetaW> | undefined;
  if (world.metaDirty.size) {
    seatMeta = {};
    for (const s of world.seats) if (!s.keeper && world.metaDirty.has(s.id)) seatMeta[s.id] = serializeSeatMeta(s); // keeperSeat
  }

  return {
    tick, time: world.time, zoneId: world.zone.id,
    magicPackEffects: world.magicPackEffects.map(v => ({ ...v })),
    satellites: world.satellites.visuals.map(v => ({ ...v })),
    guardArts: world.guardArts.visuals.map(v => ({ ...v })),
    auroras: world.auroras.visuals.map(v => ({ ...v })),
    guardians: world.guardians.visuals.map(v => ({ ...v })),
    creepers: world.creepers.visuals.map(v => ({ ...v, trail: v.trail.map(p => ({ ...p })) })),
    satelliteFlights: world.satellites.flights.visuals.map(v => ({ ...v, from: { ...v.from }, to: { ...v.to } })),
    grantedPockets: (() => {
      const rows = world.seats.map(s => ({ owner: s.actor.id, pockets: world.grantedPocketsFor(s.actor) }))
        .filter(r => r.pockets.length);
      return rows.length ? rows : undefined;
    })(),
    arena: { w: world.arena.w, h: world.arena.h },
    seats, seatMeta,
    ...vendorRowsOf(world, tick), // THE SHELF BEAT: the vendor rows on a change, and on the beat
    ...(world.partyRows ? { parties: world.partyRows } : {}), // THE PARTY: the rows ride every snapshot of a hosted world
    ...((): { pings?: PingW[] } => { // THE PING: the live marks ride every snapshot of a hosted world (and any snapshot carrying one)
      const live = world.livePings();
      return world.partyRows || live.length ? { pings: live.map(p => ({ s: p.seat, p: [p.pos.x, p.pos.y] as Vec2W, k: p.tier, a: p.at, u: p.until })) } : {};
    })(),
    memoryAccess: (() => { // THE WIRE DISCIPLINE: the beat, or a view that changed
      const view = memoryAccessView(world.account), key = JSON.stringify(view);
      if (tick % WIRE_CFG.memoryAccessBeat !== 1 && lastShippedMemoryAccess.get(world) === key) return undefined;
      lastShippedMemoryAccess.set(world, key);
      return view;
    })(),
    vendorTradeOpen: world.vendorTradeRefusal() === null,
    vendorGemsOpen: world.vendorGemsOpen(),
    bagBoard: bagBoard(),
    containerBoards: Object.fromEntries(containerList().flatMap(c => {
      const b = containerBoard(c);
      return b ? [[c.id, packContainerBoard(b)] as const] : [];
    })),
    actors: world.actors.filter(a => (!a.dead || a.isPlayerKind()) && !world.seatOf(a)?.keeper) // keeperSeat: unseen, unshipped
      .map(a => ({ ...actorToW(a, world), cosmeticKind: a.cosmeticKind, cosmeticLoadout: cosmeticLoadoutFor(world, a) })),
    projectiles: world.projectiles.map(p => ({ reflectedCue: p.parryDamage ? true : undefined, orbPaint: p.orbPaint ? { ...p.orbPaint } : undefined, p: v2(p.pos), d: p.dir, r: p.radius, c: p.color, sh: p.shape, a: p.age, cosmeticMotif: p.cosmeticMotif, cosmeticProjectile: p.cosmeticProjectile,
      ...flightOf(p, world.time) })), // THE WIRE'S EYES: the flight's wire id + velocity
    tethers: world.tethers.map(t => ({
      ax: Math.round(t.ax), ay: Math.round(t.ay), bx: Math.round(t.bx), by: Math.round(t.by),
      c: t.color, w: t.width,
      ai: t.a.id, bi: t.b.id, // THE WIRE'S EYES: the endpoint bodies (the `bl` idiom)
    })),
    zones: zonesOf(world), // THE WIRE'S EYES: the ground telegraphs and fields near a seated player
    townPortalViews: world.townPortalViews(),
    drops: world.drops.map(d => ({
      p: v2(d.pos), bob: d.bob, kind: d.item.kind,
      color: d.item.kind === 'support' ? d.item.gem.def.color
        : d.item.kind === 'gear' ? ITEM_RARITIES[d.item.item.rarity].color
        : d.item.kind === 'vestige' ? (VESTIGES[d.item.id]?.color ?? '#b06bd4')
        : d.item.kind === 'essence' ? ESSENCES[d.item.essence].color
        : d.item.kind === 'abilityEssence' ? abilityEssenceOfTier(d.item.tier).color
        : d.item.inst.def.color,
      rarity: d.item.kind === 'skill' ? (d.item.inst.rarity ?? 'common')
        : d.item.kind === 'gear' ? d.item.item.rarity : undefined,
      name: d.item.kind === 'gear' ? d.item.item.name
        : d.item.kind === 'skill' ? skillInstanceName(d.item.inst)
        : d.item.kind === 'support' ? d.item.gem.def.name : undefined,
      baseId: d.item.kind === 'gear' ? d.item.item.baseId : undefined,
      dropUid: d.item.kind === 'gear' ? d.item.item.uid : undefined,
      vid: d.item.kind === 'vestige' ? d.item.id : undefined,
      eid: d.item.kind === 'essence' ? d.item.essence : undefined,
      tid: d.item.kind === 'abilityEssence' ? d.item.tier : undefined,
      cnt: d.item.kind === 'essence' || d.item.kind === 'abilityEssence' ? d.item.count : undefined,
    })),
    orbs: world.orbs.map(o => ({ p: v2(o.pos), bob: o.bob, life: o.life, kind: o.kind })),
    texts: world.texts.map(t => ({ p: v2(t.pos), life: t.life, maxLife: t.maxLife, size: t.size, color: t.color, text: t.text, k: t.kind, ...(t.yieldToCombat ? { yieldToCombat: true } : {}), ...(t.dropUid === undefined ? {} : { dropUid: t.dropUid }),
      ...(t.seat === undefined ? {} : { o: t.seat }) })), // THE WIRE'S EYES: a combat number's owner seat
    no: world.notices.map(n => ({ text: n.text, color: n.color, size: n.size, ch: n.channel, born: n.bornAt })),
    pfd: world.pickupFeed.map(e => ({ s: e.seatId, l: e.label, c: e.color, n: e.count, born: e.bornAt })),
    recoveryCues: world.emergences.filter(e => e.recoveryCueTier !== undefined && e.life > 0).map(cloneRecoveryCue),
    flashes: world.flashes.map(f => ({ combatCue: f.combatCue ? { ...f.combatCue } : undefined, p: v2(f.pos), radius: f.radius, color: f.color, life: f.life, maxLife: f.maxLife,
      feedingCue: f.feedingCue ? { ...f.feedingCue, to: { ...f.feedingCue.to } } : undefined,
      companionCue: f.companionCue ? { ...f.companionCue, from: f.companionCue.from && { ...f.companionCue.from } } : undefined,
      recoveryCueTier: f.recoveryCueTier,
      defenseCue: f.defenseCue ? { ...f.defenseCue } : undefined, fx: f.fx, cosmeticMotif: f.cosmeticMotif, departure: f.departure, bolt: f.bolt || undefined, meteor: f.meteor || undefined })),
    ec: world.eyecatch
      && eyecatchElapsed(world.eyecatch, world.timeflow.age) < world.eyecatch.paneSec
      ? {
        ci: world.eyecatch.casterId, sk: world.eyecatch.skillId,
        st: world.eyecatch.style, ti: world.eyecatch.title, sb: world.eyecatch.sub,
        tn: world.eyecatch.tint, sd: world.eyecatch.side,
        el: Math.round(eyecatchElapsed(world.eyecatch, world.timeflow.age) * 1000) / 1000,
        ps: world.eyecatch.paneSec, av: world.eyecatch.avatarDefId,
      }
      : undefined,
    deathBursts: world.deathBurstsView().map(b => ({
      p: v2(b.pos), ph: (b.phase === 'gather' ? 0 : 1) as 0 | 1, r: b.radius, c: b.color,
      arm: (b.arming ? 1 : 0) as 0 | 1, t: Math.round(b.t * 100) / 100, co: b.coalesce, trail: b.trail.map(v2),
      tm: b.team,
    })),
    doors: doorStatesOf(world),
    hollows: world.openedHollows.size ? [...world.openedHollows] : undefined,
    annexes: world.annexOpen.size ? [...world.annexOpen] : undefined,
    wells: wellsOf(world),
    titans: world.titans.scene(),
    gloom: world.gloom() > 0.005 ? Math.round(world.gloom() * 1000) / 1000 : undefined,
    laneArm: laneArmOf(world),
    laneOnce: laneOnceOf(world),
    trapState: world.trapworks.length
      ? world.trapworks.map(tw => ({ i: tw.id, s: (tw.state === 'sprung' ? 1 : 0) as 0 | 1, t: Math.round(tw.sprungAt * 100) / 100 }))
      : undefined,
    lt: liteOf(world),
    fell: fellOf(world),
    ev: evapOf(world),
    dwf: world.frostHeld() ? 1 : undefined,
  };
}

// ----------------------------------------------------- THE WIRE'S EYES (host) --
// The rows a client draws from that rode nowhere before (docs/engine/shard.md): the
// ground's telegraphs and fields, the flights' ids and velocities, the own seat's
// clocks, and the shelf on its beat. Each is absent in its common case.

/** THE SHELF BEAT's ledger: the vendor rows this world last shipped, as the JSON they went out as. */
const lastShippedVendor = new WeakMap<World, string>();

/** THE SHELF BEAT (WIRE_CFG.vendorBeat): the three vendor rows ride together whenever any
 *  of them differs from what this world last shipped (a purchase, a restock, a hold, the
 *  cap) and on the beat however still; between, they are absent and a client keeps its last. */
function vendorRowsOf(world: World, tick: number): Pick<StateSnapshot, 'vendor' | 'vendorRestockAt' | 'vendorCap'> {
  if (world.localSeat.keeper) return {}; // THE SHELF PER BUYER: a hosted world ships each buyer its own (SeatW.vd)
  const rows = {
    vendor: world.vendorStock.map(e => vendorEntryW(e, world)),
    vendorRestockAt: world.vendorRestockAt,
    vendorCap: world.vendorLockCap(),
  };
  const key = JSON.stringify(rows);
  if (tick % WIRE_CFG.vendorBeat !== 1 && lastShippedVendor.get(world) === key) return {};
  lastShippedVendor.set(world, key);
  return rows;
}

/** THE SHELF PER BUYER on the wire (card 29 ruled): one buyer's shelf at Brandt's
 *  counter (its own entries, each wearing its own hold's flag), the shared restock mark
 *  and its reserve capacity. */
export interface ShelfW { v: VendorEntryW[]; at: number; cap: number }

/** THE SHELF BEAT per buyer: the seat's own shelf rows this world last shipped. */
const lastShippedShelf = new WeakMap<Seat, string>();

/** THE SHELF PER BUYER (SeatW.vd, THE OWN ENTRY): a hosted world's seat's own shelf, read
 *  in its own buyer's scope, shipped when it differs from what the seat last heard (a
 *  purchase, a restock, a hold, the cap) and on THE SHELF BEAT; absent between, and
 *  absent while the seat has never stood at a counter. Hosted worlds alone. */
function ownShelfOf(world: World, s: Seat, tick: number): ShelfW | undefined {
  if (!world.localSeat.keeper || s.keeper || s.merc) return undefined;
  const row = world.withBuyer(s, (): ShelfW => ({
    v: world.vendorStock.map(e => vendorEntryW(e, world)), at: world.vendorRestockAt, cap: world.vendorLockCap(),
  }));
  const was = lastShippedShelf.get(s);
  if (!row.v.length && was === undefined) return undefined;
  const key = JSON.stringify(row);
  if (tick % WIRE_CFG.vendorBeat !== 1 && was === key) return undefined;
  lastShippedShelf.set(s, key);
  return row;
}

/** THE SHELF PER BUYER, the client's read: the own seat's shelf row (a hosted world's),
 *  else the root rows (the co-op lane: the host's one shelf), the newest carrier winning. */
function shelfRowsFor(world: World, snap: StateSnapshot, prev: StateSnapshot | null | undefined): Pick<StateSnapshot, 'vendor' | 'vendorRestockAt' | 'vendorCap'> | null {
  const own = snap.seats[world.clientSeatId]?.vd ?? prev?.seats[world.clientSeatId]?.vd;
  if (own) return { vendor: own.v, vendorRestockAt: own.at, vendorCap: own.cap };
  return snap.vendor !== undefined ? snap : prev?.vendor !== undefined ? prev : null;
}

/** A flight's wire memory, keyed by the projectile itself (so it lives exactly as long). */
interface FlightMemo { id: number; x: number; y: number; t: number; v: Vec2W }
const FLIGHTS = new WeakMap<object, FlightMemo>();
let flightSeq = 0;

/** THE WIRE'S EYES: a flight's stable wire id and its velocity in px/s: its displacement
 *  since the last snapshot this world serialized while that sample is fresh (a curving,
 *  orbiting or time-held flight reports what it actually did), else its speed along its
 *  heading (at birth, after a gap, and never a frame rebound's re-seat as a velocity). */
function flightOf(p: World['projectiles'][number], time: number): { id: number; v: Vec2W } {
  const x = p.pos.x, y = p.pos.y;
  const along = (): Vec2W => [Math.round(Math.cos(p.dir) * p.speed), Math.round(Math.sin(p.dir) * p.speed)];
  let m = FLIGHTS.get(p);
  if (!m) {
    m = { id: ++flightSeq, x, y, t: time, v: along() };
    FLIGHTS.set(p, m);
  } else if (time - m.t > 1e-6) {
    const dt = time - m.t, vx = (x - m.x) / dt, vy = (y - m.y) / dt, cap = 3 * Math.max(60, p.speed);
    m.v = dt <= 0.25 && vx * vx + vy * vy <= cap * cap ? [Math.round(vx), Math.round(vy)] : along();
    m.x = x; m.y = y; m.t = time;
  }
  return { id: m.id, v: [m.v[0], m.v[1]] };
}

type ZoneT = World['zones'][number];
/** A zone's wire memory: its id, and its telegraph's countdown span (the zone's own stamped
 *  `delay0`, else the first delay seen once it is no longer armed). */
interface ZoneMemo { id: number; span?: number }
const ZONE_MEMOS = new WeakMap<object, ZoneMemo>();
let zoneSeq = 0;

/** How far a zone's edge lies from the nearest viewer (a fissure segment by its line). */
function zoneGap(z: ZoneT, viewers: readonly { x: number; y: number }[]): number {
  let best = Infinity;
  for (const v of viewers) {
    let d: number;
    if (z.seg) {
      const { ax, ay, bx, by } = z.seg, dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((v.x - ax) * dx + (v.y - ay) * dy) / len2)) : 0;
      d = Math.hypot(v.x - (ax + dx * t), v.y - (ay + dy * t));
    } else {
      d = Math.hypot(v.x - z.pos.x, v.y - z.pos.y);
    }
    best = Math.min(best, d - z.radius);
  }
  return best;
}

/** THE WIRE'S EYES: the zones whose edge lies within reach of a seated player's body
 *  (WIRE_CFG.eyes.zoneReach, else THE NEAR LAW's radius; 0 = every zone), the nearest first
 *  past WIRE_CFG.eyes.zoneMax. The keeper is never a viewer: it watches nothing. Undefined
 *  while none stand near anyone (the common case ships zero bytes). */
function zonesOf(world: World): ZoneW[] | undefined {
  if (!world.zones.length) return undefined;
  const eyes = WIRE_CFG.eyes;
  const reach = eyes.zoneReach > 0 ? eyes.zoneReach : COOP_SCALING.shareRadius;
  const heroes = new Set<Actor>();
  for (const s of world.seats) if (!s.keeper) heroes.add(s.actor); // keeperSeat: the warden is no viewer
  if (!heroes.size) return undefined;
  const viewers = [...heroes].map(a => a.pos);
  const near: { z: ZoneT; d: number }[] = [];
  for (const z of world.zones) {
    const d = zoneGap(z, viewers);
    if (reach > 0 && d > reach) continue;
    near.push({ z, d });
  }
  if (!near.length) return undefined;
  if (near.length > eyes.zoneMax) { near.sort((a, b) => a.d - b.d); near.length = eyes.zoneMax; }
  return near.map(({ z }) => zoneW(z, world, heroes));
}

/** One zone as its painter reads it (ZoneW). Gameplay state never crosses. */
function zoneW(z: ZoneT, world: World, heroes: ReadonlySet<Actor>): ZoneW {
  let m = ZONE_MEMOS.get(z);
  if (!m) { m = { id: ++zoneSeq }; ZONE_MEMOS.set(z, m); }
  const w: ZoneW = { id: m.id, p: v2(z.pos), r: Math.round(z.radius * 10) / 10, c: z.color };
  if (z.shape) {
    w.sh = z.shape;
    w.f = Math.round(z.facing * 1000) / 1000;
    if (z.arcRad !== undefined) w.arc = Math.round(z.arcRad * 1000) / 1000;
  }
  const tier = z.tier ?? z.caster.tier ?? 0;
  if (tier) w.tier = tier;
  if (z.exploded) {
    w.ex = 1;
    if (z.seg && ((z.aftershock && world.time >= z.aftershock.readyAt) || (z.roulette && world.time < z.roulette.armedUntil))) w.sa = 1;
    if (z.seg && z.volatile) w.sv = 1;
    if (z.edge && z.edge > 0.02) w.ed = Math.round(z.edge * 100) / 100;
    if (z.pulse && z.pulse.left > 0) w.pr = [Math.round(Math.max(0, z.pulse.next - world.time) * 100) / 100, Math.round(z.pulse.radiusMult * 1000) / 1000];
  } else {
    if (!z.armed && m.span === undefined) m.span = z.delay0 !== undefined && z.delay0 > 0 && z.delay0 < 100 ? z.delay0 : z.delay;
    w.fill = z.armed || !m.span ? 0 : Math.round(Math.max(0, Math.min(1, 1 - z.delay / m.span)) * 100) / 100;
    if (z.onGround?.length) w.og = [...z.onGround];
    if (z.edgeFrac) w.ef = Math.round(z.edgeFrac * 1000) / 1000;
    if (z.lobFrom) { w.lf = v2(z.lobFrom); if (z.lobArc !== undefined) w.la = z.lobArc; }
  }
  if (z.seg) w.seg = [Math.round(z.seg.ax), Math.round(z.seg.ay), Math.round(z.seg.bx), Math.round(z.seg.by)];
  const rider = z.anchor ?? (z.follow ? z.caster : undefined);
  if (rider) w.ri = rider.id;
  if (heroes.has(z.caster)) { w.ci = z.caster.id; w.sk = z.inst.def.id; if (z.toggled) w.tg = 1; }
  return w;
}

/** THE WIRE'S EYES: a seat's running cooldowns on the clock grid (THE OWN ENTRY). The
 *  remainder rounds UP, so a client never reads a skill ready before the host does. */
function ownCooldownsOf(a: Actor): Pick<SeatW, 'cd'> {
  if (!a.cooldowns.size) return {};
  const q = Math.max(1, Math.round(1 / WIRE_CFG.eyes.clockGrid));
  let cd: Record<string, [number, number]> | undefined;
  for (const [id, left] of a.cooldowns) {
    if (!(left > 0)) continue;
    const rem = Math.max(1, Math.ceil(left * q - 1e-6)) / q;
    const total = a.cooldownTotals.get(id) ?? SKILLS[id]?.cooldown ?? left;
    (cd ??= {})[id] = [rem, Math.max(rem, Math.round(total * q) / q)];
  }
  return cd ? { cd } : {};
}

/** THE WIRE'S EYES: the bar's gauge banks (THE OWN ENTRY): fill floored at 2dp (so a full
 *  read is a full bank), locked and ready as the press would judge them. Empty, open banks
 *  ship nothing. */
function ownGaugesOf(a: Actor): Pick<SeatW, 'gg'> {
  let gg: Record<string, [number, 0 | 1, 0 | 1]> | undefined;
  for (const inst of a.skills) {
    const spec = inst?.def.gauge;
    if (!inst || !spec) continue;
    const eff = a.gaugeEff(inst)!;
    const fill = Math.floor(gaugeFrac(inst, eff) * 100) / 100;
    const locked = gaugeLocked(inst), ready = gaugeReady(inst, eff, spec);
    if (fill <= 0 && !locked && !ready) continue;
    (gg ??= {})[inst.def.id] = [fill, locked ? 1 : 0, ready ? 1 : 0];
  }
  return gg ? { gg } : {};
}

/** THE OWN ENTRY: what only its own seat reads. Two kinds ride under the law: the SeatW rows
 *  named here (the seat's clocks, THE ACTING SEAT's refusal note and low-life surge) and THE
 *  OWN META, `seatMeta[seat]` (the book, bag, doll and wallets a client ever reads are its own
 *  seat's). A shard ships each socket its own seat's and never another's
 *  (ShardTransport.sendState through ownEntryJson); a broadcast lane (co-op) carries every
 *  seat's and each client reads its own. Naming a key here puts that SeatW row under the law. */
export const SEAT_OWN_ROWS: readonly (keyof SeatW)[] = ['cd', 'gg', 'fn', 'lh', 'jn', 'hv', 'rd']; // + THE ACTING SEAT's note and surge, THE COUNTERS AND THE JOURNAL's journal and rite, THE ROADS PER PLAYER's road ring
/** THE SHELF PER BUYER (card 29 ruled): the buyer's own shelf row rides THE OWN ENTRY too. */
(SEAT_OWN_ROWS as (keyof SeatW)[]).push('vd');

/** THE ACTING SEAT (World.seatHudWire): the seat's refusal note while it is fresh. */
function ownNoteOf(s: Seat, world: World): { fn?: { text: string; at: number } } {
  const fn = world.seatHudWire(s)?.fn;
  return fn ? { fn } : {};
}
/** THE ACTING SEAT (World.seatHudWire): the seconds left on the seat's low-life surge. */
function ownSurgeOf(s: Seat, world: World): { lh?: number } {
  const lh = world.seatHudWire(s)?.lh;
  return lh !== undefined ? { lh } : {};
}
/** THE ROADS PER PLAYER (engine/shardRoads.ts): the road dwell the host fills for the seat (a hosted world alone). */
function ownRoadOf(s: Seat, world: World): { rd?: [number, number, number, string] } {
  const rd = world.shardWorld ? roadDwellRow(world, s) : undefined;
  return rd ? { rd } : {};
}
let ownEntrySeq = 0;

/** A seat entry with every own row struck (another seat's view of it). */
function stripOwnRows(e: SeatW): SeatW {
  const c = { ...e };
  for (const k of SEAT_OWN_ROWS) delete c[k];
  return c;
}

/** THE OWN ENTRY's per-socket view of a snapshot (the law in one place): every seat's entry
 *  stands but only `seat`'s keeps its own rows, and `seatMeta` holds `seat`'s build alone
 *  (absent when this snapshot carries none for it). The per-socket frame is this view's JSON:
 *  the heartbeat and the dirty-flag beat keep their meaning seat by seat. */
export function ownEntryView(s: StateSnapshot, seat: string): StateSnapshot {
  const seats: Record<string, SeatW> = {};
  for (const [id, e] of Object.entries(s.seats)) seats[id] = id === seat ? e : stripOwnRows(e);
  const meta = s.seatMeta?.[seat];
  return { ...s, seats, seatMeta: meta ? { [seat]: meta } : undefined };
}

/** THE OWN ENTRY, split for per-socket delivery (the snapshot as JSON). */
export interface OwnEntrySplit {
  /** Every own row and every meta struck: the frame for a socket whose seat carries none (shared). */
  bare: string;
  /** The frame for `seat` (ownEntryView's JSON), or null when it carries nothing of its own (send `bare`). */
  forSeat(seat: string): string | null;
}

/** THE OWN ENTRY, split for per-socket delivery: null when no seat entry carries an own row
 *  and no meta rides (the one broadcast frame stands, byte-identical). The body is stringified
 *  ONCE with the seats map and the meta map held out by sentinels; each socket's seats map (a
 *  few hundred bytes) and its own meta are spliced in, the meta key struck whole for a socket
 *  with none. A sentinel not found exactly once, or cuts that would touch, fall back to a
 *  plain stringify of each socket's view (correctness never rides the optimization: the
 *  characterBody idiom). No seeded stream is touched. */
export function ownEntryJson(s: StateSnapshot): OwnEntrySplit | null {
  const ids = Object.keys(s.seats);
  const meta = s.seatMeta;
  const owns = (id: string): boolean =>
    (!!s.seats[id] && SEAT_OWN_ROWS.some(k => s.seats[id][k] !== undefined)) || !!meta?.[id];
  if (meta === undefined && !ids.some(owns)) return null;
  const plain = (): OwnEntrySplit => ({
    bare: JSON.stringify(ownEntryView(s, '')),
    forSeat: mine => (owns(mine) ? JSON.stringify(ownEntryView(s, mine)) : null),
  });
  const bareRows = ids.map(id => JSON.stringify(id) + ':' + JSON.stringify(stripOwnRows(s.seats[id])));
  const seatsFor = (mine: string): string => '{' + ids.map((id, i) =>
    (id === mine ? JSON.stringify(id) + ':' + JSON.stringify(s.seats[id]) : bareRows[i])).join(',') + '}';
  const n = ++ownEntrySeq;
  const q1 = JSON.stringify(`\u0000own-seats-${n}\u0000`), q2 = JSON.stringify(`\u0000own-meta-${n}\u0000`);
  const marked = JSON.stringify({ ...s, seats: JSON.parse(q1) as string, ...(meta !== undefined ? { seatMeta: JSON.parse(q2) as string } : {}) });
  const once = (needle: string): number => {
    const i = marked.indexOf(needle);
    return i >= 0 && marked.indexOf(needle, i + needle.length) < 0 ? i : -1;
  };
  const cuts: { at: number; end: number; put: (mine: string) => string }[] = [];
  const i1 = once(q1);
  if (i1 < 0) return plain();
  cuts.push({ at: i1, end: i1 + q1.length, put: seatsFor });
  if (meta !== undefined) {
    // The meta key is cut WITH its separating comma, so a socket with no meta of its own
    // receives no `seatMeta` key at all (its view's JSON), never an empty map.
    const key = '"seatMeta":', i2 = once(key + q2);
    if (i2 < 0 || once(q2) !== i2 + key.length) return plain();
    const lead = marked[i2 - 1] === ',', trail = !lead && marked[i2 + key.length + q2.length] === ',';
    const at = lead ? i2 - 1 : i2, end = i2 + key.length + q2.length + (trail ? 1 : 0);
    cuts.push({ at, end, put: mine => (meta[mine]
      ? (lead ? ',' : '') + key + JSON.stringify({ [mine]: meta[mine] }) + (trail ? ',' : '')
      : '') });
  }
  cuts.sort((a, b) => a.at - b.at);
  if (cuts.length > 1 && cuts[0].end > cuts[1].at) return plain();
  const pieces: string[] = [];
  let pos = 0;
  for (const c of cuts) { pieces.push(marked.slice(pos, c.at)); pos = c.end; }
  pieces.push(marked.slice(pos));
  const frame = (mine: string): string => {
    let out = pieces[0];
    for (let k = 0; k < cuts.length; k++) out += cuts[k].put(mine) + pieces[k + 1];
    return out;
  };
  return { bare: frame(''), forSeat: mine => (owns(mine) ? frame(mine) : null) };
}

/** The rampage fabric's felled rows (undefined while the ground stands whole
 *  — the common case). Progress is resolved host-side so guests need no
 *  clock agreement: they draw and test the shipped fraction verbatim. */
function fellOf(world: World): { x: number; y: number; p: number }[] | undefined {
  if (!world.rampageActive()) return undefined;
  let out: { x: number; y: number; p: number }[] | undefined;
  for (const d of world.doodads) {
    if (!d.felled) continue;
    (out ??= []).push({
      x: Math.round(d.pos.x), y: Math.round(d.pos.y),
      p: Math.round(fellProgress(d.felled, world.time) * 1000) / 1000,
    });
  }
  return out;
}

/** THE EVAPORATING GROUND's drying rows (undefined while nothing dries — the
 *  common case, zero bytes). The radius is resolved HOST-side by the sweep
 *  (quantized contraction — the fabric's one truth), so guests draw the
 *  shipped number verbatim and never run the sweep themselves. `k`/`s` ride
 *  along so a piece planted AFTER a client's join (a rubble pock, a creep
 *  wake, weather dress) can mint client-side — the zone list only ships once.
 *  Pooled wells are excluded: they ride the wells channel exclusively (the
 *  serializeZone precedent — one driver per doodad). */
function evapOf(world: World): EvapW[] | undefined {
  let out: EvapW[] | undefined;
  for (const d of world.doodads) {
    if (!d.evap || d.gone || d.well) continue;
    (out ??= []).push({
      x: Math.round(d.pos.x), y: Math.round(d.pos.y),
      r: Math.round(d.radius * 10) / 10, k: d.kind,
      ...(d.shallow ? { s: 1 as const } : {}),
    });
  }
  return out;
}

/** THE LITE TIER's draw list (engine/lite.ts): a kind table + flat rounded
 *  (kindIdx, x, y) triples — positions only, the wells idiom (this 20 Hz
 *  reconcile IS the pool's client existence; a dropped packet self-heals).
 *  Undefined while the pool is empty (the common case ships zero bytes). */
function liteOf(world: World): { k: string[]; b: number[] } | undefined {
  const pool = world.lite;
  if (!pool.liveCount) return undefined;
  const k = world.liteKinds.map(x => x.defId);
  const b: number[] = [];
  for (let i = 0; i < pool.used; i++) {
    if (!pool.alive[i]) continue;
    b.push(pool.kind[i], Math.round(pool.x[i]), Math.round(pool.y[i]));
  }
  return { k, b };
}

/** The complete tag→armed map (undefined when no tagged lane stands). The
 *  FULL map ships — trapworks toggles run both ways, so a lane flipped back
 *  to its authored state must still converge on the client. */
function laneArmOf(world: World): Record<string, 0 | 1> | undefined {
  let out: Record<string, 0 | 1> | undefined;
  for (const tr of world.tracks) {
    if (!tr.spec.tag) continue;
    (out ??= {})[tr.spec.tag] = tr.armed ? 1 : 0;   // tags flip in lockstep (setTracksArmed)
  }
  return out;
}

/** Every live once-lane spec (undefined when none — the common case). */
function laneOnceOf(world: World): TrackSpec[] | undefined {
  let out: TrackSpec[] | undefined;
  for (const tr of world.tracks) {
    if (tr.spec.mode === 'once') (out ??= []).push(tr.spec);
  }
  return out;
}

/** Live pooled lightwells (undefined when none stand — the common case). */
function wellsOf(world: World): WellW[] | undefined {
  let out: WellW[] | undefined;
  for (const d of world.lightwellDoodads()) {
    if (!d.well) continue;
    (out ??= []).push({
      i: d.well.id, k: d.kind, x: Math.round(d.pos.x), y: Math.round(d.pos.y),
      r: Math.round(d.radius * 10) / 10,
      pf: Math.round((d.well.max > 0 ? d.well.power / d.well.max : 0) * 1000) / 1000,
    });
  }
  return out;
}

/** Live structure-door states (id → state), or undefined when every door in the
 *  zone is still pristine (the common case ships zero bytes). */
function doorStatesOf(world: World): Record<string, 'open' | 'broken'> | undefined {
  let out: Record<string, 'open' | 'broken'> | undefined;
  for (const d of world.doodads) {
    if (!d.door || (!d.door.open && !d.door.broken)) continue;
    (out ??= {})[d.door.id] = d.door.broken ? 'broken' : 'open';
  }
  return out;
}

function seatW(s: Seat, world: World): SeatW {
  const a = s.actor;
  const seq = world.lastInputSeq.get(s.id);
  const surv = survivalOf(a);
  const row: SeatW = {
    pos: v2(a.pos),
    life: Math.max(0, Math.round(a.life)), maxLife: Math.round(a.maxLife()),
    mana: Math.max(0, Math.round(a.mana)), maxMana: Math.round(a.maxMana()),
    es: Math.round(a.es), maxEs: Math.round(a.maxEs()),
    dead: a.dead, downed: a.downed,
    ...ownCooldownsOf(a), // THE WIRE'S EYES: SeatW.cd, THE OWN ENTRY (its own socket alone hears it)
    ...ownGaugesOf(a), // THE WIRE'S EYES: SeatW.gg, THE OWN ENTRY
    ...ownNoteOf(s, world), // THE ACTING SEAT: SeatW.fn, the refusal note, THE OWN ENTRY
    ...ownSurgeOf(s, world), // THE ACTING SEAT: SeatW.lh, the low-life surge, THE OWN ENTRY
    ...ownRoadOf(s, world), // THE ROADS PER PLAYER: SeatW.rd, the road ring the host fills, THE OWN ENTRY
    ...(seq !== undefined ? { seq } : {}),
    ...(world.movementLocked(a) ? { rooted: true } : {}),
    ...(a.sheet.get('traction') < 0.999 ? { slippery: true } : {}),
    ...(surv ? { survival: surv } : {}),
  };
  // THE HONEST INPUT: the walk fold rides a WALKING seat's row (stepped within walkRowSec), so
  // a still seat's quiet snapshot carries none and the shell keeps the fold it last heard.
  if (world.time - a.lastMoveAt <= HONEST_INPUT_CFG.walkRowSec) row.spd = Math.round(a.walkSpeed() * 1000) / 1000;
  const trc = a.walkTraction();
  if (row.spd !== undefined && trc < 1) row.trc = Math.round(trc * 1000) / 1000; // THE HONEST INPUT: the traction under it (absent = firm)
  return row;
}

/** Below-max survival rows (undefined when none — full meters ship nothing). */
function survivalOf(a: Actor): Record<string, number> | undefined {
  if (!a.survival) return undefined;
  let out: Record<string, number> | undefined;
  for (const [res, v] of a.survival) {
    (out ??= {})[res] = Math.round(v * 10) / 10;
  }
  return out;
}

// ----------------------------------------------------------- apply (client) --
// Pool reconstructed actors by id across frames to limit GC churn.
const POOL = new Map<number, Actor>();
/** A shared stand-in owner so reconstructed minions report isMinion()===true. */
let MINION_OWNER: Actor | null = null;

/** Shortest-arc angle interpolation (facing wraps around ±π). */
function angLerp(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** CLIENT-SIDE drying ledger (the evap wire): position key → the LOCAL doodad
 *  mid-dry, per render-only guest world. Wire-scoped state, so it lives here
 *  rather than on World: a row's first arrival marks the piece TRACKED (adopt
 *  the standing doodad on the key, else mint it), and a tracked key's
 *  disappearance is the retire signal — the host's sweep spliced it dry (evap
 *  is never cancelled: the one `delete d.evap` in the engine is the terminal
 *  splice). Only ever touches pieces it saw drying, so an evap-less doodad
 *  can never be retired by absence. Keyed to the applied zone: a hop drops
 *  the ledger whole (stale keys can never retire a fresh zone's ground). */
const EVAP_LEDGER = new WeakMap<World, { zone: string | null; byKey: Map<string, Doodad> }>();

/** Converge the client's drying ground on the host's rows (the wells idiom —
 *  mint/restate/retire; idempotent, self-healing at 20 Hz). A free function,
 *  not a World method: everything it needs is public (doodads,
 *  markDoodadsChanged, rebuildClientTerrain), and the sweep itself stays
 *  host-only — no client doodad ever wears `evap`, so even a ticking guest
 *  world has an empty evaporation membership by construction. */
function applyNetEvap(world: World, rows: readonly EvapW[] | undefined): void {
  let led = EVAP_LEDGER.get(world);
  if (led && led.zone !== world.appliedZoneId) led = undefined; // zone hopped — old ledger is dead
  if (!led && !rows?.length) return;                            // nothing drying, nothing tracked
  if (!led) {
    led = { zone: world.appliedZoneId, byKey: new Map() };
    EVAP_LEDGER.set(world, led);
  }
  const key = (x: number, y: number): string => `${Math.round(x)},${Math.round(y)}`;
  const listed = new Set<string>();
  let membership = false;
  for (const row of rows ?? []) {
    const kk = key(row.x, row.y);
    listed.add(kk);
    let d = led.byKey.get(kk);
    if (!d) {
      // First sight: adopt the standing doodad on the key (a zone-listed
      // piece handed to evap — weather dress, a shipped pool), else MINT it
      // (planted after this client's join: rubble, a creep wake).
      d = world.doodads.find(x => !x.well && x.kind === row.k
        && Math.abs(x.pos.x - row.x) < 1.5 && Math.abs(x.pos.y - row.y) < 1.5);
      if (!d) {
        d = { pos: { x: row.x, y: row.y }, radius: row.r, kind: row.k as Doodad['kind'], ...(row.s ? { shallow: true } : {}) };
        world.doodads.push(d);
        membership = true;
      }
      led.byKey.set(kk, d);
    }
    if (d.radius !== row.r) {
      d.radius = row.r;
      world.markDoodadsChanged(d); // in-place radius edit — only this piece's families re-derive
    }
  }
  // The retire half: a TRACKED key gone from the wire means the host's sweep
  // spliced the piece dry — splice it here too (ground lists re-derive below).
  for (const [kk, d] of led.byKey) {
    if (listed.has(kk)) continue;
    led.byKey.delete(kk);
    const di = world.doodads.indexOf(d);
    if (di !== -1) { world.doodads.splice(di, 1); membership = true; }
  }
  // Membership moved (a mint or a splice): the bridge/ground collision lists
  // are derived from the doodad list — re-derive so a minted pool wades and a
  // retired one stops (the applyZone precedent; family caches ride the
  // length key and need nothing).
  if (membership) world.rebuildClientTerrain();
}

// --------------------------------------------------- THE WIRE'S EYES (client) --

/** The client's flight memory, per render world: where each flight (wire id) was last
 *  DRAWN, and, for the snapshot now gliding, where each one started its glide. */
interface FlightLedger { snap: StateSnapshot | null; from: Map<number, Vec2W>; drawn: Map<number, Vec2W> }
const FLIGHT_LEDGERS = new WeakMap<World, FlightLedger>();
function flightLedger(world: World, snap: StateSnapshot): FlightLedger {
  let l = FLIGHT_LEDGERS.get(world);
  if (!l) { l = { snap: null, from: new Map(), drawn: new Map() }; FLIGHT_LEDGERS.set(world, l); }
  if (l.snap !== snap) { l.snap = snap; l.from = l.drawn; l.drawn = new Map(); } // a new snapshot: the glide starts where the last frame drew
  return l;
}

/** One zone row as the render stub the zone painter and the hotbar read (the cast-stub
 *  idiom: the fields the renderer touches, nothing it could run). THE SPLIT: the stub is
 *  built once per adopted snapshot (its glide fields standing at the row's own values),
 *  and glideZoneStub re-sets its position, radius, facing and countdown each frame toward
 *  the same zone's row in `prev` (by wire id). A field riding a body (`ri`) sits on that
 *  pooled body at draw time (a getter), so a worn field follows the predicted own hero
 *  exactly. The countdown maps onto the painter's own clocks: delay = 1 - fill against a
 *  one-second fuse and `delay0` (the lob's comet). */
interface ZoneStub { at: { x: number; y: number }; radius: number; facing: number; delay: number }
function zoneStub(z: ZoneW, time: number): ZoneStub {
  const rider = z.ri !== undefined ? POOL.get(z.ri) : undefined;
  const at = { x: z.p[0], y: z.p[1] };
  const tier = z.tier ?? 0;
  return {
    at,
    get pos() { return rider ? rider.pos : at; },
    radius: z.r, color: z.c, shape: z.sh ?? 0,
    facing: z.f ?? 0,
    arcRad: z.arc, exploded: !!z.ex, linger: z.ex ? 1 : 0,
    delay: 1 - (z.ex ? 1 : z.fill ?? 0), delay0: z.lf ? 1 : undefined,
    tier, caster: (z.ci !== undefined ? POOL.get(z.ci) : undefined) ?? { tier },
    inst: { def: { id: z.sk ?? '', delivery: { telegraph: 1 } } },
    onGround: z.og, edgeFrac: z.ef, edge: z.ed,
    seg: z.seg ? { ax: z.seg[0], ay: z.seg[1], bx: z.seg[2], by: z.seg[3] } : undefined,
    aftershock: z.sa ? { readyAt: -Infinity } : undefined,
    volatile: z.sv ? {} : undefined,
    lobFrom: z.lf ? { x: z.lf[0], y: z.lf[1] } : undefined, lobArc: z.la,
    pulse: z.pr ? { left: 1, next: time + z.pr[0], radiusMult: z.pr[1] } : undefined,
    toggled: z.tg ? true : undefined,
  } as ZoneStub;
}
/** THE SPLIT's per-frame half of a zone stub: its row `z` glided from `pz` (the same zone in
 *  `prev`) by `alpha`; with no `pz` the row's own values stand. */
function glideZoneStub(stub: ZoneStub, z: ZoneW, pz: ZoneW | undefined, alpha: number): void {
  if (!pz) {
    stub.at.x = z.p[0]; stub.at.y = z.p[1]; stub.radius = z.r; stub.facing = z.f ?? 0;
    stub.delay = 1 - (z.ex ? 1 : z.fill ?? 0);
    return;
  }
  const lerp = (a: number, b: number): number => a + (b - a) * alpha;
  stub.at.x = lerp(pz.p[0], z.p[0]); stub.at.y = lerp(pz.p[1], z.p[1]);
  stub.radius = lerp(pz.r, z.r);
  stub.facing = pz.f !== undefined && z.f !== undefined ? angLerp(pz.f, z.f, alpha) : z.f ?? 0;
  stub.delay = 1 - (z.ex ? 1 : !pz.ex && pz.fill !== undefined ? lerp(pz.fill, z.fill ?? 0) : z.fill ?? 0);
}

/** THE WIRE'S EYES: the snapshot the own hero's cooldowns were last anchored to, per world. */
const CLOCK_ANCHORS = new WeakMap<World, StateSnapshot>();

/** THE WIRE'S EYES, the own hero's clocks (THE OWN ENTRY): a NEW snapshot re-anchors the
 *  cooldown maps the hotbar's sweep reads (tickNetClocks runs them down between snapshots);
 *  the gauge rows land on the bar's own instances on every adoption (a meta re-apply mints
 *  fresh ones), the bank set so the client's own gauge reads (fill, the gate's ready, the
 *  lock) answer what the host's did. */
function applyOwnClocks(world: World, snap: StateSnapshot, me: SeatW): void {
  const p = world.player;
  if (CLOCK_ANCHORS.get(world) !== snap) {
    CLOCK_ANCHORS.set(world, snap);
    p.cooldowns.clear();
    p.cooldownTotals.clear();
    for (const [id, [left, total]] of Object.entries(me.cd ?? {})) {
      p.cooldowns.set(id, left);
      p.cooldownTotals.set(id, total);
    }
  }
  for (const inst of p.skills) {
    const spec = inst?.def.gauge;
    if (!inst || !spec) continue;
    const row = me.gg?.[inst.def.id];
    const eff = p.gaugeEff(inst)!, floor = gaugeFloor(spec, eff), fill = (row?.[0] ?? 0) * eff.need;
    const st = (inst.state ??= {});
    st.gauge = Math.max(0, row?.[2] ? Math.max(fill, floor) : Math.min(fill, floor - 1e-3));
    st.gaugeLock = row?.[1] ? 1 : 0;
  }
}

/** THE WIRE'S EYES: run the own hero's cooldown clocks down between snapshots, once a frame
 *  in the client loop (an adoption re-anchors them on each new snapshot), at the hero's own
 *  recovery rate, so the hotbar's sweep moves at frame rate instead of 20 Hz. A clock that
 *  runs out drops, as the host's does. */
export function tickNetClocks(world: World, dt: number): void {
  const p = world.player;
  if (!p.cooldowns.size || !(dt > 0)) return;
  const rate = Math.max(0, p.sheet.get('cooldownRecovery'));
  for (const [id, left] of p.cooldowns) {
    const next = left - dt * rate;
    if (next <= 0) p.cooldowns.delete(id); else p.cooldowns.set(id, next);
  }
}

// ------------------------------------------- THE SMOOTH SHELL: THE SPLIT (client) --
// A snapshot is ADOPTED once, when it arrives (adoptSnapshot: every row that is state:
// actors made and dropped, statuses, cast stubs, cues, cosmetics, zones, flights, texts,
// the own build, the shelf, parties, pings), and each FRAME only INTERPOLATES
// (interpolateSnapshot: positions, facing, pose scalars, cast-bar fill, the flights'
// glide, worm segments). applySnapshot is the two halves back to back: what every
// headless rig and the co-op mirrors read is the old one-call apply, byte for byte.

/** The cast stubs adoptSnapshot built from the wire (the per-frame half refreshes their
 *  aim and fill); a shell's own predicted cast (net/shell.ts THE PREDICTED ROOT) is not one. */
const WIRE_CASTS = new WeakSet<object>();
/** Is this cast a wire stub (adopted from a snapshot row), not a cast the shell runs itself? */
export function isWireCast(cs: object | null | undefined): boolean { return !!cs && WIRE_CASTS.has(cs); }
/** The pings a snapshot shipped (THE ECHO LAW keeps only the shell's OWN unjudged marks). */
const SHIPPED_PINGS = new WeakSet<object>();
/** What one adoption built for the per-frame half: the flights and zone stubs, by row. */
interface Adopted { snap: StateSnapshot; flights: { pos: { x: number; y: number }; dir: number; age: number }[]; zones: Map<number, ZoneStub> }
const ADOPTED = new WeakMap<World, Adopted>();

/** THE SMOOTH SHELL's own-hero cast stub source: the host's own cast row names its skill
 *  (`CastW.sk`), so the shell's stub carries the REAL instance from its own bar, book or
 *  catalog: the replay's movement law (castMoveFactor, a guard's step, a channel's stride)
 *  reads it as the host does. A stub's bare def threw there (THE SMOOTH SHELL's find). */
function ownCastInst(world: World, a: Actor, sk: string): SkillInstance | undefined {
  const onBar = a.skills.find(s => s?.def.id === sk);
  if (onBar) return onBar;
  const known = world.localSeat?.meta.knownSkills.get(sk);
  if (known) return known;
  const def = SKILLS[sk];
  return def ? makeSkillInstance(def, 1, 0) : undefined;
}

export interface AdoptOptions {
  /** THE ECHO LAW (net/shell.ts): false holds the own build back (the shell has an
   *  optimistic action the host has not judged yet). Absent = always adopt. */
  metaGate?: (meta: SeatMetaW) => boolean;
  /** THE ECHO LAW on the ping row: keep the shell's own unjudged mark beside the host's list. */
  holdOwnPings?: boolean;
}

/** THE SPLIT, the arrival half: adopt a host snapshot onto a render-only client World (no
 *  sim runs). Rebuilds the entity arrays the renderer iterates and re-installs the StatSheet
 *  bases the renderer reads so maxLife()/invisible/detectability/casting work unchanged. A
 *  body seen before keeps the position the per-frame half last drew (interpolateSnapshot
 *  places it); a new body stands at its row. `prev` = the snapshot adopted before this one:
 *  the shelf and the account view it carried stand when this one carries none. */
export function adoptSnapshot(world: World, snap: StateSnapshot, prev?: StateSnapshot | null, opts?: AdoptOptions): void {
  if (snap.parties !== undefined) { world.partyRows = snap.parties; world.partyRev++; } // THE PARTY: absent = unchanged (read before any zone or vendor gate)
  if (snap.pings !== undefined) {
    // THE PING: the host's marks replace the shell's. THE ECHO LAW (net/shell.ts): while the
    // shell's own press waits for the host's judgment, its own mark stands beside the list.
    const me = world.clientSeatId;
    const pending = opts?.holdOwnPings ? world.pings.filter(p => p.seat === me && !SHIPPED_PINGS.has(p) && !snap.pings!.some(r => r.s === me)) : [];
    world.pings = snap.pings.map(r => { const p = { seat: r.s, pos: { x: r.p[0], y: r.p[1] }, tier: r.k, at: r.a, until: r.u }; SHIPPED_PINGS.add(p); return p; }).concat(pending);
  }
  if (!world.appliedZoneId || snap.zoneId === world.appliedZoneId) {
    world.syncedGrantedPockets = Object.fromEntries((snap.grantedPockets ?? []).map(r => [r.owner, r.pockets]));
  }
  world.arena.w = snap.arena.w;
  world.arena.h = snap.arena.h;

  // Structure doors: converge on the host's states through the SAME gate the
  // host used (client-side collision flip + grid repaint). Idempotent, so the
  // 20 Hz repeat is free; a missed packet heals on the next. Guarded on zone
  // identity: in the frames between applyZone(B) and the first zone-B
  // snapshot, a stale zone-A snapshot must not flip zone B's same-id doors.
  if (snap.doors && (!world.appliedZoneId || snap.zoneId === world.appliedZoneId)) {
    for (const [id, st] of Object.entries(snap.doors)) {
      world.setDoorState(id, st, { silent: true });
    }
  }
  // Secret hollows converge the same way (same zone-identity guard): the
  // client re-carves through the shared openHollow path in bare mode —
  // idempotent, so the 20 Hz repeat is free and a missed packet self-heals.
  if (snap.hollows && (!world.appliedZoneId || snap.zoneId === world.appliedZoneId)) {
    for (const id of snap.hollows) {
      world.openHollow(id, null, { silent: true, bare: true });
    }
  }
  // Revealed ANNEX pieces converge the same way (idempotent, zone-guarded):
  // the client's union — prediction clamp, nav, drawn face — joins the piece
  // the moment the row lands, however many packets it missed. BARE mode (the
  // openHollow law): carve + face dress only — furnish contents arrive on
  // the host's own doodad/actor streams.
  if (snap.annexes && (!world.appliedZoneId || snap.zoneId === world.appliedZoneId)) {
    for (const id of snap.annexes) world.annexReveal(id, { silent: true, bare: true });
  }
  // Runtime LANE state (trapworks levers): reconcile tagged arm flips + live
  // once-lanes every snapshot (undefined laneOnce truly means none stand —
  // the cull half of the wells idiom). Same zone-identity guard.
  if (!world.appliedZoneId || snap.zoneId === world.appliedZoneId) {
    world.setNetLaneState(snap.laneArm, snap.laneOnce);
    world.setNetTrapState(snap.trapState);
  }
  // Live pooled LIGHTWELLS + the zone's gloom (the Gloaming): converge the
  // local doodad list on the host's wells (upsert by id, absent = gone) and
  // hand the eased gloom scalar to the render inputs. Same zone guard.
  if (!world.appliedZoneId || snap.zoneId === world.appliedZoneId) {
    world.applyNetWells(snap.wells ?? []);
    world.titans.applyNet(snap.titans);
    world.setNetGloom(snap.gloom ?? 0);
    // THE RAMPAGE FABRIC's felled set — same idiom, same guard: the guest's
    // ground crushes and regrows exactly where the host's does.
    world.applyNetFell(snap.fell);
    // THE EVAPORATING GROUND — same idiom, same guard: the guest's drying
    // pieces shrink and retire exactly where (and as fast as) the host's do.
    applyNetEvap(world, snap.ev);
    // THE ENTRY FREEZE's mid-visit wire — same guard: while the host's front
    // holds this zone (dwf), run the SAME registry swap the host ran over our
    // own replicated doodads, so a guest standing in a zone the marching
    // front just swallowed walks (and predicts) ice, not water. On a true
    // conversion the wading lists re-derive (the applyNetEvap membership
    // precedent). Absence reverts nothing — the thaw arrives as the next
    // zone apply's ordinary re-mint, exactly as it does for the host.
    if (snap.dwf && world.freezeStandingWater()) world.rebuildClientTerrain();
  }
  // THE LITE TIER's draw list (engine/lite.ts): the client renders the
  // host's pool verbatim off this mirror — absent truly means empty (the
  // wells idiom; a dropped packet self-heals at the next reconcile).
  world.liteWire = snap.lt ?? null;

  if (!MINION_OWNER) MINION_OWNER = new Actor('owner', 'player', { x: 0, y: 0 });

  const seen = new Set<number>();
  const actors: Actor[] = [];
  const partyByseat = new Map<string, Actor>();
  for (const aw of snap.actors) {
    let a = POOL.get(aw.id);
    // THE SPLIT: a new body stands at its row; one seen before keeps where the per-frame
    // half last drew it (interpolateSnapshot places every body each frame).
    if (!a) { a = new Actor(aw.name, aw.team, { x: aw.p[0], y: aw.p[1] }); a.facing = aw.f; POOL.set(aw.id, a); }
    a.radius = aw.r; a.color = aw.c; a.shape = aw.sh;
    a.cosmeticLoadout = aw.cosmeticLoadout ? sanitizeCosmeticLoadout(aw.cosmeticLoadout) : EMPTY_COSMETIC_LOADOUT;
    a.cosmeticKind = aw.cosmeticKind === 'wisp' ? 'wisp' : undefined;
    a.team = aw.team; a.name = aw.name;
    a.life = aw.life; a.es = aw.es; a.absorbLayers.clear(); a.absorb = aw.ab ?? 0;
    a.hitFlash = aw.hf; a.downed = aw.downed; a.dead = aw.dead;
    a.bodyActionPose = aw.bodyActionPose ? { ...aw.bodyActionPose } : null;
    // THE HONEST INPUT: a predicting shell's OWN hero (a render shell, the one marker
    // main.ts installs: clientActionHook) walks its own gait, stamped once per frame by
    // the replay (net/predict.ts); every other body wears the host's pose.
    if (aw.seat === world.clientSeatId && world.clientActionHook) a.bodyWalkPose = undefined;
    else a.bodyWalkPose = aw.bodyWalkPose ? { ...aw.bodyWalkPose } : null;
    a.passive = aw.passive; a.untargetable = aw.ut;
    a.summonReform = aw.summonReform ? { remaining: aw.summonReform[0], duration: aw.summonReform[1], invulnerable: false, untargetable: false } : undefined;
    a.movementTether = aw.movementTether ? { ...aw.movementTether,
      point: { ...aw.movementTether.point }, safe: { ...aw.movementTether.safe } } : undefined;
    a.throngUnits = aw.thu; a.throngEgg = aw.the; a.throngRosterHud = aw.thr; a.hivecallHud = aw.hive; a.assaultHud = aw.assault; a.assaultOrbit = !!aw.assaultOrbit; a.assaultAura = !!aw.assaultAura;
    for (const inst of a.skills) if (inst?.def.throng) (inst.state ??= {}).throngEvolutionGauge = aw.thg?.[inst.def.id] ?? 0;
    a.throngWild = aw.tw; // husk kind → the client's own sight gate reads it
    a.grabHud = aw.gb;    // held meter mirror (cleared when absent — freed)
    a.plies = aw.pl ?? 0; a.pliesMax = aw.plm ?? 0; // ply pips (render-only)
    a.tier = aw.tr ?? 0; // tier layer (host-authoritative — draw/veil gate)
    // Player bar readouts (own hero + party): runes verbatim, combo chips
    // as host-computed rows the renderer prefers over local derivation.
    a.runes = aw.rn ?? [];
    // THE PRIMED POUR mirror (render-only): ids rebuild the hotbar
    // glints; chargesSpent never crosses — the release is host law.
    if (aw.pp?.length) a.primedPours = aw.pp.map(id => ({ skillId: id, chargesSpent: 0 }));
    else if (a.primedPours.length) a.primedPours = [];
    if (aw.seat) restoreFlaskChargeBanks(a, aw.fq, true);
    a.comboHud = aw.cb?.map(([id, lit, len, glow]) => ({ id, lit, len, glow })) ?? [];
    a.comboConditionHud = aw.cc?.map(([id, lit, len, remaining]) => ({ id, lit, len, remaining })) ?? [];
    // Mimic bank mirror (render/UI only — capture clocks stay host-side,
    // so mirrored entries carry at:0 and the client never prunes them).
    a.mimicBank = aw.mk ? aw.mk.map(([sid, src]) => ({ sid, src, at: 0 })) : null;
    a.mimicSel = aw.ms ?? null;
    a.aims = aw.aims !== false; // absent = aims (older hosts, ordinary bodies)
    a.wane = aw.wn ?? 0;
    a.owner = aw.mn ? MINION_OWNER : undefined;
    a.summonShell = aw.ss;
    a.shellGuard = aw.sg ? { ...aw.sg, breathe: aw.sg.breathe ? { ...aw.sg.breathe } : undefined } : undefined;
    a.poiseBroken = aw.pb === true;
    a.kind = aw.seat ? 'player' : undefined;
    a.adorn = aw.adorn;
    a.material = aw.mat;
    a.look = aw.lk;
    a.extraParts = aw.ep;
    // THE TELL FABRIC (engine/tells.ts): the client rebuilds the binding
    // list from its OWN registry (def + wired variant roll) and adopts the
    // host's derived scalars. Change-guarded both ways so the render dress
    // cache stays warm across snapshots that moved nothing.
    if (a.defId !== aw.defId || a.brainVariant !== aw.bv) {
      a.brainVariant = aw.bv;
      a.tellSpecs = aw.defId ? tellSpecsOf(MONSTERS[aw.defId], aw.bv) : undefined;
      a.tellRev++;
      // THE WATCH FABRIC: the posture comes from the client's OWN registry
      // (the tellSpecs law) — only derived scalars ride the wire.
      a.watch = aw.defId ? MONSTERS[aw.defId]?.watch : undefined;
    }
    // THE WATCH FABRIC's stamped sense + ladder (drawn == wired): adopt the
    // host's exact scan scalars; the ladder value banks at the local clock
    // (watchValueOf holds it through the grace, the next snapshot re-syncs
    // long before honest decay would diverge).
    if (aw.wp) {
      a.senseDetect = aw.wp[0];
      a.senseArcHalf = aw.wp[1];
      a.senseRearMul = aw.wp[2];
      a.senseAlerted = aw.wp[3] === 1;
      a.watchS = aw.wp[4];
      a.watchFedAt = world.time;
      a.watchRung = watchRungOf(aw.wp[4]);
    } else if (a.senseDetect !== 0) {
      a.senseDetect = 0;
      a.watchS = 0;
      a.watchRung = 0;
    }
    {
      const tl = aw.tl;
      const cur = a.tells;
      if (tl) {
        let same = !!cur && cur.length === tl.length;
        if (same && cur) for (let i = 0; i < tl.length; i++) if (cur[i] !== tl[i]) { same = false; break; }
        if (!same) { a.tells = tl.slice(); a.tellRev++; }
      } else if (cur?.some(v => v > 0)) {
        a.tells = undefined; a.tellRev++;
      }
    }
    a.rarity = aw.rarity as Actor['rarity'];
    a.magicPack = aw.magicPack ? { ...aw.magicPack } : undefined;
    a.encounterGroup = aw.encounterGroup ? { ...aw.encounterGroup } : undefined;
    a.encounterCue = aw.encounterCue ? { ...aw.encounterCue } : undefined;
    a.afflictionPressure = aw.afflictionPressure ? { ...aw.afflictionPressure } : undefined;
    a.armedCues = aw.armedCues?.map(cue => ({ ...cue }));
    a.reactiveCue = aw.reactiveCue ? { ...aw.reactiveCue, volatile: aw.reactiveCue.volatile ? { ...aw.reactiveCue.volatile } : undefined } : undefined;
    a.poolCues = aw.poolCues?.map(row => ({ ...row })) ?? [];
    a.payloadCues = aw.payloadCues?.map(row => ({ ...row, points: row.points?.map(p => ({ ...p })) })) ?? [];
    a.procCues = aw.procCues?.map(row => ({ ...row })) ?? [];
    a.anatomyCues = aw.anatomyCues ? cloneAnatomyCues(aw.anatomyCues) : { weakpoints: [], parts: [], segments: [] };
    a.feedingCues = aw.feedingCues ? cloneFeedingCues(aw.feedingCues) : { gains: [] };
    a.companionCues = aw.companionCues ? cloneCompanionCues(aw.companionCues) : { links: [], marks: [] };
    a.wardCueProfile = aw.wardCue?.profile;
    a.encounterOrder = aw.encounterOrder ? { ...aw.encounterOrder } : undefined;
    a.magicPackPower = aw.magicPackPower ?? 0;
    a.magicPackRole = aw.magicPackRole;
    a.magicPackDonors = aw.magicPackDonors ?? 0;
    a.magicPackPending = aw.magicPackPending ?? 0;
    a.defId = aw.defId;
    a.cosmeticSourceSkill = aw.cosmeticSourceSkill; // absent fields clear a previous cosmeticSummonSkill
    a.faction = aw.faction;
    // Host-computed boss-bar row (cleared when absent — pooled actors never
    // wear a stale marquee).
    a.netBossBar = aw.bb ? { pips: aw.bb[0], lit: aw.bb[1], hl: !!aw.bb[2] } : undefined;
    // The renderer reads maxLife()/maxEs() + invisible/detectability off the sheet.
    // EXCEPT the OWN hero's life/es maxes — those are owned by recalcSeat (from the
    // replicated meta), so setBase-ing the host's final value here would double it.
    if (aw.seat !== world.clientSeatId) {
      a.sheet.setBase('life', aw.maxLife);
      a.sheet.setBase('energyShield', aw.maxEs);
    }
    a.sheet.setBase('invisible', aw.inv ?? 0);
    a.sheet.setBase('detectability', aw.det ?? 1);
    a.sheet.setBase('concealment', aw.concealment ?? 0);
    a.concealmentExposedUntil = aw.concealmentExposedUntil ?? 0;
    // Reconstruct the FX sub-objects the renderer draws (stand-in nested objects
    // so renderer.ts stays untouched). Absent → cleared → that FX simply skips.
    a.statuses.length = 0;
    if (aw.st) for (const s of aw.st) a.statuses.push({ id: s.id, remaining: Number.isFinite(s.rem) ? s.rem! : 99, remainingKnown: Number.isFinite(s.rem), stacks: s.stacks, statusDuration: s.statusDuration, dps: 0, screenDot: s.dot ? true : undefined, sourceName: '', bankFrac: s.bk });
    // THE SMOOTH SHELL: the own hero's cast row names its skill (CastW.sk), and the stub
    // carries the real instance (ownCastInst), so the shell's replay walks a mobile cast,
    // a guard or a channel at the host's own factor instead of throwing on a bare def.
    const realInst = aw.cast?.sk !== undefined && aw.seat !== undefined && aw.seat === world.clientSeatId ? ownCastInst(world, a, aw.cast.sk) : undefined;
    a.casting = aw.cast ? ({
      // THE VENT-RIDE's broil: the client's cast stub carries the column
      // radius as a leap delivery with a vent, so the roil layer reads one
      // shape on both sides of the wire.
      inst: realInst ?? { def: { color: aw.cast.c, guard: aw.cast.guardArc !== undefined ? { arcDeg: aw.cast.guardArc } : undefined,
        delivery: aw.cast.vent !== undefined ? { type: 'leap', vent: { columnR: aw.cast.vent } } : undefined } },
      mode: aw.cast.mode, total: aw.cast.total, elapsed: aw.cast.elapsed,
      castingCompletion: aw.cast.castingCompletion,
      castingCue: aw.cast.castingCue ? { ...aw.cast.castingCue } : undefined,
      focusBroken: aw.cast.focusBroken,
      pulseTimer: aw.cast.pulseTimer, shield: aw.cast.shield, maxShield: aw.cast.maxShield,
      guardReleaseCue: aw.cast.guardReleaseCue ? { ...aw.cast.guardReleaseCue } : undefined,
      resolvedGuardArc: aw.cast.guardArc===undefined?undefined:aw.cast.guardArc*Math.PI/180,
      resolvedMeleeReach: aw.cast.meleeReach ? { ...aw.cast.meleeReach } : null,
      parryCue: aw.cast.parryCue, indicatorAt: aw.cast.indicatorAt, presses: aw.cast.presses, channelTime: aw.cast.channelTime,
      bashAt: aw.cast.bashAt, bashLow: aw.cast.bashLow, bashArmAt: aw.cast.bashArmAt,
      aim: { x: a.pos.x, y: a.pos.y }, held: false, baseMult: 1,
    } as unknown as CastingState) : null;
    if (a.casting) WIRE_CASTS.add(a.casting);
    a.activeAuras.clear();
    if (aw.auras) aw.auras.forEach((au, i) => a!.activeAuras.set('a' + i, ({ inst: { def: { color: au.c } }, radius: au.r, shape: au.sh } as unknown as ActiveAura)));
    a.construct = aw.con ? ({ kind: aw.con.kind, domeRadius: aw.con.domeRadius } as unknown as ConstructState) : undefined;
    a.fuse = aw.fuse;
    a.leap = aw.leap
      ? ({ timer: aw.leap.timer, total: aw.leap.total,
        vent: aw.leap.vent !== undefined ? { columnR: aw.leap.vent } : undefined,
        // THE WIRE'S EYES: a telegraphed dive's landing ring (drawZones reads dest, radius, telegraph).
        ...(aw.leap.telegraph !== undefined && aw.leap.dest
          ? { dest: { x: aw.leap.dest[0], y: aw.leap.dest[1] }, radius: aw.leap.radius ?? 0, telegraph: { color: aw.leap.telegraph } }
          : {}) } as unknown as LeapState)
      : undefined;
    if (aw.worm) {
      // The trailing segments stand at the row; the per-frame half glides them the
      // way the head is glided, so the body tracks it instead of stepping at 20 Hz.
      // SEGMENT FABRIC: torn bitmask → wounded[], flash countdowns, and the
      // kit-part looks re-resolved from the def registry (defId ships; the
      // strings never ride the wire) — the client draws the same solid
      // plated chain the host tested, tears and all.
      const seg = aw.worm.seg.map(s => ({ x: s[0], y: s[1] }));
      const wounded = aw.worm.wd !== undefined
        ? seg.map((_, i) => (aw.worm!.wd! & (1 << i)) !== 0)
        : undefined;
      const looks = aw.worm.ht && aw.defId ? MONSTERS[aw.defId]?.worm?.looks : undefined;
      a.worm = ({
        segments: seg, taper: aw.worm.taper, length: aw.worm.seg.length, spacing: 0,
        ...(aw.worm.ht ? { hittable: true } : {}),
        ...(wounded ? { wounded } : {}),
        ...(aw.worm.sf ? { flash: aw.worm.sf } : {}),
        ...(looks ? { looks } : {}),
      } as unknown as WormBody);
    } else {
      a.worm = undefined;
    }
    actors.push(a);
    seen.add(aw.id);
    if (aw.seat) partyByseat.set(aw.seat, a);
  }
  for (const id of POOL.keys()) if (!seen.has(id)) POOL.delete(id);
  // THE PACK LAYER's drawn bonds (engine/pack.ts): re-point each warded body
  // at its holder AFTER the whole roster exists — a holder may be serialized
  // after the bodies it empowers, and a one-frame-late line is a line that
  // flickers. Resolution goes through the same POOL the snapshot keys on, so
  // the client's own Actor.id (pooled and local) never enters it. Absent
  // `bl` CLEARS the pair: a pooled shell must never wear a stale court.
  for (let i = 0; i < snap.actors.length; i++) {
    const aw = snap.actors[i];
    const a = actors[i];
    const held = aw.bl !== undefined;
    a.bondHeld = held;
    a.bondFrom = held ? POOL.get(aw.bl!) : undefined;
    a.magicPackFrom = aw.magicPackFrom !== undefined ? POOL.get(aw.magicPackFrom) : undefined;
    a.wardCueSources = aw.wardCue?.sources.map(id => POOL.get(id)).filter((x): x is Actor => !!x);
    // companionCue endpoints follow the client's interpolated actors, not host IDs.
    if (a.companionCues) for (const link of a.companionCues.links) link.to.id = POOL.get(link.to.id)?.id ?? -1;
  }
  world.actors = actors;
  world.emergences = (snap.recoveryCues ?? []).flatMap(row => {
    const actor = POOL.get(row.actorId);
    return actor && actors.includes(actor) ? [{ ...cloneRecoveryCue(row), actorId: actor.id, held: false }] : [];
  });

  // Lightweight entities: plain render structs the renderer reads positionally. The
  // flights stand at their rows here; THE WIRE'S EYES' glide (interpolateSnapshot) moves
  // them each frame by their wire ids.
  const adopted: Adopted = { snap, flights: [], zones: new Map() };
  world.projectiles = snap.projectiles.map(p => {
    const row = { reflectedCue: p.reflectedCue,
      orbPaint: p.orbPaint ? { ...p.orbPaint } : undefined,
      pos: { x: p.p[0], y: p.p[1] }, dir: p.d, radius: p.r, color: p.c, shape: p.sh, age: p.a ?? 0, cosmeticMotif: p.cosmeticMotif,
      cosmeticProjectile: cosmeticStyle(COSMETIC_PROJECTILES, p.cosmeticProjectile) ? p.cosmeticProjectile : undefined,
    };
    adopted.flights.push(row);
    return row;
  }) as unknown as World['projectiles'];
  // THE WIRE'S EYES: a band's ends ride the client's own bodies (the endpoints' host ids,
  // the `bl` idiom) at DRAW time, so a beam follows interpolated and predicted bodies
  // alike; the shipped coords stand in for an end this client does not hold.
  world.tethers = (snap.tethers ?? []).map(t => {
    const A = t.ai !== undefined ? POOL.get(t.ai) : undefined, B = t.bi !== undefined ? POOL.get(t.bi) : undefined;
    return {
      get ax() { return A ? A.pos.x : t.ax; }, get ay() { return A ? A.pos.y : t.ay; },
      get bx() { return B ? B.pos.x : t.bx; }, get by() { return B ? B.pos.y : t.by; },
      color: t.c, width: t.w,
    };
  }) as unknown as World['tethers'];
  // THE WIRE'S EYES: the host's ground telegraphs and fields as render stubs (the cast-stub
  // idiom): drawn, never run (no client update touches world.zones; absent = none stand).
  // A row seen in `prev` glides by its wire id each frame; a field riding a body sits on it.
  world.zones = (snap.zones ?? []).map(z => {
    const stub = zoneStub(z, snap.time);
    adopted.zones.set(z.id, stub);
    return stub;
  }) as unknown as World['zones'];
  ADOPTED.set(world, adopted);
  world.townPortalClientViews = (snap.townPortalViews ?? []).map(p => ({ ...p,
    cosmeticLoadout: sanitizeCosmeticLoadout(p.cosmeticLoadout) }));
  world.drops = snap.drops.map(d => ({
    pos: { x: d.p[0], y: d.p[1] }, bob: d.bob,
    item: d.kind === 'support'
      ? { kind: 'support', gem: { def: { color: d.color, name: d.name ?? '?' }, level: 1 } }
      : d.kind === 'gear'
        // Render-shell gear: base identity resolves the shared inventory glyph.
        ? { kind: 'gear', item: { name: d.name ?? '?', rarity: (d.rarity ?? 'common'), baseId: d.baseId ?? '', ...(d.dropUid === undefined ? {} : { uid: d.dropUid }) } }
        : d.kind === 'vestige'
          ? { kind: 'vestige', id: d.vid ?? '', count: 1 }
          : d.kind === 'essence'
            ? { kind: 'essence', essence: d.eid ?? 'coarse', count: d.cnt ?? 1 }
            : d.kind === 'abilityEssence'
              ? { kind: 'abilityEssence', tier: d.tid ?? 1, count: d.cnt ?? 1 }
              : { kind: 'skill', inst: { def: { color: d.color, name: d.name ?? '?' }, rarity: d.rarity ?? 'common' } },
  })) as unknown as World['drops'];
  world.magicPackEffects = (snap.magicPackEffects ?? []).map(v => ({ ...v }));
  world.satellites.visuals = (snap.satellites ?? []).map(v => ({ ...v }));
  world.guardArts.visuals = (snap.guardArts ?? []).map(v => ({ ...v }));
  world.auroras.visuals = (snap.auroras ?? []).map(v => ({ ...v }));
  world.guardians.visuals = (snap.guardians ?? []).map(v => ({ ...v }));
  world.creepers.visuals = (snap.creepers ?? []).map(v => ({ ...v, trail: v.trail.map(p => ({ ...p })) }));
  world.satellites.flights.visuals = (snap.satelliteFlights ?? []).map(v => ({ ...v, from: { ...v.from }, to: { ...v.to } }));
  world.orbs = snap.orbs.map(o => ({ pos: { x: o.p[0], y: o.p[1] }, bob: o.bob, life: o.life, kind: o.kind, amount: 0 })) as unknown as World['orbs'];
  world.texts = snap.texts.map(t => ({ pos: { x: t.p[0], y: t.p[1] }, life: t.life, maxLife: t.maxLife, size: t.size, color: t.color, text: t.text, kind: t.k, ...(t.yieldToCombat ? { yieldToCombat: true } : {}), ...(t.dropUid === undefined ? {} : { dropUid: t.dropUid }),
    ...(t.o === undefined ? {} : { seat: t.o }) })) as unknown as World['texts']; // THE WIRE'S EYES: a combat number's owner seat
  world.notices = (snap.no ?? []).map(n => ({ text: n.text, color: n.color, size: n.size, channel: n.ch, bornAt: n.born }));
  world.pickupFeed = (snap.pfd ?? []).map(e => ({ seatId: e.s, label: e.l, color: e.c, count: e.n, bornAt: e.born }));
  world.flashes = snap.flashes.map(f => ({ combatCue: f.combatCue ? { ...f.combatCue } : undefined, pos: { x: f.p[0], y: f.p[1] }, radius: f.radius, color: f.color, life: f.life, maxLife: f.maxLife,
    feedingCue: f.feedingCue ? { ...f.feedingCue, to: { ...f.feedingCue.to } } : undefined,
    companionCue: f.companionCue ? { ...f.companionCue, from: f.companionCue.from && { ...f.companionCue.from } } : undefined,
    recoveryCueTier: f.recoveryCueTier,
    defenseCue: f.defenseCue ? { ...f.defenseCue } : undefined, fx: f.fx, cosmeticMotif: f.cosmeticMotif, departure: f.departure, bolt: f.bolt, meteor: f.meteor })) as unknown as World['flashes'];
  // THE EYECATCH — re-stamped against the CLIENT's own raw clock (elapsed →
  // local t0); an absent row clears the pane with the host's (engine/ultimates.ts).
  world.eyecatch = snap.ec ? {
    casterId: snap.ec.ci, skillId: snap.ec.sk, style: snap.ec.st,
    title: snap.ec.ti, sub: snap.ec.sb, tint: snap.ec.tn, side: snap.ec.sd,
    t0: world.timeflow.age - snap.ec.el, paneSec: snap.ec.ps,
    avatarDefId: snap.ec.av,
  } : null;
  // Render-only telegraph: the client draws these but never advances them (no updateDeathBursts
  // runs client-side). Only the fields drawDeathBursts touches are carried; sim fields are inert.
  // `team` rides tm (THE SPARED RING's read): absent on an old host's wire it stays undefined,
  // which compares unequal to every hero team — the full-strength fallback by construction.
  world.deathBursts = (snap.deathBursts ?? []).map(b => ({
    pos: { x: b.p[0], y: b.p[1] }, phase: b.ph === 0 ? 'gather' : 'orb', radius: b.r, color: b.c,
    arming: b.arm === 1, t: b.t, coalesce: b.co, trail: b.trail.map(tp => ({ x: tp[0], y: tp[1] })),
    team: b.tm,
  })) as unknown as World['deathBursts'];
  // Mirror the host's authoritative vendor stock so the smith panel renders the
  // real wares and a buyVendor index resolves against the SAME list host-side.
  // THE SHELF BEAT: the rows ride on a change and on the beat (absent = unchanged); a
  // snapshot the client never applied still delivers its change through `prev`, the
  // newest carrier winning (THE SPLIT adopts every arrival, so this is the old lane's net).
  const shelf = shelfRowsFor(world, snap, prev); // THE SHELF PER BUYER: the own seat's shelf on a hosted world
  if (shelf?.vendor) {
    const locks: { entry: VendorEntry; idx: number; commission?: boolean }[] = [];
    world.vendorStock = shelf.vendor
      .map((w, i) => {
        const e = rehydrateVendor(w);
        if (e && w.lk) locks.push({ entry: e, idx: i, ...(w.lk === 2 ? { commission: true } : {}) });
        return e;
      })
      .filter((e): e is VendorEntry => !!e);
    // Re-anchor after the null-filter so lock seats match the drawn list.
    for (const r of locks) r.idx = world.vendorStock.indexOf(r.entry);
    // A PROJECTION hold (host-authoritative flags, self-healing at 20 Hz):
    // the panel's one read path (vendorEntryHold) now answers identically
    // on host and client. The client never resolves or persists it.
    world.vendorHolds['brandt'] = { locks, watchedSec: 0 };
    world.vendorRestockAt = shelf.vendorRestockAt ?? world.vendorRestockAt;
    world.netVendorCap = shelf.vendorCap;
  }
  {
    // THE KEEPER'S GATE + the boards ride every snapshot (the shelf's beat is its own).
    const access = snap.memoryAccess ?? prev?.memoryAccess; // THE WIRE DISCIPLINE: absent = unchanged (the newest carrier wins)
    if (access !== undefined) world.netMemoryAccess = access;
    world.netVendorTradeOpen = snap.vendorTradeOpen;
    world.netVendorGemsOpen = snap.vendorGemsOpen;
    world.netBagBoard = snap.bagBoard;
    // Absent whole = an older host with no side boards: none exist here.
    world.netContainerBoards = snap.containerBoards ?? {};
  }

  // The client's OWN hero arrives as a POOLED actor (in world.actors). Make
  // world.player (the camera/HUD anchor AND the renderer's "no overhead bar"
  // identity) BE that same object, so the own hero draws ONCE with no floating
  // bar — matching host/SP. Then patch the per-seat HUD values (mana/maxMana
  // aren't on ActorW, so they must come from SeatW).
  const own = partyByseat.get(world.clientSeatId);
  if (own) world.localSeat.actor = own;
  // LAYER 2 — apply the replicated OWN-seat build FIRST (when it changed), so the
  // char-sheet / skill-book / tree read correct values and recalcSeat owns the
  // resource maxes + derived stats before the per-frame patch runs. THE ECHO LAW: a
  // shell's gate holds back a build older than its own newest optimistic action.
  const myMeta = snap.seatMeta?.[world.clientSeatId];
  if (myMeta && (!opts?.metaGate || opts.metaGate(myMeta))) applySeatMeta(world, world.localSeat, myMeta);
  const me = snap.seats[world.clientSeatId];
  if (me) applyOwnClocks(world, snap, me); // THE WIRE'S EYES: the own hero's cooldown and gauge rows
  if (me) {
    const p = world.player;
    // CURRENT resources come from the per-tick SeatW; the MAXES come from
    // recalcSeat (the replicated meta) — so we never setBase them here (that would
    // double-count against recalcSeat's sources).
    p.life = me.life; p.mana = me.mana; p.es = me.es;
    p.dead = me.dead; p.downed = me.downed;
    // THE HONEST INPUT: our hero predicts at the host's walk fold (its row's spd/trc),
    // never the shell's own sheet, whose statuses are display stubs. A still seat's row
    // carries none: the fold last heard stands (a fresh shell walks its own sheet).
    if (me.spd !== undefined) { const ow = world.ownWalk ??= { spd: 0, trc: 1 }; ow.spd = me.spd; ow.trc = me.trc ?? 1; }
    // Environmental-survival meters: rebuild the own hero's map from the wire
    // so the registry-driven HUD bars (breath, light) draw exactly as on the
    // host. Absent on the wire = every meter full = no map (bars hidden).
    if (me.survival) {
      p.survival ??= new Map();
      for (const k of [...p.survival.keys()]) if (!(k in me.survival)) p.survival.delete(k);
      for (const [k, v] of Object.entries(me.survival)) p.survival.set(k, v);
    } else if (p.survival?.size) {
      p.survival.clear();
    }
  }

  // Rebuild the party strip from seat-tagged actors (events don't fire on a client).
  world.party.members.length = 0;
  for (const [seat, actor] of partyByseat) {
    world.party.members.push({ actor, seat, local: seat === world.clientSeatId });
  }
  // THE COUNTERS AND THE JOURNAL (net/journalWire.ts): the own journal and rite rows are state,
  // adopted once per arrival (a hosted world's alone; a co-op shell never hears them).
  applyCounterRows(world, snap);
}

/** A snapshot's actor rows by host id, built once per snapshot (snapshots never change once
 *  they arrive): the per-frame half reads the pair's rows every frame. */
const ROWS_BY_ID = new WeakMap<StateSnapshot, Map<number, ActorW>>();
function actorRowsById(s: StateSnapshot): Map<number, ActorW> {
  let m = ROWS_BY_ID.get(s);
  if (!m) { m = new Map(s.actors.map(r => [r.id, r])); ROWS_BY_ID.set(s, m); }
  return m;
}

/** One timing the per-frame half reads: the two snapshots it glides between, the fraction
 *  between them, and the seconds past the newer one (a late link's run-on). */
export interface InterpFrame { prev: StateSnapshot | null; snap: StateSnapshot; alpha: number; ahead: number }
export interface InterpOptions {
  /** THE JITTER BUFFER (net/shell.ts): the bodies' own timing (the pair bracketing the render
   *  clock, which runs behind the server); absent = the eyes' timing below. */
  bodies?: InterpFrame;
  /** Starved past the newer snapshot, a body runs on along its velocity at most this many
   *  seconds, then holds (0 = the old law: bodies stand at the newer row). */
  runOn?: number;
}

/** THE SPLIT, the per-frame half: place what the arrival half adopted. `prev`, `snap`,
 *  `alpha` and `ahead` are THE WIRE'S EYES' timing (the clock the renderer reads, the
 *  flights' glide and run-on, the zone stubs' glide, all over the newest adopted pair);
 *  the bodies (positions, facing, the pose scalars, cast-bar fill, worm segments) ride
 *  `opts.bodies` when given (THE JITTER BUFFER), else the same timing. */
export function interpolateSnapshot(world: World, prev: StateSnapshot | null | undefined, snap: StateSnapshot, alpha = 1, ahead = 0, opts?: InterpOptions): void {
  const lerping = !!prev && alpha < 1;
  // The shared clock interpolates exactly like actor positions do: every
  // time-driven read on the client (painter sway, projectile form phase,
  // TRACK RIDER POSES: trackPose is a pure function of this clock) glides
  // at render rate instead of stepping at the 20 Hz wire. Monotonic: alpha
  // walks prev.time → snap.time, and snapshots only move forward.
  world.time = prev && alpha < 1 ? prev.time + (snap.time - prev.time) * alpha : snap.time;

  // THE BODIES: each pooled body placed between its rows in the bodies' pair (a body the
  // pair does not hold yet stands where it was adopted).
  const B = opts?.bodies ?? { prev: prev ?? null, snap, alpha, ahead };
  const bLerp = !!B.prev && B.alpha < 1;
  const span = B.prev ? B.snap.time - B.prev.time : 0;
  const runOn = opts?.runOn && span > 0 ? Math.min(Math.max(0, B.ahead), opts.runOn) : 0;
  const bPrevById = B.prev && (bLerp || runOn > 0) ? actorRowsById(B.prev) : null;
  const ownPredicted = (aw: ActorW): boolean => aw.seat !== undefined && aw.seat === world.clientSeatId && !!world.clientActionHook;
  let sawOwn = false;
  for (const aw of B.snap.actors) {
    if (aw.seat !== undefined && aw.seat === world.clientSeatId) sawOwn = true;
    const a = POOL.get(aw.id);
    if (!a) continue; // gone at a newer adoption
    // THE JITTER BUFFER delays the OTHER bodies: a predicting shell's own hero is its own
    // (net/shell.ts places it, faces it and runs its bar on the present clock).
    if (opts?.bodies && ownPredicted(aw)) continue;
    const pa = bPrevById?.get(aw.id);
    if (bLerp && pa) {
      a.pos.x = pa.p[0] + (aw.p[0] - pa.p[0]) * B.alpha;
      a.pos.y = pa.p[1] + (aw.p[1] - pa.p[1]) * B.alpha;
      a.facing = angLerp(pa.f, aw.f, B.alpha);
    } else if (runOn > 0 && pa) {
      // THE JITTER BUFFER, starved: run on along the body's own velocity, capped (then hold).
      a.pos.x = aw.p[0] + (aw.p[0] - pa.p[0]) / span * runOn;
      a.pos.y = aw.p[1] + (aw.p[1] - pa.p[1]) / span * runOn;
      a.facing = aw.f;
    } else {
      a.pos.x = aw.p[0]; a.pos.y = aw.p[1]; a.facing = aw.f;
    }
    // THE POSE SCALARS glide between the pair's poses (a pose the pair does not hold
    // in both rows stands at its adopted values).
    const pw = a.bodyWalkPose, rw = aw.bodyWalkPose, pwPrev = pa?.bodyWalkPose;
    if (pw && rw) {
      if (bLerp && pwPrev) {
        pw.travel = rw.travel >= pwPrev.travel ? pwPrev.travel + (rw.travel - pwPrev.travel) * B.alpha : rw.travel;
        pw.direction = angLerp(pwPrev.direction, rw.direction, B.alpha);
        pw.weight = pwPrev.weight + (rw.weight - pwPrev.weight) * B.alpha;
      } else { pw.travel = rw.travel; pw.direction = rw.direction; pw.weight = rw.weight; }
    }
    const pb = a.bodyActionPose, rb = aw.bodyActionPose, pbPrev = pa?.bodyActionPose;
    if (pb && rb) {
      const l = (x: number, y: number): number => (bLerp && pbPrev ? x + (y - x) * B.alpha : y);
      pb.shift = l(pbPrev?.shift ?? rb.shift, rb.shift); pb.turn = l(pbPrev?.turn ?? rb.turn, rb.turn);
      pb.sx = l(pbPrev?.sx ?? rb.sx, rb.sx); pb.sy = l(pbPrev?.sy ?? rb.sy, rb.sy);
      pb.facing = bLerp && pbPrev ? angLerp(pbPrev.facing, rb.facing, B.alpha) : rb.facing;
      if (rb.prepare !== undefined) pb.prepare = l(pbPrev?.prepare ?? rb.prepare, rb.prepare);
      if (rb.strike !== undefined) pb.strike = l(pbPrev?.strike ?? rb.strike, rb.strike);
    }
    // THE CAST-BAR FILL glides between the pair's rows of one running cast (the own
    // predicting hero's bar runs on the shell's own clock: net/shell.ts).
    const cs = a.casting;
    if (cs && WIRE_CASTS.has(cs)) {
      const rc = aw.cast, pc = pa?.cast;
      if (rc && !ownPredicted(aw)) {
        const same = bLerp && !!pc && pc.mode === rc.mode;
        cs.elapsed = same && rc.elapsed >= pc!.elapsed ? pc!.elapsed + (rc.elapsed - pc!.elapsed) * B.alpha : rc.elapsed;
        if (rc.pulseTimer !== undefined) cs.pulseTimer = same && pc!.pulseTimer !== undefined && rc.pulseTimer <= pc!.pulseTimer
          ? pc!.pulseTimer + (rc.pulseTimer - pc!.pulseTimer) * B.alpha : rc.pulseTimer;
      }
      cs.aim.x = a.pos.x; cs.aim.y = a.pos.y;
    }
    // WORM SEGMENTS glide the way the head does.
    if (a.worm && aw.worm) {
      const segs = a.worm.segments, paw = pa?.worm;
      for (let i = 0; i < segs.length && i < aw.worm.seg.length; i++) {
        const s = aw.worm.seg[i], ps = paw?.seg[i];
        if (ps && bLerp) { segs[i].x = ps[0] + (s[0] - ps[0]) * B.alpha; segs[i].y = ps[1] + (s[1] - ps[1]) * B.alpha; }
        else { segs[i].x = s[0]; segs[i].y = s[1]; }
      }
    }
  }

  // THE WIRE'S EYES, the eyes' timing: a flight seen before glides by its wire id from
  // where it was last DRAWN to the newest snapshot (so a late snapshot's flight resumes from
  // where it flew, never snaps back), and past the newest one it flies on along its `v`
  // (projAheadSec). THE FORWARD LAW: a glide never runs a flight backward against its own
  // `v` (a flight that flew on past where the next snapshot found it holds until the wire
  // catches up).
  const adopted = ADOPTED.get(world);
  if (adopted && adopted.snap === snap) {
    const flight = flightLedger(world, snap);
    const prevFlights = lerping ? new Map(prev!.projectiles.flatMap(p => (p.id !== undefined ? [[p.id, p] as const] : []))) : null;
    const flyOn = Math.min(Math.max(0, ahead), WIRE_CFG.eyes.projAheadSec);
    for (let i = 0; i < snap.projectiles.length; i++) {
      const p = snap.projectiles[i], out = adopted.flights[i];
      if (!out) continue;
      let x = p.p[0], y = p.p[1], dir = p.d, age = p.a ?? 0;
      if (p.id !== undefined) {
        const pp = prevFlights?.get(p.id);
        const from = flight.from.get(p.id) ?? pp?.p;
        if (lerping && from) {
          x = from[0] + (x - from[0]) * alpha; y = from[1] + (y - from[1]) * alpha;
          if (pp) { dir = angLerp(pp.d, p.d, alpha); age = (pp.a ?? 0) + (age - (pp.a ?? 0)) * alpha; }
        } else if (flyOn > 0 && p.v) {
          x += p.v[0] * flyOn; y += p.v[1] * flyOn; age += flyOn;
        }
        const last = flight.drawn.get(p.id) ?? flight.from.get(p.id);
        if (last && p.v && (x - last[0]) * p.v[0] + (y - last[1]) * p.v[1] < 0) { x = last[0]; y = last[1]; } // THE FORWARD LAW
        flight.drawn.set(p.id, [x, y]);
      }
      out.pos.x = x; out.pos.y = y; out.dir = dir; out.age = age;
    }
    // THE WIRE'S EYES: the zone stubs glide by wire id (a riding field sits on its body).
    const prevZones = lerping && prev!.zones ? new Map(prev!.zones.map(z => [z.id, z])) : null;
    for (const z of snap.zones ?? []) {
      const stub = adopted.zones.get(z.id);
      if (stub) glideZoneStub(stub, z, prevZones?.get(z.id), lerping ? alpha : 1);
    }
  }

  // The own hero when it is no pooled body (never on a seated shell): the seat's own row.
  const me = B.snap.seats[world.clientSeatId];
  if (me && !sawOwn) {
    const p = world.player, pme = B.prev?.seats[world.clientSeatId];
    p.pos.x = bLerp && pme ? pme.pos[0] + (me.pos[0] - pme.pos[0]) * B.alpha : me.pos[0];
    p.pos.y = bLerp && pme ? pme.pos[1] + (me.pos[1] - pme.pos[1]) * B.alpha : me.pos[1];
  }
}

/** Apply a host snapshot onto a render-only client World in one call: THE SPLIT's two
 *  halves back to back (adopt, then place). When `prev` + `alpha` (0..1) are given, the
 *  bodies, the clock and the zones glide prev→snap; `ahead` = THE WIRE'S EYES: seconds the
 *  client has run past the newest snapshot (a late one), which a flight spends flying on
 *  along its `v`. A live shell adopts on arrival and places each frame instead
 *  (net/shell.ts). */
export function applySnapshot(world: World, snap: StateSnapshot, prev?: StateSnapshot | null, alpha = 1, ahead = 0): void {
  adoptSnapshot(world, snap, prev);
  interpolateSnapshot(world, prev, snap, alpha, ahead);
}

// ----------------------------------------------------- zone terrain (P5) -----
// Shipped ONCE per host loadZone (not per tick), so the client renders the host's
// actual terrain. MVP scope: the in-zone view (floor theme, doodads, exits,
// waypoint). Interactive furniture (shrines/altars/chests/fonts) + the minimap
// graph stay client-local — they don't render-block and aren't worth the bytes.

export interface DoodadW {
  p: Vec2W; r: number; kind: string; dir?: number; shallow?: boolean; rot?: number; adorn?: string;
  /** Per-stamp FALL-ABLE override (the pitfall fabric — Doodad.fall): the
   *  client's predicted pit confine must grasp/arrest exactly as the host's
   *  does. Kind-level pits (DoodadRule.fall) need no wire — this ships only
   *  the stamps that overrode their rule. */
  fall?: boolean;
  /** OVERGROWN way disc (clearway fabric): the client's groundAt must skip the
   *  worn-pace claim exactly as the host's does — a swallowed stretch may not
   *  boost a guest it slows for the host. */
  wild?: boolean;
  /** Door state (kind 'door'): id + open/broken + cell rect, so the client's
   *  predicted collision + render + grid repaint mirror the host's doors. */
  door?: DoodadDoor;
  /** The hollow this seam seals (hollows fabric) — ids match ZoneMsg.hollows. */
  hollow?: string;
  /** The annex this face seals (the growing zone) — ids match the arena's
   *  pieces + ZoneMsg.annexSpecs; the client's pop prediction never fires
   *  (brittle authority is host-side), but the tell must draw. */
  annex?: string;
  /** The true collision surface (hit-surface fabric) — shipped so the
   *  client's predicted clampPos squeezes a doorway exactly as the host's
   *  does (boundR is re-derived client-side at index rebuild). */
  hitbox?: HitShape;
}
export interface ExitW {
  p: Vec2W; r: number; to: string; label: string;
  /** Boundary-gate treatment id (data/boundaryGates.ts) — crosses like the
   *  label so client portals wear the enclave's accent/glyph/ring. */
  b?: string;
}
export interface ZoneMsg {
  zoneId: string; name: string; level: number;
  /** Baked regional identity for the current locale, optional on old peers. */
  journey?: CourseJourney;
  locale?: ZoneDef['locale'];
  complex?: ZoneDef['complex'];
  destination?: ZoneDef['destination'];
  /** Host-resolved geographic context; never sample the client's world field. */
  geo?: ZoneDef['geo'];
  /** The zone's DIMENSION ('surface' omitted) — the client's map tab, dimension
   *  seals, and any dimension-scoped rendering read the same plane the host is
   *  in (a client in hell must not paint surface weather over it). */
  dimension?: string;
  /** Arena box + THE COMPOSITE BOUND's pieces (geometry + open state at zone
   *  send — the client's prediction clamp and drawn face read the same union
   *  the host tests; mid-play reveals converge via StateSnapshot.annexes).
   *  Seeds stay host-side (the annex mint is the host's business). */
  arena: {
    w: number; h: number; shape: ZoneShape;
    pieces?: { id: string; x: number; y: number; w: number; h: number; shape?: ZoneShape; active?: boolean }[];
  };
  theme: ZoneTheme;
  doodads: DoodadW[];
  exits: ExitW[];
  waypoint: Vec2W | null;
  /** A non-convex zone's walkability grid (Phase 2/3), packed (region kinds, mask
   *  derived); null for convex zones. Shipped so a co-op client's movement
   *  PREDICTION (clampPos) keeps the hero on the same walkable ground the host does. */
  walk: PackedWalk | null;
  /** Plan structures (rects/roofs/doors/slots) — the client's roof-reveal pass
   *  and door rendering read the same record the host does. */
  structures?: PlacedStructure[];
  /** SECRET HOLLOWS (the hollows fabric): the zone's specs, so a client can
   *  carve a mid-play reveal (StateSnapshot.hollows) exactly where the host
   *  did. The shipped walk grid already arrives pre-carved for anything
   *  opened before the client stepped in. */
  hollows?: HollowSpec[];
  /** SEALED ANNEX FACES (the growing zone): the zone's reveal records, so a
   *  client can carve + dress a mid-play reveal (StateSnapshot.annexes)
   *  exactly where the host did — seedless like the pieces themselves (the
   *  furnish stream is host business; contents ride the doodad/actor
   *  channels). The shipped walk grid arrives pre-carved for anything
   *  opened before the client stepped in. */
  annexSpecs?: AnnexSpec[];
  /** MOVING-HAZARD LANES (the track fabric): the host's placed specs,
   *  verbatim. Geometry is the WHOLE wire — rider poses derive from the
   *  synced clock on both sides (trackPose is pure), so lanes cost zero
   *  steady-state bytes and can never desync mid-zone. */
  tracks?: TrackSpec[];
  /** TRAPWORK MECHANISMS (the trapworks fabric): the host's placed specs —
   *  the client renders tells/rakes and replays sprung mirrors; all
   *  authority (sweeps, springs, credit) stays host-side. */
  trapworks?: TrapworkSpec[];
  /** THE CLIENT'S COUNTERS (net/journalWire.ts, hosted worlds alone): each station's piece as
   *  the host resolved it, by spot (`a` the structure id, `s` the town site, `t` its story),
   *  the Sacrificial Fonts, and the station features the host owns (THE KEEPER'S GATE for the
   *  client's lingers). */
  anchors?: { p: Vec2W; a: string; s: string; t?: number }[];
  fonts?: { p: Vec2W; t?: number }[];
  counters?: string[];
}

export function serializeZone(world: World): ZoneMsg {
  return {
    zoneId: world.zone.id, name: world.zone.name, level: world.zone.level,
    ...(world.zone.locale ? { locale: structuredClone(world.zone.locale) } : {}),
    ...(world.zone.complex ? { complex: { ...world.zone.complex } } : {}),
    ...(world.zone.destination ? { destination: structuredClone(world.zone.destination) } : {}),
    ...(world.zone.journey ? { journey: { ...world.zone.journey } } : {}),
    ...(world.zone.geo ? { geo: structuredClone(world.zone.geo) } : {}),
    dimension: world.zone.dimension,
    arena: {
      w: world.arena.w, h: world.arena.h, shape: world.arena.shape,
      ...(world.arena.pieces?.length ? {
        pieces: world.arena.pieces.map(pc => ({
          id: pc.id, x: pc.x, y: pc.y, w: pc.w, h: pc.h,
          ...(pc.shape ? { shape: pc.shape } : {}),
          ...(pc.active ? { active: true } : {}),
        })),
      } : {}),
    },
    theme: world.zone.theme,
    // Pooled LIGHTWELLS are excluded on purpose: they ride the per-tick
    // wells channel EXCLUSIVELY (a copy here would arrive stateless and
    // duplicate the reconciled one).
    doodads: world.doodads.filter(d => !d.well && !world.titans.owns(d)).map(d => ({ p: v2(d.pos), r: d.radius, kind: d.kind, dir: d.dir, shallow: d.shallow, rot: d.rot, adorn: d.adorn, door: d.door, hitbox: d.hitbox, hollow: d.hollow, annex: d.annex, wild: d.wild, fall: d.fall })),
    exits: world.exits.map(e => ({ p: v2(e.pos), r: e.radius, to: e.to, label: e.label, b: e.boundary })),
    waypoint: world.waypointPos ? v2(world.waypointPos) : null,
    walk: world.walk instanceof GridWalkField ? world.walk.pack() : null,
    structures: world.structures.length ? world.structures : undefined,
    hollows: world.zoneHollows.length ? world.zoneHollows : undefined,
    annexSpecs: world.zoneAnnexSpecs.length ? world.zoneAnnexSpecs : undefined,
    tracks: world.tracks.length ? world.tracks.map(t => t.spec) : undefined,
    trapworks: world.trapworks.length ? world.trapworks.map(t => t.spec) : undefined,
    ...counterZoneOf(world), // THE CLIENT'S COUNTERS: anchors, Fonts and the owned counters (hosted worlds alone)
  };
}

/** Client: rebuild the render terrain from a host zone message. */
export function applyZone(world: World, msg: ZoneMsg): void {
  world.arena.w = msg.arena.w; world.arena.h = msg.arena.h; world.arena.shape = msg.arena.shape;
  // THE COMPOSITE BOUND: adopt the host's pieces whole (fresh objects), then
  // let the hull + revealed set follow — the client's predicted clampPos and
  // the drawn face read the same union the host tests.
  if (msg.arena.pieces?.length) {
    world.arena.pieces = msg.arena.pieces.map(pc => ({ ...pc }));
  } else {
    delete world.arena.pieces;
  }
  world.arenaHull = hullOf(world.arena);
  world.annexOpen = new Set(
    (msg.arena.pieces ?? []).filter(pc => pc.active).map(pc => pc.id));
  // Patch the client's render zone so drawFloor reads the host's theme/name/level.
  world.zone.theme = msg.theme;
  world.zone.name = msg.name;
  world.zone.level = msg.level;
  if (msg.locale) world.zone.locale = structuredClone(msg.locale);
  else delete world.zone.locale;
  if (msg.complex) world.zone.complex = { ...msg.complex };
  else delete world.zone.complex;
  if (msg.destination) world.zone.destination = structuredClone(msg.destination);
  else delete world.zone.destination;
  if (msg.journey) world.zone.journey = { ...msg.journey };
  else delete world.zone.journey; // leaving a route clears the previous stage
  if (msg.geo) world.zone.geo = structuredClone(msg.geo);
  else delete world.zone.geo; // old peers and plain zones clear stale atlas context
  world.zone.dimension = msg.dimension;
  world.doodads = msg.doodads.map(d => ({
    pos: { x: d.p[0], y: d.p[1] }, radius: d.r, kind: d.kind, dir: d.dir, shallow: d.shallow, rot: d.rot, adorn: d.adorn, door: d.door, hitbox: d.hitbox, hollow: d.hollow, annex: d.annex, wild: d.wild, fall: d.fall,
  })) as Doodad[];
  world.structures = msg.structures ?? [];
  // SECRET HOLLOWS: adopt the host's specs fresh (the shipped walk grid is
  // already carved for anything opened before this message); the per-frame
  // snapshot converges any reveal that lands mid-play.
  world.zoneHollows = msg.hollows ?? [];
  world.openedHollows = new Set();
  // SEALED ANNEX FACES: same law — specs fresh, grid pre-carved, the 20 Hz
  // annexes row converges mid-play reveals (bare: carve + dress only).
  world.zoneAnnexSpecs = msg.annexSpecs ?? [];
  // The zone the CLIENT's terrain currently mirrors — the guard that keeps a
  // stale old-zone snapshot from ratcheting same-id doors open in the new zone
  // (do NOT write msg.zoneId into world.zone.id: world.zone aliases a node in
  // the client's own zone graph).
  world.appliedZoneId = msg.zoneId;
  // Rebuild the bridge/ground collision lists from the replicated doodads so the
  // client's PREDICTED movement matches the host across bridges (else rubber-band).
  world.rebuildClientTerrain();
  // Non-convex walkability: rebuild from the shipped packed grid (or clear it).
  world.walk = msg.walk ? GridWalkField.unpack(msg.walk) : null;
  world.exits = msg.exits.map(e => ({
    pos: { x: e.p[0], y: e.p[1] }, radius: e.r, to: e.to, label: e.label, defIndex: 0,
    // Boundary-gate treatment crosses like the label (accent/glyph/ring on
    // the client read the same data row the host resolved).
    boundary: e.b,
  }));
  world.waypointPos = msg.waypoint ? { x: msg.waypoint[0], y: msg.waypoint[1] } : null;
  // MOVING-HAZARD LANES: adopt the host's placed specs — the client's track
  // layer poses riders off the synced clock from here on (zero per-tick wire).
  world.setNetTracks(msg.tracks ?? []);
  // TRAPWORK MECHANISMS: adopt the host's specs (tells already ride the
  // doodad list above); states converge via StateSnapshot.trapState.
  world.setNetTrapworks(msg.trapworks ?? []);
  // THE CLIENT'S COUNTERS: the station anchors, the Fonts and the host's counters (a hosted
  // world's message alone carries them).
  applyCounterZone(world, msg);
}
