import {observeNativeSource} from './nativeCombatRecordObservation';
export const NATIVE_FRAME_EVAP = {
    stepFrac: 0.14,
    stepMin: 3,
    minRadius: 14,
  };
/** Exact original42 complete local-frame EffectsTick closure.
 * Runtime ownership and native scheduling are separate concrete bindings. */
import type {NativeSceneFrameHost} from "./nativeSceneFrameHost";
import { TETHER_TICK } from './nativeSceneTethers';
import { skillInstanceName } from './skillEmpowerment';
import { skillMovementVoice } from '../data/skillMovementVisuals';
import { anatomyCueState, anatomyFlash } from './anatomyCues';
import { restorationCueFlash, noteResourceFlow } from './feedingCues';
import { summonReservationUnit } from './companionGrants';
import { summonContractSlots } from './summonContracts';
import { cosmeticSkillPaint } from '../meta/cosmetics';
import { selectContainerLoot } from '../data/containerloot';
import { angleDiff, angleTo, chance, clamp, dist, pick, pointSegDist, rand, randInt, vec, type Vec2 } from '../core/math';
import { replenishingDelivery, replenishShape, replenishmentActive } from './replenishment';
import { mod, type Attributes, type DamageType, type Modifier, type SkillTag } from './stats';
import { STATUS_DEFS, type ActiveStatus } from './status';
import { Actor } from './actor';
import { type PlayerInputSource } from '../net/intent';
import { applyConversion, mitigateTyped, resistValue } from './damage';
import { bodyWhere, reachTo, segR, stampSegFlash, tickSegFlash, woundCount } from './segments';
import { COMMAND_CFG, isDormant } from './ai';
import { effectiveSkillLevel, grantedTags, guardBashSpec, instanceAim, instanceDelivery, instanceMods, instanceTargeting, makeSkillInstance, BASH_CFG, AOE_SHAPE, AOE_BAND_DEPTH, skillContextTags, SKILL_RARITIES, type SkillDef, type SkillInstance, type SupportDef, type SupportInstance, type TetherSpec } from './skills';
import { autoPlace } from './inventory';
import { makeSkillGemItem, makeSupportGemItem } from './gemitems';
import { MEMORY_KINDS, findMemoryItem, memoryKindOf, mergeMemory, type MemoryKind } from './memories';
import { chestInReach, CHEST_INTERACTION_CFG } from './chestInteraction';
import { isRelic } from './accountReliquary';
import { type PersonalStash } from './stash';
import { rollItem } from './itemgen';
import { abilityEssenceOfTier, type EssenceId } from '../data/essences';
import { ITEM_CFG, ITEM_RARITIES, type ItemInstance, type ItemRarity } from './items';
import { resolveLootTable } from './loot';
import { VESTIGES } from '../data/vestiges';
import { SKILLS } from '../data/skills';
import { FIXTURE_IDS, MONSTERS } from '../data/monsters';
import { type ClassDef } from '../data/classes';
import type { CouchSeatTag } from '../data/couch';
import { DAMAGE_COLOR } from './stats';
import { type ZoneDef } from '../data/zones';
import { doodadRuleOf, hitSurfaceOf, normalizeDoodadBound, pitRegionOf, type BrittleSpec, type Doodad, type DoodadKind } from './levelgen';
import { dissolveFor } from './dissolve';
import { dominantTypeOf } from './bodyVoices';
import { canSquish, SQUISH_CFG } from './squish';
import { sameStory } from './tiers';
import { shapeContains, type HitShape } from './shapes';
import { type QuestLedgerSave } from './questLedger';
import { Rng } from '../core/rng';
import { isSoulriverId, soulriverKeyOf, soulriverPlan, SOULRIVER_CFG } from '../world/soulriver';
import { regionKind, survivalResource, survivalBandMeter, DOUSE_CFG, type DouseSpec, type SurvivalResourceDef } from '../world/regions';
import { VeilIndex, VEIL_DEFAULTS } from './veil';
import { CREEP_CFG, CREEPS, crestPoint } from './creep';
import { riderSurface, TRACK_CFG, trackArcFrac, trackDone, trackPending, trackPose, type TrackPayload, type TrackSpec } from './tracks';
import { cometFanOf, columnPayload, GEYSER_CFG, rainFanOf, ventDownstream, ventReadAt, ventSpill, type PlacedVent } from './geysers';
import { dwellerPhaseAt, lintVentDweller, VENT_DWELLER_CFG } from './ventDweller';
import { REGROWTH_CFG, SCALD_CFG, type BaskSpec } from '../data/scald';
import { LEDGER_TRAP_SPRUNG, trapAnchor, trapEffect, trapTriggerHit, TRAPWORK_CFG, type PlacedTrapwork, type TrapHost } from './trapworks';
import { CLING_CFG, clingEligible, clingMotionShaken, clingSeatPos, clingSeatsOf, gnawTags } from './cling';
import { POCKET_GRANTS, pocketGrantStat } from './fieldgrants';
import { GRAB_CFG, GRAB_MARKER, grabSeatPos, struggleRate, type GrabThrowSpec } from './grab';
import { POSSESS_CFG } from './possess';
import { seatCount, seatPos } from './mounts';
import { resolveTell, TELL_CFG } from './tells';
import { reserveStageCue } from './reserveCues';
import { noteProcCue } from './procCues';
import { poolVentRead } from './skills';
import { RESERVE_CUE_CFG } from '../data/reserveCues';
import { combatCueFlash } from './combatCues';
import { PACK_CFG, foldPack } from './pack';
import { drainHolds, pipsOf, RESERVE_CFG, regenHolds, reserveFrac, reserveSpent, stageAt, type ReserveSpec, type ReserveState } from './reserves';
import { feedWatch, layTrailPoint, trailNewest, trailNext, WATCH_CFG, WATCH_RUNG, watchRungOf, watchValueOf, type WatchSpec } from './watch';
import { LOS_CFG } from './los';
import { bumpLedger } from '../packages/ledger';
import { notePickup } from '../world/bulletins';
import { SNOW_CFG } from './snowCover';
import { WEATHER_DEFS, WET_SKY } from '../world/weather';
import { WEATHER_DRESS_CFG, dressPlanFor, rollDressPieces } from './weatherDress';
import { dayCycle } from '../world/daynight';
import { REMNANT_KINDS } from '../data/remnants';
import { ORB_DEFS, orbRefundStat } from '../data/orbs';
import { SIM_TAP } from './tap';
import { type DeathRecord } from '../meta/death';
import { hashStr } from './nativeSceneConfig';
import {isStealthed} from "./nativeSceneCombatResolution";
import {CRESCENT_INNER} from "./nativeSceneCombatResolution";
import {CRESCENT_ARC} from "./nativeSceneCombatResolution";
export const HEAT_CFG = {
  /** Seconds per unit gained while standing in a heat shimmer, unshaded. */
  stackEvery: 1.4,
  /** Seconds per unit shed while in shade (canopy, roof, or night). */
  dwindleEvery: 0.9,
  /** OPEN-SUN base cadence (ZoneTheme.swelter zones): seconds per stack at
   *  swelter 1 in a temperate-baked zone. Effective cadence =
   *  sunStackEvery / (swelter × (tempBase + tempGain × geo temperature)) —
   *  the world's own heat map decides which deserts scorch hardest. */
  sunStackEvery: 3.4,
  tempBase: 0.55,
  tempGain: 0.9,
  /** Daylight gate for the open sun (dayCycle light above this bakes; dawn
   *  and dusk are the crossing hours the caravans kept — night is already
   *  shade via isShaded). */
  sunUpMin: 0.55,
};
export const WINDCHILL_CFG = {
  /** OPEN-AIR base cadence: seconds per chill stack at windchill 1 in a
   *  temperate-baked zone with still air. Effective cadence = stackEvery /
   *  (windchill × (coldBase + coldGain × (1 − temperature)) ×
   *  (1 + windGain × windStrength) × nightMul-if-dark). */
  stackEvery: 4.2,
  coldBase: 0.5,
  coldGain: 1.1,
  /** The gale's teeth: cadence multiplier per unit of live wind strength. */
  windGain: 0.9,
  /** Cold bites harder after dark (dayCycle light below nightBelow). */
  nightMul: 1.4,
  nightBelow: 0.3,
  /** Seconds per stack shed while warmed (hearth, roof, or lee). */
  dwindleEvery: 1.1,
  /** While exposed with stacks up, the world owns the chill's clock (the
   *  short def duration would otherwise lapse between slow cadence ticks and
   *  the ladder could never climb). Held only while EXPOSED — step into
   *  warmth and the ordinary decay resumes. */
  holdTtl: 2.0,
  /** DoodadRule.warms radius default when a rule says `warms: true`. */
  warmReach: 96,
  /** Wind must actually be blowing for the lee to mean anything (below this
   *  strength a null windAt just means calm, not shelter). */
  leeMinWind: 0.12,
};
export const GAZE_CFG = {
  /** Seconds per stack gained while an OPEN eye has you in its reach. */
  stackEvery: 1.1,
  /** Seconds per stack shed once nothing is watching. */
  dwindleEvery: 1.4,
  /** Default eye reach (ZoneTheme.gaze.reach overrides). */
  reach: 175,
  /** Inside this range an eye flinches SHUT and builds nothing — pressing
   *  close is the fabric's own counterplay (the render lid mirrors it). */
  closeReach: 64,
  /** Default status the eyes build; its buildup ladder is the point. */
  status: 'beheld',
  /** The answer to a fresh conversion: a lure ping drawing the idle zone. */
  lureRadius: 620,
  lurePace: 1.15,
  lureStandoff: 56,
  lureLinger: 4,
};
export function inAoe(center: Vec2, radius: number, shape: AoeShape, facing: number, target: Vec2, targetRadius: number, arcRad?: number): boolean {
  if (shape === AOE_SHAPE.band) {
    // THE BAND (the crossing strip): the target read in the facing frame —
    // `radius` is the half-width ACROSS the facing, radius × AOE_BAND_DEPTH
    // the half-thickness ALONG it. The target's own radius grows both
    // (negated by zoneHoleSpares = "fully inside" — the same grace math).
    const dx = target.x - center.x, dy = target.y - center.y;
    const fx = Math.cos(facing), fy = Math.sin(facing);
    const along = dx * fx + dy * fy;
    const across = dy * fx - dx * fy;
    return Math.abs(across) <= radius + targetRadius
      && Math.abs(along) <= radius * AOE_BAND_DEPTH + targetRadius;
  }
  if (shape >= 3) {
    // Crescent: an annular SECTOR aimed along facing — the band between
    // inner and outer radius, clipped to the arc, with angular grace so
    // fat targets clip the horns. Shape 4 (SECTOR) is the same wedge with
    // NO hollow heart — the pie slice that starts at your feet.
    const dd = dist(center, target);
    const inner = shape >= 4 ? 0 : radius * CRESCENT_INNER;
    if (dd - targetRadius > radius || dd + targetRadius < inner) return false;
    const half = (arcRad ?? CRESCENT_ARC) / 2 + Math.atan2(targetRadius, Math.max(dd, 1));
    return Math.abs(angleDiff(facing, angleTo(center, target))) <= half;
  }
  if (shape >= 2) {
    // Equilateral triangle, apex toward facing, circumradius grown by the
    // target's own radius so fat targets clip the edges.
    const R = radius * 1.25 + targetRadius;
    const vx: number[] = [], vy: number[] = [];
    for (let i = 0; i < 3; i++) {
      const a = facing + i * (Math.PI * 2 / 3);
      vx.push(center.x + Math.cos(a) * R);
      vy.push(center.y + Math.sin(a) * R);
    }
    const sign = (ax: number, ay: number, bx: number, by: number): number =>
      (bx - ax) * (target.y - ay) - (by - ay) * (target.x - ax);
    const d1 = sign(vx[0], vy[0], vx[1], vy[1]);
    const d2 = sign(vx[1], vy[1], vx[2], vy[2]);
    const d3 = sign(vx[2], vy[2], vx[0], vy[0]);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }
  if (shape >= 1) {
    const half = radius + targetRadius;
    return Math.abs(target.x - center.x) <= half && Math.abs(target.y - center.y) <= half;
  }
  return dist(center, target) - targetRadius <= radius;
}
export const WIND_CFG = {
  /** Speed penalty factor per unit of headwind dot (dot is -str..+str). */
  headwind: 0.38,
  /** Speed bonus factor per unit of tailwind dot. */
  tailwind: 0.2,
  /** Hard floor/ceiling on the wind's movement scale. */
  minScale: 0.55,
  maxScale: 1.25,
  /** How far upwind the shelter probe reaches (world units). */
  shelterReach: 36,
  /** Extra pad on a sheltering solid's body radius. */
  shelterPad: 8,
  /** Gust pulse: extra strength at the crest of the slow gust wave. */
  gustAmp: 0.55,
  /** PHYSICAL PUSH: world-units/sec a full-strength gale drifts a body of
   *  weight 1 (divided by effectiveWeight — poise and mass are literal
   *  anchors; a behemoth barely notices what skids a goblin). */
  pushPerSec: 24,
};
export interface Chest {
  /** Optional place/event-owned loot context; ordinary chests inherit the zone. */
  rewardLevel?: number;
  rewardSource?: string;
  /** Geographic objective owns the lock and durable opened receipt. */
  massObjectiveOwner?: string;
  pos: Vec2;
  kind: 'objective' | 'timed';
  /** It was never a chest. Revealed (and removed) at the moment of truth. */
  mimic: boolean;
  opened: boolean;
  /** M-SPILL: the world clock at the open — the renderer swings the lid off it. */
  openedAt?: number;
  /** timed: seconds of standing presence left to pick the lock. */
  lockTime: number;
  maxLock: number;
  /** THE THEMED CACHE (PocketSpec.cacheRarity → ZoneDef.cacheRarity): the
   *  lid also yields one rolled GEAR piece at exactly this rarity — a tinted
   *  toll's promised answer (pristine gate → a unique). Absent = the selected container list. */
  rarity?: ItemRarity;
}
export interface Tether {
  visual?: string;
  visualAge?: number;
  a: Actor; b: Actor;
  /** Whose beam this is (team resolution + kill credit). */
  owner: Actor;
  /** The skill that laid it (re-casting refreshes rather than stacking). */
  skillId: string;
  /** Which band lane this is — the key LOS_CFG.tetherLinks answers. */
  link: TetherLink;
  /** The laying instance, where a skill laid it: the occlusion fold reads
   *  the spec's own `occlusion` word and the INSTANCE-scoped `phasing`
   *  through it, so a socketed Wraith Passage reaches its own band. Pack
   *  arcs and bare visual zaps have none. */
  inst?: SkillInstance;
  /** Post-conversion damage per second, by type. */
  amounts: Partial<Record<DamageType, number>>;
  /** Healing per second to allies inside the band. */
  heal: number;
  affects: 'enemies' | 'allies' | 'all';
  width: number;
  /** Target-bond lifespan; object links carry Infinity (they live with their
   *  endpoints). */
  remaining: number;
  /** Damage tick accumulator (beams tick in chunks so mitigation stays sane). */
  tickTimer: number;
  color: string;
  /** Endpoint coords cached each tick — the renderer + co-op wire read these. */
  ax: number; ay: number; bx: number; by: number;
  /** THE BAND LAW's attitude, resolved ONCE on first hit test (tetherSees —
   *  the Zone.phase idiom): true = this band's bite ignores walls (a free
   *  lane, a skill that says so, a phasing owner). */
  phase?: boolean;
  /** THE BAND LAW's ray memo, keyed per touched BODY (victim × segment) and
   *  aged on the losCached TTL. Lives and dies with the band, and is only
   *  ever allocated once something actually stands in a blocked one. */
  los?: Map<number, { ok: boolean; until: number }>;
}
export interface Seat {
  /** 'p0' = local/host, 'p1'… = co-op. Matches DeathRecord.owner. */
  id: string;
  /** kind:'player' actor; the authority is world.actors, the seat just points. */
  actor: Actor;
  /** THE POSSESSION SEAM (engine/possess.ts): set while this seat rides a
   *  FOREIGN body — the hero body it left behind (its build/save/level
   *  home, World.seatHero). `actor` above is always the CONTROLLED body;
   *  unset = the seat is home and `actor` IS the hero. */
  home?: Actor;
  /** This seat's character build + carry. */
  meta: PlayerMeta;
  /** Where this seat's per-frame intent comes from (OS / scripted / remote). */
  input: PlayerInputSource;
  /** Set on a HIRED MERCENARY's seat (meta/mercs.ts): the blade's identity.
   *  Gates XP grants (mercs track the patron's level, never earn their own),
   *  the party-scale lever, and the rescue-count policy. */
  merc?: { name: string; mercId?: string; templateId?: string };
  /** THE COUCH FABRIC (data/couch.ts): set on a local shared-screen GUEST —
   *  which physical pad drives it, which screen flank its UI claims, and (on
   *  the immortal lane) which roster vessel it persists as. Absent everywhere
   *  else; its absence IS the solo invariant. */
  couch?: CouchSeatTag;
  /** A persistent couch guest's OWN corpse ring (rides its roster save, the
   *  way charDeaths rides the local save) — seeded at join, appended by a
   *  party wipe, written back by the guest persist. */
  couchDeaths?: DeathRecord[];
  /** THE KEEPER SEAT (keeperSeat — docs/design/shard-world.md §3.2): set on
   *  a HOSTED world's parked p0 — the body the world-level reads address
   *  when no player stands near. Exempt from party scale and XP, absent from
   *  the wire, never a reviver by reach; its `reviveSec` is THE MERCY: a
   *  downed seat with no standing ally rises after that many seconds.
   *  Absent everywhere else; its absence IS the solo invariant. */
  keeper?: { reviveSec: number };
  /** World time of this seat's last deliberate action — its private dwell clock. */
  lastActedAt: number;
  /** THE SHIMMY LAW's clock: world seconds of this seat's last WILLED step
   *  (moveActor's own path — shoves, gales and rides never stamp it). The
   *  dwell latches re-arm against it. */
  lastMovedAt: number;
  /** Revive progress while this seat is DOWNED: ally seat id → seconds dwelt. */
  reviveDwellBy: Map<string, number>;
  /** THE WORN-GRAFT LEDGER (slotgraft_* stats → recalcSeat): every worn
   *  slot-bound support this seat carries, with the verdict the injection
   *  pass reached — the UI's one read path for live chips, dormancy
   *  reasons and empty seats. DERIVED state, rebuilt every recalc,
   *  never saved. */
  wornGrafts?: WornGraftRow[];
  /** THE GRANTED LEDGER (skillgrant_* stats → recalcSeat — THE LEGEND
   *  FABRIC, docs/engine/legends.md): every skill this seat's gear and
   *  passives GRANT, with its live instance, folded level, source and bar
   *  seat — the panels' one read path. DERIVED, rebuilt every recalc,
   *  never saved. */
  grantedSkills?: GrantedSkillRow[];
  /** The granted instances themselves, keyed by skill id — IDENTITY-STABLE
   *  across recalcs (cooldowns, gauge banks and sockets live on the
   *  instance), minted at first grant, dropped when the grant leaves.
   *  Never the learned book: a grant is worn, not owned. */
  grantedInsts?: Map<string, SkillInstance>;
}
export const BRITTLE_WARN_EVERY = 4;
export interface GemDrop {
  pos: Vec2;
  item: DropItem;
  bob: number;
  /** Seconds before this drop becomes grabbable AT ALL (player drops only — see
   *  DROP_PICKUP_GRACE). Undefined ⇒ grabbable immediately (monster/chest loot). */
  grace?: number;
  /** The seat that dropped this (player drops only). That seat cannot RECLAIM it
   *  until it has stepped outside the pickup radius once (dropperCleared) — so a
   *  discard never bounces straight back into the dropper's hands. Others may grab
   *  it as soon as `grace` expires. */
  droppedBy?: string;
  dropperCleared?: boolean;
  /** THE SPOILS STORY (the tier fabric's same-story law): the story this
   *  drop lies on — stamped from the body that shed it (the kill path, a
   *  shakedown, a discard), else derived at the sweep from the floor under
   *  it (World.spoilStoryAt: a story-only cell is that story's, a both-floor
   *  cell is the ground's). Only a seat on the SAME story may vacuum or
   *  grab it — a hero upstairs never hoovers the common room's loot through
   *  the boards, nor the valley the butte's cache. Flat zones read 0. */
  tier?: number;
  /** THE SPOILS' OWNER (card 27, docs/engine/shard.md): on a hosted world, the seat this
   *  drop belongs to (THE OWNER STAMP, World.ownSpoils) and the world time it falls free to
   *  anyone ('timed'; absent = never). THE TOUCH LAW (World.dropHolder): no other seat takes
   *  it while it is held. Absent on every other lane, so a solo or co-op world's drops,
   *  zone memory and saves never carry either field (THE SOLO INVARIANT). */
  owner?: string;
  freeAt?: number;
}
export interface ResourceOrb {
  pos: Vec2;
  /** ORB_DEFS id. */
  kind: string;
  /** Restore amount for pouring kinds (charge payloads live on the def). */
  amount: number;
  bob: number;
  life: number;
  /** SIPHON orbs home to their owner and pour on arrival (nobody else can
   *  scoop them); cleared if the owner dies — the blood falls to the floor. */
  homeTo?: Actor;
  /** Presentation only on a replica; never a simulated pickup destination. */
  flowTo?: Vec2;
  flowTier?: number;
  /** The struck body's story while airborne; does not change pickup rules. */
  flowFromTier?: number;
  /** THE SPOILS STORY (see GemDrop.tier): the story the orb lies on — only a
   *  same-story seat scoops it; stamped by the shedder, else derived at the
   *  sweep from the floor. */
  tier?: number;
}
export type AoeShape = number;
export type TetherLink = TetherSpec['link'] | 'pack' | 'zap';
export interface PlayerMeta {
  /** Character-owned town storage; never part of carried/corpse loot. */
  stash?: PersonalStash;
  classDef: ClassDef;
  /** THE STAMPED OPENING (meta/classkit.ts resolveClassKit): the resolved
   *  kit bar this hero WOKE with — the class's base bar with each chosen
   *  alternate standing in for its base and every owned Master grant
   *  seated — stamped ONCE at makePlayerSeat, saved with the character,
   *  shipped on the wire, and never re-derived from the account (a later
   *  waking may pick differently; this run's opening is its own truth).
   *  The re-kindle hatch's roster (reacquireSkill) and the sheet's starter
   *  strip read THIS, never ClassDef.bar: a Warrior who woke with Carve
   *  re-kindles Carve and never Cleave. Absent in older saves → the class's
   *  base bar (the pre-stamp reading, byte for byte). */
  opening: (string | null)[];
  /** THE COMPANION STANCES (engine/companionStances.ts): the keeper's
   *  standing conduct per bond skill (skill id → stance id) — the pack's
   *  own mind between orders. Absent = the fabric's default; saved with
   *  the character, shipped on the wire, sanitized against the registry
   *  on every load (a renamed stance drops to the default). */
  stances: Record<string, string>;
  /** THE NAME (Naming, meta/nemesis.ts): the player-given name — or the class
   *  name when unnamed — that threads this character into the world's memory
   *  (sagas key off its normalized form) and labels it everywhere a person
   *  would be named (HUD, death screens, rosters, retirement). */
  name: string;
  /** Class starting attributes — the permanent base. */
  baseAttrs: Attributes;
  /** Effective attributes = base + passive tree grants (recomputed). */
  attrs: Attributes;
  xp: number;
  xpNeeded: number;
  passivePoints: number;
  allocated: Set<string>;
  /** CHOICE NODES: the option ids picked per allocated choice node (see
   *  data/passiveChoices.ts — groups, pick limits, uniqueness). Written only
   *  through allocateNode; every load/wire path rebuilds it registry-tolerantly
   *  via sanitizeChoices, so a renamed group or option simply drops its pick. */
  choices: Record<string, string[]>;
  /** REALM CURRENCIES (data/passiveRealms.ts): unspent points per realm
   *  currency id ('devotion', 'communion', …) — earned through
   *  world.grantRealmPoints (the seam shrines/quests/communions will call),
   *  spent by allocateNode on nodes of realms that name that currency. */
  realmPoints: Record<string, number>;
  /** GRAFT BINDINGS (data/passiveChoices.ts GraftSpec): earned graft key
   *  (`nodeId` / `nodeId:optionId`) → the learned skill carrying it (null =
   *  earned, unbound). Written through world.bindGraft; recalcSeat rebuilds
   *  every SkillInstance.grafts lane from this map, and sanitizeGrafts
   *  re-validates it on every load/wire path. */
  grafts: Record<string, string | null>;
  /** Vocations GRANTED to this character (quest-chain completions). Capped at
   *  VOCATION_CFG.maxPerCharacter; an array so the cap is pure config. */
  vocations: string[];
  /** The vocation-tree currency — earned from vocation quest steps (and any
   *  future QuestReward.vocationPoints source), spent in world.allocateNode. */
  vocationPoints: number;
  /** LEARNED skills (max MAX_LEARNED_SKILLS), keyed by skill id. Bar slots
   *  reference these. LEARNED = SEATED (skill-items charter card 8): every
   *  learned skill occupies a rack seat; learning is the seating gesture and
   *  unlearning mints the gem back into the bag. The Map survives as the
   *  derived index of the seat array — the LAW is one residence, not one
   *  variable (charter §9.14). */
  knownSkills: Map<string, SkillInstance>;
  /** THE one bag — the tetris grid; every entry carries its cell x/y.
   *  THE RESIDENCE (skill-items M1): loose skill/support gems live HERE as
   *  1×1 wrapper items (ItemInstance.gem — engine/gemitems.ts); the old
   *  unbounded skillInv/inventory side arrays are retired. */
  items: ItemInstance[];
  /** GEAR worn on the doll, by EQUIP_SLOTS id. Each slot syncs one
   *  attributable StatSheet source ('gear:<slot>') in recalcSeat. */
  equipped: Partial<Record<string, ItemInstance>>;
  /** THE CONTAINER FABRIC (engine/containers.ts): the SIDE BOARDS — every
   *  registered container's seated pieces by container id, each carrying
   *  its seat cell x/y on THAT board. An ACTIVE container (the Reliquary)
   *  syncs one attributable source ('container:<id>') in recalcSeat, the
   *  doll's exact shape; a piece anywhere else is inert. Missing ids read
   *  as empty boards (containerHeld). */
  containers: Record<string, ItemInstance[]>;
  /** SALVAGE currency, per essence tint. Carried, spendable, and — like the
   *  rest of the bag — lost to death (knowledge persists on the account as
   *  craftLore; the raw material does not). */
  essences: Record<EssenceId, number>;
  /** ABILITY ESSENCES (data/essences.ts ABILITY_ESSENCES) — the skill-
   *  leveling currency, per tier id. Wallet counters, never bag items;
   *  carried and lost to death exactly like the tints. */
  abilityEssences: Record<string, number>;
  /** VESTIGES (socket material) — stackable, satchel-borne, consumed on
   *  socketing. Lost to death like every other carried material. */
  vestiges: Record<string, number>;
  /** CHARACTER MODE (meta/modes.ts): the life-contract sworn at creation.
   *  Every death-flow decision reads the CURRENT stage's policy, never an id. */
  modeId: string;
  /** Index into the mode's stage ladder (0 = as created; the Immortal's first
   *  death advances it to 'undying'). */
  modeStage: number;
  /** Account-roster identity for roster-saved modes ('' = the shared run slot). */
  charId: string;
  /** Resume-only migration marker. */
  legacyRelics?: boolean;
  relicScope?: string;
  /** Authoritative host fold, shipped to remote views. */
  relicEmpowerment?: number;
  relicEnabled?: boolean;
  /** THE CHARACTER'S QUESTS (card 24 ruled; CharacterSave.quests): the quest ledgers this
   *  hero carries for the hosted worlds it walked, by world key, passed through every
   *  save of a world that keeps its own (a solo run's quests ride its world half). */
  questWorlds?: Record<string, QuestLedgerSave>;
}
export interface WornGraftRow {
  slot: number;             // 0-based bar index; speak it 1-based ("Skill Slot N")
  def: SupportDef;
  level: number;
  skillId?: string;         // the skill bound at derivation time (absent = empty seat)
  state: 'live' | 'duplicate' | 'unfit' | 'empty';
}
export interface GrantedSkillRow {
  def: SkillDef;
  level: number;
  inst: SkillInstance;
  /** Who grants it — the first worn piece carrying the stat, else the passives. */
  source: string;
  /** The item whose grantState hosts the sockets (absent = passive-only grant). */
  hostUid?: number;
  /** Bar seat (0-based) the instance sits on; -1 while unseated (bar full). */
  slot: number;
}
export type DropItem =
  | { kind: 'support'; gem: SupportInstance }
  | { kind: 'skill'; inst: SkillInstance }
  | { kind: 'gear'; item: ItemInstance }
  | { kind: 'vestige'; id: string; count: number }
  | { kind: 'essence'; essence: EssenceId; count: number }
  | { kind: 'abilityEssence'; tier: number; count: number };
export function sceneUpdateSummonShells(nativeHost:NativeSceneFrameHost): void {
    for (const body of nativeHost.actors) {
      if (!body.summonShell || body.dead || !body.owner) continue;
      body.pos = { ...body.owner.pos }; body.tier = body.owner.tier;
      body.facing = body.owner.facing; body.facingPrev = body.owner.facing;
      if (body.owner.dead || body.owner.downed || body.shellGuard?.broken) body.casting = null;
    }
  }

export function sceneUpdateTempGrounds(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (let i = nativeHost.tempGrounds.length - 1; i >= 0; i--) {
      const t = nativeHost.tempGrounds[i];
      t.remaining -= dt;
      if (t.remaining > 0) continue;
      nativeHost.tempGrounds.splice(i, 1);
      // An evaporate-marked patch DRIES instead of popping: hand it to the
      // evaporation sweep (the dwell is served — contraction starts now).
      if (t.evaporate && !t.doodad.gone) {
        t.doodad.evap = { t: 0, rate: t.evaporate.rate };
        nativeHost.evaporating.push(t.doodad);
        continue;
      }
      const di = nativeHost.doodads.indexOf(t.doodad);
      if (di !== -1) nativeHost.doodads.splice(di, 1);
      const gi = nativeHost.grounds.indexOf(t.doodad);
      if (gi !== -1) nativeHost.grounds.splice(gi, 1);
    }
  }

export function sceneUpdateEvaporation(nativeHost:NativeSceneFrameHost, dt: number): void {
    const cfg = NATIVE_FRAME_EVAP;
    for (let i = nativeHost.evaporating.length - 1; i >= 0; i--) {
      const d = nativeHost.evaporating[i];
      const ev = d.evap;
      if (!ev || d.gone) { nativeHost.evaporating.splice(i, 1); continue; }
      ev.t -= dt;
      if (ev.t > 0) continue;
      const step = Math.max(cfg.stepMin, d.radius * cfg.stepFrac);
      d.radius -= step;
      if (d.radius <= cfg.minRadius) {
        delete d.evap;
        nativeHost.evaporating.splice(i, 1);
        const di = nativeHost.doodads.indexOf(d);
        if (di !== -1) nativeHost.doodads.splice(di, 1);
        const gi = nativeHost.grounds.indexOf(d);
        if (gi !== -1) nativeHost.grounds.splice(gi, 1);
      } else {
        ev.t += step / ev.rate;
      }
      // Attributed: only this pool's OWN families re-derive (its bed bake,
      // its glow cluster) — a drying field no longer rebuilds the nav grid
      // and the veil index ten times a second (the churn cascade).
      nativeHost.markDoodadsChanged(d);
    }
  }

