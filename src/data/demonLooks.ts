import type { LookDef } from '../render/vis/parts';

/** Host doctrine expressed as anatomy. Common troops can be conscripted by
 * several lords; these looks communicate species/office, not current allegiance.
 * Marshals keep their war-banner. No decorative limb is a new combat target. */
export const DEMON_LOOKS: Record<string, LookDef> = {
  // SURTASH: heat lives inside fractured bodies. Preserve the larger pyre
  // demons; give their smaller kin a furnace anatomy of their own.
  cinder_fiend: {
    parts: [
      { kind: 'blob', color: '#593528', params: { irr: 0.2, seed: 21 } },
      { kind: 'kilnMantle', scale: 0.93 },
      { kind: 'lavaCracks', scale: 0.85 },
      { kind: 'ramHorns', color: '#382b29', scale: 0.78 },
      { kind: 'infernalJaw', x: 0.43, scale: 0.5 },
      { kind: 'eyes', color: '#ffd24a', params: { spread: 0.35, dist: 0.52, size: 0.09 } },
    ],
    live: [{ kind: 'flames', x: -0.22, scale: 0.65, params: { n: 3 } }],
  },
  demon_searing_spawn: {
    parts: [
      { kind: 'blob', role: 'dark', scale: 0.7, params: { irr: 0.3, seed: 67 } },
      { kind: 'ribs', color: '#602b24', scale: 0.7, params: { pairs: 3 } },
      { kind: 'horns', color: '#382321', scale: 0.9 },
      { kind: 'maw', x: 0.35, color: '#f39a52', scale: 0.52 },
      { kind: 'eyes', color: '#ffe28c', params: { spread: 0.3, dist: 0.43, size: 0.08 } },
    ],
    live: [
      { kind: 'flames', x: -0.32, scale: 0.75, params: { n: 3 } },
      { kind: 'emberSparks', scale: 0.65, params: { n: 3 } },
    ],
  },

  // VORMAUL: broad restraints and jaws bound in iron. The lord already has
  // a strong crowned silhouette; his previously helmet-only marshal gains it.
  marshal_vormaul: {
    parts: [
      { kind: 'banner', x: -0.2 },
      { kind: 'torso', scale: 1.02 },
      { kind: 'armorPlates', scale: 0.95 },
      { kind: 'pauldrons', role: 'metal', scale: 0.95 },
      { kind: 'ramHorns', color: '#677082', scale: 0.9 },
      { kind: 'chains', rot: 0.4, params: { n: 3 } },
      { kind: 'mace', params: { len: 1.1 } },
      { kind: 'helm', scale: 0.8, role: 'metal' },
      { kind: 'infernalJaw', x: 0.55, scale: 0.48 },
      { kind: 'collar', x: 0.25, scale: 0.55, role: 'metal' },
    ],
    shadowScale: 1.1,
  },

  // MORGRATH: retain the gorgers' excellent flesh grammar. The little
  // flayer becomes a skin-winged hooked predator rather than a knife disc.
  abyssal_flayer: {
    parts: [
      { kind: 'tatters', color: '#7e3549', scale: 0.85, params: { n: 4 } },
      { kind: 'disc', scale: 0.62 },
      { kind: 'tail', params: { len: 0.9 } },
      { kind: 'daggers', params: { len: 0.6 } },
      { kind: 'barbs', scale: 0.85, params: { n: 4 } },
      { kind: 'infernalJaw', x: 0.37, scale: 0.65 },
      { kind: 'horns', x: -0.1, scale: 0.52 },
      { kind: 'eyes', color: '#ff5a8a', params: { spread: 0.32, dist: 0.43, size: 0.08 } },
    ],
  },

  // VETHRISS: the body is a door and the spell is a hand reaching through.
  // The generic ritual scholar remains available to non-demonic users.
  demon_finger_mage: {
    parts: [
      { kind: 'tatters', color: '#34233e', scale: 0.8, params: { n: 4 } },
      { kind: 'torso', color: '#72546e', scale: 0.62 },
      { kind: 'riftHorns', scale: 0.73 },
      { kind: 'graspingHand', x: 0.22, y: 0.64, rot: -0.2, scale: 0.75 },
      { kind: 'graspingHand', x: 0.1, y: -0.65, rot: 0.2, scale: 0.49 },
      { kind: 'riftSeam', x: -0.03, rot: Math.PI / 2, scale: 0.44 },
      { kind: 'eyes', color: '#d6a8f1', params: { n: 3, spread: 0.42, dist: 0.36, size: 0.065 } },
    ],
    live: [{ kind: 'floatingShards', scale: 0.5, params: { n: 2, orbit: 1.6 } }],
    shadowScale: 0.8,
  },
  hellgate_caller: {
    parts: [
      { kind: 'tentacleRing', scale: 0.85, params: { n: 6 } },
      { kind: 'robe', color: '#392740', scale: 0.75 },
      { kind: 'riftHorns', scale: 1.03 },
      { kind: 'orb', x: -0.16, color: '#b58ae4', scale: 0.62 },
      { kind: 'graspingHand', x: 0.25, y: 0.65, rot: -0.2, scale: 0.53, mirror: true },
      { kind: 'eyes', color: '#d8b4ef', params: { spread: 0.25, dist: 0.43, size: 0.075 } },
    ],
    live: [{ kind: 'wisps', color: '#9865bf', scale: 0.55, alpha: 0.5, params: { n: 2 } }],
  },
  marshal_vethriss: {
    parts: [
      { kind: 'banner', x: -0.2 },
      { kind: 'tentacleRing', scale: 0.8, params: { n: 5 } },
      { kind: 'robe', color: '#46334f', scale: 0.75 },
      { kind: 'riftHorns', scale: 1.07 },
      { kind: 'graspingHand', x: 0.3, y: 0.7, rot: -0.22, scale: 0.62, mirror: true },
      { kind: 'runes', scale: 0.62, params: { n: 3 } },
      { kind: 'eyes', color: '#c8a8ff', params: { spread: 0.28, dist: 0.42, size: 0.08 } },
    ],
    live: [{ kind: 'floatingShards', scale: 0.65, params: { n: 3 } }],
  },
  lord_vethriss: {
    parts: [
      { kind: 'tentacleRing', scale: 0.95, params: { n: 7 } },
      { kind: 'robe', color: '#39233f', scale: 0.82 },
      { kind: 'riftHorns', scale: 1.18 },
      { kind: 'riftHorns', x: -0.17, scale: 0.72 },
      { kind: 'orb', x: -0.2, color: '#c08cf0', scale: 0.7 },
      { kind: 'graspingHand', x: 0.43, y: 0.73, rot: -0.22, scale: 0.75, mirror: true },
      { kind: 'crownOfHorns', x: 0.15, scale: 0.48 },
      { kind: 'eyes', color: '#ead4ff', params: { n: 3, spread: 0.36, dist: 0.42, size: 0.085 } },
    ],
    live: [{ kind: 'floatingShards', scale: 0.75, params: { n: 4 } }],
    shadowScale: 1.15,
  },

  // OZRIMOTH: a sermon comes from the anatomy, not a scholar's book.
  // Pale throat-pipes and exposed mouths contrast the Hush's sealed faces.
  unmaker_acolyte: {
    parts: [
      { kind: 'robe', color: '#484333', scale: 0.83 },
      { kind: 'sermonPipes', x: -0.18, scale: 0.83 },
      { kind: 'hood', x: 0.22, scale: 0.68, params: { eyes: false } },
      { kind: 'infernalJaw', x: 0.4, scale: 0.63 },
      { kind: 'crownOfHorns', x: 0.14, scale: 0.48 },
      { kind: 'brand', x: -0.06, scale: 0.34, role: 'glow' },
    ],
    live: [{ kind: 'floatingShards', scale: 0.65, params: { n: 3 } }],
  },
  marshal_ozrimoth: {
    parts: [
      { kind: 'banner', x: -0.2 },
      { kind: 'robe', scale: 0.92 },
      { kind: 'wings', scale: 0.65, alpha: 0.8 },
      { kind: 'sermonPipes', x: -0.1, scale: 0.93 },
      { kind: 'censer', y: 0.55, scale: 0.75 },
      { kind: 'hood', x: 0.28, scale: 0.76, params: { eyes: false } },
      { kind: 'infernalJaw', x: 0.46, scale: 0.67 },
      { kind: 'crownOfHorns', x: 0.13, scale: 0.58 },
      { kind: 'brand', x: -0.1, scale: 0.4 },
    ],
  },
  lord_ozrimoth: {
    parts: [
      { kind: 'robe', color: '#554b30', scale: 1.03 },
      { kind: 'wings', scale: 0.9, alpha: 0.85 },
      { kind: 'sermonPipes', x: -0.14, scale: 1.12 },
      { kind: 'censer', y: 0.6, scale: 0.85 },
      { kind: 'hood', x: 0.3, scale: 0.9, params: { eyes: false } },
      { kind: 'infernalJaw', x: 0.5, scale: 0.85 },
      { kind: 'crownOfHorns', x: 0.08, scale: 0.78 },
      { kind: 'brand', x: -0.11, scale: 0.47 },
    ],
    shadowScale: 1.15,
  },

  // NYXARA: folded membranes, a blind bone face, the mouth sewn shut.
  // The hanging bell stays readable: it is still this host's actual weapon.
  hushmaiden: {
    parts: [
      { kind: 'wings', color: '#283f42', scale: 0.62 },
      { kind: 'robe', color: '#294347', scale: 0.72 },
      { kind: 'horns', color: '#709a94', x: -0.08, scale: 0.78 },
      { kind: 'sealedVisage', x: 0.3, scale: 0.78 },
      { kind: 'bell', x: 0.12, y: 0.55, scale: 0.8 },
    ],
    live: [{ kind: 'veilSashes', scale: 0.85, alpha: 0.55, params: { sashes: 3 } }],
  },
  veil_stalker: {
    parts: [
      { kind: 'disc', color: '#283e42', scale: 0.62 },
      { kind: 'daggers', params: { len: 0.65 } },
      { kind: 'tail', params: { len: 0.85 } },
      { kind: 'horns', color: '#668980', scale: 0.66 },
      { kind: 'sealedVisage', x: 0.29, scale: 0.66 },
      { kind: 'graspingHand', x: 0.15, y: -0.6, rot: 0.2, scale: 0.4 },
    ],
    live: [{ kind: 'wisps', scale: 0.5, color: '#5aa0a0', alpha: 0.4 }],
  },
  marshal_nyxara: {
    parts: [
      { kind: 'banner', x: -0.2, alpha: 0.85 },
      { kind: 'wings', color: '#2e494b', scale: 0.72 },
      { kind: 'torso', color: '#355153', scale: 0.75 },
      { kind: 'horns', color: '#79998f', x: -0.08, scale: 0.88 },
      { kind: 'daggers', params: { len: 0.6 } },
      { kind: 'sealedVisage', x: 0.32, scale: 0.9 },
      { kind: 'bell', x: 0.12, y: 0.52, scale: 0.85 },
    ],
    live: [{ kind: 'veilSashes', scale: 0.95, alpha: 0.6, params: { sashes: 4 } }],
  },
  lord_nyxara: {
    parts: [
      { kind: 'wings', color: '#253f42', scale: 0.95 },
      { kind: 'torso', color: '#365458', scale: 0.82 },
      { kind: 'horns', color: '#70998e', x: -0.08, scale: 1.15 },
      { kind: 'daggers', params: { len: 0.7 } },
      { kind: 'sealedVisage', x: 0.33, scale: 1.05 },
      { kind: 'crown', x: 0.25, scale: 0.46, role: 'dark' },
      { kind: 'bell', x: 0.14, y: 0.57, scale: 1 },
    ],
    live: [
      { kind: 'veilSashes', scale: 1.1, alpha: 0.65, params: { sashes: 5 } },
      { kind: 'wisps', scale: 0.7, color: '#5aa0a0', alpha: 0.35 },
    ],
    shadowScale: 1.1,
  },

  // BHOROG: weapons and officers remain legible under demonic anatomy.
  // The hulk's central gem and rider platforms are intentionally unobscured.
  siege_hulk: {
    parts: [
      { kind: 'torso', scale: 1.05 },
      { kind: 'armorPlates', params: { n: 4 } },
      { kind: 'pauldrons', scale: 1.2 },
      { kind: 'ramHorns', color: '#65584d', x: 0.12, scale: 1.08 },
      { kind: 'hammer' },
      { kind: 'infernalJaw', x: 0.65, scale: 0.56 },
      { kind: 'gem', x: -0.1 },
    ],
    shadowScale: 1.1,
  },
  grind_bannerman: {
    parts: [
      { kind: 'banner', x: -0.25, scale: 1.35 },
      { kind: 'torso', scale: 0.98 },
      { kind: 'armorPlates', params: { n: 3 } },
      { kind: 'ramHorns', color: '#836a4f', scale: 0.78 },
      { kind: 'helm', scale: 0.9 },
      { kind: 'infernalJaw', x: 0.56, scale: 0.46 },
      { kind: 'sword', scale: 0.8 },
    ],
    shadowScale: 1,
  },

  // MOLOCHAI: tribute chained to a bony counting rack, tusks and grasping
  // fingers. Strongboxes/scythes remain the troop-to-throne family signature.
  marshal_molochai: {
    parts: [
      { kind: 'banner', x: -0.2 },
      { kind: 'robe', color: '#49512f', scale: 0.85 },
      { kind: 'chest', x: -0.35, scale: 0.62, role: 'metal' },
      { kind: 'titheRack', x: -0.15, scale: 0.95 },
      { kind: 'scythe', params: { len: 1.05 } },
      { kind: 'ramHorns', color: '#c6ae6c', x: 0.04, scale: 0.75 },
      { kind: 'infernalJaw', x: 0.4, scale: 0.53 },
      { kind: 'crown', x: 0.21, scale: 0.4, role: 'metal' },
      { kind: 'eyes', color: '#e8e870', params: { spread: 0.28, dist: 0.41, size: 0.075 } },
    ],
  },
  lord_molochai: {
    parts: [
      { kind: 'robe', color: '#4e5732', scale: 1 },
      { kind: 'chest', x: -0.38, scale: 0.75, role: 'metal' },
      { kind: 'titheRack', x: -0.12, scale: 1.13 },
      { kind: 'chains', rot: 0.4, params: { n: 2 } },
      { kind: 'scythe', params: { len: 1.2 } },
      { kind: 'graspingHand', x: 0.28, y: 0.78, rot: -0.15, scale: 0.57 },
      { kind: 'ramHorns', color: '#cfb671', scale: 0.98 },
      { kind: 'infernalJaw', x: 0.43, scale: 0.7 },
      { kind: 'crown', x: 0.2, scale: 0.58, role: 'metal' },
      { kind: 'eyes', color: '#e8e870', params: { spread: 0.28, dist: 0.45, size: 0.075 } },
    ],
    live: [{ kind: 'wisps', scale: 0.6, color: '#8ab04a', alpha: 0.4 }],
    shadowScale: 1.15,
  },
};
