import {observeNativeHiddenSource,observeNativeCombatSourceReassignment} from './nativeCombatRecordObservation';
import {observeNativeCombatStorage,observeNativeCombatRecord} from './nativeCombatRecordObservation';
import type {Actor as NativeRecordActor} from './actor';
import type {SkillInstance as NativeRecordSkill} from './skills';
/** Native area combat context and presentation. Exact source archive records the extraction. */
import type {World} from "./world";
import type {NativeCosmeticHost} from "../meta/cosmetics";
import { skillMovementVoice, type MovementPhase } from '../data/skillMovementVisuals';
import { skillSelfVoice, SELF_VISUAL_STYLE } from '../data/skillSelfVisuals';
import { presenceProfile, skillPresenceVoice, PRESENCE_STYLE, type PresencePhase } from '../data/skillPresenceVisuals';
import { cosmeticSkillPaint } from '../meta/cosmetics';
import { companionStanceIdOf, nextStanceId } from './companionStances';
import { COMPANION_STANCES } from '../data/companionStances';
import { angleTo, dist, rand, vec, type Vec2 } from '../core/math';
import { type Attributes, type DamageType } from './stats';
import { Actor } from './actor';
import { type PlayerInputSource } from '../net/intent';
import { landLifeDamage, mitigateTyped, rollSkillDamage, type DamagePacket } from './damage';
import { type ParryDamage } from './parry';
import { DEFENSE_CFG } from './defense';
import { ROUSE_RULES } from './ai';
import { alertScale } from './brain';
import { instanceMods, makeSkillInstance, resolveSizeOver, skillContextTags, type ProjectileDelivery, type ProjectileShape, type SkillDef, type ProjTrailSpec, type FissureTrailSpec, type SkillInstance, type SupportDef } from './skills';
import { type PersonalStash } from './stash';
import { type EssenceId } from '../data/essences';
import { type ItemInstance } from './items';
import { SKILLS } from '../data/skills';
import { type ClassDef } from '../data/classes';
import type { CouchSeatTag } from '../data/couch';
import { type ZoneDef } from '../data/zones';
import { pitRegionOf, type Doodad, type DoodadKind, type ResonanceSpec } from './levelgen';
import { PIT_CFG, pitAt } from './pitfall';
import { floorStoryOf } from './tiers';
import { lightwellOf } from './lightwells';
import { type ActorTimeFilter, type ChronoSpec } from './timeflow';
import { eyecatchHoldSec, ULT_CFG, ultGlobalGapSec, ultThrottleSec } from './ultimates';
import { type QuestLedgerSave } from './questLedger';
import { Rng } from '../core/rng';
import { FOG_BANKS, type FogBank } from './fog';
import { CREEP_CFG, CreepField } from './creep';
import { feedWatch, WATCH_CFG, WATCH_RUNG, watchRungOf, watchValueOf } from './watch';
import { type ConjureGrant } from './flux';
import type { RecoveryPolicy } from '../world/regions';
import { type GuardianSpec } from '../packages/holdfast';
import { SIM_TAP } from './tap';
import { type DeathRecord } from '../meta/death';
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
export interface Projectile {
  /** Replica identity only; live flights resolve their originating instance. */
  skillVisualId?: string;
  orbPaint?: ProjectileDelivery['orbPaint'];
  /** A parried flight carries a captured counter payload, not a new cast. */
  parryDamage?: ParryDamage;
  /** Render-only mirror bit; the host derives it from parryDamage. */
  reflectedCue?: boolean;
  cosmeticProjectile?: string;
  /** Optional victim anchor for a lodged orbit; the caster retains attribution. */
  orbitAnchorId?: number;
  cosmeticMotif?: import('./cosmetics').CosmeticMotif;
  /** PULSATION (projPulse): breathe the hit radius ±this fraction of
   *  radius0 on a fixed rhythm. */
  pulse?: number;
  radius0?: number;
  /** THE TIER FABRIC: the layer this flight travels on (caster's at spawn).
   *  Tier-1 flights cross deck-height air — the region blocksShot sweep
   *  exempts rows that are tier FLOOR (an arrow sails over a butte's top;
   *  a duct shot still stops on the earth between tunnels). */
  tier?: number;
  pos: Vec2; dir: number; speed: number; radius: number;
  /** Fractional speed change per second of flight (Momentum; floors low). */
  accel?: number;
  traveled: number; range: number; pierce: number;
  chains: number;
  /** actorId -> age at which it may be struck again (Infinity = never). */
  hits: Map<number, number>;
  age: number;
  /** DURATION-driven lifespan (ProjectileDelivery.duration × effectDuration):
   *  the flight dies at this age; range is effectively unbounded. */
  maxAge?: number;
  /** Damage multiplier baked at launch (charge releases, channel ramps,
   *  repeat trains, clone echoes) — impacts and their explosions carry it. */
  mult: number;
  /** Flat typed damage baked at launch (the paid-cost bonus) — merged with
   *  conduction payloads at impact. Children do NOT inherit it. */
  flat?: Partial<Record<DamageType, number>>;
  /** Shatter (Ice Spear) already spent. */
  shattered?: boolean;
  /** Eaten by a dome — dies without its explosion. */
  dissolved?: boolean;
  /** Ball Lightning's next-zap countdown. */
  zapTimer?: number;
  /** Conduction support socketed: can inherit an element from fields. */
  conductive?: boolean;
  /** The element inherited from a field flown through. */
  conductElem?: 'fire' | 'cold' | 'lightning' | 'chaos';
  /** Last enemy directly struck (explosions skip double-dipping it). */
  lastHitId?: number;
  caster: Actor; inst: SkillInstance; color: string;
  shape: ProjectileShape;
  /** If set, never dies on impact; targets re-hittable after this delay. */
  rehit?: number;
  /** Remaining impact splits (each fork spawns two inheriting children). */
  forks: number;
  /** 0 none / 1 fly back to the cast point / 2 track the moving caster. */
  returnMode: number;
  /** Full out-and-back passes remaining (kindred returns: a socketed
   *  return gem on a native returner buys a SECOND pass — the catch
   *  re-throws; the true catch pays at the final homecoming). */
  returnPasses?: number;
  returnPhase: boolean;
  /** The out-leg range as spawned — restored for each re-thrown pass
   *  (enterReturn overwrites `range` with its homeward safety net). */
  range0?: number;
  origin: Vec2;          // cast point (return target, mode 1; re-anchored per pass)
  // Trajectory ATTRIBUTES — per-axis strengths resolved once at spawn from
  // the delivery's innate baselines + the caster's stats (0 = axis inert).
  homing: number;        // turn rate toward enemies, rad/s
  guide: number;         // turn rate toward the caster's LIVE aim point, rad/s
  erratic: number;       // random steering jitter, rad/s
  spiral: number;        // revolve + radius growth around a fixed anchor
  orbit: number;         // revolution tethered to the caster, held radius
  spin: number;          // epicycle spin rate around the flight axis
  weave: number;         // figure-eight weave frequency along the guide
  amp: number;           // spin / weave lateral amplitude, units
  orbitR0: number;       // tether radius while orbiting
  /** The heading the steering axes act on. Kept separate from `dir`, which
   *  tracks ACTUAL motion for rendering, chains, and forks. */
  guideDir: number;
  /** pos ≠ guide (polar / spin / weave active) → dir must follow motion. */
  guided: boolean;
  anchor: Vec2;          // polar anchor (cast point) / advancing guide center
  angle: number;         // polar angular position
  orbRadius: number;     // polar radius
  /** Explosive payload detonates on EVERY survived hit (Fulminate). */
  hitDetonate: boolean;
  /** Stat-granted impact shards (adds to any innate shatter — Shrapnel). */
  shrapnel: number;
  /** Path destruction (ProjTrailSpec) + travel mark for the next drop. */
  trailSpec?: ProjTrailSpec;
  trailNext: number;
  /** FISSURE TRAIL (Earthrender): the flight tears a crack — spec, the
   *  travel mark for the next segment, and the recorded chain the closing
   *  pass zips back down when the flight dies. */
  fisSpec?: FissureTrailSpec;
  fisNext?: number;
  fisChain?: Vec2[];
  /** PROJECTILE-BORNE FIELD (Soulflay): converted typed dps worn around
   *  the flight (tether discipline: scaled + converted at launch) and the
   *  field's reach; auraTick paces the chunked application. */
  auraAmounts?: Partial<Record<DamageType, number>>;
  auraRadius?: number;
  auraTick?: number;
  /** TORPOR (dome 'slow'): stall factor for THIS frame's movement — the
   *  dome re-stamps it every frame the flight stays inside. */
  stall?: number;
  /** CATCH SPOT (Whirlaxe): armed by the first flesh hit — the flight
   *  redirects here and PLANTS as a catchable axe on arrival. */
  landAt?: Vec2;
  /** Fraction of this projectile's resolved axes its spawned children carry
   *  (the projInherit stat; shatter/emit specs add their own). */
  inheritFrac: number;
  /** Spent shatter re-arms on every chain leg; forks split unspent. */
  reShatter: boolean;
  /** Spawned-child generation (0 = cast directly). Capped by
   *  PROJ_CHILD_DEPTH_MAX — see the recursion guard note there. */
  depth: number;
  emit?: { inst: SkillInstance; interval: number; timer: number; angle: number; pattern: string };
  // --- Batch-3 trajectory levers (see TrajectorySpec) ----------------------
  /** Zig-zag state: countdown to the next kink + the side it turns. */
  zig?: { timer: number; sign: number };
  /** Terrain ricochets remaining. */
  bounces?: number;
  /** Frame rebounds remaining (the fourth wall — projFrameBounce /
   *  TrajectorySpec.frameBounce): banks off the caster's governing view
   *  frame, range + hit ledger re-armed per rebound (the re-throw idiom). */
  frameBounces?: number;
  /** PHASING flight (occlusion 'free' / the phasing stat): terrain never
   *  stops it — through rock, walls and masonry like mist. */
  phase?: boolean;
  /** Live recurve chance (× decay per whip-around). */
  recurveChance?: number;
  /** Selective pierce: the prey's actor id (retargets on its death). */
  preyId?: number;
  /** Entity-impact deflection lockout (caromOnHit). */
  caromLock?: number;
  /** ARC-TO destination: converge here and detonate (turn rate = arcTo). */
  destAt?: Vec2;
  arcRate?: number;
  /** CAROMS patrol: waypoints cycled for the flight's whole duration. */
  patrol?: { points: Vec2[]; idx: number };
  /** SUFFUSION cargo: the ground effect this flight crossed and now
   *  carries — it re-blooms where the flight ends. */
  suffuse?: { inst: SkillInstance; radius: number; linger: number; dmgMult: number };
}
export const RESONANCE_CFG = {
  /** How far a toll carries (DoodadRule.resonance.radius overrides). */
  radius: 480,
  /** Seconds one stone stays quiet between tolls. */
  cooldown: 2.2,
  /** Seconds of alert (stalk toward the stone) a toll grants roused kin. */
  alertFor: 4,
  lurePace: 1.1,
  lureStandoff: 52,
  lureLinger: 3.5,
  /** THE TOLL's drawn life (seconds) — the rings expand to the lure reach. */
  tollLife: 0.9,
};
export interface SeatHudRow { fn?: { text: string; at: number }; lhAt?: number }
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
export interface NativeSceneCombatContextHost extends NativeCosmeticHost {
 actorGrid:World["actorGrid"];
 actorGridBuiltFor:World["actorGridBuiltFor"];
 actorGridBuiltRev:World["actorGridBuiltRev"];
 actorGridRev:World["actorGridRev"];
 actors:World["actors"];
 arena:World["arena"];
 auroras:World["auroras"];
 bridges:World["bridges"];
 carriedEffectContext:World["carriedEffectContext"];
 charDirty:World["charDirty"];
 clampPos:World["clampPos"];
 companionBonds:World["companionBonds"];
 companionStanceOf:World["companionStanceOf"];
 conjured:World["conjured"];
 creep:World["creep"];
 creepers:World["creepers"];
 currentZoneSeed:World["currentZoneSeed"];
 doodads:World["doodads"];
 drops:World["drops"];
 eyecatch:World["eyecatch"];
 isPresentationArea():boolean;
 flashes:World["flashes"];
 fogEnsure:World["fogEnsure"];
 guardArts:World["guardArts"];
 guardians:World["guardians"];
 hazardCaster:World["hazardCaster"];
 holdfastGuardian:World["holdfastGuardian"];
 holdfastRouseRule:World["holdfastRouseRule"];
 holdfastSite:World["holdfastSite"];
 hostileTo:World["hostileTo"];
 installCreepFront:World["installCreepFront"];
 kill:World["kill"];
 lineOfSight:World["lineOfSight"];
 markDoodadsChanged:World["markDoodadsChanged"];
 markMetaDirty:World["markMetaDirty"];
 massOccurrenceDecorSources:World["massOccurrenceDecorSources"];
 massOccurrencePitContext:World["massOccurrencePitContext"];
 massRewardLevel:World["massRewardLevel"];
 massRuntime:World["massRuntime"];
 metaDirty:World["metaDirty"];
 orbs:World["orbs"];
 pathField:World["pathField"];
 presenceMoment:World["presenceMoment"];
 presencePulseAt:World["presencePulseAt"];
 recordIndirectDamage:World["recordIndirectDamage"];
 resolveHit:World["resolveHit"];
 resonanceRang:World["resonanceRang"];
 rouseRules:World["rouseRules"];
 satellites:World["satellites"];
 seatByActor:World["seatByActor"];
 seatHero:World["seatHero"];
 seatHud:World["seatHud"];
 setCompanionStance:World["setCompanionStance"];
 setLure:World["setLure"];
 sim:World["sim"];
 spawnLightwell:World["spawnLightwell"];
 spoilStoryAt:World["spoilStoryAt"];
 structures:World["structures"];
 text:World["text"];
 time:World["time"];
 timeflow:World["timeflow"];
 ultFlashAt:World["ultFlashAt"];
 ultFlashLastAt:World["ultFlashLastAt"];
 walk:World["walk"];
 wellSeq:World["wellSeq"];
 zone:World["zone"];
 zones:World["zones"];
}

