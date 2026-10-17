// THE OFFLINE HERO'S GROUND ON THE NATIVE HOST (shard W12 × the retained host, server/nativeShardHost.ts).
// The vessel desk's ground ledger (server/vessel.ts groundLedger / adoptGround) rides the dedicated
// checkpoint through the one hook the classic host uses — the keeper writer's heldQuestGround read by
// World.serializeWorldState inside NativeShardRuntime.capture's genuine serializeCharacter — and stands
// back up from the startup record alone (NativeShardRuntime.startupQuestGround, the validated
// NativeAreaCharacterResume.record the graph restore reads). Rigs:
//   A  the native vessel view carries seatQuests, so a mirror or a standing leave of an UPLOADED vessel
//      never throws (red at e7320eca: TypeError at noteGround on every such mirror/leave);
//   B  a hero holding a quest on event ground (the Unmade's sealed vault): a save while it STANDS, never
//      mirrored, claims its vault off the live journal inside the busy capture; it logs out on its feet and
//      the checkpoint keeps the vault under the reserved overlay row (THE ZONE-CLAIM CONVENTION);
//   C  an actual offline restart through NativeShardStore: the vault survives the scrub, the desk holds the
//      hero's ground with its ORIGINAL timestamp, and the hero logs back in holding its quest;
//   D  shared claims: a second hero holding the same vault keeps the claim when the first's quest ends
//      (the keeper's own turn-in linger beside the quartermaster);
//   E  the keepMs boundary: equality is kept, strictly expired is released;
//   F  a foreign edit of the checkpoint refuses the replacement while the refused capture's completed
//      effects stand (a standing hero's fresh stamp, an absent hero's frozen one), with no rollback and no
//      re-stamp of the absent row on the retry;
//   G  an absent hero gone past the dial releases its ground at the next save; the vault leaves the chart.
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join as pathJoin } from 'node:path';
import { tmpdir } from 'node:os';
import { NativeShardHost } from '../server/nativeShardHost';
import { SHARD_CFG } from '../server/shardHost';
import { VESSEL_CFG, judgeVessel } from '../server/vessel';
import { WsTransport } from '../src/net/ws';
import type { SessionMsg } from '../src/net/transport';
import { RemoteInput } from '../src/net/remote';
import { CLASSES } from '../src/data/classes';
import { QUESTS } from '../src/quests/defs';
import { ensureAccountId, makeAccount } from '../src/meta/account';
import { serializeCouchGuest, throngRowsOf, type CharacterSave } from '../src/meta/character';
import { QUEST_GROUND_LEDGER, type QuestGroundSave } from '../src/engine/questLedger';
import { seedGlobalRandom } from '../src/sim/rng';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
const t0 = Date.now();
const DT = 1 / SHARD_CFG.tickHz;
const sec = (s: number): number => Math.ceil(s * SHARD_CFG.tickHz);
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const logs: string[] = [];
const log = (line: string): void => { logs.push(line); };
const faultLines = (): string[] => logs.filter(l => /fault|TypeError/i.test(l));
async function tickH(h: NativeShardHost, cond: () => boolean, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) { if (cond()) return true; h.tick(DT); await yieldIO(); }
  return cond();
}
interface Client { wire: WsTransport; id: string; heard: SessionMsg[] }
async function joinTo(h: NativeShardHost, port: number, name: string, accountId: string, vessel: CharacterSave): Promise<Client> {
  const wire = new WsTransport();
  const cl: Client = { wire, id: '', heard: [] };
  wire.onSession(m => { cl.heard.push(m); });
  const welcome = await wire.connect(`ws://127.0.0.1:${port}`, { name, classId: vessel.classId, accountId }, vessel);
  cl.id = welcome.self;
  await tickH(h, () => !!h.seats.seatOf(cl.id), 240);
  await tickH(h, () => false, 3);
  return cl;
}
/** A vessel forged on a scratch seat of the keeper's area in the couch guest's shape (the wire's). */
function forgeVessel(h: NativeShardHost, charId: string, name: string, level: number): CharacterSave {
  const service = h.seats;
  const seat = service.keeperWorld().addSeat('forge-' + charId, warrior, new RemoteInput('forge-' + charId));
  seat.meta.charId = charId; seat.meta.name = name; seat.meta.modeId = 'mortal'; seat.meta.modeStage = 0;
  const view = service.worldOf(seat.id)!;
  view.seatHero(seat).level = level;
  const companions = view.actors.filter(a => a.companion && a.owner === seat.actor).map(a => view.companionBonds.saved(a));
  const save = JSON.parse(JSON.stringify(serializeCouchGuest(view, seat, { companions, throng: throngRowsOf(view, seat.actor), throngClaimed: [] }))) as CharacterSave;
  service.within(seat.id, w => w.removeSeat(seat.id));
  if ('refused' in judgeVessel(save)) throw new Error('forged vessel refused: ' + JSON.stringify(judgeVessel(save)));
  return save;
}
interface Checkpoint { kind: string; keeper: CharacterSave & { world: { overlays?: Record<string, unknown>; zones: { id: string }[] } } }
const diskOf = (h: NativeShardHost): Checkpoint => JSON.parse(readFileSync(h.savePath!, 'utf8')) as Checkpoint;
const ledgerIn = (d: Checkpoint): QuestGroundSave | undefined => d.keeper.world.overlays?.[QUEST_GROUND_LEDGER] as QuestGroundSave | undefined;
const hasZone = (d: Checkpoint, id: string): boolean => d.keeper.world.zones.some(z => z.id === id);
/** The event ground a seat's LIVE journal names right now (the desk's own read, for the disk to match). */
const liveGround = (h: NativeShardHost, seatId: string): string[] =>
  [...new Set((h.world.seatQuests.get(seatId)?.active ?? []).map(q => q.zoneId))].filter(id => !!h.world.zoneMap[id]?.eventOwned).sort();
