// ---------------------------------------------------------------------------
// PROBE: THE IMMORTAL'S COVENANT ON A SHARD (charter card 30, RULED A 2026-10-10:
// "the stage's own death policy runs on the server and mirrors home"; docs/engine/shard.md
// "THE IMMORTAL'S COVENANT ON A SHARD").
//
//   npx tsx balance/probe_shardcovenant.ts
//
// One classic ephemeral ShardHost in this process, real WsTransport clients and their
// ShardVesselLinks (the client's half, on the headless shim's storage), the host ticked by
// hand (the shard rigs' idiom):
//   C  THE CROSSING (a Sworn vessel's final down, ungrouped): decided the tick it lands; its
//      stage advances, its carry is stripped, a SELF-ONLY body is recorded, the mirror and
//      `stageDeath` go home at once (the reduced tithe booked on the account as a solo crossing
//      books it, the roster slot holding the crossed vessel), THE DEATH BEAT stands the body
//      dead, then THE WAKE stands it at the hearth under THE SPAWN GRACE, never a leave;
//   V  THE STAGE'S RING: the self-only body stands for its own character and never for another
//      hero of the same account;
//   U  'stay' (a stage that survives death without stepping), dying in another unit: no advance,
//      and the wake lands in the keeper's World at the hearth (the hand-off's landing law);
//   F  THE FALL (an Undying's final down): the full covenant (the appraisal at the stage's rate,
//      a self-only body, the strip, the stripped vessel home), the seat leaves after the beat with
//      `fell` then `runEnd`, the client stamps its own roster card with the frozen fee and keeps
//      the slot; the next travel is refused 'fallen' (the word re-spoken, nothing booked twice);
//      a resurrection at the Vault stamps risenAt, the traveling vessel carries it, and a risenAt
//      later than the fall lifts the record: the vessel walks the shard again;
//   K  a mate's kneel inside THE BLEED-OUT saves every stage (Sworn, Undying, mortal); a held
//      down whose bleed-out runs out takes its stage's death at that moment (the one door);
//   O  THE OWED CROSSING: a held vessel whose client leaves while down crosses unheard; its next
//      upload crosses on arrival (stripped, stepped) and hears the word once;
//   M  the mortal's word is unchanged (`corpse` then `runEnd`, never a stage word; every check of
//      probe_shardimmortal.ts, probe_shard.ts and the slow rig's N section holds there).
// THE RETURN (card 26 B, W7) beside each death, checked inside C, F and O: a death's mirror and any
// mirror inside THE DEATH BEAT name no stand and THE WAKE's names the hearth; a fall forgets its
// stand and the risen vessel walks in at the hearth; an owed crossing's upload sheds its stand.
// ---------------------------------------------------------------------------

import { seedGlobalRandom } from '../src/sim/rng';
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { VESSEL_CFG } from '../server/vessel';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import { WsTransport } from '../src/net/ws';
import type { SessionMsg } from '../src/net/transport';
import { NullInput } from '../src/net/intent';
import { type Seat } from '../src/engine/world';
import { CLASSES } from '../src/data/classes';
import { walletMortalValue } from '../src/data/essences';
import { rollItem } from '../src/engine/itemgen';
import { autoPlace } from '../src/engine/inventory';
import type { ItemCategory } from '../src/engine/items';
import { vec } from '../src/core/math';
import { applyCredits, ensureAccountId, FEATURE, LEDGER_ACCOUNT_DEATHS, makeAccount, type Account } from '../src/meta/account';
import { freeRosterSlot, IMMORTAL_CFG, modeById, resurrectFee } from '../src/meta/modes';
import { charKeyFor, serializeCouchGuest, writeCharacterMirrorRaw, type CharacterSave } from '../src/meta/character';
import { readTravelingVessel, ShardVesselLink } from '../src/meta/shardVessel';
import { allUnlockables, investUnlock, resurrectUnlockId } from '../src/meta/unlocks';

// THE STREAM LAW: this rig seeds its own stream (the shard rigs seed theirs).
const restoreRandom = seedGlobalRandom(0x5c0730);
let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
const sec = (s: number): number => Math.ceil(s * SHARD_CFG.tickHz);
async function runTicks(n: number): Promise<void> { for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); } }
async function waitFor(cond: () => boolean, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) { if (cond()) return true; host.tick(DT); await yieldIO(); }
  return cond();
}

