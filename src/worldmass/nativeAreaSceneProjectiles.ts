import {nativeCombatActorEntry} from './nativeAreaCombatOperation';
/** Native projectile launch over an area's actual queue. Ticking/crossing and
 * detached effect-caster lifetimes remain the complete combat runtime's work. */
import type {World} from '../engine/world';
import type {NativeSceneCensus,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import type {NativeAreaSceneProgression} from './nativeAreaSceneProgression';
import {sceneSpawnProjectile,sceneSkillOcclusion,type NativeSceneProjectileHost} from '../engine/nativeSceneProjectiles';
export type NativeProjectileCampaign=Pick<World,'account'|'localSeat'|'seats'>;
export interface NativeSceneProjectileRuntime {readonly progression:NativeAreaSceneProgression}
export type NativeSceneProjectileAuthority=Pick<NativeAreaActorAuthority<NativeSceneProjectileRuntime>,'campaign'|'require'|'assertAdmitted'>;
export interface NativeAreaSceneProjectileInput {
 scene:NativeSceneCensus;population:NativeAreaScenePopulation;
 campaign:NativeProjectileCampaign;progression:NativeAreaSceneProgression;
 authority:NativeSceneProjectileAuthority;
}
export class NativeAreaSceneProjectiles {
 readonly input:NativeAreaSceneProjectileInput;
 readonly host:NativeSceneProjectileHost;
 constructor(raw:NativeAreaSceneProjectileInput){
  const bindings=Object.create(null);for(const key of ['scene','population','campaign','progression','authority']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native projectiles need own object binding: '+key);bindings[key]=d.value;
  }
  const input:NativeAreaSceneProjectileInput=this.input=Object.freeze(bindings),self=this;
  if(input.population.input.scene!==input.scene||input.population.input.campaign as object!==input.campaign||input.authority.campaign!==input.campaign||input.progression.input.scene!==input.scene||input.progression.input.population!==input.population||input.progression.input.authority as object!==input.authority||input.progression.input.campaign!==input.campaign)throw Error('Native projectiles need identical scene, population and campaign authority');
  const host={} as NativeSceneProjectileHost;
  for(const key of ['account','localSeat','seats'] as const)Object.defineProperty(host,key,{enumerable:true,get:()=>input.campaign[key]});
  Object.defineProperty(host,'projectiles',{enumerable:true,get:()=>input.progression.input.state.projectiles});
  Object.defineProperty(host,'enemiesOf',{enumerable:true,get(){const owner=input.population,fn=owner.enemiesOf;return(...args:Parameters<typeof fn>)=>Reflect.apply(fn,owner,args);}});
  Object.defineProperty(host,'skillOcclusion',{enumerable:true,value:(...args:Parameters<World['skillOcclusion']>)=>self.skillOcclusion(...args)});
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 skillOcclusion(...args:Parameters<World['skillOcclusion']>):ReturnType<World['skillOcclusion']>{return sceneSkillOcclusion(this.host,...args);}
 spawnProjectile(...args:Parameters<World['spawnProjectile']>):void{
  const {authority,scene,progression}=this.input,caster=args[0];
  if(nativeCombatActorEntry(this,caster,'proc')){sceneSpawnProjectile(this.host,...args);return;}
  // Progression authority intentionally resolves carried flesh to its live body.
  // Launch requires the actual physical caster; detached effect lifetimes need
  // their own future combat authority and cannot borrow this admission.
  if(!scene.actors.includes(caster))throw Error('Native projectile launch needs its actual physical caster');
  const registered=authority.require(caster);
  if(registered.scene!==scene)throw Error('Native projectile launch needs its actual physical caster');
  if(registered.progression!==progression)throw Error('Native projectile launch needs its registered progression queue');
  authority.assertAdmitted(scene);sceneSpawnProjectile(this.host,...args);
 }
}
