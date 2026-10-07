import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import { doodadRuleKinds, doodadRuleOf } from '../engine/levelgen';
import { sameStory } from '../engine/tiers';
import { captureNativeActorState, massDormancyPins, nativeDormancyRefusal, restoreNativeActorState,
  type NativeActorState } from './dormancy';
import type { NativeFeatureBinding, NativeFeatureHost, NativeFeatureInstance, NativeResidencySave } from './nativeResidency';
import { nativeFeatureAdmission } from './nativeFeatures';
import { sidezoneOf } from '../data/sidezones';
import { MassOccurrences, massOccurrenceSupported, type MassOccurrencesSave, type MassOccurrenceDisturbance } from './occurrences';
import type { Vec2 } from '../core/math';
import { PUZZLE_CFG } from '../engine/puzzles';
import { MassCourtPuzzles, massCourtPuzzlesSupported, type MassCourtPuzzlesSave } from './courtPuzzles';
import { MassNativeEffects, massNativeEffectsSupported, type MassNativeEffectsSave } from './nativeEffects';
import { MassNativeBrittles, massNativeBrittlesSupported, type MassNativeBrittlesSave } from './nativeBrittles';

/** These mechanics still need their own local owners; looking like scenery is
 * not evidence that their native interaction is installed. */
const contextualKinds=new Set(['bounty_board','harbor_board','muster_horn',
  'dock','ghost_hull','descent_platform','ruin_floor_gap','regent_door','regent_door_open',
  'regent_brazier','regent_brazier_lit']);
export function nativeWorldCapabilities():ReadonlySet<string>{
  const caps=new Set(['terrain','scenery','state','structures','doors','sidezones','breakables','garrisons','landmark-spawns',
    'door:dwell','door:breakable','door:both','slot:tower',
    'occurrences','occurrence:abyssal_fracture','occurrence-trigger:dwell','occurrence-aftermath:fixture',
    'puzzles','puzzle:court_shrine','puzzle:refrain','puzzle:tempo','puzzle:accord','puzzle:ember',
    'native-effects','native-effect:status_wash:cloudhaven','doodad:haven_stone',
    'native-brittles','native-brittle:burial_urn','doodad:burial_urn']);
  for(const kind of doodadRuleKinds()){
    const r=doodadRuleOf(kind);
    const sidezone=sidezoneOf(kind),ownedEntrance=!!sidezone&&!sidezone.spanMouth;
    // Native scenery renders, blocks and conceals through the shared arrays.
    // Independent mechanisms and emitted bodies/effects require extra owners.
    const b=r.brittle,unownedBreak=b&&(b.spawn||b.corpses||b.fume||b.remains||b.collapse||b.dwell);
    if(contextualKinds.has(kind)||r.overlap==='trigger'&&!ownedEntrance||r.effect||r.contact||r.fall||unownedBreak||r.seedPaired&&!ownedEntrance)continue;
    caps.add('doodad:'+kind);
  }
  return caps;
}

interface BodySave {
  slot:string; actorId:number; monster:string; dead:boolean; pos:{x:number;y:number}; life:number;
  squadId?:number; state?:NativeActorState;
}
interface NativeHostSave {
  schema:1; owner:string; descriptor:string; clock:number; playerId:number;
  bodies:BodySave[];
  /** Active transients retain the native scene save boundary. Their ordinary
   * body wounds persist, but this array must never be labelled exact combat. */
  transient:string[];
  occurrences?:MassOccurrencesSave;
  courts?:MassCourtPuzzlesSave;
  effects?:MassNativeEffectsSave;
  brittles?:MassNativeBrittlesSave;
}
export interface NativeHostPolicy {
  /** Shared population includes this host. Never create a second hidden cap. */
  population():number; maxPopulation():number;
  retainRadius?:number; quietSeconds?:number;
  zoneOwner?:(pos:Vec2)=>string;
}
const upperPopulation=(i:NativeFeatureInstance):number=>i.layout.breakables.length
  +i.layout.doodads.filter(d=>d.door&&!d.door.open&&!d.door.broken&&['breakable','both'].includes(d.door.mode)).length
  +i.layout.garrisons.reduce((n,g)=>n+g.size[1],0)+(i.layout.landmarkSpawns?.length??0);

/** Native factories own births, faction packs, posts, ambush and rarity. This
 * binding owns their physical residence and stable death/wound receipts only.
 * It never swaps World.zone, kills actors for eviction or calls reward code. */
