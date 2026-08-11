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

/** AWAITED, latch-FREE disk write — the save-import lane's primitive
 *  (meta/portage.ts): import stands the ordinary writers down FIRST
 *  (suppressSaves, so a mid-import autosave can't clobber the incoming
 *  slots), then lands the imported bodies through this — and the caller
 *  awaits every write before reloading, else the disk-first loader would
 *  resurrect the pre-import state from a POST the reload dropped. Nothing
 *  else should route here: the stand-down latch exists for a reason. */
export function diskPutRaw(slot: SaveSlot, body: string): Promise<void> {
  return fetch(`/__save/${slot}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    .then(() => undefined)
    .catch(() => { /* endpoint absent — localStorage is the fallback */ });
}

/** DURABLE disk write for writes that must survive the tab closing immediately
 *  (the PERMADEATH wipe — a fire-and-forget fetch can be dropped mid-flight when
 *  the player closes the game on the death screen, and the disk-first loader
 *  would then resurrect the dead character). sendBeacon is queued by the browser
 *  and flushed even on unload; we fall back to the plain POST when it's absent. */
export function diskBeacon(slot: SaveSlot, body: string): void {
  if (saveRefused(`disk slot ${slot}`)) return; // stand-down: the durable lane refuses too
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      // A string body is sent as text/plain; the middleware JSON.parses it
      // regardless of content-type, so '{}' lands correctly.
      if (navigator.sendBeacon(`/__save/${slot}`, body)) return;
    }
  } catch { /* fall through to the fetch path */ }
  diskPut(slot, body);
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
  const data = await diskGet<AccountSave>(ACCOUNT_SLOT);
  if (data) {
    const acc = deserializeAccount(data);
    if (acc) { try { window.localStorage.setItem(KEY, JSON.stringify(serializeAccount(acc))); } catch { /* ignore */ } return acc; }
  }
  return loadAccount();
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
