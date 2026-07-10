// ---------------------------------------------------------------------------
// BIOME FIELD overlay — renders the world's biome substrate as a heat-map wash.
//
// A pure WorldOverlay (like weather/faction): it draws the coordinate-space biome
// field (biomeAt) as a faint coloured grid UNDER the node graph, so the world map
// reads like a living biome world (Minecraft-ish), not just a node web. RENDER-
// ONLY for now — update() and affectSpawns() are inert, so generation is
// untouched; a later pass has worldgen sample biomeAt at mint (field-driven gen)
// and DRIFTS the field over time. The MODIFIER list below is the heat-source seam:
// a quest/event calls warp(...) to shift biomes locally ("a source of heat to the
// south"), and both the render and any future gen sampling see it — no engine edit.
// ---------------------------------------------------------------------------

import type { ZoneDef } from '../data/zones';
import { BIOMES, BIOME_FIELD_CFG, OCEAN_BIOME, biomeAt, biomeDepth, fieldNoise, resetFieldPickMemo, type BiomeFieldModifier } from './biomes';
import { coordDist, type MapCoord } from './coords';
import { NO_BIAS, type MapLayer, type SpawnBias, type WorldOverlay } from './overlay';
import { registerZoneInfoSource } from './zoneInfo';

export class BiomeField implements WorldOverlay {
  readonly id = 'biomefield';
  readonly mapLabel = 'Biomes';
  /** Active local warps of the field (the heat-source seam — the Mycelia bloom,
   *  a demonic invasion's scorch, an incursion's blight all push these). */
  private readonly modifiers: BiomeFieldModifier[] = [];

  constructor(private readonly seed: number) {
    // A fresh field = a fresh world: drop the module-level cell-pick memo so
    // nothing from a previous run (or a dev-session module swap) lingers.
    resetFieldPickMemo();
  }

  /** The biome-field seed — a Field mega-zone stashes it on its def so the layout
   *  generator can re-sample raw biomeAt to rasterize the exact region silhouette. */
  get fieldSeed(): number { return this.seed; }

  // Render-only: the substrate doesn't move yet (a later pass drifts it here),
  // and biome already biases spawns via the tileset a zone inherits, not here.
  update(): void { /* static MVP; drift regions / age modifiers in a later pass */ }
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
        // WARPED land pulses: a live event is turning this ground (Mycelia,
        // an invasion's scorch, an incursion's blight). The breathing outline
        // ATTRIBUTES the change — the heat map never silently recolors.
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

  /** FUTURE SEAM: a quest/world-event warps the field locally (a "source of heat"
   *  shifting biomes). Unused until the living-world pass wires it — kept so that
   *  the modifiable-substrate architecture is in place from the start. */
  warp(mod: BiomeFieldModifier): void { this.modifiers.push(mod); }

  /** TRANSIENT warp by id (replace-or-push): a moving event (a Mycelia bloom crawling
   *  + receding) re-pushes its modifier as it shifts, and removes it on withdraw. */
  setWarp(id: string, mod: BiomeFieldModifier): void {
    const i = this.modifiers.findIndex(m => m.id === id);
    const m = { ...mod, id };
    if (i >= 0) this.modifiers[i] = m; else this.modifiers.push(m);
  }
  unwarp(id: string): void {
    const i = this.modifiers.findIndex(m => m.id === id);
    if (i >= 0) this.modifiers.splice(i, 1);
  }

  /** PUBLIC: the biome at a coordinate, honoring active warps — the heat-map source
   *  worldgen samples at MINT (field-driven generation: fills a zone's biome where
   *  the tileset names none, and resolves marine adjacency → layout). */
  sampleBiome(coord: MapCoord): string { return this.sample(coord); }

  /** How DEEP into its biome region a coord sits (1=center, 0=edge) — worldgen reads
   *  this so marine zones transition shallow→deep from a region's edge to its heart. */
  sampleDepth(coord: MapCoord): number { return biomeDepth(coord, this.seed); }

  /** Every active warp covering a coordinate — map/zone-info ATTRIBUTION (who
   *  is turning this land), strongest-last like the compose order. */
  warpsAt(coord: MapCoord): BiomeFieldModifier[] {
    return this.modifiers.filter(m => m.strength > 0 && coordDist(coord, m.center) <= m.radius);
  }

  /** Ids of the KEYED warps — the engine's event-warp sweep reconciles these
   *  against their owners' liveness (a dead invasion's scorch recedes).
   *  Unkeyed warps (incursion blight) are permanent by design and unlisted. */
  warpIds(): string[] {
    return this.modifiers.filter(m => m.id !== undefined).map(m => m.id!);
  }

  /** The base field composed with any active modifiers (the modifiable substrate
   *  the user's "living world" builds on). */
  private sample(coord: MapCoord): string { return this.compose(coord).biome; }

  /** The composed field WITH attribution: which modifier (if any) decided the
   *  biome here — the render pass marks warped cells so live changes read as
   *  deliberate events, never random recoloring. */
  private compose(coord: MapCoord): { biome: string; warped: BiomeFieldModifier | null } {
    let biome = biomeAt(coord, this.seed);
    // The SEA is not warpable ground: no heat-source (bloom, incursion) may
    // repaint open ocean — land events stop at the shore.
    if (biome === OCEAN_BIOME) return { biome, warped: null };
    let warped: BiomeFieldModifier | null = null;
    for (const m of this.modifiers) {
      if (m.strength <= 0 || coordDist(coord, m.center) > m.radius) continue;
      // Honor strength: full override at >=1, else a deterministic dithered blend
      // (a weak heat-source speckles its biome in rather than hard-replacing it).
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
