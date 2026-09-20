import type { EncounterCueSpec } from './warningCues';
import type { EncounterGroupDef, EncounterMember } from '../engine/encounterGroups';
import type { EncounterCombatSpec } from '../engine/encounterCombat';

const expedition:EncounterCombatSpec={plans:['protect_support','covered_withdrawal','crossfire'],
  roles:{vanguard:'guard',mender:'support',arcanist:'ranged',scout:'ranged',outrider:'flanker'}};
/** Existing crews opt in explicitly; ordinary squads remain unchanged. */
export const ENCOUNTER_DOCTRINES:Record<string,EncounterCombatSpec>={
  wayward_expedition:{...expedition,roles:{vanguard:'guard',mender:'support',arcanist:'ranged',scout:'ranged'}},
  wayward_veterans:expedition,
  powder_line:{plans:['crossfire','covered_withdrawal'],roles:{bulwark:'guard',fusiliers:'ranged',powder:'controller'}},
  nectar_patch:{plans:['protect_support','covered_withdrawal'],roles:{nectar:'support',jaws:'guard',thorns:'ranged'},
    cues:{protect_support:{style:'cover'},covered_withdrawal:{style:'withdraw'}}},
  drag_garden:{plans:['root_barrage'],roles:{drag:'controller',sundew:'guard',pitchers:'ranged'}},
  seedbed_wardens:{plans:['protect_support','root_barrage'],roles:{matron:'controller',armor:'guard',nectar:'support',hook:'controller',wing:'ranged'}},
  ashen_posts:{plans:['pincer'],roles:{keeper:'controller',hounds:'flanker'},cues:{pincer:{style:'pincer'}}},
  spear_net:{plans:['pincer'],roles:{howler:'support',impalers:'flanker',trapper:'controller'}},
};
const m=(role:string,monster:string,forward:number,side:number,extra:Partial<EncounterMember>={}):EncounterMember=>
  ({slot:role,role,monster,at:{forward,side},...extra});
const leader={leader:true},pair={count:[2,2] as [number,number],spacing:155};
const crew=(id:string,name:string,faction:string,minLevel:number,tilesets:string[],description:string,
  plans:string[],members:EncounterMember[],cues?:Record<string,EncounterCueSpec>):EncounterGroupDef=>({id,name,faction,minLevel,weight:1,habitats:{tilesets},description,members,
    tactics:{squad:{focusLeader:true,formation:'wedge',spacing:65,onLeaderDeath:'scatter'}},encounterCombat:{plans,cues}});
const fungal=['fungal_hollow','mycelia','mulchreach','undergrowth'];
const hollow=['metropolis','buried_vault','durance','ossuary'];
const ember=['cinderlands','magma_gallery','volcanic','wyrmfields'];
const vermin=['metropolis','townhouse','sewerworks'];

