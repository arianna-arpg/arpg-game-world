import type { MapCoord } from './coords';
import type { BiomeFieldBand, BiomeFloorDef, BiomeInfo, BiomeSeedDef } from './biomes';
import type { climateAt, climateAffinity } from './climate';
import type { continentAt, continentSeedFrom } from './continents';
import { presenceMul } from '../engine/presence';
import { regionCellHash as hashCell } from './regionGeometry';

/** Complete ordered inputs to native cell selection. Reader closures are part
 * of the source: a frozen caller must bind them to its own immutable policy.
 * The classic adapter deliberately retains live registration and invalidation. */
export interface NativeFieldChoicePolicy {
  readonly table: readonly BiomeSeedDef[];
  readonly bands: readonly BiomeFieldBand[];
  readonly floors: readonly BiomeFloorDef[];
  readonly biomes: Readonly<Record<string, Pick<BiomeInfo, 'climate'>>>;
  readonly geometry: { readonly cellSpan: number; readonly jitter: number };
  readonly climate: { readonly origin: MapCoord; readonly anchors: Readonly<Record<string, MapCoord | null | undefined>> };
  readonly climateAt: typeof climateAt;
  readonly climateAffinity: typeof climateAffinity;
  readonly continentAt: typeof continentAt;
  readonly continentSeedFrom: typeof continentSeedFrom;
}
export interface NativeFloorSeat { readonly gx: number; readonly gy: number; readonly biome: string }
const PICK_MEMO_CAP = 16384;
const FLOOR_MEMO_CAP = 64;

/** Shared native band/floor/choice operation with instance-owned caches.
 * Caller table/site retain the classic memo contract: one canonical table and
 * site per (dimension, seed, cell), or reset before changing them. A separate
 * immutable source must use a separate instance, never a shared global memo. */
export class NativeFieldChoice {
  private pickMemo = new Map<string, string>();
  private floorSeatMemo = new Map<number, { gx: number; gy: number; biome: string }[]>();
  constructor(readonly policy: NativeFieldChoicePolicy) {}
  reset(): void { this.pickMemo.clear(); this.floorSeatMemo.clear(); }
  /** Read-only copies; callers cannot mutate the authoritative cached seats. */
  seats(fieldSeed: number): readonly NativeFloorSeat[] {
    const seats = this.floorSeatMemo.get(fieldSeed) ?? this.computeFloorSeats(fieldSeed);
    return Object.freeze(seats.map(seat => Object.freeze({ ...seat })));
  }

  private bandFor(climate: Record<string, number>): BiomeFieldBand | null {
    for (const b of this.policy.bands) {
      const v = climate[b.when.axis];
      if (v !== undefined && presenceMul(b.when.env, v) >= 0.5) return b;
    }
    return null;
  }

  private bandCandidates(band: BiomeFieldBand, table: readonly BiomeSeedDef[]): readonly BiomeSeedDef[] {
    if ((band.mode ?? 'replace') === 'replace') return band.table;
    const mul = new Map(band.table.map(r => [r.biome, r.weight ?? 1]));
    const out: BiomeSeedDef[] = table.map(r => {
      const m = mul.get(r.biome);
      if (m === undefined) return r;
      mul.delete(r.biome);
      return { biome: r.biome, weight: (r.weight ?? 1) * m };
    });
    for (const [biome, weight] of mul) out.push({ biome, weight });
    return out;
  }

  private ordinaryFieldPick(
    table: readonly BiomeSeedDef[], gx: number, gy: number, site: MapCoord,
    fieldSeed: number, dimension: string,
  ): string {
    const climate = this.policy.climateAt(site, fieldSeed, dimension);
    // FIELD BANDS (surface only): a claimed climate stratum swaps in (or
    // tilts) the candidate table — the capital's structure. Biome affinities
    // still multiply inside the band; the all-zero fallback below floors it.
    const band = dimension === 'surface' ? this.bandFor(climate) : null;
    const src = band ? this.bandCandidates(band, table) : table;
    const weights: number[] = new Array(src.length);
    let total = 0;
    for (let i = 0; i < src.length; i++) {
      const s = src[i];
      const w = (s.weight ?? 1) * this.policy.climateAffinity(this.policy.biomes[s.biome]?.climate, climate);
      weights[i] = w; total += w;
    }
    const h = hashCell(gx, gy, (fieldSeed ^ 0x5bd1e995) >>> 0);
    let picked = src[src.length - 1].biome;
    if (total <= 0) {
      let raw = 0;
      for (const s of src) raw += s.weight ?? 1;
      let r = (h / 0x100000000) * raw;
      for (const s of src) { r -= s.weight ?? 1; if (r <= 0) { picked = s.biome; break; } }
    } else {
      let r = (h / 0x100000000) * total;
      for (let i = 0; i < src.length; i++) {
        r -= weights[i];
        if (r <= 0) { picked = src[i].biome; break; }
      }
    }
    return picked;
  }

