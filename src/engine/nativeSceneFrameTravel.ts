import {observeNativeCombatBirth,selectNativeVesselPush} from './nativeCombatRecordObservation';
/** Exact original42 campaign/interleaved frame FrameTravel closure.
 * Runtime ownership and native scheduling are separate concrete bindings. */
import type {NativeAreaRoadDestination,NativeAreaRealmContextTarget} from '../worldmass/nativeAreaRoadDestination';
import type {World} from "./world";
import type {NativeSceneCampaignFrameClosureHost,NativeSceneLegacyMassHost} from "./nativeSceneCampaignFrameClosureHost";
import { DROP_PICKUP_GRACE } from './nativeSceneLoot';
import type { MassResidentResume } from '../meta/characterResume';
import { massSideareaId, copyMassSidearea } from '../worldmass/sideareas';
import { massBountiesAvailable, massBountyAccept } from '../worldmass/bounties';
import { skillInstanceName, treeInstanceNodeRanks } from './skillEmpowerment';
import { skillMergePlan } from './skillMerge';
import { uniqueContainerRefusal } from './itemLimits';
import { resolveMinionInheritance, applyMinionPlyBonus } from './minionInheritance';
import { cosmeticPortalLoadout } from '../meta/cosmetics';
import { type CompanionSaved } from './companionSpec';
import { PING_CUE } from '../data/identityCues';
import { clampPingReach, prunePings } from './pings';
import { clamp, dist, rand, randInt, vec, type Vec2 } from '../core/math';
import { mod, type AttributeId } from './stats';
import { Actor } from './actor';
import { type MetaAction } from '../net/intent';
import { WorldMassRuntime, type MassAdventureSave } from '../worldmass/runtime';
import { MASS_ZONE } from '../worldmass/preset';
import { TOWN_PORTAL_CFG } from '../data/townportals';
import { type TownPortalView } from './townportal';
import { instanceDelivery, instanceMods, instanceTrigger, makeSkillGem, makeSkillInstance, rollSkillRarityWeighted, treeNodeOf, treeNodeRefusal, bandPointsAt, CLASS_KIT_RARITY, skillContextTags, skillMaxLevel, SKILL_RARITIES, essenceTierForLevel, type SkillRarity, supportFitsInstOrCrew, supportMaxLevel, BAR_SLOTS, SWAP_DISCIPLINE_CFG, GRANT_CFG, skillGrantStat, type SkillDef, type SkillInstance, type SupportDef, type SupportInstance } from './skills';
import { mintSupportInstance } from './supportbase';
import { autoPlace, bagBoard, placeAt, removeFromBag, swapBlockerFits } from './inventory';
import { bagSortMode, sortBagItems, type BagSortDir } from './bagsort';
import { CONTAINERS, boardDims, containerBoard, containerLanding, containerSeatRefusal, findCarried } from './containers';
import { findBagGem, freeCellCount, makeSkillGemItem, makeSupportGemItem, restoreGrantState, skillGemPayloadOf, skillOfGemItem, supportOfGemItem, writeBackSupportGem, bagSkillSupport } from './gemitems';
import { MEMORY_CFG, MEMORY_KINDS, MEMORY_TRADED_PROVENANCE, facetRng, makeMemoryItem, memoryFacetAttrs, memoryGroupKey, memoryKindOf, memoryRarityLean, memoryUnitsOf, pickSeeded, rollSeededRarity, type MemoryRecallResult } from './memories';
import { bankRelic, isRelic, planRelicStorage, reconcileRelicStash } from './accountReliquary';
import { emptyStash, personalStashEntries, planStashMove, type StashCell } from './stash';
import { STASH_DEFS } from '../data/stashes';
import { RELIQUARY_CFG } from '../data/reliquary';
import { nextItemUid, compileItemMods, itemLevelReq, rollItem } from './itemgen';
import { ABILITY_ESSENCE_CFG, ABILITY_ESSENCES, abilityEssenceOfTier, ESSENCES, ESSENCE_IDS, FONT_CFG, skillLevelAbilityCost, spendWalletMortalValue, supportLevelAbilityCost, VENDOR_ESSENCE_PRICE, VENDOR_MEMORY_PRICE, VENDOR_SUPPORT_PRICE, walletMortalValue, type AbilityCost, type EssenceCost, type EssenceId } from '../data/essences';
import { EQUIP_SLOTS, ITEM_CFG, ITEM_RARITIES, SLOT_BY_ID, baseComplexityOf, slotsForCategory, socketCap, type ItemInstance, type RoughMemoryUnit } from './items';
import { GEM_DROP_CFG, gemFloorFor, type GemFloor } from './loot';
import { epitaphFor, VESTIGES } from '../data/vestiges';
import { VENDORS, VENDOR_CFG, type VendorDef } from '../data/vendors';
import { ITEM_BASES } from '../data/itembases';
import { treeSpentCount } from './skilltree';
import { memoryCommissionReady, memoryProgressionOpen } from '../meta/memoryUnlocks';
import { powerProgressionRefusal } from '../data/powerProgression';
import { SKILLS } from '../data/skills';
import { FACTIONS, FIXTURE_IDS, MONSTERS, type MonsterDef } from '../data/monsters';
import { COOP_SCALING } from '../data/coop';
import { SUPPORTS } from '../data/supports';
import { PASSIVE_ADJACENCY, PASSIVE_NODES, vocationGateOpen } from '../data/passives';
import { PASSIVE_CHOICE_CFG, choiceDealSpent, choiceLockReason, graftSourcesOf } from '../data/passiveChoices';
import { realmOf, realmOpen, type PassiveRealmDef } from '../data/passiveRealms';
import { mimicSelect } from './mimic';
import { START_ZONE, objectiveSeals, escapeExitAllowed, type PackTableEntry, type ZoneDef } from '../data/zones';
import { SUITES, type SuiteDef, type SuiteStation } from '../data/suites';
import { objectiveRewardXp } from '../data/objectiveRewards';
import { type Doodad, type PlacedStructure } from './levelgen';
import { sidezoneOf } from '../data/sidezones';
import { DWELL_CFG, npcDwellReach, npcDwellRadius, transitRadius, transitReach } from '../data/transit';
import type { ArenaSpec, ArenaWardSpec } from '../data/arenas';
import { type WaveFrenzySpec } from '../data/waves';
import { mintCave, placeZoneAt, nearestNode } from './worldgen';
import { VOYAGE_ZONE_ID } from '../world/voyage';
import { bountyEssenceMix } from '../data/bountyRewards';
import { BOUNTY_BOARD_CFG, BOUNTY_KINDS, bountyChargePay, describeBountyPay } from '../data/bountyboard';
import { TRACE_CFG, buildTracePath, freshTraceState, traceBandFor, traceSlipCapFor } from './trace';
import { traceShapeForCategory } from '../data/traceShapes';
import { type BountyPosting } from '../data/bountyboard';
import { BESTIARY_CFG, bestiaryEligible, spectreAttunable } from '../data/bestiary';
import { oracleRerollCost } from '../data/essences';
import { CRAFT_CFG, craftableAffixesFor, craftedCount, expertiseRank, rollCraftedAffix, rollRerolledAffix, salvageItemYield, salvageSkillYield, salvageSupportYield, sellItemYield, sellMemoryYield, sellSkillYield, sellSupportYield, studySalvage, vendorItemPrice } from './crafting';
import { ITEM_AFFIXES } from '../data/itemaffixes';
import { caravanBand } from '../data/caravan';
import { TILESETS, pickTilesetForBiome } from '../data/tilesets';
import { RELIQUARY_LESSON } from '../quests/reliquary';
import { newQuestLedger, type QuestLedger } from './questLedger';
import { passiveRefund } from './passiveRefund';
import { QUEST_CATEGORY_CAPS } from '../quests/types';
import { Rng, rollSeed } from '../core/rng';
import { batchScaleOf } from './throng';
import { syncAttributeBequests } from './bequests';
import { coordDist, type MapCoord } from '../world/coords';
import { collectOmens, type Omen } from '../world/omens';
import { PORT_CFG } from '../data/ports';
import { HARBORHOLD_CFG, holdClassOf, holdRestoreCost, type HarborholdState } from '../data/harborholds';
import { holdGateApron, holdGateDoor, holdStructureIn } from '../world/harborholds';
import { dimensionDef, dimensionsEnteredBy, isRoadlessGateHub, GATE_FANOUT } from '../world/dimensions';
import { authoredMapOf, authoredZoneSpec, definedSpec, sealAuthoredZone } from './authoredMaps';
import type { ZoneSpec } from './worldgen';
import { bumpLedger } from '../packages/ledger';
import type { FractureCapstone } from '../packages/overlays/fractures';
import { holdfastTollCost, holdfastTollLabel } from '../packages/holdfast';
import { allFurnishSpecs } from '../packages/registry';
import type { BoroughSpec } from '../packages/encounters';
import { courtLord } from '../packages/courts';
import type { ActiveEncounter, VeilKnot } from './encounter';
import { rarityMods, RARITY_DEFS, type MonsterRarity } from './rarity';
import type { OverlayView } from '../world/overlay';
import { notePickup, FLOAT_CFG } from '../world/bulletins';
import { edgeBlockAt } from '../world/edgeBlocks';
import { featureEnabled, isSkillUnlockedForDrop, isSupportUnlockedForDrop, FEATURE, isVaultAvailable, LEDGER_VENDOR_BOUGHT, LEDGER_CRAFTS_UNLOCKED, LEDGER_BOUNTY_CRAFT_DONE } from '../meta/account';
import { gateMet } from '../meta/gates';
import { rememberSkillSlot } from '../meta/skillSlotMemory';
import { modeById, type CharacterModeDef } from '../meta/modes';
import { mintNemesisName } from '../meta/nemesis';
import { saveAccount } from '../meta/persistence';
import { WORLDSTATE_CFG, type ResumeSpawn, type SavedPlayerSpot } from '../meta/worldstate';
import { applySceneWaveFrenzy, applyScenePartyScale } from './nativeScenePopulation';
import { settlementVendorEntryAllowed, settlementCommissionOdds, settlementVendorQualityPieces, settlementSupportDropPool } from './nativeSettlementServices';
import { harborHoldStateFor, harborLandPartyAt } from './nativeSceneHarbor';
import type { RoadTicket } from './shardUnits';
import { ladderOfSpot, type CaveMouthRow, type RealmGateRow, type SealedRoadKind, type ShardRoadHost } from './shardRoads';
import { hashStr } from './nativeSceneConfig';
import type {ZoneExit} from "./nativeSceneFrameAreaEvents";
import type {Seat} from "./nativeSceneFrameServices";
import {MIREILLE_GIFT_SKILLS} from "./nativeSceneFrameServices";
import type {VendorEntry} from "./nativeSceneFrameServices";
export type DropItem =
  | { kind: 'support'; gem: SupportInstance }
  | { kind: 'skill'; inst: SkillInstance }
  | { kind: 'gear'; item: ItemInstance }
  | { kind: 'vestige'; id: string; count: number }
  | { kind: 'essence'; essence: EssenceId; count: number }
  | { kind: 'abilityEssence'; tier: number; count: number };
export const MAX_LEARNED_SKILLS = BAR_SLOTS;
export const isIdx = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
export const isStr = (s: unknown): s is string => typeof s === 'string';
export const isLane = (l: unknown): l is 'break' | 'sell' | undefined =>
  l === undefined || l === 'break' || l === 'sell';
export function isValidMetaAction(a: MetaAction): boolean {
  switch (a.t) {
    case 'buyVendor': case 'buyChandler': case 'buyDelver':
      return isIdx(a.index);
    // THE RESIDENCE (skill-items M1): loose gems are bag ITEMS — learn,
    // socket-in, and the loose level-up all address the wrapper by uid.
    case 'learn': return isIdx(a.uid) && (a.slot === undefined || isIdx(a.slot))
      && (a.emptyOnly === undefined || typeof a.emptyOnly === 'boolean');
    case 'levelSupportInv': return isIdx(a.uid);
    case 'socket': return isIdx(a.uid) && isStr(a.skillId);
    case 'unsocketBagSkill': return isIdx(a.uid) && isIdx(a.socket);
    case 'levelSupportSocket': case 'unsocket': return isStr(a.skillId) && isIdx(a.socket);
    case 'unlearn':
      return isStr(a.skillId)
        && ((a.x === undefined && a.y === undefined) || (isIdx(a.x) && isIdx(a.y)));
    case 'reacquireSkill': return isStr(a.skillId);
    case 'attuneSpectre': return isStr(a.skillId) && isStr(a.formId);
    case 'mimicSelect': return isStr(a.sid);
    case 'pickTreeNode': return isStr(a.skillId) && isStr(a.nodeId);
    case 'untameCompanion': return isIdx(a.actorId);
    // THE STANCE SHIFT: an optional bond skill id + an optional stance id —
    // both untrusted strings the mutator re-resolves against the registries.
    case 'companionStance':
      return (a.skillId === undefined || isStr(a.skillId)) && (a.stance === undefined || isStr(a.stance));
    case 'ping': return Number.isFinite(a.x) && Number.isFinite(a.y); // THE PING: a finite point (placePing clamps the reach)
    case 'levelSkill': return isStr(a.skillId);
    // THE SACRIFICIAL FONT's recipes (data/essences.ts FONT_CFG): rarities
    // are a closed vocabulary, tiers untrusted client integers (the
    // mutators re-clamp against the live registry).
    case 'fontMerge': return isStr(a.skillId)
      && (['common', 'magic', 'rare', 'legendary'] as const).includes(a.rarity);
    case 'fontConvert': return isIdx(a.tier) && (a.dir === 'up' || a.dir === 'down');
    case 'fontReset': return isStr(a.skillId);
    // The vendors' Ability Essence sell lane — counter id + tier.
    case 'buyAbilityEss': return isStr(a.vendor) && isIdx(a.tier);
    case 'allocate': return isStr(a.nodeId) && (a.optionId === undefined || isStr(a.optionId));
    case 'refundPassive': return isStr(a.nodeId);
    case 'bindGraft': return isStr(a.key) && (a.skillId === null || isStr(a.skillId));
    case 'questAccept': return isStr(a.questId);
    case 'vocationQuest': return isStr(a.questId); // menu-accept a vocation chain step
    case 'questReward': return isStr(a.questId) && isStr(a.choiceId);
    case 'questImbue': return isStr(a.questId) && isIdx(a.uid) && isStr(a.affixId);
    case 'bindSkill': return isIdx(a.slot) && (a.skillId === null || isStr(a.skillId));
    case 'swapSkillSlots': return isIdx(a.a) && isIdx(a.b);
    // THE STONE (skill-items M2): the pouch wrapper by uid + the dropper
    // group's def id (untrusted — the recall re-resolves both in-seat).
    case 'recallMemory': return isIdx(a.uid) && isStr(a.dropper) && (a.facet === undefined || isStr(a.facet));
    case 'caravanTo': return isIdx(a.band); // band 0 = home; N = a band index
    case 'waypoint': return isStr(a.zoneId); // THE ROADS PER PLAYER: a zone id (travelToWaypoint re-judges the attuned set)
    case 'harborChart': return isStr(a.omen); // the rumored seat's omen id
    // THE BOUNTY BOARD: posting ids are untrusted strings — every handler
    // re-resolves them against the live slate/hands and no-ops on a miss.
    case 'bountyAccept': return isStr(a.id);
    case 'bountyAbandon': return isStr(a.id);
    case 'bountyTurnIn': return isStr(a.id);
    case 'bountyLock': return isStr(a.id) && typeof a.locked === 'boolean';
    case 'bountyCoastWrits': return true;
    case 'forgeBegin': return typeof a.writUid === 'number' && isStr(a.baseId) && typeof a.pad === 'boolean';
    case 'forgeCancel': return true;
    case 'holdMuster': return true;  // the standing zone's harborhold — no payload
    case 'townPortal': return true;
    case 'holdRestore': return true; // ditto (price re-derived host-side from data)
    // THE PATRON'S HOLD: vendor is a registry id, index an untrusted shelf
    // position; the commission's gem is null (release) or a kind+id pair.
    case 'vendorLock': return isStr(a.vendor) && isIdx(a.index) && typeof a.on === 'boolean';
    case 'vendorCommission': return isStr(a.vendor) && (a.gem === null
      || (!!a.gem && typeof a.gem === 'object'
        && (a.gem.kind === 'skill' || a.gem.kind === 'support') && isStr(a.gem.id)));
    case 'payToll': return Number.isInteger(a.index) && a.index >= -1; // -1 = a random gem
    // GEAR intents — uids/cells are untrusted client numbers, ids plain strings.
    case 'equipItem': return isIdx(a.uid) && (a.slot === undefined || isStr(a.slot));
    case 'unequipItem': return isStr(a.slot)
      && ((a.x === undefined && a.y === undefined) || (isIdx(a.x) && isIdx(a.y)));
    case 'moveItem': return isIdx(a.uid) && isIdx(a.x) && isIdx(a.y);
    case 'sortBag': return isStr(a.mode) && !!bagSortMode(a.mode) && (a.dir === undefined || a.dir === 'asc' || a.dir === 'desc');
    case 'dropItem': return isIdx(a.uid);
    case 'salvageItem': return isIdx(a.uid) && isLane(a.lane);
    case 'oracleAttune': return true;
    case 'oracleRelic': return isIdx(a.uid) && ['store', 'equip', 'unseat', 'release', 'withdraw'].includes(a.operation as string);
    case 'reliquaryToggle': return typeof a.enabled === 'boolean';
    case 'withdrawRelic': return isIdx(a.uid) && ((a.x === undefined && a.y === undefined) || (isIdx(a.x) && isIdx(a.y)));
    case 'relicStashMove': return isIdx(a.uid) && isIdx(a.page) && isIdx(a.x) && isIdx(a.y);
    case 'personalStash': return isIdx(a.uid) && ['store', 'take', 'move'].includes(a.operation as string)
      && ((a.x === undefined && a.y === undefined) || (isIdx(a.x) && isIdx(a.y)));
    case 'pickupItem': return true;
    // THE CONTAINER FABRIC: the board is a registry id (re-resolved at
    // apply), the piece a uid, the cell an untrusted pair — both or neither.
    case 'containerPlace':
    case 'containerTake':
      return isStr(a.container) && isIdx(a.uid)
        && ((a.x === undefined && a.y === undefined) || (isIdx(a.x) && isIdx(a.y)));
    case 'containerMove': return isStr(a.container) && isIdx(a.uid) && isIdx(a.x) && isIdx(a.y);
    // THE SWEEP + THE KEEPER'S MARK (salvageBulk / salvageLock): categories
    // and rarities are closed vocabularies; the lock rides item uids alone
    // now (gem wrappers are bag items — one address space, M1).
    case 'salvageBulk':
      return (a.cat === 'item' || a.cat === 'skill' || a.cat === 'support')
        && (a.rarity === undefined
          || (['common', 'magic', 'rare', 'unique', 'legendary'] as const).includes(a.rarity))
        && isLane(a.lane);
    case 'salvageLock':
      return isIdx(a.uid) && typeof a.on === 'boolean';
    case 'craftAffix':
      return isIdx(a.uid) && isStr(a.affixId)
        && (a.score === undefined || (typeof a.score === 'number' && Number.isFinite(a.score)));
    case 'socketVestige': return isIdx(a.uid) && isIdx(a.socket) && isStr(a.vestigeId);
    case 'craftSocket': return isIdx(a.uid);
    // BOROUGH arming — folk by actor id, gifts by uid, tints plain strings
    // (the mutators re-validate against the live spec's own tables).
    case 'armFolkItem': return isIdx(a.folkId) && isIdx(a.uid);
    case 'armFolkEssence': return isIdx(a.folkId) && isStr(a.essence);
    case 'rerollAffix':
      return isIdx(a.uid) && isIdx(a.affix) && typeof a.score === 'number' && Number.isFinite(a.score);
    default: return false;
  }
}
export interface VendorHoldRow {
  entry: VendorEntry;
  idx: number;
  commission?: boolean;
}
export interface VendorHold {
  locks: VendorHoldRow[];
  commission?: { kind: 'skill' | 'support'; id: string };
  watchedSec: number;
}
export const WAYPOINT_CLEAR = 500;
export const DELVER_RADIUS = 160;
export interface ArenaBossSpec {
  /** A fixed champion id… */
  monsterId?: string;
  /** …or a weighted pool the boss is picked from (at its own level). */
  pool?: PackTableEntry[];
  faction: string;
  /** Garrison levels over the arena zone's level. */
  levelBonus?: number;
  /** Extra levels on the boss itself, over the garrison. */
  bossBump?: number;
  /** Kill-handler hook (worldKillRules / registerKillHandler). */
  tag: string;
  xpFloor?: number;
  /** How deep in the arena the court assembles (farPoint distance). */
  far?: number;
  garrison?: { count: [number, number]; spread?: number; squad?: boolean };
  /** Roster the garrison draws from (default: the faction's table); the boss
   *  id is always filtered out — the curated champion stays singular. */
  garrisonTable?: PackTableEntry[];
  /** Manifest bulletin; '{name}' = the champion's def name. */
  announce?: string;
  announceColor?: string;
}
export interface RealmArenaArgs {
  caveId: string;
  /** Fallback tileset when the arena spec doesn't pin one. */
  tileset: string;
  arena?: ArenaSpec;
  /** Ambient pack band (the arena spec's `packs` outranks it); null = none —
   *  the population is hand-placed (the necropolis way). */
  packs: { count: [number, number]; size: [number, number] } | null;
  /** Ambient roster (already boss-filtered by the caller). */
  rosterTable: PackTableEntry[];
  /** Pin the realm's level (the fracture chamber out-levels its zone). */
  levelOverride?: number;
  returnPos: Vec2;
  boss: ArenaBossSpec;
}
export interface RealmPlan {
  arena: RealmArenaArgs;
  context?: (w: NativeAreaRealmContextTarget) => void;
  stamp?: () => void;
}
export function sceneBreakArenaSeal(nativeHost:NativeSceneCampaignFrameClosureHost, seal: Doodad): void {
    const ward = nativeHost.arenaWard;
    if (!ward) return;
    const idx = ward.seals.indexOf(seal);
    if (idx < 0) return;
    ward.seals.splice(idx, 1);
    seal.kind = `${ward.spec.doodadKind ?? 'ward_seal'}_broken`;
    nativeHost.flashes.push({ pos: vec(seal.pos.x, seal.pos.y), radius: 90, color: '#ff9a50', life: 0.6, maxLife: 0.6 });
    // The seal's guard answers the break.
    const guards = ward.spec.guards;
    if (guards) {
      const lvl = Math.max(1, nativeHost.zone.level + (ward.boss.levelBonus ?? 0));
      const pool = (ward.boss.garrisonTable ?? FACTIONS[ward.boss.faction]?.table ?? [])
        .filter(e => e.id !== ward.boss.monsterId);
      const n = randInt(guards.count[0], guards.count[1]);
      const spread = guards.spread ?? 120;
      for (let k = 0; k < n && pool.length; k++) {
        const m = nativeHost.createMonster(nativeHost.weightedPick(pool, lvl), lvl, 'enemy');
        m.faction = ward.boss.faction;
        m.pos = nativeHost.clampPos(vec(seal.pos.x + rand(-spread, spread), seal.pos.y + rand(-spread, spread)), m.radius);
        nativeHost.actors.push(m);
        observeNativeCombatBirth(nativeHost,m);
      }
    }
    if (ward.seals.length > 0) {
      const line = (ward.spec.announceBreak ?? 'A seal shatters — {n} of {total} remain!')
        .replace('{n}', String(ward.seals.length)).replace('{total}', String(ward.total));
      nativeHost.text(vec(seal.pos.x, seal.pos.y - 40), line, '#ff9a50', 15);
      return;
    }
    // The last seal: the ward falls, the boss manifests.
    const boss = ward.boss;
    nativeHost.arenaWard = null;
    nativeHost.notice(ward.spec.announceAll ?? 'The last seal breaks — the warded one manifests!', '#ffd700', 18, 'events');
    nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 170, color: '#ff6a3a', life: 0.9, maxLife: 0.9 });
    const manifested = nativeHost.spawnArenaBoss(boss);
    if (nativeHost.arenaCrowd) nativeHost.arenaCrowd.bossId = manifested?.id ?? null; // the stands turn to watch
  }

export function sceneEnterSidezone(nativeHost:NativeSceneCampaignFrameClosureHost, cm: { pos: Vec2; seed: number; kind: string; underSpan?: string; massOwner?: string; nativeParent?: ZoneDef }): void {
    const sz = sidezoneOf(cm.kind);
    if (!sz) return;
    const dest = nativeHost.mintSidezone(cm);
    if (!dest) return;
    if (nativeHost.massRuntime) {
      nativeHost.massAway = { surface: nativeHost.snapshotMassRuntime(nativeHost.massRuntime), root: dest.id };
      nativeHost.massRuntime?.dispose();
      nativeHost.massRuntime = null;
    }
    if (nativeHost.massAway) nativeHost.massCaveIds.add(dest.id);
    // FURNISH on EVERY entry (idempotent): a package whose gate opens mid-run
    // (a startLevel reached after the room first minted) still gets to build —
    // the pocket regenerates from its def each load, so a fixture added now
    // stands from this visit on.
    nativeHost.applySidezoneFurnish(dest, sz);
    // A 'character' pocket re-levels to the entering hero EVERY visit — the
    // arena scales with you (its spawns read zone.level), not with geography.
    if (sz.levelWith === 'character') dest.level = Math.max(1, nativeHost.player.level);
    // DISCOVERY: the run ledger learns you found this (merged to the account on
    // death — surfaces Vault unlocks, the delvers_seen pattern).
    if (sz.ledgerOnEnter) bumpLedger(nativeHost.ledger, sz.ledgerOnEnter);
    // Descending DEEPER (pocket-within-pocket): bank the current level's way
    // home on the ladder stack; climbing out pops it back. kind + seed ride
    // the rung so the exact-resume save can re-mint this exact descent.
    if (nativeHost.caveReturn) nativeHost.caveStack.push(nativeHost.caveReturn);
    // The rung remembers the STORY it was dwelled from (the arrivalStory law
    // — the dwell gate already guaranteed player.tier === the mouth's own
    // story), so the climb-out lands back IN the gallery at the door.
    nativeHost.caveReturn = { zoneId: nativeHost.zone.id, pos: vec(cm.pos.x, cm.pos.y), entryFrom: nativeHost.entryFrom, kind: cm.kind, seed: cm.seed, ...(cm.underSpan ? { underSpan: cm.underSpan } : {}), ...(nativeHost.player.tier ? { tier: nativeHost.player.tier } : {}) };
    nativeHost.loadZone(dest.id, nativeHost.zone.id); // deliberately NO sim.onNodeCharted — pockets are off-graph
  }

export function sceneExitLockHint(nativeHost:NativeSceneCampaignFrameClosureHost, e: ZoneExit): { text: string; color: string } {
    const led = nativeHost.zone.exits[e.defIndex];
    const gdef = led?.lock && nativeHost.holdfastSite ? nativeHost.sim.holdfastField?.def(nativeHost.holdfastSite.defId) : null;
    const eb = led && led.to !== '?' ? edgeBlockAt(nativeHost, nativeHost.zone.id, led.to) : null;
    const holdHint = led?.lock === 'harborhold' && nativeHost.zone.harborhold
      ? (nativeHost.zone.harborhold.state === 'fallen'
        ? HARBORHOLD_CFG.quay.lockHint.fallen : HARBORHOLD_CFG.quay.lockHint.besieged)
      : null;
    return { text: eb ? eb.reason : holdHint ?? (gdef ? gdef.sealedHint : 'sealed — finish the objective'), color: eb?.color ?? '#d05050' };
  }

export function sceneExitUnder(nativeHost:NativeSceneCampaignFrameClosureHost, a: Actor, from: string | null = nativeHost.entryFrom): { onExit: ZoneExit | null; lockedExit: ZoneExit | null } {
    let onExit: ZoneExit | null = null, bestD = Infinity;
    let lockedExit: ZoneExit | null = null, lockedD = Infinity;
    for (const e of nativeHost.exits) {
      const d = dist(a.pos, e.pos);
      if (d > e.radius) continue;
      if (!nativeHost.dwellReachable(a.pos, e.pos,
        transitReach(e.boundary ? `zone_exit:${e.boundary}` : 'zone_exit'), nativeHost.storyPair(a))) continue;
      if (nativeHost.isExitLocked(e, from)) { if (d < lockedD) { lockedD = d; lockedExit = e; } continue; }
      if (d < bestD) { bestD = d; onExit = e; }
    }
    return { onExit, lockedExit };
  }

export function sceneGateUnder(nativeHost:NativeSceneCampaignFrameClosureHost, a: Actor, gates: readonly RealmGateRow<NativeAreaRoadDestination>[]): RealmGateRow<NativeAreaRoadDestination> | null {
    let onGate: RealmGateRow<NativeAreaRoadDestination> | null = null, bestGD = Infinity;
    for (const g of gates) {
      const d = dist(a.pos, g.pos);
      if (d <= transitRadius(`realm_gate:${g.kind}`, 32) + a.radius && d < bestGD
        && nativeHost.dwellReachable(a.pos, g.pos, transitReach(`realm_gate:${g.kind}`), nativeHost.storyPair(a))) { bestGD = d; onGate = g; }
    }
    return onGate;
  }

export function sceneHoldfastNear(nativeHost:NativeSceneCampaignFrameClosureHost, a: Actor): Actor | null {
    const keeper = nativeHost.holdfastKeeper();
    return !!keeper && dist(a.pos, keeper.pos) <= transitRadius('holdfast', 78)
      && nativeHost.dwellReachable(a.pos, keeper.pos, transitReach('holdfast'), nativeHost.storyPair(a, keeper)) ? keeper : null;
  }

export function sceneMintSidezone(nativeHost:NativeSceneCampaignFrameClosureHost, cm: { pos: Vec2; seed: number; kind: string; underSpan?: string; massOwner?: string; nativeParent?: ZoneDef }): ZoneDef | null {
    if (nativeHost.massRuntime) return nativeHost.mintMassSidearea(cm);
    const sz = sidezoneOf(cm.kind);
    if (!sz) return null;
    if (sz.spanMouth && !cm.underSpan) return null; // a dead gate opens nothing
    const id = nativeHost.sidezoneIdFor(nativeHost.zone.id, cm.kind, cm.seed, cm.underSpan);
    if (!nativeHost.caveMap[id]) {
      // THE SPAN (the rooted web): resolve the pocket's identity from the
      // LIVE graph — members are every zone carrying this span's rows
      // (sorted: the def must not depend on which mouth minted it), and the
      // seat is the span's own seeding zone (`ugspan_<seatId>`), the ONE
      // canonical parent the mint reads level/geo/anchor from.
      let underSpan: { id: string; members: string[]; seat: ZoneDef } | undefined;
      if (cm.underSpan) {
        const members = Object.values(nativeHost.zoneMap)
          .filter(z => z.underways?.some(u => u.span === cm.underSpan))
          .map(z => z.id).sort();
        const seatId = cm.underSpan.startsWith('ugspan_') ? cm.underSpan.slice('ugspan_'.length) : cm.underSpan;
        underSpan = { id: cm.underSpan, members, seat: nativeHost.zoneMap[seatId] ?? nativeHost.zone };
      }
      nativeHost.caveMap[id] = sz.mint({
        parent: nativeHost.zone, seed: cm.seed, id,
        pos: { x: cm.pos.x, y: cm.pos.y },
        playerLevel: nativeHost.player.level,
        pkgActive: (pid) => nativeHost.sim.packageActive(pid, nativeHost.player.level),
        ...(underSpan ? { underSpan } : {}),
      });
    }
    return nativeHost.caveMap[id];
  }

export function sceneMouthRefusalUnder(nativeHost:NativeSceneCampaignFrameClosureHost, a: Actor): { pos: Vec2; text: string } | null {
    for (const cm of nativeHost.caveEntrances) {
      const sz = sidezoneOf(cm.kind);
      const condShut = !!sz?.when && !nativeHost.radianceCondHeld(sz.when.cond);
      const sealShut = !condShut && nativeHost.sidezoneSealHolds(cm.kind);
      if (!condShut && !sealShut) continue;
      if (dist(a.pos, cm.pos) > transitRadius(`sidezone:${cm.kind}`, 28) + a.radius) continue;
      return { pos: cm.pos, text: (condShut ? sz!.when!.refusal : sz!.sealedBy!.refusal) ?? 'the door does not answer…' };
    }
    return null;
  }

export function sceneMouthUnder(nativeHost:NativeSceneCampaignFrameClosureHost, a: Actor): number {
    const roof = nativeHost.caveEntrances.some(c => c.roof !== undefined && c.roof !== null) ? nativeHost.roofedStructureAt(a.pos) : null;
    for (let i = 0; i < nativeHost.caveEntrances.length; i++) if (nativeHost.onMouth(a, nativeHost.caveEntrances[i], roof)) return i;
    return -1;
  }

export function sceneOnHoldfastDwell(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    nativeHost.requestMeta({ t: 'payToll', index: -1 }); // index is legacy wire shape (unused)
  }

export function sceneOpenEncounter(nativeHost:NativeSceneCampaignFrameClosureHost, e: ActiveEncounter): void {
    e.phase = 'open';
    e.radius = e.scale.startRadius;
    e.timer = e.scale.baseTime;
    e.maxTimer = e.scale.baseTime + e.scale.maxBonusTime;
    e.spawnTimer = 0; // first pulse immediately
    bumpLedger(nativeHost.ledger, e.def.ledger.onEncounter); // DISCOVERY — now you know it exists
    nativeHost.text(vec(e.pos.x, e.pos.y - 30), `${e.scale.label} opens!`, e.def.trigger.color, 20);
    nativeHost.flashes.push({ pos: vec(e.pos.x, e.pos.y), radius: e.scale.startRadius, color: e.def.trigger.color, life: 0.6, maxLife: 0.6 });
    // THE VEIL (def.veil): roll the far shore NOW — every knot this field can
    // ever uncover, dealt across the full maxRadius disc from the encounter
    // stream (deterministic per zone-load) and sorted by distance so the
    // advancing rim uncovers them in order. Spawning becomes UNCOVERING.
    if (e.def.veil) nativeHost.seedVeil(e);
    // THE ECHO RITE (EncounterDef.echoParty — the Mirrorkin): the field's
    // opening breath forms one reflection per living hero.
    if (e.def.echoParty) nativeHost.spawnPartyEchoes(e);
  }

