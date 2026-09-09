import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { SAVE_COMPATIBILITY, isCurrentCharacterSave, saveResetNotice } from '../src/meta/saveCompatibility';
import { serializeAccount, deserializeAccount, ROSTER_SLOT_BASE } from '../src/meta/account';
import { serializeCharacter, applySavedCharacter, loadCharacter, loadCharacterAsync, loadRosterSave, charKeyFor, CHAR_SLOT } from '../src/meta/character';
import { ACCOUNT_KEY, ACCOUNT_SLOT, SETTINGS_KEY, SETTINGS_SLOT, loadAccountAsync, loadSettingsAsync } from '../src/meta/persistence';
import { makeSettings, serializeSettings } from '../src/meta/settings';
import { planSaveImport, SAVE_EXPORT_KIND, SAVE_EXPORT_VERSION } from '../src/meta/portage';

const world = makeSimWorld('warrior', 0x515e), character = JSON.parse(JSON.stringify(serializeCharacter(world))) as ReturnType<typeof serializeCharacter>;
world.account.credits = 321;
world.account.roster = [{ charId: 'qa_vessel', modeId: 'immortal', slot: ROSTER_SLOT_BASE,
  classId: 'warrior', name: 'Tester', level: 1, stage: 0, savedAt: 123 }];
const account = serializeAccount(world.account), settings = serializeSettings(makeSettings());
assert.equal(character.schemaVersion, SAVE_COMPATIBILITY.run);
assert.equal(character.accountVersion, SAVE_COMPATIBILITY.account);
assert.equal(account.runVersion, SAVE_COMPATIBILITY.run);
assert.ok(isCurrentCharacterSave(character));
assert.ok(!isCurrentCharacterSave({ ...character, schemaVersion: SAVE_COMPATIBILITY.run - 1 }));
assert.ok(!isCurrentCharacterSave({ ...character, accountVersion: SAVE_COMPATIBILITY.account - 1 }));
assert.ok(!isCurrentCharacterSave({ ...character, accountVersion: undefined }));
assert.ok(!isCurrentCharacterSave({ ...character, schemaVersion: SAVE_COMPATIBILITY.run + 1 }));
assert.ok(!applySavedCharacter(world, { ...character, schemaVersion: SAVE_COMPATIBILITY.run - 1 }));
assert.ok(!applySavedCharacter(world, { ...character, accountVersion: SAVE_COMPATIBILITY.account - 1 }));
console.log('PASS run and account revisions jointly gate character restore, including direct application');

