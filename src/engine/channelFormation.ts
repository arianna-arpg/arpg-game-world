import { mod } from './stats';
import type { Actor, CastingState } from './actor';
import type { World } from './world';
import type { Vec2 } from '../core/math';
import { instanceDelivery, instanceMods, skillContextTags, type SkillInstance } from './skills';
import { summonCapacity } from './summonContracts';
import { empoweredSkill } from './castSequence';

type Formation = { owner: Actor; inst: SkillInstance; cast: CastingState; members: { actor: Actor; slot: number }[] };
/** Lifecycle belongs to the exact held cast, never to a global skill ID. */
export class ChannelFormations {
  private formations = new Map<Actor, Formation>();
  constructor(private world: World,
    private spawn: (owner: Actor, inst: SkillInstance, pos: Vec2) => Actor | null,
    private fire: (actor: Actor, inst: SkillInstance, aim: Vec2, arrival?: boolean) => void) {}

  private position(f: Formation, slot: number): Vec2 {
    const d = instanceDelivery(f.inst);
    if (d.type !== 'summon' || !d.channelFormation) return { ...f.owner.pos };
    const lateral = (slot % 2 ? 1 : -1) * (1 + Math.floor(slot / 2)) * d.channelFormation.spacing;
    return { x: f.owner.pos.x - Math.sin(f.owner.facing) * lateral,
      y: f.owner.pos.y + Math.cos(f.owner.facing) * lateral };
  }
  private aim(f: Formation, body: Actor): Vec2 {
    const d = instanceDelivery(f.inst);
    const reach = d.type === 'summon' ? d.channelFormation?.reach ?? 470 : 470;
    const distance = Math.max(60, Math.min(reach, Math.hypot(f.cast.aim.x - f.owner.pos.x, f.cast.aim.y - f.owner.pos.y)));
    return { x: body.pos.x + Math.cos(f.owner.facing) * distance,
      y: body.pos.y + Math.sin(f.owner.facing) * distance };
  }
  pulse(owner: Actor, inst: SkillInstance): void {
    const d = instanceDelivery(inst), cast = owner.casting;
    if (d.type !== 'summon' || !d.channelFormation || cast?.inst !== inst || cast.mode !== 'channel') return;
    let f = this.formations.get(owner);
    if (f && f.cast !== cast) { this.retire(f); f = undefined; }
    if (!f) { f = { owner, inst, cast, members: [] }; this.formations.set(owner, f); }
    f.members = f.members.filter(m => !m.actor.dead);
    const cap = summonCapacity(owner, inst, d);
    const count = Math.max(1, Math.round(d.count + owner.sheet.get('summonCount', skillContextTags(inst), instanceMods(inst))));
    for (let n = 0; n < count && f.members.length < cap; n++) {
      let slot = 0; while (f.members.some(m => m.slot === slot)) slot++;
      const body = this.spawn(owner, inst, this.position(f, slot));
      if (!body) break;
      body.channelFormation = true; body.facing = owner.facing;
      if (d.channelFormation.emerge) this.world.emergeBody(body, { spec: d.channelFormation.emerge });
      f.members.push({ actor: body, slot });
      if (d.channelFormation.attackSpeedMore) body.sheet.setSource('channelFormation', [mod('attackSpeed', 'more', d.channelFormation.attackSpeedMore)]);
      const primary = body.skills[0];
      if (d.channelFormation.fireOnArrival && primary && !body.tagsForbidden(primary)) {
        this.fire(body, primary, this.aim(f, body), true);
        // The first shot is immediate; its recovery still pays one accelerated attack beat.
        body.useLock = Math.max(body.useLock, body.skillUseTime(primary));
      }
    }
  }
  release(owner: Actor, cast: CastingState): void {
    const f = this.formations.get(owner);
    if (!f || f.cast !== cast) return;
    const d = instanceDelivery(f.inst);
    const living = f.members.filter(m => !m.actor.dead);
    if (!owner.dead && !owner.downed && !owner.isStunned() && d.type === 'summon'
      && d.channelFormationRelease && living.length >= summonCapacity(owner, f.inst, d)) {
      for (const { actor } of living) {
        // Native kit order owns the primary art; taught cooldown arts append.
        const primary = actor.skills[0];
        if (!primary || actor.isStunned() || actor.tagsForbidden(primary)) continue;
        const spec = d.channelFormationRelease;
        actor.casting = null; actor.facing = owner.facing;
        this.fire(actor, empoweredSkill(primary, spec.power, spec.size), this.aim(f, actor));
      }
    }
    this.retire(f);
  }
  private retire(f: Formation): void {
    this.formations.delete(f.owner);
    for (const { actor } of f.members) if (!actor.dead) { actor.casting = null; this.world.kill(actor, true); }
  }
  clear(owner?: Actor, inst?: SkillInstance): void {
    for (const f of [...this.formations.values()]) if ((!owner || f.owner === owner) && (!inst || f.inst === inst)) this.retire(f);
  }
  update(): void {
    for (const f of [...this.formations.values()]) {
      const owner = f.owner;
      if (owner.dead || owner.downed || owner.isStunned() || owner.casting !== f.cast
        || !owner.skills.includes(f.inst) || !this.world.actors.includes(owner)) { this.retire(f); continue; }
      if (!f.cast.held) continue; // updateCasting owns the ordinary release payoff.
      for (const { actor, slot } of f.members) {
        if (actor.dead) continue;
        actor.tier = owner.tier; actor.facing = owner.facing;
        actor.pos = this.world.clampPos(this.position(f, slot), actor.radius, undefined, { mover: actor });
        const aim = this.aim(f, actor);
        if (actor.casting) { actor.casting.aim = aim; continue; }
        if (!actor.canAct()) continue;
        // Taught cooldown arts take their turn; native arrows fill the gaps.
        const kit = actor.skills.filter((s): s is SkillInstance => !!s).sort((a, b) => b.def.cooldown - a.def.cooldown);
        for (const skill of kit) if (this.world.useSkill(actor, skill, aim)) break;
      }
    }
  }
}
