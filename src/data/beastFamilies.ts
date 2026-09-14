/** Explicit membership keeps new beast content visible to the coverage gate.
 * A family adds one art; no species loses its native skills. */
export interface BeastFamily { id: string; name: string; skillId: string; members: string[] }
const family = (id: string, name: string, members: string): BeastFamily => ({ id, name, skillId: `beast_${id}_art`, members: members.split(' ') });
export const BEAST_FAMILIES: BeastFamily[] = [
  family('hound', 'Hounds', 'barrow_hound plains_wolf shepherds_hound den_matron den_whelp dire_wolf moon_howler gravemaw_hound warg red_fox pan_jackal cinder_jackal gloam_courser'),
  family('cat', 'Stalking Cats', 'emerald_prowler lynx manor_mouser dust_pard larder_pard dust_lion crag_lynx'),
  family('horn', 'Horned Beasts', 'bone_steed migration_aurochs migration_tusker taiga_elk feral_aurochs the_bellwether broken_ewe wool_sheep plow_ox sounder_boar siegeback_aurochs roe_deer salt_ibex pale_hart maze_bull great_aurochs veld_oryx sod_boar white_hart'),
  family('brute', 'Great Beasts', 'pit_mauler charnel_glutton yeti yeti_alpha rimeclad_elder tideheart_matron drumclaw_patriarch prismbrock_matriarch scald_basker terrace_warden geysermaw scald_wallower'),
  family('raptor', 'Raptors', 'dune_vulture bloodwing bloodwing_nest gore_hawk carrion_crow magpie_snatch magpie_shrikeblade the_magpie_king carrion_shrike shrike_juggler snow_owl steppe_harrier peak_roc'),
  family('bird', 'Winged Beasts', 'bog_heron feral_hen dooryard_hen greylag_goose ptarmigan woodgrouse crag_chorister dust_quail tomb_dove strand_piper harbor_gull gorge_swift gleam_dove zephyr_darter scald_gull'),
  family('spider', 'Weavers', 'glimmer_lantern_weaver spiderling spider_nest broodmother orb_weaver widow_matron spinney_matron spinney_broodling dripstone_weaver'),
  family('serpent', 'Serpents', 'basilisk marsh_adder horned_viper heath_adder saurian_bulwark cinderback'),
  family('amphibian', 'Amphibians', 'marsh_toad reed_frog blind_salamander vent_salamander mudpot_skipper pool_newt kettleback'),
  family('shell', 'Armored Crawlers', 'shore_crab pavise_crab snapping_terrapin land_crab hermit_scuttler strand_drummer vent_crab vent_matron clock_crab'),
  family('mollusc', 'Molluscs', 'garden_snail banded_slug mortar_whelk dripstone_snail wandering_polyp moon_jelly prism_snail'),
  family('fish', 'Water Beasts', 'silver_shoal soul_minnow kettle_minnow mere_leaper'),
  family('insect', 'Stinging Swarms', 'sand_skitterer gutter_roach wool_aphid skep_bee sand_scorpion ant_trail tomb_scarab ash_hopper cave_cricket scuttle_mite blister_fly bone_scarab mantis_abbess'),
  family('small', 'Small Mammals', 'meadow_hare gutter_rat vermin_tide warren_rat fester_rat rat_king squirrel snow_hare wolverine jerboa river_otter whistle_marmot canopy_screecher ruin_tailthief prism_brock sun_hyrax'),
  family('spirit', 'Luminous Beasts', 'glow_moth will_o_wisp glimmerling glimmer_courtier duskveil_dancer lampwright false_sovereign mere_wisp mere_dancer mere_sovereign veil_drifter cinder_moth soul_moth star_moth steam_wisp spring_moth vaporling'),
  family('flora', 'Spore Beasts', 'spore_puff fumelung sapbleeder nightbloom kettle_bladder'),
  family('grub', 'Clinging Beasts', 'caul_tick glowworm_grub mire_leech bloat_mother cave_gnasher gnasher_whelp great_gnasher pallid_creeper brood_matron scald_spawn vent_lamprey'),
  family('stalker', 'Longlimbs', 'migration_strider thicket_stalker lash_maiden veilstalker marsh_stalker pale_strider'),
];
export const BEAST_FAMILY_BY_ID = new Map(BEAST_FAMILIES.flatMap(f => f.members.map(id => [id, f] as const)));