  private computeFloorSeats(fieldSeed: number): { gx: number; gy: number; biome: string }[] {
    const seats: { gx: number; gy: number; biome: string }[] = [];
    if (this.floorSeatMemo.size >= FLOOR_MEMO_CAP) this.floorSeatMemo.clear();
    this.floorSeatMemo.set(fieldSeed, seats); // set-first: reentrancy-proof by construction
    const span = this.policy.geometry.cellSpan, jit = this.policy.geometry.jitter;
    const contSeed = this.policy.continentSeedFrom(fieldSeed);
    for (const floor of this.policy.floors) {
      if (!this.policy.biomes[floor.biome]) continue; // authoring hole — registerBiomeFloor warned, the floor stands down
      // The candidate cells: every lattice cell whose jittered SITE stands on
      // land inside any declared disc (range padded one cell — jitter can pull
      // an outside-centred cell's site in).
      const cells = new Map<string, { gx: number; gy: number; site: MapCoord }>();
      for (const disc of floor.discs) {
        const at = disc.anchor === 'origin' ? this.policy.climate.origin : this.policy.climate.anchors[disc.anchor];
        if (!at) continue; // uninstalled anchor — this disc does not exist yet
        const g0x = Math.floor((at.x - disc.r) / span) - 1, g1x = Math.floor((at.x + disc.r) / span) + 1;
        const g0y = Math.floor((at.y - disc.r) / span) - 1, g1y = Math.floor((at.y + disc.r) / span) + 1;
        for (let gx = g0x; gx <= g1x; gx++) {
          for (let gy = g0y; gy <= g1y; gy++) {
            const h = hashCell(gx, gy, fieldSeed);
            const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
            const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
            if (Math.hypot(px - at.x, py - at.y) > disc.r) continue;
            if (this.policy.continentAt({ x: px, y: py }, contSeed).kind !== 'land') continue; // the sea grows no belt
            cells.set(`${gx}|${gy}`, { gx, gy, site: { x: px, y: py } });
          }
        }
      }
      if (!cells.size) continue;
      // Satisfied = some candidate cell already picks the biome ordinarily —
      // the floor then claims nothing (the fix is not reached).
      let satisfied = false;
      for (const c of cells.values()) {
        if (this.ordinaryFieldPick(this.policy.table, c.gx, c.gy, c.site, fieldSeed, 'surface') === floor.biome) { satisfied = true; break; }
      }
      if (satisfied) continue;
      // The seat: the most-hospitable candidate — affinity, then the wetter
      // site, then the cell hash. All pure; host/clients/reloads agree.
      let best: { gx: number; gy: number } | null = null;
      let bestAff = -1, bestMoist = -1, bestH = -1;
      for (const c of cells.values()) {
        const cl = this.policy.climateAt(c.site, fieldSeed);
        const aff = this.policy.climateAffinity(this.policy.biomes[floor.biome]?.climate, cl);
        const moist = cl.moisture ?? 0;
        const hh = hashCell(c.gx, c.gy, (fieldSeed ^ 0x600dfa2) >>> 0);
        if (aff > bestAff || (aff === bestAff && (moist > bestMoist || (moist === bestMoist && hh > bestH)))) {
          best = c; bestAff = aff; bestMoist = moist; bestH = hh;
        }
      }
      if (best) seats.push({ gx: best.gx, gy: best.gy, biome: floor.biome });
    }
    return seats;
  }

  private floorClaimAt(gx: number, gy: number, fieldSeed: number): string | null {
    if (!this.policy.floors.length) return null;
    const seats = this.floorSeatMemo.get(fieldSeed) ?? this.computeFloorSeats(fieldSeed);
    for (const s of seats) if (s.gx === gx && s.gy === gy) return s.biome;
    return null;
  }

  pick(
    table: readonly BiomeSeedDef[], gx: number, gy: number, site: MapCoord,
    fieldSeed: number, dimension = 'surface',
  ): string {
    const memoKey = `${dimension}|${fieldSeed}|${gx}|${gy}`;
    const hit = this.pickMemo.get(memoKey);
    if (hit !== undefined) return hit;
    const picked = (dimension === 'surface' ? this.floorClaimAt(gx, gy, fieldSeed) : null)
      ?? this.ordinaryFieldPick(table, gx, gy, site, fieldSeed, dimension);
    if (this.pickMemo.size >= PICK_MEMO_CAP) this.pickMemo.clear();
    this.pickMemo.set(memoKey, picked);
    return picked;
  }
}
