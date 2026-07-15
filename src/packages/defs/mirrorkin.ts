// ---------------------------------------------------------------------------
// THE MIRRORKIN — reflections given appetite.
//
// A contexts-gated faction (they exist nowhere in ordinary generation) fielded
// by ONE in-zone encounter: the MIRROR RIFT — a pale diamond that opens onto
// copies of your current party. The rift rides the shared encounter framework
// (scales, kill-fed timer) for its husk-flood, and the ECHO RITE
// (EncounterDef.echoParty — net-new, reusable) for its signature beat: at the
// moment the field opens, one REFLECTION forms per living seat, wearing that
// hero's silhouette and casting the hero's own castable bar skills at monster
// stats and a data-set power factor. Co-op: fight both of you. The same rite
// is the seam a future legacy-revenant event will pour a SNAPSHOT through.
// ---------------------------------------------------------------------------

import { mod } from '../../engine/stats';
import type { EncounterDef } from '../encounters';
import type { ContentPackage, FactionSpec } from '../types';

/** THE pale glass — one hue for the diamond, the faction, and the rite. */
const MIRROR_COLOR = '#b8c4d8';

/** THE MIRRORKIN — contexts-gated: no war zones, no wandering, no biome.
 *  Only the rift fields them; only the rift ever will. */
const MIRRORKIN_FACTION: FactionSpec = {
  id: 'mirrorkin',
  name: 'the Mirrorkin',
  color: MIRROR_COLOR,
  traits: { roaming: 0.3, aggression: 1.2, warlordHome: 'capital', contexts: ['mirror_rift'] },
  roster: [
    { id: 'mirror_husk', weight: 4 },
    // A wild-rolled reflection mirrors nothing — it fights with its own glass.
    { id: 'mirrorkin_reflection', weight: 1, presence: { from: 4, fadeIn: 3 } },
  ],
};

/** The Mirror Rift: a breach-shaped field whose opening breath is the rite. */
const MIRROR_RIFT: EncounterDef = {
  id: 'mirror_rift',
  packageId: 'mirrorkin',
  label: 'Mirror Rift',
  factions: ['mirrorkin'],
  trigger: { glyph: '❖', color: MIRROR_COLOR, activateRadius: 30 },
  timePerKill: 0.22,
  radiusPerKill: 1.1,
  scales: [
    { id: 'sliver', label: 'Mirror Sliver', weight: 6,
      baseTime: 20, maxBonusTime: 25, startRadius: 90, maxRadius: 240, growthPerSec: 5,
      spawnInterval: [1.6, 2.4], spawnBatch: [1, 3], rewardMul: 1 },
    { id: 'rift', label: 'Mirror Rift', weight: 3,
      baseTime: 32, maxBonusTime: 55, startRadius: 110, maxRadius: 380, growthPerSec: 8,
      spawnInterval: [1.2, 1.8], spawnBatch: [2, 4], rewardMul: 1.8 },
    { id: 'gallery', label: 'the Gallery of Faces', weight: 1,
      baseTime: 50, maxBonusTime: 100, startRadius: 140, maxRadius: 540, growthPerSec: 11,
      spawnInterval: [0.9, 1.4], spawnBatch: [3, 6], rewardMul: 3 },
  ],
  // THE RITE: one reflection per living seat, wearing that hero's face and
  // castable bar. The power factor is a haircut, not a flattery — a mirror at
  // full skill power with a monster's stat sheet reads as a wall, not a duel.
  echoParty: {
    bodyDefId: 'mirrorkin_reflection',
    levelBonus: 1,
    maxSkills: 4,
    powerMods: [mod('damage', 'more', -0.2)],
    announce: '…it wears your face.',
  },
  ledger: {
    onEncounter: 'mirror_rift_encountered',
    onClose: 'mirror_rifts_sealed',
  },
};

export const MIRRORKIN: ContentPackage = {
  id: 'mirrorkin',
  label: 'The Mirrorkin',
  color: MIRROR_COLOR,
  blurb: 'Somewhere between the world and its image, something learned to want. A pale diamond stands in the field — harmless, patient, exactly as interesting as a mirror — until you touch it, and the glass remembers everyone who ever stood in front of it. Husks pour out first: reflections that found no face, hungry for one. Then the rift takes yours. It walks like you. It casts what you cast. In company it is worse — every hero in the party meets themselves, and the fight is a portrait gallery with knives. Seal the rift fast and the glass forgets; linger, and understand that the thing wearing your face has been watching you play this whole time.',
  cost: 120,
  unlock: {
    id: 'mirrorkin_unlock',
    label: 'Open a Mirror Rift (pale diamonds stand in charted zones)',
    test: (ctx) => (ctx.ledger.mirror_rift_encountered ?? 0) >= 1,
  },
  tiers: [
    { id: 'mirrorkin_facing', label: 'Facing Yourself', requirement: 'Seal 3 Mirror Rifts', cost: 160,
      test: (ctx) => (ctx.ledger.mirror_rifts_sealed ?? 0) >= 3,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'mirrorkin_unmirrored', label: 'The Unmirrored', requirement: 'Seal 8 Mirror Rifts', cost: 240,
      test: (ctx) => (ctx.ledger.mirror_rifts_sealed ?? 0) >= 8,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'mirrorkin_start', kind: 'startLevel', label: 'Mirror Rifts begin at level', min: 4, max: 4, step: 1, defaultValue: 4 },
    { id: 'mirrorkin_weight', kind: 'weight', label: 'Mirror Rift frequency', min: 15, max: 45, step: 5, defaultValue: 30 },
  ],
  defaultWeight: 30,
  defaultStartLevel: 4,
  defaultEnabled: true,
  encounters: [MIRROR_RIFT],
  factions: [MIRRORKIN_FACTION],
  validate: (look) => [
    ...(look.monster(MIRROR_RIFT.echoParty!.bodyDefId) ? [] : [`echo vessel '${MIRROR_RIFT.echoParty!.bodyDefId}' unknown`]),
  ],
};
