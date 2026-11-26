import { PROJECTILE_ART_FIELDS, PROJECTILE_ART_FLIGHTS } from './projectileArtVisuals';
import { SKILL_BEAMS, SKILL_FIELDS, SKILL_FLIGHTS, type SkillFieldProfile } from './skillFlightVisuals';
import { SKILL_BURSTS } from './skillVisuals';
import { SKILL_MOVEMENTS } from './skillMovementVisuals';
import { SKILL_PRESENCES } from './skillPresenceVisuals';
import { SKILL_SELFS } from './skillSelfVisuals';
import { SKILL_STRIKES } from './skillStrikeVisuals';
import { SKILL_TARGETS } from './skillTargetVisuals';

/** Area placements can carry any delivery as their payload, including boss
 * scripts, target deposits and support conversions. Compose the source material
 * once; native fields and explicitly authored components keep their full recipe. */
const fields: Record<string, SkillFieldProfile> = Object.create(null);
for (const [id, p] of Object.entries(SKILL_BURSTS))
  fields[id] = { motif: p.motif, layout: p.rings ? 'rings' : 'spokes', motion: p.motion, count: Math.min(10, p.count), echo: p.echo };
for (const [id, p] of Object.entries({ ...SKILL_FLIGHTS, ...PROJECTILE_ART_FLIGHTS }))
  fields[id] = { motif: p.head, layout: p.wake === 'links' ? 'lattice' : p.wake === 'helix' ? 'spiral' : 'scatter',
    motion: p.motion === 'tumble' ? 'orbit' : p.motion === 'weave' ? 'rise' : 'breathe', count: p.count + 3, echo: p.echo };
for (const [id, p] of Object.entries(SKILL_MOVEMENTS))
  fields[id] = { motif: p.motif, layout: p.motion === 'coil' ? 'spiral' : 'spokes', motion: 'out', count: p.count + 2 };
for (const [id, p] of Object.entries(SKILL_STRIKES))
  fields[id] = { motif: p.motif, layout: 'spokes', motion: p.motion === 'in' ? 'in' : 'out', count: p.count, echo: p.echo };
for (const [id, p] of Object.entries(SKILL_SELFS))
  fields[id] = { motif: p.motif, layout: p.motion === 'twist' ? 'spiral' : 'spokes', motion: 'out', count: p.count };
for (const [id, p] of Object.entries(SKILL_TARGETS))
  fields[id] = { motif: p.motif, layout: 'scatter', motion: 'rise', count: p.count, echo: p.echo };
for (const [id, p] of Object.entries(SKILL_PRESENCES))
  fields[id] = { motif: p.motif, layout: p.motion === 'coil' ? 'spiral' : 'scatter',
    motion: p.motion === 'rise' ? 'rise' : 'out', count: p.count };
const beamFields = {
  lance: { motif: 'rays', layout: 'spokes', motion: 'out', count: 5 },
  braid: { motif: 'souls', layout: 'spiral', motion: 'in', count: 5 },
  eye: { motif: 'runes', layout: 'rings', motion: 'breathe', count: 4 },
  fault: { motif: 'cracks', layout: 'roots', motion: 'out', count: 6 },
  prism: { motif: 'rays', layout: 'lattice', motion: 'rise', count: 7 },
  scales: { motif: 'shields', layout: 'scatter', motion: 'in', count: 6 },
} satisfies Record<typeof SKILL_BEAMS[keyof typeof SKILL_BEAMS], SkillFieldProfile>;
for (const [id, form] of Object.entries(SKILL_BEAMS)) fields[id] = beamFields[form];
Object.assign(fields, SKILL_FIELDS, PROJECTILE_ART_FIELDS);

export const SKILL_AREA_PROFILES: Readonly<Record<string, SkillFieldProfile>> = fields;
export function fieldProfile(id: string): SkillFieldProfile | undefined { return fields[id]; }
export function skillFieldImpactVoice(id: string): string | undefined {
  return fields[id] && 'skillFieldImpact:' + id;
}
