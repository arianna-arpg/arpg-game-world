import { mod, type Modifier } from '../engine/stats';
import { skillGrantStat } from '../engine/skills';
import { BATTLE_DOCTRINES } from './battleDoctrines';
import { registerChoiceGroup } from './passiveChoices';
import type { VocationNodeDef } from './vocations';

const node = (id: string, name: string, description: string, mods: Modifier[], links = ['s1']): VocationNodeDef => ({ id, name, description, mods, links, kind: id === 'k1' ? 'keystone' : 'notable', x: 0, y: 0 });
const trait = (id: string) => mod('doctrineTrait_' + id, 'flat', 1);
const grant = (id: string) => { const d = BATTLE_DOCTRINES.find(d => d.id === id)!; return [mod(d.stat, 'flat', 1), mod(skillGrantStat(d.skill), 'flat', 1)]; };
const choice = (id: string, description: string): VocationNodeDef => ({ id: 'n1', name: 'Choose Your Doctrine', description, kind: 'choice', x: 0, y: 0, links: ['s1'], choice: { group: 'doctrine_' + id, allocatedDefault: '0' } });
const descriptions: Record<string, string[]> = {
  breach: ['Release a wide, Sundering cone.', 'Spend Breach on protection and poise-breaking power. Each charge extends its duration by 35%.', 'Spend Breach on a damaging charge through the enemy.'],
  pack: ['Call a fast pursuit wedge.', 'Call a defensive ring at the chosen point.', 'Spread the pack around the point; its attacks expose enemies.'],
  swarm: ['Drive a fast-attacking wedge into the enemy.', 'Order a protected ring around the point.', 'Spread into a cloud whose attacks Harry enemies.'],
  quarry: ['Consume mature cairns in physical eruptions.', 'Relocate mature cairns into a circle around your aim; preserve their remaining lifetime.'],
  grove: ['Harvest mature saplings in rooting seedbursts.', 'Harvest mature saplings to recover 6% maximum life per sapling.', 'Transplant mature saplings around your aim; preserve their remaining lifetime.'],
};
for (const d of BATTLE_DOCTRINES) registerChoiceGroup({ id: 'doctrine_' + d.id, name: d.name, options: d.forms.map((f, i) => ({ id: String(i), name: f.label, description: descriptions[d.id][i], mods: f.stat ? [mod(f.stat, 'flat', 1)] : [] })) });

