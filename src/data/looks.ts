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
  },
  bloat: {
    parts: [
      { kind: 'blob', scale: 1.05, params: { irr: 0.1, seed: 33 } },
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
  keg: { parts: [{ kind: 'keg' }] },
  crate: { parts: [{ kind: 'crateBox' }] },
  training_dummy: {
    parts: [
      { kind: 'torso', role: 'wood' },
      { kind: 'apron', role: 'cloth', alpha: 0.85 },
    ],
  },
  gem_cache: {
    parts: [
      { kind: 'crateBox', scale: 0.95 },
      { kind: 'gem', scale: 1.3 },
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
};
