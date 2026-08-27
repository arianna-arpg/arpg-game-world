// ---------------------------------------------------------------------------
// DOM panels: class selection, character sheet, skill book (unlock / level /
// socket support gems), passive tree, death screen.
//
// All panels are generated from the data registries, so new attributes,
// stats, skills, supports, passives, and classes appear here automatically.
// ---------------------------------------------------------------------------

import { clamp, mixHex } from '../core/math';
import { tellPortraitDress } from '../engine/tells';
import { DEV, GAME_TITLE } from '../config';
import {
  ATTRIBUTES, ATTRIBUTE_IDS, STAT_DEFS,
  type AttributeId, type DamageType,
} from '../engine/stats';
import { SHEET_VITALS, sheetTabs, statBlurbOf } from '../data/sheet';
import { resistValue } from '../engine/damage';
import { chargeLabel } from '../engine/charges';
import {
  bandPointsAt, crewBoardingOpen, crewSkillsServed, effectiveSkillLevel, essenceTierForLevel, instanceChargeCost, SKILL_LEVEL_BANDS, SKILL_RARITIES, skillCooldownSeconds, skillMaxLevel,
  supportFitsInstOrCrew, supportMaxLevel, treeNodeRefusal, treeSpentBranch,
  type SkillDef, type SkillInstance, type SkillRarity, type SkillTreeNode, type SupportInstance,
} from '../engine/skills';
import { EQUIP_SLOTS, ITEM_CFG, ITEM_RARITIES, SLOT_BY_ID, slotsForCategory, socketCap, type EquipSlotDef, type ItemInstance } from '../engine/items';
import { findBagGem, gemInitials, skillGemPayloadOf, skillOfGemItem, supportGemPayloadOf, supportOfGemItem } from '../engine/gemitems';
import {
  MEMORY_CFG, MEMORY_KINDS, MEMORY_TRADED_PROVENANCE, memoryFacets,
  memoryGroups, memoryKindOf, type MemoryKind, type MemoryRecallResult,
} from '../engine/memories';
import { GEM_DROP_CFG } from '../engine/loot';
import { canPlaceAt, overlappingItems } from '../engine/inventory';
import { VESTIGES, VESTIGE_LIST } from '../data/vestiges';
import { compareItemMods, describeItem, itemGridSize, type ModCompareRow } from '../engine/itemgen';
import { ITEM_BASES } from '../data/itembases';
import {
  ABILITY_ESSENCE_CFG, ABILITY_ESSENCES, abilityEssenceOfTier, ESSENCES, ESSENCE_IDS,
  ESSENCE_VALUE_LABEL, essenceUnitsForValue, FONT_CFG, skillLevelAbilityCost, supportLevelAbilityCost,
  type AbilityCost, type EssenceCost, type EssenceId,
} from '../data/essences';
import {
  CRAFT_CFG, craftableAffixesFor, craftedCount, expertiseProgress, expertiseRank,
  salvageItemYield, salvageSkillYield, salvageSupportYield,
  sellItemYield, sellSkillYield, sellSupportYield,
} from '../engine/crafting';
import { SKILLS, SKILL_LIST } from '../data/skills';
import { mimicEntries } from '../engine/mimic';
import {
  BESTIARY_CFG, bestiaryKills, bestiaryList, bestiaryReveals,
  bestiaryThreshold, bestiaryTotals, spectreAttunable,
} from '../data/bestiary';
import { dndCancel, dndCarried, registerDragSource, registerDropTarget } from './dnd';
import { applyUiScale, UI_SCALE_CFG } from './uiScale';
import { RENDER_SCALE_CFG } from '../render/renderScale';
import { CAMERA_MODES, cameraModeOf } from '../render/camera';
import { FACTIONS, MONSTERS, defDensity, type MonsterDef } from '../data/monsters';
import { heftTierOf } from '../engine/mass';
import { DEFENSE_CFG } from '../engine/defense';
import type { Actor } from '../engine/actor';
import { previewSkill, type PreviewRow } from '../engine/skillPreview';
import {
  drawPortraitInto, paintPortrait, portraitSubjectOf,
  type PortraitDefLike, type PortraitSubject,
} from '../render/vis/portrait';
import { VIS_CFG } from '../render/vis/visConfig';
import { CLASSES, type ClassDef } from '../data/classes';
import { classStartNode, PASSIVE_ADJACENCY, PASSIVE_NODES, vocationGateNodeId, vocationGateOpen, type PassiveNode } from '../data/passives';
import { PASSIVE_CHOICE_CFG, choiceDealClaimant, choiceDealSpent, choiceGroupOf, choiceLockReason, choiceNodeLocked, choiceOptionOf, choicePickLimit, chosenOf, graftSourcesOf, nodeChoiceOpen } from '../data/passiveChoices';
import { MAIN_REALM, PASSIVE_REALMS, openRealms, realmIdOf, realmOf, realmOpen } from '../data/passiveRealms';
import { SUPPORTS, SUPPORT_LIST } from '../data/supports';
import { VOCATIONS, vocationRootId } from '../data/vocations';
import { BIOMES, biomeOf } from '../world/biomes';
import {
  floatKindOn, floatKinds, noticeChannelOn, noticeChannels,
  NOTICE_ANCHORS, NOTICE_CFG, PICKUP_FEED_CFG,
} from '../world/bulletins';
import { boundaryGateOf } from '../data/boundaryGates';
import { dimensionDef } from '../world/dimensions';
import { collectMarkers } from '../world/mapMarkers';
import { zoneInfoFor, type ZoneInfoEntry } from '../world/zoneInfo';
import type { Seat, VendorEntry, VendorHoldRow, World } from '../engine/world';
import { COUCH_CFG, couchMinPads } from '../data/couch';
import { HOLD_CLASSES } from '../data/harborholds';
import {
  accountLevelThreshold, featureEnabled, FEATURE, isClassUnlocked, isSkillUnlockedForDrop,
  isSupportUnlockedForDrop, gemDropKey, META_CURRENCY_LABEL, selectableSlotCount,
  sealReckoning, type Account, type RunRecord,
} from '../meta/account';
import {
  allUnlockables, applyUnlock, availableUnlocks, classUnlockFor, INVEST_CFG, investedToward,
  investUnlock, isClassDiscovered, isUnlockOwned, maxSlotCount, remainingCost,
  resurrectUnlockId, sealedUnlocks, undiscoveredClassUnlocks, unlockCompleted,
  VAULT_KIND_LABELS, vaultKindOrder, vaultSeatOf, vaultShelfCensus, vaultStripVisible,
  type Unlockable,
} from '../meta/unlocks';
import { MERC_CFG } from '../meta/mercs';
import {
  ACTION_IDS, ACTION_LABELS, keyDisplay, PAD_ACTION_IDS, PAD_ACTION_LABELS,
  type ActionId, type PadActionId, type Settings,
} from '../meta/settings';
import { PAD_CFG, padDisplay, AIM_ASSIST_MODES, connectedPadIndices } from '../core/gamepad';
import { wipeRosterSlot, type CharacterSave } from '../meta/character';
import {
  applySaveImport, buildSaveEnvelope, planSaveImport, saveEnvelopeName,
  type SaveImportPlan,
} from '../meta/portage';
import {
  availableModes, DEFAULT_MODE_ID, modeById, rosterCapacity, rosterOf, stageOf,
  type RosterEntry,
} from '../meta/modes';
import { bound, defaultEnabledFor } from '../packages/manifest';
import { isConfigured, PACKAGES } from '../packages/registry';
import type { ContentPackage } from '../packages/types';
import { QUEST_CATEGORY_CAPS, QUEST_CATEGORY_COLORS, type QuestCategory } from '../quests/types';
import { objectiveRead, objectiveSeals, type ZoneDef } from '../data/zones';
import { underSpanPolicyOf } from '../data/underspans';
import { zoneKindOf } from '../data/zoneKinds';
import { esc } from './dom';
import { bindTooltips, hideTooltip, TIP_CFG, type TooltipContent } from './tooltip';
import { runRuneMinigame, runSmithMinigame } from './minigames';
import { VENDORS, VENDOR_CFG, fmtRestock, type VendorDef } from '../data/vendors';
import { BOUNTY_BOARD_CFG } from '../data/bountyboard';
import { oracleRerollCost } from '../data/essences';
import { ITEM_AFFIXES } from '../data/itemaffixes';
import { formatModLine, lerpRange, roundStatValue } from '../engine/items';
import { attachPanZoom, clampZoom, PANZOOM_DEFAULTS } from './panzoom';
import { MAP_CFG, MAP_LABEL_MODES } from './mapConfig';
import { applyCursor, CURSOR_COLORS, CURSOR_STYLES } from '../core/cursor';
import { AIM_TICK_STYLES } from '../render/vis/aimtick';

/** Neutral accent for packages that declare no colour of their own. */
const PKG_FALLBACK_COLOR = '#888';

/** What main.ts hands the death screen: THE RECKONING's appraisal
 *  (world.reckonRunEssence — the carried wallet read tier by tier at the
 *  strict mortal exchange), the run's journey score, and its chronicle
 *  standing (null = a sealed stage's conclusion, off the board). */
export interface RunReckoning {
  rows: { id: EssenceId; count: number; worth: number; value: number }[];
  carried: number;
  mult: number;
  minted: number;
  renown: number;
  standing: { byEssence: number; byRenown: number; of: number } | null;
  /** THE FALL's true ground (a 'fall' conclusion stands the vessel back in
   *  the sanctuary before the epilogue reads the world — this remembers
   *  where it actually died). Absent = read world.zone. */
  zoneName?: string;
}

/** The bottom keybind strip's one switch — retired by default since the
 *  prologue drill + Waking House tutorial took over teaching the binds
 *  (updateHintBar). Flip true to restore the standing crib sheet. */
const HINT_BAR_ENABLED = false;

/** THE MILESTONE POPUP layer (skill-mode trees, M1 — §7, DIAL): a banked
 *  Ability point offers its popup at the next disciplined calm (the world
 *  queues; updateTreePips fires the request — never mid-combat). Off = the
 *  drawer's waiting-pip stays the only messenger. */
/** THE CLOSE GLYPH keeps the inventory's top-right corner (closeGlyphHtml),
 *  so the essence satchel button — and the drop-down hanging under it —
 *  sit this many px in from the panel's right edge. */
const SATCHEL_RIGHT_PX = 46;
const TREE_POPUP_ENABLED = true;

/** Item-category glyphs — bag tiles and the drag fabric's ghost chip share
 *  one vocabulary (a lifted thing looks like the tile it left). */
/** THE DOLL SEATS — the equipped figure's body arrangement as presentation
 *  DATA, in the bag's own CELL units (fractions welcome): the center spine
 *  runs helmet → chest → belt → legs → boots; the amulet nestles at the
 *  neck's right; the rings sit side by side on the left flank with the
 *  gloves beneath them at mid-chest height; the (future-slated) hands
 *  flank the right — their seats already wait, so enabling the slots in
 *  EQUIP_SLOTS is the WHOLE launch. Any enabled slot missing a seat here
 *  falls to the spare strip under the figure (the never-invisible law):
 *  a new slot ships first and earns its place on the body second. */
const DOLL_SEATS: Record<string, { x: number; y: number; w: number; h: number }> = {
  helmet:   { x: 2.15, y: 0,    w: 2,   h: 2 },
  amulet:   { x: 4.35, y: 1.55, w: 1,   h: 1 },
  chest:    { x: 2.15, y: 2.3,  w: 2,   h: 3 },
  ring1:    { x: 0.05, y: 2.5,  w: 1,   h: 1 },
  ring2:    { x: 1.15, y: 2.5,  w: 1,   h: 1 },
  gloves:   { x: 0.3,  y: 3.75, w: 1.7, h: 1.7 },
  legs:     { x: 4.35, y: 3.6,  w: 1.7, h: 2.2 },
  belt:     { x: 2.15, y: 5.5,  w: 2,   h: 1 },
  boots:    { x: 2.25, y: 6.7,  w: 1.8, h: 1.5 },
  mainhand: { x: 0.15, y: 5.7,  w: 1.8, h: 2.7 },
  offhand:  { x: 4.35, y: 6.05, w: 1.8, h: 2.3 },
};
/** The figure's width derives from the seats shown, exactly like its height
 *  — the doll hugs the bag inside the panel's horizontal seam, and a seat
 *  shifting outward grows the frame instead of birthing a scrollbar. */
const dollColsFor = (slots: readonly EquipSlotDef[]): number =>
  slots.reduce((m, s) => {
    const seat = DOLL_SEATS[s.id];
    return seat ? Math.max(m, seat.x + seat.w) : m;
  }, 0) + 0.05;
/** The figure's height DERIVES from the seats actually shown — compact
 *  today, and the day the hand slots enable, the body simply grows to
 *  hold them (no constant to remember). */
const dollRowsFor = (slots: readonly EquipSlotDef[]): number =>
  slots.reduce((m, s) => {
    const seat = DOLL_SEATS[s.id];
    return seat ? Math.max(m, seat.y + seat.h) : m;
  }, 0) + 0.1;

/** THE UNDERLAY — a faint body behind the seats, its anatomy DERIVED from
 *  the seat data itself (head under the helmet, shoulders through the
 *  chest, arms reaching for the flank seats, hips at the belt, legs down
 *  to the boots): shift a seat and the body follows. Pure presentation —
 *  pointer-events none, painted before the seat buttons so every drop
 *  target and glow stacks above it. */
const dollSilhouetteSvg = (cell: number, cols: number, rows: number): string => {
  const S = DOLL_SEATS;
  const px = (c: number): number => Math.round(c * cell * 10) / 10;
  const cx = px(S.helmet.x + S.helmet.w / 2);
  const headR = px(S.helmet.h * 0.34);
  const headCy = px(S.helmet.y + S.helmet.h * 0.62);
  const shoulderY = px(S.chest.y + 0.35);
  const shoulderHalf = px(S.chest.w * 0.58);
  const waistY = px(S.belt.y + S.belt.h * 0.5);
  const waistHalf = px(S.chest.w * 0.34);
  const wristL = { x: px(S.gloves.x + S.gloves.w * 0.55), y: px(S.gloves.y + S.gloves.h * 0.5) };
  const wristR = { x: px(S.legs.x + S.legs.w * 0.45), y: px(S.legs.y + S.legs.h * 0.35) };
  const footY = px(S.boots.y + S.boots.h * 0.75);
  const hipL = cx - px(S.chest.w * 0.2);
  const hipR = cx + px(S.chest.w * 0.2);
  const limb = Math.round(cell * 0.5);
  const tone = 'rgba(196,186,214,0.07)';
  const edge = 'rgba(196,186,214,0.12)';
  return `<svg width="${Math.ceil(cols * cell)}" height="${Math.ceil(rows * cell)}" viewBox="0 0 ${Math.ceil(cols * cell)} ${Math.ceil(rows * cell)}"
    style="position:absolute;inset:0;pointer-events:none" aria-hidden="true">
    <g fill="${tone}" stroke="${edge}" stroke-width="1.2">
      <circle cx="${cx}" cy="${headCy}" r="${headR}"/>
      <path d="M ${cx - shoulderHalf} ${shoulderY}
               Q ${cx} ${shoulderY - cell * 0.5} ${cx + shoulderHalf} ${shoulderY}
               L ${cx + waistHalf} ${waistY}
               Q ${cx} ${waistY + cell * 0.3} ${cx - waistHalf} ${waistY} Z"/>
    </g>
    <g fill="none" stroke="${tone}" stroke-width="${limb}" stroke-linecap="round">
      <path d="M ${cx - shoulderHalf * 0.85} ${shoulderY + 4} Q ${wristL.x - cell * 0.3} ${(shoulderY + wristL.y) / 2} ${wristL.x} ${wristL.y}"/>
      <path d="M ${cx + shoulderHalf * 0.85} ${shoulderY + 4} Q ${wristR.x + cell * 0.3} ${(shoulderY + wristR.y) / 2} ${wristR.x} ${wristR.y}"/>
      <path d="M ${hipL} ${waistY} L ${cx - px(0.45)} ${footY}"/>
      <path d="M ${hipR} ${waistY} L ${cx + px(0.45)} ${footY}"/>
    </g>
  </svg>`;
};

const CATEGORY_GLYPHS: Record<string, string> = {
  helmet: '⛑', chest: '🛡', gloves: '🧤', boots: '👢', legs: '👖', belt: '➰',
  ring: '💍', amulet: '📿', weapon: '⚔', offhand: '🛡', quiver: '🏹',
};

// --- THE RESIDENCE (skill-items M1): gem-tile look helpers -----------------

/** A gem wrapper tile's border color: the skill's own rarity ladder, or the
 *  support's def color (supports carry no rarity — the def IS the tint). */
const gemTileColorOf = (item: ItemInstance): string => {
  const sp = skillGemPayloadOf(item);
  if (sp) return SKILL_RARITIES[sp.rarity].color;
  const gp = supportGemPayloadOf(item);
  const def = gp ? SUPPORTS[gp.supportId] : null;
  return def?.color ?? '#b8b8b8';
};

/** THE ICON LAW (walk-1): the tile face IS the hotbar icon at 1×1 — the
 *  skill's color swatch wearing its initials (one icon truth, no second
 *  art). Supports wear the same face in their def color. */
const gemTileFaceHtml = (item: ItemInstance): string => {
  const sp = skillGemPayloadOf(item);
  const gp = supportGemPayloadOf(item);
  const def = sp ? SKILLS[sp.skillId] : gp ? SUPPORTS[gp.supportId] : null;
  if (!def) return '?';
  const color = 'color' in def && def.color ? def.color : '#b8b8b8';
  const lvl = sp?.level ?? gp?.level ?? 1;
  return `<span style="display:flex;align-items:center;justify-content:center;
      width:22px;height:22px;border-radius:3px;background:${color};opacity:0.9;
      color:#0a0a0e;font-weight:bold;font-size:9px;font-family:Verdana">${gemInitials(def.name)}</span>
    <span style="position:absolute;bottom:0;left:2px;font-size:8px;line-height:9px;color:#e8dcc8;text-shadow:0 0 2px #000">${lvl}</span>`;
};

/** The SCRAP-WHEEL cursor (vendor salvage mode): a gear glyph rendered into
 *  an SVG data-URI, crosshair fallback where custom cursors are refused. */
const SCRAP_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><text x="2" y="20" font-size="19">⚙</text></svg>',
)}") 13 13, crosshair`;

/** The BREAKER'S-HAMMER cursor (the bench's BREAK mode, benchBreakMode): the
 *  scrap wheel's bench sibling — while armed it rides the salvage panel AND
 *  the inventory, where clicks break things for essence. Same sovereign
 *  data-URI idiom as SCRAP_CURSOR (never themed), crosshair fallback. */
const BREAK_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><text x="2" y="20" font-size="19">⚒</text></svg>',
)}") 13 13, crosshair`;

/** THE AUTO-ARM CHOICE — one seam, every salvage view: true (shipped) means
 *  arriving at the bench OR an open scrap counter ARMS its salvage mode and
 *  opens the bag beside it (arm-on-open, exactly as the bench debuted);
 *  false makes every view wait for its toggle press instead (arm-on-toggle).
 *  One word here settles all surfaces at once. */
const SALVAGE_AUTO_ARM = true;

/** Resistance rows display the EFFECTIVE (soft/hard-capped) value, with the
 *  raw overcap alongside when it exceeds the cap (shred insurance). The
 *  sheet's ORGANIZATION — which stats print where, and when — lives in
 *  data/sheet.ts (SHEET_CATS/SHEET_VITALS); this map is only the resist
 *  rows' special double read. */
const SHEET_RES: Record<string, DamageType> = {
  fireRes: 'fire', coldRes: 'cold', lightningRes: 'lightning', chaosRes: 'chaos',
};

/** Delegates to the engine's ONE requirements predicate (World.meetsRequirements
 *  → reqShortfall) — the learn gate, the cast-time gate and this panel speak
 *  the same law, judged against the OPENER seat's build (the couch lens). */
export function meetsRequirements(world: World, def: SkillDef, seat: Seat = world.localSeat): boolean {
  return world.meetsRequirements(def.id, seat);
}

/** THE TIER TELL (the world map's stacked-ground read, refreshMap's node
 *  loop): distills `ZoneDef.tiers` into the node's under-disc glyph — null
 *  on flat ground, and null while the zone is fogged (`revealed` is the
 *  loop's `known || scouted`, the EXACT predicate the biome fill and
 *  zone-kind glyph ride: an unwalked, unsurveyed zone keeps its secret).
 *  `mark` mirrors ZoneTiers.exposure — 'open' (both layers visible in
 *  zone: buttes, summits) wears solid under-rims, 'covered' (only the
 *  active layer draws: sewer ducts, stacked floors) wears dashed ones —
 *  and `floors` counts walkable stories (ground + elevated levels),
 *  clamped to the two under-discs a node can legibly stack. Pure by
 *  construction — pinned by balance/probe_tiers.ts RIG M. */
export function tierMapTell(def: Pick<ZoneDef, 'tiers'>, revealed: boolean):
  { mark: 'open' | 'covered'; floors: number; tint: string } | null {
  const t = def.tiers;
  if (!t || !revealed) return null;
  const floors = 1 + Math.max(1, Math.min(Math.floor(t.levels ?? 1), 2));
  return t.exposure === 'open'
    ? { mark: 'open', floors, tint: '#b8a878' }
    : { mark: 'covered', floors, tint: '#8878c8' };
}

/** THE TIER TINT (the tell's COLOR half — the map's stacked-ground shade):
 *  folds a zone's story stack into its node FILL. Direction rides
 *  `ZoneTiers.kind` (the STRUCTURAL axis — the tell's `mark` rides exposure,
 *  the presentational one): 'over' stacks mix toward the terrace convention's
 *  pale crown — higher = lighter, the exact ascent the ground bake already
 *  draws (world/regions.ts TERRACE_FILL) — and 'under' stacks mix toward the
 *  dark, the tell's own under-disc law. Strength = story count ×
 *  `VIS_CFG.mapTierTint.perStory`, capped at `.max`; the dial at 0 kills the
 *  read whole. Fog-gated by the SAME `revealed` the tell rides, and PURE:
 *  flat ground, fogged ground, a zero dial, and any fill that isn't a
 *  6-digit hex (mixHex's contract) all return the INPUT STRING UNTOUCHED —
 *  byte-zero on storyless zones by construction. Pinned by
 *  balance/probe_tiers.ts RIG M′. */
export function tierMapTint(def: Pick<ZoneDef, 'tiers'>, revealed: boolean, fill: string): string {
  const t = def.tiers;
  if (!t || !revealed) return fill;
  const cfg = VIS_CFG.mapTierTint;
  const stories = Math.max(1, Math.floor(t.levels ?? 1));
  const k = Math.min(cfg.max, stories * cfg.perStory);
  if (k <= 0 || !/^#[0-9a-fA-F]{6}$/.test(fill)) return fill;
  return mixHex(fill, t.kind === 'under' ? cfg.underTo : cfg.overTo, k);
}

export class UI {
  private classSelect = document.getElementById('class-select')!;
  private charSheet = document.getElementById('char-sheet')!;
  private inventory = document.getElementById('inventory')!;
  private passiveTree = document.getElementById('passive-tree')!;
  private worldMap = document.getElementById('world-map')!;
  private caravanMenu = document.getElementById('caravan-menu')!;
  private salvageMenu = document.getElementById('salvage-menu')!;
  private fontMenu = document.getElementById('font-menu')!;
  private recallMenu = document.getElementById('recall-menu')!;
  private oracleMenu = document.getElementById('oracle-menu')!;
  private bestiaryMenu = document.getElementById('bestiary-menu')!;
  private vendorMenu = document.getElementById('vendor-menu')!;
  private boroughMenu = document.getElementById('borough-menu')!;
  private bountyMenu = document.getElementById('bounty-menu')!;
  private sailMenu = document.getElementById('sail-menu')!;
  private holdMenu = document.getElementById('hold-menu')!;
  private vocationMenu = document.getElementById('vocation-menu')!;
  private mercMenu = document.getElementById('merc-menu')!;
  private deathScreen = document.getElementById('death-screen')!;
  private storyCard = document.getElementById('story-card')!;
  private accountScreen = document.getElementById('account-screen')!;
  private escapeMenu = document.getElementById('escape-menu')!;
  private startMenu = document.getElementById('start-menu')!;
  private expeditionSetup = document.getElementById('expedition-setup')!;

  /** The resumable character save, if any (set after the async boot load). */
  private continueSave: CharacterSave | null = null;
  /** The rolled class roster for the CURRENT new-run offer. Cached so menu
   *  navigation (Vault, Event Weights, Back) doesn't re-roll it; reset only when
   *  a run ends (resetClassRoster, called on death) so each new run deals fresh. */
  /** The dealt hand + locked teasers, cached per offer. `dealtFor` fingerprints
   *  the deal INPUTS (hand size + unlocked-class pool + DISCOVERED set) so
   *  buying a Class Slot OR a Class bundle mid-offer re-deals — including a
   *  purchase whose ownership chain reveals new kin; menu navigation keeps
   *  the hand. `rumors` are the shrouded cards: hints of UNDISCOVERED
   *  classes, dealt into the leftover teaser slots — mystery with a compass,
   *  never a name (the discovery web, meta/unlocks.ts). */
  private classRoster: {
    picks: ClassDef[];
    teasers: { def: ClassDef; reason: 'slots' | 'class' }[];
    rumors: string[];
    dealtFor: string;
  } | null = null;
  /** The LIFE-CONTRACT selected on the class screen (meta/modes.ts). Sticky
   *  across menu navigation like the class hand; reset with it each new offer. */
  private pendingModeId: string = DEFAULT_MODE_ID;
  /** THE NAME typed on the class screen this offer. null = untouched (falls
   *  back to account.namePref); '' = explicitly Nameless. Survives the mode
   *  picker's re-renders; reset with the hand. */
  private pendingCharName: string | null = null;
  /** Start-menu callbacks, retained so Vault/Keybinds sub-views can return. */
  private startHandlers: {
    onStart: (d: ClassDef, modeId?: string) => void;
    onContinue: (s?: CharacterSave | null) => void;
    onCoop?: () => void;
    onRoster?: (e: RosterEntry) => void;
    /** Why we landed here (a co-op session that ended under the player). Shown
     *  until the menu is next opened without one — the Vault/Options sub-views
     *  return through showStartMenu with no notice, which clears it. */
    notice?: string;
  } | null = null;
  /** The pending rebind keydown-capture listener (armed when a row is clicked,
   *  before a key is pressed). Tracked so it can be torn down on re-render / any
   *  navigation away — a leaked capture would swallow & silently rebind the next
   *  gameplay keystroke. */
  private armedRebind: ((e: KeyboardEvent) => void) | null = null;
  /** Pad-capture bridge, injected by main (panels never touch the device layer):
   *  arm = the NEXT pad button press is swallowed and delivered as a binding
   *  code; disarm = cancel. Same leak discipline as armedRebind — disarmRebind
   *  tears both down on every re-render / navigation. */
  armPadCapture: ((cb: (code: string) => void) => void) | null = null;
  disarmPadCapture: (() => void) | null = null;
  /** Wired by main (same altitude as the capture bridge): has the CONTROLLER
   *  spoken recently? Slot labels and bind hints follow the device of the
   *  moment — pad glyphs while it drives, keyboard keys when the mouse does. */
  getPadActive: (() => boolean) | null = null;

  charSheetOpen = false;
  /** The Statistics tab open on the character sheet (persists across
   *  re-renders — a page stays where you left it). */
  private charTab = 'offense';
  /** The Options menu's active tab (the character sheet's book-tab idiom —
   *  the panel long outgrew "Customize Keybinds"). */
  private optionsTab: 'controls' | 'controller' | 'interface' | 'visuals' = 'controls';
  /** SAVE PORTAGE (options → Interface, meta/portage.ts): the transient
   *  status line and the validated import awaiting its overwrite confirm.
   *  Session-local by design — an abandoned confirm simply lapses. */
  private savePortNote: string | null = null;
  private savePortPending: SaveImportPlan | null = null;
  /** THE VAULT SHELVES (meta/unlocks.ts VAULT_TABS — the store's organization
   *  as data): the active shelf, plus each shelf's remembered scroll — the
   *  store keeps your place per aisle across purchases, flips, and re-opens.
   *  '' = first open this session: land where there is something to buy. */
  private vaultTab = '';
  private vaultScroll: Record<string, number> = {};
  /** THE RUN CHRONICLE's remembered ordering (personal-leaderboard axis). */
  private chronicleSort: 'essence' | 'renown' | 'latest' = 'essence';
  /** THE TREE LENS — the passive tree's live search query (sticky across
   *  refreshes; matches name + description + granted lines, hits glow,
   *  the rest dims). */
  private treeSearch = '';
  /** Suppresses the trailing synthetic click after a handled pointer press
   *  on an Unlock card (native mice AND the pad pointer both send one) —
   *  the keyboard lane is exactly the clicks arriving with no recent press. */
  private investPointerAt = 0;
  /** THE RUMOR FOLD: the rumor wall's open/closed latch (the satchel idiom —
   *  remembered across re-renders, reopens and shelf flips this session). */
  private vaultRumorsOpen = true;
  /** "Show unused": list every seated stat on the active tab, base or not
   *  (generated families still surface only once touched — see sheet.ts). */
  private charShowAll = false;
  inventoryOpen = false;
  /** The essence SATCHEL flap on the inventory panel (persists across
   *  re-renders — a satchel stays however you left it). */
  private satchelOpen = false;
  /** The BUILD flap on the gear tab: the learned-skills list riding the
   *  left edge of the inventory — the whole build in one glance. Remembers
   *  its state across panel closes, satchel-style. */
  private buildFlapOpen = false;
  /** Skill-mode tree panels the user has manually unfolded (a waiting
   *  point holds a tree open regardless — the pip law). */
  private skillTreeOpen = new Set<string>();
  // (The flap's TUTORIAL GLOW carries no UI state of its own — like the
  //  flask bag tiles', it reads LIVE off World.mireilleGiftLesson each
  //  render: glowing while the lesson pends and the drawer is closed,
  //  quiet the moment the lesson advances or latches LIVED. An early idle
  //  browse can't silence a step that hasn't been walked yet.)
  // (THE RESIDENCE, skill-items M1: the inventory's gem tabs retired — loose
  //  gems are 1×1 bag items on the one gear face; invTab died with them.)
  /** The floating CHOICE-NODE popup (appended to body — it must ride above
   *  the SVG and survive nothing: every refresh/pan/close dismisses it). */
  private choicePopup: HTMLDivElement | null = null;
  private choicePopupDismiss: ((ev: PointerEvent) => void) | null = null;
  /** The passive-tree panel's active REALM TAB (data/passiveRealms.ts). */
  private treeRealm: string = MAIN_REALM;
  /** GRAFT bind flow: the lifted graft key awaiting its carrier skill click. */
  private liftedGraftKey: string | null = null;
  treeOpen = false;
  mapOpen = false;
  caravanOpen = false;
  mercOpen = false;
  salvageOpen = false;
  /** THE BREAKER'S HAMMER (bench break mode): while the salvage tab is up
   *  and this is armed, the BAG is the salvage menu — the break cursor rides
   *  the inventory and clicks there salvage. Re-armed on every bench visit;
   *  the panel's toggle stands it down. */
  private benchBreakMode = true;
  /** Station view state: which tab, and the craft tab's chosen piece. */
  private salvageTab: 'salvage' | 'craft' = 'salvage';
  private craftTargetUid: number | null = null;
  oracleOpen = false;
  private oracleTargetUid: number | null = null;
  /** The Sacrificial Font's recipe screen (skill-mode trees, M1 — §7). */
  fontOpen = false;
  private fontTab: 'merge' | 'convert' | 'reset' = 'merge';
  /** THE RECALL (skill-items M2/M3, §3b): the Memory pouches' picker. */
  recallOpen = false;
  private recallUid = 0;
  /** The open pouch's KIND (last seen — outlives the pouch for the spent
   *  panel's header) and, on a Preformed pouch, THE FACET the player has
   *  committed to (a triad's lead attribute id; null until chosen — the
   *  RECALL buttons arm only once it is). */
  private recallKind: MemoryKind = 'rough';
  private recallFacet: string | null = null;
  /** THE REVEAL rows: dropper id → the grant its row last flipped to. */
  private recallReveals = new Map<string, { name: string; color: string; sockets: number }>();
  /** Found-flash marks: freshly-recalled bag uids → flash-until (ms). */
  private memFlash = new Map<number, number>();
  /** The Tracker's book: which leaf is open, and which page is under the thumb. */
  bestiaryOpen = false;
  private bestiaryPage = 0;
  private bestiarySel: string | null = null;
  vendorOpen = false;
  /** The Borough arming panel: which villager the dwell offered. */
  boroughOpen = false;
  private boroughFolkId = -1;
  /** The scrap wheel (the SELL lane's armed flag): while ON, the BAG is the
   *  sell menu — the ⚙ cursor rides the counter and the (same-seat)
   *  inventory, and clicks there SELL for Coarse Essence (the Breaker's Eye
   *  baseline on the sell lane). Auto-armed on arrival at an open scrap
   *  counter (SALVAGE_AUTO_ARM); reset on close — never sticky. */
  private scrapMode = false;
  /** THE STANDING ORDER picker: which counter's pane is open + its filter. */
  private vendorCommOpen: string | null = null;
  private vendorCommQuery = '';
  /** The vendor screen's live ticker (countdown in place; repaint on restock). */
  private vendorTicker: number | null = null;
  private vendorTickerRestockAt = 0;
  /** A minigame overlay is running — the panels beneath hold still. */
  private minigameActive = false;
  /** THE BOUNTY BOARD's postings panel (docs/design/bounty-board.md M0). */
  bountiesOpen = false;
  /** Its live ticker (countdown in place; repaint when the slate turns). */
  private bountyTicker: number | null = null;
  private bountyFingerprint = '';
  sailOpen = false;
  holdOpen = false;
  vocationOpen = false;
  /** World-map zoom (1 = fit-all; >1 = zoomed in) + pan offset (user-units from
   *  the fitted centre). Persist across opens; reset via the map's % button. As
   *  the charted map grows and the fixed-size text shrinks, zoom in to read it. */
  private mapZoom = 1;
  private mapPan = { x: 0, y: 0 };
  /** Which view the world-map panel shows: the map, or the quest journal. */
  private mapTab: 'map' | 'quests' = 'map';
  /** Which DIMENSION the map tab shows (surface / underworld / …) — tabs
   *  appear once a run breaches a second dimension (the PoE Acts pattern). */
  private mapDimension = 'surface';
  /** Sim layers the user has toggled OFF on the map (by overlay id) — so a
   *  drifting weather front or territory tint can be silenced and never
   *  misread as the biome heat map "changing at random". Session-scoped. */
  private mapLayersOff = new Set<string>();
  /** True while the wash-intensity slider is held — the map's auto-refresh
   *  must not rebuild the very element under the pointer mid-drag. */
  private mapWashDragging = false;
  /** The fitted map box (set each refreshMap) so the wheel/drag handlers can
   *  recompute the viewBox without a full re-render. */
  private mapBox = { minX: 0, minY: 0, w: 1, h: 1 };
  /** Cached ocean-wash SVG keyed on the sampled box — the landmass field is
   *  pure per seed, so the O(map-area) sweep only reruns when charting GROWS
   *  the visible box, not on every 0.5s map refresh. */
  private oceanCache: { key: string; svg: string } | null = null;
  /** The zone the cursor is over (transient) and the zone CLICKED to pin (sticky,
   *  so you can move the cursor away to read a long list). The info box shows the
   *  pinned zone, else the hovered zone, else the zone you stand in. Both reset on
   *  close. They drive ONLY the side box — never a full map re-render. */
  private hoveredZone: string | null = null;
  private pinnedZone: string | null = null;
  /** True while a map drag-pan is in progress. The map auto-refreshes on a 0.5s
   *  timer (main.ts) to keep sim washes/markers live; that rebuild wholesale-swaps
   *  the SVG, which would kill an in-flight drag (closure drag state dies with the
   *  old node) and misfire the click-to-pin guard. This INSTANCE flag survives the
   *  swap so refreshMap can skip it mid-gesture. */
  private mapDragging = false;
  /** THE PRESS GUARD — panels currently holding a live pointer press (armed in
   *  the ctor on every 0.5s-refreshed panel). The auto-refresh must never
   *  rebuild a panel BETWEEN a pointer's press and its release: the click dies
   *  with the torn-out button (mousedown lands on the old node, mouseup on its
   *  replacement — no click fires anywhere), which read as "tabs need two
   *  clicks". While a press is in flight the refresh defers; the next 0.5s
   *  tick catches up. Self-healing like the pan fabric: ANY pointer release,
   *  cancel, or window blur clears the hold, so a drag released off-panel can
   *  never wedge the refresh shut. */
  private pressHeld = new Set<HTMLElement>();
  /** Last markup written per live-refreshed panel (setPanelHtml): an UNCHANGED
   *  rebuild is skipped whole — no teardown under the cursor, no tooltip
   *  anchor torn mid-read, no listener re-wiring, no GC churn, twice a second. */
  private panelHtml = new WeakMap<HTMLElement, string>();
  /** THE COUCH LENS (data/couch.ts): per-player panels remember which LOCAL
   *  seat opened them — the refresh renders THAT seat's data and the panel
   *  docks to that seat's flank. No entry = the local hero, and solo play
   *  never writes one that matters (panelSeat falls back to the local seat). */
  private panelSeatIds = new Map<HTMLElement, string>();
  /** True while the couch JOIN overlay is up (main.ts owns the claim scan). */
  couchJoinOpen = false;
  /** The escape menu's MAIN view re-renderer, live only while the menu is up
   *  (showEscapeMenu sets it, hideEscapeMenu clears it) — the couch census
   *  watcher re-runs it so the join row enables the moment a second
   *  controller first speaks. */
  private escRefresh: (() => void) | null = null;
  /** Re-render the pause menu's MAIN view in place (couch census change).
   *  Subviews are left alone — esc-resume standing in the DOM marks the
   *  main view; options/keybinds replace it and must not be yanked. */
  refreshEscapeCouchRow(): void {
    if (this.escapeMenuOpen && this.escRefresh
      && document.getElementById('esc-resume')) this.escRefresh();
  }
  /** Wired by main.ts when a couch session is possible at all — opens the
   *  join flow. Unset (solo build / net client) = no menu row exists. */
  onCouchJoin?: () => void;
  /** Wired beside it: every seated guest leaves (vessels saved first). */
  onCouchLeave?: () => void;
  /** Passive-tree zoom/pan — same model as the map, so the tree stays legible AND
   *  extensible: the fitted box is the node bounds (auto-fits any layout), and you
   *  zoom/drag to navigate as more nodes are added. Persist across opens. */
  private treeZoom = 1;
  private treePan = { x: 0, y: 0 };
  private treeBox = { minX: 0, minY: 0, w: 1000, h: 1000 };
  /** True while the Escape menu / rebind overlay is up — gameplay input pauses. */
  escapeMenuOpen = false;
  // (The book is single-view now; the inventory is too — the old gem tabs
  // retired with THE RESIDENCE: loose gems are bag items, skill-items M1.)
  /** DEV passive-tree editor hook: invoked at the end of every refreshTree so the
   *  editor can re-attach its select/drag/link handlers to the freshly-drawn SVG
   *  (set by mountPassiveEditor when DEV.passiveTreeEditor is on; else unused). */
  onTreeRender?: () => void;
  /** DEV start-menu hook: invoked at the end of every renderStartMenu (the menu
   *  rebuilds its innerHTML per render, so injected entries must re-inject).
   *  Set by mountEntityForge when DEV.entityForge is on; else unused. */
  onStartMenuRender?: () => void;

  constructor(
    private getWorld: () => World,
    private getAccount: () => Account,
    private saveAccount: () => void,
    private getSettings: () => Settings,
    private saveSettings: () => void,
    /** True when this client is a NETWORK co-op CLIENT (world is a render shell,
     *  not the authority) — gates host-authoritative controls like End Run. */
    private isCoopClient: () => boolean = () => false,
    /** Tear down a co-op session and return to the menu. */
    private onLeaveCoop: () => void = () => { /* default no-op */ },
  ) {
    // Tooltips: bound ONCE on the stable panel containers (delegation survives
    // their innerHTML re-renders); content is read from live data each hover.
    bindTooltips(this.charSheet, (el) =>
      el.dataset.tip === 'class' ? this.classTooltip()
        : el.dataset.tip === 'stat' ? this.statTooltip(el.dataset.statId!)
        : el.dataset.tip === 'attr' ? this.attrTooltip(el.dataset.attrId as AttributeId) : null);
    // Item tips everywhere grow the ON-SWAP comparison on a dwell (extend);
    // the extended flag only ever reaches itemTooltip — other cards have no
    // deeper form and simply re-serve themselves.
    bindTooltips(this.inventory, (el, ext) =>
      el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext, this.panelSeat(this.inventory), this.salvageLaneFor(this.inventory))
        : el.dataset.tip === 'skill' ? this.skillTooltip(el.dataset.skillId!, ext)
        : el.dataset.tip === 'vestige' ? this.vestigeTooltip(el.dataset.vestigeId!) : null,
    { extend: true });
    bindTooltips(this.salvageMenu, (el, ext) => el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext, this.panelSeat(this.salvageMenu)) : null, { extend: true });
    bindTooltips(this.oracleMenu, (el, ext) => el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext, this.panelSeat(this.oracleMenu)) : null, { extend: true });
    bindTooltips(this.vendorMenu, (el, ext) =>
      el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext, this.panelSeat(this.vendorMenu))
        : el.dataset.tip === 'vgem' ? this.vendorGemTooltip(el.dataset.vgem!) : null,
    { extend: true });
    bindTooltips(this.classSelect, (el) => el.dataset.tip === 'cskill' ? this.classSkillTooltip(el.dataset.skillId!) : null);
    // THE VAULT reads compact — kind, name, price — and keeps each unlock's
    // full story in the shared tooltip behind a HOVER-INTENT dwell: the wall
    // of text speaks only once the cursor has settled on a card (interest,
    // then detail). Content resolves from the LIVE catalog by id each hover,
    // so purchases and re-renders can never strand stale copy.
    bindTooltips(this.accountScreen, (el) =>
      el.dataset.tip === 'unlock' ? this.unlockTooltip(el.dataset.unlockId!)
        : el.dataset.tip === 'sealedunlock' ? this.sealedUnlockTooltip(el.dataset.unlockId!)
        : el.dataset.tip === 'rumor' ? this.rumorTooltip(Number(el.dataset.rumorI)) : null,
    { delayMs: TIP_CFG.intentMs });
    // Delegation works on SVG descendants too — tree nodes carry data-tip like
    // any DOM row, so mouse AND the pad pointer's synthetic hover both hit it.
    // PROXIMITY: zoomed out, nodes shrink toward pixels — the box anchors to
    // the nearest node within reach of the cursor (sticky, direct hit wins),
    // so reading the tree never demands surgical hovering.
    bindTooltips(this.passiveTree,
      (el) => el.dataset.tip === 'pnode' ? this.passiveNodeTooltip(el.dataset.node!) : null,
      { proximity: { selector: '.tree-node', radiusPx: 30, hysteresis: 0.35 } });
    this.updateHintBar(); // replace the static index.html placeholder with live binds

    // THE GRIMOIRE BINDING GESTURE (ui/dnd.ts — the drag fabric's first
    // consumer): a MASTERED, attunable bestiary page lifts from its book row
    // (press-drag or click-lift alike) and lands on a Spectre skill's slot in
    // the grimoire strip. The drop routes through requestMeta like every
    // mutation — and the ENGINE gate (World.attuneSpectre, attuneAtBook)
    // decides legality, so the UI never pretends an authority it lacks.
    registerDragSource({
      kind: 'bestiaryForm',
      clickLift: true,
      payload: (defId) => {
        const def = MONSTERS[defId];
        if (!def || !spectreAttunable(this.getAccount(), def)) return null;
        // With no grimoire skill learned there is nowhere to land — refuse
        // the lift so a row click stays a plain page-open.
        if (this.grimoireSkills().length === 0) return null;
        return {
          kind: 'bestiaryForm', arg: defId, label: def.name,
          ghostHtml: `${this.monsterGlyph(def, false)} ${def.name}`,
        };
      },
    });
    registerDropTarget({
      kind: 'spectreSlot',
      accepts: (p, skillId) => p.kind === 'bestiaryForm'
        && this.grimoireSkills().some(inst => inst.def.id === skillId),
      drop: (p, skillId) => {
        this.getWorld().requestMeta({ t: 'attuneSpectre', skillId, formId: p.arg });
        this.refreshBestiary();
        if (this.inventoryOpen) this.refreshInventory();
      },
    });
    this.installGearDnd();
    this.installRackDnd();

    // THE CLOSE GLYPH's wire (closeGlyphHtml): ONE delegated click per root,
    // so a rebuilt template keeps its glyph live. Owned panels close for
    // their OWNER — the couch guest's ✕ closes the guest's bag: the toggle
    // with the owner's seat id IS the keyed close, byte for byte.
    const panelClosers: Array<[HTMLElement, () => void]> = [
      [this.charSheet, () => this.toggleCharSheet(this.panelSeatIds.get(this.charSheet))],
      [this.inventory, () => this.toggleInventory(this.panelSeatIds.get(this.inventory))],
      [this.passiveTree, () => this.toggleTree(this.panelSeatIds.get(this.passiveTree))],
      [this.worldMap, () => this.toggleMap()],
      [this.vendorMenu, () => this.closeVendor()],
      [this.salvageMenu, () => this.closeSalvage()],
      [this.fontMenu, () => this.closeFont()],
      [this.recallMenu, () => this.closeRecall()],
      [this.oracleMenu, () => this.closeOracle()],
      [this.bestiaryMenu, () => this.closeBestiary()],
      [this.boroughMenu, () => this.closeBorough()],
      [this.bountyMenu, () => this.closeBounties()],
      [this.caravanMenu, () => this.closeCaravan()],
      [this.sailMenu, () => this.closeSail()],
      [this.holdMenu, () => this.closeHold()],
      [this.mercMenu, () => this.closeMercMenu()],
      [this.vocationMenu, () => this.closeVocationMenu()],
      [this.escapeMenu, () => this.hideEscapeMenu()],
    ];
    for (const [root, close] of panelClosers) {
      root.addEventListener('click', (e) => {
        if (!(e.target instanceof Element) || !e.target.closest('[data-panel-x]')) return;
        e.preventDefault();
        e.stopPropagation(); // the glyph is the whole verb — no row behind it may also fire
        close();
      });
    }

    // THE PRESS GUARD (see the field): armed on every panel the 0.5s
    // auto-refresh rebuilds, capture-phase so no child handler can hide a
    // press from it. Release listens on the WINDOW — pointer captures retarget
    // events but every path still runs through here — so the hold always ends.
    for (const el of [this.charSheet, this.worldMap]) {
      el.addEventListener('pointerdown', () => { this.pressHeld.add(el); }, { capture: true });
    }
    const releasePress = (): void => { this.pressHeld.clear(); };
    window.addEventListener('pointerup', releasePress, { capture: true });
    window.addEventListener('pointercancel', releasePress, { capture: true });
    window.addEventListener('blur', releasePress);
    // A press released OUTSIDE the window delivers no pointerup at all — the
    // pan fabric's chord-release rule, applied here: any button-less move
    // inside the window proves the press ended, so the hold self-heals on
    // the first re-entry twitch instead of wedging the refresh shut.
    window.addEventListener('pointermove', (e) => {
      if (this.pressHeld.size && e.buttons === 0) releasePress();
    }, { capture: true });

    // THE COUCH DOCK styles (data/couch.ts COUCH_CFG.panels): a guest-owned
    // panel claims its opener's flank instead of the centered classic.
    // Injected like the UI-scale sheet — no index.html edit, one source.
    const couchCss = document.createElement('style');
    couchCss.textContent = `
      .panel.couch-left { left: 12px !important; right: auto !important;
        transform: none !important; max-width: ${Math.round(COUCH_CFG.panels.sideWidthFrac * 100)}vw !important; }
      .panel.couch-right { right: 12px !important; left: auto !important;
        transform: none !important; max-width: ${Math.round(COUCH_CFG.panels.sideWidthFrac * 100)}vw !important; }`;
    document.head.appendChild(couchCss);

    // THE COUCH ACTION LATCH: while a DOM interaction inside a guest-owned
    // panel dispatches, world.uiActionSeatId names that guest — so every
    // requestMeta the handler fires routes to the GUEST's seat with zero
    // per-call-site edits. A pointerdown inside an owned panel also stamps
    // the GESTURE, so a drag that ends outside the panel (drop to ground)
    // still resolves as its owner. Cleared on a microtask after each
    // dispatch — the frame loop never sees a stale latch.
    let gestureSeat: string | null = null;
    const couchOwnerOf = (t: EventTarget | null): string | null => {
      if (!(t instanceof Node)) return null;
      for (const el of [this.charSheet, this.inventory, this.passiveTree, this.vendorMenu,
        this.salvageMenu, this.oracleMenu, this.bestiaryMenu, this.caravanMenu, this.recallMenu,
        this.bountyMenu]) {
        if (el.contains(t)) {
          const id = this.panelSeatIds.get(el);
          return id && id !== this.getWorld().localSeat.id ? id : null;
        }
      }
      return null;
    };
    // uiActionSeatId lives ONLY for the duration of one dispatch (microtask-
    // cleared) — the frame loop between events always sees null, so a
    // mid-drag frame can never misroute the hero's own keyed actions. The
    // gesture memory (which seat's press this drag belongs to) is UI-local
    // and survives through the trailing click, then expires on a timeout.
    const stamp = (id: string | null): void => {
      if (id === null) return;
      const w = this.getWorld();
      w.uiActionSeatId = id;
      queueMicrotask(() => { w.uiActionSeatId = null; });
    };
    window.addEventListener('pointerdown', (e) => {
      gestureSeat = couchOwnerOf(e.target);
      stamp(gestureSeat);
    }, { capture: true });
    window.addEventListener('pointerup', (e) => {
      stamp(couchOwnerOf(e.target) ?? gestureSeat);
      setTimeout(() => { gestureSeat = null; }, 0); // outlive the trailing click
    }, { capture: true });
    window.addEventListener('click', (e) => stamp(couchOwnerOf(e.target) ?? gestureSeat), { capture: true });
    window.addEventListener('change', (e) => stamp(couchOwnerOf(e.target)), { capture: true });
  }

  /** Write a live-refreshed panel's markup only when it CHANGED since the
   *  last write. The 0.5s auto-refresh rebuilds from live data every tick,
   *  but most ticks nothing moved — skipping the identical write keeps the
   *  standing DOM (hover states, tooltip anchors, wired listeners) instead
   *  of tearing it out under the cursor. Returns whether the DOM was
   *  (re)built, so callers re-wire handlers exactly when new nodes exist. */
  private setPanelHtml(el: HTMLElement, html: string): boolean {
    if (this.panelHtml.get(el) === html && el.childElementCount > 0) return false;
    this.panelHtml.set(el, html);
    el.innerHTML = html;
    return true;
  }

  /** THE CLOSE GLYPH — the (x) every closeable panel wears in its top-right
   *  corner (index.html .panel-x): the mouse/touch twin of Esc. Templates
   *  place it FIRST (a zero-height sticky row, so it displaces nothing and
   *  rides a scrolling panel); the click is DELEGATED per root through the
   *  panelClosers ledger in the constructor, so a template rebuild never
   *  loses the wire, and every close walks the panel's OWN close path (the
   *  toggle for the keyed four, close* for the dialogs — the vocation offer
   *  still DECLINES, the vendor still sheds its verbs, the bag still cancels
   *  its drag). `title` names what the press does where it is more than a
   *  plain close. */
  private closeGlyphHtml(title = 'Close (Esc)'): string {
    return `<div class="panel-x-row"><button type="button" class="panel-x" data-panel-x title="${title}" aria-label="Close">✕</button></div>`;
  }

  // --- THE COUCH LENS (data/couch.ts) ---------------------------------------

  /** Resolve a seat id to a LIVE local seat — a couch guest by id, else the
   *  local hero. The fallback IS the solo path: no id, no guests, no change. */
  private couchSeatFor(seatId?: string): Seat {
    const w = this.getWorld();
    return (seatId && w.seats.find(s => s.couch && s.id === seatId)) || w.localSeat;
  }

  /** The seat a panel is currently showing (its opener; local hero when unowned). */
  private panelSeat(el: HTMLElement): Seat {
    return this.couchSeatFor(this.panelSeatIds.get(el));
  }

  /** Stamp a panel's owner + dock it to that owner's flank. The local hero
   *  clears the dock — the classic centered layout, byte-identical solo. */
  private ownPanel(el: HTMLElement, seat: Seat): void {
    this.panelSeatIds.set(el, seat.id);
    el.classList.toggle('couch-left', seat.couch?.side === 'left');
    el.classList.toggle('couch-right', seat.couch?.side === 'right');
  }

  /** Is a blocking surface up FOR THIS SEAT'S HANDS? Global surfaces (pause,
   *  minigame, the join overlay, dwell dialogs, start menu) gate everyone;
   *  the per-player panels gate only the seat that owns them — one player's
   *  open bag must never flip the other's pad into pointer mode. */
  blockingFor(seatId: string): boolean {
    if (this.escapeMenuOpen || this.minigameActive || this.couchJoinOpen
      || this.caravanOpen || this.mercOpen || this.sailOpen || this.holdOpen
      || this.vocationOpen || this.boroughOpen
      || !this.startMenu.classList.contains('hidden')) return true;
    const owned = (el: HTMLElement, open: boolean): boolean =>
      open && (this.panelSeatIds.get(el) ?? this.getWorld().localSeat.id) === seatId;
    return owned(this.charSheet, this.charSheetOpen)
      || owned(this.inventory, this.inventoryOpen)
      || owned(this.passiveTree, this.treeOpen)
      || owned(this.worldMap, this.mapOpen)
      || owned(this.vendorMenu, this.vendorOpen)
      || owned(this.salvageMenu, this.salvageOpen)
      || owned(this.fontMenu, this.fontOpen)
      || owned(this.recallMenu, this.recallOpen)
      || owned(this.oracleMenu, this.oracleOpen)
      || owned(this.bestiaryMenu, this.bestiaryOpen);
  }

  /** Seat-scoped panel census + close (the couch escape cascade): only the
   *  named seat's owned panels count/close — hideAll() stays the full clear. */
  anyPanelOpenFor(seatId: string): boolean {
    const owned = (el: HTMLElement, open: boolean): boolean =>
      open && (this.panelSeatIds.get(el) ?? this.getWorld().localSeat.id) === seatId;
    return owned(this.charSheet, this.charSheetOpen)
      || owned(this.inventory, this.inventoryOpen)
      || owned(this.passiveTree, this.treeOpen)
      || owned(this.worldMap, this.mapOpen);
  }
  hideAllFor(seatId: string): void {
    const owned = (el: HTMLElement): boolean =>
      (this.panelSeatIds.get(el) ?? this.getWorld().localSeat.id) === seatId;
    if (this.charSheetOpen && owned(this.charSheet)) this.toggleCharSheet(seatId);
    if (this.inventoryOpen && owned(this.inventory)) this.toggleInventory(seatId);
    if (this.treeOpen && owned(this.passiveTree)) this.toggleTree(seatId);
    if (this.mapOpen && owned(this.worldMap)) this.toggleMap();
    if (this.vendorOpen && owned(this.vendorMenu)) this.closeVendor();
    if (this.salvageOpen && owned(this.salvageMenu)) this.closeSalvage();
    if (this.fontOpen && owned(this.fontMenu)) this.closeFont();
    if (this.recallOpen && owned(this.recallMenu)) this.closeRecall();
    if (this.oracleOpen && owned(this.oracleMenu)) this.closeOracle();
    if (this.bestiaryOpen && owned(this.bestiaryMenu)) this.closeBestiary();
  }

  /** The couch escape cascade for ONE seat: dismiss its topmost surface —
   *  an owned station dialog first (a close carries semantics), then all of
   *  its ordinary panels. Host-global dialogs (caravan, sail, hold, merc,
   *  borough, vocation) belong to the local hero. True = press consumed. */
  escCascadeFor(seatId: string): boolean {
    const w = this.getWorld();
    const mine = (el: HTMLElement): boolean =>
      (this.panelSeatIds.get(el) ?? w.localSeat.id) === seatId;
    const hostOwned = seatId === w.localSeat.id;
    // The Caravan dialog is OWNED (showCaravan stamps the seat that lingered):
    // the guest who called the escort dismisses it with their own Ⓑ. Unowned
    // (solo, every hero-opened dialog) `mine` is the hero's — as it always was.
    if (this.caravanOpen && mine(this.caravanMenu)) { this.closeCaravan(); return true; }
    if (this.vendorOpen && mine(this.vendorMenu)) { this.closeVendor(); return true; }
    if (this.salvageOpen && mine(this.salvageMenu)) { this.closeSalvage(); return true; }
    if (this.fontOpen && mine(this.fontMenu)) { this.closeFont(); return true; }
    if (this.recallOpen && mine(this.recallMenu)) { this.closeRecall(); return true; }
    if (this.oracleOpen && mine(this.oracleMenu)) { this.closeOracle(); return true; }
    if (this.bestiaryOpen && mine(this.bestiaryMenu)) { this.closeBestiary(); return true; }
    if (hostOwned && this.sailOpen) { this.closeSail(); return true; }
    if (hostOwned && this.mercOpen) { this.closeMercMenu(); return true; }
    if (hostOwned && this.boroughOpen) { this.closeBorough(); return true; }
    if (hostOwned && this.vocationOpen) { this.closeVocationMenu(); return true; }
    if (this.anyPanelOpenFor(seatId)) { this.hideAllFor(seatId); return true; }
    return false;
  }

  // --- THE GEAR LANES (ui/dnd.ts) --------------------------------------------
  // The whole inventory speaks the ONE drag fabric — the same twin gestures
  // (press-drag / click-lift) the grimoire taught. Sources mint payloads,
  // targets consume them through requestMeta, and the DOM declares every
  // participant with data-drag / data-drop attributes that survive re-renders.
  // No lane keeps private lift state; the fabric IS the carry.

  /** Where a gearItem payload was lifted from: 'bag' or a doll slot id. */
  private payloadOrigin(p: { data?: unknown }): string {
    const d = p.data as { from?: string } | undefined;
    return d?.from ?? 'bag';
  }

  /** Resolve a gearItem payload's live item (bag or doll — never stale).
   *  Reads the INVENTORY PANEL's owner — gear gestures lift from that bag. */
  private payloadGear(p: { arg: string }): ItemInstance | undefined {
    const m = this.panelSeat(this.inventory).meta;
    const uid = Number(p.arg);
    return m.items.find(i => i.uid === uid)
      ?? Object.values(m.equipped).find(i => i?.uid === uid);
  }

  /** The forgiving vestige landing (whole tile / worn chip): first EMPTY
   *  socket takes it; all full → the pips flash gold and nothing is consumed
   *  (an overwrite is only ever an AIMED pip drop, never guessed). */
  private forgivingInlay(el: HTMLElement, uid: number, vestigeId: string): void {
    const sockets = this.findItem(uid)?.sockets;
    if (!sockets?.length) return;
    const empty = sockets.findIndex(s => s === null);
    if (empty >= 0) { this.socketVestige(uid, empty, vestigeId); return; }
    el.querySelectorAll<HTMLElement>('[data-sock]').forEach(pip => {
      pip.style.textShadow = '0 0 8px #ffd700';
      window.setTimeout(() => { pip.style.textShadow = ''; }, 650);
    });
  }

  private installGearDnd(): void {
    const world = (): World => this.getWorld();
    const gearRefresh = (): void => { this.refreshInventory(); this.refreshCharSheet(); };

    // SOURCES ----------------------------------------------------------------
    // Bag tiles AND worn doll chips lift the same payload kind; `data.from`
    // remembers the origin so targets can route move vs unequip vs re-slot.
    registerDragSource({
      kind: 'gearItem',
      clickLift: true,
      payload: (arg) => {
        const item = this.payloadGear({ arg });
        if (!item) return null;
        const m = world().meta;
        const from = Object.keys(m.equipped).find(s => m.equipped[s]?.uid === item.uid) ?? 'bag';
        // THE RESIDENCE: a gem wrapper's ghost speaks its gem (skill color ◆).
        if (item.gem) {
          const color = gemTileColorOf(item);
          return {
            kind: 'gearItem', arg, label: item.name, data: { from },
            ghostHtml: `<span style="color:${color}">◆ ${item.name}</span>`,
          };
        }
        const cat = ITEM_BASES[item.baseId]?.category ?? 'ring';
        const color = ITEM_RARITIES[item.rarity].color;
        return {
          kind: 'gearItem', arg, label: item.name, data: { from },
          ghostHtml: `<span style="color:${color}">${CATEGORY_GLYPHS[cat] ?? '?'} ${item.name}</span>`,
        };
      },
    });
    // Satchel vestige rows (the native-HTML5 drag these rows used to carry is
    // gone — the fabric's pointer gestures serve mouse and pad alike).
    registerDragSource({
      kind: 'vestige',
      clickLift: true,
      payload: (vid) => {
        const v = VESTIGES[vid];
        if (!v || (world().meta.vestiges[vid] ?? 0) <= 0) return null;
        return {
          kind: 'vestige', arg: vid, label: v.name,
          ghostHtml: `<span style="color:${v.color};font-weight:bold">${v.glyph}</span>`
            + `<span style="color:${v.color}">${v.name.split(',')[0]}</span>`,
        };
      },
    });
    // (THE RESIDENCE, M1: the old skillGem/supportGem row sources retired —
    // loose gems are bag tiles now and lift as ordinary gearItem payloads.)

    // TARGETS ----------------------------------------------------------------
    // Empty bag cells: the payload's ORIGIN cell lands here (click-place
    // parity — the lit cells teach the anchor rule live). Bag re-places may
    // swap through ONE blocker (the engine's tetris rule); worn pieces must
    // land clean — their blocker has no slot to retreat to.
    registerDropTarget({
      kind: 'bagCell',
      accepts: (p, arg) => {
        if (p.kind !== 'gearItem') return false;
        const item = this.payloadGear(p);
        if (!item) return false;
        const [x, y] = arg.split(':').map(Number);
        const bag = world().meta.items;
        if (canPlaceAt(bag, item, x, y)) return true;
        return this.payloadOrigin(p) === 'bag' && overlappingItems(bag, item, x, y).length === 1;
      },
      drop: (p, arg) => {
        const [x, y] = arg.split(':').map(Number);
        const uid = Number(p.arg);
        const from = this.payloadOrigin(p);
        if (from === 'bag') world().requestMeta({ t: 'moveItem', uid, x, y });
        else world().requestMeta({ t: 'unequipItem', slot: from, x, y });
        gearRefresh();
      },
    });
    // Occupied tiles: a gear payload swaps with the tile's item (bag→bag
    // through the engine's single-blocker rule at the tile's origin; worn→bag
    // as a swap-equip when the tile's piece fits the vacated slot). A vestige
    // payload takes the forgiving inlay.
    registerDropTarget({
      kind: 'gearTile',
      accepts: (p, arg) => {
        const uid = Number(arg);
        if (p.kind === 'vestige') return !!this.findItem(uid)?.sockets?.length;
        if (p.kind !== 'gearItem' || Number(p.arg) === uid) return false;
        const from = this.payloadOrigin(p);
        if (from === 'bag') return true;
        const tile = this.findItem(uid);
        const base = tile && ITEM_BASES[tile.baseId];
        const slot = SLOT_BY_ID[from];
        return !!(tile && base && slot && slot.accepts.includes(base.category));
      },
      drop: (p, arg, el) => {
        const uid = Number(arg);
        if (p.kind === 'vestige') { this.forgivingInlay(el, uid, p.arg); return; }
        const from = this.payloadOrigin(p);
        if (from === 'bag') {
          const tile = this.findItem(uid);
          if (tile?.x === undefined || tile.y === undefined) return;
          world().requestMeta({ t: 'moveItem', uid: Number(p.arg), x: tile.x, y: tile.y });
        } else {
          // Worn piece onto a compatible bag item: wear THAT item in the
          // vacated slot — the engine returns this one to the bag.
          world().requestMeta({ t: 'equipItem', uid, slot: from });
        }
        gearRefresh();
      },
    });
    // Doll slots: gear equips (or re-slots, worn→worn); a vestige takes the
    // forgiving inlay on whatever the slot wears. Category gates the light-up;
    // the ENGINE speaks on level requirements (failNote) — the UI never
    // pretends an authority it lacks.
    registerDropTarget({
      kind: 'equipSlot',
      accepts: (p, slotId) => {
        const m = world().meta;
        if (p.kind === 'vestige') return !!m.equipped[slotId]?.sockets?.length;
        if (p.kind !== 'gearItem') return false;
        if (this.payloadOrigin(p) === slotId) return false; // its own slot
        const item = this.payloadGear(p);
        const base = item && ITEM_BASES[item.baseId];
        const slot = SLOT_BY_ID[slotId];
        return !!(base && slot?.enabled && slot.accepts.includes(base.category));
      },
      drop: (p, slotId, el) => {
        if (p.kind === 'vestige') {
          const worn = world().meta.equipped[slotId];
          if (worn) this.forgivingInlay(el, worn.uid, p.arg);
          return;
        }
        world().requestMeta({ t: 'equipItem', uid: Number(p.arg), slot: slotId });
        gearRefresh();
      },
    });
    // Socket pips: the PRECISE vestige landing — occupied or not (an aimed,
    // deliberate overwrite, exactly the old drag's pip drop).
    registerDropTarget({
      kind: 'sock',
      accepts: (p) => p.kind === 'vestige',
      drop: (p, arg) => {
        const [uid, sock] = arg.split(':').map(Number);
        this.socketVestige(uid, sock, p.arg);
      },
    });
    // THE WORLD: the game canvas takes gear and gems alike — dragging a thing
    // out of the panel onto the ground drops it at your feet (the oldest ARPG
    // gesture there is). One address space now (M1): everything drops by uid,
    // and a gem wrapper unwraps as it falls (the ground speaks bare gems) —
    // the old index-drift re-resolve hack died with the index.
    registerDropTarget({
      kind: 'ground',
      accepts: (p) => p.kind === 'gearItem',
      drop: (p) => {
        world().requestMeta({ t: 'dropItem', uid: Number(p.arg) });
        gearRefresh();
      },
    });
    // THE BOROUGH ARMING PANEL: drop a bag piece onto the open panel to gift
    // it to the villager under parley (the same intent the panel's buttons
    // route — one authority, two gestures).
    registerDropTarget({
      kind: 'armFolk',
      accepts: (p) => p.kind === 'gearItem',
      drop: (p, arg) => {
        world().requestMeta({ t: 'armFolkItem', folkId: Number(arg), uid: Number(p.arg) });
        this.refreshBorough();
        gearRefresh();
      },
    });
  }

  /** THE RACK's drag fabric (skill-items charter M0 — the Build drawer's
   *  eight-seat rack): seats lift their seated skill and take seat/strip
   *  payloads; the holding strip takes seats back (unseat). Every landing
   *  routes through requestMeta like any gesture — the couch action latch
   *  stamps the owning seat during the drop's dispatch, so a guest's
   *  drawer reorders the GUEST's bar. Reads aim at the HERO body
   *  (seatHero — the bar bindSkill/swapSkillSlots actually edit), so the
   *  rack can never draw one bar and mutate another. */
  private installRackDnd(): void {
    const heroOf = () => this.getWorld().seatHero(this.panelSeat(this.inventory));
    const refresh = (): void => this.refreshInventory();
    // A SEATED skill lifts from its seat — press-drag or click-lift alike
    // (the unseat ✕ inside is an inner control: its clicks never lift).
    registerDragSource({
      kind: 'rackSeat',
      clickLift: true,
      payload: (arg) => {
        const inst = heroOf().skills[Number(arg)];
        if (!inst) return null;
        return {
          kind: 'rackSeat', arg, label: inst.def.name, data: { defId: inst.def.id },
          ghostHtml: `<span style="color:${inst.def.color}">◆ ${inst.def.name}</span>`,
        };
      },
    });
    // The bag skill tile a gearItem payload carries, when it is one — the
    // LEARN gesture's freight test (THE RESIDENCE: learn = drag skill tile
    // onto a rack seat).
    const payloadSkillGem = (pl: { kind: string; arg: string }): ItemInstance | null => {
      if (pl.kind !== 'gearItem') return null;
      const seat = this.panelSeat(this.inventory);
      const item = seat.meta.items.find(i => i.uid === Number(pl.arg));
      return item?.gem?.kind === 'skill' ? item : null;
    };
    // Rack seats take both payloads: seat→seat exchanges through the ONE
    // atomic swapSkillSlots intent (occupied swaps, empty moves — same
    // verb); a bag SKILL tile LEARNS into the seat (learn = seat, card 8 —
    // an occupied seat is a REPLACE: the engine runs the sitter's full
    // unlearn gates and refuses with its own words). A duplicate pre-dims
    // the affordance; the engine stays the authority. Reordering is
    // UNGATED — choosing a seat is play, not surgery (the skills.ts ruling).
    registerDropTarget({
      kind: 'rackSeat',
      accepts: (pl, arg) => {
        if (pl.kind === 'rackSeat') return pl.arg !== arg;
        const item = payloadSkillGem(pl);
        if (!item || item.gem?.kind !== 'skill') return false;
        return !this.panelSeat(this.inventory).meta.knownSkills.has(item.gem.skillId);
      },
      drop: (pl, arg) => {
        if (pl.kind === 'rackSeat') {
          this.getWorld().requestMeta({ t: 'swapSkillSlots', a: Number(pl.arg), b: Number(arg) });
        } else {
          this.getWorld().requestMeta({ t: 'learn', uid: Number(pl.arg), slot: Number(arg) });
        }
        refresh();
      },
    });
    // The strip under the rack: a seat dropped here UNLEARNS — the skill
    // returns to the pack as its item (learned = seated has no shelf
    // between; the engine refuses on a full bag with its own note).
    registerDropTarget({
      kind: 'rackFree',
      accepts: (pl) => pl.kind === 'rackSeat',
      drop: (pl) => {
        const inst = heroOf().skills[Number(pl.arg)];
        if (inst) this.getWorld().requestMeta({ t: 'unlearn', skillId: inst.def.id });
        refresh();
      },
    });
    // THE SOCKET GESTURE (charter §1): a bag SUPPORT tile dropped onto a
    // skill row in the Build drawer sockets into its first free socket —
    // the engine's crew-aware gate + field discipline speak all refusals.
    registerDropTarget({
      kind: 'gemSock',
      accepts: (pl, skillId) => {
        if (pl.kind !== 'gearItem') return false;
        const seat = this.panelSeat(this.inventory);
        const item = seat.meta.items.find(i => i.uid === Number(pl.arg));
        if (item?.gem?.kind !== 'support') return false;
        const sup = SUPPORTS[item.gem.supportId];
        const inst = seat.meta.knownSkills.get(skillId);
        if (!sup || !inst || !inst.sockets.includes(null)) return false;
        return supportFitsInstOrCrew(sup, inst, this.getWorld().summonCrewSkills(inst));
      },
      drop: (pl, skillId) => {
        this.getWorld().requestMeta({ t: 'socket', uid: Number(pl.arg), skillId });
        refresh();
      },
    });
  }

  /** The local seat's GRIMOIRE-capable skill instances (delivery.grimoire),
   *  in learned order — the book's binding slots, one per instance. */
  private grimoireSkills(): SkillInstance[] {
    const out: SkillInstance[] = [];
    // The grimoire strip lives on the BESTIARY panel — its owner's book.
    for (const inst of this.panelSeat(this.bestiaryMenu).meta.knownSkills.values()) {
      const d = inst.def.delivery;
      if (d.type === 'summon' && d.grimoire) out.push(inst);
    }
    return out;
  }

  /** Tooltip for the class label in the character sheet. */
  private classTooltip(): TooltipContent {
    const c = this.panelSeat(this.charSheet).meta.classDef;
    return {
      title: c.name, description: c.description,
      meta: `${c.innateText ? `Innate: ${c.innateText}. ` : ''}A class is only a starting point; you can allocate any attributes and bind any skill you qualify for.`,
    };
  }

  /** Sheet stat blurb: registry-homed (STAT_DEFS.desc), value-free by
   *  design — curves retune without staling a word. */
  private statTooltip(id: string): TooltipContent | null {
    const def = STAT_DEFS[id];
    if (!def) return null;
    return {
      title: def.label,
      // The authored blurb, else the generated family's shared line
      // (apply_<status>, orbOnKill_<orb>... — data/sheet.ts).
      description: statBlurbOf(id) ?? 'No notes on this one yet.',
      meta: `base ${def.percent ? `${Math.round(def.base * 100)}%` : def.base}`,
    };
  }

  /** Attribute blurb — the per-point grants derive LIVE from the registry's
   *  perPoint modifiers, so what Strength grants is always EXACTLY what
   *  Strength grants, however the balance pass retunes it. */
  private attrTooltip(id: AttributeId): TooltipContent | null {
    const a = ATTRIBUTES[id];
    if (!a) return null;
    const perPoint = a.perPoint.map(mo => formatModLine(mo, mo.value)).join(' · ');
    return { title: a.label, description: `Each point: ${perPoint}`, meta: a.description };
  }

  /** Tooltip for a learned skill row (full description + key stats). */
  /** THE COMPUTED BLOCK (engine/skillPreview.ts): what this skill does for
   *  THIS build, read off the live sheet through the engine's own resolvers.
   *  The authored line says what the skill IS; these rows say what it does
   *  in your hands, so nobody has to reconcile a static tooltip against a
   *  character sheet. Detail rows wait for the dwell — the same hover-intent
   *  the Vault uses for its full story. */
  private previewRowsHtml(rows: PreviewRow[], extended: boolean): string {
    const shown = rows.filter(r => extended || r.group === 'headline');
    if (!shown.length) return '';
    const line = (r: PreviewRow): string => `
      <div style="display:flex;gap:8px;align-items:baseline;line-height:1.5">
        <span style="color:#8a8678;flex:1;min-width:0">${r.label}</span>
        <span style="color:#e8dfc8;font-weight:600;white-space:nowrap">${r.value}</span>
        ${r.note ? `<span style="color:#6a6478;font-size:10px;white-space:nowrap">${r.note}</span>` : ''}
      </div>`;
    const hasDetail = rows.some(r => r.group === 'detail');
    return `<div style="margin-top:6px;padding-top:5px;border-top:1px solid #3a3448;font-size:11px">
      ${shown.map(line).join('')}
      ${!extended && hasDetail
        ? '<div style="color:#6a6478;font-size:10px;margin-top:3px">keep resting for the full breakdown</div>'
        : ''}
    </div>`;
  }

  /** Compact charge-price clause for the meta line, read from the LIVE
   *  resolver — a socketed SPENDER graft (Ravening / Embargo) wins over the
   *  skill's innate cost, so this names the economy the press will actually
   *  pay, which the authored prose can't know. Labels come from the charge
   *  registry, and the gate math mirrors the engine's: `optional` waives the
   *  bank check entirely, a flat amount spends what it says (minimum printed
   *  only when it demands MORE than the spend), amount 0 is a pure gate
   *  (Bloodlust needs its bank but the drain burns it), and 'all' drains
   *  the bank (minimum printed once it gates past the implicit 1). */
  private chargeCostText(inst: SkillInstance): string {
    const cc = instanceChargeCost(inst);
    if (!cc) return '';
    const label = chargeLabel(cc.charge);
    let s: string;
    if (cc.amount === 'all') {
      s = `spends all ${label}`;
      const min = cc.minimum ?? 1;
      if (!cc.optional && min > 1) s += ` (min ${min})`;
    } else if (cc.amount > 0) {
      s = `spends ${cc.amount} ${label}`;
      const min = cc.minimum ?? 0;
      if (!cc.optional && min > cc.amount) s += ` (needs ${min})`;
    } else {
      const min = cc.minimum ?? 0;
      if (cc.optional || min <= 0) return '';
      s = `needs ${min} ${label}`;
    }
    if (cc.optional) s += ' (optional)';
    const riders: string[] = [];
    if (cc.damagePerCharge) riders.push(`+${Math.round(cc.damagePerCharge * 100)}% damage`);
    if (cc.projectilesPerCharge) riders.push(`+${cc.projectilesPerCharge} projectile${cc.projectilesPerCharge > 1 ? 's' : ''}`);
    if (cc.repeatsPerCharge) riders.push(`+${cc.repeatsPerCharge} repeat${cc.repeatsPerCharge > 1 ? 's' : ''}`);
    if (riders.length) s += `, ${riders.join(', ')} per charge`;
    return s;
  }

  private skillTooltip(id: string, extended = false): TooltipContent | null {
    const seat = this.panelSeat(this.inventory);
    const inst = seat.meta.knownSkills.get(id);
    if (!inst) return null;
    const d = inst.def;
    const preview = previewSkill(seat.actor, inst);
    const charge = this.chargeCostText(inst);
    // The tooltip's FIRST LINE names the picked branch (skill-mode trees,
    // §7 — at-a-glance identity beside the bar pip).
    const branch = treeSpentBranch(inst);
    return {
      title: `${d.name} — Lv ${inst.level}${branch ? ` · ${branch.name}` : ''}`,
      description: d.description + this.previewRowsHtml(preview.rows, extended),
      meta: d.tags.join(' · ') + (charge ? ` · ${charge}` : ''),
      wide: extended && preview.hasDetail,
    };
  }

  /** '4◆' cost chip for an essence price, colored + titled by the essence. */
  private essCostText(cost: EssenceCost): string {
    const e = ESSENCES[cost.essence];
    return `<span style="color:${e.color}" title="${e.label}">${cost.count}${e.glyph}</span>`;
  }

  /** 'N◈' cost chip for an Ability-Essence price, colored + titled by tier. */
  private abilityCostText(cost: AbilityCost): string {
    const d = abilityEssenceOfTier(cost.tier);
    return `<span style="color:${d.color}" title="${d.label}">${cost.count}${d.glyph}</span>`;
  }

  /** The Level Up button — Ability Essences, the ONE pay lane (skills and
   *  supports share the banded curve; supports at the supportMul).
   *  Affordability reads the INVENTORY panel's owner (the drawer's home). */
  private abilityLevelBtn(attr: string, level: number, atMax: boolean, support = false): string {
    const cost = support ? supportLevelAbilityCost(level + 1) : skillLevelAbilityCost(level + 1);
    const afford = this.getWorld().canAffordAbilityEssence(this.panelSeat(this.inventory), cost);
    const d = abilityEssenceOfTier(cost.tier);
    return `<button ${attr} ${!afford || atMax ? 'disabled' : ''}
      title="Level up by spending ${cost.count}× ${d.label}">
      Level Up (${this.abilityCostText(cost)})</button>`;
  }


  /** The seat's essence wallet as colored chips (sheet + station headers).
   *  Seat-explicit: the stations pass their panel's owner (couch lens). */
  private essWallet(seat: Seat = this.getWorld().localSeat): string {
    const m = seat.meta;
    return ESSENCE_IDS.map(id => {
      const e = ESSENCES[id];
      return `<span style="color:${e.color};margin-right:10px" title="${e.label}">${e.glyph} ${m.essences[id] ?? 0}</span>`;
    }).join('');
  }

  /** Bar-slot labels from the LIVE binds: the pad map (RT/LT/Ⓐ…) while the
   *  controller is active, else the keybinds (slots 0/1 fixed to mouse) — so
   *  the Build drawer's bind buttons always name the button the player will
   *  actually press, on whichever device is in their hands. */
  private slotLabels(): string[] {
    const s = this.getSettings();
    if (this.getPadActive?.()) {
      const pb = s.padBinds;
      return [pb.skillSlot0, pb.skillSlot1, pb.skillSlot2, pb.skillSlot3,
        pb.skillSlot4, pb.skillSlot5, pb.skillSlot6, pb.skillSlot7].map(padDisplay);
    }
    const kb = s.keybinds;
    return ['LMB', 'RMB', kb.skillSlot2, kb.skillSlot3, kb.skillSlot4,
      kb.skillSlot5, kb.skillSlot6, kb.skillSlot7].map(keyDisplay);
  }

  /** Any ORDINARY panel open? (Dwell dialogs and the pause menu are tracked
   *  apart — the Escape cascade treats each class differently.) */
  anyPanelOpen(): boolean {
    return this.charSheetOpen || this.treeOpen
      || this.mapOpen || this.inventoryOpen;
  }

  /** ANY blocking DOM surface is up — panels, dwell dialogs, the pause menu,
   *  a minigame, the start menu. The ONE seam device layers ask before
   *  switching habits (the pad flips to menu-pointer mode on this); new
   *  surfaces join here and every input layer follows for free. */
  uiBlocking(): boolean {
    return this.anyPanelOpen() || this.escapeMenuOpen || this.minigameActive
      || this.couchJoinOpen
      || this.caravanOpen || this.mercOpen || this.salvageOpen
      || this.oracleOpen || this.vendorOpen || this.sailOpen || this.holdOpen || this.vocationOpen
      || this.bestiaryOpen || this.boroughOpen
      || !this.startMenu.classList.contains('hidden');
  }

  /** A crafting minigame overlay is live (Escape and panels hold still). */
  minigameRunning(): boolean { return this.minigameActive; }

  /** Rewrite the bottom hint strip from the LIVE binds — every key it names is
   *  rebindable, so the static index.html text goes stale after any remap.
   *  Called at construction and from the keybind view after each change. */
  updateHintBar(): void {
    const el = document.getElementById('hint-bar');
    if (!el) return;
    // RETIRED BY DEFAULT (the visual-clutter law): the prologue's drill and
    // the Waking House teach the binds now — the standing strip is off. The
    // machinery stays whole behind this one lever for anyone who wants the
    // crib sheet back (a future Settings row can expose it).
    if (!HINT_BAR_ENABLED) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const kb = this.getSettings().keybinds;
    const k = (a: ActionId): string => esc(keyDisplay(kb[a]));
    const move = (['moveUp', 'moveLeft', 'moveDown', 'moveRight'] as const).map(k).join('');
    const slots = (['skillSlot2', 'skillSlot3', 'skillSlot4', 'skillSlot5', 'skillSlot6', 'skillSlot7'] as const).map(k).join('/');
    el.innerHTML = `[${move}] move &nbsp; [LMB/RMB/${slots}] skills &nbsp; [${k('panelChar')}] character &nbsp; `
      + `[${k('panelInv')}] inventory &nbsp; `
      + (this.getSettings().gearPickup === 'key' ? `[${k('pickup')}] pick up &nbsp; ` : '')
      + `[${k('panelTree')}] passive tree &nbsp; [${k('panelMap')}] world map &nbsp; [Esc] menu`;
  }

  // ----------------------------------------------------------- story card
  // THE SCENE FABRIC's narration surface (engine/scenes.ts): a full-screen
  // card over the director's black — title, prose, one continue. The DOM
  // shows what the engine holds pending (World.scene.card); the continue
  // ACKS back through the callback (sceneCardAck), so headless probes walk
  // the same stages with no DOM at all.

  storyCardOpen(): boolean { return !this.storyCard.classList.contains('hidden'); }

  showStoryCard(card: { title: string; lines: string[]; button?: string }, onContinue: () => void): void {
    this.storyCard.innerHTML = `
      <h1>${esc(card.title)}</h1>
      ${card.lines.map(l => `<p>${esc(l)}</p>`).join('')}
      <button id="story-continue">${esc(card.button ?? 'Continue')}</button>`;
    this.storyCard.classList.remove('hidden');
    const btn = document.getElementById('story-continue') as HTMLButtonElement | null;
    if (btn) {
      btn.onclick = () => { this.hideStoryCard(); onContinue(); };
      btn.focus(); // Enter/Space continue for free
    }
  }

  hideStoryCard(): void {
    this.storyCard.classList.add('hidden');
    this.storyCard.innerHTML = '';
  }

  // ---------------------------------------------------------- class select

  /** Clear the cached class roster so the NEXT class select deals a fresh roll.
   *  Called when a run ends (death) — NOT on menu navigation. */
  resetClassRoster(): void {
    this.classRoster = null;
    this.pendingModeId = DEFAULT_MODE_ID;
    this.pendingCharName = null;   // back to the sticky account preference
  }

  /** Forget the per-run VIEW state (map zoom/pan/tab/dimension, zone pin, book
   *  tab). Called whenever a NEW World is built (start/resume/co-op join) — a
   *  fresh run must not inherit the last run's 300% map zoom, its quest-journal
   *  tab, or a pin aimed at the old world's zone ids (ids recur across worlds,
   *  so a stale pin can point at a real-but-never-visited zone). */
  resetRunView(): void {
    this.mapZoom = 1;
    this.mapPan = { x: 0, y: 0 };
    this.mapTab = 'map';
    this.mapDimension = 'surface';
    this.hoveredZone = null;
    this.pinnedZone = null;
    this.oceanCache = null;
  }

  showClassSelect(onPick: (def: ClassDef, modeId?: string, name?: string) => void): void {
    // Whatever is in the name field RIGHT NOW survives every route back here
    // (mode picks, Vault detours, weight edits): the old input still exists
    // until the innerHTML rebuild below, so capture it first — belt to the
    // per-keystroke listener's suspenders.
    const liveName = this.classSelect.querySelector<HTMLInputElement>('#char-name');
    if (liveName) this.pendingCharName = liveName.value;
    this.hideAll();
    const acc = this.getAccount();
    const TEASER_COUNT = 4;
    const selectable = selectableSlotCount(acc);
    // THE POOL: the hand is dealt ONLY from account-unlocked classes (starters
    // + purchased Class bundles). Class Slots set the HAND SIZE; Class unlocks
    // deepen the pool the hand is dealt from.
    const pool = CLASSES.filter(c => isClassUnlocked(acc, c.id));
    // THE DISCOVERY SPLIT (meta/unlocks.ts): locked classes the account has
    // DISCOVERED tease with their full face and exact Vault remedy; the
    // undiscovered stay shrouded — a rumor card whispers the hint, never the
    // name. "If you don't know what you're looking for, find it first."
    const lockedClasses = CLASSES.filter(c => !isClassUnlocked(acc, c.id));
    const discoveredLocked = lockedClasses.filter(c => isClassDiscovered(acc, c.id));
    const undiscovered = lockedClasses.filter(c => !isClassDiscovered(acc, c.id));
    // Roguelike roll: shuffle the pool, surface the hand plus a few locked
    // TEASERS. Rolled ONCE per new-run offer + CACHED, so menu navigation
    // (Vault / Event Weights / Back) keeps the same offer; only a death
    // (resetClassRoster) deals a fresh hand — OR a mid-offer Vault purchase
    // that changes the deal inputs (a Class Slot widens the hand, a Class
    // bundle deepens the pool — and may REVEAL chained kin), which re-deals
    // so the purchase shows.
    const dealtFor = `${selectable}|${pool.map(c => c.id).join(',')}|${discoveredLocked.map(c => c.id).join(',')}`;
    if (this.classRoster && this.classRoster.dealtFor !== dealtFor) {
      this.classRoster = null;
    }
    if (!this.classRoster) {
      const shuffle = <T,>(arr: T[]): T[] => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };
      const shuffled = shuffle([...pool]);
      const picks = shuffled.slice(0, Math.min(selectable, shuffled.length));
      // Teasers, by WHAT unlocks them: pool classes beyond the hand first
      // (more Class Slots surface those — and the moot law keeps the next
      // slot tier purchasable exactly whenever such a teaser exists), then
      // DISCOVERED locked classes (their Class bundle in the Vault does) —
      // each card names its remedy. Leftover teaser slots deal RUMORS from
      // the undiscovered (hint lines off their shrouded Vault entries).
      // At the ladder's TOP (maxSlotCount, data-derived) there is no wider
      // hand to sell, so beyond-hand pool classes stop teasing — they simply
      // wait for the next deal. Never a dead lock, even at the cap.
      const slotsRemedy = selectable < maxSlotCount();
      const teasers = [
        ...(slotsRemedy ? shuffled.slice(picks.length).map(def => ({ def, reason: 'slots' as const })) : []),
        ...shuffle([...discoveredLocked]).map(def => ({ def, reason: 'class' as const })),
      ].slice(0, TEASER_COUNT);
      const rumors = shuffle([...undiscovered])
        .slice(0, Math.max(0, TEASER_COUNT - teasers.length))
        .map(c => classUnlockFor(c.id))
        .filter((u): u is NonNullable<typeof u> => !!u)
        .map(u => (u.kind === 'class' ? u.payload.hint : undefined) ?? 'Something out there has not introduced itself yet.');
      this.classRoster = { picks, teasers, rumors, dealtFor };
    }
    const { picks, teasers, rumors } = this.classRoster;

    // Starting-skill chips — hover for the full name + description (the bar
    // read straight from ClassDef, so a re-barred class shows its truth).
    const skillChips = (c: ClassDef): string => {
      const chips = c.bar.filter((s): s is string => !!s).map(sid => {
        const d = SKILLS[sid];
        return d ? `<span data-tip="cskill" data-skill-id="${sid}"
          style="display:inline-block;padding:1px 7px;margin:1px 3px 1px 0;border:1px solid ${d.color};
          border-radius:8px;font-size:9px;color:${d.color};cursor:var(--cursor-help, help)">${d.name}</span>` : '';
      }).join('');
      return chips ? `<div style="margin-top:3px">${chips}</div>` : '';
    };
    // A teaser card names its exact remedy: more Class Slots (hand size) or
    // the specific Class bundle in the Vault (pool depth) — never a dead lock.
    const lockNote = (t: { def: ClassDef; reason: 'slots' | 'class' }): string => {
      if (t.reason === 'slots') return '🔒 Unlock more Class Slots in the Vault';
      const u = classUnlockFor(t.def.id);
      return u ? `🔒 Locked: “${u.label}” in the Vault (${u.cost} ${META_CURRENCY_LABEL})`
        : '🔒 Unlocked in the Vault';
    };
    // A RUMOR card: an undiscovered class, shrouded. The hint is a compass
    // toward the DEED; the identity stays the world's secret until earned
    // (the discovery web, meta/unlocks.ts). Clicks route to the Vault like
    // any locked card — its rumor wall repeats every whisper.
    const rumorCard = (hint: string): string => `
      <div class="class-card locked" data-locked="true" style="opacity:.45">
        <div class="cname" style="color:#8a8494;letter-spacing:3px">? ? ?</div>
        <div class="cdesc" style="font-style:italic">“${hint}”</div>
        <div class="class-lock">🔒 Undiscovered: the world teaches what the Vault cannot sell.</div>
      </div>`;
    const classCard = (c: ClassDef, note?: string): string => `
      <div class="class-card ${note ? 'locked' : ''}" data-id="${c.id}" data-locked="${!!note}"
        ${note ? 'style="opacity:.5"' : ''}>
        <div class="cname" style="color:${c.color}">${c.name}</div>
        <div class="cdesc">${c.description}</div>
        <div class="cattrs">${ATTRIBUTE_IDS.filter(a => (c.attributes[a] ?? 0) > 0).map(a =>
          `${ATTRIBUTES[a].short} ${c.attributes[a]}`).join(' &nbsp; ')}</div>
        ${skillChips(c)}
        ${c.innateText ? `<div class="cskills">Innate: ${c.innateText}</div>` : ''}
        ${note ? `<div class="class-lock">${note}</div>` : ''}
      </div>`;

    // THE LIFE-CONTRACT row (meta/modes.ts): rendered only once a second mode
    // is unlocked, dealt straight from the registry — a new mode is one data
    // entry there, zero edits here. Roster modes show their vessel occupancy
    // and grey out when full (click → the Vault, where more slots are sold).
    const modes = availableModes(acc);
    if (!modes.some(md => md.id === this.pendingModeId)) this.pendingModeId = DEFAULT_MODE_ID;
    const modeCard = (md: (typeof modes)[number]): string => {
      const roster = md.save === 'roster';
      const cap = roster ? rosterCapacity(acc, md) : 0;
      const used = roster ? rosterOf(acc, md.id).length : 0;
      const full = roster && used >= cap;
      const sel = this.pendingModeId === md.id;
      return `
        <div class="mode-card" data-mode="${md.id}" data-full="${full}"
          style="flex:1 1 260px;max-width:420px;text-align:left;cursor:var(--cursor-point, pointer);padding:8px 10px;
            border-radius:8px;background:#16121c;border:1px solid ${sel ? md.color : '#3a3644'};
            ${sel ? `box-shadow:0 0 10px ${md.color}44;` : ''}${full ? 'opacity:.45;' : ''}">
          <div style="font-weight:bold;color:${md.color}">${sel ? '◈ ' : ''}${md.name}
            ${roster ? `<span style="float:right;font-size:10px;color:#a8a494">${used}/${cap} vessel${cap === 1 ? '' : 's'}</span>` : ''}</div>
          <div style="font-size:10px;color:#a8a494;margin-top:2px">${md.blurb}</div>
          ${full ? '<div style="font-size:10px;color:#d08a4b;margin-top:3px">🔒 No free vessel: unlock more in the Vault, or release one from the start menu.</div>' : ''}
        </div>`;
    };
    const modeRow = modes.length > 1
      ? `<div id="mode-row" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:6px 0 10px 0">
          ${modes.map(modeCard).join('')}</div>`
      : '';

    // THE NAME ROW (Naming/Nemesis): typed name > sticky account preference >
    // named-for-its-class. The world's memory follows whatever ends up chosen.
    const nameValue = this.pendingCharName ?? acc.namePref ?? '';
    this.classSelect.innerHTML = `
      <h1>${GAME_TITLE.toUpperCase()}</h1>
      <div id="name-row" style="display:flex;gap:6px;justify-content:center;align-items:center;margin:2px 0 8px 0">
        <span style="font-size:12px;color:#c8a84b">⚜ Name</span>
        <input id="char-name" type="text" maxlength="24" spellcheck="false"
          placeholder="named for its class" value="${esc(nameValue)}"
          style="width:220px;padding:5px 9px;font-size:13px;background:#16121c;color:#e8dcc8;
            border:1px solid #6a5a38;border-radius:8px;outline:none;text-align:center">
        <button id="name-clear" title="Forget the name; characters go back to being named for their class"
          style="font-size:11px;padding:5px 10px">Nameless</button>
      </div>
      <div style="font-size:12px;color:var(--gold);margin-bottom:4px">
        Account Level ${acc.level} &nbsp;·&nbsp; ${acc.credits} ${META_CURRENCY_LABEL} &nbsp;·&nbsp;
        hand of ${picks.length} &nbsp;·&nbsp; ${pool.length} of ${CLASSES.length} classes unlocked${undiscovered.length
          ? ` &nbsp;·&nbsp; ${undiscovered.length} undiscovered` : ''} &nbsp;(re-deals each new run)</div>
      <div class="subtitle">
        A random hand is dealt each run from the classes your account has unlocked.
        Class Slots widen the hand; Class unlocks (each bundling its thematic skills)
        deepen the pool, and every class you realize opens its Vocation.
        Classes are only starting points; the tree and every skill stay open to any build.
        Pick a class to begin; tune the world mix under Event Weights first if you like.
      </div>
      ${modeRow}
      <div class="class-grid">${picks.map(c => classCard(c)).join('')}${teasers.map(t => classCard(t.def, lockNote(t))).join('')}${rumors.map(rumorCard).join('')}</div>
      <div class="acct-btns">
        <button id="event-weights-btn">⚙ Event Weights</button>
        <button id="account-btn">Unlocks (Vault)</button>
      </div>`;
    this.classSelect.classList.remove('hidden');

    // THE NAME ROW handlers: keystrokes track into pendingCharName (so the
    // mode picker's re-renders keep the text); Nameless clears the text AND
    // the sticky account preference — back to class-named until typed anew.
    const nameInput = this.classSelect.querySelector<HTMLInputElement>('#char-name');
    nameInput?.addEventListener('input', () => { this.pendingCharName = nameInput.value; });
    this.classSelect.querySelector<HTMLElement>('#name-clear')?.addEventListener('click', () => {
      this.pendingCharName = '';
      if (nameInput) nameInput.value = '';
      const a = this.getAccount();
      if (a.namePref !== null) { a.namePref = null; this.saveAccount(); }
    });

    // A mode card selects the life-contract (a full roster mode routes to the
    // Vault instead — its remedy is sold there). Re-render keeps the same hand.
    this.classSelect.querySelectorAll<HTMLElement>('.mode-card').forEach(el => {
      el.addEventListener('click', () => {
        if (el.dataset.full === 'true') {
          this.showAccountScreen(() => this.showClassSelect(onPick));
          return;
        }
        this.pendingModeId = el.dataset.mode!;
        this.showClassSelect(onPick);
      });
    });
    this.classSelect.querySelectorAll<HTMLElement>('.class-card').forEach(el => {
      el.addEventListener('click', () => {
        if (el.dataset.locked === 'true') {
          this.showAccountScreen(() => this.showClassSelect(onPick));
          return;
        }
        // A full roster mode can't be sworn into — the card click above routes
        // to the Vault, and the pick below re-checks as the belt to that brace.
        const md = modeById(this.pendingModeId);
        if (md.save === 'roster' && rosterOf(acc, md.id).length >= rosterCapacity(acc, md)) {
          this.showAccountScreen(() => this.showClassSelect(onPick));
          return;
        }
        // Resolve THE NAME at the moment of picking: a typed name is used and
        // becomes the sticky preference; an emptied field means nameless (the
        // preference clears — what the player sees is what persists).
        const typed = (this.classSelect.querySelector<HTMLInputElement>('#char-name')?.value ?? '').trim();
        const a = this.getAccount();
        if ((a.namePref ?? '') !== typed) {
          a.namePref = typed || null;
          this.saveAccount();
        }
        this.classSelect.classList.add('hidden');
        onPick(CLASSES.find(c => c.id === el.dataset.id!)!, this.pendingModeId, typed || undefined);
      });
    });
    document.getElementById('account-btn')!.addEventListener('click',
      () => this.showAccountScreen(() => this.showClassSelect(onPick)));
    document.getElementById('event-weights-btn')!.addEventListener('click',
      () => this.showExpeditionSetup(() => this.showClassSelect(onPick)));
  }

  /** The account / unlock store: spend credits on classes, gem pools, town
   *  features. `onClose` (if given) re-opens the screen we came from.
   *  Organized as SHELVES (VAULT_TABS + vaultShelfCensus, meta/unlocks.ts —
   *  organization as data, the character sheet's idiom): the head and the
   *  Back footer stay PUT; only the shelf floor scrolls between them. THE
   *  MYSTERY LAW: a shelf with nothing to show does not exist yet — the
   *  player learns the store's shape by playing. THE GROWING STORE
   *  (VAULT_SHELF_CFG): until the account has claimed enough to need
   *  shelving, the whole Vault is one flat wall — its furniture rises with
   *  the player's own knowledge of the game. */
  showAccountScreen(onClose?: () => void): void {
    this.hideAll(); // close whatever opened it (start menu / class select / …) so it never overlaps
    const acc = this.getAccount();
    // THE RECKONING VISIT: a Vault opened while ANY Mortal Essence stands is
    // the run's closing prompt — the seal law arms (leaving requires the
    // confirm, and sealing lets every unassigned point go: Mortal Essence
    // never crosses between runs). A Vault opened empty is plain browsing.
    const creditsAtOpen = acc.credits;
    let reckoningSealed = false;
    // What THIS visit poured, for the seal prompt's honest summary.
    const visitLog = new Map<string, { label: string; put: number; done: boolean }>();
    const logPour = (u: Unlockable, put: number): void => {
      if (put <= 0) return;
      const row = visitLog.get(u.id) ?? { label: u.label, put: 0, done: false };
      row.put += put;
      // The service kinds are never "owned" — completion is the state
      // change (armed charge, cleared fallen stamp): unlockCompleted.
      row.done = unlockCompleted(acc, u);
      visitLog.set(u.id, row);
    };
    // The store keeps your place PER AISLE ('_flat' = the young store's one
    // wall): capture the outgoing scroll before anything replaces the body
    // (shelf flips, fold flips and purchases alike — the bought card is
    // usually mid-list; snapping loses the spot).
    const saveShelfScroll = (): void => {
      const b = this.accountScreen.querySelector<HTMLElement>('.vault-body');
      if (b) this.vaultScroll[this.vaultTab || '_flat'] = b.scrollTop;
    };
    const render = (): void => {
      // THE CENSUS (vaultShelfCensus): every shelf's stock/owned/rumors and
      // its mystery-law verdict in one read the strip, faces and floor share.
      const census = vaultShelfCensus(acc);
      // THE SEALED CARDS (gatework, meta/unlocks.ts): tease-marked entries
      // whose chain is walked but whose avenues still hold them shut hang
      // beside the buyable stock — named, priced, locked, their roads
      // printed in the hover story. Seated by shelf like everything else —
      // and a sealed rack is EARNED knowledge, so it holds its shelf
      // visible too (folding the sealed lane into the census proper is
      // queued on the gatework landing).
      const sealed = sealedUnlocks(acc);
      const sealedBy = new Map<string, Unlockable[]>();
      for (const s of sealed) {
        const seat = vaultSeatOf(s.u.kind).id;
        const arr = sealedBy.get(seat);
        if (arr) arr.push(s.u); else sealedBy.set(seat, [s.u]);
      }
      const visible = census.filter(c => c.visible || (sealedBy.get(c.tab.id)?.length ?? 0) > 0);
      const strip = vaultStripVisible(acc, census);

      // COMPACT BY DESIGN: kind, name, price — the description lives in the
      // hover-intent tooltip (the accountScreen bind), so a shelf reads as a
      // shelf, never a wall of text. availableUnlocks() already excludes
      // owned + un-gated entries. THE INVESTMENT LANE: every card wears its
      // poured-progress bar (persistent across runs) and a HOLD-to-pour
      // button — partial progress is always real, so nothing on the shelf
      // is ever out of reach, only further away. The bar is rendered even
      // at zero so a live pour can fill it without a re-render (the hold
      // must never lose its button mid-press).
      // The button's one word by kind: a resurrection is called what it is.
      const buyVerb = (u: Unlockable): string => u.kind === 'resurrect' ? 'Resurrect' : 'Unlock';
      const cardHtml = (u: Unlockable): string => {
        const inv = investedToward(acc, u);
        const rem = remainingCost(acc, u);
        const canPour = acc.credits > 0 && rem > 0;
        const pct = u.cost > 0 ? Math.round((inv / u.cost) * 100) : 0;
        return `
            <div class="unlock-card" data-tip="unlock" data-unlock-id="${u.id}">
              <div class="ukind">${VAULT_KIND_LABELS[u.kind]}${u.reqLevel ? ` · req acct lv ${u.reqLevel}` : ''}</div>
              <div class="uname">${u.label}</div>
              <div class="uinvest"><i style="width:${pct}%"></i></div>
              <button data-invest="${u.id}" ${canPour ? '' : 'disabled'}
                title="Click to ${buyVerb(u).toLowerCase()} outright when your essence covers it. Hold to INVEST a piece at a time — invested essence stays across runs, and the ${u.kind === 'resurrect' ? 'vessel rises' : 'unlock completes'} when the full cost stands.">${
                inv > 0 ? `${buyVerb(u)} — ${rem} more` : `${buyVerb(u)} — ${u.cost}`}</button>
            </div>`;
      };
      const ownedCardHtml = (u: Unlockable): string => `
            <div class="unlock-card uowned" data-tip="unlock" data-unlock-id="${u.id}">
              <div class="ukind">${VAULT_KIND_LABELS[u.kind]}</div>
              <div class="uname">${u.label}</div>
              <button disabled>✓ Owned</button>
            </div>`;
      // A sealed card wears the name and the price openly (the chain is
      // walked — this IS the next link) with the lock on the button; the
      // avenues that open it live in the hover story, met roads checked.
      const sealedCardHtml = (u: Unlockable): string => `
            <div class="unlock-card usealed" style="opacity:.7" data-tip="sealedunlock" data-unlock-id="${u.id}">
              <div class="ukind">${VAULT_KIND_LABELS[u.kind]} · sealed</div>
              <div class="uname">${u.label}</div>
              <button disabled>🔒 ${u.cost}</button>
            </div>`;
      const grid = (rows: string): string => `<div class="unlock-grid">${rows}</div>`;
      const subHead = (label: string): string => `<h3 class="vault-sub">${esc(label)}</h3>`;
      // The SEALED rack — beneath the buyable stock, above the rumor wall:
      // the next links of walked chains, roads printed on hover.
      const sealedRack = (rows: Unlockable[]): string => rows.length
        ? subHead('Sealed: earn the road, then buy') + grid(rows.map(sealedCardHtml).join('')) : '';
      // THE RUMOR FOLD (discovery web, meta/unlocks.ts): classes the account
      // has NOT yet discovered hang shrouded — the hint whispers at the
      // deed, the name and price stay the world's secret until it is done.
      // The whole wall COLLAPSES to its one header line on a click (the
      // satchel idiom — vaultRumorsOpen), count kept on the face so a
      // closed fold still says how many whispers wait. Hover-addressed by
      // INDEX, not id: the catalog id spells the class name, and the DOM
      // keeps the world's secrets too (index space = the ONE undiscovered
      // list, which the census hands over whole).
      const rumorSection = (rows: Unlockable[]): string => {
        if (!rows.length) return '';
        const open = this.vaultRumorsOpen;
        return `<h3 class="vault-sub vault-fold" data-fold="rumors" title="${open
            ? 'Fold the rumor wall away' : 'Hang the rumor wall back up'}"><span class="arr">${open ? '▾' : '▸'}</span>Rumors: classes not yet discovered (${rows.length})</h3>`
          + (open ? grid(rows.map((_u, i) => `
            <div class="unlock-card" style="opacity:.55" data-tip="rumor" data-rumor-i="${i}">
              <div class="ukind">${VAULT_KIND_LABELS.class} · undiscovered</div>
              <div class="uname" style="letter-spacing:3px">? ? ?</div>
              <button disabled>Undiscovered</button>
            </div>`).join('')) : '');
      };

      let tabStrip = '', body = '';
      if (!strip) {
        // THE YOUNG STORE: no shelving earned yet — one flat wall of
        // everything visible, in shelf order (the cards' kind tags speak
        // for themselves), the sealed rack, the rumor fold, and whatever
        // little is owned at the tail. The furniture arrives when the
        // account outgrows this room.
        this.vaultTab = '';
        const stock = visible.flatMap(c => c.stock);
        const ownedAll = census.find(c => c.tab.owned)?.owned ?? [];
        body = stock.length ? grid(stock.map(cardHtml).join(''))
          : `<div class="vault-empty">Nothing for sale right now; earn ${META_CURRENCY_LABEL} and milestones by playing.</div>`;
        body += sealedRack(sealed.map(s => s.u));
        body += rumorSection(census.flatMap(c => c.rumors));
        if (ownedAll.length) body += subHead(`Owned (${ownedAll.length})`) + grid(ownedAll.map(ownedCardHtml).join(''));
      } else {
        // Land on the remembered shelf if it still stands; else the first
        // shelf with something to BUY, else the first standing shelf.
        if (!visible.some(c => c.tab.id === this.vaultTab)) {
          this.vaultTab = (visible.find(c => c.stock.length > 0) ?? visible[0]).tab.id;
        }
        const row = visible.find(c => c.tab.id === this.vaultTab)!;
        const tab = row.tab;

        // THE SHELF STRIP — VISIBLE shelves only (the mystery law: what
        // isn't there yet can't be read off a dimmed face; a new shelf
        // APPEARING is the store growing). Each face wears its label plus
        // a QUIET stock count — gold the moment any of that stock is
        // affordable. Everything deeper rides the hover title.
        tabStrip = `<div class="book-tabs vault-tabs">${visible.map(c => {
          const t = c.tab;
          const stockN = c.stock.length, rumorN = c.rumors.length;
          const sealedN = t.owned ? 0 : (sealedBy.get(t.id)?.length ?? 0);
          const canBuy = c.stock.filter(u => acc.credits >= u.cost).length;
          const shown = t.owned ? c.owned.length : stockN;
          const detail = t.owned
            ? `: ${c.owned.length} claimed`
            : `: ${stockN} available${canBuy ? `, ${canBuy} affordable now` : ''}${sealedN ? `; ${sealedN} sealed` : ''}${rumorN ? `; ${rumorN} rumor${rumorN === 1 ? '' : 's'} shrouded` : ''}`;
          return `<button class="book-tab${t.id === this.vaultTab ? ' active' : ''}"
            data-vtab="${t.id}" title="${esc(t.blurb + detail)}">${t.label}${shown > 0
              ? `<span class="cnt${canBuy > 0 ? ' now' : ''}">${shown}</span>` : ''}</button>`;
        }).join('')}</div>`;

        // The active shelf's floor. Multi-kind shelves group under kind
        // headers (VAULT_KIND_LABELS — the cards' ukind tag at shelf
        // grain); single-kind shelves skip them, the face already says it.
        if (tab.owned) {
          // THE TROPHY CASE: everything claimed, grouped by kind in shelf
          // order — browsed deliberately, never underfoot while shopping.
          // (Visible only once anything IS claimed, so never empty here.)
          body = vaultKindOrder()
            .map(k => ({ k, rows: row.owned.filter(u => u.kind === k) }))
            .filter(s => s.rows.length > 0)
            .map(s => subHead(VAULT_KIND_LABELS[s.k]) + grid(s.rows.map(ownedCardHtml).join('')))
            .join('');
        } else {
          const rows = row.stock;
          const sealedRows = sealedBy.get(tab.id) ?? [];
          if (rows.length === 0 && sealedRows.length === 0) {
            body = `<div class="vault-empty">${esc(tab.emptyNote
              ?? `Nothing here right now; earn more ${META_CURRENCY_LABEL} and milestones by playing.`)}</div>`;
          } else if ((tab.kinds?.length ?? 0) > 1) {
            body = (tab.kinds ?? []).map(k => {
              const kr = rows.filter(u => u.kind === k);
              return kr.length ? subHead(VAULT_KIND_LABELS[k]) + grid(kr.map(cardHtml).join('')) : '';
            }).join('');
          } else {
            body = rows.length ? grid(rows.map(cardHtml).join('')) : '';
          }
          body += sealedRack(sealedRows);
          body += rumorSection(row.rumors);
        }
      }

      const reckoning = creditsAtOpen > 0;
      this.accountScreen.innerHTML = `
        <div class="vault-head">
          <h1>${reckoning ? 'The Reckoning: Assign Your Essence' : 'The Vault: Account Unlocks'}</h1>
          <div class="acct-head">Account Level <b>${acc.level}</b> &nbsp;·&nbsp;
            <b id="vault-cred">${acc.credits}</b> ${META_CURRENCY_LABEL}${reckoning
              ? ` <span style="color:#e8b06a;font-size:11px">— this run's harvest: what is not assigned does not keep</span>` : ''}
            &nbsp;·&nbsp; ${acc.lifetimeCredits} lifetime
            &nbsp;·&nbsp; <span style="color:var(--text-dim);font-size:11px">hold a card's button to invest · rest on it for its full story</span></div>
          ${tabStrip}
        </div>
        <div class="vault-body">${body}</div>
        <div class="vault-foot acct-btns"><button id="acct-close">${reckoning ? 'Seal &amp; Continue' : 'Back'}</button></div>`;
      const bodyEl = this.accountScreen.querySelector<HTMLElement>('.vault-body');
      if (bodyEl) bodyEl.scrollTop = this.vaultScroll[this.vaultTab || '_flat'] ?? 0;
      this.accountScreen.querySelectorAll<HTMLElement>('[data-vtab]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.vtab === this.vaultTab) return;
          saveShelfScroll();
          this.vaultTab = btn.dataset.vtab!;
          render();
        });
      });
      // The rumor fold's latch — one state, both store shapes.
      this.accountScreen.querySelectorAll<HTMLElement>('[data-fold]').forEach(h => {
        h.addEventListener('click', () => {
          saveShelfScroll();
          this.vaultRumorsOpen = !this.vaultRumorsOpen;
          render();
        });
      });
      // THE CLICK/HOLD SEAM (INVEST_CFG.holdDelayMs): a press released
      // inside the window is a CLICK — the outright unlock when the pool
      // covers the remainder (the typical intent: "Unlock" means unlock);
      // held past it, the press becomes THE POUR — the quiet investing
      // fallback that compounds while held and also serves when the pool
      // falls short. Ticks write the button face, the fill bar, and the
      // head's pool INLINE (never a re-render — the hold must keep its
      // button); release, a dry pool, or completion settles: save +
      // re-render (a completed card re-shelves under Owned).
      let pourTimer = 0;
      let holdTimer = 0;
      this.accountScreen.querySelectorAll<HTMLButtonElement>('[data-invest]').forEach(btn => {
        const id = btn.dataset.invest!;
        const findU = (): Unlockable | undefined => availableUnlocks(acc).find(x => x.id === id);
        const updateFaces = (u: Unlockable): void => {
          btn.textContent = `${u.kind === 'resurrect' ? 'Resurrect' : 'Unlock'} — ${remainingCost(acc, u)} more`;
          const bar = btn.parentElement?.querySelector<HTMLElement>('.uinvest i');
          if (bar && u.cost > 0) bar.style.width = `${Math.round((investedToward(acc, u) / u.cost) * 100)}%`;
          const cred = document.getElementById('vault-cred');
          if (cred) cred.textContent = String(acc.credits);
        };
        const doneToast = (u: Unlockable): string => u.kind === 'graft'
          ? `⚔ ${u.label} — a charge awaits your next run's start`
          : u.kind === 'resurrect'
            ? `✦ ${u.label} — RISEN: the vessel wakes in Lastlight`
            : `✦ ${u.label} — UNLOCKED`;
        // "This pour finished": ownership for the permanent kinds, the state
        // change for the service kinds (unlockCompleted — the one predicate).
        const completed = (u: Unlockable): boolean => unlockCompleted(acc, u);
        const settle = (poured: boolean, done?: Unlockable): void => {
          if (pourTimer) { window.clearInterval(pourTimer); pourTimer = 0; }
          if (!poured) return;
          saveShelfScroll();
          this.saveAccount();
          render();
          if (done) this.vaultToast(doneToast(done));
        };
        // The one completion road every input shares: full unlock + log +
        // settle theater (used by the click, the keyboard, and the pour's
        // own terminal tick through settle above).
        const unlockOutright = (u: Unlockable): boolean => {
          const remBefore = remainingCost(acc, u);
          if (!applyUnlock(acc, u)) return false;
          logPour(u, remBefore);
          saveShelfScroll();
          this.saveAccount();
          render();
          this.vaultToast(doneToast(u));
          return true;
        };
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          if (pourTimer || holdTimer) return; // one press at a time
          const u = findU();
          if (!u) return;
          // Stamp the press: the trailing synthetic click (a native mouse's,
          // or THE PAD POINTER's — whose Ⓐ speaks real pointerdown/up, so a
          // held Ⓐ pours natively) is suppressed by this mark; the keyboard
          // lane is exactly the clicks that arrive with no recent press.
          this.investPointerAt = performance.now();
          try { btn.setPointerCapture(e.pointerId); } catch { /* capture is best-effort */ }
          let poured = 0;
          let held = false;
          const beginPour = (): void => {
            holdTimer = 0;
            held = true;
            let rate = INVEST_CFG.baseRate;
            let frac = INVEST_CFG.tapAmount; // the pour opens with the smallest step
            let last = performance.now();
            pourTimer = window.setInterval(() => {
              if (!btn.isConnected) { settle(false); return; }
              const now = performance.now();
              const dt = (now - last) / 1000;
              last = now;
              rate = Math.min(INVEST_CFG.maxRate, rate * Math.pow(INVEST_CFG.accel, dt));
              frac += rate * dt;
              const whole = Math.floor(frac);
              if (whole < 1) return;
              frac -= whole;
              const put = investUnlock(acc, u, whole);
              poured += put;
              logPour(u, put);
              if (completed(u)) { settle(poured > 0, u); return; }
              if (put < whole) { settle(poured > 0); return; } // pool ran dry
              updateFaces(u);
            }, INVEST_CFG.tickMs);
          };
          holdTimer = window.setTimeout(beginPour, INVEST_CFG.holdDelayMs);
          const release = (): void => {
            btn.removeEventListener('pointerup', release);
            btn.removeEventListener('pointercancel', release);
            this.investPointerAt = performance.now(); // the release's own trailing click stays suppressed
            if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = 0; }
            if (!held) {
              // THE CLICK: unlock outright when the pool covers it; short,
              // point at the hold lane instead of quietly draining.
              if (!unlockOutright(u)) {
                this.vaultToast(`${remainingCost(acc, u) - acc.credits} short — hold to invest what you carry`);
              }
              return;
            }
            if (pourTimer) settle(poured > 0);
          };
          btn.addEventListener('pointerup', release);
          btn.addEventListener('pointercancel', release);
        });
        // KEYBOARD activation (Enter/Space): the same click law — outright
        // when covered — and, holdless by nature, the covered-short press
        // invests EVERYTHING carried (the pour's own terminal state,
        // reached in one deliberate step). Pointer-originated clicks —
        // native mice AND the pad pointer's synthetic trailer — arrive
        // right after a press this driver already handled, and the stamp
        // suppresses them (the old `detail` heuristic misread the pad's
        // detail-0 clicks as keyboard).
        btn.addEventListener('click', () => {
          if (performance.now() - this.investPointerAt < 500) return;
          const u = findU();
          if (!u) return;
          if (unlockOutright(u)) return;
          const put = investUnlock(acc, u, Math.min(acc.credits, remainingCost(acc, u)));
          logPour(u, put);
          if (put > 0) {
            saveShelfScroll();
            this.saveAccount();
            render();
            this.vaultToast(`+${put} invested toward ${u.label}`);
          }
        });
      });
      document.getElementById('acct-close')!.addEventListener('click', () => {
        // THE SEAL LAW: a reckoning visit (opened holding essence) never
        // just closes — the player confirms their allocation, and sealing
        // lets whatever stands unassigned go. A browsing visit closes free.
        if (!reckoning || reckoningSealed) {
          this.accountScreen.classList.add('hidden');
          if (onClose) onClose();
          return;
        }
        const spent = [...visitLog.values()];
        const spentHtml = spent.length
          ? `<div class="seal-list">${spent.map(r =>
              `<div>${r.done ? '✦' : '·'} ${esc(r.label)} — ${r.done ? 'UNLOCKED' : `+${r.put} invested`}</div>`).join('')}</div>`
          : `<div class="seal-list" style="color:var(--text-dim)">Nothing assigned this reckoning.</div>`;
        const loose = acc.credits;
        const modal = document.createElement('div');
        modal.className = 'seal-modal';
        modal.innerHTML = `
          <div class="seal-box">
            <h2>Seal the Reckoning?</h2>
            ${spentHtml}
            ${loose > 0
              ? `<div class="seal-warn"><b>${loose}</b> ${META_CURRENCY_LABEL} remains unassigned.
                 It does <b>not</b> keep between runs — invest it now, or let it pass.</div>`
              : `<div class="seal-ok">Every point assigned. The next run starts clean.</div>`}
            <div class="acct-btns">
              <button id="seal-back">Keep Assigning</button>
              <button id="seal-go" class="danger">${loose > 0 ? 'Let It Pass — Seal' : 'Seal &amp; Continue'}</button>
            </div>
          </div>`;
        this.accountScreen.appendChild(modal);
        modal.querySelector<HTMLElement>('#seal-back')!.addEventListener('click', () => modal.remove());
        modal.querySelector<HTMLElement>('#seal-go')!.addEventListener('click', () => {
          reckoningSealed = true;
          sealReckoning(acc);
          this.saveAccount();
          modal.remove();
          this.accountScreen.classList.add('hidden');
          if (onClose) onClose();
        });
      });
    };
    render();
    this.accountScreen.classList.remove('hidden');
  }

  /** A transient banner over the Vault (an unlock completing mid-pour) —
   *  self-removing; purely celebratory. */
  private vaultToast(msg: string): void {
    const t = document.createElement('div');
    t.className = 'vault-toast';
    t.textContent = msg;
    this.accountScreen.appendChild(t);
    window.setTimeout(() => t.remove(), 2400);
  }

  /** THE VAULT CARD's hover story: the full description the compact card no
   *  longer prints, rebuilt from the live catalog by id (never cached DOM
   *  copy). Serves Available and Owned alike — the meta line carries the
   *  price or the ✓. */
  private unlockTooltip(id: string): TooltipContent | null {
    const acc = this.getAccount();
    // Account pass: the dynamic Fallen-shelf entries live only there.
    const u = allUnlockables(acc).find(x => x.id === id);
    if (!u) return null;
    const owned = isUnlockOwned(acc, u);
    const inv = investedToward(acc, u);
    const req = u.reqLevel ? ` · req account level ${u.reqLevel}` : '';
    const price = owned ? '✓ owned'
      : inv > 0 ? `${inv}/${u.cost} ${META_CURRENCY_LABEL} invested · ${remainingCost(acc, u)} to go`
      : `${u.cost} ${META_CURRENCY_LABEL}`;
    return {
      title: u.label,
      description: u.description,
      meta: `${VAULT_KIND_LABELS[u.kind]}${req} · ${price}`,
      wide: true,
    };
  }

  /** A SEALED card's hover story: the description plus THE ROADS — every
   *  avenue that could open it, met ones checked (gatework, sealedGateLines;
   *  the any-of group prefaced so "one of these" reads at a glance). */
  private sealedUnlockTooltip(id: string): TooltipContent | null {
    const acc = this.getAccount();
    const s = sealedUnlocks(acc).find(x => x.u.id === id);
    if (!s) return null;
    const anyOf = s.lines.filter(l => l.anyOf);
    const allOf = s.lines.filter(l => !l.anyOf);
    const line = (l: { label: string; met: boolean }): string =>
      `<div style="color:${l.met ? 'var(--good, #7fd88f)' : 'var(--text-dim)'}">${l.met ? '✓' : '·'} ${esc(l.label)}</div>`;
    const roads =
      (anyOf.length ? `<div style="margin-top:6px"><b>Opens by ANY of:</b>${anyOf.map(line).join('')}</div>` : '')
      + (allOf.length ? `<div style="margin-top:6px"><b>Also needs:</b>${allOf.map(line).join('')}</div>` : '');
    return {
      title: `🔒 ${s.u.label}`,
      description: `${s.u.description}${roads}`,
      meta: `${VAULT_KIND_LABELS[s.u.kind]} · sealed · ${s.u.cost} ${META_CURRENCY_LABEL} when open`,
      wide: true,
    };
  }

  /** A shrouded rumor's hover whisper — hint only, indexed off the live
   *  undiscovered list so the DOM never carries the class's name. */
  private rumorTooltip(index: number): TooltipContent | null {
    const u = undiscoveredClassUnlocks(this.getAccount())[index];
    if (!u || u.kind !== 'class') return null;
    return {
      title: '? ? ?',
      description: `<i>“${u.payload.hint ?? 'The world has not introduced this one yet.'}”</i>`,
      meta: `${VAULT_KIND_LABELS.class} · undiscovered: the world teaches what the Vault cannot sell`,
      wide: true,
    };
  }

  // --------------------------------------------------------- character sheet

  toggleCharSheet(seatId?: string): void {
    const seat = this.couchSeatFor(seatId);
    // Open for ANOTHER local seat → take ownership (re-dock + re-render) —
    // the couch's one-instance contention rule, visible and predictable.
    if (this.charSheetOpen && this.panelSeat(this.charSheet) !== seat) {
      this.ownPanel(this.charSheet, seat);
      this.refreshCharSheet();
      return;
    }
    this.charSheetOpen = !this.charSheetOpen;
    this.charSheet.classList.toggle('hidden', !this.charSheetOpen);
    if (this.charSheetOpen) {
      this.ownPanel(this.charSheet, seat);
      this.refreshCharSheet();
    } else hideTooltip();
  }

  refreshCharSheet(): void {
    if (!this.charSheetOpen) return;
    // A press is in flight inside this panel — rebuilding now would swallow
    // its click (THE PRESS GUARD). Clicks fire after release, so every
    // deliberate refresh (tab flips, toggles) still lands; the timer catches
    // up within half a second.
    if (this.pressHeld.has(this.charSheet)) return;
    const world = this.getWorld();
    const seat = this.panelSeat(this.charSheet);
    const p = seat.actor;
    const m = seat.meta;

    const attrRows = ATTRIBUTE_IDS.map(id => {
      const total = m.attrs[id] ?? 0;
      const bonus = total - (m.baseAttrs[id] ?? 0);
      return `
      <div class="attr-row" data-tip="attr" data-attr-id="${id}" style="cursor:var(--cursor-help, help)">
        <span>${ATTRIBUTES[id].label}</span>
        <span class="val">${total}
          ${bonus > 0 ? `<span style="color:#c8a84b;font-size:10px">(+${bonus} tree)</span>` : ''}
        </span>
      </div>`;
    }).join('');

    // ONE row renderer — the vitals band and every tab row alike (resist
    // rows keep their effective-vs-raw double read wherever they print).
    const statRowHtml = (id: string): string => {
      const def = STAT_DEFS[id];
      if (!def) return '';
      const resType = SHEET_RES[id];
      const raw = p.sheet.get(id);
      const v = resType ? resistValue(p, resType) : raw;
      let text = def.percent ? `${Math.round(v * 100)}%`
        : def.base === 1 ? `${Math.round(v * 100)}%`     // multiplier-style stats
        : (Math.round(v * 10) / 10).toString();
      if (resType && raw > v + 0.0001) {
        text += ` <span style="color:#8a8678;font-size:10px">(${Math.round(raw * 100)}% raw)</span>`;
      }
      return `<div class="stat-row" data-tip="stat" data-stat-id="${id}" style="cursor:var(--cursor-help, help)"><span>${def.label}</span><span class="val">${text}</span></div>`;
    };

    // THE STATISTICS TABS (data/sheet.ts — the sheet's organization as
    // data): attributes and the vitals band stay above, always; below, one
    // tab per category. Core rows anchor a tab; the rest surface only as
    // the build touches them, so the sheet reads as the build being played
    // instead of a wall of untouched dials. Generated families and any
    // unseated stat fold in live — nothing invested is ever invisible.
    const tabModels = sheetTabs(id => p.sheet.get(id), this.charShowAll);
    if (!tabModels.some(t => t.cat === this.charTab)) this.charTab = tabModels[0]?.cat ?? 'offense';
    const active = tabModels.find(t => t.cat === this.charTab);
    // Tab faces stay BARE — the invested count rides the hover title instead
    // of an always-on badge (the clutter-free doctrine: the label is the
    // read, the number is detail for whoever asks).
    const tabStrip = `<div class="book-tabs stat-tabs">${tabModels.map(t =>
      `<button class="book-tab${t.cat === this.charTab ? ' active' : ''}${t.rows.length === 0 ? ' bare' : ''}"
        data-stattab="${t.cat}" title="${esc(t.def.blurb)}${t.invested > 0
          ? `: ${t.invested} invested stat${t.invested === 1 ? '' : 's'} live here` : ''}">${t.def.label}</button>`).join('')}</div>`;
    const vitalRows = SHEET_VITALS.map(statRowHtml).join('');
    const statRows = active ? active.rows.map(statRowHtml).join('') : '';
    const tabNotes = !active ? ''
      : (active.rows.length === 0
        ? `<div style="color:#8a8678;font-size:10px;padding:4px 0 2px">Nothing invested here yet;
            gear, passives and Memories that touch these stats will appear as rows.</div>` : '')
      + (!this.charShowAll && active.hidden > 0
        ? `<div style="color:#6a6478;font-size:9px;margin-top:5px">${active.hidden} untouched
            stat${active.hidden === 1 ? '' : 's'} not shown; “show unused” lists the whole shelf.</div>` : '');

    // The vocation TITLE rides the class name once granted — "Warrior, Warbringer".
    const vocTitle = m.vocations
      .map(vid => VOCATIONS[vid])
      .filter((v): v is NonNullable<typeof v> => !!v)
      .map(v => `, <span style="color:${v.color}">${v.name}</span>`)
      .join('');
    const vocPts = m.vocations.length
      ? ` · <span style="color:#e8c860">${m.vocationPoints} vocation</span>` : '';
    // The ANCHORED header: class identity + the (deliberately tiny) starter
    // safety net stay visible however far the sheet scrolls. Negative margins
    // eat the panel padding so the sticky band hugs the panel's top edge.
    const starterChips = m.classDef.bar.filter((s): s is string => !!s).map(sid => {
      const def = SKILLS[sid];
      if (!def) return '';
      const carried = m.knownSkills.has(sid) || !!findBagGem(m.items, 'skill', sid);
      return `<span style="display:inline-block;margin:0 5px 0 0;font-size:9px;color:${carried ? '#6a6478' : def.color}"
        title="${def.name}${carried ? ' — carried' : ' — LOST: ↺ re-kindles a granted copy (worthless to salvage or the font)'}">
        ${def.name}${carried ? '' : ` <button data-reacquire="${sid}" style="font-size:9px;padding:0 4px" title="re-kindle (granted)">↺</button>`}</span>`;
    }).join('');
    // Same-scroll restore (the golden rule — a re-render must never yank
    // the sheet mid-read; gear swaps and tab flips land where you were).
    const prevScroll = this.charSheet.scrollTop;
    const html = `
      <div style="position:sticky;top:-14px;z-index:2;background:var(--panel-bg);
        margin:-14px -14px 8px;padding:14px 14px 5px;border-bottom:1px solid var(--panel-border)">
        ${this.closeGlyphHtml()}<h2 style="border-bottom:none;margin:0;padding-bottom:2px"><span data-tip="class" style="cursor:var(--cursor-help, help);border-bottom:1px dotted var(--gold)">${m.classDef.name}</span>${vocTitle} — Level ${p.level}</h2>
        <div style="font-size:9px;color:#6a6478">starters: ${starterChips}</div>
      </div>
      <div style="font-size:11px;margin-bottom:6px">
        <span style="color:#ffd700">${m.passivePoints} passive</span>${vocPts} points available
      </div>
      <h3>Attributes <span style="color:#8a8678;font-weight:normal">(allocated on the passive tree: P)</span></h3>
      ${attrRows}
      <h3 style="display:flex;justify-content:space-between;align-items:baseline">Statistics
        <label style="font-weight:normal;font-size:10px;color:#8a8678;cursor:var(--cursor-point, pointer)"
          title="List every stat this tab organizes, invested or not; generated families still surface only once touched">
          <input type="checkbox" data-statshowall${this.charShowAll ? ' checked' : ''}
            style="width:10px;height:10px;margin:0 3px 0 0;vertical-align:-1px;accent-color:var(--gold)">show unused</label></h3>
      <div style="border-bottom:1px solid var(--panel-border);margin-bottom:6px;padding-bottom:3px">${vitalRows}</div>
      ${tabStrip}
      <div style="font-size:10px;color:#8a8678;margin:2px 0 5px">${esc(active?.def.blurb ?? '')}</div>
      ${statRows}${tabNotes}
      <div style="margin-top:8px;color:#8a8678;font-size:10px">
        Tag-scaled stats (damage, speed) shown without skill context; each skill
        applies its own tags, level, and socketed supports on use.
      </div>`;
    // Unchanged since the last write? Keep the standing DOM (and its wiring).
    if (!this.setPanelHtml(this.charSheet, html)) return;
    this.charSheet.scrollTop = prevScroll;
    this.charSheet.querySelectorAll<HTMLButtonElement>('button[data-reacquire]').forEach(btn =>
      btn.addEventListener('click', () => {
        world.requestMeta({ t: 'reacquireSkill', skillId: btn.dataset.reacquire! });
        this.refreshCharSheet();
      }));
    this.charSheet.querySelectorAll<HTMLButtonElement>('button[data-stattab]').forEach(btn =>
      btn.addEventListener('click', () => {
        this.charTab = btn.dataset.stattab!;
        this.refreshCharSheet();
      }));
    this.charSheet.querySelector<HTMLInputElement>('input[data-statshowall]')?.addEventListener('change', e => {
      this.charShowAll = (e.target as HTMLInputElement).checked;
      this.refreshCharSheet();
    });
  }

  // --------------------------------------------------------------- inventory

  /** Rarity chip for a gem instance (the book + the inventory tabs share it). */
  private rarityTagHtml(inst: SkillInstance): string {
    const r = SKILL_RARITIES[inst.rarity ?? 'common'];
    return `<span style="color:${r.color};font-size:10px;font-weight:bold">${r.label}</span>
      <span style="color:#8a8678;font-size:10px">· ${inst.sockets.length} socket${inst.sockets.length > 1 ? 's' : ''}</span>`;
  }

  toggleInventory(seatId?: string): void {
    const seat = this.couchSeatFor(seatId);
    // Open for ANOTHER local seat → take ownership (the couch contention rule).
    if (this.inventoryOpen && this.panelSeat(this.inventory) !== seat) {
      this.ownPanel(this.inventory, seat);
      this.refreshInventory();
      return;
    }
    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) this.ownPanel(this.inventory, seat);
    // (The lesson's old hand on the Skill Gems tab retired with the tab —
    // the gift flasks glow as BAG TILES now, on the one face, and the
    // SKILLS flap + empty rack seats carry the gesture the rest of the way.)
    this.inventory.classList.toggle('hidden', !this.inventoryOpen);
    if (this.inventoryOpen) this.refreshInventory();
    else { dndCancel(); hideTooltip(); } // a ghost never outlives its surface
  }

  /** THE OBSTRUCTION CENSUS — the CSS-pixel rects of every open DOM pane
   *  standing over the canvas, read live each frame by the speech fabric's
   *  PLACEMENT LAW (renderer.uiObstructions → vis/speech.ts dodgeSpeechBox)
   *  so a talk bubble slides out from under an open inventory instead of
   *  being silently swallowed. The roster is the panelClosers ledger's own
   *  roots plus the popped-out SKILLS drawer (which overflows its root's
   *  box, so it wears its own data-build-drawer hook); couch-flanked panels
   *  measure wherever they dock, by construction. A hidden pane measures
   *  zero and drops out — no state, no bookkeeping. */
  obstructionRects(): { x: number; y: number; w: number; h: number }[] {
    const out: { x: number; y: number; w: number; h: number }[] = [];
    const add = (el: Element | null): void => {
      if (!el || el.classList.contains('hidden')) return;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return; // closed panes measure zero
      out.push({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    for (const el of [this.charSheet, this.inventory, this.passiveTree,
      this.worldMap, this.vendorMenu, this.salvageMenu, this.fontMenu,
      this.recallMenu, this.oracleMenu, this.bestiaryMenu, this.boroughMenu,
      this.bountyMenu, this.caravanMenu, this.sailMenu, this.holdMenu, this.mercMenu,
      this.vocationMenu, this.escapeMenu]) add(el);
    add(document.querySelector('[data-build-drawer]'));
    return out;
  }

  /** An item anywhere on a LOCAL seat — bag or doll (tooltips serve both).
   *  Seat-explicit for the couch lens; item uids are globally unique, so a
   *  wrong-seat miss is a null, never a mistaken identity. */
  private findItem(uid: number, seat: Seat = this.getWorld().localSeat): ItemInstance | undefined {
    const w = this.getWorld();
    const m = seat.meta;
    return m.items.find(i => i.uid === uid)
      ?? Object.values(m.equipped).find(i => i?.uid === uid)
      // The counters' shelves: shelf gear (Memory pouches included) carries
      // the same rich tooltip (and the on-swap comparison against what you
      // wear) BEFORE you buy it — every counter's stock, one law.
      ?? [...w.vendorStock, ...w.chandlerStock, ...w.descentStock]
        .flatMap(e => (e.kind === 'item' ? [e.item] : [])).find(i => i.uid === uid);
  }

  /** The candidate slots an UNWORN item could swap into that hold something
   *  today — the comparison targets. Worn items (and empty targets) compare
   *  against nothing: the plain card already reads as the whole story. */
  private compareTargets(item: ItemInstance, seat: Seat = this.getWorld().localSeat): { label: string; worn: ItemInstance }[] {
    const m = seat.meta;
    if (Object.values(m.equipped).some(i => i?.uid === item.uid)) return [];
    const base = ITEM_BASES[item.baseId];
    if (!base) return [];
    return slotsForCategory(base.category)
      .filter(s => m.equipped[s.id])
      .map(s => ({ label: s.label, worn: m.equipped[s.id]! }));
  }

  /** EXTENDED-HOVER comparison block: the hovered piece vs whatever fills
   *  each slot it could take (both rings, when both are worn). Rows derive
   *  from compareItemMods — the stat sheet's own folding — never from
   *  re-parsing tooltip text. */
  private compareHtml(item: ItemInstance, seat: Seat = this.getWorld().localSeat): string | null {
    const targets = this.compareTargets(item, seat);
    if (!targets.length) return null;
    const row = (r: ModCompareRow): string => {
      switch (r.kind) {
        case 'gain': return `<div style="color:#7ec8a0;font-size:10px">+ ${r.text}</div>`;
        case 'loss': return `<div style="color:#d05050;font-size:10px">− ${r.text}</div>`;
        case 'same': return `<div style="color:#7a7688;font-size:10px">= ${r.text}</div>`;
        case 'delta': {
          const up = (r.delta ?? 0) > 0;
          return `<div style="color:${up ? '#a8d8b8' : '#d8a8a8'};font-size:10px">${r.text}
            <span style="color:${up ? '#7ec8a0' : '#d05050'};font-size:9px;font-weight:bold">${r.deltaText}</span></div>`;
        }
      }
    };
    const sections = targets.map(t => {
      const rows = compareItemMods(item, t.worn);
      return `<div style="color:#9a94a8;font-size:10px;margin-top:4px">vs ${t.label}:
          <span style="color:${ITEM_RARITIES[t.worn.rarity].color}">${t.worn.name}</span></div>
        ${rows.map(row).join('') || '<div style="color:#7a7688;font-size:10px">grants exactly the same lines</div>'}`;
    }).join('');
    return `<div style="border-top:1px dashed #4a4458;margin-top:6px;padding-top:3px">
      <div style="color:#c8a84b;font-size:9px;letter-spacing:1.2px">ON SWAP
        <span style="color:#6a6478;letter-spacing:0"> · green gained · red lost · = unchanged</span></div>
      ${sections}</div>`;
  }

  /** Rich item card — every line derives live from the instance's rolls, so
   *  a data retune re-prices the tooltip the same instant it re-prices play.
   *  DWELLING (extended hover) grows the card with the ON-SWAP comparison.
   *  `salv` (the armed salvage lane, passed by the INVENTORY binder only):
   *  the hover overlay leads with what the hammer would pay — or the wheel,
   *  on the sell lane — or why the tool refuses (locked / worn). The
   *  keeper's-mark line shows in EVERY mode. */
  private itemTooltip(uid: number, extended?: boolean, seat: Seat = this.getWorld().localSeat, salv: 'break' | 'sell' | null = null): TooltipContent | null {
    const item = this.findItem(uid, seat);
    if (!item) return null;
    // THE RESIDENCE (M1): a gem wrapper's card speaks the gem, not the steel.
    if (item.gem) return this.gemItemTooltip(item, seat, salv);
    // THE STONE (M2): the pouch's card speaks the composition.
    if (item.mem) return this.memTooltip(item);
    const d = describeItem(item);
    const lines: string[] = [`<div style="color:#9a94a8;font-size:10px">${d.baseLine}</div>`];
    if (item.locked) {
      lines.unshift('<div style="color:#c8a84b">🔒 Locked — salvage refuses it, sweeps skip it (right-click to unlock)</div>');
    } else if (salv) {
      const breakLine = seat.meta.items.some(i => i.uid === item.uid)
        ? `<div style="color:#e8c87a;font-weight:bold">${salv === 'sell'
          ? `⚙ Click to sell for ${this.essCostText(sellItemYield(item))}`
          : `⚒ Click to break into ${this.essCostText(salvageItemYield(item))}`}</div>`
        : Object.values(seat.meta.equipped).some(i => i?.uid === item.uid)
          ? `<div style="color:#8a8678">${salv === 'sell'
            ? '⚙ Worn — take it off before the wheel can touch it'
            : '⚒ Worn — take it off before the hammer can touch it'}</div>`
          : ''; // a counter's ware — neither tool has a claim on it
      if (breakLine) lines.unshift(breakLine);
    }
    // Item-own defenses; locally-augmented values tint affix-blue (the same
    // "modified" language PoE speaks — base-white vs touched-blue).
    for (const s of d.defense) lines.push(`<div style="color:${s.augmented ? '#8fa3e8' : '#e0d8c8'}">${s.text}</div>`);
    for (const s of d.implicit) lines.push(`<div style="color:#b8a8e0">${s}</div>`);
    for (const a of d.affix) {
      lines.push(`<div style="color:#8fa3e8">${a.text}
        <span style="color:${a.tag === 'EX' ? '#7a9ae8' : '#5a5668'};font-size:9px;font-weight:bold">${a.tag}</span></div>`);
    }
    for (const s of d.unique) lines.push(`<div style="color:#e8a878">${s}</div>`);
    if (d.sockets) {
      for (const s of d.sockets) {
        lines.push(`<div><span style="color:${s.color}">${s.glyph}</span>
          <span style="color:#9a94a8;font-size:10px">${s.line}</span></div>`);
      }
    }
    if (d.epitaph) {
      lines.push(`<div style="color:#ffd700;font-weight:bold;margin-top:4px;letter-spacing:1px">✦ ${d.epitaph.name}</div>`);
      for (const s of d.epitaph.lines) lines.push(`<div style="color:#ffe9a8">${s}</div>`);
      if (d.epitaph.flavor) lines.push(`<div style="color:#8a7a5a;font-style:italic">${d.epitaph.flavor}</div>`);
    }
    if (d.flavor) lines.push(`<div style="color:#8a7a5a;font-style:italic;margin-top:4px">${d.flavor}</div>`);
    // Extended dwell: grow with the ON-SWAP comparison; the compact card
    // advertises the dwell whenever a comparison exists to grow into.
    let compareHint = '';
    if (extended) {
      const cmp = this.compareHtml(item, seat);
      if (cmp) lines.push(cmp);
    } else if (this.compareTargets(item, seat).length) {
      compareHint = ' · <span style="color:#c8a84b">hold to compare</span>';
    }
    return {
      title: `<span style="color:${d.color}">${d.epitaph ? `${d.epitaph.name}: ` : ''}${d.title}</span>`,
      description: lines.join(''),
      meta: `${d.reqLine} · ${ITEM_RARITIES[item.rarity].label}${compareHint}`,
    };
  }

  /** THE POUCH CARD (skill-items M2/M3, §3b): precision only — kind, total,
   *  the composition's top groups, newest marked; the gesture hints. Serves
   *  both pouch kinds off MEMORY_KINDS (the Preformed card names its facet
   *  law — skills only, the choice interposes at the recall). */
  private memTooltip(item: ItemInstance): TooltipContent | null {
    const units = item.mem!;
    const kind = memoryKindOf(item) ?? 'rough';
    const k = MEMORY_KINDS[kind];
    const groups = memoryGroups(units);
    const dropperName = (d: string): string =>
      MONSTERS[d]?.name ?? (d === MEMORY_TRADED_PROVENANCE ? MEMORY_CFG.strings.tradedName : d);
    const lines: string[] = [];
    if (item.locked) {
      lines.push('<div style="color:#c8a84b">🔒 Locked — sweeps skip it (right-click to unlock)</div>');
    }
    lines.push(`<div style="color:#9a94a8;font-size:10px">${k.name} · <span style="color:${k.color}">×${units.length} held</span></div>`);
    if (k.facets) {
      lines.push('<div style="color:#c8bce0;font-size:10px">committed before the recall: choose a FACET (one attribute triad) — the grant is a skill of that facet</div>');
    }
    const top = groups.slice(0, MEMORY_CFG.tooltipGroups);
    for (const g of top) {
      lines.push(`<div style="color:#c8bce0;font-size:10px">×${g.count} — ${dropperName(g.d)}</div>`);
    }
    if (groups.length > top.length) {
      const rest = groups.length - top.length;
      lines.push(`<div style="color:#5a5668;font-size:10px">…and ${rest} other ${rest === 1 ? 'kind' : 'kinds'}</div>`);
    }
    lines.push(`<div style="color:#8a8678;font-size:10px">newest: ${dropperName(units[units.length - 1].d)}</div>`);
    lines.push('<div style="color:#c8a84b;font-size:10px;margin-top:3px">double-click to open the Recall · shift-click drops the stack whole</div>');
    return {
      title: `<span style="color:${k.color}">${k.name}</span>`,
      description: lines.join(''),
      meta: `×${units.length} · each unit sealed at its drop`,
    };
  }

  /** THE COUNTER GEM CARD (skill-items M3 — the one shelf's 1×1 gem tiles):
   *  the LIVE stock entry's card, resolved by "<vendorId>:<idx>" at hover
   *  time — kind label per walk-1, rarity/level/tags, the price, and the
   *  reserve/lock state. The glass tile is too small to speak; this card
   *  is its voice (the old gem-tab list rows retired with the fold). */
  private vendorGemTooltip(key: string): TooltipContent | null {
    const [vid, idxs] = key.split(':');
    const v = VENDORS.find(x => x.id === vid);
    if (!v) return null;
    const world = this.getWorld();
    const stock = v.stock(world);
    const e = stock[Number(idxs)];
    if (!e || e.kind === 'item') return null;
    const price = v.priceOf(world, e);
    const priceHtml = (price.essences ?? []).map(c => this.essCostText(c)).join(' + ');
    const heldRow = v.holds?.locks ? world.vendorEntryHold(world.vendorHoldKey(v), e) : undefined;
    const entryLock = v.entryLock?.(world, e) ?? null;
    const lines: string[] = [];
    if (e.kind === 'skill') {
      const r = SKILL_RARITIES[e.inst.rarity ?? 'common'];
      lines.push(`<div style="color:#9a94a8;font-size:10px">Skill Memory · <span style="color:${r.color}">${r.label}</span> · Lv ${e.inst.level} · ${'◆'.repeat(r.sockets)}</div>`);
      lines.push(`<div style="color:#8a8678;font-size:10px">${e.inst.def.tags.join(' · ')}</div>`);
    } else {
      lines.push(`<div style="color:#9a94a8;font-size:10px">Support Memory · Lv ${e.gem.level}</div>`);
    }
    if (heldRow) {
      lines.push(`<div style="color:#7fe0d8;font-size:10px">${heldRow.commission ? 'the standing order\'s find — reserved for you' : 'reserved — rides every restock until bought or released'}</div>`);
    }
    if (entryLock) lines.push(`<div style="color:#8a8678;font-size:10px">🔒 ${esc(entryLock)}</div>`);
    lines.push(`<div style="color:#e8c87a;font-size:10px;margin-top:3px">click to buy — ${priceHtml}</div>`);
    const name = e.kind === 'skill' ? e.inst.def.name : e.gem.def.name;
    const col = e.kind === 'skill' ? SKILL_RARITIES[e.inst.rarity ?? 'common'].color : e.gem.def.color;
    return {
      title: `<span style="color:${col}">${name}</span>`,
      description: lines.join(''),
      meta: e.kind === 'skill' ? 'skill' : 'support',
    };
  }

  /** THE MEMORY CARD (skill-items M1): the gem wrapper's tooltip — kind
   *  label per walk-1 ("Skill Memory"/"Support Memory"), the gem's own
   *  rarity/level/sockets/requirements, the armed salvage lane's price, and
   *  the gesture hints. Every line derives live from the payload + defs. */
  private gemItemTooltip(item: ItemInstance, seat: Seat, salv: 'break' | 'sell' | null): TooltipContent | null {
    const world = this.getWorld();
    const m = seat.meta;
    const lines: string[] = [];
    const inBag = m.items.some(i => i.uid === item.uid);
    if (item.locked) {
      lines.push('<div style="color:#c8a84b">🔒 Locked — salvage refuses it, sweeps skip it (right-click to unlock)</div>');
    }
    const sp = skillGemPayloadOf(item);
    if (sp) {
      const def = SKILLS[sp.skillId];
      if (!def) return null;
      const r = SKILL_RARITIES[sp.rarity];
      if (!item.locked && salv && inBag) {
        const inst = skillOfGemItem(item);
        const y = inst ? (salv === 'sell' ? sellSkillYield(inst) : salvageSkillYield(inst)) : null;
        lines.unshift(`<div style="color:#e8c87a;font-weight:bold">${salv === 'sell' ? '⚙' : '⚒'} ${y
          ? `Click to ${salv === 'sell' ? 'sell for' : 'break into'} ${this.essCostText(y)}`
          : `the granted spark ${salv === 'sell' ? 'sells for' : 'breaks into'} NOTHING — a click still deletes it`}</div>`);
      }
      lines.push(`<div style="color:#9a94a8;font-size:10px">Skill Memory · <span style="color:${r.color};font-weight:bold">${r.label}</span> · ${sp.sockets.length} socket${sp.sockets.length === 1 ? '' : 's'}${sp.granted ? ' · <span style="color:#8a8678">granted</span>' : ''}</div>`);
      lines.push(`<div style="color:#8a8678;font-size:10px">${def.tags.join(' · ')}</div>`);
      lines.push(`<div>${def.description}</div>`);
      const socketed = sp.sockets.filter((s): s is NonNullable<typeof s> => !!s);
      if (socketed.length) {
        lines.push(`<div style="color:#b8a2e8;font-size:10px">Socketed: ${socketed
          .map(s => `${SUPPORTS[s.supportId]?.name ?? s.supportId} L${s.level}`).join(' · ')}</div>`);
      }
      const reqText = def.requirements
        ? Object.entries(def.requirements).map(([a, n]) => {
            const met = (m.attrs[a as AttributeId] ?? 0) >= (n ?? 0);
            return `<span style="color:${met ? '#6fc06f' : '#d05050'}">${ATTRIBUTES[a as AttributeId].short} ${n}</span>`;
          }).join(', ')
        : 'none';
      lines.push(`<div style="color:#9a94a8;font-size:10px">Requires: ${reqText}</div>`);
      if (inBag && !salv) {
        const dupe = m.knownSkills.has(sp.skillId);
        lines.push(`<div style="color:#c8a84b;font-size:10px;margin-top:3px">${dupe
          ? 'already learned — fodder for the Font, or a trade'
          : 'drag onto a rack seat (SKILLS flap) to learn · double-click = first free seat'}</div>`);
      }
      return {
        title: `<span style="color:${r.color}">${def.name}</span> <span style="color:#ffd700;font-size:11px">Lv ${sp.level}</span>`,
        description: lines.join(''),
        meta: `Skill Memory · ${r.label}`,
      };
    }
    const gp = supportGemPayloadOf(item);
    if (!gp) return null;
    const def = SUPPORTS[gp.supportId];
    if (!def) return null;
    if (!item.locked && salv && inBag) {
      const gem = supportOfGemItem(item);
      const y = gem ? (salv === 'sell' ? sellSupportYield(gem) : salvageSupportYield(gem)) : null;
      if (y) {
        lines.unshift(`<div style="color:#e8c87a;font-weight:bold">${salv === 'sell' ? '⚙' : '⚒'} Click to ${salv === 'sell' ? 'sell for' : 'break into'} ${this.essCostText(y)}</div>`);
      }
    }
    lines.push('<div style="color:#9a94a8;font-size:10px">Support Memory</div>');
    lines.push(`<div>${def.description}</div>`);
    if (inBag && !salv) {
      const hosts = [...m.knownSkills.values()]
        .filter(inst => inst.sockets.includes(null)
          && supportFitsInstOrCrew(def, inst, world.summonCrewSkills(inst)))
        .map(inst => inst.def.name);
      lines.push(`<div style="color:#c8a84b;font-size:10px;margin-top:3px">${hosts.length
        ? `drag onto a skill in the SKILLS flap to socket it — fits: ${hosts.join(', ')}`
        : 'no learned skill has a free, fitting socket right now'}</div>`);
    }
    return {
      title: `<span style="color:${def.color}">${def.name}</span> <span style="color:#ffd700;font-size:11px">Lv ${gp.level}</span>`,
      description: lines.join(''),
      meta: 'Support Memory',
    };
  }

  /** Vestige card — the per-category grant table derives LIVE from the def,
   *  so every copy reads identically and retunes never stale. */
  private vestigeTooltip(id: string): TooltipContent | null {
    const v = VESTIGES[id];
    if (!v) return null;
    const rows = Object.entries(v.effects).map(([cat, lines]) =>
      `<div><span style="color:#9a94a8;font-size:10px;text-transform:capitalize">${cat === 'default' ? 'elsewhere' : cat}:</span>
        ${(lines ?? []).map(ln => formatModLine(ln, ln.value)).join(' · ')}</div>`).join('');
    return {
      title: `<span style="color:${v.color}">${v.glyph} ${v.name}</span>`,
      description: rows,
      meta: 'Drag onto a socket: consumed on inlay; overwriting destroys the old vestige. Exact sequences on WHITE gear awaken Epitaphs.',
    };
  }

  refreshInventory(): void {
    if (!this.inventoryOpen) return;
    // (No mid-drag freeze: the fabric's gestures ride data attributes that
    // survive innerHTML rebuilds — a re-render mid-carry re-earns its marks
    // on the next beat. The old native drag needed the world to hold still.)
    const world = this.getWorld();
    const invSeat = this.panelSeat(this.inventory);
    const m = invSeat.meta;
    const CELL = 34;
    const W = ITEM_CFG.inventory.w;
    const H = ITEM_CFG.inventory.h;
    // THE SALVAGE BASELINE: while a salvage host is armed for THIS panel's
    // seat — the bench's hammer (break) or a counter's scrap wheel (sell) —
    // bag tiles trade their lift for the lane's click, gem rows become its
    // surfaces, and the mode's cursor marks the whole face. The doll keeps
    // its full gestures — unequipping mid-salvage is the intended flow.
    const salv = this.salvageLaneFor(this.inventory);
    const breaking = salv !== null;
    // THE KEEPER'S MARK: the 🔒 pip every locked thing wears, both modes.
    const lockPip = (locked: boolean | undefined): string => locked
      ? `<span style="position:absolute;top:0;right:1px;font-size:9px;line-height:10px;text-shadow:0 0 3px #000"
          title="Locked: salvage refuses it, sweeps skip it (right-click to unlock)">🔒</span>`
      : '';

    // --- THE DOLL: the equipped figure as a BODY (the true-RPG read) -------
    // Seats come from DOLL_SEATS (presentation data in the bag's own CELL
    // units — helmet crowning the chest, belt/legs/boots descending the
    // spine, amulet at the neck, rings above the gloves on the flank);
    // every ENABLED slot without a seat falls to the SPARE STRIP below the
    // figure (the never-invisible law — a future slot ships first, earns
    // its place on the body second). An empty seat wears its category's
    // GHOST GLYPH as the backdrop — what goes where, readable at a glance —
    // and every seat keeps the full fabric dress: drop target (the glow
    // affordances ride data-drop untouched), worn chips as drag sources,
    // item tooltips, socket pips as vestige drop targets.
    const dollSlots = EQUIP_SLOTS.filter(s => s.enabled);
    const dollSeatHtml = (slot: EquipSlotDef, seat: { x: number; y: number; w: number; h: number }): string => {
      const worn = m.equipped[slot.id];
      const border = worn ? ITEM_RARITIES[worn.rarity].color : '#3a3644';
      const small = Math.min(seat.w, seat.h) < 1.5;
      const pips = worn?.sockets?.length ? `<span style="position:absolute;bottom:1px;left:0;right:0;text-align:center;font-size:11px;line-height:12px">${worn.sockets.map((vid, si) => {
        const v = vid ? VESTIGES[vid] : null;
        return `<span data-sock="${worn.uid}:${si}" data-drop="sock:${worn.uid}:${si}" title="${v ? v.name : 'Empty socket: drop a vestige here'}"
          style="color:${v?.color ?? '#5a5668'};padding:0 2px;cursor:var(--cursor-copy, copy)">${v?.glyph ?? '◇'}</span>`;
      }).join('')}</span>` : '';
      const wornGlyph = worn ? CATEGORY_GLYPHS[ITEM_BASES[worn.baseId]?.category ?? slot.accepts[0]] ?? '?' : '';
      const face = worn
        ? `<span style="font-size:${small ? 14 : 21}px;line-height:1">${wornGlyph}</span>${lockPip(worn.locked)}${pips}`
        : `<span style="opacity:0.22;font-size:${small ? 14 : 22}px;line-height:1">${CATEGORY_GLYPHS[slot.accepts[0]] ?? '?'}</span>
           ${small ? '' : `<span style="position:absolute;bottom:2px;left:0;right:0;font-size:7px;letter-spacing:0.5px;color:#4a4656;text-align:center">${slot.label.toUpperCase()}</span>`}`;
      return `<button data-doll="${slot.id}" data-drop="equipSlot:${slot.id}"
        ${worn ? `data-drag="gearItem:${worn.uid}" data-lock-uid="${worn.uid}" data-tip="item" data-item-uid="${worn.uid}"` : `title="${slot.label}"`}
        style="position:absolute;left:${seat.x * CELL}px;top:${seat.y * CELL}px;
        width:${seat.w * CELL - 2}px;height:${seat.h * CELL - 2}px;box-sizing:border-box;padding:0;
        display:flex;align-items:center;justify-content:center;
        background:${worn ? '#221e2c' : '#171420'};border:${worn ? 2 : 1}px solid ${border};border-radius:4px;cursor:var(--cursor-point, pointer);
        ${worn?.rarity === 'unique' ? `box-shadow:0 0 10px ${border};` : ''}">${face}</button>`;
    };
    const seatedSlots = dollSlots.filter(s => DOLL_SEATS[s.id]);
    const spareSlots = dollSlots.filter(s => !DOLL_SEATS[s.id]);
    // Width AND height derive from the seats actually shown; the faint body
    // paints FIRST so every seat, glow and pip stacks above it.
    const dollRows = dollRowsFor(seatedSlots);
    const dollCols = dollColsFor(seatedSlots);
    const dollW = Math.ceil(dollCols * CELL);
    const figure = `<div style="position:relative;width:${dollW}px;height:${Math.ceil(dollRows * CELL)}px">
      ${dollSilhouetteSvg(CELL, dollCols, dollRows)}
      ${seatedSlots.map(s => dollSeatHtml(s, DOLL_SEATS[s.id])).join('')}</div>`;
    // The spare strip: seatless-but-enabled slots keep the old list rows.
    const spare = spareSlots.map(slot => {
      const worn = m.equipped[slot.id];
      const border = worn ? ITEM_RARITIES[worn.rarity].color : '#3a3644';
      const label = worn
        ? `<span style="color:${ITEM_RARITIES[worn.rarity].color}">${worn.name}</span>`
        : `<span style="color:#5a5668">${slot.label}</span>`;
      return `<button data-doll="${slot.id}" data-drop="equipSlot:${slot.id}"
        ${worn ? `data-drag="gearItem:${worn.uid}" data-lock-uid="${worn.uid}" data-tip="item" data-item-uid="${worn.uid}"` : ''}
        style="display:block;width:${dollW}px;margin:3px 0;padding:6px 8px;text-align:left;font-size:10px;
        background:#1a1722;border:1px solid ${border};border-radius:4px;cursor:var(--cursor-point, pointer)">${worn?.locked ? '🔒 ' : ''}${label}</button>`;
    }).join('');
    const doll = figure + spare;

    // --- the bag: cells (drop targets) under absolutely-positioned tiles ---
    // A cell is where a carried piece's ORIGIN lands; the fabric lights the
    // cells a fit is legal on, so the anchor rule teaches itself.
    let cells = '';
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        cells += `<div data-cell="${x}:${y}" data-drop="bagCell:${x}:${y}" style="position:absolute;left:${x * CELL}px;top:${y * CELL}px;
          width:${CELL - 2}px;height:${CELL - 2}px;background:#16131d;border:1px solid #2a2634"></div>`;
      }
    }
    // Socket pips: each socket renders as a PRECISE drop target pip on its
    // tile — filled shows the vestige's glyph in its color, empty shows ◇.
    const pipRow = (i: ItemInstance): string => {
      if (!i.sockets?.length) return '';
      return `<div style="position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:12px;line-height:13px">
        ${i.sockets.map((vid, si) => {
          const v = vid ? VESTIGES[vid] : null;
          return `<span data-sock="${i.uid}:${si}" data-drop="sock:${i.uid}:${si}" title="${v ? v.name : 'Empty socket: drop a vestige here'}"
            style="color:${v?.color ?? '#5a5668'};padding:0 2px;cursor:var(--cursor-copy, copy)">${v?.glyph ?? '◇'}</span>`;
        }).join('')}
      </div>`;
    };
    // Tiles: drag sources AND drop targets (another piece swaps; a vestige
    // inlays forgivingly). The fabric's .dnd-src mark dims a lifted tile.
    // Under an armed lane a tile trades its lift for the lane's click
    // (data-salv-uid) — locked tiles keep still and say why.
    // GEM WRAPPERS (THE RESIDENCE, M1) draw THE ICON LAW's face — the
    // skill's hotbar swatch + initials at 1×1, bordered in the gem's own
    // ladder color — and glow with Mireille's lesson while a gift flask
    // waits unseated (the per-item bag glow; the tab glow died with the tab).
    const lessonSkills = world.mireilleGiftLesson() === 'learn' ? world.mireilleLessonSkills() : [];
    // THE REVEAL's found-flash (skill-items M2): a freshly-recalled gem's
    // tile announces itself for a beat; stale marks prune themselves here.
    const flashOf = (uid: number): string => {
      const until = this.memFlash.get(uid);
      if (!until) return '';
      if (Date.now() > until) { this.memFlash.delete(uid); return ''; }
      return ' memflash';
    };
    const tiles = m.items.map(i => {
      if (i.x === undefined || i.y === undefined) return '';
      const s = itemGridSize(i);
      const verb = breaking
        ? `data-salv-uid="${i.uid}"`
        : `data-drag="gearItem:${i.uid}"`;
      // THE STONE (M2/M3, §3b): the pouch tile — one fixed face in its
      // KIND's color and glyph (no rarity border: units carry no rarity
      // until recalled), the count badge wearing the total. Double-click
      // opens THE RECALL; the salvage lane never touches it (the engine
      // refuses too).
      if (i.mem) {
        const mk = MEMORY_KINDS[memoryKindOf(i) ?? 'rough'];
        return `<div data-tip="item" data-item-uid="${i.uid}" data-bag-item="1" data-lock-uid="${i.uid}"
          ${breaking ? '' : `data-drag="gearItem:${i.uid}"`} data-drop="gearTile:${i.uid}"
          style="position:absolute;left:${i.x * CELL}px;top:${i.y * CELL}px;
          width:${s.w * CELL - 2}px;height:${s.h * CELL - 2}px;background:#1c1626;
          border:2px solid ${mk.color};border-radius:3px;cursor:var(--cursor-point, pointer);box-sizing:border-box;
          display:flex;align-items:center;justify-content:center">
          <span style="width:22px;height:22px;border-radius:4px;background:${mk.color}22;border:1px solid ${mk.color};
            display:flex;align-items:center;justify-content:center;font-size:11px;color:${mk.color}">${mk.glyph}</span>
          <span style="position:absolute;bottom:-1px;right:0;font-size:9px;line-height:10px;padding:0 2px;
            background:#241d2e;border:1px solid ${mk.color};border-radius:3px;color:#e8e0f8">${i.mem.length}</span>
          ${lockPip(i.locked)}</div>`;
      }
      if (i.gem) {
        const color = gemTileColorOf(i);
        const sp = skillGemPayloadOf(i);
        const gp = supportGemPayloadOf(i);
        const teach = !!sp && lessonSkills.includes(sp.skillId);
        // The loose support's level-up: the same Ability-Essence feed the
        // drawer serves socketed gems, as a corner pip (inner control — the
        // fabric never lifts through it).
        const gd = gp ? SUPPORTS[gp.supportId] : null;
        const cost = gd ? supportLevelAbilityCost(gp!.level + 1) : null;
        const canLvl = !!(gd && gp && !breaking && gp.level < supportMaxLevel(gd)
          && this.getWorld().canAffordAbilityEssence(this.panelSeat(this.inventory), cost!));
        const lvlBtn = canLvl
          ? `<button data-gemlvl-inv="${i.uid}" title="Level up for ${cost!.count}× ${abilityEssenceOfTier(cost!.tier).label}"
              style="position:absolute;bottom:-1px;right:0;font-size:9px;line-height:10px;padding:0 2px;
              background:#241d2e;border:1px solid #4a3a5a;border-radius:3px;color:#c8a8ff;cursor:var(--cursor-point, pointer)">+</button>`
          : '';
        return `<div data-tip="item" data-item-uid="${i.uid}" data-bag-item="1" data-lock-uid="${i.uid}"
          ${verb} data-drop="gearTile:${i.uid}" ${sp ? `data-gem-skill="${i.uid}"` : ''}
          class="${teach ? 'tut-glow' : ''}${flashOf(i.uid)}"
          style="position:absolute;left:${i.x * CELL}px;top:${i.y * CELL}px;
          width:${s.w * CELL - 2}px;height:${s.h * CELL - 2}px;background:#1c1626;
          border:2px solid ${color};border-radius:3px;cursor:${breaking ? 'inherit' : 'var(--cursor-point, pointer)'};box-sizing:border-box;
          display:flex;align-items:center;justify-content:center;
          ${sp?.rarity === 'legendary' ? `box-shadow:0 0 10px ${color};` : ''}">${gemTileFaceHtml(i)}${lockPip(i.locked)}${lvlBtn}</div>`;
      }
      const r = ITEM_RARITIES[i.rarity];
      const cat = ITEM_BASES[i.baseId]?.category ?? 'ring';
      return `<div data-tip="item" data-item-uid="${i.uid}" data-bag-item="1" data-lock-uid="${i.uid}"
        ${verb} data-drop="gearTile:${i.uid}"
        style="position:absolute;left:${i.x * CELL}px;top:${i.y * CELL}px;
        width:${s.w * CELL - 2}px;height:${s.h * CELL - 2}px;background:#221e2c;
        border:2px solid ${r.color};border-radius:3px;cursor:${breaking ? 'inherit' : 'var(--cursor-point, pointer)'};box-sizing:border-box;
        display:flex;align-items:center;justify-content:center;font-size:${Math.min(s.w, s.h) > 1 ? 16 : 12}px;
        ${i.rarity === 'unique' ? `box-shadow:0 0 10px ${r.color};` : ''}">${CATEGORY_GLYPHS[cat] ?? '?'}${lockPip(i.locked)}${pipRow(i)}</div>`;
    }).join('');

    // The SATCHEL: a little pouch flap on the panel's edge holding the
    // essence wallet — click to flip it open/closed.
    const satchel = `
      <button data-satchel style="position:absolute;top:10px;right:${SATCHEL_RIGHT_PX}px;font-size:11px;
        background:#241d2e;border:1px solid #4a3a5a;border-radius:6px 6px 2px 2px;padding:3px 9px;cursor:var(--cursor-point, pointer)"
        title="Essence satchel (salvage currency, dies with you)">🎒 ${this.satchelOpen ? '▾' : '▸'}</button>
      ${this.satchelOpen ? `
        <div style="position:absolute;top:38px;right:${SATCHEL_RIGHT_PX}px;z-index:3;background:#1b1524;
          border:1px solid #4a3a5a;border-radius:6px 2px 6px 6px;padding:8px 12px;box-shadow:0 3px 14px rgba(0,0,0,0.6)">
          ${ESSENCE_IDS.map(id => {
            const e = ESSENCES[id];
            const n = this.getWorld().meta.essences[id] ?? 0;
            return `<div style="font-size:11px;color:${e.color};margin:2px 0" title="${e.label}">${e.glyph} ${n} <span style="color:#6a6478;font-size:9px">${e.label.replace(' Essence', '')}</span></div>`;
          }).join('')}
          ${(() => {
            // VESTIGES ride the satchel too — stackable socket material.
            // Drag one onto a socket pip to inlay it (consumed on use).
            const owned = VESTIGE_LIST.filter(v => (this.getWorld().meta.vestiges[v.id] ?? 0) > 0);
            if (!owned.length) return '';
            return `<div style="border-top:1px dashed #4a3a5a;margin-top:6px;padding-top:5px">
              ${owned.map(v => {
                const n = this.getWorld().meta.vestiges[v.id];
                return `<div data-drag="vestige:${v.id}" data-tip="vestige" data-vestige-id="${v.id}"
                  style="font-size:11px;color:${v.color};margin:2px 0;cursor:var(--cursor-grab, grab)">${v.glyph} ${n}
                  <span style="color:#6a6478;font-size:9px">${v.name.split(',')[0]}</span></div>`;
              }).join('')}
              <div style="color:#5a5668;font-size:8px;margin-top:3px">drag (or click to lift) a vestige,
                then a socket ◇ (a socketed item takes it in its first empty slot)</div>
            </div>`;
          })()}
        </div>` : ''}`;
    const pickupHint = this.getSettings().gearPickup === 'key'
      ? `[${keyDisplay(this.getSettings().keybinds.pickup)}] grabs nearby gear`
      : 'walk over gear to collect it';
    // THE BUILD DRAWER: the whole Skill Book, docked. A handle rides the
    // panel's left edge; the drawer POPS OUT beside the panel (absolute —
    // the gear layout never shifts an inch) with the full learned-skills
    // management view. State persists like the satchel's.
    const wf = this.getWorld().nearFont();
    // MIREILLE'S LESSON, read from its one source of truth (the world):
    // while the one 'learn' step pends the carried flask BAG TILES glow
    // (the per-item glow above), the flap handle glows while the drawer is
    // CLOSED, then the rack's empty seats inside take over (learnedListHtml's
    // teachSeat) — one mechanism, three surfaces, each live off the same
    // read every render. The glow always marks the lesson's next click —
    // and the lesson LATCHES LIVED in the ledgers (World.mireilleGiftLesson),
    // so once the loop has been walked — this run, a past character, or
    // undone again by choice (unlearn, unbind) — these stay quiet forever.
    const lesson = this.getWorld().mireilleGiftLesson();
    // Learn = seat = barred (the one gesture): the lesson ends at the rack —
    // the flap is the road there, so it glows while the step pends and the
    // drawer is shut.
    const flapGlow = lesson !== null && !this.buildFlapOpen;
    // THE COUCH FLANK: the drawer (and its handle) pop AWAY from the screen
    // edge the panel docks against — a couch-LEFT guest's drawer opens
    // rightward instead of clipping off-screen; the classic centered (and
    // couch-right) panel keeps its leftward pop. The drawer docks with its
    // opener wherever the opener sits.
    const drawerFlank = this.inventory.classList.contains('couch-left') ? 'right' : 'left';
    const flankCss = drawerFlank === 'left'
      ? 'left:-27px;border-right:none;border-radius:6px 0 0 6px'
      : 'right:-27px;border-left:none;border-radius:0 6px 6px 0';
    const drawerHandle = `
      <button data-buildflap class="${flapGlow ? 'tut-glow' : ''}"
        title="Your learned skills: the whole build, full management"
        style="position:absolute;top:56px;writing-mode:vertical-rl;text-orientation:mixed;
        padding:12px 4px;font-size:11px;letter-spacing:1px;background:#241d2e;color:#c8a8ff;
        border:1px solid #4a3a5a;${flankCss};cursor:var(--cursor-point, pointer);z-index:4">
        📖 SKILLS ${(this.buildFlapOpen ? drawerFlank === 'left' : drawerFlank === 'right') ? '▸' : '◂'}</button>`;
    // The header's readout is the Ability wallet (nonzero tiers as glyph
    // chips — the pts counter retired with the point economy; DIAL).
    const walletChips = ABILITY_ESSENCES
      .filter(d => (m.abilityEssences[d.id] ?? 0) > 0)
      .map(d => `<span style="color:${d.color}" title="${d.label}">${m.abilityEssences[d.id]}${d.glyph}</span>`)
      .join(' ');
    // THE FONT'S CONVERT STRIP (FONT_CFG.convertUp/Down): tier up/down per
    // rung, wallet-gated — stands only beside a Sacrificial Font.
    const convertStrip = wf ? `
      <div style="flex:0 0 auto;font-size:10px;color:#b06bd4;margin-bottom:6px;
        border-bottom:1px solid var(--panel-border);padding-bottom:5px">
        FONT · convert essence:
        ${ABILITY_ESSENCES.slice(0, -1).map((lo, i) => {
          const hi = ABILITY_ESSENCES[i + 1];
          const canUp = (m.abilityEssences[lo.id] ?? 0) >= FONT_CFG.convertUp;
          const canDown = (m.abilityEssences[hi.id] ?? 0) >= 1;
          return `
            <button data-fontconv="${lo.tier}:up" ${canUp ? '' : 'disabled'}
              title="${FONT_CFG.convertUp}× ${lo.label} → 1× ${hi.label}">
              ${FONT_CFG.convertUp}<span style="color:${lo.color}">${lo.glyph}</span>→<span style="color:${hi.color}">${hi.glyph}</span></button>
            <button data-fontconv="${hi.tier}:down" ${canDown ? '' : 'disabled'}
              title="1× ${hi.label} → ${FONT_CFG.convertDown}× ${lo.label}">
              1<span style="color:${hi.color}">${hi.glyph}</span>→${FONT_CFG.convertDown}<span style="color:${lo.color}">${lo.glyph}</span></button>`;
        }).join('')}
      </div>` : '';
    const drawer = this.buildFlapOpen ? `
      <div data-build-drawer style="position:absolute;${drawerFlank === 'left'
        ? 'right:100%;margin-right:2px;border-radius:6px 0 0 6px;box-shadow:-6px 5px 22px rgba(0,0,0,0.6)'
        : 'left:100%;margin-left:2px;border-radius:0 6px 6px 0;box-shadow:6px 5px 22px rgba(0,0,0,0.6)'};top:0;width:360px;
        max-height:calc(100vh - 220px);display:flex;flex-direction:column;z-index:3;
        background:var(--panel-bg);border:1px solid var(--panel-border);padding:10px 12px">
        <div style="flex:0 0 auto;color:var(--gold);font-size:12px;letter-spacing:1.2px;text-transform:uppercase;
          border-bottom:1px solid var(--panel-border);padding-bottom:5px;margin-bottom:6px">
          📖 Skills ${walletChips ? `— ${walletChips}` : ''}
          <span style="float:right;color:#b06bd4;font-size:10px;letter-spacing:0">
            ${wf ? 'FONT NEARBY' : ''}</span>
        </div>
        ${convertStrip}
        <div class="build-scroll" style="flex:1 1 auto;overflow-y:auto;font-size:12px;padding-right:4px">
          ${this.learnedListHtml()}
        </div>
      </div>` : '';
    const gearBody = `
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div>
          <h3>Equipped</h3>
          ${doll}
        </div>
        <div>
          <h3>Bag <span style="color:#8a8678;font-weight:normal">(${m.items.length} item${m.items.length === 1 ? '' : 's'})</span></h3>
          <div style="position:relative;width:${W * CELL}px;height:${H * CELL}px">${cells}${tiles}</div>
          <div style="margin-top:8px;color:#8a8678;font-size:10px">
            ${salv === 'break'
              ? `⚒ <b style="color:#e8c87a">BREAKING</b>: click a piece to salvage it for essence ·
                <b>right-click</b> locks 🔒 it (locked pieces refuse the hammer) ·
                worn pieces are safe — drag or double-click them off the doll first ·
                shift-click still drops to ground`
              : salv === 'sell'
              ? `⚙ <b style="color:#e8c87a">SELLING</b>: click a piece to sell it for Coarse Essence ·
                <b>right-click</b> locks 🔒 it (locked pieces refuse the wheel) ·
                worn pieces are safe — drag or double-click them off the doll first ·
                shift-click still drops to ground`
              : `drag (or click to lift) any piece: bag ↔ doll ↔ the other slot,
                onto another item to swap, onto the world to drop it ·
                double-click: equip / unequip · shift-click: drop to ground ·
                right-click: lock 🔒 against salvage · ${pickupHint}`}
          </div>
        </div>
      </div>`;

    // THE ONE BAG (skill-items M1): the gem tabs retired — gear tiles and
    // gem wrappers share the one grid, and the pane is the single gear face.
    const body = gearBody;

    // Scroll restore (the golden rule — a re-render must never yank a list
    // to the top mid-read). The panel itself no longer scrolls (the drawer
    // hangs OUTSIDE it); the inner wrapper does, and the drawer's own list
    // keeps its offset too.
    const prevScroll = this.inventory.querySelector<HTMLElement>('.inv-scroll')?.scrollTop ?? 0;
    const prevBuildScroll = this.inventory.querySelector<HTMLElement>('.build-scroll')?.scrollTop ?? 0;
    // THE ANCHORED FRAME: the scroll wrapper holds the GEAR tab's height
    // (derived from the doll itself) on EVERY tab, clamped to the viewport —
    // an empty gem tab no longer collapses the pane, so the Build flap and
    // drawer sit at the same seat whichever face is open. overflow-x hidden:
    // the doll+bag row is sized to the seam (derived cols), and a set
    // overflow-y would otherwise compute overflow-x to auto and grow a
    // phantom horizontal bar under the fold.
    const frameMin = Math.ceil(dollRowsFor(EQUIP_SLOTS.filter(s => s.enabled && DOLL_SEATS[s.id])) * 34) + 48;
    this.inventory.innerHTML = `${drawer}${drawerHandle}${satchel}${this.closeGlyphHtml()}<h2>Inventory</h2>
      <div class="inv-scroll" style="min-height:min(${frameMin}px, calc(100vh - 240px));max-height:calc(100vh - 240px);overflow-y:auto;overflow-x:hidden">${body}</div>`;
    const scrollEl = this.inventory.querySelector<HTMLElement>('.inv-scroll');
    if (scrollEl) scrollEl.scrollTop = prevScroll;
    const buildEl = this.inventory.querySelector<HTMLElement>('.build-scroll');
    if (buildEl) buildEl.scrollTop = prevBuildScroll;
    this.wireInventory();
    this.paintPortraitsIn(this.inventory); // the build flap's Spectre chip
    this.applyBreakChrome();
  }

  /** Re-attach bag/doll click handlers after a re-render (the panels' idiom).
   *  DRAG AND DROP LIVES ELSEWHERE: every lift/carry/land is the fabric's
   *  (installGearDnd — data-drag/data-drop in the markup above); only plain
   *  click VERBS are wired here, and the fabric's courtesies keep the two
   *  from ever colliding (modifier clicks never lift; a drag's afterglow
   *  click is swallowed). */
  private wireInventory(): void {
    const world = this.getWorld();
    const q = <T extends HTMLElement>(sel: string): T[] => [...this.inventory.querySelectorAll<T>(sel)];
    this.inventory.querySelector<HTMLButtonElement>('[data-satchel]')?.addEventListener('click', () => {
      this.satchelOpen = !this.satchelOpen;
      this.refreshInventory();
    });
    // The Build drawer (its handle hangs on the panel edge):
    // toggle + — when open — the learned list's full management wiring.
    this.inventory.querySelector<HTMLButtonElement>('[data-buildflap]')?.addEventListener('click', () => {
      this.buildFlapOpen = !this.buildFlapOpen;
      this.refreshInventory();
    });
    if (this.buildFlapOpen) {
      this.wireLearnedList(this.inventory, () => this.refreshInventory());
      // THE FONT'S CONVERT STRIP (drawer chrome, outside the learned list).
      this.inventory.querySelectorAll<HTMLButtonElement>('button[data-fontconv]').forEach(btn =>
        btn.addEventListener('click', () => {
          const [tier, dir] = btn.dataset.fontconv!.split(':');
          this.getWorld().requestMeta({ t: 'fontConvert', tier: Number(tier), dir: dir as 'up' | 'down' });
          this.refreshInventory();
        }));
    }

    const salv = this.salvageLaneFor(this.inventory);
    const seatMeta = this.panelSeat(this.inventory).meta;
    // THE KEEPER'S MARK: right-click (button-2 press) toggles the salvage
    // lock on anything carried — bag tiles (gear AND gem wrappers), worn
    // chips; hammer up or down. ONE uid address space (M1). The dnd
    // fabric's own button-2 (cancel a carry) runs first at document capture
    // and stops propagation, so a carry-cancel never doubles as a lock
    // flip; dndCarried() is the belt to that suspender.
    q<HTMLElement>('[data-lock-uid]').forEach(el => el.addEventListener('pointerdown', ev => {
      if (ev.button !== 2 || dndCarried()) return;
      const uid = Number(el.dataset.lockUid);
      const it = seatMeta.items.find(i => i.uid === uid)
        ?? Object.values(seatMeta.equipped).find(i => i?.uid === uid);
      if (!it) return;
      ev.preventDefault();
      ev.stopPropagation();
      world.requestMeta({ t: 'salvageLock', uid, on: !it.locked });
      this.refreshInventory();
      if (this.salvageOpen) this.refreshSalvage(); // sweep counts moved
      if (this.vendorOpen) this.refreshVendor(); // a counter's cluster counts too
    }));

    // THE LOOSE LEVEL-UP: a support wrapper's corner + feeds the same
    // Ability-Essence lane the drawer serves socketed gems (inner control —
    // the fabric never lifts through it).
    q<HTMLButtonElement>('button[data-gemlvl-inv]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'levelSupportInv', uid: Number(btn.dataset.gemlvlInv) });
      this.refreshInventory();
    }));

    // THE HAMMER'S BITE (or the wheel's): while a lane is armed, a plain
    // click on a bag tile salvages it down that lane (the lift verb stood
    // down with data-drag; a carried doll piece's landing click is the
    // fabric's, never this).
    if (salv) {
      q<HTMLElement>('[data-salv-uid]').forEach(el => el.addEventListener('click', e => {
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || dndCarried()) return;
        const uid = Number(el.dataset.salvUid);
        const item = seatMeta.items.find(i => i.uid === uid);
        if (!item || item.locked) return; // pip + tooltip explain the refusal
        world.requestMeta({ t: 'salvageItem', uid, lane: salv });
        hideTooltip();
        this.refreshInventory();
        this.refreshSalvage();
        this.refreshVendor();
      }));
    }

    // CLICK VERBS on gear (the fast paths beside the drag):
    //  · double-click a bag tile = equip (auto slot) — its mirror, double-
    //    click a worn chip = unequip (first fit). One symmetry, zero aiming.
    //  · shift-click either = drop to the ground (the drag-to-world twin).
    q<HTMLElement>('[data-bag-item]').forEach(el => {
      const uid = Number(el.dataset.itemUid);
      el.addEventListener('click', (e) => {
        if (!e.shiftKey) return; // plain clicks belong to the fabric's lift
        world.requestMeta({ t: 'dropItem', uid });
        this.refreshInventory();
      });
      el.addEventListener('dblclick', () => {
        if (salv) return; // one verb under an armed lane — the click salvaged it
        const item = seatMeta.items.find(i => i.uid === uid);
        // THE STONE (M2, §3b): the pouch's double-click opens THE RECALL,
        // owned by this bag's seat (the couch lens carries through).
        if (item?.mem) {
          this.showRecall(uid, this.panelSeatIds.get(this.inventory));
          return;
        }
        // THE RESIDENCE: a skill wrapper's double-click LEARNS into the
        // first free seat (the gear equip's exact mirror — one symmetry).
        if (item?.gem) {
          if (item.gem.kind === 'skill') {
            world.requestMeta({ t: 'learn', uid });
            this.refreshInventory();
            this.refreshCharSheet();
          }
          return; // supports have no slotless verb — drag them to a socket
        }
        world.requestMeta({ t: 'equipItem', uid });
        this.refreshInventory();
        this.refreshCharSheet();
      });
    });
    q<HTMLElement>('[data-doll]').forEach(el => {
      const slot = el.dataset.doll!;
      el.addEventListener('click', (e) => {
        if (!e.shiftKey) return; // plain click = the fabric's lift (or a drop)
        const worn = this.getWorld().meta.equipped[slot];
        if (!worn) return;
        world.requestMeta({ t: 'dropItem', uid: worn.uid });
        this.refreshInventory();
        this.refreshCharSheet();
      });
      el.addEventListener('dblclick', () => {
        if (!this.getWorld().meta.equipped[slot]) return;
        world.requestMeta({ t: 'unequipItem', slot });
        this.refreshInventory();
        this.refreshCharSheet(); // worn stats moved — keep the open sheet honest
      });
    });
  }

  /** The one socketVestige request path — native drag drops and click-to-lift
   *  inlays both land here, so the two gestures can never diverge. */
  private socketVestige(uid: number, socket: number, vestigeId: string): void {
    this.getWorld().requestMeta({ t: 'socketVestige', uid, socket, vestigeId });
    this.refreshInventory();
    this.refreshCharSheet();
  }


  // ---------------------------------------------------------- salvage station

  showSalvage(seatId?: string): void {
    this.ownPanel(this.salvageMenu, this.couchSeatFor(seatId));
    this.salvageOpen = true;
    // THE BREAKER'S EYE: arriving at the bench ARMS the hammer and opens the
    // bag beside it — the inventory IS the salvage menu now (click things to
    // break them; the station panel holds the sweeps and the craft bench).
    // Never steal a bag another couch seat is browsing — the seat-match gate
    // (salvageLaneFor) keeps the hammer off a borrowed panel anyway.
    if (SALVAGE_AUTO_ARM) {
      this.benchBreakMode = true;
      if (!this.inventoryOpen) this.toggleInventory(seatId);
    }
    this.salvageMenu.classList.remove('hidden');
    this.refreshSalvage();
    this.refreshInventory(); // re-render the bag with benchBreakMode's verbs armed
  }

  closeSalvage(): void {
    this.salvageOpen = false;
    this.salvageMenu.classList.add('hidden');
    this.craftTargetUid = null;
    // Next bench visit re-arms fresh — or waits for the toggle, by the one
    // auto-arm choice.
    this.benchBreakMode = SALVAGE_AUTO_ARM;
    this.applyBreakChrome();
    if (this.inventoryOpen) this.refreshInventory(); // shed the break verbs
    hideTooltip();
  }

  // ------------------------------------------------- the Sacrificial Font ---
  // THE FONT SCREEN (skill-mode trees M1 — docs/design/skill-modes.md §5/§7,
  // the M-ECON UI debt paid): the station's dedicated panel. Three recipe
  // tabs — MERGE (triples fuse up a rarity), CONVERT (essence tiers up/down),
  // RESET (the tree-respec ritual) — every row a DETERMINISTIC PREVIEW LINE
  // of exactly what the recipe will do, refusals in the standing words (the
  // keeper's mark, the field discipline). The engine recipes are the gates
  // (fontMergeSkill / fontConvertEssence / fontResetTree); this panel only
  // speaks them. The drawer's inline affordances stand — this screen is the
  // station's own face on the same intents.

  showFont(seatId?: string): void {
    this.ownPanel(this.fontMenu, this.couchSeatFor(seatId));
    this.fontOpen = true;
    this.fontMenu.classList.remove('hidden');
    this.refreshFont();
  }

  closeFont(): void {
    this.fontOpen = false;
    this.fontMenu.classList.add('hidden');
    hideTooltip();
  }

  // --- THE RECALL (skill-items M2/M3, docs/design/skill-items.md §3b) -------
  // The pouches' picker: rows grouped by dropper (portrait + name + ×count),
  // THE LEAN CHIPS restating the exact derived weights the cut will roll
  // (drawn == rolled — the view and the roller share World.memoryLeanOf),
  // one press = one unit (FIFO within the group), the reveal as an event.
  // A PREFORMED pouch interposes THE FACET choice (three triad cards, each
  // naming its triad's three attributes — the cards double as attribute
  // teaching, walk-2 ruled) before the RECALL buttons arm.

  showRecall(uid: number, seatId?: string): void {
    this.ownPanel(this.recallMenu, this.couchSeatFor(seatId));
    this.recallOpen = true;
    this.recallUid = uid;
    this.recallFacet = null;
    this.recallReveals.clear();
    this.recallMenu.classList.remove('hidden');
    this.refreshRecall();
  }

  closeRecall(): void {
    this.recallOpen = false;
    this.recallMenu.classList.add('hidden');
    hideTooltip();
  }

  refreshRecall(): void {
    if (!this.recallOpen) return;
    const world = this.getWorld();
    const seat = this.panelSeat(this.recallMenu);
    const view = world.memoryRecallView(seat, this.recallUid);
    // The pouch left the bag — the panel follows it out, UNLESS reveals
    // still owe their showing (the pouch SPENT itself: the last grants
    // stand until the player closes the panel).
    if (!view && this.recallReveals.size === 0) { this.closeRecall(); return; }
    if (view) this.recallKind = view.kind;
    const mk = MEMORY_KINDS[this.recallKind];
    const groups = view?.groups ?? [];
    const total = view?.total ?? 0;
    const refusal = view?.refusal ?? null;
    // THE FACET (M3, §4 lane 2 — walk-2 ruled): a Preformed pouch arms its
    // RECALL buttons only once a triad is committed. The three cards derive
    // LIVE from the attribute registry (memoryFacets — the exact fold the
    // trued cut rolls) and TEACH: each names its triad's three attributes.
    const needsFacet = mk.facets;
    const facetChosen = !needsFacet || this.recallFacet !== null;
    const facetStrip = needsFacet && view ? `
      <div style="display:flex;gap:6px;margin:4px 0 6px">
        ${memoryFacets().map(f => {
          const sel = this.recallFacet === f.id;
          return `<button data-mem-facet="${f.id}" style="flex:1;text-align:left;padding:5px 7px;
            background:${sel ? '#2e2538' : '#1c1824'};border:1px solid ${sel ? mk.color : '#3a3644'};
            border-radius:4px;cursor:var(--cursor-point, pointer)">
            <div style="font-size:11px;font-weight:bold;color:${sel ? mk.color : '#d8d0c0'}">${f.label}</div>
            <div style="font-size:9px;color:#9a94a8">${f.attrs.map(a => a.label).join(' · ')}</div>
          </button>`;
        }).join('')}
      </div>
      <div style="font-size:10px;color:#8a8678;margin-bottom:4px">${facetChosen
        ? `committed to <span style="color:${mk.color}">${memoryFacets().find(f => f.id === this.recallFacet)?.label ?? ''}</span> — the recall grants a skill of that facet's attributes`
        : 'commit to a FACET: the recall grants a skill asking those attributes (skills only — supports hold no attribute)'}</div>` : '';
    const chipStyle = 'display:inline-flex;align-items:center;gap:3px;padding:1px 5px;margin:1px 2px;'
      + 'background:#241d2e;border:1px solid #4a3a5a;border-radius:8px;font-size:9px';
    const revealHtml = (reveal: { name: string; color: string; sockets: number }): string =>
      `<div style="margin-top:2px;font-size:10px;color:${reveal.color}">
        <span style="display:inline-flex;width:14px;height:14px;border-radius:2px;background:${reveal.color}33;border:1px solid ${reveal.color};
          align-items:center;justify-content:center;font-size:6px;vertical-align:middle">${gemInitials(reveal.name)}</span>
        ${reveal.name}${reveal.sockets ? ` <span style="color:#9a94a8">${'◆'.repeat(reveal.sockets)}</span>` : ''}</div>`;
    const portraitOf = (def: MonsterDef | undefined): string => def
      ? this.monsterPortraitHtml(def, false, 30)
      : '<span style="width:30px;text-align:center;color:#5a5668">?</span>';
    const rows = groups.map(g => {
      const def = MONSTERS[g.d];
      const reveal = this.recallReveals.get(g.d);
      // THE LEAN CHIPS — the row's honest odds face (§3b): the kit skills
      // as their own icon chips × the kit mult; a kit that teaches nothing
      // shows its gemBias tag chips at the standing ×2.5; neither → the
      // wide pool, plain. The engine derived these from the same fold the
      // cut rolls.
      const chips = needsFacet
        ? `<span style="color:#5a5668;font-size:9px">the committed facet decides</span>`
        : g.rung === 'kit'
          ? g.kit.map(c => `<span style="${chipStyle}" title="${c.name} — ×${c.mult} lean">
              <span style="width:12px;height:12px;border-radius:2px;background:${c.color}33;border:1px solid ${c.color};
                display:inline-flex;align-items:center;justify-content:center;font-size:6px;color:${c.color}">${gemInitials(c.name)}</span>
              <span style="color:#c8bce0">×${c.mult}</span></span>`).join('')
          : g.rung === 'bias'
            ? g.tags.map(t => `<span style="${chipStyle}" title="tag lean — ×${GEM_DROP_CFG.biasMult}">
                <span style="color:#b8a2e8">#${t}</span><span style="color:#c8bce0">×${GEM_DROP_CFG.biasMult}</span></span>`).join('')
            : `<span style="color:#5a5668;font-size:9px">the wide pool</span>`;
      // THE REVEAL (§3b): the row flips to the granted skill — icon, name,
      // rarity color, socket pips — until the next press re-arms it.
      const revealLine = reveal ? revealHtml(reveal) : '';
      const canRecall = !refusal && facetChosen;
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #2a2634">
        ${portraitOf(def)}
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;color:#e0d8c8">${g.name} <span style="color:#9a94a8">×${g.count}</span></div>
          <div>${chips}</div>${revealLine}
        </div>
        <button data-mem-recall="${g.d}" ${canRecall ? '' : 'disabled'}
          ${canRecall || refusal ? '' : `title="${esc(MEMORY_CFG.strings.noFacet)}"`}
          style="padding:4px 10px;font-size:10px;background:${canRecall ? '#2a2138' : '#1a1722'};
          border:1px solid ${canRecall ? mk.color : '#3a3644'};border-radius:4px;
          color:${canRecall ? '#e8e0f8' : '#5a5668'};cursor:var(--cursor-point, pointer)">RECALL</button>
      </div>`;
    }).join('');
    // A SPENT group keeps its reveal row (portrait + the grant, no button):
    // the last unit's answer must outlive the group it emptied, or the
    // reveal event eats itself.
    const spent = [...this.recallReveals.entries()]
      .filter(([d]) => !groups.some(g => g.d === d))
      .map(([d, reveal]) => {
        const def = MONSTERS[d];
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #2a2634;opacity:0.8">
          ${portraitOf(def)}
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:#8a8678">${def?.name ?? d} <span style="color:#5a5668">— spent</span></div>
            ${revealHtml(reveal)}
          </div>
        </div>`;
      }).join('');
    this.recallMenu.innerHTML = `${this.closeGlyphHtml()}
      <h3 style="margin:2px 0 2px;color:${mk.color}">${mk.name.replace(/Memory$/, 'Memories')} <span style="color:#9a94a8;font-size:11px">×${total} held</span></h3>
      <div style="font-size:10px;color:#8a8678;margin-bottom:4px">each recall returns ONE memory of that body — oldest first, sealed at the drop</div>
      ${facetStrip}
      ${refusal ? `<div style="color:#c08a68;font-size:11px;margin-bottom:4px">${refusal}</div>` : ''}
      ${rows || '<div style="color:#5a5668;font-size:11px">nothing held</div>'}${spent}`;
    this.recallMenu.querySelectorAll<HTMLElement>('[data-mem-facet]').forEach(el => {
      el.addEventListener('click', () => {
        this.recallFacet = el.dataset.memFacet!;
        this.refreshRecall();
      });
    });
    this.recallMenu.querySelectorAll<HTMLElement>('[data-mem-recall]').forEach(el => {
      el.addEventListener('click', () => {
        const dropper = el.dataset.memRecall!;
        const w = this.getWorld();
        // The handshake: clear, dispatch, read back — a refused recall
        // (room/seal raced the panel) leaves null and flips nothing.
        w.memoryRecallLast = null;
        w.requestMeta({ t: 'recallMemory', uid: this.recallUid, dropper,
          ...(needsFacet && this.recallFacet ? { facet: this.recallFacet } : {}) });
        // (cast: TS narrows the field to null across the dispatch, but the
        // seat-scoped applyAction inside requestMeta just rewrote it)
        const got = w.memoryRecallLast as (MemoryRecallResult & { seat: string }) | null;
        if (got && got.seat === this.panelSeat(this.recallMenu).id) {
          this.recallReveals.set(dropper, {
            name: got.name,
            color: got.kind === 'skill' ? SKILL_RARITIES[got.rarity ?? 'common'].color : (SUPPORTS[got.id]?.color ?? '#b8b8b8'),
            sockets: got.kind === 'skill' ? SKILL_RARITIES[got.rarity ?? 'common'].sockets : 0,
          });
          this.memFlash.set(got.itemUid, Date.now() + 1700);
        }
        this.refreshRecall();
        if (this.inventoryOpen) this.refreshInventory();
      });
    });
    this.paintPortraitsIn(this.recallMenu);
  }

  refreshFont(): void {
    if (!this.fontOpen) return;
    const world = this.getWorld();
    const seat = this.panelSeat(this.fontMenu);
    const m = seat.meta;
    // Walking away closes the screen (the station panels' proximity law).
    if (!world.nearFont(seat)) { this.closeFont(); return; }

    const tabBtn = (id: typeof this.fontTab, label: string): string =>
      `<button class="book-tab ${this.fontTab === id ? 'active' : ''}" data-fonttab="${id}">${label}</button>`;
    const wallet = ABILITY_ESSENCES.map(d =>
      `<span style="color:${d.color};margin-right:8px" title="${d.label}">${d.glyph} ${m.abilityEssences[d.id] ?? 0}</span>`).join('');

    let body = '';
    if (this.fontTab === 'merge') {
      // Eligible copies per (skill × rarity) among the BAG's gem wrappers
      // (THE RESIDENCE) — the engine recipe's own filters (locked/granted
      // never count), highest level first so the preview names the level
      // the merge will KEEP.
      const groups = new Map<string, { def: SkillDef; rarity: SkillRarity; levels: number[]; barred: number }>();
      for (const item of m.items) {
        const p = skillGemPayloadOf(item);
        const def = p ? SKILLS[p.skillId] : null;
        if (!p || !def) continue;
        const k = `${p.skillId}:${p.rarity}`;
        const row = groups.get(k) ?? { def, rarity: p.rarity, levels: [], barred: 0 };
        if (item.locked || p.granted) row.barred++;
        else row.levels.push(p.level);
        groups.set(k, row);
      }
      const ladder = Object.keys(SKILL_RARITIES) as SkillRarity[];
      const rows = [...groups.values()]
        .filter(g => FONT_CFG.merge[g.rarity] !== undefined && ladder.indexOf(g.rarity) < ladder.length - 1)
        .sort((a, b) => b.levels.length - a.levels.length || a.def.name.localeCompare(b.def.name))
        .map(g => {
          const need = FONT_CFG.merge[g.rarity]!;
          const next = ladder[ladder.indexOf(g.rarity) + 1];
          const kept = g.levels.length ? Math.max(...g.levels.slice(0, need)) : 0;
          const ready = g.levels.length >= need;
          const preview = ready
            ? `${need}× ${g.def.name} (${SKILL_RARITIES[g.rarity].label}) → 1× ${g.def.name} (${SKILL_RARITIES[next].label}), level ${kept} kept`
            : `${g.levels.length}/${need} carried — the font asks ${need} alike`;
          const barredNote = g.barred
            ? ` <span style="color:#8a8678">(+${g.barred} under the keeper's mark 🔒 — the font refuses them)</span>` : '';
          return `<div class="skill-entry" style="border-left:3px solid ${SKILL_RARITIES[g.rarity].color}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <span style="font-size:11px;color:${ready ? '#e8dcc8' : '#8a8678'}">${preview}${barredNote}</span>
              <button data-fontmerge="${g.def.id}:${g.rarity}" ${ready ? '' : 'disabled'}>Reforge</button>
            </div>
            <div style="font-size:9px;color:#6a6478">socketed supports return to the bag before the inputs burn; the highest input level is kept.</div>
          </div>`;
        }).join('');
      body = rows || `<div style="color:#8a8678;font-size:11px">Nothing fusible carried. The font fuses
        ${Object.entries(FONT_CFG.merge).map(([r, n]) => `${n}× ${SKILL_RARITIES[r as SkillRarity].label}`).join(' · ')}
        copies of the SAME skill into one of the next rarity.</div>`;
    } else if (this.fontTab === 'convert') {
      body = ABILITY_ESSENCES.slice(0, -1).map((lo, i) => {
        const hi = ABILITY_ESSENCES[i + 1];
        const canUp = (m.abilityEssences[lo.id] ?? 0) >= FONT_CFG.convertUp;
        const canDown = (m.abilityEssences[hi.id] ?? 0) >= 1;
        return `<div class="skill-entry" style="border-left:3px solid ${hi.color}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <span style="font-size:11px">${FONT_CFG.convertUp}× <span style="color:${lo.color}">${lo.glyph} ${lo.label}</span>
              → 1× <span style="color:${hi.color}">${hi.glyph} ${hi.label}</span></span>
            <button data-fontconv="${lo.tier}:up" ${canUp ? '' : 'disabled'}>Refine</button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:2px">
            <span style="font-size:11px">1× <span style="color:${hi.color}">${hi.glyph} ${hi.label}</span>
              → ${FONT_CFG.convertDown}× <span style="color:${lo.color}">${lo.glyph} ${lo.label}</span></span>
            <button data-fontconv="${hi.tier}:down" ${canDown ? '' : 'disabled'}>Break down</button>
          </div>
        </div>`;
      }).join('')
        + `<div style="font-size:9px;color:#6a6478;margin-top:4px">Deliberately lossy both ways — conversion never beats farming at depth.</div>`;
    } else {
      const why = world.swapRefusal(seat, 'socket');
      const rows = [...m.knownSkills.values()]
        .filter(inst => inst.treeNodes?.length)
        .map(inst => {
          const cost: AbilityCost = { tier: essenceTierForLevel(inst.level), count: FONT_CFG.reset.count };
          const dd = abilityEssenceOfTier(cost.tier);
          const afford = world.canAffordAbilityEssence(seat, cost);
          const branch = treeSpentBranch(inst);
          const n = inst.treeNodes!.length;
          const preview = `${inst.def.name} — ${branch ? `the ${branch.name} path, ` : ''}${n} spent point${n === 1 ? '' : 's'} refunded for ${cost.count}× ${dd.label}`;
          const refusal = why ?? (afford ? null : `the ritual asks ${cost.count}× ${dd.label}`);
          return `<div class="skill-entry" style="border-left:3px solid ${inst.def.color}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <span style="font-size:11px">${preview}</span>
              <button data-fontreset="${inst.def.id}" ${refusal ? `disabled title="${refusal}"` : ''}>
                ↺ Unmake (${this.abilityCostText(cost)})</button>
            </div>
            ${refusal ? `<div style="font-size:9px;color:#8a8678">${refusal}</div>` : ''}
          </div>`;
        }).join('');
      body = rows || `<div style="color:#8a8678;font-size:11px">No spent Ability points to unmake.
        The ritual refunds a skill's WHOLE tree (never node-wise), priced in its current band.</div>`;
    }

    this.fontMenu.innerHTML = `
      ${this.closeGlyphHtml()}<h2 style="color:#b06bd4">Sacrificial Font</h2>
      <div style="font-size:11px;color:#8a8678;margin-bottom:6px">
        Memories merged, essences broken, choices unmade. &nbsp;${wallet}</div>
      <div class="book-tabs" style="margin-bottom:8px">
        ${tabBtn('merge', 'Merge')}${tabBtn('convert', 'Convert')}${tabBtn('reset', 'Reset')}
      </div>
      ${body}
      <div style="margin-top:8px"><button data-fontclose>Leave the font</button></div>`;

    const q = <T extends HTMLElement>(sel: string): T[] => [...this.fontMenu.querySelectorAll<T>(sel)];
    q<HTMLButtonElement>('button[data-fonttab]').forEach(btn => btn.addEventListener('click', () => {
      this.fontTab = btn.dataset.fonttab as typeof this.fontTab;
      this.refreshFont();
    }));
    q<HTMLButtonElement>('button[data-fontmerge]').forEach(btn => btn.addEventListener('click', () => {
      const [skillId, rarity] = btn.dataset.fontmerge!.split(':');
      this.getWorld().requestMeta({ t: 'fontMerge', skillId, rarity: rarity as SkillRarity });
      this.refreshFont();
      if (this.inventoryOpen) this.refreshInventory();
    }));
    q<HTMLButtonElement>('button[data-fontconv]').forEach(btn => btn.addEventListener('click', () => {
      const [tier, dir] = btn.dataset.fontconv!.split(':');
      this.getWorld().requestMeta({ t: 'fontConvert', tier: Number(tier), dir: dir as 'up' | 'down' });
      this.refreshFont();
      if (this.inventoryOpen) this.refreshInventory();
    }));
    q<HTMLButtonElement>('button[data-fontreset]').forEach(btn => btn.addEventListener('click', () => {
      this.getWorld().requestMeta({ t: 'fontReset', skillId: btn.dataset.fontreset! });
      this.refreshFont();
      if (this.inventoryOpen) this.refreshInventory();
    }));
    this.fontMenu.querySelector<HTMLButtonElement>('[data-fontclose]')?.addEventListener('click', () => this.closeFont());
  }

  // ---------------------------------------------- the milestone tree popup ---
  // (skill-mode trees M1 — §7, the Calling precedent): offered by the world's
  // updateTreePips sweep at a DISCIPLINED CALM only, one skill per offer.
  // Chips speak THE ONE SPEND PREDICATE; "Later" dismisses — the drawer's
  // waiting-pip keeps the truth either way. DIAL: TREE_POPUP_ENABLED.

  private treePopup: HTMLDivElement | null = null;

  closeTreePopup(): void {
    this.treePopup?.remove();
    this.treePopup = null;
  }

  showTreePopup(seatId: string, skillId: string): void {
    if (!TREE_POPUP_ENABLED || this.treePopup) return;
    const world = this.getWorld();
    const seat = this.couchSeatFor(seatId);
    const inst = seat.meta.knownSkills.get(skillId);
    const tree = inst?.def.tree;
    if (!inst || !tree) return;
    const spent = inst.treeNodes ?? [];
    const free = Math.max(0, bandPointsAt(inst.level) - spent.length);
    if (!free) return;
    const chip = (node: SkillTreeNode, branchName?: string): string => {
      if (spent.includes(node.id) || treeNodeRefusal(inst, node.id) !== null) return '';
      return `<button data-poppick="${node.id}" class="gem-chip"
        style="display:block;width:100%;margin:4px 0;padding:8px 10px;text-align:left;border-color:${inst.def.color}"
        title="${node.description ?? node.name}">
        ${branchName ? `<span style="color:#8a8678">${branchName} · </span>` : ''}<b>${node.name}</b>
        ${node.description ? `<div style="font-size:10px;color:#a8a494">${node.description}</div>` : ''}
      </button>`;
    };
    const chips = [
      ...tree.branches.flatMap(b => b.rungs.map(n => chip(n, b.name))),
      ...(tree.neutral ? [chip(tree.neutral, 'neutral')] : []),
    ].join('');
    if (!chips) return; // nothing spendable right now (sealed under the lock)
    const pop = document.createElement('div');
    pop.className = 'panel';
    pop.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
      + 'width:360px;max-width:92vw;z-index:60;font-size:12px';
    pop.innerHTML = `
      ${this.closeGlyphHtml('Later')}<h2 style="color:#d8b86a">An Ability Point Awakens</h2>
      <div style="font-size:11px;color:#a8a494;margin-bottom:6px">
        <b style="color:${inst.def.color}">${inst.def.name}</b> has grown into a choice
        (${spent.length}/${bandPointsAt(inst.level)} points placed).
        ${treeSpentBranch(inst) ? '' : 'The first point into a branch SEALS the other path.'}</div>
      ${chips}
      <div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end">
        <button data-poplater>Later (the drawer keeps the pip)</button>
      </div>`;
    document.body.appendChild(pop);
    this.treePopup = pop;
    pop.querySelectorAll<HTMLButtonElement>('button[data-poppick]').forEach(btn =>
      btn.addEventListener('click', () => {
        world.requestMeta({ t: 'pickTreeNode', skillId, nodeId: btn.dataset.poppick! });
        this.closeTreePopup();
        if (this.inventoryOpen) this.refreshInventory();
      }));
    pop.querySelector<HTMLButtonElement>('[data-poplater]')?.addEventListener('click', () => this.closeTreePopup());
    pop.querySelector<HTMLButtonElement>('[data-panel-x]')?.addEventListener('click', () => this.closeTreePopup()); // the close glyph (closeGlyphHtml) = Later
  }

  /** Is the breaker's hammer up? (Salvage panel open on its salvage tab,
   *  mode armed.) The INVENTORY half additionally demands both panels
   *  belong to the same couch seat — see salvageLaneFor. */
  private breakArmed(): boolean {
    return this.salvageOpen && this.salvageTab === 'salvage' && this.benchBreakMode;
  }

  /** Which salvage lane is ARMED over this panel, if any: 'break' under the
   *  bench's hammer, 'sell' under a counter's scrap wheel. Both hosts obey
   *  the couch lens rule — the host and the bag must belong to the SAME
   *  seat (seat B's browsing must never break under seat A's hammer) — and
   *  the bench wins a same-seat tie: its lane studies, the wheel only pays. */
  private salvageLaneFor(panel: HTMLElement): 'break' | 'sell' | null {
    if (this.breakArmed() && this.panelSeat(this.salvageMenu) === this.panelSeat(panel)) return 'break';
    if (this.vendorOpen && this.scrapMode && this.panelSeat(this.vendorMenu) === this.panelSeat(panel)) return 'sell';
    return null;
  }

  /** One seam for the salvage-mode cursor dress: the ⚒ rides the bench and
   *  the ⚙ a counter's armed wheel, each spilling onto the (same-seat)
   *  inventory while armed — and every face comes back clean the moment
   *  its mode stands down. */
  private applyBreakChrome(): void {
    this.salvageMenu.style.cursor = this.breakArmed() ? BREAK_CURSOR : '';
    this.vendorMenu.style.cursor = this.vendorOpen && this.scrapMode ? SCRAP_CURSOR : '';
    const lane = this.salvageLaneFor(this.inventory);
    this.inventory.style.cursor = lane === 'break' ? BREAK_CURSOR : lane === 'sell' ? SCRAP_CURSOR : '';
  }

  /** Fold many essence yields into per-tier chips ("12▪ 4◆") — the sweep
   *  buttons' price preview. The lists fed here mirror salvageBulk's own
   *  filters, so the label IS the payout. */
  private essSumText(costs: (EssenceCost | null)[]): string {
    const sum: Partial<Record<EssenceId, number>> = {};
    for (const c of costs) if (c) sum[c.essence] = (sum[c.essence] ?? 0) + c.count;
    return ESSENCE_IDS.filter(id => (sum[id] ?? 0) > 0)
      .map(id => `<span style="color:${ESSENCES[id].color}" title="${ESSENCES[id].label}">${sum[id]}${ESSENCES[id].glyph}</span>`)
      .join(' ');
  }

  /** THE BREAKER'S EYE, portable — the one salvage control cluster every
   *  salvage-capable view composes (the bench's salvage face, a counter's
   *  scrap section): the arm toggle, the lane's teaching line, and THE
   *  SWEEPS, with the keeper's-lock read woven through. The LANE keeps each
   *  view honest — the bench BREAKS (typed essence + study), a counter
   *  SELLS (coarse, no study) — same controls, same laws, never a verb the
   *  host would refuse (World.salvageLane gates break to the bench, sell to
   *  an open scrap counter). Eligible sets mirror the host's salvageBulk
   *  filters exactly: locks skipped, granted sparks out, worn gear
   *  structurally out of reach. */
  private salvageClusterHtml(seat: Seat, lane: 'break' | 'sell', armed: boolean): string {
    const m = seat.meta;
    const sell = lane === 'sell';
    const itemY = sell ? sellItemYield : salvageItemYield;
    const skillY = sell ? sellSkillYield : salvageSkillYield;
    const supY = sell ? sellSupportYield : salvageSupportYield;
    const verb = sell ? 'Sell' : 'Break';
    // THE ONE BAG (M1): gear tiles and gem wrappers share m.items — the
    // sweeps split them exactly as the host's salvageBulk filters do.
    const gemItems = m.items.filter(i => i.gem);
    const gearItems = m.items.filter(i => !i.gem);
    const gearAll = gearItems.filter(i => !i.locked);
    const gearLocked = gearItems.length - gearAll.length;
    const skillRows = gemItems.flatMap(i => {
      const p = skillGemPayloadOf(i);
      return p ? [{ item: i, p }] : [];
    });
    const skillAll = skillRows.filter(r => !r.item.locked && !r.p.granted);
    const skillLocked = skillRows.filter(r => r.item.locked).length;
    const supRows = gemItems.filter(i => i.gem?.kind === 'support');
    const supAll = supRows.filter(i => !i.locked);
    const supLocked = supRows.length - supAll.length;
    const bulkBtn = (
      cat: 'item' | 'skill' | 'support', label: string,
      yields: (EssenceCost | null)[], rarity?: string, color?: string,
    ): string => {
      const n = yields.length;
      const pay = n ? this.essSumText(yields) : '';
      return `<button data-bulk="${cat}${rarity ? `:${rarity}` : ''}" ${n ? '' : 'disabled'}
        ${color ? `style="border-color:${color};color:${color}"` : ''}
        title="${n ? `${verb} ${n} — locked things are skipped` : 'Nothing eligible'}">
        ${label} (${n})${pay ? ` → ${pay}` : ''}</button>`;
    };
    const keptNote = (n: number): string =>
      n > 0 ? ` <span style="color:#8a8678;font-weight:normal;font-size:10px">· ${n} 🔒 kept aside</span>` : '';
    const toggle = sell
      ? `⚙ ${armed ? 'Scrap wheel ON — click things in your bag to sell them' : 'Flip the scrap wheel (click-to-sell in the bag)'}`
      : `⚒ ${armed ? 'Hammer in hand — click things in your bag to break them' : 'Take up the hammer (click-to-break in the bag)'}`;
    const teaches = sell
      ? `Selling pays Coarse Essence by quality and teaches nothing — the bench's hammer studies, the counter's wheel only pays.
          Worn gear never sells — unequip it first.`
      : `Breaking pays Essence by quality and STUDIES each affix (expertise, on the account, survives death).
          Worn gear never breaks — unequip it first.`;
    const tool = sell ? 'the wheel' : 'the hammer';
    return `<div class="bind-btns" style="margin-bottom:6px">
          <button data-breaker class="${armed ? 'bound' : ''}">
            ${toggle}</button>
        </div>
        <div class="desc" style="color:#8a8678;font-size:10px;margin-bottom:6px">
          ${teaches} <b>Right-click</b> anything carried to lock 🔒 it:
          locked things refuse ${tool}, and every sweep below skips them. Granted sparks sit out of sweeps.
        </div>
        <h3>Gear${keptNote(gearLocked)}</h3>
        <div class="bind-btns">
          ${bulkBtn('item', `${verb} all`, gearAll.map(itemY))}
          ${(['common', 'magic', 'rare', 'unique'] as const).map(r => bulkBtn(
            'item', ITEM_RARITIES[r].label, gearAll.filter(i => i.rarity === r).map(itemY),
            r, ITEM_RARITIES[r].color)).join('')}
        </div>
        <h3>Skill Memories${keptNote(skillLocked)}</h3>
        <div class="bind-btns">
          ${bulkBtn('skill', `${verb} all`, skillAll.flatMap(r => { const inst = skillOfGemItem(r.item); return inst ? [skillY(inst)] : []; }))}
          ${(['common', 'magic', 'rare', 'legendary'] as const).map(r => bulkBtn(
            'skill', SKILL_RARITIES[r].label,
            skillAll.filter(row => row.p.rarity === r).flatMap(row => { const inst = skillOfGemItem(row.item); return inst ? [skillY(inst)] : []; }),
            r, SKILL_RARITIES[r].color)).join('')}
        </div>
        <h3>Support Memories${keptNote(supLocked)}</h3>
        <div class="bind-btns">
          ${bulkBtn('support', `${verb} all`, supAll.flatMap(i => { const g = supportOfGemItem(i); return g ? [supY(g)] : []; }))}
        </div>`;
  }

  /** Wire a composed salvage cluster (the toggle + THE SWEEPS) inside its
   *  hosting view. The host stays sovereign — it owns the armed flag and
   *  its own repaint — and the bag repaints alongside because both verbs
   *  move it. Arming (re)opens the bag beside the counter: the inventory
   *  IS the salvage menu, whichever roof it stands under. */
  private bindSalvageCluster(root: HTMLElement, lane: 'break' | 'sell', view: {
    armed: () => boolean; setArmed: (on: boolean) => void; refresh: () => void;
  }): void {
    const world = this.getWorld();
    root.querySelector<HTMLButtonElement>('button[data-breaker]')?.addEventListener('click', () => {
      view.setArmed(!view.armed());
      if (view.armed() && !this.inventoryOpen) {
        this.toggleInventory(this.panelSeat(root).id);
      }
      view.refresh();
      this.refreshInventory();
    });
    // THE SWEEPS: one blow per category, optionally narrowed to a rarity.
    // The host re-filters (locks, granted, lane) — these buttons only ask.
    [...root.querySelectorAll<HTMLButtonElement>('button[data-bulk]')].forEach(btn => btn.addEventListener('click', () => {
      const [cat, rarity] = btn.dataset.bulk!.split(':') as [
        'item' | 'skill' | 'support',
        ('common' | 'magic' | 'rare' | 'unique' | 'legendary') | undefined,
      ];
      world.requestMeta({ t: 'salvageBulk', cat, rarity, lane });
      view.refresh();
      this.refreshInventory(); // the sweep emptied bag tiles — repaint them
    }));
  }

  refreshSalvage(): void {
    if (!this.salvageOpen) return;
    const world = this.getWorld();
    const seat = this.panelSeat(this.salvageMenu);
    const m = seat.meta;
    const acc = this.getAccount();

    const tabs = `<div class="bind-btns" style="margin-bottom:8px">
      <button data-stab="salvage" class="${this.salvageTab === 'salvage' ? 'bound' : ''}">Salvage</button>
      <button data-stab="craft" class="${this.salvageTab === 'craft' ? 'bound' : ''}">Craft</button>
    </div>`;
    let body: string;

    if (this.salvageTab === 'salvage') {
      // THE BREAKER'S EYE — the bag IS the menu. This face composes the
      // shared cluster (the hammer toggle + THE SWEEPS, salvageClusterHtml)
      // on the BREAK lane; individual breaking happens by clicking things
      // in the inventory beside it (the break cursor marks it).
      body = `<div style="margin-bottom:6px">${this.essWallet(seat)}</div>
        ${this.salvageClusterHtml(seat, 'break', this.benchBreakMode)}`;
    } else {
      const targets = [...m.items, ...Object.values(m.equipped).filter((x): x is ItemInstance => !!x)];
      const targetRows = targets.map(i =>
        `<button data-ctar="${i.uid}" class="${this.craftTargetUid === i.uid ? 'bound' : ''}"
          data-tip="item" data-item-uid="${i.uid}"
          style="color:${ITEM_RARITIES[i.rarity].color}">${i.name}${m.equipped && Object.values(m.equipped).some(w => w?.uid === i.uid) ? ' (worn)' : ''}</button>`,
      ).join(' ') || '<span style="color:#8a8678;font-size:11px">Nothing carried or worn.</span>';
      const target = targets.find(i => i.uid === this.craftTargetUid);
      let chisel = '';
      let affixRows = '<div style="color:#8a8678;font-size:11px">Pick a piece above.</div>';
      if (target) {
        // CHISEL: +1 socket, sharing the crafted-slot budget with affixes.
        const cap = socketCap(ITEM_BASES[target.baseId]?.category ?? 'ring');
        const have = target.sockets?.length ?? 0;
        const chiselable = cap > 0 && have < cap && craftedCount(target) < world.craftSlots();
        const affordChisel = world.canAffordEssence(seat, CRAFT_CFG.socketCost);
        chisel = cap > 0 ? `
          <div class="bind-btns" style="margin:4px 0 8px">
            <button data-chisel="${target.uid}" ${chiselable && affordChisel ? '' : 'disabled'}>
              ⛏ Chisel a socket (${this.essCostText(CRAFT_CFG.socketCost)}) — ${have}/${cap}
              ${!chiselable && have >= cap ? ' · at cap' : !chiselable ? ' · no craft slot' : !affordChisel ? ' · not enough' : ''}</button>
          </div>` : '';
        const slotsLeft = world.craftSlots() - craftedCount(target);
        if (slotsLeft <= 0) {
          affixRows = '<div style="color:#8a8678;font-size:11px">This piece holds no more craft.</div>';
        } else {
          const options = craftableAffixesFor(target, acc.craftLore);
          affixRows = options.map(o => {
            const cost = CRAFT_CFG.cost(o.rank);
            const afford = world.canAffordEssence(seat, cost);
            return `<div class="skill-entry">
              <div class="name">${o.def.names[o.def.names.length - 1]}
                <span style="color:#c8a84b;font-size:10px">expertise rank ${o.rank}</span></div>
              <div class="bind-btns"><button data-craft="${target.uid}:${o.def.id}" ${afford ? '' : 'disabled'}>
                Craft (${this.essCostText(cost)})${afford ? '' : ' — not enough'}</button></div>
            </div>`;
          }).join('') || '<div style="color:#8a8678;font-size:11px">No studied affix fits this piece yet; salvage more of what you want to learn.</div>';
        }
      }
      const loreRows = Object.entries(acc.craftLore)
        .sort((a, b) => (b[1].rank - a[1].rank) || (b[1].progress - a[1].progress))
        .slice(0, 24).map(([fam]) => {
          const [have, need] = expertiseProgress(acc.craftLore, fam);
          const rank = expertiseRank(acc.craftLore, fam);
          return `<div class="stat-row"><span>${fam}</span>
            <span class="val">${rank > 0 ? `rank ${rank}` : 'unstudied'}${need > 0 ? ` · ${have}/${need}` : ' · MAX'}</span></div>`;
        }).join('') || '<div style="color:#8a8678;font-size:11px">Salvage affixed gear to begin studying.</div>';
      body = `<div style="margin-bottom:6px">${this.essWallet(seat)}</div>
        <div class="desc" style="color:#8a8678;font-size:10px;margin-bottom:6px">
          One crafted line per piece${world.craftSlots() > 1 ? ` (yours: ${world.craftSlots()})` : ''}; expertise raises the roll CEILING; the roll itself stays wild.
        </div>
        <h3>Piece</h3><div class="bind-btns">${targetRows}</div>
        <h3>Craft onto it</h3>${chisel}${affixRows}
        <h3>Expertise <span style="color:#8a8678;font-weight:normal;font-size:10px">— only salvaged lines at or ABOVE your next tier teach you anything</span></h3>${loreRows}`;
    }

    this.salvageMenu.innerHTML = `${this.closeGlyphHtml()}<h2>Salvage Station</h2>${tabs}${body}
      <div class="bind-btns" style="margin-top:8px"><button data-salv-close>Step away</button></div>`;

    const q = <T extends HTMLElement>(sel: string): T[] => [...this.salvageMenu.querySelectorAll<T>(sel)];
    q<HTMLButtonElement>('button[data-stab]').forEach(btn => btn.addEventListener('click', () => {
      this.salvageTab = btn.dataset.stab as 'salvage' | 'craft';
      this.refreshSalvage();
    }));
    // THE BREAKER'S HAMMER toggle + THE SWEEPS: the shared cluster's verbs,
    // bound on the BREAK lane (bindSalvageCluster).
    this.bindSalvageCluster(this.salvageMenu, 'break', {
      armed: () => this.benchBreakMode,
      setArmed: on => { this.benchBreakMode = on; },
      refresh: () => this.refreshSalvage(),
    });
    q<HTMLButtonElement>('button[data-ctar]').forEach(btn => btn.addEventListener('click', () => {
      this.craftTargetUid = Number(btn.dataset.ctar);
      this.refreshSalvage();
    }));
    q<HTMLButtonElement>('button[data-chisel]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'craftSocket', uid: Number(btn.dataset.chisel) });
      this.refreshSalvage();
      this.refreshInventory();
    }));
    q<HTMLButtonElement>('button[data-craft]').forEach(btn => btn.addEventListener('click', () => {
      // THE SMITHING MINIGAME: the strike-timing bar decides how far the
      // roll lifts toward the unlocked ceiling — skill, not magic-find.
      if (this.minigameActive) return;
      const [uid, affixId] = btn.dataset.craft!.split(':');
      this.minigameActive = true;
      runSmithMinigame(({ score }) => {
        this.minigameActive = false;
        world.requestMeta({ t: 'craftAffix', uid: Number(uid), affixId, score });
        this.refreshSalvage();
        this.refreshCharSheet(); // a worn-piece craft moves live stats
      });
    }));
    this.salvageMenu.querySelector<HTMLButtonElement>('[data-salv-close]')?.addEventListener('click', () => this.closeSalvage());
    this.applyBreakChrome();
  }

  // -------------------------------------------------------- the bestiary book
  // The Tracker's ledger: one page per eligible kind in the LIVE registry
  // (data/bestiary.ts derives the list — new monsters bind themselves in).
  // A page darkens to '???' until first blood, then reveals in STUDY TIERS
  // as account-lifetime kills accrue; the full threshold MASTERS it.

  /** The open entry's live-portrait animation frame (0 = none running). */
  private bestiaryAnim = 0;

  showBestiary(seatId?: string): void {
    this.ownPanel(this.bestiaryMenu, this.couchSeatFor(seatId));
    this.bestiaryOpen = true;
    this.bestiaryMenu.classList.remove('hidden');
    this.refreshBestiary();
  }

  closeBestiary(): void {
    this.bestiaryOpen = false;
    this.bestiaryMenu.classList.add('hidden');
    cancelAnimationFrame(this.bestiaryAnim);
    this.bestiaryAnim = 0;
    dndCancel(); // never strand a lifted page on a closed book
    hideTooltip();
  }

  /** The flat SVG shape-glyph — now the FALLBACK read (undiscovered pages
   *  when BESTIARY_CFG.portrait.undiscovered = 'glyph', and any body the
   *  portrait fabric cannot paint). The real seats draw the portrait fabric. */
  private monsterGlyph(def: MonsterDef, dark: boolean): string {
    const c = dark ? '#3a384c' : def.color;
    const pts: Record<string, string> = {
      diamond: '11,1 21,11 11,21 1,11',
      triangle: '11,2 21,20 1,20',
      square: '3,3 19,3 19,19 3,19',
      kite: '11,1 19,13 11,21 3,13',
      trapezoid: '5,4 17,4 21,19 1,19',
      pentagon: '11,1 21,9 17,20 5,20 1,9',
      hexagon: '6,2 16,2 21,11 16,20 6,20 1,11',
      star: '11,1 13,8 21,8 15,13 17,21 11,16 5,21 7,13 1,8 9,8',
    };
    const body = def.shape === 'oval'
      ? `<ellipse cx="11" cy="11" rx="10" ry="7" fill="${c}"/>`
      : pts[def.shape]
        ? `<polygon points="${pts[def.shape]}" fill="${c}"/>`
        : `<circle cx="11" cy="11" r="9" fill="${c}"/>`;
    return `<svg width="22" height="22" viewBox="0 0 22 22" style="flex:0 0 22px">${body}</svg>`;
  }

  /** def → the portrait fabric's def-like. The fabric is vis-pure and cannot
   *  read FACTIONS, so the faction's horn style is stamped here (exactly the
   *  derivation drawActor makes for live bodies). THE TELL FABRIC's book
   *  face is stamped here too (portrait.ts stays vis-pure): def-level tells
   *  render at their sane default value — the worn gauge rides the
   *  extraParts lane (baked, static pose), tint and adorn swap pre-bake. */
  private portraitDefOf(def: MonsterDef): PortraitDefLike {
    const like: PortraitDefLike = { ...def, demonHorns: !!FACTIONS[def.faction ?? '']?.nubHorns };
    if (def.tells?.length) {
      const dress = tellPortraitDress(def.tells);
      if (dress.parts?.length) like.extraParts = [...(like.extraParts ?? []), ...dress.parts];
      if (dress.tint) like.color = mixHex(like.color, dress.tint.color, dress.tint.f);
      if (dress.adorn) like.adorn = dress.adorn;
    }
    return like;
  }

  /** The resolved portrait subject — composite parts expanded from the live
   *  registry so a leviathan's page wears its claws. */
  private portraitSubject(def: MonsterDef): PortraitSubject {
    return portraitSubjectOf(this.portraitDefOf(def), {
      resolvePart: id => {
        const p = MONSTERS[id];
        return p ? this.portraitDefOf(p) : undefined;
      },
    });
  }

  /** A LIVE ACTOR's portrait subject — worn exactly as it stands (collar
   *  tack and all), with its def's dials/worm/parts layered on when the
   *  registry resolves the defId. The companion-roster seat. */
  private portraitSubjectOfActor(a: Actor): PortraitSubject {
    const def = a.defId ? MONSTERS[a.defId] : undefined;
    return portraitSubjectOf({
      shape: a.shape, radius: a.radius, color: a.color,
      material: a.material, adorn: a.adorn, look: a.look,
      demonHorns: !!FACTIONS[a.faction ?? '']?.nubHorns,
      portrait: def?.portrait, worm: def?.worm, parts: def?.parts,
      extraParts: a.extraParts,
    }, {
      resolvePart: id => {
        const p = MONSTERS[id];
        return p ? this.portraitDefOf(p) : undefined;
      },
    });
  }

  /** The canvas a paint pass fills — every portrait seat mints through here
   *  (attr picks the resolver: data-bport = monster def, data-bactor = live
   *  actor, data-bclass = class look). */
  private portraitCanvasHtml(attr: string, size: number, live = false): string {
    const px = Math.round(size * VIS_CFG.portrait.oversample);
    return `<canvas class="b-port${live ? ' b-port-live' : ''}" ${attr} data-bpsize="${size}"
      width="${px}" height="${px}"
      style="width:${size}px;height:${size}px;flex:0 0 ${size}px;vertical-align:middle"></canvas>`;
  }

  /** A kind's portrait tile as row HTML. Dark pages show the true dark
   *  silhouette (or the legacy glyph, by config). */
  private monsterPortraitHtml(def: MonsterDef, dark: boolean, size: number, live = false): string {
    if (dark && BESTIARY_CFG.portrait.undiscovered === 'glyph') return this.monsterGlyph(def, true);
    return this.portraitCanvasHtml(
      `data-bport="${def.id}" data-bpmode="${dark ? 'silhouette' : 'full'}"`, size, live);
  }

  /** A live actor's portrait as row HTML (resolved by the paint pass). */
  private actorPortraitHtml(a: Actor, size: number): string {
    return this.portraitCanvasHtml(`data-bactor="${a.id}"`, size);
  }

  /** A class's hero-look portrait as row HTML (the mercenary roster seat). */
  private classPortraitHtml(cls: ClassDef, size: number): string {
    return this.portraitCanvasHtml(`data-bclass="${cls.id}"`, size);
  }

  /** Fill every portrait canvas a freshly-built panel declared — ONE pass
   *  any refresher may call on its root. A look the fabric cannot paint
   *  leaves its tile blank rather than breaking the panel (the painters
   *  themselves no-op unknown kinds, so this is belt). */
  private paintPortraitsIn(root: HTMLElement): void {
    for (const cv of root.querySelectorAll<HTMLCanvasElement>('canvas.b-port')) {
      try {
        let subject: PortraitSubject | null = null;
        if (cv.dataset.bport) {
          const def = MONSTERS[cv.dataset.bport];
          if (def) subject = this.portraitSubject(def);
        } else if (cv.dataset.bactor) {
          const a = this.getWorld().actors.find(x => x.id === Number(cv.dataset.bactor));
          if (a) subject = this.portraitSubjectOfActor(a);
        } else if (cv.dataset.bclass) {
          const cls = CLASSES.find(c => c.id === cv.dataset.bclass);
          if (cls) {
            subject = portraitSubjectOf({
              shape: 'circle', radius: VIS_CFG.portrait.seats.classRadius,
              color: cls.color, look: cls.look,
            });
          }
        }
        if (!subject) continue;
        paintPortrait(cv, subject, {
          size: Number(cv.dataset.bpsize) || BESTIARY_CFG.portrait.row,
          mode: cv.dataset.bpmode === 'silhouette' ? 'silhouette' : 'full',
        });
      } catch { /* a broken look must never break a panel */ }
    }
  }

  /** The open entry's portrait LIVES: wisps play, the body breathes — the
   *  same pure-clock pose math the world draws, on the book's own rAF. One
   *  small canvas, only while the book is open with a selection. */
  private animateBestiaryDetail(): void {
    cancelAnimationFrame(this.bestiaryAnim);
    this.bestiaryAnim = 0;
    if (!BESTIARY_CFG.portrait.animate) return;
    const cv = this.bestiaryMenu.querySelector<HTMLCanvasElement>('canvas.b-port-live');
    if (!cv) return;
    const def = MONSTERS[cv.dataset.bport ?? ''];
    if (!def) return;
    const subject = this.portraitSubject(def);
    const tick = (): void => {
      if (!this.bestiaryOpen || !cv.isConnected) { this.bestiaryAnim = 0; return; }
      try {
        drawPortraitInto(cv, subject, performance.now() / 1000);
      } catch { this.bestiaryAnim = 0; return; }
      this.bestiaryAnim = requestAnimationFrame(tick);
    };
    this.bestiaryAnim = requestAnimationFrame(tick);
  }

  refreshBestiary(): void {
    if (!this.bestiaryOpen) return;
    const acc = this.getAccount();
    const list = bestiaryList();
    const per = BESTIARY_CFG.pageSize;
    const pages = Math.max(1, Math.ceil(list.length / per));
    this.bestiaryPage = Math.min(Math.max(0, this.bestiaryPage), pages - 1);
    const totals = bestiaryTotals(acc);
    const leaf = list.slice(this.bestiaryPage * per, (this.bestiaryPage + 1) * per);

    // Pages LIFT when they can LAND: a mastered, attunable page is a drag
    // source (press-drag or click-lift — the fabric's twin gestures) only
    // while a grimoire skill offers a slot to receive it.
    const liftable = this.grimoireSkills().length > 0;
    const rows = leaf.map(def => {
      const kills = bestiaryKills(acc, def.id);
      const need = bestiaryThreshold(def);
      const dark = kills <= 0;
      const done = kills >= need;
      const sel = this.bestiarySel === def.id ? ' sel' : '';
      const pct = Math.min(100, (kills / need) * 100);
      const canLift = liftable && done && spectreAttunable(acc, def);
      return `<div class="b-row${dark ? ' dark' : sel}${canLift ? ' attunable' : ''}" data-bst="${dark ? '' : def.id}"${
        canLift ? ` data-drag="bestiaryForm:${def.id}"` : ''}>
        ${this.monsterPortraitHtml(def, dark, BESTIARY_CFG.portrait.row)}
        <div style="flex:1;min-width:0">
          <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${dark ? '???' : def.name}${def.boss ? ' <span style="color:#e64db4;font-size:9px">BOSS</span>' : ''}
            ${done ? ' <span style="color:#e8c860;font-size:9px">★</span>' : ''}
          </div>
          <div class="b-bar"><i class="${done ? 'done' : ''}" style="width:${pct}%"></i></div>
        </div>
      </div>`;
    }).join('');

    // The open leaf's DETAIL: what the study tier has revealed so far.
    let detail = '<div style="color:#8a8678;font-size:11px;margin-top:6px">Open an entry; knowledge fills in as your line hunts.</div>';
    const def = list.find(d => d.id === this.bestiarySel);
    if (def) {
      const kills = bestiaryKills(acc, def.id);
      const need = bestiaryThreshold(def);
      const reveals = (g: string): boolean => bestiaryReveals(acc, def, g);
      const done = kills >= need;
      const line = (label: string, val: string): string =>
        `<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#8a8678">${label}</span><span>${val}</span></div>`;
      const hidden = (label: string): string =>
        `<div style="display:flex;justify-content:space-between;gap:12px;color:#55536a"><span>${label}</span><span>· · ·</span></div>`;
      const b = def.base;
      let body = line('Studied', `${kills} / ${need} kills${done ? ' — <span style="color:#e8c860">MASTERED</span>' : ''}`);
      body += line('Allegiance', def.faction ?? 'none') + line('Worth', `${def.xp} xp`);
      body += reveals('vitals')
        ? line('Life', String(b.life ?? '—')) + line('Pace', String(b.moveSpeed ?? '—'))
        : hidden('Vitals');
      if (reveals('arts')) {
        const arts = def.skills.map(s => SKILLS[s]?.name ?? s).join(', ') || 'tooth and claw';
        body += line('Accuracy', String(b.accuracy ?? '—')) + line('Arts', arts);
      } else body += hidden('Arts');
      if (reveals('hide')) {
        body += line('Armor', String(b.armor ?? 0)) + line('Evasion', String(b.evasion ?? 0));
        // HEFT (the mass fabric): the def's resolved resting weight — the
        // same derivation the spawn fold uses (radius × material density ×
        // heft, unless base.weight pins it) — read out as a tier word.
        // "Can I shove this?" answered before the first attempt.
        const defWeight = b.weight ?? (
          Math.pow(def.radius / DEFENSE_CFG.weight.refRadius, DEFENSE_CFG.weight.radiusPow)
          * defDensity(def) * (def.heft ?? 1));
        body += line('Heft', heftTierOf(defWeight));
        const quirks = (def.mods ?? [])
          .map(m => STAT_DEFS[m.stat]?.label ?? m.stat).join(', ');
        if (quirks) body += line('Quirks', quirks);
      } else body += hidden('Hide & quirks');
      if (done) {
        body += `<div style="margin-top:6px;color:${spectreAttunable(acc, def) ? '#a8d8a0' : '#8a8678'};font-size:10px">
          ${spectreAttunable(acc, def)
            ? (this.grimoireSkills().length
              ? '★ Mastered: drag this page (or click to lift it) onto a Spectre slot above to attune.'
              : '★ Mastered: a Spectre skill, once learned, binds this form here at the book.')
            : '★ Mastered: too mighty a form for spectral binding.'}</div>`;
      }
      // The STUDY PORTRAIT: the creature itself, large and alive, beside its
      // revealed page — the intimate read the tiers were building toward.
      detail = `<div style="border:1px solid #3a3a52;border-radius:4px;padding:8px;margin-top:8px;background:rgba(20,20,30,0.5)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          ${this.monsterPortraitHtml(def, false, BESTIARY_CFG.portrait.detail, true)}
          <div style="flex:1;min-width:0"><b style="font-size:14px">${def.name}</b>${
            def.boss ? ' <span style="color:#e64db4;font-size:10px">BOSS</span>' : ''}
            <div style="color:#8a8678;font-size:10px;margin-top:2px">as it walks the world, drawn from the hunt itself</div>
          </div></div>
        ${body}</div>`;
    }

    // The RELEASE counter: bonded companions present themselves at the fire
    // (the only place a bond may be undone — the whistle never unbinds).
    // Couch: the fire shows the OPENER's bonds (the seat that dwelt here).
    const world = this.getWorld();
    const bestiarySeat = this.panelSeat(this.bestiaryMenu);
    const companions = world.actors.filter(a => a.companion && !a.dead && a.owner === world.seatHero(bestiarySeat));
    const release = companions.length ? `
      <div style="border-top:1px solid #2a2a3a;margin-top:8px;padding-top:6px">
        <div style="color:#a8c87a;font-size:11px;margin-bottom:4px">Bonded companions</div>
        ${companions.map(c => `<div class="bind-btns" style="margin:2px 0;display:flex;align-items:center;gap:7px">
          ${this.actorPortraitHtml(c, BESTIARY_CFG.portrait.companion)}
          <span style="font-size:11px;flex:1;min-width:0">${c.name}${c.downed ? ' <span style="color:#e8a860">(down)</span>' : ''} — Lv ${c.level}</span>
          <button data-untame="${c.id}">Release to the wild</button></div>`).join('')}
      </div>` : '';

    // THE GRIMOIRE STRIP — the binding site itself. One slot per learned
    // grimoire-summon INSTANCE (two Spectre gems, two slots, two forms);
    // a mastered page dropped here attunes THAT copy, the ✕ releases it.
    // Only rendered when a slot exists — the book stays a pure ledger for
    // everyone else. The engine gate (attuneAtBook) lives in World, not
    // here; the strip is merely where the targets are.
    const grimSkills = this.grimoireSkills();
    const grim = grimSkills.length ? `
      <div style="border:1px solid #4a3a5a;border-radius:4px;padding:6px 8px;margin-bottom:6px;background:rgba(30,24,40,0.45)">
        <div style="color:#c8a8ff;font-size:10px;margin-bottom:3px">
          SPECTRE GRIMOIRE: forms bind here, at the open book. In the field you fight with what you carried out.
        </div>
        ${grimSkills.map(inst => {
          const form = inst.attunedForm ? MONSTERS[inst.attunedForm] : undefined;
          return `<span class="spec-slot" data-drop="spectreSlot:${inst.def.id}">
            <span style="color:${inst.def.color};font-size:10px">${inst.def.name} Lv ${inst.level}</span>
            ${form
              ? `${this.monsterPortraitHtml(form, false, BESTIARY_CFG.portrait.grimoire)} <span style="color:#a8d8a0">${form.name}</span>
                 <button data-slot-release="${inst.def.id}" title="Release the attunement (back to corpse-reading)">✕</button>`
              : '<span class="empty">drag a mastered ★ form here</span>'}
          </span>`;
        }).join('')}
      </div>` : '';

    this.bestiaryMenu.innerHTML = `
      ${this.closeGlyphHtml()}<h2 style="margin-bottom:2px">The Tracker's Bestiary</h2>
      <div style="color:#8a8678;font-size:10px;margin-bottom:6px">
        ${totals.sighted} of ${totals.pages} kinds sighted · ${totals.mastered} mastered; knowledge is the account's, and outlives you.
      </div>
      ${grim}
      <div class="b-grid">${rows}</div>
      <div class="bind-btns" style="display:flex;justify-content:space-between;align-items:center">
        <button data-bpage="-1" ${this.bestiaryPage <= 0 ? 'disabled' : ''}>◀ Prev</button>
        <span style="color:#8a8678;font-size:10px">leaf ${this.bestiaryPage + 1} / ${pages}</span>
        <button data-bpage="1" ${this.bestiaryPage >= pages - 1 ? 'disabled' : ''}>Next ▶</button>
      </div>
      ${detail}
      ${release}
      <div class="bind-btns" style="margin-top:8px"><button data-bst-close>Close the book</button></div>`;

    const q = <T extends HTMLElement>(sel: string): T[] => [...this.bestiaryMenu.querySelectorAll<T>(sel)];
    q<HTMLElement>('[data-bst]').forEach(el => el.addEventListener('click', () => {
      if (!el.dataset.bst) return; // a dark page holds its secrets
      this.bestiarySel = el.dataset.bst;
      this.refreshBestiary();
    }));
    q<HTMLButtonElement>('button[data-bpage]').forEach(btn => btn.addEventListener('click', () => {
      this.bestiaryPage += Number(btn.dataset.bpage);
      this.refreshBestiary();
    }));
    q<HTMLButtonElement>('button[data-untame]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'untameCompanion', actorId: Number(btn.dataset.untame) });
      this.refreshBestiary();
    }));
    // Release an attuned form (the slot's ✕) — same intent lane as the drop,
    // formId '' releases; the engine's binding-site gate rules here too.
    q<HTMLButtonElement>('button[data-slot-release]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'attuneSpectre', skillId: btn.dataset.slotRelease!, formId: '' });
      this.refreshBestiary();
      if (this.inventoryOpen) this.refreshInventory();
    }));
    this.bestiaryMenu.querySelector<HTMLButtonElement>('[data-bst-close]')?.addEventListener('click', () => this.closeBestiary());

    // The HTML above declared its portrait canvases — fill them from the
    // fabric's tile cache, then set the open entry's portrait breathing.
    this.paintPortraitsIn(this.bestiaryMenu);
    this.animateBestiaryDetail();
  }

  // ------------------------------------------------------------ oracle stone

  showOracle(seatId?: string): void {
    this.ownPanel(this.oracleMenu, this.couchSeatFor(seatId));
    this.oracleOpen = true;
    this.oracleMenu.classList.remove('hidden');
    this.refreshOracle();
  }

  closeOracle(): void {
    this.oracleOpen = false;
    this.oracleMenu.classList.add('hidden');
    this.oracleTargetUid = null;
    hideTooltip();
  }

  refreshOracle(): void {
    if (!this.oracleOpen) return;
    const world = this.getWorld();
    const seat = this.panelSeat(this.oracleMenu);
    const m = seat.meta;
    const targets = [...m.items, ...Object.values(m.equipped).filter((x): x is ItemInstance => !!x)]
      .filter(i => i.affixes.some(a => !a.crafted));
    const targetRows = targets.map(i =>
      `<button data-otar="${i.uid}" class="${this.oracleTargetUid === i.uid ? 'bound' : ''}"
        data-tip="item" data-item-uid="${i.uid}"
        style="color:${ITEM_RARITIES[i.rarity].color}">${i.name}</button>`,
    ).join(' ') || '<span style="color:#8a8678;font-size:11px">Nothing you carry bears a natural affix.</span>';
    const target = targets.find(i => i.uid === this.oracleTargetUid);
    let affixRows = '<div style="color:#8a8678;font-size:11px">Lay a piece on the stone (pick one above).</div>';
    if (target) {
      const cost = oracleRerollCost(target.rarity);
      const afford = world.canAffordEssence(world.localSeat, cost);
      affixRows = target.affixes.map((a, idx) => {
        const def = ITEM_AFFIXES[a.id];
        const tierDef = def?.tiers[a.tier];
        if (!def || !tierDef) return '';
        const line = def.lines.map((ln, i) => {
          const roll = ln.sharedRoll ? a.rolls[0] : a.rolls[i];
          return formatModLine(ln, roundStatValue(lerpRange(tierDef.ranges[i], roll ?? 0.5)));
        }).join(' · ');
        const state = a.crafted ? '<span style="color:#8a8678">bench-work: the stone will not touch it</span>'
          : a.locked ? '<span style="color:#8a8678">🔒 sealed: the stone has spoken</span>'
          : `<button data-commune="${target.uid}:${idx}" ${afford ? '' : 'disabled'}>
              Commune (${this.essCostText(cost)})${afford ? '' : ' — not enough'}</button>`;
        return `<div class="skill-entry">
          <div class="name" style="font-size:11px">${line}</div>
          <div class="bind-btns">${state}</div>
        </div>`;
      }).join('');
      affixRows += `<div style="color:#8a8678;font-size:10px;margin-top:4px">
        A communed line rerolls within what this item could legally carry, then SEALS forever. Trace well.</div>`;
    }
    this.oracleMenu.innerHTML = `
      ${this.closeGlyphHtml()}<h2>The Oracle Stone</h2>
      <div class="desc" style="color:#8a8678;font-size:10px;margin-bottom:6px">
        ${this.essWallet()}</div>
      <h3>Piece</h3><div class="bind-btns">${targetRows}</div>
      <h3>Lines</h3>${affixRows}
      <div class="bind-btns" style="margin-top:8px"><button data-oracle-close>Step back</button></div>`;

    const q = <T extends HTMLElement>(sel: string): T[] => [...this.oracleMenu.querySelectorAll<T>(sel)];
    q<HTMLButtonElement>('button[data-otar]').forEach(btn => btn.addEventListener('click', () => {
      this.oracleTargetUid = Number(btn.dataset.otar);
      this.refreshOracle();
    }));
    q<HTMLButtonElement>('button[data-commune]').forEach(btn => btn.addEventListener('click', () => {
      // THE COMMUNION MINIGAME: trace the runes; precision + haste = score.
      if (this.minigameActive) return;
      const [uid, idx] = btn.dataset.commune!.split(':');
      this.minigameActive = true;
      runRuneMinigame(({ score }) => {
        this.minigameActive = false;
        world.requestMeta({ t: 'rerollAffix', uid: Number(uid), affix: Number(idx), score });
        this.refreshOracle();
        this.refreshCharSheet();
      });
    }));
    this.oracleMenu.querySelector<HTMLButtonElement>('[data-oracle-close]')?.addEventListener('click', () => this.closeOracle());
  }

  // ---------------------------------------------------------- vendor screen

  showVendor(seatId?: string): void {
    this.ownPanel(this.vendorMenu, this.couchSeatFor(seatId));
    this.vendorOpen = true;
    // THE BREAKER'S EYE, abroad (the salvage baseline): arriving at a
    // counter whose scrap gate is open ARMS the wheel and opens the bag
    // beside it — the inventory IS the sell menu, exactly as the bench
    // arms its hammer (SALVAGE_AUTO_ARM is the one seam for that choice;
    // the host's own nearScrapVendor read keeps the arm honest).
    if (SALVAGE_AUTO_ARM && this.getWorld().nearScrapVendor(this.panelSeat(this.vendorMenu))) {
      this.scrapMode = true;
      if (!this.inventoryOpen) this.toggleInventory(seatId);
    }
    this.vendorMenu.classList.remove('hidden');
    this.refreshVendor();
    this.refreshInventory(); // re-render the bag with the wheel's verbs armed
    // THE LIVE COUNTER: tick the restock countdown IN PLACE (no rebuild —
    // hovers, tooltips and the order-search box all survive); when a restock
    // actually lands the shelves changed, so THAT repaints whole (the search
    // box's focus is preserved through the rebuild).
    if (this.vendorTicker === null) {
      this.vendorTicker = window.setInterval(() => {
        if (!this.vendorOpen) return;
        const world = this.getWorld();
        if (world.vendorRestockAt !== this.vendorTickerRestockAt) { this.refreshVendor(); return; }
        for (const el of this.vendorMenu.querySelectorAll<HTMLElement>('[data-vheadline]')) {
          const v = VENDORS.find(x => x.id === el.dataset.vheadline);
          if (v?.headline) el.textContent = `· ${v.headline(world)}`;
        }
      }, 500);
    }
  }

  closeVendor(): void {
    this.vendorOpen = false;
    this.scrapMode = false;
    this.vendorCommOpen = null;
    this.vendorCommQuery = '';
    if (this.vendorTicker !== null) { window.clearInterval(this.vendorTicker); this.vendorTicker = null; }
    this.applyBreakChrome(); // sheds the ⚙ from counter AND bag together
    this.vendorMenu.classList.add('hidden');
    if (this.inventoryOpen) this.refreshInventory(); // shed the sell verbs
    hideTooltip();
  }

  // --- THE BOROUGH ARMING PANEL (packages/defs/borough.ts) -------------------
  // Opened by the arming dwell (world.boroughArmRequested → main.ts). One
  // villager per parley; gifts and essence route through requestMeta like
  // every meta mutation (host-authoritative, co-op-replicated).

  showBorough(folkId: number): void {
    this.boroughFolkId = folkId;
    this.boroughOpen = true;
    this.boroughMenu.classList.remove('hidden');
    this.refreshBorough();
  }

  closeBorough(): void {
    this.boroughOpen = false;
    this.boroughFolkId = -1;
    this.boroughMenu.classList.add('hidden');
    delete this.boroughMenu.dataset.drop;
    hideTooltip();
  }

  refreshBorough(): void {
    if (!this.boroughOpen) return;
    const world = this.getWorld();
    const v = world.boroughArmView(this.boroughFolkId);
    if (!v) { this.closeBorough(); return; } // the folk fell or the stand resolved — parley over
    const m = world.localSeat.meta;
    const stage = v.stage === 'muster'
      ? `the horde comes: <b>${Math.ceil(v.timer)}s</b> to prepare`
      : v.stage === 'assault'
        ? `<b style="color:#d85a4a">UNDER ASSAULT</b> — ${Math.ceil(v.timer)}s of fury left`
        : '<b style="color:#d85a4a">drive off the stragglers!</b>';
    const lifePct = Math.round(100 * v.folk.life / Math.max(1, v.folk.maxLife()));
    const gearRows = m.items.map(i =>
      `<button data-bgive="${i.uid}" data-tip="item" data-item-uid="${i.uid}"
        style="color:${ITEM_RARITIES[i.rarity].color}">${i.name}</button>`).join(' ')
      || '<span style="color:#8a8678;font-size:11px">Your bag is empty.</span>';
    const essRows = ESSENCE_IDS.map(id => {
      const pkg = v.arming.essence[id];
      if (!pkg) return '';
      const have = m.essences[id] ?? 0;
      const stacks = v.stacks[id] ?? 0;
      const capped = stacks >= pkg.maxStacks;
      const e = ESSENCES[id];
      return `<div style="display:flex;align-items:center;gap:8px;margin:2px 0">
        <span style="color:${e.color};min-width:150px">${e.glyph} ${e.label}</span>
        <span style="font-size:11px;color:#b8b4a4;flex:1">${pkg.label}
          <span style="color:#8a8678">(${stacks}/${pkg.maxStacks})</span></span>
        <button data-bess="${id}" ${capped || have < pkg.cost ? 'disabled' : ''}>
          ${capped ? 'sated' : `${pkg.cost} ${e.glyph} (have ${have})`}</button>
      </div>`;
    }).join('');
    // The whole panel is a drop target: drag a bag piece onto it to gift it.
    this.boroughMenu.dataset.drop = `armFolk:${v.folk.id}`;
    this.boroughMenu.innerHTML = `
      ${this.closeGlyphHtml()}<h3 style="color:#e8c87a">⌂ Arm ${v.folk.name}</h3>
      <div style="font-size:12px;color:#b8b4a4;margin-bottom:6px">
        ${stage} &nbsp;·&nbsp; folk standing: <b>${v.folkAlive}/${v.folkTotal}</b>
        &nbsp;·&nbsp; ${v.folk.name}: ${lifePct}% &nbsp;·&nbsp; gifts ${v.gifts}/${v.maxGifts}
      </div>
      <div style="font-size:11px;color:#8a8678;margin-bottom:4px">
        Gift a piece of gear (drag it onto this panel, or click below); its lines become theirs, for good.</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;max-height:130px;overflow-y:auto">${gearRows}</div>
      <div style="margin-top:8px;font-size:11px;color:#8a8678">…or pour essence into their blood (coarse and above):</div>
      ${essRows}
      <div class="bind-btns" style="margin-top:8px"><button data-borough-close>Step back</button></div>`;
    const q = <T extends HTMLElement>(sel: string): T[] => [...this.boroughMenu.querySelectorAll<T>(sel)];
    const refresh = (): void => { this.refreshBorough(); this.refreshInventory(); };
    q<HTMLButtonElement>('button[data-bgive]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'armFolkItem', folkId: this.boroughFolkId, uid: Number(btn.dataset.bgive) });
      refresh();
    }));
    q<HTMLButtonElement>('button[data-bess]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'armFolkEssence', folkId: this.boroughFolkId, essence: btn.dataset.bess! });
      refresh();
    }));
    q<HTMLButtonElement>('button[data-borough-close]').forEach(btn =>
      btn.addEventListener('click', () => this.closeBorough()));
  }

  /** THE STANDING ORDER's picker: one row per gem the DROP INDEX has SEEN
   *  (unlocked for drops + at least one genuine mint on the ledger).
   *  Eligible rows (count ≥ need, rollable here) commission; the rest show
   *  their progress — the bestiary's fill-bar doctrine on the gem shelf. */
  private commissionPickerHtml(world: World, v: VendorDef): string {
    const need = VENDOR_CFG.commission.need;
    const acc = world.account;
    const query = this.vendorCommQuery.trim().toLowerCase();
    interface PickRow {
      kind: 'skill' | 'support'; id: string; name: string; color: string;
      count: number; odds: number;
    }
    const rows: PickRow[] = [];
    for (const s of SKILL_LIST) {
      if (s.noDrop || !isSkillUnlockedForDrop(acc, s.id)) continue;
      const count = acc.ledger[gemDropKey(s.id)] ?? 0;
      if (!count) continue; // the index has never seen it — not yet a name to give
      if (query && !s.name.toLowerCase().includes(query)) continue;
      rows.push({ kind: 'skill', id: s.id, name: s.name, color: s.color,
        count, odds: world.commissionOdds({ kind: 'skill', id: s.id }) });
    }
    for (const d of SUPPORT_LIST) {
      if (!isSupportUnlockedForDrop(acc, d.id)) continue;
      const count = acc.ledger[gemDropKey(d.id)] ?? 0;
      if (!count) continue;
      if (query && !d.name.toLowerCase().includes(query)) continue;
      rows.push({ kind: 'support', id: d.id, name: d.name, color: d.color,
        count, odds: world.commissionOdds({ kind: 'support', id: d.id }) });
    }
    rows.sort((a, b) =>
      (b.count >= need ? 1 : 0) - (a.count >= need ? 1 : 0)
      || b.count - a.count || a.name.localeCompare(b.name));
    const CAP = 40;
    const shown = rows.slice(0, CAP);
    const oddsText = (p: number): string => p < 0.01 ? '<1%' : `~${Math.round(p * 100)}%`;
    const line = (r: PickRow): string => {
      const ready = r.count >= need && r.odds > 0;
      const why = r.count < need ? `${r.count}/${need} found`
        : r.odds <= 0 ? 'not rollable here yet'
        : `${oddsText(r.odds)} each restock`;
      return `<div style="display:flex;align-items:center;gap:6px;margin:1px 0;${ready ? '' : 'opacity:0.55'}">
        <span style="color:${r.color};flex:1">${esc(r.name)}</span>
        <span style="font-size:10px;color:#8a8678">${r.kind === 'skill' ? 'skill' : 'support'} · ${why}</span>
        <button data-vcomm-pick="${v.id}:${r.kind}:${r.id}" ${ready ? '' : 'disabled'}>Commission</button>
      </div>`;
    };
    return `
      <div style="margin-top:6px;border:1px dashed ${v.accent}55;border-radius:4px;padding:6px">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
          <input data-vcomm-search type="text" placeholder="Search the drop index…" value="${esc(this.vendorCommQuery)}"
            style="flex:1;background:#141210;border:1px solid #3a352c;color:#d8d4c8;padding:3px 6px;font:inherit;font-size:11px">
          <button data-vcomm-close>Close</button>
        </div>
        <div style="max-height:180px;overflow-y:auto">
          ${shown.map(line).join('') || `<div style="color:#8a8678;font-size:11px">The index knows nothing by that name; Memories are indexed as they actually DROP (${need} finds name one).</div>`}
        </div>
        ${rows.length > CAP ? `<div style="color:#8a8678;font-size:10px;margin-top:3px">…${rows.length - CAP} more; refine the search.</div>` : ''}
      </div>`;
  }

  refreshVendor(): void {
    if (!this.vendorOpen) return;
    const world = this.getWorld();
    const seat = this.panelSeat(this.vendorMenu);
    const near = VENDORS.filter(v => v.near(world, seat));
    // The order-search box must survive the rebuild (the ticker, a buy, a
    // keystroke all repaint) — capture focus + caret, restore after.
    const prevSearch = this.vendorMenu.querySelector<HTMLInputElement>('input[data-vcomm-search]');
    const searchFocused = !!prevSearch && document.activeElement === prevSearch;
    const caret = searchFocused ? prevSearch.selectionStart : null;
    this.vendorTickerRestockAt = world.vendorRestockAt;
    const isClient = !!world.clientActionHook;

    const sections = near.map(v => {
      // THE PATRON'S HOLD, drawn: the hold key + capacity (a NET client draws
      // against the HOST's ledger, mirrored off the snapshot).
      const holdKey = world.vendorHoldKey(v);
      const canLock = !!v.holds?.locks;
      const lockCap = isClient ? (world.netVendorCap ?? 0) : world.vendorLockCap();
      const hold = world.vendorHolds[holdKey];
      const lockedCount = hold?.locks.filter(r => !r.commission).length ?? 0;
      const stock = v.stock(world);

      // THE TRADE GATE — the engine's own predicate (a NET client reads the
      // snapshot mirror: the keeper's market, the keeper's law; absent
      // fields on an older host read as open). The gem case's FACE seal
      // retired with the one-shelf fold (skill-items M3): what stands in
      // the stock is honestly buyable — FEATURE.VENDOR_GEMS gates the
      // true-gem share at the stock builder now.
      const tradeRefusal = isClient
        ? (world.netVendorTradeOpen === false ? VENDOR_CFG.trade.hint : null)
        : world.vendorTradeRefusal(v);

      // --- shared per-entry pieces (indices are STOCK indices — the buy and
      // lock intents speak the one array both faces draw from) --------------
      // Essence is the ONE counter currency (the delver's old echo lane is
      // gone). THE ENTRY LOCK lane (VendorDef.entryLock — the delver's depth
      // locks) disables per entry through the same predicate the engine
      // refuses with.
      const priceBits = (e: VendorEntry): { afford: boolean; priceHtml: string } => {
        const price = v.priceOf(world, e);
        const afford = (price.essences ?? []).every(c => world.canAffordEssence(seat, c));
        const priceHtml = (price.essences ?? []).map(c => this.essCostText(c)).join(' + ');
        return { afford, priceHtml };
      };
      const entryLockOf = (e: VendorEntry): string | null => v.entryLock?.(world, e) ?? null;
      const lockTitleFor = (heldRow: VendorHoldRow | undefined, atCap: boolean): string => heldRow
        ? (heldRow.commission
          ? 'Release the standing order\'s find (the watch resumes; the slot re-rolls next restock)'
          : 'Release this reserve: the slot re-rolls on the next restock')
        : atCap ? `The reserve ledger holds ${lockCap}; release one first`
        : 'Reserve this slot: it will not re-roll until bought or released';

      // --- THE COUNTER GLASS — the ONE face (skill-items M3, §6): the
      // whole shelf packs into the grid through the bag's own cell law —
      // gear by footprint, Memory pouches and gem finds as 1×1 tiles, side
      // by side. Hover for the full story; click the glass to buy, the
      // corner pip reserves. (The gems tab, its seal, and the list rows
      // retired with the fold.)
      const waresGrid = ((): string => {
        const CELL = 34;
        const pack = world.vendorGridPack(stock, v.grid);
        const b = pack.board;
        let cells = '';
        for (let y = 0; y < b.h; y++) {
          for (let x = 0; x < b.w; x++) {
            cells += `<div style="position:absolute;left:${x * CELL}px;top:${y * CELL}px;
              width:${CELL - 2}px;height:${CELL - 2}px;background:#16131d;border:1px solid #2a2634"></div>`;
          }
        }
        let tiles = '';
        let overflowRows = '';
        stock.forEach((e, idx) => {
          const { afford, priceHtml } = priceBits(e);
          const entryLock = entryLockOf(e);
          const heldRow = canLock ? world.vendorEntryHold(holdKey, e) : undefined;
          const atCap = !heldRow && lockedCount >= lockCap;
          const canBuy = afford && !tradeRefusal && !entryLock;
          const lockPip = canLock && (lockCap > 0 || heldRow)
            ? `<button data-vlock="${v.id}:${idx}" ${atCap ? 'disabled' : ''} title="${lockTitleFor(heldRow, atCap)}"
                style="position:absolute;top:-1px;right:-1px;z-index:2;font-size:9px;line-height:1;padding:1px 2px;
                background:#141019cc;border:1px solid ${heldRow ? v.accent : '#3a3644'};border-radius:0 3px 0 3px;cursor:var(--cursor-point, pointer)">${heldRow ? '🔒' : '🔓'}</button>`
            : '';
          const badge = heldRow
            ? `<div style="position:absolute;bottom:1px;left:0;right:0;text-align:center;font-size:8px;color:${heldRow.commission ? '#7fe0d8' : v.accent}">${heldRow.commission ? 'ORDER' : 'RESERVED'}</div>`
            : entryLock
              ? `<div style="position:absolute;bottom:1px;left:0;right:0;text-align:center;font-size:8px;color:#8a8678">🔒${e.depthReq ? ` D${e.depthReq}` : ''}</div>`
              : '';
          if (e.kind !== 'item') {
            // A GEM find: a 1×1 tile wearing the gem's own color + initials
            // (THE ICON LAW's counter face); the rich card rides the vgem
            // tooltip lane off the LIVE stock entry.
            const name = e.kind === 'skill' ? e.inst.def.name : e.gem.def.name;
            const col = e.kind === 'skill' ? SKILL_RARITIES[e.inst.rarity ?? 'common'].color : e.gem.def.color;
            const at = pack.gemCells.get(idx);
            if (!at) {
              overflowRows += `
                <div class="skill-entry" style="border-left:3px solid ${col}" data-tip="vgem" data-vgem="${v.id}:${idx}">
                  <div class="name" style="color:${col}">${name}</div>
                  <div class="bind-btns"><button data-vbuy="${v.id}:${idx}" ${canBuy ? '' : 'disabled'}>Buy (${priceHtml})</button></div>
                </div>`;
              return;
            }
            tiles += `<div data-tip="vgem" data-vgem="${v.id}:${idx}" ${canBuy ? `data-vbuy="${v.id}:${idx}"` : ''}
              style="position:absolute;left:${at.x * CELL}px;top:${at.y * CELL}px;
              width:${CELL - 2}px;height:${CELL - 2}px;background:#1c1626;
              border:2px solid ${heldRow ? v.accent : col};border-radius:3px;cursor:${canBuy ? 'var(--cursor-point, pointer)' : 'var(--cursor-default, default)'};box-sizing:border-box;
              display:flex;align-items:center;justify-content:center;
              ${e.kind === 'skill' && e.inst.rarity === 'legendary' ? `box-shadow:0 0 10px ${col};` : ''}${canBuy ? '' : 'opacity:0.55;'}">
              <span style="width:22px;height:22px;border-radius:4px;background:${col}33;border:1px solid ${col};
                display:flex;align-items:center;justify-content:center;font-size:8px;color:${col}">${gemInitials(name)}</span>
              ${lockPip}${badge}</div>`;
            return;
          }
          const i = e.item;
          const at = pack.cells.get(i.uid);
          if (!at) {
            // The glass genuinely overflowed (the probe should have caught
            // content outgrowing it) — list the piece honestly below.
            overflowRows += `
              <div class="skill-entry" style="border-left:3px solid ${ITEM_RARITIES[i.rarity].color}" data-tip="item" data-item-uid="${i.uid}">
                <div class="name" style="color:${ITEM_RARITIES[i.rarity].color}">${i.name} <span style="color:#9a94a8;font-size:10px">ilvl ${i.ilvl}</span></div>
                <div class="bind-btns"><button data-vbuy="${v.id}:${idx}" ${canBuy ? '' : 'disabled'}>Buy (${priceHtml})</button></div>
              </div>`;
            return;
          }
          const s = itemGridSize(i);
          const r = ITEM_RARITIES[i.rarity];
          const cat = ITEM_BASES[i.baseId]?.category ?? 'ring';
          // A MEMORY POUCH stack wears its kind's own face (color, glyph,
          // the unit-count badge) — the bag tile's counter twin.
          const mkind = memoryKindOf(i);
          const mk = mkind ? MEMORY_KINDS[mkind] : null;
          const face = mk
            ? `<span style="width:22px;height:22px;border-radius:4px;background:${mk.color}22;border:1px solid ${mk.color};
                display:flex;align-items:center;justify-content:center;font-size:11px;color:${mk.color}">${mk.glyph}</span>
              <span style="position:absolute;bottom:1px;right:1px;font-size:9px;line-height:10px;padding:0 2px;
                background:#241d2e;border:1px solid ${mk.color};border-radius:3px;color:#e8e0f8">${i.mem!.length}</span>`
            : (CATEGORY_GLYPHS[cat] ?? '?');
          tiles += `<div data-tip="item" data-item-uid="${i.uid}" ${canBuy ? `data-vbuy="${v.id}:${idx}"` : ''}
            title="${entryLock ? esc(entryLock) : tradeRefusal ? esc(tradeRefusal) : afford ? `Buy: ${esc(i.name)}` : 'Not enough essence'}"
            style="position:absolute;left:${at.x * CELL}px;top:${at.y * CELL}px;
            width:${s.w * CELL - 2}px;height:${s.h * CELL - 2}px;background:${mk ? '#1c1626' : '#221e2c'};
            border:2px solid ${heldRow ? v.accent : (mk ? mk.color : r.color)};border-radius:3px;cursor:${canBuy ? 'var(--cursor-point, pointer)' : 'var(--cursor-default, default)'};box-sizing:border-box;
            display:flex;align-items:center;justify-content:center;font-size:${Math.min(s.w, s.h) > 1 ? 16 : 12}px;
            ${i.rarity === 'unique' ? `box-shadow:0 0 10px ${r.color};` : ''}${canBuy ? '' : 'opacity:0.55;'}">${face}${lockPip}${badge}</div>`;
        });
        const empty = stock.length === 0
          ? '<div style="color:#8a8678;font-size:11px;margin-top:4px">The shelf stands empty; come back after the restock.</div>' : '';
        return `
          <div style="position:relative;width:${b.w * CELL}px;height:${b.h * CELL}px;margin-top:2px">${cells}${tiles}</div>
          ${overflowRows}${empty}
          <div style="margin-top:4px;color:#8a8678;font-size:10px">hover a ware for its full story · click it to buy${canLock && lockCap > 0 ? ' · the corner pip reserves it' : ''}</div>`;
      })();

      // THE STANDING ORDER strip (feature-gated; the Vault sells discovery,
      // so an un-bought rung shows nothing). A NET client's panel stays
      // quiet here — the order reads the KEEPER's account (host-side).
      const commStrip = ((): string => {
        if (!v.holds?.commission || isClient) return '';
        if (!featureEnabled(world.account, FEATURE.VENDOR_COMMISSION)) return '';
        const c = hold?.commission;
        const found = hold?.locks.find(r => r.commission);
        const cDef = c ? (c.kind === 'skill' ? SKILLS[c.id] : SUPPORTS[c.id]) : undefined;
        const cName = c ? (cDef?.name ?? c.id) : null;
        const status = !c ? '<span style="color:#8a8678">none placed</span>'
          : found ? `<b style="color:${cDef?.color ?? '#7fe0d8'}">${esc(cName!)}</b>: <span style="color:#7fe0d8">found; it waits reserved on the shelf</span>`
          : `<b style="color:${cDef?.color ?? '#d8d4c8'}">${esc(cName!)}</b>: the counter watches (${((): string => {
            const p = world.commissionOdds(c);
            return p < 0.01 ? '<1%' : `~${Math.round(p * 100)}%`;
          })()} each restock)`;
        return `
          <div style="margin-top:8px;border-top:1px dashed ${v.accent}55;padding-top:6px;font-size:11px">
            ✒ Standing order: ${status}
            ${c ? `<button data-vcomm-cancel="${v.id}" style="margin-left:6px">Withdraw</button>` : ''}
            <button data-vcomm-open="${v.id}" style="margin-left:6px">${c ? 'Change…' : 'Place an order…'}</button>
            ${this.vendorCommOpen === v.id ? this.commissionPickerHtml(world, v) : ''}
          </div>`;
      })();

      // The SELL lane: counters whose scrap gate is OPEN carry the full
      // salvage cluster on the SELL lane — the Breaker's Eye abroad (the
      // wheel arms like the bench's hammer, the bag is the sell menu, THE
      // SWEEPS sell by category, the keeper's locks refuse throughout). A
      // gated-shut counter explains itself (salvageLocked) — the Vault
      // sells the key.
      const scrap = v.salvage?.(world) ? `
        <div style="margin-top:8px;border-top:1px dashed ${v.accent}55;padding-top:6px">
          ${this.salvageClusterHtml(seat, 'sell', this.scrapMode)}
        </div>` : (v.salvage && v.salvageLocked ? `
        <div style="margin-top:8px;border-top:1px dashed ${v.accent}55;padding-top:6px;color:#8a8678;font-size:11px">
          🔒 ${v.salvageLocked}</div>` : '');

      const reserveBadge = canLock && lockCap > 0
        ? ` <span style="opacity:0.8;font-size:10px;font-weight:normal">· 🔒 ${lockedCount}/${lockCap} reserved</span>`
        : '';
      // THE TRADE GATE strip: above the shelf — the whole counter explains
      // its shut till once.
      const tradeStrip = tradeRefusal
        ? `<div style="margin:4px 0;padding:5px 7px;border:1px dashed #8a6a3a88;border-radius:4px;color:#c8a86a;font-size:11px">🔒 ${esc(tradeRefusal)}</div>`
        : '';
      // THE ABILITY-ESSENCE SELL LANE (ABILITY_ESSENCE_CFG.vendor): tier
      // chips priced in tints, sell-direction only. Availability by wares
      // rung (deep counters waive) through the engine's OWN refusal
      // predicate — the panel and the buy handler can never disagree.
      const essStrip = `<div style="margin:2px 0 6px;font-size:10px;color:#8a8678">
        Memory Essence:
        ${ABILITY_ESSENCES.map(d => {
          const price = ABILITY_ESSENCE_CFG.vendor.prices[d.tier - 1];
          if (!price) return '';
          const why = world.abilityEssTierRefusal(v, d.tier);
          const afford = world.canAffordEssence(seat, price);
          return `<button data-vabuy="${v.id}:${d.tier}" ${tradeRefusal || why || !afford ? 'disabled' : ''}
            title="${why ? esc(why) : `1× ${d.label} for ${price.count}× ${ESSENCES[price.essence].label}`}">
            <span style="color:${d.color}">${d.glyph}${d.label.split(' ').pop()}</span> (${this.essCostText(price)})${why ? ' 🔒' : ''}</button>`;
        }).join('')}
      </div>`;
      // THE ONE FACE (M3): the packed glass, THE STANDING ORDER strip
      // re-homed beneath it (the gems tab it lived in retired), the scrap
      // wheel last.
      const body = `${waresGrid}${commStrip}${scrap}`;
      return `
        <div style="border:1px solid ${v.accent}44;border-radius:4px;padding:8px;margin-bottom:10px;background:${v.bg}">
          <div style="color:${v.accent};font-weight:bold;font-size:12px;margin-bottom:4px">
            ${v.label}${v.headline ? ` <span data-vheadline="${v.id}" style="opacity:0.7;font-size:10px;font-weight:normal">· ${v.headline(world)}</span>` : ''}${reserveBadge}</div>
          ${tradeStrip}
          ${essStrip}
          ${body}
        </div>`;
    }).join('') || '<div style="color:#8a8678;font-size:11px">No counter at hand; find a vendor and linger.</div>';

    this.vendorMenu.innerHTML = `
      ${this.closeGlyphHtml()}<h2>Vendors</h2>
      <div style="margin-bottom:6px">${this.essWallet()}</div>
      ${sections}
      <div class="bind-btns" style="margin-top:8px"><button data-vendor-close>Step away</button></div>`;

    const q = <T extends HTMLElement>(sel: string): T[] => [...this.vendorMenu.querySelectorAll<T>(sel)];
    const refresh = (): void => { this.refreshVendor(); this.refreshInventory(); };
    // Buy rides list buttons AND the glass's tiles alike — one attribute,
    // one handler (the selector is deliberately element-agnostic).
    q<HTMLElement>('[data-vbuy]').forEach(btn => btn.addEventListener('click', () => {
      const [vid, idx] = btn.dataset.vbuy!.split(':');
      const vendor = VENDORS.find(v => v.id === vid);
      if (!vendor) return;
      // buyT IS the intent literal — pass it through (a new counter's intent
      // needs no dispatch edit here, only its union arm + world handler).
      world.requestMeta({ t: vendor.buyT, index: Number(idx) });
      refresh();
    }));
    // The Ability Essence sell lane — one unit per click, tier by counter.
    q<HTMLButtonElement>('button[data-vabuy]').forEach(btn => btn.addEventListener('click', () => {
      const [vid, tier] = btn.dataset.vabuy!.split(':');
      world.requestMeta({ t: 'buyAbilityEss', vendor: vid, tier: Number(tier) });
      refresh();
    }));
    // THE PATRON'S HOLD: the toggle reads the row's CURRENT held state and
    // asks for the flip — the world validates capacity/nearness (host-side
    // in co-op; the client's optimistic repaint self-heals off the snapshot).
    // stopPropagation: a glass tile's corner pip sits INSIDE its buy surface —
    // the reserve click must never fall through into a purchase.
    q<HTMLButtonElement>('button[data-vlock]').forEach(btn => btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const [vid, idx] = btn.dataset.vlock!.split(':');
      const vendor = VENDORS.find(x => x.id === vid);
      if (!vendor) return;
      const entry = vendor.stock(world)[Number(idx)];
      const on = !(entry && world.vendorEntryHold(world.vendorHoldKey(vendor), entry));
      world.requestMeta({ t: 'vendorLock', vendor: vid, index: Number(idx), on });
      refresh();
    }));
    q<HTMLButtonElement>('button[data-vcomm-open]').forEach(btn => btn.addEventListener('click', () => {
      this.vendorCommOpen = btn.dataset.vcommOpen!;
      this.vendorCommQuery = '';
      this.refreshVendor();
    }));
    q<HTMLButtonElement>('button[data-vcomm-close]').forEach(btn => btn.addEventListener('click', () => {
      this.vendorCommOpen = null;
      this.refreshVendor();
    }));
    q<HTMLButtonElement>('button[data-vcomm-cancel]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'vendorCommission', vendor: btn.dataset.vcommCancel!, gem: null });
      refresh();
    }));
    q<HTMLButtonElement>('button[data-vcomm-pick]').forEach(btn => btn.addEventListener('click', () => {
      const [vid, kind, ...rest] = btn.dataset.vcommPick!.split(':');
      world.requestMeta({
        t: 'vendorCommission', vendor: vid,
        gem: { kind: kind as 'skill' | 'support', id: rest.join(':') },
      });
      this.vendorCommOpen = null;
      refresh();
    }));
    const search = this.vendorMenu.querySelector<HTMLInputElement>('input[data-vcomm-search]');
    search?.addEventListener('input', () => {
      this.vendorCommQuery = search.value;
      this.refreshVendor();
    });
    if (searchFocused && search) {
      search.focus();
      if (caret !== null) search.setSelectionRange(caret, caret);
    }
    // THE BREAKER'S EYE, abroad: the shared cluster's verbs, bound on the
    // SELL lane (bindSalvageCluster — the wheel toggle + the sell sweeps).
    this.bindSalvageCluster(this.vendorMenu, 'sell', {
      armed: () => this.scrapMode,
      setArmed: on => { this.scrapMode = on; },
      refresh: () => this.refreshVendor(),
    });
    this.vendorMenu.querySelector<HTMLButtonElement>('[data-vendor-close]')?.addEventListener('click', () => this.closeVendor());
    this.applyBreakChrome(); // the ⚙ rides the counter + the bag while the wheel is armed
  }

  /** Class-select starting-skill chip tooltip (name + quick description). */
  private classSkillTooltip(skillId: string): TooltipContent | null {
    const def = SKILLS[skillId];
    if (!def) return null;
    return { title: def.name, description: def.description, meta: def.tags.join(' · ') };
  }

  // -------------------------------------------------------------- skill book

  /** A cooldown as the player will actually wait it (skillCooldownSeconds),
   *  trimmed to the shortest honest precision. */
  private cdText(sec: number): string {
    return `${sec >= 10 ? Math.round(sec) : Math.round(sec * 100) / 100}s`;
  }

  private costText(cost: { mana: number; life: number }): string {
    const parts: string[] = [];
    if (cost.mana > 0) parts.push(`${cost.mana} mana`);
    if (cost.life > 0) parts.push(`<span style="color:#d05050">${cost.life} life</span>`);
    return parts.join(' + ') || 'free';
  }

  /** The LEARNED-SKILLS list — the skill book's body AND the gear tab's
   *  Build flap render this same full-management view (one build, two
   *  vantages; every button works in both). */
  private learnedListHtml(): string {
    const world = this.getWorld();
    const seat = this.panelSeat(this.inventory);
    const p = seat.actor;
    const m = seat.meta;
    // THE GRAFT BANK (data/passiveChoices.ts GraftSpec): every bindable
    // power the tree has granted — bound chips name their carrier, unbound
    // ones lift on click and land on the next skill row clicked. Same
    // requestMeta routing as every other build mutation.
    const graftSources = graftSourcesOf(m.allocated, m.choices, PASSIVE_NODES);
    const bankChips = graftSources.map(s => {
      const sup = SUPPORTS[s.graft.support];
      if (!sup) return '';
      const boundTo = m.grafts[s.key];
      const carrier = boundTo ? m.knownSkills.get(boundTo)?.def : undefined;
      const lifted = this.liftedGraftKey === s.key;
      return `<span class="gem-chip graft-chip ${lifted ? 'lifted' : ''}" data-graft-lift="${s.key}"
        style="border-color:${sup.color ?? '#b8a2e8'}" title="${s.name}: ${sup.name} — ${sup.description}
${carrier ? `Bound to ${carrier.name}. Click to lift and rebind.` : 'Unbound. Click, then click a skill to graft it on; no socket spent.'}">
        ✦ ${sup.name}${carrier ? ` → ${carrier.name}` : ' — unbound'}
        ${boundTo ? `<button data-graft-unbind="${s.key}">✕</button>` : ''}
      </span>`;
    }).join('');
    // THE WORN LEDGER (engine/world.ts WornGraftRow — recalcSeat's own
    // verdicts, one derivation one spelling): every slot-bound support the
    // seat's gear/passives grant, incl. dormant copies and empty seats, so
    // the whole hand is legible in one place. Read-only chips — the "bind"
    // gesture is the bar itself.
    const wornRows = seat.wornGrafts ?? [];
    const wornChips = wornRows.map(r => {
      const live = r.state === 'live';
      const word = live ? 'live on the skill seated there'
        : r.state === 'duplicate' ? 'DORMANT: that gem is already socketed there; the worn copy yields'
          : r.state === 'unfit' ? 'DORMANT: it does not fit the skill seated there (a socketed gem granting the mechanism would wake it)'
            : `EMPTY SEAT: bind a skill to Skill Slot ${r.slot + 1} and it rides`;
      return `<span class="gem-chip graft-chip" style="border-color:${live ? (r.def.color ?? '#b8a2e8') : '#4a4458'}${live ? '' : ';opacity:0.62'}"
        title="${r.def.description}
Worn graft: your gear grants this to Skill Slot ${r.slot + 1}; no socket spent. ${word}.">
        ✦ ${r.def.name} <b>L${r.level}</b> → Slot ${r.slot + 1}${live ? '' : ' — dormant'}</span>`;
    }).join('');
    const graftBank = (graftSources.length || wornRows.length) ? `
      <div class="graft-bank">
        ${graftSources.length ? `<span style="color:#b8a2e8;font-size:10px">Grafts${this.liftedGraftKey ? ' (click a skill to bind)' : ''}:</span>
        ${bankChips}` : ''}
        ${wornRows.length ? `<span style="color:#b8a2e8;font-size:10px">Worn:</span> ${wornChips}` : ''}
      </div>` : '';
    // MIREILLE'S LESSON at SEAT grain: while the one 'learn' step pends,
    // every EMPTY rack seat glows as the landing (teachSeat below) — the
    // same live, latched read as the bag-tile and flap glows (the flap
    // stops glowing once opened; these carry the gesture the rest of the
    // way). Occupied seats stay dark on purpose: the lesson teaches a
    // free seat, never an overwrite. Latch and step both live in the
    // world (mireilleGiftLesson/mireilleLessonSkills), so a seated flask
    // quiets the instant it lands, and a lived lesson never re-lights
    // here over a later unseat.
    const lessonSkills = world.mireilleGiftLesson() !== null ? world.mireilleLessonSkills() : [];
    // THE RACK OF EIGHT (skill-items charter M0 — docs/design/skill-items.md
    // §2, uncommitted): the drawer's headline surface. The bar's own array
    // drawn WHOLE — all BAR_SLOTS seats, empty ones as empty sockets, so
    // the cap of eight reads at a glance. Geometry 2×4 (seats 0–3 top,
    // 4–7 bottom — card 5's standing ruling; the canvas HUD stays 1×8,
    // THE HUD-FOLLOWS LAW is the charter's recorded debt). Reads the HERO
    // body's bar (seatHero — the array bindSkill/swapSkillSlots actually
    // edit), so drawn == mutated even while possessed. Seats are
    // drag-fabric citizens (installRackDnd): drag a seated skill between
    // seats to reorder — occupied SWAPS, empty moves — and drag a
    // holding-strip chip onto a seat to bind it there.
    const bar = world.seatHero(seat).skills;
    const labels = this.slotLabels();
    const seatTiles = labels.map((label, slot) => {
      const seated = bar[slot] ?? null;
      if (!seated) {
        const teachSeat = lessonSkills.length > 0;
        return `<div data-drop="rackSeat:${slot}" class="${teachSeat ? 'tut-glow' : ''}"
          title="Empty seat ${label} — drag a skill here to bind it"
          style="height:46px;border:1px dashed #4a4458;border-radius:5px;background:#1c1626;
            display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px">
          <span style="font-size:9px;color:#8a8678">${label}</span>
          <span style="font-size:12px;color:#3f3950;line-height:1">◇</span>
        </div>`;
      }
      const sd = seated.def;
      // THE ICON LAW (M1): the seat wears the skill's hotbar face — the
      // color swatch + initials the canvas bar prints, at seat scale.
      return `<div data-drag="rackSeat:${slot}" data-drop="rackSeat:${slot}"
        data-tip="skill" data-skill-id="${sd.id}"
        style="position:relative;height:46px;border:1px solid ${sd.color};border-radius:5px;
          background:#241d2e;padding:3px 5px;overflow:hidden;cursor:var(--cursor-point, pointer)">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-size:8px;color:var(--gold)">${label}</span>
          <button data-rackunbind="${slot}" title="Unlearn ${sd.name} — it returns to your pack as its Memory"
            style="background:none;border:none;color:#6a6478;cursor:var(--cursor-point, pointer);
              font-size:9px;padding:0 1px;line-height:1">✕</button>
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          <span style="flex:0 0 auto;display:flex;align-items:center;justify-content:center;
            width:15px;height:15px;border-radius:2px;background:${sd.color};opacity:0.9;
            color:#0a0a0e;font-weight:bold;font-size:7px;font-family:Verdana">${gemInitials(sd.name)}</span>
          <span style="min-width:0">
            <span style="display:block;font-size:10px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sd.name}</span>
            <span style="display:block;font-size:8px;color:#8a8678">Lv ${seated.level}</span>
          </span>
        </div>
      </div>`;
    });
    // LEARNED = SEATED (M1): the holding strip's chips retired — the strip
    // itself survives as the UNLEARN drop (a seated skill dropped here
    // returns to the pack as its Memory item; the engine refuses a full bag).
    const rackHtml = `
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:5px">${seatTiles.join('')}</div>
      <div data-drop="rackFree" style="margin:5px 0 8px;padding:3px 5px;border:1px dashed #35304a;
        border-radius:5px;font-size:10px;color:#8a8678;min-height:20px">
        ${m.knownSkills.size
          ? `<span style="color:#5a5668">drag seats to reorder · drop a seat here (or press its ✕) to unlearn — the skill returns to your pack</span>`
          : `<span style="color:#5a5668">the eight seats above are your whole hand — drag a Skill Memory from your pack onto one to learn it</span>`}
      </div>`;
    // THE FIELD DISCIPLINE, spoken at the button (the engine gate's words):
    // unsocket shares one verdict; unlearn adds its per-skill clock below.
    const unsocketWhy = world.swapRefusal(seat, 'unsocket');
    const rows = [...m.knownSkills.values()].map(inst => {
      const def = inst.def;
      const maxLv = skillMaxLevel(def);
      // Mark gems that BOARD THE CREW (forwarded into the minions' own
      // skills) so the lane is legible — independent of whether the gem
      // also serves the summon lane. crewSkillsServed composes granted
      // tags, so Tectonic Echoes riding Faultfinder is marked truthfully.
      // With the crew door CLOSED (CREW_CFG 'gated', no Resonance riding)
      // a would-board gem shows DORMANT: socketed, but no effect, no cost.
      const crew = world.summonCrewSkills(inst);
      const doorOpen = crewBoardingOpen(inst);
      const boardsCrew = (s: SupportInstance | null): boolean =>
        !!s && crewSkillsServed(s.def, inst, crew) !== null;
      const crewMark = (s: SupportInstance | null): string => !boardsCrew(s) ? ''
        : doorOpen ? ' ⤳' : ' <span style="opacity:0.55">⤳✕</span>';
      const crewTip = (s: SupportInstance | null): string => !boardsCrew(s) ? ''
        : doorOpen
          ? ' — boards the crew: forwarded to the minions’ own skills; its costs bill your cast.'
          : ' — DORMANT: would board the crew, but the door is closed. Socket Resonance to open it (no effect, no cost until then).';
      const sockets = inst.sockets.map((s, i) => s ? `
        <span class="gem-chip" style="border-color:${s.def.color}"
          title="${s.def.description}${crewTip(s)}">
          ${s.def.name}${crewMark(s)} <b>L${s.level}</b>
          <button data-gemlvl="${def.id}:${i}"
            ${!this.getWorld().canAffordAbilityEssence(seat, supportLevelAbilityCost(s.level + 1)) || s.level >= supportMaxLevel(s.def) ? 'disabled' : ''}
            title="Level up for ${supportLevelAbilityCost(s.level + 1).count}× ${abilityEssenceOfTier(supportLevelAbilityCost(s.level + 1).tier).label}">+${abilityEssenceOfTier(supportLevelAbilityCost(s.level + 1).tier).glyph}</button>
          <button data-unsocket="${def.id}:${i}" ${unsocketWhy ? `disabled title="${unsocketWhy}"` : ''}>✕</button>
        </span>` : `<span class="gem-chip empty">empty socket</span>`).join('');
      const eff = effectiveSkillLevel(inst);
      const nextThresh = def.thresholds?.find(t => eff < t.level);
      const reached = def.thresholds?.filter(t => eff >= t.level) ?? [];
      // THE GRIMOIRE (delivery.grimoire): the attuned-form chip — READ-ONLY
      // here. Binding lives at the Tracker's OPEN BOOK now (drag a mastered
      // page onto this skill's slot in the grimoire strip): the field
      // commits you to the form you carried out, and the walk back to town
      // is the price of a swap. The chip keeps the build pane honest about
      // what this copy summons; the engine gate is World.attuneSpectre's.
      let grimoire = '';
      if (def.delivery.type === 'summon' && def.delivery.grimoire) {
        const form = inst.attunedForm ? MONSTERS[inst.attunedForm] : undefined;
        const chip = form
          ? `<span class="gem-chip" style="border-color:#a8d8a0" title="This copy summons ${form.name} outright, no corpse read. Rebind or release at the Tracker's book.">
              ${this.monsterPortraitHtml(form, false, VIS_CFG.portrait.seats.spectreChip)} ${form.name}</span>`
          : `<span style="color:#8a8678">unattuned: reads corpses</span>`;
        grimoire = `<div style="margin-top:3px;font-size:10px">
          <span style="color:#a8d8a0">Grimoire:</span> ${chip}
          <span style="color:#6a6478">— binds at the Tracker's book</span></div>`;
      }
      // THE MIMIC REPERTOIRE (SkillDef.mimic — engine/mimic.ts): every
      // captured art as a chip wearing its SOURCE monster's face (the
      // grimoire-chip idiom); click takes that form (host-authoritative
      // via the mimicSelect intent). An empty row is the fabric working —
      // the bank is combat-transient and fills through the capture gates.
      let mimicRow = '';
      if (def.mimic) {
        const sel = p.mimicSel;
        const chips = mimicEntries(p, world.time).map(e => {
          const art = SKILLS[e.sid]; const src = MONSTERS[e.src];
          if (!art || !src) return '';
          return `<button class="gem-chip" data-mimicsel="${e.sid}"
            style="border-color:${e.sid === sel ? art.color : '#4a4458'}"
            title="${art.name}, learned from the ${src.name}. Click to take this form (shift-press the slot cycles).">
            ${this.monsterPortraitHtml(src, false, VIS_CFG.portrait.seats.spectreChip)} ${art.name}${e.sid === sel ? ' ◈' : ''}</button>`;
        }).join('');
        mimicRow = `<div style="margin-top:3px;font-size:10px">
          <span style="color:#c8a0e8">Repertoire:</span>
          ${chips || `<span style="color:#8a8678">no arts captured: take a studied kind's blow</span>`}
        </div>`;
      }
      // THE SKILL-MODE TREE PANEL (M1 — docs/design/skill-modes.md §7): a
      // collapsible per-skill miniature tree. The level bar wears band
      // tick-marks, a waiting-PIP marks an unspent Ability point (and
      // auto-opens the tree), two branch columns fan from a root with the
      // sealed side greyed in its refusal words, the neutral sits beneath.
      // Every chip speaks THE ONE SPEND PREDICATE (treeNodeRefusal) plus
      // the field discipline; the engine gate is World.pickTreeNode's —
      // these chips only speak it. Chunky buttons: couch lens + pad law.
      let modeRow = '';
      if (def.tree) {
        const tree = def.tree;
        const open = inst.level >= tree.level;
        const spent = inst.treeNodes ?? [];
        const budget = bandPointsAt(inst.level);
        const free = Math.max(0, budget - spent.length);
        const discipline = world.swapRefusal(seat, 'socket');
        const committed = treeSpentBranch(inst);
        const expanded = open && (this.skillTreeOpen.has(def.id) || free > 0);
        const pip = free > 0
          ? `<span title="${free} Ability point${free === 1 ? '' : 's'} waiting" style="color:#ffd700">◉ ${free}</span>`
          : '';
        // The LEVEL BAR: filled to inst.level, a tick at every band end —
        // each completed band is a minted point (bandPointsAt).
        const maxBand = SKILL_LEVEL_BANDS[SKILL_LEVEL_BANDS.length - 1];
        const ticks = SKILL_LEVEL_BANDS.map(b => `
          <span style="position:absolute;left:${(b / maxBand) * 100}%;top:-2px;width:1px;height:9px;
            background:${inst.level >= b ? '#ffd700' : '#5a5668'}"></span>`).join('');
        const levelBar = `
          <span style="position:relative;display:inline-block;width:110px;height:5px;
            background:#241d2e;border:1px solid #4a4458;border-radius:2px;vertical-align:middle;margin:0 6px">
            <span style="position:absolute;left:0;top:0;height:100%;width:${Math.min(100, (inst.level / maxBand) * 100)}%;
              background:${def.color};opacity:0.75"></span>${ticks}
          </span>`;
        // One chip per node — spent ◈ in the skill's color; spendable lit;
        // refused greyed with the predicate's own words in the title.
        const chip = (node: SkillTreeNode, wide = false): string => {
          const isSpent = spent.includes(node.id);
          const why = isSpent ? null : (treeNodeRefusal(inst, node.id) ?? discipline);
          const dis = isSpent || !!why;
          const title = `${node.description ?? node.name}${
            isSpent ? ' — walked.' : why ? ` — ${why}.` : ' — spend a point here.'}`;
          return `<button class="gem-chip" data-modepick="${def.id}:${node.id}"
            style="display:block;width:${wide ? '100%' : 'auto'};margin:2px 0;text-align:left;
              border-color:${isSpent ? def.color : why ? '#3a3444' : '#d8b86a'};
              ${isSpent ? '' : why ? 'opacity:0.5;' : ''}"
            ${dis ? 'disabled' : ''} title="${title}">${isSpent ? '◈ ' : ''}${node.name}</button>`;
        };
        // A branch column: name (sealed names grey), its rungs root-first.
        const col = (b: (typeof tree.branches)[number]): string => {
          const sealedBy = committed && committed.id !== b.id;
          return `<div style="flex:1 1 0;min-width:0;${sealedBy ? 'opacity:0.55' : ''}">
            <div style="color:${sealedBy ? '#6a6478' : def.color};font-size:10px;margin-bottom:1px"
              title="${b.description ?? b.name}${sealedBy ? ` — ${b.name}'s path is sealed.` : ''}">
              ${sealedBy ? '🔒 ' : ''}${b.name}</div>
            ${b.rungs.map(n => chip(n, true)).join('')}
          </div>`;
        };
        // THE FONT'S RESET RITUAL (FONT_CFG.reset): unmake the whole tree,
        // priced in the skill's current band — stands only beside a font.
        const resetChip = (spent.length && world.nearFont()) ? (() => {
          const cost: AbilityCost = { tier: essenceTierForLevel(inst.level), count: FONT_CFG.reset.count };
          const dd = abilityEssenceOfTier(cost.tier);
          const afford = world.canAffordAbilityEssence(seat, cost);
          return `<button class="gem-chip" data-fontreset="${def.id}" ${afford ? '' : 'disabled'}
            title="Sacrificial Font: unmake ALL of this skill's spent points for ${cost.count}× ${dd.label} (the full-tree ritual — never node-wise).">
            ↺ Reset (${this.abilityCostText(cost)})</button>`;
        })() : '';
        const header = `
          <div style="font-size:10px;color:#d8b86a">
            ${open ? `<button data-treeflap="${def.id}" ${free > 0 ? 'disabled' : ''}
              title="${free > 0 ? 'A waiting point holds the tree open' : expanded ? 'Fold the tree away' : 'Open the tree'}"
              style="background:none;border:none;color:#d8b86a;cursor:var(--cursor-point, pointer);padding:0;font-size:10px">
              ${expanded ? '▾' : '▸'}</button>` : ''}
            Tree: ${committed ? `<span style="color:${def.color}">${committed.name}</span>` : open ? 'unchosen' : ''}
            ${levelBar}<span style="color:#8a8678">${spent.length}/${budget} pt${budget === 1 ? '' : 's'}</span> ${pip}
            ${open ? '' : `<span style="color:#6a6478">— the path opens at Lv ${tree.level}</span>`}
          </div>`;
        const body = expanded ? `
          <div style="display:flex;gap:6px;margin-top:2px">${tree.branches.map(col).join('')}</div>
          ${tree.neutral ? `<div style="margin-top:2px;font-size:10px;color:#8a8678">
            neutral — lock-free: ${chip(tree.neutral)}</div>` : ''}
          ${resetChip ? `<div style="margin-top:2px">${resetChip}</div>` : ''}` : '';
        modeRow = `<div style="margin-top:3px">${header}${body}</div>`;
      }
      // Grafts riding THIS skill (chips mirror sockets; ✕ unbinds) + the
      // landing button while a lifted graft is looking for its carrier.
      // WORN grafts join the row: live ones name their gear seat in the
      // tooltip (no ✕ — the bar and the wardrobe are the unbind); dormant
      // ones render greyed WITH THEIR REASON, in the injection's own words.
      const wornHere = wornRows.filter(r => r.skillId === def.id);
      const graftRow = (inst.grafts?.length || wornHere.some(r => r.state !== 'live') || this.liftedGraftKey) ? `
        <div class="grafts" style="margin-top:2px">
          ${(inst.grafts ?? []).map(g => {
            const src = graftSources.find(s => m.grafts[s.key] === def.id && SUPPORTS[s.graft.support] === g.def);
            const worn = src ? undefined : wornHere.find(r => r.state === 'live' && r.def === g.def);
            return `<span class="gem-chip graft-chip" style="border-color:${g.def.color ?? '#b8a2e8'}"
              title="${g.def.description} — grafted by ${src ? src.name : worn ? `your worn gear (Skill Slot ${worn.slot + 1})` : 'a passive power'}; no socket spent.">
              ✦ ${g.def.name} <b>L${g.level}</b>${src ? `<button data-graft-unbind="${src.key}">✕</button>` : ''}</span>`;
          }).join('')}
          ${wornHere.filter(r => r.state !== 'live').map(r => `<span class="gem-chip graft-chip" style="border-color:#4a4458;opacity:0.62"
            title="${r.def.description}
Worn graft (Skill Slot ${r.slot + 1}), DORMANT: ${r.state === 'duplicate'
              ? 'this Memory is already socketed here; the worn copy yields.'
              : 'it does not fit this skill; a socketed gem granting the mechanism would wake it, or seat a fitting skill here.'}">
            ✦ ${r.def.name} <b>L${r.level}</b> — dormant</span>`).join('')}
          ${this.liftedGraftKey ? `<button class="graft-land" data-graft-bind="${def.id}">⊕ graft here</button>` : ''}
        </div>` : '';
      // The seat tag: WHERE this skill sits on the bar (its live bind
      // label), or its unseated state — the association the retired
      // per-row slot-key strip carried (the rack above is the binder now).
      const seatIdx = bar.findIndex(s => s?.def.id === def.id);
      const rackSeatTag = seatIdx >= 0
        ? `<span style="font-size:9px;padding:1px 6px;border-radius:7px;background:#4a3c14;color:var(--gold);margin-left:4px"
            title="Seated on the bar — press ${labels[seatIdx]}">⌖ ${labels[seatIdx]}</span>`
        : `<span style="font-size:9px;color:#6a6478;margin-left:4px"
            title="Learned but not on the bar — drag it from the strip onto a rack seat above">unseated</span>`;
      return `
        <div class="skill-entry" data-tip="skill" data-skill-id="${def.id}" data-drop="gemSock:${def.id}" style="border-left:3px solid ${def.color}">
          <div class="name">${def.name} <span style="color:#ffd700">Lv ${inst.level}${eff > inst.level ? ` <span style="color:#8ad0ff">(+${eff - inst.level} → ${eff})</span>` : inst.level >= maxLv ? ' (max)' : ''}</span>
            ${reached.map(t => `<span style="font-size:9px;padding:1px 6px;border-radius:7px;background:#2a2438;color:#c8a8ff;margin-left:4px" title="Lv ${t.level} threshold">${t.label}</span>`).join('')}
            ${nextThresh ? `<span style="font-size:9px;color:#6a6478;margin-left:4px">Lv ${nextThresh.level}: ${nextThresh.label}</span>` : ''}
            ${this.rarityTagHtml(inst)}${rackSeatTag}
            <span style="color:#8a8678;font-weight:normal;font-size:10px">
              ${this.costText(p.skillCost(inst))}${def.cooldown
                ? `, ${this.cdText(skillCooldownSeconds(p, inst))} cd` : ''}</span>
          </div>
          <div class="tags">${def.tags.join(' · ')}</div>
          <div class="bind-btns">
            ${this.abilityLevelBtn(`data-levelup="${def.id}"`, inst.level, inst.level >= maxLv)}
            ${(() => {
              const why = world.swapRefusal(seat, 'unlearn', def.id);
              return `<button data-unlearn="${def.id}" ${why ? `disabled title="${why}"` : ''}>Unlearn${why ? ` (${why})` : ''}</button>`;
            })()}
          </div>
          <div class="sockets">${sockets}</div>
          ${graftRow}
          ${grimoire}
          ${mimicRow}
          ${modeRow}
        </div>`;
    }).join('');
    return rackHtml + graftBank + (rows
      || '<div style="color:#8a8678;font-size:11px">Nothing seated. Skill Memories drop from monsters — press one from your pack into an empty seat above.</div>');
  }

  /** Wire the learned-list buttons in whichever container rendered it. */
  private wireLearnedList(container: HTMLElement, refresh: () => void): void {
    const world = this.getWorld();
    const q = <T extends HTMLElement>(sel: string): T[] => [...container.querySelectorAll<T>(sel)];
    // Every button routes the mutation through world.requestMeta — on the host /
    // single-player it applies immediately to the local seat; on a render-shell
    // CLIENT it ships the intent to the host (which mutates OUR seat + replicates
    // back). The UI reconciles on the next snapshot either way.
    // THE RACK's unseat ✕ (seat → holding strip; the learned state keeps).
    // Binding and reorder belong to the drag fabric (installRackDnd) —
    // this is the one click verb a seat carries, UNGATED like every seat
    // choice; the fabric's inner-control courtesy keeps its press from
    // ever reading as a lift.
    // LEARNED = SEATED (M1): the seat's ✕ UNLEARNS — the skill returns to
    // the pack as its Memory item (the engine refuses a full bag honestly).
    q<HTMLButtonElement>('button[data-rackunbind]').forEach(btn => btn.addEventListener('click', () => {
      const hero = this.getWorld().seatHero(this.panelSeat(this.inventory));
      const inst = hero.skills[Number(btn.dataset.rackunbind)];
      if (inst) world.requestMeta({ t: 'unlearn', skillId: inst.def.id });
      refresh();
    }));
    // Mimic repertoire chips: pick the form this press wears.
    q<HTMLButtonElement>('button[data-mimicsel]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'mimicSelect', sid: btn.dataset.mimicsel! });
      refresh();
    }));
    // Skill-mode tree chips: spend/replace the pick (host-authoritative
    // via the pickTreeNode intent — the engine gate speaks the refusals).
    q<HTMLButtonElement>('button[data-modepick]').forEach(btn => btn.addEventListener('click', () => {
      const [skillId, nodeId] = btn.dataset.modepick!.split(':');
      world.requestMeta({ t: 'pickTreeNode', skillId, nodeId });
      refresh();
    }));
    // (Grimoire attunement wires nowhere here anymore — binding is the
    // Tracker's book's drag gesture; the chip above is display-only.)
    q<HTMLButtonElement>('button[data-unlearn]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'unlearn', skillId: btn.dataset.unlearn! }); refresh();
    }));
    q<HTMLButtonElement>('button[data-levelup]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'levelSkill', skillId: btn.dataset.levelup! }); refresh();
    }));
    q<HTMLButtonElement>('button[data-gemlvl]').forEach(btn => btn.addEventListener('click', () => {
      const [skillId, sock] = btn.dataset.gemlvl!.split(':');
      world.requestMeta({ t: 'levelSupportSocket', skillId, socket: Number(sock) });
      refresh();
    }));
    // THE FONT'S RESET RITUAL: unmake a skill's tree pick (band-priced).
    // Tree fold/unfold (render-local state; the pip law wins while a
    // point waits — the button disables itself then).
    q<HTMLButtonElement>('button[data-treeflap]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.treeflap!;
      if (this.skillTreeOpen.has(id)) this.skillTreeOpen.delete(id); else this.skillTreeOpen.add(id);
      refresh();
    }));
    q<HTMLButtonElement>('button[data-fontreset]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'fontReset', skillId: btn.dataset.fontreset! }); refresh();
    }));
    q<HTMLButtonElement>('button[data-unsocket]').forEach(btn => btn.addEventListener('click', () => {
      const [skillId, sock] = btn.dataset.unsocket!.split(':');
      world.requestMeta({ t: 'unsocket', skillId, socket: Number(sock) });
      refresh();
    }));
    // GRAFTS: lift a bank chip → land it on a skill (click-lift twins, the
    // drag fabric's gesture family). Unbind is one ✕ through the same intent.
    q<HTMLElement>('[data-graft-lift]').forEach(chip => chip.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-graft-unbind]')) return; // the ✕ wins
      const key = chip.dataset.graftLift!;
      this.liftedGraftKey = this.liftedGraftKey === key ? null : key;
      refresh();
    }));
    q<HTMLButtonElement>('button[data-graft-bind]').forEach(btn => btn.addEventListener('click', () => {
      if (!this.liftedGraftKey) return;
      world.requestMeta({ t: 'bindGraft', key: this.liftedGraftKey, skillId: btn.dataset.graftBind! });
      this.liftedGraftKey = null;
      refresh();
    }));
    q<HTMLButtonElement>('button[data-graft-unbind]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      world.requestMeta({ t: 'bindGraft', key: btn.dataset.graftUnbind!, skillId: null });
      this.liftedGraftKey = null;
      refresh();
    }));
  }

  // (The Skill Book panel is GONE — the Build drawer on the Inventory now
  // hosts the identical learnedListHtml/wireLearnedList management view.
  // One panel, one key; the extracted builders made the move free.)

  // ------------------------------------------------------------ passive tree

  toggleTree(seatId?: string): void {
    const seat = this.couchSeatFor(seatId);
    // Open for ANOTHER local seat → take ownership (the couch contention rule).
    if (this.treeOpen && this.panelSeat(this.passiveTree) !== seat) {
      this.ownPanel(this.passiveTree, seat);
      this.closeChoicePopup();
      this.centerTreeOnStart();
      this.refreshTree();
      return;
    }
    this.treeOpen = !this.treeOpen;
    this.closeChoicePopup(); // a popup never outlives its panel
    this.passiveTree.classList.toggle('hidden', !this.treeOpen);
    if (this.treeOpen) {
      this.ownPanel(this.passiveTree, seat);
      this.centerTreeOnStart();
      this.refreshTree();
    }
  }

  /** Fit box over the ACTIVE REALM's nodes (+padding) — the zoom/pan
   *  reference frame. Each realm tab auto-fits its own constellation. */
  private computeTreeBox(): void {
    const allNodes = Object.values(PASSIVE_NODES).filter(n => realmIdOf(n) === this.treeRealm);
    if (!allNodes.length) { this.treeBox = { minX: 0, minY: 0, w: 1000, h: 1000 }; }
    else {
      const PAD = 45;
      const bMinX = Math.min(...allNodes.map(n => n.x)) - PAD;
      const bMaxX = Math.max(...allNodes.map(n => n.x)) + PAD;
      const bMinY = Math.min(...allNodes.map(n => n.y)) - PAD;
      const bMaxY = Math.max(...allNodes.map(n => n.y)) + PAD;
      this.treeBox = { minX: bMinX, minY: bMinY, w: bMaxX - bMinX, h: bMaxY - bMinY };
    }
    // EDITOR: keep the whole authoring space reachable, not just the fitted
    // nodes — the main star unions with the raw 6000×6000 canvas (the editor's
    // old fixed viewBox), realm constellations pad outward so new nodes have
    // empty room to grow into. Pan clamps then honour the expanded box.
    if (DEV.passiveTreeEditor) {
      let { minX, minY } = this.treeBox;
      let maxX = minX + this.treeBox.w, maxY = minY + this.treeBox.h;
      if (this.treeRealm === MAIN_REALM) {
        minX = Math.min(minX, 0); minY = Math.min(minY, 0);
        maxX = Math.max(maxX, 6000); maxY = Math.max(maxY, 6000);
      } else {
        const GROW = 300;
        minX -= GROW; minY -= GROW; maxX += GROW; maxY += GROW;
      }
      this.treeBox = { minX, minY, w: maxX - minX, h: maxY - minY };
    }
  }

  /** DEFAULT VIEW on open: centred on this class's START NODE at a readable
   *  zoom (a ~1200-unit window), instead of the whole 6000-unit expanse —
   *  the tree can grow without the first impression shrinking. Zoom out /
   *  reset to survey everything; pan clamps keep the window on the tree. */
  private centerTreeOnStart(): void {
    this.computeTreeBox();
    // The EDITOR opens surveying the whole authoring canvas (its old fixed
    // viewBox framing) — zoom/pan navigate in from there.
    if (DEV.passiveTreeEditor) { this.treeZoom = 1; this.treePan = { x: 0, y: 0 }; return; }
    // Realm tabs open FIT-TO-CONSTELLATION (small stars read whole); only
    // the main star centres on the class start at a readable zoom.
    if (this.treeRealm !== MAIN_REALM) { this.treeZoom = 1; this.treePan = { x: 0, y: 0 }; return; }
    const start = PASSIVE_NODES[classStartNode(this.panelSeat(this.passiveTree).meta.classDef.id)];
    if (!start) return;
    const b = this.treeBox;
    const VIEW = 1200;
    this.treeZoom = clamp(Math.max(b.w, b.h) / VIEW, 1, 8);
    this.treePan = {
      x: start.x - (b.minX + b.w / 2),
      y: start.y - (b.minY + b.h / 2),
    };
  }

  refreshTree(): void {
    // A refresh rebuilds the SVG under the popup's feet — never orphan it.
    this.closeChoicePopup();
    if (!this.treeOpen) return;
    const world = this.getWorld();
    const m = this.panelSeat(this.passiveTree).meta;

    // REALM TABS (data/passiveRealms.ts): resolve the open set, snap the
    // active tab back to the star if its realm closed, seed root crests.
    const realms = openRealms(world.ledger);
    if (!realms.some(r => r.id === this.treeRealm)) this.treeRealm = MAIN_REALM;
    const activeRealm = PASSIVE_REALMS[this.treeRealm];
    world.ensureOpenRealmRoots();

    // Fit the view to the NODE BOUNDS (not a fixed viewBox) so the tree stays
    // extensible — adding nodes anywhere just grows the fitted box; zoom/pan navigate.
    this.computeTreeBox();

    const RADII: Record<PassiveNode['kind'], number> = {
      start: 13, small: 9, notable: 14, keystone: 17, attr: 11, vocation: 15, choice: 15,
    };
    // One realm renders at a time. Within the star, VOCATION nodes exist for
    // every defined vocation, but only the ones this character has EARNED
    // render (they share the star's central space).
    const visibleNode = (n: PassiveNode): boolean =>
      realmIdOf(n) === this.treeRealm
      && (n.vocation === undefined || m.vocations.includes(n.vocation));
    const drawnEdges = new Set<string>();
    let edges = '';
    let circles = '';

    for (const node of Object.values(PASSIVE_NODES)) {
      if (!visibleNode(node)) continue;
      for (const other of PASSIVE_ADJACENCY[node.id]) {
        const b = PASSIVE_NODES[other];
        if (!visibleNode(b)) continue;
        const key = node.id < other ? node.id + '|' + other : other + '|' + node.id;
        if (drawnEdges.has(key)) continue;
        drawnEdges.add(key);
        const active = m.allocated.has(node.id) && m.allocated.has(other);
        const voc = node.vocation !== undefined ? VOCATIONS[node.vocation] : undefined;
        edges += `<line x1="${node.x}" y1="${node.y}" x2="${b.x}" y2="${b.y}"
          data-a="${node.id}" data-b="${other}"
          stroke="${active ? (voc?.color ?? '#c8a84b') : '#3a3a52'}" stroke-width="${active ? 3 : 1.5}"/>`;
      }
    }

    // THE GATE LINK: a dashed thread from each earned vocation's crest to its
    // gate start node — the visual "this tree is attached to that starting
    // point". Bright while the gate is still closed (path there to spend),
    // faint once it's open. Render-only: never part of the adjacency graph,
    // so it can't be walked or leaked onto (allocation stays tree-legal).
    for (const vid of m.vocations) {
      const gate = vocationGateNodeId(vid);
      const root = PASSIVE_NODES[vocationRootId(vid)];
      const gateNode = gate ? PASSIVE_NODES[gate] : undefined;
      const voc = VOCATIONS[vid];
      if (!root || !gateNode || !voc) continue;
      const open = vocationGateOpen(m.allocated, vid);
      edges += `<line x1="${root.x}" y1="${root.y}" x2="${gateNode.x}" y2="${gateNode.y}"
        stroke="${voc.color}" stroke-width="${open ? 1.5 : 2.5}" stroke-dasharray="6 7"
        opacity="${open ? 0.25 : 0.8}"/>`;
    }

    for (const node of Object.values(PASSIVE_NODES)) {
      if (!visibleNode(node)) continue;
      const allocated = m.allocated.has(node.id);
      const voc = node.vocation !== undefined ? VOCATIONS[node.vocation] : undefined;
      const gateOpen = node.vocation === undefined || vocationGateOpen(m.allocated, node.vocation);
      // Vocation nodes spend the VOCATION pool behind the (toggleable) gate;
      // everything else spends normal passive points. Same adjacency walk —
      // the ONE rule lives in nodeAllocatable (the node tooltip reads it too).
      // THE DEAL LAW legibility: a 'first' sibling whose deal is spent drops
      // the dashed deal ring (it IS plain pathing now); a 'sole'-locked
      // sibling dims — the cluster reads as claimed at a glance.
      const dealClaimed = node.choice ? choiceDealClaimant(node, m.choices, PASSIVE_NODES) : null;
      const dealSpent = dealClaimed !== null && choiceGroupOf(node)?.deal === 'first';
      const clusterLocked = dealClaimed !== null && choiceGroupOf(node)?.deal === 'sole';
      const available = this.nodeAllocatable(node, m);
      const fill = allocated ? (voc?.color ?? (node.kind === 'choice' ? '#8a68c8' : '#c8a84b'))
        : node.kind === 'keystone' ? '#5a2a3a'
        : node.kind === 'notable' ? '#3a3a5a'
        : node.kind === 'attr' ? '#2a4a3a'
        : node.kind === 'vocation' ? '#241f33'
        : node.kind === 'choice' ? '#33244a'
        : '#26262e';
      const stroke = node.kind === 'vocation' ? (voc?.color ?? '#ffe9a0')
        // An allocated choice node with picks still open keeps its "come
        // back" shimmer: the available-stroke over the allocated fill.
        : allocated ? (available ? '#e6d8ff' : '#ffe9a0')
        : available ? (node.kind === 'choice' ? '#cbb8f0' : '#d8d4c8')
        : voc && !gateOpen ? '#3a3648'
        : '#4a4a5e';
      // Node info rides the SHARED tooltip (data-tip → passiveNodeTooltip):
      // the old inline SVG <title> was slow, unstyled, and invisible to the
      // pad pointer's synthetic hover.
      circles += `<circle cx="${node.x}" cy="${node.y}" r="${RADII[node.kind]}"
        fill="${fill}" stroke="${stroke}" stroke-width="${node.kind === 'keystone' || node.kind === 'notable' || node.kind === 'vocation' || node.kind === 'choice' ? 2.5 : 1.5}"
        ${node.kind === 'choice' && !dealSpent ? 'stroke-dasharray="4 3"' : ''}
        ${clusterLocked ? 'opacity="0.45"' : ''}
        data-node="${node.id}" data-tip="pnode" class="tree-node ${available ? 'available' : ''} ${allocated ? 'allocated' : ''}"/>`;
    }

    // Both modes ride the auto-fit + zoom/pan viewBox — the EDITOR's box is
    // expanded to the whole authoring canvas in computeTreeBox, so its old
    // fixed '0 0 6000 6000' framing is the zoomed-out end of the same lens.
    const viewBox = this.treeViewBox();
    const zPct = Math.round(this.treeZoom * 100);
    // Vocation header chip: the separate point pool, plus a "path to the gate"
    // nudge while the spending gate is still closed.
    const vocChips = this.treeRealm !== MAIN_REALM ? '' : m.vocations.map(vid => {
      const voc = VOCATIONS[vid];
      if (!voc) return '';
      const open = vocationGateOpen(m.allocated, vid);
      const gateName = PASSIVE_NODES[vocationGateNodeId(vid) ?? '']?.name;
      return ` · <span style="color:${voc.color}">${m.vocationPoints} vocation (${voc.name})</span>`
        + (open ? '' : ` <span style="color:#8a8678;font-size:11px">— locked: allocate ${gateName ?? 'its class start'}</span>`);
    }).join('');
    // The active realm's POOL: the star spends passive points; other realms
    // read their currency wallet (earned at future shrines/communions).
    const currency = activeRealm?.currency ?? 'passive';
    const poolChip = currency === 'passive'
      ? `<span style="color:#ffd700">${m.passivePoints} points</span>`
      : `<span style="color:${activeRealm?.color ?? '#ffd700'}">${m.realmPoints[currency] ?? 0} ${currency}</span>`;
    // REALM TABS — only when more than one constellation is open.
    const realmTabs = realms.length > 1 ? `<div class="realm-tabs">${realms.map(r => `
      <button class="realm-tab ${r.id === this.treeRealm ? 'active' : ''}" data-realm="${r.id}"
        style="--realm-color:${r.color ?? '#c8a84b'}" title="${r.blurb ?? ''}">${r.label}</button>`).join('')}</div>` : '';
    this.passiveTree.innerHTML = `
      ${realmTabs}
      ${this.closeGlyphHtml()}<h2>${activeRealm && this.treeRealm !== MAIN_REALM ? activeRealm.label : 'Passive Tree'} — ${poolChip}${vocChips}
        <span style="float:right;color:#8a8678;font-size:11px;font-weight:normal">
          <input id="tree-search" class="tree-search" type="text" placeholder="search nodes…"
            value="${esc(this.treeSearch)}" title="Matches node names, descriptions, and granted lines — hits glow, the rest dims.">
          <span id="tree-search-n" class="tree-search-n"></span>
          <span class="tree-zoom-grp">
            <button class="tree-zoom" data-tz="out" title="zoom out">−</button>
            <button class="tree-zoom" data-tz="reset" title="reset zoom">${zPct}%</button>
            <button class="tree-zoom" data-tz="in" title="zoom in">＋</button>
          </span> &nbsp;${DEV.passiveTreeEditor
            ? 'EDITOR · scroll to zoom · drag empty space to pan'
            : `${m.allocated.size} allocated · click to allocate · scroll to zoom, drag to pan`}</span></h2>
      <svg viewBox="${viewBox}" id="tree-svg" style="cursor:var(--cursor-grab, grab);touch-action:none">${edges}${circles}</svg>`;

    // THE TREE LENS: typing filters LIVE via class toggles on the standing
    // circles (never a re-render — the input keeps its focus); a refresh
    // re-applies the sticky query to the fresh SVG below.
    const searchEl = this.passiveTree.querySelector<HTMLInputElement>('#tree-search');
    searchEl?.addEventListener('input', () => {
      this.treeSearch = searchEl.value;
      this.applyTreeSearch();
    });
    this.applyTreeSearch();

    // In EDITOR mode, clicks SELECT nodes (the editor wires that up) — skip the
    // play-mode allocate handler so the two don't fight over the same click.
    // Realm tab clicks re-aim the whole panel at that constellation.
    this.passiveTree.querySelectorAll<HTMLButtonElement>('.realm-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.realm === this.treeRealm) return;
        this.treeRealm = btn.dataset.realm ?? MAIN_REALM;
        this.centerTreeOnStart();
        this.refreshTree();
      });
    });
    if (!DEV.passiveTreeEditor) {
      this.passiveTree.querySelectorAll<SVGCircleElement>('.tree-node.available').forEach(el => {
        el.addEventListener('click', () => {
          const node = PASSIVE_NODES[el.dataset.node!];
          // CHOICE NODES deal their options in a popup instead of allocating
          // blind — the pick itself is dispatched from the popup's buttons.
          // THE DEAL LAW: a 'first' group spent at a sibling leaves this a
          // grant-less shortcut — no popup, the plain allocate intent below.
          if (node?.choice && !choiceDealSpent(node, m.choices, PASSIVE_NODES)) { this.openChoicePopup(node, el); return; }
          world.requestMeta({ t: 'allocate', nodeId: el.dataset.node! });
          this.refreshTree();
          this.refreshCharSheet();
        });
      });
    }
    // Wheel-zoom + drag-pan + zoom buttons — BOTH modes. In editor mode the
    // pan and the editor's node-drag are disjoint by construction: pans
    // ignore '.tree-node' targets, node-drags start only on them.
    this.wireTreeControls();
    // Let the DEV passive-tree editor re-attach its handlers to the new SVG.
    this.onTreeRender?.();
  }

  /** Everything a passive node SAYS, lowercased for THE TREE LENS: its name,
   *  its description, every granted line (the tooltip's own formatter), its
   *  attribute grants, and its kind — so "fire", "totem", "keystone" or
   *  "strength" all find their nodes. */
  private passiveNodeSearchText(node: PassiveNode): string {
    const parts: string[] = [node.name, node.description ?? '', node.kind];
    for (const mo of node.mods ?? []) parts.push(formatModLine(mo, mo.value));
    for (const k of Object.keys(node.attributes ?? {})) parts.push(k);
    for (const k of Object.keys(node.attributesPct ?? {})) parts.push(k);
    if (node.choice) parts.push('choice');
    return parts.join(' ').toLowerCase();
  }

  /** Apply THE TREE LENS to the standing SVG: hits glow (`search-hit`), the
   *  rest dims under the svg-level `tree-searching` class, and the count
   *  chip speaks. Pure class toggles — cheap enough for every keystroke. */
  private applyTreeSearch(): void {
    const svg = this.passiveTree.querySelector<SVGSVGElement>('#tree-svg');
    if (!svg) return;
    const q = this.treeSearch.trim().toLowerCase();
    svg.classList.toggle('tree-searching', q.length > 0);
    let hits = 0;
    svg.querySelectorAll<SVGCircleElement>('.tree-node').forEach(el => {
      const node = PASSIVE_NODES[el.dataset.node ?? ''];
      const hit = q.length > 0 && !!node && this.passiveNodeSearchText(node).includes(q);
      el.classList.toggle('search-hit', hit);
      if (hit) hits++;
    });
    const n = this.passiveTree.querySelector<HTMLElement>('#tree-search-n');
    if (n) n.textContent = q ? `${hits} hit${hits === 1 ? '' : 's'}` : '';
  }

  /** Tree viewBox from the fitted node-bounds box + the live zoom/pan, clamping the
   *  pan so the window can't slide off the tree. Mirrors mapViewBox. */
  private treeViewBox(): string {
    const b = this.treeBox;
    // Deeper than the map — the tree is dense; deeper still for the EDITOR,
    // whose box spans the whole 6000-unit authoring canvas.
    const z = clamp(this.treeZoom, 1, DEV.passiveTreeEditor ? 16 : 8);
    this.treeZoom = z;
    const vw = b.w / z, vh = b.h / z;
    const maxPanX = Math.max(0, (b.w - vw) / 2), maxPanY = Math.max(0, (b.h - vh) / 2);
    const px = clamp(this.treePan.x, -maxPanX, maxPanX);
    const py = clamp(this.treePan.y, -maxPanY, maxPanY);
    this.treePan.x = px; this.treePan.y = py;
    const cx = b.minX + b.w / 2 + px, cy = b.minY + b.h / 2 + py;
    return `${(cx - vw / 2).toFixed(1)} ${(cy - vh / 2).toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`;
  }

  /** Wire the tree's zoom buttons + wheel-zoom + drag-pan onto the freshly rendered
   *  SVG (listeners live on the re-created SVG, GC'd each refresh — no leak). A
   *  pointerdown ON a node is let through so the allocate click still fires; drags
   *  start only on empty space, and only on the pan buttons (LMB/MMB — never RMB,
   *  the skill button). Gesture rules live in attachPanZoom. Mirrors wireMapControls. */
  private wireTreeControls(): void {
    const svg = this.passiveTree.querySelector<SVGSVGElement>('#tree-svg');
    if (!svg) return;
    const apply = (): void => {
      this.closeChoicePopup(); // pan/zoom slides the node out from under it
      svg.setAttribute('viewBox', this.treeViewBox());
      const lbl = this.passiveTree.querySelector<HTMLElement>('[data-tz="reset"]');
      if (lbl) lbl.textContent = `${Math.round(this.treeZoom * 100)}%`;
    };
    this.passiveTree.querySelectorAll<HTMLButtonElement>('.tree-zoom').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tz = btn.dataset.tz;
        if (tz === 'in') this.treeZoom = clampZoom(this.treeZoom * PANZOOM_DEFAULTS.buttonFactor);
        else if (tz === 'out') this.treeZoom = clampZoom(this.treeZoom / PANZOOM_DEFAULTS.buttonFactor);
        else { this.treeZoom = 1; this.treePan = { x: 0, y: 0 }; }
        apply();
      });
    });
    attachPanZoom(svg, {
      getZoom: () => this.treeZoom,
      setZoom: (z) => { this.treeZoom = z; },
      panBy: (dx, dy) => { this.treePan.x += dx; this.treePan.y += dy; },
      box: () => this.treeBox,
      apply,
      ignore: '.tree-node',
    });
  }

  /** The ONE allocation-availability rule, shared by the tree render and the
   *  node tooltip: unallocated, adjacent to an allocated node, and payable
   *  from the right pool (vocation nodes also need their gate open).
   *  CHOICE NODES stay "available" while picks remain open — clicking deals
   *  the popup again; world.allocateNode holds the same line. */
  private nodeAllocatable(node: PassiveNode, m: World['meta']): boolean {
    // Realm gates mirror world.allocateNode: the constellation must be open,
    // 'free' realms skip pathing, and the realm's own currency pays.
    const realm = realmOf(node);
    if (!realmOpen(realm, this.getWorld().ledger)) return false;
    const already = m.allocated.has(node.id);
    // THE DEAL LAW: a 'sole' cluster claimed at a sibling locks this node out
    // entirely; a 'first' deal spent elsewhere degrades it to plain pathing
    // (allocatable once, deals nothing — the shortcut lane).
    if (node.choice && choiceNodeLocked(node, m.choices, PASSIVE_NODES)) return false;
    const dealSpent = node.choice !== undefined && choiceDealSpent(node, m.choices, PASSIVE_NODES);
    if (already && !(node.choice && !dealSpent && nodeChoiceOpen(node, m.choices))) return false;
    if (!already && realm?.adjacency !== 'free'
      && !PASSIVE_ADJACENCY[node.id].some(n => m.allocated.has(n))) return false;
    const cost = node.choice && !dealSpent ? PASSIVE_CHOICE_CFG.pickCost : 1;
    if (node.vocation !== undefined) {
      return m.vocationPoints >= cost && vocationGateOpen(m.allocated, node.vocation);
    }
    const currency = realm?.currency ?? 'passive';
    return currency === 'passive' ? m.passivePoints >= cost : (m.realmPoints[currency] ?? 0) >= cost;
  }

  /** Dismiss the choice popup (idempotent). Every path that could slide the
   *  node out from under it — refresh, pan/zoom, panel close — calls this. */
  private closeChoicePopup(): void {
    if (this.choicePopupDismiss) {
      window.removeEventListener('pointerdown', this.choicePopupDismiss, true);
      this.choicePopupDismiss = null;
    }
    this.choicePopup?.remove();
    this.choicePopup = null;
  }

  /** Deal a CHOICE NODE's options in a small popup above the node. Each
   *  option button dispatches the ordinary allocate intent with its optionId;
   *  legality labels come from the SAME rule the engine enforces
   *  (choiceLockReason), so the popup can never promise what the host would
   *  refuse. Multi-pick nodes re-open until their deal is spent. */
  private openChoicePopup(node: PassiveNode, el: SVGCircleElement): void {
    this.closeChoicePopup();
    const world = this.getWorld();
    const m = this.panelSeat(this.passiveTree).meta;
    const group = choiceGroupOf(node);
    if (!group) return;
    const chosen = chosenOf(m.choices, node.id);
    const limit = choicePickLimit(node);
    const pool = node.vocation !== undefined ? m.vocationPoints : m.passivePoints;
    const canPay = pool >= PASSIVE_CHOICE_CFG.pickCost;

    const pop = document.createElement('div');
    pop.className = 'choice-popup';
    pop.innerHTML = `
      <div class="choice-head">${group.name}
        <span class="choice-count">${chosen.length}/${limit} chosen${group.unique === 'character' ? ' · once per character' : ''}${
          group.deal === 'sole' ? ' · claims its whole cluster, sibling nodes lock'
          : group.deal === 'first' ? ' · only the first node deals, siblings become plain paths' : ''}</span></div>
      ${group.options.map(o => {
        const taken = chosen.includes(o.id);
        const why = taken ? null : choiceLockReason(node, o.id, m.choices, PASSIVE_NODES);
        const locked = taken || why !== null || !canPay;
        const note = taken ? '✓ chosen' : why !== null ? `✕ ${why}` : !canPay ? 'no points' : '';
        return `<button class="choice-opt${taken ? ' chosen' : ''}${locked ? ' locked' : ''}"
          data-opt="${o.id}" ${locked ? 'disabled' : ''}>
          <span class="opt-name">${o.name}</span>
          <span class="opt-desc">${o.description}</span>
          ${note ? `<span class="opt-note">${note}</span>` : ''}
        </button>`;
      }).join('')}`;
    document.body.appendChild(pop);
    // Fixed-position above the node's screen rect, clamped to the viewport.
    // Measured via rects, not offsetWidth: the popup rides the UI-scale dial
    // ('scale' mode — ui/uiScale.ts) and offset* is blind to transforms; the
    // rect is the box the player actually sees.
    const r = el.getBoundingClientRect();
    const pRect = pop.getBoundingClientRect();
    const pw = pRect.width, ph = pRect.height;
    pop.style.left = `${Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2))}px`;
    pop.style.top = `${Math.max(8, r.top - ph - 10)}px`;

    pop.querySelectorAll<HTMLButtonElement>('.choice-opt:not(.locked)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        world.requestMeta({ t: 'allocate', nodeId: node.id, optionId: btn.dataset.opt! });
        const willRemain = chosenOf(m.choices, node.id).length < limit;
        this.refreshTree();       // closes this popup + repaints allocation
        this.refreshCharSheet();
        // Multi-pick deals re-open on the freshly rendered circle so a
        // litany's three verses are three clicks, not three hunts.
        if (willRemain && nodeChoiceOpen(node, m.choices) && this.nodeAllocatable(node, m)) {
          const el2 = this.passiveTree.querySelector<SVGCircleElement>(`.tree-node[data-node="${node.id}"]`);
          if (el2) this.openChoicePopup(node, el2);
        }
      });
    });
    // Outside pointerdown dismisses (capture phase; armed next tick so the
    // opening click itself doesn't). Persistent until closed — a first click
    // INSIDE the popup must not disarm it.
    const dismiss = (ev: PointerEvent): void => {
      if (this.choicePopup === pop && !pop.contains(ev.target as Node)) this.closeChoicePopup();
    };
    setTimeout(() => {
      if (this.choicePopup !== pop) return; // already superseded/closed
      window.addEventListener('pointerdown', dismiss, true);
      this.choicePopupDismiss = dismiss;
    }, 0);
    this.choicePopup = pop;
  }

  /** Tooltip for a passive-tree node — the same shared styled box every panel
   *  uses, built from LIVE allocation state on each hover. (The old inline
   *  SVG <title> was slow to appear, unstylable, and never showed for the
   *  pad pointer, which the browser's native tooltip can't see.) */
  private passiveNodeTooltip(nodeId: string): TooltipContent | null {
    const node = PASSIVE_NODES[nodeId];
    if (!node) return null;
    const m = this.panelSeat(this.passiveTree).meta;
    const KIND_LABELS: Record<PassiveNode['kind'], string> = {
      start: 'class start', small: 'passive', notable: 'notable',
      keystone: 'keystone', attr: 'attribute', vocation: 'vocation',
      choice: 'choice node',
    };
    let attrText = node.attributes
      ? '<br>' + Object.entries(node.attributes).map(([a, v]) =>
          `+${v} ${ATTRIBUTES[a as AttributeId].label}`).join(', ')
      : '';
    if (node.attributesPct) {
      attrText += '<br>' + Object.entries(node.attributesPct).map(([a, v]) =>
        `${Math.round(v * 100)}% increased ${ATTRIBUTES[a as AttributeId].label}`).join(', ');
    }
    // CHOICE NODES: the deal (group, pick count, uniqueness, deal law) + what
    // this character has already picked here, each with its granted line.
    let choiceText = '';
    const group = choiceGroupOf(node);
    const dealClaimant = node.choice ? choiceDealClaimant(node, m.choices, PASSIVE_NODES) : null;
    const dealSpent = dealClaimant !== null && group?.deal === 'first';
    if (node.choice && group) {
      const limit = choicePickLimit(node);
      const chosen = chosenOf(m.choices, node.id);
      choiceText = `<br><span style="color:#b8a2e8">${group.name}</span>`
        + `: pick ${limit} of ${group.options.length}`
        + (group.unique === 'character' ? ' (each option once per character)' : '')
        + (group.deal === 'sole' ? ' — ONE node of this cluster, ever'
          : group.deal === 'first' ? ' — only the first node taken deals; the rest become plain paths'
          : '');
      if (dealClaimant !== null) {
        const cName = PASSIVE_NODES[dealClaimant]?.name ?? dealClaimant;
        choiceText += group.deal === 'sole'
          ? `<br><span style="color:#e88a8a">cluster claimed at ${cName}; this node can no longer be taken</span>`
          : `<br><span style="color:#8a8678">deal spent at ${cName}: allocates as a plain path (no grant)</span>`;
      }
      for (const oid of chosen) {
        const opt = choiceOptionOf(node, oid);
        if (opt) choiceText += `<br><span style="color:#e6d8ff">✓ ${opt.name}</span>: ${opt.description}`;
      }
    }
    const openPicks = node.choice && group && !dealSpent
      ? ` — ${chosenOf(m.choices, node.id).length}/${choicePickLimit(node)} picked`
      : '';
    let meta = m.allocated.has(node.id)
      ? `${KIND_LABELS[node.kind]} — allocated${openPicks}${this.nodeAllocatable(node, m) ? ' — click to choose' : ''}`
      : this.nodeAllocatable(node, m) ? `${KIND_LABELS[node.kind]} — click to ${node.choice && !dealSpent ? 'choose' : 'allocate'}`
      : KIND_LABELS[node.kind];
    if (node.vocation !== undefined) {
      const voc = VOCATIONS[node.vocation];
      const gateName = PASSIVE_NODES[vocationGateNodeId(node.vocation) ?? '']?.name;
      meta += `<br><span style="color:${voc?.color ?? 'var(--gold)'}">${voc?.name ?? node.vocation}</span>`
        + ` vocation — spends vocation points`
        + (vocationGateOpen(m.allocated, node.vocation) ? ''
          : ` — LOCKED until ${gateName ?? 'its class start node'} is allocated`);
    }
    return { title: node.name, description: node.description + attrText + choiceText, meta };
  }

  // -------------------------------------------------------------- world map

  toggleMap(): void {
    this.mapOpen = !this.mapOpen;
    this.worldMap.classList.toggle('hidden', !this.mapOpen);
    // The hover/pin selection is per-viewing — start each open on the current zone.
    this.hoveredZone = null;
    this.pinnedZone = null;
    // Open on the dimension you STAND IN (standing in hell, see hell) — tabs
    // still flip freely once open; only the opening snaps.
    if (this.mapOpen) this.mapDimension = this.getWorld().zone.dimension ?? 'surface';
    if (this.mapOpen) this.refreshMap();
  }

  // ------------------------------------------------------------- caravan menu

  /** Open the Caravan band-travel menu (called from main.ts on the dwell callback).
   *  Seat-owned like the station panels: the seat that lingered owns the dialog, so
   *  it docks to that seat's flank and THE ACTION LATCH routes its band pick to that
   *  seat's `caravanTo`. No id (solo, and every pre-couch call site) = the hero's. */
  showCaravan(seatId?: string): void {
    this.hideAll();
    this.ownPanel(this.caravanMenu, this.couchSeatFor(seatId));
    this.caravanOpen = true;
    this.caravanMenu.classList.remove('hidden');
    this.refreshCaravan();
  }

  closeCaravan(): void {
    this.caravanOpen = false;
    this.caravanMenu.classList.add('hidden');
    // Re-arm is automatic: the Caravan dwell is a consumed latch — it won't re-fire
    // until the player moves away and breaks the dwell.
  }

  /** The SAIL menu (a port's dock dwell): discovered ports + chart-a-course. */
  showSail(): void {
    this.hideAll();
    this.sailOpen = true;
    this.sailMenu.classList.remove('hidden');
    this.refreshSail();
  }

  closeSail(): void {
    this.sailOpen = false;
    this.sailMenu.classList.add('hidden');
  }

  refreshSail(): void {
    if (!this.sailOpen) return;
    const world = this.getWorld();
    const ports = world.sailMenuPorts();
    // Grouped by WATER (the sea fabric): this sea's harbors first under its
    // own name, farther shores after — the harbor thinks in seas now.
    let lastSea: string | null | undefined;
    const rows = ports.length
      ? ports.map(p => {
        const head = p.seaName !== lastSea
          ? `<h3 style="margin:10px 0 2px 0">${esc(p.seaName ?? 'far waters')}</h3>` : '';
        lastSea = p.seaName;
        const tier = p.tier === 'haven' ? ' <span class="tags">· haven</span>' : '';
        // The harborhold's standing rides the row (the def is the truth):
        // sailing to a besieged or burned port lands at the pier as ever —
        // the tag just tells you what waits past the breakers.
        const hz = world.zoneMap[p.id]?.harborhold;
        const holdTag = hz?.state === 'besieged' ? ' <span class="tags" style="color:#e85050">· besieged</span>'
          : hz?.state === 'fallen' ? ' <span class="tags" style="color:#e8a050">· burned</span>' : '';
        return `${head}<div class="skill-entry">
          <div class="name">${esc(p.name)}${tier}${holdTag}${p.sailed ? ' <span class="tags">· route charted</span>' : ''}</div>
          <div class="desc">A harbor of level ${p.level}.</div>
          <div class="bind-btns"><button data-sail-port="${esc(p.id)}">Sail</button></div>
        </div>`;
      }).join('')
      : `<div class="skill-entry"><div class="desc">No other harbors known on any water; set out and sight one.</div></div>`;
    // THE HEARSAY (world.harborHearsay — the omen fabric's far rumors): each
    // row is sailor's talk about something seated out in unknown country,
    // with a CHART for sale that surveys the seat onto the map. Reading is
    // free; knowing where costs.
    const hearsay = world.harborHearsay();
    const hearsayRows = hearsay.length
      ? `<h3 style="margin:12px 0 4px 0">Hearsay at the dock</h3>` + hearsay.map(h => `<div class="skill-entry">
          <div class="desc" style="font-style:italic">“${esc(h.line)}”</div>
          ${h.canChart ? `<div class="bind-btns"><button data-sail-hearsay="${esc(h.id)}"${world.mortalValueOf() < h.price ? ' disabled' : ''}>Buy chart · ${h.price}</button></div>` : ''}
        </div>`).join('')
      : '';
    const hereSea = world.seaNameOf(world.zone);
    const hereTier = world.zone.portTier === 'haven' ? 'the haven of ' : '';
    this.sailMenu.innerHTML = `${this.closeGlyphHtml()}<h2>The Harbor${hereSea ? ` — ${esc(hereTier + hereSea)}` : ''}</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">"Every water keeps its harbors, friend, and its harbors keep its secrets."</div>`
      + rows
      + `<div class="skill-entry"><div class="name">Chart a course</div>`
      + `<div class="desc">Sail blind for the far shore of this water.</div>`
      + `<div class="bind-btns"><button data-sail-chart>Set sail</button></div></div>`
      + hearsayRows
      + `<div class="bind-btns" style="margin-top:10px"><button data-sail-close>Close</button></div>`;
    this.sailMenu.querySelectorAll<HTMLButtonElement>('button[data-sail-port]').forEach(btn => {
      btn.addEventListener('click', () => {
        world.sailTo(btn.dataset.sailPort!);
        this.closeSail();
      });
    });
    this.sailMenu.querySelector<HTMLButtonElement>('button[data-sail-chart]')?.addEventListener('click', () => {
      world.chartCourse();
      this.closeSail();
    });
    this.sailMenu.querySelectorAll<HTMLButtonElement>('button[data-sail-hearsay]').forEach(btn => {
      btn.addEventListener('click', () => {
        world.requestMeta({ t: 'harborChart', omen: btn.dataset.sailHearsay! });
        this.refreshSail(); // the row leaves the board; the map gained the mark
      });
    });
    this.sailMenu.querySelector<HTMLButtonElement>('button[data-sail-close]')?.addEventListener('click', () => this.closeSail());
  }

  // ------------------------------------------------------- the bounty board

  /** Open THE BOUNTY BOARD's postings panel (the board's dwell asked —
   *  docs/design/bounty-board.md M0). Couch-routed like every station. */
  showBounties(seatId?: string): void {
    this.hideAll();
    this.ownPanel(this.bountyMenu, this.couchSeatFor(seatId));
    this.bountiesOpen = true;
    this.bountyMenu.classList.remove('hidden');
    this.refreshBounties();
    // The live ticker: countdown in place; full repaint when the slate or a
    // hand's state turns (the vendor counter's ticker idiom).
    if (this.bountyTicker === null) {
      this.bountyTicker = window.setInterval(() => {
        if (!this.bountiesOpen) return;
        const v = this.getWorld().bountyBoardView();
        const fp = v.offers.map(o => o.id).join('|') + '#' + v.hands.map(h => h.id + h.state).join('|');
        if (fp !== this.bountyFingerprint) { this.refreshBounties(); return; }
        const el = this.bountyMenu.querySelector<HTMLElement>('[data-bounty-countdown]');
        if (el) el.textContent = fmtRestock(v.countdown);
      }, 500);
    }
  }

  closeBounties(): void {
    this.bountiesOpen = false;
    this.bountyMenu.classList.add('hidden');
    if (this.bountyTicker !== null) { window.clearInterval(this.bountyTicker); this.bountyTicker = null; }
  }

  refreshBounties(): void {
    if (!this.bountiesOpen) return;
    const world = this.getWorld();
    const v = world.bountyBoardView();
    this.bountyFingerprint = v.offers.map(o => o.id).join('|') + '#' + v.hands.map(h => h.id + h.state).join('|');
    const accent = BOUNTY_BOARD_CFG.accent;
    const cap = QUEST_CATEGORY_CAPS.bounty ?? 1;
    const handFull = v.hands.length >= cap;
    // THE TAKEN HAND(s): state speaks plainly — afield / ready / failed.
    const handsHtml = v.hands.length
      ? `<h3 style="margin:10px 0 4px 0;color:${accent}">In hand</h3>` + v.hands.map(h => {
        const state = h.state === 'ready' ? 'the work is done — turn it in'
          : h.state === 'failed' ? 'the ask failed — hand it back'
            : 'afield — the ask stands';
        const verb = h.state === 'ready' ? `Turn in · ${esc(h.pay)}`
          : h.state === 'failed' ? 'Hand it back' : null;
        return `<div class="skill-entry">
          <div class="name">${esc(h.title)}</div>
          <div class="desc">${esc(h.ask)}</div>
          <div class="desc" style="font-style:italic">${esc(state)}</div>
          <div class="bind-btns">
            ${verb ? `<button data-bounty-turnin="${esc(h.id)}">${verb}</button>` : ''}
            <button data-bounty-abandon="${esc(h.id)}">Abandon</button>
          </div>
        </div>`;
      }).join('')
      : '';
    // THE SLATE: the beat's offers, pay printed (the visible price law).
    const offersHtml = v.offers.length
      ? v.offers.map(o => `<div class="skill-entry">
          <div class="name">${esc(o.title)}</div>
          <div class="desc">${esc(o.ask)}</div>
          <div class="desc">Pay: ${esc(o.pay)}</div>
          <div class="bind-btns"><button data-bounty-accept="${esc(o.id)}"${handFull ? ' disabled title="One bounty in hand at a time."' : ''}>Accept</button></div>
        </div>`).join('')
      : `<div class="skill-entry"><div class="desc">The board hangs bare this beat — the wilds owe no work.</div></div>`;
    this.bountyMenu.innerHTML = `${this.closeGlyphHtml()}<h2>The Bounty Board</h2>`
      + `<div class="desc" style="margin:-4px 0 8px 0;font-style:italic">Work posted from the living world — take one in hand, meet its ask, return to collect.</div>`
      + handsHtml
      + `<h3 style="margin:10px 0 4px 0">The slate (${v.offers.length}) · new postings <span data-bounty-countdown>${fmtRestock(v.countdown)}</span></h3>`
      + offersHtml
      + `<div class="bind-btns" style="margin-top:10px"><button data-bounty-close>Close</button></div>`;
    // Seat routing rides THE COUCH ACTION LATCH (a press inside a
    // guest-owned panel stamps uiActionSeatId) — no per-call seat plumbing.
    this.bountyMenu.querySelectorAll<HTMLButtonElement>('button[data-bounty-accept]').forEach(btn => {
      btn.addEventListener('click', () => {
        world.requestMeta({ t: 'bountyAccept', id: btn.dataset.bountyAccept! });
        this.refreshBounties();
      });
    });
    this.bountyMenu.querySelectorAll<HTMLButtonElement>('button[data-bounty-turnin]').forEach(btn => {
      btn.addEventListener('click', () => {
        world.requestMeta({ t: 'bountyTurnIn', id: btn.dataset.bountyTurnin! });
        this.refreshBounties();
      });
    });
    this.bountyMenu.querySelectorAll<HTMLButtonElement>('button[data-bounty-abandon]').forEach(btn => {
      btn.addEventListener('click', () => {
        world.requestMeta({ t: 'bountyAbandon', id: btn.dataset.bountyAbandon! });
        this.refreshBounties();
      });
    });
    this.bountyMenu.querySelector<HTMLButtonElement>('button[data-bounty-close]')?.addEventListener('click', () => this.closeBounties());
  }

  // ----------------------------------------------------------- harborhold panel

  /** Open the HARBORHOLD panel (the muster horn's dwell asked): the town's
   *  standing, the patronage ladder, and the state action — muster a
   *  defense, or pay the restoration at the wreckage. */
  showHold(): void {
    this.hideAll();
    this.holdOpen = true;
    this.holdMenu.classList.remove('hidden');
    this.refreshHold();
  }

  closeHold(): void {
    this.holdOpen = false;
    this.holdMenu.classList.add('hidden');
  }

  refreshHold(): void {
    if (!this.holdOpen) return;
    const world = this.getWorld();
    const h = world.holdPanelInfo();
    if (!h) { this.closeHold(); return; }
    const mins = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    // THE STANDING — state line + the patronage pips (filled to prosperity).
    const pips = Array.from({ length: h.prosperityCap }, (_, i) =>
      `<span style="color:${i < h.prosperity ? '#c8b048' : '#4a4654'}">●</span>`).join(' ');
    const stateLine = h.state === 'open'
      ? `<span style="color:#7fd0ff">OPEN</span> — the town stands and trades`
      : h.state === 'besieged'
        ? `<span style="color:#e85050">BESIEGED</span> — the gates are shut against the tide`
          + (h.fallLeft > 0 ? ` <span class="tags">· falls unbroken in ${mins(h.fallLeft)}</span>` : '')
        : `<span style="color:#e8a050">FALLEN</span> — the harbor burns`
          + (h.rebuildLeft > 0 ? ` <span class="tags">· rebuilds in ${mins(h.rebuildLeft)}</span>` : '');
    // THE LADDER — every service row, its rung, and whether it stands.
    const svcName: Record<string, string> = {
      harbormaster: 'the Harbormaster', board: 'the Harbor Board',
      chandler: "the Chandler's counter", mercs: "the Captain's muster",
    };
    const services = h.services.map(s =>
      `<div class="desc" style="color:${s.active ? '#9ad09a' : '#8a8694'}">`
      + `${s.active ? '◆' : '◇'} ${esc(svcName[s.id] ?? s.id)} <span class="tags">· standing ${s.at}</span></div>`).join('');
    // THE ACTION — one honest button per state.
    const action = h.state === 'besieged'
      ? `<div class="skill-entry"><div class="name">Sound the muster horn</div>
          <div class="desc">Break the siege: hold the Quay Ward at the gate through ${h.waves} wave${h.waves === 1 ? '' : 's'} of the tide.
            If the ward falls, the harbor burns.</div>
          <div class="bind-btns"><button data-hold-muster ${h.canMuster ? '' : 'disabled'}>${h.defenseLive ? 'The defense is joined' : 'Muster the defense'}</button></div>
        </div>`
      : h.state === 'fallen'
        ? `<div class="skill-entry"><div class="name">Raise it from the ashes</div>
            <div class="desc">Masons, pitch and pilings, paid now: the walls stand today (besieged still: the defense is yours to make).</div>
            <div class="bind-btns"><button data-hold-restore ${h.canRestore ? '' : 'disabled'}>Restore — ${h.restoreCost} ${ESSENCE_VALUE_LABEL}</button>
              ${!h.canRestore ? `<span class="tags">your essence is worth ${world.mortalValueOf()}</span>` : ''}</div>
          </div>`
        : `<div class="skill-entry"><div class="desc">The town keeps its own peace: walk in. Defended sieges raise its standing; a lost one burns it.</div></div>`;
    this.holdMenu.innerHTML = `${this.closeGlyphHtml()}<h2>${esc(h.name)} <span class="tags">· ${esc(h.clsLabel)}</span></h2>`
      + `<div class="desc" style="margin:-4px 0 6px 0">${stateLine}</div>`
      + `<div class="desc" style="margin:0 0 8px 0">Standing: ${pips}`
      + ` <span class="tags">· ${h.defenses} defended · ${h.falls} lost</span></div>`
      + services
      + action
      + `<div class="bind-btns" style="margin-top:10px"><button data-hold-close>Close</button></div>`;
    this.holdMenu.querySelector<HTMLButtonElement>('button[data-hold-muster]')?.addEventListener('click', () => {
      world.requestMeta({ t: 'holdMuster' });
      this.closeHold(); // the horn sounds — the fight is outside, not in a menu
    });
    this.holdMenu.querySelector<HTMLButtonElement>('button[data-hold-restore]')?.addEventListener('click', () => {
      world.requestMeta({ t: 'holdRestore' });
      this.refreshHold(); // the purse and the state line both moved
    });
    this.holdMenu.querySelector<HTMLButtonElement>('button[data-hold-close]')?.addEventListener('click', () => this.closeHold());
  }

  /** Render the Caravanner's routes — one NAMED destination per unlocked band (the
   *  name is the very zone that will be minted). Opens only in town; picks route
   *  through requestMeta (host-authoritative). */
  refreshCaravan(): void {
    if (!this.caravanOpen) return;
    const world = this.getWorld();
    const bands = world.caravanMenuBands();
    const rows = bands.length
      ? bands.map(b => {
        const lo = (b.band - 1) * 10 + 1, hi = b.band * 10;
        const charted = world.zoneMap[`caravan_band_${b.band}`] !== undefined;
        return `<div class="skill-entry">
          <div class="name">${esc(b.name)}${charted ? ' <span class="tags">· route charted</span>' : ''}</div>
          <div class="desc">A guided road to the wilds of level ${lo}–${hi}.</div>
          <div class="bind-btns"><button data-band="${b.band}">Set out</button></div>
        </div>`;
      }).join('')
      : `<div class="skill-entry"><div class="desc">The Caravanner has no roads for you yet; return when you've travelled farther.</div></div>`;
    this.caravanMenu.innerHTML = `${this.closeGlyphHtml()}<h2>The Caravan</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">"I know the safe roads, friend. Name where you're bound and my wagons will see you there, and back again."</div>`
      + rows
      + `<div class="bind-btns" style="margin-top:10px"><button data-caravan-close>Close</button></div>`;
    this.caravanMenu.querySelectorAll<HTMLButtonElement>('button[data-band]').forEach(btn => {
      btn.addEventListener('click', () => {
        world.requestMeta({ t: 'caravanTo', band: Number(btn.dataset.band) });
        this.closeCaravan();
      });
    });
    this.caravanMenu.querySelector<HTMLButtonElement>('[data-caravan-close]')?.addEventListener('click', () => this.closeCaravan());
  }

  // ----------------------------------------------------------- mercenary menu

  /** Open the MERCENARY OUTPOST menu (the captain's calm-parley dwell asked). */
  showMercMenu(): void {
    this.hideAll();
    this.mercOpen = true;
    this.mercMenu.classList.remove('hidden');
    this.refreshMercMenu();
  }

  closeMercMenu(): void {
    this.mercOpen = false;
    this.mercMenu.classList.add('hidden');
    // Re-arm is the dwell's: it fired once and stays consumed until the player
    // steps away from the captain (the caravan pattern).
  }

  /** Render the offer sheet: baseline blades + player-retired VETERANS (cost
   *  live off the patron's level — power normalizes to it either way), the
   *  current contract, and — for mortal-loop characters — RETIREMENT. */
  refreshMercMenu(): void {
    if (!this.mercOpen) return;
    const world = this.getWorld();
    const acc = this.getAccount();
    const post = world.mercOutpost;
    if (!post) { this.closeMercMenu(); return; }
    const L = world.mercTargetLevel();
    const company = world.hiredMercs;
    const cap = world.mercHireCap();
    const full = company.length >= cap;
    const rows = post.offers.length
      ? post.offers.map((o, i) => {
        const cost = world.mercHireCost(o);
        const vet = o.kind === 'retired';
        // THE VETERAN'S COIN (MERC_CFG.retiredTint): a player-made blade
        // prices in ONE fine essence, counted at the mortal exchange;
        // templates take the mixed wallet. Drawn == charged (hireMercenary).
        const tint = vet ? MERC_CFG.retiredTint : null;
        const tintUnits = tint ? essenceUnitsForValue(tint, cost) : 0;
        const afford = tint
          ? (world.meta.essences[tint] ?? 0) >= tintUnits
          : world.mortalValueOf() >= cost;
        // THE LIVE-AVAILABILITY GATE (world.mercOfferBlocked): a locked
        // sheet keeps its veteran rows while their retiree rides with
        // another patron — the row shows the same words the hire path
        // would refuse with (drawn == tested).
        const blocked = world.mercOfferBlocked(o);
        // The blade's own face: its class-look hero body (the portrait
        // fabric's class seat) — an offer sheet you read at a glance.
        const cls = CLASSES.find(c => c.id === o.classId);
        return `<div class="skill-entry">
          <div class="name" style="display:flex;align-items:center;gap:8px">
            ${cls ? this.classPortraitHtml(cls, VIS_CFG.portrait.seats.merc) : ''}
            <span>${esc(o.name)}
            ${vet ? `<span class="tags" style="color:#b8a0e0">· VETERAN, retired at level ${o.retiredLevel}</span>` : ''}</span></div>
          <div class="desc">${esc(o.blurb)}</div>
          <div class="desc" style="color:#8a9a8a">Fights at your measure (level ${L}): a blade is fitted to its patron.</div>
          <div class="bind-btns"><button data-merc-hire="${i}" ${full || !afford || blocked ? 'disabled' : ''}>
            Hire — ${tint
              ? `${tintUnits}× <span style="color:${ESSENCES[tint].color}">${ESSENCES[tint].glyph} ${ESSENCES[tint].label}</span>`
              : `${cost} ${ESSENCE_VALUE_LABEL}`}</button>
            ${blocked ? `<span class="tags" style="color:#b8a0e0">${esc(blocked)}</span>`
              : !afford && !full ? `<span class="tags">${tint
                ? `you carry ${world.meta.essences[tint] ?? 0}× ${ESSENCES[tint].glyph}`
                : `your essence is worth ${world.mortalValueOf()}`}</span>` : ''}</div>
        </div>`;
      }).join('')
      : `<div class="skill-entry"><div class="desc">The sign-board hangs empty; every blade this post will ever deal has been taken.</div></div>`;
    // THE COMPANY: one line per contract (the retinue cap shows when >1 is
    // possible — the Harborwarden's ledger made this a roster, not a slot).
    const contract = company.length
      ? `<div class="skill-entry"><div class="name" style="color:#c8b048">Under contract${cap > 1 ? ` (${company.length}/${cap})` : ''}:
            ${esc(company.map(hm => hm.name).join(', '))}</div>
          <div class="desc">Their hire ends when your run does, however it does.</div>
          <div class="bind-btns">${company.map((hm, i) =>
            `<button data-merc-dismiss="${i}">Dismiss ${esc(hm.name)}</button>`).join(' ')}</div></div>`
      : cap > 1
        ? `<div class="skill-entry"><div class="desc">Your company musters up to ${cap} blades.</div></div>`
        : '';
    const retire = world.canRetireHere()
      ? `<div class="skill-entry" style="border-top:1px solid #3a3644;margin-top:10px;padding-top:10px">
          <div class="name" style="color:#b8a0e0">Retire from the wake</div>
          <div class="desc">End this run here, in good order: your carried essence is appraised into
            ${META_CURRENCY_LABEL} at the Reckoning, no corpse is left and no death is counted, and this
            character, exactly as built, joins the mercenary roster (${acc.mercRoster.length} retired)
            for future runs to hire.</div>
          <div class="bind-btns"><button data-merc-retire>Retire this character</button></div>
        </div>`
      : '';
    // An officer with its own voice (the recruiter's table) speaks it;
    // otherwise the muster/outpost defaults, derived from the port policy.
    const title = post.title ?? (post.port ? 'The Harbor Muster' : 'The Mercenary Outpost');
    const pitch = post.pitch ?? (post.port
      ? '"Green blades, fair rates, no questions off the boat. The veterans keep to the wilds, and so does the retiring."'
      : '"Every blade here has a story. Buy one, or become one."');
    this.mercMenu.innerHTML = `${this.closeGlyphHtml()}<h2>${esc(title)}</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">${esc(pitch)}</div>`
      + contract + rows + retire
      + `<div class="bind-btns" style="margin-top:10px"><button data-merc-close>Close</button></div>`;
    this.mercMenu.querySelectorAll<HTMLButtonElement>('button[data-merc-hire]').forEach(btn => {
      btn.addEventListener('click', () => {
        world.hireMercenary(Number(btn.dataset.mercHire));
        this.refreshMercMenu(); // re-render: the offer struck, the contract line, the purse
      });
    });
    this.mercMenu.querySelectorAll<HTMLButtonElement>('button[data-merc-dismiss]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.mercDismiss);
        const name = world.hiredMercs[i]?.name ?? 'the blade';
        if (!window.confirm(`Dismiss ${name}? The contract ends; a veteran returns to the pool.`)) return;
        world.dismissMercenary(`${name} takes their leave.`, i);
        this.refreshMercMenu();
      });
    });
    this.mercMenu.querySelector<HTMLButtonElement>('button[data-merc-retire]')?.addEventListener('click', () => {
      if (!window.confirm('Retire this character? The run ends (essence banks as on death), and the character '
        + 'joins the mercenary roster, met again wherever an outpost offers them.')) return;
      this.closeMercMenu();
      world.retireCharacter(); // the run-end flow takes over (retire-flavored screen)
    });
    this.mercMenu.querySelector<HTMLButtonElement>('button[data-merc-close]')?.addEventListener('click', () => this.closeMercMenu());
    this.paintPortraitsIn(this.mercMenu); // the offer rows' class-look blades
  }

  // ------------------------------------------------------------ vocation menu

  /** Open the VOCATION CHOICE menu (the quartermaster's dwell requested it —
   *  a specialization is a deliberate pick, never a random dwell auto-accept). */
  showVocationMenu(): void {
    this.hideAll();
    this.vocationOpen = true;
    // An Ultimatum-style DECIDE-AT-LEISURE freeze: the 'menu:vocation'
    // timeflow surface (TIME_CFG.surfaces) holds the world while the offer
    // is weighed. Same solo-only policy as the pause menu.
    this.getWorld().timeflow.holdSurface('menu:vocation');
    this.vocationMenu.classList.remove('hidden');
    this.refreshVocationMenu();
  }

  closeVocationMenu(): void {
    this.vocationOpen = false;
    this.getWorld().timeflow.release('menu:vocation');
    this.vocationMenu.classList.add('hidden');
    // Suppress re-offer until the player breaks the dwell (walks away) — else
    // the menu would pop right back open while they stand by the giver.
    this.getWorld().declineVocationOffer();
  }

  /** One card per offered vocation chain: name, home class, blurb, first step.
   *  Undertaking routes through requestMeta (host-authoritative, like caravanTo). */
  refreshVocationMenu(): void {
    if (!this.vocationOpen) return;
    const world = this.getWorld();
    const offers = world.vocationMenuOffers();
    const rows = offers.length
      ? offers.map(o => `<div class="skill-entry">
          <div class="name" style="color:${esc(o.color)}">${esc(o.name)}
            <span class="tags">· ${esc(o.className)}'s calling${o.secret ? ' · a HIDDEN path' : ''}${o.ownClass ? ' (your class)' : o.secret ? '' : ' · unlocked by a past hero'}</span></div>
          <div class="desc">${esc(o.blurb)}</div>
          <div class="desc" style="font-style:italic">A chain of ${o.steps} trials begins: “${esc(o.offerLabel)}”</div>
          <div class="bind-btns"><button data-vocation-quest="${esc(o.questId)}">Undertake</button></div>
        </div>`).join('')
      : `<div class="skill-entry"><div class="desc">No callings are open to you right now.</div></div>`;
    // A discovered SECRET calling speaks with its own voice; the quartermaster's
    // patter covers the ordinary chains.
    const flavor = offers.find(o => o.flavor)?.flavor
      ?? '"Not work this time, traveller. A VOCATION. Finish its trials and the heart of the star opens to you. One calling per lifetime; choose it well."';
    this.vocationMenu.innerHTML = `${this.closeGlyphHtml('Decline the offer (Esc)')}<h2>A Calling</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">${esc(flavor)}</div>`
      + rows
      + `<div class="desc" style="margin-top:8px;color:#8a8678">Completing a vocation unlocks its trials for EVERY future hero, whatever their class. Vocation points spend only inside its tree${offers.length ? '' : ''}; press P to see the star.</div>`
      + `<div class="bind-btns" style="margin-top:10px"><button data-vocation-close>Not yet</button></div>`;
    this.vocationMenu.querySelectorAll<HTMLButtonElement>('button[data-vocation-quest]').forEach(btn => {
      btn.addEventListener('click', () => {
        world.requestMeta({ t: 'vocationQuest', questId: btn.dataset.vocationQuest! });
        this.closeVocationMenu();
      });
    });
    this.vocationMenu.querySelector<HTMLButtonElement>('[data-vocation-close]')?.addEventListener('click', () => this.closeVocationMenu());
  }

  // (The Holdfast toll menu retired: an essence toll pays directly on the
  // keeper dwell — the prompt over the keeper advertises the ask, and the
  // zone-info panel prices sealed gates. No bargain surface to manage.)

  refreshMap(): void {
    if (!this.mapOpen) return;
    // The 0.5s auto-refresh must NOT tear out the SVG mid drag-pan (it would kill
    // the gesture and misfire the pin guard) — skip the rebuild while dragging; the
    // selection/box don't change during a pan anyway. Same courtesy for the wash
    // slider: a rebuild would replace the very element under the pointer. And the
    // same courtesy for ANY held press (THE PRESS GUARD) — a rebuild between a
    // tab's mousedown and mouseup swallows the click ("dimension tabs need two
    // clicks"); deliberate refreshes fire on click, after release, unharmed.
    if (this.mapDragging || this.mapWashDragging || this.pressHeld.has(this.worldMap)) return;
    const world = this.getWorld();
    if (this.mapTab === 'quests') { this.renderQuestsTab(world); return; }
    const visited = world.visited;
    // ONE DIMENSION PER VIEW: the map shows the active dimension's worldmass;
    // the tabs (below) flip between discovered ones. If the run hasn't
    // breached the shown dimension anymore (new run), snap back to surface.
    if (!world.discoveredDimensions.has(this.mapDimension)) this.mapDimension = 'surface';
    const dim = this.mapDimension;
    const inDim = (z: ZoneDef): boolean => (z.dimension ?? 'surface') === dim;
    const zones = Object.values(world.zoneMap).filter(inDim);
    const STUB_DIR = { n: { x: 0, y: -42 }, s: { x: 0, y: 42 }, e: { x: 46, y: 0 }, w: { x: -46, y: 0 } };

    // Roads between zones (each connection drawn once). Routes out of
    // unvisited territory stay dim — you know a road exists, not where it leads.
    // BERTH SNAP (ZoneDef.berths — one zone, several mouths): an edge meets a
    // many-mouthed zone at its NEAREST anchor (primary node or berth), so a
    // long zone's roads land at their true geography instead of converging
    // on one dot. Zones without berths resolve to their node untouched.
    const anchorOf = (za: ZoneDef, toward: { x: number; y: number }): { x: number; y: number } => {
      let ax = za.map.x, ay = za.map.y;
      let bd = (toward.x - ax) ** 2 + (toward.y - ay) ** 2;
      for (const p of za.berths ?? []) {
        const d = (toward.x - p.x) ** 2 + (toward.y - p.y) ** 2;
        if (d < bd) { bd = d; ax = p.x; ay = p.y; }
      }
      return { x: ax, y: ay };
    };
    const drawn = new Set<string>();
    let edges = '';
    let stubs = '';
    for (const z of zones) {
      for (const e of z.exits) {
        if (e.to === '?') {
          // A frontier nobody has stepped through yet.
          if (!visited.has(z.id)) continue;
          const sx = z.map.x + STUB_DIR[e.side].x;
          const sy = z.map.y + STUB_DIR[e.side].y;
          stubs += `
            <line x1="${z.map.x}" y1="${z.map.y}" x2="${sx}" y2="${sy}"
              stroke="#3a3a4e" stroke-width="2" stroke-dasharray="3 5"/>
            <circle cx="${sx}" cy="${sy}" r="6" fill="#1c1c26" stroke="#4a4a5e" stroke-width="1.5"/>
            <text x="${sx}" y="${sy + 3.5}" text-anchor="middle" font-size="9" fill="#8a8678">?</text>`;
          continue;
        }
        const b = world.zoneMap[e.to];
        if (!b) continue;
        if (!inDim(b)) continue; // a cross-dimension edge (the hellgate's way home) draws in neither view
        // BOTH ends must be visible: a road drawn into a veiled node would
        // leak the forechart's ahead-minted ground (a line to blank map is a
        // coordinate spoiler). Fully-fogged pairs never drew anyway.
        if (!world.visible(z) || !world.visible(b)) continue;
        const key = z.id < e.to ? z.id + '|' + e.to : e.to + '|' + z.id;
        if (drawn.has(key)) continue;
        drawn.add(key);
        const known = visited.has(z.id) || visited.has(e.to);
        const za = anchorOf(z, b.map), bb = anchorOf(b, z.map);
        // A road touching a LANES-kinded zone (data/zoneKinds.ts — the
        // inland sea) is a water crossing: it wears the sea-lane stroke,
        // not the land road's, so the chart reads the ferry's ways exactly
        // like the surface's naval lanes.
        const laneKind = zoneKindOf(z)?.lanes ?? zoneKindOf(b)?.lanes;
        if (laneKind) {
          edges += `<line x1="${za.x}" y1="${za.y}" x2="${bb.x}" y2="${bb.y}"
            stroke="${laneKind.color ?? '#4a8ac8'}" stroke-width="2" stroke-dasharray="6 5" stroke-opacity="${known ? 0.8 : 0.45}"/>`;
          continue;
        }
        // A road crossing an ENCLAVE biome's wall wears the gate's accent —
        // the map telegraphs "that way lies the Durance" the same way the
        // portal itself does (derived inline: both endpoint defs are in hand).
        const enGate = (BIOMES[b.biome ?? '']?.enclave && !BIOMES[z.biome ?? '']?.enclave)
          ? BIOMES[b.biome ?? '']?.enclave
          : (BIOMES[z.biome ?? '']?.enclave && !BIOMES[b.biome ?? '']?.enclave)
            ? BIOMES[z.biome ?? '']?.enclave : undefined;
        const enAccent = enGate ? boundaryGateOf(enGate.gate)?.accent : undefined;
        edges += `<line x1="${za.x}" y1="${za.y}" x2="${bb.x}" y2="${bb.y}"
          stroke="${enAccent && known ? enAccent : known ? '#5a5a72' : '#2c2c3a'}" stroke-width="${enAccent && known ? 2.6 : 2}"
          ${known ? '' : 'stroke-dasharray="4 5"'}${enAccent && known ? ' stroke-opacity="0.75"' : ''}/>`;
      }
      // SEA LANES: crossings you have sailed (searoutes, recorded on landing)
      // — a dashed blue arc over the water, the naval half of the road graph.
      for (const to of z.searoutes ?? []) {
        const b = world.zoneMap[to];
        if (!b || !inDim(b)) continue;
        // Same veil law as the roads: a lane to a veiled harbor is the
        // HARBOR's knowledge (the Sail menu lists it), never the map's.
        if (!world.visible(z) || !world.visible(b)) continue;
        const key = 'sea:' + (z.id < to ? z.id + '|' + to : to + '|' + z.id);
        if (drawn.has(key)) continue;
        drawn.add(key);
        const za = anchorOf(z, b.map), bb = anchorOf(b, z.map);
        edges += `<line x1="${za.x}" y1="${za.y}" x2="${bb.x}" y2="${bb.y}"
          stroke="#4a8ac8" stroke-width="2" stroke-dasharray="6 5" stroke-opacity="0.8"/>`;
      }
      // THE UNDER-ROADS (ZoneDef.underways — the rooted web): a spanning
      // under-zone joins these nodes BELOW the surface — a DOTTED stroke in
      // the country's OWN voice (underSpanPolicyOf(z.biome).omen.color, the
      // omen fabric's exact read: members are same-biome by the pass's law,
      // so either end names the row) — the garden's warm root-tan, the lych
      // way's bone-pale. A row without a voice (or no row — a grandfathered
      // edge) keeps the classic root-brown byte-exact, distinct from every
      // surface face (and from the sea lane's long dash) either way. The
      // veil law holds twice over: a far mouth still veiled draws nothing,
      // and the key prefix keeps an under-road from collapsing into a
      // surface road between the same pair.
      for (const u of z.underways ?? []) {
        const b = world.zoneMap[u.to];
        if (!b || !inDim(b)) continue;
        if (!world.visible(z) || !world.visible(b)) continue;
        const key = 'ug:' + (z.id < u.to ? z.id + '|' + u.to : u.to + '|' + z.id);
        if (drawn.has(key)) continue;
        drawn.add(key);
        const za = anchorOf(z, b.map), bb = anchorOf(b, z.map);
        const voice = underSpanPolicyOf(z.biome ?? '')?.omen?.color ?? '#7a5a38';
        edges += `<line x1="${za.x}" y1="${za.y}" x2="${bb.x}" y2="${bb.y}"
          stroke="${voice}" stroke-width="2" stroke-dasharray="2 4" stroke-opacity="0.75"/>`;
      }
    }

    // THE INTERACTIVITY CONTRACT (ui/mapConfig.ts): only zone GEOMETRY answers
    // the cursor — the disc, the waypoint diamond, and their invisible hit
    // halos. Every OTHER layer rides pointer-transparent groups at the
    // assembly below, and the map carries NO native <title> tooltips — an
    // icon's words live in the ZONE PANE (zoneInfo) instead, so a badge can
    // never intercept or flicker a hover, and a label can never steal a
    // neighbor's waypoint click (the clustered-map dead-waypoint bug). NAME
    // CARDS render as a separate top layer and obey the player's
    // Settings.mapLabels mode ('hover' = rise under the cursor; 'always' = the
    // classic full chart) — except pinLabel kinds (data/zoneKinds.ts — towns),
    // the pinned zone, and the zone you stand in, whose cards stay FIXED on.
    const labelMode = this.getSettings().mapLabels;
    let nodes = '';
    let cards = '';
    for (const z of zones) {
      if (!world.visible(z)) continue; // fog policy (gentle now; dynamic later)
      const known = visited.has(z.id);
      // RECON INTEL (world.surveyed — a survey spire's pulse): ground you know
      // OF but haven't walked. Reads like charted terrain (real name, biome,
      // level) at a scouting remove — washed fill, a dashed rim in the
      // spire's tint — so the flare visibly buys you the lay of the land.
      const scouted = !known && world.surveyed.has(z.id);
      const current = world.zone.id === z.id;
      const wp = world.discoveredWaypoints.has(z.id);
      const canTravel = wp && !current;
      // Charted ground reads as its biome (a terrain map); the faction washes
      // from the sim sit on top, so you see both the land and who holds it.
      const bi = known || scouted ? biomeOf(z) : null;
      const tierTintBase = known || scouted ? (bi?.mapColor ?? z.theme.accent) : '#26262e';
      // THE TIER TINT (tierMapTint above): stacked ground shades its whole
      // disc — a summit lifts toward the crown's pale, a drained city sinks
      // toward the dark — through the SAME fog gate as the tell below.
      // Storyless ground keeps its fill byte-identical (the helper returns
      // the input string untouched).
      const fill = tierMapTint(z, known || scouted, tierTintBase);
      // ZONE-KIND identity (data/zoneKinds.ts — the town's ring + glyph). Fog
      // gates it exactly like the name: an unvisited minted town keeps its secret.
      const kd = known || scouted ? zoneKindOf(z) : undefined;
      const lvText = z.objective.kind === 'waves' && z.objective.waves === 0
        ? 'endless waves' : `monster lv ${z.level}`;
      const sub = kd ? `${kd.label}${kd.subLabel ? ` — ${kd.subLabel}` : ''}${kd.keepLevel ? ` · ${lvText}` : ''}`
        : bi ? `${bi.label} · ${lvText}` : lvText;
      // Each node is one <g data-zone> so a delegated hover handler can identify
      // the zone with no geometry math (the browser hit-tests the SVG for us); the
      // existing .wp-node click + the drag-guard still target the inner elements.
      const pinned = this.pinnedZone === z.id;
      const r = current ? 13 : 10;
      const travelAttrs = canTravel ? ` class="wp-node" data-wp="${z.id}" style="cursor:var(--cursor-point, pointer)"` : '';
      // THE TIER TELL (tierMapTell above — ZoneDef.tiers distilled): multi-
      // story ground wears UNDER-DISCS peeking below the node, one per extra
      // story — solid rims for 'open' exposure (both layers visible: buttes,
      // summits), dashed for 'covered' (sewer ducts, stacked floors) — laid
      // BEFORE the main disc so only the lower crescents show. Same fog gate
      // as the fill and the kind glyph; pointer-transparent and <title>-free
      // like every other badge (THE INTERACTIVITY CONTRACT above), so the
      // node's hit shape never grows.
      const tt = tierMapTell(z, known || scouted);
      let tierMark = '';
      if (tt) {
        const underFill = bi ? mixHex(bi.mapColor, '#000000', 0.45) : '#1c1c26';
        for (let i = tt.floors - 1; i >= 1; i--) {
          tierMark += `<circle cx="${z.map.x}" cy="${z.map.y + i * 3.2}" r="${r}"
          fill="${underFill}" fill-opacity="${known ? 0.85 : 0.55}" stroke="${tt.tint}" stroke-width="1.4"
          ${tt.mark === 'covered' ? 'stroke-dasharray="2.6 2.2" ' : ''}pointer-events="none"/>`;
        }
      }
      // A FIELD zone renders like any other node: ONE circle, centred on the region (its
      // def.map is the blob centre). The region BOUNDS live on def.field but are NOT drawn —
      // the player understands a Field is a single zone, and the bbox stays available as the
      // Field's spatial "event node" (a stormfront / incursion can later target/show over it).
      nodes += `<g data-zone="${z.id}" style="cursor:var(--cursor-help, help)">
        <circle cx="${z.map.x}" cy="${z.map.y}" r="${MAP_CFG.nodeHitR}" fill="none" pointer-events="all"${travelAttrs}/>${tierMark}
        <circle cx="${z.map.x}" cy="${z.map.y}" r="${r}"
          fill="${fill}" fill-opacity="${known ? 0.85 : scouted ? 0.55 : 1}"
          stroke="${pinned ? '#5ad8d8' : current ? '#ffd700' : known ? '#d8d4c8' : scouted ? '#8fd4ff' : '#4a4a5e'}"
          stroke-width="${pinned ? 3 : current ? 3 : 1.5}" ${scouted ? 'stroke-dasharray="3 3"' : ''}${travelAttrs}/>
        ${kd?.ring ? `<circle cx="${z.map.x}" cy="${z.map.y}" r="${r + (kd.ring.gap ?? 3.5)}" fill="none"
          stroke="${kd.ring.color}" stroke-width="${kd.ring.width ?? 1.6}" pointer-events="none"/>` : ''}
        ${kd?.glyph ? `<text x="${z.map.x}" y="${(z.map.y + (kd.glyph.dy ?? 3.5)).toFixed(1)}" text-anchor="middle"
          font-size="${kd.glyph.size ?? 10}" fill="${kd.glyph.color}" pointer-events="none">${kd.glyph.char}</text>` : ''}
        ${wp ? `<rect x="${z.map.x - 16.5}" y="${z.map.y - 16.5}" width="9" height="9"
          fill="#5ad8d8" transform="rotate(45 ${z.map.x - 12} ${z.map.y - 12})"${travelAttrs}/>
        <circle cx="${z.map.x - 12}" cy="${z.map.y - 12}" r="${MAP_CFG.wpHitR}" fill="none" pointer-events="all"${travelAttrs}/>` : ''}
        ${z.port ? `<text x="${z.map.x + 14}" y="${z.map.y - 10}" text-anchor="middle"
          font-size="11" fill="#9ad0e8" pointer-events="none">⚓</text>` : ''}
        ${current ? `<text x="${z.map.x}" y="${z.map.y - 18}" text-anchor="middle"
          font-size="9" fill="#ffd700" pointer-events="none">YOU ARE HERE</text>` : ''}</g>`;

      // BERTHS (ZoneDef.berths): the zone's other MOUTHS — small discs of
      // the SAME zone at their true chart positions (the river's landings
      // along its ribbon). Same data-zone id, so hover/click/travel behave
      // exactly like the node; one sitting on the primary node is skipped.
      for (const p of z.berths ?? []) {
        if (Math.hypot(p.x - z.map.x, p.y - z.map.y) < 26) continue;
        nodes += `<g data-zone="${z.id}" style="cursor:var(--cursor-help, help)">
          <circle cx="${p.x}" cy="${p.y}" r="${MAP_CFG.nodeHitR * 0.7}" fill="none" pointer-events="all"${travelAttrs}/>
          <circle cx="${p.x}" cy="${p.y}" r="5.5" fill="${fill}" fill-opacity="${known ? 0.8 : scouted ? 0.5 : 0.9}"
            stroke="${kd?.ring?.color ?? (known ? '#d8d4c8' : '#4a4a5e')}" stroke-width="1.3"${travelAttrs}/></g>`;
      }

      // The NAME CARD: fixed (always-mode / pinLabel kind / pinned / you-are-
      // here), else hover-revealed by wireMapControls flipping `display` — no
      // rebuild on hover. A BACKDROP makes a card a card (hover tooltips, the
      // pin, towns); blanket always-mode labels stay bare text — the classic
      // chart, minus its hitboxes.
      const name = known || scouted ? z.name : '???';
      const fixed = labelMode === 'always' || !!kd?.pinLabel || pinned || current;
      const backdrop = labelMode !== 'always' || pinned || !!kd?.pinLabel;
      const showSub = known || scouted;
      const C = MAP_CFG.card;
      const cw = Math.max(name.length * C.charW, (showSub ? sub.length : 0) * C.subCharW) + C.padX * 2;
      cards += `<g class="zone-card" data-zl="${z.id}"${fixed ? ' data-fixed="1"' : ''}
        ${fixed || this.hoveredZone === z.id ? '' : 'display="none"'} pointer-events="none">
        ${backdrop ? `<rect x="${(z.map.x - cw / 2).toFixed(1)}" y="${z.map.y + C.top}" width="${cw.toFixed(1)}"
          height="${showSub ? C.hWithSub : C.h}" rx="${C.rx}" fill="${C.fill}"
          stroke="${kd?.ring?.color ?? C.stroke}" stroke-width="1"/>` : ''}
        <text x="${z.map.x}" y="${z.map.y + 26}" text-anchor="middle"
          font-size="11" fill="${kd?.labelColor ?? (known ? '#d8d4c8' : scouted ? '#a8c4d8' : '#55555f')}">${esc(name)}</text>
        ${showSub ? `<text x="${z.map.x}" y="${z.map.y + 38}" text-anchor="middle"
          font-size="9" fill="${kd ? kd.labelColor ?? '#8a8678' : bi ? bi.mapColor : '#8a8678'}">${esc(sub)}</text>` : ''}</g>`;
    }

    // World-sim overlays: drifting weather fronts and faction territory.
    // Washes sit under the roads/nodes; contest badges ride on top. Territory
    // only paints ground you've charted; the sky (weather) drifts everywhere.
    // SURFACE ONLY: the world-sim doesn't govern other dimensions (hell zones
    // never seed it — see chartFrontier), so its fronts/territory/biome wash
    // must not drift over the underworld tab.
    const known = zones.filter(z => visited.has(z.id) && (z.dimension ?? 'surface') === dim);
    const allLayers = world.sim.mapLayers(known, dim);
    const layers = allLayers.filter(l => !this.mapLayersOff.has(l.id));
    // WASH INTENSITY (Settings.mapWash — rails in MAP_CFG.wash): every overlay
    // WASH rides one alpha-slope filter, so the territory gradient can be
    // dimmed for a clean chart or CRANKED to read a warfront's exact reach
    // (the QA dial that ships). Badges/sigils/markers (the over layers) never
    // scale. Always mounted (slope 1 = the authored look) so the slider
    // live-tunes the standing SVG without a rebuild under the pointer.
    const washMul = this.getSettings().mapWash;
    const simUnder = `<defs><filter id="map-wash-fx"><feComponentTransfer>`
      + `<feFuncA type="linear" slope="${washMul.toFixed(2)}"/></feComponentTransfer></filter></defs>`
      + `<g filter="url(#map-wash-fx)">${layers.map(l => l.under).join('')}</g>`;
    const simOver = layers.map(l => l.over).join('');

    // NON-SURFACE SUBSTRATE WASH: another dimension's map paints its OWN biome
    // palette over the visible box (hell reads as rift/volcanic/flesh ground).
    // The SURFACE needs nothing here — its biome-field sim overlay paints land
    // AND the imposed OCEAN biome in one wash (the sea is a biome, not an
    // overlay stacked on a land heat-map).
    let ocean = '';
    if (dim !== 'surface') {
      const xs0 = zones.filter(z => world.visible(z)).map(z => z.map.x);
      const ys0 = zones.filter(z => world.visible(z)).map(z => z.map.y);
      if (xs0.length) {
        const pad = 320;
        const spanW = Math.max(...xs0) - Math.min(...xs0) + pad * 2;
        const spanH = Math.max(...ys0) - Math.min(...ys0) + pad * 2;
        // The step climbs a LADDER (130 × 2^k, ≤ ~4096 cells) so a run that
        // charts far and wide coarsens the wash instead of growing the sweep
        // unbounded — and, unlike a continuous formula, the lattice holds
        // PERFECTLY STILL between doublings (origins snap below): charting new
        // ground only adds rows/columns, it never re-tiles the whole wash.
        let step = 130;
        while (spanW / step > 64 || spanH / step > 64) step *= 2;
        // Snap the origin to the step lattice: growth only ADDS rows/columns,
        // so existing rects (and the cache key) hold still between charts.
        const ox0 = Math.floor((Math.min(...xs0) - pad) / step) * step;
        const oy0 = Math.floor((Math.min(...ys0) - pad) / step) * step;
        const ox1 = Math.max(...xs0) + pad, oy1 = Math.max(...ys0) + pad;
        // The dimension field is PURE per seed — the wash changes only when the
        // box (or tab) does, yet refreshMap rebuilds twice a second. Cache on
        // the box; seed in the key because a Start New Game re-rolls the world
        // while this Panels instance (and its cache) lives on.
        const key = `${dim},${world.sim.biomeField.fieldSeed},${ox0},${oy0},${ox1.toFixed(0)},${oy1.toFixed(0)},${step}`;
        if (this.oceanCache?.key === key) {
          ocean = this.oceanCache.svg;
        } else {
          for (let y = oy0; y <= oy1; y += step) {
            for (let x = ox0; x <= ox1; x += step) {
              const info = BIOMES[world.dimensionBiomeAtMap(dim, { x: x + step / 2, y: y + step / 2 })];
              if (!info) continue;
              // Honor the per-biome wash lever (surface parity): a course-
              // painted artery pops against the palette wash instead of every
              // biome flattening to one hardcoded opacity.
              ocean += `<rect x="${x}" y="${y}" width="${step}" height="${step}" fill="${info.mapColor}" opacity="${(info.washOpacity ?? 0.12).toFixed(2)}"/>`;
            }
          }
          this.oceanCache = { key, svg: ocean };
        }
      }
    }

    // MAP MARKERS: one generic pass over every registered source (quest "?",
    // corpse skull, …). 'charted' markers gate on a visited anchor (no spoilers);
    // 'always' markers (the quest target) pierce the fog. Adding a marker is a
    // registerMarkerSource() call — no edit here. Anchors on a zone node, or a
    // raw coordinate when the target isn't yet a charted node.
    // Markers are PAINT (the interactivity contract — ui/mapConfig.ts): the
    // whole layer renders inside a pointer-transparent group below, so a badge
    // on a zone passes hover/click/travel straight through to the node
    // geometry beneath it, and its words (title/detail) reach the player
    // through the ZONE PANE's marker fold (world/zoneInfo.ts) — never a
    // native tooltip fighting the hover card.
    let markers = '';
    for (const m of collectMarkers(world)) {
      const node = m.zoneId ? world.zoneMap[m.zoneId] : undefined;
      // Markers stay on THEIR dimension's tab — a zone-anchored marker derives
      // its plane from the zone, a raw-coord marker declares it. Without this,
      // a hell corpse skull or quest pin haunts the surface map (and vice versa).
      const mDim = node ? (node.dimension ?? 'surface') : (m.dimension ?? 'surface');
      if (mDim !== dim) continue;
      if (m.fog === 'charted' && (!node || !visited.has(node.id))) continue;
      const cx = node ? node.map.x : (m.coord?.x ?? 0);
      const cy = node ? node.map.y : (m.coord?.y ?? 0);
      const r = m.r ?? 9;
      markers += `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${m.fill}" stroke="${m.stroke}" stroke-width="1.5"/>`
        + `<text x="${cx}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${m.text}">${m.glyph}</text></g>`;
    }

    // The map grows as frontiers are charted — fit the view to the VISIBLE graph
    // (the fog policy). Margins run a little wide so drifting fronts have room.
    const shown = zones.filter(z => world.visible(z));
    const xs = (shown.length ? shown : zones).map(z => z.map.x);
    const ys = (shown.length ? shown : zones).map(z => z.map.y);
    // Overlay MAP EXTENTS: a layer painting past the charted rim (Deepwinter's
    // territory marching in from the unknown cold) stretches the fit so the
    // front is on screen from ignition day — the situational-awareness read.
    // Rides `layers`, so toggling the layer chip off un-stretches the view too.
    for (const l of layers) for (const p of l.extent) { xs.push(p.x); ys.push(p.y); }
    const minX = Math.min(...xs) - 95, maxX = Math.max(...xs) + 95;
    const minY = Math.min(...ys) - 80, maxY = Math.max(...ys) + 85;
    // Store the fitted box; the live zoom/pan are applied ON TOP (the map grows
    // with the world, so zooming keeps the fixed-size labels legible).
    this.mapBox = { minX, minY, w: maxX - minX, h: maxY - minY };
    const zPct = Math.round(this.mapZoom * 100);

    // Preserve the side-box scroll across the wholesale rebuild — else the 0.5s
    // auto-refresh snaps a pinned, scrolled list back to the top twice a second.
    const prevAsideScroll = this.worldMap.querySelector<HTMLElement>('#map-aside')?.scrollTop ?? 0;
    // The SVG ASSEMBLY enforces the interactivity contract STRUCTURALLY: every
    // layer but the nodes rides a pointer-events:none group (under: ocean/
    // washes/roads/stubs; over: markers/overlay badges/name cards). Paint
    // order is unchanged — but no overlay layer, shipped or future, can ever
    // hit-test over a zone or pop a native tooltip, with zero per-overlay
    // audits (an overlay-authored <title> inside a transparent group is inert
    // markup: no hit target, no tooltip).
    const html = `
      ${this.closeGlyphHtml()}<h2>World Map
        <span style="float:right;color:#8a8678;font-size:11px;font-weight:normal">
          <span class="map-zoom-grp">
            <button class="map-zoom" data-mz="out" title="zoom out">−</button>
            <button class="map-zoom" data-mz="reset" title="reset zoom">${zPct}%</button>
            <button class="map-zoom" data-mz="in" title="zoom in">＋</button>
          </span>
          &nbsp; ${visited.size} charted · <span style="color:#5ad8d8">◆</span> = travel</span></h2>
      ${this.mapTabsHtml()}
      <div style="font-size:11px;color:#9ab0c8;margin:-4px 0 6px 0">${world.sim.hudLine(world.zone, world.time)}
        <span style="color:#6a6a78"> · scroll to zoom, drag to pan · hover a zone, click to pin</span></div>
      ${this.mapLayerChipsHtml(allLayers)}
      <div class="map-body">
        <svg id="world-map-svg" viewBox="${this.mapViewBox()}" style="cursor:var(--cursor-grab, grab);touch-action:none"><g pointer-events="none">${ocean}${simUnder}${edges}${stubs}</g>${nodes}<g pointer-events="none">${markers}${simOver}${cards}</g></svg>
        <aside id="map-aside">${this.zoneBoxHtml(world)}</aside>
      </div>`;
    // Unchanged since the last write? Keep the standing SVG + its wiring.
    if (!this.setPanelHtml(this.worldMap, html)) return;
    const aside = this.worldMap.querySelector<HTMLElement>('#map-aside');
    if (aside) aside.scrollTop = prevAsideScroll;

    this.worldMap.querySelectorAll<SVGElement>('.wp-node').forEach(el => {
      el.addEventListener('click', () => {
        if (world.travelToWaypoint(el.dataset.wp!)) this.refreshMap();
      });
    });
    this.wireMapControls();
    this.wireMapTabs();
  }

  /** The Map | Quests tab row (shared by both views of the world-map panel). */
  private mapTabsHtml(): string {
    const tab = (id: 'map' | 'quests', label: string): string =>
      `<button class="book-tab ${this.mapTab === id ? 'active' : ''}" data-mtab="${id}">${label}</button>`;
    // DIMENSION TABS (the PoE Acts pattern): appear once a run has breached a
    // second worldmass — each tab is its own explorable map to flip through.
    const world = this.getWorld();
    let dims = '';
    if (this.mapTab === 'map' && world.discoveredDimensions.size > 1) {
      dims = [...world.discoveredDimensions].map(id => {
        const d = dimensionDef(id);
        return `<button class="book-tab ${this.mapDimension === id ? 'active' : ''}"
          data-mdim="${id}" style="color:${this.mapDimension === id ? d.color : ''}">${d.label}</button>`;
      }).join('');
      dims = `<span style="margin-left:14px;border-left:1px solid #3a3a4e;padding-left:10px">${dims}</span>`;
    }
    return `<div class="book-tabs" style="margin:2px 0 6px 0">${tab('map', 'Map')}${tab('quests', 'Quests')}${dims}</div>`;
  }

  private wireMapTabs(): void {
    this.worldMap.querySelectorAll<HTMLButtonElement>('.book-tab[data-mtab]').forEach(btn => {
      btn.addEventListener('click', () => { this.mapTab = btn.dataset.mtab as 'map' | 'quests'; this.refreshMap(); });
    });
    this.worldMap.querySelectorAll<HTMLButtonElement>('.book-tab[data-mdim]').forEach(btn => {
      btn.addEventListener('click', () => { this.mapDimension = btn.dataset.mdim!; this.refreshMap(); });
    });
    this.worldMap.querySelectorAll<HTMLButtonElement>('button[data-mlayer]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.mlayer!;
        if (this.mapLayersOff.has(id)) this.mapLayersOff.delete(id); else this.mapLayersOff.add(id);
        this.refreshMap();
      });
    });
    // THE WASH SLIDER: live-tune the standing SVG's filter slope (no rebuild
    // under the pointer — the auto-refresh holds while dragging), persist on
    // release. The filter is always mounted, so every input lands instantly.
    const washEl = this.worldMap.querySelector<HTMLInputElement>('#map-wash-mul');
    if (washEl) {
      washEl.addEventListener('pointerdown', () => { this.mapWashDragging = true; });
      washEl.addEventListener('input', () => {
        const st = this.getSettings();
        st.mapWash = +washEl.value;
        this.worldMap.querySelector('#map-wash-fx feFuncA')?.setAttribute('slope', st.mapWash.toFixed(2));
        const val = this.worldMap.querySelector<HTMLElement>('#map-wash-val');
        if (val) { val.textContent = `${st.mapWash.toFixed(2)}×`; val.style.color = st.mapWash !== 1 ? '#b8d8a8' : '#6a6a78'; }
      });
      const release = (): void => { this.mapWashDragging = false; this.saveSettings(); this.refreshMap(); };
      washEl.addEventListener('pointerup', release);
      washEl.addEventListener('change', release);
    }
  }

  /** LAYER TOGGLE CHIPS — one per sim overlay currently painting the map (plus
   *  any the user toggled off, so they can be re-lit). Auto-derived from the
   *  tagged mapLayers: a new overlay's layer gets its chip with zero edits
   *  here. The point is ATTRIBUTION — with weather/territory silenceable, a
   *  drifting front can never read as "the biome heat map changed". */
  private mapLayerChipsHtml(allLayers: { id: string; label: string; under: string; over: string }[]): string {
    const shown = allLayers.filter(l => l.under || l.over || this.mapLayersOff.has(l.id));
    if (!shown.length) return '';
    const chips = shown.map(l => {
      const off = this.mapLayersOff.has(l.id);
      return `<button data-mlayer="${esc(l.id)}" title="toggle this map layer"
        style="font-size:9px;padding:1px 7px;margin:0 3px 0 0;border-radius:8px;cursor:var(--cursor-point, pointer);
        border:1px solid ${off ? '#33333e' : '#4a4a5e'};background:${off ? '#141418' : '#22222e'};
        color:${off ? '#55555e' : '#b8b4a8'};${off ? 'text-decoration:line-through;' : ''}">${esc(l.label)}</button>`;
    }).join('');
    // The WASH slider rides the chip row: one intensity dial over every layer's
    // territory/weather wash (MAP_CFG.wash rails; Settings.mapWash persists).
    const wash = this.getSettings().mapWash;
    const washUi = `<span style="margin-left:10px;white-space:nowrap">wash
      <input id="map-wash-mul" type="range" min="${MAP_CFG.wash.min}" max="${MAP_CFG.wash.max}"
        step="${MAP_CFG.wash.step}" value="${wash}" style="width:76px;vertical-align:middle"
        title="Territory/weather wash intensity: crank it to read a warfront's exact reach and gradient; 1× is the authored look. Badges and markers never scale.">
      <span id="map-wash-val" style="color:${wash !== 1 ? '#b8d8a8' : '#6a6a78'}">${wash.toFixed(2)}×</span></span>`;
    return `<div style="font-size:9px;color:#6a6a78;margin:-2px 0 6px 0">layers: ${chips}${washUi}</div>`;
  }

  /** The QUESTS view of the map panel: the journal of active + completed quests. */
  private renderQuestsTab(world: World): void {
    const log = world.questLog();
    const badge = (c: string): string => c
      ? `<span style="font-size:9px;padding:1px 6px;border-radius:7px;background:#241f30;color:${QUEST_CATEGORY_COLORS[c as QuestCategory] ?? QUEST_CATEGORY_COLORS.campaign};margin-left:6px">${c}</span>`
      : '';
    const activeHtml = log.active.length
      ? log.active.map(e => {
        const color = e.ready ? '#7ec46a' : '#8a6ad0';
        const sub = e.ready ? '✓ objective done: return to the giver to claim' : (e.target ? `target: ${esc(e.target)}` : 'in progress');
        return `<div style="padding:7px 9px;margin:0 0 5px 0;background:#16161e;border-left:3px solid ${color};border-radius:4px">
          <div style="font-size:12px;color:#d8d4c8">${esc(e.label)}${badge(e.category)}</div>
          <div style="font-size:10px;color:${e.ready ? '#9ed88a' : '#8a8678'};margin-top:2px">${sub}</div></div>`;
      }).join('')
      : '<div style="color:#8a8678;font-size:11px;padding:6px 2px">No active quests. Linger by the quartermaster for work.</div>';
    const doneHtml = log.completed.length
      ? log.completed.map(e => `<div style="padding:6px 9px;margin:0 0 4px 0;background:#13130f;border-left:3px solid #4a4a40;border-radius:4px;opacity:0.7">
          <div style="font-size:12px;color:#9a968a;text-decoration:line-through">${esc(e.label)}${badge(e.category)}</div></div>`).join('')
      : '<div style="color:#8a8678;font-size:11px;padding:6px 2px">None yet.</div>';
    // Preserve scroll across the 0.5s auto-refresh (else a scrolled journal snaps to
    // the top twice a second) — same pattern as the map's #map-aside.
    const prevScroll = this.worldMap.querySelector<HTMLElement>('#quest-scroll')?.scrollTop ?? 0;
    const html = `
      ${this.closeGlyphHtml()}<h2>Quest Journal</h2>
      ${this.mapTabsHtml()}
      <div id="quest-scroll" style="overflow-y:auto;max-height:64vh;padding:2px 4px 8px 2px">
        <h3 style="font-size:12px;color:#c8a8e8;margin:4px 0 6px 0">Active (${log.active.length})</h3>
        ${activeHtml}
        <h3 style="font-size:12px;color:#8a8678;margin:14px 0 6px 0">Completed (${log.completed.length})</h3>
        ${doneHtml}
      </div>`;
    // Same skip-if-unchanged discipline as the map view (setPanelHtml).
    if (!this.setPanelHtml(this.worldMap, html)) return;
    const qs = this.worldMap.querySelector<HTMLElement>('#quest-scroll');
    if (qs) qs.scrollTop = prevScroll;
    this.wireMapTabs();
  }

  /** The zone the info box is describing: the pinned zone, else the hovered zone,
   *  else the zone the player stands in. (A pin/hover that points at a now-gone
   *  node falls through to the current zone.) */
  private boxZoneId(world: World): string {
    const pick = this.pinnedZone ?? this.hoveredZone;
    return pick && world.zoneMap[pick] ? pick : world.zone.id;
  }

  /** Render the right-hand zone-info box for the current selection. Pure HTML —
   *  the icons reuse each event's map glyph/colour for instant correspondence. */
  private zoneBoxHtml(world: World): string {
    const zoneId = this.boxZoneId(world);
    const zone = world.zoneMap[zoneId];
    const charted = world.visited.has(zoneId);
    // RECON parity with the chart: a surveyed zone shows its real name and
    // identity here too — the old visited-only gate said '???' in the box
    // while the map plainly printed the name beside it.
    const scouted = !charted && world.surveyed.has(zoneId);
    const revealed = (charted || scouted) && !!zone;
    const name = revealed ? zone!.name : '???';
    const pinned = this.pinnedZone === zoneId;
    // IDENTITY CHIPS — what this ground IS at a glance, mirroring the chart's
    // own glyphs: kind (Town), biome · monster level, waypoint, port.
    const kd = revealed ? zoneKindOf(zone!) : undefined;
    const bi = revealed ? biomeOf(zone!) : null;
    const chips: string[] = [];
    if (kd) {
      const kc = kd.ring?.color ?? '#ffd700';
      chips.push(`<span class="zi-chip" style="color:${kc};border-color:${kc}">${kd.glyph ? esc(kd.glyph.char) + ' ' : ''}${esc(kd.label)}${kd.subLabel ? ` — ${esc(kd.subLabel)}` : ''}</span>`);
    } else if (revealed) {
      // Plain level line — the ask itself (endless waves included) now lives
      // on the OBJECTIVE chip below, so the two never say the same thing.
      // The SUB-BIOME face (ZoneDef.variantName) surfaces HERE and only here
      // — the bare-name law keeps it off the walking name; the map supplies
      // the exact typing deliberately.
      const face = zone!.variantName ? `${esc(zone!.variantName)} · ` : '';
      chips.push(`<span class="zi-chip">${bi ? esc(bi.label) + ' · ' : ''}${face}monster lv ${zone!.level}</span>`);
    }
    // THE OBJECTIVE READ — "what this ground asks", straight from the data
    // vocabulary (objectiveRead / OBJECTIVE_READS, data/zones.ts). Same fog
    // gate as the name; 'safe' stays silent (the kind chip already says
    // sanctuary). WALKED ground names a lair's master; merely scouted ground
    // keeps the mystery. A sealing ask says so — the one fact that reroutes a
    // run — and a met one wears its ✓.
    if (revealed && zone!.objective.kind !== 'safe') {
      const o = zone!.objective;
      const or = objectiveRead(o);
      const done = world.completedObjectives.has(zoneId);
      const bossName = o.kind === 'boss' && charted ? MONSTERS[o.id]?.name : undefined;
      const label = bossName ? `${or.read}: ${bossName}` : or.read;
      const tail = done ? ' ✓' : objectiveSeals(o) ? ' · exits seal' : '';
      chips.push(`<span class="zi-chip"${done ? ' style="color:#7ec46a;border-color:#3a5a3e"' : ''}>${esc(or.glyph)} ${esc(label)}${esc(tail)}</span>`);
    }
    if (world.discoveredWaypoints.has(zoneId)) {
      chips.push(`<span class="zi-chip" style="color:#5ad8d8;border-color:#3a7a7a">◆ waypoint${zoneId !== world.zone.id ? ' — click its node to travel' : ''}</span>`);
    }
    if (revealed && zone!.port) {
      // The sea fabric's identity chip: which WATER this harbor serves, and
      // whether it's the sea's haven (world.seaNameOf re-derives pure).
      const seaName = world.seaNameOf(zone!);
      const tier = zone!.portTier === 'haven' ? 'haven' : 'port';
      chips.push(`<span class="zi-chip" style="color:#9ad0e8;border-color:#4a7a9a">⚓ ${tier}${seaName ? ` — ${esc(seaName)}` : ''}</span>`);
      // The harborhold's standing chip (data/harborholds.ts): the town's
      // state at a glance — besieged red, burned ember, open harbor-blue.
      const hh = zone!.harborhold;
      if (hh) {
        const label = HOLD_CLASSES[hh.cls]?.label ?? hh.cls;
        chips.push(hh.state === 'besieged'
          ? `<span class="zi-chip" style="color:#e88a8a;border-color:#9a4a4a">⚔ ${esc(label)} — besieged</span>`
          : hh.state === 'fallen'
            ? `<span class="zi-chip" style="color:#e8b07a;border-color:#9a6a3a">🔥 ${esc(label)} — burned</span>`
            : `<span class="zi-chip" style="color:#9ad0e8;border-color:#4a7a9a">⚑ ${esc(label)} — open · standing ${hh.prosperity}</span>`);
      }
    }
    const head = `<div class="zi-zone">${esc(name)}`
      + (pinned ? ` <span class="zi-pin" data-unpin="1">📌 unpin</span>` : '')
      + `</div>`
      + `<div class="zi-hint">${zoneId === world.zone.id ? 'you are here' : pinned ? 'pinned' : scouted ? 'scouted from afar, unwalked' : 'hovering'}</div>`
      + (chips.length ? `<div class="zi-chips">${chips.join('')}</div>` : '');

    const entries = zoneInfoFor(world, zoneId);
    if (entries.length === 0) {
      const msg = charted ? 'Nothing of note here.'
        : scouted ? 'Scouted from afar; walk its ground to learn more.'
          : 'Uncharted; explore to reveal.';
      return head + `<div class="zi-empty">${msg}</div>`;
    }
    const groups: { kind: ZoneInfoEntry['kind']; title: string }[] = [
      { kind: 'event', title: 'Events' },
      { kind: 'modifier', title: 'Modifiers' },
      { kind: 'condition', title: 'Conditions' },
    ];
    let body = '';
    for (const g of groups) {
      const rows = entries.filter(e => e.kind === g.kind);
      if (!rows.length) continue;
      body += `<div class="zi-group">${g.title}</div>`;
      for (const r of rows) {
        // A marker-mirroring row wears the SAME BADGE the chart draws (disc
        // fill + ring + glyph). Map icons are pointer-transparent paint, so
        // this row is the icon's one info surface — the correspondence must
        // be visual, not just a matching glyph.
        const icon = r.fill
          ? `<span class="zi-badge" style="background:${r.fill};border-color:${r.color ?? '#d8d4c8'};color:${r.glyphColor ?? r.color ?? '#d8d4c8'}">${esc(r.icon)}</span>`
          : `<span class="zi-icon" style="color:${r.color ?? '#d8d4c8'}">${esc(r.icon)}</span>`;
        body += `<div class="zi-row">` + icon
          + `<span class="zi-txt">${esc(r.label)}`
          + (r.detail ? ` <span class="zi-detail">— ${esc(r.detail)}</span>` : '')
          + `</span></div>`;
      }
    }
    return head + body;
  }

  /** Re-render ONLY the side box (never a full refreshMap, which would reset the
   *  hover/pan/scroll). Called from the hover/pin handlers. */
  private renderZoneBox(): void {
    const aside = this.worldMap.querySelector<HTMLElement>('#map-aside');
    if (aside) aside.innerHTML = this.zoneBoxHtml(this.getWorld());
  }

  /** Compute the world-map viewBox from the fitted box + the live zoom/pan,
   *  clamping the pan so the window can't slide off the charted graph. */
  private mapViewBox(): string {
    const b = this.mapBox;
    const z = clamp(this.mapZoom, 1, 6);
    this.mapZoom = z;
    // The map SVG is a FIXED square (#world-map .map-body svg, index.html), so we build
    // a SQUARE viewBox too — the longer of the two node-bounds axes becomes the side. The
    // world then maps 1:1 into the box with NO letterboxing and pan clamping stays exact,
    // and the whole charted graph is always visible at zoom 1 however lopsided it is (a
    // far-off Crusade stronghold / Caravan zone just shrinks the rest to fit, never
    // stretches the panel). Centre the square on the bounds centre.
    const side = Math.max(b.w, b.h);
    const vw = side / z, vh = side / z;
    const maxPanX = Math.max(0, (side - vw) / 2), maxPanY = Math.max(0, (side - vh) / 2);
    const px = clamp(this.mapPan.x, -maxPanX, maxPanX);
    const py = clamp(this.mapPan.y, -maxPanY, maxPanY);
    this.mapPan.x = px; this.mapPan.y = py;
    const cx = b.minX + b.w / 2 + px, cy = b.minY + b.h / 2 + py;
    return `${(cx - vw / 2).toFixed(1)} ${(cy - vh / 2).toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`;
  }

  /** Wire the map's zoom buttons + wheel-zoom + drag-pan onto the freshly
   *  rendered SVG. All listeners live ON THE SVG (re-created each refresh, so the
   *  old ones are GC'd — no leak), and pointer-capture keeps a drag alive off the
   *  edge, so we never attach a leaky window-level listener. Gesture rules
   *  (pan buttons, chord/capture-loss self-healing) live in attachPanZoom —
   *  the self-healing is what guarantees mapDragging always returns to false,
   *  so the 0.5s auto-refresh can never be wedged off permanently. */
  private wireMapControls(): void {
    const svg = this.worldMap.querySelector<SVGSVGElement>('#world-map-svg');
    if (!svg) return;
    const apply = (): void => {
      svg.setAttribute('viewBox', this.mapViewBox());
      const lbl = this.worldMap.querySelector<HTMLElement>('[data-mz="reset"]');
      if (lbl) lbl.textContent = `${Math.round(this.mapZoom * 100)}%`;
    };
    this.worldMap.querySelectorAll<HTMLButtonElement>('.map-zoom').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mz = btn.dataset.mz;
        if (mz === 'in') this.mapZoom = clampZoom(this.mapZoom * PANZOOM_DEFAULTS.buttonFactor);
        else if (mz === 'out') this.mapZoom = clampZoom(this.mapZoom / PANZOOM_DEFAULTS.buttonFactor);
        else { this.mapZoom = 1; this.mapPan = { x: 0, y: 0 }; }
        apply();
      });
    });
    const zoneAt = (e: Event): string | null =>
      (e.target as Element).closest('[data-zone]')?.getAttribute('data-zone') ?? null;
    // Flip a hover-revealed name card in place (no rebuild — a rebuild would
    // reset zoom/pan). Fixed cards (towns, the pin, always-mode, you-are-here)
    // carry data-fixed and never flip.
    const hoverCard = (zid: string | null, show: boolean): void => {
      if (!zid) return;
      const card = svg.querySelector<SVGGElement>(`.zone-card[data-zl="${zid}"]:not([data-fixed])`);
      if (!card) return;
      if (show) card.removeAttribute('display');
      else card.setAttribute('display', 'none');
    };
    attachPanZoom(svg, {
      getZoom: () => this.mapZoom,
      setZoom: (z) => { this.mapZoom = z; },
      panBy: (dx, dy) => { this.mapPan.x += dx; this.mapPan.y += dy; },
      box: () => this.mapBox,
      apply,
      ignore: '.wp-node', // let waypoint travel-clicks through
      // HOVER preview — raise the zone's name card and update the side box (a
      // pin, if set, takes precedence inside boxZoneId, so hovering elsewhere
      // while pinned leaves the box alone; the card still follows the cursor).
      onIdleMove: (e) => {
        const zid = zoneAt(e);
        if (zid !== this.hoveredZone) {
          hoverCard(this.hoveredZone, false);
          hoverCard(zid, true);
          this.hoveredZone = zid;
          this.renderZoneBox();
        }
      },
      onLeave: () => {
        if (this.hoveredZone !== null) {
          hoverCard(this.hoveredZone, false);
          this.hoveredZone = null;
          this.renderZoneBox();
        }
      },
      // CLICK a zone to PIN it (toggle) — so the cursor can leave to scroll the box.
      // Drag-ending clicks are already swallowed by attachPanZoom; waypoint nodes
      // keep their travel click. Pin flips a node highlight, so a full refresh is OK
      // here (it's a click, not the hover path) and preserves zoom/pan.
      onClick: (e) => {
        if ((e.target as Element).closest('.wp-node')) return;
        const zid = zoneAt(e);
        if (!zid) return;
        this.pinnedZone = this.pinnedZone === zid ? null : zid;
        this.refreshMap();
      },
      onDragState: (d) => { this.mapDragging = d; },
    });

    // UNPIN via the box's "unpin" affordance (delegated on the aside, which is
    // recreated each refresh so the listener GC's with it — no leak).
    const aside = this.worldMap.querySelector<HTMLElement>('#map-aside');
    aside?.addEventListener('click', (e) => {
      if ((e.target as Element).closest('[data-unpin]')) { this.pinnedZone = null; this.refreshMap(); }
    });
  }

  // ------------------------------------------------------------ death screen

  // What main.ts hands the death screen: the reckoning's appraisal
  // (world.reckonRunEssence), the journey score, and the chronicle standing
  // (null = a sealed stage's conclusion, off the board).
  // Exported as a type so the host flow and this screen can never drift.

  /** The run's epitaph + THE APPRAISAL: what the run still carried, read
   *  tier by tier through the strict mortal exchange, and where it stands
   *  in the chronicle. One road out — the Reckoning (the Vault as the
   *  run's closing prompt); its seal is what finally lands on `onDone`
   *  (the main menu). */
  showDeath(reck: RunReckoning, onDone: () => void): void {
    this.hideAll();
    const world = this.getWorld();
    const acc = this.getAccount();
    // RETIREMENT is the death flow wearing its good clothes: same appraisal,
    // same reckoning — but the character walked, and the copy says so.
    // THE FALL (the resurrection covenant) is the death flow keeping the
    // body: the vessel persists, fallen, and the copy points at the Vault.
    const retired = world.runEndReason === 'retire';
    const fell = world.runEndReason === 'fall';
    const fallFee = fell
      ? acc.roster.find(r => r.charId === world.meta.charId)?.fallen?.fee ?? null
      : null;
    const title = retired ? 'RETIRED FROM THE WAKE' : fell ? 'THE VESSEL FALLS' : 'YOU HAVE DIED';
    const deed = retired
      ? `hangs up the blade at ${world.zone.name}, and joins the mercenary roster (${acc.mercRoster.length} retired)`
      : `fell in ${reck.zoneName ?? world.zone.name}`;
    const who = world.meta.name !== world.meta.classDef.name ? `${esc(world.meta.name)} — ` : '';
    const rowHtml = (r: { id: EssenceId; count: number; worth: number; value: number }): string => {
      const e = ESSENCES[r.id];
      return `<div class="reck-row"><span style="color:${e.color}">${e.glyph} ${r.count} ${e.label}</span>
        <span class="reck-x">× ${r.worth}</span><span class="reck-v">${r.value}</span></div>`;
    };
    const rows = reck.rows.length
      ? reck.rows.map(rowHtml).join('')
      : `<div class="reck-row" style="color:var(--text-dim)">no essence carried — spent along the way, or never found</div>`;
    const multRow = reck.mult !== 1
      ? `<div class="reck-row"><span style="color:#b8a0e0">the covenant's tithe rate</span>
          <span class="reck-x">× ${reck.mult}</span><span class="reck-v">${reck.minted}</span></div>`
      : '';
    const st = reck.standing;
    const standingLine = !st ? ''
      : st.byEssence === 1 && st.of > 1
        ? `<div class="reck-standing" style="color:var(--gold)">Your richest harvest yet — first of ${st.of} remembered runs.</div>`
        : st.of > 1
          ? `<div class="reck-standing">Harvest #${st.byEssence} · Renown #${st.byRenown} — of ${st.of} remembered runs.</div>`
          : `<div class="reck-standing">The chronicle opens: this run is its first entry.</div>`;
    this.deathScreen.innerHTML = `
      <h1>${title}</h1>
      <div>${who}Level ${world.player.level} ${world.meta.classDef.name}
        &nbsp;·&nbsp; ${deed} &nbsp;·&nbsp;
        ${world.visited.size} zones explored &nbsp;·&nbsp; ${world.kills} kills
        &nbsp;·&nbsp; Renown ${reck.renown}</div>
      ${retired ? `<div style="margin-top:6px;color:#b8a0e0">Some future run will find them at an outpost, sword-arm for hire.</div>` : ''}
      ${fell ? `<div style="margin-top:6px;color:#b8a0e0">The covenant holds what death cannot keep: the vessel waits in Lastlight, fallen${
        fallFee !== null ? `, and <b>${fallFee} ${META_CURRENCY_LABEL}</b> resurrects it` : ''}.
        Pour it at the Vault's Fallen shelf — your mortal runs' harvests, invested across as many reckonings as it takes.</div>` : ''}
      <div class="reck-table">
        <div class="reck-head">THE APPRAISAL — carried essence, at the mortal exchange</div>
        ${rows}${multRow}
        <div class="reck-row reck-total"><span>${META_CURRENCY_LABEL} to assign</span>
          <span class="reck-x"></span><span class="reck-v" id="death-mint">${reck.minted}</span></div>
      </div>
      ${standingLine}
      <div style="margin-top:6px;color:var(--text-dim);font-size:12px">
        What you assign at the Reckoning is kept forever; what you leave does not cross to the next run.</div>
      <button id="reckon-btn">${reck.minted > 0 ? `The Reckoning — assign your ${META_CURRENCY_LABEL}` : retired || fell ? 'Onward' : 'Rise Again'}</button>`;
    this.deathScreen.classList.remove('hidden');

    // A short count-up on the minted total — the appraisal landing. The
    // interval self-heals: it dies the moment its span leaves the DOM.
    const mintEl = document.getElementById('death-mint');
    if (mintEl && reck.minted > 0) {
      const dur = 900;
      const start = performance.now();
      const timer = window.setInterval(() => {
        if (!mintEl.isConnected) { window.clearInterval(timer); return; }
        const t = Math.min(1, (performance.now() - start) / dur);
        const ease = 1 - Math.pow(1 - t, 3);
        mintEl.textContent = `${Math.round(reck.minted * ease)}`;
        if (t >= 1) {
          window.clearInterval(timer);
          mintEl.textContent = `${reck.minted}`;
          mintEl.animate(
            [{ textShadow: '0 0 18px var(--gold)', color: '#ffe9a8' }, { textShadow: 'none' }],
            { duration: 600 },
          );
        }
      }, 40);
    }

    document.getElementById('reckon-btn')!.addEventListener('click', () => {
      this.deathScreen.classList.add('hidden');
      // Minted nothing → there is no reckoning to hold; straight home.
      // (Legacy banked essence still reckons: credits > 0 arms the seal law.)
      if (acc.credits > 0) this.showAccountScreen(onDone);
      else onDone();
    });
  }

  // --------------------------------------------------------------- chronicle

  /** THE RUN CHRONICLE — the account's own leaderboard (meta/account.ts
   *  runRecords): every remembered run, rankable by harvest (the reckoning's
   *  mint), by renown (the journey score), or by date, with the account
   *  level's progress read beside it. A personal competition: the player
   *  against every run they have ever finished. Renders into the Vault's
   *  screen element (one full-screen surface, two faces). */
  showChronicle(onClose?: () => void): void {
    this.hideAll();
    const acc = this.getAccount();
    const render = (): void => {
      const sort = this.chronicleSort;
      const rows = [...acc.runRecords];
      if (sort === 'essence') rows.sort((a, b) => b.essence - a.essence || b.at - a.at);
      else if (sort === 'renown') rows.sort((a, b) => b.renown - a.renown || b.at - a.at);
      else rows.sort((a, b) => b.at - a.at);
      const latestAt = acc.runRecords.reduce((m, r) => Math.max(m, r.at), 0);
      // Account-level progress, derived from the curve's own inverse.
      const prev = accountLevelThreshold(acc.level);
      const next = accountLevelThreshold(acc.level + 1);
      const pct = Math.min(100, Math.round(((acc.lifetimeCredits - prev) / Math.max(1, next - prev)) * 100));
      const reasonFace = (r: RunRecord): string =>
        r.reason === 'retire' ? '⚑ retired' : r.reason === 'forfeit' ? '↩ ended' : '☠ fell';
      const rowHtml = (r: RunRecord, i: number): string => {
        const cls = CLASSES.find(c => c.id === r.classId);
        const who = r.name && r.name !== (cls?.name ?? '') ? `${esc(r.name)} <span class="chron-cls">${esc(cls?.name ?? r.classId)}</span>` : esc(cls?.name ?? r.classId);
        return `
          <div class="chron-row${r.at === latestAt ? ' chron-latest' : ''}">
            <span class="chron-rank">#${i + 1}</span>
            <span class="chron-who">${who}</span>
            <span>L${r.level}</span>
            <span>${r.zones} zones</span>
            <span>${r.kills} kills</span>
            <span class="chron-reason">${reasonFace(r)}</span>
            <span class="chron-ess" title="${META_CURRENCY_LABEL} minted at the reckoning">${r.essence}</span>
            <span class="chron-ren" title="Renown — the journey score">${r.renown}</span>
            <span class="chron-when">${new Date(r.at).toLocaleDateString()}</span>
          </div>`;
      };
      const sortBtn = (id: typeof sort, label: string): string =>
        `<button data-chron-sort="${id}" class="${sort === id ? 'active' : ''}">${label}</button>`;
      this.accountScreen.innerHTML = `
        <div class="vault-head">
          <h1>The Chronicle: Remembered Runs</h1>
          <div class="acct-head">Account Level <b>${acc.level}</b>
            <span class="chron-lvlbar" title="${acc.lifetimeCredits} lifetime ${META_CURRENCY_LABEL} — level ${acc.level + 1} at ${next}"><i style="width:${pct}%"></i></span>
            &nbsp;·&nbsp; ${acc.lifetimeCredits} lifetime ${META_CURRENCY_LABEL}
            &nbsp;·&nbsp; ${acc.runRecords.length} run${acc.runRecords.length === 1 ? '' : 's'} remembered</div>
          <div class="book-tabs vault-tabs">
            ${sortBtn('essence', 'Best Harvest')}${sortBtn('renown', 'Best Renown')}${sortBtn('latest', 'Latest')}</div>
        </div>
        <div class="vault-body">${rows.length
          ? `<div class="chron-table">
              <div class="chron-row chron-head"><span>rank</span><span>who</span><span>level</span><span>zones</span>
                <span>kills</span><span>end</span><span>${META_CURRENCY_LABEL}</span><span>renown</span><span>when</span></div>
              ${rows.map(rowHtml).join('')}</div>`
          : `<div class="vault-empty">No runs remembered yet. Conclude one — however it goes — and the chronicle begins.</div>`}
        </div>
        <div class="vault-foot acct-btns"><button id="chron-close">Back</button></div>`;
      this.accountScreen.querySelectorAll<HTMLElement>('[data-chron-sort]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.chronicleSort = btn.dataset.chronSort as typeof sort;
          render();
        });
      });
      document.getElementById('chron-close')!.addEventListener('click', () => {
        this.accountScreen.classList.add('hidden');
        if (onClose) onClose();
      });
    };
    render();
    this.accountScreen.classList.remove('hidden');
  }

  // ------------------------------------------------------------ skill graft

  /** THE SKILL GRAFT PICK (meta/unlocks.ts kind 'graft' — the armed charge):
   *  the run-start screen where the player chooses ONE unlocked skill to
   *  ride in beside the class kit at its plainest cut. Selection is
   *  deliberate and two-step (pick a card, then confirm) — the charge
   *  spends only when the run actually begins with the choice; beginning
   *  WITHOUT one keeps the charge armed for a later run. The list reads the
   *  account's own drop pool (isSkillUnlockedForDrop — the Grand Codex
   *  opens the whole book), the blue-mage/bestiary lane's discipline:
   *  you graft only what your line has truly unlocked. */
  showSkillGraftPick(onPick: (skillId: string | null) => void): void {
    this.hideAll();
    const acc = this.getAccount();
    const skills = SKILL_LIST
      .filter(s => !s.noDrop && isSkillUnlockedForDrop(acc, s.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    let chosen: string | null = null;
    let query = '';
    // A skill's searchable voice: name + description (the codex-wide book
    // needs the filter far more than the young account's dozen).
    const corpus = new Map(skills.map(s =>
      [s.id, `${s.name} ${s.description ?? ''}`.toLowerCase()] as const));
    // STATIC SHELL, LIVE GRID: the head (with the search box) and the foot
    // render once and keep their focus/listeners; only the grid and the
    // confirm button's face update — typing never loses the input.
    this.accountScreen.innerHTML = `
      <div class="vault-head">
        <h1>Skill Grafting: Choose the Rider</h1>
        <div class="acct-head">One unlocked skill joins your class's kit at its plainest cut
          (level 1, common) — learned where your young hands can hold it, packed where they cannot.
          The charge spends as this run begins; choose, or carry it on.</div>
        <div class="acct-head"><input id="graft-search" class="tree-search" type="text"
            placeholder="search skills…" title="Matches skill names and descriptions.">
          <span id="graft-search-n" class="tree-search-n"></span></div>
      </div>
      <div class="vault-body"><div class="unlock-grid" id="graft-grid"></div></div>
      <div class="vault-foot acct-btns">
        <button id="graft-go" disabled>Choose a skill to graft</button>
        <button id="graft-skip" title="The charge keeps — it only spends when a run begins with a chosen skill.">Begin Without a Graft</button>
      </div>`;
    const grid = this.accountScreen.querySelector<HTMLElement>('#graft-grid')!;
    const goBtn = this.accountScreen.querySelector<HTMLButtonElement>('#graft-go')!;
    const countEl = this.accountScreen.querySelector<HTMLElement>('#graft-search-n')!;
    const updateFoot = (): void => {
      goBtn.disabled = !chosen;
      goBtn.textContent = chosen
        ? `Graft ${SKILLS[chosen]?.name ?? chosen} onto this run` : 'Choose a skill to graft';
    };
    const updateGrid = (): void => {
      const q = query.trim().toLowerCase();
      const shown = q ? skills.filter(s => corpus.get(s.id)!.includes(q)) : skills;
      countEl.textContent = q ? `${shown.length} of ${skills.length}` : `${skills.length} skills`;
      grid.innerHTML = shown.length ? shown.map(s => `
        <div class="unlock-card graft-card${chosen === s.id ? ' graft-chosen' : ''}" data-graft-skill="${s.id}"
          title="${esc(s.description ?? s.name)}">
          <div class="ukind" style="color:${s.color ?? 'var(--text-dim)'}">skill</div>
          <div class="uname">${esc(s.name)}</div>
        </div>`).join('')
        : `<div class="vault-empty">Nothing answers to “${esc(query.trim())}”.</div>`;
      grid.querySelectorAll<HTMLElement>('[data-graft-skill]').forEach(card => {
        card.addEventListener('click', () => {
          chosen = chosen === card.dataset.graftSkill ? null : card.dataset.graftSkill!;
          grid.querySelectorAll<HTMLElement>('.graft-card').forEach(c =>
            c.classList.toggle('graft-chosen', c.dataset.graftSkill === chosen));
          updateFoot();
        });
      });
    };
    const search = this.accountScreen.querySelector<HTMLInputElement>('#graft-search')!;
    search.addEventListener('input', () => { query = search.value; updateGrid(); });
    goBtn.addEventListener('click', () => {
      if (!chosen) return;
      this.accountScreen.classList.add('hidden');
      onPick(chosen);
    });
    this.accountScreen.querySelector<HTMLElement>('#graft-skip')!.addEventListener('click', () => {
      this.accountScreen.classList.add('hidden');
      onPick(null);
    });
    updateGrid();
    this.accountScreen.classList.remove('hidden');
    search.focus();
  }

  // ------------------------------------------------------------ escape menu

  /** The in-run pause menu (Escape): resume, remap keys, end the run, or close.
   *  While it's open `escapeMenuOpen` is true, gameplay input is paused —
   *  and the WORLD ITSELF holds still: the 'menu:escape' timeflow surface
   *  (TIME_CFG.surfaces) freezes the sim while the menu is up. The engine's
   *  allowHold policy (wired in main.ts) refuses the hold in live co-op —
   *  a shared world is never one player's to stop. */
  showEscapeMenu(): void {
    // THE HARVEST PAUSE LAW (engine/harvest.ts): while a rite's world-freeze
    // stands the pause toggle REFUSES — a pause atop the freeze would hold
    // the sequence prompt still for free reading (the anti-memorize law).
    // One engine predicate + one engine voice; every road to the menu
    // (Escape, pad START) funnels through here.
    if (this.getWorld().harvestPauseLocked()) {
      this.getWorld().harvestPauseRefused();
      return;
    }
    this.escapeMenuOpen = true;
    this.getWorld().timeflow.holdSurface('menu:escape');
    const root = this.escapeMenu;

    const showMain = (): void => {
      // A roster-saved character (an Immortal vessel) persists by design — its
      // "End Run" is Save & Main Menu (world.endRun reroutes there too). Only
      // run-saved mortals get the bank-and-permadeath forfeit.
      const rosterMode = !this.isCoopClient() && modeById(this.getWorld().meta.modeId).save === 'roster';
      // THE COUCH ROWS (data/couch.ts): exist ONLY when a couch session is
      // even possible — main.ts wired the flow, enough controllers are
      // connected, and a guest seat is free (or filled, for Leave). Solo
      // machines never see either.
      const couchSeated = this.getWorld().couchSeats().length;
      // …and never mid-SCENE (engine/scenes.ts): a cinematic's holds, fell
      // covenant and staged spawns are authored for the one hero living the
      // introduction — the join row returns the moment the scene ends.
      const couchPossible = this.onCouchJoin && !this.isCoopClient()
        && !this.getWorld().scene
        && couchSeated < COUCH_CFG.join.maxLocal - 1;
      // Below the census the row still TEACHES: a controller is invisible to
      // the browser until its first button press (the gamepad privacy gate),
      // so the disabled row names the unlock — and the census watcher
      // (main.ts couchTick → refreshEscapeCouchRow) enables it live the
      // moment that press lands. couchMinPads() = the dial, or the
      // ?couchpads dev lever (the KB-hero + one-pad-guest couch).
      const needPads = couchMinPads();
      const couchRow = !couchPossible ? ''
        : connectedPadIndices().length >= needPads
          ? '<button id="esc-couch">Local Co-op: Player Joins</button>'
          : `<button id="esc-couch" disabled>Local Co-op: press any button on ${needPads > 1 ? 'a 2nd controller' : 'a controller'}</button>`;
      const couchLeaveRow = this.onCouchLeave && couchSeated > 0
        ? '<button id="esc-couch-leave">Local Co-op: Guest Leaves</button>' : '';
      root.innerHTML = `
        ${this.closeGlyphHtml('Resume (Esc)')}<h1>Paused</h1>
        <div class="esc-btns">
          <button id="esc-resume">Resume</button>
          ${couchRow}${couchLeaveRow}
          <button id="esc-keys">Options</button>
          <button id="esc-end">${this.isCoopClient() ? 'Leave Co-op' : rosterMode ? 'Save & Main Menu' : 'End Run'}</button>
          <button id="esc-close">Close Game</button>
        </div>`;
      document.getElementById('esc-resume')!.addEventListener('click', () => this.hideEscapeMenu());
      document.getElementById('esc-couch')?.addEventListener('click', () => {
        this.hideEscapeMenu();
        this.onCouchJoin!();
      });
      document.getElementById('esc-couch-leave')?.addEventListener('click', () => {
        this.hideEscapeMenu();
        this.onCouchLeave!();
      });
      document.getElementById('esc-keys')!.addEventListener('click', () => this.renderOptions(root, showMain));
      document.getElementById('esc-end')!.addEventListener('click', () => {
        // CLIENT: world is a render SHELL — never run host-authoritative endRun()
        // (it would corrupt the shell with no effect). Leave the session instead.
        if (this.isCoopClient()) {
          if (window.confirm('Leave this co-op session?')) { this.hideEscapeMenu(); this.onLeaveCoop(); }
          return;
        }
        if (rosterMode) {
          // Non-destructive: endRun() reroutes roster modes to Save & Main Menu.
          this.hideEscapeMenu();
          this.getWorld().endRun();
          return;
        }
        if (window.confirm(`End this run? Your carried essence is appraised into ${META_CURRENCY_LABEL} at the Reckoning; the character is lost (permadeath).`)) {
          this.hideEscapeMenu();
          this.getWorld().endRun();   // reuses the death → reckoning → permadeath flow
        }
      });
      document.getElementById('esc-close')!.addEventListener('click', () => {
        try { window.close(); } catch { /* browsers block closing non-script-opened tabs */ }
        root.innerHTML = `
          ${this.closeGlyphHtml('Resume (Esc)')}<h1>Progress Saved</h1>
          <div class="acct-head">Your account and character are saved. Close this browser tab to exit.</div>
          <div class="esc-btns"><button id="esc-back2">Back</button></div>`;
        document.getElementById('esc-back2')!.addEventListener('click', showMain);
      });
    };

    this.escRefresh = showMain; // the couch census watcher may re-render main
    showMain();
    root.classList.remove('hidden');
  }

  hideEscapeMenu(): void {
    this.escapeMenuOpen = false;
    this.escRefresh = null;
    this.getWorld().timeflow.release('menu:escape'); // the world breathes again
    this.disarmRebind(); // Esc-dismissal can close the keybind sub-view mid-arm
    this.escapeMenu.classList.add('hidden');
  }

  /** Tear down any pending rebind capture listener (see `armedRebind`) — the
   *  keyboard one AND the pad one. Safe to call when none is armed. Invoked on
   *  every re-render and on any navigation away from the keybind view. */
  private disarmRebind(): void {
    if (this.armedRebind) {
      window.removeEventListener('keydown', this.armedRebind, true);
      this.armedRebind = null;
    }
    this.disarmPadCapture?.();
  }

  /** Shared keybind rebind view, rendered into `root` (escape menu OR start
   *  menu). `onBack` returns to whichever menu opened it. */
  private renderOptions(root: HTMLElement, onBack: () => void): void {
    this.disarmRebind(); // drop any capture left armed by a prior render
    const s = this.getSettings();
    const kb = s.keybinds;
    const rows = ACTION_IDS.map(a => `
      <div class="rebind-row">
        <span>${ACTION_LABELS[a]}</span>
        <button data-rebind="${a}">${keyDisplay(kb[a])}</button>
      </div>`).join('');
    // The CONTROLLER half: the same actions on a second map (plus bar slots
    // 0/1, which only a pad can rebind — the mouse owns them otherwise), and
    // the analog feel tunables. All persisted in Settings alongside keybinds.
    const padRows = PAD_ACTION_IDS.map(a => `
      <div class="rebind-row">
        <span>${PAD_ACTION_LABELS[a]}</span>
        <button data-padrebind="${a}">${padDisplay(s.padBinds[a])}</button>
      </div>`).join('');
    const tab = this.optionsTab;
    const tabStrip = `<div class="book-tabs stat-tabs">${([
      ['controls', 'Controls', 'Keyboard binds and input feel'],
      ['controller', 'Controller', 'Pad binds and analog tuning'],
      ['interface', 'Interface', 'Scale, cursor, markers, readouts'],
      ['visuals', 'Visuals', 'Camera and battlefield presentation'],
    ] as const).map(([id, label, blurb]) =>
      `<button class="book-tab${tab === id ? ' active' : ''}" data-opttab="${id}" title="${blurb}">${label}</button>`).join('')}</div>`;
    const controlsTab = `
      <h1>Keybinds</h1>
      <div class="acct-head">LMB / RMB drive skills 1 &amp; 2 (fixed). Click a key, then press a new one (Esc cancels).</div>
      <div class="rebind-list">${rows}</div>
      <div class="rebind-row">
        <span>Invert Movement</span>
        <button id="opt-invertmove" title="Up walks down, left walks right: movement keys and the move stick alike (Swap Sticks trades WHICH stick moves; this flips WHICH WAY movement goes). Fair warning: the widdershins hex inverts controls too, so wearing it while this is ON plays standard for the duration; two turns make a true.">${s.invertMove ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Improvised Strike (empty slots swing)</span>
        <button id="opt-improvised" title="Pressing an EMPTY bar slot swings a fixed, gemless improvised strike, the floor no kit falls beneath. Turn OFF to make empty slots dead keys (a stray press mid-dodge costs the swing's half-second; the risk budget is yours).">${s.improvisedStrike ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Gear Pickup</span>
        <button id="opt-gearpickup">${s.gearPickup === 'key'
          ? `PRESS ${keyDisplay(s.keybinds.pickup)}` : 'WALK OVER'}</button>
      </div>`;
    const controllerTab = `
      <h1>Controller</h1>
      <div class="acct-head">Left stick moves · right stick aims (tilt = reach) · MENU pauses.
        In menus the left stick drives a pointer: Ⓐ clicks, Ⓑ backs out.
        Click a row, then press a pad button (MENU or Esc cancels).</div>
      <div class="rebind-list">${padRows}</div>
      <div class="rebind-row">
        <span>Stick Deadzone</span>
        <span class="pad-opt"><input type="range" id="opt-deadzone" min="5" max="50" step="1"
          value="${Math.round(s.pad.deadzone * 100)}"> <b id="val-deadzone">${Math.round(s.pad.deadzone * 100)}%</b></span>
      </div>
      <div class="rebind-row">
        <span>Aim Reach (full tilt)</span>
        <span class="pad-opt"><input type="range" id="opt-aimreach" min="150" max="900" step="10"
          value="${Math.round(s.pad.aimRadius)}"> <b id="val-aimreach">${Math.round(s.pad.aimRadius)}</b></span>
      </div>
      <div class="rebind-row">
        <span>Menu Pointer Speed</span>
        <span class="pad-opt"><input type="range" id="opt-padspeed" min="300" max="2500" step="50"
          value="${Math.round(s.pad.pointerSpeed)}"> <b id="val-padspeed">${Math.round(s.pad.pointerSpeed)}</b></span>
      </div>
      <div class="rebind-row">
        <span>Aim Sensitivity (right stick)</span>
        <span class="pad-opt"><input type="range" id="opt-aimsens" min="0" max="100" step="5"
          value="${Math.round(s.pad.aimSensitivity * 100)}"> <b id="val-aimsens">${Math.round(s.pad.aimSensitivity * 100)}%</b></span>
      </div>
      <div class="rebind-row">
        <span>Aim Assist (reticle magnetism)</span>
        <span class="pad-opt"><input type="range" id="opt-aimassist" min="0" max="100" step="5"
          value="${Math.round(s.pad.aimAssist * 100)}"> <b id="val-aimassist">${s.pad.aimAssist <= 0 ? 'OFF' : `${Math.round(s.pad.aimAssist * 100)}%`}</b></span>
      </div>
      <div class="rebind-row">
        <span>Aim Assist Style</span>
        <button id="opt-assistmode" title="${AIM_ASSIST_MODES.map(m => `${m.name}: ${m.blurb}`).join('\n')}">${(AIM_ASSIST_MODES.find(m => m.id === s.pad.assistMode) ?? AIM_ASSIST_MODES[0]).name}</button>
      </div>
      <div class="rebind-row">
        <span>Swap Sticks (southpaw)</span>
        <button id="opt-swapsticks">${s.pad.swapSticks ? 'ON' : 'OFF'}</button>
      </div>`;
    // SAVE PORTAGE (meta/portage.ts): the Interface tab's Save Data section.
    // Export is one click; import renders its overwrite confirm IN PLACE once
    // a picked file has validated whole (a refusal shows on the note line and
    // writes nothing).
    const sp = this.savePortPending;
    const savePortImportRow = sp ? `
      <div class="rebind-row">
        <span>File holds ${sp.summary.characters === 1 ? '1 hero' : `${sp.summary.characters} heroes`}, account level ${sp.summary.accountLevel}${sp.summary.exportedAt ? `, exported ${new Date(sp.summary.exportedAt).toLocaleDateString()}` : ''}</span>
        <span><button id="opt-saveport-confirm" title="No way back: the moment this is pressed, everything on this device is replaced by the file's contents and the game restarts into them.">OVERWRITE &amp; RESTART</button>
        <button id="opt-saveport-cancel" style="margin-left:5px">CANCEL</button></span>
      </div>` : `
      <div class="rebind-row">
        <span>Import Saves</span>
        <button id="opt-importsave" title="Pick a Hollow Wake save file to restore. The file is checked whole before anything is touched — a malformed or mismatched file is refused outright and changes nothing. Nothing merges: importing replaces this device's account, characters, and settings with the file's, then restarts the game.">CHOOSE FILE…</button>
      </div>`;
    const interfaceTabHead = `
      <div class="rebind-row">
        <span>UI Scale</span>
        <span class="pad-opt"><input type="range" id="opt-uiscale" min="${Math.round(UI_SCALE_CFG.min * 100)}" max="${Math.round(UI_SCALE_CFG.max * 100)}" step="${Math.round(UI_SCALE_CFG.step * 100)}"
          value="${Math.round(s.uiScale * 100)}"
          title="Grows the whole interface together (panels, tooltips, popups, and the on-screen HUD) so text stays readable at any eyesight. World text (damage numbers, nameplates) keeps battlefield scale."> <b id="val-uiscale">${Math.round(s.uiScale * 100)}%</b></span>
      </div>
      <div class="rebind-row">
        <span>Render Scale</span>
        <button id="opt-renderscale" title="Internal rendering resolution (render/renderScale.ts). The world view is identical at any setting; only pixel density changes.
AUTO: watches your live frame rate and steps down/up so the game holds smooth even on weak or degraded graphics paths (default)
Fixed %: pins the buffer at that share of the window">${s.renderScale === 'auto' ? 'AUTO' : `${Math.round((s.renderScale as number) * 100)}%`}</button>
      </div>
      <div class="rebind-row">
        <span>Map Zone Names</span>
        <button id="opt-maplabels" title="How the world map wears its name cards:
${MAP_LABEL_MODES.map(m => `${m.name}: ${m.blurb}`).join('\n')}
Towns keep their card in every mode, and cards never block a waypoint's click.">${(MAP_LABEL_MODES.find(m => m.id === s.mapLabels) ?? MAP_LABEL_MODES[0]).name}</button>
      </div>
      <div class="rebind-row">
        <span>Reawaken After Quit</span>
        <button id="opt-resume" title="Where a relaunched save wakes:
WHERE YOU STOOD: the exact spot, situation, and wounds the save captured (quitting out of trouble hands the trouble back)
IN LASTLIGHT: the sanctuary; the world stays explored, only you walk home
(A character mode may pin this choice.)">${this.getSettings().resumeSpawn === 'town'
          ? 'IN LASTLIGHT' : 'WHERE YOU STOOD'}</button>
      </div>
      <div class="rebind-row">
        <span>Aim Ticks (facing pointers)</span>
        <span>${Object.values(AIM_TICK_STYLES).map(st =>
          `<button data-aimtick-style="${st.id}" style="margin-left:5px;${st.id === s.aimTick.style
            ? 'border-color:var(--gold);color:var(--gold)' : ''}">${st.label}</button>`).join('')}</span>
      </div>
      <div class="rebind-row">
        <span>Aim Tick Opacity</span>
        <span class="pad-opt"><input type="range" id="opt-aimtick" min="0" max="100" step="5"
          value="${Math.round(s.aimTick.alpha * 100)}"> <b id="val-aimtick">${s.aimTick.alpha <= 0 ? 'HIDDEN' : `${Math.round(s.aimTick.alpha * 100)}%`}</b></span>
      </div>
      <div class="rebind-row">
        <span>Poise/Insight Arcs</span>
        <button id="opt-poolbars" title="When the poise/insight pool arcs show on the life orb:
SMART: around a recent change, or while dented on builds where the pool carries serious weight (default)
ON CHANGE: strictly around a recent change to the pool
ALWAYS: pinned on (the min-maxer's steady readout)">${{
          smart: 'SMART', recent: 'ON CHANGE', always: 'ALWAYS',
        }[s.poolBars]}</button>
      </div>
      <h1>Cursor</h1>
      <div class="acct-head">One identity for the mouse cursor and the pad's aim reticle:
        a shape and a tint that stand out against any battlefield.</div>
      <div class="rebind-row">
        <span>Style</span>
        <span>${Object.values(CURSOR_STYLES).map(st =>
          `<button data-cursor-style="${st.id}" style="margin-left:5px;${st.id === s.cursor.style
            ? 'border-color:var(--gold);color:var(--gold)' : ''}">${st.label}</button>`).join('')}</span>
      </div>
      <div class="rebind-row">
        <span>Tint</span>
        <span>${CURSOR_COLORS.map(c =>
          `<button data-cursor-color="${c.css}" title="${c.label}"
            style="margin-left:5px;width:26px;height:20px;vertical-align:middle;background:${c.css};
            border:2px solid ${c.css === s.cursor.color ? '#fff' : 'rgba(255,255,255,0.25)'};border-radius:3px"></button>`).join('')}</span>
      </div>
      <h1>Information Stream</h1>
      <div class="acct-head">Compose your own stream of information: what announces, where it stacks,
        and how long it stands. Gold = shown; dimmed = muted. Every switch takes effect on the next frame.</div>
      <div class="rebind-row">
        <span>World News Time</span>
        <span class="pad-opt"><input type="range" id="opt-noticesec" min="${NOTICE_CFG.secMin * 10}" max="${NOTICE_CFG.secMax * 10}" step="5"
          value="${Math.round(s.noticeSec * 10)}"
          title="How long each world-news line stands in the screen feed: held legible, then fading out by this clock. Every line runs its own timer, and the stack keeps the newest on top so nothing overprints."> <b id="val-noticesec">${s.noticeSec.toFixed(1)}s</b></span>
      </div>
      <div class="rebind-row">
        <span>World News Position</span>
        <button id="opt-noticeanchor" title="${NOTICE_ANCHORS.map(a => `${a.label}: ${a.blurb}`).join('\n')}">${(NOTICE_ANCHORS.find(a => a.id === s.noticeAnchor) ?? NOTICE_ANCHORS[0]).label.toUpperCase()}</button>
      </div>
      <div class="rebind-row">
        <span>News Channels</span>
        <span>${noticeChannels().map(c =>
          `<button data-notice-ch="${c.id}" title="${c.blurb}" style="margin-left:5px;${noticeChannelOn(s.noticeChannels, c.id)
            ? 'border-color:var(--gold);color:var(--gold)' : 'opacity:0.55'}">${c.label}</button>`).join('')}</span>
      </div>
      <div class="rebind-row">
        <span>Battlefield Text</span>
        <span>${floatKinds().map(k =>
          `<button data-float-kind="${k.id}" title="${k.blurb}" style="margin-left:5px;${floatKindOn(s.floatKinds, k.id)
            ? 'border-color:var(--gold);color:var(--gold)' : 'opacity:0.55'}">${k.label}</button>`).join('')}</span>
      </div>
      <div class="rebind-row">
        <span>Pickup Feed (right flank)</span>
        <button id="opt-pickupfeed" title="Lists exactly what entered your bags ('Warcry (Common) x1') stacked on the right where the inventory opens, coalescing repeat grabs into one row. Drawn beneath every panel: an open inventory always covers it, never the reverse.">${s.pickupFeed ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Pickup Feed Time</span>
        <span class="pad-opt"><input type="range" id="opt-pickupsec" min="${PICKUP_FEED_CFG.secMin * 10}" max="${PICKUP_FEED_CFG.secMax * 10}" step="5"
          value="${Math.round(s.pickupFeedSec * 10)}"
          title="How long each pickup row stands before it fades (a repeat grab refreshes its row's clock)."> <b id="val-pickupsec">${s.pickupFeedSec.toFixed(1)}s</b></span>
      </div>
      <h1>Save Data</h1>
      <div class="acct-head">Your progress as one portable file: account, settings, and every character.
        Importing replaces what stands on this device, whole, then restarts the game.</div>
      ${this.savePortNote ? `<div class="acct-head" style="color:var(--gold)">${esc(this.savePortNote)}</div>` : ''}
      <div class="rebind-row">
        <span>Export Saves</span>
        <button id="opt-exportsave" title="Bundles the last-saved state of everything — account, settings, the Continue character, and every roster vessel — into one .json file named for the day and who's inside. The file holds what a relaunch would load, so quit to menu (or let the autosave land) if you want this exact moment in it.">DOWNLOAD</button>
      </div>
      ${savePortImportRow}`;
    const visualsTab = `
      <div class="rebind-row">
        <span>Line-of-Sight Shade</span>
        <span class="pad-opt"><input type="range" id="opt-veildark" min="0" max="100" step="5"
          value="${Math.round(s.veilDarkness * 100)}"
          title="How dark the sight veil paints what your hero cannot see: walls, trunks and roofs throw the same shadow shapes at any setting, and hidden nameplates dim with the pixels. 100% is the authored night; dim it to admire what the world builds atop its structures (spire gardens, canopy work). Purely visual: enemy eyes read the engine's own sightline, never this slider."> <b id="val-veildark">${s.veilDarkness <= 0 ? 'LIFTED' : `${Math.round(s.veilDarkness * 100)}%`}</b></span>
      </div>
      <div class="rebind-row">
        <span>Camera</span>
        <button id="opt-cameramode" title="${CAMERA_MODES.map(m => `${m.name}: ${m.blurb}`).join('\n')}">${cameraModeOf(s.cameraMode).name}</button>
      </div>
      <div class="rebind-row">
        <span>Low-Life Screen Pulse</span>
        <button id="opt-lowlife" title="Blood seeps in at the screen edge while life is low, pressing inward on a slow heartbeat at the last sliver. OFF: only the struck-while-low surge shows (the sane pick for 1/1-life or heavy-reservation builds).">${s.lowLifePulse ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Faintness Frame-Falter</span>
        <button id="opt-falter" title="While light-headed (faintness / a swoon), the picture itself deliberately skips: brief, simulated lag spikes, on purpose: your hero's head is going light, so your frames seem to. The game underneath never stutters (movement, casts and co-op keep running at full rate). OFF for comfort or motion sensitivity; the grey pall still shows.">${s.statusFalter ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Foresight (enemy cast markers)</span>
        <button id="opt-foresight">${s.castTelegraphs ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>NPC Talk Typing</span>
        <button id="opt-speechtyping" title="Townsfolk tell their talk-bubble lines glyph by glyph, as if speaking. OFF shows each line whole at once: same words, no wait.">${s.speechTyping ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Hover Nameplates</span>
        <button id="opt-hovernames" title="Which bodies show the cursor nameplate. NAMED: distinctly-named enemies only, the classic elite read. ALL: every creature, minion, townsfolk and critter names itself under the cursor (name over kind + tier), so you can identify the exact entity without recalling its look. One plate at a time either way, and hidden bodies never tell.">${s.hoverNameplates === 'all' ? 'ALL' : 'NAMED'}</button>
      </div>`;
    root.innerHTML = `
      ${this.closeGlyphHtml('Resume (Esc)')}<h1>Options</h1>
      ${tabStrip}
      ${tab === 'controls' ? controlsTab
        : tab === 'controller' ? controllerTab
        : tab === 'visuals' ? visualsTab
        : interfaceTabHead}
      <div class="esc-btns"><button id="esc-back">Back</button></div>`;
    // Tab strip: remember the shelf, drop any armed capture, re-render.
    root.querySelectorAll<HTMLElement>('[data-opttab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.optionsTab = btn.dataset.opttab as UI['optionsTab'];
        this.disarmRebind();
        this.renderOptions(root, onBack);
      });
    });
    // The severity-scaled edge pulse is a real build choice (1/1-life and
    // heavy-reservation heroes live "low" on purpose) — so it's a toggle.
    root.querySelector<HTMLElement>('#opt-lowlife')?.addEventListener('click', () => {
      const s = this.getSettings();
      s.lowLifePulse = !s.lowLifePulse;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // THE FALTER is deliberate fake lag (docs/render/falter.md) — a comfort
    // switch, never a graphics-quality one: OFF loses no information (the
    // pall carries the read), it only stops the simulated hitches.
    root.querySelector<HTMLElement>('#opt-falter')?.addEventListener('click', () => {
      const s = this.getSettings();
      s.statusFalter = !s.statusFalter;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // Movement inversion is a device-layer preference (main.ts flips the
    // assembled intent) — the widdershins hex composes over it as XOR.
    root.querySelector<HTMLElement>('#opt-invertmove')?.addEventListener('click', () => {
      const s = this.getSettings();
      s.invertMove = !s.invertMove;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // The unarmed floor is default-ON and found-not-taught; the OFF switch
    // exists so accidental empty-slot presses are the PLAYER's dial, not a
    // death the game chose for them (see settings.ts improvisedStrike).
    root.querySelector<HTMLElement>('#opt-improvised')?.addEventListener('click', () => {
      const s = this.getSettings();
      s.improvisedStrike = !s.improvisedStrike;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // Gear pickup feel: hoover it like gems, or keep it a deliberate press.
    root.querySelector<HTMLElement>('#opt-gearpickup')?.addEventListener('click', () => {
      const st = this.getSettings();
      st.gearPickup = st.gearPickup === 'key' ? 'vacuum' : 'key';
      this.saveSettings();
      this.updateHintBar();
      this.renderOptions(root, onBack);
    });
    // FORESIGHT: enemy ground-casts mark their landing during the wind-up.
    // OFF is the read-the-animation purist mode.
    root.querySelector<HTMLElement>('#opt-foresight')?.addEventListener('click', () => {
      const st = this.getSettings();
      st.castTelegraphs = !st.castTelegraphs;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // THE TYPEWRITER (render speech fabric): the master switch over every
    // per-kind/per-line typing dial — OFF is instant whole-line talk.
    root.querySelector<HTMLElement>('#opt-speechtyping')?.addEventListener('click', () => {
      const st = this.getSettings();
      st.speechTyping = !st.speechTyping;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // THE HOVER NAMEPLATE: which bodies bid for the cursor plate — NAMED
    // (distinct elites only, the classic read) or ALL (every def-carrying
    // body: the identification lens for diagnosis and nitpick-hunting).
    root.querySelector<HTMLElement>('#opt-hovernames')?.addEventListener('click', () => {
      const st = this.getSettings();
      st.hoverNameplates = st.hoverNameplates === 'all' ? 'named' : 'all';
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // RENDER SCALE: cycle AUTO → the notch ladder (render/renderScale.ts).
    // The governor applies it within a frame; the world view never moves.
    root.querySelector<HTMLElement>('#opt-renderscale')?.addEventListener('click', () => {
      const st = this.getSettings();
      const ring: (number | 'auto')[] = ['auto', ...RENDER_SCALE_CFG.notches];
      const i = ring.findIndex(v => v === st.renderScale);
      st.renderScale = ring[(i + 1) % ring.length];
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // MAP ZONE NAMES: cycle the label-mode registry (ui/mapConfig.ts) — hover-
    // revealed (clean chart) or always-on (classic). pinLabel kinds (towns)
    // ignore the dial by design, and cards never hit-test in any mode.
    root.querySelector<HTMLElement>('#opt-maplabels')?.addEventListener('click', () => {
      const st = this.getSettings();
      const i = MAP_LABEL_MODES.findIndex(m => m.id === st.mapLabels);
      st.mapLabels = MAP_LABEL_MODES[(i + 1) % MAP_LABEL_MODES.length].id;
      this.saveSettings();
      this.refreshMap(); // live behind the menu if the map is open (no-op otherwise)
      this.renderOptions(root, onBack);
    });
    // REAWAKEN AFTER QUIT: where a relaunched save wakes (meta/worldstate.ts).
    // Player agency by default; a mode's `resume` pin outranks it at resume.
    root.querySelector<HTMLElement>('#opt-resume')?.addEventListener('click', () => {
      const st = this.getSettings();
      st.resumeSpawn = st.resumeSpawn === 'town' ? 'exact' : 'town';
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // POISE/INSIGHT arcs: cycle the three view methodologies — smart hide
    // (change + build weight), strictly on-change, or always-on.
    root.querySelector<HTMLElement>('#opt-poolbars')?.addEventListener('click', () => {
      const st = this.getSettings();
      st.poolBars = st.poolBars === 'smart' ? 'recent' : st.poolBars === 'recent' ? 'always' : 'smart';
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // SAVE PORTAGE (meta/portage.ts): export downloads the whole save set as
    // one envelope; import validates a picked file WHOLE (a refusal lands on
    // the note line, nothing written) then holds for the overwrite confirm —
    // apply stands the ordinary savers down, awaits every disk write, and
    // restarts into the imported state.
    root.querySelector<HTMLElement>('#opt-exportsave')?.addEventListener('click', () => {
      void buildSaveEnvelope().then(env => {
        const name = saveEnvelopeName(env);
        const url = URL.createObjectURL(new Blob([JSON.stringify(env)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url; a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        this.savePortNote = `Exported ${name}`;
        this.renderOptions(root, onBack);
      }).catch((e: unknown) => {
        this.savePortNote = `Export failed: ${String(e)}`;
        this.renderOptions(root, onBack);
      });
    });
    root.querySelector<HTMLElement>('#opt-importsave')?.addEventListener('click', () => {
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = '.json,application/json';
      picker.addEventListener('change', () => {
        const file = picker.files?.[0];
        if (!file) return;
        void file.text().then(text => {
          const verdict = planSaveImport(text);
          if (verdict.ok) { this.savePortPending = verdict.plan; this.savePortNote = null; }
          else { this.savePortPending = null; this.savePortNote = verdict.why; }
          this.renderOptions(root, onBack);
        }).catch(() => {
          this.savePortPending = null;
          this.savePortNote = 'Could not read that file.';
          this.renderOptions(root, onBack);
        });
      });
      picker.click();
    });
    root.querySelector<HTMLElement>('#opt-saveport-confirm')?.addEventListener('click', () => {
      const plan = this.savePortPending;
      if (!plan) return;
      this.savePortPending = null; // one press, one apply
      void applySaveImport(plan).then(() => window.location.reload());
    });
    root.querySelector<HTMLElement>('#opt-saveport-cancel')?.addEventListener('click', () => {
      this.savePortPending = null;
      this.savePortNote = null;
      this.renderOptions(root, onBack);
    });
    // Controller feel sliders: drag = immediate (padTuning reads Settings live
    // every frame), release = persist. Ranges live in the markup; loads re-clamp.
    const slider = (id: string, apply: (v: number) => void, label: (v: number) => string): void => {
      const el = root.querySelector<HTMLInputElement>('#opt-' + id);
      const val = root.querySelector<HTMLElement>('#val-' + id);
      if (!el || !val) return;
      el.addEventListener('input', () => {
        const v = Number(el.value);
        apply(v);
        val.textContent = label(v);
      });
      el.addEventListener('change', () => this.saveSettings());
    };
    slider('deadzone', v => { this.getSettings().pad.deadzone = v / 100; }, v => `${v}%`);
    slider('aimreach', v => { this.getSettings().pad.aimRadius = v; }, v => String(v));
    slider('padspeed', v => { this.getSettings().pad.pointerSpeed = v; }, v => String(v));
    slider('aimsens', v => { this.getSettings().pad.aimSensitivity = v / 100; }, v => `${v}%`);
    slider('aimassist', v => { this.getSettings().pad.aimAssist = v / 100; }, v => v <= 0 ? 'OFF' : `${v}%`);
    // AIM ASSIST STYLE: cycle the delivery-mode registry (core/gamepad.ts) —
    // 'cursor' steers the aim itself (no snap-back on a broken lock), 'view'
    // keeps the legacy bend-the-shot-only mechanic selectable.
    root.querySelector<HTMLElement>('#opt-assistmode')?.addEventListener('click', () => {
      const st = this.getSettings();
      const i = AIM_ASSIST_MODES.findIndex(m => m.id === st.pad.assistMode);
      st.pad.assistMode = AIM_ASSIST_MODES[(i + 1) % AIM_ASSIST_MODES.length].id;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // AIM TICK opacity: fades every facing pointer; 0 hides them outright
    // (the see-the-fight option). The renderer reads Settings live — the
    // drag shows on the battlefield behind the menu, next frame.
    slider('aimtick', v => { this.getSettings().aimTick.alpha = v / 100; },
      v => v <= 0 ? 'HIDDEN' : `${v}%`);
    // LINE-OF-SIGHT SHADE: the player's dial over the sight veil's dark
    // (Settings.veilDarkness → SightVeil.userMul — sheet, roof composites,
    // label gating and hidden-actor fades all dim through the ONE number).
    // The renderer reads Settings live, so the drag previews on the
    // battlefield behind the menu, next frame. Purely aesthetic; the
    // engine's own LoS ray never reads it.
    slider('veildark', v => { this.getSettings().veilDarkness = v / 100; },
      v => v <= 0 ? 'LIFTED' : `${v}%`);
    // THE INFO STREAM (world/bulletins.ts): the player composes their own
    // stream — durations, anchor, channel mutes, per-kind battlefield text,
    // the pickup ledger. The renderer reads Settings live at draw, so every
    // change shows on the very next frame, menu still open; the toggle
    // records stay SPARSE (a missing id reads its registry default), so new
    // packages' channels and kinds arrive already wired.
    slider('noticesec', v => { this.getSettings().noticeSec = v / 10; }, v => `${(v / 10).toFixed(1)}s`);
    slider('pickupsec', v => { this.getSettings().pickupFeedSec = v / 10; }, v => `${(v / 10).toFixed(1)}s`);
    root.querySelector<HTMLElement>('#opt-noticeanchor')?.addEventListener('click', () => {
      const st = this.getSettings();
      const i = NOTICE_ANCHORS.findIndex(a => a.id === st.noticeAnchor);
      st.noticeAnchor = NOTICE_ANCHORS[(i + 1) % NOTICE_ANCHORS.length].id;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    root.querySelector<HTMLElement>('#opt-pickupfeed')?.addEventListener('click', () => {
      const st = this.getSettings();
      st.pickupFeed = !st.pickupFeed;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    root.querySelectorAll<HTMLElement>('[data-notice-ch]').forEach(btn => {
      btn.addEventListener('click', () => {
        const st = this.getSettings();
        const id = btn.dataset.noticeCh!;
        st.noticeChannels[id] = !noticeChannelOn(st.noticeChannels, id);
        this.saveSettings();
        this.renderOptions(root, onBack);
      });
    });
    root.querySelectorAll<HTMLElement>('[data-float-kind]').forEach(btn => {
      btn.addEventListener('click', () => {
        const st = this.getSettings();
        const id = btn.dataset.floatKind!;
        st.floatKinds[id] = !floatKindOn(st.floatKinds, id);
        this.saveSettings();
        this.renderOptions(root, onBack);
      });
    });
    // UI SCALE: the accessibility dial (ui/uiScale.ts). Drag applies INSTANTLY —
    // the very panel under your hand grows (the honest preview) and the canvas
    // HUD follows next frame (the renderer reads Settings live); release persists.
    slider('uiscale', v => {
      this.getSettings().uiScale = v / 100;
      applyUiScale(v / 100);
    }, v => `${v}%`);
    // CAMERA MODE: cycle the frame registry (render/camera.ts) — hero-locked
    // vs the classic zone frame. The renderer reads Settings live, so the
    // battlefield behind the menu re-frames next frame (the honest preview).
    root.querySelector<HTMLElement>('#opt-cameramode')?.addEventListener('click', () => {
      const st = this.getSettings();
      const i = CAMERA_MODES.findIndex(m => m.id === st.cameraMode);
      st.cameraMode = CAMERA_MODES[(i + 1) % CAMERA_MODES.length].id;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // AIM TICK style: one button per registry entry (line / dot / mods').
    root.querySelectorAll<HTMLElement>('[data-aimtick-style]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.getSettings().aimTick.style = btn.dataset.aimtickStyle!;
        this.saveSettings();
        this.renderOptions(root, onBack);
      });
    });
    // Cursor identity: style + tint apply INSTANTLY (applyCursor re-paints the
    // CSS cursor; the pad reticle reads the color live) and persist on click.
    root.querySelectorAll<HTMLElement>('[data-cursor-style]').forEach(btn => {
      btn.addEventListener('click', () => {
        const st = this.getSettings();
        st.cursor.style = btn.dataset.cursorStyle!;
        this.saveSettings();
        applyCursor(st.cursor);
        this.renderOptions(root, onBack);
      });
    });
    root.querySelectorAll<HTMLElement>('[data-cursor-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        const st = this.getSettings();
        st.cursor.color = btn.dataset.cursorColor!;
        this.saveSettings();
        applyCursor(st.cursor);
        this.renderOptions(root, onBack);
      });
    });
    root.querySelector<HTMLElement>('#opt-swapsticks')?.addEventListener('click', () => {
      const st = this.getSettings();
      st.pad.swapSticks = !st.pad.swapSticks;
      this.saveSettings();
      this.renderOptions(root, onBack);
    });
    // Pad rebind rows: arm the pad capture (main injects the bridge) — the
    // next button press binds. MENU/START is the pad's hardwired Escape, so
    // capturing it CANCELS (mirror of the Esc rule below: you can never bind
    // your way out of pausing). Esc on the keyboard cancels too.
    root.querySelectorAll<HTMLElement>('[data-padrebind]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.disarmRebind();           // one live capture at a time, either kind
        btn.textContent = 'press a button…';
        this.armPadCapture?.(code => {
          if (code !== PAD_CFG.escapeButton) {
            const binds = this.getSettings().padBinds;
            const action = btn.dataset.padrebind as PadActionId;
            // SWAP-ON-CONFLICT, the keyboard map's rule — scoped to the pad
            // map (the two maps are separate universes; a key and a button
            // never collide).
            const other = PAD_ACTION_IDS.find(a => a !== action && binds[a] === code);
            if (other) binds[other] = binds[action];
            binds[action] = code;
            this.saveSettings();
          }
          this.renderOptions(root, onBack);
        });
        const onKey = (e: KeyboardEvent): void => {
          if (e.key !== 'Escape') return;
          e.preventDefault();
          e.stopImmediatePropagation();
          this.disarmRebind();
          this.renderOptions(root, onBack);
        };
        this.armedRebind = onKey;
        window.addEventListener('keydown', onKey, true);
      });
    });
    root.querySelectorAll<HTMLElement>('[data-rebind]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.disarmRebind(); // only one row can be armed at a time
        btn.textContent = 'press a key…';
        const onKey = (e: KeyboardEvent): void => {
          e.preventDefault();
          e.stopImmediatePropagation();  // keep the key out of the game's input
          this.disarmRebind();           // removes this very listener
          if (e.key !== 'Escape') {
            const binds = this.getSettings().keybinds;
            const action = btn.dataset.rebind as ActionId;
            const nk = e.key.toLowerCase();
            // SWAP-ON-CONFLICT: one key must drive ONE action. justPressed()
            // is consumed by the first checker each frame, so a silent
            // duplicate leaves the second action unreachable (bind the char
            // sheet to B and the skill book can never open again). The action
            // that held the key inherits this row's old key instead.
            const other = ACTION_IDS.find(a => a !== action && binds[a] === nk);
            if (other) binds[other] = binds[action];
            binds[action] = nk;
            this.saveSettings();
            this.updateHintBar();        // the strip mirrors whatever changed
          }
          this.renderOptions(root, onBack); // re-render the (possibly updated) labels
        };
        this.armedRebind = onKey;
        window.addEventListener('keydown', onKey, true);
      });
    });
    // Scope the Back lookup to THIS root — the hidden escape menu may also hold a
    // stale #esc-back, and getElementById would return that (document order),
    // stranding the start-menu Back button with no handler.
    root.querySelector<HTMLElement>('#esc-back')!.addEventListener('click', () => {
      this.disarmRebind();
      onBack();
    });
  }

  // ------------------------------------------------------------ start menu

  /** Cache the resumable character save (from the async disk/local load) so the
   *  start menu can enable Continue. Null disables it. */
  setContinueSave(save: CharacterSave | null): void {
    this.continueSave = save;
    if (!this.startMenu.classList.contains('hidden') && this.startHandlers) this.renderStartMenu();
  }

  /** The launch screen: Start New / Continue / the roster / Vault / Keybinds. */
  showStartMenu(
    onStart: (d: ClassDef, modeId?: string) => void,
    onContinue: (s?: CharacterSave | null) => void,
    onCoop?: () => void,
    onRoster?: (e: RosterEntry) => void,
    notice?: string,
  ): void {
    this.hideAll();
    this.startHandlers = { onStart, onContinue, onCoop, onRoster, notice };
    this.renderStartMenu();
    this.startMenu.classList.remove('hidden');
  }

  private renderStartMenu(): void {
    const acc = this.getAccount();
    const h = this.startHandlers!;
    const canContinue = !!this.continueSave;
    // THE ROSTER: account-owned characters (Immortal vessels), listed straight
    // from the index cards — no slot file is read until one is chosen. Each row
    // is Continue-as plus a deliberate release (✕, confirmed, durable wipe).
    const rosterRows = acc.roster.map(e => {
      const mode = modeById(e.modeId);
      // THE FALLEN LOCK (the resurrection covenant): a fallen vessel's row
      // stays listed — dimmed, badged FALLEN, its fee printed — but leads to
      // the Vault's words instead of a run until the resurrection is paid.
      const fallen = !!e.fallen;
      const badge = fallen ? 'FALLEN' : stageOf(e.modeId, e.stage).badge ?? mode.name.toUpperCase();
      const bColor = fallen ? '#e85050' : mode.color;
      return `
        <div style="display:flex;gap:6px">
          <button class="sm-roster-go" data-cid="${esc(e.charId)}" style="flex:1 1 auto;text-align:left${fallen ? ';opacity:.6' : ''}"
            ${fallen ? `title="Fallen — resurrect in the Vault (${e.fallen!.fee} ${META_CURRENCY_LABEL}, invested across runs)"` : ''}>
            ⟢ ${esc(e.name)} — Level ${e.level}
            <span style="font-size:10px;color:${bColor};border:1px solid ${bColor};
              border-radius:6px;padding:0 5px;margin-left:6px">${badge}</span>${fallen
              ? `<span style="font-size:10px;color:#a8a494;margin-left:6px">☠ ${e.fallen!.fee} ${META_CURRENCY_LABEL} to resurrect</span>` : ''}</button>
          <button class="sm-roster-del" data-cid="${esc(e.charId)}" style="flex:0 0 auto"
            title="Release this vessel: the character is permanently discarded">✕</button>
        </div>`;
    }).join('');
    // A pending reckoning (essence standing on the account — a mid-reckoning
    // quit, or a pre-seal-law save) surfaces on the Vault button: the seal
    // law inside the Vault settles it the moment that visit closes.
    const pending = acc.credits > 0;
    this.startMenu.innerHTML = `
      <h1>${GAME_TITLE.toUpperCase()}</h1>
      <div class="acct-head">Account Level <b>${acc.level}</b>${pending
        ? ` · <b style="color:var(--gold)">${acc.credits}</b> ${META_CURRENCY_LABEL} awaiting the Reckoning` : ''}</div>
      ${h.notice ? `<div class="acct-head" style="color:#e8b06a">${h.notice}</div>` : ''}
      <div class="esc-btns">
        <button id="sm-start">Start New Game</button>
        <button id="sm-continue" ${canContinue ? '' : 'disabled'}>${canContinue ? 'Continue' : 'No Save Found'}</button>
        ${rosterRows}
        <button id="sm-vault"${pending ? ' style="border-color:var(--gold)"' : ''}>${pending
          ? `Vault — assign ${acc.credits} ${META_CURRENCY_LABEL}!` : 'Vault (Unlocks)'}</button>
        <button id="sm-chronicle">Chronicle of Runs${acc.runRecords.length ? ` (${acc.runRecords.length})` : ''}</button>
        <button id="sm-keys">Options</button>
        ${h.onCoop ? '<button id="sm-coop">Co-op (Beta)</button>' : ''}
      </div>`;
    document.getElementById('sm-start')!.addEventListener('click', () => {
      this.startMenu.classList.add('hidden'); this.showClassSelect(h.onStart);
    });
    if (h.onCoop) document.getElementById('sm-coop')!.addEventListener('click', () => h.onCoop!());
    document.getElementById('sm-continue')!.addEventListener('click', () => {
      if (!this.continueSave) return;
      this.startMenu.classList.add('hidden'); h.onContinue(this.continueSave);
    });
    this.startMenu.querySelectorAll<HTMLElement>('.sm-roster-go').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = this.getAccount().roster.find(r => r.charId === btn.dataset.cid);
        if (!entry || !h.onRoster) return;
        // A fallen vessel never launches: the menu re-renders with the
        // covenant's words (main.ts's resume path is the belt behind this).
        if (entry.fallen) {
          h.notice = `${entry.name} lies fallen — resurrect them in the Vault (${entry.fallen.fee} ${META_CURRENCY_LABEL}).`;
          this.renderStartMenu();
          return;
        }
        this.startMenu.classList.add('hidden');
        h.onRoster(entry);
      });
    });
    this.startMenu.querySelectorAll<HTMLElement>('.sm-roster-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const roster = this.getAccount().roster;
        const i = roster.findIndex(r => r.charId === btn.dataset.cid);
        if (i < 0) return;
        const e = roster[i];
        if (!window.confirm(`Release ${e.name} (Level ${e.level})? The vessel and everything it carries are permanently discarded.`)) return;
        roster.splice(i, 1);
        // A released fallen vessel takes its half-poured resurrection with
        // it — the invested essence was that vessel's and dies with it.
        delete this.getAccount().invested[resurrectUnlockId(e.charId)];
        wipeRosterSlot(e.slot);  // durable — the slot must not resurrect on next boot
        this.saveAccount();
        this.renderStartMenu();
      });
    });
    document.getElementById('sm-vault')!.addEventListener('click', () =>
      this.showAccountScreen(() => this.showStartMenu(h.onStart, h.onContinue, h.onCoop, h.onRoster)));
    document.getElementById('sm-chronicle')!.addEventListener('click', () =>
      this.showChronicle(() => this.showStartMenu(h.onStart, h.onContinue, h.onCoop, h.onRoster)));
    document.getElementById('sm-keys')!.addEventListener('click', () =>
      this.renderOptions(this.startMenu, () => this.showStartMenu(h.onStart, h.onContinue, h.onCoop, h.onRoster)));
    this.onStartMenuRender?.();
  }

  // ------------------------------------------------------- expedition setup

  /** The per-run config screen (between class select and the run starting).
   *  Tune each unlocked package's start level + relative frequency; the choices
   *  are written to account.packageDefaults and become the run-LOCKED manifest.
   *  Sliders are editable only for packages whose config has been purchased. */
  /** Optional weight editor (opened from class select via "Event Weights").
   *  Saving persists to account.packageDefaults — which the next run's manifest
   *  is built from — so a player who never opens this just keeps last run's mix. */
  showExpeditionSetup(onDone: () => void): void {
    this.hideAll();
    const acc = this.getAccount();
    // Only packages whose configuration the player has UNLOCKED (bought) are
    // shown here — a package you haven't discovered/unlocked runs at its default
    // (level-gated) and isn't tunable until it surfaces in the Vault. (alwaysOn
    // substrate packages are never "configured", so they're naturally excluded.)
    const pkgs = PACKAGES.filter(p => isConfigured(acc, p.id));
    const clampN = (v: number, lo: number, hi: number): number => v < lo ? lo : v > hi ? hi : v;
    // Local editable copy, seeded from saved prefs or package defaults, CLAMPED
    // into each slider's current (tier-widened) range.
    const cfg: Record<string, { enabled: boolean; weight: number; startLevel: number }> = {};
    for (const p of pkgs) {
      const pref = acc.packageDefaults[p.id];
      const wB = bound(p, 'weight', acc), sB = bound(p, 'startLevel', acc);
      cfg[p.id] = {
        // ONE rule with buildManifest (defaultEnabledFor): a purchased opt-in
        // package (The Pit) seeds ON — otherwise saving this screen untouched
        // would persist enabled:false and silently undo the purchase.
        enabled: pref ? pref.enabled : defaultEnabledFor(p, acc),
        weight: clampN(pref?.weight ?? p.defaultWeight, wB.min, wB.max),
        startLevel: clampN(pref?.startLevel ?? p.defaultStartLevel, sB.min, sB.max),
      };
    }

    // META-META: the global event-frequency crank (level-100 unlock). TWO knobs:
    // TEMPO drives RATE + CONCURRENCY together (one knob for how often and how
    // many — the "festival" regime the player chose); SEVERITY is its own axis
    // (how hard each live event runs — the overlays' severityMul). Run-locked
    // into the manifest on the next run, exactly like the package mix.
    const tempoOwned = featureEnabled(acc, FEATURE.GLOBAL_FREQUENCY);
    let tempo = clampN(acc.frequencyProfile?.rate ?? 1, 0.25, 3);
    let severity = clampN(acc.frequencyProfile?.severity ?? 1, 0.25, 3);
    const tempoHtml = (): string => {
      if (!tempoOwned) return '';
      return `<div class="exped-tempo">
        <div class="mix-label">World Tempo — global event frequency
          <span style="color:var(--text-dim);font-weight:normal">· how OFTEN events fire and how MANY run at once, world-wide</span></div>
        <div class="slider-row"><span>Tempo</span>
          <input type="range" min="0.25" max="3" step="0.25" value="${tempo}" id="exped-tempo">
          <span class="sv" id="exped-tempo-v">${Math.round(tempo * 100)}%</span></div>
        <div class="mix-label" style="margin-top:10px">World Severity
          <span style="color:var(--text-dim);font-weight:normal">· how HARD each live event runs: invasion strength, meteor rate, how fast fronts and plagues spread, how long breaches stay open</span></div>
        <div class="slider-row"><span>Severity</span>
          <input type="range" min="0.25" max="3" step="0.25" value="${severity}" id="exped-severity">
          <span class="sv" id="exped-severity-v">${Math.round(severity * 100)}%</span></div>
      </div>`;
    };

    const mixHtml = (): string => {
      // pressureless packages (The Pit) hold no share of the world mix.
      const active = pkgs.filter(p => !p.alwaysOn && !p.pressureless && cfg[p.id].enabled && cfg[p.id].startLevel <= 100);
      if (!active.length) return `<div class="mix-empty">No packages enabled: a calm world.</div>`;
      const total = active.reduce((s, p) => s + Math.max(0, cfg[p.id].weight), 0) || 1;
      return active.map(p => {
        const pct = Math.round(100 * Math.max(0, cfg[p.id].weight) / total);
        const col = p.color ?? PKG_FALLBACK_COLOR;
        return `<div class="mix-seg" style="flex:${Math.max(0.02, cfg[p.id].weight)};background:${col}" title="${p.label} ${pct}%">${pct >= 12 ? `${p.label} ${pct}%` : ''}</div>`;
      }).join('');
    };

    const card = (p: ContentPackage): string => {
      const c = cfg[p.id];
      if (p.alwaysOn) {
        return `<div class="exped-card"><div class="exped-name">${p.label}</div>
          <div class="exped-blurb">${p.blurb}</div>
          <div class="exped-always">● Always active</div></div>`;
      }
      const editable = isConfigured(acc, p.id);
      const dis = editable ? '' : 'disabled';
      // A PLACE, not an event (pressureless — The Pit): just the on/off, no
      // frequency or start-level to tune, no seat in the mix bar.
      if (p.pressureless) {
        return `
        <div class="exped-card ${c.enabled ? '' : 'exped-off'}" data-card="${p.id}">
          <label class="exped-head"><input type="checkbox" data-en="${p.id}" ${c.enabled ? 'checked' : ''} ${dis}>
            <span class="exped-name" style="color:${p.color ?? 'var(--gold)'}">${p.label}</span></label>
          <div class="exped-blurb">${p.blurb}</div>
          <div class="exped-always">● A place, not an event: no frequency to tune</div>
        </div>`;
      }
      // Slider ranges WIDEN with owned investment tiers (Investigation/Exploration).
      const wB = bound(p, 'weight', acc), sB = bound(p, 'startLevel', acc);
      const sStep = p.modifiers.find(m => m.kind === 'startLevel')?.step ?? 1;
      const wStep = p.modifiers.find(m => m.kind === 'weight')?.step ?? 5;
      const cw = clampN(c.weight, wB.min, wB.max), cs = clampN(c.startLevel, sB.min, sB.max);
      const startTxt = cs >= 101 ? 'OFF' : `Lv ${cs}`;
      const startFixed = sB.min >= sB.max; // locked (no tier widened it yet)
      return `
        <div class="exped-card ${c.enabled ? '' : 'exped-off'}" data-card="${p.id}">
          <label class="exped-head"><input type="checkbox" data-en="${p.id}" ${c.enabled ? 'checked' : ''} ${dis}>
            <span class="exped-name" style="color:${p.color ?? 'var(--gold)'}">${p.label}</span></label>
          <div class="exped-blurb">${p.blurb}</div>
          ${editable ? '' : `<div class="exped-lock">🔒 Buy this package in the Vault to tune it</div>`}
          <div class="slider-row"><span>Begins</span><input type="range" min="${sB.min}" max="${sB.max}" step="${sStep}" value="${cs}" data-start="${p.id}" ${dis || startFixed ? 'disabled' : ''}><span class="sv" data-sv-start="${p.id}">${startTxt}</span></div>
          <div class="slider-row"><span>Frequency</span><input type="range" min="${wB.min}" max="${wB.max}" step="${wStep}" value="${cw}" data-weight="${p.id}" ${dis}><span class="sv" data-sv-weight="${p.id}">${cw}</span></div>
        </div>`;
    };

    const redrawMix = (): void => {
      const m = document.getElementById('exped-mix');
      if (m) m.innerHTML = mixHtml();
    };

    const body = tempoHtml() + (pkgs.length === 0
      ? `<div class="mix-empty" style="padding:22px;line-height:1.7">
           No world packages unlocked yet. <b>Discover them in play</b>: e.g. reach <b>level 10</b> to find
           <b>Breaches</b>, slay a <b>Crowned</b> champion to command <b>Warbands</b>, or fell a <b>warlord</b>
           for <b>Demon Invasions</b>. Then unlock their configuration in the <b>Vault</b>, and they'll appear
           here to tune. Until then the world runs on its sensible defaults.
         </div>`
      : `<div class="mix-label">World mix — relative frequency of your unlocked packages</div>
         <div class="mix-bar" id="exped-mix">${mixHtml()}</div>
         <div class="exped-grid">${pkgs.map(card).join('')}</div>`);
    this.expeditionSetup.innerHTML = `
      <h1>Event Weights</h1>
      <div class="acct-head">Tune the relative frequency of the world packages you've unlocked. These persist as your default for future runs; the next run you begin locks them in.</div>
      ${body}
      <div class="acct-btns"><button id="exped-cancel">Cancel</button>${(pkgs.length || tempoOwned) ? '<button id="exped-save">Save Weights</button>' : ''}</div>`;

    this.expeditionSetup.querySelectorAll<HTMLInputElement>('[data-en]').forEach(el => {
      el.addEventListener('change', () => {
        cfg[el.dataset.en!].enabled = el.checked;
        this.expeditionSetup.querySelector(`[data-card="${el.dataset.en}"]`)?.classList.toggle('exped-off', !el.checked);
        redrawMix();
      });
    });
    this.expeditionSetup.querySelectorAll<HTMLInputElement>('[data-start]').forEach(el => {
      el.addEventListener('input', () => {
        const id = el.dataset.start!;
        cfg[id].startLevel = +el.value;
        const sv = this.expeditionSetup.querySelector(`[data-sv-start="${id}"]`);
        if (sv) sv.textContent = cfg[id].startLevel >= 101 ? 'OFF' : `Lv ${cfg[id].startLevel}`;
        redrawMix();
      });
    });
    this.expeditionSetup.querySelectorAll<HTMLInputElement>('[data-weight]').forEach(el => {
      el.addEventListener('input', () => {
        const id = el.dataset.weight!;
        cfg[id].weight = +el.value;
        const sv = this.expeditionSetup.querySelector(`[data-sv-weight="${id}"]`);
        if (sv) sv.textContent = String(cfg[id].weight);
        redrawMix();
      });
    });
    const tEl = document.getElementById('exped-tempo') as HTMLInputElement | null;
    tEl?.addEventListener('input', () => {
      tempo = +tEl.value;
      const v = document.getElementById('exped-tempo-v');
      if (v) v.textContent = `${Math.round(tempo * 100)}%`;
    });
    const sevEl = document.getElementById('exped-severity') as HTMLInputElement | null;
    sevEl?.addEventListener('input', () => {
      severity = +sevEl.value;
      const v = document.getElementById('exped-severity-v');
      if (v) v.textContent = `${Math.round(severity * 100)}%`;
    });
    document.getElementById('exped-cancel')!.addEventListener('click', () => {
      this.expeditionSetup.classList.add('hidden'); onDone();
    });
    // Save only exists when there's something unlocked to tune (packages or tempo).
    document.getElementById('exped-save')?.addEventListener('click', () => {
      // Persist the choices as the player's default (the next run's manifest is
      // built from these). The run that begins then freezes them in (run-lock).
      for (const p of pkgs) acc.packageDefaults[p.id] = { ...cfg[p.id] };
      // The Tempo knob drives rate + concurrency together; severity is the
      // player's own second knob, written exactly as set (clampFrequency at
      // load + manifest build stays the one bounds law).
      if (tempoOwned) {
        acc.frequencyProfile = { rate: tempo, concurrency: tempo, severity };
      }
      this.saveAccount();
      this.expeditionSetup.classList.add('hidden');
      onDone();
    });

    this.expeditionSetup.classList.remove('hidden');
  }

  hideAll(): void {
    this.charSheetOpen = false;
    this.inventoryOpen = false;
    dndCancel(); // never strand a carried ghost on a closed panel
    this.inventory.classList.add('hidden');
    this.salvageOpen = false;
    this.craftTargetUid = null;
    this.salvageMenu.classList.add('hidden');
    this.fontOpen = false;
    this.fontMenu.classList.add('hidden');
    this.recallOpen = false;
    this.recallMenu.classList.add('hidden');
    this.oracleOpen = false;
    this.oracleTargetUid = null;
    this.oracleMenu.classList.add('hidden');
    this.vendorOpen = false;
    this.scrapMode = false;
    this.vendorMenu.classList.add('hidden');
    this.applyBreakChrome(); // sheds the ⚒/⚙ from bench, counter AND bag together
    this.boroughOpen = false;
    this.boroughFolkId = -1;
    this.boroughMenu.classList.add('hidden');
    delete this.boroughMenu.dataset.drop;
    this.bountiesOpen = false;
    this.bountyMenu.classList.add('hidden');
    this.treeOpen = false;
    this.closeChoicePopup();
    this.closeTreePopup();
    this.mapOpen = false;
    this.caravanOpen = false;
    this.mercOpen = false;
    this.mercMenu.classList.add('hidden');
    this.sailOpen = false;
    this.holdOpen = false;
    this.holdMenu.classList.add('hidden');
    this.vocationOpen = false;
    this.classSelect.classList.add('hidden');
    this.charSheet.classList.add('hidden');
    this.passiveTree.classList.add('hidden');
    this.worldMap.classList.add('hidden');
    this.caravanMenu.classList.add('hidden');
    this.sailMenu.classList.add('hidden');
    this.vocationMenu.classList.add('hidden');
    this.deathScreen.classList.add('hidden');
    this.accountScreen.classList.add('hidden');
    this.escapeMenu.classList.add('hidden');
    this.startMenu.classList.add('hidden');
    this.expeditionSetup.classList.add('hidden');
    this.escapeMenuOpen = false;
    // Every menu-kind timeflow hold dies with its surface — hideAll is the
    // belt under every "all panels clear" path (run start, death, resets).
    this.getWorld().timeflow.releaseKind('menu');
    this.disarmRebind();
    hideTooltip();
  }
}
