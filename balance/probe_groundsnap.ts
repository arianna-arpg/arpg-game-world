// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RATE-CONDITIONAL SNAPSHOT LANE (render/vis/ground.ts +
// VIS_CFG.ground.snapLane): the gloamwood off40 fix. The async ground-chunk
// snapshot (startSnap → createImageBitmap) emits a ~25-36ms main-thread task
// BETWEEN frames per bake; at walking's chunk-fault rate those tasks ARE the
// >40ms stall class (2026-08-02 forensics: stalls ∝ bake count, {0,0,0}
// under ablate=ground, sync path clean at the same count). The fix routes
// each bake by RECENT DEMAND ON ITS OWN CAUSE — two ledgers, because the
// shapes differ: MISSING bakes (walking's column faults + prefetch + entry
// screenfuls) are camera-bounded bursts, so `missingSyncMax` per window ride
// the sync lane and walking never snapshots, while an entry screenful still
// spills its tail async; STALE bakes (repaint rebakes) are the STORM signal
// (flood wakes, melting shelves, creep drying — the async swap's design
// case), so only `staleSyncMax` per window ride sync and a storm spills
// async after that bounded opening leak. This rig is the STORM REGRESSION
// HARNESS: the timing truth lives in the perf sweep; the LOGIC contract —
// the async path must keep protecting storms — lives here.
// Pins:
//   - RIG A — THE STEADY LANE: walking-rate faults (fault + prefetch pairs,
//     windows apart) never touch createImageBitmap; chunks land as canvases
//     IMMEDIATELY (no flat stand-in frame on steady ground).
//   - RIG B — THE ENTRY BURST: a screenful of missing chunks rides sync for
//     the allowance then spills async — one snapshot in flight at a time,
//     flat stand-ins meanwhile (the shipped entry profile), and the queue
//     DRAINS to a fully-baked window (no starvation).
//   - RIG C0 — THE DOOR-BREAK PIN: an isolated repaint rebakes SYNC and
//     in place (no snapshot task, no old-face wait), closing a crossed
//     bitmap when the chunk last landed async.
//   - RIG C — THE STORM CONTRACT: sustained stale rebakes spill async; a
//     pending chunk keeps blitting its OLD face until the swap lands (the
//     melting shelf's whole point); sync leakage inside the storm is
//     BOUNDED to staleSyncMax per window BY CONSTRUCTION; the drain
//     converges (no starvation).
//   - RIG D — THE DIALS: both maxes 0 restores pure-async (the pre-fix A/B
//     arm: every bake snapshots); asyncUpload false restores pure-sync
//     (zero snapshots under storm, rebaked chunks all canvases).
//   - RIG E — THE DEAD SNAPSHOT: a zone hop mid-flight closes the landing
//     bitmap and installs nothing (the epoch law).
//   - RIG F — THE WEDGE VALVE: a snapshot silent past 500ms stops damming
//     the pipe (a second may start over it), late landings still install,
//     and the pipe drains normally afterward.
// Run: npx tsx balance/probe_groundsnap.ts
// ---------------------------------------------------------------------------

import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

// --- THE SHIMS (installed before any src module loads — imports below are
// dynamic on purpose, so no future top-level DOM touch can hoist past us) ---

let clock = 1000;
const perfObj = globalThis.performance as unknown as { now: () => number };
perfObj.now = () => clock;
if (performance.now() !== clock) {
  console.log('FAIL  clock shim did not take (performance.now not patchable)');
  process.exit(1);
}

/** A no-op 2D context: every get yields the sink, every call returns it. */
const mkSink = (): CanvasRenderingContext2D => {
  const sink: unknown = new Proxy(function () { /* noop */ }, {
    get: (_t, p) => (p === Symbol.toPrimitive ? () => 0 : sink),
    set: () => true,
    apply: () => sink,
  });
  return sink as CanvasRenderingContext2D;
};

class FakeCanvas {
  width = 0;
  height = 0;
  private ctx: CanvasRenderingContext2D | null = null;
  getContext(_t: string): CanvasRenderingContext2D {
    if (!this.ctx) this.ctx = mkSink();
    return this.ctx;
  }
}
class FakeBitmap {
  closed = false;
  close(): void { this.closed = true; }
}
const g = globalThis as Record<string, unknown>;
g.HTMLCanvasElement = FakeCanvas;
g.ImageBitmap = FakeBitmap;
g.document = { createElement: (_t: string) => new FakeCanvas() };

