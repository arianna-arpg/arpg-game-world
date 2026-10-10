// ---------------------------------------------------------------------------
// PROBE — THE IMMORTAL TRAVELS (docs/engine/shard.md "The vessel and the
// corpse"; docs/design/shard-world.md card 22, THE LOGIN THROUGH MU).
//
//   npx tsx balance/probe_shardimmortal.ts
//
// A ROSTER vessel (an Immortal, saved in its own roster slot) travels to a
// shard and comes home to THAT slot, never the shared Continue. One classic
// ephemeral ShardHost in this process, real WsTransport clients against it,
// the host ticked by hand (the shard rigs' idiom):
//   A  THE WAKE'S WORD: startGame's roster branch (the card, the world, the
//      bedside persistRun) leaves a save readTravelingVessel finds by charId,
//      its world half dropped, the contract and the build whole; THE JUDGMENT
//      takes that real roster save as it is
//   B  THE LONE VESSEL: without a charId the run slot's hero goes first; with
//      the run slot empty, the one standing roster card; two standing cards
//      are ambiguous (null); a fallen card never travels; a card whose slot
//      holds a stranger reads nothing; no account reads the run slot alone
//   C  THE GRAFT: the shard seats the Immortal under modeId 'immortal' at its
//      level, with its doll and its own locker, over the lobby card's class
//   D  THE HOME SLOT: the mirror (the beat's send, then THE FAREWELL) lands in
//      the roster slot with its card refreshed; the run slot and the Continue
//      bookkeeping stay untouched; a lost card writes nothing anywhere
//   E  THE IMMORTAL'S COVENANT (card 30): the Sworn vessel's lethal down crosses
//      (no mortal fall, no tombstone, no runEnd, a self-only body), it wakes
//      standing, and the crossed vessel lands in ITS roster slot
//   F  THE RUN LANE: a run-slot vessel still mirrors to the run slot, the
//      roster slot untouched
//   G  THE TRAVEL NOTE names the roster vessel; the mortal line is unchanged
// The Immortal's own covenant on a shard in full (the fall, the risen stamp,
// the kneel, the owed crossing) is balance/probe_shardcovenant.ts.
// ---------------------------------------------------------------------------

import { seedGlobalRandom } from '../src/sim/rng';
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { judgeVessel, VESSEL_CFG } from '../server/vessel';
import { WsTransport } from '../src/net/ws';
import { World, type Seat } from '../src/engine/world';
import { NullInput } from '../src/net/intent';
import type { SessionMsg } from '../src/net/transport';
import { CLASSES } from '../src/data/classes';
import { IMMORTAL_STASH } from '../src/data/stashes';
import { rollItem } from '../src/engine/itemgen';
import { autoPlace } from '../src/engine/inventory';
import { emptyStash } from '../src/engine/stash';
import type { ItemCategory, ItemInstance } from '../src/engine/items';
import { buildManifest } from '../src/packages/manifest';
import { ensureAccountId, FEATURE, makeAccount, type Account } from '../src/meta/account';
import { freeRosterSlot, IMMORTAL_CFG, modeById, ROSTER_SLOT_BASE } from '../src/meta/modes';
import { walletMortalValue } from '../src/data/essences';
import {
  CHAR_SLOT, charKeyFor, loadCharacter, persistRun, saveVesselMirror, serializeCouchGuest,
  writeCharacterMirrorRaw, type CharacterSave,
} from '../src/meta/character';
import { readTravelingVessel, ShardVesselLink, travelNote } from '../src/meta/shardVessel';

// THE STREAM LAW: this rig seeds its own stream (the shard rigs seed theirs).
const restoreRandom = seedGlobalRandom(0x5a4f);
let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
async function runTicks(host: ShardHost, n: number): Promise<void> {
  for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); }
}
async function waitFor(cond: () => boolean, host: ShardHost | null, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) {
    if (cond()) return true;
    if (host) host.tick(DT);
    await yieldIO();
  }
  return cond();
}

