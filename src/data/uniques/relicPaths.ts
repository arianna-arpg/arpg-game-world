// Relic paths compose existing mechanics. Counts are fixed; positive numeric
// investment uses the account allowlist in data/reliquary.ts.
import type { UniqueDef } from '../../engine/items';
import type { UniqueChoiceGroup } from '../../engine/itemchoices';
import { MINION_FAMILIES } from '../minionFamilies';
import { procPowerStat, procStat, type ProcDef } from '../procs';

const FAMILY_NAMES: Record<keyof typeof MINION_FAMILIES, string> = {
  swarm: 'Swarm', golem: 'Golem', rubblekin: 'Rubblekin', earthborn: 'Earthborn',
  skeleton: 'Skeleton', skeletal_mage: 'Skeletal Mage',
};

/** One saved family identity, never chosen again on equip or on a new life.
 * Membership comes from the shared minion registry, including mixed pools. */
export const MANY_NAMES_CHOICES: UniqueChoiceGroup[] = [{
  id: 'summon_family',
  options: (Object.keys(MINION_FAMILIES) as (keyof typeof MINION_FAMILIES)[]).map(id => ({
    id, weight: 1, lines: [{
      stat: 'minionMaxCount', kind: 'flat', range: [1, 1], tierScale: 0,
      tags: [`minion:${id}`], text: `+{v0} maximum ${FAMILY_NAMES[id]} summons; does not grant a summon skill`,
    }],
  })),
}];

const guardRefrain = {
  id: 'relic_guard_refrain', name: 'Censer Refrain', color: '#ddc58f',
  trigger: 'block', icd: 5,
  effect: { type: 'restore', resource: 'poise', pctMax: 0.06 },
} satisfies ProcDef;
const wayfarer = {
  id: 'relic_wayfarer', name: "Wayfarer's Shelter", color: '#a6cfe8',
  trigger: 'cast', tags: ['movement'], icd: 6,
  effect: { type: 'ward', pctMaxLife: 0.02 },
} satisfies ProcDef;
const widow = {
  id: 'relic_widows_wick', name: "Widow's Wick", color: '#b2a2d8',
  trigger: 'minionDeath', icd: 3,
  effect: { type: 'restore', resource: 'mana', pctMax: 0.02 },
} satisfies ProcDef;
export const RELIC_PATH_PROCS: ProcDef[] = [guardRefrain, wayfarer, widow];

