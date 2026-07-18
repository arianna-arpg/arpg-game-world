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
  fetch(`/__save/${slot}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    .catch(() => { /* endpoint absent — localStorage is the fallback */ });
}

/** DURABLE disk write for writes that must survive the tab closing immediately
 *  (the PERMADEATH wipe — a fire-and-forget fetch can be dropped mid-flight when
 *  the player closes the game on the death screen, and the disk-first loader
 *  would then resurrect the dead character). sendBeacon is queued by the browser
 *  and flushed even on unload; we fall back to the plain POST when it's absent. */
export function diskBeacon(slot: SaveSlot, body: string): void {
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
  const body = JSON.stringify(serializeAccount(a));
  try { window.localStorage.setItem(KEY, body); } catch { /* ignore */ }
  diskPut(ACCOUNT_SLOT, body);
}

/** DURABLE account write (sendBeacon) for the death handler: clearCharacter's
 *  wipe is durable, so the just-earned death record must be too — else closing
 *  the tab on the death screen wipes the character but drops the corpse. */
export function saveAccountDurable(a: Account): void {
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
  const body = JSON.stringify(serializeSettings(s));
  try { window.localStorage.setItem(SETTINGS_KEY, body); } catch { /* ignore */ }
  diskPut(SETTINGS_SLOT, body);
}
