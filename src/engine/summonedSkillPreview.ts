import type { Actor } from './actor';
import { skillInstanceName } from './skillEmpowerment';
import { previewSkill, type SkillPreview } from './skillPreview';
import { effectiveSkillLevel, type SkillInstance } from './skills';

export interface SummonedAbility {
  id: string; name: string; description: string; level: number; preview: SkillPreview;
}
export interface SummonedRoster {
  bodies: { id: number; name: string; level: number }[];
  selected?: { id: number; name: string; abilities: SummonedAbility[] };
}

/** The same selected body supplies all displayed values in solo, couch and remote play. */
export function summonedSkillPreview(bodies: Actor[], chosen?: number): SummonedRoster {
  const roster: SummonedRoster = { bodies:bodies.map(({id,name,level}) => ({id,name,level})) };
  const body = bodies.find(actor => actor.id === chosen) ?? bodies[0];
  if (!body) return roster;
  const device = body.construct;
  const skills = new Set([...body.skills, device?.castInst, ...(body.summonArtState?.kit ?? []),
    ...(body.frameState?.kit ?? []), ...(body.cohortState?.kit ?? [])].filter((s): s is SkillInstance => !!s));
  const abilities = [...skills].map(inst => {
    const preview = previewSkill(body,inst);
    // Totems and sentries use the normal cast clock. Reactive arts and devices answer their own triggers.
    const repeated = device ? !device.castOnStruck && (device.kind === 'totem' || device.kind === 'sentry') : body.skills.includes(inst);
    if (!repeated) delete preview.estimatedHitDps;
    return {id:inst.def.id,name:skillInstanceName(inst),description:inst.def.description,level:effectiveSkillLevel(inst),preview};
  });
  roster.selected = {id:body.id,name:body.name,abilities};
  return roster;
}
