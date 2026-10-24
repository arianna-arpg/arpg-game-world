import type { LookDef } from '../render/vis/parts';
import type { MonsterDef } from './monsters';
import type { StructureDef } from './structures';
import { mod } from '../engine/stats';
export interface SettlementDefensesSpec {
  source: string; offset: number; gateWidth: number; railRadius: number; guardLevel: number;
}
/** Snapshotted with each new expedition; existing layouts are never retrofitted. */
export const LASTLIGHT_DEFENSES: SettlementDefensesSpec = {
  source: 'settlements/lastlight-watch-v1', offset: 48, gateWidth: 168, railRadius: 27, guardLevel: 12,
};
export const SETTLEMENT_WATCH = { leash: 260, engage: 220 };
export const SETTLEMENT_GUARDS: Record<string, MonsterDef> = {
  lastlight_watchman: {
    id: 'lastlight_watchman', name: 'Lastlight Watchman', settlementGuard: true,
    color: '#aac8d1', shape: 'pentagon', radius: 15, look: 'lastlight_watchman',
    base: {life: 480, moveSpeed: 150, accuracy: 180, armor: 100, mana: 120, manaRegen: 16, lifeRegen: 3, poise: 90},
    mods: [mod('damage', 'more', 2), mod('blockChance', 'flat', .25)],
    skills: ['heavy_strike', 'cleave'], xp: 0, noNemesis: true, post: {slack: 36, pace: 1},
    brain: {type: 'basic', target: {leash: {radius: SETTLEMENT_WATCH.leash}},
      behavior: {castArc: .75, recovery: [.2, .35]}},
  },
  lastlight_bowman: {
    id: 'lastlight_bowman', name: 'Lastlight Bowman', settlementGuard: true,
    color: '#9ab5b9', shape: 'trapezoid', radius: 13, look: 'lastlight_bowman',
    base: {life: 360, moveSpeed: 140, accuracy: 180, armor: 65, mana: 150, manaRegen: 20, lifeRegen: 3, poise: 60},
    mods: [mod('damage', 'more', 1.5)], skills: ['piercing_arrow'], xp: 0, noNemesis: true,
    post: {slack: 36, pace: 1}, brain: {type: 'caster', target: {leash: {radius: SETTLEMENT_WATCH.leash}}},
  },
};
/** Reusable native masonry kit. Gates retain real dwell/breakable door state;
 * builders choose the faction and population rather than baking one into art. */
export const SETTLEMENT_DEFENSE_STRUCTURES: Record<string, StructureDef> = {
  watch_rampart: {id: 'watch_rampart', halfW: 135, halfH: 30, cellSize: 30,
    plan: ['#########', '__PPPPP__']},
  watch_gatehouse: {id: 'watch_gatehouse', halfW: 165, halfH: 105, cellSize: 30,
    plan: ['###_____###', '#T#_____#T#', '#W#_____#W#', '###XXXXX###', '#W#_____#W#', '#T#_____#T#', '###_____###'],
    legend: {X: {door: {mode: 'both', life: 900}, courtyard: true}},
    courtyardFloorStyle: 'cobble'},
};

export const SETTLEMENT_DEFENSE_LOOKS: Record<string, LookDef> = {
  lastlight_watchman: {parts: [{kind: 'cape', role: 'cloth'}, {kind: 'torso'}, {kind: 'pauldrons'}, {kind: 'sword'}, {kind: 'shield', params: {kite: true}}, {kind: 'helm'}]},
  lastlight_bowman: {parts: [{kind: 'cape', role: 'cloth'}, {kind: 'torso'}, {kind: 'pauldrons', scale: .8}, {kind: 'bow'}, {kind: 'helm'}]},
};
