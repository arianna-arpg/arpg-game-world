// ---------------------------------------------------------------------------
// BIOME FIELD overlay — renders the world's biome substrate as a heat-map wash.
//
// A pure WorldOverlay (like weather/faction): it draws the coordinate-space biome
// field (biomeAt) as a faint coloured grid UNDER the node graph, so the world map
// reads like a living biome world (Minecraft-ish), not just a node web.
//
// THE TRANSIENCE LAW (docs/engine/transience.md) governs its WARPS — the local
// heat-source modifiers world events push while they hold ground:
//   - Every warp is KEYED + OWNED + RECONCILED: setWarp (replace-by-id) while the
//     event lives, release (gradual fade at BIOME_FIELD_CFG.warpFadePerSec) or
//     unwarp (instant) when it ends. The engine's warp sweep re-asserts live
//     events' warps and releases dead ones every beat, so every ending — kill,
//     burnout, collapse, or a resumed save — heals the wash by construction.
//   - Warps are PRESENTATION + ATTRIBUTION only: the map wash recolors and the
//     zone-info box names the turner, but sampleBiome/sampleDepth — THE MINT
//     SAMPLERS worldgen reads — return the BASE field. A temporary event can
//     never bake its biome into newly-charted ground; the geology is sacred.
//   - There is no unkeyed/permanent push. A lasting scar on the world is a
//     deliberate, player-authored act (see the doctrine doc), never a warp.
// ---------------------------------------------------------------------------

import type { ZoneDef } from '../data/zones';
import { BIOMES, BIOME_FIELD_CFG, OCEAN_BIOME, biomeAt, biomeDepth, fieldNoise, resetFieldPickMemo, type BiomeFieldModifier } from './biomes';
import { resetCourseMemo } from './courses';
import { coordDist, type MapCoord } from './coords';
import { NO_BIAS, type MapLayer, type SpawnBias, type WorldOverlay } from './overlay';
import { registerZoneInfoSource } from './zoneInfo';

export class BiomeField implements WorldOverlay {
  readonly id = 'biomefield';
  /** Transient BY DERIVATION: the base field is pure seed math, and its live
   *  WARPS are re-asserted each beat by their owners (mycelia's transformed
   *  zones, the warp sweep's live-event ensure) from state those systems
   *  persist themselves. A released warp's fade is presentation courtesy and
   *  deliberately does not survive a resume — the healed truth does. */
  readonly persistence = 'transient' as const;
  readonly mapLabel = 'Biomes';
  /** Active local warps of the field (the heat-source seam — the Mycelia bloom,
   *  a crusade's anchored claim, an incursion's blight all push these). */
  private readonly modifiers: BiomeFieldModifier[] = [];
  /** Warps whose owner has RELEASED them — strength fades at warpFadePerSec
   *  until gone (the dithered blend speckles the heal away organically). */
  private readonly releasing = new Set<string>();

  constructor(private readonly seed: number) {
    // A fresh field = a fresh world: drop the module-level cell-pick memo so
    // nothing from a previous run (or a dev-session module swap) lingers.
    // Course polylines ride the same lifecycle (their anchors — gate zones —
    // are per-run too).
    resetFieldPickMemo();
    resetCourseMemo();
  }

  /** The biome-field seed — a Field mega-zone stashes it on its def so the layout
   *  generator can re-sample raw biomeAt to rasterize the exact region silhouette. */
  get fieldSeed(): number { return this.seed; }

  /** Fade released warps toward gone (the "volcano cooling" half of the law);
   *  the base substrate itself is static seed math. */
  update(dt: number): void {
    if (!this.releasing.size) return;
    for (let i = this.modifiers.length - 1; i >= 0; i--) {
      const m = this.modifiers[i];
      if (!this.releasing.has(m.id)) continue;
      m.strength -= BIOME_FIELD_CFG.warpFadePerSec * dt;
      if (m.strength <= 0) {
        this.modifiers.splice(i, 1);
        this.releasing.delete(m.id);
      }
    }
  }
  onNodeCharted(): void { /* the field is global; nothing per-node to seed */ }
  affectSpawns(): SpawnBias { return NO_BIAS; }

  /** Paint the biome field as a faint coloured grid under the charted graph.
   *
   *  THE LATTICE IS WORLD-ANCHORED: cells sit at absolute multiples of a step
   *  from a LADDER (renderCell × 2^k, k chosen so the charted envelope fits the
   *  cell budget). Charting new ground only ADDS rows/columns — existing cells
   *  never move, so the heat map never "randomly re-tiles" as the map grows
   *  (the old lattice divided the visited bounding box, which re-sampled every
   *  cell at new coords on every envelope expansion). A span doubling coarsens
   *  the grid ONCE, with new cells nesting 4-into-1 over the old. */
  renderMap(nodes: ZoneDef[]): MapLayer {
    if (!nodes.length) return { under: '', over: '' };
    const M = BIOME_FIELD_CFG.cellSpan * 2; // extend past charted ground (the world exists beyond)
    const xs = nodes.map(n => n.map.x), ys = nodes.map(n => n.map.y);
    const minX = Math.min(...xs) - M, maxX = Math.max(...xs) + M;
    const minY = Math.min(...ys) - M, maxY = Math.max(...ys) + M;
    const MAX_CELLS = 40; // per axis — the SVG is rebuilt on map refresh, keep it light
    let step = BIOME_FIELD_CFG.renderCell;
    while ((maxX - minX) / step > MAX_CELLS || (maxY - minY) / step > MAX_CELLS) step *= 2;
    const x0 = Math.floor(minX / step) * step, y0 = Math.floor(minY / step) * step;
    let under = '';
    for (let x = x0; x < maxX; x += step) {
      for (let y = y0; y < maxY; y += step) {
        const s = this.compose({ x: x + step / 2, y: y + step / 2 });
        const info = BIOMES[s.biome];
        if (!info) continue;
        // Land washes faint (a heat-map tint); the sea paints heavy (its own
        // washOpacity) so open water reads as WATER, hiding nothing beneath —
        // there is no land lattice under the ocean to peek at.
        under += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" `
          + `width="${(step + 0.6).toFixed(1)}" height="${(step + 0.6).toFixed(1)}" fill="${info.mapColor}" fill-opacity="${(info.washOpacity ?? 0.10).toFixed(2)}"/>`;
        // WARPED land pulses: a live event is turning this ground's LOOK
        // (Mycelia, an incursion's blight). The breathing outline ATTRIBUTES
        // the change — the heat map never silently recolors.
        if (s.warped) {
          under += `<rect x="${(x + 1).toFixed(1)}" y="${(y + 1).toFixed(1)}" `
            + `width="${(step - 2).toFixed(1)}" height="${(step - 2).toFixed(1)}" fill="none" `
            + `stroke="${info.mapColor}" stroke-width="1.5">`
            + `<animate attributeName="stroke-opacity" values="0.15;0.6;0.15" dur="2.8s" repeatCount="indefinite"/></rect>`;
        }
      }
    }
    return { under, over: '' };
  }

