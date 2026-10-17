import '../src/engine/world';
import {World} from '../src/engine/world';
import {makeSimWorld} from '../src/sim/arena';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';
import {address} from '../src/worldmass/address';
import {placeZoneAt} from '../src/engine/worldgen';
import {NativeAreaCampaignSession} from '../src/worldmass/nativeAreaCampaignSession';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaMaddenLedger} from '../src/worldmass/nativeAreaMaddenLedger';
import {NativeAreaMemoryRegistry} from '../src/worldmass/nativeAreaMemoryRegistry';
import {NativeAreaSceneTransitionCoordinator} from '../src/worldmass/nativeAreaSceneTransitionCoordinator';
import {NativeAreaScenePreparation} from '../src/worldmass/nativeAreaScenePreparation';
import type {NativeAreaOngoingRuntime} from '../src/worldmass/nativeAreaSceneOngoing';
/** Test setup uses the ordinary native campaign constructor and actual geography.
 * No World scene/queue gets substituted and no callback fakes a combat provider. */
export function nativeCampaignFixture(seed=991){
 makeSimWorld('warrior',seed); // existing headless environment only
 const account=makeAccount(),writer=new World(account,Object.freeze(buildManifest(account,seed)));
 writer.createPlayer(CLASSES.find(c=>c.id==='warrior')!,{startingCompanions:false});writer.sim.bindGeographyPolicies();
 const reader=createNativeGeographyReader(captureNativeGeographySource(seed));
 const geography=new MassNativeGeography(makeMassNativeGeographySpec(reader.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'}));
 const at={x:-55,y:160},request=geography.ownerContext('actual-native-combat-course',geography.physicalAnchor(at));
 const definition=placeZoneAt(at,null,writer.zoneMap,request.requestedSeed,{seed:request.requestedSeed,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt,levelFor:writer['levelFor'],courseFor:writer['courseMintFor']('surface')});writer.zoneMap[definition.id]=definition;
 return{writer,geography,definition};
}
/** All of this executes under the World local-driver trap in acceptance callers. */
export function birthActualNativeArea(setup:ReturnType<typeof nativeCampaignFixture>){
 const {writer,definition,geography}=setup,session=new NativeAreaCampaignSession(writer),campaign=session.campaign;
 const authority=new NativeAreaActorAuthority<NativeAreaOngoingRuntime>(campaign),memoryRegistry=new NativeAreaMemoryRegistry(writer),coordinator=new NativeAreaSceneTransitionCoordinator({campaign,characterWriter:writer,authority,memoryRegistry});session.bindCoordinator(coordinator);
 const maddenLedger=new NativeAreaMaddenLedger({campaign,authority,banks:writer['maddenBanks']}),preparation=new NativeAreaScenePreparation({session,coordinator,authority,maddenLedger});
 const ongoing=preparation.prepare(definition.id,geography);preparation.birthInitial(ongoing);
 return{...setup,session,campaign,authority,memoryRegistry,coordinator,maddenLedger,preparation,ongoing};
}

/** Real generated destination, minted before the World-driver trap. */
export function mintAdditionalNativeArea(setup:ReturnType<typeof nativeCampaignFixture>,at={x:455,y:160}){
 const {writer,geography}=setup,seed=writer.manifest.seed,reader=createNativeGeographyReader(captureNativeGeographySource(seed)),request=geography.ownerContext('actual-native-travel-destination',geography.physicalAnchor(at));
 const definition=placeZoneAt(at,null,writer.zoneMap,request.requestedSeed,{seed:request.requestedSeed,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt,levelFor:writer['levelFor'],courseFor:writer['courseMintFor']('surface')});writer.zoneMap[definition.id]=definition;return definition;
}
