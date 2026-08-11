// ---------------------------------------------------------------------------
// SAVE PORTAGE — the whole save set as ONE portable file.
//
// EXPORT gathers every slot from the same sources the boot loaders read
// (disk-first where the /__save endpoint exists, localStorage otherwise —
// nothing here invents a read path) and wraps them in one versioned envelope:
// account (slot 0) + settings (slot 2) + the shared run character (slot 1)
// + every roster vessel the account claims (ROSTER_SLOT_BASE+). The file is
// therefore exactly "what a reload would load", never the live world's
// unsaved frame.
//
// IMPORT is a wholesale snapshot restore, validated through the SAME
// deserialize-or-default gates the loaders trust (deserializeAccount /
// deserializeSettings null on mismatch; character payloads carry their own
// schemaVersion): a malformed file is REFUSED with a reason and writes
// nothing — validation runs whole before the first byte lands. What lands is
// the loaders' own normalized serialization, so an imported slot sits
// byte-for-byte as a legitimate save would. Because account and characters
// travel together, the restored device is internally consistent by
// construction — a covenant-killed vessel arrives dead in the imported
// account too; nothing is merged, nothing resurrects into a ledger that
// remembers otherwise.
//
// THE AUTOSAVE RACE: applySaveImport flips the persistence stand-down latch
// (suppressSaves) BEFORE its first write, so a live run's autosave can never
// interleave stale state between the imported slots; its own writes therefore
// ride the latch-free primitives (diskPutRaw + direct localStorage) — the one
// sanctioned bypass, because the latched writers are latched by US. Every
// disk write is AWAITED before the caller reloads (a fire-and-forget POST
// dropped by the reload would leave the disk-first loader resurrecting the
// pre-import state). Import while the crash latch already stands is allowed
// on purpose: the latch protects the roster from a crashed frame's corrupted
// RAM, and an imported file is external, validated state — the rescue lane.
//
// Slots the incoming account does NOT claim but the device does are wiped
// ('{}', the resetAccount idiom) — a leftover vessel under an account that
// never knew it is exactly the half-state a snapshot restore exists to
// prevent. Client-side whole: the payloads round-trip through the existing
// /__save endpoints verbatim, so neither server implementation changes.
// ---------------------------------------------------------------------------

import {
  deserializeAccount, serializeAccount, ROSTER_SLOT_BASE,
  type AccountSave,
} from './account';
import { deserializeSettings, serializeSettings, type SettingsSave } from './settings';
import {
  CHAR_SCHEMA_VERSION, CHAR_SLOT, charKeyFor,
  loadCharacterAsync, loadRosterSave, type CharacterSave,
} from './character';
import {
  ACCOUNT_KEY, ACCOUNT_SLOT, SETTINGS_KEY, SETTINGS_SLOT,
  diskPutRaw, loadAccount, loadAccountAsync, loadSettingsAsync, suppressSaves,
} from './persistence';

export const SAVE_EXPORT_KIND = 'hollow-wake-save-export';
export const SAVE_EXPORT_VERSION = 1;

/** The one file: every slot's payload, exactly as the loaders would read it. */
export interface SaveEnvelope {
  kind: typeof SAVE_EXPORT_KIND;
  version: number;
  exportedAt: string;
  account: AccountSave;
  settings: SettingsSave;
  /** Character payloads by DISK SLOT (CHAR_SLOT and claimed roster slots).
   *  A slot with no live save (fresh account, wiped vessel) is simply absent. */
  characters: Record<string, CharacterSave>;
}

/** Gather the current save set through the boot loaders themselves. */
export async function buildSaveEnvelope(): Promise<SaveEnvelope> {
  const account = await loadAccountAsync();
  const settings = await loadSettingsAsync();
  const characters: Record<string, CharacterSave> = {};
  const run = await loadCharacterAsync();
  if (run) characters[String(CHAR_SLOT)] = run;
  for (const r of account.roster) {
    const save = await loadRosterSave(r.slot);
    if (save) characters[String(r.slot)] = save;
  }
  return {
    kind: SAVE_EXPORT_KIND,
    version: SAVE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    account: serializeAccount(account),
    settings: serializeSettings(settings),
    characters,
  };
}

/** A legible download name: date + who's inside (one hero by name, else a
 *  count). Filesystem-safe by construction — the slug strips to [A-Za-z0-9-]. */
export function saveEnvelopeName(env: SaveEnvelope): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  const heroes = Object.values(env.characters);
  const names = heroes.map(c => c.name ?? c.classId).filter(Boolean);
  const tag = names.length === 1
    ? '_' + names[0].replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24)
    : names.length > 1 ? `_${names.length}-heroes` : '';
  return `hollow-wake-saves_${stamp}${tag}.json`;
}

/** Everything applySaveImport needs, pre-validated and frozen as strings —
 *  built whole BEFORE any confirm/write so a later autosave can't lean on it. */
export interface SaveImportPlan {
  /** Normalized bodies (serialize∘deserialize) — what the loaders would keep. */
  accountBody: string;
  settingsBody: string;
  /** Character bodies by claimed disk slot, verbatim from the envelope. */
  characters: { slot: number; body: string }[];
  /** Device slots the incoming account does not claim — wiped to '{}'. */
  wipeSlots: number[];
  summary: { characters: number; accountLevel: number; exportedAt: string | null };
}

