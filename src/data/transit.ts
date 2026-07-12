// ---------------------------------------------------------------------------
// TRANSIT — every "linger to travel/act" object's tuning as an OPEN REGISTRY.
//
// The engine runs ONE dwell discipline (stand idle, unknocked, for `dwell`
// seconds inside `radius`) across many families: zone-exit portals, sidezone
// mouths, realm gates, structure doors, toll keepers, descent platforms, ward
// seals… Before this registry each family carried its own hardcoded constant
// in world.ts and its own hand-copied progress-ring draw in renderer.ts. Now
// a transit KIND is one data row: the dwell seconds, the stand-on radius, and
// the ring the renderer fills while you linger. The renderer draws every ring
// through one helper reading `ring`; the engine reads `dwell`/`radius` at the
// use site — so a package can re-register a kind (or add a new one) and both
// sides follow, no engine edits.
//
// Lookup is FAMILY-CHAINED: `transitOf('realm_gate:demon')` falls back to
// 'realm_gate' — so a sub-kind (a specific gate, a specific mouth) can be
// styled/tuned on its own row while the family row covers the rest.
//
// A ring `color` left unset means "the zone theme's accent" — portals keep
// tinting with the land they stand in unless a kind pins its own color.
// ---------------------------------------------------------------------------

export interface TransitRing {
  /** Ring radius (px) around the transit's position. */
  radius: number;
  /** Stroke width (default 4). */
  width?: number;
  /** Stroke color; ABSENT = the current zone theme's accent. */
  color?: string;
  /** Stroke alpha (default 0.95). */
  alpha?: number;
}

/** How honestly the player must REACH a dwell object before its dwell builds:
 *  'radius' — proximity alone (contact acts: pushing a door, a ship nosing
 *             the shore);
 *  'sight'  — a clear occlusion line from the dweller to the object
 *             (DWELL_CFG.sightChannel) — walls stop a dwell, because nobody
 *             attends to what a wall hides;
 *  'roof'   — under the SAME ROOF as a roofed object (the cellar-hatch
 *             `indoorsOnly` ideology, generalized); an OPEN-AIR object
 *             degrades to 'sight', so a package's courtyard innkeep stays
 *             dwellable. */
export type DwellReach = 'radius' | 'sight' | 'roof';

/** THE DWELL-REACH RULESET — one attention discipline for every dwell in the
 *  game (transit families here, NPC counters and town sites in world.ts).
 *  A dwell is an act of attention: it should only build toward an object the
 *  player can honestly attend to — never through the inn's wall, never
 *  through a house into the cellar. Tune HERE, never inline. */
export const DWELL_CFG = {
  /** The family default when a row/role pins nothing. */
  reach: 'sight' as DwellReach,
  /** Which channel of the one occlusion ray (engine/los.ts) 'sight' reach
   *  casts. 'shot' ON PURPOSE: canopy crowns and veils blind EYES (the veil
   *  rule) but must never blind your own hands — a cave mouth under a forest
   *  crown stays enterable; true walls stop both channels, which is the whole
   *  point of the rule. */
  sightChannel: 'shot' as 'shot' | 'sight',
  /** A ray hit landing within this many px of the object still counts as
   *  reached — the object's own frame (a counter lip, the hatch stone, a
   *  bench slab) never hides the object it belongs to. */
  sightSlack: 20,
  /** Per-npcRole reach overrides for the NPC/site dwells that tune outside
   *  the transit rows. The innkeep serves UNDER HER ROOF — you dwell her
   *  counter from inside the inn, never through its wall. */
  npcReach: { innkeep: 'roof' } as Record<string, DwellReach | undefined>,
};

/** Reach for an npcRole-bound dwell (Mireille's counter, the smith's stock…). */
export function npcDwellReach(role: string): DwellReach {
  return DWELL_CFG.npcReach[role] ?? DWELL_CFG.reach;
}

export interface TransitDef {
  /** Registry key. Sub-kinds chain: 'family:sub' falls back to 'family'. */
  kind: string;
  /** Seconds of idle dwell before the transit fires. */
  dwell: number;
  /** Stand-on trigger radius (px), for families that read one from data. */
  radius?: number;
  /** The progress ring the renderer fills while the dwell builds. */
  ring: TransitRing;
  /** How the dweller must reach this kind (ABSENT = DWELL_CFG.reach). */
  reach?: DwellReach;
}

export const TRANSITS: Record<string, TransitDef> = {};

export function registerTransit(def: TransitDef): void {
  if (TRANSITS[def.kind]) console.warn(`[transit] re-registering '${def.kind}' — overriding`);
  TRANSITS[def.kind] = def;
}