// One classic shard, ephemeral (no records file: nothing on this rig falls).
const quiet = (): void => { /* quiet */ };
const host = new ShardHost({ seed: 0x1a0f7a1, saveDir: null, open: true, log: quiet });
const url = `ws://127.0.0.1:${await host.listen(0, '127.0.0.1')}`;
const seatOf = (id: string): Seat | undefined => host.world.seats.find(s => s.id === id);
const rowsOf = (t: WsTransport): SessionMsg[] => { const log: SessionMsg[] = []; t.onSession(m => log.push(m)); return log; };
const uids = (items: readonly { uid: number }[]): string => JSON.stringify(items.map(i => i.uid).sort((a, b) => a - b));
/** A slot's stored body, byte for byte (the headless shim's cache IS the store). */
const stored = (slot: number): string | null => window.localStorage.getItem(charKeyFor(slot));
const parsed = (slot: number): CharacterSave | null => JSON.parse(stored(slot) ?? 'null') as CharacterSave | null;
/** A client's account as the browser's loaders leave it: minted. */
const claimedAccount = (): Account => { const a = makeAccount(); ensureAccountId(a); return a; };
/** Forge a vessel on a scratch seat: the couch guest's shape, as the wire carries it (the slow rig's idiom). */
function forgeVessel(o: { classId: string; level: number; name: string; charId: string; modeId?: string;
  bag: number; worn: ItemCategory[] }): CharacterSave {
  const w = host.world;
  const seat = w.addSeat('forge', CLASSES.find(c => c.id === o.classId)!, new NullInput(), { startingCompanions: false, startingFlasks: false });
  w.seatHero(seat).level = o.level;
  seat.meta.name = o.name; seat.meta.charId = o.charId;
  if (o.modeId) seat.meta.modeId = o.modeId;
  for (const slot of o.worn) {
    const it = rollItem({ ilvl: o.level, rarity: 'rare', category: slot });
    if (it) { seat.meta.items.push(it); w.equipItem(seat, it.uid, slot); }
  }
  for (let placed = 0, tries = 0; placed < o.bag && tries < 50; tries++) {
    const it = rollItem({ ilvl: o.level, rarity: 'magic' });
    if (it && autoPlace(seat.meta.items, it)) placed++;
  }
  const save = serializeCouchGuest(w, seat, {});
  w.removeSeat('forge');
  return JSON.parse(JSON.stringify(save)) as CharacterSave;
}

// ===================================================== A: THE WAKE'S WORD ==
// startGame's roster branch, verbatim (probe_persistence's RIG A idiom): the
// card first, then the world, then the bedside baseline, with the run slot
// EMPTY as THE LOGIN THROUGH MU finds it (a live run-slot hero would have
// traveled from the lobby instead of opening Mu). The local world is STAGED
// and borrows the global policies only for its own tranche, so the shard's
// world keeps its geography (World.staged / withGlobalPolicies).
const acct = claimedAccount();
acct.features.add(FEATURE.IMMORTAL);
acct.features.add(FEATURE.IMMORTAL_SLOT_2);
const immortal = modeById('immortal');
const charId = 'c-probe-ysolde';
const slot = freeRosterSlot(acct, immortal)!;
acct.roster.push({ charId, modeId: immortal.id, slot, classId: 'rogue', name: 'Ysolde', level: 1, stage: 0, savedAt: Date.now() });
const manifest = buildManifest(acct, 0x7e57);
for (const p of manifest.packages) p.enabled = false; // a QUIET expedition (the sim law)
const home = World.staged(acct, Object.freeze(manifest));
const worn: ItemInstance[] = [];
const keepsake = rollItem({ ilvl: 9, rarity: 'magic', category: 'ring' })!;
home.withGlobalPolicies(() => {
  home.createPlayer(CLASSES.find(c => c.id === 'rogue')!, { modeId: immortal.id, charId, name: 'Ysolde' });
  // Lived a little before the road: a level, a doll, a keepsake in its own locker.
  home.seatHero(home.localSeat).level = 9;
  for (const cat of ['helmet', 'gloves'] as ItemCategory[]) {
    const it = rollItem({ ilvl: 9, rarity: 'rare', category: cat });
    if (it) { home.meta.items.push(it); home.equipItem(home.localSeat, it.uid, cat); worn.push(it); }
  }
  home.meta.stash = { items: [keepsake], layout: emptyStash(IMMORTAL_STASH) };
  persistRun(acct, home); // the bedside baseline (startGame's own write)
});
const baseline = parsed(slot);
check('A wake: the roster baseline lands in its own slot with its world half; the run slot holds nothing',
  slot >= ROSTER_SLOT_BASE && baseline?.charId === charId && baseline.modeId === 'immortal' && !!baseline.world && stored(CHAR_SLOT) === null,
  `slot ${slot}`);
