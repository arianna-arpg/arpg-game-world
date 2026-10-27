import type { SkillDef, GroundDelivery } from '../engine/skills';
import type { DamageType } from '../engine/stats';
const field = (id: string, name: string, element: DamageType, color: string, radius: number,
  damage: [number, number], delivery: Partial<GroundDelivery> = {}): SkillDef => ({
  id, name, description: name + ', cast by a skeletal mage.', noDrop: true,
  tags: ['spell', 'aoe', element, ...(delivery.lingerDuration ? ['duration' as const] : [])],
  color, manaCost: 0, cooldown: 0, useTime: 0,
  baseDamage: { [element]: damage },
  delivery: { type: 'ground', radius, castRange: 520, ...delivery },
  effects: [{ type: 'damage' }],
});
export const SKELETON_MAGE_SKILLS: Record<string, SkillDef> = {
  skeletal_grand_command: {
    id: 'skeletal_grand_command', name: 'Command Grand Rite', description: 'Direct your living Lich to prepare Grand Rite here.',
    noDrop: true, tags: ['spell'], color: '#dc9c66', manaCost: 8, cooldown: 0, useTime: 0.25,
    delivery: { type: 'self' }, effects: [],
  },
  skeletal_grand_rite: {
    ...field('skeletal_grand_rite', 'Grand Rite', 'fire', '#ed985a', 130, [22, 34], { delay: 0.6 }),
    cooldown: 8, useTime: 0.8, ai: { range: 460, weight: 5, keepDistance: 270 },
  },
  skeletal_ritual_dominion: field('skeletal_ritual_dominion', 'Ritual Dominion', 'fire', '#cb7d56', 130, [2, 3],
    { lingerDuration: 6, tickInterval: 1, noImpact: true }),
  skeletal_ritual_flare: field('skeletal_ritual_flare', 'Ritual Flare', 'fire', '#f5bc72', 48, [5, 8]),
  skeletal_rite_boundary: {
    ...field('skeletal_rite_boundary', 'Winter Boundary', 'cold', '#a5e8f1', 140, [3, 5],
      { lingerDuration: 6, tickInterval: 0.75, noImpact: true, innerFraction: 0.78 }),
    effects: [{ type: 'damage' }, { type: 'status', status: 'frozen', chance: 1, durationOverride: 0.6 }],
  },
  skeletal_rite_blizzard: {
    ...field('skeletal_rite_blizzard', 'Ritual Blizzard', 'cold', '#8bd6ed', 130, [4, 7],
      { lingerDuration: 6, tickInterval: 0.5, noImpact: true }),
    effects: [{ type: 'damage' }, { type: 'status', status: 'chill', chance: 1 }],
  },
  skeletal_rite_rupture: field('skeletal_rite_rupture', 'Storm Succession', 'lightning', '#cbb7ff', 155, [18, 34]),
  skeletal_discordant_burst: field('skeletal_discordant_burst', 'Discordant Souls', 'fire', '#d9c1ec', 55, [3, 5]),
  ...Object.fromEntries(([
    ['fire', 'Cinder Script', '#ed985a'], ['cold', 'Rime Script', '#8bd6ed'],
    ['lightning', 'Storm Script', '#c5b6fa'], ['chaos', 'Venom Script', '#a8ce72'],
  ] as const).map(([element, name, color]) => {
    const id = 'skeletal_' + element + '_script';
    return [id, field(id, name, element, color, 65, [2, 4], { lingerDuration: 3, tickInterval: 0.6, noImpact: true })];
  })),
};
