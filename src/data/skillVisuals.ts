/** Skill identity is authored, never hashed from an ID or inferred from damage.
 * Colors still come from the live cast (including account cosmetics). These
 * profiles change neither the delivery's geometry nor its timing. */
export type BurstMotif = 'ice' | 'flame' | 'cracks' | 'blades' | 'arcs' | 'runes'
  | 'petals' | 'spores' | 'blood' | 'souls' | 'rays' | 'shields' | 'teeth' | 'chimes'
  | 'sparks' | 'steam';
export interface SkillBurstProfile {
  motif: BurstMotif;
  motion: 'out' | 'in' | 'orbit';
  count: number;
  echo?: BurstMotif;
  rings?: number;
  /** Target-limited skills get a compact source mark; their beams carry hits. */
  focus?: 'source';
}

export const SKILL_BURST_STYLE = {
  boundaryAlpha: 0.32, washAlpha: 0.035, inkAlpha: 0.85,
  minWidth: 1, maxWidth: 2.8, maxMarks: 12, sourceRadius: 22,
  /** All detail is clipped to the real shape and outside its safe center. */
  detailReach: 0.92,
};

const p = (motif: BurstMotif, motion: SkillBurstProfile['motion'], count: number,
  echo?: BurstMotif, rings = 0): SkillBurstProfile => ({ motif, motion, count, echo, rings });

/** First catalogue pass: every native nova, including monster and payload arts.
 * Related skills share materials but vary silhouette, motion and counter-shape.
 * Other deliveries retain their existing art until their own authored pass. */