export function sceneRealmGates(nativeHost:NativeSceneCampaignFrameClosureHost): RealmGateRow<NativeAreaRoadDestination>[] {
    const gates: RealmGateRow<NativeAreaRoadDestination>[] = [];
    // The Underworld BREACH (bottom of the cave ladder) is a realm gate too.
    if (nativeHost.breachPos) {
      // Which dimension does a cave breach tear into? Whatever REGISTERED a
      // cave_breach entry (data) — first registrant today; a weighted roll
      // when a second breach-entered layer ever ships.
      const bd = dimensionsEnteredBy('cave_breach')[0];
      if (bd) gates.push({ pos: nativeHost.breachPos, kind: 'breach', key: `breach:${bd.id}`, enter: () => nativeHost.enterDimension(bd.id), ...nativeHost.dimensionRoad(bd.id) });
    }
    // DIMENSION GATE DOODADS (DimensionEntry.gateDoodad, scanned per
    // loadZone): the Ascent's shining arch — dwell it to cross into its
    // dimension. Radius/dwell ride per-kind transit rows like every gate
    // ('realm_gate:dim_<id>' chains to the 'realm_gate' family).
    for (const g of nativeHost.dimGates) {
      gates.push({
        pos: g.pos, kind: `dim_${g.dimId}`, key: `dim:${g.dimId}:${Math.round(g.pos.x)},${Math.round(g.pos.y)}`,
        // A gate may RIDE a registered traversal (DimensionEntry.traversal):
        // the crossing plays the cinematic and the dimension swap fires
        // behind its veil (the geyser-mouth pattern) — the ascendant arch
        // launches you again, steadier. No row = the old instant cross.
        enter: () => {
          const trav = dimensionDef(g.dimId).entry?.traversal;
          if (trav) nativeHost.beginTraversal(trav, { swap: () => nativeHost.enterDimension(g.dimId) });
          else nativeHost.enterDimension(g.dimId);
        },
        ...nativeHost.dimensionRoad(g.dimId),
      });
    }
    for (const dp of nativeHost.demonPortals) gates.push({ pos: dp.pos, kind: 'demon', key: `demon:${dp.invId}`, enter: () => nativeHost.enterDemonRealm(dp.invId, dp.pos),
      ...nativeHost.realmRoad(s => nativeHost.shardRealmRoad(s, nativeHost.demonRealmPlan(dp.invId, dp.pos))) });
    for (const cp of nativeHost.crusadePortals) gates.push({ pos: cp.pos, kind: 'crusade', key: `crusade:${cp.crusadeId}`, enter: () => nativeHost.enterCrusadeSanctum(cp.crusadeId, cp.pos),
      ...nativeHost.realmRoad(s => nativeHost.shardRealmRoad(s, nativeHost.crusadeRealmPlan(cp.crusadeId, cp.pos))) });
    for (const np of nativeHost.necropolisPortals) gates.push({ pos: np.pos, kind: 'necropolis', key: 'necropolis', enter: () => nativeHost.enterNecropolis(np.pos),
      ...nativeHost.realmRoad(s => nativeHost.shardRealmRoad(s, nativeHost.necropolisRealmPlan(np.pos))) });
    for (const fr of nativeHost.fractureRifts) gates.push({ pos: fr.pos, kind: 'fracture', key: `fracture:${fr.id}`, enter: () => nativeHost.enterFractureRift(fr),
      ...nativeHost.realmRoad(s => nativeHost.shardRealmRoad(s, nativeHost.fractureRealmPlan(fr))) });
    // COURT DOORS (encounter fabric): the fed breach's standing way into
    // its lord's domain — the same deliberate dwell as every threshold
    // (its 'realm_gate:<gateKind>' transit row sets the feel).
    for (const e of nativeHost.encounters) {
      if (e.phase !== 'door' || !e.doorAt) continue;
      const at = e.doorAt;
      gates.push({
        pos: at, kind: e.def.court?.door?.gateKind ?? 'court',
        key: `court:${e.def.id}:${e.lordId ?? ''}`,
        enter: () => nativeHost.enterCourtDomain(e),
        ...nativeHost.realmRoad(s => nativeHost.shardRealmRoad(s, nativeHost.courtRealmPlan(e))),
      });
    }
    // THE WRAITHSAIL at sea: cross her under sail — nose into her shadow
    // and hold fast to BOARD. The boarding is a realm gate like any other
    // threshold (its 'realm_gate:wraithsail' transit row sizes the
    // hull-wide reach); interceptRadius gates the listing so the dwell
    // only ever arms on a genuine crossing.
    if (nativeHost.sailing) {
      const wf = nativeHost.sim.wraithsailField;
      const ship = wf?.shipInfo();
      if (wf && ship && wf.boardable()) {
        const boat = nativeHost.nodeFromSea(nativeHost.player.pos);
        if (Math.hypot(ship.x - boat.x, ship.y - boat.y) <= wf.surge().interceptRadius) {
          gates.push({
            pos: nativeHost.seaFromNode({ x: ship.x, y: ship.y }), kind: 'wraithsail',
            key: `wraithsail:${ship.id}`,
            enter: () => nativeHost.beginWraithsailBoarding(),
          });
        }
      }
    }
    return gates;
  }

export function sceneTravelThrough(nativeHost:NativeSceneCampaignFrameClosureHost, e: ZoneExit): void {
    if (nativeHost.massAway && e.to === MASS_ZONE && nativeHost.caveReturn?.zoneId === MASS_ZONE) {
      nativeHost.resumeMassSurface(); return;
    }
    // Climbing back out of a cave: drop onto the surface at the same mouth. The
    // parent carries a fixed seed, so its layout (and that mouth) regenerates
    // identically and the entrance is right where we left it.
    if (nativeHost.inCave && nativeHost.caveReturn && e.to === nativeHost.caveReturn.zoneId) {
      // DESCENT: the abyss's shaft is the voluntary climb-out — bank the FULL haul
      // and restore the surface return (resurfaceFromDescent), not the plain exit.
      if (nativeHost.descentRun && nativeHost.zone.id === nativeHost.descentRun.caveId) {
        nativeHost.resurfaceFromDescent('climb');
        return;
      }
      const ret = nativeHost.caveReturn;
      // Climbing ONE rung: pop the outer level's way home off the ladder stack
      // (null when this was the top rung — a plain surface climb-out, exactly
      // the pre-ladder behavior). Restored BEFORE loadZone so leaving the
      // deeper cave still reads as an in-cave transition (zone memory), and so
      // the outer cave loads with its way home intact. A surface load clears
      // both field + stack inside loadZone regardless.
      nativeHost.caveReturn = nativeHost.caveStack.pop() ?? null;
      // Restore the ORIGINAL entry direction so a gated parent zone's exits don't
      // all re-seal (entryFrom=null would lock every exit on a boss/spawner zone).
      nativeHost.loadZone(ret.zoneId, ret.entryFrom ?? undefined);
      // INDOOR mouths (the cellar hatch) surface you ON the hatch — a step
      // south would clip through the house wall and clampPos would strand you
      // OUTSIDE. STORY-SEATED mouths (the arrivalStory law: a taproot gate
      // down in the root galleries) likewise — a step off the door could
      // leave the gallery's floor, and the recorded story must stand where
      // it lands. Open-air ground mouths keep the classic step off the hole;
      // the exit grace guards re-descent either way.
      const indoors = !!(ret.kind && sidezoneOf(ret.kind)?.indoorsOnly);
      const sunken = (ret.tier ?? 0) >= 1;
      const stepY = indoors || sunken ? 0 : 40;
      const sc = indoors || sunken ? 0.5 : 1;
      // THE PARTY-LANDING LAW: seats AND the carried court climb out at the
      // mouth together — loadZone stood them at the generic entry (zone
      // CENTER when entryFrom is null), a county away from their keeper.
      nativeHost.landPartyAt(vec(ret.pos.x, ret.pos.y + stepY), { spread: 50 * sc, band: [0, 50 * sc], tier: ret.tier ?? 0 });
      nativeHost.caveExitGrace = true; // standing on the mouth — don't re-descend until clear
      return;
    }
    // THE FAR MOUTH (the rooted web): standing in a SPAN pocket, an exit
    // naming a member that is NOT the rung we came down surfaces THERE — the
    // under-road walked. The surface load itself unwinds the ladder (the
    // surface-load law inside loadZone), the entry law lifts the arrival's
    // veil (the loud discovery), the party lands AT the far zone's own span
    // mouth (harvest-paired on load, deterministic — a missing mouth
    // degrades to wherever loadZone stood us), and the crossing stamps its
    // ledger. The classic intercept above already handled the way back.
    if (nativeHost.inCave && nativeHost.zone.underSpan && nativeHost.zoneMap[e.to]) {
      const span = nativeHost.zone.underSpan;
      bumpLedger(nativeHost.ledger, 'rootspan_crossed');
      nativeHost.loadZone(e.to);
      const mouth = nativeHost.caveEntrances.find(en => en.underSpan === span);
      // A story-seated far mouth (mouthTier — none ship today, but the
      // arrivalStory law holds structurally) lands the party ON it at its
      // own story; ground mouths keep the classic step + bytes.
      const mTier = mouth?.mouthTier ?? 0;
      if (mouth) {
        nativeHost.landPartyAt(vec(mouth.pos.x, mouth.pos.y + (mTier >= 1 ? 0 : 40)),
          { spread: mTier >= 1 ? 25 : 50, band: mTier >= 1 ? [0, 25] : [0, 50], tier: mTier });
      }
      nativeHost.caveExitGrace = true; // standing on the far mouth — don't re-descend until clear
      return;
    }
    let dest = e.to;
    if (dest === '?') {
      const def = nativeHost.zone.exits[e.defIndex];
      const gen = nativeHost.chartFrontier(nativeHost.zone, def); // mint-once + Field-shaped; charts the node
      // A frontier chartFrontier DROPS (a port's seaward stub, a Field's own
      // region) returns the source — never wire a self-portal (with the eager
      // web on, eagerChartNeighbors consolidates these before travel; this
      // guard keeps the contract when the flag is off).
      if (gen.id === nativeHost.zone.id) return;
      def.to = gen.id; // the frontier is now charted — permanently linked
      dest = gen.id;
    }
    // Escape credit requires an onward route by default; retreat remains free.
    // Resolve frontier destinations before comparing with the entry route.
    // One-time: a re-escaped zone pays nothing (per-run gate).
    const escaped = escapeExitAllowed(nativeHost.zone.objective, nativeHost.entryFrom, dest) && !nativeHost.objectiveDone
      && !nativeHost.completedObjectives.has(nativeHost.zone.id)
      ? nativeHost.zone : null;
    nativeHost.loadZone(dest, nativeHost.zone.id);
    if (escaped) {
      nativeHost.completedObjectives.add(escaped.id);
      const bonus = objectiveRewardXp(escaped.level);
      nativeHost.grantXp(bonus);
      nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 70),
        `Escaped ${escaped.name}! +${bonus} xp`, '#ffd700', 16);
      // Escape completion doesn't route through completeObjective, so resolve the
      // quest here too — routed through the field-cleared seam (by escaped.id, since
      // this.zone is now the destination) so an escape+turnIn quest also DEFERS its
      // reward to the giver instead of paying at the portal.
      if (nativeHost.activeQuests.some(e => e.zoneId === escaped.id)) nativeHost.onQuestZoneFieldCleared(escaped.id);
    }
  }

export function sceneTriggerFracture(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const run = nativeHost.fractureRun;
    if (!run || run.phase !== 'dormant') return;
    bumpLedger(nativeHost.ledger, 'fractures_seen'); // discovery — gates the Vault unlock
    nativeHost.beginFissure(run, 'The earth splits — chase the fissure!');
  }

export function sceneUpdateTownPortals(nativeHost:NativeSceneCampaignFrameClosureHost, dt: number): boolean {
    if (nativeHost.clientActionHook || nativeHost.traversal) return false;
    for (const view of nativeHost.townPortalViews()) {
      const seat = nativeHost.seats.find(s => s.id === view.owner);
      const p = nativeHost.townPortals.find(p => p.owner === view.owner);
      if (!seat || !p) continue;
      const a = seat.actor;
      if (!nativeHost.isPresentActor(a)) { nativeHost.townPortalDwell.delete(seat.id); continue; }
      const near = dist(a.pos, view.pos) <= TOWN_PORTAL_CFG.reach;
      if (!near) nativeHost.townPortalArrival.delete(seat.id);
      if (!near || a.dead || a.downed || a.push || a.casting || !nativeHost.seatIdle(seat)
        || nativeHost.townPortalArrival.has(seat.id)
        || !nativeHost.dwellReachable(a.pos, view.pos, 'sight', { from: a.tier ?? 0, to: view.tier })) {
        nativeHost.townPortalDwell.delete(seat.id); continue;
      }
      const dwell = (nativeHost.townPortalDwell.get(seat.id) ?? 0) + dt;
      nativeHost.townPortalDwell.set(seat.id, dwell);
      if (dwell < TOWN_PORTAL_CFG.dwellSeconds) continue;
      // THE ROADS PER PLAYER (shard M1 W2): on a hosted world the portal moves
      // its owner alone, so the other seats' dwells stand.
      if (nativeHost.shardWorld) nativeHost.townPortalDwell.delete(seat.id); else nativeHost.townPortalDwell.clear();
      if (p.returning) {
        const source = p.origin.cave?.zoneId ?? p.origin.zoneId;
        // An awake source's seed is its live unit's (its stored row is stale until it sleeps); a party
        // pocket's is the seat's party's own instance (TENANCY, card 25).
        if ((nativeHost.shardWorld?.liveSeed?.(source, seat.id) ?? nativeHost.zoneMemory.get(source)?.seed) !== p.sourceSeed
          || (nativeHost.shardWorld && !nativeHost.zoneMap[source] && !nativeHost.caveMap[source])) {
          nativeHost.townPortals = nativeHost.townPortals.filter(q => q !== p);
          nativeHost.notice('The old return passage has faded.', TOWN_PORTAL_CFG.color, 14, 'world');
          continue;
        }
        if (TOWN_PORTAL_CFG.consumeOnReturn) nativeHost.townPortals = nativeHost.townPortals.filter(q => q !== p);
        else p.returning = false;
        if (nativeHost.shardWorld) {
          // The way back: the source's own unit at the portal's spot, down the
          // saved descent when it was cast below ground (the ladder rides the ticket).
          const spot = p.origin.cave ?? p.origin, rungs = p.origin.cave?.rungs;
          nativeHost.shardWorld.enqueue({ seatId: seat.id, dest: source, ladder: ladderOfSpot(p.origin),
            from: rungs?.length ? rungs[rungs.length - 1].zoneId : p.sourceEntryFrom ?? null,
            landing: { at: { x: spot.x, y: spot.y }, tier: p.originTier } });
          nativeHost.townPortalArrival.add(seat.id); // step clear before another dwell (it travels with the seat)
          continue; // the unit's other seats keep their frame
        }
        nativeHost.resumeSpawn('exact', p.origin, p.sourceEntryFrom);
        const spot = p.origin.cave ?? p.origin;
        if (nativeHost.zone.id === source) nativeHost.landPartyAt(vec(spot.x, spot.y), { tier: p.originTier });
      } else {
        if (nativeHost.shardWorld) {
          // THE HEARTH ALIAS: the destination is the keeper's; the landing
          // resolves there (its waypoint, else THE HEARTH SEAT), where the
          // return portal stands.
          nativeHost.shardWorld.enqueue({ seatId: seat.id, dest: p.destination, from: null,
            landing: dw => {
              const anchor = dw.waypointPos ?? dw.shardWorld?.hearth?.() ?? dw.player.pos;
              p.destinationPos = dw.findFreeSpot(vec(anchor.x + TOWN_PORTAL_CFG.arrivalOffset.x,
                anchor.y + TOWN_PORTAL_CFG.arrivalOffset.y), 18, 0);
              p.returning = true;
              // THE WILDS LAW: the settlement is the surface, so the return passage
              // stands in the zone the seat landed in (the hearth's id never names it).
              if (dw.massRuntime) p.destination = dw.zone.id;
              return { at: { x: p.destinationPos.x, y: p.destinationPos.y } };
            } });
          nativeHost.townPortalArrival.add(seat.id); // step clear before another dwell (it travels with the seat)
          continue; // the unit's other seats keep their frame
        }
        nativeHost.loadZone(p.destination);
        const anchor = nativeHost.waypointPos ?? nativeHost.player.pos;
        p.destinationPos = nativeHost.findFreeSpot(vec(anchor.x + TOWN_PORTAL_CFG.arrivalOffset.x,
          anchor.y + TOWN_PORTAL_CFG.arrivalOffset.y), 18, 0);
        p.returning = true;
        nativeHost.landPartyAt(p.destinationPos);
      }
      nativeHost.townPortalArrival.add(seat.id); // step clear before another dwell
      return true;
    }
    return false;
  }

export function sceneWardSealUnder(nativeHost:NativeSceneCampaignFrameClosureHost, a: Actor): Doodad | null {
    if (!nativeHost.arenaWard) return null;
    let onSeal: Doodad | null = null, sealD = Infinity;
    for (const s of nativeHost.arenaWard.seals) {
      const d = dist(a.pos, s.pos);
      if (d <= transitRadius(`ward_seal:${s.kind}`, 30) + a.radius && d < sealD
        && nativeHost.dwellReachable(a.pos, s.pos, transitReach(`ward_seal:${s.kind}`), nativeHost.storyPair(a, s))) { sealD = d; onSeal = s; }
    }
    return onSeal;
  }

export function sceneWaypointBesieged(nativeHost:NativeSceneCampaignFrameClosureHost): boolean {
    return nativeHost.zone.objective.kind === 'leyline' && !nativeHost.objectiveDone
      && nativeHost.actors.some(a => !a.dead && a.tag === 'ley_siphon');
  }

export function sceneApplyWaveFrenzy(nativeHost:NativeSceneCampaignFrameClosureHost, m: Actor, fz: WaveFrenzySpec): void { return applySceneWaveFrenzy(nativeHost.nativeScenePopulationHost(),m,fz); }

export function sceneRecalcPlayer(nativeHost:NativeSceneCampaignFrameClosureHost): void { nativeHost.recalcSeat(nativeHost.localSeat); }

export function sceneApplyAction(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, action: MetaAction): void {
    if (!isValidMetaAction(action)) return;
    const wasActing = nativeHost.actingSeat;
    nativeHost.actingSeat = seat; // THE ACTING SEAT: news this act mints reaches its party
    const d0 = nativeHost.drops.length; // THE OWNER STAMP (card 27): what this act mints is this seat's
    try { nativeHost.applyActionAs(seat, action); } finally { nativeHost.actingSeat = wasActing; }
    if (nativeHost.dropRuleOf) nativeHost.ownSpoils(d0, seat);
  }

export function sceneShardRoadHost(nativeHost:NativeSceneCampaignFrameClosureHost): ShardRoadHost<NativeAreaRoadDestination> {
    if (nativeHost.shardRoadView) return nativeHost.shardRoadView;
    const world = nativeHost;
    const host: ShardRoadHost<NativeAreaRoadDestination> = {
      get caveEntrances() { return world.caveEntrances; },
      get caveStack() { return world.caveStack; },
      get currentZoneSeed() { return world.currentZoneSeed; },
      mouthRoad: (seat, cm) => world.shardMouthRoad(seat, cm),
      exitRoad: (seat, e) => world.shardExitRoad(seat, e),
      breakArenaSeal: seal => world.breakArenaSeal(seal),
      failNote: (a, key, msg) => world.failNote(a, key, msg),
      sealedRoadUnder: seat => world.sealedRoadUnder(seat),
    };
    nativeHost.cacheShardRoadHost(host);
    return host;
  }

export function sceneShardMouthRoad(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, cm: CaveMouthRow): RoadTicket<NativeAreaRoadDestination> | null {
    const sz = sidezoneOf(cm.kind);
    if (!sz) return null;
    const dest = nativeHost.mintSidezone(cm);
    if (!dest) return null;
    const ladder = nativeHost.seatLadderOf(seat);
    // A deeper pocket under the wilds rides the wilds save (the keeper's roots, THE PIN's alias).
    if ((ladder.caveStack[0] ?? ladder.caveReturn)?.zoneId === MASS_ZONE) nativeHost.massCaveIds.add(dest.id);
    nativeHost.applySidezoneFurnish(dest, sz);
    if (sz.levelWith === 'character') dest.level = Math.max(1, nativeHost.seatHero(seat).level);
    if (sz.tenancy && dest.tenancy !== sz.tenancy) dest.tenancy = sz.tenancy; // TENANCY (card 25): the pocket wears its kind's word (a party's own instance)
    if (sz.ledgerOnEnter) bumpLedger(nativeHost.ledger, sz.ledgerOnEnter);
    const tier = seat.actor.tier;
    const rung = { zoneId: nativeHost.zone.id, pos: vec(cm.pos.x, cm.pos.y), entryFrom: nativeHost.seatDoorOf(seat), kind: cm.kind, seed: cm.seed,
      ...(cm.underSpan ? { underSpan: cm.underSpan } : {}), ...(tier ? { tier } : {}) };
    return { seatId: seat.id, dest: dest.id, from: nativeHost.zone.id, landing: 'entry',
      ladder: { caveReturn: rung, caveStack: ladder.caveReturn ? [...ladder.caveStack, ladder.caveReturn] : [...ladder.caveStack] } };
  }

export function sceneShardExitRoad(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, e: ZoneExit): RoadTicket<NativeAreaRoadDestination> | null {
    const a = seat.actor, ladder = nativeHost.seatLadderOf(seat), ret = ladder.caveReturn;
    const pocket = !nativeHost.zoneMap[nativeHost.zone.id];
    if (pocket && ret && e.to === ret.zoneId) {
      // THE DESCENT's shaft is its run's own climb (sealed on a hosted world).
      if (nativeHost.descentRun && nativeHost.zone.id === nativeHost.descentRun.caveId) return null;
      // THE WILDS LAW: a native pocket's way out is the keeper's surface, at the mouth.
      if (ret.zoneId === MASS_ZONE) {
        const top = ladder.caveStack[0] ?? ret;
        const near = !!(top.kind && sidezoneOf(top.kind)?.indoorsOnly) || (top.tier ?? 0) > 0 ? 25 : 50;
        return { seatId: seat.id, dest: MASS_ZONE, from: null, ladder: { caveReturn: null, caveStack: [] }, grace: 'caveExit',
          landing: { at: { x: top.pos.x, y: top.pos.y }, spread: near, band: [0, near], tier: top.tier ?? 0 } };
      }
      // The climb-out: one rung up the seat's own ladder, onto the parent at the
      // mouth by the indoor and story rules (travelThrough's own landing).
      const indoors = !!(ret.kind && sidezoneOf(ret.kind)?.indoorsOnly), sunken = (ret.tier ?? 0) >= 1;
      const stepY = indoors || sunken ? 0 : 40, sc = indoors || sunken ? 0.5 : 1;
      const stack = ladder.caveStack.map(r => ({ ...r, pos: vec(r.pos.x, r.pos.y) }));
      return { seatId: seat.id, dest: ret.zoneId, from: ret.entryFrom, ladder: { caveReturn: stack.pop() ?? null, caveStack: stack },
        grace: 'caveExit', landing: { at: { x: ret.pos.x, y: ret.pos.y + stepY }, spread: 50 * sc, band: [0, 50 * sc], tier: ret.tier ?? 0 } };
    }
    if (pocket && nativeHost.zone.underSpan && nativeHost.zoneMap[e.to]) {
      // THE FAR MOUTH (the rooted web): surface at the far member's own span
      // mouth, resolved in the destination after its load.
      const span = nativeHost.zone.underSpan;
      bumpLedger(nativeHost.ledger, 'rootspan_crossed');
      return { seatId: seat.id, dest: e.to, from: null, ladder: { caveReturn: null, caveStack: [] }, grace: 'caveExit',
        landing: dw => {
          const mouth = dw.caveEntrances.find(en => en.underSpan === span);
          if (!mouth) return 'entry';
          const t = mouth.mouthTier ?? 0;
          return { at: { x: mouth.pos.x, y: mouth.pos.y + (t >= 1 ? 0 : 40) }, spread: t >= 1 ? 25 : 50, band: t >= 1 ? [0, 25] : [0, 50], tier: t };
        } };
    }
    let dest = e.to;
    if (dest === '?') {
      const def = nativeHost.zone.exits[e.defIndex];
      if (def.to !== '?') dest = def.to; // another seat's road charted it first (the live exit lags its def)
      else {
        const gen = nativeHost.chartFrontier(nativeHost.zone, def); // THE PIN carries the chart and nextGenId home
        if (gen.id === nativeHost.zone.id) return null;
        def.to = gen.id;
        dest = gen.id;
      }
      e.to = dest; // the unit stays: its live exit now names the charted ground
    }
    // THE RETREAT LAW's escape credit: judged from the seat's own door, paid in
    // the source to the traveller's party within reach (THE KILLER'S DUE).
    const escaped = escapeExitAllowed(nativeHost.zone.objective, nativeHost.seatDoorOf(seat), dest) && !nativeHost.objectiveDone
      && !nativeHost.completedObjectives.has(nativeHost.zone.id) ? nativeHost.zone : null;
    let word: string | null = null;
    if (escaped) {
      const acting = nativeHost.actingSeat;
      nativeHost.actingSeat = seat;
      try {
        nativeHost.completedObjectives.add(escaped.id);
        const bonus = objectiveRewardXp(escaped.level);
        nativeHost.grantXp(bonus, a.pos, seat);
        word = `Escaped ${escaped.name}! +${bonus} xp`;
        if (nativeHost.questOnZone(escaped.id)) nativeHost.onQuestZoneFieldCleared(escaped.id, [a.pos], seat); // THE CHARACTER'S QUESTS: the escaper and its party near the door
      } finally { nativeHost.actingSeat = acting; }
    }
    const carry = !nativeHost.zoneMap[dest] && !!nativeHost.caveMap[dest]; // pocket to pocket: the way home walks along
    return {
      seatId: seat.id, dest, from: nativeHost.zone.id, landing: 'entry',
      ...(carry ? { ladder: { caveReturn: ladder.caveReturn, caveStack: [...ladder.caveStack] } } : {}),
      ...(word ? { after: (dw: NativeAreaRoadDestination, s: Seat) => { const h = dw.seatHero(s); dw.text(vec(h.pos.x, h.pos.y - 70), word!, '#ffd700', 16); } } : {}),
    };
  }

export function sceneSealedRoadUnder(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): { kind: SealedRoadKind; pos: Vec2 } | null {
    const a = seat.actor;
    const dock = nativeHost.portDock();
    if (dock && dist(a.pos, dock.pos) <= 110 && nativeHost.dwellReachable(a.pos, dock.pos, DWELL_CFG.reach, nativeHost.storyPair(a, dock))) {
      return { kind: nativeHost.sim.wraithsailField?.dockedOn(nativeHost.zone.id) ? 'wraithsail' : 'dock', pos: dock.pos };
    }
    const board = nativeHost.nearHarborBoard(seat) ? nativeHost.doodads.find(d => d.kind === 'harbor_board') : undefined;
    if (board) return { kind: 'voyage', pos: board.pos };
    const site = nativeHost.descentSite;
    if (site && !nativeHost.descentRun && !nativeHost.descentSpent.has(nativeHost.zone.id)
      && dist(a.pos, site.platform) <= transitRadius('descent_shaft', 72)
      && nativeHost.dwellReachable(a.pos, site.platform, transitReach('descent_shaft'), nativeHost.storyPair(a))) return { kind: 'descent', pos: site.platform };
    return null;
  }

export function sceneBountyOmens(nativeHost:NativeSceneCampaignFrameClosureHost): Omen[] {
    const out: Omen[] = [];
    // THE CHARACTER'S QUESTS: on a hosted world every hero's own errands whisper.
    const held = nativeHost.localSeat.keeper ? nativeHost.allQuestHands().flatMap(s => nativeHost.questLedgerOf(s).hands) : nativeHost.bountyHands;
    for (const p of held) {
      if (p.kind !== 'errand' || p.face === 'lift') continue;
      if (nativeHost.visited.has(p.zoneId)) continue;
      const z = nativeHost.zoneMap[p.zoneId];
      if (!z) continue;
      const O = BOUNTY_BOARD_CFG.omen;
      out.push({
        id: `bounty_omen_${p.id}`,
        at: { x: z.map.x, y: z.map.y },
        zoneId: p.zoneId,
        color: BOUNTY_BOARD_CFG.accent,
        lines: ['the board\'s mark lies {bearing}, {dist}'],
        whisper: O.whisper, reveal: O.reveal, widenPerMin: O.widenPerMin,
        age: Math.max(0, nativeHost.time - (p.acceptAt ?? nativeHost.time)),
        dimension: z.dimension,
      });
    }
    return out;
  }

export function sceneHarborholdOmens(nativeHost:NativeSceneCampaignFrameClosureHost): Omen[] {
    const out: Omen[] = [];
    const O = HARBORHOLD_CFG.omen;
    for (const def of Object.values(nativeHost.zoneMap)) {
      const hold = def.harborhold;
      if (!hold || hold.state !== 'besieged' || hold.fallAt === undefined) continue;
      const cls = holdClassOf(hold);
      out.push({
        id: `harborhold:${def.id}`, at: def.map, zoneId: def.id, color: '#e8a050',
        lines: [...O.lines], whisper: O.whisper, reveal: O.reveal,
        widenPerMin: O.widenPerMin,
        age: Math.max(0, nativeHost.time - (hold.fallAt - cls.fallAfterSec)),
      });
    }
    return out;
  }

export function sceneDevOverlayView(nativeHost:NativeSceneCampaignFrameClosureHost): OverlayView { return nativeHost.simView(); }

export function sceneVendorQualityPieces(nativeHost:NativeSceneCampaignFrameClosureHost, key: string): number { return settlementVendorQualityPieces(nativeHost.nativeSettlementHost(),key); }

export function sceneMintAuthoredZone(nativeHost:NativeSceneCampaignFrameClosureHost, mapId: string, opts: {
    id?: string;
    anchor?: ZoneDef;
    target?: MapCoord;
    level?: number;
    seed?: number;
    /** Wire the road both ways (default true). */
    linkBack?: boolean;
    /** Mint DISCONNECTED (find-it) — connectFloatingZone wires it on approach. */
    floating?: boolean;
    forceWaypoint?: boolean;
    wpExclusionRadius?: number;
    /** Explicit ZoneSpec words that win over the map's own. */
    spec?: Partial<ZoneSpec>;
  } = {}): ZoneDef | null {
    const map = authoredMapOf(mapId);
    if (!map) return null;
    if (opts.id && nativeHost.zoneMap[opts.id]) return nativeHost.zoneMap[opts.id];
    const sane = (z: ZoneDef): boolean => !z.floating && !z.concealed && !isRoadlessGateHub(z) && z.caveDepth == null;
    const here = nativeHost.zoneMap[nativeHost.zone.id];
    const anchor = (opts.anchor && sane(opts.anchor) ? opts.anchor : null)
      ?? (opts.target ? nearestNode(nativeHost.zoneMap, opts.target, undefined, undefined, sane) : null)
      ?? (here && sane(here) ? here : nativeHost.surfaceAnchor());
    const target = opts.target ?? { x: anchor.map.x + 3, y: anchor.map.y - 2 };
    const floating = opts.floating ?? false;
    const link = !floating && (opts.linkBack ?? true);
    const seed = opts.seed ?? ((nativeHost.manifest.seed ^ hashStr(`authored:${opts.id ?? mapId}`)) >>> 0);
    const def = placeZoneAt(target, anchor, nativeHost.zoneMap, nativeHost.nextGenId++, authoredZoneSpec(map, definedSpec({
      id: opts.id,
      level: opts.level ?? map.level ?? nativeHost.eventLevel(target),
      seed, linkBack: link, floating,
      forceWaypoint: opts.forceWaypoint, wpExclusionRadius: opts.wpExclusionRadius,
      biomeFor: nativeHost.biomeFor,
      ...(anchor.dimension ? { dimension: anchor.dimension } : {}),
      ...opts.spec,
    } as Partial<ZoneSpec>)));
    sealAuthoredZone(def, map);
    nativeHost.zoneMap[def.id] = def;
    if (!floating) {
      nativeHost.sim.onNodeCharted(def, nativeHost.simView());
      if (link) nativeHost.notarizeRoad(anchor, def);
      if (anchor.veiled) { anchor.veiled = false; nativeHost.refreshExitLabels(); }
    }
    return def;
  }

export function sceneQuestHandLevel(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    const hand = nativeHost.localSeat.keeper ? nativeHost.questHand() : null;
    return hand && !hand.keeper ? nativeHost.seatHero(hand).level : nativeHost.player.level;
  }

export function sceneSpawnArenaBoss(nativeHost:NativeSceneCampaignFrameClosureHost, spec: ArenaBossSpec): Actor | null {
    const lvl = Math.max(1, nativeHost.zone.level + (spec.levelBonus ?? 0));
    const bossLvl = lvl + (spec.bossBump ?? 0);
    const bossId = spec.monsterId
      ?? (spec.pool?.length ? nativeHost.weightedPick(spec.pool, bossLvl) : undefined);
    if (!bossId || !MONSTERS[bossId]) return null;
    const at = nativeHost.clampPos(nativeHost.farPoint(spec.far ?? 420), 30);
    const boss = nativeHost.createMonster(bossId, bossLvl, 'enemy');
    boss.faction = spec.faction;
    nativeHost.promoteRarity(boss, 'crowned');
    boss.tag = spec.tag;
    if (spec.xpFloor) boss.xpValue = Math.max(boss.xpValue, spec.xpFloor);
    boss.pos = nativeHost.clampPos(vec(at.x, at.y), boss.radius);
    nativeHost.actors.push(boss);
    observeNativeCombatBirth(nativeHost,boss);
    const g = spec.garrison ?? { count: [6, 10] as [number, number] };
    const pool = (spec.garrisonTable ?? FACTIONS[spec.faction]?.table ?? []).filter(e => e.id !== bossId);
    const n = randInt(g.count[0], g.count[1]);
    const spread = g.spread ?? 110;
    const squadId = g.squad ? nativeHost.nextSquadId() : undefined;
    for (let k = 0; k < n && pool.length; k++) {
      const m = nativeHost.createMonster(nativeHost.weightedPick(pool, lvl), lvl, 'enemy');
      m.faction = spec.faction;
      if (squadId !== undefined) { m.squadId = squadId; m.squadLeader = k === 0; }
      m.pos = nativeHost.clampPos(vec(at.x + rand(-spread, spread), at.y + rand(-spread, spread)), m.radius);
      nativeHost.actors.push(m);
      observeNativeCombatBirth(nativeHost,m);
    }
    if (spec.announce) {
      nativeHost.notice(spec.announce.replace('{name}', MONSTERS[bossId]?.name ?? boss.name), spec.announceColor ?? '#e86a4a', 18, 'events');
    }
    return boss;
  }

export function sceneApplySidezoneFurnish(nativeHost:NativeSceneCampaignFrameClosureHost, def: ZoneDef, sz: { kind: string }): void {
    for (const f of allFurnishSpecs()) {
      if (f.sidezone !== sz.kind) continue;
      if (!nativeHost.sim.packageActive(f.packageId, nativeHost.player.level)) continue;
      const placed = def.fixtures?.some(fx =>
        fx.structure === f.fixture.structure && fx.x === f.fixture.x && fx.y === f.fixture.y);
      if (!placed) def.fixtures = [...(def.fixtures ?? []), { ...f.fixture }];
    }
  }

export function sceneIsExitLocked(nativeHost:NativeSceneCampaignFrameClosureHost, e: ZoneExit, from: string | null = nativeHost.entryFrom): boolean {
    // HOLDFAST: a fortified bonus exit stays sealed until its toll is met — INDEPENDENT
    // of the zone objective (checked BEFORE the objectiveDone early-out, so clearing the
    // zone never opens the gate). Resolved against the durable HoldfastField lock state.
    const ed = nativeHost.zone.exits[e.defIndex];
    // THE HARBORHOLD GATE (the harbor pair's causeway): an exit locked with
    // the one word `'harborhold'` answers to ITS OWN zone's hold state —
    // sealed unless the hold stands open. Data-driven and zone-local (any
    // zone carrying a harborhold state may seal any exit this way), checked
    // before the holdfast overlay so the two lock families never collide.
    if (ed?.lock === 'harborhold') {
      return !!nativeHost.zone.harborhold && nativeHost.zone.harborhold.state !== 'open';
    }
    if (ed?.lock && nativeHost.sim.holdfastField?.isLocked(nativeHost.zone.id, ed.lock)) return true;
    // DIMENSION SEAL: an exit that crosses dimensions WITHOUT the declared gate
    // marker is a defect (a pre-fix save, a bad mint) — it stays sealed forever,
    // so a damaged world self-heals into "a rift that never opens" instead of a
    // door to the wrong plane. Diagnosis lands in the console via placeExit.
    if (nativeHost.isIllegalCrossDim(ed)) return true;
    // A PURCHASED POCKET'S ONE ROAD HOME NEVER SEALS BEHIND POLICY. The
    // objective seal spares only the entry edge — and a WAYPOINT re-entry
    // carries no entry edge, so a pocket that rolled a sealing objective
    // (a legacy save's boss pocket; a future authored form) would lock its
    // buyer inside a dead end. A roving edge blockade across the only road
    // would strand outright (the edge-block contract already forbids
    // stranding — this is the engine-side belt). The toll lock above still
    // binds (it is the gate's own, payable ask) and a defective cross-dim
    // edge still heals sealed; everything below is policy, and policy never
    // traps the buyer in bought ground.
    if (nativeHost.zone.pocket) return false;
    // EDGE BLOCKADE (world/edgeBlocks.ts): a living event holds this road shut
    // (the world-serpent's coils). Checked BEFORE the objectiveDone early-out —
    // clearing a zone never opens a strangled pass; only the event's own end
    // does. Any overlay can hold a road via registerEdgeBlockSource.
    if (ed && ed.to !== '?' && edgeBlockAt(nativeHost, nativeHost.zone.id, ed.to)) return true;
    if (nativeHost.objectiveDone) return false;
    return objectiveSeals(nativeHost.zone.objective) && e.to !== from;
  }

