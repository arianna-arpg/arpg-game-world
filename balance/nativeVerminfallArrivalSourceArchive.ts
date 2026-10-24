export interface NativeVerminfallArrivalSourceRow {file:string;predecessor:string;beforeHash:string;afterHash:string;crlfLines:readonly number[];hunks:readonly {before:string;after:string}[]}
export const nativeVerminfallArrivalSourceArchive:{parent:string;rows:readonly NativeVerminfallArrivalSourceRow[];archives:readonly {file:string;normalSha256:string}[];current:readonly {file:string;normalSha256:string}[]} = {
  "parent": "172be2a0cb819f5ee8ca0c4b119f92e00a5fc188",
  "rows": [
    {
      "file": "src/worldmass/nativeAreaSceneVerminfallLifetime.ts",
      "predecessor": "172be2a0cb819f5ee8ca0c4b119f92e00a5fc188",
      "beforeHash": "56435a7b129e8d17da4fe157a40dcbe0f7987c9db524e0e94dcf2fbc92ce2af7",
      "afterHash": "0ddea2677d5c57d22cf551bc809ee19625fc6340b21cde9aeb1b98d9a9cbccb0",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {assertNativeCombatOwnerEntry,assertNativeCombatOwnerHooks,type NativeAreaCombatOwnerEntry,type NativeAreaCombatOwnerHooks} from './nativeAreaCombatOperation';\nimport {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';\nimport {nativePopulationFactoryOwner} from './nativeAreaScenePopulation';\nconst liveRegistryCombats=new WeakSet<NativeAreaSceneCombat>();\n/** Read-only recognition of the actual owner-entered synchronous registry scope. */\nexport function nativeVerminfallLiveRegistryActive(combat:NativeAreaSceneCombat):boolean {return liveRegistryCombats.has(combat);}\n",
          "after": "import {assertNativeCombatOwnerEntry,assertNativeCombatOwnerHooks,type NativeAreaCombatOwnerEntry,type NativeAreaCombatOwnerHooks} from './nativeAreaCombatOperation';\nimport {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';\nimport {nativePopulationFactoryOwner} from './nativeAreaScenePopulation';\nimport {claimNativeVerminfallArrival,nativeVerminfallArrivalPending} from './nativeAreaSceneTransitionCoordinator';\nconst liveRegistryCombats=new WeakSet<NativeAreaSceneCombat>();\n/** Read-only recognition of the actual owner-entered synchronous registry scope. */\nexport function nativeVerminfallLiveRegistryActive(combat:NativeAreaSceneCombat):boolean {return liveRegistryCombats.has(combat);}\n"
        },
        {
          "before": "function own<T>(object:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(object,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native Verminfall needs ordinary selected data');return d.value as T;}\nfunction rows(actors:Actor[]):Actor[]{const out:Actor[]=[];for(let i=0,n=own<number>(actors,'length');i<n;i++)out.push(own<Actor>(actors,i));return out;}\ninterface Event {definition:ZoneDef;field:VerminfallField;epoch:object}\ninterface Placement extends Event {initial:boolean;marker:Set<string>;before:boolean;actors:Actor[]}\ninterface Body extends Event {body:Actor;role:NativeVerminfallRole;spent:boolean}\ninterface Kill {row:Body;ctx:KillCtx;committed:boolean;kingCreated:boolean}\nexport class NativeAreaSceneVerminfallLifetime {\n readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #definition:ZoneDef;\n readonly #epoch=nativeVerminfallLifetimeCalls.epoch;readonly #identity=nativeVerminfallLifetimeCalls.identity;readonly #current=nativeVerminfallLifetimeCalls.current;readonly #scope=nativeVerminfallLifetimeCalls.scope;\n readonly #factory=nativePopulationFactoryOwner;\n readonly #spent=new WeakSet<object>();readonly #bodies=new WeakMap<Actor,Body>();\n #placement:Placement|undefined;#kill:Kill|undefined;#liveCheck:(()=>void)|undefined;#busy=false;\n constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,hooks:NativeAreaCombatOwnerHooks){\n  if(!isNativeAreaSceneCombat(combat))throw Error('Native Verminfall needs its actual aggregate');\n  assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);\n",
          "after": "function own<T>(object:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(object,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native Verminfall needs ordinary selected data');return d.value as T;}\nfunction rows(actors:Actor[]):Actor[]{const out:Actor[]=[];for(let i=0,n=own<number>(actors,'length');i<n;i++)out.push(own<Actor>(actors,i));return out;}\ninterface Event {definition:ZoneDef;field:VerminfallField;epoch:object}\ninterface Placement extends Event {initial:boolean;marker:Set<string>;before:boolean;actors:Actor[];logicalId:string}\ninterface Body extends Event {body:Actor;role:NativeVerminfallRole;spent:boolean}\ninterface Kill {row:Body;ctx:KillCtx;committed:boolean;kingCreated:boolean}\nexport class NativeAreaSceneVerminfallLifetime {\n readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #definition:ZoneDef;\n readonly #epoch=nativeVerminfallLifetimeCalls.epoch;readonly #identity=nativeVerminfallLifetimeCalls.identity;readonly #current=nativeVerminfallLifetimeCalls.current;readonly #scope=nativeVerminfallLifetimeCalls.scope;\n readonly #factory=nativePopulationFactoryOwner;\n readonly #arrivals=new WeakSet<object>();readonly #bodies=new WeakMap<Actor,Body>();\n #visitConsumed=false;#placed:{field:VerminfallField;id:string}|undefined;\n #placement:Placement|undefined;#kill:Kill|undefined;#liveCheck:(()=>void)|undefined;#arrivalCheck:(()=>void)|undefined;#busy=false;#arriving=false;\n constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,hooks:NativeAreaCombatOwnerHooks){\n  if(!isNativeAreaSceneCombat(combat))throw Error('Native Verminfall needs its actual aggregate');\n  assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);\n"
        },
        {
          "before": "  }});\n }\n #query(field:VerminfallField,definition:ZoneDef,select:()=>()=>InfestationInfo|null):InfestationInfo|null {\n  const c=this.#combat,census=c.scene.actors,initial=c.input.assembly.phase==='birthing',epoch=Reflect.apply(this.#epoch,field,[definition.id]);\n  const check=()=>{\n   if(c.scene.zone!==definition||definition!==this.#definition||c.scene.actors!==census||c.input.campaign.sim.verminfallField!==field||Reflect.apply(this.#epoch,field,[definition.id])!==epoch)\n    throw Error('Native Verminfall selected query changed');\n   if(initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Verminfall query escaped actual birth');}\n   else{if(!this.#liveCheck)throw Error('Native Verminfall query needs actual live registry');this.#liveCheck();}\n  };\n  check();const run=select();check();const info=run();check();return info;\n }\n",
          "after": "  }});\n }\n #query(field:VerminfallField,definition:ZoneDef,select:()=>()=>InfestationInfo|null):InfestationInfo|null {\n  const c=this.#combat,census=c.scene.actors,initial=c.input.assembly.phase==='birthing',epoch=Reflect.apply(this.#epoch,field,[definition.id]),logicalId=epoch?own<string>(epoch,'id'):undefined;\n  const check=()=>{\n   if(c.scene.zone!==definition||definition!==this.#definition||c.scene.actors!==census||c.input.campaign.sim.verminfallField!==field||Reflect.apply(this.#epoch,field,[definition.id])!==epoch||(epoch&&own<string>(epoch,'id')!==logicalId))\n    throw Error('Native Verminfall selected query changed');\n   if(initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Verminfall query escaped actual birth');}\n   else{const check=this.#arrivalCheck??this.#liveCheck;if(!check)throw Error('Native Verminfall query needs actual live registry or arrival');check();}\n  };\n  check();const run=select();check();const info=run();check();return info;\n }\n"
        },
        {
          "before": " }\n #checkPlacement(row:Placement):void {\n  const c=this.#combat;\n  if(!this.#eventCurrent(row)||c.scene.actors!==row.actors||c.input.assembly.input.registry.input.birth.input.state.materializedInfestation!==row.marker)\n   throw Error('Native Verminfall selected placement changed');\n  if(row.initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Verminfall escaped actual birth');}\n  else{if(!this.#liveCheck)throw Error('Native Verminfall needs actual live registry');this.#liveCheck();}\n }\n #place(field:VerminfallField,definition:ZoneDef,info:InfestationInfo,run:()=>void):void {\n  if(this.#placement)throw Error('Native Verminfall placement cannot reenter');\n  const c=this.#combat,epoch=Reflect.apply(this.#identity,field,[info,definition.id]);\n  if(definition!==this.#definition||!epoch)throw Error('Native Verminfall needs its actual selected infestation');\n  const marker=c.input.assembly.input.registry.input.birth.input.state.materializedInfestation;\n  const row:Placement={field,definition,epoch,initial:c.input.assembly.phase==='birthing',marker,before:Reflect.apply(Set.prototype.has,marker,[definition.id]),actors:c.scene.actors};\n  this.#placement=row;\n  try{\n   this.#checkPlacement(row);\n   const consumed=this.#spent.has(epoch),present=Reflect.apply(Set.prototype.has,marker,[definition.id]);\n   if(consumed!==present){const selected=consumed?marker.add:marker.delete;this.#checkPlacement(row);Reflect.apply(selected,marker,[definition.id]);this.#checkPlacement(row);}\n   row.before=Reflect.apply(Set.prototype.has,marker,[definition.id]);\n   if(consumed)return;\n   Reflect.apply(this.#scope,field,[epoch,definition.id,'discovery',()=>this.#checkPlacement(row),()=>{},run]);\n   this.#checkPlacement(row);\n  }finally{\n   // A completed native add consumes the placement even when a later native call throws.\n   if(!row.before&&Reflect.apply(Set.prototype.has,marker,[definition.id]))this.#spent.add(epoch);\n   this.#placement=undefined;\n  }\n }\n",
          "after": " }\n #checkPlacement(row:Placement):void {\n  const c=this.#combat;\n  if(!this.#eventCurrent(row)||own<string>(row.epoch,'id')!==row.logicalId||c.scene.actors!==row.actors||c.input.assembly.input.registry.input.birth.input.state.materializedInfestation!==row.marker)\n   throw Error('Native Verminfall selected placement changed');\n  if(row.initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Verminfall escaped actual birth');}\n  else{const check=this.#arrivalCheck??this.#liveCheck;if(!check)throw Error('Native Verminfall needs actual live registry or arrival');check();}\n }\n #place(field:VerminfallField,definition:ZoneDef,info:InfestationInfo,run:()=>void):void {\n  if(this.#placement)throw Error('Native Verminfall placement cannot reenter');\n  const c=this.#combat,epoch=Reflect.apply(this.#identity,field,[info,definition.id]);\n  if(definition!==this.#definition||!epoch)throw Error('Native Verminfall needs its actual selected infestation');\n  const marker=c.input.assembly.input.registry.input.birth.input.state.materializedInfestation;\n  const row:Placement={field,definition,epoch,logicalId:own<string>(epoch,'id'),initial:c.input.assembly.phase==='birthing',marker,before:Reflect.apply(Set.prototype.has,marker,[definition.id]),actors:c.scene.actors};\n  this.#placement=row;\n  try{\n   this.#checkPlacement(row);\n   const consumed=this.#visitConsumed,present=Reflect.apply(Set.prototype.has,marker,[definition.id]);\n   // A new field epoch cannot reopen a consumed visit. Repair a removed marker\n   // without authorizing another pour; only actual warm arrival can release it.\n   if(consumed&&!present){const selected=marker.add;this.#checkPlacement(row);Reflect.apply(selected,marker,[definition.id]);this.#checkPlacement(row);}\n   row.before=Reflect.apply(Set.prototype.has,marker,[definition.id]);\n   if(consumed)return;\n   Reflect.apply(this.#scope,field,[epoch,definition.id,'discovery',()=>this.#checkPlacement(row),()=>{},run]);\n   this.#checkPlacement(row);\n  }finally{\n   // A completed native add consumes the placement even when a later native call throws.\n   if(!row.before&&Reflect.apply(Set.prototype.has,marker,[definition.id]))this.#consumePlacement(row);\n   this.#placement=undefined;\n  }\n }\n"
        },
        {
          "before": "  const row=this.#placement;if(!row)throw Error('Native Verminfall marker needs its placement');\n  try{return this.#step(select);}finally{\n   // Observe the native add before later callbacks can delete its marker and throw.\n   // Keep the exact selected error and every completed write; never unspend this epoch.\n   if(!row.before&&Reflect.apply(Set.prototype.has,row.marker,[row.definition.id]))this.#spent.add(row.epoch);\n  }\n }\n #bindBody(event:Event,body:Actor,role:NativeVerminfallRole):Body {\n  if(!Reflect.apply(this.#factory,this.#combat.input.assembly.input.population,[body]))throw Error('Native Verminfall needs actual population construction');\n  if(this.#bodies.has(body))throw Error('Native Verminfall cannot adopt an earlier body');\n",
          "after": "  const row=this.#placement;if(!row)throw Error('Native Verminfall marker needs its placement');\n  try{return this.#step(select);}finally{\n   // Observe the native add before later callbacks can delete its marker and throw.\n   // Keep the exact selected error and every completed write; never replay this visit.\n   if(!row.before&&Reflect.apply(Set.prototype.has,row.marker,[row.definition.id]))this.#consumePlacement(row);\n  }\n }\n #consumePlacement(row:Placement):void {this.#visitConsumed=true;this.#placed={field:row.field,id:row.logicalId};}\n /** A genuine unoccupied return can renew placement, independently of field\n  * object replacement. The private invocation is claimed once; its validator\n  * remains live through every selected callback and is revoked by the owner. */\n arrive():void {\n  if(this.#arriving||this.#busy||this.#placement||this.#kill)throw Error('Native Verminfall arrival cannot reenter');\n  this.#arriving=true;\n  try{\n  const c=this.#combat,validate=claimNativeVerminfallArrival(c.input.coordinator,c,this),selection=validate();\n  if(selection.occupied||this.#arrivals.has(selection.token))return;\n  const scene=c.scene,definition=this.#definition,actors=scene.actors,registry=c.input.assembly.input.registry,birth=registry.input.birth,marker=birth.input.state.materializedInfestation,field=c.input.campaign.sim.verminfallField;\n  const epoch=field?Reflect.apply(this.#epoch,field,[definition.id]):undefined,logicalId=epoch?own<string>(epoch,'id'):undefined,inCave=registry.input.descentState.inCave,special=definition.special;\n  const check=()=>{\n   const current=validate();\n   if(current.token!==selection.token||current.occupied||c.scene!==scene||scene.zone!==definition||scene.actors!==actors||c.input.assembly.input.registry!==registry||registry.input.birth!==birth||birth.input.state.materializedInfestation!==marker||c.input.campaign.sim.verminfallField!==field||registry.input.descentState.inCave!==inCave||definition.special!==special||(field?Reflect.apply(this.#epoch,field,[definition.id]):undefined)!==epoch||(epoch&&own<string>(epoch,'id')!==logicalId))throw Error('Native Verminfall selected arrival changed');\n  };\n  this.#arrivalCheck=()=>this.#entry(this,{permission:'physical',physical:[],sources:[]},check);\n  this.#entry(this,{permission:'physical',physical:[],sources:[]},()=>{\n   check();\n   // Verminfall is neither pocket-native nor an owned-ground runtime row.\n   if(inCave||special){this.#arrivals.add(selection.token);return;}\n   const placed=this.#placed,same=this.#visitConsumed&&placed!==undefined&&field===placed.field&&logicalId!==undefined&&logicalId===placed.id;\n   if(same)this.#arrivals.add(selection.token);\n   else{\n    const selected=marker.delete;check();let failed=false;\n    try{Reflect.apply(selected,marker,[definition.id]);}catch(error){failed=true;throw error;}finally{\n     if(!Reflect.apply(Set.prototype.has,marker,[definition.id])){this.#visitConsumed=false;this.#placed=undefined;this.#arrivals.add(selection.token);}\n     if(failed){try{check();}catch{ /* Preserve the selected error and completed deletion. */ }}else check();\n    }\n    if(Reflect.apply(Set.prototype.has,marker,[definition.id]))throw Error('Native Verminfall arrival guard was not released');\n   }\n   const selected=birth.materializeInfestation;check();Reflect.apply(selected,birth,[definition]);check();\n  });}finally{this.#arrivalCheck=undefined;this.#arriving=false;}\n }\n #bindBody(event:Event,body:Actor,role:NativeVerminfallRole):Body {\n  if(!Reflect.apply(this.#factory,this.#combat.input.assembly.input.population,[body]))throw Error('Native Verminfall needs actual population construction');\n  if(this.#bodies.has(body))throw Error('Native Verminfall cannot adopt an earlier body');\n"
        },
        {
          "before": "  this.#bindBody(row,body,'king');return body;\n }\n materializeLiveZoneEvents():void {\n  if(this.#busy)throw Error('Native Verminfall live registry cannot reenter');\n  const c=this.#combat,scene=c.scene,census=own<Actor[]>(scene,'actors'),physical=rows(census),definition=this.#definition,sim=c.input.campaign.sim,marker=c.input.assembly.input.registry.input.birth.input.state.materializedInfestation;\n  const check=()=>this.#entry(this,{permission:'physical',physical,sources:[]},()=>{\n   if(own(scene,'zone')!==definition||own(scene,'actors')!==census||c.input.campaign.sim!==sim||c.input.assembly.input.registry.input.birth.input.state.materializedInfestation!==marker)\n",
          "after": "  this.#bindBody(row,body,'king');return body;\n }\n materializeLiveZoneEvents():void {\n  if(this.#busy||this.#arriving||nativeVerminfallArrivalPending(this.#combat.input.coordinator,this.#combat,this))throw Error('Native Verminfall live registry cannot reenter');\n  const c=this.#combat,scene=c.scene,census=own<Actor[]>(scene,'actors'),physical=rows(census),definition=this.#definition,sim=c.input.campaign.sim,marker=c.input.assembly.input.registry.input.birth.input.state.materializedInfestation;\n  const check=()=>this.#entry(this,{permission:'physical',physical,sources:[]},()=>{\n   if(own(scene,'zone')!==definition||own(scene,'actors')!==census||c.input.campaign.sim!==sim||c.input.assembly.input.registry.input.birth.input.state.materializedInfestation!==marker)\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "predecessor": "172be2a0cb819f5ee8ca0c4b119f92e00a5fc188",
      "beforeHash": "57e3d97516f4189c28bbf8d7483dca7ff7276c476b5b1765dacfafeeade6b840",
      "afterHash": "0636551ebd903c049d385798fca5723986cb28158927ad56c8420a372ee9aefb",
      "crlfLines": [],
      "hunks": [
        {
          "before": "const actualCoordinators=new WeakSet<object>();\nconst vendettaVisitTokens=new WeakMap<object,object>();\nconst vendettaArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat)=>{token:object;occupied:boolean}>();\n/** Read-only selection of an actual warm arrival; no caller can create a visit. */\nexport function selectedNativeVendettaArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {const select=vendettaArrivals.get(coordinator);if(!select)throw Error('Native Vendetta needs its actual coordinator');return select(combat);}\nconst conclaveSelections=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat)=>boolean>();\n",
          "after": "const actualCoordinators=new WeakSet<object>();\nconst vendettaVisitTokens=new WeakMap<object,object>();\nconst vendettaArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat)=>{token:object;occupied:boolean}>();\nconst verminfallArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime'])=>(()=>{token:object;occupied:boolean})>();\nconst pendingVerminfallArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime'])=>boolean>();\n/** Non-granting refusal while the owner is selecting/validating an arrival. */\nexport function nativeVerminfallArrivalPending(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime']):boolean{return pendingVerminfallArrivals.get(coordinator)?.(combat,owner)??false;}\n/** Claim the owner's currently selected invocation once. The returned validator\n * remains readable by that entered leaf until the coordinator revokes it. */\nexport function claimNativeVerminfallArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime']):()=>{token:object;occupied:boolean} {const claim=verminfallArrivals.get(coordinator);if(!claim)throw Error('Native Verminfall needs its actual arrival coordinator');return claim(combat,owner);}\n/** Read-only selection of an actual warm arrival; no caller can create a visit. */\nexport function selectedNativeVendettaArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {const select=vendettaArrivals.get(coordinator);if(!select)throw Error('Native Vendetta needs its actual coordinator');return select(combat);}\nconst conclaveSelections=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat)=>boolean>();\n"
        },
        {
          "before": "  if(coordinatedWriters.has(characterWriter))throw Error('Native campaign already has a transition coordinator');\n  conclaveSelections.set(this,combat=>this.#selectedConclaveDeparture(combat));\n  vendettaArrivals.set(this,combat=>this.#selectedVendettaArrival(combat));\n  this.input=Object.freeze({campaign,characterWriter,authority,memoryRegistry});Object.defineProperty(this,'input',{writable:false,configurable:false});coordinatedWriters.set(characterWriter,this);actualCoordinators.add(this);Reflect.apply(this.#groundCalls.registryBind,this.input.memoryRegistry,[this]);\n  realmEntryIssuers.set(this,(owner,combat)=>Object.freeze({enter:<T>(key:NativeRealmContextKey,destination:string,action:()=>T):T=>{if(own(combat,\"campaignFrame\")!==owner)throw Error(\"Native realm entry owner changed\");const source=this.#combat(combat),frame=this.#frame;if(!frame?.active||frame.current!==source||this.#realmEntry)throw Error(\"Native realm entry needs its exact current frame\");const value=own<World[NativeRealmContextKey]>(source.combat.campaignOwner.state,key);if(!value)throw Error(\"Native realm entry lost its original context\");const receipt:RealmEntry={frame,source,key,value,destination,prepared:null,definition:null,previous:null,revisit:false,completed:false,wakeCalled:false,consumed:false};this.#realmEntry=receipt;try{return action();}finally{this.#realmEntry=null;}},wake:(action:()=>void):void=>{if(own(combat,\"campaignFrame\")!==owner)throw Error(\"Native realm wake owner changed\");const r=this.#realmEntry;if(!r){action();return;}if(this.#frame!==r.frame||r.frame.current.combat!==combat||!r.consumed||r.wakeCalled||own(combat.campaignOwner.state,r.key)!==(r.completed?null:r.value))throw Error(\"Native realm wake differs from its exact arrival\");r.wakeCalled=true;if(!r.revisit)action();}}));\n  roadQueueIssuers.set(this,(owner,combat)=>{const current=()=>{if(own(combat,'campaignFrame')!==owner)throw Error('Native road queue owner changed');return this.#combat(combat);};return Object.freeze({enableHosted:()=>{current();this.#enableHostedRoads();},enqueue:(ticket:RoadTicket<NativeAreaRoadDestination>)=>this.#enqueueRoad(current(),ticket),drain:()=>{current();return this.#drainRoads();}});});\n",
          "after": "  if(coordinatedWriters.has(characterWriter))throw Error('Native campaign already has a transition coordinator');\n  conclaveSelections.set(this,combat=>this.#selectedConclaveDeparture(combat));\n  vendettaArrivals.set(this,combat=>this.#selectedVendettaArrival(combat));\n  verminfallArrivals.set(this,(combat,owner)=>this.#claimVerminfallArrival(combat,owner));\n  pendingVerminfallArrivals.set(this,(combat,owner)=>{const stage=this.#verminfallArrival;return !!stage&&!stage.entered&&stage.combat===combat&&stage.owner===owner;});\n  this.input=Object.freeze({campaign,characterWriter,authority,memoryRegistry});Object.defineProperty(this,'input',{writable:false,configurable:false});coordinatedWriters.set(characterWriter,this);actualCoordinators.add(this);Reflect.apply(this.#groundCalls.registryBind,this.input.memoryRegistry,[this]);\n  realmEntryIssuers.set(this,(owner,combat)=>Object.freeze({enter:<T>(key:NativeRealmContextKey,destination:string,action:()=>T):T=>{if(own(combat,\"campaignFrame\")!==owner)throw Error(\"Native realm entry owner changed\");const source=this.#combat(combat),frame=this.#frame;if(!frame?.active||frame.current!==source||this.#realmEntry)throw Error(\"Native realm entry needs its exact current frame\");const value=own<World[NativeRealmContextKey]>(source.combat.campaignOwner.state,key);if(!value)throw Error(\"Native realm entry lost its original context\");const receipt:RealmEntry={frame,source,key,value,destination,prepared:null,definition:null,previous:null,revisit:false,completed:false,wakeCalled:false,consumed:false};this.#realmEntry=receipt;try{return action();}finally{this.#realmEntry=null;}},wake:(action:()=>void):void=>{if(own(combat,\"campaignFrame\")!==owner)throw Error(\"Native realm wake owner changed\");const r=this.#realmEntry;if(!r){action();return;}if(this.#frame!==r.frame||r.frame.current.combat!==combat||!r.consumed||r.wakeCalled||own(combat.campaignOwner.state,r.key)!==(r.completed?null:r.value))throw Error(\"Native realm wake differs from its exact arrival\");r.wakeCalled=true;if(!r.revisit)action();}}));\n  roadQueueIssuers.set(this,(owner,combat)=>{const current=()=>{if(own(combat,'campaignFrame')!==owner)throw Error('Native road queue owner changed');return this.#combat(combat);};return Object.freeze({enableHosted:()=>{current();this.#enableHostedRoads();},enqueue:(ticket:RoadTicket<NativeAreaRoadDestination>)=>this.#enqueueRoad(current(),ticket),drain:()=>{current();return this.#drainRoads();}});});\n"
        },
        {
          "before": "  return receipt.definition;\n }\n #warlordArrival:{row:Registered;capture:SeatCapture;seat:Seat;body:Actor;meta:Seat['meta'];definition:World['zone'];arriving:readonly Actor[]}|null=null;\n assertWarlordArrival(combat:NativeAreaSceneCombat):World['zone'] {\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native crown needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native crown arrival lost its actual hand or ground');return r.definition;\n",
          "after": "  return receipt.definition;\n }\n #warlordArrival:{row:Registered;capture:SeatCapture;seat:Seat;body:Actor;meta:Seat['meta'];definition:World['zone'];arriving:readonly Actor[]}|null=null;\n #verminfallArrival:{combat:NativeAreaSceneCombat;owner:NativeAreaSceneCombat['verminfallLifetime'];visit:object|undefined;active:boolean;entered:boolean}|null=null;\n assertWarlordArrival(combat:NativeAreaSceneCombat):World['zone'] {\n  if(this.#verminfallArrival)throw Error('Native arrival leaf is selected for Verminfall');\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native crown needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native crown arrival lost its actual hand or ground');return r.definition;\n"
        },
        {
          "before": "  return presence.seats.some(seat=>target!==arrival||!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n }\n #selectedVendettaArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native Vendetta needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  const presence=this.#presence(r.row),occupied=presence.seats.some(seat=>!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native Vendetta arrival lost its actual hand or ground');let token=vendettaVisitTokens.get(r);if(!token){token=Object.freeze({});vendettaVisitTokens.set(r,token);}return{token,occupied};\n }\n #bountyArrival:{combat:NativeAreaSceneCombat;from:string|undefined}|null=null;\n bountyArrivalFrom(combat:NativeAreaSceneCombat):string|undefined {if(!this.#moving||!this.#frame?.active||this.#frame.current.combat!==combat||this.#bountyArrival?.combat!==combat)throw Error('Native bounty arrival needs its selected genuine revisit');return this.#bountyArrival.from;}\n #delayedArrival:{combat:NativeAreaSceneCombat;kind:'corpse'|'delver'|'merc'|'ascent'|'encounter';capture:SeatCapture;seat:Seat;body:Actor;local:Seat;meta:Seat['meta']}|null=null;\n",
          "after": "  return presence.seats.some(seat=>target!==arrival||!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n }\n #selectedVendettaArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n  if(this.#verminfallArrival)throw Error('Native arrival leaf is selected for Verminfall');\n  return this.#selectedEventArrival(combat);\n }\n #selectedEventArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native Vendetta needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  const presence=this.#presence(r.row),occupied=presence.seats.some(seat=>!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native Vendetta arrival lost its actual hand or ground');let token=vendettaVisitTokens.get(r);if(!token){token=Object.freeze({});vendettaVisitTokens.set(r,token);}return{token,occupied};\n }\n #claimVerminfallArrival(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime']):()=>{token:object;occupied:boolean} {\n  const stage=this.#verminfallArrival;\n  if(!stage||!stage.active||stage.entered||stage.combat!==combat||stage.owner!==owner||own(combat,'verminfallLifetime')!==owner)throw Error('Native Verminfall needs its selected unclaimed arrival invocation');\n  // Reserve entry before selected readiness/physical validation can reenter.\n  stage.entered=true;const initial=this.#selectedEventArrival(combat);if(initial.token!==stage.visit)throw Error('Native Verminfall arrival visit changed');\n  return()=>{\n   if(this.#verminfallArrival!==stage||!stage.active||!stage.entered||own(combat,'verminfallLifetime')!==owner)throw Error('Native Verminfall arrival invocation expired');\n   const current=this.#selectedEventArrival(combat);if(current.token!==stage.visit)throw Error('Native Verminfall arrival visit changed');return current;\n  };\n }\n #invokeVerminfallArrival(combat:NativeAreaSceneCombat):void {\n  if(this.#verminfallArrival)throw Error('Native Verminfall arrival invocation cannot reenter');\n  const owner=own<NativeAreaSceneCombat['verminfallLifetime']>(combat,'verminfallLifetime'),stage={combat,owner,visit:undefined as object|undefined,active:false,entered:false};\n  // Selecting a callable grants no entry. The selecting stage also prevents an\n  // older sibling from borrowing the surrounding global warm-arrival window.\n  this.#verminfallArrival=stage;\n  try{\n   // Close the sibling window before the first selected readiness callback.\n   stage.visit=this.#selectedEventArrival(combat).token;\n   const selected=owner.arrive,current=this.#selectedEventArrival(combat);\n   if(current.token!==stage.visit||own(combat,'verminfallLifetime')!==owner||typeof selected!=='function')throw Error('Native Verminfall selected arrival callable changed');\n   stage.active=true;const result=Reflect.apply(selected,owner,[]);if(nativeBirthAsyncResult(result))throw Error('Native Verminfall arrival must be synchronous');\n   if(!stage.entered)throw Error('Native Verminfall selected arrival did not claim its invocation');\n   if(this.#selectedEventArrival(combat).token!==stage.visit)throw Error('Native Verminfall arrival visit changed');\n  }finally{stage.active=false;this.#verminfallArrival=null;}\n }\n #bountyArrival:{combat:NativeAreaSceneCombat;from:string|undefined}|null=null;\n bountyArrivalFrom(combat:NativeAreaSceneCombat):string|undefined {if(!this.#moving||!this.#frame?.active||this.#frame.current.combat!==combat||this.#bountyArrival?.combat!==combat)throw Error('Native bounty arrival needs its selected genuine revisit');return this.#bountyArrival.from;}\n #delayedArrival:{combat:NativeAreaSceneCombat;kind:'corpse'|'delver'|'merc'|'ascent'|'encounter';capture:SeatCapture;seat:Seat;body:Actor;local:Seat;meta:Seat['meta']}|null=null;\n"
        },
        {
          "before": "   for(const seat of frame.seats){source.roads.depart(seat);destination.roads.arrive(seat,activeRoad?activeRoad.receipt.ticket:{seatId:own<string>(seat,'id'),dest:zoneId,...(!onGraph?{ladder}:{})},from??null);}\n   destination.combat.transitionArrival(cohort);\n   if(!firstBirth){const selectedHarbor=capture.rows.find(row=>row.body===incoming);if(!selectedHarbor)throw Error('Native harbor arrival lost its selected seat');this.#harborArrival={row:destination,capture,seat:selectedHarbor.seat,body:incoming,meta:own(selectedHarbor.seat,'meta'),definition:destScene.zone};try{destination.combat.harborServices.arrive();}finally{this.#harborArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native crown arrival lost its incoming seat');this.#warlordArrival={row:destination,capture,seat:selected.seat,body:incoming,meta:own(selected.seat,'meta'),definition:destScene.zone,arriving:Object.freeze([...cohort])};try{destination.combat.warlordArrival.arrive();destination.combat.vendettaLifetime.arrive();}finally{this.#warlordArrival=null;}}\n   if(!firstBirth){this.#bountyArrival={combat:destination.combat,from};try{destination.combat.arriveBounties();}finally{this.#bountyArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native encounter arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'encounter',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.encounterArrival.arrive();}finally{this.#delayedArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native surface arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'merc',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.surfaceArrival.arriveMerc();}finally{this.#delayedArrival=null;}}\n",
          "after": "   for(const seat of frame.seats){source.roads.depart(seat);destination.roads.arrive(seat,activeRoad?activeRoad.receipt.ticket:{seatId:own<string>(seat,'id'),dest:zoneId,...(!onGraph?{ladder}:{})},from??null);}\n   destination.combat.transitionArrival(cohort);\n   if(!firstBirth){const selectedHarbor=capture.rows.find(row=>row.body===incoming);if(!selectedHarbor)throw Error('Native harbor arrival lost its selected seat');this.#harborArrival={row:destination,capture,seat:selectedHarbor.seat,body:incoming,meta:own(selectedHarbor.seat,'meta'),definition:destScene.zone};try{destination.combat.harborServices.arrive();}finally{this.#harborArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native crown arrival lost its incoming seat');this.#warlordArrival={row:destination,capture,seat:selected.seat,body:incoming,meta:own(selected.seat,'meta'),definition:destScene.zone,arriving:Object.freeze([...cohort])};try{destination.combat.warlordArrival.arrive();this.#invokeVerminfallArrival(destination.combat);destination.combat.vendettaLifetime.arrive();}finally{this.#warlordArrival=null;}}\n   if(!firstBirth){this.#bountyArrival={combat:destination.combat,from};try{destination.combat.arriveBounties();}finally{this.#bountyArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native encounter arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'encounter',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.encounterArrival.arrive();}finally{this.#delayedArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native surface arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'merc',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.surfaceArrival.arriveMerc();}finally{this.#delayedArrival=null;}}\n"
        }
      ]
    },
    {
      "file": "docs/worldgen/native-verminfall-lifetime.md",
      "predecessor": "172be2a0cb819f5ee8ca0c4b119f92e00a5fc188",
      "beforeHash": "9c2eb12823d570bb93fb67e89bdb94e53b749a826adab1897505e29947f619f8",
      "afterHash": "154a3e92512b70262a8c92621e48794029a943038063bff8e522193a96c811e3",
      "crlfLines": [],
      "hunks": [
        {
          "before": "# Retained Verminfall event lifetime\n\nA completed infestation can naturally return to farmland that is already retained.\nPreviously the zone's once-only materialization marker survived the first event:\nthe successor claimed the field and increased town pressure, but created no nests.\nThe preserved seed-1211 reproduction reached a natural second event requiring two\nnests; ordinary World created two and the retained area created none.\n\nThe retained owner now associates placement and event bodies with the actual\nissuing infestation object. Same-event visits retain bodies, wounds and completed\nplacement. A successor reconciles only its infestation marker and receives one\nnative placement. Surviving vermin, unrelated bodies and other package markers\nremain. Remote occupancy does not turn an old event's bodies into a new event's\nnest or king. The ordinary unbound World path keeps its original calls.\n\nThe owner captures the actual overlay's projection and mutation helpers, actual\ncombat entry/hooks, and population construction receipt. Selected query, field,\nfactory and insertion operations are checked before selection, before invocation\nand after invocation. A successful factory result must have been constructed by\nthat invocation; an earlier unused body is insufficient. A copied package tag\ncannot authorize an unbound retained body's event payout.\n\nCompleted native effects survive exceptions. A successful marker add consumes\nplacement at the marker operation itself, even if a later selected factory deletes\nthe marker and throws. Any nest already inserted and admitted stays present; the\nnext live pass cannot replay the consumed placement. A nest death and completed field decrement\nremain when king spawning throws; warm visits do not retry that consumed birth.\nIf the selected spawn inserts and admits a king but throws before returning, that\npartial body remains without fabricated event ownership. A later copied king tag\ncannot clear the armed event. A genuine king clear may finish its original\nreward/notice after ending its own epoch, once only. An active field mutation\nscope cannot be replaced by a nested public scope: a selected resolver that\nreplaces the event retains that completed replacement but cannot advance its\nsuccessor through the old body's kill.\n\nThe historical direct Crusade live-registry entry still composes through the\nactual Verminfall owner. A private synchronous recognition scope prevents a\nsecond registry invocation and does not grant authority to method getters or\nreentrant callers. No caller-supplied readiness flag is accepted.\n\n## Persistence and verification\n\nNo save schema is added. Warm returns preserve resident bodies. Actual disk\nSave/Continue reconstructs the durable remaining nest count or armed king through\nnative cold birth, with fresh body health and the existing discovery ledger.\nTransient event bodies remain subject to the existing serialization rules.\n\nStandalone courses are kept outside the sealed historical probe roster:\n\n- check_nativeverminfall.ts: original/retained natural first and successor events,\n  warm wounds, actual package XP and normalized minted reward payload comparison.\n- check_nativeverminfallboundaries.ts: selected callbacks, stale bodies, partial\n  writes, actual remote Seat occupancy/roads, registry composition and reentry.\n- check_nativeverminfallcold.ts: isolated launcher disk saves and fresh-process\n  original/retained Continue for remaining nests and an armed king.\n- check_nativeverminfallsource.ts: finite exact predecessor reads, byte equality,\n  mutation/descriptor controls and unchanged archive inventory.\n\nThe natural comparison passes first and successor events, with 540 package XP\nand three identical normalized memory rewards per king in both lanes. All 33\nboundary cases are preserved, with additive checks for marker deletion after a\nreal partial birth and attempted nested-scope replacement during a genuine nest\nkill. Actual isolated disk Continue passes for two remaining\nnests and for an armed king in both original and retained fresh processes. Each\nchild loads the exact persisted account and starts from identical frozen account\nand character bytes. Expected cold bodies and fresh health are asserted before\nan explicit live-registry recheck, which must preserve their exact identities.\n\nAll four type-check lanes pass. These courses use disclosed fixture shortcuts: skipped prologue, staged level/invulnerability,\ndirect native travel/kills and wounds, isolated overlay clock, and explicit\ncallback replacement only in fault cases. Remote occupancy uses real Seat and\nroad owners; it is not a TCP/browser multiplayer acceptance course. Package reward\ncomparison fixes only the package row RNG and excludes item UID/drop position.\nNo full-content, private-instance, capacity or performance acceptance follows.\n\n## Performance boundary\n\nThe lifetime wrapper currently adds a raw actor-descriptor copy and physical\nownership entries to each live-registry pass. The pass runs once per retained\narea per completed simulation frame, including areas with no occupants. Before\nthe existing Crusade work, the wrapper makes four ownership entries; a present\nVerminfall field adds three query checks, and a consumed active event adds one\nplacement check. Each ownership entry includes validation on exit as well.\n\nThis is additional work on an already over-budget retained runtime. The counts\nare source observations, not measured timing. Reducing duplicate checks requires\nproof that the intervening reads cannot invoke selected code; no census result\nmay survive a callback or replace the current raw physical validation. The joint\nperformance lane is reviewing that composition separately. This parity change\nestablishes no speed improvement or frame-budget acceptance.\n",
          "after": "# Retained Verminfall event lifetime\n\nA completed infestation can naturally return to farmland that is already retained.\nThe first repair made successor bodies appear on that ground, but its per-event\nmarker reconciliation also allowed another pour during the same visit. Ordinary\nplay keeps its materialization guard until the next zone visit. A paired check on\n172be2a0 demonstrated the difference: after genuine nest/king kills and natural\nsame-zone reignition, one actual frame created zero new nests/discovery in ordinary\nplay and two nests plus one discovery in retained play. Both lanes used the same\nfirst and second events and the same bounded isolated field-clock steps.\n\n## Visit and event ownership\n\nPlacement is consumed for the current visit. A changed event cannot reopen that\nconsumed guard while a player stays, while a remote peer remains, or while the\narea is empty. A genuine warm arrival may renew placement only when no actual\nphysical seat outside the arriving cohort occupies the destination. Downed hands\nstill occupy it. The coordinator validates the moving frame, actual registered\narea, seat, body, metadata and physical membership; publication or a fabricated\noccupancy flag is insufficient.\n\nThe coordinator selects the Verminfall arrival callable before issuing its private\ninvocation. The lifetime claims that invocation once and can validate it repeatedly\nthrough the synchronous call. Reentry and sibling calls cannot borrow the stage;\nreturn, throw and an asynchronous result revoke it before later arrival hooks.\nThe new call follows the existing Warlord arrival and precedes Vendetta. The\nrelative hook order is preserved; this is not a claim of complete ordinary-load\nRNG equivalence.\n\nA continuing event retains its bodies, wounds and consumed marker. Existing\nlogical infestation IDs distinguish a successor from a same-ID row reconstructed\nby restore on the same field. Captured field/row objects still authenticate each\nselected operation; matching IDs do not grant body or mutation authority. A\nchanged or absent event on a genuine unoccupied arrival releases only this\npackage's marker and invokes its native materializer synchronously. If no event\nexists, a later first eligible claim follows the existing unconsumed-marker path.\nFirst births in previously unconsumed empty resident areas remain separate\npre-existing behavior; this change does not establish an empty-area policy.\n\nSurviving vermin, unrelated bodies and other package markers remain. Nest and king\noperations stay attached to their genuine issuing event and construction. The\nordinary unbound World path keeps its original calls. No save schema is added.\n\n## Selected operations and partial failures\n\nThe owner captures the actual overlay helpers, combat entry/hooks and population\nconstruction receipts. Query, field, factory and insertion operations validate\nbefore selection, before invocation and after invocation. Queries retain their\nnative position before the materialization guard. A factory result must have\nbeen constructed by that invocation; an earlier unused body or copied package\ntag cannot authorize an event payout.\n\nCompleted native effects survive exceptions. A marker deletion that completes\nbefore throwing stays deleted and leaves that visit eligible for a later native\nattempt. A marker add consumes placement at the add boundary even when a later\nfactory deletes it and throws. Inserted/admitted partial bodies remain; a later\nlive pass cannot replay their consumed placement. The first selected exception\nis preserved, the arrival capability expires, and subsequent arrival hooks do\nnot run after an unhandled failure.\n\nNest death and a completed field decrement remain if king spawning throws.\nWarm visits do not fabricate a missing king after that consumed birth. If the\nselected spawn inserts and admits a body but throws before returning, that body\nstays without invented king ownership. A genuine king clear may finish its\noriginal reward/notice after ending its own event, once only. Nested public scopes\ncannot redirect an old body's mutation into a replacement event.\n\nThe historical direct Crusade live-registry entry still composes once through\nthe actual Verminfall owner. A private synchronous recognition scope prevents a\nsecond registry invocation. This preserves the earlier marker replay and nested\nkill corrections while changing when a successor placement is eligible.\n\n## Verification and explicit test supersession\n\nThe original `check_nativeverminfallboundaries.ts` source and its 35-case result\nremain historical evidence. Two expectations in it were incorrect for visit\nparity: a remote occupant received a successor without leaving, and the active\ndirect-Crusade case required another nest cohort during that visit. Its standalone\nCI invocation is superseded by `check_nativeverminfallarrivalboundaries.ts`:\n25 trigger-independent cases, eight placement faults staged at genuine warm\narrivals, two corrected timing expectations, and eleven additional arrival\ncontrols. The sealed probe roster and older source archives remain unchanged.\n\n`check_nativeverminfallarrival.ts` covers visit timing against current gameplay;\n`check_nativeverminfall.ts` retains the ordinary/retained natural successor and\nreward comparison. Both cold modes in `check_nativeverminfallcold.ts` use isolated\nlauncher disk saves and fresh-process ordinary/retained Continue for remaining\nnests and an armed king. The current arrival-source checker preserves exact\npredecessor reads for older source proofs; those projections are never used as\ncurrent gameplay acceptance.\n\nEarlier 172be2a0 diagnostic and bc62b9a5 natural, 35-boundary and cold results\nremain evidence for their exact sources; they do not override the demonstrated\nsame-visit regression. Verify the successor against the paired visit and complete\n46-case courses, current source composition, all four type lanes, affected\nretained travel/arrival and host checks, fresh cold courses and explicit hosted\nCI entries before promotion.\n\nFixtures disclose skipped prologue, staged level/invulnerability, direct native\ntravel/kills/wounds, isolated field-clock advancement where used, and selected\ncallback replacement in fault cases. Actual local Seat/road occupancy is distinct\nfrom TCP/browser/dormancy acceptance. Package reward comparisons fix only their\npackage-row RNG and normalize item IDs/drop positions. Direct restore replacement\nis a fault seam; stale-body policy differences there are not asserted to be\nnormal live gameplay. Full content parity, migration and capacity remain open.\n\n## Performance boundary\n\nThe lifetime wrapper adds an actor-descriptor copy and physical ownership entries\nto each live-registry pass. Each resident area runs that pass per completed\nsimulation frame, including empty areas. Before existing Crusade work, the wrapper\nhas four ownership entries; a present field adds three query checks and a consumed\nactive event adds one placement check. Entry and exit both validate. The arrival\ncorrection adds validation at the travel boundary and does not introduce a per-frame\ncensus cache or remove callback checks.\n\nThese are source counts, not measured savings. A separate bulk-descriptor walk\ncandidate passed 25 equivalence cases but was about 1.75-1.83 times slower at all\nfour clean census sizes in its paired microbenchmark and was rejected. That result\nneither accepts a different shortcut nor establishes game performance. Any future\nreduction must preserve selected-callback invalidation, first-error order and\ncurrent physical ownership, and pass a calibrated comparison on the actual host.\n"
        }
      ]
    },
    {
      "file": ".github/workflows/ci.yml",
      "predecessor": "172be2a0cb819f5ee8ca0c4b119f92e00a5fc188",
      "beforeHash": "c5cbe16d5b57cb1ffa8b5508ec86e641590d4b38b89ec1c9a5c0bcc9b7dacaf5",
      "afterHash": "c7240120ae40e4092d5789c719fd7932ea58363af3a5fcc368027eab39e2b3e2",
      "crlfLines": [],
      "hunks": [
        {
          "before": "      - name: Retained Verminfall event lifetime regressions\n        run: |\n          npx tsx balance/check_nativeverminfall.ts\n          npx tsx balance/check_nativeverminfallboundaries.ts\n          npx tsx balance/check_nativeverminfallcold.ts\n          npx tsx balance/check_nativeverminfallcold.ts --king\n          npx tsx balance/check_nativeverminfallsource.ts\n          npx tsx balance/check_nativeframeattendancesourceview.ts\n\n      - name: Development watcher and save-fixture source regressions\n",
          "after": "      - name: Retained Verminfall event lifetime regressions\n        run: |\n          npx tsx balance/check_nativeverminfall.ts\n          npx tsx balance/check_nativeverminfallarrival.ts\n          npx tsx balance/check_nativeverminfallarrivalboundaries.ts\n          npx tsx balance/check_nativeverminfallcold.ts\n          npx tsx balance/check_nativeverminfallcold.ts --king\n          npx tsx balance/check_nativeverminfallsource.ts\n          npx tsx balance/check_nativeverminfallarrivalsource.ts\n          npx tsx balance/check_nativeframeattendancesourceview.ts\n\n      - name: Development watcher and save-fixture source regressions\n"
        }
      ]
    },
    {
      "file": "balance/nativeSaveOrderWatchFixture.ts",
      "predecessor": "172be2a0cb819f5ee8ca0c4b119f92e00a5fc188",
      "beforeHash": "e1ecef5303113551623e9ade34693808b3dc61328f0af821a842f8950b0d243b",
      "afterHash": "d73d7ffa551627850e67b957b082d721eb08c062c7c66979e0b538971d3394c4",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeVerminfallArrivalSourceFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n"
        }
      ]
    },
    {
      "file": "balance/check_nativesaveorderwatchsource.ts",
      "predecessor": "172be2a0cb819f5ee8ca0c4b119f92e00a5fc188",
      "beforeHash": "b07a7595feca96eaff63adeb195f997076d34c15bd22aee2e5c17f0bbda4cc36",
      "afterHash": "be90523c1c4f1e6752b8c7c2e3fc4e8824220c5c6dcfe641a8800ce648e4a0be",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Mutation, byte identity and filesystem controls for the save order watcher source boundary. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n",
          "after": "/** Mutation, byte identity and filesystem controls for the save order watcher source boundary. */\nimport assert from 'node:assert/strict';\nimport * as fs from './nativeVerminfallArrivalSourceFS';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n"
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
      "normalSha256": "c7240120ae40e4092d5789c719fd7932ea58363af3a5fcc368027eab39e2b3e2"
    },
    {
      "file": "balance/check_nativesaveorderwatchsource.ts",
      "normalSha256": "be90523c1c4f1e6752b8c7c2e3fc4e8824220c5c6dcfe641a8800ce648e4a0be"
    },
    {
      "file": "balance/check_nativeverminfallarrival.ts",
      "normalSha256": "ef2dfe78ed0a8b836447939efbcc49be1d06010075d0309485cd00034f5212f9"
    },
    {
      "file": "balance/check_nativeverminfallarrivalboundaries.ts",
      "normalSha256": "4faf35deb829625f89c2f6fd7cd07d303f780892fc0d7d45f51ebfaa815060fe"
    },
    {
      "file": "balance/check_nativeverminfallarrivalsource.ts",
      "normalSha256": "0952f3a1799a0555b2b938c4c8aea0f6c247be643c92618c48d1af859cdd8b9a"
    },
    {
      "file": "balance/nativeSaveOrderWatchFixture.ts",
      "normalSha256": "d73d7ffa551627850e67b957b082d721eb08c062c7c66979e0b538971d3394c4"
    },
    {
      "file": "balance/nativeVerminfallArrivalSourceFixture.ts",
      "normalSha256": "e8bc12b1ee30605b98ce2b1acac57bb222e23818db6850ea0c25655d859f0a43"
    },
    {
      "file": "balance/nativeVerminfallArrivalSourceFS.ts",
      "normalSha256": "917fd22af338cfa05744354f13a8a3892da3d4c8b8ad1c8c96f9d932fb7c87ac"
    },
    {
      "file": "docs/worldgen/native-verminfall-lifetime.md",
      "normalSha256": "154a3e92512b70262a8c92621e48794029a943038063bff8e522193a96c811e3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "normalSha256": "0636551ebd903c049d385798fca5723986cb28158927ad56c8420a372ee9aefb"
    },
    {
      "file": "src/worldmass/nativeAreaSceneVerminfallLifetime.ts",
      "normalSha256": "0ddea2677d5c57d22cf551bc809ee19625fc6340b21cde9aeb1b98d9a9cbccb0"
    }
  ]
};