const V = await readTravelingVessel(acct, charId);
check("A wake: THE WAKE'S WORD finds that hero in its roster slot by its charId",
  !!V && V.charId === charId && V.modeId === 'immortal' && (V.modeStage ?? 0) === 0 && V.classId === 'rogue' && V.level === 9);
check('A wake: its world half stays home; its build, its doll and its locker travel',
  !!V && V.world === undefined && worn.length === 2 && uids(Object.values(V.equipped ?? {})) === uids(worn)
  && !!V.stash?.items.some(i => i.uid === keepsake.uid));
{
  const j = judgeVessel(baseline);
  check('A judge: THE JUDGMENT takes a real roster save as it stands (its world half dropped unread)',
    'save' in j && !('world' in j.save) && j.save.modeId === 'immortal' && j.built.meta.modeId === 'immortal' && j.built.meta.charId === charId,
    'refused' in j ? j.refused : '');
}

// ===================================================== B: THE LONE VESSEL ==
// The lobby's read (no charId): the run slot's hero first, ever; with the run
// slot empty, the ONE standing roster card travels; two are ambiguous.
{
  const lone = await readTravelingVessel(acct);
  check('B lone: with the run slot empty the one standing roster vessel travels from the lobby',
    lone?.charId === charId && lone.world === undefined);
  check('B lone: without the account no roster is named (the run slot alone, the old read)', (await readTravelingVessel()) === null);
}
const oath = forgeVessel({ classId: 'warrior', level: 4, name: 'Oath', charId: 'c-probe-oath', modeId: 'immortal', bag: 0, worn: [] });
const slot2 = freeRosterSlot(acct, immortal)!;
acct.roster.push({ charId: oath.charId!, modeId: immortal.id, slot: slot2, classId: 'warrior', name: 'Oath', level: 4, stage: 0, savedAt: Date.now() });
await writeCharacterMirrorRaw(slot2, JSON.stringify(oath));
{
  check('B ambiguity: two standing roster vessels and no run-slot hero: nothing travels (Mu picks)',
    slot2 !== slot && (await readTravelingVessel(acct)) === null);
  const named = await readTravelingVessel(acct, oath.charId);
  check('B ambiguity: a named one still travels', !!named && named.charId === oath.charId && named.modeId === 'immortal');
  acct.roster.find(r => r.charId === oath.charId)!.fallen = { fee: 99, at: Date.now(), level: 4 };
  check('B fallen: a fallen vessel never travels, named or not', (await readTravelingVessel(acct, oath.charId)) === null);
  check('B fallen: beside it the one STANDING vessel is the lone vessel again', (await readTravelingVessel(acct))?.charId === charId);
  acct.roster.push({ charId: 'c-probe-stranger', modeId: immortal.id, slot, classId: 'rogue', name: 'Stranger', level: 1, stage: 0, savedAt: Date.now() });
  check("B slot law: a card whose slot holds another hero reads nothing (Continue's own card law)",
    (await readTravelingVessel(acct, 'c-probe-stranger')) === null);
  acct.roster = acct.roster.filter(r => r.charId !== 'c-probe-stranger');
}
// The mortal Continue, suspended beside the vessels (the couch guest's shape: a mirror's).
const M = forgeVessel({ classId: 'warrior', level: 6, name: 'Brannoc', charId: 'c-probe-brannoc', bag: 2, worn: ['boots'] });
await writeCharacterMirrorRaw(CHAR_SLOT, JSON.stringify(M));
{
  check("B run slot: the lobby takes the run slot's hero first, a lone vessel standing beside it",
    (await readTravelingVessel(acct))?.charId === M.charId);
  check("B run slot: the wake's named Immortal travels past it", (await readTravelingVessel(acct, charId))?.charId === charId);
  check('B run slot: with no account the read is the old one', (await readTravelingVessel())?.charId === M.charId);
}
const continueBefore = stored(CHAR_SLOT);
const cardOf = (id: string) => acct.roster.find(r => r.charId === id);

