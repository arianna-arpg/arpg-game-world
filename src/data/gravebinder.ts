import { mod } from '../engine/stats';
import type { VocationNodeDef } from './vocations';
import { registerChoiceGroup } from './passiveChoices';
import { LAST_BREATH, BURIAL_GROUND, PATCHWORK, OPEN_INVITATION } from './summonPacts';

registerChoiceGroup({ id: 'gravebinder_wraith', name: 'Name the Departed', options: [
  { id: 'reaver', name: 'Reaver', description: 'Wraiths wield a sweeping scythe and lunge through enemies.', mods: [mod('summonPactForm_reaver', 'flat', 1)] },
  { id: 'rime', name: 'Rime', description: 'Wraiths replace their attacks with ranged cold bolts.', mods: [mod('summonPactForm_rime', 'flat', 1)] },
  { id: 'dirge', name: 'Dirge', description: 'Wraiths curse enemies with Despair and carry a chaos resistance reducing aura.', mods: [mod('summonPactForm_dirge', 'flat', 1)] },
] });

/** Keep paid node IDs stable. Five independent engines, then optional refinements;
 * one point begins a play pattern instead of paying a numerical travel tax. */
export const GRAVEBINDER_TREE: VocationNodeDef[] = [
  { id: 's1', name: 'Last Breath', kind: 'notable', x: -140, y: -45, links: ['root'],
    description: `Every ${LAST_BREATH.threshold} temporary minion deaths or natural expiries raise a Wraith for ${LAST_BREATH.reward.duration} seconds. Up to ${LAST_BREATH.reward.maxActive} Wraiths. Replacements and pact-born minions do not fuel pacts.`, mods: [mod(LAST_BREATH.stat, 'flat', 1)] },
  { id: 'n1', name: 'Name the Departed', kind: 'choice', x: -300, y: -95, links: ['s1'],
    description: 'Choose the form of your Last Breath Wraiths: Reaver, Rime or Dirge.', choice: { group: 'gravebinder_wraith', allocatedDefault: 'reaver' } },
  { id: 's2', name: 'Patchwork', kind: 'notable', x: -90, y: 125, links: ['root'],
    description: `Body parts surface nearby every ${PATCHWORK.interval.join('–')} seconds outside safe zones. Walk over ${PATCHWORK.required} to raise a ${PATCHWORK.reward.duration}-second Flesh Construct. Ribs add life and armor; claws add fast twin cuts; hearts add recovery and movement; skulls add cold magic. Choose parts by your path. Maximum constructs: ${PATCHWORK.reward.maxActive}.`, mods: [mod(PATCHWORK.stat, 'flat', 1)] },
  { id: 'n4', name: 'Undying Covenant', kind: 'notable', x: -190, y: 275, links: ['s2'],
    description: 'Slain minions fight on for 3 more seconds. Their final passing feeds your pacts only once.', mods: [mod('minionUndying', 'flat', 3, ['minion'])] },
  { id: 's3', name: 'Burial Ground', kind: 'notable', x: 115, y: 125, links: ['root'],
    description: `A slain minion within ${BURIAL_GROUND.ownerRadius} units starts a graveyard. Gather ${BURIAL_GROUND.threshold} deaths within ${BURIAL_GROUND.radius} units over ${BURIAL_GROUND.gatherDuration} seconds to raise a zombie every ${BURIAL_GROUND.interval} seconds for ${BURIAL_GROUND.activeDuration} seconds, then crumble. Zombies last ${BURIAL_GROUND.reward.duration} seconds. Up to ${BURIAL_GROUND.maxSites} graveyards and ${BURIAL_GROUND.reward.maxActive} zombies. Natural expiry and pact-born minions do not charge graves.`, mods: [mod(BURIAL_GROUND.stat, 'flat', 1)] },
  { id: 'n3', name: 'Grave-Mender', kind: 'notable', x: 245, y: 265, links: ['s3'],
    description: 'Minions regenerate 2% of maximum life each second, helping you hold a burial ground.', mods: [mod('minionRegenPct', 'flat', 0.02)] },
  { id: 'n2', name: 'Undead Resonance', kind: 'notable', x: 120, y: -110, links: ['root'],
    description: 'Your undead minions gain Resonance innately: compatible supports on their summon skill also serve their own skills without using a Resonance socket. Forwarded support costs still apply.', mods: [mod('summonPact_undead_resonance', 'flat', 1)] },
  { id: 'k1', name: 'Open Invitation', kind: 'keystone', x: -25, y: -230, links: ['root'],
    description: `Summoning a minion also raises one minion from a different learned summon skill for ${OPEN_INVITATION.reward.duration} seconds, at most once every ${OPEN_INVITATION.cooldown} seconds. The guest inherits that skill’s tree and supports. Up to ${OPEN_INVITATION.reward.maxActive} guests; they cannot invite or fuel other pacts. Corpse-dependent, channel-formation and swarm summons cannot be guests.`, mods: [mod(OPEN_INVITATION.stat, 'flat', 1)] },
];
