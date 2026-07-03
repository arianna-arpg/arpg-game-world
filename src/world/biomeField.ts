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
import { BIOMES, BIOME_FIELD_CFG, OCEAN_BIOME, biomeAt, biomeDepth, fieldNoise, type BiomeFieldModifier } from './biomes';
import { coordDist, type MapCoord } from './coords';
import { NO_BIAS, type MapLayer, type SpawnBias, type WorldOverlay } from './overlay';

export class BiomeField implements WorldOverlay {
  readonly id = 'biomefield';
  /** Active local warps of the field (the heat-source seam; empty until a future
   *  living-world pass wires quests/events to push them). */
  private readonly modifiers: BiomeFieldModifier[] = [];

  constructor(private readonly seed: number) {}

  /** The biome-field seed — a Field mega-zone stashes it on its def so the layout
   *  generator can re-sample raw biomeAt to rasterize the exact region silhouette. */
  get fieldSeed(): number { return this.seed; }

  // Render-only: the substrate doesn't move yet (a later pass drifts it here),
  // and biome already biases spawns via the tileset a zone inherits, not here.
  update(): void { /* static MVP; drift regions / age modifiers in a later pass */ }
  onNodeCharted(): void { /* the field is global; nothing per-node to seed */ }
  affectSpawns(): SpawnBias { return NO_BIAS; }

  /** Paint the biome field as a faint coloured grid under the charted graph. */
  renderMap(nodes: ZoneDef[]): MapLayer {
    if (!nodes.length) return { under: '', over: '' };
    const M = BIOME_FIELD_CFG.cellSpan * 2; // extend past charted ground (the world exists beyond)
    const xs = nodes.map(n => n.map.x), ys = nodes.map(n => n.map.y);
    const minX = Math.min(...xs) - M, maxX = Math.max(...xs) + M;
    const minY = Math.min(...ys) - M, maxY = Math.max(...ys) + M;
    // Bounded cell count (~renderCell sized, capped per axis) — the SVG is drawn
    // on map refresh, so keep it light.
    const cols = Math.max(8, Math.min(40, Math.ceil((maxX - minX) / BIOME_FIELD_CFG.renderCell)));
    const rows = Math.max(8, Math.min(40, Math.ceil((maxY - minY) / BIOME_FIELD_CFG.renderCell)));
    const w = (maxX - minX) / cols, h = (maxY - minY) / rows;
    let under = '';
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const info = BIOMES[this.sample({ x: minX + (i + 0.5) * w, y: minY + (j + 0.5) * h })];
        if (!info) continue;
        // Land washes faint (a heat-map tint); the sea paints heavy (its own
        // washOpacity) so open water reads as WATER, hiding nothing beneath —
        // there is no land lattice under the ocean to peek at.
        under += `<rect x="${(minX + i * w).toFixed(1)}" y="${(minY + j * h).toFixed(1)}" `
          + `width="${(w + 0.6).toFixed(1)}" height="${(h + 0.6).toFixed(1)}" fill="${info.mapColor}" fill-opacity="${(info.washOpacity ?? 0.10).toFixed(2)}"/>`;
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

  /** The base field composed with any active modifiers (the modifiable substrate
   *  the user's "living world" builds on). */
  private sample(coord: MapCoord): string {
    let biome = biomeAt(coord, this.seed);
    // The SEA is not warpable ground: no heat-source (bloom, incursion) may
    // repaint open ocean — land events stop at the shore.
    if (biome === OCEAN_BIOME) return biome;
    for (const m of this.modifiers) {
      if (m.strength <= 0 || coordDist(coord, m.center) > m.radius) continue;
      // Honor strength: full override at >=1, else a deterministic dithered blend
      // (a weak heat-source speckles its biome in rather than hard-replacing it).
      if (m.strength >= 1 || fieldNoise(coord.x, coord.y, this.seed) < m.strength) biome = m.biome;
    }
    return biome;
  }
}
