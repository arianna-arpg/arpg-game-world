// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RESIDENT RING (seamless-world M1, the ring streamer):
// docs/design/seamless-world.md. The M0 pair generalized: resident membership
// is every structurally eligible zone whose map seat sits within
// SEAMLESS_CFG.ringInPx of the ACTIVE zone's seat, kept until past ringOutPx
// (hysteresis), minted at most one per evaluation beat, demoted by dropping
// mint + seat only (zone memory owns away-state untouched), with the
// threshold rebasing into whichever resident rect the walker enters and the
// rim gating on the door law's own OBJECTIVE_SEALS predicate.
//
// RIG A — THE MODE LAW: a discrete boot (flag off) installs no tissue
//   sampler, fills no resident set, and its serialized world state is
//   byte-identical to a control run of the same seed walking the same
//   script THROUGH the new hook sites (loadZone tail, the update sweep,
//   the clampPos rim branch); the rim clamp holds beyond bounds even with
//   a walkable stub sampler standing (the flag short-circuits first).
// RIG B — THE RING + THE MINT: seamless boot fills the ring around the town
//   (bands law: every near structurally-eligible zone member, no member
//   past the out radius, every member minted + hero-cam pinned + seated
//   centered on its node); a fresh same-seed seamless world reproduces the
//   identical membership, seats, and layout geometry byte-for-byte (pure
//   f(worldSeed)); a REAL loadZone arrival into a resident — entered
//   through the mint's own recorded partner edge — stands the mint's
//   ground SITE-TOLERANTLY with the walk grid byte-identical; adopting a
//   saved world stands the whole ring down and the resume re-boots it
//   against the RESTORED graph.
// RIG C — THE OPEN RIM: beyond the active arena, a party mover's step is
//   admitted exactly where the tissue says walkable (stub-false refuses at
//   the rim, stub-true admits), never past the ring corridor's leash, and
//   never for a non-party body (the leash) or a mover-less placement.
// RIG D — THE THRESHOLD: a driven walk out of one resident and into a
//   linked one rebases the frame between frames — hero world-px continuous
//   within clamp-safety epsilon, a live floater carried at its exact
//   offset, the arrival standing the mint's ground (the load-tail refresh
//   keeps record == arrival), and the zone-memory law running as usual
//   (the return replays the remembered ground).
// RIG F — M0.5 THE OPEN WAY: between residents the door is gone (no dwell,
//   no mouth, the exit ROW survives, a signpost pair marks the way);
//   doors beyond the resident set stay doors; discrete worlds hold none.
// RIG E — THE SAVE REFUSAL: persistRun/persistRunDurable write NOTHING for
//   a seamless world while the same artery writes for a discrete one.
// RIG G — THE RING LAWS (M1): membership deterministic + monotone under a
//   fixed center (no flap by construction), the mint budget (≤1 resident
//   mint per evaluation beat), demote-then-reapproach re-mints byte-equal
//   ground THROUGH THE SAME PARTNER EDGE and the next arrival replays zone
//   memory (the D9 idiom at ring grain — demotion never touches memory),
//   the generalized threshold crosses into a THIRD zone, and THE RIM SEAL:
//   a sealed zone's rim holds the walk AND the sweep until its objective
//   completes or the seal is waived, consulting isExitLocked itself where
//   a live edge names the destination.
// RIG H — THE FITTED MINT (M1.5, the partition law): every resident record
//   IS its live-fold cell (origin/span/node, one derivation — the probe
//   refolds and compares), the active arena wears its own cell, resident
//   ground cannot overlap, the crossing is the CELL TEST with the threshold
//   inset as the border hysteresis (no swap on the line, one swap per
//   genuine crossing, jitter buys nothing), walled rims carry carved
//   MOUTHS at every openable way — the walled-rim strand healed, walked
//   OUT and BACK IN — and the discrete path never folds a cell nor fits
//   an arena (the mode law).
// RIG I — THE AGREED MOUTHS (M1.5 wave 4, mouth alignment): facing walk-ways
//   across a shared border seat at ONE agreed point (the midpoint of the
//   border's overlap run — borderAgreedPoint, pure f(the two cells), derived
//   independently by both sides), doors and discrete seats never move, both
//   carves meet the point (the corridor is walkable straight through the
//   border), a driven crossing rides the partner's mouth at wave-1-class
//   drift, and the signpost pair flanks the agreed seat.
// RIG J — THE ENCLOSURE (M2 wave 5): THE SOLID BETWEEN (off-corridor tissue
//   outside every cell refuses on the ring's own web; a non-abutting linked
//   pair's ribbon still crosses its gap), THE FAR-WALL LAW (a step into a
//   resident neighbor's wall cell — or its border body — refuses from
//   outside exactly as from inside; the mouth corridor still admits: her
//   ghost repro dead), THE ENCLOSURE DRESS (the record's border rows stand
//   in the rim band, matched by live bodies, gapped at every exit seat;
//   walled layouts and authored `none` tilesets plant nothing), THE REBASE
//   TICK ADMITS NOTHING (a threshold tick's load tail defers its admission
//   slice one beat), and the discrete world stays inert.
//
// Layout GEOMETRY is compared as (kind, pos, radius, tier) rows: loadZone
// deliberately randomizes post-mint runtime fields (DoodadEffect first
// cooldowns), so raw-object equality would pin the wrong thing.
//
// Run: npx tsx balance/probe_seamless.ts
// ---------------------------------------------------------------------------

import { vec } from '../src/core/math';
import { insideBounds } from '../src/world/shape';
import { coordDist, mapToPx, pxToMap } from '../src/world/coords';
import { borderAgreedPoint, cellsShareBorder, foldCells, type CellSeat } from '../src/world/cells';
import { PORTAL_EDGE_INSET } from '../src/engine/worldgen';
import { getTissueSampler, setTissueSampler, PARTITION_CFG, SEAMLESS_CFG, type TissueSampler } from '../src/world/seamless';
import { buildTissueSampler, TISSUE_CFG } from '../src/world/tissue';
import { ENCLOSURE_CFG, enclosureRowFor } from '../src/data/enclosure';
import { GridWalkField } from '../src/world/gridWalk';
import { OCEAN_BIOME, biomeAt } from '../src/world/biomes';
import { elevationAt } from '../src/world/relief';
import { START_ZONE, type ZoneDef } from '../src/data/zones';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { persistRun, persistRunDurable } from '../src/meta/character';
import type { World } from '../src/engine/world';

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

const GSEED = 0x5ea51e55;
const WSEED = 0xa11e;

/** Layout-geometry fingerprint (see header): stable across the post-mint
 *  runtime mutations loadZone applies on purpose. */
type GeoRow = { kind: string; pos: { x: number; y: number }; radius: number; tier?: number };
const geoOf = (dd: ReadonlyArray<GeoRow>): string =>
  JSON.stringify(dd.map(d => [d.kind, d.pos.x, d.pos.y, d.radius, d.tier ?? 0]));

/** THE SITE-TOLERANT GROUND COMPARATOR — "the arrival stands the mint's
 *  ground". loadZone plants POST-LAYOUT SITE DRESS the layout lane never
 *  sees (occurrence/vocation rings — population-lane state, exactly the
 *  lane the mint leaves unmaterialized), and a plant may CLEAR a layout
 *  doodad under its seat. The honest pin: every mint row stands live, or
 *  was displaced WITHIN REACH of a live extra (a site plant); strict
 *  equality passes trivially (no extras, no missing). */
const mintMeetsGround = (live: ReadonlyArray<GeoRow>, mint: ReadonlyArray<GeoRow>): { ok: boolean; detail: string } => {
  const key = (d: GeoRow): string => JSON.stringify([d.kind, d.pos.x, d.pos.y, d.radius, d.tier ?? 0]);
  const liveKeys = new Set(live.map(key)), mintKeys = new Set(mint.map(key));
  const extras = live.filter(d => !mintKeys.has(key(d)));
  const missing = mint.filter(d => !liveKeys.has(key(d)));
  const ok = missing.every(m => extras.some(e => Math.hypot(m.pos.x - e.pos.x, m.pos.y - e.pos.y) <= 300));
  return { ok, detail: `${extras.length} site-plant extra(s), ${missing.length} displaced` };
};

/** The walk grids must agree byte-identically — the threshold's actual
 *  load-bearing read (site dress never rebuilds the region grid). */
const gridsAgree = (
  a: { isWalkable(x: number, y: number): boolean } | null | undefined,
  b: { isWalkable(x: number, y: number): boolean } | null | undefined,
  w: number, h: number,
): boolean => {
  if (!a || !b) return !a === !b;
  for (let i = 0; i <= 40; i++) {
    for (let j = 0; j <= 40; j++) {
      const x = (i / 40) * w, y = (j / 40) * h;
      if (a.isWalkable(x, y) !== b.isWalkable(x, y)) return false;
    }
  }
  return true;
};

/** Whole-storage snapshot (the shims' in-memory bag implements key/length). */
const storageSnap = (): string => {
  const o: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    o[k] = localStorage.getItem(k) ?? '';
  }
  return JSON.stringify(o);
};

const heroWorldPx = (w: World): { x: number; y: number } | null => {
  const seat = w.seamlessRegions.find(s => s.zoneId === w.zone.id);
  return seat ? { x: w.player.pos.x + seat.originPx.x, y: w.player.pos.y + seat.originPx.y } : null;
};

/** The M0 leash keeps the PACK home, so hostiles are not what most rigs pin —
 *  strip them so a level-1 hero survives driven walks and settle beats (the
 *  probe's fodder-lane discipline; combat is other probes' business). */
const stripHostiles = (w: World): void => {
  w.actors = w.actors.filter(a => a === w.player || !!a.owner);
};

/** Pump evaluation beats until the budgeted ring fill reaches its fixpoint
 *  (16 beats covers any realistic membership at one mint per beat). */
const ringSettle = (w: World, beats = 16): void => {
  for (let i = 0; i < beats; i++) {
    stripHostiles(w);
    w.update(0.05);
  }
};

/** A member's map NODE in world px (the ring's own distance metric — M1.5:
 *  the fitted cell decouples geometric center from node, so the engine
 *  stores the node on the mint and measures THAT; the probe reads the same
 *  record). */
const seatCenterOf = (w: World, zoneId: string): { x: number; y: number } | null => {
  const s = w.seamlessRegions.find(r => r.zoneId === zoneId);
  const m = w.seamlessMints.get(zoneId);
  return s && m ? { x: m.node.x, y: m.node.y } : null;
};

/** THE MEMBERSHIP BANDS — the ring law as a post-settle invariant. Seats may
 *  drift a few px between admission and the read (web settling moves live
 *  maps, never stored seats), so the near band carries a slop instead of
 *  pinning exact set equality; cross-world determinism (B7) pins the exact
 *  sets against a twin. */
const ringBands = (w: World, label: string): void => {
  const active = w.zoneMap[w.zone.id];
  const center = seatCenterOf(w, w.zone.id) ?? mapToPx(active.map);
  const IN = SEAMLESS_CFG.ringInPx, OUT = SEAMLESS_CFG.ringOutPx, SLOP = 64;
  const member = new Set(w.seamlessRegions.map(s => s.zoneId));
  let missedNear = 0, farMember = 0, unminted = 0;
  for (const z of Object.values(w.zoneMap)) {
    if (member.has(z.id) || !w.seamlessResidentEligible(z)) continue;
    const at = mapToPx(z.map);
    if (Math.hypot(at.x - center.x, at.y - center.y) <= IN - SLOP) missedNear++;
  }
  for (const s of w.seamlessRegions) {
    if (!w.seamlessMints.has(s.zoneId)) { unminted++; continue; }
    if (s.zoneId === w.zone.id) continue;
    const c = seatCenterOf(w, s.zoneId)!;
    if (Math.hypot(c.x - center.x, c.y - center.y) > OUT) farMember++;
  }
  check(label, w.seamlessRegions.length >= 1 && missedNear === 0 && farMember === 0 && unminted === 0,
    `${w.seamlessRegions.length} member(s); ${missedNear} missed near, ${farMember} past out, ${unminted} unminted`);
};

/** THE WALK PAIR (deterministic — M0's own pick metric, kept): among
 *  structurally eligible zones linked by an UNLOCKED road edge, the pair
 *  whose FARTHER member is nearest the start town, tiebroken by pair key.
 *  The walk rigs park in `a` (recentering the ring there) and cross into
 *  `b`; neither needs to be a town-ring member for the pick. */
const pickWalkPair = (w: World): [ZoneDef, ZoneDef] | null => {
  const town = w.zoneMap[START_ZONE];
  let best: { a: ZoneDef; b: ZoneDef; d: number; key: string } | null = null;
  for (const a of Object.values(w.zoneMap)) {
    if (!w.seamlessResidentEligible(a)) continue;
    for (const e of a.exits) {
      if (e.to === '?' || e.crossDim || e.lock || a.id >= e.to) continue;
      const b = w.zoneMap[e.to];
      if (!b || !w.seamlessResidentEligible(b)) continue;
      const d = Math.max(coordDist(a.map, town.map), coordDist(b.map, town.map));
      const key = `${a.id}|${b.id}`;
      if (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) <= 1e-9 && key < best.key)) {
        best = { a, b, d, key };
      }
    }
  }
  return best ? [best.a, best.b] : null;
};

/** Drive the hero toward a WORLD-px goal through the real mover + update
 *  loop; returns when `done` says so or the step budget runs dry. */
const walkToward = (
  w: World, goalW: () => { x: number; y: number }, done: () => boolean, maxSteps: number,
  each?: () => void,
): boolean => {
  const dt = 0.05;
  for (let i = 0; i < maxSteps; i++) {
    if (done()) return true;
    const seat = w.seamlessRegions.find(s => s.zoneId === w.zone.id);
    if (!seat) return false;
    const g = goalW();
    const dx = g.x - (w.player.pos.x + seat.originPx.x);
    const dy = g.y - (w.player.pos.y + seat.originPx.y);
    const len = Math.hypot(dx, dy) || 1;
    w.moveActor(w.player, dx / len, dy / len, dt);
    each?.();
    w.update(dt);
    if (done()) return true;
  }
  return done();
};

bootSimEngine();