export type SaveImportVerdict =
  | { ok: true; plan: SaveImportPlan }
  | { ok: false; why: string };

/** Validate an imported file's text WHOLE — through the same
 *  deserialize-or-default gates the loaders trust — into an applyable plan.
 *  Refusal writes nothing and says why; no partial acceptance exists. */
export function planSaveImport(text: string): SaveImportVerdict {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, why: 'Not readable — the file is not JSON.' }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, why: 'Not a Hollow Wake save file.' };
  }
  const env = parsed as Partial<SaveEnvelope>;
  if (env.kind !== SAVE_EXPORT_KIND) return { ok: false, why: 'Not a Hollow Wake save file.' };
  if (env.version !== SAVE_EXPORT_VERSION) {
    return { ok: false, why: `Save file version ${String(env.version)} is unknown to this build — export it again from the version that made it.` };
  }
  // Account + settings through the loaders' own gates (null = schema mismatch).
  let account = null;
  try { account = env.account ? deserializeAccount(env.account) : null; } catch { account = null; }
  if (!account) return { ok: false, why: "The file's account block does not match this version's save format." };
  let settings = null;
  try { settings = env.settings ? deserializeSettings(env.settings) : null; } catch { settings = null; }
  if (!settings) return { ok: false, why: "The file's settings block does not match this version's save format." };
  const rawChars = env.characters;
  if (!rawChars || typeof rawChars !== 'object' || Array.isArray(rawChars)) {
    return { ok: false, why: 'The file carries no character table.' };
  }
  // Character payloads: the loaders' exact trust test (schemaVersion), plus
  // the slot-number law (the run slot, or roster ground) — a stray key is a
  // malformed file, not a write target.
  const claimed = new Set<number>([CHAR_SLOT, ...account.roster.map(r => r.slot)]);
  const characters: { slot: number; body: string }[] = [];
  for (const [key, payload] of Object.entries(rawChars)) {
    if (!/^\d+$/.test(key)) return { ok: false, why: 'The character table names a slot that is not a number.' };
    const slot = Number(key);
    if (slot !== CHAR_SLOT && slot < ROSTER_SLOT_BASE) {
      return { ok: false, why: `Character slot ${slot} is reserved ground — not a character slot.` };
    }
    if (!payload || typeof payload !== 'object' || (payload as CharacterSave).schemaVersion !== CHAR_SCHEMA_VERSION) {
      return { ok: false, why: `The character in slot ${slot} does not match this version's save format.` };
    }
    // Only slots the incoming account CLAIMS are written — an unclaimed
    // payload would land as an invisible orphan, so it is dropped here.
    if (claimed.has(slot)) characters.push({ slot, body: JSON.stringify(payload) });
  }
  // Slots standing on THIS device that the incoming snapshot doesn't fill:
  // the old account's vessels, the incoming account's payload-less cards, and
  // the shared run slot — all wiped so no stale character survives under an
  // account that never knew it (or resurrects into one that buried it).
  const incoming = new Set(characters.map(c => c.slot));
  const wipe = new Set<number>([CHAR_SLOT]);
  for (const r of loadAccount().roster) wipe.add(r.slot);
  for (const s of claimed) wipe.add(s);
  const wipeSlots = [...wipe].filter(s => !incoming.has(s)).sort((a, b) => a - b);
  return {
    ok: true,
    plan: {
      accountBody: JSON.stringify(serializeAccount(account)),
      settingsBody: JSON.stringify(serializeSettings(settings)),
      characters,
      wipeSlots,
      summary: {
        characters: characters.length,
        accountLevel: account.level,
        exportedAt: typeof env.exportedAt === 'string' ? env.exportedAt : null,
      },
    },
  };
}

/** Land a validated plan: stand the ordinary savers down, write every slot
 *  (localStorage + AWAITED disk), wipe the unclaimed ones. The caller reloads
 *  — this page's in-RAM world is stale the moment the first slot lands. */
export async function applySaveImport(plan: SaveImportPlan): Promise<void> {
  // FIRST: the stand-down. From here to the reload no autosave can write.
  suppressSaves('save import in flight — restarting');
  const disk: Promise<void>[] = [];
  try { window.localStorage.setItem(ACCOUNT_KEY, plan.accountBody); } catch { /* quota — disk still lands */ }
  disk.push(diskPutRaw(ACCOUNT_SLOT, plan.accountBody));
  try { window.localStorage.setItem(SETTINGS_KEY, plan.settingsBody); } catch { /* ignore */ }
  disk.push(diskPutRaw(SETTINGS_SLOT, plan.settingsBody));
  for (const c of plan.characters) {
    try { window.localStorage.setItem(charKeyFor(c.slot), c.body); } catch { /* ignore */ }
    disk.push(diskPutRaw(c.slot, c.body));
  }
  for (const s of plan.wipeSlots) {
    try { window.localStorage.removeItem(charKeyFor(s)); } catch { /* ignore */ }
    disk.push(diskPutRaw(s, '{}')); // the resetAccount idiom: mismatch → fresh default
  }
  await Promise.all(disk);
}
