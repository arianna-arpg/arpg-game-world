// ---------------------------------------------------------------------------
// THE MENU FABRIC — the game's pages as an open registry the HUD can INDEX.
//
// Her ask (2026-09-05): a Menu button on the HUD whose menu houses the
// inventory, the passive tree, the character sheet and the rest as
// selectable, iconed buttons; movable; dynamic — "if something is not yet
// unlocked it simply wouldn't show up; if a feature has been unlocked but
// progress within the run hasn't yet been met where it's usable, it shows
// up greyed out"; the tutorial can make the Menu icon glow and then the
// Inventory icon; the Passive Tree icon glows while points sit unspent —
// SHOW, never the old "X passive points — press P" line.
//
// THE SHAPE: a page is a MenuEntryDef row (data/menu.ts) — a label, an icon
// id (ui/icons.ts), a group, a UI VERB id (the DOM bar's host table opens it),
// the bind that also opens it, an account-level GATE and a run-level USABLE
// read. The engine folds each row into ONE of three states:
//
//   hidden — THE EXISTENCE LAW: the gate (meta/gates.ts GateRow avenues over
//            the MERGED ledger — account + this run) is unmet. The page does
//            not exist for this account yet; the menu never names it.
//   sealed — THE REACH LAW: the gate holds but `usable` reads false right now
//            (a station page away from its station, a counter in the wilds).
//            Drawn greyed, unselectable, its `sealedHint` the tooltip's why.
//   open   — selectable; its verb opens the page for the seat.
//
// ATTENTION is a second open registry (MenuAttentionSource rows): a PIP
// source counts something unspent on a page (passive points, banked ability
// points) and a LESSON source names the page a live tutorial wants the
// player to open next (Mireille's flasks → the inventory). The fold reads
// every source over the non-hidden entries; the DOM bar draws counts as
// badges, lessons as the tutorial glow, and rolls both up onto the one
// button while the tray is closed — the button IS the tell.
//
// LAWS: reads are PURE (no source writes); the fold takes a MenuReads bag —
// account, world, seat, the UI's own "is this page open" read (a lesson
// on an OPEN page has already been followed) and the catalog's ownership
// closure (this leaf never imports the catalog) — so probes fold it
// headless with stub reads. Everything the UI needs per frame comes from
// ONE call (menuFold), computed once, never per tile.
// ---------------------------------------------------------------------------

import { gateMet, type GateRow } from '../meta/gates';
import type { Account } from '../meta/account';
import type { ActionId } from '../meta/settings';
import type { Seat, World } from './world';

export type MenuEntryState = 'hidden' | 'sealed' | 'open';

/** What a fold reads. `pageOpen` is the UI's truth (a verb's own open flag);
 *  `ownedUnlock` is the catalog's ownership predicate (meta/unlocks.ts
 *  ownedUnlockById) so `unlock:` gate rows resolve without this leaf
 *  importing the catalog. */
export interface MenuReads {
  account: Account;
  world: World;
  seat: Seat;
  pageOpen: (entryId: string) => boolean;
  ownedUnlock: (unlockId: string) => boolean;
}

export interface MenuGroupDef {
  id: string;
  label: string;
  /** Tray order (ascending). */
  order: number;
}

export interface MenuEntryDef {
  id: string;
  label: string;
  /** ui/icons.ts MENU_ICONS id. */
  icon: string;
  /** MENU_GROUPS id. */
  group: string;
  /** The DOM bar's host-verb id (ui/panels.ts wires one row per verb:
   *  open(seatId) + isOpen()). A row naming an unknown verb is a probe
   *  failure, never a silent dead tile. */
  verb: string;
  /** The keyboard/pad action that also opens this page — the row prints
   *  its live bind (never a baked key). */
  bind?: ActionId;
  /** A fixed key label for pages opened by a hardwired key (Escape). */
  keyLabel?: string;
  /** THE EXISTENCE LAW: account-level avenues (meta/gates.ts). `any` = the
   *  family law (one held row opens it); `all` = the conjunction. Absent =
   *  the page always exists. Read over the MERGED ledger (World.ledgerView)
   *  so a run-scope stamp counts the moment it lands. */
  gate?: { any?: readonly GateRow[]; all?: readonly GateRow[] };
  /** THE REACH LAW: is the page usable RIGHT NOW for this seat? Absent =
   *  always (the keyed panels). A station page reads its own near-read. */
  usable?: (r: MenuReads) => boolean;
  /** Why it is sealed — the tooltip's one plain line. */
  sealedHint?: string | ((r: MenuReads) => string);
  /** The tooltip's description while open. */
  blurb?: string;
  /** Order inside its group (ascending). */
  order: number;
}

export interface MenuAttentionSource {
  id: string;
  /** The entry this source speaks for. */
  entry: string;
  /** 'pip' counts something unspent; 'lesson' names the next click. */
  kind: 'pip' | 'lesson';
  /** A count (pip) or a verdict (lesson). A pip read returning 0 and a
   *  lesson read returning false are the quiet state. */
  read: (r: MenuReads) => number | boolean;
}

