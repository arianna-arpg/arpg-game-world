// ---------------------------------------------------------------------------
// REALM ARENAS — how an event's off-graph realm is BUILT and GATED, as data.
//
// Every enterable event realm (the demon invasion's portal realm, the crusade
// sanctum, the necropolis, the fracture chamber) mints through ONE engine
// pipeline (World.enterRealmArena) that reads an ArenaSpec: which tileset and
// LAYOUT RECIPE shape the arena, what it is called, how dense its ambient
// packs run, and — the Chaos-Sanctuary move — whether WARD SEALS stand
// between the door and the boss. With wards declared, the boss does NOT
// spawn on entry: seal doodads rise instead, each dwell-broken (the transit
// registry's 'ward_seal' row governs the linger), each break unleashing a
// guard pack, and only the LAST break manifests the boss. An event makes its
// realm distinct by authoring one of these — no engine edits:
//
//   realm: { tileset: 'hellion_rift', name: 'The Sanctum of the Rite',
//            wards: { count: [4, 5], guards: { count: [3, 5] } } }
//
// The demon invasion carries one PER INVASION TYPE (InvasionType.realm), so
// an Imp Incursion, a Hell-Host and a Balor's Rite each open onto their own
// underworld.
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../engine/levelgen';

/** The seal ritual warding an arena's boss. Dwell feel rides the TRANSIT
 *  registry ('ward_seal', or 'ward_seal:<doodadKind>' for a bespoke kind). */
export interface ArenaWardSpec {
  /** How many seals rise (rolled once per arena visit). */
  count: [number, number];
  /** The seal DOODAD kind (default 'ward_seal'; its broken face is
   *  '<kind>_broken'). A themed event may register its own kind + visual. */
  doodadKind?: string;
  /** A guard pack unleashed as each seal breaks (roster = the boss's faction,
   *  boss id filtered out; spread = scatter radius around the seal). */
  guards?: { count: [number, number]; spread?: number };
  /** Break bulletin. '{n}' = seals still standing, '{total}' = the full count. */
  announceBreak?: string;
  /** The last-seal bulletin — the boss manifests on this line. */
  announceAll?: string;
}

/** One event realm's build sheet. Every field optional — an empty spec is
 *  exactly the classic realm (the event's fallback tileset, native layout
 *  roll, packs [2,4]×[2,3], boss on entry). */
export interface ArenaSpec {
  /** Tileset the arena is minted from (falls back to the event's own). */
  tileset?: string;
  /** A fixed arena name ("The War-Foundry") instead of the tileset roll. */
  name?: string;
  /** Force a layout recipe ('spiral', 'steppes', …) instead of the cave roll. */
  layoutType?: string;
  /** Recipe knobs, exactly as a biome would pass them. */
  layoutParams?: Record<string, unknown>;
  /** Ambient pack density (the roster stays the event's own). */
  packs?: { count: [number, number]; size: [number, number] };
  /** Ward seals gating the boss — see ArenaWardSpec. */
  wards?: ArenaWardSpec;
}

// The stock seal doodads: pure triggers (never block movement or shots), kept
// apart from each other by placement (the engine also clearTransitSpot()s them
// off portals and gates).
registerDoodadRule('ward_seal', { overlap: 'trigger', spacing: 60 });
registerDoodadRule('ward_seal_broken', { overlap: 'trigger', spacing: 60 });
