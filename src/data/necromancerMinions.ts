import { UNDEAD_COURT_MINIONS } from './necromancerCourts';
import type { MonsterDef } from './monsters';
import { mod } from '../engine/stats';
const mage = (id: string, name: string, color: string, skill: string): MonsterDef => ({
  id, name, color, shape: 'ribcage', radius: 12, material: 'bone', look: 'lich', faction: 'undead',
  base: { life: 30, moveSpeed: 135, mana: 40, manaRegen: 5, accuracy: 100 },
  skills: [skill], xp: 0,
});
export const NECROMANCER_MINIONS: Record<string, MonsterDef> = {
  ...UNDEAD_COURT_MINIONS,
  skeletal_pyromancer: mage('skeletal_pyromancer', 'Skeletal Pyromancer', '#ed985a', 'skeletal_fire_bolt'),
  skeletal_cryomancer: mage('skeletal_cryomancer', 'Skeletal Cryomancer', '#8bd6ed', 'skeletal_cold_bolt'),
  skeletal_stormcaller: mage('skeletal_stormcaller', 'Skeletal Stormcaller', '#c5b6fa', 'skeletal_lightning_bolt'),
  skeletal_venomancer: mage('skeletal_venomancer', 'Skeletal Venomancer', '#a8ce72', 'skeletal_chaos_bolt'),
  ossuary_lich: {
    id: 'ossuary_lich', name: 'Ossuary Lich', color: '#bc9be8', shape: 'ribcage', radius: 21, material: 'bone', look: 'lich', faction: 'undead',
    base: { life: 120, moveSpeed: 125, mana: 100, manaRegen: 8, armor: 20, accuracy: 100 },
    mods: [mod('castSpeed', 'increased', 0.2)],
    skills: ['skeletal_lich_fireball'], xp: 0,
  },
};