export interface MenuAttention {
  pips: number;
  lesson: boolean;
}

export interface MenuEntryView {
  def: MenuEntryDef;
  state: MenuEntryState;
  attention: MenuAttention;
  /** The sealed line resolved for this seat (empty while open). */
  sealedHint: string;
}

export interface MenuFold {
  /** Non-hidden entries, grouped in group order then entry order. */
  groups: { group: MenuGroupDef; entries: MenuEntryView[] }[];
  /** Every non-hidden entry, flat, in the same order. */
  entries: MenuEntryView[];
  /** The roll-up the one button wears: pips summed, any lesson pending. */
  total: MenuAttention;
}

export const MENU_GROUPS: MenuGroupDef[] = [];
export const MENU_ENTRIES: MenuEntryDef[] = [];
export const MENU_ATTENTION: MenuAttentionSource[] = [];

export function registerMenuGroup(def: MenuGroupDef): void {
  if (MENU_GROUPS.some(g => g.id === def.id)) throw new Error(`menu group '${def.id}' registered twice`);
  MENU_GROUPS.push(def);
}

export function registerMenuEntry(def: MenuEntryDef): void {
  if (MENU_ENTRIES.some(e => e.id === def.id)) throw new Error(`menu entry '${def.id}' registered twice`);
  if (!MENU_GROUPS.some(g => g.id === def.group)) throw new Error(`menu entry '${def.id}' names unknown group '${def.group}'`);
  MENU_ENTRIES.push(def);
}

export function registerMenuAttention(src: MenuAttentionSource): void {
  if (MENU_ATTENTION.some(s => s.id === src.id)) throw new Error(`menu attention source '${src.id}' registered twice`);
  MENU_ATTENTION.push(src);
}

/** The account as the gatework sees it for THIS fold: the merged ledger
 *  (account + run) under the account's own features/unlocks. */
function gateAccount(r: MenuReads): Account {
  return { ...r.account, ledger: r.world.ledgerView() };
}

/** THE EXISTENCE LAW for one entry. */
export function menuEntryExists(def: MenuEntryDef, r: MenuReads, acc: Account = gateAccount(r)): boolean {
  const g = def.gate;
  if (!g) return true;
  if (g.any && !gateMet(acc, g.any, 'any', r.ownedUnlock)) return false;
  if (g.all && !gateMet(acc, g.all, 'all', r.ownedUnlock)) return false;
  return true;
}

/** One entry's state — the three-way fold. */
export function menuEntryState(def: MenuEntryDef, r: MenuReads, acc?: Account): MenuEntryState {
  if (!menuEntryExists(def, r, acc)) return 'hidden';
  return !def.usable || def.usable(r) ? 'open' : 'sealed';
}

/** The attention every non-hidden entry wears: pips summed over its pip
 *  sources, lesson true when any lesson source names it AND its page is
 *  not already open (an open page has been reached — the glow moves on). */
export function menuAttentionOf(entryId: string, r: MenuReads): MenuAttention {
  let pips = 0;
  let lesson = false;
  for (const s of MENU_ATTENTION) {
    if (s.entry !== entryId) continue;
    const v = s.read(r);
    if (s.kind === 'pip') pips += Math.max(0, Math.floor(typeof v === 'number' ? v : v ? 1 : 0));
    else if (v) lesson = true;
  }
  if (lesson && r.pageOpen(entryId)) lesson = false;
  return { pips, lesson };
}

/** THE FOLD — everything the bar draws, computed once. */
export function menuFold(r: MenuReads): MenuFold {
  const acc = gateAccount(r);
  const groups = [...MENU_GROUPS].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const out: MenuFold = { groups: [], entries: [], total: { pips: 0, lesson: false } };
  for (const group of groups) {
    const rows = MENU_ENTRIES.filter(e => e.group === group.id)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const views: MenuEntryView[] = [];
    for (const def of rows) {
      const state = menuEntryState(def, r, acc);
      if (state === 'hidden') continue;
      const attention = menuAttentionOf(def.id, r);
      const sealedHint = state === 'sealed'
        ? (typeof def.sealedHint === 'function' ? def.sealedHint(r) : def.sealedHint ?? 'Not usable here.')
        : '';
      views.push({ def, state, attention, sealedHint });
      out.entries.push(views[views.length - 1]);
      out.total.pips += attention.pips;
      if (attention.lesson) out.total.lesson = true;
    }
    if (views.length) out.groups.push({ group, entries: views });
  }
  return out;
}

/** The entry a live lesson points at, or null — the first in fold order. */
export function menuLessonTarget(fold: MenuFold): MenuEntryView | null {
  return fold.entries.find(e => e.attention.lesson) ?? null;
}
