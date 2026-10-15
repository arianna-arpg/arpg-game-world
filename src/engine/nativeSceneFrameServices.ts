import {observeNativeCombatBirth} from './nativeCombatRecordObservation';
/** Exact original42 campaign/interleaved frame FrameServices closure.
 * Runtime ownership and native scheduling are separate concrete bindings. */
import type {World} from "./world";
import type {NativeSceneCampaignFrameClosureHost} from "./nativeSceneCampaignFrameClosureHost";
import { dealMassBounties, massBountiesAvailable } from '../worldmass/bounties';
import { treePointBudget } from './skillEmpowerment';
import { fillFlaskChargeBanks } from './flaskState';
import { clamp, dist, rand, randInt, vec, type Vec2 } from '../core/math';
import { type Attributes, type SkillTag } from './stats';
import { STATUS_DEFS } from './status';
import { Actor } from './actor';
import { type PlayerInputSource, type MetaAction } from '../net/intent';
import { isDormant } from './ai';
import { makeSkillGem, SWAP_DISCIPLINE_CFG, type SkillDef, type SkillInstance, type SupportDef, type SupportInstance } from './skills';
import { autoPlace } from './inventory';
import { findBagGem, freeCellCount, makeSkillGemItem, rebuildAnyItem, skillOfGemItem, supportOfGemItem } from './gemitems';
import { type PersonalStash } from './stash';
import { type EssenceId } from '../data/essences';
import { type ItemInstance } from './items';
import { type GemFloor } from './loot';
import { VENDORS } from '../data/vendors';
import { memoryProgressionOpen, memorySecondaryOpen } from '../meta/memoryUnlocks';
import { MEMORY_UNLOCK_CFG, type MemorySecondaryMechanic } from '../data/memoryUnlocks';
import { powerProgressionRefusal } from '../data/powerProgression';
import { SKILLS } from '../data/skills';
import { FACTIONS, FIXTURE_IDS, MONSTERS } from '../data/monsters';
import { type ClassDef } from '../data/classes';
import { COOP_SCALING } from '../data/coop';
import type { CouchSeatTag } from '../data/couch';
import { SUPPORTS } from '../data/supports';
import { VOCATIONS, VOCATION_CFG, vocationDiscoveryKey, vocationLedgerKey } from '../data/vocations';
import { skyOf, START_ZONE, objectiveSeals, type ZoneDef } from '../data/zones';
import { HARVEST_CFG, harvestPayout, harvestSeqFor, harvestWindowFor } from './harvest';
import { HARVEST_HUSK_KIND } from '../data/harvest';
import { type Doodad } from './levelgen';
import { dissolveFor } from './dissolve';
import { BURST_TOUCH_PAD, lightReach, lightwellOf } from './lightwells';
import { DWELL_CFG, npcDwellReach, transitDwell, transitRadius, transitReach } from '../data/transit';
import { mintCave } from './worldgen';
import { VOYAGE_CFG, VOYAGE_ZONE_ID, islandAtCell } from '../world/voyage';
import { VOYAGE_ISLANDS } from '../data/voyageIslands';
import { shipOf } from '../data/ships';
import { townSiteAt, townSiteStructure, type TownSiteId } from '../data/townBuild';
import { rollBudgetBountyPay, ensureBountyRewardChoices } from '../data/bountyRewards';
import { BOUNTY_BOARD_CFG, BOUNTY_KINDS, bountyChargePay, bountySourceRows, liveBountyBand, rollBountyPay, type BountyKindRow, type BountyTargetRef } from '../data/bountyboard';
import { type BountyPosting, type BountyRollHost } from '../data/bountyboard';
import { SALVAGE_CFG } from '../data/essences';
import { charKeyOf, type QuestLedgerSave } from './questLedger';
import { Rng } from '../core/rng';
import { OCEAN_BIOME } from '../world/biomes';
import { bountyRoutes } from '../world/bountyRoutes';
import type { TravelRoute } from '../world/travelRoutes';
import { survivalResource } from '../world/regions';
import { coordDist } from '../world/coords';
import { PORT_CFG } from '../data/ports';
import { SEA_CFG } from '../data/seas';
import { seaAt, seaSpotsNear, type SeaPortSpot } from '../world/seas';
import { HARBORHOLD_CFG, holdActiveServices, holdClassOf, type HoldClassDef } from '../data/harborholds';
import { holdGateDoor, holdStructureIn } from '../world/harborholds';
import { bumpLedger } from '../packages/ledger';
import { strainByStatus, strainOf } from '../packages/contagionStrains';
import { packageSeed } from '../packages/registry';
import { featureEnabled, FEATURE, META_CURRENCY_LABEL, LEDGER_FLASK_LESSON, LEDGER_CORPSES_RECLAIMED, type Account } from '../meta/account';
import { stageOf, FADE_DEFAULTS } from '../meta/modes';
import { LEDGER_MERC_MARKET_MET, LEDGER_MERC_OUTPOST_FOUND, MERC_CFG } from '../meta/mercs';
import { rebuildSkill } from './nativeProgressionMeta';
import { saveAccount } from '../meta/persistence';
import { type DeathRecord, type SavedLoot } from '../meta/death';
import { settlementArmVendorStock, settlementRestockOrdinal, settlementRestockSeconds, settlementSyncHoldIdx, settlementSkillDropPool, settlementGemWeights, type NativeSettlementHost } from './nativeSettlementServices';
import { sitePlaceVocationSites } from './nativeSceneSites';
import { harborRefreshHoldDress, harborRefreshHoldServices } from './nativeSceneHarbor';
import { CONTAGION_GRAFT_KEY, hashStr } from './nativeSceneConfig';
import { OPEN_SEA_LAYOUT } from './nativeSceneConfig';
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
export interface WornGraftRow {
  slot: number;             // 0-based bar index; speak it 1-based ("Skill Slot N")
  def: SupportDef;
  level: number;
  skillId?: string;         // the skill bound at derivation time (absent = empty seat)
  state: 'live' | 'duplicate' | 'unfit' | 'empty';
}
export type VendorEntry = (
  | { kind: 'skill'; inst: SkillInstance }
  | { kind: 'support'; gem: SupportInstance }
  | { kind: 'item'; item: ItemInstance }
) & {
  /** THE DEPTH LOCK (the Delver's shelf): purchasable only once this shaft's
   *  own descent has SEEN this depth (World.delverEntryRefusal — the one
   *  predicate engine buys and panel disables share). Rolled at mint from
   *  the surge's rung table, locked forever. Absent = open at once. Other
   *  counters simply never set it. */
  depthReq?: number;
};
export const MIREILLE_RADIUS = 150;
export const MIREILLE_DWELL = 0.8;
export const MIREILLE_COOLDOWN = 5;
export const MIREILLE_GIFT_SKILLS = ['life_flask', 'mana_flask'];
export const MIREILLE_GIFT_LEDGER = 'mireille_flasks_given';
export interface MireilleLessonStep {
  id: 'learn';
  /** Live read: the gift skills this move still wants demonstrating on. */
  pendingSkills: (w: Pick<World,'meta'>) => string[];
}
export const MIREILLE_LESSON_STEPS: MireilleLessonStep[] = [
  { // seat each carried gift flask ITEM onto the rack (learn = seat = barred)
    id: 'learn',
    pendingSkills: w => MIREILLE_GIFT_SKILLS.filter(id => !w.meta.knownSkills.has(id)
      && !!findBagGem(w.meta.items, 'skill', id)),
  },
];
export const MIREILLE_LESSON_LEDGER = 'mireille_lesson_lived';
export const MIREILLE_FILL_LEDGER = LEDGER_FLASK_LESSON;
export const MIREILLE_XP_BUFF_SEC = 300;
export const MIREILLE_XP_REFRESH = 240;
export const CAMPFIRE_RADIUS = 80;
export const CAMPFIRE_DWELL = 1.1;
export const CAMPFIRE_COOLDOWN = 4;
export const AMALGAM_RADIUS = 150;
export const AMALGAM_DWELL = 1.0;
export const AMALGAM_PICK_RADIUS = 60;
export const AMALGAM_PICK_DWELL = 1.0;
export const AMALGAM_PICK_RING = 66;
export const CARAVAN_RADIUS = 160;
export const CARAVAN_DWELL = 0.9;
export const CORPSE_RADIUS = 110;
export const CORPSE_DWELL = 1.0;
export const REVIVE_RADIUS = CORPSE_RADIUS;
export const REVIVE_DWELL = 1.0;
export const REVIVE_LIFE_FRAC = 0.35;
export interface PlayerCorpse {
  pos: Vec2;
  /** Index into account.deaths (O(1) clear on reclaim; account.deaths is stable per load). */
  recordIndex: number;
  owner: string;
  who: { classId: string; level: number };
  dwell: number;
  reclaimed: boolean;
}
export interface HarvestSession {
  seatId: string; ix: number; seq: number[];
  done: number; misses: number;
  left: number; window: number;
  held: boolean; missT: number;
}
export function sceneUpdateHarvest(nativeHost:NativeSceneCampaignFrameClosureHost, rawDt: number, dt: number): void {
    // Live rites: expiry settles at whatever the entry banked — the node
    // was committed at arm; accuracy is the only open question.
    for (let i = nativeHost.harvestSessions.length - 1; i >= 0; i--) {
      const s = nativeHost.harvestSessions[i];
      s.missT = Math.max(0, s.missT - rawDt);
      s.left -= rawDt;
      if (s.left <= 0) nativeHost.harvestSettle(s, 'expiry');
    }
    nativeHost.harvestOffer.clear();
    if (dt <= 0 || !nativeHost.harvestNodes.length) return;
    // THE ARMING SCAN: human hands only: the hero's seat and couch pads arm
    // their own rites, and on a hosted world every standing player (its rite
    // rides its own row, SeatW.hv, and its symbol presses ride the input path);
    // mercs and a co-op host's remote peers never arm.
    for (const seat of nativeHost.handSeats()) {
      if (nativeHost.harvestSessions.some(s => s.seatId === seat.id)) continue;
      const a = seat.actor;
      if (a.dead || a.downed) { nativeHost.harvestDwell.delete(seat.id); continue; }
      let ix = -1;
      let best = Infinity;
      for (let k = 0; k < nativeHost.harvestNodes.length; k++) {
        const n = nativeHost.harvestNodes[k];
        if (n.spent) continue;
        if ((n.doodad.tier ?? 0) !== a.tier) continue; // THE SAME-STORY LAW: a node on another story never glints
        const g = dist(a.pos, n.pos);
        if (g <= HARVEST_CFG.armRadius + a.radius && g < best) { best = g; ix = k; }
      }
      if (ix < 0) { nativeHost.harvestDwell.delete(seat.id); continue; }
      // THE CAMP HABIT (the field discipline's own calm law, ONE config —
      // SWAP_DISCIPLINE_CFG, never a fork): a rite begins only with the
      // blood cold and no foe pressing. Until then the node just glints —
      // nothing is committed by walking a battle past it, no accidental
      // freeze can hijack a fight, and a co-op harvester is never
      // deafened (input law) with teeth already at their throat.
      const lastCombat = nativeHost.localSeat.keeper ? nativeHost.seatHero(seat).lastCombatAt : nativeHost.lastCombatAt; // THE COUNTERS AND THE JOURNAL: the seat's own blood
      if (nativeHost.time - lastCombat < SWAP_DISCIPLINE_CFG.calmSec) {
        nativeHost.harvestDwell.delete(seat.id);
        continue;
      }
      // THE RITE'S OWN FOE REACH (HARVEST_CFG.foeRadius, her ruling
      // 2026-09-11): the discipline's scan at the rite's radius — a foe a
      // field away no longer holds the node shut on a harvester already
      // standing at it.
      if (nativeHost.pressingFoeNear(a.pos, a.tier, HARVEST_CFG.foeRadius)) {
        nativeHost.harvestDwell.delete(seat.id);
        continue;
      }
      // THE CONSENT DIAL (HARVEST_CFG.consent): 'press' stands an OFFER —
      // the drawn ask names the live interact bind, and applyAction's
      // pickup verb begins the rite (a one-shot commitment is a deliberate
      // press; the probe fleet's frozen-rig class dies with the accident).
      // 'dwell' is the commission's letter: armSec of standing begins it.
      if (HARVEST_CFG.consent === 'press') {
        nativeHost.harvestOffer.set(seat.id, ix);
        continue;
      }
      const d = nativeHost.harvestDwell.get(seat.id);
      const t = (d && d.ix === ix ? d.t : 0) + dt;
      if (t >= HARVEST_CFG.armSec) {
        nativeHost.harvestDwell.delete(seat.id);
        nativeHost.harvestArm(seat, ix);
      } else {
        nativeHost.harvestDwell.set(seat.id, { ix, t });
      }
    }
  }

export function sceneUpdateModeRespawn(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const pr = nativeHost.pendingRespawn!;
    const fx = nativeHost.modeDef().respawnFx ?? FADE_DEFAULTS;
    pr.t += dt;
    if (pr.phase === 'out') {
      nativeHost.screenFade = Math.min(1, pr.t / Math.max(0.01, fx.fadeOutSec));
      if (pr.t >= fx.fadeOutSec + fx.holdSec) {
        nativeHost.performModeRespawn();
        pr.phase = 'in';
        pr.t = 0;
      }
    } else {
      nativeHost.screenFade = Math.max(0, 1 - pr.t / Math.max(0.01, fx.fadeInSec));
      if (pr.t >= fx.fadeInSec) { nativeHost.pendingRespawn = null; nativeHost.screenFade = 0; }
    }
  }

export function sceneArmBuyerShelves(nativeHost:NativeSceneCampaignFrameClosureHost, restock = false): void {
    const smith = nativeHost.actors.some(a => nativeHost.hasNpcRole(a, 'vendor') && !a.dead);
    const chandler = nativeHost.actors.some(a => nativeHost.hasNpcRole(a, 'chandler') && !a.dead);
    if (!smith && !chandler) return;
    const beat = nativeHost.restockOrdinal();
    for (const seat of nativeHost.handSeats()) {
      nativeHost.withBuyer(seat, () => {
        const armed = nativeHost.vendorArmedBeat;
        if (smith && (restock || armed.brandt !== beat)) {
          nativeHost.syncHoldIdx('brandt', nativeHost.vendorStock);
          nativeHost.vendorStock = nativeHost.armVendorStock('brandt');
          armed.brandt = beat;
        }
        if (chandler && (restock || armed.chandler !== beat)) {
          nativeHost.syncHoldIdx('chandler', nativeHost.chandlerStock);
          nativeHost.chandlerStock = nativeHost.armVendorStock('chandler');
          armed.chandler = beat;
        }
      });
    }
  }

export function sceneRestockVendor(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const beat = nativeHost.restockOrdinal();
    const smith = nativeHost.actors.find(a => nativeHost.hasNpcRole(a, 'vendor') && !a.dead);
    if (smith) {
      nativeHost.syncHoldIdx('brandt', nativeHost.vendorStock);
      nativeHost.vendorStock = nativeHost.armVendorStock('brandt');
      nativeHost.vendorArmedBeat['brandt'] = beat;
      nativeHost.text(smith.pos, `${smith.name ?? 'The vendor'} restocks the wares.`, '#e8c87a', 13);
    }
    const chandler = nativeHost.actors.find(a => nativeHost.hasNpcRole(a, 'chandler') && !a.dead);
    if (chandler) {
      nativeHost.syncHoldIdx('chandler', nativeHost.chandlerStock);
      nativeHost.chandlerStock = nativeHost.armVendorStock('chandler');
      nativeHost.vendorArmedBeat['chandler'] = beat;
      if (!smith) nativeHost.text(chandler.pos, `${chandler.name ?? 'The chandler'} restocks the wares.`, '#c8b06e', 13);
    }
    nativeHost.vendorRestockAt = (beat + 1) * nativeHost.restockSeconds();
    if (nativeHost.localSeat.keeper) nativeHost.armBuyerShelves(true); // THE SHELF PER BUYER: every buyer here restocks with the counter
  }

export function sceneUpdateBountyBoard(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const near = nativeHost.localHumanSeats().filter(s =>
      !s.actor.dead && !s.actor.downed && nativeHost.nearBountyBoard(s));
    nativeHost.watchBountyHands(dt, near.length > 0);
    // THE LIVE EDGE (the vendor restock's law): while anyone stands at the
    // board, a TURNED beat re-deals the slate in place — host only (a net
    // client's snapshot is its whole truth; it never rolls its own slate).
    const here = nativeHost.bountyBoardsHere();
    for (const b of here) {
      const bs = nativeHost.boardStateOf(b.id);
      if (near.length > 0 && !nativeHost.clientActionHook
        && bs.armedBeat >= 0 && bs.armedBeat !== nativeHost.bountyBeat()) {
        nativeHost.armBountyBoard(b.id);
      }
      // THE BOARD PER CHARACTER (a hosted world, card 24 ruled): each standing player at
      // the board is dealt its own slate (its own client lingers and opens the panel), on
      // the shared beat.
      if (nativeHost.localSeat.keeper && !nativeHost.clientActionHook) {
        for (const s of nativeHost.handSeats()) {
          if (!nativeHost.nearBountyBoard(s, b.id)) continue;
          nativeHost.withQuestHand(s, () => { if (nativeHost.boardStateOf(b.id).armedBeat !== nativeHost.bountyBeat()) nativeHost.armBountyBoard(b.id); });
        }
      }
    }
    // The arrival latch matters here: the GROWN town's waypoint stands
    // inside the board's dwell disc — coming home must never auto-open
    // the postings under the arriving feet.
    if (nativeHost.bountyGate.rearmIfWilled(near)) nativeHost.stationArmed.add('bounty'); // THE SHIMMY LAW
    const armed = nativeHost.stationDwellArmed('bounty', near.length > 0);
    const ready = near.find(s => nativeHost.seatIdle(s));
    if (!nativeHost.bountyGate.fire(!!ready && armed, near.length > 0 && armed, dt, BOUNTY_BOARD_CFG.dwell.sec)) return;
    // THE KINSHIP: the dwell fires at whichever board here the ready seat
    // stands in reach of — the panel scopes to it (one board per zone
    // today: Lastlight's, or the quay's).
    const at = here.find(b => nativeHost.nearBountyBoard(ready!, b.id)) ?? here[0];
    if (!at) return;
    // THE RETURN (BOUNTY_BOARD_CFG.counter.dwellTurnIn — the quest giver's
    // turn-ins-first order, made the board's own): every RESOLVED hand this
    // board issued turns in BEFORE the slate opens — the done work pays at
    // the reader's feet, the failed posting is handed back — through the
    // ONE turn-in door (the same intent the panel's button speaks, so the
    // pay lanes, the stamps and the turn-in refresh all arrive from
    // standing law). Host side applies to the DWELLING seat (a couch
    // guest's writ pays into the guest's own bag); a render-shell client
    // ships the intent and lets the snapshot move it.
    if (BOUNTY_BOARD_CFG.counter.dwellTurnIn) {
      for (const h of nativeHost.resolvedHandsAt(at.id)) {
        const action: MetaAction = { t: 'bountyTurnIn', id: h.id };
        if (nativeHost.clientActionHook) nativeHost.requestMeta(action);
        else nativeHost.applyAction(ready!, action);
      }
    }
    if (!nativeHost.clientActionHook) nativeHost.armBountyBoard(at.id);
    nativeHost.bountyDwellRequested = true;
    nativeHost.bountyDwellSeatId = ready!.id;
    nativeHost.bountyDwellBoardId = at.id;
  }

export function sceneUpdateCampfire(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    if (nativeHost.isCampaignFrameOwner() && nativeHost.campfireCd > 0) nativeHost.campfireCd -= dt;
    const near = nativeHost.isPresentLocalPlayer() && !nativeHost.player.dead && !nativeHost.player.downed && nativeHost.nearCampfire();
    const armed = nativeHost.stationDwellArmed('campfire', near);
    if (!near || !armed || !nativeHost.playerIdle()) {
      nativeHost.campfireDwell = 0;
      return;
    }
    nativeHost.campfireDwell += dt;
    if (nativeHost.campfireDwell >= CAMPFIRE_DWELL && nativeHost.campfireCd <= 0) {
      nativeHost.campfireDwell = 0;
      nativeHost.campfireCd = CAMPFIRE_COOLDOWN;
      nativeHost.refreshZones();
    }
  }

