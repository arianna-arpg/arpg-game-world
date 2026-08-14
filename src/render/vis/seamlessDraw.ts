// ---------------------------------------------------------------------------
// THE SEAMLESS COUNTRY DRAW (seamless-world, the render lane) — what the
// view shows PAST the active layout's rim when the mode stands: connective
// TISSUE poured from the global fields, and the NEIGHBOR layouts standing at
// their map seats. Charter: docs/design/seamless-world.md; contracts:
// world/seamless.ts (RegionSeat, TissueSample, getTissueSampler).
//
// THE MODE LAW (Law 1) is structural here: every entry point gates on
// `seamlessDrawActive(world)` — flag off, sampler null, seats empty, or the
// active zone unseated ⇒ false ⇒ the renderer runs today's void-frame path
// byte-identically. Null sampler = "no tissue exists"; nothing here throws.
//
// THE NEIGHBOR'S GROUND (M1 wave 1) lives in render/vis/ground.ts: the
// world-keyed chunk cache (GroundRenderer.worldChunks) bakes every resident
// region — active AND away — at FULL fidelity through the one bake pipeline,
// keyed on world chunk coordinates so a threshold crossing changes which
// region is active without dropping a single chunk. drawSeamlessCountry
// below hands each away seat to it inside the outside-the-union clip.
// The M0 away DIM retired with the flat grounds: the crossing may not pop,
// so the neighbor wears its true tones (FLAGGED — if her eye wants a
// distance veil back, it belongs at draw time, never in the bake).
//
// THE NEIGHBOR'S BODIES (M1 wave 2 — SeamlessBodyChunks): the away regions'
// standing doodads drawn by the REAL painter library, baked at ground-chunk
// grain over the SAME world lattice the wave-1 ground rides (`zoneId:cx,cy`
// keys, cache peers across the threshold — THE CONTINUITY LAW). Each chunk
// bake runs the drawDoodads paint loop (cull → kind groups → ascending
// order → blend-live underlays → contact shadows → bakeWhole sprites →
// painters, structure roofs last) against the region's boot mint through
// THE SCOPED WORLD SWAP (ground.ts bakeAwayChunk's own idiom, walk added:
// zone/doodads/structures/walk present the mint as "the world" for the span
// of one bake, restored in finally — painters' zone-shaped reads all serve).
// THE BAKE POSTURE (ground.ts's static-layer env, verbatim): time 0 — THE
// STILL LAW, every animated painter freezes at its zero phase, the live
// overlay owns motion the moment the region goes active — no shadowGate
// (ungoverned, the bake law), no labelSink (wordless BY CONSTRUCTION).
// Live-WORLD reads a painter makes anyway (hero bearing, snowCover, the
// conclave's heat) freeze as stills of the moment — documented per kind in
// the pass memory; no kind at this HEAD requires a disc fallback, and the
// warned generic disc remains only for registry-less kinds (the live pass's
// own fallback). What the still forgoes, BY LAW: sun longShadows (they spin
// with the day — a frozen cast would lie within minutes), the light layer
// (live-only by design), eldritch adorn writhes, labels. The M0 flat-disc
// bake (SeamlessAwayBodies) and its alpha/scale dials RETIRED with this —
// full-fidelity bodies draw at their own alphas.
//
// TWO MODULE CACHES, both steward-registered (render/vis/caches.ts):
//  • SeamlessTissueChunks — per-chunk offscreen canvases keyed `${cx},${cy}`
//    in WORLD px at SEAMLESS_CFG.chunkPx grain, LRU-evicted over a cap: the
//    ground-chunk cache idiom (render/vis/ground.ts GroundRenderer.chunks —
//    Map insertion order as LRU, delete+set touch, evictOverCap) applied to
//    world-keyed tissue. Chunks are pure f(worldSeed, cx, cy) — the sampler's
//    own purity law — so they survive zone swaps VALIDLY (no onZoneSwap
//    handler on purpose: clearing at the threshold would pop the tissue at
//    the exact moment that must feel continuous; the cap is the bound).
//  • SeamlessBodyChunks — the away bodies above, invalidated by mint
//    identity (a re-minted record re-bakes), LRU + the working-set guard.
// (The world-keyed ground cache registers from its own home, ground.ts.)
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import { MASSDRESS_CFG } from '../../data/enclosure';
import { roofStyle } from '../../data/structures';
import type { ZoneDef } from '../../data/zones';
import type { Doodad } from '../../engine/levelgen';
import type { SeamlessMint, World } from '../../engine/world';
import { getTissueSampler, SEAMLESS_CFG, type RegionSeat, type TissueSampler } from '../../world/seamless';
import { massDressOf, massStampSeatsForChunk, waysideSeatsForChunk,
  type MassDressRead, type MassStampSeat } from '../../world/tissue';
import { activePieces, type BoundsPiece } from '../../world/shape';
import { registerVisCache } from './caches';
import { hash01, mix, shade } from './color';
import type { GroundRenderer } from './ground';
import { PAINTERS, paintBakedWhole, paintBlendUnderlay, paintGroupShadows,
  type DoodadVisualDef, type PaintEnv } from './painters';
import { releaseCanvas } from './sprites';
import { VIS_ABLATE, VIS_CFG } from './visConfig';

/** Seamless render-lane dials — ALL FLAGGED (unblessed; her word moves
 *  them). Tone rationale: the road lifts the biome tone just enough to read
 *  as a way without inventing a material; water leans the same tone into
 *  one shared dark so every biome's coast reads as the same sea. */