export function sceneHoldfastKeeper(nativeHost:NativeSceneCampaignFrameClosureHost): Actor | null {
    const site = nativeHost.holdfastSite;
    const hf = nativeHost.sim.holdfastField;
    if (!site || !hf || !hf.isLocked(site.zoneId, site.lockId)) return null;
    const k = nativeHost.actorById(site.keeperId);
    if (!k || k.dead || k.aiAwakened) return null;
    // EVERY warden must be alive + neutral (a dead or roused guard closes the parley).
    for (const id of site.banditIds) {
      const a = nativeHost.actorById(id);
      if (!a || a.dead || a.aiAwakened) return null;
    }
    return k;
  }

export function sceneMintMassSidearea(nativeHost:NativeSceneCampaignFrameClosureHost, cm: { pos: Vec2; seed: number; kind: string; massOwner?: string; nativeParent?: ZoneDef }): ZoneDef | null {
    const mass = nativeHost.massRuntime, sz = sidezoneOf(cm.kind);
    if (!mass || !sz || sz.spanMouth) return null; // shared underways need their real multi-mouth owner
    const at = mass.walk.at(cm.pos.x, cm.pos.y);
    const owner = cm.massOwner ?? JSON.stringify(['native-mouth', at, cm.kind, cm.seed]);
    const id = massSideareaId(mass.generator.run.runId, owner, cm.kind, cm.seed);
    if (!nativeHost.caveMap[id]) {
      const parent = copyMassSidearea(cm.nativeParent ?? nativeHost.localZoneAt(cm.pos));
      parent.id = MASS_ZONE; parent.level = nativeHost.levelAt(cm.pos);
      const def = sz.mint({ parent, seed: cm.seed, id, pos: { ...cm.pos }, playerLevel: nativeHost.player.level,
        pkgActive: pid => nativeHost.sim.packageActive(pid, nativeHost.player.level) });
      if (!def.exits.some(e => e.to === MASS_ZONE)) return null;
      nativeHost.caveMap[id] = def;
      nativeHost.massSideareaRoots.set(id, { id, owner, kind: cm.kind, seed: cm.seed, at, parent });
    }
    nativeHost.massCaveIds.add(id);
    return nativeHost.caveMap[id];
  }

export function sceneSidezoneSealHolds(nativeHost:NativeSceneCampaignFrameClosureHost, kind: string): boolean {
    const sb = sidezoneOf(kind)?.sealedBy;
    if (!sb) return false;
    const run = nativeHost.puzzles.find(r => r.kind.id === sb.kind);
    return !!run && !run.done;
  }

export function sceneOnMouth(nativeHost:NativeSceneCampaignFrameClosureHost, a: Actor, cm: CaveMouthRow, roof: PlacedStructure | null): boolean {
    return dist(a.pos, cm.pos) <= transitRadius(`sidezone:${cm.kind}`, 28) + a.radius
      // THE STORY GATE (mouthTier — the under-tier lanes): a mouth dwells
      // only from ITS OWN story. A taproot gate seated down in the root
      // galleries never triggers under a surface walker crossing the duct
      // line above it — and a surface mouth never triggers under a duct
      // runner passing beneath it (drawn == dwelled, both directions).
      && (cm.mouthTier ?? 0) === (a.tier ?? 0)
      && (!sidezoneOf(cm.kind)?.indoorsOnly || (!!cm.roof && cm.roof === roof))
      // THE CONDITIONED DOOR (SidezoneDef.when — the lair fabric's night
      // barrow): a closed door never starts the dwell. The refusal READ
      // (mouthRefusalUnder) lives beside the scan, so the schedule is never a mystery.
      && (!sidezoneOf(cm.kind)?.when || nativeHost.radianceCondHeld(sidezoneOf(cm.kind)!.when!.cond))
      // THE SEALED MOUTH (SidezoneDef.sealedBy — the exhumation law,
      // data/lonecrypt.ts): a riddle-sealed door never starts the dwell
      // either; its refusal rides the same read.
      && !nativeHost.sidezoneSealHolds(cm.kind)
      && nativeHost.dwellReachable(a.pos, cm.pos, transitReach(`sidezone:${cm.kind}`), nativeHost.storyPair(a, { tier: cm.mouthTier }));
  }

export function sceneSeedVeil(nativeHost:NativeSceneCampaignFrameClosureHost, e: ActiveEncounter): void {
    const v = e.def.veil!;
    const area = Math.PI * e.scale.maxRadius * e.scale.maxRadius;
    const count = Math.max(1, Math.round((area / 10_000) * v.knotPer10k));
    const knots: VeilKnot[] = [];
    for (let i = 0; i < count; i++) {
      const ang = nativeHost.encRng.range(0, Math.PI * 2);
      const r = Math.sqrt(nativeHost.encRng.next()) * e.scale.maxRadius;
      const pos = nativeHost.clampPos(vec(e.pos.x + Math.cos(ang) * r, e.pos.y + Math.sin(ang) * r), 12);
      // d is the TRUE post-clamp distance — a knot pushed inward by a zone
      // edge uncovers when the rim actually reaches where it stands.
      knots.push({ pos, d: dist(pos, e.pos), n: nativeHost.encRng.int(e.scale.spawnBatch[0], e.scale.spawnBatch[1]) });
    }
    knots.sort((a, b) => a.d - b.d);
    e.veil = { knots, cursor: 0, pending: [], peakRadius: e.radius, collapseFrom: 0, shards: [] };
  }

export function sceneSpawnPartyEchoes(nativeHost:NativeSceneCampaignFrameClosureHost, e: ActiveEncounter): void {
    const spec = e.def.echoParty!;
    if (!MONSTERS[spec.bodyDefId]) return;
    const lvl = Math.max(1, nativeHost.zone.level + (spec.levelBonus ?? 0));
    for (const seat of nativeHost.frameSeats()) {
      const hero = seat.actor;
      if (hero.dead) continue;
      const m = nativeHost.createMonster(spec.bodyDefId, lvl, 'enemy');
      // The silhouette: the hero's look, shape and size — worn in the vessel's
      // own pale glass (colour/material stay the def's): a mirror, not a twin.
      m.look = hero.look;
      m.shape = hero.shape;
      m.radius = hero.radius;
      m.facing = hero.facing;
      m.name = `Reflection of ${hero.name}`;
      // The bar, mirrored: monster-castable skills only, at a level that
      // tracks the body (the same quarter-pace grants use).
      const mirrored = hero.skills
        .filter((s): s is SkillInstance => !!s && !!s.def.ai)
        .slice(0, spec.maxSkills ?? 4);
      if (mirrored.length) {
        const skillLvl = Math.max(1, Math.ceil(lvl / 4));
        m.skills = mirrored.map(s =>
          makeSkillInstance(s.def, Math.min(skillMaxLevel(s.def), skillLvl)));
      }
      if (spec.powerMods?.length) m.sheet.setSource('echo_power', spec.powerMods);
      m.fillResources();
      const ang = nativeHost.encRng.range(0, Math.PI * 2);
      const rr = Math.max(60, e.radius * 0.6);
      m.pos = nativeHost.clampPos(vec(e.pos.x + Math.cos(ang) * rr, e.pos.y + Math.sin(ang) * rr), m.radius);
      e.spawned.add(m.id);
      nativeHost.actors.push(m);
      if (spec.announce) nativeHost.text(vec(m.pos.x, m.pos.y - 30), spec.announce, e.def.trigger.color, 14);
    }
  }

export function sceneEnterDimension(nativeHost:NativeSceneCampaignFrameClosureHost, dimId: string): void {
    // THE REALM ROADS (shard M1 W4): the crossing's prep is its own half; solo keeps the old order.
    const gate = nativeHost.dimensionCrossing(dimId, nativeHost.player.level, nativeHost.caveStack[0] ?? nativeHost.caveReturn);
    if (!gate) return;
    nativeHost.caveReturn = null; // the breach consumes the ladder — you cross, not climb
    nativeHost.caveStack.length = 0;
    nativeHost.notice('the world tears open…', gate.color, 15, 'events');
    nativeHost.loadZone(gate.id);
  }

export function sceneDimensionRoad(nativeHost:NativeSceneCampaignFrameClosureHost, dimId: string): Pick<RealmGateRow<NativeAreaRoadDestination>, 'road'> {
    return nativeHost.zoneMap[MASS_ZONE] ? {} : nativeHost.realmRoad(s => nativeHost.shardDimensionRoad(s, dimId));
  }

export function sceneEnterDemonRealm(nativeHost:NativeSceneCampaignFrameClosureHost, invId: string, portalPos: Vec2): void {
    // THE REALM ROADS (shard M1 W4): the plan is the prep; solo keeps the old order.
    const plan = nativeHost.demonRealmPlan(invId, portalPos);
    if (!plan) return;
    plan.context!(nativeHost);
    plan.stamp!();
    nativeHost.enterRealmArena(plan.arena);
  }

export function sceneRealmRoad(nativeHost:NativeSceneCampaignFrameClosureHost, make: (seat: Seat) => RoadTicket<NativeAreaRoadDestination> | null): Pick<RealmGateRow<NativeAreaRoadDestination>, 'road'> {
    return nativeHost.shardWorld ? { road: make } : {};
  }

export function sceneShardRealmRoad(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, plan: RealmPlan | null): RoadTicket<NativeAreaRoadDestination> | null {
    if (!plan) return null;
    plan.stamp?.();
    const o = plan.arena;
    nativeHost.realmArenaMint(o);
    const ladder = nativeHost.seatLadderOf(seat);
    return {
      seatId: seat.id, dest: o.caveId, from: nativeHost.zone.id, landing: 'entry',
      ladder: { caveReturn: { zoneId: nativeHost.zone.id, pos: vec(o.returnPos.x, o.returnPos.y), entryFrom: nativeHost.seatDoorOf(seat) },
        caveStack: [...ladder.caveStack] },
      onFirstWake: w => { plan.context?.(w); w.realmArenaWake(o); },
    };
  }

export function sceneDemonRealmPlan(nativeHost:NativeSceneCampaignFrameClosureHost, invId: string, portalPos: Vec2): RealmPlan | null {
    const dfz = nativeHost.sim.demonFieldFor(nativeHost.zone.dimension);
    const surge = dfz?.surge();
    if (!surge) return null;
    const info = dfz?.invasionOn(nativeHost.zone.id);
    if (!info || info.id !== invId) return null; // invasion burned out / moved on — no stale realm
    const stageIdx = info.stageIdx;
    // An attributed strike's realm is its LORD'S demesne: the lord's marshal
    // holds it at the head of the lord's own host (the War Below's banner all
    // the way down); unattributed keeps the Balor and the Legion, byte-for-byte.
    const champId = info.champion ?? surge.portal.champion.monsterId;
    const realmFaction = info.faction;
    // The realm pays the OVERWORLD stage reward PLUS a per-stage portal premium —
    // strictly more than felling the overworld Balor, the payoff for the deep risk.
    const ctx = { invId, rewardMul: info.rewardMul * (1 + surge.portal.rewardMulPerStage * stageIdx) };
    return {
      context: w => { w.realmContext = ctx; },
      stamp: () => bumpLedger(nativeHost.ledger, 'demon_portals_opened'), // surfaces the Infernal Dominion tier
      arena: {
        caveId: `cave_realm_${invId}`, // 'cave_' prefix ⇒ off-graph + cave-return travel
        tileset: surge.portal.tileset,
        arena: info.type.realm,
        // The realm is the strike faction's OWN turf — a controlled ambient horde
        // (minus the champion, so the curated one is the only officer), not natives.
        packs: { count: [2, 4], size: [2, 3] },
        rosterTable: (FACTIONS[realmFaction]?.table ?? FACTIONS['demon']?.table ?? []).filter(e => e.id !== champId),
        returnPos: portalPos,
        boss: {
          monsterId: champId, faction: realmFaction,
          levelBonus: surge.portal.champion.levelBonus + stageIdx,
          tag: 'balor_realm',
          garrison: { count: [6, 10], squad: true }, // the demesne guard fights as one warband
          announce: info.lordId ? 'The lord\'s marshal awaits in its master\'s demesne!'
            : 'The Balor awaits in its infernal demesne!',
          announceColor: info.color ?? '#c81e3a',
        },
      },
    };
  }

export function sceneEnterCrusadeSanctum(nativeHost:NativeSceneCampaignFrameClosureHost, crusadeId: string, portalPos: Vec2): void {
    // THE REALM ROADS (shard M1 W4): the plan is the prep; solo keeps the old order.
    const plan = nativeHost.crusadeRealmPlan(crusadeId, portalPos);
    if (!plan) return;
    plan.context!(nativeHost);
    plan.stamp!();
    nativeHost.enterRealmArena(plan.arena);
  }

export function sceneCrusadeRealmPlan(nativeHost:NativeSceneCampaignFrameClosureHost, crusadeId: string, portalPos: Vec2): RealmPlan | null {
    const cf = nativeHost.sim.crusadeField;
    if (!cf) return null;
    const info = cf.crusadeOn(nativeHost.zone.id);
    if (!info || info.crusadeId !== crusadeId) return null; // crusade collapsed / moved — no stale realm
    const surge = cf.surge();
    const faction = cf.factionOf(crusadeId) ?? info.faction;
    const leaderId = nativeHost.sim.warlord.bossId(faction)
      ?? FACTIONS[faction]?.table?.[FACTIONS[faction].table.length - 1]?.id;
    const ctx = { crusadeId, faction, rewardMul: surge.sanctum.rewardMul };
    return {
      context: w => { w.crusadeRealmContext = ctx; },
      stamp: () => cf.markSanctumMinted(crusadeId),
      arena: {
        caveId: `cave_crusade_${crusadeId}`, tileset: surge.sanctum.tileset,
        arena: surge.sanctum.arena,
        // The arena's population is AUTHORED on the sanctum config: null packs +
        // a [0,0] garrison is the true ONE-ON-ONE — the Leader alone on his
        // sand, the crowd's champion-calls his only reinforcement. The roster
        // still feeds the CROWD (faction minus the Leader, the curated boss).
        packs: surge.sanctum.packs,
        rosterTable: (FACTIONS[faction]?.table ?? []).filter(e => e.id !== leaderId),
        returnPos: portalPos,
        boss: {
          monsterId: leaderId, faction, levelBonus: surge.sanctum.levelBonus, bossBump: surge.sanctum.bossBump,
          tag: 'crusade_leader', xpFloor: surge.sanctum.xpFloor,
          garrison: surge.sanctum.garrison,
          announce: '{name} commands the sanctum!', announceColor: '#ffd700',
        },
      },
    };
  }

export function sceneEnterNecropolis(nativeHost:NativeSceneCampaignFrameClosureHost, portalPos: Vec2): void {
    // THE REALM ROADS (shard M1 W4): the plan is the prep; solo keeps the old order.
    const plan = nativeHost.necropolisRealmPlan(portalPos);
    if (!plan) return;
    plan.stamp!();
    plan.context!(nativeHost);
    nativeHost.necropolisPortals.length = 0;
    nativeHost.enterRealmArena(plan.arena);
  }

export function sceneNecropolisRealmPlan(nativeHost:NativeSceneCampaignFrameClosureHost, portalPos: Vec2): RealmPlan | null {
    const df = nativeHost.sim.deadwakeField;
    const n = df?.necropolisInfo();
    if (!df || !n) return null;
    const cfg = df.surge().necropolis;
    const id = `cave_necropolis_${n.id}`; // 'cave_' ⇒ off-graph + cave-return travel
    const ctx = { reward: cfg.reward };
    const faction = df.surge().faction ?? 'undead';
    return {
      context: w => { w.necropolisRealmContext = ctx; },
      stamp: () => df.bindNecropolisZone(id),
      arena: {
        caveId: id, tileset: cfg.tileset,
        arena: cfg.arena,
        packs: null, // boss + garrison placed by hand — no ambient packs
        rosterTable: df.surge().floodRoster,
        returnPos: portalPos,
        boss: {
          pool: cfg.bossPool, faction, levelBonus: cfg.levelBonus, bossBump: cfg.bossBump,
          tag: 'necropolis_boss', xpFloor: cfg.bossXpFloor, far: 440,
          garrison: { count: cfg.garrison, spread: 140 },
          garrisonTable: df.surge().floodRoster,
          announce: '{name} holds the Necropolis!', announceColor: '#e8dcb0',
        },
      },
    };
  }

export function sceneEnterFractureRift(nativeHost:NativeSceneCampaignFrameClosureHost, fr: { id: string; pos: Vec2; faction: string; color: string; variant: string; level: number; cap: FractureCapstone }): void {
    // THE REALM ROADS (shard M1 W4): the plan is the prep; solo keeps the old order.
    const plan = nativeHost.fractureRealmPlan(fr);
    plan.context!(nativeHost);
    plan.stamp!();
    nativeHost.enterRealmArena(plan.arena);
  }

export function sceneFractureRealmPlan(nativeHost:NativeSceneCampaignFrameClosureHost, fr: { id: string; pos: Vec2; faction: string; color: string; variant: string; level: number; cap: FractureCapstone }): RealmPlan {
    const ctx = { variant: fr.variant, faction: fr.faction, color: fr.color, rewardMul: fr.cap.rewardMul };
    return {
      context: w => { w.fractureRealmContext = ctx; },
      stamp: () => bumpLedger(nativeHost.ledger, 'fracture_rifts_entered'),
      arena: {
        caveId: `cave_fracture_${fr.id}`, // unique per rift → a fresh chamber each time
        tileset: fr.cap.tileset,
        arena: fr.cap.arena,
        // Controlled ambient horde (minus the boss id, so the only champion is
        // the curated one) — a fight, not a zerg.
        packs: { count: [2, 4], size: [2, 3] },
        rosterTable: (FACTIONS[fr.faction]?.table ?? []).filter(e => e.id !== fr.cap.boss),
        levelOverride: fr.level + fr.cap.levelBonus, // the chamber out-levels the zone
        returnPos: fr.pos,
        boss: {
          monsterId: fr.cap.boss, faction: fr.faction, tag: 'fracture_boss',
          far: 440, garrison: { count: [5, 9], spread: 120 },
          announce: '{name} awaits in the rift!', announceColor: fr.color,
        },
      },
    };
  }

export function sceneEnterCourtDomain(nativeHost:NativeSceneCampaignFrameClosureHost, e: ActiveEncounter): void {
    // THE REALM ROADS (shard M1 W4): the plan is the prep (a court carries no context).
    const plan = nativeHost.courtRealmPlan(e);
    if (plan) nativeHost.enterRealmArena(plan.arena);
  }

export function sceneCourtRealmPlan(nativeHost:NativeSceneCampaignFrameClosureHost, e: ActiveEncounter): RealmPlan | null {
    const lord = e.lordId ? courtLord(e.lordId) : undefined;
    const door = e.def.court?.door;
    if (!lord || !door || e.phase !== 'door' || !e.doorAt) return null;
    // The court contract: a domain PINS its tileset (package validate()
    // enforces it at QA) — there is no sane ambient fallback for a realm.
    if (!lord.domain.tileset) {
      console.warn(`[courts] lord '${lord.id}' domain pins no tileset — the door is inert`);
      return null;
    }
    const facId = e.def.factions[0] ?? '';
    const table = [
      ...(FACTIONS[facId]?.table ?? []),
      ...lord.roster,
    ].filter(r => r.id !== lord.vessel && !MONSTERS[r.id]?.boss);
    return {
      arena: {
        caveId: `cave_court_${lord.id}_${nativeHost.zone.id}`,
        tileset: lord.domain.tileset,
        arena: lord.domain,
        packs: null,                // the domain's own packs band decides (data)
        rosterTable: table,
        levelOverride: Math.max(1, nativeHost.zone.level + door.levelBonus),
        returnPos: e.doorAt,
        boss: {
          monsterId: lord.vessel, faction: facId, tag: 'court_vessel',
          levelBonus: 0, announce: lord.deeds.manifest, announceColor: lord.color,
        },
      },
    };
  }

export function sceneBeginWraithsailBoarding(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const wf = nativeHost.sim.wraithsailField;
    const run = nativeHost.voyage;
    const ship = wf?.shipInfo();
    if (!wf || !run || !ship || !wf.boardable()) return;
    const cfg = wf.surge();
    wf.onBoarded();
    bumpLedger(nativeHost.ledger, 'wraithsail_boarded');
    nativeHost.wraithsailSeaStash = { run, pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y) };
    // Deck levels price by the interception's radial coord — a far-sea
    // Wraithsail is a deep-water fight, wherever you sailed from.
    const level = Math.max(1, Math.max(nativeHost.zone.level, nativeHost.eventLevel({ x: ship.x, y: ship.y })));
    const base = `cave_${ship.id}`;
    const ids = { deck: `${base}_deck`, hold: `${base}_hold`, cabin: `${base}_cabin` };
    if (!nativeHost.caveMap[ids.deck]) {
      const seed = (nativeHost.manifest.seed ^ hashStr(ship.id)) >>> 0;
      const deck = mintCave(nativeHost.zone, seed, ids.deck, cfg.tileset,
        { layoutParams: { deck: 'weather' }, name: 'The Wraithsail — Weather Deck' });
      const hold = mintCave(deck, (seed ^ 0x5ea) >>> 0, ids.hold, cfg.tileset,
        { layoutParams: { deck: 'hold', coffers: cfg.cofferBand }, name: 'The Wraithsail — Hold' });
      const cabin = mintCave(hold, (seed ^ 0xcab) >>> 0, ids.cabin, cfg.tileset,
        { layoutParams: { deck: 'cabin' }, name: 'The Wraithsail — Great Cabin' });
      deck.level = level;
      hold.level = level + 1;
      cabin.level = level + 2;
      // The chain: each rung's south exit is the way back, the north exit
      // presses deeper. The cabin's boss objective seals nothing extra (its
      // one exit is the one you entered) — you may always flee the Regent.
      deck.exits = [{ to: VOYAGE_ZONE_ID, side: 's' }, { to: ids.hold, side: 'n' }];
      hold.exits = [{ to: ids.deck, side: 's' }, { to: ids.cabin, side: 'n' }];
      cabin.exits = [{ to: ids.hold, side: 's' }];
      cabin.objective = { kind: 'boss', id: cfg.regentId, levelBonus: 1, promote: { rarity: 'crowned' } };
      nativeHost.caveMap[ids.deck] = deck;
      nativeHost.caveMap[ids.hold] = hold;
      nativeHost.caveMap[ids.cabin] = cabin;
    }
    nativeHost.caveReturn = { zoneId: nativeHost.zone.id, pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), entryFrom: nativeHost.entryFrom };
    nativeHost.loadZone(ids.deck, nativeHost.zone.id); // deliberately NO onNodeCharted — her decks are off-graph
    nativeHost.notice('you come alongside and board the WRAITHSAIL — her crew keeps the old courtesies', '#7ad8d8', 17, 'events');
    nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 150, color: cfg.color, life: 0.8, maxLife: 0.8 });
  }

export function sceneResumeMassSurface(nativeHost:NativeSceneLegacyMassHost, wake = false): void {
    const away = nativeHost.massAway;
    if (!away) return;
    const ret = nativeHost.caveStack[0] ?? nativeHost.caveReturn;
    nativeHost.massAway = null;
    nativeHost.startWorldMass(away.surface.state.run.seed, away.surface, { restoreOnly: true });
    nativeHost.caveReturn = null; nativeHost.caveStack = [];
    if (wake) nativeHost.wakeMassRuntime(nativeHost.massRuntime!);
    else if (ret) {
      const indoors = !!(ret.kind && sidezoneOf(ret.kind)?.indoorsOnly), raised = (ret.tier ?? 0) > 0;
      nativeHost.landPartyAt(vec(ret.pos.x, ret.pos.y),
        { spread: indoors || raised ? 25 : 50, band: [0, indoors || raised ? 25 : 50], tier: ret.tier ?? 0 });
    }
    nativeHost.caveExitGrace = true;
    // Preserve the native synchronous return when no page I/O is required.
    // The exit pose is already final before any surface-neighborhood read.
    nativeHost.nativeWorldReady();
  }

export function sceneLandPartyAt(nativeHost:NativeSceneCampaignFrameClosureHost, at: Vec2, opts?: {
    spread?: number; band?: readonly [number, number]; clamp?: boolean;
    /** THE LANDING'S STORY (the arrivalStory law, engine/tiers.ts): a party
     *  landing seats every body on the GROUND story unless the caller names
     *  one — only the cave climb-out and the far span crossing land ON a
     *  story-seated mouth, and they pass its recorded story here. */
    tier?: number;
  }): void { return harborLandPartyAt(nativeHost.nativeSceneHarborHost(),at,opts); }

export function sceneTownPortalViews(nativeHost:NativeSceneCampaignFrameClosureHost): TownPortalView[] {
    if (nativeHost.townPortalClientViews) return nativeHost.townPortalClientViews;
    return nativeHost.townPortals.flatMap(p => {
      const source = p.origin.cave?.zoneId ?? p.origin.zoneId;
      const visible = p.returning ? nativeHost.zone.id === p.destination : nativeHost.zone.id === source;
      const pos = p.returning ? p.destinationPos : p.sourcePos;
      if (!visible || !pos) return [];
      const target = p.returning ? source : p.destination;
      return [{ pos, tier: p.returning ? 0 : p.originTier, owner: p.owner,
        cosmeticLoadout: cosmeticPortalLoadout(nativeHost, p.owner),
        label: `${p.returning ? 'Return to' : 'Travel to'} ${(nativeHost.zoneMap[target] ?? nativeHost.caveMap[target])?.name ?? 'your expedition'}`,
        frac: Math.min(1, (nativeHost.townPortalDwell.get(p.owner) ?? 0) / TOWN_PORTAL_CFG.dwellSeconds) }];
    });
  }

export function sceneResumeSpawn(nativeHost:NativeSceneCampaignFrameClosureHost, policy: ResumeSpawn, spot: SavedPlayerSpot | undefined | null, from?: string): void {
    const exact = policy === 'exact' && spot && nativeHost.zoneMap[spot.zoneId]
      && Number.isFinite(spot.x) && Number.isFinite(spot.y) ? spot : null;
    if (!exact) { nativeHost.loadZone(START_ZONE); return; }
    const savedEntryFrom = typeof exact.entryFrom === 'string' ? exact.entryFrom : undefined;
    nativeHost.loadZone(exact.zoneId, from ?? savedEntryFrom);
    // THE UNDERGROUND LADDER — descend strictly AFTER the anchor load: any
    // surface load nulls caveReturn and empties caveStack by law, so the
    // ladder must stand up on top of the loaded anchor, never before it.
    // A wake whose ladder can't stand (absent, corrupt, no longer mintable)
    // lands at the anchor — today's mouth wake.
    const below = nativeHost.resumeCaveLadder(exact);
    // Stand the party at the saved spot (loadZone placed them at the entry
    // portal): the hero exactly there, allies + carried minions in a loose
    // ring (THE PARTY-LANDING LAW — this wake was its reference idiom).
    const p = nativeHost.player;
    // A newly expanded town has moved its buildings. Keep the safe arrival
    // chosen by loadZone instead of placing an old coordinate inside a new wall.
    nativeHost.landPartyAt(below ?? (exact.zoneId === START_ZONE && nativeHost.townLayoutChangedOnLoad
      ? { ...p.pos } : vec(exact.x, exact.y)), { spread: 80, band: [-80, 80],
        ...(nativeHost.massRuntime ? { tier: nativeHost.massRuntime.resumeTier } : {}) });
    // Vitals: proportional restore with a reaction floor — an exact wake is
    // honest about how hurt you were, not a free refill.
    const v = exact.vitals;
    if (v) {
      const floor = WORLDSTATE_CFG.exactVitalsFloor;
      const frac = (f: number | undefined): number => clamp(Math.max(floor, f ?? 1), 0, 1);
      p.life = Math.max(1, p.maxLife() * frac(v.life));
      p.mana = p.maxMana() * frac(v.mana);
      p.es = p.maxEs() * frac(v.es);
    }
  }

export function sceneApplyActionAs(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, action: MetaAction): void {
    switch (action.t) {
      case 'townPortal': nativeHost.castTownPortal(seat); break;
      case 'learn': nativeHost.learnSkill(action.uid, seat, action.slot, action.emptyOnly); break;
      case 'unlearn': nativeHost.unlearnSkill(action.skillId, seat, action.x, action.y); break;
      case 'attuneSpectre': nativeHost.attuneSpectre(action.skillId, action.formId, seat); break;
      case 'mimicSelect': nativeHost.mimicSelectFor(action.sid, seat); break;
      case 'pickTreeNode': nativeHost.pickTreeNode(action.skillId, action.nodeId, seat); break;
      case 'untameCompanion': nativeHost.releaseCompanion(action.actorId, seat); break;
      case 'companionStance': nativeHost.cycleCompanionStance(seat, action.skillId, action.stance); break;
      case 'ping': nativeHost.placePing(seat, action.x, action.y); break;
      case 'fontMerge': nativeHost.fontMergeSkill(action.skillId, action.rarity, seat); break;
      case 'fontConvert': nativeHost.fontConvertEssence(action.tier, action.dir, seat); break;
      case 'fontReset': nativeHost.fontResetTree(action.skillId, seat); break;
      case 'buyAbilityEss': nativeHost.buyAbilityEssence(action.vendor, action.tier, seat); break;
      case 'buyVendor': nativeHost.buyVendorGem(action.index, seat); break;
      case 'buyChandler': nativeHost.buyChandlerGem(action.index, seat); break;
      case 'buyDelver': nativeHost.buyDelverGem(action.index, seat); break;
      case 'vendorLock': nativeHost.setVendorLock(action.vendor, action.index, action.on, seat); break;
      case 'vendorCommission': nativeHost.setVendorCommission(action.vendor, action.gem, seat); break;
      case 'levelSkill': nativeHost.levelUpSkill(action.skillId, seat); break;
      case 'levelSupportInv': {
        // THE RESIDENCE: a loose support levels through its wrapper item —
        // unwrap, feed, fold the new level back into the payload.
        const item = nativeHost.bagItem(seat, action.uid);
        const gem = item ? supportOfGemItem(item) : null;
        if (item && gem) {
          nativeHost.levelUpSupport(gem, seat);
          writeBackSupportGem(item, gem);
        }
        break;
      }
      case 'levelSupportSocket': {
        const inst = seat.meta.knownSkills.get(action.skillId);
        const gem = inst?.sockets[action.socket];
        if (gem) {
          nativeHost.levelUpSupport(gem, seat);
          // Forwarded copies bake the carrier's level — re-mint so bodies
          // already on the field feel the level-up too.
          if (inst) nativeHost.resyncMinionSupports(inst);
        }
        break;
      }
      case 'reacquireSkill': nativeHost.reacquireSkill(action.skillId, seat); break;
      case 'socket': nativeHost.socketSupport(action.uid, action.skillId, seat); break;
      case 'unsocket': nativeHost.unsocketSupport(action.skillId, action.socket, seat); break;
      case 'unsocketBagSkill': nativeHost.unsocketBagSkill(action.uid, action.socket, seat); break;
      case 'allocate': nativeHost.allocateNode(action.nodeId, seat, action.optionId); break;
      case 'refundPassive': nativeHost.refundPassiveNode(action.nodeId, seat); break;
      case 'bindGraft': nativeHost.bindGraft(action.key, action.skillId, seat); break;
      case 'bindSkill': nativeHost.bindSkill(action.slot, action.skillId, seat); break;
      case 'swapSkillSlots': nativeHost.swapSkillSlots(action.a, action.b, seat); break;
      case 'recallMemory': nativeHost.recallMemory(seat, action.uid, action.dropper, action.facet); break;
      case 'caravanTo': nativeHost.startCaravan(action.band, seat); break;
      case 'waypoint': nativeHost.travelToWaypoint(action.zoneId, seat); break; // THE ROADS PER PLAYER (shard M1 W2)
      case 'harborChart': nativeHost.buyHarborChart(action.omen, seat); break;
      case 'bountyAccept': nativeHost.acceptBounty(action.id, seat); break;
      case 'bountyAbandon': nativeHost.abandonBounty(action.id, seat); break;
      case 'bountyTurnIn': nativeHost.turnInBounty(action.id, seat); break;
      case 'bountyLock': nativeHost.setBountyLock(action.id, action.locked, seat); break;
      case 'forgeBegin': nativeHost.forgeBegin(action.writUid, action.baseId, action.pad, seat); break;
      case 'forgeCancel': nativeHost.forgeCancel(seat); break;
      case 'bountyCoastWrits':
        // The quay panel's Coast Writs button — the standing writ grammar,
        // self-guarded (cooldown + open hold + eligible quarry).
        if (nativeHost.bountyBoardsHere().some(b => b.id !== BOUNTY_BOARD_CFG.boardId
          && (!nativeHost.localSeat.keeper || nativeHost.nearBountyBoard(seat, b.id)))) nativeHost.postHoldWrits(); // THE BOARD PER SEAT: the quay's writs post from its board
        break;
      case 'holdMuster': if (nativeHost.nearMusterHorn(seat)) nativeHost.beginHoldMuster(); break; // THE ACTING SEAT: the horn sounds only for a hand on it
      case 'holdRestore': nativeHost.buyHoldRestore(seat); break;
      case 'payToll': nativeHost.payHoldfastToll(action.index, seat); break;
      case 'questAccept': nativeHost.acceptQuestOffer(action.questId, seat); break;
      case 'vocationQuest': nativeHost.acceptVocationQuest(action.questId, seat); break;
      case 'questReward': nativeHost.claimQuestReward(action.questId, action.choiceId, seat); break;
      case 'questImbue': nativeHost.claimQuestImbue(action.questId, action.uid, action.affixId, seat); break;
      case 'equipItem': nativeHost.equipItem(seat, action.uid, action.slot); break;
      case 'unequipItem': nativeHost.unequipItem(seat, action.slot, action.x, action.y); break;
      case 'moveItem': nativeHost.moveBagItem(seat, action.uid, action.x, action.y); break;
      case 'sortBag': nativeHost.sortBag(seat, action.mode, action.dir); break;
      case 'dropItem': nativeHost.dropGearFromBag(seat, action.uid); break;
      case 'oracleRelic': nativeHost.oracleRelic(seat, action.uid, action.operation); break;
      case 'reliquaryToggle': nativeHost.reliquaryToggle(seat, action.enabled); break;
      case 'withdrawRelic': nativeHost.withdrawRelic(seat, action.uid, action.x, action.y); break;
      case 'relicStashMove': nativeHost.relicStashMove(seat, action.uid, action); break;
      case 'personalStash': nativeHost.personalStash(seat, action.uid, action.operation, action.x, action.y); break;
      case 'oracleAttune': nativeHost.oracleAttune(seat); break;
      case 'containerPlace': nativeHost.containerPlace(seat, action.container, action.uid, action.x, action.y); break;
      case 'containerTake': nativeHost.containerTake(seat, action.container, action.uid, action.x, action.y); break;
      case 'containerMove': nativeHost.containerMove(seat, action.container, action.uid, action.x, action.y); break;
      case 'pickupItem':
        // THE HARVEST CONSENT (engine/harvest.ts): the interact verb is
        // contextual — mid-rite the press is the rite's silence (the input
        // law's meta face); at an offered node it BEGINS the rite; only
        // otherwise does it stay the gear grab.
        // THE RELEASE (card 28, THE PARTY THAT READS): on a hosted world a downed
        // seat's interact press gives up the wait (the player's own choice), never
        // a grab from the floor; the shard's desk judges it (a shell only forwards).
        if (seat.actor.downed && nativeHost.partyRows !== null) { nativeHost.partyDowns?.release(seat.id); break; }
        if (nativeHost.harvestSessions.some(s => s.seatId === seat.id)) break;
        if (nativeHost.harvestConsent(seat)) break;
        nativeHost.pickupNearestGear(seat);
        break;
      case 'salvageItem': nativeHost.salvageItem(seat, action.uid, action.lane); break;
      case 'salvageBulk': nativeHost.salvageBulk(seat, action.cat, action.rarity, action.lane); break;
      case 'salvageLock': nativeHost.salvageLockSet(seat, action.uid, action.on); break;
      case 'craftAffix': nativeHost.craftAffix(seat, action.uid, action.affixId, action.score ?? 0); break;
      case 'rerollAffix': nativeHost.rerollAffix(seat, action.uid, action.affix, action.score); break;
      case 'socketVestige': nativeHost.socketVestige(seat, action.uid, action.socket, action.vestigeId); break;
      case 'craftSocket': nativeHost.craftSocket(seat, action.uid); break;
      case 'armFolkItem': nativeHost.armFolkWithItem(action.folkId, action.uid, seat); break;
      case 'armFolkEssence': nativeHost.armFolkWithEssence(action.folkId, action.essence, seat); break;
    }
    // Whatever changed, re-replicate this seat's meta to its owner client.
    nativeHost.markMetaDirty(seat);
    if (nativeHost.localSeat.keeper) nativeHost.journalDirty.add(seat.id); // THE JOURNAL ROW: an act may move its quests and boards
  }

