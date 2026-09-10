import type { SkillDef, SkillTreeSpec } from '../engine/skills';
import type { MonsterDef } from './monsters';
import { mod } from '../engine/stats';
import { tree, n, life, damage, cap, count, haste, speed, size, dr, body, kit, aura } from './skillTreeBuilder';

/** The next four undead courts. Branches compose existing summon, combat,
 * aura, decay and death grammars; no skill IDs are read by engine code. */
export const UNDEAD_COURT_TREES: Record<string, SkillTreeSpec> = {
  summon_skeleton: tree([
    n('grave_phalanx', 'Grave Phalanx', 'Raise shield-bearing sentinels with a short defensive leash and a periodic taunting challenge. 25% increased life; 15% less damage taken.', [life(0.25), dr(0.15), mod('minionGuard', 'flat', 1)], { tags: { add: ['physical'] }, summon: { monsterId: 'skeletal_sentinel' } }),
    [n('interlocking_shields', 'Interlocking Shields', 'Sentinels gain 10% block chance and 5 Thorns.', undefined, body(mod('blockChance', 'flat', 0.1), mod('thorns', 'flat', 5))),
      n('barbed_lattice', 'Barbed Lattice', 'Sentinels inherit 35% of your Thorns and add half their Thorns to their hits as physical damage.', undefined, { summon: { crewInherit: [{ stat: 'thorns', fromStat: 'thorns', ratio: 0.35, kind: 'flat' }], crewMods: [mod('thornsToHit', 'flat', 0.5)] } }),
      n('oath_banner', 'Oath Banner', 'Bear a 120-radius banner granting nearby allies 20 armor and 8% block chance. Separate banners stack.', undefined, aura('sentinel_banner'))],
    [n('veteran_watch', 'Veteran Watch', '50% increased life and 15% increased size.', [life(0.5), size(0.15)]),
      n('last_watch', 'Last Watch', 'On true death, leave one half-size sentinel for 6 seconds, with 30% life and 50% damage. Up to four heirs; they cannot divide again. Dismissal does not trigger this.', undefined, { summon: { crewOnDeath: [{ do: 'summon', monster: 'skeletal_sentinel', count: 1, lifespan: 6, ring: 18, inheritSummon: { maxActive: 4, size: 0.5, life: 0.3, damage: 0.5 } }] } }),
      n('relief_guard', 'Relief Guard', 'Bear a 120-radius relief aura healing nearby allies for 1% of maximum life each second. Separate auras stack.', undefined, aura('sentinel_relief'))],
  ], [
    n('ossuary_duelists', 'Ossuary Duelists', 'Replace warriors with nimble duelists, up to three. Their quick twin cuts trade the phalanx for pursuit.', undefined, { tags: { add: ['physical'] }, summon: { monsterId: 'skeletal_duelist', maxActive: 3 } }),
    [n('flensing_edges', 'Flensing Edges', 'Duelist hits gain 35% chance to bleed and 20% increased damage.', [damage(0.2)], body(mod('apply_bleed', 'flat', 0.35))),
      n('open_veins', 'Open Veins', '50% increased physical ailment magnitude and 30% increased ailment duration.', undefined, body(mod('statusMagnitude', 'increased', 0.5, ['physical']), mod('effectDuration', 'increased', 0.3))),
      n('merciless_measure', 'Merciless Measure', 'Cull enemies below 8% life and gain 10% critical strike chance.', undefined, body(mod('cullThreshold', 'flat', 0.08), mod('critChance', 'flat', 0.1)))],
    [n('line_breakers', 'Line Breakers', 'Learn Bone Lunge: a piercing dash through the target on a 5-second cooldown.', undefined, kit('court_bone_lunge')),
      n('relentless_footwork', 'Relentless Footwork', 'Movement skills recover 50% faster; duelists move 25% faster.', [speed(0.25)], body(mod('cooldownRecovery', 'increased', 0.5, ['movement']))),
      n('dueling_pairs', 'Dueling Pairs', 'One additional duelist per cast and one additional slot, with 15% less life per body.', [count(1), cap(1), mod('minionLife', 'more', -0.15)])],
  ], n('tempered_bones', 'Tempered Bones', '15% increased minion life and damage.', [life(0.15), damage(0.15)])),

  raise_dead: tree([
    n('grave_levy', 'Grave Levy', 'Raise three random skeletons or zombies, up to eight, lasting 12 seconds. Expendable ranks deal 20% less damage and cost 25% more mana.', [mod('minionDamage', 'more', -0.2), mod('manaCost', 'more', 0.25)], { tags: { add: ['duration'] }, summon: { count: 3, maxActive: 8, duration: 12 } }),
    [n('fresh_draft', 'Fresh Draft', '40% increased duration and 25% increased life.', [mod('effectDuration', 'increased', 0.4), life(0.25)]),
      n('mass_graves', 'Mass Graves', 'Two additional bodies per cast and three additional slots; 20% more mana cost.', [count(2), cap(3), mod('manaCost', 'more', 0.2)]),
      n('funeral_tithe', 'Funeral Tithe', 'True deaths heal your other minions for 4 life. Expiry now counts as a true death.', [mod('minionDeathHealFlat', 'flat', 4), mod('minionExpiryIsDeath', 'flat', 1)])],
    [n('rotting_ranks', 'Rotting Ranks', 'Every levy bears an 80-radius stench: nearby enemies move 15% slower and lose 8% chaos resistance. Separate stenches stack.', undefined, aura('court_stench')),
      n('carrion_bearers', 'Carrion Bearers', 'Levy hits gain 40% chance to poison; poison magnitude increases by 35%.', undefined, body(mod('apply_poison', 'flat', 0.4), mod('statusMagnitude', 'increased', 0.35, ['chaos']))),
      n('last_service', 'Last Service', 'True deaths explode for 30% of minion maximum life as fire damage. Expiry counts as death.', [mod('minionExplodeDeath', 'flat', 0.3), mod('minionExpiryIsDeath', 'flat', 1)], { tags: { add: ['fire'] } })],
  ], [
    n('flesh_assembly', 'Flesh Assembly', 'Fuse the raising into one heavy abomination. It fights with claws and a broad physical slam; 40% more mana cost.', [mod('manaCost', 'more', 0.4)], { tags: { add: ['physical'] }, summon: { monsterId: 'court_abomination', count: 1, maxActive: 1 } }),
    [n('feasting_mass', 'Feasting Mass', 'Every 5 seconds, eat a nearby minion of another skill, healing for 12% of its maximum life. Each meal grants 8% increased damage for 12 seconds, up to five stacks. Sacrifice is a real death.', undefined, { summon: { devour: { interval: 5, radius: 180, heal: 0.12, mods: [mod('damage', 'increased', 0.08)], maxStacks: 5, duration: 12 } } }),
      n('rendered_vigor', 'Rendered Vigor', '50% increased life and 3 life regenerated per second.', [life(0.5), mod('minionRegen', 'flat', 3)]),
      n('borrowed_limbs', 'Borrowed Limbs', 'The abomination acts and moves 30% faster and recovers skills 30% faster.', [haste(0.3)], body(mod('cooldownRecovery', 'increased', 0.3)))],
    [n('stitched_carapace', 'Stitched Carapace', '20% increased size, 40 additional armor and 15% less damage taken.', [size(0.2), dr(0.15)], body(mod('armor', 'flat', 40))),
      n('sutured_refuge', 'Sutured Refuge', 'The abomination carries a 180-radius mending aura, healing nearby allies for 2% maximum life each second.', undefined, aura('ossuary_mending')),
      n('carrion_bloom', 'Carrion Bloom', 'True death explodes for 50% of maximum life as fire damage and heals your other minions for 8% of the fallen body\'s maximum life.', [mod('minionExplodeDeath', 'flat', 0.5), mod('minionDeathHeal', 'flat', 0.08)], { tags: { add: ['fire'] } })],
  ], n('gravecraft', 'Gravecraft', '20% increased minion life and 10% increased minion damage.', [life(0.2), damage(0.1)])),

  summon_raging_spirit: tree([
    n('frenzied_embers', 'Frenzied Embers', 'Raise three fire-biting assault skulls lasting 3.5 seconds, sharing the 20-spirit pool. 15% less damage per skull; 25% more mana cost.', [mod('minionDamage', 'more', -0.15), mod('manaCost', 'more', 0.25)], { summon: { monsterId: 'court_ember', count: 3, duration: 3.5 } }),
    [n('hunting_flame', 'Hunting Flame', '60% faster movement and 40% increased detection range.', [speed(0.6), mod('minionDetectionRange', 'increased', 0.4)]),
      n('many_mouths', 'Many Mouths', 'Two additional skulls per cast and six additional slots; 25% more mana cost.', [count(2), cap(6), mod('manaCost', 'more', 0.25)]),
      n('singe_halo', 'Singe Halo', 'Each skull burns nearby enemies with an 80-radius halo, dealing 3 base fire damage per second through its own minion scaling.', undefined, aura('court_ember_halo'))],
    [n('hotter_coals', 'Hotter Coals', '30% increased minion damage and 30% chance for skull hits to burn.', [damage(0.3)], body(mod('apply_burn', 'flat', 0.3))),
      n('cremation', 'Cremation', '50% increased fire ailment magnitude and 30% increased ailment duration.', undefined, body(mod('statusMagnitude', 'increased', 0.5, ['fire']), mod('effectDuration', 'increased', 0.3))),
      n('final_flare', 'Final Flare', 'Expiry counts as death; true deaths explode for 60% of skull maximum life as fire damage.', [mod('minionExpiryIsDeath', 'flat', 1), mod('minionExplodeDeath', 'flat', 0.6)])],
  ], [
    n('vigil_flames', 'Vigil Flames', 'Place a targetable, stationary fire sentry at your mark within 400 units. Raise one, up to three in the shared spirit pool, lasting 14 seconds. Sentries fire piercing bolts and never recall.', undefined, { summon: { monsterId: 'court_vigil_flame', count: 1, maxActive: 3, duration: 14, placeAt: { at: 'cursor', range: 400, scatter: 14 } } }),
    [n('banked_embers', 'Banked Embers', '40% increased duration and 50% increased life.', [mod('effectDuration', 'increased', 0.4), life(0.5)]),
      n('renewed_wick', 'Renewed Wick', 'Sentries regenerate 3 life per second and take 20% less damage.', [mod('minionRegen', 'flat', 3), dr(0.2)]),
      n('linked_braziers', 'Linked Braziers', 'One additional sentry per cast and two more slots; 15% less damage per sentry.', [count(1), cap(2), mod('minionDamage', 'more', -0.15)])],
    [n('focusing_lens', 'Focusing Lens', 'Sentry bolts pierce two additional enemies and travel 25% faster.', undefined, body(mod('pierceCount', 'flat', 2, ['projectile']), mod('projectileSpeed', 'increased', 0.25, ['projectile']))),
      n('forked_light', 'Forked Light', 'Fire one additional projectile, at 20% less projectile damage.', undefined, body(mod('projectileCount', 'flat', 1, ['projectile']), mod('damage', 'more', -0.2, ['projectile']))),
      n('furnace_watch', 'Furnace Watch', 'Sentries also learn a targeted Ignite on a 5-second cooldown.', undefined, kit('skeletal_ignite'))],
  ], n('kindled_will', 'Kindled Will', '20% increased minion damage.', [damage(0.2)])),

  summon_wraith: tree([
    n('hexwoven_shades', 'Hexwoven Shades', 'Raise ranged chaos-bolt hexers, up to four, with 25% increased damage. Their exponential decay still applies.', [damage(0.25)], { summon: { monsterId: 'court_hex_wraith', maxActive: 4 } }),
    [n('withering_words', 'Withering Words', 'Hexers learn a ground curse that lowers enemy chaos and elemental resistances for 4 seconds, on a 6-second cooldown.', undefined, kit('court_wraith_hex')),
      n('unraveling', 'Unraveling', '35% more chaos ailment magnitude and 30% increased ailment duration.', undefined, body(mod('statusMagnitude', 'more', 0.35, ['chaos']), mod('effectDuration', 'increased', 0.3))),
      n('echoed_malediction', 'Echoed Malediction', 'Curse areas are 50% wider and curse cooldowns recover 40% faster.', undefined, body(mod('aoeRadius', 'increased', 0.5, ['curse']), mod('cooldownRecovery', 'increased', 0.4, ['curse'])))],
    [n('hollow_channels', 'Hollow Channels', 'Decay drains life 25% more slowly; 25% increased life. Decay still compounds.', [mod('minionDecayRate', 'more', -0.25), life(0.25)]),
      n('soul_lantern', 'Soul Lantern', 'Carry a 150-radius veil reducing nearby enemies\' chaos resistance by 10%. Separate veils stack.', undefined, aura('court_soul_veil')),
      n('splintered_whispers', 'Splintered Whispers', 'Cast one additional projectile, with 20% less projectile damage.', undefined, body(mod('projectileCount', 'flat', 1, ['projectile']), mod('damage', 'more', -0.2, ['projectile'])))],
  ], [
    n('soul_reavers', 'Soul Reavers', 'Raise two close-combat wraiths with physical-and-chaos scythes, up to six. 15% less damage per reaver; exponential decay still applies.', [mod('minionDamage', 'more', -0.15)], { tags: { add: ['physical'] }, summon: { monsterId: 'court_reaper_wraith', count: 2 } }),
    [n('reaping_steps', 'Reaping Steps', 'Reavers learn a chaos dash through enemies on a 5-second cooldown.', undefined, kit('court_wraith_lunge')),
      n('long_shadow', 'Long Shadow', '35% increased area radius and 20% faster minions.', [haste(0.2)], body(mod('aoeRadius', 'increased', 0.35))),
      n('executioners_reach', 'Executioner\'s Reach', 'Cull enemies below 8% life and recover movement skills 40% faster.', undefined, body(mod('cullThreshold', 'flat', 0.08), mod('cooldownRecovery', 'increased', 0.4, ['movement'])))],
    [n('hungry_veil', 'Hungry Veil', '50% increased life and 20% slower decay drain. Decay still compounds.', [life(0.5), mod('minionDecayRate', 'more', -0.2)]),
      n('soul_siphon', 'Soul Siphon', 'Reavers leech 10% of hit damage as life and recover 2 life on hit. Sustenance delays decay but cannot stop its growth.', undefined, body(mod('lifeLeech', 'flat', 0.1), mod('lifeOnHit', 'flat', 2))),
      n('final_bequest', 'Final Bequest', '20% increased life. A true death heals your other minions for 8 life.', [life(0.2), mod('minionDeathHealFlat', 'flat', 8)])],
  ], n('unspent_echo', 'Unspent Echo', '20% increased minion life and 10% increased minion damage.', [life(0.2), damage(0.1)])),
};

