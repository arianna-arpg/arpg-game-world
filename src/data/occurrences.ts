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

import { registerOccurrence, type OccKinRow, type RouseResidentParams } from '../engine/occurrences';

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

// ---------------------------------------------------------------------------
// THE CALDERA WAKE (THE WORLD-CLOCK WAKE's debut — the colossal charter's
// second lane, the in-zone damage rouse's sibling): some wyrm calderas do
// not wait to be robbed. The row rides the wyrm_caldera tenant table
// (data/massifs.ts) wearing the REAL den door as its face —
//
//   { kind: 'occurrence', weight: …, params: { id: 'caldera_wake', den: 'kilnhoard' } }
//
// — the registrant delegates to the 'lair_mouth' tenant with the SAME row,
// so `params.den` resolves the kilnhoard's whole identity (door, spoor,
// radius) exactly as a plain den draw would, and the ring is BYTE-IDENTICAL
// to one (the parity law at the colossal grain: same maw, same bone ring —
// no caldera ever tells you whether its mountain keeps a waking clock).
//
// THE WINDOW (the design ruling): nightfall, one entry per day, at a small
// foreordained chance — 'night' because the wheel's dark hours are the one
// clock-pure ominous ground the grammar owns (weather cannot be
// reconstructed for elapsed time, and a wyrm that woke at noon would read
// as a bug), and chance 0.08 because Zone Memory's TTL bounds any counted
// absence to a night or three: most returns find the sleeper, daylight
// errands NEVER wake him (an absence spanning no nightfall rolls nothing),
// and a long campaign in the wyrmfields eventually crosses the one night
// already written to answer. The spring is a word and a tremor — no dress,
// no wave: the event happens a door below, and the den boot is where the
// world shows it (the wyrm stands awake, hunting, the coils not where you
// left them).
// ---------------------------------------------------------------------------

const CALDERA_ROUSE: RouseResidentParams = {
  tag: 'kiln_sleeper',
  // The standing word on every later arrival at the ring — the maw itself
  // confesses the state ("it is awake down there"), so a return visit can
  // choose to walk away from an open door it can no longer rob quietly.
  notice: 'The kiln-throat breathes in long, waking draws.',
  // Floated once at the wyrm the first time a boot finds him walking.
  wakeText: 'The coils are not where you left them. The Urnfather walks.',
};

registerOccurrence({
  id: 'caldera_wake',
  // The bait face IS the den: the caldera's ring grows the kilnhoard's own
  // fired throat (the table row's params.den keys it — see the header).
  face: 'lair_mouth',
  trigger: { kind: 'clock', phases: ['night'], chance: 0.08 },
  spring: {
    text: 'The mountain exhales. Deep below, something vast uncoils.',
    shake: 6,
  },
  aftermath: { kind: 'rouseResident', params: { ...CALDERA_ROUSE } },
  // The kiln glow — the same banked-furnace orange the rouse toast wears.
  accent: '#ff9a3a',
});
