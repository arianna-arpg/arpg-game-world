// ---------------------------------------------------------------------------
// PASSIVE EXPANSION — PASS 9: CROSS-ENGINE HYBRID BRIDGES & DISTINCT ENGINES
// 18 wheels (2 per wedge, 78 nodes, 5 true one-way PoE-style Keystones)
// weaving Pass 7 & Pass 8 engines together with ZERO duplicate stat copies:
//   - Sundering Shockwave (Poise-Break x Armor Crush & Ply Rend)
//   - Crimson Equilibrium (Voluntary Trauma 'wounds' x Leech & Recuperation)
//   - Deflected Recuperation (Graze x Endurance & Recuperation)
//   - Anchored Momentum (Kinetic Inertia -> Defensive Damage Reduction)
//   - Breaker's Hemorrhage (Poise-Break x Bleed & Felling Strike)
//   - Sword-Dance Counterpoint (Harmonic Pitch x Combo Tempo & Double Damage)
//   - Astral Sightline (Excess Accuracy 'accOver' -> Spell Crit Mastery)
//   - Skirmisher's Drift (Non-Consuming Inertia x Projectile Speed, Far-Shot & Graze)
//   - Venom-Cull Finisher (Ailment Expiry Rupture x Culling & Afflicted Crit)
//   - Glancing Riposte (Graze x Counter-Crit & Ambush)
//   - Chronometric Reservoir (Cooldown-Weight x Skill Charges & Spell AoE)
//   - Shatter-Prism Resonance (ES Shred x Elemental Penetration vs Shocked/Chilled)
//   - Sanguine Scythe (Voluntary Trauma 'wounds' x Alchemical Reap)
//   - Usurious Wake (Temporal Debt x Overkill Cascade, Zero Leech)
//   - Scar-Bound Shepherd (Owner 'wounds' -> Minion Scaling + Minion-to-Owner Leech)
//   - Funeral Pyre Bridge & Ember-Fed Rupture (Tether-Burn & Shared-ICD Minion Fire Pulse)
//   - Symphonic Retinue (Harmonic Pitch synced live to Minions + Minion Leech)
//   - Measured Interval (Cooldown-Weight x Skill Charges & Ward-on-Spend)
// ---------------------------------------------------------------------------

