import type { UniqueDef } from '../../engine/items';
import type { UniqueChoiceGroup } from '../../engine/itemchoices';
import { mod } from '../../engine/stats';
import { bequestStat, registerAttributeBequest } from '../../engine/bequests';
import { registerWornThrong, wornThrongStat } from '../../engine/throng';
import { pocketGrantStat, registerPocketGrant, registerThrongSubstitution, registerTrailGrant,
  throngMorphStat, trailGrantStat } from '../../engine/fieldgrants';

registerTrailGrant({ id: 'cinderstep', name: 'Cinderstep Trail Power', skillId: 'cinderstep_trace',
  everyDist: 30, patch: { radius: 32, duration: 2.4, tickInterval: 0.4, damageScale: 0.55 }, maxPatches: 32 });
registerTrailGrant({ id: 'rimeglass', name: 'Rimeglass Trail Power', skillId: 'rimeglass_trace',
  everyDist: 36, patch: { radius: 34, duration: 2, tickInterval: 0.5, damageScale: 0.4 }, maxPatches: 24 });

registerWornThrong({ id: 'pale_watch', name: 'The Pale Watch', monsterId: 'phantasm', color: '#9ad8e8',
  at: 'roster', release: 'dismiss', cap: 3, capPerRank: 0.5,
  everySec: 4, everyFloorSec: 1.5, freqPerRank: 0.2, countPerRank: 0,
  ttlSec: 10, ttlPerRank: 0, huntRadius: 420, batch: 1 });

export const BORROWED_REFUGE = {
  id: 'borrowed_air', name: 'Borrowed Air Pockets', regionId: 'air_pocket', resource: 'breath',
  count: 5, radius: 64, minRadius: 24, cellSize: 240, seed: 0xb0a1,
  inside: [mod('damage', 'more', 0.25)], outside: [mod('moveSpeed', 'increased', 0.18)], color: '#7fd0e8',
};
registerPocketGrant(BORROWED_REFUGE);
export const borrowedRefugeLine = {
  stat: pocketGrantStat(BORROWED_REFUGE.id), kind: 'flat' as const, range: [1, 1] as [number, number], tierScale: 0,
  text: `Reveals air pockets in every zone: ${BORROWED_REFUGE.inside[0].value * 100}% more damage inside; ${BORROWED_REFUGE.outside[0].value * 100}% increased movement speed outside`,
};

const kindRows = [
  { id: 'cinders', name: 'Cinderkin', monsterId: 'cinderkin' },
  { id: 'wisps', name: 'Palewisps', monsterId: 'palewisp' },
  { id: 'gnats', name: 'Gnatlings', monsterId: 'gnatling' },
];
for (const def of kindRows) registerThrongSubstitution(def);
export const GLEANER_CHOICES: UniqueChoiceGroup[] = [{
  id: 'gathered_kind', options: kindRows.map(def => ({ id: def.id, weight: 1, lines: [{
    stat: throngMorphStat(def.id), kind: 'flat', range: [0.45, 0.7], tierScale: 0,
    text: `{v%} chance for your throng finds to become ${def.name}, keeping the original skill's roster and commands`,
  }] })),
}];

const lineages = [
  { id: 'might', name: 'Strength Lineage', attributes: ['strength', 'prowess', 'fortitude'] as const },
  { id: 'guile', name: 'Dexterity Lineage', attributes: ['dexterity', 'finesse', 'charisma'] as const },
  { id: 'insight', name: 'Intelligence Lineage', attributes: ['intelligence', 'wisdom', 'willpower'] as const },
];
for (const def of lineages) registerAttributeBequest({ ...def, attributes: [...def.attributes], recipients: 'both', maxShare: 0.6 });
registerAttributeBequest({ id: 'vital', name: 'Shared Vitality', attributes: ['vitality'], recipients: 'both', maxShare: 0.6 });

export const LIVING_UNIQUES: UniqueDef[] = [
  {
    id: 'cinderstep', name: 'Cinderstep', baseId: 'boots_armor_es', weight: 60, minIlvl: 8,
    flavor: 'She never burned a bridge she could leave burning behind her.',
    lines: [
      { stat: trailGrantStat('cinderstep'), kind: 'flat', range: [0.9, 1.3],
        text: 'Moving leaves short-lived ground fire at {v}× power; enemies crossing it may Burn' },
      { stat: 'moveSpeed', kind: 'increased', range: [0.1, 0.16] },
      { stat: 'damageVs_burn', kind: 'flat', range: [0.1, 0.18] },
      { stat: 'coldRes', kind: 'flat', range: [-0.15, -0.1], tierScale: 0 },
    ],
  },
  {
    id: 'pale_watch', name: 'Oath of the Pale Watch', baseId: 'chest_es', weight: 45, minIlvl: 14,
    flavor: 'Their watch ended. Their promise did not.',
    lines: [
      { stat: wornThrongStat('pale_watch'), kind: 'flat', range: [1, 2], tierScale: 0.2,
        text: 'Grants rank {v} of the Pale Watch: spectral minions replenish automatically; ranks grow their cap and hasten return' },
      { stat: 'minionLife', kind: 'increased', range: [0.2, 0.35] },
      { stat: 'minionDamage', kind: 'increased', range: [0.12, 0.22] },
      { stat: 'damage', kind: 'more', range: [-0.12, -0.08], tierScale: 0 },
    ],
  },
  {
    id: 'lineage_knot', name: 'The Lineage Knot', baseId: 'amulet_opal', weight: 55, minIlvl: 12,
    flavor: 'What you become, they remember how to be.',
    lines: [
      { stat: 'life', kind: 'flat', range: [20, 35] },
      { stat: 'minionMoveSpeed', kind: 'increased', range: [0.08, 0.14] },
      { stat: 'mana', kind: 'increased', range: [-0.12, -0.08], tierScale: 0 },
    ],
    choices: [{ id: 'lineage', options: lineages.map(def => ({ id: def.id, weight: 1, lines: [{
      stat: bequestStat(def.id), kind: 'flat', range: [0.15, 0.25], tierScale: 0,
      text: `Your minions and companions inherit {v%} of your ${def.attributes.join(', ')} benefits (throng batch scaling applies)`,
    }] })) }],
  },
  {
    id: 'common_pulse', name: 'The Common Pulse', baseId: 'ring_coral', weight: 65, minIlvl: 8,
    flavor: 'One heartbeat, answered in every chest.',
    lines: [
      { stat: bequestStat('vital'), kind: 'flat', range: [0.2, 0.3], tierScale: 0,
        text: 'Your minions and companions inherit {v%} of your Vitality benefits (throng batch scaling applies)' },
      { stat: 'vitality', kind: 'flat', range: [4, 7] },
      { stat: 'healPower', kind: 'increased', range: [0.1, 0.16] },
      { stat: 'wardGain', kind: 'increased', range: [-0.12, -0.08], tierScale: 0 },
    ],
  },
  {
    id: 'winter_after_you', name: 'Winter After You', baseId: 'belt_poise', weight: 60, minIlvl: 10,
    flavor: 'The way back was always colder.',
    lines: [
      { stat: trailGrantStat('rimeglass'), kind: 'flat', range: [0.9, 1.2],
        text: 'Moving leaves short-lived rime at {v}× power; enemies crossing it may Chill' },
      { stat: 'damageVs_chill', kind: 'flat', range: [0.12, 0.2] },
      { stat: 'energyShield', kind: 'flat', range: [12, 20] },
      { stat: 'fireRes', kind: 'flat', range: [-0.15, -0.1], tierScale: 0 },
    ],
  },
];