SHARD_WIRE_CFG.maxPerIp = Number.POSITIVE_INFINITY; // every client of this rig arrives from one address
const host = new ShardHost({ seed: 0x5c0731, saveDir: null, open: true, log: () => { /* quiet */ } });
await host.ready();
const url = `ws://127.0.0.1:${await host.listen(0, '127.0.0.1')}`;
const w = host.world;
const immortal = modeById('immortal');
const seatOf = (id: string): Seat | undefined => host.units.seatOf(id);
const rowsOf = (t: WsTransport): SessionMsg[] => { const log: SessionMsg[] = []; t.onSession(m => log.push(m)); return log; };
const kinds = (rows: SessionMsg[]): string => rows.map(m => m.t).join(' > ');
const stored = (slot: number): string | null => window.localStorage.getItem(charKeyFor(slot));
const parsed = (slot: number): CharacterSave | null => JSON.parse(stored(slot) ?? 'null') as CharacterSave | null;
const claimedAccount = (): Account => { const a = makeAccount(); ensureAccountId(a); return a; };
const hearth = host.hearthSeat();
const fromHearth = (s: Seat): number => Math.hypot(s.actor.pos.x - hearth.x, s.actor.pos.y - hearth.y);
const place = (s: Seat, x: number, y: number): void => { const p = w.clampPos(vec(x, y), s.actor.radius); s.actor.pos.x = p.x; s.actor.pos.y = p.y; };
const carried = (s: Seat): number => s.meta.items.length + Object.values(s.meta.equipped).filter(Boolean).length + walletMortalValue(s.meta.essences);

/** Forge a vessel on a scratch seat (the couch guest's shape, as the wire carries it). */
function forgeVessel(o: { classId: string; level: number; name: string; charId: string; modeId?: string; modeStage?: number;
  bag: number; worn: ItemCategory[]; coarse?: number }): CharacterSave {
  const seat = w.addSeat('forge', CLASSES.find(c => c.id === o.classId)!, new NullInput(), { startingCompanions: false, startingFlasks: false });
  w.seatHero(seat).level = o.level;
  seat.meta.name = o.name; seat.meta.charId = o.charId;
  if (o.modeId) seat.meta.modeId = o.modeId;
  if (o.modeStage !== undefined) seat.meta.modeStage = o.modeStage;
  for (const slot of o.worn) {
    const it = rollItem({ ilvl: o.level, rarity: 'rare', category: slot });
    if (it) { seat.meta.items.push(it); w.equipItem(seat, it.uid, slot); }
  }
  for (let placed = 0, tries = 0; placed < o.bag && tries < 50; tries++) {
    const it = rollItem({ ilvl: o.level, rarity: 'magic' });
    if (it && autoPlace(seat.meta.items, it)) placed++;
  }
  if (o.coarse) seat.meta.essences.coarse = o.coarse;
  const save = serializeCouchGuest(w, seat, {});
  w.removeSeat('forge');
  return JSON.parse(JSON.stringify(save)) as CharacterSave;
}
/** An Immortal vessel's card and slot on an account (startGame's roster branch, the card first). */
async function enroll(acct: Account, V: CharacterSave): Promise<number> {
  acct.features.add(FEATURE.IMMORTAL); acct.features.add(FEATURE.IMMORTAL_SLOT_2); acct.features.add(FEATURE.IMMORTAL_SLOT_3);
  const slot = freeRosterSlot(acct, immortal)!;
  acct.roster.push({ charId: V.charId!, modeId: immortal.id, slot, classId: V.classId, name: V.name ?? V.classId, level: V.level, stage: V.modeStage ?? 0, savedAt: Date.now() });
  await writeCharacterMirrorRaw(slot, JSON.stringify(V));
  return slot;
}
interface Traveler { c: WsTransport; rows: SessionMsg[]; link: ShardVesselLink; id: string }
async function travel(acct: Account, V: CharacterSave | null, name: string): Promise<Traveler> {
  const c = new WsTransport();
  const rows = rowsOf(c);
  const link = new ShardVesselLink(c, acct, V, () => null);
  const welcome = await c.connect(url, { name, classId: V?.classId ?? 'warrior', accountId: acct.accountId }, V ?? undefined);
  return { c, rows, link, id: welcome.self };
}