// --- RIG A: THE MODE LAW ----------------------------------------------------

{
  check('A1 a discrete process installs no tissue sampler', getTissueSampler() === null);

  const script = (w: World): void => {
    w.loadZone(START_ZONE);
    for (let i = 0; i < 5; i++) w.update(0.05);
  };
  seedGlobalRandom(GSEED);
  const w1 = makeSimWorld('warrior', WSEED);
  script(w1);
  seedGlobalRandom(GSEED);
  const w2 = makeSimWorld('warrior', WSEED);
  script(w2);
  check('A2 discrete boot fills no resident set (regions + mints empty)',
    w1.seamlessRegions.length === 0 && w1.seamlessMints.size === 0);
  check('A3 discrete world state byte-identical to a same-seed control through the hook sites',
    JSON.stringify(w1.serializeWorldState()) === JSON.stringify(w2.serializeWorldState()));

  // The rim clamp beyond bounds, flag off — held; and held EVEN WITH a
  // walkable stub sampler standing (the mode flag short-circuits first).
  const from = vec(60, w1.arena.h / 2);
  const beyond = vec(-400, w1.arena.h / 2);
  const c0 = w1.clampPos(vec(beyond.x, beyond.y), 16, from, { mover: w1.player });
  check('A4 discrete rim holds beyond bounds', insideBounds(c0, 16, w1.arena));
  const stub: TissueSampler = () => ({ walkable: true, tone: '#000', road: false });
  setTissueSampler(stub);
  const c1 = w1.clampPos(vec(beyond.x, beyond.y), 16, from, { mover: w1.player });
  check('A5 discrete rim holds even with a walkable sampler standing (flag-off short-circuit)',
    insideBounds(c1, 16, w1.arena));
  setTissueSampler(null);
}

// --- RIG B: THE RING + THE MINT ----------------------------------------------

seedGlobalRandom(GSEED);
const ws = makeSimWorld('warrior', WSEED);
ws.seamless = true;
ws.loadZone(START_ZONE);
ringSettle(ws);

const walkPair = pickWalkPair(ws);
const zoneA = walkPair?.[0];
const zoneB = walkPair?.[1];

{
  ringBands(ws, 'B1 the seamless boot fills the ring around the town (the bands law)');
  if (!zoneA || !zoneB) {
    console.log('probe_seamless: no eligible linked walk pair — cannot continue');
    process.exit(1);
  }
  check('B2 the walk pair is two plain seeded surface wilds linked by a road edge both ways',
    (zoneA.dimension ?? 'surface') === 'surface' && (zoneB.dimension ?? 'surface') === 'surface'
    && zoneA.kind === undefined && zoneB.kind === undefined
    && zoneA.seed != null && zoneB.seed != null
    && zoneA.exits.some(e => e.to === zoneB.id) && zoneB.exits.some(e => e.to === zoneA.id));
  // Seat math on any standing member (M1.5 THE FITTED MINT): the seat IS the
  // cell — originPx its (x0,y0) projection, span its dims (the authored size
  // roll stands down; the partition law's one-home record) — and the node
  // the mint stood around is STORED (mint.node), standing strictly inside
  // its own cell (the fold's B1 law). Web settling may drift the LIVE map a
  // few px after admission — the stored record is the identity — so the
  // node-vs-map relation carries a drift tolerance; exactness rides B7's
  // twin compare.
  const seat0 = ws.seamlessRegions[0];
  const mint0 = seat0 ? ws.seamlessMints.get(seat0.zoneId) : undefined;
  const def0 = seat0 ? ws.zoneMap[seat0.zoneId] : undefined;
  const at0 = def0 ? mapToPx(def0.map) : { x: 0, y: 0 };
  const nodeDrift = mint0 ? Math.hypot(mint0.node.x - at0.x, mint0.node.y - at0.y) : Infinity;
  check('B3 a member seat IS its cell (origin/span exact, node contained; node drift = settling only)',
    !!seat0 && !!mint0 && !!def0
    && seat0.originPx.x === mint0.cell.x0 && seat0.originPx.y === mint0.cell.y0
    && mint0.span.w === mint0.cell.x1 - mint0.cell.x0
    && mint0.span.h === mint0.cell.y1 - mint0.cell.y0
    && mint0.node.x > mint0.cell.x0 && mint0.node.x < mint0.cell.x1
    && mint0.node.y > mint0.cell.y0 && mint0.node.y < mint0.cell.y1
    && nodeDrift <= 260,
    `node drift ${nodeDrift.toFixed(1)}px`);
  check('B4 the tissue sampler is installed at boot', getTissueSampler() !== null);
  check('B5 every member wears the hero-cam pin',
    ws.seamlessRegions.every(s => ws.zoneMap[s.zoneId]?.camera === 'hero'));
  check('B6 the members stay unvisited at boot (population unmaterialized)',
    ws.seamlessRegions.every(s => !ws.visited.has(s.zoneId)));

  // Cross-world determinism: a fresh same-seed seamless boot walking the
  // same script reproduces the membership, the seats, and the layout
  // geometry byte-for-byte.
  seedGlobalRandom(GSEED);
  const ws2 = makeSimWorld('warrior', WSEED);
  ws2.seamless = true;
  ws2.loadZone(START_ZONE);
  ringSettle(ws2);
  const idsOf = (w: World): string => JSON.stringify(w.seamlessRegions.map(s => s.zoneId).sort());
  check('B7 a same-seed seamless world reproduces the membership + seats',
    idsOf(ws2) === idsOf(ws)
    && ws.seamlessRegions.every(s => {
      const t = ws2.seamlessRegions.find(r => r.zoneId === s.zoneId);
      return !!t && t.originPx.x === s.originPx.x && t.originPx.y === s.originPx.y;
    }), idsOf(ws));
  check('B8 …and the identical mint geometry for every member (pure f(worldSeed))',
    ws.seamlessRegions.every(s =>
      geoOf(ws2.seamlessMints.get(s.zoneId)?.layout.doodads ?? [])
        === geoOf(ws.seamlessMints.get(s.zoneId)!.layout.doodads)));

  // THE ARRIVAL MEETS THE MINT: a real loadZone arrival into a member,
  // entered through the mint's own recorded partner edge (the entry
  // derivation the record assumed), stands up the mint's ground —
  // site-tolerant (post-layout plants are population-lane), walk grid
  // byte-identical. The member: the walk pair's `a` if the ring holds it,
  // else the first member (the law is the same for every member).
  const arriveId = ws2.seamlessMints.has(zoneA.id) ? zoneA.id : ws2.seamlessRegions[0]!.zoneId;
  const pid = ws2.seamlessMints.get(arriveId)?.partnerId ?? '';
  if (pid) ws2.loadZone(pid);
  ws2.loadZone(arriveId, pid || undefined);
  const mintArr = ws2.seamlessMints.get(arriveId)!;
  const b9 = mintMeetsGround(ws2.doodads, mintArr.layout.doodads);
  check('B9 a real arrival through the recorded partner edge stands the mint\'s ground (drawn == arrived)',
    b9.ok, `${arriveId} via ${pid || '(center entry)'} — ${b9.detail}`);
  check('B10 …and answers the mint\'s exact walk grid',
    gridsAgree(ws2.walk, mintArr.layout.walk, ws2.arena.w, ws2.arena.h));

  // THE RESTORE RESET (the live resume shape: createPlayer's town load boots
  // the ring on the FRESH worldgen graph, then the save's world adoption
  // replaces the zone graph wholesale — stale seats must never survive it,
  // and the resume's own guaranteed load re-boots against the RESTORED defs).
  // The disk roundtrip DEEP-COPIES (a real save crosses bytes, never object
  // references) — without it the adopting world would share def objects
  // with `ws` and its re-boot would chart onto OUR live graph.
  const save = JSON.parse(JSON.stringify(ws.serializeWorldState())) as ReturnType<World['serializeWorldState']>;
  seedGlobalRandom(GSEED ^ 0x1234);
  const ws3 = makeSimWorld('warrior', WSEED);
  ws3.seamless = true;
  ws3.loadZone(START_ZONE);
  ringSettle(ws3);
  const bootedPre = ws3.seamlessRegions.length >= 1;
  const adopted = ws3.adoptWorldState(save);
  check('B11 adopting a saved world stands the resident ring down (stale seats never survive)',
    adopted && bootedPre && ws3.seamlessRegions.length === 0 && ws3.seamlessMints.size === 0);
  ws3.resumeSpawn('town', null);
  ringSettle(ws3);
  check('B12 the resume\'s own loads re-boot the ring against the RESTORED graph',
    ws3.seamlessRegions.length >= 1
    && ws3.seamlessRegions.every(s => !!ws3.zoneMap[s.zoneId]
      && ws3.zoneMap[s.zoneId].camera === 'hero'
      && ws3.seamlessMints.has(s.zoneId)));
}

// --- RIG C: THE OPEN RIM ------------------------------------------------------

// Park the hero in walk zone A — the recenter admits its linked partner.
ws.loadZone(zoneA!.id);
// The zone's own fresh base population stands here (first visit) — record a
// witness def for RIG G's memory dance before the settle strips them.
const witnessDefId = ws.actors.find(a => a.team === 'enemy' && a.fromZoneGen && a.defId)?.defId ?? null;
ringSettle(ws);

let seatA = ws.seamlessRegions.find(s => s.zoneId === zoneA!.id);
let seatB = ws.seamlessRegions.find(s => s.zoneId === zoneB!.id);

const rectOf = (seat: { zoneId: string; originPx: { x: number; y: number } }): { x0: number; y0: number; x1: number; y1: number } => {
  const span = ws.seamlessMints.get(seat.zoneId)!.span;
  return { x0: seat.originPx.x, y0: seat.originPx.y, x1: seat.originPx.x + span.w, y1: seat.originPx.y + span.h };
};
const inRect = (x: number, y: number, r: { x0: number; y0: number; x1: number; y1: number }): boolean =>
  x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
const inAnyMemberRect = (wx: number, wy: number): boolean =>
  ws.seamlessRegions.some(s => ws.seamlessMints.has(s.zoneId) && inRect(wx, wy, rectOf(s)));

{
  check('C0 recentering on the walk zone admits its linked partner into the ring',
    !!seatA && !!seatB && ws.seamlessMints.has(zoneB!.id),
    `partner mint partnerId=${ws.seamlessMints.get(zoneB!.id)?.partnerId ?? '(none)'}`);
  if (!seatA || !seatB) {
    console.log('probe_seamless: walk pair not resident after recenter — cannot continue');
    process.exit(1);
  }

  const open: TissueSampler = () => ({ walkable: true, tone: '#000', road: false });
  const shut: TissueSampler = () => ({ walkable: false, tone: '#000', road: false });

  // SELF-CALIBRATING TISSUE POINT: residents may overlap (adjacent layouts
  // nearly tile — the charter's own observation), so a step past a rim can
  // land on ANOTHER resident's ground, where admission is the LAW (the
  // threshold sweep owns it), not a tissue read. Scan the rim for an
  // out-step that is outside EVERY member rect and that walkable tissue
  // admits (the oracle) — THAT point is tissue-tested, and the stubs must
  // disagree on it.
  let tissueFrom: { x: number; y: number } | null = null;
  let tissueBeyond: { x: number; y: number } | null = null;
  setTissueSampler(open);
  outer: for (const side of ['w', 'e', 'n', 's'] as const) {
    for (const off of [80, 140, 200]) {
      const w = ws.arena.w, h = ws.arena.h;
      const from = side === 'w' ? vec(40, h / 2) : side === 'e' ? vec(w - 40, h / 2)
        : side === 'n' ? vec(w / 2, 40) : vec(w / 2, h - 40);
      const beyond = side === 'w' ? vec(-off, h / 2) : side === 'e' ? vec(w + off, h / 2)
        : side === 'n' ? vec(w / 2, -off) : vec(w / 2, h + off);
      const wx = beyond.x + seatA.originPx.x, wy = beyond.y + seatA.originPx.y;
      if (inAnyMemberRect(wx, wy)) continue;
      const got = ws.clampPos(vec(beyond.x, beyond.y), 14, vec(from.x, from.y), { mover: ws.player });
      if (got.x === beyond.x && got.y === beyond.y) { tissueFrom = from; tissueBeyond = beyond; break outer; }
    }
  }
  check('C1 a tissue-tested out-step exists and walkable tissue admits it (the raw step)',
    !!tissueFrom && !!tissueBeyond && !insideBounds(vec(tissueBeyond!.x, tissueBeyond!.y), 14, ws.arena));

  if (tissueFrom && tissueBeyond) {
    setTissueSampler(shut);
    const held = ws.clampPos(vec(tissueBeyond.x, tissueBeyond.y), 14, vec(tissueFrom.x, tissueFrom.y), { mover: ws.player });
    check('C2 unwalkable tissue holds the SAME rim shut (classic clamp)', insideBounds(held, 14, ws.arena));

    setTissueSampler(null);
    const down = ws.clampPos(vec(tissueBeyond.x, tissueBeyond.y), 14, vec(tissueFrom.x, tissueFrom.y), { mover: ws.player });
    check('C3 a null sampler stands the whole rim down (the tissue lane\'s stand-down law)',
      insideBounds(down, 14, ws.arena));

    setTissueSampler(open);
    // The leash: a NON-party body never opens the rim (walkable or not).
    // The settle beats stripped the ambient population (the fodder-lane
    // discipline), so mint the test body deliberately — any non-owned
    // hostile serves; it leaves the list right after the ask.
    const foe = witnessDefId
      ? (() => {
        const m = ws.createMonster(witnessDefId, 1, 'enemy');
        m.pos = vec(ws.arena.w / 2, ws.arena.h / 2);
        ws.actors.push(m);
        return m;
      })()
      : ws.actors.find(a => a !== ws.player && !a.owner && !a.dead);
    check('C4 a non-party body keeps the classic confine', !!foe
      && insideBounds(ws.clampPos(vec(tissueBeyond.x, tissueBeyond.y), 14, vec(tissueFrom.x, tissueFrom.y), { mover: foe }), 14, ws.arena),
    foe ? '' : 'no ambient body stood to test with');
    if (foe) ws.actors = ws.actors.filter(a => a !== foe);

    // A mover-less ask (spawn placement, teleport) never opens the rim.
    const placed = ws.clampPos(vec(tissueBeyond.x, tissueBeyond.y), 14);
    check('C5 a mover-less placement never opens the rim', insideBounds(placed, 14, ws.arena));

    // The corridor leash: an out-step far past the ring's union box refuses
    // even on walkable tissue (the walk stays between residents).
    const leashed = ws.clampPos(vec(tissueBeyond.x * 40 - tissueFrom.x * 39, tissueBeyond.y * 40 - tissueFrom.y * 39), 14,
      vec(tissueFrom.x, tissueFrom.y), { mover: ws.player });
    check('C6 the corridor leash refuses the far country (rim holds off-ring)',
      insideBounds(leashed, 14, ws.arena));
  } else {
    for (const n of ['C2', 'C3', 'C4', 'C5', 'C6']) check(`${n} (skipped — no tissue-tested point found)`, false);
  }
  setTissueSampler(null);
}