export const SEAMLESS_DRAW_CFG = {
  /** Tissue sample lattice inside a chunk, px (720/30 = 24 cells exactly).
   *  Coarser = cheaper bakes; finer = smoother biome borders. */
  latticePx: 30,
  /** LRU cap on live tissue chunks (ground.ts maxChunks idiom: 60 × 448²
   *  ≈ 48MB there; 24 × 720² ≈ 50MB here — the same byte class). */
  maxTissueChunks: 24,
  /** Fresh tissue bakes per frame — pop-in fills a view in a few frames and
   *  a walker can never outrun a 720px chunk per frame. */
  tissueBakesPerFrame: 2,
  /** Road ribbon: tone lifted toward white by this much (flat honest band). */
  roadLighten: 0.16,
  /** Non-walkable tissue (sea, cliff-class relief): tone leaned toward
   *  waterDark by waterMix — one shared dark, biome-tinted. */
  waterDark: '#0a1826',
  waterMix: 0.62,
  /** THE WORLD-KEYED GROUND (M1 wave 1, ground.ts worldChunks) — LRU cap on
   *  full-fidelity chunks across ALL resident regions (~0.8MB each at 448²;
   *  72 ≈ 58MB: two regions' views + crossing hysteresis + the prefetch
   *  ring — the ground cache's own byte class, sized for the pair). The
   *  working-set guard means the cap bounds session growth, never the view. */
  maxGroundChunks: 72,
  /** Shared per-frame world-chunk bake budget (ms) — the active pass opens
   *  the ledger, away passes spend the remainder; ONE never-baked chunk per
   *  frame is always allowed regardless (streaming must progress — the
   *  discrete ground lane's own law). Mirrors VIS_CFG.ground.bakeBudgetMs. */
  groundBakeBudgetMs: 6,
  /** Stale world-chunk rebakes per frame — the convergence trickle after a
   *  crossing (epoch turnover), a walk repaint, or a mint refresh. The
   *  discrete lane runs 3; the seamless lane keeps a lighter hand because
   *  convergence bakes are usually pixel-identical to what they replace. */
  groundRebakesPerFrame: 2,
  /** THE NEIGHBOR'S BODIES (M1 wave 2, SeamlessBodyChunks) — LRU cap on
   *  away body-overlay chunks (~0.8MB each at the ground grain; 48 ≈ 38MB,
   *  the ground cache's own byte class; empty-country chunks cost no
   *  bytes). The working-set guard bounds session growth, never the view. */
  maxBodyChunks: 48,
  /** Fresh body-chunk bakes per frame across every away seat (the tissue
   *  lane's count-budget idiom — a bake is one drawDoodads-class paint over
   *  one chunk, so the trickle fills a view in a few frames). */
  bodyBakesPerFrame: 2,
  /** The chunk cull's flat paint-reach margin past a doodad's radius (px) —
   *  the live view cull's own posture (renderer RENDER_CULL_PAD): skirts,
   *  bakeWhole overreach and eye-stalk leans all land inside it; blend beds
   *  widen it per kind by their true feather reach. */
  bodyCullPad: 150,
  // --- THE MASS DRESS (M2 wave 6) — the painter's look half; the world-
  // grain dials (shoulder, attempts, the one sun) live in data/enclosure.ts
  // MASSDRESS_CFG. ALL FLAGGED (unblessed; her word moves them). ------------
  /** Master dial: dress the solid between (stamps + shade + the land-mass
   *  lean). Off — or a sampler without the carried read — restores the
   *  wave-5 flat bake byte-identically. Doubles as the live A/B lever. */
  massDress: true,
  /** Non-walkable LAND (the between's mass, cliff country) leans toward
   *  waterDark by this — lighter than the sea's waterMix so the dress
   *  reads; the sea keeps its own dark. Dress-off ground keeps waterMix. */
  massMix: 0.5,
  /** Hillshade overlay alpha at full saturation (the relief's texture on
   *  top of the blend tones — subtle by charter). */
  shadeStrength: 0.18,
  /** Shade quantization steps per sign — run-merged rows, byte-stable. */
  shadeSteps: 8,
  /** A stamp's paint reach as a multiple of its rolled radius (+6px): the
   *  3×3 neighbor-chunk seat gather culls by it, so a rim tree's canopy
   *  crosses the chunk seam whole — seam-free BY CONSTRUCTION (seats are
   *  pure per chunk; every neighbor derives the same list). */
  stampReachMul: 2.6,
  /** Stamp glyph ink, as shade() deltas off the LOCAL mass ground (the seat's
   *  blend tone under the massMix lean): body/lit/dark facets + the contact
   *  shadow's alpha. Tone-local on purpose — the glyph SHAPES carry the
   *  flank's identity, the ground's own palette carries the place. */
  stampInk: { body: 0.12, lit: 0.26, dark: -0.14, shadowAlpha: 0.18 },
  // --- THE ROAD DRESS (M2 wave 8) — the ribbon reads as the zones' own
  // roads continuing (the mass-dress pass's coda-3 debt paid). The world-
  // grain dials (wayside cadence/offset/salt, the glyph pool) live in
  // data/enclosure.ts ROADDRESS_CFG + WAYSIDE_GLYPHS. ALL FLAGGED
  // (unblessed; her word moves them). ---------------------------------------
  /** Master dial for the road lane: the analytic ROAD FACE (exact-ribbon
   *  strokes in the gravelPath grammar — the 30px lattice stair-step dies
   *  with the flat lighten) + the wayside shoulder glyphs. Off — or a
   *  sampler whose carried read predates the road lane — restores the
   *  wave-6 flat lighten byte-identically (the mode law at dial grain). */
  roadDress: true,
  /** The gravelPath grammar at ribbon scale. bedAlpha / wornShade /
   *  wornAlpha and the grit/kerb shade deltas are the discrete road
   *  painter's OWN numbers (painters.ts gravelPath) — the same road,
   *  continuing; alpha composites are precomputed against the local ground
   *  so every stroke lands OPAQUE (no double-alpha at piece joins or
   *  crossings). tonePiecePx paces the flank-blend color gradient along the
   *  way; gritStepPx is the discrete lay step (virtual discs); gritPerStep
   *  scales gravelPath's 7-per-disc to the ribbon's width (~2.6×);
   *  wornInsetPx is the worn center's edge inset (gravelPath's −7 at disc
   *  scale, deepened for the wide ribbon). */
  roadFace: {
    bedAlpha: 0.6,
    wornShade: 0.16,
    wornAlpha: 0.45,
    wornInsetPx: 18,
    tonePiecePx: 96,
    gritStepPx: 30,
    gritPerStep: 16,
    gritAlpha: 0.4,
    gritLitShade: 0.28,
    gritDarkShade: -0.25,
    kerbShade: -0.35,
    kerbAlpha: 0.5,
    kerbStepPx: 11,
    kerbInsetPx: 3,
  },
} as const;

/** The seed lane the engine itself reads for climate/continents
 *  (world.ts climateFor/continentFor: `this.sim.biomeField.fieldSeed`) —
 *  the tissue sampler's worldSeed parameter is the same number. */
function worldSeedOf(world: World): number {
  return world.sim.biomeField.fieldSeed >>> 0;
}

/** THE ONE PREDICATE every render-lane entry gates on. True only when the
 *  mode is on, a tissue sampler stands, seats exist, AND the active zone
 *  holds a seat (without its origin, world px are unaddressable — the town
 *  and every off-pair zone keep today's void frame even while the mode is
 *  on). Anything less = stand down structurally = today's draw,
 *  byte-identical. */
export function seamlessDrawActive(world: World): boolean {
  if (!world.seamless) return false;
  if (!getTissueSampler()) return false;
  const seats = world.seamlessRegions;
  if (!seats.length) return false;
  for (const s of seats) if (s.zoneId === world.zone.id) return true;
  return false;
}

/** The active zone's seat (callers have already passed seamlessDrawActive). */
function activeSeatOf(world: World): RegionSeat | null {
  for (const s of world.seamlessRegions) if (s.zoneId === world.zone.id) return s;
  return null;
}

// ---------------------------------------------------------------------------
// THE TISSUE CHUNKS — the country fill, baked at chunk grain.
// ---------------------------------------------------------------------------

interface TissueEntry { img: HTMLCanvasElement; at: number }

class SeamlessTissueChunks {
  /** Map insertion order as LRU (the ground.ts chunk-cache idiom). */
  private chunks = new Map<string, TissueEntry>();
  private seedRef = -1;
  private seq = 0;

  count(): number { return this.chunks.size; }
  bytes(): number { return this.chunks.size * SEAMLESS_CFG.chunkPx * SEAMLESS_CFG.chunkPx * 4; }

  clear(): void {
    for (const e of this.chunks.values()) releaseCanvas(e.img);
    this.chunks.clear();
  }

