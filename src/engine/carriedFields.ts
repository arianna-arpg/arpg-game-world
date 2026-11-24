import { CARRIED_FIELDS, carriedFieldStat, type CarriedFieldDef } from '../data/carriedFields';
import { SKILLS } from '../data/skills';
import type { Actor } from './actor';
import { instanceMods, makeSkillInstance, skillContextTags, type SkillInstance } from './skills';
import type { PactSpawn } from './summonPactSpec';
import type { World } from './world';

type Field = World['zones'][number];
interface Rite {
  def: CarriedFieldDef;
  field: Field;
  fallback: SkillInstance;
  growth: number[];
  keeper?: Actor;
  guests: Actor[];
  reformAt: number;
}
const ids = CARRIED_FIELDS.map(d => d.id);
const byId = new Map(CARRIED_FIELDS.map(d => [d.id, d]));

/** The zone owns damage, healing, shape and replication. This controller
 * owns only the lifetime of the grant, its added beats and its escort. */
export class CarriedFields {
  private owners = new Map<Actor, Map<string, Rite>>();
  constructor(private w: World, private spawn: (a: Actor, inst: SkillInstance, opts: PactSpawn) => Actor | null) {}

  private dismiss(r: Rite): void {
    const bodies = [r.keeper, ...r.guests];
    r.keeper = undefined;
    r.guests = [];
    for (const body of bodies) if (body && !body.dead) this.w.kill(body, true);
  }

  retire(owner: Actor): void {
    const rites = this.owners.get(owner);
    if (!rites) return;
    this.owners.delete(owner);
    for (const r of rites.values()) this.remove(r);
  }

  private remove(r: Rite): void {
    const i = this.w.zones.indexOf(r.field);
    if (i >= 0) this.w.zones.splice(i, 1);
    this.dismiss(r);
  }

  clear(): void { for (const a of this.owners.keys()) this.retire(a); }

  private create(owner: Actor, def: CarriedFieldDef): Rite {
    const fallback = makeSkillInstance(SKILLS[def.skill], 1, 0);
    const field: Field = {
      pos: { ...owner.pos }, tier: owner.tier, caster: owner, inst: fallback, color: fallback.def.color,
      radius: def.radius, shape: 0, facing: 0, follow: true, delay: 0, exploded: true,
      linger: 1, tickInterval: def.interval, tickTimer: def.interval, dmgMult: def.pulsePower,
      depth: 1, carriedFieldBeats: [], spareDormant: true,
    };
    this.w.zones.push(field);
    return { def, field, fallback, growth: [], guests: [], reformAt: 0 };
  }

  private refreshRadius(owner: Actor, r: Rite): void {
    const { field, def } = r;
    const growth = def.growth;
    if (!growth || owner.sheet.get(growth.stat) <= 0) r.growth.length = 0;
    while (r.growth.length && r.growth[0] <= this.w.time) r.growth.shift();
    field.radius = def.radius * (1 + r.growth.length * (growth?.perStack ?? 0))
      * owner.sheet.get('aoeRadius', skillContextTags(field.inst), instanceMods(field.inst));
  }

  reconcile(owner: Actor): void {
    if (owner.dead || owner.downed || owner.summonPactReward) { this.retire(owner); return; }
    let rites = this.owners.get(owner);
    for (const id of owner.sheet.armedFamily('carriedField_', ids)) {
      const def = byId.get(id)!;
      if (owner.sheet.get(carriedFieldStat(id)) <= 0) continue;
      if (!rites) this.owners.set(owner, rites = new Map());
      let r = rites.get(id);
      if (!r) rites.set(id, r = this.create(owner, def));
      // A skill-tree refund or off-bar cleanup can retire ordinary skill ground.
      if (!this.w.zones.includes(r.field)) this.w.zones.push(r.field);
      r.field.inst = this.w.seatOf(owner)?.meta.knownSkills.get(def.skill)
        ?? owner.skills.find(s => s?.def.id === def.skill) ?? r.fallback;
      this.refreshRadius(owner, r);
      if (!def.escort || owner.sheet.get(def.escort.stat) <= 0) {
        if (r.keeper || r.guests.length) this.dismiss(r);
        r.reformAt = 0;
      } else {
        if (r.keeper?.dead) { r.keeper = undefined; r.reformAt = this.w.time + def.escort.reform; }
        if (!r.keeper && this.w.time >= r.reformAt) r.keeper = this.guard(owner, r, false) ?? undefined;
        r.guests = r.guests.filter(b => !b.dead);
      }
    }
    if (!rites) return;
    for (const [id, r] of rites) if (owner.sheet.get(carriedFieldStat(id)) <= 0) {
      rites.delete(id);
      this.remove(r);
    }
    if (!rites.size) this.owners.delete(owner);
  }