/** createImageBitmap shim: calls queue; flush() lands them FIFO. */
let snapCalls = 0;
const snapQueue: ((b: FakeBitmap) => void)[] = [];
g.createImageBitmap = (_src: unknown, _sx: number, _sy: number, _sw: number, _sh: number): Promise<FakeBitmap> =>
  new Promise<FakeBitmap>(resolve => { snapCalls++; snapQueue.push(resolve); });
const flush = async (): Promise<FakeBitmap[]> => {
  const born: FakeBitmap[] = [];
  for (const resolve of snapQueue.splice(0)) {
    const b = new FakeBitmap();
    born.push(b);
    resolve(b);
  }
  // Drain the .then chains startSnap hung off the promises.
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  return born;
};

// --- The src graph, loaded under the shims ---------------------------------
const { GridWalkField } = await import('../src/world/gridWalk');
const { VIS_CFG, VIS_TELEMETRY } = await import('../src/render/vis/visConfig');
const { GroundRenderer } = await import('../src/render/vis/ground');

// Small chunks keep the rig cheap; the lane logic is size-blind.
const G = VIS_CFG.ground as unknown as {
  chunk: number; asyncUpload: boolean; rebakesPerFrame: number;
  snapLane: { windowMs: number; missingSyncMax: number; staleSyncMax: number };
};
G.chunk = 64;
const C = G.chunk;
const W = C * 6; // 6×6 chunk arena
const MISS_MAX = G.snapLane.missingSyncMax;
const STALE_MAX = G.snapLane.staleSyncMax;

interface Entry { img: FakeCanvas | FakeBitmap | null; pending: boolean; v: number; at: number }
type Gr = InstanceType<typeof GroundRenderer>;
const chunksOf = (gr: Gr): Map<string, Entry> =>
  (gr as unknown as { chunks: Map<string, Entry> }).chunks;

const mkWorld = (zoneId: string): { world: World; wf: InstanceType<typeof GridWalkField> } => {
  const wf = new GridWalkField(W, W, 16);
  wf.fillRegion(0, 0, W, W, 'ground');
  const world = {
    zone: {
      id: zoneId, name: zoneId,
      theme: { floor: '#3a4632', grid: '#20241c', obstacle: '#57604a', wall: '#2e3627' },
      size: { w: W, h: W },
    },
    walk: wf,
    arena: { boundless: false, w: W, h: W },
    doodads: [],
    doodadFamilyRev: () => 0,
  } as unknown as World;
  return { world, wf };
};

/** One frame: draw through a recording target ctx. */
const frame = (gr: Gr, world: World, camX: number, camY: number, vw: number, vh: number):
  { blits: unknown[]; flats: number } => {
  const blits: unknown[] = [];
  let flats = 0;
  const sink: unknown = new Proxy(function () { /* noop */ }, {
    get: (_t, p) => {
      if (p === 'drawImage') return (img: unknown) => { blits.push(img); };
      if (p === 'fillRect') return () => { flats++; };
      if (p === Symbol.toPrimitive) return () => 0;
      return sink;
    },
    set: () => true,
    apply: () => sink,
  });
  gr.draw(sink as CanvasRenderingContext2D, world, camX, camY, vw, vh);
  return { blits, flats };
};

const countImgs = (gr: Gr): { canvases: number; bitmaps: number; pending: number; nulls: number } => {
  let canvases = 0, bitmaps = 0, pending = 0, nulls = 0;
  for (const e of chunksOf(gr).values()) {
    if (e.pending) pending++;
    if (e.img instanceof FakeCanvas) canvases++;
    else if (e.img instanceof FakeBitmap) bitmaps++;
    else nulls++;
  }
  return { canvases, bitmaps, pending, nulls };
};
const staleCount = (gr: Gr, ver: number): number => {
  let n = 0;
  for (const e of chunksOf(gr).values()) if (e.v < ver) n++;
  return n;
};

