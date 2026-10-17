import {STARFALL_CFG,AMALGAM_GRAVE_RING,CONTAGION_GRAFT_KEY,DEEPWINTER_FROZEN_LIQUID,DEEPWINTER_THAWED_LIQUIDS,HARBORCOVE_LAYOUT,SCENERY_CFG,hashStr} from './nativeSceneConfig';
import {type NativeInhabitantSources} from './nativeInhabitants';
import {type NativeHostilitySources} from './nativeHostility';
import {type NativeStatusRelaySources} from './nativeStatusRelay';
import {type NativeMonsterFactorySources} from './nativeMonsterFactory';
import {type NativePopulationSources} from './nativePopulationResolution';
import {type NativeExitPreparationSources} from './nativeExitPreparation';

import {clearPartScar} from './anatomyCues';
import {throngTravelProtected} from './throngEvolution';
import {monsterTurnSpeed} from './handling';
import {biomeFrontierTarget} from './worldgen';
import {chance,clamp,dist,rand,randInt,vec} from '../core/math';
import {mod} from './stats';
import {STATUS_DEFS} from './status';
import {Actor} from './actor';
import {DEFENSE_CFG} from './defense';
import {normalizeBrain} from './brain';
import {makeSkillInstance,validTreeNodes} from './skills';
import {rollItem} from './itemgen';
import {SKILLS} from '../data/skills';
import {CAVE_POOLS,CAVE_POOL_CFG,FACTIONS,FIXTURE_IDS,MONSTERS,WILDLIFE,factionStance,defBreathes,defDensity} from '../data/monsters';
import {presenceMul} from './presence';
import {SUPPORTS} from '../data/supports';
import {CHOICE_GROUPS} from '../data/passiveChoices';
import {skyOf} from '../data/zones';
import {PROCESSION_CFG} from '../data/processions';
import {blocksMovement} from './levelgen';
import {squishSpecOf} from './squish';
import {sameStory,storyTable,tierFloorAt,TIER_CFG} from './tiers';
import {gateThroatAt} from './layoutRecipes';
import {liquidOf} from './genkit';
import {sympathyStat} from './sympathy';
import {rollFolk} from '../data/innfolk';
import {placeZoneAt,spacedExitAt,footprintBars,MIN_PORTAL_SEP,PORTAL_RADIUS,PORTAL_EDGE_INSET} from './worldgen';
import {VOYAGE_CFG,ISLAND_FIELD,islandsNear} from '../world/voyage';
import {TILESETS,CAVE_FACE_IDS} from '../data/tilesets';
import {Rng,withSeededRandom} from '../core/rng';
import {BIOMES} from '../world/biomes';
import {boundaryGateOf} from '../data/boundaryGates';
import {isFieldPixel} from '../world/fieldRegion';
import {zoneKindOf} from '../data/zoneKinds';
import {eventLevel as resolveEventLevel} from '../world/levelField';
import {factionAllowed} from '../world/zonePolicy';
import {FOG_BANKS,FOG_CFG,FogField} from './fog';
import {attunedStatus,rollStartTone,TUNE_CFG} from './tuning';
import {clingBurrowed} from './cling';
import {STATUS_RELAYS,STATUS_RELAY_IDS,relayStatusStat} from './reception';
import {tellSpecsOf} from './tells';
import {makeSpeakerRow} from './speechGrammar';
import {makeReserve} from './reserves';
import {WATCH_CFG} from './watch';
import {plyCountOf} from './plies';
import {SEA_CFG} from '../data/seas';
import {seaAt,seaSpotsNear} from '../world/seas';
import {HOLD_COMPOSITIONS,holdClassFor,mintHoldState} from '../data/harborholds';
import {dimensionDef,dimensionBiomeAt} from '../world/dimensions';
import {COURSE_FIELD_SALT,courseBiomeAt,strewnInstancesNear} from '../world/courses';
import {bumpLedger} from '../packages/ledger';
import {strainOf} from '../packages/contagionStrains';
import {lordDef} from '../packages/lords';
import {packageSeed} from '../packages/registry';
import {type NativeMonsterPromotionSources} from './nativeMonsterPromotion';
import {rollRarity,rarityMods,RARITY_DEFS} from './rarity';
import {magicPackPool,magicPackSize,magicPackMinimum,rollMagicPack,updateMagicPacks} from './magicPacks';
import {MAGIC_PACKS,MAGIC_PACK_CFG} from '../data/magicPacks';
import {encounterGroupContext,rollEncounterGroup,planEncounterGroup,applyEncounterGroup} from './encounterGroups';
import {ENCOUNTER_GROUPS,ENCOUNTER_GROUP_CFG} from '../data/encounterGroups';
import {stepMagicPackMechanics} from './magicPackMechanics';
import {MONSTER_NAME_CFG,rollMonsterName} from '../data/monsterNames';
import {DAY_LENGTH} from '../world/daynight';
import {exitInside} from '../world/shape';
import {type NativeSceneEnvironmentSources} from './nativeSceneEnvironment';
import {type NativeSceneEcologySources} from './nativeSceneEcology';
import * as nativeRuntimeBirth from './nativeSceneRuntimeBirth';
import {type NativeSceneCoastSources} from './nativeSceneCoast';
import {XP_SCALE,MONSTER_LEVEL_SCALE,COUNT_SCALE,REF_AREA,POCKET_CFG,FIELD_PACK_AREA_CAP,monsterSkillLevelOf,rollPackSize,CAVE_POOL_SALT,nativeWeightedPick} from './nativePopulationRules';
/** Actual installed native source providers. They read live registries and the current random scope; no World instance is captured. */
export function installedNativeFactorySources():NativeMonsterFactorySources {
 return {
      get Actor() { return Actor; },
      get MONSTERS() { return MONSTERS; },
      get vec() { return vec; },
      get mod() { return mod; },
      get sympathyStat() { return sympathyStat; },
      get rand() { return rand; },
      get tellSpecsOf() { return tellSpecsOf; },
      get DEFENSE_CFG() { return DEFENSE_CFG; },
      get defDensity() { return defDensity; },
      get defBreathes() { return defBreathes; },
      get squishSpecOf() { return squishSpecOf; },
      get makeReserve() { return makeReserve; },
      get rollStartTone() { return rollStartTone; },
      get attunedStatus() { return attunedStatus; },
      get TUNE_CFG() { return TUNE_CFG; },
      get chance() { return chance; },
      get rollItem() { return rollItem; },
      get monsterTurnSpeed() { return monsterTurnSpeed; },
      get makeSkillInstance() { return makeSkillInstance; },
      get SKILLS() { return SKILLS; },
      get SUPPORTS() { return SUPPORTS; },
      get validTreeNodes() { return validTreeNodes; },
      get CHOICE_GROUPS() { return CHOICE_GROUPS; },
      get plyCountOf() { return plyCountOf; },
      get MONSTER_LEVEL_SCALE() { return MONSTER_LEVEL_SCALE; },
      get XP_SCALE() { return XP_SCALE; },
      get monsterSkillLevelOf() { return monsterSkillLevelOf; },
      get random() { return Math.random; },
    };
}
export function installedNativePromotionSources():NativeMonsterPromotionSources {
 return {
      get RARITY_DEFS() { return RARITY_DEFS; }, get rarityMods() { return rarityMods; },
      get MONSTER_NAME_CFG() { return MONSTER_NAME_CFG; }, get rollMonsterName() { return rollMonsterName; },
      get MAGIC_PACKS() { return MAGIC_PACKS; }, get MAGIC_PACK_CFG() { return MAGIC_PACK_CFG; },
      get magicPackMinimum() { return magicPackMinimum; }, get MONSTERS() { return MONSTERS; },
      get stepMagicPackMechanics() { return stepMagicPackMechanics; }, get updateMagicPacks() { return updateMagicPacks; },
      get SKILLS() { return SKILLS; }, get makeSkillInstance() { return makeSkillInstance; },
      get monsterSkillLevelOf() { return monsterSkillLevelOf; }, get random() { return Math.random; },
    };
}
export function installedNativePopulationSources():NativePopulationSources {
 return {
      get FACTIONS() { return FACTIONS; }, get MONSTERS() { return MONSTERS; },
      get WILDLIFE() { return WILDLIFE; }, get TILESETS() { return TILESETS; },
      get CAVE_FACE_IDS() { return CAVE_FACE_IDS; }, get CAVE_POOL_CFG() { return CAVE_POOL_CFG; },
      get CAVE_POOLS() { return CAVE_POOLS; }, get CAVE_POOL_SALT() { return CAVE_POOL_SALT; },
      get Rng() { return Rng; }, get factionAllowed() { return factionAllowed; }, get presenceMul() { return presenceMul; },
    };
}
export function installedNativeHostilitySources():NativeHostilitySources {
 return {
      get throngTravelProtected() { return throngTravelProtected; }, get clingBurrowed() { return clingBurrowed; },
      get normalizeBrain() { return normalizeBrain; }, get STATUS_DEFS() { return STATUS_DEFS; },
      get factionStance() { return factionStance; }, get dist() { return dist; },
    };
}
export function installedNativeRelaySources():NativeStatusRelaySources {
 return {
      get STATUS_RELAY_IDS() { return STATUS_RELAY_IDS; }, get STATUS_RELAYS() { return STATUS_RELAYS; },
      get relayStatusStat() { return relayStatusStat; }, get sameStory() { return sameStory; }, get dist() { return dist; },
    };
}
export function installedNativeExitSources():NativeExitPreparationSources {
 return {get PORTAL_EDGE_INSET(){return PORTAL_EDGE_INSET;},get MIN_PORTAL_SEP(){return MIN_PORTAL_SEP;},
      get BIOMES(){return BIOMES;},get TILESETS(){return TILESETS;},get PROCESSION_CFG(){return PROCESSION_CFG;},
      get isFieldPixel(){return isFieldPixel;},get exitInside(){return exitInside;},get biomeFrontierTarget(){return biomeFrontierTarget;},
      warn:message=>console.warn(message)};
}
export function installedNativeRuntimeSources():nativeRuntimeBirth.NativeSceneRuntimeBirthSources {
 return {
      get bumpLedger():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['bumpLedger']{return bumpLedger;},
      get vec():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['vec']{return vec;},
      get MONSTERS():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['MONSTERS']{return MONSTERS;},
      get clamp():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['clamp']{return clamp;},
      get FACTIONS():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['FACTIONS']{return FACTIONS;},
      get dist():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['dist']{return dist;},
      get randInt():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['randInt']{return randInt;},
      get rollRarity():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['rollRarity']{return rollRarity;},
      get rand():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['rand']{return rand;},
      get Rng():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['Rng']{return Rng;},
      get packageSeed():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['packageSeed']{return packageSeed;},
      get hashStr():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['hashStr']{return hashStr;},
      get gateThroatAt():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['gateThroatAt']{return gateThroatAt;},
      get boundaryGateOf():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['boundaryGateOf']{return boundaryGateOf;},
      get blocksMovement():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['blocksMovement']{return blocksMovement;},
      get AMALGAM_GRAVE_RING():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['AMALGAM_GRAVE_RING']{return AMALGAM_GRAVE_RING;},
      get SKILLS():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['SKILLS']{return SKILLS;},
      get makeSkillInstance():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['makeSkillInstance']{return makeSkillInstance;},
      get SUPPORTS():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['SUPPORTS']{return SUPPORTS;},
      get lordDef():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['lordDef']{return lordDef;},
      get strainOf():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['strainOf']{return strainOf;},
      get STATUS_DEFS():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['STATUS_DEFS']{return STATUS_DEFS;},
      get WATCH_CFG():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['WATCH_CFG']{return WATCH_CFG;},
      get CONTAGION_GRAFT_KEY():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['CONTAGION_GRAFT_KEY']{return CONTAGION_GRAFT_KEY;},
      get liquidOf():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['liquidOf']{return liquidOf;},
      get DEEPWINTER_FROZEN_LIQUID():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['DEEPWINTER_FROZEN_LIQUID']{return DEEPWINTER_FROZEN_LIQUID;},
      get DEEPWINTER_THAWED_LIQUIDS():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['DEEPWINTER_THAWED_LIQUIDS']{return DEEPWINTER_THAWED_LIQUIDS;},
      get FOG_BANKS():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['FOG_BANKS']{return FOG_BANKS;},
      get FIXTURE_IDS():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['FIXTURE_IDS']{return FIXTURE_IDS;},
      get skyOf():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['skyOf']{return skyOf;},
      get STARFALL_CFG():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['STARFALL_CFG']{return STARFALL_CFG;},
      get chance():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['chance']{return chance;},
      get clearPartScar():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['clearPartScar']{return clearPartScar;},
      get FogField():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['FogField']{return FogField;},
      get FOG_CFG():nativeRuntimeBirth.NativeSceneRuntimeBirthSources['FOG_CFG']{return FOG_CFG;},
    };
}
export function installedNativeCoastSources():NativeSceneCoastSources {
 return {
      get VOYAGE_CFG():NativeSceneCoastSources['VOYAGE_CFG']{return VOYAGE_CFG;},
      get ISLAND_FIELD():NativeSceneCoastSources['ISLAND_FIELD']{return ISLAND_FIELD;},
      get islandsNear():NativeSceneCoastSources['islandsNear']{return islandsNear;},
      get seaSpotsNear():NativeSceneCoastSources['seaSpotsNear']{return seaSpotsNear;},
      get seaAt():NativeSceneCoastSources['seaAt']{return seaAt;},
      get TILESETS():NativeSceneCoastSources['TILESETS']{return TILESETS;},
      get SEA_CFG():NativeSceneCoastSources['SEA_CFG']{return SEA_CFG;},
      get placeZoneAt():NativeSceneCoastSources['placeZoneAt']{return placeZoneAt;},
      get holdClassFor():NativeSceneCoastSources['holdClassFor']{return holdClassFor;},
      get mintHoldState():NativeSceneCoastSources['mintHoldState']{return mintHoldState;},
      get HOLD_COMPOSITIONS():NativeSceneCoastSources['HOLD_COMPOSITIONS']{return HOLD_COMPOSITIONS;},
      get HARBORCOVE_LAYOUT():NativeSceneCoastSources['HARBORCOVE_LAYOUT']{return HARBORCOVE_LAYOUT;},
      get resolveEventLevel():NativeSceneCoastSources['resolveEventLevel']{return resolveEventLevel;},
      get zoneKindOf():NativeSceneCoastSources['zoneKindOf']{return zoneKindOf;},
      get footprintBars():NativeSceneCoastSources['footprintBars']{return footprintBars;},
      get spacedExitAt():NativeSceneCoastSources['spacedExitAt']{return spacedExitAt;},
      get biomeFrontierTarget():NativeSceneCoastSources['biomeFrontierTarget']{return biomeFrontierTarget;},
      get PORTAL_RADIUS():NativeSceneCoastSources['PORTAL_RADIUS']{return PORTAL_RADIUS;},
      get COURSE_FIELD_SALT():NativeSceneCoastSources['COURSE_FIELD_SALT']{return COURSE_FIELD_SALT;},
      get dimensionDef():NativeSceneCoastSources['dimensionDef']{return dimensionDef;},
      get dimensionBiomeAt():NativeSceneCoastSources['dimensionBiomeAt']{return dimensionBiomeAt;},
      get strewnInstancesNear():NativeSceneCoastSources['strewnInstancesNear']{return strewnInstancesNear;},
      get courseBiomeAt():NativeSceneCoastSources['courseBiomeAt']{return courseBiomeAt;},
    };
}
export function installedNativeInhabitantSources():NativeInhabitantSources {
 return {
    get MONSTERS() { return MONSTERS; }, get FIXTURE_IDS() { return FIXTURE_IDS; }, get FACTIONS() { return FACTIONS; },
    get RARITY_DEFS() { return RARITY_DEFS; }, get DAY_LENGTH() { return DAY_LENGTH; },
    get vec() { return vec; }, get rand() { return rand; }, get randInt() { return randInt; },
    get hashStr() { return hashStr; }, get withSeededRandom() { return withSeededRandom; },
    get rollFolk() { return rollFolk; }, get makeSpeakerRow() { return makeSpeakerRow; }, get random() { return Math.random; },
  };
}
export function installedNativeEcologySources():NativeSceneEcologySources {
 return {get XP_SCALE(){return XP_SCALE;}};
}
export function installedNativeEnvironmentSources():NativeSceneEnvironmentSources {
 return {get SCENERY_CFG(){return SCENERY_CFG;}};
}

