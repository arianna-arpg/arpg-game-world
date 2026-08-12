// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RESIDENT PAIR (seamless-world M0, the tissue walk's
// placement lane): docs/design/seamless-world.md. Two adjacent wilds minted
// resident at their map seats, the rim opened to the connective tissue, and
// THE REBASE AT THE THRESHOLD — zone swap with no loadZone feel.
//
// RIG A — THE MODE LAW: a discrete boot (flag off) installs no tissue
//   sampler, fills no resident set, and its serialized world state is
//   byte-identical to a control run of the same seed walking the same
//   script THROUGH the new hook sites (loadZone tail, the update sweep,
//   the clampPos rim branch); the rim clamp holds beyond bounds even with
//   a walkable stub sampler standing (the flag short-circuits first).
// RIG B — THE PAIR + THE MINT: seamless boot picks two adjacent, unlocked,
//   plain unvisited surface wilds (both seeded defs), seats them centered
//   on mapToPx(def.map), installs the sampler, pins the hero camera; a
//   fresh same-seed seamless world reproduces the identical pick, seats,
//   and layout geometry byte-for-byte (pure f(worldSeed)); a REAL loadZone
//   arrival into a resident (entered through the partner's door — the
//   mint's own entry derivation) stands the mint's ground SITE-TOLERANTLY
//   (loadZone's post-layout site plants — occurrence/vocation dress — are
//   population-lane, exactly the lane M0 leaves unmaterialized in the
//   mint) with the walk grid byte-identical.
// RIG C — THE OPEN RIM: beyond the active arena, a party mover's step is
//   admitted exactly where the tissue says walkable (stub-false refuses at
//   the rim, stub-true admits), never past the pair corridor's leash, and
//   never for a non-party body (the M0 leash) or a mover-less placement.
// RIG D — THE THRESHOLD: a driven walk out of one resident and into the
//   other rebases the frame between frames — hero world-px continuous
//   within clamp-safety epsilon, a live floater carried at its exact
//   offset, the arrival's live layout geometry == the boot mint (both
//   directions), and the zone-memory law running as usual (the return
//   replays the remembered ground).
// RIG E — THE SAVE REFUSAL: persistRun/persistRunDurable write NOTHING for
//   a seamless world (one console note), while the same artery writes for
//   a discrete world (the refusal is a gate, not a dead path).
//
// Layout GEOMETRY is compared as (kind, pos, radius, tier) rows: loadZone
// deliberately randomizes post-mint runtime fields (DoodadEffect first
// cooldowns), so raw-object equality would pin the wrong thing.
//
// Run: npx tsx balance/probe_seamless.ts
// ---------------------------------------------------------------------------

import { vec } from '../src/core/math';
import { insideBounds } from '../src/world/shape';
import { mapToPx } from '../src/world/coords';
import { getTissueSampler, setTissueSampler, type TissueSampler } from '../src/world/seamless';
import { buildTissueSampler } from '../src/world/tissue';
import { START_ZONE } from '../src/data/zones';
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
 *  lane M0 leaves unmaterialized in the mint), and a plant may CLEAR a
 *  layout doodad under its seat. The honest pin: every mint row stands
 *  live, or was displaced WITHIN REACH of a live extra (a site plant);
 *  strict equality passes trivially (no extras, no missing). */
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

// --- RIG B: THE PAIR + THE MINT ----------------------------------------------

seedGlobalRandom(GSEED);
const ws = makeSimWorld('warrior', WSEED);
ws.seamless = true;
ws.loadZone(START_ZONE);

const [seatA, seatB] = ws.seamlessRegions;
const zoneA = seatA ? ws.zoneMap[seatA.zoneId] : undefined;
const zoneB = seatB ? ws.zoneMap[seatB.zoneId] : undefined;