export function sceneUpdateCaravan(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    // Any LOCAL hand at the Caravanner holds the latch; the first idle one fires
    // (local hero checked first — solo is order-identical, see localHumanSeats).
    const near = nativeHost.localHumanSeats().filter(s =>
      !s.actor.dead && !s.actor.downed && nativeHost.nearCaravan(s));
    if (nativeHost.caravanGate.rearmIfWilled(near)) nativeHost.stationArmed.add('caravan'); // THE SHIMMY LAW
    const armed = nativeHost.stationDwellArmed('caravan', near.length > 0);
    const ready = near.find(s => nativeHost.seatIdle(s));
    // Fires ONCE per approach (consumed until every hand steps OUT of range
    // — or, THE SHIMMY LAW, takes a willed step where it stands) — so
    // closing the menu while still standing here won't re-open it by itself.
    if (!nativeHost.caravanGate.fire(!!ready && armed, near.length > 0 && armed, dt, CARAVAN_DWELL)) return;
    nativeHost.caravanDwellSeatId = ready!.id; // WHO asked — the menu + the band pick follow
    if (nativeHost.zone.id === START_ZONE) {
      nativeHost.caravanDwellRequested = true; // in town: the main loop opens the band menu
    } else {
      nativeHost.caravanReturnRequested = true; // in the wilds: port straight home, no menu
    }
  }

export function sceneUpdateFont(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const near = nativeHost.localHumanSeats().filter(s =>
      !s.actor.dead && !s.actor.downed && nativeHost.nearFont(s));
    if (nativeHost.fontGate.rearmIfWilled(near)) nativeHost.stationArmed.add('font'); // THE SHIMMY LAW
    const armed = nativeHost.stationDwellArmed('font', near.length > 0);
    const ready = near.find(s => nativeHost.seatIdle(s));
    if (!nativeHost.fontGate.fire(!!ready && armed, near.length > 0 && armed, dt, SALVAGE_CFG.stationDwell)) return;
    nativeHost.fontDwellRequested = true;
    nativeHost.fontDwellSeatId = ready!.id;
  }

export function sceneUpdateHarborBoard(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const engaged = nativeHost.isPresentLocalPlayer() && nativeHost.nearHarborBoard();
    nativeHost.harborGate.rearmIfWilled(nativeHost.isPresentLocalPlayer() ? [nativeHost.localSeat] : []); // THE SHIMMY LAW
    if (!nativeHost.harborGate.fire(engaged && nativeHost.playerIdle(), !!engaged, dt, CARAVAN_DWELL)) return;
    nativeHost.harborDwellRequested = true;
  }

export function sceneUpdateHoldDefense(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    void dt;
    const d = nativeHost.holdDefense;
    if (!d || nativeHost.gameOver) return;
    if (nativeHost.zone.id !== d.zoneId) { nativeHost.holdDefense = null; return; } // belt — the reset registry is the law
    const hold = nativeHost.zone.harborhold;
    if (!hold) { nativeHost.holdDefense = null; return; }
    const cls = holdClassOf(hold);
    const ward = d.wardId !== null ? nativeHost.actorById(d.wardId) : null;
    if (!ward || ward.dead) { nativeHost.resolveHoldDefense(false); return; }
    if (nativeHost.time >= d.pulseAt) {
      d.pulseAt = nativeHost.time + cls.siege.beaconSec;
      for (const id of d.alive) {
        const a = nativeHost.actorById(id);
        if (a && !a.dead) a.addThreat(ward.id, cls.siege.pulseThreat);
      }
    }
    for (const id of [...d.alive]) {
      const a = nativeHost.actorById(id);
      if (!a || a.dead) d.alive.delete(id);
    }
    if (d.phase === 'arming' || d.phase === 'breather') {
      if (nativeHost.time >= d.phaseAt) {
        d.wave++;
        d.toSpawn = nativeHost.encRng.int(cls.siege.batch[0], cls.siege.batch[1]) + cls.siege.perWave * (d.wave - 1);
        d.phase = 'wave';
        d.spawnAt = nativeHost.time;
        // The arming shield drops with the first wave — the fight is real now.
        ward.untargetable = false;
        ward.invulnerable = false;
        if (d.wave === 1) {
          // THE DRAFT: the sleeping camp watch stands with its tide — every
          // dormant silhouette wakes into wave 1, grafted like the rest.
          for (const a of nativeHost.actors) {
            if (a.tag !== 'hold_camp' || a.dead) continue;
            a.aiAwakened = true;
            a.postSpec = undefined;
            a.aiPost = undefined;
            const ag = a.defId ? MONSTERS[a.defId]?.aggro : undefined;
            a.aiTuning = {
              target: {
                prefer: 'highestThreat', relentless: true, stickiness: cls.siege.stickiness,
                threat: { damage: ag?.fury ?? 1, decay: cls.siege.decay * (ag?.waver ?? 1) },
              },
            };
            a.addThreat(ward.id, cls.siege.seedThreat * (ag?.fixation ?? 1));
            a.aiTargetId = ward.id;
            a.aggroed = true;
            a.tag = 'hold_siege';
            d.alive.add(a.id);
          }
        }
        nativeHost.text(vec(ward.pos.x, ward.pos.y - 52),
          `wave ${d.wave} of ${cls.siege.waves} — hold the gate!`, '#e85050', 16);
      }
      return;
    }
    if (d.toSpawn > 0 && nativeHost.time >= d.spawnAt && d.alive.size < cls.siege.fieldCap) {
      d.toSpawn--;
      d.spawnAt = nativeHost.time + 0.55;
      nativeHost.spawnHoldBesieger(cls, ward);
    }
    if (d.toSpawn <= 0 && d.alive.size === 0) {
      if (d.wave >= cls.siege.waves) { nativeHost.resolveHoldDefense(true); return; }
      d.phase = 'breather';
      d.phaseAt = nativeHost.time + nativeHost.encRng.range(cls.siege.breatherSec[0], cls.siege.breatherSec[1]);
      nativeHost.text(vec(ward.pos.x, ward.pos.y - 52), 'the tide gathers again…', '#e8a050', 14);
    }
  }

export function sceneUpdateMireille(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    if (nativeHost.isCampaignFrameOwner()) {
    if (nativeHost.mireilleCd > 0) nativeHost.mireilleCd -= dt;
    // THE AFTERGLOW clears the moment the player steps out of her reach —
    // the send-off is said to a present guest, and the return visit meets
    // her standing lines. (Flag-gated so the extra scan only runs during
    // the brief window itself.)
    if (nativeHost.mireilleAfterglow && nativeHost.getMireille() === null) nativeHost.mireilleAfterglow = false;
    // THE END-STATE BELT: with her gift handed over and no step still
    // pending — flasks learned and barred, or the gems traded away — the
    // lesson CLOSES, and the close is LEDGERED (a resumed save that lived
    // the loop before the latch existed self-heals here too). Idempotent,
    // and no proximity: the lesson completes the moment it is lived,
    // wherever that happens — she need never witness it. (Skipped once
    // lived: the latch never needs re-proving.)
    if (nativeHost.ledger[MIREILLE_GIFT_LEDGER] && !nativeHost.mireilleLessonLived()
      && nativeHost.mireilleLessonStep() === null) {
      nativeHost.mireilleStampLived();
    }
    // THE GRADUATION (account-wide, self-healing): the moment this run's
    // ledger shows the lesson lived — closed fresh by the belt above or
    // unlearnSkill's inversion, or the reward already paid by a save
    // carried in from before graduation existed — the ACCOUNT learns it
    // forever. Stamped live (not death-deferred) so even a vessel started
    // five minutes later skips the re-walk; accountDirty has main.ts
    // persist it before any quit can lose it.
    if (nativeHost.mireilleLessonLived()
      && !(nativeHost.account.ledger[LEDGER_FLASK_LESSON] ?? 0)) {
      nativeHost.account.ledger[LEDGER_FLASK_LESSON] = 1;
      nativeHost.accountDirty = true;
    }
    // The lesson pays its once-only fill wherever the final flask is learned.
    // Only the nearby teacher speaks the send-off.
    if (nativeHost.ledger[MIREILLE_GIFT_LEDGER] && !nativeHost.ledger[MIREILLE_FILL_LEDGER]
      && !nativeHost.player.dead && !nativeHost.player.downed
      && nativeHost.mireilleLessonStep() === null) {
      bumpLedger(nativeHost.ledger, MIREILLE_FILL_LEDGER);
      nativeHost.charDirty = true;
      const p = nativeHost.player;
      fillFlaskChargeBanks(p, MIREILLE_GIFT_SKILLS.flatMap(sid => {
        const inst = nativeHost.meta.knownSkills.get(sid); return inst ? [inst] : [];
      }));
      if (nativeHost.getMireille()) nativeHost.text(p.pos, 'Mireille: there, love — full to the brim.', '#a0d8a0', 14);
      // THE AFTERGLOW: her send-off replaces the locked-care pitch until
      // the player steps away — no mid-breath pivot from teacher to
      // landlady. Only a lesson that truly ended with a SEATED flask earns
      // it; the traded-away close keeps her standing line instead.
      nativeHost.mireilleAfterglow = nativeHost.getMireille() !== null && MIREILLE_GIFT_SKILLS.some(sid => nativeHost.meta.knownSkills.has(sid));
    }
    }
    // THE COUNTERS AND THE JOURNAL (a hosted world): every standing player lingers
    // for itself (mireilleSeatStep); the keeper never asks.
    if (nativeHost.localSeat.keeper) { for (const s of nativeHost.handSeats()) nativeHost.mireilleSeatStep(s, dt); return; }
    // Dwell only builds toward an AVAILABLE service: not while dead, away from
    // her, or while the player is acting. Her WELCOME GIFT (the flasks) needs
    // no unlock — the dwell builds for it even on a fresh account.
    if (!nativeHost.isPresentLocalPlayer() || nativeHost.player.dead || nativeHost.player.downed || nativeHost.getMireille() === null
      || (!nativeHost.mireilleUnlocked() && !nativeHost.mireilleGiftOwed()) || !nativeHost.playerIdle()) {
      nativeHost.mireilleDwell = 0;
      return;
    }
    nativeHost.mireilleDwell += dt;
    if (nativeHost.mireilleDwell >= MIREILLE_DWELL && nativeHost.mireilleCd <= 0 && nativeHost.mireilleService()) {
      nativeHost.mireilleDwell = 0;
      nativeHost.mireilleCd = MIREILLE_COOLDOWN;
    }
  }

export function sceneUpdateMusterHorn(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    if (nativeHost.gameOver || nativeHost.clientActionHook || !nativeHost.zone.harborhold) return;
    if (!nativeHost.doodads.some(d => d.kind === 'muster_horn')) return; // nearMusterHorn reads the horn itself
    const M = HARBORHOLD_CFG.muster;
    const engaged = nativeHost.isPresentLocalPlayer() && nativeHost.nearMusterHorn();
    nativeHost.holdGate.rearmIfWilled(nativeHost.isPresentLocalPlayer() ? [nativeHost.localSeat] : []); // THE SHIMMY LAW
    if (!nativeHost.holdGate.fire(engaged && nativeHost.playerIdle(), engaged, dt, M.dwellSec)) return;
    nativeHost.holdDwellRequested = true;
  }

export function sceneUpdateOracle(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const near = nativeHost.localHumanSeats().filter(s =>
      !s.actor.dead && !s.actor.downed && nativeHost.nearOracle(s));
    if (nativeHost.oracleGate.rearmIfWilled(near)) nativeHost.stationArmed.add('oracle'); // THE SHIMMY LAW
    const armed = nativeHost.stationDwellArmed('oracle', near.length > 0);
    const ready = near.find(s => nativeHost.seatIdle(s));
    if (!nativeHost.oracleGate.fire(!!ready && armed, near.length > 0 && armed, dt, SALVAGE_CFG.stationDwell)) return;
    nativeHost.oracleDwellRequested = true;
    nativeHost.oracleDwellSeatId = ready!.id;
  }

export function sceneUpdateSail(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const dock = nativeHost.portDock();
    const engaged = nativeHost.isPresentLocalPlayer() && !!dock && dist(nativeHost.player.pos, dock.pos) <= 110
      && nativeHost.dwellReachable(nativeHost.player.pos, dock.pos, DWELL_CFG.reach, nativeHost.storyPair(nativeHost.player, dock));
    nativeHost.sailGate.rearmIfWilled(nativeHost.isPresentLocalPlayer() ? [nativeHost.localSeat] : []); // THE SHIMMY LAW
    if (!nativeHost.sailGate.fire(engaged && nativeHost.canSail() && nativeHost.playerIdle(), engaged, dt, CARAVAN_DWELL)) return;
    nativeHost.enterSailing();
  }

export function sceneUpdateSalvage(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    // Any LOCAL hand at the bench holds the latch; the first idle one fires
    // (local hero checked first — solo is order-identical, see localHumanSeats).
    const near = nativeHost.localHumanSeats().filter(s =>
      !s.actor.dead && !s.actor.downed && nativeHost.nearSalvage(s));
    if (nativeHost.salvageGate.rearmIfWilled(near)) nativeHost.stationArmed.add('salvage'); // THE SHIMMY LAW
    const armed = nativeHost.stationDwellArmed('salvage', near.length > 0);
    const ready = near.find(s => nativeHost.seatIdle(s));
    if (!nativeHost.salvageGate.fire(!!ready && armed, near.length > 0 && armed, dt, SALVAGE_CFG.stationDwell)) return;
    nativeHost.salvageDwellRequested = true;
    nativeHost.salvageDwellSeatId = ready!.id;
  }

export function sceneUpdateTraces(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    for (const r of [...nativeHost.traceRuns]) {
      const seat = nativeHost.seats.find(s => s.id === r.seatId);
      if (!seat || seat.actor.dead || seat.actor.downed) {
        if (r.held) nativeHost.timeflow.release('trace');
        nativeHost.traceRuns.splice(nativeHost.traceRuns.indexOf(r), 1);
      }
    }
  }

export function sceneUpdateTracker(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const near = nativeHost.localHumanSeats().filter(s =>
      !s.actor.dead && !s.actor.downed && nativeHost.nearTracker(s));
    if (nativeHost.trackerGate.rearmIfWilled(near)) nativeHost.stationArmed.add('tracker'); // THE SHIMMY LAW
    const armed = nativeHost.stationDwellArmed('tracker', near.length > 0);
    const ready = near.find(s => nativeHost.seatIdle(s));
    if (!nativeHost.trackerGate.fire(!!ready && armed, near.length > 0 && armed, dt, SALVAGE_CFG.stationDwell)) return;
    nativeHost.trackerDwellRequested = true;
    nativeHost.trackerDwellSeatId = ready!.id;
  }

export function sceneUpdateTreePips(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (nativeHost.treePopupRequested) return;
    for (const seat of nativeHost.localHumanSeats()) {
      const queue = nativeHost.pendingTreePips.get(seat.id);
      if (!queue?.length) continue;
      if (seat.actor.dead || seat.actor.downed) continue;
      if (nativeHost.swapRefusal(seat, 'socket') !== null) continue;
      const skillId = queue.shift()!;
      if (!queue.length) nativeHost.pendingTreePips.delete(seat.id);
      // The skill may have been unlearned (or the point spent from the
      // drawer) while the pip waited — offer only what still has an
      // unspent point to place.
      const inst = seat.meta.knownSkills.get(skillId);
      if (!inst?.def.tree || nativeHost.memorySecondaryRefusal(skillId) || treePointBudget(inst).free === 0) continue;
      nativeHost.treePopupRequested = true;
      nativeHost.treePopupSeatId = seat.id;
      nativeHost.treePopupSkillId = skillId;
      return;
    }
  }

export function sceneUpdateVendors(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    let engaged = false;
    let ready: Seat | null = null;
    for (const s of nativeHost.localHumanSeats()) {
      if (s.actor.dead || s.actor.downed) continue;
      for (const v of VENDORS) {
        if (!v.near(nativeHost, s)) continue;
        engaged = true;
        if (v.stock(nativeHost).length > 0 && nativeHost.seatIdle(s)) { ready = s; break; }
      }
      if (ready) break;
    }
    nativeHost.vendorGate.rearmIfWilled(nativeHost.localHumanSeats()); // THE SHIMMY LAW
    if (!nativeHost.vendorGate.fire(!!ready, engaged, dt, SALVAGE_CFG.stationDwell)) return;
    nativeHost.vendorDwellRequested = true;
    nativeHost.vendorDwellSeatId = ready!.id;
  }

export function sceneUpdateAmalgamation(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const site = nativeHost.amalgamSite;
    const af = nativeHost.sim.amalgamationField;
    if (!site || !af) { nativeHost.amalgamNecroDwell = 0; nativeHost.amalgamPickDwell = []; return; }
    const info = af.activeIn(site.zoneId);
    if (!info) return;
    // Health preservation across leaves (Hunt-style): sync the live boss each frame.
    if (site.bossId != null) {
      const boss = nativeHost.actorById(site.bossId);
      if (boss && !boss.dead) af.setBossLife(boss.life / Math.max(1, boss.maxLife()));
    }
    if (!nativeHost.isPresentLocalPlayer() || nativeHost.player.dead || nativeHost.player.downed || !nativeHost.playerIdle()) {
      nativeHost.amalgamNecroDwell = 0; nativeHost.amalgamPickDwell = []; return;
    }
    if (info.quest === 'offer') {
      nativeHost.amalgamPickDwell = [];
      const necro = nativeHost.actorById(site.necroId);
      if (necro && dist(necro.pos, nativeHost.player.pos) <= AMALGAM_RADIUS
        && nativeHost.dwellReachable(nativeHost.player.pos, necro.pos, npcDwellReach('bonewright'), nativeHost.storyPair(nativeHost.player, necro))) {
        nativeHost.amalgamNecroDwell += dt;
        if (nativeHost.amalgamNecroDwell >= AMALGAM_DWELL) { nativeHost.amalgamNecroDwell = 0; nativeHost.acceptAmalgamHunt(); }
      } else nativeHost.amalgamNecroDwell = 0;
    } else if (info.quest === 'choose') {
      nativeHost.amalgamNecroDwell = 0;
      const spots = nativeHost.amalgamPickSpots(site.center, info.offered);
      if (nativeHost.amalgamPickDwell.length !== spots.length) nativeHost.amalgamPickDwell = spots.map(() => 0);
      for (let i = 0; i < spots.length; i++) {
        if (dist(spots[i].pos, nativeHost.player.pos) <= AMALGAM_PICK_RADIUS
          && nativeHost.dwellReachable(nativeHost.player.pos, spots[i].pos, DWELL_CFG.reach, nativeHost.storyPair(nativeHost.player))) {
          nativeHost.amalgamPickDwell[i] += dt;
          if (nativeHost.amalgamPickDwell[i] >= AMALGAM_PICK_DWELL) {
            nativeHost.amalgamPickDwell[i] = 0;
            nativeHost.graftAmalgamPart(spots[i].partId);
            break; // a pick mutates state — re-evaluate next frame
          }
        } else nativeHost.amalgamPickDwell[i] = 0;
      }
    } else {
      nativeHost.amalgamNecroDwell = 0; nativeHost.amalgamPickDwell = [];
    }
  }

export function sceneUpdateDelver(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    if (!nativeHost.descentSite || nativeHost.descentRun || nativeHost.descentSpent.has(nativeHost.zone.id)) return;
    if (!nativeHost.isPresentLocalPlayer() || nativeHost.player.dead || nativeHost.player.downed) { nativeHost.descentShaftDwell = 0; return; }
    if (dist(nativeHost.player.pos, nativeHost.descentSite.platform) <= transitRadius('descent_shaft', 72) && nativeHost.playerIdle()
      && nativeHost.dwellReachable(nativeHost.player.pos, nativeHost.descentSite.platform, transitReach('descent_shaft'), nativeHost.storyPair(nativeHost.player))) {
      nativeHost.descentShaftDwell += dt;
      if (nativeHost.descentShaftDwell >= transitDwell('descent_shaft')) { nativeHost.descentShaftDwell = 0; nativeHost.descend(); }
    } else nativeHost.descentShaftDwell = 0;
  }

