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
  n('lich_ascendant', 'Lich Ascendant', 'Summons a single Lich (2.75s base cast time) that deals 120% more damage, casts Fireball and Gravefire Mortar, and can be commanded to cast Grand Rite. Additional maximum minion capacity grants 12% more damage per extra slot (up to 60%). Costs 40% more mana.',
    [mod('minionDamage', 'more', 1.2), mod('manaCost', 'more', 0.4)],
    { tags: { add: ['fire'] }, summon: { monsterId: 'ossuary_lich', count: 1, maxActive: 1,
      arts: { single: true, summonTime: 2.75, capacityPower: { base: 1, perSlot: 0.12, maximum: 0.6 },
        command: 'skeletal_grand_command', rite: 'skeletal_grand_rite', riteAutonomous: false } } }),
  [n('fused_intellect', 'Ritual Dominion', 'Grand Rite leaves a ritual field for 6 seconds. Lich primary hits inside the field trigger fiery flares (0.5s cooldown).',
    undefined, arts({ field: 'skeletal_ritual_dominion', flare: 'skeletal_ritual_flare', flareCooldown: 0.5 })),
    n('winter_crown', 'Winter Crown', 'Grand Rite creates a freezing border and a blizzard inside the ritual area that repeatedly strikes enemies with cold damage.',
      undefined, arts({ frost: 'skeletal_rite_boundary', blizzard: 'skeletal_rite_blizzard' })),
    n('storm_crown', 'Storm Crown', '50% increased Grand Rite cooldown recovery. Casting Grand Rite detonates the previous ritual site in a lightning burst.',
      undefined, arts({ detonation: 'skeletal_rite_rupture', riteRecovery: 0.5 }))],
  [n('deathless_regent', 'Bound Phylactery', 'When killed, the Lich leaves a phylactery with 35% of its maximum life that reconstructs the Lich after 8 seconds (30s cooldown). Nearby allied minion deaths store up to 8 souls for 12 seconds; Grand Rite consumes souls for 8% more damage per soul, or unspent souls reduce reconstruction time by 0.5 seconds each.',
    undefined, arts({ reconstruction: { monster: 'skeletal_phylactery', delay: 8, recovery: 30, life: 0.35,
      soulCap: 8, soulDuration: 12, soulRange: 420, soulPower: 0.08, soulRecovery: 0.5 } })),
    n('court_of_one', 'Ossuary Court', 'The Lich and its phylactery grant nearby allies 20% increased damage and 15% increased attack and cast speed.',
      undefined, { summon: { crewAuras: ['ossuary_command'] } }),
    n('plague_crown', 'Sovereign’s Echo', 'Your offensive spell casts cause the Lich to echo the spell at 65% damage (1.5s cooldown).',
      undefined, arts({ echo: { cooldown: 1.5, power: 0.65, deliveries: ['projectile', 'cone', 'nova', 'ground', 'storm', 'target'],
        requireTags: ['spell'], excludeTags: ['summon', 'minion', 'aura', 'movement'], targets: ['enemy'] } }))],
], [
  n('grave_academy', 'Grave Conclave', 'Summons 1 mage per cast (up to 2) with 20% increased minion action speed. Click this node to choose mage schools.',
    [haste(0.2)], arts({ schools: SKELETON_MAGE_SCHOOLS, balanceSchools: true, choicesLabel: 'Choose mage schools' })),
  [n('winter_curriculum', 'Spell Relay', 'Primary spell hits cause a nearby mage to follow up with its own primary spell at 45% damage (2s cooldown per mage).',
    undefined, arts({ relay: { range: 420, cooldown: 2, power: 0.45 } })),
    n('deep_winter', 'Concordant Souls', 'Relays between mages of the same school grant both mages a shield equal to 12% of their maximum life for 4 seconds.',
      undefined, arts({ concordance: { fraction: 0.12, duration: 4 } })),
    n('plague_curriculum', 'Discordant Souls', 'Relays between mages of different schools trigger a burst at the target combining both damage types.',
      undefined, arts({ discordance: 'skeletal_discordant_burst' }))],
  [n('storm_curriculum', 'Forbidden Lessons', 'Each school learns a signature spell: Ignite, Greater Ice Spear, Chain Lightning, or Essence Drain.',
    undefined, arts({ lessons: true })),
    n('rolling_thunder', 'Lingering Script', 'Signature spell hits leave an elemental ground effect for 3 seconds (up to 1 active ground per mage).',
      undefined, arts({ traces: true })),
    n('expanded_faculty', 'Communal Siphon', 'Signature spell and ailment damage heals the most injured nearby mage for 15% of damage dealt (up to 8% of maximum life per second).',
      undefined, arts({ siphon: { ratio: 0.15, perSecond: 0.08, range: 420 } }))],
], n('grave_studies', 'Grave Studies', '20% increased minion damage and 20% increased minion action speed.', [damage(0.2), haste(0.2)]));
