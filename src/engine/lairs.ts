// ---------------------------------------------------------------------------
// THE LAIR FABRIC — apex natives claiming ground by PREDICATE.
//
// Until now a den existed only where its home country's compositions planted
// the door (the Wane's arch, the gleamhollow's bole — authored bundles on
// authored ground). This registry inverts that: a native names WHAT LAND
// QUALIFIES — surface biomes, the cave ladder's depth band, a level window —
// and the mint chokepoints seat its lair landmark wherever the predicate
// holds. "Yetis keep to the first and second caves under the mountains" is
// one data row, not a tileset edit.
//
// The fabric is deliberately THIN: a seat row resolves to an ordinary
// LandmarkRoll appended at the two mint chokepoints (placeZoneAt for surface
// zones, mintCave for the ladder), so placement, reachability (mustReach),
// portal clearance, genqa's invariants and the noDeeper strip all arrive
// from the standing machinery. What stands AT the seat is equally open:
//   · a 'den_mouth' landmark (engine/landmarkBuilders.ts) — a spoor-dressed
//     apron around a registered SIDEZONE entrance, so the mouth dwells into
//     a minted den country (data/sidezones.ts — objective, name, noDeeper
//     and gateway ledger all data);
//   · or any other registered landmark — a pit of sleeping natives armed by
//     the ambush fabric (the gnasher pen's law), a fenced yard, anything.
// Content rows live in data/lairs.ts. Docs: docs/engine/lairs.md.
//
// DETERMINISM: the fold is a pure predicate — no rng moves here. The chance
// rides the returned roll into generateLayout's landmark loop, which draws
// per PRESENT row: ground no lair claims burns no draw and stays
// byte-identical. Rows whose scaled chance falls under LAIR_CFG.minChance
// are dropped BEFORE the def bakes them, same law.
// ---------------------------------------------------------------------------

import { presenceMul, type LevelEnvelope } from './presence';
import type { LandmarkRoll } from '../data/zones';

export const LAIR_CFG = {
  /** den_mouth landmark defaults (data rows may override per lair): the
   *  apron footprint band and the mouth doodad's body radius. */
  mouth: { radius: 26, size: [190, 270] as [number, number], dwell: 0.7 },
  /** Scaled chances below this are dropped from the def outright — an
   *  envelope tail should vanish, not linger as a 0.1% ghost draw. */
  minChance: 0.005,
};

/** WHERE a native claims ground. Every axis is optional beyond the biome
 *  list — absent means "no opinion", exactly like the presence fabric. */
export interface LairSeat {
  /** Surface biome ids this native claims. On the surface that is the zone's
   *  own biome; underground it is the cave ladder's ANCHOR (ZoneDef.anchor —
   *  provenance survives nesting, so "under the mountains" stays true at
   *  depth 3 whatever face the strata fabric rolled). */
  biomes: string[];
  /** Which ground the seat may stand on: inside minted caves, on the open
   *  surface, or both. */
  place: 'cave' | 'surface' | 'both';
  /** Weight envelope over CAVE DEPTH (the CaveFaceSpec.strata idiom;
   *  surface ground evaluates at depth 0). `{ from: 1, to: 2, fadeOut: 1 }`
   *  is "the first and second caves, thinning to nothing below". */
  strata?: LevelEnvelope;
  /** Weight envelope over the ZONE's level — natives arrive when the world
   *  is ready to feed them. */
  level?: LevelEnvelope;
  /** Base per-zone chance, scaled by the envelopes, clamped to [0, 1]. */
  chance: number;
  /** Explicit tileset-id allowlist — a lair that keeps to named faces
   *  (absent = any face the biome mints). */
  tilesets?: string[];
  /** COURSE claims (world/courses.ts CourseSpec.id — 'rivers' is the relief
   *  fabric's traced surface rivers): the seat stands only on zones minted
   *  ALONG a listed course. A course row still needs `biomes` satisfied by
   *  the LOCAL ground (rivers cross countries and repaint none), so "the
   *  naiad keeps to forest rivers" is biomes + courses composing. */
  courses?: string[];
  /** COUNTRY-INTERIOR claim — a weight envelope over ZoneDef.geo.biomeDepth
   *  (0 = the biome blob's edge, 1 = its deep heart; the same sampler the
   *  marine shallow/deep split rides). `{ from: 0.55, fadeIn: 0.15 }` is
   *  "only deep inside the country, thinning toward the border" — THE
   *  LADDER's spatial rung: the roost stands where the mountains are at
   *  their most mountainous. A row that asks REFUSES ground with no depth
   *  sample (directed mints without samplers stay lair-ordinary). */
  interior?: LevelEnvelope;
  /** CLIMATE claims — inclusive [min, max] bands over the world's climate
   *  axes at the mint coordinate (ZoneDef.geo.climate — 'elevation' is the
   *  relief fabric's vertical truth). `{ elevation: [0.6, 1] }` is "high
   *  ground only". A row that asks refuses ground with no reading. */
  climate?: Record<string, [number, number]>;
  /** STORY claims (THE STORIES GATE — the aloft lane's fold rung): the
   *  ground's face must be able to STACK at least this many OVER-stories
   *  (the tier fabric's upper layers) — a story-hungry claim (a landmark
   *  wearing siteTier N) refuses at the FOLD on flat country, burning no
   *  darts and no rng. TILESET-GRAIN by construction: the reach is the
   *  face's declared CAPABILITY (its layout family's best case across
   *  base + variants, via the resolver engine/tiers.ts installs), so the
   *  gate refuses only ground that can NEVER stack — a mint whose own
   *  roll came up short (a shed mountain, a per-mint forceLayout
   *  override) still refuses at the dart, the standing starved-landmark
   *  class. Absent = byte-identical, exactly like every other axis. */
  stories?: number;
}