export function sceneGuardArtHit(nativeHost:NativeSceneCombatContextHost, a: Actor, inst: SkillInstance, target: Actor, flat: Partial<Record<DamageType, number>>, push = 0): void {
    nativeHost.resolveHit(a, inst, target, 1, 1, flat, true, false,
      push > 0 ? [{ type: 'knockback', strength: push }] : []);
  }

export function sceneCompanionPulseHit(nativeHost:NativeSceneCombatContextHost, beast: Actor, inst: SkillInstance, target: Actor, power: number): void {
    nativeHost.resolveHit(beast, inst, target, power, 1);
  }

export function sceneAttackSequenceBurst(nativeHost:NativeSceneCombatContextHost, caster: Actor, inst: SkillInstance, target: Actor, amount: number): void {
    if (target.dead || target.invulnerable || amount <= 0) return;
    const before = target.life;
    const taken = mitigateTyped(target, { physical: amount }, { attacker: caster, tags: skillContextTags(inst), extra: instanceMods(inst) });
    landLifeDamage(target, taken);
    nativeHost.recordIndirectDamage(target, caster, before);
    SIM_TAP.current?.onDot?.(target, taken, 'physical');
    target.hitFlash = 0.15; target.hitFlashType = 'physical';
    nativeHost.text(target.pos, String(Math.round(taken)), '#bc4540', 14, 'combat');
    nativeHost.flashes.push({ pos: { ...target.pos }, radius: target.radius + 18, color: '#c6453b', life: 0.25, maxLife: 0.25 });
    if (target.life <= 0 && !target.dead) nativeHost.kill(target, false, caster);
  }