// --- RIG A — THE STEADY LANE ------------------------------------------------
{
  const { world } = mkWorld('steady');
  const gr = new GroundRenderer();
  const bakes0 = VIS_TELEMETRY.groundBakes, snaps0 = snapCalls;
  // Walk the top row: the fault + prefetch pair per step, a window between
  // steps — walking's steady demand shape.
  let sawFlat = 0;
  for (let step = 0; step < 5; step++) {
    const r = frame(gr, world, step * C, 0, C, C);
    sawFlat += r.flats;
    clock += 2000; // beyond snapLane.windowMs — the ledger empties each step
  }
  check('A1 steady-rate faults never touch createImageBitmap',
    snapCalls === snaps0, `snaps +${snapCalls - snaps0}`);
  const imgs = countImgs(gr);
  check('A2 every steady chunk is a canvas, landed immediately',
    imgs.canvases > 0 && imgs.bitmaps === 0 && imgs.pending === 0 && imgs.nulls === 0,
    JSON.stringify(imgs));
  check('A3 no flat stand-in frame on steady ground', sawFlat === 0, `flats ${sawFlat}`);
  check('A4 the walk actually baked (the trigger stayed countable)',
    VIS_TELEMETRY.groundBakes - bakes0 >= 6, `bakes +${VIS_TELEMETRY.groundBakes - bakes0}`);
}

// --- RIG B — THE ENTRY BURST (spill async + drain, stand-ins meanwhile) -----
const burst = mkWorld('burst');
const burstGr = new GroundRenderer();
{
  clock += 2000;
  const snaps0 = snapCalls, bakes0 = VIS_TELEMETRY.groundBakes;
  const r1 = frame(burstGr, burst.world, 0, 0, W, W); // all 36 chunks visible
  check('B1 a burst frame spends the missing allowance sync then spills async',
    snapCalls - snaps0 === 1 && VIS_TELEMETRY.groundBakes - bakes0 === MISS_MAX + 1,
    `snaps +${snapCalls - snaps0} bakes +${VIS_TELEMETRY.groundBakes - bakes0} (allowance ${MISS_MAX})`);
  check('B2 pending + unbaked chunks draw the flat stand-in, baked ones blit',
    r1.blits.length === MISS_MAX && r1.flats === 36 - MISS_MAX,
    `blits ${r1.blits.length} flats ${r1.flats}`);
  let spins = 0;
  for (; spins < 80; spins++) {
    await flush();
    clock += 8;
    frame(burstGr, burst.world, 0, 0, W, W);
    const c = countImgs(burstGr);
    if (c.nulls === 0 && c.pending === 0 && snapQueue.length === 0) break;
  }
  await flush();
  const imgs = countImgs(burstGr);
  check('B3 the burst DRAINS — every chunk baked, nobody starves',
    imgs.canvases + imgs.bitmaps === 36 && imgs.pending === 0 && imgs.nulls === 0,
    `${JSON.stringify(imgs)} after ${spins} frames`);
  check('B4 the burst tail rode the async lane, the allowance stayed sync',
    imgs.canvases === MISS_MAX && imgs.bitmaps === 36 - MISS_MAX, JSON.stringify(imgs));
}

// --- RIG C0 — THE DOOR-BREAK PIN (isolated repaint: sync, in place) ---------
{
  const { world, wf } = burst;
  const gr = burstGr;
  clock += 2000;
  const snaps0 = snapCalls, bakes0 = VIS_TELEMETRY.groundBakes;
  const door = chunksOf(gr).get('3,3')!;
  const doorFace = door.img;
  wf.fillRegion(C * 3 + 24, C * 3 + 24, C * 3 + 40, C * 3 + 40, 'ground'); // chunk (3,3) alone
  frame(gr, world, 0, 0, W, W);
  check('C0a an isolated door-break repaints SYNC — no snapshot task',
    snapCalls === snaps0 && VIS_TELEMETRY.groundBakes - bakes0 === 1 && !door.pending,
    `snaps +${snapCalls - snaps0} bakes +${VIS_TELEMETRY.groundBakes - bakes0}`);
  check('C0b …and the crossed bitmap was closed for a fresh canvas',
    doorFace instanceof FakeBitmap && doorFace.closed && door.img instanceof FakeCanvas,
    `was ${doorFace?.constructor?.name}, now ${door.img?.constructor?.name}`);
}