export function sceneAllQuestHands(nativeHost:NativeSceneCampaignFrameClosureHost): Seat[] {
    if (!nativeHost.localSeat.keeper) return [nativeHost.localSeat];
    const out: Seat[] = [];
    for (const w of nativeHost.presentWorlds()) for (const s of w.seats) if (!s.keeper && !s.merc && !out.includes(s)) out.push(s);
    return out;
  }

export function sceneQuestLedgerOf(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): QuestLedger {
    if (!nativeHost.localSeat?.keeper || seat.keeper || seat.merc) return nativeHost.ownQuestLedger;
    const mine = nativeHost.seatQuests.get(seat.id);
    if (mine) return mine;
    let home: Pick<World,'seatQuests'> = nativeHost;
    for (const w of nativeHost.presentWorlds()) {
      const there = w.seatQuests.get(seat.id);
      if (there) return there;
      if (w.seats.includes(seat)) home = w;
    }
    const fresh = newQuestLedger();
    home.seatQuests.set(seat.id, fresh);
    return fresh;
  }

export function sceneDimensionCrossing(nativeHost:NativeSceneCampaignFrameClosureHost, dimId: string, level: number, outermost: { zoneId: string } | null | undefined): { id: string; color: string } | null {
    const dim = dimensionDef(dimId);
    const gateSpec = dim.entry?.gate;
    if (!gateSpec) {
      console.warn(`[world] enterDimension('${dimId}') — no DimensionDef.entry.gate declared`);
      return null;
    }
    nativeHost.discoveredDimensions.add(dim.id);
    const gateId = gateSpec.id;
    if (!nativeHost.zoneMap[gateId]) {
      // Anchor the gate's node where the SURFACE chain began. The ladder's
      // FIRST record holds the surface zone (later records hold cave ids,
      // which never resolve in zoneMap — the old lookup silently anchored
      // everything on the town).
      const originId = outermost?.zoneId ?? START_ZONE;
      const surfaceAnchor = nativeHost.zoneMap[originId] ?? nativeHost.zoneMap[START_ZONE];
      // A ROADLESS dimension (DimensionEntry.road: false — the Aetherial)
      // mints its gate with NO cross-edge in either direction: the realm is
      // reached by its own mechanism alone. A roaded gate (the Hellgate)
      // keeps the classic crossDim back-edge — THE one sanctioned crossing.
      const roadless = dim.entry?.road === false;
      // The gate's tileset resolves from its declared biome THROUGH THE
      // DIMENSION'S OWN POOL (TilesetDef.realm) — realm-locked faces like the
      // sanctum are invisible to surface picks by design. A miss here is an
      // authoring hole (validateDimensions asserts it at boot); degrade
      // LOUDLY, never silently into hell's face (the wasteland-Firmament).
      const gateTileset = pickTilesetForBiome(gateSpec.biome,
        new Rng((nativeHost.manifest.seed ^ gateSpec.seedSalt) >>> 0), undefined, dim.id);
      if (!gateTileset) {
        console.warn(`[world] enterDimension('${dim.id}'): gate biome '${gateSpec.biome}' resolves NO tileset (surface or realm pool) — falling back to 'wasteland'`);
      }
      const gen = placeZoneAt(surfaceAnchor.map, surfaceAnchor, nativeHost.zoneMap, nativeHost.nextGenId++, {
        id: gateId,
        tileset: gateTileset ?? 'wasteland',
        biomeFor: nativeHost.dimensionBiomeFor(dim.id),
        levelFor: nativeHost.levelFor,
        level: Math.max(nativeHost.zone.level + (dim.levelBonus ?? 0), level),
        seed: (nativeHost.manifest.seed ^ gateSpec.seedSalt) >>> 0,
        name: gateSpec.name,
        // The anchor: once attuned, the dimension is a map-travel away —
        // UNLESS the dimension swears off waypoints entirely (the Aetherial:
        // heaven with a shortcut is just a lobby; you cross every time).
        forceWaypoint: dim.waypoints !== false,
        dimension: dim.id,
        objective: { kind: 'clear' }, // arrivals carry no entryFrom — never gated
        // A realm HUB fans wide: the gate is where the dimension's own web
        // grows from, so it opens GATE_FANOUT ways instead of the frontier
        // 1-2 — the SAME constant the roadless-hub load heal trims back to.
        forceFrontiers: GATE_FANOUT,
        ...(roadless ? { noBackEdge: true } : { gateCross: true }),
      });
      // No onNodeCharted: gate zones sit outside every overlay's ledgers.
      nativeHost.zoneMap[gateId] = gen;
    }
    return { id: gateId, color: dim.color };
  }

export function sceneShardDimensionRoad(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, dimId: string): RoadTicket<NativeAreaRoadDestination> | null {
    const ladder = nativeHost.seatLadderOf(seat);
    const gate = nativeHost.dimensionCrossing(dimId, nativeHost.seatHero(seat).level, ladder.caveStack[0] ?? ladder.caveReturn);
    if (!gate) return null;
    return { seatId: seat.id, dest: gate.id, from: null, landing: 'entry', ladder: { caveReturn: null, caveStack: [] },
      onFirstWake: w => w.notice('the world tears open…', gate.color, 15, 'events') };
  }

export function sceneEnterRealmArena(nativeHost:NativeSceneCampaignFrameClosureHost, o: RealmArenaArgs): void {
    nativeHost.realmArenaMint(o);
    nativeHost.caveReturn = { zoneId: nativeHost.zone.id, pos: vec(o.returnPos.x, o.returnPos.y), entryFrom: nativeHost.entryFrom };
    nativeHost.loadZone(o.caveId, nativeHost.zone.id); // deliberately NO onNodeCharted — realms are off-graph
    nativeHost.realmArenaWake(o);
  }

export function sceneRealmArenaMint(nativeHost:NativeSceneCampaignFrameClosureHost, o: RealmArenaArgs): void {
    const a = o.arena;
    if (!nativeHost.caveMap[o.caveId]) {
      const opts = a && (a.layoutType !== undefined || a.layoutParams !== undefined || a.name !== undefined
        || a.variant !== undefined || a.rollVariant)
        ? { layoutType: a.layoutType, layoutParams: a.layoutParams, name: a.name,
            variant: a.variant, rollVariant: a.rollVariant } : undefined;
      const realm = mintCave(nativeHost.zone, (nativeHost.manifest.seed ^ hashStr(o.caveId)) >>> 0, o.caveId,
        a?.tileset ?? o.tileset, opts);
      // OWNED GROUND, underground too: an event's realm arena is its own
      // stage — ambient cave systems (the Descent's Delver, any future
      // cave-side roll) read the same classifier the overworld contract uses
      // and stay out (no per-system allowlist to maintain).
      realm.eventOwned = true;
      if (o.levelOverride !== undefined) realm.level = Math.max(1, o.levelOverride);
      const band = a?.packs ?? o.packs;
      realm.packs = band
        ? { count: band.count, size: band.size, table: o.rosterTable }
        : { count: [0, 0], size: [0, 0], table: o.rosterTable };
      if (a?.tenancy) realm.tenancy = a.tenancy; // TENANCY (card 25): the pocket remembers its spec's word
      nativeHost.caveMap[o.caveId] = realm;
    }
  }

export function sceneStartWorldMass(nativeHost:NativeSceneLegacyMassHost, seed = rollSeed(), save?: MassAdventureSave | MassResidentResume,
    options?: { restoreOnly?: boolean }): void {
    nativeHost.massAway = null;
    if (!save) { nativeHost.massSideareaRoots.clear(); nativeHost.massCaveIds.clear(); }
    const definition = save && ('definition' in save ? save.definition : save);
    const runtime = new WorldMassRuntime(seed, 'expedition:' + seed, definition?.config, save);
    nativeHost.massRuntime?.dispose();
    nativeHost.massRuntime = null;
    try { nativeHost.attachMassRuntime(runtime, save, options); }
    catch (error) {
      runtime.dispose();
      if (nativeHost.massRuntime === runtime) nativeHost.massRuntime = null;
      throw error;
    }
    if (!runtime.settlement) { nativeHost.grounds = []; nativeHost.bridges = []; }
  }

export function sceneResumeCaveLadder(nativeHost:NativeSceneCampaignFrameClosureHost, spot: SavedPlayerSpot): Vec2 | null {
    const cave = spot.cave;
    if (!cave) return null;
    const bad = (why: string): null => {
      console.warn(`[world] resume: saved cave ladder unusable — waking at the mouth (${why})`);
      return null;
    };
    const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    if (typeof cave !== 'object' || typeof cave.zoneId !== 'string'
      || !cave.zoneId.startsWith('cave_') || !fin(cave.x) || !fin(cave.y)) {
      return bad('malformed spot');
    }
    const rungs = cave.rungs;
    if (!Array.isArray(rungs) || rungs.length < 1 || rungs.length > WORLDSTATE_CFG.caveRungCap) {
      return bad('malformed rung list');
    }
    if (rungs[0]?.zoneId !== spot.zoneId) return bad('ladder does not hang off the anchor');
    for (let i = 0; i < rungs.length; i++) {
      const r = rungs[i];
      if (!r || typeof r !== 'object' || typeof r.zoneId !== 'string'
        || !fin(r.x) || !fin(r.y) || !fin(r.seed)
        || typeof r.kind !== 'string' || sidezoneOf(r.kind) === undefined
        || (r.entryFrom !== undefined && typeof r.entryFrom !== 'string')
        || (r.underSpan !== undefined && typeof r.underSpan !== 'string')
        || (r.tier !== undefined && !fin(r.tier))) {
        return bad(`rung ${i} malformed or its kind unregistered`);
      }
      // THE CHAIN LAW: this rung's mouth must re-derive EXACTLY the pocket id
      // the next rung (or the saved spot itself) claims — same mouth, same
      // pocket, or the ladder no longer describes this world and stands down.
      // (A span rung derives the span-keyed pocket — the same one derivation.)
      const derived = nativeHost.sidezoneIdFor(r.zoneId, r.kind, r.seed, r.underSpan);
      const expect = i + 1 < rungs.length ? rungs[i + 1].zoneId : cave.zoneId;
      if (derived !== expect) return bad(`rung ${i} derives '${derived}', save claims '${expect}'`);
    }
    try {
      for (const r of rungs) {
        if (nativeHost.zone.id !== r.zoneId) {
          throw new Error(`ladder desync: standing in '${nativeHost.zone.id}', rung expects '${r.zoneId}'`);
        }
        const sz = sidezoneOf(r.kind)!;
        const dest = nativeHost.mintSidezone({ pos: vec(r.x, r.y), seed: r.seed, kind: r.kind, underSpan: r.underSpan });
        if (!dest) throw new Error(`rung '${r.kind}' under '${r.zoneId}' would not mint`);
        nativeHost.applySidezoneFurnish(dest, sz);
        if (sz.levelWith === 'character') dest.level = Math.max(1, nativeHost.player.level);
        if (nativeHost.caveReturn) nativeHost.caveStack.push(nativeHost.caveReturn);
        // The rung's STORY rides the rebuild (the arrivalStory law), so a
        // post-resume climb-out still lands IN the gallery at the door.
        nativeHost.caveReturn = {
          zoneId: r.zoneId, pos: vec(r.x, r.y),
          entryFrom: r.entryFrom ?? null, kind: r.kind, seed: r.seed,
          ...(r.underSpan ? { underSpan: r.underSpan } : {}),
          ...(r.tier ? { tier: r.tier } : {}),
        };
        nativeHost.loadZone(dest.id, r.zoneId); // off-graph — no onNodeCharted, same as the live descent
      }
      return vec(cave.x, cave.y);
    } catch (err) {
      // LOUD, then clean (the persistence doctrine — a broken resume path is
      // never silent): reload the anchor, whose surface load unwinds whatever
      // half-ladder stood up, so the fallback is exactly the mouth wake.
      console.error('[world] resume: saved cave ladder failed to stand — waking at the mouth', err);
      nativeHost.loadZone(spot.zoneId);
      return null;
    }
  }

export function sceneCastTownPortal(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    const reason = nativeHost.townPortalRefusal(seat);
    // THE ACTING SEAT (shard M1 W2, the intent re-opened): the refusal is the asking seat's own line.
    if (reason) { nativeHost.seatNote(seat, seat.actor.pos, reason, TOWN_PORTAL_CFG.color, 13); return false; }
    if (seat.actor.casting) return false;
    return nativeHost.useSkill(seat.actor, makeSkillGem(SKILLS[TOWN_PORTAL_CFG.skillId], 1, 'common'), seat.actor.pos, true);
  }

export function sceneLearnSkill(nativeHost:NativeSceneCampaignFrameClosureHost, uid: number, seat: Seat = nativeHost.localSeat, slot?: number, emptyOnly = false): boolean {
    const m = seat.meta;
    const p = nativeHost.seatHero(seat);
    const item = nativeHost.bagItem(seat, uid);
    if (!item || item.gem?.kind !== 'skill') return false;
    const skillId = item.gem.skillId;
    // THE ONE-COPY LAW: a known copy DEPARTS instead of refusing the learn.
    const knownCopy = m.knownSkills.get(skillId) ?? null;
    const inst = skillOfGemItem(item);
    if (!inst) return false;
    if (!nativeHost.meetsRequirements(inst.def.id, seat)) {
      nativeHost.failNote(p, 'learn:' + uid, 'requirements unmet');
      return false;
    }
    // Unnamed seat: the upgrade lands where the skill LIVES; a fresh skill
    // (or a known copy standing off the bar) takes the first free seat.
    const knownSeat = knownCopy ? p.skills.findIndex(s => s?.def.id === skillId) : -1;
    const at = slot ?? (knownSeat >= 0 ? knownSeat : p.skills.findIndex(s => s === null));
    if (at < 0 || at >= p.skills.length) {
      if (slot === undefined) { nativeHost.failNote(p, 'learn:' + uid, 'every seat is taken'); }
      return false;
    }
    const sitter = p.skills[at];
    // A suggested empty seat is a narrower intent than an aimed replacement.
    // Recheck live occupancy and identity: stale cards must never swap a build.
    if (emptyOnly && (sitter || knownCopy || p.dead || p.downed)) return false;
    // THE STRUCTURAL CAP: seats ARE the count — a REPLACE onto an occupied
    // seat never grows it, and a departing known copy hands its count to
    // the newcomer, so only a fresh seat for a fresh skill meets the belt.
    if (!sitter && !knownCopy && m.knownSkills.size >= MAX_LEARNED_SKILLS) {
      nativeHost.failNote(p, 'learn:' + uid, 'every seat is taken');
      return false;
    }
    // THE DEPARTING: the sitter under the drop and the known copy — ONE body
    // when the drop lands on the copy's own seat, TWO when another skill
    // sits there (that sitter is replaced AND the copy retires: the replace
    // and the one-copy law composed, each reading as itself).
    const departing: SkillInstance[] = [];
    if (sitter) departing.push(sitter);
    if (knownCopy && knownCopy.def.id !== sitter?.def.id) departing.push(knownCopy);
    // THE PRE-FLIGHT: every departing body's own refusal (debt, discipline)
    // reads BEFORE anything moves — the refuse-before-mutating law at swap
    // grain, in the unlearn's exact words.
    for (const d of departing) {
      const r = nativeHost.unlearnRefusal(d, seat);
      if (r) { nativeHost.failNote(p, d.def.id + ':' + r.key, r.why); return false; }
    }
    // Pull the incoming tile out first so the first wrapper is guaranteed
    // its cell (1×1 into the freed 1×1); a second body needs a second cell
    // — counted before either unwinds, so a full bag refuses the WHOLE swap
    // with the tile re-seated exactly where it was.
    const ox = item.x, oy = item.y;
    removeFromBag(m.items, uid);
    const reseat = (): void => {
      if (ox !== undefined && oy !== undefined) placeAt(m.items, item, ox, oy);
      else autoPlace(m.items, item);
    };
    if (freeCellCount(m.items) < departing.length) {
      reseat();
      nativeHost.failNote(p, 'learn:' + uid, 'no room in the bag');
      return false;
    }
    for (const d of departing) {
      // Belt: the pre-flight read every gate the unlearn reads, so a refusal
      // here cannot happen — a refused unlearn still re-seats the tile.
      if (!nativeHost.unlearnSkill(d.def.id, seat)) { reseat(); return false; }
    }
    m.knownSkills.set(inst.def.id, inst);
    p.skills[at] = inst;
    // Worn slot grafts re-derive against the new sitter (bindSkill's law).
    nativeHost.rebindWornGrafts(seat, [inst]);
    // A REMEMBERED BOND answers the relearning: companions stashed when
    // this skill was unlearned return DOWNED at the keeper's side — the
    // revival is owed, the exploit stays closed, the pet stays yours.
    const stashed = nativeHost.stashedCompanions.filter(s => s.skillId === inst.def.id);
    if (stashed.length) {
      nativeHost.stashedCompanions = nativeHost.stashedCompanions.filter(s => s.skillId !== inst.def.id);
      nativeHost.restoreCompanions(stashed.map(s => ({ ...s, downed: true })), seat.actor);
    }
    nativeHost.markMetaDirty(seat);
    return true;
  }

export function sceneUnlearnSkill(nativeHost:NativeSceneCampaignFrameClosureHost, skillId: string, seat: Seat = nativeHost.localSeat, x?: number, y?: number): boolean {
    const m = seat.meta;
    const p = seat.actor;
    const inst = m.knownSkills.get(skillId);
    if (!inst) {
      // A GRANTED skill is worn, not owned: there is no gem to mint back.
      if (seat.grantedInsts?.has(skillId)) {
        nativeHost.failNote(p, skillId + ':granted', 'granted by your gear — take the piece off instead');
      }
      return false;
    }
    // THE GATES (unlearnRefusal — debt, then discipline): refuse before
    // mutating, in the one voice the swap pre-flight reads too.
    {
      const r = nativeHost.unlearnRefusal(inst, seat);
      if (r) { nativeHost.failNote(p, skillId + ':' + r.key, r.why); return false; }
    }
    // THE ROOM LAW: the wrapper must land before anything unwinds — grafts
    // are stripped at PACK time below, so build the item from a graftless
    // read (grafts are derived state; recalcSeat rebuilds them anyway).
    inst.grafts = undefined;
    const item = makeSkillGemItem(inst);
    const placed = (x !== undefined && y !== undefined)
      ? placeAt(m.items, item, x, y)
      : autoPlace(m.items, item);
    if (!placed) {
      nativeHost.failNote(p, skillId + ':bagfull',
        x !== undefined ? 'no room there' : 'no room in the bag');
      return false;
    }
    nativeHost.rememberSkillSlots(seat, [inst]);
    if (inst.def.tags.includes('flask')) nativeHost.clearTreeFields(p, inst);
    m.knownSkills.delete(skillId);
    for (let i = 0; i < p.skills.length; i++) {
      if (p.skills[i]?.def.id === skillId) p.skills[i] = null;
    }
    if (p.activeAuras.has(skillId)) nativeHost.deactivateAura(p, skillId);
    // A toggled summon contract dies with the skill that priced it — an
    // unlearned skill must never keep an army running with no off-switch.
    if (p.summonToggles.has(skillId)) nativeHost.dismissSummonToggle(p, skillId);
    // THE BOND DOES NOT LAUNDER: unlearning a companion skill kills its
    // tamed outright — no banking a living pet while the slot serves
    // another gem. The bond is REMEMBERED (stash): relearn the same skill
    // and the companion returns DOWNED, owed its revival.
    for (const c of nativeHost.companionsOfSkill(p, skillId)) {
      if (c.defId) nativeHost.stashedCompanions.push(nativeHost.companionBonds.saved(c));
      nativeHost.showCompanionCue(c, 'sever', p);
      c.companion = false; // past the down-intercept: this death is real
      nativeHost.kill(c, true);
    }
    nativeHost.markMetaDirty(seat);
    // MIREILLE'S LESSON, inverted with intent: nobody walks a gift flask
    // BACK to the bag without commanding the whole loop the lesson teaches.
    // The lesson counts LIVED — the player's choice to unlearn must never
    // re-light a glow or re-open her directions as unfinished business.
    if (seat === nativeHost.localSeat && MIREILLE_GIFT_SKILLS.includes(skillId)) {
      nativeHost.mireilleStampLived();
    }
    return true;
  }

export function sceneAttuneSpectre(nativeHost:NativeSceneCampaignFrameClosureHost, skillId: string, formId: string, seat: Seat = nativeHost.localSeat): void {
    const inst = seat.meta.knownSkills.get(skillId);
    const d = inst?.def.delivery;
    if (!inst || d?.type !== 'summon' || !d.grimoire) return;
    // THE BINDING SITE (BESTIARY_CFG.attuneAtBook): grimoire work — binding
    // AND releasing — happens at the Tracker's open book. In the field you
    // fight with the form you carried out; the walk back to town is the
    // price of a swap. Enforced HERE, not in the UI, so an untrusted co-op
    // client's intent meets the same wall as a console poke.
    if (BESTIARY_CFG.attuneAtBook && !nativeHost.nearTracker(seat)) {
      nativeHost.text(vec(seat.actor.pos.x, seat.actor.pos.y - 20),
        "the grimoire binds only at the Tracker's book", '#8a8678', 11);
      return;
    }
    if (formId === '') {
      inst.attunedForm = undefined;
      nativeHost.charDirty = true;
      nativeHost.text(vec(seat.actor.pos.x, seat.actor.pos.y - 20), 'attunement released', '#8a8678', 11);
      return;
    }
    const def = MONSTERS[formId];
    if (!bestiaryEligible(def) || !spectreAttunable(nativeHost.account, def)) return;
    inst.attunedForm = formId;
    nativeHost.charDirty = true;
    nativeHost.text(vec(seat.actor.pos.x, seat.actor.pos.y - 20),
      `attuned: ${def.name}`, '#a8d8a0', 12);
  }

export function sceneMimicSelectFor(nativeHost:NativeSceneCampaignFrameClosureHost, sid: string, seat: Seat = nativeHost.localSeat): void {
    mimicSelect(seat.actor, nativeHost.time, sid);
  }

export function scenePickTreeNode(nativeHost:NativeSceneCampaignFrameClosureHost, skillId: string, nodeId: string, seat: Seat = nativeHost.localSeat): void {
    // A granted skill's picks ride its item's residence (the recalc below writes them back).
    const inst = seat.meta.knownSkills.get(skillId) ?? seat.grantedInsts?.get(skillId);
    if (!inst?.def.tree) return;
    const node = treeNodeOf(inst.def, nodeId);
    if (!node) return;
    // A RANKED node takes several points (repeated ids); walked to its
    // full rank = the silent no-op a single-rank node always was.
    if (treeSpentCount(inst.treeNodes, nodeId) >= treeInstanceNodeRanks(inst, nodeId)) return;
    const at = seat.actor.pos;
    const sealed = nativeHost.memorySecondaryRefusal(skillId) ?? treeNodeRefusal(inst, nodeId);
    if (sealed) {
      nativeHost.text(vec(at.x, at.y - 20), sealed, '#8a8678', 11);
      return;
    }
    const why = nativeHost.swapRefusal(seat, 'socket');
    if (why) { nativeHost.failNote(seat.actor, skillId + ':treepick', why); return; }
    if (inst.def.delivery.type === 'summon') nativeHost.clearSummonTreeBodies(seat.actor, inst);
    nativeHost.clearTreeFields(seat.actor, inst);
    inst.treeNodes = [...(inst.treeNodes ?? []), nodeId];
    // A spent point may carry a graft — the derived lane rebuilds now.
    nativeHost.recalcSeat(seat);
    nativeHost.charDirty = true;
    const ranks = treeInstanceNodeRanks(inst, nodeId);
    nativeHost.text(vec(at.x, at.y - 20),
      ranks > 1 ? `${node.name} ${treeSpentCount(inst.treeNodes, nodeId)}/${ranks}` : node.name,
      inst.def.color, 12);
  }

export function sceneReleaseCompanion(nativeHost:NativeSceneCampaignFrameClosureHost, actorId: number, seat: Seat = nativeHost.localSeat): void {
    const a = nativeHost.actorById(actorId);
    if (!a || !a.companion || a.dead || a.owner !== seat.actor) return;
    if (nativeHost.localSeat.keeper && !nativeHost.nearTracker(seat)) return; // THE COUNTERS AND THE JOURNAL: a bond is undone at the Tracker's fire, by the seat standing there
    nativeHost.showCompanionCue(a, 'sever', a.owner);
    // The bond ends FIRST — else kill()'s companion intercept would merely
    // down it (and a downed body's kill() no-ops outright).
    a.companion = false;
    a.downed = false;
    nativeHost.releaseContract(a, false);
    nativeHost.kill(a, true);
    nativeHost.charDirty = true;
  }

export function scenePlacePing(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, x: number, y: number): boolean {
    const now = nativeHost.time, a = seat.actor;
    if (a.dead || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const last = nativeHost.pingClocks.get(seat.id);
    if (last !== undefined && now - last < PING_CUE.cooldownSec && now >= last) return false;
    const reached = clampPingReach(a.pos, { x, y }, PING_CUE.maxReach); // SOVEREIGNTY: sight — a mark is seen, it touches no body
    const at = nativeHost.clampPos(reached, 0);
    for (const id of nativeHost.pingClocks.keys()) if (!nativeHost.seats.some(s => s.id === id)) nativeHost.pingClocks.delete(id);
    nativeHost.pingClocks.set(seat.id, now);
    nativeHost.pings = prunePings(nativeHost.pings, now).filter(p => p.seat !== seat.id);
    nativeHost.pings.push({ seat: seat.id, pos: { x: at.x, y: at.y }, tier: a.tier ?? 0, at: now, until: now + PING_CUE.lifeSec });
    return true;
  }

export function sceneFontMergeSkill(nativeHost:NativeSceneCampaignFrameClosureHost, skillId: string, rarity: SkillRarity, seat: Seat = nativeHost.localSeat): boolean {
    const m = seat.meta;
    const p = seat.actor;
    if (!nativeHost.nearFont(seat)) return false;
    const plan = skillMergePlan(m.items, skillId, rarity);
    if (plan.refusal || !plan.result) {
      nativeHost.failNote(p, 'fontmerge:' + skillId, plan.refusal ?? 'Merging is unavailable.');
      return false;
    }
    // Preflight every returned support before consuming any input. The keeper's
    // sockets and tree stay on the legendary result; only donor cargo is pried.
    const pried: SupportInstance[] = [];
    for (const item of plan.returnSockets) {
      const inst = skillOfGemItem(item);
      if (!inst) return false;
      for (const support of inst.sockets) if (support) pried.push(support);
    }
    for (const item of plan.taken) removeFromBag(m.items, item.uid);
    nativeHost.grantSkillGemItem(seat, plan.result, true);
    for (const support of pried) nativeHost.grantSupportGemItem(seat, support, true);
    nativeHost.charDirty = true;
    nativeHost.text(vec(p.pos.x, p.pos.y - 40),
      skillInstanceName(plan.result) + ' reforged — ' + SKILL_RARITIES[plan.result.rarity!].label,
      SKILL_RARITIES[plan.result.rarity!].color, 14);
    return true;
  }

export function sceneFontConvertEssence(nativeHost:NativeSceneCampaignFrameClosureHost, tier: number, dir: 'up' | 'down', seat: Seat = nativeHost.localSeat): boolean {
    const m = seat.meta;
    const p = seat.actor;
    if (!nativeHost.nearFont(seat)) return false;
    if (!Number.isInteger(tier) || tier < 1 || tier > ABILITY_ESSENCES.length) return false;
    const from = abilityEssenceOfTier(tier);
    if (dir === 'up') {
      if (tier + 1 > ABILITY_ESSENCES.length) return false;
      const to = abilityEssenceOfTier(tier + 1);
      if ((m.abilityEssences[from.id] ?? 0) < FONT_CFG.convertUp) {
        nativeHost.failNote(p, 'fontconv:' + from.id, `the font asks ${FONT_CFG.convertUp}× ${from.label}`);
        return false;
      }
      m.abilityEssences[from.id] = (m.abilityEssences[from.id] ?? 0) - FONT_CFG.convertUp;
      m.abilityEssences[to.id] = (m.abilityEssences[to.id] ?? 0) + 1;
      nativeHost.text(p.pos, `${FONT_CFG.convertUp}× ${from.glyph} → 1× ${to.glyph} ${to.label}`, to.color, 12);
    } else {
      if (tier - 1 < 1) return false;
      const to = abilityEssenceOfTier(tier - 1);
      if ((m.abilityEssences[from.id] ?? 0) < 1) {
        nativeHost.failNote(p, 'fontconv:' + from.id, `no ${from.label} to break`);
        return false;
      }
      m.abilityEssences[from.id] = (m.abilityEssences[from.id] ?? 0) - 1;
      m.abilityEssences[to.id] = (m.abilityEssences[to.id] ?? 0) + FONT_CFG.convertDown;
      nativeHost.text(p.pos, `1× ${from.glyph} → ${FONT_CFG.convertDown}× ${to.glyph} ${to.label}`, to.color, 12);
    }
    nativeHost.charDirty = true;
    return true;
  }

export function sceneFontResetTree(nativeHost:NativeSceneCampaignFrameClosureHost, skillId: string, seat: Seat = nativeHost.localSeat): boolean {
    const m = seat.meta;
    const p = seat.actor;
    if (!nativeHost.nearFont(seat)) return false;
    const inst = m.knownSkills.get(skillId);
    if (!inst || !inst.treeNodes?.length || nativeHost.memorySecondaryRefusal(skillId)) return false;
    const why = nativeHost.swapRefusal(seat, 'socket');
    if (why) { nativeHost.failNote(p, skillId + ':fontreset', why); return false; }
    const cost: AbilityCost = { tier: essenceTierForLevel(inst.level), count: FONT_CFG.reset.count };
    if (!nativeHost.spendAbilityEssence(seat, cost, 'fontreset:' + skillId)) return false;
    nativeHost.dismissSummonToggle(p, inst.def.id);
    nativeHost.clearSummonTreeBodies(p, inst);
    nativeHost.clearTreeFields(p, inst);
    const retiredTrigger = instanceTrigger(inst);
    inst.treeNodes = undefined;
    if (retiredTrigger !== instanceTrigger(inst) && inst.state) {
      delete inst.state.triggerOff;
      delete inst.state.trigDepth;
    }
    delete inst.replenishmentPaused;
    // The refund is FULL-TREE by law (never node-wise — partial refunds
    // breed prerequisite paradoxes); the derived graft lane unmakes with it.
    nativeHost.recalcSeat(seat);
    nativeHost.charDirty = true;
    nativeHost.text(vec(p.pos.x, p.pos.y - 20), 'the font unmakes the choice', '#b06bd4', 13);
    return true;
  }

export function sceneBuyAbilityEssence(nativeHost:NativeSceneCampaignFrameClosureHost, vendorId: string, tier: number, seat: Seat = nativeHost.localSeat): boolean {
    const v = VENDORS.find(x => x.id === vendorId);
    if (!v || !v.near(nativeHost, seat)) return false;
    const refusal = nativeHost.vendorTradeRefusal(v);
    if (refusal) { nativeHost.failNote(seat.actor, 'vendortrade', refusal); return false; }
    const why = nativeHost.abilityEssTierRefusal(v, tier);
    if (why) { nativeHost.failNote(seat.actor, 'abiless:' + tier, why); return false; }
    const price = ABILITY_ESSENCE_CFG.vendor.prices[tier - 1];
    if (!price) return false;
    if (!nativeHost.canAffordEssence(seat, price)) {
      nativeHost.failNote(seat.actor, 'abiless:' + tier, `needs ${price.count}× ${ESSENCES[price.essence].label}`);
      return false;
    }
    seat.meta.essences[price.essence] -= price.count;
    nativeHost.grantAbilityEssence(seat, tier, 1);
    if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) nativeHost.saveCharacter();
    return true;
  }

export function sceneBuyVendorGem(nativeHost:NativeSceneCampaignFrameClosureHost, index: number, seat: Seat = nativeHost.localSeat): boolean {
    if (nativeHost.buysAsOwn(seat)) return nativeHost.withBuyer(seat, () => nativeHost.buyVendorGem(index, seat)); // THE SHELF PER BUYER: a purchase splices the buyer's own shelf
    const m = seat.meta;
    const entry = nativeHost.vendorStock[index];
    if (!entry || !nativeHost.nearSmith(seat) || !nativeHost.vendorEntryAllowed('brandt', entry)) return false;
    // THE TRADE GATE — the panel disables through this SAME predicate;
    // refusals mutate nothing and speak the config's own words. (The gem
    // case's face-seal retired with the one-shelf fold, skill-items M3:
    // FEATURE.VENDOR_GEMS gates the true-gem STOCK in buildVendorStock —
    // what stands on the shelf is honestly buyable.)
    const refusal = nativeHost.vendorTradeRefusal(VENDORS.find(v => v.id === 'brandt'));
    if (refusal) { nativeHost.failNote(seat.actor, 'vendortrade', refusal); return false; }
    const price = nativeHost.vendorPrice(entry);
    // Affordability first (names the missing tint), then bag space for gear,
    // THEN the spend — order matters: no partial deductions, no eaten fees.
    const short = price.find(c => !nativeHost.canAffordEssence(seat, c));
    if (short) {
      nativeHost.failNote(seat.actor, 'vendor:' + index, `needs ${short.count}× ${ESSENCES[short.essence].label}`);
      return false;
    }
    // THE RESIDENCE: every ware — gear tile or gem wrapper — must FIT the
    // bag before a single essence moves (a full bag refuses the sale,
    // never eats the price). A bought MEMORY stack merges onto the seat's
    // standing pouch of its kind first (the pickup's own law — no second
    // tile ever forms).
    const landed = entry.kind === 'item'
      ? (nativeHost.tryMergeMemoryItem(seat, entry.item) || autoPlace(m.items, entry.item))
      : entry.kind === 'skill' ? !!autoPlace(m.items, makeSkillGemItem(entry.inst))
      : !!autoPlace(m.items, makeSupportGemItem(entry.gem));
    if (!landed) {
      nativeHost.failNote(seat.actor, 'bagfull', 'inventory full');
      return false;
    }
    for (const c of price) m.essences[c.essence] -= c.count;
    nativeHost.vendorStock.splice(index, 1);
    nativeHost.vendorBought('brandt', entry, seat, nativeHost.vendorStock);
    if (entry.kind === 'skill') {
      nativeHost.text(seat.actor.pos, `bought ${skillInstanceName(entry.inst)}`, '#e8c87a', 13);
    } else if (entry.kind === 'support') {
      nativeHost.text(seat.actor.pos, `bought ${entry.gem.def.name}`, '#e8c87a', 13);
    } else {
      nativeHost.text(seat.actor.pos, `bought ${entry.item.name}`, ITEM_RARITIES[entry.item.rarity].color, 13);
    }
    nativeHost.markMetaDirty(seat);
    // Persist only the genuine LOCAL hero (the host / single-player) to disk. A
    // render-shell CLIENT (clientActionHook set) must NEVER saveCharacter — its
    // optimistic-predicted shell meta would clobber the client's OWN save slot.
    if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) nativeHost.saveCharacter();
    return true;
  }