export function sceneChallengeBurst(nativeHost:NativeSceneCombatContextHost, caster: Actor, target: Actor, amount: number): void {
    const taken = mitigateTyped(target, { physical: amount });
    if (taken <= 0 || target.dead) return;
    target.life -= taken; target.hitFlash = 0.15;
    nativeHost.text(target.pos, `REOPENED ${Math.round(taken)}`, '#d96962', 13, 'combat');
    if (target.life <= 0) nativeHost.kill(target, false, caster);
  }

export function sceneChallengeHit(nativeHost:NativeSceneCombatContextHost, caster: Actor, inst: SkillInstance, target: Actor, power: number): void {
    nativeHost.resolveHit(caster, inst, target, power, 1);
  }

export function sceneAssaultBladeHit(nativeHost:NativeSceneCombatContextHost, caster: Actor, inst: SkillInstance, target: Actor, power: number): void {
    nativeHost.resolveHit(caster, inst, target, power, 1);
  }

export function sceneRefreshSatellites(nativeHost:NativeSceneCombatContextHost, dt = 0): void {
    nativeHost.guardArts.refreshVisuals();
    nativeHost.satellites.update(nativeHost.actors, dt, nativeHost.carriedEffectContext());
  }

export function sceneRefreshGuardians(nativeHost:NativeSceneCombatContextHost, dt = 0): void {
    nativeHost.guardians.update(nativeHost.actors, dt, nativeHost.carriedEffectContext());
  }

