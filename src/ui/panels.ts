// ---------------------------------------------------------------------------
// DOM panels: class selection, character sheet, skill book (unlock / level /
// socket support gems), passive tree, death screen.
//
// All panels are generated from the data registries, so new attributes,
// stats, skills, supports, passives, and classes appear here automatically.
// ---------------------------------------------------------------------------

import { clamp } from '../core/math';
import { DEV } from '../config';
import {
  ATTRIBUTES, ATTRIBUTE_IDS, STAT_DEFS,
  type AttributeId, type DamageType,
} from '../engine/stats';
import { resistValue } from '../engine/damage';
import {
  effectiveSkillLevel, SKILL_RARITIES, skillMaxLevel, supportFitsInst, supportMaxLevel,
  type SkillDef, type SkillInstance,
} from '../engine/skills';
import { MAX_LEARNED_SKILLS, OFFERINGS_PER_POINT } from '../engine/world';
import { CLASSES, type ClassDef } from '../data/classes';
import { classStartNode, PASSIVE_ADJACENCY, PASSIVE_NODES, vocationGateNodeId, vocationGateOpen, type PassiveNode } from '../data/passives';
import { VOCATIONS, vocationRootId } from '../data/vocations';
import { BIOMES, biomeOf } from '../world/biomes';
import { dimensionDef } from '../world/dimensions';
import { collectMarkers } from '../world/mapMarkers';
import { zoneInfoFor, type ZoneInfoEntry } from '../world/zoneInfo';
import type { World } from '../engine/world';
import { featureEnabled, FEATURE, selectableSlotCount, type Account } from '../meta/account';
import { allUnlockables, applyUnlock, availableUnlocks, isUnlockOwned } from '../meta/unlocks';
import { ACTION_IDS, ACTION_LABELS, type ActionId, type Settings } from '../meta/settings';
import type { CharacterSave } from '../meta/character';
import { bound } from '../packages/manifest';
import { isConfigured, PACKAGES } from '../packages/registry';
import type { ContentPackage } from '../packages/types';
import { QUEST_CATEGORY_COLORS, type QuestCategory } from '../quests/types';
import type { ZoneDef } from '../data/zones';
import { bindTooltips, hideTooltip, type TooltipContent } from './tooltip';
import { attachPanZoom, clampZoom, PANZOOM_DEFAULTS } from './panzoom';

/** Neutral accent for packages that declare no colour of their own. */
const PKG_FALLBACK_COLOR = '#888';

