import type { Actor } from './actor';
import { instanceMods, makeSkillInstance, skillContextTags, skillMaxLevel,
  type SkillDef, type SkillInstance, type SummonDelivery } from './skills';
import { STAT_DEFS } from './stats';

/** Ordinary modifier families: summed levels, and a skill-specific reservation multiplier. */
export const COMPANION_GRANT_PREFIX = 'companiongrant_';
export const companionGrantStat = (id: string): string => COMPANION_GRANT_PREFIX + id;
export const summonReservationStat = (id: string): string => 'summonReservation_' + id;

export function registerCompanionGrants(skills: readonly SkillDef[]): void {
  for (const def of skills) {
    if (def.delivery.type !== 'summon' || !def.delivery.persistent) continue;
    STAT_DEFS[companionGrantStat(def.id)] = { label: `Companion: ${def.name}`, base: 0, min: 0 };
    STAT_DEFS[summonReservationStat(def.id)] = { label: `${def.name} Reservation`, base: 1, min: 0 };
  }
}

/** Both admission and live contracts use this price. Mana cost investment still applies. */
export function summonReservationUnit(actor: Actor, inst: SkillInstance, d: SummonDelivery): number {
  const tags = skillContextTags(inst), mods = instanceMods(inst);
  return (d.persistent?.reserve ?? 0) * actor.sheet.get('manaCost', tags, mods)
    * actor.sheet.get(summonReservationStat(inst.def.id), tags, mods, 1);
}

interface CompanionGrant {
  inst: SkillInstance;
  body?: Actor;
  remaining: number;
}

/** Item followers use normal summon construction and attribution, with their own
 * one-body lifecycle. Never occupy a bar, a manual summon cap, or a reservation.
 * Live bodies survive re-derivation; death waits the skill's authored respawn time.
 * Missing bodies (zone travel/load) are rebuilt at the owner's next world tick. */
export class CompanionGrants {
  private owners = new WeakMap<Actor, Map<string, CompanionGrant>>();

  derive(owner: Actor, defs: readonly SkillDef[], source: (id: string) => string,
    retire: (body: Actor) => void, refresh: (body: Actor, inst: SkillInstance) => void): void {
    const previous = this.owners.get(owner) ?? new Map<string, CompanionGrant>();
    const next = new Map<string, CompanionGrant>();
    for (const def of defs) {
      if (def.delivery.type !== 'summon' || !def.delivery.persistent) continue;
      const level = Math.min(skillMaxLevel(def), Math.floor(owner.sheet.get(companionGrantStat(def.id))));
      if (level < 1) continue;
      let row = previous.get(def.id);
      if (!row) {
        const inst = makeSkillInstance(def, level, 0);
        inst.companionGrant = true;
        row = { inst, remaining: 0 };
      }
      const changed = row.inst.level !== level;
      row.inst.level = level;
      if (changed && row.body && !row.body.dead) refresh(row.body, row.inst);
      row.inst.grantedBy = source(def.id);
      next.set(def.id, row);
    }
    for (const [id, row] of previous) if (!next.has(id) && row.body && !row.body.dead) retire(row.body);
    if (next.size) this.owners.set(owner, next);
    else this.owners.delete(owner);
  }

  update(owner: Actor, actors: readonly Actor[], dt: number,
    spawn: (inst: SkillInstance, delivery: SummonDelivery) => Actor | null,
    retire: (body: Actor) => void): void {
    for (const row of this.owners.get(owner)?.values() ?? []) {
      const d = row.inst.def.delivery;
      if (d.type !== 'summon' || !d.persistent) continue;
      if (owner.dead) {
        if (row.body && !row.body.dead) retire(row.body);
        row.body = undefined;
        row.remaining = d.persistent.respawnTime;
        continue;
      }
      if (row.body?.dead) {
        row.remaining = d.persistent.respawnTime * owner.sheet.get('minionRespawnTime',
          skillContextTags(row.inst), instanceMods(row.inst));
        row.body = undefined;
      } else if (row.body && !actors.includes(row.body)) {
        row.body = undefined;
      }
      if (row.body || owner.downed) continue;
      row.remaining = Math.max(0, row.remaining - dt);
      if (row.remaining > 0) continue;
      row.body = spawn(row.inst, { ...d, persistent: undefined, poolGroup: undefined,
        count: 1, maxActive: 1 }) ?? undefined;
    }
  }
}
