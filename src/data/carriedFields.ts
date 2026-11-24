import { STAT_DEFS } from '../engine/stats';
import type { SkillDef } from '../engine/skills';

/** A grant maintains a ground skill around its bearer. Cast and healed-ally
 * triggers are independent, so another field can listen to a different kit. */
export interface CarriedFieldDef {
  id: string;
  name: string;
  skill: string;
  radius: number;
  interval: number;
  pulsePower: number;
  castSkills: string[];
  mendSkills: string[];
  beats: number;
  beatGap: number;
  growth?: { stat: string; perStack: number; duration: number; max: number };
  escort?: { stat: string; skill: string; duration: number; maxGuests: number; reform: number };
}

export const PROCESSION = {
  id: 'procession', name: 'Living Consecration', skill: 'consecration',
  radius: 92, interval: 1.5, pulsePower: 0.55,
  castSkills: ['consecration'], mendSkills: ['sanctified_strike'], beats: 2, beatGap: 0.22,
  growth: { stat: 'processionReach', perStack: 0.2, duration: 22, max: 3 },
  escort: { stat: 'processionEscort', skill: 'radiant_sentinel', duration: 8, maxGuests: 4, reform: 4 },
} satisfies CarriedFieldDef;

export const CARRIED_FIELDS: CarriedFieldDef[] = [PROCESSION];
export const carriedFieldStat = (id: string) => 'carriedField_' + id;
for (const field of CARRIED_FIELDS) {
  STAT_DEFS[carriedFieldStat(field.id)] = { label: field.name, base: 0, min: 0 };
  if (field.growth) STAT_DEFS[field.growth.stat] = { label: field.name + ' expansion', base: 0, min: 0 };
  if (field.escort) STAT_DEFS[field.escort.stat] = { label: field.name + ' escort', base: 0, min: 0 };
}

export const RADIANT_SENTINEL: SkillDef = {
  id: 'radiant_sentinel', name: 'Radiant Sentinel', noDrop: true,
  description: 'An armored guardian of consecrated ground. Its lance can reach enemies beyond the circle.',
  tags: ['spell', 'summon', 'minion'], color: '#f4dc96', manaCost: 0, cooldown: 0, useTime: 0,
  delivery: { type: 'summon', monsterId: 'radiant_sentinel', count: 1, maxActive: 1 }, effects: [],
};