// ================================================================== C: THE CROSSING ==
const acct1 = claimedAccount();
const charId1 = 'c-cov-ysolde';
const V1 = forgeVessel({ classId: 'rogue', level: 9, name: 'Ysolde', charId: charId1, modeId: 'immortal', bag: 3, worn: ['helmet', 'gloves'], coarse: 40 });
const slot1 = await enroll(acct1, V1);
const card1 = () => acct1.roster.find(r => r.charId === charId1)!;
const T1 = await travel(acct1, V1, 'Ysolde');
await waitFor(() => !!seatOf(T1.id), 60);
const s1 = seatOf(T1.id)!;
{
  check('C graft: the Sworn vessel stands under its own contract, with its carry', s1.meta.modeId === 'immortal' && s1.meta.modeStage === 0 && carried(s1) > 40);
  place(s1, hearth.x + 420, hearth.y + 260); // off the hearth, so the wake's landing is seen
  await runTicks(3);
  const credits0 = acct1.credits, deaths0 = acct1.ledger[LEDGER_ACCOUNT_DEATHS] ?? 0, crossings0 = host.vessels.crossings;
  const hero = w.seatHero(s1), deathAt = vec(hero.pos.x, hero.pos.y);
  w.kill(hero);
  await runTicks(2);
  check('C decided: the final down of an ungrouped Sworn vessel crosses the tick it lands (no mercy, no fall)',
    host.vessels.crossings === crossings0 + 1 && host.vessels.falls === 0 && host.vessels.undyingFalls === 0 && !!seatOf(T1.id));
  check('C beat: the body stands dead and untargetable on the wire through THE DEATH BEAT', hero.dead && hero.untargetable && !hero.downed);
  check('C ladder: the stage advances (the Immortal\'s first death seals it: Sworn to Undying)', s1.meta.modeStage === 1);
  check('C strip: that seat\'s carry is stripped (bag, doll, wallets); the build walks on',
    s1.meta.items.length === 0 && Object.values(s1.meta.equipped).filter(Boolean).length === 0 && walletMortalValue(s1.meta.essences) === 0
    && s1.meta.knownSkills.size > 0 && hero.level === 9);
  const bodies = host.corpses.forAccount(acct1.accountId);
  check('C body: a SELF-ONLY body is recorded where it fell, holding the worn gear (the Sworn stage\'s own ring)',
    bodies.length === 1 && bodies[0].ring === 'own' && bodies[0].charId === charId1 && bodies[0].loot.items.length === 2
    && Math.hypot(bodies[0].pos.x - deathAt.x, bodies[0].pos.y - deathAt.y) < 1, JSON.stringify(bodies.map(b => ({ ring: b.ring, n: b.loot.items.length }))));
  await waitFor(() => T1.rows.some(m => m.t === 'stageDeath'), 30);
  const iSave = T1.rows.findIndex(m => m.t === 'heroSave'), iWord = T1.rows.findIndex(m => m.t === 'stageDeath');
  const word = T1.rows[iWord];
  check('C word: the mirror then `stageDeath` go home at once (the reduced tithe: 40 worth at the Sworn rate)',
    iSave >= 0 && iWord > iSave && word?.t === 'stageDeath' && word.stage === 1 && word.reckoning.carried === 40
    && word.reckoning.mult === IMMORTAL_CFG.firstDeathPayoutMult && word.reckoning.minted === Math.floor(40 * IMMORTAL_CFG.firstDeathPayoutMult)
    && word.reckoning.modeStage === 0 && word.note.pieces === 2, kinds(T1.rows));
  const iCross = T1.rows.slice(0, iWord).map(m => m.t).lastIndexOf('heroSave');
  const crossMirror = T1.rows[iCross];
  check('C return: the crossing\'s mirror names no stand (THE RETURN: a crossing\'s wake is the hearth)',
    crossMirror?.t === 'heroSave' && crossMirror.save.stand === undefined);
  check('C home: the client books the tithe, its run counters and the death tally as a solo crossing books them',
    acct1.credits === credits0 + 10 && (acct1.ledger[LEDGER_ACCOUNT_DEATHS] ?? 0) === deaths0 + 1 + (V1.ledger?.[LEDGER_ACCOUNT_DEATHS] ?? 0) && T1.link.crossings === 1,
    `credits ${credits0} > ${acct1.credits}`);
  const slotSave = parsed(slot1);
  check('C home: its roster slot holds the crossed vessel (Undying, stripped) and its card follows; nothing falls',
    slotSave?.charId === charId1 && slotSave.modeStage === 1 && (slotSave.items ?? []).length === 0 && Object.keys(slotSave.equipped ?? {}).length === 0
    && card1().stage === 1 && !card1().fallen, JSON.stringify({ stage: slotSave?.modeStage, items: slotSave?.items?.length }));
  check('C home: no run ends (no `runEnd`, no `corpse`, no `fell`)', !T1.rows.some(m => m.t === 'runEnd' || m.t === 'corpse' || m.t === 'fell'));
  // A mirror inside THE DEATH BEAT (the desk's own beat, a farewell) names no stand either.
  const beatRows = T1.rows.length, inBeat = hero.dead;
  host.vessels.mirror(T1.id);
  await waitFor(() => T1.rows.slice(beatRows).some(m => m.t === 'heroSave'), 10);
  const beatMirror = T1.rows.slice(beatRows).find(m => m.t === 'heroSave');
  check('C return: a mirror inside THE DEATH BEAT names no stand (the body lies dead; its wake is the hearth)',
    inBeat && beatMirror?.t === 'heroSave' && beatMirror.save.stand === undefined);
  await waitFor(() => !hero.dead, sec(VESSEL_CFG.deathBeatSec) + 30);
  check('C wake: when the beat ends the hero stands at the hearth, whole, under THE SPAWN GRACE (never a leave)',
    !hero.dead && !hero.downed && hero.life === hero.maxLife() && hero.untargetable && fromHearth(s1) < 140
    && !!seatOf(T1.id) && !!host.vessels.vesselOf(T1.id), `${Math.round(fromHearth(s1))} px from the hearth`);
  check('C wake: still no run ends', !T1.rows.some(m => m.t === 'runEnd'));
  await waitFor(() => T1.rows.slice(beatRows).some(m => m.t === 'heroSave' && !!m.save.stand), 30);
  const home = T1.rows.slice(beatRows).flatMap(m => (m.t === 'heroSave' && m.save.stand ? [m.save.stand] : []))[0];
  check('C return: THE WAKE mirrors the hearth\'s stand home (where its next login lands)',
    !!home && home.spot.zoneId === w.zone.id && Math.hypot(home.spot.x - hearth.x, home.spot.y - hearth.y) < 140, JSON.stringify(home?.spot));
}