export function sceneBuyChandlerGem(nativeHost:NativeSceneCampaignFrameClosureHost, index: number, seat: Seat = nativeHost.localSeat): boolean {
    if (nativeHost.buysAsOwn(seat)) return nativeHost.withBuyer(seat, () => nativeHost.buyChandlerGem(index, seat)); // THE SHELF PER BUYER: the buyer's own shelf
    const m = seat.meta;
    const entry = nativeHost.chandlerStock[index];
    if (!entry || !nativeHost.nearChandler(seat)) return false;
    // THE TRADE GATE — buyVendorGem's exact read (the gem case's face-seal
    // retired with the one-shelf fold; the stock builder is the gate now).
    const refusal = nativeHost.vendorTradeRefusal();
    if (refusal) { nativeHost.failNote(seat.actor, 'vendortrade', refusal); return false; }
    const price = nativeHost.vendorPrice(entry);
    const short = price.find(c => !nativeHost.canAffordEssence(seat, c));
    if (short) {
      nativeHost.failNote(seat.actor, 'chandler:' + index, `needs ${short.count}× ${ESSENCES[short.essence].label}`);
      return false;
    }
    // THE RESIDENCE: fit-before-spend for gems too (buyVendorGem's law) —
    // and a bought Memory stack merges onto its standing pouch first.
    const landed = entry.kind === 'item'
      ? (nativeHost.tryMergeMemoryItem(seat, entry.item) || autoPlace(m.items, entry.item))
      : entry.kind === 'skill' ? !!autoPlace(m.items, makeSkillGemItem(entry.inst))
      : !!autoPlace(m.items, makeSupportGemItem(entry.gem));
    if (!landed) {
      nativeHost.failNote(seat.actor, 'bagfull', 'inventory full');
      return false;
    }
    for (const c of price) m.essences[c.essence] -= c.count;
    nativeHost.chandlerStock.splice(index, 1);
    nativeHost.vendorBought('chandler', entry, seat, nativeHost.chandlerStock);
    if (entry.kind === 'skill') {
      nativeHost.text(seat.actor.pos, `bought ${skillInstanceName(entry.inst)}`, '#e8c87a', 13);
    } else if (entry.kind === 'support') {
      nativeHost.text(seat.actor.pos, `bought ${entry.gem.def.name}`, '#e8c87a', 13);
    } else {
      nativeHost.text(seat.actor.pos, `bought ${entry.item.name}`, ITEM_RARITIES[entry.item.rarity].color, 13);
    }
    nativeHost.markMetaDirty(seat);
    if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) nativeHost.saveCharacter();
    return true;
  }

export function sceneBuyDelverGem(nativeHost:NativeSceneCampaignFrameClosureHost, index: number, seat: Seat = nativeHost.localSeat): boolean {
    const m = seat.meta;
    const entry = nativeHost.descentStock[index];
    if (!entry || !nativeHost.delverShopOpen(seat)) return false;
    const refusal = nativeHost.vendorTradeRefusal();
    if (refusal) { nativeHost.failNote(seat.actor, 'vendortrade', refusal); return false; }
    // (The gem case's face-seal retired with the one-shelf fold — the
    // delver's shelf gates its gem rolls at MINT, mirroring the town law.)
    const lock = nativeHost.delverEntryRefusal(entry);
    if (lock) { nativeHost.failNote(seat.actor, 'delver:' + index, lock); return false; }
    const price = nativeHost.vendorPrice(entry);
    const short = price.find(c => !nativeHost.canAffordEssence(seat, c));
    if (short) {
      nativeHost.failNote(seat.actor, 'delver:' + index, `needs ${short.count}× ${ESSENCES[short.essence].label}`);
      return false;
    }
    // THE RESIDENCE: fit-before-spend for gems too (buyVendorGem's law) —
    // and a bought Memory stack merges onto its standing pouch first.
    const landed = entry.kind === 'item'
      ? (nativeHost.tryMergeMemoryItem(seat, entry.item) || autoPlace(m.items, entry.item))
      : entry.kind === 'skill' ? !!autoPlace(m.items, makeSkillGemItem(entry.inst))
      : !!autoPlace(m.items, makeSupportGemItem(entry.gem));
    if (!landed) {
      nativeHost.failNote(seat.actor, 'bagfull', 'inventory full');
      return false;
    }
    for (const c of price) m.essences[c.essence] -= c.count;
    nativeHost.descentStock.splice(index, 1); // the map holds this same array — the purchase persists
    nativeHost.vendorBought('delver', entry, seat, nativeHost.descentStock); // holdless — the market stamp alone
    if (entry.kind === 'skill') {
      nativeHost.text(seat.actor.pos, `bought ${skillInstanceName(entry.inst)}`, '#7fe0d8', 13);
    } else if (entry.kind === 'support') {
      nativeHost.text(seat.actor.pos, `bought ${entry.gem.def.name}`, '#7fe0d8', 13);
    } else {
      nativeHost.text(seat.actor.pos, `bought ${entry.item.name}`, ITEM_RARITIES[entry.item.rarity].color, 13);
    }
    nativeHost.markMetaDirty(seat);
    if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) nativeHost.saveCharacter();
    return true;
  }

export function sceneSetVendorLock(nativeHost:NativeSceneCampaignFrameClosureHost, vendorId: string, index: number, on: boolean, seat: Seat = nativeHost.localSeat): boolean {
    if (nativeHost.buysAsOwn(seat)) return nativeHost.withBuyer(seat, () => nativeHost.setVendorLock(vendorId, index, on, seat)); // THE SHELF PER BUYER: the buyer's own hold
    const v = VENDORS.find(x => x.id === vendorId);
    if (!v?.holds?.locks || !v.near(nativeHost, seat)) return false;
    const stock = v.stock(nativeHost);
    const entry = stock[index];
    if (!entry) return false;
    const key = nativeHost.vendorHoldKey(v);
    const hold = nativeHost.vendorHoldFor(key);
    const at = hold.locks.findIndex(r => r.entry === entry);
    if (on === (at >= 0)) return false;
    if (on) {
      const cap = nativeHost.vendorLockCap();
      if (hold.locks.filter(r => !r.commission).length >= cap) {
        nativeHost.failNote(seat.actor, 'vlock:' + key, cap > 0
          ? `the ledger holds ${cap} — release one first`
          : 'the Vault has not opened the reserve ledger');
        return false;
      }
      hold.locks.push({ entry, idx: index });
    } else {
      hold.locks.splice(at, 1);
    }
    nativeHost.charDirty = true;
    return true;
  }

export function sceneSetVendorCommission(nativeHost:NativeSceneCampaignFrameClosureHost, 
    vendorId: string, gem: { kind: 'skill' | 'support'; id: string } | null,
    seat: Seat = nativeHost.localSeat,
  ): boolean {
    if (nativeHost.buysAsOwn(seat)) return nativeHost.withBuyer(seat, () => nativeHost.setVendorCommission(vendorId, gem, seat)); // THE SHELF PER BUYER: the buyer's own standing order
    const v = VENDORS.find(x => x.id === vendorId);
    if (!v?.holds?.commission || !v.near(nativeHost, seat)) return false;
    if (!featureEnabled(nativeHost.account, FEATURE.VENDOR_COMMISSION)) return false;
    const key = nativeHost.vendorHoldKey(v);
    const hold = nativeHost.vendorHoldFor(key);
    if (!gem) {
      if (!hold.commission && !hold.locks.some(r => r.commission)) return false;
      hold.commission = undefined;
      hold.locks = hold.locks.filter(r => !r.commission);
      nativeHost.charDirty = true;
      return true;
    }
    if (!memoryProgressionOpen(nativeHost.account)) {
      nativeHost.failNote(seat.actor, 'vcomm:' + key, powerProgressionRefusal('awakening'));
      return false;
    }
    const def = gem.kind === 'skill' ? SKILLS[gem.id] : SUPPORTS[gem.id];
    if (!def) return false;
    const unlocked = gem.kind === 'skill'
      ? isSkillUnlockedForDrop(nativeHost.account, gem.id)
      : isSupportUnlockedForDrop(nativeHost.account, gem.id);
    if (!unlocked) return false;
    const memoryWhy = gem.kind === 'skill' ? nativeHost.memorySecondaryRefusal(gem.id, 'commission') : null;
    if (memoryWhy) { nativeHost.failNote(seat.actor, 'vcomm:' + key, memoryWhy); return false; }
    if (!memoryCommissionReady(nativeHost.account, gem.kind, gem.id, VENDOR_CFG.commission.need)) {
      nativeHost.failNote(seat.actor, 'vcomm:' + key,
        `the drop index knows too few (${VENDOR_CFG.commission.need} finds needed)`);
      return false;
    }
    if (nativeHost.commissionOdds(gem) <= 0) {
      nativeHost.failNote(seat.actor, 'vcomm:' + key, 'this counter cannot roll that Memory yet');
      return false;
    }
    hold.commission = { kind: gem.kind, id: gem.id };
    hold.locks = hold.locks.filter(r => !r.commission);
    hold.watchedSec = nativeHost.time; // the watch starts NOW — no retroactive beats
    nativeHost.charDirty = true;
    nativeHost.text(seat.actor.pos, `standing order: ${def.name}`, '#e8c87a', 13);
    return true;
  }

export function sceneLevelUpSkill(nativeHost:NativeSceneCampaignFrameClosureHost, skillId: string, seat: Seat = nativeHost.localSeat): boolean {
    const m = seat.meta;
    const inst = m.knownSkills.get(skillId);
    // A GRANTED skill's level is the legend's roll — essence buys nothing.
    if (!inst && seat.grantedInsts?.has(skillId)) {
      nativeHost.failNote(seat.actor, skillId + ':granted', 'its level is the gear\'s to give');
      return false;
    }
    if (!inst || inst.level >= skillMaxLevel(inst.def)) return false;
    if (!nativeHost.spendAbilityEssence(seat, skillLevelAbilityCost(inst.level + 1), 'abilvl:' + skillId)) return false;
    inst.level++;
    // A COMPLETED BAND mints an Ability point (bandPointsAt — derived,
    // never stored). A tree-wearing skill banks the milestone pip; the
    // popup waits for the disciplined calm (updateTreePips).
    if (inst.def.tree && !nativeHost.memorySecondaryRefusal(skillId) && bandPointsAt(inst.level) > bandPointsAt(inst.level - 1)) {
      const queue = nativeHost.pendingTreePips.get(seat.id) ?? [];
      if (!queue.includes(skillId)) {
        queue.push(skillId);
        nativeHost.pendingTreePips.set(seat.id, queue);
      }
      // THE AWAKENING, SHOWN (her law, 2026-09-11 — no words): the bar
      // slot's pip BLOOMS (renderer reads inst.state.treeAwokeAt) and a
      // gold ring breathes out of the hero; the drawer's pip and the Menu
      // button's roll-up keep the standing truth. The chooser popup is
      // opt-in (Settings.treePrompt).
      (inst.state ??= {}).treeAwokeAt = nativeHost.time;
      nativeHost.flashes.push({
        pos: vec(seat.actor.pos.x, seat.actor.pos.y), radius: seat.actor.radius + 14,
        color: '#d8b86a', life: 0.9, maxLife: 0.9,
      });
    }
    nativeHost.charDirty = true;
    return true;
  }

export function sceneBagItem(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number): ItemInstance | undefined {
    return seat.meta.items.find(i => i.uid === uid);
  }

export function sceneLevelUpSupport(nativeHost:NativeSceneCampaignFrameClosureHost, gem: SupportInstance, seat: Seat = nativeHost.localSeat): boolean {
    if (gem.level >= supportMaxLevel(gem.def)) return false;
    if (!nativeHost.spendAbilityEssence(seat, supportLevelAbilityCost(gem.level + 1), 'abilvl:' + gem.def.id)) return false;
    gem.level++;
    nativeHost.charDirty = true;
    return true;
  }

export function sceneResyncMinionSupports(nativeHost:NativeSceneCampaignFrameClosureHost, inst: SkillInstance): void {
    for (const a of nativeHost.actors) {
      // Constructs carry summonInst as a back-reference too, but never
      // receive spawn-time forwarding — resync mirrors the spawn path.
      if (a.dead || a.construct || a.summonInst !== inst) continue;
      for (const sk of a.skills) {
        if (!sk) continue;
        for (let i = sk.sockets.length - 1; i >= 0; i--) {
          if (sk.sockets[i]?.forwarded) sk.sockets.splice(i, 1);
        }
      }
      nativeHost.forwardSummonSockets(inst, a.skills);
      const d = instanceDelivery(inst);
      if (d.type === 'summon') for (const id of d.crewAuras ?? []) {
        const sk = a.skills.find(s => s?.def.id === id);
        if (!sk || sk.def.delivery.type !== 'aura') continue;
        nativeHost.deactivateAura(a, id);
        nativeHost.activateAura(a, sk, sk.def.delivery,
          a.sheet.get('aoeRadius', skillContextTags(sk), instanceMods(sk)));
      }
    }
  }

export function sceneReacquireSkill(nativeHost:NativeSceneCampaignFrameClosureHost, skillId: string, seat: Seat = nativeHost.localSeat): boolean {
    const m = seat.meta;
    if (!m.opening.includes(skillId)) return false;
    if (m.knownSkills.has(skillId)) return false;
    if (findBagGem(m.items, 'skill', skillId)) return false;
    const def = SKILLS[skillId];
    if (!def) return false;
    // The hatch re-kindles AT the kit tier — never a socket upgrade over
    // the starter it replaces (lose-and-rekindle must stay worthless).
    const inst = makeSkillGem(def, 1, CLASS_KIT_RARITY);
    inst.granted = true;
    // THE RESIDENCE: the spark is a bag item now — a full pack refuses the
    // hatch honestly (failNote 'bagfull') instead of minting into the void.
    if (!nativeHost.grantSkillGemItem(seat, inst)) return false;
    nativeHost.text(seat.actor.pos, `${def.name} re-kindled`, '#b06bd4', 13);
    nativeHost.markMetaDirty(seat);
    return true;
  }

export function sceneSocketSupport(nativeHost:NativeSceneCampaignFrameClosureHost, uid: number, skillId: string, seat: Seat = nativeHost.localSeat): boolean {
    const m = seat.meta;
    const item = nativeHost.bagItem(seat, uid);
    const gem = item ? supportOfGemItem(item) : null;
    // A GRANTED skill sockets like a learned one — the stone lands on the
    // granting item's residence at the recalc below (THE LEGEND FABRIC).
    const inst = m.knownSkills.get(skillId) ?? seat.grantedInsts?.get(skillId);
    if (!gem || !inst || !supportFitsInstOrCrew(gem.def, inst, nativeHost.summonCrewSkills(inst), gem.rolled)) return false;
    const free = inst.sockets.indexOf(null);
    if (free === -1) return false;
    // THE FIELD DISCIPLINE: socket surgery wants cold blades (sanctuary waives).
    {
      const why = nativeHost.swapRefusal(seat, 'socket', skillId);
      if (why) { nativeHost.failNote(seat.actor, skillId + ':discipline', why); return false; }
    }
    inst.sockets[free] = gem;
    removeFromBag(m.items, uid);
    // Worn slot grafts re-derive against the new socket: a duplicate worn
    // copy yields to the real stone, and a dormant worn gem WAKES the
    // moment this socket grants the mechanism it was refused for.
    nativeHost.recalcSeat(seat);
    nativeHost.resyncMinionSupports(inst);
    nativeHost.markMetaDirty(seat);
    return true;
  }

export function sceneUnsocketSupport(nativeHost:NativeSceneCampaignFrameClosureHost, skillId: string, socketIndex: number, seat: Seat = nativeHost.localSeat): boolean {
    const m = seat.meta;
    const inst = m.knownSkills.get(skillId) ?? seat.grantedInsts?.get(skillId);
    const gem = inst?.sockets[socketIndex];
    if (!inst || !gem) return false;
    // THE FIELD DISCIPLINE: prying a stone out mid-melee is the same surgery.
    {
      const why = nativeHost.swapRefusal(seat, 'unsocket', skillId);
      if (why) { nativeHost.failNote(seat.actor, skillId + ':discipline', why); return false; }
    }
    if (!nativeHost.grantSupportGemItem(seat, gem)) return false; // bagfull — noted
    inst.sockets[socketIndex] = null;
    // Re-derive worn slot grafts: a worn copy that yielded to this stone
    // returns, and a worn gem whose mechanism LEFT with it goes dormant.
    nativeHost.recalcSeat(seat);
    nativeHost.resyncMinionSupports(inst);
    return true;
  }

export function sceneUnsocketBagSkill(nativeHost:NativeSceneCampaignFrameClosureHost, uid: number, socketIndex: number, seat: Seat = nativeHost.localSeat): boolean {
    const item = nativeHost.bagItem(seat, uid);
    const payload = item && skillGemPayloadOf(item);
    const gem = item && bagSkillSupport(item, socketIndex);
    if (!payload || !gem) return false;
    const why = nativeHost.swapRefusal(seat, 'unsocket', payload.skillId);
    if (why) { nativeHost.failNote(seat.actor, payload.skillId + ':discipline', why); return false; }
    if (!nativeHost.grantSupportGemItem(seat, gem)) return false;
    payload.sockets[socketIndex] = null;
    nativeHost.markMetaDirty(seat);
    return true;
  }

export function sceneAllocateNode(nativeHost:NativeSceneCampaignFrameClosureHost, nodeId: string, seat: Seat = nativeHost.localSeat, optionId?: string): boolean {
    const m = seat.meta;
    // hasOwnProperty guard: a prototype-chain key ('__proto__', 'constructor', …)
    // would otherwise resolve PASSIVE_NODES[nodeId] to Object.prototype (truthy)
    // and then crash on PASSIVE_ADJACENCY[nodeId].some — an untrusted-id vector.
    if (!Object.prototype.hasOwnProperty.call(PASSIVE_NODES, nodeId)) return false;
    const node = PASSIVE_NODES[nodeId];
    if (!node) return false;
    // REALM GATE (data/passiveRealms.ts): the node's constellation must be
    // OPEN for this run (the star always is; scaffolding realms open when
    // content bumps their unlockLedger). Opening seeds the realm's free
    // root crests, so pathing has somewhere to start.
    const realm = realmOf(node);
    if (!realmOpen(realm, nativeHost.ledger)) return false;
    if (realm) nativeHost.ensureRealmRoots(seat, realm);
    const already = m.allocated.has(nodeId);
    let cost = 1;
    // THE DEAL LAW (PassiveChoiceGroup.deal): a 'first' group SPENT at a
    // sibling leaves this node a grant-less SHORTCUT — it allocates through
    // the plain branch below (no option, no pick recorded, cost 1). A 'sole'
    // group claimed at a sibling needs no branch of its own: choiceLockReason
    // refuses every option here, and a choice node never allocates blind.
    if (node.choice && !choiceDealSpent(node, m.choices, PASSIVE_NODES)) {
      if (optionId === undefined) return false; // a choice node never allocates blind
      if (choiceLockReason(node, optionId, m.choices, PASSIVE_NODES) !== null) return false;
      cost = PASSIVE_CHOICE_CFG.pickCost;
    } else if (already || optionId !== undefined) {
      return false; // plain nodes (and spent-deal shortcuts): one allocation, no options
    }
    // Pathing: the FIRST touch of any node needs an allocated neighbour —
    // except in a 'free'-adjacency realm (Pantheon shrines stand alone);
    // an already-open choice node's later picks re-pay only the pool.
    if (!already && realm?.adjacency !== 'free'
      && !PASSIVE_ADJACENCY[nodeId]?.some(n => m.allocated.has(n))) return false;
    if (node.vocation !== undefined) {
      if (!m.vocations.includes(node.vocation)) return false;   // not earned (or another's tree)
      if (!vocationGateOpen(m.allocated, node.vocation)) return false; // the toggle-able gate
      if (m.vocationPoints < cost) return false;                // the separate currency
      m.vocationPoints -= cost;
    } else {
      // The realm names its pool: 'passive' (default) is the main pool,
      // anything else a REALM CURRENCY ledgered in meta.realmPoints.
      const currency = realm?.currency ?? 'passive';
      if (currency === 'passive') {
        if (m.passivePoints < cost) return false;
        m.passivePoints -= cost;
      } else {
        const have = m.realmPoints[currency] ?? 0;
        if (have < cost) return false;
        m.realmPoints[currency] = have - cost;
      }
    }
    if (node.choice && optionId !== undefined) {
      (m.choices[nodeId] ??= []).push(optionId);
    }
    m.allocated.add(nodeId);
    nativeHost.recalcSeat(seat);
    nativeHost.refreshPassiveCompany(seat);
    return true;
  }

export function sceneRefundPassiveNode(nativeHost:NativeSceneCampaignFrameClosureHost, nodeId: string, seat: Seat = nativeHost.localSeat): boolean {
    const refund = passiveRefund(seat.meta, nodeId);
    const why = nativeHost.passiveRefundRefusal(seat) ?? refund.refusal;
    if (why) { nativeHost.failNote(seat.actor, 'passiveRefund', why); return false; }
    const m = seat.meta, hero = nativeHost.seatHero(seat);
    // Ordinary summons snapshot owner power. Refresh their combat investment
    // without reapplying spawn-time geometry (offspring and shell sizes).
    const bodies = nativeHost.actors.filter(a => !a.dead && a.owner === hero && !a.construct && !a.companion && a.summonInst);
    m.allocated.delete(nodeId);
    delete m.choices[nodeId];
    for (const key of Object.keys(m.grafts)) if (key === nodeId || key.startsWith(nodeId + ':')) delete m.grafts[key];
    if (PASSIVE_NODES[nodeId].vocation !== undefined) m.vocationPoints += refund.points;
    else if (refund.currency === 'passive') m.passivePoints += refund.points;
    else m.realmPoints[refund.currency] = (m.realmPoints[refund.currency] ?? 0) + refund.points;
    nativeHost.recalcSeat(seat);
    for (const inst of [...m.knownSkills.values(), ...(seat.grantedInsts?.values() ?? [])]) nativeHost.resyncMinionSupports(inst);
    for (const a of bodies) {
      if (a.dead) continue;
      const inst = a.summonInst!;
      if (inst.def.throng || inst.def.hivecall) nativeHost.bakeMinionOwnerStats(a, hero, inst, inst.def.throng ? batchScaleOf(inst.def.throng) : 1);
      else {
        const inherited = resolveMinionInheritance(hero, inst, a.defId);
        a.sheet.setSource('owner', inherited.ownerMods);
        a.sheet.setSource('minionCombat', inherited.combatMods);
        a.guardMode = inherited.guard;
        applyMinionPlyBonus(a, inherited.plyBonus);
        syncAttributeBequests(a, inst.relicSource ? RELIQUARY_CFG.minion.ordinaryStats : 1, inherited.tags, inherited.extra);
      }
      a.life = Math.min(a.life, a.maxLife());
    }
    nativeHost.refreshPassiveCompany(seat);
    nativeHost.markMetaDirty(seat);
    nativeHost.charDirty = true;
    return true;
  }

export function sceneBindGraft(nativeHost:NativeSceneCampaignFrameClosureHost, key: string, skillId: string | null, seat: Seat = nativeHost.localSeat): boolean {
    const m = seat.meta;
    const source = graftSourcesOf(m.allocated, m.choices, PASSIVE_NODES).find(s => s.key === key);
    if (!source) return false;
    if (skillId !== null && !m.knownSkills.has(skillId)) return false;
    const prev = m.grafts[key] ?? null;
    if (prev === skillId) return true;
    m.grafts[key] = skillId;
    nativeHost.recalcSeat(seat); // rebuilds every instance's graft lane
    // Forwarded copies on live minions re-mint for BOTH hosts involved —
    // mirrors socketSupport's resync exactly.
    for (const id of [prev, skillId]) {
      if (!id) continue;
      const inst = m.knownSkills.get(id);
      if (inst) nativeHost.resyncMinionSupports(inst);
    }
    return true;
  }

export function sceneBindSkill(nativeHost:NativeSceneCampaignFrameClosureHost, slot: number, skillId: string | null, seat: Seat = nativeHost.localSeat): boolean {
    // The BAR belongs to the hero body (the possession seam): re-binding
    // while possessed edits the build you'll come home to, never the
    // borrowed kit.
    const p = nativeHost.seatHero(seat);
    if (slot < 0 || slot >= p.skills.length) return false;
    const prev = p.skills[slot];
    if (skillId === null) {
      nativeHost.rememberSkillSlots(seat, [prev]);
      p.skills[slot] = null;
      nativeHost.rebindWornGrafts(seat, [prev]);
      return true;
    }
    // Learned or GRANTED (THE LEGEND FABRIC): both bind by id.
    const inst = nativeHost.seatSkillById(seat, skillId);
    if (!inst) return false;
    nativeHost.rememberSkillSlots(seat, [prev]);
    const already = prev?.def.id === skillId;
    for (let i = 0; i < p.skills.length; i++) {
      if (p.skills[i]?.def.id === skillId) p.skills[i] = null;
    }
    if (!already) p.skills[slot] = inst;
    nativeHost.rebindWornGrafts(seat, [prev, inst]);
    return true;
  }

export function sceneSwapSkillSlots(nativeHost:NativeSceneCampaignFrameClosureHost, a: number, b: number, seat: Seat = nativeHost.localSeat): boolean {
    const p = nativeHost.seatHero(seat);
    if (a === b || a < 0 || b < 0 || a >= p.skills.length || b >= p.skills.length) return false;
    const ia = p.skills[a], ib = p.skills[b];
    if (!ia && !ib) return true; // two empty seats — nothing moves
    p.skills[a] = ib;
    p.skills[b] = ia;
    nativeHost.rebindWornGrafts(seat, [ia, ib]);
    return true;
  }

export function sceneRecallMemory(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, dropperId: string, facet?: string): MemoryRecallResult | null {
    const pouch = nativeHost.bagItem(seat, uid);
    const units = pouch ? memoryUnitsOf(pouch) : null;
    const memKind = pouch ? memoryKindOf(pouch) : null;
    if (!pouch || !units || !memKind) return null;
    const idx = units.findIndex(u => memoryGroupKey(u) === dropperId);
    if (idx < 0) return null;
    // THE FACET gate (the banner lane): a preformed recall names its triad
    // by the LEAD attribute id, validated against the live registry — a
    // stale or foreign facet refuses before anything moves.
    const wantFacet = MEMORY_KINDS[memKind].facets;
    const facetId = wantFacet ? facet : undefined;
    if (wantFacet && (facetId === undefined || memoryFacetAttrs(facetId) === null)) {
      nativeHost.text(seat.actor.pos, MEMORY_CFG.strings.noFacet, '#c08a68', 12);
      return null;
    }
    if (nativeHost.spoilsSealed()) {
      nativeHost.text(seat.actor.pos, MEMORY_CFG.strings.sealed, '#c08a68', 12);
      return null;
    }
    const frees = units.length === 1 ? 1 : 0;
    if (freeCellCount(seat.meta.items) + frees < 1) {
      nativeHost.text(seat.actor.pos, MEMORY_CFG.strings.noRoom, '#c08a68', 12);
      return null;
    }
    const unit = units[idx];
    // Consume by REPLACING the array (never splicing in place — saves and
    // the wire shallow-copy items; a fresh array can't reach a snapshot).
    const rest = units.filter((_, i) => i !== idx);
    if (rest.length === 0) {
      const at = seat.meta.items.indexOf(pouch);
      if (at >= 0) seat.meta.items.splice(at, 1);
    } else pouch.mem = rest;
    const cut = nativeHost.resolveMemoryCut(seat, unit, facetId as AttributeId | undefined);
    let item: ItemInstance;
    let color: string;
    if (cut.kind === 'skill') {
      const inst = makeSkillGem(cut.def, cut.level, cut.rarity);
      nativeHost.noteGemDrop(inst.def.id, inst.rarity); // THE MINT LAW
      item = makeSkillGemItem(inst);
      color = SKILL_RARITIES[cut.rarity].color;
    } else {
      nativeHost.noteGemDrop(cut.def.id); // THE MINT LAW
      // THE ONE MINT (supportbase.ts): a chassis gem cuts its vein off the
      // unit's own foreordained stream — a recalled chassis is a CUT one.
      item = makeSupportGemItem(mintSupportInstance(cut.def, cut.level, cut.rand));
      color = cut.def.color;
    }
    autoPlace(seat.meta.items, item); // guaranteed: 1×1 + the room check above
    nativeHost.text(seat.actor.pos, `${item.name}!`, color, 14, 'drop', FLOAT_CFG.dropNameSec);
    notePickup(nativeHost.pickupFeed, seat.id, `${item.name} (recalled)`, color, nativeHost.time);
    nativeHost.markMetaDirty(seat);
    const res: MemoryRecallResult = {
      kind: cut.kind, id: cut.def.id, name: item.name, itemUid: item.uid,
      ...(cut.kind === 'skill' ? { rarity: cut.rarity } : {}),
    };
    nativeHost.memoryRecallLast = { ...res, seat: seat.id };
    if (seat === nativeHost.localSeat) {
      nativeHost.ledger[MEMORY_CFG.lessonReceipt] = 1;
      if (nativeHost.metaProgressionActive()) {
        nativeHost.account.ledger[MEMORY_CFG.lessonReceipt] = 1; nativeHost.accountDirty = true;
      }
    }
    return res;
  }

export function sceneStartCaravan(nativeHost:NativeSceneCampaignFrameClosureHost, band: number, seat: Seat = nativeHost.localSeat): boolean {
    if (nativeHost.clientActionHook) return false; // host-authoritative: a client never mints/loads locally
    if (nativeHost.player.dead || nativeHost.player.downed || nativeHost.gameOver) return false;
    if (!nativeHost.nearCaravan(seat)) return false;
    if (!nativeHost.caravanBandUnlocked(band)) return false;
    const destId = band === 0 ? START_ZONE : nativeHost.mintCaravanRoute(band);
    if (nativeHost.zone.id === destId) return false; // already there
    // THE ROADS PER PLAYER (shard M1 W2): on a hosted world the escort carries
    // the asking seat alone (the route minted here, in its own unit); band 0
    // lands in the keeper (THE HEARTH ALIAS).
    if (nativeHost.shardWorld) {
      if (seat.actor.dead || seat.actor.downed) return false;
      nativeHost.shardWorld.enqueue({ seatId: seat.id, dest: destId, from: nativeHost.zone.id, landing: 'entry' });
      return true;
    }
    nativeHost.loadZone(destId, nativeHost.zone.id);
    return true;
  }

export function sceneTravelToWaypoint(nativeHost:NativeSceneCampaignFrameClosureHost, zoneId: string, seat: Seat = nativeHost.localSeat): boolean {
    // SOVEREIGNTY: seat — the party gathers (the derived census, probe_tiers RIG T).
    // THE ROADS PER PLAYER (shard M1 W2): a render shell asks its host (the
    // waypoint intent); a hosted world judges the asking seat (its body, its
    // hunters, its own note row) and moves it alone through a ticket.
    if (nativeHost.clientActionHook) { nativeHost.requestMeta({ t: 'waypoint', zoneId }); return false; }
    if (!nativeHost.discoveredWaypoints.has(zoneId) || nativeHost.zone.id === zoneId) return false;
    const hero = nativeHost.shardWorld ? seat.actor : nativeHost.player;
    if (hero.dead || nativeHost.gameOver) return false;
    // A waypointless DIMENSION refuses fast-travel outright (belt over the
    // mint-side veto: an attunement smuggled in by an older save still
    // cannot fire — the Aetherial is crossed, never teleported into).
    if (dimensionDef(nativeHost.zoneMap[zoneId]?.dimension).waypoints === false) {
      nativeHost.seatNote(seat, hero.pos, 'no road bends that high — the realm must be crossed', '#9fc0e8', 13);
      return false;
    }
    // ANTI-TELEPORT gate: refuse fast-travel to a waypoint sitting within an arena's
    // exclusion radius — even if it was attuned before the arena existed — so the
    // player must trek the last few zones each run (Mephisto-style farming friction).
    // The HOME town is always exempt: it's the respawn/vendor/turn-in hub and the
    // natural staging waypoint a few zones out (so the trek runs town → arena).
    const dest = nativeHost.zoneMap[zoneId];
    if (dest && dest.id !== START_ZONE && Object.values(nativeHost.zoneMap).some(z =>
      z.wpExclusionRadius !== undefined && z.id !== dest.id && z.id !== START_ZONE
      && Math.hypot(z.map.x - dest.map.x, z.map.y - dest.map.y) < z.wpExclusionRadius)) {
      nativeHost.seatNote(seat, hero.pos, 'too close to the seat of the Unmade to attune a path', '#d05050', 13);
      return false;
    }
    // Passive scenery (a Training Dummy, a barrel) isn't "hunting" you — only a
    // real threat nearby blocks waypointing. NEUTRAL, un-roused AMBIENT bodies
    // (a passing herd, grazing wildlife, toll wardens — the whole ambient
    // registry incl. live guardian tags, not a hand-picked subset that rots
    // as packages grow) never count; a ROUSED one does (it's genuinely hunting).
    if (nativeHost.enemiesOf(hero).some(e => !e.passive
      && !(nativeHost.isAmbientTag(e.tag) && !e.aiAwakened) && dist(e.pos, hero.pos) < 350)) {
      nativeHost.seatNote(seat, hero.pos, 'cannot waypoint while hunted', '#d05050', 13);
      return false;
    }
    if (nativeHost.shardWorld) {
      // THE ROADS PER PLAYER: the seat lands at the far stone (resolved there),
      // and a freshly woken zone clears its bubble around the arrival.
      nativeHost.shardWorld.enqueue({ seatId: seat.id, dest: zoneId, from: null,
        landing: dw => dw.waypointPos ? { at: { x: dw.waypointPos.x, y: dw.waypointPos.y + 50 }, spread: 80, band: [-10, 60] } : 'entry',
        after: (dw, s, woke) => { if (woke) dw.clearWaypointLanding(dw.seatHero(s)); } });
      return true;
    }
    nativeHost.loadZone(zoneId);
    if (nativeHost.waypointPos) {
      const wp = nativeHost.waypointPos;
      // THE PARTY-LANDING LAW: seats AND every carried court body ride to the
      // waypoint (an ALLY's pets too — owner seated, not just the local
      // hero's own) — NOT the enemies loadZone just spawned (they belong out
      // in the zone; moving everything here dumped the whole zone on the player).
      nativeHost.landPartyAt(vec(wp.x, wp.y + 50), { spread: 80, band: [-10, 60] });
      // Spawns were scattered around the ENTRY, but the player lands at the
      // WAYPOINT — which may sit in the thick of them. Clear a safe bubble:
      // shove any too-close enemy out to its own far point from the landing.
      // EXCEPT zone-memory survivors (fromZoneGen) — they keep their remembered
      // positions (waypointing into a remembered zone shows it as you left it).
      for (const a of nativeHost.actors) {
        if (a.team === 'enemy' && !a.dead && a.owner !== nativeHost.player && !a.fromZoneGen
          && dist(a.pos, nativeHost.player.pos) < WAYPOINT_CLEAR) {
          a.pos = nativeHost.clampPos(nativeHost.farPoint(WAYPOINT_CLEAR), a.radius);
        }
      }
    }
    return true;
  }