export const UNDEAD_COURT_SKILLS: Record<string, SkillDef> = {
  court_challenge: {
    id: 'court_challenge', name: 'Sentinel Challenge', noDrop: true, description: 'A close shield knock taunts nearby foes.',
    tags: ['attack', 'physical', 'aoe'], color: '#cfc8b8', manaCost: 0, cooldown: 7, useTime: 0.4,
    baseDamage: { physical: [4, 6] }, delivery: { type: 'nova', radius: 100 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'taunted', chance: 1, durationOverride: 2 }], ai: { range: 95, rangeStat: 'aoeRadius', weight: 5 },
  },
  court_twin_cut: {
    id: 'court_twin_cut', name: 'Twin Cut', noDrop: true, description: 'Two light slashes delivered in a single motion.',
    tags: ['attack', 'melee', 'physical'], color: '#dfd7c8', manaCost: 0, cooldown: 0, useTime: 0.7,
    baseDamage: { physical: [4, 6] }, delivery: { type: 'melee', range: 52, arcDeg: 85 },
    aim: { sequence: { steps: [-15, 15], pause: 0.1 } }, effects: [{ type: 'damage' }], ai: { range: 55, weight: 2 },
  },
  court_bone_lunge: {
    id: 'court_bone_lunge', name: 'Bone Lunge', noDrop: true, description: 'Dash through a foe along a cutting line.',
    tags: ['attack', 'movement', 'melee', 'physical'], color: '#dfd7c8', manaCost: 0, cooldown: 5, useTime: 0.2,
    baseDamage: { physical: [7, 11] }, delivery: { type: 'dash', distance: 180, speed: 700, width: 30 },
    effects: [{ type: 'damage' }], ai: { range: 170, weight: 5, minRange: 65 },
  },
  court_abomination_slam: {
    id: 'court_abomination_slam', name: 'Abomination Slam', noDrop: true, description: 'A wide, slow blow from a stitched giant.',
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#aa8475', manaCost: 0, cooldown: 4, useTime: 0.9,
    baseDamage: { physical: [20, 28] }, delivery: { type: 'cone', range: 115, arcDeg: 150 },
    effects: [{ type: 'damage' }, { type: 'knockback', strength: 35 }], ai: { range: 110, rangeStat: 'aoeRadius', weight: 5 },
  },
  court_searing_bite: {
    id: 'court_searing_bite', name: 'Searing Bite', noDrop: true, description: 'A skull closes its burning jaws.',
    tags: ['attack', 'melee', 'fire'], color: '#ff8a4a', manaCost: 0, cooldown: 0, useTime: 0.5,
    baseDamage: { fire: [5, 8] }, delivery: { type: 'melee', range: 42, arcDeg: 90 }, effects: [{ type: 'damage' }], ai: { range: 45, weight: 2 },
  },
  court_vigil_bolt: {
    id: 'court_vigil_bolt', name: 'Vigil Bolt', noDrop: true, description: 'A piercing lance of watchful flame.',
    tags: ['spell', 'projectile', 'fire'], color: '#ffb46a', manaCost: 0, cooldown: 0, useTime: 1,
    baseDamage: { fire: [7, 11] }, delivery: { type: 'projectile', speed: 420, radius: 7, range: 500, pierce: 1 }, effects: [{ type: 'damage' }], ai: { range: 460, weight: 2 },
  },
  court_wraith_hex: {
    id: 'court_wraith_hex', name: 'Withering Words', noDrop: true, description: 'A wraith speaks a brief curse of despair.',
    tags: ['spell', 'curse', 'chaos', 'aoe', 'duration'], color: '#9a7ac8', manaCost: 0, cooldown: 6, useTime: 0.5,
    delivery: { type: 'ground', radius: 100, castRange: 440 }, effects: [{ type: 'status', status: 'despair', chance: 1, durationOverride: 4 }], ai: { range: 410, weight: 5, keepDistance: 260 },
  },
  court_reaping_edge: {
    id: 'court_reaping_edge', name: 'Reaping Edge', noDrop: true, description: 'An ethereal scythe cuts flesh and soul.',
    tags: ['attack', 'melee', 'physical', 'chaos', 'aoe'], color: '#9a7ac8', manaCost: 0, cooldown: 0, useTime: 0.8,
    baseDamage: { physical: [4, 6], chaos: [4, 6] }, delivery: { type: 'cone', range: 72, arcDeg: 130 }, effects: [{ type: 'damage' }], ai: { range: 68, rangeStat: 'aoeRadius', weight: 2 },
  },
  court_wraith_lunge: {
    id: 'court_wraith_lunge', name: 'Veil Reap', noDrop: true, description: 'The reaver cuts a path through the veil.',
    tags: ['attack', 'movement', 'melee', 'chaos'], color: '#9a7ac8', manaCost: 0, cooldown: 5, useTime: 0.2,
    baseDamage: { chaos: [8, 12] }, delivery: { type: 'dash', distance: 200, speed: 720, width: 32 }, effects: [{ type: 'damage' }], ai: { range: 185, weight: 5, minRange: 65 },
  },
  sentinel_banner: {
    id: 'sentinel_banner', name: 'Oath Banner', noDrop: true, description: 'The phalanx lends armor and blocking to its neighbors.',
    tags: ['spell', 'aura', 'buff', 'aoe'], color: '#cfc8b8', manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'aura', mode: 'toggle', aura: { radius: 120, allyMods: [mod('armor', 'flat', 20), mod('blockChance', 'flat', 0.08)] } }, effects: [],
  },
  sentinel_relief: {
    id: 'sentinel_relief', name: 'Relief Guard', noDrop: true, description: 'Steady care behind the shield line.',
    tags: ['spell', 'aura', 'buff', 'aoe', 'heal'], color: '#b4ce9a', manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'aura', mode: 'toggle', aura: { radius: 120, pulse: { interval: 1, healAllies: { base: 'maxLife', amount: 0.01 } } } }, effects: [],
  },
  court_stench: {
    id: 'court_stench', name: 'Grave Stench', noDrop: true, description: 'Rot slows nearby foes and exposes them to chaos.',
    tags: ['spell', 'aura', 'chaos', 'aoe'], color: '#9aa888', manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'aura', mode: 'toggle', aura: { radius: 80, enemyMods: [mod('moveSpeed', 'increased', -0.15), mod('chaosRes', 'flat', -0.08)] } }, effects: [],
  },
  court_ember_halo: {
    id: 'court_ember_halo', name: 'Singe Halo', noDrop: true, description: 'A narrow mantle of fire follows the skull.',
    tags: ['spell', 'aura', 'fire', 'aoe'], color: '#ff8a4a', manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'aura', mode: 'toggle', aura: { radius: 80, enemyDps: { amount: 3, type: 'fire' } } }, effects: [],
  },
  court_soul_veil: {
    id: 'court_soul_veil', name: 'Soul Lantern', noDrop: true, description: 'A close veil exposes enemies to chaos.',
    tags: ['spell', 'aura', 'chaos', 'aoe'], color: '#9a7ac8', manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'aura', mode: 'toggle', aura: { radius: 150, enemyMods: [mod('chaosRes', 'flat', -0.1)] } }, effects: [],
  },
};

