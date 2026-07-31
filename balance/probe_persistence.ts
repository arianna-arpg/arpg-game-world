// ---------------------------------------------------------------------------
// ONE-OFF PROBE — CHARACTER PERSISTENCE: the save the game actually WRITES
// (meta/character.ts), headless on the real engine, replicating main.ts's own
// flows. Born from the 07-23..07-31 regression (a6c5eb3): characterBody
// spliced the memoized zones JSON via JSON.rawJSON — which accepts only JSON
// PRIMITIVES, so the zones ARRAY made it throw on every modern runtime, the
// writers' silent quota catch swallowed the throw, and every character save
// (baseline, autosave, menu-exit, durable quit) became a no-op: an Immortal
// vessel could neither save nor load while its roster card said it existed.
// probe_forechart round-trips serializeWorldState directly and never saw it —
// THIS probe asserts the written BODY, closing exactly that hole. Pins:
//
//   RIG A — THE IMMORTAL VESSEL LIFECYCLE (main.ts startGame roster branch →
//           hostTail beats → resumeRosterChar): the baseline persistRun LANDS
//           in the vessel's own roster slot; the body parses and carries the
//           covenant + the world half; the autosave beat overwrites it; the
//           DURABLE quit flush lands; a fresh boot's loadAccount lists the
//           card; loadRosterSave finds the vessel; applySavedCharacter +
//           adoptWorldState stand it back up wearing its identity; and the
//           RESUMED session saves to the same slot again (saveSlotFor still
//           resolves the card after a resume).
//   RIG B — THE SPLICE LAWS: byte parity — with the zones memo HOT, the body
//           saveCharacter writes is byte-identical to a plain
//           JSON.stringify(serializeCharacter(world)) (correctness never
//           rides the optimization); the memo actually ENGAGES (two quiet
//           serializes share the zones array by identity — the 84ms hitch
//           stays dead); the splice lane is LIVE, proven through the real
//           seam (an injected memo json lands verbatim in the body); no
//           sentinel remnant ever persists.
//   RIG C — THE PLATFORM LAW that broke us, pinned so the old idiom can
//           never return: where JSON.rawJSON exists it THROWS on an array —
//           any future "optimize via rawJSON" rewrite fails HERE first.
//   RIG D — THE LOUD FAILURE: a serialize that throws (circular carry) must
//           write NOTHING, must not crash the caller, and must SAY SO on the
//           console — a broken save path is never silent again. Recovery
//           after the poison is removed works.
//   RIG E — THE MORTAL CONTINUE: the shared run slot rides the same seam —
//           persistRun lands it, loadCharacter round-trips it.
//
// Run: npx tsx balance/probe_persistence.ts
// ---------------------------------------------------------------------------

import { bootSimEngine } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { CLASSES } from '../src/data/classes';
import { FEATURE, makeAccount } from '../src/meta/account';
import { freeRosterSlot, mintCharId, modeById } from '../src/meta/modes';
import { loadAccount, saveAccount } from '../src/meta/persistence';
import {
  applySavedCharacter, characterBody, loadCharacter, loadRosterSave,
  persistRun, persistRunDurable, serializeCharacter,
  type CharacterSave,
} from '../src/meta/character';
import { buildManifest, reconcileManifest } from '../src/packages/manifest';
import { World } from '../src/engine/world';

let failed = 0;
/** XP through the seat lane. grantSeatXp is World-PRIVATE — the probe reaches
 *  it structurally (the probe_pathpref wGrounds idiom): a rig never widens the
 *  game's API for a test. The seat type is World's own, read off localSeat. */
const grantXp = (w: World, amount: number): void =>
  (w as unknown as { grantSeatXp(seat: World['localSeat'], amount: number): void })
    .grantSeatXp(w.localSeat, amount);
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xa11ce);

const ls = (): Storage => (globalThis as unknown as { localStorage: Storage }).localStorage;
const lsGet = (k: string): string | null => ls().getItem(k);

// === RIG A — THE IMMORTAL VESSEL LIFECYCLE ===================================
console.log('--- RIG A: the immortal vessel lifecycle ---');

const account = makeAccount();
for (const c of CLASSES) account.unlockedClasses.add(c.id);
account.features.add(FEATURE.IMMORTAL);

const mode = modeById('immortal');
check('A0: the immortal covenant is roster-saved', mode.save === 'roster');