  /** Draw every baked chunk the view (+seedAhead margin) touches; bake the
   *  nearest missing ones under the per-frame budget. originX/Y = the active
   *  seat's world-px origin (zone-local = world − origin, one affine). */
  draw(ctx: CanvasRenderingContext2D, world: World, originX: number, originY: number,
    camX: number, camY: number, vw: number, vh: number): void {
    const sampler = getTissueSampler();
    if (!sampler) return;
    const seed = worldSeedOf(world);
    if (seed !== this.seedRef) { this.clear(); this.seedRef = seed; }
    // THE INTEGER-SNAP LAW (every world-keyed chunk lane): seats sit at
    // FRACTIONAL world px, and a drawImage at a fractional dest bleeds its
    // bilinear edge — a visible 1px column at every chunk boundary over
    // flat country. One rounded draw-origin per pass keeps all chunks on
    // one integer lattice (exact 720 spacing, seams closed); the ≤0.5px
    // whole-field shift is invisible and identical for every chunk.
    const dox = Math.round(originX), doy = Math.round(originY);
    const C = SEAMLESS_CFG.chunkPx, ahead = SEAMLESS_CFG.seedAhead;
    const wx0 = camX + originX, wy0 = camY + originY; // view origin in world px
    const x0 = Math.floor((wx0 - ahead) / C), x1 = Math.floor((wx0 + vw + ahead) / C);
    const y0 = Math.floor((wy0 - ahead) / C), y1 = Math.floor((wy0 + vh + ahead) / C);
    const ccx = (wx0 + vw / 2) / C, ccy = (wy0 + vh / 2) / C; // view center, chunk units
    const drawFloor = this.seq; // entries touched below are this frame's working set
    const missing: { cx: number; cy: number; d2: number }[] = [];
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = `${cx},${cy}`;
        const entry = this.chunks.get(key);
        if (entry) {
          this.chunks.delete(key); this.chunks.set(key, entry); // LRU touch
          entry.at = ++this.seq;
          ctx.drawImage(entry.img, cx * C - dox, cy * C - doy);
        } else {
          missing.push({ cx, cy, d2: (cx + 0.5 - ccx) ** 2 + (cy + 0.5 - ccy) ** 2 });
        }
      }
    }
    if (missing.length) {
      missing.sort((a, b) => a.d2 - b.d2); // nearest-first: the view center fills first
      const budget = Math.min(SEAMLESS_DRAW_CFG.tissueBakesPerFrame, missing.length);
      for (let i = 0; i < budget; i++) {
        const m = missing[i];
        const img = this.bake(sampler, seed, m.cx, m.cy);
        this.chunks.set(`${m.cx},${m.cy}`, { img, at: ++this.seq });
        ctx.drawImage(img, m.cx * C - dox, m.cy * C - doy);
      }
    }
    // Evict past the cap — but never a chunk this very frame drew (a wide dev
    // zoom's working set may exceed the cap; thrashing it would leave holes
    // that rebake forever, so the cap bounds SESSION growth, not the view).
    while (this.chunks.size > SEAMLESS_DRAW_CFG.maxTissueChunks) {
      const oldest = this.chunks.entries().next().value;
      if (oldest === undefined || oldest[1].at > drawFloor) break;
      releaseCanvas(oldest[1].img);
      this.chunks.delete(oldest[0]);
    }
  }

  /** One chunk: sample the tissue on the lattice, fill flat run-merged rows —
   *  then THE MASS DRESS (M2 wave 6) when the sampler carries the read and
   *  the master dial stands: the solid between wears country. Pass 2 lays
   *  quantized hillshade rows on non-walkable LAND (the relief as texture on
   *  top of the blend tones — the sea and the walkable corridors stay flat,
   *  so the way through reads); pass 3 scatters the flanking zones' own
   *  stamp glyphs (seats from massStampSeatsForChunk — the sampler-side pure
   *  helper the probe asserts through; gathered over the 3×3 neighborhood so
   *  canopies cross chunk seams whole). Still pure f(worldSeed, cx, cy) —
   *  same seed, same chunk, same pixels forever (the sampler's own contract
   *  plus the seat derivation's carry the proof). Dress-less samplers and
   *  the dial-off lane keep the wave-5 flat bake byte-identically. */
  private bake(sampler: TissueSampler, seed: number, cx: number, cy: number): HTMLCanvasElement {
    const t0 = performance.now();
    const C = SEAMLESS_CFG.chunkPx, L = SEAMLESS_DRAW_CFG.latticePx;
    const cells = Math.ceil(C / L);
    const c = document.createElement('canvas');
    c.width = C; c.height = C;
    const g = c.getContext('2d')!;
    const dress = SEAMLESS_DRAW_CFG.massDress ? massDressOf(sampler) : null;
    // THE ROAD LANE (M2 wave 8) gates on its own dial AND the carried read
    // actually knowing roads (a dev-swapped older sampler stands the lane
    // down structurally — the null-seam law at read grain).
    const rd: MassDressRead | null =
      dress && SEAMLESS_DRAW_CFG.roadDress && typeof dress.roadSegsForChunk === 'function'
        ? dress : null;
    // --- Pass 1: the flat tone fill (run-merged rows). Land mass leans
    // lighter than the sea when dressing (massMix vs waterMix) so the
    // texture above it reads; the shadeable lattice is remembered. With the
    // road lane standing, a road-centered lattice cell paints its UNDER
    // color instead of the flat lift (what the ground would be sans road —
    // massSansRoadAt, the sampler's own law): the opaque face strokes cover
    // the exact walkable ribbon, so only the cell's off-ribbon remainder
    // shows, wearing its true country — the 30px stair-step dies here.
    const shadeable: boolean[] | null = dress ? new Array(cells * cells).fill(false) : null;
    for (let j = 0; j < cells; j++) {
      const wy = cy * C + (j + 0.5) * L;
      let runStart = 0;
      let runColor = '';
      for (let i = 0; i < cells; i++) {
        const wx = cx * C + (i + 0.5) * L;
        const s = sampler(wx, wy, seed);
        let color: string;
        if (!s.walkable) {
          if (dress && dress.landAt(wx, wy, seed)) {
            color = mix(s.tone, SEAMLESS_DRAW_CFG.waterDark, SEAMLESS_DRAW_CFG.massMix);
            shadeable![j * cells + i] = true;
          } else {
            color = mix(s.tone, SEAMLESS_DRAW_CFG.waterDark, SEAMLESS_DRAW_CFG.waterMix);
          }
        } else if (s.road && rd) {
          if (!rd.landAt(wx, wy, seed)) {
            color = mix(s.tone, SEAMLESS_DRAW_CFG.waterDark, SEAMLESS_DRAW_CFG.waterMix);
          } else if (rd.massSansRoadAt(wx, wy, seed)) {
            color = mix(s.tone, SEAMLESS_DRAW_CFG.waterDark, SEAMLESS_DRAW_CFG.massMix);
            shadeable![j * cells + i] = true;
          } else {
            color = s.tone;
          }
        } else {
          color = s.road ? mix(s.tone, '#ffffff', SEAMLESS_DRAW_CFG.roadLighten) : s.tone;
        }
        if (color !== runColor) {
          if (i > runStart) { g.fillStyle = runColor; g.fillRect(runStart * L, j * L, (i - runStart) * L, L); }
          runStart = i; runColor = color;
        }
      }
      g.fillStyle = runColor;
      g.fillRect(runStart * L, j * L, (cells - runStart) * L, L);
    }
    if (dress) {
      // --- Pass 2: THE RELIEF SHADE — signed hillshade off the dress read
      // (the ONE SUN in MASSDRESS_CFG), quantized to shadeSteps so rows
      // run-merge and re-bakes stay byte-stable. Overlay only — the blend
      // tones remain the base.
      const steps = SEAMLESS_DRAW_CFG.shadeSteps, strength = SEAMLESS_DRAW_CFG.shadeStrength;
      for (let j = 0; j < cells; j++) {
        const wy = cy * C + (j + 0.5) * L;
        let runStart = 0;
        let runColor = '';
        for (let i = 0; i < cells; i++) {
          let color = '';
          if (shadeable![j * cells + i]) {
            const q = Math.round(dress.shadeAt(cx * C + (i + 0.5) * L, wy, seed) * steps) / steps;
            if (q > 0) color = `rgba(255,255,255,${(q * strength).toFixed(4)})`;
            else if (q < 0) color = `rgba(0,0,0,${(-q * strength).toFixed(4)})`;
          }
          if (color !== runColor) {
            if (i > runStart && runColor) { g.fillStyle = runColor; g.fillRect(runStart * L, j * L, (i - runStart) * L, L); }
            runStart = i; runColor = color;
          }
        }
        if (runColor) { g.fillStyle = runColor; g.fillRect(runStart * L, j * L, (cells - runStart) * L, L); }
      }
      // --- Pass 2.5: THE ROAD FACE (M2 wave 8) — the ribbon drawn as the
      // zones' own roads continuing: analytic exact-ribbon strokes (the
      // walkable verdict IS a round-capped stroke of the captured segments,
      // so the drawn edge is the tested edge with the canvas's own AA — no
      // lattice, no stair-step) in the gravelPath grammar, colored by the
      // flanks' own theme road tones. After the shade so the relief never
      // re-jags the smooth edge; before the stamps so a rim tree's canopy
      // may honestly overhang the way.
      if (rd) drawRoadFace(g, rd, sampler, seed, cx, cy);
      // --- Pass 3: THE STAMP SCATTER — this chunk's seats plus every
      // neighbor seat whose paint reach crosses the seam, y-sorted (the
      // painter's order, canonical), drawn as texture glyphs inked off the
      // local blend tone (shape carries the flank's identity, tone carries
      // the ground's — one country, no foreign palette). THE WAYSIDE DRESS
      // (M2 wave 8) rides the same gather: shoulder-band glyph seats from
      // the road lane's own pure helper, merged into the one y-sort so the
      // verge and the mass interleave honestly.
      const seats: MassStampSeat[] = [];
      const x0 = cx * C, y0 = cy * C;
      for (let ny = cy - 1; ny <= cy + 1; ny++) {
        for (let nx = cx - 1; nx <= cx + 1; nx++) {
          for (const s of massStampSeatsForChunk(dress, seed, nx, ny)) {
            const rr = s.r * SEAMLESS_DRAW_CFG.stampReachMul + 6;
            if (s.x + rr < x0 || s.x - rr > x0 + C || s.y + rr < y0 || s.y - rr > y0 + C) continue;
            seats.push(s);
          }
          if (!rd) continue;
          for (const s of waysideSeatsForChunk(rd, seed, nx, ny)) {
            const rr = s.r * SEAMLESS_DRAW_CFG.stampReachMul + 6;
            if (s.x + rr < x0 || s.x - rr > x0 + C || s.y + rr < y0 || s.y - rr > y0 + C) continue;
            seats.push(s);
          }
        }
      }
      seats.sort((a, b) => a.y - b.y || a.x - b.x);
      g.save();
      g.translate(-x0, -y0);
      for (const s of seats) drawMassStamp(g, sampler, seed, s);
      g.restore();
    }
    noteDressBake(performance.now() - t0);
    return c;
  }
}

