export interface NativeCrusadeArrivalSourceRow {file:string;predecessor:string;beforeHash:string;afterHash:string;crlfLines:readonly number[];hunks:readonly {before:string;after:string}[]}
export const nativeCrusadeArrivalSourceArchive:{parent:string;rows:readonly NativeCrusadeArrivalSourceRow[];archives:readonly {file:string;normalSha256:string}[];current:readonly {file:string;normalSha256:string}[]} = {
  "parent": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
  "rows": [
    {
      "file": "src/engine/nativeCrusadeIdentity.ts",
      "predecessor": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
      "beforeHash": "05a222aa4368db6af368a394a281a46cdbb6e7b0a9e9e70ebd3b3af3543f706e",
      "afterHash": "ae1ccc501248763d571291f52786aebfdad47e80be29b0e34ee3acfc667e18ae",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import type {Actor} from './actor';\nimport type {KillCtx} from './killHandlers';\nimport type {CrusadeInfo} from '../packages/overlays/crusade';\nexport interface NativeCrusadeObserver {place(info:CrusadeInfo,run:()=>void):void;create(run:()=>Actor):Actor}\nexport type NativeCrusadeRegistration={host:object;observer:NativeCrusadeObserver}|{body:Actor;current:(ctx:KillCtx)=>boolean;resolve:(ctx:KillCtx)=>number};\nlet consume:((token:object)=>NativeCrusadeRegistration)|undefined;\nconst hosts=new WeakMap<object,NativeCrusadeObserver>(),bodies=new WeakMap<Actor,Extract<NativeCrusadeRegistration,{body:Actor}>>();\nexport function installNativeCrusadeRegistration(reader:NonNullable<typeof consume>):void {if(consume)throw Error('Native Crusade registrar already installed');consume=reader;}\nexport function bindNativeCrusadeIdentity(token:object):void {if(!consume)throw Error('Native Crusade registrar missing');const r=consume(token);if('host'in r){if(hosts.has(r.host))throw Error('Native Crusade host already bound');hosts.set(r.host,r.observer);}else{if(bodies.has(r.body))throw Error('Native Crusade body already bound');bodies.set(r.body,r);}}\nexport function observeNativeCrusadePlacement(host:object,info:CrusadeInfo,run:()=>void):void {const r=hosts.get(host);if(r)r.place(info,run);else run();}\nexport function observeNativeCrusadeCreation(host:object,run:()=>Actor):Actor {const r=hosts.get(host);return r?r.create(run):run();}\nexport function nativeCrusadeCommanderCurrent(ctx:KillCtx):boolean {const r=bodies.get(ctx.actor);return r?r.current(ctx):true;}\nexport function resolveNativeCrusadeCommander(ctx:KillCtx):number {const r=bodies.get(ctx.actor);return r?r.resolve(ctx):ctx.sim.crusadeField?.resolveCrusadeZone(ctx.zone.id)??1;}\n",
          "after": "import type {Actor} from './actor';\nimport type {KillCtx} from './killHandlers';\nimport type {CrusadeInfo} from '../packages/overlays/crusade';\nexport interface NativeCrusadeObserver {place(info:CrusadeInfo,run:()=>void):void;mark(select:()=>()=>void):void;create(run:()=>Actor):Actor}\nexport type NativeCrusadeRegistration={host:object;observer:NativeCrusadeObserver}|{body:Actor;current:(ctx:KillCtx)=>boolean;resolve:(ctx:KillCtx)=>number};\nlet consume:((token:object)=>NativeCrusadeRegistration)|undefined;\nconst hosts=new WeakMap<object,NativeCrusadeObserver>(),bodies=new WeakMap<Actor,Extract<NativeCrusadeRegistration,{body:Actor}>>();\nexport function installNativeCrusadeRegistration(reader:NonNullable<typeof consume>):void {if(consume)throw Error('Native Crusade registrar already installed');consume=reader;}\nexport function bindNativeCrusadeIdentity(token:object):void {if(!consume)throw Error('Native Crusade registrar missing');const r=consume(token);if('host'in r){if(hosts.has(r.host))throw Error('Native Crusade host already bound');hosts.set(r.host,r.observer);}else{if(bodies.has(r.body))throw Error('Native Crusade body already bound');bodies.set(r.body,r);}}\nexport function observeNativeCrusadePlacement(host:object,info:CrusadeInfo,run:()=>void):void {const r=hosts.get(host);if(r)r.place(info,run);else run();}\n/** Observe only the selected native marker-add seam; unbound calls stay direct. */\nexport function markNativeCrusadePlacement(host:object,select:()=>()=>void):void {const r=hosts.get(host);if(r)r.mark(select);else select()();}\nexport function observeNativeCrusadeCreation(host:object,run:()=>Actor):Actor {const r=hosts.get(host);return r?r.create(run):run();}\nexport function nativeCrusadeCommanderCurrent(ctx:KillCtx):boolean {const r=bodies.get(ctx.actor);return r?r.current(ctx):true;}\nexport function resolveNativeCrusadeCommander(ctx:KillCtx):number {const r=bodies.get(ctx.actor);return r?r.resolve(ctx):ctx.sim.crusadeField?.resolveCrusadeZone(ctx.zone.id)??1;}\n"
        }
      ]
    },
    {
      "file": "src/engine/nativeSceneRuntimeBirth.ts",
      "predecessor": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
      "beforeHash": "dc2a6f379c39345a8318facb8b8812124c1eaf15fede80fc49fffc8b03b21694",
      "afterHash": "07774c690cbe6cfbc21558a1b07553e215e6fdf81bbe269c6e309aa6f89662da",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {queryNativeVerminfall,placeNativeVerminfall,nativeVerminfallStep,markNativeVerminfallPlacement,createNativeVerminfallBody,insertNativeVerminfallBody} from './nativeVerminfallIdentity';\nimport {placeNativeVendetta,createNativeVendettaBody} from './nativeVendettaIdentity';\nimport {nativeFractureLifetimeCalls,type FractureField,type NativeFractureLifetime} from '../packages/overlays/fractures';\n",
          "after": "import {markNativeCrusadePlacement} from './nativeCrusadeIdentity';\nimport {queryNativeVerminfall,placeNativeVerminfall,nativeVerminfallStep,markNativeVerminfallPlacement,createNativeVerminfallBody,insertNativeVerminfallBody} from './nativeVerminfallIdentity';\nimport {placeNativeVendetta,createNativeVendettaBody} from './nativeVendettaIdentity';\nimport {nativeFractureLifetimeCalls,type FractureField,type NativeFractureLifetime} from '../packages/overlays/fractures';\n"
        },
        {
          "before": "  }\nexport function birthMaterializeCrusade(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, info: CrusadeInfo): void {\n    if (nativeHost.materializedCrusades.has(nativeHost.zone.id)) return;\n    nativeHost.materializedCrusades.add(nativeHost.zone.id);\n    const roster = sources.FACTIONS[info.faction];\n    if (!roster?.table?.length) return;\n    (0,sources.bumpLedger)(nativeHost.ledger, 'crusade_seen'); // DISCOVERY — surfaces the Vault tuning\n",
          "after": "  }\nexport function birthMaterializeCrusade(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, info: CrusadeInfo): void {\n    if (nativeHost.materializedCrusades.has(nativeHost.zone.id)) return;\n    markNativeCrusadePlacement(nativeHost,()=>{const marker=nativeHost.materializedCrusades,selected=marker.add,id=nativeHost.zone.id;return()=>{Reflect.apply(selected,marker,[id]);};});\n    const roster = sources.FACTIONS[info.faction];\n    if (!roster?.table?.length) return;\n    (0,sources.bumpLedger)(nativeHost.ledger, 'crusade_seen'); // DISCOVERY — surfaces the Vault tuning\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneCrusadeLifetime.ts",
      "predecessor": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
      "beforeHash": "448d5859748dc90b48676c03b8d65970d6582b1cd097fd7f58b73aac9e5ceb11",
      "afterHash": "46fb3788d32498caadd646eab23574861305b318c16aab3a75e88eb9e20285a6",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {nativeVerminfallLiveRegistryActive} from './nativeAreaSceneVerminfallLifetime';\n/** A retained area's garrison guard belongs to the actual campaign event.\n * Existing bodies/terrain survive. Repeated frames and native partial births cannot replay. */\nimport type {Actor} from '../engine/actor';\nimport type {KillCtx} from '../engine/killHandlers';\nimport type {ZoneDef} from '../data/zones';\n",
          "after": "import {nativeVerminfallLiveRegistryActive} from './nativeAreaSceneVerminfallLifetime';\nimport {claimNativeCrusadeArrival,nativeCrusadeArrivalPending} from './nativeAreaSceneTransitionCoordinator';\n/** A retained garrison keeps both its spent events and its consumed visit.\n * Only an actual empty return may admit a never-spent event; bodies and terrain survive. */\nimport type {Actor} from '../engine/actor';\nimport type {KillCtx} from '../engine/killHandlers';\nimport type {ZoneDef} from '../data/zones';\n"
        },
        {
          "before": "function bind(r:NativeCrusadeRegistration):void {const token=Object.freeze({});registrations.set(token,r);bindNativeCrusadeIdentity(token);}\nfunction own<T>(o:object,k:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value'))throw Error('Native Crusade needs ordinary selected data');return d.value as T;}\nfunction rows(a:Actor[]):Actor[]{const out:Actor[]=[];for(let i=0,n=own<number>(a,'length');i<n;i++)out.push(own<Actor>(a,i));return out;}\ninterface Placement {definition:ZoneDef;field:CrusadeField;epoch:object;id:string;rewardMul:number;initial:boolean;marker:Set<string>;before:boolean}\ninterface Body extends Placement {body:Actor;spent:boolean}\nexport class NativeAreaSceneCrusadeLifetime {\n readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #definition:ZoneDef;\n readonly #epoch=nativeCrusadeLifetimeCalls.epoch;readonly #resolve=nativeCrusadeLifetimeCalls.resolve;readonly #factory=NativeAreaScenePopulation.prototype.factoryOwnerOf;\n readonly #spent=new WeakSet<object>();#placement:Placement|undefined;#liveCheck:(()=>void)|undefined;#busy=false;\n constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,hooks:NativeAreaCombatOwnerHooks){\n  if(!isNativeAreaSceneCombat(combat))throw Error('Native Crusade needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);\n  this.#combat=combat;this.#entry=entry;this.#hooks=hooks;this.#definition=combat.scene.zone;\n  bind({host:combat.input.assembly.input.registry.input.birth.host,observer:{place:(info,run)=>this.#place(info,run),create:run=>this.#create(run)}});\n }\n #check(p:Placement):void {const c=this.#combat;if(c.scene.zone!==p.definition||c.input.campaign.sim.crusadeField!==p.field||Reflect.apply(this.#epoch,p.field,[p.id])!==p.epoch||c.input.assembly.input.registry.input.birth.input.state.materializedCrusades!==p.marker)throw Error('Native Crusade selected event changed');if(p.initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Crusade initial placement escaped actual birth');}else{if(!this.#liveCheck)throw Error('Native Crusade placement needs actual live registry');this.#liveCheck();}}\n #place(info:CrusadeInfo,run:()=>void):void {\n  if(this.#placement)throw Error('Native Crusade placement cannot reenter');const c=this.#combat,field=c.input.campaign.sim.crusadeField,id=own<string>(info,'crusadeId'),epoch=field&&Reflect.apply(this.#epoch,field,[id]);if(!field||!epoch)throw Error('Native Crusade placement needs its actual event');\n  const marker=c.input.assembly.input.registry.input.birth.input.state.materializedCrusades,p:Placement={definition:this.#definition,field,epoch,id,rewardMul:own<number>(info,'rewardMul'),initial:c.input.assembly.phase==='birthing',marker,before:Reflect.apply(Set.prototype.has,marker,[this.#definition.id])};this.#placement=p;\n  try{this.#check(p);if(this.#spent.has(epoch))return;run();this.#check(p);}\n  finally{if(!p.before&&Reflect.apply(Set.prototype.has,marker,[p.definition.id]))this.#spent.add(epoch);this.#placement=undefined;}\n }\n #create(run:()=>Actor):Actor {const p=this.#placement;if(!p)return run();this.#check(p);const body=run();this.#check(p);if(!Reflect.apply(this.#factory,this.#combat.input.assembly.input.population,[body]))throw Error('Native Crusade needs actual population construction');const row:Body={...p,body,spent:false};bind({body,current:ctx=>this.#current(row,ctx),resolve:ctx=>this.#settle(row,ctx)});return body;}\n #current(row:Body,ctx:KillCtx):boolean {if(row.spent||ctx.actor!==row.body||ctx.zone!==row.definition||ctx.sim.crusadeField!==row.field||Reflect.apply(this.#epoch,row.field,[row.id])!==row.epoch)return false;return this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);return this.#combat.scene.zone===row.definition&&Reflect.apply(this.#epoch,row.field,[row.id])===row.epoch;});}\n #settle(row:Body,ctx:KillCtx):number {if(!this.#current(row,ctx))return 1;const field=row.field,fn=field.resolveCrusadeZone;if(!this.#current(row,ctx))return 1;row.spent=true;const check=()=>this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);if(this.#combat.scene.zone!==row.definition||ctx.sim.crusadeField!==field)throw Error('Native Crusade kill owner changed');});return Reflect.apply(this.#resolve,field,[row.epoch,row.id,row.definition.id,row.rewardMul,check,()=>Reflect.apply(fn,field,[row.definition.id])]);}\n materializeLiveZoneEvents():void {\n  // Existing direct callers enter the same outer event scope; the delegated call runs this registry body once.\n  if(!nativeVerminfallLiveRegistryActive(this.#combat)){this.#combat.verminfallLifetime.materializeLiveZoneEvents();return;}\n  if(this.#busy)throw Error('Native Crusade live registry cannot reenter');const c=this.#combat,registry=c.input.assembly.input.registry,census=own<Actor[]>(c.scene,'actors'),physical=rows(census),definition=this.#definition,sim=c.input.campaign.sim,marker=registry.input.birth.input.state.materializedCrusades;\n  const check=()=>this.#entry(this,{permission:'physical',physical,sources:[]},()=>{if(own(c.scene,'zone')!==definition||own(c.scene,'actors')!==census||c.input.campaign.sim!==sim||registry.input.birth.input.state.materializedCrusades!==marker)throw Error('Native Crusade registry owner changed');});\n  this.#busy=true;this.#liveCheck=check;\n  try{this.#entry(this,{permission:'physical',physical,sources:[]},()=>{\n   check();if(!registry.host.inCave&&!definition.special){const field=sim.crusadeField;check();if(field){const fn=field.crusadeOn;check();const info=Reflect.apply(fn,field,[definition.id]);check();if(info){const id=own<string>(info,'crusadeId'),epoch=Reflect.apply(this.#epoch,field,[id]);check();if(!epoch||sim.crusadeField!==field)throw Error('Native Crusade query lost its actual event');const consumed=this.#spent.has(epoch),present=Reflect.apply(Set.prototype.has,marker,[definition.id]);if(consumed!==present){const fn=consumed?marker.add:marker.delete;check();Reflect.apply(fn,marker,[definition.id]);check();}}}}\n   const fn=registry.materializeLiveZoneEvents;check();Reflect.apply(fn,registry,[]);check();\n  });}finally{this.#liveCheck=undefined;this.#busy=false;}\n }\n",
          "after": "function bind(r:NativeCrusadeRegistration):void {const token=Object.freeze({});registrations.set(token,r);bindNativeCrusadeIdentity(token);}\nfunction own<T>(o:object,k:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value'))throw Error('Native Crusade needs ordinary selected data');return d.value as T;}\nfunction rows(a:Actor[]):Actor[]{const out:Actor[]=[];for(let i=0,n=own<number>(a,'length');i<n;i++)out.push(own<Actor>(a,i));return out;}\ninterface Placement {definition:ZoneDef;field:CrusadeField;epoch:object;id:string;rewardMul:number;initial:boolean;marker:Set<string>;before:boolean;actors:Actor[]}\ninterface Body extends Placement {body:Actor;spent:boolean}\nexport class NativeAreaSceneCrusadeLifetime {\n readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #definition:ZoneDef;\n readonly #query=nativeCrusadeLifetimeCalls.query;readonly #epoch=nativeCrusadeLifetimeCalls.epoch;readonly #resolve=nativeCrusadeLifetimeCalls.resolve;readonly #factory=NativeAreaScenePopulation.prototype.factoryOwnerOf;\n readonly #spent=new WeakSet<object>();readonly #logicalSpent=new WeakMap<CrusadeField,Set<string>>();readonly #arrivals=new WeakSet<object>();\n #visitConsumed=false;#placement:Placement|undefined;#liveCheck:(()=>void)|undefined;#arrivalCheck:(()=>void)|undefined;#busy=false;#arriving=false;\n constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,hooks:NativeAreaCombatOwnerHooks){\n  if(!isNativeAreaSceneCombat(combat))throw Error('Native Crusade needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);\n  this.#combat=combat;this.#entry=entry;this.#hooks=hooks;this.#definition=combat.scene.zone;\n  bind({host:combat.input.assembly.input.registry.input.birth.host,observer:{place:(info,run)=>this.#place(info,run),mark:select=>this.#mark(select),create:run=>this.#create(run)}});\n }\n #check(p:Placement):void {const c=this.#combat;if(c.scene.zone!==p.definition||c.scene.actors!==p.actors||c.input.campaign.sim.crusadeField!==p.field||Reflect.apply(this.#epoch,p.field,[p.id])!==p.epoch||c.input.assembly.input.registry.input.birth.input.state.materializedCrusades!==p.marker)throw Error('Native Crusade selected event changed');if(p.initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Crusade initial placement escaped actual birth');}else{const check=this.#arrivalCheck??this.#liveCheck;if(!check)throw Error('Native Crusade placement needs actual live registry or arrival');check();}}\n #hasSpent(field:CrusadeField,id:string,epoch:object):boolean {return this.#spent.has(epoch)||!!this.#logicalSpent.get(field)?.has(id);}\n #consume(p:Placement):void {this.#visitConsumed=true;this.#spent.add(p.epoch);let ids=this.#logicalSpent.get(p.field);if(!ids){ids=new Set<string>();this.#logicalSpent.set(p.field,ids);}ids.add(p.id);}\n #place(info:CrusadeInfo,run:()=>void):void {\n  if(this.#placement)throw Error('Native Crusade placement cannot reenter');const c=this.#combat,field=c.input.campaign.sim.crusadeField,id=own<string>(info,'crusadeId'),epoch=field&&Reflect.apply(this.#epoch,field,[id]);if(!field||!epoch)throw Error('Native Crusade placement needs its actual event');\n  const marker=c.input.assembly.input.registry.input.birth.input.state.materializedCrusades,p:Placement={definition:this.#definition,field,epoch,id,rewardMul:own<number>(info,'rewardMul'),initial:c.input.assembly.phase==='birthing',marker,before:Reflect.apply(Set.prototype.has,marker,[this.#definition.id]),actors:c.scene.actors};let attempted=false;this.#placement=p;\n  try{\n   this.#check(p);const consumed=this.#visitConsumed||this.#hasSpent(field,id,epoch);\n   if(consumed){this.#visitConsumed=true;if(!Reflect.apply(Set.prototype.has,marker,[p.definition.id])){const selected=marker.add;this.#check(p);Reflect.apply(selected,marker,[p.definition.id]);this.#check(p);}return;}\n   attempted=true;run();this.#check(p);\n  }finally{if(attempted&&!p.before&&Reflect.apply(Set.prototype.has,marker,[p.definition.id]))this.#consume(p);this.#placement=undefined;}\n }\n #mark(select:()=>()=>void):void {\n  const p=this.#placement;if(!p)throw Error('Native Crusade marker needs its actual placement');\n  try{this.#check(p);const run=select();this.#check(p);run();this.#check(p);}\n  finally{\n   // Observe the completed native add before discovery/notice can delete the\n   // marker and throw. The exact selected error and completed writes survive.\n   if(!p.before&&Reflect.apply(Set.prototype.has,p.marker,[p.definition.id]))this.#consume(p);\n  }\n }\n /** The private coordinator invocation admits only this genuine empty return.\n  * Logical history prevents A -> B -> A duplication without authorizing an old\n  * commander's reward against a reconstructed object. */\n arrive():void {\n  if(this.#arriving||this.#busy||this.#placement)throw Error('Native Crusade arrival cannot reenter');this.#arriving=true;\n  try{\n   const c=this.#combat,validate=claimNativeCrusadeArrival(c.input.coordinator,c,this),selection=validate();\n   if(selection.occupied||this.#arrivals.has(selection.token))return;\n   const scene=c.scene,definition=this.#definition,actors=scene.actors,registry=c.input.assembly.input.registry,birth=registry.input.birth,marker=birth.input.state.materializedCrusades,field=c.input.campaign.sim.crusadeField,inCave=registry.input.descentState.inCave,special=definition.special;\n   const checkOwner=()=>{const current=validate();if(current.token!==selection.token||current.occupied||c.scene!==scene||scene.zone!==definition||scene.actors!==actors||c.input.assembly.input.registry!==registry||registry.input.birth!==birth||birth.input.state.materializedCrusades!==marker||c.input.campaign.sim.crusadeField!==field||registry.input.descentState.inCave!==inCave||definition.special!==special)throw Error('Native Crusade selected arrival changed');};\n   this.#arrivalCheck=()=>this.#entry(this,{permission:'physical',physical:[],sources:[]},checkOwner);\n   this.#entry(this,{permission:'physical',physical:[],sources:[]},()=>{\n    checkOwner();if(inCave||special){this.#arrivals.add(selection.token);return;}\n    // The captured native query names the event before a selected query getter\n    // can run. Query callbacks may not exchange that selected field or epoch.\n    const expected=field?Reflect.apply(this.#query,field,[definition.id]) as CrusadeInfo|null:null;checkOwner();\n    const id=expected?own<string>(expected,'crusadeId'):undefined,epoch=field&&id!==undefined?Reflect.apply(this.#epoch,field,[id]):undefined;\n    if(expected&&!epoch)throw Error('Native Crusade arrival query lost its actual event');\n    const check=()=>{checkOwner();const current=field?Reflect.apply(this.#query,field,[definition.id]) as CrusadeInfo|null:null;checkOwner();if((current?own<string>(current,'crusadeId'):undefined)!==id||(field&&id!==undefined?Reflect.apply(this.#epoch,field,[id]):undefined)!==epoch)throw Error('Native Crusade selected arrival event changed');};\n    this.#arrivalCheck=()=>this.#entry(this,{permission:'physical',physical:[],sources:[]},check);\n    let info:CrusadeInfo|null=null;\n    if(field){const selected=field.crusadeOn;check();info=Reflect.apply(selected,field,[definition.id]);check();if((info?own<string>(info,'crusadeId'):undefined)!==id)throw Error('Native Crusade selected query differs from its actual event');}\n    const spent=!!(field&&id!==undefined&&epoch&&this.#hasSpent(field,id,epoch));\n    if(spent){\n     this.#visitConsumed=true;this.#arrivals.add(selection.token);\n     if(!Reflect.apply(Set.prototype.has,marker,[definition.id])){const selected=marker.add;check();Reflect.apply(selected,marker,[definition.id]);check();}\n    }else{\n     const selected=marker.delete;check();let failed=false;\n     try{Reflect.apply(selected,marker,[definition.id]);}catch(error){failed=true;throw error;}finally{\n      if(!Reflect.apply(Set.prototype.has,marker,[definition.id])){this.#visitConsumed=false;this.#arrivals.add(selection.token);}\n      if(failed){try{check();}catch{ /* Preserve the selected error and completed deletion. */ }}else check();\n     }\n     if(Reflect.apply(Set.prototype.has,marker,[definition.id]))throw Error('Native Crusade arrival guard was not released');\n    }\n    if(info){const selected=birth.materializeCrusade;check();Reflect.apply(selected,birth,[info]);check();}\n   });\n  }finally{this.#arrivalCheck=undefined;this.#arriving=false;}\n }\n #create(run:()=>Actor):Actor {const p=this.#placement;if(!p)return run();this.#check(p);const body=run();this.#check(p);if(!Reflect.apply(this.#factory,this.#combat.input.assembly.input.population,[body]))throw Error('Native Crusade needs actual population construction');const row:Body={...p,body,spent:false};bind({body,current:ctx=>this.#current(row,ctx),resolve:ctx=>this.#settle(row,ctx)});return body;}\n #current(row:Body,ctx:KillCtx):boolean {if(row.spent||ctx.actor!==row.body||ctx.zone!==row.definition||ctx.sim.crusadeField!==row.field||Reflect.apply(this.#epoch,row.field,[row.id])!==row.epoch)return false;return this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);return this.#combat.scene.zone===row.definition&&Reflect.apply(this.#epoch,row.field,[row.id])===row.epoch;});}\n #settle(row:Body,ctx:KillCtx):number {if(!this.#current(row,ctx))return 1;const field=row.field,fn=field.resolveCrusadeZone;if(!this.#current(row,ctx))return 1;row.spent=true;const check=()=>this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);if(this.#combat.scene.zone!==row.definition||ctx.sim.crusadeField!==field)throw Error('Native Crusade kill owner changed');});return Reflect.apply(this.#resolve,field,[row.epoch,row.id,row.definition.id,row.rewardMul,check,()=>Reflect.apply(fn,field,[row.definition.id])]);}\n materializeLiveZoneEvents():void {\n  if(this.#arriving||nativeCrusadeArrivalPending(this.#combat.input.coordinator,this.#combat,this))throw Error('Native Crusade live registry cannot reenter');\n  // Existing direct callers enter the same outer event scope; the delegated call runs this registry body once.\n  if(!nativeVerminfallLiveRegistryActive(this.#combat)){this.#combat.verminfallLifetime.materializeLiveZoneEvents();return;}\n  if(this.#busy)throw Error('Native Crusade live registry cannot reenter');const c=this.#combat,registry=c.input.assembly.input.registry,census=own<Actor[]>(c.scene,'actors'),physical=rows(census),definition=this.#definition,sim=c.input.campaign.sim,marker=registry.input.birth.input.state.materializedCrusades;\n  const check=()=>this.#entry(this,{permission:'physical',physical,sources:[]},()=>{if(own(c.scene,'zone')!==definition||own(c.scene,'actors')!==census||c.input.campaign.sim!==sim||registry.input.birth.input.state.materializedCrusades!==marker)throw Error('Native Crusade registry owner changed');});\n  this.#busy=true;this.#liveCheck=check;\n  try{this.#entry(this,{permission:'physical',physical,sources:[]},()=>{\n   check();\n   // Preserve the selected query's order and first error before any marker\n   // write. A consumed visit can only repair its guard, never release it.\n   if(!registry.host.inCave&&!definition.special){\n    const field=sim.crusadeField;check();let spent=false;\n    if(field){const fn=field.crusadeOn;check();if(sim.crusadeField!==field)throw Error('Native Crusade selected field changed');const info=Reflect.apply(fn,field,[definition.id]);check();if(sim.crusadeField!==field)throw Error('Native Crusade selected field changed');if(info){const id=own<string>(info,'crusadeId'),epoch=Reflect.apply(this.#epoch,field,[id]);check();if(!epoch||sim.crusadeField!==field)throw Error('Native Crusade query lost its actual event');spent=this.#hasSpent(field,id,epoch);}}\n    if(this.#visitConsumed||spent){this.#visitConsumed=true;if(!Reflect.apply(Set.prototype.has,marker,[definition.id])){const selected=marker.add;check();Reflect.apply(selected,marker,[definition.id]);check();}}\n   }\n   const fn=registry.materializeLiveZoneEvents;check();Reflect.apply(fn,registry,[]);check();\n  });}finally{this.#liveCheck=undefined;this.#busy=false;}\n }\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "predecessor": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
      "beforeHash": "0636551ebd903c049d385798fca5723986cb28158927ad56c8420a372ee9aefb",
      "afterHash": "8cc34e0d36713462fdbc3cd17017af9b730936043433f5ab5041027ca6da8b8b",
      "crlfLines": [],
      "hunks": [
        {
          "before": "const actualCoordinators=new WeakSet<object>();\nconst vendettaVisitTokens=new WeakMap<object,object>();\nconst vendettaArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat)=>{token:object;occupied:boolean}>();\nconst verminfallArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime'])=>(()=>{token:object;occupied:boolean})>();\nconst pendingVerminfallArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime'])=>boolean>();\n/** Non-granting refusal while the owner is selecting/validating an arrival. */\n",
          "after": "const actualCoordinators=new WeakSet<object>();\nconst vendettaVisitTokens=new WeakMap<object,object>();\nconst vendettaArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat)=>{token:object;occupied:boolean}>();\ntype EventArrivalKey='crusadeLifetime'|'verminfallLifetime';\ntype EventArrivalOwner=NativeAreaSceneCombat[EventArrivalKey];\ninterface EventArrivalStage {key:EventArrivalKey;combat:NativeAreaSceneCombat;owner:EventArrivalOwner;visit:object|undefined;active:boolean;entered:boolean}\nconst crusadeArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime'])=>(()=>{token:object;occupied:boolean})>();\nconst pendingCrusadeArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime'])=>boolean>();\n/** Non-granting refusal during either private event-leaf selection/invocation. */\nexport function nativeCrusadeArrivalPending(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime']):boolean{return pendingCrusadeArrivals.get(coordinator)?.(combat,owner)??false;}\n/** Only the exact selected Crusade leaf may claim the private invocation once. */\nexport function claimNativeCrusadeArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime']):()=>{token:object;occupied:boolean} {const claim=crusadeArrivals.get(coordinator);if(!claim)throw Error('Native Crusade needs its actual arrival coordinator');return claim(combat,owner);}\nconst verminfallArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime'])=>(()=>{token:object;occupied:boolean})>();\nconst pendingVerminfallArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime'])=>boolean>();\n/** Non-granting refusal while the owner is selecting/validating an arrival. */\n"
        },
        {
          "before": "  if(coordinatedWriters.has(characterWriter))throw Error('Native campaign already has a transition coordinator');\n  conclaveSelections.set(this,combat=>this.#selectedConclaveDeparture(combat));\n  vendettaArrivals.set(this,combat=>this.#selectedVendettaArrival(combat));\n  verminfallArrivals.set(this,(combat,owner)=>this.#claimVerminfallArrival(combat,owner));\n  pendingVerminfallArrivals.set(this,(combat,owner)=>{const stage=this.#verminfallArrival;return !!stage&&!stage.entered&&stage.combat===combat&&stage.owner===owner;});\n  this.input=Object.freeze({campaign,characterWriter,authority,memoryRegistry});Object.defineProperty(this,'input',{writable:false,configurable:false});coordinatedWriters.set(characterWriter,this);actualCoordinators.add(this);Reflect.apply(this.#groundCalls.registryBind,this.input.memoryRegistry,[this]);\n  realmEntryIssuers.set(this,(owner,combat)=>Object.freeze({enter:<T>(key:NativeRealmContextKey,destination:string,action:()=>T):T=>{if(own(combat,\"campaignFrame\")!==owner)throw Error(\"Native realm entry owner changed\");const source=this.#combat(combat),frame=this.#frame;if(!frame?.active||frame.current!==source||this.#realmEntry)throw Error(\"Native realm entry needs its exact current frame\");const value=own<World[NativeRealmContextKey]>(source.combat.campaignOwner.state,key);if(!value)throw Error(\"Native realm entry lost its original context\");const receipt:RealmEntry={frame,source,key,value,destination,prepared:null,definition:null,previous:null,revisit:false,completed:false,wakeCalled:false,consumed:false};this.#realmEntry=receipt;try{return action();}finally{this.#realmEntry=null;}},wake:(action:()=>void):void=>{if(own(combat,\"campaignFrame\")!==owner)throw Error(\"Native realm wake owner changed\");const r=this.#realmEntry;if(!r){action();return;}if(this.#frame!==r.frame||r.frame.current.combat!==combat||!r.consumed||r.wakeCalled||own(combat.campaignOwner.state,r.key)!==(r.completed?null:r.value))throw Error(\"Native realm wake differs from its exact arrival\");r.wakeCalled=true;if(!r.revisit)action();}}));\n  roadQueueIssuers.set(this,(owner,combat)=>{const current=()=>{if(own(combat,'campaignFrame')!==owner)throw Error('Native road queue owner changed');return this.#combat(combat);};return Object.freeze({enableHosted:()=>{current();this.#enableHostedRoads();},enqueue:(ticket:RoadTicket<NativeAreaRoadDestination>)=>this.#enqueueRoad(current(),ticket),drain:()=>{current();return this.#drainRoads();}});});\n",
          "after": "  if(coordinatedWriters.has(characterWriter))throw Error('Native campaign already has a transition coordinator');\n  conclaveSelections.set(this,combat=>this.#selectedConclaveDeparture(combat));\n  vendettaArrivals.set(this,combat=>this.#selectedVendettaArrival(combat));\n  crusadeArrivals.set(this,(combat,owner)=>this.#claimEventArrival('crusadeLifetime',combat,owner));\n  verminfallArrivals.set(this,(combat,owner)=>this.#claimEventArrival('verminfallLifetime',combat,owner));\n  pendingCrusadeArrivals.set(this,(combat,owner)=>!!this.#eventArrival&&this.#eventArrival.combat===combat&&own(combat,'crusadeLifetime')===owner);\n  pendingVerminfallArrivals.set(this,(combat,owner)=>!!this.#eventArrival&&this.#eventArrival.combat===combat&&own(combat,'verminfallLifetime')===owner);\n  this.input=Object.freeze({campaign,characterWriter,authority,memoryRegistry});Object.defineProperty(this,'input',{writable:false,configurable:false});coordinatedWriters.set(characterWriter,this);actualCoordinators.add(this);Reflect.apply(this.#groundCalls.registryBind,this.input.memoryRegistry,[this]);\n  realmEntryIssuers.set(this,(owner,combat)=>Object.freeze({enter:<T>(key:NativeRealmContextKey,destination:string,action:()=>T):T=>{if(own(combat,\"campaignFrame\")!==owner)throw Error(\"Native realm entry owner changed\");const source=this.#combat(combat),frame=this.#frame;if(!frame?.active||frame.current!==source||this.#realmEntry)throw Error(\"Native realm entry needs its exact current frame\");const value=own<World[NativeRealmContextKey]>(source.combat.campaignOwner.state,key);if(!value)throw Error(\"Native realm entry lost its original context\");const receipt:RealmEntry={frame,source,key,value,destination,prepared:null,definition:null,previous:null,revisit:false,completed:false,wakeCalled:false,consumed:false};this.#realmEntry=receipt;try{return action();}finally{this.#realmEntry=null;}},wake:(action:()=>void):void=>{if(own(combat,\"campaignFrame\")!==owner)throw Error(\"Native realm wake owner changed\");const r=this.#realmEntry;if(!r){action();return;}if(this.#frame!==r.frame||r.frame.current.combat!==combat||!r.consumed||r.wakeCalled||own(combat.campaignOwner.state,r.key)!==(r.completed?null:r.value))throw Error(\"Native realm wake differs from its exact arrival\");r.wakeCalled=true;if(!r.revisit)action();}}));\n  roadQueueIssuers.set(this,(owner,combat)=>{const current=()=>{if(own(combat,'campaignFrame')!==owner)throw Error('Native road queue owner changed');return this.#combat(combat);};return Object.freeze({enableHosted:()=>{current();this.#enableHostedRoads();},enqueue:(ticket:RoadTicket<NativeAreaRoadDestination>)=>this.#enqueueRoad(current(),ticket),drain:()=>{current();return this.#drainRoads();}});});\n"
        },
        {
          "before": "  return receipt.definition;\n }\n #warlordArrival:{row:Registered;capture:SeatCapture;seat:Seat;body:Actor;meta:Seat['meta'];definition:World['zone'];arriving:readonly Actor[]}|null=null;\n #verminfallArrival:{combat:NativeAreaSceneCombat;owner:NativeAreaSceneCombat['verminfallLifetime'];visit:object|undefined;active:boolean;entered:boolean}|null=null;\n assertWarlordArrival(combat:NativeAreaSceneCombat):World['zone'] {\n  if(this.#verminfallArrival)throw Error('Native arrival leaf is selected for Verminfall');\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native crown needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native crown arrival lost its actual hand or ground');return r.definition;\n",
          "after": "  return receipt.definition;\n }\n #warlordArrival:{row:Registered;capture:SeatCapture;seat:Seat;body:Actor;meta:Seat['meta'];definition:World['zone'];arriving:readonly Actor[]}|null=null;\n #eventArrival:EventArrivalStage|null=null;\n assertWarlordArrival(combat:NativeAreaSceneCombat):World['zone'] {\n  if(this.#eventArrival)throw Error('Native arrival leaf is selected for '+(this.#eventArrival.key==='crusadeLifetime'?'Crusade':'Verminfall'));\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native crown needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native crown arrival lost its actual hand or ground');return r.definition;\n"
        },
        {
          "before": "  return presence.seats.some(seat=>target!==arrival||!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n }\n #selectedVendettaArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n  if(this.#verminfallArrival)throw Error('Native arrival leaf is selected for Verminfall');\n  return this.#selectedEventArrival(combat);\n }\n #selectedEventArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n",
          "after": "  return presence.seats.some(seat=>target!==arrival||!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n }\n #selectedVendettaArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n  if(this.#eventArrival)throw Error('Native arrival leaf is selected for '+(this.#eventArrival.key==='crusadeLifetime'?'Crusade':'Verminfall'));\n  return this.#selectedEventArrival(combat);\n }\n #selectedEventArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n"
        },
        {
          "before": "  const presence=this.#presence(r.row),occupied=presence.seats.some(seat=>!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native Vendetta arrival lost its actual hand or ground');let token=vendettaVisitTokens.get(r);if(!token){token=Object.freeze({});vendettaVisitTokens.set(r,token);}return{token,occupied};\n }\n #claimVerminfallArrival(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime']):()=>{token:object;occupied:boolean} {\n  const stage=this.#verminfallArrival;\n  if(!stage||!stage.active||stage.entered||stage.combat!==combat||stage.owner!==owner||own(combat,'verminfallLifetime')!==owner)throw Error('Native Verminfall needs its selected unclaimed arrival invocation');\n  // Reserve entry before selected readiness/physical validation can reenter.\n  stage.entered=true;const initial=this.#selectedEventArrival(combat);if(initial.token!==stage.visit)throw Error('Native Verminfall arrival visit changed');\n  return()=>{\n   if(this.#verminfallArrival!==stage||!stage.active||!stage.entered||own(combat,'verminfallLifetime')!==owner)throw Error('Native Verminfall arrival invocation expired');\n   const current=this.#selectedEventArrival(combat);if(current.token!==stage.visit)throw Error('Native Verminfall arrival visit changed');return current;\n  };\n }\n #invokeVerminfallArrival(combat:NativeAreaSceneCombat):void {\n  if(this.#verminfallArrival)throw Error('Native Verminfall arrival invocation cannot reenter');\n  const owner=own<NativeAreaSceneCombat['verminfallLifetime']>(combat,'verminfallLifetime'),stage={combat,owner,visit:undefined as object|undefined,active:false,entered:false};\n  // Selecting a callable grants no entry. The selecting stage also prevents an\n  // older sibling from borrowing the surrounding global warm-arrival window.\n  this.#verminfallArrival=stage;\n  try{\n   // Close the sibling window before the first selected readiness callback.\n   stage.visit=this.#selectedEventArrival(combat).token;\n   const selected=owner.arrive,current=this.#selectedEventArrival(combat);\n   if(current.token!==stage.visit||own(combat,'verminfallLifetime')!==owner||typeof selected!=='function')throw Error('Native Verminfall selected arrival callable changed');\n   stage.active=true;const result=Reflect.apply(selected,owner,[]);if(nativeBirthAsyncResult(result))throw Error('Native Verminfall arrival must be synchronous');\n   if(!stage.entered)throw Error('Native Verminfall selected arrival did not claim its invocation');\n   if(this.#selectedEventArrival(combat).token!==stage.visit)throw Error('Native Verminfall arrival visit changed');\n  }finally{stage.active=false;this.#verminfallArrival=null;}\n }\n #bountyArrival:{combat:NativeAreaSceneCombat;from:string|undefined}|null=null;\n bountyArrivalFrom(combat:NativeAreaSceneCombat):string|undefined {if(!this.#moving||!this.#frame?.active||this.#frame.current.combat!==combat||this.#bountyArrival?.combat!==combat)throw Error('Native bounty arrival needs its selected genuine revisit');return this.#bountyArrival.from;}\n",
          "after": "  const presence=this.#presence(r.row),occupied=presence.seats.some(seat=>!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native Vendetta arrival lost its actual hand or ground');let token=vendettaVisitTokens.get(r);if(!token){token=Object.freeze({});vendettaVisitTokens.set(r,token);}return{token,occupied};\n }\n #claimEventArrival(key:EventArrivalKey,combat:NativeAreaSceneCombat,owner:EventArrivalOwner):()=>{token:object;occupied:boolean} {\n  const stage=this.#eventArrival,label=key==='crusadeLifetime'?'Native Crusade':'Native Verminfall';\n  if(!stage||!stage.active||stage.entered||stage.key!==key||stage.combat!==combat||stage.owner!==owner||own(combat,key)!==owner)throw Error(label+' needs its selected unclaimed arrival invocation');\n  // Reserve entry before selected readiness/physical validation can reenter.\n  stage.entered=true;const initial=this.#selectedEventArrival(combat);if(initial.token!==stage.visit)throw Error(label+' arrival visit changed');\n  return()=>{\n   if(this.#eventArrival!==stage||!stage.active||!stage.entered||own(combat,key)!==owner)throw Error(label+' arrival invocation expired');\n   const current=this.#selectedEventArrival(combat);if(current.token!==stage.visit)throw Error(label+' arrival visit changed');return current;\n  };\n }\n #invokeEventArrival(key:EventArrivalKey,combat:NativeAreaSceneCombat):void {\n  const label=key==='crusadeLifetime'?'Native Crusade':'Native Verminfall';if(this.#eventArrival)throw Error(label+' arrival invocation cannot reenter');\n  const owner=own<EventArrivalOwner>(combat,key),stage:EventArrivalStage={key,combat,owner,visit:undefined,active:false,entered:false};\n  // Selection grants no entry. Both event leaves and the older siblings refuse\n  // borrowing this stage, before the first selected readiness callback.\n  this.#eventArrival=stage;\n  try{\n   stage.visit=this.#selectedEventArrival(combat).token;\n   const selected=owner.arrive,current=this.#selectedEventArrival(combat);\n   if(current.token!==stage.visit||own(combat,key)!==owner||typeof selected!=='function')throw Error(label+' selected arrival callable changed');\n   stage.active=true;const result=Reflect.apply(selected,owner,[]);if(nativeBirthAsyncResult(result))throw Error(label+' arrival must be synchronous');\n   if(!stage.entered)throw Error(label+' selected arrival did not claim its invocation');\n   if(this.#selectedEventArrival(combat).token!==stage.visit)throw Error(label+' arrival visit changed');\n  }finally{stage.active=false;this.#eventArrival=null;}\n }\n #bountyArrival:{combat:NativeAreaSceneCombat;from:string|undefined}|null=null;\n bountyArrivalFrom(combat:NativeAreaSceneCombat):string|undefined {if(!this.#moving||!this.#frame?.active||this.#frame.current.combat!==combat||this.#bountyArrival?.combat!==combat)throw Error('Native bounty arrival needs its selected genuine revisit');return this.#bountyArrival.from;}\n"
        },
        {
          "before": "   for(const seat of frame.seats){source.roads.depart(seat);destination.roads.arrive(seat,activeRoad?activeRoad.receipt.ticket:{seatId:own<string>(seat,'id'),dest:zoneId,...(!onGraph?{ladder}:{})},from??null);}\n   destination.combat.transitionArrival(cohort);\n   if(!firstBirth){const selectedHarbor=capture.rows.find(row=>row.body===incoming);if(!selectedHarbor)throw Error('Native harbor arrival lost its selected seat');this.#harborArrival={row:destination,capture,seat:selectedHarbor.seat,body:incoming,meta:own(selectedHarbor.seat,'meta'),definition:destScene.zone};try{destination.combat.harborServices.arrive();}finally{this.#harborArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native crown arrival lost its incoming seat');this.#warlordArrival={row:destination,capture,seat:selected.seat,body:incoming,meta:own(selected.seat,'meta'),definition:destScene.zone,arriving:Object.freeze([...cohort])};try{destination.combat.warlordArrival.arrive();this.#invokeVerminfallArrival(destination.combat);destination.combat.vendettaLifetime.arrive();}finally{this.#warlordArrival=null;}}\n   if(!firstBirth){this.#bountyArrival={combat:destination.combat,from};try{destination.combat.arriveBounties();}finally{this.#bountyArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native encounter arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'encounter',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.encounterArrival.arrive();}finally{this.#delayedArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native surface arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'merc',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.surfaceArrival.arriveMerc();}finally{this.#delayedArrival=null;}}\n",
          "after": "   for(const seat of frame.seats){source.roads.depart(seat);destination.roads.arrive(seat,activeRoad?activeRoad.receipt.ticket:{seatId:own<string>(seat,'id'),dest:zoneId,...(!onGraph?{ladder}:{})},from??null);}\n   destination.combat.transitionArrival(cohort);\n   if(!firstBirth){const selectedHarbor=capture.rows.find(row=>row.body===incoming);if(!selectedHarbor)throw Error('Native harbor arrival lost its selected seat');this.#harborArrival={row:destination,capture,seat:selectedHarbor.seat,body:incoming,meta:own(selectedHarbor.seat,'meta'),definition:destScene.zone};try{destination.combat.harborServices.arrive();}finally{this.#harborArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native crown arrival lost its incoming seat');this.#warlordArrival={row:destination,capture,seat:selected.seat,body:incoming,meta:own(selected.seat,'meta'),definition:destScene.zone,arriving:Object.freeze([...cohort])};try{destination.combat.warlordArrival.arrive();this.#invokeEventArrival('crusadeLifetime',destination.combat);this.#invokeEventArrival('verminfallLifetime',destination.combat);destination.combat.vendettaLifetime.arrive();}finally{this.#warlordArrival=null;}}\n   if(!firstBirth){this.#bountyArrival={combat:destination.combat,from};try{destination.combat.arriveBounties();}finally{this.#bountyArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native encounter arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'encounter',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.encounterArrival.arrive();}finally{this.#delayedArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native surface arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'merc',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.surfaceArrival.arriveMerc();}finally{this.#delayedArrival=null;}}\n"
        }
      ]
    },
    {
      "file": "docs/worldgen/native-crusade-event-lifetime.md",
      "predecessor": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
      "beforeHash": "04db5e7e9bc7275e6631495dc94e61b555b3b2f9cebef388a6960331284b09f1",
      "afterHash": "439ba0f72e39a16bf8fed8d452f10bfeef4b10734318dd7f62fbfd7daf3603bd",
      "crlfLines": [],
      "hunks": [
        {
          "before": "# Retained Crusade event lifetime\n\nA retained area's native Crusade guard now follows the actual overlay event object. The shared native registry and garrison birth bodies remain unchanged. A new event can materialize its own garrison once; repeated frames and returns keep the existing bodies, wounds, rewards, terrain, and gate lifecycle.\n\nThe retained owner observes the real birth operation and actual population factory. It records the event as spent when the native per-zone guard is committed, including when later native callbacks fail. A partial native birth therefore keeps its original effects and cannot replay its ledger or garrison. Reconciliation runs inside the existing physical operation and rechecks selected field, marker, census, and owner identity around callback-capable steps.\n\nEach native-created commander carries its issuing event identity. An ended event's commander keeps ordinary monster death effects but cannot claim another event's liberation reward or suppress its successor. A still-live older campaign is resolved through a bounded field receipt for that exact event, even when a different campaign now dominates the same area. Selected callback replacement, expired event identity, and repeated resolution cannot redirect the receipt to a new event. Unbound original World kills retain their prior package handler behavior.\n\nVerification includes `nativecrusadeepochwitness` (actual first and successor realm bosses and a genuine departure/return), `nativecrusadeoldcommander`, `nativecrusadecommanderparity`, and `nativecrusadeepochboundaries`. The latter covers same-event retention, actual remote Seat occupancy, current and stale commanders, selected queries and marker operations, native partial notice/birth effects, and a selected kill callback replacing the event. The current-commander comparison requires exact field changes, XP, and drop counts; it records initial body differences caused by the fixture's additional retained birth separately. Event staging uses the supported overlay development entry point; boss kills use the actual native kill operation, not natural combat. Remote occupancy is actual retained Seat/road behavior, not new TCP or browser acceptance.\n\nThis repair preserves existing terrain. The separate phase142 terrain receipt confirms that, after a distinct second event, original World builds Crusade works while the warm retained area does not. Safe renewal of walls, doors, structure occupants, walk grids, and destroyed or opened objects remains open; generic layout adoption would erase unrelated warm state. Same-event tier changes, broader content parity, actual Shards transport acceptance, and 60 Hz capacity are not established by these finite checks. Original source assertions, archives, roster, and CLAUDE instructions remain unchanged for integration review.\n\nIndependent review found that construction-time reads of the public field prototype could capture a replaced event-identity or kill-scope method. The defining overlay module now freezes its authentic lifetime calls as the class is initialized. The retained owner uses those originals while preserving the intentionally selected public zone resolver. The unchanged independent `criticcrusadecoldcapture` probe runs in separate `scope` and `epoch` processes: both require zero calls to the pre-construction replacement, correct own-event suppression for a still-live older event, and no event reward for an expired commander. The rejected phase142 source and both negative receipts remain preserved.\n",
          "after": "# Retained Crusade event lifetime\n\nA retained area's garrison keeps two facts: whether the current visit has already attempted its native muster, and which Crusade events have already spent a muster here. Once the native marker add completes, a later dominant event cannot pour another garrison during that uninterrupted visit. Live updates may repair a missing marker but cannot release it. The selected public event query still runs before marker repair, preserving its callback order and first failure.\n\nA genuine warm arrival can release the visit only when no other physical Seat occupies the destination outside the arriving cohort. Standing, downed, keeper and dormant Seats all count. A never-spent current event may then muster once; returning to an already-spent event preserves its actual bodies and wounds. Crusade can have overlapping campaigns: A -> B -> A must not duplicate A's garrison. Placement history therefore retains both event-object and same-field logical-ID consumption. Logical IDs do not authorize an old commander's reward against a reconstructed event. An absent field or event cannot reopen a consumed visit during live updates; an actual empty return can release the visit before a later first eligible event appears. The existing first-birth rule for an unconsumed resident area is unchanged.\n\nThe retained owner observes the real birth operation and actual population factory. It records consumption at the completed native marker add, before discovery, monster creation or notice callbacks can remove that marker and throw. Completed native effects survive; partial garrisons and discovery cannot replay. A selected add that fails before adding does not consume a new attempt. An arrival deletion that completes and then throws keeps that deletion and the released attempt, while preserving the original error. Guard repair alone never marks an unseen successor as spent.\n\nThe coordinator privately selects Crusade after Warlord and before Verminfall and Vendetta. Selecting a callable grants no entry. Each actual invocation reserves one claim before callback-capable validation and revokes it in `finally`; foreign, sibling, repeated, live-registry and asynchronous borrowing refuse. Physical ownership and occupancy are revalidated across callbacks. This finite shared Crusade/Verminfall stage does not claim to repair the older Warlord-to-Vendetta window outside those selected event leaves.\n\nEach native-created commander carries its issuing event identity. An ended event's commander keeps ordinary monster death effects but cannot claim another event's liberation reward or suppress its successor. A still-live older campaign resolves through a bounded field receipt for that exact event even when another campaign dominates the area. Selected callback replacement, expired identity and repeated resolution cannot redirect that receipt. Original unbound World kills retain their package behavior. The authentic lifetime calls remain captured by the defining overlay module; public zone queries remain intentionally selected.\n\nTerrain renewal belongs to the separate [Crusade terrain lifetime](native-crusade-terrain-lifetime.md). This timing change leaves that owner, commander kill handling and realm/portal rules intact. A whole actor-count change during return can include legitimate terrain fixture renewal, so garrison tests observe the actual native muster and its inserted bodies separately.\n\nThe matched five-frame observation at parent `82c516ce` used ordinary native startup and retained native startup with equal geography, fields, event identities and measured RNG ingress. A supported development-staged successor produced zero new ordinary placements but one retained placement with twelve bodies and one discovery during the same visit. The candidate repeats that exact course and requires zero successor placements and discovery in both lanes. This fixture directly resolves and stages events; it is not evidence of organic recurrence or equality of all random draws.\n\nThe original `probe_nativecrusadeepochboundaries.ts` and sealed roster remain byte-identical historical contracts. Its thirteen cases include the obsolete live-replacement timing expectation. The probe runner names an explicit current-runtime successor, preserves the selected row's arguments and execution limits, and reports the actual executed check. Its mapping accounts for every predecessor case; historical source preservation is distinct from a current runtime pass. Current checks add occupied/empty arrivals, A -> B -> A, logical continuity, marker and callback partial effects, and private invocation refusal. Commander, cold birth, terrain, realm, Continue, hosted travel and source-chain checks remain required alongside all four type configurations and boot checks.\n\nThe shared arrival order also changes where an earlier Verminfall fault fixture is triggered. Its original 46-case source remains preserved. The explicitly named `check_nativeverminfallcrusadeboundaries.ts` successor keeps those cases and their assertions, locates the final fault at the actual Verminfall stage after the earlier Crusade validation, and adds both leaves' post-return validation controls. CI invokes the current check directly; the earlier source is historical evidence, not a current gameplay pass. The first installed integration run exposed this fixture-order conflict and remains recorded as a failure.\nThese finite courses establish only the behaviors they exercise. They do not establish full playable parity, transferable private visit state, empty-area scheduling, all-frame RNG equivalence, performance capacity or readiness for the main merge."
        }
      ]
    },
    {
      "file": "balance/runprobes.ts",
      "predecessor": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
      "beforeHash": "f8e90d361743b8d928ad464ee25fc61c23fea1ef3f49526a0e4fe986f474e167",
      "afterHash": "8a43bc358dca715293832c34ea7ef3ffe27ef1f3bee16f5a4ac17dba8b9634c3",
      "crlfLines": [],
      "hunks": [
        {
          "before": "// PASS/FAIL, exit 0/1). This drives the GREEN ones off balance/proberoster.ts\n// and fails loudly when any of them regresses — the standing gate the probes\n// were always written to be, run by machine instead of by hand.\n//\n// THE CENSUS runs first, ALWAYS: the roster and the balance/ directory must\n// agree exactly. An unenrolled probe or a row naming a missing file is a hard\n",
          "after": "// PASS/FAIL, exit 0/1). This drives the GREEN ones off balance/proberoster.ts\n// and fails loudly when any of them regresses — the standing gate the probes\n// were always written to be, run by machine instead of by hand.\n// Explicit CURRENT-SUCCESSOR mappings preserve historical source/roster identity\n// while dispatching the separately pinned, visibly named current-runtime check.\n//\n// THE CENSUS runs first, ALWAYS: the roster and the balance/ directory must\n// agree exactly. An unenrolled probe or a row naming a missing file is a hard\n"
        },
        {
          "before": "import { fileURLToPath } from 'node:url';\n\nimport { PROBE_ROSTER, excludedProbes, greenProbes, type ProbeRow, type ProbeTier } from './proberoster';\n\nconst BALANCE_DIR = path.dirname(fileURLToPath(import.meta.url));\nconst REPO_ROOT = path.dirname(BALANCE_DIR);\n",
          "after": "import { fileURLToPath } from 'node:url';\n\nimport { PROBE_ROSTER, excludedProbes, greenProbes, type ProbeRow, type ProbeTier } from './proberoster';\nimport {validateProbeSupersessions,resolveProbeExecution,probeExecutionLabel,probeRerunCommand,probeMatchesFilter} from './probesupersessions';\n\nconst BALANCE_DIR = path.dirname(fileURLToPath(import.meta.url));\nconst REPO_ROOT = path.dirname(BALANCE_DIR);\n"
        },
        {
          "before": "  // alike (you asked for that rig by name — excluded rows still never gate).\n  // Without one, the lanes decide: fast by default, + slow, + excluded.\n  if (o.filter) {\n    const named = PROBE_ROSTER.filter(r => r.probe.includes(o.filter!));\n    if (!named.length) {\n      console.error(`probe: --filter \"${o.filter}\" matches no probe. Try --list.`);\n      process.exit(2);\n",
          "after": "  // alike (you asked for that rig by name — excluded rows still never gate).\n  // Without one, the lanes decide: fast by default, + slow, + excluded.\n  if (o.filter) {\n    const named = PROBE_ROSTER.filter(r => probeMatchesFilter(r,o.filter!));\n    if (!named.length) {\n      console.error(`probe: --filter \"${o.filter}\" matches no probe. Try --list.`);\n      process.exit(2);\n"
        },
        {
          "before": "\nfunction runOnce(row: ProbeRow, o: Options, live: boolean): Promise<Attempt> {\n  return new Promise(resolve => {\n    const started = Date.now();\n    const child = spawn(process.execPath, [TSX_CLI, path.join('balance', row.probe), ...(row.args ?? [])], {\n      cwd: REPO_ROOT,\n      stdio: ['ignore', 'pipe', 'pipe'],\n      env: { ...process.env, NO_COLOR: '1' },\n",
          "after": "\nfunction runOnce(row: ProbeRow, o: Options, live: boolean): Promise<Attempt> {\n  return new Promise(resolve => {\n    let selected:ReturnType<typeof resolveProbeExecution>;\n    try { selected = resolveProbeExecution(row, REPO_ROOT); }\n    catch (error) {\n      // A pin changing after preflight is this attempt's refusal, not a rejected\n      // worker Promise that abandons other already-running probe children.\n      resolve({code:2,timedOut:false,ms:0,output:'CURRENT-SUCCESSOR refused before launch: '+String(error)});\n      return;\n    }\n    const started = Date.now();\n    const child = spawn(process.execPath, [TSX_CLI, path.join('balance', selected.file), ...selected.args], {\n      cwd: REPO_ROOT,\n      stdio: ['ignore', 'pipe', 'pipe'],\n      env: { ...process.env, NO_COLOR: '1' },\n"
        },
        {
          "before": "  if (row.status === 'green') {\n    while (!passed(a) && attempts <= o.retries) {\n      attempts++;\n      if (live) console.log(`\\n───── ${row.probe} — re-run ${attempts}/${o.retries + 1} ─────`);\n      a = await runOnce(row, o, live);\n    }\n  }\n",
          "after": "  if (row.status === 'green') {\n    while (!passed(a) && attempts <= o.retries) {\n      attempts++;\n      if (live) console.log(`\\n───── ${probeExecutionLabel(row)} — re-run ${attempts}/${o.retries + 1} ─────`);\n      a = await runOnce(row, o, live);\n    }\n  }\n"
        },
        {
          "before": "async function main(): Promise<void> {\n  const o = parseArgs(process.argv.slice(2));\n  census();\n\n  if (o.list) {\n    for (const r of PROBE_ROSTER) {\n      const lane = r.status === 'green' ? `green/${r.tier}`.padEnd(12) : `EXCL/${r.excuse}`.padEnd(12);\n      console.log(`${lane} ${r.probe.padEnd(30)} ${r.why}`);\n    }\n    console.log(`\\n${PROBE_ROSTER.length} probes — ${greenProbes('fast').length} green/fast, `\n      + `${greenProbes('slow').length} green/slow, ${excludedProbes('red').length} excluded/red, `\n      + `${excludedProbes('flaky').length} excluded/flaky`);\n    return;\n  }\n\n",
          "after": "async function main(): Promise<void> {\n  const o = parseArgs(process.argv.slice(2));\n  census();\n  try { validateProbeSupersessions(PROBE_ROSTER, REPO_ROOT); }\n  catch (error) { die('current-runtime supersession refused: ' + String(error)); }\n\n  if (o.list) {\n    for (const r of PROBE_ROSTER) {\n      const lane = r.status === 'green' ? `green/${r.tier}`.padEnd(12) : `EXCL/${r.excuse}`.padEnd(12);\n      console.log(`${lane} ${probeExecutionLabel(r).padEnd(30)} ${r.why}`);\n    }\n    console.log(`\\n${PROBE_ROSTER.length} probes — ${greenProbes('fast').length} green/fast, `\n      + `${greenProbes('slow').length} green/slow, ${excludedProbes('red').length} excluded/red, `\n      + `${excludedProbes('flaky').length} excluded/flaky`);\n    console.log('CURRENT-SUCCESSOR entries execute their named current checks; original probe/roster bytes are historical source checks only.');\n    return;\n  }\n\n"
        },
        {
          "before": "  const worker = async (): Promise<void> => {\n    while (next < chosen.length) {\n      const row = chosen[next++];\n      if (live) console.log(`\\n───── ${row.probe} ─────`);\n      const r = await runProbe(row, o, live);\n      results.push(r);\n      const ok = passed(r);\n",
          "after": "  const worker = async (): Promise<void> => {\n    while (next < chosen.length) {\n      const row = chosen[next++];\n      if (live) console.log(`\\n───── ${probeExecutionLabel(row)} ─────`);\n      const r = await runProbe(row, o, live);\n      results.push(r);\n      const ok = passed(r);\n"
        },
        {
          "before": "        ? (ok ? (r.row.excuse === 'red' ? 'HEALED' : 'flaky ') : 'known ')\n        : (ok ? (r.attempts > 1 ? 'FLAKY ' : 'PASS  ') : 'FAIL  ');\n      const note = r.timedOut ? `TIMEOUT after ${o.timeoutSec}s` : tally(r.output);\n      console.log(`${mark} ${secs(r.ms).padStart(6)}  ${r.row.probe.padEnd(30)} ${note}`\n        + (ok && r.attempts > 1 ? `  (passed on attempt ${r.attempts})` : ''));\n      if (!ok && !live) for (const l of failLines(r.output)) console.log(`         ${l}`);\n      if (r.code === 127) console.log(`         could not launch: ${r.output.trim()}`);\n",
          "after": "        ? (ok ? (r.row.excuse === 'red' ? 'HEALED' : 'flaky ') : 'known ')\n        : (ok ? (r.attempts > 1 ? 'FLAKY ' : 'PASS  ') : 'FAIL  ');\n      const note = r.timedOut ? `TIMEOUT after ${o.timeoutSec}s` : tally(r.output);\n      console.log(`${mark} ${secs(r.ms).padStart(6)}  ${probeExecutionLabel(r.row).padEnd(30)} ${note}`\n        + (ok && r.attempts > 1 ? `  (passed on attempt ${r.attempts})` : ''));\n      if (!ok && !live) for (const l of failLines(r.output)) console.log(`         ${l}`);\n      if (r.code === 127) console.log(`         could not launch: ${r.output.trim()}`);\n"
        },
        {
          "before": "  console.log(`\\n${'─'.repeat(64)}`);\n  console.log(`${green.length - broke.length}/${green.length} green probes passed in ${secs(Date.now() - started)} wall clock.`);\n\n  if (flaked.length) {\n    console.log(`\\nFLAKY — ${flaked.length} green probe(s) failed then PASSED on a re-run.`\n      + ` Not a build failure, but not nothing: re-run each ~20× to put a rate on it,`\n      + ` then give it an 'excluded'/'flaky' row in balance/proberoster.ts.`);\n    for (const r of flaked) {\n      console.log(`  ${r.row.probe} — first attempt said:`);\n      console.log(`      ${r.firstFail}`);\n    }\n  }\n",
          "after": "  console.log(`\\n${'─'.repeat(64)}`);\n  console.log(`${green.length - broke.length}/${green.length} green probes passed in ${secs(Date.now() - started)} wall clock.`);\n\n  const currentSuccessors = results.filter(r => probeExecutionLabel(r.row) !== r.row.probe);\n  if (currentSuccessors.length) {\n    console.log('CURRENT-SUCCESSOR: ' + currentSuccessors.length + ' roster row(s) selected named current checks; launch refusals count as failed attempts. Preserved historical source was not executed or counted as gameplay acceptance.');\n    for (const r of currentSuccessors) console.log('  ' + probeExecutionLabel(r.row) + ': ' + (passed(r) ? 'current PASS' : 'current FAIL'));\n  }\n\n  if (flaked.length) {\n    console.log(`\\nFLAKY — ${flaked.length} green probe(s) failed then PASSED on a re-run.`\n      + ` Not a build failure, but not nothing: re-run each ~20× to put a rate on it,`\n      + ` then give it an 'excluded'/'flaky' row in balance/proberoster.ts.`);\n    for (const r of flaked) {\n      console.log(`  ${probeExecutionLabel(r.row)} — first attempt said:`);\n      console.log(`      ${r.firstFail}`);\n    }\n  }\n"
        },
        {
          "before": "    console.log(`\\nREGRESSED — ${broke.length} green probe(s) failed`\n      + `${o.retries ? ` every one of ${o.retries + 1} attempts` : ''}:`);\n    for (const r of broke) {\n      console.log(`  ${r.row.probe}${r.timedOut ? ' (TIMEOUT)' : ` (exit ${r.code})`}`);\n      for (const l of failLines(r.output)) console.log(`      ${l}`);\n      console.log(`      re-run: npx tsx balance/${r.row.probe}${r.row.args?.length ? ' ' + r.row.args.join(' ') : ''}`);\n    }\n    process.exit(1);\n  }\n",
          "after": "    console.log(`\\nREGRESSED — ${broke.length} green probe(s) failed`\n      + `${o.retries ? ` every one of ${o.retries + 1} attempts` : ''}:`);\n    for (const r of broke) {\n      console.log(`  ${probeExecutionLabel(r.row)}${r.timedOut ? ' (TIMEOUT)' : ` (exit ${r.code})`}`);\n      for (const l of failLines(r.output)) console.log(`      ${l}`);\n      console.log(`      re-run: ${probeRerunCommand(r.row)}`);\n    }\n    process.exit(1);\n  }\n"
        }
      ]
    },
    {
      "file": ".github/workflows/ci.yml",
      "predecessor": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
      "beforeHash": "c7240120ae40e4092d5789c719fd7932ea58363af3a5fcc368027eab39e2b3e2",
      "afterHash": "08b39b7d7301baaed508e1c67c4cea087a19ef41732c29b0c8ed69b0b1f50f45",
      "crlfLines": [],
      "hunks": [
        {
          "before": "        run: |\n          npx tsx balance/check_nativeverminfall.ts\n          npx tsx balance/check_nativeverminfallarrival.ts\n          npx tsx balance/check_nativeverminfallarrivalboundaries.ts\n          npx tsx balance/check_nativeverminfallcold.ts\n          npx tsx balance/check_nativeverminfallcold.ts --king\n          npx tsx balance/check_nativeverminfallsource.ts\n          npx tsx balance/check_nativeverminfallarrivalsource.ts\n          npx tsx balance/check_nativeframeattendancesourceview.ts\n\n      - name: Development watcher and save-fixture source regressions\n        run: |\n          npx tsx balance/check_devwatchconfig.ts\n",
          "after": "        run: |\n          npx tsx balance/check_nativeverminfall.ts\n          npx tsx balance/check_nativeverminfallarrival.ts\n          npx tsx balance/check_nativeverminfallcrusadeboundaries.ts\n          npx tsx balance/check_nativeverminfallcold.ts\n          npx tsx balance/check_nativeverminfallcold.ts --king\n          npx tsx balance/check_nativeverminfallsource.ts\n          npx tsx balance/check_nativeverminfallarrivalsource.ts\n          npx tsx balance/check_nativeframeattendancesourceview.ts\n\n      - name: Retained Crusade arrival source and current probe dispatch\n        run: |\n          npx tsx balance/check_nativecrusadearrivalsource.ts\n          npx tsx balance/check_probesupersessions.ts\n\n      - name: Development watcher and save-fixture source regressions\n        run: |\n          npx tsx balance/check_devwatchconfig.ts\n"
        }
      ]
    },
    {
      "file": "balance/nativeVerminfallArrivalSourceFixture.ts",
      "predecessor": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
      "beforeHash": "e8bc12b1ee30605b98ce2b1acac57bb222e23818db6850ea0c25655d859f0a43",
      "afterHash": "838501dd5533e0403b12a62e4ac8b7daa3067fda5c49e869afc4681f69a9b7e0",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeCrusadeArrivalSourceFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n"
        }
      ]
    },
    {
      "file": "balance/check_nativeverminfallarrivalsource.ts",
      "predecessor": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
      "beforeHash": "0952f3a1799a0555b2b938c4c8aea0f6c247be643c92618c48d1af859cdd8b9a",
      "afterHash": "59bdf1e5d0d55d636c4db8e9d06ef77a21754096dd85bc409cc83bb75d3b5087",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Mutation, byte identity and filesystem controls for the verminfall arrival source boundary. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n",
          "after": "/** Mutation, byte identity and filesystem controls for the verminfall arrival source boundary. */\nimport assert from 'node:assert/strict';\nimport * as fs from './nativeCrusadeArrivalSourceFS';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n"
        }
      ]
    }
  ],
  "archives": [
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "normalSha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "normalSha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "normalSha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "normalSha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAmalgamationStageArchive.ts",
      "normalSha256": "48528ec62621be10c8fedcd035e32f3fc09b28147201ee5333b1ef5d0ff64f04"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "normalSha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "normalSha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "normalSha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "normalSha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "normalSha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "normalSha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "normalSha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "normalSha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "normalSha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "normalSha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "normalSha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCanvasReleaseArchive.ts",
      "normalSha256": "be35c2be7d3c25a12e0c12e52c1e4f8b0728bc48c3368af67dcc34889393b6e7"
    },
    {
      "file": "balance/nativeCaravanCompositionArchive.ts",
      "normalSha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4"
    },
    {
      "file": "balance/nativeCaravanExtractedReadArchive.ts",
      "normalSha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "normalSha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "normalSha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "normalSha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "normalSha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "normalSha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "normalSha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "normalSha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "normalSha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "normalSha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "normalSha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "normalSha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "normalSha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "normalSha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "normalSha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCompilerPlatformReceiptArchive.ts",
      "normalSha256": "f8d389a09bbcd3438f089bd6d50a333f87d01fc5dac32d31f04f5c1fa40d02a4"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "normalSha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeConclaveCompositionArchive.ts",
      "normalSha256": "48a1c1497986350fb1a5e0552684b5a607964325c0f72be5df9dde5c66d2f6bb"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "normalSha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeConvergenceRepairArchive.ts",
      "normalSha256": "b9b71e137161348e2051aa5069b9c8bba2d7e5d9be84adeda1af15b18ef04598"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "normalSha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeCrusadeTerrainArchive.ts",
      "normalSha256": "f093dfdad3fbdec6eabfb1471b246a52d372b7ec95e36cface0c5497cbe80f16"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "normalSha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDesktopPerfArchive.ts",
      "normalSha256": "2cb79307ec1fb32f4c0598681cec065fc46cda019295375d86ad7b6e4cf12833"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "normalSha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "normalSha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "normalSha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "normalSha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "normalSha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFractureCompositionArchive.ts",
      "normalSha256": "2feba0bba34ebfe31fa6979d4c223b392fdf04d78d548471a0863a4bb68c3eb6"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "normalSha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "normalSha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeFullGateRepairArchive.ts",
      "normalSha256": "f1e63e5a9476c14ff847e21e0800e79ce0a62185e2a5172b167e0671ec81c19d"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "normalSha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "normalSha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "normalSha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "normalSha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "normalSha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "normalSha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "normalSha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "normalSha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHostClosureArchive.ts",
      "normalSha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e"
    },
    {
      "file": "balance/nativeHostPerformanceArchive.ts",
      "normalSha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "normalSha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeHuntMigrationArchive.ts",
      "normalSha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "normalSha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "normalSha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeLegacySourceRepairArchive.ts",
      "normalSha256": "25e8f1034399e80b7174a140b0f8206d8b451f7d084e13a7a41391e31a6d696d"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "normalSha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLoadingResponsivenessArchive.ts",
      "normalSha256": "3417fb2ef0ab8bcdd536b1a45adb448d091b6a5e9f411bfea0ddf60ad356ff90"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "normalSha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "normalSha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "normalSha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "normalSha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainHostCompositionArchive.ts",
      "normalSha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "normalSha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainRosterCancellationArchive.ts",
      "normalSha256": "7ca74e59120fcb55d685c89caed580a00430a195834c1df2d255a64e5baa9726"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "normalSha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeMergeSourceArchive.ts",
      "normalSha256": "5e58ee5acba68c3f1493f53933b957ee766f9c339cb4c6bb4e59748d818ac7eb"
    },
    {
      "file": "balance/nativeNearScaleSelectionArchive.ts",
      "normalSha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "normalSha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "normalSha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "normalSha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "normalSha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "normalSha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "normalSha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "normalSha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "normalSha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRepeatEventArchive.ts",
      "normalSha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8"
    },
    {
      "file": "balance/nativeRescueAnchorArchive.ts",
      "normalSha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "normalSha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "normalSha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeSaveOrderWatchArchive.ts",
      "normalSha256": "5ac2dd2c10684e8323ff3b7787a5f4383ae9894b2c4b67f9b59fd9adc84c70a9"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "normalSha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "normalSha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "normalSha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "normalSha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "normalSha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "normalSha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "normalSha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "normalSha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "normalSha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "normalSha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "normalSha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "normalSha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "normalSha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "normalSha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "normalSha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "normalSha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "normalSha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "normalSha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "normalSha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "normalSha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "normalSha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "normalSha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "normalSha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "normalSha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "normalSha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "normalSha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "normalSha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "normalSha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "normalSha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "normalSha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "normalSha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "normalSha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "normalSha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "normalSha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "normalSha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "normalSha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "normalSha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "normalSha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "normalSha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "normalSha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "normalSha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "normalSha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "normalSha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "normalSha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "normalSha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "normalSha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeSeamlessConsolidationArchive.ts",
      "normalSha256": "cd887e3ff558e684038a23ebbc64d6a436eab6ccccf88bc3a518031ff467ef9d"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "normalSha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeShardFoundationArchive.ts",
      "normalSha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f"
    },
    {
      "file": "balance/nativeShardGroundArchive.ts",
      "normalSha256": "7514fa70975ccbba0f1f1126344dcefa8222e2ad8b662969419af323e1b52cbb"
    },
    {
      "file": "balance/nativeShardKeeperArchive.ts",
      "normalSha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "normalSha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardMusterArchive.ts",
      "normalSha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837"
    },
    {
      "file": "balance/nativeShardProbeDeliveryArchive.ts",
      "normalSha256": "cb71b3250ecd21d7a0cc327583337dbb57a72bb36b304aaf08ab9a5733880b8c"
    },
    {
      "file": "balance/nativeShardPublicationArchive.ts",
      "normalSha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "normalSha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "normalSha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "normalSha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
    },
    {
      "file": "balance/nativeShardsLegacySourceArchive.ts",
      "normalSha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "normalSha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "normalSha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "normalSha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "normalSha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "normalSha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "normalSha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTitanReceiptArchive.ts",
      "normalSha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "normalSha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "normalSha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "normalSha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "normalSha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "normalSha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeVendettaCompositionArchive.ts",
      "normalSha256": "b9dd6eb5354813c5fe9fd02cedc0b9420e6f82b47c9870ff150c9c4080c6dcc6"
    },
    {
      "file": "balance/nativeVerminfallArrivalSourceArchive.ts",
      "normalSha256": "4fa454266fb8684c99cff9fcff473414d614011557dd0dcf933c5ee50cb702b9"
    },
    {
      "file": "balance/nativeVerminfallSourceArchive.ts",
      "normalSha256": "01bcc7a2263e52cb0219affdd74f6b05667f958df289ee6ca309ad03688618ae"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "normalSha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "normalSha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    }
  ],
  "current": [
    {
      "file": ".github/workflows/ci.yml",
      "normalSha256": "08b39b7d7301baaed508e1c67c4cea087a19ef41732c29b0c8ed69b0b1f50f45"
    },
    {
      "file": "balance/check_nativecrusadearrivalboundaries.ts",
      "normalSha256": "366844bf6d068fe7a3809fdd01494e09f91a65d26f4e8bb5cf194694223a195d"
    },
    {
      "file": "balance/check_nativecrusadearrivalsource.ts",
      "normalSha256": "ff00ed4f88690360a09718d5757f1a84bee0c4690d997dc859c303a22be883a0"
    },
    {
      "file": "balance/check_nativeverminfallarrivalsource.ts",
      "normalSha256": "59bdf1e5d0d55d636c4db8e9d06ef77a21754096dd85bc409cc83bb75d3b5087"
    },
    {
      "file": "balance/check_nativeverminfallcrusadeboundaries.ts",
      "normalSha256": "1bc4d34b04f46b62689e5a76e0e3fd724b0ab541fcb109e7deb631898c63fb9f"
    },
    {
      "file": "balance/check_probesupersessions.ts",
      "normalSha256": "6d3dd266b35c61da8acaa68bd31e0a9e7c448a0ce53e34703065636c9b4928d0"
    },
    {
      "file": "balance/nativeCrusadeArrivalSourceFixture.ts",
      "normalSha256": "82ec08107c0fc5b39fdc3e0d2bedc8cc03de8b7278063f5ea2dcc4ac2e189c65"
    },
    {
      "file": "balance/nativeCrusadeArrivalSourceFS.ts",
      "normalSha256": "f6aedb9287d4ada247da962a5e228e7ccdc3eeb9b4ee20e6bc3dba392b00babc"
    },
    {
      "file": "balance/nativeVerminfallArrivalSourceFixture.ts",
      "normalSha256": "838501dd5533e0403b12a62e4ac8b7daa3067fda5c49e869afc4681f69a9b7e0"
    },
    {
      "file": "balance/probesupersessions.ts",
      "normalSha256": "6aae1d35972b882e0ced4806dd34dc78ce599f8e68f508d0eb187046e07899f8"
    },
    {
      "file": "balance/runprobes.ts",
      "normalSha256": "8a43bc358dca715293832c34ea7ef3ffe27ef1f3bee16f5a4ac17dba8b9634c3"
    },
    {
      "file": "docs/worldgen/native-crusade-event-lifetime.md",
      "normalSha256": "439ba0f72e39a16bf8fed8d452f10bfeef4b10734318dd7f62fbfd7daf3603bd"
    },
    {
      "file": "src/engine/nativeCrusadeIdentity.ts",
      "normalSha256": "ae1ccc501248763d571291f52786aebfdad47e80be29b0e34ee3acfc667e18ae"
    },
    {
      "file": "src/engine/nativeSceneRuntimeBirth.ts",
      "normalSha256": "07774c690cbe6cfbc21558a1b07553e215e6fdf81bbe269c6e309aa6f89662da"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCrusadeLifetime.ts",
      "normalSha256": "46fb3788d32498caadd646eab23574861305b318c16aab3a75e88eb9e20285a6"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "normalSha256": "8cc34e0d36713462fdbc3cd17017af9b730936043433f5ab5041027ca6da8b8b"
    }
  ]
};
