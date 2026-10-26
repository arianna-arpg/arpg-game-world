import type { SkillFlightProfile, SkillFieldProfile } from './skillFlightVisuals';
import type { StatusDef } from '../engine/status';

/** Optional component identities, separate from the base-skill visual census. */
export const PROJECTILE_ART_FLIGHTS: Readonly<Record<string, SkillFlightProfile>> = {
  ember_satellite: { head: 'flame', wake: 'beads', motion: 'tumble', count: 2, body: 'orb', echo: 'rays' },
};
export const PROJECTILE_ART_FIELDS: Readonly<Record<string, SkillFieldProfile>> = {
  incandescent_pillar: { motif: 'flame', layout: 'rings', motion: 'rise', count: 7, echo: 'rays', column: true },
};
export const STATUS_APPEARANCES: Readonly<Record<string, NonNullable<StatusDef['bodyCue']>>> = {
  white_heat: { group: 'white-ignite', parts: [
    { kind: 'flames', color: '#fff8ed', scale: 1.2, params: { n: 6 } },
    { kind: 'emberSparks', color: '#ccecff', scale: 0.9, params: { n: 5 } },
  ] },
};