export function sceneBuyHarborChart(nativeHost:NativeSceneCampaignFrameClosureHost, omenId: string, seat: Seat = nativeHost.localSeat): void {
    const o = collectOmens(nativeHost).find(x => x.id === omenId && (x.dimension ?? 'surface') === 'surface');
    const z = o?.zoneId ? nativeHost.zoneMap[o.zoneId] : undefined;
    if (!o || !z || nativeHost.omenRevealed.has(o.id) || nativeHost.chartsBought.has(o.id)) return;
    const H = PORT_CFG.hearsay;
    const price = Math.max(H.chartPriceMin, Math.round(coordDist(o.at, nativeHost.zone.map) * H.chartPricePerDist));
    if (nativeHost.mortalValueOf(seat) < price) {
      nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 60),
        `the chart asks essence worth ${price} — beyond your carry`, '#e8a050', 14);
      return;
    }
    if (!nativeHost.spendMortalValue(seat, price, 'harbor:chart')) return;
    nativeHost.chartsBought.add(o.id); // the paid once-guard — rides the save
    nativeHost.omenRevealed.add(o.id);
    nativeHost.surveyAround(z, H.chartReveal);
    nativeHost.notice('The chart is inked — far country is marked on your map.', '#7fd0ff', 15, 'civic');
  }

export function sceneAcceptBounty(nativeHost:NativeSceneCampaignFrameClosureHost, id: string, seat: Seat = nativeHost.localSeat): boolean {
    if (!nativeHost.graphWorkAvailable() && !massBountiesAvailable(nativeHost)) return false;
    nativeHost.reconcileBounties();
    const i = nativeHost.bountyOffers.findIndex(p => p.id === id);
    if (i < 0) return false;
    const p = nativeHost.bountyOffers[i];
    const hosted = !!nativeHost.localSeat.keeper;
    if (hosted && !nativeHost.nearBountyBoard(seat, p.boardId)) return false; // THE BOARD PER SEAT: a posting is taken at its board
    if (nativeHost.massRuntime && (!p.massBounty || massBountyAccept(nativeHost, p)) || !nativeHost.massRuntime && p.massBounty) return false;
    const row = BOUNTY_KINDS[p.kind];
    if (!row) return false;
    const cap = QUEST_CATEGORY_CAPS.bounty ?? 1;
    if (nativeHost.bountyHands.filter(h => h.boardId === p.boardId && (!hosted || h.holder === seat.id)).length >= cap) { // THE BOARD PER SEAT: one hand per seat per board
      nativeHost.notice('One bounty in hand at a time — see the taken work through first.', BOUNTY_BOARD_CFG.accent, 14, 'civic');
      return false;
    }
    const reason = row.annulled?.(nativeHost, p) ?? (row.done(nativeHost, p) ? 'the work is already done' : null);
    if (reason) {
      nativeHost.bountyOffers.splice(i, 1);
      nativeHost.notice(`The posting is struck — ${reason}.`, BOUNTY_BOARD_CFG.accent, 14, 'civic');
      nativeHost.charDirty = true;
      return false;
    }
    // THE WORLD ACT at the take (M3 — the summons' ignition): a kind may
    // seal its accept with a world act, run BEFORE the hand seats; a
    // refusal (the room filled between the arm and the take) strikes the
    // posting with its courtesy — the stale-offer race law.
    if (!p.massBounty && p.pay.level !== undefined && !nativeHost.bountyApproaches(p.boardId, false).has(p.expedition?.anchor ?? p.zoneId)) {
      nativeHost.notice('The approach is blocked or beyond this board’s travel budget. The posting remains on the slate.', BOUNTY_BOARD_CFG.accent, 14, 'civic');
      return false;
    }
    const actRefusal = row.accept?.(nativeHost, p) ?? null;
    if (actRefusal) {
      nativeHost.bountyOffers.splice(i, 1);
      nativeHost.notice(`The posting is struck — ${actRefusal}.`, BOUNTY_BOARD_CFG.accent, 14, 'civic');
      nativeHost.charDirty = true;
      return false;
    }
    nativeHost.bountyOffers.splice(i, 1);
    if (hosted) { p.holder = seat.id; if (seat.meta.charId) p.holderChar = seat.meta.charId; } // THE BOARD PER SEAT: the taker holds it
    nativeHost.bountyHands.push(p);
    nativeHost.activeQuests.push({ questId: p.id, zoneId: p.zoneId, fieldDone: false });
    // THE CLAIM LANE's veil, per kind and face (walk-1 card 4): a charge or
    // a lift-face errand TELLS you the way; the omen-face errand keeps
    // discovery the ask — no lift, an aging omen instead (bountyOmens).
    p.acceptAt = nativeHost.time;
    const lifts = p.kind !== 'errand' || p.face === 'lift';
    const z = nativeHost.zoneMap[p.zoneId];
    if (lifts && z?.veiled) {
      z.veiled = false;
      nativeHost.refreshExitLabels();
    }
    nativeHost.questStamp('bounties_accepted'); // THE CHARACTER'S QUESTS: the hand's own board history
    if (nativeHost.metaProgressionActive()) {
      nativeHost.account.ledger[BOUNTY_BOARD_CFG.boardIntroduction.receipt] = 1;
      nativeHost.accountDirty = true;
    }
    const c = row.copy(nativeHost, p);
    nativeHost.notice(`Bounty taken: ${c.title}. Pay on return: ${describeBountyPay(p.pay)}.`, BOUNTY_BOARD_CFG.accent, 16, 'civic');
    nativeHost.charDirty = true;
    return true;
  }

export function sceneAbandonBounty(nativeHost:NativeSceneCampaignFrameClosureHost, id: string, seat: Seat = nativeHost.localSeat): boolean {
    const p = nativeHost.bountyHands.find(h => h.id === id);
    if (!p || !nativeHost.withQuestHand(seat, () => nativeHost.handOwns(p))) return false; // THE BOARD PER SEAT: only its holder forfeits it
    nativeHost.bountyHands = nativeHost.bountyHands.filter(h => h.id !== id);
    const ai = nativeHost.activeQuests.findIndex(e => e.questId === id);
    if (ai >= 0) nativeHost.activeQuests.splice(ai, 1);
    nativeHost.questStamp('bounties_abandoned'); // THE CHARACTER'S QUESTS
    nativeHost.notice('The posting is forfeit — the board keeps its silence.', BOUNTY_BOARD_CFG.accent, 14, 'civic');
    nativeHost.charDirty = true;
    return true;
  }

export function sceneTurnInBounty(nativeHost:NativeSceneCampaignFrameClosureHost, id: string, seat: Seat = nativeHost.localSeat): boolean {
    const p = nativeHost.bountyHands.find(h => h.id === id);
    if (!p || !nativeHost.withQuestHand(seat, () => nativeHost.handOwns(p))) return false; // THE BOARD PER SEAT: only its holder turns it in
    // THE KINSHIP: a hand turns in at ITS OWN board — the writ walks home
    // to where it was posted (one hand per board, one payout counter each).
    if (!nativeHost.nearBountyBoard(seat, p.boardId)) return false;
    const row = BOUNTY_KINDS[p.kind];
    if (!row) return false;
    // THE READINESS LAW: the counter turns in what the ONE fold reads —
    // the same standing the journal, the map and the prompt spoke.
    const standing = nativeHost.handState(p);
    if (standing === 'failed') {
      nativeHost.bountyHands = nativeHost.bountyHands.filter(h => h.id !== id);
      const ai = nativeHost.activeQuests.findIndex(e => e.questId === id);
      if (ai >= 0) nativeHost.activeQuests.splice(ai, 1);
      nativeHost.questStamp('bounties_failed'); // THE CHARACTER'S QUESTS
      nativeHost.notice('The board takes the failed posting back — no pay, no debt.', BOUNTY_BOARD_CFG.accent, 15, 'civic');
      nativeHost.charDirty = true;
      nativeHost.bountyReceipt = { boardId: p.boardId, title: row.copy(nativeHost, p).title, pay: '', failed: true, at: nativeHost.time, ...(nativeHost.localSeat.keeper ? { seat: seat.id } : {}) };
      // The fail lane resolves LIKE a turn-in (walk-1's ruling) — the
      // refresh rides both endings; only the resolving board re-deals.
      nativeHost.refreshBountySlate(p.boardId);
      return true;
    }
    if (standing !== 'ready') { // THE READINESS LAW's refusal: the same fold every tell spoke
      nativeHost.notice('The work stands unfinished — the ask is printed on the card.', BOUNTY_BOARD_CFG.accent, 14, 'civic');
      return false;
    }
    const aq = nativeHost.activeQuests.find(e => e.questId === id);
    // pays essence + stamps (the bounty branch); on a hosted world at the turning seat's feet (THE QUEST HAND)
    if (aq) { if (nativeHost.localSeat.keeper) nativeHost.withQuestHand(seat, () => nativeHost.onQuestZoneCleared(aq)); else nativeHost.onQuestZoneCleared(aq); }
    // The richer lanes (unique/lot/pouch/gem) pay HERE with the turning
    // seat in hand (the pouch merges into that seat's bag) — the payout
    // site's branch owns the stamps + the essence lane.
    nativeHost.payBountyLanes(p, seat);
    nativeHost.bountyHands = nativeHost.bountyHands.filter(h => h.id !== id);
    nativeHost.charDirty = true;
    // THE RECEIPT: the re-opened board prints what this paid (the counter
    // laws — the pay is read at the slate, not only heard as a notice).
    nativeHost.bountyReceipt = { boardId: p.boardId, title: row.copy(nativeHost, p).title, pay: describeBountyPay(p.pay), failed: false, at: nativeHost.time, ...(nativeHost.localSeat.keeper ? { seat: seat.id } : {}) };
    // THE TURN-IN REFRESH: the collected hand re-deals ITS board's slate
    // — the same dwell pays the finished work and offers the fresh hand;
    // every other board's slate stands (the shared beat is the clock).
    nativeHost.refreshBountySlate(p.boardId);
    return true;
  }

export function sceneSetBountyLock(nativeHost:NativeSceneCampaignFrameClosureHost, id: string, locked: boolean, seat: Seat = nativeHost.localSeat): boolean {
    const p = nativeHost.bountyOffers.find(o => o.id === id);
    if (!p) return false;
    if (nativeHost.localSeat.keeper && !nativeHost.nearBountyBoard(seat, p.boardId)) return false; // THE BOARD PER SEAT: a pin is set at the board
    if (!locked) {
      if (p.locked) { delete p.locked; nativeHost.charDirty = true; }
      return true;
    }
    if (p.locked) return true;
    const pinned = nativeHost.bountyOffers.filter(o => o.locked).length;
    if (pinned >= nativeHost.bountyLockCapacity()) {
      nativeHost.notice(nativeHost.bountyLockCapacity() === 0
        ? 'The board holds no reserve pins — the Vault sells the service.'
        : 'Every reserve pin is spoken for — release one first.', BOUNTY_BOARD_CFG.accent, 14, 'civic');
      return false;
    }
    p.locked = true;
    nativeHost.charDirty = true;
    return true;
  }

export function sceneForgeBegin(nativeHost:NativeSceneCampaignFrameClosureHost, writUid: number, baseId: string, pad: boolean, seat: Seat = nativeHost.localSeat): boolean {
    if (nativeHost.traceRuns.some(r => r.seatId === seat.id)) return false;
    const it = seat.meta.items.find(x => x.uid === writUid);
    if (!it?.writ) return false;
    const rest = (nativeHost.traceRests.get(writUid) ?? 0) - nativeHost.time;
    if (rest > 0) {
      nativeHost.notice(`The ruined line still smarts — the writ rests ${Math.ceil(rest)}s more.`, BOUNTY_BOARD_CFG.accent, 13, 'civic');
      return false;
    }
    if (!nativeHost.forgeBases(writUid, seat).some(b => b.id === baseId)) return false;
    // The rite's own calm law: no forging with the blood hot or teeth near (on a hosted
    // world the seat's own blood: THE COUNTERS AND THE JOURNAL).
    const forgeCombat = nativeHost.localSeat.keeper ? nativeHost.seatHero(seat).lastCombatAt : nativeHost.lastCombatAt;
    if (nativeHost.time - forgeCombat < SWAP_DISCIPLINE_CFG.calmSec && !nativeHost.isSafeAt(seat.actor.pos)) {
      nativeHost.notice('The hand is not steady yet — let the blood cool.', BOUNTY_BOARD_CFG.accent, 13, 'civic');
      return false;
    }
    if (nativeHost.pressingFoeNear(seat.actor.pos, seat.actor.tier)) return false;
    const complexity = it.writ.complexity ?? (it.writ as { tier?: number }).tier ?? 1;
    const shape = traceShapeForCategory(it.writ.category, complexity);
    const band = traceBandFor(complexity, pad ? 'pad' : 'mouse');
    const path = buildTracePath(shape, seat.actor.pos.x, seat.actor.pos.y - 40 - TRACE_CFG.drawSize / 2, band);
    // THE PAUSE LAW (the rite's policy verbatim): solo holds, shared runs.
    const held = nativeHost.timeflow.allowHold({ id: 'trace', scale: 0, kind: 'trace' })
      && nativeHost.timeflow.holdSurface('trace');
    nativeHost.traceRuns.push({
      seatId: seat.id, path, state: freshTraceState(), held,
      writUid, baseId, complexity, ilvl: it.ilvl,
      slipCap: traceSlipCapFor(complexity),
    });
    return true;
  }

export function sceneForgeCancel(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    const i = nativeHost.traceRuns.findIndex(r => r.seatId === seat.id);
    if (i < 0) return false;
    if (nativeHost.traceRuns[i].held) nativeHost.timeflow.release('trace');
    nativeHost.traceRuns.splice(i, 1);
    nativeHost.notice('The hand steps away — the writ endures.', BOUNTY_BOARD_CFG.accent, 13, 'civic');
    return true;
  }

export function scenePostHoldWrits(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    // SOVEREIGNTY: census — writ targets by distance (the derived census, probe_tiers RIG T).
    const hold = nativeHost.holdStateFor(nativeHost.zone);
    if (!hold) return;
    const W = HARBORHOLD_CFG.writs;
    if (hold.writsAt !== undefined && nativeHost.time < hold.writsAt) {
      const left = Math.ceil((hold.writsAt - nativeHost.time) / 60);
      nativeHost.notice(`the board rests — fresh writs in ${left} minute${left === 1 ? '' : 's'}`, '#c8b048', 13, 'civic');
      return;
    }
    const eligible = nativeHost.countedEnemies().filter(a =>
      a.tag !== 'bounty_mark' && (a.rarity ?? 'normal') === 'normal' && !a.owner);
    if (!eligible.length) {
      nativeHost.notice('the coast is quiet — no quarry worth a writ', '#c8b048', 13, 'civic');
      return;
    }
    const n = Math.min(eligible.length, nativeHost.encRng.int(W.count[0], W.count[1]));
    let posted = 0;
    for (let i = 0; i < n; i++) {
      // Farthest-first: writs send you OUT into the zone, never at your boots.
      eligible.sort((a, b) => dist(b.pos, nativeHost.player.pos) - dist(a.pos, nativeHost.player.pos));
      const m = eligible.shift();
      if (!m) break;
      nativeHost.promoteRarityStacked(m, W.rarity as MonsterRarity, W.stacks);
      const fac = m.faction ?? (m.defId ? MONSTERS[m.defId]?.faction : undefined) ?? '';
      let name = mintNemesisName(fac, () => nativeHost.encRng.range(0, 1));
      for (let tries = 0; tries < 4
        && nativeHost.actors.some(a => a !== m && a.tag === 'bounty_mark' && a.name === name); tries++) {
        name = mintNemesisName(fac, () => nativeHost.encRng.range(0, 1));
      }
      m.name = name;
      m.tag = 'bounty_mark';
      posted++;
    }
    if (!posted) return;
    hold.writsAt = nativeHost.time + W.cooldownSec;
    nativeHost.charDirty = true;
    nativeHost.notice(`${posted} writ${posted === 1 ? '' : 's'} posted — the coast wants clearing`, '#e8a84a', 15, 'civic');
    nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y), radius: 90, color: '#e8a84a', life: 0.5, maxLife: 0.5 });
  }

export function sceneBeginHoldMuster(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const def = nativeHost.zone;
    const hold = def.harborhold;
    if (!hold || hold.state !== 'besieged' || nativeHost.holdDefense || nativeHost.gameOver) return;
    const cls = holdClassOf(hold);
    const ps = holdStructureIn(nativeHost.structures, cls.structure);
    const gate = ps ? holdGateDoor(ps) : null;
    if (!ps || !gate) return;
    const lvl = Math.max(1, def.level);
    const at = holdGateApron(gate, 96);
    const ward = nativeHost.createMonster(FIXTURE_IDS.quay_ward, lvl, 'player');
    const target = Math.round(cls.siege.wardLife + cls.siege.wardLifePerLevel * lvl);
    // The pool is the CLASS CURVE exactly: one 'more' source scales whatever
    // the def + level scaler produced onto the target — exact by construction
    // wherever flat mods sit in the layer stack (a flat here would ride UNDER
    // the level multiplier and miss high).
    const bare = ward.maxLife();
    if (bare > 0) ward.sheet.setSource('hold_ward', [{ stat: 'life', kind: 'more', value: target / bare - 1 }]);
    ward.life = ward.maxLife();
    ward.pos = nativeHost.clampPos(vec(at.x, at.y), ward.radius);
    ward.tag = 'hold_ward';
    ward.eventKey = `harborhold:${def.id}`;
    // THE ARMING SHIELD (the extraction-node discipline): scenery until the
    // first wave lands — the zone's own roamers must not chew the ward while
    // the horn still echoes. Cleared when wave 1 opens; from then on ambient
    // locals joining the tide is the coast's honest flavor.
    ward.untargetable = true;
    ward.invulnerable = true;
    nativeHost.actors.push(ward);
    hold.fallAt = undefined; // the muster pauses the deadline — the fight decides now
    nativeHost.holdDefense = {
      zoneId: def.id, phase: 'arming', wave: 0, phaseAt: nativeHost.time + cls.siege.armSec,
      wardId: ward.id, alive: new Set(), toSpawn: 0, spawnAt: 0,
      pulseAt: nativeHost.time + cls.siege.beaconSec,
    };
    nativeHost.text(vec(at.x, at.y - 44), `the horn sounds — the tide answers in ${cls.siege.armSec}s`, '#e8a050', 16);
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: 110, color: '#e8a050', life: 0.6, maxLife: 0.6 });
  }

export function sceneBuyHoldRestore(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): void {
    const def = nativeHost.zone;
    const hold = def.harborhold;
    if (!hold || hold.state !== 'fallen') return;
    const cls = holdClassOf(hold);
    const price = holdRestoreCost(cls, Math.max(1, def.level));
    if (nativeHost.mortalValueOf(seat) < price) {
      nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 60),
        `the restoration asks essence worth ${price} — beyond your carry`, '#e8a050', 14);
      return;
    }
    if (!nativeHost.spendMortalValue(seat, price, 'hold:restore')) return;
    hold.state = 'besieged';
    hold.rebuildAt = undefined;
    nativeHost.refreshHoldDress(def);
    nativeHost.refreshHoldServices(def);
    nativeHost.notice(`${def.name} is raised from its ashes — break the siege to open its gates`, '#7fd0ff', 15, 'war');
  }

export function scenePayHoldfastToll(nativeHost:NativeSceneCampaignFrameClosureHost, _index: number, seat: Seat = nativeHost.localSeat): boolean {
    const site = nativeHost.holdfastSite;
    const hf = nativeHost.sim.holdfastField;
    if (!site || !hf || !hf.isLocked(site.zoneId, site.lockId)) return false;
    // The parley needs the WHOLE band calm (alive + neutral) — once you've drawn blood
    // or left one roused, the toll is off and only the slaughter remains (see holdfastKeeper).
    const keeper = nativeHost.holdfastKeeper();
    if (!keeper) return false;
    if (dist(seat.actor.pos, keeper.pos) > transitRadius('holdfast', 78) + 50) return false;
    const gdef = hf.def(site.defId);
    if (!gdef) return false;
    const u = gdef.unlock;
    if (u.kind === 'pay-currency' && u.currency === 'mortal') {
      // THE MORTAL EXCHANGE: the toll drains the PAYING seat's carried
      // essence — any seat may treat from its own wallet now that the purse
      // is the carry, not the host's account. A TINTED gate (UnlockSpec.tint)
      // accepts ONE essence and no other, counted in that tint's own units;
      // the plain gate takes mixed wallet value at the strict rates.
      const cost = holdfastTollCost(gdef, nativeHost.zone.level);
      const ask = holdfastTollLabel(gdef, nativeHost.zone.level);
      if (u.tint) {
        if ((seat.meta.essences[u.tint] ?? 0) < cost) {
          nativeHost.text(seat.actor.pos,
            `the wardens take only ${ESSENCES[u.tint].label} — ${ask}, counted out`, '#d05050', 13);
          return false;
        }
        if (!nativeHost.spendEssence(seat, { essence: u.tint, count: cost }, 'holdfast:toll')) return false;
        nativeHost.markMetaDirty(seat);
        if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) nativeHost.saveCharacter();
      } else {
        if (nativeHost.mortalValueOf(seat) < cost) {
          nativeHost.text(seat.actor.pos,
            `the wardens want essence worth ${cost} — come back richer`, '#d05050', 13);
          return false;
        }
        if (!nativeHost.spendMortalValue(seat, cost, 'holdfast:toll')) return false;
      }
      nativeHost.text(keeper.pos, `the wardens take ${ask}`, gdef.marker?.color ?? '#c8a04a', 14);
      nativeHost.openHoldfastExit('the toll is paid — the gate opens!');
      return true;
    }
    if (u.kind === 'pay-gem') {
      // THE RESIDENCE: loose supports are bag wrapper items now.
      const loose = seat.meta.items.filter(i => i.gem?.kind === 'support');
      if (loose.length === 0) {
        nativeHost.text(seat.actor.pos, 'the wardens sneer — you carry nothing worth taking', '#d05050', 13);
        return false; // no loose gems → the gate stays sealed (find another road)
      }
      const pick = loose[Math.floor(rand(0, loose.length))]; // random-take: the warden chooses
      const gem = supportOfGemItem(pick);
      removeFromBag(seat.meta.items, pick.uid); // the warden TAKES it (consumed, not dropped)
      nativeHost.markMetaDirty(seat);
      if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) nativeHost.saveCharacter();
      nativeHost.text(keeper.pos, `the wardens take your ${gem?.def.name ?? pick.name}`, gem?.def.color ?? '#c8a04a', 14);
      nativeHost.openHoldfastExit('the toll is paid — the gate opens!');
      return true;
    }
    return false; // unimplemented unlock kinds never pay (pickDef keeps them from rolling)
  }

export function sceneEquipItem(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, slotId?: string): void {
    const m = seat.meta;
    const p = seat.actor;
    const fromSlot = nativeHost.wornSlotOf(seat, uid);
    const item = nativeHost.bagItem(seat, uid) ?? (fromSlot ? m.equipped[fromSlot] : undefined);
    if (!item) return;
    const base = ITEM_BASES[item.baseId];
    if (!base) return;
    let slot = slotId ? SLOT_BY_ID[slotId] : undefined;
    if (slot && (!slot.enabled || !slot.accepts.includes(base.category))) slot = undefined;
    if (!slot) {
      const options = slotsForCategory(base.category);
      if (options.length === 0) return;
      slot = options.find(s => !m.equipped[s.id]) ?? options[0];
    }
    if (fromSlot === slot.id) return; // re-seating in place — nothing to do
    const req = itemLevelReq(item);
    if (p.level < req) {
      nativeHost.failNote(p, 'equip:' + uid, `requires level ${req}`);
      return;
    }
    if (fromSlot) delete m.equipped[fromSlot];
    else removeFromBag(m.items, uid);
    const prev = m.equipped[slot.id];
    m.equipped[slot.id] = item;
    delete item.x;
    delete item.y;
    if (prev) {
      // Displaced piece: the vacated source slot first (the true swap), then
      // the bag, then the floor.
      const back = fromSlot ? SLOT_BY_ID[fromSlot] : undefined;
      const prevBase = ITEM_BASES[prev.baseId];
      if (back?.enabled && prevBase && back.accepts.includes(prevBase.category) && !m.equipped[back.id]) {
        m.equipped[back.id] = prev;
      } else if (!autoPlace(m.items, prev)) {
        nativeHost.dropGearAt(p.pos, prev, seat.id);
      }
    }
    nativeHost.recalcSeat(seat);
    nativeHost.text(p.pos, item.name, ITEM_RARITIES[item.rarity].color, 13);
    nativeHost.markMetaDirty(seat);
  }

export function sceneUnequipItem(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, slotId: string, x?: number, y?: number): void {
    const m = seat.meta;
    const item = m.equipped[slotId];
    if (!item) return;
    if (x !== undefined && y !== undefined) {
      if (!placeAt(m.items, item, x, y)) {
        nativeHost.failNote(seat.actor, 'unequip:' + slotId, 'no room there');
        return;
      }
    } else if (!autoPlace(m.items, item)) {
      nativeHost.failNote(seat.actor, 'unequip:' + slotId, 'no room in the bag');
      return;
    }
    delete m.equipped[slotId];
    nativeHost.recalcSeat(seat);
    nativeHost.markMetaDirty(seat);
  }

export function sceneMoveBagItem(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, x: number, y: number): void {
    const m = seat.meta;
    const item = nativeHost.bagItem(seat, uid);
    if (!item) return;
    if (placeAt(m.items, item, x, y)) { nativeHost.markMetaDirty(seat); return; }
    // THE SWAP TEST (inventory.ts swapBlockerFits — the one verdict the bag's
    // landing preview paints): null = no swap; the placements below then
    // succeed by construction (the revert stays as the belt).
    const other = swapBlockerFits(m.items, item, x, y);
    if (!other || item.x === undefined || item.y === undefined) return;
    const from = { x: item.x, y: item.y };
    const otherFrom = { x: other.x, y: other.y };
    delete other.x;
    delete other.y;
    if (placeAt(m.items, item, x, y) && placeAt(m.items, other, from.x, from.y)) {
      nativeHost.markMetaDirty(seat);
      return;
    }
    item.x = from.x; item.y = from.y;
    other.x = otherFrom.x; other.y = otherFrom.y;
  }

export function sceneSortBag(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, mode: string, dir: BagSortDir = 'desc'): void {
    if (!sortBagItems(seat.meta.items, mode, undefined, dir)) return;
    nativeHost.markMetaDirty(seat);
  }

export function sceneDropGearFromBag(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number): void {
    const m = seat.meta;
    // THE KEEPER'S MARK HOLDS (her ruling 2026-09-05: a lock LOCKS — no
    // salvage, no drop, no sort; equip and unequip alone pass): a locked
    // thing never leaves the hand, bag or worn, gem or gear.
    const found = findCarried(m, uid);
    if (!found) return;
    if (found.item.relicKey) return; // Account property cannot become tradeable ground loot.
    if (found.item.questId) { nativeHost.failNote(seat.actor, 'drop:' + uid, 'Bring this back to its quest giver.'); return; }
    if (found.item.locked) { nativeHost.failNote(seat.actor, 'drop:' + uid, 'locked — hold right-click to unlock'); return; }
    if (found.where.kind === 'bag' && found.item.gem) { nativeHost.dropGemFromBag(seat, uid); return; }
    let item: ItemInstance | undefined;
    if (found.where.kind === 'worn') {
      item = m.equipped[found.where.slot];
      delete m.equipped[found.where.slot];
      nativeHost.recalcSeat(seat);
    } else if (found.where.kind === 'container') {
      // THE CONTAINER FABRIC: a seated piece dragged onto the world sheds
      // its lines as it falls, exactly as a worn piece does.
      const held = m.containers[found.where.container];
      held.splice(held.indexOf(found.item), 1);
      if (!held.length) delete m.containers[found.where.container];
      item = found.item;
      nativeHost.recalcSeat(seat);
    } else {
      item = removeFromBag(m.items, uid);
    }
    if (!item) return;
    nativeHost.dropGearAt(seat.actor.pos, item, seat.id);
    nativeHost.markMetaDirty(seat);
  }

export function sceneOracleRelic(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, operation: 'store' | 'equip' | 'unseat' | 'release' | 'withdraw'): void {
    if (operation === 'unseat' || operation === 'withdraw') { nativeHost.withdrawRelic(seat, uid); return; }
    if (!nativeHost.canManageAccountRelics(seat) || !nativeHost.account.features.has(FEATURE.RELIQUARY)) return;
    if (operation === 'equip') { nativeHost.seatAccountRelic(seat, uid); return; }
    if (operation === 'release') {
      const item = nativeHost.account.reliquary.items.find(i => i.uid === uid);
      if (!item || item.locked || nativeHost.account.reliquary.seated.includes(item.relicKey!) || nativeHost.account.reliquary.carried.includes(item.relicKey!)) return;
      nativeHost.account.reliquary.released.push(item.relicKey!);
      nativeHost.account.reliquary.items = nativeHost.account.reliquary.items.filter(i => i !== item);
      delete nativeHost.account.reliquary.stash.cells[item.relicKey!];
      nativeHost.persistAccountRelics(seat); return;
    }
    nativeHost.relicStashMove(seat, uid);
  }

export function sceneReliquaryToggle(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, enabled: boolean): void {
    const refusal = nativeHost.reliquaryRefusal(seat);
    if (refusal) { nativeHost.failNote(seat.actor, 'reliquaryToggle', refusal); return; }
    if (nativeHost.account.reliquary.enabled === enabled) return;
    nativeHost.account.reliquary.enabled = enabled;
    if (!enabled) for (const body of nativeHost.actors) {
      if (!body.dead && body.owner === nativeHost.seatHero(seat) && body.summonInst?.relicSource) nativeHost.kill(body, true);
    }
    const hero = nativeHost.seatHero(seat), life = hero.life / Math.max(1, hero.maxLife());
    nativeHost.recalcSeat(seat);
    hero.life = hero.maxLife() * life;
    nativeHost.persistAccountRelics(seat);
  }

export function sceneWithdrawRelic(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, x?: number, y?: number): void {
    const item = nativeHost.account.reliquary.items.find(i => i.uid === uid);
    if (!item || nativeHost.account.reliquary.carried.includes(item.relicKey!)) return;
    const equipped = (seat.meta.containers.reliquary ?? []).includes(item);
    if (equipped ? !!nativeHost.reliquaryRefusal(seat) : !nativeHost.canManageAccountRelics(seat)) return;
    const trial = { ...item }; delete trial.x; delete trial.y;
    const bag = seat.meta.items.map(i => ({ ...i }));
    const fits = x !== undefined && y !== undefined ? placeAt(bag, trial, x, y) : autoPlace(bag, trial);
    if (!fits) { nativeHost.failNote(seat.actor, 'relicBag', 'No room in your pack.'); return; }
    seat.meta.containers.reliquary = (seat.meta.containers.reliquary ?? []).filter(i => i !== item);
    delete nativeHost.account.reliquary.stash.cells[item.relicKey!];
    item.x = trial.x; item.y = trial.y; seat.meta.items.push(item);
    nativeHost.recalcSeat(seat); nativeHost.persistAccountRelics(seat);
  }

export function sceneRelicStashMove(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, target?: StashCell): void {
    if (!nativeHost.canManageAccountRelics(seat) || !nativeHost.account.features.has(FEATURE.RELIQUARY)) return;
    const bagged = seat.meta.items.find(i => i.uid === uid);
    const item = bagged ?? nativeHost.account.reliquary.items.find(i => i.uid === uid);
    if (!item || !isRelic(item) || item.questId) return;
    if ((seat.meta.containers.reliquary ?? []).includes(item) && nativeHost.reliquaryRefusal(seat)) return;
    const plan = planRelicStorage(nativeHost.account, item, target);
    if (!plan) { nativeHost.failNote(seat.actor, 'stash:' + uid, 'No room in the Relic stash. Make space or unlock another page in the Vault.'); return; }
    const incoming = !item.relicKey;
    const stored = bankRelic(nativeHost.account, item, seat.meta.relicScope ?? (seat.meta.charId || 'run:' + nativeHost.manifest.seed));
    if (!stored) return;
    if (incoming) { plan.cells[stored.relicKey!] = plan.cells.incoming; delete plan.cells.incoming; }
    if (bagged) removeFromBag(seat.meta.items, uid);
    seat.meta.containers.reliquary = (seat.meta.containers.reliquary ?? []).filter(i => i !== stored);
    delete stored.x; delete stored.y;
    nativeHost.account.reliquary.stash = plan;
    nativeHost.recalcSeat(seat);
    nativeHost.persistAccountRelics(seat);
  }

export function scenePersonalStash(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, operation: 'store' | 'take' | 'move', x?: number, y?: number): void {
    const def = STASH_DEFS[nativeHost.seatModeDef(seat).stash ?? ''];
    if (!def || !nativeHost.canManageAccountRelics(seat)) return;
    const stash = seat.meta.stash ?? { items: [], layout: emptyStash(def) };
    const item = (operation === 'store' ? seat.meta.items : stash.items).find(i => i.uid === uid);
    if (!item || !def.accepts(item)) return;
    if (operation === 'take') {
      // Prove the destination before changing either owner.
      const trial = { ...item }; delete trial.x; delete trial.y;
      const bag = seat.meta.items.map(i => ({ ...i }));
      const fit = x !== undefined && y !== undefined ? placeAt(bag, trial, x, y) : autoPlace(bag, trial);
      if (!fit) { nativeHost.failNote(seat.actor, 'stash:' + uid, 'No room in your pack.'); return; }
      stash.items = stash.items.filter(i => i !== item); delete stash.layout.cells[String(uid)];
      item.x = trial.x; item.y = trial.y; seat.meta.items.push(item);
    } else {
      const target = x !== undefined && y !== undefined ? { page: 0, x, y } : undefined;
      const plan = planStashMove(def, personalStashEntries(stash), stash.layout, { key: String(uid), item }, target);
      if (!plan) { nativeHost.failNote(seat.actor, 'stash:' + uid, 'No room in this personal locker.'); return; }
      if (operation === 'store') { removeFromBag(seat.meta.items, uid); stash.items.push(item); }
      delete item.x; delete item.y; stash.layout = plan;
    }
    seat.meta.stash = stash;
    nativeHost.markMetaDirty(seat);
  }

export function sceneOracleAttune(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): void {
    if (!nativeHost.canManageAccountRelics(seat) || !nativeHost.account.features.has(FEATURE.RELIQUARY)
      || nativeHost.account.ledger[RELIQUARY_CFG.attunement]) return;
    nativeHost.account.ledger[RELIQUARY_CFG.attunement] = 1;
    nativeHost.persistAccountRelics(seat);
  }