// ============================================================= V: THE STAGE'S RING ==
{
  const fresh = await travel(acct1, null, 'Successor'); // the same account's next hero (a fresh card hero)
  await waitFor(() => !!seatOf(fresh.id), 60);
  place(seatOf(fresh.id)!, hearth.x + 420, hearth.y + 260);
  place(s1, hearth.x + 400, hearth.y + 250);
  await runTicks(6);
  const body = host.corpses.forAccount(acct1.accountId)[0];
  check('V own: the self-only body stands for its own character', !!body && host.corpses.standing(T1.id).some(b => b.id === body.id));
  check('V own: never for another hero of the same account', !host.corpses.standing(fresh.id).some(b => b.id === body?.id));
  fresh.c.leave();
  await waitFor(() => !seatOf(fresh.id), 120);
}

// ========================================================= U: 'stay', in another unit ==
{
  const stage0 = immortal.stages[0], was = stage0.onDeath;
  stage0.onDeath = 'stay'; // a stage that survives death without stepping (no stock mode wears one yet)
  try {
    const acct2 = claimedAccount();
    const V2 = forgeVessel({ classId: 'warrior', level: 6, name: 'Stayer', charId: 'c-cov-stayer', modeId: 'immortal', bag: 1, worn: ['boots'], coarse: 8 });
    await enroll(acct2, V2);
    const T2 = await travel(acct2, V2, 'Stayer');
    await waitFor(() => !!seatOf(T2.id), 60);
    const dest = w.exits.find(e => e.to !== '?' && e.to !== w.zone.id)?.to;
    const u = dest ? host.units.travel(T2.id, dest) : null;
    await runTicks(4);
    const s2 = seatOf(T2.id)!;
    check('U unit: the vessel walks into another zone\'s unit', !!u && u.role === 'unit' && host.units.unitOf(T2.id)?.role === 'unit', String(dest));
    const hero = host.units.worldOf(T2.id)!.seatHero(s2);
    host.units.within(T2.id, uw => uw.kill(hero));
    await runTicks(2);
    check('U stay: the final down crosses without advancing (the stage stays)', hero.dead && s2.meta.modeStage === 0 && carried(s2) === 0);
    await waitFor(() => !hero.dead, sec(VESSEL_CFG.deathBeatSec) + 30);
    await runTicks(2);
    check('U wake: it wakes in the keeper\'s World at the hearth (the hand-off\'s landing), under the grace',
      host.units.unitOf(T2.id)?.role === 'keeper' && fromHearth(seatOf(T2.id)!) < 140 && !hero.dead && hero.untargetable,
      `${host.units.unitOf(T2.id)?.key} ${Math.round(fromHearth(seatOf(T2.id)!))} px`);
    const sw = T2.rows.find(m => m.t === 'stageDeath');
    check('U word: its word names the stage it kept', sw?.t === 'stageDeath' && sw.stage === 0);
    T2.c.leave();
    await waitFor(() => !seatOf(T2.id), 120);
  } finally { stage0.onDeath = was; }
}