// A memory-backed endpoint exercises the actual boot loaders and their mirrors.
// No real saves, accounts or browser profiles are touched by this probe.
const disk = new Map<string, unknown>();
const writes: string[] = [];
let available = true;
const fetchBefore = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  if (!available) throw new Error('offline QA endpoint');
  const slot = String(url).split('/').pop()!;
  if (init?.method === 'POST') { disk.set(slot, JSON.parse(String(init.body))); writes.push(slot); }
  return { ok: disk.has(slot), status: disk.has(slot) ? 200 : 404,
    json: async () => structuredClone(disk.get(slot) ?? null) } as Response;
}) as typeof fetch;
const put = (slot: number, data: unknown): void => { disk.set(String(slot), structuredClone(data)); };
const cache = (slot: number, data: unknown): void => window.localStorage.setItem(charKeyFor(slot), JSON.stringify(data));
try {
  put(ACCOUNT_SLOT, account); put(CHAR_SLOT, character); put(ROSTER_SLOT_BASE, character); put(SETTINGS_SLOT, settings);
  disk.set('workshop', { sentinel: 'authored content' });
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  assert.deepEqual(await loadCharacterAsync(), character);
  assert.deepEqual(await loadRosterSave(ROSTER_SLOT_BASE), character);
  assert.equal((await loadAccountAsync()).credits, 321);
  assert.equal((await loadAccountAsync()).roster.length, 1);
  assert.equal(writes.length, 0, 'compatible updates never reset saves');
  console.log('PASS compatible versions keep runs, vessels and progression unchanged');

  const oldRun = { ...character, schemaVersion: SAVE_COMPATIBILITY.run - 1 };
  cache(CHAR_SLOT, oldRun); assert.equal(loadCharacter(), null);
  // A current-looking local mirror cannot resurrect an incompatible disk run.
  cache(CHAR_SLOT, character); put(CHAR_SLOT, oldRun);
  assert.equal(await loadCharacterAsync(), null);
  assert.equal(window.localStorage.getItem(charKeyFor(CHAR_SLOT)), null);
  assert.deepEqual(disk.get(String(CHAR_SLOT)), {});
  const oldRosterAccount = { ...account, runVersion: SAVE_COMPATIBILITY.run - 1 };
  put(ACCOUNT_SLOT, oldRosterAccount);
  const kept = await loadAccountAsync();
  assert.equal(kept.credits, 321); assert.deepEqual(kept.roster, []);
  assert.equal(deserializeAccount({ ...account, runVersion: undefined })!.roster.length, 0);
  cache(ROSTER_SLOT_BASE, character); put(ROSTER_SLOT_BASE, oldRun);
  assert.equal(await loadRosterSave(ROSTER_SLOT_BASE), null);
  assert.match(saveResetNotice()!, /account progress is kept/);
  const count = writes.length;
  await loadAccountAsync(); await loadCharacterAsync(); await loadRosterSave(ROSTER_SLOT_BASE);
  assert.equal(writes.length, count, 'resetting is idempotent on subsequent boots');
  console.log('PASS run reset clears Continue and roster vessels, preserves account progress and does not repeat');

  // Account revisions reset progression AND every dependent character, even
  // when the run revision itself has not changed.
  put(ACCOUNT_SLOT, { ...account, schemaVersion: SAVE_COMPATIBILITY.account - 1 });
  window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  const reset = await loadAccountAsync();
  assert.equal(reset.credits, 0); assert.deepEqual(reset.roster, []);
  const oldAccountCharacter = { ...character, accountVersion: SAVE_COMPATIBILITY.account - 1 };
  put(CHAR_SLOT, oldAccountCharacter); cache(CHAR_SLOT, character);
  assert.equal(await loadCharacterAsync(), null);
  put(ROSTER_SLOT_BASE, oldAccountCharacter); cache(ROSTER_SLOT_BASE, character);
  assert.equal(await loadRosterSave(ROSTER_SLOT_BASE), null);
  assert.match(saveResetNotice()!, /account progress and saved characters/);
  assert.deepEqual(serializeSettings(await loadSettingsAsync()), settings);
  assert.deepEqual(disk.get('workshop'), { sentinel: 'authored content' });
  console.log('PASS account reset invalidates all characters while settings and authored content remain intact');

  // Deliberate deletion wins too, even if the stale mirror has current stamps.
  put(CHAR_SLOT, {}); cache(CHAR_SLOT, character);
  assert.equal(await loadCharacterAsync(), null);
  put(ACCOUNT_SLOT, {}); window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  assert.equal((await loadAccountAsync()).credits, 0);
  console.log('PASS disk tombstones cannot resurrect deleted characters or accounts from browser cache');

  // Static hosting/offline fallback still validates revisions, without writing
  // a wipe to an endpoint whose authoritative save we could not inspect.
  available = false;
  cache(CHAR_SLOT, character); assert.deepEqual(await loadCharacterAsync(), character);
  cache(ROSTER_SLOT_BASE, character); assert.deepEqual(await loadRosterSave(ROSTER_SLOT_BASE), character);
  cache(CHAR_SLOT, oldRun); assert.equal(await loadCharacterAsync(), null);
  window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(oldRosterAccount));
  assert.equal((await loadAccountAsync()).roster.length, 0);
  assert.equal((await loadAccountAsync()).credits, 321);
  console.log('PASS endpoint-free storage applies the same reset policy');

  const envelope = { kind: SAVE_EXPORT_KIND, version: SAVE_EXPORT_VERSION, exportedAt: '2026-09-09',
    account, settings, characters: { [CHAR_SLOT]: character } };
  assert.ok(planSaveImport(JSON.stringify(envelope)).ok);
  assert.equal(planSaveImport(JSON.stringify({ ...envelope, characters: { [CHAR_SLOT]: oldAccountCharacter } })).ok, false);
  assert.equal(planSaveImport(JSON.stringify({ ...envelope, characters: { [CHAR_SLOT]: oldRun } })).ok, false);
  assert.equal(planSaveImport(JSON.stringify({ ...envelope, account: { ...account, schemaVersion: SAVE_COMPATIBILITY.account - 1 } })).ok, false);
  console.log('PASS importing an old backup cannot bypass the update reset policy');
} finally { globalThis.fetch = fetchBefore; }