export function sceneUpdatePendingBursts(nativeHost:NativeSceneFrameHost): void {
    for (let i = nativeHost.pendingBursts.length - 1; i >= 0; i--) {
      const b = nativeHost.pendingBursts[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingBursts", b);
try {
      if (nativeHost.time < b.when) continue;
      nativeHost.pendingBursts.splice(i, 1);
      const lvl = Math.max(0, b.owner.level - 1);
      nativeHost.flashes.push({ pos: vec(b.at.x, b.at.y), radius: b.fx.radius, color: b.color, life: 0.3, maxLife: 0.3 });
      for (const a of nativeHost.actors) {
        if (a.dead || a.untargetable) continue;
        if (a.tier !== b.tier) continue; // the bloom keeps to its story (the sovereignty gate)
        if (dist(b.at, a.pos) - a.radius > b.fx.radius) continue;
        if (a.team === b.owner.team) {
          if (b.fx.healAllies) {
            const healed = a.healBy(b.fx.healAllies.base + b.fx.healAllies.perLevel * lvl);
            if (healed > 0.5) nativeHost.seatText(b.owner, a.pos, '+' + Math.round(healed), '#8ae0a8', 11); // THE WIRE'S EYES: the healer's seat
          }
        } else if (b.fx.damage) {
          const landed = mitigateTyped(a, {
            [b.fx.damage.type]: b.fx.damage.base + b.fx.damage.perLevel * lvl,
          });
          if (landed <= 0 || a.invulnerable) continue;
          a.life -= landed;
          a.hitFlash = 0.15;
          a.hitFlashType = b.fx.damage.type;
          nativeHost.text(a.pos, Math.round(landed).toString(), b.color, 12);
          if (a.esBroke) {
            a.esBroke = false;
            nativeHost.rollOwnProcs(a, 'esBreak', { depth: b.depth });
          }
          nativeHost.sweepDefenseEvents(a, b.depth);
          if (a.life <= 0 && !a.dead) nativeHost.kill(a);
        }
      }
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdatePendingContagions(nativeHost:NativeSceneFrameHost): void {
    for (let i = nativeHost.pendingContagions.length - 1; i >= 0; i--) {
      const c = nativeHost.pendingContagions[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingContagions", c);
try {
      if (nativeHost.time < c.when) continue;
      nativeHost.pendingContagions.splice(i, 1);
      if (c.caster.dead) continue;
      const sdef = SKILLS[c.skillId];
      if (!sdef) continue;
      const at = !c.host.dead ? vec(c.host.pos.x, c.host.pos.y) : c.at;
      const minted = makeSkillInstance(sdef, c.level);
      (minted.state ??= {}).contagion = { gen: c.gen, seen: c.seen };
      nativeHost.executeSkill(c.caster, minted, vec(at.x, at.y), {
        targetInfo: { pos: vec(at.x, at.y), actor: !c.host.dead ? c.host : undefined },
        dmgMult: c.damageScale,
        noCooldown: true, noRepeat: true, noFollowUp: true, keepFacing: true,
      });
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdateTerrainEffects(nativeHost:NativeSceneFrameHost, dt: number): void {
    nativeHost.terrainTick++;
    // UNSTUCK SENTINEL (amortized: each actor probed ~every 16 frames). An
    // actor whose CENTER sits inside a solid — a legacy spawn, a knockback
    // into a rock blob, a summon minted on a wall — pingpongs against the
    // collision resolve forever: broken to watch and a per-frame cost. The
    // probe is one spatial-index bucket; the rescue is a snap to the nearest
    // free ground. Runs before the grounds early-out (rocks exist in zones
    // with no ground overlays at all).
    for (let i = 0; i < nativeHost.actors.length; i++) {
      if (((nativeHost.terrainTick + i) & 15) !== 0) continue;
      const a = nativeHost.actors[i];
      if (a.dead || a.construct || a.leap || a.dash || a.caromRun || a.anchored || a.passive) continue;
      // The probe judges on the body's OWN story (layer sovereignty): a
      // root-duct runner under a surface trunk is not stuck — before the
      // gate, the sentinel snap-teleported it out from beneath every tree
      // it passed under, which read as "the trees block the under-story".
      const stuck = nativeHost.pointInSolid(a.pos.x, a.pos.y, -a.radius * 0.3, a.tier);
      if (!stuck) continue;
      // A body over a FALL-ABLE pit is not stuck (the pitfall fabric): a
      // grasped lip is lawful footing, a home body (the void angler) roams
      // its own ground, and a body truly past all support belongs to the
      // fall doors — the rescue snap must never hand out a free teleport
      // off a lip (the aetherial rescue-snap lesson, disc space).
      if (pitRegionOf(stuck)) continue;
      const free = nativeHost.findFreeSpot(a.pos, a.radius, a.tier);
      a.pos.x = free.x; a.pos.y = free.y;
    }
    const hasGrid = !!nativeHost.walk;
    const veils = nativeHost.veilIndex();
    const hasVeil = veils.patches.length > 0;
    if (nativeHost.grounds.length === 0 && !hasGrid && !hasVeil) return;
    const drained = nativeHost.terrainDrainScratch; // reused: was a fresh Set per actor per frame
    for (const a of nativeHost.actors) {
      if (a.dead || a.construct || a.leap) { a.groundKind = undefined; a.gridRegion = undefined; continue; }
      drained.clear();
      // DECKBORNE bodies stand insured against the ground beneath (THE
      // BOARDS SHIELD — updateCarriers stamps deckUntil): the boards are
      // between them and the water, so no stand status, no survival drain,
      // no douse reaches up through the hull — but the tail of this loop
      // still runs, so the SOUL TETHER (and breath, and every meter)
      // breathes back while you ride. Falls through with both region reads
      // cleared and nothing drained.
      if ((a.deckUntil ?? 0) > nativeHost.time) {
        a.groundKind = undefined; a.gridRegion = undefined;
        nativeHost.douseSweep(a, dt, drained);
        nativeHost.regenSurvival(a, drained, dt);
        continue;
      }
      // VEIL cover (canopy patches): standing under a member crown wears the
      // veil's standStatus — the fogveiled pattern, detectability as data.
      // ONE bucket query per actor; statuses/AI read the rest from the sheet.
      // Tier-0 only: crowns are STREET furniture — a duct runner is under a
      // ceiling, not under the wheat (the tier fabric's layer honesty).
      if (hasVeil && (a.tier ?? 0) === 0) {
        const cover = veils.coverAt(a.pos.x, a.pos.y);
        const vs = cover ? (cover.spec.standStatus ?? VEIL_DEFAULTS.standStatus) : undefined;
        if (vs) nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(vs, 0, 1, 'canopy'));
      }
      // DOODAD-sourced region (the migrated grounds: mud/water/bog/…),
      // sensed on the actor's OWN layer.
      const ground = nativeHost.groundAt(a.pos, a.tier);
      const prevG = a.groundKind;
      a.groundKind = ground?.kind;
      if (ground) nativeHost.applyRegionEffects(a, ground.kind, ground.deep, prevG !== ground.kind, dt, drained);
      // GRID-sourced region (Phase 3: void/deep_water/air_pocket/…).
      if (hasGrid) {
        const gk = nativeHost.walk!.regionAt?.(a.pos.x, a.pos.y);
        const prevR = a.gridRegion;
        a.gridRegion = gk;
        if (gk && gk !== prevR) regionKind(prevR)?.onExit?.(a, nativeHost);
        if (gk) nativeHost.applyRegionEffects(a, gk, false, prevR !== gk, dt, drained);
      }
      // THE DOUSE BEAT — ground as cure (RegionKind.douses): with both
      // region sources freshly stamped, the refuge lane sheds what the
      // row under this body names (banded meters bleed instead — the set
      // tells the regen tail whose baseline decay stands down).
      nativeHost.douseSweep(a, dt, drained);
      nativeHost.regenSurvival(a, drained, dt);
    }
  }

export function sceneUpdateScorch(nativeHost:NativeSceneFrameHost, dt: number): void {
    const swelter = nativeHost.zone.theme.swelter ?? 0;
    const sunUp = swelter > 0 && dayCycle(nativeHost.time).light > HEAT_CFG.sunUpMin;
    // The zone's baked climate temperature (worldgen geo) — 0.5 when unbaked.
    const bakedT = nativeHost.zoneMap[nativeHost.zone.id]?.geo?.climate?.temperature ?? 0.5;
    // Units per second under bare sun — the old per-stack cadence inverted.
    const sunRate = sunUp
      ? (swelter * (HEAT_CFG.tempBase + HEAT_CFG.tempGain * bakedT)) / HEAT_CFG.sunStackEvery
      : 0;
    for (const s of nativeHost.frameSeats()) {
      const a = s.actor;
      if (a.dead || a.downed) continue;
      const cur = a.survival?.get('scorch') ?? 0;
      // The shimmer check rides the same spatial buckets terrain uses.
      let inField = false;
      for (const d of nativeHost.doodadsAt(a.pos.x, a.pos.y)) {
        if (d.kind === 'heat_shimmer' && (d.tier ?? 0) === a.tier && dist(a.pos, d.pos) <= d.radius + a.radius * 0.5) {
          inField = true;
          break;
        }
      }
      if (!inField && sunRate <= 0 && cur <= 0) continue; // nothing feeding, nothing worn
      const shaded = nativeHost.isShaded(a);
      // WATER IS REFUGE: ground that douses the scorch never bakes it —
      // both feed lanes hold while a douse row holds you (the bleeding
      // itself is the region sweep's douse beat, on its own faster clock).
      const doused = nativeHost.douseRowAt(a)?.statuses.includes('sunscorched') ?? false;
      const rate = doused ? 0 : inField ? 1 / HEAT_CFG.stackEvery : sunRate;
      if (rate > 0 && !shaded) {
        const before = cur;
        nativeHost.feedSurvival(a, 'scorch', rate * dt);
        if (before < 1 && (a.survival?.get('scorch') ?? 0) >= 1) {
        }
      } else if (shaded && cur > 0) {
        // SHADE BLEEDS at the old dwindle cadence. The hold stamp parks the
        // baseline decay this frame, so shade relief stays EXACTLY
        // 1/dwindleEvery — as it always was.
        const v = Math.max(0, cur - dt / HEAT_CFG.dwindleEvery);
        if (v <= 0) a.survival!.delete('scorch');
        else a.survival!.set('scorch', v);
        (a.survivalHeldAt ??= {}).scorch = nativeHost.time;
      }
      // Neither lane → the row's own decay (regenSurvival) breathes it out.
    }
    // THE CARRIERS SWEEP — every carrier, player or monster (the entity
    // seam): first the OUT-OF-SOURCE DECAY (the fabric owns its meter's
    // recovery — the terrain sweep's grounds early-out must never freeze a
    // bar carried into a barren zone; feed, shade and the douse each stamp
    // survivalHeldAt, the ONE hold law, so no lane ever double-moves it),
    // then the BAND SYNC: the worn statuses as derived windows of the bar.
    const def = survivalResource('scorch');
    if (def) {
      for (const a of nativeHost.actors) {
        if (a.dead || a.downed) continue;
        let v = a.survival?.get('scorch');
        if (v === undefined) continue;
        const held = a.survivalHeldAt?.scorch;
        if (v > 0 && (held === undefined || nativeHost.time - held >= 0.12)) {
          v = Math.max(0, v - def.regen * dt);
          if (v <= 0) a.survival!.delete('scorch');
          else a.survival!.set('scorch', v);
        }
        nativeHost.syncSurvivalBands(a, def, v);
      }
    }
  }

export function sceneUpdateWindchill(nativeHost:NativeSceneFrameHost, dt: number): void {
    // Geographic zones coexist in one World. Each seat reads its own frozen
    // native theme, climate and live sky; crossing a boundary never resets the
    // actor's native exposure clock. Finite scenes retain their original reads.
    const geographicCold = !!nativeHost.massRuntime?.geography;
    const sceneDial = nativeHost.zone.theme.windchill ?? 0;
    if (!geographicCold && sceneDial <= 0) return;
    const sceneTemperature = nativeHost.zoneMap[nativeHost.zone.id]?.geo?.climate?.temperature ?? 0.5;
    const dark = dayCycle(nativeHost.time).light < WINDCHILL_CFG.nightBelow;
    const sceneWind = geographicCold ? null : nativeHost.zoneWind();
    for (const s of nativeHost.frameSeats()) {
      const a = s.actor;
      if (a.dead || a.downed) continue;
      const local = geographicCold ? nativeHost.localZoneAt(a.pos) : undefined;
      const chillDial = local ? local.theme.windchill ?? 0 : sceneDial;
      if (chillDial <= 0) continue;
      const bakedT = local ? local.geo?.climate?.temperature ?? 0.5 : sceneTemperature;
      const coldMul = WINDCHILL_CFG.coldBase + WINDCHILL_CFG.coldGain * (1 - bakedT);
      const zw = geographicCold ? nativeHost.zoneWind(a.pos) : sceneWind;
      let t = (nativeHost.chillTimers.get(a.id) ?? 0) + dt;
      // WARMTH, cheapest test first: a carried ward (the windchillWard stat
      // — the mountain hearth's hearthglow ember, or any gear/passive that
      // grants it; a pure sheet read), then a roof, then any warms-ruled
      // fire in reach (the waystation hearth), then the lee of a windbreak.
      // A ward is WARMTH, not immunity: it banks nothing and sheds stacks
      // on the ordinary dwindle clock below, exactly as beside a fire.
      let warmed = a.sheet.get('windchillWard') > 0 || nativeHost.underRoofAt(a.pos);
      if (!warmed) {
        for (const d of nativeHost.doodadsNear(a.pos.x, a.pos.y, WINDCHILL_CFG.warmReach)) {
          if (d.gone || d.felled) continue; // a crushed hearth warms no one (the rampage fabric)
          const warms = doodadRuleOf(d.kind).warms;
          if (!warms) continue;
          const reach = warms === true ? WINDCHILL_CFG.warmReach : warms;
          if (dist(a.pos, d.pos) <= reach + a.radius * 0.5) { warmed = true; break; }
        }
      }
      let windStr = 0;
      if (!warmed && zw && zw.strength >= WINDCHILL_CFG.leeMinWind) {
        const felt = nativeHost.windAt(a.pos, a.tier);
        if (!felt) warmed = true; // becalmed in a lee — the rock is your wall
        else windStr = felt.strength;
      }
      const chill = a.statuses.find(x => x.id === 'chill');
      if (!warmed) {
        const every = WINDCHILL_CFG.stackEvery
          / (chillDial * coldMul * (1 + WINDCHILL_CFG.windGain * windStr)
            * (dark ? WINDCHILL_CFG.nightMul : 1));
        if (t >= every) {
          t = 0;
          nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus('chill', 0, 1, 'the mountain cold'));
        }
        // While exposed the world owns the chill's clock (slow cadences must
        // not lapse between ticks or the freeze ladder could never climb);
        // warmth hands the clock straight back to the ordinary decay.
        if (chill && chill.stacks > 0) chill.remaining = Math.max(chill.remaining, WINDCHILL_CFG.holdTtl);
      } else if (chill && t >= WINDCHILL_CFG.dwindleEvery) {
        t = 0;
        chill.stacks--;
        // Sheet honesty on the way down — the scorch loop's exact discipline.
        const def = STATUS_DEFS.chill;
        if (chill.stacks <= 0) {
          a.statuses.splice(a.statuses.indexOf(chill), 1);
          a.sheet.removeSource('status:chill');
        } else if (def?.mods) {
          a.sheet.setSource('status:chill',
            def.mods.map(m => ({ ...m, value: m.value * chill.stacks })));
        }
      } else if (warmed) {
        t = Math.min(t, WINDCHILL_CFG.dwindleEvery);
      }
      nativeHost.chillTimers.set(a.id, t);
    }
  }

export function sceneUpdateGaze(nativeHost:NativeSceneFrameHost, dt: number): void {
    // SOVEREIGNTY: sight — a look, mediated by the eye (the derived census, probe_tiers RIG T).
    const spec = nativeHost.zone.theme.gaze;
    if (!spec?.kinds.length) return;
    const reach = spec.reach ?? GAZE_CFG.reach;
    const closeReach = spec.closeReach ?? GAZE_CFG.closeReach;
    const statusId = spec.status ?? GAZE_CFG.status;
    const markId = STATUS_DEFS[statusId]?.buildup?.into;
    if (nativeHost.gazeEyesArr !== nativeHost.doodads || nativeHost.gazeEyesLen !== nativeHost.doodads.length
      || nativeHost.gazeEyesRev !== nativeHost.doodadsRev) {
      nativeHost.gazeEyesArr = nativeHost.doodads;
      nativeHost.gazeEyesLen = nativeHost.doodads.length;
      nativeHost.gazeEyesRev = nativeHost.doodadsRev;
      nativeHost.gazeEyes = nativeHost.doodads.filter(d => spec.kinds.includes(d.kind));
    }
    const eyes = nativeHost.gazeEyes;
    for (const s of nativeHost.frameSeats()) {
      const a = s.actor;
      if (a.dead || a.downed) continue;
      const held = a.statuses.find(x => x.id === statusId);
      let t = (nativeHost.gazeTimers.get(a.id) ?? 0) + dt;
      let watched = false;
      for (const d of eyes) {
        const dd = dist(a.pos, d.pos);
        if (dd <= reach + a.radius && dd > closeReach + a.radius) { watched = true; break; }
      }
      // THE WATCHING SHELL (gaze.wallKinds): eyes grown into wall regions
      // watch too. A coarse ring sample around the seat — proximity-honest,
      // like the doodad eyes; walls never flinch shut (they cannot be
      // pressed closed or burst — the counterplay is not lingering).
      if (!watched && spec.wallKinds?.length && nativeHost.walk?.regionAt) { // worldmass region queries need no finite array
        const wk = spec.wallKinds;
        const step = Math.PI / 6;
        outer: for (const rr of [reach * 0.5, reach]) {
          for (let a2 = 0; a2 < Math.PI * 2; a2 += step) {
            const kind = nativeHost.walk.regionAt(a.pos.x + Math.cos(a2) * rr, a.pos.y + Math.sin(a2) * rr);
            if (wk.includes(kind)) { watched = true; break outer; }
          }
        }
      }
      if (watched) {
        if (t >= GAZE_CFG.stackEvery) {
          t = 0;
          const wasMarked = !!markId && a.statuses.some(x => x.id === markId);
          nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(statusId, 0, 1, 'the watching walls'));
          if ((a.statuses.find(x => x.id === statusId)?.stacks ?? 0) === 1 && !wasMarked) {
          }
          // The ladder tipped — the country KNOWS. Tell its own.
          if (markId && !wasMarked && a.statuses.some(x => x.id === markId)) {
            nativeHost.setLure(`gaze#${a.id}`, a.pos, spec.lureRadius ?? GAZE_CFG.lureRadius,
              GAZE_CFG.lurePace, GAZE_CFG.lureStandoff, GAZE_CFG.lureLinger, a.tier);
          }
        }
      } else if (held) {
        if (t >= GAZE_CFG.dwindleEvery) {
          t = 0;
          nativeHost.shedStatusStack(a, held);
        }
      } else {
        t = Math.min(t, Math.max(GAZE_CFG.stackEvery, GAZE_CFG.dwindleEvery));
      }
      nativeHost.gazeTimers.set(a.id, t);
    }
  }

export function sceneUpdateFog(nativeHost:NativeSceneFrameHost, dt: number): void {
    if (!nativeHost.fog) return;
    // skyFront: weather-driven fog stays outside sheltered zones; a zone's
    // own AUTHORED banks (ZoneTheme.fog — a haunted cave's mist) are its
    // fabric regardless and keep breathing below.
    const f = nativeHost.skyFront();
    const k = f?.kind === 'fog' ? f.intensity : 0;
    nativeHost.fog.update(dt, nativeHost.time, k, nativeHost.actors);
  }

export function sceneUpdateWetSky(nativeHost:NativeSceneFrameHost, dt: number): void {
    nativeHost.wetSkyAcc += dt;
    if (nativeHost.wetSkyAcc < WET_SKY.sweepSec) return;
    nativeHost.wetSkyAcc = 0;
    if (nativeHost.massRuntime?.weather) {
      nativeHost.wetSkyStood = false;
      for (const a of nativeHost.actors) {
        const front = a.dead ? null : nativeHost.skyFront(a.pos);
        a.rainWet = !!front && !!WEATHER_DEFS[front.kind]?.wets && front.intensity >= WET_SKY.minIntensity && !nativeHost.underRoofAt(a.pos);
        nativeHost.wetSkyStood ||= a.rainWet;
      }
      return;
    }
    const f = nativeHost.skyFront();
    const wetting = !!f && !!WEATHER_DEFS[f.kind]?.wets && f.intensity >= WET_SKY.minIntensity;
    if (!wetting) {
      if (nativeHost.wetSkyStood) { for (const a of nativeHost.actors) a.rainWet = false; nativeHost.wetSkyStood = false; }
      return;
    }
    nativeHost.wetSkyStood = true;
    for (const a of nativeHost.actors) {
      if (a.dead) { a.rainWet = false; continue; }
      a.rainWet = !nativeHost.underRoofAt(a.pos);
    }
  }

export function sceneUpdateCreep(nativeHost:NativeSceneFrameHost, dt: number): void {
    if (!nativeHost.creep) return;
    nativeHost.creep.update(dt, nativeHost.time, nativeHost.actors);
    nativeHost.updateCreepRiders();
  }

export function sceneUpdateCollapse(nativeHost:NativeSceneFrameHost, dt: number): void {
    const cf = nativeHost.collapse;
    if (!cf) return;
    const elig = nativeHost.groundFallEligible();
    const ev = cf.update(dt, elig, elig, nativeHost.wakeBodies());
    if (ev.voided.length) {
      // A few soft cloud-bursts per tick sell the crumble without flooding.
      for (let i = 0; i < Math.min(6, ev.voided.length); i++) {
        const v = ev.voided[i];
        nativeHost.flashes.push({ pos: vec(v.x, v.y), radius: 26, color: '#e6edfb', life: 0.45, maxLife: 0.45 });
      }
      nativeHost.shake = Math.max(nativeHost.shake, Math.min(2.2, 0.4 + ev.voided.length * 0.1));
    }
    if (cf.spineEroding()) {
      if (nativeHost.isPresentLocalPlayer()) nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 56), 'the causeway is failing — run!', '#ffd27f', 16);
      nativeHost.shake = Math.max(nativeHost.shake, 5);
    }
    nativeHost.routeSkyFalls(ev.fell);
  }

export function sceneUpdateFlux(nativeHost:NativeSceneFrameHost, dt: number): void {
    const ff = nativeHost.flux;
    if (!ff) return;
    const eligible = nativeHost.groundFallEligible();
    const ev = ff.update(dt, eligible);
    if (ev.driftBegun) {
      if (nativeHost.isPresentLocalPlayer()) nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 56), 'the drift begins — the clouds will not wait', '#cfe0ff', 16);
      nativeHost.shake = Math.max(nativeHost.shake, 3);
      // Anything the spawn tables stood on cloud that has now LEFT scrambles
      // to standing ground once — packs placed mid-lane don't rain out of a
      // zone the player hasn't even crossed yet. Fliers never needed it.
      for (const a of eligible) {
        if (a === nativeHost.player || a.team === 'player') continue;
        if (ff.voidAt(a.pos.x, a.pos.y)) {
          const s = nativeHost.walk?.snapToWalkable(a.pos);
          if (s) a.pos = vec(s.x, s.y);
        }
      }
    }
    // Carrier riders travel their raft's delta THROUGH confinement (the
    // mover contract: per-frame movers pass `from`), so a raft sliding past
    // an isle hands its rider off instead of shoving them through it.
    for (const r of ev.rode) {
      const a = r.a as Actor;
      const to = nativeHost.clampPos(vec(a.pos.x + r.dx, a.pos.y + r.dy), a.radius, a.pos);
      a.pos = to;
    }
    // The gust: a zone-wide shove while it holds (fliers ride it free unless
    // the spec says otherwise); the warning text fires on its edge.
    if (ev.gustBegan) {
      if (nativeHost.isPresentLocalPlayer()) nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 48), 'the wind rises!', '#bfe0f8', 15);
      nativeHost.shake = Math.max(nativeHost.shake, 2);
    }
    const gust = ff.gustNow();
    const gspec = ff.spec.gusts;
    if (gust?.phase === 'hold' && gspec) {
      // The shove wears a sine envelope — it RISES, peaks, and releases like
      // weather instead of switching on like a conveyor (and the ramp gives
      // a rider one last beat to fight for the raft's heart).
      const envelope = Math.sin(Math.PI * (1 - gust.f));
      const push = gspec.push * envelope * dt;
      for (const a of nativeHost.actors) {
        if (a.dead || (a.flying && !gspec.liftFliers)) continue;
        if (a === nativeHost.player && (nativeHost.traversal || nativeHost.pendingRespawn)) continue;
        const to = nativeHost.clampPos(vec(a.pos.x + gust.x * push, a.pos.y + gust.y * push), a.radius, a.pos);
        a.pos = to;
      }
    }
    for (let i = 0; i < Math.min(4, ev.dispersed.length); i++) {
      const v = ev.dispersed[i];
      nativeHost.flashes.push({ pos: vec(v.x, v.y), radius: 30, color: '#e6edfb', life: 0.5, maxLife: 0.5 });
    }
    nativeHost.routeSkyFalls(ev.fell);
  }

export function sceneUpdateSpans(nativeHost:NativeSceneFrameHost, dt: number): void {
    const sf = nativeHost.spans;
    if (!sf) return;
    const ev = sf.update(dt, (c) => nativeHost.radianceCondHeld(c), nativeHost.groundFallEligible());
    for (let i = 0; i < Math.min(5, ev.voided.length); i++) {
      const v = ev.voided[i];
      nativeHost.flashes.push({ pos: vec(v.x, v.y), radius: 22, color: '#dfe8fa', life: 0.4, maxLife: 0.4 });
    }
    nativeHost.routeSkyFalls(ev.fell);
  }

export function sceneUpdateTracks(nativeHost:NativeSceneFrameHost, dt: number): void {
    if (!nativeHost.tracks.length && !nativeHost.contactHazards.length) return;
    // ONCE-lanes retire at the far end (the boulder meets the wall): cull on
    // the pure clock test with a terminal burst at the exact final pose.
    // Splice-in-place so lane identity survives for everything else.
    for (let i = nativeHost.tracks.length - 1; i >= 0; i--) {
      const tr = nativeHost.tracks[i];
      if (!trackDone(tr, nativeHost.time)) continue;
      for (const r of tr.riders) {
        const pose = trackPose(tr, nativeHost.time, r.phase, r.def);
        const reach = r.def.surface.kind === 'circle'
          ? r.def.surface.r : Math.max(r.def.surface.hw, r.def.surface.hh);
        nativeHost.flashes.push({ pos: vec(pose.x, pose.y), radius: reach * 1.7, color: r.def.color ?? '#cfc4ae', life: 0.45, maxLife: 0.45 });
        nativeHost.shake = Math.max(nativeHost.shake, Math.min(2.4, reach * 0.05));
      }
      nativeHost.tracks.splice(i, 1);
    }
    nativeHost.trackSweepAcc += dt;
    if (nativeHost.trackSweepAcc < TRACK_CFG.applyEvery) return;
    const beatDt = nativeHost.trackSweepAcc; // elapsed since the previous sweep beat
    nativeHost.trackSweepAcc = 0;
    for (const tr of nativeHost.tracks) {
      // Disarmed lanes are retracted whole; pending lanes haven't been born.
      if (!tr.armed || trackPending(tr, nativeHost.time)) continue;
      // Body prefilter per lane (the bound the threat scan already keeps):
      // the swept beat below samples several poses — cull the zone's
      // population to this lane's neighborhood ONCE, not per substep.
      let cand: Actor[] | null = null;
      for (const a of nativeHost.actors) {
        if (a.dead) continue;
        if (a.tier !== (tr.tier ?? 0)) continue; // the lane's own story (the sovereignty gate)
        if (a.pos.x < tr.bound.x0 - a.radius || a.pos.x > tr.bound.x1 + a.radius
          || a.pos.y < tr.bound.y0 - a.radius || a.pos.y > tr.bound.y1 + a.radius) continue;
        (cand ??= []).push(a);
      }
      const owner = tr.spec.ownerId !== undefined
        ? nativeHost.actors.find(a => a.id === tr.spec.ownerId && !a.dead)
        : tr.spec.ownerTag ? nativeHost.actors.find(a => a.tag === tr.spec.ownerTag && !a.dead) : undefined;
      for (const r of tr.riders) {
        const pose = trackPose(tr, nativeHost.time, r.phase, r.def);
        // A rider resting in its cradle (a rearm lane between passes) is
        // harmless — the pose's own pending flag is the one truth. The
        // first pending sample after a pass bursts where the ride actually
        // ENDED (lastLive: the far end for a completed run, mid-lane for a
        // stone that shattered on its stamina roll — the recurring once-
        // lane retire read, honest to the shatter lever).
        if (pose.pending) {
          if (r.resting === false) {
            const end = r.lastLive ?? tr.arc.pts[tr.arc.pts.length - 1];
            const reach = r.def.surface.kind === 'circle'
              ? r.def.surface.r : Math.max(r.def.surface.hw, r.def.surface.hh);
            const color = r.def.color ?? '#cfc4ae';
            nativeHost.flashes.push({ pos: vec(end.x, end.y), radius: reach * 1.7, color, life: 0.45, maxLife: 0.45 });
            nativeHost.shake = Math.max(nativeHost.shake, Math.min(2.4, reach * 0.05));
            // THE SHATTER READ (TRACK_CFG.shatterFx): a stamina-rolled stone
            // dies MID-FLIGHT and the pure pose law re-seats it at the
            // cradle the same instant — one modest flash read as "the
            // boulder blinked out" (user QA report: a strange effect near
            // the end of its curve). The lever IS the look: shatter lanes
            // break apart — a debris fan (offsets hashed off the death
            // point, deterministic, zero rng draws) plus a drying rubble
            // pock riding the evap fabric, so what rolls next pass reads
            // as a NEW stone leaving the old one's bones.
            if (tr.spec.shatter) {
              const FX = TRACK_CFG.shatterFx;
              for (let fi = 0; fi < FX.fragments; fi++) {
                const ang = fi * 2.39996 + (end.x + end.y) * 0.013;
                const dist = reach * (0.5 + 0.45 * (((fi + 1) * 2654435761 >>> 13) % 97) / 97);
                const life = 0.3 + 0.05 * fi;
                nativeHost.flashes.push({
                  pos: vec(end.x + Math.cos(ang) * dist, end.y + Math.sin(ang) * dist),
                  radius: reach * (0.3 + 0.08 * (fi % 3)), color,
                  life, maxLife: life,
                });
              }
              const rubble: Doodad = {
                pos: vec(end.x, end.y), radius: Math.max(10, reach * 0.9),
                kind: 'boulder_rubble',
                evap: { t: FX.rubbleDwell, rate: FX.rubbleRate },
              };
              nativeHost.doodads.push(rubble);
              nativeHost.evaporating.push(rubble);
              nativeHost.markDoodadsChanged(rubble);
            }
          }
          r.resting = true;
          continue;
        }
        r.resting = false;
        r.lastLive = { x: pose.x, y: pose.y };
        if (!cand) continue; // nobody near the lane — poses need no testing
        // THE SWEPT BEAT (the precision contract): one sample per beat lets
        // a fast surface cross a body BETWEEN samples (a 520px/s dart clears
        // a torso in ~30ms; a long arm's tip outruns its own hub several
        // times over). The pose is a pure clock function, so the in-between
        // is free — walk the beat window at surface-honest steps (center
        // travel + rotation×reach bounds any point's motion) and land the
        // payload at the pose that actually CROSSED the body: contact is
        // where the blade was, the shove points where it was going.
        const reach = r.def.surface.kind === 'circle'
          ? r.def.surface.r : Math.hypot(r.def.surface.hw, r.def.surface.hh);
        const prev = trackPose(tr, nativeHost.time - beatDt, r.phase, r.def);
        const dRotRaw = pose.rot - prev.rot;
        const rotSwept = r.def.surface.kind === 'rect'
          ? Math.abs(Math.atan2(Math.sin(dRotRaw), Math.cos(dRotRaw))) * reach
          : 0; // discs are rotation-invariant — only the center's travel matters
        const travel = Math.hypot(pose.x - prev.x, pose.y - prev.y) + rotSwept;
        const steps = Math.min(TRACK_CFG.sweepStepsMax,
          Math.max(1, Math.ceil(travel / TRACK_CFG.sweepStepPx)));
        for (let k = 1; k <= steps; k++) {
          const sub = k === steps ? pose
            : trackPose(tr, nativeHost.time - beatDt + (k / steps) * beatDt, r.phase, r.def);
          if (sub.pending) continue; // a release/rest edge inside the beat
          const shape = riderSurface(r.def, sub);
          nativeHost.sweepHazardSurface(sub.x, sub.y, shape, sub.dir, r.def.payload, r.icdUntil, owner, cand, tr.tier ?? 0);
        }
      }
    }
    for (const c of nativeHost.contactHazards) {
      if (c.d.gone || c.d.felled) continue; // a crushed bumper bumps nothing (the rampage fabric)
      const rule = doodadRuleOf(c.d.kind);
      if (!rule.contact) continue;
      const shape = hitSurfaceOf(c.d, 'move');
      nativeHost.sweepHazardSurface(c.d.pos.x, c.d.pos.y, shape, c.d.rot ?? 0, rule.contact, c.gate, observeNativeSource(nativeHost, c.d.contactSource), nativeHost.actors, c.d.tier ?? 0);
    }
  }

