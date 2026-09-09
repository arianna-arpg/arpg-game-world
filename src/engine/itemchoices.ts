import { Rng } from '../core/rng';
import type { ItemInstance, RangedLineDef, UniqueDef } from './items';

export interface UniqueChoiceGroup {
  id: string;
  options: { id: string; weight: number; lines: RangedLineDef[] }[];
}
export interface UniqueChoiceRoll { id: string; rolls: number[] }

/** Stable IDs, not option indices: changing registry order cannot reroll gear. */
export function rollUniqueChoices(def: UniqueDef, rng: () => number, magnitude = rng): Record<string, UniqueChoiceRoll> | undefined {
  if (!def.choices?.length) return undefined;
  const result: Record<string, UniqueChoiceRoll> = {};
  for (const group of def.choices) {
    const pool = group.options.filter(o => o.weight > 0 && Number.isFinite(o.weight));
    if (!pool.length) continue;
    let roll = rng() * pool.reduce((n, o) => n + o.weight, 0);
    const option = pool.find(o => (roll -= o.weight) < 0) ?? pool[pool.length - 1];
    const rolls = option.lines.map(() => magnitude());
    for (let i = 1; i < rolls.length; i++) if (option.lines[i].sharedRoll) rolls[i] = rolls[0];
    result[group.id] = { id: option.id, rolls };
  }
  return result;
}

/** Old items acquire a deterministic identity without touching combat RNG.
 * Missing/retired options migrate on their group-local seed. Saved valid IDs win. */
export function resolveUniqueChoices(item: ItemInstance, def: UniqueDef): Record<string, UniqueChoiceRoll> | undefined {
  if (!def.choices?.length) return undefined;
  const result: Record<string, UniqueChoiceRoll> = {};
  for (const group of def.choices) {
    let seed = item.uid ^ Math.imul(item.ilvl, 0x9e3779b9);
    for (const c of `${def.id}:${group.id}`) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
    const rng = new Rng(seed);
    const stored = item.uniqueChoices?.[group.id];
    const option = stored && group.options.find(o => o.id === stored.id);
    if (option) {
      const rolls = option.lines.map((_, i) => {
        const value = stored.rolls?.[i];
        return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
      });
      for (let i = 1; i < rolls.length; i++) if (option.lines[i].sharedRoll) rolls[i] = rolls[0];
      result[group.id] = { id: option.id, rolls };
    } else {
      const fallback = rollUniqueChoices({ ...def, choices: [group] }, () => rng.next())?.[group.id];
      if (fallback) result[group.id] = fallback;
    }
  }
  return result;
}

/** ONE line/roll view feeds compilation and description, including choice rows. */
export function rolledUniqueLines(item: ItemInstance, def: UniqueDef): { line: RangedLineDef; roll: number }[] {
  const rows = def.lines.map((line, i) => ({ line, roll: item.uniqueRolls?.[i] ?? 0.5 }));
  const choices = resolveUniqueChoices(item, def);
  for (const group of def.choices ?? []) {
    const selected = choices?.[group.id];
    const option = group.options.find(o => o.id === selected?.id);
    option?.lines.forEach((line, i) => rows.push({ line, roll: selected!.rolls[i] }));
  }
  return rows;
}

export function uniqueDefinitionLines(def: UniqueDef): RangedLineDef[] {
  return [...def.lines, ...(def.choices ?? []).flatMap(g => g.options.flatMap(o => o.lines))];
}
