import type { EncounterGroupDef, EncounterMember } from '../engine/encounterGroups';
import type { BrainTuning } from '../engine/brain';

export const ENCOUNTER_GROUP_CFG = { chance:0.28, maxMembers:8, radius:240, spacing:48, placementAttempts:4, placementJitter:20, bodyClearance:4 };
const drilled: BrainTuning = {squad:{focusLeader:true,formation:'wedge',spacing:56,idle:{style:'drill'},onLeaderDeath:'scatter'}};
const hunters: BrainTuning = {squad:{surround:true,tokens:3,formation:'loose',idle:{style:'loose'},onLeaderDeath:'frenzy'}};
const rooted: BrainTuning = {squad:{focusLeader:true,formation:'ring',idle:{style:'mixed'},onLeaderDeath:'none'}};
const m=(slot:string,monster:string,forward:number,side:number,extra:Partial<EncounterMember>={}):EncounterMember=>
  ({slot,role:slot,monster,at:{forward,side},...extra});
const lead={leader:true};
const pair={count:[2,2] as [number,number]};
const bandit=['farmland','metropolis','townhouse','sewerworks','highland','foothills','stonecrown'];
const goblin=['tundra','cinderlands','magma_gallery','highland','foothills','snowcrown','pinnacle'];
const gnoll=['deepwood','downs','needles','cinderlands','desert','sandsea','saltflat','hivesands','tableland','courtland','beach','grassland'];
const graves=['crypt','lone_crypt','ossuary','catacombs','kings_barrow','mournstead'];
const sylvan=['deepwood','forest','jungle','sunken_ruin','meadow','glimmervale','heartwood','gleamhollow','grassland'];
const rootwild=['forest','jungle','mire','petalfields','rootways'];
const hell=['wasteland','grindfields','siegefront','ordnance_yard','hell_steppes','river_of_flame','durance','hellion_rift','sanguine'];
const formic=['petalfields','stalkwood','tendersrows','mulchreach','rootways','formicary','undergrowth'];
const blooms=['petalfields','stalkwood','tendersrows'];
const rime=['taiga','tundra','snowcrown'];
const coils=['beach','strand','brine_flats','mangrove_tangle','drowned_margin','marsh','geyser_fields'];
const tombs=['sandsea','saltflat','courtland','sepulcher_sands'];
const tribes=['forest','taiga','tundra','highland','foothills','overpass','snowcrown','stonecrown','pinnacle'];
const crew=(id:string,name:string,faction:string,minLevel:number,tilesets:string[],description:string,
  members:EncounterMember[],tactics:BrainTuning=drilled):EncounterGroupDef=>
  ({id,name,faction,minLevel,weight:1,habitats:{tilesets},description,members,tactics});

/** Ordinary pack replacements. No rare-stat multiplication is implicit. Each
 * recipe guarantees its defining roles and carries its own hard debut floor. */
