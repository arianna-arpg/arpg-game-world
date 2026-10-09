// THE ACTING SEAT (docs/engine/shard.md "The pieces"): every interaction on a hosted world
// judges the seat that acted, never "the local player" (the parked keeper). The rig boots a
// classic shard with an open account, seats players over the wire and pins:
//   A  the hand: a remote seat's channel held 5 s stays held, a guard stays up until the
//      button releases; a hired blade keeps the monster's clock (its pilot only taps);
//   B  the refusal note reaches its own seat alone (SeatW.fn, never a floater for all), and
//      the client floats it over its own head; the low-life surge rides its own row too;
//   C  THE DEATH BEAT: a lethal blow, then the body stands dead and untargetable on the wire
//      for VESSEL_CFG.deathBeatSec, then `runEnd` (never before the blow is shown);
//   D  shared interactions answer any standing player: a chest's lock, a shrine's draught
//      (on the toucher, never the keeper), a waypoint's brush;
//   E  the traveller's flasks: a virgin vessel is dealt them by its own ledger, and a vessel
//      whose ledger says the gift was handed is not;
//   F  THE GROUP LAW's near radius, and THE MERCY's census: a stranger never withholds it,
//      and a body the covenant owns is never the mercy's;
//   G  the leave mid-fight sleeps like a lost socket (no farewell mirror); a calm leave goes;
//   H  the reckoning counts the seat's own kills and places, never the server's;
//   I  THE BUILD STAMP refuses another build at the door; a refused vessel is never seated
//      fresh (Mu, or a door word for a twin);
//   J  a notice reaches the acting seat's party (world events reach all), an eyecatch the
//      caster's party and the seats near it; no audience list ever ships;
//   K  the muster horn sounds only for a hand on it.
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { VESSEL_CFG } from '../server/vessel';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import { WsTransport } from '../src/net/ws';
import { shardBuildStamp, SHARD_REFUSAL } from '../src/net/shardBuild';
import { applyOwnSeatRows } from '../src/net/seatView';
import { applySnapshot, SEAT_OWN_ROWS, type StateSnapshot } from '../src/net/snapshot';
import type { SessionMsg } from '../src/net/transport';
import { NullInput, type PlayerInput } from '../src/net/intent';
import { COOP_SCALING } from '../src/data/coop';
import { CLASSES } from '../src/data/classes';
import { SKILLS } from '../src/data/skills';
import { SHRINES } from '../src/data/shrines';
import { LEDGER_FLASK_LESSON, ensureAccountId, makeAccount, type Account } from '../src/meta/account';
import { serializeCouchGuest, type CharacterSave } from '../src/meta/character';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { World, LOW_LIFE_FLASH_SEC, type Seat } from '../src/engine/world';
import { buildManifest } from '../src/packages/manifest';
import { seedGlobalRandom } from '../src/sim/rng';
import { dist, vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
const sec = (s: number): number => Math.ceil(s * SHARD_CFG.tickHz);
async function runTicks(n: number, each?: () => void): Promise<void> {
  for (let i = 0; i < n; i++) { each?.(); host.tick(DT); await yieldIO(); }
}
async function waitFor(cond: () => boolean, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) { if (cond()) return true; host.tick(DT); await yieldIO(); }
  return cond();
}
async function waitMs(cond: () => boolean, ms = 4000): Promise<boolean> {
  const t0 = Date.now();
  while (!cond()) { if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 5)); }
  return true;
}