export function sceneUpdateGeysers(nativeHost:NativeSceneFrameHost, dt: number): void {
    const f = nativeHost.geysers;
    if (!f) return;
    // Comet landings due — the transience fabric plants the drying pock
    // (plantImpactDress: walkable check, per-zone cap, evap hand-off).
    for (let i = nativeHost.geyserPocks.length - 1; i >= 0; i--) {
      const p = nativeHost.geyserPocks[i];
      if (nativeHost.time < p.at) continue;
      nativeHost.geyserPocks.splice(i, 1);
      nativeHost.flashes.push({ pos: vec(p.x, p.y), radius: GEYSER_CFG.comet.splashR, color: '#bfeaf4', life: 0.3, maxLife: 0.3 });
      nativeHost.plantImpactDress({
        pos: vec(p.x, p.y), radius: GEYSER_CFG.comet.splashR,
        impactDress: { kind: 'scald_pock', evapAfter: [GEYSER_CFG.comet.pockDwell[0], GEYSER_CFG.comet.pockDwell[1]] },
      });
    }
    nativeHost.geyserSweepAcc += dt;
    if (nativeHost.geyserSweepAcc < GEYSER_CFG.applyEvery) return;
    nativeHost.geyserSweepAcc = 0;
    for (let vi = 0; vi < f.vents.length; vi++) {
      const v = f.vents[vi];
      const read = ventReadAt(f, v, nativeHost.time, nativeHost.geyserMode);
      // THE BURST EDGE keys on the burst's CLOCK TIME (VentRead.burstAt),
      // not the ordinal: THE SURGE HOUR's tide hand-offs step `k`, and a
      // burst is a burst whatever regime struck it. Resume/first frame:
      // the burst in flight is remembered, never re-fired (no retro burst).
      if (read.phase === 'erupt') {
        if (v.lastBurstAt === undefined) {
          v.lastBurstAt = read.burstAt;
        } else if (read.burstAt > v.lastBurstAt + 0.25) {
          v.lastBurstAt = read.burstAt;
          nativeHost.geyserBurstFx(v, vi, read.k, read.surge);
        }
      } else if (v.lastBurstAt === undefined) {
        v.lastBurstAt = -1e9;                // quiet at first sight: the next burst fires
      }
      if (read.phase !== 'erupt') continue;
      // THE COLUMN: a strike at the vent's own seat — candidates culled to
      // the disc, payload through sweepHazardSurface with NO owner:
      // uncredited environment, faction-blind, sleepers + airborne spared
      // by the grammar's defaults. One eruption = one hit per body (ICD).
      const cls = GEYSER_CFG.classes[v.cls];
      let cand: Actor[] | null = null;
      for (const a of nativeHost.actors) {
        if (a.dead) continue;
        if (Math.abs(a.pos.x - v.pos.x) > cls.columnR + a.radius
          || Math.abs(a.pos.y - v.pos.y) > cls.columnR + a.radius) continue;
        (cand ??= []).push(a);
      }
      if (!cand) continue;
      nativeHost.sweepHazardSurface(v.pos.x, v.pos.y, { kind: 'circle', r: cls.columnR }, 0,
        columnPayload(v.cls), v.gate, undefined, cand, v.tier ?? 0);
    }
  }

export function sceneUpdateVentDwellers(nativeHost:NativeSceneFrameHost, dt: number): void {
    // SOVEREIGNTY: self — dwellers seat at their own vents (the derived census, probe_tiers RIG T).
    nativeHost.ventDwellAcc += dt;
    if (nativeHost.ventDwellAcc < VENT_DWELLER_CFG.sweepEvery) return;
    nativeHost.ventDwellAcc = 0;
    const f = nativeHost.geysers;
    const SUB = VENT_DWELLER_CFG.submergedStatus, SINK = VENT_DWELLER_CFG.sinkingStatus;
    for (const a of nativeHost.actors) {
      if (a.dead) continue;
      const spec = a.defId ? MONSTERS[a.defId]?.ventDweller : undefined;
      if (!spec) continue;
      let st = nativeHost.ventDwellers.get(a);
      if (!st) {
        // THE HOME VENT: the nearest vent in reach of the seat it was placed on.
        const reach = spec.reach ?? VENT_DWELLER_CFG.homeReach;
        let best = -1, bd = Infinity;
        if (f) {
          for (let i = 0; i < f.vents.length; i++) {
            const d = dist(f.vents[i].pos, a.pos);
            if (d <= reach && d < bd) { bd = d; best = i; }
          }
        }
        st = { vent: best, phase: null, columnSeenAt: -Infinity };
        nativeHost.ventDwellers.set(a, st);
        if (best < 0) {
          console.warn(`[ventDweller] '${a.defId}' in '${nativeHost.zone.id}' finds no vent within ${reach} of its seat — it stands as an ordinary body`);
          continue;
        }
        // ROOTED IN THE VENT: never walks off it, never shoved off it (its
        // own column's authorless shove included).
        a.anchored = true;
        const home = f!.vents[best];
        const read0 = ventReadAt(f!, home, nativeHost.time, nativeHost.geyserMode);
        // THE SEEN COLUMN's first witness: the base clock's burst is a real
        // burst by construction (a resume mid-window rises at once); a tide
        // read (the surge hour's hand-offs can reset a count without a
        // column) is trusted only once a beat is SEEN.
        st.columnSeenAt = read0.surge ? -Infinity : nativeHost.time - read0.sinceBurst;
        for (const g of lintVentDweller(spec, read0.period, `${a.defId} @ ${nativeHost.zone.id}`, GEYSER_CFG.classes[home.cls].eruptSec)) {
          console.warn(`[ventDweller] ${g}`);
        }
      }
      if (st.vent < 0 || !f) continue;
      const v = f.vents[st.vent];
      if (!v) continue;
      const read = ventReadAt(f, v, nativeHost.time, nativeHost.geyserMode);
      if (read.phase === 'erupt') st.columnSeenAt = nativeHost.time; // the column, witnessed
      const phase = dwellerPhaseAt(read, spec, GEYSER_CFG.classes[v.cls].eruptSec, { columnSeenAt: st.columnSeenAt, now: nativeHost.time });
      if (phase === 'under') { a.pos.x = v.pos.x; a.pos.y = v.pos.y; } // pinned — a shove while under moves nothing
      if (phase === st.phase) continue;
      const first = st.phase === null;
      st.phase = phase;
      if (phase === 'under') {
        // SUBMERGE: the body hangs inside the vent, outside time.
        if (a.gripping) nativeHost.grabRelease(a);
        a.casting = null;
        for (let i = nativeHost.zones.length - 1; i >= 0; i--) {
          const z = nativeHost.zones[i];
const nativeRecordScope=nativeHost.beginCombatRecord("zones", z);
try {
          if (z.caster === a && !z.exploded) nativeHost.zones.splice(i, 1); // its unfired telegraphs die with the dive
        
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
        a.endStatus(SINK);
        nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(SUB, 0, 1, 'the vent'));
        a.untargetable = true;
        a.invulnerable = true;
        if (!first) {
          nativeHost.flashes.push({ pos: vec(v.pos.x, v.pos.y), radius: a.radius * 1.6, color: VENT_DWELLER_CFG.color, life: 0.45, maxLife: 0.45 });
          if (spec.sinkText) nativeHost.text(vec(v.pos.x, v.pos.y - a.radius - 12), spec.sinkText, VENT_DWELLER_CFG.color, 13);
        }
        continue;
      }
      a.endStatus(SUB);
      a.untargetable = false;
      a.invulnerable = false;
      if (phase === 'sinking') {
        nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(SINK, 0, 1, 'the vent'));
        continue;
      }
      a.endStatus(SINK);
      if (!first) {
        // THE BREACH: the rise (the spawn-in scale-up re-stamped), the splash, the word.
        a.spawnedAt = nativeHost.time;
        nativeHost.flashes.push({ pos: vec(a.pos.x, a.pos.y), radius: a.radius * VENT_DWELLER_CFG.breachFlashMul, color: VENT_DWELLER_CFG.color, life: 0.5, maxLife: 0.5 });
        nativeHost.shake = Math.max(nativeHost.shake, VENT_DWELLER_CFG.breachShake);
        if (spec.breachText) nativeHost.text(vec(a.pos.x, a.pos.y - a.radius - 16), spec.breachText, VENT_DWELLER_CFG.color, 15);
      }
    }
  }

export function sceneUpdateScaldHeat(nativeHost:NativeSceneFrameHost, dt: number): void {
    nativeHost.scaldHeatAcc += dt;
    if (nativeHost.scaldHeatAcc < SCALD_CFG.sweepEvery) return;
    const step = nativeHost.scaldHeatAcc;
    nativeHost.scaldHeatAcc = 0;
    // (1)+(2): the live vents — erupting columns and broiling mouths.
    let hot: { x: number; y: number; r: number; perSec: number }[] | null = null;
    const f = nativeHost.geysers;
    if (f) {
      for (const v of f.vents) {
        const read = ventReadAt(f, v, nativeHost.time, nativeHost.geyserMode);
        if (read.phase === 'quiet') continue;
        if (read.phase === 'erupt') {
          (hot ??= []).push({ x: v.pos.x, y: v.pos.y, r: GEYSER_CFG.classes[v.cls].columnR, perSec: SCALD_CFG.column[v.cls] });
        } else {
          (hot ??= []).push({ x: v.pos.x, y: v.pos.y, r: GEYSER_CFG.mouthR[v.cls], perSec: SCALD_CFG.mouth.broilPerSec });
        }
      }
    }
    // (3): the sulphur pools standing in this zone (the doodad list IS the
    // ground's truth — a planted pool counts the moment it stands).
    let pools: Doodad[] | null = null;
    for (const d of nativeHost.doodads) if (d.kind === 'sulphur_pool') (pools ??= []).push(d);
    // (4): THE RUNOFF's live wash (GEYSER_CFG.runoff.kind — the scald run
    // a great vent pours downstream): a body standing live cover warms on
    // the same seam (the downstream lane the brood clutches hatch on).
    const runoffKind = GEYSER_CFG.runoff.kind;
    const runoff = nativeHost.creep && nativeHost.creep.sources.some(s => s.def.id === runoffKind && s.cur >= CREEP_CFG.minReach)
      ? nativeHost.creep : null;
    const runoffFloor = CREEPS[runoffKind]?.hitFloor ?? CREEP_CFG.hitFloor;
    for (const a of nativeHost.actors) {
      if (a.dead || a.downed) continue;
      if (a.tier !== 0) continue; // the basin's heat is the ground's (the sovereignty gate; a per-source story can follow)
      if (!a.flying && (hot || pools || runoff)) {
        let rate = 0;
        if (runoff && runoff.coverOf(runoffKind, a.pos.x, a.pos.y, a.radius * 0.5) >= runoffFloor) {
          rate += SCALD_CFG.runoff.perSec;
        }
        if (hot) {
          for (const h of hot) {
            const reach = h.r + a.radius;
            if (Math.abs(a.pos.x - h.x) > reach || Math.abs(a.pos.y - h.y) > reach) continue;
            if (Math.hypot(a.pos.x - h.x, a.pos.y - h.y) <= reach) rate += h.perSec;
          }
        }
        if (pools) {
          for (const p of pools) {
            const reach = p.radius + SCALD_CFG.pool.reach + a.radius;
            if (Math.abs(a.pos.x - p.pos.x) > reach || Math.abs(a.pos.y - p.pos.y) > reach) continue;
            if (Math.hypot(a.pos.x - p.pos.x, a.pos.y - p.pos.y) <= reach) { rate += SCALD_CFG.pool.perSec; break; }
          }
        }
        if (rate > 0) nativeHost.scorchFeed(a, Math.min(SCALD_CFG.maxPerSec, rate) * step);
      }
      // THE BASKER (MonsterDef.bask) — the def's spec, read off the id.
      const bask = a.defId ? MONSTERS[a.defId]?.bask : undefined;
      if (bask) nativeHost.updateBask(a, bask, step);
      // THE WARM HATCH (ConstructDelivery.hatch.onScorch): a pod whose own
      // bar reached its threshold — the burn rain's landing, the runoff's
      // wash, a column, a pool's rim — hatches EARLY (the shallows brood
      // matron's clutches; every great eruption followed by something
      // small and hungry downstream). The payload fires now; the shell
      // retires on the ordinary expiry path next tick.
      const hatch = a.construct?.hatch;
      if (hatch?.onScorch !== undefined && a.lifespan !== undefined && a.lifespan > 0.02
        && nativeHost.scorchOf(a) >= hatch.onScorch) {
        nativeHost.hatchPod(a);
        a.lifespan = 0.01;
      }
    }
  }

export function sceneUpdateCharRegrowth(nativeHost:NativeSceneFrameHost, dt: number): void {
    if (!nativeHost.zone.theme.regrowth) return; // opt-in per theme (ZoneTheme.regrowth): elsewhere ash stays ash
    nativeHost.charRegrowAcc += dt;
    if (nativeHost.charRegrowAcc < REGROWTH_CFG.sweepEvery) return;
    nativeHost.charRegrowAcc = 0;
    const R = REGROWTH_CFG;
    let budget = R.perSweep;
    for (const d of nativeHost.doodads) {
      if (budget <= 0) break;
      if (d.gone || d.evap) continue;
      const stage = d.kind === R.ash ? 0 : d.kind === R.flush ? 1 : -1;
      if (stage < 0) continue;
      const age = nativeHost.time - (d.laidAt ?? nativeHost.charBorn ?? nativeHost.time);
      if (stage === 0 && age >= R.flushAfter) {
        d.kind = R.flush as DoodadKind;
        nativeHost.markDoodadsChanged(d);
        budget--;
      } else if (stage === 1 && age >= R.meadowAfter) {
        d.kind = R.meadow as DoodadKind;
        nativeHost.markDoodadsChanged(d);
        budget--;
        // THE FIRE-FOLLOWERS: flora standing up through the ash — runtime
        // dress on the evap fabric (planted small, drying away after a long
        // dwell so the meadow is never a permanent repaint).
        const n = randInt(R.flora.count[0], R.flora.count[1]);
        for (let i = 0; i < n; i++) {
          const ang = rand(0, Math.PI * 2);
          const dd = rand(0.2, 0.85) * d.radius;
          const x = d.pos.x + Math.cos(ang) * dd, y = d.pos.y + Math.sin(ang) * dd;
          if (nativeHost.walk && !nativeHost.walk.isWalkable(x, y)) continue;
          if (nativeHost.pointInSolid(x, y, 6)) continue;
          const f: Doodad = {
            pos: vec(x, y), radius: rand(R.flora.radius[0], R.flora.radius[1]),
            kind: R.flora.kind as DoodadKind, rot: rand(0, Math.PI * 2),
            evap: { t: rand(R.flora.dwell[0], R.flora.dwell[1]), rate: R.flora.evapRate },
          };
          normalizeDoodadBound(f);
          nativeHost.doodads.push(f);
          nativeHost.evaporating.push(f);
          nativeHost.markDoodadsChanged(f);
        }
      }
    }
  }

export function sceneUpdateSoulriver(nativeHost:NativeSceneFrameHost, dt: number): void {
    if (!isSoulriverId(nativeHost.zone.id)) return;
    nativeHost.soulriverAcc -= dt;
    if (nativeHost.soulriverAcc > 0) return;
    const cfg = SOULRIVER_CFG.assault;
    nativeHost.soulriverAcc = cfg.everySec[0] + Math.random() * (cfg.everySec[1] - cfg.everySec[0]);
    const lane = nativeHost.tracks.find(t => t.spec.tag === 'pale_ferry');
    if (!lane || !lane.armed) return;
    // Find a deck carrying a living player, and how deep its journey runs.
    let deck: { x: number; y: number; dir: number; frac: number; paused: boolean } | null = null;
    for (const r of lane.riders) {
      if (!r.def.carry) continue;
      const pose = trackPose(lane, nativeHost.time, r.phase, r.def);
      if (pose.pending) continue;
      const board = riderSurface(r.def, pose);
      for (const p of nativeHost.actors) {
        if (p.dead || p.team !== 'player' || p.kind === 'minion' || p.kind === 'mercenary') continue;
        if (p.tier !== 0) continue; // the river's boards are the ground's (the sovereignty gate)
        if (!shapeContains(board, pose.x, pose.y, p.pos.x, p.pos.y, 0)) continue;
        const frac = trackArcFrac(lane, nativeHost.time, r.phase) ?? 0;
        deck = { x: pose.x, y: pose.y, dir: pose.dir, frac, paused: pose.paused };
        break;
      }
      if (deck) break;
    }
    if (!deck) return;
    // THE CALL AT THE PIER: pausing at a LANDING with a living passenger
    // aboard REVEALS that landing's destination on the chart (the
    // landing-law reveal — riding the sea surveys its ports). Wild strands
    // have no destination to call: the pause is just the pause.
    if (deck.paused) {
      const palette = (nativeHost.zone.layoutParams as { dockBiomes?: string[] } | undefined)?.dockBiomes ?? [];
      const plan = soulriverPlan(nativeHost.zone.seed ?? 0, nativeHost.zone.size.w, nativeHost.zone.size.h, palette);
      const atDock = plan.docks.find(d => Math.hypot(d.pier.x - deck!.x, d.pier.y - deck!.y) < 70);
      const key = soulriverKeyOf(nativeHost.zone.id);
      if (atDock?.landing && key) {
        const dest = nativeHost.zoneMap[`${SOULRIVER_CFG.dockIdBase}_${key}_${atDock.i}`];
        if (dest?.veiled) {
          dest.veiled = false;
          nativeHost.surveyed.add(dest.id);
          // The call names the landing NOW: the standing dock portal flips
          // from 'Uncharted' to the name (the entry law) — no zone reload
          // between the cry and the door.
          nativeHost.refreshExitLabels();
          nativeHost.text(vec(deck.x, deck.y - 90), `the ship calls at ${dest.name}`, '#9fd8ec', 15);
        }
      }
    }
    // Docked = a breather: the hunger slackens to a trickle at the piers.
    if (deck.paused && Math.random() > cfg.lull) return;
    const live = nativeHost.actors.reduce((n, a) => n + (!a.dead && a.tag === 'soulriver_assault' ? 1 : 0), 0);
    // The cap breathes with the journey: deeper water, hungrier dead.
    const cap = Math.round(cfg.cap * (1 + (cfg.escalate - 1) * deck.frac));
    if (live >= cap) return;
    // The deep water sends heavier company as the terminus nears.
    const id = deck.frac > 0.6 && Math.random() < 0.25 ? 'banshee'
      : deck.frac > 0.3 && Math.random() < 0.35 ? 'drowned_hauler'
        : 'lorn_shade';
    const m = nativeHost.createMonster(id, nativeHost.zone.level, 'enemy');
    m.tag = 'soulriver_assault';
    // Conjured from the water off the prow's quarter — never on the boards.
    const side = Math.random() < 0.5 ? 1 : -1;
    const ang = deck.dir + side * (Math.PI / 2) * (0.4 + Math.random() * 0.8);
    const dist = cfg.fromWater * (0.8 + Math.random() * 0.7);
    m.pos = vec(deck.x + Math.cos(ang) * dist, deck.y + Math.sin(ang) * dist);
    m.aggroed = true;
    // Finite horizon, never Infinity (the wave-frenzy JSON law).
    m.alertUntil = nativeHost.time + 1e9;
    { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
  }

export function sceneUpdateTrapworks(nativeHost:NativeSceneFrameHost, dt: number): void {
    if (nativeHost.trapDeferred.length) {
      for (let i = nativeHost.trapDeferred.length - 1; i >= 0; i--) {
        if (nativeHost.time < nativeHost.trapDeferred[i].at) continue;
        const d = nativeHost.trapDeferred[i];
        nativeHost.trapDeferred.splice(i, 1);
        d.run();
      }
    }
    if (!nativeHost.trapworks.length) return;
    nativeHost.trapSweepAcc += dt;
    if (nativeHost.trapSweepAcc < TRAPWORK_CFG.sweepEvery) return;
    nativeHost.trapSweepAcc = 0;
    for (const tw of nativeHost.trapworks) {
      if (tw.state === 'sprung') {
        if (nativeHost.time >= tw.rearmAt) {
          tw.state = 'armed';
          const at = trapAnchor(tw.spec.trigger);
          nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 18, color: '#b8a888', life: 0.3, maxLife: 0.3 });
        }
        continue;
      }
      const t = tw.spec.trigger;
      for (const a of nativeHost.actors) {
        if (a.dead || a.downed || a.untargetable || a.invulnerable || a.passive) continue;
        if ((t.sparesDormant ?? true) && isDormant(a)) continue;
        if ((t.sparesAirborne ?? true) && (a.flying || a.leap)) continue;
        const who = t.who ?? 'any';
        if (who === 'player' && a.team !== 'player') continue;
        if (who === 'enemy' && a.team === 'player') continue;
        if (t.factions && (!a.faction || !t.factions.includes(a.faction))) continue;
        if (t.notFactions && a.faction && t.notFactions.includes(a.faction)) continue;
        if (a.tier !== (tw.tier ?? 0)) continue; // the plate lies on its own story (the sovereignty gate)
        if (!trapTriggerHit(t, a.pos.x, a.pos.y, a.radius)) continue;
        nativeHost.springTrapwork(tw, a);
        break;
      }
    }
  }

export function sceneUpdateShrines(nativeHost:NativeSceneFrameHost): void {
    const hands = nativeHost.touchers(); // THE ACTING SEAT: the draught lands on whoever touched the shrine
    if (!hands.length) return;
    for (const s of nativeHost.shrines) {
      if (s.used) continue;
      const p = hands.find(h => dist(s.pos, h.pos) <= h.radius + 24);
      if (!p) continue;
      s.used = true;
      p.addBuff({ type: 'buff', id: 'shrine_' + s.def.id, label: s.def.name, duration: s.def.duration, mods: s.def.mods });
      nativeHost.text(vec(s.pos.x, s.pos.y - 20), s.def.name + '!', s.def.color, 16);
      nativeHost.flashes.push({ pos: vec(s.pos.x, s.pos.y), radius: 60, color: s.def.color, life: 0.45, maxLife: 0.45 });
    }
  }

export function sceneUpdateAltars(nativeHost:NativeSceneFrameHost, dt: number): void {
    nativeHost.altars.forEach((al, i) => {
      const src = 'altar:' + (al.massSource ?? i);
      const inside = new Set<number>();
      for (const a of nativeHost.actors) {
        if (a.dead) continue;
        if (a.tier !== (al.tier ?? 0)) continue; // the altar's own story (the sovereignty gate)
        if (dist(al.pos, a.pos) - a.radius > al.def.radius) continue;
        inside.add(a.id);
        if (!al.affected.has(a.id)) a.sheet.setSource(src, al.def.mods);
      }
      for (const a of nativeHost.actors) {
        if (al.affected.has(a.id) && !inside.has(a.id)) a.sheet.removeSource(src);
      }
      al.affected = inside;
      // THE LOCALIZED STORM: bolts on random ground inside the field, friend
      // and foe alike — the weather-strike pipeline, altar-local (telegraphed,
      // dodgeable, AI-readable like any blast disc).
      const bolts = al.def.bolts;
      if (bolts && bolts.ratePerSec > 0) {
        al.boltTimer = (al.boltTimer ?? rand(0, 1 / bolts.ratePerSec)) - dt;
        if (al.boltTimer <= 0) {
          al.boltTimer = 1 / bolts.ratePerSec;
          const ang = rand(0, Math.PI * 2);
          const r = Math.sqrt(rand(0, 1)) * Math.max(0, al.def.radius - bolts.radius * 0.5);
          nativeHost.fireStrikeAt(bolts, vec(al.pos.x + Math.cos(ang) * r, al.pos.y + Math.sin(ang) * r), al.level);
        }
      }
      // THE MENDING PULSE: heal EVERYONE inside — enemies included (bring
      // burst, or fight outside the light).
      const mend = al.def.mend;
      if (mend) {
        al.mendTimer = (al.mendTimer ?? mend.every) - dt;
        if (al.mendTimer <= 0) {
          al.mendTimer = mend.every;
          const heal = mend.base + mend.perLevel * Math.max(1, al.level ?? nativeHost.zone.level);
          let touched = 0;
          for (const a of nativeHost.actors) {
            if (a.dead || !inside.has(a.id)) continue;
            if (a.healBy(heal) > 0) {
              touched++;
              const mendCue=restorationCueFlash(al.pos,a,mend.cue===false?false:{color:al.def.color,...mend.cue},al.tier??0);
              if(mendCue)nativeHost.flashes.push(mendCue);
            }
          }
          if (touched > 0) {
            nativeHost.flashes.push({ pos: vec(al.pos.x, al.pos.y), radius: al.def.radius * 0.5, color: al.def.color, life: 0.35, maxLife: 0.35 });
          }
        }
      }
    });
  }

export function sceneUpdateChests(nativeHost:NativeSceneFrameHost, dt: number): void {
    const hands = nativeHost.touchers(); // THE ACTING SEAT: any standing player's hands pick the lock
    if (!hands.length) return;
    for (let i = nativeHost.chests.length - 1; i >= 0; i--) {
      const c = nativeHost.chests[i];
      if (c.opened) continue;
      const near = hands.some(h => chestInReach(c, h));
      if (c.kind === 'objective') {
        if (nativeHost.chestObjectiveDone(c) && near) nativeHost.openChest(c);
        continue;
      }
      // Timed: hold the ground to pick the lock; back off and it re-sets.
      if (near) {
        c.lockTime -= dt * (nativeHost.massRuntime?.cacheHoldRate(nativeHost, c) ?? 1);
        if (c.lockTime <= 0) {
          nativeHost.chests.splice(i, 1);
          if (c.mimic) {
            // It was never a chest.
            const m = nativeHost.createMonster(FIXTURE_IDS.mimic, Math.max(1, nativeHost.zone.level), 'enemy');
            m.fromZoneGen = true; // a revealed chest cannot respawn on a return trip
            m.pos = nativeHost.clampPos(vec(c.pos.x, c.pos.y), m.radius);
            { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
            nativeHost.emergeBody(m, { host: true }); // THE EMERGENCE GRAMMAR: it was never a chest — the mimic BURSTS OUT of it (no caption)
          } else {
            nativeHost.chests.push(c); // keep it for the renderer's opened state
            nativeHost.openChest(c);
          }
        }
      } else if (c.lockTime < c.maxLock) {
        c.lockTime = Math.min(c.maxLock, c.lockTime + dt * CHEST_INTERACTION_CFG.recoveryPerSecond);
      }
    }
  }

export function sceneUpdateLeaps(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const a of nativeHost.actors) {
      const L = a.leap;
      if (!L) continue;
      if (a.dead) { a.leap = undefined; continue; }
      // A held body hangs MID-LEAP (engine/timeflow.ts): its clock stops, so
      // the interpolation below re-derives the same airborne point each frame.
      L.timer -= dt * nativeHost.timeflow.actorScale(a);
      const t = clamp(1 - L.timer / L.total, 0, 1);
      const visualFrom = { ...a.pos };
      // Airborne: raw interpolation, no terrain collision — you're above it.
      a.pos = vec(L.from.x + (L.dest.x - L.from.x) * t, L.from.y + (L.dest.y - L.from.y) * t);
      nativeHost.noteMovementTravel(a, L.inst, visualFrom, t);
      if (L.timer > 0) continue;
      a.pos = vec(L.dest.x, L.dest.y);
      a.untargetable = L.wasUntargetable;
      a.leap = undefined;
      // THE SIGIL ON THE SLAM (minter round 2): the landing wears the
      // melee grammar — square covers the crater's corners, triangle
      // drives a pointed wedge along the landing facing. Drawn == tested.
      const lTags = skillContextTags(L.inst.def, grantedTags(L.inst));
      const lMods = instanceMods(L.inst);
      const lSigil = Math.round(a.sheet.get('aoeShape', lTags, lMods));
      const lShape = lSigil === 1 || lSigil === 2 ? lSigil : 0;
      for (const e of nativeHost.enemiesOf(a)) {
        if (!sameStory(a, e)) continue; // the slam is a touch (the sovereignty gate)
        if (lShape
          ? inAoe(a.pos, L.radius, lShape, a.facing, e.pos, e.radius)
          : dist(a.pos, e.pos) - e.radius <= L.radius) {
          nativeHost.resolveHit(a, L.inst, e, L.dmgMult);
        }
      }
      // THE MALLET: the slam's crater rings bells and pops brittle scenery
      // (leap onto your own bell — the classic).
      nativeHost.strikeSurfaces(a, a.pos, L.radius);
      nativeHost.flashes.push({
        pos: vec(a.pos.x, a.pos.y), radius: L.radius,
        color: cosmeticSkillPaint(nativeHost, a, L.inst.def.id).color ?? L.inst.def.color, life: 0.3, maxLife: 0.3,
        fx: skillMovementVoice(L.inst.def.id, 'impact'), recoveryCueTier: a.tier,
        shape: lShape, facing: a.facing,
      });
      // The cascade family reaches the SKYFALL: the landing's sequels
      // mint off the slam's true figure (sigils riding), the march
      // striding the landing facing.
      nativeHost.mintAftermath(a, L.inst, a.pos, L.radius, lShape, a.facing,
        L.dmgMult, lTags, lMods);
      // The landing is the skill's area: No Man's Land fields drop here
      // (Phoenix Dive scorches its crater), and Dive Bomb double-dips.
      nativeHost.moveBlast(a, L.inst, a.pos);
      nativeHost.dropLingerField(a, L.inst, a.pos);
      // Fire Walker's second footprint (the launch dropped the first).
      const mtLand = a.sheet.get('moveTrail',
        skillContextTags(L.inst.def, grantedTags(L.inst)), instanceMods(L.inst));
      if (mtLand > 0) {
        nativeHost.mintTrailPatch(a, L.inst, nativeHost.statTrailSpec(mtLand), a.pos, a.facing);
      }
      // THE ANSWERING LEAP (guardBash beyond the stance): a guard-tagged
      // leap with a bash spec answers at the landing — through the same
      // poolless stand-in the charge pays.
      const lBash = guardBashSpec(L.inst);
      if (lBash) {
        nativeHost.guardBash(a, L.inst, lBash, BASH_CFG.poollessShield
          * a.sheet.get('guardStrength', skillContextTags(L.inst.def, grantedTags(L.inst)), instanceMods(L.inst)));
      }
    }
  }

export function sceneUpdateWorms(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const a of nativeHost.actors) {
      if (!a.worm || a.dead) continue;
      const w = a.worm;
      while (w.segments.length < w.length) {
        const last = w.segments[w.segments.length - 1] ?? a.pos;
        w.segments.push(vec(last.x, last.y));
      }
      let prev = a.pos;
      for (const seg of w.segments) {
        const d = dist(seg, prev);
        if (d > w.spacing) {
          const pull = (d - w.spacing) / d;
          seg.x += (prev.x - seg.x) * pull;
          seg.y += (prev.y - seg.y) * pull;
        }
        prev = seg;
      }
      tickSegFlash(w, dt);
      if (a.segTears?.length) {
        const spec = w.wounds;
        for (const seg of a.segTears) {
          const at = w.segments[seg];
          if (!at || !spec) continue;
          const r = segR(a, seg);
          const anatomyState = anatomyCueState(a).segments.find(s => s.index === seg);
          if (anatomyState) nativeHost.flashes.push(anatomyFlash(at, r, a.facing, anatomyState));
          // The retaliation pop: the torn coil bites back — typed damage to
          // the worm's enemies around the wound (environmental idiom, the
          // worm credited as killer so a death here reads honestly).
          if (spec.burst) {
            const b = spec.burst;
            const amounts: Partial<Record<DamageType, number>> =
              { [b.type ?? 'physical']: a.maxLife() * b.damageFrac };
            for (const e of nativeHost.enemiesOf(a)) {
              if (!sameStory(a, e)) continue; // the segment bursts on its own story (the sovereignty gate)
              if (reachTo(e, at) > b.radius) continue;
              const taken = mitigateTyped(e, { ...amounts });
              if (taken > 0) {
                e.life -= taken;
                e.hitFlash = 0.1;
                e.hitFlashType = b.type ?? 'physical';
                nativeHost.text(vec(e.pos.x, e.pos.y - 12), Math.round(taken).toString(), b.color ?? '#ffd24a', 11);
                if (e.life <= 0 && !e.dead) nativeHost.kill(e, false, a);
              }
            }
            nativeHost.flashes.push({
              pos: vec(at.x, at.y), radius: b.radius,
              color: b.color ?? '#ffd24a', life: 0.3, maxLife: 0.3,
            });
          }
        }
        // Wound mods stack per torn segment — ONE sheet source, rebuilt to
        // the live count (INCREASED sums across repeats).
        if (spec?.mods?.length) {
          const n = woundCount(a);
          const stacked: Modifier[] = [];
          for (let i = 0; i < n; i++) stacked.push(...spec.mods);
          a.sheet.setSource('segWounds', stacked);
        }
        a.segTears = undefined;
      }
    }
  }

export function sceneUpdateParts(nativeHost:NativeSceneFrameHost): void {
    for (const a of nativeHost.actors) {
      if (a.dead) continue;
      const def = a.defId ? MONSTERS[a.defId] : undefined;
      if (def?.parts && !a.partsSpawned) {
        a.partsSpawned = true;
        // ??= not =: a runtime graft may have landed BEFORE the first update
        // tick (the contagion infects pack members at creation) — the lazy
        // attach must append beside it, never orphan it.
        a.partActors ??= [];
        for (const pd of def.parts) nativeHost.graftPart(a, pd);
      }
      if (!a.partActors?.length) continue;
      const c = Math.cos(a.facing), s = Math.sin(a.facing);
      for (const part of a.partActors) {
        if (part.dead || !part.partLink) continue;
        const pd = part.partLink.def;
        part.pos.x = a.pos.x + (pd.dx * c - pd.dy * s) * a.radius;
        part.pos.y = a.pos.y + (pd.dx * s + pd.dy * c) * a.radius;
        // Idle/inert parts wear the root's bearing (+ their mount angle);
        // parts in a fight keep the facing their own AI chose.
        if (part.skills.length === 0 || !part.aggroed) {
          part.facing = a.facing + (pd.rot ?? 0);
        }
      }
    }
  }

