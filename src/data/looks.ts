// ---------------------------------------------------------------------------
// LOOKS — top-down portraits as data. Each entry assembles a monster (or
// class, or NPC) from the part grammar (render/vis/parts.ts): a skeleton IS
// ribs + skull + blade; a reaper IS cowl + tatters + scythe; a lich IS a
// crowned skull over robes with a glow-tipped staff. Silhouette carries the
// identity — these read even with the palette muted.
//
// Placement units: 1 = the actor's body radius, +X = facing. Parts paint in
// order (under → over); `live` parts animate per frame (wisps, flames).
// Defs opt in with `look: '<id>'`; anything without one keeps the legacy
// shape+adorn body. Compose new monsters here — no draw code.
// ---------------------------------------------------------------------------

import type { LookDef } from '../render/vis/parts';

export const LOOKS: Record<string, LookDef> = {

  // ============================================== THE DEAD (the flagship set)
  /** Bare bones and a blade: ribs radiating off a spine, skull forward. */
  skeleton_warrior: {
    parts: [
      { kind: 'ribs', params: { under: true } },
      { kind: 'sword', y: 0, params: { len: 0.95 } },
      { kind: 'skull', x: 0.5 },
    ],
  },
  skeleton_archer: {
    parts: [
      { kind: 'ribs', params: { under: true } },
      { kind: 'bow' },
      { kind: 'skull', x: 0.5 },
    ],
  },
  skeletal_cleric: {
    parts: [
      { kind: 'tatters', x: -0.1, scale: 0.8 },
      { kind: 'ribs', params: { under: true } },
      { kind: 'staff', params: { orb: 'glow' } },
      { kind: 'skull', x: 0.5 },
    ],
  },
  /** Shambling flesh: lopsided blob, ribs torn open on one flank, dull eyes. */
  zombie: {
    parts: [
      { kind: 'blob', params: { irr: 0.2, seed: 4 } },
      { kind: 'ribs', x: -0.18, y: 0.3, rot: 0.5, scale: 0.42, alpha: 0.9, params: { pairs: 3, span: 0.75 } },
      { kind: 'eyes', color: '#c8d89a', params: { spread: 0.4, dist: 0.62, size: 0.08 } },
    ],
  },
  /** The CRAWLING dead: lost below the waist — a front-heavy torso hauled
   *  along on two overreached talon arms, the spine bared where the legs
   *  used to be, ragged hide trailing off the stump, a glistening smear
   *  dragging behind (live). Hiveborn's corpse-brood wears this. */
  zombie_crawler: {
    parts: [
      { kind: 'blob', x: 0.12, scale: 0.82, params: { irr: 0.32, seed: 11 } },
      { kind: 'tatters', x: -0.42, scale: 0.66, alpha: 0.8, params: { n: 4 } },
      { kind: 'ribs', x: -0.5, rot: Math.PI, scale: 0.52, alpha: 0.95, params: { pairs: 3, span: 0.85 } },
      { kind: 'claws', x: 0.2, scale: 1.22, params: { len: 0.62, talons: 3 } },
      { kind: 'eyes', color: '#c8d89a', params: { spread: 0.34, dist: 0.72, size: 0.09 } },
    ],
    live: [{ kind: 'slimeTrail', color: '#5a3028', params: { n: 5 } }],
  },
  /** The ghost: a cowled nothing trailing away to wisps. */
  ghost: {
    parts: [
      { kind: 'tatters', scale: 0.9, params: { n: 5 } },
      { kind: 'disc', scale: 0.72 },
      { kind: 'hood', x: 0.28, scale: 1.05, params: { eyes: true } },
    ],
    live: [{ kind: 'wisps', x: -0.4 }],
  },
  /** A raw spirit: no body at all — a burning mote in a halo. */
  spirit: {
    parts: [
      { kind: 'disc', scale: 0.55 },
      { kind: 'halo', scale: 0.85 },
      { kind: 'eyes', params: { n: 2, spread: 0.5, dist: 0.34, size: 0.11 } },
    ],
    live: [{ kind: 'wisps', x: -0.25, scale: 0.8, params: { n: 2 } }],
  },
  /** THE REAPER: deep cowl, rag-torn cloak, the scythe. */
  reaper: {
    parts: [
      { kind: 'tatters', params: { n: 5 } },
      { kind: 'robe', scale: 0.9 },
      { kind: 'scythe' },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
    ],
  },
  /** The necromancer: robes, a raised cowl, the skull-tipped staff. */
  necromancer: {
    parts: [
      { kind: 'robe' },
      { kind: 'staff', params: { skullTip: true } },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
      { kind: 'runes', scale: 0.9, params: { n: 3 } },
    ],
  },
  /** THE LICH: a crowned skull over burial cloth, glow-staff, court of runes. */
  lich: {
    parts: [
      { kind: 'tatters', params: { n: 4 } },
      { kind: 'robe', scale: 0.92 },
      { kind: 'staff', params: { orb: 'glow' } },
      { kind: 'skull', x: 0.32, scale: 1.1, params: { glow: 'glow' } },
      { kind: 'crown', x: 0.18, scale: 0.72 },
      { kind: 'runes', params: { n: 4 } },
    ],
  },
  /** Hooded wraith with paired blades (the blade wraith's kit). */
  blade_wraith: {
    parts: [
      { kind: 'tatters', params: { n: 4 } },
      { kind: 'disc', scale: 0.7 },
      { kind: 'daggers', params: { len: 0.7 } },
      { kind: 'hood', x: 0.28, params: { eyes: true } },
    ],
    live: [{ kind: 'wisps', x: -0.35, params: { n: 2 } }],
  },
  wraith: {
    parts: [
      { kind: 'tatters', params: { n: 4 } },
      { kind: 'disc', scale: 0.7 },
      { kind: 'hood', x: 0.28, params: { eyes: true } },
    ],
    live: [{ kind: 'wisps', x: -0.35, params: { n: 3 } }],
  },
  /** Armored ghost knight: helm + pauldrons + blade, all faded. */
  revenant_knight: {
    parts: [
      { kind: 'tatters', params: { n: 3 } },
      { kind: 'torso' },
      { kind: 'pauldrons' },
      { kind: 'sword' },
      { kind: 'helm' },
    ],
    live: [{ kind: 'wisps', x: -0.5, scale: 0.7, params: { n: 2 } }],
  },
  /** Ghoul: hunched blob, all claws and maw. */
  ghoul: {
    parts: [
      { kind: 'blob', params: { irr: 0.18, seed: 9 } },
      { kind: 'claws', params: { len: 0.5 } },
      { kind: 'maw', scale: 0.55, x: 0.4 },
      { kind: 'eyes', params: { spread: 0.55, dist: 0.6, size: 0.08 } },
    ],
  },
  /** A walking grave-maw — the body IS the mouth. */
  gravemaw: {
    parts: [
      { kind: 'blob', params: { irr: 0.14, seed: 12 } },
      { kind: 'maw', scale: 0.95, params: { arc: 0.8 } },
      { kind: 'eyes', params: { n: 4, spread: 1.0, dist: 0.82, size: 0.07 } },
    ],
  },
  bone_serpent_head: {
    parts: [
      { kind: 'serpentHead' },
      { kind: 'skull', x: 0.3, scale: 0.95 },
      { kind: 'spineTrail' },
    ],
    shadowScale: 1.1,
  },
  crypt_warden: {
    parts: [
      { kind: 'ribs', params: { under: true } },
      { kind: 'shield' },
      { kind: 'mace' },
      { kind: 'skull', x: 0.5 },
      { kind: 'pauldrons', scale: 0.9 },
    ],
  },
  bone_colossus: {
    parts: [
      { kind: 'ribs', scale: 1.1, params: { pairs: 5, span: 1.0, under: true } },
      { kind: 'claws', scale: 1.05, params: { len: 0.55, talons: 4 } },
      { kind: 'skull', x: 0.52, scale: 1.15 },
      { kind: 'spikes', scale: 0.8, params: { n: 5 } },
    ],
    shadowScale: 1.15,
  },
  /** A choir of the hollow dead — three cowls in one drifting mass. */
  hollow_choir: {
    parts: [
      { kind: 'tatters', params: { n: 6 } },
      { kind: 'disc', scale: 0.85 },
      { kind: 'hood', x: 0.42, scale: 0.62, params: { eyes: true } },
      { kind: 'hood', x: -0.05, y: 0.42, scale: 0.55, params: { eyes: true } },
      { kind: 'hood', x: -0.05, y: -0.42, scale: 0.55, params: { eyes: true } },
    ],
    live: [{ kind: 'wisps', x: -0.5, params: { n: 3 } }],
  },

  // ============================================================ GREENSKINS
  goblin: {
    parts: [
      { kind: 'disc' },
      { kind: 'ears' },
      { kind: 'daggers', params: { len: 0.45 } },
      { kind: 'eyes', params: { spread: 0.42, dist: 0.55, size: 0.09 } },
    ],
  },
  goblin_shaman: {
    parts: [
      { kind: 'robe', scale: 0.95 },
      { kind: 'ears' },
      { kind: 'staff', params: { orb: 'glow' } },
      { kind: 'eyes', params: { spread: 0.42, dist: 0.5, size: 0.09 } },
    ],
  },
  goblin_brute: {
    parts: [
      { kind: 'disc' },
      { kind: 'ears' },
      { kind: 'mace' },
      { kind: 'pauldrons', scale: 0.85, role: 'wood' },
      { kind: 'eyes', params: { spread: 0.4, dist: 0.55, size: 0.08 } },
    ],
  },
  goblin_chief: {
    parts: [
      { kind: 'disc' },
      { kind: 'ears' },
      { kind: 'sword' },
      { kind: 'crown', x: 0.1, scale: 0.7 },
      { kind: 'eyes', params: { spread: 0.4, dist: 0.55, size: 0.08 } },
    ],
  },
  orc: {
    parts: [
      { kind: 'torso' },
      { kind: 'horns' },
      { kind: 'axe' },
      { kind: 'tusks', x: 0.35 },
    ],
  },
  troll: {
    parts: [
      { kind: 'blob', params: { irr: 0.15, seed: 6 } },
      { kind: 'spikes' },
      { kind: 'claws', params: { len: 0.55, talons: 3 } },
      { kind: 'maw', scale: 0.5, x: 0.42, params: { arc: 0.5 } },
    ],
  },
  gnoll: {
    parts: [
      { kind: 'disc', scale: 0.95 },
      { kind: 'snout' },
      { kind: 'claws', params: { len: 0.4 } },
      { kind: 'tail', params: { len: 0.7, tuft: true } },
    ],
  },
  gnoll_butcher: {
    parts: [
      { kind: 'disc' },
      { kind: 'snout' },
      { kind: 'axe' },
      { kind: 'tail', params: { len: 0.6, tuft: true } },
    ],
  },

  // ==================================================== THE CONFUSION KIN
  // The widdershin court's tutors: spiral eyes are the family's face (the
  // at-a-glance "controls in danger" tell), worn LIVE so they visibly turn.
  /** The mazer moth: powder lobes with false eyespots; the REAL eyes
   *  spiral. Flighty, dusty, wrong. */
  mazer_moth: {
    parts: [
      { kind: 'mothWings', scale: 1.0 },
      { kind: 'disc', scale: 0.62 },
      { kind: 'antennae', scale: 0.85 },
    ],
    live: [
      { kind: 'spiralEyes', params: { spread: 0.34, dist: 0.45, size: 0.16 } },
    ],
  },
  /** The widdershin wisp: a contrary spirit — glow-core body under a halo,
   *  carrying the bell it rings only for the inner ear; the bell sways and
   *  the eyes turn (counterclockwise, both, always). */
  widdershin_wisp: {
    parts: [
      { kind: 'orb', scale: 0.95 },
      { kind: 'halo', scale: 1.15, alpha: 0.8 },
    ],
    live: [
      { kind: 'bell', x: -0.35, scale: 0.75, params: { swing: 0.22 } },
      { kind: 'spiralEyes', params: { spread: 0.3, dist: 0.3, size: 0.2, turns: 3 } },
    ],
  },

  // =============================================================== DEMONS
  imp: {
    parts: [
      { kind: 'disc', scale: 0.9 },
      { kind: 'wings', scale: 0.7 },
      { kind: 'tail', params: { len: 0.8 } },
      { kind: 'horns', scale: 0.65 },
      { kind: 'eyes', params: { spread: 0.45, dist: 0.55, size: 0.1 } },
    ],
  },
  hellhound: {
    parts: [
      { kind: 'disc', scale: 0.95 },
      { kind: 'snout' },
      { kind: 'tail', params: { len: 0.8 } },
      { kind: 'eyes', color: '#ffb34a', params: { spread: 0.42, dist: 0.52, size: 0.09 } },
    ],
    live: [{ kind: 'flames', x: -0.25, scale: 0.6, params: { n: 2 } }],
  },
  demon_brute: {
    parts: [
      { kind: 'torso' },
      { kind: 'wings', scale: 0.85 },
      { kind: 'horns' },
      { kind: 'claws', params: { len: 0.5 } },
      { kind: 'maw', scale: 0.42, x: 0.45, params: { arc: 0.45 } },
    ],
  },
  demon_lord: {
    parts: [
      { kind: 'torso', scale: 1.05 },
      { kind: 'wings' },
      { kind: 'horns', scale: 1.1 },
      { kind: 'sword', params: { len: 1.15, w: 0.14 } },
      { kind: 'crown', x: 0.35, scale: 0.6, role: 'dark' },
      { kind: 'eyes', params: { spread: 0.35, dist: 0.6, size: 0.09 } },
    ],
    live: [{ kind: 'flames', x: -0.2, scale: 0.75, params: { n: 3 } }],
  },
  cinder_fiend: {
    parts: [
      { kind: 'blob', params: { irr: 0.16, seed: 21 } },
      { kind: 'horns', scale: 0.8 },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.5, dist: 0.6, size: 0.09 } },
    ],
    live: [{ kind: 'flames', params: { n: 3 } }],
  },
  /** A scrap of living cinder: stub horns, hot little eyes, shedding sparks. */
  ash_whelp: {
    parts: [
      { kind: 'blob', scale: 0.9, params: { irr: 0.22, seed: 33 } },
      { kind: 'horns', scale: 0.5 },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.5, dist: 0.55, size: 0.12 } },
    ],
    live: [{ kind: 'emberSparks', params: { n: 3, drift: 0.7 } }],
  },
  /** The meat wall: a lopsided mass, gorged sacs, crude field-stitching, a
   *  maw that takes up most of the front. */
  bloodgorger: {
    parts: [
      { kind: 'blob', params: { irr: 0.26, seed: 45 } },
      { kind: 'bloatSacs', x: -0.2, scale: 0.85, params: { n: 3 } },
      { kind: 'stitchSeams', rot: 0.6, params: { n: 2 } },
      { kind: 'maw', x: 0.42, scale: 0.5, params: { arc: 0.55 } },
      { kind: 'eyes', color: '#ffb0a0', params: { spread: 0.55, dist: 0.6, size: 0.07 } },
    ],
  },
  /** The choir-priest: robed, horn-crowned, a censer swinging ash. */
  brimstone_cantor: {
    parts: [
      { kind: 'robe' },
      { kind: 'crownOfHorns', x: 0.26, scale: 0.7 },
      { kind: 'censer', y: 0.55, scale: 0.9 },
      { kind: 'runes', scale: 0.85, params: { n: 3 } },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
    ],
    live: [{ kind: 'emberSparks', x: -0.2, scale: 0.8, params: { n: 3, drift: 0.6 } }],
  },
  /** The tormentor: bare torso hung with chains, a long whip arm, spiked. */
  chained_tormentor: {
    parts: [
      { kind: 'torso', scale: 0.95 },
      { kind: 'chains', rot: 0.4, params: { n: 2 } },
      { kind: 'whip' },
      { kind: 'horns', scale: 0.75 },
      { kind: 'eyes', params: { spread: 0.4, dist: 0.58, size: 0.09 } },
    ],
  },
  /** The Legion's voice: robes, a war-banner, the brand held high. */
  doomherald: {
    parts: [
      { kind: 'robe', scale: 0.95 },
      { kind: 'banner', x: -0.15 },
      { kind: 'brand', x: 0.3, scale: 0.8 },
      { kind: 'wings', scale: 0.6, alpha: 0.85 },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
    ],
  },
  /** The skinner: a lean dart of a body, paired flensing knives, barbed. */
  abyssal_flayer: {
    parts: [
      { kind: 'disc', scale: 0.8 },
      { kind: 'tail', params: { len: 0.9 } },
      { kind: 'daggers', params: { len: 0.6 } },
      { kind: 'barbs', scale: 0.85, params: { n: 4 } },
      { kind: 'eyes', color: '#ff5a8a', params: { spread: 0.42, dist: 0.6, size: 0.09 } },
    ],
  },
  /** The gatekeeper: robes over a tentacle-fringe, an orb-staff, horned. */
  hellgate_caller: {
    parts: [
      { kind: 'tentacleRing', scale: 0.85, params: { n: 6 } },
      { kind: 'robe', scale: 0.92 },
      { kind: 'staff', params: { orb: 'glow' } },
      { kind: 'horns', scale: 0.7 },
      { kind: 'runes', params: { n: 4 } },
      { kind: 'eyes', params: { spread: 0.35, dist: 0.55, size: 0.09 } },
    ],
  },
  /** The planted gate: a ring of teeth around a molten throat — ground
   *  anatomy, not a walker (rot 0 keeps the maw facing the sky). */
  rift_maw: {
    parts: [
      { kind: 'blob', params: { irr: 0.18, seed: 51 } },
      { kind: 'lavaCracks', params: { n: 3 } },
      { kind: 'mawRing', scale: 0.9 },
      { kind: 'orb', scale: 0.4, role: 'glow' },
    ],
    live: [{ kind: 'emberSparks', params: { n: 4, drift: 1.1 } }],
    shadowScale: 0.6,
  },
  /** The walking tower: plated shoulders over a magma-seamed hide, ram
   *  horns, claws — and sparks guttering off the crust. */
  pyre_titan: {
    parts: [
      { kind: 'torso', scale: 1.05 },
      { kind: 'lavaCracks', params: { n: 4 } },
      { kind: 'armorPlates', x: -0.1, scale: 0.9 },
      { kind: 'ramHorns', scale: 0.95 },
      { kind: 'claws', params: { len: 0.5 } },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.32, dist: 0.62, size: 0.08 } },
    ],
    live: [{ kind: 'emberSparks', params: { n: 5, drift: 0.9 } }],
  },
  /** The field officer: winged, horn-crowned, caped — and the trident,
   *  the pit's rank insignia. */
  archfiend_legate: {
    parts: [
      { kind: 'cape', scale: 0.95 },
      { kind: 'torso' },
      { kind: 'wings', scale: 0.9 },
      { kind: 'crownOfHorns', x: 0.28, scale: 0.75 },
      { kind: 'trident', params: { len: 1.15 } },
      { kind: 'eyes', params: { spread: 0.35, dist: 0.6, size: 0.09 } },
    ],
    live: [{ kind: 'flames', x: -0.25, scale: 0.6, params: { n: 2 } }],
  },

  // ======================================================== HUMAN THREATS
  cultist: {
    parts: [
      { kind: 'robe' },
      { kind: 'hood', x: 0.3 },
      { kind: 'daggers', params: { len: 0.4 } },
      { kind: 'torch', mirror: true, alpha: 0.95 },
    ],
  },
  fire_caster: {
    parts: [
      { kind: 'robe' },
      { kind: 'hood', x: 0.3, params: { eyes: true, eyeColor: '#ffb34a' } },
      { kind: 'staff', params: { orb: '#ff8a3a' } },
    ],
    live: [{ kind: 'flames', x: 0.85, y: 0.66, scale: 0.4, params: { n: 2 } }],
  },
  // THE CADENCED KIN — duellists of the measured school. Coin-plain cloth
  // and one good blade: the identity is TIME made visible. The hip bell
  // keeps it (live swing), the beat pips count it (live: they kindle in
  // sequence — the new grammar-tell part), and when a measure completes
  // the payoff text names a grammar the player can EARN — the family
  // reuses PLAYER combo rules verbatim, so watching one duel is the
  // tutorial. No glow-eyes on the fencer (living humans keep the wayfarer
  // convention); the cantor's lit hood reads "caster", not "construct".
  cadence_fencer: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.32, scale: 0.85 },
      { kind: 'sword', params: { len: 0.9 } },
      { kind: 'bell', x: -0.4, y: 0.55, scale: 0.5 },
    ],
    live: [{ kind: 'beatPips', x: -0.6, color: '#d8a05a', scale: 0.9, params: { n: 3 } }],
  },
  cadence_cantor: {
    parts: [
      { kind: 'robe' },
      { kind: 'hood', x: 0.3, params: { eyes: true, eyeColor: '#e8d8f8' } },
      { kind: 'staff', params: { orb: '#e8d8f8' } },
      // The round made wearable: one small rune orbit per school.
      { kind: 'runes', color: '#ff8a4a', scale: 0.72, params: { n: 2 } },
      { kind: 'runes', color: '#9ad8f8', scale: 0.9, params: { n: 2 } },
      { kind: 'runes', color: '#ffe14a', scale: 1.05, params: { n: 2 } },
      { kind: 'bell', x: -0.4, y: 0.55, scale: 0.45 },
    ],
    live: [{ kind: 'beatPips', x: -0.6, color: '#9ad8f8', scale: 0.9, params: { n: 3 } }],
  },
  /** The MAESTRO: the school's crown — blade in one hand, spell-focus in
   *  the other (the weave IS the man), laurel of the measured school,
   *  four-count pips. */
  cadence_maestro: {
    parts: [
      { kind: 'torso' },
      { kind: 'cape', role: 'cloth' },
      { kind: 'sword', params: { len: 1.0 } },
      { kind: 'orb', x: -0.45, y: -0.5, scale: 0.5, color: '#b8a8e8' },
      { kind: 'laurel', color: '#d8c88a' },
      { kind: 'bell', x: -0.4, y: 0.6, scale: 0.55 },
    ],
    live: [{ kind: 'beatPips', x: -0.65, color: '#b8a8e8', params: { n: 4 } }],
  },
  // THE GRIP KIN (the grab fabric's tutors — engine/grab.ts): one verb per
  // silhouette, one tack part per verb (render/vis/parts.ts): the GRAPNEL
  // drags, the YOKE pins, the GULLETSACK swallows. The read at a glance IS
  // the counterplay briefing — you know which hold is coming before it
  // lands, and the sac visibly WORKS while something is inside.
  gaff_wrangler: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.3, scale: 0.8 },
      { kind: 'net', x: -0.38, y: -0.45, scale: 0.7, role: 'cloth' },
      { kind: 'grapnel', x: -0.12, y: 0.5, scale: 0.95 },
    ],
  },
  yoke_mauler: {
    parts: [
      { kind: 'torso', scale: 1.08 },
      { kind: 'warpaint', scale: 0.9 },
      { kind: 'harness', scale: 0.85 },
      { kind: 'yoke', y: -0.32, scale: 1.05 },
    ],
  },
  gorge_gulper: {
    parts: [
      { kind: 'blob', scale: 1.06, params: { irr: 0.14, seed: 611 } },
      { kind: 'spots', scale: 0.9, role: 'dark' },
      { kind: 'eyes', x: 0.32, scale: 0.8, color: '#e8d878' },
      { kind: 'fangJaw', x: 0.44, scale: 0.8 },
    ],
    live: [{ kind: 'gulletSac', x: 0.26, y: 0.18, scale: 1.0 }],
    shadowScale: 0.95,
  },
  maw_bloom: {
    parts: [
      { kind: 'roots', scale: 1.15, role: 'dark' },
      { kind: 'fronds', scale: 0.95 },
      { kind: 'polyps', scale: 0.72, role: 'accent' },
      { kind: 'mawRing', scale: 0.9 },
    ],
    // The bloom's craw works the same slow squeeze as the gulper's sac —
    // one live part, two devourers, the same "something is inside" read.
    live: [{ kind: 'gulletSac', y: 0.12, scale: 0.8, params: { rate: 0.6 } }],
    shadowScale: 0.9,
  },
  frost_caster: {
    parts: [
      { kind: 'robe' },
      { kind: 'hood', x: 0.3, params: { eyes: true, eyeColor: '#bfe8ff' } },
      { kind: 'staff', params: { orb: '#9fd8ff' } },
      { kind: 'runes', color: '#9fd8ff', params: { n: 3 } },
    ],
  },
  storm_caster: {
    parts: [
      { kind: 'robe' },
      { kind: 'staff', params: { orb: '#ffe14a' } },
      { kind: 'runes', color: '#ffe14a', params: { n: 4 } },
      { kind: 'hood', x: 0.3, params: { eyes: true, eyeColor: '#ffe14a' } },
    ],
  },
  hexer: {
    parts: [
      { kind: 'robe' },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
      { kind: 'runes', params: { n: 5 } },
    ],
  },
  bandit: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.32, scale: 0.85 },
      { kind: 'daggers', params: { len: 0.5 } },
    ],
  },
  bandit_bruiser: {
    parts: [
      { kind: 'torso' },
      { kind: 'mace' },
      { kind: 'pauldrons', role: 'wood' },
    ],
  },
  // The powder kin — bandits who took up guns (the munitions family's
  // monster face). Quiver = the bolt drum; keg = the grenado satchel.
  bandit_fusilier: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.32, scale: 0.85 },
      { kind: 'musket' },
      { kind: 'quiver', scale: 0.8 },
    ],
  },
  bandit_grenadier: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.3, scale: 0.9 },
      { kind: 'keg', x: -0.34, scale: 0.5 },
    ],
  },
  bandit_matchlock: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.32, scale: 0.85 },
      { kind: 'musket', params: { len: 1.35 } },
      { kind: 'plume', x: 0.36, scale: 0.6 },
    ],
  },
  bandit_powder_witch: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.3, scale: 0.9, params: { eyes: true } },
      { kind: 'staff', rot: -0.3, params: { orb: 'glow' } },
      { kind: 'runes', params: { n: 3 } },
    ],
  },
  spearman: {
    parts: [
      { kind: 'torso' },
      { kind: 'sword', params: { len: 1.5, w: 0.06, guard: false } },
    ],
  },
  crusader: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons' },
      { kind: 'sword' },
      { kind: 'shield', params: { kite: true } },
      { kind: 'helm' },
    ],
  },
  crusader_arbalest: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons', scale: 0.9 },
      { kind: 'bow' },
      { kind: 'helm' },
    ],
  },
  crusader_banner: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons' },
      { kind: 'staff', rot: -0.35, params: { orb: 'glow' } },
      { kind: 'helm' },
      { kind: 'halo', scale: 0.9, alpha: 0.5 },
    ],
  },
  warchief: {
    parts: [
      { kind: 'torso', scale: 1.02 },
      { kind: 'pauldrons' },
      { kind: 'axe' },
      { kind: 'plume', x: 0.38, scale: 0.8 },
      { kind: 'warpaint', params: { n: 3 } },
      { kind: 'crown', x: 0.38, scale: 0.62 },
    ],
  },

  // ==================================================== CONSTRUCTS/ELEMENTS
  golem: {
    parts: [
      { kind: 'disc' },
      { kind: 'claws', params: { len: 0.3, talons: 3 } },
      { kind: 'runes', params: { n: 3 } },
      { kind: 'eyes', params: { spread: 0.35, dist: 0.55, size: 0.1 } },
    ],
  },
  // --- THE KARST STONEKIN: four silhouettes, four jobs, zero new painters —
  // the serpent that STARES (dorsal crest + hooped stone coils), the warden
  // that is petrified FOREST (bark plates + branch arms in grey), the
  // slinger whose orbiting shards say ARTILLERY at a glance, and the rubble
  // heap that spills into skittering chips when it breaks.
  basilisk: {
    parts: [
      { kind: 'segmentRings', color: '#8f8a7c', scale: 1.05 },
      { kind: 'serpentHead', color: '#9a948a', scale: 0.95 },
      { kind: 'crest', x: 0.1, scale: 0.9, role: 'accent' },
      { kind: 'eyes', color: '#b8a44a', params: { spread: 0.26, dist: 0.66, size: 0.11 } },
    ],
    banding: 'hoops',
    shadowScale: 0.9,
  },
  petrified_warden: {
    parts: [
      { kind: 'torso', color: '#7d7868' },
      { kind: 'barkPlates', color: '#6a665c' },
      { kind: 'branchArms', color: '#8a8578', scale: 0.9 },
      { kind: 'mossPatch', color: '#6a7a5a', scale: 0.7, alpha: 0.7 },
      { kind: 'eyes', color: '#b8a44a', params: { spread: 0.3, dist: 0.5, size: 0.09 } },
    ],
  },
  karst_slinger: {
    parts: [
      { kind: 'disc', scale: 0.9 },
      { kind: 'stalactites', scale: 0.95, params: { n: 4 } },
      { kind: 'claws', params: { len: 0.24, talons: 3 } },
      { kind: 'eyes', color: '#d8cc9a', params: { spread: 0.34, dist: 0.52, size: 0.09 } },
    ],
    live: [{ kind: 'floatingShards', color: '#a89f8a', scale: 0.9, params: { n: 3 } }],
  },
  scree_shambler: {
    parts: [
      { kind: 'stalactites', scale: 1.12, params: { n: 5 } },
      { kind: 'disc', scale: 0.62 },
      { kind: 'claws', params: { len: 0.26, talons: 3 } },
      { kind: 'eyes', color: '#c8b464', params: { spread: 0.3, dist: 0.42, size: 0.08 } },
    ],
  },
  scree_skitter: {
    parts: [
      { kind: 'disc', scale: 0.9 },
      { kind: 'spikes', scale: 0.85, params: { n: 5 } },
      { kind: 'eyes', color: '#c8b464', params: { spread: 0.4, dist: 0.5, size: 0.1 } },
    ],
    shadowScale: 0.8,
  },
  /** The quarry's avalanche (the mass fabric's weight lesson, heavy end):
   *  a block of sarsen behind a horn sweep — the yoke hump and plate spine
   *  say WEIGHT before the charge does. */
  sarsen_ram: {
    parts: [
      { kind: 'hump', scale: 1.05 },
      { kind: 'armorPlates', role: 'base', scale: 0.95 },
      { kind: 'ramHorns', scale: 1.15 },
      { kind: 'snout', scale: 0.62 },
      { kind: 'eyes', color: '#d8cc9a', params: { spread: 0.3, dist: 0.6, size: 0.08 } },
    ],
  },
  /** The density exception, read at a glance: a knee-high ingot WEARING AN
   *  ANCHOR — chains, a squat helm, no neck to speak of. The smallest body
   *  in the country and the hardest to move (metal × heft; engine/mass.ts). */
  lode_thrall: {
    parts: [
      { kind: 'disc', role: 'metal', scale: 0.95 },
      { kind: 'chains', scale: 0.85 },
      { kind: 'anchor', role: 'metal', scale: 0.9 },
      { kind: 'helm', role: 'metal', scale: 0.7 },
      { kind: 'eyes', color: '#9ac8e0', params: { spread: 0.26, dist: 0.5, size: 0.09 } },
    ],
    shadowScale: 0.9,
  },
  flame_elemental: {
    parts: [
      { kind: 'disc', scale: 0.8 },
      { kind: 'eyes', color: '#fff0b0', params: { spread: 0.42, dist: 0.42, size: 0.1 } },
    ],
    live: [{ kind: 'flames', params: { n: 4 } }],
  },
  crystal_sovereign: {
    parts: [
      { kind: 'disc', scale: 0.9 },
      { kind: 'crown', scale: 1.25, role: 'accent', params: { tines: 7 } },
      { kind: 'runes', params: { n: 5 } },
      { kind: 'halo', scale: 1.05, alpha: 0.6 },
    ],
    // The court regalia: lattice shards riding the mantle, glints walking.
    live: [{ kind: 'crystalGrowths', role: 'accent', params: { n: 5 } }],
  },

  // ================================================================ BEASTS
  hound: {
    parts: [
      { kind: 'disc', scale: 0.92 },
      { kind: 'snout' },
      { kind: 'tail', params: { len: 0.75 } },
    ],
  },
  stalker: {
    parts: [
      { kind: 'disc', scale: 0.95 },
      { kind: 'snout' },
      { kind: 'claws', params: { len: 0.45 } },
      { kind: 'tail', params: { len: 0.9, tuft: true } },
      { kind: 'spikes', scale: 0.6, params: { n: 4 } },
    ],
  },
  behemoth: {
    parts: [
      { kind: 'disc', scale: 1.02 },
      { kind: 'snout', scale: 1.05 },
      { kind: 'horns', scale: 1.1 },
      { kind: 'tail', params: { len: 0.7 } },
    ],
    shadowScale: 1.1,
  },
  tusker: {
    parts: [
      { kind: 'disc', scale: 1.0 },
      { kind: 'snout' },
      { kind: 'tusks', x: 0.5, scale: 1.35 },
      { kind: 'tail', params: { len: 0.5 } },
    ],
  },
  rat: {
    parts: [
      { kind: 'disc', scale: 0.85 },
      { kind: 'snout', scale: 0.9 },
      { kind: 'tail', params: { len: 1.2 } },
      { kind: 'eyes', color: '#e88a8a', params: { spread: 0.4, dist: 0.5, size: 0.08 } },
    ],
  },

  // ========================================================== THE VERMINFALL
  /** The gutter roach: a low lacquered oval, too many legs, gone already. */
  roach: {
    parts: [
      { kind: 'carapace', scale: 0.8, params: { segs: 2 } },
      { kind: 'legs', params: { pairs: 3 } },
      { kind: 'eyes', params: { n: 2, spread: 0.45, dist: 0.6, size: 0.07 } },
    ],
  },
  /** The verminkin: a hunched rat walking like an apology — snout, knives,
   *  and a tail it never learned to hide. */
  verminkin: {
    parts: [
      { kind: 'torso', scale: 0.8 },
      { kind: 'snout', scale: 0.95 },
      { kind: 'ears', scale: 0.75 },
      { kind: 'tail', params: { len: 1.1 } },
      { kind: 'daggers', params: { len: 0.45 } },
      { kind: 'eyes', color: '#e88a8a', params: { spread: 0.38, dist: 0.5, size: 0.08 } },
    ],
  },
  /** The broodpriest: robed rot-clergy — a snout under a bent staff. */
  broodpriest: {
    parts: [
      { kind: 'robe', scale: 0.9, role: 'dark' },
      { kind: 'snout', scale: 0.9 },
      { kind: 'ears', scale: 0.7 },
      { kind: 'tail', params: { len: 1.0 } },
      { kind: 'staff', y: -0.08, params: { skullTip: true } },
    ],
  },
  /** The Rat King: the warren's one idea, crowned — ruff, fangs, and a tail
   *  the length of his reign. */
  rat_king: {
    parts: [
      { kind: 'furRuff', scale: 1.05 },
      { kind: 'torso', scale: 0.9 },
      { kind: 'snout', scale: 1.0 },
      { kind: 'fangs', scale: 0.85 },
      { kind: 'tail', params: { len: 1.35, tuft: true } },
      { kind: 'crown', x: 0.28, scale: 0.7, role: 'glow' },
      { kind: 'eyes', color: '#ffb04a', params: { spread: 0.4, dist: 0.5, size: 0.09 } },
    ],
  },
  /** The warren nest: a chewed mound of twigs and worse, eyes in the holes. */
  warren_nest: {
    parts: [
      { kind: 'nestTwigs', params: { n: 16 } },
      { kind: 'spots', role: 'dark', params: { n: 5 } },
      { kind: 'eyes', color: '#e88a8a', params: { n: 3, spread: 0.7, dist: 0.45, size: 0.07 } },
    ],
  },

  // ========================================================== THE MIRRORKIN
  /** The mirror husk: a blank where a face should be, lit from nowhere. */
  mirror_husk: {
    parts: [
      { kind: 'disc', scale: 0.85 },
      { kind: 'mask', scale: 0.6, role: 'glow' },
      { kind: 'halo', scale: 0.95, alpha: 0.4, role: 'glow' },
    ],
    live: [{ kind: 'wisps', scale: 0.6, params: { n: 2 } }],
  },

  // ============================================== THE WAX COURT & THE UMBRAL
  /** The wax footman: a soldier poured, not born — a wick where thought goes. */
  wax_footman: {
    parts: [
      { kind: 'torso', scale: 0.85, role: 'bone' },
      { kind: 'spots', role: 'glow', params: { n: 3 } },
      { kind: 'eyes', color: '#ffb45e', params: { spread: 0.35, dist: 0.5, size: 0.08 } },
    ],
    live: [{ kind: 'flames', scale: 0.4, role: 'glow' }],
  },
  /** The wickling: a candle that got ambitions. */
  wickling: {
    parts: [
      { kind: 'disc', scale: 0.55, role: 'bone' },
      { kind: 'eyes', color: '#ffcf7a', params: { spread: 0.4, dist: 0.5, size: 0.1 } },
    ],
    live: [{ kind: 'flames', scale: 0.6, role: 'glow' }],
  },
  /** The chandler: robed wax-clergy under a working flame. */
  wax_chandler: {
    parts: [
      { kind: 'robe', scale: 0.9, role: 'bone' },
      { kind: 'staff', y: -0.08 },
      { kind: 'halo', scale: 0.55, alpha: 0.5, role: 'glow' },
    ],
    live: [{ kind: 'flames', scale: 0.45, role: 'glow' }],
  },
  /** The Chandler-Queen: crowned in her own melt. */
  chandler_queen: {
    parts: [
      { kind: 'robe', scale: 0.95, role: 'bone' },
      { kind: 'crown', x: 0.28, scale: 0.7, role: 'glow' },
      { kind: 'halo', scale: 0.9, alpha: 0.5, role: 'glow' },
    ],
    live: [{ kind: 'flames', scale: 0.6, role: 'glow' }],
  },
  /** The candle-shrine: a pillar of set wax under one patient flame. */
  candle_shrine: {
    parts: [
      { kind: 'disc', scale: 0.7, role: 'bone' },
      { kind: 'halo', scale: 1.1, alpha: 0.5, role: 'glow' },
    ],
    live: [
      { kind: 'flames', scale: 0.8, role: 'glow' },
      { kind: 'wisps', scale: 0.5, params: { n: 2 } },
    ],
  },
  /** The wax pool: what a courtier leaves. Do not bring fire. */
  wax_pool: {
    parts: [
      { kind: 'blob', scale: 1.0, params: { irr: 0.2, seed: 77 } },
      { kind: 'spots', role: 'glow', params: { n: 2 } },
    ],
  },
  /** The umbral footpad: your outline, out from underfoot, holding knives. */
  umbral_footpad: {
    parts: [
      { kind: 'cape', scale: 0.95, role: 'dark' },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
      { kind: 'daggers', params: { len: 0.5 } },
    ],
    live: [{ kind: 'wisps', x: -0.35, scale: 0.6, params: { n: 2 } }],
  },
  /** The umbral whisper: a rumor in a robe. */
  umbral_whisper: {
    parts: [
      { kind: 'robe', scale: 0.9, role: 'dark' },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
    ],
    live: [{ kind: 'wisps', scale: 0.7, params: { n: 3 } }],
  },
  // --- THE CRIMP GANGS (the metropolis' press — one verb per silhouette) ------
  /** The gutter shiv: a hood, a blade, and somewhere to put yours. */
  gutter_shiv: {
    parts: [
      { kind: 'cape', scale: 0.9, role: 'cloth' },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
      { kind: 'daggers', params: { len: 0.45 } },
    ],
  },
  /** The press-ganger: the pin verb wears its yoke (the mauler's tell,
   *  city-dressed) — you can read the clinch coming from the board. */
  press_ganger: {
    parts: [
      { kind: 'tatters', scale: 0.95, role: 'cloth' },
      { kind: 'hood', x: 0.25 },
      { kind: 'yoke', x: -0.15, scale: 0.9, role: 'wood' },
    ],
  },
  /** The crimp captain: the press-bell IS the rank — he rings the lanes in. */
  crimp_captain: {
    parts: [
      { kind: 'cape', scale: 1.0, role: 'cloth' },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
      { kind: 'sword', params: { len: 0.8 } },
      { kind: 'bell', x: -0.4, y: 0.35, scale: 0.55, role: 'metal' },
    ],
  },
  /** The Speaker of the House of Dusk: the gavel is implied. */
  speaker_of_dusk: {
    parts: [
      { kind: 'cape', scale: 1.1, role: 'dark' },
      { kind: 'hood', x: 0.28, params: { eyes: true } },
      { kind: 'crown', x: 0.26, scale: 0.65, role: 'dark' },
    ],
    live: [{ kind: 'wisps', x: -0.4, scale: 0.9, params: { n: 3 } }],
  },

  // ========================================================= THE HOLLOWBORN
  /** The hollow vanguard: plate with nobody home — the visor glows anyway. */
  hollow_vanguard: {
    parts: [
      { kind: 'torso', scale: 0.9, role: 'dark' },
      { kind: 'pauldrons', scale: 1.0 },
      { kind: 'sword', y: 0.06, params: { len: 0.85 } },
      { kind: 'eyes', color: '#9ad4e8', params: { spread: 0.3, dist: 0.42, size: 0.08 } },
    ],
  },
  /** Living blades: the sheath rusted away first. */
  blade_swarm: {
    parts: [
      { kind: 'daggers', params: { len: 0.6 } },
      { kind: 'sword', y: -0.05, scale: 0.8, params: { len: 0.7 } },
      { kind: 'eyes', color: '#9ad4e8', params: { n: 1, spread: 0, dist: 0.3, size: 0.09 } },
    ],
  },
  /** The shield-anima: a wall that decided to walk. */
  shield_anima: {
    parts: [
      { kind: 'carapace', scale: 0.95, params: { segs: 1 } },
      { kind: 'pauldrons', scale: 0.85 },
      { kind: 'eyes', color: '#9ad4e8', params: { spread: 0.35, dist: 0.4, size: 0.07 } },
    ],
  },
  /** The Unworn: crowned in nobody, carrying something worth the fight. */
  the_unworn: {
    parts: [
      { kind: 'cape', scale: 1.0, role: 'dark' },
      { kind: 'torso', scale: 0.95, role: 'dark' },
      { kind: 'pauldrons', scale: 1.05 },
      { kind: 'crown', x: 0.28, scale: 0.7 },
      { kind: 'sword', y: 0.06, params: { len: 0.95 } },
      { kind: 'eyes', color: '#bfe4f0', params: { spread: 0.3, dist: 0.42, size: 0.08 } },
    ],
  },

  // ============================================================ THE CHATTEL
  /** The feral aurochs: the goad is remembered. */
  feral_aurochs: {
    parts: [
      { kind: 'torso', scale: 1.0 },
      { kind: 'furRuff', scale: 1.05 },
      { kind: 'tusks', x: 0.5, scale: 1.2 },
      { kind: 'tail', params: { len: 0.6, tuft: true } },
    ],
  },
  /** The feral hen: opinions, at speed. */
  feral_hen: {
    parts: [
      { kind: 'disc', scale: 0.6 },
      { kind: 'featherWings', scale: 0.7 },
      { kind: 'beak', x: 0.45, scale: 0.7 },
      { kind: 'tailFeathers', x: -0.4, scale: 0.6 },
      { kind: 'eyes', color: '#2a2018', params: { spread: 0.4, dist: 0.5, size: 0.09 } },
    ],
  },
  /** The Bellwether: a sheep. Look closer. Now look at its eyes. */
  the_bellwether: {
    parts: [
      { kind: 'furRuff', scale: 1.15 },
      { kind: 'disc', scale: 0.8, role: 'bone' },
      { kind: 'snout', scale: 0.7 },
      { kind: 'spots', role: 'dark', params: { n: 1 } },
      { kind: 'eyes', color: '#1a1610', params: { spread: 0.42, dist: 0.5, size: 0.1 } },
    ],
  },

  // ===================================================== THE STARFALL COURT
  /** The shardling: a splinter of sky that learned to skitter. */
  starfall_shardling: {
    parts: [
      { kind: 'carapace', scale: 0.85, role: 'glow', params: { segs: 2 } },
      { kind: 'legs', params: { pairs: 2 } },
      { kind: 'eyes', color: '#e8f4ff', params: { n: 1, spread: 0, dist: 0.35, size: 0.1 } },
    ],
  },
  /** The prism: it bends what little light the night spares. */
  starfall_prism: {
    parts: [
      { kind: 'disc', scale: 0.7, role: 'glow' },
      { kind: 'halo', scale: 0.95, alpha: 0.5, role: 'glow' },
      { kind: 'mask', scale: 0.5, role: 'glow' },
    ],
    live: [{ kind: 'wisps', scale: 0.6, params: { n: 2 } }],
  },
  /** The gravity warden: the crater's keeper — weight goes wrong near it. */
  gravity_warden: {
    parts: [
      { kind: 'torso', scale: 0.95, role: 'dark' },
      { kind: 'halo', scale: 1.05, alpha: 0.45, role: 'glow' },
      { kind: 'crown', x: 0.28, scale: 0.65, role: 'glow' },
    ],
    live: [{ kind: 'wisps', x: -0.35, scale: 0.8, params: { n: 3 } }],
  },

  // ================================= THE SMOULDERKIN (reserved — doorless)
  /** The smoulderling: a coal with somewhere to be. */
  smoulderling: {
    parts: [
      { kind: 'disc', scale: 0.75, role: 'dark' },
      { kind: 'spots', role: 'glow', params: { n: 3 } },
    ],
    live: [{ kind: 'flames', scale: 0.5, role: 'glow' }],
  },
  /** The ash wretch: what didn't finish burning, still deciding. */
  ash_wretch: {
    parts: [
      { kind: 'tatters', params: { n: 4 } },
      { kind: 'blob', scale: 0.8, role: 'dark', params: { irr: 0.18, seed: 41 } },
      { kind: 'eyes', color: '#ffb45e', params: { spread: 0.35, dist: 0.45, size: 0.09 } },
    ],
    live: [{ kind: 'flames', scale: 0.45, role: 'glow' }],
  },
  /** The ember shrike: a spark on the wing. */
  ember_shrike: {
    parts: [
      { kind: 'featherWings', scale: 1.1, role: 'dark' },
      { kind: 'disc', scale: 0.45, role: 'dark' },
      { kind: 'beak', x: 0.45, scale: 0.8 },
    ],
    live: [{ kind: 'flames', scale: 0.5, role: 'glow' }],
  },
  /** The Ashmother: a whole season of burning, standing up. */
  the_ashmother: {
    parts: [
      { kind: 'torso', scale: 1.0, role: 'dark' },
      { kind: 'lavaCracks', scale: 0.95 },
      { kind: 'halo', scale: 1.0, alpha: 0.5, role: 'glow' },
      { kind: 'crown', x: 0.28, scale: 0.7, role: 'glow' },
    ],
    live: [{ kind: 'flames', scale: 0.7, role: 'glow' }],
  },

  // ================================= THE MAGPIE KIN (reserved — doorless)
  /** The magpie snatch: half bird, half pocket. */
  magpie_snatch: {
    parts: [
      { kind: 'featherWings', scale: 1.0, role: 'dark' },
      { kind: 'torso', scale: 0.7, role: 'dark' },
      { kind: 'beak', x: 0.45, scale: 0.9 },
      { kind: 'tailFeathers', x: -0.45, scale: 0.75, role: 'dark' },
      { kind: 'eyes', color: '#e8f4ff', params: { spread: 0.35, dist: 0.45, size: 0.08 } },
    ],
  },
  /** The shrikeblade: a duelist who bows first and steals second. */
  magpie_shrikeblade: {
    parts: [
      { kind: 'featherWings', scale: 0.95, role: 'dark' },
      { kind: 'torso', scale: 0.75, role: 'dark' },
      { kind: 'beak', x: 0.45, scale: 0.8 },
      { kind: 'daggers', params: { len: 0.55 } },
    ],
  },
  /** The Magpie King: everything shiny, eventually. */
  the_magpie_king: {
    parts: [
      { kind: 'featherWings', scale: 1.15, role: 'dark' },
      { kind: 'cape', scale: 0.9, role: 'dark' },
      { kind: 'beak', x: 0.48, scale: 0.95 },
      { kind: 'crown', x: 0.26, scale: 0.7, role: 'glow' },
      { kind: 'tailFeathers', x: -0.48, scale: 0.9, role: 'dark' },
    ],
  },

  // ============================================================ THE UNRUSTED
  // Brass under verdigris: every silhouette is PLATE + INSTRUMENT (pauldrons,
  // aprons, hammers, windings), and the whole legion shares one cold
  // verdigris eye-light — the family reads as a single workshop at a glance,
  // each rank by the tool it carries. The coil warden's storm-blue lens is
  // the deliberate exception: the one body that drinks the lightning wears
  // the lightning's color (the debt and its waiver, visible at range).
  /** The line rank: work-apron over plate, the estate's mace still in hand. */
  awakened_custodian: {
    parts: [
      { kind: 'torso', scale: 0.92, role: 'dark' },
      { kind: 'pauldrons', scale: 0.95 },
      { kind: 'apron', role: 'accent' },
      { kind: 'mace', params: { len: 0.9 } },
      { kind: 'eyes', color: '#7ff0d0', params: { spread: 0.3, dist: 0.44, size: 0.08 } },
    ],
  },
  /** The watch: helm and shield under one wide unblinking lens. */
  brass_sentinel: {
    parts: [
      { kind: 'torso', scale: 0.88, role: 'dark' },
      { kind: 'shield', x: 0.15, scale: 0.9 },
      { kind: 'helm' },
      { kind: 'eyes', color: '#7ff0d0', params: { n: 1, spread: 0, dist: 0.5, size: 0.12 } },
    ],
  },
  /** The mender: apron, tool-pack, rivet hammer — the smallest body in the
   *  legion and the first one to kill. */
  verdigris_wright: {
    parts: [
      { kind: 'torso', scale: 0.82, role: 'dark' },
      { kind: 'apron', role: 'accent' },
      { kind: 'pack', x: -0.35, scale: 0.75 },
      { kind: 'hammer', scale: 0.85 },
      { kind: 'eyes', color: '#7ff0d0', params: { spread: 0.3, dist: 0.46, size: 0.08 } },
    ],
  },
  /** The storm-engine: winding-rings around a lit core, humming. */
  coil_warden: {
    parts: [
      { kind: 'torso', scale: 0.85, role: 'dark' },
      { kind: 'segmentRings', scale: 1.0, params: { n: 3 } },
      { kind: 'orb', scale: 0.45, role: 'glow' },
      { kind: 'eyes', color: '#9ae8ff', params: { spread: 0.32, dist: 0.46, size: 0.07 } },
    ],
    live: [{ kind: 'wisps', scale: 0.5, color: '#9ae8ff', alpha: 0.4 }],
  },
  /** The siege-frame: girders for shoulders, chain in the joints, a
   *  driver-hammer for an arm. */
  scaffold_colossus: {
    parts: [
      { kind: 'torso', scale: 1.0, role: 'dark' },
      { kind: 'armorPlates', scale: 1.05 },
      { kind: 'chains', rot: 0.4, params: { n: 3 } },
      { kind: 'hammer', scale: 1.15 },
      { kind: 'eyes', color: '#7ff0d0', params: { spread: 0.34, dist: 0.4, size: 0.07 } },
    ],
  },
  /** THE CUSTODIAN: the whole uniform — plate, apron, chained seal, and the
   *  estate's keyring worn where a crown would sit. */
  the_custodian: {
    parts: [
      { kind: 'cape', scale: 1.0, role: 'dark' },
      { kind: 'torso', scale: 0.95, role: 'dark' },
      { kind: 'pauldrons', scale: 1.05 },
      { kind: 'apron', role: 'accent' },
      { kind: 'chains', rot: 0.5, params: { n: 2 } },
      { kind: 'crown', x: 0.28, scale: 0.65 },
      { kind: 'mace', params: { len: 1.0 } },
      { kind: 'eyes', color: '#7ff0d0', params: { spread: 0.3, dist: 0.42, size: 0.08 } },
    ],
  },

  // ======================================================= THE GILDED COMPACT
  // Payroll in the field: living professionals in cloth-and-plate (cape,
  // bandolier, working steel) — coin-warm silhouettes against the Unrusted's
  // cold verdigris, and NO glow-eyes (the wayfarer convention: human faces
  // stay dark; lit lenses are for constructs and the dead). The one lit body
  // is the company's own golem, hauling the actual vault on its back.
  /** The escort: cloak squared, kit strapped, sword honest. A uniform, not
   *  an outfit — every blade on a contract dresses the same. */
  hired_blade: {
    parts: [
      { kind: 'cape', scale: 0.9, role: 'dark' },
      { kind: 'torso', scale: 0.9 },
      { kind: 'bandolier' },
      { kind: 'sword', y: 0.05, params: { len: 0.9 } },
    ],
  },
  /** The road-warden: light, quick, half the body given to the kit — the
   *  spike-satchel and knives of someone who chooses the ground first. */
  compact_outrider: {
    parts: [
      { kind: 'torso', scale: 0.85 },
      { kind: 'bandolier' },
      { kind: 'pack', x: -0.32, scale: 0.7 },
      { kind: 'daggers', params: { len: 0.55 } },
    ],
  },
  /** The assayer: robes, the open ledger, the appraisal-stone raised — a
   *  reader, not a fighter, which is exactly the problem. */
  compact_tallykeeper: {
    parts: [
      { kind: 'robe' },
      { kind: 'book', scale: 0.9 },
      { kind: 'gem', x: 0.3, scale: 0.7, role: 'glow' },
    ],
  },
  /** The paymaster: whip in one hand, lantern in the other — the column
   *  moves at HIS pace, and the light says which wagon he is watching. */
  caravan_master: {
    parts: [
      { kind: 'cape', scale: 0.95, role: 'dark' },
      { kind: 'torso', scale: 0.95 },
      { kind: 'whip' },
      { kind: 'lantern', x: -0.2 },
    ],
  },
  /** The walking strongroom: plate over stone over chain, the strongbox
   *  strapped where a pack would ride — the vault IS the silhouette. */
  vault_golem: {
    parts: [
      { kind: 'torso', scale: 1.0, role: 'dark' },
      { kind: 'armorPlates', scale: 1.0 },
      { kind: 'chest', x: -0.35, scale: 0.85, params: { straps: 2, glow: 0.6 } },
      { kind: 'chains', rot: 0.35, params: { n: 2 } },
      { kind: 'eyes', color: '#f0d080', params: { spread: 0.32, dist: 0.42, size: 0.08 } },
    ],
  },
  /** THE FACTOR: the signature made flesh — princely cape, working sword,
   *  the signet-stone, and a crown he PAID for. */
  the_factor: {
    parts: [
      { kind: 'cape', scale: 1.0, role: 'dark' },
      { kind: 'torso', scale: 0.95 },
      { kind: 'pauldrons', scale: 0.95 },
      { kind: 'sword', y: 0.05, params: { len: 0.95 } },
      { kind: 'gem', x: -0.25, scale: 0.6, role: 'glow' },
      { kind: 'crown', x: 0.26, scale: 0.7, role: 'glow' },
    ],
  },

  // ================================================================ CHITIN
  mite: {
    parts: [
      { kind: 'carapace', scale: 0.9 },
      { kind: 'mandibles', scale: 0.8 },
      { kind: 'eyes', params: { n: 4, spread: 0.75, dist: 0.6, size: 0.07 } },
    ],
  },
  swarm_bug: {
    parts: [
      { kind: 'carapace', scale: 0.85, params: { segs: 2 } },
      { kind: 'eyes', params: { n: 2, spread: 0.5, dist: 0.62, size: 0.08 } },
    ],
  },
  spitter_bug: {
    parts: [
      { kind: 'carapace' },
      { kind: 'maw', scale: 0.5, x: 0.45, params: { arc: 0.5 } },
      { kind: 'eyes', params: { n: 3, spread: 0.7, dist: 0.66, size: 0.07 } },
    ],
  },
  // The Spitting Horror finally looks like its name: a veined lump of legs
  // around a lamprey mouth, throbbing while it ranges you.
  spitting_horror: {
    parts: [
      { kind: 'blob', params: { irr: 0.18, seed: 33 } },
      { kind: 'legs', params: { pairs: 3 } },
      { kind: 'mawRing', x: 0.4, scale: 0.62, params: { teeth: 9 } },
      { kind: 'eyes', params: { n: 3, spread: 0.6, dist: 0.5, size: 0.06 } },
    ],
    live: [{ kind: 'veinweb', alpha: 0.8, params: { n: 5 } }],
  },
  scorpion: {
    parts: [
      { kind: 'carapace', params: { segs: 4 } },
      { kind: 'mandibles' },
      { kind: 'stinger' },
      { kind: 'eyes', params: { n: 2, spread: 0.5, dist: 0.6, size: 0.07 } },
    ],
    shadowScale: 1.15,
  },
  deep_horror: {
    parts: [
      { kind: 'blob', params: { irr: 0.15, seed: 17 } },
      { kind: 'fins' },
      { kind: 'maw', scale: 0.6, x: 0.35, params: { arc: 0.6 } },
      { kind: 'eyes', params: { n: 4, spread: 0.9, dist: 0.7, size: 0.08 } },
    ],
  },
  angler: {
    parts: [
      { kind: 'blob', params: { irr: 0.13, seed: 23 } },
      { kind: 'fins' },
      { kind: 'maw', scale: 0.75, params: { arc: 0.7 } },
      { kind: 'eyes', color: '#bfffe8', params: { n: 1, dist: 1.15, size: 0.14 } },
    ],
    // The LURE: the deep's oldest lie, bobbing ahead of the teeth.
    live: [{ kind: 'lure', color: '#bfffe8', params: { len: 1.2 } }],
  },

  // ================================================================ FUNGAL
  sporeling: {
    parts: [
      { kind: 'disc', scale: 0.8 },
      { kind: 'caps', scale: 0.8, params: { n: 2 } },
      { kind: 'eyes', params: { spread: 0.5, dist: 0.55, size: 0.08 } },
    ],
  },
  puffball: {
    parts: [
      { kind: 'disc', scale: 0.9 },
      { kind: 'caps', scale: 1.1, params: { n: 1 } },
    ],
  },
  fungal_beast: {
    parts: [
      { kind: 'blob', params: { irr: 0.14, seed: 8 } },
      { kind: 'caps', x: -0.2, scale: 0.9, params: { n: 3 } },
      { kind: 'claws', params: { len: 0.4 } },
    ],
  },
  // The spitter earns its own portrait: a mossy hunched thing, blowholes
  // puffing, a pale toothless maw stretched forward to spit.
  spore_spitter: {
    parts: [
      { kind: 'blob', params: { irr: 0.16, seed: 12 } },
      { kind: 'mossPatch', scale: 0.95, params: { n: 3 } },
      { kind: 'caps', x: -0.28, scale: 0.75, params: { n: 2 } },
      { kind: 'maw', x: 0.42, scale: 0.62, params: { arc: 0.6 } },
      { kind: 'eyes', params: { spread: 0.5, dist: 0.62, size: 0.08 } },
    ],
    live: [{ kind: 'sporeVents', params: { n: 2 } }],
  },
  // The brute: a walking log of moss and shelf-caps, claws first.
  mycelial_brute: {
    parts: [
      { kind: 'blob', scale: 1.02, params: { irr: 0.12, seed: 21 } },
      // Hyphal root tendrils dragging where it tore free of the mat.
      { kind: 'roots', role: 'accent', params: { n: 4 } },
      { kind: 'mossPatch', params: { n: 4 } },
      { kind: 'caps', x: -0.3, params: { n: 3 } },
      { kind: 'claws', params: { len: 0.5 } },
      { kind: 'eyes', params: { spread: 0.4, dist: 0.64, size: 0.08 } },
    ],
    live: [{ kind: 'sporeVents', x: -0.15, params: { n: 2 } }],
  },
  fungal_tender: {
    parts: [
      { kind: 'robe' },
      { kind: 'caps', x: 0.25, scale: 0.7, params: { n: 2 } },
      { kind: 'fronds', params: { n: 4 } },
    ],
  },
  heartbloom: {
    parts: [
      { kind: 'disc' },
      { kind: 'caps', scale: 1.2, params: { n: 3 } },
      { kind: 'fronds', params: { n: 6 } },
      { kind: 'halo', scale: 1.1, alpha: 0.5 },
    ],
  },
  sylvan: {
    parts: [
      { kind: 'disc', scale: 0.9 },
      { kind: 'fronds', params: { n: 5 } },
      { kind: 'eyes', params: { spread: 0.45, dist: 0.55, size: 0.09 } },
    ],
  },

  // ============================================================= TOWNSFOLK
  npc_smith: {
    parts: [
      { kind: 'torso' },
      { kind: 'apron' },
      { kind: 'mace' },
    ],
  },
  npc_keeper: {
    parts: [
      { kind: 'torso' },
      { kind: 'apron', role: 'accent' },
    ],
  },
  npc_scholar: {
    parts: [
      { kind: 'robe' },
      { kind: 'staff', params: { orb: 'glow' } },
    ],
  },
  npc_trader: {
    parts: [
      { kind: 'torso' },
      { kind: 'pack' },
    ],
  },
  npc_delver: {
    parts: [
      { kind: 'torso' },
      { kind: 'pack' },
      { kind: 'lantern' },
      { kind: 'helm' },
    ],
  },
  npc_captain: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons' },
      { kind: 'sword' },
      { kind: 'helm' },
    ],
  },

  // ========================================================= PLAYER CLASSES
  class_warrior: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons' },
      { kind: 'sword' },
      { kind: 'shield' },
    ],
  },
  class_magician: {
    parts: [
      { kind: 'robe' },
      { kind: 'staff', params: { orb: 'glow' } },
      { kind: 'runes', params: { n: 3 } },
    ],
  },
  class_rogue: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.32, scale: 0.9 },
      { kind: 'daggers', params: { len: 0.5 } },
      { kind: 'tatters', scale: 0.6, params: { n: 3 } },
    ],
  },
  class_cleric: {
    parts: [
      { kind: 'robe' },
      { kind: 'mace' },
      { kind: 'halo', scale: 0.9, alpha: 0.7 },
    ],
  },
  class_summoner: {
    parts: [
      { kind: 'robe' },
      { kind: 'staff', params: { skullTip: true } },
      { kind: 'runes', params: { n: 3 } },
    ],
  },
  class_sorcerer: {
    parts: [
      { kind: 'robe' },
      { kind: 'staff', params: { orb: 'glow' } },
      { kind: 'runes', params: { n: 5 } },
      { kind: 'halo', scale: 1.0, alpha: 0.4 },
    ],
  },
  class_necromancer: {
    parts: [
      { kind: 'robe' },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
      { kind: 'staff', params: { skullTip: true } },
    ],
  },
  class_berserker: {
    parts: [
      { kind: 'torso' },
      { kind: 'axe', mirror: true },
      { kind: 'spikes', scale: 0.55, params: { n: 4 } },
    ],
  },
  class_swashbuckler: {
    parts: [
      { kind: 'torso' },
      { kind: 'sword', params: { len: 1.1, w: 0.07 } },
      { kind: 'pauldrons', scale: 0.8, role: 'cloth' },
    ],
  },
  class_ranger: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.32, scale: 0.85, role: 'accent' },
      { kind: 'bow' },
    ],
  },
  class_guardian: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons' },
      { kind: 'shield', params: { kite: true } },
      { kind: 'mace' },
      { kind: 'helm' },
    ],
  },
  class_juggernaut: {
    parts: [
      { kind: 'torso', scale: 1.04 },
      { kind: 'pauldrons', scale: 1.15 },
      { kind: 'shield' },
      { kind: 'helm' },
      { kind: 'spikes', scale: 0.5, params: { n: 4 } },
    ],
  },
  class_pyromancer: {
    parts: [
      { kind: 'robe' },
      { kind: 'staff', params: { orb: '#ff8a3a' } },
      { kind: 'runes', color: '#ff9a4a', params: { n: 3 } },
    ],
    live: [{ kind: 'flames', x: 0.85, y: 0.66, scale: 0.38, params: { n: 2 } }],
  },
  class_assassin: {
    parts: [
      { kind: 'torso' },
      { kind: 'tatters', scale: 0.65, params: { n: 3 } },
      { kind: 'hood', x: 0.32, scale: 0.9, params: { eyes: true } },
      { kind: 'daggers', params: { len: 0.55 } },
    ],
  },

  // --- The parity twelve (+ the Tamer's own face at last) -------------------
  class_tamer: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.3, scale: 0.85, role: 'cloth' },
      { kind: 'whip' },
      { kind: 'mane', scale: 0.6, role: 'accent' },
    ],
  },
  class_breaker: {
    parts: [
      { kind: 'torso', scale: 1.03 },
      { kind: 'armorPlates' },
      { kind: 'hammer', scale: 1.1 },
    ],
  },
  class_vanguard: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons' },
      { kind: 'shield', params: { kite: true } },
      { kind: 'plume' },
    ],
  },
  class_blademaster: {
    parts: [
      { kind: 'torso' },
      { kind: 'cape', role: 'cloth' },
      { kind: 'sword', params: { len: 1.25, w: 0.06 } },
    ],
  },
  class_brawler: {
    parts: [
      { kind: 'torso', scale: 1.02 },
      { kind: 'mane', scale: 0.7 },
      { kind: 'chains' },
    ],
  },
  class_sentinel: {
    parts: [
      { kind: 'torso' },
      { kind: 'shield', scale: 1.1 },
      { kind: 'helm' },
      { kind: 'spikes', scale: 0.55, params: { n: 5 } },
    ],
  },
  class_lancer: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons', scale: 0.9 },
      { kind: 'trident' },
      { kind: 'quiver', role: 'wood' },
    ],
  },
  class_trapper: {
    parts: [
      { kind: 'torso' },
      { kind: 'apron', role: 'cloth' },
      { kind: 'bow' },
      { kind: 'net' },
    ],
  },
  class_warlord: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons', scale: 1.05 },
      { kind: 'banner' },
      { kind: 'sword' },
    ],
  },
  class_skald: {
    parts: [
      { kind: 'robe' },
      { kind: 'cape', role: 'accent' },
      { kind: 'runes', color: '#d8a8e0', params: { n: 4 } },
    ],
    live: [{ kind: 'wisps', scale: 0.5, params: { n: 2 } }],
  },
  class_beguiler: {
    parts: [
      { kind: 'torso' },
      { kind: 'cape', role: 'cloth' },
      { kind: 'mask' },
      { kind: 'daggers', params: { len: 0.45 } },
    ],
  },
  class_chronomancer: {
    parts: [
      { kind: 'robe' },
      { kind: 'staff', params: { orb: 'glow' } },
      { kind: 'halo', scale: 1.1, alpha: 0.45 },
      { kind: 'runes', color: '#8ae0e0', params: { n: 3 } },
    ],
  },
  class_ascetic: {
    parts: [
      { kind: 'robe', role: 'cloth' },
      { kind: 'staff' },
      { kind: 'halo', scale: 0.7, alpha: 0.4 },
    ],
  },
  // The shepherd of the swarm wears the swarm's own alphabet: feelers up,
  // powder-lobed wings folded, a staff whose tip glows like a brood-lamp.
  class_hivecaller: {
    parts: [
      { kind: 'robe' },
      { kind: 'mothWings', scale: 0.9, alpha: 0.85 },
      { kind: 'antennae', scale: 0.85 },
      { kind: 'staff', params: { orb: 'glow' } },
    ],
  },
  // --- The parity eight (class pass round two) -------------------------------
  class_wallwright: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons', scale: 1.0 },
      { kind: 'hammer' },
    ],
  },
  class_matador: {
    parts: [
      { kind: 'torso' },
      { kind: 'cape' },
      { kind: 'sword', params: { len: 1.15, w: 0.05 } },
    ],
  },
  class_flagellant: {
    parts: [
      { kind: 'robe', role: 'cloth' },
      { kind: 'hood', x: 0.3 },
      { kind: 'spikes', scale: 0.5, params: { n: 3 } },
    ],
  },
  class_falconer: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.28, scale: 0.8 },
      { kind: 'pauldrons', scale: 0.7, role: 'cloth' },
    ],
  },
  class_sharper: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.3, scale: 0.85 },
      { kind: 'knife', mirror: true },
    ],
  },
  class_firebrand: {
    parts: [
      { kind: 'robe', role: 'cloth' },
      { kind: 'halo', scale: 0.8, alpha: 0.3 },
      { kind: 'runes', color: '#e07040', params: { n: 2 } },
    ],
  },
  class_runeweaver: {
    parts: [
      { kind: 'robe' },
      { kind: 'runes', params: { n: 6 } },
      { kind: 'staff', params: { orb: 'glow' } },
    ],
  },
  class_resonator: {
    parts: [
      { kind: 'robe' },
      { kind: 'halo', scale: 1.05, alpha: 0.35 },
      { kind: 'staff' },
    ],
  },

  // --- The parity-pass adversaries (monsters.ts wears these) ----------------
  bandit_trapsmith: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.32, scale: 0.85 },
      { kind: 'net' },
      { kind: 'quiver', scale: 0.8 },
    ],
  },
  pit_champion: {
    parts: [
      { kind: 'torso', scale: 1.05 },
      { kind: 'mane', scale: 0.7 },
      { kind: 'chains' },
    ],
  },
  warband_skald: {
    parts: [
      { kind: 'torso' },
      { kind: 'cape', role: 'accent' },
      { kind: 'runes', color: '#d8a8e0', params: { n: 3 } },
    ],
  },
  camp_bannerman: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons' },
      { kind: 'banner' },
      { kind: 'helm' },
    ],
  },
  barrow_swordsaint: {
    parts: [
      { kind: 'ribs', params: { under: true } },
      { kind: 'cape', role: 'dark' },
      { kind: 'sword', params: { len: 1.2, w: 0.06 } },
      { kind: 'skull', x: 0.5 },
    ],
  },
  abyssal_horologist: {
    parts: [
      { kind: 'robe' },
      { kind: 'halo', scale: 1.05, alpha: 0.5 },
      { kind: 'runes', color: '#8ae0e0', params: { n: 3 } },
    ],
  },
  rift_ascetic: {
    parts: [
      { kind: 'robe', role: 'cloth' },
      { kind: 'staff' },
      { kind: 'halo', scale: 0.7, alpha: 0.45 },
    ],
  },

  // ============================================== ROUND-2 EXPANSION LOOKS
  /** A pit brute: tusked lump of muscle, all forward menace. */
  brute: {
    parts: [
      { kind: 'blob', params: { irr: 0.12, seed: 14 } },
      { kind: 'tusks', x: 0.3, scale: 1.15 },
      { kind: 'claws', params: { len: 0.4 } },
      { kind: 'eyes', params: { spread: 0.35, dist: 0.6, size: 0.08 } },
    ],
  },
  /** A cultist alight — robes that burn and never char. */
  zealot_burning: {
    parts: [
      { kind: 'robe' },
      { kind: 'hood', x: 0.3, params: { eyes: true, eyeColor: '#ffd24a' } },
    ],
    live: [{ kind: 'flames', params: { n: 3 } }],
  },
  /** Plague bearers: swollen flesh crowded with pustules. */
  plague_bearer: {
    parts: [
      { kind: 'blob', params: { irr: 0.16, seed: 27 } },
      { kind: 'bloatSacs', params: { n: 6 } },
      { kind: 'eyes', color: '#c8e07a', params: { spread: 0.45, dist: 0.6, size: 0.08 } },
    ],
    // It leaves a trail you could follow. You shouldn't.
    live: [{ kind: 'slimeTrail', params: { n: 4 } }],
  },
  bloat: {
    parts: [
      { kind: 'blob', scale: 1.05, params: { irr: 0.1, seed: 33 } },
      // Somebody sewed this shut once. It didn't take.
      { kind: 'stitchSeams', params: { n: 3 } },
      { kind: 'bloatSacs', scale: 1.1, params: { n: 8 } },
    ],
  },
  /** The magma worm's head — a molten maw splitting crusted rock. */
  magma_worm_head: {
    parts: [
      { kind: 'serpentHead' },
      { kind: 'maw', scale: 0.85, params: { arc: 0.75 } },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.8, dist: 0.55, size: 0.09 } },
    ],
    live: [{ kind: 'flames', x: -0.2, scale: 0.5, params: { n: 2 } }],
  },
  /** The apex beast (the Hunt's crown): barbed, clawed, all predator. */
  apex_beast: {
    parts: [
      { kind: 'disc', scale: 1.0 },
      { kind: 'snout', scale: 1.05 },
      { kind: 'barbs', params: { n: 6 } },
      { kind: 'claws', params: { len: 0.5, talons: 4 } },
      { kind: 'tail', params: { len: 1.0, tuft: true } },
    ],
    shadowScale: 1.1,
  },
  /** Bone altar: a dark slab crowned with a watching skull. */
  bone_altar: {
    parts: [
      { kind: 'disc', role: 'dark' },
      { kind: 'runes', role: 'bone', params: { n: 5 } },
      { kind: 'skull', x: 0, scale: 1.05, params: { jaw: false } },
    ],
  },
  /** Rift hearts (ember/rime/flame cores): a raw element held in a ring. */
  elemental_rift: {
    parts: [
      { kind: 'orb' },
      { kind: 'runes', params: { n: 4 } },
      { kind: 'halo', scale: 1.05, alpha: 0.6 },
    ],
  },
  gnoll_archer: {
    parts: [
      { kind: 'disc', scale: 0.95 },
      { kind: 'snout' },
      { kind: 'bow' },
      { kind: 'tail', params: { len: 0.7, tuft: true } },
    ],
  },
  gnoll_howler: {
    parts: [
      { kind: 'disc', scale: 0.95 },
      { kind: 'snout' },
      { kind: 'halo', scale: 0.95, alpha: 0.4 },
      { kind: 'tail', params: { len: 0.7, tuft: true } },
    ],
  },
  hare: {
    parts: [
      { kind: 'disc', scale: 0.8 },
      { kind: 'ears', scale: 1.2 },
      { kind: 'eyes', params: { spread: 0.5, dist: 0.55, size: 0.09 } },
      { kind: 'tail', scale: 0.6, params: { len: 0.4, tuft: true } },
    ],
  },
  /** Chitin skitterers: low carapace, feelers, too many legs. */
  skitterer: {
    parts: [
      { kind: 'legs', params: { pairs: 3 } },
      { kind: 'carapace', scale: 0.9, params: { segs: 3 } },
      { kind: 'antennae' },
      { kind: 'eyes', params: { n: 4, spread: 0.7, dist: 0.6, size: 0.06 } },
    ],
  },
  barbed_stalker: {
    parts: [
      { kind: 'disc', scale: 0.95 },
      { kind: 'snout' },
      { kind: 'barbs', params: { n: 5 } },
      { kind: 'claws', params: { len: 0.45 } },
      { kind: 'tail', params: { len: 0.85 } },
    ],
  },
  /** Carrion bird: swept wings, hooked beak, fanned tail feathers. */
  vulture: {
    parts: [
      { kind: 'fronds', role: 'base', scale: 0.7, params: { n: 3 } },
      { kind: 'disc', scale: 0.85 },
      { kind: 'wings', scale: 0.9 },
      { kind: 'snout', scale: 0.75, params: { ears: false } },
      { kind: 'eyes', params: { spread: 0.5, dist: 0.5, size: 0.08 } },
    ],
  },
  /** Heavy void knight: plate over plate, glowing visor slit. */
  dread_knight: {
    parts: [
      { kind: 'torso' },
      { kind: 'armorPlates' },
      { kind: 'pauldrons', scale: 1.05 },
      { kind: 'sword', params: { len: 1.15, w: 0.13 } },
      { kind: 'helm' },
      { kind: 'eyes', params: { n: 2, spread: 0.25, dist: 0.55, size: 0.07 } },
    ],
  },
  /** Finger mage / ritualists: a tome, orbiting script, unsettling calm. */
  ritual_mage: {
    parts: [
      { kind: 'robe' },
      { kind: 'book' },
      { kind: 'runes', params: { n: 5 } },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
    ],
  },
  /** Siege hulk: armored mass swinging a maul, core burning in its chest. */
  siege_hulk: {
    parts: [
      { kind: 'torso', scale: 1.05 },
      { kind: 'armorPlates', params: { n: 4 } },
      { kind: 'pauldrons', scale: 1.2 },
      { kind: 'hammer' },
      { kind: 'gem', x: -0.1 },
    ],
    shadowScale: 1.1,
  },
  glacial_horror: {
    parts: [
      { kind: 'blob', params: { irr: 0.14, seed: 51 } },
      { kind: 'fins' },
      { kind: 'spikes', role: 'accent', scale: 0.8, params: { n: 5 } },
      { kind: 'eyes', color: '#bfe8ff', params: { n: 3, spread: 0.7, dist: 0.62, size: 0.08 } },
    ],
  },
  /** Spiders — legs first, then everything else. */
  spider_small: {
    parts: [
      { kind: 'legs', params: { pairs: 4 } },
      { kind: 'carapace', scale: 0.75, params: { segs: 2 } },
      { kind: 'eyes', params: { n: 4, spread: 0.6, dist: 0.55, size: 0.06 } },
    ],
  },
  spider_big: {
    parts: [
      { kind: 'legs', scale: 1.1, params: { pairs: 4 } },
      { kind: 'bloatSacs', x: -0.55, scale: 0.7, role: 'bone', params: { n: 4 } },
      { kind: 'carapace', params: { segs: 3 } },
      { kind: 'mandibles', scale: 0.85 },
      { kind: 'eyes', params: { n: 6, spread: 0.9, dist: 0.6, size: 0.055 } },
    ],
    shadowScale: 1.15,
  },
  spider_nest: {
    parts: [
      { kind: 'blob', params: { irr: 0.12, seed: 61 } },
      { kind: 'bloatSacs', scale: 1.05, role: 'bone', params: { n: 7 } },
    ],
  },
  lash_maiden: {
    parts: [
      { kind: 'torso' },
      { kind: 'tatters', scale: 0.6, params: { n: 3 } },
      { kind: 'whip' },
      { kind: 'chains', alpha: 0.8 },
    ],
  },
  hunter: {
    parts: [
      { kind: 'torso' },
      { kind: 'hood', x: 0.32, scale: 0.85 },
      { kind: 'bow' },
      { kind: 'pack', scale: 0.7 },
    ],
  },
  pilgrim: {
    parts: [
      { kind: 'robe' },
      { kind: 'staff', params: { orb: '#d8cfa0' } },
      { kind: 'pack', scale: 0.8 },
    ],
  },
  gale_elemental: {
    parts: [
      { kind: 'disc', scale: 0.7 },
      { kind: 'halo', scale: 1.0, alpha: 0.55 },
      { kind: 'eyes', params: { spread: 0.4, dist: 0.4, size: 0.09 } },
    ],
    live: [{ kind: 'wisps', params: { n: 4 } }],
  },
  frost_elemental: {
    parts: [
      { kind: 'disc', scale: 0.85 },
      { kind: 'spikes', role: 'accent', params: { n: 6 } },
      { kind: 'eyes', color: '#dff4ff', params: { spread: 0.42, dist: 0.5, size: 0.09 } },
    ],
  },
  /** Stone sentinel: plated guardian with a burning core. */
  sentinel: {
    parts: [
      { kind: 'disc' },
      { kind: 'armorPlates' },
      { kind: 'gem' },
      { kind: 'eyes', params: { spread: 0.35, dist: 0.6, size: 0.08 } },
    ],
  },
  menhir: {
    parts: [
      { kind: 'disc', role: 'dark', scale: 0.95 },
      { kind: 'runes', role: 'bone', params: { n: 5 } },
      { kind: 'gem', alpha: 0.85 },
    ],
  },
  sylvan_warden: {
    parts: [
      { kind: 'disc', scale: 0.95 },
      { kind: 'fronds', params: { n: 5 } },
      { kind: 'staff', params: { orb: '#9fe07a' } },
      { kind: 'eyes', params: { spread: 0.45, dist: 0.55, size: 0.08 } },
    ],
  },
  thorn_sprite: {
    parts: [
      { kind: 'disc', scale: 0.7 },
      { kind: 'halo', scale: 0.8, alpha: 0.5 },
      { kind: 'barbs', scale: 0.75, params: { n: 5 } },
      { kind: 'eyes', params: { spread: 0.45, dist: 0.45, size: 0.09 } },
    ],
  },
  grove_singer: {
    parts: [
      { kind: 'robe' },
      { kind: 'fronds', scale: 0.8, params: { n: 4 } },
      { kind: 'halo', scale: 0.9, alpha: 0.5 },
    ],
  },
  briar_beast: {
    parts: [
      { kind: 'blob', params: { irr: 0.15, seed: 19 } },
      { kind: 'barbs', params: { n: 6 } },
      { kind: 'claws', params: { len: 0.5 } },
      { kind: 'eyes', params: { spread: 0.5, dist: 0.58, size: 0.08 } },
    ],
  },
  /** The mimic: a crate until it isn't. */
  mimic: {
    parts: [
      { kind: 'crateBox' },
      { kind: 'maw', scale: 0.55, x: 0.25, params: { arc: 0.55 } },
      { kind: 'eyes', params: { n: 2, spread: 0.4, dist: 0.5, size: 0.06 } },
    ],
  },
  keg: { parts: [{ kind: 'keg' }], banding: 'hoops' },
  crate: { parts: [{ kind: 'crateBox' }], banding: 'cross' },
  training_dummy: {
    parts: [
      { kind: 'torso', role: 'wood' },
      { kind: 'apron', role: 'cloth', alpha: 0.85 },
    ],
  },
  // An UNOPENED chest, gold-bound, its seam leaking the light of whatever
  // waits inside — the event-box lineage (strongboxes to come) starts here.
  gem_cache: {
    parts: [
      { kind: 'chest', scale: 1.05, params: { straps: 2, glow: 0.7 } },
    ],
  },
  cart: {
    parts: [
      { kind: 'crateBox', scale: 1.05 },
      { kind: 'keg', x: -0.45, y: 0.35, scale: 0.42 },
      { kind: 'keg', x: -0.45, y: -0.35, scale: 0.42 },
      { kind: 'pack', x: 0.4, scale: 0.7 },
    ],
    shadowScale: 1.15,
  },
  /** THE UNMADE — the chronophage: a cowled void around a devoured hour. */
  chronophage: {
    parts: [
      { kind: 'tatters', scale: 1.1, params: { n: 6 } },
      { kind: 'robe', scale: 1.05 },
      { kind: 'orb', x: -0.35, scale: 0.75 },
      { kind: 'hood', x: 0.3, scale: 1.1, params: { eyes: true } },
      { kind: 'runes', scale: 1.1, params: { n: 6 } },
    ],
    live: [{ kind: 'wisps', x: -0.5, params: { n: 4 } }],
  },
  /** Vhal'Serrat — the eldritch tyrant wears its own arms. */
  eldritch_tyrant: {
    parts: [
      { kind: 'tentacleRing', params: { n: 7, len: 1.6 } },
      { kind: 'blob', params: { irr: 0.13, seed: 77 } },
      { kind: 'maw', scale: 0.7, params: { arc: 0.65 } },
      { kind: 'eyes', params: { n: 5, spread: 1.1, dist: 0.72, size: 0.07 } },
    ],
    shadowScale: 1.15,
  },

  // ================================================== COMPOSITE-BOSS PARTS
  /** The leviathan's bulk: plated shell over fins — the root hitbox. */
  leviathan_body: {
    parts: [
      { kind: 'fins', scale: 0.9 },
      { kind: 'shell' },
      { kind: 'carapace', scale: 0.55, x: -0.3, alpha: 0.65, params: { segs: 3 } },
    ],
    shadowScale: 1.25,
  },
  /** The head part: all maw and lure — the weakspot that spits. */
  leviathan_head: {
    parts: [
      { kind: 'serpentHead' },
      { kind: 'maw', scale: 0.8, params: { arc: 0.7 } },
      { kind: 'eyes', color: '#bfffe0', params: { n: 2, spread: 0.85, dist: 0.62, size: 0.11 } },
    ],
  },
  /** A claw part: armored pad with reaching talons. */
  leviathan_claw: {
    parts: [
      { kind: 'carapace', scale: 0.8, params: { segs: 2 } },
      { kind: 'claws', scale: 1.1, params: { len: 0.6, talons: 3 } },
    ],
  },
  /** The tail part: finned tip that sweeps. */
  leviathan_tail: {
    parts: [
      { kind: 'carapace', scale: 0.75, params: { segs: 3 } },
      { kind: 'tail', params: { len: 1.1 } },
      { kind: 'fins', scale: 0.6, alpha: 0.8 },
    ],
  },

  // ================================================================ WINTER
  /** The tundra behemoth: ruffed, rime-hung, breath steaming in the cold. */
  behemoth_tundra: {
    parts: [
      { kind: 'disc', scale: 1.02 },
      { kind: 'furRuff' },
      { kind: 'snout', scale: 1.05 },
      { kind: 'horns', scale: 1.1 },
      { kind: 'icicles', params: { n: 5 } },
      { kind: 'tail', params: { len: 0.7 } },
    ],
    live: [{ kind: 'breathPuff' }],
    shadowScale: 1.1,
  },
  /** The ice golem: runed frost-stone hung with icicles. */
  golem_ice: {
    parts: [
      { kind: 'disc' },
      { kind: 'claws', params: { len: 0.3, talons: 3 } },
      { kind: 'icicles', params: { n: 6 } },
      { kind: 'runes', color: '#bfe8ff', params: { n: 3 } },
      { kind: 'eyes', color: '#dff4ff', params: { spread: 0.35, dist: 0.55, size: 0.1 } },
    ],
    live: [{ kind: 'breathPuff', scale: 0.8, color: '#dff4ff' }],
  },

  // --- THE RIMEBOUND (the Winter Court) — six silhouettes, one glance each:
  // glittering courser / frozen dead / antlered iceworker / bannered knight /
  // tusked hammer-wall / the crown. Icicles are the family signature part
  // (the court GLITTERS); breath pluming marks its living tiers.
  /** A rime hound: lean courser under an icicle-hung ruff — a wolf that
   *  glitters is the court's. */
  rime_hound: {
    parts: [
      { kind: 'torso', scale: 0.88 },
      { kind: 'furRuff', scale: 1.0, role: 'bone' },
      { kind: 'icicles', scale: 0.8, params: { n: 4 } },
      { kind: 'snout', scale: 1.0 },
      { kind: 'fangs', scale: 0.75 },
      { kind: 'tail', params: { len: 0.75, tuft: true } },
    ],
    live: [{ kind: 'breathPuff', scale: 0.7 }],
  },
  /** A hoarfrost wight: the frozen dead — bared ribs under rime-hung rags,
   *  reaching claws, the skull forward. NO breath: nothing in it is warm. */
  hoarfrost_wight: {
    parts: [
      { kind: 'tatters', scale: 0.9, params: { n: 4 } },
      { kind: 'ribs', params: { under: true } },
      { kind: 'icicles', params: { n: 5 } },
      { kind: 'claws', params: { len: 0.55, talons: 3 } },
      { kind: 'skull', x: 0.45, scale: 0.9 },
    ],
  },
  /** The glacier shaman: antler-crowned iceworker — robe, an ice-orb staff,
   *  cold runes, breath pluming in the endless winter. */
  glacier_shaman: {
    parts: [
      { kind: 'robe' },
      { kind: 'staff', params: { orb: '#bfe8ff' } },
      { kind: 'runes', color: '#9fd8ff', params: { n: 3 } },
      { kind: 'hood', x: 0.28, scale: 0.9, params: { eyes: true, eyeColor: '#dff4ff' } },
      { kind: 'antlers', scale: 1.1, role: 'bone' },
    ],
    live: [{ kind: 'breathPuff', scale: 0.8, color: '#dff4ff' }],
  },
  /** The rime skater: the Court's lake-dancer — a TALL THIN glide of a body,
   *  short frost-tatters, a swept glow crest, twin long shin-blades worn low.
   *  The silhouette IS the tell (upright + gliding = it lunges); nothing else
   *  on the lake is this narrow. Zero new painters. */
  rime_skater: {
    parts: [
      { kind: 'torso', scale: 0.88 },
      { kind: 'tatters', scale: 0.7, alpha: 0.85 },
      { kind: 'crest', scale: 1.2, role: 'glow' },
      { kind: 'icicles', scale: 0.7, params: { n: 3 } },
      { kind: 'daggers', params: { len: 0.85 } },
      { kind: 'eyes', role: 'glow', params: { n: 2 } },
    ],
    live: [{ kind: 'breathPuff', scale: 0.6, color: '#dff4ff' }],
  },
  /** The rime wrecker: the Court's battering ram — LOW and WIDE where the
   *  skater is tall and thin: a pack-ice carapace slab, ram horns forward,
   *  a frozen hump, spikes riding the shell. Reads "do not stand in front"
   *  at a glance. Zero new painters. */
  rime_wrecker: {
    parts: [
      { kind: 'carapace', scale: 1.06 },
      { kind: 'hump', x: -0.18, scale: 0.95 },
      { kind: 'ramHorns', x: 0.42, scale: 1.25, role: 'bone' },
      { kind: 'icicles', scale: 0.9, params: { n: 4 } },
      { kind: 'eyes', role: 'glow', params: { n: 2 } },
    ],
    live: [{ kind: 'breathPuff', scale: 0.9 }],
    shadowScale: 1.05,
  },
  /** The winter herald: the court's bannered knight — helm, pauldrons, the
   *  standard of the coming winter over one shoulder. */
  winter_herald: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons', role: 'metal' },
      { kind: 'banner', x: -0.3, scale: 1.1 },
      { kind: 'sword', params: { len: 0.8 } },
      { kind: 'helm', x: 0.3, scale: 0.9 },
      { kind: 'icicles', scale: 0.7, params: { n: 3 } },
    ],
    live: [{ kind: 'breathPuff', scale: 0.7 }],
  },
  /** The frost giant: a wall of blue ice — plate-slabbed, tusked, a great
   *  hammer, glacier breath. Nothing else in the belt is this WIDE. */
  frost_giant: {
    parts: [
      { kind: 'torso', scale: 1.05 },
      { kind: 'armorPlates', scale: 0.95 },
      { kind: 'pauldrons', scale: 1.1, role: 'bone' },
      { kind: 'hammer', scale: 1.15 },
      { kind: 'tusks', x: 0.45, scale: 1.0 },
      { kind: 'icicles', params: { n: 6 } },
    ],
    live: [{ kind: 'breathPuff', scale: 1.1 }],
    shadowScale: 1.1,
  },
  /** THE WINTER KING: crown over cold — caped, ice-plated, the greatblade
   *  carried like a verdict, runes of the deep winter in orbit. */
  winter_king: {
    parts: [
      { kind: 'cape', scale: 1.1 },
      { kind: 'torso', scale: 0.95 },
      { kind: 'armorPlates', scale: 0.85 },
      { kind: 'pauldrons', role: 'bone' },
      { kind: 'sword', params: { len: 1.15 } },
      { kind: 'icicles', params: { n: 5 } },
      { kind: 'crown', x: 0.3, scale: 0.85 },
      { kind: 'runes', color: '#bfe8ff', scale: 1.05, params: { n: 4 } },
    ],
    live: [{ kind: 'breathPuff', scale: 0.9, color: '#dff4ff' }],
    shadowScale: 1.05,
  },

  // ================================================== THE SAND SARCOPHATE
  // The tomb-dynasty under the deep desert. Family grammar, readable at a
  // glance: LINEN (shroudWrap) marks every wrapped body, GOLD (mask/gilt)
  // marks rank — and gold is exactly what the risen husk has LOST. Jars mark
  // the embalmers; the lid-on-the-back marks the walking tomb.
  /** The gilded beetle: a scarab whose shell was leafed by the embalmers. */
  tomb_scarab: {
    parts: [
      { kind: 'carapace', scale: 0.95 },
      { kind: 'segmentRings', scale: 0.8, params: { n: 3 } },
      { kind: 'legs', scale: 0.7, params: { n: 6 } },
      { kind: 'mandibles', scale: 0.8 },
      { kind: 'spots', role: 'metal', scale: 0.7, params: { n: 3 } },
      { kind: 'eyes', color: '#ffd890', params: { spread: 0.4, dist: 0.6, size: 0.1 } },
    ],
  },
  /** The line of the old legion: wrapped body, gold face, lid-shield. */
  sarcophate_legionary: {
    parts: [
      { kind: 'torso', scale: 0.92 },
      { kind: 'shroudWrap', scale: 1.0, params: { bands: 4 } },
      { kind: 'pauldrons', role: 'metal', scale: 0.85 },
      { kind: 'sarcophagusLid', y: -0.62, rot: 0.2, scale: 0.5, role: 'bone', params: { face: 0 } },
      { kind: 'sword', params: { len: 0.95 } },
      { kind: 'mask', x: 0.42, scale: 0.8, role: 'metal' },
    ],
    shadowScale: 0.95,
  },
  /** The embalmer-priest: robed, jarred, the censer still swinging. */
  canopic_bearer: {
    parts: [
      { kind: 'robe', scale: 1.0 },
      { kind: 'shroudWrap', scale: 0.85, alpha: 0.8, params: { bands: 3 } },
      { kind: 'canopicJar', x: -0.35, y: 0.55, scale: 0.55, mirror: true },
      { kind: 'canopicJar', x: -0.6, scale: 0.5, params: { stopper: 4 } },
      { kind: 'censer', scale: 0.9 },
      { kind: 'staff', scale: 0.95 },
      { kind: 'mask', x: 0.42, scale: 0.78, role: 'metal' },
    ],
    live: [{ kind: 'wisps', scale: 0.6, color: '#d8c070', alpha: 0.5 }],
  },
  /** The walking tomb: the case worn as armor, the hammer that seals doors. */
  sarcophagus_warden: {
    parts: [
      { kind: 'sarcophagusLid', x: -0.15, scale: 1.25, params: { face: 1 } },
      { kind: 'torso', x: 0.25, scale: 0.7 },
      { kind: 'shroudWrap', x: 0.25, scale: 0.8, params: { bands: 3 } },
      { kind: 'pauldrons', role: 'metal', x: 0.2, scale: 0.8 },
      { kind: 'hammer', scale: 1.05 },
      { kind: 'mask', x: 0.52, scale: 0.85, role: 'metal' },
    ],
    shadowScale: 1.15,
  },
  /** What steps out when the case cracks: loose wrap, bare skull, no gold. */
  risen_husk: {
    parts: [
      { kind: 'tatters', scale: 0.95, params: { n: 5 } },
      { kind: 'shroudWrap', scale: 0.9, alpha: 0.75, params: { bands: 2 } },
      { kind: 'claws', params: { len: 0.6, talons: 3 } },
      { kind: 'skull', x: 0.42, scale: 0.85 },
      { kind: 'eyes', color: '#e8b048', params: { spread: 0.34, dist: 0.5, size: 0.1 } },
    ],
    live: [{ kind: 'carrionFlies', scale: 0.8, params: { flies: 4 } }],
  },
  // The four SEAL-BEARERS (the Unsealing): each carries its ward's jar big
  // on the back — the stopper shape IS the talisman you're about to flare.
  /** Jackal: lean courser — pricked ears, long claws, the hunting crouch. */
  canopic_jackal: {
    parts: [
      { kind: 'torso', scale: 0.82 },
      { kind: 'shroudWrap', scale: 0.92, params: { bands: 3 } },
      { kind: 'canopicJar', x: -0.5, scale: 0.85, params: { stopper: 1 } },
      { kind: 'ears', scale: 1.1, role: 'metal' },
      { kind: 'claws', params: { len: 0.7, talons: 3 } },
      { kind: 'mask', x: 0.44, scale: 0.72, role: 'metal' },
    ],
  },
  /** Falcon: the far eye — spread pinions over the wrapped body. */
  canopic_falcon: {
    parts: [
      { kind: 'robe', scale: 0.9 },
      { kind: 'shroudWrap', scale: 0.85, alpha: 0.85, params: { bands: 3 } },
      { kind: 'featherWings', scale: 0.9, alpha: 0.9 },
      { kind: 'canopicJar', x: -0.52, scale: 0.85, params: { stopper: 2 } },
      { kind: 'beak', x: 0.46, scale: 0.8, role: 'metal' },
      { kind: 'eyes', color: '#ffe090', params: { spread: 0.36, dist: 0.55, size: 0.11 } },
    ],
    live: [{ kind: 'wisps', scale: 0.55, color: '#d8c070', alpha: 0.45 }],
  },
  /** Ape: the shoulders — humped bulk, fists, the domed jar riding high. */
  canopic_ape: {
    parts: [
      { kind: 'torso', scale: 1.0 },
      { kind: 'hump', scale: 1.05 },
      { kind: 'shroudWrap', scale: 1.05, params: { bands: 4 } },
      { kind: 'canopicJar', x: -0.42, y: 0.45, scale: 0.8, mirror: true, params: { stopper: 3 } },
      { kind: 'claws', params: { len: 0.8, talons: 4 } },
      { kind: 'mask', x: 0.5, scale: 0.9, role: 'metal' },
    ],
    shadowScale: 1.1,
  },
  /** Vizier: the tongue — robes, the open book, the human-browed jar. */
  canopic_vizier: {
    parts: [
      { kind: 'robe', scale: 1.0 },
      { kind: 'shroudWrap', scale: 0.8, alpha: 0.75, params: { bands: 2 } },
      { kind: 'canopicJar', x: -0.5, scale: 0.8, params: { stopper: 4 } },
      { kind: 'book', scale: 0.85 },
      { kind: 'censer', scale: 0.85 },
      { kind: 'mask', x: 0.42, scale: 0.78, role: 'metal' },
    ],
    live: [{ kind: 'runes', color: '#e8c060', scale: 0.9, alpha: 0.6, params: { n: 3 } }],
  },
  /** THE SAND REGENT: the whole dynasty on one body — the case worn whole,
   *  the crown over the gold face, the court script burning around him. */
  sand_regent: {
    parts: [
      { kind: 'sarcophagusLid', x: -0.18, scale: 1.3, params: { face: 1 } },
      { kind: 'torso', x: 0.22, scale: 0.75 },
      { kind: 'shroudWrap', x: 0.22, scale: 0.9, params: { bands: 4 } },
      { kind: 'pauldrons', role: 'metal', x: 0.18, scale: 0.9 },
      { kind: 'sword', params: { len: 1.2 } },
      { kind: 'mask', x: 0.5, scale: 0.95, role: 'metal' },
      { kind: 'crown', x: 0.62, scale: 0.8, role: 'metal' },
    ],
    live: [{ kind: 'runes', color: '#ffd890', scale: 1.05, alpha: 0.7, params: { n: 4 } }],
    shadowScale: 1.15,
  },

  // ======================================================== THE COILBORN
  // Serpentfolk of the wet margins. Family grammar, readable at a glance:
  // every true-blood is a NAGA — humanoid torso over a worm-tail of coils
  // (the def's `worm` draws the length; the `scale` material glosses it) —
  // the COBRA HOOD flares wider with rank, the COIL base marks the court's
  // stationary castes, and the trident-and-net are the wet-hunter's tools.
  // The adder alone is beast, not blood: no torso, no hood — just the snake.
  /** The marsh's own snake: wedge head, bared fangs, the tail is the body. */
  marsh_adder: {
    parts: [
      { kind: 'serpentHead', scale: 1.05 },
      { kind: 'fangs', scale: 0.9 },
      { kind: 'eyes', color: '#ffd870', params: { n: 2, spread: 0.4, dist: 0.55, size: 0.09 } },
      { kind: 'stripes', scale: 0.9, params: { n: 3 } },
    ],
    shadowScale: 1.2,
  },
  /** The skirmisher: lean torso, half-flared hood, net and fishing trident. */
  bog_strider: {
    parts: [
      { kind: 'cobraHood', scale: 0.72, params: { flare: 0.8, ribs: 3, spectacle: 0 } },
      { kind: 'torso', scale: 0.88 },
      { kind: 'scutes', scale: 0.8 },
      { kind: 'net', x: -0.3, y: 0.5, scale: 0.7 },
      { kind: 'trident', params: { len: 1.0 } },
      { kind: 'eyes', color: '#ffe090', params: { spread: 0.3, dist: 0.62, size: 0.09 } },
    ],
  },
  /** The artillery: the hood at FULL threat — you read the spit coming. */
  hooded_spitter: {
    parts: [
      { kind: 'cobraHood', scale: 1.0, params: { flare: 1.25, ribs: 5, spectacle: 1 } },
      { kind: 'torso', scale: 0.9 },
      { kind: 'scutes', scale: 0.82 },
      { kind: 'fangJaw', x: 0.3, scale: 0.85, params: { gape: 0.55, venom: 1 } },
      { kind: 'eyes', color: '#d8ff70', params: { spread: 0.34, dist: 0.58, size: 0.1 } },
    ],
  },
  /** The venom-speaker: robed over the risen coil, jaw agape mid-litany. */
  fang_priest: {
    parts: [
      { kind: 'coil', scale: 0.95, alpha: 0.9, params: { loops: 3 } },
      { kind: 'robe', scale: 0.95 },
      { kind: 'cobraHood', scale: 0.85, params: { flare: 1.05, ribs: 4, spectacle: 1 } },
      { kind: 'fangJaw', x: 0.34, scale: 0.8, params: { gape: 0.5, venom: 1 } },
      { kind: 'censer', scale: 0.85 },
      { kind: 'staff', scale: 0.9 },
    ],
    live: [{ kind: 'wisps', scale: 0.6, color: '#9fe86a', alpha: 0.5 }],
  },
  /** The wall that wraps you: plated torso, mace, the long armored tail. */
  constrictor_knight: {
    parts: [
      { kind: 'cobraHood', scale: 0.7, role: 'metal', params: { flare: 0.75, ribs: 3, spectacle: 0 } },
      { kind: 'torso', scale: 1.0 },
      { kind: 'armorPlates', scale: 0.9 },
      { kind: 'pauldrons', role: 'metal', scale: 0.9 },
      { kind: 'dorsalRidge', scale: 0.9 },
      { kind: 'mace', params: { len: 1.05 } },
      { kind: 'eyes', color: '#ffd870', params: { spread: 0.28, dist: 0.6, size: 0.09 } },
    ],
    shadowScale: 1.15,
  },
  /** The song in the reeds: veils streaming off the hood, the lure-light
   *  burning ahead of her — the pull you feel before you see her. */
  siren_adder: {
    parts: [
      { kind: 'coil', scale: 0.9, alpha: 0.85, params: { loops: 2 } },
      { kind: 'torso', scale: 0.85 },
      { kind: 'cobraHood', scale: 0.78, params: { flare: 0.95, ribs: 4, spectacle: 1 } },
      { kind: 'eyes', color: '#8ae8d8', params: { spread: 0.3, dist: 0.6, size: 0.1 } },
    ],
    live: [
      { kind: 'veilSashes', scale: 0.95, alpha: 0.85, params: { sashes: 4 } },
      { kind: 'lure', color: '#8ae8d8', params: { len: 1.05 } },
    ],
  },
  /** THE COIL MATRIARCH: the crown of the wet margins — full hood, trident,
   *  the court coil gathered beneath her. */
  coil_matriarch: {
    parts: [
      { kind: 'coil', scale: 1.05, params: { loops: 4 } },
      { kind: 'torso', scale: 0.95 },
      { kind: 'scutes', scale: 0.85 },
      { kind: 'cobraHood', scale: 1.05, params: { flare: 1.3, ribs: 5, spectacle: 1 } },
      { kind: 'fangJaw', x: 0.32, scale: 0.8, params: { gape: 0.5, venom: 1 } },
      { kind: 'trident', params: { len: 1.2 } },
      { kind: 'crown', x: 0.5, scale: 0.7, role: 'metal' },
    ],
    live: [{ kind: 'wisps', scale: 0.7, color: '#9fe86a', alpha: 0.55 }],
    shadowScale: 1.2,
  },

  // ================================================== THE LORDS BELOW
  // The Underworld War's officer tiers, composed ENTIRELY from the existing
  // painter library. The family grammar, readable at a glance: every MARSHAL
  // wears its lord's WAR-BANNER on its back (the one silhouette element all
  // eight share — "an officer of the war") while the motif parts name the
  // banner (flame, chain, gore, door, doom, hush, siege, tithe); every LORD
  // is the same motif at throne scale under a horn-crown. No new painters.
  chain_warden: {
    parts: [
      { kind: 'torso', scale: 0.95 },
      { kind: 'armorPlates', scale: 0.85 },
      { kind: 'chains', rot: 0.5, params: { n: 3 } },
      { kind: 'mace', params: { len: 0.95 } },
      { kind: 'horns', scale: 0.6 },
      { kind: 'eyes', color: '#b8c8e8', params: { spread: 0.35, dist: 0.58, size: 0.09 } },
    ],
  },
  /** THE IRON BELL, the hull: a walking mausoleum — masonry courses under
   *  twin stelae ranks, a tomb-face at the prow, funeral cloth trailing.
   *  Deliberately BELL-LESS: the bell and the bearing columns are separate
   *  hittable part-actors (MonsterDef.parts), so the silhouette teaches the
   *  fight's anatomy at a glance — hull, legs, bell, three different asks. */
  ironbell_mausoleum: {
    parts: [
      { kind: 'armorPlates', scale: 1.12, alpha: 0.95 },
      { kind: 'stakeRow', y: -0.55, scale: 0.78, alpha: 0.9 },
      { kind: 'stakeRow', y: 0.55, scale: 0.78, alpha: 0.9 },
      { kind: 'skull', x: 0.6, scale: 0.5, alpha: 0.85 },
      { kind: 'shroudWrap', x: -0.35, scale: 0.9, alpha: 0.5 },
    ],
    shadowScale: 1.45,
  },
  /** A bearing column of the Iron Bell: weathered stone flutes. Reads as
   *  ARCHITECTURE, not creature — the leg you crack, never a foe you duel. */
  ironbell_leg: {
    parts: [
      { kind: 'disc', scale: 0.95 },
      { kind: 'barkPlates', scale: 0.9, alpha: 0.9 },
    ],
  },
  /** The carried bell itself — yoke ring under a great swaying bell (the
   *  hushmaiden's instrument at mausoleum scale). Crack it: the toll dies. */
  ironbell_bell: {
    parts: [{ kind: 'collar', scale: 0.9, alpha: 0.9 }],
    live: [{ kind: 'bell', scale: 1.45, params: { swing: 0.6 } }],
  },
  /** Keeper of the Toll: the hushmaiden grammar in funeral stone — robe,
   *  hood, the small chime at the hip names its office at a glance. */
  bell_keeper: {
    parts: [
      { kind: 'robe', scale: 0.92, alpha: 0.95 },
      { kind: 'hood', x: 0.26, params: { eyes: true } },
      { kind: 'bell', y: 0.48, scale: 0.55 },
    ],
  },
  /** Toll-wretch: a shroud-bound penitent chained to the procession. */
  toll_wretch: {
    parts: [
      { kind: 'disc', scale: 0.8, alpha: 0.9 },
      { kind: 'shroudWrap', scale: 0.85, alpha: 0.8 },
      { kind: 'collar', scale: 0.7 },
      { kind: 'eyes', x: 0.3, scale: 0.6 },
    ],
  },
  /** The quiet made flesh: a veiled bell-bearer — the bell IS the threat. */
  hushmaiden: {
    parts: [
      { kind: 'robe', scale: 0.9, alpha: 0.9 },
      { kind: 'hood', x: 0.28, params: { eyes: true } },
      { kind: 'bell', y: 0.5, scale: 0.8 },
    ],
    live: [{ kind: 'veilSashes', scale: 0.85, alpha: 0.7, params: { sashes: 3 } }],
  },
  veil_stalker: {
    parts: [
      { kind: 'disc', scale: 0.82, alpha: 0.85 },
      { kind: 'daggers', params: { len: 0.65 } },
      { kind: 'tail', params: { len: 0.85 } },
      { kind: 'hood', x: 0.26, scale: 0.85, params: { eyes: true } },
    ],
    live: [{ kind: 'wisps', scale: 0.5, color: '#5aa0a0', alpha: 0.4 }],
  },
  /** The collector: hooked scythe, the strongbox chained to its back. */
  tithe_reaper: {
    parts: [
      { kind: 'torso', scale: 0.9 },
      { kind: 'chest', x: -0.35, scale: 0.7, role: 'metal' },
      { kind: 'chains', rot: 0.3, params: { n: 2 } },
      { kind: 'scythe', params: { len: 0.95 } },
      { kind: 'horns', scale: 0.55 },
      { kind: 'eyes', color: '#d8e870', params: { spread: 0.38, dist: 0.56, size: 0.09 } },
    ],
  },

  // --- the eight MARSHALS (banner + motif — the officer grammar) -------------
  marshal_surtash: {
    parts: [
      { kind: 'banner', x: -0.2 },
      { kind: 'torso' },
      { kind: 'lavaCracks', params: { n: 3 } },
      { kind: 'ramHorns', scale: 0.85 },
      { kind: 'sword', params: { len: 1.1, w: 0.13 } },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.34, dist: 0.6, size: 0.09 } },
    ],
    live: [{ kind: 'flames', x: -0.2, scale: 0.7, params: { n: 3 } }],
  },
  marshal_vormaul: {
    parts: [
      { kind: 'banner', x: -0.2 },
      { kind: 'torso', scale: 1.02 },
      { kind: 'armorPlates', scale: 0.95 },
      { kind: 'pauldrons', role: 'metal', scale: 0.95 },
      { kind: 'chains', rot: 0.4, params: { n: 3 } },
      { kind: 'mace', params: { len: 1.1 } },
      { kind: 'helm', scale: 0.8, role: 'metal' },
    ],
    shadowScale: 1.1,
  },
  marshal_morgrath: {
    parts: [
      { kind: 'banner', x: -0.22 },
      { kind: 'torso', scale: 1.05 },
      { kind: 'bloatSacs', x: -0.15, scale: 0.9, params: { n: 3 } },
      { kind: 'stitchSeams', rot: 0.5, params: { n: 2 } },
      { kind: 'maw', x: 0.4, scale: 0.5, params: { arc: 0.5 } },
      { kind: 'claws', params: { len: 0.55 } },
    ],
    live: [{ kind: 'carrionFlies', scale: 0.9, params: { flies: 5 } }],
    shadowScale: 1.1,
  },
  marshal_vethriss: {
    parts: [
      { kind: 'banner', x: -0.2 },
      { kind: 'robe', scale: 0.95 },
      { kind: 'tentacleRing', scale: 0.8, params: { n: 5 } },
      { kind: 'staff', params: { orb: 'glow' } },
      { kind: 'runes', params: { n: 4 } },
      { kind: 'eyes', color: '#c8a8ff', params: { spread: 0.32, dist: 0.58, size: 0.1 } },
    ],
    live: [{ kind: 'floatingShards', scale: 0.8, params: { n: 4 } }],
  },
  marshal_ozrimoth: {
    parts: [
      { kind: 'banner', x: -0.2 },
      { kind: 'robe' },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
      { kind: 'censer', y: 0.55, scale: 0.9 },
      { kind: 'brand', x: 0.3, scale: 0.85 },
      { kind: 'wings', scale: 0.65, alpha: 0.8 },
      { kind: 'runes', scale: 0.9, params: { n: 3 } },
    ],
  },
  marshal_nyxara: {
    parts: [
      { kind: 'banner', x: -0.2, alpha: 0.85 },
      { kind: 'torso', scale: 0.92, alpha: 0.9 },
      { kind: 'hood', x: 0.28, params: { eyes: true } },
      { kind: 'bell', y: 0.52, scale: 0.85 },
      { kind: 'daggers', params: { len: 0.6 } },
    ],
    live: [{ kind: 'veilSashes', scale: 0.95, alpha: 0.75, params: { sashes: 4 } }],
  },
  marshal_bhorog: {
    parts: [
      { kind: 'banner', x: -0.2 },
      { kind: 'torso', scale: 1.06 },
      { kind: 'armorPlates', x: -0.05, scale: 1 },
      { kind: 'pauldrons', role: 'metal', scale: 1 },
      { kind: 'ramHorns', scale: 0.9 },
      { kind: 'hammer', params: { len: 1.1 } },
      { kind: 'warhorn', x: -0.3, scale: 0.7 },
    ],
    shadowScale: 1.15,
  },
  marshal_molochai: {
    parts: [
      { kind: 'banner', x: -0.2 },
      { kind: 'robe', scale: 0.95 },
      { kind: 'chest', x: -0.32, scale: 0.75, role: 'metal' },
      { kind: 'scythe', params: { len: 1.05 } },
      { kind: 'crown', x: 0.35, scale: 0.55, role: 'metal' },
      { kind: 'gem', y: 0.45, scale: 0.5, role: 'glow' },
      { kind: 'eyes', color: '#e8e870', params: { spread: 0.34, dist: 0.58, size: 0.09 } },
    ],
  },

  // --- the eight LORDS (throne bodies — the motif at full scale) --------------
  lord_surtash: {
    parts: [
      { kind: 'torso', scale: 1.1 },
      { kind: 'lavaCracks', params: { n: 5 } },
      { kind: 'wings' },
      { kind: 'crownOfHorns', x: 0.28, scale: 0.9 },
      { kind: 'sword', params: { len: 1.25, w: 0.15 } },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.3, dist: 0.62, size: 0.09 } },
    ],
    live: [
      { kind: 'flames', x: -0.2, scale: 0.9, params: { n: 4 } },
      { kind: 'emberSparks', params: { n: 6, drift: 1 } },
    ],
    shadowScale: 1.2,
  },
  lord_vormaul: {
    parts: [
      { kind: 'torso', scale: 1.12 },
      { kind: 'armorPlates', scale: 1.05 },
      { kind: 'pauldrons', role: 'metal', scale: 1.05 },
      { kind: 'chains', rot: 0.35, params: { n: 4 } },
      { kind: 'chains', rot: -0.5, params: { n: 3 } },
      { kind: 'mace', params: { len: 1.25 } },
      { kind: 'helm', scale: 0.9, role: 'metal' },
      { kind: 'crownOfHorns', x: 0.3, scale: 0.7 },
    ],
    shadowScale: 1.25,
  },
  lord_morgrath: {
    parts: [
      { kind: 'torso', scale: 1.15 },
      { kind: 'bloatSacs', x: -0.18, scale: 1.05, params: { n: 4 } },
      { kind: 'stitchSeams', rot: 0.4, params: { n: 3 } },
      { kind: 'maw', x: 0.42, scale: 0.6, params: { arc: 0.6 } },
      { kind: 'crownOfHorns', x: 0.26, scale: 0.8 },
      { kind: 'claws', params: { len: 0.6 } },
    ],
    live: [{ kind: 'carrionFlies', scale: 1.1, params: { flies: 7 } }],
    shadowScale: 1.25,
  },
  lord_vethriss: {
    parts: [
      { kind: 'tentacleRing', scale: 0.95, params: { n: 7 } },
      { kind: 'robe', scale: 1.05, alpha: 0.95 },
      { kind: 'staff', params: { orb: 'glow', len: 1.15 } },
      { kind: 'runes', scale: 1.05, params: { n: 5 } },
      { kind: 'crownOfHorns', x: 0.28, scale: 0.75 },
      { kind: 'eyes', color: '#c8a8ff', params: { spread: 0.3, dist: 0.6, size: 0.1 } },
    ],
    live: [{ kind: 'floatingShards', scale: 1.05, params: { n: 6 } }],
    shadowScale: 1.15,
  },
  lord_ozrimoth: {
    parts: [
      { kind: 'robe', scale: 1.08 },
      { kind: 'hood', x: 0.3, scale: 1.05, params: { eyes: true } },
      { kind: 'wings', scale: 0.9, alpha: 0.85 },
      { kind: 'censer', y: 0.6, scale: 1 },
      { kind: 'brand', x: 0.32, scale: 0.95 },
      { kind: 'runes', scale: 1.1, params: { n: 5 } },
      { kind: 'halo', scale: 0.9, alpha: 0.6 },
    ],
    shadowScale: 1.15,
  },
  lord_nyxara: {
    parts: [
      { kind: 'torso', scale: 1.02, alpha: 0.88 },
      { kind: 'hood', x: 0.3, scale: 1, params: { eyes: true } },
      { kind: 'bell', y: 0.55, scale: 1 },
      { kind: 'daggers', params: { len: 0.7 } },
      { kind: 'crown', x: 0.4, scale: 0.55, role: 'dark' },
    ],
    live: [
      { kind: 'veilSashes', scale: 1.1, alpha: 0.8, params: { sashes: 5 } },
      { kind: 'wisps', scale: 0.7, color: '#5aa0a0', alpha: 0.45 },
    ],
    shadowScale: 1.1,
  },
  lord_bhorog: {
    parts: [
      { kind: 'torso', scale: 1.15 },
      { kind: 'armorPlates', x: -0.05, scale: 1.1 },
      { kind: 'pauldrons', role: 'metal', scale: 1.1 },
      { kind: 'ramHorns', scale: 1.05 },
      { kind: 'hammer', params: { len: 1.25 } },
      { kind: 'warhorn', x: -0.32, scale: 0.8 },
      { kind: 'crownOfHorns', x: 0.3, scale: 0.75 },
    ],
    shadowScale: 1.3,
  },
  lord_molochai: {
    parts: [
      { kind: 'robe', scale: 1.05 },
      { kind: 'chest', x: -0.35, scale: 0.9, role: 'metal' },
      { kind: 'chains', rot: 0.4, params: { n: 2 } },
      { kind: 'scythe', params: { len: 1.2 } },
      { kind: 'crown', x: 0.38, scale: 0.65, role: 'metal' },
      { kind: 'gem', y: 0.5, scale: 0.6, role: 'glow' },
      { kind: 'eyes', color: '#e8e870', params: { spread: 0.32, dist: 0.6, size: 0.09 } },
    ],
    live: [{ kind: 'wisps', scale: 0.6, color: '#8ab04a', alpha: 0.5 }],
    shadowScale: 1.15,
  },

  // ===================================================== DEPLOYED CONSTRUCTS
  // Skill-objects (ConstructDelivery) — the square-and-skill-color era ends.
  // spawnConstruct dresses by kind through CONSTRUCT_LOOKS below unless the
  // delivery names its own look; the skill's color drives each palette, so
  // a flame totem burns orange and a storm pylon hums yellow for free.
  /** The carved post: ring courses, notches, a glowing sigil eye. */
  construct_totem: {
    parts: [{ kind: 'totemPost', params: { rings: 3 } }],
  },
  /** The ballista: a plank frame under a drawn bow, aimed down its lane. */
  construct_sentry: {
    parts: [
      { kind: 'crateBox', scale: 0.72 },
      { kind: 'bow', scale: 1.3 },
    ],
  },
  /** The pylon: a crystal seated on a stone base, humming. */
  construct_pylon: {
    parts: [
      { kind: 'disc', scale: 0.55 },
      { kind: 'gem', scale: 1.15 },
    ],
  },
  /** The trap: a half-buried jaw ring — faint by design (it is concealed). */
  construct_trap: {
    parts: [
      { kind: 'disc', scale: 0.6, alpha: 0.45 },
      { kind: 'mandibles', scale: 0.9, alpha: 0.85 },
    ],
  },
  /** The mine: a squat orb bristling with contact barbs. */
  construct_mine: {
    parts: [
      { kind: 'orb', scale: 0.8 },
      { kind: 'barbs', scale: 0.85 },
    ],
  },
  /** A LODGED SPEAR (embedments, hanging carom arrows): one slim stake and
   *  its fletching, read from above. */
  construct_spear: {
    parts: [
      { kind: 'stakeRow', params: { n: 1, span: 0.66 } },
      { kind: 'quiver', x: -0.34, scale: 0.66, alpha: 0.9 },
    ],
  },
  /** Barrier segments: one stakeRow, three materials. */
  construct_barrier_bone: {
    parts: [{ kind: 'stakeRow', role: 'bone', params: { n: 4, span: 1.9 } }],
  },
  construct_barrier_stone: {
    parts: [{ kind: 'stakeRow', color: '#8a8276', params: { n: 3, span: 1.9 } }],
  },
  construct_barrier_ice: {
    parts: [{ kind: 'stakeRow', color: '#bcdcec', alpha: 0.92, params: { n: 4, span: 1.9 } }],
  },
  /** The hedge segment: a thorn-woven fence rank (Bramble Hedge). */
  construct_barrier_bramble: {
    parts: [
      { kind: 'stakeRow', color: '#5a7a34', params: { n: 4, span: 1.9 } },
      { kind: 'nestTwigs', scale: 0.95, alpha: 0.9, params: { n: 10 } },
    ],
  },
  /** The DOME projector — a warded beacon: pedestal, humming core, rune
   *  ring, glow. The bubble itself is live FX (renderer domeRadius). */
  construct_dome: {
    parts: [
      { kind: 'disc', scale: 0.6, role: 'metal' },
      { kind: 'runes', scale: 0.85, params: { n: 3 } },
      { kind: 'gem', scale: 1.05 },
      { kind: 'halo', scale: 1.15 },
    ],
  },
  /** The launch PAD: a flat rune plate — all glow, no mass (its facing is
   *  the hurl direction; the aim tick points the throw). */
  construct_pad: {
    parts: [
      { kind: 'disc', scale: 0.85, alpha: 0.55 },
      { kind: 'runes', scale: 0.72, params: { n: 5 } },
      { kind: 'halo', scale: 0.72 },
    ],
    shadowScale: 0.3,
  },
  /** The GATE anchor: a rune-bound portal ring around a burning core. */
  construct_gate: {
    parts: [
      { kind: 'halo', scale: 1.2 },
      { kind: 'runes', scale: 1.0, params: { n: 6 } },
      { kind: 'orb', scale: 0.66 },
    ],
    live: [{ kind: 'wisps', scale: 0.7, params: { n: 2 } }],
    shadowScale: 0.4,
  },
  /** The ERUPTOR vent: a cracked mound seeping its skill's heat (Volcano,
   *  Stormbrand Beacon). Rifts that hang in the AIR want construct_rift. */
  construct_eruptor: {
    parts: [
      { kind: 'blob', params: { irr: 0.24, seed: 9 } },
      { kind: 'lavaCracks', scale: 0.95, params: { n: 5 } },
      { kind: 'orb', scale: 0.5 },
    ],
  },
  /** A torn RIFT: jagged shards around a burning heart (Shardrift, Hell
   *  Rift) — the skill color decides whether it's ice or hellfire. */
  construct_rift: {
    parts: [
      { kind: 'crystalGrowths', scale: 1.0, params: { n: 5 } },
      { kind: 'orb', scale: 0.55 },
    ],
    shadowScale: 0.5,
  },
  /** THE UNMAKER ACOLYTE: the war's quiet clerisy — a robed adept under a
   *  deep hood, a rune-brand burning where a holy symbol would hang, and
   *  the fragments of whatever it last unmade still orbiting it (the
   *  floatingShards live painter's debut). */
  unmaker_acolyte: {
    parts: [
      { kind: 'robe' },
      { kind: 'hood', x: 0.3, params: { eyes: true, eyeColor: '#9fffc0' } },
      { kind: 'brand', y: 0.15, scale: 0.5, role: 'glow' },
    ],
    live: [{ kind: 'floatingShards', params: { n: 5 } }],
  },
  /** THE HATEBOUND HULK: the Legion's plunder-mule — a chained bulk under
   *  harness and pack, branded with its owner's mark. What it hauls, it
   *  drops (MonsterDef.carry — the armory contract on demon ground). */
  hatebound_hulk: {
    parts: [
      { kind: 'torso' },
      { kind: 'pauldrons', scale: 1.05 },
      { kind: 'chains', scale: 1.1 },
      { kind: 'harness' },
      { kind: 'pack', x: -0.45, scale: 0.9 },
      { kind: 'brand', x: 0.3, scale: 0.45, role: 'glow' },
      { kind: 'eyes', params: { spread: 0.3, dist: 0.7, size: 0.09 } },
    ],
  },
  /** The TREE of the grove: a full crown over root-heave (two root fans =
   *  all-around heave; the crown is the whole silhouette from above). */
  construct_tree: {
    parts: [
      { kind: 'roots', scale: 1.15, params: { n: 7 } },
      { kind: 'roots', rot: Math.PI, scale: 1.15, params: { n: 5 } },
      { kind: 'capDome', scale: 0.95, params: { spots: 0 } },
      { kind: 'halo', scale: 1.05 },
    ],
  },
  /** The standing RELIC: a reliquary gem in its sunburst standard. */
  construct_relic: {
    parts: [
      { kind: 'sunburst', scale: 0.9, params: { n: 8 } },
      { kind: 'halo', scale: 0.8 },
      { kind: 'gem', scale: 1.1 },
    ],
    shadowScale: 0.5,
  },
  /** The POD default: a gravid egg bedded in a woven ring (Strangler Seed,
   *  Broodpod; brood_egg / grub_egg stay the bespoke clutches). */
  construct_pod: {
    parts: [
      { kind: 'nestTwigs', scale: 0.72, params: { n: 8 } },
      { kind: 'egg', scale: 0.85 },
    ],
    shadowScale: 0.6,
  },
  /** The powder CASK: a banded keg, fuse-spark glowing at the bung. */
  construct_cask: {
    parts: [
      { kind: 'keg', scale: 0.95 },
      { kind: 'orb', x: 0.4, y: -0.4, scale: 0.34 },
    ],
  },
  /** The hung SUN (Solar Orb): a burning core in its spoked corona. */
  construct_sun: {
    parts: [
      { kind: 'sunburst', scale: 1.0, params: { n: 10 } },
      { kind: 'orb', scale: 0.9 },
    ],
    shadowScale: 0.45,
  },
  /** The GREAT BELL on its stand — it sways, wanting to be struck. */
  construct_bell: {
    parts: [{ kind: 'disc', scale: 0.55, role: 'wood' }],
    live: [{ kind: 'bell', scale: 1.5, params: { swing: 0.1 } }],
  },
  /** The whirlaxe CATCH SPOT: the marked circle, steel lying in it. */
  construct_axe_catch: {
    parts: [
      { kind: 'halo', scale: 1.1 },
      { kind: 'axe', scale: 1.1, rot: -0.5 },
    ],
    shadowScale: 0.4,
  },

  // ==================================================== BESTIARY EXPANSION
  // Six families in one pass: cap-folk, cavern dwellers, the treant line,
  // beastkin, the Glut, and the rookeries. New limbs: capDome, gillFrill,
  // barkPlates, branchArms, stalactites, nestTwigs, puffMotes, oozeLobes,
  // fleshFolds, eyeCluster.

  // --- The cap-folk (solid MUSHROOM kin of the Bloom — no clouds) ---------
  /** A walking button: all cap, barely any body. */
  mushroomling: {
    parts: [
      { kind: 'disc', scale: 0.55, role: 'bone' },
      { kind: 'capDome', scale: 0.95, params: { spots: 4 } },
      { kind: 'eyes', color: '#e8e0b8', params: { spread: 0.5, dist: 0.72, size: 0.1 } },
    ],
  },
  /** The line infantry: gills under the war-cap, a crude blade. */
  myconid_warrior: {
    parts: [
      { kind: 'disc', scale: 0.75, role: 'bone' },
      { kind: 'gillFrill', scale: 0.8 },
      { kind: 'sword', y: 0.05, params: { len: 0.8 } },
      { kind: 'capDome', scale: 0.85, params: { spots: 5 } },
      { kind: 'eyes', color: '#e8e0b8', params: { spread: 0.4, dist: 0.66, size: 0.08 } },
    ],
  },
  /** The cap-caller: a tall crooked cap over robes, spore-dust rising. */
  myconid_capcaller: {
    parts: [
      { kind: 'robe', scale: 0.9 },
      { kind: 'gillFrill', scale: 0.7 },
      { kind: 'staff', params: { orb: 'glow' } },
      { kind: 'capDome', scale: 0.78, x: 0.06, params: { spots: 6, squash: 0.72 } },
    ],
    live: [{ kind: 'puffMotes', params: { n: 3, drift: 0.8 } }],
  },
  /** The bolete brute: a stump of a body under a massive shelf-cap. */
  bolete_brute: {
    parts: [
      { kind: 'blob', scale: 0.9, params: { irr: 0.18, seed: 61 } },
      { kind: 'mossPatch', params: { n: 3 } },
      { kind: 'claws', params: { len: 0.45 } },
      { kind: 'capDome', scale: 1.05, x: -0.05, params: { spots: 7, squash: 0.92 } },
      { kind: 'eyes', color: '#e8d8a8', params: { spread: 0.36, dist: 0.7, size: 0.08 } },
    ],
  },
  /** The sovereign: a crowned parasol over gill-lace, ringed in motes. */
  amanita_sovereign: {
    parts: [
      { kind: 'gillFrill', scale: 1.0, params: { n: 18 } },
      { kind: 'robe', scale: 0.85 },
      { kind: 'capDome', scale: 0.95, params: { spots: 9, squash: 0.8 } },
      { kind: 'crown', x: 0.3, scale: 0.55, role: 'accent' },
      { kind: 'runes', params: { n: 4 } },
    ],
    live: [{ kind: 'puffMotes', params: { n: 5, drift: 1.0 } }],
  },
  /** The Bloom's drifter: a slack balloon of spores, trailing dust. */
  spore_drifter: {
    parts: [
      { kind: 'blob', scale: 0.9, alpha: 0.9, params: { irr: 0.3, seed: 67 } },
      { kind: 'sporeVents', params: { n: 2 } },
      { kind: 'eyes', color: '#d8e8a8', params: { spread: 0.4, dist: 0.5, size: 0.09 } },
    ],
    live: [{ kind: 'puffMotes', params: { n: 6, drift: 1.2 } }],
  },
  /** The spore sac (nest): a swollen fruiting body rooted in its own web. */
  spore_sac: {
    parts: [
      { kind: 'roots', scale: 0.9, params: { n: 5 } },
      { kind: 'blob', params: { irr: 0.22, seed: 71 } },
      { kind: 'bloatSacs', scale: 0.8, params: { n: 4 } },
      { kind: 'capDome', scale: 0.6, x: 0.1, params: { spots: 3 } },
    ],
    live: [{ kind: 'puffMotes', params: { n: 4, drift: 0.9 } }],
    shadowScale: 0.7,
  },

  // --- The cavern dwellers ------------------------------------------------
  /** A ragged wing-scrap with ears and teeth. */
  cave_bat: {
    parts: [
      { kind: 'disc', scale: 0.6 },
      { kind: 'featherWings', scale: 1.15, alpha: 0.95 },
      { kind: 'ears', scale: 0.8 },
      { kind: 'fangs', scale: 0.6 },
      { kind: 'eyes', color: '#ffb0b0', params: { spread: 0.4, dist: 0.55, size: 0.1 } },
    ],
  },
  /** The roost: a twig-and-guano bowl clinging to the rock, wings stirring. */
  bat_roost: {
    parts: [
      { kind: 'blob', scale: 0.9, role: 'dark', params: { irr: 0.2, seed: 73 } },
      { kind: 'nestTwigs', params: { n: 16 } },
      { kind: 'eyeCluster', color: '#ffb0b0', params: { n: 6, spread: 0.9, dist: 0.4 } },
    ],
    shadowScale: 0.7,
  },
  /** An armored larva: plated back, pale grub flesh, mandibles. */
  rockgrub: {
    parts: [
      { kind: 'blob', scale: 0.95, role: 'bone', params: { irr: 0.14, seed: 79 } },
      { kind: 'scutes', scale: 0.9 },
      { kind: 'mandibles', scale: 0.8 },
      { kind: 'eyes', color: '#c8d8e8', params: { spread: 0.3, dist: 0.62, size: 0.06 } },
    ],
    live: [{ kind: 'slimeTrail', color: '#6a6a58', params: { n: 3 } }],
  },
  /** The clutch: a nest-ring of quivering eggs. */
  grub_clutch: {
    parts: [
      { kind: 'nestTwigs', scale: 0.95, params: { n: 14 } },
      { kind: 'egg', x: 0.2, y: 0.15, scale: 0.5 },
      { kind: 'egg', x: -0.22, y: 0.1, scale: 0.42 },
      { kind: 'egg', x: 0, y: -0.25, scale: 0.46 },
    ],
    shadowScale: 0.7,
  },
  /** The lurker: a stalagmite crown over a hidden maw — furniture until it
   *  isn't. */
  stalagmite_lurker: {
    parts: [
      { kind: 'blob', params: { irr: 0.12, seed: 83 } },
      { kind: 'stalactites', params: { n: 7 } },
      { kind: 'maw', x: 0.3, scale: 0.5, params: { arc: 0.5 } },
      { kind: 'eyeCluster', color: '#a8d8c8', params: { n: 4, spread: 0.5, dist: 0.55 } },
    ],
  },
  /** The gloom fisher: a hunched angler of the dark, lure held forward. */
  gloom_fisher: {
    parts: [
      { kind: 'blob', scale: 0.9, role: 'dark', params: { irr: 0.24, seed: 89 } },
      { kind: 'lure', scale: 1.1 },
      { kind: 'claws', params: { len: 0.5, talons: 3 } },
      { kind: 'fangs', scale: 0.7 },
      { kind: 'eyeCluster', color: '#b8e8d8', params: { n: 3, spread: 0.4, dist: 0.5 } },
    ],
  },
  /** The shrieker: all ears and mouth on a scrawny frame. */
  cavern_shrieker: {
    parts: [
      { kind: 'disc', scale: 0.7 },
      { kind: 'ears', scale: 1.3 },
      { kind: 'maw', x: 0.4, scale: 0.5, params: { arc: 0.6 } },
      { kind: 'eyes', color: '#e8c8a8', params: { spread: 0.5, dist: 0.55, size: 0.11 } },
    ],
  },

  // --- The treant line ------------------------------------------------------
  /** A sapling: a whip of green over root-toes. */
  sylvan_sapling: {
    parts: [
      { kind: 'roots', scale: 0.7, params: { n: 4 } },
      { kind: 'disc', scale: 0.55, role: 'wood' },
      { kind: 'fronds', scale: 0.75, params: { n: 3 } },
      { kind: 'eyes', color: '#c8e8a0', params: { spread: 0.4, dist: 0.55, size: 0.09 } },
    ],
  },
  /** A snarl of animate deadfall — all elbows and switches. */
  twig_snarl: {
    parts: [
      { kind: 'branchArms', scale: 0.8, mirror: true, params: { forks: 4, len: 1.0 } },
      { kind: 'disc', scale: 0.5, role: 'wood' },
      { kind: 'barbs', scale: 0.7, params: { n: 4 } },
      { kind: 'eyes', color: '#d8c86a', params: { spread: 0.45, dist: 0.5, size: 0.08 } },
    ],
  },
  /** The warden: a barrel trunk in bark plate, boughs for arms. */
  treant_warden: {
    parts: [
      { kind: 'torso', scale: 1.0, role: 'wood' },
      { kind: 'barkPlates', params: { n: 6 } },
      { kind: 'branchArms', mirror: true, params: { forks: 3, len: 1.1 } },
      { kind: 'fronds', scale: 0.9, params: { n: 4 } },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.3, dist: 0.6, size: 0.08 } },
    ],
  },
  /** The root snarl (anchored): a heaved knot of ground and grasping roots. */
  root_snarl: {
    parts: [
      { kind: 'roots', scale: 1.05, params: { n: 7 } },
      { kind: 'blob', scale: 0.8, role: 'wood', params: { irr: 0.28, seed: 97 } },
      { kind: 'mossPatch', params: { n: 3 } },
      { kind: 'eyeCluster', color: '#c8e86a', params: { n: 3, spread: 0.6, dist: 0.45 } },
    ],
    shadowScale: 0.7,
  },
  /** The elder: a leaning tower of bark and bough (limbs are composite
   *  PARTS — they break off it in play). */
  elder_treant: {
    parts: [
      { kind: 'torso', scale: 1.1, role: 'wood' },
      { kind: 'barkPlates', params: { n: 8 } },
      { kind: 'mossPatch', scale: 0.9, params: { n: 4 } },
      { kind: 'fronds', scale: 1.2, params: { n: 6 } },
      { kind: 'crown', x: 0.3, scale: 0.5, role: 'wood' },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.26, dist: 0.62, size: 0.07 } },
    ],
  },
  /** One breaking bough of the elder — a full monster part. */
  treant_bough: {
    parts: [
      { kind: 'branchArms', scale: 1.1, params: { forks: 4, len: 1.25 } },
      { kind: 'barkPlates', scale: 0.6, params: { n: 3 } },
    ],
  },

  // --- The beastkin (the Horned Tribes) -------------------------------------
  /** The gorer: down-slung head, ram horns, a hide of war-paint. */
  beastkin_gorer: {
    parts: [
      { kind: 'torso', scale: 0.95 },
      { kind: 'ramHorns', scale: 1.05 },
      { kind: 'snout', scale: 0.9 },
      { kind: 'warpaint', params: { n: 3 } },
    ],
  },
  /** The impaler: a lighter frame behind a long spear and quiver. */
  beastkin_impaler: {
    parts: [
      { kind: 'disc', scale: 0.8 },
      { kind: 'ramHorns', scale: 0.8 },
      { kind: 'snout', scale: 0.8 },
      { kind: 'staff', y: 0.55, params: { len: 1.2 } },
      { kind: 'quiver', x: -0.3, scale: 0.7 },
    ],
  },
  /** The ritualist: horns through a cowl, a censer of burnt herbs. */
  beastkin_ritualist: {
    parts: [
      { kind: 'robe', scale: 0.9 },
      { kind: 'ramHorns', scale: 0.9 },
      { kind: 'censer', y: 0.5, scale: 0.85 },
      { kind: 'runes', scale: 0.9, params: { n: 3 } },
      { kind: 'eyes', color: '#ffce7a', params: { spread: 0.35, dist: 0.55, size: 0.09 } },
    ],
  },
  /** The flayer: twin knives, trophy-hung, quick. */
  beastkin_flayer: {
    parts: [
      { kind: 'disc', scale: 0.85 },
      { kind: 'ramHorns', scale: 0.75 },
      { kind: 'snout', scale: 0.75 },
      { kind: 'daggers', params: { len: 0.6 } },
      { kind: 'bandolier' },
    ],
  },
  /** The horncaller: the great curled WARHORN across the body is the whole
   *  read — robe, rack, and the horn it lives to sound (the khan wears his
   *  at the hip; the caller IS the horn). */
  beastkin_horncaller: {
    parts: [
      { kind: 'robe', scale: 0.9 },
      { kind: 'ramHorns', scale: 1.0 },
      { kind: 'warhorn', scale: 1.25 },
      { kind: 'eyes', color: '#ffce7a', params: { spread: 0.35, dist: 0.55, size: 0.09 } },
    ],
  },
  /** The crag condor: WINGS FIRST at any distance — a broad earth-brown fan,
   *  bare head, a ruff plume; the pass's patient sky (the shrike's grammar,
   *  carrion-toned). */
  crag_condor: {
    parts: [
      { kind: 'featherWings', scale: 1.4 },
      { kind: 'torso', scale: 0.62 },
      { kind: 'beak', scale: 0.95 },
      { kind: 'plume', x: -0.2, scale: 0.55 },
      { kind: 'eyes', params: { n: 2, spread: 0.38, dist: 0.34, size: 0.12 } },
    ],
    shadowScale: 0.5,
  },
  /** The boulderback: a dome of stone-grey shell under rock studs — parked,
   *  it IS one of the chute's boulders; then the legs unfold. That is the
   *  whole lesson. */
  boulderback: {
    parts: [
      { kind: 'carapace', scale: 1.05, role: 'base' },
      { kind: 'armorPlates', scale: 0.9 },
      { kind: 'spikes', scale: 0.7 },
      { kind: 'snout', scale: 0.55 },
      { kind: 'eyes', color: '#d8cc9a', params: { spread: 0.3, dist: 0.6, size: 0.08 } },
    ],
  },
  /** The khan: the great rack, a mane, the warhorn at his hip. */
  beastlord_khan: {
    parts: [
      { kind: 'torso', scale: 1.05 },
      { kind: 'mane', scale: 1.0 },
      { kind: 'ramHorns', scale: 1.25 },
      { kind: 'snout', scale: 0.95 },
      { kind: 'warhorn', x: -0.2, scale: 0.9 },
      { kind: 'axe', params: { len: 0.9 } },
    ],
  },

  // --- The Glut (flesh & the viscous) ---------------------------------------
  /** A gob of living meat that rolls itself along. */
  lesser_ooze: {
    parts: [
      { kind: 'blob', alpha: 0.92, params: { irr: 0.34, seed: 101 } },
      { kind: 'eyes', color: '#ffd8c8', params: { n: 1, spread: 0, dist: 0.3, size: 0.12 } },
    ],
    live: [{ kind: 'oozeLobes', params: { n: 4 } }, { kind: 'slimeTrail', color: '#7a4038', params: { n: 4 } }],
  },
  /** The parent slick: lobes that never settle, too many eyes. */
  viscous_ooze: {
    parts: [
      { kind: 'blob', alpha: 0.94, params: { irr: 0.3, seed: 103 } },
      { kind: 'veinweb', params: { n: 4 } },
      { kind: 'eyeCluster', color: '#ffd8c8', params: { n: 5, spread: 0.7, dist: 0.4 } },
    ],
    live: [{ kind: 'oozeLobes', params: { n: 6 } }, { kind: 'slimeTrail', color: '#7a4038', params: { n: 5 } }],
  },
  /** The hurler: a bloated torso that reaches into itself for ammunition. */
  gutspray_hurler: {
    parts: [
      { kind: 'blob', params: { irr: 0.24, seed: 107 } },
      { kind: 'bloatSacs', scale: 0.9, params: { n: 5 } },
      { kind: 'fleshFolds', params: { n: 3 } },
      { kind: 'maw', x: 0.42, scale: 0.45, params: { arc: 0.5 } },
      { kind: 'eyes', color: '#ffb0a0', params: { spread: 0.4, dist: 0.6, size: 0.08 } },
    ],
  },
  /** The amalgam: stitched of several bodies, none of them willing. */
  flesh_amalgam: {
    parts: [
      { kind: 'blob', scale: 1.05, params: { irr: 0.22, seed: 109 } },
      { kind: 'fleshFolds', params: { n: 4 } },
      { kind: 'stitchSeams', params: { n: 4 } },
      { kind: 'claws', params: { len: 0.55 } },
      { kind: 'eyeCluster', color: '#ffc8b0', params: { n: 6, spread: 0.8, dist: 0.5 } },
    ],
  },
  /** The membrane (anchored): a stretched wall of skin and vessel. */
  membrane: {
    parts: [
      { kind: 'blob', scale: 1.0, alpha: 0.9, params: { irr: 0.16, seed: 113 } },
      { kind: 'veinweb', params: { n: 6 } },
      { kind: 'fleshFolds', params: { n: 5 } },
      { kind: 'eyeCluster', color: '#ffd8c8', params: { n: 3, spread: 1.0, dist: 0.55 } },
    ],
    shadowScale: 0.7,
  },
  /** The corpse bloom (nest): a flower of meat, petals of rind. */
  corpse_bloom: {
    parts: [
      { kind: 'tentacleRing', scale: 0.9, params: { n: 7 } },
      { kind: 'blob', scale: 0.75, params: { irr: 0.2, seed: 127 } },
      { kind: 'mawRing', scale: 0.7 },
      { kind: 'orb', scale: 0.35, role: 'glow' },
    ],
    live: [{ kind: 'oozeLobes', scale: 0.8, params: { n: 5 } }],
    shadowScale: 0.7,
  },
  // --- The flesh country's face kin (Sanguine / Gutworks / Ocular) ----------
  /** The leech: a lean sac all mouth, fangs first, trailing what it took. */
  hemophage: {
    parts: [
      { kind: 'blob', alpha: 0.94, params: { irr: 0.3, seed: 131 } },
      { kind: 'veinweb', params: { n: 5 } },
      { kind: 'maw', x: 0.46, scale: 0.5, params: { arc: 0.6 } },
      { kind: 'fangs', x: 0.44, scale: 0.5 },
      { kind: 'eyes', color: '#ffd0c0', params: { n: 2, spread: 0.5, dist: 0.4, size: 0.09 } },
    ],
    live: [{ kind: 'slimeTrail', color: '#7a1622', params: { n: 4 } }],
  },
  /** The shambler: a walking clot — crusted, webbed, and wet at the seams. */
  clot_shambler: {
    parts: [
      { kind: 'blob', scale: 1.05, params: { irr: 0.26, seed: 137 } },
      { kind: 'fleshFolds', params: { n: 4 } },
      { kind: 'veinweb', params: { n: 6 } },
      { kind: 'stitchSeams', params: { n: 3 } },
      { kind: 'eyes', color: '#e88a92', params: { n: 1, spread: 0, dist: 0.3, size: 0.1 } },
    ],
    live: [{ kind: 'slimeTrail', color: '#4a0a12', params: { n: 5 } }],
  },
  /** The pale corpuscle: a blanched cell all fringe and purpose — its lash
   *  skirt is the lances it stabs with, its one red eye is the grudge. */
  pale_corpuscle: {
    parts: [
      { kind: 'blob', alpha: 0.96, params: { irr: 0.22, seed: 149 } },
      { kind: 'lashFringe', params: { n: 10, len: 0.42 } },
      { kind: 'veinweb', alpha: 0.35, params: { n: 3 } },
      { kind: 'eyes', color: '#c04050', params: { n: 1, spread: 0, dist: 0.35, size: 0.11 } },
    ],
    live: [{ kind: 'slimeTrail', color: '#e0ccd2', params: { n: 3 } }],
  },
  /** The tract worm: a soft sour head all rings and appetite (its body is
   *  the worm spec's segments — this is only the face it surfaces with). */
  tract_worm: {
    parts: [
      { kind: 'serpentHead', scale: 1.0 },
      { kind: 'segmentRings', params: { n: 4 } },
      { kind: 'mawRing', scale: 0.62 },
      { kind: 'haustraFolds', params: { n: 3 } },
    ],
  },
  /** The retcher: a gullet on legs, sacs at the jaw, always mid-swallow. */
  bile_retcher: {
    parts: [
      { kind: 'blob', params: { irr: 0.24, seed: 139 } },
      { kind: 'bloatSacs', scale: 0.95, params: { n: 4 } },
      { kind: 'haustraFolds', params: { n: 3 } },
      { kind: 'maw', x: 0.44, scale: 0.5, params: { arc: 0.7 } },
      { kind: 'eyes', color: '#d8e08a', params: { spread: 0.45, dist: 0.55, size: 0.08 } },
    ],
  },
  /** The warden: the door made flesh made angry — a fist of haustral folds
   *  wearing the sphincter as its face. */
  pyloric_warden: {
    parts: [
      { kind: 'blob', scale: 1.08, params: { irr: 0.2, seed: 149 } },
      { kind: 'haustraFolds', params: { n: 5 } },
      { kind: 'sphincterMaw', x: 0.4, scale: 0.6, params: { n: 11, gape: 0.12 } },
      { kind: 'armorPlates', alpha: 0.5, params: { n: 3 } },
      { kind: 'eyeCluster', color: '#ffc8b0', params: { n: 4, spread: 0.6, dist: 0.62 } },
    ],
  },
  /** The watcher: one great lidless eye fringed in lash, hung in slow air. */
  lidless_watcher: {
    parts: [
      { kind: 'blob', alpha: 0.9, params: { irr: 0.14, seed: 151 } },
      { kind: 'lashFringe', params: { n: 14, len: 0.36 } },
      { kind: 'irisEye', scale: 1.0, color: '#d8b04a' },
    ],
    live: [{ kind: 'wisps', alpha: 0.5, params: { n: 3 } }],
    shadowScale: 0.6,
  },
  /** The orb that grieves: a slit-pupiled eye forever welling over. */
  weeping_orb: {
    parts: [
      { kind: 'blob', alpha: 0.88, params: { irr: 0.1, seed: 157 } },
      { kind: 'irisEye', scale: 0.95, color: '#7ab0c0', params: { slit: true } },
      { kind: 'lashFringe', color: '#2a3438', params: { n: 8, len: 0.24 } },
    ],
    live: [{ kind: 'slimeTrail', color: '#9fc4cc', params: { n: 3 } }],
    shadowScale: 0.6,
  },
  /** The shepherd: a crook of meat crowned in stalks, its flock inside it. */
  stalk_shepherd: {
    parts: [
      { kind: 'blob', params: { irr: 0.22, seed: 163 } },
      { kind: 'fleshFolds', params: { n: 3 } },
      { kind: 'eyestalks', scale: 0.9, params: { n: 3 } },
      { kind: 'eyeCluster', color: '#ffd8c8', params: { n: 5, spread: 0.7, dist: 0.45 } },
      { kind: 'polyps', scale: 0.8, params: { n: 4 } },
    ],
  },

  // --- The Caulborn (black chitin over pale meat; the Giger key) -------------
  // Family read: HARD dark carapace + WET pale undersides + one dim violet
  // light somewhere it shouldn't be. Silhouettes stay distinct desaturated:
  // tick = skittering wedge, creeper = walking egg, lasher = rooted whorl,
  // maw = ringed orifice, weaver = crested priest, broodmother = segmented
  // clutch, heart = veined organ, pod = straining sac-cluster.
  /** The mite: a fingernail of chitin with too many legs. */
  caul_tick: {
    parts: [
      { kind: 'carapace', scale: 0.92, params: { seed: 401 } },
      { kind: 'legs', params: { n: 6, len: 0.55 } },
      { kind: 'mandibles', scale: 0.7 },
      { kind: 'eyes', color: '#9a72c8', params: { n: 2, spread: 0.3, dist: 0.55, size: 0.09 } },
    ],
  },
  /** The pod that walks: an egg that grew legs it shouldn't have. */
  amnion_creeper: {
    parts: [
      { kind: 'cocoon', scale: 1.0, params: { seed: 403 } },
      { kind: 'legs', params: { n: 6, len: 0.4 }, role: 'dark' },
      { kind: 'veinweb', params: { n: 3 } },
      { kind: 'eyes', color: '#9a72c8', params: { n: 1, spread: 0, dist: 0.34, size: 0.11 } },
    ],
    live: [{ kind: 'slimeTrail', color: '#3a2c48', params: { n: 3 } }],
  },
  /** The rooted whorl: barbed arms knotted around a knuckle of root. */
  caul_lasher: {
    parts: [
      { kind: 'blob', scale: 0.55, params: { irr: 0.28, seed: 405 }, role: 'dark' },
      { kind: 'tentacleRing', scale: 1.15, params: { n: 5 } },
      { kind: 'barbs', scale: 0.9 },
      { kind: 'eyeCluster', color: '#b48ae0', params: { n: 2, spread: 0.5, dist: 0.3 } },
    ],
    shadowScale: 0.8,
  },
  /** The reeling maw: a ringed orifice with a lure it doesn't need. */
  vor_maw: {
    parts: [
      { kind: 'blob', scale: 1.05, params: { irr: 0.2, seed: 407 } },
      { kind: 'tentacleRing', scale: 0.72, params: { n: 4 }, role: 'dark' },
      { kind: 'mawRing', scale: 0.95 },
      { kind: 'lure', scale: 0.7, role: 'glow' },
      { kind: 'eyeCluster', color: '#d8b0c8', params: { n: 4, spread: 0.85, dist: 0.55 } },
    ],
    shadowScale: 0.85,
  },
  /** The nerve-priest: a crested figure walking under a borrowed spine. */
  nerve_weaver: {
    parts: [
      { kind: 'torso', scale: 0.95 },
      { kind: 'carapace', scale: 0.72, params: { seed: 409 }, role: 'dark' },
      { kind: 'dorsalRidge', scale: 1.05 },
      { kind: 'eyestalks', scale: 0.8, color: '#9a72c8' },
      { kind: 'veinweb', params: { n: 3 } },
    ],
    live: [{ kind: 'wisps', scale: 0.7, role: 'glow', params: { n: 3 } }],
  },
  /** The walking clutch: a segmented abdomen straining with the next tier. */
  chrysalid_broodmother: {
    parts: [
      { kind: 'blob', scale: 1.1, params: { irr: 0.22, seed: 411 } },
      { kind: 'segmentRings', scale: 1.0, role: 'dark' },
      { kind: 'bloatSacs', scale: 0.95, params: { n: 6 } },
      { kind: 'legs', params: { n: 6, len: 0.5 }, role: 'dark' },
      { kind: 'mawRing', scale: 0.42 },
      { kind: 'eyeCluster', color: '#b48ae0', params: { n: 5, spread: 0.7, dist: 0.45 } },
    ],
    live: [{ kind: 'oozeLobes', scale: 0.85, params: { n: 4 } }],
    shadowScale: 0.9,
  },
  /** THE HEART: a veined organ the size of a door, mid-beat, mid-claim. */
  caul_heart: {
    parts: [
      { kind: 'blob', scale: 1.08, alpha: 0.96, params: { irr: 0.18, seed: 413 } },
      { kind: 'veinweb', params: { n: 8 } },
      { kind: 'fleshFolds', params: { n: 4 } },
      { kind: 'polyps', scale: 0.8, params: { n: 3 } },
      { kind: 'orb', scale: 0.42, role: 'glow' },
    ],
    live: [{ kind: 'wisps', scale: 0.6, role: 'glow', params: { n: 2 } }],
    shadowScale: 0.85,
  },
  /** The birthing pod: sacs straining around whatever comes next. */
  birthing_pod: {
    parts: [
      { kind: 'egg', scale: 1.05, params: { seed: 415 } },
      { kind: 'bloatSacs', scale: 1.0, params: { n: 5 } },
      { kind: 'veinweb', params: { n: 2 } },
      { kind: 'polyps', scale: 0.7, params: { n: 2 } },
    ],
    shadowScale: 0.75,
  },

  // --- The rookeries & new fauna ---------------------------------------------
  /** The bloodwing: a broad-winged raptor, all shoulder and beak. */
  bloodwing: {
    parts: [
      { kind: 'disc', scale: 0.7 },
      { kind: 'featherWings', scale: 1.3 },
      { kind: 'tailFeathers', scale: 0.8 },
      { kind: 'beak', scale: 0.9 },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.35, dist: 0.5, size: 0.08 } },
    ],
  },
  /** The nest: a woven bowl, eggs in the cup. */
  bloodwing_nest: {
    parts: [
      { kind: 'nestTwigs', params: { n: 18 } },
      { kind: 'egg', x: 0.12, y: 0.1, scale: 0.4 },
      { kind: 'egg', x: -0.14, y: -0.08, scale: 0.36 },
    ],
    shadowScale: 0.7,
  },
  /** A fat marsh toad — throat sac and dozing eyes. */
  marsh_toad: {
    parts: [
      { kind: 'blob', scale: 0.9, params: { irr: 0.16, seed: 131 } },
      { kind: 'spots', params: { n: 4 } },
      { kind: 'eyes', color: '#e8e0a8', params: { spread: 0.55, dist: 0.55, size: 0.11 } },
    ],
  },
  /** The bog heron: stilt legs, a spear of a beak, folded wings. */
  bog_heron: {
    parts: [
      { kind: 'legs', scale: 1.1, params: { n: 2 } },
      { kind: 'disc', scale: 0.6 },
      { kind: 'featherWings', scale: 0.8, alpha: 0.9 },
      { kind: 'beak', scale: 1.25 },
      { kind: 'crest', scale: 0.7 },
    ],
  },
  /** The bog dweller: a hunched sod-back — a moss lump with lantern eyes,
   *  marsh-light guttering off the hump as it slogs. */
  bog_dweller: {
    parts: [
      { kind: 'blob', scale: 1.0, params: { irr: 0.22, seed: 197 } },
      { kind: 'hump', scale: 0.7 },
      { kind: 'spots', params: { n: 5 } },
      { kind: 'eyes', color: '#c8e88a', params: { spread: 0.52, dist: 0.52, size: 0.12 } },
    ],
    live: [{ kind: 'wisps', x: 0.12, y: -0.15, scale: 0.55, params: { n: 2 } }],
  },
  /** The ruin chanter: a bowed cowl over ember eyes, a crown of cinders
   *  guttering above the gather. */
  ruin_chanter: {
    parts: [
      { kind: 'torso', scale: 0.9, role: 'base' },
      { kind: 'hump', scale: 0.55 },
      { kind: 'eyes', color: '#ffb45e', params: { spread: 0.4, dist: 0.42, size: 0.1 } },
      { kind: 'crest', scale: 0.8 },
    ],
    live: [{ kind: 'wisps', y: -0.3, scale: 0.6, params: { n: 2 } }],
  },
  /** The tide whelk: a soft foot under a tide-worn dome, horns out. */
  tide_whelk: {
    parts: [
      { kind: 'blob', scale: 0.85, params: { irr: 0.12, seed: 331 } },
      { kind: 'carapace', scale: 0.95 },
      { kind: 'antennae', scale: 0.7 },
      { kind: 'eyes', color: '#c8e8e0', params: { spread: 0.4, dist: 0.6, size: 0.09 } },
    ],
  },
  /** The magma swimmer: a basalt-skinned eel-head, ember-lit from inside. */
  magma_swimmer: {
    parts: [
      { kind: 'blob', scale: 0.9, params: { irr: 0.18, seed: 411 } },
      { kind: 'spots', params: { n: 4 } },
      { kind: 'eyes', color: '#ffd27a', params: { spread: 0.5, dist: 0.5, size: 0.11 } },
    ],
    live: [{ kind: 'wisps', scale: 0.5, params: { n: 2 } }],
  },
  /** The snow swimmer: a pale sleek head barely apart from the drift. */
  snow_swimmer: {
    parts: [
      { kind: 'blob', scale: 0.88, params: { irr: 0.14, seed: 421 } },
      { kind: 'spots', params: { n: 3 } },
      { kind: 'eyes', color: '#9ad4ff', params: { spread: 0.48, dist: 0.52, size: 0.1 } },
    ],
  },
  /** The magma lurker: a crusted dome barely proud of the melt — furnace
   *  eyes and heat-shimmer wisps rising off the slag back. */
  magma_lurker: {
    parts: [
      { kind: 'blob', scale: 1.0, params: { irr: 0.2, seed: 433 } },
      { kind: 'hump', scale: 0.65 },
      { kind: 'spots', params: { n: 4 } },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.5, dist: 0.5, size: 0.12 } },
    ],
    live: [{ kind: 'wisps', y: -0.2, scale: 0.6, params: { n: 2 } }],
  },
  /** The void angler: a darkness with a LURE — the dangling light is the
   *  only honest part of it, and it is bait. */
  void_angler: {
    parts: [
      { kind: 'blob', scale: 0.95, params: { irr: 0.24, seed: 443 } },
      { kind: 'antennae', scale: 0.9 },
      { kind: 'eyes', color: '#cfc0f0', params: { spread: 0.42, dist: 0.5, size: 0.09 } },
    ],
    live: [{ kind: 'wisps', x: 0.3, y: -0.3, scale: 0.7, params: { n: 2 } }],
  },
  /** A glow moth — soft wings around a lantern body. */
  glow_moth: {
    parts: [
      { kind: 'featherWings', scale: 1.0, alpha: 0.85 },
      { kind: 'disc', scale: 0.45, role: 'glow' },
      { kind: 'antennae', scale: 0.8 },
    ],
    live: [{ kind: 'wisps', x: -0.2, scale: 0.6, params: { n: 2 } }],
  },
  /** The taiga elk: antler crown, humped shoulder, long face. */
  taiga_elk: {
    parts: [
      { kind: 'torso', scale: 0.95, role: 'base' },
      { kind: 'hump', scale: 0.8 },
      { kind: 'antlers', scale: 1.15 },
      { kind: 'snout', scale: 1.0 },
      { kind: 'tail', params: { len: 0.4 } },
    ],
  },
  /** A shore crab: shell dome, stalked eyes, one big fiddler claw. */
  shore_crab: {
    parts: [
      { kind: 'carapace', scale: 0.9 },
      { kind: 'legs', scale: 0.9, params: { n: 6 } },
      { kind: 'pincers', scale: 1.0 },
      { kind: 'eyestalks', scale: 0.8 },
    ],
  },

  // --- THE APPARITIONS (ephemeral: halos, tatters, wisps — barely bodies) --
  /** A drifting lantern-mote: light pretending to be a creature. */
  will_o_wisp: {
    parts: [
      { kind: 'disc', scale: 0.4, role: 'glow' },
      { kind: 'halo', scale: 0.9, alpha: 0.7 },
    ],
    live: [{ kind: 'wisps', scale: 0.7, params: { n: 3 } }],
  },
  /** A gloomling: a scrap of dark with eyes, trailing off to nothing. */
  gloomling: {
    parts: [
      { kind: 'tatters', scale: 0.8, role: 'dark', params: { n: 4 } },
      { kind: 'disc', scale: 0.55, role: 'dark' },
      { kind: 'eyes', color: '#b8d8e8', params: { spread: 0.45, dist: 0.5, size: 0.11 } },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.7, params: { n: 2 } }],
  },
  /** The poltergeist: NO body at all — a knot of orbiting debris and two
   *  furious pinpricks. The absence is the silhouette. */
  poltergeist: {
    parts: [
      { kind: 'runes', scale: 0.9, params: { n: 3 } },
      { kind: 'eyes', color: '#d8e8ff', params: { spread: 0.3, dist: 0.35, size: 0.09 } },
    ],
    live: [
      { kind: 'crystalGrowths', role: 'dark', scale: 0.8, params: { n: 4 } },
      { kind: 'wisps', params: { n: 2 } },
    ],
  },
  /** The banshee: a hooded wail, cloak torn to streamers, keening halo. */
  banshee: {
    parts: [
      { kind: 'tatters', params: { n: 6 } },
      { kind: 'robe', scale: 0.85, alpha: 0.9 },
      { kind: 'hood', x: 0.28, params: { eyes: true } },
      { kind: 'halo', scale: 1.05, alpha: 0.5 },
    ],
    live: [{ kind: 'wisps', x: -0.4, params: { n: 4 } }],
  },
  /** The barrow-wight: the corporeal cousin — grave-cloth over old bone,
   *  a cold crown, a barrow blade. */
  barrow_wight: {
    parts: [
      { kind: 'tatters', params: { n: 4 } },
      { kind: 'ribs', params: { under: true } },
      { kind: 'sword', y: 0.05, params: { len: 0.9 } },
      { kind: 'skull', x: 0.42, params: { glow: 'glow' } },
      { kind: 'crown', x: 0.26, scale: 0.6, role: 'dark' },
    ],
    live: [{ kind: 'wisps', x: -0.35, scale: 0.8, params: { n: 2 } }],
  },

  // --- THE GLOAMWOOD (carrion, crones, lanterns, the rider) ----------------
  /** The carrion crow: a ragged wedge — all wings, beak, and appetite. */
  carrion_crow: {
    parts: [
      { kind: 'featherWings', scale: 1.15, role: 'dark' },
      { kind: 'disc', scale: 0.5, role: 'dark' },
      { kind: 'tailFeathers', x: -0.45, scale: 0.7, role: 'dark' },
      { kind: 'beak', x: 0.45, scale: 0.85 },
      { kind: 'eyes', color: '#d8b04a', params: { spread: 0.3, dist: 0.4, size: 0.1 } },
    ],
  },
  /** The grave hag: bent under a hood, tatters to the ground, a crook
   *  tipped with somebody. */
  grave_hag: {
    parts: [
      { kind: 'tatters', params: { n: 5 } },
      { kind: 'robe', scale: 0.9, role: 'dark' },
      { kind: 'staff', y: -0.08, params: { skullTip: true } },
      { kind: 'hood', x: 0.3, params: { eyes: true } },
    ],
    live: [{ kind: 'wisps', x: -0.35, scale: 0.6, params: { n: 2 } }],
  },
  /** The hollow lantern: a carved grin floating in its own candle-light —
   *  the mask IS the face; the flame never sits still. */
  hollow_lantern: {
    parts: [
      { kind: 'disc', scale: 0.75 },
      { kind: 'mask', scale: 0.62, role: 'glow' },
      { kind: 'halo', scale: 1.0, alpha: 0.55, role: 'glow' },
    ],
    live: [
      { kind: 'flames', scale: 0.5, role: 'glow' },
      { kind: 'wisps', scale: 0.6, params: { n: 2 } },
    ],
  },

  // --- THE GLOAMBORN (the dark's own — every part an existing painter) ------
  /** The snuffwick: a knot of dark motes with a violet fringe and two pale
   *  points that are watching your lamp. The will-o-wisp INVERTED — where
   *  that body is a glow with a halo, this is a dark with one. */
  snuffwick: {
    parts: [
      { kind: 'disc', scale: 0.62, role: 'dark' },
      { kind: 'halo', scale: 1.15, alpha: 0.5, color: '#8a7ab8' },
      { kind: 'eyes', scale: 0.8, role: 'glow', params: { n: 2 } },
    ],
    live: [{ kind: 'wisps', scale: 0.8, role: 'dark', params: { n: 3 } }],
  },
  /** The murk prowler: low, lean, all ears and claws — a hunting silhouette
   *  built to read at one glance even with your sight cut short. */
  murk_prowler: {
    parts: [
      { kind: 'torso', scale: 1.0, role: 'dark' },
      { kind: 'tatters', scale: 0.7, alpha: 0.8, role: 'dark' },
      { kind: 'tuftEars', scale: 1.1 },
      { kind: 'eyes', scale: 0.9, role: 'glow', params: { n: 2 } },
      { kind: 'claws', scale: 1.1, params: { len: 0.55, talons: 3 } },
      { kind: 'tail', params: { len: 0.75 } },
    ],
  },
  /** The wick keeper: a robed thief under a hood, holding a STOLEN light —
   *  the lantern burns cold violet-white, a shine that never warms. */
  wick_keeper: {
    parts: [
      { kind: 'robe', scale: 1.0, role: 'dark' },
      { kind: 'hood', x: 0.26, scale: 1.0, role: 'dark', params: { eyes: true } },
      { kind: 'lantern', x: 0.55, y: 0.4, scale: 0.9, color: '#b8a2e8' },
    ],
    live: [{ kind: 'wisps', scale: 0.5, params: { n: 2 }, color: '#b8a2e8' }],
  },
  /** The hollow shepherd: a tall shrouded pillar under a crook — and the
   *  lantern on the crook is DEAD, the one dark lamp in a world of lit ones.
   *  The unlit silhouette IS the tell. */
  hollow_shepherd: {
    parts: [
      { kind: 'robe', scale: 1.1, role: 'dark' },
      { kind: 'shroudWrap', scale: 1.05, alpha: 0.85 },
      { kind: 'hood', x: 0.3, scale: 1.15, role: 'dark' },
      { kind: 'staff', x: 0.5, y: 0.5, scale: 1.25 },
      { kind: 'lantern', x: 0.62, y: 0.52, scale: 0.85, color: '#241e30', alpha: 0.95 },
    ],
    shadowScale: 1.15,
  },
  /** The dusk rider: a headless drape at a gallop — cape streaming, scythe
   *  out. No head. That's the point. */
  dusk_rider: {
    parts: [
      { kind: 'cape', scale: 1.1, role: 'dark' },
      { kind: 'torso', scale: 0.8, role: 'dark' },
      { kind: 'pauldrons', scale: 0.9 },
      { kind: 'scythe', y: 0.08, params: { len: 1.0 } },
    ],
    live: [{ kind: 'wisps', x: -0.45, scale: 0.9, params: { n: 3 } }],
  },

  // --- THE NIGHT COURT (vampires, weres — and their wolves) ----------------
  /** A thrall: bled pale, collared cape, its master's fangs. */
  vampire_thrall: {
    parts: [
      { kind: 'cape', scale: 0.9 },
      { kind: 'disc', scale: 0.75, role: 'bone' },
      { kind: 'daggers', params: { len: 0.5 } },
      { kind: 'fangs', scale: 0.7 },
      { kind: 'eyes', color: '#ff4a5a', params: { spread: 0.35, dist: 0.55, size: 0.08 } },
    ],
  },
  /** The countess: high collar, court regalia, a red-eyed calm. */
  vampire_countess: {
    parts: [
      { kind: 'cape', scale: 1.0 },
      { kind: 'robe', scale: 0.85, role: 'dark' },
      { kind: 'crown', x: 0.3, scale: 0.6, role: 'accent' },
      { kind: 'fangs', scale: 0.75 },
      { kind: 'eyes', color: '#ff3a4a', params: { spread: 0.32, dist: 0.55, size: 0.09 } },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.8, params: { n: 3 } }],
  },
  /** The werewolf: a wolf stood wrong — mane, tearing claws, too many teeth. */
  werewolf: {
    parts: [
      { kind: 'torso', scale: 1.0 },
      { kind: 'mane', scale: 1.05 },
      { kind: 'snout', scale: 1.05 },
      { kind: 'fangs', scale: 0.9 },
      { kind: 'claws', scale: 1.1, params: { len: 0.55, talons: 3 } },
      { kind: 'tail', params: { len: 0.7, tuft: 1 } },
    ],
  },
  /** A crimson bat: the cave bat's fed cousin. */
  crimson_bat: {
    parts: [
      { kind: 'disc', scale: 0.6 },
      { kind: 'featherWings', scale: 1.2, alpha: 0.95 },
      { kind: 'ears', scale: 0.75 },
      { kind: 'fangs', scale: 0.65 },
      { kind: 'eyes', color: '#ff5a5a', params: { spread: 0.4, dist: 0.55, size: 0.1 } },
    ],
  },
  /** The feeding thrall: the Court's walking larder — a hunched pale sack
   *  in rags, iron collar, the snapped leash still trailing. Dull eyes;
   *  new fangs it hasn't grown into. */
  feeding_thrall: {
    parts: [
      { kind: 'blob', params: { irr: 0.24, seed: 9 } },
      { kind: 'tatters', x: -0.3, scale: 0.7, alpha: 0.8, params: { n: 4 } },
      { kind: 'collar', scale: 0.9, role: 'metal' },
      { kind: 'chains', x: -0.5, rot: 2.6, scale: 0.7, alpha: 0.85, params: { n: 1 } },
      { kind: 'fangs', scale: 0.5 },
      { kind: 'eyes', color: '#c8b8a8', params: { spread: 0.36, dist: 0.55, size: 0.07 } },
    ],
  },
  /** The night hunter: the Court's knife — a low dark shape in grave-silk
   *  sashes, twin edges out, a bone-pale mask where the face should be.
   *  Reads assassin at a glance: mask + sashes, nothing upright about it. */
  night_hunter: {
    parts: [
      { kind: 'veilSashes', scale: 1.05, role: 'dark' },
      { kind: 'torso', scale: 0.78, role: 'dark' },
      { kind: 'daggers', params: { len: 0.75 } },
      { kind: 'mask', x: 0.3, scale: 0.55, role: 'bone' },
      { kind: 'eyes', color: '#ff3a4a', params: { spread: 0.26, dist: 0.5, size: 0.07 } },
    ],
    live: [{ kind: 'wisps', x: -0.4, scale: 0.6, params: { n: 2 } }],
  },
  /** The blood cardinal: the Court's church — vestments the colour of the
   *  work, a censer that smokes red, the tall pale crown-mitre. The censer
   *  IS the tell: no other body in the wood swings one. */
  blood_cardinal: {
    parts: [
      { kind: 'tatters', scale: 0.9, role: 'dark', params: { n: 4 } },
      { kind: 'robe', scale: 0.95 },
      { kind: 'drape', scale: 0.9, role: 'dark' },
      { kind: 'censer', y: 0.55, scale: 0.85, role: 'metal' },
      { kind: 'crown', x: 0.3, scale: 0.62, role: 'accent' },
      { kind: 'fangs', scale: 0.6 },
      { kind: 'eyes', color: '#ff2a3a', params: { spread: 0.3, dist: 0.52, size: 0.08 } },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.7, params: { n: 2 } }],
  },
  /** THE GLOOM COACH: a windowless black box on tall spoked wheels —
   *  curtained, lacquered, twin lamps burning a cold blue — and nothing at
   *  all in the traces (the wisps out front are what draws it). The wheels
   *  are the one new limb; the rest is the kit re-hung. */
  gloom_coach: {
    shadowScale: 1.3,
    parts: [
      { kind: 'wheels', scale: 1.06, role: 'dark', params: { spokes: 5, span: 1.6 } },
      { kind: 'chest', scale: 1.18, role: 'dark', params: { straps: 2 } },
      { kind: 'drape', x: -0.1, scale: 0.95, role: 'dark' },
      { kind: 'lantern', x: 0.5, y: -0.66, scale: 0.72, color: '#9ad0e8' },
      { kind: 'lantern', x: 0.5, y: 0.66, scale: 0.72, color: '#9ad0e8' },
      { kind: 'skull', x: 0.6, scale: 0.48, params: { glow: 'glow' } },
    ],
    live: [{ kind: 'wisps', x: 0.95, scale: 0.9, params: { n: 3 } }],
  },
  /** The pallbearer: the Court's daylight — hooded, harnessed, a full
   *  coffin roped across the back, the maul carried like a verdict. */
  pallbearer: {
    parts: [
      { kind: 'pack', x: -0.5, scale: 1.15, role: 'wood' },
      { kind: 'torso', scale: 0.95, role: 'dark' },
      { kind: 'harness', scale: 0.95, role: 'metal' },
      { kind: 'mace', y: 0.05 },
      { kind: 'hood', x: 0.28, scale: 0.95, params: { eyes: true } },
      { kind: 'chains', x: -0.35, rot: 1.2, scale: 0.8, alpha: 0.7, params: { n: 2 } },
    ],
  },
  /** The dire wolf: the pack's anvil — heavy ruff, scarred hide. */
  dire_wolf: {
    parts: [
      { kind: 'torso', scale: 0.95 },
      { kind: 'furRuff', scale: 1.05 },
      { kind: 'snout', scale: 1.0 },
      { kind: 'fangs', scale: 0.8 },
      { kind: 'tail', params: { len: 0.8, tuft: 1 } },
    ],
  },
  /** The den matron: the she-wolf the whelps answer to — heavy teated
   *  torso, storm-grey mane, a torn ear. Her swig waters the pack
   *  (MonsterDef.sympathy) — she reads MATERNAL, not merely big. */
  den_matron: {
    parts: [
      { kind: 'torso', scale: 1.0 },
      { kind: 'furRuff', scale: 1.12 },
      { kind: 'mane', scale: 0.9, role: 'dark' },
      { kind: 'snout', scale: 1.0 },
      { kind: 'fangs', scale: 0.7 },
      { kind: 'tuftEars', scale: 0.9, params: { torn: 1 } },
      { kind: 'spots', scale: 0.8, alpha: 0.35, role: 'dark' },
      { kind: 'tail', params: { len: 0.85, tuft: 1 } },
    ],
  },
  /** Her whelp: all ears and paws, ruff still growing in. */
  den_whelp: {
    parts: [
      { kind: 'torso', scale: 0.85 },
      { kind: 'furRuff', scale: 0.8, alpha: 0.8 },
      { kind: 'snout', scale: 0.85 },
      { kind: 'tuftEars', scale: 1.25 },
      { kind: 'tail', params: { len: 0.7, tuft: 1 } },
    ],
  },
  /** The moon howler: the pack's voice — thrown-back head, pale blaze. */
  moon_howler: {
    parts: [
      { kind: 'torso', scale: 0.9 },
      { kind: 'furRuff', scale: 1.0, role: 'bone' },
      { kind: 'snout', scale: 1.1, rot: -0.35 },
      { kind: 'tail', params: { len: 0.85, tuft: 1 } },
      { kind: 'eyes', color: '#c8e8ff', params: { spread: 0.3, dist: 0.5, size: 0.08 } },
    ],
  },

  // --- THE VERMIN (insectoids: chitin, mandibles, repetition) --------------
  /** A giant maggot: banded, blind, wet. */
  giant_maggot: {
    parts: [
      { kind: 'blob', scale: 0.95, role: 'bone', params: { irr: 0.14, seed: 137 } },
      { kind: 'segmentRings', params: { n: 5 } },
      { kind: 'mandibles', scale: 0.6 },
    ],
    live: [{ kind: 'slimeTrail', color: '#8a8468', params: { n: 3 } }],
  },
  /** The maggot queen: a mountain of banded meat behind a crown of feelers. */
  maggot_queen: {
    parts: [
      { kind: 'blob', scale: 1.05, role: 'bone', params: { irr: 0.18, seed: 139 } },
      { kind: 'segmentRings', params: { n: 7 } },
      { kind: 'bloatSacs', x: -0.25, scale: 0.8, params: { n: 4 } },
      { kind: 'mandibles', scale: 0.85 },
      { kind: 'antennae', scale: 0.9 },
    ],
    live: [{ kind: 'slimeTrail', color: '#8a8468', params: { n: 5 } }],
  },
  /** A formic worker: carapace, feelers, always carrying something. */
  formic_worker: {
    parts: [
      { kind: 'carapace', scale: 0.85 },
      { kind: 'legs', scale: 0.85, params: { n: 6 } },
      { kind: 'antennae', scale: 0.9 },
      { kind: 'mandibles', scale: 0.6 },
    ],
  },
  /** A formic soldier: the same body forged bigger — shear-jaws, plated. */
  formic_soldier: {
    parts: [
      { kind: 'carapace', scale: 0.95 },
      { kind: 'armorPlates', scale: 0.7 },
      { kind: 'legs', scale: 0.9, params: { n: 6 } },
      { kind: 'antennae', scale: 0.85 },
      { kind: 'mandibles', scale: 1.0 },
    ],
  },
  /** The emerald mantis: raptor arms held in prayer over a leaf-blade body. */
  emerald_mantis: {
    parts: [
      { kind: 'disc', scale: 0.7 },
      { kind: 'raptorArms', params: { len: 1.0, fold: 0.6 } },
      { kind: 'antennae', scale: 1.0 },
      { kind: 'eyes', color: '#d8ffb0', params: { spread: 0.55, dist: 0.6, size: 0.1 } },
    ],
  },
  /** The bronzeback scarab: a rolling shield with a horn. */
  bronze_scarab: {
    parts: [
      { kind: 'shell', scale: 0.95, role: 'metal' },
      { kind: 'legs', scale: 0.8, params: { n: 6 } },
      { kind: 'rhinoHorn', scale: 0.9 },
      { kind: 'mandibles', scale: 0.55 },
    ],
  },
  /** The bombardier: a swollen chamber behind a small, busy front. */
  bombardier_beetle: {
    parts: [
      { kind: 'carapace', scale: 0.9 },
      { kind: 'bloatSacs', x: -0.3, scale: 0.7, params: { n: 3 } },
      { kind: 'legs', scale: 0.85, params: { n: 6 } },
      { kind: 'antennae', scale: 0.8 },
    ],
  },
  /** The orb-weaver: long-limbed, patient, silk at the ready. */
  orb_weaver: {
    parts: [
      { kind: 'legs', scale: 1.2, params: { n: 8 } },
      { kind: 'disc', scale: 0.65 },
      { kind: 'spots', params: { n: 3 } },
      { kind: 'eyeCluster', color: '#d8d8b0', params: { n: 4, spread: 0.4, dist: 0.5 } },
    ],
  },
  /** The widow matron: the egg-layer — swollen abdomen, warning mark. */
  widow_matron: {
    parts: [
      { kind: 'legs', scale: 1.15, params: { n: 8 } },
      { kind: 'blob', scale: 0.85, role: 'dark', params: { irr: 0.12, seed: 149 } },
      { kind: 'brand', scale: 0.5, color: '#e04848' },
      { kind: 'eyeCluster', color: '#ffb0b0', params: { n: 6, spread: 0.45, dist: 0.5 } },
    ],
  },
  /** The brood egg (a pod construct's portrait): a sac in a silk cradle. */
  brood_egg: {
    parts: [
      { kind: 'nestTwigs', scale: 0.8, params: { n: 10 } },
      { kind: 'egg', scale: 0.7 },
    ],
    shadowScale: 0.6,
  },
  /** The grub clutch (pod portrait): pale eggs half-buried. */
  grub_egg: {
    parts: [
      { kind: 'egg', x: 0.15, y: 0.12, scale: 0.55 },
      { kind: 'egg', x: -0.18, y: -0.05, scale: 0.48 },
      { kind: 'egg', x: 0.02, y: -0.2, scale: 0.4 },
    ],
    shadowScale: 0.6,
  },

  // --- THE CHITIN (the Seethe: the deep desert's hive kin) ------------------
  /** A chitin drone: the seethe's coin — carapace, feelers, nothing wasted. */
  chitin_drone: {
    parts: [
      { kind: 'carapace', scale: 0.8 },
      { kind: 'legs', scale: 0.75, params: { n: 6 } },
      { kind: 'antennae', scale: 0.8 },
      { kind: 'mandibles', scale: 0.7 },
    ],
  },
  /** A chitin lancer: wings over a needle — the sting arrives first. */
  chitin_lancer: {
    parts: [
      { kind: 'disc', scale: 0.6 },
      { kind: 'wings', scale: 0.95, alpha: 0.85 },
      { kind: 'legs', scale: 0.6, params: { n: 6 } },
      { kind: 'stinger', scale: 1.1 },
      { kind: 'eyes', color: '#ffd890', params: { spread: 0.5, dist: 0.55, size: 0.11 } },
    ],
  },
  /** A chitin spitter: a swollen retort walking on too-thin legs. */
  chitin_spitter: {
    parts: [
      { kind: 'carapace', scale: 0.85 },
      { kind: 'bloatSacs', x: -0.32, scale: 0.75, params: { n: 3 } },
      { kind: 'legs', scale: 0.8, params: { n: 6 } },
      { kind: 'mandibles', scale: 0.5 },
    ],
  },
  /** A chitin burrower: shear-jaws behind a wedge of plate — the sand's own door. */
  chitin_burrower: {
    parts: [
      { kind: 'shell', scale: 1.0 },
      { kind: 'armorPlates', scale: 0.8 },
      { kind: 'legs', scale: 0.9, params: { n: 6 } },
      { kind: 'mandibles', scale: 1.25 },
    ],
  },
  /** A brood tender: an egg-swollen matron fussing her clutches forward. */
  chitin_broodtender: {
    parts: [
      { kind: 'blob', scale: 0.9, params: { irr: 0.14, seed: 157 } },
      { kind: 'egg', x: -0.28, y: 0.18, scale: 0.4 },
      { kind: 'egg', x: -0.34, y: -0.12, scale: 0.34 },
      { kind: 'legs', scale: 0.85, params: { n: 6 } },
      { kind: 'antennae', scale: 0.9 },
      { kind: 'eyeCluster', color: '#ffd8a0', params: { n: 4, spread: 0.4, dist: 0.5 } },
    ],
  },
  /** The Brood Sovereign (worm head): a crowned queen the sand carries. */
  brood_sovereign: {
    parts: [
      { kind: 'shell', scale: 1.05 },
      { kind: 'armorPlates', scale: 0.9 },
      { kind: 'mandibles', scale: 1.35 },
      { kind: 'antennae', scale: 1.1 },
      { kind: 'eyeCluster', color: '#ffb060', params: { n: 6, spread: 0.5, dist: 0.55 } },
    ],
  },
  /** A chitin clutch (pod portrait): resin-set eggs, wax-sealed. */
  chitin_clutch: {
    parts: [
      { kind: 'egg', x: 0.14, y: 0.1, scale: 0.55 },
      { kind: 'egg', x: -0.16, y: -0.06, scale: 0.46 },
      { kind: 'egg', x: 0.0, y: -0.2, scale: 0.4 },
      { kind: 'spots', params: { n: 3 } },
    ],
    shadowScale: 0.6,
  },
  /** A hive node (the spawner object): a breathing mound, egg-lit at the seams. */
  hive_node: {
    parts: [
      { kind: 'blob', scale: 1.0, params: { irr: 0.18, seed: 163 } },
      { kind: 'armorPlates', scale: 0.7 },
      { kind: 'egg', x: 0.2, y: 0.16, scale: 0.4 },
      { kind: 'egg', x: -0.24, y: -0.1, scale: 0.36 },
    ],
    shadowScale: 0.8,
  },
  // THE SWARMING WING — the flying castes. Silhouette doctrine: the ground
  // Seethe is SHELL AND LEGS; the wing is WINGS FIRST, one glance and you know.
  /** A chitin wingling: all wing, barely any bug — the swarm's coin in the air. */
  chitin_wingling: {
    parts: [
      { kind: 'disc', scale: 0.45 },
      { kind: 'wings', scale: 1.3, alpha: 0.8 },
      { kind: 'legs', scale: 0.4, params: { n: 4 } },
      { kind: 'eyes', color: '#ffd890', params: { spread: 0.45, dist: 0.5, size: 0.14 } },
    ],
  },
  /** A winged alate: the hive's tomorrow on DOUBLE wings — egg-heavy, escorted. */
  chitin_alate: {
    parts: [
      { kind: 'blob', scale: 0.85, params: { irr: 0.12, seed: 171 } },
      { kind: 'wings', scale: 1.35, alpha: 0.75 },
      { kind: 'wings', scale: 0.85, rot: 0.55, alpha: 0.55 },
      { kind: 'egg', x: -0.3, y: 0.12, scale: 0.36 },
      { kind: 'antennae', scale: 1.0 },
      { kind: 'eyeCluster', color: '#ffb060', params: { n: 4, spread: 0.45, dist: 0.5 } },
    ],
  },
  /** A jelly replete: a living larder — the swollen amber abdomen IS the tell. */
  chitin_replete: {
    parts: [
      { kind: 'disc', scale: 0.5 },
      { kind: 'bloatSacs', x: -0.3, scale: 0.95, params: { n: 2 } },
      { kind: 'wings', scale: 0.85, alpha: 0.7 },
      { kind: 'legs', scale: 0.5, params: { n: 4 } },
    ],
  },
  /** A royal jelly cache (pod portrait): a fallen replete's amber trove —
   *  the same swollen-sac silhouette the player learned in the air, grounded
   *  and wingless: bulb on the ground = the wake paid here. */
  royal_cache: {
    parts: [
      { kind: 'blob', scale: 0.85, params: { irr: 0.1, seed: 177 } },
      { kind: 'bloatSacs', scale: 0.8, params: { n: 3 } },
      { kind: 'egg', x: 0.16, y: -0.14, scale: 0.35 },
    ],
    shadowScale: 0.7,
  },
  // THE MURMURATION — the resident flock. Same wings-first doctrine as the
  // Swarming castes, pushed one step further: these are TRUE fliers (lifted
  // and bobbing off small shadows), so the silhouettes are wings ONLY with
  // the body an afterthought — and each caste keeps ONE unmistakable tell:
  // the skimmer's long abdomen, the saltant's folded jump-femurs, the
  // singer's comb crest. Zero new painters; composition does the work.
  /** A chitin skimmer: a gull-sized locust — swept wings and a trailing
   *  abdomen, built to be a dot in a boiling shape until it isn't. */
  chitin_skimmer: {
    parts: [
      { kind: 'tail', x: -0.25, scale: 0.75 },
      { kind: 'disc', scale: 0.38 },
      { kind: 'wings', scale: 1.45, alpha: 0.75 },
      { kind: 'antennae', scale: 0.6 },
      { kind: 'eyes', color: '#ffd890', params: { spread: 0.4, dist: 0.52, size: 0.15 } },
    ],
    shadowScale: 0.35,
  },
  /** A chitin saltant: the wing's heavy — a slab of carapace slung between
   *  wings, saltatorial femurs folded like drawn crossbows (the raptor-arm
   *  read: when you can see the legs cock, the crater is coming). */
  chitin_saltant: {
    parts: [
      { kind: 'wings', scale: 1.25, alpha: 0.7 },
      { kind: 'carapace', scale: 0.85 },
      { kind: 'raptorArms', scale: 0.9 },
      { kind: 'mandibles', scale: 0.55 },
    ],
    shadowScale: 0.45,
  },
  /** A chitin stridulant: the singer — palest of the wing, crowned in a
   *  wing-comb crest, the song shimmering off it. Kill the crest-bearer
   *  and the murmuration loses its spine. */
  chitin_stridulant: {
    parts: [
      { kind: 'wings', scale: 1.3, alpha: 0.75 },
      { kind: 'blob', scale: 0.52, params: { irr: 0.1, seed: 313 } },
      { kind: 'crest', scale: 0.95, role: 'accent', params: { n: 5 } },
      { kind: 'antennae', scale: 1.1 },
      { kind: 'eyes', color: '#ffe0a0', params: { spread: 0.42, dist: 0.5, size: 0.14 } },
    ],
    live: [{ kind: 'wisps', scale: 0.7, alpha: 0.5 }],
    shadowScale: 0.4,
  },

  // --- THE SMALL LIVES (ambience: prey with personality) -------------------
  /** A squirrel: all tail. */
  squirrel: {
    parts: [
      { kind: 'disc', scale: 0.5 },
      { kind: 'tail', rot: -0.6, scale: 1.2, params: { len: 1.0, tuft: 1 } },
      { kind: 'tuftEars', scale: 0.7 },
      { kind: 'eyes', color: '#2a2018', params: { spread: 0.4, dist: 0.5, size: 0.1 } },
    ],
  },
  /** A sand scorpion: pincers forward, sting held high. */
  sand_scorpion: {
    parts: [
      { kind: 'carapace', scale: 0.7 },
      { kind: 'legs', scale: 0.75, params: { n: 6 } },
      { kind: 'pincers', scale: 0.9 },
      { kind: 'stinger', scale: 0.9 },
    ],
  },
  /** One ant of the marching line (the trailing file is the worm body). */
  ant_trail: {
    parts: [
      { kind: 'carapace', scale: 0.75 },
      { kind: 'legs', scale: 0.7, params: { n: 6 } },
      { kind: 'antennae', scale: 0.8 },
    ],
  },
  /** A reed frog: a dollop with eyes, one hop from the water. */
  reed_frog: {
    parts: [
      { kind: 'blob', scale: 0.85, params: { irr: 0.12, seed: 151 } },
      { kind: 'spots', params: { n: 3 } },
      { kind: 'legs', scale: 0.7, params: { n: 2 } },
      { kind: 'eyes', color: '#f0e8a0', params: { spread: 0.6, dist: 0.5, size: 0.13 } },
    ],
  },

  // --- THE GROUND ITSELF (terrain-bound predators + the turret tier) -------
  /** The lake horror: a crown of reaching arms around a drowned maw. */
  lake_horror: {
    parts: [
      { kind: 'tentacleRing', scale: 1.05, params: { n: 7 } },
      { kind: 'blob', scale: 0.85, alpha: 0.94, params: { irr: 0.2, seed: 157 } },
      { kind: 'fins', scale: 0.9 },
      { kind: 'mawRing', scale: 0.65 },
      { kind: 'eyeCluster', color: '#b0e8d8', params: { n: 5, spread: 0.6, dist: 0.5 } },
    ],
    live: [{ kind: 'oozeLobes', scale: 0.9, params: { n: 5 } }],
  },
  /** The root wraith: only roots — then eyes among the bark. */
  root_wraith: {
    parts: [
      { kind: 'roots', scale: 1.1, params: { n: 7 } },
      { kind: 'blob', scale: 0.7, role: 'wood', params: { irr: 0.3, seed: 163 } },
      { kind: 'barkPlates', scale: 0.75, params: { n: 4 } },
      { kind: 'branchArms', scale: 0.7, mirror: true, params: { forks: 3, len: 0.9 } },
      { kind: 'eyeCluster', color: '#c8e86a', params: { n: 3, spread: 0.5, dist: 0.45 } },
    ],
  },
  /** The mire maw: a sag of bog with a ring of teeth at the middle. */
  mire_maw: {
    parts: [
      { kind: 'blob', scale: 1.0, role: 'dark', params: { irr: 0.26, seed: 167 } },
      { kind: 'fleshFolds', params: { n: 3 } },
      { kind: 'mawRing', scale: 0.8 },
      { kind: 'eyeCluster', color: '#c8b868', params: { n: 4, spread: 0.8, dist: 0.55 } },
    ],
    live: [{ kind: 'slimeTrail', color: '#4a4230', params: { n: 3 } }],
    shadowScale: 0.7,
  },
  /** The shard spire: a standing crown of charged crystal over a core. */
  shard_spire: {
    parts: [
      { kind: 'stalactites', scale: 1.05, params: { n: 6 } },
      { kind: 'disc', scale: 0.55 },
      { kind: 'orb', scale: 0.45, role: 'glow' },
      { kind: 'runes', scale: 0.9, params: { n: 4 } },
    ],
    live: [{ kind: 'crystalGrowths', role: 'accent', scale: 0.85, params: { n: 4 } }],
    shadowScale: 0.7,
  },

  // ---------------------------------------------- ATTUNEMENT FIXTURES
  // The struck-crystal world objects (engine/tuning.ts + engine/puzzles.ts):
  // bodies that read as GROWN geology, not creatures. The TONE is worn LIVE
  // (Actor.tone → the renderer's pooled glow + the worn status ring), so
  // these bakes stay tone-free on purpose — one sprite serves every element.
  /** A freestanding resonant crystal: a shard rosette around a bright core. */
  resonant_crystal: {
    parts: [
      { kind: 'crystalGrowths', scale: 1.1, params: { n: 6 } },
      { kind: 'disc', scale: 0.5 },
      { kind: 'orb', scale: 0.42, role: 'glow' },
    ],
    live: [{ kind: 'wisps', role: 'glow', alpha: 0.5, params: { n: 2 } }],
    shadowScale: 0.7,
  },
  /** The chord's heart: a crowned monolith — visibly the SENIOR stone. */
  heart_crystal: {
    parts: [
      { kind: 'stalactites', scale: 1.1, params: { n: 7 } },
      { kind: 'disc', scale: 0.6 },
      { kind: 'orb', scale: 0.5, role: 'glow' },
      { kind: 'runes', scale: 0.95, params: { n: 5 } },
      { kind: 'halo', scale: 1.08, alpha: 0.5 },
    ],
    live: [{ kind: 'crystalGrowths', role: 'accent', scale: 0.9, params: { n: 5 } }],
    shadowScale: 0.75,
  },
  /** A chime crystal: a slender shard cluster that sings — small, bright. */
  chime_crystal: {
    parts: [
      { kind: 'crystalGrowths', scale: 0.95, params: { n: 3 } },
      { kind: 'orb', scale: 0.4, role: 'glow' },
      { kind: 'runes', scale: 0.8, params: { n: 3 } },
    ],
    shadowScale: 0.6,
  },
  /** A lattice cell: a squat faceted stud — the board's tile, not a jewel. */
  lattice_crystal: {
    parts: [
      { kind: 'disc', scale: 0.85 },
      { kind: 'crystalGrowths', scale: 0.8, params: { n: 4 } },
      { kind: 'gem', scale: 0.5, role: 'glow' },
    ],
    shadowScale: 0.6,
  },

  // ------------------------------------------------- THE CRYSTALKIN
  // Four jobs, four silhouettes, zero new part painters: the STALKER is low
  // glass with fin-blades (fast + edged reads instantly); the HAUNT is a
  // robed drift under a halo (the buffer — soft, lit, unhurried); the
  // SHELLBACK is a shard-armored dome with its soft core SHOWING at the
  // brow (the ES pole teaches its own weak point); the SIREN is torn glass
  // with orbiting fragments (wrongness you can see across the court).
  /** Low glass predator: edged fins over a plated back, blades forward. */
  facet_stalker: {
    parts: [
      { kind: 'carapace', scale: 0.95 },
      { kind: 'glassFins', role: 'accent', scale: 0.95, params: { n: 3 } },
      { kind: 'claws', x: 0.55, scale: 0.8 },
      { kind: 'eyes', color: '#e8f4ff', params: { spread: 0.3, dist: 0.42, size: 0.09 } },
    ],
    shadowScale: 0.9,
  },
  /** The chime that doesn't take sides: a hooded drift under its own bell-halo. */
  chime_haunt: {
    parts: [
      { kind: 'robe', scale: 0.9, alpha: 0.92 },
      { kind: 'hood', x: 0.24, params: { eyes: true } },
      { kind: 'runes', scale: 0.95, params: { n: 4 } },
      { kind: 'halo', scale: 1.1, alpha: 0.6 },
    ],
    live: [{ kind: 'wisps', role: 'glow', alpha: 0.55, params: { n: 3 } }],
    shadowScale: 0.55,
  },
  /** The walking geode: shard-crowned dome, the soft core glowing at the brow. */
  geode_shellback: {
    parts: [
      { kind: 'carapace', scale: 1.05 },
      { kind: 'crystalGrowths', role: 'accent', scale: 1.0, params: { n: 5 } },
      { kind: 'scutes', scale: 0.9 },
      { kind: 'gem', x: 0.5, scale: 0.4, role: 'glow' },
      { kind: 'eyes', color: '#cfe8ff', params: { spread: 0.26, dist: 0.55, size: 0.07 } },
    ],
    shadowScale: 1.0,
  },
  /** The wrong note: torn glass, a keening mouth, fragments orbiting out of key. */
  discord_siren: {
    parts: [
      { kind: 'tatters', params: { n: 5 } },
      { kind: 'glassFins', role: 'dark', scale: 0.9, params: { n: 4 } },
      { kind: 'maw', x: 0.3, scale: 0.6 },
      { kind: 'eyes', color: '#e8c8ff', params: { spread: 0.34, dist: 0.4, size: 0.08 } },
    ],
    live: [{ kind: 'floatingShards', role: 'accent', scale: 0.9, params: { n: 4 } }],
    shadowScale: 0.7,
  },
  /** The spire of eyes: a stalk of meat that is mostly retina. */
  spire_of_eyes: {
    parts: [
      { kind: 'blob', scale: 0.9, params: { irr: 0.2, seed: 173 } },
      { kind: 'veinweb', params: { n: 5 } },
      { kind: 'fleshFolds', params: { n: 3 } },
      { kind: 'eyeCluster', color: '#ffd8c8', params: { n: 9, spread: 1.0, dist: 0.55 } },
      { kind: 'eyes', color: '#ff6a5a', params: { n: 1, spread: 0, dist: 0.15, size: 0.16 } },
    ],
    shadowScale: 0.7,
  },
  /** THE GRIEF-ANCHOR (the Haunting's standing knot of sorrow). */
  grief_anchor: {
    parts: [
      { kind: 'tatters', scale: 0.9, params: { n: 5 } },
      { kind: 'disc', scale: 0.6, role: 'dark' },
      { kind: 'orb', scale: 0.5, role: 'glow' },
      { kind: 'halo', scale: 1.1, alpha: 0.6 },
      { kind: 'runes', params: { n: 5 } },
    ],
    live: [{ kind: 'wisps', params: { n: 4 } }],
    shadowScale: 0.7,
  },
  /** THE WAILING ONE (grief, given a body): a crowned hooded wail trailing
   *  to streamers, ringed in restless light. */
  wailing_one: {
    parts: [
      { kind: 'tatters', scale: 1.05, params: { n: 7 } },
      { kind: 'robe', scale: 0.9, alpha: 0.9 },
      { kind: 'hood', x: 0.28, scale: 1.05, params: { eyes: true } },
      { kind: 'crown', x: 0.2, scale: 0.6, role: 'dark' },
      { kind: 'halo', scale: 1.15, alpha: 0.55 },
    ],
    live: [{ kind: 'wisps', x: -0.35, params: { n: 5 } }],
  },
  // --- THE COMPOSABLE ROUND (shells, wyrms, snares) -------------------------
  /** The molting behemoth: a mountain of plated chitin, always mid-molt. */
  molting_behemoth: {
    parts: [
      { kind: 'shell', scale: 1.05, role: 'bone' },
      { kind: 'armorPlates', scale: 0.9 },
      { kind: 'scutes', scale: 0.85 },
      { kind: 'mandibles', scale: 0.9 },
      { kind: 'legs', scale: 0.9, params: { n: 6 } },
    ],
  },
  /** The bulwark scuttler: a shield grown down the BACK — read the shell. */
  bulwark_scuttler: {
    parts: [
      { kind: 'disc', scale: 0.8 },
      { kind: 'shell', x: -0.28, scale: 0.85, role: 'metal' },
      { kind: 'legs', scale: 0.85, params: { n: 6 } },
      { kind: 'mandibles', scale: 0.65 },
      { kind: 'eyes', color: '#d8e8a0', params: { spread: 0.4, dist: 0.6, size: 0.08 } },
    ],
  },
  /** The sand wyrm: a ringed head of plates and jaws (the file follows). */
  sand_wyrm: {
    parts: [
      { kind: 'blob', scale: 0.95, params: { irr: 0.14, seed: 179 } },
      { kind: 'segmentRings', params: { n: 4 } },
      { kind: 'mawRing', scale: 0.7 },
      { kind: 'mandibles', scale: 0.9 },
    ],
  },
  // ——— THE WYRM SEGMENT KIT (SEGMENT FABRIC / WormLookSpec) — worn PER
  // SEGMENT by great segmented bodies (the Sunder-Wyrm's spine debuts them,
  // any chain may adopt them): plate / sail / tail, each drawn +X =
  // spine-forward — the fabric rotates every segment along its own trail,
  // so the chain reads as ONE armored animal, never a run of blobs. ———
  /** The SPINE PLATE — the ordinary body segment: ringed hide under an
   *  imbricated keel of scutes. */
  wyrm_plate: {
    parts: [
      { kind: 'blob', scale: 0.95, params: { irr: 0.1, seed: 233 } },
      { kind: 'segmentRings', params: { n: 3 } },
      { kind: 'scutes', scale: 0.92, role: 'metal' },
    ],
  },
  /** The SAIL segment (the every-nth accent): the plate under a raised
   *  dorsal sail — the silhouette beat that says ONE long animal at a
   *  glance, and the wound you can pick out mid-fight. */
  wyrm_sail: {
    parts: [
      { kind: 'blob', scale: 0.95, params: { irr: 0.1, seed: 233 } },
      { kind: 'segmentRings', params: { n: 3 } },
      { kind: 'sailfin', scale: 1.02, params: { spines: 6 } },
    ],
  },
  /** The TAIL segment: ringed hide lashing out into a spaded tip. */
  wyrm_tail_spade: {
    parts: [
      { kind: 'blob', scale: 0.9, params: { irr: 0.12, seed: 233 } },
      { kind: 'segmentRings', params: { n: 2 } },
      { kind: 'tailSpade', scale: 1.1, role: 'metal' },
    ],
  },
  /** The mire burrower: the wet cousin — slicker, softer, fewer teeth. */
  mire_burrower: {
    parts: [
      { kind: 'blob', scale: 0.9, params: { irr: 0.2, seed: 181 } },
      { kind: 'segmentRings', params: { n: 4 } },
      { kind: 'maw', x: 0.4, scale: 0.45, params: { arc: 0.5 } },
      { kind: 'eyes', color: '#c8c890', params: { spread: 0.4, dist: 0.6, size: 0.07 } },
    ],
    live: [{ kind: 'slimeTrail', color: '#5a4e38', params: { n: 3 } }],
  },
  /** The gnoll trapper: the pack's quiet one — bow, satchel, iron jaws. */
  gnoll_trapper: {
    parts: [
      { kind: 'disc', scale: 0.85 },
      { kind: 'ears', scale: 0.9 },
      { kind: 'bow' },
      { kind: 'pack', x: -0.3, scale: 0.8 },
      { kind: 'bandolier' },
    ],
  },
  /** The jaw snare: nothing but teeth on a plate, waiting. */
  jaw_snare: {
    parts: [
      { kind: 'disc', scale: 0.65, role: 'metal' },
      { kind: 'mandibles', scale: 1.25, role: 'metal' },
    ],
    shadowScale: 0.5,
  },
  /** THE OFFERING EFFIGY (Risen Offering's turret body): powdered bone
   *  packed into an idol, wreathed in grave-incense. */
  offering_effigy: {
    parts: [
      { kind: 'ribs', scale: 0.8, params: { under: true, pairs: 4 } },
      { kind: 'censer', y: 0.4, scale: 0.8 },
      { kind: 'skull', x: 0.2, scale: 0.9, params: { glow: 'glow' } },
      { kind: 'halo', scale: 1.0, alpha: 0.55 },
      { kind: 'runes', scale: 0.85, params: { n: 3 } },
    ],
    live: [{ kind: 'wisps', x: -0.2, scale: 0.9, params: { n: 3 } }],
    shadowScale: 0.7,
  },

  // ===================================== THE EXTRACTION SEAMS (node bodies)
  // Stationary GROWTHS, not creatures: no eyes, no facing read — a formation
  // the world pushed up, per-biome faces over one mechanical body. All stand
  // on the marrow_well doodad (the glow + the spent scar live there).

  /** The default face: a pale crystalline upwelling, veined and weeping light. */
  marrow_wellspring: {
    parts: [
      { kind: 'blob', color: '#7a9a86', params: { irr: 0.12, seed: 3 } },
      { kind: 'veinweb', color: '#a5e3b4', alpha: 0.7, scale: 0.9 },
      { kind: 'crystalGrowths', color: '#cfeedd', scale: 1.05 },
      { kind: 'gem', color: '#e8fff0', y: -0.1, scale: 0.5 },
    ],
    live: [{ kind: 'wisps', color: '#cfeedd', scale: 0.9, params: { n: 3 } }],
    shadowScale: 0.8,
  },
  /** The wood's face: a swollen rootbole, moss-shouldered, sap beading gold. */
  marrow_bole: {
    parts: [
      { kind: 'blob', color: '#5a4632', params: { irr: 0.22, seed: 9 } },
      { kind: 'roots', color: '#4a3826', scale: 1.15 },
      { kind: 'mossPatch', color: '#6a8a4a', x: -0.15, scale: 0.8 },
      { kind: 'veinweb', color: '#d8c26a', alpha: 0.65, scale: 0.7 },
      { kind: 'caps', color: '#c8a86a', x: 0.25, y: 0.2, scale: 0.4, alpha: 0.9 },
    ],
    live: [{ kind: 'wisps', color: '#d8c26a', scale: 0.8, params: { n: 2 } }],
    shadowScale: 0.9,
  },
  /** The gloam's face: a cold heart of pale light behind a cage of dark stone. */
  marrow_gloamheart: {
    parts: [
      { kind: 'blob', color: '#2e3240', params: { irr: 0.18, seed: 5 } },
      { kind: 'veinweb', color: '#b9a8e8', alpha: 0.8, scale: 0.95 },
      { kind: 'gem', color: '#d8ccf8', y: -0.05, scale: 0.55 },
      { kind: 'halo', color: '#b9a8e8', scale: 1.05, alpha: 0.4 },
    ],
    live: [{ kind: 'wisps', color: '#c8bcf0', scale: 1.0, params: { n: 4 } }],
    shadowScale: 0.75,
  },
  /** The Bloom's face: a crowned cap venting spore-light in slow breaths. */
  marrow_sporecrown: {
    parts: [
      { kind: 'capDome', color: '#8a6a9a', scale: 1.1 },
      { kind: 'sporeVents', color: '#d8b8e8', scale: 0.85 },
      { kind: 'veinweb', color: '#d8b8e8', alpha: 0.55, scale: 0.7 },
    ],
    live: [{ kind: 'puffMotes', color: '#e0c8f0', scale: 0.9, params: { n: 3 } }],
    shadowScale: 0.9,
  },
  /** The cinder country's face: a cracked obsidian boil, ember-marrow inside. */
  marrow_cinderseam: {
    parts: [
      { kind: 'blob', color: '#3a2e2a', params: { irr: 0.2, seed: 7 } },
      { kind: 'lavaCracks', color: '#f0a860', scale: 1.0 },
      { kind: 'gem', color: '#ffd8a0', y: 0.05, scale: 0.4, alpha: 0.9 },
    ],
    live: [{ kind: 'emberSparks', color: '#ffb870', scale: 0.9, params: { n: 3 } }],
    shadowScale: 0.85,
  },
  /** The waterline face: a brine-slick spiral bedded in polyps. */
  marrow_brinepool: {
    parts: [
      { kind: 'blob', color: '#3a5a5e', params: { irr: 0.16, seed: 11 } },
      { kind: 'polyps', color: '#6ab8b0', scale: 0.95 },
      { kind: 'shellSpiral', color: '#a8d8d0', x: 0.1, scale: 0.7 },
      { kind: 'veinweb', color: '#8fd8d0', alpha: 0.6, scale: 0.75 },
    ],
    live: [{ kind: 'wisps', color: '#a8e0d8', scale: 0.8, params: { n: 2 } }],
    shadowScale: 0.85,
  },
  /** The Glut's face: a knotted bloom of meat, sacs straining with marrow. */
  marrow_gorebloom: {
    parts: [
      { kind: 'fleshFolds', color: '#9a5a5a', scale: 1.05 },
      { kind: 'bloatSacs', color: '#c88a8a', scale: 0.9 },
      { kind: 'veinweb', color: '#e8a0a0', alpha: 0.75, scale: 0.85 },
    ],
    live: [{ kind: 'wisps', color: '#e8b0a8', scale: 0.7, params: { n: 2 } }],
    shadowScale: 0.9,
  },

  // ======================================== THE EMBERKIN (the cinder tribe)
  /** A scrap of living ash: a smouldering mote with ember eyes. */
  ashling: {
    parts: [
      { kind: 'blob', color: '#4a3228', params: { irr: 0.22, seed: 6 } },
      { kind: 'lavaCracks', color: '#ff9a4a', scale: 0.8 },
      { kind: 'eyes', color: '#ffd8a0', params: { spread: 0.4, dist: 0.55, size: 0.1 } },
    ],
    live: [{ kind: 'emberSparks', color: '#ffb870', scale: 0.8, params: { n: 2 } }],
    shadowScale: 0.6,
  },
  /** The wildfire's crawling coal: charred-black hide split by hot cracks,
   *  a live flame licking off its back — burning NOW, where its ashling
   *  cousin merely smolders. Every part painter reused. */
  cinderling: {
    parts: [
      { kind: 'blob', color: '#2e1e16', params: { irr: 0.32, seed: 11 } },
      { kind: 'lavaCracks', color: '#ff8a3a', scale: 0.7 },
      { kind: 'eyes', color: '#ffe8c0', params: { spread: 0.5, dist: 0.5, size: 0.14 } },
    ],
    live: [
      { kind: 'flames', color: '#ff9a3a', scale: 0.7 },
      { kind: 'emberSparks', color: '#ffb060', scale: 0.6, params: { n: 3 } },
    ],
    shadowScale: 0.5,
  },
  /** The spark off a burning crown: barely a body at all — a dim char
   *  mote wrapped in wisp-light and open flame, floating on its own heat.
   *  Reads airborne + ranged at a glance next to the ground-bound coal. */
  emberwisp: {
    parts: [
      { kind: 'blob', color: '#241813', scale: 0.6, alpha: 0.75, params: { irr: 0.4, seed: 23 } },
      { kind: 'eyes', color: '#fff0c8', params: { spread: 0.3, dist: 0.4, size: 0.16 } },
    ],
    live: [
      { kind: 'wisps', color: '#ffc060', params: { n: 3 } },
      { kind: 'flames', color: '#ff9a3a', scale: 0.85 },
    ],
    shadowScale: 0.35,
  },
  /** The vent-hound: a lean runner maned in fire. */
  cinder_hound: {
    parts: [
      { kind: 'torso', color: '#6a3a26', scale: 1.0 },
      { kind: 'snout', color: '#4a2a1c', x: 0.45, scale: 0.8 },
      { kind: 'mane', color: '#ff8a3a', scale: 0.9 },
      { kind: 'tail', color: '#5a3222', x: -0.55, scale: 0.8 },
      { kind: 'eyes', color: '#ffd06a', params: { spread: 0.32, dist: 0.66, size: 0.09 } },
    ],
    live: [{ kind: 'emberSparks', color: '#ff9a4a', scale: 0.6, params: { n: 2 } }],
  },
  /** Slag on legs: a cooling shell over a furnace heart, shield-forward. */
  slag_brute: {
    parts: [
      { kind: 'carapace', color: '#5a3a2a', scale: 1.1 },
      { kind: 'armorPlates', color: '#48281a', scale: 0.95 },
      { kind: 'lavaCracks', color: '#ff8a3a', scale: 0.85 },
      { kind: 'claws', color: '#3a241a', scale: 1.1, params: { talons: 2 } },
      { kind: 'eyes', color: '#ffc060', params: { spread: 0.3, dist: 0.6, size: 0.08 } },
    ],
    shadowScale: 1.05,
  },
  /** The litany-keeper: ash-robes, a censer of coals, a voice like a bellows. */
  vent_priest: {
    parts: [
      { kind: 'robe', color: '#7a4a2e', scale: 1.0 },
      { kind: 'hood', color: '#5a3420', x: 0.2, scale: 0.85 },
      { kind: 'censer', color: '#c86a2a', y: 0.45, scale: 0.75 },
      { kind: 'runes', color: '#ffb870', scale: 0.8, params: { n: 3 } },
    ],
    live: [{ kind: 'breathPuff', color: '#c8a08a', x: 0.4, scale: 0.7 }],
  },
  /** The tribe-mother: crowned in cooled horn-slag, drape stitched with vents. */
  emberkin_matriarch: {
    parts: [
      { kind: 'robe', color: '#8a4a26', scale: 1.15 },
      { kind: 'drape', color: '#6a3a20', scale: 1.0 },
      { kind: 'crownOfHorns', color: '#3a241a', x: 0.3, scale: 0.9 },
      { kind: 'staff', color: '#4a2e1c', params: { orb: 'glow' } },
      { kind: 'runes', color: '#ffb870', scale: 0.95, params: { n: 4 } },
      { kind: 'eyes', color: '#ffd8a0', params: { spread: 0.3, dist: 0.62, size: 0.09 } },
    ],
    live: [{ kind: 'emberSparks', color: '#ffb870', scale: 1.0, params: { n: 3 } }],
    shadowScale: 1.1,
  },

  // =================================== THE SIROCCO COURT (the deep desert)
  /** The court's blade: veils that never stop moving, knives that seem to. */
  mirage_dancer: {
    parts: [
      { kind: 'robe', color: '#e8d8a8', scale: 1.0 },
      { kind: 'daggers', color: '#f0e4c0', role: 'metal', scale: 0.95 },
      { kind: 'hood', color: '#d4b878', scale: 0.9 },
      { kind: 'eyes', color: '#fff2c0', params: { spread: 0.24, dist: 0.55, size: 0.08 } },
    ],
    live: [{ kind: 'veilSashes', color: '#f0e4c0', scale: 1.05 }],
    shadowScale: 0.9,
  },
  /** Hot air holding a blade — half there by construction. */
  heat_double: {
    parts: [
      { kind: 'robe', color: '#f0e4c0', alpha: 0.5, scale: 0.95 },
      { kind: 'daggers', color: '#fff2d8', alpha: 0.5, scale: 0.9 },
    ],
    live: [{ kind: 'wisps', color: '#ffe8b0', role: 'glow', alpha: 0.6 }],
    shadowScale: 0.4,
  },
  /** The dead lake's cured dead: crusted, seamed, and packed with brine. */
  salt_husk: {
    parts: [
      { kind: 'torso', color: '#e8e0c8', scale: 1.05 },
      { kind: 'crystalGrowths', color: '#f4eedc', scale: 0.9 },
      { kind: 'stitchSeams', color: '#b8ae90', scale: 1.0 },
      { kind: 'eyes', color: '#6a6046', params: { spread: 0.3, dist: 0.5, size: 0.07 } },
    ],
    shadowScale: 1.0,
  },
  /** Light going through a body the wrong way (the new glassFins part). */
  glass_stalker: {
    parts: [
      { kind: 'carapace', color: '#bcd8d4', alpha: 0.75, scale: 1.0 },
      { kind: 'glassFins', color: '#d8f0ec', scale: 1.0, params: { fins: 5 } },
      { kind: 'claws', color: '#e8fff8', scale: 1.05, params: { talons: 2 } },
      { kind: 'eyes', color: '#ffffff', params: { spread: 0.26, dist: 0.62, size: 0.07 } },
    ],
    shadowScale: 0.55,
  },
  /** A wind that learned appetite — mostly sash, barely body. */
  dust_djinn: {
    parts: [
      { kind: 'robe', color: '#d8b878', scale: 1.05 },
      { kind: 'maw', color: '#4a3a1e', scale: 0.6 },
    ],
    live: [
      { kind: 'veilSashes', color: '#c9a86a', scale: 1.15, params: { sashes: 4 } },
      { kind: 'wisps', color: '#e8d0a0', role: 'glow', alpha: 0.7 },
    ],
    shadowScale: 0.5,
  },
  /** The chaplain of noon: sunburst, censer, and no doubts whatsoever. */
  sun_priest: {
    parts: [
      { kind: 'robe', color: '#c8963a', scale: 1.0 },
      { kind: 'sunburst', color: '#ffd870', scale: 0.8 },
      { kind: 'censer', color: '#8a6e34', role: 'metal', scale: 0.9 },
      { kind: 'halo', color: '#ffe8a0', scale: 1.1 },
    ],
    shadowScale: 0.95,
  },
  /** The reason caravans walk the hardpan. */
  sandmaw_burrower: {
    parts: [
      { kind: 'segmentRings', color: '#c9a86a', scale: 1.1 },
      { kind: 'serpentHead', color: '#b08d52', scale: 1.0 },
      { kind: 'mandibles', color: '#7a5c2c', scale: 1.05 },
    ],
    banding: 'hoops',
    shadowScale: 1.05,
  },
  /** The court crowned: gold, brand, and a smile from somewhere else. */
  mirage_khagan: {
    parts: [
      { kind: 'robe', color: '#f0c880', scale: 1.1 },
      { kind: 'crown', color: '#ffe8a0', role: 'metal', scale: 0.9 },
      { kind: 'brand', color: '#ff9a3a', scale: 0.95 },
      { kind: 'halo', color: '#fff2c0', scale: 1.2, alpha: 0.7 },
    ],
    live: [{ kind: 'veilSashes', color: '#ffe8c0', scale: 1.2, params: { sashes: 4 } }],
    shadowScale: 0.95,
  },

  // =================================== THE JUNGLEKIN (the strangling green)
  /** Fronds with intent: a lean stalker wearing the understory. */
  fern_stalker: {
    parts: [
      { kind: 'torso', color: '#3f6a30', scale: 1.0 },
      { kind: 'mossPatch', color: '#5a8a44', scale: 0.9 },
      { kind: 'fronds', color: '#4a7a34', scale: 1.05 },
      { kind: 'claws', color: '#2c4a20', scale: 1.05, params: { talons: 3 } },
      { kind: 'eyes', color: '#d8f0a0', params: { spread: 0.32, dist: 0.6, size: 0.09 } },
    ],
    shadowScale: 0.95,
  },
  /** A hunched dart-tribesman: mask, pipe and a quiver of arguments. */
  blowgun_wretch: {
    parts: [
      { kind: 'torso', color: '#6a5a3c', scale: 0.95 },
      { kind: 'mask', color: '#c8b078', scale: 0.9 },
      { kind: 'warpaint', color: '#7ec850', scale: 0.9 },
      { kind: 'quiver', color: '#4a3a24', scale: 0.95 },
      { kind: 'staff', color: '#8a6e42', scale: 0.8 },
      { kind: 'eyes', color: '#c8e890', params: { spread: 0.28, dist: 0.58, size: 0.08 } },
    ],
    shadowScale: 0.9,
  },
  /** The caller: robes gone to moss, spore-vents where a censer would hang. */
  spore_caller: {
    parts: [
      { kind: 'robe', color: '#5a6e38', scale: 1.1 },
      { kind: 'drape', color: '#44562c', scale: 1.0 },
      { kind: 'mossPatch', color: '#7aa848', scale: 0.95 },
      { kind: 'sporeVents', color: '#a8d05a', scale: 0.9 },
      { kind: 'staff', color: '#4a5a30', params: { orb: 'glow' } },
      { kind: 'eyes', color: '#d8f0a0', params: { spread: 0.3, dist: 0.6, size: 0.09 } },
    ],
    live: [{ kind: 'puffMotes', color: '#a8d05a', scale: 0.9, params: { n: 3 } }],
    shadowScale: 1.0,
  },
  /** The maw in the mat: all mouth and roots — the vines were never idle. */
  strangler_maw: {
    parts: [
      { kind: 'blob', color: '#2f5224', scale: 1.05 },
      { kind: 'roots', color: '#3f6a30', scale: 1.1 },
      { kind: 'mawRing', color: '#1c3312', scale: 0.85 },
      { kind: 'barbs', color: '#6a9a3c', scale: 0.9 },
      { kind: 'eyeCluster', color: '#c8e890', scale: 0.7 },
    ],
    live: [{ kind: 'wisps', color: '#7aa848', scale: 0.8, params: { n: 2 } }],
    shadowScale: 1.0,
  },
  /** The cat the canopy dreams: spotted, whiskered, mostly implication. */
  emerald_prowler: {
    parts: [
      { kind: 'torso', color: '#3f7a44', scale: 1.05 },
      { kind: 'spots', color: '#2a5230', scale: 1.0 },
      { kind: 'tuftEars', color: '#356a3a', scale: 0.9 },
      { kind: 'whiskers', color: '#c8e8b0', scale: 0.9 },
      { kind: 'fangs', color: '#e8f0d0', scale: 0.85 },
      { kind: 'claws', color: '#24401e', scale: 1.1, params: { talons: 3 } },
      { kind: 'eyes', color: '#ffe890', params: { spread: 0.3, dist: 0.62, size: 0.1 } },
    ],
    shadowScale: 1.0,
  },
  /** A walking rampart of scale and shell — argue with the other end. */
  saurian_bulwark: {
    parts: [
      { kind: 'carapace', color: '#5a7a3c', scale: 1.1 },
      { kind: 'scutes', color: '#44602c', scale: 1.0 },
      { kind: 'dorsalRidge', color: '#36502a', scale: 0.95 },
      { kind: 'tailClub', color: '#4a6a34', scale: 0.95 },
      { kind: 'snout', color: '#52703a', scale: 0.9 },
      { kind: 'eyes', color: '#ffd870', params: { spread: 0.26, dist: 0.66, size: 0.08 } },
    ],
    shadowScale: 1.1,
  },
  /** The statue that was never a statue: coursed stone, moss in the joins. */
  ruin_sentinel: {
    parts: [
      { kind: 'torso', color: '#8a8c74', scale: 1.1 },
      { kind: 'armorPlates', color: '#6e7060', scale: 1.0 },
      { kind: 'mossPatch', color: '#5a7a3c', scale: 0.95 },
      { kind: 'stitchSeams', color: '#55684e', scale: 0.9 },
      { kind: 'hammer', color: '#5e6052', scale: 1.05 },
      { kind: 'eyes', color: '#9fd07a', params: { spread: 0.26, dist: 0.6, size: 0.09 } },
    ],
    shadowScale: 1.1,
  },
  /** The Shard: the toppled colossus's animate fragment — HEADLESS masonry
   *  (no eyes at all: the sentinel's lit gaze is exactly what this is not),
   *  bigger plates, brighter moss, verdigris fracture seams, the broken
   *  forearm dragged as a maul. Reads at a glance: statue-kin, but a piece
   *  of something much larger. */
  colossus_shard: {
    parts: [
      { kind: 'torso', color: '#8a8168', scale: 1.28 },
      { kind: 'armorPlates', color: '#6e6752', scale: 1.15 },
      { kind: 'mossPatch', color: '#6a8a48', scale: 1.1 },
      { kind: 'stitchSeams', color: '#7aa06a', scale: 1.0 },
      { kind: 'hammer', color: '#565040', scale: 1.3 },
    ],
    shadowScale: 1.25,
  },
  /** The Tyrant: crest and frill over old chitin — the treeline's own crown. */
  verdant_tyrant: {
    parts: [
      { kind: 'carapace', color: '#3f7a44', scale: 1.15 },
      { kind: 'crest', color: '#6ed060', scale: 1.0 },
      { kind: 'frill', color: '#2f5a34', scale: 1.05 },
      { kind: 'barbs', color: '#8ac860', scale: 0.9 },
      { kind: 'warpaint', color: '#d8f0a0', scale: 0.95 },
      { kind: 'claws', color: '#24401e', scale: 1.15, params: { talons: 3 } },
      { kind: 'eyes', color: '#ffe890', params: { spread: 0.3, dist: 0.64, size: 0.1 } },
    ],
    live: [{ kind: 'puffMotes', color: '#8ac860', scale: 0.9, params: { n: 2 } }],
    shadowScale: 1.15,
  },

  // =================================== THE TIDELINE + THE LATTICE (fills)
  /** A skittering wrack-crab: all legs and hurry, spray-spotted. */
  tide_skitter: {
    parts: [
      { kind: 'carapace', color: '#5a8a84', scale: 0.9 },
      { kind: 'legs', color: '#48706a', scale: 1.1, params: { pairs: 3 } },
      { kind: 'pincers', color: '#6aa89e', scale: 0.8 },
      { kind: 'spots', color: '#8fd0c8', scale: 0.7 },
      { kind: 'eyestalks', color: '#a8e0d8', x: 0.4, scale: 0.6 },
    ],
    shadowScale: 0.7,
  },
  /** The reef that moves: barnacled stone until it lurches, polyp-backed. */
  reef_lurcher: {
    parts: [
      { kind: 'shell', color: '#4a6a66', scale: 1.1 },
      { kind: 'polyps', color: '#6ab0a8', scale: 0.85 },
      { kind: 'barbs', color: '#3a5450', scale: 0.9 },
      { kind: 'claws', color: '#38524e', scale: 1.15, params: { talons: 3 } },
      { kind: 'eyes', color: '#c8f0e8', params: { spread: 0.26, dist: 0.6, size: 0.07 } },
    ],
    shadowScale: 0.95,
  },
  /** Wreck-timber walking: hull ribs, weed-drape, a lantern that still burns. */
  tidewrack_shambler: {
    parts: [
      { kind: 'torso', color: '#5a4a38', scale: 1.15 },
      { kind: 'ribs', color: '#6a5a44', scale: 0.9, params: { pairs: 3, span: 0.8 } },
      { kind: 'drape', color: '#4a6a58', scale: 1.0, alpha: 0.85 },
      { kind: 'barbs', color: '#3a3228', scale: 0.8 },
      { kind: 'lantern', color: '#a8d8c8', x: 0.42, y: 0.3, scale: 0.7 },
    ],
    live: [{ kind: 'slimeTrail', color: '#4a6a58', scale: 0.8 }],
    shadowScale: 1.05,
  },

  // ============================ THE DROWNED COURT (the Deep's nobility)
  // One glance says WHICH courtesy is about to kill you: the oar, the kite
  // shield, the censer, the rapier-and-circlet, the anchor, the trident-and-
  // crown. Everything reads through the apparition kit (cool phosphor eyes,
  // faded cloth, trailing wisps) laid over solid drowned bodies — ghost crew,
  // not ghosts.
  /** The crew: a sagging body in rotted slops, still pulling a broken oar. */
  drowned_oarsman: {
    parts: [
      { kind: 'torso', color: '#3c5a5e', scale: 1.0 },
      { kind: 'tatters', color: '#2f4a46', alpha: 0.9, params: { n: 5 } },
      { kind: 'drape', color: '#3a6a52', scale: 0.9, alpha: 0.85 },
      { kind: 'staff', color: '#5a4a34', rot: 0.55, scale: 1.15 },
      { kind: 'eyes', color: '#9ad8e0', params: { spread: 0.3, dist: 0.55, size: 0.08 } },
    ],
    live: [{ kind: 'wisps', color: '#7ad8d8', scale: 0.6, alpha: 0.4, params: { n: 2 } }],
    shadowScale: 1.0,
  },
  /** The wall of the court: kite shield gone to reef, coral-grown pauldrons —
   *  the breathing shell glyph does the rest of the talking. */
  barnacle_knight: {
    parts: [
      { kind: 'torso', color: '#3f625c', scale: 1.05 },
      { kind: 'pauldrons', color: '#55806e', scale: 1.05 },
      { kind: 'polyps', color: '#6ab0a0', scale: 0.8 },
      { kind: 'sword', color: '#6a8a80', y: 0.05, params: { len: 1.1 } },
      { kind: 'shield', color: '#4a6a5e', params: { kite: true } },
      { kind: 'helm', color: '#5a7a6e', scale: 0.95 },
      { kind: 'eyes', color: '#a8e0d8', params: { spread: 0.26, dist: 0.55, size: 0.07 } },
    ],
    live: [{ kind: 'wisps', color: '#7ad8c8', scale: 0.5, alpha: 0.35, params: { n: 2 } }],
    shadowScale: 1.05,
  },
  /** The tide priest: drowned vestments, a censer that drips instead of
   *  smokes, a verdigris circlet over the hood — the sea's own chaplain. */
  tide_vicar: {
    parts: [
      { kind: 'robe', color: '#2e4658', scale: 1.05, alpha: 0.95 },
      { kind: 'shroudWrap', color: '#43655e', scale: 0.9, alpha: 0.8, params: { bands: 3 } },
      { kind: 'censer', color: '#7ad8c8', y: 0.55, scale: 0.9, role: 'metal' },
      { kind: 'staff', color: '#4a6a62', scale: 0.95, params: { orb: 'glow' } },
      { kind: 'hood', color: '#243a48', scale: 0.95, params: { eyes: true } },
      { kind: 'crown', color: '#5a8a72', x: 0.28, scale: 0.55 },
    ],
    live: [{ kind: 'wisps', color: '#8ad8e0', scale: 0.7, alpha: 0.5, params: { n: 3 } }],
    shadowScale: 1.0,
  },
  /** The nobility: soaked finery, a soggy plume still worn at the angle
   *  fashion demanded, a rapier quicker than anything drowned should be. */
  sunken_courtier: {
    parts: [
      { kind: 'cape', color: '#4a3244', scale: 0.95, alpha: 0.9 },
      { kind: 'torso', color: '#3c5a66', scale: 0.95 },
      { kind: 'drape', color: '#3a6a58', scale: 0.85, alpha: 0.8 },
      { kind: 'sword', color: '#8ab0b8', y: 0.05, params: { len: 1.7, w: 0.045, guard: false } },
      { kind: 'crown', color: '#5a8a72', x: 0.26, scale: 0.5 },
      { kind: 'plume', color: '#44606a', x: 0.2, scale: 0.8, alpha: 0.85 },
      { kind: 'eyes', color: '#b8e8f0', params: { spread: 0.3, dist: 0.56, size: 0.08 } },
    ],
    live: [{ kind: 'wisps', color: '#7ad8d8', scale: 0.6, alpha: 0.45, params: { n: 2 } }],
    shadowScale: 0.95,
  },
  /** The anchor made a pallbearer: chained iron slung over one shoulder,
   *  barnacle-crusted — the silhouette IS the weapon. */
  anchor_wight: {
    parts: [
      { kind: 'torso', color: '#31504c', scale: 1.15 },
      { kind: 'chains', color: '#5a7268', x: -0.3, rot: 1.1, scale: 0.9, alpha: 0.8, params: { n: 3 } },
      { kind: 'anchor', color: '#5f8a7c', x: -0.35, y: -0.25, rot: -0.5, scale: 1.15 },
      { kind: 'polyps', color: '#6ab0a0', scale: 0.7 },
      { kind: 'skull', color: '#c8d8d0', x: 0.4, scale: 0.9, params: { glow: 'glow' } },
    ],
    live: [{ kind: 'wisps', color: '#7ad8c8', scale: 0.6, alpha: 0.4, params: { n: 2 } }],
    shadowScale: 1.15,
  },
  /** The wreck-hold coffer: banded oak swollen shut, barnacled, weed-hung —
   *  a chest that reads 'break me' from across the deck. */
  drowned_coffer: {
    parts: [
      { kind: 'chest', color: '#4a4034', scale: 1.05, params: { straps: 2 } },
      { kind: 'polyps', color: '#6ab0a0', scale: 0.7 },
      { kind: 'drape', color: '#3a6a52', scale: 0.7, alpha: 0.75 },
    ],
    shadowScale: 0.9,
  },
  /** THE TIDEBOUND REGENT: gilt crown gone green at the tines, kelp-rotted
   *  royal purple, the trident of a drowned admiralty — and a halo of cold
   *  light when the tide stands in for him. */
  tidebound_regent: {
    parts: [
      { kind: 'halo', color: '#7ad8d8', scale: 1.05, alpha: 0.35 },
      { kind: 'cape', color: '#462f42', scale: 1.05, alpha: 0.95 },
      { kind: 'torso', color: '#2c4a56', scale: 1.1 },
      { kind: 'drape', color: '#3a6a58', scale: 1.0, alpha: 0.85 },
      { kind: 'pauldrons', color: '#557a86', scale: 1.05 },
      { kind: 'trident', color: '#8ad0c0', params: { len: 1.2 } },
      { kind: 'crown', color: '#c8b86a', x: 0.28, scale: 0.7, params: { tines: 5 } },
      { kind: 'polyps', color: '#6ab0a0', x: 0.28, y: -0.55, scale: 0.45 },
      { kind: 'eyes', color: '#bfe8f0', params: { spread: 0.32, dist: 0.55, size: 0.09 } },
    ],
    live: [{ kind: 'wisps', color: '#7ad8d8', scale: 0.8, alpha: 0.5, params: { n: 4 } }],
    shadowScale: 1.2,
  },
  /** The lattice-crawler: ring-segmented glass, light bending along it. */
  prism_creeper: {
    parts: [
      { kind: 'segmentRings', color: '#9ac0e8', scale: 1.05 },
      { kind: 'crystalGrowths', color: '#cfe0f8', scale: 0.8 },
      { kind: 'legs', color: '#7a9ac8', scale: 1.0, params: { pairs: 4 } },
      { kind: 'eyes', color: '#e8f4ff', params: { spread: 0.3, dist: 0.62, size: 0.08 } },
    ],
    shadowScale: 0.8,
  },
  /** A note given a body: one shard, humming — it ends in a chord. */
  resonant_shardling: {
    parts: [
      { kind: 'gem', color: '#cfe0f8', scale: 1.0 },
      { kind: 'crystalGrowths', color: '#e8f0ff', scale: 0.7 },
      { kind: 'halo', color: '#b8d0f8', scale: 0.9, alpha: 0.35 },
    ],
    live: [{ kind: 'wisps', color: '#dce8ff', scale: 0.6, params: { n: 2 } }],
    shadowScale: 0.6,
  },
  /** The vent's breath given wings — ambient, harmless, beautiful. */
  ember_wisp: {
    parts: [
      { kind: 'blob', color: '#c86a2a', scale: 0.7, params: { irr: 0.15, seed: 4 } },
      { kind: 'halo', color: '#ffb870', scale: 1.0, alpha: 0.4 },
    ],
    live: [{ kind: 'emberSparks', color: '#ffd8a0', scale: 0.7, params: { n: 2 } }],
    shadowScale: 0.4,
  },

  // --- THE VIGILANT HOST (the Aetherial's wardens — feathers, halos, law) ----
  /** The cherub wisp: a burning mote in a ring, on the smallest wings. */
  cherub_wisp: {
    parts: [
      { kind: 'featherWings', scale: 0.9, role: 'glow' },
      { kind: 'disc', scale: 0.55 },
      { kind: 'halo', scale: 0.9, alpha: 0.6 },
      { kind: 'eyes', params: { n: 2, spread: 0.45, dist: 0.3, size: 0.12 } },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.75, params: { n: 2 } }],
    shadowScale: 0.55,
  },
  /** The ophan: a wheel that is all eyes, ringed in its own dawn. */
  ophan_wheel: {
    parts: [
      { kind: 'halo', scale: 1.35, alpha: 0.5 },
      { kind: 'disc', scale: 0.8 },
      { kind: 'eyeCluster', scale: 1.0, role: 'glow' },
      { kind: 'runes', scale: 1.1, params: { n: 4 } },
    ],
    live: [{ kind: 'wisps', x: -0.2, scale: 0.8, params: { n: 3 } }],
    shadowScale: 0.6,
    banding: 'hoops',
  },
  /** The herald: robed, winged, the warhorn raised over the choir. */
  herald_choir: {
    parts: [
      { kind: 'featherWings', scale: 1.15, role: 'cloth' },
      { kind: 'robe', scale: 0.95 },
      { kind: 'warhorn', y: 0.45, scale: 0.95, role: 'metal' },
      { kind: 'halo', scale: 0.95, alpha: 0.55 },
    ],
  },
  /** The virtue: a lancer falling point-first out of the light. */
  virtue_lance: {
    parts: [
      { kind: 'featherWings', scale: 1.2, role: 'glow' },
      { kind: 'robe', scale: 0.85 },
      { kind: 'trident', scale: 1.05, role: 'metal' },
      { kind: 'halo', scale: 0.85, alpha: 0.5 },
      { kind: 'plume', x: 0.3, scale: 0.8 },
    ],
  },
  /** The tribune: the city's magistrate — scales carried openly across the
   *  shoulders, laurel over the halo's place (LAW outranks light here). No
   *  lance, no horn: the read-at-a-glance is judgment, not war. */
  aureole_tribune: {
    parts: [
      { kind: 'featherWings', scale: 1.05, role: 'cloth' },
      { kind: 'robe', scale: 0.95 },
      { kind: 'balanceScales', y: -0.1, scale: 1.0, role: 'metal' },
      { kind: 'laurelCrown', scale: 0.9 },
    ],
  },
  /** The lyrist: the forum's muse — the lyre held forward, wings folded
   *  low, a faint halo. Strings on the silhouette and nothing else in the
   *  roster carries them: the buffer reads before the buff lands. */
  seraphal_lyrist: {
    parts: [
      { kind: 'featherWings', scale: 0.95, role: 'glow', alpha: 0.85 },
      { kind: 'robe', scale: 0.9 },
      { kind: 'lyre', x: 0.42, scale: 1.05 },
      { kind: 'halo', scale: 0.8, alpha: 0.45 },
    ],
  },

  // --- THE MUMMERS (the mimicry troupe — engine/mimic.ts) -------------------
  // Family read-at-a-glance law: each silhouette carries its capturable
  // art's TELL and nothing borrowed from a neighbor — the wings shriek, the
  // shards waltz, the mask throws faces, the cape owns the stage.

  /** The mockthrush: a wrong-colored songbird — wings up, throat working.
   *  The spots are the 'listen' tell: it learned your voice already. */
  mockthrush: {
    parts: [
      { kind: 'wings', scale: 1.2 },
      { kind: 'blob', scale: 0.85 },
      { kind: 'spots', scale: 0.9, params: { n: 4 } },
      { kind: 'snout', x: 0.4, scale: 0.6 },
      { kind: 'eyes', params: { n: 2, spread: 0.5, size: 0.16 } },
    ],
    shadowScale: 0.7,
  },
  /** The glasskin aper: an ape-shape armored in mirror-shard — the coat IS
   *  the waltz: nothing else in the troupe carries standing glass. */
  glasskin_aper: {
    parts: [
      { kind: 'torso', scale: 1.05 },
      { kind: 'crystalGrowths', scale: 1.1, role: 'glow', alpha: 0.9 },
      { kind: 'floatingShards', scale: 0.9, alpha: 0.8 },
      { kind: 'claws', scale: 0.95 },
      { kind: 'eyes', params: { n: 2, spread: 0.4, size: 0.18 } },
    ],
  },
  /** The masque haunt: a hollow robe under one BRIGHT held mask — the mask
   *  forward like a lantern (it is the projectile's tell), rags trailing. */
  masque_haunt: {
    parts: [
      { kind: 'robe', scale: 0.95, alpha: 0.8 },
      { kind: 'tatters', scale: 1.0, alpha: 0.75 },
      { kind: 'mask', x: 0.38, scale: 1.15, role: 'glow' },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.8, params: { n: 2 } }],
    shadowScale: 0.6,
  },
  /** The Understudy: the headliner — cape swept, mask worn HIGH (never
   *  thrown: this one keeps the face), daggers ready for the third act. */
  the_understudy: {
    parts: [
      { kind: 'torso', scale: 1.0 },
      { kind: 'cape', scale: 1.15, role: 'cloth' },
      { kind: 'mask', scale: 0.95, role: 'glow' },
      { kind: 'daggers', scale: 1.0, role: 'metal' },
    ],
  },

  /** The dominion: marble made law — plates, the open book, the scales' chains. */
  dominion_scales: {
    parts: [
      { kind: 'armorPlates', scale: 1.05, role: 'metal' },
      { kind: 'robe', scale: 1.0, role: 'cloth' },
      { kind: 'book', y: 0.5, scale: 0.9 },
      { kind: 'chains', scale: 0.95, role: 'metal' },
      { kind: 'halo', scale: 1.1, alpha: 0.45 },
      { kind: 'laurel', x: 0.25, scale: 0.9, role: 'glow' },
    ],
    shadowScale: 1.1,
  },
  /** The watcher: one unblinking eye carried on white wings. */
  watcher_eye: {
    parts: [
      { kind: 'featherWings', scale: 1.25, role: 'glow' },
      { kind: 'disc', scale: 0.7 },
      { kind: 'eyes', params: { n: 1, spread: 0, dist: 0.05, size: 0.34 } },
      { kind: 'halo', scale: 0.8, alpha: 0.4 },
    ],
    live: [{ kind: 'wisps', x: -0.35, scale: 0.7, params: { n: 2 } }],
    shadowScale: 0.6,
  },
  /** The lampad: the candle-bearer — robed, haloed, lantern raised, incense
   *  trailing. Carried by the light, not by wings. */
  lampad_vigil: {
    parts: [
      { kind: 'robe', scale: 0.95, role: 'cloth' },
      { kind: 'lantern', y: 0.5, scale: 1.0, role: 'glow' },
      { kind: 'censer', y: -0.45, scale: 0.75 },
      { kind: 'halo', scale: 0.9, alpha: 0.5 },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.8, params: { n: 2 } }],
    shadowScale: 0.6,
  },
  /** The power: plate over feathers — helm, shield, the folded wing sweep. */
  power_bastion: {
    parts: [
      { kind: 'featherWings', scale: 1.05, role: 'cloth' },
      { kind: 'armorPlates', scale: 1.0, role: 'metal' },
      { kind: 'shield', scale: 1.0, role: 'metal' },
      { kind: 'trident', scale: 1.0, role: 'metal' },
      { kind: 'helm', x: 0.3, scale: 0.95, role: 'metal' },
      { kind: 'halo', scale: 0.85, alpha: 0.35 },
    ],
  },
  /** The throne: the greater wheel — ringed segments, eyes all through,
   *  runes turning, a fire that never spends itself. */
  throne_law: {
    parts: [
      { kind: 'halo', scale: 1.5, alpha: 0.45 },
      { kind: 'segmentRings', scale: 1.1, role: 'glow' },
      { kind: 'disc', scale: 0.75 },
      { kind: 'eyeCluster', scale: 1.05, role: 'glow' },
      { kind: 'runes', scale: 1.25, params: { n: 5 } },
    ],
    live: [
      { kind: 'flames', y: -0.2, scale: 0.8 },
      { kind: 'wisps', x: -0.25, scale: 0.9, params: { n: 3 } },
    ],
    shadowScale: 0.65,
    banding: 'hoops',
  },
  /** The principality: laurel and sunburst — the whole kata, crowned. */
  principality: {
    parts: [
      { kind: 'sunburst', scale: 1.5, alpha: 0.45, role: 'glow' },
      { kind: 'featherWings', scale: 1.3, role: 'glow' },
      { kind: 'robe', scale: 1.0 },
      { kind: 'sword', scale: 1.1, role: 'metal' },
      { kind: 'laurel', x: 0.3, scale: 1.0, role: 'glow' },
      { kind: 'halo', scale: 1.15, alpha: 0.65 },
    ],
    live: [{ kind: 'wisps', x: -0.25, scale: 1.0, params: { n: 3 } }],
  },

  // --- THE GALEKIN (the Driftways' weather-fauna) ---------------------------
  /** The fingerling: a fin-flick of living cloud, mostly suggestion. */
  cirrus_fingerling: {
    parts: [
      { kind: 'fins', scale: 0.95 },
      { kind: 'eyes', scale: 0.7 },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.7, params: { n: 2 } }],
    shadowScale: 0.3,
  },
  /** The ray: all WING — a wide glider with a rudder tail. */
  drift_ray: {
    parts: [
      { kind: 'fins', scale: 1.55 },
      { kind: 'dorsalRidge', scale: 0.7 },
      { kind: 'tailFin', scale: 0.9 },
      { kind: 'eyes', scale: 0.8 },
    ],
    live: [{ kind: 'wisps', x: -0.4, scale: 0.6, params: { n: 2 } }],
    shadowScale: 0.5,
  },
  /** The eel: a ribboned storm-serpent, charge crawling its rings. */
  zephyr_eel: {
    parts: [
      { kind: 'segmentRings', scale: 1.1 },
      { kind: 'serpentHead', scale: 0.95 },
      { kind: 'fins', scale: 0.6, y: 0.2 },
      { kind: 'tailFin', scale: 0.7 },
    ],
    live: [{ kind: 'wisps', x: -0.35, scale: 0.7, params: { n: 2 } }],
    shadowScale: 0.45,
  },
  /** The djinn: torn weather wearing a face it borrowed. */
  gale_djinn: {
    parts: [
      { kind: 'tatters', scale: 1.05, role: 'cloth' },
      { kind: 'mask', scale: 0.8 },
      { kind: 'orb', y: 0.45, scale: 0.7, role: 'glow' },
    ],
    live: [
      { kind: 'wisps', x: -0.3, scale: 0.9, params: { n: 3 } },
      { kind: 'breathPuff', scale: 0.8 },
    ],
    shadowScale: 0.5,
  },
  /** The shepherd: robed, hooded, crook in hand, one feather in the band —
   *  the only galekin dressed for WALKING. */
  nimbus_shepherd: {
    parts: [
      { kind: 'robe', scale: 0.95, role: 'cloth' },
      { kind: 'hood', scale: 0.85, role: 'cloth' },
      { kind: 'staff', scale: 1.05 },
      { kind: 'plume', x: 0.2, scale: 0.7 },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.8, params: { n: 2 } }],
    shadowScale: 0.65,
  },
  /** The tyrant: an anvil-head mass crowned and crawling with charge. */
  thunderhead_tyrant: {
    parts: [
      { kind: 'blob', scale: 1.15 },
      { kind: 'dorsalRidge', scale: 0.9 },
      { kind: 'crown', scale: 0.7, role: 'metal' },
      { kind: 'eyeCluster', scale: 0.75 },
    ],
    live: [
      { kind: 'wisps', x: -0.3, scale: 1.0, params: { n: 3 } },
      { kind: 'emberSparks', scale: 0.9 },
    ],
    shadowScale: 0.55,
  },

  // --- THE ZEPHYRID KIN (the high sky's beasts — monsters.ts block) ---------
  /** The shrike: swept wings and a beak like a dropped dagger. */
  mistwing_shrike: {
    parts: [
      { kind: 'featherWings', scale: 1.25, role: 'glow' },
      { kind: 'torso', scale: 0.6 },
      { kind: 'beak', scale: 0.9 },
      { kind: 'eyes', params: { n: 2, spread: 0.4, dist: 0.32, size: 0.14 } },
      { kind: 'plume', x: -0.25, scale: 0.7 },
    ],
    live: [{ kind: 'wisps', x: -0.35, scale: 0.7, params: { n: 2 } }],
    shadowScale: 0.5,
  },
  /** The lurker: a crouched fan of crystal facets with too many still eyes —
   *  indistinguishable from the shelf's aether crystals until it isn't. */
  skyglass_lurker: {
    parts: [
      { kind: 'carapace', scale: 1.0, role: 'metal' },
      { kind: 'spikes', scale: 0.95 },
      { kind: 'gem', y: -0.1, scale: 0.55, role: 'glow' },
      { kind: 'eyes', params: { n: 4, spread: 0.7, dist: 0.28, size: 0.09 } },
      { kind: 'claws', scale: 0.85 },
    ],
    shadowScale: 0.6,
  },
  /** The bull: a stormcloud that grew shoulders and a grudge. */
  stormbrow_bull: {
    parts: [
      { kind: 'blob', scale: 1.2 },
      { kind: 'horns', scale: 1.1, role: 'metal' },
      { kind: 'dorsalRidge', scale: 0.85 },
      { kind: 'eyes', params: { n: 2, spread: 0.5, dist: 0.3, size: 0.13 } },
      { kind: 'legs', scale: 0.9 },
    ],
    live: [{ kind: 'emberSparks', scale: 0.8 }],
    shadowScale: 0.8,
  },
  /** The grazer: a soft drifting puff, all fleece and mild eyes. */
  cloud_grazer: {
    parts: [
      { kind: 'blob', scale: 1.05 },
      { kind: 'spots', scale: 0.8, alpha: 0.4 },
      { kind: 'eyes', params: { n: 2, spread: 0.35, dist: 0.3, size: 0.12 } },
      { kind: 'ears', scale: 0.7 },
    ],
    live: [{ kind: 'wisps', x: -0.2, scale: 0.9, params: { n: 2 } }],
    shadowScale: 0.45,
  },
  /** The matron: robes of weather, a crook of hardened wind, the brood's
   *  crown — the wild sky in a queen's shape. */
  zephyrid_matron: {
    parts: [
      { kind: 'featherWings', scale: 1.1, role: 'glow' },
      { kind: 'robe', scale: 0.95, role: 'cloth' },
      { kind: 'staff', scale: 1.0, role: 'metal' },
      { kind: 'crown', scale: 0.6, role: 'metal' },
      { kind: 'eyes', params: { n: 2, spread: 0.4, dist: 0.3, size: 0.12 } },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.9, params: { n: 3 } }],
    shadowScale: 0.6,
  },

  // --- THE VESPERKIN (the cosmos country's kin — monsters.ts block) ----------
  // The clarity doctrine, night-keyed: every body carries a POINT OF LIGHT
  // somewhere (the faction signature — a moth's glow, a hide of stars, a
  // spark mane, a dangled lure, a caged sun, a crown of last light), and
  // the silhouette says the texture: wings = swarm, antlers = prey, snout
  // and mane = the night pack, lure over a maw = the gap's trap, rings and
  // shards = the glass construct, crown and sashes = the sovereign.

  /** The moth: two bright wings around a mote — daylight with a wingspan. */
  lumen_moth: {
    parts: [
      { kind: 'featherWings', scale: 1.2, role: 'glow' },
      { kind: 'disc', scale: 0.55 },
      { kind: 'eyes', params: { n: 2, spread: 0.35, dist: 0.3, size: 0.14 } },
    ],
    live: [{ kind: 'puffMotes', scale: 0.8 }],
    shadowScale: 0.35,
  },
  /** The grazer: an elk of pale hide pricked with constellation-spots,
   *  antlers like a star chart. */
  star_grazer: {
    parts: [
      { kind: 'torso', scale: 1.0 },
      { kind: 'antlers', scale: 1.15, role: 'glow' },
      { kind: 'spots', scale: 0.85, alpha: 0.55, role: 'glow' },
      { kind: 'legs', scale: 0.9, params: { n: 4 } },
      { kind: 'eyes', params: { n: 2, spread: 0.4, dist: 0.32, size: 0.11 } },
    ],
    live: [{ kind: 'wisps', x: -0.25, scale: 0.6, params: { n: 2 } }],
    shadowScale: 0.7,
  },
  /** The hound: a courser all snout and spark — the mane burns, the tail
   *  streaks, the pack arrives with the dark. */
  comet_hound: {
    parts: [
      { kind: 'torso', scale: 0.95 },
      { kind: 'snout', scale: 0.95 },
      { kind: 'mane', scale: 0.9, role: 'glow' },
      { kind: 'tail', scale: 1.0 },
      { kind: 'legs', scale: 0.9, params: { n: 4 } },
      { kind: 'eyes', params: { n: 2, spread: 0.45, dist: 0.3, size: 0.12 } },
    ],
    live: [{ kind: 'emberSparks', scale: 0.85 }],
    shadowScale: 0.6,
  },
  // (void_angler keeps its existing void-family look — the vesper meadows
  // borrow the body whole, lure and all.)
  /** The keeper: brass rings around a caged star — an instrument that
   *  decided to keep working the sky without anyone to read it. */
  orrery_keeper: {
    parts: [
      { kind: 'disc', scale: 0.9, role: 'metal' },
      { kind: 'orb', y: -0.05, scale: 0.65, role: 'glow' },
      { kind: 'floatingShards', scale: 1.1, role: 'metal' },
      { kind: 'runes', scale: 0.9, role: 'glow' },
    ],
    shadowScale: 0.5,
  },
  /** The Noctarch: the hour between lights crowned — sashes of dusk, wings
   *  of last light, one held star. */
  noctarch: {
    parts: [
      { kind: 'featherWings', scale: 1.15, role: 'glow' },
      { kind: 'robe', scale: 0.95, role: 'cloth' },
      { kind: 'veilSashes', scale: 0.95, role: 'cloth' },
      { kind: 'crown', scale: 0.65, role: 'metal' },
      { kind: 'orb', y: 0.4, scale: 0.6, role: 'glow' },
      { kind: 'eyes', params: { n: 2, spread: 0.4, dist: 0.3, size: 0.12 } },
    ],
    live: [
      { kind: 'wisps', x: -0.3, scale: 0.9, params: { n: 3 } },
      { kind: 'emberSparks', scale: 0.7 },
    ],
    shadowScale: 0.6,
  },

  // --- THE CARVEN COURT (the Gloamwood country's harvest-kin) ----------------
  // Reads at a glance, per the clarity doctrine: EVERY Court body wears the
  // carved gourd somewhere (the faction signature), and the silhouette says
  // the texture — runner legs = fodder, tentacles = the rind you crack,
  // splayed cross = the straw that dodges, robe+lantern = the glass caster,
  // withy hulk = the poise wall, crown+calm grin = the King.

  /** The gourdling: a carved head on runner legs — the pop made cute. */
  gourdling: {
    parts: [
      { kind: 'legs', scale: 0.85, role: 'dark', params: { n: 4 } },
      { kind: 'gourdHead', scale: 1.0 },
    ],
    shadowScale: 0.7,
  },
  /** The patch lurker: a fat gourd over a knot of pale arms — the rind
   *  (front shell) reads as the face it doesn't have. */
  patch_lurker: {
    parts: [
      { kind: 'gourdHead', scale: 1.05, params: { grin: 'saw' } },
    ],
    live: [
      { kind: 'tentacleRing', scale: 0.95, role: 'bone', params: { n: 7, len: 1.6 } },
    ],
    shadowScale: 1.05,
  },
  /** The scarecrow watcher: the field cross woken — splayed straw limbs,
   *  hung tatters, the carved head sitting slightly wrong on the pole. */
  scarecrow_watcher: {
    parts: [
      { kind: 'strawLimbs', scale: 1.1, role: 'wood' },
      { kind: 'tatters', scale: 0.9, role: 'cloth' },
      { kind: 'gourdHead', scale: 0.6, x: 0.16 },
    ],
    shadowScale: 0.85,
  },
  /** The lantern sower: robes, a dim calm-cut head, and the lantern it
   *  carves the others by. */
  lantern_sower: {
    parts: [
      { kind: 'robe', scale: 1.0, role: 'cloth' },
      { kind: 'gourdHead', scale: 0.5, x: 0.18, params: { grin: 'calm' } },
      { kind: 'lantern', x: 0.5, y: -0.6, scale: 0.7 },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.7, params: { n: 2 } }],
    shadowScale: 0.8,
  },
  /** The harvest effigy: the wicker patron — bound withies, branch arms,
   *  embers riding the weave, the head a smouldering carve. */
  harvest_effigy: {
    parts: [
      { kind: 'barkPlates', scale: 1.1, role: 'wood' },
      { kind: 'branchArms', scale: 1.15, role: 'wood' },
      { kind: 'gourdHead', scale: 0.7, x: 0.1 },
    ],
    live: [{ kind: 'emberSparks', scale: 0.7 }],
    shadowScale: 1.25,
  },
  /** The Carven King: robed, crowned, calm-grinned — the harvest that
   *  decided it was a court. */
  carven_king: {
    parts: [
      { kind: 'cape', scale: 1.1, role: 'dark' },
      { kind: 'robe', scale: 1.05, role: 'cloth' },
      { kind: 'gourdHead', scale: 0.72, x: 0.12, params: { grin: 'calm' } },
      { kind: 'crown', x: 0.12, y: -0.55, scale: 0.5, role: 'metal' },
      { kind: 'scythe', scale: 1.05, role: 'metal' },
    ],
    live: [{ kind: 'wisps', x: -0.35, scale: 0.8, params: { n: 2 } }],
    shadowScale: 1.15,
  },

  // --- THE RIFTSPAWN (the Breach's own bodies — no more borrowed demon looks) --
  //
  // FAMILY TELLS, so the player reads "breach" at a glance from any of them:
  // floating void-shards orbiting the body, a single iris eye where a face
  // should be, and glassy fins in place of honest limbs. Each COURT'S kin then
  // add their lord's accent — Ashkarra flame + sash, Thulvane icicle +
  // crystal, Vexira glass + rune, Nulgrave maw + ooze — so the lord behind a
  // tear reads from its first minion.

  /** The rank-and-file rift-spawn: a glassy imp-sized splinter — shard orbit,
   *  one iris, finned. Nothing borrowed from hell. */
  riftspawn: {
    parts: [
      { kind: 'disc', scale: 0.9 },
      { kind: 'glassFins', scale: 0.85, role: 'glow' },
      { kind: 'irisEye', x: 0.3, scale: 0.5 },
    ],
    live: [{ kind: 'floatingShards', scale: 0.8, params: { n: 3, orbit: 1.25 } }],
  },
  /** The horror: a wrong-way-out blob crowded with eyes, trailing veil
   *  sashes — the shape a thing takes when it half-remembers bodies. */
  rift_horror: {
    parts: [
      { kind: 'blob', params: { irr: 0.18, seed: 41 } },
      { kind: 'veilSashes', scale: 0.95, role: 'glow', params: { sashes: 3 } },
      { kind: 'eyeCluster', x: 0.28, scale: 0.65, params: { n: 5 } },
    ],
    live: [{ kind: 'wisps', x: -0.25, scale: 0.8, params: { n: 3 } }],
  },
  /** Xal, the Riftmaw: the warlord — a torso that is mostly DOOR, the mawring
   *  gaping where a chest should be, crowned in shard-orbit. (The planted
   *  'rift_maw' gate look above is unrelated ground anatomy.) */
  xal_riftmaw: {
    parts: [
      { kind: 'torso', scale: 1.05 },
      { kind: 'mawRing', x: 0.18, scale: 0.8, params: { gape: 0.55 } },
      { kind: 'irisEye', x: 0.52, y: -0.3, scale: 0.34 },
      { kind: 'crown', x: 0.3, y: -0.52, scale: 0.55, role: 'dark' },
    ],
    live: [
      { kind: 'floatingShards', scale: 1.1, params: { n: 5, orbit: 1.35 } },
      { kind: 'wisps', x: -0.3, scale: 0.9, params: { n: 2 } },
    ],
    shadowScale: 1.1,
  },

  /** ASHKARRA'S KIN — the emberkin: a swarm splinter wearing rose-fire. */
  breach_emberkin: {
    parts: [
      { kind: 'disc', scale: 0.85 },
      { kind: 'glassFins', scale: 0.8, role: 'glow' },
      { kind: 'irisEye', x: 0.3, scale: 0.45 },
    ],
    live: [{ kind: 'emberSparks', scale: 0.75, params: { n: 4 } }],
  },
  /** …and the pyrelight: a robed candle of the far shore, sash-trailed. */
  breach_pyrelight: {
    parts: [
      { kind: 'robe', scale: 1.0, role: 'cloth' },
      { kind: 'veilSashes', scale: 0.9, role: 'glow', params: { sashes: 2 } },
      { kind: 'halo', x: 0.1, y: -0.5, scale: 0.55 },
      { kind: 'irisEye', x: 0.34, scale: 0.4 },
    ],
    live: [{ kind: 'flames', x: -0.15, scale: 0.8, params: { n: 2 } }],
  },

  /** THULVANE'S KIN — the rimehusk: a hollow carapace rimed in icicles. */
  breach_rimehusk: {
    parts: [
      { kind: 'carapace', scale: 1.05 },
      { kind: 'icicles', y: 0.15, scale: 0.9, params: { n: 5 } },
      { kind: 'irisEye', x: 0.36, scale: 0.5 },
    ],
    live: [{ kind: 'floatingShards', scale: 0.85, params: { n: 3, orbit: 1.2 } }],
    shadowScale: 1.05,
  },
  /** …and the hollowchill: a hooded absence breathing out the cold. */
  breach_hollowchill: {
    parts: [
      { kind: 'tatters', scale: 1.0, role: 'cloth' },
      { kind: 'hood', scale: 0.85, role: 'dark' },
      { kind: 'icicles', y: 0.3, scale: 0.7, params: { n: 4 } },
      { kind: 'irisEye', x: 0.3, scale: 0.42 },
    ],
    live: [{ kind: 'breathPuff', x: 0.55, scale: 0.7 }],
  },

  /** VEXIRA'S KIN — the arcling: all fin and feeler, a spark with a will. */
  breach_arcling: {
    parts: [
      { kind: 'disc', scale: 0.8 },
      { kind: 'glassFins', scale: 1.0, role: 'glow' },
      { kind: 'antennae', x: 0.3, scale: 0.7, params: { n: 2 } },
      { kind: 'irisEye', x: 0.28, scale: 0.45 },
    ],
    live: [{ kind: 'wisps', scale: 0.7, params: { n: 3 } }],
  },
  /** …and the stormveil: a rune-written sheet of glass walking its charge. */
  breach_stormveil: {
    parts: [
      { kind: 'veilSashes', scale: 1.05, role: 'glow', params: { sashes: 4 } },
      { kind: 'glassFins', scale: 0.9, role: 'glow' },
      { kind: 'halo', x: 0.08, y: -0.45, scale: 0.6 },
      { kind: 'irisEye', x: 0.3, scale: 0.44 },
    ],
    live: [{ kind: 'runes', scale: 0.85, params: { n: 4 } }],
  },

  /** NULGRAVE'S KIN — the gnawmouth: a swarm-thing that is chiefly teeth. */
  breach_gnawmouth: {
    parts: [
      { kind: 'blob', params: { irr: 0.22, seed: 73 } },
      { kind: 'fangJaw', x: 0.3, scale: 0.75 },
      { kind: 'lashFringe', scale: 0.85, params: { n: 6 } },
      { kind: 'irisEye', x: 0.15, y: -0.25, scale: 0.4 },
    ],
    live: [{ kind: 'floatingShards', scale: 0.7, params: { n: 2, orbit: 1.15 } }],
  },
  /** …and the unshaped: meat that never decided — lobes, eyes, appetite. */
  breach_unshaped: {
    parts: [
      { kind: 'blob', scale: 1.1, params: { irr: 0.3, seed: 19 } },
      { kind: 'oozeLobes', scale: 1.0, params: { n: 4 } },
      { kind: 'eyeCluster', x: 0.2, scale: 0.7, params: { n: 6 } },
    ],
    live: [{ kind: 'wisps', x: -0.2, scale: 0.85, params: { n: 3 } }],
    shadowScale: 1.1,
  },

  // The FOUR VESSELS — each lord poured into a body. Big, singular
  // silhouettes: the player has met the kin's accent all field long, and the
  // vessel is that accent made sovereign.

  /** The Vessel of Ashkarra: a processional pyre — robe, brand, halo, and a
   *  crown of fire that walks. */
  vessel_ashkarra: {
    parts: [
      { kind: 'robe', scale: 1.15, role: 'cloth' },
      { kind: 'veilSashes', scale: 1.05, role: 'glow', params: { sashes: 3 } },
      { kind: 'brand', x: 0.2, y: -0.2, scale: 0.7 },
      { kind: 'halo', x: 0.1, y: -0.55, scale: 0.75 },
      { kind: 'irisEye', x: 0.36, scale: 0.5 },
    ],
    live: [
      { kind: 'flames', x: -0.1, scale: 1.05, params: { n: 4 } },
      { kind: 'floatingShards', scale: 1.15, params: { n: 4, orbit: 1.4 } },
    ],
    shadowScale: 1.15,
  },
  /** The Vessel of Thulvane: a grown-over stillness — crystal risen through
   *  a torso that has stopped arguing with it. */
  vessel_thulvane: {
    parts: [
      { kind: 'torso', scale: 1.1 },
      { kind: 'crystalGrowths', scale: 1.0, params: { n: 4 } },
      { kind: 'icicles', y: 0.2, scale: 1.0, params: { n: 6 } },
      { kind: 'halo', x: 0.08, y: -0.5, scale: 0.7 },
      { kind: 'irisEye', x: 0.38, scale: 0.5 },
    ],
    live: [
      { kind: 'breathPuff', x: 0.55, scale: 0.85 },
      { kind: 'floatingShards', scale: 1.1, params: { n: 4, orbit: 1.35 } },
    ],
    shadowScale: 1.15,
  },
  /** The Vessel of Vexira: a standing arc — glass and rune and very little
   *  patience, the fastest thing the court owns. */
  vessel_vexira: {
    parts: [
      { kind: 'glassFins', scale: 1.25, role: 'glow' },
      { kind: 'veilSashes', scale: 1.0, role: 'glow', params: { sashes: 4 } },
      { kind: 'halo', x: 0.06, y: -0.5, scale: 0.8 },
      { kind: 'irisEye', x: 0.34, scale: 0.52 },
    ],
    live: [
      { kind: 'runes', scale: 1.0, params: { n: 5 } },
      { kind: 'wisps', scale: 0.9, params: { n: 4 } },
    ],
  },
  /** The Vessel of Nulgrave: the Hunger given a throat — a sphincter-maw
   *  body ringed in lashes, haustral folds doing the swallowing. */
  vessel_nulgrave: {
    parts: [
      { kind: 'blob', scale: 1.15, params: { irr: 0.26, seed: 88 } },
      { kind: 'haustraFolds', scale: 1.0 },
      { kind: 'sphincterMaw', x: 0.2, scale: 0.85, params: { gape: 0.5 } },
      { kind: 'lashFringe', scale: 1.05, params: { n: 8 } },
      { kind: 'eyeCluster', x: 0.05, y: -0.4, scale: 0.6, params: { n: 4 } },
    ],
    live: [{ kind: 'floatingShards', scale: 1.1, params: { n: 3, orbit: 1.3 } }],
    shadowScale: 1.2,
  },

  // --- THE MANOR HAUNTS (the Mournstead estate's household) ------------------

  /** The sheeted haunt: a dust sheet with nothing under it — the fold-lines
   *  still pressed, the two dark places where it looks. */
  sheeted_haunt: {
    parts: [
      { kind: 'shroudWrap', scale: 1.1, role: 'bone' },
      { kind: 'eyes', color: '#241f2e', params: { n: 2, spread: 0.42, dist: 0.28, size: 0.15 } },
    ],
    live: [{ kind: 'wisps', x: -0.3, scale: 0.8, params: { n: 2 } }],
    shadowScale: 0.5,
  },
  /** The hollow butler: livery over nothing — high collar, a service mask,
   *  the candle it keeps the household dressed by. */
  hollow_butler: {
    parts: [
      { kind: 'torso', scale: 0.95, role: 'cloth' },
      { kind: 'collar', scale: 0.9, role: 'dark' },
      { kind: 'mask', scale: 0.55, x: 0.15, role: 'bone' },
      { kind: 'lantern', x: 0.5, y: 0.55, scale: 0.6, color: '#ffc860' },
    ],
    shadowScale: 0.7,
  },
  /** The Lady of the House: a pale court gown drifting its own halls —
   *  veils that move on no wind, a mourning mask, grave-light in tow. */
  lady_of_the_house: {
    parts: [
      { kind: 'robe', scale: 1.1, role: 'bone' },
      { kind: 'mask', scale: 0.5, x: 0.16, role: 'bone' },
      { kind: 'laurel', scale: 0.55, x: 0.1, y: -0.5, role: 'metal' },
    ],
    live: [
      { kind: 'veilSashes', scale: 1.0, role: 'cloth' },
      { kind: 'wisps', x: -0.4, scale: 0.9, params: { n: 3 } },
    ],
    shadowScale: 0.55,
  },
};