export function sceneUpdateDescent(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const run = nativeHost.descentRun, df = nativeHost.sim.descentField;
    if (!run || !df) return;
    // A retained dive owns its pressure and terrain. Native waypoint departure
    // leaves the run intact; pause this singular-hero work while that hero is away.
    if (nativeHost.zone.id !== run.caveId || !nativeHost.isPresentLocalPlayer()) return;
    const cfg = df.surge();
    if (nativeHost.player.dead || nativeHost.player.downed) return; // death → onPlayerDown → resurface
    const p = nativeHost.player.pos;
    // DARKNESS encroaches. The consume check is PREDICTIVE — resurface the frame
    // the drain would empty the meter, BEFORE drainSurvival can see zero: in the
    // abyss the dark takes you whole, it never gnaws (the light row's underflow
    // ramp belongs to the surface Gloaming, and must not fire down here). The
    // prediction reads the SAME eased rate drainSurvival will apply (THE EASE
    // LAW — survivalDrainRate is the one fold), so a Lampkeeper roll can never
    // be consumed while its meter still holds.
    const drainNow = nativeHost.survivalDrainRate(nativeHost.player, 'light', cfg.drainRate);
    if ((nativeHost.player.survival?.get('light') ?? cfg.lightMax) - drainNow * dt <= 0) { nativeHost.resurfaceFromDescent('consumed'); return; }
    nativeHost.drainSurvival(nativeHost.player, 'light', cfg.drainRate, dt);
    // LIGHT spots push the dark back — served by the lightwell fabric's BURST
    // lane now (updateLightwells; the row registers in defs/descent.ts with
    // this surge's own grant): same run-over trigger, same one-gulp refill,
    // and a spot's glow still never shelters (bursts are not light cover).
    // DEPTH: how far you've delved from the shaft — scales danger + payout.
    run.depth = Math.floor(dist(p, run.origin) / Math.max(1, cfg.depthUnit));
    // THE DEPTH LOCKS' witness: the shaft's shelf unlocks whatever this dive
    // has SEEN — recorded live, so the dark taking you forfeits nothing seen.
    if (run.depth > (nativeHost.descentDeepest.get(run.parentCaveId) ?? 0)) {
      nativeHost.descentDeepest.set(run.parentCaveId, run.depth);
    }
    // THE PRESSURE LADDER: the abyss's OWN zone level climbs with depth —
    // drops, XP, gem ilvls and fresh spawns all read the one live truth (the
    // quickening's level-surge precedent, confined to the dive's spent
    // ground; resurface hands the entry level back).
    nativeHost.zone.level = run.baseLevel + Math.floor(run.depth * cfg.levelPerDepth);
    // Continuous Depthkin pressure (faster the deeper you are) — floor + ramp
    // are the surge's own data, not engine literals.
    nativeHost.descentSpawnTimer -= dt;
    if (nativeHost.descentSpawnTimer <= 0) {
      nativeHost.descentSpawnTimer = Math.max(cfg.spawnIntervalFloor, cfg.spawnInterval - run.depth * cfg.spawnRampPerDepth);
      nativeHost.spawnDepthkin(cfg);
    }
    // Stream terrain around the player + cull what falls far behind into the dark.
    nativeHost.streamDescentTerrain(cfg);
    for (let i = nativeHost.actors.length - 1; i >= 0; i--) {
      const a = nativeHost.actors[i];
      if (a.team === 'enemy' && a.faction === cfg.faction && !a.dead && dist(a.pos, p) > cfg.cullRadius) {
        nativeHost.actors.splice(i, 1);
        nativeHost.retireCombatBody(a);
      }
    }
  }

export function sceneUpdateDownedCompanions(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    for (const a of nativeHost.actors) {
      if (!a.companion || a.dead || !a.downed || a.companionDormant) continue;
      // THE REVIVE RINGS: the 'revive:companion' transit row is the reach,
      // the discipline (the ally revive's own dwellReachable — a wall between
      // keeper and beast blocks the tending exactly as it blocks the knee)
      // and the clock; reviveTargetsView draws the ring from the same row.
      const tended = nativeHost.frameSeats().some(s => !s.actor.dead && !s.actor.downed
        && dist(s.actor.pos, a.pos) <= transitRadius('revive:companion', REVIVE_RADIUS)
        && nativeHost.dwellReachable(s.actor.pos, a.pos, transitReach('revive:companion'), nativeHost.storyPair(s.actor, a))
        && nativeHost.seatIdle(s));
      a.companionReviveDwell = tended ? a.companionReviveDwell + dt : 0;
      if (a.companionReviveDwell >= transitDwell('revive:companion', REVIVE_DWELL)) nativeHost.reviveCompanion(a);
    }
  }

export function sceneUpdateDownedSeats(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    for (const seat of nativeHost.frameSeats()) {
      if (!seat.actor.downed) { if (seat.reviveDwellBy.size) seat.reviveDwellBy.clear(); continue; }
      for (const ally of nativeHost.frameSeats()) {
        if (ally === seat || ally.actor.dead || ally.actor.downed) continue;
        if (ally.keeper) {
          // keeperSeat — THE MERCY: the warden revives by CLOCK, never by
          // reach, and only once no other seat stands to kneel.
          // THE ACTING SEAT: a body whose stage ends the run on death is the
          // covenant's (server/vessel.ts), never the mercy's; and only a PARTY
          // MATE within reach could kneel, so a stranger near never withholds it.
          if (stageOf(seat.meta.modeId, seat.meta.modeStage).onDeath === 'end') { seat.reviveDwellBy.delete(ally.id); continue; }
          // THE PARTY THAT READS (card 28): once the wait is over (THE RELEASE, THE BLEED-OUT)
          // no mate's standing holds the mercy back (no player holds another hostage).
          const anyOther = !(nativeHost.partyDowns?.waitEnded(seat.id) ?? false) && nativeHost.frameSeats().some(o => o !== seat && !o.keeper && !o.actor.dead && !o.actor.downed
            && nativeHost.sameParty(seat, o)
            && (COOP_SCALING.shareRadius <= 0 || dist(o.actor.pos, seat.actor.pos) <= COOP_SCALING.shareRadius)); // THE NEAR LAW
          if (anyOther) { seat.reviveDwellBy.delete(ally.id); continue; }
          const t = (seat.reviveDwellBy.get(ally.id) ?? 0) + dt;
          seat.reviveDwellBy.set(ally.id, t);
          if (t >= ally.keeper.reviveSec) { nativeHost.reviveSeat(seat); break; }
          continue;
        }
        // THE REVIVE RINGS: reach, discipline and clock are the 'revive'
        // transit row's (data/transit.ts) — the same row reviveTargetsView
        // draws the ring from, so drawn == dwelt by construction.
        const close = dist(ally.actor.pos, seat.actor.pos) <= transitRadius('revive', REVIVE_RADIUS)
          && nativeHost.dwellReachable(ally.actor.pos, seat.actor.pos, transitReach('revive'), nativeHost.storyPair(ally.actor, seat.actor));
        if (close && nativeHost.seatIdle(ally)) {
          const t = (seat.reviveDwellBy.get(ally.id) ?? 0) + dt;
          seat.reviveDwellBy.set(ally.id, t);
          if (t >= transitDwell('revive', REVIVE_DWELL)) { nativeHost.reviveSeat(seat); break; }
        } else {
          seat.reviveDwellBy.delete(ally.id); // moved off / acted → progress lost
        }
      }
    }
  }

export function sceneUpdateGloaming(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    // SOVEREIGNTY: sky — the gloom is weather (the derived census, probe_tiers RIG T).
    const gf = nativeHost.sim.gloamingField;
    if (!gf) { nativeHost.gloomCur = 0; return; }
    const cfg = gf.surge();
    // THE BITING HOURS (surge.bite — the radiance fabric's one condition
    // vocabulary): the risen dark has TEETH only while the condition holds.
    // The front's world-map life (territory, march, rim news) runs on its
    // own clock regardless, but the in-zone bite eases to ZERO outside its
    // hours — and everything downstream (drain, darkness, wash, veil,
    // wells, witness, the vignette) rides the ONE eased gloomCur, so dusk
    // and dawn arrive over easeSec like the weather they are. Out of hours
    // the covered ground falls under THE DAYLOCK (below): the lamp holds,
    // it is never absolved.
    const biting = nativeHost.radianceCondHeld(cfg.bite);
    const covered = skyOf(nativeHost.zone) !== 'sheltered' && gf.gloomOn(nativeHost.zone.id) > 0.001;
    const target = covered && biting ? gf.gloomOn(nativeHost.zone.id) : 0;
    // Ease toward the front's target — EXCEPT across a zone change: arriving
    // in a gloomed zone is honest (the dark does not fade in politely).
    if (nativeHost.gloomZone !== nativeHost.zone.id) {
      nativeHost.gloomCur = target;
      nativeHost.gloomZone = nativeHost.zone.id;
      nativeHost.gloamWellTimer = cfg.wells.firstSec;
    } else {
      nativeHost.gloomCur += (target - nativeHost.gloomCur) * Math.min(1, dt / Math.max(0.1, cfg.easeSec));
      if (Math.abs(target - nativeHost.gloomCur) < 0.004) nativeHost.gloomCur = target;
    }

    // THE FRONT OUTLASTED: a witnessed gloaming that has fully receded banks
    // the survival ledger once, on the observed transition (resume-safe).
    // THE SPLIT DISPATCH (shard M1-W3): every World watches its own edge and
    // floats the word over its own players; the ledger (one, aliased) is
    // banked by the keeper alone, so the edge counts once however many units wake.
    const phase = gf.phaseNow();
    if (nativeHost.isCampaignFrameOwner()) {
    if (nativeHost.gloamPrevPhase !== 'idle' && phase === 'idle' && gf.isWitnessed()) {
      if (nativeHost.isCampaignFrameOwner()) bumpLedger(nativeHost.ledger, 'gloaming_survived');
      if (nativeHost.isPresentLocalPlayer()) nativeHost.text(nativeHost.player.pos, 'the gloaming is outlasted', '#d8cfa8', 13);
    }
    nativeHost.gloamPrevPhase = phase;
    }

    // CLEAR GROUND: the meter recovers fast once the dark lifts, and the HUD
    // bar retires at full (mirrors the Descent's delete-on-resurface).
    if (target <= 0) {
      // …but NEVER while a DESCENT run holds the meter: in the abyss the lamp
      // belongs to the dive (its own drain + light-spot bursts). Without this
      // guard the surface fabric "recovered" the freshly-lit lamp to full and
      // retired it EVERY frame — no light bar, every light spot a no-op, and
      // the dark could never consume anyone (the meter always read absent).
      if (nativeHost.descentRun) return;
      if (nativeHost.gloomCur <= 0.01) {
        nativeHost.gloomCur = 0;
        // THE DAYLOCK: while the front still STANDS over this ground out of
        // its biting hours, the lamp is HELD — frozen exactly where daybreak
        // found it. No drain (upstream), no recovery (here), no well feeds
        // or flares (updateLightwells), no bar (drawSurvival), and the panic
        // clock clears so a re-engaged empty lamp panics afresh, never off a
        // stale night. Daylight suspends the dark's bill; it never pays it.
        // Only ground the front does NOT cover recovers below — clear ground
        // absolves, held ground merely waits for dusk.
        if (covered) {
          for (const s of nativeHost.frameSeats()) {
            if (s.actor?.underflowSince) delete s.actor.underflowSince.light;
          }
          return;
        }
        for (const s of nativeHost.frameSeats()) {
          const a = s.actor;
          const cur = a?.survival?.get('light');
          if (a && cur !== undefined) {
            const max = survivalResource('light')?.max ?? 100;
            const next = Math.min(max, cur + cfg.recoverPerSec * dt);
            if (next >= max) a.survival!.delete('light');
            else a.survival!.set('light', next);
          }
        }
      }
      return;
    }

    // THE EVENT'S OWN LIGHTS: keep gloomwells fielded through the zone —
    // intermittent, capped, seeded near the party but never on top of it,
    // never stacked, never in rock. Placement rolls ride the world rng (the
    // front's world-map clock stays the overlay's own deterministic stream).
    if (nativeHost.gloomCur > 0.15) {
      nativeHost.gloamWellTimer -= dt;
      if (nativeHost.gloamWellTimer <= 0) {
        nativeHost.gloamWellTimer = rand(cfg.wells.everySec[0], cfg.wells.everySec[1]);
        const alive = nativeHost.lightwellDoodads().filter(d => d.kind === cfg.wells.kind && d.well);
        if (alive.length < cfg.wells.cap) {
          const seatArr = nativeHost.frameSeats().filter(s => s.actor && !s.actor.dead);
          const anchor = seatArr.length ? seatArr[randInt(0, seatArr.length - 1)].actor!.pos : nativeHost.isPresentLocalPlayer() ? nativeHost.player.pos : null;
          for (let tries = 0; anchor && tries < 14; tries++) {
            const ang = rand(0, Math.PI * 2);
            const r = rand(cfg.wells.nearR[0], cfg.wells.nearR[1]);
            const p = vec(anchor.x + Math.cos(ang) * r, anchor.y + Math.sin(ang) * r);
            if (p.x < 60 || p.y < 60 || p.x > nativeHost.arena.w - 60 || p.y > nativeHost.arena.h - 60) continue;
            if (nativeHost.walk && !nativeHost.walk.isWalkable(p.x, p.y)) continue;
            if (nativeHost.pointInSolid(p.x, p.y, 20)) continue;
            if (alive.some(d => dist(d.pos, p) < cfg.wells.minSep)) continue;
            const d = nativeHost.spawnLightwell(cfg.wells.kind, p);
            if (d) {
              nativeHost.flashes.push({ pos: vec(p.x, p.y), radius: 110, color: '#ffe08a', life: 0.6, maxLife: 0.6 });
              nativeHost.text(vec(p.x, p.y - 18), 'a light flares through the murk', '#ffe08a', 12);
            }
            break;
          }
        }
      }
    }

    // THE DARK DRINKS YOU: seats outside every light's reach bleed the meter,
    // scaled by the gloom's depth (the rim is a warning, the deep is a bill).
    if (nativeHost.gloomCur > 0.02) {
      for (const s of nativeHost.frameSeats()) {
        const a = s.actor;
        if (!a || a.dead || a.downed) continue;
        if (nativeHost.lightCoverAt(a.pos)) continue;
        nativeHost.drainSurvival(a, 'light', cfg.drainPerSec * nativeHost.gloomCur, dt);
      }
    }

    // GLOOM GRANTS (the fog fabric's filter grammar): bodies in the dark
    // outside light wear the veil — sight shrinks, presence dims. The dark's
    // own kin (notFactions) hunt unimpaired: the front is their home.
    if (nativeHost.gloomCur > 0.2 && cfg.grants.length) {
      for (const a of nativeHost.actors) {
        if (a.dead) continue;
        if (nativeHost.lightCoverAt(a.pos)) continue;
        for (const row of cfg.grants) {
          if (row.notFactions && a.faction && row.notFactions.includes(a.faction)) continue;
          a.applyStatus(row.status, 0, 1, 'The Gloaming');
        }
      }
    }

    // DISCOVERY: standing in the deep dark is how the world learns its name.
    if (nativeHost.isPresentLocalPlayer() && nativeHost.gloomCur >= 0.9 && !gf.isWitnessed()) {
      gf.markWitnessed();
      bumpLedger(nativeHost.ledger, 'gloaming_seen');
      nativeHost.text(nativeHost.player.pos, 'THE GLOAMING — the dark itself, risen', '#a89ad0', 15);
    }

    // CO-OCCURRENCE (surge.pairs, open by overlay id): another event live in
    // THIS zone under real gloom — the three-way light war and its kin —
    // announced once per front through the field's own news queue. Detection
    // is fully generic: Sim.overlayFor + the overlay's own activityAt.
    if (nativeHost.isPresentLocalPlayer() && nativeHost.gloomCur > 0.4) {
      for (const pid of Object.keys(cfg.pairs)) {
        const act = nativeHost.sim.overlayFor(pid)?.activityAt?.(nativeHost.zone.id) ?? 0;
        if (act > 0 && gf.markPairTold(pid)) {
          const row = cfg.pairs[pid];
          nativeHost.text(nativeHost.player.pos, row.text, row.color, 13);
        }
      }
    }
  }

export function sceneUpdateLightwells(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const wells = nativeHost.lightwellDoodads();
    if (!wells.length) return;
    const lightDef = survivalResource('light');
    const lightMax = lightDef?.max ?? 100;
    // THE DAYLOCK: a held lamp is inert — well feeds refill nothing and
    // burst flares neither feed nor spend (the pickup waits for the biting
    // hour), so daylight camping can never quietly pay the dark's bill.
    // Hoisted once: the predicate is zone-scoped, not per-resident.
    const held = nativeHost.lightMeterHeld();
    for (let i = wells.length - 1; i >= 0; i--) {
      const d = wells[i];
      const def = lightwellOf(d.kind);
      if (!def) continue;
      // BURST rows (the Descent's light-spot grammar): one gulp, consumed.
      // Only a body already CARRYING a light meter pops one — no flare is
      // wasted in peacetime — and a full meter still consumes it (sloppy
      // routing pays). Never the residence lane, never light cover.
      if (def.burst) {
        if (held) continue; // the flare waits for the biting hour
        for (const s of nativeHost.frameSeats()) {
          const a = s.actor;
          if (!a || a.dead || a.downed) continue;
          if (a.tier !== (d.tier ?? 0)) continue; // the well lights its own story (the sovereignty gate)
          const cur = a.survival?.get('light');
          if (cur === undefined) continue;
          const within = def.burst.on === 'touch'
            ? dist(a.pos, d.pos) <= d.radius + a.radius + BURST_TOUCH_PAD
            : dist(a.pos, d.pos) <= (lightReach(d) ?? 0);
          if (!within) continue;
          a.survival!.set('light', Math.min(lightMax, cur + def.burst.grant));
          const idx = nativeHost.doodads.indexOf(d);
          if (idx >= 0) nativeHost.doodads.splice(idx, 1);
          nativeHost.markDoodadsChanged();
          nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: 120, color: def.burst.color ?? '#ffe08a', life: 0.5, maxLife: 0.5 });
          if (def.burst.text) nativeHost.text(vec(d.pos.x, d.pos.y - 16), def.burst.text, def.burst.color ?? '#ffe08a', 13);
          break; // first toucher takes it
        }
        continue;
      }
      const reach = lightReach(d);
      if (reach === null || reach <= 0) continue;
      // RESIDENTS: live player seats with their feet in the light.
      let residents = 0;
      for (const s of nativeHost.frameSeats()) {
        const a = s.actor;
        if (!a || a.dead || a.downed) continue;
        if (a.tier !== (d.tier ?? 0)) continue; // the well lights its own story (the sovereignty gate)
        if (dist(a.pos, d.pos) > reach) continue;
        residents++;
        // FEED — only a meter that exists and wants: an absent map is
        // semantically full (the survival fabric's lazy-create contract).
        // A HELD lamp (the daylock) wants nothing.
        const cur = a.survival?.get('light');
        if (cur !== undefined && cur < lightMax && !held) {
          a.survival!.set('light', Math.min(lightMax, cur + (def.feed ?? 0) * dt));
        }
      }
      if (!d.well) continue; // steady rows: feed forever, never drain
      // THE DARK DRINKS TOO: bodies whose def declares wellDrain suck power
      // while inside the reach — data on the monster row, not a behavior.
      let hunger = 0;
      for (const a of nativeHost.actors) {
        if (a.dead || !a.defId) continue;
        const wd = MONSTERS[a.defId]?.wellDrain;
        if (!wd) continue;
        if (dist(a.pos, d.pos) <= reach) hunger += wd;
      }
      // Residents + the dark's mouths + the row's own passive decay (an
      // abandoned well gutters instead of hogging the spawn cap forever).
      d.well.power = Math.max(0, d.well.power - ((def.drainPerResident ?? 1) * residents + hunger + (def.decayPerSec ?? 0)) * dt);
      if (d.well.power <= 0) {
        // GUTTERED OUT: the well dissipates with a small sigh — splice +
        // rev bump (the popBrittle discipline) so every doodad cache re-syncs.
        const idx = nativeHost.doodads.indexOf(d);
        if (idx >= 0) nativeHost.doodads.splice(idx, 1);
        nativeHost.markDoodadsChanged();
        nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: 90, color: def.out?.color ?? '#ffe08a', life: 0.45, maxLife: 0.45 });
        if (def.out?.text) nativeHost.text(vec(d.pos.x, d.pos.y - 14), def.out.text, def.out.color ?? '#ffe08a', 12);
      }
    }
  }