import {
  gaugeMod as g,
  mod as m,
} from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS9_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — PASS 9 (2 wheels, 8 nodes)
  // =========================================================================
  {
    id: 'exp_p9_str_poise_overkill', wedge: 'str', theme: 'impact', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Breach Spillover', '10% increased poise damage; +6% armor penetration against poise-broken enemies.', m('poiseDamage', 'increased', 0.10), m('armorPen', 'flat', 0.06, ['vs:poiseBroken'])),
      n('a', 'small', 'Staggered Crush', '15% increased sunder duration; 8% increased melee physical damage.', m('sunderDuration', 'increased', 0.15), m('damage', 'increased', 0.08, ['melee', 'physical'])),
      n('b', 'small', 'Shatter Carry', 'Breaking enemy poise unleashes a shockwave for 15% of max poise; 8% increased area of effect.', m('poiseOverflow', 'flat', 0.15), m('aoeRadius', 'increased', 0.08)),
      n('', 'notable', 'Sundering Shockwave', 'Breaking enemy poise unleashes a shockwave for 20% of max poise; melee hits rend +1 additional ply and penetrate 15% armor against poise-broken enemies; 20% increased sunder duration.', m('poiseOverflow', 'flat', 0.20), m('plyRend', 'flat', 1, ['melee']), m('armorPen', 'flat', 0.15, ['vs:poiseBroken']), m('sunderDuration', 'increased', 0.20)),
    ],
  },
  {
    id: 'exp_p9_str_trauma_overleech', wedge: 'str', theme: 'life', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Opened Vein', 'Skill casts inflict 2% of maximum life as voluntary trauma; recover 10% of hit damage taken over time.', m('traumaCost', 'flat', 0.02), m('recuperate', 'flat', 0.10)),
      n('a', 'small', 'Blood-Wound Mend', '12% increased healing received while on low life; 2% increased ward gained per recent wound stack.', m('healTaken', 'increased', 0.12, undefined, 'lowLife'), g('wardGain', 'increased', 0.02, 'wounds')),
      n('b', 'small', 'Scarred Appetite', '+1.5% of hit damage leeched as life; 2% increased melee damage per recent wound stack.', m('lifeLeech', 'flat', 0.015), g('damage', 'increased', 0.02, 'wounds', ['melee'])),
      n('', 'notable', 'Crimson Equilibrium', 'Recover 18% of hit damage taken over time; 18% increased healing received while on low life; +0.15% life leeched per recent wound stack.', m('recuperate', 'flat', 0.18), m('healTaken', 'increased', 0.18, undefined, 'lowLife'), g('lifeLeech', 'flat', 0.0015, 'wounds')),
    ],
  },

  // =========================================================================
  // FORTITUDE — PASS 9 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p9_for_stagger_graze', wedge: 'for', theme: 'bastion', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Glancing Toll', '+8% Graze chance; +15 maximum endurance.', m('grazeChance', 'flat', 0.08), m('endurance', 'flat', 15)),
      n('a', 'small', 'Turned Payment', '+5% Graze damage reduction; recover 10% of hit damage taken over time.', m('grazeMitigation', 'flat', 0.05), m('recuperate', 'flat', 0.10)),
      n('b', 'small', 'Cushioned Brace', '+3% endurance damage reduction; 12% increased endurance recovery.', m('enduranceDR', 'flat', 0.03), m('enduranceRegenPct', 'increased', 0.12)),
      n('', 'notable', 'Deflected Recuperation', '+12% Graze chance; +6% Graze damage reduction; recover 18% of hit damage taken over time; +35 maximum endurance and +5% endurance damage reduction.', m('grazeChance', 'flat', 0.12), m('grazeMitigation', 'flat', 0.06), m('recuperate', 'flat', 0.18), m('endurance', 'flat', 35), m('enduranceDR', 'flat', 0.05)),
    ],
  },
  {
    id: 'exp_p9_for_inertia_guard', wedge: 'for', theme: 'bastion', shape: 'keystoneTail', pass: 9,
    nodes: [
      n('entry', 'small', 'Planted Brace', '30% faster Kinetic Inertia buildup; 2% increased armor per Kinetic Inertia stack.', m('inertiaGain', 'flat', 0.30), g('armor', 'increased', 0.02, 'inertia')),
      n('a', 'small', 'Heavy Footing', '2% increased ward gained and 2% increased guard strength per Kinetic Inertia stack.', g('wardGain', 'increased', 0.02, 'inertia'), g('guardStrength', 'increased', 0.02, 'inertia')),
      n('b', 'small', 'Momentum Shell', '+0.6% Graze chance per Kinetic Inertia stack.', g('grazeChance', 'flat', 0.006, 'inertia')),
      n('', 'notable', 'Marching Rampart', '40% faster Kinetic Inertia buildup; 3.5% increased armor and 3% increased ward gained per Inertia stack.', m('inertiaGain', 'flat', 0.40), g('armor', 'increased', 0.035, 'inertia'), g('wardGain', 'increased', 0.03, 'inertia')),
      n('tail', 'keystone', 'Anchored Momentum', '+100% faster Kinetic Inertia buildup; take 1.5% less damage per banked Kinetic Inertia stack (up to 30% less); 15% less movement speed.', m('inertiaGain', 'flat', 1.00), g('damageTaken', 'more', -0.015, 'inertia'), m('moveSpeed', 'more', -0.15)),
    ],
  },

  // =========================================================================
  // PROWESS — PASS 9 (2 wheels, 8 nodes)
  // =========================================================================
  {
    id: 'exp_p9_prw_poise_felling', wedge: 'prw', theme: 'impact', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Staggered Arteries', '10% increased poise damage; +12% chance to inflict bleed against poise-broken enemies.', m('poiseDamage', 'increased', 0.10), m('apply_bleed', 'flat', 0.12, ['vs:poiseBroken'])),
      n('a', 'small', 'Ruptured Stance', '12% increased physical ailment magnitude; +4% Felling Strike chance against bleeding enemies.', m('statusMagnitude', 'increased', 0.12, ['physical']), m('fellingChance', 'flat', 0.04, ['vs:bleed'])),
      n('b', 'small', 'Hacked Guard', '+12% bleed chance; +12% critical strike multiplier against poise-broken enemies.', m('apply_bleed', 'flat', 0.12), m('critMulti', 'flat', 0.12, ['vs:poiseBroken'])),
      n('', 'notable', 'Breaker\'s Hemorrhage', '+25% chance to inflict bleed against poise-broken enemies; +10% Felling Strike chance and +25% critical strike multiplier against bleeding enemies.', m('apply_bleed', 'flat', 0.25, ['vs:poiseBroken']), m('fellingChance', 'flat', 0.10, ['vs:bleed']), m('critMulti', 'flat', 0.25, ['vs:bleed'])),
    ],
  },
  {
    id: 'exp_p9_prw_harmony_combo', wedge: 'prw', theme: 'tempo', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Woven Rhythm', '+1.0% more damage per Harmonic Pitch stack; 15% longer combo windows.', m('harmonyPower', 'flat', 0.010), m('comboWindow', 'more', 0.15)),
      n('a', 'small', 'Shifting Flourish', '+1.0% chance to deal double damage per Harmonic Pitch stack.', g('doubleDamageChance', 'flat', 0.010, 'harmony')),
      n('b', 'small', 'Cadenced Blade', '2% increased melee damage per Harmonic Pitch stack; 10% increased attack damage while your skills are varied.', g('damage', 'increased', 0.02, 'harmony', ['melee']), m('damage', 'increased', 0.10, ['attack'], 'comboVaried')),
      n('', 'notable', 'Sword-Dance Counterpoint', '+2.0% more damage and +1.2% chance to deal double damage per Harmonic Pitch stack; 25% longer combo windows.', m('harmonyPower', 'flat', 0.020), g('doubleDamageChance', 'flat', 0.012, 'harmony'), m('comboWindow', 'more', 0.25)),
    ],
  },

  // =========================================================================
  // DEXTERITY — PASS 9 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p9_dex_acc_spells', wedge: 'dex', theme: 'arcana', shape: 'keystoneTail', pass: 9,
    nodes: [
      n('entry', 'small', 'Sighted Incantation', '+30 accuracy; +0.4% spell critical strike chance per 50 excess accuracy above level baseline.', m('accuracy', 'flat', 30), g('critChance', 'flat', 0.004, 'accOver', ['spell'])),
      n('a', 'small', 'Calibrated Ray', '1.5% increased spell projectile speed and 1.5% increased spell damage per 50 excess accuracy.', g('projectileSpeed', 'increased', 0.015, 'accOver', ['spell']), g('damage', 'increased', 0.015, 'accOver', ['spell'])),
      n('b', 'small', 'True Trajectory', '+1.5% spell critical strike multiplier per 50 excess accuracy above level baseline.', g('critMulti', 'flat', 0.015, 'accOver', ['spell'])),
      n('', 'notable', 'Optic Conduit', '2.5% increased spell damage and +0.6% spell critical strike chance per 50 excess accuracy above level baseline.', g('damage', 'increased', 0.025, 'accOver', ['spell']), g('critChance', 'flat', 0.006, 'accOver', ['spell'])),
      n('tail', 'keystone', 'Astral Sightline', 'Gain +0.8% spell critical strike chance and +3.0% spell critical strike multiplier per 50 excess accuracy above level baseline; your attack skills deal no damage.', g('critChance', 'flat', 0.008, 'accOver', ['spell']), g('critMulti', 'flat', 0.030, 'accOver', ['spell']), m('damage', 'override', 0, ['attack'])),
    ],
  },
  {
    id: 'exp_p9_dex_inertia_proj', wedge: 'dex', theme: 'ranged', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Running Draw', '30% faster Kinetic Inertia buildup; 1.5% increased projectile speed per Inertia stack.', m('inertiaGain', 'flat', 0.30), g('projectileSpeed', 'increased', 0.015, 'inertia')),
      n('a', 'small', 'Slipped Release', '+0.7% Graze chance per Kinetic Inertia stack; 8% increased evasion while moving.', g('grazeChance', 'flat', 0.007, 'inertia'), m('evasion', 'increased', 0.08, undefined, 'moving')),
      n('b', 'small', 'Kinetic Flight', 'Up to +8% more damage at long range while moving; 8% increased projectile damage.', m('farShotDamage', 'flat', 0.08, undefined, 'moving'), m('damage', 'increased', 0.08, ['projectile'])),
      n('', 'notable', 'Slipstream Draw', '40% faster Kinetic Inertia buildup; +1.0% Graze chance and 2% increased projectile speed per banked Inertia stack; up to +14% more long-range damage while moving.', m('inertiaGain', 'flat', 0.40), g('grazeChance', 'flat', 0.01, 'inertia'), g('projectileSpeed', 'increased', 0.02, 'inertia'), m('farShotDamage', 'flat', 0.14, undefined, 'moving')),
    ],
  },

  // =========================================================================
  // FINESSE — PASS 9 (2 wheels, 8 nodes)
  // =========================================================================
  {
    id: 'exp_p9_fin_reap_overkill', wedge: 'fin', theme: 'entropy', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Blighted Spill', '+12% chance to inflict poison; 10% of expiring damaging ailments rupture.', m('apply_poison', 'flat', 0.12), m('dotRupture', 'flat', 0.10)),
      n('a', 'small', 'Culling Scythe', '+5% culling threshold; +10% critical strike multiplier against afflicted enemies.', m('cullThreshold', 'flat', 0.05), m('critMulti', 'flat', 0.10, ['vs:afflicted'])),
      n('b', 'small', 'Plucked Rupture', '12% of expiring damaging ailments rupture; 10% increased ailment magnitude.', m('dotRupture', 'flat', 0.12), m('statusMagnitude', 'increased', 0.10)),
      n('', 'notable', 'Venom-Cull Finisher', 'Cull enemies at 8% life; 22% of expiring damaging ailments rupture; +25% critical strike multiplier against afflicted enemies.', m('cullThreshold', 'flat', 0.08), m('dotRupture', 'flat', 0.22), m('critMulti', 'flat', 0.25, ['vs:afflicted'])),
    ],
  },
  {
    id: 'exp_p9_fin_graze_riven', wedge: 'fin', theme: 'guile', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Parried Crack', '+8% Graze chance; +4% critical strike chance if you have been hit recently.', m('grazeChance', 'flat', 0.08), m('critChance', 'flat', 0.04, undefined, 'recentlyHurt')),
      n('a', 'small', 'Glancing Counter', '+5% Graze damage reduction; 12% of damage prevented by Grazes becomes Ward.', m('grazeMitigation', 'flat', 0.05), m('grazeWard', 'flat', 0.12)),
      n('b', 'small', 'Needle Turn', '+16% critical strike multiplier if you have evaded recently; +12% ambush damage.', m('critMulti', 'flat', 0.16, undefined, 'recentlyEvaded'), m('ambushBonus', 'flat', 0.12)),
      n('', 'notable', 'Glancing Riposte', '+12% Graze chance; 18% of Grazed damage becomes Ward; +10% critical strike chance if hurt recently; +28% critical strike multiplier if you have evaded recently.', m('grazeChance', 'flat', 0.12), m('grazeWard', 'flat', 0.18), m('critChance', 'flat', 0.10, undefined, 'recentlyHurt'), m('critMulti', 'flat', 0.28, undefined, 'recentlyEvaded')),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — PASS 9 (2 wheels, 8 nodes)
  // =========================================================================
  {
    id: 'exp_p9_int_cd_reap', wedge: 'int', theme: 'time', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Measured Interval', 'Spells gain 2.5% more hit damage per second of cooldown; 8% increased skill-charge recovery.', m('cooldownPower', 'flat', 0.025, ['spell']), m('skillChargeRate', 'increased', 0.08)),
      n('a', 'small', 'Timed Reservoir', '10% increased cooldown recovery rate; 10% increased spell area of effect.', m('cooldownRecovery', 'increased', 0.10), m('aoeRadius', 'increased', 0.10, ['spell'])),
      n('b', 'small', 'Charged Lexicon', '12% increased skill-charge recovery; +15 maximum mana.', m('skillChargeRate', 'increased', 0.12), m('mana', 'flat', 15)),
      n('', 'notable', 'Chronometric Reservoir', 'Spells gain 5% more hit damage per second of cooldown; 22% increased skill-charge recovery; 14% increased cooldown recovery and spell area of effect.', m('cooldownPower', 'flat', 0.05, ['spell']), m('skillChargeRate', 'increased', 0.22), m('cooldownRecovery', 'increased', 0.14), m('aoeRadius', 'increased', 0.14, ['spell'])),
    ],
  },
  {
    id: 'exp_p9_int_riven_debt', wedge: 'int', theme: 'arcana', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Pre-Cracked Vessel', 'Hits shred enemy energy shields 18% harder; +3% fire, cold, and lightning penetration.', m('esShred', 'flat', 0.18), m('firePen', 'flat', 0.03), m('coldPen', 'flat', 0.03), m('lightningPen', 'flat', 0.03)),
      n('a', 'small', 'Compounding Flaw', '12% increased damage against shocked or chilled enemies.', m('damage', 'increased', 0.12, ['vs:shock']), m('damage', 'increased', 0.12, ['vs:chill'])),
      n('b', 'small', 'Prism Seam', 'Hits shred enemy energy shields 22% harder; 8% increased spell damage.', m('esShred', 'flat', 0.22), m('damage', 'increased', 0.08, ['spell'])),
      n('', 'notable', 'Shatter-Prism Resonance', 'Hits shred enemy energy shields 40% harder; +8% fire, cold, and lightning penetration; 16% increased damage against shocked or chilled enemies.', m('esShred', 'flat', 0.40), m('firePen', 'flat', 0.08), m('coldPen', 'flat', 0.08), m('lightningPen', 'flat', 0.08), m('damage', 'increased', 0.16, ['vs:shock']), m('damage', 'increased', 0.16, ['vs:chill'])),
    ],
  },

  // =========================================================================
  // WILLPOWER — PASS 9 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p9_wil_trauma_reap', wedge: 'wil', theme: 'entropy', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Blood-Priced Harvest', 'Skill casts inflict 2% of maximum life as voluntary trauma; reaping hits extract 15% of active damaging ailments.', m('traumaCost', 'flat', 0.02), m('ailmentReap', 'flat', 0.15)),
      n('a', 'small', 'Searing Wound-Tide', '3% increased ailment magnitude per recent wound stack.', g('statusMagnitude', 'increased', 0.03, 'wounds')),
      n('b', 'small', 'Bitter Tithe', 'Reaping hits extract +20% of active damaging ailments; 2% increased chaos damage per recent wound stack.', m('ailmentReap', 'flat', 0.20), g('damage', 'increased', 0.02, 'wounds', ['chaos'])),
      n('', 'notable', 'Sanguine Scythe', 'Skill casts inflict 3% of maximum life as voluntary trauma; reaping hits extract +30% of active damaging ailments; 4% increased ailment magnitude per recent wound stack.', m('traumaCost', 'flat', 0.03), m('ailmentReap', 'flat', 0.30), g('statusMagnitude', 'increased', 0.04, 'wounds')),
    ],
  },
  {
    id: 'exp_p9_wil_debt_overkill', wedge: 'wil', theme: 'time', shape: 'keystoneTail', pass: 9,
    nodes: [
      n('entry', 'small', 'Spilled Interest', '6% of landed hit damage banks into Temporal Debt; 8% of overkill damage cascades nearby.', m('hitEchoFrac', 'flat', 0.06), m('overkillCarry', 'flat', 0.08)),
      n('a', 'small', 'Wide Foreclosure', 'Temporal Debt splashes within +60 radius; +35 Overkill Cascade radius.', m('hitEchoAoe', 'flat', 60), m('overkillRadius', 'flat', 35)),
      n('b', 'small', 'Ruinous Balance', '10% of landed hit damage banks into Temporal Debt; 10% of overkill damage cascades nearby.', m('hitEchoFrac', 'flat', 0.10), m('overkillCarry', 'flat', 0.10)),
      n('', 'notable', 'Compound Foreclosure', '14% of landed hit damage banks into Temporal Debt with +70 splash radius; 18% of overkill damage cascades nearby.', m('hitEchoFrac', 'flat', 0.14), m('hitEchoAoe', 'flat', 70), m('overkillCarry', 'flat', 0.18)),
      n('tail', 'keystone', 'Usurious Wake', '+45% of landed hit damage banks into Temporal Debt (gathering +1.0s longer); +40% of overkill damage cascades nearby; you cannot Leech Life.', m('hitEchoFrac', 'flat', 0.45), m('hitEchoDelay', 'flat', 1.0), m('overkillCarry', 'flat', 0.40), m('lifeLeech', 'override', 0)),
    ],
  },

  // =========================================================================
  // WISDOM — PASS 9 (2 wheels, 10 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p9_wis_trauma_host', wedge: 'wis', theme: 'host', shape: 'keystoneTail', pass: 9,
    nodes: [
      n('entry', 'small', 'Bleed for the Flock', 'Skill casts inflict 2% of maximum life as voluntary trauma; minions deal +0.4% more hit damage per recent wound stack on you.', m('traumaCost', 'flat', 0.02), m('ownerWoundsToMinion', 'flat', 0.004)),
      n('a', 'small', 'Returned Tithe', '2% of hit damage dealt by your minions leeches life directly to you.', m('minionLeechToOwner', 'flat', 0.020)),
      n('b', 'small', 'Empathic Scar', 'Minions deal +0.5% more hit damage per recent wound stack on you; 10% increased minion life.', m('ownerWoundsToMinion', 'flat', 0.005), m('minionLife', 'increased', 0.10)),
      n('', 'notable', 'Sanguine Covenant', '3% of hit damage dealt by your minions leeches life to you; minions deal +0.8% more hit damage per recent wound stack on you.', m('minionLeechToOwner', 'flat', 0.030), m('ownerWoundsToMinion', 'flat', 0.008)),
      n('tail', 'keystone', 'Scar-Bound Shepherd', 'Skill casts inflict 3% of maximum life as voluntary trauma; minions deal +1.5% more hit damage per recent wound stack on you and leech 5% of their hit damage to you; your own skills deal 50% less damage.', m('traumaCost', 'flat', 0.03), m('ownerWoundsToMinion', 'flat', 0.015), m('minionLeechToOwner', 'flat', 0.050), m('damage', 'more', -0.50)),
    ],
  },
  {
    id: 'exp_p9_wis_kindled_martyr', wedge: 'wis', theme: 'fire', shape: 'keystoneTail', pass: 9,
    nodes: [
      n('entry', 'small', 'Charred Arrival', '10% increased minion movement speed; +12% chance for minions to inflict burn.', m('minionMoveSpeed', 'increased', 0.10), m('minionApply_burn', 'flat', 0.12)),
      n('a', 'small', 'Ash-Swollen Flock', 'Minions deal 10% increased fire damage.', m('minionDamage', 'increased', 0.10, ['fire'])),
      n('b', 'small', 'Seared Flank', '10% increased minion maximum life; 8% increased area of effect.', m('minionLife', 'increased', 0.10), m('aoeRadius', 'increased', 0.08)),
      n('', 'notable', 'Ember-Fed Rupture', 'When one of your minions is struck, it pulses 10 (+2.5 per character level) minion fire damage around itself (shared 0.6s cooldown across all your minions).', m('minionStruckFirePulse', 'flat', 10), g('minionStruckFirePulse', 'flat', 2.5, 'level')),
      n('tail', 'notable', 'Funeral Pyre Bridge', 'Recently summoned minions tether to other nearby recently summoned minions, burning enemies caught between them for 8 (+2.5 per character level) minion fire damage per second.', m('minionPyreTether', 'flat', 8), g('minionPyreTether', 'flat', 2.5, 'level')),
    ],
  },

  // =========================================================================
  // CHARISMA — PASS 9 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p9_cha_harmony_host', wedge: 'cha', theme: 'chorus', shape: 'keystoneTail', pass: 9,
    nodes: [
      n('entry', 'small', 'Conducted Host', '2% increased minion damage per Harmonic Pitch stack; 2% of minion hit damage leeches life to you.', g('minionDamage', 'increased', 0.02, 'harmony'), m('minionLeechToOwner', 'flat', 0.020)),
      n('a', 'small', 'Choral Pace', '1.5% increased minion action speed per Harmonic Pitch stack.', g('minionHaste', 'increased', 0.015, 'harmony')),
      n('b', 'small', 'Shared Tithe', '2.5% of minion hit damage leeches life to you; 2.5% increased ward gained per Harmonic Pitch stack.', m('minionLeechToOwner', 'flat', 0.025), g('wardGain', 'increased', 0.025, 'harmony')),
      n('', 'notable', 'Polyphonic Shepherd', '3% increased minion damage and 2% increased minion action speed per Harmonic Pitch stack; 3% of minion hit damage leeches life to you.', g('minionDamage', 'increased', 0.03, 'harmony'), g('minionHaste', 'increased', 0.02, 'harmony'), m('minionLeechToOwner', 'flat', 0.030)),
      n('tail', 'keystone', 'Symphonic Retinue', 'Alternating skill types grants your minions +4% increased damage and +3% action speed per Harmonic Pitch stack, and 5% of their hit damage leeches to you (plus 4% increased ward gained per stack); you cannot summon more than half your usual minion limit (50% less maximum minions).', g('minionDamage', 'increased', 0.04, 'harmony'), g('minionHaste', 'increased', 0.03, 'harmony'), m('minionLeechToOwner', 'flat', 0.050), g('wardGain', 'increased', 0.04, 'harmony'), m('minionMaxCount', 'more', -0.50)),
    ],
  },
  {
    id: 'exp_p9_cha_cd_stagger', wedge: 'cha', theme: 'time', shape: 'diamond', pass: 9,
    nodes: [
      n('entry', 'small', 'Timed Relief', 'Skills gain 2.5% more hit damage per second of cooldown; +0.15 absorb ward per mana spent.', m('cooldownPower', 'flat', 0.025), m('costWard_mana', 'flat', 0.15)),
      n('a', 'small', 'Paced Ledger', '10% increased cooldown recovery rate; 10% slower ward decay.', m('cooldownRecovery', 'increased', 0.10), m('wardDecay', 'more', -0.10)),
      n('b', 'small', 'Deferred Cadence', '12% increased skill-charge recovery; +0.20 absorb ward per mana spent.', m('skillChargeRate', 'increased', 0.12), m('costWard_mana', 'flat', 0.20)),
      n('', 'notable', 'Cadenced Absolution', 'Skills gain 5% more hit damage per second of cooldown; +0.30 absorb ward per mana spent; 16% increased skill-charge recovery and 14% slower ward decay.', m('cooldownPower', 'flat', 0.05), m('costWard_mana', 'flat', 0.30), m('skillChargeRate', 'increased', 0.16), m('wardDecay', 'more', -0.14)),
    ],
  },
];
