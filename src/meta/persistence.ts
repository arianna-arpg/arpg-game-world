// ---------------------------------------------------------------------------
// ACCOUNT + SETTINGS PERSISTENCE — hybrid disk + localStorage.
//
// Writes go to BOTH a real file on disk (via the dev/preview Vite plugin's
// /__save endpoints) AND localStorage (a synchronous cache). Loads prefer the
// disk file (so a save survives the browser data being cleared / a different
// profile), falling back to localStorage if the endpoint is absent (e.g. a
// static production host). Either way a fresh default is returned on anything
// wrong — wipe-on-mismatch, no migration. Saving never throws.
// ---------------------------------------------------------------------------

import { SAVE_COMPATIBILITY, noteSaveReset } from './saveCompatibility';
import {
  deserializeAccount, makeAccount, serializeAccount,
  type Account, type AccountSave,
} from './account';
import {
  deserializeSettings, makeSettings, serializeSettings,
  type Settings, type SettingsSave,
} from './settings';

const KEY = 'arpg_account_v1';
const SETTINGS_KEY = 'arpg_settings_v1';

// --- THE SAVE STAND-DOWN (the crash trap's fatal latch) ----------------------
// One page-lifetime latch: after main.ts's crash trap reports a FATAL error,
// every writer here refuses, so a crash mid-corruption can never persist the
// broken frame into a permadeath roster — persistence freezes at the last
// good save and a restart resumes from it. It guards BOTH halves of the
// hybrid store: the disk primitives (diskPut/diskBeacon — every disk write in
// src/ routes through them) and the localStorage half at each serializing
// writer's top (saveAccount/saveAccountDurable/saveSettings here;
// saveCharacter/saveCharacterDurable/saveCouchGuest/clearCharacter in
// character.ts), because on an endpoint-less host localStorage IS the store.
// This latch is the FATAL reason; the save layer's OTHER stand-down reason —
// a playing SCENE (engine/scenes.ts) — deliberately stays at main.ts's
// run-save chokepoints instead, because a scene suppresses only the RUN save
// while account writes (its own ledger stamp) must still flow. A crash
// trusts nothing, so it latches everything, here at the bottom.
let suppressedReason: string | null = null;

/** Flip the latch (first reason wins; there is deliberately no un-suppress —
 *  only a restart, with its fresh module state, saves again). */
export function suppressSaves(reason: string): void {
  if (suppressedReason) return;
  suppressedReason = reason;
  console.warn(`[save] persistence stood down — ${reason}`);
}

/** The one predicate: the reason saves are refusing, or null while healthy. */
export function saveSuppressed(): string | null { return suppressedReason; }

/** Writer-top guard: true (saying so on the console — the probe-visible
 *  refusal) when the write must be refused. */
export function saveRefused(what: string): boolean {
  if (!suppressedReason) return false;
  console.warn(`[save] ${what} write refused — ${suppressedReason}`);
  return true;
}

// Disk save slots (the Vite plugin maps these to saves/save_<slot>.json).
// Slots are numeric (account/character/settings/roster) or short lowercase
// NAMES for tool stores ('workshop' → save_workshop.json) — both endpoint
// implementations (vite.config.ts + launcher/server.cjs) accept the same
// charset, which is also the path-safety guarantee (no dots, no separators).
const ACCOUNT_SLOT = 0;
const SETTINGS_SLOT = 2;

export type SaveSlot = number | string;

/** Read a save slot from disk; null on 404 / network error / no endpoint. */
export async function diskGet<T>(slot: SaveSlot): Promise<T | null> {
  try {
    const res = await fetch(`/__save/${slot}`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}
/** Write a save slot to disk (fire-and-forget; localStorage already holds it). */
export function diskPut(slot: SaveSlot, body: string): void {
  if (saveRefused(`disk slot ${slot}`)) return; // the stand-down's structural backstop
  void diskPutRaw(slot, body);
}

// One page identity and one sequence per slot cover both fetch and beacon.
// They do not claim authority over another page/session or change save bytes.
let diskWriter: string | undefined;
const diskSequences = new Map<string, number>();
function orderedSaveUrl(slot: SaveSlot): string {
  if (!diskWriter) diskWriter = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('');
  const key = String(slot), sequence = (diskSequences.get(key) ?? 0) + 1;
  if (!Number.isSafeInteger(sequence)) throw Error('Save write sequence exhausted');
  diskSequences.set(key, sequence);
  return `/__save/${slot}?writer=${diskWriter}&sequence=${sequence}`;
}
const pendingDiskSaves = new Set<Promise<void>>();

/** Explicit desktop exits keep the server alive until already-issued writes
 * settle. Ordinary autosaves remain nonblocking; unload still uses beacons. */
export async function flushPendingDiskSaves(): Promise<void> {
  while (pendingDiskSaves.size) await Promise.all([...pendingDiskSaves]);
}

function postDiskSave(url: string, body: string): Promise<void> {
  try {
    const pending = fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
      .then(() => undefined)
      .catch(() => { /* endpoint absent — localStorage is the fallback */ });
    pendingDiskSaves.add(pending);
    void pending.then(() => pendingDiskSaves.delete(pending));
    return pending;
  } catch { return Promise.resolve(); }
}
/** AWAITED, latch-FREE disk write — the save-import lane's primitive
 *  (meta/portage.ts): import stands the ordinary writers down FIRST
 *  (suppressSaves, so a mid-import autosave can't clobber the incoming
 *  slots), then lands the imported bodies through this — and the caller
 *  awaits every write before reloading, else the disk-first loader would
 *  resurrect the pre-import state from a POST the reload dropped. Nothing
 *  else should route here: the stand-down latch exists for a reason. */
export function diskPutRaw(slot: SaveSlot, body: string): Promise<void> {
  try { return postDiskSave(orderedSaveUrl(slot), body); }
  catch { return Promise.resolve(); } // keep the established no-throw disk boundary
}

/** DURABLE disk write: its sequence is selected before sendBeacon, so a late
 * older fetch cannot overwrite a newer unload write. A rejected beacon falls
 * back to fetch with the same sequence and body. */
export function diskBeacon(slot: SaveSlot, body: string): void {
  if (saveRefused(`disk slot ${slot}`)) return;
  let url: string;
  try { url = orderedSaveUrl(slot); } catch { return; }
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(url, body)) return;
    }
  } catch { /* fall through with the exact selected write */ }
  void postDiskSave(url, body);
}

