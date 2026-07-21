// ---------------------------------------------------------------------------
// BIOME MELDS — "there really is a jungle up ahead" as an OPEN REGISTRY.
//
// A meld is a NEIGHBOR biome's edge dressing: when a zone's exit faces a
// DIFFERENT biome that declares one, the band of ground along that whole
// edge grows the foreign kit — ferns and brush pressing through the
// treeline, drifts reaching out of the taiga, sand on the meadow's hem —
// so "do I want to cross into there?" is a question the TERRAIN asks
// before the portal label does. The World resolves WHICH biome lies past
// each exit off the same heat-map prediction seam the portal labels and
// boundary gates ride (resolved neighbors read their real biome; '?'
// frontiers sample the field at the exact coord the mint will use), stamps
// the transient def.exitMelds annotation (index-aligned, re-derived every
// load, stripped at both persistence sites), and generateLayout raises the
// band as ordinary terrain through the stamp machinery under an edge WHERE
// gate (the axisX/axisY gen fields) — every placement rule (walk-gating,
// forbidOn, reservations, spacing) still applies.
//
// Adding a meld = one registerMeld row + `meld: '<id>'` on the biome
// (world/biomes.ts BiomeInfo.meld — a structural string ref, the enclave
// gate idiom, so the pure-leaf biome table never imports this registry).
// Melds draw from a DEDICATED per-exit rng (zone seed ^ exit index), so a
// neighbor resolving differently later never shifts the zone's own layout
// stream — only the band itself re-dresses.
// ---------------------------------------------------------------------------

/** One dressing row: an ordinary stamp row the builder emits inside the
 *  band. Kept structural (kind/count/radius) — validate.ts sweeps these
 *  through the same stamp-registry checks every layout row gets. */
export interface MeldRow {
  kind: string;
  count: [number, number];
  radius?: [number, number];
}

export interface MeldDef {
  id: string;
  /** Band depth in px from the melded edge (default MELD_CFG.band). */
  band?: number;
  /** The foreign kit, emitted inside the band. */
  rows: MeldRow[];
  /** Exit-label suffix worn by the crossing ("· the green presses close"). */
  label?: string;
}

/** Modular defaults — the band depth every meld inherits unless it says
 *  otherwise (tune here, never at a call site). */
export const MELD_CFG = { band: 250 } as const;

export const MELDS: Record<string, MeldDef> = {};

export function registerMeld(def: MeldDef): void {
  if (MELDS[def.id]) console.warn(`[melds] re-registering '${def.id}' — overriding`);
  MELDS[def.id] = def;
}

export function meldOf(id: string | undefined): MeldDef | undefined {
  return id ? MELDS[id] : undefined;
}

// --- THE STOCK ROWS -----------------------------------------------------------

// THE JUNGLE'S REACH — the green does not wait at its border: mats of vine,
// ferns and walkable brush spill across the neighboring edge, a bloom lights
// the growth, and sometimes a full cuttable plug has already taken the lane.
registerMeld({
  id: 'jungle_meld',
  label: 'the green presses close',
  rows: [
    { kind: 'vines', count: [2, 4] },
    { kind: 'fern', count: [2, 4] },
    { kind: 'brush', count: [2, 3] },
    { kind: 'jungle_bloom', count: [1, 2] },
    { kind: 'jungle_brush', count: [0, 2] },
    { kind: 'strangler_root', count: [0, 1] },
  ],
});

// THE MOUNTAINS' REACH — the range announces its stone before its snow:
// scattered rock and scree past the last soft ground, the first hardy pines,
// a cairn somebody stacked to find the way back down.
registerMeld({
  id: 'mountain_meld',
  label: 'the mountains rise ahead',
  rows: [
    { kind: 'rocks', count: [2, 4], radius: [12, 24] },
    { kind: 'scree', count: [1, 3] },
    { kind: 'conifers', count: [1, 2] },
    { kind: 'cairn', count: [0, 1] },
  ],
});

// THE TAIGA'S REACH — the cold comes out to meet you: standing drifts past
// the treeline, the first dark conifers, the odd fang of standing ice.
registerMeld({
  id: 'taiga_meld',
  label: 'the cold reaches here',
  rows: [
    { kind: 'snowdrift', count: [2, 4] },
    { kind: 'conifers', count: [1, 3] },
    { kind: 'ice_spike', count: [0, 2] },
  ],
});

// THE DESERT'S REACH — sand on the wind long before the dunes: pale lobes
// drifted over the grass, a cactus that has no business surviving here.
registerMeld({
  id: 'desert_meld',
  label: 'sand on the wind',
  rows: [
    { kind: 'sand', count: [2, 4] },
    { kind: 'cactus', count: [0, 2] },
    { kind: 'rocks', count: [1, 2], radius: [10, 20] },
  ],
});

// THE FARMLAND'S REACH — the worked land announces itself: the first wheat
// stands past the treeline, a rail fence somebody still mends, a bale left
// where the cutting stopped.
registerMeld({
  id: 'farmland_meld',
  label: 'the fields begin',
  rows: [
    { kind: 'wheat', count: [2, 4] },
    { kind: 'hay_bale', count: [0, 2] },
    { kind: 'grass', count: [1, 3] },
    { kind: 'flowers', count: [0, 2] },
    { kind: 'scarecrow', count: [0, 1] },
  ],
});

// THE CITY'S REACH — the road grows crowded before the wall does: a lamp
// somebody lights, cast-off cargo, rubble where the verge was quarried.
registerMeld({
  id: 'metropolis_meld',
  label: 'the city rises beyond',
  rows: [
    { kind: 'street_lamp', count: [1, 2] },
    { kind: 'broken_cart', count: [0, 1] },
    { kind: 'rubble', count: [1, 2] },
    { kind: 'hay_bale', count: [0, 1] },
  ],
});

// THE GARDEN'S REACH — the country ahead grows TALLER than country should:
// blade-grass over your head, petals drifted out past the last stand, one
// young bloom stalk scouting the verge like a sapling that got ideas.
registerMeld({
  id: 'garden_meld',
  label: 'the blooms stand tall ahead',
  rows: [
    { kind: 'wildgrass_blade', count: [2, 4] },
    { kind: 'petal_drift', count: [1, 3] },
    { kind: 'bloom_stalk', count: [0, 1], radius: [22, 32] },
    { kind: 'flowers', count: [1, 2] },
    { kind: 'dew_bead', count: [0, 1] },
  ],
});

// The Grove country's edge: green shade pressing close, and — if you cross
// at the right hour — the first few small lights of the wood's night.
registerMeld({
  id: 'grove_meld',
  label: 'small lights drift between the trees ahead',
  rows: [
    { kind: 'trees', count: [1, 2] },
    { kind: 'brush', count: [1, 2] },
    { kind: 'fern', count: [1, 2] },
    { kind: 'glow_cap', count: [1, 2] },
    { kind: 'lantern_bloom', count: [0, 1] },
  ],
});
