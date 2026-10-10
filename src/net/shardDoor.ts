// ---------------------------------------------------------------------------
// THE FRONT DOOR (W7; docs/engine/shard.md "THE FRONT DOOR", the charter's §7e
// "The player's first hour"): the client's pure decisions at a hosted world's
// door and at its goodbye, kept apart from the DOM so a rig can pin each one
// (balance/probe_sharddoor.ts).
//
//   THE DOOR           the world this tab is bound for (a lobby join, the front
//                      door, a session that was lost), kept in sessionStorage so
//                      a reload and the main menu keep it; only a deliberate
//                      leave (the pause menu's Leave or Exit on a world, or a
//                      solo road chosen at the menu) forgets it.
//   THE HOME SLOT TAG  a mirrored save names the world it lives on (`shard`:
//                      its address, its seed, its name). Continue on such a save
//                      is a RETURN (THE LOGIN THROUGH MU with its charId) and
//                      never a solo resume (meta/resumeWorld.ts refuses it too).
//   THE SOLO GUARD     a mirror never replaces a standing solo world without the
//                      player's word (the lobby's line and its confirm, or a hero
//                      woken in Mu for that very world).
//   THE STOPGAP NAME   an unnamed hero wears its class and a short number on a
//                      world, so two Warriors are told apart. A STOPGAP: the Mu
//                      card's naming is the honest fix.
//   THE WORDS          one plain line per failure, the return's word, and the
//                      farewell's line.
//
// The served-origin detection (THE SERVED MARK) lives beside the address
// grammar in net/ws.ts. Browser-safe and Node-safe: nothing here touches the
// DOM at import time.
// ---------------------------------------------------------------------------

import { storageKey } from '../buildProfile';
import { normalizeShardUrl, type ShardFarewell } from './ws';
import { SHARD_VESSEL_MAX_CHARS } from './shardBuild';

export const SHARD_DOOR_CFG = {
  /** THE DOOR's page-surviving copy (sessionStorage: this tab alone). */
  doorKey: 'hw_shard_door',
  /** THE BUILD MISMATCH's one reload (sessionStorage): the address and stamp it reloaded for. */
  reloadKey: 'hw_shard_reload',
  /** THE STOPGAP NAME's numbers: one in [lo, hi) picked by the account's own hash (the same
   *  player wears the same number), the next free one when another hero wears it. */
  stopgapRange: [10, 100] as [number, number],
  /** A roster row's name ceiling (server/shardTransport.ts SHARD_WIRE_CFG.maxNameChars). */
  maxName: 24,
  /** The longest world name a menu prints. */
  maxWorldName: 64,
};

/** THE DOOR: the world a tab is bound for. */
export interface ShardDoor { url: string; world?: string }
/** THE HOME SLOT TAG: the world a mirrored save lives on. */
export interface ShardHome { url: string; seed: number; world?: string }

type TabStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
/** This tab's sessionStorage, or null (a Node rig, a sandboxed frame). */
function tabStore(): TabStore | null {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; }
}
const worldText = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, SHARD_DOOR_CFG.maxWorldName) : undefined;

/** THE DOOR, as this tab kept it (null: not bound). */
export function readDoor(store: TabStore | null = tabStore()): ShardDoor | null {
  if (!store) return null;
  try {
    const v = JSON.parse(store.getItem(storageKey(SHARD_DOOR_CFG.doorKey)) ?? 'null') as Partial<ShardDoor> | null;
    if (!v || typeof v.url !== 'string' || !v.url.trim()) return null;
    const world = worldText(v.world);
    return { url: normalizeShardUrl(v.url), ...(world ? { world } : {}) };
  } catch { return null; }
}
/** Bind this tab to a world (it survives a reload and the menu). */
export function writeDoor(door: ShardDoor, store: TabStore | null = tabStore()): void {
  if (!store) return;
  const world = worldText(door.world);
  try { store.setItem(storageKey(SHARD_DOOR_CFG.doorKey), JSON.stringify({ url: normalizeShardUrl(door.url), ...(world ? { world } : {}) })); }
  catch { /* storage may refuse */ }
}
/** THE DELIBERATE LEAVE: the tab forgets the world it was bound for. */
export function forgetDoor(store: TabStore | null = tabStore()): void {
  if (!store) return;
  try { store.removeItem(storageKey(SHARD_DOOR_CFG.doorKey)); } catch { /* storage may refuse */ }
}

/** THE HOME SLOT TAG a save carries, checked (null: none, or malformed). */
export function shardHomeOf(save: unknown): ShardHome | null {
  const h = save && typeof save === 'object' ? (save as { shard?: unknown }).shard : undefined;
  if (!h || typeof h !== 'object') return null;
  const o = h as Partial<ShardHome>;
  if (typeof o.url !== 'string' || !o.url.trim() || typeof o.seed !== 'number' || !Number.isFinite(o.seed)) return null;
  const world = worldText(o.world);
  return { url: normalizeShardUrl(o.url), seed: o.seed >>> 0, ...(world ? { world } : {}) };
}