export function sceneUpdateMercOutpost(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    const post = nativeHost.mercOutpost;
    if (!post || post.captain.dead) return;
    if (nativeHost.player.dead || nativeHost.player.downed) { nativeHost.mercDwell = 0; return; }
    const cfg = MERC_CFG.outpost;
    const parley = nativeHost.isPresentLocalPlayer() ? nativeHost.mercParley() : { near: false, why: null };
    if (!parley.near) { nativeHost.mercDwell = 0; nativeHost.mercDwellFired = false; return; }
    if (parley.why !== null) {
      nativeHost.mercDwell = 0;
      // A quiet word about WHY the captain won't talk yet (throttled).
      if (nativeHost.time - nativeHost.mercHintAt > 6) {
        nativeHost.mercHintAt = nativeHost.time;
        nativeHost.text(vec(post.captain.pos.x, post.captain.pos.y - 34), parley.why, '#c8b048', 12);
      }
      return;
    }
    if (nativeHost.mercDwellFired || !nativeHost.playerIdle()) return;
    nativeHost.mercDwell += dt;
    if (nativeHost.mercDwell >= cfg.dwellSec) {
      nativeHost.mercDwell = 0;
      nativeHost.mercDwellFired = true;   // consumed until the player steps away
      nativeHost.mercOutpostRequested = true;
      // THE INTRODUCTIONS LEDGER: meeting ANY officer once teaches the
      // account the market exists (the Vault's recruiter card reads it);
      // a WILDS parley additionally GRADUATES the account past the level
      // gate (THE WILDS COMMISSION) — camps thereafter follow the ordinary
      // schema on every run, at any level. Presence flags, stamped once.
      if (!(nativeHost.account.ledger[LEDGER_MERC_MARKET_MET] ?? 0)) {
        nativeHost.account.ledger[LEDGER_MERC_MARKET_MET] = 1;
        nativeHost.accountDirty = true;
      }
      if (!post.port && !(nativeHost.account.ledger[LEDGER_MERC_OUTPOST_FOUND] ?? 0)) {
        nativeHost.account.ledger[LEDGER_MERC_OUTPOST_FOUND] = 1;
        nativeHost.accountDirty = true;
      }
    }
  }

export function sceneUpdatePlayerCorpses(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    if (!nativeHost.isPresentLocalPlayer()) { for (const c of nativeHost.playerCorpses) c.dwell = 0; return; }
    if (nativeHost.player.dead || nativeHost.player.downed) return;
    for (const c of nativeHost.playerCorpses) {
      if (c.reclaimed) { c.dwell = 0; continue; }
      // The 'corpse_reclaim' transit row is the reach, discipline and clock
      // (corpseTargetsView draws the ring from the same row — drawn == dwelt).
      if (dist(c.pos, nativeHost.player.pos) > transitRadius('corpse_reclaim', CORPSE_RADIUS) || !nativeHost.playerIdle() || !nativeHost.canReclaim(c)
        || !nativeHost.dwellReachable(nativeHost.player.pos, c.pos, transitReach('corpse_reclaim'), nativeHost.storyPair(nativeHost.player))) {
        c.dwell = 0;
        continue;
      }
      c.dwell += dt;
      if (c.dwell >= transitDwell('corpse_reclaim', CORPSE_DWELL)) nativeHost.reclaimCorpse(c);
    }
  }

export function sceneUpdateSailing(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): void {
    if (!nativeHost.isCampaignFrameOwner()) return;
    const run = nativeHost.voyage;
    if (!run) return;
    if (nativeHost.zone.id !== VOYAGE_ZONE_ID) { nativeHost.voyage = null; return; } // any other load ends the mode
    if (nativeHost.player.dead || nativeHost.player.downed) return;
    run.grace = Math.max(0, run.grace - dt);
    nativeHost.streamCoast(false);
    nativeHost.updateWraithsailAtSea();
    const shore = nativeHost.nearestShore();
    const dwellNeed = VOYAGE_CFG.landingDwell * run.ship.landingMul;
    if (shore && shore.gap <= VOYAGE_CFG.landingProbe && run.grace <= 0 && nativeHost.playerIdle()) {
      // THE LANDING LAW (world/seas.ts): only a planned PORT SPOT, an
      // island's shore, or a standing (grandfathered) port zone accepts a
      // landing — everywhere else the coast is BREAKERS. Free docking (and
      // its infinite-shore-zone mint) is gone: a sea's landings are its
      // deliberate, finite port system.
      if (nativeHost.landingSiteFor(shore.d)) {
        run.landDwell += dt;
        if (run.landDwell >= dwellNeed) { nativeHost.landAshore(shore.d); return; }
      } else {
        run.landDwell = 0;
        if (nativeHost.time >= (run.breakerHintAt ?? 0)) {
          run.breakerHintAt = nativeHost.time + SEA_CFG.breakerHintCooldown;
          nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 40),
            'breakers — no landing along this shore; make for a lit harborage', '#9ab8cc', 13);
        }
      }
    } else {
      run.landDwell = 0;
    }
  }

export function sceneUpdateVocationSites(nativeHost:NativeSceneCampaignFrameClosureHost): void {
  // Solo keeps the exact native local-player body; hosted discoveries belong to each admitted hand.
  if(!nativeHost.localSeat.keeper){
    for (const site of nativeHost.vocationSites) {
      const v = VOCATIONS[site.vocId];
      if (!v?.secret || site.npc.dead) continue;
      if ((nativeHost.ledger[vocationDiscoveryKey(site.vocId)] ?? 0) >= 1) continue;
      if (!nativeHost.isPresentLocalPlayer() || dist(site.npc.pos, nativeHost.player.pos) > VOCATION_CFG.discoveryRadius) continue;
      const unlocked = (nativeHost.account.ledger[vocationLedgerKey(site.vocId)] ?? 0) >= 1;
      const heard = unlocked || !(v.secret.classLockedDiscovery ?? true)
        || nativeHost.meta.classDef.id === v.classId;
      if (!heard) {
        if (!site.silentNoted) {
          site.silentNoted = true;
          nativeHost.text(vec(site.npc.pos.x, site.npc.pos.y - 40),
            'It does not stir for you.', '#8a8678', 13);
        }
        continue;
      }
      bumpLedger(nativeHost.ledger, vocationDiscoveryKey(site.vocId));
      nativeHost.text(vec(site.npc.pos.x, site.npc.pos.y - 44),
        v.secret.discoveryText ?? `A calling takes notice of you. (${v.name})`, v.color, 16);
      nativeHost.markMetaDirty(nativeHost.localSeat);
    }
  
    return;
  }
    const hosted = nativeHost.localSeat.keeper;
    const seekers = nativeHost.handSeats();
    for (const site of nativeHost.vocationSites) {
      const v = VOCATIONS[site.vocId];
      if (!v?.secret || site.npc.dead) continue;
      const key = vocationDiscoveryKey(site.vocId);
      for (const seat of seekers) {
        if ((nativeHost.withQuestHand(seat, () => nativeHost.questRunLedger())[key] ?? 0) >= 1) continue;
        if (dist(site.npc.pos, seat.actor.pos) > VOCATION_CFG.discoveryRadius) continue;
        const unlocked = (nativeHost.gateAccountOf(seat).ledger[vocationLedgerKey(site.vocId)] ?? 0) >= 1;
        const heard = unlocked || !(v.secret.classLockedDiscovery ?? true)
          || seat.meta.classDef.id === v.classId;
        if (!heard) {
          const silent = hosted ? (site.silentSeats ??= new Set()).has(seat.id) : site.silentNoted;
          if (!silent) {
            if (hosted) site.silentSeats!.add(seat.id); else site.silentNoted = true;
            nativeHost.seatNote(seat, vec(site.npc.pos.x, site.npc.pos.y - 40),
              'It does not stir for you.', '#8a8678', 13);
          }
          continue;
        }
        nativeHost.withQuestHand(seat, () => nativeHost.questStamp(key)); // the seeker's own ledger (solo: the run ledger)
        if (hosted && nativeHost.seatStageDef(seat).metaProgression) bumpLedger(nativeHost.gateAccountOf(seat).ledger, key);
        nativeHost.seatNote(seat, vec(site.npc.pos.x, site.npc.pos.y - 44),
          v.secret.discoveryText ?? `A calling takes notice of you. (${v.name})`, v.color, 16);
        nativeHost.markMetaDirty(seat);
        if (hosted) nativeHost.journalDirty.add(seat.id); // THE JOURNAL ROW: its offers may have changed
      }
    }
  }


export function sceneUpdateContagionInfection(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const cf = nativeHost.sim.contagionField;
    if (!cf && nativeHost.contagionLeans.size === 0) return;
    if (nativeHost.time < nativeHost.contagionSweepAt) return;
    const cfg = cf?.surge();
    nativeHost.contagionSweepAt = nativeHost.time + (cfg?.infection.sweepSec ?? 1.2);
    for (const [id, prior] of nativeHost.contagionLeans) {
      const a = nativeHost.actorById(id);
      if (!a || a.dead) { nativeHost.contagionLeans.delete(id); continue; }
      if (!a.statuses.some(s => strainByStatus(s.id))) {
        a.watch = prior.watch;
        // THE WITHER (Movement III): the mark leaving the body takes the
        // plague's growth with it — no break effects, no scar (transience);
        // a re-infection later grows fresh through the cleared latch.
        if (prior.grafted) nativeHost.witherGrafts(a, CONTAGION_GRAFT_KEY);
        nativeHost.contagionLeans.delete(id);
      }
    }
    if (!cf || !cfg) return;
    const info = cf.contagionOn(nativeHost.zone.id);
    if (!info || info.curing) return;
    // THE WALK-IN (Movement III): the ROAMING zero ARRIVES mid-visit — the
    // sweep raises its body the beat its seat reaches the standing zone (the
    // enter-time muster can't see a later arrival). One live body ever (the
    // guard lives in the spawn door); a slain zero never re-raises (curing
    // gates the seat); and while the player stands in its zone the seat is
    // PINNED by the overlay's cornered hold, so body and seat cannot desync.
    const pzHere = cf.patientZeroIn(nativeHost.zone.id);
    if (pzHere && MONSTERS[pzHere.bossDefId]) nativeHost.spawnPatientZero(pzHere);
    const strain = strainOf(info.strain);
    if (!strain || !STATUS_DEFS[strain.statusId]) return;
    const fr = cfg.infection.frac;
    const frac = fr[0] + (fr[1] - fr[0]) * clamp(info.intensity, 0, 1);
    let zh = 0;
    for (let i = 0; i < nativeHost.zone.id.length; i++) zh = (zh * 31 + nativeHost.zone.id.charCodeAt(i)) | 0;
    const fated = (aid: number): boolean => {
      let h = Math.imul(aid, 2654435761) ^ zh;
      h ^= h >>> 13; h = Math.imul(h, 1597334677); h ^= h >>> 16;
      return ((h >>> 0) % 1000) / 1000 < frac;
    };
    for (const a of nativeHost.actors) {
      if (a.dead || a.team !== 'enemy' || a.owner !== undefined || a.passive) continue;
      if (a.tag === 'patient_zero') continue;
      if (isDormant(a)) continue;
      if (a.faction !== cfg.faction) {
        if (!a.breathes) continue; // the plague takes the LIVING (MATERIAL_NATURE)
        if (!fated(a.id)) continue;
      }
      nativeHost.infectActorWith(a, strain);
    }
  }

export function sceneUpdateWarbandMarches(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    // SOVEREIGNTY: seat — a march's arrival (the derived census, probe_tiers RIG T).
    if (!nativeHost.warbandMarches.length) return;
    const ARRIVE = 46; // ≥ the AI's 40u node-reach, so we fire before it loops back
    nativeHost.warbandMarches = nativeHost.warbandMarches.filter(wb => {
      if (wb.leader.dead) return false; // champion down → the march dissolves
      if (dist(wb.leader.pos, wb.goal) > ARRIVE) return true; // still marching
      const alive = wb.members.filter(m => !m.dead);
      for (const m of alive) { const i = nativeHost.actors.indexOf(m); if (i >= 0) nativeHost.actors.splice(i, 1); }
      nativeHost.flashes.push({ pos: vec(wb.goal.x, wb.goal.y), radius: 70, color: '#e85050', life: 0.5, maxLife: 0.5 });
      nativeHost.text(vec(wb.goal.x, wb.goal.y - 40), 'The warband marches on…', '#e8a050', 14);
      return false;
    });
  }

export function sceneHarvestSettle(nativeHost:NativeSceneCampaignFrameClosureHost, s: HarvestSession, _why: 'complete' | 'expiry'): void {
    const at = nativeHost.harvestSessions.indexOf(s);
    if (at < 0) return;
    nativeHost.harvestSessions.splice(at, 1);
    if (s.held) nativeHost.timeflow.release('harvest');
    nativeHost.harvestDwell.delete(s.seatId);
    const node = nativeHost.harvestNodes[s.ix];
    if (!node) return;
    const d = node.doodad;
    const dissolveLook = { kind: d.kind, pos: vec(d.pos.x, d.pos.y), radius: d.radius, rot: d.rot, tier: d.tier };
    d.kind = HARVEST_HUSK_KIND;
    nativeHost.markDoodadsChanged();
    // THE DISSOLUTION GRAMMAR: the node CRUMBLES as itself into its husk —
    // the husk IS the debris (adopted: tagged, fading on the row's own dial);
    // the payout below stands untouched (no rng draw here — seeded rolls).
    const ds = dissolveFor(dissolveLook.kind);
    if (ds) nativeHost.dissolveBreak(dissolveLook, ds, null, d);
    const col = node.def.accent;
    nativeHost.flashes.push({
      pos: vec(node.pos.x, node.pos.y), radius: d.radius * 2.6, color: col,
      life: 0.35, maxLife: 0.35,
    });
    for (let k = 0; k < 3; k++) {
      nativeHost.flashes.push({
        pos: vec(node.pos.x + rand(-16, 16), node.pos.y + rand(-14, 14)),
        radius: rand(6, 12), color: col, life: 0.5, maxLife: 0.5,
      });
    }
    for (const p of harvestPayout(nativeHost.zone.level, s.done, s.misses, s.seq.length)) {
      nativeHost.dropEssenceAt(vec(node.pos.x, node.pos.y), p);
    }
    // THE GATHER's claim (bounty first-writ W2 — the cull-claim law on the
    // harvest fabric): a settled rite in a held gather posting's zone
    // credits the POSTING. Expiry settles count too — the node is spent
    // either way and the accuracy already scaled the pour, so a missed
    // window can never strand the writ behind a finite stand.
    // THE CHARACTER'S QUESTS: the rite's own hand's open gather first, then any hand's here.
    const gh = nativeHost.openWritHand('gather', nativeHost.seats.find(x => x.id === s.seatId)?.actor ?? null);
    if (gh) nativeHost.withQuestHand(gh.seat, () => {
      gh.p.gather!.claimed++;
      nativeHost.charDirty = true;
      nativeHost.noteBountyReady(gh.p); // THE READINESS LAW's one announce site
    });
  }

export function scenePressingFoeNear(nativeHost:NativeSceneCampaignFrameClosureHost, at: Vec2, tier = 0, radius = SWAP_DISCIPLINE_CFG.foeRadius): boolean {
    return nativeHost.actors.some(a => nativeHost.isPressingFoe(a, at, tier, radius));
  }

export function sceneHarvestArm(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, ix: number): void {
    const node = nativeHost.harvestNodes[ix];
    if (!node || node.spent) return;
    node.spent = true;
    const seq = harvestSeqFor(nativeHost.manifest.seed, nativeHost.zone.id, node.pos, nativeHost.zone.level);
    const window = harvestWindowFor(seq.length);
    const held = nativeHost.timeflow.allowHold({ id: 'harvest', scale: 0, kind: 'harvest' })
      && nativeHost.timeflow.holdSurface('harvest');
    nativeHost.harvestSessions.push({
      seatId: seat.id, ix, seq, done: 0, misses: 0,
      left: window, window, held, missT: 0,
    });
  }

export function scenePerformModeRespawn(nativeHost:Pick<NativeSceneCampaignFrameClosureHost,'modeStageDef'|'loadZone'|'player'|'clampPos'|'text'|'lastRespawnPayout'|'flashes'>&{seats:readonly import('../engine/world').Seat[]}): void {
    const stage = nativeHost.modeStageDef();
    for (const s of nativeHost.seats) {
      s.actor.dead = false;
      s.actor.downed = false;
      s.actor.casting = null;
      // Shed through the canonical dispel lane (endStatus: splice + the
      // 'status:*' modifier-source cleanup; silent — a wake pops no kegs).
      // The old raw `statuses.length = 0` wipe left every modded status's
      // sheet source STAMPED FOREVER: dying chilled/shocked/cursed carried
      // the debuff's numbers — invisibly, no icon — for the rest of the
      // run, until the same status happened to be re-applied and expire
      // cleanly on its own.
      for (const id of new Set(s.actor.statuses.map(st => st.id))) s.actor.endStatus(id);
      s.reviveDwellBy.clear();
    }
    nativeHost.loadZone(START_ZONE);
    const p = nativeHost.player;
    for (const s of nativeHost.seats) {
      if (s.actor !== p) s.actor.pos = nativeHost.clampPos(vec(p.pos.x + rand(-60, 60), p.pos.y + rand(30, 70)), s.actor.radius);
      s.actor.fillResources();
    }
    nativeHost.text(vec(p.pos.x, p.pos.y - 52), stage.wakeText ?? 'You wake in the sanctuary.', '#b8a0e0', 16);
    if (nativeHost.lastRespawnPayout > 0) {
      nativeHost.text(vec(p.pos.x, p.pos.y - 28),
        `+${nativeHost.lastRespawnPayout} ${META_CURRENCY_LABEL} — the crossing's tithe`, '#d8b048', 13);
    }
    nativeHost.flashes.push({ pos: vec(p.pos.x, p.pos.y), radius: p.radius * 2.4, color: '#b8a0e0', life: 0.5, maxLife: 0.5 });
  }

export function sceneRestockOrdinal(nativeHost:NativeSceneCampaignFrameClosureHost): number { return settlementRestockOrdinal(nativeHost.nativeSettlementHost()); }

export function sceneWithBuyer<T>(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, fn: () => T): T {
    if (!nativeHost.localSeat.keeper || seat.keeper || seat.merc) return fn();
    const was = nativeHost.shelfBuyer;
    nativeHost.shelfBuyer = seat;
    try { return fn(); } finally { nativeHost.shelfBuyer = was; }
  }

export function sceneSyncHoldIdx(nativeHost:NativeSceneCampaignFrameClosureHost, key: string, stock: VendorEntry[]): void { return settlementSyncHoldIdx(nativeHost.nativeSettlementHost(),key,stock); }

export function sceneArmVendorStock(nativeHost:NativeSceneCampaignFrameClosureHost, key: string): VendorEntry[] { return settlementArmVendorStock(nativeHost.buyerSettlementHost(),key); }

export function sceneRestockSeconds(nativeHost:NativeSceneCampaignFrameClosureHost): number { return settlementRestockSeconds(nativeHost.nativeSettlementHost()); }

export function sceneNearBountyBoard(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat, boardId?: string): boolean {
    return nativeHost.bountyBoardsHere().some(b => (boardId === undefined || b.id === boardId)
      && dist(seat.actor.pos, b.pos) <= BOUNTY_BOARD_CFG.dwell.radius
      && nativeHost.dwellReachable(seat.actor.pos, b.pos, DWELL_CFG.reach, { from: seat.actor.tier ?? 0, to: b.tier }));
  }

export function sceneWatchBountyHands(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number, nearBoard: boolean): void {
    if (nativeHost.clientActionHook) return;
    // THE SPLIT DISPATCH (shard M1-W3): the watch reconciles the world's one
    // slate, so it is the keeper's alone (a unit's would re-run it per unit).
    if (!nativeHost.isCampaignFrameOwner()) return;
    // THE CHARACTER'S QUESTS (card 24 ruled): on a hosted world every hero's own hands and
    // slate are watched, each in its own hand, wherever on the shard it stands (THE
    // OCCUPIED LAW); a hand travels with its character, so none is ever left unheld. An
    // open slate alone is watched while its reader stands at a board in its own World (the
    // one board a slate's live repaint serves, as the solo watch reads it).
    if (nativeHost.localSeat.keeper) {
      nativeHost.bountyWatchAccum += dt;
      if (nativeHost.bountyWatchAccum < 2) return;
      nativeHost.bountyWatchAccum = 0;
      const heroes = nativeHost.allQuestHands().filter(s => {
        const l = nativeHost.questLedgerOf(s);
        return l.hands.length > 0 || (l.offers.length > 0
          && !!nativeHost.presentWorlds().find(w => w.seats.includes(s))?.nearBountyBoard(s));
      });
      for (const s of heroes) nativeHost.withQuestHand(s, () => {
        for (const p of nativeHost.bountyHands) nativeHost.noteBountyReady(p);
        nativeHost.reconcileBounties();
      });
      return;
    }
    if (!nativeHost.bountyHands.length && !(nearBoard && nativeHost.bountyOffers.length)) return;
    nativeHost.bountyWatchAccum += dt;
    if (nativeHost.bountyWatchAccum < 2) return;
    nativeHost.bountyWatchAccum = 0;
    for (const p of nativeHost.bountyHands) nativeHost.noteBountyReady(p);
    nativeHost.reconcileBounties();
  }

