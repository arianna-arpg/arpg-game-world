import type { Actor } from '../engine/actor';
import type { World, DissolveBreak } from '../engine/world';
import type { Doodad } from '../engine/levelgen';
import type { ZoneDef } from '../data/zones';
import type { Vec2 } from '../core/math';
import { coopScale } from '../data/coop';
import { mod, type Modifier } from '../engine/stats';
import { sameStory } from '../engine/tiers';
import { captureNativeActorState, massDormancyPins, nativeActorQuietRefusal, restoreNativeActorState,
  validateNativeActorState, type NativeActorState } from './dormancy';
import { nativeUrnSourceSupported, validateNativeBrittleSources, type NativeBrittleDefinition } from './nativeBrittleSources';
import type { NativeFeatureInstance } from './nativeResidency';
import { canonical } from './random';

/** A native pop owns its original order, global random stream and side effects.
 * The binding intercepts only reservation and actual factory/publication seams. */
export interface MassNativeBrittlePopContext {
  sourceZone: Readonly<ZoneDef>;
  createWake(monster: string, level: number, originalFactory: () => Actor): Actor;
  publishedBody(actor: Actor): void;
  dissolved(debris: Doodad | null, record: DissolveBreak | null): void;
}
export interface MassNativeBrittleRegistration {
  doodad: Doodad;
  invoke(native: (context: MassNativeBrittlePopContext) => void): boolean;
}
export interface MassNativeBrittleBodySave {
  key: string; actorId: number; monster: string; level: number;
  factoryActorId: number; factoryPlayerId: number; factoryTape: number[]; factoryState: NativeActorState;
  dead: boolean; pos: Vec2; life: number; partyScale: Modifier[] | null; state?: NativeActorState;
}
export interface MassNativeBrittlesSave {
  schema: 1; owner: string; descriptor: string; clock: number; playerId: number;
  slots: { index: number; definitionHash: string; popped: boolean; birthCount: number; births: MassNativeBrittleBodySave[] }[];
  /** Native scene Continue drops current actions/fragments; streaming never does. */
  transient: string[]; transientDebris: boolean;
}
export interface MassNativeBrittlePolicy {
  population(): number; maxPopulation(): number; retainRadius: number; quietSeconds: number;
}
export interface MassNativeBrittleBinding {
  mount(): void; rollbackMount(): void; actors(): ReadonlySet<Actor>; capture(): MassNativeBrittlesSave;
  canRetire(otherOwned?: ReadonlySet<Actor>): boolean; detach(otherOwned?: ReadonlySet<Actor>): void;
}
interface LiveBirth { receipt: MassNativeBrittleBodySave; actor?: Actor; published: boolean }
interface LiveSlot { index: number; definition: Readonly<NativeBrittleDefinition>; doodad: Doodad; popped: boolean; birthCount: number; births: LiveBirth[] }
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const factoryDrawLimit = 65536;
const bodyKey = (owner: string, index: number, slot: number): string => canonical([owner,'native-brittle',index,slot]);
// Dead rows are receipts, not entities. Their deterministic negative IDs cannot
// collide with Actors allocated by a later Continue process.
const tombstoneId = (index:number,slot:number):number => -(index*2+slot+1);
const finitePoint = (p: Vec2): boolean => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);

/** The native co-op source changes on live joins/leaves. It is mutable body
 * state distinct from the certified original factory, never an arbitrary mod. */
function validatePartyScale(party:Modifier[]|null):void {
  if(party===null)return;
  if(!Array.isArray(party))throw Error('Missing native party scaling receipt');
  const one=coopScale(2),max=coopScale(Infinity),life=party[0]?.value,damage=party[1]?.value;
  if(party.length!==2||!Number.isFinite(life)||!Number.isFinite(damage)||life<=0||damage<0
    ||life>max.life+1e-12||damage>max.damage+1e-12
    ||Math.abs(life*one.damage-damage*one.life)>1e-12
    ||canonical(copy(party))!==canonical(copy([mod('life','more',life),mod('damage','more',damage)])))throw Error('Invalid native party scaling');
}