export function sceneRefreshAuroras(nativeHost:NativeSceneCombatContextHost, dt = 0): void {
    nativeHost.auroras.update(nativeHost.actors, dt, nativeHost.carriedEffectContext());
  }

export function sceneRefreshCreepers(nativeHost:NativeSceneCombatContextHost, dt = 0): void {
    nativeHost.creepers.update(nativeHost.actors, dt, {
      ...nativeHost.carriedEffectContext(),
      move: (a, from, goal, radius, distance) => {
        if (distance <= 0) return { ...from };
        const field = nativeHost.pathField(a.tier);
        const toward = field?.pathStep && !(field.lineWalkable?.(from, goal) ?? false)
          ? field.pathStep(from, goal) ?? from : goal;
        const length = Math.hypot(toward.x - from.x, toward.y - from.y);
        const scale = Math.min(1, distance / Math.max(1e-9, length));
        const to = nativeHost.clampPos({ x: from.x + (toward.x - from.x) * scale,
          y: from.y + (toward.y - from.y) * scale }, radius, from, { tier: a.tier });
        // A terrain snap must not become an invisible leap through a barrier.
        return Math.hypot(to.x - from.x, to.y - from.y) <= distance + 1e-6
          && nativeHost.lineOfSight(from, to, a.tier, a.tier) ? to : { ...from };
      },
    });
  }

export function sceneActorsNear(nativeHost:NativeSceneCombatContextHost, x: number, y: number, r: number, out: Actor[]): Actor[] {
    if (nativeHost.actorGridBuiltRev !== nativeHost.actorGridRev || nativeHost.actorGridBuiltFor !== nativeHost.actors) {
      nativeHost.actorGrid.build(nativeHost.actors);
      nativeHost.actorGridBuiltRev = nativeHost.actorGridRev;
      nativeHost.actorGridBuiltFor = nativeHost.actors;
    }
    return nativeHost.actorGrid.near(x, y, r, out);
  }

export function sceneCastChrono(nativeHost:NativeSceneCombatContextHost, caster: Actor, spec: ChronoSpec, id: string, duration: number, label?: string): void {
    let actors: ActorTimeFilter | undefined;
    // keeperSeat lane — THE SCOPED FREEZE (card 18 B with C): on a hosted world a time
    // stop is a bubble around its caster that never bends the caster's own team, whatever
    // the spec asked (a world-scoped spec included); off a shard the spec's own law.
    const scope = nativeHost.timeflow.chronoScope;
    if (scope) {
      actors = { exceptTeam: caster.team, within: { x: caster.pos.x, y: caster.pos.y, r: scope.radius } };
    } else if (!spec.world) {
      const ex = spec.exempt ?? 'pack';
      actors = ex === 'caster' ? { exceptIds: [caster.id] }
        : ex === 'pack' ? { exceptIds: [caster.id], exceptOwnedBy: [caster.id] }
        : ex === 'team' ? { exceptTeam: caster.team }
        : {}; // 'none': every body bends, the caster's included
    }
    nativeHost.timeflow.hold({
      id, scale: spec.scale, kind: 'skill', duration, actors,
      hud: spec.hud ?? {
        tint: 'rgba(150,200,225,0.14)',
        label: label ?? 'time bends',
      },
    });
  }

export function sceneConjureCloud(nativeHost:NativeSceneCombatContextHost, x: number, y: number, r: number, secs: number, opts?: {
    caster?: Actor;
    grants?: readonly ConjureGrant[];
    look?: string;
    follow?: boolean;
  }): number {
    if (!nativeHost.conjured) return 0;
    const caster = opts?.caster;
    return nativeHost.conjured.conjure(x, y, r, secs, {
      grants: opts?.grants ?? [],
      team: caster?.team ?? null,
      owner: caster ?? null,
      follow: opts?.follow && caster ? caster : null,
      ...(opts?.look !== undefined ? { look: opts.look } : {}),
    });
  }

export function sceneCreepEnsure(nativeHost:NativeSceneCombatContextHost): CreepField | null {
    if (nativeHost.creep) return nativeHost.creep;
    if (nativeHost.arena.boundless) return null;
    nativeHost.creep = new CreepField(
      new Rng((nativeHost.currentZoneSeed ^ CREEP_CFG.salt) >>> 0),
      nativeHost.arena.w, nativeHost.arena.h);
    nativeHost.installCreepFront(nativeHost.creep);
    return nativeHost.creep;
  }

export function sceneCycleCompanionStance(nativeHost:NativeSceneCombatContextHost, seat: Seat, skillId?: string, stanceId?: string): boolean {
    const ids = skillId ? [skillId]
      : seat.actor.skills.filter(s => s && s.def.effects.some(f => f.type === 'tame')).map(s => s!.def.id);
    let moved = false;
    for (const id of new Set(ids)) {
      const to = stanceId ?? nextStanceId(nativeHost.companionStanceOf(seat, id));
      moved = nativeHost.setCompanionStance(seat, id, to) || moved;
    }
    return moved;
  }