export const TACTICAL_ENCOUNTERS:Record<string,EncounterGroupDef>=Object.fromEntries([
  crew('ashen_hunting_school','Ashen Hunting School','demon',12,['hell_steppes','grindfields','wasteland'],
    'A kennel master directs two posted guards, two roaming hounds and a fire caster. Bait the hunters beyond the posts.',
    ['pincer','root_barrage','covered_withdrawal'],[
      m('controller','ashen_houndmaster',-70,0,leader),m('guard','stakebound_hound',0,0,pair),
      m('flanker','hellhound',110,0,pair),m('ranged','cinder_fiend',-120,95)],{root_barrage:{style:'gather'}}),
  crew('snare_nursery','Rootwild Snare Nursery','rootwild',13,['forest','jungle','mire','rootways'],
    'A dragbloom coordinates rooted jaws, healing nectar, thorn fire and roaming burrlings. Disrupt the bell or bait the pull.',
    ['protect_support','root_barrage','pincer'],[
      m('controller','rootwild_dragbloom',0,0,leader),m('guard','rootwild_coilmaw',100,0),
      m('support','rootwild_nectar_bell',-110,0),m('ranged','rootwild_thornfan',-55,110),m('flanker','rootwild_burrling',30,-100,pair)],
      {protect_support:{style:'cover'},pincer:{style:'pincer'}}),
  crew('spore_tenders','Spore-Tender Escort','fungal',9,fungal,
    'A summoning tender marches behind a digesting brute and paired spitters. Break the screen to interrupt the brood.',
    ['protect_support','crossfire','covered_withdrawal'],[
      m('support','fungal_tender',-80,0,leader),m('guard','fungal_brute',80,0),m('ranged','fungal_spitter',0,0,pair)]),
  crew('myconid_sporecourt','Myconid Sporecourt','fungal',14,fungal,
    'A capcaller and spore drifters saturate ground while two entangling warriors close the sides.',
    ['root_barrage','pincer','countercast'],[
      m('controller','myconid_capcaller',-65,0,leader),m('ranged','spore_drifter',-20,0,pair),m('flanker','myconid_warrior',90,0,pair)],{root_barrage:{style:'gather'}}),
  crew('scripture_guard','Scripture Guard','hollowborn',12,hollow,
    'Animated armor protects a scripture harness and two singing helms. Their defense exposes a slow retreat when the guard cracks.',
    ['protect_support','crossfire','covered_withdrawal'],[
      m('support','hollow_scripture_harness',-90,0,leader),m('guard','hollow_vanguard',85,0),m('ranged','helm_choir',-15,0,pair)]),
  crew('unworn_procession','Unworn Procession','hollowborn',16,hollow,
    'A saint sustains a shield anima and paired empty suits. Circle the anima to pull the procession apart.',
    ['protect_support','pincer'],[
      m('support','panoply_saint',-85,0,leader),m('guard','shield_anima',85,0),m('flanker','the_unworn',20,0,pair)]),
  crew('cinder_liturgy','Cinder Liturgy','emberkin',10,ember,
    'A chorister and paired ashling casters work behind a slag brute. Their planted firing windows invite a committed assault.',
    ['crossfire','covered_withdrawal'],[
      m('support','cinder_chorister',-90,0,leader),m('guard','slag_brute',80,0),m('ranged','ashling',-10,0,pair)]),
  crew('ember_drovers','Ember Drovers','emberkin',12,ember,
    'A shepherd drives two cinder hounds around a slag brute. The pack commits its flanks, then pauses to reform.',
    ['pincer','protect_support'],[
      m('support','ember_shepherd',-80,0,leader),m('guard','slag_brute',80,0),m('flanker','cinder_hound',10,0,pair)]),
  crew('pipers_ambush','Piper’s Ambush','vermin',10,vermin,
    'A piper fills the approach with vermin while two skulkers slip to the sides and a fester rat worries the front.',
    ['pincer'],[m('controller','vermin_piper',-75,0,leader),m('guard','fester_rat',85,0),m('flanker','verminkin_skulker',15,0,pair)]),
  crew('warren_coven','Warren Coven','vermin',14,vermin,
    'A broodpriest and two pipers make a swarming battery, screened by two fester rats. Press during their regrouping windows.',
    ['crossfire','root_barrage','countercast'],[
      m('controller','verminkin_broodpriest',-85,0,leader),m('ranged','vermin_piper',-20,0,pair),m('guard','fester_rat',85,0,pair)],{root_barrage:{style:'gather'}}),
  crew('ruin_blowgun_screen','Ruin Blowgun Screen','junglekin',12,['jungle','sunken_ruin'],
    'A spore caller directs paired blowguns behind a saurian bulwark. Pressure the caller or turn the armored screen.',
    ['crossfire','root_barrage','covered_withdrawal'],[
      m('controller','spore_caller',-80,0,leader),m('guard','saurian_bulwark',90,0),m('ranged','blowgun_wretch',-15,0,pair)],{root_barrage:{style:'gather'}}),
  crew('rift_observatory','Rift Observatory','abyssal',18,['abyssal_rift'],
    'A horologist reads long casts while two foldwrights and an ascetic hold the rift. Feint a cast, then exploit their committed volley.',
    ['crossfire','countercast','covered_withdrawal'],[
      m('controller','abyssal_horologist',-80,0,leader),m('guard','rift_ascetic',80,0),m('ranged','abyssal_foldwright',-10,0,pair)]),
].map(g=>[g.id,g]));