// ---------------------------------------------------------------------------
// THE MASS GLYPHS (M2 wave 6) — the stamp scatter's texture vocabulary: tiny
// painter-drawn shapes (a canopy, a snag, a boulder, a column, a tuft) keyed
// by the mass kit's doodad-kind-shaped names (data/enclosure.ts — the
// vocabulary law). TEXTURE, never doodads: no collision, no effects, no
// registry rows — the tissue's refusal is the law, these only make it read
// as country. Every glyph draws off its seat's own forked Rng (varSeed), so
// a re-bake wobbles identically forever. Deltas ink off the LOCAL mass
// ground; THE ONE SUN (MASSDRESS_CFG.lightDir) orients every lit facet and
// highlight, so between-mass and a future border mass share one light.
// ---------------------------------------------------------------------------

interface MassInk { body: string; lit: string; dark: string }

function blob(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.beginPath();
  g.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  g.fill();
}

const MASS_GLYPHS: Record<string, (g: CanvasRenderingContext2D, ink: MassInk,
  x: number, y: number, r: number, rng: Rng) => void> = {
  tree(g, ink, x, y, r, rng) {
    const [lx, ly] = MASSDRESS_CFG.lightDir;
    g.fillStyle = ink.dark;
    blob(g, x - lx * r * 0.22, y - ly * r * 0.22, r * 0.95);
    g.fillStyle = ink.body;
    const lobes = rng.int(3, 4);
    for (let k = 0; k < lobes; k++) {
      const a = rng.range(0, Math.PI * 2), d = rng.range(0.12, 0.38) * r;
      blob(g, x + Math.cos(a) * d, y + Math.sin(a) * d, rng.range(0.5, 0.72) * r);
    }
    g.fillStyle = ink.lit;
    blob(g, x + lx * r * 0.3, y + ly * r * 0.3, r * 0.4);
  },
  dead_tree(g, ink, x, y, r, rng) {
    const footY = y + r * 0.5;
    const lean = rng.range(-0.3, 0.3);
    const topX = x + lean * r, topY = y - r * 1.05;
    g.strokeStyle = ink.lit;
    g.lineCap = 'round';
    g.lineWidth = Math.max(1.5, r * 0.14);
    g.beginPath(); g.moveTo(x, footY); g.lineTo(topX, topY); g.stroke();
    const n = rng.int(2, 3);
    g.lineWidth = Math.max(1, r * 0.09);
    for (let k = 0; k < n; k++) {
      const t = rng.range(0.4, 0.85);
      const bx = x + (topX - x) * t, by = footY + (topY - footY) * t;
      const side = k % 2 === 0 ? 1 : -1;
      const ang = -Math.PI / 2 + side * rng.range(0.55, 1.15);
      const len = r * rng.range(0.35, 0.6);
      g.beginPath(); g.moveTo(bx, by);
      g.lineTo(bx + Math.cos(ang) * len, by + Math.sin(ang) * len); g.stroke();
    }
  },
  rock(g, ink, x, y, r, rng) {
    const n = rng.int(5, 7);
    const pts: Array<[number, number]> = [];
    const a0 = rng.range(0, Math.PI * 2);
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * Math.PI * 2;
      const rr = r * rng.range(0.62, 1.0);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.82]);
    }
    g.fillStyle = ink.body;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < n; k++) g.lineTo(pts[k][0], pts[k][1]);
    g.closePath(); g.fill();
    const [lx, ly] = MASSDRESS_CFG.lightDir;
    let bi = 0, bs = -Infinity;
    for (let k = 0; k < n; k++) {
      const s = (pts[k][0] - x) * lx + (pts[k][1] - y) * ly;
      if (s > bs) { bs = s; bi = k; }
    }
    const p0 = pts[(bi + n - 1) % n], p1 = pts[bi], p2 = pts[(bi + 1) % n];
    g.fillStyle = ink.lit;
    g.beginPath(); g.moveTo(x, y);
    g.lineTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]);
    g.closePath(); g.fill();
  },
  cactus(g, ink, x, y, r, rng) {
    const w = r * 0.42, h = r * 1.5;
    g.fillStyle = ink.body;
    g.fillRect(x - w / 2, y - h, w, h);
    blob(g, x, y - h, w / 2);
    const side = rng.next() < 0.5 ? -1 : 1;
    const ay = y - h * rng.range(0.45, 0.7);
    const aw = w * 0.7, al = w * 0.9;
    g.fillRect(Math.min(x + side * w / 2, x + side * (w / 2 + al)), ay - aw / 2, al, aw);
    const ax = x + side * (w / 2 + al - aw / 2);
    g.fillRect(ax - aw / 2, ay - aw / 2 - h * 0.3, aw, h * 0.3 + aw / 2);
    g.fillStyle = ink.lit;
    blob(g, ax, ay - aw / 2 - h * 0.3, aw / 2);
  },
  brush(g, ink, x, y, r, rng) {
    const n = rng.int(3, 5);
    for (let k = 0; k < n; k++) {
      const a = rng.range(0, Math.PI * 2), d = rng.range(0, 0.7) * r;
      g.fillStyle = k > 0 && rng.next() < 0.35 ? ink.lit : ink.body;
      blob(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, rng.range(0.28, 0.5) * r);
    }
  },
  // --- THE WAYSIDE GLYPHS (M2 wave 8) — road-culture furniture on the
  // shoulder band (data/enclosure.ts WAYSIDE_GLYPHS; 'brush' above serves
  // as the verge tuft). Tone-local ink like every glyph — the deliberate
  // SHAPES (stacked courses, one true vertical) read as made things against
  // the mass's organic scatter.
  cairn(g, ink, x, y, r, rng) {
    // Stacked waymark stones: courses narrowing upward, each capped by a
    // lit top face leaning toward THE ONE SUN.
    const [lx] = MASSDRESS_CFG.lightDir;
    const courses = rng.int(2, 3);
    let cw = r * rng.range(0.85, 1.0), yy = y;
    for (let k = 0; k < courses; k++) {
      const ch = r * rng.range(0.34, 0.46);
      g.fillStyle = ink.body;
      g.beginPath();
      g.ellipse(x + rng.range(-0.08, 0.08) * r, yy - ch / 2, cw, ch * 0.62, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = ink.lit;
      g.beginPath();
      g.ellipse(x + lx * cw * 0.25, yy - ch * 0.72, cw * 0.5, ch * 0.28, 0, 0, Math.PI * 2);
      g.fill();
      yy -= ch * 0.78;
      cw *= rng.range(0.6, 0.72);
    }
  },
  post(g, ink, x, y, r, rng) {
    // A plain marker post: one near-vertical with a lit cap — deliberate
    // where the dead tree leans wild; the M0.5 mouth signposts keep their
    // boards (real doodads, another lane).
    const h = r * 2.1;
    const lean = rng.range(-0.06, 0.06);
    const topX = x + lean * h, topY = y - h;
    g.strokeStyle = ink.body;
    g.lineCap = 'round';
    g.lineWidth = Math.max(1.5, r * 0.26);
    g.beginPath(); g.moveTo(x, y + r * 0.2); g.lineTo(topX, topY); g.stroke();
    g.fillStyle = ink.lit;
    blob(g, topX, topY, Math.max(1, r * 0.22));
  },
};

