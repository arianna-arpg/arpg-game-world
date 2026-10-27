import { tree, n, damage, haste } from './skillTreeBuilder';
import { mod } from '../engine/stats';
import type { SummonArtsSpec, SummonSchool } from '../engine/summonArtsSpec';

export const SKELETON_MAGE_SCHOOLS: SummonSchool[] = [
  { id: 'fire', name: 'Fire', monster: 'skeletal_pyromancer', primary: 'skeletal_fire_bolt', signature: 'skeletal_ignite', trace: 'skeletal_fire_script' },
  { id: 'cold', name: 'Cold', monster: 'skeletal_cryomancer', primary: 'skeletal_ice_spear', signature: 'skeletal_greater_ice_spear', trace: 'skeletal_cold_script' },
  { id: 'lightning', name: 'Lightning', monster: 'skeletal_stormcaller', primary: 'skeletal_lightning_bolt', signature: 'skeletal_chain_lightning', trace: 'skeletal_lightning_script' },
  { id: 'chaos', name: 'Venom', monster: 'skeletal_venomancer', primary: 'skeletal_chaos_bolt', signature: 'skeletal_essence_drain', trace: 'skeletal_chaos_script' },
];
const arts = (value: SummonArtsSpec) => ({ summon: { arts: value } });
export const SKELETON_MAGE_TREE = tree([
  n('lich_ascendant', 'Lich Ascendant', 'Raise one Lich with 120% more damage. Its initial summon takes 2.75 seconds before cast speed. While it lives, this skill commands Grand Rite instead of replacing it. Extra summon capacity grants 12% more damage per slot, capped at 60%. 40% more mana cost.',
    [mod('minionDamage', 'more', 1.2), mod('manaCost', 'more', 0.4)],
    { tags: { add: ['fire'] }, summon: { monsterId: 'ossuary_lich', count: 1, maxActive: 1,
      arts: { single: true, summonTime: 2.75, capacityPower: { base: 1, perSlot: 0.12, maximum: 0.6 },
        command: 'skeletal_grand_command', rite: 'skeletal_grand_rite' } } }),
  [n('fused_intellect', 'Ritual Dominion', 'Grand Rite leaves a ritual field for 6 seconds. Lich primary hits inside it kindle flares, at most once every 0.5 seconds.',
    undefined, arts({ field: 'skeletal_ritual_dominion', flare: 'skeletal_ritual_flare', flareCooldown: 0.5 })),
    n('winter_crown', 'Winter Crown', 'Grand Rite gains a freezing boundary and a blizzard within the ritual. Remaining inside invites repeated cold strikes.',
      undefined, arts({ frost: 'skeletal_rite_boundary', blizzard: 'skeletal_rite_blizzard' })),
    n('storm_crown', 'Storm Crown', 'Grand Rite recovers 50% faster. Casting a new rite first detonates the previous ritual site in lightning and consumes its lingering fields.',
      undefined, arts({ detonation: 'skeletal_rite_rupture', riteRecovery: 0.5 }))],
  [n('deathless_regent', 'Bound Phylactery', 'On combat death, leave a vulnerable phylactery with 35% of the Lich’s maximum life. Rebuild in 8 seconds; 30-second rearm. Nearby combat deaths or sacrifices of your other minions bank up to 8 souls for 12 seconds each. Commanded rites consume souls for 8% more damage each; unspent souls reduce reconstruction by 0.5 seconds each.',
    undefined, arts({ reconstruction: { monster: 'skeletal_phylactery', delay: 8, recovery: 30, life: 0.35,
      soulCap: 8, soulDuration: 12, soulRange: 420, soulPower: 0.08, soulRecovery: 0.5 } })),
    n('court_of_one', 'Ossuary Court', 'The Lich and its rebuilding phylactery empower nearby allies with 20% increased damage and 15% increased attack and cast speed.',
      undefined, { summon: { crewAuras: ['ossuary_command'] } }),
    n('plague_crown', 'Sovereign’s Echo', 'Every 1.5 seconds, the Lich may echo one of your offensive spells at 65% power. It uses your spell’s level, tree and compatible supports, with the Lich’s damage stats. Echoes cannot echo or relay.',
      undefined, arts({ echo: { cooldown: 1.5, power: 0.65, deliveries: ['projectile', 'cone', 'nova', 'ground', 'storm', 'target'],
        requireTags: ['spell'], excludeTags: ['summon', 'minion', 'aura', 'movement'], targets: ['enemy'] } }))],
], [
  n('grave_academy', 'Grave Conclave', 'Raise two mages, up to four. Choose their schools in this skill tree; new summons favor underrepresented selected schools. 20% faster minions.',
    [haste(0.2)], arts({ schools: SKELETON_MAGE_SCHOOLS, balanceSchools: true })),
  [n('winter_curriculum', 'Spell Relay', 'A primary spell hit invites one nearby mage to reply with its own primary at 45% power. Each recipient can reply once per 2 seconds. A cast invites only one reply, and replies cannot relay.',
    undefined, arts({ relay: { range: 420, cooldown: 2, power: 0.45 } })),
    n('deep_winter', 'Concordant Souls', 'A same-school relay wards both mages for 12% of their maximum life for 4 seconds. Each mage holds one such ward.',
      undefined, arts({ concordance: { fraction: 0.12, duration: 4 } })),
    n('plague_curriculum', 'Discordant Souls', 'A cross-school relay bursts at the target, combining both participating schools’ damage types.',
      undefined, arts({ discordance: 'skeletal_discordant_burst' }))],
  [n('storm_curriculum', 'Forbidden Lessons', 'Teach a signature spell to each selected school: targeted Ignite, Greater Ice Spear, Chain Lightning, or Essence Drain. Signatures have separate cooldowns and support compatibility.',
    undefined, arts({ lessons: true })),
    n('rolling_thunder', 'Lingering Script', 'Signature hits leave an elemental field for 3 seconds. Each mage maintains only one inscription; one field per signature cast.',
      undefined, arts({ traces: true })),
    n('expanded_faculty', 'Communal Siphon', 'Signature damage, including its ailments, heals the most injured nearby Conclave mage for 15% of damage dealt. Each caster can restore at most 8% of its maximum life per second.',
      undefined, arts({ siphon: { ratio: 0.15, perSecond: 0.08, range: 420 } }))],
], n('grave_studies', 'Grave Studies', '20% increased minion damage and 20% faster minions.', [damage(0.2), haste(0.2)]));
