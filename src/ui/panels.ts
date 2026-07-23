// ---------------------------------------------------------------------------
// DOM panels: class selection, character sheet, skill book (unlock / level /
// socket support gems), passive tree, death screen.
//
// All panels are generated from the data registries, so new attributes,
// stats, skills, supports, passives, and classes appear here automatically.
// ---------------------------------------------------------------------------

import { clamp } from '../core/math';
import { DEV, GAME_TITLE } from '../config';
import {
  ATTRIBUTES, ATTRIBUTE_IDS, STAT_DEFS,
  type AttributeId, type DamageType,
} from '../engine/stats';
import { SHEET_VITALS, sheetTabs, statBlurbOf } from '../data/sheet';
import { resistValue } from '../engine/damage';
import {
  crewBoardingOpen, crewSkillsServed, effectiveSkillLevel, SKILL_RARITIES, skillMaxLevel,
  supportFitsInst, supportFitsInstOrCrew, supportMaxLevel,
  type SkillDef, type SkillInstance, type SupportInstance,
} from '../engine/skills';
import { MAX_LEARNED_SKILLS, OFFERINGS_PER_POINT } from '../engine/world';
import { EQUIP_SLOTS, ITEM_CFG, ITEM_RARITIES, SLOT_BY_ID, slotsForCategory, socketCap, type ItemInstance } from '../engine/items';
import { canPlaceAt, overlappingItems } from '../engine/inventory';
import { VESTIGES, VESTIGE_LIST } from '../data/vestiges';
import { compareItemMods, describeItem, itemGridSize, type ModCompareRow } from '../engine/itemgen';
import { ITEM_BASES } from '../data/itembases';
import { ESSENCES, ESSENCE_IDS, skillLevelEssenceCost, type EssenceCost } from '../data/essences';
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
import { dndCancel, registerDragSource, registerDropTarget } from './dnd';
import { applyUiScale, UI_SCALE_CFG } from './uiScale';
import { CAMERA_MODES, cameraModeOf } from '../render/camera';
import { FACTIONS, MONSTERS, defDensity, type MonsterDef } from '../data/monsters';
import { heftTierOf } from '../engine/mass';
import { DEFENSE_CFG } from '../engine/defense';
import type { Actor } from '../engine/actor';
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
import { boundaryGateOf } from '../data/boundaryGates';
import { dimensionDef } from '../world/dimensions';
import { collectMarkers } from '../world/mapMarkers';
import { zoneInfoFor, type ZoneInfoEntry } from '../world/zoneInfo';
import type { Seat, World } from '../engine/world';
import { COUCH_CFG, couchMinPads } from '../data/couch';
import { HOLD_CLASSES } from '../data/harborholds';
import {
  featureEnabled, FEATURE, isClassUnlocked, isSkillUnlockedForDrop, isSupportUnlockedForDrop,
  gemDropKey, META_CURRENCY_LABEL, selectableSlotCount, type Account,
} from '../meta/account';
import { allUnlockables, applyUnlock, availableUnlocks, classUnlockFor, isClassDiscovered, isUnlockOwned, maxSlotCount, undiscoveredClassUnlocks } from '../meta/unlocks';
import {
  ACTION_IDS, ACTION_LABELS, keyDisplay, PAD_ACTION_IDS, PAD_ACTION_LABELS,
  type ActionId, type PadActionId, type Settings,
} from '../meta/settings';
import { PAD_CFG, padDisplay, AIM_ASSIST_MODES, connectedPadIndices } from '../core/gamepad';
import { wipeRosterSlot, type CharacterSave } from '../meta/character';
import {
  availableModes, DEFAULT_MODE_ID, modeById, rosterCapacity, rosterOf, stageOf,
  type RosterEntry,
} from '../meta/modes';
import { bound, defaultEnabledFor } from '../packages/manifest';
import { isConfigured, PACKAGES } from '../packages/registry';
import type { ContentPackage } from '../packages/types';
import { QUEST_CATEGORY_COLORS, type QuestCategory } from '../quests/types';
import { objectiveRead, objectiveSeals, type ZoneDef } from '../data/zones';
import { zoneKindOf } from '../data/zoneKinds';
import { esc } from './dom';
import { bindTooltips, hideTooltip, TIP_CFG, type TooltipContent } from './tooltip';
import { runRuneMinigame, runSmithMinigame } from './minigames';
import { VENDORS, VENDOR_CFG, type VendorDef } from '../data/vendors';
import { oracleRerollCost } from '../data/essences';
import { ITEM_AFFIXES } from '../data/itemaffixes';
import { formatModLine, lerpRange, roundStatValue } from '../engine/items';
import { attachPanZoom, clampZoom, PANZOOM_DEFAULTS } from './panzoom';
import { MAP_CFG, MAP_LABEL_MODES } from './mapConfig';
import { applyCursor, CURSOR_COLORS, CURSOR_STYLES } from '../core/cursor';
import { AIM_TICK_STYLES } from '../render/vis/aimtick';

/** Neutral accent for packages that declare no colour of their own. */
const PKG_FALLBACK_COLOR = '#888';

/** The bottom keybind strip's one switch — retired by default since the
 *  prologue drill + Waking House tutorial took over teaching the binds
 *  (updateHintBar). Flip true to restore the standing crib sheet. */
const HINT_BAR_ENABLED = false;

/** Item-category glyphs — bag tiles and the drag fabric's ghost chip share
 *  one vocabulary (a lifted thing looks like the tile it left). */
const CATEGORY_GLYPHS: Record<string, string> = {
  helmet: '⛑', chest: '🛡', gloves: '🧤', boots: '👢', legs: '👖', belt: '➰',
  ring: '💍', amulet: '📿', weapon: '⚔', offhand: '🛡', quiver: '🏹',
};

/** The SCRAP-WHEEL cursor (vendor salvage mode): a gear glyph rendered into
 *  an SVG data-URI, crosshair fallback where custom cursors are refused. */
const SCRAP_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><text x="2" y="20" font-size="19">⚙</text></svg>',
)}") 13 13, crosshair`;

/** Resistance rows display the EFFECTIVE (soft/hard-capped) value, with the
 *  raw overcap alongside when it exceeds the cap (shred insurance). The
 *  sheet's ORGANIZATION — which stats print where, and when — lives in
 *  data/sheet.ts (SHEET_CATS/SHEET_VITALS); this map is only the resist
 *  rows' special double read. */
const SHEET_RES: Record<string, DamageType> = {
  fireRes: 'fire', coldRes: 'cold', lightningRes: 'lightning', chaosRes: 'chaos',
};

export function meetsRequirements(world: World, def: SkillDef): boolean {
  if (!def.requirements) return true;
  for (const [attr, need] of Object.entries(def.requirements)) {
    if ((world.meta.attrs[attr as AttributeId] ?? 0) < (need ?? 0)) return false;
  }
  return true;
}

