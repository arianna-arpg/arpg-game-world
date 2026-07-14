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
import { SKILLS } from '../data/skills';
import {
  BESTIARY_CFG, bestiaryKills, bestiaryList, bestiaryReveals,
  bestiaryThreshold, bestiaryTotals, spectreAttunable,
} from '../data/bestiary';
import { dndCancel, registerDragSource, registerDropTarget } from './dnd';
import { MONSTERS, type MonsterDef } from '../data/monsters';
import { CLASSES, type ClassDef } from '../data/classes';
import { classStartNode, PASSIVE_ADJACENCY, PASSIVE_NODES, vocationGateNodeId, vocationGateOpen, type PassiveNode } from '../data/passives';
import { PASSIVE_CHOICE_CFG, choiceGroupOf, choiceLockReason, choiceOptionOf, choicePickLimit, chosenOf, graftSourcesOf, nodeChoiceOpen } from '../data/passiveChoices';
import { MAIN_REALM, PASSIVE_REALMS, openRealms, realmIdOf, realmOf, realmOpen } from '../data/passiveRealms';
import { SUPPORTS } from '../data/supports';
import { VOCATIONS, vocationRootId } from '../data/vocations';
import { BIOMES, biomeOf } from '../world/biomes';
import { boundaryGateOf } from '../data/boundaryGates';
import { dimensionDef } from '../world/dimensions';
import { collectMarkers } from '../world/mapMarkers';
import { zoneInfoFor, type ZoneInfoEntry } from '../world/zoneInfo';
import type { World } from '../engine/world';
import { featureEnabled, FEATURE, isClassUnlocked, META_CURRENCY_LABEL, selectableSlotCount, type Account } from '../meta/account';
import { allUnlockables, applyUnlock, availableUnlocks, classUnlockFor, isUnlockOwned } from '../meta/unlocks';
import {
  ACTION_IDS, ACTION_LABELS, keyDisplay, PAD_ACTION_IDS, PAD_ACTION_LABELS,
  type ActionId, type PadActionId, type Settings,
} from '../meta/settings';
import { PAD_CFG, padDisplay, AIM_ASSIST_MODES } from '../core/gamepad';
import { wipeRosterSlot, type CharacterSave } from '../meta/character';
import {
  availableModes, DEFAULT_MODE_ID, modeById, rosterCapacity, rosterOf, stageOf,
  type RosterEntry,
} from '../meta/modes';
import { bound, defaultEnabledFor } from '../packages/manifest';
import { isConfigured, PACKAGES } from '../packages/registry';
import type { ContentPackage } from '../packages/types';
import { QUEST_CATEGORY_COLORS, type QuestCategory } from '../quests/types';
import type { ZoneDef } from '../data/zones';
import { esc } from './dom';
import { bindTooltips, hideTooltip, type TooltipContent } from './tooltip';
import { runRuneMinigame, runSmithMinigame } from './minigames';
import { VENDORS } from '../data/vendors';
import { oracleRerollCost } from '../data/essences';
import { ITEM_AFFIXES } from '../data/itemaffixes';
import { formatModLine, lerpRange, roundStatValue } from '../engine/items';
import { attachPanZoom, clampZoom, PANZOOM_DEFAULTS } from './panzoom';
import { applyCursor, CURSOR_COLORS, CURSOR_STYLES } from '../core/cursor';
import { AIM_TICK_STYLES } from '../render/vis/aimtick';

/** Neutral accent for packages that declare no colour of their own. */
const PKG_FALLBACK_COLOR = '#888';

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

/** Stats worth showing on the sheet, in display order. */
const SHEET_STATS = [
  'life', 'lifeRegen', 'lifeRegenPct', 'mana', 'manaRegen', 'manaRegenPct', 'moveSpeed',
  'attackSpeed', 'castSpeed', 'accuracy', 'evasion', 'armor',
  'poise', 'poiseDR', 'poiseRegenPct', 'insight', 'insightDR', 'endurance', 'enduranceDR', 'weight',
  'blockChance', 'blockPower', 'guardStrength', 'energyShield', 'esRechargeRate', 'esDotResist', 'manaShield',
  'critChance', 'critMulti',
  'fireRes', 'coldRes', 'lightningRes', 'chaosRes',
  'aoeRadius', 'effectDuration', 'cooldownRecovery',
  'minionDamage', 'minionLife',
];

