// THE SHARD RIG, THE SLOW HALF (charter card 21, ruled 2026-10-08: split): the sections
// that boot the Unbroken Wilds more than once — Q THE WILDS SAVE (persist, resume, the
// land digest) and L–O THE VESSEL + THE CORPSE (identity, travel, the death covenant,
// the corpse returns). The fast half (probe_shard.ts) keeps A–K and P. Both share this
// preamble verbatim; a change there is made in both files.

// ---------------------------------------------------------------------------
// PROBE — THE SHARD M0: the headless host over WebSocket
// (docs/design/shard-world.md §4 M0, docs/engine/shard.md).
//
//   npx tsx balance/probe_shard.ts
//
// Boots a REAL ShardHost in this process on a free port and drives the real
// WsTransport client (Node's global WebSocket) against it, ticking the host
// by hand so every verdict is deterministic and no timer outlives the rig:
//   A  the RFC 6455 codec (masked / fragmented / control / oversize / errors)
//   B  the boot: the keeper seat parked at the hearth, tagged and hidden
//   C  the join: welcome carries the seed, the zone lands before a snapshot,
//      snapshots ride the wire rate, the keeper is on no wire row
//   D  the hand: inputs move the seated hero; the keeper never moves
//   E  the hostile wire: bad inputs, a spoofed seat, a hostile action, an
//      unknown session kind — the loop never faults
//   F  the party: the keeper scales no enemy; two seats are two
//   G  XP: the keeper never levels
//   H  THE MERCY: a lone downed seat rises after reviveSec
//   I  the leave: a dropped socket despawns its seat
//   J  persistence: the world half writes and a second host resumes it
//   K  THE UNBROKEN WILDS: the seamless foundation's surface hosts headless
//   P  THE WILDS ON THE WIRE: a render shell lays the same land from the seed,
//      takes the life from the wire, keeps its walk, streams pages, and the
//      keeper shadows the focus seat
//   Q  THE WILDS SAVE (server/wildsSave.ts): a --worldmass shard writes its
//      own file and a second host resumes it in the mass lane's order — the
//      clock, the runtime, every saved native, the keeper at the hearth, the
//      seed on the welcome; a pocket save wakes at the hearth with the pocket
//      pinned, and a save that will not stand gives way to a fresh wilds
//   R  THE ROVING SHADOW (SHARD_CFG.rove, ships off): off, the keeper never hops;
//      on, two clusters are visited in turn; one cluster never hops
// THE VESSEL AND THE CORPSE (docs/engine/shard.md "The vessel and the corpse"):
//   L  THE IDENTITY: an account mints one stable id; the join carries it to
//      the host alone; minting never touches the seeded stream
//   M  THE VESSEL: an uploaded hero grafts at its level with its own bag and
//      doll; hostile or duplicate vessels fall back fresh; THE MIRROR lands on
//      the beat and at the farewell, and round-trips as the next upload
//   N  THE DEATH COVENANT: a mortal vessel with no one left to kneel falls
//      (body recorded, `corpse` then `runEnd`, the client's own reckoning,
//      the run slot wiped, the seat gone); Immortal vessels and fresh heroes
//      keep THE MERCY; a fallen vessel never walks in again; a vessel that
//      leaves while down has fallen and hears THE LATE WORD at its next upload
//   O  THE CORPSE RETURNS: the same account's next hero finds the body, only
//      its owner reclaims it by the dwell, the gear comes home to its bag, the
//      record clears, and the records outlive two boots (the wilds too)
// ---------------------------------------------------------------------------

import { mkdtempSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'; // + Q's reads (wildsSave)
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedGlobalRandom } from '../src/sim/rng';
import { ShardHost, SHARD_CFG, type ShardSave } from '../server/shardHost'; // + the wrapper's shape (Q, wildsSave)
import { judgeVessel, VESSEL_CFG } from '../server/vessel';
import { readWildsSave, shellLandDigest } from '../server/wildsSave';
import { shardRecordsPath, type ShardRecordsSave } from '../server/corpses';
import { WsTransport } from '../src/net/ws';
import { World } from '../src/engine/world';
import { makeAccount } from '../src/meta/account';
import { CLASSES } from '../src/data/classes';
import { MASS_ZONE } from '../src/worldmass/preset';
import { NullInput } from '../src/net/intent';
import type { SessionMsg } from '../src/net/transport';
import { dist, vec } from '../src/core/math';
import { transitDwell, transitRadius } from '../src/data/transit';
import { rollItem } from '../src/engine/itemgen';
import { autoPlace } from '../src/engine/inventory';
import type { ItemCategory } from '../src/engine/items';
import type { Seat } from '../src/engine/world';
import {
  deserializeAccount, ensureAccountId, isAccountId, LEDGER_ACCOUNT_DEATHS, LEDGER_CORPSES_RECLAIMED, LEDGER_FLASK_LESSON,
  serializeAccount, type Account,
} from '../src/meta/account';
import { loadAccount, loadAccountAsync } from '../src/meta/persistence';
import { storageKey } from '../src/buildProfile';
import { loadCharacter, serializeCouchGuest, type CharacterSave } from '../src/meta/character';
import { readTravelingVessel, ShardVesselLink } from '../src/meta/shardVessel';

// THE STREAM LAW: the slow half seeds its own stream (the fast half's B section seeds that file's).
const restoreRandom = seedGlobalRandom(0x5a4e);
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