// --- RIG C — THE STORM CONTRACT + THE LANE CROSSOVER ------------------------
{
  const { world, wf } = burst; // fully-baked 36-chunk window
  const gr = burstGr;
  clock += 2000; // the stale ledger empties — the storm opens on a clean gate
  const snaps0 = snapCalls, bakes0 = VIS_TELEMETRY.groundBakes;
  const preBitmaps = new Map<string, FakeBitmap>();
  for (const [k, e] of chunksOf(gr)) if (e.img instanceof FakeBitmap) preBitmaps.set(k, e.img);
  // Repaint rows 2-3 (12 chunks, all async-landed bitmaps) into staleness.
  // (Version lag on UNTOUCHED chunks is adopted lazily in pass-1, so the
  // touched reach is proven by the drain's bake total — C1 below.)
  wf.fillRegion(0, 152, W, 200, 'ground');
  const verNow = wf.version;

  const r1 = frame(gr, world, 0, 0, W, W);
  const afterFirst = countImgs(gr);
  check('C2 the storm frame: staleSyncMax crossovers re-land sync, the next spills async',
    snapCalls - snaps0 === 1 && VIS_TELEMETRY.groundBakes - bakes0 === STALE_MAX + 1
    && afterFirst.pending === 1,
    `snaps +${snapCalls - snaps0} bakes +${VIS_TELEMETRY.groundBakes - bakes0} pending ${afterFirst.pending}`);
  let crossedClosed = 0, crossedOpen = 0;
  for (const [k, b] of preBitmaps) {
    const e = chunksOf(gr).get(k)!;
    if (e.img instanceof FakeCanvas) { if (b.closed) crossedClosed++; else crossedOpen++; }
  }
  check('C3 CROSSOVER: every bitmap replaced by a sync rebake was closed',
    crossedClosed === STALE_MAX && crossedOpen === 0,
    `closed ${crossedClosed} leaked ${crossedOpen}`);
  let pendingKey = '';
  for (const [k, e] of chunksOf(gr)) if (e.pending) pendingKey = k;
  const pendingEntry = chunksOf(gr).get(pendingKey)!;
  const oldFace = pendingEntry.img;
  check('C4 THE STORM CONTRACT: the pending chunk still wears its old face',
    oldFace instanceof FakeBitmap && !oldFace.closed && r1.blits.includes(oldFace),
    `img ${oldFace?.constructor?.name}`);
  await flush();
  check('C5 …and the swap lands: old face closed, fresh bitmap installed',
    pendingEntry.img instanceof FakeBitmap && pendingEntry.img !== oldFace
    && (oldFace as FakeBitmap).closed && !pendingEntry.pending,
    `img ${pendingEntry.img?.constructor?.name}`);
  // Drain the rest at frame pace; the stale ledger stays occupied, so the
  // tail rides async — the leak stays the opening allowance, structurally.
  let spins = 0;
  for (; spins < 40; spins++) {
    clock += 8;
    frame(gr, world, 0, 0, W, W);
    await flush();
    if (staleCount(gr, verNow) === 0 && snapQueue.length === 0) break;
  }
  check('C6 the storm drains to convergence (no starvation)',
    staleCount(gr, verNow) === 0, `stale ${staleCount(gr, verNow)} after ${spins} frames`);
  const leak = (VIS_TELEMETRY.groundBakes - bakes0) - (snapCalls - snaps0);
  check('C7 sync leakage inside the storm is BOUNDED to the window allowance',
    leak === STALE_MAX, `leak ${leak} vs staleSyncMax ${STALE_MAX}`);
  check('C1 the storm baked exactly its 12-chunk repainted reach',
    VIS_TELEMETRY.groundBakes - bakes0 === 12,
    `bakes +${VIS_TELEMETRY.groundBakes - bakes0}`);
}

