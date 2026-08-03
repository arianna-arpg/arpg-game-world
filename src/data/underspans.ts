// ---------------------------------------------------------------------------
// THE SPANNING UNDERGROWTH — the rooted web's zone-graph half (Movement III).
//
// A garden node may seed an UNDER-ZONE that spans SEVERAL surface nodes: one
// shared pocket ("the Rootways", the undergrowth country's interior language)
// with a mouth in every member zone — walk down in one plot, cross below, and
// surface in a DIFFERENT map node. Some partners mint EXIT-LESS on the
// surface (kind 'rootheld', the sealed-shores law): the way onward exists
// only through the under-web — a loud discovery, never the default.
//
// EVERYTHING here is data on standing fabrics:
//   - the SPAN POLICY registry below (per-biome dials: chance / reach /
//     radius / fresh / exitless) — a biome without a row is BYTE-IDENTICAL
//     (the engine's span pass returns before touching any stream);
//   - the graph record is ZoneDef.underways rows (the searoutes idiom: a
//     second edge list beside exits — no surface portal, no road budget, no
//     weave suppression; the map draws it in the root stroke; the ring-1
//     unveil never crosses it, so a far mouth stays VEILED until walked);
//   - the mouth is the den_mouth landmark builder re-dressed (rootway_mouth
//     → a rootway_gate trigger doodad), forced one-per-membership by the
//     engine's span pass; the entrance harvest pairs mouths to spans;
//   - the pocket is mintCave('undergrowth') from the span's canonical SEAT
//     def, so every mouth opens the IDENTICAL zone (drawn == entered), with
//     one exit per member and objective 'none' FORCED — the pocket is a
//     PASSAGE (its danger is ambient, the port law): no objective seal may
//     ever hold a crossing shut, so the far door can never softlock;
//   - findability is an omen source (whisper-only: the roots murmur near a
//     found member while a far member stays unfound — no reveal, so the
//     omen can never unveil what only the walk below may).
//
// Engine half: World.underSpanPass (organic mints only, chartFrontier tail),
// the harvest pairing, the far-mouth travel branch, and webHops' under lane —
// all in src/engine/world.ts + src/world/forechart.ts. Docs:
// docs/engine/worldweb.md. Probes: balance/probe_ugspan.ts (the extreme-dial
// rig) + probe_webqa section K.
// ---------------------------------------------------------------------------

import { registerDoodadRule, registerLandmark } from '../engine/levelgen';
import { mintCave } from '../engine/worldgen';
import { registerGenPin } from '../engine/genPins';
import { registerSidezone } from './sidezones';
import { registerOmenSource } from '../world/omens';
import type { Omen } from '../world/omens';

// --- THE COVERAGE DIALS (per-biome policy rows) --------------------------------
// The three regimes are DIALS, never code: patchy ships (the garden row);
// everywhere-thin is chance 1 + reach [1,1]; one-great-web is chance 1 +
// reach [3,3] + a wide radius (spans chain through shared members). Both
// extremes are pinned at forced dials in balance/probe_ugspan.ts.
export interface UnderSpanPolicy {
  /** The biome whose ORGANIC mints may seed a span. */
  biome: string;
  /** Per-mint chance the fresh node seeds a span (rolled on a private
   *  position-hash stream — the shared stream never moves). */
  chance: number;
  /** Partner-count band: how many nodes beyond the seat one span reaches. */
  reach: [number, number];
  /** Partner search / fresh-mint radius (map node units). */
  radius: number;
  /** P(a partner slot mints FRESH veiled ground rather than adopting a
   *  standing unvisited node) — the "brand new Garden node" lane. */
  fresh: number;
  /** P(a fresh partner mints ROOTHELD — surface-sealed forever, the
   *  set-piece; the rest mint soft: born under-only, but the surface web
   *  may find them as the country densifies). */
  exitless: number;
}

export const UNDER_SPANS: Record<string, UnderSpanPolicy> = {};

export function registerUnderSpan(p: UnderSpanPolicy): void {
  if (UNDER_SPANS[p.biome]) console.warn(`[underspans] re-registering '${p.biome}' — overriding`);
  UNDER_SPANS[p.biome] = p;
}

export function underSpanPolicyOf(biome: string): UnderSpanPolicy | undefined {
  return UNDER_SPANS[biome];
}