  /** KEYED warp (replace-or-push): the ONE way ground turns. An owner re-pushes
   *  its modifier as its event shifts (idempotent by id) and the warp sweep
   *  re-asserts it while the event lives — a push always REVIVES a mid-fade
   *  release (the event isn't over after all). */
  setWarp(id: string, mod: Omit<BiomeFieldModifier, 'id'> & { id?: string }): void {
    this.releasing.delete(id);
    const i = this.modifiers.findIndex(m => m.id === id);
    const m = { ...mod, id };
    if (i >= 0) this.modifiers[i] = m; else this.modifiers.push(m);
  }

  /** Instant removal (an owner that manages its own lifecycle beat-by-beat —
   *  mycelia/deepwinter conversion warps lift the moment the ground is lost). */
  unwarp(id: string): void {
    const i = this.modifiers.findIndex(m => m.id === id);
    if (i >= 0) this.modifiers.splice(i, 1);
    this.releasing.delete(id);
  }

  /** GRADUAL removal — the event behind this warp has ENDED; its stain fades
   *  at BIOME_FIELD_CFG.warpFadePerSec (dither-speckling away as strength
   *  drops) instead of snapping. The warp sweep's release lane. */
  release(id: string): void {
    if (this.modifiers.some(m => m.id === id)) this.releasing.add(id);
  }

  /** THE MINT SAMPLER (worldgen's biomeFor): the BASE field only — geology,
   *  never events. A zone minted under any live warp comes out its land's TRUE
   *  biome; the event's identity reaches it through presentation lanes
   *  (event weather, conversion dressing, spawn bias) that all revert. */
  sampleBiome(coord: MapCoord): string { return biomeAt(coord, this.seed); }

  /** How DEEP into its biome region a coord sits (1=center, 0=edge) — worldgen reads
   *  this so marine zones transition shallow→deep from a region's edge to its heart. */
  sampleDepth(coord: MapCoord): number { return biomeDepth(coord, this.seed); }

  /** Every active warp covering a coordinate — map/zone-info ATTRIBUTION (who
   *  is turning this land), strongest-last like the compose order. */
  warpsAt(coord: MapCoord): BiomeFieldModifier[] {
    return this.modifiers.filter(m => m.strength > 0 && coordDist(coord, m.center) <= m.radius);
  }

  /** Ids of every live warp — the engine's warp sweep reconciles these against
   *  their owners' liveness (a dead event's stain is released to fade). */
  warpIds(): string[] { return this.modifiers.map(m => m.id); }

  /** The composed field WITH attribution: which modifier (if any) decided the
   *  biome here — the render pass marks warped cells so live changes read as
   *  deliberate events, never random recoloring. PRESENTATION ONLY — the mint
   *  path never composes (sampleBiome above). */
  private compose(coord: MapCoord): { biome: string; warped: BiomeFieldModifier | null } {
    let biome = biomeAt(coord, this.seed);
    // The SEA is not warpable ground: no heat-source (bloom, incursion) may
    // repaint open ocean — land events stop at the shore.
    if (biome === OCEAN_BIOME) return { biome, warped: null };
    let warped: BiomeFieldModifier | null = null;
    for (const m of this.modifiers) {
      if (m.strength <= 0 || coordDist(coord, m.center) > m.radius) continue;
      // Honor strength: full override at >=1, else a deterministic dithered blend
      // (a weak heat-source speckles its biome in rather than hard-replacing it —
      // and a RELEASED warp's fade speckles back out through the same gate).
      if (m.strength >= 1 || fieldNoise(coord.x, coord.y, this.seed) < m.strength) {
        biome = m.biome;
        warped = m;
      }
    }
    return { biome, warped };
  }
}

// The zone-info box names the warp turning a zone's ground (the attribution
// half of the "heat map changed for no reason" fix) — registered at import
// time like every other source; the panel stays dumb.
registerZoneInfoSource((world, zoneId) => {
  const z = world.zoneMap[zoneId];
  if (!z) return [];
  return world.sim.biomeField.warpsAt(z.map).map(m => ({
    kind: 'modifier' as const,
    icon: '🌀',
    color: BIOMES[m.biome]?.mapColor,
    label: m.label ?? `Warped land — ${BIOMES[m.biome]?.label ?? m.biome}`,
    detail: m.strength >= 1 ? 'the ground itself has turned' : 'the ground is turning',
  }));
});
