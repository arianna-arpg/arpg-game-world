import type { SkillDef, SkillEffect } from '../engine/skills';
import { mod, type DamageType } from '../engine/stats';

const attack = (id: string, name: string, delivery: SkillDef['delivery'], effects: SkillEffect[], type: DamageType = 'physical', damage = 12): SkillDef => ({
  id, name, description: `An ancestral beast art: ${name}.`, noDrop: true,
  tags: ['attack', type, ...(delivery.type === 'projectile' ? ['projectile' as const] : delivery.type === 'melee' ? ['melee' as const] : delivery.type === 'leap' ? ['movement' as const, 'aoe' as const] : ['aoe' as const])],
  color: '#a8c87a', manaCost: 0, cooldown: 10, useTime: 0.35,
  baseDamage: { [type]: [damage, damage] }, delivery, effects: [{ type: 'damage' }, ...effects],
  ai: { range: delivery.type === 'projectile' ? 350 : delivery.type === 'leap' ? 280 : 120, weight: 5 },
  leveling: { perLevel: [mod('damage', 'increased', 0.08)] },
});
const status = (id: string): SkillEffect => ({ type: 'status', status: id, chance: 1 });
const melee = { type: 'melee', range: 85, arcDeg: 120 } as const;
const nova = { type: 'nova', radius: 130, affects: 'enemies' } as const;
const bolt = { type: 'projectile', range: 450, speed: 400, radius: 10 } as const;
const leap = { type: 'leap', range: 300, airTime: 0.35, radius: 65 } as const;

/** Free, cooldown-limited arts remain usable even by naturally mana-less beasts. */
export const COMPANION_SKILLS: Record<string, SkillDef> = {
  beast_fallback_art: { ...attack('beast_fallback_art', 'Worrying Strike', melee, [{ type: 'status', status: 'winded', chance: 1, durationOverride: 2 }], 'physical', 8), cooldown: 12 },
  beast_defiant_roar: {
    id: 'beast_defiant_roar', name: 'Defiant Roar', noDrop: true,
    description: 'Taunt nearby enemies into attacking the beast.',
    tags: ['warcry', 'aoe', 'duration', 'instant'], color: '#c8a86a', manaCost: 0, cooldown: 18, useTime: 0,
    delivery: { type: 'nova', radius: 220, affects: 'enemies' }, effects: [status('taunted')], ai: { range: 200, weight: 8 },
  },
  beast_pursuit: { ...attack('beast_pursuit', 'Pursuit', leap, []), cooldown: 5, useTime: 0 },
  beast_rallying_whistle: {
    id: 'beast_rallying_whistle', name: 'Rallying Whistle', noDrop: true,
    description: 'Revive, fully heal and recall bonded beasts, then send them toward your aim with five seconds of damage pulses.',
    tags: ['spell', 'instant', 'companion'], color: '#a8c87a', manaCost: 0, cooldown: 45, useTime: 0,
    delivery: { type: 'self' }, effects: [{ type: 'whistleCompanion' }],
  },
  beast_rally_pulse: { ...attack('beast_rally_pulse', 'Rally Pulse', nova, [], 'physical', 8), tags: ['spell', 'physical', 'aoe'], cooldown: 0, useTime: 0 },
  beast_dread_pulse: { ...attack('beast_dread_pulse', 'Pack Dread', { type: 'target' }, [], 'chaos', 4), tags: ['spell', 'chaos'], cooldown: 0, useTime: 0 },
  beast_hound_art: attack('beast_hound_art', 'Hamstring', melee, [status('reeling'), status('bleed')]),
  beast_cat_art: attack('beast_cat_art', 'Rending Pounce', leap, [status('bleed')], 'physical', 18),
  beast_horn_art: attack('beast_horn_art', 'Goring Sweep', { ...melee, arcDeg: 240 }, [{ type: 'knockback', strength: 65 }], 'physical', 20),
  beast_brute_art: attack('beast_brute_art', 'Quaking Fist', { ...nova, radius: 160 }, [status('stun')], 'physical', 16),
  beast_raptor_art: attack('beast_raptor_art', 'Blinding Stoop', leap, [status('blind')]),
  beast_bird_art: attack('beast_bird_art', 'Wingstorm', { type: 'cone', range: 200, arcDeg: 100 }, [{ type: 'knockback', strength: 50 }, status('reeling')]),
  beast_spider_art: attack('beast_spider_art', 'Binding Silk', { ...bolt, speed: 300 }, [status('rooted')]),
  beast_serpent_art: attack('beast_serpent_art', 'Venom Fang', melee, [status('poison')], 'chaos', 14),
  beast_amphibian_art: attack('beast_amphibian_art', 'Mire Spit', { ...bolt, explode: { radius: 75, damageScale: 0.5 } }, [status('chill')], 'cold'),
  beast_shell_art: attack('beast_shell_art', 'Shellbreaker', melee, [status('vulnerable')], 'physical', 22),
  beast_mollusc_art: attack('beast_mollusc_art', 'Caustic Trailburst', nova, [status('poison')], 'chaos', 10),
  beast_fish_art: attack('beast_fish_art', 'Tidal Snap', { type: 'cone', range: 220, arcDeg: 80 }, [status('chill')], 'cold', 16),
  beast_insect_art: attack('beast_insect_art', 'Piercing Sting', { ...bolt, pierce: 2 }, [status('poison')], 'chaos'),
  beast_small_art: attack('beast_small_art', 'Distracting Bite', melee, [status('befuddlement')], 'physical', 8),
  beast_spirit_art: attack('beast_spirit_art', 'Wispflare', nova, [status('shock')], 'lightning', 15),
  beast_flora_art: attack('beast_flora_art', 'Dreadbloom', { ...nova, radius: 180 }, [status('maddened')], 'chaos', 10),
  beast_grub_art: attack('beast_grub_art', 'Draining Bite', melee, [], 'physical', 16),
  beast_stalker_art: attack('beast_stalker_art', 'Lashing Reach', { ...melee, range: 160 }, [status('vulnerable')], 'physical', 18),
};
COMPANION_SKILLS.beast_grub_art.innateMods = [mod('lifeLeech', 'flat', 0.25)];