export function sceneUpdateCreepHearts(nativeHost:NativeSceneFrameHost): void {
    for (const a of nativeHost.actors) {
      if (a.dead || !a.defId || (a.creepPlanted && a.creepPumpAt === undefined)) continue;
      const cs = MONSTERS[a.defId]?.creepSource;
      if (!cs) continue;
      if (!a.creepPlanted) {
        a.creepPlanted = true;
        const def = CREEPS[cs.kind];
        if (!def) { console.warn(`[creep] '${a.defId}' names unknown creep kind '${cs.kind}'`); continue; }
        const field = nativeHost.creepEnsure();
        if (!field) continue;
        const reach = cs.reach ? rand(cs.reach[0], cs.reach[1]) : undefined;
        field.addSource(def, a.pos.x, a.pos.y,
          { boundTo: a, bornFrac: cs.bornFrac ?? 0.12, tier: a.tier, ...(reach !== undefined ? { reach } : {}) });
        if (cs.cadence) a.creepPumpAt = nativeHost.time + rand(...(cs.cadence.opening ?? cs.cadence.every));
        continue;
      }
      // The pump lane — reached only with an armed stamp that has come due.
      if (nativeHost.time < a.creepPumpAt!) continue;
      const cad = cs.cadence;
      if (!cad) { a.creepPumpAt = undefined; continue; } // def edited underfoot: stand down
      const pumpDef = CREEPS[cad.kind ?? cs.kind];
      if (!pumpDef?.front) {
        console.warn(`[creep] '${a.defId}' pump names '${cad.kind ?? cs.kind}' — no front levers`);
        a.creepPumpAt = undefined;
        continue;
      }
      const field = nativeHost.creepEnsure();
      if (!field) { a.creepPumpAt = undefined; continue; }
      const reach = cad.reach ? rand(cad.reach[0], cad.reach[1]) : undefined;
      // A cap-refused addFront (null) is transient: keep the clock beating.
      field.addFront(pumpDef, a.pos.x, a.pos.y, nativeHost.creepPumpBearing(a, cad.bearing ?? 'random'), {
        boundTo: a,
        ...(reach !== undefined ? { reach } : {}),
        ...(cad.bornFrac !== undefined ? { bornFrac: cad.bornFrac } : {}),
      });
      a.creepPumpAt = nativeHost.time + rand(cad.every[0], cad.every[1]);
    }
  }

export function sceneUpdateEnemyTethers(nativeHost:NativeSceneFrameHost, dt: number): void {
    nativeHost.enemyTetherScan -= dt;
    if (nativeHost.enemyTetherScan > 0) return;
    nativeHost.enemyTetherScan = 0.5;
    for (const a of nativeHost.actors) {
      if (a.dead || a.team !== 'enemy' || !a.defId) continue;
      const td = MONSTERS[a.defId]?.tether;
      if (!td) continue;
      const period = td.period ?? 6, duty = td.duty ?? 3;
      const phase = nativeHost.time % period;
      if (phase >= duty) continue; // the cycle is OFF — bands lapse, kin unlink
      if (nativeHost.tethers.some(t => t.a === a || t.b === a)) continue; // one band each
      let best: Actor | null = null, bd = td.radius ?? 320;
      for (const b of nativeHost.actors) {
        if (b === a || b.dead || b.defId !== a.defId || !sameStory(a, b)) continue; // (a band is strung on one story)
        if (nativeHost.tethers.some(t => t.a === b || t.b === b)) continue;
        const d = dist(a.pos, b.pos);
        if (d < bd) { bd = d; best = b; }
      }
      if (!best) continue;
      const type: DamageType = td.damageType ?? 'lightning';
      const tags = new Set<SkillTag>([type]);
      const amounts: Partial<Record<DamageType, number>> = {
        [type]: td.dps * a.sheet.get('damage', tags),
      };
      applyConversion(a, amounts, tags);
      {
let nativeStorage:typeof nativeHost.tethers;
let nativeRecord:typeof nativeHost.tethers[number];
let nativeRecordSource:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[3];
(nativeStorage = nativeHost.tethers).push(nativeRecord = {
        a, b: best, owner: (nativeRecordSource = a), skillId: '__pack:' + a.defId, link: 'pack',
        amounts, heal: 0, affects: 'enemies',
        width: td.width ?? 10,
        remaining: duty - phase,
        tickTimer: TETHER_TICK,
        color: td.color ?? DAMAGE_COLOR[type],
        ax: a.pos.x, ay: a.pos.y, bx: best.pos.x, by: best.pos.y,
      });
nativeHost.issueCombatRecord("tethers", nativeStorage, nativeRecord, nativeRecordSource, undefined);
}
    }
  }

export function sceneUpdateTethers(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (let i = nativeHost.tethers.length - 1; i >= 0; i--) {
      const t = nativeHost.tethers[i];
const nativeRecordScope=nativeHost.beginCombatRecord("tethers", t);
try {
      t.visualAge = (t.visualAge ?? 0) + dt;
      t.remaining -= dt;
      if (t.a.dead || t.b.dead || t.remaining <= 0) { nativeHost.tethers.splice(i, 1); continue; }
      t.ax = t.a.pos.x; t.ay = t.a.pos.y; t.bx = t.b.pos.x; t.by = t.b.pos.y;
      t.tickTimer -= dt;
      const damageTick = t.tickTimer <= 0;
      if (damageTick) t.tickTimer += TETHER_TICK;
      const hasDamage = t.affects !== 'allies' && Object.keys(t.amounts).length > 0;
      const hasHeal = t.heal > 0 && t.affects !== 'enemies';
      if (!hasDamage && !hasHeal) continue;
      for (const e of nativeHost.actors) {
        if (e.dead) continue;
        if (!sameStory(e, t.owner)) continue; // the band lies on its owner's story (the sovereignty gate)
        // SEGMENT FABRIC: the band bites whichever hittable body crosses it
        // (plain monsters: the classic point-segment test, byte-identical).
        // THE BAND LAW rides INSIDE the predicate, so the wall test runs at
        // each candidate body's own point — geometry first, so a ray only
        // ever fires for a body actually standing in the band.
        const touch = bodyWhere(e, (bp, br, seg) =>
          pointSegDist(bp.x, bp.y, t.ax, t.ay, t.bx, t.by) <= t.width + br
          && nativeHost.tetherSees(t, e, bp, seg));
        if (!touch) continue;
        if (hasDamage && damageTick && nativeHost.isBurstTarget(e, t.owner.team, t.owner.tier)) {
          const tick: Partial<Record<DamageType, number>> = {};
          for (const [k, v] of Object.entries(t.amounts)) tick[k as DamageType] = (v ?? 0) * TETHER_TICK;
          const taken = mitigateTyped(e, tick);
          if (taken > 0) {
            e.life -= taken;
            e.hitFlash = 0.1;
            e.hitFlashType = dominantTypeOf(tick);
            stampSegFlash(e, touch.seg);
            nativeHost.accumulateDotText(e, taken, TETHER_TICK, t.owner); // THE WIRE'S EYES: the band's owner
            if (e.life <= 0 && !e.dead) nativeHost.kill(e, false, t.owner);
          }
        }
        if (hasHeal && e.team === t.owner.team && !e.untargetable) {
          e.healBy(t.heal * dt);
        }
      }
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdateVents(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const a of nativeHost.actors) {
      if (!a.venting.size || a.dead) continue;
      a.ventTick -= dt;
      if (a.ventTick > 0) continue;
      a.ventTick += TETHER_TICK;
      for (const id of [...a.venting]) {
        const inst = a.skills.find(s => s?.def.pool?.id === id);
        const pl = inst?.def.pool;
        if (!pl || pl.release.mode !== 'vent') { a.venting.delete(id); continue; }
        const { rate, radius } = poolVentRead(a, inst!)!;
        const banked = a.pools.get(id) ?? 0;
        const drain = Math.min(banked, rate * TETHER_TICK);
        if (drain <= 0) { a.venting.delete(id); continue; }
        a.pools.set(id, banked - drain);
        for (const e of nativeHost.actors) {
          if (!nativeHost.isBurstTarget(e, a.team, a.tier)) continue;
          if (dist(a.pos, e.pos) - e.radius > radius) continue;
          const taken = mitigateTyped(e, { [pl.damageType]: drain });
          if (taken > 0) {
            e.life -= taken;
            nativeHost.accumulateDotText(e, taken, TETHER_TICK, a); // THE WIRE'S EYES: the venting body
            if (e.life <= 0 && !e.dead) nativeHost.kill(e, false, a);
          }
        }
        // Sustained poolCues remain visible between ticks and cease at zero.
      }
    }
  }

export function sceneUpdateDischarges(nativeHost:NativeSceneFrameHost): void {
    for (const a of nativeHost.actors) {
      if (a.dead) continue;
      for (const inst of a.skills) {
        const ds = inst?.def.discharge;
        if (!ds) continue;
        if ((a.charges.get(ds.charge) ?? 0) < 1) continue;
        if (nativeHost.time < (a.dischargeAt.get(inst!.def.id) ?? 0)) continue;
        const tags = skillContextTags(inst!.def);
        const extra = instanceMods(inst!);
        // Nearest HOSTILE in reach — faction-stance targeting like melee
        // and cone hits, so the storm never zaps neutral townsfolk. The
        // bolt needs a firing line (occlusion): walls hold the charge in.
        const zapPhase = (ds.occlusion ?? 'blocked') === 'free'
          || a.sheet.get('phasing', tags, extra) > 0;
        let best: Actor | null = null;
        let bd = ds.range * a.sheet.get('aoeRadius', tags, extra);
        for (const e of nativeHost.enemiesOf(a)) {
          if (!sameStory(a, e)) continue; // a discharge is a touch (the sovereignty gate)
          if (e.invulnerable) continue;
          const dd = dist(a.pos, e.pos) - e.radius;
          if (dd >= bd) continue;
          if (!zapPhase && !nativeHost.lineOfFire(a.pos, e.pos, a.tier)) continue;
          bd = dd; best = e;
        }
        if (!best) continue;
        // A fuller bank beats FASTER (intervalPerCharge — Tempest
        // Gathering): the count is read AFTER this bolt's charge is spent.
        const held = (a.charges.get(ds.charge) ?? 1) - 1;
        const beat = Math.max(0.15,
          ds.interval - (ds.intervalPerCharge ?? 0) * held);
        a.dischargeAt.set(inst!.def.id, nativeHost.time + beat);
        a.spendCharge(ds.charge, 1);
        nativeHost.resolveHit(a, inst!, best, ds.damageScale ?? 0.6);
        // The zap visual: a zero-damage, moment-long tether IS the beam
        // (tickTimer > remaining, so it never deals a tick of its own).
        {
let nativeStorage:typeof nativeHost.tethers;
let nativeRecord:typeof nativeHost.tethers[number];
let nativeRecordSource:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[3];
(nativeStorage = nativeHost.tethers).push(nativeRecord = {
          a, b: best, owner: (nativeRecordSource = a), skillId: '__discharge:' + inst!.def.id, link: 'zap',
          visual: inst!.def.id, visualAge: 0,
          amounts: {}, heal: 0, affects: 'enemies', width: 5,
          remaining: 0.14, tickTimer: 9, color: inst!.def.color,
          ax: a.pos.x, ay: a.pos.y, bx: best.pos.x, by: best.pos.y,
        });
nativeHost.issueCombatRecord("tethers", nativeStorage, nativeRecord, nativeRecordSource, undefined);
}
      }
    }
  }

export function sceneUpdateConstructs(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const c of nativeHost.actors) {
      if (c.dead || !c.construct) continue;
      const st = c.construct;
      // FOLLOWER constructs (Holy Relic): glide to the owner's shoulder —
      // a relic that keeps up, not furniture left at the last fight.
      if (st.follows && c.owner && !c.owner.dead) {
        const slot = c.owner.facing + Math.PI * 0.78;
        const want = vec(
          c.owner.pos.x + Math.cos(slot) * 36,
          c.owner.pos.y + Math.sin(slot) * 36);
        const dd = dist(c.pos, want);
        if (dd > 5) {
          const step = Math.min(dd, Math.max(140, dd * 3.2) * dt);
          const ang = angleTo(c.pos, want);
          c.pos.x += Math.cos(ang) * step;
          c.pos.y += Math.sin(ang) * step;
        }
      }
      // CONSTRUCT FX pulse (innate or grafted): the standing object COOKS
      // its surroundings on a beat — the host skill's roll at a scale,
      // effects and all (a chilling wall chills; a burning one ignites).
      const pulse = st.fx?.pulse;
      if (pulse && c.summonInst) {
        st.fxAt ??= nativeHost.time + pulse.interval;
        if (nativeHost.time >= st.fxAt) {
          st.fxAt = nativeHost.time + pulse.interval;
          const radius = pulse.radius * (c.owner ?? c).sheet.get('aoeRadius',
            skillContextTags(c.summonInst.def), instanceMods(c.summonInst));
          let struck = false;
          for (const e of nativeHost.enemiesOf(c)) {
            if (dist(c.pos, e.pos) - e.radius > radius) continue;
            nativeHost.resolveHit(c, c.summonInst, e, pulse.damageScale ?? 0.4, 1);
            struck = true;
          }
          if (struck) {
            nativeHost.flashes.push({ pos: vec(c.pos.x, c.pos.y), radius, color: c.color, life: 0.18, maxLife: 0.18 });
            nativeHost.presenceMoment(c, 'pulse');
          }
        }
      }
      switch (st.kind) {
        case 'totem': {
          if (!st.castInst || !c.canUse(st.castInst)) break;
          // MENDING totems (Font of Renewal): an ally-targeted payload
          // seeks the most WOUNDED friend in range instead of prey — and
          // holds its beat while the grove is whole.
          if (st.castInst.def.targeting?.target === 'ally') {
            let sick: Actor | null = null; let worst = 0.92;
            for (const a of nativeHost.actors) {
              if (a.dead || a.construct || a.untargetable || a.team !== c.team || !sameStory(a, c)) continue; // (the sovereignty gate)
              if (dist(c.pos, a.pos) > st.range) continue;
              const frac = a.life / Math.max(1, a.maxLife());
              if (frac < worst) { worst = frac; sick = a; }
            }
            if (sick) nativeHost.useSkill(c, st.castInst, sick.pos);
            break;
          }
          let best: Actor | null = null, bestD = st.range;
          for (const e of nativeHost.enemiesOf(c)) {
            const d = dist(c.pos, e.pos);
            if (d < bestD) { bestD = d; best = e; }
          }
          if (best) nativeHost.useSkill(c, st.castInst, best.pos);
          break;
        }
        case 'sentry': {
          if (!st.castInst || !c.canUse(st.castInst)) break;
          // No rotation axis: fires only along its spawn facing.
          const inLane = nativeHost.enemiesOf(c).some(e =>
            dist(c.pos, e.pos) <= st.range
            && Math.abs(angleDiff(c.facing, angleTo(c.pos, e.pos))) < 0.3);
          if (inLane) {
            const aim = vec(c.pos.x + Math.cos(c.facing) * st.range,
              c.pos.y + Math.sin(c.facing) * st.range);
            nativeHost.useSkill(c, st.castInst, aim);
          }
          break;
        }
        case 'trap': {
          if (st.timer > 0) { st.timer -= dt; break; } // arming
          const prey = nativeHost.enemiesOf(c).find(e =>
            dist(c.pos, e.pos) - e.radius <= st.range);
          if (prey && st.castInst) {
            c.useLock = 0; c.mana = c.maxMana();
            // EXECUTE, never cast: a payload with a cast bar would die with
            // the trap the same frame and never land (the eaten-blast bug).
            nativeHost.executeSkill(c, st.castInst, prey.pos, { keepFacing: true });
            nativeHost.kill(c, true); // single use
          }
          break;
        }
        case 'mine':
        case 'decoy':
        case 'barrier':
        case 'dome':
        case 'relic': // event-driven: answers its owner's uses (executeSkill)
          break; // mines wait for Detonate; the rest just stand there

        case 'embed': {
          // The LODGED object (EmbedSpec): run-over triggers, self-
          // emissions, sibling beams — each behavior on its own clock.
          const spec = st.embed;
          const owner = c.owner;
          if (!spec || !owner || owner.dead) break;
          // RUN-OVER: the owner stepping on it collects or detonates it —
          // consumed, or re-armed on its per-object internal cooldown.
          if (spec.runOver && nativeHost.time >= (st.embedReadyAt ?? 0)
            && dist(owner.pos, c.pos) <= owner.radius + c.radius + 8) {
            if (spec.runOver === 'collect' && spec.collect) {
              const col = spec.collect;
              if (col.charge) owner.gainCharge(col.charge, col.amount, col.max ?? 10, c.summonInst);
              // A real instant gain and nothing else events it — untagged,
              // because a run-over collect is a PICKUP, not a cast.
              if (col.resource) nativeHost.applyRestore(owner, { resource: col.resource, amount: col.amount });
              nativeHost.text(owner.pos, 'collected', c.color, 11);
            } else if (spec.runOver === 'detonate' && spec.detonateSkillId && SKILLS[spec.detonateSkillId]) {
              const payload = makeSkillInstance(SKILLS[spec.detonateSkillId],
                c.summonInst ? effectiveSkillLevel(c.summonInst) : c.level);
              c.useLock = 0; c.mana = c.maxMana();
              nativeHost.executeSkill(c, payload, vec(c.pos.x, c.pos.y), { keepFacing: true });
            }
            if (spec.icd && spec.icd > 0) {
              st.embedReadyAt = nativeHost.time + spec.icd;
            } else {
              nativeHost.kill(c, true);
              break;
            }
          }
          // EMISSION: the lodged thing casts at its own spot on a beat.
          if (spec.emitInterval && spec.detonateSkillId && SKILLS[spec.detonateSkillId]) {
            st.emitAt ??= nativeHost.time + spec.emitInterval;
            if (nativeHost.time >= st.emitAt) {
              st.emitAt = nativeHost.time + spec.emitInterval;
              const payload = makeSkillInstance(SKILLS[spec.detonateSkillId],
                c.summonInst ? effectiveSkillLevel(c.summonInst) : c.level);
              c.useLock = 0; c.mana = c.maxMana();
              nativeHost.executeSkill(c, payload, vec(c.pos.x, c.pos.y), { keepFacing: true });
            }
          }
          // SIBLING BEAM (Arclight Rain): arc to the nearest lodged kin and
          // hurt the LINE between — a tripwire pulse strung by the volley.
          if (spec.beam && c.summonInst) {
            st.beamAt ??= nativeHost.time + spec.beam.interval;
            if (nativeHost.time >= st.beamAt) {
              st.beamAt = nativeHost.time + spec.beam.interval;
              let kin: Actor | null = null, bd = spec.beam.range ?? 320;
              for (const o of nativeHost.actors) {
                if (o === c || o.dead || o.owner !== owner) continue;
                if (o.construct?.kind !== 'embed' || o.sourceSkillId !== c.sourceSkillId) continue;
                const dd = dist(c.pos, o.pos);
                if (dd < bd) { bd = dd; kin = o; }
              }
              if (kin) {
                const width = spec.beam.width ?? 10;
                for (const e of nativeHost.enemiesOf(c)) {
                  if (pointSegDist(e.pos.x, e.pos.y, c.pos.x, c.pos.y,
                    kin.pos.x, kin.pos.y) > width + e.radius) continue;
                  nativeHost.resolveHit(c, c.summonInst, e, spec.beam.damageScale ?? 0.5, 1);
                }
                // The beam IS a moment-long tether (the discharge visual).
                {
let nativeStorage:typeof nativeHost.tethers;
let nativeRecord:typeof nativeHost.tethers[number];
let nativeRecordSource:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[3];
(nativeStorage = nativeHost.tethers).push(nativeRecord = {
                  a: c, b: kin, owner: (nativeRecordSource = c), skillId: '__embedbeam:' + c.id, link: 'zap',
                  visual: 'embed', visualAge: 0,
                  amounts: {}, heal: 0, affects: 'enemies', width,
                  remaining: 0.15, tickTimer: 9, color: c.color,
                  ax: c.pos.x, ay: c.pos.y, bx: kin.pos.x, by: kin.pos.y,
                });
nativeHost.issueCombatRecord("tethers", nativeStorage, nativeRecord, nativeRecordSource, undefined);
}
              }
            }
          }
          break;
        }

        case 'echo': {
          const spec = st.echo;
          const owner = c.owner;
          if (!spec) break;
          // Echoes are OF someone: the ghost dies with (or without) its flesh.
          if (!owner || owner.dead) { nativeHost.kill(c, true); break; }

          if (spec.mode === 'mimic') break; // event-driven (echoToClones)

          if (spec.mode === 'strike') {
            // The ancestral ghost: glide at the locked prey; swing on
            // arrival; fade. Lifespan expiring mid-glide IS the whiff.
            const prey = st.echoPrey !== undefined ? nativeHost.actorById(st.echoPrey) : undefined;
            if (!prey || prey.dead) { nativeHost.kill(c, true); break; }
            const ang = angleTo(c.pos, prey.pos);
            c.facing = ang;
            const reach = c.radius + prey.radius + 10;
            const dd = dist(c.pos, prey.pos);
            if (dd > reach) {
              // Straight through walls and bodies: it is a ghost.
              const step = Math.min((spec.glideSpeed ?? 300) * dt, dd - reach + 1);
              c.pos.x += Math.cos(ang) * step;
              c.pos.y += Math.sin(ang) * step;
              break;
            }
            if (c.casting) break; // mid-swing: the bar is running
            if (!st.castInst) { nativeHost.kill(c, true); break; }
            // Spent: the stay (set at swing time) lets the bar, a charge-up's
            // full wind, and any played figure's scheduled steps FINISH — the
            // lifespan sweep does the killing, never this branch.
            if ((st.echoCasts ?? 0) <= 0) break;
            c.useLock = 0; c.mana = c.maxMana();
            nativeHost.useSkill(c, st.castInst, vec(prey.pos.x, prey.pos.y));
            st.echoCasts = (st.echoCasts ?? 1) - 1;
            // A started swing always completes — the glide was the only
            // contest. The stay covers the whole delivery: the bar OR a
            // charge-up's wind, plus a played figure's step train. The 2s
            // cap governs the GLIDE, not a swing already underway.
            const seq = instanceAim(st.castInst)?.sequence;
            const stay = Math.max(c.skillUseTime(st.castInst),
              st.castInst.def.chargeUp?.maxTime ?? 0)
              + (seq ? seq.steps.length * seq.pause + 0.2 : 0) + 0.35;
            c.lifespan = st.echoCasts > 0
              ? Math.max(c.lifespan, stay + 0.4)
              : stay;
            break;
          }

          // HOVER (the Mirage Archer): trail the owner's shoulder slot —
          // snap when far behind; ghosts pass through walls, never get lost.
          const slot = nativeHost.hoverSlotPos(owner, st.echoSlot ?? 0, spec);
          if (dist(c.pos, slot) > 320) {
            c.pos.x = slot.x; c.pos.y = slot.y;
          } else {
            const k = Math.min(1, dt * 8);
            c.pos.x += (slot.x - c.pos.x) * k;
            c.pos.y += (slot.y - c.pos.y) * k;
          }
          if (!c.casting) c.facing = owner.facing;
          // While the owner is NOWHERE there is nothing to echo — a shroud
          // with a free turret in it would gut the stealth economy. A
          // DOWNED owner (co-op) has no acts to echo either.
          if (isStealthed(owner) || owner.downed) break;
          // The beat runs THROUGH the rider's own cast bar (cadence =
          // max(interval, bar)), it just can't re-cast mid-swing.
          st.timer -= dt;
          if (c.casting || st.timer > 0) break;
          if (!st.castInst || !c.canUse(st.castInst)) { st.timer = 0.2; break; }
          let best: Actor | null = null, bestD = st.range;
          for (const e of nativeHost.enemiesOf(c)) {
            if (e.passive) continue; // nobody's echo snipes barrels
            const d2 = dist(c.pos, e.pos);
            if (d2 < bestD) { bestD = d2; best = e; }
          }
          if (!best) { st.timer = 0.2; break; }
          // The rider's own FIXED clock (÷ constructCastRate at spawn,
          // floored): echo cadence never scales with your attack speed —
          // the echo SHRINKS as your own throughput grows.
          st.timer = Math.max(0.6, st.castInterval ?? 0.9);
          c.mana = c.maxMana();
          nativeHost.useSkill(c, st.castInst, vec(best.pos.x, best.pos.y));
          break;
        }

        case 'pad': {
          // Stepping on the pad propels the owner along the pad's facing.
          if (st.timer > 0) { st.timer -= dt; break; }
          const owner = c.owner;
          const d2 = c.summonInst?.def.delivery;
          const propel = d2?.type === 'construct' ? d2.propel : undefined;
          if (!owner || owner.dead || !propel) break;
          if (dist(c.pos, owner.pos) <= c.radius + owner.radius + 4 && !owner.dash && !owner.caromRun) {
            owner.dash = { dir: c.facing, speed: propel.speed, remaining: propel.distance / propel.speed };
            (owner as Actor & { dashSkill?: SkillInstance }).dashSkill = undefined;
            (owner as Actor & { dashHits?: Set<number> }).dashHits = undefined;
            st.timer = 0.8;
            if (!nativeHost.presenceMoment(c, 'pulse')) nativeHost.flashes.push({ pos: vec(c.pos.x, c.pos.y), radius: 26, color: c.color, life: 0.25, maxLife: 0.25 });
          }
          break;
        }

        case 'gate': {
          if (st.timer > 0) { st.timer -= dt; break; }
          // Unlink from dead partners.
          if (c.gateLink !== undefined) {
            const partner = nativeHost.actors.find(a => a.id === c.gateLink && !a.dead);
            if (!partner) { c.gateLink = undefined; break; }
            const owner = c.owner;
            if (owner && !owner.dead
              && dist(c.pos, owner.pos) <= c.radius + owner.radius + 4) {
              nativeHost.teleportActor(owner, vec(partner.pos.x + 30, partner.pos.y), c.color);
              nativeHost.presenceMoment(c, 'pulse'); nativeHost.presenceMoment(partner, 'pulse');
              // Anti-ping-pong: both ends close briefly.
              st.timer = 1.2;
              if (partner.construct) partner.construct.timer = 1.2;
            }
          }
          break;
        }
        case 'eruptor': {
          if (!st.castInst) break;
          // HOLD-ONCE channelers (Ritual Ground): the vessel holds ONE
          // complete channel — start it, release it just before the
          // persist window closes, and be SPENT when it ends. No re-cast,
          // no reconsume loop, no cooldown laundering.
          if (st.holdOnce) {
            if (c.casting && c.lifespan > 0 && c.lifespan < 0.25) {
              c.casting.held = false; // the vessel exhales before it crumbles
            }
            if (st.started && !c.casting) { nativeHost.kill(c, true); break; }
            if (!st.started) {
              st.started = true;
              c.useLock = 0; c.mana = c.maxMana();
              nativeHost.useSkill(c, st.castInst, vec(
                c.pos.x + Math.cos(c.facing) * 40, c.pos.y + Math.sin(c.facing) * 40));
            }
            break;
          }
          // Volcano: spit the payload at RANDOM points around itself.
          st.timer -= dt;
          if (st.timer <= 0) {
            st.timer = st.castInterval ?? 0.8;
            c.useLock = 0; c.mana = c.maxMana(); c.cooldowns.clear();
            const ang = rand(0, Math.PI * 2);
            const r = rand(st.range * 0.25, st.range);
            nativeHost.useSkill(c, st.castInst, vec(
              c.pos.x + Math.cos(ang) * r, c.pos.y + Math.sin(ang) * r));
          }
          break;
        }
        case 'pylon': {
          if (!st.castInst) break;
          st.timer -= dt;
          if (st.timer <= 0 && c.canUse(st.castInst)) {
            const targets = nativeHost.enemiesOf(c).filter(e => dist(c.pos, e.pos) <= st.range);
            if (targets.length) {
              const challengeDelivery = c.summonInst && instanceDelivery(c.summonInst);
              st.timer = challengeDelivery?.type === 'construct' ? (challengeDelivery.interval ?? 1.5) : 1.5;
              nativeHost.useSkill(c, st.castInst, pick(targets).pos);
            }
          }
          break;
        }
      }
    }
  }

export function sceneUpdateAuras(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const bearer of nativeHost.actors) {
      if (bearer.activeAuras.size === 0) continue;
      if (bearer.dead) continue;
      for (const [skillId, aura] of [...bearer.activeAuras]) {
        const def = aura.inst.def;
        const extra = instanceMods(aura.inst);
        const d = def.delivery.type === 'aura' ? def.delivery : null;

        // Duration & upkeep
        if (aura.remaining !== Infinity) {
          aura.remaining -= dt;
          if (aura.remaining <= 0) { nativeHost.deactivateAura(bearer, skillId); continue; }
        }
        const held = nativeHost.time - (aura.since ?? nativeHost.time);
        // A Form with a FUSE (Mortis Seal): the toggle drops itself — the
        // deactivation payload still tolls.
        if (d?.mode === 'toggle' && d.maxDuration !== undefined
          && held >= d.maxDuration
            * bearer.sheet.get('effectDuration', skillContextTags(def), extra)) {
          nativeHost.deactivateAura(bearer, skillId);
          continue;
        }
        let drained = 0; // life drained this frame (fuels drainLifeFraction dps)
        if (d?.mode === 'toggle' && d.upkeep) {
          // The RAMP: the seal's price mounts the longer it holds.
          const rampMul = 1 + (d.upkeep.rampPerSec ?? 0) * held;
          // Flat + pool-scaled drains stack (flat, % of max, % of current)
          // — the one mana-degeneration primitive every Form variant taps.
          const manaDrain = (d.upkeep.manaPerSec ?? 0)
            + (d.upkeep.manaPctMaxPerSec ? bearer.maxMana() * d.upkeep.manaPctMaxPerSec : 0)
            + (d.upkeep.manaPctCurPerSec ? bearer.mana * d.upkeep.manaPctCurPerSec : 0);
          if (manaDrain > 0) {
            bearer.mana -= manaDrain * rampMul * dt;
            if (bearer.mana <= 0) { bearer.mana = 0; nativeHost.deactivateAura(bearer, skillId); continue; }
          }
          if (d.upkeep.lifeFractionPerSec) {
            drained = bearer.maxLife() * d.upkeep.lifeFractionPerSec * rampMul * dt;
            if (bearer.life - drained <= 1) { nativeHost.deactivateAura(bearer, skillId); continue; }
            bearer.life -= drained;
          }
          // CHARGE-FED upkeep: fractional owing, paid in whole charges as
          // they come due. An unpayable due charge snuffs the toggle —
          // but a scoop BETWEEN payments refuels it seamlessly.
          if (d.upkeep.charges) {
            const uc = d.upkeep.charges;
            aura.chargeAcc = (aura.chargeAcc ?? 0) + uc.perSec * rampMul * dt;
            if (aura.chargeAcc >= 1) {
              const owed = Math.floor(aura.chargeAcc);
              aura.chargeAcc -= owed;
              const bank = bearer.charges.get(uc.charge) ?? 0;
              if (bank < owed) {
                if (bank > 0) bearer.spendCharge(uc.charge, bank);
                nativeHost.deactivateAura(bearer, skillId);
                continue;
              }
              bearer.spendCharge(uc.charge, owed);
            }
          }
        }
        // LIFE SEAL bookkeeping: damage reduction scales with the MISSING
        // fraction (deeper wound, harder shell) and the seal staggers a
        // share of incoming hits — a dynamic source, re-synced only when
        // the rounded value moves (setSource clears the stat cache).
        if (d?.seal) {
          const missing = 1 - bearer.life / Math.max(1, bearer.maxLife());
          const dr = Math.min(d.seal.drCap ?? 0.6,
            (d.seal.drPerMissing ?? 0) * missing);
          const val = Math.round(dr * 100) / 100;
          if (aura.sealVal !== val) {
            aura.sealVal = val;
            const mods: Modifier[] = [];
            if (val > 0) mods.push(mod('damageTaken', 'more', -val));
            if (d.seal.stagger) mods.push(mod('staggerFrac', 'flat', d.seal.stagger));
            bearer.sheet.setSource('seal:' + skillId, mods);
          }
        }

        const sourceName = 'aura:' + skillId + ':' + bearer.id;
        const inside = new Set<number>();

        // Allies (bearer included) — shape-aware, so sigils transform auras.
        const allyMods = aura.allyMods ?? aura.spec.allyMods;
        if (allyMods) {
          for (const a of nativeHost.actors) {
            if (a.dead || a.team !== bearer.team || !sameStory(a, bearer)) continue; // (the sovereignty gate)
            if (!inAoe(bearer.pos, aura.radius, aura.shape, bearer.facing, a.pos, a.radius)) continue;
            inside.add(a.id);
            if (!aura.affected.has(a.id)) a.sheet.setSource(sourceName, allyMods);
          }
        }
        // Enemies: mods + dps + siphon
        const dps = aura.spec.enemyDps;
        let dpsBase = 0;
        const auraAmounts: Partial<Record<DamageType, number>> = {};
        if (dps) {
          dpsBase = dps.drainLifeFraction
            ? bearer.maxLife() * dps.drainLifeFraction
            : (dps.amount ?? 0);
          dpsBase *= bearer.sheet.get('damage', skillContextTags(def, [dps.type]), extra);
          // Aura dps honours the conversion schema like any typed source —
          // a Flameforged bearer's fire ring gnaws as whatever it converts to.
          if (dpsBase > 0) {
            auraAmounts[dps.type] = dpsBase;
            applyConversion(bearer, auraAmounts, skillContextTags(def, [dps.type]), extra);
          }
        }
        for (const e of nativeHost.enemiesOf(bearer)) {
          if (!inAoe(bearer.pos, aura.radius, aura.shape, bearer.facing, e.pos, e.radius)) continue;
          if (aura.spec.enemyMods) {
            inside.add(e.id);
            if (!aura.affected.has(e.id)) e.sheet.setSource(sourceName, aura.spec.enemyMods);
          }
          if (dps && dpsBase > 0) {
            let amount = 0;
            for (const [k, v] of Object.entries(auraAmounts)) {
              let part = (v ?? 0) * dt * e.sheet.get('damageTaken');
              part *= 1 - resistValue(e, k as DamageType);
              amount += part;
            }
            if (e.invulnerable) amount = 0;
            if (amount > 0) {
              e.life -= amount;
              nativeHost.accumulateDotText(e, amount, dt, bearer); // THE WIRE'S EYES: the aura's bearer
              if (aura.spec.siphonFraction) {
                noteResourceFlow(bearer, e, 'life', bearer.healBy(amount * aura.spec.siphonFraction), aura.inst.def.feedingCue);
              }
              // Aura deaths retain their bearer, including summoned halo carriers.
              if (e.life <= 0 && !e.dead) nativeHost.kill(e, false, bearer);
            }
          }
        }
        // Strip modifiers from actors that left the radius (or died).
        for (const a of nativeHost.actors) {
          if (aura.affected.has(a.id) && !inside.has(a.id)) a.sheet.removeSource(sourceName);
        }
        aura.affected = inside;

        // Pulses
        if (aura.spec.pulse) {
          aura.pulseTimer -= dt;
          if (aura.pulseTimer <= 0) {
            aura.pulseTimer = aura.spec.pulse.interval;
            nativeHost.presenceMoment(bearer, 'pulse');
            const heal = aura.spec.pulse.healAllies;
            if (heal) {
              for (const a of nativeHost.actors) {
                if (a.dead || a.team !== bearer.team || !sameStory(a, bearer)) continue; // (the sovereignty gate)
                if (!inAoe(bearer.pos, aura.radius, aura.shape, bearer.facing, a.pos, a.radius)) continue;
                const base = heal.base === 'maxLife' ? a.maxLife()
                  : heal.base === 'maxMana' ? a.maxMana()
                  : a.sheet.get('lifeRegen');
                const landed = a.healBy(base * heal.amount);
                if (landed > 0) {
                  nativeHost.seatText(bearer, a.pos, '+' + Math.round(landed), '#6fc06f', 12); // THE WIRE'S EYES: the healer's seat
                }
              }
            }
          }
        }
      }
    }
  }

