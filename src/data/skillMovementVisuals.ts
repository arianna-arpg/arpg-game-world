import type { BurstMotif } from './skillVisuals';

export type MovementForm = 'stride' | 'ram' | 'blade' | 'ribbon' | 'bolt' | 'plume' | 'wing' | 'talon' | 'crater' | 'fold' | 'slit' | 'shatter' | 'orbit';
export type MovementPhase = 'depart' | 'arrive' | 'impact' | 'wait' | 'bank';
export interface MovementProfile {
  family: 'dash' | 'leap' | 'blink' | 'carom'; form: MovementForm;
  motif: BurstMotif; count: number; motion: 'drive' | 'split' | 'coil' | 'scatter';
  groundWake?: boolean;
}
const p = (family: MovementProfile['family'], form: MovementForm, motif: BurstMotif, count: number,
  motion: MovementProfile['motion'] = 'drive'): MovementProfile => ({ family, form, motif, count, motion });
/** Source identity is independent of tint and movement distance. */
export const SKILL_MOVEMENTS: Readonly<Record<string, MovementProfile>> = {
  dash: p('dash', 'stride', 'arcs', 2),
  charge: { ...p('dash', 'ram', 'cracks', 3), groundWake: true },
  shield_charge: p('dash', 'ram', 'shields', 4, 'split'),
  gore_charge: p('dash', 'talon', 'teeth', 2),
  dash_strike: p('dash', 'blade', 'blades', 3, 'split'),
  iai_strike: p('dash', 'blade', 'runes', 1),
  surge: p('dash', 'bolt', 'sparks', 3, 'scatter'),
  dune_surge: p('dash', 'plume', 'cracks', 4),
  decoy: p('dash', 'ribbon', 'souls', 2, 'split'),
  cape_feint: p('dash', 'ribbon', 'blades', 3, 'coil'),
  cloudstep: p('dash', 'plume', 'steam', 2, 'split'),
  trailblaze: p('dash', 'plume', 'flame', 4, 'scatter'),
  immolation_rush: p('dash', 'ram', 'flame', 5, 'coil'),
  closing_fang: p('dash', 'talon', 'blood', 3, 'split'),
  reaper_lunge: p('dash', 'blade', 'blood', 4, 'coil'),
  skeletal_lunge: p('dash', 'blade', 'teeth', 3),
  court_bone_lunge: p('dash', 'stride', 'teeth', 3, 'split'),
  court_wraith_lunge: p('dash', 'ribbon', 'souls', 4, 'coil'),
  vent_hop: p('dash', 'plume', 'steam', 5, 'scatter'),
  squall_bite: p('dash', 'talon', 'ice', 2, 'split'),
  zephyr_step: p('dash', 'ribbon', 'arcs', 4),
  beast_pursuit: p('leap', 'stride', 'teeth', 3),
  beast_cat_art: p('leap', 'talon', 'blades', 3, 'split'),
  beast_raptor_art: p('leap', 'wing', 'rays', 3, 'scatter'),
  panther_pounce: p('leap', 'talon', 'blood', 4),
  crushing_leap: p('leap', 'crater', 'cracks', 5),
  take_wing: p('leap', 'wing', 'blades', 5, 'coil'),
  locust_dive: p('leap', 'talon', 'teeth', 3, 'coil'),
  saltant_slam: p('leap', 'crater', 'shields', 4, 'split'),
  condor_stoop: p('leap', 'wing', 'blood', 4, 'split'),
  phoenix_dive: p('leap', 'wing', 'flame', 6, 'scatter'),
  vent_ride: p('leap', 'plume', 'steam', 3),
  spout_hop: p('leap', 'plume', 'steam', 2, 'coil'),
  geyser_step: p('leap', 'plume', 'steam', 5, 'split'),
  skyfall: p('leap', 'crater', 'sparks', 6, 'scatter'),
  teleport: p('blink', 'fold', 'runes', 4),
  warp: p('blink', 'fold', 'chimes', 3, 'coil'),
  shadow_step: p('blink', 'slit', 'blades', 2),
  mirage_step: p('blink', 'fold', 'arcs', 2, 'split'),
  corpse_shift: p('blink', 'slit', 'souls', 3, 'coil'),
  shatterstep: p('blink', 'shatter', 'ice', 6, 'scatter'),
  riftstep: p('blink', 'slit', 'cracks', 4, 'split'),
  flickerstep: p('blink', 'fold', 'blades', 3, 'scatter'),
  riftstorm: p('blink', 'orbit', 'blades', 5, 'coil'),
  caged_comet: p('carom', 'orbit', 'sparks', 3, 'coil'),
};
export const CHARGE_WAKE_STYLE = { railOffset: .58, dustOffset: .84, alpha: .55, width: 1.7, dustWidth: 1.1 };
export const MOVEMENT_VISUAL_STYLE = { maxTraces: 40, maxPoints: 16, tailSeconds: .22, fadeSeconds: .2, maxMarks: 6, outline: '#17232b' };
export function movementProfile(id: string) { return Object.hasOwn(SKILL_MOVEMENTS, id) ? SKILL_MOVEMENTS[id] : undefined; }
export function skillMovementVoice(id: string, phase: MovementPhase): string | undefined {
  return movementProfile(id) ? `skillMove:${phase}:${id}` : undefined;
}
