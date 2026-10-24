// ---------------------------------------------------------------------------
// PROBE: THE FRONT DOOR, HONEST LEAVING AND HOME SLOTS (W7, the player's first
// hour: docs/engine/shard.md "THE FRONT DOOR", the charter's §7e; card 26 B,
// her ruling 2026-10-10: a hero logs back in WHERE IT LOGGED OUT).
//
//   npx tsx balance/probe_sharddoor.ts
//
// Jsdom-free: the pure decisions through their exported functions, and the
// host's own answers over the real WsTransport against one classic, ephemeral
// ShardHost in this process, ticked by hand (the shard rigs' idiom):
//   A  THE SERVED MARK: a page a world served leads to it (its mark on any host,
//      a forwarded host without one), a plain page does not, the dev door only
//      under ?dev; the welcome names the world
//   B  THE DOOR: the tab's binding round-trips through a simulated reload and
//      is forgotten only by the deliberate leave
//   C  THE DOOR'S WORDS: a full world and an oversized hero are refused at the
//      door with their words (never a silent close); the pre-check agrees with
//      THE JUDGMENT's cap; failures read as one plain line
//   D  HOME SLOTS: a bound save is detected, its Continue routes to a return
//      (the menu summary carries the world) and the solo resume refuses it
//   E  THE SOLO GUARD: a slot holding a solo world is never replaced without the
//      player's word; with it, THE BINDING WRITE tags the slot and the mirrors land
//   F  HONEST LEAVING: Exit says the word and the farewell mirror lands (the seat
//      leaves at once); a leave mid-fight is told the truth (the hero stands its
//      ground, dormant and targetable); THE UNLOAD WORD sleeps a calm hero
//      untargetable on the reload grace, a reload takes it back, the grace ends it;
//      THE UNLOAD BEACON does the same when the socket's last frame is lost (before
//      or after the close), and a wrong token moves nothing
//   G  THE RETURN'S WORD: a lost seat's return carries the shard's word to its
//      caller; the menu line names the world; a build mismatch reloads once
//   H  THE STOPGAP NAME: two unnamed heroes read apart (class + number, stable per
//      account), a clashing name takes the next number, a unique one stands
//   I  THE RETURN (card 26 B): a leave at a far spot logs back in there (the
//      desk's kept stand, and an upload's own); the dormant release keeps the
//      newest stand; a pocket still standing takes the hero back in, a pocket
//      gone lands it at the mouth; a new hero and a foreign stand wake at the hearth
// ---------------------------------------------------------------------------

import { request as httpRequest } from 'node:http';
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import { VESSEL_CFG } from '../server/vessel';
import {
  WsTransport, WS_TRANSPORT_CFG, defaultShardUrl, normalizeShardUrl, servedShardUrl, servedWorldName,
  shardResumeFor, type ShardPage,
} from '../src/net/ws';
import {
  SHARD_DOOR_CFG, continueRoute, doorWord, farewellLine, forgetDoor, mirrorMayReplace, readDoor,
  reloadOnceFor, returnWord, sameWorld, shardHeroName, shardHomeOf, soloResumeRefusal, vesselTooLarge,
  worldNameOf, writeDoor,
} from '../src/net/shardDoor';
import { SHARD_LEAVE_WORD, SHARD_REFUSAL, SHARD_UNLOAD_BEACON_PATH, SHARD_VESSEL_MAX_CHARS, shardBuildStamp } from '../src/net/shardBuild';
import { sanitizeStand } from '../src/net/vesselWire';
import type { SessionMsg } from '../src/net/transport';
import type { PlayerInput } from '../src/net/intent';
import { NullInput } from '../src/net/intent';
import type { Seat, World } from '../src/engine/world';
import { mintCave } from '../src/engine/worldgen';
import { UNIT_CFG } from '../src/engine/shardUnits';
import { CLASSES } from '../src/data/classes';

import { dist, vec } from '../src/core/math';
import { seedGlobalRandom } from '../src/sim/rng';
import { ensureAccountId, makeAccount, type Account } from '../src/meta/account';
import {
  CHAR_SLOT, charKeyFor, readCharacterContinueSummary, readCharacterResume, serializeCouchGuest,
  writeCharacterMirrorRaw, type CharacterSave,
} from '../src/meta/character';
import { ShardVesselLink, soloWorldStands, travelNote } from '../src/meta/shardVessel';
import { prepareCharacterWorld } from '../src/meta/resumeWorld';

