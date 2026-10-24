// Shared command selection for campaign and native-area AI hosts.
import { SKILLS } from '../data/skills';
import { dist } from '../core/math';
import type { Actor } from './actor';
import type { World } from './world';
import { instanceMetas, instanceDelivery, instanceMods, skillContextTags, type SkillInstance } from './skills';
import { sameStory } from './tiers';

export function autonomousDeviceMetas(caster: Actor, reserved: Set<string> | undefined, mint: (host: SkillInstance, skillId: string) => SkillInstance): SkillInstance[] {
    const seen = new Set(caster.skills.flatMap(s => s ? [s.def.id] : []));
    const commands: SkillInstance[] = [];
    for (const host of caster.skills) {
      if (!host || reserved?.has(host.def.id) || caster.aiSkillBans?.has(host.def.id)) continue;
      for (const meta of instanceMetas(host)) {
        if (!SKILLS[meta.skillId]?.ai?.autonomousMeta || seen.has(meta.skillId)) continue;
        seen.add(meta.skillId); commands.push(mint(host, meta.skillId));
      }
    }
    return commands;
  }

export function deviceCommandUseful(host: Pick<World, 'actors' | 'enemiesOf' | 'lineOfFire'>, caster: Actor, inst: SkillInstance): boolean {
    const spec = inst.def.ai?.deployed;
    if (!spec) return true;
    const devices = host.actors.filter(c => c.owner === caster && !c.dead
      && c.construct?.kind === spec.kind && !(c.construct.timer > 0)
      && c.construct.detonationLeft === undefined && !!c.construct.castInst);
    if (devices.length < (spec.minCount ?? 1)) return false;
    const targets = new Set<number>();
    for (const c of devices) {
      const payload = c.construct!.castInst!, delivery = instanceDelivery(payload);
      const base = spec.radius ?? ((delivery.type === 'nova' || delivery.type === 'ground')
        ? delivery.radius : payload.def.ai?.range ?? 0);
      const radius = base * c.sheet.get('aoeRadius', skillContextTags(payload), instanceMods(payload));
      for (const prey of host.enemiesOf(c)) {
        if (!prey.construct && sameStory(c, prey) && dist(c.pos, prey.pos) - prey.radius <= radius
          && host.lineOfFire(c.pos, prey.pos, c.tier)) targets.add(prey.id);
      }
    }
    return targets.size >= (spec.minTargets ?? 1);
  }