const TREES: Record<string, VocationNodeDef[]> = {
  warbringer: [
    node('s1', 'Breakers Call', 'Gain Breakers Call in Granted Skills. Nearby kills and melee poise breaks bank up to 4 Breach. Spend the bank on a directed Sunder wave; each charge adds 35% power.', grant('breach'), ['root']),
    node('s2', 'Breaker of Lines', 'Your melee hits have 25% chance to Sunder and deal 30% increased poise damage. Break defenses to prepare your next call.', [mod('apply_sundered', 'flat', .25, ['melee']), mod('poiseDamage', 'increased', .3)], ['root']),
    node('s3', 'Battle Chorus', 'Kills rally you through Battle Chorus. Your victories become a tempo to fight around.', [mod('proc_battle_chorus', 'flat', 1)], ['root']),
    choice('breach', 'Choose the release: Rupture, Bulwark or Iron Advance.'),
    node('n2', 'Sound the Advance', 'After your call, gain 30% increased attack speed and 25% increased movement speed for 5 seconds.', [trait('breach_rally')]),
    node('n3', 'Rally the Wounded', 'Your call restores 5% maximum life. Hold the release until recovery matters.', [trait('breach_mend')]),
    node('n4', 'Relentless', 'Each earned Breach also recovers 1 second of Breakers Call cooldown. Charge gain is limited to once per 0.35 seconds.', [trait('breach_relentless')]),
    node('k1', 'The Second Front', 'Damaging releases repeat after 0.65 seconds at 55% power. The repeat spends no second bank and cannot repeat again.', [trait('breach_aftershock')], ['n1']),
  ],
  packwarden: [
    node('s1', 'Pack Signal', 'Gain Pack Signal in Granted Skills. Direct your companions for 6 seconds. Different partners hitting the same enemy build up to 3 bonds; your next order spends them for 15% more damage each.', grant('pack'), ['root']),
    node('s2', 'At Your Heel', 'You and your owned allies take 12% less damage while within 120 units of an available companion.', [trait('pack_shelter')]),
    node('s3', 'Den-Mended', 'Companions regenerate 3% maximum life per second, sustaining the pack between coordinated attacks.', [mod('minionRegenPct', 'flat', .03, ['companion'])]),
    choice('pack', 'Choose Pursuit, Guard or Flank formations. Commands use your aimed point.'),
    node('n2', 'Call and Answer', 'A signal asks each available companion to use its first attack toward your aim, respecting that attack’s own cost and cooldown.', [trait('pack_answer')]),
    node('n3', 'Gather the Wounded', 'Each signal restores 12% maximum life to available companions.', [trait('pack_mend')]),
    node('n4', 'Hunting Relay', 'Each cooperative bond recovers 1 second of Pack Signal cooldown. Repeated hits from the same partner do not count.', [trait('pack_relay')]),
    node('k1', 'One Body, Many Teeth', 'Your signal’s formation bonuses, bond damage and recovery also apply to you.', [trait('pack_keeper')], ['n1']),
  ],
  swarmlord: [
    node('s1', 'Living Formation', 'Gain Living Formation in Granted Skills. Direct your minions for 5 seconds. Different partners hitting one enemy bank up to 5 chorus; the next order spends it for 12% more damage each.', grant('swarm'), ['root']),
    node('s2', 'Chitin Plies', 'Your minions gain one additional ply. It can absorb a blow or be spent through Molting Hour.', [mod('minionPlies', 'flat', 1)]),
    node('s3', 'Skittering Host', 'Minions are 15% smaller and move 25% faster, making the formation easier to steer through a crowded battlefield.', [mod('minionSize', 'more', -.15), mod('minionMoveSpeed', 'increased', .25)]),
    choice('swarm', 'Choose Needle, Shell or Cloud. Shape the same army into offense, protection or disruption.'),
    node('n2', 'Molting Hour', 'Orders spend one available ply per minion to restore 25% maximum life and grant 35% more attack speed for 5 seconds. Empty shells cannot pay.', [trait('swarm_molt')]),
    node('n3', 'Venom Relay', 'Ordered minions gain 60% chance to Poison during the formation.', [trait('swarm_venom')]),
    node('n4', 'One Mind', 'Orders ask every available minion to attack toward your aim, respecting its attack’s cost and cooldown.', [trait('swarm_answer')]),
    node('k1', 'Unbroken Chorus', 'Each earned chorus recovers 0.6 seconds of Living Formation cooldown. One contributor cannot build the chorus alone.', [trait('swarm_relay')], ['n1']),
  ],
  stonewrought: [
    node('s1', 'Cairnraiser', 'Raise temporary cairns nearby. Gain Faultcall in Granted Skills: consume up to 3 cairns aged at least 2 seconds within 420 units in physical eruptions.', [...grant('quarry'), mod('terraform_stone_cairns', 'flat', 1)], ['root']),
    node('s2', 'Stone Communion', 'Linger near rock, cliffs or your cairns to gain the mountain’s armor and poise endurance.', [mod('attune_stone_communion', 'flat', 1)], ['root']),
    node('s3', 'Growing Quarry', 'Your cairns rise twice as frequently. Their ordinary lifetime and capacity still apply.', [mod('terraform_stone_cairns', 'flat', 1)]),
    choice('quarry', 'Choose to consume your cairns in Avalanche or reposition them as a Stone Circle.'),
    node('n2', 'Enclosure', 'Within 100 units of an owned cairn, you and your owned allies take 15% less damage and deal 25% more poise damage.', [trait('quarry_shelter')]),
    node('n3', 'Bedrock Blood', 'Faultcall restores 4% maximum life per mature cairn used. Relocating a circle also counts.', [trait('quarry_mend')]),
    node('n4', 'Borrowed Mountain', 'After Faultcall, gain 50% more armor and 60 knockback strength for 6 seconds.', [trait('quarry_bastion')]),
    node('k1', 'Rolling Collapse', 'Consumed cairns erupt a second time after 0.5 seconds at half power. Relocation preserves the cairns instead.', [trait('quarry_echo')], ['n1']),
  ],
  greenwarden: [
    node('s1', 'Seedbearer', 'Grow temporary saplings nearby. Gain Gather the Green in Granted Skills: harvest up to 4 saplings aged at least 2 seconds within 420 units in rooting seedbursts.', [...grant('grove'), mod('terraform_sapling_ring', 'flat', 1)], ['root']),
    node('s2', 'Verdant Communion', 'Linger near trees, thickets or your own saplings for rapid regeneration.', [mod('attune_verdant_communion', 'flat', 1)], ['root']),
    node('s3', 'Sylvan Rebirth', 'All your skeletal-family minions become Sylvan entities. Your personal damage, speed, defenses, recovery, critical and ailment investment replaces minion-stat inheritance. Their own kits, summon trees, supports, capacity and duration remain. Existing bodies change with you.', [mod('transmute_sylvan', 'flat', 1)], ['root']),
    choice('grove', 'Choose Seedstorm, restorative Renewal or a Walking Grove that transplants living saplings.'),
    node('n2', 'Living Refuge', 'Within 110 units of an owned sapling, you and your owned allies regenerate 2.5% life per second and take 10% less damage.', [trait('grove_shelter')]),
    node('n3', 'Briar Mantle', 'After gathering or transplanting, gain 30 Thorns and 35% chance to Root for 6 seconds.', [trait('grove_thorns')]),
    node('n4', 'Second Spring', 'Seedstorm blooms again after 0.6 seconds at half power. Renewal and transplantation keep their own behavior.', [trait('grove_echo')], ['n1']),
    node('k1', 'Heart of the Forest', 'Saplings grow twice as frequently. Gain 2% maximum life regeneration; Sylvan entities inherit that personal recovery too.', [mod('terraform_sapling_ring', 'flat', 1), mod('lifeRegenPct', 'flat', .02)]),
    node('n5', 'Bramble Ward', 'Your living saplings lash nearby enemies. Transplant them to carry a fighting grove into the next engagement.', [mod('terraformFx_sapling_ring', 'flat', 1)]),
  ],
};
export function vocationMutationTree(id: string, layout: Record<string, { x: number; y: number }>): VocationNodeDef[] {
  return TREES[id].map(n => ({ ...n, ...(layout[n.id] ?? { x: 0, y: 280 }) }));
}
