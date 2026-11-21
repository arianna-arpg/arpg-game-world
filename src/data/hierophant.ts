import { mod } from '../engine/stats';
import type { VocationNodeDef } from './vocations';
import type { ProcDef } from './procs';
import { PROCESSION as field, carriedFieldStat } from './carriedFields';

const blessingChance = 0.3, weakenChance = 0.35;
const blessing = {
  type: 'buff', nearbyAlly: 220,
  buff: { type: 'buff', id: 'votive_zeal', label: 'Votive Zeal', duration: 5,
    mods: [mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)] },
} as const satisfies ProcDef['effect'];
const response = { chance: 0.6, radius: 220, flat: 6, pctMax: 0.02,
  onHeal: { chance: 0.5, radius: 200, damage: 'fire', base: 9, perLevel: 1.5 } } as const;
export const LITANY_PROCS: Record<string, ProcDef> = {
  litany_blessing: { id: 'litany_blessing', name: 'Votive Zeal', color: '#ffe4a2',
    trigger: 'cast', tags: ['spell'], effect: blessing },
  litany_woe: { id: 'litany_woe', name: 'Litany of Woe', color: '#ffbd71',
    trigger: 'hit', tags: ['attack'], effect: { type: 'status', status: 'weaken', onAppliedMend: response } },
};

const pct = (n: number) => Math.round(n * 100) + '%';
export const HIEROPHANT_TREE: VocationNodeDef[] = [
  { id: 's1', name: field.name, kind: 'notable', x: -145, y: 0, links: ['root'],
    description: `Carry a circle that burns enemies and mends allies every ${field.interval} seconds at ${pct(field.pulsePower)} of a Consecration tick. Casting Consecration or restoring an ally's life with Sanctified Strike adds two quick pulses, once per use.`,
    mods: [mod(carriedFieldStat(field.id), 'flat', 1)] },
  { id: 's2', name: 'Widening Halo', kind: 'notable', x: -280, y: 100, links: ['s1'],
    description: `Casting Consecration widens your carried circle by ${pct(field.growth.perStack)} of its radius for ${field.growth.duration} seconds. Up to ${field.growth.max} casts count at once. Each expires separately.`,
    mods: [mod(field.growth.stat, 'flat', 1)] },
  { id: 's3', name: 'Order of the Vigil', kind: 'notable', x: -280, y: -100, links: ['s1'],
    description: `A Radiant Sentinel guards your carried circle and reforms ${field.escort.reform} seconds after falling. Each double pulse calls another for ${field.escort.duration} seconds, up to ${field.escort.maxGuests} reinforcements. All fight from inside the circle.`,
    mods: [mod(field.escort.stat, 'flat', 1)] },
  { id: 'n1', name: 'Sacred Bulwark', kind: 'notable', x: 100, y: -135, links: ['root'],
    description: 'Gain 4% block chance. Blocking can release Bulwark Nova, striking nearby enemies, up to once every 1.5 seconds.',
    mods: [mod('blockChance', 'flat', 0.04), mod('proc_bulwark_nova', 'flat', 1)] },
  { id: 'n2', name: 'Radiant Reprisal', kind: 'notable', x: 130, y: 120, links: ['root'],
    description: 'Sanctified Strike can mark a struck enemy once per swing. After half a second its ground blooms, burning enemies and healing allies.',
    mods: [mod('proc_radiant_reprisal', 'flat', 1)] },
  { id: 'n3', name: 'Communal Rites', kind: 'notable', x: -110, y: -245, links: ['s3'],
    description: 'Your minion offerings also bless you at 25% strength.',
    mods: [mod('offeringShare', 'flat', 0.25)] },
  { id: 'n4', name: 'Litany of Woe', kind: 'notable', x: -15, y: 160, links: ['root'],
    description: `Spell casts have a ${pct(blessingChance)} chance to give one nearby ally Votive Zeal (+15% attack and cast speed for ${blessing.buff.duration} seconds). Attack hits have a ${pct(weakenChance)} chance to Weaken. Applying Weaken this way has a ${pct(response.chance)} chance to mend one wounded ally. Restoring life this way has a ${pct(response.onHeal.chance)} chance to deal fire damage to one enemy near that ally.`,
    mods: [mod('proc_litany_blessing', 'flat', blessingChance), mod('proc_litany_woe', 'flat', weakenChance)] },
  { id: 'k1', name: "Saint's Covenant", kind: 'keystone', x: 245, y: -145, links: ['n1'],
    description: 'Recover 25% of hit damage taken to life over 6 seconds. Blocking can also mend you for 6 life plus 2% of maximum life, once per second.',
    mods: [mod('recuperate', 'flat', 0.25), mod('proc_guarded_heart', 'flat', 0.6)] },
];
