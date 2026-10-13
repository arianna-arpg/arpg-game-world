/** Persisted retained authority. This is integrity/provenance data, not a security
 * signature. A resume still needs the real storage lease and staged account check. */
import type {MassWorldCheckpoint} from './checkpoint';
import type {WorldStateSave} from '../meta/worldstate';
import type {CharacterSave} from '../meta/character';
import type {ExpeditionManifest} from '../packages/manifest';
import {copyNativeGeographyData} from '../world/geographySource';
import {MassNativeGeography,type MassNativeGeographySpec} from './nativeGeography';
import {NativeGeographyCatalog,type NativeGeographyCatalogSpec} from './nativeGeographyCatalog';
import {canonical,freezeData,massDigest} from './random';
export interface NativeRetainedSaveV1 {
 readonly version:1;readonly policy:'native-retained-recorded-world';
 readonly geography:Readonly<MassNativeGeographySpec>;
 readonly manifest:ExpeditionManifest;
 readonly character:{readonly classId:string;readonly charId:string|null;readonly modeId:string|null};
 /** Fingerprint of the persisted world JSON excluding this envelope. */
 readonly worldHash:string;
}
export interface NativeRetainedSaveV2 {
 readonly version:2;readonly policy:'native-retained-recorded-world';
 readonly catalog:Readonly<NativeGeographyCatalogSpec>;readonly manifest:ExpeditionManifest;
 readonly character:NativeRetainedSaveV1['character'];readonly worldHash:string;
}
export type NativeRetainedSave=NativeRetainedSaveV1|NativeRetainedSaveV2;
type Identity=Pick<CharacterSave,'classId'|'charId'|'modeId'>;
const identity=(c:Identity):NativeRetainedSave['character']=>({classId:c.classId,charId:c.charId??null,modeId:c.modeId??null});
/** Used only by the genuine writer registry after the native save body finishes.
 * The JSON normalization matches the existing persistence writer's omissions. */
export function makeNativeRetainedSave(geography:MassNativeGeography,manifest:ExpeditionManifest,character:Identity,world:MassWorldCheckpoint):NativeRetainedSaveV1 {
 if(world.nativeRetained!==undefined||world.worldmass!==undefined||world.massSideareas!==undefined)throw Error('Retained save cannot mix authority envelopes');
 if(geography.seed!==manifest.seed)throw Error('Retained save geography and manifest differ');
 const persisted=JSON.parse(JSON.stringify(world)) as WorldStateSave;
 return freezeData({version:1 as const,policy:'native-retained-recorded-world' as const,geography:copyNativeGeographyData(geography.spec),manifest:copyNativeGeographyData(manifest),character:identity(character),worldHash:massDigest(persisted)});
}
export interface NativeRetainedResumeRecord {readonly geography:MassNativeGeography;readonly manifest:ExpeditionManifest;readonly world:WorldStateSave;readonly catalog?:NativeGeographyCatalog}
/** Read only recorded bytes. Missing old authority is an explicit migration gap;
 * no capture, generation, manifest reconciliation or legacy-runtime fallback. */
export function readNativeRetainedSave(save:CharacterSave):NativeRetainedResumeRecord {
 const world=save.world;
 if(!world?.nativeRetained)throw Error('This save has no recorded retained geography; migration is required and the save was not changed');
 const clean=copyNativeGeographyData(world),envelope=clean.nativeRetained!;
 if(envelope.version===2)return readNativeCatalogSave(save,clean,envelope);
 const keys=Object.keys(envelope).sort().join(',');
 if(keys!=='character,geography,manifest,policy,version,worldHash'||envelope.version!==1||envelope.policy!=='native-retained-recorded-world')throw Error('Unsupported retained save authority');
 if(clean.worldmass!==undefined||clean.massSideareas!==undefined)throw Error('Retained Continue cannot import legacy Mass state');
 if(canonical(identity(save))!==canonical(envelope.character)||!save.expedition||canonical(copyNativeGeographyData(save.expedition))!==canonical(envelope.manifest))throw Error('Retained character or manifest identity differs');
 delete clean.nativeRetained;
 if(typeof envelope.worldHash!=='string'||massDigest(clean)!==envelope.worldHash)throw Error('Retained world identity differs');
 const geography=new MassNativeGeography(envelope.geography);
 if(geography.seed!==envelope.manifest.seed)throw Error('Retained recorded source belongs to another expedition');
 // The restored object is private; the storage authority's frozen bytes stay intact.
 return {geography,manifest:copyNativeGeographyData(envelope.manifest),world:clean};
}

/** Catalog saves have their own version; the v1 reader/writer path above keeps
 * its original recorded single mapping and never invents absent dimensions. */
export function makeNativeCatalogRetainedSave(catalog:NativeGeographyCatalog,manifest:ExpeditionManifest,character:Identity,world:MassWorldCheckpoint):NativeRetainedSaveV2 {
 if(world.nativeRetained!==undefined||world.worldmass!==undefined||world.massSideareas!==undefined)throw Error('Retained save cannot mix authority envelopes');
 if(catalog.initial.seed!==manifest.seed)throw Error('Retained catalog and manifest differ');
 const persisted=JSON.parse(JSON.stringify(world)) as WorldStateSave;
 return freezeData({version:2 as const,policy:'native-retained-recorded-world' as const,catalog:copyNativeGeographyData(catalog.spec),manifest:copyNativeGeographyData(manifest),character:identity(character),worldHash:massDigest(persisted)});
}
function readNativeCatalogSave(save:CharacterSave,clean:WorldStateSave,envelope:NativeRetainedSaveV2):NativeRetainedResumeRecord {
 if(Object.keys(envelope).sort().join(',')!=='catalog,character,manifest,policy,version,worldHash'||envelope.policy!=='native-retained-recorded-world')throw Error('Unsupported retained catalog authority');
 if(clean.worldmass!==undefined||clean.massSideareas!==undefined)throw Error('Retained Continue cannot import legacy Mass state');
 if(canonical(identity(save))!==canonical(envelope.character)||!save.expedition||canonical(copyNativeGeographyData(save.expedition))!==canonical(envelope.manifest))throw Error('Retained character or manifest identity differs');
 delete clean.nativeRetained;
 if(typeof envelope.worldHash!=='string'||massDigest(clean)!==envelope.worldHash)throw Error('Retained world identity differs');
 const catalog=new NativeGeographyCatalog(envelope.catalog);
 if(catalog.initial.seed!==envelope.manifest.seed)throw Error('Retained catalog belongs to another expedition');
 return {geography:catalog.initial,catalog,manifest:copyNativeGeographyData(envelope.manifest),world:clean};
}