// ========================================================== C: THE GRAFT ==
let wiped = 0; // the Continue bookkeeping's hook (main.ts: runWiped darkens the menu's Continue)
const ci = new WsTransport();
const ciRows = rowsOf(ci);
const link = new ShardVesselLink(ci, acct, V, () => null, { runWiped: () => { wiped++; } });
const iw = await ci.connect(url, { name: 'Ysolde', classId: 'warrior', accountId: acct.accountId }, V!);
await waitFor(() => !!seatOf(iw.self), host, 60);
const si = seatOf(iw.self)!;
const heroI = host.world.seatHero(si);
check("C graft: the Immortal grafts under its own contract (modeId 'immortal', the Sworn rung)",
  !!host.vessels.vesselOf(iw.self) && si.meta.modeId === 'immortal' && si.meta.modeStage === 0 && si.meta.charId === charId);
check("C graft: its class over the lobby card, at its level, named, in its own doll",
  si.meta.classDef.id === 'rogue' && heroI.level === 9 && si.meta.name === 'Ysolde'
  && uids(Object.values(si.meta.equipped).flatMap(i => (i ? [i] : []))) === uids(worn));
check('C graft: its own locker rides along', !!si.meta.stash?.items.some(i => i.uid === keepsake.uid));
check('C graft: the grafted hero stands whole', Number.isFinite(heroI.maxLife()) && heroI.life === heroI.maxLife() && !heroI.downed);

// ====================================================== D: THE HOME SLOT ==
{
  const savedBefore = cardOf(charId)!.savedAt;
  heroI.level = 10; // the road was kind: a level
  si.meta.essences.coarse = (si.meta.essences.coarse ?? 0) + 15; // and a purse
  await new Promise(r => setTimeout(r, 5)); // the wall clock moves past the card's last stamp
  host.vessels.mirror(iw.self); // the persistence beat's own send
  const landed = await waitFor(() => link.mirrors >= 1, host, 60);
  const mirrored = parsed(slot);
  check('D home: the mirror lands in the roster slot, no world half, the same hero grown',
    landed && link.mirrors === 1 && mirrored?.charId === charId && mirrored.world === undefined && mirrored.level === 10
    && mirrored.modeId === 'immortal' && mirrored.essences?.coarse === si.meta.essences.coarse
    && !!mirrored.stash?.items.some(i => i.uid === keepsake.uid), `level ${mirrored?.level}`);
  const card = cardOf(charId)!;
  check('D home: its roster card is refreshed as a local roster save refreshes it (level, rung, savedAt)',
    card.level === 10 && card.stage === 0 && card.slot === slot && card.savedAt > savedBefore, `card level ${card.level}`);
  check('D home: the shared run slot is untouched and the Continue never goes dark',
    stored(CHAR_SLOT) === continueBefore && wiped === 0 && loadCharacter()?.charId === M.charId);
  check('D home: the mirror reads back as the next traveling vessel',
    (await readTravelingVessel(acct, charId))?.level === 10 && loadCharacter(slot)?.level === 10);
  const orphan = claimedAccount(); // an account holding no card for this vessel
  const before = stored(slot);
  check('D lost card: a roster mirror whose card is gone writes nothing anywhere (never the shared slot)',
    saveVesselMirror(orphan, { ...mirrored!, level: 77 }) === -1 && stored(slot) === before && stored(CHAR_SLOT) === continueBefore);
}