export class MassNativeHost implements NativeFeatureHost {
  private residents=new Map<string,ReadonlyMap<string,Actor>>();
  private readonly retainRadius:number;
  private readonly quietSeconds:number;
  readonly occurrences:MassOccurrences;
  readonly courts:MassCourtPuzzles;
  readonly effects:MassNativeEffects;
  readonly brittles:MassNativeBrittles;
  constructor(readonly world:World,readonly policy:NativeHostPolicy,saved?:NativeResidencySave){
    this.retainRadius=policy.retainRadius??512;this.quietSeconds=policy.quietSeconds??15;
    if(!Number.isFinite(this.retainRadius)||this.retainRadius<256||this.retainRadius>8192
      ||!Number.isFinite(this.quietSeconds)||this.quietSeconds<5||this.quietSeconds>300)throw Error('Invalid native host residency');
    this.occurrences=new MassOccurrences(world,{...policy,retainRadius:this.retainRadius,quietSeconds:this.quietSeconds},saved);
    this.courts=new MassCourtPuzzles(world,{...policy,retainRadius:Math.max(this.retainRadius,PUZZLE_CFG.earshot)});
    this.effects=new MassNativeEffects(world);
    this.brittles=new MassNativeBrittles(world,{...policy,retainRadius:this.retainRadius,quietSeconds:this.quietSeconds});
  }
  get clock():number{return this.world.time;}
  get population():number{let n=this.occurrences.population+this.courts.population+this.brittles.population;for(const rows of this.residents.values())for(const a of rows.values())if(!a.dead)n++;return n;}
  get hasOccurrences():boolean{return this.occurrences.hasOccurrences;}
  updateOccurrences(dt:number,disturbances:readonly MassOccurrenceDisturbance[]):void{this.occurrences.update(dt,disturbances);}
  private saved(instance:NativeFeatureInstance,value?:unknown):NativeHostSave|undefined{
    if(value===undefined)return;
    const s=value as NativeHostSave;
    if(!s||s.schema!==1||s.owner!==instance.id||s.descriptor!==instance.blueprint.descriptor.hash
      ||!Number.isFinite(s.clock)||!Number.isSafeInteger(s.playerId)||!Array.isArray(s.bodies)||s.bodies.length>4096
      ||!Array.isArray(s.transient)||new Set(s.transient).size!==s.transient.length||new Set(s.bodies.map(b=>b.slot)).size!==s.bodies.length
      ||new Set(s.bodies.map(b=>b.actorId)).size!==s.bodies.length)throw Error('Invalid native feature body checkpoint');
    for(const b of s.bodies)if(!b||!b.slot||!b.monster||!Number.isSafeInteger(b.actorId)||b.actorId===s.playerId||typeof b.dead!=='boolean'
      ||!b.pos||![b.pos.x,b.pos.y,b.life].every(Number.isFinite)||b.life<0||!b.dead&&b.life<=0
      ||b.squadId!==undefined&&!Number.isSafeInteger(b.squadId))throw Error('Invalid native feature body receipt');
    if(s.transient.some(slot=>typeof slot!=='string'||!s.bodies.some(b=>b.slot===slot&&!b.dead&&!b.state))
      ||s.bodies.some(b=>!b.dead&&!b.state&&!s.transient.includes(b.slot)))throw Error('Unlabelled native transient checkpoint');
    if((instance.blueprint.descriptor.sidechannels?.occurrences.length??0)>0&&!s.occurrences)
      throw Error('Native feature lost occurrence checkpoint');
    if((instance.blueprint.descriptor.sidechannels?.puzzles.length??0)>0&&!s.courts)
      throw Error('Native feature lost court puzzle checkpoint');
    if((instance.blueprint.descriptor.effectSources?.rows.length??0)>0&&!s.effects)
      throw Error('Native feature lost native-effects checkpoint');
    if(s.effects&&s.effects.clock!==s.clock)throw Error('Native feature effect clock disagrees');
    if((instance.blueprint.descriptor.brittleSources?.rows.length??0)>0&&!s.brittles)
      throw Error('Native feature lost native-brittles checkpoint');
    if(s.brittles&&s.brittles.clock!==s.clock)throw Error('Native feature brittle clock disagrees');
    return s;
  }
  canInstall(instance:NativeFeatureInstance,savedNativeState?:unknown):boolean{
    if(this.residents.has(instance.id))return false;
    if(!nativeFeatureAdmission(instance.blueprint,nativeWorldCapabilities()).ok)return false;
    if(!massOccurrenceSupported(instance)||!massCourtPuzzlesSupported(instance)||!massNativeEffectsSupported(instance)||!massNativeBrittlesSupported(instance))return false;
    const saved=this.saved(instance,savedNativeState);
    const needed=saved?saved.bodies.filter(b=>!b.dead).length:upperPopulation(instance);
    return this.policy.population()+needed+this.occurrences.requiredPopulation(instance,saved?.occurrences)
      +this.courts.requiredPopulation(instance,saved?.courts)+this.brittles.requiredPopulation(instance,saved?.brittles)<=this.policy.maxPopulation();
  }
  private refusal(a:Actor,state:NativeActorState|null,instance:NativeFeatureInstance):string|null{
    if(a.dead)return null;
    // Native timber doors are deliberately outside fromZoneGen. They have no
    // AI, but live statuses/actions still forbid retiring their passive body.
    if(a.doorId){
      if(!state||a.casting||a.dash||a.push||a.leap||a.onTierLink||a.owner||a.threat.size
        ||a.statuses.length||a.expiredStatuses.length||a.buffs.size||a.activeAuras.size||a.restoreStreams.length
        ||a.useLock>0||a.reflexLock>0||this.world.time-a.lastCombatAt<this.quietSeconds)return 'active native door';
      return null;
    }
    const slot=instance.layout.structures?.flatMap(s=>s.slots).find(s=>s.id===a.garrison?.slotId);
    const owned=slot?.occupants.includes(a.id)&&!a.garrison?.pending?{garrisonSlot:slot.id}:undefined;
    return nativeDormancyRefusal(a,this.world,this.quietSeconds,state,owned);
  }
  install(instance:NativeFeatureInstance,savedNativeState?:unknown):NativeFeatureBinding{
    if(!this.canInstall(instance,savedNativeState))throw Error('Native feature requires population reservation');
    const saved=this.saved(instance,savedNativeState),world=this.world;
    // Factory output is detached: validation/restoration completes before any
    // actor or scenery is published to the live country.
    const bodies=world.createMassNativeBodies(instance),actors=new Map<number,Actor>(),squads=new Map<number,number>();
    if(saved){
      actors.set(saved.playerId,world.player);
      for(const b of saved.bodies){
        const a=bodies.get(b.slot);
        if(!a){
          if(b.dead&&b.slot.startsWith('door/')&&instance.layout.doodads.some(d=>d.door?.id===b.slot.slice(5)&&(d.door.open||d.door.broken)))continue;
          throw Error('Native feature lost its saved body slot');
        }
        if(a.defId!==b.monster)throw Error('Native feature body recipe changed');
        actors.set(b.actorId,a);
        if(b.squadId!==undefined){
          if(a.squadId===undefined||squads.has(b.squadId)&&squads.get(b.squadId)!==a.squadId)throw Error('Native feature lost its saved squad');
          squads.set(b.squadId,a.squadId);
        }
      }
      for(const [slot]of bodies)if(!saved.bodies.some(b=>b.slot===slot))throw Error('Native feature grew an unsaved body');
      for(const b of saved.bodies){const a=bodies.get(b.slot);if(!a)continue;
        if(b.dead){a.dead=true;a.life=0;continue;}
        if(b.life>a.maxLife())throw Error('Native feature wound exceeds native body');
        if(b.state)restoreNativeActorState(a,b.state,actors,squads);
        else{a.pos={...b.pos};a.life=b.life;}
        if(a.dead||a.life!==b.life||a.pos.x!==b.pos.x||a.pos.y!==b.pos.y)throw Error('Inconsistent native feature wound receipt');
      }
      for(const a of bodies.values())if(!a.dead&&a.garrison){
        const slot=instance.layout.structures?.flatMap(s=>s.slots).find(s=>s.id===a.garrison!.slotId);
        if(!slot||a.garrison.pending||slot.occupants.length>=slot.capacity)throw Error('Invalid native feature garrison receipt');
        slot.occupants.push(a.id);
      }
    }
    const live=[...bodies.values()].filter(a=>!a.dead);
    const occurrence=this.occurrences.prepare(instance,saved?.occurrences);
    const court=this.courts.prepare(instance,saved?.courts);
    const effects=this.effects.prepare(instance,saved?.effects);
    const brittles=this.brittles.prepare(instance,saved?.brittles);
    if(this.policy.population()+live.length+this.occurrences.requiredPopulation(instance,saved?.occurrences)
      +this.courts.requiredPopulation(instance,saved?.courts)+this.brittles.requiredPopulation(instance,saved?.brittles)>this.policy.maxPopulation())throw Error('Native feature population exceeded its reservation');
    const detachScene=world.installMassNativeScene(instance);
    try{effects?.mount();court?.mount();brittles?.mount();occurrence?.mount();}catch(error){
      // Every earlier controller has an exact rollback. Occurrences mount last
      // and undo their own failed enrollment before propagating an error.
      try{brittles?.rollbackMount();}finally{try{court?.rollbackMount();}finally{try{effects?.rollbackMount();}finally{detachScene();}}}throw error;
    }
    world.actors.push(...live);world.actorGridRev++;this.residents.set(instance.id,bodies);
    let detached=false;
    const states=()=>new Map([...bodies].map(([slot,a])=>[slot,a.dead?null:captureNativeActorState(a)]));
    const safe=(captures:ReturnType<typeof states>)=>{
      if(massDormancyPins(world,bodies).size)return false;
      const known=new Set([world.player.id,...[...bodies.values()].map(a=>a.id)]);
      for(const [slot,a]of bodies){
        const state=captures.get(slot);
        if(this.refusal(a,state??null,instance))return false;
        if(state&&state.nodes.some(n=>n.entries.some(pair=>pair.some(v=>v!==null&&typeof v==='object'&&'actor'in v&&!known.has(v.actor)))))return false;
      }
      return true;
    };
    const capture=():NativeHostSave=>{
      const captures=states(),pins=massDormancyPins(world,bodies),transient:string[]=[];
      const known=new Set([world.player.id,...[...bodies.values()].map(a=>a.id)]);
      const rows:BodySave[]=[];
      for(const [slot,a]of bodies){
        let state=captures.get(slot)??null;
        if(!a.dead&&(pins.has(a)||this.refusal(a,state,instance)))state=null;
        if(state&&state.nodes.some(n=>n.entries.some(pair=>pair.some(v=>v!==null&&typeof v==='object'&&'actor'in v&&!known.has(v.actor)))))state=null;
        if(!a.dead&&!state)transient.push(slot);
        rows.push({slot,actorId:a.id,monster:a.defId!,dead:a.dead,pos:{...a.pos},life:Math.max(0,a.life),
          ...(a.squadId===undefined?{}:{squadId:a.squadId}),...(state?{state}:{})});
      }
      return {schema:1,owner:instance.id,descriptor:instance.blueprint.descriptor.hash,clock:world.time,playerId:world.player.id,bodies:rows,transient,
        ...(occurrence?{occurrences:occurrence.capture()}: {}),...(court?{courts:court.capture()}: {}),
        ...(effects?{effects:effects.capture()}: {}),...(brittles?{brittles:brittles.capture()}: {})};
    };
    const allOwned=()=>new Set([...bodies.values(),...(occurrence?.actors()??[]),...(court?.actors()??[]),...(brittles?.actors()??[])]);
    const controllersQuiet=()=>{
      const owned=allOwned();
      return (!effects||effects.canRetire())&&(!court||court.canRetire(owned))
        &&(!occurrence||occurrence.canRetire(owned))&&(!brittles||brittles.canRetire(owned));
    };
    return {
      hasDoodad:d=>world.doodads.includes(d),capture,
      canRetire:()=>{
        if(detached)return true;
        const owned=allOwned(),g=instance.blueprint.grid!,o=instance.offset;
        if(world.actors.some(a=>!a.dead&&!owned.has(a)&&sameStory(a,{tier:0})
          &&a.pos.x>=o.x-this.retainRadius&&a.pos.y>=o.y-this.retainRadius
          &&a.pos.x<=o.x+g.cols*g.cell+this.retainRadius&&a.pos.y<=o.y+g.rows*g.cell+this.retainRadius))return false;
        return safe(states())&&controllersQuiet();
      },
      detach:()=>{
        if(detached)return;
        if(!safe(states())||!controllersQuiet())throw Error('Cannot retire a native feature with live dependencies');
        const controllerOwned=allOwned();
        effects?.detach();court?.detach(controllerOwned);brittles?.detach(controllerOwned);occurrence?.detach();
        const owned=new Set(bodies.values());world.actors=world.actors.filter(a=>!owned.has(a));world.actorGridRev++;
        detachScene();this.residents.delete(instance.id);detached=true;
      },
    };
  }
}