export function sceneFrontSplash(nativeHost:NativeSceneCombatContextHost, caster: Actor | null, inst: SkillInstance | null | undefined, at: Vec2, reach: number, tier = caster?.tier ?? 0): void {
    if (!caster || !inst || !nativeHost.creep || (!nativeHost.creep.quenchable && !nativeHost.creep.ignitable)) return;
    const amounts = rollSkillDamage(caster, inst).amounts;
    if (nativeHost.creep.quenchable) nativeHost.creep.damageSkin(at.x, at.y, reach, amounts, tier);
    // THE IGNITION DIAL (FrontSpawnRow.ignition): sustained fire into a lit
    // lane's FUEL births a section — authored per lane (the Char), null-
    // cost everywhere the dial is off (the global default: player casts
    // never ignite fronts).
    if (nativeHost.creep.ignitable) nativeHost.creep.igniteAt(at.x, at.y, reach, amounts, nativeHost.time, tier);
  }

export function sceneMarkMetaDirty(nativeHost:Pick<NativeSceneCombatContextHost,'metaDirty'>, seat: Seat): void { nativeHost.metaDirty.add(seat.id); }

export function sceneMarkSeatActed(nativeHost:NativeSceneCombatContextHost, actor: Actor): void {
    const s = nativeHost.seatByActor.get(actor);
    if (s) s.lastActedAt = nativeHost.time;
  }

export function sceneMintHazardCloud(nativeHost:NativeSceneCombatContextHost, at: Vec2, opts: { skillId?: string; radius?: number; linger?: number;
    tickInterval?: number; dmgMult?: number; delay?: number; color?: string;
    /** THE EFFECT VOICE of the pop (the spore pod's 'sporeburst'); unset
     *  keeps the classic sky-strike costume (absent == identical). */
    fx?: string }): void {
    const skill = SKILLS[opts.skillId ?? 'toxic_cloud'] ?? SKILLS['venom_bolt'];
    if (!skill) return;
    if (!nativeHost.hazardCaster) {
      const c = observeNativeHiddenSource(nativeHost,()=>new Actor('Spore', 'player', vec(0, 0)));
      c.untargetable = true; c.invulnerable = true;
      nativeHost.hazardCaster = c;
    }
    const caster = nativeHost.hazardCaster;
    caster.level = Math.max(1, nativeHost.zone.level);
    caster.pos = vec(at.x, at.y);
    const inst = makeSkillInstance(skill, 1 + Math.floor(nativeHost.zone.level / 3));
    const exp = (skill.delivery as { exposure?: number } | undefined)?.exposure;
    // The payload's own SIZE ENVELOPE rides the pop (venom_bloom's
    // contracting burst) — the cloud breathes exactly as the skill would.
    const so = resolveSizeOver(
      skill.delivery.type === 'ground' ? skill.delivery.sizeOver : undefined);
    const cloudR = opts.radius ?? 90;
    const cloudLinger = opts.linger ?? 2.6;
    {
 let nativeQueue:typeof nativeHost.zones;let nativeRecord:(typeof nativeHost.zones)[number];let nativeSource:NativeRecordActor|null=null;let nativeInstance:NativeRecordSkill|undefined=undefined;
 (nativeQueue=observeNativeCombatStorage(nativeHost,'zones',nativeHost.zones)).push(nativeRecord={ tier: caster.tier,
      pos: vec(at.x, at.y), radius: cloudR * (so?.from ?? 1), caster:(nativeSource=caster), inst:(nativeInstance=inst),
      color: opts.color ?? '#8fd06f',
      delay: opts.delay ?? 0.6, exploded: false, linger: cloudLinger,
      linger0: cloudLinger,
      tickInterval: opts.tickInterval ?? 0.5, tickTimer: 0,
      shape: 0, facing: 0, dmgMult: opts.dmgMult ?? 0.7, depth: 1, hitAll: true, meteor: false,
      fx: opts.fx,
      exposure: exp ? { after: exp, dwell: new Map() } : undefined,
      sizeOver: so,
      radius0: so ? cloudR : undefined,
    });
 observeNativeCombatRecord(nativeHost,'zones',nativeQueue,nativeRecord,nativeSource,nativeInstance);
}
  }

export function sceneMovementMoment(nativeHost:NativeSceneCombatContextHost, a: Actor, inst: SkillInstance, phase: MovementPhase): void {
    const fx = skillMovementVoice(inst.def.id, phase);
    if (!fx || a.dead || a.downed || nativeHost.flashes.filter(f => f.movement || f.fx?.startsWith('skillMove:')).length >= 80) return;
    nativeHost.flashes.push({ pos: { ...a.pos }, radius: a.radius * 1.8, facing: a.facing,
      color: cosmeticSkillPaint(nativeHost, a, inst.def.id).color ?? inst.def.color,
      life: .24, maxLife: .24, fx, recoveryCueTier: a.tier });
  }

export function sceneNoiseAt(nativeHost:NativeSceneCombatContextHost, pos: Vec2, radius: number, source?: Actor, tier = source?.tier ?? nativeHost.spoilStoryAt(pos)): void {
    // `tier`: the story the noise rang on (the investigation-crosses law) —
    // sound CROSSES stories, but the investigator on another story walks
    // the crossing before it can stand on the ring; a sourceless ring reads
    // the floor's word.
    if (radius <= 0) return;
    const t = nativeHost.time;
    for (const a of nativeHost.actors) {
      const w = a.watch;
      if (!w || a.dead || a.aggroed || a.aiTargetId !== undefined) continue;
      if (source && !nativeHost.hostileTo(a, source)) continue;
      const d = dist(a.pos, pos);
      if (d > radius) continue;
      const before = watchValueOf(a, w, t);
      const v = feedWatch(a, w, t,
        WATCH_CFG.noise.feed * (1 - 0.6 * (d / radius)), WATCH_CFG.rungs.search);
      if (a.watchAt) { a.watchAt.x = pos.x; a.watchAt.y = pos.y; }
      else a.watchAt = vec(pos.x, pos.y);
      const rung = watchRungOf(v);
      if (rung >= WATCH_RUNG.search) {
        if (watchRungOf(before) < WATCH_RUNG.search) {
          a.alertUntil = Math.max(a.alertUntil,
            t + (w.searchSec ?? WATCH_CFG.searchSec) * alertScale(a));
        } else {
          a.alertUntil = Math.max(a.alertUntil, t + WATCH_CFG.scent.walkSec);
        }
        // A newer bang re-aims a standing walk (the freshest sound wins).
        if (a.alertFrom) { a.alertFrom.x = pos.x; a.alertFrom.y = pos.y; }
        else a.alertFrom = vec(pos.x, pos.y);
        a.alertTier = tier;
      }
      a.watchTier = tier;
      a.watchRung = Math.max(a.watchRung, rung);
    }
  }