export const UNDEAD_COURT_MINIONS: Record<string, MonsterDef> = {
  skeletal_sentinel: {
    id: 'skeletal_sentinel', name: 'Skeletal Sentinel', color: '#bfc9be', shape: 'ribcage', look: 'skeleton_warrior', material: 'bone', radius: 15, faction: 'undead', xp: 0,
    base: { life: 42, moveSpeed: 130, armor: 15, accuracy: 90, mana: 30, manaRegen: 4 }, skills: ['cleave', 'court_challenge'],
  },
  skeletal_duelist: {
    id: 'skeletal_duelist', name: 'Skeletal Duelist', color: '#dfd7c8', shape: 'ribcage', look: 'skeleton_warrior', material: 'bone', radius: 12, faction: 'undead', xp: 0,
    base: { life: 30, moveSpeed: 175, accuracy: 100, evasion: 50, mana: 20, manaRegen: 3 }, skills: ['court_twin_cut'], brain: { type: 'flanker' },
  },
  court_abomination: {
    id: 'court_abomination', name: 'Stitched Abomination', color: '#aa8475', shape: 'circle', look: 'zombie', material: 'flesh', radius: 26, faction: 'undead', xp: 0,
    base: { life: 220, moveSpeed: 95, armor: 20, accuracy: 90, mana: 30, manaRegen: 4 }, skills: ['claw', 'court_abomination_slam'],
  },
  court_ember: {
    id: 'court_ember', name: 'Frenzied Ember', color: '#ff8a4a', shape: 'circle', look: 'spirit', material: 'ethereal', radius: 8, xp: 0,
    base: { life: 18, moveSpeed: 230, accuracy: 95, mana: 0 }, skills: ['court_searing_bite'], untargetable: true, detection: 1.2, brain: { type: 'swarm' },
  },
  court_vigil_flame: {
    id: 'court_vigil_flame', name: 'Vigil Flame', color: '#ffb46a', shape: 'kite', look: 'spirit', material: 'ethereal', radius: 12, xp: 0,
    base: { life: 48, moveSpeed: 0, accuracy: 100, mana: 0 }, skills: ['court_vigil_bolt'], noRecall: true, detection: 1.3,
  },
  court_hex_wraith: {
    id: 'court_hex_wraith', name: 'Hexwoven Shade', color: '#9a7ac8', shape: 'kite', look: 'wraith', material: 'ethereal', radius: 12, faction: 'undead', xp: 0,
    base: { life: 85, moveSpeed: 145, accuracy: 95, mana: 60, manaRegen: 8 }, skills: ['venom_bolt'], detection: 1.1,
  },
  court_reaper_wraith: {
    id: 'court_reaper_wraith', name: 'Soul Reaver', color: '#b296da', shape: 'diamond', look: 'blade_wraith', material: 'ethereal', radius: 13, faction: 'undead', xp: 0,
    base: { life: 65, moveSpeed: 175, accuracy: 100, evasion: 45, mana: 20, manaRegen: 3 }, skills: ['court_reaping_edge'], brain: { type: 'flanker' },
  },
};
