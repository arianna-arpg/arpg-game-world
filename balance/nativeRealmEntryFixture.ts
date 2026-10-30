import assert from 'node:assert/strict';
import type {World} from '../src/engine/world';
import type {NativeAreaSceneCampaignFrame} from '../src/worldmass/nativeAreaSceneCampaignFrame';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
export const realmKinds=['demon','crusade','necropolis','fracture'] as const;
export type RealmKind=typeof realmKinds[number];
export const realmKeys={demon:'realmContext',crusade:'crusadeRealmContext',necropolis:'necropolisRealmContext',fracture:'fractureRealmContext'} as const;
export const realmTags={demon:'balor_realm',crusade:'crusade_leader',necropolis:'necropolis_boss',fracture:'fracture_boss'} as const;
/** Each lane finishes its initial birth BEFORE staging the same authored event.
 * Dev overlay controls are the existing native shardunits course setup only. */
export function realmSetup(){const setup=nativeCampaignFixture(46115),w=setup.writer;w.loadZone(setup.definition.id);return{...setup,overlayView:w.devOverlayView()};}
export function stageRealm(setup:ReturnType<typeof realmSetup>,kind:RealmKind,area?:ReturnType<typeof birthActualNativeArea>['ongoing']){
 const w=setup.writer,view=setup.overlayView,zid=setup.definition.id,rows=area?area.assembly.input.geometry:{demonPortals:w['demonPortals'],crusadePortals:w['crusadePortals'],necropolisPortals:w['necropolisPortals'],fractureRifts:w['fractureRifts']},pos={...w.player.pos};let id='';
 if(kind==='demon'){const f=w.sim.demonFieldFor(w.zone.dimension);assert(f);assert(f.invasionOn(zid)||f.devIgnite(view,zid));id=f.invasionOn(zid)!.id;rows['demonPortals'].push({pos,invId:id});}
 if(kind==='crusade'){const f=w.sim.crusadeField;assert(f);assert(f.crusadeOn(zid)||f.devIgnite(view,zid));f.update(0,view);const info=f.crusadeOn(zid);assert(info);id=info.crusadeId;rows['crusadePortals'].push({pos,crusadeId:id});}
 if(kind==='necropolis'){const f=w.sim.deadwakeField;assert(f);assert(f.necropolisInfo()||f.devForceNecropolis(view,zid));rows['necropolisPortals'].push({pos});}
 const v=w.sim.fractureField?.surge().variants.find(v=>v.capstone);assert(v?.capstone);const fr={id:'actual_realm_course',pos,faction:v.faction,color:'#9a7ad0',variant:v.variant,level:w.zone.level,cap:v.capstone};if(kind==='fracture')rows['fractureRifts'].push(fr);
 return{kind,key:realmKeys[kind],tag:realmTags[kind],id,pos,fr,gate:kind==='necropolis'?kind:kind+':'+(kind==='fracture'?fr.id:id)};
}
export function enterRealm(host:World|NativeAreaSceneCampaignFrame,staged:ReturnType<typeof stageRealm>):void{
 const {kind,id,pos,fr}=staged;
 if(kind==='demon')Reflect.apply(Reflect.get(host,'enterDemonRealm'),host,[id,pos]);
 if(kind==='crusade')Reflect.apply(Reflect.get(host,'enterCrusadeSanctum'),host,[id,pos]);
 if(kind==='necropolis')Reflect.apply(Reflect.get(host,'enterNecropolis'),host,[pos]);
 if(kind==='fracture')Reflect.apply(Reflect.get(host,'enterFractureRift'),host,[fr]);
}
