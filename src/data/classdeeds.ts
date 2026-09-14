import { deedKey, type DeedRule } from '../engine/deeds';

/** Final comfort pass over the calibrated budgets. Whole deeds round to the
 * nearest integer, never zero; structural breadth and response windows stay. */
export const discoveryCount = (baseline: number): number => Math.max(1, Math.round(baseline * 0.75));
const elementPractice = discoveryCount(150);
const spellPractice = discoveryCount(30);

/** Semantic facts, shared across discovery, quests and future objectives. */
export const COMBAT_DEEDS: readonly DeedRule[] = [
  { id: 'indirect_damage', event: 'indirect', mode: 'sum' },
  { id: 'blocked_damage', event: 'block', mode: 'sum' },
  { id: 'blocks', event: 'block' },
  { id: 'evades', event: 'evade' },
  { id: 'survived_hit_damage', event: 'hurt', mode: 'sum' },
  { id: 'mended_wounds', event: 'heal', mode: 'sum' },
  { id: 'crises_recovered', event: 'crisis' },
  { id: 'poise_breaks', event: 'poise' },
  { id: 'same_enemy_poise_breaks', event: 'poise', mode: 'subjectMax', flagsAll: ['surviving'] },
  { id: 'elements_landed', event: 'hit', mode: 'distinct' },
  { id: 'elements_rehearsed', event: 'hit', mode: 'distinct', minOccurrences: elementPractice },
  { id: 'distant_projectile_hits', event: 'hit', tagsAny: ['projectile'], minDistance: 160 },
  { id: 'projectile_hits', event: 'hit', tagsAny: ['projectile'] },
  { id: 'fire_hits', event: 'hit', flagsAll: ['fire'] },
  { id: 'cold_hits', event: 'hit', flagsAll: ['cold'] },
  { id: 'critical_finishes', event: 'hit', flagsAll: ['crit', 'lethal'] },
  { id: 'melee_finishes', event: 'hit', tagsAny: ['melee'], flagsAll: ['lethal'] },
  { id: 'hidden_finishes', event: 'hit', flagsAll: ['hidden', 'lethal'] },
  { id: 'melee_crits', event: 'hit', tagsAny: ['melee'], flagsAll: ['crit'] },
  { id: 'projectile_crits', event: 'hit', tagsAny: ['projectile'], flagsAll: ['crit'] },
  { id: 'hidden_hits', event: 'hit', flagsAll: ['hidden'] },
  { id: 'panicked_hits', event: 'hit', flagsAll: ['panicked'] },
  { id: 'companion_kills', event: 'kill', flagsAll: ['companion'] },
  { id: 'battle_cries', event: 'cast', tagsAny: ['warcry'] },
  { id: 'spells_practiced', event: 'cast', tagsAny: ['spell'], mode: 'distinct' },
  { id: 'spells_refined', event: 'cast', tagsAny: ['spell'], mode: 'distinct', minOccurrences: spellPractice },
  { id: 'block_counters', event: 'hit', tagsAny: ['melee'], after: { event: 'block', within: 3 } },
  { id: 'evade_counters', event: 'hit', tagsAny: ['melee'], after: { event: 'evade', within: 3 } },
  { id: 'rallied_finishes', event: 'hit', tagsAny: ['melee'], flagsAll: ['lethal'],
    after: { event: 'cast', tagsAny: ['warcry'], within: 6 } },
];

export const DEED_CFG = { crisisEnter: 0.30, crisisRecover: 0.60, combatRadius: 480 };

/** Account-calibrated activity budgets; see docs/meta/class-deeds.md for the
 * 44-run / 12-corpse reference and the limits of partial-history counters.
 * Templates share their number with the objective, so future tuning cannot
 * leave the Vault's instructions describing an old threshold. */