/** Resistance rows display the EFFECTIVE (soft/hard-capped) value, with the
 *  raw overcap alongside when it exceeds the cap (shred insurance). */
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
  private vocationMenu = document.getElementById('vocation-menu')!;
  private mercMenu = document.getElementById('merc-menu')!;
  private deathScreen = document.getElementById('death-screen')!;
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
   *  the deal INPUTS (hand size + unlocked-class pool) so buying a Class Slot
   *  OR a Class bundle mid-offer re-deals; menu navigation keeps the hand. */
  private classRoster: {
    picks: ClassDef[];
    teasers: { def: ClassDef; reason: 'slots' | 'class' }[];
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
  inventoryOpen = false;
  /** The essence SATCHEL flap on the inventory panel (persists across
   *  re-renders — a satchel stays however you left it). */
  private satchelOpen = false;
  /** The BUILD flap on the gear tab: the learned-skills list riding the
   *  left edge of the inventory — the whole build in one glance. Remembers
   *  its state across panel closes, satchel-style. */
  private buildFlapOpen = false;
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
  /** A minigame overlay is running — the panels beneath hold still. */
  private minigameActive = false;
  sailOpen = false;
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
      el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext)
        : el.dataset.tip === 'skill' ? this.skillTooltip(el.dataset.skillId!)
        : el.dataset.tip === 'vestige' ? this.vestigeTooltip(el.dataset.vestigeId!) : null,
    { extend: true });
    bindTooltips(this.salvageMenu, (el, ext) => el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext) : null, { extend: true });
    bindTooltips(this.oracleMenu, (el, ext) => el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext) : null, { extend: true });
    bindTooltips(this.vendorMenu, (el, ext) => el.dataset.tip === 'item' ? this.itemTooltip(Number(el.dataset.itemUid), ext) : null, { extend: true });
    bindTooltips(this.classSelect, (el) => el.dataset.tip === 'cskill' ? this.classSkillTooltip(el.dataset.skillId!) : null);
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

  /** Resolve a gearItem payload's live item (bag or doll — never stale). */
  private payloadGear(p: { arg: string }): ItemInstance | undefined {
    const m = this.getWorld().meta;
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
    for (const inst of this.getWorld().meta.knownSkills.values()) {
      const d = inst.def.delivery;
      if (d.type === 'summon' && d.grimoire) out.push(inst);
    }
    return out;
  }

  /** Tooltip for the class label in the character sheet. */
  private classTooltip(): TooltipContent {
    const c = this.getWorld().meta.classDef;
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
      description: def.desc ?? 'No notes on this one yet.',
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
    const inst = this.getWorld().meta.knownSkills.get(id);
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

  /** The essence-pay Level Up button (skills + supports share the curve). */
  private essLevelBtn(attr: string, level: number, atMax: boolean): string {
    const cost = skillLevelEssenceCost(level + 1);
    const afford = this.getWorld().canAffordEssence(this.getWorld().localSeat, cost);
    return `<button ${attr} ${!afford || atMax ? 'disabled' : ''}
      title="Level up by spending ${cost.count}× ${ESSENCES[cost.essence].label}">
      Level Up (${this.essCostText(cost)})</button>`;
  }

  /** The seat's essence wallet as colored chips (sheet + station headers). */
  private essWallet(): string {
    const m = this.getWorld().meta;
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
      || this.caravanOpen || this.mercOpen || this.salvageOpen
      || this.oracleOpen || this.vendorOpen || this.sailOpen || this.vocationOpen
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
    const kb = this.getSettings().keybinds;
    const k = (a: ActionId): string => esc(keyDisplay(kb[a]));
    const move = (['moveUp', 'moveLeft', 'moveDown', 'moveRight'] as const).map(k).join('');
    const slots = (['skillSlot2', 'skillSlot3', 'skillSlot4', 'skillSlot5', 'skillSlot6', 'skillSlot7'] as const).map(k).join('/');
    el.innerHTML = `[${move}] move &nbsp; [LMB/RMB/${slots}] skills &nbsp; [${k('panelChar')}] character &nbsp; `
      + `[${k('panelInv')}] inventory &nbsp; `
      + (this.getSettings().gearPickup === 'key' ? `[${k('pickup')}] pick up &nbsp; ` : '')
      + `[${k('panelTree')}] passive tree &nbsp; [${k('panelMap')}] world map &nbsp; [Esc] menu`;
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
    const lockedClasses = CLASSES.filter(c => !isClassUnlocked(acc, c.id));
    // Roguelike roll: shuffle the pool, surface the hand plus a few locked
    // TEASERS. Rolled ONCE per new-run offer + CACHED, so menu navigation
    // (Vault / Event Weights / Back) keeps the same offer; only a death
    // (resetClassRoster) deals a fresh hand — OR a mid-offer Vault purchase
    // that changes the deal inputs (a Class Slot widens the hand, a Class
    // bundle deepens the pool), which re-deals so the purchase shows.
    const dealtFor = `${selectable}|${pool.map(c => c.id).join(',')}`;
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
      // (more Class Slots surface those), then locked classes (their Class
      // bundle in the Vault does) — each card names its remedy.
      const teasers = [
        ...shuffled.slice(picks.length).map(def => ({ def, reason: 'slots' as const })),
        ...shuffle([...lockedClasses]).map(def => ({ def, reason: 'class' as const })),
      ].slice(0, TEASER_COUNT);
      this.classRoster = { picks, teasers, dealtFor };
    }
    const { picks, teasers } = this.classRoster;

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
        hand of ${picks.length} &nbsp;·&nbsp; ${pool.length} of ${CLASSES.length} classes unlocked &nbsp;(re-deals each new run)</div>
      <div class="subtitle">
        A random hand is dealt each run from the classes your account has unlocked.
        Class Slots widen the hand; Class unlocks (each bundling its thematic gems)
        deepen the pool — and every class you realize opens its Vocation.
        Classes are only starting points; the tree and every skill stay open to any build.
        Pick a class to begin; tune the world mix under Event Weights first if you like.
      </div>
      ${modeRow}
      <div class="class-grid">${picks.map(c => classCard(c)).join('')}${teasers.map(t => classCard(t.def, lockNote(t))).join('')}</div>
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
            const afford = acc.credits >= u.cost;
            return `
            <div class="unlock-card">
              <div class="ukind">${u.kind}${u.reqLevel ? ` · req acct lv ${u.reqLevel}` : ''}</div>
              <div class="uname">${u.label}</div>
              <div class="udesc">${u.description}</div>
              <button data-unlock="${u.id}" ${afford ? '' : 'disabled'}>Unlock — ${u.cost}</button>
            </div>`;
          }).join('');
      const ownedCards = owned.map(u => `
            <div class="unlock-card uowned">
              <div class="ukind">${u.kind}</div>
              <div class="uname">${u.label}</div>
              <div class="udesc">${u.description}</div>
              <button disabled>✓ Owned</button>
            </div>`).join('');
      this.accountScreen.innerHTML = `
        <div class="vault-head">
          <h1>The Vault — Account Unlocks</h1>
          <div class="acct-head">Account Level <b>${acc.level}</b> &nbsp;·&nbsp;
            <b>${acc.credits}</b> ${META_CURRENCY_LABEL} &nbsp;·&nbsp; ${acc.lifetimeCredits} lifetime</div>
        </div>
        <div class="vault-body">
          <h3 class="vault-sub">Available</h3>
          <div class="unlock-grid">${cards}</div>
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

  // --------------------------------------------------------- character sheet

  toggleCharSheet(): void {
    this.charSheetOpen = !this.charSheetOpen;
    this.charSheet.classList.toggle('hidden', !this.charSheetOpen);
    if (this.charSheetOpen) this.refreshCharSheet();
    else hideTooltip();
  }

  refreshCharSheet(): void {
    if (!this.charSheetOpen) return;
    const world = this.getWorld();
    const p = world.player;
    const m = world.meta;

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

    const statRows = SHEET_STATS.map(id => {
      const def = STAT_DEFS[id];
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
    }).join('');

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
    this.charSheet.innerHTML = `
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
      <h3>Statistics</h3>
      ${statRows}
      <div style="margin-top:8px;color:#8a8678;font-size:10px">
        Tag-scaled stats (damage, speed) shown without skill context — each skill
        applies its own tags, level, and socketed supports on use.
      </div>`;
    this.charSheet.querySelectorAll<HTMLButtonElement>('button[data-reacquire]').forEach(btn =>
      btn.addEventListener('click', () => {
        world.requestMeta({ t: 'reacquireSkill', skillId: btn.dataset.reacquire! });
        this.refreshCharSheet();
      }));
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
    const m = world.meta;
    if (kind === 'gems') {
      return m.inventory.map((gem, idx) => {
        // Crew-aware targets: a gem may board a summon skill purely for what
        // the minted minions cast — mark those so the player knows the
        // payload rides the crew, and name the skills it boards.
        const targets = [...m.knownSkills.values()]
          .filter(inst => inst.sockets.includes(null)
            && supportFitsInstOrCrew(gem.def, inst, world.summonCrewSkills(inst)))
          .map(inst => {
            if (supportFitsInst(gem.def, inst)) {
              return `<button data-socket="${idx}:${inst.def.id}">${inst.def.name}</button>`;
            }
            const served = crewSkillsServed(gem.def, inst, world.summonCrewSkills(inst));
            const boards = served === 'unknowable' || served === null
              ? 'whatever you raise'
              : served.map(def => def.name).join(', ');
            const doorNote = crewBoardingOpen(inst) ? ''
              : ' Dormant until Resonance rides this skill.';
            return `<button data-socket="${idx}:${inst.def.id}"
              title="Boards the crew: forwarded to the minions' own skills (${boards}).${doorNote}">${inst.def.name} ⤳</button>`;
          })
          .join('') || '<span style="color:#8a8678">no socketable skill</span>';
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
              Socket into: ${targets}
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

  toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen;
    this.inventory.classList.toggle('hidden', !this.inventoryOpen);
    if (this.inventoryOpen) this.refreshInventory();
    else { dndCancel(); hideTooltip(); } // a ghost never outlives its surface
  }

  /** An item anywhere on this seat — bag or doll (tooltips serve both). */
  private findItem(uid: number): ItemInstance | undefined {
    const w = this.getWorld();
    const m = w.meta;
    return m.items.find(i => i.uid === uid)
      ?? Object.values(m.equipped).find(i => i?.uid === uid)
      // Brandt's shelf: counter gear carries the same rich tooltip (and the
      // on-swap comparison against what you wear) BEFORE you buy it.
      ?? w.vendorStock.flatMap(e => (e.kind === 'item' ? [e.item] : [])).find(i => i.uid === uid);
  }

  /** The candidate slots an UNWORN item could swap into that hold something
   *  today — the comparison targets. Worn items (and empty targets) compare
   *  against nothing: the plain card already reads as the whole story. */
  private compareTargets(item: ItemInstance): { label: string; worn: ItemInstance }[] {
    const m = this.getWorld().meta;
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
  private compareHtml(item: ItemInstance): string | null {
    const targets = this.compareTargets(item);
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
  private itemTooltip(uid: number, extended?: boolean): TooltipContent | null {
    const item = this.findItem(uid);
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
      const cmp = this.compareHtml(item);
      if (cmp) lines.push(cmp);
    } else if (this.compareTargets(item).length) {
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
    const m = this.getWorld().meta;
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
    const drawerHandle = `
      <button data-buildflap title="Your learned skills — the whole build, full management"
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
      `<button class="book-tab ${this.invTab === id ? 'active' : ''}" data-invtab="${id}">${label}</button>`;
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

  showSalvage(): void {
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
    const m = world.meta;
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
      body = `<div style="margin-bottom:6px">${this.essWallet()}</div>
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
        const affordChisel = world.canAffordEssence(world.localSeat, CRAFT_CFG.socketCost);
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
            const afford = world.canAffordEssence(world.localSeat, cost);
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
      body = `<div style="margin-bottom:6px">${this.essWallet()}</div>
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

  showBestiary(): void {
    this.bestiaryOpen = true;
    this.bestiaryMenu.classList.remove('hidden');
    this.refreshBestiary();
  }

  closeBestiary(): void {
    this.bestiaryOpen = false;
    this.bestiaryMenu.classList.add('hidden');
    dndCancel(); // never strand a lifted page on a closed book
    hideTooltip();
  }

  /** A kind's little portrait: its silhouette LANGUAGE (shape + color), as
   *  inline SVG — no renderer round-trip, readable at 22px, and any new
   *  ActorShape falls back to the circle rather than breaking the book. */
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
        ${this.monsterGlyph(def, dark)}
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
      detail = `<div style="border:1px solid #3a3a52;border-radius:4px;padding:8px;margin-top:8px;background:rgba(20,20,30,0.5)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">${this.monsterGlyph(def, false)}
          <b>${def.name}</b>${def.boss ? ' <span style="color:#e64db4;font-size:10px">BOSS</span>' : ''}</div>
        ${body}</div>`;
    }

    // The RELEASE counter: bonded companions present themselves at the fire
    // (the only place a bond may be undone — the whistle never unbinds).
    const world = this.getWorld();
    const companions = world.actors.filter(a => a.companion && !a.dead && a.owner === world.player);
    const release = companions.length ? `
      <div style="border-top:1px solid #2a2a3a;margin-top:8px;padding-top:6px">
        <div style="color:#a8c87a;font-size:11px;margin-bottom:4px">Bonded companions</div>
        ${companions.map(c => `<div class="bind-btns" style="margin:2px 0">
          <span style="font-size:11px">${c.name}${c.downed ? ' <span style="color:#e8a860">(down)</span>' : ''} — Lv ${c.level}</span>
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
              ? `${this.monsterGlyph(form, false)} <span style="color:#a8d8a0">${form.name}</span>
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
  }

  // ------------------------------------------------------------ oracle stone

  showOracle(): void {
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
    const m = world.meta;
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

  showVendor(): void {
    this.vendorOpen = true;
    this.vendorMenu.classList.remove('hidden');
    this.refreshVendor();
  }

  closeVendor(): void {
    this.vendorOpen = false;
    this.scrapMode = false;
    this.vendorMenu.style.cursor = '';
    this.vendorMenu.classList.add('hidden');
    hideTooltip();
  }

  /** The player's things as scrap-wheel targets — the SELL lane. Prices are
   *  the sell yields (everything converts to COARSE by quality × rarity
   *  rate); the bench's break yields live on the station screen instead. */
  private scrapListHtml(): string {
    const m = this.getWorld().meta;
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

  refreshVendor(): void {
    if (!this.vendorOpen) return;
    const world = this.getWorld();
    const near = VENDORS.filter(v => v.near(world, world.localSeat));

    const sections = near.map(v => {
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
          ? price.essences.every(c => world.canAffordEssence(world.localSeat, c))
          : world.descentEchoes >= (price.echoes ?? 0);
        const priceHtml = price.essences
          ? price.essences.map(c => this.essCostText(c)).join(' + ')
          : `${price.echoes} ◈`;
        return `
          <div class="skill-entry" style="border-left:3px solid ${col}"${tipAttrs}>
            <div class="name" style="${e.kind === 'item' ? `color:${col}` : ''}">${name} ${lvHtml} ${tag}</div>
            <div class="tags">${tags}</div>
            <div class="bind-btns">
              <button data-vbuy="${v.id}:${idx}" ${afford ? '' : 'disabled'}>
                Buy (${priceHtml})${afford ? '' : ' — not enough'}</button>
            </div>
          </div>`;
      }).join('') || '<div style="color:#8a8678;font-size:11px">Sold out — come back after the restock.</div>';

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

      return `
        <div style="border:1px solid ${v.accent}44;border-radius:4px;padding:8px;margin-bottom:10px;background:${v.bg}">
          <div style="color:${v.accent};font-weight:bold;font-size:12px;margin-bottom:4px">
            ${v.label}${v.headline ? ` <span style="opacity:0.7;font-size:10px;font-weight:normal">· ${v.headline(world)}</span>` : ''}</div>
          ${rows}
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
      if (vendor.buyT === 'buyVendor') world.requestMeta({ t: 'buyVendor', index: Number(idx) });
      else world.requestMeta({ t: 'buyDelver', index: Number(idx) });
      refresh();
    }));
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
    const p = world.player;
    const m = world.meta;
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
    const graftBank = graftSources.length ? `
      <div class="graft-bank">
        <span style="color:#b8a2e8;font-size:10px">Grafts${this.liftedGraftKey ? ' — click a skill to bind' : ''}:</span>
        ${bankChips}
      </div>` : '';
    return graftBank + [...m.knownSkills.values()].map(inst => {
      const def = inst.def;
      const maxLv = skillMaxLevel(def);
      const binds = this.slotLabels().map((label, slot) => {
        const bound = p.skills[slot]?.def.id === def.id;
        return `<button data-bind="${def.id}" data-slot="${slot}"
          class="${bound ? 'bound' : ''}">${label}</button>`;
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
            ${!this.getWorld().canAffordEssence(this.getWorld().localSeat, skillLevelEssenceCost(s.level + 1)) || s.level >= supportMaxLevel(s.def) ? 'disabled' : ''}
            title="Level up for ${skillLevelEssenceCost(s.level + 1).count}× ${ESSENCES[skillLevelEssenceCost(s.level + 1).essence].label}">+${ESSENCES[skillLevelEssenceCost(s.level + 1).essence].glyph}</button>
          <button data-unsocket="${def.id}:${i}">✕</button>
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
              ${this.monsterGlyph(form, false)} ${form.name}</span>`
          : `<span style="color:#8a8678">unattuned — reads corpses</span>`;
        grimoire = `<div style="margin-top:3px;font-size:10px">
          <span style="color:#a8d8a0">Grimoire:</span> ${chip}
          <span style="color:#6a6478">— binds at the Tracker's book</span></div>`;
      }
      // Grafts riding THIS skill (chips mirror sockets; ✕ unbinds) + the
      // landing button while a lifted graft is looking for its carrier.
      const graftRow = (inst.grafts?.length || this.liftedGraftKey) ? `
        <div class="grafts" style="margin-top:2px">
          ${(inst.grafts ?? []).map(g => {
            const src = graftSources.find(s => m.grafts[s.key] === def.id && SUPPORTS[s.graft.support] === g.def);
            return `<span class="gem-chip graft-chip" style="border-color:${g.def.color ?? '#b8a2e8'}"
              title="${g.def.description} — grafted by ${src?.name ?? 'a passive power'}; no socket spent.">
              ✦ ${g.def.name} <b>L${g.level}</b>${src ? `<button data-graft-unbind="${src.key}">✕</button>` : ''}</span>`;
          }).join('')}
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
            <button data-unlearn="${def.id}">Unlearn</button>
          </div>
          <div class="sockets">${sockets}</div>
          ${graftRow}
          ${grimoire}
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

  toggleTree(): void {
    this.treeOpen = !this.treeOpen;
    this.closeChoicePopup(); // a popup never outlives its panel
    this.passiveTree.classList.toggle('hidden', !this.treeOpen);
    if (this.treeOpen) {
      this.centerTreeOnStart();
      this.refreshTree();
    }
  }

  /** Fit box over the ACTIVE REALM's nodes (+padding) — the zoom/pan
   *  reference frame. Each realm tab auto-fits its own constellation. */
  private computeTreeBox(): void {
    const allNodes = Object.values(PASSIVE_NODES).filter(n => realmIdOf(n) === this.treeRealm);
    if (!allNodes.length) { this.treeBox = { minX: 0, minY: 0, w: 1000, h: 1000 }; return; }
    const PAD = 45;
    const bMinX = Math.min(...allNodes.map(n => n.x)) - PAD;
    const bMaxX = Math.max(...allNodes.map(n => n.x)) + PAD;
    const bMinY = Math.min(...allNodes.map(n => n.y)) - PAD;
    const bMaxY = Math.max(...allNodes.map(n => n.y)) + PAD;
    this.treeBox = { minX: bMinX, minY: bMinY, w: bMaxX - bMinX, h: bMaxY - bMinY };
  }

  /** DEFAULT VIEW on open: centred on this class's START NODE at a readable
   *  zoom (a ~1200-unit window), instead of the whole 6000-unit expanse —
   *  the tree can grow without the first impression shrinking. Zoom out /
   *  reset to survey everything; pan clamps keep the window on the tree. */
  private centerTreeOnStart(): void {
    this.computeTreeBox();
    // Realm tabs open FIT-TO-CONSTELLATION (small stars read whole); only
    // the main star centres on the class start at a readable zoom.
    if (this.treeRealm !== MAIN_REALM) { this.treeZoom = 1; this.treePan = { x: 0, y: 0 }; return; }
    const start = PASSIVE_NODES[classStartNode(this.getWorld().meta.classDef.id)];
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
    const m = world.meta;

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
        ${node.kind === 'choice' ? 'stroke-dasharray="4 3"' : ''}
        data-node="${node.id}" data-tip="pnode" class="tree-node ${available ? 'available' : ''} ${allocated ? 'allocated' : ''}"/>`;
    }

    // The DEV editor works in the raw 6000×6000 coordinate space;
    // play mode uses the auto-fit + zoom/pan viewBox.
    const viewBox = DEV.passiveTreeEditor ? '0 0 6000 6000' : this.treeViewBox();
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
          ${DEV.passiveTreeEditor ? '' : `<span class="tree-zoom-grp">
            <button class="tree-zoom" data-tz="out" title="zoom out">−</button>
            <button class="tree-zoom" data-tz="reset" title="reset zoom">${zPct}%</button>
            <button class="tree-zoom" data-tz="in" title="zoom in">＋</button>
          </span> &nbsp;`}${m.allocated.size} allocated · click to allocate${DEV.passiveTreeEditor ? '' : ' · scroll to zoom, drag to pan'}</span></h2>
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
          if (node?.choice) { this.openChoicePopup(node, el); return; }
          world.requestMeta({ t: 'allocate', nodeId: el.dataset.node! });
          this.refreshTree();
          this.refreshCharSheet();
        });
      });
      this.wireTreeControls();   // wheel-zoom + drag-pan + zoom buttons (play mode)
    }
    // Let the DEV passive-tree editor re-attach its handlers to the new SVG.
    this.onTreeRender?.();
  }

  /** Tree viewBox from the fitted node-bounds box + the live zoom/pan, clamping the
   *  pan so the window can't slide off the tree. Mirrors mapViewBox. */
  private treeViewBox(): string {
    const b = this.treeBox;
    const z = clamp(this.treeZoom, 1, 8);   // deeper than the map — the tree is dense
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
    if (already && !(node.choice && nodeChoiceOpen(node, m.choices))) return false;
    if (!already && realm?.adjacency !== 'free'
      && !PASSIVE_ADJACENCY[node.id].some(n => m.allocated.has(n))) return false;
    const cost = node.choice ? PASSIVE_CHOICE_CFG.pickCost : 1;
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
    const m = world.meta;
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
        <span class="choice-count">${chosen.length}/${limit} chosen${group.unique === 'character' ? ' · once per character' : ''}</span></div>
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
    const r = el.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
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
    const m = this.getWorld().meta;
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
    // CHOICE NODES: the deal (group, pick count, uniqueness) + what this
    // character has already picked here, each with its granted line.
    let choiceText = '';
    const group = choiceGroupOf(node);
    if (node.choice && group) {
      const limit = choicePickLimit(node);
      const chosen = chosenOf(m.choices, node.id);
      choiceText = `<br><span style="color:#b8a2e8">${group.name}</span>`
        + ` — pick ${limit} of ${group.options.length}`
        + (group.unique === 'character' ? ' (each option once per character)' : '');
      for (const oid of chosen) {
        const opt = choiceOptionOf(node, oid);
        if (opt) choiceText += `<br><span style="color:#e6d8ff">✓ ${opt.name}</span> — ${opt.description}`;
      }
    }
    const openPicks = node.choice && group
      ? ` — ${chosenOf(m.choices, node.id).length}/${choicePickLimit(node)} picked`
      : '';
    let meta = m.allocated.has(node.id)
      ? `${KIND_LABELS[node.kind]} — allocated${openPicks}${this.nodeAllocatable(node, m) ? ' — click to choose' : ''}`
      : this.nodeAllocatable(node, m) ? `${KIND_LABELS[node.kind]} — click to ${node.choice ? 'choose' : 'allocate'}`
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
    const ports = world.sailMenuPorts();
    const rows = ports.length
      ? ports.map(p => `<div class="skill-entry">
          <div class="name">${esc(p.name)}${p.sailed ? ' <span class="tags">· route charted</span>' : ''}</div>
          <div class="desc">A harbor of level ${p.level}.</div>
          <div class="bind-btns"><button data-sail-port="${esc(p.id)}">Sail</button></div>
        </div>`).join('')
      : `<div class="skill-entry"><div class="desc">No other harbors charted — set out across the open sea.</div></div>`;
    this.sailMenu.innerHTML = `<h2>The Harbor</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">"The sea takes you wherever there's a shore to take you in."</div>`
      + rows
      + `<div class="skill-entry"><div class="name">Chart a course</div>`
      + `<div class="desc">Sail the open ocean until a new continent's shore.</div>`
      + `<div class="bind-btns"><button data-sail-chart>Set sail</button></div></div>`
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
    this.sailMenu.querySelector<HTMLButtonElement>('button[data-sail-close]')?.addEventListener('click', () => this.closeSail());
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
    const hired = world.hiredMerc;
    const rows = post.offers.length
      ? post.offers.map((o, i) => {
        const cost = world.mercHireCost(o);
        const afford = acc.credits >= cost;
        const vet = o.kind === 'retired';
        return `<div class="skill-entry">
          <div class="name">${esc(o.name)}
            ${vet ? `<span class="tags" style="color:#b8a0e0">· VETERAN — retired at level ${o.retiredLevel}</span>` : ''}</div>
          <div class="desc">${esc(o.blurb)}</div>
          <div class="desc" style="color:#8a9a8a">Fights at your measure (level ${L}) — a blade is fitted to its patron.</div>
          <div class="bind-btns"><button data-merc-hire="${i}" ${hired || !afford ? 'disabled' : ''}>
            Hire — ${cost} ${META_CURRENCY_LABEL}</button>
            ${!afford && !hired ? `<span class="tags">you carry ${acc.credits}</span>` : ''}</div>
        </div>`;
      }).join('')
      : `<div class="skill-entry"><div class="desc">The sign-board hangs empty — every blade is spoken for.</div></div>`;
    const contract = hired
      ? `<div class="skill-entry"><div class="name" style="color:#c8b048">Under contract: ${esc(hired.name)}</div>
          <div class="desc">Their hire ends when your run does — however it does.</div></div>`
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
    this.mercMenu.innerHTML = `<h2>The Mercenary Outpost</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">"Every blade here has a story. Buy one — or become one."</div>`
      + contract + rows + retire
      + `<div class="bind-btns" style="margin-top:10px"><button data-merc-close>Close</button></div>`;
    this.mercMenu.querySelectorAll<HTMLButtonElement>('button[data-merc-hire]').forEach(btn => {
      btn.addEventListener('click', () => {
        world.hireMercenary(Number(btn.dataset.mercHire));
        this.refreshMercMenu(); // re-render: the offer struck, the contract line, the purse
      });
    });
    this.mercMenu.querySelector<HTMLButtonElement>('button[data-merc-retire]')?.addEventListener('click', () => {
      if (!window.confirm('Retire this character? The run ends (essence banks as on death), and the character '
        + 'joins the mercenary roster — met again wherever an outpost offers them.')) return;
      this.closeMercMenu();
      world.retireCharacter(); // the run-end flow takes over (retire-flavored screen)
    });
    this.mercMenu.querySelector<HTMLButtonElement>('button[data-merc-close]')?.addEventListener('click', () => this.closeMercMenu());
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
    // selection/box don't change during a pan anyway.
    if (this.mapDragging) return;
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
        if (!world.visible(z) && !world.visible(b)) continue; // both ends fogged → no road
        const key = z.id < e.to ? z.id + '|' + e.to : e.to + '|' + z.id;
        if (drawn.has(key)) continue;
        drawn.add(key);
        const known = visited.has(z.id) || visited.has(e.to);
        // A road crossing an ENCLAVE biome's wall wears the gate's accent —
        // the map telegraphs "that way lies the Durance" the same way the
        // portal itself does (derived inline: both endpoint defs are in hand).
        const enGate = (BIOMES[b.biome ?? '']?.enclave && !BIOMES[z.biome ?? '']?.enclave)
          ? BIOMES[b.biome ?? '']?.enclave
          : (BIOMES[z.biome ?? '']?.enclave && !BIOMES[b.biome ?? '']?.enclave)
            ? BIOMES[z.biome ?? '']?.enclave : undefined;
        const enAccent = enGate ? boundaryGateOf(enGate.gate)?.accent : undefined;
        edges += `<line x1="${z.map.x}" y1="${z.map.y}" x2="${b.map.x}" y2="${b.map.y}"
          stroke="${enAccent && known ? enAccent : known ? '#5a5a72' : '#2c2c3a'}" stroke-width="${enAccent && known ? 2.6 : 2}"
          ${known ? '' : 'stroke-dasharray="4 5"'}${enAccent && known ? ' stroke-opacity="0.75"' : ''}/>`;
      }
      // SEA LANES: crossings you have sailed (searoutes, recorded on landing)
      // — a dashed blue arc over the water, the naval half of the road graph.
      for (const to of z.searoutes ?? []) {
        const b = world.zoneMap[to];
        if (!b || !inDim(b)) continue;
        if (!world.visible(z) && !world.visible(b)) continue;
        const key = 'sea:' + (z.id < to ? z.id + '|' + to : to + '|' + z.id);
        if (drawn.has(key)) continue;
        drawn.add(key);
        edges += `<line x1="${z.map.x}" y1="${z.map.y}" x2="${b.map.x}" y2="${b.map.y}"
          stroke="#4a8ac8" stroke-width="2" stroke-dasharray="6 5" stroke-opacity="0.8"/>`;
      }
    }

    let nodes = '';
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
      const lvText = z.objective.kind === 'waves' && z.objective.waves === 0
        ? 'endless waves' : `monster lv ${z.level}`;
      const sub = bi ? `${bi.label} · ${lvText}` : lvText;
      // Each node is one <g data-zone> so a delegated hover handler can identify
      // the zone with no geometry math (the browser hit-tests the SVG for us); the
      // existing .wp-node click + the drag-guard still target the inner elements.
      const pinned = this.pinnedZone === z.id;
      const here = current ? `<text x="${z.map.x}" y="${z.map.y - 18}" text-anchor="middle"
          font-size="9" fill="#ffd700">YOU ARE HERE</text>` : '';
      // A FIELD zone renders like any other node: ONE circle, centred on the region (its
      // def.map is the blob centre). The region BOUNDS live on def.field but are NOT drawn —
      // the player understands a Field is a single zone, and the bbox stays available as the
      // Field's spatial "event node" (a stormfront / incursion can later target/show over it).
      nodes += `<g data-zone="${z.id}" style="cursor:help">
        <circle cx="${z.map.x}" cy="${z.map.y}" r="${current ? 13 : 10}"
          fill="${fill}" fill-opacity="${known ? 0.85 : scouted ? 0.55 : 1}"
          stroke="${pinned ? '#5ad8d8' : current ? '#ffd700' : known ? '#d8d4c8' : scouted ? '#8fd4ff' : '#4a4a5e'}"
          stroke-width="${pinned ? 3 : current ? 3 : 1.5}" ${scouted ? 'stroke-dasharray="3 3"' : ''}
          ${canTravel ? `class="wp-node" data-wp="${z.id}" style="cursor:pointer"` : ''}/>
        ${wp ? `<rect x="${z.map.x - 16.5}" y="${z.map.y - 16.5}" width="9" height="9"
          fill="#5ad8d8" transform="rotate(45 ${z.map.x - 12} ${z.map.y - 12})"
          ${canTravel ? `class="wp-node" data-wp="${z.id}" style="cursor:pointer"` : ''}>
          <title>Waypoint — click to travel</title></rect>` : ''}
        ${z.port ? `<text x="${z.map.x + 14}" y="${z.map.y - 10}" text-anchor="middle"
          font-size="11" fill="#9ad0e8">⚓<title>Port — sail from its dock</title></text>` : ''}
        <text x="${z.map.x}" y="${z.map.y + 26}" text-anchor="middle"
          font-size="11" fill="${known ? '#d8d4c8' : scouted ? '#a8c4d8' : '#55555f'}">${known || scouted ? z.name : '???'}</text>
        ${known || scouted ? `<text x="${z.map.x}" y="${z.map.y + 38}" text-anchor="middle"
          font-size="9" fill="${bi ? bi.mapColor : '#8a8678'}">${sub}</text>` : ''}
        ${here}</g>`;
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
    const simUnder = layers.map(l => l.under).join('');
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
    // Marker titles come from authored data (quest labels, class/zone names), so
    // escape them before they land in an SVG <title> — a stray < or & would break
    // the whole map's XML.
    let deaths = '';
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
      deaths += `<g><title>${esc(m.title)}</title>`
        + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${m.fill}" stroke="${m.stroke}" stroke-width="1.5"/>`
        + `<text x="${cx}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${m.text}">${m.glyph}</text></g>`;
    }

    // The map grows as frontiers are charted — fit the view to the VISIBLE graph
    // (the fog policy). Margins run a little wide so drifting fronts have room.
    const shown = zones.filter(z => world.visible(z));
    const xs = (shown.length ? shown : zones).map(z => z.map.x);
    const ys = (shown.length ? shown : zones).map(z => z.map.y);
    const minX = Math.min(...xs) - 95, maxX = Math.max(...xs) + 95;
    const minY = Math.min(...ys) - 80, maxY = Math.max(...ys) + 85;
    // Store the fitted box; the live zoom/pan are applied ON TOP (the map grows
    // with the world, so zooming keeps the fixed-size labels legible).
    this.mapBox = { minX, minY, w: maxX - minX, h: maxY - minY };
    const zPct = Math.round(this.mapZoom * 100);

    // Preserve the side-box scroll across the wholesale rebuild — else the 0.5s
    // auto-refresh snaps a pinned, scrolled list back to the top twice a second.
    const prevAsideScroll = this.worldMap.querySelector<HTMLElement>('#map-aside')?.scrollTop ?? 0;
    this.worldMap.innerHTML = `
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
        <svg id="world-map-svg" viewBox="${this.mapViewBox()}" style="cursor:grab;touch-action:none">${ocean}${simUnder}${edges}${stubs}${nodes}${deaths}${simOver}</svg>
        <aside id="map-aside">${this.zoneBoxHtml(world)}</aside>
      </div>`;
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
    return `<div style="font-size:9px;color:#6a6a78;margin:-2px 0 6px 0">layers: ${chips}</div>`;
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
    this.worldMap.innerHTML = `
      <h2>Quest Journal</h2>
      ${this.mapTabsHtml()}
      <div id="quest-scroll" style="overflow-y:auto;max-height:64vh;padding:2px 4px 8px 2px">
        <h3 style="font-size:12px;color:#c8a8e8;margin:4px 0 6px 0">Active (${log.active.length})</h3>
        ${activeHtml}
        <h3 style="font-size:12px;color:#8a8678;margin:14px 0 6px 0">Completed (${log.completed.length})</h3>
        ${doneHtml}
      </div>`;
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
    const name = charted && zone ? zone.name : '???';
    const pinned = this.pinnedZone === zoneId;
    const head = `<div class="zi-zone">${esc(name)}`
      + (pinned ? ` <span class="zi-pin" data-unpin="1">📌 unpin</span>` : '')
      + `</div>`
      + `<div class="zi-hint">${zoneId === world.zone.id ? 'you are here' : pinned ? 'pinned' : 'hovering'}</div>`;

    const entries = zoneInfoFor(world, zoneId);
    if (entries.length === 0) {
      const msg = charted ? 'Nothing of note here.' : 'Uncharted — explore to reveal.';
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
        body += `<div class="zi-row">`
          + `<span class="zi-icon" style="color:${r.color ?? '#d8d4c8'}">${esc(r.icon)}</span>`
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
    attachPanZoom(svg, {
      getZoom: () => this.mapZoom,
      setZoom: (z) => { this.mapZoom = z; },
      panBy: (dx, dy) => { this.mapPan.x += dx; this.mapPan.y += dy; },
      box: () => this.mapBox,
      apply,
      ignore: '.wp-node', // let waypoint travel-clicks through
      // HOVER preview — update only the side box (a pin, if set, takes precedence
      // inside boxZoneId, so hovering elsewhere while pinned leaves the box alone).
      onIdleMove: (e) => {
        const zid = zoneAt(e);
        if (zid !== this.hoveredZone) { this.hoveredZone = zid; this.renderZoneBox(); }
      },
      onLeave: () => {
        if (this.hoveredZone !== null) { this.hoveredZone = null; this.renderZoneBox(); }
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
      root.innerHTML = `
        <h1>Paused</h1>
        <div class="esc-btns">
          <button id="esc-resume">Resume</button>
          <button id="esc-keys">Customize Keybinds</button>
          <button id="esc-end">${this.isCoopClient() ? 'Leave Co-op' : rosterMode ? 'Save & Main Menu' : 'End Run'}</button>
          <button id="esc-close">Close Game</button>
        </div>`;
      document.getElementById('esc-resume')!.addEventListener('click', () => this.hideEscapeMenu());
      document.getElementById('esc-keys')!.addEventListener('click', () => this.renderKeybinds(root, showMain));
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

    showMain();
    root.classList.remove('hidden');
  }

  hideEscapeMenu(): void {
    this.escapeMenuOpen = false;
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
  private renderKeybinds(root: HTMLElement, onBack: () => void): void {
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
    root.innerHTML = `
      <h1>Keybinds</h1>
      <div class="acct-head">LMB / RMB drive skills 1 &amp; 2 (fixed). Click a key, then press a new one (Esc cancels).</div>
      <div class="rebind-list">${rows}</div>
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
      </div>
      <h1>Options</h1>
      <div class="rebind-row">
        <span>Low-Life Screen Pulse</span>
        <button id="opt-lowlife" title="Blood seeps in at the screen edge while life is low, pressing inward on a slow heartbeat at the last sliver. OFF: only the struck-while-low surge shows (the sane pick for 1/1-life or heavy-reservation builds).">${this.getSettings().lowLifePulse ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Improvised Strike (empty slots swing)</span>
        <button id="opt-improvised" title="Pressing an EMPTY bar slot swings a fixed, gemless improvised strike — the floor no kit falls beneath. Turn OFF to make empty slots dead keys (a stray press mid-dodge costs the swing's half-second; the risk budget is yours).">${this.getSettings().improvisedStrike ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Gear Pickup</span>
        <button id="opt-gearpickup">${this.getSettings().gearPickup === 'key'
          ? `PRESS ${keyDisplay(this.getSettings().keybinds.pickup)}` : 'WALK OVER'}</button>
      </div>
      <div class="rebind-row">
        <span>Foresight (enemy cast markers)</span>
        <button id="opt-foresight">${this.getSettings().castTelegraphs ? 'ON' : 'OFF'}</button>
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
        }[this.getSettings().poolBars]}</button>
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
      </div>
      <div class="esc-btns"><button id="esc-back">Back</button></div>`;
    // The severity-scaled edge pulse is a real build choice (1/1-life and
    // heavy-reservation heroes live "low" on purpose) — so it's a toggle.
    root.querySelector<HTMLElement>('#opt-lowlife')!.addEventListener('click', () => {
      const s = this.getSettings();
      s.lowLifePulse = !s.lowLifePulse;
      this.saveSettings();
      this.renderKeybinds(root, onBack);
    });
    // The unarmed floor is default-ON and found-not-taught; the OFF switch
    // exists so accidental empty-slot presses are the PLAYER's dial, not a
    // death the game chose for them (see settings.ts improvisedStrike).
    root.querySelector<HTMLElement>('#opt-improvised')!.addEventListener('click', () => {
      const s = this.getSettings();
      s.improvisedStrike = !s.improvisedStrike;
      this.saveSettings();
      this.renderKeybinds(root, onBack);
    });
    // Gear pickup feel: hoover it like gems, or keep it a deliberate press.
    root.querySelector<HTMLElement>('#opt-gearpickup')!.addEventListener('click', () => {
      const st = this.getSettings();
      st.gearPickup = st.gearPickup === 'key' ? 'vacuum' : 'key';
      this.saveSettings();
      this.updateHintBar();
      this.renderKeybinds(root, onBack);
    });
    // FORESIGHT: enemy ground-casts mark their landing during the wind-up.
    // OFF is the read-the-animation purist mode.
    root.querySelector<HTMLElement>('#opt-foresight')!.addEventListener('click', () => {
      const st = this.getSettings();
      st.castTelegraphs = !st.castTelegraphs;
      this.saveSettings();
      this.renderKeybinds(root, onBack);
    });
    // REAWAKEN AFTER QUIT: where a relaunched save wakes (meta/worldstate.ts).
    // Player agency by default; a mode's `resume` pin outranks it at resume.
    root.querySelector<HTMLElement>('#opt-resume')!.addEventListener('click', () => {
      const st = this.getSettings();
      st.resumeSpawn = st.resumeSpawn === 'town' ? 'exact' : 'town';
      this.saveSettings();
      this.renderKeybinds(root, onBack);
    });
    // POISE/INSIGHT arcs: cycle the three view methodologies — smart hide
    // (change + build weight), strictly on-change, or always-on.
    root.querySelector<HTMLElement>('#opt-poolbars')!.addEventListener('click', () => {
      const st = this.getSettings();
      st.poolBars = st.poolBars === 'smart' ? 'recent' : st.poolBars === 'recent' ? 'always' : 'smart';
      this.saveSettings();
      this.renderKeybinds(root, onBack);
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
      this.renderKeybinds(root, onBack);
    });
    // AIM TICK opacity: fades every facing pointer; 0 hides them outright
    // (the see-the-fight option). The renderer reads Settings live — the
    // drag shows on the battlefield behind the menu, next frame.
    slider('aimtick', v => { this.getSettings().aimTick.alpha = v / 100; },
      v => v <= 0 ? 'HIDDEN' : `${v}%`);
    // AIM TICK style: one button per registry entry (line / dot / mods').
    root.querySelectorAll<HTMLElement>('[data-aimtick-style]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.getSettings().aimTick.style = btn.dataset.aimtickStyle!;
        this.saveSettings();
        this.renderKeybinds(root, onBack);
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
        this.renderKeybinds(root, onBack);
      });
    });
    root.querySelectorAll<HTMLElement>('[data-cursor-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        const st = this.getSettings();
        st.cursor.color = btn.dataset.cursorColor!;
        this.saveSettings();
        applyCursor(st.cursor);
        this.renderKeybinds(root, onBack);
      });
    });
    root.querySelector<HTMLElement>('#opt-swapsticks')!.addEventListener('click', () => {
      const st = this.getSettings();
      st.pad.swapSticks = !st.pad.swapSticks;
      this.saveSettings();
      this.renderKeybinds(root, onBack);
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
          this.renderKeybinds(root, onBack);
        });
        const onKey = (e: KeyboardEvent): void => {
          if (e.key !== 'Escape') return;
          e.preventDefault();
          e.stopImmediatePropagation();
          this.disarmRebind();
          this.renderKeybinds(root, onBack);
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
          this.renderKeybinds(root, onBack); // re-render the (possibly updated) labels
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
        <button id="sm-keys">Customize Keybinds</button>
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
      this.renderKeybinds(this.startMenu, () => this.showStartMenu(h.onStart, h.onContinue, h.onCoop, h.onRoster)));
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