export function sceneBountyBoardsHere(nativeHost:NativeSceneCampaignFrameClosureHost): { id: string; pos: Vec2; tier: number }[] {
    const out: { id: string; pos: Vec2; tier: number }[] = [];
    if (nativeHost.bountyBoardUnlocked() && nativeHost.townPresent()) {
      // THE ANCHORED DWELL: Lastlight's counter is the BOARD (the front's
      // N cell wears the anchor) — its live seat, and no board while none
      // stands.
      const a = nativeHost.stationAnchor('bounty_board');
      if (a) out.push({ id: BOUNTY_BOARD_CFG.boardId, pos: a.pos, tier: a.tier });
    }
    if (nativeHost.zone.holdAnchor && nativeHost.bountyBoardRoster().some(b => b.id === nativeHost.zone.id)) {
      const d = nativeHost.doodads.find(x => x.kind === 'bounty_board' && !x.gone && !x.felled);
      if (d) out.push({ id: nativeHost.zone.id, pos: vec(d.pos.x, d.pos.y), tier: d.tier ?? 0 });
    }
    return out;
  }

export function sceneBoardStateOf(nativeHost:NativeSceneCampaignFrameClosureHost, boardId: string): { armedBeat: number; refreshSeq: number } {
    return nativeHost.bountyBoardState[boardId] ??= { armedBeat: -1, refreshSeq: 0 };
  }

export function sceneBountyBeat(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    return Math.floor(nativeHost.time / nativeHost.bountyBeatSeconds());
  }

export function sceneArmBountyBoard(nativeHost:NativeSceneCampaignFrameClosureHost, boardId: string = BOUNTY_BOARD_CFG.boardId): void {
    if (massBountiesAvailable(nativeHost, boardId)) {
      nativeHost.reconcileBounties();
      const beat = nativeHost.bountyBeat(), bs = nativeHost.boardStateOf(boardId);
      const offers = dealMassBounties(nativeHost, boardId, beat, bs.refreshSeq, bs.armedBeat === beat,
        (level, rng) => nativeHost.pickBountyGemId(level, rng));
      nativeHost.bountyOffers = [...nativeHost.bountyOffers.filter(p => p.boardId !== boardId || !p.massBounty), ...offers];
      bs.armedBeat = beat; nativeHost.charDirty = true;
      return;
    }
    if (!nativeHost.graphWorkAvailable()) return;
    nativeHost.reconcileBounties();
    const beat = nativeHost.bountyBeat();
    const bs = nativeHost.boardStateOf(boardId);
    const standing = bs.armedBeat === beat;
    const home = nativeHost.bountyBoardRoster().find(b => b.id === boardId)?.homeZoneId ?? START_ZONE;
    const approach = nativeHost.bountyApproaches(boardId, true);
    const appropriate = (p: BountyPosting): boolean => nativeHost.bountyAppropriate(p, approach);
    const current = nativeHost.bountyOffers.filter(p => p.boardId === boardId);
    // A level-up or depleted pool may add a useful choice, never erase the
    // standing rewards. A held hand is already chosen work and cannot re-deal.
    if (standing && (current.some(appropriate) || nativeHost.bountyHands.some(p => p.boardId === boardId))) return;
    // Same-beat repairs use a fixed level-keyed seed and essence fallback. They
    // cannot reroll the reward shelf by repeatedly taking and abandoning work.
    const harderApproach = nativeHost.bountyApproaches(boardId, false);
    // THE TURN-IN REFRESH's seed limb rides only once it has ever fired
    // (seq 0 keeps the M0-exact derivation — old saves and standing
    // probes meet unchanged slates until a resolution actually refreshes).
    // THE BOARD PER CHARACTER (card 24 ruled): on a hosted world the hand's own draw
    // from the shared beat (worldSeed × board × beat × character); absent elsewhere.
    const who = nativeHost.questCharKey();
    const seedKey = `bountyboard:${boardId}:${beat}`
      + (bs.refreshSeq > 0 ? `:${bs.refreshSeq}` : '') + (who ? `:${who}` : '');
    // The id limb (never colliding with a standing hand's id after a
    // same-beat refresh, nor across boards — the slate-key law).
    // THE BOARD PER CHARACTER: nor across characters (the character limb).
    const slateKey = (boardId === BOUNTY_BOARD_CFG.boardId ? `${beat}` : `${boardId}_${beat}`)
      + (bs.refreshSeq > 0 ? `r${bs.refreshSeq}` : '') + (who ? `_${who}` : '');
    const rng = new Rng((nativeHost.manifest.seed ^ hashStr(seedKey)) >>> 0);
    const allRows = Object.values(BOUNTY_KINDS);
    // Zone-uniqueness holds WITHIN a board's slate + its own hands; other
    // boards' postings dedupe at (kind, zone) grain instead — different
    // kinds stacking one zone is the JUICE (bounties ADD), the same ask
    // twice would pay twice for one deed.
    const taken = new Set<string>(nativeHost.bountyHands.filter(h => h.boardId === boardId).map(h => h.zoneId));
    // The arming board's own OUTGOING unlocked offers are dead (this deal
    // replaces them) — only other boards' postings, this board's KEPT
    // pins, and every taken hand stand as claims.
    const kindClaimed = (kind: string, zoneId: string): boolean =>
      nativeHost.bountyOffers.some(o => o.kind === kind && o.zoneId === zoneId
        && (o.boardId !== boardId || o.locked))
      || nativeHost.bountyHands.some(h => h.kind === kind && h.zoneId === zoneId);
    const lean = (zoneId: string): number =>
      (nativeHost.bountyOffers.some(o => o.boardId !== boardId && o.zoneId === zoneId)
        || nativeHost.bountyHands.some(h => h.boardId !== boardId && h.zoneId === zoneId))
        ? BOUNTY_BOARD_CFG.kinship.overlapLean : 1;
    const view = nativeHost.simView();
    // THE ANSWER pool (M2 K4): every source's live census in sorted-row
    // order, each ref's resolution-ledger baseline read AT THE ARM (the
    // delta law's zero). Gathered once — one truth for every seat's draw.
    let answersMemo: { source: string; ref: BountyTargetRef; base: number }[] | null = null;
    const answers = (): { source: string; ref: BountyTargetRef; base: number }[] => {
      if (!answersMemo) {
        answersMemo = [];
        for (const row of bountySourceRows()) {
          for (const ref of row.census(nativeHost)) {
            answersMemo.push({ source: row.id, ref, base: ref.ledger ? (nativeHost.ledger[ref.ledger] ?? 0) : 0 });
          }
        }
      }
      return answersMemo;
    };
    // THE BAND FOLD (docs/design/bounty-first-writ.md §4): the first live
    // band's overrides fold over the standing dials — slate size, kind
    // weights, pay lanes, THE ANCHOR. No band live = the standing config,
    // byte-identical. THE ANCHOR (walk cards 1+2 coupled): the first seat
    // pins to the anchor zone in perpetuity; while the account reads YOUNG
    // (run + account ledger under the threshold), EVERY seat pins — the
    // tutorial phase, relaxing to one ritual writ once the board is met.
    const band = liveBountyBand(nativeHost, boardId);
    const anchor = band?.anchor;
    const young = !!anchor
      && (nativeHost.questRunLedger()[anchor.youngLedger] ?? 0) + (nativeHost.gateAccountOf(nativeHost.questHand()).ledger[anchor.youngLedger] ?? 0) // THE CHARACTER'S QUESTS: the hand's own history
        < anchor.youngBelow;
    // THE GROWTH RUNGS (M4): BROADER widens the standing slate (the band's
    // own offers override outranks it); FARTHER stretches every roll's
    // reach through the host.
    const offerCap = band?.offers ?? (BOUNTY_BOARD_CFG.offers + nativeHost.bountyBroaderBonus());
    const reach = nativeHost.bountyReach();
    const weightOf = (r: BountyKindRow): number => Math.max(0, band?.kinds?.[r.id] ?? r.weight);
    const draw = (pool: BountyKindRow[]): BountyKindRow | null => {
      let total = 0;
      for (const r of pool) total += weightOf(r);
      if (total <= 0) return null;
      let x = rng.next() * total;
      for (const r of pool) { x -= weightOf(r); if (x <= 0) return r; }
      return pool[pool.length - 1];
    };
    // THE POSTING PIN's carry (her adjustment — the vendor-hold law): a
    // PINNED offer rides every re-deal, beat turn and turn-in refresh
    // alike, until accepted, released, or struck. The reconcile above
    // already removed dead pinned offers (the pin holds a seat, never the
    // truth); the kept rows seed the diversity/zone bookkeeping so fresh
    // deals fill honestly around them.
    const offers: BountyPosting[] = nativeHost.bountyOffers.filter(o => (standing || o.locked) && o.boardId === boardId);
    const preservedRewardIds = new Set(offers.map(o => o.id));
    const perKind: Record<string, number> = {};
    for (const o of offers) {
      perKind[o.kind] = (perKind[o.kind] ?? 0) + 1;
      taken.add(o.zoneId);
    }
    const freshSeats = standing ? 0 : Math.max(0, offerCap - offers.length);
    for (let i = 0; i < freshSeats && allRows.length; i++) {
      const pin = anchor && (young || i === 0) ? anchor.zoneId : undefined;
      const manageable = i < BOUNTY_BOARD_CFG.routes.manageableSeats || standing;
      const routes = manageable ? approach : harderApproach;
      const host: BountyRollHost = {
        routes, // Bounty journey rolls reuse the validated approach graph.
        routeFits: id => routes.has(id) && (manageable
          ? nativeHost.zoneMap[id].level >= Math.max(1, nativeHost.questHandLevel() - BOUNTY_BOARD_CFG.routes.appropriateBelow)
            && !objectiveSeals(nativeHost.zoneMap[id].objective) && !nativeHost.zoneMap[id].special && !nativeHost.zoneMap[id].eventOwned
            && !answers().some(a => a.ref.zoneId === id)
          : nativeHost.zoneMap[id].level <= nativeHost.questHandLevel() + BOUNTY_BOARD_CFG.routes.challengeAbove),
        view, zoneMap: nativeHost.zoneMap, objectiveDone: id => nativeHost.objectiveDoneAt(id),
        visited: id => nativeHost.visited.has(id),
        pickGemId: (lvl, r) => nativeHost.pickBountyGemId(lvl, r),
        answers,
        // THE SUMMONABLE roster (M3 K5): sources whose summons face stands
        // with room to breathe; the cap read is live over this arm's build.
        igniteReady: () => bountySourceRows()
          .filter(r => !!r.summons && r.summons.headroom(nativeHost)).map(r => r.id),
        summonsStanding: src =>
          offers.filter(o => o.kind === 'summons' && o.answer?.source === src).length
          + nativeHost.bountyHands.filter(h => h.kind === 'summons' && h.answer?.source === src).length,
        reach,
        // THE KINSHIP: localization + the juicing lean + the dedupe.
        boardZoneId: home, lean, kindClaimed,
        ...(pin ? { pin } : {}),
        playerLevel: nativeHost.questHandLevel(), boardId, beat, slateKey, seq: i,
      };
      // Weighted kind pick under THE DIVERSITY CAP (slate.maxPerKind —
      // card 6's shape): a kind at its cap leaves the draw, and so does a
      // kind with structurally NOTHING to say (M4's availability read — an
      // empty census must not waste the seat). Pinned seats trade the
      // one-posting-per-zone law for one-KIND-per-zone (distinct faces on
      // the same ground are distinct asks — slate and hand both).
      const rows = allRows.filter(r => (perKind[r.id] ?? 0) < BOUNTY_BOARD_CFG.slate.maxPerKind
        && (!manageable || BOUNTY_BOARD_CFG.routes.manageableKinds.includes(r.id))
        && weightOf(r) > 0
        && (r.available?.(host) ?? true)
        && (!pin || (!offers.some(o => o.kind === r.id && o.zoneId === pin)
          && !nativeHost.bountyHands.some(h => h.kind === r.id && h.zoneId === pin))));
      let p: BountyPosting | null = null;
      let rowId = '';
      {
        // THE ANCHOR RETRY: weighted draws without replacement — an unlucky
        // first kind (a cull with no packs to mark) must not waste the
        // anchor seat while another kind can honestly ask here.
        const pool = [...rows];
        while (pool.length && !p) {
          const r = draw(pool);
          if (!r) break;
          pool.splice(pool.indexOf(r), 1);
          p = r.roll(host, rng, taken);
          rowId = r.id;
        }
        // One intended stretch choice when such a target exists. If the local
        // region cannot supply it, retain the normal honest candidate instead.
        if (!manageable && i === BOUNTY_BOARD_CFG.routes.manageableSeats && !pin) {
          const stretchHost = { ...host, routeFits: (id: string) => host.routeFits!(id)
            && nativeHost.zoneMap[id].level > nativeHost.questHandLevel() };
          for (const r of rows) {
            const stretch = r.roll(stretchHost, rng, taken);
            if (stretch) { p = stretch; rowId = r.id; break; }
          }
        }
      }
      if (!p) continue; // no honest target for this seat — the slate runs short
      // THE PAY LANE rolls at the arm, off the TARGET's level (the visible
      // price law: the card prints exactly what the turn-in will mint);
      // rollBudgetBountyPay also folds the starter's cash and writ lanes.
      const rewardLevel = p.challengeLevel ?? p.expedition?.level ?? nativeHost.zoneMap[p.zoneId]?.level ?? 1;
      const weights = { ...(band?.lanes ?? BOUNTY_BOARD_CFG.lanes.weights) };
      if (!band) {
        for (const lane of Object.keys(weights) as (keyof typeof weights)[]) {
          if (offers.some(o => lane === 'pouch' ? o.pay.pouch || o.pay.gem : o.pay[lane])) weights[lane] = 0;
        }
      }
      p.pay = { ...rollBudgetBountyPay(host, rng, rewardLevel,
        Object.values(weights).some(w => w > 0) ? weights : band?.lanes), level: rewardLevel };
      taken.add(p.zoneId);
      perKind[rowId] = (perKind[rowId] ?? 0) + 1;
      offers.push(p);
    }
    // Bounded additive fallback: commission new quarry on reachable existing
    // ground using the normal cull spawn pipeline. Its advertised level is fixed
    // now, not on arrival; no ambient zone level or road changes. Reuses cleared
    // ground and cannot duplicate another board's cull or a held cull there.
    if (!offers.some(appropriate) && !nativeHost.bountyHands.some(p => p.boardId === boardId)) {
      const target = [...approach.entries()].filter(([id]) => {
        const z = nativeHost.zoneMap[id];
        return z.packs?.table?.length && z.objective.kind !== 'safe' && z.objective.kind !== 'bounty'
          && !z.harborhold && !z.holdAnchor && !z.special && !z.eventOwned
          && !answers().some(a => a.ref.zoneId === id)
          && !nativeHost.bountyHands.some(p => p.kind === 'cull' && p.zoneId === id)
          && !nativeHost.bountyOffers.some(p => p.boardId !== boardId && p.kind === 'cull' && p.zoneId === id);
      }).sort((a,b) => a[1].distance - b[1].distance || a[0].localeCompare(b[0]))[0];
      if (target) {
        const level = Math.max(1, nativeHost.questHandLevel() - 1, nativeHost.zoneMap[target[0]].level);
        const reliefRng = new Rng((nativeHost.manifest.seed ^ hashStr(`${seedKey}:relief:${level}`)) >>> 0);
        for (let alternative = 0; alternative < (band ? 1 : BOUNTY_BOARD_CFG.routes.manageableSeats); alternative++) {
          offers.push({ id: `bounty_${slateKey}_relief_${level}_${alternative}`, boardId, beat, zoneId: target[0],
            kind: 'cull', challengeLevel: level,
            cull: { count: BOUNTY_BOARD_CFG.routes.fallbackMarks, claimed: 0 },
            pay: { ...(alternative === 0 ? { essence: bountyChargePay(level) }
              : rollBountyPay({ pickGemId: () => null }, reliefRng, level,
                { essence: 0, lot: 1, pouch: 0, unique: 0, craft: 0 })), level } });
        }
      }
    }
    if (!standing) ensureBountyRewardChoices(offers, preservedRewardIds,
      { pickGemId: (level, r) => nativeHost.pickBountyGemId(level, r) }, rng, band?.lanes ?? BOUNTY_BOARD_CFG.lanes.weights);
    // THE MERGE (the kinship): this board's fresh slate replaces only its
    // own postings — every other board's standing offers ride untouched.
    nativeHost.bountyOffers = [...nativeHost.bountyOffers.filter(o => o.boardId !== boardId), ...offers];
    bs.armedBeat = beat;
    nativeHost.charDirty = true;
  }

export function sceneStationDwellArmed(nativeHost:NativeSceneCampaignFrameClosureHost, key: string, engaged: boolean): boolean {
    if (!engaged) { nativeHost.stationArmed.add(key); return false; }
    return nativeHost.stationArmed.has(key);
  }

export function sceneResolvedHandsAt(nativeHost:NativeSceneCampaignFrameClosureHost, boardId: string): { id: string; state: 'ready' | 'failed' }[] {
    const out: { id: string; state: 'ready' | 'failed' }[] = [];
    // THE JOURNAL ROW: a render shell reads its own hands off the board it was shipped.
    const net = nativeHost.clientActionHook ? nativeHost.netJournal?.boards?.[boardId] : undefined;
    if (net) {
      for (const h of net.hands) if (h.state !== 'afield') out.push({ id: h.id, state: h.state });
      return out;
    }
    for (const p of nativeHost.bountyHands) {
      if (p.boardId !== boardId || !nativeHost.handOwns(p)) continue; // THE BOARD PER SEAT: the hand's own writs
      const state = nativeHost.handState(p);
      if (state !== 'afield') out.push({ id: p.id, state });
    }
    return out;
  }

export function sceneRequestMeta(nativeHost:NativeSceneCampaignFrameClosureHost, action: MetaAction): void {
    // A couch guest's panel action goes straight to ITS seat (host-side by
    // construction — couch play never exists on a render-shell client).
    const couchSeat = nativeHost.uiActionSeatId
      ? nativeHost.seats.find(s => s.couch && s.id === nativeHost.uiActionSeatId) : undefined;
    if (couchSeat) { nativeHost.applyAction(couchSeat, action); return; }
    if (nativeHost.clientActionHook) {
      // CLIENT: ship the intent to the host (the authority) AND apply it locally
      // as an OPTIMISTIC prediction — the panel responds immediately, and rapid
      // index-addressed actions (e.g. a double-click drop) re-target the
      // already-updated list instead of a stale one. The next authoritative
      // snapshot reconciles, reverting anything the host rejected.
      nativeHost.clientActionHook(action);
      // EXCEPT zone-changing actions: caravanTo runs a full loadZone (heavy regen,
      // and the client would mint with its OWN seed → a divergent flicker; the
      // waypoint likewise, and its client lane would ask again),
      // vocationQuest MINTS a quest zone into the world map, and harborChart
      // runs a SURVEY PULSE (mints + reveals graph ground). Forward only; the
      // host's authoritative snapshot/zone broadcast moves the client.
      // holdMuster/holdRestore likewise: they spawn actors, flip door grids
      // and charge the account — host-only, snapshot moves the client.
      // The bounty intents likewise: accepting lifts veils + redraws exit
      // labels, and the slate is host-armed — forward only; the snapshot
      // moves the client.
      if (action.t !== 'caravanTo' && action.t !== 'waypoint' && action.t !== 'vocationQuest' && action.t !== 'questAccept' && action.t !== 'questReward' && action.t !== 'harborChart'
        && action.t !== 'holdMuster' && action.t !== 'holdRestore'
        && action.t !== 'bountyAccept' && action.t !== 'bountyAbandon' && action.t !== 'bountyTurnIn'
        && action.t !== 'bountyLock' && action.t !== 'bountyCoastWrits'
        && action.t !== 'forgeBegin' && action.t !== 'forgeCancel') {
        nativeHost.applyAction(nativeHost.localSeat, action);
        nativeHost.clientOptimistic?.(action); // THE ECHO LAW: held against the wire until its echo
      }
    } else {
      nativeHost.applyAction(nativeHost.localSeat, action);
    }
  }

export function sceneNearCampfire(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    if (nativeHost.massRuntime) return false; // worldmass keeps run consequences; refresh migration is pending
    const a = nativeHost.stationAnchor('campfire'); // THE ANCHORED DWELL: the fire itself
    return nativeHost.counterOwned(FEATURE.CAMPFIRE) // a hosted world's shell never offers it (its refresh is the world's, keeper-held)
      && nativeHost.townPresent() && !!a && nativeHost.isPresentLocalPlayer()
      && dist(nativeHost.player.pos, a.pos) <= CAMPFIRE_RADIUS
      && nativeHost.dwellReachable(nativeHost.player.pos, a.pos, DWELL_CFG.reach, { from: nativeHost.player.tier ?? 0, to: a.tier });
  }