// ===================================================================== F: THE FALL ==
{
  // The Undying has walked a while since its crossing: a piece worn, a purse.
  const helm = rollItem({ ilvl: 9, rarity: 'rare', category: 'helmet' })!;
  s1.meta.items.push(helm); w.equipItem(s1, helm.uid, 'helmet');
  s1.meta.essences.coarse = 12;
  w.seatHero(s1).untargetable = false;
  place(s1, hearth.x + 380, hearth.y - 220);
  await runTicks(3);
  const standRows = T1.rows.length;
  host.vessels.mirror(T1.id); // its slot holds where it stands (THE RETURN), as every walking mirror's does
  await waitFor(() => T1.rows.slice(standRows).some(m => m.t === 'heroSave'), 10);
  const stoodAt = parsed(slot1)?.stand;
  const credits0 = acct1.credits, deaths0 = acct1.ledger[LEDGER_ACCOUNT_DEATHS] ?? 0, level = w.seatHero(s1).level;
  const before = T1.rows.length;
  w.kill(w.seatHero(s1));
  await runTicks(2);
  const rec = host.corpses.fallRecord(acct1.accountId, charId1);
  check('F decided: the Undying\'s final down fells it the tick it lands (THE FALL RECORD, no wake)',
    host.vessels.undyingFalls === 1 && !!rec && rec.level === level && !host.vessels.vesselOf(T1.id) && w.seatHero(s1).dead);
  const body = host.corpses.forAccount(acct1.accountId).find(b => b.loot.items.some(it => it.kind === 'gear' && it.item.uid === helm.uid));
  check('F covenant: a self-only body holds the worn piece; the carry is stripped', !!body && body.ring === 'own' && carried(s1) === 0);
  await waitFor(() => T1.rows.slice(before).some(m => m.t === 'runEnd'), sec(VESSEL_CFG.deathBeatSec) + 30);
  const after = T1.rows.slice(before);
  const fell = after.find(m => m.t === 'fell');
  check('F word: the stripped vessel home, then `fell` (its level, the record\'s time), then `runEnd`',
    after.findIndex(m => m.t === 'heroSave') >= 0 && after.findIndex(m => m.t === 'fell') > after.findIndex(m => m.t === 'heroSave')
    && after.findIndex(m => m.t === 'runEnd') > after.findIndex(m => m.t === 'fell')
    && fell?.t === 'fell' && fell.level === level && fell.at === rec?.at && fell.reckoning.mult === 0 && fell.reckoning.carried === 12, kinds(after));
  check('F leave: the seat leaves the world after the beat', !seatOf(T1.id));
  const card = card1();
  check('F card: the client stamps its own roster card FALLEN with the fee frozen at receipt, the shard\'s time beside it',
    !!card.fallen && card.fallen.fee === resurrectFee(level, acct1.level) && card.fallen.level === level && card.fallen.at === rec?.at, JSON.stringify(card.fallen));
  check('F slot: the slot is kept (a roster vessel\'s conclusion never wipes), holding the stripped vessel',
    parsed(slot1)?.charId === charId1 && (parsed(slot1)?.items ?? []).length === 0 && parsed(slot1)?.modeStage === 1);
  check('F return: the fall forgets its stand (neither the slot\'s vessel nor the desk names one: its resurrection wakes at the hearth)',
    !!stoodAt && parsed(slot1)?.stand === undefined && host.vessels.keptStand(acct1.accountId, charId1) === undefined, JSON.stringify(stoodAt?.spot));
  check('F book: the Undying pays nothing and counts nothing (its stage\'s own switches); the screen is staged',
    acct1.credits === credits0 && (acct1.ledger[LEDGER_ACCOUNT_DEATHS] ?? 0) === deaths0 && !!T1.link.takeDeath(T1.c, null));
  T1.c.leave();
  await runTicks(5);
  // THE NEXT TRAVEL: the client's own law keeps a fallen vessel home; an upload anyway is refused.
  check('F travel: the client\'s reader keeps a fallen vessel home', (await readTravelingVessel(acct1, charId1)) === null);
  const stale = parsed(slot1)!;
  const T1b = await travel(acct1, stale, 'Ysolde');
  await waitFor(() => T1b.rows.some(m => m.t === 'refused'), 60);
  const refused = T1b.rows.find(m => m.t === 'refused');
  check('F refused: the next travel is refused with the word \'fallen\' (back to Mu), no seat',
    refused?.t === 'refused' && refused.word === 'fallen' && refused.mu === true && !seatOf(T1b.id), kinds(T1b.rows));
  check('F late word: the fall is re-spoken first (THE LATE WORD\'s shape), and nothing is booked twice',
    T1b.rows.findIndex(m => m.t === 'fell') >= 0 && T1b.rows.findIndex(m => m.t === 'fell') < T1b.rows.findIndex(m => m.t === 'refused')
    && acct1.credits === credits0 && card1().fallen?.at === rec?.at);
  T1b.c.leave();
  await runTicks(5);
  // THE RESURRECTION at the Vault's Fallen shelf, then the walk back.
  const entry = allUnlockables(acct1).find(u => u.id === resurrectUnlockId(charId1))!;
  applyCredits(acct1, entry.cost);
  investUnlock(acct1, entry, entry.cost);
  const risen = card1();
  check('F risen: the pour clears the stamp and stamps risenAt, never before the fall\'s own time',
    !risen.fallen && typeof risen.risenAt === 'number' && risen.risenAt > (rec?.at ?? Infinity), JSON.stringify({ risenAt: risen.risenAt, at: rec?.at }));
  const back = await readTravelingVessel(acct1, charId1);
  check('F risen: the traveling vessel carries its card\'s risenAt', !!back && back.risenAt === risen.risenAt);
  const T1c = await travel(acct1, back, 'Ysolde');
  await waitFor(() => !!seatOf(T1c.id), 60);
  check('F lifted: a risenAt later than the fall lifts the record; the vessel walks the shard again',
    !!seatOf(T1c.id) && !!host.vessels.vesselOf(T1c.id) && !host.corpses.fallRecord(acct1.accountId, charId1) && !T1c.rows.some(m => m.t === 'refused'));
  const risenSeat = seatOf(T1c.id);
  check('F return: the risen vessel walks in at the hearth', !!risenSeat && fromHearth(risenSeat) < 140,
    `${risenSeat ? Math.round(fromHearth(risenSeat)) : -1} px from the hearth`);
  T1c.c.leave();
  await waitFor(() => !seatOf(T1c.id), 120);
}