const restoreRandom = seedGlobalRandom(0xd0012);
let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' - ' + detail : ''}`);
  if (!ok) failed++;
};
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
const sec = (s: number): number => Math.ceil(s * SHARD_CFG.tickHz);

/** A tab's sessionStorage, as a rig holds it (a reload keeps the same store). */
class TabStore {
  private readonly m = new Map<string, string>();
  getItem(k: string): string | null { return this.m.get(k) ?? null; }
  setItem(k: string, v: string): void { this.m.set(k, String(v)); }
  removeItem(k: string): void { this.m.delete(k); }
}
const page = (origin: string, search = '', mark: string | null = null): ShardPage =>
  ({ origin, hostname: new URL(origin).hostname, search, mark });

// ============================================================ A: THE SERVED MARK ==
{
  check('A mark: a page a world served leads to its own origin, on any host and port',
    servedShardUrl(page('http://192.168.1.5:9000', '', 'the Unbroken Wilds')) === 'ws://192.168.1.5:9000'
    && servedShardUrl(page('http://localhost:8787', '', '')) === 'ws://localhost:8787');
  check('A mark: a codespace page leads to its own world even unmarked (an older shard)',
    servedShardUrl(page('https://effective-trout-8787.app.github.dev')) === 'wss://effective-trout-8787.app.github.dev');
  check('A mark: a plain page leads nowhere (the solo menu stands)',
    servedShardUrl(page('http://localhost:5173')) === null && servedShardUrl(null) === null);
  check('A dev door: ?shard= points a page at a world only under the ?dev opt-in',
    servedShardUrl(page('http://localhost:5173', '?shard=ws://localhost:9123')) === null
    && servedShardUrl(page('http://localhost:5173', '?dev&shard=localhost:9123')) === 'ws://localhost:9123');
  check('A mark: a file page wears no world even marked; the mark names the world',
    servedShardUrl({ origin: 'null', hostname: '', search: '', mark: 'the Unbroken Wilds' }) === null
    && servedWorldName(page('http://a:1', '', ' the Unbroken Wilds ')) === 'the Unbroken Wilds' && servedWorldName(page('http://a:1')) === null);
  check('A mark: off a browser the lobby offers the plain default', defaultShardUrl() === WS_TRANSPORT_CFG.defaultUrl);
}

// ================================================================ B: THE DOOR ==
{
  const tab = new TabStore();
  check('B door: an unbound tab reads none', readDoor(tab) === null);
  writeDoor({ url: 'https://effective-trout-8787.app.github.dev/', world: 'the Unbroken Wilds' }, tab);
  // A reload: the module keeps no memory of its own; the tab's store is all that survives.
  const after = readDoor(tab);
  check('B door: the binding survives a reload, normalized, with its world',
    after?.url === 'wss://effective-trout-8787.app.github.dev' && after.world === 'the Unbroken Wilds');
  check('B door: the menu keeps it too (a second read, nothing forgets it but a leave)', readDoor(tab)?.url === after?.url);
  forgetDoor(tab);
  check('B door: the deliberate leave forgets it', readDoor(tab) === null);
  tab.setItem(SHARD_DOOR_CFG.doorKey, '{"url":42}');
  check('B door: a malformed binding is no binding', readDoor(tab) === null);
}

// ================================================================ the shard ==
SHARD_WIRE_CFG.maxPerIp = Number.POSITIVE_INFINITY; // every client of this rig arrives from one address
const dormant0 = SHARD_CFG.dormantSec, grace0 = SHARD_CFG.unloadGraceSec, linger0 = UNIT_CFG.unitLinger;
SHARD_CFG.dormantSec = 2; // the clocks, short for a fast rig (the laws are the clocks' shape, not their length)
SHARD_CFG.unloadGraceSec = 1.5;
const logs: string[] = [];
const host = new ShardHost({ seed: 0xd0042, saveDir: null, open: true, log: line => { logs.push(line); } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const k = host.world;
const units = host.units;
async function runTicks(n: number): Promise<void> { for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); } }
async function waitFor(cond: () => boolean, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) { if (cond()) return true; host.tick(DT); await yieldIO(); }
  return cond();
}
const seatOf = (id: string): Seat | undefined => units.seatOf(id);
const worldOf = (id: string): World | undefined => units.worldOf(id);
const stored = (): CharacterSave | null => JSON.parse(window.localStorage.getItem(charKeyFor(CHAR_SLOT)) ?? 'null') as CharacterSave | null;
const claimed = (): Account => { const a = makeAccount(); ensureAccountId(a); return a; };
const hearth = host.hearthSeat();
/** Forge a vessel on a scratch seat: the couch guest's shape, as the wire carries it. */
function forge(o: { name: string; charId: string; classId?: string }): CharacterSave {
  const seat = k.addSeat('forge', CLASSES.find(c => c.id === (o.classId ?? 'warrior'))!, new NullInput(), { startingCompanions: false, startingFlasks: false });
  seat.meta.name = o.name; seat.meta.charId = o.charId;
  const save = serializeCouchGuest(k, seat, {});
  k.removeSeat('forge');
  return JSON.parse(JSON.stringify(save)) as CharacterSave;
}
interface Cl { t: WsTransport; id: string; heard: SessionMsg[]; link: ShardVesselLink | null; seed: number; world?: string }
async function join(name: string, o: { acct?: Account; vessel?: CharacterSave; classId?: string;
  link?: { soloWorld?: boolean; consent?: boolean } } = {}): Promise<Cl> {
  const t = new WsTransport();
  const heard: SessionMsg[] = [];
  t.onSession(m => heard.push(m));
  const link = o.vessel && o.acct ? new ShardVesselLink(t, o.acct, o.vessel, () => null, o.link ?? {}) : null;
  const r = await t.connect(url, { name, classId: o.classId ?? o.vessel?.classId ?? 'warrior', ...(o.acct ? { accountId: o.acct.accountId } : {}) }, o.vessel);
  if (link) link.bindHome({ url: normalizeShardUrl(url), seed: r.seed >>> 0, ...(r.world ? { world: r.world } : {}) });
  await waitFor(() => !!seatOf(r.self) || heard.some(m => m.t === 'refused' || m.t === 'runEnd'), 60);
  return { t, id: r.self, heard, link, seed: r.seed, ...(r.world ? { world: r.world } : {}) };
}
let seq = 1;
/** A willed step (THE SPAWN GRACE ends at the first one). */
async function act(c: Cl): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const a = seatOf(c.id)?.actor;
    const input: PlayerInput = { dx: 0, dy: 1, aim: { x: a?.pos.x ?? 0, y: (a?.pos.y ?? 0) + 60 }, held: [], edge: [], seq: seq++ };
    c.t.sendInput(c.id, input);
    await runTicks(1);
  }
  await waitFor(() => seatOf(c.id)?.actor.untargetable === false, 30);
}
/** Stand a seat at a free spot in its own World (THE PLACE the rig picks), and read where
 *  it settled once the engine's own collision had its say (a few ticks). */
async function place(id: string, x: number, y: number): Promise<{ x: number; y: number }> {
  const s = seatOf(id)!, w = worldOf(id)!, hero = w.seatHero(s);
  const at = w.clampPos(w.findFreeSpot(vec(x, y), hero.radius + 2) ?? vec(x, y), hero.radius);
  hero.pos.x = at.x; hero.pos.y = at.y; hero.tier = 0;
  await runTicks(3);
  return { x: hero.pos.x, y: hero.pos.y };
}
/** THE FAREWELL, awaited the way a real host serves it: ticking (a held word rides a snapshot). */
async function farewell(c: Cl): Promise<{ end: 'saved' | 'held' | 'quiet'; word?: string }> {
  let got: { end: 'saved' | 'held' | 'quiet'; word?: string } | null = null;
  void (c.t.farewellEnd ?? Promise.resolve({ end: 'quiet' as const })).then(f => { got = f; });
  await waitFor(() => got !== null, 300);
  return got ?? { end: 'quiet' };
}
function cut(id: string): boolean {
  const c = (host.net as unknown as { bySeat: Map<string, { sock: { destroy(): void } }> }).bySeat.get(id);
  c?.sock.destroy();
  return !!c;
}
const farAt = (dx: number, dy: number): { x: number; y: number } => ({ x: hearth.x + dx, y: hearth.y + dy });

// ===================================================== A (cont.): the welcome's word ==
{
  const W = await join('Watcher');
  check('A welcome: the welcome names the world (the menu\'s "Return to <world>")',
    W.world === host.net.worldName && W.world === 'the hosted world', String(W.world));
  W.t.leave();
  await waitFor(() => !seatOf(W.id), 60);
}

// ========================================================= C: THE DOOR'S WORDS ==
{
  const keepSeats = SHARD_WIRE_CFG.maxSeats;
  const A1 = await join('Anvil');
  SHARD_WIRE_CFG.maxSeats = host.net.connectionCount(); // the world is full now
  let word = '';
  try { await new WsTransport().connect(url, { name: 'Late', classId: 'rogue' }); } catch (e) { word = e instanceof Error ? e.message : String(e); }
  SHARD_WIRE_CFG.maxSeats = keepSeats;
  check('C full: a full world refuses a join with its word, before any seat', word === SHARD_REFUSAL.full, word);
  check('C full: the lobby prints it as one plain line', doorWord(new Error(word)) === 'This world is full.', doorWord(new Error(word)));
  check('C full: the shard logs the refusal', logs.some(l => l.includes('the world is full')));
  const big = forge({ name: 'Heavy', charId: 'c-door-heavy' });
  (big as unknown as { ballast: string }).ballast = 'x'.repeat(SHARD_WIRE_CFG.maxClientMessage + 1024);
  word = '';
  try { await new WsTransport().connect(url, { name: 'Heavy', classId: 'warrior', accountId: claimed().accountId }, big); }
  catch (e) { word = e instanceof Error ? e.message : String(e); }
  check('C large: a hero past the wire\'s cap is refused with its word (never a silent drop)', word === SHARD_REFUSAL.heroTooLarge, word);
  check('C large: the pre-check holds THE JUDGMENT\'s own cap',
    VESSEL_CFG.maxBytes === SHARD_VESSEL_MAX_CHARS && vesselTooLarge(big) && !vesselTooLarge(forge({ name: 'Slim', charId: 'c-door-slim' }))
    && SHARD_VESSEL_MAX_CHARS < SHARD_WIRE_CFG.maxClientMessage);
  check('C words: an error reads as one plain line (no "Error:" prefix, a capital, a stop)',
    doorWord(new Error('could not reach the server')) === 'Could not reach the server.' && doorWord('TypeError: x') === 'X.'
    && doorWord(undefined) === 'The world did not answer.');
  A1.t.leave();
  await waitFor(() => !seatOf(A1.id), 60);
}

// ====================================================== E: THE SOLO GUARD ==
const acctE = claimed();
const vE = forge({ name: 'Ilse', charId: 'c-door-ilse', classId: 'rogue' });
let homeE: { url: string; seed: number; world?: string } | null = null;
{
  check('E guard: the pure rule (a solo world is replaced only with the word)',
    !mirrorMayReplace({ soloWorld: true }, false) && mirrorMayReplace({ soloWorld: true }, true) && mirrorMayReplace({ soloWorld: false }, false));
  await writeCharacterMirrorRaw(CHAR_SLOT, JSON.stringify({ ...vE, world: { schemaVersion: 1, probe: 'a solo world' } }));
  check('E guard: a slot holding the hero with a world half is a standing solo world', await soloWorldStands(acctE, vE));
  const E1 = await join('Ilse', { acct: acctE, vessel: vE, link: { soloWorld: true, consent: false } });
  await runTicks(9);
  host.vessels.mirror(E1.id);
  await runTicks(9);
  const kept = stored();
  check('E guard: without the word neither THE BINDING WRITE nor a mirror replaces it',
    !!kept && kept.world !== undefined && !shardHomeOf(kept) && (E1.link?.guarded ?? 0) >= 2 && E1.link?.mirrors === 0,
    `guarded ${E1.link?.guarded}, mirrors ${E1.link?.mirrors}`);
  E1.t.leave();
  await waitFor(() => !seatOf(E1.id), 90);
  const E2 = await join('Ilse', { acct: acctE, vessel: vE, link: { soloWorld: true, consent: true } });
  homeE = { url: normalizeShardUrl(url), seed: E2.seed >>> 0, ...(E2.world ? { world: E2.world } : {}) };
  const tagged = await waitFor(() => !!shardHomeOf(stored()), 30);
  const s = stored();
  check('E bind: with the word, the first snapshot that seats the hero tags its slot (THE BINDING WRITE, not a mirror)',
    tagged && s?.world === undefined && shardHomeOf(s)?.url === homeE.url && shardHomeOf(s)?.seed === homeE.seed
    && shardHomeOf(s)?.world === host.net.worldName && E2.link?.mirrors === 0);
  check('E guard: the travel note names the hero (never a class card)', travelNote(vE) === 'Traveling: Ilse, level 1 Rogue.', travelNote(vE));
  host.vessels.mirror(E2.id);
  await waitFor(() => (E2.link?.mirrors ?? 0) >= 1, 30);
  const m = stored();
  check('E mirror: a mirror lands tagged, carrying the hero\'s stand on this world',
    E2.link?.mirrors === 1 && !!shardHomeOf(m) && !!m?.stand && sanitizeStand(m.stand)?.seed === k.manifest.seed >>> 0
    && m.stand?.spot.zoneId === k.zone.id);
  check('E guard: a bound slot is no solo world (a return never asks again)', !(await soloWorldStands(acctE, vE)));

  // ========================================================= D: HOME SLOTS ==
  const summary = await readCharacterContinueSummary();
  const route = continueRoute(summary);
  check('D route: the menu\'s summary carries the world, and its Continue is a RETURN naming the hero',
    !!summary?.shard && route.kind === 'return' && route.home.url === homeE.url && route.charId === vE.charId);
  check('D route: an unbound save is a solo Continue; a malformed tag is no tag',
    continueRoute(vE).kind === 'solo' && continueRoute({ ...vE, shard: { url: 7 } }).kind === 'solo' && shardHomeOf(null) === null);
  check('D words: the return reads the world\'s name, else its host',
    worldNameOf({ url: homeE.url, world: 'the Unbroken Wilds' }) === 'the Unbroken Wilds' && worldNameOf({ url: 'wss://a.app.github.dev' }) === 'a.app.github.dev'
    && sameWorld('https://a.app.github.dev/', 'wss://a.app.github.dev'));
  check('D guard: the solo resume refuses a bound save in one line', !!soloResumeRefusal(m) && soloResumeRefusal(vE) === null, String(soloResumeRefusal(m)));
  const read = await readCharacterResume(CHAR_SLOT);
  let refused = '';
  if (read.status === 'ready') {
    try {
      const p = await prepareCharacterWorld(acctE, read.resume, { isCurrent: () => true, fallbackSeed: 0x51, spawn: 'town' });
      p.discard();
    } catch (e) { refused = e instanceof Error ? e.message : String(e); }
  }
  check('D guard: Continue never builds a solo world from a bound save (meta/resumeWorld.ts refuses it)',
    read.status === 'ready' && refused === soloResumeRefusal(m), refused || read.status);

  // ======================================================= F: HONEST LEAVING ==
  await act(E2);
  const at = await place(E2.id, hearth.x + 420, hearth.y + 260);
  await runTicks(3);
  E2.t.leave(); // Exit Game's deliberate word
  const f = await farewell(E2);
  const left = await waitFor(() => !seatOf(E2.id), 60);
  const fm = stored();
  check('F exit: Exit says the word and the farewell mirror lands (the end reads saved)',
    f.end === 'saved' && (E2.link?.mirrors ?? 0) >= 2 && !!shardHomeOf(fm), f.end);
  check('F exit: the seat leaves at once (a calm word never sleeps dormant)', left && !host.net.isDormant(E2.id));
  check('F exit: the farewell carries where the hero stood', !!fm?.stand && dist(fm.stand.spot, at) < 2,
    fm?.stand ? `${Math.round(fm.stand.spot.x)},${Math.round(fm.stand.spot.y)}` : 'no stand');
  check('F exit: the exit screen\'s line tells the truth',
    farewellLine(f, 'Ilse', 'the hosted world') === 'Ilse is saved, and wakes where you left it in the hosted world.');
}

// ================================================ F (cont.): the leave mid-fight ==
{
  const acctG = claimed();
  const G = await join('Gale', { acct: acctG, vessel: forge({ name: 'Gale', charId: 'c-door-gale' }), link: { consent: true } });
  await act(G);
  seatOf(G.id)!.actor.noteRecent('hurt'); // struck a moment ago
  G.t.leave();
  const f = await farewell(G);
  await waitFor(() => host.net.isDormant(G.id), 60);
  check('F fight: a leave mid-fight is told the truth on the seat\'s own note (the hero stands its ground)',
    f.end === 'held' && !!f.word?.startsWith(SHARD_LEAVE_WORD.held) && !!f.word?.includes(`${SHARD_CFG.dormantSec} s`), `${f.end}: ${f.word}`);
  check('F fight: and the hero stands dormant and targetable (never the free trip home)',
    host.net.isDormant(G.id) && !!seatOf(G.id) && !seatOf(G.id)!.actor.untargetable);
  check('F fight: the line on the menu is the same truth',
    farewellLine(f, 'Gale', 'x') === `Your hero stands its ground for ${SHARD_CFG.dormantSec} s, then rests where it stood.`, farewellLine(f, 'Gale', 'x'));
  host.net.release(G.id);
  await waitFor(() => !seatOf(G.id), 30);
}

// =================================================== F (cont.): THE UNLOAD WORD ==
const acctU = claimed();
const vU = forge({ name: 'Una', charId: 'c-door-una' });
{
  const U = await join('Una', { acct: acctU, vessel: vU, link: { consent: true } });
  await act(U);
  const before = shardResumeFor(url);
  U.t.unloadLeave(); // a page going away (a closed tab, or a reload)
  await waitFor(() => host.net.isDormant(U.id), 60);
  const row = (host.status() as { seats: { id: string; dormant?: boolean; dormantLeftSec?: number }[] }).seats.find(r => r.id === U.id);
  check('F unload: a calm page going away sleeps its hero UNTARGETABLE on the short reload grace',
    host.net.isDormant(U.id) && !!seatOf(U.id)?.actor.untargetable && (row?.dormantLeftSec ?? 99) <= SHARD_CFG.unloadGraceSec
    && logs.some(l => l.includes(`${U.id} closed its page`)), JSON.stringify(row));
  check('F unload: the page keeps its session (a reload returns with it)', !!before && shardResumeFor(url)?.token === before.token);
  const back = new WsTransport();
  const r = await back.connect(url, { name: 'Una', classId: 'warrior', accountId: acctU.accountId }, undefined, before ?? undefined, { resumeOnly: true });
  await runTicks(3);
  check('F unload: a reload takes the same seat back, still unseen until its first willed step (THE SPAWN GRACE)',
    r.resumed && r.self === U.id && !host.net.isDormant(U.id) && !!seatOf(U.id)?.actor.untargetable);
  back.unloadLeave();
  await waitFor(() => host.net.isDormant(U.id), 60);
  const gone = await waitFor(() => !seatOf(U.id), sec(SHARD_CFG.unloadGraceSec) + 30);
  check('F unload: a page that never comes back lets the hero go when the grace ends (no 30 s of targetable dormancy)',
    gone && !host.net.isDormant(U.id));
  check('F unload: and the desk keeps where it stood for its next login (THE RETURN)', !!host.vessels.keptStand(acctU.accountId, vU.charId!));
}

// =================================== F (cont.): the farewell after THE RETURN in place ==
{
  // W8a's browser find: after THE RETURN reopened the socket in place, the farewell never
  // heard its mirror (the resumed socket dispatched only while it was `ws`), held the socket
  // the whole cap, and a quick re-join meanwhile was refused as a twin.
  const acctR = claimed();
  const vR = forge({ name: 'Rook', charId: 'c-door-rook' });
  const R1 = await join('Rook', { acct: acctR, vessel: vR, link: { consent: true } });
  await act(R1);
  const at = await place(R1.id, hearth.x + 300, hearth.y + 340);
  cut(R1.id); // the link dies unheard; the seat lies dormant
  await waitFor(() => host.net.isDormant(R1.id), 60);
  let back: { ok: boolean } | null = null;
  void R1.t.resumeInPlace().then(r => { back = r; });
  await waitFor(() => back !== null, 120);
  check('F return: THE RETURN takes the seat back in place (the same seat, a new socket)', !!back && (back as { ok: boolean }).ok && !host.net.isDormant(R1.id) && !!seatOf(R1.id));
  const mirrors0 = R1.link?.mirrors ?? 0;
  R1.t.leave();
  const f = await farewell(R1);
  check('F return: after a return in place the farewell still hears its mirror over the resumed socket (saved, never the cap)',
    f.end === 'saved' && (R1.link?.mirrors ?? 0) === mirrors0 + 1, `${f.end}, ${(R1.link?.mirrors ?? 0) - mirrors0} mirror(s)`);
  check('F return: and the farewell resolves only once the seat has left the world (the shard ran the leave)',
    !seatOf(R1.id) && !host.net.isDormant(R1.id));
  const R2 = await join('Rook', { acct: acctR, vessel: stored()!, link: { consent: true } });
  check('F return: a re-join made at once after the completed leave is seated, never refused as a twin',
    !!seatOf(R2.id) && !R2.heard.some(m => m.t === 'refused'), R2.heard.map(m => m.t).join(','));
  check('F return: and it logs back in where it left', dist(seatOf(R2.id)!.actor.pos, at) < 40);
  // The shard's own belt: a seat whose socket said its word but whose close never came is
  // finished by its own hero's return (a lost close frame can never strand a twin refusal).
  await act(R2);
  (host.net as unknown as { bySeat: Map<string, { leaving: boolean | 'unload' }> }).bySeat.get(R2.id)!.leaving = true; // the word heard, the close lost
  const R3 = await join('Rook', { acct: acctR, vessel: stored()!, link: { consent: true } });
  check('F return: a return while the old socket said its word but never closed finishes that leave first (no twin refusal)',
    !!seatOf(R3.id) && R3.id !== R2.id && !seatOf(R2.id) && !R3.heard.some(m => m.t === 'refused')
    && logs.some(l => l.includes(`${R2.id} said its leave and its own hero returns`)), R3.heard.map(m => m.t).join(','));
  R3.t.leave();
  await farewell(R3);
  await waitFor(() => !seatOf(R3.id), 30);
}

// ================================================ F (cont.): THE UNLOAD BEACON ==
/** A page's beacon, as navigator.sendBeacon posts it (text/plain JSON). */
function beacon(body: unknown): Promise<number> {
  return new Promise(resolve => {
    const req = httpRequest({ host: '127.0.0.1', port, path: SHARD_UNLOAD_BEACON_PATH, method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' } },
      r => { r.resume(); r.on('end', () => resolve(r.statusCode ?? 0)); });
    req.on('error', () => resolve(0));
    req.end(JSON.stringify(body));
  });
}
{
  // The beacon first (a live socket), then the socket drops without its word.
  const B1 = await join('Bea', { acct: claimed(), vessel: forge({ name: 'Bea', charId: 'c-door-bea' }), link: { consent: true } });
  await act(B1);
  const tok1 = shardResumeFor(url)!;
  check('F beacon: a wrong token is ignored (204, nothing moves)', (await beacon({ seat: B1.id, token: 'f'.repeat(32) })) === 204);
  cut(B1.id);
  await waitFor(() => host.net.isDormant(B1.id), 60);
  check('F beacon: a wrong token never changes a lost socket\'s dormancy', !seatOf(B1.id)!.actor.untargetable);
  host.net.release(B1.id);
  await waitFor(() => !seatOf(B1.id), 30);
  const B2 = await join('Bel', { acct: claimed(), vessel: forge({ name: 'Bel', charId: 'c-door-bel' }), link: { consent: true } });
  await act(B2);
  const tok2 = shardResumeFor(url)!;
  check('F beacon: the beacon answers 204', (await beacon({ seat: B2.id, token: tok2.token })) === 204 && tok1.token !== tok2.token);
  cut(B2.id); // the page's socket dropped its last frame: no word reached the shard
  await waitFor(() => host.net.isDormant(B2.id), 60);
  check('F beacon: posted while the socket stood, the close takes THE UNLOAD WORD\'s road (untargetable, the reload grace)',
    !!seatOf(B2.id)?.actor.untargetable && logs.some(l => l.includes(`${B2.id} closed its page;`)));
  host.net.release(B2.id);
  await waitFor(() => !seatOf(B2.id), 30);
  // The close first (a dormant seat), then the beacon.
  const B3 = await join('Bryn', { acct: claimed(), vessel: forge({ name: 'Bryn', charId: 'c-door-bryn' }), link: { consent: true } });
  await act(B3);
  const tok3 = shardResumeFor(url)!;
  cut(B3.id);
  await waitFor(() => host.net.isDormant(B3.id), 60);
  const targetable = !seatOf(B3.id)!.actor.untargetable;
  await beacon({ seat: B3.id, token: tok3.token });
  await waitFor(() => !!seatOf(B3.id)?.actor.untargetable, 30);
  const row = (host.status() as { seats: { id: string; dormantLeftSec?: number }[] }).seats.find(r => r.id === B3.id);
  check('F beacon: after the close, the beacon moves a dormant hero onto the reload grace (untargetable, the shorter clock)',
    targetable && !!seatOf(B3.id)?.actor.untargetable && (row?.dormantLeftSec ?? 99) <= SHARD_CFG.unloadGraceSec
    && logs.some(l => l.includes(`${B3.id} closed its page (the beacon)`)), JSON.stringify(row));
  host.net.release(B3.id);
  await waitFor(() => !seatOf(B3.id), 30);
}

// ===================================================== G: THE RETURN'S WORD ==
{
  const R = await join('Rook');
  await act(R);
  check('G setup: the seat\'s socket is cut', cut(R.id));
  await waitFor(() => host.net.isDormant(R.id), 60);
  host.net.release(R.id); // the dormant window closed
  await waitFor(() => !seatOf(R.id), 30);
  const r = await R.t.resumeInPlace();
  check('G word: a return to a seat the world no longer holds hears the shard\'s own word',
    !r.ok && r.word === SHARD_REFUSAL.resume && r.final, JSON.stringify(r));
  check('G word: the menu line names the world and carries that word',
    returnWord('the hosted world', r.ok ? '' : r.word) === 'The connection to the hosted world was lost: the world holds no seat to return to.'
    && returnWord('the Unbroken Wilds', '') === 'The connection to the Unbroken Wilds was lost.');
  const tab = new TabStore();
  check('G build: a served page whose world runs another build reloads ONCE per address and stamp',
    reloadOnceFor(url, shardBuildStamp(), tab) && !reloadOnceFor(url, shardBuildStamp(), tab) && reloadOnceFor(url, 'a9.r9.w9', tab));
}

// ==================================================== H: THE STOPGAP NAME ==
{
  check('H name: a unique name stands; a clash takes the next number; "Joiner" and the class name are unnamed',
    shardHeroName('Bram', 'Warrior', 'a', []) === 'Bram' && shardHeroName('Bram', 'Warrior', 'a', ['bram']) === 'Bram 2'
    && /^Rogue \d+$/.test(shardHeroName('Joiner', 'Rogue', 'x', [])) && /^Rogue \d+$/.test(shardHeroName('', 'Rogue', 'x', [])));
  check('H name: an unnamed hero\'s number is its account\'s own (stable), the next free one on a clash',
    shardHeroName('Warrior', 'Warrior', 'acct-1', []) === shardHeroName('Warrior', 'Warrior', 'acct-1', [])
    && shardHeroName('Warrior', 'Warrior', 'acct-1', [shardHeroName('Warrior', 'Warrior', 'acct-1', [])]) !== shardHeroName('Warrior', 'Warrior', 'acct-1', []));
  const a1 = claimed(), a2 = claimed();
  const X = await join('Warrior', { acct: a1, vessel: forge({ name: 'Warrior', charId: 'c-door-x' }) });
  const Y = await join('Warrior', { acct: a2, vessel: forge({ name: 'Warrior', charId: 'c-door-y' }) });
  const nx = seatOf(X.id)?.actor.name ?? '', ny = seatOf(Y.id)?.actor.name ?? '';
  const rx = host.net.peers().find(p => p.id === X.id)?.name, ry = Y.t.peers().find(p => p.id === Y.id)?.name;
  check('H name: two unnamed Warriors on one world read apart (class + a short number), on the body and the roster',
    nx !== ny && /^Warrior \d{2,3}$/.test(nx) && /^Warrior \d{2,3}$/.test(ny) && rx === nx && ry === ny, `${nx} / ${ny}`);
  check('H name: the vessel\'s own saved name is untouched (the stopgap is the world\'s word)',
    seatOf(X.id)?.meta.name === 'Warrior' && seatOf(Y.id)?.meta.name === 'Warrior');
  const B1 = await join('Bram');
  const B2 = await join('Bram');
  check('H name: a named clash takes a number too', seatOf(B1.id)?.actor.name === 'Bram' && seatOf(B2.id)?.actor.name === 'Bram 2',
    `${seatOf(B1.id)?.actor.name} / ${seatOf(B2.id)?.actor.name}`);
  for (const c of [X, Y, B1, B2]) c.t.leave();
  await waitFor(() => [X, Y, B1, B2].every(c => !seatOf(c.id)), 90);
}

// ======================================================= I: THE RETURN (26 B) ==
{
  // I1: a leave at a far spot (the farewell), a rejoin that lands there.
  const acctI = claimed();
  const vI = forge({ name: 'Wayfarer', charId: 'c-door-way' });
  await writeCharacterMirrorRaw(CHAR_SLOT, JSON.stringify(vI));
  const I1 = await join('Wayfarer', { acct: acctI, vessel: vI, link: { consent: true } });
  check('I hearth: a new hero (no stand) wakes at the hearth', dist(seatOf(I1.id)!.actor.pos, hearth) < 120,
    `${Math.round(dist(seatOf(I1.id)!.actor.pos, hearth))} px`);
  await act(I1);
  const far = await place(I1.id, farAt(640, 260).x, farAt(640, 260).y);
  await runTicks(3);
  I1.t.leave();
  await farewell(I1);
  await waitFor(() => !seatOf(I1.id), 60);
  const saved = stored()!;
  check('I far: the farewell mirror carries the far stand', !!saved.stand && dist(saved.stand.spot, far) < 2 && dist(far, hearth) > 400,
    `stand ${saved.stand ? Math.round(saved.stand.spot.x) + ',' + Math.round(saved.stand.spot.y) : 'none'}, far ${Math.round(far.x)},${Math.round(far.y)}, hearth ${Math.round(hearth.x)},${Math.round(hearth.y)}`);
  const I2 = await join('Wayfarer', { acct: acctI, vessel: saved, link: { consent: true } });
  const s2 = seatOf(I2.id)!;
  check('I far: the rejoin logs back in where it logged out, not at the hearth',
    dist(s2.actor.pos, far) < 40 && dist(s2.actor.pos, hearth) > 300, `${Math.round(dist(s2.actor.pos, far))} px from the stand`);
  check('I far: under THE SPAWN GRACE (unseen until its first willed step)', s2.actor.untargetable && logs.some(l => l.includes(`${I2.id} logs back in where it logged out`)));
  // I2: the dormant release keeps the NEWEST stand, read before the upload's own.
  await act(I2);
  const far2 = await place(I2.id, farAt(380, 560).x, farAt(380, 560).y);
  await runTicks(3);
  cut(I2.id); // no word: the dormant seat
  await waitFor(() => host.net.isDormant(I2.id), 60);
  await waitFor(() => !seatOf(I2.id), sec(SHARD_CFG.dormantSec) + 60);
  const kept = host.vessels.keptStand(acctI.accountId, vI.charId!);
  check('I release: the dormant release leaves its stand with the desk (no client heard a mirror)', !!kept && dist(kept.spot, far2) < 2);
  const I3 = await join('Wayfarer', { acct: acctI, vessel: saved, link: { consent: true } }); // the OLDER save: its stand is the first far spot
  check('I release: the next login reads the kept stand before the upload\'s older one',
    dist(seatOf(I3.id)!.actor.pos, far2) < 40 && !host.vessels.keptStand(acctI.accountId, vI.charId!),
    `${Math.round(dist(seatOf(I3.id)!.actor.pos, far2))} px from the release spot`);
  I3.t.leave();
  await waitFor(() => !seatOf(I3.id), 60);
  // I1b: an upload's own stand (the mirror's) lands its hero when the desk keeps none.
  const vCopy = { ...forge({ name: 'Copy', charId: 'c-door-copy' }), stand: saved.stand };
  const C = await join('Copy', { acct: claimed(), vessel: vCopy });
  check('I mirror: an upload\'s own stand of this world lands it there', dist(seatOf(C.id)!.actor.pos, far) < 40);
  C.t.leave();
  await waitFor(() => !seatOf(C.id), 60);
  // I5: a stand from another world wakes at the hearth (logged).
  const vForeign = { ...forge({ name: 'Stray', charId: 'c-door-stray' }), stand: { ...saved.stand!, seed: (k.manifest.seed + 1) >>> 0 } };
  const F5 = await join('Stray', { acct: claimed(), vessel: vForeign });
  check('I foreign: a stand from another world wakes at the hearth, logged',
    dist(seatOf(F5.id)!.actor.pos, hearth) < 120 && logs.some(l => l.includes(`${F5.id}'s last stand is from another world`)));
  check('I plan: ground the chart no longer holds is the hearth too',
    host.returnLanding({ ...saved.stand!, spot: { ...saved.stand!.spot, zoneId: 'no_such_zone' } }).kind === 'hearth');
  F5.t.leave();
  await waitFor(() => !seatOf(F5.id), 60);
}

