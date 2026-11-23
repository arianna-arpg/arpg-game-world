// ---------------------------------------------------------------------------
// PASSIVE EXPANSION — PASS 3: CULT & OBSCURE ARPG MECHANICS
// 27 wheels (3 per wedge, 138 nodes, 6 keystones, 3 procs) inspired by cult
// & classic ARPG systems (Sacred 1/2, Chronicon, The Slormancer, Victor Vran,
// Dungeon Siege 2, Wolcen, Nox, Hellgate: London, Torchlight 2, Din's Curse,
// Last Epoch, Lost Ark, V Rising, Shadowflare, Monster Hunter, Warframe).
// All names & themes are original to Hollow Wake.
// ---------------------------------------------------------------------------

import {
  gaugeMod as g,
  mod as m,
} from '../engine/stats';
import { n, procNode, type ExpansionCluster } from './passiveExpansionBase';

export const PASS3_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // INTELLIGENCE — PASS 3 (3 wheels, 19 nodes)
  // =========================================================================
  {
    id: 'exp_p3_int_sacred_burden', wedge: 'int', theme: 'arcana', shape: 'tiered', pass: 3,
    nodes: [
      n('entry', 'small', 'Inscribed Weight', '10% increased spell damage; +0.15s added cooldown to spells.', m('damage', 'increased', 0.10, ['spell']), m('addedCooldown', 'flat', 0.15, ['spell'])),
      n('a1', 'small', 'Unmarred Focus', '12% increased spell damage while you have not been hurt recently.', m('damage', 'increased', 0.12, ['spell'], 'notHurtRecently')),
      n('b1', 'small', 'Measured Cadence', '8% increased cooldown recovery rate; 6% increased spell damage.', m('cooldownRecovery', 'increased', 0.08), m('damage', 'increased', 0.06, ['spell'])),
      n('mid', 'notable', 'Unblemished Recitation', 'While you have not been hurt recently: 20% increased spell damage and +18% spell critical strike multiplier; 10% increased cooldown recovery rate.', m('damage', 'increased', 0.20, ['spell'], 'notHurtRecently'), m('critMulti', 'flat', 0.18, ['spell'], 'notHurtRecently'), m('cooldownRecovery', 'increased', 0.10)),
      n('a2', 'small', 'Deeply Graven', '12% increased spell area of effect; 8% increased spell damage.', m('aoeRadius', 'increased', 0.12, ['spell']), m('damage', 'increased', 0.08, ['spell'])),
      n('b2', 'small', 'Deliberate Syllables', '14% increased spell damage; +0.25s added cooldown to spells; 8% increased spell critical strike chance.', m('damage', 'increased', 0.14, ['spell']), m('addedCooldown', 'flat', 0.25, ['spell']), m('critChance', 'increased', 0.08, ['spell'])),
      n('', 'keystone', 'Heavy-Inscribed Art', '28% more spell damage; 12% more spell area of effect; +0.75s added cooldown to all spells.', m('damage', 'more', 0.28, ['spell']), m('aoeRadius', 'more', 0.12, ['spell']), m('addedCooldown', 'flat', 0.75, ['spell'])),
    ],
  },
  {
    id: 'exp_p3_int_orbital_orrery', wedge: 'int', theme: 'arcana', shape: 'fork', pass: 3,
    nodes: [
      n('entry', 'small', 'Celestial Gyro', '10% increased satellite orbit speed; 8% increased spell damage.', m('satelliteSpeed', 'increased', 0.10), m('damage', 'increased', 0.08, ['spell'])),
      n('a', 'small', 'Wide Epicycle', '14% increased satellite orbit radius; 8% increased projectile damage.', m('satelliteOrbit', 'increased', 0.14), m('damage', 'increased', 0.08, ['projectile'])),
      n('b', 'small', 'Spiraling Wake', '+0.6 expanding spiral flight on projectiles; 6% increased spell damage.', m('spiralPower', 'flat', 0.6), m('damage', 'increased', 0.06, ['spell'])),
      n('', 'notable', 'Astral Orrery', '+1 additional satellite to active satellite families; +1.2 orbiting flight on projectiles; 18% increased satellite orbit speed.', m('satelliteCount', 'flat', 1), m('orbitPower', 'flat', 1.2), m('satelliteSpeed', 'increased', 0.18)),
      n('tailA', 'notable', 'Tightening Gyre', '+1.0 tight forward-spin flight on projectiles; 25% increased satellite orbit speed; 12% increased projectile damage.', m('spinPower', 'flat', 1.0), m('satelliteSpeed', 'increased', 0.25), m('damage', 'increased', 0.12, ['projectile'])),
      n('tailB', 'notable', 'Planetary Crown', '25% increased satellite orbit radius; 18% increased satellite orbit speed; 14% increased spell damage.', m('satelliteOrbit', 'increased', 0.25), m('satelliteSpeed', 'increased', 0.18), m('damage', 'increased', 0.14, ['spell'])),
    ],
  },
  {
    id: 'exp_p3_int_walking_beam', wedge: 'int', theme: 'arcana', shape: 'fork', pass: 3,
    nodes: [
      n('entry', 'small', 'Gliding Stance', '+10% movement speed while channeling; +8% movement speed during cast times.', m('channelMobility', 'flat', 0.10), m('castMobility', 'flat', 0.08)),
      n('a', 'small', 'Gathering Stream', '12% increased channeled damage; channeled projectile skills spool +0.15 projectiles per second.', m('damage', 'increased', 0.12, ['channel']), m('channelSpool', 'flat', 0.15)),
      n('b', 'small', 'Anchored Focus', '10% increased cast speed while channeling; 8% increased channeled area of effect.', m('castSpeed', 'increased', 0.10, undefined, 'channeling'), m('aoeRadius', 'increased', 0.08, ['channel'])),
      n('', 'notable', 'Strolling Focus', '+20% movement speed while channeling; +15% movement speed during cast times; +0.10 channeled ramp rate.', m('channelMobility', 'flat', 0.20), m('castMobility', 'flat', 0.15), m('channelRamp', 'flat', 0.10)),
      n('tailA', 'notable', 'Lighthouse Beacon', 'Channeled skills persist for 1.5 seconds after release and automatically revolve (+0.8 spin); 15% increased channeled area of effect; channeled skills cost 15% more mana.', m('channelPersist', 'flat', 1.5), m('channelAutoSpin', 'flat', 0.8), m('aoeRadius', 'increased', 0.15, ['channel']), m('manaCost', 'more', 0.15, ['channel'])),
      n('tailB', 'notable', 'Spooling Barrage', 'Channeled projectile skills spool +0.35 projectiles per second and +0.10 per hit landed, with +2 higher spool cap; channeled skills cost 20% more mana.', m('channelSpool', 'flat', 0.35), m('channelHitSpool', 'flat', 0.10), m('channelSpoolCap', 'flat', 2), m('manaCost', 'more', 0.20, ['channel'])),
    ],
  },

  // =========================================================================
  // FINESSE — PASS 3 (3 wheels, 15 nodes)
  // =========================================================================
  {
    id: 'exp_p3_fin_slorm_apex', wedge: 'fin', theme: 'fortune', shape: 'tiered', pass: 3,
    nodes: [
      n('entry', 'small', 'Honed Edge', '+2% critical strike chance; +8% critical strike multiplier.', m('critChance', 'flat', 0.02), m('critMulti', 'flat', 0.08)),
      n('a1', 'small', 'Second Sight', '+3% apex strike chance; +8% critical strike multiplier.', m('overcritChance', 'flat', 0.03), m('critMulti', 'flat', 0.08)),
      n('b1', 'small', 'Razor Follow-Through', '+8% apex strike multiplier; 6% increased attack speed.', m('overcritMulti', 'flat', 0.08), m('attackSpeed', 'increased', 0.06)),
      n('mid', 'notable', 'Double-Edged Eye', '+7% apex strike chance; +15% apex strike multiplier; +3% critical strike chance.', m('overcritChance', 'flat', 0.07), m('overcritMulti', 'flat', 0.15), m('critChance', 'flat', 0.03)),
      n('a2', 'small', 'Cruel Precision', '+4% apex strike chance; +10% critical strike multiplier.', m('overcritChance', 'flat', 0.04), m('critMulti', 'flat', 0.10)),
      n('b2', 'small', 'Crowning Cut', '+10% apex strike multiplier; +2% critical strike chance.', m('overcritMulti', 'flat', 0.10), m('critChance', 'flat', 0.02)),
      n('', 'keystone', 'Apex Verdict', '+20% apex strike chance (critical hits can critically strike a second time); +25% apex strike multiplier; 12% less base damage.', m('overcritChance', 'flat', 0.20), m('overcritMulti', 'flat', 0.25), m('damage', 'more', -0.12)),
    ],
  },
  {
    id: 'exp_p3_fin_dive_bomb', wedge: 'fin', theme: 'guile', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Springing Heel', '8% increased movement skill cooldown recovery; 6% increased movement speed.', m('cooldownRecovery', 'increased', 0.08, ['movement']), m('moveSpeed', 'increased', 0.06)),
      n('a', 'small', 'Scorched Tracks', 'Movement skills leave a damaging trail (35% power); 10% increased movement skill damage.', m('moveTrail', 'flat', 0.35), m('damage', 'increased', 0.10, ['movement'])),
      n('b', 'small', 'Mist-Heel', '12% increased evasion; 5% increased movement speed; take 4% less damage while moving.', m('evasion', 'increased', 0.12), m('moveSpeed', 'increased', 0.05), m('damageTaken', 'more', -0.04, undefined, 'moving')),
      n('', 'notable', 'Trailblazer\'s Leap', 'Movement skills detonate on arrival (45% power) and splash on departure (35% power); 10% increased movement skill cooldown recovery; movement skills cost 20% more mana.', m('moveExplode', 'flat', 0.45), m('departSplash', 'flat', 0.35), m('cooldownRecovery', 'increased', 0.10, ['movement']), m('manaCost', 'more', 0.20, ['movement'])),
    ],
  },
  {
    id: 'exp_p3_fin_jinx_gambler', wedge: 'fin', theme: 'fortune', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Loaded Knuckle', '+6% lucky hit chance; +8% chance to inflict jinxed.', m('luckyChance', 'flat', 0.06), m('apply_jinxed', 'flat', 0.08)),
      n('a', 'small', 'Back-Alley Strike', '+8% ambush damage; +10% damage per jinxed stack on the target.', m('ambushBonus', 'flat', 0.08), m('damageVs_jinxed', 'flat', 0.10)),
      n('b', 'small', 'Ill Star', '+12% chance to inflict jinxed; +10% luck.', m('apply_jinxed', 'flat', 0.12), m('luck', 'flat', 0.10)),
      n('', 'notable', 'Crooked Dice', '+14% lucky hit chance; +22% chance to inflict jinxed; +16% ambush damage; +18% damage per jinxed stack on the target.', m('luckyChance', 'flat', 0.14), m('apply_jinxed', 'flat', 0.22), m('ambushBonus', 'flat', 0.16), m('damageVs_jinxed', 'flat', 0.18)),
    ],
  },

  // =========================================================================
  // CHARISMA — PASS 3 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p3_cha_bound_tithe', wedge: 'cha', theme: 'chorus', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Pledged Reserve', '+0.015 damage per point of reserved mana; +12 maximum mana.', m('reservedDamage', 'flat', 0.015), m('mana', 'flat', 12)),
      n('a', 'small', 'Tithed Veil', 'Gain 0.10 ward per mana spent; 8% increased ward gained.', m('costWard_mana', 'flat', 0.10), m('wardGain', 'increased', 0.08)),
      n('b', 'small', 'Trimmed Dues', '6% reduced mana cost of skills; 10% increased mana regeneration.', m('manaCost', 'increased', -0.06), m('manaRegen', 'increased', 0.10)),
      n('', 'notable', 'Sealed Tithe', '+0.035 damage per point of reserved mana; gain 0.25 ward per mana spent; +25% maximum life cost-ward cap; 8% reduced mana cost.', m('reservedDamage', 'flat', 0.035), m('costWard_mana', 'flat', 0.25), m('costWardCap', 'flat', 0.25), m('manaCost', 'increased', -0.08)),
    ],
  },
  {
    id: 'exp_p3_cha_destiny_hand', wedge: 'cha', theme: 'fortune', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Stacked Deck', '+6% high-roll window; +6% damage spread.', m('highRollWindow', 'flat', 0.06), m('damageSpread', 'flat', 0.06)),
      n('a', 'small', 'High Stakes', '+8% lucky hit chance; +10% damage spread.', m('luckyChance', 'flat', 0.08), m('damageSpread', 'flat', 0.10)),
      n('b', 'small', 'Charmed Draw', '+8% high-roll window; +10% luck.', m('highRollWindow', 'flat', 0.08), m('luck', 'flat', 0.10)),
      procNode('', 'notable', 'marked_deck', 'Marked Deck', 'Hits landing in the top 20% of their damage roll grant 20% increased attack and cast speed and 18% increased damage for 4 seconds; +12% high-roll window.', '#d3be8b', {
        trigger: 'hit', rollTop: 0.20, icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_marked_deck', duration: 4, mods: [m('attackSpeed', 'increased', 0.20), m('castSpeed', 'increased', 0.20), m('damage', 'increased', 0.18)] } },
      }, m('highRollWindow', 'flat', 0.12)),
    ],
  },
  {
    id: 'exp_p3_cha_free_company', wedge: 'cha', theme: 'chorus', shape: 'fork', pass: 3,
    nodes: [
      n('entry', 'small', 'Mustering Coin', '12% increased hired company vigor; 10% mercenary hire discount.', m('mercVigor', 'flat', 0.12), m('mercHireDiscount', 'flat', 0.10)),
      n('a', 'small', 'Banner Stipend', '12% increased hired company ease; +12 maximum life.', m('mercEase', 'flat', 0.12), m('life', 'flat', 12)),
      n('b', 'small', 'Shared Spoils', '6% of your life leech heals nearby allies; 8% increased aura area of effect.', m('vampiricShare', 'flat', 0.06), m('aoeRadius', 'increased', 0.08, ['aura'])),
      n('', 'notable', 'Captain\'s Charter', '+1 hired mercenary retinue slot; 25% increased hired company vigor; 20% mercenary hire discount.', m('mercRetinue', 'flat', 1), m('mercVigor', 'flat', 0.25), m('mercHireDiscount', 'flat', 0.20)),
      n('tailA', 'notable', 'Quartermaster\'s Ledger', '25% increased hired company ease; +1 Command Discipline; 15% increased aura area of effect.', m('mercEase', 'flat', 0.25), m('commandDiscipline', 'flat', 1), m('aoeRadius', 'increased', 0.15, ['aura'])),
      n('tailB', 'notable', 'Blood-Sworn Company', '16% of your life leech heals nearby allies and mercenaries; 15% increased company vigor; +1.5% life leech.', m('vampiricShare', 'flat', 0.16), m('mercVigor', 'flat', 0.15), m('lifeLeech', 'flat', 0.015)),
    ],
  },

  // =========================================================================
  // DEXTERITY — PASS 3 (3 wheels, 17 nodes)
  // =========================================================================
  {
    id: 'exp_p3_dex_trick_shot', wedge: 'dex', theme: 'ranged', shape: 'fork', pass: 3,
    nodes: [
      n('entry', 'small', 'Banked Shot', '10% increased projectile speed; 8% increased projectile damage.', m('projectileSpeed', 'increased', 0.10), m('damage', 'increased', 0.08, ['projectile'])),
      n('a', 'small', 'Gathering Velocity', '+0.25 projectile acceleration; 8% increased projectile damage.', m('projAccel', 'flat', 0.25), m('damage', 'increased', 0.08, ['projectile'])),
      n('b', 'small', 'Splinter Inheritance', '15% child flight inheritance for split projectiles; 8% increased projectile damage.', m('projInherit', 'flat', 0.15), m('damage', 'increased', 0.08, ['projectile'])),
      n('', 'notable', 'Carom Geometry', '+1 screen-edge projectile rebound with refreshed range; +1 terrain ricochet; +0.45 projectile acceleration.', m('projFrameBounce', 'flat', 1), m('projBounce', 'flat', 1), m('projAccel', 'flat', 0.45)),
      n('tailA', 'notable', 'Shatter Cascade', 'Projectile shrapnel re-triggers on each chain or fork; 30% child flight inheritance; 12% increased projectile damage.', m('projReShatter', 'flat', 1), m('projInherit', 'flat', 0.30), m('damage', 'increased', 0.12, ['projectile'])),
      n('tailB', 'notable', 'Guided Marionette', 'In-flight projectiles steer toward your cursor (+1.8 guided turn rate); 15% increased projectile speed; 10% increased projectile damage.', m('guidePower', 'flat', 1.8), m('projectileSpeed', 'increased', 0.15), m('damage', 'increased', 0.10, ['projectile'])),
    ],
  },
  {
    id: 'exp_p3_dex_firing_line', wedge: 'dex', theme: 'ranged', shape: 'tiered', pass: 3,
    nodes: [
      n('entry', 'small', 'Level Sights', '8% increased projectile damage; 10% tighter fan spread.', m('damage', 'increased', 0.08, ['projectile']), m('spreadAngle', 'increased', -0.10)),
      n('a1', 'small', 'Tight Ranks', '15% tighter parallel volley spacing; 8% increased projectile speed.', m('volleySpacing', 'increased', -0.15), m('projectileSpeed', 'increased', 0.08)),
      n('b1', 'small', 'Rapid Drill', '6% increased attack speed and cast speed with projectile skills.', m('attackSpeed', 'increased', 0.06, ['projectile']), m('castSpeed', 'increased', 0.06, ['projectile'])),
      n('mid', 'notable', 'Disciplined Drill', '15% tighter parallel volley spacing; 12% increased projectile speed; +12% chance for an extra projectile; 10% increased projectile damage.', m('volleySpacing', 'increased', -0.15), m('projectileSpeed', 'increased', 0.12), m('projectileCountChance', 'flat', 0.12), m('damage', 'increased', 0.10, ['projectile'])),
      n('a2', 'small', 'Dense Formation', '10% increased projectile damage; +10% chance for an extra projectile.', m('damage', 'increased', 0.10, ['projectile']), m('projectileCountChance', 'flat', 0.10)),
      n('b2', 'small', 'Concentrated Fire', '12% increased projectile area of effect; 10% increased projectile damage.', m('aoeRadius', 'increased', 0.12, ['projectile']), m('damage', 'increased', 0.10, ['projectile'])),
      n('', 'keystone', 'Broadside Rank', 'Projectiles fire in a parallel abreast volley with +1 additional projectile and 25% tighter spacing; 12% less projectile damage; 10% less attack and cast speed with projectile skills.', m('fireVolley', 'flat', 1), m('projectileCount', 'flat', 1), m('volleySpacing', 'increased', -0.25), m('damage', 'more', -0.12, ['projectile']), m('attackSpeed', 'more', -0.10, ['projectile']), m('castSpeed', 'more', -0.10, ['projectile'])),
    ],
  },
  {
    id: 'exp_p3_dex_random_flurry', wedge: 'dex', theme: 'ranged', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Loose Quiver', '+10% chance for an extra projectile; 15% wider fan spread.', m('projectileCountChance', 'flat', 0.10), m('spreadAngle', 'increased', 0.15)),
      n('a', 'small', 'Scatter Sweep', '20% wider random-strike arc; 10% increased projectile damage.', m('randomArc', 'increased', 0.20), m('damage', 'increased', 0.10, ['projectile'])),
      n('b', 'small', 'Scattered Drop', '10% increased projectile area of effect; 8% increased projectile damage.', m('aoeRadius', 'increased', 0.10, ['projectile']), m('damage', 'increased', 0.08, ['projectile'])),
      n('', 'notable', 'Ring of Lead', 'Projectiles fire evenly in a 360-degree nova; +15% chance for an extra projectile; 15% increased projectile speed; 10% less projectile damage.', m('projNova', 'flat', 1), m('projectileCountChance', 'flat', 0.15), m('projectileSpeed', 'increased', 0.15), m('damage', 'more', -0.10, ['projectile'])),
    ],
  },

  // =========================================================================
  // STRENGTH — PASS 3 (3 wheels, 17 nodes)
  // =========================================================================
  {
    id: 'exp_p3_str_spark_release', wedge: 'str', theme: 'impact', shape: 'tiered', pass: 3,
    nodes: [
      n('entry', 'small', 'Drawn Breath', '10% increased held and overcharge skill damage; +0.05s spark release window.', m('damage', 'increased', 0.10, ['cast:held']), m('sparkWindow', 'flat', 0.05)),
      n('a1', 'small', 'Coiled Steel', '+8% spark release bonus; 8% increased physical damage.', m('sparkBonus', 'flat', 0.08), m('damage', 'increased', 0.08, ['physical'])),
      n('b1', 'small', 'Patient Grip', '10% increased poise damage; 8% increased melee damage.', m('poiseDamage', 'increased', 0.10), m('damage', 'increased', 0.08, ['melee'])),
      n('mid', 'notable', 'Timed Release', '+1 overcharge stage; +0.10s spark release window; +15% spark release bonus.', m('overchargeStages', 'flat', 1), m('sparkWindow', 'flat', 0.10), m('sparkBonus', 'flat', 0.15)),
      n('a2', 'small', 'Crowning Heft', '+10% spark release bonus; 10% increased physical damage.', m('sparkBonus', 'flat', 0.10), m('damage', 'increased', 0.10, ['physical'])),
      n('b2', 'small', 'Steady Release', '+0.06s spark release window; 10% increased held and overcharge skill damage.', m('sparkWindow', 'flat', 0.06), m('damage', 'increased', 0.10, ['cast:held'])),
      n('', 'keystone', 'Perfect Apex', '+2 overcharge stages; +35% spark release bonus; 25% less attack speed.', m('overchargeStages', 'flat', 2), m('sparkBonus', 'flat', 0.35), m('attackSpeed', 'more', -0.25)),
    ],
  },
  {
    id: 'exp_p3_str_battering_physics', wedge: 'str', theme: 'impact', shape: 'fork', pass: 3,
    nodes: [
      n('entry', 'small', 'Heavy Shoulder', '+25 knockback strength; +10% collision impact damage.', m('knockback', 'flat', 25), m('impactDamage', 'flat', 0.10)),
      n('a', 'small', 'Iron Grasp', '+14% grip power; grabbed enemies suffer 1% of maximum life per second as physical crushing damage.', m('gripPower', 'flat', 0.14), m('gripCrush', 'flat', 0.01)),
      n('b', 'small', 'Ram-Shoulder Stride', '+1.8 trample mass; 12% increased body weight.', m('trample', 'flat', 1.8), m('weight', 'increased', 0.12)),
      n('', 'notable', 'Wall-Breaker\'s Shove', '+0.25 shove authority; +20% collision impact damage; knockback buffets enemies unpredictably.', m('shoveAuthority', 'flat', 0.25), m('impactDamage', 'flat', 0.20), m('knockBuffet', 'flat', 1)),
      n('tailA', 'notable', 'Wringing Hold', 'Grabbed enemies suffer 2.5% of maximum life per second as physical crushing damage; +22% grip power; 18% increased damage against seized enemies.', m('gripCrush', 'flat', 0.025), m('gripPower', 'flat', 0.22), m('damage', 'increased', 0.18, ['vs:grabbed'])),
      n('tailB', 'notable', 'Trampling Momentum', '+3.5 trample mass; +50 knockback strength; 25% increased body weight; +15% collision impact damage.', m('trample', 'flat', 3.5), m('knockback', 'flat', 50), m('weight', 'increased', 0.25), m('impactDamage', 'flat', 0.15)),
    ],
  },
  {
    id: 'exp_p3_str_slayer_hunter', wedge: 'str', theme: 'impact', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Tendon Cutter', '6% more damage against monster parts; 8% increased physical damage.', m('limbreaver', 'flat', 0.06), m('damage', 'increased', 0.08, ['physical'])),
      n('a', 'small', 'Siege Hammer', '6% more damage against immobile bodies; 10% increased poise damage.', m('siegebreaker', 'flat', 0.06), m('poiseDamage', 'increased', 0.10)),
      n('b', 'small', 'Exhaustion Blow', '6% more damage against spent enemies; +6% armor penetration.', m('spentbane', 'flat', 0.06), m('armorPen', 'flat', 0.06)),
      n('', 'notable', 'Anatomist\'s Maul', '12% more damage against monster parts, 12% more against immobile bodies, and 12% more against spent enemies; 15% increased poise damage.', m('limbreaver', 'flat', 0.12), m('siegebreaker', 'flat', 0.12), m('spentbane', 'flat', 0.12), m('poiseDamage', 'increased', 0.15)),
    ],
  },

  // =========================================================================
  // FORTITUDE — PASS 3 (3 wheels, 17 nodes)
  // =========================================================================
  {
    id: 'exp_p3_for_aegis_dome', wedge: 'for', theme: 'bastion', shape: 'fork', pass: 3,
    nodes: [
      n('entry', 'small', 'Warded Rim', '12% increased absorb shield power; 10% increased ward gained.', m('absorbPower', 'increased', 0.12), m('wardGain', 'increased', 0.10)),
      n('a', 'small', 'Siphoning Wall', '+1% ward leech; 10% increased guard strength.', m('wardLeech', 'flat', 0.01), m('guardStrength', 'increased', 0.10)),
      n('b', 'small', 'Battering Rim', '14% increased shield bash power; +25 armor.', m('bashPower', 'increased', 0.14), m('armor', 'flat', 25)),
      n('', 'notable', 'Mirror Rampart', 'Protective domes deflect enemy projectiles outward; 22% increased absorb power; 16% increased ward gained.', m('domeDeflects', 'flat', 1), m('absorbPower', 'increased', 0.22), m('wardGain', 'increased', 0.16)),
      n('tailA', 'notable', 'Cracked-Edge Bash', 'Shield Bash scaling inverts to strike harder as your guard bar empties; 20% increased shield bash power; 10% reduced guard strength.', m('bashInvert', 'flat', 1), m('bashPower', 'increased', 0.20), m('guardStrength', 'increased', -0.10)),
      n('tailB', 'notable', 'Leeching Bulwark', '+2% of hit damage leeched as ward; 14% slower ward decay; 15% increased guard strength.', m('wardLeech', 'flat', 0.02), m('wardDecay', 'more', -0.14), m('guardStrength', 'increased', 0.15)),
    ],
  },
  {
    id: 'exp_p3_for_primed_fount', wedge: 'for', theme: 'life', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Quick Stopper', '12% increased surge flask recovery; +3% maximum life/mana added to surge pours.', m('pourPower_surge', 'increased', 0.12), m('pourPct_surge', 'flat', 0.03)),
      n('a', 'small', 'Steady Draught', '14% increased gradual flask settle recovery; +10% maximum restoration.', m('pourPower_settle', 'increased', 0.14), m('restorePctMax', 'flat', 0.10)),
      n('b', 'small', 'Open Flask', '10% increased flask restoration power; 10% increased flask duration; 8% increased healing power.', m('restorePower', 'increased', 0.10, ['flask']), m('effectDuration', 'increased', 0.10, ['flask']), m('healPower', 'increased', 0.08)),
      n('', 'notable', 'Wrist-Bound Fount', '25% chance on blocking a hit to restore +1 charge to a non-full flask (1s cooldown); 18% increased armor and +6 (+1.2 per level) block value if you have been healed recently; +0.6s "Recently" window.', m('flaskBlockCharge', 'flat', 0.25), m('armor', 'increased', 0.18, undefined, 'recentlyHealed'), m('blockValue', 'flat', 6, undefined, 'recentlyHealed'), g('blockValue', 'flat', 1.2, 'level', undefined, 'recentlyHealed'), m('recentlyWindow', 'flat', 0.6)),
    ],
  },
  {
    id: 'exp_p3_for_hit_cap', wedge: 'for', theme: 'bastion', shape: 'tiered', pass: 3,
    nodes: [
      n('entry', 'small', 'Dense Marrow', '+20 maximum life; +25 armor.', m('life', 'flat', 20), m('armor', 'flat', 25)),
      n('a1', 'small', 'Shock Buffer', '6% of incoming hit damage staggered over time; +12 maximum life.', m('staggerFrac', 'flat', 0.06), m('life', 'flat', 12)),
      n('b1', 'small', 'Broad Ribs', '+16 maximum life; +10% critical strike avoidance.', m('life', 'flat', 16), m('critAvoid', 'flat', 0.10)),
      n('mid', 'notable', 'Braced Threshold', '12% of incoming hit damage staggered over time; +20% critical strike avoidance; +35 maximum life.', m('staggerFrac', 'flat', 0.12), m('critAvoid', 'flat', 0.20), m('life', 'flat', 35)),
      n('a2', 'small', 'Deadened Nerve', '+20 maximum life; +1 (+0.18 per level) flat incoming hit damage reduction.', m('life', 'flat', 20), m('flatHitReduction', 'flat', 1), g('flatHitReduction', 'flat', 0.18, 'level')),
      n('b2', 'small', 'Calcified Frame', '8% increased maximum life; +10% crowd-control avoidance while poised.', m('life', 'increased', 0.08), m('poiseCcAvoid', 'flat', 0.10)),
      n('', 'keystone', 'Stone Threshold', '55% of landed hit damage exceeding 30% of your maximum life is diverted into Stagger over time; -20% ailment resistance; 15% less armor.', m('burstStaggerPct', 'flat', 0.55), m('ailmentResist', 'flat', -0.20), m('armor', 'more', -0.15)),
    ],
  },

  // =========================================================================
  // PROWESS — PASS 3 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p3_prw_chronicon_frenzy', wedge: 'prw', theme: 'tempo', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Rising Cadence', '6% increased attack speed; 4% increased movement speed.', m('attackSpeed', 'increased', 0.06), m('moveSpeed', 'increased', 0.04)),
      n('a', 'small', 'Driving Tempo', '6% increased attack speed; +8% critical strike multiplier.', m('attackSpeed', 'increased', 0.06), m('critMulti', 'flat', 0.08)),
      n('b', 'small', 'Sustained Beat', '10% increased buff skill duration; 6% increased melee damage.', m('effectDuration', 'increased', 0.10, ['buff']), m('damage', 'increased', 0.06, ['melee'])),
      procNode('', 'notable', 'escalating_tempo', 'Escalating Tempo', 'Landing hits builds Escalating Tempo (up to 10 stacks, 3s), granting 3% increased attack speed and 3% increased damage per stack; 6% increased attack speed.', '#d49a8e', {
        trigger: 'hit', icd: 0.35,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_escalating_tempo', duration: 3, maxStacks: 10, mods: [m('attackSpeed', 'increased', 0.03), m('damage', 'increased', 0.03)] } },
      }, m('attackSpeed', 'increased', 0.06)),
    ],
  },
  {
    id: 'exp_p3_prw_riposte_master', wedge: 'prw', theme: 'tempo', shape: 'fork', pass: 3,
    nodes: [
      n('entry', 'small', 'Sweeping Blade', '10% wider melee swing arc; 8% increased melee reach.', m('swingArc', 'increased', 0.10), m('meleeReach', 'increased', 0.08)),
      n('a', 'small', 'Parry Window', '+0.10s guard parry window; 10% increased guard parry power.', m('guardParry', 'flat', 0.10), m('guardParryPower', 'increased', 0.10)),
      n('b', 'small', 'Quick Retort', '+0.25 parry counterattack damage ratio; 6% increased attack speed.', m('parryCounterBonus', 'flat', 0.25), m('attackSpeed', 'increased', 0.06)),
      n('', 'notable', 'Razor Counter', '+0.20s guard parry window; 25% increased guard parry power; +0.60 parry counterattack ratio from parried damage.', m('guardParry', 'flat', 0.20), m('guardParryPower', 'increased', 0.25), m('parryCounterBonus', 'flat', 0.60)),
      n('tailA', 'notable', 'Lightning Riposte', '40% shorter parry counterattack cooldown; 15% increased melee attack speed.', m('parryDamageCooldown', 'more', -0.40), m('attackSpeed', 'increased', 0.15, ['melee'])),
      n('tailB', 'notable', 'Grand Sweep', '25% wider melee swing arc; 18% increased melee reach; 12% increased melee damage.', m('swingArc', 'increased', 0.25), m('meleeReach', 'increased', 0.18), m('damage', 'increased', 0.12, ['melee'])),
    ],
  },
  {
    id: 'exp_p3_prw_bond_breaker', wedge: 'prw', theme: 'tempo', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Upward Duel', '6% more damage against higher-level enemies; 8% increased accuracy.', m('overmatch', 'flat', 0.06), m('accuracy', 'increased', 0.08)),
      n('a', 'small', 'Ward Piercer', '6% more damage against warded enemies; +5% armor penetration.', m('bondbreaker', 'flat', 0.06), m('armorPen', 'flat', 0.05)),
      n('b', 'small', 'Merciless Press', '6% more damage against faltering enemies; 8% increased melee damage.', m('quailbane', 'flat', 0.06), m('damage', 'increased', 0.08, ['melee'])),
      n('', 'notable', 'Sever the Favor', '12% more damage against higher-level enemies, 12% more against warded enemies, and 12% more against faltering enemies; 12% increased accuracy.', m('overmatch', 'flat', 0.12), m('bondbreaker', 'flat', 0.12), m('quailbane', 'flat', 0.12), m('accuracy', 'increased', 0.12)),
    ],
  },

  // =========================================================================
  // WILLPOWER — PASS 3 (3 wheels, 17 nodes)
  // =========================================================================
  {
    id: 'exp_p3_wil_sanguine_shell', wedge: 'wil', theme: 'entropy', shape: 'tiered', pass: 3,
    nodes: [
      n('entry', 'small', 'Hollow Vein', '+5% low-life threshold; 10% increased ward gained.', m('lowLifeLine', 'flat', 0.05), m('wardGain', 'increased', 0.10)),
      n('a1', 'small', 'Stale Ward', '8% slower ward decay; +12 maximum energy shield.', m('wardDecay', 'more', -0.08), m('energyShield', 'flat', 12)),
      n('b1', 'small', 'Thinned Blood', '4% increased ward gained per 10% missing life.', g('wardGain', 'increased', 0.04, 'life:missing')),
      procNode('mid', 'notable', 'bleeding_vessel', 'Bleeding Vessel', 'Every 2.5 seconds while on low life, gain 8% of maximum life as ward; 5% increased ward gained per 10% missing life.', '#ce8793', {
        trigger: 'pulse', every: 2.5, when: 'lowLife',
        effect: { type: 'ward', pctMaxLife: 0.08 },
      }, g('wardGain', 'increased', 0.05, 'life:missing')),
      n('a2', 'small', 'Dry Husk', '8% slower ward decay; 10% increased chaos damage.', m('wardDecay', 'more', -0.08), m('damage', 'increased', 0.10, ['chaos'])),
      n('b2', 'small', 'Brink Alchemy', '+6% low-life threshold; 12% increased ward gained while on low life.', m('lowLifeLine', 'flat', 0.06), m('wardGain', 'increased', 0.12, undefined, 'lowLife')),
      n('', 'keystone', 'Exsanguinated Shell', '+18% low-life threshold; 22% slower ward decay; 30% increased ward gained; 35% less healing received.', m('lowLifeLine', 'flat', 0.18), m('wardDecay', 'more', -0.22), m('wardGain', 'increased', 0.30), m('healTaken', 'more', -0.35)),
    ],
  },
  {
    id: 'exp_p3_wil_pendulum_tithe', wedge: 'wil', theme: 'entropy', shape: 'fork', pass: 3,
    nodes: [
      n('entry', 'small', 'Shifting Ledger', '15% of skill life costs paid as mana instead; 10% increased conduit efficiency.', m('costToMana', 'flat', 0.15), m('conduitEfficiency', 'increased', 0.10)),
      n('a', 'small', 'Rising Tide', '14% faster gathering gauge fill rate; 12% slower gauge decay.', m('brimFill', 'increased', 0.14), m('brimDecay', 'more', -0.12)),
      n('b', 'small', 'Patient Fuse', '14% increased fused detonation power; 10% increased duration skill damage.', m('fusePower', 'increased', 0.14), m('damage', 'increased', 0.10, ['duration'])),
      n('', 'notable', 'Dual-Tide Ledger', '35% of skill life costs paid as mana instead; 25% faster conduit transfer rate; 25% increased conduit efficiency.', m('costToMana', 'flat', 0.35), m('conduitRate', 'increased', 0.25), m('conduitEfficiency', 'increased', 0.25)),
      n('tailA', 'notable', 'Overflowing Brim', '25% faster gathering gauge fill rate; 30% increased full-gauge payoff power; 25% slower gauge decay.', m('brimFill', 'increased', 0.25), m('brimPower', 'increased', 0.30), m('brimDecay', 'more', -0.25)),
      n('tailB', 'notable', 'Shortened Fuse', '25% shorter fused detonation delay; 30% increased fused detonation power.', m('fuseDelay', 'more', -0.25), m('fusePower', 'increased', 0.30)),
    ],
  },
  {
    id: 'exp_p3_wil_whirling_sigil', wedge: 'wil', theme: 'arcana', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Inscribed Ring', '8% increased area of effect; +1 rune sequence capacity.', m('aoeRadius', 'increased', 0.08), m('runeCap', 'flat', 1)),
      n('a', 'small', 'Spinning Glyph', '10% increased area of effect; 8% increased spell damage.', m('aoeRadius', 'increased', 0.10), m('damage', 'increased', 0.08, ['spell'])),
      n('b', 'small', 'Longer Chain', '+1 rune sequence capacity; 8% increased effect duration.', m('runeCap', 'flat', 1), m('effectDuration', 'increased', 0.08)),
      n('', 'notable', 'Revolving Geometry', 'Directional areas revolve continuously (+1.2 spin); +2 rune sequence capacity; 14% increased area of effect.', m('aoeSpin', 'flat', 1.2), m('runeCap', 'flat', 2), m('aoeRadius', 'increased', 0.14)),
    ],
  },

  // =========================================================================
  // WISDOM — PASS 3 (3 wheels, 12 nodes)
  // =========================================================================
  {
    id: 'exp_p3_wis_tether_chorus', wedge: 'wis', theme: 'nature', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Linked Vein', '12% increased tether damage; 8% of your damage heals bonded companions.', m('tetherDamage', 'increased', 0.12), m('bondShare', 'flat', 0.08)),
      n('a', 'small', 'Broad Beam', '18% wider tether beams; 10% increased minion life.', m('tetherWidth', 'increased', 0.18), m('minionLife', 'increased', 0.10)),
      n('b', 'small', 'Siphoning Bond', '10% of your damage heals bonded companions; 10% increased companion damage.', m('bondShare', 'flat', 0.10), m('damage', 'increased', 0.10, ['companion'])),
      n('', 'notable', 'Taut Symbiosis', '30% increased tether damage; 35% wider tether beams; 22% of your damage heals bonded companions.', m('tetherDamage', 'increased', 0.30), m('tetherWidth', 'increased', 0.35), m('bondShare', 'flat', 0.22)),
    ],
  },
  {
    id: 'exp_p3_wis_remnant_harvester', wedge: 'wis', theme: 'arcana', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Fallen Spark', '+4% chance on hit to spawn an elemental remnant; 10% increased resource orb shedding rate.', m('remnantChance', 'flat', 0.04), m('orbShedRate', 'increased', 0.10)),
      n('a', 'small', 'Echoed Residue', '+5% chance on elemental cast to spawn a matching remnant; 8% increased spell damage.', m('remnantOnCast', 'flat', 0.05), m('damage', 'increased', 0.08, ['spell'])),
      n('b', 'small', 'Bountiful Shed', '12% increased resource orb shedding rate; +12 maximum mana.', m('orbShedRate', 'increased', 0.12), m('mana', 'flat', 12)),
      n('', 'notable', 'Remnant Harvester', '+12% chance on elemental cast to spawn a matching remnant; 16% increased minion damage if you have been healed recently; +0.5s "Recently" window.', m('remnantOnCast', 'flat', 0.12), m('minionDamage', 'increased', 0.16, undefined, 'recentlyHealed'), m('recentlyWindow', 'flat', 0.5)),
    ],
  },
  {
    id: 'exp_p3_wis_swarm_sequence', wedge: 'wis', theme: 'host', shape: 'diamond', pass: 3,
    nodes: [
      n('entry', 'small', 'Forward Scouts', '18% increased minion aggro detection range; 8% increased minion movement speed.', m('minionDetectionRange', 'increased', 0.18), m('minionMoveSpeed', 'increased', 0.08)),
      n('a', 'small', 'Eager Column', '10% increased minion action speed; 8% increased minion damage.', m('minionHaste', 'increased', 0.10), m('minionDamage', 'increased', 0.08)),
      n('b', 'small', 'Broad Perimeter', '20% increased minion aggro detection range; 10% increased minion life.', m('minionDetectionRange', 'increased', 0.20), m('minionLife', 'increased', 0.10)),
      n('', 'keystone', 'Cascading Muster', 'Multi-summon casts march minions out sequentially; +1 additional summon per cast; 25% increased minion aggro detection range; summon skills cost 30% more mana and have 15% less cast speed.', m('summonSequence', 'flat', 1), m('summonCount', 'flat', 1), m('minionDetectionRange', 'increased', 0.25), m('manaCost', 'more', 0.30, ['summon']), m('castSpeed', 'more', -0.15, ['summon'])),
    ],
  },
];