// ======================================== K: the kneel saves every stage; the run-out ==
{
  const mate = await travel(claimedAccount(), null, 'Mender');
  await waitFor(() => !!seatOf(mate.id), 60);
  const m = seatOf(mate.id)!;
  const stages: [string, string, number][] = [['Sworn', 'immortal', 0], ['Undying', 'immortal', 1], ['Mortal', 'mortal', 0]];
  for (const [label, modeId, modeStage] of stages) {
    const acct = claimedAccount();
    const V = forgeVessel({ classId: 'warrior', level: 5, name: label, charId: `c-cov-k-${label}`, modeId, modeStage, bag: 1, worn: ['boots'], coarse: 5 });
    if (modeId === 'immortal') await enroll(acct, V);
    const T = await travel(acct, V, label);
    await waitFor(() => !!seatOf(T.id), 60);
    const s = seatOf(T.id)!;
    host.parties.invite(mate.id, T.id, w.time);
    host.parties.accept(T.id, w.time);
    check(`K ${label}: grouped with a mate`, !!host.parties.partyOf(T.id) && host.parties.partyOf(T.id) === host.parties.partyOf(mate.id));
    place(s, hearth.x + 300, hearth.y + 300); place(m, hearth.x + 300, hearth.y - 100);
    s.actor.untargetable = false;
    await runTicks(3);
    const counts0 = [host.vessels.crossings, host.vessels.undyingFalls, host.vessels.falls].join();
    w.kill(w.seatHero(s));
    await runTicks(sec(1));
    check(`K ${label}: its down is held by the mate (a down, not a death)`, w.seatHero(s).downed && !w.seatHero(s).dead
      && [host.vessels.crossings, host.vessels.undyingFalls, host.vessels.falls].join() === counts0);
    place(m, s.actor.pos.x + 30, s.actor.pos.y);
    await waitFor(() => !w.seatHero(s).downed, sec(4));
    await runTicks(3);
    check(`K ${label}: a mate's kneel inside the bleed-out saves it (no stage death, the stage and the carry kept)`,
      !w.seatHero(s).downed && !w.seatHero(s).dead && s.meta.modeStage === modeStage && carried(s) > 0
      && [host.vessels.crossings, host.vessels.undyingFalls, host.vessels.falls].join() === counts0 && !T.rows.some(x => x.t === 'stageDeath' || x.t === 'fell' || x.t === 'corpse'));
    if (label !== 'Sworn') { T.c.leave(); await waitFor(() => !seatOf(T.id), 120); continue; }
    // The run-out (THE BLEED-OUT ends the wait: the one door the stage's death takes over).
    const dial = VESSEL_CFG.bleedOutSec;
    VESSEL_CFG.bleedOutSec = 2;
    try {
      place(m, hearth.x + 300, hearth.y - 100);
      await runTicks(3);
      const cross0 = host.vessels.crossings;
      w.kill(w.seatHero(s));
      await runTicks(sec(1));
      check('K run-out: a held Sworn down waits while its bleed-out runs', w.seatHero(s).downed && host.vessels.crossings === cross0);
      await waitFor(() => host.vessels.crossings === cross0 + 1, sec(2) + 30);
      check('K run-out: when the bleed-out runs out the stage\'s death takes the down (the crossing)',
        host.vessels.crossings === cross0 + 1 && s.meta.modeStage === 1 && T.rows.some(x => x.t === 'stageDeath'));
    } finally { VESSEL_CFG.bleedOutSec = dial; }
    await waitFor(() => !w.seatHero(s).dead, sec(VESSEL_CFG.deathBeatSec) + 30);
    T.c.leave();
    await waitFor(() => !seatOf(T.id), 120);
  }
  mate.c.leave();
  await waitFor(() => !seatOf(mate.id), 120);
}