// --- ACCOUNT ----------------------------------------------------------------

export function loadAccount(): Account {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(KEY); } catch { return makeAccount(); }
  if (!raw) return makeAccount();
  try {
    const acc = deserializeAccount(JSON.parse(raw) as AccountSave);
    return acc ?? makeAccount(); // schema mismatch / corrupt → fresh defaults
  } catch {
    return makeAccount();
  }
}

/** Disk-first account load (used once at boot); warms the localStorage cache. */
export async function loadAccountAsync(): Promise<Account> {
  const disk = await diskGet<AccountSave>(ACCOUNT_SLOT);
  let data = disk;
  if (data === null) {
    try { data = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as AccountSave | null; } catch { /* ignore */ }
  }
  let acc: Account | null = null;
  try { if (data) acc = deserializeAccount(data); } catch { /* corrupt account */ }
  const accountReset = !!data && typeof data.schemaVersion === 'number' && data.schemaVersion !== SAVE_COMPATIBILITY.account;
  const runReset = !!acc && data?.runVersion !== SAVE_COMPATIBILITY.run;
  if (accountReset) noteSaveReset('account');
  else if (runReset && (data?.roster?.length ?? 0) > 0) noteSaveReset('run');
  const fresh = acc ?? makeAccount();
  const body = JSON.stringify(serializeAccount(fresh));
  try { window.localStorage.setItem(KEY, body); } catch { /* ignore */ }
  if (disk !== null && (accountReset || runReset)) diskPut(ACCOUNT_SLOT, body);
  return fresh;
}

export function saveAccount(a: Account): void {
  if (saveRefused('account')) return;
  const body = JSON.stringify(serializeAccount(a));
  try { window.localStorage.setItem(KEY, body); } catch { /* ignore */ }
  diskPut(ACCOUNT_SLOT, body);
}

/** DURABLE account write (sendBeacon) for the death handler: clearCharacter's
 *  wipe is durable, so the just-earned death record must be too — else closing
 *  the tab on the death screen wipes the character but drops the corpse. */
export function saveAccountDurable(a: Account): void {
  if (saveRefused('account')) return;
  const body = JSON.stringify(serializeAccount(a));
  try { window.localStorage.setItem(KEY, body); } catch { /* ignore */ }
  diskBeacon(ACCOUNT_SLOT, body);
}

export function wipeSave(): void {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** DEV/QA: fully reset the account to a fresh level-0 state. Clears the
 *  localStorage cache AND overwrites the disk slot with '{}' (a schema mismatch →
 *  deserializeAccount returns null → makeAccount on load), so the disk-first
 *  loader can't resurrect the old account. Reload the page after calling. */
export function resetAccount(): void {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
  diskPut(ACCOUNT_SLOT, '{}');
}

// --- SETTINGS ---------------------------------------------------------------

export function loadSettings(): Settings {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(SETTINGS_KEY); } catch { return makeSettings(); }
  if (!raw) return makeSettings();
  try {
    return deserializeSettings(JSON.parse(raw) as SettingsSave) ?? makeSettings();
  } catch {
    return makeSettings();
  }
}

export async function loadSettingsAsync(): Promise<Settings> {
  const data = await diskGet<SettingsSave>(SETTINGS_SLOT);
  if (data) {
    const s = deserializeSettings(data);
    if (s) { try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(serializeSettings(s))); } catch { /* ignore */ } return s; }
  }
  return loadSettings();
}

export function saveSettings(s: Settings): void {
  if (saveRefused('settings')) return;
  const body = JSON.stringify(serializeSettings(s));
  try { window.localStorage.setItem(SETTINGS_KEY, body); } catch { /* ignore */ }
  diskPut(SETTINGS_SLOT, body);
}

// SAVE PORTAGE (meta/portage.ts) reads/writes the slots by their real keys —
// exported HERE so the constants keep one home and portage re-types nothing.
export { KEY as ACCOUNT_KEY, SETTINGS_KEY, ACCOUNT_SLOT, SETTINGS_SLOT };