export function sceneUpdateStrobes(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const a of nativeHost.actors) {
      // Drawn hexes (curseOnHit) die with their bearer — reserve refunded.
      if (a.hexToggles.size && a.dead) {
        for (const [id, hx] of a.hexToggles) {
          a.reservedMana = Math.max(0, a.reservedMana - hx.reserved);
          a.hexToggles.delete(id);
        }
      }
      if (!a.strobes.size) continue;
      for (const [id, st] of a.strobes) {
        const d = st.inst.def.delivery;
        if (a.dead || d.type !== 'ground' || !d.strobe) {
          a.reservedMana = Math.max(0, a.reservedMana - st.reserved);
          a.strobes.delete(id);
          continue;
        }
        st.timer -= dt;
        if (st.timer > 0) continue;
        st.timer += d.strobe.interval;
        const bearing = (d.strobe.bearing ?? 'random') === 'facing'
          ? a.facing : rand(0, Math.PI * 2);
        const reach = Math.max(24, d.castRange);
        const aim = vec(a.pos.x + Math.cos(bearing) * reach,
          a.pos.y + Math.sin(bearing) * reach);
        nativeHost.executeSkill(a, st.inst, aim,
          { noCooldown: true, noRepeat: true, keepFacing: true });
      }
    }
  }