const ask = (id: string, baseline: number, label: string, hint: string, scale = true) => {
  const n = scale ? discoveryCount(baseline) : baseline;
  const say = (text: string) => text.replaceAll('{n}', n.toLocaleString('en-US'));
  return { objectives: [{ ledger: deedKey(id), n, label: say(label) }], hint: say(hint) };
};
export const CLASS_DEEDS = {
  // Early budgets are already final, and wait for town introductions in the
  // bundle. Their habits keep feeding the longer specialist objectives.
  spellblade: ask('melee_finishes', 300, 'finish {n} enemies with melee hits',
    'Deliver {n} melee killing blows across your journeys. Ordinary fighting counts; no element or special sequence is required.', false),
  cryomancer: ask('cold_hits', 90, 'land {n} cold hits',
    'Land {n} hits dealing cold damage to living enemies. Frost Nova and mixed elemental hits count; lingering damage does not add new hits.', false),
  apothecary: ask('mended_wounds', 1200, 'mend {n} life lost to hostile hits',
    'Restore {n} life lost to enemy hits through active healing, founts, or life orbs. Ordinary recovery counts; passive regeneration and self-inflicted wounds do not.', false),
  berserker: {
    objectives: [
      ...ask('melee_finishes', 2500, 'finish {n} enemies with melee hits', '').objectives,
      ...ask('crises_recovered', 24, 'survive and recover from {n} low-life crises', '').objectives,
    ],
    hint: 'Complete either listed total: melee killing blows, or crises where an enemy hit pushes you from above 30% life to 30% or less and you recover to 60% without dying.',
  },
  vanguard: ask('blocked_damage', 4000, 'stop {n} damage with blocks',
    'Meet hostile blows with a raised guard or a passive block. Stop {n} damage in all; damage leaking past the guard does not count.'),
  guardian: ask('blocks', 100, 'block {n} hostile hits', 'Turn aside {n} hostile blows with a raised guard or a passive block.'),
  sentinel: ask('block_counters', 120, 'answer {n} blocks with a melee hit within 3 seconds',
    'Discover the Guardian. Block a hostile blow, then land a melee hit within three seconds. Repeat {n} times. Each block opens one counter; extra hits and repeated blocks cannot stockpile credit.'),
  breaker: ask('same_enemy_poise_breaks', 3, 'break the same living enemy’s poise {n} times in one encounter',
    'Find a foe sturdy enough to endure {n} poise breaks. Let it recover between breaks and keep it alive. Leaving the zone or reloading ends the attempt; progress shows your best streak.'),
  wallwright: ask('poise_breaks', 150, 'break enemy poise {n} times', 'Discover the Breaker and break hostile poise {n} times across your journeys.'),
  sorcerer: ask('elements_rehearsed', 3, `practice {n} elements: land ${elementPractice} hits with each of fire, cold and lightning`,
    `Land ${elementPractice} fire hits, ${elementPractice} cold hits and ${elementPractice} lightning hits against living enemies. Each element fills one step after ${elementPractice} hits; skills and lives may differ. A mixed hit can practice each element it deals.`, false),
  ranger: ask('distant_projectile_hits', 180, 'land {n} projectile hits from at least 160 units away', 'Land {n} projectile hits from at least 160 units away — roughly four body lengths. Keep your distance when the hit lands.'),
  summoner: ask('companion_kills', 400, 'have your companions slay {n} enemies', 'Discover the Necromancer and let creatures you summon or bind deliver {n} killing blows.'),
  swashbuckler: ask('evades', 400, 'evade {n} hostile attacks', 'Let evasion turn {n} hostile attacks into misses. Movement alone does not count as an evasion.'),
  juggernaut: ask('survived_hit_damage', 24000, 'survive {n} life damage from hostile hits', 'Discover the Guardian and survive a lifetime total of {n} life damage from enemy hits. Fatal blows and self-inflicted wounds do not count.'),
  pyromancer: ask('fire_hits', 1500, 'land {n} fire hits', 'Land {n} hits that deal fire damage to living enemies. Lingering burns do not count as new hits.'),
  assassin: ask('hidden_finishes', 150, 'finish {n} enemies while concealed',
    'Deliver {n} killing blows while invisible or while your detectability is reduced. Concealment must still hold when the hit lands; critical hits alone do not count.'),
  cleric: ask('mended_wounds', 9000, 'mend {n} life lost to hostile hits', 'Restore {n} life lost to enemy hits using healing skills, founts, or life orbs. Passive regeneration and self-inflicted wounds do not count.'),
  blademaster: ask('melee_crits', 150, 'land {n} melee critical hits', 'Discover the Berserker and land {n} melee critical hits against living enemies.'),
  lancer: ask('projectile_hits', 600, 'land {n} projectile hits', 'Discover the Ranger and land {n} projectile hits against living enemies.'),
  skald: ask('rallied_finishes', 120, 'follow {n} warcries with a melee kill within 6 seconds',
    'Discover the Warlord. Use a warcry within 480 units of a living enemy, then deliver a melee killing blow within six seconds. Repeat {n} times. One kill counts per cry; echoes, triggered repeats and extra cries cannot bank more credit.'),
  beguiler: ask('indirect_damage', 60000, 'accumulate {n} indirect damage',
    'Accumulate {n} actual life damage through your or your companions’ ailments, retaliation and secondary explosions, or through self-inflicted wounds and life costs while a living enemy is within 480 units on the same story. Normal hits, enemy-inflicted wounds, overkill and damage absorbed by shields do not count.'),
  ascetic: ask('mended_wounds', 18000, 'mend {n} life lost to hostile hits', 'Discover the Cleric and restore {n} life lost to enemy hits using active healing. Passive regeneration and self-inflicted wounds do not count.'),
  matador: ask('evades', 1000, 'evade {n} hostile attacks',
    'Discover the Brawler and let evasion turn {n} hostile attacks into misses across your journeys. No follow-up attack is required; movement alone does not count as an evasion.'),
  falconer: ask('companion_kills', 800, 'have your companions slay {n} enemies', 'Discover the Tamer and let your summoned or bound companions deliver {n} killing blows.'),
  sharper: ask('projectile_crits', 60, 'land {n} projectile critical hits', 'Discover the Swashbuckler and land {n} projectile critical hits against living enemies.'),
  firebrand: ask('panicked_hits', 150, 'hit panicked enemies {n} times', 'Discover the Beguiler and strike panicked enemies {n} times. Fear must already hold when the blow lands.'),
  runeweaver: ask('spells_refined', 6, `rehearse {n} different spells: use each ${spellPractice} times near enemies`,
    `Use {n} different spell skills ${spellPractice} times apiece within 480 units of living enemies. Each spell fills one step after ${spellPractice} casts, across any number of lives. Echoes and triggered repeats do not count.`, false),
} as const;