export function scenePitPolicyFor(nativeHost:NativeSceneCombatContextHost, policy: RecoveryPolicy, at?:Vec2): RecoveryPolicy {
    if (policy.kind !== 'fall' && policy.kind !== 'descend') return policy;
    const zone=at&&nativeHost.massRuntime?(nativeHost.massOccurrencePitContext(at)??nativeHost.zone):nativeHost.zone;
    return zone.theme.pitfall
      ?? ((zone.caveDepth ?? 0) >= 1 ? PIT_CFG.caveFall : policy);
  }

export function scenePlantKindle(nativeHost:NativeSceneCombatContextHost, caster: Actor, kind: string, at: Vec2, aoeScale: number, durScale: number): void {
    const d = nativeHost.spawnLightwell(kind, at, {
      radius: rand(11, 14) * Math.sqrt(Math.max(0.01, aoeScale)),
      poolMul: Math.max(0.1, durScale),
    });
    if (!d) return;
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 80, color: '#ffd890', life: 0.4, maxLife: 0.4 });
    nativeHost.text(vec(at.x, at.y - 14), 'kindled', '#ffd890', 11);
  }

export function scenePlantVent(nativeHost:NativeSceneCombatContextHost, fx: { bank: string; radius: number; duration: number }, at: Vec2, aoeScale: number, durScale: number, tier = 0): FogBank | null {
    const def = FOG_BANKS[fx.bank];
    if (!def) { console.warn(`[vent] unregistered fog bank '${fx.bank}'`); return null; }
    const fog = nativeHost.fogEnsure();
    if (!fog) return null;
    const bank = fog.plantBank(def, at, fx.radius * Math.sqrt(Math.max(0.01, aoeScale)), fx.duration * Math.max(0.1, durScale), tier); // the bank wears its caster's story
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: bank.reach * 0.6, color: def.color ?? '#eef6f8', life: 0.35, maxLife: 0.35 });
    return bank;
  }

export function scenePresenceArrival(nativeHost:NativeSceneCombatContextHost, a: Actor, caster: Actor, inst: SkillInstance): boolean {
    const p = presenceProfile(inst.def.id);
    if (!p || p.family === 'storm') return false;
    a.presenceBadge = { skillId: inst.def.id, color: cosmeticSkillPaint(nativeHost, caster, inst.def.id).color ?? inst.def.color };
    return nativeHost.presenceMoment(a, 'arrive');
  }

export function scenePresenceMoment(nativeHost:NativeSceneCombatContextHost, a: Actor, phase: PresencePhase): boolean {
    const badge = a.presenceBadge, fx = badge && skillPresenceVoice(badge.skillId, phase);
    if (!badge || !fx) return false;
    if (phase === 'pulse') {
      if (nativeHost.time - (nativeHost.presencePulseAt.get(a) ?? -Infinity) < .12) return true;
      nativeHost.presencePulseAt.set(a, nativeHost.time);
    }
    const life = PRESENCE_STYLE[phase];
    nativeHost.flashes.push({ pos: { ...a.pos }, radius: Math.min(56, a.radius + (phase === 'pulse' ? 12 : 20)),
      color: badge.color, life, maxLife: life, fx, recoveryCueTier: a.tier });
    return true;
  }

export function sceneReflectParriedProjectile(nativeHost:NativeSceneCombatContextHost, p: Projectile, guardian: Actor, power: number, parryPacket?: DamagePacket): void {
    const previous = p.caster;
    if (!p.parryDamage) {
      const packet = parryPacket ?? rollSkillDamage(previous, p.inst, p.flat);
      for (const type of Object.keys(packet.amounts) as DamageType[]) packet.amounts[type]! *= p.mult;
      p.parryDamage = { packet, power, reflections: 0 };
    }
    p.parryDamage.power = Math.max(0, power);
    p.parryDamage.reflections++;
    if (p.parryDamage.reflections > DEFENSE_CFG.parry.maxReflections) {
      p.dissolved = true;
      return;
    }
    // Release steering axes: an orbit, guided shot or return must not snap
    // back to its old route. Keep the same visible body and flight speed.
    p.dir = p.guideDir = dist(p.pos, previous.pos) > 0.01
      ? angleTo(p.pos, previous.pos) : p.dir + Math.PI;
    p.caster = guardian;
    observeNativeCombatSourceReassignment(nativeHost,'projectiles',p,guardian,guardian);
    p.anchor = vec(p.pos.x, p.pos.y);
    p.origin = vec(p.pos.x, p.pos.y);
    p.homing = p.guide = p.orbit = p.spiral = p.spin = p.weave = p.erratic = 0;
    p.guided = false;
    p.returnMode = 0;
    p.returnPhase = false;
    p.landAt = p.destAt = undefined;
    p.patrol = p.zig = undefined;
    p.preyId = p.orbitAnchorId = undefined;
    p.hits.clear();
    p.lastHitId = undefined;
    p.range = Math.max(p.range, p.traveled, dist(p.pos, previous.pos) + previous.radius + p.radius);
    p.traveled = 0;
    if (p.maxAge !== undefined) p.maxAge = p.age + p.range / Math.max(1, p.speed);
  }

