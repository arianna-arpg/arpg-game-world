import type { SkillDef } from '../engine/skills';
import { mod } from '../engine/stats';
const art = (id: string, name: string, fields: Partial<SkillDef>): SkillDef => ({
  id, name, description: name + '. An ability of a bound bone frame.', noDrop: true,
  color: '#d8d0b0', tags: ['attack', 'physical', 'aoe'], manaCost: 0, cooldown: 0, useTime: .4, delivery: { type: 'self' }, effects: [], ...fields,
});
const slam = (id: string, name: string, power: number, cooldown: number) => art(id, name, {
  cooldown, useTime: .8, baseDamage: { physical: [24, 36] }, innateMods: power > 1 ? [mod('damage', 'more', power - 1)] : undefined, delivery: { type: 'cone', range: 125, arcDeg: 110 }, tags: ['attack', 'melee', 'physical', 'aoe'],
  effects: [{ type: 'damage' }, { type: 'knockback', strength: 70 }], ai: { range: 120, rangeStat: 'aoeRadius', weight: 6 },
});
const shots = (id: string, name: string, count: number, spread: number) => art(id, name, {
  useTime: 0, tags: ['attack', 'physical', 'projectile'], baseDamage: { physical: [7, 11] }, innateMods: [mod('projectileCount', 'flat', count - 1)],
  delivery: { type: 'projectile', speed: 520, radius: 5, range: 440, spreadDeg: spread, ring: spread === 360 ? {} : undefined }, effects: [{ type: 'damage' }],
});
export const BONE_GOLEM_SKILLS: Record<string, SkillDef> = {
  frame_bonebreaker: slam('frame_bonebreaker', 'Bonebreaker', 1, 6),
  frame_crush: slam('frame_crush', 'Cataclysmic Bonebreaker', 3, 0),
  frame_barrage: shots('frame_barrage', 'Ribcage Barrage', 3, 36),
  frame_nova: shots('frame_nova', 'Ribcage Nova', 10, 360),
  frame_splinters: { ...shots('frame_splinters', 'Carapace Splinters', 3, 28), cooldown: 1 },
  frame_marrow_sweep: art('frame_marrow_sweep', 'Ribcage Sweep', { cooldown: 3, useTime: .45, tags: ['attack', 'melee', 'physical', 'aoe'], baseDamage: { physical: [14, 23] },
    delivery: { type: 'cone', range: 85, arcDeg: 160 }, effects: [{ type: 'damage' }], ai: { range: 80, rangeStat: 'aoeRadius', weight: 4 } }),
  frame_trample: art('frame_trample', 'Trampling Advance', { useTime: 0, cooldown: .6, baseDamage: { physical: [5, 8] }, delivery: { type: 'nova', radius: 50 }, effects: [{ type: 'damage' }, { type: 'knockback', strength: 30 }] }),
  frame_fault: art('frame_fault', 'Ossuary Fault', { useTime: 0, cooldown: 10, tags: ['attack', 'physical', 'aoe', 'duration'], baseDamage: { physical: [20, 30] },
    delivery: { type: 'ground', radius: 75, castRange: 520, delay: .3, lingerDuration: 1.2, tickInterval: .4 }, effects: [{ type: 'damage' }] }),
  frame_warcall: art('frame_warcall', 'Warcall', { useTime: 0, cooldown: 5, tags: ['spell', 'warcry', 'buff', 'aoe', 'duration'], delivery: { type: 'nova', radius: 230 } }),
  frame_crush_order: art('frame_crush_order', 'Crush!', { tags: ['spell', 'minion'], cooldown: 24, useTime: 0 }),
  frame_interpose: art('frame_interpose', 'Interpose!', { tags: ['spell', 'minion'], useTime: 0 }),
  frame_charge_order: art('frame_charge_order', 'Guardian’s Advance', { tags: ['spell', 'minion'], cooldown: 12, useTime: 0 }),
  frame_rush: art('frame_rush', 'Rampart Rush', { useTime: 0, tags: ['attack', 'physical', 'aoe', 'movement'], baseDamage: { physical: [12, 18] },
    delivery: { type: 'nova', radius: 85 }, effects: [{ type: 'damage' }, { type: 'knockback', strength: 100 }] }),
  frame_wave: art('frame_wave', 'Rampart Wave', { useTime: 0, tags: ['attack', 'physical', 'aoe', 'guard'], baseDamage: { physical: [12, 18] },
    delivery: { type: 'nova', radius: 100 }, effects: [{ type: 'damage' }, { type: 'knockback', strength: 110 }] }),
  frame_challenge: art('frame_challenge', 'Ossuary Challenge', { useTime: 0, cooldown: 3, tags: ['spell', 'warcry', 'aoe', 'duration'], delivery: { type: 'nova', radius: 180 }, effects: [{ type: 'status', status: 'taunted', chance: 1, durationOverride: 2 }] }),
  frame_reknit: art('frame_reknit', 'Reknit', { description: 'Channel to repair your active bone frame while it fights independently. Sanctuary of Bone spends its life to heal nearby allies instead.', tags: ['spell', 'channel', 'minion'], useTime: 0, manaCost: 0, castMode: 'channel',
    channel: { interval: .25, windup: .25, move: 'slowed', moveFactor: .35, trackAim: true }, delivery: { type: 'self' } }),
  frame_repair: art('frame_repair', 'Reknitting Pulse', { useTime: 0, tags: ['spell', 'heal'], delivery: { type: 'self' }, effects: [{ type: 'heal', amount: 1 }] }),
  frame_mending: art('frame_mending', 'Ossuary Transfusion', { useTime: 0, tags: ['spell', 'aoe', 'heal'], delivery: { type: 'nova', radius: 240 }, effects: [{ type: 'heal', amount: 1, excludeCaster: true }] }),
  frame_ward: art('frame_ward', 'Bone Ward', { useTime: 0, tags: ['spell', 'aoe', 'guard', 'duration'], delivery: { type: 'nova', radius: 240 } }),
  frame_reliquary: art('frame_reliquary', 'Ossuary Reliquary', { useTime: 0, tags: ['spell', 'aoe', 'guard', 'duration'], delivery: { type: 'ground', radius: 190, castRange: 0, delay: 0, lingerDuration: 10, tickInterval: 1 } }),
  frame_explosion: art('frame_explosion', 'Reliquary Detonation', { useTime: 0, tags: ['spell', 'physical', 'aoe'], baseDamage: { physical: [70, 105] }, delivery: { type: 'nova', radius: 190 }, effects: [{ type: 'damage' }] }),
};