// ====================================================== Q: THE WILDS SAVE ==
// A --worldmass shard persists like a classic one, to its own file, and a
// saved one stands back up in the mass lane's own resume order before it steps
// a frame (server/wildsSave.ts resumeWilds): the clock to the saved second, the
// runtime finished and live, every native the checkpoint carried, the keeper at
// the hearth whatever spot it was saved at, the seed on the welcome. A save
// taken inside a native pocket (probe_worldmass_sideareas' own enterSidezone
// path, at the hearth's cellar hatch) wakes at the hearth with the pocket still
// pinned to its mouth; a save that will not stand gives way to a fresh wilds.
{
  type Mouth = { pos: { x: number; y: number }; kind: string; seed: number };
  type Pocketable = { caveEntrances: Mouth[]; enterSidezone(cm: Mouth): void };
  const pocketable = (w: World): Pocketable => w as unknown as Pocketable;
  const QSEED = 0x0ddba11;
  const dir = mkdtempSync(join(tmpdir(), 'hw-wilds-'));
  const quiet = (): void => { /* quiet */ };
  const readSave = (path: string): ShardSave => JSON.parse(readFileSync(path, 'utf-8')) as ShardSave;
  const tickSafely = async (h: ShardHost, n: number): Promise<number> => {
    let threw = 0;
    for (let i = 0; i < n; i++) { try { h.tick(DT); } catch { threw++; } await yieldIO(); }
    return threw;
  };
  try {
    // ---- the first life: a fresh wilds, a walker, the write
    let t0 = performance.now();
    const a = new ShardHost({ seed: QSEED, saveDir: dir, open: true, worldmass: true, log: quiet });
    await a.ready();
    const bootMs = performance.now() - t0;
    check('Q wilds save: the wilds are persistent, to their own file beside the classic one',
      a.savePath === join(dir, `shard_${QSEED.toString(16).padStart(8, '0')}${SHARD_CFG.wildsSaveSuffix}.json`) && !!a.world.massRuntime,
      `fresh boot ${bootMs.toFixed(0)} ms`);
    await runTicks(a, 180);
    const portQ = await a.listen(0, '127.0.0.1');
    const cq = new WsTransport();
    await cq.connect(`ws://127.0.0.1:${portQ}`, { name: 'Wayfarer', classId: 'warrior' });
    await waitFor(() => a.world.seats.length === 2, a, 50);
    const walker = a.world.seats.find(s => s.id === 'p1')!;
    // The party is set down on open country east of the hearth (the engine's
    // own landPartyAt: the Waking House's latched door walls a bedside walk in),
    // then the joiner walks east over the wire and THE SHADOW drags the stream.
    const st = a.world.massRuntime!.settlement!, mw = a.world.massRuntime!.walk;
    // The regional land is READ, never assumed: the first of nine lanes east of the ring
    // whose 340 px eastward line the mass walk calls open (lineWalkable reads regions
    // and the native obstacles alike) is the walk's ground.
    const xEast = st.zone.size.w + st.spec.apron + st.spec.blend + 400;
    const lanes = [0, 120, -120, 240, -240, 360, -360, 480, -480].map(dy => ({ x: xEast, y: st.zone.size.h / 2 + dy }));
    // A band three rows wide (the hero's own breadth), since the landing may nudge the body off the line.
    const open = (p: { x: number; y: number }): boolean => [-24, 0, 24].every(dy => mw.lineWalkable({ x: p.x, y: p.y + dy }, { x: p.x + 340, y: p.y + dy }));
    const lane = lanes.find(open);
    check('Q wilds save: open ground east of the ring stands for the walk', !!lane, lane ? `lane y=${lane.y.toFixed(0)}` : 'no open 340 px eastward band among nine candidates');
    a.world.landPartyAt(lane ?? lanes[0]);
    walker.actor.pos.x = (lane ?? lanes[0]).x; walker.actor.pos.y = (lane ?? lanes[0]).y; // on the scanned lane itself, not the landing's loose ring
    const d0 = a.world.doodads.length, x0 = walker.actor.pos.x;
    for (let i = 0; i < 600 && walker.actor.pos.x < x0 + 300; i++) {
      cq.sendInput('p1', { dx: 1, dy: 0, aim: { x: walker.actor.pos.x + 100, y: walker.actor.pos.y }, held: [], edge: [], seq: i + 1 });
      await runTicks(a, 1);
    }
    check('Q wilds save: a joiner walks 300 px east over the wire and the wilds grow around it',
      walker.actor.pos.x >= x0 + 300 && a.world.doodads.length > d0,
      `Δx ${(walker.actor.pos.x - x0).toFixed(0)}, doodads ${d0}→${a.world.doodads.length}, population ${a.world.massRuntime!.population}`);
    cq.leave();
    await waitFor(() => a.world.seats.length === 1, a, 60);
    t0 = performance.now();
    a.persist();
    const persistMs = performance.now() - t0;
    const written = readSave(a.savePath!);
    check('Q wilds save: persist() writes the mass half atomically under the shard wrapper',
      !existsSync(a.savePath! + '.tmp') && written.schemaVersion === SHARD_CFG.saveSchema && written.seed === QSEED
      && written.world.worldmass?.state.run.seed === QSEED && written.world.worldmass.enemies.length > 0,
      `${(statSync(a.savePath!).size / 1e6).toFixed(2)} MB in ${persistMs.toFixed(0)} ms, ${written.world.worldmass?.enemies.length} natives`);
    await a.stop(); // stop() writes the same world again (no frame between)
    const saved = readSave(a.savePath!);
    // THE LAND DIGEST (the merge audit's finding; her ruling: another land's save is legacy):
    // the shell lays the digest the shard runs, and a save digesting otherwise is refused.
    {
      check('Q wilds save: THE LAND DIGEST — the shell lays the land the shard runs', shellLandDigest(QSEED) === saved.world.worldmass!.configHash,
        `shell ${shellLandDigest(QSEED).slice(0, 12)} shard ${String(saved.world.worldmass!.configHash).slice(0, 12)}`);
      const other = JSON.parse(JSON.stringify(saved)) as ShardSave;
      (other.world.worldmass as unknown as { configHash: string }).configHash = 'another-land';
      const otherPath = join(dir, 'other-land.json'); writeFileSync(otherPath, JSON.stringify(other));
      const read = readWildsSave(otherPath, SHARD_CFG.saveSchema, QSEED);
      check('Q wilds save: a save from another build\'s land is refused, never resumed', read !== null && 'refused' in read && /land/.test(read.refused), read && 'refused' in read ? read.refused : 'accepted');
    }

    // ---- the second life: THE RESUME LAW, then the world as it was
    t0 = performance.now();
    const b = new ShardHost({ seed: QSEED, saveDir: dir, open: true, worldmass: true, log: quiet });
    const ctorMs = performance.now() - t0;
    const pending = b.world.massRuntime?.resumePending === true;
    const heldTicks = b.ticks, heldTime = b.world.time, heldAt = statSync(b.savePath!).mtimeMs;
    b.tick(DT); b.persist();
    const held = b.ticks === heldTicks && b.world.time === heldTime && statSync(b.savePath!).mtimeMs === heldAt;
    await b.ready();
    const resumeMs = performance.now() - t0;
    check('Q wilds resume: THE RESUME LAW — until ready() the runtime stands restore-only, no frame steps, no write lands',
      pending && held, `constructor ${ctorMs.toFixed(0)} ms, ready ${resumeMs.toFixed(0)} ms`);
    const w = b.world, mr = w.massRuntime;
    check('Q wilds resume: the clock comes back to the saved second', Math.abs(w.time - saved.world.time) < 1e-6,
      `t ${w.time.toFixed(4)} vs ${saved.world.time.toFixed(4)}`);
    check('Q wilds resume: the mass runtime stands finished and live on the surface',
      !!mr && !mr.resumePending && w.zone.id === MASS_ZONE && w.walk === mr.walk && w.arena.boundless === true && mr.generator.run.seed === QSEED);
    const savedNatives = saved.world.worldmass!.enemies;
    const back = new Map((mr?.snapshot(w).enemies ?? []).map(e => [e.id, e]));
    const same = savedNatives.filter(e => {
      const r = back.get(e.id);
      return !!r && r.monster === e.monster && r.level === e.level && Math.abs(r.life - e.life) < 1e-9;
    }).length;
    check('Q wilds resume: every native the checkpoint carried stands again — same body, same wounds',
      savedNatives.length > 0 && same === savedNatives.length, `${same}/${savedNatives.length} natives, population ${mr?.population}`);
    const k = b.keeper.actor.pos, spot = saved.world.worldmass!.player, hearth = mr?.settlement;
    check('Q wilds resume: the keeper wakes at the hearth, never at its saved spot',
      !!hearth && hearth.contains(k.x, k.y) && Math.hypot(k.x - hearth.spawn.x, k.y - hearth.spawn.y) < 1 && !hearth.contains(spot.x, spot.y),
      `keeper (${k.x.toFixed(0)}, ${k.y.toFixed(0)}), saved at (${spot.x.toFixed(0)}, ${spot.y.toFixed(0)})`);
    const portB = await b.listen(0, '127.0.0.1');
    const cb = new WsTransport();
    const helloB = await cb.connect(`ws://127.0.0.1:${portB}`, { name: 'Returner', classId: 'rogue' });
    check('Q wilds resume: a joiner\'s welcome carries the same seed and the surface', helloB.seed === QSEED && helloB.worldmass === true && helloB.self === 'p1');
    await waitFor(() => w.seats.length === 2, b, 50);
    const fb = b.faults, tb = b.ticks;
    const threwB = await tickSafely(b, 120);
    check('Q wilds resume: 120 frames tick on the resumed wilds without a fault',
      threwB === 0 && b.faults === fb && b.ticks === tb + 120 && w.seats.length === 2, `actors ${w.actors.length}`);
    cb.leave();
    await waitFor(() => w.seats.length === 1, b, 60);

    // ---- THE POCKET: a save taken inside a native pocket
    const hatch = pocketable(w).caveEntrances.find(m => m.kind === 'cellar_hatch');
    let cave = '';
    if (hatch && w.massRuntime) {
      w.landPartyAt(hatch.pos);
      w.massRuntime.update(w, true);
      pocketable(w).enterSidezone(hatch);
      cave = w.zone.id;
    }
    const fp = b.faults;
    const threwP = await tickSafely(b, 30);
    let wrote = true;
    try { b.persist(); } catch { wrote = false; }
    const pocketSave = readSave(b.savePath!);
    check('Q wilds pocket: inside a native pocket the world ticks and writes the surface it left behind',
      !!hatch && cave.startsWith('cave_mass_') && w.inCave && w.massRuntime === null && threwP === 0 && b.faults === fp && wrote
      && pocketSave.world.worldmass?.state.run.seed === QSEED && pocketSave.world.massSideareas?.active?.zone === cave);
    await b.stop();
    const c = new ShardHost({ seed: QSEED, saveDir: dir, open: true, worldmass: true, log: quiet });
    await c.ready();
    const cw = c.world, cmr = cw.massRuntime, ck = c.keeper.actor.pos;
    check('Q wilds pocket: the resume wakes the keeper at the hearth on the surface, the pocket still pinned',
      !!cmr && !cmr.resumePending && cw.zone.id === MASS_ZONE && !cw.inCave && !!cw.caveMap[cave] && !!cmr.settlement?.contains(ck.x, ck.y));
    const again = pocketable(cw).caveEntrances.find(m => m.kind === 'cellar_hatch');
    if (again && cmr) { cw.landPartyAt(again.pos); cmr.update(cw, true); pocketable(cw).enterSidezone(again); }
    check('Q wilds pocket: the same mouth re-enters the same pocket', !!again && cw.zone.id === cave);
    await c.stop();

    // ---- THE REFUSED SAVE: a checkpoint the runtime rejects (a tampered config
    // hash — the world half adopts, the mass half refuses) gives way to a fresh
    // keeper world and a fresh wilds, one log line, the refused file set aside.
    const tampered = readSave(c.savePath!);
    tampered.world.worldmass!.configHash = 'tampered';
    writeFileSync(c.savePath!, JSON.stringify(tampered));
    const lines: string[] = [];
    const d = new ShardHost({ seed: QSEED, saveDir: dir, open: true, worldmass: true, log: l => lines.push(l) });
    await d.ready();
    const aside = readdirSync(dir).filter(f => f.includes('.refused-'));
    const dmr = d.world.massRuntime, dk = d.keeper.actor.pos, fd = d.faults;
    const threwD = await tickSafely(d, 30);
    check('Q wilds refused: a save that will not stand gives way to a fresh wilds — one log line, the file set aside',
      lines.length === 1 && /would not stand/.test(lines[0]) && aside.length === 1 && !existsSync(d.savePath!)
      && !!dmr && !dmr.resumePending && d.world.zone.id === MASS_ZONE && d.world.time < saved.world.time
      && !!dmr.settlement?.contains(dk.x, dk.y) && threwD === 0 && d.faults === fd,
      lines.join(' / '));
    await d.stop();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
// =========================================== L–O: THE VESSEL + THE CORPSE ==
// One classic shard with a records directory hosts every step: the identity,
// an uploaded vessel and its mirrors, THE DEATH COVENANT, the body's return.
const VSEED = 0x05e55e1;
const vdir = mkdtempSync(join(tmpdir(), 'hw-vessel-'));
const quiet = (): void => { /* quiet */ };
const vh = new ShardHost({ seed: VSEED, saveDir: vdir, open: true, log: quiet });
const vurl = `ws://127.0.0.1:${await vh.listen(0, '127.0.0.1')}`;
const seatOf = (id: string): Seat | undefined => vh.world.seats.find(s => s.id === id);
const rowsOf = (t: WsTransport): SessionMsg[] => { const log: SessionMsg[] = []; t.onSession(m => log.push(m)); return log; };
const onDisk = (): ShardRecordsSave => JSON.parse(readFileSync(shardRecordsPath(vdir, VSEED)!, 'utf-8')) as ShardRecordsSave;
const uids = (items: readonly { uid: number }[]): string => JSON.stringify(items.map(i => i.uid).sort((a, b) => a - b));
/** Forge a vessel on a scratch seat: the couch guest's shape, as the wire carries it. */
function forgeVessel(o: { classId: string; level: number; name: string; charId: string; modeId?: string;
  bag: number; worn: ItemCategory[]; essences?: Record<string, number> }): CharacterSave {
  const w = vh.world;
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
  Object.assign(seat.meta.essences, o.essences ?? {});
  const save = serializeCouchGuest(w, seat, {});
  w.removeSeat('forge');
  return JSON.parse(JSON.stringify(save)) as CharacterSave;
}

// ======================================================== L: THE IDENTITY ==
/** A client's account as the browser's loaders leave it: minted. */
const claimedAccount = (): Account => { const a = makeAccount(); ensureAccountId(a); return a; };
{
  const bare = makeAccount();
  check('L identity: a made account carries no id until a load mints one (sims stay byte-identical)',
    bare.accountId === '' && !('accountId' in serializeAccount(bare)) && deserializeAccount(serializeAccount(bare))!.accountId === '');
  const a = claimedAccount(), b = claimedAccount();
  check('L identity: the mint is a 128-bit hex id, never shared', isAccountId(a.accountId) && a.accountId !== b.accountId, a.accountId);
  check('L identity: a minted id survives serialize and load, and is never minted twice',
    deserializeAccount(JSON.parse(JSON.stringify(serializeAccount(a))))!.accountId === a.accountId && !ensureAccountId(a));
  const mangled = deserializeAccount({ ...serializeAccount(a), accountId: 'p0' })!;
  check('L identity: a malformed saved id is dropped, never trusted; the load mints afresh',
    mangled.accountId === '' && ensureAccountId(mangled) && isAccountId(mangled.accountId));
  // THE LOAD PATH, as a browser boots: the synchronous load mints in memory,
  // the disk-first load adopts that id, writes it home, and keeps it after.
  const ACCOUNT_CACHE_KEY = storageKey('arpg_account_v1');
  window.localStorage.removeItem(ACCOUNT_CACHE_KEY);
  const stream = Math.random;
  let draws = 0;
  Math.random = (): number => { draws++; return stream(); };
  const boot = loadAccount();
  const hydrated = await loadAccountAsync();
  const again = await loadAccountAsync();
  const legacy = serializeAccount(again);
  delete legacy.accountId;
  window.localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(legacy));
  const healed = await loadAccountAsync();
  Math.random = stream;
  const cachedId = (JSON.parse(window.localStorage.getItem(ACCOUNT_CACHE_KEY) ?? '{}') as { accountId?: string }).accountId;
  check('L load: a profile\'s first boot mints one id and every later load keeps it',
    isAccountId(boot.accountId) && hydrated.accountId === boot.accountId && again.accountId === boot.accountId, boot.accountId);
  check('L load: a cached save that predates the id is minted at its load and cached at once',
    isAccountId(healed.accountId) && cachedId === healed.accountId);
  check('L identity: minting draws nothing from the seeded stream (THE STREAM LAW)', draws === 0, `${draws} draws`);
  window.localStorage.removeItem(ACCOUNT_CACHE_KEY);
}
const acctLone = claimedAccount();
const watcher = new WsTransport();
const watcherRows = rowsOf(watcher);
await watcher.connect(vurl, { name: 'Watcher', classId: 'rogue' });
const lone = new WsTransport();
const lw = await lone.connect(vurl, { name: 'Lone', classId: 'warrior', accountId: acctLone.accountId });
await waitFor(() => vh.world.seats.length === 3 && watcher.peers().length === 3, vh, 60);
check('L join: the join carries the id to the host', vh.vessels.accountOf(lw.self) === acctLone.accountId);
check('L join: no roster row on the wire carries it',
  [...watcher.peers(), ...lone.peers()].every(p => p.accountId === undefined) && watcher.peers().some(p => p.id === lw.self));
{
  const forger = new WsTransport();
  const fw = await forger.connect(vurl, { name: 'Forger', classId: 'warrior', accountId: 'p1' });
  await waitFor(() => !!seatOf(fw.self), vh, 60);
  check('L join: a malformed id keys nothing', !!seatOf(fw.self) && vh.vessels.accountOf(fw.self) === undefined);
  forger.leave();
  await waitFor(() => !seatOf(fw.self), vh, 60);
}

// ========================================================== M: THE VESSEL ==
const acctA = claimedAccount();
const V = forgeVessel({ classId: 'warrior', level: 12, name: 'Aldric', charId: 'c-probe-aldric', bag: 6,
  worn: ['helmet', 'chest', 'gloves', 'boots'], essences: { coarse: 40, glimmering: 10 } });
// Its own run config and run counters (the pass-through must keep them its own).
V.expedition = { ...V.expedition!, seed: 0x1234 };
V.ledger = { probe_counter: 7 };
const vBag = uids(V.items ?? []), vWorn = uids(Object.values(V.equipped ?? {}));
check('M forge: a level-12 warrior with a bag and a doll, no world half',
  V.level === 12 && (V.items ?? []).length === 6 && Object.keys(V.equipped ?? {}).length === 4 && V.world === undefined,
  `${(V.items ?? []).length} bag, ${Object.keys(V.equipped ?? {}).length} worn, ${JSON.stringify(V).length} bytes`);
{
  const j = judgeVessel({ ...V, world: { zones: [] } });
  check('M judge: the world half never travels', 'save' in j && !('world' in j.save));
  const deep = structuredClone(V);
  (deep.items![0] as { baseRoll: number }).baseRoll = Infinity;
  const hostile: [string, unknown][] = [
    ['class', { ...V, classId: 'nobody' }], ['level', { ...V, level: VESSEL_CFG.maxLevel + 1 }],
    ['skills', { ...V, knownSkills: 'nope' }], ['bag', { ...V, items: [{ uid: -3 }] }],
    ['charId', { ...V, charId: '' }], ['schema', { ...V, schemaVersion: -1 }],
    ['infinity', deep], ['not an object', 'vessel'],
  ];
  const leaks = hostile.filter(([, raw]) => !('refused' in judgeVessel(raw))).map(([why]) => why);
  check('M judge: hostile shapes are refused before anything grafts', leaks.length === 0, leaks.join(', '));
}
const cv = new WsTransport();
const cvRows = rowsOf(cv);
window.localStorage.removeItem(storageKey('arpg_account_v1'));
const linkA = new ShardVesselLink(cv, acctA, V, () => null);
check('M vessel: the link saves the account before the shard keys a record by its id',
  (JSON.parse(window.localStorage.getItem(storageKey('arpg_account_v1')) ?? '{}') as { accountId?: string }).accountId === acctA.accountId);
const cw = await cv.connect(vurl, { name: V.name!, classId: 'rogue', accountId: acctA.accountId }, V);
await waitFor(() => !!seatOf(cw.self), vh, 60);
{
  const s = seatOf(cw.self)!, hero = vh.world.seatHero(s);
  check('M vessel: the uploaded class wins over the lobby card', s.meta.classDef.id === 'warrior');
  check('M vessel: the shard seats it at its level, named, with its own bag and doll',
    hero.level === 12 && s.meta.name === 'Aldric' && uids(s.meta.items) === vBag
    && uids(Object.values(s.meta.equipped).flatMap(i => (i ? [i] : []))) === vWorn, `level ${hero.level}, ${s.meta.items.length} bag`);
  check('M vessel: its wallet and life-contract ride along',
    s.meta.essences.coarse === 40 && s.meta.essences.glimmering === 10 && s.meta.modeId === 'mortal' && s.meta.charId === V.charId);
  check('M vessel: the desk keys it by its account', vh.vessels.vesselOf(cw.self)?.accountId === acctA.accountId);
  check('M vessel: the grafted hero stands whole', Number.isFinite(hero.maxLife()) && hero.life === hero.maxLife() && !hero.downed);
}
{
  // THE ACTING SEAT (a refused hero): a vessel the shard will not seat is never seated
  // fresh in its place (card 22: a fresh hero is never a shard's hero).
  const bad = new WsTransport();
  const badRows = rowsOf(bad);
  const bw = await bad.connect(vurl, { name: 'Broken', classId: 'rogue', accountId: claimedAccount().accountId },
    { ...V, charId: 'c-broken', knownSkills: 'nope' } as unknown as CharacterSave);
  const dup = new WsTransport();
  const dupRows = rowsOf(dup);
  const dw = await dup.connect(vurl, { name: 'Twin', classId: 'warrior', accountId: acctA.accountId }, V);
  await waitFor(() => badRows.some(m => m.t === 'refused') && dupRows.some(m => m.t === 'refused'), vh, 60);
  const br = badRows.find(m => m.t === 'refused'), dr = dupRows.find(m => m.t === 'refused');
  check('M refused: a vessel that fails the judgment is never seated fresh: its client goes back to Mu',
    br?.t === 'refused' && br.mu === true && !seatOf(bw.self) && !vh.vessels.vesselOf(bw.self), br?.t === 'refused' ? br.word : 'no word');
  check('M refused: a vessel already walking the world is never seated twice (the door word, no seat)',
    dr?.t === 'refused' && !dr.mu && !seatOf(dw.self) && !vh.vessels.vesselOf(dw.self), dr?.t === 'refused' ? dr.word : 'no word');
  bad.leave(); dup.leave();
  await waitFor(() => !seatOf(bw.self) && !seatOf(dw.self), vh, 60);
}
{
  const beat = Math.ceil(SHARD_CFG.persistSec * SHARD_CFG.tickHz) + 30;
  let ticks = 0;
  while (linkA.mirrors < 1 && ticks < beat) { vh.tick(DT); await yieldIO(); ticks++; }
  const slot = loadCharacter();
  check('M mirror: the heroSave arrives on the persistence beat', linkA.mirrors >= 1, `${ticks} ticks (beat ${beat})`);
  check('M mirror: it lands in the run slot, no world half, the same hero',
    !!slot && slot.world === undefined && slot.charId === V.charId && slot.level === 12 && uids(slot.items ?? []) === vBag);
  check('M mirror: it went to that seat alone', cvRows.some(m => m.t === 'heroSave') && !watcherRows.some(m => m.t === 'heroSave'));
  check("M mirror: the pass-through stays the vessel's own, never the shard's",
    // (+ THE ACTING SEAT's traveller's flasks: the gift a virgin vessel was dealt is stamped on its OWN ledger)
    slot?.ledger?.probe_counter === 7 && JSON.stringify(Object.keys(slot?.ledger ?? {}).sort())
      === JSON.stringify(['mireille_flasks_given', LEDGER_FLASK_LESSON, 'probe_counter'].sort()) && slot?.expedition?.seed === 0x1234,
    JSON.stringify(slot?.ledger));
  // THE GUARD: once another run owns the slot, a late mirror never lands.
  const parked = new WsTransport();
  const guarded = new ShardVesselLink(parked, acctA, V, () => null, { mayWrite: () => false });
  const before = JSON.stringify(loadCharacter());
  (parked as unknown as { dispatch(m: unknown): void }).dispatch({ t: 'session', msg: { t: 'heroSave', save: { ...slot, level: 99 } } });
  check('M mirror: a late mirror never lands once another run owns the slot',
    guarded.mirrors === 0 && JSON.stringify(loadCharacter()) === before);
}
{
  const before = linkA.mirrors;
  cv.leave(); // THE FAREWELL: ask for the last mirror, close when it lands
  const gone = await waitFor(() => !seatOf(cw.self), vh, 120);
  check('M farewell: the last mirror lands before the socket closes', gone && linkA.mirrors === before + 1,
    `${linkA.mirrors - before} mirror(s) at the farewell`);
}
const V2 = await readTravelingVessel();
check('M round trip: the mirror reads back as the next traveling vessel',
  !!V2 && V2.charId === V.charId && V2.world === undefined && V2.level === 12 && uids(V2.items ?? []) === vBag);
const cv2 = new WsTransport();
const cv2Rows = rowsOf(cv2);
const cv2Order: string[] = []; // session kinds and zone messages, in arrival order
cv2.onSession(m => cv2Order.push(m.t));
cv2.onZone(() => cv2Order.push('zone'));
const link2 = new ShardVesselLink(cv2, acctA, V2, () => null);
const c2 = await cv2.connect(vurl, { name: V2!.name!, classId: 'warrior', accountId: acctA.accountId }, V2!);
await waitFor(() => !!seatOf(c2.self), vh, 60);
check('M round trip: the shard seats the mirror as the same hero',
  !!vh.vessels.vesselOf(c2.self) && vh.world.seatHero(seatOf(c2.self)!).level === 12 && uids(seatOf(c2.self)!.meta.items) === vBag);

// ================================================== N: THE DEATH COVENANT ==
// The body falls by the plaza, far from the bedside every fresh hero wakes at.
const wp = vh.world.waypointPos ?? vh.keeper.actor.pos;
const deathSpot = vh.world.findFreeSpot(vec(wp.x + 180, wp.y + 160), 16);
{
  const s = seatOf(c2.self)!, hero = vh.world.seatHero(s);
  hero.pos.x = deathSpot.x; hero.pos.y = deathSpot.y;
  await runTicks(vh, 5);
  vh.world.kill(hero);
  await runTicks(vh, 3);
  // THE ACTING SEAT (THE DEATH BEAT): the fall is decided at once; the body stands dead for the beat.
  check('N covenant: the fall is decided the tick it lands; the body stands dead and untargetable through THE DEATH BEAT',
    vh.vessels.falls === 1 && !!seatOf(c2.self) && hero.dead && hero.untargetable && !cv2Rows.some(m => m.t === 'runEnd'));
  await runTicks(vh, Math.ceil(VESSEL_CFG.deathBeatSec * SHARD_CFG.tickHz) + 10);
  // Card 14 C (her ruling 2026-10-08): the down IS the death, however many stand to kneel.
  check('N covenant: a mortal vessel\'s lethal down falls it at once, even while another player stands to kneel (card 14 C)',
    !seatOf(c2.self) && vh.vessels.falls === 1 && vh.corpses.forAccount(acctA.accountId).length === 1);
}
watcher.leave(); lone.leave();
await waitFor(() => vh.vessels.falls === 1, vh, 120);
{
  const iC = cv2Rows.findIndex(m => m.t === 'corpse'), iE = cv2Rows.findIndex(m => m.t === 'runEnd');
  check('N covenant: the mortal vessel falls: `corpse` then `runEnd` reach its client', iC >= 0 && iE > iC, `corpse@${iC} runEnd@${iE}`);
  const bodies = vh.corpses.forAccount(acctA.accountId);
  const b = bodies[0];
  check('N covenant: the body is recorded where it fell, holding the worn gear',
    bodies.length === 1 && dist(b.pos, deathSpot) < 1 && b.zoneId === vh.world.zone.id
    && b.loot.items.length === 4 && uids(b.loot.items.flatMap(it => (it.kind === 'gear' ? [it.item] : []))) === vWorn,
    b ? `${b.zoneId} @ ${b.pos.x.toFixed(0)},${b.pos.y.toFixed(0)}, ${b.loot.items.length} pieces` : 'none');
  check('N covenant: the seat is gone; the body stands instead', !seatOf(c2.self) && !vh.vessels.vesselOf(c2.self));
  const row = cv2Rows[iC];
  check('N covenant: the reckoning ships with the note (60 worth carried, minted at the mortal rate)',
    row?.t === 'corpse' && row.reckoning.carried === 60 && row.reckoning.mult === 1 && row.reckoning.minted === 60
    && row.note.pieces === 4 && row.note.id === b?.id && row.note.zoneName === vh.world.zone.name,
    row?.t === 'corpse' ? `minted ${row.reckoning.minted}, renown ${row.reckoning.renown}` : '');
  check('N covenant: the client runs its own mortal reckoning (credits, chronicle, death tally, its run counters)',
    acctA.credits === 60 && acctA.runRecords.length === 1 && acctA.ledger[LEDGER_ACCOUNT_DEATHS] === 1
    && acctA.ledger.probe_counter === 7, `credits ${acctA.credits}`);
  check('N covenant: the run slot is wiped (permadeath)', loadCharacter() === null);
  const staged = link2.takeDeath(cv2, null);
  check('N covenant: the death screen is staged once, naming the ground',
    !!staged && staged.reck.minted === 60 && staged.reck.zoneName === vh.world.zone.name && link2.takeDeath(cv2, null) === null);
  const disk = onDisk();
  check('N covenant: the records file holds the body and the tombstone',
    disk.corpses.length === 1 && disk.corpses[0].id === b?.id && disk.fallen.some(f => f.charId === V.charId && f.accountId === acctA.accountId));
}
{
  const acctI = claimedAccount();
  const VI = forgeVessel({ classId: 'rogue', level: 9, name: 'Vow', charId: 'c-probe-vow', modeId: 'immortal', bag: 0, worn: ['helmet'] });
  const ci = new WsTransport();
  const ciRows = rowsOf(ci);
  const iw = await ci.connect(vurl, { name: 'Vow', classId: 'rogue', accountId: acctI.accountId }, VI);
  await waitFor(() => !!seatOf(iw.self), vh, 60);
  const hero = vh.world.seatHero(seatOf(iw.self)!);
  check('N immortal: an Immortal vessel grafts under its own contract', seatOf(iw.self)!.meta.modeId === 'immortal' && !!vh.vessels.vesselOf(iw.self));
  vh.world.kill(hero);
  await runTicks(vh, 2);
  check('N immortal: its death is a DOWN (its stage survives death: no fall, no body)',
    hero.downed && !!seatOf(iw.self) && !ciRows.some(m => m.t === 'corpse' || m.t === 'runEnd') && vh.corpses.forAccount(acctI.accountId).length === 0);
  await runTicks(vh, Math.ceil(SHARD_CFG.keeper.reviveSec * SHARD_CFG.tickHz * 1.1) + 2);
  check('N immortal: THE MERCY stands it back up', !hero.downed && !hero.dead && hero.life > 0);
  ci.leave();
  await waitFor(() => !seatOf(iw.self), vh, 60);
}
{
  // THE FRESH HERO'S END (card 14 C): a vessel-less hero's lethal down ends it the same
  // way — runEnd, the seat gone — with no body to reclaim and no mercy clock.
  const cf = new WsTransport();
  const cfRows = rowsOf(cf);
  const acctF = claimedAccount();
  const fw = await cf.connect(vurl, { name: 'Fresh', classId: 'warrior', accountId: acctF.accountId });
  await waitFor(() => !!seatOf(fw.self), vh, 60);
  const hero = vh.world.seatHero(seatOf(fw.self)!);
  const fallsBefore = vh.vessels.falls;
  vh.world.kill(hero);
  await waitFor(() => !seatOf(fw.self), vh, Math.ceil(VESSEL_CFG.deathBeatSec * SHARD_CFG.tickHz) + 10); // THE DEATH BEAT first
  check('N fresh: a fresh hero\'s lethal down ends it (after THE DEATH BEAT): runEnd, the seat gone, no body (card 14 C)',
    !seatOf(fw.self) && cfRows.some(m => m.t === 'runEnd') && !cfRows.some(m => m.t === 'corpse') && vh.vessels.freshFalls === 1
    && vh.vessels.falls === fallsBefore && vh.corpses.forAccount(acctF.accountId).length === 0, cfRows.map(m => m.t).join(' → ') || '(nothing heard)');
  cf.leave();
  await runTicks(vh, 3);
}
{
  const ct = new WsTransport();
  const ctOrder: string[] = [];
  ct.onSession(m => ctOrder.push(m.t));
  const tw = await ct.connect(vurl, { name: V2!.name!, classId: 'warrior', accountId: acctA.accountId }, V2!);
  await waitFor(() => ctOrder.includes('runEnd'), vh, 60);
  check('N tombstone: a fallen vessel never walks in again: its re-upload takes no seat and hears its word',
    !seatOf(tw.self) && !vh.vessels.vesselOf(tw.self) && ctOrder.indexOf('corpse') >= 0
    && ctOrder.indexOf('runEnd') > ctOrder.indexOf('corpse'), ctOrder.join(' → '));
  ct.leave();
  await runTicks(vh, 5);
}
{
  // THE TOMBSTONE'S WORD: under card 14 C the fall is immediate, so a client that missed it
  // (a socket dropped at the wrong moment — the window THE DORMANT SEAT opens, card 16) hears
  // the owed word at its next upload of that vessel: `corpse`, then `runEnd`, then its class
  // pick rejoins as a fresh hero. The first client here books nothing (no link) — the stale
  // copy's upload is the one that hears and reckons, exactly once.
  const acctW = claimedAccount();
  const W = forgeVessel({ classId: 'warrior', level: 7, name: 'Wren', charId: 'c-probe-wren', bag: 0, worn: ['boots'], essences: { coarse: 9 } });
  const kneeler = new WsTransport();
  const kw = await kneeler.connect(vurl, { name: 'Kneeler', classId: 'rogue' });
  const cwr = new WsTransport();
  const ww = await cwr.connect(vurl, { name: 'Wren', classId: 'warrior', accountId: acctW.accountId }, W);
  await waitFor(() => !!seatOf(kw.self) && !!seatOf(ww.self), vh, 60);
  const heroW = vh.world.seatHero(seatOf(ww.self)!);
  const spotW = vh.world.findFreeSpot(vec(wp.x - 200, wp.y + 160), 16);
  heroW.pos.x = spotW.x; heroW.pos.y = spotW.y;
  const fallsW = vh.vessels.falls;
  vh.world.kill(heroW);
  await waitFor(() => vh.vessels.falls === fallsW + 1 && !seatOf(ww.self), vh, Math.ceil(VESSEL_CFG.deathBeatSec * SHARD_CFG.tickHz) + 60); // THE DEATH BEAT first
  check('N tombstone\'s word: beside a standing ally the mortal vessel still falls at once (card 14 C)',
    !seatOf(ww.self) && vh.vessels.falls === fallsW + 1 && vh.corpses.forAccount(acctW.accountId).length === 1);
  const fallenW = onDisk().fallen.find(f => f.charId === W.charId);
  check('N tombstone\'s word: the tombstone carries the owed word', fallenW?.word?.reckoning.minted === 9, fallenW ? JSON.stringify(fallenW.word?.reckoning.minted) : 'no tombstone');
  cwr.leave();
  await runTicks(vh, 5);
  const cwr2 = new WsTransport();
  const order: string[] = [];
  cwr2.onSession(m => order.push(m.t));
  cwr2.onZone(() => order.push('zone'));
  const linkW2 = new ShardVesselLink(cwr2, acctW, W, () => null);
  const ww2 = await cwr2.connect(vurl, { name: 'Wren', classId: 'warrior', accountId: acctW.accountId }, W);
  await waitFor(() => order.includes('runEnd'), vh, 60);
  check('N tombstone\'s word: its re-upload joins no seat and hears `corpse` then `runEnd`',
    !seatOf(ww2.self) && order.indexOf('corpse') >= 0 && order.indexOf('runEnd') > order.indexOf('corpse'), order.join(' → '));
  check('N tombstone\'s word: the client runs its reckoning once and wipes its slot',
    acctW.credits === 9 && loadCharacter() === null && !!linkW2.takeDeath(cwr2, null), `credits ${acctW.credits}`);
  cwr2.sendSession({ t: 'rejoin', classId: 'rogue' });
  await waitFor(() => !!seatOf(ww2.self) && order.includes('newRun'), vh, 60);
  await runTicks(vh, 2);
  check('N tombstone\'s word: its class pick rejoins as a fresh hero, the terrain after its newRun',
    vh.world.seatHero(seatOf(ww2.self)!).level === 1 && order.lastIndexOf('zone') > order.indexOf('newRun'), order.join(' → '));
  kneeler.leave(); cwr2.leave();
  await waitFor(() => !seatOf(kw.self) && !seatOf(ww2.self), vh, 60);
}

// ================================================== O: THE CORPSE RETURNS ==
{
  const body = vh.corpses.forAccount(acctA.accountId)[0];
  const B = new ShardHost({ seed: VSEED, saveDir: vdir, open: true, log: quiet });
  const bb = B.corpses.forAccount(acctA.accountId);
  check('O persist: a second boot remembers the body and the tombstone',
    bb.length === 1 && bb[0].id === body?.id && dist(bb[0].pos, deathSpot) < 1 && B.corpses.hasFallen(acctA.accountId, V.charId!));
  await B.stop();
}
// The fallen player comes back on the same connection: the class pick's rejoin.
cv2.sendSession({ t: 'rejoin', classId: 'warrior' });
await waitFor(() => cv2Rows.some(m => m.t === 'newRun') && !!seatOf(c2.self), vh, 60);
await runTicks(vh, 3);
const claimant = seatOf(c2.self)!;
const standing = vh.corpses.standing(c2.self);
check('O return: the rejoin seats a fresh hero keyed by the same account',
  !!claimant && vh.world.seatHero(claimant).level === 1 && !vh.vessels.vesselOf(c2.self) && vh.vessels.accountOf(c2.self) === acctA.accountId);
check('O return: the terrain follows its newRun (the shell that applies it stands up on newRun)',
  cv2Order.lastIndexOf('zone') > cv2Order.lastIndexOf('newRun'), cv2Order.slice(-4).join(' → '));
check('O return: its body stands where it fell, far from the bedside it woke at',
  standing.length === 1 && dist(standing[0].pos, deathSpot) < 24
  && dist(standing[0].pos, vh.world.seatHero(claimant).pos) > transitRadius('corpse_reclaim', 110),
  standing[0] ? `${dist(standing[0].pos, vh.world.seatHero(claimant).pos).toFixed(0)} px from the claimant` : 'none');
const lastBodies = [...cv2Rows].reverse().find(m => m.t === 'corpses');
check('O return: its client is told where (its own corpses row)',
  lastBodies?.t === 'corpses' && lastBodies.bodies.length === 1 && lastBodies.bodies[0].id === standing[0]?.id);
{
  const co = new WsTransport();
  const coRows = rowsOf(co);
  const ow = await co.connect(vurl, { name: 'Other', classId: 'rogue', accountId: claimedAccount().accountId });
  await waitFor(() => !!seatOf(ow.self), vh, 60);
  await runTicks(vh, 3);
  const other = vh.world.seatHero(seatOf(ow.self)!);
  other.pos.x = standing[0].pos.x; other.pos.y = standing[0].pos.y;
  await runTicks(vh, Math.ceil(transitDwell('corpse_reclaim') * SHARD_CFG.tickHz * 2));
  check('O return: another account sees no body and cannot reclaim it',
    vh.corpses.standing(ow.self).length === 0 && coRows.some(m => m.t === 'corpses')
    && coRows.every(m => m.t !== 'corpses' || m.bodies.length === 0) && vh.corpses.forAccount(acctA.accountId).length === 1);
  co.leave();
  await waitFor(() => !seatOf(ow.self), vh, 60);
}
{
  const deeds = acctA.ledger[LEDGER_CORPSES_RECLAIMED] ?? 0;
  const hero = vh.world.seatHero(claimant);
  hero.pos.x = standing[0].pos.x; hero.pos.y = standing[0].pos.y;
  const clock = Math.ceil(transitDwell('corpse_reclaim') * SHARD_CFG.tickHz);
  const half = await waitFor(() => vh.corpses.reclaims === 1, vh, Math.floor(clock / 2));
  check('O reclaim: the dwell is the corpse run\'s own clock (not yet at half)', !half && vh.corpses.standing(c2.self)[0]?.dwell > 0);
  const got = await waitFor(() => vh.corpses.reclaims === 1, vh, clock + 10);
  check('O reclaim: the owner reclaims its body by the dwell', got && vh.corpses.forAccount(acctA.accountId).length === 0);
  const bag = new Set(claimant.meta.items.map(i => i.uid));
  check('O reclaim: the worn gear comes home into its bag, the exact pieces',
    (JSON.parse(vWorn) as number[]).every(uid => bag.has(uid)), `${claimant.meta.items.length} in the bag`);
  const disk = onDisk();
  check('O reclaim: the record clears on disk; the tombstone stays',
    !disk.corpses.some(c => c.accountId === acctA.accountId) && disk.fallen.some(f => f.accountId === acctA.accountId));
  await runTicks(vh, 3);
  check('O reclaim: the deed rides home on the next row; no body stands',
    acctA.ledger[LEDGER_CORPSES_RECLAIMED] === deeds + 1 && vh.corpses.standing(c2.self).length === 0);
}
{
  const Wm = new ShardHost({ seed: VSEED, saveDir: vdir, open: true, worldmass: true, log: quiet });
  // (the wilds write their own world file since THE WILDS SAVE; the records live beside it, never inside it)
  check('O persist: a wilds shard keeps the records beside its own world file (the tombstone survives the world half)',
    !!Wm.savePath && Wm.savePath.endsWith(SHARD_CFG.wildsSaveSuffix + '.json') && Wm.corpses.path === shardRecordsPath(vdir, VSEED) && Wm.corpses.hasFallen(acctA.accountId, V.charId!));
  await Wm.stop();
}
cv2.leave();
await waitFor(() => vh.world.seats.length === 1, vh, 60);
await vh.stop();
rmSync(vdir, { recursive: true, force: true });
restoreRandom();

// ======================================================== R: THE ROVING SHADOW ==
// SHARD_CFG.rove (ships OFF; docs/engine/shard.md): with the dial off the keeper
// shadows the focus seat every tick and never hops, however far the seats stand
// apart; with it on and the standing seats in two clusters, the keeper visits each
// cluster in turn on the cadence, and one cluster again means no hop at all.
{
  const roveWas = SHARD_CFG.rove.sec;
  const RSEED = 0x0ddba11; // the probe's wilds (Q's seed), one fixed world
  const rh = new ShardHost({ seed: RSEED, saveDir: null, open: true, worldmass: true, log: quiet });
  await rh.ready();
  await runTicks(rh, 60);
  const portR = await rh.listen(0, '127.0.0.1');
  const ca = new WsTransport(), cb = new WsTransport();
  await ca.connect(`ws://127.0.0.1:${portR}`, { name: 'Ashe', classId: 'warrior' });
  await cb.connect(`ws://127.0.0.1:${portR}`, { name: 'Bryn', classId: 'warrior' });
  await waitFor(() => rh.world.seats.length === 3, rh, 60);
  const sa = rh.world.seats.find(x => x.id === 'p1')!, sb = rh.world.seats.find(x => x.id === 'p2')!;
  const hopsOf = (): number => (rh.status() as { rove: { hops: number } }).rove.hops;
  const keeperOn = (seat: typeof sa): boolean => Math.abs(rh.keeper.actor.pos.x - seat.actor.pos.x) < 1 && Math.abs(rh.keeper.actor.pos.y - (seat.actor.pos.y + SHARD_CFG.keeper.shadowOffset)) < 1;
  try {
    SHARD_CFG.rove.sec = 0;
    sb.actor.pos.x = sa.actor.pos.x + 4000; sb.actor.pos.y = sa.actor.pos.y;
    sa.lastActedAt = rh.world.time; // Ashe is the focus (the most recent act)
    let tracked = 0;
    for (let i = 0; i < 60; i++) { await runTicks(rh, 1); if (keeperOn(rh.focusSeat()!)) tracked++; }
    check('R rove off: the keeper shadows the focus seat every tick and never hops, two clusters or not', tracked === 60 && hopsOf() === 0, `tracked ${tracked}/60, hops ${hopsOf()}`);
    SHARD_CFG.rove.sec = 1;
    const seen = new Set<string>();
    const ticks = Math.round(2.5 * SHARD_CFG.tickHz);
    for (let i = 0; i < ticks; i++) { await runTicks(rh, 1); if (keeperOn(sa)) seen.add('a'); else if (keeperOn(sb)) seen.add('b'); }
    check('R rove on: two clusters are visited in turn on the cadence (the keeper stood on both bodies; at least two hops in 2.5 s at 1 s visits)',
      seen.has('a') && seen.has('b') && hopsOf() >= 2, `stood on ${[...seen].join(',')}, hops ${hopsOf()}`);
    const hopsBefore = hopsOf();
    sb.actor.pos.x = sa.actor.pos.x + 200; sb.actor.pos.y = sa.actor.pos.y; // one cluster again
    let trackedAgain = 0;
    for (let i = 0; i < 90; i++) { await runTicks(rh, 1); if (keeperOn(rh.focusSeat()!)) trackedAgain++; }
    check('R rove on, one cluster: no hop; the keeper tracks the focus as before', hopsOf() === hopsBefore && trackedAgain === 90, `hops ${hopsBefore}→${hopsOf()}, tracked ${trackedAgain}/90`);
  } finally { SHARD_CFG.rove.sec = roveWas; }
  ca.leave(); cb.leave();
  await waitFor(() => rh.world.seats.length === 1, rh, 60);
  await rh.stop();
}

// Let in-flight socket closes settle before the process ends: Node on Windows
// asserts inside libuv when process.exit lands mid-close (a red exit code on
// an all-green rig — the probe gate reads the code).
const EXIT_SETTLE_MS = 600;
await new Promise(r => setTimeout(r, EXIT_SETTLE_MS));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
