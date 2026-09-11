import { deedKey, type DeedRule } from '../engine/deeds';

/** Semantic facts, shared across discovery, quests and future objectives. */
export const COMBAT_DEEDS: readonly DeedRule[] = [
  { id: 'blocked_damage', event: 'block', mode: 'sum' },
  { id: 'blocks', event: 'block' },
  { id: 'evades', event: 'evade' },
  { id: 'survived_hit_damage', event: 'hurt', mode: 'sum' },
  { id: 'mended_wounds', event: 'heal', mode: 'sum' },
  { id: 'crises_recovered', event: 'crisis' },
  { id: 'poise_breaks', event: 'poise' },
  { id: 'same_enemy_poise_breaks', event: 'poise', mode: 'subjectMax' },
  { id: 'elements_landed', event: 'hit', mode: 'distinct' },
  { id: 'distant_projectile_hits', event: 'hit', tagsAny: ['projectile'], minDistance: 160 },
  { id: 'projectile_hits', event: 'hit', tagsAny: ['projectile'] },
  { id: 'fire_hits', event: 'hit', flagsAll: ['fire'] },
  { id: 'critical_finishes', event: 'hit', flagsAll: ['crit', 'lethal'] },
  { id: 'melee_crits', event: 'hit', tagsAny: ['melee'], flagsAll: ['crit'] },
  { id: 'projectile_crits', event: 'hit', tagsAny: ['projectile'], flagsAll: ['crit'] },
  { id: 'hidden_hits', event: 'hit', flagsAll: ['hidden'] },
  { id: 'panicked_hits', event: 'hit', flagsAll: ['panicked'] },
  { id: 'companion_kills', event: 'kill', flagsAll: ['companion'] },
  { id: 'battle_cries', event: 'cast', tagsAny: ['warcry'] },
  { id: 'spells_practiced', event: 'cast', tagsAny: ['spell'], mode: 'distinct' },
];

export const DEED_CFG = { crisisEnter: 0.30, crisisRecover: 0.60, combatRadius: 480 };

/** A typed recipe keeps thresholds, the Vault's progress row and its plain
 * hint together. Parent ownership still controls when a branch is shown. */
const ask = (id: string, n: number, label: string, hint: string) => ({
  objectives: [{ ledger: deedKey(id), n, label }], hint,
});
export const CLASS_DEEDS = {
  berserker: ask('crises_recovered', 8, 'survive and recover from 8 low-life crises',
    'Let an enemy hit push you from above 30% life to 30% or less, then recover to 60% without dying. Survive eight such crises.'),
  vanguard: ask('blocked_damage', 750, 'stop 750 damage with blocks',
    'Meet hostile blows with a raised guard or a passive block. Stop 750 damage in all; damage leaking past the guard does not count.'),
  guardian: ask('blocks', 25, 'block 25 hostile hits', 'Turn aside twenty-five hostile blows with a raised guard or a passive block.'),
  sentinel: ask('blocks', 90, 'block 90 hostile hits', 'Discover the Guardian, then build a lifetime record of ninety hostile blows blocked.'),
  breaker: ask('same_enemy_poise_breaks', 3, 'break the same living enemy’s poise 3 times in one encounter',
    'Find a foe sturdy enough to endure. Break its poise, let it recover, and break it twice more before it dies. Leaving the zone or reloading ends the attempt; progress shows your best streak.'),
  wallwright: ask('poise_breaks', 30, 'break enemy poise 30 times', 'Discover the Breaker and break hostile poise thirty times across your journeys.'),
  sorcerer: ask('elements_landed', 3, 'land fire, cold and lightning hits', 'Strike living enemies with each of fire, cold and lightning. Different skills and different lives may teach each element.'),
  ranger: ask('distant_projectile_hits', 60, 'land 60 projectile hits from at least 160 units away', 'Land sixty projectile hits from at least 160 units away — roughly four body lengths. Keep your distance when the hit lands.'),
  summoner: ask('companion_kills', 30, 'have your companions slay 30 enemies', 'Discover the Necromancer and let creatures you summon or bind deliver thirty killing blows.'),
  swashbuckler: ask('evades', 25, 'evade 25 hostile attacks', 'Let evasion turn twenty-five hostile attacks into misses. Movement alone does not count as an evasion.'),
  juggernaut: ask('survived_hit_damage', 1800, 'survive 1,800 life damage from hostile hits', 'Discover the Guardian and survive a lifetime total of 1,800 life damage from enemy hits. Fatal blows and self-inflicted wounds do not count.'),
  pyromancer: ask('fire_hits', 80, 'land 80 fire hits', 'Land eighty hits that deal fire damage to living enemies. Lingering burns do not count as new hits.'),
  assassin: ask('critical_finishes', 12, 'finish 12 enemies with critical hits', 'Deliver twelve killing blows as critical hits. Each fallen enemy counts once.'),
  cleric: ask('mended_wounds', 500, 'mend 500 life lost to hostile hits', 'Restore five hundred life lost to enemy hits using healing skills, founts, or life orbs. Passive regeneration and self-inflicted wounds do not count.'),
  blademaster: ask('melee_crits', 30, 'land 30 melee critical hits', 'Discover the Berserker and land thirty melee critical hits against living enemies.'),
  lancer: ask('projectile_hits', 160, 'land 160 projectile hits', 'Discover the Ranger and land one hundred and sixty projectile hits against living enemies.'),
  skald: ask('battle_cries', 30, 'use 30 warcries near enemies', 'Discover the Warlord and use thirty warcries within 480 units of a living enemy. Echoes and triggered repeats do not count.'),
  beguiler: ask('hidden_hits', 12, 'land 12 hits while concealed', 'Strike living enemies twelve times while invisible or while your detectability is reduced.'),
  ascetic: ask('mended_wounds', 1600, 'mend 1,600 life lost to hostile hits', 'Discover the Cleric and restore 1,600 life lost to enemy hits using active healing. Passive regeneration and self-inflicted wounds do not count.'),
  matador: ask('evades', 100, 'evade 100 hostile attacks', 'Discover the Brawler and evade one hundred hostile attacks across your journeys.'),
  falconer: ask('companion_kills', 90, 'have your companions slay 90 enemies', 'Discover the Tamer and let your summoned or bound companions deliver ninety killing blows.'),
  sharper: ask('projectile_crits', 20, 'land 20 projectile critical hits', 'Discover the Swashbuckler and land twenty projectile critical hits against living enemies.'),
  firebrand: ask('panicked_hits', 30, 'hit panicked enemies 30 times', 'Discover the Beguiler and strike panicked enemies thirty times. Fear must already hold when the blow lands.'),
  runeweaver: ask('spells_practiced', 8, 'practice 8 different spells near enemies', 'Use eight different spell skills within 480 units of living enemies. Repeats of the same skill teach no new letter.'),
} as const;