export const SKILL_BURSTS: Readonly<Record<string, SkillBurstProfile>> = {
  skeletal_nova_fire: p('flame', 'out', 9, 'teeth', 2),
  skeletal_nova_cold: p('ice', 'out', 9, 'teeth', 2),
  skeletal_nova_lightning: p('sparks', 'out', 9, 'teeth', 2),
  skeletal_nova_chaos: p('spores', 'out', 9, 'teeth', 2),
  beast_defiant_roar: p('teeth', 'out', 5, 'arcs', 1),
  beast_rally_pulse: p('rays', 'out', 5, 'teeth', 2),
  beast_brute_art: p('cracks', 'out', 5, 'teeth'),
  beast_mollusc_art: p('spores', 'out', 5, 'steam'),
  beast_spirit_art: p('souls', 'orbit', 5, 'sparks'),
  beast_flora_art: p('petals', 'out', 7, 'runes'),
  goad_device_call: p('teeth', 'orbit', 4, 'chimes', 1),
  court_challenge: p('shields', 'out', 4, 'blades'),
  skeletal_winter_ring: p('ice', 'orbit', 8, 'teeth', 1),
  skeletal_plague_ring: p('spores', 'orbit', 8, 'teeth', 1),
  warding_sweep: p('blades', 'orbit', 3, 'shields'),
  flask_blood_bloom: p('petals', 'out', 6, 'blood'),
  flask_clean_company: p('rays', 'in', 6, 'petals'),
  mocking_refrain: p('chimes', 'orbit', 3, 'teeth', 2),
  ground_slam: p('cracks', 'out', 7),
  ironbell_toll: p('chimes', 'out', 4, undefined, 3),
  hordefathers_reckoning: p('teeth', 'out', 12, 'flame', 3),
  gravefathers_lament: p('souls', 'out', 12, 'chimes', 3),
  harvestfathers_gleaning: p('blades', 'in', 12, 'petals', 3),
  herdfathers_stampede: p('cracks', 'out', 12, 'shields', 3),
  packfathers_frenzy: p('teeth', 'orbit', 12, 'blood', 3),
  pyrefathers_immolation: p('flame', 'in', 12, 'shields', 3),
  swarmfathers_seethe: p('spores', 'orbit', 12, 'blades', 3),
  whirlwind: p('blades', 'orbit', 3),
  salt_burst: p('ice', 'out', 12, 'cracks'),
  sirocco_ring: p('arcs', 'orbit', 5, 'flame'),
  frost_nova: p('ice', 'out', 6),
  pyre_nova: p('flame', 'out', 7),
  antiphon: p('chimes', 'out', 5, 'flame', 2),
  hex_pulse: p('runes', 'in', 3),
  choir_of_light: p('rays', 'in', 8, 'chimes', 2),
  verdict_release: p('blades', 'in', 4, 'rays'),
  shock_nova: p('sparks', 'orbit', 9),
  belligerence: p('blades', 'out', 6, 'shields'),
  furor: p('teeth', 'out', 6, 'rays', 1),
  corpse_explosion: p('blood', 'out', 9, 'flame'),
  dark_pact: p('souls', 'in', 5, 'runes'),
  bloodlet: p('blood', 'out', 6, 'blades'),
  immolation_blast: p('flame', 'in', 8, 'rays'),
  challenging_shout: p('teeth', 'out', 6, undefined, 3),
  taunt_pulse: p('teeth', 'in', 4, undefined, 1),
  aegis_ward: p('shields', 'out', 6, undefined, 1),
  rallying_howl: p('arcs', 'out', 4, 'teeth', 2),
  repulse_wave: p('arcs', 'out', 6, 'sparks'),
  magma_ward: p('shields', 'orbit', 5, 'flame'),
  incite: p('runes', 'out', 5, 'teeth'),
  shatterchord: p('ice', 'out', 3, 'sparks', 2),
  benediction: p('rays', 'out', 6),
  communion: p('petals', 'in', 6, 'rays'),
  gorge_burst: p('teeth', 'in', 7, 'blood'),
  kindled_eruption: p('cracks', 'out', 5, 'flame'),
  spore_burst: p('spores', 'out', 9),
  tear_burst: p('blood', 'in', 5, 'souls'),
  syncope: p('chimes', 'in', 3, 'runes', 1),
  witching_bell: p('chimes', 'orbit', 5, 'souls', 2),
  snap_shut: p('teeth', 'in', 8),
  stridulate: p('arcs', 'orbit', 8, 'chimes', 2),
  sanguine_burst: p('blood', 'out', 8),
  soul_harvest: p('souls', 'in', 7, 'blades'),
  hurricane: p('arcs', 'orbit', 6, 'sparks', 1),
  thunderclap: p('sparks', 'out', 4, undefined, 1),
  overload: p('sparks', 'in', 8, 'cracks'),
  winters_sweep: p('blades', 'orbit', 4, 'ice'),
  absolute_zero: p('ice', 'in', 8, 'runes'),
  resonant_peal: p('chimes', 'out', 6, 'sparks', 3),
  discord_wail: p('chimes', 'orbit', 7, 'runes', 1),
  pollen_puff: p('spores', 'out', 6, 'petals'),
  beguiling_glow: p('petals', 'orbit', 5, 'souls'),
  mimic_flash: p('rays', 'orbit', 4, 'runes'),
  alarm_reek: p('steam', 'out', 5, 'teeth', 2),
  wax_flare: p('flame', 'out', 3, 'blood'),
  waxlight_pulse: p('rays', 'out', 8, 'flame', 1),
  galvanic_reserve: { ...p('sparks', 'in', 5), focus: 'source' },
  acrid_splash: p('blood', 'out', 7, 'spores'),
  cindershell: p('shields', 'out', 4, 'flame'),
  requiem: p('chimes', 'in', 6, 'flame', 3),
  tornado: p('arcs', 'orbit', 3, 'steam'),
  relic_burst: p('runes', 'out', 4, 'cracks'),
  relic_mend: p('runes', 'in', 4, 'rays'),
  soul_glut: p('souls', 'in', 12, 'teeth'),
  lance_burst: p('blades', 'out', 8),
  coda: p('chimes', 'out', 8, 'blades', 3),
  death_knell: p('chimes', 'in', 5, 'teeth', 3),
  cerement: p('souls', 'orbit', 6, 'steam'),
  marrow_communion: p('teeth', 'in', 6, 'rays', 2),
  kindled_ruin: p('flame', 'orbit', 9, 'cracks'),
  nerve_pulse: p('runes', 'out', 7, 'sparks'),
  lancing_flurry: { ...p('blades', 'out', 4), focus: 'source' },
  relic_pulse: p('runes', 'out', 6, 'rays', 1),
  bell_toll: p('chimes', 'out', 3, undefined, 2),
  scald_jet: p('steam', 'out', 4),
  kettleback_burst: p('shields', 'out', 5, 'steam'),
  bladder_vent: p('steam', 'out', 7, 'flame'),
  tempo_vent_burst: p('steam', 'orbit', 4, 'runes'),
  crag_peal: p('cracks', 'out', 6, 'chimes', 2),
  engulf_slam: p('teeth', 'in', 5, 'spores'),
  ash_smother: p('steam', 'in', 6, 'flame'),
  aureole: p('rays', 'orbit', 12, 'sparks', 1),
  static_discharge: p('sparks', 'out', 7, 'spores'),
  gust_burst: p('arcs', 'out', 3, 'steam', 1),
  doom_bell: p('chimes', 'out', 12, 'runes', 3),
  last_rites_toll: p('chimes', 'in', 8, 'blood', 3),
  reapers_toll: p('chimes', 'in', 4, 'blades', 2),
  long_cold: p('ice', 'in', 12, 'steam', 2),
  long_cold_shatter: p('ice', 'out', 12, 'blades', 2),
  litany_of_dawn_mend: p('rays', 'in', 12, 'petals', 3),
  cinderstep_trace: p('flame', 'out', 3),
  rimeglass_trace: p('ice', 'out', 3),
  lattice_discharge: p('runes', 'out', 4, 'sparks'),
};

/** Existing fx transport is enough: no new save or network identity field. */
export function skillBurstVoice(skillId: string): string | undefined {
  return Object.hasOwn(SKILL_BURSTS, skillId) ? `skillBurst:${skillId}` : undefined;
}
