// ---------------------------------------------------------------------------
// THE BESIEGED WAYPOINT — the 'leyline' zone objective, every number as data.
//
// The zone's waypoint stands SEVERED from the leyline network: a SIPHON — by
// default a promoted champion of the zone's OWN population (every biome's
// thief is native; ObjectiveSpec.id pins a def instead) — has latched onto
// the vein and drinks the node dry from wherever it runs. The drawn tether
// (renderer's waypoint painter) crackles from the starved stone all the way
// to the thief, so the beam IS the map to the fight; the siphon is POSTED at
// its tap (the duty-post fabric — storm-drift and stray shoves can never
// wander the objective away), and the waypoint REFUSES attunement while it
// lives (World.waypointBesieged — one predicate worn by the attune brush,
// the HUD line, and the drawn face).
//
// Fell the siphon and the leyline reattaches ON THE SPOT: the stone relights,
// attunement opens, the chest banks. State is PURE POPULATION — no latch
// beyond the ordinary objective bounty: the wounded thief rides Zone Memory
// like any body, any death counts (a faction brawl that fells it did your
// work — the writ's honesty), and a save/guest derives "besieged" from the
// same replicated actors the fight itself stands on.
// ---------------------------------------------------------------------------

import type { MonsterRarity } from '../engine/rarity';
import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';

export const LEYLINE_CFG = {
  /** Attunement brush radius (world units) around the waypoint stone — the
   *  historical world.ts constant, hoisted to data. */
  attuneRadius: 70,
  /** Door clearance at the siphon's seat. The thief taps the ley WHEREVER
   *  the vein runs — its own POI off the layout rng, like every objective
   *  fixture — and the drawn tether spans the distance back to the starved
   *  stone: the beam IS the map to the fight. */
  portalClear: 140,
  /** Default promotion of the rolled native (ObjectiveSpec.rarity/stacks
   *  override): a champion-tier miniboss, not a boss ask. */
  rarity: 'champion' as MonsterRarity,
  stacks: 1,
  /** Level bonus over the zone (ObjectiveSpec.levelBonus overrides). */
  levelBonus: 1,
  /** STATURE floor on the rolled native (def XP at or above this): the
   *  thief should be a body worth promoting — livestock-grade fauna stay
   *  in the flock (a ley-glutted champion hen was live-rolled once; funny,
   *  not a miniboss). The floor degrades gracefully: a zone whose whole
   *  eligible table sits under it rolls unfiltered rather than spawn
   *  nothing. */
  siphonMinXp: 6,
  /** Duty-post leash (px): strayed past this with no foe in sight, the
   *  siphon walks back to its theft. */
  leash: 260,
  /** Title suffixes minted onto the nemesis name — the thief is NAMED (the
   *  bounty's treatment; picked off the layout rng, so a remembered seed
   *  re-names the same thief). */
  titles: [
    'Leech of the Ley', 'the Waypoint Thief', 'Drinker of Roads',
    'the Severing', 'Warden of the Stolen Node', 'the Unattuned',
  ] as readonly string[],
  /** The waypoint's own cyan (drawn faces + texts share it)… */
  accent: '#5ad8d8',
  /** …and the siphon's drain-tinted beam. */
  beam: '#b06bd4',
  glyph: '◈',
} as const;

// The objective's pointer: the chevron rides the SIPHON (the fight), not the
// stone — the waypoint already draws itself, and the tether joins the two.
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.leylineView();
  if (!v || !v.besieged || !v.siphon) return [];
  return [{
    id: 'ley_siphon', pos: v.siphon, color: LEYLINE_CFG.beam, glyph: LEYLINE_CFG.glyph,
    label: `${v.name} siphons the waypoint`, z: 2,
  }];
});