export function sceneUpdateDetonations(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (let i = nativeHost.pendingDetonations.length - 1; i >= 0; i--) {
      const pd = nativeHost.pendingDetonations[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingDetonations", pd);
try {
      if (pd.visual) {
        pd.visual.pos = { ...pd.mine.pos }; pd.visual.recoveryCueTier = pd.mine.tier;
        if (pd.mine.dead || !pd.mine.construct?.castInst) pd.visual.life = 0;
      }
      pd.timer -= dt;
      if (pd.timer > 0) continue;
      nativeHost.pendingDetonations.splice(i, 1);
      if (pd.visual) pd.visual.life = 0;
      const mine = pd.mine;
      if (mine.dead || !mine.construct?.castInst) continue;
      mine.useLock = 0; mine.mana = mine.maxMana(); mine.cooldowns.clear();
      // EXECUTE, never cast: a payload with a cast bar would die with the
      // mine the same frame and never land (the eaten-blast bug).
      nativeHost.executeSkill(mine, mine.construct.castInst, mine.pos, { keepFacing: true });
      nativeHost.kill(mine, true);
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdatePendingRespawns(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (let i = nativeHost.pendingRespawns.length - 1; i >= 0; i--) {
      const pr = nativeHost.pendingRespawns[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingRespawns", pr);
try {
      if (pr.caster.dead) { nativeHost.pendingRespawns.splice(i, 1); continue; }
      pr.timer -= dt;
      if (pr.timer <= 0) {
        const d = instanceDelivery(pr.inst);
        if (d.type === 'summon' && d.persistent?.toggle && !pr.caster.summonToggles.has(pr.inst.def.id)) {
          nativeHost.pendingRespawns.splice(i, 1);
          continue;
        }
        const minion = nativeHost.spawnMinion(pr.caster, pr.inst, { noReplace: true });
        if (minion) {
          nativeHost.pendingRespawns.splice(i, 1);
          nativeHost.showRecoveryCue(minion, 'arrive', pr.inst);
        } else {
          // A bad moment ('cannot sustain', a full shared pool) must not
          // EAT the contract — retry shortly instead of dropping it.
          pr.timer = 2;
        }
      }
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdateSummonContracts(nativeHost:NativeSceneFrameHost): void {
    for (const a of [...nativeHost.actors, ...nativeHost.frameSeats().flatMap(s => s.home ? [s.home] : [])]) {
const nativeSourceScope = nativeHost.beginCombatActor(a, true);
try {
      if (a.dead || !a.summonToggles.size) continue;
      for (const [id, t] of a.summonToggles) {
        const d = instanceDelivery(t.inst); // summon-tree cap also prices contracts
        if (d.type !== 'summon' || !d.persistent) continue;
        const tags = skillContextTags(t.inst.def);
        const extra = instanceMods(t.inst);
        let slots = summonContractSlots(a, t.inst, d);
        // The reservation TRACKS the live slot count — a mid-contract
        // passive node re-prices the bill (no free golems), a respec
        // refunds it. Growth is capped at what the pool can sustain.
        const unit = summonReservationUnit(a, t.inst, d);
        const headroom = a.maxMana() - (a.reservedMana - t.reserved);
        if (unit * slots > headroom) {
          slots = Math.max(0, Math.floor(headroom / Math.max(1, unit)));
        }
        t.slots = slots;
        const want = unit * slots;
        if (Math.abs(want - t.reserved) > 0.01) {
          a.reservedMana = Math.max(0, a.reservedMana - t.reserved + want);
          a.mana = Math.min(a.mana, a.availableMaxMana());
          t.reserved = want;
        }
        if (t.inst.def.hivecall) continue; // Hivecall owns one serial resurrection clock.
        const bodies = nativeHost.minionsOfSkill(a, id).filter(a => !a.summonOffspring);
        while (bodies.length > slots) nativeHost.kill(bodies.pop()!, true);
        const alive = bodies.length;
        // A lowered cap or reservation cannot leave an old respawn debt behind.
        let room = Math.max(0, slots - alive);
        nativeHost.pendingSummons = nativeHost.pendingSummons.filter(ps => {
const nativeRecordScope=nativeHost.beginCombatRecord("pendingSummons", ps);
try {
          if (ps.caster !== a || ps.inst !== t.inst) return true;
          ps.remaining = Math.min(ps.remaining, room);
          room -= ps.remaining;
          return ps.remaining > 0;
        
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
});
        nativeHost.pendingRespawns = nativeHost.pendingRespawns.filter(pr => {
const nativeRecordScope=nativeHost.beginCombatRecord("pendingRespawns", pr);
try {
          if (pr.caster !== a || pr.inst !== t.inst) return true;
          return room-- > 0;
        
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
});
        let queued = 0;
        for (const pr of nativeHost.pendingRespawns) {
const nativeRecordScope=nativeHost.beginCombatRecord("pendingRespawns", pr);
try {
          if (pr.caster === a && pr.inst.def.id === id) queued++;
        
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
        // Bodies of a sequenced ON-fill still emerging are ALREADY owed:
        // uncounted, this sweep would queue respawn twins for minions that
        // are simply still walking out, and their maturing would churn the
        // roster through spawnMinion's cap eviction.
        for (const ps of nativeHost.pendingSummons) {
const nativeRecordScope=nativeHost.beginCombatRecord("pendingSummons", ps);
try {
          if (ps.caster === a && ps.inst.def.id === id) queued += ps.remaining;
        
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
        for (let i = slots - alive - queued; i > 0; i--) {
          {
let nativeStorage:typeof nativeHost.pendingRespawns;
let nativeRecord:typeof nativeHost.pendingRespawns[number];
let nativeRecordSource:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[3];
let nativeRecordInstance:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingRespawns).push(nativeRecord = {
            caster: (nativeRecordSource = a), inst: (nativeRecordInstance = t.inst),
            timer: d.persistent.respawnTime
              * a.sheet.get('minionRespawnTime', tags, extra),
          });
nativeHost.issueCombatRecord("pendingRespawns", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        }
      }
    
} finally { nativeHost.endCombatActor(nativeSourceScope); }
}
  }

export function sceneUpdateSummonReforms(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const body of nativeHost.actors) {
      const state = body.summonReform;
      if (!state || body.dead) continue;
      state.remaining -= dt * nativeHost.timeflow.actorScale(body);
      if (state.remaining > 0) continue;
      body.invulnerable = state.invulnerable; body.untargetable = state.untargetable;
      body.sheet.removeSource('summon:reform'); body.summonReform = undefined;
      nativeHost.flashes.push({ pos: { ...body.pos }, radius: body.radius * 2, color: body.color, life: 0.25, maxLife: 0.25 });
    }
  }

export function sceneUpdateCompanionGrants(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const seat of nativeHost.frameSeats()) {
      const owner = nativeHost.seatHero(seat);
const nativeSourceScope = nativeHost.beginCombatActor(owner, true);
try {
      nativeHost.companionGrants.update(owner, nativeHost.actors, dt,
        (inst, delivery) => nativeHost.spawnMinion(owner, inst, { delivery }),
        body => nativeHost.kill(body, true));
    
} finally { nativeHost.endCombatActor(nativeSourceScope); }
}
  }

export function sceneUpdateReplenishment(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const caster of [...nativeHost.actors]) {
      if (caster.dead || caster.downed || !caster.skills.some(inst => inst && replenishingDelivery(inst))) {
        nativeHost.replenishment.forget(caster);
        continue;
      }
      const entries: { inst: SkillInstance; interval: number; room: number; count: number }[] = [];
      for (const inst of new Set(caster.skills)) {
        if (!inst) continue;
        const d = replenishingDelivery(inst);
        if (!d || !replenishmentActive(inst) || d.persistent || d.decay || d.waves || d.fromCorpse
          || !Number.isFinite(d.replenish!.interval) || d.replenish!.interval <= 0
          || instanceTargeting(inst)?.target === 'corpse'
          || caster.isStunned() || caster.tagsForbidden(inst) || nativeHost.castSealed(caster, inst) // THE CAST SEAL stands the clock down
          || nativeHost.castReqRefusal(caster, inst)) continue;
        const shape = replenishShape(caster, inst, d);
        const alive = d.poolGroup ? nativeHost.minionsOfGroup(caster, d.poolGroup) : nativeHost.minionsOfSkill(caster, inst.def.id);
        const capacityBodies = alive.filter(a => !a.summonOffspring);
        entries.push({ inst, interval: shape.interval, count: shape.count, room: shape.cap - capacityBodies.length });
      }
      nativeHost.replenishment.update(caster, entries, dt * nativeHost.timeflow.actorScale(caster), (inst, count) => {
        // Earlier batches this tick may have filled a shared pool. Re-read
        // its room at birth so two replenishing skills never evict each other.
        const d = replenishingDelivery(inst)!;
        const alive = d.poolGroup ? nativeHost.minionsOfGroup(caster, d.poolGroup) : nativeHost.minionsOfSkill(caster, inst.def.id);
        const room = replenishShape(caster, inst, d).cap - alive.filter(a => !a.summonOffspring).length;
        for (let n = 0; n < Math.min(count, room); n++) nativeHost.spawnMinion(caster, inst);
      });
    }
  }

export function sceneUpdatePendingBlinks(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (let i = nativeHost.pendingBlinks.length - 1; i >= 0; i--) {
      const pb = nativeHost.pendingBlinks[i];
const nativeRecordScope=nativeHost.beginCombatRecord("pendingBlinks", pb);
try {
      if (pb.actor.dead) { if (pb.visual) pb.visual.life = 0; nativeHost.pendingBlinks.splice(i, 1); continue; }
      pb.timer -= dt;
      if (pb.timer <= 0) {
        nativeHost.pendingBlinks.splice(i, 1);
        if (pb.visual) pb.visual.life = 0;
        nativeHost.teleportActor(pb.actor, pb.dest, pb.color, undefined, pb.actor.tier, pb.inst?.def.id);
        if (pb.faceTarget && sameStory(pb.actor, pb.faceTarget)) {
          pb.actor.facingPrev = pb.actor.facing = angleTo(pb.actor.pos, pb.faceTarget.pos);
        }
        // Delayed blinks (Warp) erupt on arrival too.
        if (pb.inst) {
          nativeHost.moveBlast(pb.actor, pb.inst, pb.actor.pos);
          nativeHost.dropLingerField(pb.actor, pb.inst, pb.actor.pos);
        }
      }
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneCheckMinionDetonations(nativeHost:NativeSceneFrameHost): void {
    for (const a of nativeHost.actors) {
      if (a.dead || !a.isMinion() || a.explodeOnLowLife <= 0) continue;
      if (a.life < a.maxLife() * a.lowLifeLine()) {
        nativeHost.explodeActor(a, a.explodeOnLowLife);
        nativeHost.kill(a, true);
      }
    }
  }

export function sceneSeparateActors(nativeHost:NativeSceneFrameHost): void {
    // Flat constructs are floor markings — you walk OVER them, not into them.
    const flat = (a: Actor): boolean => !!a.summonReform || !!a.summonShell || !!a.construct
      && (a.construct.kind === 'pad' || a.construct.kind === 'gate'
        || a.construct.kind === 'trap' || a.construct.kind === 'mine'
        // Hover/strike echoes are GHOSTS glued to their owner — a solid one
        // would shove the player out from under their own mirage every
        // frame. The mimic CLONE is a standing body: it blocks like any
        // construct (the substitution holds your ground LITERALLY).
        || (a.construct.kind === 'echo' && a.construct.echo?.mode !== 'mimic'));
    // Airborne leapers don't shoulder anyone; downed co-op bodies are frozen
    // (excluded so a shove can't drift them out of an ally's revive range).
    // PAIRS COME FROM THE ACTOR GRID, not an O(n²/2) sweep — but in the SAME
    // (i, j) array order the sweep produced (gridSeq ascending), so the float
    // nudges accumulate byte-identically (the balance baseline gates on it).
    const alive = nativeHost.actors.filter(a => !a.dead && !a.downed && !flat(a) && !a.leap);
    const cand = nativeHost.separateScratch;
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      nativeHost.actorsNear(a.pos.x, a.pos.y, a.radius, cand);
      for (const b of cand) {
        if (b.gridSeq <= a.gridSeq) continue; // each pair once, sweep order
        if (b.dead || b.downed || flat(b) || b.leap) continue;
        if (nativeHost.seatByActor.get(b)?.keeper || nativeHost.seatByActor.get(a)?.keeper) continue; // keeperSeat: the warden has no shoulder
        // THE SOVEREIGNTY GATE (engine/tiers.ts sameStory): bodies on
        // different stories share a screen, never a shoulder — the lodger
        // strolling above the common room walks through nobody beneath the
        // boards, and the valley pack under a bridge deck body-blocks no
        // deck walker. (The reported "invisible wall": a culled other-story
        // body shouldering the hero.) Flat zones compare 0 with 0.
        if (!sameStory(a, b)) continue;
        const d = dist(a.pos, b.pos);
        const minD = a.radius + b.radius;
        if (d < minD && d > 0.01) {
          // A GRAB PAIR is one body for the shoulder pass (the grab
          // fabric): the seat deliberately overlaps its holder — parting
          // them every frame would walk the holder across the map under
          // its own luggage. Third parties still shoulder both; the
          // slave step re-seats the held AFTER this pass regardless.
          if (a.heldBy === b.id || b.heldBy === a.id) continue;
          // ONE CREATURE never shoulders itself (the grab-pair law made
          // structural): a composite part is position-slaved into its
          // root's facing frame every tick (updateParts), and a latched
          // rider onto its victim's rim (clingSeatPos) — the overlap
          // those seats DESIGN IN re-arms every frame, so this pass can
          // never resolve it, only convert it into a thruster: an
          // anchored part hands its mobile root the FULL share each tick
          // (the effigy porter surfed its own idol at ~640 px/s, casting
          // all the way), and a ridden body walks out from under its
          // riders. Kinship IS the partLink/clingTo state — root↔part,
          // part↔sibling, rider↔ridden, rider↔co-rider; a future
          // pos-slaved fabric joins by adding its clause here. Third
          // parties still shoulder every body of the assembly.
          if (a.partLink?.root === b || b.partLink?.root === a) continue;
          if (a.partLink && a.partLink.root === b.partLink?.root) continue;
          if (a.clingTo?.id === b.id || b.clingTo?.id === a.id) continue;
          if (a.clingTo && a.clingTo.id === b.clingTo?.id) continue;
          // A SADDLE PAIR is one silhouette the same way (the mount
          // fabric): rider↔steed and rider↔co-rider never shoulder.
          if (a.mountId === b.id || b.mountId === a.id) continue;
          if (a.mountId !== undefined && a.mountId === b.mountId) continue;
          // PHASING: no body, no shoulder — a phasing actor passes through
          // the crowd (and it through them). Hits/targeting are untouched.
          if (a.sheet.get('phasing') > 0 || b.sheet.get('phasing') > 0) continue;
          // ALTITUDE SPLIT: a FLYING body streams over grounded ones (and
          // they under it) — the renderer lifts it off its shadow, so the
          // shoulder it no longer throws is the shoulder it no longer has
          // (drawn == tested). Same-altitude pairs still part normally:
          // two fliers shoulder in the air, two walkers on the ground.
          // Hits/targeting untouched — a swing still swats what passes
          // overhead; it just can't be body-blocked.
          if (a.flying !== b.flying) continue;
          // A SQUISH PAIR never shoulders (engine/squish.ts): the boot goes
          // OVER the bug, not into it — parting them here would keep the
          // crunch from ever landing. The tread sweep (updateSquish, same
          // frame) resolves the overlap as the kill instead; same-size kin
          // fail the mass gate and part normally.
          if ((b.squish && canSquish(a, b, b.squish))
            || (a.squish && canSquish(b, a, a.squish))) continue;
          // Constructs and rooted objects (spawners, caches) are anchored:
          // only the mobile party gets pushed.
          const ang = angleTo(a.pos, b.pos);
          const aFixed = !!a.construct || a.anchored;
          const bFixed = !!b.construct || b.anchored;
          if (aFixed && bFixed) continue;
          // WEIGHT decides who yields: the overlap splits by INVERSE mass —
          // an ogre wading through goblins parts the goblins. Poise anchors
          // (effectiveWeight), so the unbroken hold their ground here too.
          const overlap = minD - d;
          const wa = a.effectiveWeight();
          const wb = b.effectiveWeight();
          const aShare = aFixed ? 0 : bFixed ? 1 : wb / (wa + wb);
          // The shove is a MOVE, not a placement: resolve with the pre-shove
          // origin so a body pressed against a grid wall holds the face.
          // Origin-less clampPos takes the placement branch — snapToWalkable's
          // cell-CENTER hop — and a crowded wall-press rubberbands forever
          // (pop out ~half a cell, walk back in, pop out again).
          if (!aFixed && aShare > 0) {
            const fx = a.pos.x, fy = a.pos.y;
            a.pos.x -= Math.cos(ang) * overlap * aShare;
            a.pos.y -= Math.sin(ang) * overlap * aShare;
            // (The shove confines against the body's OWN story — a crowd
            // never nudges a storey walker through a hanging wall.)
            a.pos = nativeHost.clampPos(a.pos, a.radius, vec(fx, fy), { mover: a });
          }
          if (!bFixed && aShare < 1) {
            const fx = b.pos.x, fy = b.pos.y;
            b.pos.x += Math.cos(ang) * overlap * (1 - aShare);
            b.pos.y += Math.sin(ang) * overlap * (1 - aShare);
            b.pos = nativeHost.clampPos(b.pos, b.radius, vec(fx, fy), { mover: b });
          }
        }
      }
    }
    // separateScratch is query storage, not a live cross-frame actor lease.
    cand.length = 0;
  }

export function sceneUpdateSquish(nativeHost:NativeSceneFrameHost): void {
    for (const v of nativeHost.actors) {
      const spec = v.squish;
      if (!spec || v.dead) continue;
      // THE SLEEPER IS SPARED: dormancy outranks physics (the sentry
      // fabric's own law for wind and environmental strikes).
      if (isDormant(v)) continue;
      // One query covers the whole animal: the head plus the worm's file.
      const span = v.worm ? v.worm.length * v.worm.spacing + v.radius : v.radius;
      for (const t of nativeHost.actorsNear(v.pos.x, v.pos.y, span + 64, nativeHost.squishScratch)) {
        if (!sameStory(t, v)) continue; // the sovereignty gate: the boot on the deck treads no valley bug
        if (!canSquish(t, v, spec)) continue;
        const tread = t.radius * SQUISH_CFG.treadFrac;
        let hit = dist(t.pos, v.pos) <= tread + v.radius;
        if (!hit && v.worm) {
          const segs = v.worm.segments;
          for (let i = 0; i < segs.length && !hit; i++) {
            hit = dist(t.pos, segs[i]) <= tread + segR(v, i);
          }
        }
        if (!hit) continue;
        // The crunch: an ordinary death, credited to the tread.
        nativeHost.kill(v, false, t);
        if (!spec.quiet) {
          const tint = spec.color ?? (v.defId ? MONSTERS[v.defId]?.color : undefined) ?? '#8a6a4a';
          nativeHost.flashes.push({
            pos: vec(v.pos.x, v.pos.y), radius: SQUISH_CFG.fx.radius,
            color: tint, life: SQUISH_CFG.fx.life, maxLife: SQUISH_CFG.fx.life,
          });
          if (spec.text) {
            nativeHost.text(vec(v.pos.x, v.pos.y - 16), spec.text, tint, SQUISH_CFG.textSize);
          }
        }
        break; // this life is spent — next victim
      }
    }
  }

export function sceneUpdateWindPush(nativeHost:NativeSceneFrameHost, dt: number): void {
    if (!nativeHost.massRuntime?.weather && !nativeHost.zoneWind()) return; // calm skies — skip the whole walk
    for (const a of nativeHost.actors) {
      // isDormant: an un-roused sentry (a toll warden, huddled folk) is
      // PLANTED — the gale must not walk a sleeping garrison across the
      // map before the player ever finds it. Rousing restores physics.
      if (a.dead || a.downed || a.anchored || a.construct || a.leap || a.passive || isDormant(a)) continue;
      const gale = nativeHost.windAt(a.pos, a.tier);
      if (!gale) continue; // sheltered or becalmed
      const push = WIND_CFG.pushPerSec * dt / Math.max(0.4, a.effectiveWeight());
      if (push <= 0.001) continue;
      // Origin-aware confine (a MOVE): a gale pressing a body against a grid
      // wall holds it at the face — never snapToWalkable's cell-center hop.
      a.pos = nativeHost.clampPos(vec(
        a.pos.x + gale.x * push,
        a.pos.y + gale.y * push,
      ), a.radius, a.pos);
    }
  }

export function sceneUpdateBrittle(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (const a of nativeHost.actors) {
      if (a.dead || a.passive || a.team !== nativeHost.player.team) continue;
      for (const d of nativeHost.doodadsAt(a.pos.x, a.pos.y)) {
        // LAYER SOVEREIGNTY: feet touch only their own story's breakables —
        // a runner in the root ducts neither creaks nor pops the street's
        // pods standing over the web. Flat zones read 0 === 0 everywhere.
        if ((d.tier ?? 0) !== a.tier) continue;
        const br = doodadRuleOf(d.kind).brittle;
        if (!br || d.gone) continue;
        const gap = dist(a.pos, d.pos);
        // The body's own seat is the STRIKE point (the dissolution grammar's
        // crack/fling radiate from where the boot or the press landed).
        if (br.on.includes('touch') && gap <= a.radius + d.radius + 2) {
          if (!br.dwell) { nativeHost.popBrittle(d, a, a.pos); continue; }
          nativeHost.brittleAccrue(d, br, dt, a.pos);
          continue;
        }
        if (br.on.includes('near') && gap <= (br.reach ?? 40) + a.radius) {
          if (!br.dwell) { nativeHost.popBrittle(d, a, a.pos); continue; }
          nativeHost.brittleAccrue(d, br, dt, a.pos);
        }
      }
    }
  }

export function sceneUpdateSnow(nativeHost:NativeSceneFrameHost, dt: number): void {
    const mass=nativeHost.massRuntime;
    if(mass?.snow){
      const points=nativeHost.actors.filter(a=>!a.dead&&!a.downed).map(a=>mass.walk.at(a.pos.x,a.pos.y));
      const chunk=mass.config.geography!.policy.chunkSpan;
      if(nativeHost.isPresentLocalPlayer()) for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)points.push(mass.walk.at(nativeHost.player.pos.x+x*chunk,nativeHost.player.pos.y+y*chunk));
      mass.snow.update(dt,nativeHost.time,points);
      if(nativeHost.isPresentLocalPlayer()) nativeHost.snowCover=nativeHost.snowCoverAt(nativeHost.player.pos);
      return;
    }
    const heat = nativeHost.zone.theme.heat ?? 0.5;
    // skyFront: no drifts pile up under a roof (the melt below still runs —
    // tracked-in cover fades at the biome's own heat).
    const f = nativeHost.skyFront();
    if (f?.kind === 'snow') {
      nativeHost.snowCover += dt * f.intensity / SNOW_CFG.accumulateSec;
    }
    if (heat > 0.02) {
      nativeHost.snowCover -= dt * heat / SNOW_CFG.meltSecAtHeat1;
    }
    // The biome's own floor OR the runtime floor (snowFloor — Deepwinter's
    // conversion pin), whichever holds more snow.
    const floor = Math.max(heat <= 0.05 ? SNOW_CFG.frozenBaseline : 0, nativeHost.snowFloor);
    nativeHost.snowCover = clamp(nativeHost.snowCover, floor, 1);
  }

export function sceneUpdateWeatherDress(nativeHost:NativeSceneFrameHost, dt: number): void {
    nativeHost.weatherDressAcc += dt;
    if (nativeHost.weatherDressAcc < WEATHER_DRESS_CFG.cadenceSec) return;
    nativeHost.weatherDressAcc = 0;
    // Sanctuary ground stays untouched; a boundless arena has no floor to dress.
    const eligible = !nativeHost.arena.boundless && nativeHost.zone.objective.kind !== 'safe';
    const f = eligible ? nativeHost.skyFront() : null;
    const plan = f ? dressPlanFor(f.kind) : null;
    const holds = !!plan && !!f && f.intensity >= plan.fadeBelow;
    // DISSOLVE: every planted piece whose front no longer holds this zone.
    let standing = false;
    for (const d of nativeHost.doodads) {
      if (!d.weatherDress || d.gone || d.evap) continue;
      if (holds && d.weatherDress === f!.kind) { standing = true; continue; }
      d.evap = { t: 0, rate: dressPlanFor(d.weatherDress)?.evapRate ?? WEATHER_DRESS_CFG.evapRate };
      nativeHost.evaporating.push(d);
    }
    // PLANT: the front holds hard enough and none of its dress stands yet.
    if (!plan || !f || standing || f.intensity < plan.plantAbove) return;
    const rng = new Rng((nativeHost.currentZoneSeed ^ hashStr(`wxdress:${f.kind}`) ^ WEATHER_DRESS_CFG.salt) >>> 0);
    const pieces = rollDressPieces(rng, plan, f.intensity, nativeHost.arena,
      (x, y, r, row) => nativeHost.dressSpotOk(x, y, r, !!row.solid));
    for (const p of pieces) {
      const d: Doodad = {
        pos: vec(p.x, p.y), radius: p.r, kind: p.row.doodad as DoodadKind,
        rot: p.rot, weatherDress: f.kind,
      };
      normalizeDoodadBound(d);
      nativeHost.doodads.push(d);
    }
  }

export function sceneUpdateDrops(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (let i = nativeHost.drops.length - 1; i >= 0; i--) {
      const drop = nativeHost.drops[i];
      drop.bob += dt * 3;
      // THE SPOILS STORY, settled once: the shedder's stamp, else the floor's
      // word (World.spoilStoryAt) — every pickup below asks the same story.
      drop.tier ??= nativeHost.spoilStoryAt(drop.pos);
      // A freshly player-dropped gem ticks down its grace before ANYONE can grab it.
      if (drop.grace !== undefined && drop.grace > 0) { drop.grace -= dt; continue; }
      // The DROPPER additionally can't reclaim it until they've stepped off it once
      // (left the pickup radius) — so a discard/drop-trade never instantly bounces
      // back into the dropper's hands while they stand on it.
      if (drop.droppedBy && !drop.dropperCleared) {
        const dropper = nativeHost.frameSeats().find(s => s.id === drop.droppedBy);
        if (!dropper || dist(dropper.actor.pos, drop.pos) > dropper.actor.radius + ITEM_CFG.pickupTouch.gem) drop.dropperCleared = true;
      }
      const exclude = drop.droppedBy && !drop.dropperCleared ? drop.droppedBy : undefined;
      const holder = nativeHost.dropHolder(drop); // THE TOUCH LAW (card 27): a held drop answers its owner's hands alone
      // Touch hitboxes ride ITEM_CFG.pickupTouch — currency keeps the fat
      // vacuum ring; gear and gems sit tight to their shrunken sprites.
      // VESTIGES always vacuum — stackable satchel material, zero bag cost.
      if (drop.item.kind === 'vestige') {
        const seat = nativeHost.pickupSeat(drop.pos, ITEM_CFG.pickupTouch.currency, exclude, drop.tier, holder);
        if (!seat) continue;
        nativeHost.grantVestige(seat, drop.item.id, drop.item.count);
        nativeHost.drops.splice(i, 1);
        continue;
      }
      // ESSENCE always vacuums — currency underfoot, straight to the wallet
      // (grantEssence floats the gain, banks discovery, replicates the seat).
      if (drop.item.kind === 'essence') {
        const seat = nativeHost.pickupSeat(drop.pos, ITEM_CFG.pickupTouch.currency, exclude, drop.tier, holder);
        if (!seat) continue;
        nativeHost.grantEssence(seat, { essence: drop.item.essence, count: drop.item.count });
        nativeHost.drops.splice(i, 1);
        continue;
      }
      // ABILITY ESSENCE packets vacuum the same way — skill food to the wallet.
      if (drop.item.kind === 'abilityEssence') {
        const seat = nativeHost.pickupSeat(drop.pos, ITEM_CFG.pickupTouch.currency, exclude, drop.tier, holder);
        if (!seat) continue;
        nativeHost.grantAbilityEssence(seat, drop.item.tier, drop.item.count);
        nativeHost.drops.splice(i, 1);
        continue;
      }
      // THE STONE (skill-items M2/M3): a MEMORY drop vacuums like the gem
      // it replaced — unconditional, at the gem's own touch ring, never the
      // gear key-gate (the pouch is the gem lane's item; pickup timing and
      // draw count match the gem byte-for-byte, the sim-stream law). It
      // MERGES onto the seat's standing pouch tile of its KIND (no second
      // cell) or autoPlaces as the first pickup; a full bag leaves it lying.
      if (drop.item.kind === 'gear' && drop.item.item.mem) {
        const seat = nativeHost.pickupSeat(drop.pos, ITEM_CFG.pickupTouch.gem, exclude, drop.tier, holder);
        if (!seat) continue;
        const item = drop.item.item;
        if (nativeHost.tryMergeMemoryItem(seat, item)) { nativeHost.drops.splice(i, 1); continue; }
        if (!autoPlace(seat.meta.items, item)) {
          nativeHost.failNote(seat.actor, 'bagfull', 'inventory full');
          continue;
        }
        nativeHost.noteMemoryPickup(seat, memoryKindOf(item) ?? 'rough', item.mem!.length);
        nativeHost.markMetaDirty(seat);
        nativeHost.drops.splice(i, 1);
        continue;
      }
      // GEAR: vacuum mode (default) hoovers it like a gem — into the grid if
      // it fits, else it stays lying with a throttled note. Key mode makes it
      // a deliberate press (pickupNearestGear); the key works in both modes.
      if (drop.item.kind === 'gear') {
        if (nativeHost.isBankedRelicEcho(drop.item.item)) { nativeHost.drops.splice(i, 1); continue; }
        if (!nativeHost.gearVacuum) continue;
        const seat = nativeHost.pickupSeat(drop.pos, ITEM_CFG.pickupTouch.gear, exclude, drop.tier, holder);
        if (!seat) continue;
        if (drop.item.item.questId && seat !== nativeHost.localSeat && !nativeHost.localSeat.keeper) continue; // keeperSeat
        if (!autoPlace(seat.meta.items, drop.item.item)) {
          nativeHost.failNote(seat.actor, 'bagfull', 'inventory full');
          continue;
        }
        const gRar = ITEM_RARITIES[drop.item.item.rarity];
        nativeHost.text(seat.actor.pos, drop.item.item.name, gRar.color, 13, 'pickup');
        notePickup(nativeHost.pickupFeed, seat.id,
          `${drop.item.item.name} (${gRar.label})`, gRar.color, nativeHost.time);
        nativeHost.markMetaDirty(seat);
        nativeHost.drops.splice(i, 1);
        continue;
      }
      const seat = nativeHost.pickupSeat(drop.pos, ITEM_CFG.pickupTouch.gem, exclude, drop.tier, holder);
      if (!seat) continue;
      const item = drop.item;
      // THE RESIDENCE: a vacuumed gem WRAPS into its 1×1 bag item — and for
      // the first time gems compete for space: a full bag leaves it lying
      // with the gear lane's throttled note (never silently eaten).
      if (item.kind === 'support') {
        const wrapped = makeSupportGemItem(item.gem);
        if (!autoPlace(seat.meta.items, wrapped)) {
          nativeHost.failNote(seat.actor, 'bagfull', 'inventory full');
          continue;
        }
        nativeHost.text(seat.actor.pos, `${item.gem.def.name} (support)`, item.gem.def.color, 13, 'pickup');
        notePickup(nativeHost.pickupFeed, seat.id,
          `${item.gem.def.name} (Support Memory)`, item.gem.def.color, nativeHost.time);
      } else {
        const wrapped = makeSkillGemItem(item.inst);
        if (!autoPlace(seat.meta.items, wrapped)) {
          nativeHost.failNote(seat.actor, 'bagfull', 'inventory full');
          continue;
        }
        const rarity = SKILL_RARITIES[item.inst.rarity ?? 'common'];
        nativeHost.text(seat.actor.pos,
          `${skillInstanceName(item.inst)} (${rarity.label.toLowerCase()} skill)`, rarity.color, 14, 'pickup');
        notePickup(nativeHost.pickupFeed, seat.id,
          `${skillInstanceName(item.inst)} (${rarity.label})`, rarity.color, nativeHost.time);
      }
      // CO-OP: the picked-up gem entered this seat's bag → re-replicate it.
      nativeHost.markMetaDirty(seat);
      nativeHost.drops.splice(i, 1);
    }
  }

export function sceneUpdateOrbs(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (let i = nativeHost.orbs.length - 1; i >= 0; i--) {
      const orb = nativeHost.orbs[i];
      const def = ORB_DEFS[orb.kind];
      if (!def) { nativeHost.orbs.splice(i, 1); continue; }
      orb.bob += dt * 3;
      orb.life -= dt;
      if (orb.life <= 0) { nativeHost.orbs.splice(i, 1); continue; }
      // SIPHON orbs fly home and pour on arrival — reserved for their
      // owner; a dead owner drops them where they float (ground pickups).
      if (orb.homeTo) {
        if (orb.homeTo.dead) { orb.homeTo = undefined; continue; }
        const home = orb.homeTo;
        const gap = dist(orb.pos, home.pos);
        if (gap <= home.radius + 10) {
          nativeHost.pourOrb(home, orb);
          nativeHost.orbs.splice(i, 1);
        } else {
          const ang = angleTo(orb.pos, home.pos);
          const speed = 320 + (8 - orb.life) * 90; // it accelerates home
          orb.pos.x += Math.cos(ang) * speed * dt;
          orb.pos.y += Math.sin(ang) * speed * dt;
        }
        continue;
      }
      // MAGNET kinds drift to the nearest living seat before the scoop —
      // wakeflames are drawn to the living (def.magnet is the leash). THE
      // SAME-STORY LAW: only a seat on the orb's story (stamped by its
      // shedder, else the floor's word) may draw or scoop it.
      orb.tier ??= nativeHost.spoilStoryAt(orb.pos);
      const seat = nativeHost.pickupSeat(orb.pos, Math.max(18, def.magnet ?? 0), undefined, orb.tier);
      if (!seat) continue;
      const p = seat.actor;
      if (dist(orb.pos, p.pos) > p.radius + 18) {
        const ang = angleTo(orb.pos, p.pos);
        orb.pos.x += Math.cos(ang) * 240 * dt;
        orb.pos.y += Math.sin(ang) * 240 * dt;
        continue;
      }
      nativeHost.pourOrb(p, orb);
      nativeHost.orbs.splice(i, 1);
    }
  }

export function sceneUpdateRemnants(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (let i = nativeHost.remnants.length - 1; i >= 0; i--) {
      const r = nativeHost.remnants[i];
const nativeRecordScope=nativeHost.beginCombatRecord("remnants", r);
try {
      r.bob += dt * 3;
      r.life -= dt;
      if (r.life <= 0) { nativeHost.remnants.splice(i, 1); continue; }
      const seat = nativeHost.pickupSeat(r.pos, 18);
      if (!seat) continue;
      const p = seat.actor;
      if (r.kind) {
        const def = REMNANT_KINDS[r.kind];
        if (def) {
          const remnantCue = def.cue ?? { profile: 'physical', color: def.color };
          if (def.buff) {
            p.addBuff({ ...def.buff, storedCue: def.buff.storedCue ?? remnantCue });
            if (p.buffs.has(def.buff.id)) noteProcCue(p, remnantCue, 'gain', 'remnant:' + def.id);
          }
          if (def.charge) {
            const remnantCueBefore = p.charges.get(def.charge.charge) ?? 0;
            p.gainCharge(def.charge.charge, def.charge.amount, def.charge.max);
            const remnantCueGain = (p.charges.get(def.charge.charge) ?? 0) - remnantCueBefore;
            if (remnantCueGain > 0) noteProcCue(p, remnantCue, 'gain', 'remnant:' + def.id, remnantCueGain);
          }
        }
      } else if (r.element) {
        p.addBuff({
          type: 'buff', id: 'remnant_' + r.element, duration: 10, storedCue: { profile: r.element },
          mods: [
            mod('damage', 'more', 0.4, [r.element]),
            mod('projectileCount', 'flat', 1, [r.element]),
            mod('aoeRadius', 'increased', 0.3, [r.element]),
          ],
        });
        if (p.buffs.has('remnant_' + r.element)) noteProcCue(p, { profile: r.element }, 'gain', 'remnant:' + r.element);
      }
      nativeHost.remnants.splice(i, 1);
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdateCarriers(nativeHost:NativeSceneFrameHost, dt: number): void {
    if (!nativeHost.tracks.length || dt <= 0) return;
    for (const tr of nativeHost.tracks) {
      if (!tr.armed) continue;
      for (const r of tr.riders) {
        if (!r.def.carry) continue;
        const pose = trackPose(tr, nativeHost.time, r.phase, r.def);
        if (pose.pending) continue;             // cradle rest — no deck abroad
        const prev = trackPose(tr, nativeHost.time - dt, r.phase, r.def);
        if (prev.pending) continue;             // birth frame — no step yet
        const dRot = Math.atan2(Math.sin(pose.rot - prev.rot), Math.cos(pose.rot - prev.rot));
        // A paused deck moves nobody — but its SHIELD still stamps (the
        // boards are between you and the water whether or not they move).
        const still = Math.abs(pose.x - prev.x) < 1e-6 && Math.abs(pose.y - prev.y) < 1e-6
          && Math.abs(dRot) < 1e-6;
        const cos = Math.cos(dRot), sin = Math.sin(dRot);
        const board = riderSurface(r.def, prev);
        for (const a of nativeHost.actors) {
          if (a.dead || a.flying || a.leap) continue;
          if (a.tier !== (tr.tier ?? 0)) continue; // the lane's own story rides (the sovereignty gate)
          if (a.pos.x < tr.bound.x0 - a.radius || a.pos.x > tr.bound.x1 + a.radius
            || a.pos.y < tr.bound.y0 - a.radius || a.pos.y > tr.bound.y1 + a.radius) continue;
          // Feet on the boards where the deck WAS: the center decides (a
          // body straddling the rim keeps its own footing and is left
          // behind — the honest gangplank moment).
          if (!shapeContains(board, prev.x, prev.y, a.pos.x, a.pos.y, 0)) continue;
          // THE BOARDS SHIELD: a deckborne body stands INSURED against the
          // ground beneath (the terrain sweep skips it — no wading slow on
          // the ferry, no soul-tether drain over the pale water; the boards
          // are between you and the river). Stamped even while the deck is
          // paused or the body's seat is slaved elsewhere.
          a.deckUntil = nativeHost.time + 0.3;
          if (still || a.clingTo || a.heldBy) continue; // no step / seats win the frame
          const lx = a.pos.x - prev.x, ly = a.pos.y - prev.y;
          const nx = pose.x + lx * cos - ly * sin;
          const ny = pose.y + lx * sin + ly * cos;
          a.pos = nativeHost.clampPos(vec(nx, ny), a.radius, a.pos);
        }
      }
    }
  }

export function sceneUpdateClings(nativeHost:NativeSceneFrameHost): void {
    let seats: Map<number, number> | null = null;
    for (const a of nativeHost.actors) {
      if (a.dead) continue;
      const ride = a.clingTo;
      if (ride) {
        const v = nativeHost.actorById(ride.id);
        const cmd = a.aiCommand;
        // A fresh order pointing AWAY from the ridden victim peels the
        // rider off (the direct channel re-throws your own riders).
        const redirected = cmd !== undefined && (cmd.kind === 'recall' // minionCombat: recall always dismounts
          || (cmd.targetId !== ride.id
            && dist(cmd.pos, v?.pos ?? cmd.pos) > (cmd.radius ?? COMMAND_CFG.markRadius)));
        if (!v || v.dead || redirected) {
          nativeHost.clingRelease(a);
          continue;
        }
        // THE SHAKE: the ride ends on its own rolled clock — the victim's
        // earned answer. A burrow-tempered rider pops out SCATTERED into
        // its vulnerability window (clingRelease knows the cause).
        if (nativeHost.time >= ride.until || clingMotionShaken(a, v, nativeHost.time)) {
          // Seat at the host's current pose before the fling; a dash or
          // teleport must not leave the released rider at yesterday's seat.
          clingSeatPos(v, a, ride.ang, a.pos);
          nativeHost.clingRelease(a, 'shake');
          continue;
        }
        clingSeatPos(v, a, ride.ang, a.pos);
        a.facing = ride.ang + Math.PI;
        a.aiTargetId = ride.id; // the ride IS the fight — acquire churn never wanders
        const spec = a.cling;
        if (nativeHost.time >= ride.statusAt) {
          ride.statusAt = nativeHost.time + CLING_CFG.rideStatusEvery;
          if (spec?.rideStatus) nativeHost.withCombatStatusSource(v, undefined, undefined, () => v.applyStatus(spec.rideStatus!, 0, 1, 'cling'));
          // THE BURROW MARKER: pure legibility for the sunk rider (the
          // renderer's ghost read + the co-op status wire) — refresh-
          // driven like the grab markers, stripped by the release.
          if (spec?.burrow) nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus('burrowed', 0, 1, 'cling'));
        }
        // THE GNAW (ClingSpec.gnaw): the DoT latch — one typed, mitigated,
        // rider-credited chew per beat through the swallow-digest grammar
        // (bodily damage: no evade, no block, no crit — and like every
        // DoT it pierces plies straight to life; kill() stays sovereign).
        // The rider's own damage sheet scales it, so the monster level
        // curve and the keeper's batch-tempered minion folds arrive free.
        const g = spec?.gnaw;
        if (g && nativeHost.time >= ride.gnawAt) {
          const every = g.every ?? CLING_CFG.gnaw.every;
          ride.gnawAt = nativeHost.time + every;
          if (!v.invulnerable) {
            const type = g.type ?? 'physical';
            const amt = g.dps * every * a.sheet.get('damage', gnawTags(type));
            const taken = mitigateTyped(v, { [type]: amt }, { attacker: a });
            SIM_TAP.current?.onDot?.(v, taken, type); // gnaw participates in balance telemetry
            if (taken > 0) {
              const deedLifeBefore = v.life;
              v.life -= taken;
              nativeHost.recordIndirectDamage(v, a, deedLifeBefore);
              v.hitFlash = 0.12;
              v.hitFlashType = type;
              if (taken >= 1) {
                nativeHost.text(v.pos, Math.round(taken).toString(), DAMAGE_COLOR[type], 11);
              }
              if (v.life <= 0 && !v.dead) nativeHost.kill(v, false, a);
            }
          }
        }
        continue;
      }
      if (!a.cling || a.passive || a.throngCarried || a.throngDriven || a.throngDive || nativeHost.time < a.clingThinkAt) continue;
      if (a.isStunned() || a.heldBy !== undefined || a.gripping) continue;
      a.clingThinkAt = nativeHost.time + CLING_CFG.thinkEvery;
      if (nativeHost.time < a.clingCooldownUntil || isDormant(a)) continue;
      const v = a.aiTargetId !== undefined ? nativeHost.actorById(a.aiTargetId) : undefined;
      if (!v || !clingEligible(a, v)) continue;
      if (v.tier !== a.tier) continue; // THE SAME-STORY LAW: a latch is contact — no rim-duel latch across a story
      const pad = a.cling.pad ?? CLING_CFG.attachPad;
      if (dist(a.pos, v.pos) > a.radius + v.radius + pad) continue;
      if (!seats) {
        seats = new Map();
        for (const r of nativeHost.actors) {
          if (!r.dead && r.clingTo) seats.set(r.clingTo.id, (seats.get(r.clingTo.id) ?? 0) + 1);
        }
      }
      const used = seats.get(v.id) ?? 0;
      if (used >= clingSeatsOf(v)) continue; // full coat: fight on at the rim
      seats.set(v.id, used + 1);
      const shake = a.cling.shakeSec ?? CLING_CFG.shakeSec;
      a.clingTo = {
        id: v.id,
        ang: angleTo(v.pos, a.pos) + rand(-0.5, 0.5),
        until: nativeHost.time + rand(shake[0], shake[1]),
        statusAt: nativeHost.time,
        // The gnaw arms one full beat out — a brush-past latch never
        // spikes (the lite pool's stagger doctrine).
        gnawAt: nativeHost.time + (a.cling.gnaw?.every ?? CLING_CFG.gnaw.every),
      };
      clingMotionShaken(a, v, nativeHost.time); // seed motion at contact, before the next step
      if (a.cling.gnaw && !nativeHost.seatOf(a)) a.casting = null;
      // THE LATCHHINT RETIRED (the show-don't-tell law, docs/design/show-dont-tell.md
      // §2 — the P axis): no text announces a latch on the hero. The rider seated
      // on the rim IS the sentence (drawn == held), and a motionShake escape is
      // taught by the flop's scatter the moment the body moves or turns.
      a.aiTargetId = v.id;
    }
  }

export function sceneUpdateGrabs(nativeHost:NativeSceneFrameHost, dt: number): void {
    // SOVEREIGNTY: self — the held pair (the derived census, probe_tiers RIG T).
    // THE ORPHAN REPAIR: a victim whose holder is GONE (zone travel, a
    // splice, a vanished id) must not stay bound to a ghost — heldBy is
    // the victim's side of the pair and only this sweep may clear it.
    // (The holder side self-heals below: a missing victim releases.)
    for (const a of nativeHost.actors) {
      if (a.heldBy === undefined) continue;
      const holder = nativeHost.actorById(a.heldBy);
      if (!holder || holder.dead || holder.gripping?.id !== a.id) {
        a.heldBy = undefined;
        if (a.untargetable && a.statuses.some(s => s.id === 'swallowed')) a.untargetable = false;
        for (let i = a.statuses.length - 1; i >= 0; i--) {
let nativeGrabStatus:typeof a.statuses[number];
let nativeGrabStatusScope:ReturnType<NativeSceneFrameHost["beginCombatStatus"]>|undefined;
try {
          const id = (nativeGrabStatus=a.statuses[i], nativeGrabStatusScope=nativeHost.beginCombatStatus(a,nativeGrabStatus), nativeGrabStatus).id;
          if (id === 'seized' || id === 'swallowed') {
            a.statuses.splice(i, 1);
            a.sheet.removeSource('status:' + id);
          }
        
} finally { if(nativeGrabStatusScope) nativeHost.endCombatStatus(nativeGrabStatusScope); }
}
      }
    }
    for (const a of nativeHost.actors) {
      const hold = a.gripping;
      if (!hold) continue;
      const v = nativeHost.actorById(hold.id);
      // The pair dies with either body or a vanished id (zone edges).
      if (!v || v.dead || a.dead || v.heldBy !== a.id) { nativeHost.grabRelease(a); continue; }
      // THE RELEASE LADDER — CC, sever, struggle, patience (grab.ts docs).
      if (GRAB_CFG.release.onHardCC && a.isStunned()) {
        nativeHost.grabRelease(a);
        continue;
      }
      if (hold.severed >= (hold.spec.severFrac ?? GRAB_CFG.break.severFrac)) {
        nativeHost.grabRelease(a);
        continue;
      }
      if (hold.struggle >= 1) {
        // BURST OUT: a swallowed meal fights its way back through the
        // holder's own flank (physical, mitigated, victim-credited).
        const burst = hold.spec.burstHurt ?? (hold.verb === 'swallow' ? GRAB_CFG.swallow.burstHurt : 0);
        if (burst > 0 && !a.invulnerable) {
          const taken = mitigateTyped(a, { physical: burst * a.maxLife() });
          a.life -= taken;
          a.hitFlash = 0.15;
          a.hitFlashType = 'physical';
          nativeHost.text(a.pos, Math.round(taken).toString(), DAMAGE_COLOR.physical, 13);
          if (a.life <= 0 && !a.dead) nativeHost.kill(a, false, v);
        }
        nativeHost.grabRelease(a);
        continue;
      }
      if (nativeHost.time >= hold.until) {
        // Patience ends at the HOLDER's choosing: a handoff-tempered throw
        // offers the catch to kin FIRST (THE FRIENDLY CATCH — grabHandoff),
        // then a throw-spec spits it (the gulper aims it at your allies),
        // else a plain drop.
        const t = hold.spec.throw;
        if (t?.handoff && nativeHost.grabHandoff(a, v, t.handoff)) continue;
        if (t) nativeHost.grabThrowRelease(a, t.impulse, nativeHost.grabSpitDir(a, v, t));
        else nativeHost.grabRelease(a);
        continue;
      }
      // THE SLAVE STEP: reel to the seat, then ride it (one resolver —
      // grabSeatPos — so probe, renderer and sweep can never disagree).
      grabSeatPos(a, v, hold, nativeHost.grabScratch);
      const gap = dist(v.pos, nativeHost.grabScratch);
      const step = GRAB_CFG.reelSpeed * dt;
      if (gap > step) {
        const ang = angleTo(v.pos, nativeHost.grabScratch);
        v.pos = nativeHost.clampPos(vec(
          v.pos.x + Math.cos(ang) * step, v.pos.y + Math.sin(ang) * step), v.radius);
      } else {
        v.pos = nativeHost.clampPos(vec(nativeHost.grabScratch.x, nativeHost.grabScratch.y), v.radius);
      }
      v.facing = angleTo(v.pos, a.pos);
      // The grip absorbs residual momentum — a held body does not slide
      // (a real shove feeds the meter at pushActor instead).
      if (v.push) { v.push.vx = 0; v.push.vy = 0; }
      // PASSIVE STRUGGLE: the mass law's rate, every second held.
      hold.struggle += struggleRate(hold, a, v) * dt;
      // Markers + rideStatus on a short beat (cleanse-proof by refresh).
      if (nativeHost.time >= hold.statusAt) {
        hold.statusAt = nativeHost.time + 0.25;
        nativeHost.withCombatStatusSource(v, undefined, undefined, () => v.applyStatus(GRAB_MARKER[hold.verb], 0, 1, 'grab'));
        if (hold.spec.rideStatus) nativeHost.withCombatStatusSource(v, undefined, undefined, () => v.applyStatus(hold.spec.rideStatus!, 0, 1, 'grab'));
      }
      // SWALLOW: digestion — typed, mitigated, leeched, holder-credited.
      const dot = hold.spec.dot;
      if (dot && !v.invulnerable) {
        const taken = mitigateTyped(v, { [dot.type]: dot.frac * v.maxLife() * dt });
        if (taken > 0) {
          const deedLifeBefore = v.life;
          v.life -= taken;
          nativeHost.recordIndirectDamage(v, a, deedLifeBefore);
          hold.dotAcc += taken;
          SIM_TAP.current?.onDot?.(v, taken, dot.type);
          if (hold.spec.leech) noteResourceFlow(a, v, 'life', a.healBy(taken * hold.spec.leech));
          if (v.life <= 0 && !v.dead) {
            nativeHost.kill(v, false, a);
            nativeHost.grabRelease(a);
          }
        }
      }
      // THE WRING (gripCrush — the grab support lane's third lever): an
      // invested grip WOUNDS through the hold itself — a fraction of the
      // held body's max life per second, physical, mitigated, holder-
      // credited. Queried through the seizing skill's live instance (the
      // gripPower idiom at the seize gate) so the stat stays an honest
      // skill-local gem line; stacks atop a swallow's own digestion. Both
      // tick lanes emit the onDot tap — a periodic drain the harness
      // cannot see is a payload the matrix would falsely flag inert.
      if (!v.dead && !v.invulnerable && a.gripping === hold) {
        const wringInst = hold.skillId
          ? a.skills.find(s => s?.def.id === hold.skillId) : undefined;
        const crush = wringInst
          ? a.sheet.get('gripCrush', skillContextTags(wringInst.def), instanceMods(wringInst))
          : a.sheet.get('gripCrush');
        if (crush > 0) {
          const taken = mitigateTyped(v, { physical: crush * v.maxLife() * dt });
          if (taken > 0) {
            const deedLifeBefore = v.life;
            v.life -= taken;
            nativeHost.recordIndirectDamage(v, a, deedLifeBefore);
            SIM_TAP.current?.onDot?.(v, taken, 'physical');
            if (v.life <= 0 && !v.dead) {
              nativeHost.kill(v, false, a);
              nativeHost.grabRelease(a);
            }
          }
        }
      }
    }
  }

export function sceneUpdateMounts(nativeHost:NativeSceneFrameHost): void {
    // --- (1) the pairing sweep. Collect first: minting splices the roster,
    // and a for-of over a spliced array walks crooked.
    let toPair: Actor[] | null = null;
    for (const a of nativeHost.actors) {
      if (a.dead || a.mountPaired || !a.defId) continue;
      const def = MONSTERS[a.defId];
      if (def?.mount || def?.mountSlot?.crew) (toPair ??= []).push(a);
    }
    if (toPair) for (const a of toPair) nativeHost.mountPairSpawn(a);
    // --- (2) + (3): pins and severance.
    for (const a of nativeHost.actors) {
      if (a.mountId !== undefined) {
        const m = nativeHost.actorById(a.mountId);
        if (!m || m.dead || a.dead || a.heldBy !== undefined) {
          if (m?.dead && !a.dead) nativeHost.mountUnhorse(a, m);
          else nativeHost.mountUnlink(a, a.dead);
          continue;
        }
        const slot = m.defId ? MONSTERS[m.defId]?.mountSlot : undefined;
        const seat = seatPos(m, slot, a.mountSeat ?? 0);
        a.pos.x = seat.x;
        a.pos.y = seat.y;
        a.dash = null;
        a.push = null;
        if (a.caromRun) nativeHost.endCarom(a, { quiet: true }); // the saddle beats the ball
        // Carried bearing: an idle rider faces where the beast runs; a
        // fighting one keeps the aim its own brain chose (the parts law).
        if (!a.aggroed) a.facing = m.facing;
      }
      // Belt-and-braces seat roster heal (vanished riders — zone swaps).
      // Silent by design: DIED riders sever through their own branch above,
      // which is the only path that may fire the widow policy.
      if (a.riderIds?.length) {
        const live = a.riderIds.filter(id => {
          const r = nativeHost.actorById(id);
          return r && !r.dead && r.mountId === a.id;
        });
        if (live.length !== a.riderIds.length) a.riderIds = live.length ? live : undefined;
      }
    }
  }

export function sceneUpdatePossessions(nativeHost:NativeSceneFrameHost, dt: number): void {
    void dt;
    for (const seat of nativeHost.frameSeats()) {
      const hero = seat.home;
      if (!hero) continue;
      const body = seat.actor;
      const ride = body.possession;
      if (!ride) { nativeHost.seatEject(seat, 'released'); continue; }   // self-heal: pointer without a record
      if (body.dead) { nativeHost.seatEject(seat, 'released'); continue; } // safety net; kill() ejects first
      if (ride.huskMode === 'stands') {
        nativeHost.withCombatStatusSource(hero, undefined, undefined, () => hero.applyStatus('entranced', 0, 1, 'Possession'));
        if (ride.huskLostFrac > 0
          && hero.life <= ride.huskLifeAt - hero.maxLife() * ride.huskLostFrac) {
          nativeHost.seatEject(seat, 'huskPain');
          continue;
        }
        if (POSSESS_CFG.endOn.huskSeized && hero.heldBy !== undefined) {
          nativeHost.seatEject(seat, 'huskSeized');
          continue;
        }
      } else {
        // The carried flesh shadows the body — eject always has an honest spot.
        hero.pos.x = body.pos.x;
        hero.pos.y = body.pos.y;
      }
      if (ride.until !== undefined && nativeHost.time >= ride.until) {
        nativeHost.seatEject(seat, 'duration');
      }
    }
  }

export function sceneUpdateWatch(nativeHost:NativeSceneFrameHost): void {
    const t = nativeHost.time;
    if (t < nativeHost.watchNextAt) return;
    nativeHost.watchNextAt = t + WATCH_CFG.sweepSec;
    let scent = 0;
    for (const a of nativeHost.actors) {
      const w = a.watch;
      if (!w || a.dead) continue;
      const v = watchValueOf(a, w, t);
      const rung = watchRungOf(v);
      a.watchRung = rung;
      // (2) THE STAND-DOWN: lock gone, investigation over, no fresh wound —
      // come down the ladder (the alert tell dims as the watch resumes).
      if (a.aggroed && a.aiTargetId === undefined && t >= a.alertUntil
        && !(a.aiHitAt >= 0 && t - a.aiHitAt < WATCH_CFG.provokedSec)) {
        a.aggroed = false;
        a.watchS = WATCH_CFG.rungs.search;
        a.watchFedAt = t;
        a.watchRung = WATCH_RUNG.search;
      }
      // (4) THE NOSE (before the gaze: a fresh print may re-aim the head).
      if (w.scent) {
        scent++;
        if (!a.aggroed && a.aiTargetId === undefined) nativeHost.watchScent(a, w, t);
      }
      // (3) THE GAZE — never wrench a casting or locked body's aim.
      if (a.aiTargetId === undefined && !a.casting && !a.aggroed) {
        if (a.watchRung === WATCH_RUNG.unaware && w.sweep) {
          const base = a.aiPostFacing ?? (a.watchBase ??= a.facing);
          const ph = (((a.id * 2654435761) >>> 9) & 1023) / 1023 * Math.PI * 2;
          a.facing = base
            + Math.sin(t / w.sweep.sec * Math.PI * 2 + ph)
            * (w.sweep.arcDeg * Math.PI / 180) / 2;
        } else if (a.watchRung === WATCH_RUNG.stir && a.watchAt) {
          const want = angleTo(a.pos, a.watchAt);
          const d = angleDiff(a.facing, want);
          const step = WATCH_CFG.turnRadSec * WATCH_CFG.sweepSec;
          a.facing = Math.abs(d) <= step ? want : a.facing + Math.sign(d) * step;
        }
      }
    }
    // THE TRAIL LAY: players print the ground while a scent watcher stands;
    // wet feet (WATCH_CFG.trail.breakStatuses — wading, swimming) print
    // nothing, so a stream crossing GAPS the line (the honest counterplay).
    for (const p of nativeHost.actors) {
      if (p.dead || p.kind !== 'player') continue;
      if (!scent) {
        if (p.trail) { p.trail = undefined; p.trailIdx = 0; }
        continue;
      }
      let wet = false;
      for (const s of p.statuses) {
const nativeStatusScope = nativeHost.beginCombatStatus(p, s);
try {
        if (WATCH_CFG.trail.breakStatuses.includes(s.id)) { wet = true; break; }
      
} finally { nativeHost.endCombatStatus(nativeStatusScope); }
}
      if (wet) continue;
      const newest = trailNewest(p);
      if (!newest || (p.pos.x - newest.x) * (p.pos.x - newest.x)
        + (p.pos.y - newest.y) * (p.pos.y - newest.y)
        >= WATCH_CFG.trail.stepDist * WATCH_CFG.trail.stepDist) {
        layTrailPoint(p, p.pos.x, p.pos.y, t, p.tier);
      }
    }
  }

export function sceneUpdateReserves(nativeHost:NativeSceneFrameHost): void {
    // SOVEREIGNTY: census — a headcount (the derived census, probe_tiers RIG T).
    const t = nativeHost.time;
    for (const a of nativeHost.actors) {
      const rows = a.reserves;
      if (!rows || a.dead) continue;
      // The shared travel odometer (drainPerUnit): BANK every frame's
      // displacement, charge the whole bank at the sweep — charging only
      // the sweep-frame's delta would drop most of the journey between
      // beats and let a leaker sprint for free.
      const prev = a.reservePrev;
      if (prev) {
        a.reserveOdo += dist(prev, a.pos);
        prev.x = a.pos.x; prev.y = a.pos.y;
      } else a.reservePrev = vec(a.pos.x, a.pos.y);
      if (t < a.reserveNextAt) continue;
      const moved = a.reserveOdo;
      a.reserveOdo = 0;
      const dt = a.reserveLastAt > 0 ? Math.min(1, t - a.reserveLastAt) : RESERVE_CFG.sweepSec;
      a.reserveLastAt = t;
      a.reserveNextAt = t + RESERVE_CFG.sweepSec;
      const specs = a.reserveSpecs;
      if (!specs) continue;
      // ENGAGED, for this fabric's gates: a held target OR hard aggro.
      // Ordinary locks deliberately never set Actor.aggroed (that word
      // belongs to the watch/taunt lane), so a drainWhile:'aggroed' wick
      // reading the bare flag would never burn against a watchless body's
      // ordinary lock — the fight's clock starts when the MIND holds a
      // quarry, and this is the one fold that says so.
      const engaged = a.aggroed || a.aiTargetId !== undefined;
      let spent = false;
      for (const spec of specs) {
        const st = rows.get(spec.id);
        if (!st) continue;
        // (1) THE VENT WINDOW — while it stands nothing burns and nothing
        // knits; when it closes the pool comes back at the authored share.
        if (st.ventUntil > 0) {
          if (t >= st.ventUntil) {
            st.ventUntil = 0;
            st.cur = Math.min(st.max, st.max * (spec.vent?.refill ?? RESERVE_CFG.ventRefill));
          }
        } else {
          // (2) THE BURN. Passive drain on its gate, plus the travel leak
          // — displacement is displacement (the body-wake law), so a
          // shoved leaker pays exactly like a fleeing one.
          if (spec.drain) {
            const moving = a.vel !== undefined
              ? (a.vel.x * a.vel.x + a.vel.y * a.vel.y) > 1
              : moved > 0.5;
            if (drainHolds(spec, { aggroed: engaged, moving })) {
              st.cur = Math.max(0, st.cur - spec.drain * dt);
            }
          }
          if (spec.drainPerUnit && moved > 0) {
            st.cur = Math.max(0, st.cur - spec.drainPerUnit * moved);
          }
          // (3) THE RECOVERY — gated on the quiet clock the player denies.
          if (regenHolds(spec, st, t, { aggroed: engaged })) {
            st.cur = Math.min(st.max, st.cur + spec.regen! * dt);
          }
          // (4) EMPTY OPENS THE WINDOW. A body with no authored vent just
          // floors at zero (a pure cast gate — a legitimate row).
          if (st.cur <= 0 && spec.vent) nativeHost.openVent(a, spec, st);
        }
        // (5) THE BANDS — one status per row, refreshed while its band
        // holds, dropped the moment it does not. Statuses carry the mods,
        // so a whole power curve is ordinary status data.
        const frac = reserveFrac(st);
        const want = stageAt(spec, frac);
        if (want?.status !== st.stage) {
          if (st.stage) a.endStatus(st.stage);
          st.stage = want?.status;
          const reserveCues = want ? reserveStageCue(want) : undefined;
          if (reserveCues) nativeHost.flashes.push(combatCueFlash(a.pos, reserveCues,
            a.radius + RESERVE_CUE_CFG.stagePad, a.facing, want?.color));
        }
        if (st.stage) nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(st.stage!, 0, 1, 'its own burning'));
        // (6) THE PIPS — integer fuel published to the sheet (the quanta
        // law); the setter only re-folds when an integer actually moved.
        const pips = pipsOf(st.cur);
        if (pips !== st.pips) st.pips = pips;
        if (reserveSpent(spec, st, t)) spent = true;
      }
      if (spent !== a.spent) a.spent = spent;
    }
  }

export function sceneUpdatePack(nativeHost:NativeSceneFrameHost): void {
    // SOVEREIGNTY: census — pack bookkeeping (the derived census, probe_tiers RIG T).
    const t = nativeHost.time;
    if (t < nativeHost.packNextAt) return;
    nativeHost.packNextAt = t + PACK_CFG.sweepSec;
    // (1) THE COURT. Clear then tally — a warden whose court died this
    // frame must read zero, not a stale six.
    for (const a of nativeHost.actors) if (a.wardCount) a.wardCount = 0;
    for (const a of nativeHost.actors) {
      if (a.dead || !a.bondHeld) continue;
      const h = a.bondFrom;
      if (h && !h.dead) h.wardCount++;
    }
    // (2) THE SQUAD. Bucket the living by squad id, fold each once, then
    // hand every member the SAME aggregate object.
    let squads: Map<number, Actor[]> | null = null;
    for (const a of nativeHost.actors) {
      if (a.dead || a.squadId === undefined) { a.packAgg = undefined; continue; }
      (squads ??= new Map());
      const cur = squads.get(a.squadId);
      if (cur) cur.push(a); else squads.set(a.squadId, [a]);
    }
    if (squads) {
      for (const members of squads.values()) {
        // Reuse the first member's existing aggregate as the fold target —
        // the no-churn law: a steady squad rebuilds no objects and its
        // drive map keeps its identity across sweeps.
        const agg = foldPack(members, members[0].packAgg);
        for (const m of members) m.packAgg = agg;
      }
    }
    // (3) THE WARD, both halves in ONE pass. For each warded body: its
    // guardian proximity (wardNear, the same envelope wardStep flees along).
    // For each GUARDIAN: how many wards are huddled at it (broodNear) — so
    // a matriarch can act on standing over her young instead of the design
    // merely asserting she does. Sampled on the sweep's cadence, which is
    // the cadence every tell reads at, so huddle and drawn read agree.
    for (const a of nativeHost.actors) if (a.broodNear) a.broodNear = 0;
    for (const a of nativeHost.actors) {
      if (a.dead || !a.defId) continue;
      const ward = MONSTERS[a.defId]?.brain?.morale?.wardTo
        ?? (a.brain?.morale?.wardTo);
      if (!ward) { if (a.wardNear) a.wardNear = 0; continue; }
      const reach = ward.seek ?? PACK_CFG.ward.seek;
      let bd = Infinity;
      let best: Actor | undefined;
      for (const o of nativeHost.actors) {
        if (o === a || o.dead || o.team !== a.team) continue;
        if (o.defId !== ward.kin && o.tag !== ward.kin && o.faction !== ward.kin) continue;
        const d = dist(a.pos, o.pos);
        if (d < bd) { bd = d; best = o; }
      }
      // 1 while GATHERED (inside the huddle band), easing to 0 at the
      // search reach. Both halves key on this ONE threshold, so a
      // matriarch can never read "no young" while a young beside her reads
      // "guarded" — the failure the probe caught when the two used
      // different rings.
      const huddle = Math.max(
        PACK_CFG.ward.huddleRadius, (best?.radius ?? 0) * PACK_CFG.ward.huddleMul);
      a.wardNear = !best ? 0
        : bd <= huddle ? 1
        : Math.max(0, Math.min(1, 1 - (bd - huddle) / Math.max(1, reach - huddle)));
      if (best && bd <= huddle) best.broodNear++;
    }
  }

export function sceneUpdateTells(nativeHost:NativeSceneFrameHost): void {
    const t = nativeHost.time;
    for (const a of nativeHost.actors) {
      const specs = a.tellSpecs;
      if (!specs || a.dead || t < a.tellNextAt) continue;
      a.tellNextAt = t + TELL_CFG.sweepSec;
      let vals = a.tells;
      if (!vals || vals.length !== specs.length) {
        vals = a.tells = new Array<number>(specs.length).fill(0);
        a.tellRev++;
      }
      for (let i = 0; i < specs.length; i++) {
        const v = resolveTell(specs[i], a, nativeHost);
        if (v !== vals[i]) { vals[i] = v; a.tellRev++; }
      }
    }
  }

export function sceneApplyCouchConfine(nativeHost:NativeSceneFrameHost): void {
    const r = nativeHost.couchConfine;
    if (!r) return;
    for (const s of nativeHost.frameSeats()) {
      if (!s.couch && s !== nativeHost.localSeat) continue;
      const a = s.actor;
      if (a.dead || a.heldBy) continue;
      a.pos.x = Math.max(r.x, Math.min(r.x + r.w, a.pos.x));
      a.pos.y = Math.max(r.y, Math.min(r.y + r.h, a.pos.y));
    }
  }

export function sceneUpdateEmergences(nativeHost:NativeSceneFrameHost, dt: number): void {
    for (let i = nativeHost.emergences.length - 1; i >= 0; i--) {
      const r = nativeHost.emergences[i];
      r.life -= dt;
      if (r.life > 0) continue;
      nativeHost.emergences.splice(i, 1);
      if (!r.held) continue;
      const a = nativeHost.actorById(r.actorId);
      if (!a) continue;
      a.untargetable = a.emergeHeldTargetable ?? false;
      a.emergeHeldTargetable = undefined;
      a.emergeUntil = undefined;
    }
  }

export function sceneVeilIndex(nativeHost:NativeSceneFrameHost): VeilIndex {
    const rev = nativeHost.doodadFamilyRev('veil');
    if (!nativeHost.veilIdx || nativeHost.veilIdxArr !== nativeHost.doodads
      || nativeHost.veilIdxLen !== nativeHost.doodads.length || nativeHost.veilIdxRev !== rev) {
      // Unrelated dress can change list length or the broad revision.
      // Preserve baked roofs unless the actual crown inputs changed.
      if (!nativeHost.veilIdx?.matches(nativeHost.doodads)) nativeHost.veilIdx = new VeilIndex(nativeHost.doodads);
      nativeHost.veilIdxArr = nativeHost.doodads;
      nativeHost.veilIdxLen = nativeHost.doodads.length;
      nativeHost.veilIdxRev = rev;
    }
    return nativeHost.veilIdx;
  }

export function sceneDouseSweep(nativeHost:NativeSceneFrameHost, a: Actor, dt: number, drained: Set<string>): void {
    const row = nativeHost.douseRowAt(a);
    let meterQuench = false;
    if (row) {
      for (const id of row.statuses) {
        const m = survivalBandMeter(id);
        if (m && (a.survival?.get(m.id) ?? 0) > 0) {
          // The douse lane OWNS a held banded meter's whole recovery (every
          // frame, not just beat frames): relief is the beat's one-unit
          // cadence EXACTLY — the hold stamp parks the fabric's baseline
          // decay so nothing double-moves the meter.
          drained.add(m.id);
          (a.survivalHeldAt ??= {})[m.id] = nativeHost.time;
          meterQuench = true;
        }
      }
    }
    const quenchable = !!row && (meterQuench || a.statuses.some(s => row.statuses.includes(s.id)));
    if (!row || !quenchable) {
      nativeHost.douseTimers.delete(a.id);
      return;
    }
    const t = (nativeHost.douseTimers.get(a.id) ?? 0) + dt;
    if (t < (row.every ?? DOUSE_CFG.every)) { nativeHost.douseTimers.set(a.id, t); return; }
    nativeHost.douseTimers.set(a.id, 0);
    let lifted = false;
    const bled = new Set<string>();
    for (const id of row.statuses) {
      const meter = survivalBandMeter(id);
      if (meter && a.survival?.get(meter.id) !== undefined) {
        if (bled.has(meter.id)) continue; // one unit per beat per METER
        bled.add(meter.id);
        const cur = a.survival.get(meter.id)!;
        const v = Math.max(0, cur - 1);
        if (v <= 0) {
          a.survival.delete(meter.id);
          if (cur > 0) lifted = true; // the final quench — the old last-stack float
          // The whole-unit jump can cross from ≥1 straight to retirement,
          // skipping the sub-1 read the carriers sweep clears bands from —
          // clear the worn bands NOW (idempotent, the one writer).
          nativeHost.syncSurvivalBands(a, meter, 0);
        } else {
          a.survival.set(meter.id, v);
        }
        drained.add(meter.id); // this frame's baseline decay stands down
        continue;
      }
      const st = a.statuses.find(x => x.id === id);
      if (!st) continue;
      nativeHost.shedStatusStack(a, st);
      if (!a.statuses.includes(st)) lifted = true;
    }
    if (lifted && row.text) {
      nativeHost.text(vec(a.pos.x, a.pos.y - a.radius - 6), row.text, row.color ?? DOUSE_CFG.color, 12);
    }
  }

export function sceneRegenSurvival(nativeHost:NativeSceneFrameHost, a: Actor, drained: Set<string>, dt: number): void {
    if (!a.survival) return;
    for (const [res, val] of a.survival) {
      if (drained.has(res)) continue;
      const held = a.survivalHeldAt?.[res];
      if (held !== undefined && nativeHost.time - held < 0.12) continue;
      const sd = survivalResource(res);
      if (!sd) continue;
      // FILL rows recover toward EMPTY, and their OWN fabric runs that
      // decay (the scorch bar: updateScorch's carriers sweep — which runs
      // even where this sweep's grounds early-out stands down). Regen
      // toward max would be poison for a fill meter; skip outright.
      if (sd.polarity === 'fill') continue;
      if (val < sd.max) a.survival.set(res, Math.min(sd.max, val + sd.regen * dt));
    }
  }

export function sceneApplyRegionEffects(nativeHost:NativeSceneFrameHost, a: Actor, kindId: string, deep: boolean, entered: boolean, dt: number, drained: Set<string>): void {
    const def = regionKind(kindId);
    if (!def) return;
    // GROUND IMMUNITY (groundInsured — THE one predicate, shared with the
    // wayfaring fabric's travel pricing so what can't hurt a body is never
    // detoured around): a body whose habitat IS this ground, or whose def
    // lists it in immuneGround, ignores the region OUTRIGHT — statuses,
    // enter effects, drains and damage alike (the magma lurker is not
    // mired in its own melt). FLIERS skip ground regions wholesale: an
    // airborne body is not IN the bog, the water, or the lava it crosses.
    if (nativeHost.groundInsured(a, kindId)) return;
    // Per-tick standing status (depth-aware variant for water).
    const src = def.label ?? kindId;
    const stand = deep && def.standStatusDeep ? def.standStatusDeep : def.standStatus;
    if (stand) nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(stand, 0, 1, src));
    // Once-on-enter status + text (bog poison, tentacle stun) — order matches the
    // old switch (stand, then enter) so behaviour is byte-identical.
    if (entered) {
      const es = def.enterStatus;
      if (es) nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(es.id, (es.amount ?? 0) + (es.amountPerLevel ?? 0) * nativeHost.levelAt(a.pos), es.duration, src));
      if (def.enterText) nativeHost.text(a.pos, def.enterText.text, def.enterText.color, 11);
      def.onEnter?.(a, nativeHost);
    }
    // TERRAIN DAMAGE (RegionKind.standDamage — lava): typed dps through
    // RESISTANCE only (terrain doesn't swing; capping the res is the build
    // answer). The insured never reach here — the head of this function
    // already excused fliers, habitat-matched bodies and immuneGround.
    if (def.standDamage && !a.invulnerable) {
      const sd = def.standDamage;
      const res = resistValue(a, sd.type);
      const dmg = (sd.dps + (sd.dpsPerLevel ?? 0) * nativeHost.levelAt(a.pos)) * (1 - res) * dt;
      if (dmg > 0) {
        a.life -= dmg;
        if (chance(dt * 2.5)) { a.hitFlash = 0.12; a.hitFlashType = sd.type; }
        if (a.life <= 0 && !a.dead) nativeHost.kill(a);
      }
    }
    // Environmental-survival drain (deep_water → breath); empty → drown. Only the
    // player seats breathe — the creatures that dwell in the depths are adapted to it.
    // A FILL-polarity resource routes to the mirror: the row's `drain` FEEDS
    // the meter toward its bad end (the seam a sulphur-shallows row will
    // wear — no shipped row uses it yet).
    if (def.survival && nativeHost.seatOf(a) && !nativeHost.inGrantedRefuge(a, def.survival.resource)) {
      drained.add(def.survival.resource);
      if (survivalResource(def.survival.resource)?.polarity === 'fill') {
        nativeHost.feedSurvival(a, def.survival.resource, def.survival.drain * dt);
      } else {
        nativeHost.drainSurvival(a, def.survival.resource, def.survival.drain, dt);
      }
    }
    def.onStand?.(a, nativeHost, dt);
  }

export function sceneIsShaded(nativeHost:NativeSceneFrameHost, a: Actor): boolean {
    if (dayCycle(nativeHost.time).phase === 'night') return true;
    for (const d of nativeHost.doodadsAt(a.pos.x, a.pos.y)) {
      if (doodadRuleOf(d.kind).occlude && dist(a.pos, d.pos) <= d.radius) return true;
    }
    return nativeHost.underRoofAt(a.pos);
  }

export function sceneDouseRowAt(nativeHost:NativeSceneFrameHost, a: Actor): DouseSpec | undefined {
    if (a.groundKind) {
      const row = regionKind(a.groundKind)?.douses;
      if (row && !nativeHost.groundInsured(a, a.groundKind)) return row;
    }
    if (a.gridRegion) {
      const row = regionKind(a.gridRegion)?.douses;
      if (row && !nativeHost.groundInsured(a, a.gridRegion)) return row;
    }
    return undefined;
  }

export function sceneFeedSurvival(nativeHost:NativeSceneFrameHost, a: Actor, resource: string, amount: number): void {
    const def = survivalResource(resource);
    if (!def || amount <= 0) return;
    if (!a.survival) a.survival = new Map();
    const v = Math.min(def.max, (a.survival.get(resource) ?? 0) + nativeHost.survivalDrainRate(a, resource, amount));
    a.survival.set(resource, v);
    (a.survivalHeldAt ??= {})[resource] = nativeHost.time;
  }

export function sceneSyncSurvivalBands(nativeHost:NativeSceneFrameHost, a: Actor, def: SurvivalResourceDef, v: number): void {
    for (const band of def.bands ?? []) {
      const sdef = STATUS_DEFS[band.status];
      if (!sdef) continue;
      const existing = a.statuses.find(x => x.id === band.status);
      let want: number;
      if (band.stacksPerUnit) {
        const cap = sdef.maxStacks ?? 99;
        // Foreign stacks = anything above THE BAND WATERMARK (what the sync
        // itself last wrote — ActiveStatus.bandStacks): those climb the bar.
        // Stacks the bar granted and is now bleeding back down are the
        // watermark's own and absorb nothing (the shade-shed regression).
        const surplus = existing ? existing.stacks - (existing.bandStacks ?? 0) : 0;
        if (surplus > 0) {
          v = Math.min(def.max, v + surplus);
          a.survival!.set(def.id, v);
        }
        want = v >= band.from - 1e-6 ? Math.min(cap, Math.floor(v + 1e-6)) : 0;
      } else {
        want = v >= band.from - 1e-6 ? 1 : 0;
      }
      if (want <= 0) {
        if (existing) {
          a.statuses.splice(a.statuses.indexOf(existing), 1);
          a.sheet.removeSource('status:' + band.status);
        }
        continue;
      }
      if (!existing) {
        a.statuses.push({ id: band.status, remaining: 2.5, total: 2.5, stacks: want, dps: 0, sourceName: def.label, bandStacks: want });
        nativeHost.syncBandSheet(a, band.status, want, 1);
      } else {
        if (existing.stacks !== want) {
          existing.stacks = want;
          nativeHost.syncBandSheet(a, band.status, want, existing.power ?? 1);
        }
        existing.bandStacks = want;
        // The world owns the clock while the band is worn (the def duration
        // is only a safety TTL for stacks earned some other way).
        existing.remaining = Math.max(existing.remaining, 2.5);
      }
    }
  }

export function sceneLocalZoneAt(nativeHost:NativeSceneFrameHost, pos: Vec2): ZoneDef {
    const town = nativeHost.massRuntime?.settlement;
    return town?.contains(pos.x, pos.y) ? town.zone
      : nativeHost.massRuntime?.nativeFeatures?.contextAt(nativeHost.massRuntime.walk.at(pos.x,pos.y))
        ?? nativeHost.massRuntime?.geography?.contextAt(nativeHost.massRuntime.walk.at(pos.x,pos.y)) ?? nativeHost.zone;
  }

export function sceneShedStatusStack(nativeHost:NativeSceneFrameHost, a: Actor, st: ActiveStatus): void {
    st.stacks--;
    const def = STATUS_DEFS[st.id];
    if (st.stacks <= 0) {
      a.statuses.splice(a.statuses.indexOf(st), 1);
      a.sheet.removeSource(`status:${st.id}`);
    } else if (def?.mods) {
      a.sheet.setSource(`status:${st.id}`,
        def.mods.map(m => ({ ...m, value: m.value * (def.modsPerStack ? st.stacks : 1) })));
    }
  }

export function sceneUpdateCreepRiders(nativeHost:NativeSceneFrameHost): void {
    // SOVEREIGNTY: self — riders mounted on their own crest (the derived census, probe_tiers RIG T).
    const field = nativeHost.creep;
    if (!field) return;
    const rd = CREEP_CFG.front.rider;
    for (const s of field.sources) {
      const run = s.front;
      if (!run?.riderPlan || run.ridersMounted || s.state === 'recede') continue;
      run.ridersMounted = true;
      for (const seat of run.riderPlan) {
        if (nativeHost.frontRiders >= rd.max) break;
        const at = crestPoint(s, seat.ang, rd.seatFrac);
        const m = nativeHost.createMonster(seat.monster, Math.max(1, nativeHost.zone.level), 'enemy');
        m.pos = nativeHost.clampPos(vec(at.x, at.y), m.radius);
        m.surf = { src: s, ang: seat.ang };
        { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
        nativeHost.frontRiders++;
      }
    }
    for (const a of nativeHost.actors) {
      const surf = a.surf;
      if (!surf) continue;
      const s = surf.src;
      const pushSpeed = a.push ? Math.hypot(a.push.vx, a.push.vy) : 0;
      if (a.dead || s.cur < CREEP_CFG.minReach || s.state === 'recede'
        || !field.sources.includes(s) || a.isStunned() || a.heldBy !== undefined
        || pushSpeed >= rd.dismountPush) {
        delete a.surf;
        continue;
      }
      const at = crestPoint(s, surf.ang, rd.seatFrac);
      let px = at.x, py = at.y;
      if (nativeHost.walk && !nativeHost.walk.isWalkable(px, py)) {
        // Pull the seat in toward the heart until it finds open ground —
        // f 0 is the heart itself, the honest degraded seat while a crest
        // rides hard against stone (steering keeps the heart open).
        let found = false;
        for (const f of [0.72, 0.46, 0.2, 0]) {
          const qx = s.pos.x + (at.x - s.pos.x) * f;
          const qy = s.pos.y + (at.y - s.pos.y) * f;
          if (nativeHost.walk.isWalkable(qx, qy)) { px = qx; py = qy; found = true; break; }
        }
        if (!found) {
          // Not even the heart is open this tick: hold position — and if
          // the wave has genuinely LEFT the rider behind, the mount is
          // over (the divorce clause: a stranded body must never trail a
          // departed wave on an invisible tether — live-QA caught a
          // rim-hugging bore towing a corpuscle 600u back).
          if (Math.hypot(a.pos.x - s.pos.x, a.pos.y - s.pos.y) > s.bound * 1.35) delete a.surf;
          continue;
        }
      }
      a.pos = nativeHost.clampPos(vec(px, py), a.radius, a.pos);
      nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(rd.mountStatus, 0, 1, 'the surge'));
    }
  }

export function sceneGroundFallEligible(nativeHost:NativeSceneFrameHost): Actor[] {
    const eligible: Actor[] = [];
    for (const a of nativeHost.actors) {
      if (a.dead || a.flying || nativeHost.levitating(a) || a.leap || a.dash || a.caromRun) continue;
      if (a.tier !== 0) continue; // the ground dissolves under GROUND feet (the sovereignty gate)
      if (a === nativeHost.player && (nativeHost.traversal || nativeHost.pendingRespawn)) continue;
      eligible.push(a);
    }
    return eligible;
  }

export function sceneWakeBodies(nativeHost:NativeSceneFrameHost): Actor[] {
    const bodies: Actor[] = nativeHost.isPresentLocalPlayer() ? [nativeHost.player] : [];
    for (const s of nativeHost.frameSeats()) if (!s.actor.dead) bodies.push(s.actor);
    return bodies;
  }

export function sceneSweepHazardSurface(nativeHost:NativeSceneFrameHost, 
    x: number, y: number, shape: HitShape, laneDir: number,
    payload: TrackPayload, gate: Map<number, number>, owner: Actor | undefined,
    bodies: Actor[], strikeTier?: number,
  ): void {
    for (const a of bodies) {
      if (a.dead || a.downed || a.untargetable || a.invulnerable || a.passive) continue;
      // LAYER SOVEREIGNTY (static contact doodads pass their own story): a
      // surface bumper bumps no root-duct runner beneath its footprint.
      // Track riders pass nothing — lanes carry no story today, and no
      // tiered zone runs tracks (the glacial heart is flat country).
      if (strikeTier !== undefined && a.tier !== strikeTier) continue;
      if (payload.sparesDormant !== false && isDormant(a)) continue;
      if (payload.sparesAirborne !== false && (a.flying || a.leap)) continue;
      if (payload.factions && (!a.faction || !payload.factions.includes(a.faction))) continue;
      if (payload.notFactions && a.faction && payload.notFactions.includes(a.faction)) continue;
      if ((gate.get(a.id) ?? -Infinity) > nativeHost.time) continue;
      if (!shapeContains(shape, x, y, a.pos.x, a.pos.y, a.radius)) continue;
      // SPEED-GATED rows (TrackPayload.minSpeed — the impale stakes): only
      // a body ARRIVING at push-speed feels them; a careful walker picks
      // through untouched, and no ICD is burned on the stroll.
      if (payload.minSpeed
        && Math.hypot(a.push?.vx ?? 0, a.push?.vy ?? 0) < payload.minSpeed) continue;
      gate.set(a.id, nativeHost.time + (payload.icdSec ?? TRACK_CFG.icdSec));
      if (payload.hit) {
        const dmg = payload.hit.base + (payload.hit.perLevel ?? 0) * Math.max(1, nativeHost.zone.level);
        const out: { clamped?: boolean } = {};
        const taken = mitigateTyped(a, { [payload.hit.type]: dmg }, { out });
        a.life -= taken;
        a.hitFlash = 0.15;
        a.hitFlashType = payload.hit.type;
        nativeHost.text(a.pos, Math.round(taken).toString(), DAMAGE_COLOR[payload.hit.type], 14);
        if (out.clamped) nativeHost.showCombatOutcome(a, 'hit_cap', { x, y });
        if (a.life <= 0 && !a.dead) nativeHost.kill(a, false, owner);
      }
      if (payload.status && !a.dead && Math.random() < (payload.status.chance ?? 1)) {
        nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(payload.status!.id, 0, 1, 'the hazard'));
      }
      if (payload.impulse && !a.dead) {
        // The shove's grain (TrackPayload.push): 'along' rides the lane's
        // travel direction at the contact pose — the sweeper arm CARRIES
        // bodies around its route; 'radial' (default) flings from the
        // surface center — the boulder bowls, the bumper launches.
        let dir: number;
        if (payload.push === 'along') {
          dir = laneDir;
        } else {
          const dx = a.pos.x - x, dy = a.pos.y - y;
          dir = Math.hypot(dx, dy) > 1e-3 ? Math.atan2(dy, dx) : laneDir;
        }
        nativeHost.pushActor(a, dir, payload.impulse, owner);
      }
    }
    // Opportunistic gate hygiene — expired entries never accumulate past a
    // zone's population.
    if (gate.size > 96) {
      for (const [id, until] of gate) if (until < nativeHost.time) gate.delete(id);
    }
  }

export function sceneGeyserBurstFx(nativeHost:NativeSceneFrameHost, v: PlacedVent, ventIdx: number, k: number, surge = false): void {
    const cls = GEYSER_CFG.classes[v.cls];
    nativeHost.flashes.push({
      pos: vec(v.pos.x, v.pos.y), radius: cls.columnR * 1.25,
      color: '#dff6fb', life: 0.35, maxLife: 0.35,
    });
    if (v.cls !== 'hiss') nativeHost.shake = Math.max(nativeHost.shake, Math.min(2.2, cls.columnR * 0.02));
    // THE DOWNSTREAM (charter §4, card 2 — resolved per vent at seat time):
    // spectacle is unconditional; on a vent that RAINS the comets LAND as
    // teeth (burnRain — each lob zone draws its own comet, so the hashed
    // render fan stands down there: one drawn word, one landing); the
    // runoff pours from the spill side. Everything else keeps M0's
    // render-only fan + drying pocks.
    const ds = ventDownstream(v);
    if (ds.rain) {
      // THE SURGE HOUR: great vents rain MORE on tide beats (rainMul).
      nativeHost.burnRain(v, ventIdx, k, surge ? GEYSER_CFG.surge.rainMul : 1);
    } else {
      for (const c of cometFanOf(v, ventIdx, k)) {
        nativeHost.geyserPocks.push({ at: nativeHost.time + GEYSER_CFG.rainDelay, x: c.x, y: c.y });
      }
    }
    if (ds.runoff) nativeHost.pourRunoff(v);
  }

export function sceneScorchFeed(nativeHost:NativeSceneFrameHost, a: Actor, units: number): void {
    nativeHost.feedSurvival(a, 'scorch', units);
  }

export function sceneUpdateBask(nativeHost:NativeSceneFrameHost, a: Actor, bask: BaskSpec, dt: number): void {
    let bar = nativeHost.scorchOf(a);
    if (bask.quench && bar > 0 && a.statuses.some(s => s.id === bask.quench!.status)) {
      bar = Math.max(0, bar - bask.quench.perSec * dt);
      if (bar <= 0) a.survival?.delete('scorch'); else a.survival!.set('scorch', bar);
    }
    const warmNow = a.statuses.some(s => s.id === bask.warmStatus);
    const wantWarm = warmNow ? bar > bask.coolAt : bar >= bask.warmAt;
    const wear = wantWarm ? bask.warmStatus : bask.coolStatus;
    const shed = wantWarm ? bask.coolStatus : bask.warmStatus;
    const old = a.statuses.find(s => s.id === shed);
    if (old) {
      a.statuses.splice(a.statuses.indexOf(old), 1);
      a.sheet.removeSource('status:' + shed);
    }
    const cur = a.statuses.find(s => s.id === wear);
    if (!cur) {
      if (!STATUS_DEFS[wear]) return;
      a.statuses.push({ id: wear, remaining: SCALD_CFG.baskTtl, total: SCALD_CFG.baskTtl, stacks: 1, dps: 0, sourceName: 'basking' });
      nativeHost.syncBandSheet(a, wear, 1, 1);
    } else {
      cur.remaining = Math.max(cur.remaining, SCALD_CFG.baskTtl);
    }
  }

export function sceneScorchOf(nativeHost:NativeSceneFrameHost, a: Actor): number {
    return a.survival?.get('scorch') ?? 0;
  }

export function sceneSpringTrapwork(nativeHost:NativeSceneFrameHost, tw: PlacedTrapwork, presser?: Actor): void {
    if (tw.state !== 'armed') return;
    tw.state = 'sprung';
    tw.sprungAt = nativeHost.time;
    tw.springs++;
    tw.rearmAt = tw.spec.rearm && tw.spec.rearm > 0 ? nativeHost.time + tw.spec.rearm : Infinity;
    const at = trapAnchor(tw.spec.trigger);
    const color = tw.spec.color ?? TRAPWORK_CFG.springColor;
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 30, color, life: 0.4, maxLife: 0.4 });
    nativeHost.text(vec(at.x, at.y - 16), tw.spec.announce ?? 'click —', '#d8c8a0', 12);
    // THE HARD LESSON (discovery web): the LOCAL hero pressing a trigger with
    // their own feet teaches the account what a plate is — unlocks.ts gates
    // read the tally (the Trapper's rumor resolves). A baited pack springing
    // it teaches nothing: the lesson is in the misstep, not the spectacle.
    if (presser === nativeHost.player) bumpLedger(nativeHost.ledger, LEDGER_TRAP_SPRUNG);
    const host = nativeHost.trapHost();
    for (const row of tw.spec.effects) {
      trapEffect(row.kind)?.spring(host, tw, row, presser?.id);
    }
  }

export function sceneFireStrikeAt(nativeHost:NativeSceneFrameHost, strike: { skillId: string; radius: number; telegraph: number; throughRoofs?: boolean; fx?: string }, at: Vec2, encounterLevel?: number): void {
    const skill = SKILLS[strike.skillId];
    if (!skill) return;
    if (!nativeHost.stormCaster) {
      const c = nativeHost.constructCombatSource(() => new Actor('Storm', 'player', vec(0, 0)));
      c.untargetable = true;
      c.invulnerable = true;
      nativeHost.stormCaster = c;
    }
    const caster = nativeHost.massRuntime ? nativeHost.constructCombatSource(() => new Actor('Storm', 'player', vec(at.x, at.y))) : nativeHost.stormCaster;
    caster.untargetable = true; caster.invulnerable = true;
    const level = encounterLevel ?? nativeHost.levelAt(at);
    caster.level = Math.max(1, level);
    caster.pos = vec(at.x, at.y); // so a raised guard can still block it fairly
    // Placed fields supply encounterLevel; sky hazards read impact geography.
    const inst = makeSkillInstance(skill, 1 + Math.floor(level / 3));
    {
let nativeStorage:typeof nativeHost.zones;
let nativeRecord:typeof nativeHost.zones[number];
let nativeRecordSource:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[3];
let nativeRecordInstance:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
      pos: vec(at.x, at.y), radius: strike.radius, caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: skill.color,
      delay: strike.telegraph, exploded: false, linger: 0,
      tickInterval: 0, tickTimer: 0, shape: 0, facing: 0,
      dmgMult: 1, depth: 1, hitAll: true, spareDormant: true,
      spareRoofed: !strike.throughRoofs,
      // THE EFFECT VOICE (WeatherStrike.fx): a non-lightning sky names its
      // landing; unset keeps the classic derived bolt — storm lightning
      // and the altar's own bolts never need a key.
      fx: strike.fx,
    });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
  }

export function sceneChestObjectiveDone(nativeHost:NativeSceneFrameHost, c: Chest): boolean {
    return c.massObjectiveOwner ? !!nativeHost.massRuntime?.geography?.chestReady(c) : nativeHost.objectiveDone;
  }

export function sceneOpenChest(nativeHost:NativeSceneFrameHost, c: Chest): void {
    if (c.opened || c.massObjectiveOwner && !nativeHost.chestObjectiveDone(c)) return;
    c.opened = true;
    c.openedAt = nativeHost.time; // M-SPILL: the lid swings (the renderer's own clock read)
    if(c.massObjectiveOwner)nativeHost.massRuntime?.geography?.chestOpened(c,nativeHost.time);
    const rewardLevel = c.rewardLevel ?? nativeHost.levelAt(c.pos);
    const d0 = nativeHost.drops.length; // THE OWNER STAMP (card 27): the chest's pay is its opener's
    nativeHost.withMassReward(rewardLevel, () => {
      const memoryProvenance = 'chest'; // Durable cache identity stays on the chest; Memories name their registered source.
      const lootZone = nativeHost.massRuntime?.geography?.chestContext(c)
        ?? (c.rewardLevel === undefined && !nativeHost.massRuntime ? nativeHost.zone : { ...nativeHost.zone, level: rewardLevel });
      if (!nativeHost.spoilsSealed()) {
        for (const result of resolveLootTable(selectContainerLoot('chest', lootZone), { ilvl: rewardLevel, sourceId: memoryProvenance })) {
          nativeHost.mintLootResult(c.pos, result, false, memoryProvenance); // THE MEMORY LAW: the chest is the provenance
        }
      }
      // THE THEMED CACHE (Chest.rarity — a tinted toll's promise): one rolled
      // GEAR piece at exactly that rarity, on top of the ordinary container pay.
      // Spoils-sealed ground still seals it (dropGearAt rides the same law).
      if (c.rarity) {
        const item = rollItem({ ilvl: Math.max(1, rewardLevel), rarityWeights: { [c.rarity]: 1 } });
        if (item) {
          nativeHost.dropGearAt(vec(c.pos.x, c.pos.y + 8), item); // the glyph's own rarity color is the read (M-SPILL: no caption)
        }
      }
      for (let i = 0; i < 2; i++) {
        nativeHost.shedOrb(chance(0.5) ? 'life' : 'mana', c.pos, { scatter: 22, life: 14 });
      }
    });
    if (nativeHost.dropRuleOf) nativeHost.ownSpoils(d0, nativeHost.chestOpener(c));
    nativeHost.flashes.push({ pos: vec(c.pos.x, c.pos.y), radius: 50, color: '#e8c87a', life: 0.4, maxLife: 0.4, fx: 'sparkle' }); // M-SPILL: the lid + the glints, no caption
  }

export function sceneCreepPumpBearing(nativeHost:NativeSceneFrameHost, a: Actor, mode: 'toward' | 'away' | 'random'): number {
    if (mode !== 'random') {
      let best: Actor | null = null, bd = Infinity;
      for (const o of nativeHost.actors) {
        if (o === a || o.dead || isDormant(o) || !nativeHost.hostileTo(a, o)) continue;
        const d2 = (o.pos.x - a.pos.x) ** 2 + (o.pos.y - a.pos.y) ** 2;
        if (d2 < bd) { bd = d2; best = o; }
      }
      if (best) {
        const at = angleTo(a.pos, best.pos);
        return mode === 'toward' ? at : at + Math.PI;
      }
    }
    return rand(0, Math.PI * 2);
  }

export function sceneTetherSees(nativeHost:NativeSceneFrameHost, t: Tether, victim: Actor, bp: Vec2, seg: number): boolean {
    t.phase ??= nativeHost.tetherOcclusion(t) === 'free';
    if (t.phase) return true;
    if (victim === t.a || victim === t.b) return true;
    const memo = (t.los ??= new Map());
    const key = victim.id * 128 + seg + 1;
    const seen = memo.get(key);
    if (seen && seen.until > nativeHost.time) return seen.ok;
    const ok = nativeHost.lineOfFire(vec(t.ax, t.ay), bp)
      && nativeHost.lineOfFire(vec(t.bx, t.by), bp);
    if (memo.size > 512) {
      // Oldest-first eviction (Map insertion order), like losCached: never
      // dump the whole cache at once, or a crowd re-marches every ray next
      // frame at exactly the moment frames are dearest.
      let drop = memo.size - 384;
      for (const k of memo.keys()) { memo.delete(k); if (--drop <= 0) break; }
    }
    // DE-SYNCHRONIZED expiry (LOS_CFG.memoJitter, salted by the band's own
    // endpoints): bodies cached in one tick must not all expire in one tick.
    const j = LOS_CFG.memoJitter;
    const salt = key ^ Math.imul(t.a.id * 131 + t.b.id, 0x85EBCA6B);
    memo.set(key, {
      ok,
      until: nativeHost.time + (j > 0
        ? LOS_CFG.memoTtl * (1 - j / 2 + j * ((Math.imul(salt, 0x9E3779B1) >>> 16) / 65536))
        : LOS_CFG.memoTtl),
    });
    return ok;
  }

export function sceneSeatHero(nativeHost:NativeSceneFrameHost, seat: Seat): Actor { return seat.home ?? seat.actor; }

export function sceneBrittleAccrue(nativeHost:NativeSceneFrameHost, d: Doodad, br: BrittleSpec, dt: number, from?: Vec2): void {
    const prev = nativeHost.brittleDwell.get(d);
    if (prev === undefined && br.warn) {
      const last = nativeHost.brittleWarnAt.get(br.warn) ?? -Infinity;
      if (nativeHost.time - last >= (br.warnEvery ?? BRITTLE_WARN_EVERY)) {
        nativeHost.brittleWarnAt.set(br.warn, nativeHost.time);
        nativeHost.text(vec(d.pos.x, d.pos.y - 12), br.warn, br.color ?? '#c8b89a', 11);
      }
    }
    // THE PRE-CRACK ledger (THE DISSOLUTION GRAMMAR): a dwell that starts on
    // a crack-drawing kind remembers WHERE the press began — the drawn crack
    // grows from there (dissolveCrackView), the creak made visible; the
    // ledger's point is also the break's strike point when the clock runs out.
    if (prev === undefined && from && dissolveFor(d.kind)?.preCrack) {
      nativeHost.dissolveCracks.set(d, vec(from.x, from.y));
    }
    const t = (prev ?? 0) + dt;
    if (t >= (br.dwell ?? 0)) {
      nativeHost.brittleDwell.delete(d);
      nativeHost.popBrittle(d, undefined, nativeHost.dissolveCracks.get(d) ?? from ?? null);
    } else nativeHost.brittleDwell.set(d, t);
  }

export function sceneDressSpotOk(nativeHost:NativeSceneFrameHost, x: number, y: number, r: number, solid: boolean): boolean {
    if (nativeHost.walk && !nativeHost.walk.isWalkable(x, y)) return false;
    if (nativeHost.pointInSolid(x, y, r + 8)) return false;
    if (!nativeHost.clearOfDoors(vec(x, y), WEATHER_DRESS_CFG.portalClear)) return false;
    if (nativeHost.isPresentLocalPlayer() && dist(nativeHost.player.pos, vec(x, y)) < WEATHER_DRESS_CFG.playerClear) return false;
    if (solid) {
      const probe = r + WEATHER_DRESS_CFG.solidRingProbe;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        const px = x + Math.cos(a) * probe, py = y + Math.sin(a) * probe;
        if (nativeHost.walk && !nativeHost.walk.isWalkable(px, py)) return false;
        if (nativeHost.pointInSolid(px, py, 10)) return false;
      }
    }
    return true;
  }

export function sceneDropHolder(nativeHost:NativeSceneFrameHost, d: GemDrop): string | undefined {
    if (d.owner === undefined) return undefined;
    if (d.freeAt !== undefined && nativeHost.time >= d.freeAt) return undefined;
    if (nativeHost.dropRuleOf && !nativeHost.dropRuleOf(d.owner)) return undefined;
    return d.owner;
  }

export function scenePickupSeat(nativeHost:NativeSceneFrameHost, at: Vec2, reach: number, exclude?: string, story = 0, holder?: string): Seat | undefined {
    let best: Seat | undefined; let bestD = Infinity;
    for (const s of nativeHost.frameSeats()) {
      if (s.actor.dead || s.actor.downed) continue;
      if (s.keeper) continue;                      // keeperSeat: the warden's hands take nothing
      if (exclude && s.id === exclude) continue;   // dropper can't reclaim yet
      if (holder !== undefined && s.id !== holder) continue; // THE TOUCH LAW (card 27): a held drop is its owner's alone
      if (s.actor.tier !== story) continue;        // THE SAME-STORY LAW: its own story's hands only
      const d = dist(at, s.actor.pos);
      if (d <= s.actor.radius + reach && d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

export function sceneGrantVestige(nativeHost:NativeSceneFrameHost, seat: Seat, id: string, count: number): void {
    const def = VESTIGES[id];
    if (!def || count <= 0) return;
    seat.meta.vestiges[id] = (seat.meta.vestiges[id] ?? 0) + count;
    nativeHost.text(seat.actor.pos, `${def.glyph} ${def.name}${count > 1 ? ` ×${count}` : ''}`, def.color, 13, 'pickup');
    notePickup(nativeHost.pickupFeed, seat.id, `${def.glyph} ${def.name}`, def.color, nativeHost.time, count);
    nativeHost.markMetaDirty(seat);
  }

export function sceneGrantAbilityEssence(nativeHost:NativeSceneFrameHost, seat: Seat, tier: number, count: number): void {
    if (count <= 0) return;
    const def = abilityEssenceOfTier(tier);
    seat.meta.abilityEssences[def.id] = (seat.meta.abilityEssences[def.id] ?? 0) + count;
    nativeHost.text(seat.actor.pos, `+${count} ${def.label}`, def.color, 12, 'gains', 1, true);
    notePickup(nativeHost.pickupFeed, seat.id, def.label, def.color, nativeHost.time, count);
    nativeHost.markMetaDirty(seat);
  }

export function sceneTryMergeMemoryItem(nativeHost:NativeSceneFrameHost, seat: Seat, item: ItemInstance): boolean {
    const kind = memoryKindOf(item);
    if (!kind || !item.mem) return false;
    const pouch = findMemoryItem(seat.meta.items, kind);
    if (!pouch) return false;
    mergeMemory(pouch, item.mem);
    nativeHost.noteMemoryPickup(seat, kind, pouch.mem!.length);
    nativeHost.markMetaDirty(seat);
    return true;
  }

export function sceneNoteMemoryPickup(nativeHost:NativeSceneFrameHost, seat: Seat, kind: MemoryKind, total: number): void {
    const k = MEMORY_KINDS[kind];
    nativeHost.text(seat.actor.pos, `${k.name} (×${total})`, k.color, 13, 'pickup');
    notePickup(nativeHost.pickupFeed, seat.id, `${k.name} (×${total}) · ${k.rewardLabel}`, k.color, nativeHost.time);
  }

export function sceneIsBankedRelicEcho(nativeHost:NativeSceneFrameHost, item: ItemInstance): boolean {
    if (!isRelic(item)) return false;
    const scope = nativeHost.meta.relicScope ?? (nativeHost.meta.charId || 'run:' + nativeHost.manifest.seed);
    return !!item.relicKey || nativeHost.account.reliquary.released.includes('legacy:' + scope + ':' + item.uid)
      || nativeHost.account.reliquary.items.some(i => i.relicKey === 'legacy:' + scope + ':' + item.uid);
  }

export function scenePourOrb(nativeHost:NativeSceneFrameHost, a: Actor, orb: ResourceOrb): void {
    const def = ORB_DEFS[orb.kind];
    if (!def) return;
    const gained: string[] = [];
    if (def.restore && orb.amount > 0) {
      // noEvent: the scoop events ONCE, whole, on the 'orb' channel below —
      // a 'restore' twin here would replay the same gain twice.
      nativeHost.applyRestore(a, {
        resource: def.restore, amount: orb.amount,
        resetEsDelay: def.restore === 'es',
      }, { noEvent: true });
      gained.push(`+${orb.amount} ${def.label}`);
    }
    if (def.charge) {
      const before = a.charges.get(def.charge.charge) ?? 0;
      a.gainCharge(def.charge.charge, def.charge.amount, def.charge.max);
      // Honest text: a scoop at a full bank banks nothing, says nothing.
      if ((a.charges.get(def.charge.charge) ?? 0) > before) {
        gained.push(`+${def.charge.amount} ${def.label}`);
      }
    }
    nativeHost.tapCharges(a, 'orbPickup', undefined, orb.kind);
    nativeHost.refundOnOrb(a, orb.kind);
    if (a.gainEvents.length < 64) {
      a.gainEvents.push({ kind: 'orb', id: orb.kind, depth: 0, n: orb.amount });
    }
    if (gained.length) nativeHost.text(a.pos, gained.join('  '), def.color, 12, 'gains');
    SIM_TAP.current?.onOrbPickup?.(orb.kind, a);
  }

export function sceneGrabSpitDir(nativeHost:NativeSceneFrameHost, a: Actor, v: Actor, t: GrabThrowSpec): number {
    // SOVEREIGNTY: self — the held pair (the derived census, probe_tiers RIG T).
    if (t.spitAt === 'foe') {
      let best: Actor | null = null, bd = 620;
      for (const e of nativeHost.enemiesOf(a)) {
        if (e === v || e.dead || e.untargetable) continue;
        const dd = dist(a.pos, e.pos);
        if (dd < bd) { bd = dd; best = e; }
      }
      if (best) return angleTo(a.pos, best.pos);
    }
    return a.facing;
  }

export function sceneMountPairSpawn(nativeHost:NativeSceneFrameHost, a: Actor): void {
    a.mountPaired = true;
    const def = a.defId ? MONSTERS[a.defId] : undefined;
    if (!def) return;
    const spec = def.mount;
    if (spec && a.mountId === undefined
      && (spec.chance === undefined || rand(0, 1) < spec.chance)) {
      const pool = Array.isArray(spec.on) ? spec.on : [spec.on];
      const steedId = pool[Math.min(pool.length - 1, Math.floor(rand(0, pool.length)))];
      const sd = MONSTERS[steedId];
      if (!sd?.mountSlot) {
        console.warn(`[mounts] '${a.defId}' asks to ride '${steedId}', which has no mountSlot`);
      } else {
        const m = nativeHost.createMonster(steedId, Math.max(1, a.level), a.team, a.owner);
        m.faction = a.faction;
        m.fromZoneGen = false;
        m.mountPaired = true;
        m.pos.x = a.pos.x;
        m.pos.y = a.pos.y;
        m.facing = a.facing;
        // Steed BEFORE rider in the roster: the renderer paints in array
        // order, so the saddle layers under whoever sits it.
        const at = nativeHost.actors.indexOf(a);
        { nativeHost.actors.splice(at < 0 ? nativeHost.actors.length : at, 0, m); nativeHost.admitCombatBirth(m); }
        nativeHost.mountSeatRider(a, m);
        // A steed that also declares crew fills its REMAINING seats — the
        // full howdah, still bounded (crew never pair further).
        nativeHost.mountCrewSpawn(m);
      }
    }
    if (def.mountSlot?.crew) nativeHost.mountCrewSpawn(a);
  }

export function sceneWatchScent(nativeHost:NativeSceneFrameHost, a: Actor, w: WatchSpec, t: number): void {
    const range = w.scent?.range ?? WATCH_CFG.scent.range;
    const maxAge = w.scent?.maxAge ?? WATCH_CFG.scent.maxAge;
    let q = a.watchQuarryId !== undefined ? nativeHost.actorById(a.watchQuarryId) : undefined;
    if (!q || q.dead || !q.trail?.length) {
      q = undefined;
      for (const p of nativeHost.actors) {
        if (p.dead || !p.trail?.length || !nativeHost.hostileTo(a, p)) continue;
        // The cursor doubles as the SNIFFED-OUT floor: only prints fresher
        // than it can hook (a forgotten line never re-hooks off its own
        // stale prints — see the decay-clear below).
        const first = trailNext(p.trail, a.watchTrailT, t, maxAge,
          { x: a.pos.x, y: a.pos.y, range });
        if (first) {
          q = p;
          a.watchQuarryId = p.id;
          // LOCK THE LINE'S DIRECTION at the first catch: the cursor sits
          // just below the caught print, so the nose only ever advances
          // FORWARD through lay order — never the backward drift toward
          // ever-older prints an open cursor allowed.
          a.watchTrailT = Math.max(a.watchTrailT, first.t - 1e-6);
          break;
        }
      }
    }
    if (!q) {
      if (a.watchQuarryId !== undefined
        && watchValueOf(a, w, t) < WATCH_CFG.rungs.stir) {
        a.watchQuarryId = undefined;
        a.watchTrailT = t; // sniffed out: this ground holds nothing new
      }
      return;
    }
    const print = trailNext(q.trail, a.watchTrailT, t, maxAge,
      { x: a.pos.x, y: a.pos.y, range });
    if (!print) {
      // No print in nose range. While suspicion stands, PAD to the last
      // known scent and snuffle there — closing often brings the line back
      // under the nose (the mid-trail dead-band un-sticks itself), and at
      // a true gap it reads as sniffing the waterline. Once the meter
      // drains below the stir rung, FORGET the quarry — the water did
      // its work.
      if (watchValueOf(a, w, t) >= WATCH_CFG.rungs.stir) {
        if (a.watchAt) {
          if (a.alertFrom) { a.alertFrom.x = a.watchAt.x; a.alertFrom.y = a.watchAt.y; }
          else a.alertFrom = vec(a.watchAt.x, a.watchAt.y);
          a.alertTier = a.watchTier;
          a.alertUntil = Math.max(a.alertUntil, t + WATCH_CFG.scent.walkSec);
        }
      } else {
        a.watchQuarryId = undefined;
        a.watchTrailT = t; // sniffed out: only FRESHER prints may re-hook
      }
      return;
    }
    feedWatch(a, w, t, WATCH_CFG.scent.feedPerSec * WATCH_CFG.sweepSec,
      WATCH_CFG.rungs.search);
    if (a.watchAt) { a.watchAt.x = print.x; a.watchAt.y = print.y; }
    else a.watchAt = vec(print.x, print.y);
    // The walk rides the standing investigate machinery — a short rolling
    // window, refreshed while prints keep coming.
    if (a.alertFrom) { a.alertFrom.x = print.x; a.alertFrom.y = print.y; }
    else a.alertFrom = vec(print.x, print.y);
    a.watchTier = print.tier; a.alertTier = print.tier; // the print's story rides the scent
    a.alertUntil = Math.max(a.alertUntil, t + WATCH_CFG.scent.walkSec);
    a.watchRung = Math.max(a.watchRung,
      watchRungOf(watchValueOf(a, w, t)));
    const dx = print.x - a.pos.x, dy = print.y - a.pos.y;
    const arrive = WATCH_CFG.scent.arrive;
    if (dx * dx + dy * dy <= arrive * arrive) a.watchTrailT = print.t;
  }

export function sceneOpenVent(nativeHost:NativeSceneFrameHost, a: Actor, spec: ReserveSpec, st: ReserveState): void {
    const v = spec.vent!;
    st.ventUntil = nativeHost.time + v.forSec;
    st.cur = 0;
    // The window's status runs EXACTLY the window (the possess-eject
    // idiom: durationScale = wanted / the def's own base), so the drawn
    // punish and the refill clock can never drift apart.
    if (v.status) {
      const base = STATUS_DEFS[v.status]?.duration || 1;
      nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(v.status!, 0, v.forSec / base, 'spent'));
    }
    // reserveVent tells wear the actual window; the free-cast below remains
    // the real payload. Legacy note data never creates a combat caption.
    const sd = v.skillId ? SKILLS[v.skillId] : undefined;
    if (sd) {
      const inst = makeSkillInstance(sd, Math.max(1, Math.round(a.level)));
      nativeHost.executeSkill(a, inst, vec(a.pos.x, a.pos.y), {
        noCooldown: true, noRepeat: true, keepFacing: true,
      });
    }
  }

export function sceneLevelAt(nativeHost:NativeSceneFrameHost, pos: Vec2): number { return nativeHost.massRuntime?.levelAt(pos) ?? nativeHost.zone.level; }

export function sceneInGrantedRefuge(nativeHost:NativeSceneFrameHost, a: Actor, resource: string): boolean {
    return Object.values(POCKET_GRANTS).some(def => def.resource === resource
      && a.sheet.get(pocketGrantStat(def.id)) > 0 && nativeHost.insideGrantedPocket(a, def.id));
  }

export function sceneSyncBandSheet(nativeHost:NativeSceneFrameHost, a: Actor, id: string, stacks: number, power: number): void {
    const sdef = STATUS_DEFS[id];
    if (!sdef?.mods) return;
    const mult = (sdef.modsPerStack ? stacks : 1) * power;
    a.sheet.setSource('status:' + id, mult !== 1
      ? sdef.mods.map(m => ({ ...m, value: m.value * mult }))
      : sdef.mods);
  }

export function sceneBurnRain(nativeHost:NativeSceneFrameHost, v: PlacedVent, ventIdx: number, k: number, countMul = 1): void {
    const R = GEYSER_CFG.rain;
    const skill = SKILLS[R.skillId];
    if (!skill) return;
    if (!nativeHost.stormCaster) {
      const c = nativeHost.constructCombatSource(() => new Actor('Storm', 'player', vec(0, 0)));
      c.untargetable = true;
      c.invulnerable = true;
      nativeHost.stormCaster = c;
    }
    const caster = nativeHost.stormCaster;
    caster.level = Math.max(1, nativeHost.zone.level);
    caster.pos = vec(v.pos.x, v.pos.y);
    const inst = makeSkillInstance(skill, 1 + Math.floor(nativeHost.zone.level / 3));
    const apex = vec(v.pos.x, v.pos.y - (GEYSER_CFG.classes[v.cls].columnR * 2.4 + 36));
    for (const c of rainFanOf(v, ventIdx, k, nativeHost.windAt(v.pos), countMul)) {
      const at = nativeHost.clampPos(vec(c.x, c.y), 10);
      {
let nativeStorage:typeof nativeHost.zones;
let nativeRecord:typeof nativeHost.zones[number];
let nativeRecordSource:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[3];
let nativeRecordInstance:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
        pos: at, radius: R.dropletR, caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: skill.color,
        delay: GEYSER_CFG.rainDelay, delay0: GEYSER_CFG.rainDelay, exploded: false, linger: 0,
        tickInterval: 0, tickTimer: 0, shape: 0, facing: 0,
        dmgMult: 1, depth: 1, hitAll: true, spareDormant: true, spareRoofed: true,
        lobFrom: apex, lobArc: 0.4, fx: 'blast',
        impactDress: { kind: 'scald_pock', evapAfter: [R.pockDwell[0], R.pockDwell[1]] },
        onImpact: () => nativeHost.rainScorch(at, R.dropletR),
      });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
    }
  }

export function scenePourRunoff(nativeHost:NativeSceneFrameHost, v: PlacedVent): void {
    const R = GEYSER_CFG.runoff;
    const def = CREEPS[R.kind];
    if (!def?.front) return;
    const field = nativeHost.creepEnsure();
    if (!field) return;
    const off = GEYSER_CFG.mouthR[v.cls] * R.offset;
    const spill = ventSpill(v);
    field.addFront(def, v.pos.x + Math.cos(spill) * off, v.pos.y + Math.sin(spill) * off, spill,
      { reach: rand(R.reach[0], R.reach[1]), bornFrac: 0.5 });
  }

export function sceneTrapHost(nativeHost:NativeSceneFrameHost): TrapHost {
    return {
      time: nativeHost.time,
      tracksEnsure: (specs) => nativeHost.tracksEnsure(specs),
      setTracksArmed: (tag, armed) => nativeHost.setTracksArmed(tag, armed),
      laneArmed: (tag) => nativeHost.tracks.some(tr => tr.spec.tag === tag && tr.armed),
      // The door lane: THE one door gate does everything (state, repaint,
      // memory, co-op) — the narrow method is a pure delegation.
      setDoorOpen: (id) => nativeHost.setDoorState(id, 'open'),
      // The annex lane rides the same delegation law: THE one reveal verb.
      annexReveal: (id) => { nativeHost.annexReveal(id); },
      collapseFloor: (cells, delaySec, presserId, visualOnly) =>
        nativeHost.collapseFloor(cells, delaySec, presserId, visualOnly),
      clearDoodads: (kind, at, r) => nativeHost.clearDoodadsNear(kind, at, r),
      fx: (at, radius, color) =>
        nativeHost.flashes.push({ pos: vec(at.x, at.y), radius, color, life: 0.4, maxLife: 0.4 }),
      defer: (sec, run) => nativeHost.trapDeferred.push({ at: nativeHost.time + Math.max(0, sec), run }),
    };
  }

export function sceneSpoilsSealed(nativeHost:NativeSceneFrameHost): boolean {
    return nativeHost.zone.spoils === 'none';
  }

export function sceneChestOpener(nativeHost:NativeSceneFrameHost, c: Chest): Seat | null {
    let best: Seat | null = null, bd = Infinity;
    for (const s of nativeHost.frameSeats()) {
      if (s.keeper || s.merc || s.actor.dead || s.actor.downed || !chestInReach(c, s.actor)) continue;
      const d = dist(c.pos, s.actor.pos); // SOVEREIGNTY: census (attribution of the hand updateChests already let open it, never a touch)
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

export function sceneTetherOcclusion(nativeHost:NativeSceneFrameHost, t: Tether): 'blocked' | 'free' {
    const d = t.inst?.def.delivery as { occlusion?: 'blocked' | 'free' } | undefined;
    const base = d?.occlusion ?? LOS_CFG.tetherLinks[t.link] ?? 'free';
    if (base === 'free') return 'free';
    const phasing = t.inst
      ? t.owner.sheet.get('phasing', skillContextTags(t.inst.def, grantedTags(t.inst)),
        instanceMods(t.inst))
      : t.owner.sheet.get('phasing');
    return phasing > 0 ? 'free' : 'blocked';
  }

export function sceneRefundOnOrb(nativeHost:NativeSceneFrameHost, a: Actor, kind: string): void {
    if (a.cooldowns.size === 0) return;
    for (const inst of a.skills) {
      if (!inst) continue;
      const left = a.cooldowns.get(inst.def.id);
      if (left === undefined) continue;
      const s = a.sheet.get(orbRefundStat(kind),
        skillContextTags(inst, grantedTags(inst)), instanceMods(inst));
      if (s <= 0) continue;
      const next = left - s;
      if (next <= 0) a.cooldowns.delete(inst.def.id);
      else a.cooldowns.set(inst.def.id, next);
    }
  }

export function sceneMountCrewSpawn(nativeHost:NativeSceneFrameHost, m: Actor): void {
    const slot = m.defId ? MONSTERS[m.defId]?.mountSlot : undefined;
    const crew = slot?.crew;
    if (!crew || m.dead) return;
    if (crew.chance !== undefined && rand(0, 1) >= crew.chance) return;
    const want = crew.count
      ? Math.round(rand(crew.count[0], crew.count[1])) : seatCount(slot);
    for (let i = 0; i < want; i++) {
      if (nativeHost.mountFreeSeat(m, slot) < 0) break;
      const rid = crew.riders[Math.min(crew.riders.length - 1, Math.floor(rand(0, crew.riders.length)))];
      if (!MONSTERS[rid]) {
        console.warn(`[mounts] '${m.defId}' crews unknown rider '${rid}'`);
        continue;
      }
      const r = nativeHost.createMonster(rid, Math.max(1, m.level), m.team, m.owner);
      r.faction = m.faction;
      r.fromZoneGen = false;
      r.mountPaired = true;
      r.pos.x = m.pos.x;
      r.pos.y = m.pos.y;
      const at = nativeHost.actors.indexOf(m);
      { nativeHost.actors.splice(at < 0 ? nativeHost.actors.length : at + 1, 0, r); nativeHost.admitCombatBirth(r); }
      nativeHost.mountSeatRider(r, m);
    }
  }

export function sceneRainScorch(nativeHost:NativeSceneFrameHost, at: Vec2, r: number): void {
    // SOVEREIGNTY: sky — ember rain is weather (the derived census, probe_tiers RIG T).
    for (const a of nativeHost.actors) {
      if (a.dead || a.downed || a.flying || isDormant(a)) continue;
      const reach = r + a.radius;
      if (Math.abs(a.pos.x - at.x) > reach || Math.abs(a.pos.y - at.y) > reach) continue;
      if (Math.hypot(a.pos.x - at.x, a.pos.y - at.y) > reach) continue;
      if (nativeHost.underRoofAt(a.pos)) continue;
      nativeHost.scorchFeed(a, GEYSER_CFG.rain.scorchUnits);
    }
  }

export function sceneTracksEnsure(nativeHost:NativeSceneFrameHost, specs: TrackSpec[]): void {
    for (const s of specs) nativeHost.addTrack(s);
  }

export function sceneSetTracksArmed(nativeHost:NativeSceneFrameHost, tag: string, armed: boolean): void {
    for (const tr of nativeHost.tracks) {
      if (tr.spec.tag !== tag || tr.armed === armed) continue;
      tr.armed = armed;
      for (const r of tr.riders) {
        const pose = trackPose(tr, nativeHost.time, r.phase, r.def);
        const reach = r.def.surface.kind === 'circle'
          ? r.def.surface.r : Math.max(r.def.surface.hw, r.def.surface.hh);
        nativeHost.flashes.push({ pos: vec(pose.x, pose.y), radius: reach * 1.4, color: r.def.color ?? '#cfc4ae', life: 0.4, maxLife: 0.4 });
      }
    }
  }

export function sceneCollapseFloor(nativeHost:NativeSceneFrameHost, cells: { x: number; y: number; r?: number }[], delaySec: number,
    presserId?: number, visualOnly?: boolean, tier = 0): void {
    // `tier`: the story the false floor lies on (the sovereignty gate) —
    // only feet on it drop; a storey walker over a ground pit is unmoved.
    const plant = (): void => {
      const made: Doodad[] = [];
      for (const c of cells) {
        const r = c.r ?? 26;
        // Idempotent (the 20 Hz mirror re-runs): a gap already yawning here
        // is not planted twice.
        if (nativeHost.doodads.some(d => d.kind === 'ruin_floor_gap' && !d.gone
          && Math.abs(d.pos.x - c.x) < 8 && Math.abs(d.pos.y - c.y) < 8)) continue;
        const d = { pos: vec(c.x, c.y), radius: r, kind: 'ruin_floor_gap', fall: true } as Doodad;
        nativeHost.doodads.push(d);
        made.push(d);
      }
      if (!made.length) return;
      nativeHost.markDoodadsChanged();
      for (const d of made) {
        nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: d.radius + 10, color: '#141019', life: 0.5, maxLife: 0.5 });
        // THE DISSOLUTION GRAMMAR (D1): the drop speaks the dust voice (one
        // accent channel — the floor's own give-way breath; clients too).
        nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: d.radius * 1.6, color: '#8a7a5c', life: 0.45, maxLife: 0.45, fx: 'dust' });
      }
      nativeHost.shake = Math.max(nativeHost.shake, 1.6);
      if (visualOnly) return;
      const presser = presserId !== undefined
        ? nativeHost.actors.find(a => a.id === presserId && !a.dead) : undefined;
      for (const a of nativeHost.actors) {
        if (a.dead || a.downed || a.flying || a.dash || a.leap || a.caromRun) continue;
        if (a.tier !== tier) continue; // its own story's feet (the sovereignty gate)
        const g = made.find(d => dist(a.pos, d.pos) <= d.radius);
        if (!g) continue;
        const dir = Math.atan2(g.pos.y - a.pos.y, g.pos.x - a.pos.x);
        nativeHost.pushActor(a, Number.isFinite(dir) ? dir : 0, 70, presser);
      }
    };
    if (delaySec <= 0) { plant(); return; }
    // The crumble telegraph: the shiver the dash escapes — and, THE
    // DISSOLUTION GRAMMAR (D1), the DRAWN PRE-CRACK: every doomed cell cracks
    // from its heart over the delay (dissolveFloorCrackView — the caption
    // "the floor gives way" retired; the crack IS the sentence).
    for (const c of cells) {
      nativeHost.flashes.push({ pos: vec(c.x, c.y), radius: (c.r ?? 26) * 0.9, color: '#8a7a5c', life: delaySec, maxLife: delaySec });
    }
    if (cells.length) {
      nativeHost.dissolveFloorCracks.push({
        cells: cells.map(c => ({ x: c.x, y: c.y, r: c.r ?? 26 })),
        at: nativeHost.time, until: nativeHost.time + delaySec,
      });
    }
    nativeHost.trapDeferred.push({ at: nativeHost.time + delaySec, run: plant });
  }

export function sceneClearDoodadsNear(nativeHost:NativeSceneFrameHost, kind: string, at: { x: number; y: number }, r: number): void {
    let any = false;
    for (const d of nativeHost.doodads) {
      if (d.kind !== kind || d.gone) continue;
      if (dist(d.pos, at) > r) continue;
      d.gone = true;
      any = true;
    }
    if (any) nativeHost.markDoodadsChanged();
  }