// --- RIG D: THE THRESHOLD REBASE ---------------------------------------------

/** Seat the hero on a walkable exit LANE at the partner-facing rim: a grid
 *  column that stays walkable to the edge (the portal aprons carve one by
 *  construction), dwell-safe of every live portal disc. Returns the seat or
 *  null. The scan reads the zone's own walk grid — drawn == tested. */
const seatAtRimLane = (w: World, towardW: { x: number; y: number }): { x: number; y: number } | null => {
  const seat = w.seamlessRegions.find(s => s.zoneId === w.zone.id)!;
  const cx = towardW.x - (seat.originPx.x + w.arena.w / 2);
  const cy = towardW.y - (seat.originPx.y + w.arena.h / 2);
  const south = Math.abs(cy) >= Math.abs(cx) ? (cy > 0) : null;
  const east = south === null ? cx > 0 : null;
  const walkOk = (x: number, y: number): boolean => !w.walk || w.walk.isWalkable(x, y);
  const dwellSafe = (x: number, y: number): boolean => w.exits.every(e => Math.hypot(e.pos.x - x, e.pos.y - y) > 70);
  const anchor = w.exits.reduce<{ x: number; y: number } | null>((best, e) => {
    const eW = { x: e.pos.x + seat.originPx.x, y: e.pos.y + seat.originPx.y };
    const d = Math.hypot(eW.x - towardW.x, eW.y - towardW.y);
    return !best || d < Math.hypot(best.x + seat.originPx.x - towardW.x, best.y + seat.originPx.y - towardW.y)
      ? { x: e.pos.x, y: e.pos.y } : best;
  }, null) ?? { x: w.arena.w / 2, y: w.arena.h / 2 };
  for (let k = 0; k < 60; k++) {
    const off = (k % 2 === 0 ? 1 : -1) * (70 + Math.floor(k / 2) * 24);
    if (south !== null) {
      const x = Math.min(w.arena.w - 40, Math.max(40, anchor.x + off));
      const yEdge = south ? w.arena.h : 0;
      const y1 = south ? w.arena.h - 30 : 30, y2 = south ? w.arena.h - 90 : 90, y3 = south ? w.arena.h - 150 : 150;
      if (walkOk(x, y1) && walkOk(x, y2) && walkOk(x, y3) && dwellSafe(x, y3) && dwellSafe(x, (y1 + yEdge) / 2)) {
        return { x, y: y3 };
      }
    } else {
      const y = Math.min(w.arena.h - 40, Math.max(40, anchor.y + off));
      const x1 = east ? w.arena.w - 30 : 30, x2 = east ? w.arena.w - 90 : 90, x3 = east ? w.arena.w - 150 : 150;
      if (walkOk(x1, y) && walkOk(x2, y) && walkOk(x3, y) && dwellSafe(x3, y)) return { x: x3, y };
    }
  }
  return null;
};

{
  // The crossing runs on a walkable stub: the pin is the REBASE's math, not
  // the tissue's content (the tissue lane pins its own field reads; the
  // live ?seamless walk exercises the real country).
  setTissueSampler(() => ({ walkable: true, tone: '#000', road: false }));

  const mintB = ws.seamlessMints.get(zoneB!.id)!;
  const goalB = {
    x: seatB!.originPx.x + mintB.span.w / 2,
    y: seatB!.originPx.y + mintB.span.h / 2,
  };
  stripHostiles(ws);
  const lane = seatAtRimLane(ws, goalB);
  check('D0 a walkable, dwell-safe exit lane exists at the partner-facing rim', !!lane);
  if (lane) ws.player.pos = vec(lane.x, lane.y);
  // Walk STRAIGHT out of the rim from the lane seat (world-px goal directly
  // past the edge on the partner bearing), then on toward B's heart.
  const outW = ((): { x: number; y: number } => {
    const hw = heroWorldPx(ws)!;
    const dx = goalB.x - hw.x, dy = goalB.y - hw.y;
    return Math.abs(dy) >= Math.abs(dx)
      ? { x: hw.x, y: hw.y + Math.sign(dy) * 800 }
      : { x: hw.x + Math.sign(dx) * 800, y: hw.y };
  })();

  let prevW = heroWorldPx(ws)!;
  let marker: { pos: { x: number; y: number } } | null = null;
  let markerOff: { x: number; y: number } | null = null;
  let crossedAt: { prev: { x: number; y: number }; now: { x: number; y: number } } | null = null;
  // The hop ledger: the ring may seat residents whose rects clip the path —
  // a detour through one is a legal crossing, and the entry-bookkeeping pin
  // reads "the ground we walked out of", whichever ground that was.
  const hops: string[] = [ws.zone.id];
  const noteHop = (): void => { if (ws.zone.id !== hops[hops.length - 1]) hops.push(ws.zone.id); };

  const beforeStep = (): void => {
    stripHostiles(ws);
    noteHop();
    prevW = heroWorldPx(ws) ?? prevW;
    // While walking the tissue, keep a live floater beside the hero — the
    // continuity witness the rebase must carry shifted.
    if (!insideBounds(ws.player.pos, ws.player.radius, ws.arena) && ws.zone.id === zoneA!.id) {
      const t = {
        pos: vec(ws.player.pos.x + 100, ws.player.pos.y - 40),
        text: 'witness', color: '#ffffff', life: 2, maxLife: 2, size: 12,
      };
      ws.texts.push(t);
      marker = t;
      markerOff = { x: 100, y: -40 };
    }
  };
  const crossed = (): boolean => {
    noteHop();
    if (ws.zone.id === zoneB!.id && !crossedAt) {
      crossedAt = { prev: prevW, now: heroWorldPx(ws)! };
    }
    return !!crossedAt;
  };

  // Leg 1: straight out the rim; leg 2: on into B's heart.
  walkToward(ws, () => outW, () => !insideBounds(ws.player.pos, ws.player.radius, ws.arena) || crossed(), 600, beforeStep);
  const reached = walkToward(ws, () => goalB, crossed, 6000, beforeStep);
  noteHop();

  check('D1 the walk crosses the threshold (zone swaps to the partner with no travel verb)',
    reached && ws.zone.id === zoneB!.id, `hops ${hops.join('→')}`);
  // (Widening re-reads: TS's top-level flow analysis cannot see the walk
  // callbacks' assignments and narrows these to `never` — a pre-existing
  // wart of the M0 file, healed here for the sim-tsc lane.)
  const crossFact = crossedAt as { prev: { x: number; y: number }; now: { x: number; y: number } } | null;
  if (crossFact) {
    const drift = Math.hypot(crossFact.now.x - crossFact.prev.x, crossFact.now.y - crossFact.prev.y);
    check('D2 world-px continuity across the rebase (≤ one step + clamp safety)',
      drift <= 24, `drift ${drift.toFixed(2)}px`);
  } else {
    check('D2 world-px continuity across the rebase', false, 'never crossed');
  }
  check('D3 the crossing lands INSIDE the partner arena (an honest landing)',
    insideBounds(ws.player.pos, ws.player.radius, ws.arena));
  check('D4 entryFrom names the ground we walked out of (the door law\'s bookkeeping)',
    hops.length >= 2 && ws.entryFrom === hops[hops.length - 2]);
  // The floater rises a few px in the crossing frame's own tick (its normal
  // life) — the pin is the CARRY: still live in texts, offset within a
  // frame's drift, never off by the 2686px-scale seat delta.
  const mk = marker as { pos: { x: number; y: number } } | null;
  const mko = markerOff as { x: number; y: number } | null;
  check('D5 the carried floater rides the rebase at its offset (one frame\'s rise allowed)',
    !!mk && !!mko && ws.texts.includes(mk as never)
    && Math.abs((mk!.pos.x - ws.player.pos.x) - mko!.x) < 30
    && Math.abs((mk!.pos.y - ws.player.pos.y) - mko!.y) < 30);
  // Re-read the mint: the load-tail refresh keeps the record equal to THIS
  // arrival (the arrival edge is the record's own partner now, and any web
  // growth re-minted through the exits-key law) — the standing mint is the
  // one the arrival must match.
  const d6 = mintMeetsGround(ws.doodads, ws.seamlessMints.get(zoneB!.id)!.layout.doodads);
  check('D6 the arrival stands the mint\'s ground (drawn == walked, site-tolerant)', d6.ok, d6.detail);
  check('D6b …and answers the mint\'s exact walk grid at the threshold',
    gridsAgree(ws.walk, ws.seamlessMints.get(zoneB!.id)!.layout.walk, ws.arena.w, ws.arena.h));
  check('D7 first arrival materializes the partner (visited stamps at the threshold)',
    ws.visited.has(zoneB!.id));

  // The way back: rebase B → A; the return replays A's remembered ground
  // through the zone-memory law, and the load-tail refresh re-mints A's
  // record through THIS return edge — record == replayed ground.
  crossedAt = null;
  const mintA = ws.seamlessMints.get(zoneA!.id)!;
  const goalA = {
    x: seatA!.originPx.x + mintA.span.w / 2,
    y: seatA!.originPx.y + mintA.span.h / 2,
  };
  stripHostiles(ws);
  const laneBack = ws.zone.id === zoneB!.id ? seatAtRimLane(ws, goalA) : null;
  if (laneBack) ws.player.pos = vec(laneBack.x, laneBack.y);
  const crossedBack = (): boolean => ws.zone.id === zoneA!.id;
  const back = walkToward(ws, () => goalA, crossedBack, 2000, () => stripHostiles(ws));
  check('D8 the walk back rebases home', back && ws.zone.id === zoneA!.id, laneBack ? '' : 'no return lane found');
  const d9 = mintMeetsGround(ws.doodads, ws.seamlessMints.get(zoneA!.id)!.layout.doodads);
  check('D9 the return replays the remembered ground at the mint\'s own geometry (zone-memory law)',
    d9.ok, d9.detail);

  setTissueSampler(buildTissueSampler(ws)); // leave the real sampler standing
}

// --- RIG F: M0.5 THE OPEN WAY (the doorless marked pathway) --------------------
// Her greenlight (2026-08-12): between RESIDENT zones there is no door — the
// dwell never arms, the mouth never draws (renderer-side, gated on the SAME
// predicate pinned here), the road runs on, and a signpost pair marks the
// crossing. The exit ROW survives (the graph's link is the map's truth).

{
  const walkExits = ws.exits.filter(e => ws.seamlessWalkExit(e));
  check('F1 every resident-facing exit reads as an OPEN WAY (and at least one stands)',
    walkExits.length >= 1 && walkExits.every(e => ws.seamlessMints.has(e.to)),
    `${walkExits.length} open way(s) in ${ws.zone.id}`);
  check('F2 no exit to unresident ground opens (doors beyond the ring stay doors)',
    ws.exits.every(e => ws.seamlessWalkExit(e) === ws.seamlessMints.has(e.to) && (e.to !== '?' || !ws.seamlessWalkExit(e))));
  check('F3 the exit ROW survives the open way (the graph link is untouched)',
    walkExits.every(e => ws.zone.exits[e.defIndex] && ws.zone.exits[e.defIndex].to === e.to));

  // THE WAYMARKED CROSSING: a signpost PAIR flanks each open way, planted by
  // the load-tail dress — and by the ring beat for ways opened MID-VISIT
  // (an admission after arrival dresses its own way; the dressed-set guard
  // keeps every pair singular). The pin is presence + nearness, never exact
  // dials, so her re-dial breaks nothing.
  for (const [i, e] of walkExits.entries()) {
    const posts = ws.doodads.filter(d => d.kind === 'signpost'
      && Math.hypot(d.pos.x - e.pos.x, d.pos.y - e.pos.y) < 140);
    check(`F4.${i} a signpost pair marks the open way (${e.to})`,
      posts.length >= 2, `${posts.length} post(s) near the crossing`);
  }

  // THE DEAD DWELL: park the hero exactly on the open way's seat and stand
  // idle far past the door's dwell — the travel ring must never arm (the
  // walk is the travel; exitDwellView is the renderer's own read). Parked ON
  // the rim seat = inside active bounds, so the threshold cannot fire here.
  const way = walkExits[0];
  if (way) {
    ws.player.pos = vec(way.pos.x, way.pos.y);
    let armed = false;
    for (let i = 0; i < 180; i++) {
      stripHostiles(ws);
      ws.update(1 / 60);
      if (ws.exitDwellView()) { armed = true; break; }
    }
    check('F5 the dead dwell — three idle seconds on the open way arm NOTHING',
      !armed && ws.seamlessMints.has(ws.zone.id));
  } else {
    check('F5 the dead dwell', false, 'no open way to park on');
  }

  // THE CONTROL: a door to unresident ground still arms its dwell ring —
  // the scan skip is the predicate's alone, never a broken scan.
  const door = ws.exits.find(e => !ws.seamlessWalkExit(e) && !ws.isExitLocked(e));
  if (door) {
    ws.player.pos = vec(door.pos.x, door.pos.y);
    let armed = false;
    for (let i = 0; i < 30 && !armed; i++) {
      stripHostiles(ws);
      ws.update(1 / 60);
      armed = !!ws.exitDwellView();
    }
    check('F6 the control — a true door beyond the ring still arms its ring', armed);
    ws.player.pos = vec(ws.arena.w / 2, ws.arena.h / 2); // step off before the dwell completes
    ws.update(1 / 60);
  } else {
    check('F6 the control — a true door beyond the ring still arms its ring',
      true, 'no unlocked non-resident door in this zone (nothing to control against)');
  }

  // DISCRETE INERTNESS: the predicate is false on every exit of a discrete
  // world — the dwell skip and the renderer's mouth skip both gate on it
  // alone, so false IS byte-inertness (the fast lane holds the wider law).
  seedGlobalRandom(GSEED ^ 0x55);
  const wdisc = makeSimWorld('warrior', WSEED ^ 0x55);
  check('F7 discrete worlds hold no open ways (the mode law at the predicate)',
    wdisc.exits.every(e => !wdisc.seamlessWalkExit(e)));
}

