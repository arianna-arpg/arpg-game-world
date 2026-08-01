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
//   RIG F — THE UNDERGROUND EXACT RESUME (recheck #319): a save written two
//           sidezone rungs deep carries the surface anchor PLUS the cave
//           ladder (SavedPlayerSpot.cave); a fresh world resumed with policy
//           'exact' wakes UNDERGROUND at the saved spot with caveReturn +
//           caveStack rebuilt and every parent re-minted (the climb out
//           unwinds to the surface); a ladderless spot keeps today's mouth
//           wake exactly; a corrupt/unmintable ladder degrades to the mouth
//           wake, never a throw; and an exotic (kindless — pitfall/Descent/
//           realm shaped) descent writes anchor-only in the old byte shape.
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
import { resolveResumeSpawn } from '../src/meta/worldstate';
import { World } from '../src/engine/world';
import { zoneKindOf } from '../src/data/zoneKinds';

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

  // === RIG F — THE UNDERGROUND EXACT RESUME (recheck #319) ===================
  console.log('--- RIG F: the underground exact resume (the cave ladder) ---');

  // The boot lane's policy resolution, honestly: no mode pins resume on a
  // mortal, so the player's 'exact' choice rules — the lane main.ts walks.
  check('F0: the boot lane resolves the exact policy honestly',
    resolveResumeSpawn(modeById('mortal').resume, 'exact') === 'exact');

  const accountF = makeAccount();
  for (const c of CLASSES) accountF.unlockedClasses.add(c.id);
  const manifestF = buildManifest(accountF, 616161);
  for (const p of manifestF.packages) p.enabled = false;
  const worldF = new World(accountF, Object.freeze(manifestF));
  worldF.createPlayer(CLASSES[0], { charId: mintCharId() });
  const townId = worldF.zone.id;
  // The anchor must NOT be the town: town is also the last-resort wake, so
  // an anchor there could green a broken fallback. Walk to a plain neighbor.
  const anchorId = Object.keys(worldF.zoneMap).find(id => id !== townId && !worldF.zoneMap[id].kind);
  check('F1: a plain surface neighbor exists to anchor on', !!anchorId, `anchor=${anchorId ?? 'NONE'}`);
  if (!anchorId) { finish(); return; }
  worldF.loadZone(anchorId);

  // Descend TWO rungs through the REAL entry path — enterSidezone is the
  // machinery, the dwell is merely its input (the grantSeatXp idiom: the
  // probe reaches the private seam structurally, never widening the API).
  type FCm = { pos: { x: number; y: number }; seed: number; kind: string };
  type FRung = { zoneId: string; pos: { x: number; y: number }; entryFrom: string | null; kind?: string; seed?: number };
  type FInnards = {
    enterSidezone(cm: FCm): void;
    travelThrough(e: { to: string; side: 'n' | 's' | 'e' | 'w' }): void;
    caveStack: FRung[];
  };
  const innards = (w: World): FInnards => w as unknown as FInnards;
  const inF = innards(worldF);
  const mouth1 = { x: Math.round(worldF.zone.size.w / 2), y: Math.round(worldF.zone.size.h / 2) };
  inF.enterSidezone({ pos: mouth1, seed: 4242, kind: 'cave_entrance' });
  const rung1Id = worldF.zone.id;
  check('F2: the first descent stands underground',
    rung1Id === `cave_${anchorId}_4242` && !!worldF.caveMap[rung1Id], `zone=${rung1Id}`);
  const mouth2 = { x: Math.round(worldF.zone.size.w / 2), y: Math.round(worldF.zone.size.h / 2) };
  inF.enterSidezone({ pos: mouth2, seed: 777, kind: 'cave_entrance' });
  const rung2Id = worldF.zone.id;
  check('F3: the second descent nests and the stack carries the way home',
    rung2Id === `cave_${rung1Id}_777` && worldF.caveReturn?.zoneId === rung1Id
    && inF.caveStack.length === 1 && inF.caveStack[0].zoneId === anchorId, `zone=${rung2Id}`);

  // The save the game actually WRITES, two rungs down (the real writer seam).
  const posSaved = { x: worldF.player.pos.x, y: worldF.player.pos.y };
  persistRun(accountF, worldF);
  const bodyF = lsGet('arpg_character_v1');
  let saveF: CharacterSave | null = null;
  try { saveF = bodyF ? JSON.parse(bodyF) as CharacterSave : null; } catch { /* unparseable */ }
  const spotF = saveF?.world?.player;
  check('F4: the written spot anchors at the SURFACE mouth and carries the ladder',
    spotF?.zoneId === anchorId && spotF.x === mouth1.x && spotF.y === mouth1.y
    && spotF.cave?.zoneId === rung2Id
    && Math.abs((spotF.cave?.x ?? NaN) - posSaved.x) < 0.01
    && Math.abs((spotF.cave?.y ?? NaN) - posSaved.y) < 0.01
    && spotF.cave?.rungs.length === 2
    && spotF.cave.rungs[0].zoneId === anchorId && spotF.cave.rungs[0].kind === 'cave_entrance'
    && spotF.cave.rungs[0].seed === 4242 && spotF.cave.rungs[0].x === mouth1.x
    && spotF.cave.rungs[1].zoneId === rung1Id && spotF.cave.rungs[1].seed === 777,
    spotF ? `anchor=${spotF.zoneId} cave=${spotF.cave?.zoneId ?? 'ABSENT'}` : 'no spot written');
  if (!saveF?.world?.player?.cave) { finish(); return; }

  // resumeGame's restoreWorldState dance, verbatim, on a FRESH world.
  const standUp = (save: CharacterSave): { w: World; adopted: boolean } => {
    const mf = reconcileManifest(save.expedition, accountF, 999);
    const w = new World(accountF, Object.freeze(mf));
    w.createPlayer(CLASSES.find(c => c.id === save.classId) ?? CLASSES[0], { charId: save.charId });
    const applied = applySavedCharacter(w, save);
    const adopted = !!save.world && w.adoptWorldState(save.world);
    return { w, adopted: applied && adopted };
  };
  const { w: worldF2, adopted: adoptedF } = standUp(saveF);
  check('F5: the underground save stands back up', adoptedF);
  worldF2.resumeSpawn(
    resolveResumeSpawn(modeById(worldF2.meta.modeId ?? 'mortal').resume, 'exact'),
    saveF.world.player);
  const inF2 = innards(worldF2);
  const wokeDist = Math.hypot(worldF2.player.pos.x - posSaved.x, worldF2.player.pos.y - posSaved.y);
  check('F6: the exact wake stands UNDERGROUND at the saved spot',
    worldF2.zone.id === rung2Id && wokeDist < 0.5,
    `zone=${worldF2.zone.id} d=${wokeDist.toFixed(2)}`);
  check('F7: the ladder machinery rebuilt whole (return + stack + minted parents)',
    worldF2.caveReturn?.zoneId === rung1Id && worldF2.caveReturn.kind === 'cave_entrance'
    && worldF2.caveReturn.seed === 777
    && inF2.caveStack.length === 1 && inF2.caveStack[0].zoneId === anchorId
    && inF2.caveStack[0].seed === 4242
    && !!worldF2.caveMap[rung1Id] && !!worldF2.caveMap[rung2Id]);

  // Climb ALL the way out through the real exit pop: rung 2 → rung 1 → surface.
  inF2.travelThrough({ to: rung1Id, side: 's' });
  const outOne = worldF2.zone.id === rung1Id
    && worldF2.caveReturn?.zoneId === anchorId && inF2.caveStack.length === 0;
  inF2.travelThrough({ to: anchorId, side: 's' });
  check('F8: the climb out unwinds the restored ladder to the surface',
    outOne && worldF2.zone.id === anchorId && worldF2.caveReturn === null,
    `zone=${worldF2.zone.id}`);

  // FALLBACK 1 — the ladder ABSENT (every pre-ladder save): today's mouth
  // wake exactly, ladder state empty.
  const saveNoLadder = JSON.parse(bodyF!) as CharacterSave;
  delete saveNoLadder.world!.player!.cave;
  const { w: worldF3, adopted: a3 } = standUp(saveNoLadder);
  worldF3.resumeSpawn('exact', saveNoLadder.world!.player);
  check('F9: a ladderless spot keeps today\'s mouth wake byte-for-byte',
    a3 && worldF3.zone.id === anchorId
    && Math.hypot(worldF3.player.pos.x - mouth1.x, worldF3.player.pos.y - mouth1.y) < 0.5
    && worldF3.caveReturn === null && innards(worldF3).caveStack.length === 0,
    `zone=${worldF3.zone.id}`);

  // FALLBACK 2 — a ladder THIS world can no longer stand up: an unregistered
  // kind, and separately a broken id chain. Mouth wake, never a throw.
  const saveBadKind = JSON.parse(bodyF!) as CharacterSave;
  saveBadKind.world!.player!.cave!.rungs[1].kind = 'never_registered_kind';
  const { w: worldF4 } = standUp(saveBadKind);
  let threwKind = false;
  try { worldF4.resumeSpawn('exact', saveBadKind.world!.player); } catch { threwKind = true; }
  check('F10: an unmintable rung degrades to the mouth wake, never a throw',
    !threwKind && worldF4.zone.id === anchorId && worldF4.caveReturn === null,
    `zone=${worldF4.zone.id}`);
  const saveBadChain = JSON.parse(bodyF!) as CharacterSave;
  saveBadChain.world!.player!.cave!.zoneId = 'cave_bogus_9';
  const { w: worldF5 } = standUp(saveBadChain);
  let threwChain = false;
  try { worldF5.resumeSpawn('exact', saveBadChain.world!.player); } catch { threwChain = true; }
  check('F11: a chain-broken ladder degrades to the mouth wake, never a throw',
    !threwChain && worldF5.zone.id === anchorId && worldF5.caveReturn === null,
    `zone=${worldF5.zone.id}`);

  // WRITE PARITY — an EXOTIC descent (kindless rung: the pitfall / Descent /
  // realm-arena shape) writes anchor-only, and the player block keeps its
  // exact old keys — the ladder never perturbs a save it can't serve.
  inF2.enterSidezone({ pos: mouth1, seed: 31337, kind: 'cave_entrance' });
  worldF2.caveReturn = { zoneId: anchorId, pos: { x: mouth1.x, y: mouth1.y }, entryFrom: null };
  const spotExotic = serializeCharacter(worldF2).world?.player;
  check('F12: an exotic (kindless) descent writes anchor-only in the old byte shape',
    spotExotic?.zoneId === anchorId && spotExotic.cave === undefined
    && JSON.stringify(Object.keys(spotExotic)) === '["zoneId","x","y","vitals"]',
    spotExotic ? `keys=${Object.keys(spotExotic).join(',')}` : 'no spot');

  // === RIG G — THE MEMO INVARIANCE (a grown chart never serializes stale) ====
  // RIG B pins the SPLICE against a plain stringify of the SAME memo array —
  // a fold serving stale bytes would green both sides. This rig pins the memo
  // LANE against a FORCED full re-derive at grown-chart scale: same world
  // state → same zones bytes through either path, always; and a moved fold
  // signal both invalidates the memo and re-converges with a fresh rebuild.
  console.log('--- RIG G: the memo invariance (grown chart, hot lane == full re-derive) ---');
  const accountG = makeAccount();
  for (const c of CLASSES) accountG.unlockedClasses.add(c.id);
  const manifestG = buildManifest(accountG, 424242);
  for (const p of manifestG.packages) p.enabled = false;
  const worldG = new World(accountG, Object.freeze(manifestG));
  worldG.createPlayer(CLASSES[0], { charId: mintCharId() });
  // Grow the chart through the real frontier resolution (the webperf idiom).
  const privG = worldG as unknown as { chartNeighborsOf(z: import('../src/data/zones').ZoneDef): void };
  for (let r = 0; r < 8; r++) {
    const batch = Object.values(worldG.zoneMap).filter(z =>
      (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket
      && z.objective.kind !== 'safe' && !z.floating && !zoneKindOf(z)?.staticExits
      && z.exits.some(e => e.to === '?'));
    for (const z of batch) privG.chartNeighborsOf(z);
  }
  // Lived-in zone memory: visit a handful of the minted ground.
  const visitG = Object.values(worldG.zoneMap)
    .filter(z => z.caveDepth == null && z.objective.kind !== 'safe' && !z.floating)
    .slice(0, 6).map(z => z.id);
  for (const id of visitG) {
    worldG.loadZone(id);
    for (let i = 0; i < 4; i++) worldG.update(1 / 60);
  }
  const zonesG = Object.keys(worldG.zoneMap).length;
  // The floor guards the FIXTURE (a broken growth idiom would vacuous-green
  // the byte pins below); this seed's geography saturates around ~81 zones.
  check('G0: the chart grew past sixty zones (fixture sane)', zonesG > 60,
    `${zonesG} zones, ${visitG.length} visited`);
  worldG.serializeWorldState(); // prime the memo
  const hot1 = worldG.zonesSaveJson();
  worldG.serializeWorldState(); // a quiet second beat
  const hot2 = worldG.zonesSaveJson();
  check('G1: quiet beats serve one stable zones section', !!hot1 && hot1 === hot2,
    `${((hot1?.length ?? 0) / 1024).toFixed(0)}KB`);
  worldG.invalidateZonesSaveMemo();
  worldG.serializeWorldState(); // the forced full re-derive
  const freshG = worldG.zonesSaveJson();
  check('G2: the memo lane is byte-identical to a forced full re-derive', hot2 === freshG,
    hot2 === freshG ? '' : `memo=${hot2?.length}b fresh=${freshG?.length}b`);
  // A moved fold signal (the ring-1 unveil's own write) must invalidate the
  // memo — and the invalidated lane must re-converge with a fresh rebuild.
  const veiledG = Object.values(worldG.zoneMap).find(z => z.veiled);
  if (veiledG) {
    veiledG.veiled = false;
    worldG.serializeWorldState();
    const moved = worldG.zonesSaveJson();
    check('G3: a moved fold signal invalidates the memo', !!moved && moved !== freshG);
    worldG.invalidateZonesSaveMemo();
    worldG.serializeWorldState();
    check('G4: the post-move memo re-converges with a full re-derive',
      moved === worldG.zonesSaveJson());
  } else {
    check('G3: a moved fold signal invalidates the memo (no veiled zone rolled — vacuous)', true);
    check('G4: the post-move memo re-converges with a full re-derive (vacuous)', true);
  }
  // The WRITER at grown scale: the splice+swap lane still equals the plain
  // stringify byte-for-byte (RIG B's law, re-pinned where the bytes are big).
  const saveG = serializeCharacter(worldG);
  check('G5: characterBody == plain stringify at grown-chart scale',
    characterBody(worldG, saveG) === JSON.stringify(saveG));

  finish();
})();

function finish(): void {
  console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
  process.exit(failed ? 1 : 0);
}