/** Family-chained lookup: exact kind, then everything before the last ':'. */
export function transitOf(kind: string): TransitDef | undefined {
  let k = kind;
  for (;;) {
    const def = TRANSITS[k];
    if (def) return def;
    const cut = k.lastIndexOf(':');
    if (cut < 0) return undefined;
    k = k.slice(0, cut);
  }
}

/** Idle-dwell seconds for a kind (family-chained; `fallback` when unregistered). */
export function transitDwell(kind: string, fallback = 0.5): number {
  return transitOf(kind)?.dwell ?? fallback;
}

/** Stand-on trigger radius for a kind (family-chained). */
export function transitRadius(kind: string, fallback: number): number {
  return transitOf(kind)?.radius ?? fallback;
}

/** Dwell-reach discipline for a kind (family-chained; DWELL_CFG.reach when
 *  the row pins nothing). The engine asks this beside every transitDwell(). */
export function transitReach(kind: string): DwellReach {
  return transitOf(kind)?.reach ?? DWELL_CFG.reach;
}

/** The default ring when a kind never declared one (the classic portal ring). */
export const DEFAULT_TRANSIT_RING: TransitRing = { radius: 36 };

/** Progress-ring style for a kind (family-chained; never null — renderers can
 *  always draw). */
export function transitRing(kind: string): TransitRing {
  return transitOf(kind)?.ring ?? DEFAULT_TRANSIT_RING;
}

// --- The stock rows ----------------------------------------------------------
// Values are the long-lived feel constants that used to live in world.ts /
// renderer.ts — one row each, same numbers, now attributable.

// Zone-exit portals: the classic dwell-to-travel. Ring tints with the zone.
registerTransit({ kind: 'zone_exit', dwell: 0.5, ring: { radius: 36 } });

// BOUNDARY-GATE exits (family-chained: 'zone_exit:<gateId>' — unregistered
// gate ids fall back to the family row above). Crossing an enclave's wall is
// a heavier, slower threshold: the pause IS the foreboding. The Durance's
// ring burns its hate-green.
registerTransit({ kind: 'zone_exit:durance_gate', dwell: 0.7, ring: { radius: 44, width: 4, color: '#7de84a' } });

// Sidezone mouths (cave entrances, hatches, pit maws). This row is the FAMILY
// DEFAULT: a SidezoneDef.dwell still overrides per kind (data/sidezones.ts),
// and a 'sidezone:<kind>' row here can restyle one mouth's ring.
registerTransit({ kind: 'sidezone', dwell: 0.55, radius: 28, ring: { radius: 30 } });

// Realm gates (demon rift / crusade sanctum / necropolis / fracture / breach):
// the larger, weightier ways into an event's own realm. Sub-kinds
// ('realm_gate:demon', …) may pin their own rows; this covers the family.
registerTransit({ kind: 'realm_gate', dwell: 0.5, radius: 32, ring: { radius: 44 } });

// Structure doors: push (dwell) on a closed door and it swings. Reach is
// 'radius' — a push is CONTACT, honest from either face of the plank; the
// door itself is the occluder, so a sight ray would argue with the act.
registerTransit({ kind: 'door', dwell: 0.45, ring: { radius: 32, color: '#c8b47a' }, reach: 'radius' });

// Holdfast toll keepers: the parley dwell (a touch longer — deliberate).
registerTransit({ kind: 'holdfast', dwell: 0.7, radius: 78, ring: { radius: 40, color: '#d0a850' } });

// Voyage landfall: the linger-to-land ring at sea (the dwell SECONDS live on
// VOYAGE_CFG.landingDwell × the ship's landingMul — only the ring is here).
// Reach 'radius': the hull NOSING the shore is the contact, not a gaze.
registerTransit({ kind: 'voyage_landing', dwell: 0.9, ring: { radius: 34, color: '#7fd0ff' }, reach: 'radius' });

// The Delver's mineshaft platform: dwell to descend / climb out. (Its ring is
// new — the one dwell that never drew progress; teal to match the platform.)
registerTransit({ kind: 'descent_shaft', dwell: 1.0, radius: 72, ring: { radius: 40, color: '#7fe0d8' } });

// Ward seals: the ritual anchors that ward an arena's boss (data/arenas.ts).
// Dwell one to shatter it; the ring burns infernal.
registerTransit({ kind: 'ward_seal', dwell: 0.9, radius: 30, ring: { radius: 34, color: '#ff9a50' } });

// Non-travel dwells that still draw the shared ring shape:
// choice-node / amalgam part picks…
registerTransit({ kind: 'choice_pick', dwell: 1.0, ring: { radius: 22, width: 3, color: '#e8ffe0', alpha: 0.9 } });
// …and the timed-chest lockpick.
registerTransit({ kind: 'lockpick', dwell: 1.0, ring: { radius: 22, width: 3, color: '#e8c87a', alpha: 1 } });