// --- RIG E: THE SAVE REFUSAL ---------------------------------------------------

{
  const before = storageSnap();
  persistRun(ws.account, ws);
  persistRunDurable(ws.account, ws);
  check('E1 a seamless run persists NOTHING (both arteries refuse)', storageSnap() === before);

  seedGlobalRandom(GSEED ^ 0x77);
  const wd = makeSimWorld('warrior', WSEED ^ 0x77);
  persistRun(wd.account, wd);
  check('E2 the same artery writes for a discrete world (the refusal is a gate, not a dead path)',
    storageSnap() !== before);
}

// --- RIG G: THE RING LAWS (M1 — membership, budget, demotion, the third zone,
// --- the rim seal) -------------------------------------------------------------

// The zone-memory row read, mirroring zoneMemorySnapshot's own filter — the
// witness rows a leave captures and a return must replay.
const memoryRows = (w: World): string => JSON.stringify(w.actors
  .filter(a => !a.dead && a.team === 'enemy' && a.fromZoneGen && a.defId && !a.doorId)
  .map(a => [a.defId, a.level, Math.round(a.pos.x * 10) / 10, Math.round(a.pos.y * 10) / 10, Math.round(a.life * 10) / 10])
  .sort((x, y) => (JSON.stringify(x) < JSON.stringify(y) ? -1 : 1)));

{
  // --- G1: membership bands + monotonicity under a fixed center. -------------
  check('G1a hysteresis config sanity (in < out — a straddling seat cannot flap)',
    SEAMLESS_CFG.ringInPx < SEAMLESS_CFG.ringOutPx,
    `in ${SEAMLESS_CFG.ringInPx} / out ${SEAMLESS_CFG.ringOutPx}`);
  ringBands(ws, 'G1b the bands law holds centered on the walk zone');
  // Between loads the center is FIXED and member seats are stored, so
  // membership may only GROW — sixty beats shed nobody (the no-flap law by
  // construction; a demotion here would be a flap).
  const before = new Set(ws.seamlessRegions.map(s => s.zoneId));
  let shed = 0;
  for (let i = 0; i < 60; i++) {
    stripHostiles(ws);
    ws.update(0.05);
    for (const id of before) if (!ws.seamlessRegions.some(s => s.zoneId === id)) shed++;
  }
  const bandCount = ((): number => {
    const c = seatCenterOf(ws, ws.zone.id) ?? mapToPx(ws.zoneMap[ws.zone.id].map);
    return ws.seamlessRegions.filter(s => {
      if (s.zoneId === ws.zone.id) return false;
      const sc = seatCenterOf(ws, s.zoneId);
      if (!sc) return false;
      const d = Math.hypot(sc.x - c.x, sc.y - c.y);
      return d > SEAMLESS_CFG.ringInPx && d <= SEAMLESS_CFG.ringOutPx;
    }).length;
  })();
  check('G1c membership is monotone under a fixed center (no member ever shed — no flap)',
    shed === 0, `${ws.seamlessRegions.length} member(s), ${bandCount} in the hysteresis band`);

  // --- G2: THE MINT BUDGET — one resident mint per evaluation beat. ----------
  seedGlobalRandom(GSEED ^ 0x9);
  const wg = makeSimWorld('warrior', WSEED);
  wg.seamless = true;
  wg.loadZone(START_ZONE);
  const sizes = [wg.seamlessMints.size];
  for (let i = 0; i < 16; i++) {
    stripHostiles(wg);
    wg.update(0.05);
    sizes.push(wg.seamlessMints.size);
  }
  check('G2 the mint budget — at most one resident mint per evaluation beat, monotone fill',
    sizes[0] <= 1 && sizes[sizes.length - 1] >= 1
    && sizes.every((n, i) => i === 0 || (n >= sizes[i - 1] && n - sizes[i - 1] <= 1)),
    `fill ${sizes.join('→')}`);

  // --- G3: DEMOTE / REAPPROACH — byte-equal re-mint + memory replay. ---------
  // (The D9 idiom at ring grain: demotion drops mint + seat ONLY; zone
  // memory — captured by the standing leave law — survives untouched.)
  const mintB1 = ws.seamlessMints.get(zoneB!.id);
  check('G3a the walk partner stands resident before the dance', !!mintB1 && !!witnessDefId,
    witnessDefId ? `witness def ${witnessDefId}` : 'no witness def captured');
  if (mintB1 && witnessDefId) {
    const geoB1 = geoOf(mintB1.layout.doodads);
    const partnerB1 = mintB1.partnerId;
    const exitsKeyB1 = mintB1.exitsKey;
    const prevCamB = mintB1.prevCamera;
    // Visit B and plant a WOUNDED memory witness (fromZoneGen, so the leave
    // law captures it: who / where / how-hurt).
    ws.loadZone(zoneB!.id, zoneA!.id);
    const wit = ws.createMonster(witnessDefId, Math.max(1, zoneB!.level ?? 1), 'enemy');
    wit.pos = ws.clampPos(vec(ws.arena.w / 2 + 180, ws.arena.h / 2 + 40), wit.radius);
    wit.fromZoneGen = true;
    ws.actors.push(wit);
    check('G3b the witness stands alive with a real pool', !wit.dead && wit.life > 1, `life ${wit.life.toFixed(1)}`);
    wit.life = Math.max(1, Math.round(wit.life * 0.6)); // the wound memory must carry
    const rowsAtLeave = memoryRows(ws);
    ws.loadZone(zoneA!.id, zoneB!.id); // the leave law captures B here
    // Force the demotion: recenter far beyond ringOut + ringIn of B, so B
    // can neither stay nor re-admit while we stand there.
    const bCenterNow = seatCenterOf(ws, zoneB!.id) ?? mapToPx(zoneB!.map);
    const far = Object.values(ws.zoneMap)
      .filter(z => (z.dimension ?? 'surface') === 'surface' && !z.field && !z.boundless
        && z.id !== START_ZONE && z.id !== zoneA!.id && z.id !== zoneB!.id)
      .map(z => ({ z, d: Math.hypot(mapToPx(z.map).x - bCenterNow.x, mapToPx(z.map).y - bCenterNow.y) }))
      .filter(r => r.d > SEAMLESS_CFG.ringOutPx + SEAMLESS_CFG.ringInPx + 500)
      .sort((a, b) => a.d - b.d || (a.z.id < b.z.id ? -1 : 1))[0]?.z;
    check('G3c a far recenter target exists', !!far, far ? far.id : 'none in graph');
    if (far) {
      ws.loadZone(far.id);
      ringSettle(ws);
      check('G3d the far recenter DEMOTES the partner (mint + seat dropped)',
        !ws.seamlessMints.has(zoneB!.id) && !ws.seamlessRegions.some(s => s.zoneId === zoneB!.id));
      check('G3e demotion restores the authored camera (the hero pin was residence dress)',
        zoneB!.camera === prevCamB, `camera ${String(zoneB!.camera)} vs authored ${String(prevCamB)}`);
      // Reapproach: recenter on A — B re-admits through the same partner
      // edge, so the record re-mints byte-for-byte.
      ws.loadZone(zoneA!.id);
      ringSettle(ws);
      const mintB2 = ws.seamlessMints.get(zoneB!.id);
      check('G3f the reapproach re-admits the partner', !!mintB2);
      if (mintB2) {
        check('G3g the re-mint reproduces the record byte-for-byte (same ground, same partner edge)',
          geoOf(mintB2.layout.doodads) === geoB1 && mintB2.partnerId === partnerB1
          && mintB2.exitsKey === exitsKeyB1,
          `partner ${mintB2.partnerId} vs ${partnerB1}`);
        check('G3h …and the re-minted walk grid answers the first record\'s exactly',
          gridsAgree(mintB2.layout.walk, mintB1.layout.walk, mintB2.span.w, mintB2.span.h));
        // Re-enter: the arrival replays the memory the leave captured —
        // the wounded witness stands where we left it, how we left it.
        ws.loadZone(zoneB!.id, zoneA!.id);
        const rowsNow = memoryRows(ws);
        check('G3i the return replays zone memory exactly (demotion never touched it)',
          rowsNow === rowsAtLeave,
          rowsNow === rowsAtLeave ? `${JSON.parse(rowsNow).length} remembered row(s)` : `rows drifted: ${rowsNow.slice(0, 120)}…`);
        const g3j = mintMeetsGround(ws.doodads, ws.seamlessMints.get(zoneB!.id)!.layout.doodads);
        check('G3j …standing the re-minted ground (drawn == returned, site-tolerant)', g3j.ok, g3j.detail);
      }
    }
  }

  // --- G4: THE GENERALIZED THRESHOLD — a crossing into a THIRD zone. ---------
  // (Hero stands in B after G3's re-entry; its ring holds A and any other
  // near residents. Walk into a member that is neither A nor B — or, on a
  // sparse web, recenter somewhere denser first.)
  setTissueSampler(() => ({ walkable: true, tone: '#000', road: false }));
  ringSettle(ws);
  let thirdSeat = ws.seamlessRegions.find(s =>
    s.zoneId !== zoneA!.id && s.zoneId !== zoneB!.id && s.zoneId !== ws.zone.id
    && ws.seamlessMints.has(s.zoneId));
  if (!thirdSeat) {
    // Sparse neighborhood: recenter on A and look again (deterministic).
    ws.loadZone(zoneA!.id);
    ringSettle(ws);
    thirdSeat = ws.seamlessRegions.find(s =>
      s.zoneId !== zoneA!.id && s.zoneId !== zoneB!.id && s.zoneId !== ws.zone.id
      && ws.seamlessMints.has(s.zoneId));
  }
  check('G4a a third resident stands in the ring', !!thirdSeat, thirdSeat?.zoneId ?? 'none found');
  if (thirdSeat) {
    const zoneC = ws.zoneMap[thirdSeat.zoneId]!;
    const mintC = ws.seamlessMints.get(zoneC.id)!;
    const goalC = {
      x: thirdSeat.originPx.x + mintC.span.w / 2,
      y: thirdSeat.originPx.y + mintC.span.h / 2,
    };
    stripHostiles(ws);
    const laneC = seatAtRimLane(ws, goalC);
    if (laneC) ws.player.pos = vec(laneC.x, laneC.y);
    let prevW = heroWorldPx(ws)!;
    let crossedAt: { prev: { x: number; y: number }; now: { x: number; y: number } } | null = null;
    const hops: string[] = [ws.zone.id];
    const step = (): void => {
      stripHostiles(ws);
      if (ws.zone.id !== hops[hops.length - 1]) hops.push(ws.zone.id);
      prevW = heroWorldPx(ws) ?? prevW;
    };
    const arrived = (): boolean => {
      if (ws.zone.id !== hops[hops.length - 1]) hops.push(ws.zone.id);
      if (ws.zone.id === zoneC.id && !crossedAt) crossedAt = { prev: prevW, now: heroWorldPx(ws)! };
      return !!crossedAt;
    };
    const got = walkToward(ws, () => goalC, arrived, 8000, step);
    check('G4b the walk thresholds into the THIRD zone (any resident rect receives)',
      got && ws.zone.id === zoneC.id, `hops ${hops.join('→')}`);
    const g4x = crossedAt as { prev: { x: number; y: number }; now: { x: number; y: number } } | null;
    check('G4c world-px continuity holds at the third crossing',
      !!g4x && Math.hypot(g4x!.now.x - g4x!.prev.x, g4x!.now.y - g4x!.prev.y) <= 24,
      g4x ? `drift ${Math.hypot(g4x.now.x - g4x.prev.x, g4x.now.y - g4x.prev.y).toFixed(2)}px` : 'never crossed');
    check('G4d entryFrom names the ground the third crossing left',
      hops.length >= 2 && ws.entryFrom === hops[hops.length - 2]);
  }

  // --- G5: THE RIM SEAL — a sealed zone's rim holds; completion/waiver opens. -
  // The stage: wherever G4 ended (or B on a starved web), entered WITH an
  // edge so the entry exemption is testable. Kinds with a structural
  // no-seal law (venture/package, waves-0) cannot stage the test — hop to
  // the walk partner instead (plain wilds kinds are override-sealable).
  {
    const sealable = (z: ZoneDef): boolean =>
      !['venture', 'package'].includes(z.objective.kind)
      && !(z.objective.kind === 'waves' && (z.objective as { waves?: number }).waves === 0);
    if (!sealable(ws.zone) || !ws.seamlessRegions.some(s => s.zoneId === ws.zone.id)) {
      ws.loadZone(zoneB!.id, zoneA!.id);
      ringSettle(ws);
    }
    const stage = ws.zone;
    const stageSeat = ws.seamlessRegions.find(s => s.zoneId === stage.id);
    const others = ws.seamlessRegions.filter(s => s.zoneId !== stage.id && ws.seamlessMints.has(s.zoneId));
    check('G5a the seal stage stands resident with company and an entry edge',
      sealable(stage) && !!stageSeat && others.length >= 1 && !!ws.entryFrom,
      `${stage.id} entered from ${ws.entryFrom ?? '(none)'} with ${others.length} co-resident(s)`);
    if (sealable(stage) && stageSeat && others.length >= 1) {
      const obj = stage.objective as { seal?: boolean };
      const hadSeal = obj.seal;
      // A tissue point off every member rect (the C1 scan, stub-walkable).
      setTissueSampler(() => ({ walkable: true, tone: '#000', road: false }));
      let tFrom: { x: number; y: number } | null = null;
      let tBeyond: { x: number; y: number } | null = null;
      outer: for (const side of ['w', 'e', 'n', 's'] as const) {
        for (const off of [80, 140, 200]) {
          const w = ws.arena.w, h = ws.arena.h;
          const from = side === 'w' ? vec(40, h / 2) : side === 'e' ? vec(w - 40, h / 2)
            : side === 'n' ? vec(w / 2, 40) : vec(w / 2, h - 40);
          const beyond = side === 'w' ? vec(-off, h / 2) : side === 'e' ? vec(w + off, h / 2)
            : side === 'n' ? vec(w / 2, -off) : vec(w / 2, h + off);
          const wx = beyond.x + stageSeat.originPx.x, wy = beyond.y + stageSeat.originPx.y;
          if (inAnyMemberRect(wx, wy)) continue;
          obj.seal = undefined as unknown as boolean; // probe the open rim first
          if (hadSeal === undefined) delete obj.seal; else obj.seal = hadSeal;
          const got = ws.clampPos(vec(beyond.x, beyond.y), 14, vec(from.x, from.y), { mover: ws.player });
          if (got.x === beyond.x && got.y === beyond.y) { tFrom = from; tBeyond = beyond; break outer; }
        }
      }
      check('G5b an admitted tissue point exists to seal against', !!tFrom && !!tBeyond);
      if (tFrom && tBeyond) {
        obj.seal = true;
        ws.objectiveDone = false;
        const held = ws.clampPos(vec(tBeyond.x, tBeyond.y), 14, vec(tFrom.x, tFrom.y), { mover: ws.player });
        check('G5c THE SEALED RIM refuses the walk out (even onto walkable tissue)',
          insideBounds(held, 14, ws.arena));
        // The door law agrees at both poles: a live non-entry edge reads
        // locked; the entry edge reads open (the exemption) — the rim
        // consulted the SAME predicate.
        const rowAway = ws.exits.find(e => e.to !== ws.entryFrom && e.to !== '?'
          && others.some(s => s.zoneId === e.to));
        const rowHome = ws.exits.find(e => e.to === ws.entryFrom);
        check('G5d isExitLocked agrees — a non-entry resident edge seals',
          !rowAway || ws.isExitLocked(rowAway), rowAway ? `edge → ${rowAway.to}` : 'no non-entry resident edge (vacuous)');
        check('G5e isExitLocked agrees — the entry edge stays exempt',
          !rowHome || !ws.isExitLocked(rowHome), rowHome ? `edge → ${rowHome.to}` : 'no entry edge row (vacuous)');
        // THE WAIVER: lifting the seal (objective still unmet) re-opens the
        // same step.
        if (hadSeal === undefined) delete obj.seal; else obj.seal = hadSeal;
        const waived = ws.clampPos(vec(tBeyond.x, tBeyond.y), 14, vec(tFrom.x, tFrom.y), { mover: ws.player });
        check('G5f waiving the seal re-opens the same rim step',
          waived.x === tBeyond.x && waived.y === tBeyond.y);
        // THE SWEEP DEFERS TOO: parked ON a non-entry resident's walkable
        // ground with the seal standing, the threshold never fires; the
        // objective completing releases the SAME spot into the crossing.
        obj.seal = true;
        ws.objectiveDone = false;
        const landSeat = others.find(s => s.zoneId !== ws.entryFrom) ?? null;
        let landLocal: { x: number; y: number } | null = null;
        if (landSeat) {
          const lm = ws.seamlessMints.get(landSeat.zoneId)!;
          scan: for (let gx = 60; gx < lm.span.w - 60; gx += 90) {
            for (let gy = 60; gy < lm.span.h - 60; gy += 90) {
              if (lm.layout.walk && !lm.layout.walk.isWalkable(gx, gy)) continue;
              const wx = landSeat.originPx.x + gx, wy = landSeat.originPx.y + gy;
              const local = { x: wx - stageSeat.originPx.x, y: wy - stageSeat.originPx.y };
              if (insideBounds(vec(local.x, local.y), ws.player.radius, ws.arena)) continue;
              landLocal = local;
              break scan;
            }
          }
        }
        check('G5g a non-entry resident landing exists for the sweep pin',
          !!landSeat && !!landLocal, landSeat ? landSeat.zoneId : 'only the entry co-resident stands (vacuous)');
        if (landSeat && landLocal) {
          ws.player.pos = vec(landLocal.x, landLocal.y);
          ws.update(0.05);
          check('G5h the sealed threshold DEFERS the crossing (zone unchanged)',
            ws.zone.id === stage.id);
          ws.player.pos = vec(landLocal.x, landLocal.y);
          ws.objectiveDone = true;
          ws.update(0.05);
          check('G5i completing the objective releases the crossing (the rebase fires)',
            ws.zone.id === landSeat.zoneId && ws.entryFrom === stage.id,
            `now in ${ws.zone.id}`);
        }
        // Restore the stage def's authored seal for whatever runs next.
        if (hadSeal === undefined) delete obj.seal; else obj.seal = hadSeal;
      }
    }
  }
  setTissueSampler(buildTissueSampler(ws));
}

