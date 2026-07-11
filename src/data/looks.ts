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