{
  check('B1 seamless boot stands the resident pair up', ws.seamlessRegions.length === 2
    && !!zoneA && !!zoneB && ws.seamlessMints.size === 2);
  if (!zoneA || !zoneB || !seatA || !seatB) {
    console.log('probe_seamless: pair missing — cannot continue');
    process.exit(1);
  }
  check('B2 both residents are plain seeded surface wilds linked by a road edge both ways',
    (zoneA.dimension ?? 'surface') === 'surface' && (zoneB.dimension ?? 'surface') === 'surface'
    && zoneA.kind === undefined && zoneB.kind === undefined
    && zoneA.seed != null && zoneB.seed != null
    && zoneA.exits.some(e => e.to === zoneB.id) && zoneB.exits.some(e => e.to === zoneA.id));
  const spanA = ws.seamlessMints.get(zoneA.id)!.span;
  const atA = mapToPx(zoneA.map);
  check('B3 the seat centers the layout on its node (originPx = mapToPx − span/2)',
    seatA.originPx.x === atA.x - spanA.w / 2 && seatA.originPx.y === atA.y - spanA.h / 2
    && spanA.w === zoneA.size.w && spanA.h === zoneA.size.h);
  check('B4 the tissue sampler is installed at boot', getTissueSampler() !== null);
  check('B5 the M0 camera cut pins the pair to the hero-locked frame',
    zoneA.camera === 'hero' && zoneB.camera === 'hero');
  check('B6 the residents stay unvisited at boot (population unmaterialized — the M0 cut)',
    !ws.visited.has(zoneA.id) && !ws.visited.has(zoneB.id));

  // Cross-world determinism: a fresh same-seed seamless boot reproduces the
  // pick, the seats, and the layout geometry byte-for-byte.
  seedGlobalRandom(GSEED);
  const ws2 = makeSimWorld('warrior', WSEED);
  ws2.seamless = true;
  ws2.loadZone(START_ZONE);
  const s2a = ws2.seamlessRegions.find(s => s.zoneId === zoneA.id);
  check('B7 a same-seed seamless world reproduces the pick + seats',
    ws2.seamlessRegions.length === 2 && !!s2a
    && ws2.seamlessRegions.some(s => s.zoneId === zoneB.id)
    && s2a!.originPx.x === seatA.originPx.x && s2a!.originPx.y === seatA.originPx.y);
  check('B8 …and the identical mint geometry (pure f(worldSeed))',
    geoOf(ws2.seamlessMints.get(zoneA.id)!.layout.doodads)
      === geoOf(ws.seamlessMints.get(zoneA.id)!.layout.doodads)
    && geoOf(ws2.seamlessMints.get(zoneB.id)!.layout.doodads)
      === geoOf(ws.seamlessMints.get(zoneB.id)!.layout.doodads));

  // THE ARRIVAL MEETS THE MINT: a real loadZone arrival into A, entered
  // through the partner's door (the boot mint's own entry derivation),
  // stands up the mint's ground — site-tolerant (post-layout plants are
  // population-lane), walk grid byte-identical.
  ws2.loadZone(zoneB.id);
  ws2.loadZone(zoneA.id, zoneB.id);
  const b9 = mintMeetsGround(ws2.doodads, ws2.seamlessMints.get(zoneA.id)!.layout.doodads);
  check('B9 a real arrival through the partner door stands the boot mint\'s ground (drawn == arrived)',
    b9.ok, b9.detail);
  check('B10 …and answers the boot mint\'s exact walk grid',
    gridsAgree(ws2.walk, ws2.seamlessMints.get(zoneA.id)!.layout.walk, ws2.arena.w, ws2.arena.h));

  // THE RESTORE RESET (the live resume shape: createPlayer's town load boots
  // the pair on the FRESH worldgen graph, then the save's world adoption
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
  const bootedPre = ws3.seamlessRegions.length === 2;
  const adopted = ws3.adoptWorldState(save);
  check('B11 adopting a saved world stands the resident set down (stale seats never survive)',
    adopted && bootedPre && ws3.seamlessRegions.length === 0 && ws3.seamlessMints.size === 0);
  ws3.resumeSpawn('town', null);
  check('B12 the resume\'s own load re-boots the pair against the RESTORED graph',
    ws3.seamlessRegions.length === 2
    && ws3.seamlessRegions.every(s => !!ws3.zoneMap[s.zoneId]
      && ws3.zoneMap[s.zoneId].camera === 'hero'
      && ws3.seamlessMints.has(s.zoneId)));
}

