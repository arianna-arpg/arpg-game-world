import type { IconSubject } from '../render/skillIconArt';

export interface PassiveBranchTheme { name:string; color:string; icon:IconSubject; silhouette:string; author:string }
const theme = (name:string,color:string,icon:IconSubject):PassiveBranchTheme => ({name,color,icon,silhouette:'circle',author:'Hollow Wake'});
/** Authored presentation, shared by every player. Standard branches retain
 * round seals; extensions can supply another shape without a renderer case. */
export const PASSIVE_BRANCH_THEMES: Readonly<Record<string,PassiveBranchTheme>> = {
  impact:theme('Force & impact','#cc8b63','hammer'), tempo:theme('Rhythm & precision','#d49a8e','rapier'),
  arcana:theme('Arcane arts','#9eacdc','rune'), host:theme('Summons & souls','#b4a0d2','skull'),
  guile:theme('Guile & pursuit','#b8bd83','dagger'), devices:theme('Devices & craft','#bbaa78','gear'),
  bastion:theme('Guard & endurance','#a5bcc5','shield'), entropy:theme('Affliction & decay','#a5b27c','venom'),
  chorus:theme('Command & harmony','#c9a0c2','note'), life:theme('Life & recovery','#ce8793','heart'),
  fire:theme('Fire & embers','#dca07a','flame'), cold:theme('Cold & rime','#9ebedc','snowflake'),
  lightning:theme('Storm & conduction','#8cc6d3','lightning'), nature:theme('Growth & beasts','#9dbb8b','leaf'),
  time:theme('Time & duration','#8fbeb8','clock'), fortune:theme('Fortune & risk','#d3be8b','cards'),
  attributes:theme('Attribute training','#b9b4a4','prism'), ranged:theme('Aim & projectiles','#9fbba2','bow'),
};

/** Stable content namespaces choose branch color; localized names never do.
 * The most specific registered prefix wins. All remaining nodes use their
 * actual grant's theme, so adding an ordinary node needs no ID switch. */
export const PASSIVE_BRANCH_PREFIXES: Readonly<Record<string,string>> = {
  spec_fire_:'fire',spec_cold_:'cold',spec_lightning_:'lightning',spec_melee_:'impact',spec_spell_:'arcana',spec_ranged_:'ranged',
  spec_instant_:'time',spec_timed_:'time',spec_channel_:'arcana',spec_swarm_:'nature',spec_skeleton_:'host',spec_archer_:'host',spec_mage_:'host',
  spec_golem_:'devices',spec_stone_:'bastion',spec_bone_:'host',spec_flame_:'fire',spec_ice_:'cold',spec_blood_:'life',
  spec_close_:'impact',spec_middle_:'ranged',spec_far_:'ranged',spec_bulwark_:'bastion',spec_veil_:'arcana',spec_rhythm_:'tempo',
  weave_wayfarer_:'guile',weave_rooted_:'bastion',weave_skirmisher_:'tempo',weave_grappler_:'impact',weave_marksman_:'ranged',
  weave_munitions_:'devices',weave_alchemist_:'life',weave_affliction_:'entropy',weave_martyr_:'life',weave_shieldweaver_:'arcana',
  weave_guard_:'bastion',weave_chorus_:'chorus',weave_undertaker_:'host',weave_commander_:'chorus',weave_mechanist_:'devices',
  weave_spellweaver_:'arcana',weave_fortune_:'fortune',weave_explorer_:'guile',
  cl_gam_:'fortune',cl_phys_:'impact',cl_armor_:'bastion',cl_block_:'bastion',cl_spell_:'arcana',cl_fireres_:'fire',
  cl_minion_:'host',cl_sum_:'host',cl_coldres_:'cold',cl_lightres_:'lightning',cl_acc_:'ranged',cl_melee_:'impact',
  cl_lreg_:'life',cl_es_:'arcana',cl_mreg_:'arcana',cl_allres_:'bastion',cl_chaosres_:'entropy',cl_eva_:'guile',cl_proj_:'ranged',cl_attr_:'attributes',
  cl_wake_:'fire',cl_fount_:'life',cl_crag_:'impact',cl_cad_:'tempo',cl_court_:'tempo',cl_mer_:'ranged',cl_gal_:'guile',
  cl_pri_:'arcana',cl_sky_:'host',cl_cho_:'chorus',cl_bed_:'bastion',cl_thresh_:'impact',cl_watch_:'ranged',cl_twi_:'entropy',
  cl_eng_:'fortune',cl_scr_:'fire',cl_chrono_:'time',cl_vit_:'life',cl_chand_:'fire',cl_gyre_:'tempo',cl_std_:'chorus',
  cl_iron_:'bastion',cl_tithe_:'host',cl_rim_:'attributes',cl_app_:'attributes',cl_verse_:'chorus',cl_rip_:'tempo',cl_soul_:'host',cl_stat_:'lightning',cl_opp_:'guile',
  war_:'impact',brz_:'tempo',sor_:'arcana',sum_:'host',swb_:'guile',rng_:'ranged',dev_hunt_:'nature',dev_bul_:'bastion',pan_:'chorus',
  ...Object.fromEntries(Object.entries({str:'impact',prw:'tempo',int:'arcana',wis:'host',fin:'guile',dex:'devices',for:'bastion',wil:'entropy',cha:'chorus'})
    .flatMap(([attribute,id])=>['route_','prep_route_','cross_','prep_cross_'].map(prefix=>[prefix+attribute+'_',id]))),
};
