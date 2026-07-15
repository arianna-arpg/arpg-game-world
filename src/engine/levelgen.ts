// ---------------------------------------------------------------------------
// Level generation — set-piece stamps composed into a layout.
//
// The terrain vocabulary is DOODADS: circles with a kind that decides how
// the engine treats them.
//
//   rock    blocks movement and projectiles (a boulder / tree)
//   cliff   same blocking, but stamped in woven runs that read as walls
//   mud     blocks nothing; actors wading through it move slowly
//   chasm   blocks movement but NOT projectiles — you can shoot across
//   bridge  negates chasm beneath it: the walkable span over the gap
//
// Stamps are the set pieces: a rock cluster, a winding cliff run, a mud
// patch, a chasm lake, a RAVINE that cuts across the map with bridges
// spanning it, and a ruin ring whose center is returned as a point of
// interest (spawner objects and gem caches nest there).
//
// Everything draws from one Rng, so a layout is one seed.
// ---------------------------------------------------------------------------

import { dist, vec, type Vec2 } from '../core/math';
import { shapeBoundR, type HitShape } from './shapes';
import { rockSurfaceOf, type RockFormSpec } from './rockForms';
import type { Rng } from '../core/rng';
import type { ExitRoadSpec, PackTableEntry, StampIgnoreRule, StampRuleOverride, StampSpec, WhereSpec, ZoneDef } from '../data/zones';
import { STRUCTURES, legendCell, type CellSpec, type StructureDef } from '../data/structures';
import { MONSTERS } from '../data/monsters';
import { presenceTable } from './presence';
import { runStructureGen } from './structureGen';
// Type-only: veil.ts value-imports this module (rules/Doodad); the type flows
// back erased, so there is no runtime cycle.
import type { VeilSpec } from './veil';
import type { DamageType, Modifier } from './stats';
import type { WalkField } from '../world/walk';
import { GridWalkField } from '../world/gridWalk';
import { regionKind } from '../world/regions';
import { isFieldPixel } from '../world/fieldRegion';
// Safe despite genkit importing our types: those are `import type` edges,
// erased at runtime — no actual module cycle exists.
import { Mask, GEN_CELL, disc, radial, bearingNoise, paintLiquid, valueNoise2, wanderPath } from './genkit';

export type KnownDoodadKind =
  | 'rock' | 'cliff' | 'chasm' | 'bridge' | 'wall'
  // Ground overlays: walkable, but standing in them applies a terrain
  // status (see World.updateTerrainEffects). Mud mires, swamps trudge,
  // bogs poison on entry, water slows by depth, ice steals your traction.
  | 'mud' | 'swamp' | 'bog' | 'water' | 'ice'
  // Flora & furnishing
  | 'tree'      // blocks movement and shots — a rock wearing a canopy
  | 'brush'     // walkable cover: standing in it CONCEALS you
  | 'grass'     // pure decoration — tufts and splotches
  | 'hedgerow'  // pure decoration: the Field's soft boundary fringe (straddles the tallgrass rim)
  | 'campfire'  // pure decoration — a flickering warm light
  | 'road'      // ground overlay: a walkable gravel path — a mild move-speed boost (no status)
  // Biome-expansion terrain (batch 6)
  | 'sand'      // ground overlay: wind-blown grit that slows like mud
  | 'heat_shimmer' // ground overlay: wavering desert air — stacks sunscorch (World.updateHeat)
  // (fog_bank RETIRED: volumetric fog is the LIVING fog fabric now — roaming
  //  banks on ZoneTheme.fog, engine/fog.ts — not a stamped doodad.)
  // The doodad kingdom (round 4): biome furniture with playstyle edges.
  | 'dead_tree' // bare snag — solid, no canopy (swamps, wastes, battlefields)
  | 'stump'     // cut bole — blocks feet, NOT shots (logging sites, fell groves)
  | 'log'       // fallen trunk — low cover, blocks feet only
  | 'flowers'   // meadow color drifts — pure decoration
  | 'reeds'     // water-edge blades — CONCEALS like brush (ambush margins)
  | 'cactus'    // desert solid — swollen lobes and spines
  | 'dune_crest' // the marching ridge's comb — pure terrain art laid along dunefield rails
  | 'salt_pillar' // the glasspan's forest: a squat wind-eroded salt column
  | 'glass_shard' // lightning-fused pane heaved from the pan — brittle, sings apart
  | 'bone_arch'  // a colossus rib breaking the sand — the bonepan's architecture
  | 'sun_awning' // a traveler's cloth fly on poles — walk-under SHADE (the heat's mercy)
  | 'vault_gate' // stairs under a half-swallowed lintel — DOWN into the buried vault (sidezone)
  // THE MIRAGE KIT — the desert's lie: distant promises that scatter into
  // hot air when approached (brittle 'near' pops them; one sometimes objects)
  | 'mirage_oasis'   // water and palms that were never there
  | 'mirage_bastion' // a walled refuge on the horizon — walls of heat
  | 'mirage_caravan' // a laden train at rest… until you hail it
  | 'web'       // sticky sheet — slows like mire (spider country)
  | 'geyser'    // scalding vent mouth — steams and glows (marsh/tundra)
  | 'snowdrift' // wind-piled powder — decoration (tundra)
  | 'bone_pile' // scattered remains — decoration (crypts, lairs)
  | 'brazier'   // a standing fire bowl — LIGHT in the dark (crypts, camps)
  | 'standing_stone' // a raised monolith — moor/ritual furniture
  | 'vines'     // blocks movement but NOT shots — a jungle wall you fire through
  | 'thicket'   // blocks movement AND shots — dense impassable bramble
  | 'tombstone' // blocks movement AND shots — a crypt marker
  | 'palm'      // blocks both — a tree variant (beach/jungle canopy)
  | 'conifer'   // evergreen spire (pine crown; tundra/deepwood)
  | 'ancient_tree' // a forest ELDER: huge crown, thick bole, packs hide beneath
  | 'forest_oak' // the FOREST's canopy body: a broad veiled crown built to knit into sealed masses
  | 'gloam_oak' // the GLOAMWOOD's canopy body: the same knitting crown gone grey-dark and crooked
  | 'pumpkin_patch' // walkable gourd tangle (the croft rows; harvest that outlived its farmers)
  | 'jack_o_lantern' // a lone CARVED gourd, candle-lit — grins in the dark, pops when struck
  | 'hanging_cage' // a gibbet: post + chained cage, bone bundle inside (the hanged road)
  | 'ice_spike' // a rimed crystal fang jutting from frozen ground (taiga/tundra)
  | 'snowman'   // someone built it and left; it watches (winter clutter)
  | 'signpost'  // a fingerboard post naming ways travelers stopped taking
  | 'firewood_pile' // stacked split logs — a camp that meant to come back
  | 'fountain'  // a town square's ringed basin (light sparkle; solid)
  | 'well'      // stone ring over a dark shaft (village water)
  | 'lantern_post' // a lamp on a post — warm standing light (roads, towns)
  | 'bench'     // two planks that have heard everything (town comfort)
  | 'market_stall' // striped awning over a trader's table
  | 'broken_cart'  // a wayfarer's cart that didn't make it (roadside ruin)
  | 'scarecrow' // straw sentry of the fields
  | 'hay_bale'  // rolled fodder (farms, camps)
  | 'pot_cluster' // clay amphorae huddled together (crypts, markets)
  | 'rubble'    // walkable ruin-scatter (broken masonry underfoot)
  | 'banner_post' // a faction's cloth on a pole (camps, war roads)
  | 'beehive'   // a humming skep (grove flavor; future bee grudges)
  | 'bed'       // frame, mattress, someone's blanket — where a run wakes
  | 'hearth'    // a home's stone fire (standing warm light; always lit)
  | 'stool'     // a three-legged seat by the fire
  | 'shelf'     // wall boards holding jars and small keepings
  | 'rug'       // a woven floor decal — walkable comfort underfoot
  | 'lava'      // blocks movement but NOT shots — molten, like a chasm
  | 'cave_entrance' // blocks nothing — a transition trigger into a cave sub-zone
  | 'ritual_pentagram' // blocks nothing — a Conclave ritual circle (walkable; cultists ring it)
  | 'tentacle_field' // ground overlay: an Eldritch tentacle patch that ensnares on entry
  | 'crystal'   // blocks both — a faceted shard that periodically fires a laser beam
  | 'lava_vent' // blocks movement not shots — a volcanic vent that launches lava orbs
  // Flesh biome ("Belly of the Beast") themed doodads
  | 'flesh_pod' // blocks both — a bulbous organic sac/polyp growing from the meat
  | 'bone'      // blocks both — a pale ribcage/spine strut jutting from the flesh
  | 'gore'      // ground overlay: a viscera pool (decoration; no terrain effect)
  // Volcanic biome themed doodads
  | 'obsidian'  // blocks both — a glassy black volcanic shard
  | 'cinder'    // ground overlay: an ash/ember patch (decoration)
  | 'ember_vent' // blocks movement not shots — a SMALL vent: a single lava orb, not a volley
  // Descent ("the abyss") themed doodads
  | 'light_spot'   // trigger: a glowing crystalline cluster — run over for a burst of Light
  | 'void_chasm'   // blocks movement not shots, stamped fall:true — a gaping abyss pit (void recovery)
  | 'ruin_obelisk' // blocks both — an ancient cursed monolith that lashes nearby intruders (trap)
  | 'descent_platform' // trigger: the mineshaft platform — dwell to descend / climb out
  // Marine / deep-sea themed doodads
  | 'kelp'         // walkable cover: a swaying kelp frond field (decorative)
  | 'giant_kelp'   // a kelp TREE: thin stipe underfoot, swaying frond crown above (walk-under, sight-breaking)
  | 'coral'        // blocks both — a vibrant branching coral head
  | 'sea_rock'     // blocks both — a barnacled rocky outcropping
  // Mycelia ("The Bloom") fungal biome doodads
  | 'giant_mushroom' // blocks both — a towering capped stalk (a tree of fungus)
  | 'spore_pod'      // blocks movement not shots — a bulbous sac that PUFFS a spore cloud
  | 'glow_cap'       // ground overlay: a small bioluminescent cap (decoration + light)
  | 'mycelial_mat'   // ground overlay: a glowing hyphal carpet (the spore-density tell underfoot)
  | 'fruiting_tower' // blocks both — a towering fungal spire raised at HIGH spore density
  // Plan-structure furniture (placeStructurePlan emits these; never scattered)
  | 'door'    // blocks everything while closed; open/broken = walk/shoot/see through
  | 'window'  // an arrow-slit frame: blocks movement, passes shots + sight
  | 'dock'    // a port's harbor planks — dwell to cast off (the Voyage)
  | 'breach'  // the torn way into the Underworld (bottom of the cave ladder)
  | 'landmass'    // the Voyage's streamed COASTLINE (a shore-collision blob)
  | 'isle_beacon' // a Voyage Island's guiding light + name (pure signage)
  // The rock grammar's kin (stone-variety round)
  | 'cairn'       // stacked waymark stones — solid, blocks feet not shots
  | 'scree'       // walkable gravel spill (pure decoration)
  | 'rock_spire'  // a standing pinnacle — solid, blocks shots, casts long
  // Flora clarity (bush-vs-canopy round)
  | 'berry_bush'  // a fruiting shrub — CONCEALS like brush, wears berries
  | 'fern'        // feathery understory fronds (pure decoration)
  // The thorn kin (the thicket grown into a TREE)
  | 'briarwood'    // a gnarled thorn bole under a walk-under bramble crown
  // The fungal kit (Mycelia identity round)
  | 'shelf_fungus' // blocks feet not shots — bracket shelves off a woody heart
  | 'toadstool'    // ground decoration: speckled little caps (fairy-ring folk)
  // The flesh kit (Belly-of-the-Beast identity round)
  | 'flesh_membrane' // ground overlay: stretched skin breathing to the shared heartbeat
  | 'vein_cluster'   // ground overlay: branching vessels, the pulse rides them
  | 'eye_stalk'      // blocks feet not shots — a fleshy nub whose iris TRACKS the hero
  | 'rib_arch'       // blocks feet not shots — the last tenant's cage
  | 'tooth_row'      // blocks feet not shots — enamel cones on an arc of gum
  // The flesh country kit (the Sanguine / Gutworks / Ocular faces)
  | 'blood_pool'     // ground liquid: pooled open blood — stand in it and the head goes light
  | 'clot_mound'     // blocks feet not shots — a dark coagulate bank, still warm
  | 'artery_stalk'   // blocks feet not shots — a severed standing vessel spurting on the heartbeat
  | 'sphincter'      // a PUCKERING DOOR: carries DoodadDoor state; dwell near and it dilates open
  | 'chyme_pool'     // ground liquid: digestive bile — it wants you broken down
  | 'gas_polyp'      // a swollen bladder (brittle): pops into a sour lingering fume
  | 'villus_bed'     // ground overlay: a carpet of swaying absorptive fronds
  | 'gut_knuckle'    // blocks both — a clenched haustral fold of the tract wall
  | 'ocular_knot'    // blocks feet not shots — a wall-knot of watching eyes; burst it blind (brittle)
  | 'lash_bed'       // ground overlay: a fringe of ground-lashes that shy apart around a walker
  | 'weep_spring'    // ground liquid: a welling tear-pool, clear and salt
  | 'colossal_heart' // blocks both — the country's own heart, a chamber-scale living centerpiece
  // The brittle kit (lifeless breakables — DoodadRule.brittle)
  | 'clay_pots'      // a huddle of pots: pops on a hit or a body brushing through
  | 'crumbling_wall' // a fissured plug that collapses (and carves open) when neared
  | 'secret_wall'    // looks like stone; struck or leaned on, a passage grinds open
  // The brittle kit, wave 2 (hazard breakables — pop effects on BrittleSpec)
  | 'rotten_bridge'  // a decayed span: footing that remembers every crossing, then drops you
  | 'gas_pod'        // a bloated marsh bladder: ruptures into a lingering fume
  | 'burst_sac'      // a fungal pressure sac: bursts into spore fume when neared
  | 'puffcap_cluster' // pale puffballs underfoot: a soft fume when trodden
  | 'burial_urn'     // grave clay: spills orbs — and sometimes wakes its tenants
  | 'crystal_cluster' // a knee-high lattice: shatters to a strike, pays in gems
  | 'icicle_cluster'  // brittle ice fangs: shatter when brushed or struck
  // The bog set (mire/marsh dressing + hazard)
  | 'sunken_log'      // a waterlogged trunk half-swallowed by the mire
  | 'marsh_wisp'      // a hovering bog-light: glow and omen, no body to bar the way
  | 'peat_mound'      // a low cut-peat hummock: dark cover that smells of tar
  | 'venom_bloom'     // a swollen mire-flower: pops into a CONTRACTING venom fume
  // The melt (lava is a crossable LIQUID; this is the wall)
  | 'magma_core'      // impassable molten mass — the caldera's spiral walls
  // The wayfarer kit (roadside & village-story furniture)
  | 'weathered_statue' // a mossed monument nobody remembers — solid, blocks shots
  | 'wayshrine'        // a roadside votive shrine — the candle the road still tends
  | 'gallows'          // a crossbeam the crows remember (brigand roads, moors)
  | 'fishing_rack'     // split fish drying on rails (coasts, bog margins)
  | 'charcoal_mound'   // a charcoal-burner's smoldering earth kiln (working woods)
  // The scavenger-web dressing (graveland + mire texture)
  | 'gel_pool'         // quivering ooze shallows — the quag gels' own ground
  | 'sunken_stone'     // a drowned stele barely proud of the water
  | 'black_obelisk'    // a basalt needle over old graves, cold light in its heart
  | 'tallow_stump'     // a stump drowned in decades of candle wax, still lit
  | 'barrow_mound'     // a turfed burial dome — the dead beneath the grass
  | 'hollow_log'       // a rotted trunk big enough to bar the way
  | 'bone_cairn'       // stacked bones as a marker — someone counted these dead
  | 'fulgurite'        // lightning-fused sand, flash-frozen mid-branch
  | 'charged_crystal'  // a crystal still holding somebody's storm
  | 'static_bloom'     // flowers that spark when the wind combs them
  | 'storm_glass'      // a sheet of vitrified ground — the strike's floor
  // The hell-steppes kit (the Underworld's scorched marches — the outer steppes)
  | 'hell_fin'         // a curved basalt horn-blade heaved out of the scorch — the steppes' skyline
  | 'impaler_stake'    // a leaning stake and what the legions left on it — the warning roads
  | 'hell_chain'       // a titan chain bolted into the crust, running toward something below
  | 'ember_fissure'    // a glowing rent in the ground — the fire underneath showing through
  | 'abyssal_rent'     // blocks movement not shots, stamped fall:true — a bottomless tear (fall recovery)
  | 'gate_stair'       // a switchback stair flight — the descent off a gate terrace (recipe-placed)
  // The ossuary kit (the Necropolis' interior sanctum — bone as the ground truth)
  | 'bone_mound'       // a heaped dune of the counted dead — the bonefields' skyline
  | 'ossuary_niche'    // a stacked bone-shelf wall piece — reliquary rows are made of these
  | 'charnel_pit'      // a sunken pit the ossuary tips its overflow into — pale-rimmed, dark-hearted
  // The leyline kit (the fracture capstone's elemental confluences)
  | 'ley_conduit'      // a flowing energy channel underfoot — chain formations draw the leylines
  | 'ley_font'         // a crystal upwelling where the current breaks surface
  | 'pyre_node'        // a resonance node bleeding FIRE — volleys molten orbs (rule-effect)
  | 'gale_node'        // a resonance node bleeding STORM — lances a lightning beam (rule-effect)
  | 'rime_node'        // a resonance node bleeding FROST — a freezing wash band (rule-effect)
  | 'stone_node'       // a resonance node bleeding EARTH — a grinding dust band (rule-effect)
  // The abyss kit (the fracture capstone's lightless deep)
  | 'abyss_crack'      // a glowing fissure underfoot — the abyss showing through
  | 'abyss_spine'      // a jagged riven spike — the deep's teeth, reefs of them
  // The grand arena (the colosseum recipe's seats)
  | 'crowd_row'        // a bench-row of spectators facing the pit — bobbing, cheering, fickle
  // The river-of-flame kit (hell's artery — the flame course's bank vocabulary)
  | 'hellforge_anvil'  // the demons' great forge-altar: a slag plinth, an ember throat (the terminus monument)
  | 'soul_cage'        // a gibbet cage on a leaning post — the river's toll, still glowing faintly
  | 'demon_banner'     // a legion war-banner: scorched pole, ragged pennant, a lit glyph
  | 'pyre_heap'        // a mounded bone-pyre burning pale — the banks keep their own lights
  // The boundary-gate + durance kit (enclave façades; the hate-citadel's halls)
  | 'gate_arch'        // a monumental arch spanning a boundary-gate mouth (walk-under span)
  | 'gate_pylon'       // a coursed monolith bookending a gate façade
  | 'toll_arch'        // a lashed-log arch over a toll-gate's barred mouth (warm-lit walk-under)
  | 'toll_post'        // a squared timber corner post bookending a palisade façade
  | 'hate_brazier'     // an iron bowl burning cold green — the citadel lights its own
  | 'torture_rack'     // the frame, the rollers, the stain — a hall that confesses what it is
  | 'hate_idol'        // a hooded effigy the halls are kept for — its gaze is the decor
  // The war-wound kit (the surface rift — where the demon war tore through)
  | 'hate_rent'        // a rent in the ground burning cold green — hate showing through the crust
  | 'hate_glass'       // ground vitrified by the tearing — black glass with a hate-lit edge
  | 'hell_breach'      // the torn way into the Underworld STANDING OPEN on the surface (dimension gate)
  // The Aetherial kit (the cloud shelves above the world — the Ascent)
  | 'cloud_billow'     // a heaped sunlit cloud-mound: the shelf's boulder
  | 'aether_crystal'   // a splay of luminous shards leaning out of the cloud (lit)
  | 'seraph_statue'    // pale marble: a bowed winged figure on a plinth, gold-leafed
  | 'harp_pillar'      // a slender fluted column strung with shimmering light
  | 'prayer_bell'      // a small bronze bell in a marble yoke, swaying a whisper
  | 'ascendant_gate'   // THE realm gate: leaning posts, a broken arch, breathing light
  | 'sky_geyser'       // the surface-side mouth of the Ascent: a breathing spray vent
  // The High Heavens kit (the aether_spires biome — courts and spans)
  | 'spire_of_dawn'    // the monumental tiered spire, lanced with standing light
  | 'aureate_brazier'  // a gold bowl burning white — the courts light their own
  // The Driftways kit (the aether_drift biome — wind country over the flux)
  | 'zephyr_totem'     // a carved wind-spirit pole trailing pale streamers (lit)
  | 'sky_lantern'      // a tethered paper lantern bobbing on the wind (warm light)
  | 'mist_font'        // a carved basin breathing a slow plume of cool vapor (soft light)
  | 'skyglass_spur'    // a lone brittle crystal tine — one blow and it sings apart
  | 'updraft_vent'     // a breathing rift in the cloud: stand in the plume, walk quicker
  | 'cloudwool_tuft'   // pale fleece-grass the grazers crop — the shelf's soft floor
  | 'chime_stand'      // an aeolian chime frame — the wind plays the zone's score
  | 'gale_vane'        // a weathervane arrow leaning hard into the prevailing run
  | 'cloud_coral'      // wind-sculpted vapor-stone: layered shelf-fins, rim-lit
  | 'spire_of_gales'   // the monument: a tiered vane-crowned spire, streamered
  // THE WEATHERWORKS KIT — grounded weather ANY land biome may wear (the
  // Aetherial dressing's earthbound cousins; the Cloudherd's world-echo)
  | 'mist_pool'        // a shallow hollow where cold vapor pools and slides (soft floor)
  | 'stormglass_shard' // a storm-charged crystal tine — brittle; pops feed the 'surface' craft
  | 'haven_stone'      // a squat standing stone breathing a slow ring of sheltering vapor
  // The undergrowth kit (the JUNGLE's cut-your-own-path fabric)
  | 'jungle_brush'     // a dense plug of growth choking a trail — one good cut opens it
  | 'verdure_face'     // brush knotted over the living wall — cut it and carve INTO the mass
  | 'liana_veil'       // a hanging curtain of lianas: bodies part it, eyes do not
  | 'canopy_colossus'  // an emergent giant whose crown roofs half a glade (walk-under)
  | 'strangler_root'   // a buttress-root fin heaved out of the loam — low, solid, old
  | 'jungle_bloom'     // a luminous understory flower — the gloom lights its own
  // The sunken-ruin kit (what the jungle swallowed — the rest of the court
  // reuses the fallen-colossus vocabulary: colossus_head/broken_column/
  // ruin_plinth, data/formations.ts)
  | 'ruin_gate'        // a root-split descent into the old halls (sidezone mouth)
  // The undergrowth kit, wave 2 (the wall learns to LOOK alive)
  | 'verdure_fringe'   // broad fronds overhanging a lane from the wall face — pure dressing
  | 'vine_coil'        // one cuttable segment of a greater vine mass (formation-laid)
  // The parity-pass wayside kit (the class expansion's world furniture)
  | 'chronolith'       // a time-eaten monolith, teal-veined and faintly WRONG (ley country)
  | 'meditation_cairn' // a balanced stone stack wearing a stillness of its own (high places)
  | 'rusted_snare'     // an old jaw-trap, still wound — steps on it end badly
  // The Caul kit (the Giger biome: black chitin over pale meat; the flesh
  // kit's biomechanical sibling — same heartbeat, colder light)
  | 'chitin_fin'       // angular black blade-plates heaved out of the ground in rows
  | 'black_umbilic'    // a great braided cable rising out of frame — it goes somewhere
  | 'caul_sac'         // a translucent egg-sac, dimly lit from inside; bursts when pressed
  | 'caul_eyes'        // a stand of eye stalks; the irises track whoever crosses the room
  | 'maw_pit'          // an orifice in the floor: reels wanderers lipward, bites at the lip
  | 'nerve_root'       // black-violet vessel filaments webbing the floor, pulse riding them
  // The apothecary kit (the drinking economy's terrain: brew-yards and
  // the springs that feed the founts)
  | 'alembic'          // a glass still on a burner — brittle; shatters into spilled orbs
  | 'herb_rack'        // drying bundles on a rail — the herbalist's larder
  | 'cauldron'         // a standing brew-pot over coals, lit from beneath
  | 'spring_pool';     // a clear upwelling pool — WELLS UP resource orbs on a beat (orb_spring)

/** Open doodad vocabulary: the known kinds keep autocomplete + the exhaustive
 *  DOODAD_RULES row check, while a package/structure/legend kind registered via
 *  registerDoodadRule rides the same field (the renderer falls back to a generic
 *  disc for kinds it has no bespoke branch for). Same widening idiom as StampKind. */
export type DoodadKind = KnownDoodadKind | (string & {});

/** A periodic AREA INTERACTION a doodad can carry — the doodad-effect framework.
 *  Generic + extensible: a new effect is one registry handler (see world.ts
 *  doodadEffects) keyed on `id`; the handler interprets `power` for its kind
 *  (damage for an Eldritch tentacle SWING, heal for a Thicket pulse, …). `faction`
 *  is whose side the effect serves, so it only ever touches OPPONENTS, never allies.
 *  Assigned at zone-gen for permanent effects, or dynamically at runtime (the
 *  Eldritch doodad_mutation event grafts the swing onto existing doodads). */
export interface DoodadEffect {
  /** Registry id selecting the behavior (world.ts doodadEffects). */
  id: string;
  /** The SKILL a projectile/AoE-flavored effect fires (lava orbs default
   *  'magma_glob'; hazard clouds 'toxic_cloud') — data, so a vent can hurl
   *  anything registered without an engine edit. */
  skillId?: string;
  /** status_wash effects: the STATUS_DEFS row breathed onto the band (an
   *  updraft vent's windswept, a chill font's chill) — any registered
   *  status, so a new pad/font/choke is pure data. */
  statusId?: string;
  /** orb_spring effects: the ORB_DEFS kind welled up (a life spring, a
   *  mana seep, a wakeflame shrinespring — any registry orb). Omit for
   *  the alternating life/mana breath. */
  orbKind?: string;
  /** The side this effect serves. */
  faction?: string;
  /** Who the effect reaches for, resolved by the shared target scan: 'opponent'
   *  (the default — the player or a non-`faction` enemy, e.g. a tentacle SWING),
   *  'ally' (a `faction` member, e.g. a Thicket pulsing HEAL to its Sylvan kin),
   *  or 'owner' — the effect SERVES the actor `ownerId` names and reaches that
   *  owner's enemies (a terraform growth fighting for its planter). */
  target?: 'opponent' | 'ally' | 'owner';
  /** target:'owner' only — the actor id the effect fights for. */
  ownerId?: number;
  /** DAMAGE ELEMENT for direct-damage effects (beam/wash): the resist rolled
   *  against. Defaults preserve each handler's classic element (beam
   *  lightning, wash fire) — a rime node says 'cold' with one field. */
  element?: DamageType;
  /** Presentation tint for the effect's flash/text (defaults per handler). */
  color?: string;
  /** Seconds between attempts. */
  interval: number;
  /** Live countdown, managed by the engine tick (omit at authoring). */
  cd?: number;
  /** Reach of the interaction (node/world units). For a beam, the beam LENGTH. */
  radius: number;
  /** Beam effects only: half-thickness of the damage band along the ray. */
  width?: number;
  /** Per-attempt chance it actually fires (the "not every time" knob). */
  chance: number;
  /** Magnitude — interpreted per effect (swing damage, heal amount, …). */
  power: number;
  // --- VOLLEY fields (the lava-orb eruption): a doodad ERUPTS a ring of impacts
  // AROUND its own epicenter, like a volcano firing off its vent. All optional so
  // existing effects (tentacle_swing, crystal_beam) and authoring are untouched.
  /** Impacts launched per eruption (default 1 — a single orb). */
  count?: number;
  /** Distance from the source the ring of impacts lands at (defaults to `radius`).
   *  This is what makes it erupt AROUND the vent, not anywhere in the zone. */
  ringRadius?: number;
  /** Random ± applied to each impact's ring distance, so the crown isn't perfect. */
  jitter?: number;
  /** Seconds added per successive impact's fuse, so the volley ripples outward. */
  stagger?: number;
  /** Splat AoE radius of each impact (lava-orb default 86). */
  blast?: number;
}

export interface Doodad {
  pos: Vec2;
  radius: number;
  kind: DoodadKind;
  /** BRITTLE kinds: already popped this visit (guards stale spatial-index
   *  hits between the break and the splice). Runtime-only, never authored. */
  gone?: boolean;
  /** Bridges: orientation of the span (for plank rendering). */
  dir?: number;
  /** Water only: a ford — always wading-depth, never swimming. */
  shallow?: boolean;
  /** Vegetation/rock random spin (radians), set at stamp time from the seeded
   *  layout rng — so a place keeps its orientations across revisits. */
  rot?: number;
  /** A silhouette adornment grafted onto the doodad (e.g. 'tentacles' from an
   *  Eldritch mutation). Purely visual; replicated to co-op clients on zone load
   *  (a mid-zone mutation shows for a guest already inside only on re-entry). */
  adorn?: string;
  /** A ticking AREA effect this doodad carries (the doodad-effect framework). */
  effect?: DoodadEffect;
  /** TRANSIENT growths only (the terraform framework, data/attunements.ts):
   *  0→1 as the lifespan runs out — the renderer shrinks/fades by it, so the
   *  growth visibly "wilts and withers away". Absent on permanent terrain. */
  wilt?: number;
  /** A 'chasm' marked FALL-ABLE (Phase 3): instead of just blocking at its rim, a
   *  move arrested here reports a 'void' collision → the void RegionKind's recovery
   *  (respawn-on-edge + damage). Default (absent) = today's blocking chasm. Per-chasm
   *  data, so a generator chooses which gaps are lethal. */
  fall?: boolean;
  /** GEN-TIME ONLY: placed by a rule-breaker stamp that ignored 'portalClear' —
   *  the convex portal-clear splice spares it (deliberate portal furniture). */
  keep?: boolean;
  /** LANDMASS (kind 'landmass', the Voyage's streamed coastline): which land
   *  this shore sample belongs to — the renderer tints it by biome, a bridge
   *  sample reads as a walkable sand isthmus, and an islandId marks a VOYAGE
   *  ISLAND's shore (landing routes to that island's own zone). */
  land?: { biome: string; bridge: boolean; islandId?: string };
  /** A short caption drawn with the doodad (an island beacon's name). */
  label?: string;
  /** DOOR state (kind 'door'): openable/breakable structure doors. The blocking
   *  derivations (blocksMovement/-Projectiles/-SightOf) consult `open`, so one
   *  state flip opens the way for movement, shots, and AI vision at once. */
  door?: DoodadDoor;
  /** THE TRUE COLLISION SURFACE (engine/shapes.ts), when it isn't a disc —
   *  a door's slab rect, authored at gen time in world orientation. Absent =
   *  the classic disc (radius / bodyRadiusOf per channel). Consumers never
   *  read this directly: hitSurfaceOf() is the one resolver. */
  hitbox?: HitShape;
  /** Broad-phase bound for the spatial index when `hitbox` (or a rule-level
   *  surface) pokes past `radius` — max(radius, shapeBoundR). OWNED by
   *  normalizeDoodadBound (stamped at index-rebuild time); never author it. */
  boundR?: number;
}

/** The live state a door doodad carries. Ids are deterministic per zone seed
 *  (`<structureId>/d<n>`), which is what lets Zone Memory + co-op re-apply
 *  states onto a regenerated layout. */
export interface DoodadDoor {
  id: string;
  mode: 'dwell' | 'breakable' | 'both' | 'sealed';
  open?: boolean;
  broken?: boolean;
  /** World rect of the door's plan cells — repainted to floor when it opens. */
  cells?: { x: number; y: number; w: number; h: number };
  /** Breakable doors: the door-actor's life override (else level-scaled). */
  life?: number;
  /** Dwell-to-open seconds override (else the DOORS config default). */
  dwell?: number;
  /** A TEACHING latch (CellSpec.door.lesson): the ACCOUNT ledger key this
   *  door stamps on its first dwell-open. Graduated accounts find later
   *  copies minted open at loadZone — tutorial-by-doing, retired for good
   *  once done (the flask-lesson pattern, worn by a door). */
  lesson?: string;
}

/** The door SLAB's collision tuning (the hit-surface fabric): how deep the
 *  closed slab stands along its normal. Breadth always spans the full breach
 *  (flush with the jamb cells — no seam a body could wedge into), depth is
 *  the slab you see: the drawn bar is 12px deep, and a hair of pad keeps
 *  bodies off the planks. Never deeper than the breach cell itself. */
export const DOOR_SURFACE_CFG = {
  /** Half-depth of the closed slab along the door normal, px. */
  slabHalfDepth: 8,
};

/** The one place a door's cells rect becomes its collision slab: breadth
 *  spans the cells, depth is the slab config clamped to the cells' own
 *  thin axis. `normal` picks which axis is depth. Both door creation sites
 *  (interior room mouths, plan-structure breaches) route through here. */
export function doorSurfaceOf(
  cells: { x: number; y: number; w: number; h: number }, normal: Vec2,
): HitShape {
  const alongX = Math.abs(normal.x) >= Math.abs(normal.y); // normal points through the wall
  const hw = alongX ? Math.min(DOOR_SURFACE_CFG.slabHalfDepth, cells.w / 2) : cells.w / 2;
  const hh = alongX ? cells.h / 2 : Math.min(DOOR_SURFACE_CFG.slabHalfDepth, cells.h / 2);
  return { kind: 'rect', hw, hh };
}

/** A garrisonable position inside a placed structure (a tower core). AI claims
 *  a slot via the 'garrison' verb: teleports/walks in, holds it (anchored),
 *  wears the slot's mods while inside. Occupancy is host-authoritative and
 *  SELF-HEALING (dead/absent occupant ids are dropped on each evaluation). */
export interface PlacedSlot {
  id: string;
  pos: Vec2;
  kind: string;
  capacity: number;
  mods?: Modifier[];
  entry: 'teleport' | 'walk';
  /** Claim reach: how far away an AI may notice + claim this slot. */
  leash?: number;
  occupants: number[];
}

/** A door's placement record (the structure-level view of a door doodad). */
export interface PlacedDoor {
  door: DoodadDoor;
  pos: Vec2;
  /** Outward unit normal — where the door's APRON (guaranteed-clear approach
   *  ground outside the doorway) lies. */
  normal: Vec2;
}

/** A structure raised into a zone: its true rect footprint, roof rects (merged
 *  from the plan's interior cells), doors, and garrison slots. Persisted on the
 *  layout → World.structures → ZoneMsg, so renderers (roof reveal), AI
 *  (garrison), and interactions (doors) all read ONE record. */
export interface PlacedStructure {
  id: string;
  defId: string;
  rect: { x: number; y: number; w: number; h: number };
  cellSize: number;
  roofs: { x: number; y: number; w: number; h: number }[];
  roofStyle: string;
  /** REAL FLOORS under the interior (doorways included) — baked into the
   *  terrain chunks by the renderer (FLOOR_STYLES pattern). Empty style =
   *  bare ground, exactly as before. */
  floors: { x: number; y: number; w: number; h: number }[];
  floorStyle?: string;
  /** Paved courtyard cells (work aprons, parade grounds). */
  courtyards: { x: number; y: number; w: number; h: number }[];
  courtyardFloorStyle?: string;
  doors: PlacedDoor[];
  slots: PlacedSlot[];
  /** WAKE HERE (CellSpec.spawn): the plan's declared arrival point, world
   *  coords. Surfaced on GeneratedLayout.spawnAt for World.loadZone. */
  spawn?: Vec2;
  /** INTERIOR CONFINEMENT (StructureDef.confineVision): while the local hero
   *  is under this roof, the room-veil pass closes vision to the room. */
  confineVision?: boolean;
}

export interface GeneratedLayout {
  doodads: Doodad[];
  /** Set-piece centers (ruin interiors, camp yards) — where POIs live. */
  pois: Vec2[];
  /** Walled-camp centers (each gets a guard pack). */
  camps: Vec2[];
  /** Destructible clutter to spawn (barrels, crates) — monster ids. */
  breakables: { id: string; pos: Vec2 }[];
  /** Friendly scenery folk to spawn (the smith at her forge). */
  npcs: { id: string; pos: Vec2 }[];
  /** Pre-inhabited POIs: a faction guard pack posts at each footprint. */
  garrisons: { pos: Vec2; faction: string; size: [number, number] }[];
  /** Cave-mouth seeds, one per 'cave_entrance' doodad (same push order). */
  caveSeeds: number[];
  /** PHASE-2 SEAM (see world/walk.ts): a non-convex layout's walkability model.
   *  Undefined for the convex layouts (plains, bridge-islands) — those rely on the
   *  classic bounds-minus-blocking-discs model in World.clampPos. A true island/
   *  maze/rooms generator will populate this so clampPos / samplers / AI program
   *  against the WalkField instead of the rect/ellipse hull. */
  walk?: WalkField;
  /** Air-pocket discs (underwater zones): centre + radius, surfaced so the renderer
   *  can draw a clean circular wash + rising bubbles over the chunky grid cells. */
  airPockets?: { x: number; y: number; r: number }[];
  /** Plan structures raised in this zone (rects/roofs/doors/slots) — see
   *  PlacedStructure. Absent when the zone rolled none. */
  structures?: PlacedStructure[];
  /** WAKE HERE: a plan structure's declared arrival point (CellSpec.spawn).
   *  loadZone places parties here when they arrive WITHOUT a back-portal
   *  (fresh run, respawn) — zoneEntry itself stays the geometric entry so
   *  spawn reachability, hazard clears and the perf walk keep their ground. */
  spawnAt?: Vec2;
  /** Deliberately foot-unreachable areas (jump/blink pockets) — spawn policy +
   *  the reachability invariant read these; the renderer may hint them. */
  pockets?: { x: number; y: number; r: number }[];
  /** Landmark-seeded entities (pit dwellers) — loadZone spawns them with the
   *  base population (memory-captured like every other resident). */
  landmarkSpawns?: { id: string; pos: Vec2 }[];
}

// PLACEMENT RULES — the single per-kind registry that decides everything about how
// a doodad PLACES and COLLIDES, so adding a kind is ONE row, not edits across four
// hand-synced lists (the old OVERLAP_SOLID + blocksMovement + blocksProjectiles +
// scattered spacing/areaFreeOf literals). Pure data; everything below derives from it.
//
//   overlap : 'solid'  — spaced off other solids; in a grid zone it must land on
//                        walkable ground (no boulder embedded in a wall).
//             'ground' — a terrain overlay (mud/water/lava): merges freely, gates
//                        nothing. (walkOnly opts a decorative overlay onto walkable
//                        ground so it stays inside carved chambers.)
//             'inert'  — blocks the body (chasm/vines) but never participates in the
//                        solid-overlap check (preserves today's placement exactly).
//             'trigger'— a non-blocking interaction point (cave mouth) kept on
//                        walkable ground.
//   spacing  — min gap from other SOLIDS when placed via findSpot.
//   forbidOn — ground kinds this may NOT sit inside (a vent won't spawn in a lake).
//   walkOnly — in a GRID zone, reject non-walkable cells (defaults true for
//              solids/triggers; ground/inert opt in).
type OverlapClass = 'solid' | 'ground' | 'inert' | 'trigger';
/** How a ground kind POURS (DoodadRule.pour) — every knob data, per kind:
 *  a package kind opts into contiguous bodies with one row, no engine edits. */
export interface PourSpec {
  /** Rim wobble amplitude as a fraction of the body radius (default 0.3). */
  wobble?: number;
  /** Body radius multiplier over the stamp's rolled R, so a poured footprint
   *  matches the reach the old satellite scatter had (default 1.5). */
  scale?: number;
  /** Keep one full-size disc under the lattice at the pour's heart, so
   *  body-aware depth (groundAt penetration past LIQUID_CFG.deepInset)
   *  survives the pour — the pond keeps its deep middle (default false;
   *  meaningful for water, whose region distinguishes wade/swim). */
  depthCore?: boolean;
  /** Fuse reach in grid cells: same-kind bodies within ~2×this many cells
   *  of each other merge at the zone-level close pass (fuseGroundBodies);
   *  0 opts the kind out — blocking kinds default to 0, because
   *  auto-bridging two blockers could choke a corridor the navigability
   *  net would then have to chew back open (default 1 for poured kinds). */
  fuseGap?: number;
}

export interface DoodadRule {
  overlap: OverlapClass;
  blocksMove?: boolean;
  blocksShot?: boolean;
  /** Blocks LINE OF SIGHT (AI vision) independently of shots. Defaults to
   *  blocksShot, so every existing kind keeps today's behavior; a WINDOW frame
   *  sets blocksMove true + blocksSight false (see through, walk into). */
  blocksSight?: boolean;
  spacing?: number;
  forbidOn?: DoodadKind[];
  walkOnly?: boolean;
  /** May this kind stand over VOID-LIKE region cells (!walkable && !blocks —
   *  cloud_void, flux_void, chasm 'void', 'abyss')? Default NO for EVERY
   *  kind: nothing floats over open sky or a pit unless its rule says so (a
   *  bridge plank, a hanging bloom would opt in). One data flag per kind =
   *  the whole ground-required methodology, all zones. */
  voidOk?: boolean;
  /** Renderer occlusion (fake-2D depth): when the LOCAL hero stands within
   *  `radius + pad` of this doodad, its draw fades toward `alpha` so the
   *  character reads through the canopy. Data-driven per kind. */
  occlude?: { pad?: number; alpha?: number };
  /** VEIL (engine/veil.ts): this kind's crowns MERGE into contiguous canopy
   *  PATCHES that hide everything beneath them — near-opaque until the local
   *  hero walks under the patch, when the whole mass opens. Concealment is
   *  gameplay, not just pixels: aim assist can't hold a foe under a patch the
   *  viewer isn't inside, and `standStatus` (the fogveiled pattern) wears on
   *  anyone beneath the leaves. Composes with `occlude` (the per-crown
   *  self-fade still opens the tree directly overhead). One row per kind. */
  veil?: VeilSpec;
  /** This kind is INDEX-PAIRED with a parallel gen-list (cave_entrance ↔
   *  caveSeeds): only its dedicated stamp may emit it — clusters/legends/fx
   *  layers are validator-forbidden from placing it (the zip would shear). */
  seedPaired?: boolean;
  /** A STANDING HAZARD this kind always carries — attached at zone load with a
   *  randomized first cooldown (World's rule-effect pass). THE data seam for
   *  environmental hazards: lava's heat wash, a leyline node's element surge —
   *  one row here instead of a kind-keyed engine special case. */
  effect?: DoodadEffect;
  /** ENGULFING terrain: when a stamp lays this kind, earlier solids/triggers
   *  its discs cover are spliced (a boulder hovering over a fresh chasm is a
   *  draw error). FALSE keeps the lapping look (a pool around its boulders).
   *  Deliberate overlaps stay available via stamp rule-breakers (`keep`). */
  swallowsSolids?: boolean;
  /** PHYSICAL BODY as a fraction of the visual radius. A tree's TRUNK blocks
   *  movement and shots at radius × bodyScale while its full-radius CANOPY
   *  still occludes, shades, and blocks AI sight — so you walk (and fight)
   *  UNDER the leaves. Omitted = the whole disc is solid (today's kinds). */
  bodyScale?: number;
  /** OBLONG BODY (the hit-surface fabric, engine/shapes.ts): this kind's true
   *  surface is a RECT, half-extents `hw`/`hh` as fractions of the channel
   *  radius (bodyRadiusOf for feet/shots, full radius for sight), oriented by
   *  the instance's spin (`rot`, the default) or facing (`dir`) plus a fixed
   *  `angle` offset — so a bench blocks as the plank you see, not as an
   *  invisible circle swallowing the path beside it. `orient: 'fixed'` pins
   *  the rect to the world axes (+ `angle` alone) for painters that draw
   *  UNSPUN (the palisade square) or only LEAN by sin(rot)·ε (fin blades,
   *  the hellforge) — spinning those surfaces by raw rot would break the
   *  pixels-are-the-contract identity. One row per kind; a per-instance
   *  Doodad.hitbox (doors) overrides entirely. Keep the painter and the
   *  fractions in agreement — the drawn footprint IS the contract. */
  surface?: { hw: number; hh: number; orient?: 'rot' | 'dir' | 'fixed'; angle?: number };
  /** SEED-ROLLED ROCK FORM (engine/rockForms.ts): this kind's surface derives
   *  PER INSTANCE from the same mono/split/outcrop roll the boulder painter
   *  draws — a split stone blocks as two lobes, an outcrop's satellites block
   *  where they sit. Cluster chance + spire flag live HERE and the painter
   *  prefers them over its visual params, so look and collision cannot
   *  drift. Wins over `surface`; a per-instance hitbox still overrides. */
  rockForm?: RockFormSpec;
  /** BRITTLE: a lifeless breakable — no life bar, no kill ladder; it POPS.
   *  Pure data: any kind (or a package/legend kind via registerDoodadRule)
   *  becomes a pot, a crumbling plug, or a secret door with one row. */
  brittle?: BrittleSpec;
  /** SPANS hazards: this kind negates chasm blocking where it lies — the
   *  bridge contract. World.bridges collects spanning doodads by THIS flag,
   *  never by kind literal, so a package's rope crossing or a brittle rotten
   *  plank joins the same physics with one row. */
  spans?: boolean;
  /** POURED BODY: blob stamps of this GROUND kind stop scattering big
   *  overlapping circles and instead rasterize ONE organic mask (wobbled
   *  radial core + lobes) emitted through the shared paintLiquid lattice —
   *  the exact geometry landmark recipes pour, so stamps, clusters, fx
   *  layers and landmarks converge on cohesive contiguous bodies. The
   *  zone-level fuse pass (fuseGroundBodies) then closes sliver gaps between
   *  near-touching bodies of the same kind + flags. Ground kinds only. */
  pour?: PourSpec;
  /** HAZARD GROUND: structure/landmark/camp siting refuses to stand on this
   *  kind (the derived hazardGrounds() list — was a literal array). A
   *  package's new pit or pool joins the siting rules with one word. */
  hazardGround?: boolean;
  /** MUTABLE by world events: an Incursion's doodad_mutation may graft onto
   *  this kind (world.ts eldritchMutateDoodads). A derived predicate, never
   *  a literal id set in engine paths. */
  mutable?: boolean;
  /** SHRUB-FAMILY SPIN: blob pieces of this kind roll a per-piece rotation
   *  at stamp time (stampBlob). The rot draw stays CONDITIONAL on this flag
   *  so every unflagged kind keeps its exact historical rng sequence. */
  spin?: boolean;
}

/** How a lifeless breakable gives way (World.popBrittle executes it). */
export interface BrittleSpec {
  /** What sets it off — any listed trigger fires:
   *  'hit'   = any STRIKE connects: a projectile in flight (the flight step
   *            probes it) or any damaging skill area washing over it — arcs,
   *            sweeps, novas, cones, grounds, leaps, blasts — through the
   *            shared strike-surface seam (World.strikeSurfaces), each with
   *            its own victim geometry. DoT seepage never pops anything;
   *  'near'  = a player-team body inside `reach` (instant, or `dwell`-gated);
   *  'touch' = body contact (walk through a pot and it goes). */
  on: ('hit' | 'near' | 'touch')[];
  /** 'near' reach in world units (default 40). */
  reach?: number;
  /** Sustained seconds inside reach before 'near' fires — a secret wall
   *  gives to a lingering press, not a jog past. Default 0 = instant. */
  dwell?: number;
  /** Chance to spill a life/mana orb (the barrel tradition). */
  orbChance?: number;
  /** Chance to drop a gem (secret pockets pay for the finding). */
  gemChance?: number;
  /** Carve the walk grid open in this radius on break — a crumbling plug
   *  unblocks itself; a secret wall carves INTO the wall face behind it. */
  carve?: number;
  /** Break flavor: floating text + flash tint. */
  text?: string;
  color?: string;
  /** One-shot flavor the first time a dwell clock STARTS ticking — the creak
   *  before the drop, the hollow knock behind the stone. */
  warn?: string;
  /** Break exhales a FUME: a lingering hazard cloud minted from the named
   *  ground skill (default the reference fume, toxic_cloud) at the wreck.
   *  Radius/linger/damage ride this data; the cloud runs the normal ground-
   *  zone pipeline (ticks, exposure grace, Foresight telegraphs), so a gas
   *  pod is a pot that says one more word. */
  fume?: { skillId?: string; radius?: number; linger?: number; tickInterval?: number;
    dmgMult?: number; delay?: number; color?: string };
  /** Break WAKES something: monsters spawned at the wreck — urn ambushes,
   *  hive husks. `chance` gates the whole clutch; `count` rolls per break. */
  spawn?: { monster: string; count?: [number, number]; chance?: number; text?: string };
  /** COLLAPSE: the doodad WAS the footing (a rotten span over a drop).
   *  Bodies riding it when it goes take the fall recovery — confined to the
   *  hazard's edge ('edge', default) or returned to safe ground
   *  ('lastNode') — with the fall's damage. Bodies a surviving span still
   *  holds are spared by the physics itself, not by a special case. */
  collapse?: { to?: 'edge' | 'lastNode';
    damage?: { amount?: number; pctMaxLife?: number; type?: string; canKill?: boolean } };
}

/** FORBIDON WINS, GLOBALLY (see generateLayout): the stamp gate's inverse as
 *  one final pass. findSpot gates a solid against the ground that exists
 *  when it stamps; landmarks, cluster pieces, melds and post compositions
 *  keep pouring ground AFTERWARDS — so any solid overlapping a ground
 *  doodad its rule forbids is spliced here, order-independent, whoever
 *  poured it. Coarse-bucketed so a mega-zone stays O(n); seedPaired kinds
 *  keep their parallel seed list zipped (the cave-mouth contract). */
function sweepForbiddenGround(ctx: GenCtx): void {
  const forbidden = new Set<string>();
  for (const d of ctx.doodads) {
    const f = doodadRule(d.kind).forbidOn;
    if (f) for (const k of f) forbidden.add(k);
  }
  if (!forbidden.size) return;
  const CELL = 96;
  const buckets = new Map<number, Doodad[]>();
  let maxR = 0;
  for (const g of ctx.doodads) {
    if (!forbidden.has(g.kind)) continue;
    if (doodadRule(g.kind).overlap !== 'ground') continue;
    const key = Math.floor(g.pos.x / CELL) * 100000 + Math.floor(g.pos.y / CELL);
    const list = buckets.get(key);
    if (list) list.push(g); else buckets.set(key, [g]);
    if (g.radius > maxR) maxR = g.radius;
  }
  if (!buckets.size) return;
  for (let i = ctx.doodads.length - 1; i >= 0; i--) {
    const d = ctx.doodads[i];
    if (d.keep) continue;
    const f = doodadRule(d.kind).forbidOn;
    if (!f || !f.length) continue;
    const reach = d.radius + maxR;
    const x0 = Math.floor((d.pos.x - reach) / CELL), x1 = Math.floor((d.pos.x + reach) / CELL);
    const y0 = Math.floor((d.pos.y - reach) / CELL), y1 = Math.floor((d.pos.y + reach) / CELL);
    let hit = false;
    scan: for (let bx = x0; bx <= x1; bx++) {
      for (let by = y0; by <= y1; by++) {
        const list = buckets.get(bx * 100000 + by);
        if (!list) continue;
        for (const g of list) {
          if (g === d || !f.includes(g.kind)) continue;
          const dx = d.pos.x - g.pos.x, dy = d.pos.y - g.pos.y;
          const rr = d.radius + g.radius;
          if (dx * dx + dy * dy < rr * rr) { hit = true; break scan; }
        }
      }
    }
    if (!hit) continue;
    if (doodadRule(d.kind).seedPaired) {
      let ordinal = 0;
      for (let k = 0; k < i; k++) if (ctx.doodads[k].kind === d.kind) ordinal++;
      if (ordinal < ctx.caveSeeds.length) ctx.caveSeeds.splice(ordinal, 1);
    }
    ctx.doodads.splice(i, 1);
  }
}

/** The PHYSICAL radius of a doodad — the trunk, not the crown. Movement,
 *  projectile and spawn-clearance checks use this; sight/occlusion/shade
 *  keep the full visual radius (the canopy is real to eyes, not to feet). */
export function bodyRadiusOf(d: Doodad): number {
  return d.radius * (doodadRule(d.kind).bodyScale ?? 1);
}

/** Which body a consumer is asking about: feet ('move'), effects ('shot'),
 *  or eyes ('sight'). Mirrors the classic trunk/crown split — move/shot
 *  resolve at bodyRadiusOf, sight at the full visual radius. */
export type SurfaceChannel = 'move' | 'shot' | 'sight';

/** THE hit-surface resolver — every collision consumer (clampPos, castRay,
 *  nav stamping, the projectile terrain sweep, the debug overlay) asks HERE,
 *  never invents geometry from a kind. Resolution order:
 *    1. Doodad.hitbox — a per-instance authored surface (doors), already in
 *       world orientation; identical across channels.
 *    2. DoodadRule.rockForm — the seed-rolled stone grammar: the SAME
 *       mono/split/outcrop bodies the boulder painter draws, as lobe
 *       circles (engine/rockForms.ts, memoized per instance).
 *    3. DoodadRule.surface — the kind's oblong body, scaled by the channel
 *       radius and spun by the instance's rot/dir (or pinned, 'fixed').
 *    4. The classic disc at the channel radius (all existing kinds). */
export function hitSurfaceOf(d: Doodad, channel: SurfaceChannel): HitShape {
  if (d.hitbox) return d.hitbox;
  const rule = doodadRule(d.kind);
  const r = channel === 'sight' ? d.radius : bodyRadiusOf(d);
  if (rule.rockForm) return rockSurfaceOf(d, r, rule.rockForm);
  const sf = rule.surface;
  if (sf) {
    const spin = sf.orient === 'fixed' ? 0
      : sf.orient === 'dir' ? (d.dir ?? d.rot ?? 0) : (d.rot ?? d.dir ?? 0);
    return { kind: 'rect', hw: r * sf.hw, hh: r * sf.hh, rot: spin + (sf.angle ?? 0) };
  }
  return { kind: 'circle', r };
}

/** Broad-phase radius the spatial index must insert this doodad at — the
 *  visual radius unless a surface pokes past it (a door slab's corners).
 *  World stamps `boundR` through here on every index rebuild, so runtime
 *  doodads (terraforms, mutations, snapshot-applied guests) self-heal. */
export function normalizeDoodadBound(d: Doodad): void {
  const rule = doodadRule(d.kind);
  if (!d.hitbox && !rule.surface) { d.boundR = undefined; return; }
  // Sight resolves at the widest channel radius, so it bounds all three.
  const b = shapeBoundR(hitSurfaceOf(d, 'sight'));
  d.boundR = b > d.radius ? b : undefined;
}

const DOODAD_RULES: Record<KnownDoodadKind, DoodadRule> = {
  // Solids (must not pile on each other; walk-gated in grid zones). Spacings are
  // migrated verbatim from the old per-stamp literals so existing zones don't shift.
  // ROCKS collide as ROLLED (DoodadRule.rockForm, engine/rockForms.ts): the
  // same seed roll the boulder painter draws — mono stands honest at its
  // wobbled mass, splits block as two lobes, outcrops as shoulder+satellites.
  // Cluster chances mirror what the painter always rolled for these kinds.
  rock:      { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 30, mutable: true, rockForm: { cluster: 0.45 } },
  cliff:     { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 40, mutable: true },
  wall:      { overlap: 'solid', blocksMove: true, blocksShot: true, mutable: true },
  // THE BRITTLE KIT — lifeless breakables (DoodadRule.brittle; World.popBrittle).
  // Pots pop underfoot or to a stray arrow; the fissured plug collapses when a
  // body nears; the secret face gives to a strike — or a deliberate lean.
  clay_pots: { overlap: 'inert', spacing: 8,
    brittle: { on: ['hit', 'touch'], orbChance: 0.4, text: 'crash!', color: '#c8a06a' } },
  crumbling_wall: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 24,
    brittle: { on: ['near', 'hit'], reach: 46, carve: 40, orbChance: 0.15, text: 'the wall crumbles!', color: '#8a8276' } },
  secret_wall: { overlap: 'solid', blocksMove: true, blocksShot: true,
    brittle: { on: ['hit', 'near'], reach: 36, dwell: 1.3, carve: 62, gemChance: 0.6, orbChance: 0.8, warn: 'the stone sounds hollow…', text: 'a hidden passage grinds open!', color: '#d8c890' } },
  // WAVE 2 — hazard breakables, every consequence pure BrittleSpec data.
  // The rotten span is FOOTING (ground + spans): it creaks at first tread,
  // remembers every crossing, and drops whoever lingers into the fall
  // recovery. Pods and sacs pop into lingering fume clouds; the urn spills
  // orbs and sometimes wakes its tenants; lattices pay the one who strikes.
  rotten_bridge: { overlap: 'ground', spans: true,
    brittle: { on: ['touch'], dwell: 0.85, warn: 'the planks creak…', text: 'the span gives way!', color: '#8a6e48',
      collapse: { damage: { pctMaxLife: 0.12 } } } },
  gas_pod: { overlap: 'inert', spacing: 26,
    brittle: { on: ['hit', 'touch'], text: 'the pod ruptures!', color: '#9fb95a',
      fume: { radius: 78, linger: 3.2, dmgMult: 0.8, color: '#9fb95a' } } },
  burst_sac: { overlap: 'inert', spacing: 24,
    brittle: { on: ['hit', 'near'], reach: 30, text: 'the sac bursts!', color: '#b08ad8',
      fume: { radius: 70, linger: 2.8, dmgMult: 0.7, color: '#b08ad8' } } },
  puffcap_cluster: { overlap: 'inert', spacing: 18,
    brittle: { on: ['touch', 'hit'], orbChance: 0.12, text: 'puff!', color: '#c8b06a',
      fume: { radius: 54, linger: 2.0, dmgMult: 0.5, delay: 0.3, color: '#c8b06a' } } },
  burial_urn: { overlap: 'inert', spacing: 22,
    brittle: { on: ['hit', 'touch'], orbChance: 0.55, gemChance: 0.12, text: 'the urn shatters!', color: '#b8a890',
      spawn: { monster: 'skeleton_warrior', count: [1, 2], chance: 0.22, text: 'the dead wake!' } } },
  crystal_cluster: { overlap: 'solid', blocksMove: true, spacing: 34, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    brittle: { on: ['hit'], gemChance: 0.3, orbChance: 0.35, text: 'the lattice shatters!', color: '#7fc0f0' } },
  icicle_cluster: { overlap: 'solid', blocksMove: true, spacing: 26, forbidOn: ['water', 'lava'],
    brittle: { on: ['hit', 'near'], reach: 30, orbChance: 0.25, text: 'shatter!', color: '#bfe0f0' } },
  // The bog set: mire dressing + the contracting-fume hazard flower. The
  // bloom's pop is pure BrittleSpec data — its fume names venom_seep, so the
  // cloud inherits the skill's own closing SIZE ENVELOPE (it shrinks away).
  sunken_log: { overlap: 'solid', blocksMove: true, spacing: 26, forbidOn: ['lava', 'chasm'],
    surface: { hw: 1.7, hh: 0.62 } }, // the log painter's trunk proportions
  marsh_wisp: { overlap: 'inert', spacing: 34 },
  peat_mound: { overlap: 'solid', blocksMove: true, spacing: 28, forbidOn: ['water', 'lava', 'chasm'] },
  venom_bloom: { overlap: 'inert', spacing: 24,
    brittle: { on: ['hit', 'near'], reach: 32, text: 'the bloom bursts!', color: '#a8d05a',
      fume: { skillId: 'venom_seep', radius: 62, linger: 3.4, dmgMult: 0.8, color: '#a8d05a' } } },
  // The parity-pass wayside kit: ley furniture and one honest hazard. The
  // snare is the trapper's craft left in the world — pure BrittleSpec, the
  // collapse damage billing whoever springs it (rotten_bridge's grammar).
  chronolith: { overlap: 'solid', blocksMove: true, spacing: 36, forbidOn: ['water', 'lava', 'chasm'] },
  meditation_cairn: { overlap: 'inert', spacing: 30 },
  rusted_snare: { overlap: 'inert', spacing: 26,
    brittle: { on: ['touch', 'hit'], text: 'SNAP!', color: '#a89078',
      collapse: { damage: { pctMaxLife: 0.08 } } } },
  // THE CAUL KIT — the terrain-that-fights doctrine, both lanes: fixed-point
  // menace on the doodad-effect registry (maw_pit's reel), eruption on the
  // brittle lane (caul_sac's ticks), and everything KILLABLE walks the actor
  // pipeline instead (caul_lasher / vor_maw / amnion_creeper wear ambush).
  chitin_fin: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 30, bodyScale: 0.9,
    forbidOn: ['water', 'lava', 'chasm', 'gore'],
    surface: { hw: 1.5, hh: 0.45, orient: 'rot' } },
  black_umbilic: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 280,
    forbidOn: ['water', 'lava', 'chasm', 'gore'],
    occlude: { pad: 10, alpha: 0.3 } },
  // The sac pops to a hit OR a close press — and sometimes what was inside
  // objects (brittle.spawn: the doodad→actor bridge, the urn's contract).
  caul_sac: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 26,
    forbidOn: ['water', 'lava', 'chasm', 'gore'],
    brittle: { on: ['hit', 'near'], reach: 26, orbChance: 0.12,
      text: 'the sac bursts!', color: '#9a72c8',
      spawn: { monster: 'caul_tick', count: [1, 2], chance: 0.18, text: 'something skitters out!' } } },
  caul_eyes: { overlap: 'inert', spacing: 44 },
  // THE DUNE SEA's crest comb (dunefield recipe): pure ridge ART riding the
  // duneface region cells — the REGION is the collision truth, so the comb
  // is inert and sits happily on non-walkable sand (no walk gate to fight).
  dune_crest: { overlap: 'inert', spacing: 0 },
  // THE GLASSPAN KIT — the salt flat's standing furniture. Pillars and ribs
  // block feet only (the pan keeps its long sightlines); the glass is
  // brittle both ways — walk through it and it goes.
  salt_pillar: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 56, bodyScale: 0.7,
    forbidOn: ['water', 'lava', 'chasm'] },
  glass_shard: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 34, bodyScale: 0.8,
    brittle: { on: ['hit', 'touch'], orbChance: 0.15, text: 'the glass sings apart!', color: '#d8ecf0' } },
  bone_arch: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 120, bodyScale: 0.85,
    forbidOn: ['water', 'lava', 'chasm'],
    surface: { hw: 1.6, hh: 0.35, orient: 'rot' } },
  // WALK-UNDER SHADE: occlude is what World.isShaded reads, so standing
  // beneath the fly SHEDS sunscorch — a placeable answer to the swelter tax
  // (camps and oasis courts wear them; compositions will too).
  sun_awning: { overlap: 'ground', spacing: 90,
    forbidOn: ['water', 'lava', 'chasm'],
    occlude: { pad: 8, alpha: 0.35 } },
  // The buried village's way DOWN (sidezones.ts mints the vault) — the
  // ruin_gate contract in sandstone.
  vault_gate: { overlap: 'trigger', spacing: 500 },
  // THE MIRAGE KIT: inert light, not matter — bodies and shots pass clean
  // through; walking close enough to KNOW pops the lie (brittle 'near', the
  // whole existing machinery: text, poof tint, and the caravan's ambush on
  // the spawn lane — the doodad→actor bridge, never a moving doodad).
  mirage_oasis: { overlap: 'inert', spacing: 520,
    brittle: { on: ['near'], reach: 120, text: 'the water was never there…', color: '#bfe8f0' } },
  mirage_bastion: { overlap: 'inert', spacing: 640,
    brittle: { on: ['near'], reach: 130, text: 'the walls scatter into heat…', color: '#bfe8f0' } },
  mirage_caravan: { overlap: 'inert', spacing: 560,
    brittle: { on: ['near'], reach: 120, text: 'it was never a caravan—', color: '#bfe8f0',
      spawn: { monster: 'dune_stalker', count: [2, 3], chance: 0.45, text: 'the sand rises hunting!' } } },
  // The maw is GROUND (nothing to trip on — the reel is the obstacle):
  // hazardGround keeps ambient spawns off the lip, the auto-attached effect
  // reels the nearest intruder each beat and bites whatever reaches the lip.
  maw_pit: { overlap: 'ground', spacing: 240, hazardGround: true,
    forbidOn: ['water', 'lava', 'chasm', 'gore'],
    effect: { id: 'maw_reel', interval: 1.2, chance: 0.85, radius: 230, power: 9 } },
  nerve_root: { overlap: 'inert', spacing: 50 },
  // The apothecary kit: brew-yard furniture + the fount-feeding spring.
  // The still is GLASS (brittle, orb-rich — smashing the workshop pays);
  // the spring is GROUND that wells orbs up on a beat (orb_spring handler)
  // — terrain feeding the whole drinking economy through the ordinary
  // scoop: pours, flask sips and orbPickup procs all ride the same orb.
  alembic: { overlap: 'inert', spacing: 40,
    brittle: { on: ['hit', 'touch'], orbChance: 0.65, text: 'the still shatters!', color: '#b8d8e8' } },
  herb_rack: { overlap: 'solid', blocksMove: true, spacing: 55, bodyScale: 0.5,
    surface: { hw: 2.1, hh: 0.35 } }, // the fishing rack's rail line, hung with greens
  cauldron: { overlap: 'solid', blocksMove: true, spacing: 70 },
  spring_pool: { overlap: 'ground', walkOnly: true, spacing: 460,
    forbidOn: ['water', 'lava', 'chasm', 'gore'],
    effect: { id: 'orb_spring', interval: 5, chance: 1, radius: 120, power: 1 } },
  // Canopy kinds (occlude): their crowns draw ABOVE actors and FADE when the
  // hero stands under them — the fake-2D depth layer (renderer drawCanopies).
  // TREES have TRUNKS now (bodyScale): feet and arrows respect the trunk,
  // eyes respect the canopy — walk under the leaves, fight in the shade,
  // and never see who waits beneath an unfaded crown until you join them.
  // The whole walk-under tree family VEILS (veil: {}): crowns knit into
  // contiguous patches that seal over whatever stands beneath — a lone tree
  // is a one-crown patch (aim assist already can't hold what waits under it),
  // a grove cluster opens as one, a forest is a roof. Cover/reveal/status all
  // ride VEIL_DEFAULTS unless a kind says otherwise.
  tree:      { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 18, occlude: { pad: 10, alpha: 0.3 }, bodyScale: 0.3, veil: {}, mutable: true },
  palm:      { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 18, occlude: { pad: 10, alpha: 0.3 }, bodyScale: 0.26, veil: {}, mutable: true },
  /** Evergreen spire — tundra/deepwood conifer (pineCrown canopy). */
  conifer:   { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 20, occlude: { pad: 10, alpha: 0.3 }, bodyScale: 0.26, veil: {} },
  /** The FOREST's canopy body: a broad oak whose crown is built to KNIT —
   *  the forest recipe plants them closer than their crowns span, so the
   *  veil index reads whole stands as single sealed masses. */
  forest_oak: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 12, occlude: { pad: 12, alpha: 0.3 }, bodyScale: 0.22, veil: {} },
  /** The GLOAMWOOD's canopy body: forest_oak's exact walk-under/veil
   *  mechanics under a grey-dark crooked crown (the haunted wood seals its
   *  roof the same way the green one does). */
  gloam_oak: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 12, occlude: { pad: 12, alpha: 0.3 }, bodyScale: 0.22, veil: {} },
  // The Gloamwood croft kit: a walkable gourd tangle, its lone carved
  // cousin (inert, candle-lit, pops), and the hanged road's gibbets.
  pumpkin_patch: { overlap: 'ground', walkOnly: true, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  jack_o_lantern: { overlap: 'inert', spacing: 44,
    brittle: { on: ['hit'], orbChance: 0.3, text: 'the lantern gutters…', color: '#ffb44a' } },
  hanging_cage: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 110, bodyScale: 0.4, forbidOn: ['water', 'lava', 'chasm'] },
  /** A forest ELDER: a huge crown over a thick bole — the dense-forest
   *  anchor (whole packs ambush beneath one). Veiled: even a lone elder's
   *  crown is a PATCH (aim assist can't hold what waits beneath), and where
   *  elders knit into a forest canopy the whole mass seals as one. */
  ancient_tree: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 80, occlude: { pad: 14, alpha: 0.25 }, bodyScale: 0.22, veil: {} },
  /** The thicket grown into a TREE: a gnarled thorn bole under a walk-under
   *  bramble crown — the tangle you can stand beneath (and regret). */
  briarwood: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 24, occlude: { pad: 10, alpha: 0.3 }, bodyScale: 0.3, veil: {} },
  // Winter clutter (the taiga's furniture).
  ice_spike: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 24 },
  snowman:   { overlap: 'solid', blocksMove: true, spacing: 60 },
  signpost:  { overlap: 'solid', blocksMove: true, spacing: 70, bodyScale: 0.35 },
  // OBLONG FURNITURE (DoodadRule.surface, the hit-surface fabric): kinds whose
  // painter draws an oriented oblong collide as that oblong — half-extents as
  // fractions of the channel radius, spun by the SAME `rot` the painter reads
  // (or PINNED via orient:'fixed' when the painter draws unspun / only leans),
  // so hitbox and pixels agree in every placement mode (scatter, formation
  // rot:'chain', structure sills). Fractions mirror the painter's drawn
  // proportions — keep the two in sync when retuning either. Kinds left as
  // discs on purpose: rib_arch (multi-hoop arch — needs multi-part surfaces),
  // gallows/soul_cage (walk-on platform / hanging cage: the small bodyScale
  // disc IS the intent), wall/cliff/wyrm_coil (stamped as overlapping runs —
  // rect joints would open pinholes), tooth_row (an offset C-arc no centered
  // rect can hug — it wears a snugged bodyScale disc instead),
  // crumbling_wall/secret_wall (FUNCTIONAL PLUGS: the full disc IS the door —
  // it must seal its gap until popped, so their VISUAL rolls mono
  // [doodadVisuals cluster: 0] to match the sealing mass, never the other way
  // around), and the true circles the sweep verified honest as drawn:
  // mounds, kiln/salt/umbilic columns, wells, pot clusters, vents, domes,
  // shard clusters.
  firewood_pile: { overlap: 'solid', blocksMove: true, spacing: 50, surface: { hw: 1.05, hh: 0.55 } },
  // Settlement + wayside clutter (towns, roads, farms, ruins).
  fountain:  { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 140 },
  well:      { overlap: 'solid', blocksMove: true, spacing: 110 },
  lantern_post: { overlap: 'solid', blocksMove: true, spacing: 90, bodyScale: 0.3 },
  bench:     { overlap: 'solid', blocksMove: true, spacing: 60, surface: { hw: 1.0, hh: 0.42 } },
  market_stall: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 90, surface: { hw: 0.9, hh: 0.85 } },
  broken_cart:  { overlap: 'solid', blocksMove: true, spacing: 80, surface: { hw: 0.85, hh: 0.55, angle: 0.22 } },
  scarecrow: { overlap: 'solid', blocksMove: true, spacing: 90, bodyScale: 0.3 },
  hay_bale:  { overlap: 'solid', blocksMove: true, spacing: 55,
    surface: { hw: 1.0, hh: 0.72 } }, // the rolled bale's drawn ellipse (r × 0.75r)
  pot_cluster: { overlap: 'solid', blocksMove: true, spacing: 45 },
  rubble:    { overlap: 'ground', walkOnly: true },
  // Home furnishings (blueprint rooms; plan cells pin them, so spacing only
  // matters if a recipe ever scatters them loose). Drawn axis-aligned in a
  // room — surfaces pin 'fixed' so the slab never spins with a stray rot.
  bed:       { overlap: 'solid', blocksMove: true, spacing: 40,
    surface: { hw: 0.72, hh: 1.05, orient: 'fixed' } }, // headboard-north frame (taller than wide)
  hearth:    { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 60,
    surface: { hw: 0.85, hh: 0.6, orient: 'fixed' } },  // chest-high stone: stops arrows, not eyes
  stool:     { overlap: 'solid', blocksMove: true, spacing: 30, bodyScale: 0.7 },
  shelf:     { overlap: 'solid', blocksMove: true, spacing: 40,
    surface: { hw: 0.95, hh: 0.34, orient: 'fixed' } }, // a wall-hugging board (wide, shallow)
  rug:       { overlap: 'ground', walkOnly: true },
  banner_post: { overlap: 'solid', blocksMove: true, spacing: 90, bodyScale: 0.3 },
  beehive:   { overlap: 'solid', blocksMove: true, spacing: 75 },
  thicket:   { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 28, occlude: { pad: 12, alpha: 0.35 }, mutable: true },
  tombstone: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 22, mutable: true,
    surface: { hw: 0.65, hh: 0.34 } }, // the headstone slab (arch face 1.3r wide; thin depth)
  // Hazard solids — now also kept OUT of pools/pits (the QA fix) and apart enough to
  // read as distinct shards/vents (crystal bumped 30→60 so two never near-touch).
  crystal:   { overlap: 'solid', blocksMove: true, blocksShot: true,  spacing: 60, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  lava_vent: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 44, forbidOn: ['water', 'chasm'] },
  // Ground overlays — terrain that merges freely. chasm/lava/vines BLOCK but stay
  // 'inert'/'ground' in the overlap check (today's behaviour).
  // A chasm ENGULFS what it cuts through (a boulder can't hover over the
  // void); lava/water keep the lapping look (boulders shoulder out of pools).
  // The LIQUID family POURS (DoodadRule.pour): blob stamps rasterize one
  // organic body on the landmark lattice instead of scattering big circles,
  // and near-touching bodies of a kind FUSE contiguous. Blocking members
  // (chasm, magma_core) pour but never auto-fuse (fuseGap 0) — merging two
  // blockers could choke a corridor. Water keeps a depth heart so its ponds
  // still swim past the wading shelf. Vines deliberately stay a scatter:
  // a tangle IS an interlocking weave.
  chasm:     { overlap: 'inert',  blocksMove: true,  blocksShot: false, swallowsSolids: true, pour: { fuseGap: 0 }, hazardGround: true },
  // LAVA is a LIQUID now: crossable ground that COOKS the uninsured (the
  // 'lava' RegionKind carries the standDamage; fliers, habitat-matched
  // bodies and immuneGround bearers wade free). The impassable molten
  // WALL — the caldera's spiral — is the separate magma_core kind below.
  // The heat stands off the melt: both melt kinds carry their rim-band wash
  // as RULE DATA (the world's rule-effect attach) — the old engine special
  // case, now one row any hazard kind can author.
  lava:      { overlap: 'ground', pour: {}, hazardGround: true,
    effect: { id: 'heat_wash', interval: 1.1, radius: 64, chance: 0.55, power: 3 } },
  magma_core: { overlap: 'inert', blocksMove: true, blocksShot: false, pour: { fuseGap: 0 },
    effect: { id: 'heat_wash', interval: 1.1, radius: 64, chance: 0.55, power: 3 } },
  // The wayfarer kit: story furniture for roads, coasts and working woods.
  weathered_statue: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 90, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    // The statue painter's plinth is a FULL ±r SQUARE — the drawn corners
    // used to phase through the old disc; now they block like they look.
    surface: { hw: 1.0, hh: 1.0 } },
  wayshrine:      { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 160, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    surface: { hw: 0.72, hh: 0.78 } }, // the niche hut's body + roof overhang
  gallows:        { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 200, bodyScale: 0.45, forbidOn: ['water', 'lava', 'chasm'] },
  fishing_rack:   { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 70, bodyScale: 0.5, forbidOn: ['lava', 'chasm'],
    // Post-to-post rail line (fracs ride the 0.5 body radius → 1.05r × 0.175r).
    surface: { hw: 2.1, hh: 0.35 } },
  charcoal_mound: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 150, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  // The scavenger-web dressing: graveland + mire texture. gel_pool is a
  // POURED ground liquid (contiguous organic bodies, fuse-welded) — the
  // quag gels' habitat ground; the rest are solids on the wayfarer pattern.
  gel_pool:      { overlap: 'ground', pour: {} },
  sunken_stone:  { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 80, forbidOn: ['lava', 'chasm'],
    surface: { hw: 0.7, hh: 0.42 } }, // the drowned stele: same monolith base as its dry kin
  black_obelisk: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 200, bodyScale: 0.55, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  tallow_stump:  { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 120, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  barrow_mound:  { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 220, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  hollow_log:    { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 140, bodyScale: 0.6, forbidOn: ['water', 'lava', 'chasm'],
    // The log painter's trunk (1.7r × 0.62r) — fracs ride the 0.6 body radius.
    surface: { hw: 2.85, hh: 1.05 } },
  bone_cairn:    { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 110, bodyScale: 0.7, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  // The storm-scar kit: where lightning kept an appointment. All INERT —
  // the formations doctrine's look-alikes; the live hazards live elsewhere.
  fulgurite:       { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 150, bodyScale: 0.6, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  charged_crystal: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 130, bodyScale: 0.75, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  static_bloom:    { overlap: 'ground' },
  storm_glass:     { overlap: 'ground', forbidOn: ['water', 'lava', 'chasm'] },
  vines:     { overlap: 'inert',  blocksMove: true,  blocksShot: false, spin: true },
  bridge:    { overlap: 'ground', spans: true },
  mud:       { overlap: 'ground', pour: {} },
  swamp:     { overlap: 'ground', pour: {}, hazardGround: true },
  bog:       { overlap: 'ground', pour: {}, hazardGround: true },
  water:     { overlap: 'ground', pour: { depthCore: true }, hazardGround: true },
  ice:       { overlap: 'ground', pour: {} },
  sand:      { overlap: 'ground', pour: {} },
  heat_shimmer: { overlap: 'ground', walkOnly: true, forbidOn: ['water', 'chasm'] },
  // The doodad kingdom (round 4).
  dead_tree: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 24, bodyScale: 0.35 },
  stump:     { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 22 },
  log:       { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 26, surface: { hw: 1.7, hh: 0.62 } },
  flowers:   { overlap: 'ground' },
  reeds:     { overlap: 'ground', walkOnly: true },
  cactus:    { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 30, forbidOn: ['water', 'chasm'] },
  web:       { overlap: 'ground', walkOnly: true },
  geyser:    { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 48, forbidOn: ['water', 'chasm'] },
  snowdrift: { overlap: 'ground', pour: {} },
  bone_pile: { overlap: 'ground', walkOnly: true },
  brazier:   { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 40 },
  standing_stone: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 46,
    surface: { hw: 0.7, hh: 0.42 } }, // the slab monolith's base (widest ±0.7r)
  road:      { overlap: 'ground', walkOnly: true }, // a walkable gravel path (stays on walkable ground in grid zones)
  grass:     { overlap: 'ground' },
  /** The Field's boundary fringe: pure visual, deliberately NOT walk-gated —
   *  it straddles the tallgrass rim to round the raster's right angles off. */
  hedgerow:  { overlap: 'ground' },
  brush:     { overlap: 'ground', spin: true },
  campfire:  { overlap: 'ground' },
  ritual_pentagram: { overlap: 'ground' },
  tentacle_field:   { overlap: 'ground' },
  cave_entrance:    { overlap: 'trigger', spacing: 40, seedPaired: true },
  // Flesh themed doodads (walk-gated so they land inside the carved chambers).
  flesh_pod: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 36 },
  bone:      { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 26 },
  gore:      { overlap: 'ground', walkOnly: true, pour: {} },
  // Volcanic themed doodads.
  obsidian:   { overlap: 'solid', blocksMove: true, blocksShot: true,  spacing: 34, forbidOn: ['water', 'lava', 'chasm'] },
  cinder:     { overlap: 'ground', walkOnly: true, pour: {} },
  ember_vent: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 32, forbidOn: ['water', 'chasm'] },
  // Descent doodads. light_spot/descent_platform are non-blocking triggers (touched
  // by the engine); void_chasm is an inert fall pit (reports 'void' → recovery);
  // ruin_obelisk is a solid that carries a lashing trap DoodadEffect.
  light_spot:       { overlap: 'trigger', spacing: 60 },
  void_chasm:       { overlap: 'inert', blocksMove: true, blocksShot: false, swallowsSolids: true, hazardGround: true },
  ruin_obelisk:     { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 46,
    surface: { hw: 0.7, hh: 0.42 } }, // the gem-set monolith's base
  descent_platform: { overlap: 'trigger', spacing: 40 },
  // Marine: kelp is walkable cover (decorative); coral + sea rocks are solids.
  kelp:     { overlap: 'ground', walkOnly: true },
  /** The kelp TREE (the thresher-forest anchor): a thin stipe underfoot —
   *  bodies weave between the stalks, shots sail through — while the frond
   *  crown above BREAKS SIGHT and occlusion-fades near the hero: the forest
   *  hides what stands in it, both ways, without ever walling you in. */
  giant_kelp: { overlap: 'solid', blocksMove: true, blocksShot: false, blocksSight: true,
    spacing: 26, occlude: { pad: 12, alpha: 0.28 }, bodyScale: 0.16, veil: {} },
  coral:    { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 30 },
  sea_rock: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 40, rockForm: { cluster: 0.3 } },
  // Mycelia fungal doodads. giant_mushroom/fruiting_tower are tree-like solids; spore_pod
  // is an active puffer (blocks move not shots, like lava_vent); glow_cap/mycelial_mat are
  // walkable ground overlays (decoration + the spore carpet).
  // Giant fungus stands on a STALK now (bodyScale, the walk-under-tree
  // mechanism): feet and arrows respect the stalk, eyes respect the cap —
  // fight in the spore-shade beneath the crown.
  giant_mushroom: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 42, occlude: { pad: 12, alpha: 0.3 }, bodyScale: 0.3, veil: {} },
  fruiting_tower: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 54, occlude: { pad: 12, alpha: 0.3 }, bodyScale: 0.26, veil: {} },
  spore_pod:      { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 38, forbidOn: ['water', 'lava', 'chasm', 'bog'] },
  glow_cap:       { overlap: 'ground' },
  mycelial_mat:   { overlap: 'ground', walkOnly: true },
  // Plan-structure furniture. A closed door blocks EVERYTHING; the derivations
  // below consult Doodad.door state, so opening/breaking it clears movement,
  // shots, and sight in one flip. A window passes shots + sight, never bodies.
  door:   { overlap: 'solid', blocksMove: true, blocksShot: true, blocksSight: true },
  window: { overlap: 'solid', blocksMove: true, blocksShot: false, blocksSight: false,
    surface: { hw: 0.7, hh: 0.28 } }, // the sill slab — flush with its wall run, no room-side bulge
  dock:   { overlap: 'trigger', spacing: 40 },
  breach: { overlap: 'trigger', spacing: 60 },
  // The Voyage's streamed coastline: the boat can't drive ashore, but a
  // shot arcs over the shallows (sight too — you can see the beach you round).
  landmass: { overlap: 'inert', blocksMove: true, blocksShot: false },
  isle_beacon: { overlap: 'trigger', spacing: 0 },
  // The rock grammar's kin: a cairn is low (step behind it, shoot over it),
  // scree is decoration underfoot, a spire is a full standing block.
  cairn:      { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 80, forbidOn: ['water', 'lava', 'chasm'] },
  scree:      { overlap: 'ground', walkOnly: true },
  rock_spire: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 60, forbidOn: ['water', 'lava', 'chasm'],
    rockForm: { spire: true } }, // spires always roll MONO — one snug honest column
  // Flora clarity: a berry bush is walkable cover exactly like brush; ferns
  // are pure understory decoration.
  berry_bush: { overlap: 'ground', spin: true },
  fern:       { overlap: 'ground', walkOnly: true, spin: true },
  // The fungal kit: shelves are low solids (step behind, shoot over);
  // toadstools are walkable fairy-ring decoration.
  shelf_fungus: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 36, forbidOn: ['water', 'lava', 'chasm'] },
  toadstool:    { overlap: 'ground', walkOnly: true },
  // The flesh kit: membranes + veins are walkable tissue (kept inside the
  // carved chambers); stalks, ribs and teeth are LOW solids — cover you can
  // shoot over, growing out of the meat.
  flesh_membrane: { overlap: 'ground', walkOnly: true },
  vein_cluster:   { overlap: 'ground', walkOnly: true },
  eye_stalk: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 46, forbidOn: ['water', 'lava', 'chasm'] },
  rib_arch:  { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 50, forbidOn: ['water', 'lava', 'chasm'] },
  // The tooth arc is an OFFSET C (gum ring 0.66r, outer stroke 0.82r) — a
  // centered rect can't hug it, so it keeps a disc snugged to the drawn arc.
  tooth_row: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 64, bodyScale: 0.85, forbidOn: ['water', 'lava', 'chasm'] },
  // The flesh country kit: blood/bile/tears pour like gore; clots, arteries,
  // polyps and eye-knots are LOW solids (shoot over the meat); knuckles and
  // the heart are full blocks. The sphincter's rule blocks everything — its
  // Doodad.door state is what opens the way (the derivations consult it).
  blood_pool:   { overlap: 'ground', walkOnly: true, pour: {} },
  clot_mound:   { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 40, forbidOn: ['water', 'lava', 'chasm'] },
  artery_stalk: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 56, forbidOn: ['water', 'lava', 'chasm'] },
  sphincter:    { overlap: 'solid', blocksMove: true, blocksShot: true, blocksSight: true },
  chyme_pool:   { overlap: 'ground', walkOnly: true, pour: {} },
  // The polyp rides the hazard-breakable grammar (gas_pod's sour cousin) —
  // pop it at range or wear the belch.
  gas_polyp:    { overlap: 'inert', spacing: 44,
    brittle: { on: ['hit', 'near'], reach: 34, text: 'the polyp belches!', color: '#a8b86a',
      fume: { radius: 72, linger: 3.0, dmgMult: 0.7, color: '#a8b86a' } } },
  villus_bed:   { overlap: 'ground', walkOnly: true },
  gut_knuckle:  { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 52, forbidOn: ['water', 'lava', 'chasm'] },
  // Burst the eyes and the wall stops watching: a SOLID brittle (the
  // crumbling_wall idiom) — the gaze lane's live filter drops it on pop.
  ocular_knot:  { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 46, forbidOn: ['water', 'lava', 'chasm'],
    brittle: { on: ['hit'], text: 'the eyes burst!', color: '#d8b04a' } },
  lash_bed:     { overlap: 'ground', walkOnly: true },
  weep_spring:  { overlap: 'ground', walkOnly: true, pour: {} },
  colossal_heart: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 80 },
  // The hell-steppes kit: fins are standing wall-pieces (full blocks — the
  // steppes' navigate-around skyline at doodad scale); stakes are thin (step
  // behind one, shoot past it); chains are floor dressing; fissures are small
  // blocking rents; the abyssal rent is the steppes' FALL pit — void_chasm's
  // hell twin (its stamp marks fall:true; the fall physics ride the recovery
  // machinery, not the kind).
  // The fin's rot only LEANS the drawn blade (sin·0.16), so its surface is
  // PINNED ('fixed'): the root ellipse it erupted through, not a spun slab.
  hell_fin:      { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 64, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    surface: { hw: 0.9, hh: 0.42, orient: 'fixed' } },
  impaler_stake: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 90, bodyScale: 0.4, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  hell_chain:    { overlap: 'ground', walkOnly: true },
  ember_fissure: { overlap: 'inert', blocksMove: true, blocksShot: false, spacing: 70, forbidOn: ['water', 'lava', 'chasm'] },
  abyssal_rent:  { overlap: 'inert', blocksMove: true, blocksShot: false, swallowsSolids: true, hazardGround: true },
  gate_stair:    { overlap: 'ground', walkOnly: true },
  // The ossuary kit: mounds are the bonefields' rolling skyline (step around,
  // shoot over); niches are the reliquary's shelf-walls (full blocks — rows of
  // them read as corridors); pits open where the overflow was tipped.
  bone_mound:    { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 90, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  ossuary_niche: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 30, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    // The shelf bar (reliquary rows lay these rot:'chain' — flat corridor
    // walls now, not scalloped circle-chains).
    surface: { hw: 0.95, hh: 0.46 } },
  charnel_pit:   { overlap: 'inert', blocksMove: true, blocksShot: false, spacing: 130, forbidOn: ['water', 'lava', 'chasm'] },
  // The leyline kit: conduits flow underfoot (pure ground glow — the chain
  // formations draw literal leylines); fonts break the surface as crystal;
  // the RESONANCE NODES carry each element's standing hazard as RULE DATA
  // (DoodadRule.effect) — the playstyle changer: pyre volleys, gale lances,
  // rime chill bands, stone grind. Every number is authorable per kind.
  ley_conduit: { overlap: 'ground', walkOnly: true },
  ley_font:    { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 84, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  pyre_node:   { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 190, forbidOn: ['water', 'lava', 'chasm'],
    effect: { id: 'lava_orb', skillId: 'magma_glob', interval: 3.6, radius: 330, chance: 0.5, power: 5 } },
  gale_node:   { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 190, forbidOn: ['water', 'lava', 'chasm'],
    effect: { id: 'crystal_beam', interval: 2.8, radius: 300, width: 15, chance: 0.55, power: 7 } },
  rime_node:   { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 190, forbidOn: ['lava', 'chasm'],
    effect: { id: 'heat_wash', element: 'cold', color: '#9fd8ff', interval: 1.2, radius: 110, chance: 0.5, power: 4 } },
  stone_node:  { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 190, forbidOn: ['water', 'lava', 'chasm'],
    effect: { id: 'heat_wash', element: 'physical', color: '#d8b06a', interval: 1.4, radius: 96, chance: 0.5, power: 5 } },
  // The abyss kit: cracks glow underfoot; spines reef into jagged cover.
  abyss_crack: { overlap: 'ground', walkOnly: true },
  abyss_spine: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 44, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  // The colosseum's seats: pure scenery on the stands (the recipe places them
  // over wall cells deliberately — the crowd sits WHERE you cannot walk).
  crowd_row: { overlap: 'ground' },
  // The river-of-flame kit: the forge-altar monument (a composition centerpiece,
  // huge spacing so two never crowd), gibbet cages that split when struck (the
  // strike-surface seam), banner poles you duck behind but shoot past, and
  // low bone-pyres. Every solid lists the full liquid forbidOn (the inverse
  // invariant genqa asserts).
  hellforge_anvil: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 200, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    // The forge painter draws UNSPUN (no rot read): slag plinth + iron block.
    surface: { hw: 1.05, hh: 0.6, orient: 'fixed' } },
  soul_cage:     { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 84, bodyScale: 0.4, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    brittle: { on: ['hit'], text: 'the cage splits — a soul slips free', color: '#9fd4ff', orbChance: 0.12 } },
  demon_banner:  { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 88, bodyScale: 0.35, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  pyre_heap:     { overlap: 'inert', blocksMove: true, blocksShot: false, spacing: 96, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  // The boundary-gate + durance kit: the arch is a walk-UNDER span (its stone
  // flies overhead — nothing on the ground blocks); pylons and idols are true
  // monuments; the rack is low furniture you shoot over.
  gate_arch:     { overlap: 'ground', walkOnly: true },
  gate_pylon:    { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 120, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    surface: { hw: 0.7, hh: 0.42 } }, // coursed monolith (the slab painter's base)
  // The toll-gate's timber kit (the Holdfast waypost — same policies as the
  // stone kit above: the arch is a walk-under span, the post a true solid).
  toll_arch:     { overlap: 'ground', walkOnly: true },
  toll_post:     { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 120, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    surface: { hw: 0.7, hh: 0.42 } }, // squared timber post (the slab painter's base)
  hate_brazier:  { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 40 },
  torture_rack:  { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 84, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    surface: { hw: 0.85, hh: 0.5 } }, // the rack bed + rollers — low dark furniture, not a pillar
  hate_idol:     { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 110, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    surface: { hw: 1.0, hh: 1.0 } }, // the statue plinth square (weathered_statue's twin)
  // The war-wound kit — the surface rift's ground scars: the rent is the
  // ember_fissure's hate-lit twin (a cut you walk AROUND, shots pass); the
  // glass is obsidian's (a solid you shelter behind).
  hate_rent:  { overlap: 'inert', blocksMove: true, blocksShot: false, spacing: 90, forbidOn: ['water', 'lava', 'chasm', 'gore'] },
  hate_glass: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 34, forbidOn: ['water', 'lava', 'chasm', 'gore'] },
  // The standing breach is a dimension gate (DimensionEntry.gateDoodad scans
  // it at load) — a trigger like every gate mouth, and only ever ONE (the
  // Sundering composition's centerpiece; the spacing makes two a non-event).
  hell_breach: { overlap: 'trigger', spacing: 500 },
  // The Aetherial kit — cloud furniture never blocks SHOTS (there is nothing
  // up here an arrow would argue with except marble), and the built things
  // refuse liquid ground out of habit even though the shelves carry none.
  cloud_billow:   { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 26, bodyScale: 0.85 },
  aether_crystal: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 60 },
  seraph_statue:  { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 120, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    surface: { hw: 0.65, hh: 0.65 } }, // the marble plinth square (±0.62r); wing tips stay walk-through
  harp_pillar:    { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 46, bodyScale: 0.9 },
  prayer_bell:    { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 70 },
  // The gate is a TRIGGER (the realm-gate dwell loop owns the interaction) —
  // bodies pass its threshold freely; the dwell ring is the door.
  ascendant_gate: { overlap: 'trigger', spacing: 400 },
  // The geyser mouth is a sidezone TRIGGER (data/sidezones.ts registers the
  // dwell); huge spacing — one spring is a landmark, two is a puddle field.
  sky_geyser:     { overlap: 'trigger', spacing: 500 },
  // The High Heavens kit: the spire is a TRUE monument (blocks shots — solid
  // marble tiers); the brazier is court furniture.
  spire_of_dawn:   { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 300, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  aureate_brazier: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 44 },
  // The Driftways kit: wind furniture — thin poles and light frames an arrow
  // sails past (nothing here blocks shots but the monument), spaced open so
  // the drift's own clouds stay the star.
  zephyr_totem:   { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 90, bodyScale: 0.8 },
  // The lantern is a LIGHT ON A STRING — its stake is no barrier: bodies
  // walk through freely (a dock post that scrapes riders off their raft is
  // a trap, not decor — the live-ride QA found exactly that).
  // TETHERED float: a lantern bobbing on its line may hang over the gaps off
  // a drift coast — the one dressing that's ALLOWED off the standing cloud.
  sky_lantern:    { overlap: 'ground', spacing: 56, voidOk: true },
  mist_font:      { overlap: 'solid', spacing: 120, blocksMove: true, blocksShot: false },
  skyglass_spur:  { overlap: 'solid', spacing: 72, blocksMove: true, blocksShot: false,
    brittle: { on: ['hit'], text: 'the skyglass sings apart!', color: '#cfe8f8' } },
  // THE SPEED PAD axis (status_wash): stand in the plume, walk quicker —
  // the whole pad/font/choke family is one DoodadRule.effect row per kind.
  // Spacing stays modest: the torn lattices are CRAMPED, and a spacing that
  // must clear every billow/pillar starves the roll to zero placements.
  updraft_vent:   { overlap: 'ground', spacing: 90,
    effect: { id: 'status_wash', statusId: 'windswept', interval: 0.8, radius: 46, chance: 1, power: 2.5 } },
  cloudwool_tuft: { overlap: 'ground', spacing: 36 },
  // THE WEATHERWORKS KIT — grounded weather for any land biome: a vapor
  // floor-pool, a brittle storm-crystal (surface-proc food anywhere), and
  // the haven-stone — the status_wash axis breathing the Cloudherd's own
  // cloudhaven, so the world teaches the vocabulary before any gem drops
  // (the found-not-taught doctrine).
  mist_pool:        { overlap: 'ground', spacing: 60 },
  stormglass_shard: { overlap: 'solid', spacing: 76, blocksMove: true, blocksShot: false,
    brittle: { on: ['hit'], text: 'the stormglass rings apart!', color: '#e8f0c8' } },
  haven_stone:      { overlap: 'solid', spacing: 150, blocksMove: true, blocksShot: false,
    effect: { id: 'status_wash', statusId: 'cloudhaven', interval: 0.8, radius: 52, chance: 1, power: 2.5 } },
  chime_stand:    { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 64, bodyScale: 0.85 },
  gale_vane:      { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 110, bodyScale: 0.7 },
  cloud_coral:    { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 34, bodyScale: 0.88 },
  spire_of_gales: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 300, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  // THE UNDERGROWTH KIT — the jungle's cut-your-own-path fabric. The plug and
  // the face-cut are DOORS MADE OF VEGETATION: they stand on walkable ground
  // (the doors-stay-ground doctrine — reachability, AI topology and ambient
  // spawns all see open trail), while bodies, arrows and EYES stop until
  // somebody cuts. brittle on:['hit'] = any damaging delivery pops them
  // (strikeSurfaces + projectile flight): the machete, the stray fireball,
  // and the monster crashing through after you all open the same way.
  jungle_brush: { overlap: 'solid', blocksMove: true, blocksShot: true, blocksSight: true, spacing: 30,
    forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    brittle: { on: ['hit'], orbChance: 0.1, text: 'you hack through!', color: '#4f7a2c',
      spawn: { monster: 'fern_stalker', count: [1, 1], chance: 0.07, text: 'the brush erupts!' } } },
  // The face-cut pays like a secret wall but HIDES like nothing — the tell is
  // the wall itself: cut the knot and the pop carves a pocket INTO the verdure.
  verdure_face: { overlap: 'solid', blocksMove: true, blocksShot: true, blocksSight: true, spacing: 40,
    brittle: { on: ['hit'], carve: 52, orbChance: 0.5, gemChance: 0.28,
      text: 'you carve into the green!', color: '#5f8a34' } },
  // The curtain: walk THROUGH it freely — but neither you nor they see past
  // it until crossed (occlude fades its strands for whoever stands under).
  liana_veil: { overlap: 'inert', blocksMove: false, blocksShot: false, blocksSight: true,
    spacing: 46, spin: true, occlude: { pad: 8, alpha: 0.3 } },
  canopy_colossus: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 90,
    occlude: { pad: 14, alpha: 0.25 }, bodyScale: 0.18, veil: {} },
  strangler_root: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 30,
    forbidOn: ['water', 'lava', 'chasm'] },
  jungle_bloom: { overlap: 'inert', spacing: 36 },
  // The sunken-ruin gate: a sidezone TRIGGER (data/sidezones.ts registers the
  // dwell + mint). The rest of the swallowed court dresses in the existing
  // fallen-colossus kit (colossus_head / broken_column / ruin_plinth).
  ruin_gate:     { overlap: 'trigger', spacing: 500 },
  // The undergrowth kit, wave 2. The fringe is pure walk-through dressing
  // (the wall's overhang — it OWNS no cells). The vine coil is one segment
  // of a larger organism (the vine_mass formation): bodies stop at it,
  // arrows snip it in passing, EYES cross it freely — you can see the way
  // through the mass; you just have to cut it. Elongated hit surface along
  // the chain so the blocked band matches the drawn bundle.
  verdure_fringe: { overlap: 'ground', walkOnly: true, spin: true },
  vine_coil: { overlap: 'solid', blocksMove: true, blocksShot: false, blocksSight: false,
    forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    surface: { hw: 1.3, hh: 0.6, orient: 'rot' },
    brittle: { on: ['hit'], orbChance: 0.12, text: 'the coil parts!', color: '#5f8a34' } },
};

/** Rules registered at runtime for NEW kinds (packages, structure legends, fx
 *  layers) — the open half of the vocabulary. Known kinds stay in the exhaustive
 *  table above so tsc still proves full coverage for the built-ins. */
const RUNTIME_RULES: Record<string, DoodadRule> = {};

/** Register a placement/collision rule for a NEW doodad kind (one row = the kind
 *  exists engine-wide; the renderer draws unknown kinds as a generic themed disc
 *  until given a bespoke branch). Warns on collision so two packages can't
 *  silently fight over one id. */
export function registerDoodadRule(kind: string, rule: DoodadRule): void {
  if ((DOODAD_RULES as Record<string, DoodadRule>)[kind] || RUNTIME_RULES[kind]) {
    console.warn(`[doodads] re-registering rule for '${kind}' — overriding`);
  }
  RUNTIME_RULES[kind] = rule;
  hazardGroundsCache = null; // a late hazard row must join the siting rules
}

/** The placement rule for a kind (a safe non-blocking ground default if unlisted). */
function doodadRule(kind: DoodadKind): DoodadRule {
  return (DOODAD_RULES as Record<string, DoodadRule>)[kind] ?? RUNTIME_RULES[kind] ?? { overlap: 'ground' };
}

/** Public accessor for consumers outside the generator (renderer occlusion,
 *  validators) — same resolution as the internal lookup. */
export function doodadRuleOf(kind: DoodadKind): DoodadRule { return doodadRule(kind); }

/** Does the kind have a REGISTERED rule (built-in or runtime)? Validators use
 *  this to catch typo'd legend/fx kinds, which would otherwise silently fall
 *  to the walkable 'ground' default and lose their blocking/hazard nature. */
export function hasDoodadRule(kind: string): boolean {
  return kind in DOODAD_RULES || kind in RUNTIME_RULES;
}

/** Every kind the rules registry knows (built-in + runtime-registered) — the
 *  content validator's coverage sweep walks this so no kind ever ships
 *  undressed without a loud boot line. */
export function doodadRuleKinds(): string[] {
  return [...Object.keys(DOODAD_RULES), ...Object.keys(RUNTIME_RULES)];
}

export function blocksMovement(d: Doodad): boolean {
  if (d.door?.open || d.door?.broken) return false; // an open doorway is a doorway
  return !!doodadRule(d.kind).blocksMove;
}
export function blocksProjectiles(d: Doodad): boolean {
  if (d.door?.open || d.door?.broken) return false;
  return !!doodadRule(d.kind).blocksShot;
}
/** Blocks AI line of sight — defaults to the shot rule so existing kinds are
 *  untouched; windows opt out (see through what you cannot walk through). */
export function blocksSightOf(d: Doodad): boolean {
  if (d.door?.open || d.door?.broken) return false;
  const r = doodadRule(d.kind);
  return r.blocksSight ?? !!r.blocksShot;
}

/** A solid doodad rejects placement overlapping other solids (but not ground). */
function isSolid(kind: DoodadKind): boolean { return doodadRule(kind).overlap === 'solid'; }

/** Should this kind be kept on WALKABLE ground in a grid zone? Solids/triggers
 *  always; ground/inert overlays only when they opt in via walkOnly. */
function walkGated(kind: DoodadKind): boolean {
  const rule = doodadRule(kind);
  return rule.walkOnly ?? (rule.overlap === 'solid' || rule.overlap === 'trigger');
}

/** GROUND REQUIRED: is this point over a VOID-LIKE region cell (!walkable &&
 *  !blocks — open sky, a chasm)? Placement rejects it for every kind whose
 *  rule doesn't opt out (DoodadRule.voidOk) — the walk gate keeps solids on
 *  WALKABLE ground, this keeps even non-walk-gated overlays from FLOATING
 *  over nothing. One methodology, every zone with a grid. */
function overVoid(ctx: GenCtx, x: number, y: number): boolean {
  const rk = ctx.walk?.regionAt ? regionKind(ctx.walk.regionAt(x, y)) : undefined;
  return !!rk && !rk.walkable && !rk.blocks;
}

/** Does this disc overlap any SOLID doodad placed BEFORE index `before`? Cluster
 *  stamps (grove, thicket) use this to keep their pieces out of pre-existing
 *  rocks/trees from earlier stamps, while still letting their OWN pieces pack
 *  tightly (those live at/after `before`, so they're excluded). */
function overlapsSolidBefore(ctx: GenCtx, p: Vec2, r: number, before: number): boolean {
  for (let i = 0; i < before; i++) {
    const d = ctx.doodads[i];
    if (isSolid(d.kind) && dist(p, d.pos) < r + d.radius) return true;
  }
  return false;
}

/** The generation scratch space a layout generator works in: the seeded rng, the
 *  arena box, the portals to keep clear, and the growing doodad/POI/etc. lists it
 *  appends to. Exported so a new layout family can be authored as a generator that
 *  uses the stamp toolbox (stampRavine, findSpot, …) just like the built-ins. */
/** A footprint later stamps route around: the legacy CIRCLE (camps, ruins, the
 *  classic placeStructure — kept verbatim so existing zones' findSpot accept/
 *  reject sequences never shift) or a true RECT (the plan-structure path, which
 *  stops the circle-slop smushing on big rectangular castles). */
export type Reservation =
  | { pos: Vec2; radius: number }
  | { rect: { x: number; y: number; w: number; h: number }; margin?: number };

export interface GenCtx {
  rng: Rng;
  arena: { w: number; h: number };
  /** The zone's monster level — landmark spawn tables shape by PRESENCE
   *  envelopes against it (deterministic: pure math on a pure table). */
  level?: number;
  entry: Vec2;
  exits: Vec2[];
  doodads: Doodad[];
  pois: Vec2[];
  camps: Vec2[];
  breakables: { id: string; pos: Vec2 }[];
  npcs: { id: string; pos: Vec2 }[];
  garrisons: { pos: Vec2; faction: string; size: [number, number] }[];
  caveSeeds: number[];
  /** Structure footprints (camps, ruins): later stamps route around them. */
  reserved: Reservation[];
  /** TRANSIENT: the running stamp's rule relaxations (set by stamp() around each
   *  handler call, read by clearOf/inReserved/findSpot) — how ONE spec opts out
   *  of individual placement gates without threading params through every stamp. */
  ruleOver?: StampRuleOverride;
  /** TRANSIENT: the running stamp's WHERE band (StampSpec.where compiled to a
   *  sampler + range by stamp(), read by findSpot after every legacy gate) —
   *  the strata lever, riding the exact ruleOver pattern: zero signature
   *  churn, zero rng impact on entries without a band. */
  fieldGate?: { sample: GenFieldSampler; min: number; max: number };
  /** The zone's layout seed (def.seed), for seed-stable gen FIELDS (noise
   *  bands must not drift between the try-loop's samples or across co-op). */
  seed?: number;
  /** LITE GENERATION (the understory's aerial): keep the recipe's own
   *  GEOMETRY (grids, liquids, recipe-planted forests) but skip everything
   *  a hazy 0.22-scale silhouette can't show — tileset scatter,
   *  compositions, landmark/structure rolls, boundary gates, exit roads.
   *  A below-zone that costs 200ms at full fidelity paints in a fraction;
   *  NEVER set on a zone that will actually be played. */
  lite?: boolean;
  /** The zone's baked geography (def.geo: biomeDepth + climate axes, sampled
   *  at mint) — read by geo-aware gen fields ('climate') and composition
   *  when-gates. Absent on authored/headless defs: consumers fall back to
   *  their neutral defaults, never draw rng from it. */
  geo?: ZoneDef['geo'];
  /** TRANSIENT: restrict findSpot's sample rect to a sub-area (a dungeon room
   *  being furnished, a composition site's surround). Draw COUNT is unchanged
   *  (2 range draws per try, same as the full arena) — unset = byte-identical
   *  sampling for every existing caller. */
  sampleRect?: { x: number; y: number; w: number; h: number };
  /** TRANSIENT: a pre-resolved anchor for the running stamp (composition
   *  SITES) — site-aware stamps (clearing/formation/cluster) use it as their
   *  center/origin instead of drawing a findSpot site, so several entries of
   *  one composition coordinate around a shared point. */
  siteAt?: Vec2;
  /** Plan structures raised so far (placeStructurePlan appends). */
  structures?: PlacedStructure[];
  /** WAKE HERE: the last spawn cell a plan structure declared (CellSpec.spawn)
   *  — passed through to GeneratedLayout.spawnAt. */
  spawnAt?: Vec2;
  /** The walk grid was LAZILY created by a plan structure in an otherwise-convex
   *  zone (ensureGrid) — the convex portal-clear splice must still run, because
   *  the scatter stamps that ran before the grid existed were never exit-aware. */
  gridEnsured?: boolean;
  /** Extra points the UNIVERSAL reachability invariant must connect to the
   *  entry (landmark anchors, objective set-pieces) — beyond the always-checked
   *  exits/POIs/camps/garrisons/door-aprons. */
  mustReach?: Vec2[];
  /** Deliberately FOOT-UNREACHABLE areas (Pillars-of-Arun jump/blink pockets):
   *  the reachability invariant SKIPS required points inside these — an
   *  unreachable pocket is the feature, not a defect. Spawning policy rides
   *  the landmark that declared the pocket. */
  pockets?: { x: number; y: number; r: number }[];
  /** Entities a landmark seeded (pit dwellers), resolved at gen — loadZone
   *  materializes them inside the memory-tagging window (base population). */
  landmarkSpawns?: { id: string; pos: Vec2 }[];
  /** A non-convex generator sets this; generateLayout passes it through to the
   *  returned GeneratedLayout.walk (the Phase-2 walkability seam). */
  walk?: WalkField;
  /** Air-pocket discs an underwater generator records, for the renderer's bubbles. */
  airPockets?: { x: number; y: number; r: number }[];
}

/** A whole-zone LAYOUT GENERATOR: given the prepared context (rng/arena/portals,
 *  with fixtures already stamped + reserved) it lays out the zone's terrain by
 *  appending doodads/pois/etc. to ctx. The classic stamp-scatter is the 'plains'
 *  generator; islands/maze/rooms register their own. Keep it seed-deterministic —
 *  it must reproduce identically across revisits, reloads, and co-op clients. */
export type LayoutGenerator = (ctx: GenCtx, def: ZoneDef) => void;

const LAYOUT_GENERATORS: Record<string, LayoutGenerator> = {};

/** Register a layout generator under an open-string id (default 'plains'). */
export function registerLayout(id: string, gen: LayoutGenerator): void {
  LAYOUT_GENERATORS[id] = gen;
}

/** Is a layout id registered? (Boot validation for biome allowedLayouts refs.) */
export function hasLayout(id: string): boolean {
  return id in LAYOUT_GENERATORS;
}

/** Every registered layout id (the generation-QA harness sweeps them all). */
export function layoutIds(): string[] {
  return Object.keys(LAYOUT_GENERATORS);
}

/** A layout-generator KNOB, resolved from the zone's merged layoutParams
 *  (spec ▷ tileset ▷ biome, baked at mint) — how ONE recipe serves a spiral
 *  cauldron, a winding road, and an open expanse without forking. */
export function layoutParam<T>(def: ZoneDef, key: string, dflt: T): T {
  const v = def.layoutParams?.[key];
  return v === undefined ? dflt : (v as T);
}

// --- GENERATION FIELDS -------------------------------------------------------
// Normalized scalar fields over the arena that WHERE bands sample (StampSpec.
// where) — the STRATA vocabulary: a layout entry belongs to the rim, the core,
// a noise patch, or the shore of whatever liquid an earlier entry poured.
// Open registry: a package's elevation/climate field joins with one call.

export type GenFieldSampler = (x: number, y: number) => number;
export type GenFieldFactory = (ctx: GenCtx, params: Record<string, unknown>) => GenFieldSampler;

const GEN_FIELDS: Record<string, GenFieldFactory> = {};

export function registerGenField(id: string, f: GenFieldFactory): void {
  if (GEN_FIELDS[id]) console.warn(`[genfields] re-registering field '${id}' — overriding`);
  GEN_FIELDS[id] = f;
}

export function hasGenField(id: string): boolean { return id in GEN_FIELDS; }

/** 0 at the arena center → EXACTLY 1 on the border, whatever the aspect
 *  ratio (rect-normalized max metric — the naive circular norm over-rejected
 *  the long axis of a wide arena and the corners of a square one, balding
 *  exactly the rims the band was written for): `{min: 0.6}` is a rim band,
 *  `{max: 0.45}` a core. */
registerGenField('radial', (ctx) => {
  const cx = ctx.arena.w / 2, cy = ctx.arena.h / 2;
  return (x, y) => Math.max(Math.abs(x - cx) / Math.max(1, cx), Math.abs(y - cy) / Math.max(1, cy));
});
/** 0 at the west edge → 1 at the east edge (an axis gradient). */
registerGenField('axisX', (ctx) => (x) => x / Math.max(1, ctx.arena.w));
/** 0 at the north edge → 1 at the south edge. */
registerGenField('axisY', (ctx) => (_x, y) => y / Math.max(1, ctx.arena.h));
/** Smooth seeded patch noise in 0..1 — drift stripes, moss patches. params:
 *  scale (world units per lattice cell, default 460), seed (mixed with the
 *  zone seed so two entries can carve DIFFERENT patchworks of one zone).
 *  Seedless zones (terrain reshuffles per visit) read ctx.seed 0 — their
 *  patch MACRO-placement repeats across visits while the scatter inside it
 *  reshuffles; accepted (never feeds rng, so no draw-order or co-op skew). */
registerGenField('noise', (ctx, params) => {
  const scale = typeof params.scale === 'number' ? params.scale : 460;
  const seed = ((ctx.seed ?? 0) ^ (typeof params.seed === 'number' ? params.seed : 0)) >>> 0;
  return (x, y) => valueNoise2(x, y, scale, seed);
});
/** 0 touching a liquid body of the listed kinds → 1 at `reach` or beyond —
 *  the shoreline field. Reads doodads placed by EARLIER entries (order
 *  matters: pour the lake, then band the reeds). params: kinds (default
 *  ['water']), reach (default 150). */
registerGenField('shore', (ctx, params) => {
  const kinds = Array.isArray(params.kinds) && params.kinds.length
    ? params.kinds as DoodadKind[] : ['water' as DoodadKind];
  const reach = typeof params.reach === 'number' ? Math.max(1, params.reach) : 150;
  // Snapshot the liquid set ONCE (the factory runs once per stamp): the
  // liquids this band measures were poured by EARLIER entries by contract,
  // and re-filtering all doodads per findSpot try was O(tries × zone).
  const liquids = ctx.doodads.filter(d => kinds.includes(d.kind));
  return (x, y) => {
    let best = reach;
    for (const d of liquids) {
      const dd = Math.hypot(x - d.pos.x, y - d.pos.y) - d.radius;
      if (dd < best) { best = dd; if (best <= 0) return 0; }
    }
    return Math.max(0, best) / reach;
  };
});
/** Coherent TERRAIN HEIGHT in 0..1 — octave-summed patch noise, optionally
 *  biased toward a central dome (+) or basin (−) so "high ground" can mean the
 *  zone's heart instead of a random ridge. Draw-free (samples never feed rng).
 *  params: scale (default 760), octaves (1-4, default 2), seed, dome (-1..1,
 *  default 0 — fraction of the range pushed toward/away from the center). */
registerGenField('elevation', (ctx, params) => {
  const scale = typeof params.scale === 'number' ? Math.max(60, params.scale) : 760;
  const octaves = Math.max(1, Math.min(4, typeof params.octaves === 'number' ? Math.round(params.octaves) : 2));
  const dome = typeof params.dome === 'number' ? Math.max(-1, Math.min(1, params.dome)) : 0;
  const seed = ((ctx.seed ?? 0) ^ (typeof params.seed === 'number' ? params.seed : 0) ^ 0xe1e7) >>> 0;
  const cx = ctx.arena.w / 2, cy = ctx.arena.h / 2;
  return (x, y) => {
    let v = 0, amp = 1, total = 0, sc = scale;
    for (let o = 0; o < octaves; o++) {
      v += valueNoise2(x, y, sc, (seed + o * 101) >>> 0) * amp;
      total += amp; amp *= 0.55; sc *= 0.5;
    }
    v /= total;
    if (dome) {
      const rim = Math.max(Math.abs(x - cx) / Math.max(1, cx), Math.abs(y - cy) / Math.max(1, cy));
      v += dome * (0.5 - rim);
    }
    return Math.max(0, Math.min(1, v));
  };
});
/** The world's CLIMATE at this spot — base value = the axis baked into the
 *  zone at mint (def.geo.climate, sampled from the world climate field), plus
 *  gentle local variation so a band feathers instead of snapping on/off. The
 *  SAME tileset row dresses differently across the map: reeds thicken where
 *  the world runs wet, ice teeth bare where it runs cold — emergent, zero
 *  bespoke wiring. Zones with no baked climate (authored/headless/directed
 *  mints without samplers) read `base` (default 0.5): bands written around
 *  the midpoint degrade to neutral, never to dead entries.
 *  params: axis (default 'temperature'), vary (local ± amplitude, default
 *  0.12), scale (default 900), seed, base (fallback when nothing is baked). */
registerGenField('climate', (ctx, params) => {
  const axis = typeof params.axis === 'string' ? params.axis : 'temperature';
  const fallback = typeof params.base === 'number' ? params.base : 0.5;
  const base = ctx.geo?.climate?.[axis] ?? fallback;
  const vary = typeof params.vary === 'number' ? Math.max(0, params.vary) : 0.12;
  const scale = typeof params.scale === 'number' ? Math.max(60, params.scale) : 900;
  let axisMix = 0;
  for (let i = 0; i < axis.length; i++) axisMix = (axisMix * 31 + axis.charCodeAt(i)) >>> 0;
  const seed = ((ctx.seed ?? 0) ^ (typeof params.seed === 'number' ? params.seed : 0) ^ axisMix) >>> 0;
  if (!vary) return () => Math.max(0, Math.min(1, base));
  return (x, y) => Math.max(0, Math.min(1, base + (valueNoise2(x, y, scale, seed) - 0.5) * 2 * vary));
});

/** PLAINS — the classic layout: walk the def.layout StampSpec[] and scatter each
 *  set-piece over the convex floor. This is the byte-identical default; extracting
 *  it changes nothing for any existing zone. */
function plainsLayout(ctx: GenCtx, def: ZoneDef): void {
  // LITE (the understory's aerial): tileset scatter is exactly the detail a
  // hazy silhouette can't show — recipes calling scatterDecoration and
  // plains-based zones both skip it here, one gate for both paths.
  if (ctx.lite) return;
  for (const spec of def.layout) {
    const n = ctx.rng.int(spec.count[0], spec.count[1]);
    for (let i = 0; i < n; i++) stamp(ctx, spec);
  }
}
registerLayout('plains', plainsLayout);

/** ISLANDS (the convex-compatible PROOF generator) — carve the convex floor into
 *  lobes with chasm INLETS (each bridged) and pool a sea of water + shallow shores
 *  between them, then lay the tileset's own decoration (palms/rocks/grass) on the
 *  land. The cuts are PARTIAL (stampRavine spans ~0.22-0.34 of the zone), so the
 *  floor stays ONE connected piece — you walk around an inlet's end or cross its
 *  bridge — which is why it needs no walkability model yet. The discrete
 *  islands-in-OPEN-sea + push-into-void-damage version is Phase 2 (it sets
 *  GeneratedLayout.walk). This proves registry + biome→layout + policy end-to-end. */
function islandsLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const span = Math.min(arena.w, arena.h);
  // Chasm inlets + bridges — 2-4 scaled by zone size (stampRavine self-limits near
  // portals + reserved fixtures and always bridges a long-enough cut).
  const cuts = 2 + (span > 1400 ? 1 : 0) + (rng.chance(0.5) ? 1 : 0);
  for (let i = 0; i < cuts; i++) stampRavine(ctx);
  // A shallow sea between the lobes: deep pools + wadeable shores (island feel,
  // still walkable — water only slows, per the convex model).
  const pools = rng.int(2, 4);
  for (let i = 0; i < pools; i++) stampBlob(ctx, 'water', [44, 80], [6, 12], false);
  const shores = rng.int(2, 3);
  for (let i = 0; i < shores; i++) stampShallows(ctx);
  // Then the tileset's authored decoration scatters on the land (data-driven).
  plainsLayout(ctx, def);
}
registerLayout('islands', islandsLayout);

/** DESCENT — the boundless abyss's STARTER patch (the engine streams more terrain
 *  around the player as they delve, see World.updateDescent). CONVEX (sets no walk
 *  field) so the boundless zone needs no walk-grid: claustrophobic rock pillars +
 *  glowing crystalline light spots (respite) + gaping void pits (fall) + a rare
 *  cursed obelisk (a lashing trap). Hazards are kept clear of the entry so the
 *  player never drops onto a pit. Seed-deterministic like every generator. */
function descentLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, entry } = ctx;
  const clearOfEntry = (p: Vec2, gap: number): boolean => dist(p, entry) >= gap;
  // Rock pillars — cover that boxes you in (the claustrophobia). Full size
  // gamut: stubby knuckles to the rare cavern-filling column.
  for (let i = 0; i < 16; i++) {
    const r = sizeRoll(rng, 26, 62);
    const p = findSpot(ctx, r, false, doodadRule('rock').spacing ?? 0, true, 'rock');
    if (p && clearOfEntry(p, 120)) ctx.doodads.push({ pos: p, radius: r, kind: 'rock', rot: rng.range(-0.4, 0.4) });
  }
  // Glowing crystalline clusters — light spots (brief respite). Some near the entry.
  for (let i = 0; i < 5; i++) {
    const r = rng.range(15, 24);
    const p = findSpot(ctx, r, false, doodadRule('light_spot').spacing ?? 0, true, 'light_spot');
    if (p) ctx.doodads.push({ pos: p, radius: r, kind: 'light_spot' });
  }
  // Gaping void pits — fall hazard (reuses the void RegionKind's recovery).
  for (let i = 0; i < 4; i++) {
    const r = rng.range(38, 80);
    const p = findSpot(ctx, r, false, 28, true, 'void_chasm');
    if (p && clearOfEntry(p, 240)) ctx.doodads.push({ pos: p, radius: r, kind: 'void_chasm', fall: true });
  }
  // A cursed obelisk or two — an ancient ruin that lashes nearby intruders.
  for (let i = 0; i < 2; i++) {
    const r = rng.range(20, 28);
    const p = findSpot(ctx, r, false, doodadRule('ruin_obelisk').spacing ?? 0, true, 'ruin_obelisk');
    if (p && clearOfEntry(p, 260)) {
      ctx.doodads.push({ pos: p, radius: r, kind: 'ruin_obelisk',
        effect: { id: 'descent_trap', interval: 2.6, radius: 130, chance: 0.85, power: 8 } });
    }
  }
}
registerLayout('descent', descentLayout);

/** BASTION — the zone IS a structure: one large plan structure (castle,
 *  fortress, labyrinth) raised at the arena center, the tileset's own
 *  decoration scattered around it. The candidate pool comes from the ZONE'S
 *  structure-roll DATA (def.structures entries whose defs carry a `bastion`
 *  weight) — never a literal id list, so a biome curates its own bastions
 *  (a chance of 0 marks a def as bastion-only, never scatter-rolled). */
function bastionLayout(ctx: GenCtx, def: ZoneDef): void {
  const pool = (def.structures ?? [])
    .map(r => STRUCTURES[r.structure])
    .filter((s): s is StructureDef => !!s && !!s.bastion && !!(s.plan || s.generator));
  if (!pool.length) {
    console.warn(`[structures] bastion layout on '${def.id}' with no bastion-capable structure rolls — plains fallback`);
    plainsLayout(ctx, def);
    return;
  }
  const total = pool.reduce((a, s) => a + s.bastion!.weight, 0);
  let roll = ctx.rng.range(0, total);
  let chosen = pool[pool.length - 1];
  for (const s of pool) { roll -= s.bastion!.weight; if (roll <= 0) { chosen = s; break; } }
  placeStructurePlan(ctx, chosen, vec(ctx.arena.w / 2, ctx.arena.h / 2));
  // The tileset's own decoration dresses the grounds around the bastion.
  plainsLayout(ctx, def);
}
registerLayout('bastion', bastionLayout);

/** An L-shaped corridor (horizontal then vertical) carved walkable into the grid. */
function tunnel(grid: GridWalkField, a: { cx: number; cy: number }, b: { cx: number; cy: number }, halfW: number): void {
  grid.carveCorridor(a.cx, a.cy, b.cx, a.cy, halfW);
  grid.carveCorridor(b.cx, a.cy, b.cx, b.cy, halfW);
}

/** A WINDING corridor carved walkable: marches a→b but bows sideways with a coherent
 *  curve plus organic jitter, so the passage SNAKES like a gut instead of the
 *  rectilinear L of tunnel(). Always finishes straight into b, so connectivity holds.
 *  (Works in WORLD coordinates — carveCorridor paints world-space cells.) */
function carveWander(grid: GridWalkField, a: Vec2, b: Vec2, halfW: number, rng: Rng): void {
  const total = Math.hypot(b.x - a.x, b.y - a.y);
  const segs = Math.max(2, Math.round(total / 110));
  const perp = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
  const bow = rng.range(-0.28, 0.28) * total; // one coherent sideways curve per tube
  let prev = a;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const off = Math.sin(t * Math.PI) * bow + rng.range(-14, 14); // bow envelope + jitter
    const x = a.x + (b.x - a.x) * t + Math.cos(perp) * off;
    const y = a.y + (b.y - a.y) * t + Math.sin(perp) * off;
    grid.carveCorridor(prev.x, prev.y, x, y, halfW);
    prev = vec(x, y);
  }
  grid.carveCorridor(prev.x, prev.y, b.x, b.y, halfW);
}

/** ROOMS+TUNNELS (the "maggot lair" — the Phase-2 NON-CONVEX proof). Paints a
 *  GridWalkField: rectangular rooms joined by corridors into ONE connected
 *  component, with a room+spur carved at the entry and every exit so portals
 *  always sit on reachable ground. The walkable region is now the EXCEPTION (not
 *  the whole box), so this is the first generator that genuinely needs the grid:
 *  clampPos confines actors to it, AI paths the corridors, spawns land only on it.
 *  Sets ctx.walk; the renderer paints the non-walkable cells as wall/void. */
function roomsLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  const M = 70;
  const rooms: { cx: number; cy: number }[] = [];
  const n = rng.int(5, 8);
  for (let i = 0; i < n; i++) {
    const rw = rng.range(240, 440), rh = rng.range(220, 380);
    const cx = rng.range(M + rw / 2, Math.max(M + rw / 2, arena.w - M - rw / 2));
    const cy = rng.range(M + rh / 2, Math.max(M + rh / 2, arena.h - M - rh / 2));
    grid.fillRect(cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2, true);
    rooms.push({ cx, cy });
  }
  // Every portal (entry + exits) gets a room + a spur from the exact portal point,
  // so the player and each exit are guaranteed on connected walkable ground.
  for (const pt of [ctx.entry, ...ctx.exits]) {
    const rw = 260, rh = 240;
    const cx = Math.min(Math.max(pt.x, M + rw / 2), arena.w - M - rw / 2);
    const cy = Math.min(Math.max(pt.y, M + rh / 2), arena.h - M - rh / 2);
    grid.fillRect(cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2, true);
    grid.carveCorridor(pt.x, pt.y, cx, cy, 44);
    rooms.push({ cx, cy });
  }
  // Chain every room (guarantees ONE connected component) + a few extra loops.
  for (let i = 1; i < rooms.length; i++) tunnel(grid, rooms[i - 1], rooms[i], 42);
  const extra = rng.int(2, 4);
  for (let i = 0; i < extra; i++) tunnel(grid, rng.pick(rooms), rng.pick(rooms), 38);
  ctx.walk = grid;
  // The tileset's authored clutter scatters INSIDE the carved rooms + corridors —
  // findSpot walk-gates solids/triggers onto walkable cells, same as flesh/mycelia/
  // underwater. (Rooms previously ran NO def.layout stamps at all, so highland
  // passes and rooms-rolled caves generated bare; unmade_vault stays the one
  // generator that skips decoration deliberately.)
  plainsLayout(ctx, def);
}
registerLayout('rooms', roomsLayout);

/** UNDERWATER (the deep-marine Phase-3 instance). The whole zone is DEEP WATER —
 *  walkable but you SWIM (slowed) and your BREATH drains; you must reach AIR POCKETS
 *  to refill. A few VOID TRENCHES are instant-fall hazards. Every portal opens onto
 *  an air pocket so you never spawn drowning. Proves the typed-region + survival +
 *  recovery instances at once; it's all RegionKind DATA the engine already drives. */
function underwaterLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  grid.fillRegion(0, 0, arena.w, arena.h, 'deep_water'); // the open sea
  ctx.airPockets = [];
  // CIRCULAR air pockets (fillDisc, not a square fillRegion) of VARIED sizes — recorded
  // so the renderer can draw a clean round wash + rising bubbles inside each.
  const air = (cx: number, cy: number, r: number): void => {
    grid.fillDisc(cx, cy, r, 'air_pocket');
    ctx.airPockets!.push({ x: cx, y: cy, r });
  };
  for (let i = 0, n = rng.int(5, 9); i < n; i++) {
    const r = rng.range(60, 180);
    air(rng.range(r + 40, arena.w - r - 40), rng.range(r + 40, arena.h - r - 40), r);
  }
  // Each portal surfaces in an air pocket (so you don't arrive drowning).
  for (const pt of [ctx.entry, ...ctx.exits]) air(pt.x, pt.y, 130);
  // Void trenches: instant-fall danger threading the sea. Carved AFTER the air
  // pockets, so a trench must never overlap one — else the renderer would still
  // draw a breathing bubble over what is secretly a fatal fall (a lie to the player).
  // The COUNT reads the zone's GEO context: deep inside the deepsea blob the
  // floor tears open (up to +3 trenches at full depth); a coastal fringe zone
  // keeps the gentle legacy roll. def.geo absent = legacy, byte-identical.
  const depthBonus = Math.round((def.geo?.biomeDepth ?? 0) * (layoutParam(def, 'trenchDepthBonus', 3) as number));
  for (let i = 0, n = rng.int(1, 3) + depthBonus; i < n; i++) {
    const tw = rng.range(54, 110), th = rng.range(180, 360);
    const cx = rng.range(tw, arena.w - tw), cy = rng.range(th, arena.h - th);
    if (Math.hypot(cx - ctx.entry.x, cy - ctx.entry.y) < 260) continue; // never on the entry
    // skip if the trench rect overlaps any air pocket disc (AABB-vs-circle bound)
    if (ctx.airPockets!.some(a => Math.abs(cx - a.x) < tw / 2 + a.r && Math.abs(cy - a.y) < th / 2 + a.r)) continue;
    grid.fillRegion(cx - tw / 2, cy - th / 2, cx + tw / 2, cy + th / 2, 'void');
  }
  ctx.walk = grid;
  // Run the tileset's authored decoration (kelp/coral/sea_rock) — findSpot walk-gates
  // solids onto the walkable seabed. (Underwater previously stamped NOTHING from the
  // tileset layout; this makes the sea doodads actually appear.)
  plainsLayout(ctx, def);
}
registerLayout('underwater', underwaterLayout);

/** UNMADE VAULT — the Unmade boss arena (a GridWalkField zone so World.updateBoss
 *  can repaint regions LIVE: a plains zone has walk=null and every reshape silently
 *  no-ops). An inset rectangular vault FLOOR ringed by an abyssal 'void' margin the
 *  boss shoves you toward (weaponized edge; fall-recovery, not instant death). The
 *  centre dais is pois[0] — the boss anchor. Entry + every exit get a carved ground
 *  stem + a corridor to the dais so portals never strand you in the void and the
 *  floor is one connected piece. The flood/meteor/cage/void-crack hazards are all
 *  painted at runtime by updateBoss; the layout just lays the stage. */
function unmadeVaultLayout(ctx: GenCtx, def: ZoneDef): void {
  const { arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  const cx = arena.w / 2, cy = arena.h / 2;
  const margin = 70; // the abyssal void border the boss knocks you into
  grid.fillRegion(0, 0, arena.w, arena.h, 'void');                 // the surrounding abyss
  grid.fillRegion(margin, margin, arena.w - margin, arena.h - margin, 'ground'); // the vault floor
  // Portals must never sit in the void: carve a ground stem at each + a corridor
  // back to the dais, so entry/exits are always reachable on one connected island.
  grid.fillDisc(ctx.entry.x, ctx.entry.y, 110, 'ground');
  grid.carveCorridor(ctx.entry.x, ctx.entry.y, cx, cy, 80);
  for (const ex of ctx.exits) {
    grid.fillDisc(ex.x, ex.y, 110, 'ground');
    grid.carveCorridor(ex.x, ex.y, cx, cy, 70);
  }
  ctx.walk = grid;
  ctx.airPockets = [];           // updateBoss fills these during the flood phase
  ctx.pois.unshift(vec(cx, cy)); // the dais / boss anchor is pois[0]
  // NO tileset/biome doodads: a SPECIAL arena is a clean stage (the fight's flood/
  // cracks/meteors are the only "terrain"). Deliberately skips plainsLayout(def).
}
registerLayout('unmade_vault', unmadeVaultLayout);

/** The flesh recipe's TRACT dial (layoutParams.fleshTract): instead of scattered
 *  chambers, ONE serpentine gut runs entry → exit — bulb chambers strung on a
 *  swallowing corridor, with SPHINCTER doors seated in the straight throat cut
 *  at each bulb's mouth (dwell near one and it dilates open; the flesh admits
 *  you chamber by chamber). All bands are [lo, hi] rolls per zone. */
interface FleshTractSpec {
  /** Interior bulb chambers strung between the portal ends (default [4, 6]). */
  segments?: [number, number];
  /** Bulb chamber radius band (default [110, 170]). */
  bulbR?: [number, number];
  /** Tract tube carve HALF-width band (default [40, 60]). */
  tubeW?: [number, number];
  /** Chance each bulb mouth grows a sphincter door (default 0.85; 0 = none). */
  doorChance?: number;
  /** Dwell-to-dilate seconds for the sphincters (default 0.45). */
  doorDwell?: number;
  /** Straight throat length cut at each bulb mouth so the door sits in a true
   *  corridor, not a wander's elbow (default 44). */
  stub?: number;
}

/** The flesh recipe's RING dial (layoutParams.fleshRing): a socketed AMPHITHEATER —
 *  one hub chamber ringed by satellite sockets, radial tubes + a circumferential
 *  loop, and `knots` ocular_knot doodads hugging each chamber's carved rim (the
 *  walls themselves watching). */
interface FleshRingSpec {
  /** Satellite chamber count band (default [5, 7]). */
  satellites?: [number, number];
  /** Hub chamber radius band (default [220, 280]). */
  hubR?: [number, number];
  /** Satellite chamber radius band (default [110, 160]). */
  satR?: [number, number];
  /** Wall-hugging ocular_knot count per chamber (default [2, 4]; 0,0 = none). */
  knots?: [number, number];
}

/** Serpentine spine: bulbs strung entry → exit with alternating lateral throw,
 *  joined by straight throat stubs (door seats) + winding tube runs between. */
function carveFleshTract(ctx: GenCtx, grid: GridWalkField, chambers: Vec2[], spec: FleshTractSpec, M: number): void {
  const { rng, arena } = ctx;
  const segBand = spec.segments ?? [4, 6];
  const bulbBand = spec.bulbR ?? [110, 170];
  const tubeBand = spec.tubeW ?? [40, 60];
  const doorChance = spec.doorChance ?? 0.85;
  const doorDwell = spec.doorDwell ?? 0.45;
  const stub = spec.stub ?? 44;
  const clampPt = (p: Vec2, r: number): Vec2 => vec(
    Math.min(Math.max(p.x, M + r), arena.w - M - r),
    Math.min(Math.max(p.y, M + r), arena.h - M - r));
  const a = clampPt(ctx.entry, 130);
  const b = clampPt(ctx.exits[0] ?? vec(arena.w - M - 130, arena.h / 2), 130);
  const perp = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
  const throwAmp = Math.min(arena.w, arena.h) * 0.24;
  const segs = rng.int(segBand[0], segBand[1]);
  const pts: Vec2[] = [a];
  const radii: number[] = [130];
  for (let i = 1; i <= segs; i++) {
    const t = i / (segs + 1);
    const r = rng.range(bulbBand[0], bulbBand[1]);
    const amp = throwAmp * rng.range(0.55, 1) * (i % 2 === 0 ? 1 : -1);
    pts.push(clampPt(vec(
      a.x + (b.x - a.x) * t + Math.cos(perp) * amp,
      a.y + (b.y - a.y) * t + Math.sin(perp) * amp), r));
    radii.push(r);
  }
  pts.push(b); radii.push(130);
  let doorN = 0;
  for (let i = 0; i < pts.length; i++) grid.fillDisc(pts[i].x, pts[i].y, radii[i], 'flesh');
  for (let i = 0; i + 1 < pts.length; i++) {
    const p = pts[i], q = pts[i + 1];
    const dir = Math.atan2(q.y - p.y, q.x - p.x);
    const dx = Math.cos(dir), dy = Math.sin(dir);
    const halfW = rng.range(tubeBand[0], tubeBand[1]);
    // Bulbs carved too close for honest throats: one wander, no door.
    if (Math.hypot(q.x - p.x, q.y - p.y) < radii[i] + radii[i + 1] + stub * 2 + 40) {
      carveWander(grid, p, q, halfW, rng);
      continue;
    }
    // Straight throats out of each bulb (the door seats), wander between them.
    const mouthP = vec(p.x + dx * (radii[i] + stub), p.y + dy * (radii[i] + stub));
    const mouthQ = vec(q.x - dx * (radii[i + 1] + stub), q.y - dy * (radii[i + 1] + stub));
    grid.carveCorridor(p.x, p.y, mouthP.x, mouthP.y, halfW);
    carveWander(grid, mouthP, mouthQ, halfW, rng);
    grid.carveCorridor(mouthQ.x, mouthQ.y, q.x, q.y, halfW);
    // The sphincter waits in the straight throat entering the NEXT bulb.
    if (rng.chance(doorChance)) {
      const seat = vec(q.x - dx * (radii[i + 1] + stub * 0.5), q.y - dy * (radii[i + 1] + stub * 0.5));
      ctx.doodads.push({
        pos: seat, radius: halfW + 8, kind: 'sphincter', dir,
        door: { id: `flesh-tract/d${doorN++}`, mode: 'dwell', dwell: doorDwell },
      });
    }
  }
  chambers.push(...pts);
}

/** Socketed amphitheater: hub + satellite ring + radial and circumferential
 *  tubes, rims studded with watching ocular_knot doodads. */
function carveFleshRing(ctx: GenCtx, grid: GridWalkField, chambers: Vec2[], spec: FleshRingSpec, M: number): void {
  const { rng, arena } = ctx;
  const hubR = rng.range((spec.hubR ?? [220, 280])[0], (spec.hubR ?? [220, 280])[1]);
  const satBand = spec.satellites ?? [5, 7];
  const satRBand = spec.satR ?? [110, 160];
  const knotBand = spec.knots ?? [2, 4];
  const cx = arena.w / 2, cy = arena.h / 2;
  const hub = vec(cx, cy);
  grid.fillDisc(cx, cy, hubR, 'flesh');
  chambers.push(hub);
  const rimKnots = (center: Vec2, r: number): void => {
    const k = rng.int(knotBand[0], knotBand[1]);
    if (k <= 0) return;
    const a0 = rng.range(0, Math.PI * 2);
    for (let i = 0; i < k; i++) {
      const a = a0 + (i / k) * Math.PI * 2 + rng.range(-0.3, 0.3);
      ctx.doodads.push({
        pos: vec(center.x + Math.cos(a) * (r - 28), center.y + Math.sin(a) * (r - 28)),
        radius: rng.range(13, 20), kind: 'ocular_knot', dir: a + Math.PI,
      });
    }
  };
  rimKnots(hub, hubR);
  const n = rng.int(satBand[0], satBand[1]);
  // Sockets orbit between the hub's rim and the arena edge (never inside either).
  const minOrbit = hubR + satRBand[1] + 60;
  const orbitX = Math.max(minOrbit, arena.w / 2 - M - satRBand[1] - 20);
  const orbitY = Math.max(minOrbit, arena.h / 2 - M - satRBand[1] - 20);
  const sats: Vec2[] = [];
  const b0 = rng.range(0, Math.PI * 2);
  for (let i = 0; i < n; i++) {
    const a = b0 + (i / n) * Math.PI * 2 + rng.range(-0.18, 0.18);
    const r = rng.range(satRBand[0], satRBand[1]);
    const p = vec(
      Math.min(Math.max(cx + Math.cos(a) * orbitX, M + r), arena.w - M - r),
      Math.min(Math.max(cy + Math.sin(a) * orbitY, M + r), arena.h - M - r));
    grid.fillDisc(p.x, p.y, r, 'flesh');
    carveWander(grid, hub, p, rng.range(34, 48), rng); // radial socket tube
    rimKnots(p, r);
    sats.push(p);
    chambers.push(p);
  }
  // The circumferential gallery: every socket sees its neighbors.
  for (let i = 0; i < sats.length; i++) carveWander(grid, sats[i], sats[(i + 1) % sats.length], rng.range(30, 42), rng);
}

/** FLESH (the "writhing pulsing flesh" biome) — a CIRCLE-based, organic topology:
 *  rounded chambers (fillDisc) joined by tubes, vs the rooms generator's rectangles.
 *  The chambers are a pulsing 'flesh' region (visual throb); tubes are plain floor.
 *  Entry + every exit get a chamber + a tube so portals sit on connected ground.
 *  ONE recipe, dialed per face (the dunefield pattern): the scattered-warren
 *  default reads its bands from layoutParams (absent = the classic literals,
 *  draw-for-draw identical), `fleshTract` swaps in the serpentine gut, and
 *  `fleshRing` swaps in the socketed amphitheater. */
function fleshLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  // The whole zone starts as solid FLESH WALL; chambers + winding tubes are CARVED
  // out of it — so the negative space reads as living tissue ("Belly of the Beast"),
  // not black void. (flesh_wall is non-walkable like a wall, but renders fleshy.)
  grid.fillRegion(0, 0, arena.w, arena.h, 'flesh_wall');
  const M = 90;
  const chambers: Vec2[] = [];
  const tract = layoutParam<FleshTractSpec | undefined>(def, 'fleshTract', undefined);
  const ring = layoutParam<FleshRingSpec | undefined>(def, 'fleshRing', undefined);
  if (tract) carveFleshTract(ctx, grid, chambers, tract, M);
  else if (ring) carveFleshRing(ctx, grid, chambers, ring, M);
  else {
    const nBand = layoutParam<[number, number]>(def, 'fleshChambers', [5, 8]);
    const rBand = layoutParam<[number, number]>(def, 'fleshChamberR', [120, 220]);
    const n = rng.int(nBand[0], nBand[1]);
    for (let i = 0; i < n; i++) {
      const r = rng.range(rBand[0], rBand[1]);
      const cx = rng.range(M + r, Math.max(M + r, arena.w - M - r));
      const cy = rng.range(M + r, Math.max(M + r, arena.h - M - r));
      grid.fillDisc(cx, cy, r, 'flesh');
      chambers.push(vec(cx, cy));
    }
  }
  const beforePortals = chambers.length;
  for (const pt of [ctx.entry, ...ctx.exits]) {
    const cx = Math.min(Math.max(pt.x, M + 130), arena.w - M - 130);
    const cy = Math.min(Math.max(pt.y, M + 130), arena.h - M - 130);
    grid.fillDisc(cx, cy, 130, 'flesh');
    carveWander(grid, vec(pt.x, pt.y), vec(cx, cy), 46, rng); // winding tube to the portal
    chambers.push(vec(cx, cy));
  }
  if (tract || ring) {
    // Structured modes join themselves; only lash each portal chamber onto the
    // nearest structural chamber so side exits still reach the body proper.
    for (let i = beforePortals; i < chambers.length; i++) {
      let best = chambers[0], bd = Infinity;
      for (let j = 0; j < beforePortals; j++) {
        const d = Math.hypot(chambers[j].x - chambers[i].x, chambers[j].y - chambers[i].y);
        if (d < bd) { bd = d; best = chambers[j]; }
      }
      if (bd > 1) carveWander(grid, chambers[i], best, rng.range(34, 48), rng);
    }
  } else {
    // Join chambers with WINDING tubes (one connected component) + a few extra loops.
    const tubeBand = layoutParam<[number, number]>(def, 'fleshTubeW', [34, 50]);
    const loopBand = layoutParam<[number, number]>(def, 'fleshLoops', [2, 4]);
    for (let i = 1; i < chambers.length; i++) carveWander(grid, chambers[i - 1], chambers[i], rng.range(tubeBand[0], tubeBand[1]), rng);
    const extra = rng.int(loopBand[0], loopBand[1]);
    for (let i = 0; i < extra; i++) carveWander(grid, rng.pick(chambers), rng.pick(chambers), rng.range(Math.max(24, tubeBand[0] - 2), Math.max(26, tubeBand[1] - 6)), rng);
  }
  ctx.walk = grid;
  // Themed organic clutter scatters INSIDE the carved chambers — findSpot walk-gates
  // flesh_pod/bone/gore onto walkable cells, so nothing embeds in the flesh walls.
  plainsLayout(ctx, def);
}
registerLayout('flesh', fleshLayout);

/** MYCELIA — a carved fungal GROTTO. Bulbous chambers + winding hyphal tubes are cut
 *  from solid FUNGAL WALL (the negative space reads as dense living mycelium, not void);
 *  the carved floor is plain walkable ground (the tileset paints it violet), into which
 *  the fungal clutter (caps / pods / glow-caps / mats) scatters walk-gated. Mirrors flesh. */
function myceliaLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  grid.fillRegion(0, 0, arena.w, arena.h, 'fungal_wall');
  const M = 90;
  const chambers: Vec2[] = [];
  const n = rng.int(5, 8);
  for (let i = 0; i < n; i++) {
    const r = rng.range(130, 230);
    const cx = rng.range(M + r, Math.max(M + r, arena.w - M - r));
    const cy = rng.range(M + r, Math.max(M + r, arena.h - M - r));
    grid.fillDisc(cx, cy, r, 'ground');
    chambers.push(vec(cx, cy));
  }
  for (const pt of [ctx.entry, ...ctx.exits]) {
    const cx = Math.min(Math.max(pt.x, M + 130), arena.w - M - 130);
    const cy = Math.min(Math.max(pt.y, M + 130), arena.h - M - 130);
    grid.fillDisc(cx, cy, 130, 'ground');
    carveWander(grid, vec(pt.x, pt.y), vec(cx, cy), 48, rng); // winding hyphal tube to the portal
    chambers.push(vec(cx, cy));
  }
  for (let i = 1; i < chambers.length; i++) carveWander(grid, chambers[i - 1], chambers[i], rng.range(36, 52), rng);
  const extra = rng.int(2, 4);
  for (let i = 0; i < extra; i++) carveWander(grid, rng.pick(chambers), rng.pick(chambers), rng.range(34, 46), rng);
  ctx.walk = grid;
  plainsLayout(ctx, def);
}
registerLayout('mycelia', myceliaLayout);

/** The thicket family's DIALS — one bag of defaults per registered FACE.
 *  Every dial stays layoutParams-overridable per zone/tileset/biome (the
 *  layoutParam calls below pass these as the fallback); the two faces
 *  registered underneath differ ONLY in this bag:
 *    'thicket' — the THROAT: narrow tightening lanes, plugs everywhere,
 *                dens behind them (claustrophobia as terrain).
 *    'gallery' — the CATHEDRAL: wide lanes and tall light, colossus
 *                pillars, vine masses slung across the way, few plugs —
 *                the awe face that makes the dense face feel denser. */
interface ThicketDials {
  heart: [number, number]; glades: [number, number]; gladeR: [number, number];
  trailW: [number, number]; coreTighten: number;
  plugChance: number; plugCoreBonus: number; plugSpacing: number;
  dens: [number, number]; faceCuts: [number, number];
  fringeChance: number; fringeSpacing: number;
  vineMasses: [number, number]; pillars: [number, number];
}
const THICKET_DIALS: ThicketDials = {
  heart: [110, 150], glades: [6, 9], gladeR: [70, 130],
  trailW: [26, 40], coreTighten: 0.6,
  plugChance: 0.42, plugCoreBonus: 0.34, plugSpacing: 150,
  dens: [2, 4], faceCuts: [1, 3],
  fringeChance: 0.14, fringeSpacing: 58,
  vineMasses: [0, 1], pillars: [0, 0],
};
const GALLERY_DIALS: ThicketDials = {
  heart: [150, 190], glades: [4, 6], gladeR: [110, 170],
  trailW: [48, 66], coreTighten: 0.85,
  plugChance: 0.2, plugCoreBonus: 0.12, plugSpacing: 200,
  dens: [1, 2], faceCuts: [1, 2],
  fringeChance: 0.1, fringeSpacing: 66,
  vineMasses: [2, 3], pillars: [2, 4],
};

/** THE THICKET FAMILY (the jungle) — claustrophobia as terrain. The whole
 *  zone is one living VERDURE mass (a step/shot/SIGHT-blocking wall region,
 *  foliage-baked so it reads as packed vegetation) carved into a web of game
 *  trails and glades; the deeper toward the heart, the tighter the lanes and
 *  the denser the growth (every lever keys off the same rect-normalized
 *  radial the WHERE field uses). What makes it a JUNGLE and not a maze: the
 *  walls are CUTTABLE — brush PLUGS choke trail throats (doors made of
 *  vegetation: the cells stay ground, so reachability, AI topology and
 *  ambient spawns read open trail while bodies/arrows/eyes stop until
 *  somebody cuts), pocket DENS hide behind plugged throats carved off the
 *  lanes, verdure FACE-CUTS pay whoever hacks into the mass itself, VINE
 *  MASSES lie across the way (cut any segment; the organism keeps its form),
 *  and a frond FRINGE overhangs every lane so the wall's silhouette is
 *  growth, not geometry. All knobs are layoutParams; the dial bag picks the
 *  registered face's defaults. */
function thicketCore(ctx: GenCtx, def: ZoneDef, d: ThicketDials): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  const wallKind = layoutParam<string>(def, 'thicketWall', 'verdure');
  grid.fillRegion(0, 0, arena.w, arena.h, wallKind);
  const cx = arena.w / 2, cy = arena.h / 2;
  // 0 at the heart → 1 on the border (matches the 'radial' gen field).
  const rad = (x: number, y: number): number =>
    Math.max(Math.abs(x - cx) / Math.max(1, cx), Math.abs(y - cy) / Math.max(1, cy));
  const tightenAt = layoutParam<number>(def, 'thicketCoreTighten', d.coreTighten);
  const tighten = (x: number, y: number): number => tightenAt + (1 - tightenAt) * rad(x, y);
  const M = 90;

  // 1. THE HEART — the deepest glade, dead center: the zone's one wide room
  // (ruin courts, POIs and the worst of the packs pool here by walk-gating).
  const heartBand = layoutParam<[number, number]>(def, 'thicketHeart', d.heart);
  const heartR = rng.range(heartBand[0], heartBand[1]);
  grid.fillDisc(cx, cy, heartR, 'ground');
  const chambers: Vec2[] = [vec(cx, cy)];

  // 2. GLADES — pocket clearings scattered through the mass, SMALLER the
  // deeper they sit (the rim breathes; the interior presses in).
  const gladeBand = layoutParam<[number, number]>(def, 'thicketGlades', d.glades);
  const gladeR = layoutParam<[number, number]>(def, 'thicketGladeR', d.gladeR);
  const glades = rng.int(gladeBand[0], gladeBand[1]);
  for (let i = 0; i < glades; i++) {
    const r0 = rng.range(gladeR[0], gladeR[1]);
    const gx = rng.range(M + r0, Math.max(M + r0, arena.w - M - r0));
    const gy = rng.range(M + r0, Math.max(M + r0, arena.h - M - r0));
    const r = r0 * (0.55 + 0.45 * rad(gx, gy));
    grid.fillDisc(gx, gy, r, 'ground');
    chambers.push(vec(gx, gy));
  }

  // 2b. RESERVED GROUND becomes GLADE: a composition's pre-clearing (or any
  // earlier circle reservation) was a PROMISE of open ground — a convex zone
  // keeps scatter out of it, but in a carved layout the verdure itself must
  // honor it, or the ruin court the composition planned would sit ENTOMBED
  // in solid wall and every site-pinned piece would fail its walk gate.
  // Realize each as a carved glade and let the trail web pick it up.
  for (const r of ctx.reserved) {
    if (!('pos' in r) || !('radius' in r)) continue; // rects are structures' business
    grid.fillDisc(r.pos.x, r.pos.y, r.radius + 12, 'ground');
    chambers.push(vec(r.pos.x, r.pos.y));
  }

  // 3. PORTAL MOUTHS + THE TRAIL WEB — every portal gets a small clearing and
  // a winding tube in; the chamber chain + loops make the lane web. Trail
  // width TIGHTENS toward the heart (the claustrophobia gradient).
  const trailBand = layoutParam<[number, number]>(def, 'thicketTrailW', d.trailW);
  const wander = (a: Vec2, b: Vec2): void => {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const halfW = Math.max(20, rng.range(trailBand[0], trailBand[1]) * tighten(mx, my));
    carveWander(grid, a, b, halfW, rng);
  };
  for (const pt of [ctx.entry, ...ctx.exits]) {
    const px = Math.min(Math.max(pt.x, M + 100), arena.w - M - 100);
    const py = Math.min(Math.max(pt.y, M + 100), arena.h - M - 100);
    grid.fillDisc(px, py, 100, 'ground');
    wander(vec(pt.x, pt.y), vec(px, py));
    chambers.push(vec(px, py));
  }
  for (let i = 1; i < chambers.length; i++) wander(chambers[i - 1], chambers[i]);
  const loopBand = layoutParam<[number, number]>(def, 'thicketLoops', [2, 4]);
  const loops = rng.int(loopBand[0], loopBand[1]);
  for (let i = 0; i < loops; i++) wander(rng.pick(chambers), rng.pick(chambers));
  // The heart is never a dead end: two extra spokes guarantee ways THROUGH.
  for (let i = 0; i < 2; i++) wander(chambers[0], rng.pick(chambers));
  ctx.walk = grid;

  // 4. BRUSH PLUGS — cuttable vegetation doors on narrow trail throats
  // (walkable corridor cells walled across one axis). Denser toward the
  // heart; never near a portal; spaced so lanes breathe between cuts.
  const cs = 30;
  const plugChance = layoutParam<number>(def, 'thicketPlugChance', d.plugChance);
  const plugCore = layoutParam<number>(def, 'thicketPlugCoreBonus', d.plugCoreBonus);
  const plugSpacing = layoutParam<number>(def, 'thicketPlugSpacing', d.plugSpacing);
  const walk = (x: number, y: number): boolean => grid.isWalkable(x, y);
  const plugs: Vec2[] = [];
  const trailCells: Vec2[] = [];
  for (let y = cs * 3; y < arena.h - cs * 3; y += cs) {
    for (let x = cs * 3; x < arena.w - cs * 3; x += cs) {
      if (!walk(x, y)) continue;
      trailCells.push(vec(x, y));
      // A throat = the lane runs along ONE axis while the wall presses in
      // within TWO cells on both perpendicular sides (trails are 2-3 cells
      // wide — demanding wall at exactly one cell found almost nothing).
      const walledY = (!walk(x, y - cs) || !walk(x, y - 2 * cs)) && (!walk(x, y + cs) || !walk(x, y + 2 * cs));
      const walledX = (!walk(x - cs, y) || !walk(x - 2 * cs, y)) && (!walk(x + cs, y) || !walk(x + 2 * cs, y));
      const throatX = walk(x - cs, y) && walk(x + cs, y) && walledY;
      const throatY = walk(x, y - cs) && walk(x, y + cs) && walledX;
      if (!throatX && !throatY) continue;
      const p = vec(x, y);
      if (dist(p, ctx.entry) < 300 || ctx.exits.some(e => dist(p, e) < 190)) continue;
      if (inReserved(ctx, p, 26)) continue;
      if (plugs.some(q => dist(p, q) < plugSpacing)) continue;
      if (!rng.chance(Math.min(0.92, plugChance + plugCore * (1 - rad(x, y))))) continue;
      plugs.push(p);
      ctx.doodads.push({ pos: p, radius: rng.range(26, 34), kind: 'jungle_brush', rot: rng.range(0, Math.PI * 2) });
    }
  }

  // 5. POCKET DENS — small chambers carved INTO the mass off a trail, joined
  // by one plugged throat: the packs that wait, the caches that pay.
  const denBand = layoutParam<[number, number]>(def, 'thicketDens', d.dens);
  const denR = layoutParam<[number, number]>(def, 'thicketDenR', [55, 85]);
  const dens = rng.int(denBand[0], denBand[1]);
  let made = 0;
  for (let t = 0; t < dens * 14 && made < dens; t++) {
    const at = trailCells.length ? trailCells[rng.int(0, trailCells.length - 1)] : null;
    if (!at) break;
    const dir = rng.pick([vec(1, 0), vec(-1, 0), vec(0, 1), vec(0, -1)]);
    const r = rng.range(denR[0], denR[1]);
    const c = vec(at.x + dir.x * (r + 52), at.y + dir.y * (r + 52));
    if (c.x < M + r || c.y < M + r || c.x > arena.w - M - r || c.y > arena.h - M - r) continue;
    if (dist(c, ctx.entry) < 320 || ctx.exits.some(e => dist(c, e) < 260)) continue;
    // The den must be cut from SOLID growth (a den punched into another lane
    // is just a lane) — probe the disc's cross before carving.
    if (walk(c.x, c.y) || walk(c.x + r * 0.7, c.y) || walk(c.x - r * 0.7, c.y)
      || walk(c.x, c.y + r * 0.7) || walk(c.x, c.y - r * 0.7)) continue;
    grid.fillDisc(c.x, c.y, r, 'ground');
    grid.carveCorridor(at.x, at.y, c.x, c.y, 22);
    const throat = vec((at.x + c.x) / 2, (at.y + c.y) / 2);
    ctx.doodads.push({ pos: throat, radius: 26, kind: 'jungle_brush', rot: rng.range(0, Math.PI * 2) });
    ctx.doodads.push({ pos: vec(c.x + rng.range(-14, 14), c.y + rng.range(-14, 14)), radius: rng.range(10, 14), kind: 'clay_pots' });
    made++;
  }

  // 6. FACE-CUTS — brush-knotted spots on the verdure itself that pay whoever
  // carves in (the secret wall's jungle twin, hidden in plain sight).
  const cutBand = layoutParam<[number, number]>(def, 'thicketFaceCuts', d.faceCuts);
  const cuts = rng.int(cutBand[0], cutBand[1]);
  for (let i = 0; i < cuts; i++) stamp(ctx, { kind: 'verdure_face', count: [1, 1] });

  // 7. THE FRINGE — broad fronds overhanging the lanes from the wall faces,
  // so the carved corridor's silhouette is GROWTH, not geometry. Each sits
  // on a lane cell hugging its wall, rot = the outward normal (the average
  // of every open direction away from adjacent wall). Pure dressing: the
  // kind owns no cells and blocks nothing.
  const fringeChance = layoutParam<number>(def, 'thicketFringeChance', d.fringeChance);
  const fringeSpacing = layoutParam<number>(def, 'thicketFringeSpacing', d.fringeSpacing);
  const fringes: Vec2[] = [];
  for (let y = cs * 2; y < arena.h - cs * 2; y += cs) {
    for (let x = cs * 2; x < arena.w - cs * 2; x += cs) {
      if (!walk(x, y)) continue;
      let nx = 0, ny = 0;
      if (!walk(x - cs, y)) nx += 1;
      if (!walk(x + cs, y)) nx -= 1;
      if (!walk(x, y - cs)) ny += 1;
      if (!walk(x, y + cs)) ny -= 1;
      if (nx === 0 && ny === 0) continue; // no wall touches this cell
      if (!rng.chance(fringeChance)) continue;
      const p = vec(x - nx * 9, y - ny * 9); // hug the wall it grows from
      if (dist(p, ctx.entry) < 160 || ctx.exits.some(e => dist(p, e) < 140)) continue;
      if (fringes.some(q => dist(p, q) < fringeSpacing)) continue;
      fringes.push(p);
      ctx.doodads.push({
        pos: p, radius: rng.range(13, 19), kind: 'verdure_fringe',
        rot: Math.atan2(ny, nx),
      });
    }
  }

  // 8. VINE MASSES + PILLARS — the gallery's slung organisms and colossus
  // columns (the throat rolls few of either; the dial bag decides, the
  // params can override). Solids land before the tileset scatter so
  // everything later routes around them. The mass IGNORES the walk gate on
  // purpose: it drapes OVER the verdure and across the lanes in one body —
  // the wall-riding segments are the form it keeps, the lane-crossing
  // segments are the cuts you make (brittle-on-hit counts OPEN to the
  // navigability belt, so nothing seals).
  const vmBand = layoutParam<[number, number]>(def, 'thicketVineMasses', d.vineMasses);
  const vms = rng.int(vmBand[0], vmBand[1]);
  for (let i = 0; i < vms; i++) {
    stamp(ctx, { kind: 'formation', formation: 'vine_mass', count: [1, 1], rules: { ignore: ['walk'] } });
  }
  const pillarBand = layoutParam<[number, number]>(def, 'thicketPillars', d.pillars);
  const pillars = rng.int(pillarBand[0], pillarBand[1]);
  for (let i = 0; i < pillars; i++) stamp(ctx, { kind: 'canopy_colossus', count: [1, 1] });

  // 9. THE GAME TRAIL — beaten earth traced along the entry→heart lane (pure
  // pathStep follow: draw-free, deterministic), so the way IN reads walked.
  let cur = vec(ctx.entry.x, ctx.entry.y);
  for (let step = 0; step < 320; step++) {
    const nxt = grid.pathStep(cur, chambers[0]);
    if (!nxt) break;
    if (step % 2 === 0) ctx.doodads.push({ pos: vec(nxt.x, nxt.y), radius: 20, kind: 'road' });
    if (dist(nxt, chambers[0]) < 40) break;
    cur = nxt;
  }

  // The tileset's own scatter walk-gates into the lanes/glades/dens.
  plainsLayout(ctx, def);
}
registerLayout('thicket', (ctx, def) => thicketCore(ctx, def, THICKET_DIALS));
registerLayout('gallery', (ctx, def) => thicketCore(ctx, def, GALLERY_DIALS));

/** Integer clamp helper for area-scaled flora counts. */
function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Inscribed-ellipse test (the FIELD generator's fallback silhouette when a zone has
 *  no def.field — a directed mint onto Field ground that never went through fieldifyZone). */
function ellipseHas(arena: { w: number; h: number }, px: number, py: number): boolean {
  const rx = arena.w / 2, ry = arena.h / 2;
  const nx = (px - rx) / rx, ny = (py - ry) / ry;
  return nx * nx + ny * ny <= 1;
}

/** A tight clump of grass tufts around an anchor — the meadow's dappled texture. */
function stampGrassClump(ctx: GenCtx, center: Vec2, onBlob: (p: Vec2, r: number) => boolean): void {
  const n = ctx.rng.int(4, 8);
  for (let i = 0; i < n; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2), off = ctx.rng.range(0, 52);
    const r = ctx.rng.range(14, 32);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (onBlob(p, r)) ctx.doodads.push({ pos: p, radius: r, kind: 'grass' });
  }
}

/** A tight cluster of rocks with MUD coalescing in a ring AROUND them (the user's
 *  "mud especially near the rock clusters"). Rocks pack among themselves (overlapsSolidBefore)
 *  but avoid earlier solids; the mud is a soft ground overlay lapping their skirt. */
function stampRockMudCluster(ctx: GenCtx, center: Vec2, onBlob: (p: Vec2, r: number) => boolean): void {
  const before = ctx.doodads.length;
  const rocks = ctx.rng.int(3, 6);
  for (let i = 0; i < rocks; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2), off = ctx.rng.range(8, 46);
    const r = sizeRoll(ctx.rng, 16, 34);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!onBlob(p, r) || overlapsSolidBefore(ctx, p, r, before)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'rock', rot: ctx.rng.range(-0.4, 0.4) });
  }
  const muds = ctx.rng.int(5, 9);
  for (let i = 0; i < muds; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2), off = ctx.rng.range(40, 92);
    const r = ctx.rng.range(20, 38);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (onBlob(p, r)) ctx.doodads.push({ pos: p, radius: r, kind: 'mud' });
  }
}

/** FIELD — the open grassland EXPANSE, shaped to the contiguous Field heat-map blob.
 *  Rasterizes def.field (the region→pixel map) by re-sampling biomeAt per grid cell:
 *  Field cells become walkable 'ground' (the grass floor), everything else a non-
 *  walkable 'tallgrass' hedge — so the zone's SILHOUETTE IS the heat map. Entry + every
 *  exit get a carved grass stem onto the blob (a portal never strands in the hedge).
 *  Flora: dense grass clumps, tight rock clusters with mud coalescing around them, and
 *  a little brush — NO trees / water / void. A wide, walkable expedition expanse. */
function fieldLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  grid.fillRegion(0, 0, arena.w, arena.h, 'tallgrass'); // the off-blob hedge boundary
  const f = def.field;
  const cell = grid.cell, cols = grid.cols, rows = grid.rows;
  const inBlob = (px: number, py: number): boolean =>
    f ? isFieldPixel(f, px, py) : ellipseHas(arena, px, py);
  // Rasterize the blob as walkable 'ground' (per-row runs keep the fillRegion count
  // down), collecting Field-cell centres as flora + portal-stem anchors.
  const anchors: Vec2[] = [];
  for (let cy = 0; cy < rows; cy++) {
    let run = -1;
    for (let cx = 0; cx <= cols; cx++) {
      const here = cx < cols && inBlob((cx + 0.5) * cell, (cy + 0.5) * cell);
      if (here) { if (run < 0) run = cx; anchors.push(vec((cx + 0.5) * cell, (cy + 0.5) * cell)); }
      // fillRegion is cell-INCLUSIVE on both ends, so paint exactly the run's field cells
      // [run..cx-1] on THIS row (cx is the first non-field col) — no +1 down-right bleed.
      else if (run >= 0) { grid.fillRegion(run * cell, cy * cell, (cx - 1) * cell, cy * cell, 'ground'); run = -1; }
    }
  }
  ctx.walk = grid;
  // Every portal sits on connected ground: carve a clearing + a corridor to the nearest
  // blob cell (a path in from the expanse's edge).
  const nearestAnchor = (p: Vec2): Vec2 => {
    let best = p, bd = Infinity;
    for (const a of anchors) { const d = dist(p, a); if (d < bd) { bd = d; best = a; } }
    return best;
  };
  for (const pt of [ctx.entry, ...ctx.exits]) {
    grid.fillDisc(pt.x, pt.y, 120, 'ground');
    if (anchors.length) { const a = nearestAnchor(pt); grid.carveCorridor(pt.x, pt.y, a.x, a.y, 54); }
  }
  // CONNECTIVITY GUARANTEE: the blob is ONE component in node-space and its features are
  // many cells wide at this scale, so 30px rasterization can't normally fragment it — but
  // as belt-and-suspenders, any exit not reachable from the entry gets a direct carved road
  // across the meadow (reachable() uses the grid's connected components), so a portal can
  // NEVER strand the player behind the hedge. Each carve invalidates the region cache.
  for (const pt of ctx.exits) {
    if (!grid.reachable(ctx.entry, pt)) grid.carveCorridor(ctx.entry.x, ctx.entry.y, pt.x, pt.y, 54);
  }
  if (!anchors.length) return; // degenerate (no blob sampled) — the carved clearings stand alone

  // THE SOFT BOUNDARY: the 30px raster leaves the hedge line as right-angle
  // staircase — so walk the FINAL boundary (after every portal clearing and
  // connectivity carve) and lay overlapping hedgerow mounds straddling each
  // ground↔tallgrass face, jittered off the grid beat. Blended tuft blobs
  // round the corners off; the physical boundary stays the grid's.
  for (let cy = 1; cy < rows - 1; cy++) {
    for (let cx = 1; cx < cols - 1; cx++) {
      const px = (cx + 0.5) * cell, py = (cy + 0.5) * cell;
      if (grid.regionAt(px, py) !== 'ground') continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (grid.regionAt(px + dx * cell, py + dy * cell) !== 'tallgrass') continue;
        if (rng.chance(0.22)) continue; // the odd gap keeps it a hedge, not a fence
        const jx = (rng.range(0, 1) - 0.5) * cell * 0.8;
        const jy = (rng.range(0, 1) - 0.5) * cell * 0.8;
        ctx.doodads.push({
          pos: vec(px + dx * cell * 0.55 + jx, py + dy * cell * 0.55 + jy),
          radius: rng.range(22, 36), kind: 'hedgerow',
        });
        break; // one mound per boundary cell is plenty — neighbours overlap it
      }
    }
  }

  // Flora — area-scaled by the blob's cell count, all kept on walkable ground.
  const area = anchors.length;
  const pick = (): Vec2 => rng.pick(anchors);
  const onBlob = (p: Vec2, r: number): boolean =>
    grid.isWalkable(p.x, p.y) && dist(p, ctx.entry) > ENTRY_CLEAR
    && !ctx.exits.some(e => dist(p, e) < EXIT_CLEAR * 0.6) && !inReserved(ctx, p, r);
  for (let i = 0, n = clampInt(area / 12, 10, 70); i < n; i++) stampGrassClump(ctx, pick(), onBlob);
  for (let i = 0, n = clampInt(area / 46, 4, 26); i < n; i++) stampRockMudCluster(ctx, pick(), onBlob);
  for (let i = 0, n = clampInt(area / 70, 2, 16); i < n; i++) {
    const c = pick(), r = rng.range(24, 42);
    if (onBlob(c, r)) ctx.doodads.push({ pos: c, radius: r, kind: 'brush', rot: rng.range(0, Math.PI * 2) });
  }
}
registerLayout('field', fieldLayout);

/** A crystal shard: solid, and it periodically fires a laser beam (the crystal_beam
 *  doodad-effect) in a random direction — the constant-movement "dance" hazard. */
function stampCrystal(ctx: GenCtx): void {
  const r = ctx.rng.range(20, 34);
  const p = findSpot(ctx, r, true, doodadRule('crystal').spacing ?? 0, true, 'crystal');
  if (p) ctx.doodads.push({
    pos: p, radius: r, kind: 'crystal', rot: ctx.rng.range(0, Math.PI * 2),
    effect: { id: 'crystal_beam', interval: 2.6, cd: ctx.rng.range(0, 2.6), radius: 560, width: 16, chance: 0.7, power: 4 },
  });
}

/** A lava vent: a molten fissure that periodically ERUPTS — launching a VOLLEY of
 *  lava orbs in a ring around its OWN epicenter (the lava_orb doodad-effect, now
 *  count/ringRadius/stagger-driven), like a volcano firing off the vent. */
function stampLavaVent(ctx: GenCtx): void {
  const r = ctx.rng.range(26, 44);
  const p = findSpot(ctx, r, true, doodadRule('lava_vent').spacing ?? 0, true, 'lava_vent');
  if (p) ctx.doodads.push({
    pos: p, radius: r, kind: 'lava_vent', rot: ctx.rng.range(0, Math.PI * 2),
    effect: { id: 'lava_orb', interval: 4.4, cd: ctx.rng.range(0, 4.4), radius: 150,
      count: 6, ringRadius: 150, jitter: 38, stagger: 0.12, blast: 82, chance: 0.7, power: 0 },
  });
}

/** A spore-pod: a bulbous fungal sac that periodically PUFFS a lingering spore cloud
 *  (the spore_puff doodad-effect — a gentle poison cloud, area-denial not a damage volley). */
function stampSporePod(ctx: GenCtx): void {
  const r = ctx.rng.range(18, 30);
  const p = findSpot(ctx, r, true, doodadRule('spore_pod').spacing ?? 0, true, 'spore_pod');
  if (p) ctx.doodads.push({
    pos: p, radius: r, kind: 'spore_pod', rot: ctx.rng.range(0, Math.PI * 2),
    effect: { id: 'spore_puff', interval: 5.0, cd: ctx.rng.range(0, 5.0), radius: 95,
      count: 1, ringRadius: 0, jitter: 0, stagger: 0, blast: 0, chance: 0.6, power: 0 },
  });
}

/** A SMALL ember vent: a lesser cousin of the lava vent that coughs up a SINGLE orb
 *  (count 1) close by — peppering the ground between full eruptions. Same effect
 *  handler, different data: the volley framework scales from one orb to a crown. */
function stampEmberVent(ctx: GenCtx): void {
  const r = ctx.rng.range(14, 24);
  const p = findSpot(ctx, r, true, doodadRule('ember_vent').spacing ?? 0, true, 'ember_vent');
  if (p) ctx.doodads.push({
    pos: p, radius: r, kind: 'ember_vent', rot: ctx.rng.range(0, Math.PI * 2),
    effect: { id: 'lava_orb', interval: 3.4, cd: ctx.rng.range(0, 3.4), radius: 64,
      count: 1, ringRadius: 56, jitter: 28, stagger: 0, blast: 60, chance: 0.55, power: 0 },
  });
}

/** Is this disc free of the given doodad kinds? (Site suitability.) */
/** No doodad of the listed kinds within reach — the forbidOn ground test
 *  (exported for composables that direct-push dressing: they honor the same
 *  ground gates the scatter does, or genqa's inverse invariant flags them). */
export function areaFreeOf(ctx: GenCtx, p: Vec2, radius: number, kinds: DoodadKind[]): boolean {
  return !ctx.doodads.some(d =>
    kinds.includes(d.kind) && dist(p, d.pos) < radius + d.radius);
}

/** Is this point inside a reserved structure footprint? Handles both the legacy
 *  circles and the plan-structure rects; honors a stamp's 'reserved' relaxation
 *  (which thereby covers EVERY caller — findSpot, blobs, cliffs, ravines). */
function inReserved(ctx: GenCtx, p: Vec2, radius: number): boolean {
  if (ruleIgnored(ctx, 'reserved')) return false;
  return ctx.reserved.some(r => {
    if ('rect' in r) {
      const m = (r.margin ?? 0) + radius;
      return p.x > r.rect.x - m && p.x < r.rect.x + r.rect.w + m
          && p.y > r.rect.y - m && p.y < r.rect.y + r.rect.h + m;
    }
    return dist(p, r.pos) < r.radius + radius;
  });
}

const ENTRY_CLEAR = 220;
const EXIT_CLEAR = 150;
const BORDER = 50;
/** Radius (around each entry/exit) that a CONVEX layout's blocking doodads are
 *  cleared from post-generation, so a scattered solid never walls off a portal. */
const EXIT_CLEAR_CARVE = 95;

/** The BOUNDARY-GATE builder (layoutRecipes registers carveBoundaryGate at
 *  import — the setRouteGuard idiom, so this core never imports a recipe).
 *  generateLayout raises it at every exit whose def.exitBoundaries entry
 *  names a treatment (data/boundaryGates.ts); null (boot order, bare tests)
 *  = plain portals, nothing lost. */
type BoundaryGateBuilder = (ctx: GenCtx, at: Vec2, gateId: string) => void;
let boundaryGateBuilder: BoundaryGateBuilder | null = null;
export function setBoundaryGateBuilder(b: BoundaryGateBuilder): void { boundaryGateBuilder = b; }

/** The EXIT-ROAD builder (layoutRecipes registers carveApproachRoad at
 *  import — the boundary-gate idiom, so this core never imports a recipe).
 *  generateLayout lays a traveled way for every exit whose def.exitRoads
 *  entry carries a spec (a TRANSIENT per-load annotation the World stamps
 *  beside exitBoundaries); null (boot order, bare tests) = plain ground,
 *  nothing lost. */
type ExitRoadBuilder = (ctx: GenCtx, def: ZoneDef, exitIndex: number, spec: ExitRoadSpec) => void;
let exitRoadBuilder: ExitRoadBuilder | null = null;
export function setExitRoadBuilder(b: ExitRoadBuilder): void { exitRoadBuilder = b; }

/** The BIOME-MELD builder (layoutRecipes registers buildBiomeMeld at import —
 *  the boundary-gate idiom, so this core never imports a recipe or the meld
 *  registry). generateLayout grows a band of the NEIGHBOR biome's kit along
 *  every exit edge whose def.exitMelds entry names a meld (a TRANSIENT
 *  per-load annotation the World stamps beside exitBoundaries); null (boot
 *  order, bare tests) = plain edges, nothing lost. */
type MeldBuilder = (ctx: GenCtx, def: ZoneDef, exitIndex: number, meldId: string) => void;
let meldBuilder: MeldBuilder | null = null;
export function setMeldBuilder(b: MeldBuilder): void { meldBuilder = b; }

/** Generate a zone's terrain from its layout spec. */
export function generateLayout(
  def: ZoneDef, arena: { w: number; h: number },
  rng: Rng, entry: Vec2, exits: Vec2[],
  // EXTRA fixtures a live system injects for THIS load only (crusade works
  // matching the tier held at entry) — same pipeline as authored fixtures
  // (plan walls carve the grid, doors/slots/breakables live, footprints
  // reserve), never mutating the def. Omitted everywhere else = byte-identical.
  extraFixtures?: { structure: string; x: number; y: number }[],
  // LITE (GenCtx.lite): the understory's aerial pass — geometry only.
  opts?: { lite?: boolean },
): GeneratedLayout {
  const ctx: GenCtx = {
    rng, arena, entry, exits, level: def.level, seed: def.seed, geo: def.geo,
    doodads: [], pois: [], camps: [], breakables: [], npcs: [],
    garrisons: [], caveSeeds: [], reserved: [],
    lite: opts?.lite,
  };
  const allFixtures = [...(def.fixtures ?? []), ...(extraFixtures ?? [])];
  // LEGACY FIXTURES first (common to EVERY layout): hand-placed structures at
  // exact zone coordinates (the town's smithy stands where the town says it
  // stands). They reserve their footprints, so whatever layout generator runs
  // flows around them.
  for (const f of allFixtures) {
    const s = STRUCTURES[f.structure];
    if (s && !s.plan && !s.generator) placeStructure(ctx, s, vec(f.x, f.y));
  }
  // COMPOSITION PLANS (whole-zone planning): the zone's picked bundles resolve
  // their shared sites and stamp their PRE entries before the base layout, so
  // the negative space they promise suppresses the scatter that follows. Zones
  // without composition rolls draw nothing here (byte-identical). LITE skips
  // planning wholesale (an aerial can't see a gallows court through the haze).
  const compositions = ctx.lite ? [] : planCompositions(ctx, def);
  // Dispatch to the zone's layout generator (default 'plains' = byte-identical).
  const gen = LAYOUT_GENERATORS[def.layoutType ?? 'plains'] ?? plainsLayout;
  gen(ctx, def);
  // BOUNDARY GATES: exits crossing an ENCLAVE biome's boundary wear its
  // monumental gate (data/boundaryGates.ts) — raised for EVERY layout family.
  // The annotation rides the def (stamped per-load by the World off the same
  // heat-map prediction the portal labels use). After the base layout so the
  // façade carves into the final terrain; before landmark/structure rolls so
  // they honor its reservation. Zones without annotations draw nothing.
  if (boundaryGateBuilder && def.exitBoundaries && !ctx.lite) {
    for (let i = 0; i < ctx.exits.length && i < def.exitBoundaries.length; i++) {
      const b = def.exitBoundaries[i];
      if (b) boundaryGateBuilder(ctx, ctx.exits[i], b);
    }
  }
  // EXIT ROADS: exits annotated with a TRAVELED-WAY spec (def.exitRoads —
  // stamped per-load beside exitBoundaries; the Holdfast's kept gravel road
  // is the first rider) get a worn way carved from a source portal to their
  // mouth. After the gates, so a road can END at a façade's throat instead
  // of under its walls; before the landmark/structure rolls, so they honor
  // its artery reservation. Zones without annotations draw nothing.
  if (exitRoadBuilder && def.exitRoads && !ctx.lite) {
    for (let i = 0; i < ctx.exits.length && i < def.exitRoads.length; i++) {
      const r = def.exitRoads[i];
      if (r) exitRoadBuilder(ctx, def, i, r);
    }
  }
  // BIOME MELDS: exits facing a DIFFERENT biome wear that neighbor's edge
  // dressing (def.exitMelds — stamped per-load beside exitBoundaries off the
  // same heat-map prediction seam): a band of the foreign kit growing along
  // this zone's edge, so "there really is a jungle past that treeline" reads
  // in the TERRAIN before the crossing. After gates + roads (the growth
  // dresses around them); before landmarks/structures/fuse (pours and
  // reservations act on it like any other scatter). Zones without
  // annotations draw nothing — and the builder itself draws from a
  // DEDICATED rng, so annotation presence never shifts this stream.
  if (meldBuilder && def.exitMelds && !ctx.lite) {
    for (let i = 0; i < ctx.exits.length && i < def.exitMelds.length; i++) {
      const m = def.exitMelds[i];
      if (m) meldBuilder(ctx, def, i, m);
    }
  }
  // PLAN fixtures raise AFTER the layout: a grid generator REPLACES ctx.walk,
  // which would wipe a plan fixture's painted walls into ghost geometry (roofs
  // over open rock, unenforced ramparts) if it painted first. Placing here, the
  // fixture carves into whatever grid the layout built (or ensures one).
  for (const f of allFixtures) {
    const s = STRUCTURES[f.structure];
    if (s && (s.plan || s.generator)) placeStructurePlan(ctx, s, vec(f.x, f.y));
  }
  // LANDMARK ROLLS first (they're TERRAIN — the ground-before-solids
  // convention: a structure sites around a lake, never under it), then
  // STRUCTURE ROLLS — both the zone's data-declared chances (merged from
  // tileset + biome at mint, or authored on the def). Rolled HERE, after the
  // layout dispatch, so they are layout-agnostic (a field zone and a plains
  // zone roll alike) and draw rng only when the data exists (byte-identity
  // for every zone without rolls).
  for (const roll of ctx.lite ? [] : def.landmarks ?? []) {
    if (!ctx.rng.chance(roll.chance)) continue;
    const n = roll.count ? ctx.rng.int(roll.count[0], roll.count[1]) : 1;
    for (let i = 0; i < n; i++) stamp(ctx, { kind: 'landmark', landmark: roll.landmark, count: [1, 1] });
  }
  for (const roll of ctx.lite ? [] : def.structures ?? []) {
    if (!ctx.rng.chance(roll.chance)) continue;
    const n = roll.count ? ctx.rng.int(roll.count[0], roll.count[1]) : 1;
    for (let i = 0; i < n; i++) stamp(ctx, { kind: 'structure', structure: roll.structure, count: [1, 1] });
  }
  // COMPOSITION POST entries: after the base layout + landmark/structure rolls
  // so their shore bands measure EVERY liquid (authored and landmark-poured)
  // and their pieces route around every reservation. Before the fuse/splice/
  // reachability tail — the finalizers act on the complete geometry.
  runCompositionPost(ctx, compositions);
  // THE FUSE: near-touching poured ground bodies (same kind + flags) merge
  // into one contiguous body — the parity pass over every placement system
  // (stamps, landmarks, clusters, fx layers). Draw-free; runs before the
  // portal splice + reachability guards so they act on the final geometry.
  fuseGroundBodies(ctx);
  // FORBIDON WINS, GLOBALLY: findSpot gates a solid against the ground that
  // EXISTS when it stamps — but landmarks, cluster pieces, melds and post
  // compositions keep pouring ground afterwards (an oasis under a scattered
  // fulgurite). One order-independent inverse pass at the end: any solid
  // overlapping a ground doodad its rule forbids is spliced — terrain wins,
  // whoever poured it, whenever. Bucketed so a big zone stays O(n).
  sweepForbiddenGround(ctx);
  // REACHABILITY GUARD: a CONVEX layout (no walk grid) scatters its solids without
  // exit awareness, so a rock / cliff / wall can land ON a portal and wall it off —
  // the player then can't reach the exit (seen on crusade-minted + wall-heavy zones).
  // Walk-grid layouts already carve a ground disc at every exit; the convex
  // equivalent is to CLEAR blocking doodads from a disc around each entry/exit, so
  // every portal stays reachable. (No-op for grid layouts — they set ctx.walk —
  // EXCEPT when the grid was lazily ensured by a plan structure: the scatter that
  // ran before it existed was never exit-aware, so the splice still applies.)
  if (!ctx.walk || ctx.gridEnsured) {
    const pts = [ctx.entry, ...ctx.exits];
    for (let i = ctx.doodads.length - 1; i >= 0; i--) {
      const d = ctx.doodads[i];
      // Only clear GENERATED scatter — never authored structure geometry (a fixture's
      // walls/props sit in a reserved footprint the rest of the layout already flows
      // around, exactly like every other solid-placement path here).
      if (blocksMovement(d) && !d.keep && !inReserved(ctx, d.pos, d.radius)
        && pts.some(p => dist(p, d.pos) < EXIT_CLEAR_CARVE + d.radius)) {
        // seedPaired kinds ride an index-zip with a parallel gen list (the
        // cave_entrance ↔ caveSeeds contract every other splice site keeps).
        // No seedPaired kind blocks movement today, so this is the same
        // defensive guard the sibling splices carry — not a live path.
        if (doodadRule(d.kind).seedPaired) {
          const ordinal = ctx.doodads.slice(0, i).filter(x => doodadRule(x.kind).seedPaired).length;
          ctx.caveSeeds.splice(ordinal, 1);
        }
        ctx.doodads.splice(i, 1);
      }
    }
  }
  // GROUND-REQUIRED SWEEP (DoodadRule.voidOk): whatever path placed it —
  // recipe push, cluster, formation, composition, legend layer — nothing
  // without the opt-out stands over a VOID-LIKE cell (open sky, a chasm).
  // The placement-time gates (findSpot/cellGuarded/structure probes) catch
  // what they can see; this outcome-side splice catches every OTHER path,
  // present and future, so the genqa invariant holds by construction.
  // Authored keeps and reserved fixture geometry are exempt — a fixture
  // answers to its own siting probes.
  if (ctx.walk) {
    for (let i = ctx.doodads.length - 1; i >= 0; i--) {
      const d = ctx.doodads[i];
      if (d.keep || doodadRule(d.kind).voidOk || inReserved(ctx, d.pos, d.radius)) continue;
      if (!overVoid(ctx, d.pos.x, d.pos.y)) continue;
      if (doodadRule(d.kind).seedPaired) {
        const ordinal = ctx.doodads.slice(0, i).filter(x => doodadRule(x.kind).seedPaired).length;
        ctx.caveSeeds.splice(ordinal, 1);
      }
      ctx.doodads.splice(i, 1);
    }
  }
  // THE UNIVERSAL REACHABILITY INVARIANT: an entrance or exit that is not
  // accessible is neither an entrance nor an exit; an objective set-piece the
  // player cannot walk to may as well not exist. Draw-free (no rng), no-op
  // when everything already connects — the belt-and-suspenders every layout,
  // structure, and landmark composition inherits for free.
  // THE CAVE LADDER'S GUARANTEE: a cave that ROLLED a deeper mouth (mintCave's
  // seeded chance appends the stamp) MUST hold one — a cramped grid can
  // exhaust the stamp's placement tries. Force it deterministically — the
  // walkable point FARTHEST from the entry (draw-free: pure geometry, no rng)
  // — so a rolled way down always exists. A cave whose roll came up empty has
  // no stamp and gets no force (the rarity IS the roll). Runs BEFORE the
  // reachability invariant and joins its required points, so a mouth in a
  // sealed pocket gets carved to. The paired seed derives from the zone seed
  // (lockstep append with the seeds list).
  // A purchased POCKET (ZoneDef.pocket) shares the guarantee: its guardian's
  // PocketSpec floors a cave row into the layout as a PROMISE ("something
  // under the camp worth the digging") — but a bespoke generator that never
  // walks def.layout (the field expanse) would silently drop it. Same force,
  // same seed zip, same reachability join.
  // (Boundless zones — the Descent's streamed abyss — are exempt: their layout
  // deliberately hosts no deeper mouth, and a mouth in the starter patch would
  // splice the Underworld ladder into a mode built around resurfacing.)
  if ((def.caveDepth || def.pocket) && !def.breach && !def.boundless
    && def.layout.some(s => s.kind === 'cave')
    && !ctx.doodads.some(d => d.kind === 'cave_entrance')) {
    let best: Vec2 | null = null;
    let bd = -1;
    const step = 60;
    for (let y = BORDER + 30; y < arena.h - BORDER; y += step) {
      for (let x = BORDER + 30; x < arena.w - BORDER; x += step) {
        if (ctx.walk && !ctx.walk.isWalkable(x, y)) continue;
        if (inReserved(ctx, vec(x, y), 20)) continue;
        // Reject ALL movement blockers — lava/chasm blobs are 'inert', not
        // 'solid', but a mouth inside one is just as unreachable.
        if (ctx.doodads.some(d => doodadRule(d.kind).blocksMove && dist(vec(x, y), d.pos) < 30 + d.radius)) continue;
        const d = dist(vec(x, y), ctx.entry);
        if (d > bd) { bd = d; best = vec(x, y); }
      }
    }
    if (best) {
      ctx.doodads.push({ pos: best, radius: 22, kind: 'cave_entrance' });
      ctx.caveSeeds.push(((def.seed ?? 1) ^ 0x9e3779b9) >>> 0);
      (ctx.mustReach ??= []).push(best);
    }
  }
  ensureReachability(ctx);
  ensureDoodadNavigability(ctx);
  return {
    doodads: ctx.doodads, pois: ctx.pois, camps: ctx.camps,
    breakables: ctx.breakables, npcs: ctx.npcs,
    garrisons: ctx.garrisons, caveSeeds: ctx.caveSeeds,
    walk: ctx.walk, airPockets: ctx.airPockets,
    structures: ctx.structures,
    spawnAt: ctx.spawnAt,
    pockets: ctx.pockets,
    landmarkSpawns: ctx.landmarkSpawns,
  };
}

/** The universal invariant's engine (grid zones; convex zones stay guaranteed
 *  by the portal-clear splice + their connected-by-construction floors):
 *  every exit, POI, camp, garrison post, door APRON (open-doors topology), and
 *  declared mustReach point must share the entry's component. A stranded point
 *  gets a corridor carved to the nearest reachable ground along the best of 8
 *  bearings — never through a structure's reserved rect (a rescue that
 *  breaches a castle wall would be a worse defect than the one it fixes).
 *  Points inside a declared POCKET are exempt: unreachable-on-foot is their
 *  feature (jump/blink islands). */
function ensureReachability(ctx: GenCtx): void {
  const grid = ctx.walk;
  if (!(grid instanceof GridWalkField)) return;
  const inPocket = (p: Vec2): boolean =>
    (ctx.pockets ?? []).some(k => dist(p, vec(k.x, k.y)) <= k.r);
  // Open-doors topology: door cells pass for the check, then RESTORED to
  // whatever they held before (not blanket-resealed to rampart: plan
  // structures seal their door cells, but the interior generators leave
  // theirs GROUND — the doodad does the blocking so spawns/pathing see the
  // open topology — and a forced reseal would wall the dungeon at every
  // rolled door).
  const doorRects: { x: number; y: number; w: number; h: number }[] = [];
  for (const st of ctx.structures ?? []) {
    for (const pd of st.doors) if (pd.door.cells) doorRects.push(pd.door.cells);
  }
  const cs = grid.cellSize ?? 30;
  const priorCells: { x: number; y: number; kind: string }[] = [];
  for (const c of doorRects) {
    for (let y = c.y + cs / 2; y < c.y + c.h; y += cs) {
      for (let x = c.x + cs / 2; x < c.x + c.w; x += cs) {
        priorCells.push({ x, y, kind: grid.regionAt(x, y) });
      }
    }
  }
  for (const c of doorRects) grid.fillRegion(c.x, c.y, c.x + c.w - 0.01, c.y + c.h - 0.01, 'ground');

  const required: Vec2[] = [
    ...ctx.exits,
    ...ctx.pois,
    ...ctx.camps,
    ...ctx.garrisons.map(g => g.pos),
    ...(ctx.mustReach ?? []),
  ];
  for (const st of ctx.structures ?? []) {
    for (const pd of st.doors) {
      required.push(vec(
        pd.pos.x + pd.normal.x * st.cellSize * APRON_CELLS,
        pd.pos.y + pd.normal.y * st.cellSize * APRON_CELLS));
    }
  }

  // The carve swath is halfW≈36 and fillRegion is intersect-inclusive — the
  // no-breach test must hold for the SWATH, not just the ray line, so the
  // structure rects are checked with a swath-wide margin.
  const CARVE_MARGIN = ((grid.cellSize ?? 30) * 1.2) + (grid.cellSize ?? 30);
  const insideStructure = (x: number, y: number): boolean =>
    (ctx.structures ?? []).some(st =>
      x > st.rect.x - CARVE_MARGIN && x < st.rect.x + st.rect.w + CARVE_MARGIN
      && y > st.rect.y - CARVE_MARGIN && y < st.rect.y + st.rect.h + CARVE_MARGIN);

  for (const p of required) {
    if (inPocket(p)) continue;
    if (!grid.reachable) break;
    // Snap the required point to its nearest walkable cell first (a POI's
    // center may sit on a decorative rim); still unreachable = act. If the
    // snap itself lands in a POCKET, the point belongs to the jump-only
    // feature — never carve a land bridge to it.
    const q = grid.isWalkable(p.x, p.y) ? p : grid.snapToWalkable(vec(p.x, p.y));
    if (inPocket(q)) continue;
    if (grid.reachable(ctx.entry, q)) continue;
    // 8-bearing ray march: find the SHORTEST ray to reachable ground that
    // never crosses a structure rect NOR a pocket (a rescue causeway across a
    // void gulf would foot-bridge the blink-only islands); carve that corridor.
    let bestPts: Vec2[] | null = null;
    let bestLen = Infinity;
    for (let b = 0; b < 8; b++) {
      const ang = (b / 8) * Math.PI * 2;
      const step = grid.cellSize ?? 30;
      for (let d = step; d <= Math.max(ctx.arena.w, ctx.arena.h) * 0.6; d += step) {
        const x = q.x + Math.cos(ang) * d, y = q.y + Math.sin(ang) * d;
        if (x < 0 || y < 0 || x > ctx.arena.w || y > ctx.arena.h) break;
        if (insideStructure(x, y)) break; // never breach a castle to rescue a POI
        if (inPocket(vec(x, y))) break;   // never bridge a jump-only pocket
        if (grid.isWalkable(x, y) && grid.reachable(ctx.entry, vec(x, y))) {
          if (d < bestLen) { bestLen = d; bestPts = [vec(q.x, q.y), vec(x, y)]; }
          break;
        }
      }
    }
    if (bestPts) {
      grid.carveCorridor(bestPts[0].x, bestPts[0].y, bestPts[1].x, bestPts[1].y, (grid.cellSize ?? 30) * 1.2);
    } else {
      console.warn(`[levelgen] reachability: point ${Math.round(p.x)},${Math.round(p.y)} unrescuable (no clear bearing) — check the layout recipe`);
    }
  }

  // Restore the door cells to their pre-check kinds (a plan structure's seal
  // comes back rampart; an interior door's floor stays floor).
  for (const pc of priorCells) grid.fillRegion(pc.x - 1, pc.y - 1, pc.x + 1, pc.y + 1, pc.kind);
}

/** SOLIDS NEVER SEAL — the doodad-aware belt over ensureReachability's grid
 *  suspenders. The walk grid guarantees carved connectivity, but scattered
 *  SOLID doodads (boulders, trunks, palisade posts) live OFF the grid — a
 *  ring of them can still corral an exit, a POI, or a door apron. Rasterize:
 *  grid walls HARD (doors counted open, per the open-doors topology), body
 *  discs of movement-blocking scatter SOFT (authored keeps / reserved
 *  footprints / doors HARD — never remove a castle to rescue a footpath),
 *  then 0-1 BFS from the entry to every required point. A point only
 *  reachable through soft cells gets its cheapest blocking doodads REMOVED.
 *  Draw-free (no rng): zones that never seal are byte-identical. */
function ensureDoodadNavigability(ctx: GenCtx): void {
  const cs = 30;
  const cols = Math.max(1, Math.ceil(ctx.arena.w / cs));
  const rows = Math.max(1, Math.ceil(ctx.arena.h / cs));
  const grid = ctx.walk instanceof GridWalkField ? ctx.walk : null;
  const inPocket = (p: Vec2): boolean =>
    (ctx.pockets ?? []).some(k => dist(p, vec(k.x, k.y)) <= k.r);

  // Door cells count OPEN for the check (their aprons are the guarantee).
  const doorRects: { x: number; y: number; w: number; h: number }[] = [];
  for (const st of ctx.structures ?? []) {
    for (const pd of st.doors) if (pd.door.cells) doorRects.push(pd.door.cells);
  }
  const inDoor = (x: number, y: number): boolean =>
    doorRects.some(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);

  // 0 open · 1 soft (removable scatter) · 2 hard (walls, keeps, reserved).
  const state = new Uint8Array(cols * rows);
  if (grid) {
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const x = (gx + 0.5) * cs, y = (gy + 0.5) * cs;
        if (!grid.isWalkable(x, y) && !inDoor(x, y)) state[gy * cols + gx] = 2;
      }
    }
  }
  const softBy = new Map<number, number[]>(); // cell → doodad indices
  for (let i = 0; i < ctx.doodads.length; i++) {
    const d = ctx.doodads[i];
    const rule = doodadRule(d.kind);
    // Doors count OPEN, and so does anything brittle to a STRIKE (the jungle's
    // brush plugs, crystal lattices): a blocker any hit pops is a door made of
    // matter, not a seal — cutting through is the intended traversal, so the
    // belt must not "rescue" the zone by deleting the very walls the biome is
    // about. (Derived from the rule, never a kind literal.)
    if (!rule.blocksMove || d.kind === 'door' || rule.brittle?.on.includes('hit')) continue;
    const hard = d.keep || inReserved(ctx, d.pos, d.radius);
    const rr = bodyRadiusOf(d) + 12;
    const gx0 = Math.max(0, Math.floor((d.pos.x - rr) / cs));
    const gx1 = Math.min(cols - 1, Math.floor((d.pos.x + rr) / cs));
    const gy0 = Math.max(0, Math.floor((d.pos.y - rr) / cs));
    const gy1 = Math.min(rows - 1, Math.floor((d.pos.y + rr) / cs));
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        // Disc vs cell-rect intersection (conservative: small solids between
        // cell centers still register).
        const nx = clampNum(d.pos.x, gx * cs, (gx + 1) * cs);
        const ny = clampNum(d.pos.y, gy * cs, (gy + 1) * cs);
        if ((nx - d.pos.x) ** 2 + (ny - d.pos.y) ** 2 > rr * rr) continue;
        const idx = gy * cols + gx;
        if (state[idx] === 2) continue;
        if (hard) { state[idx] = 2; softBy.delete(idx); continue; }
        state[idx] = 1;
        const list = softBy.get(idx);
        if (list) list.push(i); else softBy.set(idx, [i]);
      }
    }
  }

  const cellOf = (p: Vec2): number => {
    const gx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cs)));
    const gy = Math.min(rows - 1, Math.max(0, Math.floor(p.y / cs)));
    return gy * cols + gx;
  };
  // Snap the start to the nearest open cell (the entry itself is never built
  // over, but its center may sit on a soft rim).
  let start = cellOf(ctx.entry);
  if (state[start] !== 0) {
    outer: for (let ring = 1; ring <= 4; ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          const gx = (start % cols) + dx, gy = Math.floor(start / cols) + dy;
          if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;
          if (state[gy * cols + gx] === 0) { start = gy * cols + gx; break outer; }
        }
      }
    }
  }

  // 0-1 BFS (deque): cost = soft cells crossed; parents rebuild the path.
  const search = (target: number): number[] | null => {
    if (state[target] === 2) return null;
    const cost = new Int32Array(cols * rows).fill(-1);
    const parent = new Int32Array(cols * rows).fill(-1);
    const deque: number[] = [start];
    cost[start] = 0;
    while (deque.length) {
      const cur = deque.shift()!;
      if (cur === target) break;
      const cx = cur % cols, cy = Math.floor(cur / cols);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (state[ni] === 2) continue;
        const nc = cost[cur] + (state[ni] === 1 ? 1 : 0);
        if (cost[ni] !== -1 && cost[ni] <= nc) continue;
        cost[ni] = nc;
        parent[ni] = cur;
        if (state[ni] === 1) deque.push(ni); else deque.unshift(ni);
      }
    }
    if (cost[target] === -1) return null;
    if (cost[target] === 0) return []; // already reachable clean
    const path: number[] = [];
    for (let at = target; at !== -1 && at !== start; at = parent[at]) {
      if (state[at] === 1) path.push(at);
    }
    return path;
  };

  const required: Vec2[] = [
    ...ctx.exits, ...ctx.pois, ...ctx.camps,
    ...ctx.garrisons.map(g => g.pos), ...(ctx.mustReach ?? []),
  ];
  for (const st of ctx.structures ?? []) {
    for (const pd of st.doors) {
      required.push(vec(
        pd.pos.x + pd.normal.x * st.cellSize * APRON_CELLS,
        pd.pos.y + pd.normal.y * st.cellSize * APRON_CELLS));
    }
  }

  const doomed = new Set<number>();
  for (const p of required) {
    if (inPocket(p)) continue;
    const softPath = search(cellOf(p));
    if (!softPath) continue; // hard-sealed or clean-unreachable: the grid pass owns it
    for (const cell of softPath) {
      for (const di of softBy.get(cell) ?? []) doomed.add(di);
    }
  }
  if (!doomed.size) return;
  const removed = [...doomed].sort((a, b) => b - a);
  for (const i of removed) {
    const d = ctx.doodads[i];
    // A removed SEED-PAIRED doodad takes its caveSeeds entry with it (the
    // mouth↔seed zip must never shear) — same discipline as the site-clear.
    if (doodadRule(d.kind).seedPaired) {
      let ordinal = 0;
      for (let k = 0; k < i; k++) if (ctx.doodads[k].kind === d.kind) ordinal++;
      if (ordinal < ctx.caveSeeds.length) ctx.caveSeeds.splice(ordinal, 1);
    }
    ctx.doodads.splice(i, 1);
  }
  console.info(`[levelgen] navigability: cleared ${removed.length} sealing solid(s) so every required point stays walkable`);
}

function clampNum(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Stamp a structure blueprint: wall strips, props, clutter, folk. */
function placeStructure(ctx: GenCtx, s: StructureDef, at: Vec2): void {
  ctx.reserved.push({ pos: at, radius: Math.max(s.halfW, s.halfH) * 1.25 + 20 });
  const segR = 11;
  for (const strip of s.walls ?? []) {
    const steps = Math.max(1, Math.round(strip.length / (segR * 1.8)));
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * strip.length;
      ctx.doodads.push({
        pos: vec(
          at.x + strip.x + (strip.dir === 'h' ? t : 0),
          at.y + strip.y + (strip.dir === 'v' ? t : 0)),
        radius: segR, kind: 'wall',
      });
    }
  }
  for (const prop of s.props ?? []) {
    ctx.doodads.push({
      pos: vec(at.x + prop.x, at.y + prop.y),
      radius: prop.radius ?? 12, kind: prop.kind,
    });
  }
  for (const b of s.breakables ?? []) {
    ctx.breakables.push({ id: b.id, pos: vec(at.x + b.x, at.y + b.y) });
  }
  for (const n of s.npcs ?? []) {
    ctx.npcs.push({ id: n.id, pos: vec(at.x + n.x, at.y + n.y) });
  }
  // Pre-inhabited: a faction posts a guard pack at the structure's heart.
  if (s.garrison) {
    ctx.garrisons.push({ pos: vec(at.x, at.y), faction: s.garrison, size: s.garrisonSize ?? [3, 5] });
  }
  ctx.pois.push(vec(at.x, at.y));
}

// --- PLAN STRUCTURES (the char-grid pipeline) --------------------------------

/** One resolved plan cell (position + spec), the working unit of placement. */
interface PlanCell { cx: number; cy: number; char: string; spec: CellSpec }

/** Resolve a def's plan rows (authored or generator-emitted) into cells. */
function resolvePlan(ctx: GenCtx, def: StructureDef): { rows: string[]; cells: PlanCell[] } | null {
  const rows = def.plan ?? (def.generator ? runStructureGen(def.generator, ctx.rng, def.genParams ?? {}) : null);
  if (!rows || !rows.length) return null;
  const cells: PlanCell[] = [];
  for (let cy = 0; cy < rows.length; cy++) {
    for (let cx = 0; cx < rows[cy].length; cx++) {
      const char = rows[cy][cx];
      const spec = legendCell(char, def.legend);
      if (spec) cells.push({ cx, cy, char, spec });
    }
  }
  return { rows, cells };
}

/** Does a candidate footprint rect overlap any reservation? (rect-vs-circle +
 *  rect-vs-rect — the rect-aware sibling of inReserved's point test). */
function rectReserved(ctx: GenCtx, rect: { x: number; y: number; w: number; h: number }): boolean {
  return ctx.reserved.some(r => {
    if ('rect' in r) {
      const m = r.margin ?? 0;
      return rect.x < r.rect.x + r.rect.w + m && rect.x + rect.w > r.rect.x - m
          && rect.y < r.rect.y + r.rect.h + m && rect.y + rect.h > r.rect.y - m;
    }
    const nx = Math.max(rect.x, Math.min(r.pos.x, rect.x + rect.w));
    const ny = Math.max(rect.y, Math.min(r.pos.y, rect.y + rect.h));
    return dist(vec(nx, ny), r.pos) < r.radius;
  });
}

/** Grow the walk grid lazily for a plan structure in a convex zone: everything
 *  starts walkable 'ground' (the plains floor), and the structure paints its
 *  walls into it. Sets gridEnsured so the convex portal-clear splice still runs.
 *  Exported: layout recipes compose on the same grid. */
export function ensureGrid(ctx: GenCtx): GridWalkField {
  if (ctx.walk instanceof GridWalkField) return ctx.walk;
  const grid = new GridWalkField(ctx.arena.w, ctx.arena.h, 30);
  grid.fillRect(0, 0, ctx.arena.w, ctx.arena.h, true);
  ctx.walk = grid;
  ctx.gridEnsured = true;
  return grid;
}

const APRON_CELLS = 1.6;      // how far outside a door its guaranteed-clear apron sits

/** Hazard grounds structure/landmark/camp siting must refuse — DERIVED from
 *  DoodadRule.hazardGround (never a literal list: a package's tar pit joins
 *  the siting rules with one row flag). Memoized; registerDoodadRule
 *  invalidates so late package registrations count. Consumers are boolean
 *  ANY-tests, so derivation order can never shift a placement. */
let hazardGroundsCache: DoodadKind[] | null = null;
function hazardGrounds(): DoodadKind[] {
  if (!hazardGroundsCache) {
    hazardGroundsCache = [
      ...(Object.keys(DOODAD_RULES) as DoodadKind[]),
      ...Object.keys(RUNTIME_RULES),
    ].filter(k => doodadRule(k).hazardGround);
  }
  return hazardGroundsCache;
}

/** Is a point inside any doodad of the given kinds? (Point probe — the cheap
 *  siting test big footprints use instead of a whole-disc areaFreeOf, which a
 *  decorated zone can never satisfy at castle scale.) */
function pointOnKinds(ctx: GenCtx, p: Vec2, kinds: DoodadKind[]): boolean {
  return ctx.doodads.some(d => kinds.includes(d.kind) && dist(p, d.pos) < d.radius);
}

/** Find a center for a plan structure's rect footprint: clear of the entry, the
 *  portals, reservations, and hazard grounds — and with every perimeter door's
 *  APRON on viable ground. Draws-before-filters like findSpot (2 draws/try).
 *  Hazards are POINT-probed (center/corners/edge midpoints): light overlap is
 *  fine because placement then CLEARS the footprint (builders drain the pond). */
function findStructureSpot(
  ctx: GenCtx, w: number, h: number, aprons: { dx: number; dy: number }[],
): Vec2 | null {
  for (let tries = 0; tries < 18; tries++) {
    const c = vec(
      ctx.rng.range(BORDER + w / 2, Math.max(BORDER + w / 2, ctx.arena.w - BORDER - w / 2)),
      ctx.rng.range(BORDER + h / 2, Math.max(BORDER + h / 2, ctx.arena.h - BORDER - h / 2)));
    const rect = { x: c.x - w / 2, y: c.y - h / 2, w, h };
    // Entry/portal clearance measured to the rect's closest point.
    const nearest = (p: Vec2): number => dist(p, vec(
      Math.max(rect.x, Math.min(p.x, rect.x + rect.w)),
      Math.max(rect.y, Math.min(p.y, rect.y + rect.h))));
    if (nearest(ctx.entry) < ENTRY_CLEAR) continue;
    if (ctx.exits.some(e => nearest(e) < EXIT_CLEAR)) continue;
    if (rectReserved(ctx, rect)) continue;
    const hazardProbes = [c,
      vec(rect.x, rect.y), vec(rect.x + w, rect.y), vec(rect.x, rect.y + h), vec(rect.x + w, rect.y + h),
      vec(c.x, rect.y), vec(c.x, rect.y + h), vec(rect.x, c.y), vec(rect.x + w, c.y)];
    if (hazardProbes.some(p => pointOnKinds(ctx, p, hazardGrounds()))) continue;
    // Pre-existing grid zones (field/rooms/flesh): the footprint's anchor points
    // must sit on walkable ground pre-paint, or the castle lands inside rock.
    if (ctx.walk && !ctx.gridEnsured) {
      const probes = [c,
        vec(rect.x + 4, rect.y + 4), vec(rect.x + rect.w - 4, rect.y + 4),
        vec(rect.x + 4, rect.y + rect.h - 4), vec(rect.x + rect.w - 4, rect.y + rect.h - 4)];
      if (probes.some(p => !ctx.walk!.isWalkable(p.x, p.y))) continue;
    }
    // NO FLOATING KEEPS (any grid, ensured included): a footprint may stamp
    // into rock — the build carves its own floor — but never overhang
    // VOID-LIKE cells (open sky, chasm): the aether courts stand ON cloud.
    // Center + corners + edge midpoints, the hazard-probe idiom, so an
    // isle-straddling rect can't pass on corners alone.
    if (ctx.walk) {
      const vProbes = [c,
        vec(rect.x + 4, rect.y + 4), vec(rect.x + rect.w - 4, rect.y + 4),
        vec(rect.x + 4, rect.y + rect.h - 4), vec(rect.x + rect.w - 4, rect.y + rect.h - 4),
        vec(c.x, rect.y + 4), vec(c.x, rect.y + rect.h - 4),
        vec(rect.x + 4, c.y), vec(rect.x + rect.w - 4, c.y)];
      if (vProbes.some(p => overVoid(ctx, p.x, p.y))) continue;
    }
    // Every door apron must land inside the arena and off reservations.
    const apronsOk = aprons.every(a => {
      const p = vec(c.x + a.dx, c.y + a.dy);
      return p.x > BORDER && p.x < ctx.arena.w - BORDER
          && p.y > BORDER && p.y < ctx.arena.h - BORDER
          && !inReserved(ctx, p, 20);
    });
    if (!apronsOk) continue;
    return c;
  }
  return null;
}

/** Raise a PLAN structure (char-grid blueprint or generator-emitted): reserve a
 *  true rect, paint the walk grid (walls/windows/parapets/floors), emit door +
 *  window + prop doodads, record roofs/slots/doors on a PlacedStructure, stamp
 *  fx layers, and guarantee every door an open apron reachable from the entry. */
function placeStructurePlan(ctx: GenCtx, def: StructureDef, at?: Vec2): void {
  const resolved = resolvePlan(ctx, def);
  if (!resolved) return;
  const { rows, cells } = resolved;
  // QUANTIZE the plan cell to a multiple of the WALK cell (30), and later snap
  // the footprint origin to the walk lattice: every plan cell then maps to
  // exactly k×k walk cells. Unaligned cells bleed via fillRegion's intersect-
  // inclusive painting and can pinch a 1-cell corridor SHUT depending on the
  // footprint's pixel phase (the fortress ring corridor taught us that).
  const WALK_CELL = 30;
  const cell = Math.max(1, Math.round((def.cellSize ?? WALK_CELL) / WALK_CELL)) * WALK_CELL;
  const planW = Math.max(...rows.map(r => r.length));
  const planH = rows.length;
  const w = planW * cell, h = planH * cell;

  // Group door cells (4-adjacent, same mode) into logical doors and compute the
  // outward normal of each BEFORE siting, so aprons can gate the spot choice.
  const doorCells = cells.filter(c => c.spec.door);
  const doorGroups: { cells: PlanCell[]; mode: NonNullable<CellSpec['door']> }[] = [];
  const seen = new Set<PlanCell>();
  for (const dc of doorCells) {
    if (seen.has(dc)) continue;
    const group = [dc]; seen.add(dc);
    for (let i = 0; i < group.length; i++) {
      for (const other of doorCells) {
        if (seen.has(other)) continue;
        if (Math.abs(other.cx - group[i].cx) + Math.abs(other.cy - group[i].cy) === 1
            && other.spec.door!.mode === dc.spec.door!.mode) {
          group.push(other); seen.add(other);
        }
      }
    }
    // Door state repaints operate on the group's BOUNDING BOX — a non-
    // rectangular (L/blob) group would hole the wall on open. All shipped
    // doors are straight runs; warn loudly the day a plan authors otherwise.
    const minX = Math.min(...group.map(c => c.cx)), maxX = Math.max(...group.map(c => c.cx));
    const minY = Math.min(...group.map(c => c.cy)), maxY = Math.max(...group.map(c => c.cy));
    if (group.length !== (maxX - minX + 1) * (maxY - minY + 1)) {
      console.warn(`[structures] '${def.id}': non-rectangular door group (${group.length} cells in a ${maxX - minX + 1}×${maxY - minY + 1} box) — open/close repaints will hole the wall`);
    }
    doorGroups.push({ cells: group, mode: dc.spec.door! });
  }
  // Plan-cell probes for the interior-door normal: which cells the PLAN
  // itself says are floor (interior/courtyard/ground-painting furniture) vs
  // wall-region. Doors count as floor — a passage continues through them.
  const planSpecAt = (cx: number, cy: number): CellSpec | undefined => {
    const ch = rows[cy]?.[cx];
    return ch ? legendCell(ch, def.legend) : undefined;
  };
  const planFloorAt = (cx: number, cy: number): boolean => {
    const s = planSpecAt(cx, cy);
    if (!s) return false;
    if (s.region && !s.door) return false;
    return !!(s.interior || s.courtyard || s.slot || s.breakable || s.npc || s.doodad || s.door);
  };
  const groupNormal = (g: PlanCell[]): Vec2 => {
    if (g.some(c => c.cy === 0)) return vec(0, -1);
    if (g.some(c => c.cy === planH - 1)) return vec(0, 1);
    if (g.some(c => c.cx === 0)) return vec(-1, 0);
    if (g.some(c => c.cx === planW - 1)) return vec(1, 0);
    // INTERIOR door (a BSP partition, a keep gate): the passage runs
    // PERPENDICULAR to the wall it pierces — never "away from the plan
    // center", which for a partition door can point straight down its own
    // wall line into masonry (the walled_manor's d2/d5/d7/d8 taught us:
    // no walkable apron ever lay that way). The group's run gives the wall
    // axis; a single-cell door reads its wall-region neighbors instead. The
    // SIGN takes whichever side the plan says is floor (both sides of a
    // partition are rooms — the first found wins, deterministically).
    const minX = Math.min(...g.map(c => c.cx)), maxX = Math.max(...g.map(c => c.cx));
    const minY = Math.min(...g.map(c => c.cy)), maxY = Math.max(...g.map(c => c.cy));
    const midX = Math.round((minX + maxX) / 2), midY = Math.round((minY + maxY) / 2);
    let axes: Vec2[];
    if (maxX - minX > maxY - minY) {
      axes = [vec(0, -1), vec(0, 1)];       // door run along X → passage along Y
    } else if (maxY - minY > maxX - minX) {
      axes = [vec(-1, 0), vec(1, 0)];       // door run along Y → passage along X
    } else {
      const wallAt = (cx: number, cy: number): boolean => {
        const s = planSpecAt(cx, cy);
        return !!s?.region && !s.door;
      };
      axes = wallAt(minX - 1, midY) || wallAt(maxX + 1, midY)
        ? [vec(0, -1), vec(0, 1)]           // walled left/right → passage along Y
        : [vec(-1, 0), vec(1, 0)];
    }
    for (const a of axes) {
      if (planFloorAt(midX + a.x, midY + a.y)) return a;
    }
    // Neither side reads as floor in the plan (odd authoring): the old
    // center-away heuristic stays as the last resort.
    const gx = g.reduce((a, c) => a + c.cx, 0) / g.length;
    const gy = g.reduce((a, c) => a + c.cy, 0) / g.length;
    const ddx = gx - planW / 2, ddy = gy - planH / 2;
    return Math.abs(ddx) >= Math.abs(ddy) ? vec(Math.sign(ddx) || 1, 0) : vec(0, Math.sign(ddy) || 1);
  };
  const apronOffsets = doorGroups.map(g => {
    const n = groupNormal(g.cells);
    const gx = (g.cells.reduce((a, c) => a + c.cx, 0) / g.cells.length + 0.5 - planW / 2) * cell;
    const gy = (g.cells.reduce((a, c) => a + c.cy, 0) / g.cells.length + 0.5 - planH / 2) * cell;
    return { dx: gx + n.x * cell * APRON_CELLS, dy: gy + n.y * cell * APRON_CELLS };
  });

  const sited = at ?? findStructureSpot(ctx, w, h, apronOffsets);
  if (!sited) return;
  // Snap the footprint origin onto the walk lattice (see the quantization note).
  const rect = {
    x: Math.round((sited.x - w / 2) / WALK_CELL) * WALK_CELL,
    y: Math.round((sited.y - h / 2) / WALK_CELL) * WALK_CELL,
    w, h,
  };
  const center = vec(rect.x + w / 2, rect.y + h / 2);
  ctx.reserved.push({ rect, margin: def.margin ?? cell * 1.5 });
  // CLEAR THE SITE: builders drain the pond and fell the trees — every doodad
  // whose center falls inside the footprint is removed before the walls rise
  // (rolls run AFTER the layout's scatter, so the structure wins its ground).
  // Draw-free, so the rng sequence is untouched. A removed SEED-PAIRED doodad
  // (cave_entrance) takes its caveSeeds entry with it — the index zip between
  // mouths and seeds must never shear (every surviving mouth keeps ITS cave).
  for (let i = ctx.doodads.length - 1; i >= 0; i--) {
    const d = ctx.doodads[i];
    if (d.pos.x > rect.x - d.radius * 0.4 && d.pos.x < rect.x + rect.w + d.radius * 0.4
        && d.pos.y > rect.y - d.radius * 0.4 && d.pos.y < rect.y + rect.h + d.radius * 0.4) {
      if (doodadRule(d.kind).seedPaired) {
        let ordinal = 0;
        for (let k = 0; k < i; k++) if (ctx.doodads[k].kind === d.kind) ordinal++;
        if (ordinal < ctx.caveSeeds.length) ctx.caveSeeds.splice(ordinal, 1);
      }
      ctx.doodads.splice(i, 1);
    }
  }

  // Plan structures always paint the grid: interiors are real carved space.
  const grid = ensureGrid(ctx);
  const cellRect = (cx: number, cy: number): { x0: number; y0: number; x1: number; y1: number } => ({
    x0: rect.x + cx * cell, y0: rect.y + cy * cell,
    x1: rect.x + (cx + 1) * cell - 0.01, y1: rect.y + (cy + 1) * cell - 0.01,
  });
  const cellCenter = (cx: number, cy: number): Vec2 =>
    vec(rect.x + (cx + 0.5) * cell, rect.y + (cy + 0.5) * cell);

  // Paint floors first, then walls/regions, then door cells (closed = rampart),
  // so overlapping specs resolve wall-wins deterministically.
  for (const c of cells) {
    if (c.spec.interior || c.spec.courtyard || c.spec.slot || c.spec.breakable || c.spec.npc || c.spec.doodad) {
      const r = cellRect(c.cx, c.cy);
      grid.fillRegion(r.x0, r.y0, r.x1, r.y1, 'ground');
    }
  }
  for (const c of cells) {
    if (c.spec.region && !c.spec.door) {
      const r = cellRect(c.cx, c.cy);
      grid.fillRegion(r.x0, r.y0, r.x1, r.y1, c.spec.region);
    }
  }
  // (Door cells stay FLOOR for now — they seal LAST, after the apron guarantee
  // below has verified the open-doors topology: the true invariant is "every
  // apron reachable once its doors open", not "while the castle is sealed".)

  const sid = `${def.id}#${ctx.structures?.length ?? 0}`;
  const placed: PlacedStructure = {
    id: sid, defId: def.id, rect, cellSize: cell,
    roofs: [], roofStyle: def.roofStyle ?? 'timber',
    floors: [], floorStyle: def.floorStyle,
    courtyards: [], courtyardFloorStyle: def.courtyardFloorStyle,
    doors: [], slots: [],
    ...(def.confineVision ? { confineVision: true } : {}),
  };

  // Doodads / breakables / npcs / slots from cells.
  for (const c of cells) {
    const p = cellCenter(c.cx, c.cy);
    if (c.spec.doodad) {
      ctx.doodads.push({
        pos: p, radius: c.spec.doodad.radius ?? cell * 0.55, kind: c.spec.doodad.kind,
        effect: c.spec.doodad.effect ? { ...c.spec.doodad.effect } : undefined,
      });
    }
    // Window cells get a frame doodad (the arrow-slit sill dressing) oriented
    // along the wall run they sit in — draw-free w.r.t. rng.
    if (c.spec.region === 'window') {
      const wallish = (cx: number, cy: number): boolean => {
        const ch = rows[cy]?.[cx];
        const spec = ch ? legendCell(ch, def.legend) : undefined;
        return !!spec?.region;
      };
      const horizontal = wallish(c.cx - 1, c.cy) || wallish(c.cx + 1, c.cy);
      ctx.doodads.push({ pos: p, radius: cell * 0.5, kind: 'window', rot: horizontal ? 0 : Math.PI / 2 });
    }
    if (c.spec.breakable) ctx.breakables.push({ id: c.spec.breakable, pos: p });
    if (c.spec.npc) ctx.npcs.push({ id: c.spec.npc, pos: p });
    // WAKE HERE: the plan claims the layout's arrival point (fresh copies —
    // the cell center is also a doodad pos when a plan co-authors both).
    if (c.spec.spawn) { placed.spawn = vec(p.x, p.y); ctx.spawnAt = vec(p.x, p.y); }
    if (c.spec.slot) {
      placed.slots.push({
        id: `${sid}/s${placed.slots.length}`, pos: p, kind: c.spec.slot.kind,
        capacity: c.spec.slot.capacity ?? 1, mods: c.spec.slot.mods,
        entry: c.spec.slot.entry ?? 'teleport', leash: c.spec.slot.leash,
        occupants: [],
      });
    }
  }

  // DEF-LEVEL dressing (props / breakables / npcs): the walls/props vocabulary
  // rides plan structures too — offsets hang off the plan's true CENTER exactly
  // as they hang off `at` on a legacy def. (The plan conversion dropped these
  // silently — the smith vanished from her own forge.) Draw-free.
  for (const prop of def.props ?? []) {
    ctx.doodads.push({ pos: vec(center.x + prop.x, center.y + prop.y), radius: prop.radius ?? 12, kind: prop.kind });
  }
  for (const b of def.breakables ?? []) {
    ctx.breakables.push({ id: b.id, pos: vec(center.x + b.x, center.y + b.y) });
  }
  for (const n of def.npcs ?? []) {
    ctx.npcs.push({ id: n.id, pos: vec(center.x + n.x, center.y + n.y) });
  }

  // Door doodads: one per group, sized to span the breach.
  for (let gi = 0; gi < doorGroups.length; gi++) {
    const g = doorGroups[gi];
    const n = groupNormal(g.cells);
    const minCx = Math.min(...g.cells.map(c => c.cx)), maxCx = Math.max(...g.cells.map(c => c.cx));
    const minCy = Math.min(...g.cells.map(c => c.cy)), maxCy = Math.max(...g.cells.map(c => c.cy));
    const cellsRect = {
      x: rect.x + minCx * cell, y: rect.y + minCy * cell,
      w: (maxCx - minCx + 1) * cell, h: (maxCy - minCy + 1) * cell,
    };
    const pos = vec(cellsRect.x + cellsRect.w / 2, cellsRect.y + cellsRect.h / 2);
    const door: DoodadDoor = {
      id: `${sid}/d${gi}`, mode: g.mode.mode,
      cells: cellsRect, life: g.mode.life, dwell: g.mode.dwell,
      lesson: g.mode.lesson,
    };
    ctx.doodads.push({
      pos, radius: Math.max(cellsRect.w, cellsRect.h) / 2,
      kind: 'door', dir: Math.atan2(n.y, n.x), door,
      // The slab IS the hitbox: flush with the wall line, thin as the bar
      // you see — not the old breach-spanning circle bulging into the yard.
      hitbox: doorSurfaceOf(cellsRect, n),
    });
    placed.doors.push({ door, pos, normal: n });
  }

  // CELL-RECT MERGER: rows of matching cells → runs → vertically stacked
  // rects. Roofs, floors and paved courtyards all reduce through it.
  const mergeCells = (member: (c: (typeof cells)[number]) => boolean): { x: number; y: number; w: number; h: number }[] => {
    const set = new Set(cells.filter(member).map(c => c.cy * planW + c.cx));
    const runs: { cx0: number; cx1: number; cy: number }[] = [];
    for (let cy = 0; cy < planH; cy++) {
      let start = -1;
      for (let cx = 0; cx <= planW; cx++) {
        if (cx < planW && set.has(cy * planW + cx)) { if (start < 0) start = cx; }
        else if (start >= 0) { runs.push({ cx0: start, cx1: cx - 1, cy }); start = -1; }
      }
    }
    const merged: { cx0: number; cx1: number; cy0: number; cy1: number }[] = [];
    for (const run of runs) {
      const prev = merged.find(m => m.cx0 === run.cx0 && m.cx1 === run.cx1 && m.cy1 === run.cy - 1);
      if (prev) prev.cy1 = run.cy;
      else merged.push({ cx0: run.cx0, cx1: run.cx1, cy0: run.cy, cy1: run.cy });
    }
    return merged.map(m => ({
      x: rect.x + m.cx0 * cell, y: rect.y + m.cy0 * cell,
      w: (m.cx1 - m.cx0 + 1) * cell, h: (m.cy1 - m.cy0 + 1) * cell,
    }));
  };
  // Roofs: interior, not courtyard, NOT doors — a roofed gate hides the
  // closed-gate art + its guard's health bar exactly while the door render
  // matters most.
  if (def.roofs === 'auto') {
    placed.roofs = mergeCells(c => !!c.spec.interior && !c.spec.courtyard && !c.spec.door);
  }
  // Floors run under the whole interior AND through its doorways (a
  // threshold is floored); paved courtyards merge separately.
  if (def.floorStyle) {
    placed.floors = mergeCells(c => !!(c.spec.interior || c.spec.door));
  }
  if (def.courtyardFloorStyle) {
    placed.courtyards = mergeCells(c => !!c.spec.courtyard);
  }

  // FX LAYERS — the interwoven ground effects (a fire-laden siege: cinder floors
  // + ember vents INSIDE the castle). Doodads scattered over matching cells.
  // Door + slot cells are NEVER matched (a solid vent centered on a doorway
  // corks the breach forever — the door 'opens' but the disc still blocks),
  // and a blocking fx kind rejects spots overlapping already-placed solids.
  for (const fx of def.fx ?? []) {
    const matches = cells.filter(c =>
      !c.spec.door && !c.spec.slot
      && (fx.where === 'interior' ? (c.spec.interior || c.spec.courtyard)
        : fx.where === 'perimeter' ? c.spec.region === 'rampart'
          : c.char === fx.char));
    if (!matches.length) continue;
    const fxBlocks = !!doodadRule(fx.doodad.kind).blocksMove;
    const n = Math.round(ctx.rng.range(fx.countPer100Cells[0], fx.countPer100Cells[1]) * matches.length / 100);
    for (let i = 0; i < n; i++) {
      // Draws BEFORE the overlap filter, so a rejected spot never shifts the
      // sequence of later instances.
      const m = matches[ctx.rng.int(0, matches.length - 1)];
      const p = cellCenter(m.cx, m.cy);
      const jx = ctx.rng.range(-cell * 0.3, cell * 0.3), jy = ctx.rng.range(-cell * 0.3, cell * 0.3);
      const r = ctx.rng.range(fx.doodad.radius[0], fx.doodad.radius[1]);
      // Effect clones get a random cd phase so a castle's vents RIPPLE instead
      // of erupting in a synchronized full-castle barrage from tick 1.
      const cd = fx.doodad.effect ? ctx.rng.range(0, fx.doodad.effect.interval) : 0;
      const pos = vec(p.x + jx, p.y + jy);
      if (fxBlocks && ctx.doodads.some(d => isSolid(d.kind) && dist(pos, d.pos) < r + d.radius)) continue;
      ctx.doodads.push({
        pos, radius: r, kind: fx.doodad.kind,
        effect: fx.doodad.effect ? { ...fx.doodad.effect, cd } : undefined,
      });
    }
  }

  // APRON GUARANTEE: every door needs open ground just outside it, connected to
  // the zone entry ONCE ITS DOORS OPEN (A-9: the guard targets the APRON, never
  // the door cell — a carve through the wall would pre-breach every castle).
  // The apron is SEARCHED along the door's outward normal (a fixed offset can
  // land on a second wall line — the concentric fortress taught us that); blind
  // carves are allowed only OUTSIDE the footprint, so a wall is never breached.
  for (let gi = 0; gi < doorGroups.length; gi++) {
    const pd = placed.doors[gi];
    const searchAlong = (nx: number, ny: number): Vec2 | null => {
      for (let step = 1.2; step <= 3.4; step += 0.5) {
        const p = vec(pd.pos.x + nx * cell * step, pd.pos.y + ny * cell * step);
        if (grid.isWalkable(p.x, p.y)) return p;
      }
      return null;
    };
    let apron: Vec2 | null = searchAlong(pd.normal.x, pd.normal.y);
    if (!apron) {
      // Which side does the recorded normal face? A PERIMETER door's apron
      // lives OUTSIDE the footprint — when its outward span is pre-existing
      // rock (a grid layout), carve egress rather than trying the reverse:
      // the reverse search always finds the structure's own interior floor,
      // which would leave the gate sealed in rock with its normal flipped
      // INTO the keep (and the carve branch could never run).
      const p = vec(pd.pos.x + pd.normal.x * cell * APRON_CELLS, pd.pos.y + pd.normal.y * cell * APRON_CELLS);
      const outside = p.x < rect.x || p.x > rect.x + rect.w || p.y < rect.y || p.y > rect.y + rect.h;
      if (outside) {
        // Perimeter door into pre-existing rock (a grid layout): carve egress.
        grid.fillDisc(p.x, p.y, cell, 'ground');
        const far = vec(p.x + pd.normal.x * cell * 4, p.y + pd.normal.y * cell * 4);
        grid.carveCorridor(p.x, p.y, far.x, far.y, cell * 0.8);
        apron = p;
      } else {
        // The REVERSE side: an interior door opens into a room either way —
        // if the derived normal faced masonry, the working side becomes the
        // normal (guards, apron requirements, open-doors topology read it).
        const back = searchAlong(-pd.normal.x, -pd.normal.y);
        if (back) {
          pd.normal.x *= -1;
          pd.normal.y *= -1;
          apron = back;
        }
      }
    }
    if (!apron) {
      // Once per def+door — a generator gap repeats identically on every
      // mint of that blueprint; the first line says everything.
      const key = `${def.id}/d${gi}`;
      if (!apronWarned.has(key)) {
        apronWarned.add(key);
        console.warn(`[structures] ${sid}: door ${pd.door.id} has no walkable apron along either normal (authoring/generator gap)`);
      }
      continue;
    }
    if (grid.reachable && !grid.reachable(ctx.entry, apron)) {
      console.warn(`[structures] ${sid}: door ${pd.door.id} apron not reachable from entry (open-doors topology)`);
    }
  }

  // NOW seal the doors: paint their cells rampart (closed). Opening a door
  // (setDoorState) repaints exactly these cells back to floor.
  for (const c of doorCells) {
    const r = cellRect(c.cx, c.cy);
    grid.fillRegion(r.x0, r.y0, r.x1, r.y1, 'rampart');
  }

  (ctx.structures ??= []).push(placed);
  ctx.pois.push(center);
  if (def.garrison) {
    ctx.garrisons.push({ pos: center, faction: def.garrison, size: def.garrisonSize ?? [3, 5] });
  }
}

/** Build a structure's SOLID pieces (wall posts + props) as world-space doodads,
 *  for stamping a structure into a LIVE arena AFTER generation. Used by the
 *  Crusade, which decides a zone's structures at LOAD time from its influence
 *  tier (camp → fortress → labyrinth-city), not at zone-mint. Returns only the
 *  doodads; the caller spawns whatever garrison it wants with full control. Pure
 *  (no GenCtx, no rng), so it reproduces identically each visit. */
export function structureDoodads(s: StructureDef, at: Vec2): Doodad[] {
  // PLAN defs are gen-time only (they need the grid painter + deterministic ids);
  // a runtime materializer (Crusade/Holdfast) must use walls/props defs — loud
  // guard so a def wired into the wrong path fails visibly, not silently empty.
  if (s.plan || s.generator) {
    console.warn(`[structures] '${s.id}' is a PLAN structure — structureDoodads (runtime path) cannot raise it; use a walls/props def`);
    return [];
  }
  const out: Doodad[] = [];
  const segR = 11;
  for (const strip of s.walls ?? []) {
    const steps = Math.max(1, Math.round(strip.length / (segR * 1.8)));
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * strip.length;
      out.push({
        pos: vec(at.x + strip.x + (strip.dir === 'h' ? t : 0),
          at.y + strip.y + (strip.dir === 'v' ? t : 0)),
        radius: segR, kind: 'wall',
      });
    }
  }
  for (const prop of s.props ?? []) {
    out.push({ pos: vec(at.x + prop.x, at.y + prop.y), radius: prop.radius ?? 12, kind: prop.kind });
  }
  return out;
}

// STAMP REGISTRY — the open dispatch that replaced the closed switch. Every
// built-in case below registers a VERBATIM closure (same functions, same
// per-kind default args), so the rng draw sequence for existing layouts is
// byte-identical (golden-seed verified). A package adds a set-piece with ONE
// registerStamp call; boot validation (validateStamps) checks every layout
// entry in ZONES/TILESETS against the live registry, so the safety net the
// closed union provided lives on as a loud warning instead of a compile error.
export type StampHandler = (ctx: GenCtx, spec: StampSpec) => void;

const STAMP_HANDLERS: Record<string, StampHandler> = {};

/** Register a set-piece stamp under an open-string kind (see StampKind). */
export function registerStamp(id: string, h: StampHandler): void {
  if (STAMP_HANDLERS[id]) console.warn(`[stamps] re-registering stamp '${id}' — overriding`);
  STAMP_HANDLERS[id] = h;
}

/** Is a stamp kind registered? (Boot validation for layout refs.) */
export function hasStamp(id: string): boolean { return id in STAMP_HANDLERS; }

const unknownStampWarned = new Set<string>();

/** Apron-gap warns fire ONCE per def+door (`<defId>/d<n>`): a generator gap
 *  repeats identically on every mint of that blueprint — one line suffices. */
const apronWarned = new Set<string>();
const unknownFieldWarned = new Set<string>();

/** Compile a WHERE band into a fieldGate (the strata gate findSpot reads).
 *  Shared by stamp() and composition-site resolution so both speak the same
 *  vocabulary. Unknown fields warn once and gate nothing — a band that failed
 *  to load degrades to ungated placement, never to a dead entry. */
function compileFieldGate(ctx: GenCtx, where: WhereSpec | undefined): GenCtx['fieldGate'] {
  if (!where) return undefined;
  const factory = GEN_FIELDS[where.field];
  if (!factory) {
    if (!unknownFieldWarned.has(where.field)) {
      unknownFieldWarned.add(where.field);
      console.warn(`[genfields] layout entry references unregistered field '${where.field}' — band ignored`);
    }
    return undefined;
  }
  return {
    sample: factory(ctx, where.params ?? {}),
    min: where.min ?? 0,
    max: where.max ?? Infinity,
  };
}

export function stamp(ctx: GenCtx, spec: StampSpec): void {
  const h = STAMP_HANDLERS[spec.kind];
  if (!h) {
    if (!unknownStampWarned.has(spec.kind)) {
      unknownStampWarned.add(spec.kind);
      console.warn(`[stamps] layout references unregistered stamp '${spec.kind}' — skipped`);
    }
    return;
  }
  // The stamp's rule relaxations ride the ctx for the duration of the handler
  // (read by clearOf/inReserved/findSpot); doodads born under a 'portalClear'
  // waiver are tagged keep so the convex portal-clear splice spares them.
  const n0 = ctx.doodads.length;
  // SAVE/RESTORE the transients (not clear-to-undefined): a future composite
  // handler that re-enters stamp() must hand the outer stamp its band and
  // relaxations back, and a throwing field factory must not leak ruleOver.
  const prevRule = ctx.ruleOver;
  const prevGate = ctx.fieldGate;
  try {
    ctx.ruleOver = spec.rules;
    // WHERE band: compile the spec's strata gate once for the handler's whole
    // run (findSpot reads it after every legacy check). Unset bounds are
    // UNBOUNDED (min ?? 0, max ?? Infinity): `{field:'radial', min:0.6}`
    // means "the rim, however far it runs", not "up to 1".
    ctx.fieldGate = compileFieldGate(ctx, spec.where);
    h(ctx, spec);
  } finally {
    ctx.ruleOver = prevRule;
    ctx.fieldGate = prevGate;
  }
  if (spec.rules?.ignore?.includes('portalClear')) {
    for (let i = n0; i < ctx.doodads.length; i++) ctx.doodads[i].keep = true;
  }
  // TERRAIN SWALLOWS SCATTER: a stamp that lays ENGULFING terrain (chasm
  // ravines/pools — DoodadRule.swallowsSolids) removes earlier solids and
  // triggers its discs now cover: a boulder hovering over a freshly-cut pit is
  // a draw error, not composition. Water/mud deliberately keep LAPPING their
  // boulders (their rule stays false); rule-breaker stamps' `keep` doodads and
  // reserved structure footprints are spared. Draw-free (no rng) — zones
  // without an engulf overlap stay byte-identical.
  let frame = n0; // where this stamp's own doodads begin — shifts as pre-stamp doodads splice out
  for (let i = frame; i < ctx.doodads.length; i++) {
    const blob = ctx.doodads[i];
    if (!doodadRule(blob.kind).swallowsSolids) continue;
    for (let j = frame - 1; j >= 0; j--) {
      const s = ctx.doodads[j];
      const cls = doodadRule(s.kind).overlap;
      if (s.keep || (cls !== 'solid' && cls !== 'trigger')) continue;
      if (inReserved(ctx, s.pos, s.radius)) continue;
      if (dist(s.pos, blob.pos) >= blob.radius - s.radius * 0.2) continue;
      if (doodadRule(s.kind).seedPaired) {
        let ordinal = 0;
        for (let k = 0; k < j; k++) if (ctx.doodads[k].kind === s.kind) ordinal++;
        if (ordinal < ctx.caveSeeds.length) ctx.caveSeeds.splice(ordinal, 1);
      }
      ctx.doodads.splice(j, 1);
      i--; frame--; // everything at or above j shifted down one
    }
  }
}

// DEFAULT SIZE RANGES are deliberately WIDE (roughly ±40% past the old
// bounds, skewed larger): the same stamp rolls a puddle in one zone and a
// proper lake in the next, a pebble field here and a boulder run there —
// terrain features stop reading as same-sized cookie cutters. A layout entry
// that wants a tight band still overrides via `spec.radius`.
registerStamp('rocks', (ctx, spec) => stampRock(ctx, spec.radius ?? [14, 58]));
registerStamp('cliff', (ctx) => stampCliff(ctx));
registerStamp('mud', (ctx) => stampBlob(ctx, 'mud', [20, 62], [5, 9], false));
registerStamp('swamp', (ctx) => stampBlob(ctx, 'swamp', [24, 68], [7, 12], false));
registerStamp('bog', (ctx) => stampBlob(ctx, 'bog', [22, 60], [5, 9], false));
registerStamp('water', (ctx, spec) => stampBlob(ctx, 'water', spec.radius ?? [26, 92], [6, 12], false));
registerStamp('ice', (ctx) => stampBlob(ctx, 'ice', [26, 80], [6, 11], false));
registerStamp('chasm', (ctx) => stampBlob(ctx, 'chasm', [28, 76], [6, 12], true));
registerStamp('ravine', (ctx) => stampRavine(ctx));
registerStamp('river', (ctx) => stampRiver(ctx));
registerStamp('ruin', (ctx) => stampRuin(ctx));
registerStamp('camp', (ctx) => stampCamp(ctx));
registerStamp('trees', (ctx, spec) => stampTree(ctx, spec.radius ?? [12, 30]));
registerStamp('grove', (ctx) => stampGrove(ctx));
registerStamp('grass', (ctx) => stampBlob(ctx, 'grass', [16, 54], [4, 8], false));
registerStamp('brush', (ctx) => stampBlob(ctx, 'brush', [20, 56], [3, 6], false));
registerStamp('sand', (ctx) => stampBlob(ctx, 'sand', [24, 72], [5, 9], false));
// Desert heat: shimmering-air patches (sunscorch fields — World.updateHeat).
registerStamp('heat_shimmer', (ctx, spec) => stampBlob(ctx, 'heat_shimmer', spec.radius ?? [40, 85], [2, 4], false));
// The doodad kingdom (round 4): singles place like trees; patches blob.
const stampSingle = (kind: DoodadKind, dflt: [number, number]) =>
  (ctx: GenCtx, spec: StampSpec): void => {
    const r = ctx.rng.range((spec.radius ?? dflt)[0], (spec.radius ?? dflt)[1]);
    const p = findSpot(ctx, r, true, doodadRule(kind).spacing ?? 0, true, kind);
    if (p) ctx.doodads.push({ pos: p, radius: r, kind, rot: ctx.rng.range(0, Math.PI * 2) });
  };
registerStamp('dead_tree', stampSingle('dead_tree', [14, 26]));
registerStamp('stump', stampSingle('stump', [9, 15]));
registerStamp('log', stampSingle('log', [12, 20]));
registerStamp('cactus', stampSingle('cactus', [10, 18]));
registerStamp('dune_crest', stampSingle('dune_crest', [24, 40]));
registerStamp('salt_pillar', stampSingle('salt_pillar', [10, 16]));
registerStamp('glass_shard', stampSingle('glass_shard', [8, 14]));
registerStamp('bone_arch', stampSingle('bone_arch', [22, 34]));
registerStamp('sun_awning', stampSingle('sun_awning', [26, 36]));
registerStamp('vault_gate', stampSingle('vault_gate', [26, 32]));
registerStamp('mirage_oasis', stampSingle('mirage_oasis', [44, 62]));
registerStamp('mirage_bastion', stampSingle('mirage_bastion', [50, 70]));
registerStamp('mirage_caravan', stampSingle('mirage_caravan', [44, 60]));
// Ruin furniture rows (clusters place these as pieces already; the buried
// vault's tileset rows scatter them straight, so they need stamps too).
registerStamp('broken_column', stampSingle('broken_column', [12, 17]));
registerStamp('ruin_plinth', stampSingle('ruin_plinth', [12, 16]));
registerStamp('geyser', stampSingle('geyser', [12, 17]));
registerStamp('brazier', stampSingle('brazier', [8, 11]));
registerStamp('standing_stone', stampSingle('standing_stone', [12, 20]));
registerStamp('bone_pile', stampSingle('bone_pile', [12, 22]));
// The rock grammar's kin: waymark cairns, gravel spills, standing pinnacles,
// and the composed BOULDER FIELD outcrop.
registerStamp('cairn', stampSingle('cairn', [11, 16]));
// The wayfarer kit: roadside & village-story singles.
registerStamp('weathered_statue', stampSingle('weathered_statue', [16, 24]));
registerStamp('wayshrine', stampSingle('wayshrine', [13, 18]));
registerStamp('gallows', stampSingle('gallows', [22, 30]));
// The parity-pass wayside kit: ley clocks, high-country stillness, and the
// poacher's tooth (its bite is a BrittleSpec — see DOODAD_RULES.rusted_snare).
registerStamp('chronolith', stampSingle('chronolith', [16, 24]));
registerStamp('meditation_cairn', stampSingle('meditation_cairn', [12, 16]));
registerStamp('rusted_snare', stampSingle('rusted_snare', [8, 11]));
// The Gloamwood croft kit: crooked canopy single (the recipe plants the
// mass; authored rows can still call one down), gourd tangles, the lone
// carved lantern, the hanged road's gibbets.
registerStamp('gloam_oak', stampSingle('gloam_oak', [38, 58]));
registerStamp('pumpkin_patch', (ctx, spec) => stampBlob(ctx, 'pumpkin_patch', spec.radius ?? [16, 30], [2, 4], false));
registerStamp('jack_o_lantern', stampSingle('jack_o_lantern', [9, 12]));
registerStamp('hanging_cage', stampSingle('hanging_cage', [20, 27]));
registerStamp('fishing_rack', stampSingle('fishing_rack', [16, 24]));
registerStamp('charcoal_mound', stampSingle('charcoal_mound', [18, 28]));
registerStamp('scree', (ctx, spec) => stampBlob(ctx, 'scree', spec.radius ?? [18, 46], [3, 6], false));
registerStamp('rock_spire', (ctx, spec) => stampSolid(ctx, 'rock_spire', spec.radius ?? [14, 26]));
registerStamp('boulder_field', (ctx) => stampBoulderField(ctx));
// Flora clarity: fruiting bush clumps + feathery fern understory.
registerStamp('berry_bush', (ctx, spec) => stampBlob(ctx, 'berry_bush', spec.radius ?? [16, 34], [2, 4], false));
registerStamp('fern', (ctx, spec) => stampBlob(ctx, 'fern', spec.radius ?? [14, 30], [3, 6], false));
// The fungal kit: bracket shelves + toadstool huddles.
registerStamp('shelf_fungus', (ctx, spec) => stampSolid(ctx, 'shelf_fungus', spec.radius ?? [12, 22]));
registerStamp('toadstool', (ctx, spec) => stampBlob(ctx, 'toadstool', spec.radius ?? [10, 20], [2, 4], false));
// The brittle kit: pot huddles, fissured plugs, and the hidden face.
registerStamp('clay_pots', (ctx, spec) => stampBlob(ctx, 'clay_pots', spec.radius ?? [9, 14], [2, 4], false));
registerStamp('crumbling_wall', (ctx, spec) => stampSolid(ctx, 'crumbling_wall', spec.radius ?? [18, 30]));
// A SECRET WALL hides flush against something that reads as wall. GRID zones:
// scan for wall-adjacent walkable cells (deterministic order), pick one far
// from the entry with the zone rng — the pop carves a pocket INTO the face.
// CONVEX zones: tuck it against the flank of a big standing solid (cliff,
// boulder) — no carve to give, but the hidden cache still pays. Draw counts:
// one pick when candidates exist, none otherwise.
registerStamp('secret_wall', (ctx) => {
  const grid = ctx.walk instanceof GridWalkField ? ctx.walk : null;
  if (grid) {
    const cs = grid.cell;
    const spots: Vec2[] = [];
    for (let y = cs * 2; y < ctx.arena.h - cs * 2; y += cs) {
      for (let x = cs * 2; x < ctx.arena.w - cs * 2; x += cs) {
        if (!grid.isWalkable(x, y)) continue;
        if (dist(vec(x, y), ctx.entry) < 320) continue;
        if (inReserved(ctx, vec(x, y), 24)) continue;
        if (!grid.isWalkable(x + cs, y) || !grid.isWalkable(x - cs, y)
          || !grid.isWalkable(x, y + cs) || !grid.isWalkable(x, y - cs)) {
          spots.push(vec(x, y));
        }
      }
    }
    if (!spots.length) return;
    const p = spots[ctx.rng.int(0, spots.length - 1)];
    ctx.doodads.push({ pos: p, radius: 16, kind: 'secret_wall' });
    return;
  }
  const hosts = ctx.doodads.filter(d =>
    (d.kind === 'cliff' || d.kind === 'rock') && d.radius >= 28
    && dist(d.pos, ctx.entry) > 320 && !inReserved(ctx, d.pos, d.radius));
  if (!hosts.length) return;
  const host = hosts[ctx.rng.int(0, hosts.length - 1)];
  const ang = ctx.rng.range(0, Math.PI * 2);
  ctx.doodads.push({
    pos: vec(host.pos.x + Math.cos(ang) * (host.radius + 12),
      host.pos.y + Math.sin(ang) * (host.radius + 12)),
    radius: 16, kind: 'secret_wall',
  });
});
// The verdure FACE-CUT sites a brush knot on a lane-facing wall cell (grid
// zones — the verdure IS the wall its pop carves into); convex zones tuck it
// against a big standing solid like its stone twin above. Draw counts: one
// pick when candidates exist, none otherwise (the secret_wall discipline).
registerStamp('verdure_face', (ctx) => {
  const grid = ctx.walk instanceof GridWalkField ? ctx.walk : null;
  if (grid) {
    const cs = grid.cell;
    const spots: Vec2[] = [];
    for (let y = cs * 2; y < ctx.arena.h - cs * 2; y += cs) {
      for (let x = cs * 2; x < ctx.arena.w - cs * 2; x += cs) {
        if (!grid.isWalkable(x, y)) continue;
        if (dist(vec(x, y), ctx.entry) < 300) continue;
        if (inReserved(ctx, vec(x, y), 24)) continue;
        if (!grid.isWalkable(x + cs, y) || !grid.isWalkable(x - cs, y)
          || !grid.isWalkable(x, y + cs) || !grid.isWalkable(x, y - cs)) {
          spots.push(vec(x, y));
        }
      }
    }
    if (!spots.length) return;
    const p = spots[ctx.rng.int(0, spots.length - 1)];
    ctx.doodads.push({ pos: p, radius: 17, kind: 'verdure_face', rot: ctx.rng.range(0, Math.PI * 2) });
    return;
  }
  const hosts = ctx.doodads.filter(d =>
    (d.kind === 'thicket' || d.kind === 'rock' || d.kind === 'cliff') && d.radius >= 26
    && dist(d.pos, ctx.entry) > 300 && !inReserved(ctx, d.pos, d.radius));
  if (!hosts.length) return;
  const host = hosts[ctx.rng.int(0, hosts.length - 1)];
  const ang = ctx.rng.range(0, Math.PI * 2);
  ctx.doodads.push({
    pos: vec(host.pos.x + Math.cos(ang) * (host.radius + 12),
      host.pos.y + Math.sin(ang) * (host.radius + 12)),
    radius: 17, kind: 'verdure_face', rot: ctx.rng.range(0, Math.PI * 2),
  });
});
// The brittle kit, wave 2: hazard breakables (pop effects ride BrittleSpec).
registerStamp('gas_pod', stampSingle('gas_pod', [14, 20]));
registerStamp('burst_sac', stampSingle('burst_sac', [12, 18]));
registerStamp('puffcap_cluster', stampSingle('puffcap_cluster', [12, 17]));
registerStamp('burial_urn', stampSingle('burial_urn', [12, 16]));
registerStamp('crystal_cluster', stampSingle('crystal_cluster', [14, 20]));
registerStamp('icicle_cluster', stampSingle('icicle_cluster', [13, 19]));
// The bog set: mire dressing + the contracting-fume bloom.
registerStamp('sunken_log', stampSingle('sunken_log', [16, 24]));
registerStamp('marsh_wisp', stampSingle('marsh_wisp', [7, 10]));
registerStamp('peat_mound', stampSingle('peat_mound', [18, 26]));
registerStamp('venom_bloom', stampSingle('venom_bloom', [12, 16]));
// The scavenger-web dressing: graveland + mire singles, and the gels'
// poured shallows (a blob body like every liquid — the pour rule welds it).
registerStamp('gel_pool', (ctx, spec) => stampBlob(ctx, 'gel_pool', spec.radius ?? [30, 56], [3, 6], false));
registerStamp('sunken_stone', stampSingle('sunken_stone', [11, 17]));
registerStamp('black_obelisk', stampSingle('black_obelisk', [13, 19]));
registerStamp('tallow_stump', stampSingle('tallow_stump', [10, 15]));
registerStamp('barrow_mound', stampSingle('barrow_mound', [26, 40]));
registerStamp('hollow_log', stampSingle('hollow_log', [16, 26]));
registerStamp('bone_cairn', stampSingle('bone_cairn', [11, 16]));
// The storm-scar kit: glassed ground, branched glass, charged shards, blooms.
registerStamp('fulgurite', stampSingle('fulgurite', [11, 17]));
registerStamp('charged_crystal', stampSingle('charged_crystal', [9, 14]));
registerStamp('static_bloom', stampSingle('static_bloom', [10, 16]));
registerStamp('storm_glass', stampSingle('storm_glass', [16, 28]));
// The hell-steppes kit: horn-blade fins, the legions' stakes, titan chains,
// glowing crust-rents — and the abyssal rent, a FALL pit (the descent's
// void_chasm idiom: the stamp marks fall:true, the recovery does the physics).
registerStamp('hell_fin', (ctx, spec) => stampSolid(ctx, 'hell_fin', spec.radius ?? [18, 34]));
registerStamp('impaler_stake', stampSingle('impaler_stake', [12, 16]));
registerStamp('hell_chain', stampSingle('hell_chain', [26, 40]));
registerStamp('ember_fissure', stampSingle('ember_fissure', [16, 26]));
registerStamp('abyssal_rent', (ctx, spec) => {
  const band = spec.radius ?? [34, 66];
  const r = ctx.rng.range(band[0], band[1]);
  const p = findSpot(ctx, r, false, 44, true, 'abyssal_rent');
  if (p) ctx.doodads.push({ pos: p, radius: r, kind: 'abyssal_rent', fall: true });
});
// The Caul kit: the invader's anatomy (data/tilesets.ts 'caul') — solid
// fins/cables/sacs through the solid path (spacing + forbidOn honored),
// ground orifices and nerve-webs through the plain scatter.
registerStamp('chitin_fin', (ctx, spec) => stampSolid(ctx, 'chitin_fin', spec.radius ?? [16, 30]));
registerStamp('black_umbilic', (ctx, spec) => stampSolid(ctx, 'black_umbilic', spec.radius ?? [22, 30]));
registerStamp('caul_sac', (ctx, spec) => stampSolid(ctx, 'caul_sac', spec.radius ?? [12, 20]));
registerStamp('caul_eyes', stampSingle('caul_eyes', [12, 18]));
registerStamp('maw_pit', stampSingle('maw_pit', [26, 36]));
registerStamp('nerve_root', stampSingle('nerve_root', [20, 30]));
// The apothecary kit: brew-yard furniture (formations.ts herbalists_croft
// composes them) + the lone wellspring pool.
registerStamp('alembic', stampSingle('alembic', [10, 14]));
registerStamp('herb_rack', (ctx, spec) => stampSolid(ctx, 'herb_rack', spec.radius ?? [12, 16]));
registerStamp('cauldron', (ctx, spec) => stampSolid(ctx, 'cauldron', spec.radius ?? [12, 16]));
registerStamp('spring_pool', stampSingle('spring_pool', [34, 52]));
// The ossuary kit: bone dunes, reliquary shelf-walls, and the overflow pits —
// the Necropolis' interior vocabulary (data/tilesets.ts 'ossuary').
registerStamp('bone_mound', (ctx, spec) => stampSolid(ctx, 'bone_mound', spec.radius ?? [26, 48]));
registerStamp('ossuary_niche', (ctx, spec) => stampSolid(ctx, 'ossuary_niche', spec.radius ?? [18, 26]));
registerStamp('charnel_pit', stampSingle('charnel_pit', [26, 44]));
// The leyline + abyss kits: fonts and resonance nodes stand solid; conduits
// and cracks lay as ground glow (their chains come from formations).
registerStamp('ley_conduit', stampSingle('ley_conduit', [18, 28]));
registerStamp('ley_font', (ctx, spec) => stampSolid(ctx, 'ley_font', spec.radius ?? [14, 24]));
registerStamp('pyre_node', (ctx, spec) => stampSolid(ctx, 'pyre_node', spec.radius ?? [16, 22]));
registerStamp('gale_node', (ctx, spec) => stampSolid(ctx, 'gale_node', spec.radius ?? [16, 22]));
registerStamp('rime_node', (ctx, spec) => stampSolid(ctx, 'rime_node', spec.radius ?? [16, 22]));
registerStamp('stone_node', (ctx, spec) => stampSolid(ctx, 'stone_node', spec.radius ?? [16, 22]));
registerStamp('abyss_crack', stampSingle('abyss_crack', [20, 34]));
registerStamp('abyss_spine', (ctx, spec) => stampSolid(ctx, 'abyss_spine', spec.radius ?? [12, 22]));
// The colosseum's seats (recipe-placed in rings; the stamp keeps the kind a
// legal tileset row for any other builder that wants a bench of watchers).
registerStamp('crowd_row', stampSingle('crowd_row', [20, 28]));
// The river-of-flame kit: the forge-altar (cluster-anchored in practice; the
// stamp keeps it a legal tileset row), gibbet cages, banners, bone-pyres.
registerStamp('hellforge_anvil', (ctx, spec) => stampSolid(ctx, 'hellforge_anvil', spec.radius ?? [38, 46]));
registerStamp('soul_cage', stampSingle('soul_cage', [11, 15]));
registerStamp('demon_banner', stampSingle('demon_banner', [11, 15]));
registerStamp('pyre_heap', stampSingle('pyre_heap', [16, 24]));
// The boundary-gate + durance kit (arch/pylon are composable-pushed in
// practice; their stamps keep them legal tileset rows).
registerStamp('gate_arch', stampSingle('gate_arch', [60, 80]));
registerStamp('gate_pylon', (ctx, spec) => stampSolid(ctx, 'gate_pylon', spec.radius ?? [20, 28]));
registerStamp('hate_brazier', stampSingle('hate_brazier', [8, 11]));
registerStamp('torture_rack', stampSingle('torture_rack', [16, 22]));
registerStamp('hate_idol', stampSingle('hate_idol', [14, 20]));
// The war-wound kit (the surface rift): the ground-scar pair.
registerStamp('hate_rent', stampSingle('hate_rent', [16, 26]));
registerStamp('hate_glass', (ctx, spec) => stampSolid(ctx, 'hate_glass', spec.radius ?? [18, 36]));
// The thorn kin: a lone gnarled briar tree (walk-under bramble crown).
registerStamp('briarwood', stampSingle('briarwood', [18, 30]));
// The undergrowth kit: the jungle's own scatter — cuttable plugs, sight-only
// curtains, emergent giants, root fins, and the gloom's own lights.
registerStamp('jungle_brush', stampSingle('jungle_brush', [22, 30]));
registerStamp('liana_veil', stampSingle('liana_veil', [26, 40]));
registerStamp('canopy_colossus', (ctx, spec) => stampTree(ctx, spec.radius ?? [64, 96], 'canopy_colossus'));
registerStamp('strangler_root', (ctx, spec) => stampSolid(ctx, 'strangler_root', spec.radius ?? [16, 28]));
registerStamp('jungle_bloom', stampSingle('jungle_bloom', [10, 14]));
// The sunken-ruin gate (usually composition-cluster-placed — this row exists
// for layouts that want a stray descent).
registerStamp('ruin_gate', stampSingle('ruin_gate', [26, 32]));
// The undergrowth kit, wave 2: the fringe is recipe-placed along wall faces
// (these rows serve layouts that want strays); coils usually arrive as the
// vine_mass formation.
registerStamp('verdure_fringe', stampSingle('verdure_fringe', [13, 19]));
registerStamp('vine_coil', stampSingle('vine_coil', [15, 20]));
// The Aetherial kit: cloud furniture + the choir's marble.
registerStamp('cloud_billow', stampSingle('cloud_billow', [22, 44]));
registerStamp('aether_crystal', stampSingle('aether_crystal', [13, 22]));
registerStamp('seraph_statue', stampSingle('seraph_statue', [16, 24]));
registerStamp('harp_pillar', stampSingle('harp_pillar', [10, 14]));
registerStamp('prayer_bell', stampSingle('prayer_bell', [9, 12]));
// The High Heavens kit: monuments of the courts.
registerStamp('spire_of_dawn', stampSingle('spire_of_dawn', [26, 36]));
registerStamp('aureate_brazier', stampSingle('aureate_brazier', [9, 12]));
// The Driftways kit: wind furniture.
registerStamp('zephyr_totem', stampSingle('zephyr_totem', [11, 15]));
registerStamp('sky_lantern', stampSingle('sky_lantern', [8, 11]));
registerStamp('mist_font', stampSingle('mist_font', [14, 18]));
registerStamp('skyglass_spur', stampSingle('skyglass_spur', [9, 14]));
registerStamp('updraft_vent', stampSingle('updraft_vent', [16, 22]));
registerStamp('cloudwool_tuft', stampSingle('cloudwool_tuft', [10, 16]));
registerStamp('chime_stand', stampSingle('chime_stand', [10, 13]));
registerStamp('mist_pool', stampSingle('mist_pool', [16, 24]));
registerStamp('stormglass_shard', stampSingle('stormglass_shard', [9, 14]));
registerStamp('haven_stone', stampSingle('haven_stone', [12, 16]));
registerStamp('gale_vane', stampSingle('gale_vane', [9, 12]));
registerStamp('cloud_coral', stampSingle('cloud_coral', [16, 30]));
registerStamp('spire_of_gales', stampSingle('spire_of_gales', [24, 32]));
// The flesh kit: breathing membranes, pulsing veins, watching stalks, the
// last tenant's ribs, and (rarely) a row of teeth.
registerStamp('flesh_membrane', (ctx, spec) => stampBlob(ctx, 'flesh_membrane', spec.radius ?? [24, 48], [3, 5], false));
registerStamp('vein_cluster', (ctx, spec) => stampBlob(ctx, 'vein_cluster', spec.radius ?? [22, 42], [2, 4], false));
registerStamp('eye_stalk', (ctx, spec) => stampSolid(ctx, 'eye_stalk', spec.radius ?? [11, 18]));
registerStamp('rib_arch', (ctx, spec) => stampSolid(ctx, 'rib_arch', spec.radius ?? [16, 28]));
registerStamp('tooth_row', (ctx, spec) => stampSolid(ctx, 'tooth_row', spec.radius ?? [18, 30]));
// The flesh country kit: blood/bile/tear pools pour; clots, arteries, polyps,
// knuckles and eye-knots are chamber clutter. (Sphincters are never scattered —
// the tract generator seats them in the throats it carves, door state and all.)
registerStamp('blood_pool', (ctx, spec) => stampBlob(ctx, 'blood_pool', spec.radius ?? [28, 54], [3, 6], false));
registerStamp('clot_mound', (ctx, spec) => stampSolid(ctx, 'clot_mound', spec.radius ?? [16, 28]));
registerStamp('artery_stalk', (ctx, spec) => stampSolid(ctx, 'artery_stalk', spec.radius ?? [10, 16]));
registerStamp('chyme_pool', (ctx, spec) => stampBlob(ctx, 'chyme_pool', spec.radius ?? [24, 48], [3, 5], false));
registerStamp('gas_polyp', (ctx, spec) => stampSolid(ctx, 'gas_polyp', spec.radius ?? [10, 15]));
registerStamp('villus_bed', (ctx, spec) => stampBlob(ctx, 'villus_bed', spec.radius ?? [22, 44], [3, 5], false));
registerStamp('gut_knuckle', (ctx, spec) => stampSolid(ctx, 'gut_knuckle', spec.radius ?? [18, 32]));
registerStamp('ocular_knot', (ctx, spec) => stampSolid(ctx, 'ocular_knot', spec.radius ?? [13, 20]));
registerStamp('lash_bed', (ctx, spec) => stampBlob(ctx, 'lash_bed', spec.radius ?? [20, 40], [2, 4], false));
registerStamp('weep_spring', (ctx, spec) => stampBlob(ctx, 'weep_spring', spec.radius ?? [14, 26], [2, 3], false));
registerStamp('colossal_heart', (ctx, spec) => stampSolid(ctx, 'colossal_heart', spec.radius ?? [40, 56]));
registerStamp('flowers', (ctx, spec) => stampBlob(ctx, 'flowers', spec.radius ?? [16, 44], [3, 6], false));
registerStamp('reeds', (ctx, spec) => stampBlob(ctx, 'reeds', spec.radius ?? [16, 36], [3, 6], false));
registerStamp('web', (ctx, spec) => stampBlob(ctx, 'web', spec.radius ?? [18, 40], [2, 4], false));
registerStamp('snowdrift', (ctx, spec) => stampBlob(ctx, 'snowdrift', spec.radius ?? [22, 60], [4, 7], false));
// A FAIRY RING: glow-caps standing in a circle (grove/mycelia set-piece).
registerStamp('mushroom_ring', (ctx, spec) => {
  const R = ctx.rng.range((spec.radius ?? [34, 60])[0], (spec.radius ?? [34, 60])[1]);
  const center = findSpot(ctx, R + 14, true, 24, true, 'glow_cap');
  if (!center) return;
  // The FAIRY RING proper: glow-caps alternating with speckled toadstool
  // huddles around the circle — folklore says don't stand in the middle.
  const n = ctx.rng.int(5, 8);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + ctx.rng.range(-0.15, 0.15);
    const toad = i % 2 === 1;
    ctx.doodads.push({
      pos: vec(center.x + Math.cos(a) * R, center.y + Math.sin(a) * R),
      radius: toad ? ctx.rng.range(8, 13) : ctx.rng.range(6, 10),
      kind: toad ? 'toadstool' : 'glow_cap',
    });
  }
});
registerStamp('vines', (ctx) => stampBlob(ctx, 'vines', [20, 56], [4, 8], true));
registerStamp('lava', (ctx) => stampBlob(ctx, 'lava', [26, 68], [5, 9], true));
registerStamp('magma_core', (ctx) => stampBlob(ctx, 'magma_core', [24, 60], [4, 8], true));
registerStamp('shallows', (ctx) => stampShallows(ctx));
registerStamp('palm', (ctx, spec) => stampTree(ctx, spec.radius ?? [16, 28], 'palm'));
registerStamp('conifers', (ctx, spec) => stampTree(ctx, spec.radius ?? [13, 26], 'conifer'));
registerStamp('ancient_tree', (ctx, spec) => stampTree(ctx, spec.radius ?? [56, 88], 'ancient_tree'));
/** A WORN PATH — road discs marching a jittered line clear across the zone:
 *  the desire path travelers cut when nobody builds them a road. Crosses the
 *  whole space so paths INTERSECT into worn crossings when stamped twice. */
registerStamp('road', (ctx) => {
  const { w, h } = ctx.arena;
  const ang = ctx.rng.range(0, Math.PI);
  const cx = w / 2 + ctx.rng.range(-w * 0.18, w * 0.18);
  const cy = h / 2 + ctx.rng.range(-h * 0.18, h * 0.18);
  const reach = Math.hypot(w, h) * 0.6;
  const step = 34;
  const R: [number, number] = [20, 30];
  for (let d = -reach; d <= reach; d += step) {
    const wob = Math.sin(d * 0.008 + ang * 7) * 46 + ctx.rng.range(-10, 10);
    const px = cx + Math.cos(ang) * d + Math.cos(ang + Math.PI / 2) * wob;
    const py = cy + Math.sin(ang) * d + Math.sin(ang + Math.PI / 2) * wob;
    if (px < 40 || py < 40 || px > w - 40 || py > h - 40) continue;
    ctx.doodads.push({ pos: vec(px, py), radius: ctx.rng.range(R[0], R[1]), kind: 'road' });
  }
});
registerStamp('ice_spike', stampSingle('ice_spike', [10, 20]));
registerStamp('snowman', stampSingle('snowman', [11, 14]));
registerStamp('signpost', stampSingle('signpost', [10, 12]));
registerStamp('firewood_pile', stampSingle('firewood_pile', [12, 16]));
registerStamp('fountain', stampSingle('fountain', [34, 42]));
registerStamp('well', stampSingle('well', [16, 20]));
registerStamp('lantern_post', stampSingle('lantern_post', [9, 11]));
registerStamp('bench', stampSingle('bench', [12, 15]));
registerStamp('market_stall', stampSingle('market_stall', [22, 28]));
registerStamp('broken_cart', stampSingle('broken_cart', [18, 24]));
registerStamp('scarecrow', stampSingle('scarecrow', [10, 13]));
registerStamp('hay_bale', stampSingle('hay_bale', [13, 17]));
registerStamp('pot_cluster', stampSingle('pot_cluster', [11, 15]));
registerStamp('rubble', (ctx, spec) => stampBlob(ctx, 'rubble', spec.radius ?? [22, 48], [2, 4], false));
registerStamp('banner_post', stampSingle('banner_post', [9, 11]));
registerStamp('beehive', stampSingle('beehive', [10, 13]));
registerStamp('thicket', (ctx) => stampThicket(ctx));
registerStamp('tombstone', (ctx) => stampGraves(ctx));
registerStamp('cave', (ctx) => stampCaveMouth(ctx));
registerStamp('crystal', (ctx) => stampCrystal(ctx));
registerStamp('lava_vent', (ctx) => stampLavaVent(ctx));
// Flesh themed clutter (solids land in carved chambers; gore is a ground pool).
registerStamp('flesh_pod', (ctx, spec) => stampSolid(ctx, 'flesh_pod', spec.radius ?? [18, 30]));
registerStamp('bone', (ctx, spec) => stampSolid(ctx, 'bone', spec.radius ?? [12, 20]));
registerStamp('gore', (ctx, spec) => stampBlob(ctx, 'gore', spec.radius ?? [26, 46], [4, 7], false));
// Volcanic themed clutter.
registerStamp('obsidian', (ctx, spec) => stampSolid(ctx, 'obsidian', spec.radius ?? [20, 40]));
registerStamp('cinder', (ctx, spec) => stampBlob(ctx, 'cinder', spec.radius ?? [28, 50], [4, 8], false));
registerStamp('ember_vent', (ctx) => stampEmberVent(ctx));
// Marine clutter: kelp fields (walkable beds), coral heads + rocky outcrops (solids).
registerStamp('kelp', (ctx, spec) => stampBlob(ctx, 'kelp', spec.radius ?? [22, 40], [3, 6], false));
// The kelp TREE — a lone stipe; forests come from the 'kelp_forest' cluster.
registerStamp('giant_kelp', (ctx, spec) => stampSolid(ctx, 'giant_kelp', spec.radius ?? [26, 42]));
registerStamp('coral', (ctx, spec) => stampSolid(ctx, 'coral', spec.radius ?? [16, 28]));
registerStamp('sea_rock', (ctx, spec) => stampSolid(ctx, 'sea_rock', spec.radius ?? [22, 40]));
// Mycelia fungal clutter: towering caps + spires (solids), puffing spore-pods
// (active), glow-caps + a hyphal carpet (walkable ground overlays).
registerStamp('giant_mushroom', (ctx, spec) => stampSolid(ctx, 'giant_mushroom', spec.radius ?? [24, 42]));
registerStamp('fruiting_tower', (ctx, spec) => stampSolid(ctx, 'fruiting_tower', spec.radius ?? [26, 40]));
registerStamp('spore_pod', (ctx) => stampSporePod(ctx));
registerStamp('glow_cap', (ctx, spec) => stampSolid(ctx, 'glow_cap', spec.radius ?? [8, 14]));
registerStamp('mycelial_mat', (ctx, spec) => stampBlob(ctx, 'mycelial_mat', spec.radius ?? [30, 52], [4, 7], false));
registerStamp('structure', (ctx, spec) => {
  const s = spec.structure ? STRUCTURES[spec.structure] : undefined;
  if (!s) return;
  // Plan/generator defs route through the plan pipeline; legacy walls/props defs
  // keep the VERBATIM classic path (dispatch gated on the def, so the rng draw
  // pattern of every existing structure stamp is untouched).
  if (s.plan || s.generator) { placeStructurePlan(ctx, s); return; }
  const at = findSpot(ctx, Math.max(s.halfW, s.halfH) * 1.3, true, 30);
  if (at && areaFreeOf(ctx, at, Math.max(s.halfW, s.halfH) * 1.2, hazardGrounds())) {
    placeStructure(ctx, s, at);
  }
});
registerStamp('cluster', (ctx, spec) => {
  const def = spec.cluster ? CLUSTERS[spec.cluster] : undefined;
  if (!def) return;
  stampCluster(ctx, def);
});
registerStamp('landmark', (ctx, spec) => {
  const def = spec.landmark ? LANDMARKS[spec.landmark] : undefined;
  if (!def) return;
  placeLandmark(ctx, def);
});

// LANDMARKS — geographic set-pieces (a fjord, a caldera, an oasis) as DATA
// recipes over the genkit shape primitives. A LandmarkDef names a registered
// BUILDER + its params; builders live in engine/landmarkBuilders.ts, recipe
// data in data/landmarks.ts. Landmarks require the walk grid (their shapes
// paint regions), reserve a circle footprint, honor the universal reachability
// invariant (mustReach anchors) or declare deliberate jump-only POCKETS, and
// may seed entity SPAWNS over their interior (an open pit crawling with them).
export interface LandmarkSpawns {
  /** Rows may carry PRESENCE envelopes — shaped by the zone's level at gen. */
  table: PackTableEntry[];
  count: [number, number];
  where: 'interior' | 'rim';
}

export interface LandmarkDef {
  id: string;
  /** LANDMARK_BUILDERS id (engine/landmarkBuilders.ts registers the library). */
  builder: string;
  /** Builder knobs — sizes, counts, variant switches; pure data. */
  params?: Record<string, unknown>;
  /** Footprint DIAMETER range (px), rolled per placement. */
  size: [number, number];
  /** Liquid id (genkit registry) builders resolve via bctx.liquid() — the
   *  same coast recipe pours water, lava, poison bog, ice, or the void. */
  liquid?: string;
  /** The anchor joins the reachability invariant (objective-grade landmark). */
  mustReach?: boolean;
  /** The interior is a deliberate jump/blink-only pocket (exempt from the
   *  invariant; spawn policy rides `spawns`). */
  pocket?: boolean;
  /** Entities seeded over the landmark (pit dwellers). */
  spawns?: LandmarkSpawns;
  /** Record the anchor as a POI (spawners/caches nest there). */
  poi?: boolean;
  /** Clear pre-existing doodads under the footprint before building. */
  clearSite?: boolean;
}

/** What a builder receives: the reserved footprint, the ensured grid, the
 *  zone rng, param/liquid resolution, and an OUT mask it fills with its
 *  interior (spawn + pocket sampling reads it; defaults to the inner disc). */
export interface LandmarkBuildCtx {
  ctx: GenCtx;
  grid: GridWalkField;
  rect: { x: number; y: number; w: number; h: number };
  center: Vec2;
  r: number;
  rng: Rng;
  def: LandmarkDef;
  param<T>(key: string, dflt: T): T;
  interior: Mask;
  /** A builder whose jump-only geometry stops short of the footprint sets the
   *  TRUE pocket radius here (the pillars' gulf ends at 0.9r); placeLandmark
   *  registers the pocket at this instead of the whole footprint, so ordinary
   *  ground on the outer ring stays under the reachability net. */
  pocketR?: number;
}

export type LandmarkBuilder = (b: LandmarkBuildCtx) => void;

const LANDMARK_BUILDERS: Record<string, LandmarkBuilder> = {};
const LANDMARKS: Record<string, LandmarkDef> = {};

export function registerLandmarkBuilder(id: string, b: LandmarkBuilder): void {
  if (LANDMARK_BUILDERS[id]) console.warn(`[landmarks] re-registering builder '${id}' — overriding`);
  LANDMARK_BUILDERS[id] = b;
}

export function registerLandmark(def: LandmarkDef): void {
  if (LANDMARKS[def.id]) console.warn(`[landmarks] re-registering '${def.id}' — overriding`);
  LANDMARKS[def.id] = def;
}

export function hasLandmark(id: string): boolean { return id in LANDMARKS; }

/** COMPOSITION EXPORTS — the pieces a layout RECIPE assembles (see
 *  engine/layoutRecipes.ts): the tileset's own decoration scatter, a landmark
 *  by id at a chosen anchor, a plan structure at a plot. Everything a recipe
 *  composes routes through the same placement/reachability machinery. */
export function scatterDecoration(ctx: GenCtx, def: ZoneDef): void { plainsLayout(ctx, def); }

export function placeLandmarkById(ctx: GenCtx, id: string, at?: Vec2): void {
  const def = LANDMARKS[id];
  if (!def) { console.warn(`[landmarks] placeLandmarkById: unknown '${id}'`); return; }
  placeLandmark(ctx, def, at);
}

export function raiseStructure(ctx: GenCtx, defId: string, at?: Vec2): void {
  const s = STRUCTURES[defId];
  if (!s) { console.warn(`[structures] raiseStructure: unknown '${defId}'`); return; }
  if (s.plan || s.generator) placeStructurePlan(ctx, s, at);
  else if (at) placeStructure(ctx, s, at);
}
export function hasLandmarkBuilder(id: string): boolean { return id in LANDMARK_BUILDERS; }
export function landmarkDefs(): LandmarkDef[] { return Object.values(LANDMARKS); }

/** Site a landmark footprint: portal/entry clearance + reservations + (on a
 *  pre-existing grid) walkable anchor probes. Draws-before-filters. */
function findLandmarkSpot(ctx: GenCtx, r: number): Vec2 | null {
  for (let tries = 0; tries < 18; tries++) {
    const p = vec(
      ctx.rng.range(BORDER + r, Math.max(BORDER + r, ctx.arena.w - BORDER - r)),
      ctx.rng.range(BORDER + r, Math.max(BORDER + r, ctx.arena.h - BORDER - r)));
    if (!clearOf(ctx, p, r * 0.8, true)) continue;
    if (inReserved(ctx, p, r * 0.8)) continue;
    // Anchor probes run on ANY grid — including a lazily-ensured one a carving
    // recipe (winding/spiral) has since repainted mostly wall: a landmark must
    // never site blind into solid rock (all-ground ensured grids pass free).
    if (ctx.walk) {
      const probes = [p, vec(p.x - r * 0.5, p.y), vec(p.x + r * 0.5, p.y), vec(p.x, p.y - r * 0.5), vec(p.x, p.y + r * 0.5)];
      if (probes.some(q => !ctx.walk!.isWalkable(q.x, q.y))) continue;
    }
    // Hazard-ground probes (the structure sitter's discipline): a pit straddling
    // an earlier recipe's lava river would bury its own approach.
    const hz = [p, vec(p.x - r * 0.6, p.y), vec(p.x + r * 0.6, p.y), vec(p.x, p.y - r * 0.6), vec(p.x, p.y + r * 0.6)];
    if (hz.some(q => pointOnKinds(ctx, q, hazardGrounds()))) continue;
    return p;
  }
  return null;
}

function placeLandmark(ctx: GenCtx, def: LandmarkDef, at?: Vec2): void {
  const builder = LANDMARK_BUILDERS[def.builder];
  if (!builder) { console.warn(`[landmarks] '${def.id}': unknown builder '${def.builder}'`); return; }
  const dia = ctx.rng.range(def.size[0], def.size[1]);
  const sited = at ?? findLandmarkSpot(ctx, dia / 2);
  if (!sited) return;
  // SNAP the footprint onto the walk lattice (the plan-structure rule): an
  // unsnapped mask origin phase-shifts every painted run one bleed cell in
  // +x/+y (fillRegion is intersect-inclusive) — thin rims seal, floors shrink.
  // Origin AND span are cell-quantized, so Mask.ox/oy/cols land exactly.
  const span = Math.ceil(dia / GEN_CELL) * GEN_CELL;
  const r = span / 2;
  const ox = Math.round((sited.x - r) / GEN_CELL) * GEN_CELL;
  const oy = Math.round((sited.y - r) / GEN_CELL) * GEN_CELL;
  const center = vec(ox + r, oy + r);
  ctx.reserved.push({ pos: vec(center.x, center.y), radius: r * 1.12 });
  if (def.clearSite) {
    for (let i = ctx.doodads.length - 1; i >= 0; i--) {
      const d = ctx.doodads[i];
      // The FULL square footprint, not the inner disc: a lake builder's lobes
      // can reach the rect's corners, and a survivor there ends up standing
      // in the poured liquid (the dune-country fulgurite lesson).
      const pad = d.radius * 0.4;
      if (d.pos.x > center.x - r - pad && d.pos.x < center.x + r + pad
        && d.pos.y > center.y - r - pad && d.pos.y < center.y + r + pad) {
        if (doodadRule(d.kind).seedPaired) {
          let ordinal = 0;
          for (let k = 0; k < i; k++) if (ctx.doodads[k].kind === d.kind) ordinal++;
          if (ordinal < ctx.caveSeeds.length) ctx.caveSeeds.splice(ordinal, 1);
        }
        ctx.doodads.splice(i, 1);
      }
    }
  }
  const grid = ensureGrid(ctx);
  const rect = { x: center.x - r, y: center.y - r, w: r * 2, h: r * 2 };
  // The interior mask frames the footprint at walk-cell resolution; builders
  // overwrite it with their true interior (spawn/pocket sampling reads it).
  const interior = Mask.forRect(rect.x, rect.y, rect.w, rect.h);
  const b: LandmarkBuildCtx = {
    ctx, grid, rect, center: vec(center.x, center.y), r, rng: ctx.rng, def,
    param: <T>(key: string, dflt: T): T => {
      const v = def.params?.[key];
      return v === undefined ? dflt : (v as T);
    },
    interior,
  };
  const preBuild = ctx.doodads.length;
  builder(b);
  // TERRAIN WINS: the builder painted rims/walls/gulfs AFTER the base layout's
  // open-ground scatter, so an earlier doodad whose footing is no longer
  // walkable is now embedded in a crater wall or hovering over a gulf — splice
  // it. Builder-placed pieces (rim rocks ON the wall ring, gulf islands) are
  // deliberate and stay: only indices < preBuild are candidates. seedPaired
  // kinds keep their parallel seed list zipped. Draw-free.
  // (A builder that POURS engulfing terrain can splice pre-build doodads and
  // shrink the array below preBuild — clamp, or the sweep reads past the end.)
  for (let i = Math.min(preBuild, ctx.doodads.length) - 1; i >= 0; i--) {
    const d = ctx.doodads[i];
    if (d.keep) continue;
    if (Math.abs(d.pos.x - center.x) > r + d.radius || Math.abs(d.pos.y - center.y) > r + d.radius) continue;
    if (grid.isWalkable(d.pos.x, d.pos.y)) continue;
    // (Solids over builder-POURED ground are the global sweepForbiddenGround
    // pass's job — one inverse, every producer.)
    if (doodadRule(d.kind).seedPaired) {
      let ordinal = 0;
      for (let k = 0; k < i; k++) if (ctx.doodads[k].kind === d.kind) ordinal++;
      if (ordinal < ctx.caveSeeds.length) ctx.caveSeeds.splice(ordinal, 1);
    }
    ctx.doodads.splice(i, 1);
  }
  // POI/mustReach anchors sit on the landmark's INTERIOR — the builder's own
  // usable-ground mask (a lake's interior is its SHORE ring, a crater's its
  // bowl floor) — snapped to the nearest interior cell that's grid-walkable.
  // The recipes' contract ("spawns/POIs live on the shore") now holds for the
  // anchor too: an oasis quest spawner sits among the palms, not mid-pool,
  // and an anchor can never strand inside a poured liquid the walk grid
  // doesn't see. Draw-free: pure geometry, row-major tie-break.
  if (def.poi || def.mustReach) {
    let anchor = vec(center.x, center.y);
    if (!b.interior.has(center.x, center.y) || !grid.isWalkable(center.x, center.y)) {
      let bd = Infinity;
      b.interior.forEach((icx, icy) => {
        const c = b.interior.center(icx, icy);
        if (!grid.isWalkable(c.x, c.y)) return;
        const dd = (c.x - center.x) ** 2 + (c.y - center.y) ** 2;
        if (dd < bd) { bd = dd; anchor = c; }
      });
    }
    if (def.poi) ctx.pois.push(vec(anchor.x, anchor.y));
    if (def.mustReach) (ctx.mustReach ??= []).push(vec(anchor.x, anchor.y));
  }
  // The pocket covers the builder's ACTUAL jump-only geometry (b.pocketR —
  // the pillars' void stops at 0.9r), not the whole footprint: ground on the
  // rim ring outside the gulf must stay under the reachability net.
  if (def.pocket) (ctx.pockets ??= []).push({ x: center.x, y: center.y, r: b.pocketR ?? r });
  // Entity SPAWNS over the landmark: weighted picks over interior/rim cells,
  // resolved AT GEN (deterministic per seed) — loadZone materializes them.
  if (def.spawns) {
    const src = def.spawns.where === 'rim' ? b.interior.edge() : b.interior;
    const cells: Vec2[] = [];
    src.forEach((cx, cy) => {
      const c = src.center(cx, cy);
      if (!ctx.walk || ctx.walk.isWalkable(c.x, c.y)) cells.push(c);
    });
    if (cells.length) {
      // Presence envelopes shape the table at the ZONE's level before the
      // seeded walk — still deterministic (pure math on a pure table).
      const table = presenceTable(def.spawns.table, ctx.level ?? 1, id => MONSTERS[id]?.presence);
      const total = table.reduce((a, e) => a + e.weight, 0);
      const n = ctx.rng.int(def.spawns.count[0], def.spawns.count[1]);
      for (let i = 0; i < n; i++) {
        let roll = ctx.rng.range(0, total);
        let pick = table[table.length - 1];
        for (const e of table) { roll -= e.weight; if (roll <= 0) { pick = e; break; } }
        const cell = cells[ctx.rng.int(0, cells.length - 1)];
        (ctx.landmarkSpawns ??= []).push({ id: pick.id, pos: vec(cell.x, cell.y) });
      }
    }
  }
}


// CLUSTER STAMPS — data-driven composites. One ClusterDef generalizes the
// bespoke grove/thicket/rock-mud stamps: an ANCHOR found by the normal
// placement rules, then PIECES scattered on a radial band around it. Pieces
// avoid solids placed before them (spread look) unless `packed`, which lets a
// cluster's own pieces overlap each other while still avoiding everything that
// existed before the cluster began (grove semantics). Registered clusters ride
// the 'cluster' stamp: `{ kind: 'cluster', cluster: 'boulder_field', count: [1,3] }`.
export interface ClusterPiece {
  kind: DoodadKind;
  radius: [number, number];
  count: [number, number];
  /** Radial offset band from the anchor center (default [20, 85]). */
  ring?: [number, number];
  /** Pieces may PACK among themselves (only avoid pre-cluster solids). */
  packed?: boolean;
  /** Draw a random spin per piece (trees/rocks read better rotated). */
  rot?: boolean;
  /** A composition CENTERPIECE: may stand inside reservations — the clearing
   *  that swept its court exists FOR it (scatter stays out, the monument
   *  stands). Every other gate still holds (solids, walk, forbidOn). */
  centerpiece?: boolean;
}

export interface ClusterDef {
  id: string;
  /** findSpot params for the cluster's center (kind supplies spacing/walk/forbid
   *  gates from its DOODAD_RULES row when given). */
  anchor: { radius: number; hard?: boolean; spacing?: number; kind?: DoodadKind };
  pieces: ClusterPiece[];
  /** Record the anchor as a POI (spawners/caches nest there). */
  poi?: boolean;
}

const CLUSTERS: Record<string, ClusterDef> = {};

/** Register a composite cluster stamp (pure data — no new engine code). */
export function registerCluster(def: ClusterDef): void {
  if (CLUSTERS[def.id]) console.warn(`[stamps] re-registering cluster '${def.id}' — overriding`);
  CLUSTERS[def.id] = def;
}

/** Is a cluster id registered? (Boot validation for layout refs.) */
export function hasCluster(id: string): boolean { return id in CLUSTERS; }

/** All registered cluster defs (boot validation walks their piece kinds). */
export function clusterDefs(): ClusterDef[] { return Object.values(CLUSTERS); }

function stampCluster(ctx: GenCtx, def: ClusterDef): void {
  const a = def.anchor;
  const spacing = a.spacing ?? (a.kind ? doodadRule(a.kind).spacing ?? 0 : 0);
  const center = ctx.siteAt ?? findSpot(ctx, a.radius, a.hard ?? true, spacing, true, a.kind);
  if (!center) return;
  const clusterStart = ctx.doodads.length;
  for (const piece of def.pieces) {
    const rule = doodadRule(piece.kind);
    const hard = !!rule.blocksMove;
    const ring = piece.ring ?? [20, 85];
    const n = ctx.rng.int(piece.count[0], piece.count[1]);
    for (let i = 0; i < n; i++) {
      // Draws happen BEFORE the filters (findSpot discipline) so a rejected
      // spot never shifts the sequence of later pieces.
      const ang = ctx.rng.range(0, Math.PI * 2);
      const off = ctx.rng.range(ring[0], ring[1]);
      const r = ctx.rng.range(piece.radius[0], piece.radius[1]);
      const rot = piece.rot ? ctx.rng.range(0, Math.PI * 2) : undefined;
      const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
      if (!clearOf(ctx, p, r, hard)) continue;
      if (!piece.centerpiece && inReserved(ctx, p, r)) continue;
      if (ctx.walk && walkGated(piece.kind) && !ruleIgnored(ctx, 'walk') && !ctx.walk.isWalkable(p.x, p.y)) continue;
      // The kind's forbidOn holds for cluster pieces exactly as it does for
      // findSpot placements and formation pieces (a cluster's cairn must not
      // balance on lava any more than a scattered one).
      if (rule.forbidOn && !ruleIgnored(ctx, 'forbid') && !areaFreeOf(ctx, p, r, rule.forbidOn)) continue;
      if (isSolid(piece.kind)
          && overlapsSolidBefore(ctx, p, r, piece.packed ? clusterStart : ctx.doodads.length)) continue;
      ctx.doodads.push({ pos: p, radius: r, kind: piece.kind, rot });
    }
  }
  if (def.poi) ctx.pois.push(center);
}

// FORMATION STAMPS — patterned arrangements along ANCHOR CHAINS: the grammar
// layer above clusters. A cluster is a radial huddle around one point; a
// formation is a line of windbreak pines, a meandering boulder train, an arc
// of dune ridges, a ring of gravestones — pieces planted along a chain a
// registered ARRANGER lays out. Everything data: a FormationDef names its
// arranger + pieces; new arrangement shapes register alongside line/meander/
// arc/ring with one call; tilesets ride `{kind:'formation', formation: id}`
// exactly like clusters. Pieces honor every placement gate the scatter does
// (portal clears, reservations, walk-gating, forbidOn) and pack freely among
// THEMSELVES — a windrow's crowns are supposed to knit.

export interface FormationPiece {
  kind: DoodadKind;
  radius: [number, number];
  // (rot below: `true` = random spin per piece; `'chain'` = face ALONG the
  // anchor chain — walls and shelf-rows align to their line, a ring's pieces
  // face its tangent. 'chain' draws NO rng — the heading is the chain's own.)
  /** Plant at every Nth chain anchor (default 1 = each anchor). */
  every?: number;
  /** Radial scatter around the anchor (default 0 = dead on the chain). */
  jitter?: number;
  /** Pieces per selected anchor (default [1, 1]). */
  count?: [number, number];
  /** Random spin per piece (trees/stones read better rotated). */
  rot?: boolean | 'chain';
}

export interface FormationDef {
  id: string;
  /** The anchor-chain ARRANGER (open registry): 'line' | 'meander' | 'arc' |
   *  'ring' | a package's own. */
  arrange: string;
  /** Chain extent band, world units — line/meander LENGTH, arc/ring RADIUS. */
  span: [number, number];
  /** Anchor spacing along the chain (default 46). */
  step?: number;
  /** Arranger knobs (meander wobble, arc sweep fraction…). */
  params?: Record<string, unknown>;
  pieces: FormationPiece[];
  /** Chain siting clearance override (default derives from span + arrange). */
  siteRadius?: number;
  /** Portal-margin policy for the chain + pieces (default false = soft). */
  hard?: boolean;
}

/** Lays the anchor chain: `start` is the sited chain origin (line/meander) or
 *  center (arc/ring). Draw ONLY from rng (seed-deterministic), return the
 *  anchors in chain order. */
export type FormationArranger = (ctx: GenCtx, def: FormationDef, start: Vec2, rng: Rng) => Vec2[];

/** How an arranger USES its start point — drives the default siting clearance
 *  (stampFormation): `around` arrangers (arc/ring/orbit/grid) treat start as a
 *  CENTER and want their whole extent clear-ish; chain arrangers (line/
 *  meander/braid) treat it as an origin and only need their head sited.
 *  `siteFrac` overrides the span[1] fraction used for the clearance probe. */
export interface FormationArrangerMeta {
  around?: boolean;
  siteFrac?: number;
}

const FORMATION_ARRANGERS: Record<string, FormationArranger> = {};
const FORMATION_ARRANGER_META: Record<string, FormationArrangerMeta> = {};
const FORMATIONS: Record<string, FormationDef> = {};

export function registerFormationArranger(id: string, a: FormationArranger, meta?: FormationArrangerMeta): void {
  if (FORMATION_ARRANGERS[id]) console.warn(`[formations] re-registering arranger '${id}' — overriding`);
  FORMATION_ARRANGERS[id] = a;
  if (meta) FORMATION_ARRANGER_META[id] = meta;
}

export function registerFormation(def: FormationDef): void {
  if (FORMATIONS[def.id]) console.warn(`[formations] re-registering '${def.id}' — overriding`);
  FORMATIONS[def.id] = def;
}

export function hasFormation(id: string): boolean { return id in FORMATIONS; }
export function hasFormationArranger(id: string): boolean { return id in FORMATION_ARRANGERS; }

/** All registered formation defs (boot validation walks their pieces). */
export function formationDefs(): FormationDef[] { return Object.values(FORMATIONS); }

registerFormationArranger('line', (ctx, def, start, rng) => {
  const span = rng.range(def.span[0], def.span[1]);
  const dir = rng.range(0, Math.PI * 2);
  const step = def.step ?? 46;
  const pts: Vec2[] = [];
  for (let s = 0; s <= span; s += step) {
    pts.push(vec(start.x + Math.cos(dir) * s, start.y + Math.sin(dir) * s));
  }
  return pts;
});

registerFormationArranger('meander', (ctx, def, start, rng) => {
  const span = rng.range(def.span[0], def.span[1]);
  const dir = rng.range(0, Math.PI * 2);
  const wobble = typeof def.params?.wobble === 'number' ? def.params.wobble : 26;
  const to = vec(start.x + Math.cos(dir) * span, start.y + Math.sin(dir) * span);
  return wanderPath(rng, start, to, { step: def.step ?? 46, wobble });
});

registerFormationArranger('arc', (ctx, def, start, rng) => {
  const radius = rng.range(def.span[0], def.span[1]);
  const sweep = (typeof def.params?.sweep === 'number' ? def.params.sweep : rng.range(0.3, 0.6)) * Math.PI * 2;
  const a0 = rng.range(0, Math.PI * 2);
  const step = def.step ?? 46;
  const pts: Vec2[] = [];
  for (let a = 0; a <= sweep; a += step / Math.max(step, radius)) {
    pts.push(vec(start.x + Math.cos(a0 + a) * radius, start.y + Math.sin(a0 + a) * radius));
  }
  return pts;
});

registerFormationArranger('ring', (ctx, def, start, rng) => {
  const radius = rng.range(def.span[0], def.span[1]);
  const a0 = rng.range(0, Math.PI * 2);
  const step = def.step ?? 46;
  const n = Math.max(3, Math.round((Math.PI * 2 * radius) / step));
  const pts: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    pts.push(vec(start.x + Math.cos(a) * radius, start.y + Math.sin(a) * radius));
  }
  return pts;
});

/** A rotated LATTICE around `start` — orchard rows, tomb plots, pillar halls.
 *  span = the lattice's LONG side; step = column gap along each row. params:
 *  rows ([lo,hi] roll, default derives near-square from `aspect`), rowGap
 *  (default step), aspect (short/long ratio when rows derive, default 0.62).
 *  Anchors run SERPENTINE (row 0 left→right, row 1 right→left…) so `every`
 *  cadences stay spatially coherent. Draws: span, angle, then rows only when
 *  the def asks for a roll — def-conditional, stable per def. */
registerFormationArranger('grid', (ctx, def, start, rng) => {
  const span = rng.range(def.span[0], def.span[1]);
  const angle = rng.range(0, Math.PI * 2);
  const step = def.step ?? 46;
  const rowGap = typeof def.params?.rowGap === 'number' ? def.params.rowGap : step;
  const aspect = typeof def.params?.aspect === 'number' ? def.params.aspect : 0.62;
  const rowBand = Array.isArray(def.params?.rows) ? def.params.rows as [number, number] : undefined;
  const rows = Math.max(2, rowBand
    ? rng.int(rowBand[0], rowBand[1])
    : Math.round((span * aspect) / Math.max(1, rowGap)) + 1);
  const cols = Math.max(2, Math.floor(span / step) + 1);
  const ux = Math.cos(angle), uy = Math.sin(angle);        // along a row
  const vx = -uy, vy = ux;                                 // across rows
  const w = (cols - 1) * step, h = (rows - 1) * rowGap;
  const pts: Vec2[] = [];
  for (let rI = 0; rI < rows; rI++) {
    for (let cI = 0; cI < cols; cI++) {
      const c = rI % 2 ? cols - 1 - cI : cI;               // serpentine
      const ox = c * step - w / 2, oy = rI * rowGap - h / 2;
      pts.push(vec(start.x + ux * ox + vx * oy, start.y + uy * ox + vy * oy));
    }
  }
  return pts;
}, { around: true, siteFrac: 0.55 });

/** CONCENTRIC RINGS around `start` — druidic stone circles, fairy courts,
 *  camp rings. span = the OUTER radius; each ring's anchor count derives from
 *  its circumference / step. params: rings ([lo,hi] roll, default [2,3]),
 *  innerFrac (innermost ring's fraction of the outer radius, default
 *  1/rings). Rings run inner→outer, each phase-offset by the golden angle so
 *  spokes never align into artificial rays. Draws: radius, a0, rings roll. */
registerFormationArranger('orbit', (ctx, def, start, rng) => {
  const outer = rng.range(def.span[0], def.span[1]);
  const a0 = rng.range(0, Math.PI * 2);
  const ringBand = Array.isArray(def.params?.rings) ? def.params.rings as [number, number] : [2, 3];
  const rings = Math.max(1, rng.int(ringBand[0], ringBand[1]));
  const step = def.step ?? 46;
  const innerFrac = typeof def.params?.innerFrac === 'number' ? def.params.innerFrac : 1 / rings;
  const inner = outer * Math.max(0.1, Math.min(1, innerFrac));
  const GOLDEN = 2.399963229728653;
  const pts: Vec2[] = [];
  for (let rI = 0; rI < rings; rI++) {
    const radius = rings === 1 ? outer : inner + ((outer - inner) * rI) / (rings - 1);
    const n = Math.max(3, Math.round((Math.PI * 2 * radius) / step));
    const phase = a0 + rI * GOLDEN;
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * Math.PI * 2;
      pts.push(vec(start.x + Math.cos(a) * radius, start.y + Math.sin(a) * radius));
    }
  }
  return pts;
}, { around: true, siteFrac: 0.9 });

/** INTERLEAVED STRANDS woven along one bearing — braided reeds, kelp ropes,
 *  root plaits. span = the braid's LENGTH; strands cross where their sine
 *  offsets meet zero. Anchors interleave strand-by-strand at each step
 *  (s0,s1,… then advance), so `every: strands` picks out ONE strand and
 *  `every: 1` plants the full weave. params: strands (default 2), weave
 *  (perpendicular amplitude, default 30), wavelength (default step*6).
 *  Draws: span, dir, phase — geometry after that is pure. */
registerFormationArranger('braid', (ctx, def, start, rng) => {
  const span = rng.range(def.span[0], def.span[1]);
  const dir = rng.range(0, Math.PI * 2);
  const phase = rng.range(0, Math.PI * 2);
  const step = def.step ?? 46;
  const strands = Math.max(2, Math.min(4, typeof def.params?.strands === 'number' ? Math.round(def.params.strands) : 2));
  const weave = typeof def.params?.weave === 'number' ? def.params.weave : 30;
  const wavelength = typeof def.params?.wavelength === 'number' ? Math.max(step, def.params.wavelength) : step * 6;
  const ux = Math.cos(dir), uy = Math.sin(dir);
  const px = -uy, py = ux;
  const pts: Vec2[] = [];
  for (let s = 0; s <= span; s += step) {
    for (let k = 0; k < strands; k++) {
      const off = Math.sin((s / wavelength) * Math.PI * 2 + phase + (k * Math.PI * 2) / strands) * weave;
      pts.push(vec(start.x + ux * s + px * off, start.y + uy * s + py * off));
    }
  }
  return pts;
}, { siteFrac: 0.3 });

function stampFormation(ctx: GenCtx, def: FormationDef): void {
  const arranger = FORMATION_ARRANGERS[def.arrange];
  if (!arranger) {
    if (!unknownStampWarned.has(`formation:${def.arrange}`)) {
      unknownStampWarned.add(`formation:${def.arrange}`);
      console.warn(`[formations] '${def.id}': unknown arranger '${def.arrange}' — skipped`);
    }
    return;
  }
  // Siting clearance: around-arrangers (arc/ring/orbit/grid) need their whole
  // extent clear-ish; chains just need their head sited (the per-piece gates
  // walk the rest). New arrangers declare their policy via registration META;
  // the arc/ring fallback keeps the pre-meta built-ins byte-identical.
  const meta = FORMATION_ARRANGER_META[def.arrange];
  const around = meta?.around ?? (def.arrange === 'arc' || def.arrange === 'ring');
  const siteFrac = meta?.siteFrac ?? (around ? 0.9 : 0.3);
  const site = def.siteRadius ?? Math.round(def.span[1] * siteFrac);
  // A composition SITE pre-resolves the origin (shared with the bundle's other
  // entries); otherwise the chain sites itself exactly as before.
  const start = ctx.siteAt ?? findSpot(ctx, site, def.hard ?? false, 24, false);
  if (!start) return;
  const anchors = arranger(ctx, def, start, ctx.rng);
  if (anchors.length < 2) return;
  const formationStart = ctx.doodads.length;
  // 'chain' rot: face ALONG the chain (a row's line, a ring's tangent) —
  // computed from the anchors themselves, so it costs the rng stream NOTHING
  // (boolean rot keeps drawing exactly as before).
  const chainRot = (i: number): number => {
    const a = anchors[i === anchors.length - 1 ? i - 1 : i];
    const b = anchors[i === anchors.length - 1 ? i : i + 1];
    return Math.atan2(b.y - a.y, b.x - a.x);
  };
  for (const piece of def.pieces) {
    const rule = doodadRule(piece.kind);
    const hard = !!rule.blocksMove;
    const every = Math.max(1, piece.every ?? 1);
    for (let i = 0; i < anchors.length; i++) {
      if (i % every) continue;
      const n = piece.count ? ctx.rng.int(piece.count[0], piece.count[1]) : 1;
      for (let k = 0; k < n; k++) {
        // Draws BEFORE filters (findSpot discipline): a rejected anchor must
        // not shift the sequence for the rest of the chain.
        const r = ctx.rng.range(piece.radius[0], piece.radius[1]);
        const rot = piece.rot === 'chain' ? chainRot(i)
          : piece.rot ? ctx.rng.range(0, Math.PI * 2) : undefined;
        let p = anchors[i];
        if (piece.jitter) {
          const ang = ctx.rng.range(0, Math.PI * 2);
          const off = ctx.rng.range(0, piece.jitter);
          p = vec(p.x + Math.cos(ang) * off, p.y + Math.sin(ang) * off);
        }
        if (!clearOf(ctx, p, r, hard)) continue;
        if (inReserved(ctx, p, r)) continue;
        if (ctx.walk && walkGated(piece.kind) && !ruleIgnored(ctx, 'walk') && !ctx.walk.isWalkable(p.x, p.y)) continue;
        if (rule.forbidOn && !ruleIgnored(ctx, 'forbid') && !areaFreeOf(ctx, p, r, rule.forbidOn)) continue;
        if (isSolid(piece.kind) && overlapsSolidBefore(ctx, p, r, formationStart)) continue;
        ctx.doodads.push({ pos: p, radius: r, kind: piece.kind, rot });
      }
    }
  }
}

registerStamp('formation', (ctx, spec) => {
  const def = spec.formation ? FORMATIONS[spec.formation] : undefined;
  if (def) stampFormation(ctx, def);
});

// NEGATIVE SPACE — a clearing: a reserved glade EVERY placement path already
// flows around (findSpot, blobs, pours, cliffs, ravines, rivers, landmarks,
// structures all consult reservations). Order in the layout list decides what
// it suppresses: clearings authored FIRST keep the whole scatter out — open
// sightlines, breathing room, a fight arena the composition promises. Pure
// data, no new physics: the reservation IS the feature.
registerStamp('clearing', (ctx, spec) => {
  const band = spec.radius ?? [90, 170];
  const r = ctx.rng.range(band[0], band[1]);
  const p = ctx.siteAt ?? findSpot(ctx, r * 0.7, false, 0, false);
  if (!p) return;
  ctx.reserved.push({ pos: p, radius: r });
});

// COMPOSITIONS — whole-zone PLANNING above single layout entries: one picked
// bundle COORDINATES clearings, formations, and banded scatter around shared
// named SITES, so "a glade ringed by standing stones" is one authored idea, not
// three independent rolls that happen to miss each other. Everything data: a
// CompositionDef names its sites + pre/post entries (the same StampSpec
// vocabulary tilesets speak, plus `at` referencing a site); zones pick from
// weighted CompositionRoll pools merged at mint (tileset + biome, like
// structure rolls). PRE entries stamp before the base layout (their clearings
// suppress the whole scatter); POST entries stamp after landmark/structure
// rolls (their shore bands measure every liquid, their pieces route around
// every reservation). `when` gates a bundle on the zone's BAKED geography
// (def.geo climate/biomeDepth) — a frost hollow only where the world runs
// cold — checked after the pick roll so filters never shift draws.

export interface CompositionSite {
  id: string;
  /** Probe clearance band (rolled, then sited via findSpot). */
  radius: [number, number];
  /** Optional strata band the site must satisfy (the WhereSpec vocabulary —
   *  a heart on the rim, a hollow where the climate field runs cold). */
  where?: WhereSpec;
  /** Portal-margin policy for the site probe (default false = soft). */
  hard?: boolean;
}

export interface CompositionDef {
  id: string;
  /** Named shared anchors resolved ONCE per pick — entries reference them via
   *  StampSpec.at, so a clearing and the orbit ringing it share one center. */
  sites?: CompositionSite[];
  /** Stamped BEFORE the zone's base layout (reservations land first). */
  pre?: StampSpec[];
  /** Stamped AFTER the base layout + landmark/structure rolls. */
  post?: StampSpec[];
  /** Geo gates on def.geo: keys are 'biomeDepth' or a climate axis id; a zone
   *  missing the datum PASSES (neutral — authored zones without baked climate
   *  still roll the bundle). */
  when?: Record<string, { min?: number; max?: number }>;
}

const COMPOSITIONS: Record<string, CompositionDef> = {};

export function registerComposition(def: CompositionDef): void {
  if (COMPOSITIONS[def.id]) console.warn(`[compositions] re-registering '${def.id}' — overriding`);
  COMPOSITIONS[def.id] = def;
}

export function hasComposition(id: string): boolean { return id in COMPOSITIONS; }

/** All registered composition defs (boot validation + the generation QA sweep). */
export function compositionDefs(): CompositionDef[] { return Object.values(COMPOSITIONS); }

/** The stamps that consume a composition site (ctx.siteAt) as their anchor —
 *  validation warns when `at` rides any other kind (it would be silently
 *  ignored: those handlers site themselves). */
export const SITE_AWARE_STAMPS: ReadonlySet<string> = new Set(['clearing', 'formation', 'cluster']);

interface CompositionPlan { def: CompositionDef; sites: Record<string, Vec2> }

function compositionEligible(def: ZoneDef, c: CompositionDef): boolean {
  if (!c.when) return true;
  for (const [key, band] of Object.entries(c.when)) {
    const v = key === 'biomeDepth' ? def.geo?.biomeDepth : def.geo?.climate?.[key];
    if (v === undefined) continue; // datum not baked → neutral pass
    if (v < (band.min ?? -Infinity) || v > (band.max ?? Infinity)) return false;
  }
  return true;
}

/** Stamp one phase's entries, threading each entry's site (if any) through the
 *  ctx.siteAt transient. The count roll mirrors plainsLayout exactly; an entry
 *  whose site failed to resolve stands down AFTER its count draw (the
 *  rolls-before-filters discipline, at bundle scale). */
function stampCompositionEntries(ctx: GenCtx, entries: StampSpec[] | undefined, sites: Record<string, Vec2>): void {
  for (const spec of entries ?? []) {
    const n = ctx.rng.int(spec.count[0], spec.count[1]);
    for (let i = 0; i < n; i++) {
      if (spec.at && !sites[spec.at]) continue;
      const prev = ctx.siteAt;
      try {
        ctx.siteAt = spec.at ? sites[spec.at] : undefined;
        stamp(ctx, spec);
      } finally {
        ctx.siteAt = prev;
      }
    }
  }
}

/** Roll the zone's composition picks, resolve their shared sites, and stamp
 *  their PRE entries. Returns the plans so the POST phase reuses the exact
 *  same sites. Draws rng only when def.compositions exists — zones without
 *  rolls are byte-identical. */
function planCompositions(ctx: GenCtx, def: ZoneDef): CompositionPlan[] {
  const plans: CompositionPlan[] = [];
  for (const roll of def.compositions ?? []) {
    const hit = ctx.rng.chance(roll.chance); // roll BEFORE the filters
    if (!hit) continue;
    const c = COMPOSITIONS[roll.composition];
    if (!c) {
      if (!unknownStampWarned.has(`composition:${roll.composition}`)) {
        unknownStampWarned.add(`composition:${roll.composition}`);
        console.warn(`[compositions] zone rolls unregistered composition '${roll.composition}' — skipped`);
      }
      continue;
    }
    if (!compositionEligible(def, c)) continue;
    const sites: Record<string, Vec2> = {};
    for (const s of c.sites ?? []) {
      const r = ctx.rng.range(s.radius[0], s.radius[1]);
      const prevGate = ctx.fieldGate;
      try {
        ctx.fieldGate = compileFieldGate(ctx, s.where);
        const p = findSpot(ctx, r, s.hard ?? false, 0, false);
        if (p) sites[s.id] = p;
      } finally {
        ctx.fieldGate = prevGate;
      }
    }
    stampCompositionEntries(ctx, c.pre, sites);
    plans.push({ def: c, sites });
  }
  return plans;
}

function runCompositionPost(ctx: GenCtx, plans: CompositionPlan[]): void {
  for (const plan of plans) stampCompositionEntries(ctx, plan.def.post, plan.sites);
}

/** Run a list of layout entries through the stamp dispatcher (count rolls
 *  mirror plainsLayout exactly) — the furnishing primitive: interior room
 *  roles, package dressings, and future composed generators reuse the whole
 *  stamp vocabulary (where bands, rule overrides, clusters) without touching
 *  the dispatcher. Combine with ctx.sampleRect for scoped scatter. */
export function stampEntries(ctx: GenCtx, entries: StampSpec[] | undefined): void {
  stampCompositionEntries(ctx, entries, {});
}

/** BOOT VALIDATION for composition defs (mirrors validateStamps' contract:
 *  callers feed entry specs into validateStamps separately; this checks the
 *  composition-LOCAL invariants — `at` refs resolve to declared sites, `at`
 *  rides only site-aware stamps, `when` keys name a known geo datum). The
 *  climate-axis check is a callback so this module stays data-import-free. */
export function validateCompositions(isClimateAxis?: (id: string) => boolean): string[] {
  const errs: string[] = [];
  for (const c of compositionDefs()) {
    const siteIds = new Set((c.sites ?? []).map(s => s.id));
    for (const s of c.sites ?? []) {
      if (s.radius[0] > s.radius[1]) errs.push(`composition '${c.id}': site '${s.id}' radius band inverted`);
      if (s.where && !hasGenField(s.where.field)) {
        errs.push(`composition '${c.id}': site '${s.id}' names unregistered field '${s.where.field}'`);
      }
    }
    // PRE runs BEFORE the layout generator — no walk grid exists yet, so a
    // piece-planting stamp there would embed doodads in cells a grid layout
    // later paints as wall. Reservation stamps are the pre vocabulary.
    for (const e of c.pre ?? []) {
      if (e.kind !== 'clearing') {
        errs.push(`composition '${c.id}': pre entry '${e.kind}' — pre precedes the layout generator (no walk grid yet); only reservation stamps (clearing) belong there, pieces go in post`);
      }
    }
    for (const [phase, entries] of [['pre', c.pre], ['post', c.post]] as const) {
      for (const e of entries ?? []) {
        if (!e.at) continue;
        if (!siteIds.has(e.at)) errs.push(`composition '${c.id}': ${phase} entry '${e.kind}' references undeclared site '${e.at}'`);
        if (!SITE_AWARE_STAMPS.has(e.kind)) errs.push(`composition '${c.id}': ${phase} entry '${e.kind}' carries at:'${e.at}' but that stamp sites itself — the site would be ignored`);
        // A pinned entry never calls findSpot, so a where band on it is dead
        // data — the SITE carries the band instead (CompositionSite.where).
        if (e.where) errs.push(`composition '${c.id}': ${phase} entry '${e.kind}' carries BOTH at:'${e.at}' and a where band — the band is ignored (put it on the site)`);
      }
    }
    for (const key of Object.keys(c.when ?? {})) {
      if (key !== 'biomeDepth' && isClimateAxis && !isClimateAxis(key)) {
        errs.push(`composition '${c.id}': when-gate names unknown geo datum '${key}'`);
      }
    }
  }
  return errs;
}

/** BOOT VALIDATION (wired in sim.ts like the biome validators): every layout
 *  entry across the authored data must name a registered stamp, every cluster/
 *  structure ref must resolve, and no cluster piece may emit a seed-paired kind
 *  (cave_entrance's caveSeeds zip would shear). The caller supplies the layout
 *  sources so this module stays data-import-free (no engine→data cycle). */
export function validateStamps(sources: { source: string; specs: StampSpec[]; allowAt?: boolean }[]): string[] {
  const bad: string[] = [];
  for (const { source, specs, allowAt } of sources) {
    for (const s of specs ?? []) {
      if (!hasStamp(s.kind)) bad.push(`${source}: unregistered stamp '${s.kind}'`);
      // `at` is composition-site vocabulary — on a tileset/zone row it names a
      // site that can never exist, and the stamp would silently self-site.
      if (s.at && !allowAt) bad.push(`${source}: entry '${s.kind}' carries at:'${s.at}' outside a composition — sites only exist there`);
      if (s.kind === 'cluster' && (!s.cluster || !hasCluster(s.cluster))) {
        bad.push(`${source}: cluster stamp names unknown cluster '${s.cluster ?? '(none)'}'`);
      }
      if (s.kind === 'landmark' && (!s.landmark || !hasLandmark(s.landmark))) {
        bad.push(`${source}: landmark stamp names unknown landmark '${s.landmark ?? '(none)'}'`);
      }
      if (s.kind === 'structure' && s.structure && !STRUCTURES[s.structure]) {
        bad.push(`${source}: structure stamp names unknown structure '${s.structure}'`);
      }
      if (s.kind === 'formation' && (!s.formation || !hasFormation(s.formation))) {
        bad.push(`${source}: formation stamp names unknown formation '${s.formation ?? '(none)'}'`);
      }
      if (s.where) {
        if (!hasGenField(s.where.field)) {
          bad.push(`${source}: where band names unregistered gen field '${s.where.field}'`);
        }
        // Effective bounds (unset = unbounded), so a defaulted bound crossing
        // an explicit one is caught too.
        if ((s.where.min ?? 0) >= (s.where.max ?? Infinity)) {
          bad.push(`${source}: where band is empty (min ${s.where.min} ≥ max ${s.where.max ?? '∞'})`);
        }
      }
    }
  }
  for (const f of formationDefs()) {
    if (!hasFormationArranger(f.arrange)) {
      bad.push(`formation '${f.id}': unknown arranger '${f.arrange}'`);
    }
    if (!(f.span[0] > 0) || !(f.span[1] >= f.span[0])) {
      bad.push(`formation '${f.id}': degenerate span [${f.span[0]}, ${f.span[1]}]`);
    }
    // A zero/negative step never advances an arranger's chain loop — the one
    // authoring typo that HANGS generation instead of degrading.
    if (f.step !== undefined && !(f.step > 0)) {
      bad.push(`formation '${f.id}': step must be > 0 (got ${f.step})`);
    }
    for (const p of f.pieces) {
      if (doodadRule(p.kind).seedPaired) {
        bad.push(`formation '${f.id}': piece kind '${p.kind}' is seed-paired (only its dedicated stamp may emit it)`);
      }
      if (!hasDoodadRule(p.kind)) {
        bad.push(`formation '${f.id}': piece kind '${p.kind}' has NO registered rule (falls to walkable ground — typo?)`);
      }
    }
  }
  for (const c of clusterDefs()) {
    for (const p of c.pieces) {
      if (doodadRule(p.kind).seedPaired) {
        bad.push(`cluster '${c.id}': piece kind '${p.kind}' is seed-paired (only its dedicated stamp may emit it)`);
      }
      // A mistyped piece kind silently becomes default walkable ground with
      // the generic-disc render — flag it like legend/fx kinds are flagged.
      if (!hasDoodadRule(p.kind)) {
        bad.push(`cluster '${c.id}': piece kind '${p.kind}' has NO registered rule (falls to walkable ground — typo?)`);
      }
    }
    if (c.anchor.kind && !hasDoodadRule(c.anchor.kind)) {
      bad.push(`cluster '${c.id}': anchor kind '${c.anchor.kind}' has NO registered rule (typo?)`);
    }
  }
  return bad;
}

/** A single tree (or palm): a rock that grew up. The kind is parametric so a
 *  palm reuses the exact placement logic — modularity for the next canopy. */
function stampTree(ctx: GenCtx, radius: [number, number], kind: DoodadKind = 'tree'): void {
  const r = ctx.rng.range(radius[0], radius[1]);
  const p = findSpot(ctx, r, true, doodadRule(kind).spacing ?? 0, true, kind);
  if (p) ctx.doodads.push({ pos: p, radius: r, kind, rot: ctx.rng.range(0, Math.PI * 2) });
}

/** A thicket: a tight cluster of impassable bramble wrapped in a vine mat —
 *  real cover you cannot push through, only fight around. */
function stampThicket(ctx: GenCtx): void {
  const center = findSpot(ctx, 80, true, doodadRule('thicket').spacing ?? 0, true, 'thicket');
  if (!center) return;
  const before = ctx.doodads.length; // thicket pieces avoid earlier solids, pack among themselves
  const n = ctx.rng.int(4, 7);
  for (let i = 0; i < n; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2);
    const off = ctx.rng.range(14, 70);
    const r = ctx.rng.range(16, 26);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!clearOf(ctx, p, r, true) || inReserved(ctx, p, r)) continue;
    if (overlapsSolidBefore(ctx, p, r, before)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'thicket', rot: ctx.rng.range(0, Math.PI * 2) });
  }
  ctx.doodads.push({ pos: center, radius: ctx.rng.range(30, 46), kind: 'vines' });
}

/** A single tombstone — generateLayout already loops per rolled count, so the
 *  crypt's headstone field grows from a `tombstone` stamp with a high count. */
function stampGraves(ctx: GenCtx): void {
  const r = ctx.rng.range(10, 16);
  const p = findSpot(ctx, r, true, doodadRule('tombstone').spacing ?? 0, true, 'tombstone');
  // A slight lean (±~17°), not a full spin — headstones stand upright, just
  // weathered askew like an old graveyard.
  if (p) ctx.doodads.push({ pos: p, radius: r, kind: 'tombstone', rot: ctx.rng.range(-0.3, 0.3) });
}

/** A shallow swathe: a wading-depth water patch (beaches and isle shores). It
 *  reuses the water kind with `shallow:true`, so groundAt wades it, never swims. */
function stampShallows(ctx: GenCtx): void {
  // Shallow water pours like every water body now — one wadeable organic
  // sheet (no depth heart: shallows are shallow by contract), fused with
  // whatever channel or pool it laps against by the zone-level pass.
  if (doodadRule('water').pour) {
    pourBody(ctx, 'water', [26, 78], [5, 9], false, { shallow: true });
    return;
  }
  const R = ctx.rng.range(26, 78);
  const center = findSpot(ctx, R * 1.6, false, 16, false); // ground: merges over solids
  if (!center) return;
  const n = ctx.rng.int(5, 9);
  ctx.doodads.push({ pos: center, radius: R, kind: 'water', shallow: true });
  for (let i = 0; i < n; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2);
    const off = ctx.rng.range(R * 0.5, R * 1.2);
    const r = R * ctx.rng.range(0.55, 0.95);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!clearOf(ctx, p, r, false) || inReserved(ctx, p, r)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'water', shallow: true });
  }
}

/** A cave mouth: a non-blocking trigger doodad with a STABLE per-entrance seed
 *  recorded in lock-step, so the same cave regenerates on every revisit. The
 *  doodad and its seed are pushed together; loadZone zips them back by index. */
function stampCaveMouth(ctx: GenCtx): void {
  const p = findSpot(ctx, 30, true, doodadRule('cave_entrance').spacing ?? 0, true, 'cave_entrance');
  if (!p) return;
  const seed = (ctx.rng.int(0, 0x7fffffff) ^ 0xca5e) >>> 0;
  ctx.doodads.push({ pos: p, radius: 28, kind: 'cave_entrance' });
  ctx.caveSeeds.push(seed);
}

/** A grove: trees crowded around brush and grass — real cover. */
function stampGrove(ctx: GenCtx): void {
  const center = findSpot(ctx, 90, true, 30);
  if (!center) return;
  const before = ctx.doodads.length; // grove trees avoid earlier solids, not each other
  const trees = ctx.rng.int(3, 6);
  for (let i = 0; i < trees; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2);
    const off = ctx.rng.range(20, 85);
    const r = ctx.rng.range(13, 22);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!clearOf(ctx, p, r, true) || inReserved(ctx, p, r)) continue;
    if (overlapsSolidBefore(ctx, p, r, before)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'tree', rot: ctx.rng.range(0, Math.PI * 2) });
  }
  ctx.doodads.push({ pos: center, radius: ctx.rng.range(34, 50), kind: 'brush', rot: ctx.rng.range(0, Math.PI * 2) });
  ctx.doodads.push({
    pos: vec(center.x + ctx.rng.range(-30, 30), center.y + ctx.rng.range(-30, 30)),
    radius: ctx.rng.range(24, 40), kind: 'grass',
  });
}

/** Is this rule relaxed by the RUNNING stamp's override? (Transient, set by
 *  stamp() — reads draw nothing, so rng sequences are untouched.) */
function ruleIgnored(ctx: GenCtx, rule: StampIgnoreRule): boolean {
  return !!ctx.ruleOver?.ignore?.includes(rule);
}

/** Is this spot clear of the entry, the portals, and the zone border? */
function clearOf(ctx: GenCtx, p: Vec2, r: number, hard: boolean): boolean {
  if (!ruleIgnored(ctx, 'border')) {
    if (p.x < BORDER + r || p.x > ctx.arena.w - BORDER - r) return false;
    if (p.y < BORDER + r || p.y > ctx.arena.h - BORDER - r) return false;
  }
  if (ruleIgnored(ctx, 'portalClear')) return true;
  if (dist(p, ctx.entry) < r + ENTRY_CLEAR) return false;
  // Soft terrain (mud) may lap closer to portals than blocking terrain.
  const margin = hard ? EXIT_CLEAR : EXIT_CLEAR * 0.6;
  return !ctx.exits.some(e => dist(p, e) < r + margin);
}

/** Try a few random placements; null when the zone is too crowded. When
 *  `checkSolids` (default), the spacing test rejects spots overlapping any
 *  SOLID doodad — so solids never pile on each other. Ground stamps pass false
 *  so a blob may merge freely over rocks/trees (a pool laps the boulders). The
 *  placement DRAWS happen before the filter, so the rng sequence is unchanged. */
function findSpot(
  ctx: GenCtx, r: number, hard: boolean, spacing = 0, checkSolids = true, kind?: DoodadKind,
): Vec2 | null {
  const rule = kind ? doodadRule(kind) : null;
  const over = ctx.ruleOver;
  // Rule-breaker relaxations (absent = today's path, byte-identical): a spacing
  // override swaps the caller's gap; 'border' WIDENS the sample rect (the draw
  // COUNT is unchanged — 2 range draws per try either way, so rng stays aligned).
  // ignore:'spacing' keeps the OVERLAP test alive at zero gap (abut, never
  // intersect) — distinct from ignore:'solids', which skips the test entirely.
  const spacingIgnored = ruleIgnored(ctx, 'spacing');
  const effSpacing = spacingIgnored ? 0 : (over?.spacing ?? spacing);
  const inset = ruleIgnored(ctx, 'border') ? r : BORDER + r;
  // SCOPED SAMPLING (ctx.sampleRect, transient): a furnisher confines the try
  // rect to its room/site. Same 2 range draws per try — unset keeps the full
  // arena and the exact draw values of today. The inset floors at 0 so a
  // degenerate rect (sub-2px) samples inside itself instead of a REVERSED
  // range interval spraying tries outside the room.
  const sx = ctx.sampleRect?.x ?? 0, sy = ctx.sampleRect?.y ?? 0;
  const sw = ctx.sampleRect?.w ?? ctx.arena.w, sh = ctx.sampleRect?.h ?? ctx.arena.h;
  const rInset = ctx.sampleRect ? Math.max(0, Math.min(r, sw / 2 - 1, sh / 2 - 1)) : inset;
  for (let tries = 0; tries < 26; tries++) {
    const p = vec(
      ctx.rng.range(sx + rInset, sx + sw - rInset),
      ctx.rng.range(sy + rInset, sy + sh - rInset));
    if (!clearOf(ctx, p, r, hard)) continue;
    if (inReserved(ctx, p, r)) continue;
    if ((effSpacing > 0 || spacingIgnored) && checkSolids && !ruleIgnored(ctx, 'solids')
        && ctx.doodads.some(d => isSolid(d.kind) && dist(p, d.pos) < r + d.radius + effSpacing)) continue;
    // RULE gates (only when a kind is supplied): keep solids/decoration on walkable
    // ground in grid zones, and out of forbidden pools/pits. Placed AFTER the legacy
    // checks so the rng draw sequence is byte-identical for callers passing no kind.
    if (rule) {
      if (!ruleIgnored(ctx, 'walk') && ctx.walk && walkGated(kind!) && !ctx.walk.isWalkable(p.x, p.y)) continue;
      // GROUND REQUIRED: nothing stands over open void (cloud_void, chasm)
      // unless its rule opts out — the walk gate covers walkability for
      // solids; this covers FLOATING for the non-walk-gated overlays too.
      if (!ruleIgnored(ctx, 'walk') && !rule.voidOk && overVoid(ctx, p.x, p.y)) continue;
      const forbid = over?.forbidOn ?? rule.forbidOn;
      if (!ruleIgnored(ctx, 'forbid') && forbid && !areaFreeOf(ctx, p, r, forbid)) continue;
    }
    // STRATA: the running entry's WHERE band (compiled by stamp()) — placed
    // LAST like the rule gates, so entries without a band keep their exact
    // rng acceptance sequence.
    if (ctx.fieldGate) {
      const v = ctx.fieldGate.sample(p.x, p.y);
      if (v < ctx.fieldGate.min || v > ctx.fieldGate.max) continue;
    }
    return p;
  }
  return null;
}

// --- the stamps --------------------------------------------------------------

/** A single SOLID doodad placed by its own rule (spacing + walk-gating + forbidden
 *  grounds) — the generic body most solids share (boulders, organic pods, obsidian
 *  shards). Adding a solid kind needs only a DOODAD_RULES row + this stamp + a render
 *  branch; no bespoke placement code. */
function stampSolid(ctx: GenCtx, kind: DoodadKind, radius: [number, number]): void {
  const r = ctx.rng.range(radius[0], radius[1]);
  const p = findSpot(ctx, r, true, doodadRule(kind).spacing ?? 0, true, kind);
  if (p) ctx.doodads.push({ pos: p, radius: r, kind, rot: ctx.rng.range(0, Math.PI * 2) });
}

/** ONE-DRAW natural-size roll: most stones land small-to-mid (power-curve
 *  skew), a rare tail lands truly HUGE — pebbles to monoliths out of the same
 *  band. Exactly one rng draw, so every call site keeps its draw count; only
 *  the VALUE distribution widens (a bigger stone can still shift a later
 *  placement's acceptance — the golden-seed/baseline gates judge that). */
function sizeRoll(rng: GenCtx['rng'], lo: number, hi: number,
  opts?: { curve?: number; tail?: number; tailMul?: number }): number {
  const curve = opts?.curve ?? 1.6;
  const tail = opts?.tail ?? 0.06;
  const tailMul = opts?.tailMul ?? 1.9;
  const u = rng.range(0, 1);
  if (u >= 1 - tail) return hi * (1 + (tailMul - 1) * ((u - (1 - tail)) / tail));
  return lo + (hi - lo) * Math.pow(u / (1 - tail), curve);
}

/** Natural stone scatters at REAL spread — the lone 'rocks' stamp rolls the
 *  full pebble→boulder→rare-monolith gamut instead of a flat band. */
function stampRock(ctx: GenCtx, radius: [number, number]): void {
  const r = sizeRoll(ctx.rng, radius[0], radius[1]);
  const p = findSpot(ctx, r, true, doodadRule('rock').spacing ?? 0, true, 'rock');
  if (p) ctx.doodads.push({ pos: p, radius: r, kind: 'rock', rot: ctx.rng.range(0, Math.PI * 2) });
}

/** A BOULDER FIELD — an outcrop shrugging out of the ground: one anchor stone,
 *  shoulder rocks packed around it, scree spilling away downhill, and sometimes
 *  a cairn somebody balanced on the mess. The composed set-piece the lone
 *  'rocks' stamp scatters toward. */
function stampBoulderField(ctx: GenCtx): void {
  const center = findSpot(ctx, 90, true, doodadRule('rock').spacing ?? 0, true, 'rock');
  if (!center) return;
  const before = ctx.doodads.length;
  ctx.doodads.push({ pos: center, radius: sizeRoll(ctx.rng, 34, 54), kind: 'rock', rot: ctx.rng.range(0, Math.PI * 2) });
  const shoulders = ctx.rng.int(2, 4);
  for (let i = 0; i < shoulders; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2), off = ctx.rng.range(50, 94);
    const r = sizeRoll(ctx.rng, 14, 28);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!clearOf(ctx, p, r, true) || inReserved(ctx, p, r)) continue;
    if (overlapsSolidBefore(ctx, p, r, before)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'rock', rot: ctx.rng.range(0, Math.PI * 2) });
  }
  const spills = ctx.rng.int(1, 3);
  for (let i = 0; i < spills; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2), off = ctx.rng.range(64, 124);
    // Draw the size BEFORE the reservation filter (the draws-before-filter
    // discipline every sibling loop here keeps): a spill skipped by a
    // reservation must not shift every later placement's rng, and the
    // reservation probe tests the disc's real radius.
    const r = ctx.rng.range(20, 34);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (inReserved(ctx, p, r)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'scree' });
  }
  if (ctx.rng.range(0, 1) < 0.25) {
    const ang = ctx.rng.range(0, Math.PI * 2);
    const p = vec(center.x + Math.cos(ang) * 132, center.y + Math.sin(ang) * 132);
    const r = ctx.rng.range(11, 15);
    if (clearOf(ctx, p, r, true) && !inReserved(ctx, p, r) && !overlapsSolidBefore(ctx, p, r, before)) {
      ctx.doodads.push({ pos: p, radius: r, kind: 'cairn', rot: ctx.rng.range(0, Math.PI * 2) });
    }
  }
}

/**
 * A cliff run: overlapping circles deposited along a wandering walk, so the
 * pieces weave together into a wall. Stops early rather than sealing off an
 * entry or portal.
 */
function stampCliff(ctx: GenCtx): void {
  const start = findSpot(ctx, 60, true, doodadRule('cliff').spacing ?? 0, true, 'cliff');
  if (!start) return;
  let dir = ctx.rng.range(0, Math.PI * 2);
  const steps = ctx.rng.int(7, 14);
  const baseR = ctx.rng.range(20, 30);
  let p = vec(start.x, start.y);
  for (let i = 0; i < steps; i++) {
    const r = baseR * ctx.rng.range(0.85, 1.2);
    if (!clearOf(ctx, p, r, true)) break;
    if (inReserved(ctx, p, r)) break; // cliffs don't wall off structures
    ctx.doodads.push({ pos: vec(p.x, p.y), radius: r, kind: 'cliff' });
    dir += ctx.rng.range(-0.45, 0.45);
    p = vec(p.x + Math.cos(dir) * r * 1.5, p.y + Math.sin(dir) * r * 1.5);
  }
}

/** Should a poured/fused cell at `c` be CUT? The SAME gates the piece scatter
 *  honored — zone border, entry/exit clears, reservations, and (for walk-gated
 *  kinds) the walk grid — each honoring the running stamp's rule-breaker
 *  relaxations, so a poured body flows around exactly what a scattered one
 *  skipped. `cr` is the reach the lattice actually paints (cell × 1.05). */
function cellGuarded(ctx: GenCtx, c: Vec2, cr: number, kind: DoodadKind, hard: boolean): boolean {
  const exitMargin = hard ? EXIT_CLEAR : EXIT_CLEAR * 0.6;
  // Border honored = the scatter's BORDER inset; ignored = still inside the
  // arena (the rule-breaker widened findSpot's rect, it never left the zone).
  const edge = ruleIgnored(ctx, 'border') ? cr : BORDER + cr;
  if (c.x < edge || c.x > ctx.arena.w - edge || c.y < edge || c.y > ctx.arena.h - edge) return true;
  if (!ruleIgnored(ctx, 'portalClear')) {
    if (dist(c, ctx.entry) < cr + ENTRY_CLEAR) return true;
    if (ctx.exits.some(e => dist(c, e) < cr + exitMargin)) return true;
  }
  if (inReserved(ctx, c, cr)) return true;
  if (!ruleIgnored(ctx, 'walk') && ctx.walk && walkGated(kind) && !ctx.walk.isWalkable(c.x, c.y)) return true;
  // GROUND REQUIRED: a poured cell never floats over open void either.
  if (!ruleIgnored(ctx, 'walk') && !doodadRule(kind).voidOk && overVoid(ctx, c.x, c.y)) return true;
  return false;
}

/** The solids whose rule FORBIDS standing in `kind` ground — every path that
 *  adds `kind` AFTER solids landed (pour, fuse) must flow around them, so the
 *  forbidOn contract holds regardless of stamp order: a geyser stays dry even
 *  when the marsh pours its pools afterwards. */
function forbiddersOf(ctx: GenCtx, kind: DoodadKind): Doodad[] {
  return ctx.doodads.filter(d => doodadRule(d.kind).forbidOn?.includes(kind));
}

/** Trim a poured mask by cellGuarded, cell by cell — plus the inverse
 *  forbidOn cut (the pour laps AROUND a forbid-carrying solid, leaving it a
 *  dry notch, exactly as the fuse does). */
function maskGuards(ctx: GenCtx, m: Mask, kind: DoodadKind, hard: boolean): void {
  const cr = m.cell * 1.05;
  const forbidders = ruleIgnored(ctx, 'forbid') ? [] : forbiddersOf(ctx, kind);
  for (let cy = 0; cy < m.rows; cy++) {
    for (let cx = 0; cx < m.cols; cx++) {
      if (!m.get(cx, cy)) continue;
      const c = m.center(cx, cy);
      if (cellGuarded(ctx, c, cr, kind, hard)
        || forbidders.some(f => dist(c, f.pos) < cr + f.radius)) {
        m.set(cx, cy, false);
      }
    }
  }
}

/** THE POUR — a blob stamp routed through the landmark geometry: one organic
 *  mask (a wobbled radial core + a lobe where the scatter rolled each piece)
 *  rasterized to the gen lattice and emitted via the shared paintLiquid
 *  idiom, so a bog reads as one cohesive body instead of a weave of stamped
 *  circles. Siting is unchanged (findSpot center, reserved/portal respect) —
 *  the guards act on CELLS now instead of piece centers, which is strictly
 *  finer-grained. Opt-in per kind via DoodadRule.pour; every knob data. */
function pourBody(
  ctx: GenCtx, kind: DoodadKind,
  radius: [number, number], pieces: [number, number], hard: boolean,
  opts?: { shallow?: boolean },
): void {
  const pour = doodadRule(kind).pour ?? {};
  const R = ctx.rng.range(radius[0], radius[1]);
  const center = findSpot(ctx, R * 1.8, hard, 20, false, kind);
  if (!center) return;
  const body = R * (pour.scale ?? 1.5);
  const wob = pour.wobble ?? 0.3;
  const seed = ctx.rng.int(0, 0x7fffffff);
  // Frame the mask over the body's worst reach, SNAPPED to the gen lattice
  // (an unsnapped mask bleeds against the walk grid — the placeLandmark rule).
  const reach = body * 2.2;
  const ox = Math.floor((center.x - reach) / GEN_CELL) * GEN_CELL;
  const oy = Math.floor((center.y - reach) / GEN_CELL) * GEN_CELL;
  const m = Mask.forRect(ox, oy, reach * 2 + GEN_CELL, reach * 2 + GEN_CELL);
  radial(m, center.x, center.y, a => body * (1 + bearingNoise(a, wob, seed)));
  // LOBES: the piece rolls, reshaped — each a smaller wobbled radial ORed on,
  // so a multi-lobed marsh keeps its sprawl without the circle seams. Lobe
  // radii keep the union INSIDE `reach` (0.95 + 0.55×(1+wob) < 2.2 for any
  // wobble ≤ 1), so the frame never clips a lobe.
  const n = ctx.rng.int(pieces[0], pieces[1]);
  for (let i = 0; i < n; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2);
    const off = ctx.rng.range(body * 0.45, body * 0.95);
    const lr = body * ctx.rng.range(0.3, 0.55);
    radial(m, center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off,
      a => lr * (1 + bearingNoise(a, wob, (seed + i + 1) >>> 0)));
  }
  maskGuards(ctx, m, kind, hard);
  // Depth heart FIRST (under the lattice): the scatter's old center disc,
  // kept so a poured pond still swims past LIQUID_CFG.deepInset at its
  // middle. The core's radius R never pokes past the wobbled rim (mask
  // radius ≥ body×(1−wob) = 1.05R at the default scale/wobble). Skipped when
  // it would flood a forbid-carrying solid (the inverse-forbidOn contract —
  // the lattice around it is already trimmed by maskGuards).
  if (pour.depthCore && !opts?.shallow) {
    const coreR = Math.min(R, body * 0.85);
    const dry = ruleIgnored(ctx, 'forbid') ? [] : forbiddersOf(ctx, kind);
    if (!dry.some(f => dist(center, f.pos) < coreR + f.radius)) {
      ctx.doodads.push({ pos: center, radius: coreR, kind });
    }
  }
  paintLiquid(ctx, null, m, { doodad: kind, ...(opts?.shallow ? { shallow: true } : {}) });
}

/** THE FUSE — the zone-level closure over poured ground kinds: bodies of the
 *  same kind that landed NEXT TO (or interlocked with) each other merge into
 *  ONE contiguous body instead of reading as circles jammed together. Two
 *  complementary halves, both additive and draw-free (no rng), so a zone
 *  without near-touching bodies is untouched and every already-placed disc
 *  keeps its exact geometry:
 *
 *  1. CLOSE (per kind + flag signature): the union rasterizes to the gen
 *     lattice and morphologically closes (grow+erode by fuseGap) — this fills
 *     the interlock artifacts, the pinholes and concave slivers where several
 *     circles almost meet. Signature-pure, so a fill never changes a ford
 *     into deep water.
 *  2. WELD (per kind, across signatures): a close cannot keep a tangent-thin
 *     bridge (erosion eats one-cell isthmuses), so near-touching BODIES are
 *     found by union-find over the discs and welded with a straight lattice
 *     seam wherever their rim gap is within reach (fuseGap × 2 cells). A weld
 *     touching a ford stays `shallow` — a junction may get easier to cross,
 *     never surprise-deep.
 *
 *  Runs before the portal splice + reachability passes, so every guard sees
 *  the fused geometry. This is the parity seam: stamps, landmarks, clusters,
 *  fx layers — however two bodies of a kind arrive near each other, they
 *  read as one. Seam cells emit at full density (no checker thinning): they
 *  are one-or-two-cell isthmuses, and a thinned isthmus would leak a gap. */
function fuseGroundBodies(ctx: GenCtx): void {
  const byKind = new Map<DoodadKind, { gap: number; discs: Doodad[] }>();
  for (const d of ctx.doodads) {
    if (d.keep || d.fall || d.gone) continue; // bespoke flags stay bespoke
    const pour = doodadRule(d.kind).pour;
    if (!pour) continue;
    const gap = pour.fuseGap ?? 1;
    if (gap <= 0) continue;
    let g = byKind.get(d.kind);
    if (!g) byKind.set(d.kind, g = { gap, discs: [] });
    g.discs.push(d);
  }
  const cell = GEN_CELL, cr = cell * 1.05;
  for (const [kind, g] of byKind) {
    if (g.discs.length < 2) continue;
    // INVERSE forbidOn: the fuse adds ground AFTER the solids landed, so it
    // honors their forbidOn retroactively — a weld between two lava bodies
    // must never flood the obsidian that legally sat in the gap between them
    // (the same contract maskGuards holds for pours).
    const forbidders = forbiddersOf(ctx, kind);
    const floods = (c: Vec2): boolean =>
      forbidders.some(f => dist(c, f.pos) < cr + f.radius);

    // --- 1. CLOSE, per flag signature -----------------------------------
    const bySig = new Map<string, Doodad[]>();
    for (const d of g.discs) {
      const key = d.shallow ? 's' : '';
      const list = bySig.get(key);
      if (list) list.push(d); else bySig.set(key, [d]);
    }
    for (const [sig, list] of bySig) {
      if (list.length < 2) continue;
      const m = Mask.forRect(0, 0, ctx.arena.w, ctx.arena.h);
      for (const d of list) disc(m, d.pos.x, d.pos.y, d.radius);
      const closed = m.clone().grow(g.gap).erode(g.gap).subtract(m);
      maskGuards(ctx, closed, kind, false);
      closed.forEach((cx, cy) => {
        const pos = closed.center(cx, cy);
        if (floods(pos)) return;
        const d: Doodad = {
          pos, radius: cr, kind,
          ...(sig === 's' ? { shallow: true } : {}),
        };
        ctx.doodads.push(d);
        g.discs.push(d); // welds below see the filled geometry
      });
    }

    // --- 2. WELD near-tangent bodies -------------------------------------
    const discs = g.discs;
    const parent = discs.map((_, i) => i);
    const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
    for (let i = 0; i < discs.length; i++) {
      for (let j = i + 1; j < discs.length; j++) {
        if (dist(discs[i].pos, discs[j].pos) < discs[i].radius + discs[j].radius - 6) {
          const ri = find(i), rj = find(j);
          if (ri !== rj) parent[ri] = rj;
        }
      }
    }
    const reach = g.gap * 2 * cell;
    // Deterministic pair scan (index order); union as welds land so a chain
    // A–B–C lays two seams, never a redundant third.
    for (let i = 0; i < discs.length; i++) {
      for (let j = i + 1; j < discs.length; j++) {
        const ri = find(i), rj = find(j);
        if (ri === rj) continue;
        const a = discs[i], b = discs[j];
        const gapPx = dist(a.pos, b.pos) - a.radius - b.radius;
        if (gapPx > reach) continue;
        // Seam: lattice cells along a→b spanning the gap, one cell INTO each
        // body so the weld's discs genuinely overlap both rims.
        const span = dist(a.pos, b.pos);
        const dir = vec((b.pos.x - a.pos.x) / (span || 1), (b.pos.y - a.pos.y) / (span || 1));
        let welded = false;
        for (let s = a.radius - cell; s <= span - b.radius + cell; s += cell * 0.9) {
          const px = a.pos.x + dir.x * s, py = a.pos.y + dir.y * s;
          const c = vec(
            (Math.floor(px / cell) + 0.5) * cell,
            (Math.floor(py / cell) + 0.5) * cell);
          if (cellGuarded(ctx, c, cr, kind, false)) continue;
          if (floods(c)) continue;
          if (ctx.doodads.some(d => d.kind === kind && d.pos.x === c.x && d.pos.y === c.y)) { welded = true; continue; }
          ctx.doodads.push({
            pos: c, radius: cr, kind,
            ...(a.shallow || b.shallow ? { shallow: true } : {}),
          });
          welded = true;
        }
        if (welded) parent[ri] = rj;
      }
    }
  }
}

/** A blob of overlapping circles — mud patches and chasm lakes. */
function stampBlob(
  ctx: GenCtx, kind: DoodadKind,
  radius: [number, number], pieces: [number, number], hard: boolean,
): void {
  // POURED kinds trade the satellite scatter for one organic mask — the
  // landmark-parity path (DoodadRule.pour, pure data per kind).
  if (doodadRule(kind).pour) { pourBody(ctx, kind, radius, pieces, hard); return; }
  const R = ctx.rng.range(radius[0], radius[1]);
  // Blobs are terrain, not solids: they merge freely over rocks/trees (a pool
  // laps the boulders) — checkSolids=false. Only the shrub-family kinds spin
  // per-piece, and the rot draw stays conditional so every other blob keeps
  // the exact same rng sequence it always had.
  const center = findSpot(ctx, R * 1.8, hard, 20, false, kind);
  if (!center) return;
  const n = ctx.rng.int(pieces[0], pieces[1]);
  const crot = (): number | undefined => doodadRule(kind).spin ? ctx.rng.range(0, Math.PI * 2) : undefined;
  ctx.doodads.push({ pos: center, radius: R, kind, rot: crot() });
  for (let i = 0; i < n; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2);
    const off = ctx.rng.range(R * 0.5, R * 1.2);
    const r = R * ctx.rng.range(0.55, 0.95);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!clearOf(ctx, p, r, hard)) continue;
    if (inReserved(ctx, p, r)) continue;
    // The kind's own forbidOn holds for satellites like everywhere else (the
    // center already passed it via findSpot): a heat shimmer's fringe must
    // not drift onto the oasis pool. Draw-free — acceptance only.
    if (doodadRule(kind).forbidOn && !ruleIgnored(ctx, 'forbid')
      && !areaFreeOf(ctx, p, r, doodadRule(kind).forbidOn!)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind, rot: crot() });
  }
}

/**
 * A ravine: a chasm strip cut across the middle of the map, spanned by one
 * or two plank bridges. Circles that would crowd the entry or a portal are
 * simply skipped — the gap becomes a natural crossing.
 */
function stampRavine(ctx: GenCtx): void {
  const { rng, arena } = ctx;
  const dir = rng.range(0, Math.PI);
  const center = vec(
    arena.w * rng.range(0.35, 0.65),
    arena.h * rng.range(0.35, 0.65));
  const half = Math.min(arena.w, arena.h) * rng.range(0.22, 0.34);
  const r = rng.range(36, 46);
  const step = r * 1.1;

  // The inverse-forbidOn contract (see forbiddersOf): a path stamp adds chasm
  // AFTER solids landed, so it must route around anything that forbids it —
  // the same skip that already bends the cut around reservations.
  const dry = ruleIgnored(ctx, 'forbid') ? [] : forbiddersOf(ctx, 'chasm');
  const path: Vec2[] = [];
  let wob = 0;
  for (let s = -half; s <= half; s += step) {
    wob += rng.range(-0.12, 0.12);
    const d = dir + wob;
    const p = vec(center.x + Math.cos(d) * s, center.y + Math.sin(d) * s);
    if (p.x < BORDER || p.x > arena.w - BORDER || p.y < BORDER || p.y > arena.h - BORDER) continue;
    if (dist(p, ctx.entry) < r + ENTRY_CLEAR * 0.8) continue;
    if (ctx.exits.some(e => dist(p, e) < r + EXIT_CLEAR)) continue;
    if (inReserved(ctx, p, r)) continue; // ravines route around structures
    if (dry.some(f => dist(p, f.pos) < r + f.radius)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'chasm' });
    path.push(p);
  }
  if (path.length < 4) return;

  // Bridges span the gap perpendicular to the cut. The GUARANTEED spans are
  // sound timber (progression never rides a trap); a chance-rolled EXTRA
  // crossing is rotten — a shortcut that creaks, remembers, and drops you.
  const spans = path.length > 10 ? 2 : 1;
  const fracs = spans === 2 ? [0.3, 0.72] : [rng.range(0.35, 0.65)];
  const laySpan = (f: number, kind: DoodadKind): void => {
    const i = Math.max(1, Math.min(path.length - 2, Math.round(f * path.length)));
    const at = path[i];
    const along = Math.atan2(path[i + 1].y - path[i - 1].y, path[i + 1].x - path[i - 1].x);
    const perp = along + Math.PI / 2;
    const reach = r * 1.7;
    for (let s = -reach; s <= reach; s += 18) {
      ctx.doodads.push({
        pos: vec(at.x + Math.cos(perp) * s, at.y + Math.sin(perp) * s),
        radius: 24, kind, dir: perp,
      });
    }
  };
  for (const f of fracs) laySpan(f, 'bridge');
  if (rng.chance(0.6)) {
    laySpan(spans === 2 ? 0.5 : (fracs[0] > 0.5 ? fracs[0] - 0.24 : fracs[0] + 0.24), 'rotten_bridge');
  }
}

/**
 * A river: a winding strip of water cut across the map. Crossable anywhere
 * (water slows, it doesn't block), but FORDS — marked shallow stretches —
 * are the dignified way over: wading-depth no matter how wide the channel.
 */
function stampRiver(ctx: GenCtx): void {
  const { rng, arena } = ctx;
  const dir = rng.range(0, Math.PI);
  const center = vec(
    arena.w * rng.range(0.35, 0.65),
    arena.h * rng.range(0.35, 0.65));
  const half = Math.min(arena.w, arena.h) * rng.range(0.3, 0.45);
  // Channel width varies river-to-river (a creek here, a broad flow there);
  // step stays proportional so the discs always overlap into ONE body and
  // the deep channel never strobes at the seams (see groundAt's deepInset).
  const r = rng.range(32, 60);
  const step = r * 0.95;

  // The inverse-forbidOn contract (see forbiddersOf): the channel is laid
  // AFTER solids landed, so it flows around anything that forbids water —
  // the same skip that already bends it around camps and ruins.
  const dry = ruleIgnored(ctx, 'forbid') ? [] : forbiddersOf(ctx, 'water');
  const placed: Doodad[] = [];
  let wob = 0;
  for (let s = -half; s <= half; s += step) {
    wob += rng.range(-0.16, 0.16);
    const d = dir + wob;
    const p = vec(center.x + Math.cos(d) * s, center.y + Math.sin(d) * s);
    if (p.x < BORDER || p.x > arena.w - BORDER || p.y < BORDER || p.y > arena.h - BORDER) continue;
    if (dist(p, ctx.entry) < r + ENTRY_CLEAR * 0.7) continue;
    if (ctx.exits.some(e => dist(p, e) < r + EXIT_CLEAR * 0.7)) continue;
    if (inReserved(ctx, p, r)) continue; // rivers bend around camps and ruins
    if (dry.some(f => dist(p, f.pos) < r + f.radius)) continue;
    const doo: Doodad = { pos: p, radius: r * rng.range(0.9, 1.1), kind: 'water' };
    ctx.doodads.push(doo);
    placed.push(doo);
  }
  if (placed.length < 4) return;
  // Fords: 1-2 shallow windows along the channel.
  const fords = placed.length > 11 ? 2 : 1;
  const fracs = fords === 2 ? [0.28, 0.7] : [rng.range(0.35, 0.65)];
  for (const f of fracs) {
    const i = Math.round(f * (placed.length - 1));
    for (const j of [i - 1, i, i + 1]) {
      if (placed[j]) placed[j].shallow = true;
    }
  }
}

/**
 * A walled camp: a palisade rectangle with 1-2 gate gaps, its yard a POI
 * (spawners, caches, shrines and altars nest inside) — and the world posts
 * a guard pack at the center. Wall pieces block movement AND projectiles,
 * so storming a camp is a real proposition.
 */
function stampCamp(ctx: GenCtx): void {
  const { rng } = ctx;
  const halfW = rng.range(130, 190);
  const halfH = rng.range(110, 160);
  // Camps tolerate company — a boulder inside the palisade is flavor — but
  // nobody builds a fort over a chasm or in a lake: the footprint must be
  // free of hazard terrain, and once sited it's RESERVED so later rivers
  // and ravines route around it.
  const footprint = Math.max(halfW, halfH) * 1.15;
  let center: Vec2 | null = null;
  for (let tries = 0; tries < 14 && !center; tries++) {
    const p = findSpot(ctx, Math.max(halfW, halfH) * 0.55, true, 0);
    if (p && areaFreeOf(ctx, p, footprint, hazardGrounds())) center = p;
  }
  if (!center) return;
  ctx.reserved.push({ pos: center, radius: footprint + 20 });
  const segR = 13;
  const spacing = segR * 1.7;
  const gates: ('n' | 's' | 'e' | 'w')[] = ['n', 's', 'e', 'w'];
  const gateSides = new Set([gates[rng.int(0, 3)]]);
  if (rng.chance(0.45)) gateSides.add(gates[rng.int(0, 3)]);
  const gateAt = rng.range(-0.4, 0.4); // gate position along its side
  const gateHalf = 58; // generous: walk through, don't squeeze

  const sides: { side: 'n' | 's' | 'e' | 'w'; from: Vec2; to: Vec2 }[] = [
    { side: 'n', from: vec(center.x - halfW, center.y - halfH), to: vec(center.x + halfW, center.y - halfH) },
    { side: 's', from: vec(center.x - halfW, center.y + halfH), to: vec(center.x + halfW, center.y + halfH) },
    { side: 'w', from: vec(center.x - halfW, center.y - halfH), to: vec(center.x - halfW, center.y + halfH) },
    { side: 'e', from: vec(center.x + halfW, center.y - halfH), to: vec(center.x + halfW, center.y + halfH) },
  ];
  for (const s of sides) {
    const len = dist(s.from, s.to);
    const steps = Math.ceil(len / spacing);
    const gateCenter = len / 2 + gateAt * len * 0.5;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * len;
      if (gateSides.has(s.side) && Math.abs(t - gateCenter) < gateHalf) continue;
      const p = vec(
        s.from.x + (s.to.x - s.from.x) * (t / len),
        s.from.y + (s.to.y - s.from.y) * (t / len));
      if (!clearOf(ctx, p, segR, true)) continue; // broken walls are flavor
      ctx.doodads.push({ pos: p, radius: segR, kind: 'wall' });
    }
  }
  ctx.pois.push(center);
  ctx.camps.push(center);
}

/**
 * A ruin ring: broken walls around an interior worth visiting. The center
 * is recorded as a POI — spawners and gem caches are placed there first.
 */
function stampRuin(ctx: GenCtx): void {
  const R = ctx.rng.range(95, 140);
  let center: Vec2 | null = null;
  for (let tries = 0; tries < 10 && !center; tries++) {
    const p = findSpot(ctx, R + 40, true, 30);
    if (p && areaFreeOf(ctx, p, R + 30, hazardGrounds())) center = p;
  }
  if (!center) return;
  ctx.reserved.push({ pos: center, radius: R + 40 });
  const segments = ctx.rng.int(10, 14);
  const gapAt = ctx.rng.range(0, Math.PI * 2);
  const gapWidth = ctx.rng.range(0.9, 1.5);
  const secondGap = ctx.rng.chance(0.5) ? gapAt + Math.PI + ctx.rng.range(-0.6, 0.6) : null;
  for (let i = 0; i < segments; i++) {
    const ang = (i / segments) * Math.PI * 2;
    const da = Math.abs(Math.atan2(Math.sin(ang - gapAt), Math.cos(ang - gapAt)));
    if (da < gapWidth / 2) continue;
    if (secondGap !== null) {
      const db = Math.abs(Math.atan2(Math.sin(ang - secondGap), Math.cos(ang - secondGap)));
      if (db < gapWidth / 2) continue;
    }
    const r = ctx.rng.range(15, 22);
    const p = vec(center.x + Math.cos(ang) * R, center.y + Math.sin(ang) * R);
    if (!clearOf(ctx, p, r, true)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'rock', rot: ctx.rng.range(0, Math.PI * 2) });
  }
  ctx.pois.push(center);
}
