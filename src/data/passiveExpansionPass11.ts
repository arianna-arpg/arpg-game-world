// ---------------------------------------------------------------------------
// PASS 11 — Elemental Arsenal & Kinetic Contraptions (9 wheels, 49 nodes, 6 Keystones)
//
// Inspired by iconic kinetic hero-kit mechanics (Skylanders-style rolling
// trample, bone-shield cleave retribution, volatile potion beast-mode,
// escalating wall-ricochet geometry, straw decoys, crystal prism refraction
// through totems, phoenix departure/arrival wake, channel-born homing effigies,
// and mending squall clouds) — grounded in Hollow Wake's dark-fantasy world.
// ---------------------------------------------------------------------------

import { gaugeMod as g, mod as m } from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS11_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — Rolling Monolith (Continuous Contact Trample Engine)
  // =========================================================================
  {
    id: 'exp_p11_str_juggernaut_roll', wedge: 'str', theme: 'impact', shape: 'keystoneTail', pass: 11,
    nodes: [
      n('entry', 'small', 'Battering Gait', 'Moving continuously crushes nearby enemies for 6 (+1.5 per level) physical impact damage (0.35s per-target ICD).', m('trampleContactDps', 'flat', 6), g('trampleContactDps', 'flat', 1.5, 'level')),
      n('a', 'small', 'Iron Momentum', '+6 (+1.5 per level) Rolling Contact Trample damage; 4% increased movement speed.', m('trampleContactDps', 'flat', 6), g('trampleContactDps', 'flat', 1.5, 'level'), m('moveSpeed', 'increased', 0.04)),
      n('b', 'small', 'Shatter-Stride', '10% increased poise damage; 10% increased armor.', m('poiseDamage', 'increased', 0.10), m('armor', 'increased', 0.10)),
      n('', 'notable', 'Stone Juggernaut', '+10 (+2.5 per level) Rolling Contact Trample damage with knockback and poise break; 16% increased armor while moving.', m('trampleContactDps', 'flat', 10), g('trampleContactDps', 'flat', 2.5, 'level'), m('armor', 'increased', 0.16, undefined, 'moving')),
      n('tail', 'keystone', 'Rolling Monolith', 'Moving continuously bowls through foes for 18 (+4.5 per level) + 8% of your Armor as physical impact damage with knockback and poise break; gain Phasing while moving; 25% less attack speed while stationary.', m('trampleContactDps', 'flat', 18), g('trampleContactDps', 'flat', 4.5, 'level'), m('phasing', 'flat', 1, undefined, 'moving'), m('attackSpeed', 'more', -0.25, undefined, 'stationary')),
    ],
  },

  // =========================================================================
  // FORTITUDE — Ossuary Aegis (Block-Banked Vampiric Blade Wave)
  // =========================================================================
  {
    id: 'exp_p11_for_ossuary_aegis', wedge: 'for', theme: 'bastion', shape: 'keystoneTail', pass: 11,
    nodes: [
      n('entry', 'small', 'Bone Buckler', 'Blocking or parrying banks Bone-Shield Charges (up to 5); your next attack spends them for 6 (+1.5 per level) cleave damage per charge.', m('blockBladeSlash', 'flat', 6), g('blockBladeSlash', 'flat', 1.5, 'level')),
      n('a', 'small', 'Serrated Rim', '+6 (+1.5 per level) Bone-Shield cleave damage per charge; +3% block chance.', m('blockBladeSlash', 'flat', 6), g('blockBladeSlash', 'flat', 1.5, 'level'), m('blockChance', 'flat', 0.03)),
      n('b', 'small', 'Vampiric Bulwark', '4% increased armor per Bone-Shield Charge; +8% guard strength.', g('armor', 'increased', 0.04, 'aegisCharges'), m('guardStrength', 'increased', 0.08)),
      n('', 'notable', 'Crypt-Guard Riposte', '+10 (+2.5 per level) Bone-Shield cleave damage per banked charge (18% life leech); +5% block chance.', m('blockBladeSlash', 'flat', 10), g('blockBladeSlash', 'flat', 2.5, 'level'), m('blockChance', 'flat', 0.05)),
      n('tail', 'keystone', 'Ossuary Retribution', 'Blocking or parrying banks up to 5 Bone-Shield Charges; your next attack consumes them in a sweeping 145px vampiric blade wave dealing 16 (+4 per level) physical and chaos damage per charge (18% life leech); +8% block chance; 20% less attack damage while holding 0 charges.', m('blockBladeSlash', 'flat', 16), g('blockBladeSlash', 'flat', 4.0, 'level'), m('blockChance', 'flat', 0.08), m('damage', 'more', -0.20, ['attack']), g('damage', 'more', 0.05, 'aegisCharges', ['attack'])),
    ],
  },

  // =========================================================================
  // PROWESS — Volatile Elixir / Beast-Draught (Flask Transformation Engine)
  // =========================================================================
  {
    id: 'exp_p11_prw_alchemical_hyde', wedge: 'prw', theme: 'tempo', shape: 'keystoneTail', pass: 11,
    nodes: [
      n('entry', 'small', 'Bitter Tincture', 'Drinking a Flask triggers 6s of Feral Draught (+30% transformation power for melee damage, speed, and area).', m('flaskBeastMode', 'flat', 0.30)),
      n('a', 'small', 'Feral Pulse', '+25% Feral Draught transformation power; 8% increased melee attack speed.', m('flaskBeastMode', 'flat', 0.25), m('attackSpeed', 'increased', 0.08, ['melee'])),
      n('b', 'small', 'Unstable Phial', '12% increased flask restoration speed; 10% increased melee area of effect.', m('restorePower', 'increased', 0.12, ['flask']), m('aoeRadius', 'increased', 0.10, ['melee'])),
      n('', 'notable', 'Alchemical Frenzy', '+45% Feral Draught transformation power on Flask use; slaying 3 enemies during Feral Draught prevents the 3s Hangover; +10% melee damage.', m('flaskBeastMode', 'flat', 0.45), m('damage', 'increased', 0.10, ['melee'])),
      n('tail', 'keystone', 'Beast of the Alembic', 'Drinking any Flask transforms you into Feral Draught (+100% power: +24%+ more melee damage, +20%+ speed and area for 6s; 3 kills clears the Hangover); Flasks restore 40% less direct Life and Mana.', m('flaskBeastMode', 'flat', 1.00), m('restorePower', 'more', -0.40, ['flask'])),
    ],
  },

  // =========================================================================
  // DEXTERITY — Brass Carom (Escalating Wall-Bounce / Chain / Fork Engine)
  // =========================================================================
  {
    id: 'exp_p11_dex_ricochet_vault', wedge: 'dex', theme: 'ranged', shape: 'keystoneTail', pass: 11,
    nodes: [
      n('entry', 'small', 'Carom Primer', 'Projectiles deal 6% more hit damage per wall bounce, chain, or fork completed (up to 6).', m('bounceDamageScale', 'flat', 0.06)),
      n('a', 'small', 'Angled Rifling', '+6% more projectile damage per bounce, chain, or fork; 10% increased projectile speed.', m('bounceDamageScale', 'flat', 0.06), m('projectileSpeed', 'increased', 0.10)),
      n('b', 'small', 'Ricochet Chamber', '+1 projectile wall bounce; 8% increased projectile damage.', m('projBounce', 'flat', 1), m('damage', 'increased', 0.08, ['projectile'])),
      n('', 'notable', 'Vaulting Ricochet', '+1 projectile wall bounce; projectiles deal +10% more hit damage per wall bounce, chain, or fork completed (up to 6).', m('projBounce', 'flat', 1), m('bounceDamageScale', 'flat', 0.10)),
      n('tail', 'keystone', 'Brass Carom', '+2 projectile wall bounces; projectiles deal +22% more hit damage for each bounce, chain, or fork completed (up to 6); projectiles deal 25% less hit damage before their first bounce, chain, or fork.', m('projBounce', 'flat', 2), m('bounceDamageScale', 'flat', 0.22), m('bounceFirstPenalty', 'flat', 0.25)),
    ],
  },

  // =========================================================================
  // FINESSE — Wicker Decoy (Evade / Movement Taunting Blade Lure)
  // =========================================================================
  {
    id: 'exp_p11_fin_wicker_decoy', wedge: 'fin', theme: 'guile', shape: 'fork', pass: 11,
    nodes: [
      n('entry', 'small', 'Straw Substitute', 'Evading or using a movement skill (3.5s ICD) leaves a taunting Wicker Decoy that bursts after 1.4s for 8 (+2 per level) physical damage and grants 1.5s concealment.', m('evadeDecoyBurst', 'flat', 8), g('evadeDecoyBurst', 'flat', 2.0, 'level')),
      n('a', 'small', 'Hidden Needles', '+8 (+2 per level) Wicker Decoy blade detonation damage; 8% increased evasion.', m('evadeDecoyBurst', 'flat', 8), g('evadeDecoyBurst', 'flat', 2.0, 'level'), m('evasion', 'increased', 0.08)),
      n('b', 'small', 'Briar Snare', '10% increased area of effect; +10% ambush damage.', m('aoeRadius', 'increased', 0.10), m('ambushBonus', 'flat', 0.10)),
      n('', 'notable', 'Wicker Effigy', '+14 (+3.5 per level) Wicker Decoy blade detonation damage; decoys gently pull nearby foes inward and grant 1.5s of Shadow Concealment (+25% ambush & phasing).', m('evadeDecoyBurst', 'flat', 14), g('evadeDecoyBurst', 'flat', 3.5, 'level')),
      n('tailA', 'notable', 'Spinning Razor-Lure', '+16 (+4 per level) Wicker Decoy detonation damage; 15% increased area of effect; +10% bleed chance.', m('evadeDecoyBurst', 'flat', 16), g('evadeDecoyBurst', 'flat', 4.0, 'level'), m('aoeRadius', 'increased', 0.15), m('apply_bleed', 'flat', 0.10)),
      n('tailB', 'notable', 'Smoke-Step Reprise', '+20% ambush damage; 12% increased cooldown recovery rate with movement skills; 14% increased evasion.', m('ambushBonus', 'flat', 0.20), m('cooldownRecovery', 'increased', 0.12, ['movement']), m('evasion', 'increased', 0.14)),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — Prismatic Pillar (Construct / Totem Projectile Refraction)
  // =========================================================================
  {
    id: 'exp_p11_int_prism_refract', wedge: 'int', theme: 'arcana', shape: 'keystoneTail', pass: 11,
    nodes: [
      n('entry', 'small', 'Faceted Lens', '10% increased spell projectile damage; 10% increased construct and totem life.', m('damage', 'increased', 0.10, ['projectile', 'spell']), m('minionLife', 'increased', 0.10)),
      n('a', 'small', 'Crystal Focus', 'Projectiles passing through your Totems or Constructs refract into +1 angled prism bolt (65% damage, +15% penetration).', m('constructRefract', 'flat', 1)),
      n('b', 'small', 'Aligned Obelisk', '+5% fire, cold, and lightning penetration with projectile skills; 10% faster totem placement.', m('firePen', 'flat', 0.05, ['projectile']), m('coldPen', 'flat', 0.05, ['projectile']), m('lightningPen', 'flat', 0.05, ['projectile']), m('totemPlaceTime', 'increased', -0.10)),
      n('', 'notable', 'Refracting Obelisk', 'Projectiles passing through your own Totems or Constructs refract once per construct into +1 extra angled prism bolt (65% damage, +15% damage amplification); +1 maximum construct.', m('constructRefract', 'flat', 1), m('constructMaxCount', 'flat', 1)),
      n('tail', 'keystone', 'Prismatic Pillar', 'Projectiles passing through your own Totems or Constructs refract into +2 angled prism bolts (+15% amplified impact, once per construct); +1 maximum construct; your projectiles cannot fork naturally.', m('constructRefract', 'flat', 2), m('constructMaxCount', 'flat', 1), m('forkCount', 'override', 0)),
    ],
  },

  // =========================================================================
  // WILLPOWER — Phoenix Wake (Departure + Arrival Fire Nova & Ignited Line)
  // =========================================================================
  {
    id: 'exp_p11_wil_phoenix_wake', wedge: 'wil', theme: 'fire', shape: 'fork', pass: 11,
    nodes: [
      n('entry', 'small', 'Cinder-Step', 'Movement skills erupt in fire novas at departure and arrival for 8 (+2 per level) spell fire damage.', m('phoenixBlinkNova', 'flat', 8), g('phoenixBlinkNova', 'flat', 2.0, 'level')),
      n('a', 'small', 'Blazing Trail', '+8 (+2 per level) Phoenix departure and arrival nova damage; +8% burn chance.', m('phoenixBlinkNova', 'flat', 8), g('phoenixBlinkNova', 'flat', 2.0, 'level'), m('apply_burn', 'flat', 0.08)),
      n('b', 'small', 'Scorched Return', '10% increased fire area of effect; 8% increased cooldown recovery rate with movement skills.', m('aoeRadius', 'increased', 0.10, ['fire']), m('cooldownRecovery', 'increased', 0.08, ['movement'])),
      n('', 'notable', 'Twin-Pyre Arrival', '+14 (+3.5 per level) Phoenix departure and arrival fire nova damage plus an ignited wake between both points; hitting enemies at both ends refunds 25% of the movement skill\'s cooldown.', m('phoenixBlinkNova', 'flat', 14), g('phoenixBlinkNova', 'flat', 3.5, 'level')),
      n('tailA', 'notable', 'Ember-Pinion', '+16 (+4 per level) Phoenix nova damage; +10% fire penetration; +15% burn chance.', m('phoenixBlinkNova', 'flat', 16), g('phoenixBlinkNova', 'flat', 4.0, 'level'), m('firePen', 'flat', 0.10), m('apply_burn', 'flat', 0.15)),
      n('tailB', 'notable', 'Ashen Recall', '18% increased cooldown recovery rate with movement skills; 14% increased fire area of effect; +12% fire resistance.', m('cooldownRecovery', 'increased', 0.18, ['movement']), m('aoeRadius', 'increased', 0.14, ['fire']), m('fireRes', 'flat', 0.12)),
    ],
  },

  // =========================================================================
  // WISDOM — Loom of Living Idols (Channel-Born Homing Volatile Effigies)
  // =========================================================================
  {
    id: 'exp_p11_wis_effigy_swarm', wedge: 'wis', theme: 'host', shape: 'keystoneTail', pass: 11,
    nodes: [
      n('entry', 'small', 'Carved Spur', 'Channeling periodically births homing Volatile Effigies (+0.35 spawn rate) that detonate for minion-scaled chaos damage.', m('channelEffigyRate', 'flat', 0.35)),
      n('a', 'small', 'Idol Cadence', '+0.35 Channel-Born Volatile Effigy spawn rate; 8% increased minion damage.', m('channelEffigyRate', 'flat', 0.35), m('minionDamage', 'increased', 0.08)),
      n('b', 'small', 'Hollow Kiln', '10% increased minion death-effect power; +8% movement speed while channeling.', m('minionDeathEffectPower', 'increased', 0.10), m('channelMobility', 'flat', 0.08)),
      n('', 'notable', 'Effigy Spinner', '+0.65 Channel-Born Volatile Effigy spawn rate (up to 3 active); 12% increased minion death-effect power.', m('channelEffigyRate', 'flat', 0.65), m('minionDeathEffectPower', 'increased', 0.12)),
      n('tail', 'keystone', 'Loom of Living Idols', 'Channeling continuously births homing Volatile Effigies (+1.45 spawn rate, up to 4 active) that detonate for 20 (+5 per level) minion-scaled chaos damage; 18% increased minion death-effect power; your own channeled skills deal 30% less direct hit damage.', m('channelEffigyRate', 'flat', 1.45), m('minionDeathEffectPower', 'increased', 0.18), m('damage', 'more', -0.30, ['channel'])),
    ],
  },

  // =========================================================================
  // CHARISMA — Tempest Squall (Dual-Purpose Zap & Ally-Mend Storm Clouds)
  // =========================================================================
  {
    id: 'exp_p11_cha_tempest_rain', wedge: 'cha', theme: 'lightning', shape: 'fork', pass: 11,
    nodes: [
      n('entry', 'small', 'Gathering Mist', 'Casting a Cold, Lightning, Song, or Storm skill (4s ICD) conjures a 4s Squall Cloud pulsing 6 (+1.5 per level) damage to foes and mending allies inside.', m('tempestMendPulse', 'flat', 6), g('tempestMendPulse', 'flat', 1.5, 'level')),
      n('a', 'small', 'Silver Rain', '+6 (+1.5 per level) Squall Cloud zap and mend power; 8% increased healing power.', m('tempestMendPulse', 'flat', 6), g('tempestMendPulse', 'flat', 1.5, 'level'), m('healPower', 'increased', 0.08)),
      n('b', 'small', 'Charged Front', '10% increased area of effect; 8% increased cold and lightning damage.', m('aoeRadius', 'increased', 0.10), m('damage', 'increased', 0.08, ['cold']), m('damage', 'increased', 0.08, ['lightning'])),
      n('', 'notable', 'Gathering Squall', '+12 (+3 per level) Squall Cloud pulse power; clouds zap enemies for split cold and lightning damage while mending you, allies, and minions for 55% of their pulse.', m('tempestMendPulse', 'flat', 12), g('tempestMendPulse', 'flat', 3.0, 'level')),
      n('tailA', 'notable', 'Benevolent Cloudburst', '+12 (+3 per level) Squall Cloud power; 16% increased healing power; 12% increased aura and song area of effect.', m('tempestMendPulse', 'flat', 12), g('tempestMendPulse', 'flat', 3.0, 'level'), m('healPower', 'increased', 0.16), m('aoeRadius', 'increased', 0.12, ['song']), m('aoeRadius', 'increased', 0.12, ['aura'])),
      n('tailB', 'notable', 'Dual-Arc Tempest', '+12 (+3 per level) Squall Cloud power; +8% cold and lightning penetration; +10% shock and chill chance.', m('tempestMendPulse', 'flat', 12), g('tempestMendPulse', 'flat', 3.0, 'level'), m('coldPen', 'flat', 0.08), m('lightningPen', 'flat', 0.08), m('apply_shock', 'flat', 0.10), m('apply_chill', 'flat', 0.10)),
    ],
  },
];