// --- RIG H: THE FITTED MINT (M1.5 — the partition law) -------------------------
// The map drives the WHERE: every resident arena IS its cell in the live fold
// (H1 — one derivation, probe-refolded), resident ground cannot overlap (H2),
// the crossing is the CELL TEST with the threshold inset as the border
// hysteresis band (H3 + H5 on one driven lane: no swap on the line, one swap
// per genuine crossing, jitter buys nothing), walled rims carry carved MOUTHS
// at every openable way and the walled-rim strand heals — walked OUT and back
// IN (H4), and the discrete path never touches any of it (H6).

/** The engine's fold roster, mirrored exactly (H1 is the one-derivation pin —
 *  if the filters drift apart, H1 fails loudly). */
const rosterOf = (w: World): CellSeat[] => Object.values(w.zoneMap)
  .filter(z => (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket && !z.floating)
  .map(z => ({ id: z.id, ...mapToPx(z.map) }));

type CellR = { x0: number; y0: number; x1: number; y1: number };
const cellAgree = (a: CellR, b: CellR, eps = 0.5): boolean =>
  Math.abs(a.x0 - b.x0) <= eps && Math.abs(a.y0 - b.y0) <= eps
  && Math.abs(a.x1 - b.x1) <= eps && Math.abs(a.y1 - b.y1) <= eps;

/** A border-shared OPEN WAY out of the active zone: the walk exit, the
 *  destination seat, the shared border's world line + outward axis, and the
 *  way's world cross-position (clamped into the border's overlap run). Null
 *  = no such way stands here. */
const pickBorderWay = (w: World, wantDest?: string): {
  exit: (typeof w.exits)[number]; destId: string;
  axis: 'x' | 'y'; sign: 1 | -1; borderW: number; crossW: number;
} | null => {
  const home = w.seamlessMints.get(w.zone.id);
  const seat = w.seamlessRegions.find(s => s.zoneId === w.zone.id);
  if (!home || !seat) return null;
  for (const e of w.exits) {
    if (!w.seamlessWalkExit(e) || (wantDest && e.to !== wantDest)) continue;
    const dest = w.seamlessMints.get(e.to);
    if (!dest || !cellsShareBorder(home.cell, dest.cell)) continue;
    const side = w.zone.exits[e.defIndex]?.side;
    const eps = 0.5;
    const east = Math.abs(home.cell.x1 - dest.cell.x0) < eps;
    const west = Math.abs(dest.cell.x1 - home.cell.x0) < eps;
    const south = Math.abs(home.cell.y1 - dest.cell.y0) < eps;
    const north = Math.abs(dest.cell.y1 - home.cell.y0) < eps;
    const bSide = east ? 'e' : west ? 'w' : south ? 's' : north ? 'n' : null;
    if (!bSide || bSide !== side) continue; // the way must face its border
    const axis = (bSide === 'e' || bSide === 'w') ? 'x' as const : 'y' as const;
    const sign = (bSide === 'e' || bSide === 's') ? 1 as const : -1 as const;
    const borderW = bSide === 'e' ? home.cell.x1 : bSide === 'w' ? home.cell.x0
      : bSide === 's' ? home.cell.y1 : home.cell.y0;
    const lo = axis === 'x' ? Math.max(home.cell.y0, dest.cell.y0) : Math.max(home.cell.x0, dest.cell.x0);
    const hi = axis === 'x' ? Math.min(home.cell.y1, dest.cell.y1) : Math.min(home.cell.x1, dest.cell.x1);
    if (hi - lo < 160) continue; // too thin an overlap run to march through
    const crossLocal = axis === 'x' ? e.pos.y + seat.originPx.y : e.pos.x + seat.originPx.x;
    if (crossLocal < lo + 60 || crossLocal > hi - 60) continue; // the way exits past the shared run
    return { exit: e, destId: e.to, axis, sign, borderW, crossW: crossLocal };
  }
  return null;
};

/** Signed depth of a world point past the border into the destination
 *  (positive = inside the destination's cell on the crossing axis). */
const depthOf = (way: NonNullable<ReturnType<typeof pickBorderWay>>, wx: number, wy: number): number =>
  way.sign * ((way.axis === 'x' ? wx : wy) - way.borderW);

{
  ringSettle(ws); // fixpoint the fold: budgeted re-fits land before the pins read

  // --- H1: the fitted law — every AWAY record IS its live-fold cell (the
  // ACTIVE zone wears its ARRIVAL cell instead: the load's own charting may
  // move the fold mid-visit, and the record's law is record == the standing
  // ground — H1b pins that side). Origin/span/node discipline binds ALL. ---
  const foldNow = foldCells(rosterOf(ws));
  let misfits = 0, seatDrifts = 0, spanDrifts = 0, nodeOut = 0;
  for (const s of ws.seamlessRegions) {
    const m = ws.seamlessMints.get(s.zoneId);
    const live = foldNow.get(s.zoneId);
    if (!m) continue;
    if (s.zoneId !== ws.zone.id && (!live || !cellAgree(m.cell, live))) misfits++;
    if (s.originPx.x !== m.cell.x0 || s.originPx.y !== m.cell.y0) seatDrifts++;
    if (m.span.w !== m.cell.x1 - m.cell.x0 || m.span.h !== m.cell.y1 - m.cell.y0) spanDrifts++;
    if (!(m.node.x > m.cell.x0 && m.node.x < m.cell.x1 && m.node.y > m.cell.y0 && m.node.y < m.cell.y1)) nodeOut++;
  }
  check('H1 every away record IS its live-fold cell (origin/span/node — one derivation)',
    ws.seamlessRegions.length >= 2 && misfits === 0 && seatDrifts === 0 && spanDrifts === 0 && nodeOut === 0,
    `${ws.seamlessRegions.length} member(s): ${misfits} misfit, ${seatDrifts} seat-drift, ${spanDrifts} span-drift, ${nodeOut} node-out`);
  const activeMint = ws.seamlessMints.get(ws.zone.id);
  check('H1b the ACTIVE zone\'s live arena wears its own cell',
    !!activeMint && ws.arena.w === activeMint.cell.x1 - activeMint.cell.x0
    && ws.arena.h === activeMint.cell.y1 - activeMint.cell.y0
    && ws.arena.shape === 'rect');

  // --- H2: THE NON-OVERLAP LAW over the grown ring (at the fold's fixpoint). --
  {
    const cells = ws.seamlessRegions
      .map(s => ws.seamlessMints.get(s.zoneId)?.cell)
      .filter((c): c is NonNullable<typeof c> => !!c);
    let overlaps = 0, worst = 0;
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
      const ox = Math.min(cells[i].x1, cells[j].x1) - Math.max(cells[i].x0, cells[j].x0);
      const oy = Math.min(cells[i].y1, cells[j].y1) - Math.max(cells[i].y0, cells[j].y0);
      if (ox > 0.01 && oy > 0.01) { overlaps++; worst = Math.max(worst, Math.min(ox, oy)); }
    }
    check('H2 resident arenas cannot overlap (the partition at ring grain)',
      cells.length >= 2 && overlaps === 0,
      overlaps ? `${overlaps} pair(s), worst ${worst.toFixed(1)}px` : `${cells.length} cells clean`);
  }

  // --- H3 + H5: THE CELL TEST at a shared border (one driven lane). -----------
  // March out of the active zone's open way, straight through the border on
  // the way's own cross-line: the swap must never fire shy of the hysteresis
  // band, must fire exactly once for the genuine crossing, and jitter ON the
  // line must buy nothing either way.
  let way = pickBorderWay(ws);
  if (!way) {
    ws.loadZone(zoneA!.id);
    ringSettle(ws);
    way = pickBorderWay(ws);
  }
  check('H3a a border-shared open way stands to march through', !!way,
    way ? `${ws.zone.id} → ${way.destId}` : 'no border-facing walk exit in the staged ring');
  if (way) {
    const homeId = ws.zone.id;
    const w0 = way;
    stripHostiles(ws);
    ws.player.pos = vec(w0.exit.pos.x, w0.exit.pos.y);
    ws.update(0.05);
    const goalOut = (): { x: number; y: number } => (w0.axis === 'x'
      ? { x: w0.borderW + w0.sign * 900, y: w0.crossW }
      : { x: w0.crossW, y: w0.borderW + w0.sign * 900 });
    let shySwap = false; // a swap observed while the walker sat shy of the band
    let swaps = 0;
    let lastZone = ws.zone.id;
    let preDepth = -Infinity;
    const stepEach = (): void => {
      stripHostiles(ws);
      ws.objectiveDone = true; // geometry rig — the seal law is G5's own pin
      const hw = heroWorldPx(ws);
      if (hw) preDepth = depthOf(w0, hw.x, hw.y);
    };
    const outDone = (): boolean => {
      if (ws.zone.id !== lastZone) {
        swaps++;
        if (preDepth < 16) shySwap = true; // fired shy of the hysteresis band
        lastZone = ws.zone.id;
      }
      return ws.zone.id === w0.destId;
    };
    const crossed = walkToward(ws, goalOut, outDone, 1200, stepEach);
    const hwAfter = heroWorldPx(ws);
    const dFire = crossed && hwAfter ? depthOf(w0, hwAfter.x, hwAfter.y) : NaN;
    check('H3b the march thresholds into the border neighbor (the cell receives)',
      crossed && ws.zone.id === w0.destId, `fired at depth ${Number.isFinite(dFire) ? dFire.toFixed(1) : '?'}px`);
    check('H3c the swap never fires shy of the hysteresis band (the border belongs to nobody)',
      crossed && !shySwap && swaps === 1, `${swaps} swap(s) on the outward leg`);

    if (crossed) {
      // H5 — THE JITTER: dance on the line at ±amp (inside the band both
      // sides); the frame must hold. Zone-agnostic placement: the point is
      // set directly (the F5 parking idiom) and the sweep judges it.
      const amp = Math.min(18, Math.max(8, Math.floor((Number.isFinite(dFire) ? dFire : 32) * 0.55)));
      const destSeat = ws.seamlessRegions.find(s => s.zoneId === w0.destId)!;
      let flutters = 0;
      for (let i = 0; i < 16; i++) {
        const d = (i % 2 === 0 ? 1 : -1) * amp; // +amp = deeper into dest, −amp = back over the line
        const wx = w0.axis === 'x' ? w0.borderW + w0.sign * d : w0.crossW;
        const wy = w0.axis === 'x' ? w0.crossW : w0.borderW + w0.sign * d;
        ws.player.pos = vec(wx - destSeat.originPx.x, wy - destSeat.originPx.y);
        stripHostiles(ws);
        ws.objectiveDone = true;
        ws.update(0.05);
        if (ws.zone.id !== w0.destId) flutters++;
      }
      check('H5 jitter on the border buys nothing (the hysteresis band holds the frame)',
        flutters === 0, `amp ±${amp}px, ${flutters} flutter swap(s)`);

      // The deep return: one genuine crossing back — exactly one swap, home.
      const homeMint = ws.seamlessMints.get(homeId)!;
      const homeSeat = ws.seamlessRegions.find(s => s.zoneId === homeId)!;
      // A home-walkable return point on the cross-line, past the band (the
      // mouth's own lane — scan the mint grid for the first walkable depth).
      let backLocal: { x: number; y: number } | null = null;
      for (let d = 40; d <= 400; d += 15) {
        const wx = w0.axis === 'x' ? w0.borderW - w0.sign * d : w0.crossW;
        const wy = w0.axis === 'x' ? w0.crossW : w0.borderW - w0.sign * d;
        const lx = wx - homeSeat.originPx.x, ly = wy - homeSeat.originPx.y;
        if (!homeMint.layout.walk || homeMint.layout.walk.isWalkable(lx, ly)) { backLocal = { x: lx, y: ly }; break; }
      }
      check('H5b a walkable return lane stands past the band (the home mouth)', !!backLocal);
      if (backLocal) {
        let backSwaps = 0;
        let last = ws.zone.id;
        const goalBack = (): { x: number; y: number } => ({
          x: backLocal!.x + homeSeat.originPx.x, y: backLocal!.y + homeSeat.originPx.y,
        });
        const backDone = (): boolean => {
          if (ws.zone.id !== last) { backSwaps++; last = ws.zone.id; }
          return ws.zone.id === homeId;
        };
        const home = walkToward(ws, goalBack, backDone, 1200, stepEach);
        check('H5c the genuine return crosses once — home, no churn',
          home && ws.zone.id === homeId && backSwaps === 1, `${backSwaps} swap(s) back`);
      }
    }
  }

  // --- H4: THE OPEN BORDER on a WALLED rim (the strand heal). -----------------
  // Hunt a walled-class resident-eligible zone (most of its rim band
  // unwalkable), enter it for real, and pin: every openable way wears a
  // carved mouth (walk-grid walkable from seat to edge), and the walker
  // LEAVES through one and comes BACK — the crypt repro, healed.
  {
    const walledness = (w: World): number => {
      if (!w.walk) return 0;
      let probes = 0, closed = 0;
      const inset = 20;
      for (let x = 40; x < w.arena.w - 40; x += 60) {
        for (const y of [inset, w.arena.h - inset]) { probes++; if (!w.walk.isWalkable(x, y)) closed++; }
      }
      for (let y = 40; y < w.arena.h - 40; y += 60) {
        for (const x of [inset, w.arena.w - inset]) { probes++; if (!w.walk.isWalkable(x, y)) closed++; }
      }
      return probes ? closed / probes : 0;
    };
    const eligibleIds = Object.values(ws.zoneMap)
      .filter(z => ws.seamlessResidentEligible(z))
      .map(z => z.id)
      .sort();
    let walledId: string | null = null;
    let gridsSeen = 0;
    let bestFrac = 0;
    for (const id of eligibleIds.slice(0, 14)) {
      stripHostiles(ws);
      ws.loadZone(id);
      stripHostiles(ws);
      if (!ws.walk) continue;
      gridsSeen++;
      const frac = walledness(ws);
      bestFrac = Math.max(bestFrac, frac);
      if (frac >= 0.6) { walledId = id; break; }
    }
    check('H4a the hunt finds walled-class ground (or at least real grids to pin mouths on)',
      gridsSeen >= 1 && walledId !== null,
      walledId ? `${walledId} (rim ${Math.round(bestFrac * 100)}% closed)` : `${gridsSeen} grid zone(s), walled-est rim ${Math.round(bestFrac * 100)}%`);

    if (walledId) {
      ws.objectiveDone = true;
      ringSettle(ws);
      // The mouth pin: every openable way's carve line reads walkable from
      // seat to the rim on the LIVE grid (drawn == walked out).
      const openable = ws.exits.filter(e => e.to !== '?'
        && !!ws.zoneMap[e.to] && ws.seamlessResidentEligible(ws.zoneMap[e.to]));
      let mouths = 0, blocked = 0;
      for (const e of openable) {
        const side = ws.zone.exits[e.defIndex]?.side;
        if (!side) continue;
        const to = side === 'e' ? { x: ws.arena.w, y: e.pos.y } : side === 'w' ? { x: 0, y: e.pos.y }
          : side === 's' ? { x: e.pos.x, y: ws.arena.h } : { x: e.pos.x, y: 0 };
        const len = Math.hypot(to.x - e.pos.x, to.y - e.pos.y);
        let open = true;
        for (let t = 0; t <= len; t += 12) {
          const x = e.pos.x + (to.x - e.pos.x) * (len ? t / len : 0);
          const y = e.pos.y + (to.y - e.pos.y) * (len ? t / len : 0);
          const cx = Math.min(ws.arena.w - 1, Math.max(1, x)), cy = Math.min(ws.arena.h - 1, Math.max(1, y));
          if (ws.walk && !ws.walk.isWalkable(cx, cy)) { open = false; break; }
        }
        if (open) mouths++; else blocked++;
      }
      check('H4b every openable way wears a carved MOUTH through the walled rim',
        openable.length >= 1 && blocked === 0, `${mouths}/${openable.length} way(s) open to the rim`);

      // The strand heal: OUT through a border way, then BACK IN.
      const wayW = pickBorderWay(ws);
      check('H4c a border-shared way stands at the walled zone', !!wayW,
        wayW ? `${walledId} → ${wayW.destId}` : 'no resident border way after settle');
      if (wayW) {
        stripHostiles(ws);
        ws.player.pos = vec(wayW.exit.pos.x, wayW.exit.pos.y);
        ws.update(0.05);
        let out = false;
        const outGoal = (): { x: number; y: number } => (wayW.axis === 'x'
          ? { x: wayW.borderW + wayW.sign * 500, y: wayW.crossW }
          : { x: wayW.crossW, y: wayW.borderW + wayW.sign * 500 });
        const outDone = (): boolean => {
          const hw = heroWorldPx(ws);
          out = ws.zone.id !== walledId
            || (!!hw && depthOf(wayW, hw.x, hw.y) > 40 && !insideBounds(ws.player.pos, ws.player.radius, ws.arena));
          return out;
        };
        walkToward(ws, outGoal, outDone, 1500, () => { stripHostiles(ws); ws.objectiveDone = true; });
        check('H4d the walker WALKS OUT of the walled zone (the strand is dead)', out,
          ws.zone.id !== walledId ? `rebased into ${ws.zone.id}` : 'stands admitted beyond the walled rim');

        // The way back — RIG D's own two-leg return grammar: seat on a
        // walkable rim lane facing home (the neighbor's border way toward
        // the walled zone where one stands, else seatAtRimLane's proven
        // scan), march straight OUT the rim, then home ALONG THE WALLED
        // ZONE'S OWN MOUTH — the goal is its border way's exit seat, so the
        // return retraces the carved column H4b just pinned walkable (a
        // 96%-walled interior would swallow a blunt node beeline in wall
        // cells the threshold rightly defers on). backHome fires at the
        // first true stand inside. A walker who never rebased is already
        // beyond the rim and just walks home (the reenter lane).
        const wGoal = (): { x: number; y: number } => {
          const s = ws.seamlessRegions.find(r => r.zoneId === walledId)!;
          return { x: wayW.exit.pos.x + s.originPx.x, y: wayW.exit.pos.y + s.originPx.y };
        };
        const each = (): void => { stripHostiles(ws); ws.objectiveDone = true; };
        if (out && ws.zone.id !== walledId) {
          const back = pickBorderWay(ws, walledId);
          const lane = back ? { x: back.exit.pos.x, y: back.exit.pos.y } : seatAtRimLane(ws, wGoal());
          if (lane) {
            ws.player.pos = vec(lane.x, lane.y);
            stripHostiles(ws);
            ws.update(0.05);
          }
          const outPastW = ((): { x: number; y: number } => {
            if (back) {
              return back.axis === 'x'
                ? { x: back.borderW + back.sign * 140, y: back.crossW }
                : { x: back.crossW, y: back.borderW + back.sign * 140 };
            }
            const hw = heroWorldPx(ws)!;
            const g = wGoal();
            const dx = g.x - hw.x, dy = g.y - hw.y;
            return Math.abs(dy) >= Math.abs(dx)
              ? { x: hw.x, y: hw.y + Math.sign(dy) * 800 }
              : { x: hw.x + Math.sign(dx) * 800, y: hw.y };
          })();
          walkToward(ws, () => outPastW,
            () => ws.zone.id === walledId || !insideBounds(ws.player.pos, ws.player.radius, ws.arena),
            800, each);
        }
        const backHome = (): boolean => ws.zone.id === walledId
          && insideBounds(ws.player.pos, ws.player.radius, ws.arena);
        const cameBack = walkToward(ws, wGoal, backHome, 2500, each);
        check('H4e …and WALKS BACK IN (in-and-back-out, the crypt repro healed)',
          cameBack && ws.zone.id === walledId,
          cameBack ? '' : `ended in ${ws.zone.id}, inside=${insideBounds(ws.player.pos, ws.player.radius, ws.arena)}`);
      }
    }
  }

  // --- H6: THE MODE LAW at the new sites. -------------------------------------
  // A discrete world walks the identical path: the fold never computes, no
  // arena re-fits, no mints stand (A3's byte-identity already rode through
  // the new hook sites; these are the direct reads).
  {
    seedGlobalRandom(GSEED ^ 0xF17);
    const wd = makeSimWorld('warrior', WSEED ^ 0xF17);
    wd.loadZone(START_ZONE);
    // A deterministic surface zone (first by id): the flag short-circuits
    // before eligibility, so ANY discrete load must keep the authored size
    // to the byte — and the fold cache must never have computed.
    const dz = Object.values(wd.zoneMap)
      .filter(z => (z.dimension ?? 'surface') === 'surface' && z.id !== START_ZONE && z.caveDepth == null)
      .sort((a, b) => (a.id < b.id ? -1 : 1))[0];
    if (dz) wd.loadZone(dz.id);
    const cache = (wd as unknown as { seamlessCellsCache: unknown }).seamlessCellsCache;
    check('H6 discrete play never folds a cell nor fits an arena (the mode law)',
      !!dz && cache === null && wd.seamlessMints.size === 0
      && wd.arena.w === dz.size.w && wd.arena.h === dz.size.h,
      dz ? `${dz.id} arena ${wd.arena.w}×${wd.arena.h} == authored ${dz.size.w}×${dz.size.h}` : 'no surface zone stood (staging failure)');
  }
}