/** A world's name as a player reads it: the name its welcome gave, else its host. */
export function worldNameOf(w: { url: string; world?: string }): string {
  if (w.world) return w.world;
  const m = /^wss?:\/\/([^/:?#]+)/i.exec(w.url);
  return m ? m[1] : w.url;
}

/** Do two addresses name one world (THE ADDRESS grammar, normalized)? */
export function sameWorld(a: string, b: string): boolean {
  return normalizeShardUrl(a) === normalizeShardUrl(b);
}

/** HOME SLOTS (W7): what the menu's Continue does with a save. A save bound to a world is
 *  a RETURN (THE LOGIN THROUGH MU naming its charId), never a solo resume. */
export type ContinueRoute = { kind: 'return'; home: ShardHome; charId?: string } | { kind: 'solo' };
export function continueRoute(save: unknown): ContinueRoute {
  const home = shardHomeOf(save);
  if (!home) return { kind: 'solo' };
  const charId = (save as { charId?: unknown }).charId;
  return { kind: 'return', home, ...(typeof charId === 'string' && charId ? { charId } : {}) };
}

/** THE SOLO GUARD's backstop (meta/resumeWorld.ts): a solo resume refuses a bound save. */
export function soloResumeRefusal(save: unknown): string | null {
  const home = shardHomeOf(save);
  return home ? `This hero lives on ${worldNameOf(home)}: return to it from the menu.` : null;
}

/** THE SOLO GUARD (W7): may a mirror land in a slot that holds a standing solo world (a
 *  world half that no world is bound to)? Only with the player's word (`consent`). */
export function mirrorMayReplace(slot: { soloWorld: boolean }, consent: boolean): boolean {
  return !slot.soloWorld || consent;
}

/** THE FRONT DOOR's pre-check: a hero larger than a world carries (its world half dropped). */
export function vesselTooLarge(save: unknown): boolean {
  try { return JSON.stringify(save).length > SHARD_VESSEL_MAX_CHARS; } catch { return true; }
}

/** One plain line from a failure: no "Error:" prefix, a capital first letter and a stop. */
export function doorWord(e: unknown, fallback = 'the world did not answer'): string {
  let s = (e instanceof Error ? e.message : typeof e === 'string' ? e : '').replace(/^(?:[A-Za-z]*Error):\s*/, '').trim();
  if (!s) s = fallback;
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return /[.!?]$/.test(s) ? s : s + '.';
}

/** THE RETURN'S WORD (W7): the menu's line when a world's connection was lost and the
 *  return failed, carrying the shard's own word (no seat, another build, silence). */
export function returnWord(world: string, word: string): string {
  const w = word.trim().replace(/[.!?]+$/, '');
  return `The connection to ${world} was lost${w ? `: ${w}` : ''}.`;
}

/** THE HONEST LEAVING (W7): the farewell's one line on the menu or the exit screen. */
export function farewellLine(f: ShardFarewell, hero: string, world: string): string {
  if (f.end === 'saved') return `${hero} is saved, and wakes where you left it in ${world}.`;
  if (f.end === 'held') {
    const w = (f.word ?? '').trim().replace(/[.!?]+$/, '');
    return `${w ? w.charAt(0).toUpperCase() + w.slice(1) : 'Your hero stands its ground'}, then rests where it stood.`;
  }
  return `${world} did not answer in time; ${hero} is saved as of the last beat.`;
}

/** A small stable hash (FNV-1a) of a salt: THE STOPGAP NAME's number. */
function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** THE STOPGAP NAME (W7; the Mu card's naming is the honest fix): the name a hero wears
 *  on a world. A hero never named (no name, the old "Joiner", or its class's own name)
 *  wears its class and a short number picked by `salt` (its account: the same player
 *  wears the same number), and any name another hero already wears (`taken`, matched
 *  without case) takes the next free number, so no two heroes on a world read alike. */
export function shardHeroName(base: string, className: string, salt: string, taken: Iterable<string>): string {
  const used = new Set<string>();
  for (const t of taken) used.add(t.trim().toLowerCase());
  const name = base.trim(), cls = className.trim() || 'Hero';
  const unnamed = !name || name === 'Joiner' || name.toLowerCase() === cls.toLowerCase();
  if (!unnamed && !used.has(name.toLowerCase())) return name.slice(0, SHARD_DOOR_CFG.maxName);
  const stem = unnamed ? cls : name;
  const [lo, hi] = SHARD_DOOR_CFG.stopgapRange;
  const span = Math.max(1, hi - lo);
  // An unnamed hero walks the range from its own number; a named clash counts up from 2.
  const at = (i: number): number => unnamed ? (i < span ? lo + ((fnv(salt) + i) % span) : hi + (i - span)) : 2 + i;
  for (let i = 0; i < 10_000; i++) {
    const suffix = ' ' + at(i);
    const cand = stem.slice(0, Math.max(1, SHARD_DOOR_CFG.maxName - suffix.length)) + suffix;
    if (!used.has(cand.toLowerCase())) return cand;
  }
  return stem.slice(0, SHARD_DOOR_CFG.maxName);
}

/** THE BUILD MISMATCH on a served page (W7): the page's client is older (or newer) than
 *  the world that served it, so the page reloads ONCE for that address and stamp (a
 *  served client updates with its shard); true = reload now. A second mismatch for the
 *  same pair stands (the menu says the word instead of a reload loop). */
export function reloadOnceFor(url: string, stamp: string, store: TabStore | null = tabStore()): boolean {
  if (!store) return false;
  const key = storageKey(SHARD_DOOR_CFG.reloadKey), mark = normalizeShardUrl(url) + '#' + stamp;
  try {
    if (store.getItem(key) === mark) return false;
    store.setItem(key, mark);
    return true;
  } catch { return false; }
}