export function sceneReleaseGarrison(nativeHost:NativeSceneCombatContextHost, a: Actor): void {
    if (!a.garrison) return;
    for (const st of nativeHost.structures) {
      for (const slot of st.slots) {
        if (slot.id === a.garrison.slotId) slot.occupants = slot.occupants.filter(id => id !== a.id);
      }
    }
    a.garrison = undefined;
    a.anchored = false;
    a.sheet.setSource('garrison', []);
  }

export function sceneResonate(nativeHost:NativeSceneCombatContextHost, o: Doodad, spec: ResonanceSpec): void {
    // SOVEREIGNTY: sound — a struck stone turns heads across stories; the walk crosses (the derived census, probe_tiers RIG T).
    const last = nativeHost.resonanceRang.get(o);
    if (last !== undefined && nativeHost.time - last < (spec.cooldown ?? RESONANCE_CFG.cooldown)) return;
    nativeHost.resonanceRang.set(o, nativeHost.time);
    const radius = spec.radius ?? RESONANCE_CFG.radius;
    const tint = spec.color ?? '#b8b2a4';
    nativeHost.setLure(`resonance#${o.pos.x | 0}_${o.pos.y | 0}`, o.pos, radius,
      RESONANCE_CFG.lurePace, RESONANCE_CFG.lureStandoff, RESONANCE_CFG.lureLinger, o.tier ?? 0);
    for (const a of nativeHost.actors) {
      if (a.dead || a.team !== 'enemy' || a.passive) continue;
      if (dist(a.pos, o.pos) > radius) continue;
      a.alertUntil = Math.max(a.alertUntil, nativeHost.time + RESONANCE_CFG.alertFor * alertScale(a));
      if (!a.alertFrom) { a.alertFrom = vec(o.pos.x, o.pos.y); a.alertTier = o.tier ?? 0; } // the stone's story
    }
    // THE TOLL (M-TOLL — show-dont-tell §3d): the rings expand to EXACTLY the
    // lure reach (drawn == tested — the caption never gave that), in the
    // stone's tint, through the 'toll' voice (or the row's own — the skep
    // thrums); the old line retired.
    nativeHost.flashes.push({
      pos: vec(o.pos.x, o.pos.y), radius,
      color: tint, life: RESONANCE_CFG.tollLife, maxLife: RESONANCE_CFG.tollLife, fx: spec.voice ?? 'toll',
    });
  }

export function sceneRouseOnWound(nativeHost:NativeSceneCombatContextHost, target: Actor): void {
    // SOVEREIGNTY: sound — kin rouse by earshot (the derived census, probe_tiers RIG T).
    if (!target.tag || target.aiAwakened) return;
    // Live-overlay rows first, then the OPEN registry (ai.ts registerRouseRule
    // — the lair fabric's vault warden), then the holdfast generics.
    const rule = (nativeHost.rouseRules[target.tag] ?? ROUSE_RULES[target.tag])?.()
      ?? nativeHost.holdfastRouseRule(target.tag);
    if (!rule) return;
    if (rule.woundFrac < 1
      && !(target.life > 0 && target.life <= target.maxLife() * rule.woundFrac)) return;
    let woke = 0;
    if (rule.radius > 0) {
      for (const a of nativeHost.actors) {
        if (a.dead || a.tag !== target.tag || a.aiAwakened) continue;
        if (dist(a.pos, target.pos) <= rule.radius) { a.aiAwakened = true; woke++; }
      }
    } else {
      target.aiAwakened = true;
      woke = 1;
    }
    if (woke) nativeHost.text(vec(target.pos.x, target.pos.y - 24), rule.toast, rule.color, rule.size);
  }

export function sceneSanctuaryBlocksCombat(nativeHost:NativeSceneCombatContextHost, a: Actor, b: Actor, origin?: Vec2): boolean {
    return nativeHost.massRuntime?.settlement?.sanctuary.blocks(a,b,origin) ?? false;
  }

export function sceneSeatHudOf(nativeHost:NativeSceneCombatContextHost, seat: Seat): SeatHudRow {
    let row = nativeHost.seatHud.get(seat);
    if (!row) nativeHost.seatHud.set(seat, row = {});
    return row;
  }

export function sceneSeatOfRoot(nativeHost:Pick<NativeSceneCombatContextHost,'seatByActor'>, a: Actor | null | undefined): Seat | undefined {
    let root = a ?? null;
    while (root?.owner) root = root.owner;
    return root ? nativeHost.seatByActor.get(root) : undefined;
  }

export function sceneShowSelfRelease(nativeHost:NativeSceneCombatContextHost, caster: Actor, inst: SkillInstance, at = caster.pos, radius = caster.radius + SELF_VISUAL_STYLE.radiusPad, tier = caster.tier): void {
    const fx = skillSelfVoice(inst.def.id); if (!fx) return;
    nativeHost.flashes.push({ pos: { ...at }, radius, color: cosmeticSkillPaint(nativeHost, caster, inst.def.id).color ?? inst.def.color,
      life: SELF_VISUAL_STYLE.life, maxLife: SELF_VISUAL_STYLE.life, fx, facing: caster.facing, recoveryCueTier: tier });
  }

export function sceneSpawnLightwell(nativeHost:NativeSceneCombatContextHost, kind: string, pos: Vec2, opts?: { radius?: number; poolMul?: number }): Doodad | null {
    const def = lightwellOf(kind);
    if (!def) return null;
    const d: Doodad = { pos: vec(pos.x, pos.y), radius: opts?.radius ?? rand(14, 20), kind: kind as DoodadKind };
    if (def.pool !== undefined) {
      const max = Math.max(1, def.pool * (opts?.poolMul ?? 1));
      d.well = { power: max, max, id: ++nativeHost.wellSeq };
    }
    nativeHost.doodads.push(d);
    nativeHost.markDoodadsChanged();
    return d;
  }

