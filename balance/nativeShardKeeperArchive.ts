/** Exact reviewed parent and bounded keeper-only construction delta. Original archives remain untouched. */
export const nativeShardKeeperArchive={
  "parentInput": "4d2323e86df9ef606ead3fd2a3b9db0aa604d2fd1c4b9974d5711186cb5cb858",
  "file": "src/worldmass/nativeAreaCharacterCreation.ts",
  "before": "import {assertNativeCharacterResume,type NativeCharacterResumeReceipt} from './nativeAreaCharacterResume';\n/** Actual native character construction. Receipts exist only at the private synchronous factory boundaries. */\nimport type {World,Seat} from '../engine/world';\nimport type {Actor} from '../engine/actor';\nimport {saveAccount} from '../meta/persistence';\nimport {CLASSES,type ClassDef} from '../data/classes';\nimport {START_ZONE,type ZoneDef} from '../data/zones';\nimport * as creation from '../engine/nativeCharacterCreation';\nimport {sceneIndexSeats} from '../engine/nativeSceneCombatControl';\nimport {sceneRestoreAccountRelics} from '../engine/nativeSceneCampaignLifecycle';\nimport {isNativeAreaScenePreparation,type NativeAreaScenePreparation} from './nativeAreaScenePreparation';\nimport type {MassNativeGeography} from './nativeGeography';\nimport type {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';\nimport {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';\nexport type NativeFreshCharacterOptions=Omit<NonNullable<Parameters<World['createPlayer']>[1]>,'load'|'startingCompanions'|'startingFlasks'>;\nexport interface NativeFreshCharacter {readonly classDef:ClassDef;readonly options?:NativeFreshCharacterOptions;readonly labArts?:boolean;readonly graft?:string;readonly scene?:string;readonly provisionalMu?:true}\ntype Stage='construct'|'stats'|'deeds'|'birth'|'gifts';\ndeclare const characterReceipt:unique symbol;\nexport interface NativeCharacterCreationReceipt {readonly [characterReceipt]:true}\ninterface Receipt {readonly writer:World;readonly seat:Seat;readonly actor:Actor;readonly preparation:NativeAreaScenePreparation;readonly area:NativeAreaSceneOngoing|undefined;readonly stage:Stage;active:boolean}\nconst receipts=new WeakMap<object,Receipt>(),factories=new WeakSet<NativeAreaScenePreparation>();\nfunction own<T>(o:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native character needs ordinary data: '+String(key));return d.value as T;}\nexport function assertNativeCharacterReceipt(token:NativeCharacterCreationReceipt,stage:Stage):Readonly<Receipt>{const row=receipts.get(token);if(!row?.active||row.stage!==stage)throw Error('Native character factory receipt is expired or foreign');assertNativeRetainedMassState(row.writer);if(own(row.seat,'actor')!==row.actor||(row.area&&row.area.assembly.input.scene.player!==row.actor))throw Error('Native character body changed');if(stage!=='construct'&&own(row.writer,'localSeat')!==undefined&&own(row.writer,'localSeat')!==row.seat)throw Error('Native character local seat changed');return row;}\nexport function assertNativeEmptyCharacterCensus(token:NativeCharacterCreationReceipt,campaign:object,player:Actor,actors:readonly Actor[]):void {const r=assertNativeCharacterReceipt(token,'construct');if(r.preparation.input.session.campaign!==campaign||own(r.seat,'actor')!==player||own(r.writer,'actors')!==actors||actors.length!==0||own<Seat[]>(r.writer,'seats').length!==0||own(r.writer,'localSeat')!==undefined)throw Error('Native character construction must retain its actual empty census');r.preparation.input.authority.assertUnclaimed(player);}\nexport class NativeAreaCharacterCreation {\n readonly preparation:NativeAreaScenePreparation;readonly definition:ZoneDef;readonly geography:MassNativeGeography;\n readonly #writer:World;readonly #previousScale:PropertyDescriptor|undefined;\n readonly #scale:()=>void;\n #resume=false;#seat:Seat|undefined;#actor:Actor|undefined;#area:NativeAreaSceneOngoing|undefined;#running=false;#attempted=false;#retired=false;#signal:AbortSignal|undefined;\n constructor(preparation:NativeAreaScenePreparation,definition:ZoneDef,geography:MassNativeGeography){\n  if(!isNativeAreaScenePreparation(preparation)||factories.has(preparation))throw Error('Native character needs one actual preparation owner');this.preparation=preparation;this.definition=definition;this.geography=geography;this.#writer=preparation.input.session.writer;\n  if(definition.id!==START_ZONE||this.#writer.zoneMap[START_ZONE]!==definition)throw Error('Native fresh character requires the actual recorded starting town');this.#empty();\n  this.#previousScale=Object.getOwnPropertyDescriptor(this.#writer,'rescaleEnemies');if(this.#previousScale&&!this.#previousScale.configurable)throw Error('Native character event service cannot replace a locked slot');\n  this.#scale=()=>{this.#live();const area=this.#area;if(!area)throw Error('Native party event has no actual character area');if(area.assembly.phase==='born')this.preparation.input.coordinator.current.combat.rescaleEnemies();else this.#with('stats',token=>area.combat.rescaleInitialCharacter(token));};\n  Object.defineProperty(this.#writer,'rescaleEnemies',{configurable:true,enumerable:false,writable:false,value:this.#scale});factories.add(preparation);\n }\n #empty():void {if(own<Seat[]>(this.#writer,'seats').length||own<Actor[]>(this.#writer,'actors').length||own(this.#writer,'localSeat')!==undefined)throw Error('Native character factory needs the actual empty writer');}\n #live():void {if(this.#retired)throw Error('Native character factory is retired');assertNativeRetainedMassState(this.#writer);if(this.#signal?.aborted)throw Error('Native character creation cancelled');}\n #with<T>(stage:Stage,action:(token:NativeCharacterCreationReceipt)=>T):T {this.#live();if(!this.#running||!this.#seat)throw Error('Native character factory is not active');const token=Object.freeze({}) as NativeCharacterCreationReceipt,row:Receipt={writer:this.#writer,seat:this.#seat,actor:this.#actor!,preparation:this.preparation,area:this.#area,stage,active:true};receipts.set(token,row);try{return action(token);}finally{row.active=false;}}\n #recalc(seat:Seat):void {\n  if(!this.#running)throw Error('Native character stats escaped creation');\n  if(!this.#seat){this.#seat=seat;this.#actor=own<Actor>(seat,'actor');this.#area=this.#with('construct',token=>this.preparation.constructInitialCharacter(token,this.definition.id,this.geography));}\n  if(this.#seat!==seat)throw Error('Native character stats selected a different seat');\n  this.#with('stats',token=>this.#area!.progression.recalcInitialCharacter(token));\n }\n createResume(token:NativeCharacterResumeReceipt,signal?:AbortSignal):NativeAreaSceneOngoing {const r=assertNativeCharacterResume(token,'shell');if(r.preparation!==this.preparation||r.writer!==this.#writer)throw Error('Native resume shell belongs to another factory');this.#resume=true;try{return this.#create({classDef:r.owner.classDef},signal);}finally{this.#resume=false;}}\n create(spec:NativeFreshCharacter,signal?:AbortSignal):NativeAreaSceneOngoing {return this.#create(spec,signal);}\n #create(spec:NativeFreshCharacter,signal?:AbortSignal):NativeAreaSceneOngoing {\n  this.#live();if(this.#attempted||!CLASSES.includes(spec.classDef))throw Error('Native character creation needs a fresh catalog class');this.#empty();if(spec.provisionalMu&&spec.scene!=='mu')throw Error('Native provisional character belongs to Mu');this.#attempted=true;this.#running=true;this.#signal=signal;\n  const self=this,writer=this.#writer;\n  const host:Parameters<typeof creation.sceneCreatePlayer>[0]={\n   get localSeat(){return writer.localSeat;},set localSeat(value){writer.localSeat=value;},get seats(){return writer.seats;},set seats(value){writer.seats=value;},get actors(){return writer.actors;},get arena(){return writer.arena;},get events(){return writer.events;},\n   makePlayerSeat:(...args)=>creation.sceneMakePlayerSeat({recalcSeat:seat=>self.#recalc(seat)},...args),\n   recalcSeat:seat=>self.#recalc(seat),bindCombatDeeds:()=>self.#with('deeds',token=>self.#area!.combat.campaignOwner.bindInitialCharacterDeeds(token)),\n   indexSeats:()=>sceneIndexSeats({get seatByActor(){return writer['seatByActor'];},get seats(){return writer.seats;}}),\n   restoreAccountRelics:seat=>sceneRestoreAccountRelics({get localSeat(){return writer.localSeat;},get clientActionHook(){return writer.clientActionHook;},get account(){return writer.account;},get manifest(){return writer.manifest;}},seat),\n   loadZone:zoneId=>{if(zoneId!==self.definition.id)throw Error('Native character load differs from recorded start');self.#with('birth',token=>self.preparation.prepareInitialCharacter(token));self.preparation.birthInitial(self.#area!);},\n   grantStartingCompanions:()=>self.#with('gifts',token=>self.#area!.combat.grantInitialCharacterCompanions(token)),\n   dealVeteranFlasks:()=>self.#with('gifts',token=>self.#area!.combat.dealInitialCharacterFlasks(token)),\n  };\n  try{creation.sceneCreatePlayer(host,spec.classDef,(spec.provisionalMu||this.#resume)?{...spec.options,startingCompanions:false,startingFlasks:false}:spec.options);if(!this.#area||this.#area.assembly.phase!=='born')throw Error('Native character did not complete its real birth');if(!spec.provisionalMu&&!this.#resume){const labArts=spec.labArts??false;this.#with('gifts',token=>this.#area!.combat.dealInitialCharacterLabArts(token,labArts));if(spec.graft&&writer.account.skillGraft&&this.#with('gifts',token=>this.#area!.combat.applyInitialCharacterGraft(token,spec.graft!))){writer.account.skillGraft=false;saveAccount(writer.account);}}if(spec.scene)this.#area.combat.campaignFrame.beginScene(spec.scene);this.#live();return this.#area;}finally{this.#running=false;this.#signal=undefined;}\n }\n retire():void {if(this.#retired)return;this.#retired=true;const current=Object.getOwnPropertyDescriptor(this.#writer,'rescaleEnemies');if(current?.configurable&&current.value===this.#scale){if(this.#previousScale)Object.defineProperty(this.#writer,'rescaleEnemies',this.#previousScale);else Reflect.deleteProperty(this.#writer,'rescaleEnemies');}}\n}\n",
  "normalizedBefore": "ff1264b96fc342a764a38305ecb5c99a2ad6f5a57075df43f56f9d2a57bda07b",
  "normalizedAfter": "948788568ce35079894428f167efd9a3007bd8a93cec34367c70d3d5c2d57863",
  "edits": [
    {
      "before": " #create(spec:NativeFreshCharacter,signal?:AbortSignal):NativeAreaSceneOngoing {",
      "after": " /** A dedicated keeper uses the genuine construction stages with native gifts disabled. */\n createKeeper(classDef:ClassDef,name:string,signal?:AbortSignal):NativeAreaSceneOngoing {if(typeof name!=='string')throw Error('Native keeper requires its server name');return this.#create({classDef,options:{name}},signal,true);}\n #create(spec:NativeFreshCharacter,signal?:AbortSignal,keeper=false):NativeAreaSceneOngoing {"
    },
    {
      "before": "(spec.provisionalMu||this.#resume)?",
      "after": "(spec.provisionalMu||this.#resume||keeper)?"
    },
    {
      "before": "if(!spec.provisionalMu&&!this.#resume){",
      "after": "if(!spec.provisionalMu&&!this.#resume&&!keeper){"
    }
  ],
  "runtimeFile": "server/nativeShardRuntime.ts",
  "runtimeHash": "c3f91ee2840cd5aba5b49e93bcf8b9a7f1da9a2c9e227948f00e2e7304e29aaa",
  "untouched": [
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "sha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "sha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "sha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "sha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "sha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "sha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "sha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "sha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "sha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "sha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "sha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "sha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "sha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "sha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "sha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "sha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "sha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "sha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "sha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "sha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "sha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "sha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "sha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "sha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "sha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "sha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "sha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "sha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "sha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "sha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "sha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "sha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "sha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "sha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "sha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "sha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "sha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "sha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "sha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "sha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "sha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "sha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "sha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "sha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "sha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "sha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "sha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "sha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "sha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "sha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "sha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "sha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "sha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "sha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "sha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "sha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "sha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "sha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "sha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "sha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "sha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "sha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "sha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "sha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "sha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "sha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "sha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "sha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "sha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "sha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "sha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "sha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "sha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "sha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "sha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "sha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "sha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "sha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "sha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "sha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "sha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "sha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "sha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "sha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "sha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "sha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "sha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "sha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "sha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "sha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "sha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "sha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "sha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "sha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "sha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "sha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "sha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "sha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "sha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "sha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "sha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "sha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "sha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "sha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "sha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "sha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "sha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "sha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "sha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "sha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "sha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "sha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "sha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "sha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "sha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "sha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "sha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "sha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "sha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "sha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "sha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "sha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "sha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "sha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "sha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "sha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "sha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    },
    {
      "file": "server/shardHost.ts",
      "sha256": "c68ff10fb98613b10375303a5ced657f0fc276999860a0033a88ca3cafc8e0f2"
    },
    {
      "file": "src/engine/nativeCharacterCreation.ts",
      "sha256": "daa3d3228160e11b0b2c23eb73d90c41ab1f625328c8d48e719414c75c7e2731"
    },
    {
      "file": "src/worldmass/nativeAreaCharacterResume.ts",
      "sha256": "f8d3c427ab217aa22f5506b7f927d9389facfc5ebc945eed01250be25673b633"
    },
    {
      "file": "src/worldmass/nativeAreaScenePreparation.ts",
      "sha256": "7b154527e1334a0fa86ece835d12aba9441f1460163fc32f19c7f348cfca0269"
    },
    {
      "file": "src/worldmass/nativeClientRuntime.ts",
      "sha256": "ec9b1181b6d6b5fbd2ada9d59fd62373e3555e043185cc92712e57096386b4fc"
    }
  ]
} as const;
