// ---------------------------------------------------------------------------
// THE OCCURRENCE SHELF — court-seated mini-events as data (the occurrence
// fabric's debut content; mechanism in engine/occurrences.ts). Every row here
// is one `registerOccurrence` def a court table can name:
//
//   { kind: 'occurrence', weight: 1, params: { id: 'abyssal_fracture' } }
//
// THE UNCERTAINTY DOCTRINE governs the shelf: an occurrence court WEARS a
// plain tenant face (the fracture wears the cache — loot that baits the
// dwell) and is byte-identical to that plain court until it springs. Debut
// table rows are DEFERRED to data/massifs.ts (the court kinds' tenants rows
// adjudicate there — the watch post's own precedent); this file ships the
// defs.
//
// THE ABYSSAL FRACTURE (the charter's debut, near-verbatim): the player
// dwells at the spot — "the abyssals hear the footsteps at the surface" —
// the ground telegraphs (spidering abyss cracks + a held rumble, the
// trapworks rake-stroke doctrine), then a fracture breach smashes through
// (an abyssal_rent — the standing bottomless-tear pit, fall recovery and
// all) and a WAVE of the Abyssal pours out. The kin are the fracture
// package's own roster (packages/defs/fractures.ts — "things that crawl up
// out of a FRACTURE in the earth"), authored here as explicit kin rows with
// presence envelopes so the wave breathes with level and no boss ever rides
// a mini-event. AFTERMATH: the breached spot converts to a RECURRING
// world-clock fixture — the pit keeps pouring small abyssal knots under a
// hard cap, minted at the LIVE zone level (the Quickening anchors it free).
// ---------------------------------------------------------------------------

import { registerOccurrence, type OccKinRow } from '../engine/occurrences';

/** The wave/pour roster — the fracture faction's own bodies (boss tier left
 *  below on purpose; presence envelopes shape the pour by zone level). */
const ABYSSAL_KIN: OccKinRow[] = [
  { id: 'abyssal_crawler', weight: 4 },
  { id: 'abyssal_wretch', weight: 3, presence: { from: 3, fadeIn: 2 } },
  { id: 'abyssal_seer', weight: 2, presence: { from: 5, fadeIn: 3 } },
  { id: 'abyssal_render', weight: 2, presence: { from: 7, fadeIn: 4 } },
  { id: 'abyssal_vanguard', weight: 1, presence: { from: 10, fadeIn: 5 } },
];

registerOccurrence({
  id: 'abyssal_fracture',
  // The bait face: a lootable hoard knot — the reason you stand still long
  // enough to be heard.
  face: 'cache',
  trigger: { kind: 'dwell', sec: 30, radius: 150 },
  telegraph: {
    fromFrac: 0.45,
    text: 'The ground trembles — something below hears your footsteps…',
    // The floor spider-cracks where the breach will open (standing kind:
    // abyss_crack is pure walkable glow — a warning, never a wall).
    dress: [{ kind: 'abyss_crack', radius: [12, 18], count: [3, 4], ring: [24, 62] }],
  },
  spring: {
    text: 'The floor breaches — the Abyss answers!',
    shake: 10,
    flash: { radius: 150 },
    dress: [
      // The breach mouth: the standing bottomless tear (blocks movement,
      // swallows solids, fall recovery — the outer steppes' own pit word).
      { kind: 'abyssal_rent', radius: [24, 30], count: [1, 1], ring: [0, 0], fall: true },
      // The scar around it — more glowing cracks, walked over freely.
      { kind: 'abyss_crack', radius: [14, 22], count: [3, 5], ring: [34, 84] },
    ],
    wave: { kin: ABYSSAL_KIN, count: [5, 8], radius: [50, 130] },
  },
  aftermath: {
    kind: 'fixture',
    // The breached pit keeps pouring on the clock — small knots, hard cap.
    pour: { kin: ABYSSAL_KIN, every: [9, 14], batch: [1, 2], cap: 6, radius: [40, 110] },
  },
  accent: '#b06aff',
});