/** One registered lair: an id, the LANDMARK that stands at its seat, and the
 *  seat predicate. Everything else about a lair (its mouth, its minted den
 *  country, its natives, its ledger) hangs off the landmark + sidezone
 *  registries — this row is only the CLAIM on the land. */
export interface LairSeatRow {
  id: string;
  landmark: string;
  seat: LairSeat;
}

const LAIRS: Record<string, LairSeatRow> = {};

export function registerLair(row: LairSeatRow): void {
  if (LAIRS[row.id]) console.warn(`[lairs] re-registering '${row.id}' — overriding`);
  LAIRS[row.id] = row;
}

/** THE STORY-REACH RESOLVER (LairSeat.stories) — how many OVER-stories a
 *  tileset's country can stack, injected by engine/tiers.ts at eval (the
 *  registerTierSiting idiom: this module stays a pure leaf; the tier fabric
 *  owns the recipes' story truths). Absent (a harness that never loads the
 *  tier fabric): every stories claim stands down LOUDLY — the dead-dial
 *  law, never a silent valley seat. */
let STORY_REACH: ((tilesetId: string) => number) | null = null;
let storyReachWarned = false;
export function registerLairStoryReach(fn: (tilesetId: string) => number): void {
  STORY_REACH = fn;
}

export function lairRows(): LairSeatRow[] { return Object.values(LAIRS); }
export function lairOf(id: string): LairSeatRow | undefined { return LAIRS[id]; }

/** What a mint chokepoint tells the fold about the ground it is minting. */
export interface LairGround {
  place: 'cave' | 'surface';
  /** Surface biome (surface mints) or ladder anchor (cave mints). */
  biome?: string;
  caveDepth?: number;
  level: number;
  tileset: string;
  /** The course this mint rides (CourseSpec.id), when it rides one — the
   *  surface chokepoint threads onCourse; caves never carry a course. */
  course?: string;
  /** How deep inside its biome blob the ground sits (ZoneDef.geo.biomeDepth;
   *  caves inherit their parent's — the country's depth survives descent). */
  biomeDepth?: number;
  /** Climate axes at the mint coordinate (ZoneDef.geo.climate). */
  climate?: Record<string, number>;
  /** Sealed pockets grow no lairs (the noDeeper contract — mintCave's
   *  authored-row filter, extended to the fabric's own rows). */
  noDeeper?: boolean;
  /** Harbors keep no monsters' doors (the sealed-shores law). */
  port?: boolean;
}

/** THE SEAT FOLD — resolve every registered lair against this ground and
 *  return the LandmarkRolls the def should bake. Pure; draws nothing. */
export function lairLandmarkRolls(q: LairGround): LandmarkRoll[] {
  if (q.noDeeper || q.port || !q.biome) return [];
  const out: LandmarkRoll[] = [];
  for (const row of Object.values(LAIRS)) {
    const s = row.seat;
    if (s.place !== 'both' && s.place !== q.place) continue;
    if (!s.biomes.includes(q.biome)) continue;
    if (s.tilesets && !s.tilesets.includes(q.tileset)) continue;
    // Course claims: a row listing courses stands ONLY on those courses; a
    // row listing none never minds them (ordinary ground law, unchanged).
    if (s.courses && (!q.course || !s.courses.includes(q.course))) continue;
    // Interior + climate claims: rows that ask REFUSE unreadable ground
    // (a directed mint with no samplers can't host deep-country content).
    if (s.interior && q.biomeDepth === undefined) continue;
    if (s.climate) {
      const c = q.climate;
      if (!c) continue;
      let inBand = true;
      for (const [axis, [lo, hi]] of Object.entries(s.climate)) {
        const v = c[axis];
        if (v === undefined || v < lo || v > hi) { inBand = false; break; }
      }
      if (!inBand) continue;
    }
    // STORY claims (THE STORIES GATE): a story-hungry row refuses ground
    // whose face can never stack the ask — at the fold, before any rng.
    if (s.stories && s.stories >= 1) {
      if (!STORY_REACH) {
        if (!storyReachWarned) {
          storyReachWarned = true;
          console.warn(`[lairs] '${row.id}' asks stories ≥ ${s.stories} but no story-reach resolver stands (tier fabric unloaded) — the claim stands down`);
        }
        continue;
      }
      if (STORY_REACH(q.tileset) < s.stories) continue;
    }
    // ONE evaluation law: strata reads the ladder depth (surface = 0), level
    // reads the zone's level — both through the presence fabric's envelope.
    const w = s.chance
      * presenceMul(s.strata, q.caveDepth ?? 0)
      * presenceMul(s.level, q.level)
      * (s.interior ? presenceMul(s.interior, q.biomeDepth ?? 0) : 1);
    if (w < LAIR_CFG.minChance) continue;
    out.push({ landmark: row.landmark, chance: Math.min(1, w) });
  }
  return out;
}
