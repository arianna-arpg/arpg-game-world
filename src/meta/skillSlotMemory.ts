import type { SkillInstance } from '../engine/skills';
import type { SkillTag } from '../engine/stats';

/** Families whose last equipped positions carry across lives. No skill-id or
 * bar-size assumptions: newly authored flasks enroll through their tags. */
export const SKILL_SLOT_MEMORY_CFG: { tags: readonly SkillTag[] } = { tags: ['flask'] };
export type SkillSlotMemory = Record<string, number>;

export function restoreSkillSlotMemory(raw: unknown): SkillSlotMemory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([id, slot]) =>
    id.length > 0 && Number.isSafeInteger(slot) && slot >= 0));
}

/** Empty/removed skills never erase memory. Missing-only capture seeds old
 * saves and automatic gifts without replacing a player's prior preference. */
export function rememberSkillSlot(memory: SkillSlotMemory, inst: SkillInstance,
  slot: number, overwrite = true): boolean {
  if (!Number.isSafeInteger(slot) || slot < 0
    || !SKILL_SLOT_MEMORY_CFG.tags.some(tag => inst.def.tags.includes(tag))) return false;
  const previous = memory[inst.def.id];
  if (previous === slot || (!overwrite && previous !== undefined)) return false;
  memory[inst.def.id] = slot;
  return true;
}

/** Reserve every usable preference before assigning first-empty fallbacks.
 * Existing occupants win, including class/mastery skills and kit flasks.
 * Duplicate preferences are resolved in gift order; a full bar returns -1. */
export function planSkillSlots(ids: readonly string[], bar: readonly (string | null)[],
  memory: SkillSlotMemory): Map<string, number> {
  const slots = [...bar], plan = new Map<string, number>();
  const pending = [...new Set(ids)].filter(id => {
    const at = slots.indexOf(id);
    if (at < 0) return true;
    plan.set(id, at);
    return false;
  });
  for (const id of pending) {
    const at = memory[id];
    if (!Number.isSafeInteger(at) || at < 0 || at >= slots.length || slots[at] !== null) continue;
    slots[at] = id;
    plan.set(id, at);
  }
  for (const id of pending) {
    if (plan.has(id)) continue;
    const at = slots.indexOf(null);
    if (at >= 0) slots[at] = id;
    plan.set(id, at);
  }
  return plan;
}
