import type { MonsterDef } from './monsters';
import { mod } from '../engine/stats';

/** Small-roster specialists, built from existing skills and ordinary brains.
 * Presence belongs on the body so biome and faction entries agree. */
export const COURT_MONSTERS: Record<string, MonsterDef> = {
  hollow_scripture_harness: {
    id: 'hollow_scripture_harness', name: 'Scripture Harness',
    color: '#91a9ba', shape: 'pentagon', radius: 13, material: 'metal', look: 'hollow_scripture_harness',
    base: { life: 55, energyShield: 25, armor: 22, moveSpeed: 100, mana: 120, manaRegen: 10 },
    // An empty lectern harness recites a dart and shields the nearby armory.
    skills: ['versicle', 'aegis_ward'], brain: { type: 'caster' },
    xp: 30, faction: 'hollowborn', tags: ['construct'], detection: 1,
    carry: { chance: 0.5, category: 'offhand' },
    presence: { from: 9, fadeIn: 4 },
    scaling: { life: { incPerLevel: 0.1 } },
  },
  sirocco_hourglass_diviner: {
    id: 'sirocco_hourglass_diviner', name: 'Hourglass Diviner',
    color: '#d2b479', shape: 'diamond', radius: 13, material: 'cloth', look: 'sirocco_hourglass_diviner',
    base: { life: 65, energyShield: 20, moveSpeed: 100, mana: 105, manaRegen: 7 },
    mods: [mod('fireRes', 'flat', 0.35), mod('coldRes', 'flat', -0.2)],
    // Locks a distant approach; sand in a close frontal cone buys space.
    skills: ['stasis_lock', 'whirl_of_grit'], brain: { type: 'strafer' },
    xp: 30, faction: 'sirocco', detection: 1,
    presence: { from: 11, fadeIn: 4 },
    gemBias: ['chrono', 'spell'],
    scaling: { life: { incPerLevel: 0.1 } },
  },
  glimmer_lantern_weaver: {
    id: 'glimmer_lantern_weaver', name: 'Lantern Weaver',
    color: '#b9d894', shape: 'kite', radius: 11, material: 'chitin', look: 'glimmer_lantern_weaver',
    base: { life: 46, energyShield: 24, moveSpeed: 138, mana: 100, manaRegen: 9 },
    skills: ['silk_snare', 'glimmer_pulse'], brain: { type: 'strafer' },
    xp: 28, faction: 'glimmerkin', tags: ['beast'], detection: 1,
    flier: true, levitates: true,
    // A carried light uses the same nocturnal dimming as the Lampwright.
    light: { radius: -3.5, color: '#dcec9f', intensity: 0.45, flicker: 1.2, radiance: { at1: 0 } },
    presence: { from: 9, fadeIn: 4 },
    gemBias: ['lightning', 'spell'],
    scaling: { life: { incPerLevel: 0.1 } },
  },
};