// THE GARDEN ROW — patchy found networks (the ratified default): roughly one
// plot in five knots its roots into a neighbor or two; half the fresh finds
// are sealed set-pieces. Radius ~2.6× the garden's 58u spacing reaches the
// second ring without ever spanning a whole country.
registerUnderSpan({
  biome: 'garden',
  chance: 0.22,
  reach: [1, 2],
  radius: 150,
  fresh: 0.55,
  exitless: 0.5,
});

// --- THE ROOTWAY MOUTH ---------------------------------------------------------
// The span's floor-door: a bore under a root knuckle, kin to the taproot gate
// but a DIFFERENT kind on purpose — this mouth crosses, and the player should
// learn the difference at a glance. Planted by the den_mouth builder (spoor
// apron + the trigger doodad) as a forced landmark, one roll per membership.
registerDoodadRule('rootway_gate', { overlap: 'trigger', spacing: 300 });

/** No static row names this landmark — the SPAN PASS forces one roll per
 *  membership at mint time. Pinned (engine/genPins.ts) so THE ORPHAN CENSUS
 *  counts a reference the data can witness (the windlass_ring precedent);
 *  World.underSpanPass stamps rolls by this exported constant. */
export const ROOTWAY_MOUTH_LANDMARK = registerGenPin('landmark', 'rootway_mouth',
  'the rooted web: World.underSpanPass forces one roll per span membership');

registerLandmark({
  id: ROOTWAY_MOUTH_LANDMARK, builder: 'den_mouth', size: [150, 210],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'rootway_gate',
    dress: [
      { kind: 'leaf_mulch', count: [2, 4], radius: [14, 22] },
      { kind: 'toadstool', count: [1, 3], radius: [10, 15] },
      { kind: 'web', count: [0, 2], radius: [12, 18] },
    ],
  },
});

// --- THE SHARED POCKET ---------------------------------------------------------
// Every member's mouth opens the ONE under-zone (the harvest stamps a
// span-keyed seed, so ctx.seed and ctx.id already agree across parents). The
// def mints from the span's SEAT — never the entering zone — so the pocket
// is byte-identical whichever door you found first. Exits: one per member,
// sides dealt round the compass. Objective FORCED to 'none' (the port law):
// the pocket is a PASSAGE — its danger is ambient, and no objective seal may
// ever hold the crossing shut.
registerSidezone({
  kind: 'rootway_gate',
  dwell: 0.8,
  ledgerOnEnter: 'rootway_entered',
  spanMouth: true,
  mint: ({ parent, seed, id, underSpan }) => {
    const seat = underSpan?.seat ?? parent;
    const def = mintCave(seat, seed, id, 'undergrowth', {
      rollVariant: true,
      objective: { kind: 'none', label: 'the ways below' },
    });
    if (underSpan) {
      def.underSpan = underSpan.id;
      const SIDES = ['s', 'n', 'e', 'w'] as const;
      def.exits = underSpan.members.map((m, i) => ({
        to: m,
        side: SIDES[i % 4],
        // A fifth+ member (rig-forced reach) shares a side at an offset seat.
        at: 0.5 + 0.24 * Math.floor(i / 4) * (i % 2 === 0 ? 1 : -1),
      }));
    }
    return def;
  },
});

// --- THE WHISPERING ROOTS (findability, the omen law) --------------------------
// One whisper per span that still hides a member, seated at a FOUND member's
// own mouth — the murmur says the roots go somewhere, never where. Whisper
// only, no reveal: the far node's veil lifts exclusively by the walk below
// (or ordinary surface discovery of a soft partner) — the omen fabric's
// guarantee without a shortcut through it.
registerOmenSource((world) => {
  const out: Omen[] = [];
  const done = new Set<string>();
  for (const z of Object.values(world.zoneMap)) {
    if (!z.underways?.length || !world.visible(z)) continue;
    for (const w of z.underways) {
      if (done.has(w.span)) continue;
      const far = world.zoneMap[w.to];
      if (!far || !far.veiled) continue;
      done.add(w.span);
      out.push({
        id: `ugspan-${w.span}`,
        at: { x: z.map.x, y: z.map.y },
        zoneId: z.id,
        color: '#c8a878',
        lines: [
          'the roots here run farther than the paths do…',
          'something below knots this plot to another…',
          'the ground hums of a way the surface never held…',
        ],
        whisper: 70,
        age: 0,
      });
    }
  }
  return out;
});
