import type { Actor } from './actor';
import { instanceChargeCost, instanceChargeGain, instanceEffects } from './skills';
import { ORB_DEFS, ORB_HIT_RECOVERY as C } from '../data/orbs';

const clocks = new WeakMap<Actor, Map<string, number>>();
const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** The best stocked applicable slotted flask represents available help. Saved
 * or unequipped banks, unrelated flask kinds and duplicate slots cannot skew it. */
export function orbReserveNeed(actor: Actor, kind: string): number {
  let fullest = 0;
  for (const inst of actor.skills) {
    if (!inst?.def.tags.includes('flask') || !instanceEffects(inst).some(fx =>
      (fx.type === 'restore' || fx.type === 'restoreOverTime') && fx.resource === kind)) continue;
    const cost = instanceChargeCost(inst);
    if (!cost || !instanceChargeGain(inst).some(t => t.on === 'orbPickup'
      && t.charge === cost.charge && (!t.orbKind || t.orbKind === kind))) continue;
    const cap = actor.chargeCapFor(cost.charge, inst);
    if (cap > 0) fullest = Math.max(fullest, clamp((actor.charges.get(cost.charge) ?? 0) / cap));
  }
  return 1 - fullest;
}

/** Called only after top-level damaging contact. No grant means no roll or
 * clock; failed rolls still consume their window. Actor/kind scope prevents
 * skill swaps, chains and additional targets from buying more attempts. */
export function orbHitChance(actor: Actor, kind: string, base: number, now: number): number {
  if (!(base > 0)) return 0;
  const def = ORB_DEFS[kind];
  if (!def?.hitRecovery) return Math.min(C.chanceCap, base);
  let bank = clocks.get(actor);
  if (!bank) clocks.set(actor, bank = new Map());
  const at = bank.get(kind);
  // Loading an earlier world clock must not strand a surviving actor's roll.
  if (at !== undefined && now >= at && now - at + 1e-9 < C.interval) return 0;
  bank.set(kind, now);
  const max = def.restore === 'life' ? actor.lifeCeiling() : def.restore === 'mana' ? actor.availableMaxMana() : 0;
  const value = def.restore === 'life' ? actor.life : actor.mana;
  const need = max > 0 ? clamp(1 - value / (max * C.resourceBelow)) : 0;
  return Math.min(C.chanceCap, base * (1 + C.maxBonus * need * orbReserveNeed(actor, kind)));
}