  update(): void {
    for (const a of this.owners.keys()) {
      if (a.seamlessSleep || this.w.actorById(a.id) !== a) this.retire(a);
    }
    const pool = (this.w.seamlessSurfaceActive && this.w.seamlessAwakeActors.length > 0)
      ? this.w.seamlessAwakeActors
      : this.w.actors;
    for (let i = 0; i < pool.length; i++) this.reconcile(pool[i]);
  }

  private guard(owner: Actor, r: Rite, guest: boolean): Actor | null {
    const spec = r.def.escort!;
    const inst = makeSkillInstance(SKILLS[spec.skill], 1, 0), base = inst.def.delivery;
    if (base.type !== 'summon') return null;
    const angle = (1 + r.guests.length) * 2.4, reach = r.field.radius * 0.45;
    const pos = this.w.clampPos({ x: owner.pos.x + Math.cos(angle) * reach, y: owner.pos.y + Math.sin(angle) * reach },
      owner.radius, owner.pos, { tier: owner.tier });
    const body = this.spawn(owner, inst, { pos, pact: carriedFieldStat(r.def.id), noReplace: true,
      delivery: { ...base, duration: guest ? spec.duration : undefined },
      offspring: { maxActive: spec.maxGuests + 1, size: 1, life: 1, damage: 1 } });
    // World factions can be enemies even on the same simulation team.
    if (body && owner.team === 'enemy') body.faction = owner.faction;
    return body;
  }

  /** Enforce the circle after AI movement, knockback and body separation.
   * A floor change or teleport recalls the escort to its own bearer. */
  contain(): void {
    for (const [owner, rites] of this.owners) for (const r of rites.values()) {
      r.field.pos = { ...owner.pos };
      r.field.tier = owner.tier;
      for (const body of [r.keeper, ...r.guests]) {
        if (!body || body.dead) continue;
        const dx = body.pos.x - owner.pos.x, dy = body.pos.y - owner.pos.y;
        const d = Math.hypot(dx, dy), reach = Math.max(0, r.field.radius - body.radius);
        if (owner.tier === body.tier && d <= reach) continue;
        body.tier = owner.tier;
        const scale = d > 0 ? Math.min(1, reach / d) : 0;
        const p = this.w.clampPos({ x: owner.pos.x + dx * scale, y: owner.pos.y + dy * scale },
          body.radius, owner.pos, { mover: body, tier: owner.tier });
        body.pos = Math.hypot(p.x - owner.pos.x, p.y - owner.pos.y) <= reach ? p : { ...owner.pos };
      }
    }
  }

  private answer(owner: Actor, r: Rite, cast: boolean): void {
    if (owner.dead || owner.downed || this.owners.get(owner)?.get(r.def.id) !== r
      || owner.sheet.get(carriedFieldStat(r.def.id)) <= 0) return;
    const { growth, escort } = r.def;
    if (cast && growth && owner.sheet.get(growth.stat) > 0) {
      if (r.growth.length >= growth.max) r.growth.shift();
      r.growth.push(this.w.time + growth.duration);
      this.refreshRadius(owner, r);
    }
    for (let i = 0; i < r.def.beats; i++) r.field.carriedFieldBeats!.push(this.w.time + i * r.def.beatGap);
    if (escort && owner.sheet.get(escort.stat) > 0 && r.guests.filter(b => !b.dead).length < escort.maxGuests) {
      const body = this.guard(owner, r, true);
      if (body) r.guests.push(body);
    }
  }

  cast(owner: Actor, inst: SkillInstance): void {
    const rites = this.owners.get(owner);
    if (rites) for (const r of rites.values()) if (r.def.castSkills.includes(inst.def.id)) this.answer(owner, r, true);
  }

  /** Each real swing carries one receipt through every sweep, bounce or HoT.
   * A reward can never outlive the particular field that issued the receipt. */
  prepare(owner: Actor, inst: SkillInstance, realUse: boolean): SkillInstance {
    const rites = this.owners.get(owner);
    if (realUse && rites) {
      const listening = [...rites.values()].filter(r => r.def.mendSkills.includes(inst.def.id));
      if (listening.length) {
        let spent = false;
        return { ...inst, carriedFieldMend: () => {
          if (spent) return;
          spent = true;
          for (const r of listening) this.answer(owner, r, false);
        } };
      }
    }
    return inst.carriedFieldMend ? { ...inst, carriedFieldMend: undefined } : inst;
  }
}
