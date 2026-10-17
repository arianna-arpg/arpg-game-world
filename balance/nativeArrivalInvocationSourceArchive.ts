export interface NativeArrivalInvocationSourceRow {file:string;predecessor:string;beforeHash:string;afterHash:string;crlfLines:readonly number[];hunks:readonly {before:string;after:string}[]}
export const nativeArrivalInvocationSourceArchive:{parent:string;rows:readonly NativeArrivalInvocationSourceRow[];archives:readonly {file:string;normalSha256:string}[];current:readonly {file:string;normalSha256:string}[]} = {
  "parent": "37fbfb25edb8013470457fb2d0278bfce92d5db4",
  "rows": [
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "predecessor": "37fbfb25edb8013470457fb2d0278bfce92d5db4",
      "beforeHash": "8cc34e0d36713462fdbc3cd17017af9b730936043433f5ab5041027ca6da8b8b",
      "afterHash": "e27428ac1130686c5a6ca6e83d01191d707c4d58c293c595368dc3bad367f098",
      "crlfLines": [],
      "hunks": [
        {
          "before": "const actualCoordinators=new WeakSet<object>();\nconst vendettaVisitTokens=new WeakMap<object,object>();\nconst vendettaArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat)=>{token:object;occupied:boolean}>();\ntype EventArrivalKey='crusadeLifetime'|'verminfallLifetime';\ntype EventArrivalOwner=NativeAreaSceneCombat[EventArrivalKey];\ninterface EventArrivalStage {key:EventArrivalKey;combat:NativeAreaSceneCombat;owner:EventArrivalOwner;visit:object|undefined;active:boolean;entered:boolean}\nconst crusadeArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime'])=>(()=>{token:object;occupied:boolean})>();\nconst pendingCrusadeArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime'])=>boolean>();\n/** Non-granting refusal during either private event-leaf selection/invocation. */\nexport function nativeCrusadeArrivalPending(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime']):boolean{return pendingCrusadeArrivals.get(coordinator)?.(combat,owner)??false;}\n/** Only the exact selected Crusade leaf may claim the private invocation once. */\nexport function claimNativeCrusadeArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime']):()=>{token:object;occupied:boolean} {const claim=crusadeArrivals.get(coordinator);if(!claim)throw Error('Native Crusade needs its actual arrival coordinator');return claim(combat,owner);}\n",
          "after": "const actualCoordinators=new WeakSet<object>();\nconst vendettaVisitTokens=new WeakMap<object,object>();\nconst vendettaArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat)=>{token:object;occupied:boolean}>();\ntype EventArrivalKey='warlordArrival'|'crusadeLifetime'|'verminfallLifetime'|'vendettaLifetime';\nfunction eventArrivalName(key:EventArrivalKey):string {return key==='warlordArrival'?'Warlord':key==='crusadeLifetime'?'Crusade':key==='verminfallLifetime'?'Verminfall':'Vendetta';}\ntype EventArrivalOwner=NativeAreaSceneCombat[EventArrivalKey];\ninterface EventArrivalStage {key:EventArrivalKey;combat:NativeAreaSceneCombat;owner:EventArrivalOwner;visit:object|undefined;active:boolean;entered:boolean}\nconst warlordArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['warlordArrival'])=>(()=>World['zone'])>();\n/** Only the exact selected crown owner may claim its private invocation once. */\nexport function claimNativeWarlordArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['warlordArrival']):()=>World['zone'] {const claim=warlordArrivals.get(coordinator);if(!claim)throw Error('Native crown needs its actual arrival coordinator');return claim(combat,owner);}\nconst vendettaInvocations=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['vendettaLifetime'])=>(()=>{token:object;occupied:boolean})>();\n/** A read-only visit token is not this exact selected owner's entry claim. */\nexport function claimNativeVendettaArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['vendettaLifetime']):()=>{token:object;occupied:boolean} {const claim=vendettaInvocations.get(coordinator);if(!claim)throw Error('Native Vendetta needs its actual arrival coordinator');return claim(combat,owner);}\nconst crusadeArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime'])=>(()=>{token:object;occupied:boolean})>();\nconst pendingCrusadeArrivals=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime'])=>boolean>();\n/** Non-granting refusal during any private warm-arrival selection/invocation. */\nexport function nativeCrusadeArrivalPending(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime']):boolean{return pendingCrusadeArrivals.get(coordinator)?.(combat,owner)??false;}\n/** Only the exact selected Crusade leaf may claim the private invocation once. */\nexport function claimNativeCrusadeArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['crusadeLifetime']):()=>{token:object;occupied:boolean} {const claim=crusadeArrivals.get(coordinator);if(!claim)throw Error('Native Crusade needs its actual arrival coordinator');return claim(combat,owner);}\n"
        },
        {
          "before": "/** Claim the owner's currently selected invocation once. The returned validator\n * remains readable by that entered leaf until the coordinator revokes it. */\nexport function claimNativeVerminfallArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime']):()=>{token:object;occupied:boolean} {const claim=verminfallArrivals.get(coordinator);if(!claim)throw Error('Native Verminfall needs its actual arrival coordinator');return claim(combat,owner);}\n/** Read-only selection of an actual warm arrival; no caller can create a visit. */\nexport function selectedNativeVendettaArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {const select=vendettaArrivals.get(coordinator);if(!select)throw Error('Native Vendetta needs its actual coordinator');return select(combat);}\nconst conclaveSelections=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat)=>boolean>();\n/** Non-granting inspection of a currently selected real coordinator departure. */\n",
          "after": "/** Claim the owner's currently selected invocation once. The returned validator\n * remains readable by that entered leaf until the coordinator revokes it. */\nexport function claimNativeVerminfallArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['verminfallLifetime']):()=>{token:object;occupied:boolean} {const claim=verminfallArrivals.get(coordinator);if(!claim)throw Error('Native Verminfall needs its actual arrival coordinator');return claim(combat,owner);}\n/** Read-only inspection inside the entered Vendetta stage; no entry is granted. */\nexport function selectedNativeVendettaArrival(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {const select=vendettaArrivals.get(coordinator);if(!select)throw Error('Native Vendetta needs its actual coordinator');return select(combat);}\nconst conclaveSelections=new WeakMap<NativeAreaSceneTransitionCoordinator,(combat:NativeAreaSceneCombat)=>boolean>();\n/** Non-granting inspection of a currently selected real coordinator departure. */\n"
        },
        {
          "before": "  if(coordinatedWriters.has(characterWriter))throw Error('Native campaign already has a transition coordinator');\n  conclaveSelections.set(this,combat=>this.#selectedConclaveDeparture(combat));\n  vendettaArrivals.set(this,combat=>this.#selectedVendettaArrival(combat));\n  crusadeArrivals.set(this,(combat,owner)=>this.#claimEventArrival('crusadeLifetime',combat,owner));\n  verminfallArrivals.set(this,(combat,owner)=>this.#claimEventArrival('verminfallLifetime',combat,owner));\n  pendingCrusadeArrivals.set(this,(combat,owner)=>!!this.#eventArrival&&this.#eventArrival.combat===combat&&own(combat,'crusadeLifetime')===owner);\n",
          "after": "  if(coordinatedWriters.has(characterWriter))throw Error('Native campaign already has a transition coordinator');\n  conclaveSelections.set(this,combat=>this.#selectedConclaveDeparture(combat));\n  vendettaArrivals.set(this,combat=>this.#selectedVendettaArrival(combat));\n  warlordArrivals.set(this,(combat,owner)=>this.#claimWarlordArrival(combat,owner));\n  vendettaInvocations.set(this,(combat,owner)=>this.#claimEventArrival('vendettaLifetime',combat,owner));\n  crusadeArrivals.set(this,(combat,owner)=>this.#claimEventArrival('crusadeLifetime',combat,owner));\n  verminfallArrivals.set(this,(combat,owner)=>this.#claimEventArrival('verminfallLifetime',combat,owner));\n  pendingCrusadeArrivals.set(this,(combat,owner)=>!!this.#eventArrival&&this.#eventArrival.combat===combat&&own(combat,'crusadeLifetime')===owner);\n"
        },
        {
          "before": " }\n #warlordArrival:{row:Registered;capture:SeatCapture;seat:Seat;body:Actor;meta:Seat['meta'];definition:World['zone'];arriving:readonly Actor[]}|null=null;\n #eventArrival:EventArrivalStage|null=null;\n assertWarlordArrival(combat:NativeAreaSceneCombat):World['zone'] {\n  if(this.#eventArrival)throw Error('Native arrival leaf is selected for '+(this.#eventArrival.key==='crusadeLifetime'?'Crusade':'Verminfall'));\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native crown needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native crown arrival lost its actual hand or ground');return r.definition;\n }\n /** The new arrival cohort has not occupied this fight; every other physical seat does, including downed hands. */\n warlordOccupied(arrival:NativeAreaSceneCombat,target:NativeAreaSceneCombat):boolean {\n",
          "after": " }\n #warlordArrival:{row:Registered;capture:SeatCapture;seat:Seat;body:Actor;meta:Seat['meta'];definition:World['zone'];arriving:readonly Actor[]}|null=null;\n #eventArrival:EventArrivalStage|null=null;\n #arrivalVisit(receipt:object):object {let token=vendettaVisitTokens.get(receipt);if(!token){token=Object.freeze({});vendettaVisitTokens.set(receipt,token);}return token;}\n #enteredOlderArrival(key:'warlordArrival'|'vendettaLifetime',combat:NativeAreaSceneCombat):void {\n  const stage=this.#eventArrival,label=key==='warlordArrival'?'Native crown':'Native Vendetta';\n  if(!stage)throw Error(label+' needs its selected genuine revisit');\n  if(stage.key!==key)throw Error('Native arrival leaf is selected for '+eventArrivalName(stage.key));\n  if(!stage.active||!stage.entered||stage.combat!==combat||own(combat,key)!==stage.owner)throw Error(label+' needs its entered arrival invocation');\n }\n assertWarlordArrival(combat:NativeAreaSceneCombat):World['zone'] {this.#enteredOlderArrival('warlordArrival',combat);return this.#selectedWarlordArrival(combat).definition;}\n #selectedWarlordArrival(combat:NativeAreaSceneCombat):{token:object;definition:World['zone']} {\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native crown needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native crown arrival lost its actual hand or ground');return{token:this.#arrivalVisit(r),definition:r.definition};\n }\n /** The new arrival cohort has not occupied this fight; every other physical seat does, including downed hands. */\n warlordOccupied(arrival:NativeAreaSceneCombat,target:NativeAreaSceneCombat):boolean {\n"
        },
        {
          "before": "  return presence.seats.some(seat=>target!==arrival||!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n }\n #selectedVendettaArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n  if(this.#eventArrival)throw Error('Native arrival leaf is selected for '+(this.#eventArrival.key==='crusadeLifetime'?'Crusade':'Verminfall'));\n  return this.#selectedEventArrival(combat);\n }\n #selectedEventArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native Vendetta needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  const presence=this.#presence(r.row),occupied=presence.seats.some(seat=>!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native Vendetta arrival lost its actual hand or ground');let token=vendettaVisitTokens.get(r);if(!token){token=Object.freeze({});vendettaVisitTokens.set(r,token);}return{token,occupied};\n }\n #claimEventArrival(key:EventArrivalKey,combat:NativeAreaSceneCombat,owner:EventArrivalOwner):()=>{token:object;occupied:boolean} {\n  const stage=this.#eventArrival,label=key==='crusadeLifetime'?'Native Crusade':'Native Verminfall';\n  if(!stage||!stage.active||stage.entered||stage.key!==key||stage.combat!==combat||stage.owner!==owner||own(combat,key)!==owner)throw Error(label+' needs its selected unclaimed arrival invocation');\n  // Reserve entry before selected readiness/physical validation can reenter.\n  stage.entered=true;const initial=this.#selectedEventArrival(combat);if(initial.token!==stage.visit)throw Error(label+' arrival visit changed');\n  return()=>{\n   if(this.#eventArrival!==stage||!stage.active||!stage.entered||own(combat,key)!==owner)throw Error(label+' arrival invocation expired');\n   const current=this.#selectedEventArrival(combat);if(current.token!==stage.visit)throw Error(label+' arrival visit changed');return current;\n  };\n }\n #invokeEventArrival(key:EventArrivalKey,combat:NativeAreaSceneCombat):void {\n  const label=key==='crusadeLifetime'?'Native Crusade':'Native Verminfall';if(this.#eventArrival)throw Error(label+' arrival invocation cannot reenter');\n  const owner=own<EventArrivalOwner>(combat,key),stage:EventArrivalStage={key,combat,owner,visit:undefined,active:false,entered:false};\n  // Selection grants no entry. Both event leaves and the older siblings refuse\n  // borrowing this stage, before the first selected readiness callback.\n  this.#eventArrival=stage;\n  try{\n   stage.visit=this.#selectedEventArrival(combat).token;\n   const selected=owner.arrive,current=this.#selectedEventArrival(combat);\n   if(current.token!==stage.visit||own(combat,key)!==owner||typeof selected!=='function')throw Error(label+' selected arrival callable changed');\n   stage.active=true;const result=Reflect.apply(selected,owner,[]);if(nativeBirthAsyncResult(result))throw Error(label+' arrival must be synchronous');\n   if(!stage.entered)throw Error(label+' selected arrival did not claim its invocation');\n   if(this.#selectedEventArrival(combat).token!==stage.visit)throw Error(label+' arrival visit changed');\n  }finally{stage.active=false;this.#eventArrival=null;}\n }\n #bountyArrival:{combat:NativeAreaSceneCombat;from:string|undefined}|null=null;\n",
          "after": "  return presence.seats.some(seat=>target!==arrival||!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n }\n #selectedVendettaArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n  this.#enteredOlderArrival('vendettaLifetime',combat);return this.#selectedEventArrival(combat);\n }\n #selectedEventArrival(combat:NativeAreaSceneCombat):{token:object;occupied:boolean} {\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native Vendetta needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  const presence=this.#presence(r.row),occupied=presence.seats.some(seat=>!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native Vendetta arrival lost its actual hand or ground');return{token:this.#arrivalVisit(r),occupied};\n }\n #reserveArrival(key:EventArrivalKey,combat:NativeAreaSceneCombat,owner:EventArrivalOwner):EventArrivalStage {\n  const stage=this.#eventArrival,label='Native '+eventArrivalName(key);\n  if(key==='warlordArrival'||key==='vendettaLifetime'){\n   if(!stage)throw Error((key==='warlordArrival'?'Native crown':'Native Vendetta')+' needs its selected genuine revisit');\n   if(stage.key!==key)throw Error('Native arrival leaf is selected for '+eventArrivalName(stage.key));\n  }\n  if(!stage||!stage.active||stage.entered||stage.key!==key||stage.combat!==combat||stage.owner!==owner||own(combat,key)!==owner)throw Error(label+' needs its selected unclaimed arrival invocation');\n  // Reserve entry before selected readiness/physical validation can reenter.\n  stage.entered=true;return stage;\n }\n #claimWarlordArrival(combat:NativeAreaSceneCombat,owner:NativeAreaSceneCombat['warlordArrival']):()=>World['zone'] {\n  const stage=this.#reserveArrival('warlordArrival',combat,owner),initial=this.#selectedWarlordArrival(combat);\n  if(initial.token!==stage.visit)throw Error('Native crown arrival visit changed');\n  return()=>{\n   if(this.#eventArrival!==stage||!stage.active||!stage.entered||own(combat,'warlordArrival')!==owner)throw Error('Native crown arrival invocation expired');\n   const current=this.#selectedWarlordArrival(combat);if(current.token!==stage.visit)throw Error('Native crown arrival visit changed');return current.definition;\n  };\n }\n #claimEventArrival(key:Exclude<EventArrivalKey,'warlordArrival'>,combat:NativeAreaSceneCombat,owner:EventArrivalOwner):()=>{token:object;occupied:boolean} {\n  const stage=this.#reserveArrival(key,combat,owner),label='Native '+eventArrivalName(key),initial=this.#selectedEventArrival(combat);if(initial.token!==stage.visit)throw Error(label+' arrival visit changed');\n  return()=>{\n   if(this.#eventArrival!==stage||!stage.active||!stage.entered||own(combat,key)!==owner)throw Error(label+' arrival invocation expired');\n   const current=this.#selectedEventArrival(combat);if(current.token!==stage.visit)throw Error(label+' arrival visit changed');return current;\n  };\n }\n #selectedArrivalVisit(key:EventArrivalKey,combat:NativeAreaSceneCombat):object {return key==='warlordArrival'?this.#selectedWarlordArrival(combat).token:this.#selectedEventArrival(combat).token;}\n #invokeEventArrival(key:EventArrivalKey,combat:NativeAreaSceneCombat):void {\n  const label='Native '+eventArrivalName(key);if(this.#eventArrival)throw Error(label+' arrival invocation cannot reenter');\n  const owner=own<EventArrivalOwner>(combat,key),stage:EventArrivalStage={key,combat,owner,visit:undefined,active:false,entered:false};\n  // Selection grants no entry. Every sibling and both live registry seams\n  // refuse borrowing this stage, through the final post-return validation.\n  this.#eventArrival=stage;\n  try{\n   stage.visit=this.#selectedArrivalVisit(key,combat);\n   const selected=owner.arrive,current=this.#selectedArrivalVisit(key,combat);\n   if(current!==stage.visit||own(combat,key)!==owner||typeof selected!=='function')throw Error(label+' selected arrival callable changed');\n   stage.active=true;const result=Reflect.apply(selected,owner,[]);if(nativeBirthAsyncResult(result))throw Error(label+' arrival must be synchronous');\n   if(!stage.entered)throw Error(label+' selected arrival did not claim its invocation');\n   if(this.#selectedArrivalVisit(key,combat)!==stage.visit)throw Error(label+' arrival visit changed');\n  }finally{stage.active=false;this.#eventArrival=null;}\n }\n #bountyArrival:{combat:NativeAreaSceneCombat;from:string|undefined}|null=null;\n"
        },
        {
          "before": "   for(const seat of frame.seats){source.roads.depart(seat);destination.roads.arrive(seat,activeRoad?activeRoad.receipt.ticket:{seatId:own<string>(seat,'id'),dest:zoneId,...(!onGraph?{ladder}:{})},from??null);}\n   destination.combat.transitionArrival(cohort);\n   if(!firstBirth){const selectedHarbor=capture.rows.find(row=>row.body===incoming);if(!selectedHarbor)throw Error('Native harbor arrival lost its selected seat');this.#harborArrival={row:destination,capture,seat:selectedHarbor.seat,body:incoming,meta:own(selectedHarbor.seat,'meta'),definition:destScene.zone};try{destination.combat.harborServices.arrive();}finally{this.#harborArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native crown arrival lost its incoming seat');this.#warlordArrival={row:destination,capture,seat:selected.seat,body:incoming,meta:own(selected.seat,'meta'),definition:destScene.zone,arriving:Object.freeze([...cohort])};try{destination.combat.warlordArrival.arrive();this.#invokeEventArrival('crusadeLifetime',destination.combat);this.#invokeEventArrival('verminfallLifetime',destination.combat);destination.combat.vendettaLifetime.arrive();}finally{this.#warlordArrival=null;}}\n   if(!firstBirth){this.#bountyArrival={combat:destination.combat,from};try{destination.combat.arriveBounties();}finally{this.#bountyArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native encounter arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'encounter',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.encounterArrival.arrive();}finally{this.#delayedArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native surface arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'merc',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.surfaceArrival.arriveMerc();}finally{this.#delayedArrival=null;}}\n",
          "after": "   for(const seat of frame.seats){source.roads.depart(seat);destination.roads.arrive(seat,activeRoad?activeRoad.receipt.ticket:{seatId:own<string>(seat,'id'),dest:zoneId,...(!onGraph?{ladder}:{})},from??null);}\n   destination.combat.transitionArrival(cohort);\n   if(!firstBirth){const selectedHarbor=capture.rows.find(row=>row.body===incoming);if(!selectedHarbor)throw Error('Native harbor arrival lost its selected seat');this.#harborArrival={row:destination,capture,seat:selectedHarbor.seat,body:incoming,meta:own(selectedHarbor.seat,'meta'),definition:destScene.zone};try{destination.combat.harborServices.arrive();}finally{this.#harborArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native crown arrival lost its incoming seat');this.#warlordArrival={row:destination,capture,seat:selected.seat,body:incoming,meta:own(selected.seat,'meta'),definition:destScene.zone,arriving:Object.freeze([...cohort])};try{this.#invokeEventArrival('warlordArrival',destination.combat);this.#invokeEventArrival('crusadeLifetime',destination.combat);this.#invokeEventArrival('verminfallLifetime',destination.combat);this.#invokeEventArrival('vendettaLifetime',destination.combat);}finally{this.#warlordArrival=null;}}\n   if(!firstBirth){this.#bountyArrival={combat:destination.combat,from};try{destination.combat.arriveBounties();}finally{this.#bountyArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native encounter arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'encounter',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.encounterArrival.arrive();}finally{this.#delayedArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native surface arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'merc',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.surfaceArrival.arriveMerc();}finally{this.#delayedArrival=null;}}\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneWarlordArrival.ts",
      "predecessor": "37fbfb25edb8013470457fb2d0278bfce92d5db4",
      "beforeHash": "90342a2fffb4d45a22fc79deecaca3cbffdf76085b473fe3767e5eb9b83f374f",
      "afterHash": "3f668e97f1b8c7a253544713cecfee27aae06330b35214be6c5285247487d2a5",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';\nimport {NativeAreaScenePopulation} from './nativeAreaScenePopulation';\nimport {NativeAreaActorAuthority} from './nativeAreaActorAuthority';\nimport {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';\nconst registrations=new WeakMap<object,NativeWarlordRegistration>();\ninstallNativeWarlordRegistration(token=>{const r=registrations.get(token);if(!r)throw Error('Native crown needs its private one-use registration');registrations.delete(token);return r;});\nfunction bind(r:NativeWarlordRegistration):void {const token=Object.freeze({});registrations.set(token,r);bindNativeWarlordIdentity(token);}\n",
          "after": "import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';\nimport {NativeAreaScenePopulation} from './nativeAreaScenePopulation';\nimport {NativeAreaActorAuthority} from './nativeAreaActorAuthority';\nimport {NativeAreaSceneTransitionCoordinator,claimNativeWarlordArrival} from './nativeAreaSceneTransitionCoordinator';\nconst registrations=new WeakMap<object,NativeWarlordRegistration>();\ninstallNativeWarlordRegistration(token=>{const r=registrations.get(token);if(!r)throw Error('Native crown needs its private one-use registration');registrations.delete(token);return r;});\nfunction bind(r:NativeWarlordRegistration):void {const token=Object.freeze({});registrations.set(token,r);bindNativeWarlordIdentity(token);}\n"
        },
        {
          "before": "export class NativeAreaSceneWarlordArrival {\n readonly host:NativeWarlordHost;\n readonly #crownOf=WarlordField.prototype.crownOf;readonly #withCrownKill=WarlordField.prototype.withCrownKill;readonly #factoryOwner=NativeAreaScenePopulation.prototype.factoryOwnerOf;\n readonly #seatsFor:NativeAreaSceneTransitionCoordinator['seatsFor'];readonly #selected:NativeAreaSceneTransitionCoordinator['assertWarlordArrival'];readonly #occupiedQuery:NativeAreaSceneTransitionCoordinator['warlordOccupied'];\n readonly #bindingFor=NativeAreaActorAuthority.prototype.bindingFor;readonly #finalPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical;readonly #unclaimed=NativeAreaActorAuthority.prototype.assertUnclaimed;\n readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #physical:NativeWarlordHost&NativeSceneCombatMotionHost;readonly #campaign:Campaign;\n #placement:Placement|undefined;#arriving:ZoneDef|undefined;#busy=false;\n constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,hooks:NativeAreaCombatOwnerHooks,physical:NativeWarlordHost&NativeSceneCombatMotionHost){\n  if(!isNativeAreaSceneCombat(combat))throw Error('Native crown needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);this.#combat=combat;this.#entry=entry;this.#hooks=hooks;this.#physical=physical;\n  this.#seatsFor=NativeAreaSceneTransitionCoordinator.prototype.seatsFor;this.#selected=NativeAreaSceneTransitionCoordinator.prototype.assertWarlordArrival;this.#occupiedQuery=NativeAreaSceneTransitionCoordinator.prototype.warlordOccupied;\n  let campaign=campaigns.get(combat.input.coordinator);if(!campaign){campaign={bodies:new Set(),crowns:new Map(),consumed:new WeakSet()};campaigns.set(combat.input.coordinator,campaign);}this.#campaign=campaign;\n  const host=Object.create(combat.input.assembly.host) as NativeWarlordHost;\n  for(const key of ['sim','actors'] as const)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#arrival();const value=Reflect.get(physical,key);this.#arrival();return value;}});\n",
          "after": "export class NativeAreaSceneWarlordArrival {\n readonly host:NativeWarlordHost;\n readonly #crownOf=WarlordField.prototype.crownOf;readonly #withCrownKill=WarlordField.prototype.withCrownKill;readonly #factoryOwner=NativeAreaScenePopulation.prototype.factoryOwnerOf;\n readonly #seatsFor:NativeAreaSceneTransitionCoordinator['seatsFor'];readonly #occupiedQuery:NativeAreaSceneTransitionCoordinator['warlordOccupied'];\n readonly #bindingFor=NativeAreaActorAuthority.prototype.bindingFor;readonly #finalPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical;readonly #unclaimed=NativeAreaActorAuthority.prototype.assertUnclaimed;\n readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #physical:NativeWarlordHost&NativeSceneCombatMotionHost;readonly #campaign:Campaign;\n #placement:Placement|undefined;#arriving:ZoneDef|undefined;#arrivalCheck:(()=>ZoneDef)|undefined;#entering=false;#busy=false;\n constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,hooks:NativeAreaCombatOwnerHooks,physical:NativeWarlordHost&NativeSceneCombatMotionHost){\n  if(!isNativeAreaSceneCombat(combat))throw Error('Native crown needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);this.#combat=combat;this.#entry=entry;this.#hooks=hooks;this.#physical=physical;\n  this.#seatsFor=NativeAreaSceneTransitionCoordinator.prototype.seatsFor;this.#occupiedQuery=NativeAreaSceneTransitionCoordinator.prototype.warlordOccupied;\n  let campaign=campaigns.get(combat.input.coordinator);if(!campaign){campaign={bodies:new Set(),crowns:new Map(),consumed:new WeakSet()};campaigns.set(combat.input.coordinator,campaign);}this.#campaign=campaign;\n  const host=Object.create(combat.input.assembly.host) as NativeWarlordHost;\n  for(const key of ['sim','actors'] as const)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#arrival();const value=Reflect.get(physical,key);this.#arrival();return value;}});\n"
        },
        {
          "before": "  const observer=(initial:boolean):NativeWarlordObserver=>({place:(lord,run)=>this.#place(initial,lord,run),create:run=>this.#create(run),beforePush:(actors,body)=>this.#beforePush(actors,body),push:body=>this.#push(body)});\n  bind({host:combat.input.assembly.host,observer:observer(true)});bind({host:this.host,observer:observer(false)});\n }\n #arrival():ZoneDef {const def=this.#arriving;if(!def||Reflect.apply(this.#selected,this.#combat.input.coordinator,[this.#combat])!==def||this.#combat.scene.zone!==def)throw Error('Native crown needs its unchanged arrival definition');return def;}\n #check(p:Placement):void {\n  const combat=this.#combat;if(this.#placement!==p||combat.scene.zone!==p.definition)throw Error('Native crown placement changed');\n  if(p.initial){if(combat.input.assembly.phase!=='birthing')throw Error('Native crown initial placement escaped actual birth');}else this.#arrival();\n",
          "after": "  const observer=(initial:boolean):NativeWarlordObserver=>({place:(lord,run)=>this.#place(initial,lord,run),create:run=>this.#create(run),beforePush:(actors,body)=>this.#beforePush(actors,body),push:body=>this.#push(body)});\n  bind({host:combat.input.assembly.host,observer:observer(true)});bind({host:this.host,observer:observer(false)});\n }\n #arrival():ZoneDef {const def=this.#arriving,check=this.#arrivalCheck;if(!def||!check||check()!==def||this.#combat.scene.zone!==def)throw Error('Native crown needs its unchanged arrival definition');return def;}\n #check(p:Placement):void {\n  const combat=this.#combat;if(this.#placement!==p||combat.scene.zone!==p.definition)throw Error('Native crown placement changed');\n  if(p.initial){if(combat.input.assembly.phase!=='birthing')throw Error('Native crown initial placement escaped actual birth');}else this.#arrival();\n"
        },
        {
          "before": "  row.state='spent';this.#campaign.consumed.add(row.crown);this.#forget(row);return Reflect.apply(this.#withCrownKill,field,[row.lord,row.crown,()=>Reflect.apply(fn,field,[faction,time,view])]);\n }\n arrive():void {\n  if(this.#arriving||this.#busy)throw Error('Native crown arrival cannot reenter');const def=Reflect.apply(this.#selected,this.#combat.input.coordinator,[this.#combat]);this.#arriving=def;\n  try{this.#entry(this,{permission:'physical'},()=>{this.#arrival();birthNativeWarlord(this.host,def,def.objective,this.#combat.scene.player);});}finally{this.#arriving=undefined;}\n }\n}\n\n",
          "after": "  row.state='spent';this.#campaign.consumed.add(row.crown);this.#forget(row);return Reflect.apply(this.#withCrownKill,field,[row.lord,row.crown,()=>Reflect.apply(fn,field,[faction,time,view])]);\n }\n arrive():void {\n  if(this.#entering||this.#arriving||this.#busy)throw Error('Native crown arrival cannot reenter');this.#entering=true;\n  try{\n   const check=claimNativeWarlordArrival(this.#combat.input.coordinator,this.#combat,this);this.#arrivalCheck=check;\n   const def=check();this.#arriving=def;\n   this.#entry(this,{permission:'physical'},()=>{this.#arrival();birthNativeWarlord(this.host,def,def.objective,this.#combat.scene.player);});\n  }finally{this.#arrivalCheck=undefined;this.#arriving=undefined;this.#entering=false;}\n }\n}\n\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneVendettaLifetime.ts",
      "predecessor": "37fbfb25edb8013470457fb2d0278bfce92d5db4",
      "beforeHash": "de2150fb64026323ea3dd42493051f2c976f7c4ea1082d30210f71db02c1d50a",
      "afterHash": "c64201baf88b3d21204ae40a23fc65a184c664ea62d6ee2a3fa6415852e9830c",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';\nimport {nativePopulationFactoryOwner} from './nativeAreaScenePopulation';\nimport {nativeReadyAuthority,nativeUnclaimedActor} from './nativeAreaActorAuthority';\nimport {selectedNativeVendettaArrival} from './nativeAreaSceneTransitionCoordinator';\nconst registrations=new WeakMap<object,NativeVendettaRegistration>();\n/** Consumes only a private one-use token issued by the actual owner below. */\nexport function consumeNativeVendettaRegistration(token:object):NativeVendettaRegistration {const r=registrations.get(token);if(!r)throw Error('Native Vendetta needs its private actual-owner registration');registrations.delete(token);return r;}\n",
          "after": "import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';\nimport {nativePopulationFactoryOwner} from './nativeAreaScenePopulation';\nimport {nativeReadyAuthority,nativeUnclaimedActor} from './nativeAreaActorAuthority';\nimport {claimNativeVendettaArrival} from './nativeAreaSceneTransitionCoordinator';\nconst registrations=new WeakMap<object,NativeVendettaRegistration>();\n/** Consumes only a private one-use token issued by the actual owner below. */\nexport function consumeNativeVendettaRegistration(token:object):NativeVendettaRegistration {const r=registrations.get(token);if(!r)throw Error('Native Vendetta needs its private actual-owner registration');registrations.delete(token);return r;}\n"
        },
        {
          "before": "interface Placement {field:VendettaField;definition:ZoneDef;id:string;actors:Actor[];marker:Set<string>;initial:boolean;cohort:Cohort}\nexport class NativeAreaSceneVendettaLifetime {\n readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #definition:ZoneDef;\n readonly #visits=new WeakSet<object>();readonly #cohorts:Cohort[]=[];#active:Placement|undefined;\n constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry){\n  if(!isNativeAreaSceneCombat(combat))throw Error('Native Vendetta needs its actual combat owner');assertNativeCombatOwnerEntry(combat,entry);this.#combat=combat;this.#entry=entry;this.#definition=combat.scene.zone;\n  const token=Object.freeze({});registrations.set(token,{host:combat.input.assembly.input.registry.input.birth.host,place:(field,definition,spec,run)=>this.#place(field,definition,spec,run),create:select=>this.#create(select)});bindNativeVendettaIdentity(token);\n",
          "after": "interface Placement {field:VendettaField;definition:ZoneDef;id:string;actors:Actor[];marker:Set<string>;initial:boolean;cohort:Cohort}\nexport class NativeAreaSceneVendettaLifetime {\n readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #definition:ZoneDef;\n readonly #visits=new WeakSet<object>();readonly #cohorts:Cohort[]=[];#active:Placement|undefined;#arriving=false;\n constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry){\n  if(!isNativeAreaSceneCombat(combat))throw Error('Native Vendetta needs its actual combat owner');assertNativeCombatOwnerEntry(combat,entry);this.#combat=combat;this.#entry=entry;this.#definition=combat.scene.zone;\n  const token=Object.freeze({});registrations.set(token,{host:combat.input.assembly.input.registry.input.birth.host,place:(field,definition,spec,run)=>this.#place(field,definition,spec,run),create:select=>this.#create(select)});bindNativeVendettaIdentity(token);\n"
        },
        {
          "before": " /** Only an actual unoccupied warm return starts a new visit. Field rolls,\n  * cooldown writes and native partial births still occur in their original order. */\n arrive():void {\n  const c=this.#combat,selection=selectedNativeVendettaArrival(c.input.coordinator,c);if(selection.occupied||this.#visits.has(selection.token))return;\n  const scene=c.scene,definition=this.#definition,actors=scene.actors,birth=c.input.assembly.input.registry.input.birth,marker=birth.input.state.materializedWrits,field=c.input.campaign.sim.vendettaField;\n  const check=()=>{const current=selectedNativeVendettaArrival(c.input.coordinator,c);if(current.token!==selection.token||current.occupied||c.scene!==scene||scene.zone!==definition||scene.actors!==actors||birth.input.state.materializedWrits!==marker||c.input.campaign.sim.vendettaField!==field)throw Error('Native Vendetta selected arrival changed');};\n  this.#entry(this,{permission:'physical',physical:[],sources:[]},()=>{\n   check();this.#prune(actors);const selectedDelete=marker.delete;check();let failed=false;\n   try{Reflect.apply(selectedDelete,marker,[definition.id]);}catch(error){failed=true;throw error;}finally{if(!Reflect.apply(has,marker,[definition.id]))this.#visits.add(selection.token);if(failed){try{check();}catch{ /* Preserve the native callback error and completed marker effect. */ }}else check();}\n   if(Reflect.apply(has,marker,[definition.id]))throw Error('Native Vendetta selected guard was not released');\n   const selected=birth.springVendettaAmbush;check();Reflect.apply(selected,birth,[definition]);check();\n  });\n }\n}\n",
          "after": " /** Only an actual unoccupied warm return starts a new visit. Field rolls,\n  * cooldown writes and native partial births still occur in their original order. */\n arrive():void {\n  if(this.#arriving||this.#active)throw Error('Native Vendetta arrival cannot reenter');this.#arriving=true;\n  try{\n   const c=this.#combat,validate=claimNativeVendettaArrival(c.input.coordinator,c,this),selection=validate();if(selection.occupied||this.#visits.has(selection.token))return;\n   const scene=c.scene,definition=this.#definition,actors=scene.actors,birth=c.input.assembly.input.registry.input.birth,marker=birth.input.state.materializedWrits,field=c.input.campaign.sim.vendettaField;\n   const check=()=>{const current=validate();if(current.token!==selection.token||current.occupied||c.scene!==scene||scene.zone!==definition||scene.actors!==actors||birth.input.state.materializedWrits!==marker||c.input.campaign.sim.vendettaField!==field)throw Error('Native Vendetta selected arrival changed');};\n   this.#entry(this,{permission:'physical',physical:[],sources:[]},()=>{\n    check();this.#prune(actors);const selectedDelete=marker.delete;check();let failed=false;\n    try{Reflect.apply(selectedDelete,marker,[definition.id]);}catch(error){failed=true;throw error;}finally{if(!Reflect.apply(has,marker,[definition.id]))this.#visits.add(selection.token);if(failed){try{check();}catch{ /* Preserve the native callback error and completed marker effect. */ }}else check();}\n    if(Reflect.apply(has,marker,[definition.id]))throw Error('Native Vendetta selected guard was not released');\n    const selected=birth.springVendettaAmbush;check();Reflect.apply(selected,birth,[definition]);check();\n   });\n  }finally{this.#arriving=false;}\n }\n}\n"
        }
      ]
    },
    {
      "file": "balance/probesupersessions.ts",
      "predecessor": "37fbfb25edb8013470457fb2d0278bfce92d5db4",
      "beforeHash": "6aae1d35972b882e0ced4806dd34dc78ce599f8e68f508d0eb187046e07899f8",
      "afterHash": "2369299ed60804babc5b9fa1386c1764271dbccc5fdb60e6b9e5313c29428411",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Explicit current-runtime replacements for preserved historical contracts.\n * The sealed roster and original probe bytes are still checked. Neither a\n * source check nor a predecessor replay counts as current gameplay execution. */\nimport assert from 'node:assert/strict';\nimport {createHash} from 'node:crypto';\nimport {readFileSync} from 'node:fs';\nimport path from 'node:path';\nimport type {ProbeRow} from './proberoster';\n\n/** Committed one-to-one migration evidence. The exact current-source digest below\n * binds this ordered entry map to the reviewed source; runtime supervisors compare\n",
          "after": "/** Explicit current-runtime replacements for preserved historical contracts.\n * The exact superseded row and original probe bytes are still checked. Neither a\n * source check nor a predecessor replay counts as current gameplay execution. */\nimport assert from 'node:assert/strict';\nimport {createHash} from 'node:crypto';\nimport {readFileSync} from 'node:fs';\nimport path from 'node:path';\nimport type {ProbeRow} from './proberoster';\nimport {CRUSADE_HISTORICAL_SOURCE_SEAL,CRUSADE_CURRENT_ASSERTION_SUPERSESSION} from './probesupersessioncontracts';\nexport {VERMINFALL_CRUSADE_CI_SUPERSESSION} from './probesupersessioncontracts';\n\n/** Committed one-to-one migration evidence. The exact current-source digest below\n * binds this ordered entry map to the reviewed source; runtime supervisors compare\n"
        },
        {
          "before": " Object.freeze({\"historicalIndex\":3,\"historicalName\":\"expired event commander keeps ordinary kill rewards only\",\"disposition\":\"unchanged course body\",\"currentIndex\":3,\"currentCase\":\"expired event commander keeps ordinary kill rewards only\",\"rationale\":\"Retain the original course body and every assertion; this instance needs no timing change.\"}),\n Object.freeze({\"historicalIndex\":4,\"historicalName\":\"live older event commander can suppress only its own campaign\",\"disposition\":\"explicit timing supersession\",\"currentIndex\":4,\"currentCase\":\"live older event commander suppresses only its campaign while successor muster waits\",\"rationale\":\"Pre-kill discovery remains 1, replacing 2. Exact older issuing-event power nick, successor power, modifier attribution, event ledger and ordinary XP assertions retained.\"}),\n Object.freeze({\"historicalIndex\":5,\"historicalName\":\"query-throw\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":5,\"currentCase\":\"arrival query-throw\",\"rationale\":\"Fault installed after transfer; original exact exception and receiver assertions preserved.\"}),\n Object.freeze({\"historicalIndex\":6,\"historicalName\":\"query-remove-body\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":6,\"currentCase\":\"arrival query-remove-body\",\"rationale\":\"Actual incoming hand removed from selected census, refusal asserted and hand restored before transition completes.\"}),\n Object.freeze({\"historicalIndex\":7,\"historicalName\":\"query-replace-marker\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":7,\"currentCase\":\"arrival query-replace-marker\",\"rationale\":\"Captured marker replaced by selected query; original receiver and unchanged old guard assertions retained.\"}),\n Object.freeze({\"historicalIndex\":8,\"historicalName\":\"query-reenter\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":8,\"currentCase\":\"arrival query-reenter\",\"rationale\":\"Selected query attempts actual live entry; new arrival guard must refuse it.\"}),\n Object.freeze({\"historicalIndex\":9,\"historicalName\":\"delete-getter-replace\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":9,\"currentCase\":\"arrival delete-getter-replace\",\"rationale\":\"Selected getter swaps marker; returned callable must remain uncalled.\"}),\n Object.freeze({\"historicalIndex\":10,\"historicalName\":\"delete-partial\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":10,\"currentCase\":\"arrival delete-partial\",\"rationale\":\"Immediate exact deletion and sentinel retained. Retry only after actual transition completes, requiring discovery 2.\"}),\n Object.freeze({\"historicalIndex\":11,\"historicalName\":\"add-partial\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":11,\"currentCase\":\"arrival add-partial\",\"rationale\":\"Immediate exact add and sentinel retained. Idle retry still requires discovery 1 and no replay.\"}),\n Object.freeze({\"historicalIndex\":12,\"historicalName\":\"notice-partial\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":12,\"currentCase\":\"arrival notice-partial\",\"rationale\":\"Immediate exact discovery and full body census retained; idle retry compares the same current census identity and exact bodies.\"}),\n",
          "after": " Object.freeze({\"historicalIndex\":3,\"historicalName\":\"expired event commander keeps ordinary kill rewards only\",\"disposition\":\"unchanged course body\",\"currentIndex\":3,\"currentCase\":\"expired event commander keeps ordinary kill rewards only\",\"rationale\":\"Retain the original course body and every assertion; this instance needs no timing change.\"}),\n Object.freeze({\"historicalIndex\":4,\"historicalName\":\"live older event commander can suppress only its own campaign\",\"disposition\":\"explicit timing supersession\",\"currentIndex\":4,\"currentCase\":\"live older event commander suppresses only its campaign while successor muster waits\",\"rationale\":\"Pre-kill discovery remains 1, replacing 2. Exact older issuing-event power nick, successor power, modifier attribution, event ledger and ordinary XP assertions retained.\"}),\n Object.freeze({\"historicalIndex\":5,\"historicalName\":\"query-throw\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":5,\"currentCase\":\"arrival query-throw\",\"rationale\":\"Fault installed after transfer; original exact exception and receiver assertions preserved.\"}),\n Object.freeze({\"historicalIndex\":6,\"historicalName\":\"query-remove-body\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":6,\"currentCase\":\"arrival query-remove-body\",\"rationale\":\"Actual incoming hand removed from selected census; current refusal is the observed exact Error/Stale native final physical actor, then hand restored. Prior33 used a broader regex; explicit33-to33 map records this strengthening.\"}),\n Object.freeze({\"historicalIndex\":7,\"historicalName\":\"query-replace-marker\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":7,\"currentCase\":\"arrival query-replace-marker\",\"rationale\":\"Captured marker replaced by selected query; original receiver and unchanged old guard assertions retained, with observed exact Error/Native Crusade selected arrival changed replacing the prior33 broader regex.\"}),\n Object.freeze({\"historicalIndex\":8,\"historicalName\":\"query-reenter\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":8,\"currentCase\":\"arrival query-reenter\",\"rationale\":\"Selected query attempts actual live entry; observed exact Error/Native Crusade live registry cannot reenter replaces the prior33 broader regex.\"}),\n Object.freeze({\"historicalIndex\":9,\"historicalName\":\"delete-getter-replace\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":9,\"currentCase\":\"arrival delete-getter-replace\",\"rationale\":\"Selected getter swaps marker; returned callable remains uncalled, with observed exact Error/Native Crusade selected arrival changed replacing the prior33 broader regex.\"}),\n Object.freeze({\"historicalIndex\":10,\"historicalName\":\"delete-partial\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":10,\"currentCase\":\"arrival delete-partial\",\"rationale\":\"Immediate exact deletion and sentinel retained. Retry only after actual transition completes, requiring discovery 2.\"}),\n Object.freeze({\"historicalIndex\":11,\"historicalName\":\"add-partial\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":11,\"currentCase\":\"arrival add-partial\",\"rationale\":\"Immediate exact add and sentinel retained. Idle retry still requires discovery 1 and no replay.\"}),\n Object.freeze({\"historicalIndex\":12,\"historicalName\":\"notice-partial\",\"disposition\":\"same fault relocated to selected genuine arrival\",\"currentIndex\":12,\"currentCase\":\"arrival notice-partial\",\"rationale\":\"Immediate exact discovery and full body census retained; idle retry compares the same current census identity and exact bodies.\"}),\n"
        },
        {
          "before": " historicalCases:CRUSADE_ARRIVAL_HISTORICAL_CASES,\n currentCases:CRUSADE_ARRIVAL_CURRENT_CASES,\n historicalProbe:'probe_nativecrusadeepochboundaries.ts',\n currentCheck:'check_nativecrusadearrivalboundaries.ts',\n predecessor:'82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6',\n historicalLfSha256:'4c3a892667d2d4625db2a55080d129ffae4e167c115ebc6723fcfc10652a45ea',\n rosterLfSha256:'63700ea35d9b3726ceef55aa297ac4b40b718ca871e9f53ed543e698b0aa56ed',\n currentLfSha256:'366844bf6d068fe7a3809fdd01494e09f91a65d26f4e8bb5cf194694223a195d',\n expectedWhy:'Reviewed repeat-event gate, garrison and commander ownership; original assertions preserved.',\n reason:'Visit timing supersedes two historical expectations and relocates eight selected faults; all 13 original instances map to 33 current assertions.',\n});\nexport interface ProbeExecution {\n readonly file:string;\n",
          "after": " historicalCases:CRUSADE_ARRIVAL_HISTORICAL_CASES,\n currentCases:CRUSADE_ARRIVAL_CURRENT_CASES,\n historicalProbe:'probe_nativecrusadeepochboundaries.ts',\n currentCheck:CRUSADE_CURRENT_ASSERTION_SUPERSESSION.currentCheck,\n predecessor:'82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6',\n historicalLfSha256:CRUSADE_HISTORICAL_SOURCE_SEAL.parentBlobSha256,\n currentLfSha256:CRUSADE_CURRENT_ASSERTION_SUPERSESSION.currentLfSha256,\n expectedWhy:'Reviewed repeat-event gate, garrison and commander ownership; original assertions preserved.',\n reason:'Visit timing supersedes two historical expectations and relocates eight selected faults; all 13 original instances map to 33 current assertions, with four observed refusals explicitly tightened in the named current check.',\n});\nexport interface ProbeExecution {\n readonly file:string;\n"
        },
        {
          "before": " assertCrusadeCaseMap();\n assert.deepEqual(Object.keys(row).sort(),['probe','status','tier','why'],'Superseded roster row shape changed');\n assert.equal(row.status,'green');assert('tier'in row);assert.equal(row.tier,'fast');assert.equal(row.why,s.expectedWhy);\n exactSource(root,'proberoster.ts',s.rosterLfSha256);\n exactSource(root,s.historicalProbe,s.historicalLfSha256);\n exactSource(root,s.currentCheck,s.currentLfSha256);\n return Object.freeze({file:s.currentCheck,args:Object.freeze([]),label:row.probe+' [CURRENT-SUCCESSOR -> '+s.currentCheck+']',historicalSourceOnly:true});\n",
          "after": " assertCrusadeCaseMap();\n assert.deepEqual(Object.keys(row).sort(),['probe','status','tier','why'],'Superseded roster row shape changed');\n assert.equal(row.status,'green');assert('tier'in row);assert.equal(row.tier,'fast');assert.equal(row.why,s.expectedWhy);\n exactSource(root,s.historicalProbe,s.historicalLfSha256);\n exactSource(root,s.currentCheck,s.currentLfSha256);\n return Object.freeze({file:s.currentCheck,args:Object.freeze([]),label:row.probe+' [CURRENT-SUCCESSOR -> '+s.currentCheck+']',historicalSourceOnly:true});\n"
        },
        {
          "before": "/** Rendering/filtering never throws due to later source drift. Only invocation\n * resolution grants execution after validating the real current files. */\nexport function probeExecutionFile(row:ProbeRow):string{return row.probe===CRUSADE_ARRIVAL_SUPERSESSION.historicalProbe?CRUSADE_ARRIVAL_SUPERSESSION.currentCheck:row.probe;}\nexport function probeMatchesFilter(row:ProbeRow,filter:string):boolean{return row.probe.includes(filter)||probeExecutionFile(row).includes(filter);}\nexport function probeRerunCommand(row:ProbeRow):string{\n const args=row.probe===CRUSADE_ARRIVAL_SUPERSESSION.historicalProbe?[]:row.args??[];\n return 'npx tsx balance/'+probeExecutionFile(row)+(args.length?' '+args.join(' '):'');\n",
          "after": "/** Rendering/filtering never throws due to later source drift. Only invocation\n * resolution grants execution after validating the real current files. */\nexport function probeExecutionFile(row:ProbeRow):string{return row.probe===CRUSADE_ARRIVAL_SUPERSESSION.historicalProbe?CRUSADE_ARRIVAL_SUPERSESSION.currentCheck:row.probe;}\nexport function probeMatchesFilter(row:ProbeRow,filter:string):boolean{return row.probe.includes(filter)||probeExecutionFile(row).includes(filter)||(row.probe===CRUSADE_ARRIVAL_SUPERSESSION.historicalProbe&&CRUSADE_CURRENT_ASSERTION_SUPERSESSION.historicalCheck.includes(filter));}\nexport function probeRerunCommand(row:ProbeRow):string{\n const args=row.probe===CRUSADE_ARRIVAL_SUPERSESSION.historicalProbe?[]:row.args??[];\n return 'npx tsx balance/'+probeExecutionFile(row)+(args.length?' '+args.join(' '):'');\n"
        }
      ]
    },
    {
      "file": "docs/worldgen/native-verminfall-lifetime.md",
      "predecessor": "37fbfb25edb8013470457fb2d0278bfce92d5db4",
      "beforeHash": "154a3e92512b70262a8c92621e48794029a943038063bff8e522193a96c811e3",
      "afterHash": "e035e8e4a0e2f1ceb2c13ef3e69ed306e99d90f0e6cc34ca7bdccb594376025e",
      "crlfLines": [],
      "hunks": [
        {
          "before": "remain historical evidence. Two expectations in it were incorrect for visit\nparity: a remote occupant received a successor without leaving, and the active\ndirect-Crusade case required another nest cohort during that visit. Its standalone\nCI invocation is superseded by `check_nativeverminfallarrivalboundaries.ts`:\n25 trigger-independent cases, eight placement faults staged at genuine warm\narrivals, two corrected timing expectations, and eleven additional arrival\ncontrols. The sealed probe roster and older source archives remain unchanged.\n\n`check_nativeverminfallarrival.ts` covers visit timing against current gameplay;\n`check_nativeverminfall.ts` retains the ordinary/retained natural successor and\nreward comparison. Both cold modes in `check_nativeverminfallcold.ts` use isolated\n",
          "after": "remain historical evidence. Two expectations in it were incorrect for visit\nparity: a remote occupant received a successor without leaving, and the active\ndirect-Crusade case required another nest cohort during that visit. Its standalone\nCI invocation was first superseded by `check_nativeverminfallarrivalboundaries.ts`:\n25 trigger-independent cases, eight placement faults staged at genuine warm\narrivals, two corrected timing expectations, and eleven additional arrival\ncontrols. The sealed probe roster and older source archives remain unchanged.\n\nThe current CI entry is `check_nativeverminfallcrusadeboundaries.ts` (48 cases).\nIts committed contract in `balance/probesupersessioncontracts.ts` maps all 46\nprevious cases, preserves the first 45 case bodies and all five original final\nassertions, and records the actual fixture-order failure digest. The final fault\nnow observes Crusade post-return validation before entering the intended\nVerminfall stage; two additional controls cover both leaves' post-return windows.\n`check_probesupersessionscurrent.ts` checks source identities, this mapping and\nthe exact CI invocation. The older 46-case source is historical evidence.\n\n`check_nativeverminfallarrival.ts` covers visit timing against current gameplay;\n`check_nativeverminfall.ts` retains the ordinary/retained natural successor and\nreward comparison. Both cold modes in `check_nativeverminfallcold.ts` use isolated\n"
        }
      ]
    },
    {
      "file": ".github/workflows/ci.yml",
      "predecessor": "37fbfb25edb8013470457fb2d0278bfce92d5db4",
      "beforeHash": "08b39b7d7301baaed508e1c67c4cea087a19ef41732c29b0c8ed69b0b1f50f45",
      "afterHash": "068f71d22e6ca4c9045b4f3f286848b6579c8872f5865fcab9d32ecd1c7bbaa8",
      "crlfLines": [],
      "hunks": [
        {
          "before": "      - name: Retained Crusade arrival source and current probe dispatch\n        run: |\n          npx tsx balance/check_nativecrusadearrivalsource.ts\n          npx tsx balance/check_probesupersessions.ts\n\n      - name: Development watcher and save-fixture source regressions\n        run: |\n",
          "after": "      - name: Retained Crusade arrival source and current probe dispatch\n        run: |\n          npx tsx balance/check_nativecrusadearrivalsource.ts\n          npx tsx balance/check_probesupersessionscurrent.ts\n          npx tsx balance/check_nativearrivalwindowboundaries.ts\n          npx tsx balance/check_nativearrivalinvocationsource.ts\n\n      - name: Development watcher and save-fixture source regressions\n        run: |\n"
        }
      ]
    },
    {
      "file": "docs/worldgen/native-crusade-event-lifetime.md",
      "predecessor": "37fbfb25edb8013470457fb2d0278bfce92d5db4",
      "beforeHash": "439ba0f72e39a16bf8fed8d452f10bfeef4b10734318dd7f62fbfd7daf3603bd",
      "afterHash": "366a9d4b4c27781bb81a56e2512b62e1d0b254b18db016150fdc04e6e6aae24e",
      "crlfLines": [],
      "hunks": [
        {
          "before": "\nThe retained owner observes the real birth operation and actual population factory. It records consumption at the completed native marker add, before discovery, monster creation or notice callbacks can remove that marker and throw. Completed native effects survive; partial garrisons and discovery cannot replay. A selected add that fails before adding does not consume a new attempt. An arrival deletion that completes and then throws keeps that deletion and the released attempt, while preserving the original error. Guard repair alone never marks an unseen successor as spent.\n\nThe coordinator privately selects Crusade after Warlord and before Verminfall and Vendetta. Selecting a callable grants no entry. Each actual invocation reserves one claim before callback-capable validation and revokes it in `finally`; foreign, sibling, repeated, live-registry and asynchronous borrowing refuse. Physical ownership and occupancy are revalidated across callbacks. This finite shared Crusade/Verminfall stage does not claim to repair the older Warlord-to-Vendetta window outside those selected event leaves.\n\nEach native-created commander carries its issuing event identity. An ended event's commander keeps ordinary monster death effects but cannot claim another event's liberation reward or suppress its successor. A still-live older campaign resolves through a bounded field receipt for that exact event even when another campaign dominates the area. Selected callback replacement, expired identity and repeated resolution cannot redirect that receipt. Original unbound World kills retain their package behavior. The authentic lifetime calls remain captured by the defining overlay module; public zone queries remain intentionally selected.\n\n",
          "after": "\nThe retained owner observes the real birth operation and actual population factory. It records consumption at the completed native marker add, before discovery, monster creation or notice callbacks can remove that marker and throw. Completed native effects survive; partial garrisons and discovery cannot replay. A selected add that fails before adding does not consume a new attempt. An arrival deletion that completes and then throws keeps that deletion and the released attempt, while preserving the original error. Guard repair alone never marks an unseen successor as spent.\n\nThe coordinator privately selects Crusade after Warlord and before Verminfall and Vendetta. Selecting a callable grants no entry. Each actual invocation reserves one claim before callback-capable validation and revokes it in `finally`; foreign, sibling, repeated, live-registry and asynchronous borrowing refuse. Physical ownership and occupancy are revalidated across callbacks. The later [arrival invocation boundary](native-arrival-invocation.md) extends the same private claim to Warlord and Vendetta, including their initial selection and post-return validation windows.\n\nEach native-created commander carries its issuing event identity. An ended event's commander keeps ordinary monster death effects but cannot claim another event's liberation reward or suppress its successor. A still-live older campaign resolves through a bounded field receipt for that exact event even when another campaign dominates the area. Selected callback replacement, expired identity and repeated resolution cannot redirect that receipt. Original unbound World kills retain their package behavior. The authentic lifetime calls remain captured by the defining overlay module; public zone queries remain intentionally selected.\n\n"
        },
        {
          "before": "\nThe matched five-frame observation at parent `82c516ce` used ordinary native startup and retained native startup with equal geography, fields, event identities and measured RNG ingress. A supported development-staged successor produced zero new ordinary placements but one retained placement with twelve bodies and one discovery during the same visit. The candidate repeats that exact course and requires zero successor placements and discovery in both lanes. This fixture directly resolves and stages events; it is not evidence of organic recurrence or equality of all random draws.\n\nThe original `probe_nativecrusadeepochboundaries.ts` and sealed roster remain byte-identical historical contracts. Its thirteen cases include the obsolete live-replacement timing expectation. The probe runner names an explicit current-runtime successor, preserves the selected row's arguments and execution limits, and reports the actual executed check. Its mapping accounts for every predecessor case; historical source preservation is distinct from a current runtime pass. Current checks add occupied/empty arrivals, A -> B -> A, logical continuity, marker and callback partial effects, and private invocation refusal. Commander, cold birth, terrain, realm, Continue, hosted travel and source-chain checks remain required alongside all four type configurations and boot checks.\n\nThe shared arrival order also changes where an earlier Verminfall fault fixture is triggered. Its original 46-case source remains preserved. The explicitly named `check_nativeverminfallcrusadeboundaries.ts` successor keeps those cases and their assertions, locates the final fault at the actual Verminfall stage after the earlier Crusade validation, and adds both leaves' post-return validation controls. CI invokes the current check directly; the earlier source is historical evidence, not a current gameplay pass. The first installed integration run exposed this fixture-order conflict and remains recorded as a failure.\nThese finite courses establish only the behaviors they exercise. They do not establish full playable parity, transferable private visit state, empty-area scheduling, all-frame RNG equivalence, performance capacity or readiness for the main merge.",
          "after": "\nThe matched five-frame observation at parent `82c516ce` used ordinary native startup and retained native startup with equal geography, fields, event identities and measured RNG ingress. A supported development-staged successor produced zero new ordinary placements but one retained placement with twelve bodies and one discovery during the same visit. The candidate repeats that exact course and requires zero successor placements and discovery in both lanes. This fixture directly resolves and stages events; it is not evidence of organic recurrence or equality of all random draws.\n\nThe original `probe_nativecrusadeepochboundaries.ts` and the superseded roster row remain historical contracts. Dispatch validates that exact row, while unrelated roster additions remain allowed. Its thirteen cases include the obsolete live-replacement timing expectation. The probe runner names an explicit current-runtime successor, preserves the selected row's arguments and execution limits, and reports the actual executed check. Its mapping accounts for every predecessor case; historical source preservation is distinct from a current runtime pass. The current target is `check_nativecrusadearrivalcurrentboundaries.ts`: all 33 previous cases remain mapped, and four refusal assertions now match the exact errors observed on commit `37fbfb25`. All four also match the older narrow pattern; the two extra alternatives in the prior 33-case source were unnecessary. Both prior sources remain unchanged. The committed evidence module binds the original thirteen-case source to its named archive record and exact `82c516ce` Git blob using one declared line-ending conversion. Current checks add occupied/empty arrivals, A -> B -> A, logical continuity, marker and callback partial effects, and private invocation refusal. Commander, cold birth, terrain, realm, Continue, hosted travel and source-chain checks remain required alongside all four type configurations and boot checks.\n\nThe shared arrival order also changes where an earlier Verminfall fault fixture is triggered. Its original 46-case source remains preserved. The explicitly named `check_nativeverminfallcrusadeboundaries.ts` successor keeps those cases and their assertions, locates the final fault at the actual Verminfall stage after the earlier Crusade validation, and adds both leaves' post-return validation controls. CI invokes the current check directly; it is not a gameplay-roster dispatch. `balance/probesupersessioncontracts.ts` commits the 46-to-48 map, source identities, first-45 prefix proof, five preserved final assertions and recorded failure metadata (log SHA-256 `d0d5431994a3617be3ced2a41e71c0b0f41531c499b69cc003937e868d8c49b3`). The full original local run remains preserved separately. `check_probesupersessionscurrent.ts` validates this contract and the exact CI line. Its predecessor source control remains historical: only the unrelated-whole-roster refusal is superseded, with exact row/source/configuration refusal retained.\nThese finite courses establish only the behaviors they exercise. They do not establish full playable parity, transferable private visit state, empty-area scheduling, all-frame RNG equivalence, performance capacity or readiness for the main merge.\n"
        }
      ]
    },
    {
      "file": "balance/nativeCrusadeArrivalSourceFixture.ts",
      "predecessor": "37fbfb25edb8013470457fb2d0278bfce92d5db4",
      "beforeHash": "82ec08107c0fc5b39fdc3e0d2bedc8cc03de8b7278063f5ea2dcc4ac2e189c65",
      "afterHash": "2a8123e59220cd4d18cea79aeaca816a4a6e5b6c577888c1a4b3f1514ff5facb",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeArrivalInvocationSourceFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n"
        }
      ]
    },
    {
      "file": "balance/check_nativecrusadearrivalsource.ts",
      "predecessor": "37fbfb25edb8013470457fb2d0278bfce92d5db4",
      "beforeHash": "ff00ed4f88690360a09718d5757f1a84bee0c4690d997dc859c303a22be883a0",
      "afterHash": "70d167b2b309babc10dac10c1fc816cf200c3d517d2628544a0378cda62c9d49",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Mutation, byte identity and filesystem controls for the crusade arrival source boundary. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n",
          "after": "/** Mutation, byte identity and filesystem controls for the crusade arrival source boundary. */\nimport assert from 'node:assert/strict';\nimport * as fs from './nativeArrivalInvocationSourceFS';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n"
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
      "file": "balance/nativeCrusadeArrivalSourceArchive.ts",
      "normalSha256": "471e489f3adbce006e275cccfececfc60d3251bd4162fe6af5b1a237fe27bc95"
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
      "normalSha256": "068f71d22e6ca4c9045b4f3f286848b6579c8872f5865fcab9d32ecd1c7bbaa8"
    },
    {
      "file": "balance/check_nativearrivalinvocationsource.ts",
      "normalSha256": "79f916010b80b607e7f5156269e117e306c269e83950576b2c687071db8297b9"
    },
    {
      "file": "balance/check_nativearrivalwindowboundaries.ts",
      "normalSha256": "bec2946bf12ad3c5e67822c4d97a853a6c6694685abef80468adfd9904f2eae5"
    },
    {
      "file": "balance/check_nativecrusadearrivalcurrentboundaries.ts",
      "normalSha256": "0ca6e11344268d68e3771def5ff0a9d9929d6bef80dc27a4ccb6e6b3b2a854cf"
    },
    {
      "file": "balance/check_nativecrusadearrivalsource.ts",
      "normalSha256": "70d167b2b309babc10dac10c1fc816cf200c3d517d2628544a0378cda62c9d49"
    },
    {
      "file": "balance/check_probesupersessionscurrent.ts",
      "normalSha256": "8e783164e5959a07c6ccc3003a2b298a9c5ad94cdd0757566c87dd08d570a089"
    },
    {
      "file": "balance/nativeArrivalInvocationSourceFixture.ts",
      "normalSha256": "eb219abc744593c43c4af573fefb7dc7be65d1738500164cfa6cc19e328294cd"
    },
    {
      "file": "balance/nativeArrivalInvocationSourceFS.ts",
      "normalSha256": "7afccbf62d0df852a4b66a67da733b470b12ddca01b9cde592ce9872116d0a14"
    },
    {
      "file": "balance/nativeCrusadeArrivalSourceFixture.ts",
      "normalSha256": "2a8123e59220cd4d18cea79aeaca816a4a6e5b6c577888c1a4b3f1514ff5facb"
    },
    {
      "file": "balance/probesupersessioncontracts.ts",
      "normalSha256": "c4def6022badb30d4fa74ecb01fed84a1a060c810b7ccf6972c126b9955ed08f"
    },
    {
      "file": "balance/probesupersessions.ts",
      "normalSha256": "2369299ed60804babc5b9fa1386c1764271dbccc5fdb60e6b9e5313c29428411"
    },
    {
      "file": "docs/worldgen/native-arrival-invocation.md",
      "normalSha256": "d8a5f018cbd24f0238b0d8266d240b9cee98a4316861bda0317dac55b9700be9"
    },
    {
      "file": "docs/worldgen/native-crusade-event-lifetime.md",
      "normalSha256": "366a9d4b4c27781bb81a56e2512b62e1d0b254b18db016150fdc04e6e6aae24e"
    },
    {
      "file": "docs/worldgen/native-verminfall-lifetime.md",
      "normalSha256": "e035e8e4a0e2f1ceb2c13ef3e69ed306e99d90f0e6cc34ca7bdccb594376025e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "normalSha256": "e27428ac1130686c5a6ca6e83d01191d707c4d58c293c595368dc3bad367f098"
    },
    {
      "file": "src/worldmass/nativeAreaSceneVendettaLifetime.ts",
      "normalSha256": "c64201baf88b3d21204ae40a23fc65a184c664ea62d6ee2a3fa6415852e9830c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneWarlordArrival.ts",
      "normalSha256": "3f668e97f1b8c7a253544713cecfee27aae06330b35214be6c5285247487d2a5"
    }
  ]
};
