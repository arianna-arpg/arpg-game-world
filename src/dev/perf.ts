// ---------------------------------------------------------------------------
// PERF SWEEP — the generative frame-cost probe behind `npm run perf`.
//
// Measures what the PLAYER'S frame does: a fresh run is started through the
// real startGame path, one zone per tileset is minted through the real
// placeZoneAt → loadZone pipeline (World.devMintTileset), and the hero WALKS
// each zone under real requestAnimationFrame pacing — steered by the fake pad
// through the true input path, invulnerable but TARGETABLE so combat pressure
// stays honest. Telemetry comes from the main-loop ring buffers
// (__game.perfFrames: rAF gap = pacing/jitter, sim ms, render ms); each zone
// reports its ENTRY BURST (the first settleSeconds after the load, where
// chunk prefetch front-loads) separately from steady state, plus hitch counts
// at two thresholds.
//
// This module only MEASURES. Budgets and the exit-2 gate live in the launcher
// perf mode (launcher/main.cjs) reading balance/perf.config.json — data, not
// code, decides what "too slow" means. Every knob rides PerfSweepOpts, and the
// default matrix derives from the tileset registry (frontier-eligible, not
// boundless), so new biomes join the sweep the day they're authored.
// ---------------------------------------------------------------------------

import { TILESETS } from '../data/tilesets';
import { START_ZONE } from '../data/zones';
import { quantile } from '../sim/metrics';

export interface PerfSweepOpts {
  /** Steady-state sample window per zone, seconds (default 6). */
  seconds?: number;
  /** Entry window per zone, seconds — measured separately, then discarded
   *  from steady stats (default 1.5). */
  settleSeconds?: number;
  /** Substring filter on tileset ids ('' = all). */
  filter?: string;
  /** Explicit matrix override (tileset ids); default = every
   *  frontier-eligible, non-boundless tileset in the registry. */
  tilesets?: string[];
  /** Class the probe run starts with (default: the first class). */
  classId?: string;
}

export interface PerfZoneStats {
  tileset: string;
  zone: string;
  variant: string | null;
  layout: string;
  doodads: number;
  actors: number;
  frames: number;
  /** rAF-gap percentiles/extreme (ms) — the pacing the player feels. */
  gapP50: number; gapP95: number; gapP99: number; gapMax: number;
  /** Sim (input + AI + world.update) percentiles (ms). */
  simP50: number; simP99: number;
  /** Render (renderer.render, JS side) percentiles (ms). */
  renP50: number; renP99: number;
  /** Frames over 40 / 70 ms in the steady window (hitches). */
  hitch40: number; hitch70: number;
  /** Worst rAF gap inside the ENTRY window (zone-load burst). */
  entryWorstGap: number;
}

export interface PerfSweepReport {
  control: PerfZoneStats;
  zones: PerfZoneStats[];
  canvas: { w: number; h: number };
  dpr: number;
  sampleSeconds: number;
  matrix: string[];
  skipped: string[];
}

const PERF_SPREAD_BASE = 11; // staggers mint coordinates across the sweep

type FrameDump = { gap: number[]; sim: number[]; ren: number[] };

function reduceFrames(f: FrameDump, entryWorstGap: number, meta: {
  tileset: string; zone: string; variant: string | null; layout: string;
  doodads: number; actors: number;
}): PerfZoneStats {
  const gap = [...f.gap].sort((a, b) => a - b);
  const sim = [...f.sim].sort((a, b) => a - b);
  const ren = [...f.ren].sort((a, b) => a - b);
  const q = (s: number[], p: number): number => (s.length ? +quantile(s, p).toFixed(1) : 0);
  return {
    ...meta, frames: gap.length,
    gapP50: q(gap, 0.5), gapP95: q(gap, 0.95), gapP99: q(gap, 0.99),
    gapMax: gap.length ? +gap[gap.length - 1].toFixed(1) : 0,
    simP50: q(sim, 0.5), simP99: q(sim, 0.99),
    renP50: q(ren, 0.5), renP99: q(ren, 0.99),
    hitch40: f.gap.filter(g => g > 40).length,
    hitch70: f.gap.filter(g => g > 70).length,
    entryWorstGap: +entryWorstGap.toFixed(1),
  };
}

export async function perfSweep(opts: PerfSweepOpts = {}): Promise<PerfSweepReport> {
  const g = window.__game;
  if (!g) throw new Error('perfSweep: window.__game missing — game not booted');
  const raf = (): Promise<number> => new Promise(r => requestAnimationFrame(r));
  const sampleMs = (opts.seconds ?? 6) * 1000;
  const settleMs = (opts.settleSeconds ?? 1.5) * 1000;

  // A fresh probe run through the REAL start path (menus dismissed).
  g.devStartRun(opts.classId);

  /** Steer the left stick in a slow arc for `ms` — real input path, real
   *  movement, real chunk faults at the camera edge. Returns the worst rAF
   *  gap seen (the caller uses it for the entry-burst readout). */
  const walkPhase = async (ms: number): Promise<number> => {
    let dir = 0.6, worst = 0;
    let prev = performance.now();
    const t0 = prev;
    while (performance.now() - t0 < ms) {
      dir += 0.02;
      g.fakePad({ axes: [Math.cos(dir), Math.sin(dir), 0, 0], buttons: [] });
      const now = await raf();
      worst = Math.max(worst, now - prev);
      prev = now;
    }
    return worst;
  };

  const sampleCurrentZone = async (tilesetId: string): Promise<PerfZoneStats> => {
    const zw = g.world();
    zw.player.invulnerable = true; // unkillable but TARGETABLE: combat stays real
    const entryWorst = await walkPhase(settleMs);
    g.perfFrames(true); // discard the entry burst; the steady window begins
    await walkPhase(sampleMs);
    const zw2 = g.world();
    return reduceFrames(g.perfFrames(false), entryWorst, {
      tileset: tilesetId, zone: zw2.zone.name,
      variant: zw2.zone.variantName ?? null,
      layout: zw2.zone.layoutType ?? 'plains',
      doodads: zw2.doodads.length, actors: zw2.actors.length,
    });
  };

  // CONTROL: the town — every relative budget compares against this, so the
  // verdict travels across machines (a slow laptop slows both sides).
  g.world().devTravelTo(START_ZONE);
  const control = await sampleCurrentZone('(town)');

  // THE MATRIX: frontier-eligible tilesets (boundless/streamed zones need
  // package context a bare mint cannot supply), or the explicit override.
  const matrix = (opts.tilesets ?? Object.values(TILESETS)
    .filter(t => t.frontier !== false && !t.boundless)
    .map(t => t.id))
    .filter(id => !opts.filter || id.includes(opts.filter));

  const zones: PerfZoneStats[] = [];
  const skipped: string[] = [];
  for (let i = 0; i < matrix.length; i++) {
    const id = matrix[i];
    const zid = g.world().devMintTileset(id, PERF_SPREAD_BASE + i);
    if (!zid) { skipped.push(id); continue; }
    zones.push(await sampleCurrentZone(id));
  }
  g.fakePad(null);

  const cv = document.getElementById('game') as HTMLCanvasElement | null;
  return {
    control, zones,
    canvas: { w: cv?.width ?? 0, h: cv?.height ?? 0 },
    dpr: window.devicePixelRatio || 1,
    sampleSeconds: opts.seconds ?? 6,
    matrix, skipped,
  };
}
