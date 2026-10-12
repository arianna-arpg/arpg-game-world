import {nativeCombatActorEntry} from './nativeAreaCombatOperation';
/** Admitted native defense preparation; no damage resolution or actor retirement. */
import type {World} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import * as native from '../engine/nativeSceneDefensePreparation';
export interface NativeDefensePreparationRuntime {readonly defensePreparation:NativeAreaSceneDefensePreparation;readonly geometry:NativeAreaSceneGeometry}
export type NativeDefensePreparationAuthority=Pick<NativeAreaActorAuthority<NativeDefensePreparationRuntime>,'campaign'|'bindingFor'|'require'|'assertAdmitted'>;
export interface NativeDefensePreparationInput {scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;campaign:Pick<World,'seats'|'time'>;authority:NativeDefensePreparationAuthority}
const unknown=Symbol('non-static defense identity');
/** Identity checks never evaluate an actor or pool accessor before native code. */
function own(value:unknown,key:PropertyKey):any {if(!value||typeof value!=='object')return unknown;const d=Object.getOwnPropertyDescriptor(value,key);return d&&Object.hasOwn(d,'value')?d.value:unknown;}
function plain(value:unknown,key:PropertyKey):any {if(!value||typeof value!=='object')return unknown;const p=Object.getPrototypeOf(value);if(p!==null&&p!==Object.prototype)return unknown;const d=Object.getOwnPropertyDescriptor(value,key);return d?Object.hasOwn(d,'value')?d.value:unknown:p===null||!Object.getOwnPropertyDescriptor(Object.prototype,key)?undefined:unknown;}
/** These native returns precede any victim, packet or host read. Ambiguous
 * getters/prototypes/coercion require admission; no user code runs here. */
function inertPool(sg:Actor['shellGuard']):boolean {if(sg===undefined||sg===null)return true;const broken=plain(sg,'broken');if(broken===unknown)return false;if(broken)return true;const pool=plain(sg,'pool');return typeof pool==='number'&&pool<=0;}
export class NativeAreaSceneDefensePreparation implements native.NativeSceneDefensePreparationApi {
 readonly input:NativeDefensePreparationInput;readonly host:native.NativeSceneDefensePreparationHost;
 constructor(raw:NativeDefensePreparationInput){
  const bindings=Object.create(null);for(const key of ['scene','geometry','campaign','authority']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native defense preparation needs own object binding: '+key);bindings[key]=d.value;}
  const input:NativeDefensePreparationInput=this.input=Object.freeze(bindings);
  if(!(input.geometry instanceof NativeAreaSceneGeometry)||input.geometry.state!==input.scene||input.authority.campaign!==input.campaign||!('time' in input.campaign))throw Error('Native defense preparation needs actual matching geometry and campaign authority');
  this.host=Object.freeze(Object.defineProperties({} as native.NativeSceneDefensePreparationHost,{actors:{enumerable:true,get:()=>input.scene.actors},flashes:{enumerable:true,get:()=>input.geometry.flashes},time:{enumerable:true,get:()=>input.campaign.time}}));
  for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});
 }
 #admit(actor:Actor):void {if(nativeCombatActorEntry(this,actor,'proc'))return;const {scene,authority,geometry}=this.input,b=authority.bindingFor(scene);if(b.services.defensePreparation!==this||b.services.geometry!==geometry)throw Error('Native defense preparation needs exact registered owners');if(!scene.actors.includes(actor)||authority.require(actor).scene!==scene)throw Error('Native defense preparation needs actual physical actor');authority.assertAdmitted(scene);}
 #pool(victim:Actor,sg:Actor['shellGuard']):void {
  this.#admit(victim);if(own(victim,'shellGuard')===sg)return;
  const shells=own(victim,'summonShells');let bodies:IterableIterator<Actor>;try{bodies=Reflect.apply(Set.prototype.values,shells,[]);}catch{throw Error('Native defense preparation needs a current anatomical or worn shell');}
  for(const body of bodies){if(own(body,'shellGuard')!==sg)continue;this.#admit(body);
   const inst=own(body,'summonInst'),skills=own(victim,'skills');
   if(own(body,'dead')!==false||own(body,'downed')!==false||own(victim,'dead')!==false||own(victim,'downed')!==false||!own(body,'summonShell')||own(body,'summonShell')===unknown||own(body,'owner')!==victim||!inst||inst===unknown||!Array.isArray(skills))continue;
   // Native tryShellBlock selects exact installed skill identity. Descriptor
   // inspection avoids calling a custom includes/getter during admission.
   for(let i=0;i<skills.length;i++)if(own(skills,i)===inst)return;
  }
  throw Error('Native defense preparation needs a current anatomical or worn shell');
 }
 tryShellPool(...a:Parameters<native.NativeSceneDefensePreparationApi['tryShellPool']>):boolean {if(!inertPool(a[3]))this.#pool(a[0],a[3]);return native.sceneTryShellPool(this.host,...a);}
 showCombatOutcome(...a:Parameters<native.NativeSceneDefensePreparationApi['showCombatOutcome']>):void {this.#admit(a[0]);native.sceneShowCombatOutcome(this.host,...a);}
 refreshGuardBash(...a:Parameters<native.NativeSceneDefensePreparationApi['refreshGuardBash']>):void {this.#admit(a[0]);if(own(a[0],'casting')!==a[1])throw Error('Native defense preparation needs exact current casting state');native.sceneRefreshGuardBash(this.host,...a);}
 isBurstTarget(...a:Parameters<native.NativeSceneDefensePreparationApi['isBurstTarget']>):boolean {this.#admit(a[0]);return native.sceneIsBurstTarget(this.host,...a);}
 resolveDeathBurst(...a:Parameters<native.NativeSceneDefensePreparationApi['resolveDeathBurst']>):ReturnType<native.NativeSceneDefensePreparationApi['resolveDeathBurst']> {this.#admit(a[0]);return native.sceneResolveDeathBurst(this.host,...a);}
 bankRune(...a:Parameters<native.NativeSceneDefensePreparationApi['bankRune']>):void {this.#admit(a[0]);native.sceneBankRune(this.host,...a);}
 bumpDrives(...a:Parameters<native.NativeSceneDefensePreparationApi['bumpDrives']>):void {if(a[0]!==null)this.#admit(a[0]);native.sceneBumpDrives(this.host,...a);}
}