// ============================================= E: THE IMMORTAL'S COVENANT (card 30) ==
// Card 30 (RULED A 2026-10-10): the Immortal's own covenant runs on the shard and mirrors home.
// This section kept THE MERCY until it was built; the Sworn rung's final down is now THE
// CROSSING, landing in ITS roster slot (balance/probe_shardcovenant.ts pins the whole law).
{
  const fallsBefore = host.vessels.falls, crossingsBefore = host.vessels.crossings;
  const minted = Math.floor(walletMortalValue(si.meta.essences) * IMMORTAL_CFG.firstDeathPayoutMult), creditsBefore = acct.credits;
  host.world.kill(heroI);
  await runTicks(host, 2);
  const bodies = host.corpses.forAccount(acct.accountId);
  check("E covenant: the Sworn vessel's lethal down crosses: no mortal fall, no tombstone, no runEnd; the stage steps",
    host.vessels.crossings === crossingsBefore + 1 && host.vessels.falls === fallsBefore && !host.corpses.hasFallen(acct.accountId, charId)
    && !ciRows.some(m => m.t === 'corpse' || m.t === 'runEnd') && si.meta.modeStage === 1);
  check('E covenant: its body is its own (self-only), holding its doll', bodies.length === 1 && bodies[0].ring === 'own' && bodies[0].charId === charId);
  await waitFor(() => !heroI.dead, host, Math.ceil(VESSEL_CFG.deathBeatSec * SHARD_CFG.tickHz) + 30);
  check('E wake: after THE DEATH BEAT it wakes standing (the seat never leaves)', !heroI.downed && !heroI.dead && heroI.life > 0 && !!seatOf(iw.self));
  check('E home: the client books the crossing (the Sworn tithe) and stages no death screen',
    acct.credits === creditsBefore + minted && link.crossings === 1 && link.takeDeath(ci, null) === null && link.traveling?.charId === charId,
    `credits ${creditsBefore} > ${acct.credits}`);
  check('E home: the crossed vessel lands in ITS roster slot (Undying, stripped; the card follows, never fallen); the run slot and the Continue stand',
    parsed(slot)?.charId === charId && parsed(slot)?.modeStage === 1 && (parsed(slot)?.items ?? []).length === 0
    && cardOf(charId)!.stage === 1 && !cardOf(charId)!.fallen && stored(CHAR_SLOT) === continueBefore && wiped === 0);
}
{
  const before = link.mirrors;
  ci.leave(); // THE FAREWELL: the last mirror, then the close
  const gone = await waitFor(() => !seatOf(iw.self), host, 120);
  check('D farewell: the last mirror lands home in the roster slot before the socket closes',
    gone && link.mirrors === before + 1 && parsed(slot)?.charId === charId && parsed(slot)?.level === 10
    && stored(CHAR_SLOT) === continueBefore && wiped === 0, `${link.mirrors - before} mirror(s) at the farewell`);
}

// ======================================================= F: THE RUN LANE ==
{
  const RM = await readTravelingVessel(acct);
  const rosterBefore = stored(slot), cardLevel = cardOf(charId)!.level;
  const cm = new WsTransport();
  const linkM = new ShardVesselLink(cm, acct, RM, () => null, { runWiped: () => { wiped++; } });
  const mw = await cm.connect(url, { name: 'Brannoc', classId: 'rogue', accountId: acct.accountId }, RM!);
  await waitFor(() => !!seatOf(mw.self), host, 60);
  const sm = seatOf(mw.self)!;
  check("F run lane: the lobby's run-slot hero travels and grafts as a mortal",
    RM?.charId === M.charId && !!host.vessels.vesselOf(mw.self) && sm.meta.modeId === 'mortal' && host.world.seatHero(sm).level === 6);
  host.world.seatHero(sm).level = 7;
  host.vessels.mirror(mw.self);
  await waitFor(() => linkM.mirrors >= 1, host, 60);
  const cont = loadCharacter();
  check("F run lane: its mirror lands in the shared run slot (today's path)",
    linkM.mirrors === 1 && !!cont && cont.charId === M.charId && cont.level === 7 && cont.world === undefined);
  check('F run lane: the roster slot and its card stand untouched beside it',
    stored(slot) === rosterBefore && cardOf(charId)!.level === cardLevel && wiped === 0);
  cm.leave();
  await waitFor(() => !seatOf(mw.self), host, 120);
}

// ===================================================== G: THE TRAVEL NOTE ==
{
  // THE FRONT DOOR (W7): the server join is class-free, so no line speaks of a class card.
  const noteI = travelNote(V), noteM = travelNote(M);
  check('G note: the lobby line names a roster vessel, its contract and its rung',
    noteI === 'Traveling: Ysolde, level 9 Rogue (Immortal, Sworn).', noteI);
  check('G note: a run-slot hero is named the same way, without its contract',
    noteM === 'Traveling: Brannoc, level 6 Warrior.', noteM);
}

await waitFor(() => host.world.seats.length === 1, host, 60);
await host.stop();
restoreRandom();

// Let in-flight socket closes settle before the process ends: Node on Windows
// asserts inside libuv when process.exit lands mid-close (the shard rigs' law).
const EXIT_SETTLE_MS = 600;
await new Promise(r => setTimeout(r, EXIT_SETTLE_MS));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