// startGame's roster branch, verbatim: card first, then the world.
const classDef = CLASSES[0];
const charId = mintCharId();
const slot = freeRosterSlot(account, mode);
check('A1: a free roster slot is dealt', slot != null, `slot=${slot}`);
account.roster.push({
  charId, modeId: mode.id, slot: slot!, classId: classDef.id, name: 'Testvessel',
  level: 1, stage: 0, savedAt: Date.now(),
});
saveAccount(account);

const manifest = buildManifest(account, 12345);
for (const p of manifest.packages) p.enabled = false; // a QUIET expedition (sim law)
const world = new World(account, Object.freeze(manifest));
world.createPlayer(classDef, { modeId: mode.id, charId, name: 'Testvessel' });
check('A2: createPlayer stamped the covenant',
  world.meta.modeId === 'immortal' && world.meta.charId === charId);

persistRun(account, world); // the baseline snapshot (startGame's write)
const slotKey = `arpg_character_v1_s${slot}`;
const baselineRaw = lsGet(slotKey);
check('A3: the baseline save LANDED in the roster slot', !!baselineRaw, `key=${slotKey}`);
let baseline: CharacterSave | null = null;
try { baseline = baselineRaw ? JSON.parse(baselineRaw) as CharacterSave : null; } catch { /* unparseable */ }
check('A4: the baseline body parses and carries the covenant',
  !!baseline && baseline.schemaVersion === 1 && baseline.modeId === 'immortal'
  && baseline.charId === charId && !!baseline.world,
  baseline ? `modeId=${baseline.modeId}` : 'unparseable');

// Live a little, then the 20s autosave beat (hostTail's persistRun).
for (let i = 0; i < 120; i++) world.update(1 / 60);
grantXp(world, 40);
persistRun(account, world);
const autosaveRaw = lsGet(slotKey);
check('A5: the autosave beat overwrote the slot', !!autosaveRaw && autosaveRaw !== baselineRaw);

// The DURABLE quit flush (window closing under us) — memo invalidated, built
// fresh, still lands (headless: sendBeacon absent → diskPut lane; the
// localStorage half is the observable).
for (let i = 0; i < 30; i++) world.update(1 / 60);
persistRunDurable(account, world);
const quitRaw = lsGet(slotKey);
check('A6: the durable quit flush landed', !!quitRaw && quitRaw !== autosaveRaw);
try { check('A7: the durable body parses whole', !!JSON.parse(quitRaw ?? '')); }
catch { check('A7: the durable body parses whole', false); }

// A fresh boot: the account lists the card, the slot yields the vessel.
const account2 = loadAccount();
const entry = account2.roster.find(r => r.charId === charId);
check('A8: the roster card survives the account round trip',
  !!entry && entry.slot === slot && entry.modeId === 'immortal');