// ================================================= I (cont.): the pocket's mouth ==
{
  const acctP = claimed();
  const vP = forge({ name: 'Delve', charId: 'c-door-delve' });
  const P1 = await join('Delve', { acct: acctP, vessel: vP, link: { consent: true } });
  await act(P1);
  const mouth = await place(P1.id, farAt(300, 200).x, farAt(300, 200).y);
  const caveId = `cave_probe_door_${0xd00a}`;
  k.caveMap[caveId] = mintCave(k.zoneMap[k.zone.id], 0xd00a, caveId);
  units.enqueue({ seatId: P1.id, dest: caveId, ladder: { caveReturn: { zoneId: k.zone.id, pos: vec(mouth.x, mouth.y), entryFrom: null, kind: 'cave_entrance', seed: 0xd00a }, caveStack: [] } });
  units.drain();
  const pocket = units.unitOf(P1.id);
  await runTicks(3);
  const inside = { x: seatOf(P1.id)!.actor.pos.x, y: seatOf(P1.id)!.actor.pos.y };
  P1.t.leave();
  await farewell(P1);
  await waitFor(() => !seatOf(P1.id), 60);
  const sp = stored()!;
  check('I pocket: a hero under ground leaves its pocket and its mouth in the stand',
    pocket?.role === 'unit' && sp.stand?.pocket?.zoneId === caveId && sp.stand.spot.zoneId === k.zone.id && dist(sp.stand.spot, mouth) < 2,
    JSON.stringify(sp.stand?.pocket));
  const P2 = await join('Delve', { acct: acctP, vessel: sp, link: { consent: true } });
  check('I pocket: while its pocket stands, the login takes it back in, where it stood',
    units.unitOf(P2.id) === pocket && units.unitOf(P2.id)?.world.zone.id === caveId && dist(seatOf(P2.id)!.actor.pos, inside) < 40,
    `${units.unitOf(P2.id)?.key}`);
  P2.t.leave();
  await farewell(P2);
  await waitFor(() => !seatOf(P2.id), 60);
  UNIT_CFG.unitLinger = 0.5;
  const slept = await waitFor(() => !units.unitFor(caveId), sec(2) + 30);
  UNIT_CFG.unitLinger = linger0;
  const sp2 = stored()!;
  const P3 = await join('Delve', { acct: acctP, vessel: sp2, link: { consent: true } });
  const s3 = seatOf(P3.id)!;
  check('I mouth: a pocket gone lands the hero at its mouth on the surface (the step off the hole)',
    slept && units.unitOf(P3.id) === units.keeper && dist(s3.actor.pos, vec(mouth.x, mouth.y + 40)) < 60,
    `${Math.round(dist(s3.actor.pos, vec(mouth.x, mouth.y + 40)))} px from the mouth's step`);
  check('I mouth: the log says why', logs.some(l => l.includes(`${P3.id} logs back in where it logged out (at the mouth of ${caveId}`)));
  await runTicks(sec(0.5));
  check('I mouth: it stays on the surface (the mouth never takes it straight back down)', units.unitOf(P3.id) === units.keeper);
  P3.t.leave();
  await waitFor(() => !seatOf(P3.id), 60);
}

SHARD_CFG.dormantSec = dormant0;
SHARD_CFG.unloadGraceSec = grace0;
await host.stop({ persist: false });
restoreRandom();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