export function sceneRefreshZones(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    nativeHost.townPortals = [];
    nativeHost.townPortalDwell.clear();
    if (nativeHost.zone.objective.kind !== 'safe') nativeHost.forgetMemoryOnLeave = true;
    for (const id of nativeHost.zoneMemory.keys()) {
      if ((nativeHost.zoneMap[id] ?? nativeHost.caveMap[id])?.objective.kind !== 'safe') nativeHost.zoneMemory.delete(id);
    }
    nativeHost.notice('You bank the campfire — the wilds stir anew.', '#ffb84a', 16, 'world');
    nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 120, color: '#ff9a3a', life: 0.7, maxLife: 0.7 });
  }

export function sceneNearCaravan(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    if (nativeHost.massRuntime) return false; // worldmass travel is on foot until campaign routes have places
    if (!featureEnabled(nativeHost.account, FEATURE.CARAVAN)) return false;
    return nativeHost.actors.some(a => nativeHost.hasNpcRole(a, 'caravanner')
      && dist(a.pos, seat.actor.pos) <= CARAVAN_RADIUS
      && nativeHost.dwellReachable(seat.actor.pos, a.pos, npcDwellReach('caravanner'), nativeHost.storyPair(seat.actor, a)));
  }

export function sceneNearFont(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    // THE SAME-STORY LAW: the Font on the square serves no one standing a
    // story above it (the inn's east rooms overlook it).
    return nativeHost.fonts.some(f => dist(f.pos, seat.actor.pos) <= 150
      && nativeHost.dwellReachable(seat.actor.pos, f.pos, DWELL_CFG.reach, { from: seat.actor.tier ?? 0, to: f.tier ?? 0 }));
  }

export function sceneNearHarborBoard(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    if (!nativeHost.zone.port) return false;
    const board = nativeHost.doodads.find(d => d.kind === 'harbor_board');
    return !!board && nativeHost.isPresentActor(seat.actor) && dist(seat.actor.pos, board.pos) <= PORT_CFG.boardReach
      && nativeHost.dwellReachable(seat.actor.pos, board.pos, DWELL_CFG.reach, nativeHost.storyPair(seat.actor, board));
  }

export function sceneResolveHoldDefense(nativeHost:NativeSceneCampaignFrameClosureHost, won: boolean): void {
    const d = nativeHost.holdDefense;
    if (!d) return;
    nativeHost.holdDefense = null;
    const def = nativeHost.zone;
    const hold = def.harborhold;
    if (!hold || def.id !== d.zoneId) return;
    const cls = holdClassOf(hold);
    const ward = d.wardId !== null ? nativeHost.actorById(d.wardId) : null;
    const at = ward ? vec(ward.pos.x, ward.pos.y) : nativeHost.isPresentLocalPlayer() ? vec(nativeHost.player.pos.x, nativeHost.player.pos.y) : vec((nativeHost.waypointPos ?? nativeHost.zoneEntry).x, (nativeHost.waypointPos ?? nativeHost.zoneEntry).y);
    if (won) {
      hold.state = 'open';
      hold.prosperity = Math.min(cls.prosperityCap, hold.prosperity + 1);
      hold.defenses++;
      hold.fallAt = undefined;
      hold.rebuildAt = undefined;
      hold.siegeAt = nativeHost.time + HARBORHOLD_CFG.graceAfterOpenSec
        + nativeHost.encRng.range(cls.siegeEverySec[0], cls.siegeEverySec[1]);
      if (ward && !ward.dead) ward.dead = true; // stands down quietly (no corpse path)
      const ps = holdStructureIn(nativeHost.structures, cls.structure);
      const gate = ps ? holdGateDoor(ps) : null;
      if (gate) nativeHost.setDoorState(gate.door.id, 'open');
      nativeHost.refreshHoldDress(def);
      nativeHost.refreshHoldServices(def);
      const lvl = Math.max(1, def.level);
      nativeHost.grantXp(Math.round(cls.reward.xpBase + cls.reward.xpPerLevel * lvl), ward?.pos); // XP BY PLACE
      for (let i = 0; i < cls.reward.caches; i++) {
        const c = nativeHost.createMonster(FIXTURE_IDS.harbor_cache, lvl, 'enemy');
        c.pos = nativeHost.clampPos(vec(at.x + rand(-70, 70), at.y + rand(-50, 50)), c.radius);
        nativeHost.actors.push(c);
        observeNativeCombatBirth(nativeHost,c);
      }
      bumpLedger(nativeHost.ledger, 'ports_defended');
      if (def.portTier === 'haven') bumpLedger(nativeHost.ledger, 'havens_defended');
      // The town's SECRET SITES re-roll the moment it stands (the Mooring
      // Stone seats on OPEN holds — the calling should land with the win,
      // not on the next visit; placeVocationSites is idempotent per site).
      nativeHost.placeVocationSites(def);
      // THE CAUSEWAY OPENS (the harbor pair): the win unbars the quay road
      // (the 'harborhold' lock reads live state — nothing to flip) and
      // shows the port on the chart: the harbor is the hold's reward, and
      // the map says so the moment the siege breaks.
      if (def.holdPort) {
        const port = nativeHost.zoneMap[def.holdPort];
        if (port) {
          const news = port.veiled || (!nativeHost.visited.has(port.id) && !nativeHost.surveyed.has(port.id));
          port.veiled = false;
          nativeHost.surveyed.add(port.id);
          // The win names the port: the hold's own quay door re-speaks NOW
          // (the entry law) — a re-won siege changes nothing and stays quiet.
          if (news) nativeHost.refreshExitLabels();
          nativeHost.text(vec(at.x, at.y - 100),
            `the quay causeway stands open — ${port.name} waits through the gate`, '#9fd8ec', 14);
        }
      }
      const first = !nativeHost.ledger.first_hold_opened;
      if (first) bumpLedger(nativeHost.ledger, 'first_hold_opened');
      nativeHost.text(vec(at.x, at.y - 76),
        first ? `the siege breaks — ${def.name} opens its gates to you` : `the siege breaks — ${def.name} stands`,
        '#7fd0ff', first ? 17 : 16);
      nativeHost.flashes.push({ pos: at, radius: 150, color: '#7fd0ff', life: 0.8, maxLife: 0.8 });
    } else {
      bumpLedger(nativeHost.ledger, 'ports_lost');
      nativeHost.fellHold(def, 'the ward is broken — the harbor burns');
      nativeHost.disperseSwarmBodies(d.alive, new Map(), at, 320, { lingerSec: [8, 18], arriveDist: 60 });
    }
  }

export function sceneSpawnHoldBesieger(nativeHost:NativeSceneCampaignFrameClosureHost, cls: HoldClassDef, ward: Actor): void {
    const s = cls.siege;
    const lvl = Math.max(1, nativeHost.zone.level + s.levelBonus);
    // THE LOCAL TIDE: the class table seasoned by the coast it breaks on
    // (HARBORHOLD_CFG.tideBiomes — light rows; the sea's kin stay the spine).
    const biomeRows = nativeHost.zone.biome ? HARBORHOLD_CFG.tideBiomes[nativeHost.zone.biome] ?? [] : [];
    let table: { id: string; weight: number }[] = biomeRows.length ? [...s.table, ...biomeRows] : s.table;
    if (s.mixNative > 0 && nativeHost.encRng.chance(s.mixNative)) {
      const native = nativeHost.effectiveSpawn(nativeHost.zone, nativeHost.baseTable(nativeHost.zone)).table;
      if (native.length) table = native;
    }
    if (!table.length) return;
    const type = nativeHost.weightedPick(table, lvl);
    const m = nativeHost.createMonster(type, lvl, 'enemy');
    m.tag = 'hold_siege';
    m.eventKey = `harborhold:${nativeHost.zone.id}`;
    const at = nativeHost.swarmEntryPoint(ward.pos, s.entryRadius);
    m.pos = nativeHost.clampPos(vec(at.x + rand(-26, 26), at.y + rand(-26, 26)), m.radius);
    const ag = m.defId ? MONSTERS[m.defId]?.aggro : undefined;
    m.aiTuning = {
      target: {
        prefer: 'highestThreat', relentless: true, stickiness: s.stickiness,
        threat: { damage: ag?.fury ?? 1, decay: s.decay * (ag?.waver ?? 1) },
      },
    };
    m.addThreat(ward.id, s.seedThreat * (ag?.fixation ?? 1));
    m.aiTargetId = ward.id;
    m.aggroed = true;
    nativeHost.holdDefense!.alive.add(m.id);
    nativeHost.actors.push(m);
  }

export function sceneGetMireille(nativeHost:NativeSceneCampaignFrameClosureHost, p: Actor = nativeHost.player): Actor | null { // p: THE COUNTERS AND THE JOURNAL, the body that lingers
    // SOVEREIGNTY: census — a find by role (the derived census, probe_tiers RIG T).
    if (!nativeHost.isPresentActor(p)) return null;
    return nativeHost.actors.find(a =>
      nativeHost.hasNpcRole(a, 'innkeep')
      && dist(a.pos, p.pos) <= MIREILLE_RADIUS
      && nativeHost.dwellReachable(p.pos, a.pos, npcDwellReach('innkeep'), { from: p.tier ?? 0, to: a.tier ?? 0 })) ?? null;
  }

export function sceneMireilleLessonLived(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    return (nativeHost.account.ledger[LEDGER_FLASK_LESSON] ?? 0) >= 1
      || (nativeHost.ledger[MIREILLE_FILL_LEDGER] ?? 0) >= 1
      || (nativeHost.ledger[MIREILLE_LESSON_LEDGER] ?? 0) >= 1;
  }

export function sceneMireilleLessonStep(nativeHost:NativeSceneCampaignFrameClosureHost): 'learn' | null {
    for (const s of MIREILLE_LESSON_STEPS) if (s.pendingSkills(nativeHost).length) return s.id;
    return null;
  }

export function sceneMireilleStampLived(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (!(nativeHost.ledger[MIREILLE_LESSON_LEDGER] ?? 0)) bumpLedger(nativeHost.ledger, MIREILLE_LESSON_LEDGER);
  }

export function sceneMireilleSeatStep(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, dt: number): void {
    let row = nativeHost.mireilleSeats.get(seat);
    if (!row) nativeHost.mireilleSeats.set(seat, row = { t: 0, cd: 0 });
    if (row.cd > 0) row.cd -= dt;
    if (!nativeHost.mireilleUnlocked() || !nativeHost.getMireille(seat.actor) || !nativeHost.seatIdle(seat)) { row.t = 0; return; }
    row.t += dt;
    if (row.t < MIREILLE_DWELL || row.cd > 0) return;
    const p = seat.actor, parts: string[] = [];
    if (featureEnabled(nativeHost.account, FEATURE.MIREILLE_HEAL_LIFE) && p.life < p.maxLife()) { p.refillLife(); parts.push('life'); }
    if (featureEnabled(nativeHost.account, FEATURE.MIREILLE_HEAL_MANA) && p.mana < p.maxMana()) { p.mana = p.maxMana(); parts.push('mana'); }
    if (featureEnabled(nativeHost.account, FEATURE.MIREILLE_HEAL_LIFE) && nativeHost.fillOrbFounts(seat.meta, p, 'life')) parts.push('life founts');
    if (featureEnabled(nativeHost.account, FEATURE.MIREILLE_HEAL_MANA) && nativeHost.fillOrbFounts(seat.meta, p, 'mana')) parts.push('mana founts');
    const blessed = (nativeHost.mireilleSeatBuff.get(seat) ?? 0) - nativeHost.time;
    if (featureEnabled(nativeHost.account, FEATURE.MIREILLE_XP_BUFF) && blessed < MIREILLE_XP_REFRESH) {
      nativeHost.mireilleSeatBuff.set(seat, nativeHost.time + MIREILLE_XP_BUFF_SEC); parts.push('+5% xp');
    }
    if (!parts.length) return;
    nativeHost.text(p.pos, `Mireille: ${parts.join(', ')}`, '#a0d8a0', 14);
    row.t = 0; row.cd = MIREILLE_COOLDOWN;
  }

export function sceneMireilleUnlocked(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    return featureEnabled(nativeHost.account, FEATURE.MIREILLE_HEAL_LIFE)
      || featureEnabled(nativeHost.account, FEATURE.MIREILLE_HEAL_MANA)
      || featureEnabled(nativeHost.account, FEATURE.MIREILLE_XP_BUFF);
  }

export function sceneMireilleGiftOwed(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    if (nativeHost.ledger[MIREILLE_GIFT_LEDGER]) return false;
    return MIREILLE_GIFT_SKILLS.some(id => !!SKILLS[id]
      && !nativeHost.meta.knownSkills.has(id)
      && !findBagGem(nativeHost.meta.items, 'skill', id));
  }

export function sceneMireilleService(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    const p = nativeHost.player;
    let did = false;
    const parts: string[] = [];
    // THE WELCOME GIFT — once per character (the run ledger remembers), and
    // only the gaps: a copy already known or carried is never duplicated.
    // The flasks land as bag ITEMS, not on the rack: the hero seats them
    // THEMSELVES, with Mireille's talk directing the move — the same
    // pack→seat loop every Memory they'll ever loot follows. Teaching by
    // doing, not by doing-for.
    if (nativeHost.mireilleGiftOwed()) {
      // THE RESIDENCE: her flasks land as bag ITEMS now — and the gift is
      // ALL-OR-NOTHING: the ledger must never stamp with a flask refused
      // to a full pack (a half-gift would orphan the other forever).
      // Wrappers are 1×1, so free cells >= gaps guarantees the whole hand.
      const owed = MIREILLE_GIFT_SKILLS.filter(sid => SKILLS[sid]
        && !nativeHost.meta.knownSkills.has(sid)
        && !findBagGem(nativeHost.meta.items, 'skill', sid));
      if (owed.length && freeCellCount(nativeHost.meta.items) < owed.length) {
        nativeHost.text(vec(p.pos.x, p.pos.y - 22),
          'Your pack is full, love — make room and come back.', '#d8b87a', 13);
        // The refusal consumes her beat (nothing was given, so the caller
        // won't): she asks once per cooldown, never once per frame.
        nativeHost.mireilleCd = MIREILLE_COOLDOWN;
      } else if (owed.length) {
        for (const sid of owed) {
          // Her authored generosity: a MAGIC gem — above the class kit's floor.
          nativeHost.grantSkillGemItem(nativeHost.localSeat, makeSkillGem(SKILLS[sid], 1, 'magic'));
        }
        bumpLedger(nativeHost.ledger, MIREILLE_GIFT_LEDGER);
        did = true; parts.push('two flasks, into your pack');
        nativeHost.text(vec(p.pos.x, p.pos.y - 22), 'Open your inventory ({bind:panelInv}), love.', '#d8b87a', 13);
      }
    }
    if (featureEnabled(nativeHost.account, FEATURE.MIREILLE_HEAL_LIFE) && p.life < p.maxLife()) {
      p.refillLife(); did = true; parts.push('life');
    }
    if (featureEnabled(nativeHost.account, FEATURE.MIREILLE_HEAL_MANA) && p.mana < p.maxMana()) {
      p.mana = p.maxMana(); did = true; parts.push('mana');
    }
    // FLASK REPLENISH: her brews top the founts themselves. Every KNOWN
    // skill's orb-fed bank of the unlocked resource fills to its true cap
    // (gainCharge folds chargeCap mods, so deeper draughts fill deeper).
    const fillFounts = (kind: 'life' | 'mana'): boolean => nativeHost.fillOrbFounts(nativeHost.meta, p, kind);
    if (featureEnabled(nativeHost.account, FEATURE.MIREILLE_HEAL_LIFE) && fillFounts('life')) {
      did = true; parts.push('life founts');
    }
    if (featureEnabled(nativeHost.account, FEATURE.MIREILLE_HEAL_MANA) && fillFounts('mana')) {
      did = true; parts.push('mana founts');
    }
    if (featureEnabled(nativeHost.account, FEATURE.MIREILLE_XP_BUFF) && nativeHost.mireilleXpBuff < MIREILLE_XP_REFRESH) {
      nativeHost.mireilleXpBuff = MIREILLE_XP_BUFF_SEC; did = true; parts.push('+5% xp');
    }
    if (did) nativeHost.text(p.pos, `Mireille: ${parts.join(', ')}`, '#a0d8a0', 14);
    return did;
  }

export function sceneNearMusterHorn(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    if (!nativeHost.zone.harborhold) return false;
    const horn = nativeHost.doodads.find(d => d.kind === 'muster_horn');
    return !!horn && nativeHost.isPresentActor(seat.actor) && dist(seat.actor.pos, horn.pos) <= HARBORHOLD_CFG.muster.radius
      && nativeHost.dwellReachable(seat.actor.pos, horn.pos, DWELL_CFG.reach, nativeHost.storyPair(seat.actor, horn));
  }

export function sceneNearOracle(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    const stone = nativeHost.stationAnchor('oracle');
    const oracle = nativeHost.actors.find(a => a.defId === 'townsfolk_oracle' && !a.dead);
    return nativeHost.hasOracle() && [stone, oracle].some(a => !!a
      && dist(seat.actor.pos, a.pos) <= SALVAGE_CFG.stationRadius
      && nativeHost.dwellReachable(seat.actor.pos, a.pos, DWELL_CFG.reach, { from: seat.actor.tier ?? 0, to: a.tier ?? 0 }));
  }

export function scenePortDock(nativeHost:NativeSceneCampaignFrameClosureHost): Doodad | null {
    if (!nativeHost.zone.port) return null;
    return nativeHost.doodads.find(d => d.kind === 'dock') ?? null;
  }

export function sceneCanSail(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    if (nativeHost.clientActionHook) return false; // host-authoritative
    if (!nativeHost.isPresentLocalPlayer() || nativeHost.gameOver || nativeHost.player.dead || nativeHost.player.downed) return false;
    if (!nativeHost.zone.port) return false;
    const dock = nativeHost.portDock();
    if (!dock || dist(nativeHost.player.pos, dock.pos) > 140) return false;
    const o = nativeHost.zone.objective;
    const gated = !nativeHost.objectiveDone
      && (o.kind === 'boss' || o.kind === 'spawners' || (o.kind === 'waves' && o.waves > 0));
    return !gated;
  }

export function sceneEnterSailing(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (!nativeHost.canSail()) return;
    const from = nativeHost.zone;
    nativeHost.caveMap[VOYAGE_ZONE_ID] = nativeHost.voyageZoneDef();
    nativeHost.voyage = {
      fromPortId: from.id, landDwell: 0,
      lastStreamAt: vec(Infinity, Infinity), grace: VOYAGE_CFG.castOffGrace,
      ship: shipOf(nativeHost.account),
    };
    nativeHost.wraithsailSighted = false; // one horizon-toast per voyage
    bumpLedger(nativeHost.ledger, 'voyages_sailed'); // surfaces the Shipwright tier
    nativeHost.loadZone(VOYAGE_ZONE_ID, from.id);
    const a = nativeHost.oceanBearing(from.map);
    let at = { x: from.map.x, y: from.map.y };
    for (let i = 1; i <= 16; i++) {
      at = { x: from.map.x + Math.cos(a) * i * 12, y: from.map.y + Math.sin(a) * i * 12 };
      if (nativeHost.continentFor(at).kind === 'ocean') break;
    }
    nativeHost.player.pos = nativeHost.seaFromNode(at);
    nativeHost.streamCoast(true);
    // GUARANTEED OPEN WATER: push seaward until the nearest STREAMED shore is
    // comfortably past the landing probe — the coast discs bulge well beyond
    // their samples, and an idle cast-off spawned inside the probe would dwell
    // straight back onto the beach it just left. Measured against the real
    // collision (nearestShore), not the field samples. Capped: a boat wedged
    // in a very tight strait just keeps its grace and sails out by hand.
    for (let push = 0; push < 40; push++) {
      const sh = nativeHost.nearestShore();
      if (!sh || sh.gap > VOYAGE_CFG.landingProbe * 1.4) break;
      nativeHost.player.pos.x += Math.cos(a) * 50;
      nativeHost.player.pos.y += Math.sin(a) * 50;
    }
    nativeHost.streamCoast(true);
    // The party's boats bob alongside — seats AND the carried court (THE
    // PARTY-LANDING LAW; open water: unclamped, the sea has no walls).
    nativeHost.landPartyAt(nativeHost.player.pos, { spread: 70, band: [-70, 70], clamp: false });
    nativeHost.notice(`you cast off aboard the ${nativeHost.voyage.ship.name} — sail for any shore, linger to land`, '#7fd0ff', 15, 'world');
  }