// ============================================================== O: THE OWED CROSSING ==
{
  const acctO = claimedAccount();
  const charIdO = 'c-cov-oath';
  const VO = forgeVessel({ classId: 'rogue', level: 7, name: 'Oath', charId: charIdO, modeId: 'immortal', bag: 2, worn: ['gloves'], coarse: 20 });
  await enroll(acctO, VO);
  const mate = await travel(claimedAccount(), null, 'Holder');
  const TO = await travel(acctO, VO, 'Oath');
  await waitFor(() => !!seatOf(mate.id) && !!seatOf(TO.id), 60);
  const so = seatOf(TO.id)!, sm = seatOf(mate.id)!;
  host.parties.invite(mate.id, TO.id, w.time); host.parties.accept(TO.id, w.time);
  place(so, hearth.x - 300, hearth.y + 200); place(sm, hearth.x - 300, hearth.y - 200);
  so.actor.untargetable = false;
  await runTicks(3);
  w.kill(w.seatHero(so));
  await runTicks(sec(0.5));
  check('O held: the vessel\'s down is held by its mate', w.seatHero(so).downed && !w.seatHero(so).dead);
  const credits0 = acctO.credits, cross0 = host.vessels.crossings;
  TO.c.leave(); // the client walks away from its own down
  await waitFor(() => !seatOf(TO.id), 120);
  const owed = host.corpses.owedCrossing(acctO.accountId, charIdO);
  check('O owed: leaving while down is never the road out of a death: the crossing runs unheard and is owed',
    host.vessels.crossings === cross0 + 1 && !!owed && owed.stage === 1 && acctO.credits === credits0
    && host.corpses.forAccount(acctO.accountId).some(b => b.ring === 'own'));
  // Its client still holds the vessel as it stood before the down, the stand its last mirror named with it.
  const away = { seed: w.manifest.seed >>> 0, spot: { zoneId: w.zone.id, x: hearth.x - 300, y: hearth.y + 200 }, tier: 0 };
  const TO2 = await travel(acctO, { ...VO, stand: away }, 'Oath');
  await waitFor(() => !!seatOf(TO2.id) && TO2.rows.some(m => m.t === 'stageDeath'), 60);
  const so2 = seatOf(TO2.id);
  check('O arrival: its next upload crosses on arrival (stripped, its stage stepped)',
    !!so2 && so2.meta.modeStage === 1 && carried(so2) === 0 && !host.corpses.owedCrossing(acctO.accountId, charIdO));
  check('O word: the crossed vessel goes home, then the word, booked once',
    TO2.rows.findIndex(m => m.t === 'heroSave') >= 0 && TO2.rows.findIndex(m => m.t === 'stageDeath') > TO2.rows.findIndex(m => m.t === 'heroSave')
    && acctO.credits === credits0 + Math.floor(20 * IMMORTAL_CFG.firstDeathPayoutMult) && TO2.link.crossings === 1, kinds(TO2.rows));
  const arrival = TO2.rows.find(m => m.t === 'heroSave');
  check('O return: the crossed arrival sheds the stand its upload carried: it wakes at the hearth, its mirror naming none',
    !!so2 && fromHearth(so2) < 140 && arrival?.t === 'heroSave' && arrival.save.stand === undefined,
    `${so2 ? Math.round(fromHearth(so2)) : -1} px from the hearth`);
  TO2.c.leave(); mate.c.leave();
  await waitFor(() => !seatOf(TO2.id) && !seatOf(mate.id), 120);
}