const acceptOn = (h: NativeShardHost, seatId: string, questId: string): string => {
  const seat = h.seats.seatOf(seatId)!, area = h.areaOf(seat);
  area.quests.withQuestHand(seat, () => area.questInteraction.acceptQuest(QUESTS[questId]));
  return h.world.seatQuests.get(seatId)?.active.find(q => q.questId === questId)?.zoneId ?? '';
};
const same = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

const warrior = CLASSES.find(c => c.id === 'warrior')!;
const SEED = 0x5e7e5e7, QID = 'unmade_l20', CHAR_V = 'c-native-vesper', CHAR_W = 'c-native-wren';
const keepMs = VESSEL_CFG.groundKeptDays * 86_400_000;
const dir = mkdtempSync(pathJoin(tmpdir(), 'hw-native-ground-'));
const restoreRandom = seedGlobalRandom(0x6e0d);
const realNow = Date.now;
const acctA = makeAccount(); ensureAccountId(acctA);
const acctB = makeAccount(); ensureAccountId(acctB);
const A = acctA.accountId!, B = acctB.accountId!;
const keyV = `${A}:${CHAR_V}`, keyW = `${B}:${CHAR_W}`;
const clients: WsTransport[] = [];
const hosts: NativeShardHost[] = [];
const boot = async (): Promise<NativeShardHost> => {
  const h = new NativeShardHost({ seed: SEED, saveDir: dir, open: true, log });
  hosts.push(h);
  await h.ready();
  return h;
};
try {
  // ---------------------------------------------------------------- A + B: the first life ----
  const h1 = await boot();
  const port1 = await h1.listen(0, '127.0.0.1');
  check('A view: the native vessel view carries seatQuests (the desk\'s noteGround reads it on every mirror and standing leave)',
    'seatQuests' in h1.seats.keeperWorld() && h1.seats.keeperWorld().seatQuests instanceof Map);
  check('A hook: the keeper writer\'s save claims the desk\'s ground (World.heldQuestGround installed by the native host)',
    h1.world.heldQuestGround !== null);
  const vesselV = forgeVessel(h1, CHAR_V, 'Vesper', 20);
  const V = await joinTo(h1, port1, 'Vesper', A, vesselV);
  clients.push(V.wire);
  const vault = acceptOn(h1, V.id, QID);
  check('B held: the hero takes a quest on event ground (the Unmade\'s sealed vault, a special arena minted on the native campaign)',
    !!vault && !!h1.world.zoneMap[vault]?.eventOwned, `vault '${vault}'`);
  // THE LIVE CLAIM: a save while the uploaded vessel STANDS, its quest never mirrored — the capture's own
  // groundLedger notes the hero off its live journal through the native view (the busy capture never re-entered).
  const tLive = Date.now();
  let liveError: unknown = null;
  try { h1.persist(); } catch (e) { liveError = e; }
  const save0 = liveError ? null : diskOf(h1), led0 = save0 ? ledgerIn(save0) : undefined, rowLive = h1.vessels.heldGround(A, CHAR_V);
  check('B live: a save while the hero stands (never mirrored) claims its vault off the LIVE journal inside the capture',
    liveError === null && !!led0 && same(led0.heroes[keyV]?.zones ?? [], liveGround(h1, V.id)) && same(liveGround(h1, V.id), [vault])
      && led0.ownedZones.includes(vault) && !!save0 && hasZone(save0, vault) && !!rowLive && rowLive.at >= tLive && rowLive.at <= Date.now() && led0.heroes[keyV]?.at === rowLive.at,
    liveError ? String(liveError) : `disk ${JSON.stringify(led0?.heroes[keyV])} live ${JSON.stringify(liveGround(h1, V.id))}`);
  // THE MIRROR of an uploaded vessel (red at e7320eca): its heroSave goes home and its ground is noted.
  const n0 = V.heard.length;
  let mirrorError: unknown = null;
  try { h1.vessels.mirror(V.id); } catch (e) { mirrorError = e; }
  await tickH(h1, () => V.heard.slice(n0).some(m => m.t === 'heroSave'), 120);
  const home = (V.heard.slice(n0).find(m => m.t === 'heroSave') as { save: CharacterSave } | undefined)?.save;
  check('A mirror: an uploaded vessel\'s mirror on the native host never throws, its heroSave goes home and its ground is noted',
    mirrorError === null && !!home && !!h1.vessels.heldGround(A, CHAR_V)?.zones.includes(vault), String(mirrorError ?? ''));
  // THE LEAVE on its feet (red at e7320eca): the seat leaves, no host callback fault, the ground stays noted.
  V.wire.leave();
  const left = await tickH(h1, () => !h1.seats.seatOf(V.id), 240);
  const rowV1 = h1.vessels.heldGround(A, CHAR_V);
  check('A leave: a standing uploaded vessel leaves on the native host without a host callback fault, and the desk keeps its ground',
    left && h1.faults === 0 && faultLines().length === 0 && !!rowV1?.zones.includes(vault), faultLines().slice(0, 2).join(' | '));
  const T1 = rowV1?.at ?? 0;
  check('B stamp: the absent hero\'s ground carries the wall-clock stamp of its leave', Number.isFinite(T1) && T1 >= (rowLive?.at ?? 0) && T1 <= Date.now());
  h1.persist();
  const save1 = diskOf(h1), led1 = ledgerIn(save1);
  check('B save: the checkpoint keeps the absent hero\'s vault and claims it in the reserved ground row (THE ZONE-CLAIM CONVENTION)',
    save1.kind === 'retained-native-shard' && hasZone(save1, vault) && !!led1?.ownedZones.includes(vault)
      && !!led1?.heroes[keyV]?.zones.includes(vault) && led1?.heroes[keyV]?.at === T1,
    `owned ${JSON.stringify(led1?.ownedZones)} heroes ${JSON.stringify(Object.keys(led1?.heroes ?? {}))}`);
  await h1.stop({ persist: false });

  // ------------------------------------------------------------ C: the actual offline restart ----
  const h2 = await boot();
  const port2 = await h2.listen(0, '127.0.0.1');
  const rowV2 = h2.vessels.heldGround(A, CHAR_V);
  check('C resume: a restarted native shard keeps the absent hero\'s vault through the scrub, and its desk the hero\'s ground',
    !!h2.world.zoneMap[vault]?.eventOwned && !!rowV2?.zones.includes(vault), `zones ${JSON.stringify(rowV2?.zones)}`);
  check('C stamp: the restart preserves the ORIGINAL claim timestamp (no fresh TTL from reopening)', rowV2?.at === T1, `${rowV2?.at} vs ${T1}`);
  const V2 = await joinTo(h2, port2, 'Vesper', A, JSON.parse(JSON.stringify(home)) as CharacterSave);
  clients.push(V2.wire);
  const back = h2.world.seatQuests.get(V2.id)?.active.find(q => q.questId === QID);
  check('C return: the hero logs back in holding its quest (its journal finds the vault standing)',
    !!back && back.zoneId === vault, `active ${JSON.stringify(h2.world.seatQuests.get(V2.id)?.active.map(q => q.questId))}`);

  // ------------------------------------------------------------------ D1: the shared claim ----
  const vesselW = forgeVessel(h2, CHAR_W, 'Wren', 20);
  const W = await joinTo(h2, port2, 'Wren', B, vesselW);
  clients.push(W.wire);
  const vaultW = acceptOn(h2, W.id, QID);
  check('D shared: a second hero taking the same quest holds the SAME vault (existing enrollments never mint another approach)',
    vaultW === vault, `'${vaultW}'`);
  W.wire.leave();
  await tickH(h2, () => !h2.seats.seatOf(W.id), 240);
  const TW = h2.vessels.heldGround(B, CHAR_W)?.at ?? 0;
  check('D away: the second hero leaves on its feet holding the vault; its stamp is its leave\'s', TW > 0 && !!h2.vessels.heldGround(B, CHAR_W)?.zones.includes(vault));

  // ------------------------------------------------------- F: the refused foreign replacement ----
  // The refused capture completes NEW effects: the standing first hero is re-noted (a fresh stamp above T1),
  // the absent second hero's row stands frozen at TW. The refusal replaces no bytes and rolls nothing back.
  const stampV0 = h2.vessels.heldGround(A, CHAR_V)?.at ?? 0;
  check('F before: the restart\'s row still carries T1 for the standing first hero (nothing has re-noted it yet)', stampV0 === T1);
  const bytes0 = readFileSync(h2.savePath!), tampered = Buffer.concat([bytes0, Buffer.from(' ')]);
  writeFileSync(h2.savePath!, tampered);
  const tRefuse = Date.now();
  let refused: unknown = null;
  try { h2.persist(); } catch (e) { refused = e; }
  const after = readFileSync(h2.savePath!);
  check('F refused: a checkpoint edited outside its owner refuses the replacement (the foreign bytes stand whole, no stray file)',
    refused instanceof Error && /outside its owner/.test(refused.message) && after.equals(tampered)
      && readdirSync(dir).every(f => f.endsWith('.json')), String(refused ?? 'no refusal'));
  const stampV1 = h2.vessels.heldGround(A, CHAR_V)?.at ?? 0;
  check('F intact: the refused capture\'s completed effects stand (the standing hero re-noted with a fresh stamp above T1, the absent hero frozen at TW): no rollback',
    stampV1 > T1 && stampV1 >= tRefuse && h2.vessels.heldGround(B, CHAR_W)?.at === TW && !!h2.vessels.heldGround(B, CHAR_W)?.zones.includes(vault),
    `V ${stampV1} vs T1 ${T1}; W ${h2.vessels.heldGround(B, CHAR_W)?.at} vs TW ${TW}`);
  writeFileSync(h2.savePath!, bytes0);
  let retry: unknown = null;
  try { h2.persist(); } catch (e) { retry = e; }
  const save3 = diskOf(h2), led3 = ledgerIn(save3);
  check('F retry: once the bytes are its own again the next save lands: the absent row at TW exactly (no re-stamp on retry), the standing row live',
    retry === null && led3?.heroes[keyW]?.at === TW && (led3?.heroes[keyV]?.at ?? 0) >= stampV1 && !!led3?.ownedZones.includes(vault) && hasZone(save3, vault)
      && readFileSync(h2.savePath!).length !== tampered.length, String(retry ?? ''));

  // ------------------------------------------------------------ D2: the first hero's quest ends ----
  // The quest's field is done (the vault cleared, as the classic rig stamps it); the TURN-IN is the keeper's own
  // lane (engine/nativeSceneQuestInteraction.ts questGiverStep): the hand seat idle beside the quartermaster for
  // QUESTGIVER_DWELL, inside the frame's own operation — no door the probe opens itself.
  let endError: unknown = null, ended = false;
  if (back) {
    try {
      const seatV2 = h2.seats.seatOf(V2.id)!, areaV2 = h2.areaOf(seatV2);
      const giver = areaV2.combat.scene.actors.find(a => a.defId === 'townsfolk_questgiver' && !a.dead);
      if (!giver) throw new Error('no quartermaster in the keeper\'s area');
      h2.coordinator.landHostedSeat(seatV2, { x: giver.pos.x + 30, y: giver.pos.y }, { tier: Math.max(0, Math.floor(giver.tier ?? 0)) });
      back.fieldDone = true;
      ended = await tickH(h2, () => !!h2.world.seatQuests.get(V2.id)?.completed.has(QID), sec(6));
    } catch (e) { endError = e; }
  }
  const bookV2 = h2.world.seatQuests.get(V2.id);
  check('D ended: standing idle by the quartermaster, the first hero\'s turn-in completes the quest through the frame\'s own linger',
    endError === null && ended && !!bookV2?.completed.has(QID) && !bookV2.active.some(q => q.questId === QID),
    endError instanceof Error ? (endError.stack ?? endError.message).split('\n').slice(0, 5).join(' <- ') : `ended ${ended} active ${JSON.stringify(bookV2?.active.filter(q => q.questId === QID))}`);
  h2.vessels.mirror(V2.id);
  V2.wire.leave();
  await tickH(h2, () => !h2.seats.seatOf(V2.id), 240);
  h2.persist();
  const save2 = diskOf(h2), led2 = ledgerIn(save2);
  check('D claim: with the first hero\'s quest ended, the vault stays claimed by the second hero alone and stays in the save',
    !h2.vessels.heldGround(A, CHAR_V) && !!led2?.heroes[keyW]?.zones.includes(vault) && !led2?.heroes[keyV]
      && !!led2?.ownedZones.includes(vault) && hasZone(save2, vault) && led2?.heroes[keyW]?.at === TW,
    `heroes ${JSON.stringify(led2?.heroes)}`);

  // ---------------------------------------------------------------- E: the keepMs boundary ----
  const atBoundary = h2.vessels.groundLedger(TW + keepMs);
  check('E boundary: a hero gone EXACTLY groundKeptDays keeps its ground (equality is kept)',
    !!atBoundary?.heroes[keyW]?.zones.includes(vault) && atBoundary?.heroes[keyW]?.at === TW && !!h2.vessels.heldGround(B, CHAR_W));
  const past = h2.vessels.groundLedger(TW + keepMs + 1);
  check('E expired: one millisecond past the dial releases it (strictly expired)',
    !past?.heroes[keyW] && !(past?.ownedZones ?? []).includes(vault) && !h2.vessels.heldGround(B, CHAR_W), JSON.stringify(past ?? null));
  h2.vessels.adoptGround(led2);
  check('E adopt: a saved ledger stands back up as written (the restart\'s road)', h2.vessels.heldGround(B, CHAR_W)?.at === TW);

  // ---------------------------------------------------------- G: the expiry at the next save ----
  Date.now = (): number => TW + keepMs + 1;
  let aged: unknown = null;
  try { h2.persist(); } catch (e) { aged = e; } finally { Date.now = realNow; }
  const save4 = diskOf(h2), led4 = ledgerIn(save4);
  check('G aged: a hero gone longer than VESSEL_CFG.groundKeptDays releases its ground at the next save (no row, no claim, the vault left the save)',
    aged === null && !led4?.heroes[keyW] && !(led4?.ownedZones ?? []).includes(vault) && !hasZone(save4, vault) && !h2.vessels.heldGround(B, CHAR_W),
    `${String(aged ?? '')} ledger ${JSON.stringify(led4 ?? null)}`);
  await h2.stop({ persist: false });
  const h3 = await boot();
  check('G chart: the next restart stands without the vault and holds no ground', !h3.world.zoneMap[vault] && !h3.vessels.heldGround(B, CHAR_W));
  await h3.stop({ persist: false });
  check('faults: no host fault across the three lives', hosts.every(h => h.faults === 0) && faultLines().length === 0, faultLines().slice(0, 3).join(' | '));
} catch (e) {
  console.log('FAIL  rig threw: ' + (e instanceof Error ? e.stack ?? e.message : String(e)));
  failed++;
} finally {
  Date.now = realNow;
  for (const c of clients) { try { c.leave(); } catch { /* closed */ } }
  for (const h of hosts) { try { await h.stop({ persist: false }); } catch { /* stopped */ } }
  rmSync(dir, { recursive: true, force: true });
  restoreRandom();
}
console.log(`${failed ? `\n${failed} FAIL` : '\nALL PASS'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