export function sceneContainerPlace(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, containerId: string, uid: number, x?: number, y?: number): void {
    if (containerId === 'reliquary') { nativeHost.seatAccountRelic(seat, uid, x, y); return; }
    const m = seat.meta;
    const def = CONTAINERS[containerId];
    if (!def) return;
    const item = nativeHost.bagItem(seat, uid);
    if (!item) return;
    const board = containerBoard(def);
    const level = nativeHost.seatHero(seat).level;
    const refusal = containerSeatRefusal(def, board, item, level);
    if (refusal || !board) { nativeHost.failNote(seat.actor, 'seat:' + uid, refusal ?? 'refused'); return; }
    const held = nativeHost.containerHeld(seat, def.id);
    const dims = boardDims(board);
    if ((x === undefined || y === undefined) && uniqueContainerRefusal(held, item)) {
      nativeHost.failNote(seat.actor, 'seat:' + uid, uniqueContainerRefusal(held, item)!); return;
    }
    const from = { x: item.x, y: item.y };
    const restore = (): void => {
      if (!(from.x !== undefined && from.y !== undefined && placeAt(m.items, item, from.x, from.y))) autoPlace(m.items, item);
    };
    if (x !== undefined && y !== undefined) {
      const l = containerLanding(def, board, held, item, 'bag', x, y, level, m.items, bagBoard());
      if (l.verdict === 'blocked') { nativeHost.failNote(seat.actor, 'seat:' + uid, l.why ?? 'no room there'); return; }
      removeFromBag(m.items, uid);
      if (l.verdict === 'swap' && l.with) {
        // The displaced piece takes the cell the mover vacated (the landing
        // law proved it fits); a stale verdict falls to first fit, then the
        // floor — never the void.
        held.splice(held.indexOf(l.with), 1);
        delete l.with.x; delete l.with.y;
        if (!(from.x !== undefined && from.y !== undefined && placeAt(m.items, l.with, from.x, from.y))
          && !autoPlace(m.items, l.with)) {
          nativeHost.dropGearAt(seat.actor.pos, l.with, seat.id);
        }
      }
      if (!placeAt(held, item, x, y, dims)) { restore(); return; }
    } else {
      removeFromBag(m.items, uid);
      if (!autoPlace(held, item, dims)) {
        restore();
        nativeHost.failNote(seat.actor, 'seat:' + uid, `no open seat in the ${def.label}`);
        return;
      }
    }
    if (containerId === 'reliquary' && nativeHost.reliquaryLesson() && !nativeHost.clientActionHook) {
      nativeHost.account.ledger[RELIQUARY_LESSON] = 1;
      nativeHost.accountDirty = true;
      saveAccount(nativeHost.account);
      nativeHost.notice('The charm wakes. Its power is yours while seated. Expand your case in the Vault.', '#d8c28a', 18, 'civic');
    }
    nativeHost.recalcSeat(seat);
    nativeHost.text(seat.actor.pos, `${def.glyph} ${item.name}`, ITEM_RARITIES[item.rarity].color, 13);
    nativeHost.markMetaDirty(seat);
  }

export function sceneContainerTake(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, containerId: string, uid: number, x?: number, y?: number): void {
    if (containerId === 'reliquary') { nativeHost.withdrawRelic(seat, uid, x, y); return; }
    const m = seat.meta;
    const held = m.containers[containerId];
    const item = held?.find(i => i.uid === uid);
    if (!held || !item) return;
    const cell = { x: item.x, y: item.y };
    held.splice(held.indexOf(item), 1);
    delete item.x; delete item.y;
    const landed = x !== undefined && y !== undefined ? placeAt(m.items, item, x, y) : autoPlace(m.items, item);
    if (!landed) {
      held.push(item);
      item.x = cell.x; item.y = cell.y;
      nativeHost.failNote(seat.actor, 'unseat:' + uid, x !== undefined ? 'no room there' : 'no room in the bag');
      return;
    }
    if (!held.length) delete m.containers[containerId];
    nativeHost.recalcSeat(seat);
    nativeHost.markMetaDirty(seat);
  }

export function sceneContainerMove(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, containerId: string, uid: number, x: number, y: number): void {
    if (containerId === 'reliquary' && nativeHost.reliquaryRefusal(seat)) return;
    const def = CONTAINERS[containerId];
    const held = seat.meta.containers[containerId];
    const item = held?.find(i => i.uid === uid);
    if (!def || !held || !item) return;
    const board = containerBoard(def);
    if (!board) return;
    const dims = boardDims(board);
    if (placeAt(held, item, x, y, dims)) { nativeHost.recalcSeat(seat); nativeHost.persistAccountRelics(seat); nativeHost.markMetaDirty(seat); return; }
    const other = swapBlockerFits(held, item, x, y, dims);
    if (!other || item.x === undefined || item.y === undefined) return;
    const from = { x: item.x, y: item.y };
    const otherFrom = { x: other.x, y: other.y };
    delete other.x; delete other.y;
    if (placeAt(held, item, x, y, dims) && placeAt(held, other, from.x, from.y, dims)) {
      nativeHost.recalcSeat(seat); nativeHost.persistAccountRelics(seat);
      nativeHost.markMetaDirty(seat);
      return;
    }
    item.x = from.x; item.y = from.y;
    other.x = otherFrom.x; other.y = otherFrom.y;
  }

export function sceneHarvestConsent(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): boolean {
    const ix = nativeHost.harvestOffer.get(seat.id);
    if (ix === undefined) return false;
    const node = nativeHost.harvestNodes[ix];
    if (!node || node.spent) return false;
    nativeHost.harvestOffer.delete(seat.id);
    nativeHost.harvestArm(seat, ix);
    return true;
  }

export function scenePickupNearestGear(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): void {
    const p = seat.actor;
    let bestIdx = -1;
    let bestD = Infinity;
    for (let i = 0; i < nativeHost.drops.length; i++) {
      const d = nativeHost.drops[i];
      if (d.item.kind !== 'gear') continue;
      if (d.grace !== undefined && d.grace > 0) continue;
      if (d.droppedBy === seat.id && !d.dropperCleared) continue;
      const holder = nativeHost.dropHolder(d); // THE TOUCH LAW (card 27): another seat's held drop is no grab
      if (holder !== undefined && holder !== seat.id) continue;
      if ((d.tier ??= nativeHost.spoilStoryAt(d.pos)) !== p.tier) continue; // THE SAME-STORY LAW
      const dd = dist(d.pos, p.pos);
      if (dd <= p.radius + ITEM_CFG.pickupRadius && dd < bestD) { bestD = dd; bestIdx = i; }
    }
    if (bestIdx < 0) return;
    const drop = nativeHost.drops[bestIdx];
    if (drop.item.kind !== 'gear') return;
    const item = drop.item.item;
    if (nativeHost.isBankedRelicEcho(item)) { nativeHost.drops.splice(bestIdx, 1); return; }
    if (item.questId && seat !== nativeHost.localSeat && !nativeHost.localSeat.keeper) return; // keeperSeat: on a shard any hand may carry a quest
    // THE STONE (M2): a lying pouch (a full bag left it) still merges free.
    if (item.mem && nativeHost.tryMergeMemoryItem(seat, item)) {
      nativeHost.drops.splice(bestIdx, 1);
      return;
    }
    if (!autoPlace(seat.meta.items, item)) {
      nativeHost.failNote(p, 'bagfull', 'inventory full');
      return;
    }
    nativeHost.drops.splice(bestIdx, 1);
    if (item.mem) {
      nativeHost.noteMemoryPickup(seat, memoryKindOf(item) ?? 'rough', item.mem.length);
      nativeHost.markMetaDirty(seat);
      return;
    }
    const kRar = ITEM_RARITIES[item.rarity];
    nativeHost.text(p.pos, item.name, kRar.color, 13, 'pickup');
    notePickup(nativeHost.pickupFeed, seat.id, `${item.name} (${kRar.label})`, kRar.color, nativeHost.time);
    nativeHost.markMetaDirty(seat);
  }

export function sceneSalvageItem(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, lane?: 'break' | 'sell'): void {
    const mode = nativeHost.salvageLane(seat, lane);
    if (!mode) return;
    const item = nativeHost.bagItem(seat, uid);
    if (!item) return;
    if (item.relicKey) { nativeHost.failNote(seat.actor, 'relicSale', 'Account Relics belong in your stash or Reliquary.'); return; }
    if (item.questId) { nativeHost.failNote(seat.actor, 'questCargo', 'Bring this back to its quest giver.'); return; }
    if (item.locked) { nativeHost.lockedRefusal(seat); return; }
    // THE STONE (M2) + THE COUNTER'S BUY-BACK (2026-09-12): the BENCH never
    // salvages a pouch — its units are potential, not steel to study — but
    // the scrap COUNTER buys the whole stack back at the per-unit rate
    // (SELL_CFG.memoryUnit × count; the panel's sale prompt guards a stack,
    // the keeper's mark above refuses a locked one, the sweeps never touch
    // pouches). One tile, one blow — the receipt names the count.
    if (item.mem) {
      if (mode !== 'sell') {
        nativeHost.text(seat.actor.pos, MEMORY_CFG.strings.noSalvage, '#c08a68', 12);
        return;
      }
      const kind = memoryKindOf(item) ?? 'rough';
      const count = item.mem.length;
      removeFromBag(seat.meta.items, item.uid);
      nativeHost.grantEssence(seat, sellMemoryYield(kind, count));
      nativeHost.text(vec(seat.actor.pos.x, seat.actor.pos.y - 26), `${count} ${MEMORY_CFG.strings.sold}`, MEMORY_KINDS[kind].color, 12);
      nativeHost.markMetaDirty(seat);
      return;
    }
    if (item.gem) {
      nativeHost.breakOneGemItem(seat, item, mode);
      nativeHost.markMetaDirty(seat);
      return;
    }
    const taught = nativeHost.breakOneItem(seat, item, mode);
    for (const t of taught.filter(x => x.rankedUp)) {
      nativeHost.text(vec(seat.actor.pos.x, seat.actor.pos.y - 26),
        `craft expertise deepens: ${t.family}`, '#c8a84b', 12);
    }
    if (mode === 'break' && nativeHost.metaProgressionActive()) {
      saveAccount(nativeHost.account); // lore is account knowledge — survive the run
    }
    nativeHost.markMetaDirty(seat);
  }

export function sceneSalvageBulk(nativeHost:NativeSceneCampaignFrameClosureHost, 
    seat: Seat, cat: 'item' | 'skill' | 'support',
    rarity?: 'common' | 'magic' | 'rare' | 'unique' | 'legendary',
    lane?: 'break' | 'sell',
  ): void {
    const mode = nativeHost.salvageLane(seat, lane);
    if (!mode) return;
    const m = seat.meta;
    const before: Partial<Record<EssenceId, number>> = { ...m.essences };
    let broke = 0;
    const ranked: string[] = [];
    if (cat === 'item') {
      // Snapshot the eligible set first — breakOneItem splices the bag.
      // GEM WRAPPERS sit out of the gear sweep: they are their own
      // categories below (a "break all gear" blow never eats the memories).
      // The ROUGH MEMORY pouch (M2) sits out of EVERY sweep likewise.
      const targets = m.items.filter(i => !i.gem && !i.mem && !i.locked && !i.questId && !i.relicKey && (!rarity || i.rarity === rarity));
      for (const item of targets) {
        const taught = nativeHost.breakOneItem(seat, item, mode);
        ranked.push(...taught.filter(t => t.rankedUp).map(t => t.family));
        broke++;
      }
      if (broke > 0 && mode === 'break' && nativeHost.metaProgressionActive()) {
        saveAccount(nativeHost.account); // one write for the whole sweep
      }
    } else if (cat === 'skill') {
      // The rarity filter reads the PAYLOAD's own ladder (the wrapper's
      // item-rarity is display grain — 'legendary' lives on the gem).
      const targets = m.items.filter(i => {
        const p = skillGemPayloadOf(i);
        return p && !i.locked && !p.granted && (!rarity || p.rarity === rarity);
      });
      for (const item of targets) { nativeHost.breakOneGemItem(seat, item, mode); broke++; }
    } else {
      const targets = m.items.filter(i => i.gem?.kind === 'support' && !i.locked);
      for (const item of targets) { nativeHost.breakOneGemItem(seat, item, mode); broke++; }
    }
    if (broke > 0) {
      const chips = ESSENCE_IDS
        .map(id => ({ id, n: (m.essences[id] ?? 0) - (before[id] ?? 0) }))
        .filter(g => g.n > 0)
        .map(g => `${g.n}${ESSENCES[g.id].glyph}`)
        .join(' ');
      nativeHost.text(vec(seat.actor.pos.x, seat.actor.pos.y - 26),
        `the hammer falls: ${broke} broken → ${chips || 'nothing'}`, '#c8a84b', 12);
      for (const family of [...new Set(ranked)]) {
        nativeHost.text(vec(seat.actor.pos.x, seat.actor.pos.y - 40),
          `craft expertise deepens: ${family}`, '#c8a84b', 12);
      }
    }
    nativeHost.markMetaDirty(seat);
  }

export function sceneSalvageLockSet(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, on: boolean): void {
    const m = seat.meta;
    // ONE address space: bag, doll, and every side board (findCarried).
    const thing = findCarried(m, uid)?.item;
    if (!thing) return;
    if (on) thing.locked = true;
    else delete thing.locked;
    nativeHost.markMetaDirty(seat);
  }

export function sceneCraftAffix(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, affixId: string, score = 0): void {
    if (!nativeHost.stationReach('salvage', seat)) return;
    const m = seat.meta;
    const wornSlot = Object.keys(m.equipped).find(k => m.equipped[k]?.uid === uid);
    const item = nativeHost.bagItem(seat, uid) ?? (wornSlot ? m.equipped[wornSlot] : undefined);
    if (!item) return;
    if (craftedCount(item) >= nativeHost.craftSlots()) {
      nativeHost.failNote(seat.actor, 'craft:' + uid, 'this piece holds no more craft');
      return;
    }
    const option = craftableAffixesFor(item, nativeHost.account.craftLore).find(o => o.def.id === affixId);
    if (!option) return;
    const rank = expertiseRank(nativeHost.account.craftLore, option.def.family);
    if (!nativeHost.spendEssence(seat, CRAFT_CFG.cost(rank), 'craft:' + affixId)) return;
    // The SMITHING score (host-clamped) lifts the roll toward the unlocked
    // ceiling — quality is the player's hands, never a worn stat.
    const rolled = rollCraftedAffix(option.def, rank, Math.random, Math.max(0, Math.min(1, score)));
    if (!rolled) return;
    item.affixes.push(rolled);
    if (wornSlot) nativeHost.recalcSeat(seat); // live stats move the instant worn gear changes
    nativeHost.text(seat.actor.pos, `crafted: ${option.def.names[option.def.names.length - 1] ?? option.def.id}`, '#b06bd4', 13);
    nativeHost.markMetaDirty(seat);
  }

export function sceneRerollAffix(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, affixIdx: number, score: number): void {
    if (!nativeHost.stationReach('oracle', seat)) return;
    const m = seat.meta;
    const wornSlot = Object.keys(m.equipped).find(k => m.equipped[k]?.uid === uid);
    const item = nativeHost.bagItem(seat, uid) ?? (wornSlot ? m.equipped[wornSlot] : undefined);
    if (!item) return;
    const a = item.affixes[affixIdx];
    if (!a || a.crafted || a.locked) {
      nativeHost.failNote(seat.actor, 'oracle:' + uid, a?.locked ? 'the stone has spoken on this line' : 'the stone will not touch bench-work');
      return;
    }
    const def = ITEM_AFFIXES[a.id];
    if (!def) return;
    const rolled = rollRerolledAffix(def, item, Math.random, Math.max(0, Math.min(1, score)));
    if (!rolled) {
      nativeHost.failNote(seat.actor, 'oracle:' + uid, 'the runes refuse this line');
      return;
    }
    if (!nativeHost.spendEssence(seat, oracleRerollCost(item.rarity), 'oracle:' + uid)) return;
    item.affixes[affixIdx] = rolled;
    if (wornSlot) nativeHost.recalcSeat(seat);
    nativeHost.text(seat.actor.pos, 'the stone reshapes it — and seals it', '#b06bd4', 13);
    nativeHost.markMetaDirty(seat);
  }

export function sceneSocketVestige(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, socketIdx: number, vestigeId: string): void {
    const m = seat.meta;
    const def = VESTIGES[vestigeId];
    if (!def || (m.vestiges[vestigeId] ?? 0) < 1) return;
    const wornSlot = Object.keys(m.equipped).find(k => m.equipped[k]?.uid === uid);
    const item = nativeHost.bagItem(seat, uid) ?? (wornSlot ? m.equipped[wornSlot] : undefined);
    if (!item?.sockets || socketIdx < 0 || socketIdx >= item.sockets.length) return;
    const replaced = item.sockets[socketIdx];
    m.vestiges[vestigeId] -= 1;
    item.sockets[socketIdx] = vestigeId;
    if (replaced) {
      const old = VESTIGES[replaced];
      nativeHost.text(seat.actor.pos, `${old?.glyph ?? ''} ${old?.name ?? replaced} crumbles away`, '#8a8678', 12);
    }
    nativeHost.text(seat.actor.pos, `${def.glyph} inlaid`, def.color, 13);
    // The WORD may have just completed — announce an awakened epitaph.
    const base = ITEM_BASES[item.baseId];
    const epi = base ? epitaphFor(item.rarity, base.category, item.sockets) : null;
    if (epi) {
      nativeHost.text(vec(seat.actor.pos.x, seat.actor.pos.y - 26),
        `✦ the ${epi.name} awakens on ${item.name}`, '#ffd700', 15);
    }
    if (wornSlot) nativeHost.recalcSeat(seat);
    nativeHost.markMetaDirty(seat);
  }

export function sceneCraftSocket(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number): void {
    if (!nativeHost.stationReach('salvage', seat)) return;
    const m = seat.meta;
    const wornSlot = Object.keys(m.equipped).find(k => m.equipped[k]?.uid === uid);
    const item = nativeHost.bagItem(seat, uid) ?? (wornSlot ? m.equipped[wornSlot] : undefined);
    if (!item) return;
    const base = ITEM_BASES[item.baseId];
    if (!base) return;
    const cap = socketCap(base.category);
    if ((item.sockets?.length ?? 0) >= cap) {
      nativeHost.failNote(seat.actor, 'chisel:' + uid, 'this piece can hold no more sockets');
      return;
    }
    if (craftedCount(item) >= nativeHost.craftSlots()) {
      nativeHost.failNote(seat.actor, 'chisel:' + uid, 'this piece holds no more craft');
      return;
    }
    if (!nativeHost.spendEssence(seat, CRAFT_CFG.socketCost, 'chisel:' + uid)) return;
    item.sockets = [...(item.sockets ?? []), null];
    item.craftedSockets = (item.craftedSockets ?? 0) + 1;
    if (wornSlot) nativeHost.recalcSeat(seat);
    nativeHost.text(seat.actor.pos, 'a socket opens in the steel', '#b06bd4', 13);
    nativeHost.markMetaDirty(seat);
  }

export function sceneArmFolkWithItem(nativeHost:NativeSceneCampaignFrameClosureHost, folkId: number, uid: number, seat: Seat = nativeHost.localSeat): boolean {
    if (nativeHost.bagItem(seat, uid)?.relicKey) return false;
    const found = nativeHost.boroughOf(folkId);
    if (!found) return false;
    // THE KEEPER'S MARK HOLDS: a locked piece is never gifted away either.
    if (nativeHost.bagItem(seat, uid)?.locked) { nativeHost.failNote(seat.actor, 'borough:' + folkId, 'that piece is locked'); return false; }
    const { e, spec } = found;
    if (spec.muster.armWindow === 'muster' && e.bo!.stage !== 'muster') return false;
    const folk = nativeHost.actorById(folkId);
    if (!folk || folk.dead) return false;
    if (dist(seat.actor.pos, folk.pos) > transitRadius('borough_arm', spec.arming.radius) + 60) return false;
    const arms = nativeHost.boroughArmsOf(e, folkId);
    if (arms.gifts >= spec.arming.maxGifts) {
      nativeHost.failNote(seat.actor, 'borough:' + folkId, `${folk.name} carries all they can`);
      return false;
    }
    const idx = seat.meta.items.findIndex(i => i.uid === uid);
    if (idx < 0) return false;
    const item = seat.meta.items[idx];
    seat.meta.items.splice(idx, 1);
    arms.gifts++;
    // The gift's worth: its OWN compiled lines (affixes carry through for
    // real) + the armed baseline scaled by rarity (any stick makes a
    // militiaman; a rare blade makes a soldier). Attribute lines land as
    // inert stats on a folk sheet — harmless by design.
    const mul = spec.arming.giftRarityMul[item.rarity] ?? 1;
    folk.sheet.setSource(`borough:gift:${item.uid}`, [
      ...spec.arming.gearBaseline.map(m => ({ ...m, value: m.value * mul })),
      ...compileItemMods(item),
    ]);
    nativeHost.armBoroughFolk(folk);
    nativeHost.text(vec(folk.pos.x, folk.pos.y - 24), `${folk.name} takes up ${item.name}!`, ITEM_RARITIES[item.rarity].color, 13);
    nativeHost.markMetaDirty(seat);
    if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) nativeHost.saveCharacter();
    return true;
  }

export function sceneArmFolkWithEssence(nativeHost:NativeSceneCampaignFrameClosureHost, folkId: number, tint: string, seat: Seat = nativeHost.localSeat): boolean {
    const found = nativeHost.boroughOf(folkId);
    if (!found) return false;
    const { e, spec } = found;
    if (spec.muster.armWindow === 'muster' && e.bo!.stage !== 'muster') return false;
    const pkg = (spec.arming.essence as Record<string, BoroughSpec['arming']['essence'][EssenceId] | undefined>)[tint];
    if (!pkg || !(tint in ESSENCES)) return false;
    const tintId = tint as EssenceId;
    const folk = nativeHost.actorById(folkId);
    if (!folk || folk.dead) return false;
    if (dist(seat.actor.pos, folk.pos) > transitRadius('borough_arm', spec.arming.radius) + 60) return false;
    const arms = nativeHost.boroughArmsOf(e, folkId);
    const stacks = arms.stacks[tint] ?? 0;
    if (stacks >= pkg.maxStacks) {
      nativeHost.failNote(seat.actor, 'borough:' + folkId, `${folk.name} can hold no more ${ESSENCES[tintId].label}`);
      return false;
    }
    if (!nativeHost.spendEssence(seat, { essence: tintId, count: pkg.cost }, 'borough:' + folkId)) return false;
    arms.stacks[tint] = stacks + 1;
    // Linear stacking: ONE named source per tint, mods × stack count —
    // setSource replaces, so re-application is idempotent by construction.
    folk.sheet.setSource(`borough:ess:${tint}`,
      pkg.mods.map(m => ({ ...m, value: m.value * (stacks + 1) })));
    nativeHost.armBoroughFolk(folk);
    nativeHost.text(vec(folk.pos.x, folk.pos.y - 24),
      `${ESSENCES[tintId].glyph} ${folk.name} strengthens!`, ESSENCES[tintId].color, 13);
    nativeHost.markMetaDirty(seat);
    if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) nativeHost.saveCharacter();
    return true;
  }

export function sceneRealmArenaWake(nativeHost:NativeSceneCampaignFrameClosureHost, o: RealmArenaArgs): void {
    const a = o.arena;
    let bossActor: Actor | null = null;
    if (a?.wards) nativeHost.raiseArenaWards(a.wards, o.boss);
    else bossActor = nativeHost.spawnArenaBoss(o.boss);
    // THE CROWD takes its seats (data/arenas.ts): watching the boss, ready to
    // answer its champion-calls, gone the moment the crown falls. A warded
    // boss joins the watch when it manifests (breakArenaSeal wires the id).
    if (a?.crowd) {
      nativeHost.arenaCrowd = {
        spec: a.crowd, roster: o.boss.garrisonTable ?? o.rosterTable,
        levelBonus: o.boss.levelBonus ?? 0,
        bossId: bossActor?.id ?? null, callIdx: 0, dispersed: false,
      };
    }
  }

export function sceneMeetsRequirements(nativeHost:NativeSceneCampaignFrameClosureHost, skillId: string, seat: Seat = nativeHost.localSeat): boolean {
    return nativeHost.reqShortfall(skillId, seat) === undefined;
  }

export function sceneUnlearnRefusal(nativeHost:NativeSceneCampaignFrameClosureHost, inst: SkillInstance, seat: Seat): { key: 'debt' | 'discipline'; why: string } | null {
    // The overdrive debt lock cannot be laundered through unlearning: a
    // mortgaged toggle refuses to leave the bar until the pool is whole.
    const dv = inst.def.delivery;
    if (dv.type === 'aura' && dv.overdrive
      && (seat.actor.overdrive[dv.overdrive.lane]?.debt ?? 0) > 0) {
      return { key: 'debt', why: 'debt outstanding' };
    }
    // THE FIELD DISCIPLINE: unlearning is camp surgery, not battlefield
    // triage — sanctuary waives, the field demands cold blades and a quiet
    // clock (swapRefusal is the one law; the panel's disabled button
    // speaks the identical words).
    const why = nativeHost.swapRefusal(seat, 'unlearn', inst.def.id);
    return why ? { key: 'discipline', why } : null;
  }

export function sceneRebindWornGrafts(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, touched: (SkillInstance | null | undefined)[]): void {
    nativeHost.rememberSkillSlots(seat, touched);
    nativeHost.recalcSeat(seat);
    const seen = new Set<SkillInstance>();
    for (const inst of touched) {
      if (!inst || seen.has(inst)) continue;
      seen.add(inst);
      if (inst.def.tags.includes('flask') && !seat.actor.skills.includes(inst)) nativeHost.clearTreeFields(seat.actor, inst);
      nativeHost.resyncMinionSupports(inst);
    }
  }

export function sceneRestoreCompanions(nativeHost:Pick<NativeSceneCampaignFrameClosureHost,'player'|'meta'|'stashedCompanions'|'createMonster'|'tameCompanion'|'clampPos'|'actors'>&{companionBonds:Pick<NativeSceneCampaignFrameClosureHost['companionBonds'],'refresh'>}, 
    list: CompanionSaved[],
    keeper: Actor = nativeHost.player,
  ): void {
    for (const c of list) {
      if (!MONSTERS[c.defId]) continue; // a removed def releases the bond
      if (keeper === nativeHost.player && !nativeHost.meta.knownSkills.has(c.skillId)) {
        nativeHost.stashedCompanions.push({ ...c });
        continue;
      }
      const beast = nativeHost.createMonster(c.defId, Math.max(1, c.level), keeper.team, keeper, { scale: c.spawnScale });
      // Apply saved companion size for ordinary bonds too, before owner scaling.
      const savedRadius = c.radius !== undefined && Number.isFinite(c.radius) && c.radius > 0 ? c.radius : undefined;
      if (savedRadius !== undefined) beast.radius = savedRadius;
      if (c.rarity) {
        beast.rarity = c.rarity;
        if (savedRadius === undefined) beast.radius *= RARITY_DEFS[c.rarity].sizeMul;
        if (c.raritySources) for (const [name, mods] of c.raritySources) beast.sheet.setSource(name, mods);
        else beast.sheet.setSource('rarity', rarityMods(c.rarity));
        beast.name = c.name ?? beast.name;
      }
      nativeHost.tameCompanion(keeper, beast, c.skillId);
      beast.companionReviveRemaining = c.reviveRemaining;
      beast.pos = nativeHost.clampPos(vec(
        keeper.pos.x + rand(-60, 60), keeper.pos.y + rand(40, 80)), beast.radius);
      if (c.downed) { beast.downed = true; beast.life = 0; }
      selectNativeVesselPush(nativeHost,nativeHost.actors)(beast);
      observeNativeCombatBirth(nativeHost,beast);
    }
    nativeHost.companionBonds.refresh();
  }

export function sceneRememberSkillSlots(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat,
    touched: readonly (SkillInstance | null | undefined)[] = nativeHost.seatHero(seat).skills,
    overwrite = true): void {
    if (seat !== nativeHost.localSeat || nativeHost.provisioningFlaskSlots.has(seat)) return;
    const bar = nativeHost.seatHero(seat).skills;
    for (const inst of touched) {
      if (inst && rememberSkillSlot(nativeHost.account.skillSlotMemory, inst, bar.indexOf(inst), overwrite)) {
        nativeHost.accountDirty = true;
      }
    }
  }

export function sceneClearSummonTreeBodies(nativeHost:NativeSceneCampaignFrameClosureHost, caster: Actor, inst: SkillInstance): void {
    if (inst.def.delivery.type !== 'summon' || !inst.def.tree) return;
    nativeHost.replenishment.forget(caster, inst);
    nativeHost.clearSummonReleaseFields(caster, inst);
    for (const body of [...nativeHost.actors]) if (!body.dead && body.owner === caster && body.summonInst === inst) {
      nativeHost.releaseContract(body, false);
      nativeHost.kill(body, true);
    }
    nativeHost.pendingSummons = nativeHost.pendingSummons.filter(p => p.caster !== caster || p.inst !== inst);
    nativeHost.pendingRespawns = nativeHost.pendingRespawns.filter(p => p.caster !== caster || p.inst !== inst);
  }