// ======================================================== M: the mortal's word unchanged ==
{
  const acctM = claimedAccount();
  const VM = forgeVessel({ classId: 'warrior', level: 4, name: 'Brannoc', charId: 'c-cov-brannoc', bag: 0, worn: ['boots'], coarse: 3 });
  const TM = await travel(acctM, VM, 'Brannoc');
  await waitFor(() => !!seatOf(TM.id), 60);
  const sm = seatOf(TM.id)!;
  sm.actor.untargetable = false;
  const falls0 = host.vessels.falls;
  w.kill(w.seatHero(sm));
  await waitFor(() => TM.rows.some(m => m.t === 'runEnd'), sec(VESSEL_CFG.deathBeatSec) + 30);
  check('M mortal: an ungrouped mortal vessel still falls at once: `corpse` then `runEnd`, never a stage word',
    host.vessels.falls === falls0 + 1 && TM.rows.findIndex(m => m.t === 'corpse') >= 0 && TM.rows.findIndex(m => m.t === 'runEnd') > TM.rows.findIndex(m => m.t === 'corpse')
    && !TM.rows.some(m => m.t === 'stageDeath' || m.t === 'fell') && !host.corpses.forAccount(acctM.accountId).some(b => b.ring === 'own'), kinds(TM.rows));
  TM.c.leave();
  await runTicks(5);
}

await waitFor(() => w.seats.length === 1, 120);
await host.stop();
restoreRandom();
await new Promise(r => setTimeout(r, 600)); // in-flight socket closes settle before the exit (the shard rigs' law)
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