export function sceneNearSalvage(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    const a = nativeHost.stationAnchor('salvage'); // THE ANCHORED DWELL: the bench slab
    return nativeHost.hasSalvage() && !!a
      && dist(seat.actor.pos, a.pos) <= SALVAGE_CFG.stationRadius
      && nativeHost.dwellReachable(seat.actor.pos, a.pos, DWELL_CFG.reach, { from: seat.actor.tier ?? 0, to: a.tier });
  }

export function sceneNearTracker(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    const a = nativeHost.stationAnchor('tracker'); // THE ANCHORED DWELL: the Tracker's fire
    return nativeHost.counterOwned(FEATURE.TRACKER) // THE KEEPER'S GATE, mirrored on a render shell
      && nativeHost.townPresent() && !!a
      && dist(seat.actor.pos, a.pos) <= SALVAGE_CFG.stationRadius
      && nativeHost.dwellReachable(seat.actor.pos, a.pos, DWELL_CFG.reach, { from: seat.actor.tier ?? 0, to: a.tier });
  }

export function sceneSwapRefusal(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, kind: 'unlearn' | 'socket' | 'unsocket', skillId?: string): string | null {
    return nativeHost.swapReadiness(seat, kind, skillId).reason;
  }

export function sceneMemorySecondaryRefusal(nativeHost:NativeSceneCampaignFrameClosureHost, skillId: string, mechanic: MemorySecondaryMechanic = 'tree'): string | null {
    if (MEMORY_UNLOCK_CFG.secondary.mechanics[mechanic]
      && !(nativeHost.netMemoryAccess?.progression ?? memoryProgressionOpen(nativeHost.account))) return powerProgressionRefusal('awakening');
    const def = SKILLS[skillId];
    if (!def || def.noDrop || (def.dropWeight ?? 100) <= 0) return null; // internal/granted-only verbs have no discovery purchase
    const remote = nativeHost.netMemoryAccess?.[mechanic];
    const open = nativeHost.netMemoryAccess && remote !== undefined
      ? remote === null || remote.includes(skillId)
      : memorySecondaryOpen(nativeHost.account, 'skill', skillId, mechanic);
    return open ? null : 'Awaken this skill through a legendary find or the Vault.';
  }

export function sceneAcceptAmalgamHunt(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const site = nativeHost.amalgamSite;
    const af = nativeHost.sim.amalgamationField;
    if (!site || !af) return;
    const cfg = af.surge();
    const zoneId = nativeHost.pickAmalgamMinibossZone();
    if (!zoneId) { nativeHost.text(nativeHost.player.pos, 'The Bonewright finds no quarry nearby…', '#9ad0b0', 14); return; }
    const stage = af.peek()?.stage ?? 0;
    const rng = new Rng((packageSeed(nativeHost.manifest.seed, 'amalgamation') ^ hashStr(`${site.id}:def:${stage}`)) >>> 0);
    const defId = cfg.minibossIds[rng.int(0, cfg.minibossIds.length - 1)] ?? cfg.minibossIds[0];
    af.acceptQuest(zoneId, defId);
    const zn = nativeHost.zoneMap[zoneId]?.name ?? 'the wilds';
    nativeHost.notice(`Slay the undead at ${zn}, then return. (M)`, '#9ad0b0', 16, 'civic');
  }

export function sceneAmalgamPickSpots(nativeHost:NativeSceneCampaignFrameClosureHost, center: Vec2, offered: string[]): { pos: Vec2; partId: string }[] {
    const out: { pos: Vec2; partId: string }[] = [];
    const n = Math.max(1, offered.length);
    for (let i = 0; i < offered.length; i++) {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      out.push({ pos: vec(center.x + Math.cos(ang) * AMALGAM_PICK_RING, center.y + Math.sin(ang) * AMALGAM_PICK_RING), partId: offered[i] });
    }
    return out;
  }

export function sceneGraftAmalgamPart(nativeHost:NativeSceneCampaignFrameClosureHost, partId: string): void {
    const site = nativeHost.amalgamSite;
    const af = nativeHost.sim.amalgamationField;
    if (!site || !af) return;
    const part = af.partById(partId);
    const done = af.pickPart(partId);
    nativeHost.flashes.push({ pos: vec(site.center.x, site.center.y), radius: 90, color: '#9ad0b0', life: 0.6, maxLife: 0.6 });
    nativeHost.text(vec(site.center.x, site.center.y - 40),
      done ? `${part?.label ?? 'A part'} grafted — the Amalgamation stirs!` : `${part?.label ?? 'A part'} grafted.`,
      '#9ad0b0', 15);
    if (done) nativeHost.riseAmalgamation();
  }

export function sceneDescend(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const site = nativeHost.descentSite, df = nativeHost.sim.descentField;
    // ONE descent per Delver per run: a spent shaft never re-opens (you resurface to
    // spend Echoes, not to dive again — also kills any descend↔resurface bounce).
    if (!site || nativeHost.descentRun || !df || nativeHost.descentSpent.has(nativeHost.zone.id)) return;
    const parentCaveId = nativeHost.zone.id;
    nativeHost.descentSpent.add(parentCaveId);
    const id = `cave_descent_${parentCaveId}`;
    const prevReturn = nativeHost.caveReturn
      ? { zoneId: nativeHost.caveReturn.zoneId, pos: vec(nativeHost.caveReturn.pos.x, nativeHost.caveReturn.pos.y), entryFrom: nativeHost.caveReturn.entryFrom }
      : null;
    if (!nativeHost.caveMap[id]) {
      const abyss = mintCave(nativeHost.zone, ((nativeHost.zone.seed ?? 0) ^ 0xab10de) >>> 0, id, 'descent');
      abyss.eventOwned = true; // the dive's own ground — same owned-realm classifier as the arenas
      nativeHost.caveMap[id] = abyss;
    }
    nativeHost.caveReturn = { zoneId: parentCaveId, pos: vec(site.platform.x, site.platform.y), entryFrom: nativeHost.entryFrom };
    nativeHost.descentRun = { caveId: id, parentCaveId, origin: vec(0, 0), prevReturn, baseLevel: 0, haul: {}, haulBank: 0, depth: 0 };
    bumpLedger(nativeHost.ledger, 'descents_run');
    nativeHost.loadZone(id, parentCaveId); // the cave branch calls enterDescentZone()
  }

export function sceneSpawnDepthkin(nativeHost:NativeSceneCampaignFrameClosureHost, cfg: import('../packages/overlays/descent').DescentSurge): void {
    const run = nativeHost.descentRun;
    if (!run) return;
    let live = nativeHost.actors.filter(a => a.team === 'enemy' && !a.dead && a.faction === cfg.faction).length;
    const cap = Math.min(cfg.spawnCapMax, cfg.spawnCap + run.depth * cfg.spawnCapPerDepth);
    const roster = FACTIONS[cfg.faction]?.table;
    if (!roster?.length) return;
    const lvl = Math.max(1, nativeHost.zone.level + cfg.enemyLevelBonus);
    let batch = 1 + Math.floor(run.depth * cfg.spawnBatchPerDepth);
    while (batch-- > 0 && live < cap) {
      const id = nativeHost.weightedPick(roster, cfg.broodAnchor + run.depth);
      const m = nativeHost.createMonster(id, lvl, 'enemy');
      m.faction = cfg.faction;
      const ang = rand(0, Math.PI * 2);
      const dr = rand(cfg.spawnDist[0], cfg.spawnDist[1]);
      m.pos = vec(nativeHost.player.pos.x + Math.cos(ang) * dr, nativeHost.player.pos.y + Math.sin(ang) * dr);
      nativeHost.actors.push(m);
      nativeHost.admitCombatBirth(m);
      live++;
    }
  }

export function sceneStreamDescentTerrain(nativeHost:NativeSceneCampaignFrameClosureHost, cfg: import('../packages/overlays/descent').DescentSurge): void {
    const p = nativeHost.player.pos;
    nativeHost.doodads = nativeHost.doodads.filter(d => d.kind === 'descent_platform' || dist(d.pos, p) <= cfg.cullRadius);
    const isTerrain = (k: string): boolean => k === 'rock' || k === 'void_chasm' || k === 'light_spot' || k === 'ruin_obelisk';
    let need = cfg.doodadTarget - nativeHost.doodads.filter(d => isTerrain(d.kind)).length;
    while (need-- > 0) {
      const ang = rand(0, Math.PI * 2), r = rand(660, 1180); // off-screen, into the dark
      const at = vec(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r);
      const roll = Math.random();
      if (roll < 0.55) nativeHost.doodads.push({ pos: at, radius: rand(26, 60), kind: 'rock', rot: rand(-0.4, 0.4) });
      else if (roll < 0.78) nativeHost.doodads.push({ pos: at, radius: rand(15, 24), kind: 'light_spot' });
      else if (roll < 0.95) nativeHost.doodads.push({ pos: at, radius: rand(40, 82), kind: 'void_chasm', fall: true });
      else nativeHost.doodads.push({ pos: at, radius: rand(20, 28), kind: 'ruin_obelisk',
        effect: { id: 'descent_trap', interval: 2.6, radius: 130, chance: 0.85, power: 8 } });
    }
  }

export function sceneSameParty(nativeHost:NativeSceneCampaignFrameClosureHost, a: Seat, b: Seat): boolean { return nativeHost.sameSeatParty(a.id, b.id); }

export function sceneReviveSeat(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): void {
    const a = seat.actor;
    a.downed = false;
    a.dead = false;
    a.life = Math.max(1, a.maxLife() * REVIVE_LIFE_FRAC);
    a.mana = a.maxMana();
    seat.reviveDwellBy.clear();
    nativeHost.events.emit('player/revived', { actor: a, seat: seat.id });
    nativeHost.showRecoveryCue(a, 'revive');
  }

export function sceneLightwellDoodads(nativeHost:NativeSceneCampaignFrameClosureHost): readonly Doodad[] {
    if (nativeHost.wellArr !== nativeHost.doodads || nativeHost.wellLen !== nativeHost.doodads.length
      || nativeHost.wellRev !== nativeHost.doodadsRev) {
      nativeHost.wells = nativeHost.doodads.filter(d => !!lightwellOf(d.kind));
      nativeHost.wellArr = nativeHost.doodads;
      nativeHost.wellLen = nativeHost.doodads.length;
      nativeHost.wellRev = nativeHost.doodadsRev;
    }
    return nativeHost.wells;
  }

export function sceneLightCoverAt(nativeHost:NativeSceneCampaignFrameClosureHost, p: Vec2): boolean {
    for (const d of nativeHost.lightwellDoodads()) {
      if (lightwellOf(d.kind)?.burst) continue;
      const r = lightReach(d);
      if (r !== null && r > 0 && dist(p, d.pos) <= r) return true;
    }
    return false;
  }

export function sceneLightMeterHeld(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    if (nativeHost.descentRun) return false;
    const gf = nativeHost.sim.gloamingField;
    if (!gf || skyOf(nativeHost.zone) === 'sheltered') return false;
    return gf.gloomOn(nativeHost.zone.id) > 0.001 && !nativeHost.radianceCondHeld(gf.surge().bite);
  }

export function sceneMercParley(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): { near: boolean; why: string | null } {
    const post = nativeHost.mercOutpost;
    if (!post || post.captain.dead) return { near: false, why: 'No captain stands here.' };
    const cfg = MERC_CFG.outpost;
    const near = dist(post.captain.pos, seat.actor.pos) <= cfg.radius
      && nativeHost.dwellReachable(seat.actor.pos, post.captain.pos, npcDwellReach('captain'), nativeHost.storyPair(seat.actor, post.captain));
    if (!near) return { near: false, why: 'Not within a captain’s hail.' };
    if (!nativeHost.objectiveDone) return { near, why: 'Settle this ground’s business first.' };
    const foeNear = nativeHost.actors.some(a =>
      a.team === 'enemy' && !a.dead && !a.passive && !a.untargetable
      && dist(a.pos, seat.actor.pos) <= cfg.enemyRadius);
    if (foeNear) return { near, why: 'Not with company like that about.' };
    if (nativeHost.time - nativeHost.lastCombatAt < cfg.calmSec) return { near, why: 'Let the blood cool a moment.' };
    return { near, why: null };
  }

export function sceneCanReclaim(nativeHost:NativeSceneCampaignFrameClosureHost, _c: PlayerCorpse): boolean { return true; }

export function sceneReclaimCorpse(nativeHost:NativeSceneCampaignFrameClosureHost, c: PlayerCorpse): void {
    const own = nativeHost.modeStageDef().corpseSource === 'own';
    const rec = nativeHost.corpseRecords()[c.recordIndex];
    if (!rec) { c.reclaimed = true; return; }
    for (const it of rec.loot.items) nativeHost.dropSavedLoot(c.pos, it);
    rec.loot.items = [];
    c.reclaimed = true;
    // THE OBJECTIVE WEB's corpse deed (account.ts LEDGER_CORPSES_RECLAIMED):
    // ACCOUNT-DIRECT, once per reclaimed corpse — the account is being
    // written here anyway, and a counted deed must never double through a
    // merge. Meta-gated like every account feed (the Undying feed nothing).
    if (nativeHost.metaProgressionActive()) {
      nativeHost.account.ledger[LEDGER_CORPSES_RECLAIMED] = (nativeHost.account.ledger[LEDGER_CORPSES_RECLAIMED] ?? 0) + 1;
      nativeHost.accountDirty = true;
    }
    nativeHost.text(vec(c.pos.x, c.pos.y - 24), 'You reclaim what death took.', '#d8b048', 16);
    nativeHost.flashes.push({ pos: vec(c.pos.x, c.pos.y), radius: 64, color: '#d8b048', life: 0.5, maxLife: 0.5 });
    if (own) nativeHost.charDirty = true; // the ring rides the character save
    else saveAccount(nativeHost.account); // fire-and-forget OK: a lost reclaim self-heals (corpse re-spawns)
  }

export function sceneUpdateWraithsailAtSea(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const wf = nativeHost.sim.wraithsailField;
    const ship = wf?.shipInfo();
    const idx = nativeHost.doodads.findIndex(d => d.kind === 'ghost_hull');
    if (!wf || !ship || ship.mode === 'docked') {
      if (idx >= 0) nativeHost.doodads.splice(idx, 1); // she's elsewhere (or nowhere)
      return;
    }
    const at = nativeHost.seaFromNode({ x: ship.x, y: ship.y });
    const near = dist(at, nativeHost.player.pos) <= VOYAGE_CFG.streamRadius * 2;
    if (!near) {
      if (idx >= 0) nativeHost.doodads.splice(idx, 1);
      return;
    }
    if (idx >= 0) {
      const d = nativeHost.doodads[idx];
      d.pos.x = at.x; d.pos.y = at.y;
      d.rot = ship.heading;
    } else {
      nativeHost.doodads.push({ pos: vec(at.x, at.y), radius: 64, kind: 'ghost_hull', rot: ship.heading });
    }
    // 'A ghost sail crosses the horizon…' — once per voyage, and the ledger
    // the Vault unlock reads (wraithsail_seen) is bumped on the spot.
    const dNodes = Math.hypot(ship.x - nativeHost.nodeFromSea(nativeHost.player.pos).x, ship.y - nativeHost.nodeFromSea(nativeHost.player.pos).y);
    if (!nativeHost.wraithsailSighted && dNodes <= wf.surge().sightRadius) {
      nativeHost.wraithsailSighted = true;
      bumpLedger(nativeHost.ledger, 'wraithsail_seen');
      nativeHost.notice('a ghost sail crosses the horizon — the WRAITHSAIL is abroad', '#7ad8d8', 16, 'events');
    }
  }

export function sceneNearestShore(nativeHost:NativeSceneCampaignFrameClosureHost): { d: Doodad; gap: number } | null {
    let best: Doodad | null = null, bg = Infinity;
    for (const d of nativeHost.doodads) {
      if (d.kind !== 'landmass') continue;
      const gap = dist(nativeHost.player.pos, d.pos) - d.radius;
      if (gap < bg) { bg = gap; best = d; }
    }
    return best ? { d: best, gap: bg } : null;
  }

export function sceneLandingSiteFor(nativeHost:NativeSceneCampaignFrameClosureHost, shore: Doodad): { islandId?: string; spot?: SeaPortSpot; portZone?: ZoneDef } | null {
    if (shore.land?.islandId) return { islandId: shore.land.islandId };
    const at = nativeHost.nodeFromSea(nativeHost.player.pos);
    let best: SeaPortSpot | null = null;
    let bd = SEA_CFG.landingSlack;
    for (const s of seaSpotsNear(at, SEA_CFG.landingSlack + 80, nativeHost.sim.biomeField.fieldSeed)) {
      const d = coordDist(s.shore, at);
      if (d <= bd) { bd = d; best = s; }
    }
    if (best) return { spot: best };
    const near = Object.values(nativeHost.zoneMap).find(z =>
      z.port && !z.dimension && coordDist(z.map, at) <= SEA_CFG.landingSlack + 40);
    return near ? { portZone: near } : null;
  }

export function sceneLandAshore(nativeHost:NativeSceneCampaignFrameClosureHost, shore: Doodad): void {
    const run = nativeHost.voyage;
    if (!run) return;
    let dest: ZoneDef | null = null;
    const isleId = shore.land?.islandId;
    if (isleId) {
      // A sighted island was already minted by the stream; belt-and-suspenders:
      // re-derive the spot from the pure field and mint if a race dropped it.
      dest = nativeHost.zoneMap[isleId] ?? null;
      if (!dest) {
        const [, gx, gy] = isleId.split('_');
        const spot = islandAtCell(Number(gx), Number(gy), nativeHost.sim.biomeField.fieldSeed);
        if (spot) dest = nativeHost.mintIslandZone(spot);
      }
    }
    if (!dest) {
      const site = nativeHost.landingSiteFor(shore);
      if (site?.spot) {
        const sea = seaAt(site.spot.shore, nativeHost.sim.biomeField.fieldSeed);
        if (sea) nativeHost.ensureSeaPorts(sea);
        dest = nativeHost.zoneMap[site.spot.id] ?? null;
      } else if (site?.portZone) {
        dest = site.portZone;
      }
      if (!dest) {
        // Breakers (the dwell shouldn't have fired — a stream race): refuse
        // honestly and sail on.
        nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 40),
          'breakers — no landing here', '#9ab8cc', 13);
        run.landDwell = 0;
        return;
      }
    }
    // The crossing is charted: sea-route memory both ways (the map's sea lane).
    const from = nativeHost.zoneMap[run.fromPortId];
    if (from && dest.id !== from.id) {
      (from.searoutes ??= []).includes(dest.id) || from.searoutes!.push(dest.id);
      (dest.searoutes ??= []).includes(from.id) || dest.searoutes!.push(from.id);
    }
    nativeHost.voyage = null;
    nativeHost.loadZone(dest.id);
    // Step ashore AT the dock (every landing zone is a port). Force the sail
    // gate CONSUMED: we just placed the player inside its dwell radius, and
    // the latch reset while at sea (canSail was false) — without this, four
    // idle seconds on the dock would bounce the boat right back out.
    nativeHost.sailGate.consume();
    const dock = nativeHost.portDock();
    if (dock) {
      // THE PARTY-LANDING LAW: the whole party steps ashore at the planks.
      nativeHost.landPartyAt(vec(dock.pos.x, dock.pos.y + 34), { band: [-4, 46] });
    }
    // A Voyage island lands with its own story (the def's blurb + the ledger
    // that surfaces the Brigantine); an ordinary coast keeps the plain line.
    const isleDef = isleId ? VOYAGE_ISLANDS[nativeHost.islandDefIdOf(dest) ?? ''] : undefined;
    if (isleId) bumpLedger(nativeHost.ledger, 'islands_landed');
    nativeHost.notice(`you make landfall — ${dest.name}`, '#7fd0ff', 15, 'world');
    if (isleDef?.blurb) {
      nativeHost.notice(isleDef.blurb, '#9ad0e8', 13, 'world');
    }
  }

export function sceneWitherGrafts(nativeHost:NativeSceneCampaignFrameClosureHost, host: Actor, key: string): number {
    if (!host.partActors?.length) return 0;
    let n = 0;
    for (const p of [...host.partActors]) {
      if (p.dead || p.graftKey !== key) continue;
      p.dead = true;
      p.partLink = undefined;
      nativeHost.flashes.push({
        pos: vec(p.pos.x, p.pos.y), radius: p.radius * 1.3,
        color: p.color, life: 0.3, maxLife: 0.3,
      });
      n++;
    }
    if (n) host.partActors = host.partActors.filter(p => !p.dead || p.partLink);
    return n;
  }

