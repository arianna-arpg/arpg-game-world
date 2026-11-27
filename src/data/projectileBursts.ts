import type { BurstMotif, SkillBurstProfile } from './skillVisuals';

// Material released by the payload. Independent of the flight body (a solid
// grenade can scatter metal, a stone can release lightning) and its spent pose.
export interface ProjectileBurstProfile extends SkillBurstProfile {
  release: 'pyre' | 'splinters' | 'droplets' | 'arcing' | 'crystal' | 'vortex';
}
const burst = (release: ProjectileBurstProfile['release'], motif: BurstMotif,
  motion: SkillBurstProfile['motion'], count: number, echo: BurstMotif, rings = 0): ProjectileBurstProfile =>
  ({ release, motif, motion, count, echo, rings });

export const PROJECTILE_BURSTS: Readonly<Record<string, ProjectileBurstProfile>> = {
  beast_amphibian_art: burst('droplets','arcs','out',7,'ice',1),
  skeletal_lich_fireball: burst('pyre','teeth','out',6,'flame'),
  rubble_burst: burst('splinters','cracks','out',7,'teeth'),
  rubble_conduit: burst('arcing','sparks','orbit',4,'cracks'),
  volatile_cinders: burst('pyre','flame','out',9,'sparks'),
  marrowhooks: burst('splinters','blades','in',5,'teeth'),
  lava_glob: burst('droplets','blood','out',5,'flame'),
  rolling_cannonade: burst('splinters','cracks','out',4,'flame',1),
  cold_spot: burst('crystal','ice','in',7,'steam'),
  hellfire_missile: burst('pyre','runes','out',3,'flame'),
  fireball: burst('pyre','flame','out',6,'steam'),
  infernal_cannonade: burst('pyre','flame','out',4,'cracks',2),
  magma_glob: burst('droplets','cracks','out',5,'blood'),
  grenado: burst('splinters','blades','out',9,'sparks'),
  sacrament_of_ruin: burst('vortex','runes','in',6,'blood',1),
  creeping_frost: burst('crystal','ice','out',5,'petals'),
  arcswarm: burst('arcing','sparks','orbit',7,'rays'),
  frostcreep: burst('crystal','petals','in',4,'ice'),
  rimeclaw: burst('crystal','blades','out',3,'ice'),
  invoke_lance: burst('arcing','rays','out',4,'runes'),
  gravewisp: burst('vortex','souls','orbit',5,'teeth'),
  magma_lob: burst('droplets','flame','orbit',4,'blood'),
};

export function projectileBurstVoice(id: string): string | undefined {
  return Object.hasOwn(PROJECTILE_BURSTS, id) ? 'projectileBurst:' + id : undefined;
}