/** One stamp: contact shadow, then the kind's glyph (unknown kinds read as
 *  stone — the kit map is curated, but data outlives painters). Ink derives
 *  from the seat's OWN blend tone under the mass lean — the local ground's
 *  palette, never a foreign one. */
function drawMassStamp(g: CanvasRenderingContext2D, sampler: TissueSampler,
  seed: number, s: MassStampSeat): void {
  const ink = SEAMLESS_DRAW_CFG.stampInk;
  const base = mix(sampler(s.x, s.y, seed).tone, SEAMLESS_DRAW_CFG.waterDark, SEAMLESS_DRAW_CFG.massMix);
  const inks: MassInk = { body: shade(base, ink.body), lit: shade(base, ink.lit), dark: shade(base, ink.dark) };
  g.fillStyle = `rgba(0,0,0,${ink.shadowAlpha})`;
  g.beginPath();
  g.ellipse(s.x, s.y + s.r * 0.15, s.r * 0.8, s.r * 0.42, 0, 0, Math.PI * 2);
  g.fill();
  (MASS_GLYPHS[s.kind] ?? MASS_GLYPHS.rock)(g, inks, s.x, s.y, s.r, new Rng(s.varSeed));
}

// ---------------------------------------------------------------------------
// THE ROAD FACE (M2 wave 8) — the ribbon drawn as the zones' own roads
// continuing. THE EXACT-RIBBON LAW: the walkable verdict (segDist ≤
// roadHalfPx) IS geometrically a round-capped stroke of the captured
// segments at width 2×roadHalfPx — so the face strokes THAT, and the drawn
// edge equals the tested edge to the canvas's own anti-aliasing (sub-cell
// contouring at its limit; the walkable law is consulted, never changed).
// The dress grammar is gravelPath's own (painters.ts): bed band, worn
// center, two-tone grit, kerb stones — recolored per stretch by the flanks'
// theme road tones through roadToneAt, so the crossing reads as ONE road
// changing country exactly as the ground does. Every stroke and dot derives
// from GLOBAL geometry (the segments' own arc lattices + gravelPath's
// position-hash grit), so neighboring chunks paint identical pixels at the
// seam and re-bakes are byte-stable forever.
// ---------------------------------------------------------------------------