// --- RIG D — THE DIALS ------------------------------------------------------
{
  const { world, wf } = burst;
  const gr = burstGr;
  // D1: both maxes 0 = pure-async (the pre-fix behavior, the A/B arm).
  G.snapLane.missingSyncMax = 0;
  G.snapLane.staleSyncMax = 0;
  clock += 2000;
  const snaps0 = snapCalls, bakes0 = VIS_TELEMETRY.groundBakes;
  wf.fillRegion(C * 3 + 8, C * 3 + 8, C * 3 + 16, C * 3 + 16, 'ground');
  for (let i = 0; i < 30; i++) {
    frame(gr, world, 0, 0, W, W);
    await flush();
    clock += 8;
    if (staleCount(gr, wf.version) === 0) break;
  }
  check('D1 maxes 0 = pure-async: every bake snapshots (the A/B arm lives)',
    snapCalls - snaps0 > 0 && snapCalls - snaps0 === VIS_TELEMETRY.groundBakes - bakes0,
    `snaps +${snapCalls - snaps0} bakes +${VIS_TELEMETRY.groundBakes - bakes0}`);
  G.snapLane.missingSyncMax = MISS_MAX;
  G.snapLane.staleSyncMax = STALE_MAX;
  // D2: asyncUpload false = the whole legacy sync path, storms included.
  G.asyncUpload = false;
  clock += 2000;
  const snaps1 = snapCalls;
  wf.fillRegion(0, 0, W, C, 'ground'); // rows 0-1 stale (12 chunks)
  for (let i = 0; i < 40; i++) {
    frame(gr, world, 0, 0, W, W);
    clock += 8;
    if (staleCount(gr, wf.version) === 0) break;
  }
  let regionCanvases = 0, regionOther = 0;
  for (let cy = 0; cy <= 1; cy++) {
    for (let cx = 0; cx <= 5; cx++) {
      const e = chunksOf(gr).get(`${cx},${cy}`)!;
      if (e.img instanceof FakeCanvas && !e.pending) regionCanvases++; else regionOther++;
    }
  }
  check('D2 asyncUpload false = pure-sync under storm: zero snapshots, rebakes all canvases',
    snapCalls === snaps1 && staleCount(gr, wf.version) === 0
    && regionCanvases === 12 && regionOther === 0,
    `snaps +${snapCalls - snaps1} canvases ${regionCanvases}/12`);
  G.asyncUpload = true;
}

// --- RIG E — THE DEAD SNAPSHOT (zone hop mid-flight) ------------------------
{
  const { world, wf } = burst;
  const gr = burstGr;
  G.snapLane.missingSyncMax = 0;
  G.snapLane.staleSyncMax = 0; // force async so one snap hangs in flight
  clock += 2000;
  wf.fillRegion(8, 8, 16, 16, 'ground'); // chunk (0,0) alone
  frame(gr, world, 0, 0, W, W); // starts the doomed snapshot
  check('E1 a snapshot is in flight', snapQueue.length === 1, `${snapQueue.length}`);
  const hop = mkWorld('elsewhere');
  frame(gr, hop.world, 0, 0, C, C); // zone swap: cache cleared, epoch turned
  const born = await flush();
  check('E2 the dead snapshot closes quietly and installs nowhere',
    born.length >= 1 && born[0].closed
    && ![...chunksOf(gr).values()].some(e => e.img === born[0]),
    `born ${born.length} closed ${born[0]?.closed}`);
  G.snapLane.missingSyncMax = MISS_MAX;
  G.snapLane.staleSyncMax = STALE_MAX;
}

// --- RIG F — THE WEDGE VALVE ------------------------------------------------
{
  const { world } = mkWorld('wedge');
  const gr = new GroundRenderer();
  G.snapLane.missingSyncMax = 0;
  G.snapLane.staleSyncMax = 0; // async lane throughout
  clock += 2000;
  frame(gr, world, 0, 0, C, C); // chunk (0,0) → snapshot 1 in flight
  check('F1 the first snapshot is in flight (unflushed)', snapQueue.length === 1, `${snapQueue.length}`);
  clock += 600; // past the 500ms wedge age
  const snaps0 = snapCalls;
  frame(gr, world, 0, 0, W, C); // more missing work: the valve opens
  check('F2 a wedged snapshot stops damming the pipe (a second starts over it)',
    snapCalls - snaps0 >= 1, `snaps +${snapCalls - snaps0}`);
  await flush(); // BOTH land, the late one included
  let spins = 0;
  for (; spins < 30; spins++) {
    clock += 8;
    frame(gr, world, 0, 0, W, C);
    await flush();
    const c = countImgs(gr);
    if (c.nulls === 0 && c.pending === 0 && snapQueue.length === 0) break;
  }
  const imgs = countImgs(gr);
  check('F3 late landings install and the pipe drains normally afterward',
    imgs.pending === 0 && imgs.nulls === 0 && imgs.bitmaps >= 2,
    `${JSON.stringify(imgs)} after ${spins} frames`);
  G.snapLane.missingSyncMax = MISS_MAX;
  G.snapLane.staleSyncMax = STALE_MAX;
}

console.log(failed ? `\nprobe_groundsnap: ${failed} FAILED` : '\nprobe_groundsnap: all pins hold');
process.exit(failed ? 1 : 0);