export function sceneSpoilStoryAt(nativeHost:NativeSceneCombatContextHost, at: Vec2): number {
    if (!nativeHost.zone.tiers || !nativeHost.walk?.regionAt) return 0;
    return floorStoryOf(nativeHost.walk.regionAt(at.x, at.y));
  }

export function sceneStampSpoils(nativeHost:NativeSceneCombatContextHost, d0: number, o0: number, tier: number): void {
    for (let i = d0; i < nativeHost.drops.length; i++) nativeHost.drops[i].tier ??= tier;
    for (let i = o0; i < nativeHost.orbs.length; i++) nativeHost.orbs[i].tier ??= tier;
  }

export function sceneUltimateFlash(nativeHost:NativeSceneCombatContextHost, caster: Actor, def: SkillDef): void {
    const spec = def.ultimate;
    if (!spec) return;
    if (!nativeHost.isPresentationArea()) return;
    const now = nativeHost.timeflow.age;
    // The windows fold through the lab lever (ULT_QA — iteration builds run
    // the banner eagerly; shipped builds keep the rare-movie law).
    if (now - (nativeHost.ultFlashAt.get(caster.id) ?? -Infinity) < ultThrottleSec()) return;
    if (now - nativeHost.ultFlashLastAt < ultGlobalGapSec()) return;
    nativeHost.ultFlashAt.set(caster.id, now);
    nativeHost.ultFlashLastAt = now;
    const side: 'ally' | 'enemy' = caster.team === 'player' ? 'ally' : 'enemy';
    nativeHost.eyecatch = {
      casterId: caster.id, skillId: def.id,
      style: spec.style ?? ULT_CFG.style,
      title: spec.title ?? def.name, sub: spec.sub,
      tint: spec.tint ?? def.color, side,
      t0: now, paneSec: spec.paneSec ?? ULT_CFG.paneSec,
      avatarDefId: spec.avatarDefId,
    };
    // THE HELD BEAT — kind 'ultimate', never 'menu' (a menu hard-hold stops
    // its own aging); the solo-only policy applied by hand, the trace/
    // harvest idiom. A chrono skill's beat resolves to 0: its stop IS the
    // cinematic, and world seconds would eat the caster's own window.
    const holdSec = eyecatchHoldSec(spec, !!def.chrono, side);
    if (holdSec > 0
      && nativeHost.timeflow.allowHold({ id: 'ult:eyecatch', scale: 0, kind: 'ultimate' })) {
      nativeHost.timeflow.hold({ id: 'ult:eyecatch', scale: 0, kind: 'ultimate', duration: holdSec });
    }
  }

export function sceneWithMassReward<T>(nativeHost:NativeSceneCombatContextHost, level: number, action: () => T): T {
    if (!nativeHost.massRuntime?.config.progression) return action();
    const previous = nativeHost.massRewardLevel;
    nativeHost.massRewardLevel = level;
    try { return action(); } finally { nativeHost.massRewardLevel = previous; }
  }

export function sceneCompanionStanceOf(nativeHost:NativeSceneCombatContextHost, seat: Seat, skillId: string): string {
    return companionStanceIdOf(seat.meta.stances, skillId);
  }

export function sceneSetCompanionStance(nativeHost:NativeSceneCombatContextHost, seat: Seat, skillId: string, stanceId: string): boolean {
    if (!COMPANION_STANCES[stanceId]) return false;
    const held = seat.meta.knownSkills.has(skillId) || seat.actor.skills.some(s => s?.def.id === skillId);
    if (!held) return false;
    const prev = nativeHost.companionStanceOf(seat, skillId);
    seat.meta.stances[skillId] = stanceId;
    nativeHost.companionBonds.refresh();
    if (prev !== stanceId) nativeHost.companionBonds.stanceShift(nativeHost.seatHero(seat), skillId, stanceId);
    nativeHost.markMetaDirty(seat);
    nativeHost.charDirty = true;
    return prev !== stanceId;
  }

export function sceneHoldfastRouseRule(nativeHost:NativeSceneCombatContextHost, tag: string): { woundFrac: number; radius: number; toast: string; color: string; size: number } | null {
    const gd = nativeHost.holdfastGuardian();
    if (!gd || gd.neutralTag !== tag) return null;
    return { woundFrac: gd.woundFrac, radius: gd.rouseRadius, toast: 'The wardens draw steel!', color: '#d8a24a', size: 14 };
  }

export function sceneHoldfastGuardian(nativeHost:NativeSceneCombatContextHost): GuardianSpec | null {
    const site = nativeHost.holdfastSite;
    return site ? (nativeHost.sim.holdfastField?.def(site.defId)?.guardian ?? null) : null;
  }

export function sceneMassOccurrencePitContext(nativeHost:NativeSceneCombatContextHost, at:Vec2):Readonly<ZoneDef>|undefined{
    for(const[d,source]of nativeHost.massOccurrenceDecorSources){
      if(d.gone)continue;const region=pitRegionOf(d);if(!region)continue;
      if(pitAt([{x:d.pos.x,y:d.pos.y,r:d.radius,kind:d.kind,region}],nativeHost.bridges,at.x,at.y))return source.zone;
    }
    return undefined;
  }

/** Exact native global seat lookup, usable before local combat activation. */
export function sceneSeatOf(nativeHost:Pick<NativeSceneCombatContextHost,'seatByActor'>, actor:Actor):Seat|undefined { return nativeHost.seatByActor.get(actor); }