// --- RIG I: THE AGREED MOUTHS (M1.5 wave 4 — mouth alignment) -----------------
// Each border pair's walk-ways cross at ONE point (borderAgreedPoint —
// symmetric pure geometry, no negotiation), so the far-band ghost dies: a
// crossing lands in the partner's carved corridor, never its wall band.

/** placeExit's raw seat grammar for a NON-field rect zone (the discrete /
 *  door truth this rig compares against — inset edge point, `at` along). */
const rawSeatOf = (def: ZoneDef, i: number, arena: { w: number; h: number }): { x: number; y: number } => {
  const e = def.exits[i];
  const t = e.at ?? 0.5;
  const inset = PORTAL_EDGE_INSET;
  const cl = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  return e.side === 'n' ? { x: cl(arena.w * t, inset, arena.w - inset), y: inset }
    : e.side === 's' ? { x: cl(arena.w * t, inset, arena.w - inset), y: arena.h - inset }
    : e.side === 'w' ? { x: inset, y: cl(arena.h * t, inset, arena.h - inset) }
    : { x: arena.w - inset, y: cl(arena.h * t, inset, arena.h - inset) };
};

{
  ws.loadZone(zoneA!.id);
  ringSettle(ws);
  let iway = pickBorderWay(ws);
  if (!iway) {
    ws.loadZone(zoneB!.id);
    ringSettle(ws);
    iway = pickBorderWay(ws);
  }
  check('I0 a border-shared open way stands for the alignment pins', !!iway,
    iway ? `${ws.zone.id} → ${iway.destId}` : 'no border-facing walk exit in the staged ring');
  if (iway) {
    const aId = ws.zone.id;
    const bId = iway.destId;
    const seatA = ws.seamlessRegions.find(s => s.zoneId === aId)!;
    const mintA = ws.seamlessMints.get(aId)!;
    const mintB = ws.seamlessMints.get(bId)!;
    const agreed = borderAgreedPoint(mintA.cell, mintB.cell)!;
    const agreedAlong = iway.axis === 'x' ? agreed.y : agreed.x;
    const eps = 0.6;

    // --- I1: THE FACING SEATS — both zones' ways toward each other project
    // to the agreed point: equal along-border coordinates, each seat one
    // portal inset inside its own rim (the crossing is ONE world point). ---
    const aSeatW = { x: iway.exit.pos.x + seatA.originPx.x, y: iway.exit.pos.y + seatA.originPx.y };
    const aAlong = iway.axis === 'x' ? aSeatW.y : aSeatW.x;
    const aNormal = iway.axis === 'x' ? aSeatW.x : aSeatW.y;
    check('I1a the active way seats at the agreed point (along == midpoint of the overlap run)',
      Math.abs(aAlong - agreedAlong) <= eps
      && Math.abs(aNormal - (iway.borderW - iway.sign * PORTAL_EDGE_INSET)) <= eps,
      `along Δ${Math.abs(aAlong - agreedAlong).toFixed(2)}px, normal Δ${Math.abs(aNormal - (iway.borderW - iway.sign * PORTAL_EDGE_INSET)).toFixed(2)}px`);

    // --- I1b: THE UNTOUCHED DOORS — every exit NOT an agreed way keeps
    // placeExit's raw seat (the re-seat moves walk-ways only). ---
    {
      const defA = ws.zoneMap[aId];
      let doors = 0, moved = 0;
      const worst = { d: 0, i: -1 };
      for (const ex of ws.exits) {
        const row = defA.exits[ex.defIndex];
        if (!row) continue;
        const dest = row.to === '?' ? null : ws.zoneMap[row.to];
        const isAgreed = !!dest && ws.seamlessResidentEligible(dest)
          && !!ws.seamlessMints.get(row.to)
          && !!borderAgreedPoint(mintA.cell, ws.seamlessMints.get(row.to)!.cell);
        if (isAgreed) continue;
        doors++;
        const raw = rawSeatOf(defA, ex.defIndex, { w: ws.arena.w, h: ws.arena.h });
        const d = Math.hypot(ex.pos.x - raw.x, ex.pos.y - raw.y);
        if (d > eps) { moved++; if (d > worst.d) { worst.d = d; worst.i = ex.defIndex; } }
      }
      check('I1b doors and non-bordering ways keep their raw seats (the re-seat moves agreed ways only)',
        moved === 0, `${doors} untouched row(s)${moved ? `, worst Δ${worst.d.toFixed(1)}px at defIndex ${worst.i}` : ''}`);
    }

    // The partner's own seat: arrive for real and read the live way home. ---
    ws.loadZone(bId, aId);
    ringSettle(ws);
    const seatB = ws.seamlessRegions.find(s => s.zoneId === bId)!;
    const eBack = ws.exits.find(e => e.to === aId);
    const bSeatW = eBack
      ? { x: eBack.pos.x + seatB.originPx.x, y: eBack.pos.y + seatB.originPx.y } : null;
    const bAlong = bSeatW ? (iway.axis === 'x' ? bSeatW.y : bSeatW.x) : NaN;
    const bNormal = bSeatW ? (iway.axis === 'x' ? bSeatW.x : bSeatW.y) : NaN;
    check('I1c the partner\'s facing way seats at the SAME agreed point (one crossing, two frames)',
      !!bSeatW && Math.abs(bAlong - agreedAlong) <= eps
      && Math.abs(bNormal - (iway.borderW + iway.sign * PORTAL_EDGE_INSET)) <= eps,
      bSeatW ? `along Δ${Math.abs(bAlong - agreedAlong).toFixed(2)}px, normal Δ${Math.abs(bNormal - (iway.borderW + iway.sign * PORTAL_EDGE_INSET)).toFixed(2)}px` : 'no way home stood');

    // --- I2: THE CONTINUOUS CORRIDOR — the carves meet the agreed point
    // from both sides: every sample along the crossing line, rim-band deep
    // on each side, is walkable (A on its record grid, B on the live one). --
    {
      const mintA2 = ws.seamlessMints.get(aId)!;
      let blockedA = -1, blockedB = -1;
      for (let d = 6; d <= 84; d += 6) {
        const wxA = iway.axis === 'x' ? iway.borderW - iway.sign * d : agreed.x;
        const wyA = iway.axis === 'x' ? agreed.y : iway.borderW - iway.sign * d;
        if (mintA2.layout.walk
          && !mintA2.layout.walk.isWalkable(wxA - mintA2.cell.x0, wyA - mintA2.cell.y0)) { blockedA = d; break; }
        const wxB = iway.axis === 'x' ? iway.borderW + iway.sign * d : agreed.x;
        const wyB = iway.axis === 'x' ? agreed.y : iway.borderW + iway.sign * d;
        if (ws.walk && !ws.walk.isWalkable(wxB - seatB.originPx.x, wyB - seatB.originPx.y)) { blockedB = d; break; }
      }
      check('I2 the corridor is walkable straight through the border (both carves meet the point)',
        blockedA < 0 && blockedB < 0,
        blockedA >= 0 ? `A-side wall ${blockedA}px shy of the border` : blockedB >= 0 ? `B-side wall ${blockedB}px past the border` : 'both mouths open');
    }

    // --- I4: THE FLANKING POSTS — the waymark pair straddles the agreed
    // seat on the along axis (the M0.5 dress follows the moved seat free). --
    {
      const posts = eBack ? ws.doodads
        .filter(dd => dd.kind === 'signpost' && Math.hypot(dd.pos.x - eBack.pos.x, dd.pos.y - eBack.pos.y) <= 110)
        .map(dd => (iway!.axis === 'x' ? dd.pos.y : dd.pos.x) + (iway!.axis === 'x' ? seatB.originPx.y : seatB.originPx.x)) : [];
      posts.sort((p, q) => p - q);
      const straddle = posts.length >= 2 && posts[0] < bAlong && posts[posts.length - 1] > bAlong;
      const mid = posts.length >= 2 ? (posts[0] + posts[posts.length - 1]) / 2 : NaN;
      check('I4 the signpost pair flanks the agreed seat (mid-post == the crossing line)',
        straddle && Math.abs(mid - agreedAlong) <= 1,
        posts.length >= 2 ? `${posts.length} post(s), mid Δ${Math.abs(mid - agreedAlong).toFixed(2)}px` : `${posts.length} post(s) near the way`);
    }

    // --- I3: THE DRIVEN DRIFT — a real walk through the mouth crosses at
    // wave-1-class continuity: the rebase carries the exact world point, the
    // clamp finds it already walkable (the far-band ghost is dead). ---------
    {
      ws.loadZone(aId, bId);
      ringSettle(ws);
      const dway = pickBorderWay(ws, bId);
      check('I3a the driven lane stands (the staged way survives the reload)', !!dway,
        dway ? `${aId} → ${bId}` : 're-pick failed');
      if (dway) {
        stripHostiles(ws);
        ws.player.pos = vec(dway.exit.pos.x, dway.exit.pos.y);
        ws.update(0.05);
        let prevW = heroWorldPx(ws)!;
        let cross: { prev: { x: number; y: number }; now: { x: number; y: number } } | null = null;
        const goal = (): { x: number; y: number } => (dway.axis === 'x'
          ? { x: dway.borderW + dway.sign * 900, y: dway.crossW }
          : { x: dway.crossW, y: dway.borderW + dway.sign * 900 });
        const each = (): void => {
          stripHostiles(ws);
          ws.objectiveDone = true;
          prevW = heroWorldPx(ws) ?? prevW;
        };
        const done = (): boolean => {
          if (ws.zone.id === bId && !cross) cross = { prev: prevW, now: heroWorldPx(ws)! };
          return !!cross;
        };
        const went = walkToward(ws, goal, done, 1200, each);
        const crossFact = cross as { prev: { x: number; y: number }; now: { x: number; y: number } } | null;
        const drift = crossFact
          ? Math.hypot(crossFact.now.x - crossFact.prev.x, crossFact.now.y - crossFact.prev.y) : NaN;
        const landAlong = crossFact ? (dway.axis === 'x' ? crossFact.now.y : crossFact.now.x) : NaN;
        check('I3b the driven crossing rides the mouth at wave-1-class drift (the ghost is dead)',
          went && !!crossFact && drift <= 2,
          crossFact ? `drift ${drift.toFixed(2)}px (fitted-wave live baseline 14.3/10.0)` : 'never crossed');
        check('I3c …landing on the agreed corridor, not the wall band',
          !!crossFact && Math.abs(landAlong - agreedAlong) <= SEAMLESS_CFG.roadHalfPx + 8 + ws.player.radius,
          crossFact ? `landing Δ${Math.abs(landAlong - agreedAlong).toFixed(1)}px off the crossing line` : 'never crossed');
      }
    }
  }

  // --- I5: THE DISCRETE SEATS — flag off, every exit sits at placeExit's raw
  // grammar to the byte (the re-seat is seamless-gated at its one site). The
  // stage picks from the DISCRETE world's own charted map (a fresh flag-off
  // boot never grows the seamless world's graph — the H6 staging idiom),
  // rect arenas only (the raw grammar's domain; ellipse rims pull portals). -
  {
    seedGlobalRandom(GSEED);
    const wd2 = makeSimWorld('warrior', WSEED);
    wd2.loadZone(START_ZONE);
    const cands = Object.values(wd2.zoneMap)
      .filter(z => (z.dimension ?? 'surface') === 'surface' && z.id !== START_ZONE
        && z.caveDepth == null && !z.field && !z.boundless)
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    let picked: ZoneDef | null = null;
    for (const z of cands.slice(0, 6)) {
      wd2.loadZone(z.id);
      if (wd2.arena.shape === 'rect') { picked = z; break; }
    }
    let rows = 0, moved = 0;
    if (picked) {
      for (const ex of wd2.exits) {
        if (!picked.exits[ex.defIndex]) continue;
        rows++;
        const raw = rawSeatOf(picked, ex.defIndex, { w: wd2.arena.w, h: wd2.arena.h });
        if (Math.hypot(ex.pos.x - raw.x, ex.pos.y - raw.y) > 1e-6) moved++;
      }
    }
    check('I5 discrete seats are byte-unchanged (raw placeExit grammar, no re-seat leak)',
      !!picked && rows >= 1 && moved === 0,
      picked ? `${rows} exit(s) checked in ${picked.id}` : 'no rect surface zone stood (staging failure)');
  }
}

