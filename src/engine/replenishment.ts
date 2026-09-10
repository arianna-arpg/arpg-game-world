import type { Actor } from './actor';
import { instanceDelivery, instanceMods, skillContextTags, type SkillInstance, type SummonDelivery } from './skills';

/** The resolved passive summon, shared by casting gates, the clock and UI. */
export function replenishingDelivery(inst: SkillInstance): SummonDelivery | undefined {
  if (inst.def.delivery.type !== 'summon') return undefined;
  const d = instanceDelivery(inst);
  return d.type === 'summon' && d.replenish ? d : undefined;
}

/** One set of live numbers for simulation and preview; modifiers use the
 *  authored base, including multiplicative cap investment. */
export function replenishShape(actor: Actor, inst: SkillInstance, d: SummonDelivery) {
  const tags = skillContextTags(inst.def), extra = instanceMods(inst);
  return {
    cap: Math.max(1, Math.round(actor.sheet.get('minionMaxCount', tags, extra, d.maxActive))),
    count: Math.max(1, d.count + Math.round(actor.sheet.get('summonCount', tags, extra))),
    interval: Math.max(0.1, (d.replenish?.interval ?? 1) * actor.sheet.get('minionRespawnTime', tags, extra)),
  };
}

/** World-local, transient clocks: no offline catch-up or save/wire state.
 *  Call once per actor tick with the currently seated eligible instances.
 *  Full pools reset their clock; losses wait a full interval to replenish.
 *  Bounded to one batch per tick, even after an unusually long frame. */
export class ReplenishmentClocks {
  private actors = new WeakMap<Actor, Map<SkillInstance, number>>();

  forget(actor: Actor, inst?: SkillInstance): void {
    if (inst) this.actors.get(actor)?.delete(inst);
    else this.actors.delete(actor);
  }

  update(actor: Actor, entries: { inst: SkillInstance; interval: number; room: number; count: number }[],
    dt: number, spawn: (inst: SkillInstance, count: number) => void): void {
    if (!entries.length) { this.actors.delete(actor); return; }
    let clocks = this.actors.get(actor);
    if (!clocks) { clocks = new Map(); this.actors.set(actor, clocks); }
    const seated = new Set(entries.map(e => e.inst));
    for (const inst of clocks.keys()) if (!seated.has(inst)) clocks.delete(inst);
    for (const e of entries) {
      const remaining = e.room <= 0 ? e.interval : (clocks.get(e.inst) ?? e.interval) - dt;
      clocks.set(e.inst, remaining > 0 ? remaining : e.interval);
      if (remaining <= 0 && dt > 0 && e.room > 0) spawn(e.inst, Math.min(e.room, e.count));
    }
  }
}