// --- RIG C: THE OPEN RIM ------------------------------------------------------

// Park the hero in resident A for the rim + threshold rigs.
ws.loadZone(zoneA!.id);

const rectOf = (seat: { zoneId: string; originPx: { x: number; y: number } }): { x0: number; y0: number; x1: number; y1: number } => {
  const span = ws.seamlessMints.get(seat.zoneId)!.span;
  return { x0: seat.originPx.x, y0: seat.originPx.y, x1: seat.originPx.x + span.w, y1: seat.originPx.y + span.h };
};
const inRect = (x: number, y: number, r: { x0: number; y0: number; x1: number; y1: number }): boolean =>
  x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

{
  const open: TissueSampler = () => ({ walkable: true, tone: '#000', road: false });
  const shut: TissueSampler = () => ({ walkable: false, tone: '#000', road: false });
  const rA = rectOf(seatA!), rB = rectOf(seatB!);

  // SELF-CALIBRATING TISSUE POINT: the pair may overlap (adjacent layouts
  // nearly tile — the charter's own observation), so a step past the
  // partner-facing rim can land on partner GROUND, where admission is the
  // LAW (the threshold sweep owns it), not a tissue read. Scan the rim for
  // an out-step that is outside BOTH rects and that walkable tissue admits
  // (the oracle) — THAT point is tissue-tested, and the stubs must disagree
  // on it.
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
      const wx = beyond.x + seatA!.originPx.x, wy = beyond.y + seatA!.originPx.y;
      if (inRect(wx, wy, rA) || inRect(wx, wy, rB)) continue;
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
    // The M0 leash: a NON-party body never opens the rim (walkable or not).
    const foe = ws.actors.find(a => a !== ws.player && !a.owner && !a.dead);
    check('C4 a non-party body keeps the classic confine', !!foe
      && insideBounds(ws.clampPos(vec(tissueBeyond.x, tissueBeyond.y), 14, vec(tissueFrom.x, tissueFrom.y), { mover: foe }), 14, ws.arena),
    foe ? '' : 'no ambient body spawned to test with');

    // A mover-less ask (spawn placement, teleport) never opens the rim.
    const placed = ws.clampPos(vec(tissueBeyond.x, tissueBeyond.y), 14);
    check('C5 a mover-less placement never opens the rim', insideBounds(placed, 14, ws.arena));

    // The corridor leash: an out-step far past the pair's union box refuses
    // even on walkable tissue (M0 keeps the walk between the pair).
    const leashed = ws.clampPos(vec(tissueBeyond.x * 40 - tissueFrom.x * 39, tissueBeyond.y * 40 - tissueFrom.y * 39), 14,
      vec(tissueFrom.x, tissueFrom.y), { mover: ws.player });
    check('C6 the corridor leash refuses the far country (rim holds off-pair)',
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

/** The M0 leash keeps the PACK home, so hostiles are not what this rig pins —
 *  strip them each step so a level-1 hero survives the driven walk (the
 *  probe's fodder-lane discipline; combat is other probes' business). */
const stripHostiles = (w: World): void => {
  w.actors = w.actors.filter(a => a === w.player || !!a.owner);
};

{
  // The crossing runs on a walkable stub: pin (c) is the REBASE's math, not
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

  const beforeStep = (): void => {
    stripHostiles(ws);
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
    if (ws.zone.id === zoneB!.id && !crossedAt) {
      crossedAt = { prev: prevW, now: heroWorldPx(ws)! };
    }
    return !!crossedAt;
  };

  // Leg 1: straight out the rim; leg 2: on into B's heart.
  walkToward(ws, () => outW, () => !insideBounds(ws.player.pos, ws.player.radius, ws.arena) || crossed(), 600, beforeStep);
  const reached = walkToward(ws, () => goalB, crossed, 6000, beforeStep);

  check('D1 the walk crosses the threshold (zone swaps to the partner with no travel verb)',
    reached && ws.zone.id === zoneB!.id);
  if (crossedAt) {
    const drift = Math.hypot(crossedAt.now.x - crossedAt.prev.x, crossedAt.now.y - crossedAt.prev.y);
    check('D2 world-px continuity across the rebase (≤ one step + clamp safety)',
      drift <= 24, `drift ${drift.toFixed(2)}px`);
  } else {
    check('D2 world-px continuity across the rebase', false, 'never crossed');
  }
  check('D3 the crossing lands INSIDE the partner arena (an honest landing)',
    insideBounds(ws.player.pos, ws.player.radius, ws.arena));
  check('D4 entryFrom names the ground we walked out of (the door law\'s bookkeeping)',
    ws.entryFrom === zoneA!.id);
  // The floater rises a few px in the crossing frame's own tick (its normal
  // life) — the pin is the CARRY: still live in texts, offset within a
  // frame's drift, never off by the 2686px-scale seat delta.
  check('D5 the carried floater rides the rebase at its offset (one frame\'s rise allowed)',
    !!marker && !!markerOff && ws.texts.includes(marker as never)
    && Math.abs((marker!.pos.x - ws.player.pos.x) - markerOff!.x) < 30
    && Math.abs((marker!.pos.y - ws.player.pos.y) - markerOff!.y) < 30);
  // Re-read the mint: the living web may have woven a road onto B during the
  // walk, and the threshold sweep then REFRESHES the record (the exits-key
  // invalidation) — the standing mint is the one the arrival must match.
  const d6 = mintMeetsGround(ws.doodads, ws.seamlessMints.get(zoneB!.id)!.layout.doodads);
  check('D6 the arrival stands the boot mint\'s ground (drawn == walked, site-tolerant)', d6.ok, d6.detail);
  check('D6b …and answers the boot mint\'s exact walk grid at the threshold',
    gridsAgree(ws.walk, ws.seamlessMints.get(zoneB!.id)!.layout.walk, ws.arena.w, ws.arena.h));
  check('D7 first arrival materializes the partner (visited stamps at the threshold)',
    ws.visited.has(zoneB!.id));

  // The way back: rebase B → A; the return replays A's remembered ground
  // through the zone-memory law (same seed, partner-door entry == the mint).
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
  check('F1 every resident-pair exit reads as an OPEN WAY (and at least one stands)',
    walkExits.length >= 1 && walkExits.every(e => ws.seamlessMints.has(e.to)),
    `${walkExits.length} open way(s) in ${ws.zone.id}`);
  check('F2 no exit to unresident ground opens (doors beyond the pair stay doors)',
    ws.exits.every(e => ws.seamlessWalkExit(e) === ws.seamlessMints.has(e.to) && (e.to !== '?' || !ws.seamlessWalkExit(e))));
  check('F3 the exit ROW survives the open way (the graph link is untouched)',
    walkExits.every(e => ws.zone.exits[e.defIndex] && ws.zone.exits[e.defIndex].to === e.to));

  // THE WAYMARKED CROSSING: a signpost PAIR flanks each open way, planted by
  // the load-tail dress (pure geometry — flank 66 / inset 30 at the shipped
  // dials; the pin is presence + nearness, never exact dials, so her re-dial
  // breaks nothing).
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
    check('F6 the control — a true door beyond the pair still arms its ring', armed);
    ws.player.pos = vec(ws.arena.w / 2, ws.arena.h / 2); // step off before the dwell completes
    ws.update(1 / 60);
  } else {
    check('F6 the control — a true door beyond the pair still arms its ring',
      true, 'no unlocked non-pair door in this zone (nothing to control against)');
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

console.log(fails === 0 ? '\nprobe_seamless: ALL GREEN' : `\nprobe_seamless: ${fails} FAILURE(S)`);
process.exit(fails > 0 ? 1 : 0);