export function sceneIsPressingFoe(nativeHost:NativeSceneCampaignFrameClosureHost, a: Actor, at: Vec2, tier = 0, radius = SWAP_DISCIPLINE_CFG.foeRadius): boolean {
    return radius > 0 && a.team === 'enemy' && !a.dead && !a.passive && !a.untargetable
      && a.tier === tier
      && (a.skills.some(s => s) || (a.defId ? !!MONSTERS[a.defId]?.spawner : false))
      && dist(a.pos, at) <= radius;
  }

export function sceneBuyerSettlementHost(nativeHost:NativeSceneCampaignFrameClosureHost): NativeSettlementHost {
    const host = nativeHost.nativeSettlementHost(), buyer = nativeHost.shelfCharKey();
    if (!buyer) return host;
    const seed = (nativeHost.manifest.seed ^ hashStr(`vendorbuyer:${buyer}`)) >>> 0;
    return Object.create(host, { manifest: { value: { seed }, enumerable: true } }) as NativeSettlementHost;
  }

export function sceneReconcileBounties(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    nativeHost.bountyOffers = nativeHost.bountyOffers.filter(p => {
      const row = BOUNTY_KINDS[p.kind];
      if (!row) return false;
      if (row.annulled?.(nativeHost, p)) return false;
      if (row.done(nativeHost, p)) return false;
      return true;
    });
    for (const p of [...nativeHost.bountyHands]) {
      const row = BOUNTY_KINDS[p.kind];
      const reason = row ? row.annulled?.(nativeHost, p) ?? null : 'the posting no longer reads';
      if (!reason) continue;
      nativeHost.bountyHands = nativeHost.bountyHands.filter(h => h.id !== p.id);
      const ai = nativeHost.activeQuests.findIndex(e => e.questId === p.id);
      if (ai >= 0) nativeHost.activeQuests.splice(ai, 1);
      nativeHost.notice(`The bounty is annulled — ${reason}. The hand is free.`, BOUNTY_BOARD_CFG.accent, 15, 'civic');
      nativeHost.charDirty = true;
    }
  }

export function sceneBountyBoardUnlocked(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    return nativeHost.counterOwned(FEATURE.BOUNTY_BOARD); // THE KEEPER'S GATE, mirrored on a render shell
  }

export function sceneTownPresent(nativeHost:NativeSceneCampaignFrameClosureHost): boolean { return nativeHost.zone.id === START_ZONE || !!nativeHost.massRuntime?.settlement; }

export function sceneStationAnchor(nativeHost:NativeSceneCampaignFrameClosureHost, site: TownSiteId): { pos: Vec2; tier: number; doodad: Doodad } | null {
    if (!nativeHost.townPresent()) return null;
    // THE CLIENT'S COUNTERS: a render shell's town may stand at another rung than the host's (its
    // own account grows it), so it never re-derives a site: the host's own resolution was shipped.
    if (nativeHost.netCounters) {
      const d = nativeHost.netStationAnchors?.get(site);
      return d && !d.gone && !d.felled ? { pos: vec(d.pos.x, d.pos.y), tier: d.tier ?? 0, doodad: d } : null;
    }
    const seat = nativeHost.townSite(site);
    const sid = townSiteStructure(site);
    if (!seat || !sid) return null;
    let best: Doodad | null = null, bd = Infinity;
    for (const d of nativeHost.doodads) {
      if (d.anchor !== sid || d.gone || d.felled) continue;
      const dd = dist(d.pos, seat);
      if (dd <= DWELL_CFG.anchorReach && dd < bd) { bd = dd; best = d; }
    }
    return best ? { pos: vec(best.pos.x, best.pos.y), tier: best.tier ?? 0, doodad: best } : null;
  }

export function sceneBountyBoardRoster(nativeHost:NativeSceneCampaignFrameClosureHost): { id: string; homeZoneId: string }[] {
    const out: { id: string; homeZoneId: string }[] = [];
    if (nativeHost.bountyBoardUnlocked()) out.push({ id: BOUNTY_BOARD_CFG.boardId, homeZoneId: START_ZONE });
    for (const z of Object.values(nativeHost.zoneMap)) {
      if (!z.holdAnchor) continue;
      const anchor = nativeHost.zoneMap[z.holdAnchor];
      const hold = anchor?.harborhold;
      if (!hold || hold.state !== 'open') continue;
      const cls = holdClassOf(hold);
      if (!holdActiveServices(cls, hold.prosperity).some(sv => sv.id === 'bounty_board')) continue;
      out.push({ id: z.id, homeZoneId: z.id });
    }
    return out;
  }

export function sceneBountyBeatSeconds(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    return Math.max(BOUNTY_BOARD_CFG.minBeatSec, BOUNTY_BOARD_CFG.beatSec);
  }

export function scenePickBountyGemId(nativeHost:NativeSceneCampaignFrameClosureHost, level: number, rng: Rng): string | null {
    const pool = nativeHost.skillDropPool(level);
    if (!pool.length) return null;
    const w = nativeHost.gemWeights(pool, s => s.tags, s => s.dropWeight ?? 100);
    let total = 0;
    for (const x of w) total += x;
    if (total <= 0) return null;
    let r = rng.next() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= w[i];
      if (r <= 0) return pool[i].id;
    }
    return pool[pool.length - 1].id;
  }

export function sceneBountyApproaches(nativeHost:NativeSceneCampaignFrameClosureHost, boardId: string, manageable: boolean): Map<string, TravelRoute> {
    const lvl = nativeHost.questHandLevel(); // THE BOARD PER CHARACTER: the hand's own reach
    const key = boardId + (manageable ? ':m' : ':d') + (nativeHost.localSeat.keeper ? ':' + lvl : '');
    const pass = nativeHost.approachPass?.get(key);
    if (pass) return pass;
    const home = nativeHost.bountyBoardRoster().find(b => b.id === boardId)?.homeZoneId ?? START_ZONE;
    const cfg = manageable ? BOUNTY_BOARD_CFG.routes.manageable : BOUNTY_BOARD_CFG.routes.demanding;
    const routes = bountyRoutes(nativeHost, home, { maxLevel: lvl + cfg.above,
      maxSteps: cfg.steps, maxDistance: cfg.distance * nativeHost.bountyReach() });
    nativeHost.approachPass?.set(key, routes);
    return routes;
  }

export function sceneBountyAppropriate(nativeHost:NativeSceneCampaignFrameClosureHost, p: BountyPosting, routes = nativeHost.bountyApproaches(p.boardId, true)): boolean {
    const z = nativeHost.zoneMap[p.zoneId];
    const level = p.challengeLevel ?? p.expedition?.level ?? z?.level ?? Infinity;
    return !!z && !objectiveSeals(z.objective) && !z.special && !z.eventOwned
      && BOUNTY_BOARD_CFG.routes.manageableKinds.includes(p.kind)
      && !bountySourceRows().some(row => row.census(nativeHost).some(ref => ref.zoneId === p.zoneId))
      && level >= Math.max(1, nativeHost.questHandLevel() - BOUNTY_BOARD_CFG.routes.appropriateBelow)
      && level <= nativeHost.questHandLevel() && routes.has(p.expedition?.anchor ?? p.zoneId);
  }

export function sceneQuestCharKey(nativeHost:NativeSceneCampaignFrameClosureHost): string | null {
    const hand = nativeHost.localSeat.keeper ? nativeHost.questHand() : null;
    return hand && !hand.keeper && !hand.merc ? charKeyOf(hand) : null;
  }

export function sceneGateAccountOf(nativeHost:NativeSceneCampaignFrameClosureHost, _seat?: Seat | null): Account {
    return nativeHost.account;
  }

export function sceneBountyBroaderBonus(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    let add = 0;
    for (const r of BOUNTY_BOARD_CFG.growth.broader) {
      if (featureEnabled(nativeHost.gateAccountOf(nativeHost.questHand()), r.flag)) add += r.add; // THE SEAT'S GATE
    }
    return add;
  }

export function sceneBountyReach(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    let mul = 1;
    for (const r of BOUNTY_BOARD_CFG.growth.farther) {
      if (featureEnabled(nativeHost.gateAccountOf(nativeHost.questHand()), r.flag)) mul *= r.mul; // THE SEAT'S GATE
    }
    return mul;
  }

export function sceneHandOwns(nativeHost:NativeSceneCampaignFrameClosureHost, p: BountyPosting): boolean {
    return !nativeHost.localSeat.keeper || !p.holder || p.holder === nativeHost.questHand().id;
  }

export function sceneCounterOwned(nativeHost:NativeSceneCampaignFrameClosureHost, feature: string): boolean {
    return nativeHost.netCounters ? nativeHost.netCounters.has(feature) : featureEnabled(nativeHost.account, feature);
  }

export function sceneRefreshHoldDress(nativeHost:NativeSceneCampaignFrameClosureHost, def: ZoneDef): void { return harborRefreshHoldDress(nativeHost.nativeSceneHarborHost(),def); }

export function sceneRefreshHoldServices(nativeHost:NativeSceneCampaignFrameClosureHost, def: ZoneDef): void { return harborRefreshHoldServices(nativeHost.nativeSceneHarborHost(),def); }

export function scenePlaceVocationSites(nativeHost:NativeSceneCampaignFrameClosureHost, def: ZoneDef): void { return sitePlaceVocationSites(nativeHost.nativeSceneSiteHost(),def); }

export function sceneFillOrbFounts(nativeHost:NativeSceneCampaignFrameClosureHost, meta: PlayerMeta, p: Actor, kind: 'life' | 'mana'): boolean {
    let any = false;
    for (const inst of meta.knownSkills.values()) {
      for (const cg of inst.def.chargeGain ?? []) {
        if (cg.on !== 'orbPickup' || (cg.orbKind && cg.orbKind !== kind)) continue;
        const cur = p.charges.get(cg.charge) ?? 0;
        p.gainCharge(cg.charge, 999, cg.max, inst);
        if ((p.charges.get(cg.charge) ?? 0) > cur) any = true;
      }
    }
    return any;
  }

export function sceneGrantSkillGemItem(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, inst: SkillInstance, spill = false): ItemInstance | null {
    const item = makeSkillGemItem(inst);
    if (!autoPlace(seat.meta.items, item)) {
      if (spill) {
        nativeHost.drops.push({
          pos: nativeHost.clampPos(vec(seat.actor.pos.x + rand(-14, 14), seat.actor.pos.y + rand(-14, 14)), 10, undefined,
            seat.actor.tier >= 1 ? { tier: seat.actor.tier } : undefined),
          item: { kind: 'skill', inst }, bob: rand(0, Math.PI * 2), tier: seat.actor.tier, // THE SPOILS STORY: at the seat's feet
        });
        nativeHost.seatNote(seat, seat.actor.pos, 'your pack is full — it falls at your feet', '#c08a68', 12);
        return null;
      }
      nativeHost.failNote(seat.actor, 'bagfull', 'inventory full');
      return null;
    }
    nativeHost.markMetaDirty(seat);
    return item;
  }

export function sceneHasOracle(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    return nativeHost.counterOwned(FEATURE.ORACLE_STONE) && nativeHost.townPresent(); // THE KEEPER'S GATE, mirrored on a render shell
  }

export function sceneVoyageZoneDef(nativeHost:NativeSceneCampaignFrameClosureHost): ZoneDef {
    return {
      // LEVEL is the DEPARTURE PORT's — kept because beginWraithsailBoarding
      // prices her decks off it (the floor under the interception's radial
      // coord). It is NOT the open water's danger, so the HUD banner skips its
      // Monster Lv clause while sailing instead of this being zeroed here (see
      // drawHudStatus, keyed on sailing / the client's mirrored zone id).
      id: VOYAGE_ZONE_ID, name: 'The Open Sea', level: nativeHost.zone.level,
      size: { w: 2400, h: 1800 }, shape: 'rect', boundless: true,
      // The sea IS the ocean biome (WILDLIFE has no ocean row — deliberate:
      // explicit absence beats the plains fallback; belt to spawnWildlife's
      // special-gate suspenders).
      biome: OCEAN_BIOME,
      theme: {
        floor: '#0b2033', grid: '#10293f', border: '#10293f',
        obstacle: '#c9b98a', obstacleEdge: '#8a7a52', accent: '#7fd0ff',
        chasm: '#061523', mud: '#16344c', water: '#0b2033',
        // OCEAN GROUND: the mottle bake reads this style — a deep-to-crest
        // blue gradient stretched into horizontal SWELL BANDS, with the
        // speckle pass OFF (its pebble chips sampled the tan obstacle color
        // and read as rocky outcrops strewn across open water).
        ground: {
          palette: ['#071a2c', '#0b2438', '#103048', '#173d58', '#20506e'],
          bias: 0.55, alpha: 0.6, stretchX: 2.6, scale: 1.5, speckles: 0,
        },
      },
      layout: [], layoutType: OPEN_SEA_LAYOUT,
      objective: { kind: 'clear' },              // nothing gates the water
      packs: { count: [0, 0], size: [0, 0], table: [] },
      exits: [],                                 // you LAND, you don't walk out
      map: { x: nativeHost.zone.map.x, y: nativeHost.zone.map.y },
      special: true,                             // no overlay squats at sea
    };
  }

export function sceneHasSalvage(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    return nativeHost.salvageUnlocked() && nativeHost.townPresent();
  }

export function sceneSwapReadiness(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, kind: 'unlearn' | 'socket' | 'unsocket', skillId?: string): import('./swapReadiness').SwapReadiness {
    const cfg = SWAP_DISCIPLINE_CFG;
    if (cfg.sanctuaryWaives && nativeHost.isSafeAt(seat.actor.pos)) return { reason: null };
    // keeperSeat: on a hosted world the blood that counts is the seat's own (World.lastCombatAt is every player's fight at once).
    const lastCombat = nativeHost.localSeat.keeper ? nativeHost.seatHero(seat).lastCombatAt : nativeHost.lastCombatAt;
    const remaining = cfg.calmSec - (nativeHost.time - lastCombat);
    if (remaining > 0) return { reason: 'the blood is still hot', remaining };
    if (nativeHost.pressingFoeNear(seat.actor.pos, seat.actor.tier)) return { reason: 'foes press too near' };
    if (kind === 'unlearn' && skillId) {
      const hero = nativeHost.seatHero(seat);
      if (cfg.unlearnOffCooldown && hero.cooldowns.has(skillId)) return { reason: 'its clock still turns' };
      if (cfg.unlearnNotCasting && hero.casting?.inst.def.id === skillId) return { reason: 'mid-cast' };
    }
    return { reason: null };
  }

export function scenePickAmalgamMinibossZone(nativeHost:NativeSceneCampaignFrameClosureHost): string | null {
    const site = nativeHost.amalgamSite;
    const af = nativeHost.sim.amalgamationField;
    if (!site || !af) return null;
    const here = nativeHost.zoneMap[site.zoneId];
    if (!here) return null;
    const cfg = af.surge();
    const cands = Object.values(nativeHost.zoneMap).filter(z =>
      z.id !== site.zoneId
      && z.caveDepth == null && !z.floating && !z.concealed && !z.eventOwned && !z.pocket
      && z.objective.kind !== 'safe' && z.objective.kind !== 'waves');
    if (!cands.length) return null;
    const rng = new Rng((packageSeed(nativeHost.manifest.seed, 'amalgamation') ^ hashStr(`${site.id}:mb:${af.peek()?.stage ?? 0}`)) >>> 0);
    const fresh = cands.filter(z => !nativeHost.visited.has(z.id));
    const charted = cands.filter(z => nativeHost.visited.has(z.id));
    const pool = (fresh.length && (!charted.length || rng.next() >= cfg.minibossChartedChance))
      ? fresh : (charted.length ? charted : fresh);
    // Prefer the nearest few to the Bonewright (an "adjacent" hunt), then pick one.
    pool.sort((a, b) =>
      Math.hypot(a.map.x - here.map.x, a.map.y - here.map.y) - Math.hypot(b.map.x - here.map.x, b.map.y - here.map.y));
    const near = pool.slice(0, Math.min(4, pool.length));
    return near[rng.int(0, near.length - 1)].id;
  }

export function sceneSameSeatParty(nativeHost:NativeSceneCampaignFrameClosureHost, a: string, b: string): boolean {
    if (a === b) return true;
    if (nativeHost.partyMates) return nativeHost.partyMates(a).includes(b);
    return nativeHost.partyRows?.some(r => r.members.includes(a) && r.members.includes(b)) ?? false;
  }

export function sceneDropSavedLoot(nativeHost:NativeSceneCampaignFrameClosureHost, at: Vec2, it: SavedLoot): void {
    const pos = nativeHost.clampPos(vec(at.x + rand(-22, 22), at.y + rand(-22, 22)), 10, undefined, nativeHost.spoilClamp());
    if (it.kind === 'gear') {
      // The EXACT worn item — same uid, same rolls; rebuildAnyItem
      // re-validates against live registries (a patched-out base simply
      // stays lost), gem payloads included: a wrapper in a loot payload
      // (a future bagItems policy) UNWRAPS as it falls — the ground speaks
      // bare gems (THE RESIDENCE).
      // OWED: reclaiming what death took is the player's own property coming
      // home — it lands even where THE SPOILS LAW seals local mints.
      const item = rebuildAnyItem(it.item);
      if (!item) return;
      if (item.gem) {
        const inst = skillOfGemItem(item);
        if (inst) { nativeHost.drops.push({ pos, item: { kind: 'skill', inst }, bob: rand(0, Math.PI * 2) }); return; }
        const gem = supportOfGemItem(item);
        if (gem) nativeHost.drops.push({ pos, item: { kind: 'support', gem }, bob: rand(0, Math.PI * 2) });
        return;
      }
      nativeHost.dropGearAt(at, item, undefined, true);
      return;
    }
    if (it.kind === 'skill') {
      const inst = rebuildSkill(it) /* preserve empowerment cargo on reclaim */;
      if (inst) nativeHost.drops.push({ pos, item: { kind: 'skill', inst }, bob: rand(0, Math.PI * 2) });
    } else {
      const def = SUPPORTS[it.supportId];
      // REHYDRATION, never a re-mint: a saved cut rides back verbatim
      // (fixed at the vein — the support base's whole ruling).
      if (def) {
        nativeHost.drops.push({
          pos,
          item: { kind: 'support', gem: { def, level: it.level, ...(it.rolled ? { rolled: { ...it.rolled } } : {}) } },
          bob: rand(0, Math.PI * 2),
        });
      }
    }
  }

export function sceneIslandDefIdOf(nativeHost:NativeSceneCampaignFrameClosureHost, z: ZoneDef): string | null {
    if (!z.id.startsWith('isle_')) return null;
    const [, gx, gy] = z.id.split('_');
    return islandAtCell(Number(gx), Number(gy), nativeHost.sim.biomeField.fieldSeed)?.def.id ?? null;
  }

export function sceneShelfCharKey(nativeHost:NativeSceneCampaignFrameClosureHost): string | null { return nativeHost.shelfBuyer ? charKeyOf(nativeHost.shelfBuyer) : null; }

export function sceneTownSite(nativeHost:NativeSceneCampaignFrameClosureHost, id: TownSiteId): Vec2 | null {
    const p = townSiteAt(nativeHost.townTierIdx, id);
    return p ? vec(p.x, p.y) : null;
  }

export function sceneSkillDropPool(nativeHost:NativeSceneCampaignFrameClosureHost, atLevel: number, floor?: GemFloor): SkillDef[] { return settlementSkillDropPool(nativeHost.nativeSettlementHost(),atLevel,floor); }

export function sceneGemWeights<T>(nativeHost:NativeSceneCampaignFrameClosureHost, 
    pool: T[], tagsOf: (x: T) => readonly SkillTag[], weightOf: (x: T) => number,
    bias?: SkillTag[], carried?: (x: T) => boolean,
  ): number[] { return settlementGemWeights(nativeHost.nativeSettlementHost(),pool,tagsOf,weightOf,bias,carried); }

export function sceneSeatNote(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat | undefined, at: Vec2, msg: string, color: string, size: number): void {
    if (seat && nativeHost.localSeat.keeper && !seat.keeper && !seat.couch && !seat.merc) {
      nativeHost.seatHudOf(seat).fn = { text: msg, at: nativeHost.time };
      return;
    }
    nativeHost.text(at, msg, color, size);
  }

export function sceneSalvageUnlocked(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    return nativeHost.counterOwned(FEATURE.SALVAGE_STATION); // THE KEEPER'S GATE, mirrored on a render shell
  }

export function sceneIsSafeAt(nativeHost:NativeSceneCampaignFrameClosureHost, pos: Vec2): boolean {
    return nativeHost.massRuntime ? !!nativeHost.massRuntime.settlement?.sanctuary.contains(pos) : nativeHost.zone.objective.kind === 'safe';
  }

