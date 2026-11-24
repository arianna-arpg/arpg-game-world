import type { SkillBurstProfile, BurstMotif } from './skillVisuals';
import type { IconSubject } from '../render/skillIconArt';
import type { Vec2 } from '../core/math';

const burst = (motif: BurstMotif, motion: SkillBurstProfile['motion'], count: number, echo?: BurstMotif): SkillBurstProfile =>
  ({ motif, motion, count, echo });

/** Keys are stable effect identities, independent of their granting node, item or skill. */
export const MECHANIC_BURSTS = {
  echoDebt: burst('chimes','in',4,'souls'), harmonyFlame: burst('chimes','out',3,'flame'),
  harmonyIce: burst('ice','in',3,'chimes'), harmonyBolt: burst('sparks','orbit',3,'chimes'),
  moltShrapnel: burst('teeth','out',8,'shields'), minionStruckFirePulse: burst('flame','out',6,'teeth'),
  poiseOverflow: burst('cracks','out',6,'shields'), triune_fire: {...burst('flame','orbit',3,'sparks'),echoColor:'#ffe875'},
  triune_cold: {...burst('ice','orbit',3,'flame'),echoColor:'#ff913e'},
  triune_lightning: {...burst('sparks','orbit',3,'ice'),echoColor:'#94dfff'}, elemDestabPower: burst('arcs','out',9,'ice'),
  windburnOverflow: burst('steam','orbit',7,'ice'), recyclePower: burst('ice','in',8,'steam'),
  pylonResonancePower: burst('sparks','orbit',4,'runes'), salvatoryCounter: burst('blades','out',3,'shields'),
  harvestGlobe: burst('spores','in',3,'souls'), phaseStasisPower: burst('runes','in',5,'teeth'),
  springBloomPower: burst('petals','out',5,'spores'), energyExtractPower: burst('sparks','in',4,'rays'),
  armorThornsScale: burst('shields','out',8,'teeth'), plagueWakeDps: burst('spores','orbit',6,'souls'),
  wickerDecoy: burst('blades','out',7,'petals'), volatileEffigy: burst('souls','out',7,'teeth'),
  ruptureSeed: burst('teeth','out',5,'spores'), moveBlast: burst('flame','out',5,'cracks'),
  cadenceMelee: burst('cracks','out',4,'blades'), cadenceShot: burst('blades','in',4,'rays'),
  cadenceSpell: burst('runes','out',4,'ice'), burnDetonatePower: burst('flame','out',8,'blood'),
  neuralSparkPower: burst('arcs','out',5,'sparks'), cryoCocoon: burst('shields','in',6,'ice'),
  cocoonShatter: burst('ice','out',6,'shields'), lithicFissurePower: burst('cracks','out',7,'shields'),
  plasmaDisintPower: burst('sparks','out',5,'souls'), critBlastPower: burst('cracks','out',3,'flame'),
  blockBladeSlash: burst('blades','orbit',5,'shields'), livingTidesPower: burst('petals','in',6,'rays'),
  dawnConsecrate: burst('rays','out',6,'chimes'), lavaPuddle: burst('flame','orbit',6,'cracks'),
  tempestMendPulse: burst('arcs','orbit',5,'ice'), plagueDiffPower: burst('spores','out',7,'teeth'),
  fatalPactPower: burst('souls','orbit',6,'blood'), trampleContactDps: burst('cracks','in',3,'shields'),
  shatter: burst('ice','out',7,'blades'), splash: burst('rays','out',5,'blades'),
  spreadStatus: burst('spores','out',6,'blood'), transfuseStatus: burst('blood','out',4,'spores'),
  fuseArmed: burst('sparks','in',3,'chimes'), fuseHit: burst('flame','out',4,'runes'),
  ruptureBank: burst('blood','out',6,'teeth'), guardCounter: burst('shields','in',3,'blades'),
  constructBreak: burst('cracks','out',8,'blades'), groveMend: burst('petals','out',7,'rays'),
  kinMend: burst('souls','in',4,'petals'), channelPulse: burst('flame','orbit',4,'rays'),
  ambush: burst('blades','in',3,'souls'), constructPulse: burst('chimes','out',4,'sparks'),
  contagion: burst('spores','in',6,'runes'), overkillCarry: burst('cracks','out',5,'blood'),
  ailmentReap: burst('spores','in',5,'blades'), shatterSplinter: burst('ice','out',8,'teeth'),
  windfuryChance: burst('blades','orbit',2,'steam'), carapaceReflect: burst('shields','out',3,'teeth'),
  burst_physical:burst('cracks','out',5,'teeth'), burst_fire:burst('flame','out',5,'sparks'),
  burst_cold:burst('ice','out',6,'rays'), burst_lightning:burst('arcs','out',7,'sparks'),
  burst_chaos:burst('souls','out',5,'runes'), summonImpact:burst('cracks','out',4,'runes'),
  ventDamage:burst('runes','out',5,'arcs'), burrowEruption:burst('cracks','out',7,'teeth'),
  // Triggered impacts use the proc's own identity even when two procs deal identical damage.
  brutal_strike: burst('blades','in',3,'blood'), cave_in: burst('cracks','in',6,'teeth'),
  thunderstruck: burst('arcs','out',6,'sparks'), corpsefire: burst('flame','out',6,'souls'),
  short_circuit: burst('sparks','in',5,'arcs'), overload_arc: burst('arcs','out',3,'sparks'),
  displacement_field: burst('runes','out',6,'shields'), magnetic_pull: burst('blades','in',6,'arcs'),
  collision_crush: burst('cracks','in',4,'blades'), bulwark_nova: burst('shields','out',7,'rays'),
  capacitor_burst: burst('sparks','out',6,'shields'), shatterplate: burst('blades','out',8,'shields'),
  crest_discharge: burst('arcs','orbit',6,'shields'), radiant_reprisal: burst('rays','out',8,'shields'),
  radiant_cascade: burst('flame','out',3,'rays'), sainted_ash: burst('souls','out',5,'flame'),
  phoenix: burst('flame','out',7,'petals'), bloodletting: burst('blood','out',8,'blades'),
  native_undertow_fist: burst('arcs','in',3,'cracks'), native_parting_blessing: burst('souls','out',3,'petals'),
  native_song_of_return: burst('chimes','in',5,'rays'), exp_wall_cinder_burst: burst('cracks','out',4,'flame'),
  exp_cremation_pyre: burst('flame','orbit',5,'souls'), exp_voltaic_arc: burst('sparks','out',4,'arcs'),
  exp_aftershock_pulse: burst('cracks','out',6,'rays'), exp_iron_retort: burst('teeth','out',6,'shields'),
  exp_falling_cinder: burst('flame','in',5,'cracks'), exp_consecrated_ring: burst('rays','orbit',7,'flame'),
  exp_phantom_volley: burst('blades','out',3,'souls'), exp_frost_bulwark: burst('shields','out',5,'ice'),
  exp_desperate_nova: burst('blood','out',5,'runes'), exp_mercy_echo: burst('rays','in',2,'blades'),
  exp_blight_pop: burst('spores','out',8,'blood'), exp_shock_chain: burst('arcs','in',4,'sparks'),
  exp_gravity_pull: burst('souls','in',7,'arcs'), exp_bough_renewal: burst('petals','out',6,'chimes'),
} satisfies Record<string, SkillBurstProfile>;
export type MechanicBurst = keyof typeof MECHANIC_BURSTS;
export const mechanicBurst = (key: MechanicBurst): string => 'mechanic:' + key;