export function sceneGrantSupportGemItem(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, gem: SupportInstance, spill = false): ItemInstance | null {
    const item = makeSupportGemItem(gem);
    if (!autoPlace(seat.meta.items, item)) {
      if (spill) {
        nativeHost.drops.push({
          pos: nativeHost.clampPos(vec(seat.actor.pos.x + rand(-14, 14), seat.actor.pos.y + rand(-14, 14)), 10),
          item: { kind: 'support', gem }, bob: rand(0, Math.PI * 2),
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

export function sceneSpendAbilityEssence(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, cost: AbilityCost, noteKey: string): boolean {
    const def = abilityEssenceOfTier(cost.tier);
    const have = seat.meta.abilityEssences[def.id] ?? 0;
    if (have < cost.count) {
      nativeHost.failNote(seat.actor, noteKey, `needs ${cost.count}× ${def.label}`);
      return false;
    }
    seat.meta.abilityEssences[def.id] = have - cost.count;
    nativeHost.markMetaDirty(seat);
    return true;
  }

export function sceneVendorTradeRefusal(nativeHost:NativeSceneCampaignFrameClosureHost, v?: VendorDef): string | null {
    const odysseyRefusal = nativeHost.odyssey.tradeRefusal();
    if (odysseyRefusal) return odysseyRefusal;
    if (v && v.tradeGate === false) return null;
    // No catalog in scope here — trade gates speak feature/ledger avenues.
    if (gateMet(nativeHost.gateAccountOf(nativeHost.shelfBuyer), VENDOR_CFG.trade.gate, 'all', () => false)) return null; // THE SEAT'S GATE: the buyer's account (M2)
    return isVaultAvailable(nativeHost.gateAccountOf(nativeHost.shelfBuyer)) ? VENDOR_CFG.trade.hint : 'You have no way to pay. This counter cannot trade with you yet.';
  }

export function sceneAbilityEssTierRefusal(nativeHost:NativeSceneCampaignFrameClosureHost, v: VendorDef, tier: number): string | null {
    if (!nativeHost.vendorMemoryServicesOpen(v)) return 'the Memory Counter would stock it';
    const cfg = ABILITY_ESSENCE_CFG.vendor;
    if (!Number.isInteger(tier) || tier < 1 || tier > ABILITY_ESSENCES.length) return 'no such essence';
    if (cfg.deepWaives && v.essenceDeep) return null;
    const need = cfg.rungNeeded[tier - 1] ?? 0;
    if (nativeHost.waresRungsOwned() < need) return `broader wares (rung ${need}) would stock it`;
    return null;
  }

export function sceneCanAffordEssence(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, cost: EssenceCost): boolean {
    return (seat.meta.essences[cost.essence] ?? 0) >= cost.count;
  }

export function sceneBuysAsOwn(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): boolean {
    return !!nativeHost.localSeat.keeper && !seat.keeper && !seat.merc && nativeHost.shelfBuyer !== seat;
  }

export function sceneNearSmith(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    return nativeHost.actors.some(a =>
      nativeHost.hasNpcRole(a, 'vendor')
      && dist(a.pos, seat.actor.pos) <= npcDwellRadius('vendor')
      && nativeHost.dwellReachable(seat.actor.pos, a.pos, npcDwellReach('vendor'), { from: seat.actor.tier ?? 0, to: a.tier ?? 0 }));
  }

export function sceneVendorEntryAllowed(nativeHost:NativeSceneCampaignFrameClosureHost, key: string, entry: VendorEntry): boolean { return settlementVendorEntryAllowed(nativeHost.nativeSettlementHost(),key,entry); }

export function sceneVendorPrice(nativeHost:NativeSceneCampaignFrameClosureHost, entry: VendorEntry): EssenceCost[] {
    if (entry.kind === 'item') {
      const memKind = memoryKindOf(entry.item);
      if (memKind) {
        const per = VENDOR_MEMORY_PRICE[memKind];
        return [{ essence: per.essence, count: per.count * (entry.item.mem?.length ?? 1) }];
      }
      return vendorItemPrice(entry.item);
    }
    return entry.kind === 'skill'
      ? [VENDOR_ESSENCE_PRICE[entry.inst.rarity ?? 'common']]
      : [VENDOR_SUPPORT_PRICE];
  }

export function sceneVendorBought(nativeHost:NativeSceneCampaignFrameClosureHost, key: string, entry: VendorEntry, seat: Seat, stock: VendorEntry[]): void {
    if (nativeHost.metaProgressionActive()) {
      nativeHost.account.ledger[LEDGER_VENDOR_BOUGHT] = (nativeHost.account.ledger[LEDGER_VENDOR_BOUGHT] ?? 0) + 1;
      nativeHost.accountDirty = true;
    }
    const hold = nativeHost.vendorHolds[key];
    if (!hold) return;
    const at = hold.locks.findIndex(r => r.entry === entry);
    if (at < 0) return;
    const [row] = hold.locks.splice(at, 1);
    if (row.commission && hold.commission) {
      nativeHost.text(seat.actor.pos, 'the standing order is fulfilled', '#e8c87a', 13);
      hold.commission = undefined;
    }
    nativeHost.syncHoldIdx(key, stock);
    nativeHost.charDirty = true;
  }

export function sceneNearChandler(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    const c = nativeHost.actors.find(a => nativeHost.hasNpcRole(a, 'chandler') && !a.dead);
    return !!c && dist(seat.actor.pos, c.pos) <= 96
      && nativeHost.dwellReachable(seat.actor.pos, c.pos, npcDwellReach('chandler'), nativeHost.storyPair(seat.actor, c));
  }

export function sceneDelverShopOpen(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    return nativeHost.nearDelver(seat) && nativeHost.descentSpent.has(nativeHost.zone.id);
  }

export function sceneDelverEntryRefusal(nativeHost:NativeSceneCampaignFrameClosureHost, entry: VendorEntry): string | null {
    if (!entry.depthReq || nativeHost.delverDepthReached() >= entry.depthReq) return null;
    return `sealed until a dive here reaches Depth ${entry.depthReq} (deepest seen: ${nativeHost.delverDepthReached()})`;
  }

export function sceneVendorHoldKey(nativeHost:NativeSceneCampaignFrameClosureHost, v: VendorDef): string {
    return v.holdKey?.(nativeHost) ?? v.id;
  }

export function sceneVendorHoldFor(nativeHost:NativeSceneCampaignFrameClosureHost, key: string): VendorHold {
    return nativeHost.vendorHolds[key] ??= { locks: [], watchedSec: nativeHost.time };
  }

export function sceneVendorLockCap(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    let cap = 0;
    for (const r of VENDOR_CFG.lock.ladder) if (featureEnabled(nativeHost.gateAccountOf(nativeHost.shelfBuyer), r.flag)) cap++; // THE SEAT'S GATE
    return cap;
  }

export function sceneCommissionOdds(nativeHost:NativeSceneCampaignFrameClosureHost, c: { kind: 'skill' | 'support'; id: string }): number { return settlementCommissionOdds(nativeHost.nativeSettlementHost(),c); }

export function sceneEnsureRealmRoots(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, realm: PassiveRealmDef): void {
    let added = false;
    for (const id of realm.roots ?? []) {
      if (!PASSIVE_NODES[id] || seat.meta.allocated.has(id)) continue;
      seat.meta.allocated.add(id);
      added = true;
    }
    if (added) nativeHost.recalcSeat(seat);
  }

export function sceneRefreshPassiveCompany(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): void {
    // THE COMPANY FOLLOWS THE TREE: an allocation or refund may move the patron
    // stats the merc seams read (mercEase → enemy party scale; mercVigor →
    // the blades' own sheets). Both refreshes are cheap and idempotent —
    // and only run while a company is actually fielded.
    if (nativeHost.hiredMercs.length && seat === nativeHost.localSeat) {
      nativeHost.rescaleEnemies();
      const vigor = Math.max(0, nativeHost.player.sheet.get('mercVigor'));
      for (const hm of nativeHost.hiredMercs) {
        if (vigor > 0) {
          hm.seat.actor.sheet.setSource('patron', [mod('life', 'increased', vigor), mod('damage', 'increased', vigor)]);
        } else {
          hm.seat.actor.sheet.removeSource('patron');
        }
        hm.seat.actor.life = Math.min(hm.seat.actor.life, hm.seat.actor.maxLife());
      }
    }
  }

export function scenePassiveRefundRefusal(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): string | null {
    if (!FONT_CFG.passiveRespec.enabled) return 'Passive refunds are unavailable.';
    if (seat.actor.dead || seat.actor.downed || nativeHost.seatHero(seat).dead) return 'Return to life before using the Font.';
    if (!nativeHost.nearFont(seat)) return 'Stand beside the Sacrificial Font to refund passives.';
    return nativeHost.swapRefusal(seat, 'socket');
  }

export function sceneSeatSkillById(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, skillId: string): SkillInstance | null {
    const known = seat.meta.knownSkills.get(skillId);
    if (known) return known;
    const held = seat.grantedInsts?.get(skillId);
    if (held) return held;
    const def = SKILLS[skillId];
    if (!def) return null;
    const stat = skillGrantStat(skillId);
    let host: ItemInstance | undefined;
    let level = 0;
    for (const slot of EQUIP_SLOTS) {
      const worn = seat.meta.equipped[slot.id];
      if (!worn) continue;
      for (const gm of compileItemMods(worn)) {
        if (gm.stat !== stat || gm.kind !== 'flat') continue;
        level += gm.value;
        host ??= worn;
      }
    }
    level = Math.min(skillMaxLevel(def), Math.floor(level));
    if (!host || level < 1) return null;
    const inst = makeSkillInstance(def, level, GRANT_CFG.sockets);
    const state = host.grantState?.[skillId];
    if (state) restoreGrantState(inst, state);
    inst.grantedBy = host.name;
    inst.grantedHostUid = host.uid;
    (seat.grantedInsts ??= new Map()).set(skillId, inst);
    return inst;
  }

export function sceneResolveMemoryCut(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, unit: RoughMemoryUnit, facet?: AttributeId):
      | { kind: 'skill'; def: SkillDef; rarity: SkillRarity; level: number }
      | { kind: 'support'; def: SupportDef; level: number; rand: () => number } {
    const mdef = MONSTERS[unit.d];
    const lvl = Math.max(nativeHost.zone.level, seat.actor.level);
    // THE PROVENANCE LEAN: the boss lean (a def truth) × the tier lean (the
    // unit's sealed `e` event fact) — one fold, memories.ts owns it.
    const lean = memoryRarityLean(!!mdef?.boss, unit.e) ?? undefined;
    // THE GROUND: a unit that fell where the country floors gems recalls
    // over THAT floor — the pool widened by the country's own gems, leaned
    // ×floorMult — so "found in the scald before it is owned" survives the
    // memory form. Units with no `t` (most) read the account pool alone.
    const floor = unit.t ? gemFloorFor(unit.t) : undefined;
    const floored = floor && (floor.skills.size > 0 || floor.supports.size > 0) ? floor : undefined;
    const skillW = (s: SkillDef): number => (s.dropWeight ?? 100) * (floored?.skills.has(s.id) ? GEM_DROP_CFG.floorMult : 1);
    const supportW = (d: SupportDef): number => d.weight * (floored?.supports.has(d.id) ? GEM_DROP_CFG.floorMult : 1);
    // THE PROMISE: a pinned unit recalls to its sealed gem VERBATIM while the
    // registry knows it — the pinned rarity and level, else the seeded cut's
    // own rarity roll at level 1. A vanished id falls through to the wild
    // cut below (never a silent nothing).
    if (unit.g) {
      const rng = new Rng(unit.s);
      if (unit.g.k === 'skill' && SKILLS[unit.g.id]) {
        return { kind: 'skill', def: SKILLS[unit.g.id], rarity: unit.g.r ?? rollSeededRarity(rng, lean, unit.ceiling), level: unit.g.l ?? 1 };
      }
      if (unit.g.k === 'support' && SUPPORTS[unit.g.id]) {
        return { kind: 'support', def: SUPPORTS[unit.g.id], level: unit.g.l ?? 1, rand: () => rng.next() };
      }
    }
    if (facet !== undefined) {
      const rng = facetRng(unit.s, facet);
      const attrs = memoryFacetAttrs(facet) ?? [];
      const pool = nativeHost.skillDropPool(lvl, floored);
      const banner = pool.filter(s => attrs.some(a => (s.requirements?.[a] ?? 0) > 0));
      const lane = banner.length > 0 ? banner : pool;
      const w = nativeHost.gemWeights(lane, s => s.tags, skillW);
      const def = pickSeeded(lane, w, rng)!;
      const rarity = rollSeededRarity(rng, lean, unit.ceiling);
      return { kind: 'skill', def, rarity, level: 1 };
    }
    const rng = new Rng(unit.s);
    const wantSkill = rng.next() < GEM_DROP_CFG.skillShare;
    if (!wantSkill) {
      const spool = nativeHost.supportDropPool(lvl, floored);
      if (spool.length > 0) {
        // Supports never ride the kit rung (kits are skills) — they lean by
        // the def's gemBias where one is authored, the dropGemAt shape.
        const w = nativeHost.gemWeights(spool, d => d.dropTags ?? d.requiresTags ?? [], supportW, mdef?.gemBias);
        return { kind: 'support', def: pickSeeded(spool, w, rng)!, level: 1, rand: () => rng.next() };
      }
      // no supports unlocked → a skill grant instead (the dropGemAt precedent)
    }
    const pool = nativeHost.skillDropPool(lvl, floored);
    const rung = nativeHost.memoryLeanOf(mdef, pool);
    const kitIds = new Set(rung.kit.map(s => s.id));
    const w = rung.rung === 'kit'
      ? nativeHost.gemWeights(pool, s => s.tags, s => skillW(s) * (kitIds.has(s.id) ? MEMORY_CFG.kitMult : 1))
      : nativeHost.gemWeights(pool, s => s.tags, skillW, rung.rung === 'bias' ? mdef?.gemBias : undefined);
    const def = pickSeeded(pool, w, rng)!;
    // Rarity at the cut: the standing table, seeded, leaned by PROVENANCE
    // (the boss lean is DEF-grain; the tier lean reads the sealed `e`).
    const rarity = rollSeededRarity(rng, lean, unit.ceiling);
    return { kind: 'skill', def, rarity, level: 1 };
  }

export function sceneCaravanBandUnlocked(nativeHost:NativeSceneCampaignFrameClosureHost, band: number): boolean {
    if (!featureEnabled(nativeHost.account, FEATURE.CARAVAN)) return false;
    if (band === 0) return true;
    const b = caravanBand(band);
    return !!b && featureEnabled(nativeHost.account, b.feature);
  }

export function sceneMintCaravanRoute(nativeHost:NativeSceneCampaignFrameClosureHost, band: number): string {
    const destId = `caravan_band_${band}`;
    if (nativeHost.zoneMap[destId]) return destId; // cached (mint-once)
    const b = caravanBand(band);
    const targetLevel = b ? b.level : Math.max(1, band * 10);
    const destSeed = (nativeHost.manifest.seed ^ hashStr(destId)) >>> 0;
    const target = nativeHost.findBandCoord(targetLevel, destSeed);
    // Anchor the trail on the GENUINE explored graph — never on a previously-minted
    // caravan zone (else picking bands out of order would start the trail deep in the
    // wilds with descending waystation levels + cross-band roads).
    const exclude = new Set(Object.keys(nativeHost.zoneMap).filter(id => id.startsWith('caravan_')));
    // Same anchor sanity as the quest mint: the trail must start on the
    // CONNECTED graph, never on a floating island or a hidden epicenter.
    let anchor: ZoneDef = nearestNode(nativeHost.zoneMap, target, exclude, undefined,
      (z) => !z.floating && !z.concealed && !isRoadlessGateHub(z)) ?? nativeHost.zoneMap[START_ZONE];
    const baseLevel = anchor.level;
    // The trail LENGTHENS with the band (a longer escorted journey to farther lands —
    // and more avenues to explore): ~band×3 zones total (lvl10→3, lvl20→6, lvl30→9…),
    // i.e. band×3−1 waystations + the destination, capped so the deepest routes don't
    // carpet the map.
    const K = Math.min(Math.max(2, band * 3 - 1), 12);
    for (let i = 1; i <= K; i++) {
      const t = i / (K + 1);
      const coord = { x: anchor.map.x + (target.x - anchor.map.x) * t, y: anchor.map.y + (target.y - anchor.map.y) * t };
      const wid = `caravan_trail_${band}_${i}`;
      if (!nativeHost.zoneMap[wid]) {
        const lvl = Math.max(1, Math.round(baseLevel + (targetLevel - baseLevel) * t));
        const ws = placeZoneAt(coord, anchor, nativeHost.zoneMap, nativeHost.nextGenId++, {
          id: wid, level: lvl, linkBack: true, floating: false,
          biomeFor: nativeHost.biomeFor, seed: (nativeHost.manifest.seed ^ hashStr(wid)) >>> 0,
        });
        nativeHost.zoneMap[wid] = ws;
        nativeHost.sim.onNodeCharted(ws, nativeHost.simView());
      }
      anchor = nativeHost.zoneMap[wid];
    }
    // The destination: band N's level, road-linked to the last waystation, waypoint
    // home (no anti-farm gate — the Caravan IS the sanctioned shortcut).
    const def = placeZoneAt(target, anchor, nativeHost.zoneMap, nativeHost.nextGenId++, {
      id: destId, level: targetLevel, linkBack: true, floating: false,
      forceWaypoint: true, biomeFor: nativeHost.biomeFor, seed: destSeed,
      name: nativeHost.caravanDestName(band), // the exact name the menu previewed
    });
    nativeHost.zoneMap[destId] = def;
    nativeHost.sim.onNodeCharted(def, nativeHost.simView());
    return destId;
  }

export function sceneMortalValueOf(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): number {
    return walletMortalValue(seat.meta.essences);
  }

export function sceneSpendMortalValue(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, price: number, noteKey: string): boolean {
    if (!spendWalletMortalValue(seat.meta.essences, price)) {
      nativeHost.failNote(seat.actor, noteKey,
        `needs essence worth ${price} — you carry ${nativeHost.mortalValueOf(seat)}`);
      return false;
    }
    nativeHost.markMetaDirty(seat);
    if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) nativeHost.saveCharacter();
    else if (seat.couch) nativeHost.couchDirty = true;
    return true;
  }

export function sceneRefreshBountySlate(nativeHost:NativeSceneCampaignFrameClosureHost, boardId: string): void {
    if (nativeHost.clientActionHook) return;
    const bs = nativeHost.boardStateOf(boardId);
    bs.refreshSeq++;
    bs.armedBeat = -1; // force past the standing-slate guard
    nativeHost.armBountyBoard(boardId);
  }

export function scenePayBountyLanes(nativeHost:NativeSceneCampaignFrameClosureHost, p: BountyPosting, seat: Seat): void {
    for (const lane of ['unique', 'lot', 'gem', 'craft', 'pouch'] as const) {
      if (p.pay[lane]) nativeHost.payBountyComponent(p, seat, { level: p.pay.level, [lane]: p.pay[lane] });
    }
  }

export function sceneBountyLockCapacity(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    let n = 0;
    for (const r of BOUNTY_BOARD_CFG.lock.ladder) {
      if (featureEnabled(nativeHost.gateAccountOf(nativeHost.questHand()), r.flag)) n++; // THE SEAT'S GATE: the pinning hand's own rungs (M2)
    }
    return n;
  }

export function sceneForgeBases(nativeHost:NativeSceneCampaignFrameClosureHost, writUid: number, seat: Seat = nativeHost.localSeat): { id: string; name: string }[] {
    const it = seat.meta.items.find(x => x.uid === writUid);
    if (!it?.writ) return [];
    const complexity = it.writ.complexity ?? (it.writ as { tier?: number }).tier ?? 1;
    // THE CLASS NARROWS THE BENCH (walk 2, card 2c): the writ's named
    // complexity picks the pool; the player picks the base within it.
    const pool = Object.values(ITEM_BASES)
      .filter(b => b.category === it.writ!.category && baseComplexityOf(b) === complexity);
    // A legacy writ whose class stands empty falls to the whole category
    // (never a dead credit).
    const rows = pool.length ? pool : Object.values(ITEM_BASES).filter(b => b.category === it.writ!.category);
    return rows.map(b => ({ id: b.id, name: b.name }));
  }

export function sceneHoldStateFor(nativeHost:NativeSceneCampaignFrameClosureHost, def: ZoneDef): HarborholdState | null { return harborHoldStateFor(nativeHost.nativeSceneHarborHost(),def); }

export function sceneSpendEssence(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, cost: EssenceCost, noteKey: string): boolean {
    if (!nativeHost.canAffordEssence(seat, cost)) {
      nativeHost.failNote(seat.actor, noteKey, `needs ${cost.count}× ${ESSENCES[cost.essence].label}`);
      return false;
    }
    seat.meta.essences[cost.essence] -= cost.count;
    return true;
  }

export function sceneWornSlotOf(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number): string | undefined {
    return Object.keys(seat.meta.equipped).find(sid => seat.meta.equipped[sid]?.uid === uid);
  }

export function sceneDropGemFromBag(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number): DropItem | null {
    const m = seat.meta;
    const p = seat.actor;
    const wrapped = nativeHost.bagItem(seat, uid);
    if (!wrapped?.gem) return null;
    let item: DropItem;
    if (wrapped.gem.kind === 'skill') {
      const inst = skillOfGemItem(wrapped);
      if (!inst) return null;
      item = { kind: 'skill', inst };
      nativeHost.text(p.pos, `dropped ${skillInstanceName(inst)}`, SKILL_RARITIES[inst.rarity ?? 'common'].color, 13, 'pickup');
    } else {
      const gem = supportOfGemItem(wrapped);
      if (!gem) return null;
      item = { kind: 'support', gem };
      nativeHost.text(p.pos, `dropped ${gem.def.name}`, gem.def.color, 13, 'pickup');
    }
    removeFromBag(m.items, uid);
    // THE SPOILS STORY: dropped at the seat's own feet, on its own story.
    const pos = nativeHost.clampPos(vec(p.pos.x + rand(-14, 14), p.pos.y + rand(-14, 14)), 10, undefined, p.tier >= 1 ? { tier: p.tier } : undefined);
    nativeHost.drops.push({ pos, item, bob: rand(0, Math.PI * 2), grace: DROP_PICKUP_GRACE, droppedBy: seat.id, tier: p.tier });
    nativeHost.ownSpoils(nativeHost.drops.length - 1, seat); // THE OWNER STAMP (card 27): a discard wears its dropper
    nativeHost.markMetaDirty(seat);
    return item;
  }

export function sceneCanManageAccountRelics(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): boolean {
    return seat === nativeHost.localSeat && !nativeHost.clientActionHook && !seat.actor.dead
      && !seat.actor.downed && nativeHost.stationReach('oracle', seat);
  }

export function sceneSeatAccountRelic(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, uid: number, x?: number, y?: number): void {
    const lesson = nativeHost.reliquaryLesson();
    if (seat !== nativeHost.localSeat || nativeHost.clientActionHook || seat.actor.dead || seat.actor.downed
      || (!lesson && !!nativeHost.reliquaryRefusal(seat))) return;
    const def = CONTAINERS.reliquary, board = containerBoard(def);
    if (!board) return;
    const bagged = seat.meta.items.find(i => i.uid === uid);
    const item = bagged ?? nativeHost.account.reliquary.items.find(i => i.uid === uid);
    if (!bagged && !nativeHost.canManageAccountRelics(seat)) return;
    const held = nativeHost.containerHeld(seat, def.id);
    if (!item || !isRelic(item) || item.questId || held.includes(item)) return;
    // Prove the entire placement on copies before changing either owner.
    const trial = held.map(i => ({ ...i })), candidate = { ...item };
    delete candidate.x; delete candidate.y;
    let displaced: ItemInstance | undefined;
    if (x !== undefined && y !== undefined) {
      const landing = containerLanding(def, board, held, item, 'bag', x, y, nativeHost.seatHero(seat).level);
      if (landing.verdict === 'blocked') {
        if (landing.why) nativeHost.failNote(seat.actor, 'seat:' + uid, landing.why);
        return;
      }
      displaced = landing.with; candidate.x = x; candidate.y = y;
    } else if (uniqueContainerRefusal(held, item)) {
      nativeHost.failNote(seat.actor, 'seat:' + uid, uniqueContainerRefusal(held, item)!); return;
    } else if (!autoPlace(trial, candidate, boardDims(board))) {
      nativeHost.failNote(seat.actor, 'seat:' + uid, 'No open seat. Return a Relic to your pack first.'); return;
    }
    const bagReturn = displaced && bagged ? { ...displaced } : undefined;
    if (bagReturn) {
      const bag = seat.meta.items.filter(i => i !== bagged).map(i => ({ ...i }));
      if (!(bagged!.x !== undefined && bagged!.y !== undefined && placeAt(bag, bagReturn, bagged!.x, bagged!.y)) && !autoPlace(bag, bagReturn)) return;
    }
    const stashPlan = displaced && !bagged ? planRelicStorage(nativeHost.account, displaced, undefined, item.relicKey) : undefined;
    if (displaced && !bagged && !stashPlan) { nativeHost.failNote(seat.actor, 'stash:' + uid, 'No room for the exchanged Relic in storage.'); return; }
    const stored = bankRelic(nativeHost.account, item, seat.meta.relicScope ?? (seat.meta.charId || 'run:' + nativeHost.manifest.seed));
    if (!stored) return;
    if (bagged) removeFromBag(seat.meta.items, uid);
    if (displaced) { held.splice(held.indexOf(displaced), 1); delete displaced.x; delete displaced.y; }
    if (displaced && bagReturn) { displaced.x = bagReturn.x; displaced.y = bagReturn.y; seat.meta.items.push(displaced); }
    if (stashPlan) nativeHost.account.reliquary.stash = stashPlan;
    delete nativeHost.account.reliquary.stash.cells[stored.relicKey!];
    stored.x = candidate.x; stored.y = candidate.y;
    held.push(stored);
    if (lesson) nativeHost.account.ledger[RELIQUARY_LESSON] = 1;
    nativeHost.recalcSeat(seat);
    nativeHost.persistAccountRelics(seat);
  }

export function scenePersistAccountRelics(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): void {
    if (seat !== nativeHost.localSeat || nativeHost.clientActionHook) return;
    nativeHost.account.reliquary.seated = (seat.meta.containers.reliquary ?? []).flatMap(i => i.relicKey ? [i.relicKey] : []);
    nativeHost.account.reliquary.carried = seat.meta.items.flatMap(i => i.relicKey ? [i.relicKey] : []);
    reconcileRelicStash(nativeHost.account);
    nativeHost.accountDirty = true;
    saveAccount(nativeHost.account);
    nativeHost.markMetaDirty(seat);
  }

export function sceneReliquaryRefusal(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): string | null {
    if (seat !== nativeHost.localSeat || nativeHost.clientActionHook || !nativeHost.account.features.has(FEATURE.RELIQUARY)) return 'Available in your own hosted journey.';
    if (seat.actor.dead || seat.actor.downed) return 'Unavailable while fallen.';
    if (nativeHost.seatHero(seat).casting) return 'Finish casting before changing the Reliquary.';
    if (nativeHost.time - nativeHost.lastCombatAt < RELIQUARY_CFG.toggleCalmSeconds || nativeHost.pressingFoeNear(seat.actor.pos, seat.actor.tier)) return 'Leave combat before changing the Reliquary.';
    return null;
  }

export function sceneSeatModeDef(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): CharacterModeDef { return modeById(seat.meta.modeId); }

export function sceneContainerHeld(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, containerId: string): ItemInstance[] {
    return seat.meta.containers[containerId] ?? (seat.meta.containers[containerId] = []);
  }

export function sceneSalvageLane(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, lane?: 'break' | 'sell'): 'break' | 'sell' | null {
    const want = lane ?? (nativeHost.nearSalvage(seat) ? 'break' : 'sell');
    if (want === 'break') return nativeHost.stationReach('salvage', seat) ? 'break' : null;
    return nativeHost.nearScrapVendor(seat) ? 'sell' : null;
  }

export function sceneLockedRefusal(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat): void {
    nativeHost.text(vec(seat.actor.pos.x, seat.actor.pos.y - 26),
      'locked — the hammer passes it by', '#8a8678', 12);
  }

export function sceneBreakOneGemItem(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, item: ItemInstance, mode: 'break' | 'sell'): void {
    const m = seat.meta;
    if (item.gem?.kind === 'skill') {
      const inst = skillOfGemItem(item);
      removeFromBag(m.items, item.uid);
      if (!inst) return;
      for (const s of inst.sockets) if (s) nativeHost.grantSupportGemItem(seat, s, true);
      const yieldd = mode === 'break' ? salvageSkillYield(inst) : sellSkillYield(inst);
      if (yieldd) nativeHost.grantEssence(seat, yieldd);
      else nativeHost.text(seat.actor.pos, 'the granted spark breaks into nothing', '#8a8678', 12);
    } else if (item.gem?.kind === 'support') {
      const gem = supportOfGemItem(item);
      removeFromBag(m.items, item.uid);
      if (!gem) return;
      nativeHost.grantEssence(seat, mode === 'break' ? salvageSupportYield(gem) : sellSupportYield(gem));
    }
  }

export function sceneBreakOneItem(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat, item: ItemInstance, mode: 'break' | 'sell'): { family: string; rankedUp: boolean }[] {
    removeFromBag(seat.meta.items, item.uid);
    nativeHost.grantEssence(seat, mode === 'break' ? salvageItemYield(item) : sellItemYield(item));
    // TIER-TRUE study — BENCH ONLY: the counter pays cash, never knowledge.
    // Craft lore is ACCOUNT knowledge (meta-progression): a sealed character
    // still salvages for essence and crafts from what the account already
    // knows — it just teaches the account nothing new.
    if (mode !== 'break' || !nativeHost.metaProgressionActive()) return [];
    const taught = studySalvage(nativeHost.account.craftLore, item);
    for (const t of taught.filter(x => x.rankedUp)) {
      // THE DEED GATE (LEDGER_CRAFTS_UNLOCKED): a family's FIRST rank is
      // "this craft is unlocked at all" — count each such family once,
      // lifetime; the Oracle Stone's gate reads the tally. (the caller's
      // saveAccount persists the stamp with the lore itself.)
      if (nativeHost.account.craftLore[t.family]?.rank === 1) {
        nativeHost.account.ledger[LEDGER_CRAFTS_UNLOCKED] = (nativeHost.account.ledger[LEDGER_CRAFTS_UNLOCKED] ?? 0) + 1;
      }
    }
    return taught;
  }

export function sceneStationReach(nativeHost:NativeSceneCampaignFrameClosureHost, id: SuiteStation, seat: Seat = nativeHost.localSeat): boolean {
    return nativeHost.stationNear(id, seat) || nativeHost.suiteSummons(seat).includes(id);
  }

export function sceneCraftSlots(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    return CRAFT_CFG.maxCraftedAffixes
      + (featureEnabled(nativeHost.account, CRAFT_CFG.extraSlotFeature) ? 1 : 0);
  }

export function sceneBoroughOf(nativeHost:NativeSceneCampaignFrameClosureHost, folkId: number): { e: ActiveEncounter; spec: BoroughSpec } | null {
    for (const e of nativeHost.encounters) {
      if (!e.def.borough || !e.bo || e.phase !== 'open') continue;
      if (e.bo.folkIds.includes(folkId)) return { e, spec: e.def.borough };
    }
    return null;
  }

export function sceneBoroughArmsOf(nativeHost:NativeSceneCampaignFrameClosureHost, e: ActiveEncounter, folkId: number): { gifts: number; stacks: Record<string, number> } {
    let arms = e.bo!.arms.get(folkId);
    if (!arms) { arms = { gifts: 0, stacks: {} }; e.bo!.arms.set(folkId, arms); }
    return arms;
  }

export function sceneArmBoroughFolk(nativeHost:NativeSceneCampaignFrameClosureHost, folk: Actor): void {
    if (folk.tag === 'borough_huddled') {
      folk.tag = undefined;
      nativeHost.text(vec(folk.pos.x, folk.pos.y - 38), 'armed!', '#e8c87a', 12);
    }
    folk.fillResources(); // re-seat life/mana so the graft shows immediately
  }

export function sceneRaiseArenaWards(nativeHost:NativeSceneCampaignFrameClosureHost, spec: ArenaWardSpec, boss: ArenaBossSpec): void {
    const kind = spec.doodadKind ?? 'ward_seal';
    const total = randInt(spec.count[0], spec.count[1]);
    const seals: Doodad[] = [];
    const placedPts: Vec2[] = [];
    for (let i = 0; i < total; i++) {
      let at: Vec2 | null = null;
      for (let t = 0; t < 16 && !at; t++) {
        const cand = nativeHost.clampPos(vec(rand(90, nativeHost.arena.w - 90), rand(90, nativeHost.arena.h - 90)), 40);
        const p = nativeHost.walk && !nativeHost.walk.isWalkable(cand.x, cand.y) ? nativeHost.walk.snapToWalkable(cand) : cand;
        if (dist(p, nativeHost.player.pos) < 260) continue;              // never at the door
        if (placedPts.some(q => dist(p, q) < 200)) continue;       // seals spread out
        at = nativeHost.clearTransitSpot(p, 90);                          // …and off the way home
      }
      const p = at ?? nativeHost.clearTransitSpot(nativeHost.clampPos(nativeHost.farPoint(300 + i * 60), 40), 90);
      const seal: Doodad = { pos: vec(p.x, p.y), radius: 26, kind };
      nativeHost.doodads.push(seal);
      seals.push(seal);
      placedPts.push(p);
    }
    nativeHost.arenaWard = { spec, boss, seals, total };
    nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 60),
      `${total} seals bind this place — break them all`, '#ff9a50', 16);
  }

export function sceneVendorMemoryServicesOpen(nativeHost:NativeSceneCampaignFrameClosureHost, v: VendorDef): boolean {
    return !v.stockPolicy?.memoriesRequire || featureEnabled(nativeHost.account, v.stockPolicy.memoriesRequire);
  }

export function sceneWaresRungsOwned(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    let n = 0;
    for (const r of VENDOR_CFG.wares.ladder) if (featureEnabled(nativeHost.account, r.flag)) n++;
    return n;
  }

export function sceneNearDelver(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    const site = nativeHost.descentSite;
    if (!site || nativeHost.descentRun) return false;
    return nativeHost.actors.some(a => a.id === site.delverId && !a.dead
      && dist(a.pos, seat.actor.pos) <= DELVER_RADIUS
      && nativeHost.dwellReachable(seat.actor.pos, a.pos, npcDwellReach('delver'), nativeHost.storyPair(seat.actor, a)));
  }

export function sceneDelverDepthReached(nativeHost:NativeSceneCampaignFrameClosureHost): number {
    return nativeHost.descentDeepest.get(nativeHost.zone.id) ?? 0;
  }

export function sceneRescaleEnemies(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    for (const a of nativeHost.actors) {
      if (a.dead || a.team !== 'enemy' || a.owner) continue;
      const frac = a.maxLife() > 0 ? a.life / a.maxLife() : 1;
      nativeHost.applyPartyScale(a);
      a.life = Math.max(1, Math.round(a.maxLife() * frac));
    }
  }

export function sceneSupportDropPool(nativeHost:NativeSceneCampaignFrameClosureHost, atLevel: number, floor?: GemFloor): SupportDef[] { return settlementSupportDropPool(nativeHost.nativeSettlementHost(),atLevel,floor); }

export function sceneMemoryLeanOf(nativeHost:NativeSceneCampaignFrameClosureHost, def: MonsterDef | undefined, pool: SkillDef[]): { rung: 'kit' | 'bias' | 'wide'; kit: SkillDef[] } {
    const ids = new Set(pool.map(s => s.id));
    const kit = [...new Set(def?.skills ?? [])].filter(id => ids.has(id)).map(id => SKILLS[id]);
    if (kit.length) return { rung: 'kit', kit };
    if (def?.gemBias?.length) return { rung: 'bias', kit: [] };
    return { rung: 'wide', kit: [] };
  }

export function sceneCaravanDestName(nativeHost:NativeSceneCampaignFrameClosureHost, band: number): string {
    const destId = `caravan_band_${band}`;
    const minted = nativeHost.zoneMap[destId];
    if (minted) return minted.name;
    const b = caravanBand(band);
    const lvl = b ? b.level : Math.max(1, band * 10);
    const seed = (nativeHost.manifest.seed ^ hashStr(destId)) >>> 0;
    const coord = nativeHost.findBandCoord(lvl, seed);
    const rng = new Rng(seed);
    const tsId = pickTilesetForBiome(nativeHost.biomeFor(coord), rng);
    const ts = tsId ? TILESETS[tsId] : undefined;
    if (!ts) return 'the Distant Wilds';
    return `${rng.pick(ts.nameFirst)} ${rng.pick(ts.nameSecond)}`;
  }

export function scenePayBountyComponent(nativeHost:NativeSceneCampaignFrameClosureHost, p: BountyPosting, seat: Seat, pay: BountyPosting['pay']): void {
    if (!pay.unique && !pay.lot && !pay.pouch && !pay.gem && !pay.craft) return;
    const rng = new Rng((nativeHost.manifest.seed ^ hashStr(`bountypay:${p.id}`)) >>> 0);
    const rf = (): number => rng.next();
    const ilvl = Math.max(1, pay.level ?? p.expedition?.level ?? nativeHost.zoneMap[p.zoneId]?.level ?? 1);
    const at = seat.actor.pos;
    const fallback = (): void => {
      // A pool emptied between arm and pay (a registry edit mid-run):
      // never a silent nothing — essence covers the card's worth, said.
      const bountyFallback = pay.unique?.essenceValue === undefined ? bountyChargePay(ilvl)
        : bountyEssenceMix(pay.unique.essenceValue, ilvl, 'mixed', rng);
      for (const c of bountyFallback) nativeHost.dropEssenceAt(at, c);
      nativeHost.notice('The promised piece is gone from the world — the board pays in essence.', BOUNTY_BOARD_CFG.accent, 14, 'civic');
    };
    if (pay.unique) {
      const item = rollItem(pay.unique.id
        ? { ilvl, uniqueId: pay.unique.id, rng: rf }
        : { ilvl, rarity: 'unique', category: pay.unique.category, rng: rf });
      if (item?.rarity === 'unique') nativeHost.dropGearAt(at, item, undefined, true);
      else fallback();
      return;
    }
    if (pay.lot) {
      let landed = 0;
      for (let i = 0; i < pay.lot.count; i++) {
        const item = rollItem({
          ilvl, category: pay.lot.category, rng: rf,
          rarityWeights: BOUNTY_BOARD_CFG.lanes.lot.rarityWeights,
        });
        if (item) { nativeHost.dropGearAt(vec(at.x + rand(-24, 24), at.y + rand(-24, 24)), item, undefined, true); landed++; }
      }
      if (!landed) fallback();
      return;
    }
    if (pay.gem) {
      const def = SKILLS[pay.gem.id];
      if (!def) { fallback(); return; }
      // THE OFFERED GRADE (2026-09-12): a board-named Memory is a STATED
      // reward, so it rolls the board's own ladder (never below its floor —
      // BOUNTY_BOARD_CFG.lanes.gem.rarityWeights), seeded per posting like
      // the rest of the pay. The card printed the floor; the pay honors it.
      const inst = makeSkillGem(def, 1, rollSkillRarityWeighted(rng.next(), BOUNTY_BOARD_CFG.lanes.gem.rarityWeights));
      nativeHost.dropGearAt(at, makeSkillGemItem(inst), undefined, true);
      // THE MINT LAW: a board-paid Memory is a genuine mint site — the
      // drop index feeds, the Standing Order keeps its food.
      nativeHost.noteGemDrop(def.id, inst.rarity);
      return;
    }
    if (pay.craft) {
      // R5 THE SMITH'S WRIT: the credit itself mints as a 1×1 carried
      // paper (walk card 3a) — ilvl = the target's level (the forge's own
      // mint reads it back), payload on ItemInstance.writ. Owed like every
      // board pay; the bag is the bench's shelf.
      const it: ItemInstance = {
        uid: nextItemUid(), baseId: 'smith_writ', ilvl, tier: 1,
        rarity: 'common',
        name: `Smith's Writ: ${['low', 'medium', 'high'][pay.craft.complexity - 1] ?? 'low'}-complexity ${pay.craft.category}`,
        baseRoll: 0, implicitRolls: [], affixes: [],
        writ: { category: pay.craft.category, complexity: pay.craft.complexity },
      };
      nativeHost.dropGearAt(at, it, undefined, true);
      if (nativeHost.metaProgressionActive()) {
        bumpLedger(nativeHost.account.ledger, LEDGER_BOUNTY_CRAFT_DONE);
        nativeHost.accountDirty = true;
      }
      return;
    }
    if (pay.pouch) {
      const units = Array.from({ length: pay.pouch.count }, () =>
        ({ d: MEMORY_TRADED_PROVENANCE, s: (rng.next() * 0xffffffff) >>> 0 }));
      const item = makeMemoryItem(pay.pouch.kind, units);
      // Merge onto the standing bag pouch (the vendor-buy law); a full bag
      // spills it owed at the feet — never lost.
      if (!nativeHost.tryMergeMemoryItem(seat, item)) nativeHost.dropGearAt(at, item, undefined, true);
    }
  }

export function sceneNearScrapVendor(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): boolean {
    return VENDORS.some(v => v.salvage?.(nativeHost) && v.near(nativeHost, seat));
  }

export function sceneStationNear(nativeHost:NativeSceneCampaignFrameClosureHost, id: SuiteStation, seat: Seat = nativeHost.localSeat): boolean {
    return id === 'salvage' ? nativeHost.nearSalvage(seat) : nativeHost.nearOracle(seat);
  }

export function sceneSuiteSummons(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): SuiteStation[] {
    const out: SuiteStation[] = [];
    for (const s of nativeHost.suitesAt(seat)) {
      for (const m of s.members) if (nativeHost.stationStands(m) && !out.includes(m)) out.push(m);
    }
    return out;
  }

export function sceneApplyPartyScale(nativeHost:NativeSceneCampaignFrameClosureHost, a: Actor): void {
    if (COOP_SCALING.shareRadius > 0 && a.pos.x === 0 && a.pos.y === 0) nativeHost.nearScaleDue.push(a); // keeperSeat: scaled at the placeholder, settled after the seat
    return applyScenePartyScale(nativeHost.nativeScenePopulationHost(),a);
  }

export function sceneSuitesAt(nativeHost:NativeSceneCampaignFrameClosureHost, seat: Seat = nativeHost.localSeat): SuiteDef[] {
    return SUITES.filter(s => VENDORS.some(v =>
      (!s.counters || s.counters.includes(v.id)) && v.near(nativeHost, seat)));
  }

export function sceneStationStands(nativeHost:NativeSceneCampaignFrameClosureHost, id: SuiteStation): boolean {
    return id === 'salvage' ? nativeHost.hasSalvage() : nativeHost.hasOracle();
  }