const restoreRandom = seedGlobalRandom(0x5ea7);
SHARD_WIRE_CFG.maxPerIp = Number.POSITIVE_INFINITY; // every client of this rig arrives from one address (`--per-ip 0`, the forwarder case)
const logs: string[] = [];
const host = new ShardHost({ seed: 0x5ea7ac7, saveDir: null, open: true, log: line => { logs.push(line); } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const seatOf = (id: string): Seat | undefined => w.seats.find(s => s.id === id);

/** A client over the wire: every snapshot and session word it hears, in arrival order. */
interface Client { c: WsTransport; id: string; heard: SessionMsg[]; snaps: StateSnapshot[]; order: string[] }
async function join(name: string, opts: { accountId?: string; vessel?: CharacterSave; classId?: string } = {}): Promise<Client> {
  const c = new WsTransport();
  const cl: Client = { c, id: '', heard: [], snaps: [], order: [] };
  c.onSession(m => { cl.heard.push(m); cl.order.push(m.t); });
  c.onState(s => { cl.snaps.push(s); cl.order.push('snap'); if (cl.snaps.length > 400) cl.snaps.splice(0, 200); });
  const welcome = await c.connect(url, { name, classId: opts.classId ?? 'warrior', ...(opts.accountId ? { accountId: opts.accountId } : {}) }, opts.vessel);
  cl.id = welcome.self;
  await waitFor(() => !!seatOf(cl.id) || cl.heard.some(m => m.t === 'refused' || m.t === 'runEnd'), 60);
  return cl;
}
/** A willed input over the wire (ends THE SPAWN GRACE). */
const input = (cl: Client, held: boolean[], dx = 0, seq?: number): PlayerInput => {
  const a = seatOf(cl.id)!.actor;
  return { dx, dy: 0, aim: { x: a.pos.x + 80, y: a.pos.y }, held, edge: held.map(() => false), ...(seq !== undefined ? { seq } : {}) };
};
/** Stand a seat's hero at a spot (the world's clamp says where it truly stands). */
const place = (s: Seat, x: number, y: number): void => { const p = w.clampPos(vec(x, y), s.actor.radius); s.actor.pos.x = p.x; s.actor.pos.y = p.y; };
const claimedAccount = (): Account => { const a = makeAccount(); ensureAccountId(a); return a; };
/** Forge a vessel on a scratch seat (the couch guest's shape, as the wire carries it). */
function forgeVessel(o: { name: string; charId: string; ledger?: Record<string, number> }): CharacterSave {
  const seat = w.addSeat('forge', CLASSES.find(c => c.id === 'warrior')!, new NullInput(), { startingCompanions: false, startingFlasks: false });
  seat.meta.name = o.name; seat.meta.charId = o.charId;
  const save = serializeCouchGuest(w, seat, {});
  w.removeSeat('forge');
  const out = JSON.parse(JSON.stringify(save)) as CharacterSave;
  out.ledger = { ...(o.ledger ?? {}) };
  return out;
}

// ================================================================== A: the hand ==
const A = await join('Anvil'), B = await join('Bram'), C = await join('Cass');
await runTicks(3);
{
  const actor = seatOf(A.id)!.actor;
  actor.sheet.setSource('probe_mana', [mod('mana', 'flat', 5000)]);
  actor.mana = actor.maxMana();
  actor.skills[0] = makeSkillInstance(SKILLS.whirlwind, 1, 1);
  actor.skills[1] = makeSkillInstance(SKILLS.shield_up, 1, 1);
  let seq = 1;
  await runTicks(4, () => A.c.sendInput(A.id, input(A, [true, false], 0, seq++)));
  const cs = actor.casting;
  await runTicks(sec(5), () => A.c.sendInput(A.id, input(A, [true, false], 0, seq++)));
  check('A hand: a remote seat\'s channel held 5 s stays one held channel (its hand, never the monster clock)',
    !!cs && cs.inst.def.id === 'whirlwind' && actor.casting === cs && cs.held && (cs.channelTime ?? 0) >= 4.5,
    `channel ${(cs?.channelTime ?? 0).toFixed(2)} s, same cast ${actor.casting === cs}`);
  await runTicks(6, () => A.c.sendInput(A.id, input(A, [false, false], 0, seq++)));
  check('A hand: releasing the button ends the channel', actor.casting?.inst.def.id !== 'whirlwind');
  for (let i = 0; i < 60 && actor.casting?.mode !== 'guard'; i++) await runTicks(1, () => A.c.sendInput(A.id, input(A, [false, true], 0, seq++)));
  const gs = actor.casting;
  await runTicks(sec(3), () => A.c.sendInput(A.id, input(A, [false, true], 0, seq++)));
  check('A hand: a guard stays up while the button holds', !!gs && gs.mode === 'guard' && actor.casting === gs && gs.held,
    `guard ${(gs?.channelTime ?? 0).toFixed(2)} s`);
  await runTicks(6, () => A.c.sendInput(A.id, input(A, [false, false], 0, seq++)));
  check('A hand: and drops when it releases', actor.casting?.mode !== 'guard');
  // A HIRED BLADE keeps the monster's clock: its pilot taps an edge and never holds.
  const m = w.addSeat('m9', CLASSES[0], new NullInput(), { startingCompanions: false, startingFlasks: false });
  m.merc = { name: 'Probe Blade' };
  m.actor.sheet.setSource('probe_mana', [mod('mana', 'flat', 5000)]);
  m.actor.mana = m.actor.maxMana();
  const ww = makeSkillInstance(SKILLS.whirlwind, 1, 1);
  m.actor.skills[0] = ww;
  w.useSkill(m.actor, ww, vec(m.actor.pos.x + 80, m.actor.pos.y), true);
  const mc = m.actor.casting;
  await runTicks(sec(3));
  check('A merc: a hired blade\'s tapped channel still lets go on the monster clock', !!mc && m.actor.casting !== mc);
  w.removeSeat('m9');
}

// ========================================================== B: the refusal note ==
{
  const a = seatOf(A.id)!;
  const from = { a: A.snaps.length, b: B.snaps.length };
  A.c.sendSession({ t: 'action', action: { t: 'refundPassive', nodeId: 'probe_nowhere' } });
  await runTicks(12);
  const note = w.seatHudWire(a)?.fn?.text ?? '';
  const rows = A.snaps.slice(from.a).map(s => s.seats[A.id]?.fn).filter(r => !!r);
  const bSnaps = B.snaps.slice(from.b);
  check('B note: a refused act notes the seat that acted (never this machine\'s floater)', !!note && !w.texts.some(t => t.text === note), note);
  check('B note: the note rides its own seat\'s row to its own client', rows.length > 0 && rows[0]!.text === note);
  check('B note: no other client hears it (no row, no floater), yet every client keeps the public row',
    bSnaps.length > 0 && !bSnaps.some(s => Object.values(s.seats).some(r => r.fn || r.lh !== undefined))
    && !bSnaps.some(s => s.texts.some(t => t.text === note)) && bSnaps.every(s => !!s.seats[A.id]));
  const shell = new World(makeAccount(), Object.freeze(buildManifest(makeAccount(), host.seed)));
  shell.clientSeatId = A.id;
  shell.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  const last = A.snaps.slice(from.a).filter(s => s.seats[A.id]?.fn).at(-1);
  if (last) { applySnapshot(shell, last); applyOwnSeatRows(shell, last); }
  check('B client: the own note floats over its own head, the host\'s failNote look', shell.texts.some(t => t.text === note && t.color === '#8a8678' && t.size === 11));
  // THE LOW-LIFE SURGE: struck below the line, the seat's own row carries the surge.
  a.actor.sheet.setSource('probe_life', [mod('life', 'flat', 4000)]);
  a.actor.life = a.actor.maxLife() * 0.1;
  const foe = w.createMonster('zombie', 1, 'enemy');
  foe.pos = vec(a.actor.pos.x + 30, a.actor.pos.y);
  w.actors.push(foe);
  const kit = foe.skills.find(s => !!s)!;
  const hit = (w as unknown as { resolveHit(c: unknown, i: unknown, t: unknown, m?: number): void });
  const from2 = { a: A.snaps.length, b: B.snaps.length };
  for (let i = 0; i < 12 && w.seatHudWire(a)?.lh === undefined; i++) hit.resolveHit(foe, kit, a.actor, 1);
  await runTicks(4);
  const lhRows = A.snaps.slice(from2.a).map(s => s.seats[A.id]?.lh).filter((v): v is number => v !== undefined);
  check('B surge: a hit below its line rides its own row (SeatW.lh) and the host\'s own glow stays dark',
    lhRows.length > 0 && lhRows[0] > 0 && lhRows[0] <= LOW_LIFE_FLASH_SEC && w.lowLifeHitFlash === 0, `${lhRows.length} rows`);
  check('B surge: no other client hears it', !B.snaps.slice(from2.b).some(s => Object.values(s.seats).some(r => r.lh !== undefined)));
  const surged = A.snaps.slice(from2.a).find(s => s.seats[A.id]?.lh !== undefined);
  if (surged) { applySnapshot(shell, surged); applyOwnSeatRows(shell, surged); }
  check('B client: the own surge drives the shell\'s low-life glow', shell.lowLifeHitFlash > 0);
  foe.dead = true;
  a.actor.sheet.removeSource('probe_life');
  a.actor.life = a.actor.maxLife();
}

// ============================================================= C: THE DEATH BEAT ==
{
  const c = seatOf(C.id)!;
  const seen: { at: number; dead: boolean; ut: boolean }[] = [];
  let endAt = -1;
  const offS = C.c.onState(s => {
    const row = s.seats[C.id];
    if (row) seen.push({ at: s.time, dead: row.dead, ut: !!s.actors.find(x => x.seat === C.id)?.ut });
  });
  const offM = C.c.onSession(m => { if (m.t === 'runEnd' && endAt < 0) endAt = seen.length; });
  const t0 = w.time, falls0 = host.vessels.freshFalls;
  w.kill(c.actor);
  await runTicks(3);
  check('C beat: the blow is the fall at once, yet the seat stands dead and untargetable, unheard of runEnd',
    host.vessels.freshFalls === falls0 + 1 && !!seatOf(C.id) && c.actor.dead && c.actor.untargetable && endAt < 0);
  await waitFor(() => endAt >= 0, sec(VESSEL_CFG.deathBeatSec) + 30);
  await runTicks(2);
  const before = seen.slice(0, Math.max(0, endAt)).filter(r => r.at >= t0);
  const span = before.length ? before[before.length - 1].at - before[0].at : 0;
  check('C beat: every snapshot before runEnd shows the body dead and untargetable, for the whole beat',
    endAt >= 0 && before.length >= 10 && before.every(r => r.dead && r.ut) && span >= VESSEL_CFG.deathBeatSec - 0.15,
    `${before.length} snapshots over ${span.toFixed(2)} s`);
  check('C beat: then runEnd, and the seat leaves the world', endAt >= 0 && !seatOf(C.id));
  offS(); offM();
  C.c.leave();
}

// ===================================================== D: the shared interactions ==
{
  const a = seatOf(A.id)!, k = host.keeper.actor;
  place(a, k.pos.x + 520, k.pos.y + 40);
  place(seatOf(B.id)!, k.pos.x - 520, k.pos.y + 40); // THE HEARTH WAKE stood every joiner on the keeper's own spot
  const near = dist(a.actor.pos, k.pos);
  const shrine = { pos: vec(a.actor.pos.x + 8, a.actor.pos.y), def: SHRINES[0], used: false };
  const keeperShrine = { pos: vec(k.pos.x, k.pos.y), def: SHRINES[1], used: false };
  const chest = { pos: vec(a.actor.pos.x - 8, a.actor.pos.y), kind: 'timed' as const, mimic: false, opened: false, lockTime: 0.4, maxLock: 0.4 };
  w.shrines.push(shrine, keeperShrine);
  w.chests.push(chest);
  await runTicks(sec(1));
  check('D shrine: a player\'s touch drinks it, the draught on the toucher', shrine.used && a.actor.buffs.has('shrine_' + SHRINES[0].id), `${Math.round(near)} px from the keeper`);
  check('D shrine: the keeper\'s parked body touches nothing (its own shrine stands full, it wears no draught)',
    !keeperShrine.used && ![...k.buffs.keys()].some(id => id.startsWith('shrine_')));
  check('D chest: a player\'s hands pick the lock away from the keeper', chest.opened);
  const wp = w.waypointPos;
  if (wp) {
    w.discoveredWaypoints.delete(w.zone.id);
    await runTicks(5);
    const untouched = !w.discoveredWaypoints.has(w.zone.id);
    place(a, wp.x + 6, wp.y);
    await runTicks(5);
    check('D waypoint: a player\'s brush attunes it (and nothing did before it came)', untouched && w.discoveredWaypoints.has(w.zone.id));
  } else {
    check('D waypoint: the hearth stands a waypoint to brush', false, 'no waypoint in the hearth');
  }
}

// ====================================================== E: the traveller's flasks ==
const acct = claimedAccount();
{
  const FLASKS = ['life_flask', 'mana_flask'];
  const V = forgeVessel({ name: 'Wren', charId: 'c-seat-wren' });
  const virgin = !FLASKS.some(id => V.knownSkills.some(k => k.skillId === id)) && !V.ledger?.mireille_flasks_given;
  const E = await join('Wren', { accountId: acct.accountId, vessel: V });
  const s = seatOf(E.id);
  const rec = host.vessels.vesselOf(E.id);
  check('E flasks: a virgin traveller is dealt the welcome flasks, learned and seated (this world\'s innkeep answers only its keeper)',
    virgin && !!s && FLASKS.every(id => s.meta.knownSkills.has(id) && s.actor.skills.some(i => i?.def.id === id)));
  check('E flasks: its OWN ledger remembers the gift (and rides home)', rec?.upload.ledger?.mireille_flasks_given === 1 && rec?.upload.ledger?.[LEDGER_FLASK_LESSON] === 1);
  host.vessels.mirror(E.id);
  await waitMs(() => E.heard.some(m => m.t === 'heroSave'));
  const hs = E.heard.find(m => m.t === 'heroSave');
  check('E flasks: the mirror home carries the flasks and the stamp', hs?.t === 'heroSave'
    && FLASKS.every(id => hs.save.knownSkills.some(k => k.skillId === id)) && hs.save.ledger?.mireille_flasks_given === 1);
  const V2 = forgeVessel({ name: 'Tam', charId: 'c-seat-tam', ledger: { mireille_flasks_given: 1 } });
  const T2 = await join('Tam', { accountId: acct.accountId, vessel: V2 });
  const s2 = seatOf(T2.id);
  check('E flasks: a traveller whose own ledger says the gift was handed is dealt nothing (a traded flask is the build\'s choice)',
    !!s2 && !FLASKS.some(id => s2.meta.knownSkills.has(id)));
  E.c.leave(); T2.c.leave();
  await waitFor(() => !seatOf(E.id) && !seatOf(T2.id), 60);
}

// ========================================= F: THE GROUP LAW's reach, THE MERCY's census ==
{
  const radius = COOP_SCALING.shareRadius;
  COOP_SCALING.shareRadius = 300; // a reach the hearth can hold (the dial is the law's, not its number)
  try {
    const P = await join('Pax'), Q = await join('Quill'), R = await join('Rook'), T = await join('Tess');
    host.parties.invite(P.id, Q.id, w.time); host.parties.accept(Q.id, w.time);
    host.parties.invite(R.id, T.id, w.time); host.parties.accept(T.id, w.time);
    await runTicks(2);
    const p = seatOf(P.id)!, q = seatOf(Q.id)!, r = seatOf(R.id)!, t = seatOf(T.id)!;
    place(q, p.actor.pos.x + 700, p.actor.pos.y);
    place(t, r.actor.pos.x + 40, r.actor.pos.y);
    const falls0 = host.vessels.freshFalls;
    w.kill(p.actor);
    w.kill(r.actor);
    await runTicks(2);
    check('F group: a mate beyond the near radius never holds the down (the hero falls)',
      host.vessels.freshFalls === falls0 + 1 && p.actor.dead, `mate ${Math.round(dist(p.actor.pos, q.actor.pos))} px off`);
    check('F group: a mate within reach holds it (a DOWN, co-op\'s)', r.actor.downed && !r.actor.dead && !!seatOf(R.id));
    // THE MERCY's census: an Immortal downed beside a STRANGER rises on the keeper's clock.
    const I = await join('Ilse'), X = await join('Xan');
    const i = seatOf(I.id)!, x = seatOf(X.id)!;
    i.meta.modeId = 'immortal';
    place(x, i.actor.pos.x + 180, i.actor.pos.y); // inside the near radius, outside the revive ring
    w.kill(i.actor);
    await runTicks(2);
    const downed = i.actor.downed;
    await runTicks(sec(SHARD_CFG.keeper.reviveSec) + 20);
    check('F mercy: a stranger near never withholds THE MERCY (only a party mate could kneel)', downed && !i.actor.downed && !i.actor.dead,
      `stranger ${Math.round(dist(i.actor.pos, x.actor.pos))} px off`);
    // A body the covenant owns is never the mercy's (the bystanders go first: an idle
    // player in the revive ring would kneel, which is co-op's own law, not the mercy).
    for (const cl of [P, Q, R, T, I, X]) cl.c.leave();
    await waitFor(() => [P, Q, R, T, I, X].every(cl => !seatOf(cl.id)), sec(VESSEL_CFG.deathBeatSec) + 60);
    const fresh = VESSEL_CFG.freshHeroDies;
    VESSEL_CFG.freshHeroDies = false;
    const M = await join('Mott');
    const mm = seatOf(M.id)!;
    const nearest = Math.min(...w.seats.filter(o => o !== mm && !o.keeper).map(o => dist(o.actor.pos, mm.actor.pos)));
    w.kill(mm.actor);
    await runTicks(sec(SHARD_CFG.keeper.reviveSec * 1.3));
    check('F mercy: a mortal down (its stage ends the run) is never the mercy\'s to raise', mm.actor.downed && !mm.actor.dead,
      `nearest player ${Math.round(nearest)} px off`);
    VESSEL_CFG.freshHeroDies = fresh;
    await waitFor(() => !seatOf(M.id), sec(VESSEL_CFG.deathBeatSec) + 30);
    check('F mercy: the covenant takes it', !seatOf(M.id) && M.heard.some(m => m.t === 'runEnd'));
    M.c.leave();
  } finally { COOP_SCALING.shareRadius = radius; }
}

// ============================================================ G: the leave mid-fight ==
{
  const V = forgeVessel({ name: 'Gale', charId: 'c-seat-gale', ledger: { mireille_flasks_given: 1 } });
  const G = await join('Gale', { accountId: acct.accountId, vessel: V });
  let seq = 1;
  await runTicks(4, () => G.c.sendInput(G.id, input(G, [], 1, seq++))); // a willed step: the spawn grace ends
  const g = seatOf(G.id)!;
  g.actor.noteRecent('hurt'); // struck a moment ago
  const mirrors0 = host.vessels.vesselOf(G.id)?.mirrors ?? -1;
  G.c.leave(); // the word, then the close
  await waitFor(() => host.net.isDormant(G.id), 60);
  check('G fight: a leave mid-fight sleeps like a lost socket (dormant, standing, never the free trip home)',
    host.net.isDormant(G.id) && !!seatOf(G.id) && logs.some(l => l.includes(`${G.id} left mid-fight`)));
  check('G fight: and hears no farewell mirror', (host.vessels.vesselOf(G.id)?.mirrors ?? -2) === mirrors0);
  const H = await join('Hale');
  seq = 1;
  await runTicks(4, () => H.c.sendInput(H.id, input(H, [], 1, seq++)));
  H.c.leave();
  await waitFor(() => !seatOf(H.id), 60);
  check('G calm: a calm leave goes at once', !seatOf(H.id) && !host.net.isDormant(H.id));
  host.net.release(G.id);
  await waitFor(() => !seatOf(G.id), 30);
}

// ===================================================== H: the reckoning's own count ==
{
  const V = forgeVessel({ name: 'Hune', charId: 'c-seat-hune', ledger: { mireille_flasks_given: 1 } });
  const Hn = await join('Hune', { accountId: acct.accountId, vessel: V });
  const h = seatOf(Hn.id)!, other = seatOf(B.id)!;
  const kills0 = w.kills;
  const slay = (by: Seat, n: number): void => {
    for (let i = 0; i < n; i++) {
      const m = w.createMonster('zombie', 1, 'enemy');
      m.pos = vec(by.actor.pos.x + 40, by.actor.pos.y);
      w.actors.push(m);
      w.kill(m, false, by.actor);
    }
  };
  slay(h, 2); slay(other, 3);
  check('H tally: each credited kill lands on its own seat\'s tally', w.kills - kills0 === 5 && w.seatKills(h) === 2,
    `server ${w.kills - kills0}, the seat ${w.seatKills(h)}`);
  w.kill(h.actor);
  await waitFor(() => Hn.heard.some(m => m.t === 'corpse'), sec(VESSEL_CFG.deathBeatSec) + 30);
  const word = Hn.heard.find(m => m.t === 'corpse');
  check('H reckoning: the fall counts the seat\'s own kills and its places, never the server\'s',
    word?.t === 'corpse' && word.reckoning.kills === 2 && word.reckoning.zones === 1,
    word?.t === 'corpse' ? `kills ${word.reckoning.kills}, places ${word.reckoning.zones}` : 'no word');
}

// ============================================== I: THE BUILD STAMP, the refused hero ==
{
  const seats0 = w.seats.length;
  const rawJoin = async (build: string | undefined): Promise<Record<string, unknown>[]> => {
    const got: Record<string, unknown>[] = [];
    const raw = new WebSocket(url);
    let closed = false;
    raw.onmessage = e => { try { got.push(JSON.parse(String(e.data)) as Record<string, unknown>); } catch { /* not ours */ } };
    raw.onclose = () => { closed = true; };
    await new Promise<void>((res, rej) => { raw.onopen = () => res(); raw.onerror = () => rej(new Error('raw open failed')); });
    raw.send(JSON.stringify({ t: 'join', classId: 'warrior', name: 'Elder', ...(build !== undefined ? { build } : {}) }));
    await waitMs(() => closed || got.some(m => m.t === 'welcome'), 3000);
    if (!closed) { raw.close(); await waitMs(() => closed, 3000); }
    await runTicks(3);
    return got;
  };
  const other = await rawJoin('a0.r0.w0');
  const none = await rawJoin(undefined);
  const refusedWith = (got: Record<string, unknown>[]): boolean => got.length === 1 && got[0].t === 'refused' && got[0].word === SHARD_REFUSAL.build;
  check('I stamp: a join from another build hears one word at the door and is closed, no seat made', refusedWith(other) && w.seats.length === seats0, JSON.stringify(other));
  check('I stamp: so does a join with no stamp (an older client)', refusedWith(none) && w.seats.length === seats0);
  const honest = await rawJoin(shardBuildStamp());
  const welcome = honest.find(m => m.t === 'welcome');
  check('I stamp: an honest join is welcomed, and the welcome carries the shard\'s own build', welcome?.build === shardBuildStamp(), String(welcome?.build));
  await waitFor(() => w.seats.length === seats0, 60);
  const bad = forgeVessel({ name: 'Rue', charId: 'c-seat-rue' });
  bad.level = -3;
  const Rb = await join('Rue', { accountId: acct.accountId, vessel: bad });
  const word = Rb.heard.find(m => m.t === 'refused');
  check('I refused: a vessel the shard will not seat is never seated fresh: it goes back to Mu',
    word?.t === 'refused' && word.mu === true && !seatOf(Rb.id) && w.seats.length === seats0, word?.t === 'refused' ? word.word : 'no word');
  const twin = forgeVessel({ name: 'Ivo', charId: 'c-seat-ivo', ledger: { mireille_flasks_given: 1 } });
  const I1 = await join('Ivo', { accountId: acct.accountId, vessel: twin });
  const I2 = await join('Ivo', { accountId: acct.accountId, vessel: twin });
  const tw = I2.heard.find(m => m.t === 'refused');
  check('I refused: a twin of a walking vessel hears the door word (no Mu, no seat)',
    !!seatOf(I1.id) && tw?.t === 'refused' && !tw.mu && !seatOf(I2.id), tw?.t === 'refused' ? tw.word : 'no word');
  for (const cl of [Rb, I1, I2]) cl.c.leave();
  await waitFor(() => !seatOf(I1.id), 60);
}

// ============================================= J: notices and banners find their own ==
{
  const radius = COOP_SCALING.shareRadius;
  COOP_SCALING.shareRadius = 300;
  try {
    const N1 = await join('Nell'), N2 = await join('Nod'), N3 = await join('Nyx'), N4 = await join('Nim');
    host.parties.invite(N1.id, N2.id, w.time); host.parties.accept(N2.id, w.time);
    await runTicks(2);
    // The hearth's two far edges: the caster on one, the far mate and the far stranger on the other.
    const s1 = seatOf(N1.id)!, k = host.keeper.actor;
    place(s1, k.pos.x - 5000, k.pos.y);
    place(seatOf(N2.id)!, k.pos.x + 5000, k.pos.y - 40); // a mate, far
    place(seatOf(N3.id)!, k.pos.x + 5000, k.pos.y + 40); // a stranger, far
    place(seatOf(N4.id)!, s1.actor.pos.x + 60, s1.actor.pos.y); // a stranger, near
    const from = new Map([N1, N2, N3, N4].map(cl => [cl.id, cl.snaps.length]));
    w.actingSeat = s1;
    w.notice('probe: a party line', '#ffffff', 14, 'civic');
    w.notice('probe: world news', '#ffffff', 14, 'events');
    w.notice('probe: a world line by its mint', '#ffffff', 14, 'world', 'world');
    w.actingSeat = null;
    w.notice('probe: nobody acted', '#ffffff', 14, 'civic');
    N1.c.sendSession({ t: 'action', action: { t: 'refundPassive', nodeId: 'probe_nowhere' } }); // an own row beside the audience
    await runTicks(8);
    const lines = (cl: Client): Set<string> => new Set(cl.snaps.slice(from.get(cl.id)).flatMap(s => (s.no ?? []).map(n => n.text)));
    const L = [N1, N2, N3, N4].map(lines);
    check('J notice: an act\'s line reaches the acting seat\'s party alone (wherever the mate stands)',
      L[0].has('probe: a party line') && L[1].has('probe: a party line') && !L[2].has('probe: a party line') && !L[3].has('probe: a party line'));
    check('J notice: world events, a mint site\'s world scope and lines no seat caused reach every player',
      L.every(set => set.has('probe: world news') && set.has('probe: a world line by its mint') && set.has('probe: nobody acted')));
    check('J notice: no audience list ever ships', [N1, N2, N3, N4].every(cl => cl.snaps.slice(from.get(cl.id)).every(s => (s.no ?? []).every(n => !('to' in n)))));
    check('J own rows: with an audience on the wire, a seat\'s own rows still reach its own socket alone (THE OWN ENTRY)',
      N1.snaps.slice(from.get(N1.id)).some(s => !!s.seats[N1.id]?.fn)
      && [N1, N2, N3, N4].every(cl => cl.snaps.slice(from.get(cl.id)).every(s => Object.entries(s.seats).every(([id, row]) => id === cl.id || SEAT_OWN_ROWS.every(k => row[k] === undefined)))));
    const from2 = new Map([N1, N2, N3, N4].map(cl => [cl.id, cl.snaps.length]));
    w.eyecatch = { casterId: s1.actor.id, skillId: 'probe_art', style: 'flank', title: 'PROBE', tint: '#ffffff', side: 'ally', t0: w.timeflow.age, paneSec: 3 };
    await runTicks(8);
    w.eyecatch = null;
    const saw = (cl: Client): boolean => cl.snaps.slice(from2.get(cl.id)).some(s => s.ec?.ti === 'PROBE');
    check('J banner: the caster\'s party and the players near it see the eyecatch, a far stranger never',
      saw(N1) && saw(N2) && saw(N4) && !saw(N3),
      `${[N1, N2, N3, N4].map(saw).join(',')}; from the caster ${[N2, N3, N4].map(cl => Math.round(dist(seatOf(cl.id)!.actor.pos, s1.actor.pos))).join('/')} px`);
    check('J banner: its audience never ships', [N1, N2, N3, N4].every(cl => cl.snaps.slice(from2.get(cl.id)).every(s => !('ecTo' in s))));
    for (const cl of [N1, N2, N3, N4]) cl.c.leave();
    await waitFor(() => [N1, N2, N3, N4].every(cl => !seatOf(cl.id)), 60);
  } finally { COOP_SCALING.shareRadius = radius; }
}

// ================================================================ K: the horn's reach ==
{
  const s = seatOf(B.id)!;
  const zone = w.zone as { harborhold?: unknown };
  const hold = zone.harborhold;
  zone.harborhold = { state: 'besieged' }; // a stub hold: the intent's gate reads its presence and the horn
  const horn = { kind: 'muster_horn', pos: vec(s.actor.pos.x + 900, s.actor.pos.y), radius: 12, tier: 0 };
  (w.doodads as unknown as object[]).push(horn);
  let sounded = 0;
  (w as unknown as { beginHoldMuster(): void }).beginHoldMuster = () => { sounded++; };
  B.c.sendSession({ t: 'action', action: { t: 'holdMuster' } });
  await runTicks(4);
  const far = sounded;
  place(s, horn.pos.x, horn.pos.y);
  horn.pos.x = s.actor.pos.x; horn.pos.y = s.actor.pos.y;
  B.c.sendSession({ t: 'action', action: { t: 'holdMuster' } });
  await runTicks(4);
  check('K horn: the muster sounds only for a hand on the horn (never from across the hold)', far === 0 && sounded === 1, `far ${far}, at the horn ${sounded - far}`);
  delete (w as unknown as { beginHoldMuster?: unknown }).beginHoldMuster;
  (w.doodads as unknown as object[]).splice((w.doodads as unknown as object[]).indexOf(horn), 1);
  zone.harborhold = hold;
}

for (const cl of [A, B]) cl.c.leave();
await waitFor(() => w.seats.length === 1, sec(VESSEL_CFG.deathBeatSec) + 60);
await host.stop();
restoreRandom();
await new Promise(r => setTimeout(r, 600));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