/** Default portrait per deployed-construct kind (ConstructDelivery.look
 *  overrides per skill). Kinds absent here keep the legacy square: a decoy
 *  copies its owner elsewhere; pads/gates read as floor art. */
export const CONSTRUCT_LOOKS: Record<string, string> = {
  totem: 'construct_totem',
  sentry: 'construct_sentry',
  trap: 'construct_trap',
  mine: 'construct_mine',
  pylon: 'construct_pylon',
  barrier: 'construct_barrier_stone',
  embed: 'construct_spear',
  dome: 'construct_dome',
  pad: 'construct_pad',
  gate: 'construct_gate',
  eruptor: 'construct_eruptor',
  tree: 'construct_tree',
  relic: 'construct_relic',
  pod: 'construct_pod',
  // echo / decoy dress themselves in their OWNER's silhouette (buildEchoRider
  // / the dash-decoy mint copy look+shape+color) — deliberately absent here;
  // the validator's SELF_DRESSING set mirrors this pair.
};

/** Construct kinds that wear their OWNER's silhouette instead of a registry
 *  portrait (spawn paths copy look/shape/color) — the visual-coverage sweep
 *  skips them, and CONSTRUCT_LOOKS deliberately carries no entry. */
export const SELF_DRESSING_KINDS = new Set(['echo', 'decoy']);

/** The planted catch-spot's default portrait (Whirlaxe's marked circle) —
 *  one name shared by the world's mint and the validator, so removing the
 *  look entry can never silently regress the catch to a legacy square. */
export const CATCH_SPOT_LOOK = 'construct_axe_catch';