export const ENCOUNTER_GROUPS: Record<string,EncounterGroupDef> = Object.fromEntries([
  crew('wayward_expedition','Wayward Expedition','bandit',8,bandit,
    'A shield and challenge in front, a mender behind, and two damage dealers. Interrupt healing or flank the guard.',[
      m('vanguard','wayward_vanguard',75,0,lead),m('mender','wayward_mender',-65,0),
      m('arcanist','wayward_arcanist',-20,-75),m('scout','wayward_scout',-20,75)]),
  crew('wayward_veterans','Veteran Expedition','bandit',18,bandit,
    'An experienced expedition with optional outriders; the healer remains a single vulnerable point.',[
      m('vanguard','wayward_vanguard',85,0,lead),m('mender','wayward_mender',-85,0),
      m('arcanist','wayward_arcanist',-25,-85),m('scout','wayward_scout',-25,85),
      {slot:'outrider',role:'flanker',choices:[{id:'bandit_cutthroat',weight:3},{id:'steppe_ronin',weight:1,presence:{from:22}}],
        count:[0,2],presence:{from:20},at:{forward:65,side:0},spacing:140}]),
  crew('powder_line','Powder Line','bandit',10,bandit,
    'A moving bulwark screens repeaters and fire. Exploit reloads or turn the shield.',[
      m('bulwark','bulwark_thane',90,0,lead),m('fusiliers','bandit_fusilier',-55,0,pair),m('powder','bandit_powder_witch',-15,95)]),
  crew('toll_collectors','Toll Collectors','bandit',6,bandit,
    'A shouting warden anchors knives and a trapsmith. Keep a clear retreat out of the caltrops.',[
      m('warden','bandit_keeper',40,0,lead),m('knives','bandit_cutthroat',65,0,{...pair,spacing:130}),m('traps','bandit_trapsmith',-75,0)]),
  crew('goblin_skirmish_cell','Shaman Skirmish Cell','goblin',4,goblin,
    'A shaman rallies skirmishers behind one heavy body. Silence the rally or split the screen.',[
      m('shaman','goblin_shaman',-50,0,lead),m('brute','goblin_brute',75,0),m('skirmishers','goblin_skirmisher',15,0,{...pair,spacing:140})]),
  crew('goblin_demolition','Demolition Crew','goblin',8,goblin,
    'A sapper throws over a bruiser while skirmishers punish a straight retreat.',[
      m('sapper','goblin_sapper',-70,0,lead),m('brute','goblin_brute',65,0),m('skirmishers','goblin_skirmisher',10,0,{...pair,spacing:130})]),
  crew('gnasher_yard','Gnasher Yard','goblin',9,goblin,
    'A prodder goads a great gnasher and its smaller kin. Separate the beasts from the handler.',[
      m('handler','gnasher_prodder',-70,0,lead),m('great','great_gnasher',65,0),m('gnashers','cave_gnasher',20,0,{...pair,spacing:150})],hunters),
  crew('hobgoblin_muster','Taskmaster Muster','goblin',16,goblin,
    'Orders, a shaman, two ravagers and a troll make a disciplined late warband.',[
      m('taskmaster','hobgoblin_taskmaster',0,0,lead),m('troll','troll_mauler',100,0),
      m('ravagers','orc_ravager',35,0,{...pair,spacing:150}),m('shaman','goblin_shaman',-90,0)]),
  crew('matron_hunt','Matron Hunt','gnoll',9,gnoll,
    'The matron heals her bonded hunters while a longshot covers their approach. Kill the source of their courage.',[
      m('matron','gnoll_matron',-55,0,lead),m('butcher','gnoll_butcher',65,-55),m('longshot','gnoll_longshot',-75,75),m('prowler','gnoll_prowler',50,75)],hunters),
  crew('spear_net','Spear Net','gnoll',6,gnoll,
    'A howler directs two pinning spears and a trapper. Their angles close a careless escape.',[
      m('howler','gnoll_howler',-20,0,lead),m('impalers','gnoll_impaler',60,0,{...pair,spacing:150}),m('trapper','gnoll_trapper',-100,0)],hunters),
  crew('pyre_raiders','Pyre Raiders','gnoll',15,gnoll,
    'Fire limits safe ground while skinners approach from the sides. Move before the circle closes.',[
      m('pyre','gnoll_pyrekeeper',-80,0,lead),m('skinners','gnoll_skinner',30,0,{...pair,spacing:170}),m('butcher','gnoll_butcher',90,0)],hunters),
  crew('ossuary_patrol','Ossuary Patrol','undead',5,graves,
    'A bone cleric mends two swords while an archer fires through their line.',[
      m('cleric','skeletal_cleric',-65,0,lead),m('swords','skeleton_warrior',65,0,{...pair,spacing:100}),m('archer','skeleton_archer',-40,95)]),
  crew('graveside_watch','Graveside Watch','undead',6,graves,
    'A grave shaman stands between two bound shades. Read the graves to judge their reach.',[
      m('shaman','grave_shaman',-50,0,lead),m('shades','gravebound_shade',60,0,{...pair,spacing:180}),m('shambler','zombie',100,0)],rooted),
  crew('lich_retinue','Lich Retinue','undead',18,graves,
    'A lich and cleric sustain a shield warden and archers. Support priorities matter more than charging the front.',[
      m('lich','crypt_lich',-75,-50,lead),m('cleric','skeletal_cleric',-90,65),m('warden','crypt_warden',90,0),m('archers','skeleton_archer',-5,0,{...pair,spacing:160})]),
  crew('grove_sentinels','Grove Sentinels','sylvan',8,sylvan,
    'A guard screens a singer and venom sprites. Turn the shield while avoiding their crossfire.',[
      m('warden','sylvan_warden',80,0,lead),m('singer','grove_singer',-75,0),m('sprites','thorn_sprite',-20,0,{...pair,spacing:170})]),
  crew('rooted_choir','Rooted Choir','sylvan',6,sylvan,
    'A singer supports two snapping plants and a wandering sapling. The vine masses mark the ambush boundary.',[
      m('singer','grove_singer',-60,0,lead),m('snappers','rootlash_snapper',55,0,{...pair,spacing:180}),m('sapling','sylvan_sapling',105,0)],rooted),
  crew('feeding_patch','Rootwild Feeding Patch','rootwild',5,rootwild,
    'Rooted jaws hold territory while burrlings pursue. Retreat past the stems before handling the pursuers.',[
      m('hingejaw','rootwild_hingejaw',20,-75,lead),m('coilmaw','rootwild_coilmaw',20,75),m('burrlings','rootwild_burrling',90,0,pair)],rooted),
  crew('nectar_patch','Nectar Patch','rootwild',9,rootwild,
    'A nectar bell heals two coilmaws while a thornfan covers the roots.',[
      m('nectar','rootwild_nectar_bell',-70,0,lead),m('jaws','rootwild_coilmaw',55,0,{...pair,spacing:170}),m('thorns','rootwild_thornfan',-20,100)],rooted),
  crew('drag_garden','Drag Garden','rootwild',12,rootwild,
    'A dragbloom pulls prey toward sundew and warned pitcher spills. Dodge the hook before committing.',[
      m('drag','rootwild_dragbloom',40,0,lead),m('sundew','rootwild_sundew',-15,-90),m('pitchers','rootwild_sporependulum',-70,35,{...pair,spacing:110})],rooted),
  crew('seedbed_wardens','Seedbed Wardens','rootwild',16,rootwild,
    'A seed-bearing matron, armored plant, healer, hookvine and windseed defend a mature bed.',[
      m('matron','rootwild_coppice',-30,0,lead),m('armor','rootwild_brambleback',100,0),
      m('nectar','rootwild_nectar_bell',-100,0),m('hook','rootwild_hookvine',30,-100),m('wing','rootwild_windseed',20,100)],rooted),
  crew('ashen_posts','Ashen Post Detail','demon',8,['hell_steppes','grindfields','wasteland'],
    'A houndmaster rallies two post-bound hounds. Their chains remain after the keeper falls.',[
      m('keeper','ashen_houndmaster',-60,0,lead),m('hounds','stakebound_hound',55,0,{...pair,spacing:180})],rooted),
  crew('infernal_battery','Infernal Battery','demon',14,hell,
    'A herald and cantor cast behind a siege hulk while imps disrupt the approach.',[
      m('herald','doomherald',-70,-55,lead),m('cantor','brimstone_cantor',-70,55),m('hulk','siege_hulk',90,0),m('imps','imp',20,0,{...pair,spacing:160})]),
  crew('tormentor_hunt','Tormentor Hunt','demon',12,hell,
    'A chain wielder and bloodgorger close while a fiend and hounds pressure escape routes.',[
      m('tormentor','chained_tormentor',0,0,lead),m('gorger','bloodgorger',95,0),m('fiend','cinder_fiend',-85,0),m('hounds','hellhound',30,0,{...pair,spacing:160})],hunters),
  crew('formic_foragers','Escorted Foragers','formic',5,formic,
    'A tender coordinates soldiers around a forager. Disrupt the colony voice before fighting the escorts.',[
      m('tender','formic_tender',-70,0,lead),m('soldiers','formic_soldier',60,0,{...pair,spacing:110}),m('forager','formic_forager',-15,85)]),
  crew('formic_glue_brigade','Glue Brigade','formic',10,formic,
    'Webs hold prey for a major and soldiers while a porter carries the colony forward.',[
      m('major','formic_major',85,0,lead),m('glue','formic_gluewright',-80,0),m('soldiers','formic_soldier',15,0,{...pair,spacing:150}),m('porter','formic_porter',-20,95)]),
  crew('flower_guard','Flower Guard','bloomkin',8,blooms,
    'A matron heals a hedge-raising warden and two dancers. Break the support before the garden walls divide you.',[
      m('matron','bramble_matron',-70,0,lead),m('warden','sepal_warden',90,0),m('dancers','petal_dancer',20,0,{...pair,spacing:160})]),
  crew('perfume_ambush','Perfume Ambush','bloomkin',12,blooms,
    'Roots and pollen conceal an orchid attacker while a seedcase fires over two nettle dancers.',[
      m('perfume','bloom_scentweaver',-70,0,lead),m('orchid','orchid_veil',10,-100),m('seedcase','seedcase_bombardier',-70,100),m('nettles','nettle_dervish',75,0,pair)],hunters),
  crew('winter_hunt','Winter Hunt','rimebound',9,rime,
    'A glacier shaman covers a lancer and two hounds. Cold pressure and fast approaches demand an open retreat.',[
      m('shaman','glacier_shaman',-75,0,lead),m('lancer','hoarfrost_lancer',85,0),m('hounds','rime_hound',25,0,{...pair,spacing:170})],hunters),
  crew('rime_battery','Rime Battery','rimebound',15,rime,
    'A herald rallies a shielded wrecker while frost casters punish a stalled approach.',[
      m('herald','winter_herald',-40,0,lead),m('wrecker','rime_wrecker',85,0),m('casters','glacier_shaman',-65,0,{...pair,spacing:150})]),
  crew('venom_procession','Venom Procession','coilborn',10,coils,
    'A priest strengthens a constrictor and two spitters. Avoid being pinned in their crossing venom.',[
      m('priest','fang_priest',-70,0,lead),m('knight','constrictor_knight',90,0),m('spitters','hooded_spitter',-15,0,{...pair,spacing:170})]),
  crew('molting_court','Molting Court','coilborn',14,coils,
    'A brood bearer advances under a siren song while shed-skin duelists flank.',[
      m('brood','brood_coiler',70,0,lead),m('siren','siren_adder',-85,0),m('duelists','skinshed_dervish',20,0,{...pair,spacing:160})],hunters),
  crew('canopic_detail','Canopic Detail','sarcophate',11,tombs,
    'A bearer curses behind a prison-raising warden and two legionaries. Do not let the line close behind you.',[
      m('bearer','canopic_bearer',-75,0,lead),m('warden','sarcophagus_warden',85,0),m('legion','sarcophate_legionary',25,0,{...pair,spacing:150})]),
  crew('organ_hunters','Canopic Hunting Court','sarcophate',16,tombs,
    'A vizier directs an ape, a falcon and jackals. Different bodies threaten the front, air and flanks.',[
      m('vizier','canopic_vizier',-80,0,lead),m('ape','canopic_ape',95,0),m('falcon','canopic_falcon',-10,100),m('jackals','canopic_jackal',20,-35,{...pair,spacing:100})],hunters),
  crew('horn_hunt','Horncall Hunt','beastkin',10,tribes,
    'A horncaller summons pressure around a gorer while two impalers cover the charge.',[
      m('horn','beastkin_horncaller',-70,0,lead),m('gorer','beastkin_gorer',95,0),m('impalers','beastkin_impaler',-10,0,{...pair,spacing:170})],hunters),
  crew('earthshaker_raid','Earthshaker Raid','beastkin',15,tribes,
    'Ground shocks displace prey into a flayer and two mobile chasers.',[
      m('earthshaker','beastkin_earthshaker',-70,0,lead),m('flayer','beastkin_flayer',75,0),m('chasers','beastkin_chaser',15,0,{...pair,spacing:170})],hunters),
].map(g=>[g.id,g]));