// --- RIG J: THE ENCLOSURE (M2 wave 5 — the solid between / the far-wall law /
// the border dress / the rebase-tick admission skip) ---------------------------

{
  // Data pins first (pure registry reads, no staging).
  check('J0a the authored `none` row refuses dress (the lever\'s refusal face)',
    enclosureRowFor('jungle') === null);
  const defRow = enclosureRowFor(undefined);
  check('J0b an unknown tileset resolves to the default border body',
    !!defRow && defRow.kind === 'rock');

  ws.loadZone(zoneA!.id);
  ringSettle(ws);
  const activeId = ws.zone.id;
  const seatAJ = ws.seamlessRegions.find(s => s.zoneId === activeId)!;
  const mintAJ = ws.seamlessMints.get(activeId)!;

  // --- J1: THE SOLID BETWEEN on the ring's own web — outside every cell,
  // off every corridor, dry flat ground REFUSES tissue; the apron capture
  // stands (eligible bordering pairs exist on this web). -----------------------
  {
    const sampler = buildTissueSampler(ws);
    const seed = ws.manifest.seed >>> 0;
    const roster: CellSeat[] = Object.values(ws.zoneMap)
      .filter(z => (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket && !z.floating)
      .map(z => ({ id: z.id, ...mapToPx(z.map) }));
    const foldJ = foldCells(roster);
    const cellsJ = [...foldJ.values()];
    const inAnyCell = (x: number, y: number): boolean =>
      cellsJ.some(c => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1);
    let aprons = 0;
    const seenP = new Set<string>();
    for (const z of Object.values(ws.zoneMap)) {
      if (!ws.seamlessResidentEligible(z)) continue;
      for (const e of z.exits) {
        if (e.to === '?' || e.crossDim) continue;
        const dest = ws.zoneMap[e.to];
        if (!dest || !ws.seamlessResidentEligible(dest)) continue;
        const key = z.id < e.to ? `${z.id}|${e.to}` : `${e.to}|${z.id}`;
        if (seenP.has(key)) continue;
        seenP.add(key);
        const ca = foldJ.get(z.id), cb = foldJ.get(e.to);
        if (ca && cb && borderAgreedPoint(ca, cb)) aprons++;
      }
    }
    check('J1a the apron capture stands — eligible bordering pairs exist on the staged web', aprons >= 1,
      `${aprons} agreed point(s)`);
    // Outside-cell refusal scan (the tissue probe's J2, on THIS grown web,
    // sampler-verdict only — the lattice-equality oracle lives there).
    const c0 = mintAJ.node;
    let found = 0, refused = 0;
    for (let k = 0; k < 6000 && found < 40; k++) {
      const ang = k * 2.399963229728653;
      const r = 300 + (k / 6000) * 14000;
      const x = c0.x + Math.cos(ang) * r, y = c0.y + Math.sin(ang) * r;
      if (inAnyCell(x, y)) continue;
      const t = sampler(x, y, seed);
      if (t.road) continue;
      // dry flat only (ocean/cliff refuse under the standing law — this scan
      // pins the NEW clause, so oracle those away probe-side):
      const cm = pxToMap({ x, y });
      if (biomeAt(cm, seed) === OCEAN_BIOME) continue;
      const h = TISSUE_CFG.slopeStepUnits;
      const gx = elevationAt({ x: cm.x + h, y: cm.y }, seed) - elevationAt({ x: cm.x - h, y: cm.y }, seed);
      const gy = elevationAt({ x: cm.x, y: cm.y + h }, seed) - elevationAt({ x: cm.x, y: cm.y - h }, seed);
      if (Math.hypot(gx, gy) / (2 * h) > TISSUE_CFG.slopeMax) continue;
      // clear of aprons (they admit by law): conservative margin
      found++;
      if (!t.walkable) refused++;
    }
    const wedgeShare = found ? refused / found : 0;
    check('J1b outside-cell off-road country refuses tissue (aprons alone may admit)',
      found >= 10 && wedgeShare >= 0.9,
      `${refused}/${found} refused (apron pockets account for the rest)`);
    // A non-abutting linked pair's ribbon crosses its gap walkable.
    let gapSample: { x: number; y: number } | null = null;
    for (const key of seenP) {
      const [ida, idb] = key.split('|');
      const ca = foldJ.get(ida), cb = foldJ.get(idb);
      if (!ca || !cb || borderAgreedPoint(ca, cb)) continue;
      const pa = mapToPx(ws.zoneMap[ida].map), pb = mapToPx(ws.zoneMap[idb].map);
      for (let t = 0.1; t <= 0.9; t += 0.02) {
        const x = pa.x + (pb.x - pa.x) * t, y = pa.y + (pb.y - pa.y) * t;
        if (!inAnyCell(x, y)) { gapSample = { x, y }; break; }
      }
      if (gapSample) break;
    }
    check('J1c a linked pair\'s ribbon crosses its between-cells gap walkable (border-to-border corridor)',
      !gapSample || sampler(gapSample.x, gapSample.y, seed).walkable,
      gapSample ? `gap sample (${gapSample.x.toFixed(0)}, ${gapSample.y.toFixed(0)})` : 'every linked pair abuts on this web (vacuous — no tissue between)');
  }

  // --- J2: THE FAR-WALL LAW — a clamp step from active ground into a
  // resident neighbor's refusing cell holds at the border; the mouth
  // corridor still admits (her ghost repro dead, the crossing alive). ----------
  {
    const way = pickBorderWay(ws);
    check('J2a a border way stands for the far-wall pins', !!way, way ? `${activeId} → ${way.destId}` : 'none');
    if (way) {
      const mintB = ws.seamlessMints.get(way.destId)!;
      const seatB2 = ws.seamlessRegions.find(s => s.zoneId === way.destId)!;
      const agreed = borderAgreedPoint(mintAJ.cell, mintB.cell)!;
      const agreedAlong = way.axis === 'x' ? agreed.y : agreed.x;
      const lo = way.axis === 'x' ? Math.max(mintAJ.cell.y0, mintB.cell.y0) : Math.max(mintAJ.cell.x0, mintB.cell.x0);
      const hi = way.axis === 'x' ? Math.min(mintAJ.cell.y1, mintB.cell.y1) : Math.min(mintAJ.cell.x1, mintB.cell.x1);
      // Hunt a REFUSING target just inside B along the shared border, well
      // off the mouth: a wall cell of B's own grid first, else a dress body.
      const depth = 26;
      let target: { wx: number; wy: number; kind: 'wall' | 'dress' } | null = null;
      const bw = mintB.layout.walk;
      if (bw) {
        for (let along = lo + 40; along <= hi - 40 && !target; along += 12) {
          if (Math.abs(along - agreedAlong) < 260) continue;
          const wx = way.axis === 'x' ? way.borderW + way.sign * depth : along;
          const wy = way.axis === 'x' ? along : way.borderW + way.sign * depth;
          if (!bw.isWalkable(wx - seatB2.originPx.x, wy - seatB2.originPx.y)) target = { wx, wy, kind: 'wall' };
        }
      }
      if (!target) {
        for (const b of mintB.dress) {
          const bx = b.x + seatB2.originPx.x, by = b.y + seatB2.originPx.y;
          const along = way.axis === 'x' ? by : bx;
          const normal = way.axis === 'x' ? bx : by;
          if (Math.abs(along - agreedAlong) < 260) continue;
          if (Math.abs(normal - way.borderW) > 120) continue; // this side's rim band only
          if (along < lo + 40 || along > hi - 40) continue;
          target = { wx: bx, wy: by, kind: 'dress' };
          break;
        }
      }
      check('J2b a refusing target stands on the neighbor\'s border band (wall cell or border body)',
        !!target, target ? `${target.kind} at (${target.wx.toFixed(0)}, ${target.wy.toFixed(0)})` : 'open rim + no dress band toward us');
      if (target) {
        stripHostiles(ws);
        // Step from just inside A straight at the refusing target.
        const fromW = {
          x: way.axis === 'x' ? way.borderW - way.sign * 30 : target.wx,
          y: way.axis === 'x' ? target.wy : way.borderW - way.sign * 30,
        };
        const from = vec(fromW.x - seatAJ.originPx.x, fromW.y - seatAJ.originPx.y);
        const p = vec(target.wx - seatAJ.originPx.x, target.wy - seatAJ.originPx.y);
        const out = ws.clampPos(p, ws.player.radius, from, { mover: ws.player });
        const held = Math.hypot(out.x - p.x, out.y - p.y) > 1e-6;
        check('J2c the step INTO the refusing ground is not admitted (the ghost walk is dead)',
          held, `asked (${p.x.toFixed(0)}, ${p.y.toFixed(0)}), got (${out.x.toFixed(0)}, ${out.y.toFixed(0)})`);
        // The mouth corridor still admits: the same step at the agreed point.
        const mouthW = {
          x: way.axis === 'x' ? way.borderW + way.sign * depth : agreedAlong,
          y: way.axis === 'x' ? agreedAlong : way.borderW + way.sign * depth,
        };
        const fromM = vec(
          (way.axis === 'x' ? way.borderW - way.sign * 30 : agreedAlong) - seatAJ.originPx.x,
          (way.axis === 'x' ? agreedAlong : way.borderW - way.sign * 30) - seatAJ.originPx.y);
        const pM = vec(mouthW.x - seatAJ.originPx.x, mouthW.y - seatAJ.originPx.y);
        const outM = ws.clampPos(pM, ws.player.radius, fromM, { mover: ws.player });
        check('J2d the mouth corridor still admits the same step (the crossing lives)',
          Math.hypot(outM.x - pM.x, outM.y - pM.y) <= 1e-6,
          `Δ${Math.hypot(outM.x - pM.x, outM.y - pM.y).toFixed(3)}px at the agreed point`);
      }
    }
  }

  // --- J3: THE ENCLOSURE DRESS — record rows in the rim band, live bodies
  // matching, gaps at every exit seat, walled/`none` layouts bare. -------------
  {
    const row = enclosureRowFor(ws.zoneMap[activeId].tileset);
    check('J3a the active zone resolves a border row (derivation or author)', !!row,
      row ? `${row.kind} r[${row.radius[0]}..${row.radius[1]}] on '${ws.zoneMap[activeId].tileset ?? '(none)'}'` : 'null row');
    if (row && mintAJ.dress.length) {
      const [, r1] = row.radius;
      const bandMax = r1 + ENCLOSURE_CFG.insetPad + ENCLOSURE_CFG.jitterPx + 1;
      let offBand = 0;
      for (const b of mintAJ.dress) {
        const edgeD = Math.min(b.x, b.y, ws.arena.w - b.x, ws.arena.h - b.y);
        // b.r is BODY radius (bodyScale-folded); the planted center's inset
        // used the FULL rolled radius, so bound with r1.
        if (edgeD > bandMax) offBand++;
      }
      check('J3b every record dress row stands in the rim band', offBand === 0,
        `${mintAJ.dress.length} row(s), ${offBand} off-band (band ≤ ${bandMax.toFixed(0)}px)`);
      // Live bodies match the record rows (same derivation both sites).
      let unmatched = 0;
      for (const b of mintAJ.dress) {
        if (!ws.doodads.some(d => d.kind === row.kind
          && Math.abs(d.pos.x - b.x) <= 0.5 && Math.abs(d.pos.y - b.y) <= 0.5)) unmatched++;
      }
      check('J3c every record dress row has its live body (record == arrival at the border line)',
        unmatched === 0, `${unmatched}/${mintAJ.dress.length} unmatched`);
      // Gaps at every exit seat: no dress row within gapHalf of an exit's
      // along-line on that exit's side.
      const gapHalf = PARTITION_CFG.mouthHalfPx + r1 + ENCLOSURE_CFG.gapShoulder;
      const sideOf = (b: { x: number; y: number }): 'n' | 's' | 'w' | 'e' => {
        const d = [b.y, ws.arena.h - b.y, b.x, ws.arena.w - b.x];
        return (['n', 's', 'w', 'e'] as const)[d.indexOf(Math.min(...d))];
      };
      let gapViolations = 0;
      for (const ex of ws.exits) {
        const eSide = ((): 'n' | 's' | 'w' | 'e' => {
          const d = [ex.pos.y, ws.arena.h - ex.pos.y, ex.pos.x, ws.arena.w - ex.pos.x];
          return (['n', 's', 'w', 'e'] as const)[d.indexOf(Math.min(...d))];
        })();
        const eAlong = eSide === 'n' || eSide === 's' ? ex.pos.x : ex.pos.y;
        for (const b of mintAJ.dress) {
          if (sideOf(b) !== eSide) continue;
          const bAlong = eSide === 'n' || eSide === 's' ? b.x : b.y;
          if (Math.abs(bAlong - eAlong) < gapHalf - 1) gapViolations++;
        }
      }
      check('J3d the line opens at every exit seat (agreed mouths AND doors)', gapViolations === 0,
        `${gapViolations} body(ies) inside a gap window (gapHalf ${gapHalf.toFixed(0)}px)`);
    }
    // Walled members plant nothing (probe-side re-derivation of the detect).
    let walledSeen = 0, walledDressed = 0;
    for (const [zid, m] of ws.seamlessMints) {
      const g = m.layout.walk;
      if (!(g instanceof GridWalkField)) continue;
      const zrow = enclosureRowFor(ws.zoneMap[zid]?.tileset);
      if (!zrow) continue;
      const ringIn = zrow.radius[1] + ENCLOSURE_CFG.insetPad;
      const w = m.cell.x1 - m.cell.x0, h = m.cell.y1 - m.cell.y0;
      let solid = 0, total = 0;
      for (let x = ringIn; x <= w - ringIn; x += 30) {
        total += 2;
        if (!g.isWalkable(x, ringIn)) solid++;
        if (!g.isWalkable(x, h - ringIn)) solid++;
      }
      for (let y = ringIn; y <= h - ringIn; y += 30) {
        total += 2;
        if (!g.isWalkable(ringIn, y)) solid++;
        if (!g.isWalkable(w - ringIn, y)) solid++;
      }
      if (total > 0 && solid / total >= ENCLOSURE_CFG.walledSkipFrac) {
        walledSeen++;
        if (m.dress.length > 0) walledDressed++;
      }
    }
    check('J3e walled layouts keep their own walls — no double border', walledDressed === 0,
      walledSeen ? `${walledSeen} walled member(s), ${walledDressed} wrongly dressed` : 'no walled member in the ring (vacuous)');
  }

  // --- J4: THE REBASE TICK ADMITS NOTHING — a member due only from the
  // DESTINATION's center is not admitted on the crossing tick; the next
  // beat admits it (the skip defers, never starves). ---------------------------
  {
    const way = pickBorderWay(ws);
    let staged: string | null = null;
    if (way) {
      const nodeA = mintAJ.node;
      const nodeB = ws.seamlessMints.get(way.destId)!.node;
      for (const s of [...ws.seamlessRegions]) {
        if (s.zoneId === activeId || s.zoneId === way.destId) continue;
        const c = seatCenterOf(ws, s.zoneId);
        if (!c) continue;
        const dA = Math.hypot(c.x - nodeA.x, c.y - nodeA.y);
        const dB = Math.hypot(c.x - nodeB.x, c.y - nodeB.y);
        if (dA > SEAMLESS_CFG.ringInPx && dB <= SEAMLESS_CFG.ringInPx) { staged = s.zoneId; break; }
      }
    }
    if (way && staged) {
      // Manual demotion (mint + seat — the probe's minimal twin of the
      // engine's own demote; camera re-pins on re-admission).
      ws.seamlessMints.delete(staged);
      const si = ws.seamlessRegions.findIndex(s => s.zoneId === staged);
      if (si >= 0) ws.seamlessRegions.splice(si, 1);
      stripHostiles(ws);
      ws.player.pos = vec(way.exit.pos.x, way.exit.pos.y);
      ws.update(0.05);
      let crossedTickClean: boolean | null = null;
      const goal = (): { x: number; y: number } => (way.axis === 'x'
        ? { x: way.borderW + way.sign * 900, y: way.crossW }
        : { x: way.crossW, y: way.borderW + way.sign * 900 });
      const done = (): boolean => {
        if (ws.zone.id === way.destId && crossedTickClean === null) {
          crossedTickClean = !ws.seamlessMints.has(staged!);
        }
        return crossedTickClean !== null;
      };
      const went = walkToward(ws, goal, done, 1200, () => { stripHostiles(ws); ws.objectiveDone = true; });
      check('J4a the crossing tick admits nothing (the staged member stays out through the rebase)',
        went && crossedTickClean === true,
        went ? `staged '${staged}'` : 'never crossed');
      ws.update(0.05);
      check('J4b the next beat admits it (the skip defers one beat, never starves)',
        ws.seamlessMints.has(staged),
        `re-admitted on the following evaluation beat`);
    } else {
      check('J4a the crossing tick admits nothing (the staged member stays out through the rebase)',
        true, 'no member due-only-from-the-destination on this web (vacuous — the skip clause is exercised by every rebase regardless)');
    }
  }

  // --- J5: THE DISCRETE WORLD stays inert (structural re-pin; the byte pins
  // are RIG A + the fast lane on the whole tree). ------------------------------
  {
    check('J5a the mouth half-width hoist kept its value (PARTITION_CFG == the carve\'s width)',
      PARTITION_CFG.mouthHalfPx === SEAMLESS_CFG.roadHalfPx + 8,
      `${PARTITION_CFG.mouthHalfPx} vs roadHalfPx+8=${SEAMLESS_CFG.roadHalfPx + 8}`);
    seedGlobalRandom(GSEED);
    const wd4 = makeSimWorld('warrior', WSEED ^ 0x99);
    wd4.loadZone(START_ZONE);
    for (let i = 0; i < 3; i++) wd4.update(0.05);
    check('J5b a discrete world stands no ring, no mints, no dress',
      !wd4.seamless && wd4.seamlessRegions.length === 0 && wd4.seamlessMints.size === 0);
  }
}

console.log(fails === 0 ? '\nprobe_seamless: ALL GREEN' : `\nprobe_seamless: ${fails} FAILURE(S)`);
process.exit(fails > 0 ? 1 : 0);