/** Stats worth showing on the sheet, in display order. */
const SHEET_STATS = [
  'life', 'lifeRegen', 'lifeRegenPct', 'mana', 'manaRegen', 'manaRegenPct', 'moveSpeed',
  'attackSpeed', 'castSpeed', 'accuracy', 'evasion', 'armor',
  'poise', 'poiseDR', 'insight', 'insightDR', 'endurance', 'enduranceDR', 'weight',
  'blockChance', 'blockPower', 'guardStrength', 'energyShield', 'esDotResist', 'manaShield',
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
  private skillBook = document.getElementById('skill-book')!;
  private passiveTree = document.getElementById('passive-tree')!;
  private worldMap = document.getElementById('world-map')!;
  private caravanMenu = document.getElementById('caravan-menu')!;
  private tollMenu = document.getElementById('toll-menu')!;
  private sailMenu = document.getElementById('sail-menu')!;
  private vocationMenu = document.getElementById('vocation-menu')!;
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
  private classRoster: { picks: ClassDef[]; teasers: ClassDef[] } | null = null;
  /** Start-menu callbacks, retained so Vault/Keybinds sub-views can return. */
  private startHandlers: { onStart: (d: ClassDef) => void; onContinue: (s?: CharacterSave | null) => void; onCoop?: () => void } | null = null;
  /** The pending rebind keydown-capture listener (armed when a row is clicked,
   *  before a key is pressed). Tracked so it can be torn down on re-render / any
   *  navigation away — a leaked capture would swallow & silently rebind the next
   *  gameplay keystroke. */
  private armedRebind: ((e: KeyboardEvent) => void) | null = null;

  charSheetOpen = false;
  skillBookOpen = false;
  treeOpen = false;
  mapOpen = false;
  caravanOpen = false;
  tollOpen = false;
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
  bookTab: 'known' | 'skills' | 'gems' = 'known';
  /** The tab the skill book last RENDERED — compared against bookTab at the next
   *  render so scroll restores only within the same tab (a switch starts at top).
   *  Comparing against bookTab itself is vacuous: the tab click mutates it before
   *  refreshSkillBook runs, so the old tab's offset bled into the new tab. */
  private lastBookTab: 'known' | 'skills' | 'gems' | null = null;
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
    bindTooltips(this.charSheet, (el) => el.dataset.tip === 'class' ? this.classTooltip() : null);
    bindTooltips(this.skillBook, (el) => el.dataset.tip === 'skill' ? this.skillTooltip(el.dataset.skillId!) : null);
  }

  /** Tooltip for the class label in the character sheet. */
  private classTooltip(): TooltipContent {
    const c = this.getWorld().meta.classDef;
    return {
      title: c.name, description: c.description,
      meta: `${c.innateText ? `Innate: ${c.innateText} — ` : ''}A class is only a starting point; you can allocate any attributes and bind any skill you qualify for.`,
    };
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

  /** Bar-slot key labels from the live keybinds (slots 0/1 fixed to mouse). */
  private slotLabels(): string[] {
    const kb = this.getSettings().keybinds;
    return ['LMB', 'RMB', kb.skillSlot2, kb.skillSlot3, kb.skillSlot4,
      kb.skillSlot5, kb.skillSlot6, kb.skillSlot7].map(s => s.toUpperCase());
  }

  // ---------------------------------------------------------- class select

  /** Clear the cached class roster so the NEXT class select deals a fresh roll.
   *  Called when a run ends (death) — NOT on menu navigation. */
  resetClassRoster(): void { this.classRoster = null; }

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
    this.bookTab = 'known';
    this.lastBookTab = null;
  }

  showClassSelect(onPick: (def: ClassDef) => void): void {
    this.hideAll();
    const acc = this.getAccount();
    const TEASER_COUNT = 4;
    const selectable = selectableSlotCount(acc);
    // Roguelike roll: shuffle the roster, surface `selectable` PICKABLE classes
    // plus a few locked TEASERS. Rolled ONCE per new-run offer + CACHED, so menu
    // navigation (Vault / Event Weights / Back) keeps the same offer; only a
    // death (resetClassRoster) deals a fresh hand — OR buying a Class Slot in the
    // Vault mid-offer, which widens the field and re-deals so the new slot shows.
    if (this.classRoster && this.classRoster.picks.length !== Math.min(selectable, CLASSES.length)) {
      this.classRoster = null;
    }
    if (!this.classRoster) {
      const shuffled = [...CLASSES];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const pickN = Math.min(selectable, shuffled.length);
      const teaserN = Math.min(TEASER_COUNT, shuffled.length - pickN);
      this.classRoster = { picks: shuffled.slice(0, pickN), teasers: shuffled.slice(pickN, pickN + teaserN) };
    }
    const { picks, teasers } = this.classRoster;

    const classCard = (c: ClassDef, locked: boolean): string => `
      <div class="class-card ${locked ? 'locked' : ''}" data-id="${c.id}" data-locked="${locked}"
        ${locked ? 'style="opacity:.5"' : ''}>
        <div class="cname" style="color:${c.color}">${c.name}</div>
        <div class="cdesc">${c.description}</div>
        <div class="cattrs">${ATTRIBUTE_IDS.filter(a => (c.attributes[a] ?? 0) > 0).map(a =>
          `${ATTRIBUTES[a].short} ${c.attributes[a]}`).join(' &nbsp; ')}</div>
        ${c.innateText ? `<div class="cskills">Innate: ${c.innateText}</div>` : ''}
        ${locked ? '<div class="class-lock">🔒 Unlock more Class Slots in the Vault</div>' : ''}
      </div>`;

    this.classSelect.innerHTML = `
      <h1>ARPG TEST GAME</h1>
      <div style="font-size:12px;color:var(--gold);margin-bottom:4px">
        Account Level ${acc.level} &nbsp;·&nbsp; ${acc.credits} credits &nbsp;·&nbsp;
        ${selectable} of ${CLASSES.length} classes offered &nbsp;(re-rolls each new run)</div>
      <div class="subtitle">
        A random roster is dealt each run — unlock more Class Slots to widen the field.
        Classes are only starting points; the tree and every skill stay open to any build.
        Pick a class to begin; tune the world mix under Event Weights first if you like.
      </div>
      <div class="class-grid">${picks.map(c => classCard(c, false)).join('')}${teasers.map(c => classCard(c, true)).join('')}</div>
      <div class="acct-btns">
        <button id="event-weights-btn">⚙ Event Weights</button>
        <button id="account-btn">Unlocks (Vault)</button>
      </div>`;
    this.classSelect.classList.remove('hidden');

    this.classSelect.querySelectorAll<HTMLElement>('.class-card').forEach(el => {
      el.addEventListener('click', () => {
        if (el.dataset.locked === 'true') {
          this.showAccountScreen(() => this.showClassSelect(onPick));
          return;
        }
        this.classSelect.classList.add('hidden');
        onPick(CLASSES.find(c => c.id === el.dataset.id!)!);
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
             Nothing available to unlock right now — earn more credits and account levels by playing.
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
            <b>${acc.credits}</b> credits &nbsp;·&nbsp; ${acc.lifetimeCredits} lifetime</div>
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
      <div class="attr-row" title="${ATTRIBUTES[id].description}">
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
      return `<div class="stat-row"><span>${def.label}</span><span class="val">${text}</span></div>`;
    }).join('');

    // The vocation TITLE rides the class name once granted — "Warrior, Warbringer".
    const vocTitle = m.vocations
      .map(vid => VOCATIONS[vid])
      .filter((v): v is NonNullable<typeof v> => !!v)
      .map(v => `, <span style="color:${v.color}">${v.name}</span>`)
      .join('');
    const vocPts = m.vocations.length
      ? ` · <span style="color:#e8c860">${m.vocationPoints} vocation</span>` : '';
    this.charSheet.innerHTML = `
      <h2><span data-tip="class" style="cursor:help;border-bottom:1px dotted var(--gold)">${m.classDef.name}</span>${vocTitle} — Level ${p.level}</h2>
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
  }

  // -------------------------------------------------------------- skill book

  toggleSkillBook(): void {
    this.skillBookOpen = !this.skillBookOpen;
    this.skillBook.classList.toggle('hidden', !this.skillBookOpen);
    if (this.skillBookOpen) this.refreshSkillBook();
    else hideTooltip();
  }

  private costText(cost: { mana: number; life: number }): string {
    const parts: string[] = [];
    if (cost.mana > 0) parts.push(`${cost.mana} mana`);
    if (cost.life > 0) parts.push(`<span style="color:#d05050">${cost.life} life</span>`);
    return parts.join(' + ') || 'free';
  }

  refreshSkillBook(): void {
    if (!this.skillBookOpen) return;
    const world = this.getWorld();
    const p = world.player;
    const m = world.meta;

    const rarityTag = (inst: SkillInstance): string => {
      const r = SKILL_RARITIES[inst.rarity ?? 'common'];
      return `<span style="color:${r.color};font-size:10px;font-weight:bold">${r.label}</span>
        <span style="color:#8a8678;font-size:10px">· ${inst.sockets.length} socket${inst.sockets.length > 1 ? 's' : ''}</span>`;
    };

    // --- Learned skills tab ---------------------------------------------------
    const known = [...m.knownSkills.values()].map(inst => {
      const def = inst.def;
      const maxLv = skillMaxLevel(def);
      const binds = this.slotLabels().map((label, slot) => {
        const bound = p.skills[slot]?.def.id === def.id;
        return `<button data-bind="${def.id}" data-slot="${slot}"
          class="${bound ? 'bound' : ''}">${label}</button>`;
      }).join('');
      const sockets = inst.sockets.map((s, i) => s ? `
        <span class="gem-chip" style="border-color:${s.def.color}" title="${s.def.description}">
          ${s.def.name} <b>L${s.level}</b>
          <button data-gemlvl="${def.id}:${i}" ${m.skillPoints < 1 || s.level >= supportMaxLevel(s.def) ? 'disabled' : ''}>+</button>
          <button data-unsocket="${def.id}:${i}">✕</button>
        </span>` : `<span class="gem-chip empty">empty socket</span>`).join('');
      const eff = effectiveSkillLevel(inst);
      const nextThresh = def.thresholds?.find(t => eff < t.level);
      const reached = def.thresholds?.filter(t => eff >= t.level) ?? [];
      return `
        <div class="skill-entry" data-tip="skill" data-skill-id="${def.id}" style="border-left:3px solid ${def.color}">
          <div class="name">${def.name} <span style="color:#ffd700">Lv ${inst.level}${eff > inst.level ? ` <span style="color:#8ad0ff">(+${eff - inst.level} → ${eff})</span>` : inst.level >= maxLv ? ' (max)' : ''}</span>
            ${reached.map(t => `<span style="font-size:9px;padding:1px 6px;border-radius:7px;background:#2a2438;color:#c8a8ff;margin-left:4px" title="Lv ${t.level} threshold">${t.label}</span>`).join('')}
            ${nextThresh ? `<span style="font-size:9px;color:#6a6478;margin-left:4px">Lv ${nextThresh.level}: ${nextThresh.label}</span>` : ''}
            ${rarityTag(inst)}
            <span style="color:#8a8678;font-weight:normal;font-size:10px">
              ${this.costText(p.skillCost(inst))}${def.cooldown ? `, ${def.cooldown}s cd` : ''}</span>
          </div>
          <div class="tags">${def.tags.join(' · ')}</div>
          <div class="bind-btns">
            <button data-levelup="${def.id}" ${m.skillPoints < 1 || inst.level >= maxLv ? 'disabled' : ''}>
              Level Up (1 pt)</button>
            ${binds}
            <button data-unlearn="${def.id}">Unlearn</button>
          </div>
          <div class="sockets">${sockets}</div>
        </div>`;
    }).join('') || '<div style="color:#8a8678;font-size:11px">Nothing learned. Skills drop from monsters — learn them from the Skill Gems tab.</div>';

    // --- Skill gem inventory tab ------------------------------------------------
    const nearFont = world.nearFont();
    const nearSmith = world.nearSmith();
    // Brandt's counter: visible only while you stand at the forge.
    const restockIn = Math.max(0, Math.ceil(world.vendorRestockAt - world.time));
    const wares = nearSmith && world.vendorStock.length ? `
      <div style="border:1px solid #6a5638;border-radius:4px;padding:8px;margin-bottom:8px;background:rgba(232,200,122,0.05)">
        <div style="color:#e8c87a;font-weight:bold;font-size:12px;margin-bottom:4px">
          BRANDT'S WARES — 1 skill point each
          <span style="color:#c8a84b;font-size:10px;font-weight:normal"> · restock ${restockIn}s</span></div>
        ${world.vendorStock.map((e, idx) => {
          const name = e.kind === 'skill' ? e.inst.def.name : e.gem.def.name;
          const lv = e.kind === 'skill' ? e.inst.level : e.gem.level;
          const col = e.kind === 'skill' ? SKILL_RARITIES[e.inst.rarity ?? 'common'].color : e.gem.def.color;
          const tags = e.kind === 'skill' ? e.inst.def.tags.join(' · ') : 'support gem';
          const tag = e.kind === 'skill' ? rarityTag(e.inst) : '';
          return `
          <div class="skill-entry" style="border-left:3px solid ${col}">
            <div class="name">${name} <span style="color:#ffd700">Lv ${lv}</span> ${tag}</div>
            <div class="tags">${tags}</div>
            <div class="bind-btns">
              <button data-buy="${idx}" ${m.skillPoints < 1 ? 'disabled' : ''}>
                Buy (1 pt)${m.skillPoints < 1 ? ' — no points' : ''}</button>
            </div>
          </div>`;
        }).join('')}
      </div>` : '';
    // The Delver's counter: visible only while you stand by the Delver (in a cave).
    const nearDelver = world.nearDelver();
    const delverWares = nearDelver && world.descentStock.length ? `
      <div style="border:1px solid #2f5e5a;border-radius:4px;padding:8px;margin-bottom:8px;background:rgba(127,224,216,0.06)">
        <div style="color:#7fe0d8;font-weight:bold;font-size:12px;margin-bottom:4px">
          THE DELVER'S WARES — 30 ◈ each
          <span style="color:#5fb8b0;font-size:10px;font-weight:normal"> · ◈ ${world.descentEchoes} Echoes</span></div>
        ${world.descentStock.map((e, idx) => {
          const name = e.kind === 'skill' ? e.inst.def.name : e.gem.def.name;
          const lv = e.kind === 'skill' ? e.inst.level : e.gem.level;
          const col = e.kind === 'skill' ? SKILL_RARITIES[e.inst.rarity ?? 'common'].color : e.gem.def.color;
          const tags = e.kind === 'skill' ? e.inst.def.tags.join(' · ') : 'support gem';
          const tag = e.kind === 'skill' ? rarityTag(e.inst) : '';
          const broke = world.descentEchoes < 30;
          return `
          <div class="skill-entry" style="border-left:3px solid ${col}">
            <div class="name">${name} <span style="color:#ffd700">Lv ${lv}</span> ${tag}</div>
            <div class="tags">${tags}</div>
            <div class="bind-btns">
              <button data-delve="${idx}" ${broke ? 'disabled' : ''}>
                Buy (30 ◈)${broke ? ' — no Echoes' : ''}</button>
            </div>
          </div>`;
        }).join('')}
      </div>` : '';
    const slotsFull = m.knownSkills.size >= MAX_LEARNED_SKILLS;
    const skillGems = m.skillInv.map((inst, idx) => {
      const def = inst.def;
      const ok = meetsRequirements(world, def);
      const dupe = m.knownSkills.has(def.id);
      // Colour EACH requirement by whether THIS attribute is met (green) or not
      // (red) — so an unmet prerequisite is spotted at a glance even when others pass.
      const reqText = def.requirements
        ? Object.entries(def.requirements).map(([a, n]) => {
            const met = (m.attrs[a as AttributeId] ?? 0) >= (n ?? 0);
            return `<span style="color:${met ? '#6fc06f' : '#d05050'}">${ATTRIBUTES[a as AttributeId].short} ${n}</span>`;
          }).join(', ')
        : 'No requirements';
      const blocker = dupe ? 'already learned' : slotsFull ? 'all slots full' : !ok ? 'requirements unmet' : '';
      return `
        <div class="skill-entry" style="border-left:3px solid ${SKILL_RARITIES[inst.rarity ?? 'common'].color}">
          <div class="name">${def.name} <span style="color:#ffd700">Lv ${inst.level}</span> ${rarityTag(inst)}</div>
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

    // --- Support gems tab ------------------------------------------------------
    const gems = m.inventory.map((gem, idx) => {
      const targets = [...m.knownSkills.values()]
        .filter(inst => supportFitsInst(gem.def, inst) && inst.sockets.includes(null))
        .map(inst => `<button data-socket="${idx}:${inst.def.id}">${inst.def.name}</button>`)
        .join('') || '<span style="color:#8a8678">no socketable skill</span>';
      return `
        <div class="skill-entry" style="border-left:3px solid ${gem.def.color}">
          <div class="name">${gem.def.name} <span style="color:#ffd700">Lv ${gem.level}</span>
            <span style="color:#8a8678;font-weight:normal;font-size:10px">support gem</span></div>
          <div class="desc">${gem.def.description}</div>
          <div class="bind-btns">
            <button data-invlvl="${idx}" ${m.skillPoints < 1 || gem.level >= supportMaxLevel(gem.def) ? 'disabled' : ''}>
              Level Up (1 pt)</button>
            <button data-drop-support="${idx}" title="Drop this gem on the ground (any nearby player can pick it up)">Drop</button>
            Socket into: ${targets}
          </div>
        </div>`;
    }).join('') || '<div style="color:#8a8678;font-size:11px">Slain monsters drop support gems — walk over one to collect it.</div>';

    const tab = (id: string, label: string): string =>
      `<button class="book-tab ${this.bookTab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`;
    const body = this.bookTab === 'known' ? known
      : this.bookTab === 'skills' ? wares + delverWares + skillGems
      : gems;

    // Preserve the scroll position across the innerHTML rebuild — otherwise a
    // co-op client (which re-renders this panel whenever its meta re-replicates)
    // would yank the list back to the top on every scroll attempt.
    const prevScroll = this.skillBook.querySelector<HTMLElement>('.book-body')?.scrollTop ?? 0;
    const sameTab = this.lastBookTab === this.bookTab;

    this.skillBook.innerHTML = `
      <div class="book-head">
        <h2>Skill Book — <span style="color:#7ec8a0">${m.skillPoints} skill points</span>
          <span style="float:right;color:#b06bd4;font-size:11px;font-weight:normal">
            ${nearFont ? `FONT NEARBY · offerings ${m.offerings}/${OFFERINGS_PER_POINT}` : `offerings ${m.offerings}/${OFFERINGS_PER_POINT}`}</span></h2>
        <div class="book-tabs">
          ${tab('known', `Learned (${m.knownSkills.size}/${MAX_LEARNED_SKILLS})`)}
          ${tab('skills', `Skill Gems (${m.skillInv.length})`)}
          ${tab('gems', `Support Gems (${m.inventory.length})`)}
        </div>
      </div>
      <div class="book-body">${body}</div>`;

    // Restore the prior scroll offset (same tab only — a tab SWITCH starts at top).
    const bodyEl = this.skillBook.querySelector<HTMLElement>('.book-body');
    if (bodyEl && sameTab) bodyEl.scrollTop = prevScroll;
    this.lastBookTab = this.bookTab;

    this.skillBook.querySelectorAll<HTMLButtonElement>('.book-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.bookTab = btn.dataset.tab as typeof this.bookTab;
        this.refreshSkillBook();
      });
    });

    const refresh = (): void => this.refreshSkillBook();
    const q = <T extends HTMLElement>(sel: string): T[] =>
      [...this.skillBook.querySelectorAll<T>(sel)];

    // Every button routes the mutation through world.requestMeta — on the host /
    // single-player it applies immediately to the local seat; on a render-shell
    // CLIENT it ships the intent to the host (which mutates OUR seat + replicates
    // back). The UI reconciles on the next snapshot either way.
    q<HTMLButtonElement>('button[data-bind]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'bindSkill', slot: Number(btn.dataset.slot), skillId: btn.dataset.bind! });
      refresh();
    }));
    q<HTMLButtonElement>('button[data-learn]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'learn', index: Number(btn.dataset.learn) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-unlearn]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'unlearn', skillId: btn.dataset.unlearn! }); refresh();
    }));
    q<HTMLButtonElement>('button[data-buy]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'buyVendor', index: Number(btn.dataset.buy) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-delve]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'buyDelver', index: Number(btn.dataset.delve) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-sacrifice]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'sacrifice', index: Number(btn.dataset.sacrifice) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-levelup]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'levelSkill', skillId: btn.dataset.levelup! }); refresh();
    }));
    q<HTMLButtonElement>('button[data-invlvl]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'levelSupportInv', index: Number(btn.dataset.invlvl) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-gemlvl]').forEach(btn => btn.addEventListener('click', () => {
      const [skillId, sock] = btn.dataset.gemlvl!.split(':');
      world.requestMeta({ t: 'levelSupportSocket', skillId, socket: Number(sock) });
      refresh();
    }));
    q<HTMLButtonElement>('button[data-unsocket]').forEach(btn => btn.addEventListener('click', () => {
      const [skillId, sock] = btn.dataset.unsocket!.split(':');
      world.requestMeta({ t: 'unsocket', skillId, socket: Number(sock) });
      refresh();
    }));
    q<HTMLButtonElement>('button[data-socket]').forEach(btn => btn.addEventListener('click', () => {
      const [idx, skillId] = btn.dataset.socket!.split(':');
      world.requestMeta({ t: 'socket', index: Number(idx), skillId });
      refresh();
    }));
    q<HTMLButtonElement>('button[data-drop-skill]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'dropSkill', index: Number(btn.dataset.dropSkill) }); refresh();
    }));
    q<HTMLButtonElement>('button[data-drop-support]').forEach(btn => btn.addEventListener('click', () => {
      world.requestMeta({ t: 'dropSupport', index: Number(btn.dataset.dropSupport) }); refresh();
    }));
  }

  // ------------------------------------------------------------ passive tree

  toggleTree(): void {
    this.treeOpen = !this.treeOpen;
    this.passiveTree.classList.toggle('hidden', !this.treeOpen);
    if (this.treeOpen) {
      this.centerTreeOnStart();
      this.refreshTree();
    }
  }

  /** Fit box over every node (+padding) — the zoom/pan reference frame. */
  private computeTreeBox(): void {
    const allNodes = Object.values(PASSIVE_NODES);
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
    if (!this.treeOpen) return;
    const world = this.getWorld();
    const m = world.meta;

    // Fit the view to the NODE BOUNDS (not a fixed viewBox) so the tree stays
    // extensible — adding nodes anywhere just grows the fitted box; zoom/pan navigate.
    this.computeTreeBox();

    const RADII: Record<PassiveNode['kind'], number> = {
      start: 13, small: 9, notable: 14, keystone: 17, attr: 11, vocation: 15,
    };
    // VOCATION nodes exist for every defined vocation, but only the ones this
    // character has EARNED render (they share the star's central space).
    const visibleNode = (n: PassiveNode): boolean =>
      n.vocation === undefined || m.vocations.includes(n.vocation);
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
      // everything else spends normal passive points. Same adjacency walk.
      const available = !allocated
        && (voc
          ? m.vocationPoints > 0 && gateOpen && PASSIVE_ADJACENCY[node.id].some(n => m.allocated.has(n))
          : m.passivePoints > 0 && PASSIVE_ADJACENCY[node.id].some(n => m.allocated.has(n)));
      const fill = allocated ? (voc?.color ?? '#c8a84b')
        : node.kind === 'keystone' ? '#5a2a3a'
        : node.kind === 'notable' ? '#3a3a5a'
        : node.kind === 'attr' ? '#2a4a3a'
        : node.kind === 'vocation' ? '#241f33'
        : '#26262e';
      const stroke = node.kind === 'vocation' ? (voc?.color ?? '#ffe9a0')
        : allocated ? '#ffe9a0'
        : available ? '#d8d4c8'
        : voc && !gateOpen ? '#3a3648'
        : '#4a4a5e';
      const attrText = node.attributes
        ? '\n' + Object.entries(node.attributes).map(([a, v]) =>
            `+${v} ${ATTRIBUTES[a as AttributeId].label}`).join(', ')
        : '';
      const gateName = node.vocation !== undefined
        ? PASSIVE_NODES[vocationGateNodeId(node.vocation) ?? '']?.name : undefined;
      const vocText = voc
        ? `\n[${voc.name} vocation — spends vocation points${gateOpen ? '' : ` — LOCKED until ${gateName ?? 'its class start node'} is allocated`}]`
        : '';
      circles += `<circle cx="${node.x}" cy="${node.y}" r="${RADII[node.kind]}"
        fill="${fill}" stroke="${stroke}" stroke-width="${node.kind === 'keystone' || node.kind === 'notable' || node.kind === 'vocation' ? 2.5 : 1.5}"
        data-node="${node.id}" class="tree-node ${available ? 'available' : ''} ${allocated ? 'allocated' : ''}">
        <title>${node.name} — ${node.description}${attrText}${vocText}</title>
      </circle>`;
    }

    // The DEV editor works in the raw 6000×6000 coordinate space;
    // play mode uses the auto-fit + zoom/pan viewBox.
    const viewBox = DEV.passiveTreeEditor ? '0 0 6000 6000' : this.treeViewBox();
    const zPct = Math.round(this.treeZoom * 100);
    // Vocation header chip: the separate point pool, plus a "path to the gate"
    // nudge while the spending gate is still closed.
    const vocChips = m.vocations.map(vid => {
      const voc = VOCATIONS[vid];
      if (!voc) return '';
      const open = vocationGateOpen(m.allocated, vid);
      const gateName = PASSIVE_NODES[vocationGateNodeId(vid) ?? '']?.name;
      return ` · <span style="color:${voc.color}">${m.vocationPoints} vocation (${voc.name})</span>`
        + (open ? '' : ` <span style="color:#8a8678;font-size:11px">— locked: allocate ${gateName ?? 'its class start'}</span>`);
    }).join('');
    this.passiveTree.innerHTML = `
      <h2>Passive Tree — <span style="color:#ffd700">${m.passivePoints} points</span>${vocChips}
        <span style="float:right;color:#8a8678;font-size:11px;font-weight:normal">
          ${DEV.passiveTreeEditor ? '' : `<span class="tree-zoom-grp">
            <button class="tree-zoom" data-tz="out" title="zoom out">−</button>
            <button class="tree-zoom" data-tz="reset" title="reset zoom">${zPct}%</button>
            <button class="tree-zoom" data-tz="in" title="zoom in">＋</button>
          </span> &nbsp;`}${m.allocated.size} allocated · click to allocate${DEV.passiveTreeEditor ? '' : ' · scroll to zoom, drag to pan'}</span></h2>
      <svg viewBox="${viewBox}" id="tree-svg" style="cursor:grab;touch-action:none">${edges}${circles}</svg>`;

    // In EDITOR mode, clicks SELECT nodes (the editor wires that up) — skip the
    // play-mode allocate handler so the two don't fight over the same click.
    if (!DEV.passiveTreeEditor) {
      this.passiveTree.querySelectorAll<SVGCircleElement>('.tree-node.available').forEach(el => {
        el.addEventListener('click', () => {
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

  // -------------------------------------------------------------- world map

  toggleMap(): void {
    this.mapOpen = !this.mapOpen;
    this.worldMap.classList.toggle('hidden', !this.mapOpen);
    // The hover/pin selection is per-viewing — start each open on the current zone.
    this.hoveredZone = null;
    this.pinnedZone = null;
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
    const esc = (s: string): string => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));
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
    const esc = (s: string): string => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));
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

  // ------------------------------------------------------------ vocation menu

  /** Open the VOCATION CHOICE menu (the quartermaster's dwell requested it —
   *  a specialization is a deliberate pick, never a random dwell auto-accept). */
  showVocationMenu(): void {
    this.hideAll();
    this.vocationOpen = true;
    this.vocationMenu.classList.remove('hidden');
    this.refreshVocationMenu();
  }

  closeVocationMenu(): void {
    this.vocationOpen = false;
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
    const esc = (s: string): string => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));
    const offers = world.vocationMenuOffers();
    const rows = offers.length
      ? offers.map(o => `<div class="skill-entry">
          <div class="name" style="color:${esc(o.color)}">${esc(o.name)}
            <span class="tags">· ${esc(o.className)}'s calling${o.ownClass ? ' (your class)' : ' · unlocked by a past hero'}</span></div>
          <div class="desc">${esc(o.blurb)}</div>
          <div class="desc" style="font-style:italic">A chain of ${o.steps} trials begins: “${esc(o.offerLabel)}”</div>
          <div class="bind-btns"><button data-vocation-quest="${esc(o.questId)}">Undertake</button></div>
        </div>`).join('')
      : `<div class="skill-entry"><div class="desc">No callings are open to you right now.</div></div>`;
    this.vocationMenu.innerHTML = `<h2>A Calling</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">"Not work this time, traveller — a VOCATION. Finish its trials and the heart of the star opens to you. One calling per lifetime; choose it well."</div>`
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

  showToll(): void {
    this.hideAll();
    this.tollOpen = true;
    this.tollMenu.classList.remove('hidden');
    this.refreshToll();
  }

  closeToll(): void {
    this.tollOpen = false;
    this.tollMenu.classList.add('hidden');
    // Re-arm is automatic: the keeper dwell is a consumed latch — it re-fires only once
    // the player steps away and breaks the dwell (so closing won't instantly re-open).
  }

  /** The toll BARGAIN (drop-to-choose): offer ONE unsocketed support gem; the wardens
   *  take it and the gate opens, the gem you give steering the hidden road. Picks route
   *  through requestMeta (host-authoritative), mirroring the Caravan menu. */
  refreshToll(): void {
    if (!this.tollOpen) return;
    const world = this.getWorld();
    const esc = (s: string): string => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));
    const gems = world.holdfastTollGems();
    const rows = gems.length
      ? gems.map((g, i) => `<div class="skill-entry">
          <div class="name" style="color:${esc(g.color)}">${esc(g.name)}</div>
          <div class="bind-btns"><button data-toll="${i}">Offer this</button></div>
        </div>`).join('')
      : `<div class="skill-entry"><div class="desc">You carry no loose support gems to offer the wardens.</div></div>`;
    this.tollMenu.innerHTML = `<h2>The Toll</h2>`
      + `<div class="desc" style="margin:-4px 0 10px 0;font-style:italic">"One gem buys your passage, traveller. Choose well — what you give shapes what lies beyond."</div>`
      + rows
      + `<div class="bind-btns" style="margin-top:10px"><button data-toll-close>Walk away</button></div>`;
    this.tollMenu.querySelectorAll<HTMLButtonElement>('button[data-toll]').forEach(btn => {
      btn.addEventListener('click', () => {
        world.requestMeta({ t: 'payToll', index: Number(btn.dataset.toll) });
        this.closeToll();
      });
    });
    this.tollMenu.querySelector<HTMLButtonElement>('[data-toll-close]')?.addEventListener('click', () => this.closeToll());
  }

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
        edges += `<line x1="${z.map.x}" y1="${z.map.y}" x2="${b.map.x}" y2="${b.map.y}"
          stroke="${known ? '#5a5a72' : '#2c2c3a'}" stroke-width="2"
          ${known ? '' : 'stroke-dasharray="4 5"'}/>`;
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
      const current = world.zone.id === z.id;
      const wp = world.discoveredWaypoints.has(z.id);
      const canTravel = wp && !current;
      // Charted ground reads as its biome (a terrain map); the faction washes
      // from the sim sit on top, so you see both the land and who holds it.
      const bi = known ? biomeOf(z) : null;
      const fill = known ? (bi?.mapColor ?? z.theme.accent) : '#26262e';
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
          fill="${fill}" fill-opacity="${known ? 0.85 : 1}"
          stroke="${pinned ? '#5ad8d8' : current ? '#ffd700' : known ? '#d8d4c8' : '#4a4a5e'}"
          stroke-width="${pinned ? 3 : current ? 3 : 1.5}"
          ${canTravel ? `class="wp-node" data-wp="${z.id}" style="cursor:pointer"` : ''}/>
        ${wp ? `<rect x="${z.map.x - 16.5}" y="${z.map.y - 16.5}" width="9" height="9"
          fill="#5ad8d8" transform="rotate(45 ${z.map.x - 12} ${z.map.y - 12})"
          ${canTravel ? `class="wp-node" data-wp="${z.id}" style="cursor:pointer"` : ''}>
          <title>Waypoint — click to travel</title></rect>` : ''}
        ${z.port ? `<text x="${z.map.x + 14}" y="${z.map.y - 10}" text-anchor="middle"
          font-size="11" fill="#9ad0e8">⚓<title>Port — sail from its dock</title></text>` : ''}
        <text x="${z.map.x}" y="${z.map.y + 26}" text-anchor="middle"
          font-size="11" fill="${known ? '#d8d4c8' : '#55555f'}">${known ? z.name : '???'}</text>
        ${known ? `<text x="${z.map.x}" y="${z.map.y + 38}" text-anchor="middle"
          font-size="9" fill="${bi ? bi.mapColor : '#8a8678'}">${sub}</text>` : ''}
        ${here}</g>`;
    }

    // World-sim overlays: drifting weather fronts and faction territory.
    // Washes sit under the roads/nodes; contest badges ride on top. Territory
    // only paints ground you've charted; the sky (weather) drifts everywhere.
    // SURFACE ONLY: the world-sim doesn't govern other dimensions (hell zones
    // never seed it — see chartFrontier), so its fronts/territory/biome wash
    // must not drift over the underworld tab.
    const known = zones.filter(z => visited.has(z.id));
    const layers = dim === 'surface' ? world.sim.mapLayers(known) : [];
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
        // The step SCALES with the box (≤ ~4000 cells) so a run that charts far
        // and wide coarsens the wash instead of growing the sweep unbounded.
        const step = Math.max(130, Math.ceil(Math.sqrt((spanW * spanH) / 4000) / 10) * 10);
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
              const fill = BIOMES[world.dimensionBiomeAtMap(dim, { x: x + step / 2, y: y + step / 2 })]?.mapColor;
              if (!fill) continue;
              ocean += `<rect x="${x}" y="${y}" width="${step}" height="${step}" fill="${fill}" opacity="0.12"/>`;
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
    const esc = (s: string): string => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));
    let deaths = '';
    for (const m of collectMarkers(world)) {
      const node = m.zoneId ? world.zoneMap[m.zoneId] : undefined;
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
  }

  /** The QUESTS view of the map panel: the journal of active + completed quests. */
  private renderQuestsTab(world: World): void {
    const esc = (s: string): string => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));
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
    const esc = (s: string): string => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));
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
    this.deathScreen.innerHTML = `
      <h1>YOU HAVE DIED</h1>
      <div>Level ${world.player.level} ${world.meta.classDef.name}
        &nbsp;·&nbsp; fell in ${world.zone.name} &nbsp;·&nbsp;
        ${world.visited.size} zones explored &nbsp;·&nbsp; ${world.kills} kills</div>
      <div style="margin:14px 0;color:var(--gold);font-weight:bold">
        +${creditsEarned} credits &nbsp;·&nbsp; Account Level ${acc.level} &nbsp;·&nbsp; ${acc.credits} credits</div>
      <button id="unlocks-btn">Unlocks</button>
      <button id="restart-btn">Rise Again</button>`;
    this.deathScreen.classList.remove('hidden');
    document.getElementById('unlocks-btn')!.addEventListener('click',
      () => this.showAccountScreen(() => this.showDeath(creditsEarned, onRestart)));
    document.getElementById('restart-btn')!.addEventListener('click', () => {
      this.deathScreen.classList.add('hidden');
      onRestart();
    });
  }

  // ------------------------------------------------------------ escape menu

  /** The in-run pause menu (Escape): resume, remap keys, end the run, or close.
   *  While it's open `escapeMenuOpen` is true and gameplay input is paused. */
  showEscapeMenu(): void {
    this.escapeMenuOpen = true;
    const root = this.escapeMenu;

    const showMain = (): void => {
      root.innerHTML = `
        <h1>Paused</h1>
        <div class="esc-btns">
          <button id="esc-resume">Resume</button>
          <button id="esc-keys">Customize Keybinds</button>
          <button id="esc-end">${this.isCoopClient() ? 'Leave Co-op' : 'End Run'}</button>
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
        if (window.confirm('End this run and bank your account credits? Your character will be lost (permadeath).')) {
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
    this.disarmRebind(); // Esc-dismissal can close the keybind sub-view mid-arm
    this.escapeMenu.classList.add('hidden');
  }

  /** Tear down any pending rebind capture listener (see `armedRebind`). Safe to
   *  call when none is armed. Invoked on every re-render and on any navigation
   *  away from the keybind view. */
  private disarmRebind(): void {
    if (this.armedRebind) {
      window.removeEventListener('keydown', this.armedRebind, true);
      this.armedRebind = null;
    }
  }

  /** Shared keybind rebind view, rendered into `root` (escape menu OR start
   *  menu). `onBack` returns to whichever menu opened it. */
  private renderKeybinds(root: HTMLElement, onBack: () => void): void {
    this.disarmRebind(); // drop any capture left armed by a prior render
    const kb = this.getSettings().keybinds;
    const rows = ACTION_IDS.map(a => `
      <div class="rebind-row">
        <span>${ACTION_LABELS[a]}</span>
        <button data-rebind="${a}">${kb[a].toUpperCase()}</button>
      </div>`).join('');
    root.innerHTML = `
      <h1>Keybinds</h1>
      <div class="acct-head">LMB / RMB drive skills 1 &amp; 2 (fixed). Click a key, then press a new one (Esc cancels).</div>
      <div class="rebind-list">${rows}</div>
      <div class="rebind-row">
        <span>Low-Life Screen Pulse</span>
        <button id="opt-lowlife">${this.getSettings().lowLifePulse ? 'ON' : 'OFF'}</button>
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
    root.querySelectorAll<HTMLElement>('[data-rebind]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.disarmRebind(); // only one row can be armed at a time
        btn.textContent = 'press a key…';
        const onKey = (e: KeyboardEvent): void => {
          e.preventDefault();
          e.stopImmediatePropagation();  // keep the key out of the game's input
          this.disarmRebind();           // removes this very listener
          if (e.key !== 'Escape') {
            this.getSettings().keybinds[btn.dataset.rebind as ActionId] = e.key.toLowerCase();
            this.saveSettings();
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

  /** The launch screen: Start New / Continue / Vault / Keybinds. */
  showStartMenu(onStart: (d: ClassDef) => void, onContinue: (s?: CharacterSave | null) => void, onCoop?: () => void): void {
    this.hideAll();
    this.startHandlers = { onStart, onContinue, onCoop };
    this.renderStartMenu();
    this.startMenu.classList.remove('hidden');
  }

  private renderStartMenu(): void {
    const acc = this.getAccount();
    const h = this.startHandlers!;
    const canContinue = !!this.continueSave;
    this.startMenu.innerHTML = `
      <h1>ARPG TEST GAME</h1>
      <div class="acct-head">Account Level <b>${acc.level}</b> · <b>${acc.credits}</b> credits</div>
      <div class="esc-btns">
        <button id="sm-start">Start New Game</button>
        <button id="sm-continue" ${canContinue ? '' : 'disabled'}>${canContinue ? 'Continue' : 'No Save Found'}</button>
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
    document.getElementById('sm-vault')!.addEventListener('click', () =>
      this.showAccountScreen(() => this.showStartMenu(h.onStart, h.onContinue, h.onCoop)));
    document.getElementById('sm-keys')!.addEventListener('click', () =>
      this.renderKeybinds(this.startMenu, () => this.showStartMenu(h.onStart, h.onContinue, h.onCoop)));
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
        enabled: pref ? pref.enabled : p.defaultEnabled,
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
      const active = pkgs.filter(p => !p.alwaysOn && cfg[p.id].enabled && cfg[p.id].startLevel <= 100);
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
    this.skillBookOpen = false;
    this.treeOpen = false;
    this.mapOpen = false;
    this.caravanOpen = false;
    this.tollOpen = false;
    this.sailOpen = false;
    this.vocationOpen = false;
    this.classSelect.classList.add('hidden');
    this.charSheet.classList.add('hidden');
    this.skillBook.classList.add('hidden');
    this.passiveTree.classList.add('hidden');
    this.worldMap.classList.add('hidden');
    this.caravanMenu.classList.add('hidden');
    this.tollMenu.classList.add('hidden');
    this.sailMenu.classList.add('hidden');
    this.vocationMenu.classList.add('hidden');
    this.deathScreen.classList.add('hidden');
    this.accountScreen.classList.add('hidden');
    this.escapeMenu.classList.add('hidden');
    this.startMenu.classList.add('hidden');
    this.expeditionSetup.classList.add('hidden');
    this.escapeMenuOpen = false;
    this.disarmRebind();
    hideTooltip();
  }
}