export const RELIC_PATH_UNIQUES: UniqueDef[] = [
  {
    id: 'idol_of_many_names', name: 'The Idol of Many Names', baseId: 'relic_idol', minIlvl: 18, weight: 20,
    flavor: 'It remembers one name more than the grave can hold.',
    choices: MANY_NAMES_CHOICES,
    lines: [
      { stat: 'minionLife', kind: 'increased', range: [0.1, 0.15] },
      { stat: 'mana', kind: 'flat', range: [10, 15] },
    ],
  },
  {
    id: 'architects_keystone', name: "The Architect's Keystone", baseId: 'relic_effigy', minIlvl: 16, weight: 18,
    flavor: 'Every ruin keeps a place for the stone that was never laid.',
    choices: [{ id: 'construction', options: (['totem', 'trap', 'mine'] as const).map(id => ({
      id, weight: 1, lines: [{ stat: 'constructMaxCount', kind: 'flat', range: [1, 1], tierScale: 0,
        tags: [id], text: `+{v0} maximum active ${id === 'totem' ? 'Totems' : id === 'trap' ? 'Traps' : 'Mines'}` }],
    })) }],
    lines: [
      { stat: 'effectDuration', kind: 'increased', range: [0.1, 0.15], tags: ['construct'] },
      { stat: 'manaRegen', kind: 'flat', range: [1, 1.5] },
    ],
  },
  {
    id: 'thorn_testament', name: 'The Thorn Testament', baseId: 'relic_talisman', minIlvl: 12, weight: 22,
    flavor: 'The wound learned to write back.',
    lines: [
      { stat: 'thornsToHit', kind: 'flat', range: [0.5, 0.75], tags: ['melee'],
        text: 'Gain {v%} of your Thorns as added Physical damage with Melee hits' },
      { stat: 'thorns', kind: 'flat', range: [10, 15] },
      { stat: 'armor', kind: 'increased', range: [0.08, 0.12] },
    ],
  },
  {
    id: 'pilgrim_spindle', name: 'The Pilgrim Spindle', baseId: 'relic_talisman', minIlvl: 14, weight: 22,
    flavor: 'The prayer did not end when the road began.',
    lines: [
      { stat: 'channelMobility', kind: 'flat', range: [0.4, 0.6],
        text: 'Gain {v%} of normal movement speed while Channeling' },
      { stat: 'damage', kind: 'increased', range: [0.1, 0.15], tags: ['channel'] },
      { stat: 'mana', kind: 'flat', range: [10, 15] },
    ],
  },
  {
    id: 'venom_ledger', name: 'The Venom Ledger', baseId: 'relic_charm', minIlvl: 14, weight: 22,
    flavor: 'A debt paid in smaller wounds is still a debt.',
    lines: [
      { stat: 'ailmentStacks', kind: 'flat', range: [1, 1], tierScale: 0, tags: ['chaos'],
        text: '+{v0} to the stack limit of Chaos ailments you apply' },
      { stat: 'statusMagnitude', kind: 'increased', range: [0.1, 0.15], tags: ['chaos'] },
      { stat: 'chaosRes', kind: 'flat', range: [0.04, 0.06] },
    ],
  },
  {
    id: 'cracked_censer', name: 'The Cracked Censer', baseId: 'relic_idol', minIlvl: 10, weight: 24,
    flavor: 'Each blow rings one quiet note inside it.',
    lines: [
      { stat: procStat(guardRefrain.id), kind: 'flat', range: [0.7, 0.85], tierScale: 0,
        text: `{v%} chance on Block to restore ${guardRefrain.effect.pctMax * 100}% of maximum Poise (once per ${guardRefrain.icd}s)` },
      { stat: procPowerStat(guardRefrain.id), kind: 'increased', range: [0.2, 0.3],
        text: '{v%} increased Poise restored by Censer Refrain' },
      { stat: 'armor', kind: 'increased', range: [0.1, 0.15] },
    ],
  },
  {
    id: 'wayfarers_knot', name: "The Wayfarer's Knot", baseId: 'relic_charm', minIlvl: 8, weight: 24,
    flavor: 'Tie it before leaving. Untie it when the danger has passed.',
    lines: [
      { stat: procStat(wayfarer.id), kind: 'flat', range: [0.7, 0.85], tierScale: 0,
        text: `{v%} chance after using a Movement skill to gain ${wayfarer.effect.pctMaxLife * 100}% of maximum Life as Ward (once per ${wayfarer.icd}s)` },
      { stat: procPowerStat(wayfarer.id), kind: 'increased', range: [0.2, 0.3],
        text: "{v%} increased Ward from Wayfarer's Shelter" },
      { stat: 'moveSpeed', kind: 'increased', range: [0.03, 0.05] },
    ],
  },
  {
    id: 'widows_wick', name: "The Widow's Wick", baseId: 'relic_charm', minIlvl: 12, weight: 22,
    flavor: 'One flame for the gone. One ember for the next.',
    lines: [
      { stat: procStat(widow.id), kind: 'flat', range: [0.7, 0.85], tierScale: 0,
        text: `{v%} chance when one of your minions dies to restore ${widow.effect.pctMax * 100}% of maximum Mana (shared ${widow.icd}s cooldown)` },
      { stat: procPowerStat(widow.id), kind: 'increased', range: [0.2, 0.3],
        text: "{v%} increased Mana restored by Widow's Wick" },
      { stat: 'minionDamage', kind: 'increased', range: [0.08, 0.12] },
    ],
  },
  {
    id: 'wellspring_seal', name: 'The Wellspring Seal', baseId: 'relic_talisman', minIlvl: 10, weight: 24,
    flavor: 'What the vessel cannot hold, the seal remembers.',
    lines: [
      { stat: 'overheal', kind: 'flat', range: [0.25, 0.4],
        text: '{v%} of excess healing from your healing skills and Life restoration streams becomes a temporary absorb shield' },
      { stat: 'healPower', kind: 'increased', range: [0.08, 0.12] },
      { stat: 'life', kind: 'flat', range: [8, 12] },
    ],
  },
  {
    id: 'last_drop', name: 'The Last Drop', baseId: 'relic_charm', minIlvl: 6, weight: 25,
    flavor: 'The bottle emptied before the wound was made.',
    lines: [
      { stat: 'pourPrime', kind: 'flat', range: [1, 1], tierScale: 0, tags: ['flask'],
        text: 'Bank {v0} additional Flask pour at full resources; it releases on taking Life damage' },
      { stat: 'restorePower', kind: 'increased', range: [0.06, 0.1], tags: ['flask'] },
      { stat: 'lifeRegen', kind: 'flat', range: [1, 1.5] },
    ],
  },
  {
    id: 'needle_eye', name: 'The Needle Eye', baseId: 'relic_talisman', minIlvl: 12, weight: 22,
    flavor: 'Hold your nerve. There is room for one more thread.',
    lines: [
      { stat: 'pierceCount', kind: 'flat', range: [1, 1], tierScale: 0,
        tags: ['projectile'], when: 'notHurtRecently',
        text: 'Projectiles pierce {v0} additional target if you have not been hit recently' },
      { stat: 'projectileSpeed', kind: 'increased', range: [0.08, 0.12] },
      { stat: 'accuracy', kind: 'flat', range: [15, 25] },
    ],
  },
  {
    id: 'hollow_choir', name: 'The Hollow Choir', baseId: 'relic_effigy', minIlvl: 24, weight: 18,
    flavor: 'The empty voice waited for the others to draw breath.',
    lines: [
      { stat: 'durationAuraCap', kind: 'flat', range: [1, 1], tierScale: 0,
        text: '+{v0} maximum active Duration Auras' },
      { stat: 'effectDuration', kind: 'increased', range: [0.12, 0.2], tags: ['aura'] },
      { stat: 'manaRegen', kind: 'flat', range: [1, 2] },
    ],
  },
];