export function massNativeBrittlesSupported(instance: NativeFeatureInstance): boolean {
  const sources=instance.blueprint.descriptor.brittleSources;
  if(!sources)return !instance.layout.doodads.some(d=>d.kind==='burial_urn');
  validateNativeBrittleSources(sources,instance.layout.doodads);
  return sources.rows.every(row=>{const definition=sources.definitions.find(d=>d.hash===row.definitionHash);
    return !!definition && nativeUrnSourceSupported(definition,instance.zone);});
}

/** Stable birth receipts stay inside this native feature. Wake bodies never
 * enter fromZoneGen memory or classic native actor pages. */
export class MassNativeBrittles {
  private live=new Map<string,LiveSlot[]>();
  private pending=0;
  constructor(readonly world: World, readonly policy: MassNativeBrittlePolicy) {
    if(!Number.isFinite(policy.retainRadius)||policy.retainRadius<0||!Number.isFinite(policy.quietSeconds)
      ||policy.quietSeconds<5||policy.quietSeconds>300)throw Error('Invalid native brittle policy');
  }
  get population(): number {
    let count=this.pending;
    for(const slots of this.live.values())for(const slot of slots)for(const birth of slot.births)
      if(birth.published&&birth.actor&&!birth.actor.dead)count++;
    return count;
  }
  private saved(instance: NativeFeatureInstance, saved?: MassNativeBrittlesSave): MassNativeBrittlesSave | undefined {
    if(!massNativeBrittlesSupported(instance))throw Error('Unbound native brittle source');
    const rows=instance.blueprint.descriptor.brittleSources?.rows??[];
    if(rows.length&&!this.world.nativeUrnRewardContextSupported())throw Error('Unbound native brittle shell reward context');
    if(!saved)return;
    canonical(saved);
    if(saved.schema!==1||saved.owner!==instance.id||saved.descriptor!==instance.blueprint.descriptor.hash
      ||!Number.isFinite(saved.clock)||saved.clock<0||saved.clock>this.world.time||!Number.isSafeInteger(saved.playerId)
      ||!Array.isArray(saved.slots)||saved.slots.length!==rows.length||!Array.isArray(saved.transient)
      ||new Set(saved.transient).size!==saved.transient.length||typeof saved.transientDebris!=='boolean')throw Error('Invalid native brittle checkpoint');
    const ids=new Set([saved.playerId]),liveIds=new Set([saved.playerId]),keys=new Set<string>();
    saved.slots.forEach((slot,i)=>{
      const row=rows[i],d=instance.layout.doodads[row.index],definition=instance.blueprint.descriptor.brittleSources!.definitions.find(v=>v.hash===row.definitionHash)!;
      if(slot.index!==row.index||slot.definitionHash!==row.definitionHash||typeof slot.popped!=='boolean'
        ||slot.popped!==!!d.gone||!Array.isArray(slot.births)||!Number.isSafeInteger(slot.birthCount)
        ||slot.birthCount<0||slot.birthCount>2||slot.birthCount!==slot.births.length||!slot.popped&&slot.birthCount)
        throw Error('Inconsistent native brittle scenery receipt');
      slot.births.forEach((body,n)=>{
        if(body.key!==bodyKey(instance.id,row.index,n)||keys.has(body.key)||!Number.isSafeInteger(body.actorId)||ids.has(body.actorId)
          ||body.dead&&body.actorId!==tombstoneId(row.index,n)||!body.dead&&body.actorId<1
          ||body.monster!==definition.wake.id||body.level!==Math.max(1,instance.zone.level)||typeof body.dead!=='boolean'
          ||!finitePoint(body.pos)||!Number.isFinite(body.life)||body.life<0||body.dead&&body.life!==0||!body.dead&&body.life<=0
          ||!Number.isSafeInteger(body.factoryActorId)||!Number.isSafeInteger(body.factoryPlayerId)||body.factoryActorId===body.factoryPlayerId
          ||!Array.isArray(body.factoryTape)||body.factoryTape.length>factoryDrawLimit
          ||body.factoryTape.some(x=>!Number.isFinite(x)||x<0||x>=1))throw Error('Invalid native brittle birth');
        validatePartyScale(body.partyScale);keys.add(body.key);ids.add(body.actorId);if(!body.dead)liveIds.add(body.actorId);
        validateNativeActorState(body.factoryState,{monster:body.monster,team:'enemy',level:body.level,
          actors:new Set([body.factoryActorId,body.factoryPlayerId]),squads:new Set()});
        if(body.dead&&body.state||!body.dead&&!body.state&&!saved.transient.includes(body.key))throw Error('Unlabelled native brittle transient');
      });
    });
    if(saved.transient.some(key=>!saved.slots.some(s=>s.births.some(b=>b.key===key&&!b.dead&&!b.state))))throw Error('Invalid native brittle transient key');
    for(const slot of saved.slots)for(const body of slot.births)if(body.state)
      validateNativeActorState(body.state,{monster:body.monster,team:'enemy',level:body.level,life:body.life,position:body.pos,actors:liveIds,squads:new Set()});
    return saved;
  }
  requiredPopulation(instance: NativeFeatureInstance, saved?: MassNativeBrittlesSave): number {
    return this.saved(instance,saved)?.slots.reduce((n,slot)=>n+slot.births.filter(b=>!b.dead).length,0)??0;
  }
  prepare(instance: NativeFeatureInstance, value?: MassNativeBrittlesSave): MassNativeBrittleBinding | undefined {
    const saved=this.saved(instance,value),sources=instance.blueprint.descriptor.brittleSources,world=this.world,owner=instance.id;
    if(!sources?.rows.length){if(saved)throw Error('Native brittle checkpoint lost its source');return;}
    if(this.live.has(owner))throw Error('Duplicate native brittle owner');
    const slots:LiveSlot[]=sources.rows.map((row,i)=>({index:row.index,
      definition:sources.definitions.find(d=>d.hash===row.definitionHash)!,doodad:instance.layout.doodads[row.index],
      popped:saved?.slots[i].popped??false,birthCount:saved?.slots[i].birthCount??0,births:(saved?.slots[i].births??[]).map(receipt=>({receipt:copy(receipt),published:false}))}));
    if(!saved&&slots.some(s=>s.doodad.gone))throw Error('Unborn native urn already disappeared');
    const actorMap=new Map<number,Actor>(saved?[[saved.playerId,world.player]]:[]);
    for(const slot of slots)for(const birth of slot.births){
      const r=birth.receipt;if(r.dead)continue;
      let cursor=0;const previous=Math.random;
      Math.random=()=>{if(cursor>=r.factoryTape.length)throw Error('Native brittle factory consumed an unsaved draw');return r.factoryTape[cursor++];};
      let a:Actor;
      try{a=world.createMonster(r.monster,r.level,'enemy');}finally{Math.random=previous;}
      if(cursor!==r.factoryTape.length)throw Error('Native brittle factory left unused saved draws');
      this.restoreFactoryBaseline(a,r,saved!.clock);
      if(!this.bodySupported(a,r.monster,r.level))throw Error('Native brittle factory changed ownership');
      if(r.partyScale)a.sheet.setSource('partyScale',r.partyScale.map(m=>mod(m.stat,m.kind,m.value)));else a.sheet.removeSource('partyScale');
      // Native party joins preserve life fraction and round, including an already
      // rounded fraction above one. Current finite life is not a birth-max bound.
      a.pos={...r.pos};a.life=r.life;
      birth.actor=a;actorMap.set(r.actorId,a);
    }
    for(const slot of slots)for(const birth of slot.births)if(birth.actor&&birth.receipt.state){
      restoreNativeActorState(birth.actor,birth.receipt.state,actorMap);
      if(!this.bodySupported(birth.actor,birth.receipt.monster,birth.receipt.level)||!this.quietIdentity(birth.actor,birth.receipt)
        ||canonical(copy(birth.actor.sheet.getSourceMods('partyScale')??null))!==canonical(birth.receipt.partyScale)
        ||nativeActorQuietRefusal(birth.actor,world,this.policy.quietSeconds,birth.receipt.state,
          canonical(birth.actor.tellSpecs)===canonical(slot.definition.wake.tells)?{nativeTellClock:true}:undefined))throw Error('Inexact native brittle quiet state');
    }
    let mounted=false,detached=false,observed=false,mountedAt=-1,faulted=false,activeCommits=0;
    let unregister:(()=>void)|undefined;
    const debris=new Set<Doodad>(),dissolves=new Set<DissolveBreak>();
    const owned=():Map<string,Actor>=>new Map(slots.flatMap(s=>s.births.flatMap(b=>b.actor?[[b.receipt.key,b.actor] as const]:[])));
    const activeFragments=():boolean=>[...debris].some(d=>world.doodads.includes(d))
      ||[...dissolves].some(d=>world.dissolves.includes(d));
    const quiet=(a:Actor,state:NativeActorState|null,definition:Readonly<NativeBrittleDefinition>):boolean=>this.bodySupported(a,a.defId!,a.level)&&!world.emergeOf(a)
      &&!nativeActorQuietRefusal(a,world,this.policy.quietSeconds,state,
        canonical(a.tellSpecs)===canonical(definition.wake.tells)?{nativeTellClock:true}:undefined);
    const capture=():MassNativeBrittlesSave=>{
      if(!mounted||detached||faulted||activeCommits>0||!world.nativeUrnRewardContextSupported())throw Error('Native brittle owner cannot checkpoint an incomplete pop');
      if(sources.definitions.some(definition=>!nativeUrnSourceSupported(definition,instance.zone)))throw Error('Native brittle source changed after enrollment');
      observed=true;const hero=world.seatHero(world.localSeat),bodies=owned(),pins=massDormancyPins(world,bodies),known=new Set([hero.id,...[...bodies.values()].filter(a=>!a.dead).map(a=>a.id)]),transient:string[]=[];
      const rows=slots.map(slot=>{
        if(slot.popped!==!!slot.doodad.gone||!slot.popped&&!world.doodads.includes(slot.doodad))throw Error('Native brittle scenery lost its receipt');
        return {index:slot.index,definitionHash:slot.definition.hash,popped:slot.popped,birthCount:slot.birthCount,births:slot.births.map((birth,n)=>{
          const a=birth.actor,r=birth.receipt;if(!a)return copy(r);
          const partyScale=copy(a.sheet.getSourceMods('partyScale')??null);validatePartyScale(partyScale);
          const possession=this.borrowedBody(a,r);
          if(!this.bodySupported(a,r.monster,r.level)&&!possession)throw Error('Native brittle body changed its bound identity');
          let state=!a.dead&&!possession?captureNativeActorState(a):null;
          if(!a.dead){
            const nativeQuiet=quiet(a,state,slot.definition),identity=this.quietIdentity(a,r);
            if(nativeQuiet&&!identity)throw Error('Native brittle quiet body changed its source role');
            if(!nativeQuiet||!identity||pins.has(a))state=null;
          }
          if(state)try{validateNativeActorState(state,{monster:r.monster,team:'enemy',level:r.level,actors:known,squads:new Set()});}catch{state=null;}
          if(!a.dead&&!state)transient.push(r.key);
          const {state:_old,...baseline}=r;
          return {...copy(baseline),actorId:a.dead?tombstoneId(slot.index,n):a.id,dead:a.dead,pos:{...a.pos},life:a.dead?0:Math.max(0,a.life),partyScale,...(state?{state}:{})};
        })};
      });
      return {schema:1,owner,descriptor:instance.blueprint.descriptor.hash,clock:world.time,playerId:hero.id,
        slots:rows,transient,transientDebris:activeFragments()};
    };
    const invoke=(slot:LiveSlot,native:(context:MassNativeBrittlePopContext)=>void):boolean=>{
      if(!mounted||detached)throw Error('Unenrolled native brittle invoked');
      if(faulted)throw Error('Faulted native brittle owner cannot retry');
      if(slot.popped||slot.doodad.gone)return false;
      if(!nativeUrnSourceSupported(slot.definition,instance.zone)||!world.nativeUrnRewardContextSupported())return false;
      if(this.policy.population()+2>this.policy.maxPopulation())return false;
      // Recursive surface procs see this lease immediately, before any effect.
      let reserved=2;this.pending+=reserved;observed=true;slot.popped=true;activeCommits++;
      try{
        native({sourceZone:instance.zone,createWake:(monster,level,originalFactory)=>{
          if(monster!==slot.definition.wake.id||level!==Math.max(1,instance.zone.level)||slot.births.length>=2)throw Error('Native urn exceeded its frozen wake recipe');
          const tape:number[]=[],previous=Math.random;
          Math.random=()=>{const n=previous();if(tape.length>=factoryDrawLimit||!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid native factory random draw');tape.push(n);return n;};
          let a:Actor;try{a=originalFactory();}finally{Math.random=previous;}
          if(!this.bodySupported(a,monster,level)||world.actors.includes(a))throw Error('Native wake factory published early or changed ownership');
          const baseline=captureNativeActorState(a);if(!baseline)throw Error('Native wake factory is not serializable');
          validateNativeActorState(baseline,{monster,team:'enemy',level,actors:new Set([a.id,world.player.id]),squads:new Set()});
          slot.birthCount++;slot.births.push({actor:a,published:false,receipt:{key:bodyKey(owner,slot.index,slot.births.length),actorId:a.id,monster,level,
            factoryActorId:a.id,factoryPlayerId:world.player.id,factoryTape:tape,factoryState:baseline,dead:false,pos:{...a.pos},life:a.life,partyScale:copy(a.sheet.getSourceMods('partyScale')??null)}});
          return a;
        },publishedBody:a=>{
          const birth=slot.births.find(b=>b.actor===a);if(!birth||birth.published||reserved<=0||!world.actors.includes(a))throw Error('Invalid native wake publication');
          birth.published=true;birth.receipt.pos={...a.pos};birth.receipt.life=a.life;reserved--;this.pending--;
        },dissolved:(d,record)=>{if(d)debris.add(d);if(record)dissolves.add(record);}});
        if(!slot.doodad.gone||slot.births.some(b=>!b.published))throw Error('Native urn pop did not complete');
        return true;
      }catch(error){faulted=true;throw error;}finally{this.pending-=reserved;activeCommits--;}
    };
    const remove=():void=>{
      unregister?.();unregister=undefined;const ours=new Set(owned().values());
      world.actors=world.actors.filter(a=>!ours.has(a));world.actorGridRev++;
      this.live.delete(owner);mounted=false;detached=true;
    };
    const binding:MassNativeBrittleBinding={
      actors:()=>new Set(owned().values()),capture,
      mount:()=>{
        if(mounted||detached||this.live.has(owner))throw Error('Native brittle enrolled twice');
        if(this.policy.population()+slots.reduce((n,s)=>n+s.births.filter(b=>!b.receipt.dead).length,0)>this.policy.maxPopulation())
          throw Error('Native brittle saved population lacks capacity');
        try{
          unregister=world.installMassNativeBrittles(owner,slots.filter(s=>!s.popped).map(slot=>({doodad:slot.doodad,invoke:native=>invoke(slot,native)})));
          for(const slot of slots)for(const birth of slot.births)if(birth.actor){world.actors.push(birth.actor);birth.published=true;}
          world.actorGridRev++;this.live.set(owner,slots);mounted=true;mountedAt=world.time;
        }catch(error){remove();throw error;}
      },
      rollbackMount:()=>{if(!mounted||detached)return;if(observed||world.time!==mountedAt)throw Error('Native brittle rollback is enrollment-only');remove();},
      canRetire:(otherOwned=new Set())=>{
        if(detached)return true;if(!mounted||faulted||activeCommits>0||activeFragments())return false;
        const ours=new Set(owned().values());
        if(world.actors.some(a=>!a.dead&&!ours.has(a)&&!otherOwned.has(a)&&sameStory(a,{tier:0})
          &&(slots.some(s=>Math.hypot(a.pos.x-s.doodad.pos.x,a.pos.y-s.doodad.pos.y)<=this.policy.retainRadius)
            ||[...ours].some(b=>!b.dead&&Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y)<=this.policy.retainRadius))))return false;
        return capture().transient.length===0&&massDormancyPins(world,owned()).size===0;
      },
      detach:(otherOwned)=>{if(detached)return;if(!binding.canRetire(otherOwned))throw Error('Native brittle has live dependencies');remove();},
    };
    return binding;
  }
  /** Compare the whole saved pre-emergence graph to the actual tape-replayed
   * native factory. Only birth-world time and the native co-op
   * source may differ at Continue; no flags/actions/controllers are exempt. */
  private restoreFactoryBaseline(a:Actor,r:MassNativeBrittleBodySave,clock:number):void {
    const pristine=captureNativeActorState(a);if(!pristine)throw Error('Native factory cannot be certified');
    restoreNativeActorState(a,r.factoryState,new Map([[r.factoryActorId,a],[r.factoryPlayerId,this.world.player]]));
    const party=a.sheet.getSourceMods('partyScale'),spawnedAt=a.spawnedAt;
    if(!Number.isFinite(spawnedAt)||spawnedAt<0||spawnedAt>clock)throw Error('Invalid native factory birth clock');
    validatePartyScale(party??null);
    // Restore only detached data; this never changes the live party or World.
    restoreNativeActorState(a,pristine,new Map([[a.id,a],[this.world.player.id,this.world.player]]));
    if(party)a.sheet.setSource('partyScale',party);else a.sheet.removeSource('partyScale');
    a.spawnedAt=spawnedAt;a.fillResources();
    const certified=captureNativeActorState(a);
    if(!certified||canonical(certified)!==canonical(r.factoryState))throw Error('Native brittle factory baseline disagrees with native creation');
  }
  /** Active native emergence/possession uses the transient scene boundary.
   * A settled exact graph cannot invent a permanently promoted or immune body. */
  private quietIdentity(a:Actor,r:MassNativeBrittleBodySave):boolean {
    const root=r.factoryState.nodes[0];
    const scalar=(key:string):unknown=>{
      const value=root.entries.find(([name])=>name===key)?.[1];
      return value&&typeof value==='object'&&'special'in value&&value.special==='undefined'?undefined:value;
    };
    return ['kind','passive','driven','baseInvulnerable','untargetable'].every(key=>Reflect.get(a,key)===scalar(key));
  }
  /** Native possession is a temporary seat promotion, never a new creature.
   * Save projects the unchanged factory identity and current wounds, matching
   * CharacterSave's return-to-seatHero boundary without ejecting the live rider. */
  private borrowedBody(a:Actor,r:MassNativeBrittleBodySave):boolean {
    const ride=a.possession,kind=r.factoryState.nodes[0].entries.find(([key])=>key==='kind')?.[1];
    const originalKind=kind&&typeof kind==='object'&&'special'in kind&&kind.special==='undefined'?undefined:kind;
    return !!ride&&ride.kind==='possess'&&!ride.mintedForm&&ride.prevTeam==='enemy'&&ride.prevKind===originalKind
      &&a.kind==='player'&&this.bodySupported(a,r.monster,r.level,'player')
      &&this.world.seats.some(s=>s.actor===a&&!!s.home&&s.id===ride.seatId);
  }
  private bodySupported(a:Actor,monster:string,level:number,team='enemy'):boolean {
    return a.defId===monster&&a.level===level&&a.team===team&&!a.fromZoneGen&&!a.owner&&!a.companion&&!a.downed
      &&a.squadId===undefined&&!a.magicPack&&!a.encounterGroup;
  }
}