export class UI {
  private classSelect = document.getElementById('class-select')!;
  private charSheet = document.getElementById('char-sheet')!;
  private inventory = document.getElementById('inventory')!;
  private passiveTree = document.getElementById('passive-tree')!;
  private worldMap = document.getElementById('world-map')!;
  private caravanMenu = document.getElementById('caravan-menu')!;
  private salvageMenu = document.getElementById('salvage-menu')!;
  private oracleMenu = document.getElementById('oracle-menu')!;
  private bestiaryMenu = document.getElementById('bestiary-menu')!;
  private vendorMenu = document.getElementById('vendor-menu')!;
  private boroughMenu = document.getElementById('borough-menu')!;
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
  // (The flap's TUTORIAL GLOW carries no UI state of its own — like the
  //  Skill Gems tab's, it reads LIVE off World.mireilleGiftLesson each
  //  render: glowing while the bar step pends and the drawer is closed,
  //  quiet the moment the lesson advances or latches LIVED. An early idle
  //  browse can't silence a step that hasn't been walked yet.)
  /** THE UNIFIED INVENTORY's tab: gear grid, carried skill gems, or loose
   *  support gems — one panel, one key, zero overlapping windows. */
  invTab: 'gear' | 'skills' | 'gems' = 'gear';
  /** Tab last RENDERED — scroll restores only within the same tab (the
   *  skill book's golden rule, applied here). */
  private lastInvTab: 'gear' | 'skills' | 'gems' | null = null;
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
  /** Station view state: which tab, and the craft tab's chosen piece. */
  private salvageTab: 'salvage' | 'craft' = 'salvage';
  private craftTargetUid: number | null = null;
  oracleOpen = false;
  private oracleTargetUid: number | null = null;
  /** The Tracker's book: which leaf is open, and which page is under the thumb. */
  bestiaryOpen = false;
  private bestiaryPage = 0;
  private bestiarySel: string | null = null;
  vendorOpen = false;
  /** The Borough arming panel: which villager the dwell offered. */
  boroughOpen = false;
  private boroughFolkId = -1;
  /** The scrap wheel: while ON, the vendor screen's sell-half is live and
   *  clicks BREAK your things for essence. Reset on close — never sticky. */
  private scrapMode = false;
  /** THE STANDING ORDER picker: which counter's pane is open + its filter. */
  private vendorCommOpen: string | null = null;
  private vendorCommQuery = '';
  /** The vendor screen's live ticker (countdown in place; repaint on restock). */
  private vendorTicker: number | null = null;
  private vendorTickerRestockAt = 0;
  /** A minigame overlay is running — the panels beneath hold still. */
  private minigameActive = false;
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
  // (The book is single-view now — its old gem tabs live on the Inventory
  // panel as invTab; see that field's scroll-restore discipline.)
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
      el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext, this.panelSeat(this.inventory))
        : el.dataset.tip === 'skill' ? this.skillTooltip(el.dataset.skillId!)
        : el.dataset.tip === 'vestige' ? this.vestigeTooltip(el.dataset.vestigeId!) : null,
    { extend: true });
    bindTooltips(this.salvageMenu, (el, ext) => el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext, this.panelSeat(this.salvageMenu)) : null, { extend: true });
    bindTooltips(this.oracleMenu, (el, ext) => el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext, this.panelSeat(this.oracleMenu)) : null, { extend: true });
    bindTooltips(this.vendorMenu, (el, ext) => el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext, this.panelSeat(this.vendorMenu)) : null, { extend: true });
    bindTooltips(this.classSelect, (el) => el.dataset.tip === 'cskill' ? this.classSkillTooltip(el.dataset.skillId!) : null);
    // THE VAULT reads compact — kind, name, price — and keeps each unlock's
    // full story in the shared tooltip behind a HOVER-INTENT dwell: the wall
    // of text speaks only once the cursor has settled on a card (interest,
    // then detail). Content resolves from the LIVE catalog by id each hover,
    // so purchases and re-renders can never strand stale copy.
    bindTooltips(this.accountScreen, (el) =>
      el.dataset.tip === 'unlock' ? this.unlockTooltip(el.dataset.unlockId!)
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
        this.salvageMenu, this.oracleMenu, this.bestiaryMenu]) {
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
    if (hostOwned && this.caravanOpen) { this.closeCaravan(); return true; }
    if (this.vendorOpen && mine(this.vendorMenu)) { this.closeVendor(); return true; }
    if (this.salvageOpen && mine(this.salvageMenu)) { this.closeSalvage(); return true; }
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
    // Carried gem rows (skill & support tabs) — draggable to the world to
    // discard; identity rides the payload so a shifted index never drops the
    // wrong gem. Press-drag only: the rows are dense with button verbs.
    registerDragSource({
      kind: 'skillGem',
      payload: (arg) => {
        const inst = world().meta.skillInv[Number(arg)];
        if (!inst) return null;
        return {
          kind: 'skillGem', arg, label: inst.def.name,
          data: { defId: inst.def.id, level: inst.level },
          ghostHtml: `<span style="color:${SKILL_RARITIES[inst.rarity ?? 'common'].color}">◆ ${inst.def.name}</span>`,
        };
      },
    });
    registerDragSource({
      kind: 'supportGem',
      payload: (arg) => {
        const gem = world().meta.inventory[Number(arg)];
        if (!gem) return null;
        return {
          kind: 'supportGem', arg, label: gem.def.name,
          data: { defId: gem.def.id, level: gem.level },
          ghostHtml: `<span style="color:${gem.def.color}">◆ ${gem.def.name}</span>`,
        };
      },
    });

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
    // gesture there is). Gems re-resolve by identity in case the list shifted
    // under a slow carry.
    registerDropTarget({
      kind: 'ground',
      accepts: (p) => p.kind === 'gearItem' || p.kind === 'skillGem' || p.kind === 'supportGem',
      drop: (p) => {
        const w = world();
        if (p.kind === 'gearItem') {
          w.requestMeta({ t: 'dropItem', uid: Number(p.arg) });
        } else {
          const d = p.data as { defId?: string; level?: number } | undefined;
          const list: { def: { id: string }; level: number }[] =
            p.kind === 'skillGem' ? w.meta.skillInv : w.meta.inventory;
          let idx = Number(p.arg);
          if (list[idx]?.def.id !== d?.defId || list[idx]?.level !== d?.level) {
            idx = list.findIndex(g => g.def.id === d?.defId && g.level === d?.level);
          }
          if (idx < 0) return; // vanished mid-carry (learned/salvaged) — abandon
          w.requestMeta(p.kind === 'skillGem'
            ? { t: 'dropSkill', index: idx } : { t: 'dropSupport', index: idx });
        }
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
      meta: `${c.innateText ? `Innate: ${c.innateText} — ` : ''}A class is only a starting point; you can allocate any attributes and bind any skill you qualify for.`,
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
  private skillTooltip(id: string): TooltipContent | null {
    const inst = this.panelSeat(this.inventory).meta.knownSkills.get(id);
    if (!inst) return null;
    const d = inst.def;
    return {
      title: `${d.name} — Lv ${inst.level}`,
      description: d.description,
      meta: `${d.tags.join(' · ')}${d.cooldown ? ` · ${d.cooldown}s cd` : ''}`,
    };
  }

  /** '4◆' cost chip for an essence price, colored + titled by the essence. */
  private essCostText(cost: EssenceCost): string {
    const e = ESSENCES[cost.essence];
    return `<span style="color:${e.color}" title="${e.label}">${cost.count}${e.glyph}</span>`;
  }

  /** The essence-pay Level Up button (skills + supports share the curve).
   *  Affordability reads the INVENTORY panel's owner (the build drawer's home). */
  private essLevelBtn(attr: string, level: number, atMax: boolean): string {
    const cost = skillLevelEssenceCost(level + 1);
    const afford = this.getWorld().canAffordEssence(this.panelSeat(this.inventory), cost);
    return `<button ${attr} ${!afford || atMax ? 'disabled' : ''}
      title="Level up by spending ${cost.count}× ${ESSENCES[cost.essence].label}">
      Level Up (${this.essCostText(cost)})</button>`;
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
    this.invTab = 'gear';
    this.lastInvTab = null;
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
          border-radius:8px;font-size:9px;color:${d.color};cursor:help">${d.name}</span>` : '';
      }).join('');
      return chips ? `<div style="margin-top:3px">${chips}</div>` : '';
    };
    // A teaser card names its exact remedy: more Class Slots (hand size) or
    // the specific Class bundle in the Vault (pool depth) — never a dead lock.
    const lockNote = (t: { def: ClassDef; reason: 'slots' | 'class' }): string => {
      if (t.reason === 'slots') return '🔒 Unlock more Class Slots in the Vault';
      const u = classUnlockFor(t.def.id);
      return u ? `🔒 Locked — “${u.label}” in the Vault (${u.cost} ${META_CURRENCY_LABEL})`
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
        <div class="class-lock">🔒 Undiscovered — the world teaches what the Vault cannot sell.</div>
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
          style="flex:1 1 260px;max-width:420px;text-align:left;cursor:pointer;padding:8px 10px;
            border-radius:8px;background:#16121c;border:1px solid ${sel ? md.color : '#3a3644'};
            ${sel ? `box-shadow:0 0 10px ${md.color}44;` : ''}${full ? 'opacity:.45;' : ''}">
          <div style="font-weight:bold;color:${md.color}">${sel ? '◈ ' : ''}${md.name}
            ${roster ? `<span style="float:right;font-size:10px;color:#a8a494">${used}/${cap} vessel${cap === 1 ? '' : 's'}</span>` : ''}</div>
          <div style="font-size:10px;color:#a8a494;margin-top:2px">${md.blurb}</div>
          ${full ? '<div style="font-size:10px;color:#d08a4b;margin-top:3px">🔒 No free vessel — unlock more in the Vault, or release one from the start menu.</div>' : ''}
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
        <button id="name-clear" title="Forget the name — characters go back to being named for their class"
          style="font-size:11px;padding:5px 10px">Nameless</button>
      </div>
      <div style="font-size:12px;color:var(--gold);margin-bottom:4px">
        Account Level ${acc.level} &nbsp;·&nbsp; ${acc.credits} ${META_CURRENCY_LABEL} &nbsp;·&nbsp;
        hand of ${picks.length} &nbsp;·&nbsp; ${pool.length} of ${CLASSES.length} classes unlocked${undiscovered.length
          ? ` &nbsp;·&nbsp; ${undiscovered.length} undiscovered` : ''} &nbsp;(re-deals each new run)</div>
      <div class="subtitle">
        A random hand is dealt each run from the classes your account has unlocked.
        Class Slots widen the hand; Class unlocks (each bundling its thematic gems)
        deepen the pool — and every class you realize opens its Vocation.
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
   *  features. `onClose` (if given) re-opens the screen we came from. */
  showAccountScreen(onClose?: () => void): void {
    this.hideAll(); // close whatever opened it (start menu / class select / …) so it never overlaps
    const acc = this.getAccount();
    const render = (): void => {
      // A purchase re-renders in place — keep the list where the player left it
      // (the bought card is usually mid-list; snapping to top loses their spot).
      const prevScroll = this.accountScreen.querySelector<HTMLElement>('.vault-body')?.scrollTop ?? 0;
      const avail = availableUnlocks(acc);
      const owned = allUnlockables().filter(u => isUnlockOwned(acc, u));
      const cards = avail.length === 0
        ? `<div style="color:var(--text-dim);grid-column:1/-1;padding:20px">
             Nothing available to unlock right now — earn more ${META_CURRENCY_LABEL} and account levels by playing.
           </div>`
        : avail.map(u => {
            // availableUnlocks() already excludes owned + un-gated entries,
            // so every card here is unowned — affordability is the only gate.
            // COMPACT BY DESIGN: kind, name, price — the description lives in
            // the hover-intent tooltip (the accountScreen bind), so the wall
            // reads as a shelf, not a wall of text.
            const afford = acc.credits >= u.cost;
            return `
            <div class="unlock-card" data-tip="unlock" data-unlock-id="${u.id}">
              <div class="ukind">${u.kind}${u.reqLevel ? ` · req acct lv ${u.reqLevel}` : ''}</div>
              <div class="uname">${u.label}</div>
              <button data-unlock="${u.id}" ${afford ? '' : 'disabled'}>Unlock — ${u.cost}</button>
            </div>`;
          }).join('');
      const ownedCards = owned.map(u => `
            <div class="unlock-card uowned" data-tip="unlock" data-unlock-id="${u.id}">
              <div class="ukind">${u.kind}</div>
              <div class="uname">${u.label}</div>
              <button disabled>✓ Owned</button>
            </div>`).join('');
      // THE RUMOR WALL (discovery web, meta/unlocks.ts): classes the account
      // has NOT yet discovered hang here shrouded — the hint whispers at the
      // deed, the name and price stay the world's secret until it is done.
      // Hover-addressed by INDEX, not id: the catalog id spells the class
      // name, and the DOM keeps the world's secrets too.
      const rumors = undiscoveredClassUnlocks(acc);
      const rumorCards = rumors.map((_u, i) => `
            <div class="unlock-card" style="opacity:.55" data-tip="rumor" data-rumor-i="${i}">
              <div class="ukind">class · undiscovered</div>
              <div class="uname" style="letter-spacing:3px">? ? ?</div>
              <button disabled>Undiscovered</button>
            </div>`).join('');
      this.accountScreen.innerHTML = `
        <div class="vault-head">
          <h1>The Vault — Account Unlocks</h1>
          <div class="acct-head">Account Level <b>${acc.level}</b> &nbsp;·&nbsp;
            <b>${acc.credits}</b> ${META_CURRENCY_LABEL} &nbsp;·&nbsp; ${acc.lifetimeCredits} lifetime
            &nbsp;·&nbsp; <span style="color:var(--text-dim);font-size:11px">rest on a card for its full story</span></div>
        </div>
        <div class="vault-body">
          <h3 class="vault-sub">Available</h3>
          <div class="unlock-grid">${cards}</div>
          ${rumors.length ? `<h3 class="vault-sub">Rumors — classes not yet discovered</h3><div class="unlock-grid">${rumorCards}</div>` : ''}
          ${owned.length ? `<h3 class="vault-sub">Owned</h3><div class="unlock-grid">${ownedCards}</div>` : ''}
          <div class="acct-btns"><button id="acct-close">Back</button></div>
        </div>`;
      const bodyEl = this.accountScreen.querySelector<HTMLElement>('.vault-body');
      if (bodyEl) bodyEl.scrollTop = prevScroll;
      this.accountScreen.querySelectorAll<HTMLElement>('[data-unlock]').forEach(btn => {
        btn.addEventListener('click', () => {
          const u = availableUnlocks(acc).find(x => x.id === btn.dataset.unlock);
          if (u && applyUnlock(acc, u)) { this.saveAccount(); render(); }
        });
      });
      document.getElementById('acct-close')!.addEventListener('click', () => {
        this.accountScreen.classList.add('hidden');
        if (onClose) onClose();
      });
    };
    render();
    this.accountScreen.classList.remove('hidden');
  }

  /** THE VAULT CARD's hover story: the full description the compact card no
   *  longer prints, rebuilt from the live catalog by id (never cached DOM
   *  copy). Serves Available and Owned alike — the meta line carries the
   *  price or the ✓. */
  private unlockTooltip(id: string): TooltipContent | null {
    const u = allUnlockables().find(x => x.id === id);
    if (!u) return null;
    const acc = this.getAccount();
    const owned = isUnlockOwned(acc, u);
    const req = u.reqLevel ? ` · req account level ${u.reqLevel}` : '';
    return {
      title: u.label,
      description: u.description,
      meta: `${u.kind}${req} · ${owned ? '✓ owned' : `${u.cost} ${META_CURRENCY_LABEL}`}`,
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
      meta: 'class · undiscovered — the world teaches what the Vault cannot sell',
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
      <div class="attr-row" data-tip="attr" data-attr-id="${id}" style="cursor:help">
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
      return `<div class="stat-row" data-tip="stat" data-stat-id="${id}" style="cursor:help"><span>${def.label}</span><span class="val">${text}</span></div>`;
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
          ? ` — ${t.invested} invested stat${t.invested === 1 ? '' : 's'} live here` : ''}">${t.def.label}</button>`).join('')}</div>`;
    const vitalRows = SHEET_VITALS.map(statRowHtml).join('');
    const statRows = active ? active.rows.map(statRowHtml).join('') : '';
    const tabNotes = !active ? ''
      : (active.rows.length === 0
        ? `<div style="color:#8a8678;font-size:10px;padding:4px 0 2px">Nothing invested here yet —
            gear, passives and gems that touch these stats will appear as rows.</div>` : '')
      + (!this.charShowAll && active.hidden > 0
        ? `<div style="color:#6a6478;font-size:9px;margin-top:5px">${active.hidden} untouched
            stat${active.hidden === 1 ? '' : 's'} not shown — “show unused” lists the whole shelf.</div>` : '');

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
      const carried = m.knownSkills.has(sid) || m.skillInv.some(i => i.def.id === sid);
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
        <h2 style="border-bottom:none;margin:0;padding-bottom:2px"><span data-tip="class" style="cursor:help;border-bottom:1px dotted var(--gold)">${m.classDef.name}</span>${vocTitle} — Level ${p.level}</h2>
        <div style="font-size:9px;color:#6a6478">starters: ${starterChips}</div>
      </div>
      <div style="font-size:11px;margin-bottom:6px">
        <span style="color:#ffd700">${m.passivePoints} passive</span> ·
        <span style="color:#7ec8a0">${m.skillPoints} skill</span>${vocPts} points available
      </div>
      <h3>Attributes <span style="color:#8a8678;font-weight:normal">(allocated on the passive tree — P)</span></h3>
      ${attrRows}
      <h3 style="display:flex;justify-content:space-between;align-items:baseline">Statistics
        <label style="font-weight:normal;font-size:10px;color:#8a8678;cursor:pointer"
          title="List every stat this tab organizes, invested or not — generated families still surface only once touched">
          <input type="checkbox" data-statshowall${this.charShowAll ? ' checked' : ''}
            style="width:10px;height:10px;margin:0 3px 0 0;vertical-align:-1px;accent-color:var(--gold)">show unused</label></h3>
      <div style="border-bottom:1px solid var(--panel-border);margin-bottom:6px;padding-bottom:3px">${vitalRows}</div>
      ${tabStrip}
      <div style="font-size:10px;color:#8a8678;margin:2px 0 5px">${esc(active?.def.blurb ?? '')}</div>
      ${statRows}${tabNotes}
      <div style="margin-top:8px;color:#8a8678;font-size:10px">
        Tag-scaled stats (damage, speed) shown without skill context — each skill
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

  /** The CARRIED-GEM inventories (moved here from the skill book — one
   *  inventory panel, tabs instead of overlapping windows). 'skills' also
   *  hosts the contextual counters (Brandt / the Delver) since buying puts
   *  gems into exactly these bags. */
  private gemInventoryHtml(kind: 'skills' | 'gems'): string {
    const world = this.getWorld();
    const invSeat = this.panelSeat(this.inventory);
    const m = invSeat.meta;
    if (kind === 'gems') {
      // THE FIELD DISCIPLINE: one predicate, the engine's own words — the
      // buttons refuse exactly when the mutation would (sanctuary waives).
      const swapWhy = world.swapRefusal(invSeat, 'socket');
      return m.inventory.map((gem, idx) => {
        // Crew-aware targets: a gem may board a summon skill purely for what
        // the minted minions cast — mark those so the player knows the
        // payload rides the crew, and name the skills it boards.
        const targets = [...m.knownSkills.values()]
          .filter(inst => inst.sockets.includes(null)
            && supportFitsInstOrCrew(gem.def, inst, world.summonCrewSkills(inst)))
          .map(inst => {
            if (supportFitsInst(gem.def, inst)) {
              return `<button data-socket="${idx}:${inst.def.id}" ${swapWhy ? `disabled title="${swapWhy}"` : ''}>${inst.def.name}</button>`;
            }
            const served = crewSkillsServed(gem.def, inst, world.summonCrewSkills(inst));
            const boards = served === 'unknowable' || served === null
              ? 'whatever you raise'
              : served.map(def => def.name).join(', ');
            const doorNote = crewBoardingOpen(inst) ? ''
              : ' Dormant until Resonance rides this skill.';
            return `<button data-socket="${idx}:${inst.def.id}" ${swapWhy ? 'disabled' : ''}
              title="${swapWhy ? `${swapWhy} — ` : ''}Boards the crew: forwarded to the minions' own skills (${boards}).${doorNote}">${inst.def.name} ⤳</button>`;
          })
          .join('') || '<span style="color:#8a8678">no socketable skill</span>';
        const socketLabel = swapWhy
          ? `Socket into <span style="color:#c08a68">(${swapWhy})</span>:` : 'Socket into:';
        return `
          <div class="skill-entry" data-drag="supportGem:${idx}" style="border-left:3px solid ${gem.def.color}">
            <div class="name">${gem.def.name} <span style="color:#ffd700">Lv ${gem.level}</span>
              <span style="color:#8a8678;font-weight:normal;font-size:10px">support gem</span></div>
            <div class="desc">${gem.def.description}</div>
            <div class="bind-btns">
              <button data-invlvl="${idx}" ${m.skillPoints < 1 || gem.level >= supportMaxLevel(gem.def) ? 'disabled' : ''}>
                Level Up (1 pt)</button>
              ${this.essLevelBtn(`data-invlvl-ess="${idx}"`, gem.level, gem.level >= supportMaxLevel(gem.def))}
              <button data-drop-support="${idx}" title="Drop this gem on the ground (any nearby player can pick it up)">Drop</button>
              ${socketLabel} ${targets}
            </div>
          </div>`;
      }).join('') || '<div style="color:#8a8678;font-size:11px">Slain monsters drop support gems — walk over one to collect it.</div>';
    }

    const nearFont = world.nearFont();
    // (The Brandt/Delver counters moved to the dedicated VENDOR screen —
    // dwell at a stocked counter to open it; data/vendors.ts is the registry.)
    const slotsFull = m.knownSkills.size >= MAX_LEARNED_SKILLS;
    const skillGems = m.skillInv.map((inst, idx) => {
      const def = inst.def;
      const ok = meetsRequirements(world, def);
      const dupe = m.knownSkills.has(def.id);
      const reqText = def.requirements
        ? Object.entries(def.requirements).map(([a, n]) => {
            const met = (m.attrs[a as AttributeId] ?? 0) >= (n ?? 0);
            return `<span style="color:${met ? '#6fc06f' : '#d05050'}">${ATTRIBUTES[a as AttributeId].short} ${n}</span>`;
          }).join(', ')
        : 'No requirements';
      const blocker = dupe ? 'already learned' : slotsFull ? 'all slots full' : !ok ? 'requirements unmet' : '';
      return `
        <div class="skill-entry" data-drag="skillGem:${idx}" style="border-left:3px solid ${SKILL_RARITIES[inst.rarity ?? 'common'].color}">
          <div class="name">${def.name} <span style="color:#ffd700">Lv ${inst.level}</span> ${this.rarityTagHtml(inst)}</div>
          <div class="tags">${def.tags.join(' · ')}</div>
          <div class="desc">${def.description}</div>
          <div class="req">Requires: ${reqText}</div>
          <div class="bind-btns">
            <button data-learn="${idx}" ${blocker ? 'disabled' : ''}>
              Learn${blocker ? ` (${blocker})` : ''}</button>
            ${nearFont ? `<button data-sacrifice="${idx}">Sacrifice${inst.level > 1 ? ` (+${inst.level - 1} pt back)` : ''}</button>` : ''}
            <button data-drop-skill="${idx}" title="Drop this gem on the ground (any nearby player can pick it up)">Drop</button>
          </div>
        </div>`;
    }).join('') || `<div style="color:#8a8678;font-size:11px">
      No skill gems carried. Monsters drop them — rarity decides their sockets (1-4).
      ${nearFont ? '' : 'Find a Sacrificial Font to trade unwanted gems for skill points.'}</div>`;
    return skillGems;
  }

  /** Wire the carried-gem lists' buttons (whichever container renders them). */
  private wireGemInventory(container: HTMLElement, refresh: () => void): void {
    const world = this.getWorld();
    const q = <T extends HTMLElement>(sel: string): T[] => [...container.querySelectorAll<T>(sel)];
    q<HTMLButtonElement>('button[data-learn]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'learn', index: Number(btn.dataset.learn) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-sacrifice]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'sacrifice', index: Number(btn.dataset.sacrifice) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-invlvl]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'levelSupportInv', index: Number(btn.dataset.invlvl) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-invlvl-ess]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'levelSupportInv', index: Number(btn.dataset.invlvlEss), pay: 'essence' }); refresh();
    }));
    q<HTMLButtonElement>('button[data-drop-skill]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'dropSkill', index: Number(btn.dataset.dropSkill) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-drop-support]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'dropSupport', index: Number(btn.dataset.dropSupport) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-socket]').forEach(btn => btn.addEventListener('click', () => {
      const [idx, skillId] = btn.dataset.socket!.split(':');
      world.requestMeta({ t: 'socket', index: Number(idx), skillId });
      refresh();
    }));
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
    // THE LESSON'S HAND ON THE TAB: while Mireille's gift sits carried and
    // unlearned, the inventory OPENS on the Skill Gems tab — the very step
    // her directions name — instead of wherever the player last browsed.
    // Lesson-scoped only: a graduated account (flasks dealt at spawn) and
    // any hero past the learn step get the panel exactly as they left it.
    if (this.inventoryOpen && this.getWorld().mireilleGiftLesson() === 'learn') this.invTab = 'skills';
    this.inventory.classList.toggle('hidden', !this.inventoryOpen);
    if (this.inventoryOpen) this.refreshInventory();
    else { dndCancel(); hideTooltip(); } // a ghost never outlives its surface
  }

  /** An item anywhere on a LOCAL seat — bag or doll (tooltips serve both).
   *  Seat-explicit for the couch lens; item uids are globally unique, so a
   *  wrong-seat miss is a null, never a mistaken identity. */
  private findItem(uid: number, seat: Seat = this.getWorld().localSeat): ItemInstance | undefined {
    const w = this.getWorld();
    const m = seat.meta;
    return m.items.find(i => i.uid === uid)
      ?? Object.values(m.equipped).find(i => i?.uid === uid)
      // Brandt's shelf: counter gear carries the same rich tooltip (and the
      // on-swap comparison against what you wear) BEFORE you buy it.
      ?? w.vendorStock.flatMap(e => (e.kind === 'item' ? [e.item] : [])).find(i => i.uid === uid);
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
      return `<div style="color:#9a94a8;font-size:10px;margin-top:4px">vs ${t.label} —
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
   *  DWELLING (extended hover) grows the card with the ON-SWAP comparison. */
  private itemTooltip(uid: number, extended?: boolean, seat: Seat = this.getWorld().localSeat): TooltipContent | null {
    const item = this.findItem(uid, seat);
    if (!item) return null;
    const d = describeItem(item);
    const lines: string[] = [`<div style="color:#9a94a8;font-size:10px">${d.baseLine}</div>`];
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
      title: `<span style="color:${d.color}">${d.epitaph ? `${d.epitaph.name} — ` : ''}${d.title}</span>`,
      description: lines.join(''),
      meta: `${d.reqLine} · ${ITEM_RARITIES[item.rarity].label}${compareHint}`,
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
      meta: 'Drag onto a socket — consumed on inlay; overwriting destroys the old vestige. Exact sequences on WHITE gear awaken Epitaphs.',
    };
  }

  refreshInventory(): void {
    if (!this.inventoryOpen) return;
    // (No mid-drag freeze: the fabric's gestures ride data attributes that
    // survive innerHTML rebuilds — a re-render mid-carry re-earns its marks
    // on the next beat. The old native drag needed the world to hold still.)
    const invSeat = this.panelSeat(this.inventory);
    const m = invSeat.meta;
    const CELL = 34;
    const W = ITEM_CFG.inventory.w;
    const H = ITEM_CFG.inventory.h;

    // --- the doll: every ENABLED slot from the registry, in registry order ---
    // Every slot is a drop target (data-drop); worn chips are ALSO drag
    // sources — a worn piece lifts off the body the same way a bag piece
    // lifts off its tile. The fabric paints the can/over/src affordances.
    const doll = EQUIP_SLOTS.filter(s => s.enabled).map(slot => {
      const worn = m.equipped[slot.id];
      const border = worn ? ITEM_RARITIES[worn.rarity].color : '#3a3644';
      const wornPips = worn?.sockets?.length ? ` <span style="font-size:12px">${worn.sockets.map((vid, si) => {
        const v = vid ? VESTIGES[vid] : null;
        return `<span data-sock="${worn.uid}:${si}" data-drop="sock:${worn.uid}:${si}" title="${v ? v.name : 'Empty socket — drop a vestige here'}"
          style="color:${v?.color ?? '#5a5668'};padding:0 2px;cursor:copy">${v?.glyph ?? '◇'}</span>`;
      }).join('')}</span>` : '';
      const label = worn
        ? `<span style="color:${ITEM_RARITIES[worn.rarity].color}">${worn.name}</span>${wornPips}`
        : `<span style="color:#5a5668">${slot.label}</span>`;
      return `<button data-doll="${slot.id}" data-drop="equipSlot:${slot.id}"
        ${worn ? `data-drag="gearItem:${worn.uid}" data-tip="item" data-item-uid="${worn.uid}"` : ''}
        style="display:block;width:170px;margin:3px 0;padding:6px 8px;text-align:left;font-size:10px;
        background:#1a1722;border:1px solid ${border};border-radius:4px;cursor:pointer">${label}</button>`;
    }).join('');

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
          return `<span data-sock="${i.uid}:${si}" data-drop="sock:${i.uid}:${si}" title="${v ? v.name : 'Empty socket — drop a vestige here'}"
            style="color:${v?.color ?? '#5a5668'};padding:0 2px;cursor:copy">${v?.glyph ?? '◇'}</span>`;
        }).join('')}
      </div>`;
    };
    // Tiles: drag sources AND drop targets (another piece swaps; a vestige
    // inlays forgivingly). The fabric's .dnd-src mark dims a lifted tile.
    const tiles = m.items.map(i => {
      if (i.x === undefined || i.y === undefined) return '';
      const s = itemGridSize(i);
      const r = ITEM_RARITIES[i.rarity];
      const cat = ITEM_BASES[i.baseId]?.category ?? 'ring';
      return `<div data-tip="item" data-item-uid="${i.uid}" data-bag-item="1"
        data-drag="gearItem:${i.uid}" data-drop="gearTile:${i.uid}"
        style="position:absolute;left:${i.x * CELL}px;top:${i.y * CELL}px;
        width:${s.w * CELL - 2}px;height:${s.h * CELL - 2}px;background:#221e2c;
        border:2px solid ${r.color};border-radius:3px;cursor:pointer;box-sizing:border-box;
        display:flex;align-items:center;justify-content:center;font-size:${Math.min(s.w, s.h) > 1 ? 16 : 12}px;
        ${i.rarity === 'unique' ? `box-shadow:0 0 10px ${r.color};` : ''}">${CATEGORY_GLYPHS[cat] ?? '?'}${pipRow(i)}</div>`;
    }).join('');

    // The SATCHEL: a little pouch flap on the panel's edge holding the
    // essence wallet — click to flip it open/closed.
    const satchel = `
      <button data-satchel style="position:absolute;top:10px;right:14px;font-size:11px;
        background:#241d2e;border:1px solid #4a3a5a;border-radius:6px 6px 2px 2px;padding:3px 9px;cursor:pointer"
        title="Essence satchel (salvage currency — dies with you)">🎒 ${this.satchelOpen ? '▾' : '▸'}</button>
      ${this.satchelOpen ? `
        <div style="position:absolute;top:38px;right:14px;z-index:3;background:#1b1524;
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
                  style="font-size:11px;color:${v.color};margin:2px 0;cursor:grab">${v.glyph} ${n}
                  <span style="color:#6a6478;font-size:9px">${v.name.split(',')[0]}</span></div>`;
              }).join('')}
              <div style="color:#5a5668;font-size:8px;margin-top:3px">drag — or click to lift — a vestige,
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
    // MIREILLE'S LESSON, read from its one source of truth (the world): at
    // the 'learn' step the Skill Gems TAB glows from any other tab; at the
    // 'bar' step the flap handle glows while the drawer is CLOSED, then the
    // unbound slot keys inside take over (learnedListHtml) — one mechanism,
    // three surfaces, each live off the same read every render. The glow
    // always marks the lesson's next click — and the lesson LATCHES LIVED
    // in the ledgers (World.mireilleGiftLesson), so once the loop has been
    // walked — this run, a past character, or undone again by choice
    // (unlearn, unbind) — these stay quiet forever after.
    const lesson = this.getWorld().mireilleGiftLesson();
    const flapGlow = lesson === 'bar' && !this.buildFlapOpen;
    const drawerHandle = `
      <button data-buildflap class="${flapGlow ? 'tut-glow' : ''}"
        title="Your learned skills — the whole build, full management"
        style="position:absolute;left:-27px;top:56px;writing-mode:vertical-rl;text-orientation:mixed;
        padding:12px 4px;font-size:11px;letter-spacing:1px;background:#241d2e;color:#c8a8ff;
        border:1px solid #4a3a5a;border-right:none;border-radius:6px 0 0 6px;cursor:pointer;z-index:4">
        📖 BUILD ${this.buildFlapOpen ? '▸' : '◂'}</button>`;
    const drawer = this.buildFlapOpen ? `
      <div style="position:absolute;right:100%;top:0;margin-right:2px;width:360px;
        max-height:calc(100vh - 220px);display:flex;flex-direction:column;z-index:3;
        background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:6px 0 0 6px;
        box-shadow:-6px 5px 22px rgba(0,0,0,0.6);padding:10px 12px">
        <div style="flex:0 0 auto;color:var(--gold);font-size:12px;letter-spacing:1.2px;text-transform:uppercase;
          border-bottom:1px solid var(--panel-border);padding-bottom:5px;margin-bottom:6px">
          📖 Build — <span style="color:#7ec8a0">${m.skillPoints} pts</span>
          <span style="float:right;color:#b06bd4;font-size:10px;letter-spacing:0">
            ${wf ? 'FONT NEARBY · ' : ''}offerings ${m.offerings}/${OFFERINGS_PER_POINT}</span>
        </div>
        <div class="build-scroll" style="flex:1 1 auto;overflow-y:auto;font-size:12px;padding-right:4px">
          ${this.learnedListHtml()}
        </div>
      </div>` : '';
    const gearBody = `
      <div style="display:flex;gap:18px;align-items:flex-start">
        <div>
          <h3>Equipped</h3>
          ${doll}
        </div>
        <div>
          <h3>Bag <span style="color:#8a8678;font-weight:normal">(${m.items.length} item${m.items.length === 1 ? '' : 's'})</span></h3>
          <div style="position:relative;width:${W * CELL}px;height:${H * CELL}px">${cells}${tiles}</div>
          <div style="margin-top:8px;color:#8a8678;font-size:10px">
            drag — or click to lift — any piece: bag ↔ doll ↔ the other slot,
            onto another item to swap, onto the world to drop it ·
            double-click: equip / unequip · shift-click: drop to ground · ${pickupHint}
          </div>
        </div>
      </div>`;

    // ONE inventory, tabbed: the gear grid and the carried gem bags share the
    // panel (and the key) instead of overlapping as separate windows.
    const tabBtn = (id: 'gear' | 'skills' | 'gems', label: string): string =>
      `<button class="book-tab ${this.invTab === id ? 'active' : ''}${
        lesson === 'learn' && id === 'skills' && this.invTab !== 'skills' ? ' tut-glow' : ''
      }" data-invtab="${id}">${label}</button>`;
    const tabs = `<div class="book-tabs" style="margin-bottom:8px">
      ${tabBtn('gear', `Gear (${m.items.length})`)}
      ${tabBtn('skills', `Skill Gems (${m.skillInv.length})`)}
      ${tabBtn('gems', `Support Gems (${m.inventory.length})`)}
    </div>`;
    const body = this.invTab === 'gear' ? gearBody : this.gemInventoryHtml(this.invTab);

    // Same-tab scroll restore (the golden rule — a re-render must never
    // yank a list to the top mid-read). The panel itself no longer scrolls
    // (the drawer hangs OUTSIDE it); the inner wrapper does, and the
    // drawer's own list keeps its offset too.
    const prevScroll = this.inventory.querySelector<HTMLElement>('.inv-scroll')?.scrollTop ?? 0;
    const prevBuildScroll = this.inventory.querySelector<HTMLElement>('.build-scroll')?.scrollTop ?? 0;
    const sameTab = this.lastInvTab === this.invTab;
    this.inventory.innerHTML = `${drawer}${drawerHandle}${satchel}<h2>Inventory</h2>${tabs}
      <div class="inv-scroll" style="max-height:calc(100vh - 240px);overflow-y:auto">${body}</div>`;
    const scrollEl = this.inventory.querySelector<HTMLElement>('.inv-scroll');
    if (scrollEl && sameTab) scrollEl.scrollTop = prevScroll;
    const buildEl = this.inventory.querySelector<HTMLElement>('.build-scroll');
    if (buildEl) buildEl.scrollTop = prevBuildScroll;
    this.lastInvTab = this.invTab;
    this.wireInventory();
    this.paintPortraitsIn(this.inventory); // the build flap's Spectre chip
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
    q<HTMLButtonElement>('button[data-invtab]').forEach(btn => btn.addEventListener('click', () => {
      this.invTab = btn.dataset.invtab as typeof this.invTab;
      dndCancel(); // a carry has no meaning across a tab flip
      this.refreshInventory();
    }));
    // The Build drawer rides EVERY tab (its handle hangs on the panel edge):
    // toggle + — when open — the learned list's full management wiring.
    this.inventory.querySelector<HTMLButtonElement>('[data-buildflap]')?.addEventListener('click', () => {
      this.buildFlapOpen = !this.buildFlapOpen;
      this.refreshInventory();
    });
    if (this.buildFlapOpen) {
      this.wireLearnedList(this.inventory, () => this.refreshInventory());
    }
    // The gem tabs re-use the shared list wiring (learning moves gems into
    // knownSkills — the drawer re-renders with the same refresh).
    if (this.invTab !== 'gear') {
      this.wireGemInventory(this.inventory, () => this.refreshInventory());
      return; // no gear handlers to attach on gem tabs
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
    this.salvageMenu.classList.remove('hidden');
    this.refreshSalvage();
  }

  closeSalvage(): void {
    this.salvageOpen = false;
    this.salvageMenu.classList.add('hidden');
    this.craftTargetUid = null;
    hideTooltip();
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
      const gearRows = m.items.map(i => {
        const y = salvageItemYield(i);
        return `<div class="skill-entry" style="border-left:3px solid ${ITEM_RARITIES[i.rarity].color}">
          <div class="name" data-tip="item" data-item-uid="${i.uid}" style="color:${ITEM_RARITIES[i.rarity].color}">${i.name}</div>
          <div class="bind-btns"><button data-salv-item="${i.uid}">Break down (${this.essCostText(y)})</button></div>
        </div>`;
      }).join('') || '<div style="color:#8a8678;font-size:11px">No gear in the bag. (Worn pieces must be unequipped first.)</div>';
      const skillRows = m.skillInv.map((inst, idx) => {
        const y = salvageSkillYield(inst);
        return `<div class="skill-entry" style="border-left:3px solid ${SKILL_RARITIES[inst.rarity ?? 'common'].color}">
          <div class="name">${inst.def.name} <span style="color:#ffd700">Lv ${inst.level}</span>${inst.granted ? ' <span style="color:#8a8678;font-size:10px">(granted)</span>' : ''}</div>
          <div class="bind-btns"><button data-salv-skill="${idx}">${y ? `Break down (${this.essCostText(y)})` : 'Break down (nothing — granted)'}</button></div>
        </div>`;
      }).join('') || '<div style="color:#8a8678;font-size:11px">No skill gems carried.</div>';
      const supRows = m.inventory.map((gem, idx) => {
        const y = salvageSupportYield(gem);
        return `<div class="skill-entry" style="border-left:3px solid ${gem.def.color}">
          <div class="name">${gem.def.name} <span style="color:#ffd700">Lv ${gem.level}</span></div>
          <div class="bind-btns"><button data-salv-sup="${idx}">Break down (${this.essCostText(y)})</button></div>
        </div>`;
      }).join('') || '<div style="color:#8a8678;font-size:11px">No loose support gems.</div>';
      body = `<div style="margin-bottom:6px">${this.essWallet(seat)}</div>
        <div class="desc" style="color:#8a8678;font-size:10px;margin-bottom:6px">
          Breaking gear pays Essence by its quality — and STUDIES each affix on it (expertise, on the account, survives death).
        </div>
        <h3>Gear</h3>${gearRows}<h3>Skill Gems</h3>${skillRows}<h3>Support Gems</h3>${supRows}`;
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
          }).join('') || '<div style="color:#8a8678;font-size:11px">No studied affix fits this piece yet — salvage more of what you want to learn.</div>';
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
          One crafted line per piece${world.craftSlots() > 1 ? ` (yours: ${world.craftSlots()})` : ''}; expertise raises the roll CEILING — the roll itself stays wild.
        </div>
        <h3>Piece</h3><div class="bind-btns">${targetRows}</div>
        <h3>Craft onto it</h3>${chisel}${affixRows}
        <h3>Expertise <span style="color:#8a8678;font-weight:normal;font-size:10px">— only salvaged lines at or ABOVE your next tier teach you anything</span></h3>${loreRows}`;
    }

    this.salvageMenu.innerHTML = `<h2>Salvage Station</h2>${tabs}${body}
      <div class="bind-btns" style="margin-top:8px"><button data-salv-close>Step away</button></div>`;

    const q = <T extends HTMLElement>(sel: string): T[] => [...this.salvageMenu.querySelectorAll<T>(sel)];
    q<HTMLButtonElement>('button[data-stab]').forEach(btn => btn.addEventListener('click', () => {
      this.salvageTab = btn.dataset.stab as 'salvage' | 'craft';
      this.refreshSalvage();
    }));
    q<HTMLButtonElement>('button[data-salv-item]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'salvageItem', uid: Number(btn.dataset.salvItem), lane: 'break' });
      this.refreshSalvage();
    }));
    q<HTMLButtonElement>('button[data-salv-skill]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'salvageSkill', index: Number(btn.dataset.salvSkill), lane: 'break' });
      this.refreshSalvage();
    }));
    q<HTMLButtonElement>('button[data-salv-sup]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'salvageSupport', index: Number(btn.dataset.salvSup), lane: 'break' });
      this.refreshSalvage();
    }));
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
   *  derivation drawActor makes for live bodies). */
  private portraitDefOf(def: MonsterDef): PortraitDefLike {
    return { ...def, demonHorns: !!FACTIONS[def.faction ?? '']?.nubHorns };
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
    let detail = '<div style="color:#8a8678;font-size:11px;margin-top:6px">Open an entry — knowledge fills in as your line hunts.</div>';
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
              ? '★ Mastered — drag this page (or click to lift it) onto a Spectre slot above to attune.'
              : '★ Mastered — a Spectre skill, once learned, binds this form here at the book.')
            : '★ Mastered — too mighty a form for spectral binding.'}</div>`;
      }
      // The STUDY PORTRAIT: the creature itself, large and alive, beside its
      // revealed page — the intimate read the tiers were building toward.
      detail = `<div style="border:1px solid #3a3a52;border-radius:4px;padding:8px;margin-top:8px;background:rgba(20,20,30,0.5)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          ${this.monsterPortraitHtml(def, false, BESTIARY_CFG.portrait.detail, true)}
          <div style="flex:1;min-width:0"><b style="font-size:14px">${def.name}</b>${
            def.boss ? ' <span style="color:#e64db4;font-size:10px">BOSS</span>' : ''}
            <div style="color:#8a8678;font-size:10px;margin-top:2px">as it walks the world — drawn from the hunt itself</div>
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
          SPECTRE GRIMOIRE — forms bind here, at the open book. In the field you fight with what you carried out.
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
      <h2 style="margin-bottom:2px">The Tracker's Bestiary</h2>
      <div style="color:#8a8678;font-size:10px;margin-bottom:6px">
        ${totals.sighted} of ${totals.pages} kinds sighted · ${totals.mastered} mastered — knowledge is the account's, and outlives you.
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
        const state = a.crafted ? '<span style="color:#8a8678">bench-work — the stone will not touch it</span>'
          : a.locked ? '<span style="color:#8a8678">🔒 sealed — the stone has spoken</span>'
          : `<button data-commune="${target.uid}:${idx}" ${afford ? '' : 'disabled'}>
              Commune (${this.essCostText(cost)})${afford ? '' : ' — not enough'}</button>`;
        return `<div class="skill-entry">
          <div class="name" style="font-size:11px">${line}</div>
          <div class="bind-btns">${state}</div>
        </div>`;
      }).join('');
      affixRows += `<div style="color:#8a8678;font-size:10px;margin-top:4px">
        A communed line rerolls within what this item could legally carry — then SEALS forever. Trace well.</div>`;
    }
    this.oracleMenu.innerHTML = `
      <h2>The Oracle Stone</h2>
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
    this.vendorMenu.classList.remove('hidden');
    this.refreshVendor();
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
    this.vendorMenu.style.cursor = '';
    this.vendorMenu.classList.add('hidden');
    hideTooltip();
  }

  /** The player's things as scrap-wheel targets — the SELL lane. Prices are
   *  the sell yields (everything converts to COARSE by quality × rarity
   *  rate); the bench's break yields live on the station screen instead.
   *  Reads the VENDOR panel's owner (the seat working the wheel). */
  private scrapListHtml(): string {
    const m = this.panelSeat(this.vendorMenu).meta;
    const chip = (attr: string, color: string, label: string, yieldHtml: string): string =>
      `<button ${attr} style="margin:2px 4px 2px 0;border-color:${color};color:${color}">
        ${label} <span style="color:#8a8678">→ ${yieldHtml}</span></button>`;
    const gear = m.items.map(i =>
      chip(`data-scrap-item="${i.uid}" data-tip="item" data-item-uid="${i.uid}"`,
        ITEM_RARITIES[i.rarity].color, i.name, this.essCostText(sellItemYield(i)))).join('');
    const skills = m.skillInv.map((inst, idx) => {
      const y = sellSkillYield(inst);
      return chip(`data-scrap-skill="${idx}"`, SKILL_RARITIES[inst.rarity ?? 'common'].color,
        `${inst.def.name} Lv${inst.level}`, y ? this.essCostText(y) : 'nothing (granted)');
    }).join('');
    const sups = m.inventory.map((gem, idx) =>
      chip(`data-scrap-sup="${idx}"`, gem.def.color, `${gem.def.name} Lv${gem.level}`,
        this.essCostText(sellSupportYield(gem)))).join('');
    const all = gear + skills + sups;
    return all || '<div style="color:#8a8678;font-size:11px">Nothing carried worth selling.</div>';
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
      ? `the horde comes — <b>${Math.ceil(v.timer)}s</b> to prepare`
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
      <h3 style="color:#e8c87a">⌂ Arm ${v.folk.name}</h3>
      <div style="font-size:12px;color:#b8b4a4;margin-bottom:6px">
        ${stage} &nbsp;·&nbsp; folk standing: <b>${v.folkAlive}/${v.folkTotal}</b>
        &nbsp;·&nbsp; ${v.folk.name}: ${lifePct}% &nbsp;·&nbsp; gifts ${v.gifts}/${v.maxGifts}
      </div>
      <div style="font-size:11px;color:#8a8678;margin-bottom:4px">
        Gift a piece of gear (drag it onto this panel, or click below) — its lines become theirs, for good.</div>
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
          ${shown.map(line).join('') || `<div style="color:#8a8678;font-size:11px">The index knows nothing by that name — gems are indexed as they genuinely DROP (${need} finds name one).</div>`}
        </div>
        ${rows.length > CAP ? `<div style="color:#8a8678;font-size:10px;margin-top:3px">…${rows.length - CAP} more — refine the search.</div>` : ''}
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
      const rows = v.stock(world).map((e, idx) => {
        // The three counter shapes: gems read as gems; rolled GEAR reads as
        // an item row (rarity color + the ilvl badge) and carries the full
        // item tooltip — inspect before you spend, exactly like a bag piece.
        const name = e.kind === 'skill' ? e.inst.def.name : e.kind === 'support' ? e.gem.def.name : e.item.name;
        const col = e.kind === 'skill' ? SKILL_RARITIES[e.inst.rarity ?? 'common'].color
          : e.kind === 'support' ? e.gem.def.color
          : ITEM_RARITIES[e.item.rarity].color;
        const lvHtml = e.kind === 'item'
          ? `<span style="color:#9a94a8;font-size:10px">ilvl ${e.item.ilvl}</span>`
          : `<span style="color:#ffd700">Lv ${e.kind === 'skill' ? e.inst.level : e.gem.level}</span>`;
        const tags = e.kind === 'skill' ? e.inst.def.tags.join(' · ')
          : e.kind === 'support' ? 'support gem'
          : ITEM_BASES[e.item.baseId]?.name ?? 'gear';
        const tag = e.kind === 'skill' ? this.rarityTagHtml(e.inst) : '';
        const tipAttrs = e.kind === 'item' ? ` data-tip="item" data-item-uid="${e.item.uid}"` : '';
        const price = v.priceOf(world, e);
        const afford = price.essences
          ? price.essences.every(c => world.canAffordEssence(seat, c))
          : world.descentEchoes >= (price.echoes ?? 0);
        const priceHtml = price.essences
          ? price.essences.map(c => this.essCostText(c)).join(' + ')
          : `${price.echoes} ◈`;
        // The reserve toggle: shown once the ladder has ANY rung (or on an
        // already-held row, so releasing never needs capacity); a full
        // ledger disables further ticks with the reason in the title.
        const heldRow = canLock ? world.vendorEntryHold(holdKey, e) : undefined;
        const badge = heldRow
          ? (heldRow.commission
            ? '<span style="color:#7fe0d8;font-size:9px;border:1px solid #7fe0d866;border-radius:3px;padding:0 3px;margin-left:4px;vertical-align:middle">STANDING ORDER</span>'
            : `<span style="color:${v.accent};font-size:9px;border:1px solid ${v.accent}66;border-radius:3px;padding:0 3px;margin-left:4px;vertical-align:middle">RESERVED</span>`)
          : '';
        const atCap = !heldRow && lockedCount >= lockCap;
        const lockBtn = canLock && (lockCap > 0 || heldRow)
          ? `<button data-vlock="${v.id}:${idx}" ${atCap ? 'disabled' : ''} style="min-width:30px"
              title="${heldRow
                ? (heldRow.commission
                  ? 'Release the standing order\'s find (the watch resumes; the slot re-rolls next restock)'
                  : 'Release this reserve — the slot re-rolls on the next restock')
                : atCap ? `The reserve ledger holds ${lockCap} — release one first`
                : 'Reserve this slot — it will not re-roll until bought or released'}">${heldRow ? '🔒' : '🔓'}</button>`
          : '';
        return `
          <div class="skill-entry" style="border-left:3px solid ${col}${heldRow ? `;background:${v.accent}12` : ''}"${tipAttrs}>
            <div class="name" style="${e.kind === 'item' ? `color:${col}` : ''}">${name} ${lvHtml} ${tag}${badge}</div>
            <div class="tags">${tags}</div>
            <div class="bind-btns">
              ${lockBtn}
              <button data-vbuy="${v.id}:${idx}" ${afford ? '' : 'disabled'}>
                Buy (${priceHtml})${afford ? '' : ' — not enough'}</button>
            </div>
          </div>`;
      }).join('') || '<div style="color:#8a8678;font-size:11px">Sold out — come back after the restock.</div>';

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
          : found ? `<b style="color:${cDef?.color ?? '#7fe0d8'}">${esc(cName!)}</b> — <span style="color:#7fe0d8">found; it waits reserved on the shelf</span>`
          : `<b style="color:${cDef?.color ?? '#d8d4c8'}">${esc(cName!)}</b> — the counter watches (${((): string => {
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

      // The SELL lane: counters whose scrap gate is OPEN offer the wheel
      // (everything → Coarse, by quality). A gated-shut counter explains
      // itself (salvageLocked) — the Vault sells the key.
      const scrap = v.salvage?.(world) ? `
        <div style="margin-top:8px;border-top:1px dashed ${v.accent}55;padding-top:6px">
          <button data-scrapmode class="${this.scrapMode ? 'bound' : ''}">
            ⚙ ${this.scrapMode ? 'Scrap wheel ON — click your things to SELL them for Coarse Essence' : 'Flip the scrap wheel (sell for Coarse Essence)'}</button>
          ${this.scrapMode ? `<div style="margin-top:6px">${this.scrapListHtml()}</div>` : ''}
        </div>` : (v.salvage && v.salvageLocked ? `
        <div style="margin-top:8px;border-top:1px dashed ${v.accent}55;padding-top:6px;color:#8a8678;font-size:11px">
          🔒 ${v.salvageLocked}</div>` : '');

      const reserveBadge = canLock && lockCap > 0
        ? ` <span style="opacity:0.8;font-size:10px;font-weight:normal">· 🔒 ${lockedCount}/${lockCap} reserved</span>`
        : '';
      return `
        <div style="border:1px solid ${v.accent}44;border-radius:4px;padding:8px;margin-bottom:10px;background:${v.bg}">
          <div style="color:${v.accent};font-weight:bold;font-size:12px;margin-bottom:4px">
            ${v.label}${v.headline ? ` <span data-vheadline="${v.id}" style="opacity:0.7;font-size:10px;font-weight:normal">· ${v.headline(world)}</span>` : ''}${reserveBadge}</div>
          ${rows}
          ${commStrip}
          ${scrap}
        </div>`;
    }).join('') || '<div style="color:#8a8678;font-size:11px">No counter at hand — find a vendor and linger.</div>';

    this.vendorMenu.innerHTML = `
      <h2>Vendors</h2>
      <div style="margin-bottom:6px">${this.essWallet()}</div>
      ${sections}
      <div class="bind-btns" style="margin-top:8px"><button data-vendor-close>Step away</button></div>`;
    // The wheel turns the whole screen's cursor into the scrap gear.
    this.vendorMenu.style.cursor = this.scrapMode ? SCRAP_CURSOR : '';

    const q = <T extends HTMLElement>(sel: string): T[] => [...this.vendorMenu.querySelectorAll<T>(sel)];
    const refresh = (): void => { this.refreshVendor(); this.refreshInventory(); };
    q<HTMLButtonElement>('button[data-vbuy]').forEach(btn => btn.addEventListener('click', () => {
      const [vid, idx] = btn.dataset.vbuy!.split(':');
      const vendor = VENDORS.find(v => v.id === vid);
      if (!vendor) return;
      // buyT IS the intent literal — pass it through (a new counter's intent
      // needs no dispatch edit here, only its union arm + world handler).
      world.requestMeta({ t: vendor.buyT, index: Number(idx) });
      refresh();
    }));
    // THE PATRON'S HOLD: the toggle reads the row's CURRENT held state and
    // asks for the flip — the world validates capacity/nearness (host-side
    // in co-op; the client's optimistic repaint self-heals off the snapshot).
    q<HTMLButtonElement>('button[data-vlock]').forEach(btn => btn.addEventListener('click', () => {
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
    q<HTMLButtonElement>('button[data-scrapmode]').forEach(btn => btn.addEventListener('click', () => {
      this.scrapMode = !this.scrapMode;
      this.refreshVendor();
    }));
    q<HTMLButtonElement>('button[data-scrap-item]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'salvageItem', uid: Number(btn.dataset.scrapItem), lane: 'sell' }); refresh();
    }));
    q<HTMLButtonElement>('button[data-scrap-skill]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'salvageSkill', index: Number(btn.dataset.scrapSkill), lane: 'sell' }); refresh();
    }));
    q<HTMLButtonElement>('button[data-scrap-sup]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'salvageSupport', index: Number(btn.dataset.scrapSup), lane: 'sell' }); refresh();
    }));
    this.vendorMenu.querySelector<HTMLButtonElement>('[data-vendor-close]')?.addEventListener('click', () => this.closeVendor());
  }

  /** Class-select starting-skill chip tooltip (name + quick description). */
  private classSkillTooltip(skillId: string): TooltipContent | null {
    const def = SKILLS[skillId];
    if (!def) return null;
    return { title: def.name, description: def.description, meta: def.tags.join(' · ') };
  }

  // -------------------------------------------------------------- skill book

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
${carrier ? `Bound to ${carrier.name}. Click to lift and rebind.` : 'Unbound. Click, then click a skill to graft it on — no socket spent.'}">
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
        : r.state === 'duplicate' ? 'DORMANT — that gem is already socketed there; the worn copy yields'
          : r.state === 'unfit' ? 'DORMANT — it does not fit the skill seated there (a socketed gem granting the mechanism would wake it)'
            : `EMPTY SEAT — bind a skill to Skill Slot ${r.slot + 1} and it rides`;
      return `<span class="gem-chip graft-chip" style="border-color:${live ? (r.def.color ?? '#b8a2e8') : '#4a4458'}${live ? '' : ';opacity:0.62'}"
        title="${r.def.description}
Worn graft — your gear grants this to Skill Slot ${r.slot + 1}; no socket spent. ${word}.">
        ✦ ${r.def.name} <b>L${r.level}</b> → Slot ${r.slot + 1}${live ? '' : ' — dormant'}</span>`;
    }).join('');
    const graftBank = (graftSources.length || wornRows.length) ? `
      <div class="graft-bank">
        ${graftSources.length ? `<span style="color:#b8a2e8;font-size:10px">Grafts${this.liftedGraftKey ? ' — click a skill to bind' : ''}:</span>
        ${bankChips}` : ''}
        ${wornRows.length ? `<span style="color:#b8a2e8;font-size:10px">Worn:</span> ${wornChips}` : ''}
      </div>` : '';
    // MIREILLE'S LESSON at KEY grain: while the bar step pends, each gift
    // flask still off the bar lights the UNBOUND slot keys it could land on
    // — the same live, latched read as the tab and flap glows (the flap
    // stops glowing once opened; these carry the next click the rest of the
    // way). Occupied keys stay dark on purpose: the lesson teaches a free
    // key, never an overwrite. Latch and step both live in the world
    // (mireilleGiftLesson/mireilleLessonSkills), so a barred flask's row
    // quiets the instant it lands, and a lived lesson never re-lights here
    // over a later unbind.
    const lessonSkills = world.mireilleGiftLesson() === 'bar' ? world.mireilleLessonSkills() : [];
    // THE FIELD DISCIPLINE, spoken at the button (the engine gate's words):
    // unsocket shares one verdict; unlearn adds its per-skill clock below.
    const unsocketWhy = world.swapRefusal(seat, 'unsocket');
    return graftBank + [...m.knownSkills.values()].map(inst => {
      const def = inst.def;
      const maxLv = skillMaxLevel(def);
      const teachRow = lessonSkills.includes(def.id);
      const binds = this.slotLabels().map((label, slot) => {
        const bound = p.skills[slot]?.def.id === def.id;
        const teachKey = teachRow && !p.skills[slot];
        return `<button data-bind="${def.id}" data-slot="${slot}"
          class="${bound ? 'bound' : ''}${teachKey ? ' tut-glow' : ''}">${label}</button>`;
      }).join('');
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
          <button data-gemlvl="${def.id}:${i}" ${m.skillPoints < 1 || s.level >= supportMaxLevel(s.def) ? 'disabled' : ''}>+</button>
          <button data-gemlvl-ess="${def.id}:${i}"
            ${!this.getWorld().canAffordEssence(seat, skillLevelEssenceCost(s.level + 1)) || s.level >= supportMaxLevel(s.def) ? 'disabled' : ''}
            title="Level up for ${skillLevelEssenceCost(s.level + 1).count}× ${ESSENCES[skillLevelEssenceCost(s.level + 1).essence].label}">+${ESSENCES[skillLevelEssenceCost(s.level + 1).essence].glyph}</button>
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
          ? `<span class="gem-chip" style="border-color:#a8d8a0" title="This copy summons ${form.name} outright — no corpse read. Rebind or release at the Tracker's book.">
              ${this.monsterPortraitHtml(form, false, VIS_CFG.portrait.seats.spectreChip)} ${form.name}</span>`
          : `<span style="color:#8a8678">unattuned — reads corpses</span>`;
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
            title="${art.name} — learned from the ${src.name}. Click to take this form (shift-press the slot cycles).">
            ${this.monsterPortraitHtml(src, false, VIS_CFG.portrait.seats.spectreChip)} ${art.name}${e.sid === sel ? ' ◈' : ''}</button>`;
        }).join('');
        mimicRow = `<div style="margin-top:3px;font-size:10px">
          <span style="color:#c8a0e8">Repertoire:</span>
          ${chips || `<span style="color:#8a8678">no arts captured — take a studied kind's blow</span>`}
        </div>`;
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
Worn graft (Skill Slot ${r.slot + 1}) — DORMANT: ${r.state === 'duplicate'
              ? 'this gem is already socketed here; the worn copy yields.'
              : 'it does not fit this skill — a socketed gem granting the mechanism would wake it, or seat a fitting skill here.'}">
            ✦ ${r.def.name} <b>L${r.level}</b> — dormant</span>`).join('')}
          ${this.liftedGraftKey ? `<button class="graft-land" data-graft-bind="${def.id}">⊕ graft here</button>` : ''}
        </div>` : '';
      return `
        <div class="skill-entry" data-tip="skill" data-skill-id="${def.id}" style="border-left:3px solid ${def.color}">
          <div class="name">${def.name} <span style="color:#ffd700">Lv ${inst.level}${eff > inst.level ? ` <span style="color:#8ad0ff">(+${eff - inst.level} → ${eff})</span>` : inst.level >= maxLv ? ' (max)' : ''}</span>
            ${reached.map(t => `<span style="font-size:9px;padding:1px 6px;border-radius:7px;background:#2a2438;color:#c8a8ff;margin-left:4px" title="Lv ${t.level} threshold">${t.label}</span>`).join('')}
            ${nextThresh ? `<span style="font-size:9px;color:#6a6478;margin-left:4px">Lv ${nextThresh.level}: ${nextThresh.label}</span>` : ''}
            ${this.rarityTagHtml(inst)}
            <span style="color:#8a8678;font-weight:normal;font-size:10px">
              ${this.costText(p.skillCost(inst))}${def.cooldown ? `, ${def.cooldown}s cd` : ''}</span>
          </div>
          <div class="tags">${def.tags.join(' · ')}</div>
          <div class="bind-btns">
            <button data-levelup="${def.id}" ${m.skillPoints < 1 || inst.level >= maxLv ? 'disabled' : ''}>
              Level Up (1 pt)</button>
            ${this.essLevelBtn(`data-levelup-ess="${def.id}"`, inst.level, inst.level >= maxLv)}
            ${binds}
            ${(() => {
              const why = world.swapRefusal(seat, 'unlearn', def.id);
              return `<button data-unlearn="${def.id}" ${why ? `disabled title="${why}"` : ''}>Unlearn${why ? ` (${why})` : ''}</button>`;
            })()}
          </div>
          <div class="sockets">${sockets}</div>
          ${graftRow}
          ${grimoire}
          ${mimicRow}
        </div>`;
    }).join('') || '<div style="color:#8a8678;font-size:11px">Nothing learned. Skills drop from monsters — learn them from the Inventory (I) → Skill Gems tab.</div>';
  }

  /** Wire the learned-list buttons in whichever container rendered it. */
  private wireLearnedList(container: HTMLElement, refresh: () => void): void {
    const world = this.getWorld();
    const q = <T extends HTMLElement>(sel: string): T[] => [...container.querySelectorAll<T>(sel)];
    // Every button routes the mutation through world.requestMeta — on the host /
    // single-player it applies immediately to the local seat; on a render-shell
    // CLIENT it ships the intent to the host (which mutates OUR seat + replicates
    // back). The UI reconciles on the next snapshot either way.
    q<HTMLButtonElement>('button[data-bind]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'bindSkill', slot: Number(btn.dataset.slot), skillId: btn.dataset.bind! });
      refresh();
    }));
    // Mimic repertoire chips: pick the form this press wears.
    q<HTMLButtonElement>('button[data-mimicsel]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'mimicSelect', sid: btn.dataset.mimicsel! });
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
    // Essence-pay level-ups (the salvage loop feeding back into the build).
    q<HTMLButtonElement>('button[data-levelup-ess]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'levelSkill', skillId: btn.dataset.levelupEss!, pay: 'essence' }); refresh();
    }));
    q<HTMLButtonElement>('button[data-gemlvl-ess]').forEach(btn => btn.addEventListener('click', () => {
      const [skillId, sock] = btn.dataset.gemlvlEss!.split(':');
      world.requestMeta({ t: 'levelSupportSocket', skillId, socket: Number(sock), pay: 'essence' });
      refresh();
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
      <h2>${activeRealm && this.treeRealm !== MAIN_REALM ? activeRealm.label : 'Passive Tree'} — ${poolChip}${vocChips}
        <span style="float:right;color:#8a8678;font-size:11px;font-weight:normal">
          <span class="tree-zoom-grp">
            <button class="tree-zoom" data-tz="out" title="zoom out">−</button>
            <button class="tree-zoom" data-tz="reset" title="reset zoom">${zPct}%</button>
            <button class="tree-zoom" data-tz="in" title="zoom in">＋</button>
          </span> &nbsp;${DEV.passiveTreeEditor
            ? 'EDITOR · scroll to zoom · drag empty space to pan'
            : `${m.allocated.size} allocated · click to allocate · scroll to zoom, drag to pan`}</span></h2>
      <svg viewBox="${viewBox}" id="tree-svg" style="cursor:grab;touch-action:none">${edges}${circles}</svg>`;

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
          group.deal === 'sole' ? ' · claims its whole cluster — sibling nodes lock'
          : group.deal === 'first' ? ' · only the first node deals — siblings become plain paths' : ''}</span></div>
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
        + ` — pick ${limit} of ${group.options.length}`
        + (group.unique === 'character' ? ' (each option once per character)' : '')
        + (group.deal === 'sole' ? ' — ONE node of this cluster, ever'
          : group.deal === 'first' ? ' — only the first node taken deals; the rest become plain paths'
          : '');
      if (dealClaimant !== null) {
        const cName = PASSIVE_NODES[dealClaimant]?.name ?? dealClaimant;
        choiceText += group.deal === 'sole'
          ? `<br><span style="color:#e88a8a">cluster claimed at ${cName} — this node can no longer be taken</span>`
          : `<br><span style="color:#8a8678">deal spent at ${cName} — allocates as a plain path (no grant)</span>`;
      }
      for (const oid of chosen) {
        const opt = choiceOptionOf(node, oid);
        if (opt) choiceText += `<br><span style="color:#e6d8ff">✓ ${opt.name}</span> — ${opt.description}`;
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

  /** Open the Caravan band-travel menu (called from main.ts on the dwell callback). */
  showCaravan(): void {
    this.hideAll();
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
    const acc = this.getAccount();
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
      : `<div class="skill-entry"><div class="desc">No other harbors known on any water — set out and sight one.</div></div>`;
    // THE HEARSAY (world.harborHearsay — the omen fabric's far rumors): each
    // row is sailor's talk about something seated out in unknown country,
    // with a CHART for sale that surveys the seat onto the map. Reading is
    // free; knowing where costs.
    const hearsay = world.harborHearsay();
    const hearsayRows = hearsay.length
      ? `<h3 style="margin:12px 0 4px 0">Hearsay at the dock</h3>` + hearsay.map(h => `<div class="skill-entry">
          <div class="desc" style="font-style:italic">“${esc(h.line)}”</div>
          ${h.canChart ? `<div class="bind-btns"><button data-sail-hearsay="${esc(h.id)}"${acc.credits < h.price ? ' disabled' : ''}>Buy chart · ${h.price}</button></div>` : ''}
        </div>`).join('')
      : '';
    const hereSea = world.seaNameOf(world.zone);
    const hereTier = world.zone.portTier === 'haven' ? 'the haven of ' : '';
    this.sailMenu.innerHTML = `<h2>The Harbor${hereSea ? ` — ${esc(hereTier + hereSea)}` : ''}</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">"Every water keeps its harbors, friend — and its harbors keep its secrets."</div>`
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
    const acc = this.getAccount();
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
            <div class="desc">Masons, pitch and pilings — paid now, the walls stand today (besieged still: the defense is yours to win).</div>
            <div class="bind-btns"><button data-hold-restore ${h.canRestore ? '' : 'disabled'}>Restore — ${h.restoreCost} ${META_CURRENCY_LABEL}</button>
              ${!h.canRestore ? `<span class="tags">you carry ${acc.credits}</span>` : ''}</div>
          </div>`
        : `<div class="skill-entry"><div class="desc">The town keeps its own peace — walk in. Defended sieges raise its standing; a lost one burns it.</div></div>`;
    this.holdMenu.innerHTML = `<h2>${esc(h.name)} <span class="tags">· ${esc(h.clsLabel)}</span></h2>`
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
      : `<div class="skill-entry"><div class="desc">The Caravanner has no roads for you yet — return when you've travelled farther.</div></div>`;
    this.caravanMenu.innerHTML = `<h2>The Caravan</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">"I know the safe roads, friend. Name where you're bound and my wagons will see you there — and back again."</div>`
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
        const afford = acc.credits >= cost;
        const vet = o.kind === 'retired';
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
            ${vet ? `<span class="tags" style="color:#b8a0e0">· VETERAN — retired at level ${o.retiredLevel}</span>` : ''}</span></div>
          <div class="desc">${esc(o.blurb)}</div>
          <div class="desc" style="color:#8a9a8a">Fights at your measure (level ${L}) — a blade is fitted to its patron.</div>
          <div class="bind-btns"><button data-merc-hire="${i}" ${full || !afford || blocked ? 'disabled' : ''}>
            Hire — ${cost} ${META_CURRENCY_LABEL}</button>
            ${blocked ? `<span class="tags" style="color:#b8a0e0">${esc(blocked)}</span>`
              : !afford && !full ? `<span class="tags">you carry ${acc.credits}</span>` : ''}</div>
        </div>`;
      }).join('')
      : `<div class="skill-entry"><div class="desc">The sign-board hangs empty — every blade this post will ever deal has been taken.</div></div>`;
    // THE COMPANY: one line per contract (the retinue cap shows when >1 is
    // possible — the Harborwarden's ledger made this a roster, not a slot).
    const contract = company.length
      ? `<div class="skill-entry"><div class="name" style="color:#c8b048">Under contract${cap > 1 ? ` (${company.length}/${cap})` : ''}:
            ${esc(company.map(hm => hm.name).join(', '))}</div>
          <div class="desc">Their hire ends when your run does — however it does.</div>
          <div class="bind-btns">${company.map((hm, i) =>
            `<button data-merc-dismiss="${i}">Dismiss ${esc(hm.name)}</button>`).join(' ')}</div></div>`
      : cap > 1
        ? `<div class="skill-entry"><div class="desc">Your company musters up to ${cap} blades.</div></div>`
        : '';
    const retire = world.canRetireHere()
      ? `<div class="skill-entry" style="border-top:1px solid #3a3644;margin-top:10px;padding-top:10px">
          <div class="name" style="color:#b8a0e0">Retire from the wake</div>
          <div class="desc">End this run here, in good order: the run's ${META_CURRENCY_LABEL} banks as ever,
            no corpse is left and no death is counted — and this character, exactly as built,
            joins the mercenary roster (${acc.mercRoster.length} retired) for future runs to hire.</div>
          <div class="bind-btns"><button data-merc-retire>Retire this character</button></div>
        </div>`
      : '';
    // An officer with its own voice (the recruiter's table) speaks it;
    // otherwise the muster/outpost defaults, derived from the port policy.
    const title = post.title ?? (post.port ? 'The Harbor Muster' : 'The Mercenary Outpost');
    const pitch = post.pitch ?? (post.port
      ? '"Green blades, fair rates, no questions off the boat. The veterans keep to the wilds — so does the retiring."'
      : '"Every blade here has a story. Buy one — or become one."');
    this.mercMenu.innerHTML = `<h2>${esc(title)}</h2>`
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
        + 'joins the mercenary roster — met again wherever an outpost offers them.')) return;
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
      ?? '"Not work this time, traveller — a VOCATION. Finish its trials and the heart of the star opens to you. One calling per lifetime; choose it well."';
    this.vocationMenu.innerHTML = `<h2>A Calling</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">${esc(flavor)}</div>`
      + rows
      + `<div class="desc" style="margin-top:8px;color:#8a8678">Completing a vocation unlocks its trials for EVERY future hero, whatever their class. Vocation points spend only inside its tree${offers.length ? '' : ''} — press P to see the star.</div>`
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
      const fill = known || scouted ? (bi?.mapColor ?? z.theme.accent) : '#26262e';
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
      const travelAttrs = canTravel ? ` class="wp-node" data-wp="${z.id}" style="cursor:pointer"` : '';
      // A FIELD zone renders like any other node: ONE circle, centred on the region (its
      // def.map is the blob centre). The region BOUNDS live on def.field but are NOT drawn —
      // the player understands a Field is a single zone, and the bbox stays available as the
      // Field's spatial "event node" (a stormfront / incursion can later target/show over it).
      nodes += `<g data-zone="${z.id}" style="cursor:help">
        <circle cx="${z.map.x}" cy="${z.map.y}" r="${MAP_CFG.nodeHitR}" fill="none" pointer-events="all"${travelAttrs}/>
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
        nodes += `<g data-zone="${z.id}" style="cursor:help">
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
      <h2>World Map
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
        <svg id="world-map-svg" viewBox="${this.mapViewBox()}" style="cursor:grab;touch-action:none"><g pointer-events="none">${ocean}${simUnder}${edges}${stubs}</g>${nodes}<g pointer-events="none">${markers}${simOver}${cards}</g></svg>
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
        style="font-size:9px;padding:1px 7px;margin:0 3px 0 0;border-radius:8px;cursor:pointer;
        border:1px solid ${off ? '#33333e' : '#4a4a5e'};background:${off ? '#141418' : '#22222e'};
        color:${off ? '#55555e' : '#b8b4a8'};${off ? 'text-decoration:line-through;' : ''}">${esc(l.label)}</button>`;
    }).join('');
    // The WASH slider rides the chip row: one intensity dial over every layer's
    // territory/weather wash (MAP_CFG.wash rails; Settings.mapWash persists).
    const wash = this.getSettings().mapWash;
    const washUi = `<span style="margin-left:10px;white-space:nowrap">wash
      <input id="map-wash-mul" type="range" min="${MAP_CFG.wash.min}" max="${MAP_CFG.wash.max}"
        step="${MAP_CFG.wash.step}" value="${wash}" style="width:76px;vertical-align:middle"
        title="Territory/weather wash intensity — crank it to read a warfront's exact reach and gradient; 1× is the authored look. Badges and markers never scale.">
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
        const sub = e.ready ? '✓ objective done — return to the giver to claim' : (e.target ? `target: ${esc(e.target)}` : 'in progress');
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
      <h2>Quest Journal</h2>
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
      const label = bossName ? `${or.read} — ${bossName}` : or.read;
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
      + `<div class="zi-hint">${zoneId === world.zone.id ? 'you are here' : pinned ? 'pinned' : scouted ? 'scouted from afar — unwalked' : 'hovering'}</div>`
      + (chips.length ? `<div class="zi-chips">${chips.join('')}</div>` : '');

    const entries = zoneInfoFor(world, zoneId);
    if (entries.length === 0) {
      const msg = charted ? 'Nothing of note here.'
        : scouted ? 'Scouted from afar — walk its ground to learn more.'
          : 'Uncharted — explore to reveal.';
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

  showDeath(creditsEarned: number, onRestart: () => void): void {
    this.hideAll();
    const world = this.getWorld();
    const acc = this.getAccount();
    // RETIREMENT is the death flow wearing its good clothes: same tithe, same
    // account banking — but the character walked, and the copy says so.
    const retired = world.runEndReason === 'retire';
    const title = retired ? 'RETIRED FROM THE WAKE' : 'YOU HAVE DIED';
    const deed = retired
      ? `hangs up the blade at ${world.zone.name} — and joins the mercenary roster (${acc.mercRoster.length} retired)`
      : `fell in ${world.zone.name}`;
    const who = world.meta.name !== world.meta.classDef.name ? `${world.meta.name} — ` : '';
    this.deathScreen.innerHTML = `
      <h1>${title}</h1>
      <div>${who}Level ${world.player.level} ${world.meta.classDef.name}
        &nbsp;·&nbsp; ${deed} &nbsp;·&nbsp;
        ${world.visited.size} zones explored &nbsp;·&nbsp; ${world.kills} kills</div>
      ${retired ? `<div style="margin-top:6px;color:#b8a0e0">Some future run will find them at an outpost, sword-arm for hire.</div>` : ''}
      <div style="margin:14px 0;color:var(--gold);font-weight:bold">
        <span id="death-run-ess">+${creditsEarned}</span> ${META_CURRENCY_LABEL} of the run
        &nbsp;·&nbsp; Account Level ${acc.level} &nbsp;·&nbsp;
        <span id="death-pool-ess">${acc.credits - creditsEarned}</span> ${META_CURRENCY_LABEL}</div>
      <button id="unlocks-btn">Unlocks</button>
      <button id="restart-btn">${retired ? 'Onward' : 'Rise Again'}</button>`;
    this.deathScreen.classList.remove('hidden');

    // THE DUMP: the run's Mortal Essence visibly DRAINS into the account
    // pool — an eased transfer with a scrambling tail, landing on the exact
    // banked totals (applyCredits already ran; this is pure theater). The
    // interval self-heals: it dies the moment its spans leave the DOM.
    const runEl = document.getElementById('death-run-ess');
    const poolEl = document.getElementById('death-pool-ess');
    if (runEl && poolEl && creditsEarned > 0) {
      const poolStart = acc.credits - creditsEarned;
      const dur = 1400;
      const start = performance.now();
      const timer = window.setInterval(() => {
        if (!runEl.isConnected) { window.clearInterval(timer); return; }
        const t = Math.min(1, (performance.now() - start) / dur);
        const ease = 1 - Math.pow(1 - t, 3);
        const moved = Math.round(creditsEarned * ease);
        // A flicker of un-settled digits while essence is mid-flight.
        const jitter = t < 1 && moved < creditsEarned ? (Math.random() < 0.5 ? 1 : 0) : 0;
        runEl.textContent = `+${creditsEarned - moved}`;
        poolEl.textContent = `${poolStart + moved - jitter}`;
        if (t >= 1) {
          window.clearInterval(timer);
          runEl.textContent = '+0';
          poolEl.textContent = `${acc.credits}`;
          poolEl.animate(
            [{ textShadow: '0 0 18px var(--gold)', color: '#ffe9a8' }, { textShadow: 'none' }],
            { duration: 600 },
          );
        }
      }, 40);
    }

    document.getElementById('unlocks-btn')!.addEventListener('click',
      () => this.showAccountScreen(() => this.showDeath(creditsEarned, onRestart)));
    document.getElementById('restart-btn')!.addEventListener('click', () => {
      this.deathScreen.classList.add('hidden');
      onRestart();
    });
  }

  // ------------------------------------------------------------ escape menu

  /** The in-run pause menu (Escape): resume, remap keys, end the run, or close.
   *  While it's open `escapeMenuOpen` is true, gameplay input is paused —
   *  and the WORLD ITSELF holds still: the 'menu:escape' timeflow surface
   *  (TIME_CFG.surfaces) freezes the sim while the menu is up. The engine's
   *  allowHold policy (wired in main.ts) refuses the hold in live co-op —
   *  a shared world is never one player's to stop. */
  showEscapeMenu(): void {
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
          ? '<button id="esc-couch">Local Co-op — Player Joins</button>'
          : `<button id="esc-couch" disabled>Local Co-op — press any button on ${needPads > 1 ? 'a 2nd controller' : 'a controller'}</button>`;
      const couchLeaveRow = this.onCouchLeave && couchSeated > 0
        ? '<button id="esc-couch-leave">Local Co-op — Guest Leaves</button>' : '';
      root.innerHTML = `
        <h1>Paused</h1>
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
        if (window.confirm(`End this run and bank your ${META_CURRENCY_LABEL}? Your character will be lost (permadeath).`)) {
          this.hideEscapeMenu();
          this.getWorld().endRun();   // reuses the death → credits → permadeath flow
        }
      });
      document.getElementById('esc-close')!.addEventListener('click', () => {
        try { window.close(); } catch { /* browsers block closing non-script-opened tabs */ }
        root.innerHTML = `
          <h1>Progress Saved</h1>
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
        <button id="opt-invertmove" title="Up walks down, left walks right — movement keys and the move stick alike (Swap Sticks trades WHICH stick moves; this flips WHICH WAY movement goes). Fair warning: the widdershins hex inverts controls too, so wearing it while this is ON plays standard for the duration — two turns make a true.">${s.invertMove ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Improvised Strike (empty slots swing)</span>
        <button id="opt-improvised" title="Pressing an EMPTY bar slot swings a fixed, gemless improvised strike — the floor no kit falls beneath. Turn OFF to make empty slots dead keys (a stray press mid-dodge costs the swing's half-second; the risk budget is yours).">${s.improvisedStrike ? 'ON' : 'OFF'}</button>
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
        <button id="opt-assistmode" title="${AIM_ASSIST_MODES.map(m => `${m.name} — ${m.blurb}`).join('\n')}">${(AIM_ASSIST_MODES.find(m => m.id === s.pad.assistMode) ?? AIM_ASSIST_MODES[0]).name}</button>
      </div>
      <div class="rebind-row">
        <span>Swap Sticks (southpaw)</span>
        <button id="opt-swapsticks">${s.pad.swapSticks ? 'ON' : 'OFF'}</button>
      </div>`;
    const interfaceTabHead = `
      <div class="rebind-row">
        <span>UI Scale</span>
        <span class="pad-opt"><input type="range" id="opt-uiscale" min="${Math.round(UI_SCALE_CFG.min * 100)}" max="${Math.round(UI_SCALE_CFG.max * 100)}" step="${Math.round(UI_SCALE_CFG.step * 100)}"
          value="${Math.round(s.uiScale * 100)}"
          title="Grows the whole interface together — panels, tooltips, popups, and the on-screen HUD — so text stays readable at any eyesight. World text (damage numbers, nameplates) keeps battlefield scale."> <b id="val-uiscale">${Math.round(s.uiScale * 100)}%</b></span>
      </div>
      <div class="rebind-row">
        <span>Map Zone Names</span>
        <button id="opt-maplabels" title="How the world map wears its name cards:
${MAP_LABEL_MODES.map(m => `${m.name} — ${m.blurb}`).join('\n')}
Towns keep their card in every mode, and cards never block a waypoint's click.">${(MAP_LABEL_MODES.find(m => m.id === s.mapLabels) ?? MAP_LABEL_MODES[0]).name}</button>
      </div>
      <div class="rebind-row">
        <span>Reawaken After Quit</span>
        <button id="opt-resume" title="Where a relaunched save wakes:
WHERE YOU STOOD — the exact spot, situation, and wounds the save captured (quitting out of trouble hands the trouble back)
IN LASTLIGHT — the sanctuary; the world stays explored, only you walk home
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
SMART — around a recent change, or while dented on builds where the pool carries real weight (default)
ON CHANGE — strictly around a recent change to the pool
ALWAYS — pinned on (the min-maxer's steady readout)">${{
          smart: 'SMART', recent: 'ON CHANGE', always: 'ALWAYS',
        }[s.poolBars]}</button>
      </div>
      <h1>Cursor</h1>
      <div class="acct-head">One identity for the mouse cursor and the pad's aim reticle —
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
      </div>`;
    const visualsTab = `
      <div class="rebind-row">
        <span>Line-of-Sight Shade</span>
        <span class="pad-opt"><input type="range" id="opt-veildark" min="0" max="100" step="5"
          value="${Math.round(s.veilDarkness * 100)}"
          title="How dark the sight veil paints what your hero cannot see — walls, trunks and roofs throw the same shadow shapes at any setting, and hidden nameplates dim with the pixels. 100% is the authored night; dim it to admire what the world builds atop its structures (spire gardens, canopy work). Purely visual: enemy eyes read the engine's own sightline, never this slider."> <b id="val-veildark">${s.veilDarkness <= 0 ? 'LIFTED' : `${Math.round(s.veilDarkness * 100)}%`}</b></span>
      </div>
      <div class="rebind-row">
        <span>Camera</span>
        <button id="opt-cameramode" title="${CAMERA_MODES.map(m => `${m.name} — ${m.blurb}`).join('\n')}">${cameraModeOf(s.cameraMode).name}</button>
      </div>
      <div class="rebind-row">
        <span>Low-Life Screen Pulse</span>
        <button id="opt-lowlife" title="Blood seeps in at the screen edge while life is low, pressing inward on a slow heartbeat at the last sliver. OFF: only the struck-while-low surge shows (the sane pick for 1/1-life or heavy-reservation builds).">${s.lowLifePulse ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Faintness Frame-Falter</span>
        <button id="opt-falter" title="While light-headed (faintness / a swoon), the picture itself deliberately skips — brief, simulated lag spikes, on purpose: your hero's head is going light, so your frames seem to. The game underneath never stutters (movement, casts and co-op keep running at full rate). OFF for comfort or motion sensitivity; the grey pall still shows.">${s.statusFalter ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Foresight (enemy cast markers)</span>
        <button id="opt-foresight">${s.castTelegraphs ? 'ON' : 'OFF'}</button>
      </div>`;
    root.innerHTML = `
      <h1>Options</h1>
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
  ): void {
    this.hideAll();
    this.startHandlers = { onStart, onContinue, onCoop, onRoster };
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
      const badge = stageOf(e.modeId, e.stage).badge ?? mode.name.toUpperCase();
      return `
        <div style="display:flex;gap:6px">
          <button class="sm-roster-go" data-cid="${e.charId}" style="flex:1 1 auto;text-align:left">
            ⟢ ${e.name} — Level ${e.level}
            <span style="font-size:10px;color:${mode.color};border:1px solid ${mode.color};
              border-radius:6px;padding:0 5px;margin-left:6px">${badge}</span></button>
          <button class="sm-roster-del" data-cid="${e.charId}" style="flex:0 0 auto"
            title="Release this vessel — the character is permanently discarded">✕</button>
        </div>`;
    }).join('');
    this.startMenu.innerHTML = `
      <h1>${GAME_TITLE.toUpperCase()}</h1>
      <div class="acct-head">Account Level <b>${acc.level}</b> · <b>${acc.credits}</b> ${META_CURRENCY_LABEL}</div>
      <div class="esc-btns">
        <button id="sm-start">Start New Game</button>
        <button id="sm-continue" ${canContinue ? '' : 'disabled'}>${canContinue ? 'Continue' : 'No Save Found'}</button>
        ${rosterRows}
        <button id="sm-vault">Vault (Unlocks)</button>
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
        wipeRosterSlot(e.slot);  // durable — the slot must not resurrect on next boot
        this.saveAccount();
        this.renderStartMenu();
      });
    });
    document.getElementById('sm-vault')!.addEventListener('click', () =>
      this.showAccountScreen(() => this.showStartMenu(h.onStart, h.onContinue, h.onCoop, h.onRoster)));
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

    // META-META: the global event-frequency crank (level-100 unlock). One slider
    // drives RATE + CONCURRENCY together (the "festival" regime the player chose);
    // SEVERITY is preserved untouched (a future lever / dev knob). Run-locked into
    // the manifest on the next run, exactly like the package mix.
    const tempoOwned = featureEnabled(acc, FEATURE.GLOBAL_FREQUENCY);
    let tempo = clampN(acc.frequencyProfile?.rate ?? 1, 0.25, 3);
    const tempoHtml = (): string => {
      if (!tempoOwned) return '';
      return `<div class="exped-tempo">
        <div class="mix-label">World Tempo — global event frequency
          <span style="color:var(--text-dim);font-weight:normal">· how OFTEN events fire and how MANY run at once, world-wide</span></div>
        <div class="slider-row"><span>Tempo</span>
          <input type="range" min="0.25" max="3" step="0.25" value="${tempo}" id="exped-tempo">
          <span class="sv" id="exped-tempo-v">${Math.round(tempo * 100)}%</span></div>
      </div>`;
    };

    const mixHtml = (): string => {
      // pressureless packages (The Pit) hold no share of the world mix.
      const active = pkgs.filter(p => !p.alwaysOn && !p.pressureless && cfg[p.id].enabled && cfg[p.id].startLevel <= 100);
      if (!active.length) return `<div class="mix-empty">No packages enabled — a calm world.</div>`;
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
          <div class="exped-always">● A place, not an event — no frequency to tune</div>
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
           No world packages unlocked yet. <b>Discover them in play</b> — e.g. reach <b>level 10</b> to find
           <b>Breaches</b>, slay a <b>Crowned</b> champion to command <b>Warbands</b>, or fell a <b>warlord</b>
           for <b>Demon Invasions</b> — then unlock their configuration in the <b>Vault</b>, and they'll appear
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
    document.getElementById('exped-cancel')!.addEventListener('click', () => {
      this.expeditionSetup.classList.add('hidden'); onDone();
    });
    // Save only exists when there's something unlocked to tune (packages or tempo).
    document.getElementById('exped-save')?.addEventListener('click', () => {
      // Persist the choices as the player's default (the next run's manifest is
      // built from these). The run that begins then freezes them in (run-lock).
      for (const p of pkgs) acc.packageDefaults[p.id] = { ...cfg[p.id] };
      // The World Tempo unlock drives rate + concurrency together; severity is
      // left as-is (the future lever / dev knob preserves any value it set).
      if (tempoOwned) {
        acc.frequencyProfile = { rate: tempo, concurrency: tempo, severity: acc.frequencyProfile?.severity ?? 1 };
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
    this.oracleOpen = false;
    this.oracleTargetUid = null;
    this.oracleMenu.classList.add('hidden');
    this.vendorOpen = false;
    this.scrapMode = false;
    this.vendorMenu.style.cursor = '';
    this.vendorMenu.classList.add('hidden');
    this.boroughOpen = false;
    this.boroughFolkId = -1;
    this.boroughMenu.classList.add('hidden');
    delete this.boroughMenu.dataset.drop;
    this.treeOpen = false;
    this.closeChoicePopup();
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