void (async (): Promise<void> => {
  const save = await loadRosterSave(entry!.slot);
  check('A9: loadRosterSave finds the vessel', !!save);
  if (!save) { finish(); return; }

  // resumeRosterChar, verbatim.
  const cls2 = CLASSES.find(c => c.id === save.classId)!;
  const manifest2 = reconcileManifest(save.expedition, account2, 999);
  const world2 = new World(account2, Object.freeze(manifest2));
  world2.createPlayer(cls2, { modeId: entry!.modeId, charId: entry!.charId });
  const applied = applySavedCharacter(world2, save);
  const adopted = !!save.world && world2.adoptWorldState(save.world);
  check('A10: the vessel stands back up (applySavedCharacter + adoptWorldState)',
    applied && adopted);
  check('A11: the resumed vessel wears its identity',
    world2.meta.modeId === 'immortal' && world2.meta.charId === charId
    && world2.meta.name === 'Testvessel' && world2.player.level === world.player.level);

  // The resumed session must be able to SAVE again — saveSlotFor must still
  // resolve the card from the resumed meta (the round trip's last leg).
  for (let i = 0; i < 60; i++) world2.update(1 / 60);
  grantXp(world2, 25);
  const before = lsGet(slotKey);
  persistRun(account2, world2);
  const after = lsGet(slotKey);
  check('A12: the resumed vessel saves to its own slot again', !!after && after !== before);

  // === RIG B — THE SPLICE LAWS ===============================================
  console.log('--- RIG B: the splice laws (byte parity, memo liveness) ---');

  // Byte parity with the memo HOT: the body persistRun just wrote must be
  // byte-identical to a plain stringify of a fresh serialize (nothing moved
  // between). Correctness never rides the optimization.
  const plain = JSON.stringify(serializeCharacter(world2));
  check('B1: written body == plain stringify, byte for byte (memo hot)',
    after === plain, `written=${after?.length}b plain=${plain.length}b`);

  // The memo ENGAGES: two quiet serializes share the zones array by IDENTITY
  // (the perf half of a6c5eb3 stays alive — the 84ms hitch stays dead).
  const s1 = serializeCharacter(world2);
  const s2 = serializeCharacter(world2);
  check('B2: quiet beats reuse the memoized zones section by identity',
    !!s1.world && !!s2.world && s1.world.zones === s2.world.zones);

  // The splice lane is LIVE, proven through the real seam: inject a
  // recognizable (valid!) memo json and demand it lands verbatim in the body.
  const marker = '["__probe_zsplice_marker__"]';
  const w2 = world2 as unknown as { zonesSaveJson: () => string | null };
  const realZonesJson = w2.zonesSaveJson;
  w2.zonesSaveJson = () => marker;
  const spliced = characterBody(world2, s1);
  w2.zonesSaveJson = realZonesJson;
  const parsedSpliced = ((): unknown => {
    try { return (JSON.parse(spliced) as { world?: { zones?: unknown } }).world?.zones; }
    catch { return null; }
  })();
  check('B3: the splice lane consumes the memo seam verbatim',
    spliced.includes('__probe_zsplice_marker__')
    && JSON.stringify(parsedSpliced) === marker);

  // Sentinel hygiene: nothing of the splice mechanism ever persists.
  check('B4: no sentinel remnant in any written body',
    !(after ?? '').includes('__zsplice_') && !spliced.includes('__zsplice_'));

  // === RIG C — THE PLATFORM LAW (why rawJSON can never carry the splice) ====
  console.log('--- RIG C: the rawJSON platform law ---');
  const raw = (JSON as unknown as { rawJSON?: (s: string) => unknown }).rawJSON;
  if (typeof raw === 'function') {
    let threw = false;
    try { raw('[1]'); } catch { threw = true; }
    check('C1: JSON.rawJSON refuses an array (the throw that ate every save)', threw);
  } else {
    check('C1: JSON.rawJSON absent on this runtime (law pinned where it exists)', true);
  }

  // === RIG D — THE LOUD FAILURE (a broken save path is never silent) ========
  console.log('--- RIG D: the loud failure ---');
  const poison: Record<string, unknown> = {};
  poison.self = poison; // circular — JSON.stringify throws
  (world2.meta.items as unknown as unknown[]).push(poison);
  const errs: string[] = [];
  const realErr = console.error;
  console.error = (...a: unknown[]): void => { errs.push(a.map(String).join(' ')); };
  const beforePoison = lsGet(slotKey);
  let threwOut = false;
  try { persistRun(account2, world2); } catch { threwOut = true; }
  console.error = realErr;
  check('D1: a throwing serialize never crashes the caller', !threwOut);
  check('D2: nothing was written past the poison', lsGet(slotKey) === beforePoison);
  check('D3: the failure SPEAKS on the console',
    errs.some(e => e.includes('serializeCharacter threw')), errs.join(' | ').slice(0, 120));
  (world2.meta.items as unknown as unknown[]).pop();
  // Move the world first — an unchanged state re-serializes byte-identical
  // (the pure-serialize law), which would read as "no write" here.
  for (let i = 0; i < 30; i++) world2.update(1 / 60);
  grantXp(world2, 5);
  persistRun(account2, world2);
  check('D4: the save recovers once the poison is gone', lsGet(slotKey) !== beforePoison);

  // === RIG E — THE MORTAL CONTINUE (the shared run slot, same seam) =========
  console.log('--- RIG E: the mortal continue ---');
  const account3 = makeAccount();
  for (const c of CLASSES) account3.unlockedClasses.add(c.id);
  const manifest3 = buildManifest(account3, 777);
  for (const p of manifest3.packages) p.enabled = false;
  const world3 = new World(account3, Object.freeze(manifest3));
  world3.createPlayer(CLASSES[0], { charId: mintCharId() }); // a plain mortal
  persistRun(account3, world3);
  const contRaw = lsGet('arpg_character_v1');
  check('E1: the mortal baseline lands in the shared Continue slot', !!contRaw);
  const cont = loadCharacter();
  check('E2: loadCharacter round-trips it',
    !!cont && cont.schemaVersion === 1 && (cont.modeId ?? 'mortal') === 'mortal');

  finish();
})();

function finish(): void {
  console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
  process.exit(failed ? 1 : 0);
}