function drawRoadFace(g: CanvasRenderingContext2D, rd: MassDressRead,
  sampler: TissueSampler, seed: number, cx: number, cy: number): void {
  const segs = rd.roadSegsForChunk(cx, cy);
  if (!segs.length) return;
  const RF = SEAMLESS_DRAW_CFG.roadFace;
  const C = SEAMLESS_CFG.chunkPx;
  const x0 = cx * C, y0 = cy * C, x1 = x0 + C, y1 = y0 + C;
  const pad = SEAMLESS_CFG.roadHalfPx;
  const reach = pad + 6; // stroke half-width + AA slack (the cull's honesty bound)
  // --- The tone pieces: each segment cut on its OWN arc lattice
  // (tonePiecePx), colors resolved at piece midpoints — the flank gradient
  // at draw grain. Composites are precomputed (bed = road over ground at
  // bedAlpha; worn = the lightened center over the bed), so strokes land
  // opaque and piece joins/crossings never double-darken.
  interface FacePiece { ax: number; ay: number; bx: number; by: number; bed: string; worn: string }
  const pieces: FacePiece[] = [];
  for (const s of segs) {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const n = Math.max(1, Math.ceil(len / RF.tonePiecePx));
    for (let k = 0; k < n; k++) {
      const ax = s.ax + dx * (k / n), ay = s.ay + dy * (k / n);
      const bx = s.ax + dx * ((k + 1) / n), by = s.ay + dy * ((k + 1) / n);
      if (Math.max(ax, bx) + reach < x0 || Math.min(ax, bx) - reach > x1
        || Math.max(ay, by) + reach < y0 || Math.min(ay, by) - reach > y1) continue;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const road = rd.roadToneAt(mx, my, seed);
      const bed = mix(sampler(mx, my, seed).tone, road, RF.bedAlpha);
      pieces.push({ ax, ay, bx, by, bed, worn: mix(bed, shade(road, RF.wornShade), RF.wornAlpha) });
    }
  }
  if (!pieces.length) return;
  g.save();
  g.translate(-x0, -y0); // world coords onto the chunk canvas (pass 3's own idiom)
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // Pass A — every piece's BED, then Pass B — every WORN center (gravelPath's
  // own two-phase order, so crossings merge instead of layering).
  g.lineWidth = pad * 2;
  for (const p of pieces) {
    g.strokeStyle = p.bed;
    g.beginPath(); g.moveTo(p.ax, p.ay); g.lineTo(p.bx, p.by); g.stroke();
  }
  g.lineWidth = Math.max(8, (pad - RF.wornInsetPx) * 2);
  for (const p of pieces) {
    g.strokeStyle = p.worn;
    g.beginPath(); g.moveTo(p.ax, p.ay); g.lineTo(p.bx, p.by); g.stroke();
  }
  // Pass C — THE GRIT: virtual discs at the discrete lay step along each
  // segment's arc, pebbles scattered by gravelPath's own position-hash math
  // (two-tone, oriented ellipses) — pure f(segment), seam-free.
  for (const s of segs) {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const nd = Math.max(1, Math.round(len / RF.gritStepPx));
    for (let k = 0; k <= nd; k++) {
      const px = s.ax + dx * (k / nd), py = s.ay + dy * (k / nd);
      if (px + reach < x0 || px - reach > x1 || py + reach < y0 || py - reach > y1) continue;
      const road = rd.roadToneAt(px, py, seed);
      const lit = shade(road, RF.gritLitShade), dark = shade(road, RF.gritDarkShade);
      const dseed = ((px * 31 + py * 17) | 0) >>> 0; // gravelPath's own hash
      g.globalAlpha = RF.gritAlpha;
      for (let i = 0; i < RF.gritPerStep; i++) {
        const a = hash01(i, dseed) * Math.PI * 2;
        const rr = Math.sqrt(hash01(i, dseed + 5)) * pad * 0.8;
        g.fillStyle = i % 2 ? lit : dark;
        g.beginPath();
        g.ellipse(px + Math.cos(a) * rr, py + Math.sin(a) * rr,
          1.6 + hash01(i, dseed + 9) * 1.6, 1.2 + hash01(i, dseed + 13), a, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  // Pass D — THE KERB: darker edge stones marched along BOTH ribbon edges
  // (the band-rim survivors of gravelPath's per-disc rim rings), jittered
  // along the way by the same hash family.
  g.globalAlpha = RF.kerbAlpha;
  for (const s of segs) {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const ux = dx / len, uy = dy / len;
    const edge = pad - RF.kerbInsetPx;
    const nk = Math.max(1, Math.round(len / RF.kerbStepPx));
    for (let k = 0; k <= nk; k++) {
      const px = s.ax + dx * (k / nk), py = s.ay + dy * (k / nk);
      if (px + reach < x0 || px - reach > x1 || py + reach < y0 || py - reach > y1) continue;
      const kseed = ((px * 29 + py * 13) | 0) >>> 0;
      g.fillStyle = shade(rd.roadToneAt(px, py, seed), RF.kerbShade);
      for (let side = -1; side <= 1; side += 2) {
        const jit = (hash01(k, kseed + (side < 0 ? 3 : 7)) - 0.5) * RF.kerbStepPx * 0.6;
        g.beginPath();
        g.arc(px - uy * side * edge + ux * jit, py + ux * side * edge + uy * jit,
          1.4 + hash01(k, kseed + 11 + side) * 1.4, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  g.globalAlpha = 1;
  g.restore();
}

/** The dress bake's own clock (last 48 tissue-chunk bakes, dress or flat —
 *  the before/after A/B reads this): p50/max ms + the dial's stance. */
const dressBakeMs: number[] = [];
function noteDressBake(ms: number): void {
  dressBakeMs.push(ms);
  if (dressBakeMs.length > 48) dressBakeMs.shift();
}
export function seamlessTissueDressStats(): { n: number; p50: number; max: number; dress: boolean } {
  const a = [...dressBakeMs].sort((x, y) => x - y);
  return {
    n: a.length,
    p50: a.length ? a[Math.floor(a.length / 2)] : 0,
    max: a.length ? a[a.length - 1] : 0,
    dress: !!SEAMLESS_DRAW_CFG.massDress,
  };
}
/** Dev/A-B lever: drop every baked tissue chunk (and the clock) so a dial
 *  change re-bakes the view in place — never needed by play (the caches are
 *  seed-keyed and the dials are constants in a session). */
export function seamlessTissueReset(): void {
  tissue.clear();
  dressBakeMs.length = 0;
}

// ---------------------------------------------------------------------------
// THE AWAY BODIES (M1 wave 2) — the neighbor's standing doodads drawn by the
// REAL painters, baked at ground-chunk grain over the world lattice, drawn
// OVER its world-keyed full-fidelity ground. The M0 flat-disc pass retired
// into this (module header carries the laws). Canopy CROWNS are the canopy
// layer's own seat (render/vis/canopy.ts) — this lane paints what the live
// drawDoodads pass paints, nothing above it.
// ---------------------------------------------------------------------------

interface BodyChunkEntry {
  /** null = the bake culled NOTHING in reach (the empty-country marker —
   *  most chunks of a sparse zone): drawn as nothing, costs no bytes,
   *  remembered so the cull never re-runs per frame. */
  img: HTMLCanvasElement | null;
  at: number;
  mint: SeamlessMint;
}

/** Per-region memo for the body lane, invalidated by mint identity: the
 *  widest cull reach any doodad in the layout needs (the chunk-lattice
 *  window's expansion — bodies legitimately overreach the layout rect). */
interface BodyStatics { mint: SeamlessMint; reach: number }

/** A doodad's conservative paint reach past its center for the chunk cull:
 *  the live view cull's own posture (radius + RENDER_CULL_PAD-class
 *  margin), widened by a blend bed's true reach where the kind declares one
 *  (the ground gather's own pad formula). */
function bodyCullPadOf(d: Doodad, def: DoodadVisualDef | undefined): number {
  let pad = d.radius + SEAMLESS_DRAW_CFG.bodyCullPad;
  const blend = def?.blend;
  if (blend) {
    pad = Math.max(pad, blend.feather + d.radius * (blend.mode === 'path' ? 3.7 : 1.4) + 8);
  }
  return pad;
}

class SeamlessBodyChunks {
  /** `zoneId:cx,cy` in WORLD chunk coords at the ground grain — the wave-1
   *  peer-key idiom; Map insertion order as LRU (delete+set touch). */
  private chunks = new Map<string, BodyChunkEntry>();
  private statics = new Map<string, BodyStatics>();
  private seq = 0;
  private bakesLeft = 0;
  private drawFloor = 0;

  count(): number { return this.chunks.size; }
  bytes(): number {
    let b = 0;
    for (const e of this.chunks.values()) if (e.img) b += e.img.width * e.img.height * 4;
    return b;
  }

  clear(): void {
    for (const e of this.chunks.values()) if (e.img) releaseCanvas(e.img);
    this.chunks.clear();
    this.statics.clear();
  }

  /** Open the frame's bake budget + eviction floor (drawSeamlessCountry
   *  calls this once before the seat loop; every away seat spends from the
   *  same purse — the shared-ledger idiom at count grain). */
  beginFrame(): void {
    this.bakesLeft = SEAMLESS_DRAW_CFG.bodyBakesPerFrame;
    this.drawFloor = this.seq;
  }

  private staticsFor(zoneId: string, mint: SeamlessMint): BodyStatics {
    const hit = this.statics.get(zoneId);
    if (hit && hit.mint === mint) return hit;
    let reach: number = SEAMLESS_DRAW_CFG.bodyCullPad;
    for (const d of mint.layout.doodads) {
      reach = Math.max(reach, bodyCullPadOf(d, DOODAD_VISUALS[d.kind]));
    }
    const st: BodyStatics = { mint, reach };
    this.statics.set(zoneId, st);
    return st;
  }

  /** Draw one away seat's body chunks where its footprint (+overreach)
   *  touches the view. Doodads come from the placement lane's OWN resident
   *  mint (World.seamlessMints — the same layout the threshold sweep lands
   *  on, so drawn == arrived-at); bakes are lazy, view-gated and budgeted;
   *  a re-minted record (the exits-key refresh) re-bakes by mint identity
   *  while the old image keeps drawing (the ground's own converge idiom). */
  draw(ctx: CanvasRenderingContext2D, world: World, seat: RegionSeat,
    originX: number, originY: number, camX: number, camY: number, vw: number, vh: number): void {
    const def = world.zoneMap[seat.zoneId];
    const mint = world.seamlessMints.get(seat.zoneId);
    if (!def || def.boundless || !mint) return; // no mint = stand down
    const C = VIS_CFG.ground.chunk;
    const w = mint.span.w || def.size.w, h = mint.span.h || def.size.h;
    const st = this.staticsFor(seat.zoneId, mint);
    // View ∩ footprint+overreach, world px. NO silhouette clip here, on
    // purpose: a rim tree's skirt spilling onto the tissue is what an
    // embedded place looks like (the ellipse corner stays body-sparse
    // because no doodad STANDS there — the mint's own geometry is the law).
    const wx0 = Math.max(camX + originX, seat.originPx.x - st.reach);
    const wy0 = Math.max(camY + originY, seat.originPx.y - st.reach);
    const wx1 = Math.min(camX + vw + originX, seat.originPx.x + w - 1 + st.reach);
    const wy1 = Math.min(camY + vh + originY, seat.originPx.y + h - 1 + st.reach);
    if (wx1 < wx0 || wy1 < wy0) return;
    // THE INTEGER-SNAP LAW (the tissue draw's own note): one rounded
    // draw-origin per pass, so every chunk blits on one integer lattice.
    const dox = Math.round(originX), doy = Math.round(originY);
    const x0 = Math.floor(wx0 / C), x1 = Math.floor(wx1 / C);
    const y0 = Math.floor(wy0 / C), y1 = Math.floor(wy1 / C);
    const ccx = (wx0 + wx1) / 2 / C, ccy = (wy0 + wy1) / 2 / C;
    const missing: { key: string; cx: number; cy: number; d2: number }[] = [];
    const stale: { entry: BodyChunkEntry; cx: number; cy: number }[] = [];
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = `${seat.zoneId}:${cx},${cy}`;
        const entry = this.chunks.get(key);
        if (!entry) {
          missing.push({ key, cx, cy, d2: (cx + 0.5 - ccx) ** 2 + (cy + 0.5 - ccy) ** 2 });
          continue;
        }
        this.chunks.delete(key); this.chunks.set(key, entry); // LRU touch
        entry.at = ++this.seq;
        if (entry.mint !== mint) stale.push({ entry, cx, cy });
        if (entry.img) ctx.drawImage(entry.img, cx * C - dox, cy * C - doy);
      }
    }
    missing.sort((a, b) => a.d2 - b.d2); // nearest-first: the view center dresses first
    for (const m of missing) {
      if (this.bakesLeft <= 0) break;
      this.bakesLeft--;
      const img = this.bake(world, def, mint, seat, m.cx, m.cy);
      this.chunks.set(m.key, { img, at: ++this.seq, mint });
      if (img) ctx.drawImage(img, m.cx * C - dox, m.cy * C - doy); // no one-frame hole
    }
    for (const s of stale) {
      if (this.bakesLeft <= 0) break;
      this.bakesLeft--;
      const img = this.bake(world, def, mint, seat, s.cx, s.cy);
      if (s.entry.img && s.entry.img !== img) releaseCanvas(s.entry.img);
      s.entry.img = img;
      s.entry.mint = mint;
    }
    // Evict past the cap — never an entry this frame touched (the
    // working-set guard: the cap bounds SESSION growth, not the view).
    while (this.chunks.size > SEAMLESS_DRAW_CFG.maxBodyChunks) {
      const oldest = this.chunks.entries().next().value;
      if (oldest === undefined || oldest[1].at > this.drawFloor) break;
      if (oldest[1].img) releaseCanvas(oldest[1].img);
      this.chunks.delete(oldest[0]);
    }
  }

  /** Bake one chunk of one away region's bodies through the REAL painter
   *  loop — the drawDoodads mirror at bake posture, against the mint via
   *  THE SCOPED WORLD SWAP (ground.ts bakeAwayChunk's idiom + walk, so
   *  litPolygon's halo-pooling and every zone-shaped painter read serve the
   *  MINT's geometry). Runs between sim updates like every render bake;
   *  restored in finally. Returns null when nothing reaches the chunk. */
  private bake(world: World, def: ZoneDef, mint: SeamlessMint, seat: RegionSeat,
    cx: number, cy: number): HTMLCanvasElement | null {
    const C = VIS_CFG.ground.chunk;
    const ox = cx * C - seat.originPx.x, oy = cy * C - seat.originPx.y; // chunk top-left, zone-local
    // THE TIER FILTER at arrival posture: a covered-exposure zone shows its
    // ground deck (tier 0) — the live pass's own filter with the hero at
    // the arrival tier (nobody stands in an away region to say otherwise).
    const hideTier = def.tiers?.exposure === 'covered' ? 1 : null;
    // --- Cull: everything whose paint reach touches this chunk. -----------
    type Grp = { kind: string; list: Doodad[]; def: DoodadVisualDef | undefined };
    const byKind = new Map<string, Grp>();
    let any = false;
    for (const d of mint.layout.doodads) {
      if (d.gone || d.felled) continue; // mint bodies stand; belt for evap/fell state
      if (hideTier !== null && (d.tier ?? 0) === hideTier) continue;
      const vdef = DOODAD_VISUALS[d.kind];
      const pad = bodyCullPadOf(d, vdef);
      if (d.pos.x + pad < ox || d.pos.x - pad > ox + C
        || d.pos.y + pad < oy || d.pos.y - pad > oy + C) continue;
      let g = byKind.get(d.kind);
      if (!g) { g = { kind: d.kind, list: [], def: vdef }; byKind.set(d.kind, g); }
      g.list.push(d);
      any = true;
    }
    const roofs = (mint.layout.structures ?? []).some(s2 =>
      s2.roofs.some(r => r.x < ox + C && r.x + r.w > ox && r.y < oy + C && r.y + r.h > oy));
    if (!any && !roofs) return null; // empty country — the null marker
    const c = document.createElement('canvas');
    c.width = C; c.height = C;
    const g = c.getContext('2d')!;
    g.translate(-ox, -oy);
    // THE SCOPED WORLD SWAP — the mint presents as "the world" for one bake.
    const keepZone = world.zone, keepDoodads = world.doodads,
      keepStructures = world.structures, keepWalk = world.walk;
    world.zone = def;
    world.doodads = mint.layout.doodads;
    world.structures = mint.layout.structures ?? [];
    world.walk = mint.layout.walk ?? null;
    try {
      this.paintBodies(g, world, def, mint, byKind);
    } finally {
      world.zone = keepZone; world.doodads = keepDoodads;
      world.structures = keepStructures; world.walk = keepWalk;
    }
    return c;
  }

  /** The drawDoodads paint loop at bake posture (see the module header for
   *  what the still forgoes and why). Order mirrors the live pass exactly:
   *  per kind ascending def order — blend-live underlay, contact shadows,
   *  bakeWhole sprite or the kind's painter — then structure roofs. */
  private paintBodies(g: CanvasRenderingContext2D, world: World, def: ZoneDef,
    mint: SeamlessMint, byKind: Map<string, { kind: string; list: Doodad[]; def: DoodadVisualDef | undefined }>): void {
    const shAlphaMul = def.theme.shadows?.alphaMul ?? 1;
    // THE BAKE POSTURE (ground.ts's static-layer env): time 0, no
    // shadowGate (ungoverned), no labelSink (wordless).
    const env: PaintEnv = { ctx: g, theme: def.theme, time: 0, world };
    const groups = [...byKind.values()].sort((a, b) => (a.def?.order ?? 50) - (b.def?.order ?? 50));
    for (const grp of groups) {
      if (!grp.def) {
        // Registry-less kind: the live pass's warned generic disc (it warns
        // there; the bake stays quiet — the region going active will speak).
        PAINTERS.fallback(env, grp.list, { painter: 'fallback', order: 50 });
        continue;
      }
      // (No sun longShadow: it spins with the day — a frozen cast lies.)
      if (grp.def.blend && (grp.def.blend.live || !VIS_CFG.ground.bakeBlend)) {
        // Static beds are already IN the wave-1 ground chunks; only the
        // live-bed lane paints here — the live pass's own condition. Path
        // mode needs the CHAIN intact (the ground gather's wholeChain law).
        const list = grp.def.blend.mode === 'path'
          ? mint.layout.doodads.filter(d => d.kind === grp.kind && !d.gone && !d.felled)
          : grp.list;
        paintBlendUnderlay(env, list, grp.def);
      }
      if (grp.def.shadow && !VIS_ABLATE.has('shadows')) {
        paintGroupShadows(env, grp.list, grp.def.shadow * shAlphaMul);
      }
      if (grp.def.bakeWhole && VIS_CFG.ground.bakeDoodads) paintBakedWhole(env, grp.list, grp.def);
      else (PAINTERS[grp.def.painter] ?? PAINTERS.fallback)(env, grp.list, grp.def);
    }
    // --- Structure roofs: the drawRoofs geometry at standing alpha (nobody
    // is inside an away region — no fade, no veil composite; under the
    // canopy layer's crowns, which is the true aerial read). -------------
    for (const st of mint.layout.structures ?? []) {
      if (!st.roofs.length) continue;
      const style = roofStyle(st.roofStyle);
      const fade = style.alpha;
      if (fade < 0.03) continue;
      g.globalAlpha = fade;
      for (const r of st.roofs) {
        g.fillStyle = style.fill;
        g.fillRect(r.x, r.y, r.w, r.h);
        const lit = shade(style.fill, 0.16), dark = shade(style.fill, -0.22);
        g.globalAlpha = fade * 0.55;
        if (r.w >= r.h) {
          g.fillStyle = lit; g.fillRect(r.x, r.y, r.w, r.h / 2);
          g.fillStyle = dark; g.fillRect(r.x, r.y + r.h / 2, r.w, r.h / 2);
        } else {
          g.fillStyle = lit; g.fillRect(r.x, r.y, r.w / 2, r.h);
          g.fillStyle = dark; g.fillRect(r.x + r.w / 2, r.y, r.w / 2, r.h);
        }
        g.globalAlpha = fade * 0.7;
        g.strokeStyle = shade(style.fill, 0.3);
        g.lineWidth = 1.5;
        g.beginPath();
        if (r.w >= r.h) { g.moveTo(r.x + 3, r.y + r.h / 2); g.lineTo(r.x + r.w - 3, r.y + r.h / 2); }
        else { g.moveTo(r.x + r.w / 2, r.y + 3); g.lineTo(r.x + r.w / 2, r.y + r.h - 3); }
        g.stroke();
        g.globalAlpha = fade;
        g.strokeStyle = style.edge;
        g.lineWidth = 3;
        g.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
        g.lineWidth = 1;
        g.globalAlpha = fade * 0.45;
        if (r.w >= r.h) {
          for (let x = r.x + 12; x < r.x + r.w; x += 12) {
            g.beginPath(); g.moveTo(x, r.y); g.lineTo(x, r.y + r.h); g.stroke();
          }
        } else {
          for (let y = r.y + 12; y < r.y + r.h; y += 12) {
            g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke();
          }
        }
        g.globalAlpha = fade;
      }
      g.globalAlpha = 1;
    }
  }
}

// (awayShapeOf is RETIRED: the mint record now carries `shape`, stamped
// inside seamlessMintResident's own scoped swap — the FNV replication of
// makeArena's pick, and its drift risk, die with it. Both former consumers
// read mint.shape.)

// ---------------------------------------------------------------------------
// The module singletons + their steward rows (module caches register at load
// — render/vis/caches.ts's own idiom). World-keyed on purpose: no onZoneSwap
// (tissue/neighbor bakes stay valid across a threshold; the caps bound them),
// run swap releases everything.
// ---------------------------------------------------------------------------

const tissue = new SeamlessTissueChunks();
const bodies = new SeamlessBodyChunks();

registerVisCache({
  id: 'seamlessTissue',
  count: () => tissue.count(),
  bytes: () => tissue.bytes(),
  onRunSwap: () => tissue.clear(),
});
registerVisCache({
  id: 'seamlessBodies',
  count: () => bodies.count(),
  bytes: () => bodies.bytes(),
  onRunSwap: () => bodies.clear(),
});

// ---------------------------------------------------------------------------
// THE COUNTRY DRAW — drawFloor's tail in seamless mode (in place of the
// union mask + void frame): tissue, then the neighbors, all clipped OUTSIDE
// the active union so the live layout's own ground always wins the overlap.
// ---------------------------------------------------------------------------

/** Clip to OUTSIDE one active-union member — the voidFrame.ts clipOutside
 *  idiom verbatim: sequential calls intersect, outside(base) ∩ outside(A) ∩ …
 *  = outside the whole union (overlap-safe where one even-odd fill is not). */
function clipOutsideMember(ctx: CanvasRenderingContext2D, w: number, h: number,
  ell: boolean, pc: BoundsPiece | null): void {
  ctx.beginPath();
  ctx.rect(-1e6, -1e6, 2e6, 2e6);
  if (!pc) {
    if (ell) ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else ctx.rect(0, 0, w, h);
  } else if ((pc.shape ?? 'rect') === 'ellipse') {
    ctx.ellipse(pc.x + pc.w / 2, pc.y + pc.h / 2, pc.w / 2, pc.h / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.rect(pc.x, pc.y, pc.w, pc.h);
  }
  ctx.clip('evenodd');
}

/** Everything past the active rim, seamless-mode: the tissue country, then
 *  each neighbor's full-fidelity world-keyed ground (the GroundRenderer's
 *  own away pass — chunks are cache peers with the active zone's, so the
 *  threshold crossing pops nothing), then its REAL painted bodies over that
 *  (SeamlessBodyChunks — M1 wave 2). Runs under the world transform with
 *  the same (cam, view) frame drawVoidFrame takes; the caller has already
 *  gated on seamlessDrawActive and lends its ground renderer (the renderer
 *  owns the one instance). */
export function drawSeamlessCountry(ctx: CanvasRenderingContext2D, world: World,
  ground: GroundRenderer, camX: number, camY: number, vw: number, vh: number): void {
  const seat = activeSeatOf(world);
  if (!seat) return; // stand down (the predicate said yes a frame ago; races are harmless)
  const az = world.arena;
  const ell = az.shape === 'ellipse';
  ctx.save();
  // Paint only the view, and only OUTSIDE the active union.
  ctx.beginPath();
  ctx.rect(camX, camY, vw, vh);
  ctx.clip();
  clipOutsideMember(ctx, az.w, az.h, ell, null);
  for (const pc of activePieces(az)) clipOutsideMember(ctx, az.w, az.h, ell, pc);
  tissue.draw(ctx, world, seat.originPx.x, seat.originPx.y, camX, camY, vw, vh);
  bodies.beginFrame(); // one bake purse + eviction floor across every seat
  for (const s of world.seamlessRegions) {
    if (s.zoneId === world.zone.id) continue;
    ground.drawSeamlessAway(ctx, world, s, seat.originPx.x, seat.originPx.y, camX, camY, vw, vh);
    bodies.draw(ctx, world, s, seat.originPx.x, seat.originPx.y, camX, camY, vw, vh);
  }
  ctx.restore();
}

// (The interim dev proof rig — ?seamrig, which installed the sampler and a
// current-zone seat fill before the placement lane landed — is gone: the
// real installer (World.seamlessEnsureBoot) stands, and a second seat-filler
// would fight the resident pair it picks. Plain ?seamless is the whole boot.)
