import '../src/engine/world';
import {World} from '../src/engine/world';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';
import {address} from '../src/worldmass/address';
import {placeZoneAt} from '../src/engine/worldgen';
export function clientSetup(seed=991){
 bootSimEngine();const account=makeAccount(),writer=new World(account,Object.freeze(buildManifest(account,seed)));
 writer.createPlayer(CLASSES.find(c=>c.id==='warrior')!,{load:false});writer.sim.bindGeographyPolicies();
 const reader=createNativeGeographyReader(captureNativeGeographySource(seed)),geography=new MassNativeGeography(makeMassNativeGeographySpec(reader.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'}));
 const mint=(at:{x:number;y:number},id:string)=>{const request=geography.ownerContext(id,geography.physicalAnchor(at));const definition=placeZoneAt(at,null,writer.zoneMap,request.requestedSeed,{seed:request.requestedSeed,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt,levelFor:writer['levelFor'],courseFor:writer['courseMintFor']('surface')});writer.zoneMap[definition.id]=definition;return definition;};
 return{writer,geography,definition:mint({x:-55,y:160},'client-initial'),destination:mint({x:455,y:160},'client-destination')};
}