/** Custom content may supply its own registered painter. */
export function procImpactVoice(proc: { id:string; impactFx?:string }): string {
  return proc.impactFx ?? (Object.hasOwn(MECHANIC_BURSTS,proc.id)
    ? mechanicBurst(proc.id as MechanicBurst) : mechanicBurst('splash'));
}

export const MECHANIC_LINKS = {
  tractorTetherPower: { color: '#ffe675', accent: '#8ceaff', motion: 'siphon', duration: .6 },
  minionPyreTether: { color: '#ff8d40', accent: '#ffe4a0', motion: 'burn', duration: .25 },
  highRollShockChain: { color: '#fff48e', accent: '#94dfff', motion: 'bolt', duration: .25 },
  frostRicochet: { color: '#8edfff', accent: '#e0fffb', motion: 'shard', duration: .23 },
  windburnPower: { color: '#ffb56f', accent: '#a2eaff', motion: 'shard', duration: .26 },
  synapticLinkDmg: { color: '#e39bff', accent: '#c8f6ff', motion: 'bolt', duration: .22 },
  karmaReflect: {color:'#f6d69c',accent:'#ffeac9',motion:'siphon',duration:.32},
  procArc: { color: '#b1d5ff', accent: '#fff9c5', motion: 'bolt', duration: .2 },
} as const;
export type MechanicLinkKind = keyof typeof MECHANIC_LINKS;
export interface MechanicLink { kind: MechanicLinkKind; from: number; to: number }
export function mechanicLink(kind: MechanicLinkKind, from: {id:number; pos:Vec2}, to: {id:number; pos:Vec2}, color?: string) {
  const profile = MECHANIC_LINKS[kind];
  return { pos: {...to.pos}, radius: 1, color: color ?? profile.color, life: profile.duration, maxLife: profile.duration,
    mechanicLink: {kind, from:from.id, to:to.id} };
}

interface FieldArt { subject:IconSubject; color:string; size:number; ground?:BurstMotif }
export const MECHANIC_FIELDS = {
  wickerDecoys: {subject:'scarecrow',color:'#ceac72',size:30},
  volatileEffigies: {subject:'totem',color:'#d792ff',size:25},
  squallClouds: {subject:'cloud',color:'#96dcff',size:33,ground:'sparks'},
  harvestGlobes: {subject:'skull',color:'#b6e67d',size:20},
  dawnGrounds: {subject:'sun',color:'#ffda80',size:26,ground:'rays'},
  bloomFlowers: {subject:'flower',color:'#98ec9a',size:24,ground:'petals'},
  lavaPuddles: {subject:'magma',color:'#ff8446',size:26,ground:'cracks'},
  powerBlobs: {subject:'droplet',color:'#79ddff',size:20},
} satisfies Record<string,FieldArt>;
export type MechanicFieldKind = keyof typeof MECHANIC_FIELDS;
export const MECHANIC_FIELD_KINDS = Object.keys(MECHANIC_FIELDS) as MechanicFieldKind[];
export interface MechanicField {kind:MechanicFieldKind; pos:Vec2; tier:number; radius?:number; remain:number}