export type InstalledNativeAmbientCampaign = Pick<import('./nativeAmbient').NativeAmbientHost,'packageActive'|'notice'>;
export function installedNativeAmbientSources(campaign:InstalledNativeAmbientCampaign):import('../worldmass/nativeAreaAmbient').NativeAreaAmbientSources['ambient'] {
 return {
 config: { get countScale() { return COUNT_SCALE; }, get referenceArea() { return REF_AREA; },
 get fieldAreaCap() { return FIELD_PACK_AREA_CAP; }, get pocketAreaFloor() { return POCKET_CFG.packAreaFloor; },
 get tierPackSplit() { return TIER_CFG.packSplit; } },
 get random(){return Math.random;},rand,randInt,monster:id=>MONSTERS[id],
 packageActive:(...args)=>campaign.packageActive(...args),weightedPick:nativeWeightedPick,
 rollPackSize,rollRarity,magicPackPool,magicPackSize,rollMagicPack,storyTable,tierFloorAt,encounterGroupContext,rollEncounterGroup,presenceMul,
 notice:(...args)=>campaign.notice(...args),
 };
}
export function installedNativeGroupSources():import('../worldmass/nativeAreaAmbient').NativeAreaAmbientSources['groups'] {
 return {config:{get radius(){return ENCOUNTER_GROUP_CFG.radius;},get placementAttempts(){return ENCOUNTER_GROUP_CFG.placementAttempts;},get placementJitter(){return ENCOUNTER_GROUP_CFG.placementJitter;},get bodyClearance(){return ENCOUNTER_GROUP_CFG.bodyClearance;}},
 group:id=>ENCOUNTER_GROUPS[id],encounterGroupContext,planEncounterGroup,applyEncounterGroup};
}
