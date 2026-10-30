export interface NativeHostClosureRow {file:string;rawBeforeHash:string;rawAfterHash:string;beforeHash:string;afterHash:string;crlfLines:number[];hunks:{before:string;after:string}[]}
export interface NativeHostClosureArchive {parent:unknown;rows:NativeHostClosureRow[];readers:{file:string;before:string;after:string;edits:{before:string;after:string}[];original:string;nonImportHash:string;assertionHash:string;assertions:number}[];archives:{file:string;sha256:string}[];runtime:{file:string;sha256:string}[];accepted:{lane:string;file:string;sha256:string}[]}
export const nativeHostClosureArchive:NativeHostClosureArchive = {
  "parent": {
    "lane": "mainHost106",
    "file": "C:\\Users\\John\\.codex\\worktrees\\seamless-world\\ARPG Game - World\\.claude\\native-main-host-composition-phase106.local.work\\REVIEW-INPUTS.json",
    "sha256": "e49edc8baf7dc25348264177ed82b52ffcd5118ffcca6f5c2afa65b01616a3fe",
    "sourceDirectory": "C:\\Users\\John\\.codex\\worktrees\\seamless-world\\ARPG Game - World\\.claude\\native-main-host-composition-phase106.local.work\\review-snapshot",
    "files": 3422,
    "targets": [
      {
        "file": "balance/movement-visuals-ui.cjs",
        "before": "ebfe062a39e7e3c9cedf435621ee03ed55de40a0c36137f7761cc42cf8aae04d",
        "after": "3abc0a863f918c748e6a57174064d161d896c0715f78169b934661e118b9a4a6",
        "kind": "proof"
      },
      {
        "file": "balance/nativeMainHostCompositionArchive.ts",
        "before": null,
        "after": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84",
        "kind": "proof"
      },
      {
        "file": "balance/nativeMainHostCompositionFixture.ts",
        "before": null,
        "after": "c02f5f0a5cd2c7696a1e518008b86f8495eb20cbc63b5a9b57ae7461fb517832",
        "kind": "proof"
      },
      {
        "file": "balance/nativeMainHostCompositionFS.ts",
        "before": null,
        "after": "d049d8476857ad466670acce38ba162ee61cf80bee11cb46b68838c062d770f2",
        "kind": "proof"
      },
      {
        "file": "balance/nativeShardsCompositionFixture.ts",
        "before": "51297bf3d6f5ac385992f3f1b42e0974d31819153c392086ce630f5bff2bebb3",
        "after": "daf20ecf9882bf56cd764b365044cffb247ae9dfae977cef19b1c1738909161e",
        "kind": "proof"
      },
      {
        "file": "balance/probe_miniontargets.ts",
        "before": null,
        "after": "1c8186ad56a1bbbc03586d3e328f0f99ca5ccdd720f045a5a4d76f945e23c752",
        "kind": "proof"
      },
      {
        "file": "balance/probe_movementvisuals.ts",
        "before": "cdfe754e7207c4b53668f835569c5889fa5c4994bb73a4e5009fe57e386477d6",
        "after": "ca6f1a5433bca179a10bfd829e1bf25a5d40ff36c923e076ad9151a3dbdf9d5e",
        "kind": "proof"
      },
      {
        "file": "balance/probe_nativemainhostcompositionsource.ts",
        "before": null,
        "after": "0aaaa44d6c3afc7becb1a126e695f3735d848408ff201d15e56438c2e10e08e7",
        "kind": "proof"
      },
      {
        "file": "balance/probe_nativemainminions.ts",
        "before": null,
        "after": "9845e3c38f93887f9d11986dfb83108223eb1984637265cf9fb86e3f8dbc78b0",
        "kind": "proof"
      },
      {
        "file": "balance/probe_nativemainorbs.ts",
        "before": null,
        "after": "77e317bb57a0093b30d11f62cff1b9351414da35c5fa0d88de10f918185d276b",
        "kind": "proof"
      },
      {
        "file": "balance/probe_nativescenehistory.ts",
        "before": "0a5337f04f7487e4951ec2e1dfde9663f7c2172ad9770a351b77ad4d820b1f65",
        "after": "14f0180b39cf404dd58b4f1ee7b10456e67310c83d44b28e1d928205be1a04bc",
        "kind": "proof"
      },
      {
        "file": "balance/probe_nativeshardscompositionsource.ts",
        "before": "e22cce8ce6a30136b944c5a6361feb3e9b1131acebaaf4a17244ce3d89c297d4",
        "after": "c61ca7366c6abae530d517203d8047a7ec37c708ae55a86eb7f2ebe115fc9a0b",
        "kind": "proof"
      },
      {
        "file": "balance/probe_orbgeneration.ts",
        "before": null,
        "after": "882cc86ccdc1371aeea6954e586deaac005993ea40ef5b77751fd2cf9f9ffaf3",
        "kind": "proof"
      },
      {
        "file": "balance/proberoster.ts",
        "before": "171dea556b3c9592be69d616ca48f8da9f1040442d92d8c2fa5e6dc30fdbbdb2",
        "after": "9edf9fa4df5150d016daa1685cbe5a371abf6b9d081a92ee00ae5e7255132192",
        "kind": "proof"
      },
      {
        "file": "CLAUDE.md",
        "before": "d8ea20e6a2d2f17cfcbddbfb735a10abb220aebe0c5c884ad8495c8f7f19fbd8",
        "after": "833e629775a2732d69163acbdb110ca2de7f55ed760d12bbfbb1ead2f26259bc",
        "kind": "documentation"
      },
      {
        "file": "docs/design/combat-polish.md",
        "before": null,
        "after": "7a23b4eee3dd643d99354303d481997dc6fd6e549bb2bf3d64653312cf8c79ec",
        "kind": "documentation"
      },
      {
        "file": "docs/worldgen/native-dedicated-shards.md",
        "before": "db0adcc2774588d586c0e739ac46308a26f583fbe9a30b61e1323bfcf6ed4413",
        "after": "e16f39efd7b5945ec50c76400271235aa5c298124327af34a33008cbb9cbc6cd",
        "kind": "documentation"
      },
      {
        "file": "docs/worldgen/native-main-followup-parity.md",
        "before": null,
        "after": "4e6a01e013ae9079d4fe05ccfd590cc9314bc5f14212b3f56b5b7f62dd346932",
        "kind": "documentation"
      },
      {
        "file": "src/data/orbs.ts",
        "before": "c78cc9a5d9c706083a3f11540924d5c1f9f400e340174023cdb90128e11e2a51",
        "after": "7ac89fbf5fdc3c3d567649f7c52b45ebd6388698e732e0c08515c5bfa4d789e0",
        "kind": "runtime"
      },
      {
        "file": "src/data/skillMovementVisuals.ts",
        "before": "d6b0724bbb3b2a7223df6319d00d5af3ababdb90e679310ba7ab2b7808edae8b",
        "after": "8a072f3487c3fd9444070fc8b13c22df46e8f8338fcc6e7ad133817d6bbeb21b",
        "kind": "runtime"
      },
      {
        "file": "src/data/skills.ts",
        "before": "c9c8df9244809fe44ce8a2f072a8ca1bb7a69904221ac9a6fef3bef5a28d79e7",
        "after": "1e03c12f1b0bc7b61a5c0e6154eab010fc3debba86bd7261d311cb458bcf0b71",
        "kind": "runtime"
      },
      {
        "file": "src/data/supports.ts",
        "before": "24b33a333444b12036e91b8075dba8890c4618dc47f0e943fc10c5dfa91bd454",
        "after": "744c7415f9ed6854b1e34fc413241d7b3faa164806fc1beadc1240f4f6417120",
        "kind": "runtime"
      },
      {
        "file": "src/engine/ai.ts",
        "before": "244e71f3c54ec57692bdaaab55e1ef243abc84344de8296caf26721cb3a09148",
        "after": "7057739bc34d5c3d682996b09524619d88c8d0e43f8ee0bf148fe06c4bea712b",
        "kind": "runtime"
      },
      {
        "file": "src/engine/companionStances.ts",
        "before": "fa851ff05dd2b05dd16365ffd31f14850464618f26e1a3fb014fdbd911e384b3",
        "after": "3d1344382aaf9fd8337e90dd1e5ec3f198ebf3e8b0d34aab3c87ac2c4c0d52d6",
        "kind": "runtime"
      },
      {
        "file": "src/engine/minionTargets.ts",
        "before": null,
        "after": "8bf96a34d686d19bb3b25aaddc64666781f4301c6a84832dd601ccf0b22f6534",
        "kind": "runtime"
      },
      {
        "file": "src/engine/nativeSceneCombatResolution.ts",
        "before": "c267484c3b1521bdda0a4d135aee081c0b8baccbe1c03bed992a1d865f4ffa96",
        "after": "2d50726ff39a3379f19b7e16f333c60bbda54e14c46cb9baee15a18ef269f06f",
        "kind": "runtime"
      },
      {
        "file": "src/engine/orbGeneration.ts",
        "before": null,
        "after": "bc2a5008a7d11bd9278bb19f337ede98d238ce065fade3e44862d4345136f025",
        "kind": "runtime"
      },
      {
        "file": "src/engine/world.ts",
        "before": "82b3812fdf289abc0ef42bbe6db1b473039144b9d7adb7770d670ecbd715f73d",
        "after": "82f6f329f6fe9da9aeed6e6410eaf4148d5e8310ba7928ca6db0ffadf6a211fc",
        "kind": "runtime"
      },
      {
        "file": "src/render/vis/skillMovementVoice.ts",
        "before": "66769005ab1fbac23d46e074f32d3520ba26cf92b0631116601ffbf94c020120",
        "after": "4a474b86b94886160d2d0777597779a1e2ff588b21088f41c70ebbb2a44c6cf2",
        "kind": "runtime"
      }
    ]
  },
  "rows": [
    {
      "file": "balance/nativeMainHostCompositionFixture.ts",
      "rawBeforeHash": "c02f5f0a5cd2c7696a1e518008b86f8495eb20cbc63b5a9b57ae7461fb517832",
      "rawAfterHash": "42a68c4ebaf15c69fd337b67f1f5c384f7fa6278981e829ebabe84f1e73c91bb",
      "beforeHash": "c02f5f0a5cd2c7696a1e518008b86f8495eb20cbc63b5a9b57ae7461fb517832",
      "afterHash": "42a68c4ebaf15c69fd337b67f1f5c384f7fa6278981e829ebabe84f1e73c91bb",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport {nativeMainHostCompositionArchive as archive,type NativeMainHostSourceRow,type NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';\nexport type {NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeHostClosureFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport {nativeMainHostCompositionArchive as archive,type NativeMainHostSourceRow,type NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';\nexport type {NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';\n"
        }
      ]
    },
    {
      "file": "balance/probe_nativebirthadmission.ts",
      "rawBeforeHash": "f137a34a589e746ae7589d106b4ac67d946b7a7fa4ca6250870c785736a02fa1",
      "rawAfterHash": "5b1b6108ac36f5560a68b3460d5a9553c59ce8c735eac0dc636a2a9adcf5a894",
      "beforeHash": "f137a34a589e746ae7589d106b4ac67d946b7a7fa4ca6250870c785736a02fa1",
      "afterHash": "5b1b6108ac36f5560a68b3460d5a9553c59ce8c735eac0dc636a2a9adcf5a894",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Actual local population births and native retained drivers; identity admission\n * only. Movement/progression remain explicitly unavailable test boundaries. */\nimport assert from 'node:assert/strict';\nimport {Actor} from '../src/engine/actor';\nimport {makeSimWorld} from '../src/sim/arena';\nimport {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';\nimport {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';\nimport {NativeAreaSceneBirthAdmission} from '../src/worldmass/nativeAreaSceneBirthAdmission';\n",
          "after": "/** Actual local population births and native retained drivers; identity admission\n * only. Movement/progression remain explicitly unavailable test boundaries. */\nimport assert from 'node:assert/strict';\nimport {refuseWorldCombat} from './probe_nativecombatcycle';\nimport {Actor} from '../src/engine/actor';\nimport {makeSimWorld} from '../src/sim/arena';\nimport {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';\nimport {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';\nimport {NativeAreaSceneBirthAdmission} from '../src/worldmass/nativeAreaSceneBirthAdmission';\n"
        },
        {
          "before": " assert.throws(()=>new NativeAreaSceneBirthAdmission({authority:f.authority,scene:{...f.scene},population:f.i.population}),/identical population census/);\n const authority=new NativeAreaActorAuthority<object>(f.campaign),unregistered=new NativeAreaSceneBirthAdmission({authority,scene:f.scene,population:f.i.population});let called=false;assert.throws(()=>unregistered.run(()=>{called=true;}),/Unregistered/);assert.equal(called,false);\n});\ncourse('rescue attendance cannot follow a player transferred to another area',f=>{\n f.rescue();const player=f.scene.player,other={zone:{...f.scene.zone,id:'other'},actors:[player],player},binding=f.authority.register(other,f.binding.services);f.scene.actors=f.scene.actors.filter(a=>a!==player);f.authority.transfer(player,f.binding,binding);\n assert.throws(()=>f.quests.rescues.update(),/present area player/);assert.equal(f.scene.actors.length,0);f.authority.assertAdmitted(f.scene);\n});\ncourse('retired controller does not attach itself to a replacement binding',f=>{\n f.admission.run(()=>{});f.authority.release(f.binding,[...f.scene.actors]);f.authority.unregister(f.binding);const next=f.authority.register(f.scene,f.binding.services);f.authority.claim(next,f.scene.actors);assert.throws(()=>f.admission.run(()=>{}),/retired authority/);\n});\nconsole.log('PASS retained birth admission: '+courses+' real population/driver and adversarial identity courses');\n",
          "after": " assert.throws(()=>new NativeAreaSceneBirthAdmission({authority:f.authority,scene:{...f.scene},population:f.i.population}),/identical population census/);\n const authority=new NativeAreaActorAuthority<object>(f.campaign),unregistered=new NativeAreaSceneBirthAdmission({authority,scene:f.scene,population:f.i.population});let called=false;assert.throws(()=>unregistered.run(()=>{called=true;}),/Unregistered/);assert.equal(called,false);\n});\ncourse('rescue attendance cannot follow a player transferred to another area',f=>{\n f.rescue();const player=f.scene.player,other={zone:{...f.scene.zone,id:'other'},actors:[player],player},binding=f.authority.register(other,f.binding.services);f.scene.actors=f.scene.actors.filter(a=>a!==player);f.authority.transfer(player,f.binding,binding);\n // e0600ae8 made an empty retained rescue area inert after player departure.\n // Preserve the stronger containment contract, including the selected hand and\n // both physical owners; legitimate maintenance still has a separate course.\n const sourceActors=f.scene.actors,destinationActors=other.actors,owner=f.authority.require(player),revision=f.authority.attendanceRevision(player);\n const hand=f.w.localSeat,handMeta=hand.meta,book=f.w.questLedgerOf(hand),active=book.active,pending=active[active.length-1];\n const state=()=>structuredClone({book,runLedger:f.w.ledger,accountLedger:f.w.account.ledger,features:f.w.account.features,completed:f.w.completedObjectives,\n  accountDirty:f.w.accountDirty,charDirty:f.w.charDirty,questState:f.quests.input.state,player:{pos:player.pos,life:player.life,mana:player.mana,es:player.es,dead:player.dead,downed:player.downed},\n  doodads:f.geometry.doodads,drops:f.i.physical.input.state.drops});\n const before=state(),factory=Object.getOwnPropertyDescriptor(f.i.population,'createMonster'),spot=Object.getOwnPropertyDescriptor(f.geometry,'findFreeSpot'),random=Math.random;\n let factories=0,spots=0,draws=0;\n Object.defineProperty(f.i.population,'createMonster',{configurable:true,get(){factories++;throw Error('Absent rescue selected a factory');}});\n Object.defineProperty(f.geometry,'findFreeSpot',{configurable:true,get(){spots++;throw Error('Absent rescue selected destination geometry');}});\n Math.random=()=>{draws++;throw Error('Absent rescue advanced randomness');};\n try{refuseWorldCombat([f.w],calls=>{assert.doesNotThrow(()=>f.quests.rescues.update());assert.doesNotThrow(()=>f.quests.rescues.update());assert.deepEqual(calls,[]);});}\n finally{if(factory)Object.defineProperty(f.i.population,'createMonster',factory);else Reflect.deleteProperty(f.i.population,'createMonster');if(spot)Object.defineProperty(f.geometry,'findFreeSpot',spot);else Reflect.deleteProperty(f.geometry,'findFreeSpot');Math.random=random;}\n assert.deepEqual({factories,spots,draws},{factories:0,spots:0,draws:0});assert.deepEqual(state(),before);\n assert.equal(f.scene.actors,sourceActors);assert.equal(other.actors,destinationActors);assert.deepEqual(other.actors,[player]);assert.equal(f.scene.player,player);\n assert.equal(f.w.localSeat,hand);assert.equal(hand.actor,player);assert.equal(hand.meta,handMeta);assert.equal(f.w.questLedgerOf(hand),book);assert.equal(book.active,active);assert.equal(active[active.length-1],pending);\n assert.equal(f.authority.require(player),owner);assert.equal(owner.scene,other);assert.equal(f.authority.attendanceRevision(player),revision);assert.equal(f.authority.isPresentPlayer(f.scene),false);\n assert.equal(f.authority.bindingFor(f.scene),f.binding);assert.equal(f.authority.bindingFor(other),binding);f.authority.assertAdmitted(other);\n assert.equal(f.scene.actors.length,0);f.authority.assertAdmitted(f.scene);\n // A real physical return restores the native fallback and creates one owned\n // captive; a subsequent update preserves that exact NPC and quest receipt.\n other.actors.splice(other.actors.indexOf(player),1);f.scene.actors.push(player);f.authority.transfer(player,binding,f.binding);\n const born=refuseWorldCombat([f.w],()=>f.checkBirth(()=>f.quests.rescues.update(),'quest_rescue:'+pending.questId).born);assert.equal(born.length,1);\n const npc=born[0];f.quests.rescues.update();assert.equal(f.scene.actors.filter(a=>a.tag==='quest_rescue:'+pending.questId).length,1);assert.equal(f.scene.actors.find(a=>a.tag==='quest_rescue:'+pending.questId),npc);\n assert.equal(f.authority.require(player).scene,f.scene);assert.equal(f.authority.require(npc).scene,f.scene);assert.equal(book.active[book.active.length-1],pending);assert.equal(pending.fieldDone,false);f.authority.assertAdmitted(other);f.authority.assertAdmitted(f.scene);\n});\ncourse('retired controller does not attach itself to a replacement binding',f=>{\n f.admission.run(()=>{});f.authority.release(f.binding,[...f.scene.actors]);f.authority.unregister(f.binding);const next=f.authority.register(f.scene,f.binding.services);f.authority.claim(next,f.scene.actors);assert.throws(()=>f.admission.run(()=>{}),/retired authority/);\n});\nconsole.log('PASS retained birth admission: '+courses+' real population/driver and adversarial identity courses');\n"
        }
      ]
    },
    {
      "file": "balance/probe_nativemainhostcompositionsource.ts",
      "rawBeforeHash": "0aaaa44d6c3afc7becb1a126e695f3735d848408ff201d15e56438c2e10e08e7",
      "rawAfterHash": "9c54a7f529a22f528cdd5357d833de316737247a5bf34c0a7e0a52e8c760ad05",
      "beforeHash": "fe1eca396f358d2dab75ad4a6730177528831b24669d88be53b5f577a2328656",
      "afterHash": "01c4dd6505ab3afe2379fea2e2d043a0a256caf7799b62af81c1c0a93fa07d26",
      "crlfLines": [
        25
      ],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\nimport * as fixture from './nativeMainHostCompositionFixture';\nimport {nativeMainHostCompositionArchive as archive,type NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';\nconst hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex'),normal=(text:string)=>text.replace(/\\r\\n?/g,'\\n'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeHostClosureFS';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\nimport * as fixture from './nativeMainHostCompositionFixture';\nimport {nativeMainHostCompositionArchive as archive,type NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';\nconst hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex'),normal=(text:string)=>text.replace(/\\r\\n?/g,'\\n'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');\n"
        }
      ]
    },
    {
      "file": "balance/probe_nativescenetitans.ts",
      "rawBeforeHash": "aa6226c47c291023f0bee4edff272c2f77d5a53763625e106b0e834c0a3c6ae7",
      "rawAfterHash": "94255df3bc2dc45a81cf4ad92803a66f61f39410830c192d420b1726b43309f0",
      "beforeHash": "aa6226c47c291023f0bee4edff272c2f77d5a53763625e106b0e834c0a3c6ae7",
      "afterHash": "94255df3bc2dc45a81cf4ad92803a66f61f39410830c192d420b1726b43309f0",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {beforeNativeTitanAttendance} from './nativeTitanAttendanceFixture';\nimport {beforeNativeRuntimeBirthLifetime} from './nativeRuntimeBirthLifetimeFixture';\nimport {assertHistoricalCleaveSource,beforeHistoricalCleaveReceipt} from './nativeHistoricalCleaveReceipt';\n/** Full native Titan controller oracle: no geometry stripping, capped census or World callbacks in local lanes. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {createHash} from 'node:crypto';\nimport {spawnSync} from 'node:child_process';\n",
          "after": "import {beforeNativeTitanAttendance} from './nativeTitanAttendanceFixture';\nimport {beforeNativeRuntimeBirthLifetime} from './nativeRuntimeBirthLifetimeFixture';\nimport {assertHistoricalCleaveSource,beforeHistoricalCleaveReceipt} from './nativeTitanReceiptFixture';\n/** Full native Titan controller oracle: no geometry stripping, capped census or World callbacks in local lanes. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {createHash} from 'node:crypto';\nimport {spawnSync} from 'node:child_process';\n"
        }
      ]
    },
    {
      "file": "balance/proberoster.ts",
      "rawBeforeHash": "9edf9fa4df5150d016daa1685cbe5a371abf6b9d081a92ee00ae5e7255132192",
      "rawAfterHash": "c669c6d9168c07fefee17c6f93a9196ec3a216b93c929517497985823c9197ba",
      "beforeHash": "9edf9fa4df5150d016daa1685cbe5a371abf6b9d081a92ee00ae5e7255132192",
      "afterHash": "c669c6d9168c07fefee17c6f93a9196ec3a216b93c929517497985823c9197ba",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  { probe: 'probe_nativescenesky.ts', status: 'green', tier: 'fast', why: 'NativeSceneSky exact original source, all event sky sources, independent local areas, actual span terrain and geographic early-return parity.' },\n  { probe: 'probe_nativescenebirthcomposition.ts', status: 'green', tier: 'fast', why: 'NativeSceneBirth complete owner composition, cold original/current/local full births, remembered state, RNG, partial failures and authority refusal.' },\n  { probe: 'probe_nativestructureaccess.ts', status: 'green', tier: 'fast', why: 'Whole resolved native plans within actual bounds/backing, exact fixture and anchor identity, bounded draw-free relocation, complete generation tapes and real movement' },\n  { probe: 'probe_nativesceneruntimebirth.ts', status: 'green', tier: 'fast', why: 'NativeSceneRuntimeBirth exact main event/site births, actual local geometry/population and campaign state, full cold original/current/local comparisons and partial effects' },\n  { probe: 'probe_nativesceneruntimeregistry.ts', status: 'green', tier: 'fast', why: 'NativeSceneRuntimeRegistry complete 36-row native order, carried local state and controllers, real-area original/classic/local dispatch and partial effects' },\n  { probe: 'probe_nativescenetitans.ts', status: 'green', tier: 'fast', why: 'Complete native Titan controller over local geometry/population, retained wounds, terrain scars and hazards, exact cleanup and native partial failures' },\n  { probe: 'probe_nativescenearrival.ts', status: 'green', tier: 'fast', why: 'Original arrival safety and campaign lookups over full native geometry, live local census, native fallback paths and exact partial failures' },\n  { probe: 'probe_nativescenecoast.ts', status: 'green', tier: 'fast', why: 'Complete native coast, island and sea-port birth, shared campaign graphs, real chart hooks, retained discoveries and exact partial effects' },\n  { probe: 'probe_nativescenetheater.ts', status: 'green', tier: 'fast', why: 'Complete native ambient-activity births, all installed kinds, real pilgrims, retained live run hosts, exact defaults and partial effects' },\n  { probe: 'probe_nativesceneharbor.ts', status: 'green', tier: 'fast', why: 'Complete native harbor/quay services, carried shelves, gate and dressing state, whole-party landings and original partial births' },\n",
          "after": "  { probe: 'probe_nativescenesky.ts', status: 'green', tier: 'fast', why: 'NativeSceneSky exact original source, all event sky sources, independent local areas, actual span terrain and geographic early-return parity.' },\n  { probe: 'probe_nativescenebirthcomposition.ts', status: 'green', tier: 'fast', why: 'NativeSceneBirth complete owner composition, cold original/current/local full births, remembered state, RNG, partial failures and authority refusal.' },\n  { probe: 'probe_nativestructureaccess.ts', status: 'green', tier: 'fast', why: 'Whole resolved native plans within actual bounds/backing, exact fixture and anchor identity, bounded draw-free relocation, complete generation tapes and real movement' },\n  { probe: 'probe_nativesceneruntimebirth.ts', status: 'green', tier: 'fast', why: 'NativeSceneRuntimeBirth exact main event/site births, actual local geometry/population and campaign state, full cold original/current/local comparisons and partial effects' },\n  { probe: 'probe_nativesceneruntimeregistry.ts', status: 'green', tier: 'fast', why: 'NativeSceneRuntimeRegistry complete 36-row native order, carried local state and controllers, real-area original/classic/local dispatch and partial effects' },\n  { probe: 'probe_nativerescueanchor.ts', status: 'green', tier: 'slow', why: 'Actual retained rescue anchor identity, missing captive, valid commander and occupied peer boundaries.' },\n  { probe: 'probe_nativerescueanchorsource.ts', status: 'green', tier: 'fast', why: 'Exact reviewed undefined-boss guard, whole original source recovery and hostile mutations.' },\n  { probe: 'probe_nativehostclosuresource.ts', status: 'green', tier: 'slow', why: 'Exact composition of accepted main/host, birth admission, rescue guard and Titan receipt repairs with unchanged original source assertions.' },\n  { probe: 'probe_nativetitanreceiptsource.ts', status: 'green', tier: 'fast', why: 'Exact original Titan golden and complete reader retained through unused Actor defaults, canonical reference reindexing and hostile alias controls.' },\n  { probe: 'probe_nativescenetitans.ts', status: 'green', tier: 'fast', why: 'Complete native Titan controller over local geometry/population, retained wounds, terrain scars and hazards, exact cleanup and native partial failures' },\n  { probe: 'probe_nativescenearrival.ts', status: 'green', tier: 'fast', why: 'Original arrival safety and campaign lookups over full native geometry, live local census, native fallback paths and exact partial failures' },\n  { probe: 'probe_nativescenecoast.ts', status: 'green', tier: 'fast', why: 'Complete native coast, island and sea-port birth, shared campaign graphs, real chart hooks, retained discoveries and exact partial effects' },\n  { probe: 'probe_nativescenetheater.ts', status: 'green', tier: 'fast', why: 'Complete native ambient-activity births, all installed kinds, real pilgrims, retained live run hosts, exact defaults and partial effects' },\n  { probe: 'probe_nativesceneharbor.ts', status: 'green', tier: 'fast', why: 'Complete native harbor/quay services, carried shelves, gate and dressing state, whole-party landings and original partial births' },\n"
        }
      ]
    },
    {
      "file": "src/engine/questRescues.ts",
      "rawBeforeHash": "5a55dd92ba12cb647bcad7bbb05a2fa6900da69e9816a93627ecb307c1d10d09",
      "rawAfterHash": "9997eb09e1f6cccc85512d385def7a170788a139060b5e4f9e9ac93bd45acba7",
      "beforeHash": "5a55dd92ba12cb647bcad7bbb05a2fa6900da69e9816a93627ecb307c1d10d09",
      "afterHash": "9997eb09e1f6cccc85512d385def7a170788a139060b5e4f9e9ac93bd45acba7",
      "crlfLines": [],
      "hunks": [
        {
          "before": "    if (!npc) {\n      // A retained empty area may maintain its captive or use its real native\n      // boss anchor. It must not borrow a departed player's destination position.\n      if (w.isPresentLocalPlayer?.() === false) {\n        const bossId = w.zone.objective.kind === 'boss' ? w.zone.objective.id : undefined;\n        if (!w.actors.find(a => a.defId === bossId)) return;\n      }\n      npc = w.createMonster(r.npc, 1, 'player');\n      const bossId = w.zone.objective.kind === 'boss' ? w.zone.objective.id : undefined;\n      const boss = w.actors.find(a => a.defId === bossId);\n      const anchor = boss?.pos ?? w.player.pos;\n",
          "after": "    if (!npc) {\n      // A retained empty area may maintain its captive or use its real native\n      // boss anchor. It must not borrow a departed player's destination position.\n      if (w.isPresentLocalPlayer?.() === false) {\n        const bossId = w.zone.objective.kind === 'boss' ? w.zone.objective.id : undefined;\n        if (bossId === undefined || !w.actors.find(a => a.defId === bossId)) return;\n      }\n      npc = w.createMonster(r.npc, 1, 'player');\n      const bossId = w.zone.objective.kind === 'boss' ? w.zone.objective.id : undefined;\n      const boss = w.actors.find(a => a.defId === bossId);\n      const anchor = boss?.pos ?? w.player.pos;\n"
        }
      ]
    }
  ],
  "readers": [
    {
      "file": "balance/nativeMainHostCompositionFixture.ts",
      "before": "c02f5f0a5cd2c7696a1e518008b86f8495eb20cbc63b5a9b57ae7461fb517832",
      "after": "42a68c4ebaf15c69fd337b67f1f5c384f7fa6278981e829ebabe84f1e73c91bb",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import * as fs from './nativeHostClosureFS';"
        }
      ],
      "original": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport {nativeMainHostCompositionArchive as archive,type NativeMainHostSourceRow,type NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';\nexport type {NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';\nconst hash=(s:string)=>createHash('sha256').update(s).digest('hex'),normal=(s:string)=>s.replace(/\\r\\n?/g,'\\n');\ntype Row=NativeMainHostSourceRow;\nconst lanes=new Map<string,Map<string,Row>>(Object.entries(archive.lanes).map(([lane,rows])=>[lane,new Map(rows.map(row=>[row.file,row]))]));\n/** Exact raw predecessor selection before the unchanged package source readers. */\nexport function beforeNativeMainHostComposition(lane:NativeMainHostSourceLane,file:string,input:string):string {\n const rows=lanes.get(lane);assert(rows,'Unknown native main/host source lane');const row=rows.get(file);if(!row)return input;\n let source=normal(input);if(hash(source)!==row.beforeHash){\n  assert.equal(hash(source),row.afterHash,'Native main/host source differs from its exact reviewed predecessor or combined source: '+lane+'/'+file);\n  for(const h of row.hunks){assert.equal(source.split(h.after).length,2,'Unique native main/host source hunk: '+lane+'/'+file);source=source.replace(h.after,h.before);}\n  assert.equal(hash(source),row.beforeHash,'Complete native main/host source predecessor: '+lane+'/'+file);\n }\n let line=0;return source.replace(/\\n/g,()=>row.crlfLines.includes(line++)?'\\r\\n':'\\n');\n}\nfunction sourceKey(file:fs.PathOrFileDescriptor):string|undefined {\n if(typeof file==='number')return undefined;\n const value=typeof file==='string'?file:Buffer.isBuffer(file)?file.toString():fileURLToPath(file);\n return path.relative(fileURLToPath(new URL('../',import.meta.url)),path.resolve(value)).replaceAll('\\\\','/');\n}\nfunction reader(lane:NativeMainHostSourceLane):typeof fs.readFileSync {\n const read=(file:fs.PathOrFileDescriptor,options?:BufferEncoding|{encoding?:BufferEncoding|null;flag?:string}|null):string|Buffer=>{\n  const raw=fs.readFileSync(file,options),key=sourceKey(file);\n  if(key===undefined||!lanes.get(lane)!.has(key))return raw;\n  const encoding=typeof options==='string'?options:options?.encoding;\n  assert(encoding==null||encoding==='utf8'||encoding==='utf-8','Native main/host source projection requires UTF-8 or raw bytes');\n  const before=beforeNativeMainHostComposition(lane,key,Buffer.isBuffer(raw)?raw.toString('utf8'):raw);\n  return Buffer.isBuffer(raw)?Buffer.from(before,'utf8'):before;\n };\n return read as typeof fs.readFileSync;\n}\nexport const readNativeMainHostHost94=reader('host94');\nexport const readNativeMainHostMain99=reader('main99');\n",
      "nonImportHash": "51bd2bf328bb6b2bf49f158c7b6847357cc62665dc2de3b7f199ab23e6658a9c",
      "assertionHash": "70654836f8bb075c7af5f4180a685b21b59965eaa7d06306d3969baf08511e13",
      "assertions": 5
    },
    {
      "file": "balance/probe_nativemainhostcompositionsource.ts",
      "before": "0aaaa44d6c3afc7becb1a126e695f3735d848408ff201d15e56438c2e10e08e7",
      "after": "9c54a7f529a22f528cdd5357d833de316737247a5bf34c0a7e0a52e8c760ad05",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import * as fs from './nativeHostClosureFS';"
        }
      ],
      "original": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\nimport * as fixture from './nativeMainHostCompositionFixture';\nimport {nativeMainHostCompositionArchive as archive,type NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';\nconst hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex'),normal=(text:string)=>text.replace(/\\r\\n?/g,'\\n'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');\nlet rows=0,mutations=0,duplicates=0,eol=0,wrongFiles=0,rawReads=0,assertions=0;\nfor(const [name,entries]of Object.entries(archive.lanes)){\n const lane=name as NativeMainHostSourceLane,project=(file:string,text:string)=>fixture.beforeNativeMainHostComposition(lane,file,text),symbol=name.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(''),rawReader=(fixture as unknown as Record<string,typeof fs.readFileSync>)['readNativeMainHost'+symbol];\n for(const row of entries){const source=read(row.file),before=project(row.file,source);assert.equal(hash(source),row.rawAfterHash);assert.equal(hash(before),row.rawBeforeHash);assert.equal(project(row.file,before),before);rows++;\n  for(const variant of [normal(source),normal(source).replace(/\\n/g,'\\r\\n'),normal(before),normal(before).replace(/\\n/g,'\\r\\n')]){assert.equal(project(row.file,variant),before);eol++;}\n  for(const version of [source,before])for(const at of [0,Math.floor(version.length/2),version.length]){assert.throws(()=>project(row.file,version.slice(0,at)+' unauthorized '+version.slice(at)),/exact reviewed predecessor/);mutations++;}\n  assert.throws(()=>project(row.file,source+source),/exact reviewed predecessor/);duplicates++;assert.equal(project('outside/'+row.file,source),source);\n  const other=entries.find(r=>r.file!==row.file&&r.afterHash!==row.afterHash&&r.beforeHash!==row.afterHash);if(other){assert.throws(()=>project(other.file,source),/exact reviewed predecessor/);wrongFiles++;}\n  const file=new URL('../'+row.file,import.meta.url);assert.equal(rawReader(file,'utf8'),before);assert.equal(rawReader(file,'utf-8'),before);assert.deepEqual(rawReader(file),Buffer.from(before));rawReads+=3;\n }\n}\nfor(const row of archive.readers){const source=read(row.file);assert.equal(hash(source),row.afterHash);let before=source;for(const edit of [...row.edits].reverse()){assert.equal(before.split(edit.after).length,2);before=before.replace(edit.after,edit.before);}assert.equal(hash(before),row.beforeHash,'Complete original reader '+row.file);\n const tree=ts.createSourceFile(row.file,source,ts.ScriptTarget.Latest,true),nonImports=tree.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(tree)),calls:string[]=[];assert.equal(hash(JSON.stringify(nonImports)),row.nonImportHash);function visit(n:ts.Node):void{if(ts.isCallExpression(n)&&/^(assert(?:\\.|$)|must$|check$)/.test(n.expression.getText(tree)))calls.push(n.getText(tree));n.forEachChild(visit);}visit(tree);assert.equal(calls.length,row.assertions);assert.equal(hash(JSON.stringify(calls)),row.assertionHash);assertions+=calls.length;\n}\nfor(const row of archive.archives)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Original historical archive '+row.file);\nfor(const row of archive.runtime)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Actual combined runtime is untouched '+row.file);\nassert.throws(()=>fixture.beforeNativeMainHostComposition('unknown' as NativeMainHostSourceLane,'outside','text'),/Unknown/);\nconst binary=new URL('./reports/native-main-host-composition.bin',import.meta.url),bytes=Buffer.from([0,255,13,10,128,254]);fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(binary,bytes);for(const name of Object.keys(archive.lanes)){const symbol=name.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(''),reader=(fixture as unknown as Record<string,typeof fs.readFileSync>)['readNativeMainHost'+symbol];assert.deepEqual(reader(binary),bytes);assert.equal(reader(binary,'utf8'),bytes.toString('utf8'));}\nconst result={lanes:Object.keys(archive.lanes).length,rows,mutations,duplicates,wrongFiles,eol,rawReads,readers:archive.readers.length,assertions,archives:archive.archives.length,actualRuntime:archive.runtime.length,unknownLaneRefused:true,unrelatedBinaryPreserved:true};fs.writeFileSync(new URL('./reports/native-main-host-composition-source.json',import.meta.url),JSON.stringify({result,receipt:hash(JSON.stringify(result))},null,2)+'\\n');console.log(JSON.stringify(result));\r\n",
      "nonImportHash": "3686d7528d9af948816c71d68a1ea1d9fd98ae87a945fc7439b87fc4fdae05dd",
      "assertionHash": "d9bf1ebafef6c0ebcb53a220c446101f6d49f7b0dc4d81e235e3cc16e9c8631a",
      "assertions": 22
    }
  ],
  "archives": [
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "sha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "sha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "sha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "sha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
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
      "file": "balance/nativeCaravanCompositionArchive.ts",
      "sha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4"
    },
    {
      "file": "balance/nativeCaravanExtractedReadArchive.ts",
      "sha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "sha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
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
      "file": "balance/nativeMainHostCompositionArchive.ts",
      "sha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84"
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
      "file": "balance/nativeNearScaleSelectionArchive.ts",
      "sha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5"
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
      "file": "balance/nativeRescueAnchorArchive.ts",
      "sha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
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
      "file": "balance/nativeShardKeeperArchive.ts",
      "sha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "sha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardMusterArchive.ts",
      "sha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837"
    },
    {
      "file": "balance/nativeShardPublicationArchive.ts",
      "sha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "sha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "sha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "sha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardsLegacySourceArchive.ts",
      "sha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd"
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
      "file": "balance/nativeTitanReceiptArchive.ts",
      "sha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
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
    }
  ],
  "runtime": [
    {
      "file": "launcher/branches.cjs",
      "sha256": "718dae6828bd1d4b83f005ebdba09d72ee44a144cc9a573079ff52c043abafac"
    },
    {
      "file": "launcher/launcher.html",
      "sha256": "c4ba5c7af067d2b80dda79e979f08ab6595e5c98732ef0249a32009c1d4d1a11"
    },
    {
      "file": "launcher/main.cjs",
      "sha256": "0eb48011fa3ce406f3a846ba91d5b4e540b6aea164a62f78da6601e2fe02562b"
    },
    {
      "file": "launcher/perf-preload.cjs",
      "sha256": "d1c4a4b60fef5fe2765d275fce1012fc416c2eb3fbc139669ceaf7bcdcd74c3a"
    },
    {
      "file": "launcher/perfdeadman.cjs",
      "sha256": "9570dbe71924058b10ad06e264675d22347d961ba9a390a2ec6f9d233161ec89"
    },
    {
      "file": "launcher/preload.cjs",
      "sha256": "d4e1bd342350ffabb225d024fdf646e83c400d4bd546999852c44c487c6fabdc"
    },
    {
      "file": "launcher/saveWriteOrder.cjs",
      "sha256": "9b2b1b28cb3d69b3c8fd4f8ab4610e9d3b6e3f3a1fe6ba5b9fac696bf3fae2bf"
    },
    {
      "file": "launcher/server.cjs",
      "sha256": "272a2fd428424eb652fc7a50e4b3ff95416ae150fccf18264a4ecd0f0e3e51d7"
    },
    {
      "file": "launcher/updates.cjs",
      "sha256": "aa54b5866793757b30427d3e58545969c7bbcd52c2cdb0af90371663c31b2694"
    },
    {
      "file": "server/corpses.ts",
      "sha256": "916f3d66adc0a9b3090bc368b12fba2267f4c521aaa88b53f8f9f9c20cd58ace"
    },
    {
      "file": "server/massCompiler.ts",
      "sha256": "01b3ceeb8890ee7ef71ad230573d12b96c0c26177edbb3435f1384dc0d96472e"
    },
    {
      "file": "server/massWorkerBootstrap.mjs",
      "sha256": "8daf95b5fa06c72c3ffb407a9aa3097514f027bd0872e432df8183c75994a42c"
    },
    {
      "file": "server/massWorkers.ts",
      "sha256": "44c71ab1f050c90303eca473b57e08ce549a65e2d1abc3474594ef74030942fb"
    },
    {
      "file": "server/muster.ts",
      "sha256": "95c4a357235b2af0364841c3df80a317cb0dfba9d06f3f81676fa034a5edfa27"
    },
    {
      "file": "server/musterAreas.ts",
      "sha256": "9771b9675a29ca1a01d3cdeef66a637f64ed11d7057697a77d243a9261e6b40f"
    },
    {
      "file": "server/nativeShardFrames.ts",
      "sha256": "1da068fd5ac46a45046ee3c10e563ec1e6cb7fd96ee5d38764b9249a856e46ca"
    },
    {
      "file": "server/nativeShardHost.ts",
      "sha256": "a9e3743f217950c44f38c4d1c9085b59242f9c0f725b13d9a630e97f9779a596"
    },
    {
      "file": "server/nativeShardMuster.ts",
      "sha256": "63b8a27919888e02a43a124a1a9eca8dd9d84704221276d5c75bfcef9ed4db38"
    },
    {
      "file": "server/nativeShardRuntime.ts",
      "sha256": "4a4bbf7bbca1b3a8fe4722c177acdd75daed9b0d3a4fd058ecb476224f3144ce"
    },
    {
      "file": "server/nativeShardSave.ts",
      "sha256": "2fbdf0df04ecad4e81b7a4261603ab22839a28c182d0781bee4c5f2b4ea2cef5"
    },
    {
      "file": "server/nativeShardSeats.ts",
      "sha256": "df3ecb5cc5957388135319204212577e88172830637c0ee512b0ad79e57c2f4f"
    },
    {
      "file": "server/nativeVesselAreas.ts",
      "sha256": "3e117d20a3a1fc2ef01f6a8443b8bf49fce26b7af69b1aa742fc26f7b4fa9b5b"
    },
    {
      "file": "server/party.ts",
      "sha256": "e76cc3a1bbbe4995c2d203283b84bf91c8984c4d9b0d43023031d28640f71757"
    },
    {
      "file": "server/shard.ts",
      "sha256": "583e2b94445bb8356207ef813a34fb9278286f9b044e80d335c539cc81043e86"
    },
    {
      "file": "server/shardHost.ts",
      "sha256": "c68ff10fb98613b10375303a5ced657f0fc276999860a0033a88ca3cafc8e0f2"
    },
    {
      "file": "server/shardTransport.ts",
      "sha256": "5bde6ae3f270072b148e7514abdbb39c930f110ddb45b57e1af3b755e9c842ce"
    },
    {
      "file": "server/simUnits.ts",
      "sha256": "d7ee9a7fbd4b9b1d59c166b29500312eddf1102c5ba99be52e25db59dd535b27"
    },
    {
      "file": "server/vessel.ts",
      "sha256": "85ef2228a6cb8a81898c7ef9b8820557e725dd9ba381779513829fc24f3e09bf"
    },
    {
      "file": "server/wildsSave.ts",
      "sha256": "a68db81ea39c2e6b1e5a4ea292fb4702a7972fe1ddeb1fb8b219eb58c7664f18"
    },
    {
      "file": "server/wireDiet.ts",
      "sha256": "007c3e22832d896e775942be2a963d110ced68e2a5d34425c33054ba520666b5"
    },
    {
      "file": "src/agent/agent.ts",
      "sha256": "584b0cf888db6ad7310c2b1a8585ae538ce17a6a7c1799f812a81cfe2d49ec08"
    },
    {
      "file": "src/agent/kit.ts",
      "sha256": "feabac10f73fdc2b8c27218e04d9c2164d8340bd6e9758b2d81dba252b1b486e"
    },
    {
      "file": "src/agent/perception.ts",
      "sha256": "f40f1ae37d1862c44a60502b45929ba9a6aa668b9d077424cb2079886f616027"
    },
    {
      "file": "src/buildProfile.ts",
      "sha256": "b26670ae991e4435413474cd22e3153458b171ec6ec684889894d1aad45fb608"
    },
    {
      "file": "src/config.ts",
      "sha256": "4d00a37f54d5e4938943b9434a165c3ab8fa383bb97c55b6e6c3360de82a6932"
    },
    {
      "file": "src/core/cursor.ts",
      "sha256": "bf23abeb79a10077c57051caa7d4ad365719de09cf540cf62ff336d053de1ec1"
    },
    {
      "file": "src/core/cursorGlimmer.ts",
      "sha256": "a2cfa8357052a71ee136a8ce23f6c1e9b239f08efac15fbda27c13b62eb26ed2"
    },
    {
      "file": "src/core/cursorMotion.ts",
      "sha256": "6465aebb76342b321dd58fc3e6acae13323f6b15fc6ef9d4eb858148d57af3a8"
    },
    {
      "file": "src/core/cursorWisp.ts",
      "sha256": "dab12c6bd3eb04b51cb2a2c75ee8cb86a987150c0dc51c193bac9ec263dc8ba1"
    },
    {
      "file": "src/core/gamepad.ts",
      "sha256": "a8f83cf2e47540dd2fe0d884b309e1019d993d75512e5d14fcb98d2b49455b57"
    },
    {
      "file": "src/core/input.ts",
      "sha256": "ae01b99da03b64bcd0b70e053e7e5429b8a139bfaf6d8878fe39ccf98b392e36"
    },
    {
      "file": "src/core/math.ts",
      "sha256": "61879e2db45a922543fe26fe1e5cfb34cf7d472612e13f62085ed9f6e644c57b"
    },
    {
      "file": "src/core/rng.ts",
      "sha256": "56c80fddef28721e7196928fd1f097b1b8d0cf5b080f21ef309ea2eff692c0fd"
    },
    {
      "file": "src/core/scriptedInput.ts",
      "sha256": "fcf46c7e26143a9e30263752b6c672d6fc25f34de768ad9c7b5a61ca577af155"
    },
    {
      "file": "src/data/abyssGlyphs.ts",
      "sha256": "b306f4248eafc5b8143a2a345486f7ea189b212a17d841c731a574d066df68be"
    },
    {
      "file": "src/data/abyssLooks.ts",
      "sha256": "01545fd7a007ee44b607831238e41683536660a5c87b0ce6a64ad9de6f3f57d9"
    },
    {
      "file": "src/data/abyssMonsters.ts",
      "sha256": "ed25a82cbe3f61d4ea0defa69f3e4d3e6cb01590cc90cf15fa646f63039ea2d2"
    },
    {
      "file": "src/data/adventureGrammar.ts",
      "sha256": "2ed3f4d20ed9075ac500e53cf0317bdd9dc2d74f26f726afe264e21b3afbf7c3"
    },
    {
      "file": "src/data/adventureLocales.ts",
      "sha256": "14d43ee0e3093c2fcb1d7eb0fe1aa6347a4a7474defaa2c85319445b2ee9080a"
    },
    {
      "file": "src/data/afflictionCues.ts",
      "sha256": "5778b814ab4dd33a7ae462a5215d7ade532f42f839989d1c0f94786f1c2e8b13"
    },
    {
      "file": "src/data/agent.ts",
      "sha256": "55fc395d3926b423661675700a4c520b38216b0744249d1c2016525a0233ac29"
    },
    {
      "file": "src/data/anatomyCues.ts",
      "sha256": "87ba88d87a6eca8d797383afb6789c64f625221cfb67f988bf895349ffff0c5f"
    },
    {
      "file": "src/data/annexes.ts",
      "sha256": "228a5cdf6ee7d3bf02fc034b4885509f063b25aca5d3e8506987b2204f8330dc"
    },
    {
      "file": "src/data/arachnidCosmetics.ts",
      "sha256": "7928ef7d05e138dce6e2e14bf63b60b136b8eeb29c9f6376f84e8d5f0213c831"
    },
    {
      "file": "src/data/arachnidGlyphs.ts",
      "sha256": "6e9b10b1826545c031af7904c0d87bde56b3ee1c0c33cf0a3b144136f38d5061"
    },
    {
      "file": "src/data/arachnidLooks.ts",
      "sha256": "c033670d8c2cc8918742d3eb3eddbce785a3d6f510dff303841d7e9a8b689c03"
    },
    {
      "file": "src/data/arenaBosses.ts",
      "sha256": "837c61f6b3a0e4c6cf40d89c393b5b4d54d7c3192bef6ef1eca88d02945e819a"
    },
    {
      "file": "src/data/arenaBossHabitats.ts",
      "sha256": "c74042a1ab6b435a858eab47bfb42b17f5df5e7c8fcae3eba672fe0ba35ea4a7"
    },
    {
      "file": "src/data/arenaBossTilesets.ts",
      "sha256": "6897ff6d7a1f552c3ca7fc8887775cfc88a79847d89d9029d0970858596ee928"
    },
    {
      "file": "src/data/arenas.ts",
      "sha256": "94aff60ce668c3049e12a6b8e4159baa5b44f38516851d534633f906e0341699"
    },
    {
      "file": "src/data/armedCues.ts",
      "sha256": "2caf263de33ddd37827991183aaba12bff778e1a66771a18f9d4770cadf7425a"
    },
    {
      "file": "src/data/assaultTree.ts",
      "sha256": "508cbb076f35fd7f22885da614be38e9b83be79a51c2f655706c3ff64dff901e"
    },
    {
      "file": "src/data/atlasFeatures.ts",
      "sha256": "3923804494a3f2902e7690a14dbbf854745c7c3eb289b3c04866730e381b269f"
    },
    {
      "file": "src/data/attunements.ts",
      "sha256": "db24b5fc08faf1d0ad7571254c00b929b11e5fd8f488d342fb39f20f8f6c9f7a"
    },
    {
      "file": "src/data/auroras.ts",
      "sha256": "fc7cf91614a6d0405d680d454b43d8fc3aba303039d467933c261cd17aa0a956"
    },
    {
      "file": "src/data/authoredMaps.ts",
      "sha256": "48246e75e75c874851cde37859e98ebeb8203b1f4c3b0bf9bddde393486cec3f"
    },
    {
      "file": "src/data/avianCosmetics.ts",
      "sha256": "de623db9ad96fc8dd9f9a91b4e07b753cbbd9cbc281d9798a06091bdcc80346c"
    },
    {
      "file": "src/data/avianGlyphs.ts",
      "sha256": "9840aa6495b8634db0ce6971a8ea641b4ab495fb6725ccdcdbc24574dec392cb"
    },
    {
      "file": "src/data/avianLooks.ts",
      "sha256": "450d6f973d231ae45d03ea44dda3bb149bb32b774018f5c8a01e1277a7233cf4"
    },
    {
      "file": "src/data/bastionStarterTrees.ts",
      "sha256": "cb82cb868f7f93fa9879c0716210d0d44b593ea1c35d3ea96b19a4ac10b22134"
    },
    {
      "file": "src/data/beacons.ts",
      "sha256": "606ad442e1707e8bb202d946c71d074fa8308992d5da6d14d82634b8e15859b4"
    },
    {
      "file": "src/data/beastFamilies.ts",
      "sha256": "5b201b71a3a32284b5179a1199f2fd6578d488c25de001716df2fe1635af8b0b"
    },
    {
      "file": "src/data/bestiary.ts",
      "sha256": "fb206d4b7eb399da46b10e51c6e37f76ceab9887fa59258716d9d953f2c00054"
    },
    {
      "file": "src/data/bodyAction.ts",
      "sha256": "2ad8d129b8236eca3a8f383983a738dfa0a1c489b4dcc43bc9e0216a786e6fc7"
    },
    {
      "file": "src/data/bodyWalk.ts",
      "sha256": "1934d62d23d37e6f7a6189148dabb795e1ce0fcea7c728224a00a9ceace5486e"
    },
    {
      "file": "src/data/bondStarterTrees.ts",
      "sha256": "328f429cab41267e37a3aec6bc9a88c4bc11006dbef47fee8f863719ef7265a4"
    },
    {
      "file": "src/data/boroughs.ts",
      "sha256": "eb61e83ec38a85ba2664338faac8075c7dadb4f3e0c78f93f714af5afb7f86df"
    },
    {
      "file": "src/data/boundaryGates.ts",
      "sha256": "1fbb8c440b6b0b03e481f62a5cbe91e793a818c1aaa8f2ae5e80428a8c811967"
    },
    {
      "file": "src/data/bounties.ts",
      "sha256": "a237e19e27c1995fec22f2f94aec533849ae4b56b724060c1c091808b7efcfb4"
    },
    {
      "file": "src/data/bountyboard.ts",
      "sha256": "9f2240b56e75c9bd22f9d9318e1889504a8f6504069b9499910345e202c7d2fa"
    },
    {
      "file": "src/data/bountyExpeditions.ts",
      "sha256": "1241a2114628c221f414e5a8f604a533678f553e5ada6e57d573ab837acd45b7"
    },
    {
      "file": "src/data/bountyJourneys.ts",
      "sha256": "428668fb433d9e5750a4fecb0bf409201e66566e5250e639c07b38e2d0207fd9"
    },
    {
      "file": "src/data/bountyRewards.ts",
      "sha256": "350ac4a82ac57e26908897b757767288ada44ed87f563b3dad40ae32def70261"
    },
    {
      "file": "src/data/brandt.ts",
      "sha256": "7a80d8b94fddf7385570128a6cec05af52affff601e4fc183730757fee2f5585"
    },
    {
      "file": "src/data/canineCosmetics.ts",
      "sha256": "59a4ba16246b85db0a36662d37d36035e71046461cf8301d74d3e96f8e931839"
    },
    {
      "file": "src/data/canineGlyphs.ts",
      "sha256": "7601d04cb2585d4f04ff6e400389a469314748a130a8428883166f8f5be6dae1"
    },
    {
      "file": "src/data/canineLooks.ts",
      "sha256": "6d083a4c7fa06c90311485ad42aa091ee7589abb7b2f219e08b52e4766eea76e"
    },
    {
      "file": "src/data/caravan.ts",
      "sha256": "7d8a8292b941688a08f22deb117c139ae24d736122c024ec48284d9b200d3e51"
    },
    {
      "file": "src/data/casterGlyphs.ts",
      "sha256": "f1f9b10e0eeacb0256e3d230e9f09cd964dde127fa2d67bc371a2847368da154"
    },
    {
      "file": "src/data/casterLooks.ts",
      "sha256": "a3a706296da24dc342f80190c58fb1a95879e797ebca1666dccefb70335dfd10"
    },
    {
      "file": "src/data/casterMonsters.ts",
      "sha256": "9b2432a077d166a880a53157cfa0b5f9741db4ff740bfb2e6afd7f52aa335101"
    },
    {
      "file": "src/data/castingCues.ts",
      "sha256": "a93fc775260440fdc1c9de5fd019f659bba0dc53d9bc581fa9fef2cdfd640093"
    },
    {
      "file": "src/data/catacombs.ts",
      "sha256": "c23d13270e2074de4c0a26d0d62966342ddd89c564ba55b58e71885ed36a3d22"
    },
    {
      "file": "src/data/cistern.ts",
      "sha256": "c0b610cf074a8c310da295072cd779fa517025e6500eeea1f83892053a449030"
    },
    {
      "file": "src/data/classdeeds.ts",
      "sha256": "dbb962e9b45825a52e3f100f1a76b2bced01068b7cef4e0ef72ace4d9cc1ee9d"
    },
    {
      "file": "src/data/classes.ts",
      "sha256": "509cdc843de3694e0a62e65a2f7fec3f1385a17343c427dd668ff31d3e36a981"
    },
    {
      "file": "src/data/classTiers.ts",
      "sha256": "c7966e855ef0724d63593cc409cc27aff765ec9ae4060b343a4d9bdd89463c26"
    },
    {
      "file": "src/data/cleaveTree.ts",
      "sha256": "ac34a3ee3f83012c93ba2a40bc5f91f8a11aaca64386712950a03fd5250c4afd"
    },
    {
      "file": "src/data/clusters.ts",
      "sha256": "d549a673a9c5012443dec2e314dfba12d26e5de4cabb71994dc507880adfa587"
    },
    {
      "file": "src/data/combatCues.ts",
      "sha256": "fa5de2b8b6b49b09935cf6370d7625e7370073b6db42fc5820d85a745f32f242"
    },
    {
      "file": "src/data/combatReadability.ts",
      "sha256": "2c53be8449eb6a099cb8a8c2f6521a0cbdaa54c4948bdbe47d30dd859311b7a7"
    },
    {
      "file": "src/data/comboConditions.ts",
      "sha256": "a45b67cbfc5f74255ccd22ac8755193c1ccc3f916f2410ac5abeadfebfda38c1"
    },
    {
      "file": "src/data/comboCues.ts",
      "sha256": "9c1935762a258dd99c0c58978563ade2d3a58ee5f37f4b78ded692403adc3632"
    },
    {
      "file": "src/data/combos.ts",
      "sha256": "5a46b99558bd2b7f073380e014fa935e1d8b5b1e696eb2fb0d4c88a324e9393c"
    },
    {
      "file": "src/data/commanders.ts",
      "sha256": "5539988577465593ae3fe5ac7022b67003baba43733cb441ead1cfe6898cd1f9"
    },
    {
      "file": "src/data/companionCues.ts",
      "sha256": "df3cc6cd16b23b12a28a50618f4b7f757086efc4e773ab0dcb6c26bfa9a18ef9"
    },
    {
      "file": "src/data/companionSkills.ts",
      "sha256": "bfa28efe4e605b7171955a95387e99b1221204369806307ca1f465d59ea9d1a5"
    },
    {
      "file": "src/data/companionStances.ts",
      "sha256": "612c95af3a7e8696f5d186757a76cb050ee25cfc04314876fb9bfe5bde975cf2"
    },
    {
      "file": "src/data/complexLocales.ts",
      "sha256": "2244a243a0faa43f2251d133f990f441792b4a481c01e1317020929cb12261fc"
    },
    {
      "file": "src/data/compositions.ts",
      "sha256": "9f1d0c6942654b0a925dbceac0b40401b02f51e1965cefe20dc2d545eba3bb90"
    },
    {
      "file": "src/data/conjury.ts",
      "sha256": "838a8eb29fa364903e9fe9d40f1ac656801c250fe6291c6ca778717602446f9b"
    },
    {
      "file": "src/data/containerloot.ts",
      "sha256": "5311ccc67f4ecfcc84dc7b4622fe58d33ca320e0cb3d71c7194ba448ee4c1df4"
    },
    {
      "file": "src/data/containers.ts",
      "sha256": "d2edff3776ea3bcdf6ba8412f69364e988fd212549f0f4cf7e35a3afc57f21d7"
    },
    {
      "file": "src/data/controlStarterTrees.ts",
      "sha256": "1894619aa0bbac27b5475653fdf4da908ea92bc496fc8b9c3218991f6b76effc"
    },
    {
      "file": "src/data/coop.ts",
      "sha256": "56ba73cc40be92a714a3f9575bd6734a90df8fce6f956dafbe2e25cf0f7e294f"
    },
    {
      "file": "src/data/cosmeticExpansionGlyphs.ts",
      "sha256": "543b15d61ba08e1eba1bdf76b9da5d01af02c857a7b88dca0b54a5c37bbb1c62"
    },
    {
      "file": "src/data/cosmeticExpansionModels.ts",
      "sha256": "94b260db90267aee26e00a3022096192b2ae59d0941ef7d4c74a79e47458db45"
    },
    {
      "file": "src/data/cosmeticGlyphs.ts",
      "sha256": "68dd4a230174eb0da9945b6a5077700653f93ea12a71b3b732d6f8ed9ea09912"
    },
    {
      "file": "src/data/cosmeticModels.ts",
      "sha256": "6328efcc14b9a24c0c1bb17edb82f70ad38d4952076fc8b0a5f3d1d62de13b4f"
    },
    {
      "file": "src/data/cosmetics.ts",
      "sha256": "d31281a4284427999b6a1098355dc030077db443b21cf7aef42a42e4ac0800a6"
    },
    {
      "file": "src/data/cosmeticStyles.ts",
      "sha256": "41a0b2764b61519c9bb05b6912c11f3b0ba156853e2ee5109bab04864111a268"
    },
    {
      "file": "src/data/couch.ts",
      "sha256": "090b4eac5a57f43cb6295d235c0f6c9a5bd39f4438800031c9cbae3c7a203faa"
    },
    {
      "file": "src/data/courtGlyphs.ts",
      "sha256": "d30a1c887f0e25c6cb371a298dc677075dc812f08a5e15575ac6e772c8ebac15"
    },
    {
      "file": "src/data/courtLooks.ts",
      "sha256": "ea7a934c5a03e443cbacc266a9ac30ed140f86d4be2818435788fc40e3fc1412"
    },
    {
      "file": "src/data/courtMonsters.ts",
      "sha256": "2f6928e48fed357f361f22e3a694e6914154538b619e20220fc3c97c6ec9d517"
    },
    {
      "file": "src/data/creepers.ts",
      "sha256": "35bf36244136906ea7098d2b30920051e9884f65fcb33a45b755fd330927d8d8"
    },
    {
      "file": "src/data/creeps.ts",
      "sha256": "f716fdd5eb77dfb25be17e9b35513653e20a48a4f294f62cf280d97f1d6dbf66"
    },
    {
      "file": "src/data/deathPresentation.ts",
      "sha256": "d929aa41f610906a59dfbeaf0317351119e827f31a84303e8e404fa7e9793eea"
    },
    {
      "file": "src/data/defenseCues.ts",
      "sha256": "121489c008b42215d84976bace2ef63e914f723dcaf9ee0c0bdaa0fe0a722cc8"
    },
    {
      "file": "src/data/demonGlyphs.ts",
      "sha256": "c53b7e9c1cdd8595dc3ca0a3921a47f8baa051b0500f091577e90c3fd49c350c"
    },
    {
      "file": "src/data/demonLooks.ts",
      "sha256": "2638267a12c73a9ffef7bbca986b0ed8e550155779cdbcd4637c0d3388e5e011"
    },
    {
      "file": "src/data/devotedStarterTrees.ts",
      "sha256": "b3af8a631dc2b63e23eab55a0704765dc5e4669ecbc0386f77cb7a27fa654b9f"
    },
    {
      "file": "src/data/dialogue.ts",
      "sha256": "ba28d4eedcda2292d6ec1e0fdec9ae06c499df7d5c35f6926c761b1f4d6decb5"
    },
    {
      "file": "src/data/digsites.ts",
      "sha256": "2c0528b9fba02d673bae1a45dfbb0353bb7110d2d6e731990f0e2adce651df27"
    },
    {
      "file": "src/data/disciplineStarterTrees.ts",
      "sha256": "744f3118b83530bfdd7b7c1dbb09d8b522d47d9880fa923f0c9af6a7c2ca6108"
    },
    {
      "file": "src/data/doodadVisuals.ts",
      "sha256": "87fa0fc153dd9714b4c9813d57c093829d004cafd39f5ae43c01520b18a0f593"
    },
    {
      "file": "src/data/duelistStarterTrees.ts",
      "sha256": "552ef47f63998911436a586d5f2eec4bd77504aa292011d2310ab3899571eb8b"
    },
    {
      "file": "src/data/encounterAdventurers.ts",
      "sha256": "e6441111337ec028fc403ff24c6d2f12d1b353e2fa6242cd906174f50dcf5e08"
    },
    {
      "file": "src/data/encounterGroups.ts",
      "sha256": "69782c25c8752dd9d248ee633823b4b9ed3d5dd27df2be3e513a4a063745b70e"
    },
    {
      "file": "src/data/encounterTactics.ts",
      "sha256": "775bb2cc5a5ef6dc8274c2311f08a5392a866de2275c9c3eb18ecd9d8c8e0f9a"
    },
    {
      "file": "src/data/essences.ts",
      "sha256": "5c33087be8a8580132b44b78eb949acc605aef06da63c43397db7c84a94161fb"
    },
    {
      "file": "src/data/exhaustionCues.ts",
      "sha256": "ba84a91a73bf1202587347b96a55f8efa0a729cea55cf1009e1ad8669aef6958"
    },
    {
      "file": "src/data/explorationLocales.ts",
      "sha256": "d709f426f2b8d49e80fe8ccdec2ff785220d5319d36fbefb8944297b6b242e91"
    },
    {
      "file": "src/data/extraction.ts",
      "sha256": "ce72cb94b56570c6d06fc066c1b7084a7325497ea51c8feef71d85f9aad6df98"
    },
    {
      "file": "src/data/featureActivities.ts",
      "sha256": "6b840a3c1fe95357a8c75e6ee0a8ce396b8a06e022c1e02cbb583daa89e026e8"
    },
    {
      "file": "src/data/feedingCues.ts",
      "sha256": "90d4e1ea348d94c2f723583cb4c913ae09cc27a99bb447058f54ff30570b9f56"
    },
    {
      "file": "src/data/flaskSkills.ts",
      "sha256": "ab925e6fed6fa7922383a859477684a8c5bfa1c8f48d342f0b47cf295b3dff23"
    },
    {
      "file": "src/data/flaskTrees.ts",
      "sha256": "558e8f87db67044464a0959c1936aeb8a527d884195662629ade76810e3b50de"
    },
    {
      "file": "src/data/fog.ts",
      "sha256": "ee660c721842ca49b700f97edcb9ffda6431e31dfd7d096b261c95de09864b4c"
    },
    {
      "file": "src/data/formations.ts",
      "sha256": "92ed7260471b88003899be8b7429c25a33937d800478825caebae9ef0d743276"
    },
    {
      "file": "src/data/frontierStarterTrees.ts",
      "sha256": "2b3a78eb5ba506003f9bc800dd8659b7f07a343766bbd3ff7ea09da5a1da5b1d"
    },
    {
      "file": "src/data/garden.ts",
      "sha256": "3ae120513afc500b173d3474cd8b2a904349fcd7595538c5a7486bf36b13764e"
    },
    {
      "file": "src/data/gateVisuals.ts",
      "sha256": "4d6a97fb617b72dd0170e02e28886222363930f6c0b1da0f0c145b714217053b"
    },
    {
      "file": "src/data/glyphParts.ts",
      "sha256": "3ab902ff5fbd364076b8ae0d2928f3783e71d698ceb05d4b4ac45a8c81fe0018"
    },
    {
      "file": "src/data/gnatveilTree.ts",
      "sha256": "b46e71344007a1f72b6a3c2b8a0884634d3554e177c676a2fb78b9fbccd1fdc0"
    },
    {
      "file": "src/data/goadSkills.ts",
      "sha256": "eaa46ecea490753350e207b4977d549f583165d7e48522a120fbebd810e0decb"
    },
    {
      "file": "src/data/goadTree.ts",
      "sha256": "b76612abd7a28942454cbbca04b7368be13175fe2e9ba7c00f2dd261871960b4"
    },
    {
      "file": "src/data/golemGlyphs.ts",
      "sha256": "ed15c0de21b12f0c837527379662623cab05c97849db0a7372a2760bf0e74af6"
    },
    {
      "file": "src/data/golemLooks.ts",
      "sha256": "6c58f2fac508deaf14dca14a83f458baf57ff504835d304a60502b2a181d849d"
    },
    {
      "file": "src/data/graftReadSites.ts",
      "sha256": "fbcb1d52e18bdf115743dc25de2eee78cca3bd01f1132e8577fe29061e30b530"
    },
    {
      "file": "src/data/greatgeyser.ts",
      "sha256": "edc3c167144ca515e7c3c206715a79abb385433cbfe49a83456180e68c5155ec"
    },
    {
      "file": "src/data/grove.ts",
      "sha256": "2982cd312be7a0bcbf2d3ba011a51fedc151f005e0d51614d6813134e340d24a"
    },
    {
      "file": "src/data/guardians.ts",
      "sha256": "92f5a44dec3d17347b518078a9ae71211b6b00c8e956ead868f88a2aee94763c"
    },
    {
      "file": "src/data/harborholds.ts",
      "sha256": "16e600f420c83a6219afff89861c75b05d9663f4d049ca6d2a32d92bbc7388c6"
    },
    {
      "file": "src/data/harvest.ts",
      "sha256": "8186584361c93e23e40871f382b3062cee2ae114a546dfa5bb4f70396af45161"
    },
    {
      "file": "src/data/hivecall.ts",
      "sha256": "a8d2e049c4ada008474d673baf9f9b39f4f83ad247191b6169f9690571be2e88"
    },
    {
      "file": "src/data/hollows.ts",
      "sha256": "6e10578fb3fb15339ef48cfcc5f239fd97f8a90cea817f65feddea3ffd570f5a"
    },
    {
      "file": "src/data/identityCues.ts",
      "sha256": "c4902c577774766b552fa8a011c1df85db0957b26351056d7216535370af0d96"
    },
    {
      "file": "src/data/impactStarterTrees.ts",
      "sha256": "1dffc9912869eff83a4b59e865db6191417aed4a097c7580d444499058080b0f"
    },
    {
      "file": "src/data/impaleCues.ts",
      "sha256": "4df2f6a9ef8ca10646a1efd74f6d6d66af9c000c062aace2486545aae0c856f5"
    },
    {
      "file": "src/data/infrequents.ts",
      "sha256": "74c1c6077760424a02ee03111fadfda0f021bd71c364cb2c4df2ace9fad8ea71"
    },
    {
      "file": "src/data/innfolk.ts",
      "sha256": "cc102d74336b926884be1c9105462dd7d8e8a101c77114fc6dfe075c74b14cdc"
    },
    {
      "file": "src/data/invocations.ts",
      "sha256": "3790f118e1dc5373dc5ab8b09572004b6e09f30ed8baed92f9954dc568be7e9a"
    },
    {
      "file": "src/data/itemaffixes.ts",
      "sha256": "e74990e2ed2e267a32ee20762a97ceebc2da24792a22e8020f208c4d8d00a751"
    },
    {
      "file": "src/data/itembases.ts",
      "sha256": "aa6b03c40f1b2b8be35cf99187ac16f1db06e07fa4368003f879642d549f7274"
    },
    {
      "file": "src/data/kinshipGlyphs.ts",
      "sha256": "87d713c60e6c965999ae35cfe46f586403051ef9915aa0185575b68614d5b386"
    },
    {
      "file": "src/data/kinshipLooks.ts",
      "sha256": "6085aee2c6a195f3b9a896c835c2b4da43014405cfed1ece807a2ecf5105ddc0"
    },
    {
      "file": "src/data/kinshipMonsters.ts",
      "sha256": "c4e73664c7b1728f0d56c9db13a12273545a41a0eb12b75718f471f39ffcbf39"
    },
    {
      "file": "src/data/lairs.ts",
      "sha256": "65a656186a1ae03c780c94f147c758ffdcccad06d497bcba37d2cb1b76d4bb00"
    },
    {
      "file": "src/data/landformFeatures.ts",
      "sha256": "8c2c4d0a22efae6a45451a3ea93b4bdfdbd0a99b2dd5dff6043bb8b659d62e49"
    },
    {
      "file": "src/data/landformLocales.ts",
      "sha256": "1c8a88b16f154c939173192ad781ec098d7516dd9d6904cd63ec87ef588343b5"
    },
    {
      "file": "src/data/landmarkComplexes.ts",
      "sha256": "87d66799ec6e501c078b9c1595cbf1d2c299f797e0de6cdc8e9e61fcb2468055"
    },
    {
      "file": "src/data/landmarks.ts",
      "sha256": "616bf9762251956d08696912d524c5ac160bfbb1dec2ef887e5f2913cf37b317"
    },
    {
      "file": "src/data/leyline.ts",
      "sha256": "da650131731357279209eb608797e2b1ec4b94b86dd1418249029c1742459085"
    },
    {
      "file": "src/data/lightningVisuals.ts",
      "sha256": "31b96944c8e17a42af19acdf73036a683e3185fba3e126f3e8a0334385c57c88"
    },
    {
      "file": "src/data/lightwells.ts",
      "sha256": "310ecb481cd02f302fdacd8ff2a4da9f075ce9712d841773d68fcdfe50b454d1"
    },
    {
      "file": "src/data/livingSkills.ts",
      "sha256": "a9fea7fce949bdcec0385f8106105efa32963a6f8b613ea6c89ebb8c70184915"
    },
    {
      "file": "src/data/localeFragments.ts",
      "sha256": "85fb226342afef73432a9a4c5ea97a28ce512472c1b13ab886ccf0c234567c0a"
    },
    {
      "file": "src/data/localeMaterials.ts",
      "sha256": "56d1af1a4b72946187a63058f1f66ca3c8161f99d948b00bb1bee62b95ab40bf"
    },
    {
      "file": "src/data/locales.ts",
      "sha256": "b3f464f2386288d4964d2967d89bbb528db0146132f6582a9e0a2d9338302d53"
    },
    {
      "file": "src/data/lonecrypt.ts",
      "sha256": "7e1e3f613b51843e372140e84a0b911482926b188fbd28133698490b8b22b85a"
    },
    {
      "file": "src/data/looks.ts",
      "sha256": "ea3f7a56ccce9466e9932bfb5a10878c86b94a9678da36ea08924df6d4accbc5"
    },
    {
      "file": "src/data/loottables.ts",
      "sha256": "7acb51901ac3685867776d608de080f8ab208a7ec5c1159e3593bfc5dce7b7a3"
    },
    {
      "file": "src/data/magicPacks.ts",
      "sha256": "74f6585d626870870995f9e4a33abcbf025610534d722c58cb9521b703b57c09"
    },
    {
      "file": "src/data/magicPackSkills.ts",
      "sha256": "a1bbf9827510a728b1191310fcaf59817c9e6ac6127062fa9075f38538d1b861"
    },
    {
      "file": "src/data/massifs.ts",
      "sha256": "71a63ab3c3d2fe6ded51d905149ea1f84ac1dcb0d67364f3447f07a2017d5944"
    },
    {
      "file": "src/data/melds.ts",
      "sha256": "a935f751af0d353560ee8ad72178ace630775cd43e5875a577f4806b983989bb"
    },
    {
      "file": "src/data/memoryUnlocks.ts",
      "sha256": "159750cba86358bdf2e923d102d23b7fb6d5a2884c3eba6f9f064cbca24e3e16"
    },
    {
      "file": "src/data/menu.ts",
      "sha256": "0011e92eaefbb8ab4cc39b9b2ec7ac7b97587bf613669f7ee400d6863afed793"
    },
    {
      "file": "src/data/mercenaries.ts",
      "sha256": "b6b0f5e18a812fc6efc79fb8975b1747f01eedd4280d63758c7fcb2785a22c78"
    },
    {
      "file": "src/data/merelake.ts",
      "sha256": "48674609ed729cbe47cb3ce047b592c78afae9967e4bda9db6055187f0936a64"
    },
    {
      "file": "src/data/minionFamilies.ts",
      "sha256": "f6fd59246f7bd79dc7702151e5da76be143037320d595fd96e2c7511f5d51680"
    },
    {
      "file": "src/data/monsterNames.ts",
      "sha256": "0bbc778f56188353e2f40edb6d14c2b52441178965b834e8885e3d4ef4217033"
    },
    {
      "file": "src/data/monsters.ts",
      "sha256": "6ac7340f8ec4a13d3eee646e72eb184d2a100bd183022c5e856b79276089fa69"
    },
    {
      "file": "src/data/mu.ts",
      "sha256": "275b7a6e7fed86f0293793dd30935b8f12a540d16d577aab402891448f8f35b6"
    },
    {
      "file": "src/data/necromancerCourts.ts",
      "sha256": "25d23af96a570f1e43ab5d77a5a7cc8a540df8e7ea4e852fdbe3490a3f7d11f8"
    },
    {
      "file": "src/data/necromancerMinions.ts",
      "sha256": "9d59e1374ebde58ee7635fc4f267f4392f06b475e19d336ecd2e8d61e82e7b9d"
    },
    {
      "file": "src/data/necromancerRites.ts",
      "sha256": "50ae800cd9ecc6f040cc01faaed75436cd00197b00f1249d23800469c1e165b5"
    },
    {
      "file": "src/data/necromancerSacraments.ts",
      "sha256": "7ed4bf1fe5d73f03fb5a31d86c457e29d19fb501ee693d72ba1173c913e514f0"
    },
    {
      "file": "src/data/necromancerSkills.ts",
      "sha256": "afe1b42eaeae09348b867196dfb32798987c3536762ddafe0b897bea8315b380"
    },
    {
      "file": "src/data/necromancerTrees.ts",
      "sha256": "696c895b2a6c60bee82ad75e3da23853016e6937b980d5ba93ca98aebfa96d85"
    },
    {
      "file": "src/data/nemesis.ts",
      "sha256": "9f627fb726693d59cdfe94c901c912d6c0f2c070792c29246258bdebaf15bcb7"
    },
    {
      "file": "src/data/npcDialogues.ts",
      "sha256": "14540a65f43848612cb94f63b361d29f24d6f19e10444bdb87a7cadf7d00744a"
    },
    {
      "file": "src/data/objectiveRewards.ts",
      "sha256": "91085ffd5ffaf300c5d4c0a91d8bb1d868d8bbcee60863dc4412aebc775edbae"
    },
    {
      "file": "src/data/objectives.ts",
      "sha256": "fc3580e1e515acdcca758cd088d22e7cd9290329f0516520e975184feee10f2f"
    },
    {
      "file": "src/data/occurrences.ts",
      "sha256": "ad4eb205a83a79f7207b06b834030ace7ec5f46472932394a7698d5282498f39"
    },
    {
      "file": "src/data/odyssey.ts",
      "sha256": "e8920b0bcb62309bcebfb6c6adb54e078f2b98537d201672815236f28ab90715"
    },
    {
      "file": "src/data/odysseyPressure.ts",
      "sha256": "5ef45fdfa6a9be7dcbcc967a2f4c1de184c71548ea1c6cb2ffcb9d1a1d43d25a"
    },
    {
      "file": "src/data/odysseyRisings.ts",
      "sha256": "22c313943512bc7d6aaca1e361a9bf05f9161a926c59d52b3907d5fd373810dc"
    },
    {
      "file": "src/data/oracle.ts",
      "sha256": "1594458b498831d1db65105b222972622ed0a1decf48860af5b7d6c47de745fd"
    },
    {
      "file": "src/data/orbs.ts",
      "sha256": "7ac89fbf5fdc3c3d567649f7c52b45ebd6388698e732e0c08515c5bfa4d789e0"
    },
    {
      "file": "src/data/pactSkills.ts",
      "sha256": "e2809a22c1ceac514d232b6fc56c856269d4b043add007fb759ea7dfbb076c98"
    },
    {
      "file": "src/data/pactSteelStarterTrees.ts",
      "sha256": "60e0784f98a1972d0f317d95229a473ee0a387e07504db3e6e9107610f484fa8"
    },
    {
      "file": "src/data/partyCues.ts",
      "sha256": "f1c1c1a3f1baca9c2e2b9ef4622d34ffe109f37f65dad4f2da6058bc0bd4d9d7"
    },
    {
      "file": "src/data/passiveAttributes.ts",
      "sha256": "3edb22392d71472f5261ac34849e2ef455b7c7d408d8e40311a014f86ad2e0cc"
    },
    {
      "file": "src/data/passiveChoices.ts",
      "sha256": "cdad7ec25fb0df1048fe6a495ca0add843c81773e7845c22b6fb093e0a2e88d9"
    },
    {
      "file": "src/data/passiveCrossroads.ts",
      "sha256": "c01cdac0572e8a5595c62fb5370217515919be9f9d4daf143b27c3965b79d2de"
    },
    {
      "file": "src/data/passiveNotables.ts",
      "sha256": "4e5cef6aa4fa1c7989ae5119a825dcc35f874b13d84e5bb256a1b09fbcc4bf8a"
    },
    {
      "file": "src/data/passiveRealms.ts",
      "sha256": "1457bfed8f29938da38fd2bce1a1af1fd08afa9f0aa0ea98e45b9d88b16e4f8b"
    },
    {
      "file": "src/data/passiveRoutes.ts",
      "sha256": "b6ef154d0a59ed1124cd021c22eb3d2d213a0fee533d8312732226368eaf55cd"
    },
    {
      "file": "src/data/passives.ts",
      "sha256": "3357d66d6fcd5b09901a492a8b32d856b818049b321f749d19b1db163e529dc7"
    },
    {
      "file": "src/data/passiveSpecializations.ts",
      "sha256": "4e107485705bcd129f7a89b2f660e150bc42686178360f31b6cfdd8e48409bcc"
    },
    {
      "file": "src/data/passiveTopology.ts",
      "sha256": "75ef815c0549c809553f01dfbb139e513f5b316374d46afd57444ad302b4d35c"
    },
    {
      "file": "src/data/passiveWeave.ts",
      "sha256": "350d73c7e3409576988d06681f67d36262be7c3358303a5d52d0190184bd136a"
    },
    {
      "file": "src/data/payloadCues.ts",
      "sha256": "012ea06c6447d410775ddfd57338285f791c0142252ccad668798ebc41744080"
    },
    {
      "file": "src/data/pilgrimage.ts",
      "sha256": "650b6aa2d03ddc489e501a767ef798eee95802129a7155e611d0876363134620"
    },
    {
      "file": "src/data/playerBody.ts",
      "sha256": "0b415c724d418af426e19cdbe732189faccb9d0b2f95499f86ec07e1602b3738"
    },
    {
      "file": "src/data/pocketForms.ts",
      "sha256": "6f68bafed2388a379e3cf99469c957b19ab06d9c239e68b21fc794607ac1b503"
    },
    {
      "file": "src/data/ports.ts",
      "sha256": "d1b0b3bc901ac6a9638e876bb414f5dacfcd133f6112b6577143939f93ea2025"
    },
    {
      "file": "src/data/powerProgression.ts",
      "sha256": "b5354642364d4953cec5dffd05deb89841cd873a557d9ad6db1cf302fbe656d7"
    },
    {
      "file": "src/data/precisionStarterTrees.ts",
      "sha256": "a5ff5c42dbd02b85340edb6a7344c9f30d1554fbe65a9f5ca20bd116dd1fb6c2"
    },
    {
      "file": "src/data/procCues.ts",
      "sha256": "04cc1fde95eb2582639a4b58219df01b4abe2378f0699d57dee48a58a2204047"
    },
    {
      "file": "src/data/processions.ts",
      "sha256": "c9f8fddf296cd6a3dfb61e8a99b6bc4f20e57ff24f356b22b63217c71c81e13e"
    },
    {
      "file": "src/data/procs.ts",
      "sha256": "d5627f3f27f0c747f3202ed4ac80908fc9c1596433322171ff5ebba62500b77a"
    },
    {
      "file": "src/data/puzzles.ts",
      "sha256": "7fd4a45e866ae983de0a7c28bf6cf1badc7d2ea5602a004ab033c0de357383ef"
    },
    {
      "file": "src/data/pyres.ts",
      "sha256": "ea2d391a71d2910cff4357541ed51a160c0f2ab335c14e8a575ababf48b3d294"
    },
    {
      "file": "src/data/reactiveSkills.ts",
      "sha256": "6fabe2c96347b12429389f8420c5729c014d0cee432aa105485eca726fa2480b"
    },
    {
      "file": "src/data/reliquary.ts",
      "sha256": "6c31ecc9a7f151313e32856961996343843311de36da05f487db5f7ad4994b09"
    },
    {
      "file": "src/data/remnants.ts",
      "sha256": "f82e566c60861931ba6c42a19f611aeb4be1c233107df8b66fabed9e7aeef2e5"
    },
    {
      "file": "src/data/reserveCues.ts",
      "sha256": "2b791e829650213fd4cd9d9dd5dd959675a31ea7e79542a117c47825606e5fe4"
    },
    {
      "file": "src/data/resonatorStarterTrees.ts",
      "sha256": "50d9d154f4971cff2216e551745ec4b6cbee05f864ddc17471e3357a6a797eea"
    },
    {
      "file": "src/data/resourceVisuals.ts",
      "sha256": "0aab27107f4db146beef28a2660c4d8b4a11eb22605cb534805525f3a0eb7fc1"
    },
    {
      "file": "src/data/rifts.ts",
      "sha256": "945ba6e7180494a42f2307ae5928babed6885ad0a7f9bb8ee9df6e2a503367bd"
    },
    {
      "file": "src/data/rootwildGlyphs.ts",
      "sha256": "96a0fe372e89581eb1504eb89a8d1fa807c9aa9fc6fb6cfa75247716e0ca3c6f"
    },
    {
      "file": "src/data/rootwildHabitats.ts",
      "sha256": "f9e7f765e7ca0af779b0d73654716050a3cb8926b971e5edc0f3949db2cdab8e"
    },
    {
      "file": "src/data/rootwildLooks.ts",
      "sha256": "7295ada495c0a4a33937266ade33830551aae7ced8e8421c3cc6e62bf006396d"
    },
    {
      "file": "src/data/rootwildMonsters.ts",
      "sha256": "8ebf0ae86095e785d50a73bc253d309b8a3288b58ebf8f26b9e11e64e6abcb03"
    },
    {
      "file": "src/data/rootwildSkills.ts",
      "sha256": "fe93d73c7ae6e8128c508f71d1be98bad74e3b8062dfcdf7a5c35f4d01fcafc7"
    },
    {
      "file": "src/data/rubblekin.ts",
      "sha256": "3497a4cd8df40c0019a0ac3fe43d428d591eef11e4edde23172a7a2dc14e032f"
    },
    {
      "file": "src/data/rubblekinTree.ts",
      "sha256": "770e98a365d315fab3a1810eb2723ba2d793fd2e0c2c303352eec3ca71c07994"
    },
    {
      "file": "src/data/runescript.ts",
      "sha256": "296f0b64c48ec8700d6f04b3dcdebfe970fabcfc127a779dc9bd175310936e13"
    },
    {
      "file": "src/data/runeweaverStarterTrees.ts",
      "sha256": "b22d808925911045d991aaff4bf47736ec605359aaf5b8a79a4fc7f04464d219"
    },
    {
      "file": "src/data/satellites.ts",
      "sha256": "49ec25453f60d529b54c7142e08c7637b3f72ac27235e3ba4aec622688c6b29b"
    },
    {
      "file": "src/data/scald.ts",
      "sha256": "11683a2b62860c1d12945b444d920eaf6fc2a070e5c3e351f018c1f227eae137"
    },
    {
      "file": "src/data/scaldkit.ts",
      "sha256": "60c199aab8de9716b8e71eb1d2138c4f79ce6e5b459b463447ecbef54818af10"
    },
    {
      "file": "src/data/scenes.ts",
      "sha256": "c69d2219f0ecf8f18d7e09f123801ae826af536b083394ba232e37df4ef041d9"
    },
    {
      "file": "src/data/seas.ts",
      "sha256": "eeb4f9116b2c2cd783b29b5e5686d78bd45cd820b1ef522748d12465ea09176d"
    },
    {
      "file": "src/data/settled.ts",
      "sha256": "77e624c06e8eed6b23810c3608a664086683b71439fe85c360d75c9fc62900be"
    },
    {
      "file": "src/data/settlementDefenses.ts",
      "sha256": "a88452f280aa19c8c8b727885ba4979ac5481c7e065a9067a231c3d158b8be27"
    },
    {
      "file": "src/data/sheet.ts",
      "sha256": "3e74e84270e8107eb49a592ef1414ceeeb4a915cd08c8e3e38ed6a6a788f956e"
    },
    {
      "file": "src/data/shieldUpTree.ts",
      "sha256": "2c1c72dd88825ab645fceda397c6735a5965ebc8da78b8e133ee4724c746c152"
    },
    {
      "file": "src/data/ships.ts",
      "sha256": "8faf347b340f8dc07703e89b936f158aeb8743163b61ed54e87b369f60b1cafc"
    },
    {
      "file": "src/data/shrines.ts",
      "sha256": "c77f4fe639089bcd370072e6526d50861638b724a2df1e8aac9b684b23d766ad"
    },
    {
      "file": "src/data/sidezones.ts",
      "sha256": "cf17e17f3903951e5719e8032cf84f7d434967a896a44d594b5a0cf3f5da088e"
    },
    {
      "file": "src/data/skeletalMageCosmetics.ts",
      "sha256": "b0708e7eb8feed66da1fb8b0a51a445852011b5b02b876d6b9e6f77bf017f5fa"
    },
    {
      "file": "src/data/skeletalMageGlyphs.ts",
      "sha256": "16e0a16c1bcda334e1beccac68f6cf5a51bc4ebefef4421ce3867e85d89333d9"
    },
    {
      "file": "src/data/skeletalMageLooks.ts",
      "sha256": "9d085d33bf993080936c9ef2e5b705e2183428fb4f0de1100fb3c99c89173dca"
    },
    {
      "file": "src/data/skillCastVisuals.ts",
      "sha256": "782e347ef0e8a57768e6671a2643e447b0bf417d7d195946f530226ba734f800"
    },
    {
      "file": "src/data/skillEmpowerment.ts",
      "sha256": "67d854d4e770e059ee3ffb16edc5944e7b7572a6904ca529d9aa304eaf1f924b"
    },
    {
      "file": "src/data/skillFlightVisuals.ts",
      "sha256": "6d09f24f5b9616d429876cbf1ad46c736dc4c7c0f634b22ae0c7d835504cbce0"
    },
    {
      "file": "src/data/skillMovementVisuals.ts",
      "sha256": "8a072f3487c3fd9444070fc8b13c22df46e8f8338fcc6e7ad133817d6bbeb21b"
    },
    {
      "file": "src/data/skillPresenceVisuals.ts",
      "sha256": "38562706d3bf253524b6a456bf88dde3d6c1e76c984f65705b96655f83c0fc69"
    },
    {
      "file": "src/data/skills.ts",
      "sha256": "1e03c12f1b0bc7b61a5c0e6154eab010fc3debba86bd7261d311cb458bcf0b71"
    },
    {
      "file": "src/data/skillSelfVisuals.ts",
      "sha256": "80f4d4ec07ee4c082adf7989c3e757314e11f17e3995f689f554a37ea902c713"
    },
    {
      "file": "src/data/skillShowcase.ts",
      "sha256": "0315975110bc4f52227d1f1e715a97f67b97bde161f7fc942aa743f7caadfed0"
    },
    {
      "file": "src/data/skillStrikeVisuals.ts",
      "sha256": "f195849ef50a19416f45dd04b4c7cca7806c2b3c734f691aeeeb26e455a72098"
    },
    {
      "file": "src/data/skillTargetVisuals.ts",
      "sha256": "0dd74174a28f08f1f571478c50c7f9800402cda1e6930ba876f22ac8986ee838"
    },
    {
      "file": "src/data/skillTreeBuilder.ts",
      "sha256": "b34b71f5db312f69ef83b7609c531869c4526628f2e0f56e1ed46f3e082655f5"
    },
    {
      "file": "src/data/skillVisuals.ts",
      "sha256": "af98fc509c140eeea9b4edae1a1976c7b7b5a0a715b534197c213f5cc1c97a0e"
    },
    {
      "file": "src/data/speechAttention.ts",
      "sha256": "2fa4fffa51767e0ab344e469a2b99b0912366f62f217fead0c7085e850895260"
    },
    {
      "file": "src/data/speechGrammar.ts",
      "sha256": "01be80f784c94cef325d4172cdcbb9f6b7cf1541fbd1e5fad2838fc3cf6aeaf1"
    },
    {
      "file": "src/data/stalkerCosmetics.ts",
      "sha256": "514d48b91aebdc61dfd03d55e27ce0a1cc4c06a5dcd7c03cd4813230f559e482"
    },
    {
      "file": "src/data/stalkerGlyphs.ts",
      "sha256": "5c840af9da1ab2580097fdf0e596e219521f0efa62f034409bf9bdd93beb3f85"
    },
    {
      "file": "src/data/stalkerLooks.ts",
      "sha256": "05131e8f3fac999d3442878b16e97284b1c7d0cf426a1bca695c0ddeacc66f5e"
    },
    {
      "file": "src/data/starterSkillTrees.ts",
      "sha256": "f5b68f597d0b57316f83fc86338657eec3d7a2bfe1b2cdf1f53a3bf08cfcc22d"
    },
    {
      "file": "src/data/stashes.ts",
      "sha256": "b03d5c7587c6a2b5c7535dbe307804ba4ca90394914f9125f35fb803f762191a"
    },
    {
      "file": "src/data/structures.ts",
      "sha256": "5c90c60d46fda9b01b72fa79d44865faa9845f8c5e8e752fa6ad7d824685f2a1"
    },
    {
      "file": "src/data/suites.ts",
      "sha256": "6ba47de40935388e78cd101de59f8c31121129c326fa8cfe8b0e93108e0db4fa"
    },
    {
      "file": "src/data/summonCosmetics.ts",
      "sha256": "6c0cf48c034beb1a622629a25a26c31fa08c433ed67038e25e0a8079a49eb8c2"
    },
    {
      "file": "src/data/summonGlyphs.ts",
      "sha256": "eb21a9a1717b9f6368f67a93a9a7021eedd7b498bb30ae1f7b8c525c231f318b"
    },
    {
      "file": "src/data/summonLooks.ts",
      "sha256": "d29c6eca8a1cefce52e254fd2143b03c4f8fe58124ddc7db5e939588ef192832"
    },
    {
      "file": "src/data/supports.ts",
      "sha256": "744c7415f9ed6854b1e34fc413241d7b3faa164806fc1beadc1240f4f6417120"
    },
    {
      "file": "src/data/sympathies.ts",
      "sha256": "4612b159bcdeb223a5bc9579edfb280a0b1d49ab237bcf06f5ffe04fcff771ba"
    },
    {
      "file": "src/data/tacticalEncounters.ts",
      "sha256": "9e8cd4e72ba8cd188ba0dcba0e03b260332f9fb097672c977aba8f81f65a745f"
    },
    {
      "file": "src/data/tameBeastTree.ts",
      "sha256": "bec7fd149b7f1fd7491363570c5a1cf42ef7bd3249a2970eaec63430708c75de"
    },
    {
      "file": "src/data/tetheredHabitats.ts",
      "sha256": "32238c5734bc373fd50e8fe8f147f0c530a430fc6d51c5b07458b4eee14e8327"
    },
    {
      "file": "src/data/tetheredMonsters.ts",
      "sha256": "b131640a97bb943fae6f0ac9da0e13c203897e0057ac71a508107fb78b04dee8"
    },
    {
      "file": "src/data/theater.ts",
      "sha256": "a8a70acec3d874b047428561d83bad028cf5e6d378feb32f8118634707a6de5a"
    },
    {
      "file": "src/data/tilesets.ts",
      "sha256": "af2b4457ca7222c57c55db2c61aac47cd2b4b3b13cac0ac834bf5b8e46825408"
    },
    {
      "file": "src/data/titans.ts",
      "sha256": "a51e34b4b5f7584c4e6bfbb1dbe21343b55f38d2ff7aaf0b116c3a5e2fd2666f"
    },
    {
      "file": "src/data/townBuild.ts",
      "sha256": "8551e6f88fea0b9fed0c0a9b48f9d40506b1cf4cd3c057eccd472f2f17b9fe88"
    },
    {
      "file": "src/data/townportals.ts",
      "sha256": "9b45924fff90028f9f620063872b7fb4c09b68c41674425473615648747ce016"
    },
    {
      "file": "src/data/traceShapes.ts",
      "sha256": "77a5b85804a7390ee5148a44d53e94d5463eeae49380db805462bac5fa5558fa"
    },
    {
      "file": "src/data/tracks.ts",
      "sha256": "4862b42e47060fddb6d29056b7dedb1191eb89b828344d6eeeb4ddd9ced5d6a2"
    },
    {
      "file": "src/data/trainingYard.ts",
      "sha256": "24b2878498162c4b55285345ba6c5930b6454f55542ce78c992534c3b6eddd4c"
    },
    {
      "file": "src/data/transit.ts",
      "sha256": "88d2337fd812771eb6f618b1816d4e0c8ea16a49df8e71b495479c1bbcb0af01"
    },
    {
      "file": "src/data/trapworks.ts",
      "sha256": "e22aea35c5394ee904b0b911c7e98c87deb1fab8bd36e81ab705f9db38c74b21"
    },
    {
      "file": "src/data/traversals.ts",
      "sha256": "616145efc5caa933e78ef4965613be97df69e8eceacded01e56de9b4462477e8"
    },
    {
      "file": "src/data/tutorialObjectives.ts",
      "sha256": "95729e25c994f35b0029d069ac43062c333a0d5374ecd922f797342768653a73"
    },
    {
      "file": "src/data/ultimates.ts",
      "sha256": "3fc2582478e01e1bd0caa6e098be7600974578ec664c97a2a39533239b0294a6"
    },
    {
      "file": "src/data/undeadCourtCosmetics.ts",
      "sha256": "eabf85698c0e30c33e7be4458a6db97451d0605e22bd3ca89d854fa855fd0284"
    },
    {
      "file": "src/data/undeadCourtGlyphs.ts",
      "sha256": "2484ec31100f92ffdb77cb82e70fd37c671b9cc8a81350272467c7947fac73f2"
    },
    {
      "file": "src/data/undeadCourtLooks.ts",
      "sha256": "faf0ea407ee0448f55490e670485954224d69e23919f1c7485aa4105d2444d42"
    },
    {
      "file": "src/data/underspans.ts",
      "sha256": "f5a8d25ea4fb645dc8dc792c0a79836d1e6e95821e8948fe126e084faa68e186"
    },
    {
      "file": "src/data/uniques.ts",
      "sha256": "0946c2dc0a1de932bf374b4f34d6a32b375b58a8497cebb662e5b13a2db65617"
    },
    {
      "file": "src/data/uniques/accords.ts",
      "sha256": "5a9b682e0282027e2c5d2655c8afc1c5b060bc99bb2d89fa2472f3ac7c6ceab7"
    },
    {
      "file": "src/data/uniques/emergent.ts",
      "sha256": "267a398e66f6b3e5ebc1f68016e3b8b1f621ee5bceb4dac924fd8e902c303b05"
    },
    {
      "file": "src/data/uniques/living.ts",
      "sha256": "73230cc33146ab709c65f6727332f42a150e447a6fbbeee5d04b8d9fdda6f1c0"
    },
    {
      "file": "src/data/uniques/reactive.ts",
      "sha256": "02c84b6d830c63fb3dbc3cdb3b14514610f432f112a0f8760f5c59343516c312"
    },
    {
      "file": "src/data/uniques/relicPaths.ts",
      "sha256": "7c1547867a31de0715377705f7894d9f7eabb267e4ec7f0263b79a575a887a87"
    },
    {
      "file": "src/data/uniques/relics.ts",
      "sha256": "bcde9478035ee58f5cf9f32b230ac482367d1444c706705be24525c2483ee668"
    },
    {
      "file": "src/data/validate.ts",
      "sha256": "9ddce46eaf28d02c9c604c092cf4663d89c112e29c5f3ba2d03fdcd4c20ac5ea"
    },
    {
      "file": "src/data/validatePassiveLayout.ts",
      "sha256": "52a3842a31d65ed19d9d93a4e7275e2a8305f9a2b0cc03fc0c4256b422fad5fd"
    },
    {
      "file": "src/data/vendors.ts",
      "sha256": "670b7fefdedc61e3482a93a7d1a3383cf0d85671f4727569a078e5e541101d78"
    },
    {
      "file": "src/data/vestiges.ts",
      "sha256": "150bdee8d9dc1210012b6a3bc215299dfcf8b92592dbfae6c0198ed95f525c34"
    },
    {
      "file": "src/data/vocations.ts",
      "sha256": "1ffbd7d530cbbb2b29fa771c398f1f1384d433a023f1be5bf8e7bb8a32baf53f"
    },
    {
      "file": "src/data/voyageIslands.ts",
      "sha256": "7efed0b357f35d043d165871f93fb3538f2d63d6b2f995a0f4dd07c02ca8de6f"
    },
    {
      "file": "src/data/warfront.ts",
      "sha256": "96ad46ada5695e3024cd4d80573e9bed4c5598812e1839ca33a3d27a04c07ba5"
    },
    {
      "file": "src/data/warningCues.ts",
      "sha256": "85fd5208616db8c8f7bed394dc241559e53ee55c70c23160e1eb898f6cbb7124"
    },
    {
      "file": "src/data/watchposts.ts",
      "sha256": "e61118445f37c9dd85d65d98548e1037428004d9f574d5c79fe127fd685f2a63"
    },
    {
      "file": "src/data/waterSurface.ts",
      "sha256": "844042160628dd62a4082b3973d18d141600eab23cfc2881c8b432d4d25ccd24"
    },
    {
      "file": "src/data/waves.ts",
      "sha256": "864e73efbf0e20e2b71fe1acaaa355674a747ed2454c4a7063b3e6bf281d8211"
    },
    {
      "file": "src/data/workshopSkills.ts",
      "sha256": "7d484a924de107d96fe6264d2ec10839c08f0138d3608cd9cfddfcb3e6191d4d"
    },
    {
      "file": "src/data/worldBossEncounters.ts",
      "sha256": "099ffb0468f8024f0fbd8d4a8cb282dda057cdb21a9c2c53c09c9dbee3c08fe1"
    },
    {
      "file": "src/data/zoneKinds.ts",
      "sha256": "626223aad5c95e48632d4a27fcb3a8a922c4bef773afe4dfcb003678cacd853a"
    },
    {
      "file": "src/data/zones.ts",
      "sha256": "deee0fca184696a8267cc404a4838a1cff6c44e3c5fe6cbc39a5b871a27ac053"
    },
    {
      "file": "src/dev/entityForge.ts",
      "sha256": "cb4c430f3d739269ace2ef5e161a5e99773a60da177e4bb8ad33cf0f3e31be57"
    },
    {
      "file": "src/dev/forgeSchema.ts",
      "sha256": "9f259e6de248b7e62ae8049258120d6fde15dc96218e933a43929ae2d372844f"
    },
    {
      "file": "src/dev/glyphForge.ts",
      "sha256": "70d8c7ee38248544a0a0f4e4d77edf2fdfb28c15fbff4f9d6589c09b55f8e039"
    },
    {
      "file": "src/dev/mapForge.ts",
      "sha256": "7e3d7f3af96a17ea04bc6744d212f954e8a822e8309e347120d71c411d85fea5"
    },
    {
      "file": "src/dev/monsterSpawn.ts",
      "sha256": "96c50abe79baaa6a234610cf4e177ac9f5fde8c7bdc0f0f2cdc9838517dd29b2"
    },
    {
      "file": "src/dev/panel.ts",
      "sha256": "60a2b4bc9587377e0d1fbbb467aab9ef5c72d7442530c13070b6341a6356fa79"
    },
    {
      "file": "src/dev/passiveEditor.ts",
      "sha256": "38dbe3ee91ae7900c85106ad1a15cf80995a1f500725bdeacfd5dd8322e7f1f9"
    },
    {
      "file": "src/dev/perf.ts",
      "sha256": "d681c5d714f2c719cb615390c301415fe5199217e76edf43e15ef68eab8c7081"
    },
    {
      "file": "src/dev/progression.ts",
      "sha256": "0f62add62ef23b39ef689721e69dafffee3e1dc62ec6c9ecbf026a711f3c18ed"
    },
    {
      "file": "src/dev/tabs/account.ts",
      "sha256": "67d3582cc313fa7c2241d8820e6010ea700226ec46d02070475b203429a19a07"
    },
    {
      "file": "src/dev/tabs/atlas.ts",
      "sha256": "fd0b2db2599ef79d10092e58dbe4135d2cd09f8d9f6f7af0588b09ef8bad5fa3"
    },
    {
      "file": "src/dev/tabs/combo.ts",
      "sha256": "98618c7c702c89c5f0da20102b58d74116a6c913dc2737c135373c009e2729f4"
    },
    {
      "file": "src/dev/tabs/dissolve.ts",
      "sha256": "3dd191c2d5b2d448d3c90a02a37df40d1e4ebb189225a2d4f713766e809cf196"
    },
    {
      "file": "src/dev/tabs/emerge.ts",
      "sha256": "fbb2a541ef0bbee549c619c24b4261dfe2c38995a897f2648675eed146196618"
    },
    {
      "file": "src/dev/tabs/entity.ts",
      "sha256": "b2fb9bc4905a4d331a8cf8f9c7e0ca3da2e65d1a84603283c6bbb1fbb81cfc54"
    },
    {
      "file": "src/dev/tabs/events.ts",
      "sha256": "61cabd24b72e984edff6b34c86cf668560e4cf3b8ef4b3e5599cded3cb58a4fd"
    },
    {
      "file": "src/dev/tabs/gems.ts",
      "sha256": "835447c892b0c092de7ca79b568088173473bd413c936baf94f375ee86e9091e"
    },
    {
      "file": "src/dev/tabs/geysers.ts",
      "sha256": "fef08e89bf9696117b9862c326537b77fdf48ac263f4679ae7a8008766b3105b"
    },
    {
      "file": "src/dev/tabs/grab.ts",
      "sha256": "e7a4fb2c6f69875232d560aa671a2a30ae7f3e9641da0f3a25b4a7c25ac0a215"
    },
    {
      "file": "src/dev/tabs/holds.ts",
      "sha256": "fe4d1241f133deb4e527b2c25c484dbb35d60678301f4531b7711745e57a6395"
    },
    {
      "file": "src/dev/tabs/items.ts",
      "sha256": "a1b130ca389022a496d32c15bb46e9cb1b3049b17812bec8e0de6324c6d2d4ef"
    },
    {
      "file": "src/dev/tabs/lite.ts",
      "sha256": "54e65ebb9809df5c383cdba02d6dc0069b2b38b92a06aa71c3609891ab4980f6"
    },
    {
      "file": "src/dev/tabs/location.ts",
      "sha256": "9fd507b633aa659d91fe015e13cfb2ee9f2eb8894bc89eec7122fa8d4ea2c25a"
    },
    {
      "file": "src/dev/tabs/maps.ts",
      "sha256": "10b3709998bbe5561392f706cabd7a76ef5674f50d9ed432c2abd97aa1b85f35"
    },
    {
      "file": "src/dev/tabs/perf.ts",
      "sha256": "399b48aa00bd65b0023b773b384b7cb3262d514846cef855dc771257c66fbc85"
    },
    {
      "file": "src/dev/tabs/possess.ts",
      "sha256": "cba91c95a320d8898009ea964296b05d3746b23aed1734b84ee2ad5335a2581f"
    },
    {
      "file": "src/dev/tabs/progression.ts",
      "sha256": "06d4a4d5398a7cc51f35581f657d91b7b40820af85096487306583ca43c00926"
    },
    {
      "file": "src/dev/tabs/throng.ts",
      "sha256": "15124eed115f181a8d153aa589321ad50a5172c14947e1aaa25bc56e5b4737b6"
    },
    {
      "file": "src/dev/tabs/ultlab.ts",
      "sha256": "72d8e439e9e55ef27475f663a55bf05e3cc980c759c11d24907ecc160617c707"
    },
    {
      "file": "src/dev/tabs/watch.ts",
      "sha256": "1dced0fbc48a7725f92e2081a2237f79586f02abf198469ab68aed5114b1f7e5"
    },
    {
      "file": "src/dev/ui.ts",
      "sha256": "1e6e3cba8c973fc017be8188bd4f47abdbfa9b2b6b992866a915320cf2e03ad7"
    },
    {
      "file": "src/director/camera.ts",
      "sha256": "a9d32fdb84e3aedc18c9e69bb907addef3e1d963fab226bb77f28e9a4e4b9bb2"
    },
    {
      "file": "src/director/director.ts",
      "sha256": "dce9bea0f1a66e5b9f5a9084c6e791ae6e7c171b43efa2b8e7223f46f6ca23e1"
    },
    {
      "file": "src/director/shot.ts",
      "sha256": "2a481ae0853d44b35381ffc296446bf15869ce85ab041492c875d44dac0384fa"
    },
    {
      "file": "src/engine/absorb.ts",
      "sha256": "2db40e8772362b6a77d530947708e9cd4e9fa9498353c380df5ddc34b25f5a22"
    },
    {
      "file": "src/engine/accountReliquary.ts",
      "sha256": "3bab9f3ec5bffc93948939a87b9cfdc54137efb1638e855667c89ed65e254c89"
    },
    {
      "file": "src/engine/actor.ts",
      "sha256": "0d5769530cb899fe0328158d70312b80e916753f014e9fec02e1874bdf570dcf"
    },
    {
      "file": "src/engine/actorGrid.ts",
      "sha256": "34c6e471ff92bc51129cff01113dce81f658e225bec61241747487fdac12101b"
    },
    {
      "file": "src/engine/adventureDistricts.ts",
      "sha256": "58b3198f5163cfe7f889da45416d05ef25a501fd982f7a249f9873a47a025e7d"
    },
    {
      "file": "src/engine/afflictionPressure.ts",
      "sha256": "2da1217ba50d40ee0aceabd37c1a7cfe53c545dda0c4091ab05c8f88bd3ae681"
    },
    {
      "file": "src/engine/ai.ts",
      "sha256": "7057739bc34d5c3d682996b09524619d88c8d0e43f8ee0bf148fe06c4bea712b"
    },
    {
      "file": "src/engine/aiActions.ts",
      "sha256": "e2a2c7a0cef913170125d240d835ee66f507e5650055eb77095adf0e0087c4f1"
    },
    {
      "file": "src/engine/aimassist.ts",
      "sha256": "302794134e8d923e9800b9247f7e95d3fcd2a0d62bd82675948d5b3488bac16e"
    },
    {
      "file": "src/engine/altarBodies.ts",
      "sha256": "16f72b76bd467420d3b05176a7a7477e80974c521b03c75a75f53c83469f9823"
    },
    {
      "file": "src/engine/altarCues.ts",
      "sha256": "97f3447f4441e11d46c883a253c3a5779a086d45d630121b3b88bc73112dcc11"
    },
    {
      "file": "src/engine/anatomyCues.ts",
      "sha256": "1cb5b1247e357d40048a0da23e9ceafc6b0d9d7690c2b99502afb5a398eaf063"
    },
    {
      "file": "src/engine/arenaCourt.ts",
      "sha256": "db7d634c6e508b1d29ceda3d1a6e154df4bda710fa653fdbb46ce168e7d48f76"
    },
    {
      "file": "src/engine/armedCues.ts",
      "sha256": "7e9ea50be6535ce4ae157abcae8e46a21dc6dddbbafdee0c72144c11ccb74e7a"
    },
    {
      "file": "src/engine/assault.ts",
      "sha256": "64084452b1487593568e4d8a065ed126489b5468d453239f12972c1834818b97"
    },
    {
      "file": "src/engine/attackPatterns.ts",
      "sha256": "ca667992eb14675eae70d171551c3489f65f6a1b649735d5da94d91a380fbacf"
    },
    {
      "file": "src/engine/attackSequences.ts",
      "sha256": "0383eb4ff4c4da3590b6f38a5e1fb4adada85517aeced21a72d13abca6c9e0ef"
    },
    {
      "file": "src/engine/attackSequenceSpec.ts",
      "sha256": "6ffb006e0c79ec1943faafcbb6de5bdca7eae8bac286f3ea4fb2b8858ca3b267"
    },
    {
      "file": "src/engine/auroras.ts",
      "sha256": "29cc7c2babfd4f4e0074e6c0194081e1746deddcad004661461ba55db6767d93"
    },
    {
      "file": "src/engine/auroraSpec.ts",
      "sha256": "901e4a89d2ad7ed1da5cf6650caa979cd2d9dbb21f4e21871887d610f2cc3d3e"
    },
    {
      "file": "src/engine/authoredMaps.ts",
      "sha256": "5e7d137f093a78a81979d429b2ed5a2a8497e9df79fa7abe31cc9cadf0add36e"
    },
    {
      "file": "src/engine/bagsort.ts",
      "sha256": "213b16b97d0e5df84def3135d5993dd17b14c6706d77579f059f2f9cfe7d1b00"
    },
    {
      "file": "src/engine/beaconObjectives.ts",
      "sha256": "0fcf034b92b2b6f59de926056b0955a039f584460a56fb7ed2a1c7dcd585e6f1"
    },
    {
      "file": "src/engine/beaconSpec.ts",
      "sha256": "cff7533b5ed33a762ac56b7f2d5e7bd230dbce77a094fa8f0e36085a5c8cac25"
    },
    {
      "file": "src/engine/bequests.ts",
      "sha256": "0ba675d2f7237f6b2e93959b37c20640694fb491120a9d452a68332388c6f999"
    },
    {
      "file": "src/engine/blend.ts",
      "sha256": "3e361e6216fb487a6ea44a82b46247c55b65470370b79c5a577da855d525e3f3"
    },
    {
      "file": "src/engine/bodyAction.ts",
      "sha256": "a6dae1ac4f645beceb6e312b50cb2ad33c0307c51163d3c8ab27b1c1f6687d02"
    },
    {
      "file": "src/engine/bodyVoices.ts",
      "sha256": "299ac65c1f2d10e75a52e433d8df5cb5f42f2de3df0bd892f31984686d52e5a7"
    },
    {
      "file": "src/engine/bodyWalk.ts",
      "sha256": "69ff3efec650c972fe8369b70a4cf486ad522da5d71b1d0783b862995608ab6a"
    },
    {
      "file": "src/engine/bombard.ts",
      "sha256": "f3c6fea2446d27a990ab899be5cf9463cac14e9fffb00c8fbb4eb8d76ba59638"
    },
    {
      "file": "src/engine/brain.ts",
      "sha256": "88319b18f0c0f3d670ca2d9fa1c5010c9f474fe45e82619249e796e6a665d144"
    },
    {
      "file": "src/engine/carriedEffects.ts",
      "sha256": "d5645377597723631bfbb9fc5ec75ae9162d49214386ab5da9f830726fd8a7dc"
    },
    {
      "file": "src/engine/castAim.ts",
      "sha256": "29c592471c1538117a8e199d8683163c6d8c888ad7987ce081373b769722cb3a"
    },
    {
      "file": "src/engine/castingCues.ts",
      "sha256": "632d556e856f6d7c2e1af6e1a9fc21725aa6a2f4c50b6ff7cfc55807c8d5c071"
    },
    {
      "file": "src/engine/castseal.ts",
      "sha256": "9c6188e8eddb986477890285ca5cfe77bcc056340b864739afcc5fd6eccb4e3f"
    },
    {
      "file": "src/engine/challenges.ts",
      "sha256": "d77fc896488be3b0a218763982a0fad3e9e98c55f757b6424645fc909bb3c1c4"
    },
    {
      "file": "src/engine/challengeSpec.ts",
      "sha256": "5000e4e71c544c53ae8040fe5b45bf87c998b8478b5aaa0be9fb44f9e3de18b9"
    },
    {
      "file": "src/engine/charges.ts",
      "sha256": "20f0796de9f6adffef6bf344f9a0742cb456cac204b0f9cc9f11cdde48bdd708"
    },
    {
      "file": "src/engine/chestInteraction.ts",
      "sha256": "3885ccdb875e78e9291c809fce4fd6fd35d1abf99ebe1981965f2b1df2196bdc"
    },
    {
      "file": "src/engine/cling.ts",
      "sha256": "cb003b825a81394bbf65d730399e637b63bd220ad26b24a68c26fa59bd0d96e8"
    },
    {
      "file": "src/engine/clutch.ts",
      "sha256": "0934fce85fcf1c556dfb09487d0aa0b0eb6453e2787d762675497e58274fd9fd"
    },
    {
      "file": "src/engine/collapse.ts",
      "sha256": "48c75659871790e5442155dfcd5ec6b5ff6cb675e2376926db4371cfd23c6272"
    },
    {
      "file": "src/engine/combatCues.ts",
      "sha256": "da47803480c0afc0ef20685ffbff014e3ff5323a93df6ca5e8b067b8656b7bd2"
    },
    {
      "file": "src/engine/combatReadability.ts",
      "sha256": "9a96f9b11de741ac8f838753293d328277f55646ff53fd7e6d1777778c7f4622"
    },
    {
      "file": "src/engine/comboConditions.ts",
      "sha256": "18a17b2508d15acf97a924f5510fa17f233e4d8b64a486b9f3f4a5fd23ff220b"
    },
    {
      "file": "src/engine/comboCues.ts",
      "sha256": "bb03dec54740e339baf647903853a5770c3b44d37926d362630bcebf3890c766"
    },
    {
      "file": "src/engine/companionBonds.ts",
      "sha256": "6936226f2c05bd836e1f10b2137289a04e04f6456dc689da2caaaa9b7c736328"
    },
    {
      "file": "src/engine/companionCues.ts",
      "sha256": "3d686e8f0befbd5485ad487c364b338d0d755ba539fde6f645d1d1dc4cf12340"
    },
    {
      "file": "src/engine/companionGrants.ts",
      "sha256": "d435bbf41f96a9271fa3d3b5c18e2ab3d3efcf510ed9890bc09fee3498939e55"
    },
    {
      "file": "src/engine/companionSpec.ts",
      "sha256": "a930ecbaa7ea90259f619ee8790b2f7f18c356c2d5bbea3a3dcd1323ecf9553b"
    },
    {
      "file": "src/engine/companionStances.ts",
      "sha256": "3d1344382aaf9fd8337e90dd1e5ec3f198ebf3e8b0d34aab3c87ac2c4c0d52d6"
    },
    {
      "file": "src/engine/containers.ts",
      "sha256": "b8268a13cebb37ea4b226f7e67bc6c1fc5ea997fd8be6602722b2bc211f8b10c"
    },
    {
      "file": "src/engine/cosmetics.ts",
      "sha256": "1694f6d439af6b33a821b9c549af8b1e53e1319c6472e9af451264205ab4397e"
    },
    {
      "file": "src/engine/costward.ts",
      "sha256": "79e6c1c3c79dac64e7c799971b85f3c09f64e082e3f307ed0414724cbd366d4a"
    },
    {
      "file": "src/engine/crafting.ts",
      "sha256": "8261d5706525ed35b1ec7a6168ba797ae3db969757b578ad31d68fbeac69ae92"
    },
    {
      "file": "src/engine/creep.ts",
      "sha256": "5a22fa4473634318bcd70cf2cab2459f4164c2ac579e32197a8781b8af0ed7ea"
    },
    {
      "file": "src/engine/creepers.ts",
      "sha256": "5ffbf6ec44f4d9536bba2c6960e9f0e355a8dcec815ce0d42e8364cf6ea50633"
    },
    {
      "file": "src/engine/creeperSpec.ts",
      "sha256": "d61700118b0ff5c8424186ec1f8edd0881e5390c0b500533be0a41b3c5abcf98"
    },
    {
      "file": "src/engine/curves.ts",
      "sha256": "2301cc4f51747d4a26037860480604f7f323c2af34d941849ec6e664ddf05dec"
    },
    {
      "file": "src/engine/damage.ts",
      "sha256": "dbfe8a43e1c92842e46ad0ebfb819cd412fa7ef69bf4c114d481fedba4551b4f"
    },
    {
      "file": "src/engine/deathPresentation.ts",
      "sha256": "3c1721da16167988cdf708127ef8826afd97f2686846acfc6aa378c07d5f1bdd"
    },
    {
      "file": "src/engine/deeds.ts",
      "sha256": "98678e0c71cdaf7b5756253bc17ba43621e5b96c3228c66e4c4f2e5b594939ba"
    },
    {
      "file": "src/engine/defense.ts",
      "sha256": "5e15d4d1a6b13ab1b3a7b78cecf3b6b223cef8344f356700fba37fc85cabcdab"
    },
    {
      "file": "src/engine/defenseCues.ts",
      "sha256": "2e9a0452acd96e788bcdf57dcb7dc677380adc7b548283796e59226ba528eb46"
    },
    {
      "file": "src/engine/dialogue.ts",
      "sha256": "80bb310669b004cb8e2bf8e678928b0dedd8ca8c8c632fdaa3e5f37b889fea42"
    },
    {
      "file": "src/engine/dialogueActions.ts",
      "sha256": "b054ea4bc57d22ba7b040867c5890ddef78ad842d08fb78a82157b75c82b93b1"
    },
    {
      "file": "src/engine/dissolve.ts",
      "sha256": "2d35af54916010a006a8cb303abc9ab6d35ae40f6416f74310bbec4613c9323a"
    },
    {
      "file": "src/engine/doodadFamilies.ts",
      "sha256": "07b25462821ff60f70074505096da32a19ecfd173228735179f1484544a0d794"
    },
    {
      "file": "src/engine/doorPress.ts",
      "sha256": "132bfe8565410a562350c52e0b476c0732199e90674f83e4e3039a360e549b77"
    },
    {
      "file": "src/engine/dwellFocus.ts",
      "sha256": "58d84a0700b0f2786afe8cd3ec615e42266fa2a2874fc1ca93fc12c0b76af24a"
    },
    {
      "file": "src/engine/emerge.ts",
      "sha256": "360cd791e1ef6827208b1a3f689b24224d8988b8ff952066bb3dd018384f365f"
    },
    {
      "file": "src/engine/encounter.ts",
      "sha256": "32c5e117c8f6e03c36b277cc9c5109eed392f991936de7908a4b2e1c5b69bb0f"
    },
    {
      "file": "src/engine/encounterCombat.ts",
      "sha256": "d3c47bd18fd4d9e11416bf37589c182e5683466868206cf9260d09bb0b39da51"
    },
    {
      "file": "src/engine/encounterGroups.ts",
      "sha256": "0ccbfc9899e640f2b791a8c08b228fc64efe29cf9dcbdf12d83290539fd16a0d"
    },
    {
      "file": "src/engine/escarpmentGen.ts",
      "sha256": "13ed4ded60a25335d7f252497900b7b3e51bd9f8aec7f7cb624ad9b1ddcf52c0"
    },
    {
      "file": "src/engine/eventbus.ts",
      "sha256": "63635652a98318b610830dd8e0ce60c7c454a5cb8098120d4685e12c0eb399a5"
    },
    {
      "file": "src/engine/eventWeather.ts",
      "sha256": "88f9e03285ed1091818a202f57ec83103d5dcf2dbceb53d4a5740a177eda1082"
    },
    {
      "file": "src/engine/exitSiting.ts",
      "sha256": "63a4d6ae47f6db11ab8922d4037ceee0bbee4e8d27119a7285a3fe7d4dad3268"
    },
    {
      "file": "src/engine/explorationDistricts.ts",
      "sha256": "a8361a27a64b133d4a3f7cac6205d1fbc85d422e091fdc59ffb7e4d32ca072da"
    },
    {
      "file": "src/engine/feedingCues.ts",
      "sha256": "8f3718c592eefe47eff3f671d0ed26b34af0cb53631a890cca43d67f888db812"
    },
    {
      "file": "src/engine/fieldgrants.ts",
      "sha256": "7e3380e4d14fab2ce57aead1971d42d00a1b1fcac79ff11faf0668562f4de2a7"
    },
    {
      "file": "src/engine/flaskState.ts",
      "sha256": "e7ec7eccc01213fb868abb9fb828b31eaeb65ed000510f7e410f6e671b5c8e77"
    },
    {
      "file": "src/engine/flight.ts",
      "sha256": "2684cddf354c878d6b3aa24bd4984b69797444efb5a6f95565ea601fcca78a90"
    },
    {
      "file": "src/engine/flux.ts",
      "sha256": "39b61f295abc85c528588f0d17971eb7e291fdadc28c7c14bf69666fc05b8f0f"
    },
    {
      "file": "src/engine/fog.ts",
      "sha256": "ed82d5978d280c65e1930a67c3c28708415056ef2f991afb7e6c8fa0234aa49f"
    },
    {
      "file": "src/engine/fontPlacement.ts",
      "sha256": "65c2b09088de82601a7cd5354b7a0f2fab27de0cf335e0f4782d997f1ee9ae2a"
    },
    {
      "file": "src/engine/foresight.ts",
      "sha256": "f709bb9452eedbf6870897547101f3961e5c45697eb03c4e624c3346be64c011"
    },
    {
      "file": "src/engine/fourthwall.ts",
      "sha256": "a38171c8a907c630e2de41ee68223aa6c4071463d3395b6b67090a5a9b736e55"
    },
    {
      "file": "src/engine/gauge.ts",
      "sha256": "358e581df8c2a592d085c2eb5414b44c19fca25927c1bf0c01e4a94eb697d48d"
    },
    {
      "file": "src/engine/gauges.ts",
      "sha256": "0965650f89d499bb56fd58f298d27c527d9d17c6755b3ad111be901cd3963339"
    },
    {
      "file": "src/engine/gemitems.ts",
      "sha256": "99c963f3dbae3277022549e090cdacfab7c8802bc2ba8942e410107a9736d5d7"
    },
    {
      "file": "src/engine/genkit.ts",
      "sha256": "20e656f881d4c7623018f90067f8299c5bbeefbaaf5651da5d8efdcd7ec99005"
    },
    {
      "file": "src/engine/genPins.ts",
      "sha256": "45b59d6cd9bdb02efacb332fa6c5cccef211f0feada544139be22c1bf9dbb987"
    },
    {
      "file": "src/engine/geysers.ts",
      "sha256": "74651875639b000794d6235430e290b8008e22667d64d8f66a2480f222498f3c"
    },
    {
      "file": "src/engine/grab.ts",
      "sha256": "e45661cfcfa5044d6acbcd05bac2c3bca7b7febd7d63ef9a4b960106017c84a1"
    },
    {
      "file": "src/engine/gridSpine.ts",
      "sha256": "450db867056c8b201fcc7fe93c2a405b7e57877f8a4e719917b1d8ed5d78928c"
    },
    {
      "file": "src/engine/guardArts.ts",
      "sha256": "423d73d064a9a7da045d7a4ed9e7de5f53ff9e3d78bcaca5352cce599118a75e"
    },
    {
      "file": "src/engine/guardArtsSpec.ts",
      "sha256": "91b2d9d9009ec8f6d5426a630b88e43d654cfe5aade93c3c89036f738644052d"
    },
    {
      "file": "src/engine/guardians.ts",
      "sha256": "3143fd75c85d6f8a3de56a0de715cd5773f72d06f2d8b1b5344355dcfb822032"
    },
    {
      "file": "src/engine/guardianSpec.ts",
      "sha256": "0822fed626965810e7f74bc0c3a5421c9d3eee345e5e424a437b2ae6decc94db"
    },
    {
      "file": "src/engine/guardSurge.ts",
      "sha256": "38430d746916ea072baa92b33b92f73e28eb7b405ae22013ddd9058faf030d4c"
    },
    {
      "file": "src/engine/handling.ts",
      "sha256": "c92b22a808ec08d2b3ea281226beeb79520656a63a7d123dd129934eaca2b4b1"
    },
    {
      "file": "src/engine/harvest.ts",
      "sha256": "963259e607b7f53c6d93960aca075fb34a2db2d7f4a374eb9955ce8e264144ea"
    },
    {
      "file": "src/engine/hash.ts",
      "sha256": "70d7fde28e2803a587f5b798008906fb2fb46aeafa1eaf94de96c94f8f310cd1"
    },
    {
      "file": "src/engine/hivecall.ts",
      "sha256": "1716e5cca6f0780014e064158be8b6bce65f6b43d972b057a61cb259f61b9c74"
    },
    {
      "file": "src/engine/holdObjectives.ts",
      "sha256": "b24d105adead3eba857874d8ad5497366987a42a398ea43b4c9a881f1c257985"
    },
    {
      "file": "src/engine/interiorGen.ts",
      "sha256": "348c1239eb024bd550e54b63918b73e18bde7c008b040b8bd64c6f5003147d60"
    },
    {
      "file": "src/engine/inventory.ts",
      "sha256": "f813317cd2ebee2ef87a53c457e62123799b470ffd0487840273b73c1f25ad57"
    },
    {
      "file": "src/engine/invocation.ts",
      "sha256": "93f99cda428085972cb2fbe8dc15dc573f75d0f2f9cf5cf47cb7d431e2997778"
    },
    {
      "file": "src/engine/itemchoices.ts",
      "sha256": "58fb0ea9995f4840e805b2d6cc16f2ae2e6f5e2ed39d22844d935a76abdad638"
    },
    {
      "file": "src/engine/itemgen.ts",
      "sha256": "c0de581b67894898817f1cfc1d2175f00a626ce035649c697f9233f777c6c82f"
    },
    {
      "file": "src/engine/itemLimits.ts",
      "sha256": "fe51f75084d25328bcec37d9abb1f08219fc58956ef5e825fdfe891634fbef0a"
    },
    {
      "file": "src/engine/items.ts",
      "sha256": "795ebbf951a6ff23ef41e4f4fc4532a3b4f6faea15eaa896d6dff5ef80bb27ec"
    },
    {
      "file": "src/engine/killHandlers.ts",
      "sha256": "77100bfc68057eafb2c6c71a3aac493350769bb012f538c362b8ab474196257b"
    },
    {
      "file": "src/engine/lairs.ts",
      "sha256": "faee1e07666003e85a9f5f67dedef6252c6a0833eaf2d31e2ee01ae362c671f0"
    },
    {
      "file": "src/engine/lake.ts",
      "sha256": "1a9e57d295a5cb85caa2059b4aa02f7e2175c61e9d4f0bc23438aca44f236fbf"
    },
    {
      "file": "src/engine/landmarkBuilders.ts",
      "sha256": "96e8d15341a6275b7b2e19d917e0b535eed5caffc5fb6d10c24ff89797729e19"
    },
    {
      "file": "src/engine/landmarkComplexGen.ts",
      "sha256": "8e6a743d3c34a802e1aa66dd0e594e84a3c2522ac96d1f13e7ddcb17e37d6290"
    },
    {
      "file": "src/engine/layoutRecipes.ts",
      "sha256": "c342bb32afea0ada3c4c1f7724bb63cae140bd467a9e98f7a05ceb1fc54f44d3"
    },
    {
      "file": "src/engine/levelgen.ts",
      "sha256": "3f11ca1516621e5c48c40880b7532e7aa1e45602b82c04ef2b42f9ece8933921"
    },
    {
      "file": "src/engine/lightningVisual.ts",
      "sha256": "03884c0de4e3973153f5f61c93cd1ebb6a8d1e77684028108a363f70ef504cf3"
    },
    {
      "file": "src/engine/lightwells.ts",
      "sha256": "c6140d21c2bc5273b11df1c131695154e13f981affd466e320e698ff96d63aaf"
    },
    {
      "file": "src/engine/lite.ts",
      "sha256": "c96df2ade63439ff478188afa961a9635cf493cd74ce52de0fd724f7700c0c72"
    },
    {
      "file": "src/engine/localeGen.ts",
      "sha256": "6326f2a6e7413c1b51de6888a74dae05f1b574418c6a8030d2d416184ae375fd"
    },
    {
      "file": "src/engine/loot.ts",
      "sha256": "cf2e8ae94536bab373167a630e5382bf7cf5da788a4002dab10edbed5ac5483c"
    },
    {
      "file": "src/engine/los.ts",
      "sha256": "8c6f5d1727bf97537a33ad929609c350fd4cc83fdefc135dd18c6fe423daf9d3"
    },
    {
      "file": "src/engine/magicPackEvents.ts",
      "sha256": "19a387fa86a43ec263db8daf9c9046e6e39d3d776c2a516c3bced9800756bd0c"
    },
    {
      "file": "src/engine/magicPackMechanics.ts",
      "sha256": "35025355dcd2038d03ee082c05d99e69e60ee0ca59bdf2a7728bef61bc5502b9"
    },
    {
      "file": "src/engine/magicPacks.ts",
      "sha256": "3b77365201b18fae3711a4dd49dc8ff75dc2b8e9454f60da17226c6c06091b8b"
    },
    {
      "file": "src/engine/mass.ts",
      "sha256": "a12a0c9e45964b7a1a42d192bd8ee20da49c8070d365bcb5256be9f7b0b75f93"
    },
    {
      "file": "src/engine/massif.ts",
      "sha256": "0a9fe6c7edf14ece7e3f492c1c808960be53e085e29f32e4ed8ff3d3b9582fc2"
    },
    {
      "file": "src/engine/meleeReach.ts",
      "sha256": "e98f30dcb19261dc290e0001cc295f6ce7b09b5df3ac89ed160138d64a011ff0"
    },
    {
      "file": "src/engine/memories.ts",
      "sha256": "7f0f1370aebfc058e0d18ee5de32a6117ba0a369a12e247c85db9a325f9fbcc1"
    },
    {
      "file": "src/engine/menu.ts",
      "sha256": "1ebc5ef54880ae5194e501e654aee33e597c708df2b880346159e15d5f0f810a"
    },
    {
      "file": "src/engine/mercbrain.ts",
      "sha256": "74854c54dc703afe966e4e84a71e7c5dec80b2913daa500317791cea5b04ed43"
    },
    {
      "file": "src/engine/mimic.ts",
      "sha256": "48acf647b2dc7fd0feb731f2059d04345251c3d85cfb474fb98f3b6c1ede0afb"
    },
    {
      "file": "src/engine/minionCombat.ts",
      "sha256": "18fbcd3e02f749079b710237b14709478216317b0d195118bf001a91aa0a5ccc"
    },
    {
      "file": "src/engine/minionInheritance.ts",
      "sha256": "36adef52c50aa49ead2ada3a8ebd028c4fd89456ad83f5e60df273a8dcf40e5a"
    },
    {
      "file": "src/engine/minionTargets.ts",
      "sha256": "8bf96a34d686d19bb3b25aaddc64666781f4301c6a84832dd601ccf0b22f6534"
    },
    {
      "file": "src/engine/mounts.ts",
      "sha256": "f4e45aa00d0a9aec6e06b988f04e5a9e80e801a3f8c8701e218980ca400bebc8"
    },
    {
      "file": "src/engine/movementTether.ts",
      "sha256": "1c545607b6e18598bb2a50c323fdb7397f56e3f982407c809f1512b3511847f9"
    },
    {
      "file": "src/engine/muDeal.ts",
      "sha256": "dce3e93eebab680245748c650c57031a6fac34ba43423f24fe12692691d4ef57"
    },
    {
      "file": "src/engine/muRing.ts",
      "sha256": "ff93d8cc0168fb6f1e91a51180e43bdfe8170a4525af4d20b38725de0627a95a"
    },
    {
      "file": "src/engine/nativeActorConstruction.ts",
      "sha256": "9c019da7d2930336a0609643a240c31619dc5088e24a815936b2b08125d73a11"
    },
    {
      "file": "src/engine/nativeAIActionHost.ts",
      "sha256": "07ee5a679cff49f8020a2e2e81469215e19e34328d48c3007799ac7340265958"
    },
    {
      "file": "src/engine/nativeAmbient.ts",
      "sha256": "ca700485f6ed65c83795788777d3195115ff28a8125c2b00e5e6284c9986c6d0"
    },
    {
      "file": "src/engine/nativeAreaArena.ts",
      "sha256": "3a491fc22f297e05730bc95f97a507ea76b2c6279bc26aa357020faa57e71620"
    },
    {
      "file": "src/engine/nativeAreaBirth.ts",
      "sha256": "0cc1a5051231216ecb26afeabe4d806a6dc2c7cc54031a9c147e00e8458360cf"
    },
    {
      "file": "src/engine/nativeAreaBoundaries.ts",
      "sha256": "5117b9ec6cde9ac205c1e27324b0ceb383f654053a183ef220f3d0d50fffd7ac"
    },
    {
      "file": "src/engine/nativeAreaLayout.ts",
      "sha256": "b32dae389d6e34beaa2a6a69aad7e69e4f0b22c2c82512a4902a8530411ae68d"
    },
    {
      "file": "src/engine/nativeAssaultHost.ts",
      "sha256": "d5ba88b144301893f3f1cd712c06e133e021d6f9333f14660e6547f8cf7eed31"
    },
    {
      "file": "src/engine/nativeCharacterCreation.ts",
      "sha256": "d1172bda77f7489e54311ecb1dfd1fd1cf6b04acdfef0ffca36b635639e14172"
    },
    {
      "file": "src/engine/nativeCharacterRestoration.ts",
      "sha256": "b5abccb92ee2378bbbc1fd3118be65447678c949f5d4fe8373861719f4791450"
    },
    {
      "file": "src/engine/nativeCombatRecordObservation.ts",
      "sha256": "cb65ef1fbb88507e9103408f2a358a7a8d78ee0d03e88b9eb7346140b570789e"
    },
    {
      "file": "src/engine/nativeEncounterGroup.ts",
      "sha256": "c77bc5396ce24d1176b0a3d3c4ade1a796ac3f9a01cbd7d30ca04c1cf446656c"
    },
    {
      "file": "src/engine/nativeExitPreparation.ts",
      "sha256": "79e104e22cd81d4c9dc27276512120264a51bf5fd21f8b0349ce384d7b18fdeb"
    },
    {
      "file": "src/engine/nativeHostility.ts",
      "sha256": "6703568c543a792a5ef421e40d6b7491f83970735d74bac1ad01affd4898ebc0"
    },
    {
      "file": "src/engine/nativeInhabitants.ts",
      "sha256": "de8998a3ef8bd44939a927108e85d13b45100411b2d58d17d46a87e9d283eacd"
    },
    {
      "file": "src/engine/nativeLayoutGeneration.ts",
      "sha256": "a64572af516c7bd831d342a3c1e234cc17255269883f29b93729234544e64b07"
    },
    {
      "file": "src/engine/nativeMonsterFactory.ts",
      "sha256": "c297dd2e1d8a0f099a8e6ecfec29b47b4a24c4251c29a33c76b336c71fc90bc1"
    },
    {
      "file": "src/engine/nativeMonsterPromotion.ts",
      "sha256": "5c4032242ecf93b6ef9ba4151931fff4a32e8058d44cade1028f908696848a4a"
    },
    {
      "file": "src/engine/nativeNavigation.ts",
      "sha256": "6e46954545e5b20a6f7e8c18ac433673b4c65008059968e9f9bb7d56d23f1532"
    },
    {
      "file": "src/engine/nativeNpcDialogueHost.ts",
      "sha256": "daefc25b507687e965a3f08f4466301d02157e892c492a39e467a0c455e1be49"
    },
    {
      "file": "src/engine/nativePlacement.ts",
      "sha256": "1c579621c5aec9705706e0ac42a62822f5a2e454179534157becc813c50cc276"
    },
    {
      "file": "src/engine/nativePopulationResolution.ts",
      "sha256": "f7d575983ab449a2a27fbff9468eb9ddb0980cd3241d03bd0f9a19c5ad456af0"
    },
    {
      "file": "src/engine/nativePopulationRules.ts",
      "sha256": "4530a37dbbebf1f4c34f5dfad68937b29ff5a09081aa6b5501f83bb21e3c35db"
    },
    {
      "file": "src/engine/nativeProgressionMeta.ts",
      "sha256": "fa638ecee47baef81a9e9875ccda54f35a14f8386e374113728895e02a9d50de"
    },
    {
      "file": "src/engine/nativeQuestOdyssey.ts",
      "sha256": "16bd44d4c17aa52f54bd3616d33470ef6ed45cf651c1c4c3333dc8af86dcf278"
    },
    {
      "file": "src/engine/nativeSceneActorTick.ts",
      "sha256": "e8b9fdd71e0d040edf465ab9340c69274ac1f4d3c4203c161cd62afdab2d216a"
    },
    {
      "file": "src/engine/nativeSceneAIHost.ts",
      "sha256": "d23351a861719cb514654f1b237f6cd0760cb02031d53a586e02e893a9d1cbbc"
    },
    {
      "file": "src/engine/nativeSceneAIPreparation.ts",
      "sha256": "3c89456c5866bf859f77f4ce1dce630d6519ab93e743e90633f9b805fc735f3f"
    },
    {
      "file": "src/engine/nativeSceneArrival.ts",
      "sha256": "d430595fb45b858cdce4c05062157a90ae8256bec4d67eafadac17a1812a7ebc"
    },
    {
      "file": "src/engine/nativeSceneBootstrap.ts",
      "sha256": "9183198902a6f8e8b1ce15e6e228ac28fe6e6d8e567e39d3cf3de86fb1581c3a"
    },
    {
      "file": "src/engine/nativeSceneBounty.ts",
      "sha256": "ee99c8c06e69d5eb80c9002a77fa7c10ddffd6aeb90544ade5a1d33dd472391b"
    },
    {
      "file": "src/engine/nativeSceneCampaignDeath.ts",
      "sha256": "7b01d07f3f00273dee823b349672b4ebf8c778d4176edc38ccaf2aafb427c259"
    },
    {
      "file": "src/engine/nativeSceneCampaignEvents.ts",
      "sha256": "039f9745e92f8161cec2fc4139c8b21cebd9e2cc73d5964dc64bfd28610bd070"
    },
    {
      "file": "src/engine/nativeSceneCampaignFrame.ts",
      "sha256": "8f47d200ca679112277888aff60c5865d09ed6d079ca70df5db08b3eab8444ee"
    },
    {
      "file": "src/engine/nativeSceneCampaignFrameClosureHost.ts",
      "sha256": "59ed9b02abf256f6c8739a2aed7c202d0953367a3013fadae4bdad3ef7ed39a5"
    },
    {
      "file": "src/engine/nativeSceneCampaignFrameSteps.ts",
      "sha256": "bed70707ccde4ec3a60ada153c4f9302a96ac650d38e2d46606e84a3b941e653"
    },
    {
      "file": "src/engine/nativeSceneCampaignLifecycle.ts",
      "sha256": "46d62e1f75b6d932bd09b698fdcd051a4887666d317845d4480c6ec9a4dfb0cb"
    },
    {
      "file": "src/engine/nativeSceneCampaignQueries.ts",
      "sha256": "251615bdc583601da69a55d4218f6d09c2c5c38e946ecde4bc5b4e2de12a1095"
    },
    {
      "file": "src/engine/nativeSceneCampaignTransitions.ts",
      "sha256": "db9cd0c5fc9ed16140e1ef41b3e5e4d32b5d71b6d427428c7c9841db071dac10"
    },
    {
      "file": "src/engine/nativeSceneCastingPreparation.ts",
      "sha256": "5e6bbca1410a421214cda443e6417b07f42f72d17307a8a45690197e2d2137d3"
    },
    {
      "file": "src/engine/nativeSceneCoast.ts",
      "sha256": "a6ec0c73bdfebeff070f7e3352ab885201ba7b99522701d54c614d9b8441d6d1"
    },
    {
      "file": "src/engine/nativeSceneCombatArena.ts",
      "sha256": "a612067449422a303910d6be6ff05447b2f356643638bc7c761bd6f6ecd5c688"
    },
    {
      "file": "src/engine/nativeSceneCombatCampaign.ts",
      "sha256": "a9d136abb61193d843b6e9541edba5b0b645378414332c1629bea7be59763ff9"
    },
    {
      "file": "src/engine/nativeSceneCombatCasting.ts",
      "sha256": "fd3f3ca62e65533e131216609798c15500fec49090fb4fec793611936e095830"
    },
    {
      "file": "src/engine/nativeSceneCombatContext.ts",
      "sha256": "5eff53eb6ec1ffc31b5bb244649853ffc6fcc25d50429dab6672fa9257c6c441"
    },
    {
      "file": "src/engine/nativeSceneCombatControl.ts",
      "sha256": "3efc2fcaa848070f5f2e7f545e9381dc9c691c954c0a44b1326e7301f424286a"
    },
    {
      "file": "src/engine/nativeSceneCombatEvents.ts",
      "sha256": "b58f70ec6731fffd5a3aecb653acd0974140cb3db087a2b713c012e4225e0224"
    },
    {
      "file": "src/engine/nativeSceneCombatHost.ts",
      "sha256": "3591322328583fa1c8d7060420145df361bb6f29448c7959b2a7657eeca4f2e9"
    },
    {
      "file": "src/engine/nativeSceneCombatMotion.ts",
      "sha256": "8f4c7a9920e72f65f028c9723e85c1c077e7742548f14cfd4e5367c80798f1ec"
    },
    {
      "file": "src/engine/nativeSceneCombatResolution.ts",
      "sha256": "2d50726ff39a3379f19b7e16f333c60bbda54e14c46cb9baee15a18ef269f06f"
    },
    {
      "file": "src/engine/nativeSceneCombatSpawning.ts",
      "sha256": "6dd2a7120bf21c66070a15ec7baf83c72050e627edaa210105bca8f0efc3b7ff"
    },
    {
      "file": "src/engine/nativeSceneCombatState.ts",
      "sha256": "2e5b873d67cf5b8813e616c4af0e325dfbd863bee6b6e327c753dbe79395dc58"
    },
    {
      "file": "src/engine/nativeSceneConfig.ts",
      "sha256": "77eb7f2f6e0089bf6fafba84c819d9ea9c4645305758cd62efd889c1f70ab314"
    },
    {
      "file": "src/engine/nativeSceneDefensePreparation.ts",
      "sha256": "b0f494f8e25d9163c3a3c26c4ec5e574b7eba61a4f70176e2b31e10b4c3f7539"
    },
    {
      "file": "src/engine/nativeSceneDepartureMemory.ts",
      "sha256": "cc14341f178bfcf79d06dd5d6d5e02d660ccab85f12aa04792e65824b5f9957e"
    },
    {
      "file": "src/engine/nativeSceneDescent.ts",
      "sha256": "e545f66aec2c0f8969bc22cd8b56791d5a0e0908b2ff0190ace5f0fcdd0da580"
    },
    {
      "file": "src/engine/nativeSceneDirectorHost.ts",
      "sha256": "444bf0805c68d6632a9a3ab798616b10708591303440249a644d85bce469d286"
    },
    {
      "file": "src/engine/nativeSceneDirectory.ts",
      "sha256": "ea91c28295f697ad01449a3bce69c4d63f055743382d4033ade643d206c1db4a"
    },
    {
      "file": "src/engine/nativeSceneDisplacement.ts",
      "sha256": "e8ce1f088b4d1c3c858cf952a386dca65a22732cd15c6bf09c66cd83c5b1f067"
    },
    {
      "file": "src/engine/nativeSceneDwell.ts",
      "sha256": "33e8fd68ebe847ca643f1fa83f1b97902ffbefde3645004c3967062c8d7812b0"
    },
    {
      "file": "src/engine/nativeSceneEcology.ts",
      "sha256": "438797d4e5947799628330fe844b6c20c85df8669952afd4fdb37436132e19bf"
    },
    {
      "file": "src/engine/nativeSceneEffectsTick.ts",
      "sha256": "ae3198896899a8d03740e9c7be809f12ef228a024bc6d66d9f083d02c84f67f6"
    },
    {
      "file": "src/engine/nativeSceneEncounterBirth.ts",
      "sha256": "67eaa96719e3a79b7036db5eca9475a9c790b949bd61210fbc0211ad77861e37"
    },
    {
      "file": "src/engine/nativeSceneEnvironment.ts",
      "sha256": "4c0ae7643bcba643af9f21245267f32ab9ee3aba7d695157a75eef9f2fc8a760"
    },
    {
      "file": "src/engine/nativeSceneFrame.ts",
      "sha256": "885b8e4199a46b1208889101b3b7d23bd73346a16d040cdcef03bb42a458cfb6"
    },
    {
      "file": "src/engine/nativeSceneFrameAreaEvents.ts",
      "sha256": "8e61391a6c801ce37ede690ad9d375ab772dc4c71eb548116f0108c6f24ea3eb"
    },
    {
      "file": "src/engine/nativeSceneFrameCallbacks.ts",
      "sha256": "66971baea8616471b98ababa55164b18ff095e049a5535e61d95a00796e1e7de"
    },
    {
      "file": "src/engine/nativeSceneFrameHost.ts",
      "sha256": "e80e57b96054085788066114deb4f51a1b6aa743df6318a98538d99ebecbfb02"
    },
    {
      "file": "src/engine/nativeSceneFrameServices.ts",
      "sha256": "286666fad21e8aea69538b8a7b0a2c0d2e8384250b969aa6c10357f18038082c"
    },
    {
      "file": "src/engine/nativeSceneFrameTravel.ts",
      "sha256": "429a88f73f871f5f54cc294a82a9264a3d2a27158006e8a1fd7b3b4c17d0960d"
    },
    {
      "file": "src/engine/nativeSceneGeometry.ts",
      "sha256": "e376effec05cc53f7a1b2aa2fa20f24239a7e37b47d47504516d0d73d27ea5cd"
    },
    {
      "file": "src/engine/nativeSceneGraph.ts",
      "sha256": "2e151a3f2ff95b755d7c4fac15999948f6ba626433115bac2e5a382f834e4847"
    },
    {
      "file": "src/engine/nativeSceneGroundFollowUps.ts",
      "sha256": "c568fd4f3ce7674868200d4b63a4c7ea330664cc6c92d0348b9aa4b0e73578f7"
    },
    {
      "file": "src/engine/nativeSceneHarbor.ts",
      "sha256": "9ec52f62351f1dc3cc3ac77c43c02acd89959a9552db1f4a07ffa91bcca8b459"
    },
    {
      "file": "src/engine/nativeSceneHistory.ts",
      "sha256": "b195be850796deca451d5acdfb34d1e87ea6a95afe3290382e69eb9f07b7f66a"
    },
    {
      "file": "src/engine/nativeSceneInput.ts",
      "sha256": "fee472e85f4018061fc16ed2804d99bedc87bea341931f363424ec7df7dda1fe"
    },
    {
      "file": "src/engine/nativeSceneKillAftermath.ts",
      "sha256": "60605459504f4e84a6282147b6d4ed239736c734f1241fee17d119e7889800e3"
    },
    {
      "file": "src/engine/nativeSceneLocalControllers.ts",
      "sha256": "ad850b74d7bb75ad8e0f1c2ce3fe5078d8c65e90350054b9f5d6b5d76386ff16"
    },
    {
      "file": "src/engine/nativeSceneLoot.ts",
      "sha256": "c830da86f515840c4758ad0c85156b675f94381170c65495f80c2f9d8712ff0a"
    },
    {
      "file": "src/engine/nativeSceneMemory.ts",
      "sha256": "058867bfcb82d23e9166f392d33a061d985d07cb14c7b9a02b96863d6a239bb1"
    },
    {
      "file": "src/engine/nativeSceneMenuHost.ts",
      "sha256": "3539b75d8524c9889ad999bbe08c5edb3eb3519a22d79ab099f612aed37d8f6b"
    },
    {
      "file": "src/engine/nativeSceneMenuQueries.ts",
      "sha256": "7b448ab271e3ed0e6c0a50da05bddc3c1d8c9b71119c43d7d237ab2e8409d3d9"
    },
    {
      "file": "src/engine/nativeSceneNearScale.ts",
      "sha256": "1833c31e4cf553492aa26fec849e166c7b19955d9d9dd6cd182f4dec16a09095"
    },
    {
      "file": "src/engine/nativeSceneObjectiveCompletion.ts",
      "sha256": "be81f8adf6f13e4a4c9307573f02c554517e1538cf120c9b03866be80c8c76db"
    },
    {
      "file": "src/engine/nativeSceneObjectiveWatching.ts",
      "sha256": "fd3dd3eb012531bff794f1a93837db7e4cc7e9efe1821d57101f8bd17ded78c0"
    },
    {
      "file": "src/engine/nativeSceneOccurrences.ts",
      "sha256": "321f332fcfd526b648e2f705fb00b5f7cb17d2e59856eaf27468133b8682db55"
    },
    {
      "file": "src/engine/nativeSceneOpenings.ts",
      "sha256": "2fde761bd077def80fb87109d5e535c6cdbac648c0a832260eac10cfa94815ae"
    },
    {
      "file": "src/engine/nativeScenePopulation.ts",
      "sha256": "518d9601db3fc0ad63ad2e53e6b7b91d651eb68d16d96a0fbaf0533be27546e1"
    },
    {
      "file": "src/engine/nativeSceneProgression.ts",
      "sha256": "c98aaa9bb1f0f3523f2f867abd70312afbbc7a7456eab62c8a365f8a9592fb95"
    },
    {
      "file": "src/engine/nativeSceneProjectiles.ts",
      "sha256": "010d4baa38c46803df7ae0d169da2d5bf4c652e4d759547788482b536db64a31"
    },
    {
      "file": "src/engine/nativeScenePuzzles.ts",
      "sha256": "1231d2939bf1955d19149ab69b09a748de5e8a99ab20dd8833b43c18822f09e6"
    },
    {
      "file": "src/engine/nativeSceneQuestInteraction.ts",
      "sha256": "c911353d1bf949f6367d98cf12724c2d466fd7d7e95c669b0ca362ed9d3a120e"
    },
    {
      "file": "src/engine/nativeSceneQuests.ts",
      "sha256": "3bd54761c3b14b3f20d5b1ab44e514e0951ab6bd7a401a480f20bb66d80ba7c1"
    },
    {
      "file": "src/engine/nativeSceneRealmArrival.ts",
      "sha256": "c6decab1c1a92ae3057d7f264a7e142b07a31c1f9be7ad42e78d77d6dd3df65b"
    },
    {
      "file": "src/engine/nativeSceneRegistration.ts",
      "sha256": "695383b5d9b20c2f5fd28c360c8c42becbe39afc1e016584b941d07be5e76990"
    },
    {
      "file": "src/engine/nativeSceneRestoration.ts",
      "sha256": "9ae4008adde9c08d86688665aae21e9690e67c2db728eaf5010a6f623141b609"
    },
    {
      "file": "src/engine/nativeSceneRoadContext.ts",
      "sha256": "9e9a6d9f30bc5de9ed53bd8159e56fa0a78906a6cd080774c12295cc1f52db79"
    },
    {
      "file": "src/engine/nativeSceneRoadScan.ts",
      "sha256": "31871ba94bac5f00cb897d4ba3e39272b0b20aa649c6e740224e52784782b8cd"
    },
    {
      "file": "src/engine/nativeSceneRunConclusion.ts",
      "sha256": "da6de61752f2c5116567b750ac15badbee810b8f616a258c36ad607949becaaf"
    },
    {
      "file": "src/engine/nativeSceneRuntimeBirth.ts",
      "sha256": "677a995baadd1292760ef4be3b777bdde64c1dd51735fc3c81227da8044802ac"
    },
    {
      "file": "src/engine/nativeSceneRuntimeRegistry.ts",
      "sha256": "e88312be2b33e820a1d69c21a6d91bed98454d3f881479170dcfb25a8491980a"
    },
    {
      "file": "src/engine/nativeSceneSeatHiring.ts",
      "sha256": "4a302f3ec489785ff3187da4765e58a9a3ded52ad2b569f1b5285c722ba729ba"
    },
    {
      "file": "src/engine/nativeSceneServerVessel.ts",
      "sha256": "e4543c78da50b7dbca142aacec659ebaa2bfa6f5bbdcc03b1d9b12e502c025d0"
    },
    {
      "file": "src/engine/nativeSceneSites.ts",
      "sha256": "77a2a4ae7f36684a636a093698b6fb2676bcb51cac89f9916836834705a7944b"
    },
    {
      "file": "src/engine/nativeSceneSkillArrival.ts",
      "sha256": "13ac96aa67a97e3f79dcdeee47e9b24e0a666ca679f3da237ecf634f565cd0a9"
    },
    {
      "file": "src/engine/nativeSceneSky.ts",
      "sha256": "57e294f28269a18171c81ef3d757323d8c066760a01a2ed46411a10edb170be0"
    },
    {
      "file": "src/engine/nativeSceneSources.ts",
      "sha256": "31b9d3402962ae67397ac4b78179c0ab15850ecf3a77e89fe12eb6aa12ae9d2b"
    },
    {
      "file": "src/engine/nativeSceneSummonPreparation.ts",
      "sha256": "13305c7aacc0abf4fbc96ddc7b4efb79afd941d7af7213d2428abc8dc5b3ce10"
    },
    {
      "file": "src/engine/nativeSceneTerrain.ts",
      "sha256": "fb74d7de7e568a6a58348e747f69a3e75b25b3c1433948d6cabcfd1d6bcbb208"
    },
    {
      "file": "src/engine/nativeSceneTethers.ts",
      "sha256": "d24b0207aec57ccce4726350b5f176ba1ee4172d410a53e4ce0285b6f8feb947"
    },
    {
      "file": "src/engine/nativeSceneTheater.ts",
      "sha256": "0b05a888d9e67ebc79289898eee8d747052e66133890c7051f0eb72db5294c54"
    },
    {
      "file": "src/engine/nativeSceneUIActionHost.ts",
      "sha256": "e59f86c5c49d27d4b94dbdcf549c408c31bc0059df8dd5c2f0ab275cc166337a"
    },
    {
      "file": "src/engine/nativeSceneUIActions.ts",
      "sha256": "deab3b24789ab72a56cd5ab6e3950af872e65e6e15e87e189652afd437c8e765"
    },
    {
      "file": "src/engine/nativeSceneViewHost.ts",
      "sha256": "2c147c364f5bf4695a596f3cb5837bce8b626a875fb877ff0b1edec3ac2233a9"
    },
    {
      "file": "src/engine/nativeSceneViewQueries.ts",
      "sha256": "ba249ba5bd51f35047c6cbcfaa8338a9e9d0574a00fc9708d8f688238669082b"
    },
    {
      "file": "src/engine/nativeSceneVoyageArrival.ts",
      "sha256": "afcde989dbe4b3f203af4037025bfd2dff25b31bb9dd34a32c438d3725c01954"
    },
    {
      "file": "src/engine/nativeSceneWarlordBirth.ts",
      "sha256": "c3454a8dd7b2873d0831e2aeeb2049f35b368848576d299a74e9e6a70f26c462"
    },
    {
      "file": "src/engine/nativeSceneWireQueries.ts",
      "sha256": "7cc79f6935c2b8742ef2a51a9db234096a19aee67902b19de55eb9decae8364b"
    },
    {
      "file": "src/engine/nativeSettlementServices.ts",
      "sha256": "1b4ee2d4dc30f0218c464f6b3651bcf7ca1ea5d649b8d12bdfc653cae509aafe"
    },
    {
      "file": "src/engine/nativeSight.ts",
      "sha256": "7a1b7d5d233a5486bc332b63bb1174d8482e992d65eaaf613bf8824af596d729"
    },
    {
      "file": "src/engine/nativeSkillRuleHost.ts",
      "sha256": "c17d88997346663fe3f3fa18f96330118f13ea7810826b33cc7e1ddd99616945"
    },
    {
      "file": "src/engine/nativeStatusProvenance.ts",
      "sha256": "8177f34378484d5851d575e0b9ca5a42976618a424a651fb2707cd9cdab0f12d"
    },
    {
      "file": "src/engine/nativeStatusRelay.ts",
      "sha256": "fc3fc8241ab04334285751f1ad59941424bab41ea8b970216047683ccea7342c"
    },
    {
      "file": "src/engine/nativeTheaterHost.ts",
      "sha256": "5d8ea39a507864421d1b8c370ffaa318e14061e480ca3c87a446103d61300bc3"
    },
    {
      "file": "src/engine/nativeTownBody.ts",
      "sha256": "c9b0635571eedbaef7802bde90929f8323f303a4b64e340d33125057b38611bb"
    },
    {
      "file": "src/engine/nativeTownStations.ts",
      "sha256": "eb6dfbb581b3d120ee23200bf9b4d577ad7681f75d7a1c149e5193d68a4e7dbd"
    },
    {
      "file": "src/engine/nativeWarlordIdentity.ts",
      "sha256": "d07ae988f7f395c3bdec323f8eda93f4d39b41503bf717acc86c0df1f54aa35c"
    },
    {
      "file": "src/engine/nativeZoneMint.ts",
      "sha256": "c49fffc1f8df028a6783d301eb8803064fee55bff2fb26305ad1fcac7b931144"
    },
    {
      "file": "src/engine/npcDialogues.ts",
      "sha256": "5d42bfc49901e598c1d15d9bc8c9b64322f19f513bef5c2fae7019af0437c4ed"
    },
    {
      "file": "src/engine/occurrences.ts",
      "sha256": "d31d8f814fedfecfe82da607084e34d69123d3a8b5f965af68ae929c7e455084"
    },
    {
      "file": "src/engine/odyssey.ts",
      "sha256": "e9276da457da973988110add0bc9b6ef48cad5744dca59c26e9a36d113ac1b8f"
    },
    {
      "file": "src/engine/odysseyRisings.ts",
      "sha256": "ee208499b172abf009ebc34b10cb009183ac21600cbf40fe76023f5ee963e36b"
    },
    {
      "file": "src/engine/orbGeneration.ts",
      "sha256": "bc2a5008a7d11bd9278bb19f337ede98d238ce065fade3e44862d4345136f025"
    },
    {
      "file": "src/engine/pack.ts",
      "sha256": "c394f16106d714d5937afcc9809ef25634c2450fabd9ef1586d6df2b248d691a"
    },
    {
      "file": "src/engine/parry.ts",
      "sha256": "68b63d1e7299a3c3e3f5601fc3e2244be27d298276daf243366f72608bd0bab0"
    },
    {
      "file": "src/engine/party.ts",
      "sha256": "426b4d6a74460cca1ad314fa8600b5767702275a3b3b9a46a6507f8ec947573d"
    },
    {
      "file": "src/engine/passiveRefund.ts",
      "sha256": "d04037d2cb9e294400600c4b761f27a923c359c37a9d6f51ce96369cac2435e8"
    },
    {
      "file": "src/engine/payloadCues.ts",
      "sha256": "b2cf817cf5d0f3d2d4e1c5925faf19629533ac8946e8205c5dfe01eaae8ef6ce"
    },
    {
      "file": "src/engine/perception.ts",
      "sha256": "677babf9224a46accd2be6c9a6e404a3eda7df1dbe6a92145b441c2b8c8d1692"
    },
    {
      "file": "src/engine/pilgrimage.ts",
      "sha256": "b43527ae9fcb9adf4e72a73f7382aebd114c87302b75b10b7988d0c6ad2f8cb1"
    },
    {
      "file": "src/engine/pings.ts",
      "sha256": "62a060064c65f47abfd6e77c968604a03ccc1d810cfac528d23f3feda9d1d21e"
    },
    {
      "file": "src/engine/pitfall.ts",
      "sha256": "74aa7490a3347c123267bdc0db08baaae313537879069e3fe81067f9a9549b07"
    },
    {
      "file": "src/engine/playerCastVisual.ts",
      "sha256": "e5bd8f331b1d7aa7674986633f9333fc1560ebb221c51ece6930503c214d5d37"
    },
    {
      "file": "src/engine/plies.ts",
      "sha256": "b66893ee3eb96bd3368a4707258937b88201596ae8d6b4a95298beff95ba6ceb"
    },
    {
      "file": "src/engine/possess.ts",
      "sha256": "0309c2214312f20f385878c04764d365a36e665786c50c174457deb22ed1fd34"
    },
    {
      "file": "src/engine/presence.ts",
      "sha256": "2812a44bfedb22180cb556fe4dcbc1ee9309fa5b29744fa9df80387b8629d399"
    },
    {
      "file": "src/engine/procCues.ts",
      "sha256": "aded5a12f9c025788a249e504c289b468c1e7c7ec7329f285fdbc454da453e74"
    },
    {
      "file": "src/engine/processionObjectives.ts",
      "sha256": "40d6f5211cd99c5a60605b0efbd20aebb72c696609fe4fc582664149575dbbfb"
    },
    {
      "file": "src/engine/procReference.ts",
      "sha256": "dfc6e49e2f8f62d00c6f155796fb04da4d0a6ec06cb9158e6bed92c84af59958"
    },
    {
      "file": "src/engine/projForms.ts",
      "sha256": "d8cd59552e6fc0883f7055f1dbf9575912bf331dcf87e10525197b1ce36842d1"
    },
    {
      "file": "src/engine/puzzles.ts",
      "sha256": "fef055c7ba5b0a98b6da32d190554833edb343f0e73ae60239038e786e407b81"
    },
    {
      "file": "src/engine/questImbue.ts",
      "sha256": "2a9636c4137a94cf71ecc5b8f4694a391f3b7b8688b1d0b40403cefa3e61ef77"
    },
    {
      "file": "src/engine/questLedger.ts",
      "sha256": "73810003a9d492958cbc73085ed78fe4738085b4394dc26a4e184cf5468b8ce4"
    },
    {
      "file": "src/engine/questRescues.ts",
      "sha256": "9997eb09e1f6cccc85512d385def7a170788a139060b5e4f9e9ac93bd45acba7"
    },
    {
      "file": "src/engine/questRewardChoices.ts",
      "sha256": "83e336a15b0a97ac2d847e9561c0a388901442efe130d935b75e3eca181cae9c"
    },
    {
      "file": "src/engine/rampage.ts",
      "sha256": "8d5b5947097da5aec83d588720fda994d49f1bc8fcaac7177d62d9e2a62af73a"
    },
    {
      "file": "src/engine/rarity.ts",
      "sha256": "6f2531176c44e251d6c8e1acdf2cc5f42b8b126822b191056bdadba5187c9c3c"
    },
    {
      "file": "src/engine/recency.ts",
      "sha256": "1e9dd98cd8d355d76fcc24437c47f1b3b343ccefde5f508fc248aa2e22170893"
    },
    {
      "file": "src/engine/reception.ts",
      "sha256": "eff3a5d710f8aef6674eca4a27b1bf6081a9503b8095e82084b1e4a796782ca5"
    },
    {
      "file": "src/engine/refugeDeparture.ts",
      "sha256": "1c22db6a713abf249bd0e5e49db2000a8873c92f01387572141f708ea0b7155f"
    },
    {
      "file": "src/engine/relicPower.ts",
      "sha256": "ab9219babc9b29f8f3c1d9d53ab612454e1dd250ebcd56a221dcacbc008d3b35"
    },
    {
      "file": "src/engine/replenishment.ts",
      "sha256": "00049f4f83a9a75bf8e49cf4a696ed52a033181c15cf8004c2923566d1ef2ede"
    },
    {
      "file": "src/engine/reserveCues.ts",
      "sha256": "91de5d290083c63ab16bd203d6e1a40355aed09d9b394b860465de740715cb0e"
    },
    {
      "file": "src/engine/reserves.ts",
      "sha256": "98d3451986f84f849c9d215c4e99f0817b6a1fc671ee7bc75e48fcb61748316c"
    },
    {
      "file": "src/engine/rockForms.ts",
      "sha256": "5a2980a3ab7902ee20c5cfb56978d398f70fb4f0eb5d49e8caa264e86099209a"
    },
    {
      "file": "src/engine/rooted.ts",
      "sha256": "52d4ba2099131dd8dddaeca88c69441e9ddb5c85a945025ea14a12708225c379"
    },
    {
      "file": "src/engine/satelliteFlights.ts",
      "sha256": "2e4b8d8e96739bc04f18c447462179f985865d1e3391752b12638ac1918dc989"
    },
    {
      "file": "src/engine/satellites.ts",
      "sha256": "6e503ac3f6bd3a4a753d10306498a24ca6fb807898febbe320fbf6f506838d4c"
    },
    {
      "file": "src/engine/satelliteSpec.ts",
      "sha256": "97348651424b2ba48f5fdef82fd933dbb2b80de4d9568407df0e6fe024b8af65"
    },
    {
      "file": "src/engine/sceneRoad.ts",
      "sha256": "045a0fc4b1ca30800327a81943e3e394a331f170915aa7a63b1f72e24e714755"
    },
    {
      "file": "src/engine/scenes.ts",
      "sha256": "473db48b05c2a26e2fe1ee3a1e2f4cd6299de57407a1d8374601a8c37c1897a9"
    },
    {
      "file": "src/engine/seatlaw.ts",
      "sha256": "e07526d88ebdf5f151f10f1baf5cb18b0d10ab55c28ab15ba410233b49bd5895"
    },
    {
      "file": "src/engine/segments.ts",
      "sha256": "38e3cde47b808ea8ec07741a6b53d375734866dd5c8c747b172b9536a93fa8b0"
    },
    {
      "file": "src/engine/sequence.ts",
      "sha256": "033ba59cff18822678e6e4dabeb612474d08939a974513fd06d933e6f5714027"
    },
    {
      "file": "src/engine/settled.ts",
      "sha256": "fed190251efaa471ccbd8b102acce1d7a4649046f8357fc5db0c79f26da41aa8"
    },
    {
      "file": "src/engine/shapes.ts",
      "sha256": "a7cdd37cd221970959d5c42d5464df67faebc78e2f0f6591e6b33f04d60e87db"
    },
    {
      "file": "src/engine/shardMuster.ts",
      "sha256": "98c06e445d50f523b5f5b670f67b764062870afe5aba87a4a3480c34c3d99255"
    },
    {
      "file": "src/engine/shardRoads.ts",
      "sha256": "3beab6820e34f01d65adcdbe681032d1234f5f47f691dffbdd5b093c7366b1fc"
    },
    {
      "file": "src/engine/shardUnits.ts",
      "sha256": "ec14c0c7f0e32ac892bb9a1f37e0e0644e7012f4b34b151e78393a90abf700ff"
    },
    {
      "file": "src/engine/sightCover.ts",
      "sha256": "dc3ffd1f7cb5fba9f3b54bf019882185fbafecbff6a03dab12b45ddc2c681ccd"
    },
    {
      "file": "src/engine/skillEmpowerment.ts",
      "sha256": "c659d7289a834482b38358fc4e55b7158ec786fe4847544c27e2e08f58e13f23"
    },
    {
      "file": "src/engine/skillFieldVisual.ts",
      "sha256": "b2848d46a8daae13ebcf983e052d80ea2cbfb4c6984042ef17f6aac4c485ba37"
    },
    {
      "file": "src/engine/skillInputOrder.ts",
      "sha256": "c7dd5f5aa663d8c0e41aeefedda1a1d5d0ee6e8dc7ab99e132af1b0ca7e650b9"
    },
    {
      "file": "src/engine/skillMerge.ts",
      "sha256": "4e7670b341b650bb1ad32cc5d672dc56a3b7cd1238f644704c9e48af018da883"
    },
    {
      "file": "src/engine/skillMovementVisual.ts",
      "sha256": "219bdc080de5683db2a63470a60bfbb75307ca99e86bb19fda13fda24a568b9e"
    },
    {
      "file": "src/engine/skillPreview.ts",
      "sha256": "fd9049f70b7c9d44fbfc5998076df28157e606eed9ef918ae8b40dee55378455"
    },
    {
      "file": "src/engine/skills.ts",
      "sha256": "7e6263653e504197b439f8d4681396f28fcfaaff00b1dc74e21b50791253dc12"
    },
    {
      "file": "src/engine/skillScopes.ts",
      "sha256": "fcc7ee24eef09d43f92a28767367b80f7409a93613694df508ac55bdda6df23e"
    },
    {
      "file": "src/engine/skillSelfVisual.ts",
      "sha256": "f7e22dd35a5dc7961bb896449b1f2172ce838417edb9533f0f7c35dc872640dd"
    },
    {
      "file": "src/engine/skillTetherVisual.ts",
      "sha256": "0e3e649fbda620b32f71003c79a84702220c92323e3a955b90e8a808fd284e31"
    },
    {
      "file": "src/engine/skilltree.ts",
      "sha256": "f69483ee3694b0f3b3590fb0d76ed3344ce48e292864819bb60cf459c71f131b"
    },
    {
      "file": "src/engine/snowCover.ts",
      "sha256": "26d317666f98eac66e96491671b1755b313365c87efb70b1862ae08e22a08267"
    },
    {
      "file": "src/engine/spans.ts",
      "sha256": "d7ea489888aa1d89ec36494fc534cbc9e154ffb7db65611b741a4e902bc7c00d"
    },
    {
      "file": "src/engine/spatial.ts",
      "sha256": "849ac10dead8790fa2241bba39655e59e7a031b0e1b20492b13c41cfb12bf724"
    },
    {
      "file": "src/engine/speech.ts",
      "sha256": "2571875bcdadd8cce609d99b2c7b74a44e2a57c9b1a1214a3ba24d2d1747584f"
    },
    {
      "file": "src/engine/speechGrammar.ts",
      "sha256": "16bd538b3f06888cecdd0961420460eac90b2c7a3e9511c0f5ff96b8a48ddc95"
    },
    {
      "file": "src/engine/squish.ts",
      "sha256": "86a70ae81cd1f1cc4e3c3ae9510864ee665114d2d91af9960bf90612dd240813"
    },
    {
      "file": "src/engine/stash.ts",
      "sha256": "1f421a4b8a71fc378325175b154164ba42f4be7f3bec5877e0fcf3d8859d3e2d"
    },
    {
      "file": "src/engine/stats.ts",
      "sha256": "1967810c34bb5a8bc7a03023fb0d24c1321d749a5050fc4040e83846fa9df52c"
    },
    {
      "file": "src/engine/status.ts",
      "sha256": "f4b6a7e42f7cf5bcc2023c502cd6757cab4ffe085a6e2392978090006c6eba38"
    },
    {
      "file": "src/engine/statusVoice.ts",
      "sha256": "b4049873a4c90d96c4a6d079852a84c220ff9d1949f1bf54b2acfa322a665bd9"
    },
    {
      "file": "src/engine/structureGen.ts",
      "sha256": "62f037c144012d1000763508ab47e1d1dfcc49e9b7318be6b69b12d9eb373165"
    },
    {
      "file": "src/engine/structurePlans.ts",
      "sha256": "b3705ebdc9d316d1f2a83fe7f099e8b5a5d20ae65a69cb7d62effe31188f740a"
    },
    {
      "file": "src/engine/summonContracts.ts",
      "sha256": "7fb42ae8c4e2bff47a927bb2c4678024aabe86843758551277b3e9fc33d321e5"
    },
    {
      "file": "src/engine/supportbase.ts",
      "sha256": "e012cd0a303702a6b952a04146ad942d432e075432769ec5d732657019ae6f5a"
    },
    {
      "file": "src/engine/swapReadiness.ts",
      "sha256": "f97a9309f508d094fe12cad8915343edffe99139b3bb5f13cd0e27b964e0c9f8"
    },
    {
      "file": "src/engine/sympathy.ts",
      "sha256": "f66dad992eba1bb738d650d37f6b36df4a4b1714af026709e2fd34026b092f1f"
    },
    {
      "file": "src/engine/tap.ts",
      "sha256": "71cd4dc70d9d262f68d8ed83d7c69b96e8a1e228153a8bb9015460f626d9c1a1"
    },
    {
      "file": "src/engine/tells.ts",
      "sha256": "f49a7f611cbb07048902321b6158129831352879240a7a1568319ef6ed424f08"
    },
    {
      "file": "src/engine/theater.ts",
      "sha256": "99f394b9c4ac8df1d86fe11880f6f0bf4bd58c0132748395f6b50fb8f738a062"
    },
    {
      "file": "src/engine/throng.ts",
      "sha256": "9e19bfdded011de4940578d6f28b266c00a1b423618eae18f777c18ee9ed3479"
    },
    {
      "file": "src/engine/throngEvolution.ts",
      "sha256": "791212f22d673bd37575c1feafc24743f1e90fb3ab474e02a4b172ee0f619078"
    },
    {
      "file": "src/engine/tiers.ts",
      "sha256": "8492e09732df982b1c5bb920651438592dddbbd085717232fecd86a856c18eb5"
    },
    {
      "file": "src/engine/timeflow.ts",
      "sha256": "a8f16f0aa68bc609ffff4e32baf7c07c68edecc4f71edcb99836b52ea6a9a33e"
    },
    {
      "file": "src/engine/titans.ts",
      "sha256": "7106c69ba1d83abebc0c8e2e94764eb942ff44b337b692df21665bdce1cec9f4"
    },
    {
      "file": "src/engine/townportal.ts",
      "sha256": "5d2b0b4933619bfd5b292dc3eb5ea971da92a417fa1a263e5c5515dbf789bab1"
    },
    {
      "file": "src/engine/trace.ts",
      "sha256": "6d847384c821a24c421023a46f12174ecf2b3f67ea5c9a0e20bd6914b5124af1"
    },
    {
      "file": "src/engine/tracks.ts",
      "sha256": "01ea6bc99b6c46ff7cb69d46f94d2fa66ab7e4127aa800d5790ee033384b4b3d"
    },
    {
      "file": "src/engine/trainingYard.ts",
      "sha256": "eabb586b6d4892a9f574a3a6037cef37dfc1652850c35db2c9629a2e002c84a5"
    },
    {
      "file": "src/engine/trapworks.ts",
      "sha256": "24c793773ad82a28f486670b8bd7f1fb37988abea87ceb6bf78bd3f2a70ea1c7"
    },
    {
      "file": "src/engine/traversal.ts",
      "sha256": "fd330661c552fcb2a4a8c6b6655023631738dc93569633d2ffa1d2926368c155"
    },
    {
      "file": "src/engine/tuning.ts",
      "sha256": "e5b965c2a63a1cdc4bf8ac31c74918944e73a2974838b3ba824067fe2361b8ea"
    },
    {
      "file": "src/engine/ultimates.ts",
      "sha256": "e6f32615c0f92fc884c2261f30d1898086e53c3a9393ccb08d7904837e9fdb18"
    },
    {
      "file": "src/engine/veil.ts",
      "sha256": "efdd01eb86e2d528cc60cee28bb72ce871dedfecc80906ead1c0efa439def6c4"
    },
    {
      "file": "src/engine/ventcauldron.ts",
      "sha256": "4994c3dd6b5186b917f1f9e4b27ab26ea37c9570211e84f234347b93ad23a910"
    },
    {
      "file": "src/engine/ventDweller.ts",
      "sha256": "ec9c60d04caebf795b21fd7d594078c8546589321f6af49a78c8feb0500ca4c8"
    },
    {
      "file": "src/engine/victim.ts",
      "sha256": "1d0ddc6578d1e965ef148551df2c52e275cec0eee76283ad739f3e03f09d87ee"
    },
    {
      "file": "src/engine/warningCues.ts",
      "sha256": "c6adbf4e4e2484bf68fc1f1519065dc130d8ebebc8177a7f6b8ca77baaf41a3a"
    },
    {
      "file": "src/engine/watch.ts",
      "sha256": "fc3c859c34b075ae055dfd1b62e580ebc8bc38ea0ee3d1b54a3c8fd46c58e1c1"
    },
    {
      "file": "src/engine/weakpoints.ts",
      "sha256": "47fc89dcc30596d7bab77217006ba25365cb946e62f1ded562ee7a3ddd2c377e"
    },
    {
      "file": "src/engine/weatherDress.ts",
      "sha256": "709ddd7115332454e674748cc0269e4f44fab0f64584ae49b745a290f89fd7a0"
    },
    {
      "file": "src/engine/world.ts",
      "sha256": "82f6f329f6fe9da9aeed6e6410eaf4148d5e8310ba7928ca6db0ffadf6a211fc"
    },
    {
      "file": "src/engine/worldgen.ts",
      "sha256": "3945ca6d4b63f01f69f20c386b0b32b60a82f3e2228b12fb5686f3415126a224"
    },
    {
      "file": "src/engine/zonecontents.ts",
      "sha256": "15b897806b1c907b9778bfeb9c0b1ee5f86454a64415f18a72bd431ab790b9dd"
    },
    {
      "file": "src/loading/frame.ts",
      "sha256": "59f9ddbad054f61cf176bbcf8c53ecb582c011a428dcb149c5723424f23fd216"
    },
    {
      "file": "src/loading/frameAsset.d.ts",
      "sha256": "ca060732999f45caec50d0d7d4f7f64fd07a6537fa050b5a52ec6e31eac07e1a"
    },
    {
      "file": "src/loading/loadingSurface.ts",
      "sha256": "1f05341be99381ac791da73d58cf4932dfb0a13ff3898c0e3e11c5d9d3913908"
    },
    {
      "file": "src/loading/protocol.ts",
      "sha256": "0c9d2d830be5ce04234235b6489640c96db75c280260ab32bbbd45d0b31d7306"
    },
    {
      "file": "src/loading/spiritRun.ts",
      "sha256": "3cd95250e9a7276409c9d269329cf7e6f820ec72bed40dae4d11671709fa6286"
    },
    {
      "file": "src/loading/spiritView.ts",
      "sha256": "d013e4281ea5e077b10f19df1b4f84762cd1ebecd894accb480230d2b55a8d51"
    },
    {
      "file": "src/main.ts",
      "sha256": "437b0e94d66690b0948a3ffe9794909904a4bb4f3b55407f60ea9d6961816e5c"
    },
    {
      "file": "src/meta/account.ts",
      "sha256": "49879fb74d781d73a786f6bfa3907ff7427532f7135b2dece0b78ddc4fc16e19"
    },
    {
      "file": "src/meta/atlas.ts",
      "sha256": "a1a29cd4e76a75d6dd8350334140ddb550593ff16ec1d2d36ac3ee415e04db22"
    },
    {
      "file": "src/meta/browserNativePages.ts",
      "sha256": "d5a07e6296e82ab446afde44936ed2f4ab813e8c2a6a2407dd6cff6bde14f9f5"
    },
    {
      "file": "src/meta/browserRunStore.ts",
      "sha256": "879489f8ed426ec5674b66b491ef94e1fa225cdbdd2546dbc7d9fcfbf26b5329"
    },
    {
      "file": "src/meta/character.ts",
      "sha256": "ba4db0fea49b942ba6b767edfda57d0f418974f0ea1c88bcec3016ed166765bb"
    },
    {
      "file": "src/meta/characterPages.ts",
      "sha256": "b400ed2f97678ec00b405bb948576f8017f161ae82cda6304e4e1baad8ea0a18"
    },
    {
      "file": "src/meta/characterResume.ts",
      "sha256": "2a823bceff27d4754ac50692f3dd10c06868380a2dea3413f4415178dd8d3304"
    },
    {
      "file": "src/meta/classkit.ts",
      "sha256": "cfbefb3b6961d2c90e9245534acbb6c07b4e6ce10825a863a98b9fd4d462d498"
    },
    {
      "file": "src/meta/cosmetics.ts",
      "sha256": "3254605cbba2a0f57c1bbdd5814bd0f468f937f79d323931bf1a882e0a875ed1"
    },
    {
      "file": "src/meta/death.ts",
      "sha256": "15b6045f17e00a051f0a505ab30806948dee767538cbffa5b5f42b35b6890195"
    },
    {
      "file": "src/meta/gates.ts",
      "sha256": "6b8a8b6c992e0a68d65d87d31cc02dbc388589984c1dd1d4ceaefd57e9de753c"
    },
    {
      "file": "src/meta/memoryUnlocks.ts",
      "sha256": "3f1f37415b070e65deb228c147f388cedbca78d3ac97760f232805ee62a115e1"
    },
    {
      "file": "src/meta/mercs.ts",
      "sha256": "9e7c36027fd2fc31d43403408ed029c2dbd4c7b6becce8667135e25f0376c94c"
    },
    {
      "file": "src/meta/modes.ts",
      "sha256": "58d9cd69f5049d3030a36e654eec43fbb472f33ba6c1f3da015979621959101e"
    },
    {
      "file": "src/meta/nemesis.ts",
      "sha256": "e286a236383a32eba5853de70bb1bae9e0b9767a18571e1a0162061f1c5014d4"
    },
    {
      "file": "src/meta/persistence.ts",
      "sha256": "3a90cbd6875da213a0f50d51f4d8bc4a9662aab1003612a405b553247988acaf"
    },
    {
      "file": "src/meta/portage.ts",
      "sha256": "2dec6b606c542730d9ecf29ba88e2356eeaaf1651ec7a51756bf4a37e717fe11"
    },
    {
      "file": "src/meta/reliquary.ts",
      "sha256": "96764894022198a4529e2d33b2e360803ebbde8d98683485f485cdd13cebaf9b"
    },
    {
      "file": "src/meta/resumeWorld.ts",
      "sha256": "89fb5111e2e209c08efdf05ca5dbeb414993c762a37dee531703ed7d1d06ac59"
    },
    {
      "file": "src/meta/saveCompatibility.ts",
      "sha256": "39209ee54234eb351ecfa4bd18949e0e8798fbb9868df3aa99607609c83836d7"
    },
    {
      "file": "src/meta/settings.ts",
      "sha256": "54caa84780c37e395505b64d443b5ccd09a02fa12e4e975bb27d2fa7621a6200"
    },
    {
      "file": "src/meta/shardVessel.ts",
      "sha256": "467697d844dc551cf93ed9bc853a9a62280d64aa9fbfc67103ea1856fcae1b8d"
    },
    {
      "file": "src/meta/skillSlotMemory.ts",
      "sha256": "d5efc5637555b615d61450b568fa6183b1653c08501b09d4577664a37ac29db5"
    },
    {
      "file": "src/meta/unlocks.ts",
      "sha256": "2aee46475e693debc1664ac203d12bdc6d9cc5bdd1de27b29eae5179fab85fee"
    },
    {
      "file": "src/meta/workshop.ts",
      "sha256": "1aa1e12dc5b5593938d30d94f3fd692cfd4df5b1b18324521ae2844713f12116"
    },
    {
      "file": "src/meta/worldstate.ts",
      "sha256": "18a2e529a85a8b7e66e622534800b13d7bebcab2b24d6f95379c140539c5f5d6"
    },
    {
      "file": "src/net/couch.ts",
      "sha256": "54ccec333b3b8cb317a6c214b2b0403be5411fc2ca49be086e9a8f9912723dcd"
    },
    {
      "file": "src/net/crossing.ts",
      "sha256": "190162ffc2e45f56d6f7bb15b1b4f26bd1e45fc7b8100c5704e56a998e79d600"
    },
    {
      "file": "src/net/foresightWire.ts",
      "sha256": "86347c54c0afe12d623acc8a67976a140b45fe78dc37849d23b81006333fce84"
    },
    {
      "file": "src/net/intent.ts",
      "sha256": "d01e672985faff26b2e7952bab6452ebc3af9b9b5685dc7137c51ca6460911e4"
    },
    {
      "file": "src/net/journalWire.ts",
      "sha256": "014784aad2d71cecac840b506aee9a5f41eeee33b26d1796d7dc69e10e8a9327"
    },
    {
      "file": "src/net/local.ts",
      "sha256": "4f21b4b051a4a33e9e103fb2d4fb607d7d49953ff6039b57fde37a981bf0ef24"
    },
    {
      "file": "src/net/nativeHostedPublication.ts",
      "sha256": "aee60f2b96a6dc7e359be9c4412815a17ecae3267157fc0f2b7d4e0b6a0820ff"
    },
    {
      "file": "src/net/nativeSnapshotHost.ts",
      "sha256": "428fbe6391d3cd758147c3cc8ab1958ba9f92ecb8414003ea54435a38592e34b"
    },
    {
      "file": "src/net/partyReads.ts",
      "sha256": "9b9da9aafad36d6456039e9937f58bc70ad81907f5db4d6636b151a4c52f421a"
    },
    {
      "file": "src/net/partyWire.ts",
      "sha256": "f50fe74e82245a9577572ca47b19831d3f2bf370e749fd9b4ec9cb866fbbe6c9"
    },
    {
      "file": "src/net/predict.ts",
      "sha256": "f4a965472668b8e4137061b99ac46dfda95ff00d298c84e5b6bbe01a4e405e47"
    },
    {
      "file": "src/net/remote.ts",
      "sha256": "c55a26b07f0eb5b92a1cb786ec94966372975e6d56f5d560ca92cf29a5c008bd"
    },
    {
      "file": "src/net/scripted.ts",
      "sha256": "8f8d4d596c3ff66118173f8e5d7d1ebca7d8a7bf49e8302b9d348b2981efbce2"
    },
    {
      "file": "src/net/seatView.ts",
      "sha256": "d343bfe773dd9375988af100c16025a793a3fd9aec2f0a6c7c4c5937dce22ca4"
    },
    {
      "file": "src/net/shardBuild.ts",
      "sha256": "d3dd24bed68ad3349a8499c5907e86ec81abcb25e976f9aa96885b63dbc261b8"
    },
    {
      "file": "src/net/shardDoor.ts",
      "sha256": "b22d622c6c79d5c70a357590c86436a6bebde78438d0a2425620dc5541c17d31"
    },
    {
      "file": "src/net/shell.ts",
      "sha256": "bb14b8b3e49fb0f831dcb9c5b40cef3cef435efcf40de5358dcf19d005cf1d53"
    },
    {
      "file": "src/net/snapshot.ts",
      "sha256": "1818765334fe6a259615a30483519197460984ea086f17b243d9002b735846c2"
    },
    {
      "file": "src/net/spoils.ts",
      "sha256": "a326f6e65728fb72f9a290d04cbc6d18683182dc1bdbf2887fee76ba39bb6729"
    },
    {
      "file": "src/net/transport.ts",
      "sha256": "465a382a9835ee599f34aa5b8d902cac78979845e40a048408512f203be2f891"
    },
    {
      "file": "src/net/vesselWire.ts",
      "sha256": "77e7befa2ba2efaf003bbac010ec1b59e6b1993cd7de16e2529003db7cd38fbb"
    },
    {
      "file": "src/net/webrtc.ts",
      "sha256": "f1122479d352e1bca1a751222792633f88639afa30f512f3f27844a15026c750"
    },
    {
      "file": "src/net/wildsClient.ts",
      "sha256": "5c1c98565ce9b45aca2ab4f31d48727262bf37e0fdbc4e1a507e27310ae52d59"
    },
    {
      "file": "src/net/wireDiet.ts",
      "sha256": "9551f7205810c0ea69df070f915abf492c147d1f2506ee224563e53bd0eaa75e"
    },
    {
      "file": "src/net/ws.ts",
      "sha256": "7d1461c909fc69fefadc2e2088d9beb6ed6b0ce72db19fe0273d6f755f7d13f1"
    },
    {
      "file": "src/net/wsframe.ts",
      "sha256": "2bd891f2b435f4ce2ded77c21509c9e3a806073eaea6ed25e600d0c2285160c8"
    },
    {
      "file": "src/packages/contagionStrains.ts",
      "sha256": "e6fcd1572c1b33575804ccbb0ab20752a7ab550a8af9a8195ac8e41ba09e4971"
    },
    {
      "file": "src/packages/courts.ts",
      "sha256": "21ee029c7c1ef9aca3b5aeafa3db37cbbc47abf4329ea2ca14a35c2450808665"
    },
    {
      "file": "src/packages/defs/amalgamation.ts",
      "sha256": "606e59ee0e402371becdf7557ec41822385340d9596a7422530c4a64112d841d"
    },
    {
      "file": "src/packages/defs/ascent.ts",
      "sha256": "df49a0758bc81e8abca031353ab96e0ec2665c72bed9b803ffcbe061f34931a3"
    },
    {
      "file": "src/packages/defs/borough.ts",
      "sha256": "bb775f270ebec5b7de438efdd73b73c71e87a4f6eee37ceeb10481a1cd048fbd"
    },
    {
      "file": "src/packages/defs/breach.ts",
      "sha256": "f8f8fdfafd1765e822984de8da66007a12c5ca88d402b6bbab4ba57bb4d7f6d2"
    },
    {
      "file": "src/packages/defs/brigands.ts",
      "sha256": "7594d0e78e497ef4c14d8511941e7332d95e34288bc70d460bcdf3aed4827b75"
    },
    {
      "file": "src/packages/defs/conclave.ts",
      "sha256": "5b802f38cb059636119d66eef4546f2e866e8c205af4be7ff5db5904bca1dcaf"
    },
    {
      "file": "src/packages/defs/contagion.ts",
      "sha256": "7550db4ebaa5661a83c0a5dad2f4571b72dd392ab22bf333616d77db9b71c1ec"
    },
    {
      "file": "src/packages/defs/crusade.ts",
      "sha256": "f74132888d5b07c7b41aaeccc5370578b8bc84b1467919613380314f871d77a7"
    },
    {
      "file": "src/packages/defs/deadwake.ts",
      "sha256": "0f2bd8967e9d6bfbb1be25aa1608d0071472aad184d7208c1672367a50f9cd0b"
    },
    {
      "file": "src/packages/defs/deepwinter.ts",
      "sha256": "c41bf1feb22ea22b36773e029794d695d047ec1715c512bf9764afc99c1889ac"
    },
    {
      "file": "src/packages/defs/demonInvasion.ts",
      "sha256": "557f460c35193361f3fb12265731d9e461b71bc297787f8069aca8cb1f1407a8"
    },
    {
      "file": "src/packages/defs/descent.ts",
      "sha256": "684c601add1cfc60284bc720797e101f2ceb50938a6ebd6a363c5ab3e0ae63d7"
    },
    {
      "file": "src/packages/defs/drove.ts",
      "sha256": "1f76441b59aff567861481cdf14caccd77e2b1a8db88b80a5ae4771295f6411d"
    },
    {
      "file": "src/packages/defs/extraction.ts",
      "sha256": "3dfe8fe51560233e13e4cd1e486b1121dbdd455ea3723f702b4a06b7949deed2"
    },
    {
      "file": "src/packages/defs/factionPolitics.ts",
      "sha256": "76165a897251b14f16ea1cc6fab3b11c9ea4447763315e394abdf547dfb8bf0f"
    },
    {
      "file": "src/packages/defs/fractures.ts",
      "sha256": "592274867d637b3609029b383e1a5a178779b8cb56232d5fd5fa3ec178d13c9e"
    },
    {
      "file": "src/packages/defs/gloaming.ts",
      "sha256": "ef4e8bd988997b1fad4852662a9beb8cbedb7df4099e3825dfa0ca1a95b676a9"
    },
    {
      "file": "src/packages/defs/haunting.ts",
      "sha256": "537ec6fcc698428548baa1bcdf5bf5b7473fb1bbe0e3d362620b619b374ec135"
    },
    {
      "file": "src/packages/defs/holdfast.ts",
      "sha256": "4df83100777eea7687cf1a65e2494679b6d5517ffaed38656b172d30db5c4ffc"
    },
    {
      "file": "src/packages/defs/hunt.ts",
      "sha256": "dee9059b6e60daa14d8c97c95759fab3d0a2c5d74e81a615f0e6fd5a1f3efdd0"
    },
    {
      "file": "src/packages/defs/longcandle.ts",
      "sha256": "f10100c68deba3472234b5760c102344d64cf6db104dcd6ceea3c0d7ecae6af8"
    },
    {
      "file": "src/packages/defs/longNight.ts",
      "sha256": "a2732cfc87272f445a501308dcd8a1d68d1117b2e1d4467da312d8e1a94ea4c4"
    },
    {
      "file": "src/packages/defs/migration.ts",
      "sha256": "3efc6057c2403aafb3db84498a4811c97fcc2db9427fb28a189f748e57edc659"
    },
    {
      "file": "src/packages/defs/mirrorkin.ts",
      "sha256": "a86952f51677357332dc401cc478df4f100751a87546e3489c7dd63389a91f36"
    },
    {
      "file": "src/packages/defs/mycelia.ts",
      "sha256": "da688ea5aca21e835ee73e758898652068ef6f11fb5aad6ff6ae42d1b9d714fc"
    },
    {
      "file": "src/packages/defs/pit.ts",
      "sha256": "66ffa7cfd3b9284cc18de27521413de532eafef7f4ba9aca4c9ae57e61250ad3"
    },
    {
      "file": "src/packages/defs/quickening.ts",
      "sha256": "f3dd2e68b341fa52854a468193d710b018b5f62879bb70f4ea165d984cb6006a"
    },
    {
      "file": "src/packages/defs/stormFronts.ts",
      "sha256": "0d9711d5e9ac5b717675e2463b9a2d92d940aa8cbc947f75758c6688b24e999b"
    },
    {
      "file": "src/packages/defs/straying.ts",
      "sha256": "399f741ee32f71df6830644fd36d0ae1c2e8eededf3f23a3fd6195e1e0e9a18f"
    },
    {
      "file": "src/packages/defs/swarming.ts",
      "sha256": "24d9c16302685bed1a097a065b7cfcbabed2361665e589121434b7df93693577"
    },
    {
      "file": "src/packages/defs/titans.ts",
      "sha256": "11d9c3dbfb15639fccd728e80ae9b1c939d006ee44858c63d5c1a8b702639a07"
    },
    {
      "file": "src/packages/defs/underworldWar.ts",
      "sha256": "eeb34f0294511cba26d7462b6afd9c8f112134c2f822af64e43746faaad1243c"
    },
    {
      "file": "src/packages/defs/unsealing.ts",
      "sha256": "7e022f661d431bcfc92e3916943affd3e9267bbebab4d733fb0295c01aa3c49b"
    },
    {
      "file": "src/packages/defs/vendetta.ts",
      "sha256": "fcd71577b41fd8689e987e37088695680bde45258a187653b8c63c3b47da4521"
    },
    {
      "file": "src/packages/defs/verminfall.ts",
      "sha256": "196e06973fb7534f8d4c9bd9c2fb2d8ee02534d2c261bcceee204e00c3dd2ae8"
    },
    {
      "file": "src/packages/defs/warbands.ts",
      "sha256": "88d9fe9fc3a2fd0cd5a98898d59c5cec56fafb872ac5c72e24bf8cf6fd9de3d3"
    },
    {
      "file": "src/packages/defs/wisplight.ts",
      "sha256": "faf4b7989823f3e1a22165d0f706c089f9514ed17f531a1c7b74f134810bb26a"
    },
    {
      "file": "src/packages/defs/worldboss.ts",
      "sha256": "b5930d1fb99cb2fb3c65bdf705803545a7e438b3465affcc0e502eb048ab48a1"
    },
    {
      "file": "src/packages/defs/wraithsail.ts",
      "sha256": "9e4873a3ca2e4b3cf2025594cb5013e375b276deca689b6f2fb35d0c958c99f0"
    },
    {
      "file": "src/packages/encounters.ts",
      "sha256": "0e6673fc2ec9072e3c1dc482cf8e8b03fa43a86b58bdd2ef2779fccb79a9178d"
    },
    {
      "file": "src/packages/factionGen.ts",
      "sha256": "7714b547d97f8c2077ac3f38d1f3f839eb9bdb9b204dcb7d605b68ae49ce0f34"
    },
    {
      "file": "src/packages/frequency.ts",
      "sha256": "7194f006c5c025af15dd53fa64c16cce9700d3fcf60ce008bb5b12a7b4358df6"
    },
    {
      "file": "src/packages/groundClaims.ts",
      "sha256": "3ac8bd41dc50314f170bc63f03bc1af088a17f044435363aea7aace9d8c8bd4c"
    },
    {
      "file": "src/packages/holdfast.ts",
      "sha256": "3e2ae6bae88eb5a5af919082313e742200c3cabaac9bf4999d804437fb69b60c"
    },
    {
      "file": "src/packages/ledger.ts",
      "sha256": "1f00ae629319f78f26d234a8c1aff7d538f631d82219b3753f49803e5962fcbd"
    },
    {
      "file": "src/packages/lords.ts",
      "sha256": "4c3150b67b4f88d476ddef76d242e2804c0e597545f8dff58c4d69671546b259"
    },
    {
      "file": "src/packages/manifest.ts",
      "sha256": "5d439d3065786f4ee2af3f14dde41caafacecaca41299d4d080ea4fb508525f8"
    },
    {
      "file": "src/packages/overlays/amalgamation.ts",
      "sha256": "7bdb7ffb9ef53daefddc43781a43f42eee64b99eeb90631f081e48523b4da1e8"
    },
    {
      "file": "src/packages/overlays/ascent.ts",
      "sha256": "1c7c56b6ed9590f5555d1ae73df5a4b933bf93fbb771d3c7e016d230b8e1ba26"
    },
    {
      "file": "src/packages/overlays/borough.ts",
      "sha256": "4ebb3ab02c83c5153af7cb8c53d7697677c3bfd9fab55bb739b250e267bb0762"
    },
    {
      "file": "src/packages/overlays/breach.ts",
      "sha256": "647beaa371c5916125d8bb04b3091bcaca3f371101cb8f02384eb928dae43f7a"
    },
    {
      "file": "src/packages/overlays/brigands.ts",
      "sha256": "8540c9e36fb95a94fd1c2922ac8568fe12dea0f5eedc9ce614d8c11af187f3b4"
    },
    {
      "file": "src/packages/overlays/conclave.ts",
      "sha256": "3dfd3d404d13f75dff966a919a37d5455d2d86176c9b4dbea25e1240fe3257b8"
    },
    {
      "file": "src/packages/overlays/contagion.ts",
      "sha256": "6d329528e92c99fc3b0f51706091c64c0820b6940c885c8459ca6914d5b843c9"
    },
    {
      "file": "src/packages/overlays/crusade.ts",
      "sha256": "672c4ed6dcc171adc6c49181a79ce375001eb44e022fe456ece24b8b022b2a37"
    },
    {
      "file": "src/packages/overlays/deadwake.ts",
      "sha256": "01f5171d5b67fe653e242cc1ad4eb6a310d317ad77a3fd6e4488d8680399edae"
    },
    {
      "file": "src/packages/overlays/deepwinter.ts",
      "sha256": "647e0489d8f7b8778a9dd5b586d12710f0ecbc715f0a4d6acb56089ba94144cb"
    },
    {
      "file": "src/packages/overlays/demonInvasion.ts",
      "sha256": "2068cae8a952f35dff73a3ea1e3e5463eb92bedf344c2ca8b04ea550e4fdd50d"
    },
    {
      "file": "src/packages/overlays/descent.ts",
      "sha256": "7ef0d52eff382c125741c3ee2d3e131c043f4a8814e532c92e3802c438100bcb"
    },
    {
      "file": "src/packages/overlays/drove.ts",
      "sha256": "0b12ed3468f5c748935c06d9b06178b9b0a28a6fc639a07e2f71b865c9f4d1d9"
    },
    {
      "file": "src/packages/overlays/extraction.ts",
      "sha256": "70194179f47fe5bf6bd445022bbcb2de8dd7cb24e624de76bec7a2de2b3e5d91"
    },
    {
      "file": "src/packages/overlays/fractures.ts",
      "sha256": "99857ae35016ef24a360a04749f4145b7e731e1a24b65b2da0eaa45b78e6d355"
    },
    {
      "file": "src/packages/overlays/gloaming.ts",
      "sha256": "81668cb34c2855745066222b1cca2b5f14bab78182bf5bb99d7ca528ecd09aa5"
    },
    {
      "file": "src/packages/overlays/haunting.ts",
      "sha256": "1f18fed376fa69d96b8a9ab30173b23934e2ae91fa74528c2addbbc440f03b66"
    },
    {
      "file": "src/packages/overlays/hellWar.ts",
      "sha256": "5dc6c3656cbca10babc20fcadd3735409c0b4d59ee1ce74d7b884dc9a90bffaa"
    },
    {
      "file": "src/packages/overlays/holdfast.ts",
      "sha256": "72ebbd8a78f7383b346e9a654ee706fc68a23647e0c09f14f072812ae4300d86"
    },
    {
      "file": "src/packages/overlays/hunt.ts",
      "sha256": "1f63c4d7fa84a8852d98c00e5d50dc90c5d9b51954a977b3ef25581e45a96452"
    },
    {
      "file": "src/packages/overlays/incursion.ts",
      "sha256": "eeee1aa6f9372e225f78acfc0fa98db3895dd406899e3530f421bc50d1dfc7c5"
    },
    {
      "file": "src/packages/overlays/longcandle.ts",
      "sha256": "b9f7f8ffaf661c8ad3d323912277882856ee155d3b12a64d1fd8ce3f8800c968"
    },
    {
      "file": "src/packages/overlays/longNight.ts",
      "sha256": "dfcffcfede912a965e3f634fbe39c1b9884e934c0ef9f1659715edf462f9c638"
    },
    {
      "file": "src/packages/overlays/migration.ts",
      "sha256": "b08e781c12cf29155a45e5eec17e8d80a11ab71e68968e818f857cd041aea4d0"
    },
    {
      "file": "src/packages/overlays/mycelia.ts",
      "sha256": "c755d892ea4707cad710d237c1ee4f161f48b2fd8e2ac0dd6f5a7d6ed3e57098"
    },
    {
      "file": "src/packages/overlays/quickening.ts",
      "sha256": "8ac4d3bf12d8af98d60ef4ffa589895097a6951ee95998b187b51f7bc6fba239"
    },
    {
      "file": "src/packages/overlays/straying.ts",
      "sha256": "50dd452835acae01ba93b8e9b189ff51e408ec0562308bd24eda1c0f416f38c6"
    },
    {
      "file": "src/packages/overlays/swarming.ts",
      "sha256": "530c753dfbb1addf81abe5701e2e7efa2afbe7ba0bd604ea3772c86d31a877a5"
    },
    {
      "file": "src/packages/overlays/titans.ts",
      "sha256": "8604be03901faee5797e0331ef509ab96dbf4e1c43703425c49fafb82299705d"
    },
    {
      "file": "src/packages/overlays/unsealing.ts",
      "sha256": "57f08ad0b9d217c353932011e44de59bbc22efcfe16b4540d7e921394f45f10d"
    },
    {
      "file": "src/packages/overlays/vendetta.ts",
      "sha256": "ae3073043515cecad59cf7a393bd9470e0bbf2f0a9db3907d42fdf7b08006f65"
    },
    {
      "file": "src/packages/overlays/verminfall.ts",
      "sha256": "a4695f1f452cc231fcf9d61b34c62d96c94b6e12554801bc51db9893d2c7a5d8"
    },
    {
      "file": "src/packages/overlays/wisplight.ts",
      "sha256": "fc9df4740cde2e0ff822fc65fa187ce2984ab16ae321575abb7401d9f1c18224"
    },
    {
      "file": "src/packages/overlays/worldboss.ts",
      "sha256": "038bdcdc7b5932dce1fae5f5426b4d3d2f191e9915035e218d284ce9675f3250"
    },
    {
      "file": "src/packages/overlays/wraithsail.ts",
      "sha256": "ab9a48f787a32b556cbb5fa021e93797e77e5d4a07936230977e50f1dd312c8f"
    },
    {
      "file": "src/packages/registry.ts",
      "sha256": "c57e80a3eb417dce0c438a1a636f6bd45f4ab046d88ce95f16150a6f32a4a1e5"
    },
    {
      "file": "src/packages/types.ts",
      "sha256": "8694317ac979dac04b9fb80c1edd031473b31e51f54e02127f047414b42070d8"
    },
    {
      "file": "src/packages/unsealing.ts",
      "sha256": "79814ae20c9194b73935da7a7e73c3829f833b4761893ce22084e0d427125e07"
    },
    {
      "file": "src/packages/validation.ts",
      "sha256": "43ae51d55b6792c4b3556601db2ab91c229431a9c2e78224699635ef3f20c09e"
    },
    {
      "file": "src/packages/weighting.ts",
      "sha256": "2d38b8335f98de9ec69de7eeeba67e3749d3ede2f192e4c2904ece6adaa35f60"
    },
    {
      "file": "src/quests/brandt.ts",
      "sha256": "f0b642575fa7065e16c3cd9386fd1b6d6bb62ac7966edb89a7197a9223258c77"
    },
    {
      "file": "src/quests/defs.ts",
      "sha256": "82c1d49b00339e5f6d5f885f043105937e36108dcde6e17a9e7556996dafa468"
    },
    {
      "file": "src/quests/frontier.ts",
      "sha256": "74ca2f14670a8bca2fc795dc856239640df8a98f48c3a3a6373639e9c9d1647a"
    },
    {
      "file": "src/quests/odyssey.ts",
      "sha256": "f058428686e132f241c50c6b30b9639068981d96fcc07efb5dcbea85a03a91df"
    },
    {
      "file": "src/quests/reliquary.ts",
      "sha256": "41f3e586e6f28268142b01bbc0b4ae254bb13ed08a2ed003c08e69813ac639a4"
    },
    {
      "file": "src/quests/revenge.ts",
      "sha256": "109a87b5ed00de8e0b72cdf214a87292ed8b926dd0165577c6980d192b9b7ee0"
    },
    {
      "file": "src/quests/types.ts",
      "sha256": "f6db5d180d511d8b86546933ef7af92a092d7db3654897101c2c789e56204858"
    },
    {
      "file": "src/quests/vocations.ts",
      "sha256": "ece05a5be066f75b56997cc20a47fae116f3e73db85b07b64e209e2dc9df3bdb"
    },
    {
      "file": "src/render/actorPortrait.ts",
      "sha256": "5b1869e050961f6e435eabf82a0181e737a58a0b8ec17d9fee9b567b5632923c"
    },
    {
      "file": "src/render/camera.ts",
      "sha256": "18ce5ad0f5fc4456fc82477dac7972d960b271fe16f3df8092a043fca13e73b6"
    },
    {
      "file": "src/render/groundItems.ts",
      "sha256": "335c4501e10be1b1eb2cf5886f4ffe2fd58038a5541be6178aab9715894e9c2d"
    },
    {
      "file": "src/render/itemIcons.ts",
      "sha256": "fcf1eb6afd423063668e94dba2690358b2446014561ebd1c083946a91c170a3d"
    },
    {
      "file": "src/render/portraitLib.ts",
      "sha256": "529350501621252992458646462fe1411e6dff7dfab1652b136210aff92815c7"
    },
    {
      "file": "src/render/renderer.ts",
      "sha256": "4d66a199592f38ecd5275d4426c0ce43f20dad57af633a8aba7ab52e51e8c0f6"
    },
    {
      "file": "src/render/renderScale.ts",
      "sha256": "1c52e30e88a1efe278af1dfce708072fc5d7d9df0815f82613c097e3bf62c6c8"
    },
    {
      "file": "src/render/screenFx.ts",
      "sha256": "032990db22c4889762411ad8383144a625eff17900d89d00320e90ce86345cac"
    },
    {
      "file": "src/render/skillIconArt.ts",
      "sha256": "1cef51f8a41a482ae9db2fe3146bc20759c14fa9d603965ae21cb767781d2760"
    },
    {
      "file": "src/render/skillIconCatalog.ts",
      "sha256": "bbffcc402e9534950326166dac8dd630ab514aa15e7096e39aa5bbe60a9ec5a3"
    },
    {
      "file": "src/render/skillIcons.ts",
      "sha256": "dfc6a5983b1cfca78fe55d86925fc98ddef453a21390ff6a27c2b904b48bb53e"
    },
    {
      "file": "src/render/statusPresentation.ts",
      "sha256": "ce82aac62ddf3000768aac0386b78dd4111a8f3964336215402bf89b6bbac642"
    },
    {
      "file": "src/render/vis/actionParts.ts",
      "sha256": "7e8b84f98602859143cc5035f02f1382fb214c952cea0e212ed1da5bb959f99f"
    },
    {
      "file": "src/render/vis/afflictionEdge.ts",
      "sha256": "ae568fc010d865f2a8be735a9086069f5db11b7cf1d28ad0780b88839fc728ba"
    },
    {
      "file": "src/render/vis/aimtick.ts",
      "sha256": "4a3be5357778d69af6cc74dd27de2a3f7c1ef13e803e49bd0dd6c723483935aa"
    },
    {
      "file": "src/render/vis/altarCueLayer.ts",
      "sha256": "ab50ef7eff587e08f9505338d30f389b8459ff13df8729c57e86387dbe9b56f1"
    },
    {
      "file": "src/render/vis/ambientFx.ts",
      "sha256": "0ec5274743a761cf98e4216f18793e097ea0a5e2b0c0a49d1164b28a2c1ee402"
    },
    {
      "file": "src/render/vis/anatomyCueLayer.ts",
      "sha256": "58920ac3c493820291feed7e85f492ce6e5b1aa0cb544df8839ffce688644888"
    },
    {
      "file": "src/render/vis/aoeTrace.ts",
      "sha256": "551e7851bace7fe98fad400f5beb2108ef75ce84b522f2e90d7ac6fbbac73e88"
    },
    {
      "file": "src/render/vis/armedCueLayer.ts",
      "sha256": "22bc6297cff8b9008c18f7407f46463b5771020665d044eb1796c6690e17b91f"
    },
    {
      "file": "src/render/vis/attackSequenceVoice.ts",
      "sha256": "df0be51744f1644093162d6e52c81b2c7e90f299b50fd172f05e743ad30c03a0"
    },
    {
      "file": "src/render/vis/auroraLayer.ts",
      "sha256": "d35ef7b6a1daad6872051c4c59cec3a263804a38e61c52485677d46339736408"
    },
    {
      "file": "src/render/vis/bakeScale.ts",
      "sha256": "85d849f6ab7077c3475487ab4402bd473298c20d8588deeb293cf9332794dcc5"
    },
    {
      "file": "src/render/vis/body.ts",
      "sha256": "2fa40c19bb8a6a09be918c16ab4b00f87a73aade7598144791a042784e9e6aba"
    },
    {
      "file": "src/render/vis/bodyActionLayer.ts",
      "sha256": "a298785aba1f4cdbbab894159499513fe02415b5f327ec238264400c122ed000"
    },
    {
      "file": "src/render/vis/bodyContrast.ts",
      "sha256": "44ceb6b166c72f30bb8bd5bbe37edd08f24f2c982fef0b7f69e0b4b334729f66"
    },
    {
      "file": "src/render/vis/boilLayer.ts",
      "sha256": "55227830424b10a04155233bab1bc7c9002b46d4566067c684d4a641e621a879"
    },
    {
      "file": "src/render/vis/broadleafCrown.ts",
      "sha256": "090b73367cc5d74e7dcc37063ec188430e92bda2e48219fa44b2daad67d95388"
    },
    {
      "file": "src/render/vis/buffReadout.ts",
      "sha256": "ddfaee9207fc44e4599b8a02dec9fee463e87a3e96c1dbde8a26d8d3034ad004"
    },
    {
      "file": "src/render/vis/caches.ts",
      "sha256": "a030396aae902fe4f6ad960a7a848e990405e58d99f47dc8821115d894f365cf"
    },
    {
      "file": "src/render/vis/canopy.ts",
      "sha256": "82babe324ca6d0ba08b54627f6d94faba6b934ff8e274705f84589673069cabc"
    },
    {
      "file": "src/render/vis/canopyEyes.ts",
      "sha256": "618c51fba2cc1866e6bd3633abd64652f261eeff5e6982245ebe54a2e39b0bfe"
    },
    {
      "file": "src/render/vis/canvasCaps.ts",
      "sha256": "6000c0e09fd91cb723d4a8c53ce99eec4c7b8ef4325f2302517abdf095657e9e"
    },
    {
      "file": "src/render/vis/castingCueLayer.ts",
      "sha256": "537a52e1dbc96f8fb0a5b42998aad754eab514217f6124757dac0ab14ddc621c"
    },
    {
      "file": "src/render/vis/castReadout.ts",
      "sha256": "d77ee28bff2f4907870abe07152c83580829d1dd586561aa03d7871e327aaa50"
    },
    {
      "file": "src/render/vis/chestReadout.ts",
      "sha256": "a20fd129adc81131df8c539b598a3a5c53e8058f625840169bf3f9147a8ecc2f"
    },
    {
      "file": "src/render/vis/color.ts",
      "sha256": "43fea1cd6cc4c8e0cdcad22944f43aa559de314602909a865ea108801e892f95"
    },
    {
      "file": "src/render/vis/colorDrift.ts",
      "sha256": "07588e3cd0c19e9ec366db895b21bb91604bcc5b13fcebd83400e36b9adcdc38"
    },
    {
      "file": "src/render/vis/combatCueLayer.ts",
      "sha256": "22e1301e5b02bcdebfcf725504e7249661100a77a5931eaa31d1157da2fa326f"
    },
    {
      "file": "src/render/vis/combatFocus.ts",
      "sha256": "cae855cdc0fbbab07317ea27b2ca78120c06646dcb03825b119c9b8f8c145ba2"
    },
    {
      "file": "src/render/vis/combatMeters.ts",
      "sha256": "2e49d601aef717e4df2e1c6334ee8c2243c9974568206e10152e77a299c0cf95"
    },
    {
      "file": "src/render/vis/combatReadabilityLayer.ts",
      "sha256": "eddf011f24ac12154469f88520583ffa0d4d5204eff125d8b4401f4dbe9f8e74"
    },
    {
      "file": "src/render/vis/combatTargets.ts",
      "sha256": "544989522228e2fec83f0d03b779511e3d6579f6d51abf13b369334fbbdebc71"
    },
    {
      "file": "src/render/vis/comboConditionLayer.ts",
      "sha256": "cfd467c71f50387517d67b6414fcc183b7a9ee94264c0fa6b75286dde1bae7a6"
    },
    {
      "file": "src/render/vis/comboCueLayer.ts",
      "sha256": "0cf86aaff7fa548b0465f215e4766524878e51524fc30baaa4e144f9d81db31a"
    },
    {
      "file": "src/render/vis/companionCueLayer.ts",
      "sha256": "a0d432d58705cfbb357f3f2794743f235d9a20d1c88d415ca67690fa63a53791"
    },
    {
      "file": "src/render/vis/containers.ts",
      "sha256": "0abe321f44d57064a55e715ce3f300e16a348e5aa938898a1ffb0e4bb1681f2d"
    },
    {
      "file": "src/render/vis/cosmeticEffects.ts",
      "sha256": "433ad185ab7b2fe31aea28c2888776b05972b27166220520fcf68310e23ea139"
    },
    {
      "file": "src/render/vis/cosmetics.ts",
      "sha256": "1b3de3677244c18fd75044e49a62d374241cee203ccb0ab2262325fb736bf4c1"
    },
    {
      "file": "src/render/vis/creatureTerrain.ts",
      "sha256": "6526d0fe4b44cd025268b0f885280f85f4031263cc18ebbfb7c5677281db1c84"
    },
    {
      "file": "src/render/vis/creeperLayer.ts",
      "sha256": "57563e901d67023509c4a8b69e1ebad26db1e2d2428ffecc860ab593956e7b8f"
    },
    {
      "file": "src/render/vis/creepLayer.ts",
      "sha256": "485db08d6e5ef9281c29a587266137be3a50de967fdc64aba057883e247a941d"
    },
    {
      "file": "src/render/vis/cryVoices.ts",
      "sha256": "612dad71afc9ef8a4818418c8f3ba9c518c08a6bae9d2b8e56e3947336d9aab1"
    },
    {
      "file": "src/render/vis/defenseCueLayer.ts",
      "sha256": "4e1640a1952e362167751f9fe0e055a6a14b1f6e2ce28de474ee46ed365fd381"
    },
    {
      "file": "src/render/vis/destinationLabels.ts",
      "sha256": "2188a09291b88726402e14a3f04c4577b25a4f15378eeacac6cafefd559093af"
    },
    {
      "file": "src/render/vis/dissolveLayer.ts",
      "sha256": "ccf39359d9e609244b4b8ddfe4e37646d3407a64067b5fa54ea3f7e36c34c098"
    },
    {
      "file": "src/render/vis/dressFade.ts",
      "sha256": "fe8075b05fdab214cb3741c2f944a0909f6e32722260dd1e8334e6c1442cf4cc"
    },
    {
      "file": "src/render/vis/effectVoice.ts",
      "sha256": "21812cbd7b959ec4ba86438426eb75991b5ac76fa83f54fbacaf38a9b23b5f9c"
    },
    {
      "file": "src/render/vis/emergeLayer.ts",
      "sha256": "05e450e84fa11d3da089fa1de1f89fc3e340d7be300b8718ffafd301e74b7178"
    },
    {
      "file": "src/render/vis/eyecatch.ts",
      "sha256": "c0cfc8ef0ac38ad6b0b56fb6f3b71da75e4f5f4aa01e99caf2ae56a53ecba216"
    },
    {
      "file": "src/render/vis/feedingCueLayer.ts",
      "sha256": "a3f0322be72e4f5c449ec9a2a654f017502a25592d7a1a224fabdde4013a6ad7"
    },
    {
      "file": "src/render/vis/floors.ts",
      "sha256": "b3d9615145e84ee1ca40d0044b2f9f4fa23840fe4d4a4decb058826b5539bd37"
    },
    {
      "file": "src/render/vis/fluxLayer.ts",
      "sha256": "d6ab0088d11a1512b9b768e782bf189edbc8226e1da6cfee7439a4a56bd9ad71"
    },
    {
      "file": "src/render/vis/fogLayer.ts",
      "sha256": "7d60f347e61df437363926d911885a273bb18e2bae6551ce6f4d7fad9271a5b1"
    },
    {
      "file": "src/render/vis/foresightLayer.ts",
      "sha256": "f2429b647afb6df2ddc3f930985c627cc656b9d52007aaa42783d760f56dce59"
    },
    {
      "file": "src/render/vis/formationIdentity.ts",
      "sha256": "c6ec484d102f59eb3c12db75db711fa2a64639dc4d09cd46ebd978f98e980459"
    },
    {
      "file": "src/render/vis/garrisonName.ts",
      "sha256": "85e7a08ed40c6ce1f9b0936cfc41b2d0e62effba49c56841dc7958a40be085d6"
    },
    {
      "file": "src/render/vis/geyserLayer.ts",
      "sha256": "38375e252d764ba639c7377f6340893f67b772e38da65de7e68b0a3f2d8a0d8c"
    },
    {
      "file": "src/render/vis/glyphDoodad.ts",
      "sha256": "dfb05c608072038c221e9e930cae58cc9a1772990b4e6981c22be4b27f573be6"
    },
    {
      "file": "src/render/vis/ground.ts",
      "sha256": "14c4a72e080710fdc9af67427d035a752e14fa310e7ea23d30b6b0d8526a9861"
    },
    {
      "file": "src/render/vis/groundRising.ts",
      "sha256": "6e0e5b9dc32d84e9879d479930eb1deb7e211127c9572d4482bc1b31344f91ff"
    },
    {
      "file": "src/render/vis/guardArtsLayer.ts",
      "sha256": "93153e2281d42d6389cdcad99f1f5941b4dee7a5a01ef2da65e8e5777146c897"
    },
    {
      "file": "src/render/vis/guardianLayer.ts",
      "sha256": "fc3a8631a96c6b4ce2c98d474caf881f96836b2cfad23d7e39930c9ed5a9b250"
    },
    {
      "file": "src/render/vis/hitFlash.ts",
      "sha256": "ed78fc84b3d0d3e8efc6e68ae636fe20e54a2daa6670102e73015b46a212dd39"
    },
    {
      "file": "src/render/vis/hudText.ts",
      "sha256": "8c204f91964217266feb2d356b8f8fcf0a949c2165d82d926aa2b4cd80292f7f"
    },
    {
      "file": "src/render/vis/lakeLayer.ts",
      "sha256": "55e5bd352243cd056b7671c63c3aaf77b9cd47baeea1e6472f1fa8c142a39f5f"
    },
    {
      "file": "src/render/vis/lightningVoice.ts",
      "sha256": "16c129698f83ba9c027a4be2e98cac0550a952c68ae94203da47e4f65e997e42"
    },
    {
      "file": "src/render/vis/lights.ts",
      "sha256": "9e1d40f9837844766bc6a8299e136df4b5534eb4c9f9bc485d1c5dc22aa61d4c"
    },
    {
      "file": "src/render/vis/magicPackLayer.ts",
      "sha256": "78ae1d421f0200989a47898ec790fd1c1f88859bf908cc73e4ae930d04cc9ca8"
    },
    {
      "file": "src/render/vis/materials.ts",
      "sha256": "dfa1f5b4982520737b327b3e5cc90ee0bd6c32f27780fdc15d5f54d168b308b9"
    },
    {
      "file": "src/render/vis/meleeReachLayer.ts",
      "sha256": "e01145abb1ed0d6297e54fccdc63c22a643a170c263ab47b657592184aa57a9b"
    },
    {
      "file": "src/render/vis/metalSpikes.ts",
      "sha256": "7e28be107d3323ac3278f89465ac1f20dfcf4dfe6300afdcca0b1e24ee19a179"
    },
    {
      "file": "src/render/vis/movementTetherLayer.ts",
      "sha256": "5d82074b4170e9c2a38f495e8e7c19e73a74953e7fc919ef402d6b29a39a802b"
    },
    {
      "file": "src/render/vis/needleCrown.ts",
      "sha256": "51eff4994c1cf11aae9ee3f93f58a2ffc965d4abf517111f8187c1092fbe79f9"
    },
    {
      "file": "src/render/vis/noticeLayout.ts",
      "sha256": "49ba1454df456bbebbca7fe2b542ae703b426d7ce03d8dc92c3398f75478af69"
    },
    {
      "file": "src/render/vis/objectiveReadout.ts",
      "sha256": "737c34f36ebb7cde14c8375d49d482f8ebfc2255ac1e49408637190b6fa74116"
    },
    {
      "file": "src/render/vis/orbMote.ts",
      "sha256": "2d20530eb3b12f58257a8b0ce56f4e96d8cac113c9e05283dade8da88662018b"
    },
    {
      "file": "src/render/vis/overlays.ts",
      "sha256": "39b5e411da94b75237c99061a2ed681848853eb4b3b047b01b1c91b3388cc34a"
    },
    {
      "file": "src/render/vis/painters.ts",
      "sha256": "3790964f8a2af548bfdcb9c4466b2bde490931edea2d0a57008db060abc23ea8"
    },
    {
      "file": "src/render/vis/paintersAether.ts",
      "sha256": "574ddcee2264539d1a4bcd9f43b13e789df17da69d2b84224c37f1e1f54005c0"
    },
    {
      "file": "src/render/vis/paintersGarden.ts",
      "sha256": "e168bbf1b5651340c5142fd71dcb8a2d7bb2dcbc9c2e373ee616e88ac8dca760"
    },
    {
      "file": "src/render/vis/paintersGloam.ts",
      "sha256": "a4f7857690db65e4ba25e3b33ed8dd3ae61d185194e1b41b046d5f05b7443b92"
    },
    {
      "file": "src/render/vis/paintersGrove.ts",
      "sha256": "a453a2b9cca451e8d0fd90423b6903bb7f57ab632a994c4c5cbd98c1a2143e30"
    },
    {
      "file": "src/render/vis/paintersHallow.ts",
      "sha256": "cc9d0a193c015ba85f6f934c336de583678321b99058b9635d053d1c97b3ad95"
    },
    {
      "file": "src/render/vis/paintersHome.ts",
      "sha256": "09f997c4b6f3896501f8bfc15b5bfd10d9df59e44eeab4a63386d945553123b1"
    },
    {
      "file": "src/render/vis/paintersInn.ts",
      "sha256": "f982e48552cdc7f69026817654a42a9591b3c6fcd58085cd04f75d3cf84fb030"
    },
    {
      "file": "src/render/vis/paintersSea.ts",
      "sha256": "211af8355862dd8b3f026c46ab77d32a8c48a89bbe4a80ef79eabe557e812201"
    },
    {
      "file": "src/render/vis/paintersWarfront.ts",
      "sha256": "c22ffd25bee5c2937a7dd4ef1b4cb651a06afb11201ad292fc3178cdfc40a267"
    },
    {
      "file": "src/render/vis/parts.ts",
      "sha256": "ca262d22a6b9a3a8f4a4b843fb4178ba5fb2276f2560cbef0b7b8873d235a51b"
    },
    {
      "file": "src/render/vis/payloadCueLayer.ts",
      "sha256": "d24a1806a80056d37a4585da12787d2bbc707029accb9e97f1571abf7ce0edb8"
    },
    {
      "file": "src/render/vis/playerDeath.ts",
      "sha256": "5bc8f7fd7fe789309f495c101201cdec46462dc35aefe52daf082c3bba53580a"
    },
    {
      "file": "src/render/vis/portrait.ts",
      "sha256": "9d0070bb56090e45a8849cf6ac132e6c85c34027cc652561f21a06f745593670"
    },
    {
      "file": "src/render/vis/procCueLayer.ts",
      "sha256": "e0ad46573ec1d8a6345bea65c570ecafb6648b638d36e6bca698135639a991cc"
    },
    {
      "file": "src/render/vis/projectileBounds.ts",
      "sha256": "b97dd4782fe2f1d8f4a4e8f6ebb565363a40f759294a2814022434df3ebe50d0"
    },
    {
      "file": "src/render/vis/questCompass.ts",
      "sha256": "d0383c4b9af2baaf7d110f5e9833f14ac19c57582fa64cc7b93d977d4c0bce74"
    },
    {
      "file": "src/render/vis/raisedGuard.ts",
      "sha256": "4dc80013fe11d75929f38ee913bb95e4db241405c6fcf3cf9c872b9b3ec3b13f"
    },
    {
      "file": "src/render/vis/readableLight.ts",
      "sha256": "448f042dedc5b6790c728be2b5d1bd261bc9ec1491330add6abd075c8fe4396e"
    },
    {
      "file": "src/render/vis/refugeDeparture.ts",
      "sha256": "4fc61f1f611070a2c189c57382bf7dc8e44b0522804c2c527b5e9714810cd174"
    },
    {
      "file": "src/render/vis/regionMaterials.ts",
      "sha256": "e493bec65747d14d14129da01f0a0dd5a675bd4b2cc00e590852d4e22c599107"
    },
    {
      "file": "src/render/vis/reserveCueLayer.ts",
      "sha256": "b0e8259615c4bff42e4db07737bf70f68b4c664f63d85bc7942b4e3ac374ba9e"
    },
    {
      "file": "src/render/vis/resourceFlowLayer.ts",
      "sha256": "d482a220aa4faf9dbe96cba2a219eacadcd96779d076e01d1d5185f1c8ac3464"
    },
    {
      "file": "src/render/vis/rewardLabels.ts",
      "sha256": "565583b65bff377eb6840740d8f95d0d9b05862840b68c0f878ab8e2762450cf"
    },
    {
      "file": "src/render/vis/rockFaceEntrance.ts",
      "sha256": "554e603ace0a2852972e253bdbe842e8314892ea083a33e7431820725972a99b"
    },
    {
      "file": "src/render/vis/roomVeil.ts",
      "sha256": "5af20c1138fed5c13607ac66b250e589520f91eaaa1ccb441add812e6183d4b0"
    },
    {
      "file": "src/render/vis/runeRing.ts",
      "sha256": "08131a7f0ec6cb1e14c43b02857bc6feb2e501eff88f24867354bb277abf0583"
    },
    {
      "file": "src/render/vis/satelliteLayer.ts",
      "sha256": "9ec2796cc278140fde4e64f9edbaf54e9eb2d738dc8058b6c8877ff00d114146"
    },
    {
      "file": "src/render/vis/sight.ts",
      "sha256": "ba540b50d3bfa97fb61d0a9410aa046e596e5ed9918106ef3f088100eb79fe03"
    },
    {
      "file": "src/render/vis/sightVeil.ts",
      "sha256": "2e1a1e50c61b2d814b8156b78bb6bb7f0202657a2b93a735ee8a3ef063a9d4d8"
    },
    {
      "file": "src/render/vis/skillBurstVoice.ts",
      "sha256": "78ad12e2da2ccaae9abaeb43c777ac8482bfc761328f976f53fe22cc192db7ea"
    },
    {
      "file": "src/render/vis/skillCastPreparation.ts",
      "sha256": "96e632dd1f99294e441e81ec2b0dc52a12c3b7565bbce0c2c92e219cb3f56d45"
    },
    {
      "file": "src/render/vis/skillFlightVoice.ts",
      "sha256": "d567339f273afc02982f361a92f2e7bb6a828ce203ebd43260c362b09438ebd0"
    },
    {
      "file": "src/render/vis/skillMovementVoice.ts",
      "sha256": "4a474b86b94886160d2d0777597779a1e2ff588b21088f41c70ebbb2a44c6cf2"
    },
    {
      "file": "src/render/vis/skillPresenceVoice.ts",
      "sha256": "d576ba1e5d4390132a41de554a4e16d139a3a4fbc9e4519a3be9706762194347"
    },
    {
      "file": "src/render/vis/skillSelfVoice.ts",
      "sha256": "e3a0eae8e24c66d314aae4c81dbb525f0fa154ae7d550e99512988988f39f08f"
    },
    {
      "file": "src/render/vis/skillStrikeVoice.ts",
      "sha256": "93ab341a5199146587d441aa4607aca6f70885af181399c52cbcf79e6e570522"
    },
    {
      "file": "src/render/vis/skillTargetVoice.ts",
      "sha256": "a89d248f23e4ef9a73ca3d1be41864e517d9239e313d4d27bd2988d7bbe69fd3"
    },
    {
      "file": "src/render/vis/speech.ts",
      "sha256": "ca44714cd85f629692e444fbdabd85de9fa02559c867542dba63f6bac9872c18"
    },
    {
      "file": "src/render/vis/sprites.ts",
      "sha256": "0b5b902c534955aae04ef44c31c75b0fc98556232b6748713a6794b246e0f875"
    },
    {
      "file": "src/render/vis/statue.ts",
      "sha256": "fb90cd74ee916d89772961bf657ca923ac6555a545aaefdc1ea9abc2f1b6db3b"
    },
    {
      "file": "src/render/vis/statusIcons.ts",
      "sha256": "6818d8b14a1460bd1e9ad462466df525e6018b9754555705a31bb66612e9487b"
    },
    {
      "file": "src/render/vis/statusReadout.ts",
      "sha256": "b0cbf095217fc5b383b7e4052257b41209d241abe34c960b140c244d3da2cc78"
    },
    {
      "file": "src/render/vis/statusVoiceLayer.ts",
      "sha256": "e2013a1f132e0282a013b7476f36f130124c99b30ff9afccd37ca5cacf14beff"
    },
    {
      "file": "src/render/vis/trackLayer.ts",
      "sha256": "4274a4ee74db2d6a3c641d19ed9b495d65cbc678482c00a52171cda5ffa8e259"
    },
    {
      "file": "src/render/vis/trapLayer.ts",
      "sha256": "61fee7eacc74116da4da09488f46e79c53d7a57ec98560265de8825c1aee3a0b"
    },
    {
      "file": "src/render/vis/understory.ts",
      "sha256": "d1114f829e4b27d5efab8a7aa549e7e3de55f4824683ca424196343813f49d35"
    },
    {
      "file": "src/render/vis/ventRideLayer.ts",
      "sha256": "e4ebd5d2ab57a907cb455be44056b8e005357cf82a13acfd75f45e0a68eb82ea"
    },
    {
      "file": "src/render/vis/visConfig.ts",
      "sha256": "1404f504586709b74bc2dbc9945677fbc999e758f5593f8b18ff2161a40d5582"
    },
    {
      "file": "src/render/vis/voidFrame.ts",
      "sha256": "2016cb93f837c3cb65bdf4db2b38977a45edf476faab547a8abf58826f3ef9fa"
    },
    {
      "file": "src/render/vis/walkParts.ts",
      "sha256": "cd2a2a87fa4b4203e1d5b80a53f5fd3bc0b7876267d0e873c84d4234778d0d39"
    },
    {
      "file": "src/render/vis/wallEyes.ts",
      "sha256": "ccd4554504b4c868633a25f4ad54f2d0205ae18b49492124234c81dc441db80d"
    },
    {
      "file": "src/render/vis/warningCueLayer.ts",
      "sha256": "345d317c73c8f31658f37e47dd8222a64f64894422d4c7ae04c6510af5baee99"
    },
    {
      "file": "src/render/vis/watchLayer.ts",
      "sha256": "8d9c7cb1ffcb50b483ec47564120c0d5694fb0aa6735e304586f6bebd3d0b4a6"
    },
    {
      "file": "src/render/vis/waterSurface.ts",
      "sha256": "82ec546bb27b4e4d3b076e02fe29800e0c278fc7757870c75c18b8025312d264"
    },
    {
      "file": "src/render/vis/weatherFx.ts",
      "sha256": "11a47afd26527d3f490970c9b07b011c1e6cd32a7275219b4016416b2db885cf"
    },
    {
      "file": "src/render/vis/worldVoices.ts",
      "sha256": "d6bbf4e0650b5e56bbb7f14c6f3f759575851674957c24ad0ace365501fb6651"
    },
    {
      "file": "src/showcase/engine.ts",
      "sha256": "b13953ade2fb5d8f8880418c647c71ee6a653b734e6424f736e0447afa6347ba"
    },
    {
      "file": "src/showcase/host.ts",
      "sha256": "2473f45d510f777cd1d178cc9c1aad1f378f4842ddca3ee530fb594c7bf2d389"
    },
    {
      "file": "src/showcase/shield.ts",
      "sha256": "168cd7fccf508560efffc346f723c75d843a053e51eb4be9b7cac3cb40acf7c3"
    },
    {
      "file": "src/showcase/stage.ts",
      "sha256": "afe5752fbd0ba64fee983f0a6b747a0db35bca7a00c1b52ccb345fa52daea87e"
    },
    {
      "file": "src/showcase/stagePlan.ts",
      "sha256": "876877ddb8a5ba4a4b2e1de096abab145ec1e0031a035230ce67db5c7d51e80e"
    },
    {
      "file": "src/sim/arena.ts",
      "sha256": "31b6fe72f6a7c3b1ab8d272ca751c74dcb35fd7b0d0ac7448fd42895e96ff11e"
    },
    {
      "file": "src/sim/builds.ts",
      "sha256": "31a7732ae591240f12e82e81be12c2516dc9cb0110e9b9f74e357e7ffbb64cca"
    },
    {
      "file": "src/sim/compat.ts",
      "sha256": "9af7ac13bc39b95e727f0824c2e004a371eaf333aa5f96c8b18fa8c164f6f0e0"
    },
    {
      "file": "src/sim/data/builds.ts",
      "sha256": "c6d146f91cd343502d236eab8099f8d00bc339c1d0962e21a1ad7dab98dc859c"
    },
    {
      "file": "src/sim/data/panels.ts",
      "sha256": "00de38c4668ac50b2934f4438a37551184d62fe94f018d653316819d1aa52eb5"
    },
    {
      "file": "src/sim/data/scenarios.ts",
      "sha256": "ec6a89d34ae369c1a9312c59765009cfaf8ce01b1d093644ab60a099b58476f8"
    },
    {
      "file": "src/sim/data/targets.ts",
      "sha256": "53d59bd0ac53abab40b2517b73e1045dd3041a975b4927db37dba660736d0b34"
    },
    {
      "file": "src/sim/economy.ts",
      "sha256": "d91ceaf8c8934d07fc79c0689cb71f66acebd8d5ec8f01dd979166d57465a5b3"
    },
    {
      "file": "src/sim/ledger.ts",
      "sha256": "152d9fa13a4311cfc524b21030415a2fe3704266d010bdf2b46da079dc5e3287"
    },
    {
      "file": "src/sim/metrics.ts",
      "sha256": "b1727f4f79ebd0b33b895d84c4c620fbd8dd3e7cedafc68c9f158b0ac4e9e540"
    },
    {
      "file": "src/sim/pilots.ts",
      "sha256": "fd90f58d8bb7e96e4839b1abe8d8e8e5443627dbfc2c2554f7c45a384d3ca091"
    },
    {
      "file": "src/sim/rng.ts",
      "sha256": "4b9d3a72eee7f115ddc9cd9e414c6241429956f681db1e88a8a2506156c1df43"
    },
    {
      "file": "src/sim/runner.ts",
      "sha256": "1e99c5145188635fba7f01de127399038d8f816d1cf6ca23505431707955accf"
    },
    {
      "file": "src/sim/shims.ts",
      "sha256": "3d6915881f4dec28401ee64576064045917444f3e48cf7594ad34f1ea88b137b"
    },
    {
      "file": "src/sim/textures.ts",
      "sha256": "1582707458672563034747f482b3946e1842898bafa1c47170051195b3d6fbcf"
    },
    {
      "file": "src/sim/types.ts",
      "sha256": "a4133c4c9905689189434c42baa8c836e81e71fab3aad45aa2d05ec46d3beeb0"
    },
    {
      "file": "src/ui/atlasBudget.ts",
      "sha256": "c09aacfa02eee06729f854348d0f94db4fd6d0fd76eb2c0b3af7902dc8fe097c"
    },
    {
      "file": "src/ui/atlasInputCache.ts",
      "sha256": "b4b2200479c142631ca724ffaad802ff9932892f61f5f97c5d1b41b6b6dd292b"
    },
    {
      "file": "src/ui/atlasPaint.ts",
      "sha256": "d0f7994e95a5961a8e9fc6a1e49eca3708e69ab5dfc7c7653546cd6860bc2340"
    },
    {
      "file": "src/ui/buildPanels.ts",
      "sha256": "36ee5d3164e7bcaa747170011c6ea19265c39db2f4ce783bbfafe1e1ca7b285f"
    },
    {
      "file": "src/ui/containerPane.ts",
      "sha256": "957abdcc7d93ca0b9d43741251b6b6ac2b8a893d882d843a7e89dbb7be4c858e"
    },
    {
      "file": "src/ui/couchJoin.ts",
      "sha256": "1a4cc5705f4d96de73abc235693eae90749829cc2c47a5e29feb0c318cf8191e"
    },
    {
      "file": "src/ui/dialogue.ts",
      "sha256": "a08f5b3cfc05dc9146be31d64fa83903890c6d6d1df15325d1a9e8256d6c92ee"
    },
    {
      "file": "src/ui/dialogueLayout.ts",
      "sha256": "234a476f999faf1dbc6aef17dd487d73b1720ef1c555bd63e05a74939e1fbd4f"
    },
    {
      "file": "src/ui/dnd.ts",
      "sha256": "e9c696f21cdc97a0ceb3a1d7c1f2cf6026dd3f7a0248f94e2052e668d6ee1214"
    },
    {
      "file": "src/ui/dom.ts",
      "sha256": "74fcc77660894de51a40d7dc14782718b81988fe6ae7a4a3402adb6f8f4c62f7"
    },
    {
      "file": "src/ui/errorOverlay.ts",
      "sha256": "2f634080718f7cb1fbe2942967d267c949dd9dae0d16cdaa4748576b50ddfbf0"
    },
    {
      "file": "src/ui/escapeConfig.ts",
      "sha256": "5e37c48f2bf6f82f20ae1a6615f83001a4c6e6215a05bcef8ceaae9869054780"
    },
    {
      "file": "src/ui/folio.ts",
      "sha256": "c3d22676ac785d6ce2800f203d1d100fa28dea2089dc0fd28ecb942b9a0d9807"
    },
    {
      "file": "src/ui/icons.ts",
      "sha256": "24a17ef2d5799d0b9f3049d3f18f23dd424ad1f74e81741cdce2395800797c76"
    },
    {
      "file": "src/ui/inventoryPages.ts",
      "sha256": "24acb9826205443e0aafd188fd0f965111017b3fc948a3ecc6fe4a0e1ba141f5"
    },
    {
      "file": "src/ui/itemhold.ts",
      "sha256": "85b90c046bd519f9afbf8de75fd9875e47c0eb3aa61c85ba7fe1bd3065384d04"
    },
    {
      "file": "src/ui/loadingScreen.ts",
      "sha256": "65233f8e5abcd8ab70c17fc9c544be19efdb3eab8c43321f477a6bc35328c744"
    },
    {
      "file": "src/ui/lobby.ts",
      "sha256": "147f7ba8a7ff2cc29ab148a5afc5c76581550221e7f241e7895e378b6bd778a3"
    },
    {
      "file": "src/ui/mapBearings.ts",
      "sha256": "91ac5669845f3cbf4ae2b1bff0047cdfffe6f5074bf93a141c8d162475c25cc6"
    },
    {
      "file": "src/ui/mapConfig.ts",
      "sha256": "a12de41a9f11ffcb16bf3404183d10526a46f65cad5a572591943375f5ff1a73"
    },
    {
      "file": "src/ui/mapLens.ts",
      "sha256": "8e0ecab5a25106d3d124b90c07a3fd97e6be46c3cdc4ddc95c76e11e18f17cf2"
    },
    {
      "file": "src/ui/mapViewport.ts",
      "sha256": "e1543aca99cea1d95d1a751de428efc6532de4cdf686b2e703d7c28212776c59"
    },
    {
      "file": "src/ui/menubar.ts",
      "sha256": "16245ad2d556bd44feccc9ffc27bc886e60d9be75035ca45c4f9b9838f140181"
    },
    {
      "file": "src/ui/menuConfig.ts",
      "sha256": "0994c456dcb4e60efb9b418a762a3fada2045788d1fc2ebf5f20dae84fe8cb43"
    },
    {
      "file": "src/ui/minigames.ts",
      "sha256": "cde5c9eb352b59fa096860d02d068def983192e59afb02c11797a1443a58bf50"
    },
    {
      "file": "src/ui/npcConversation.ts",
      "sha256": "2b38c0b669fbaa618d3f9d3df3570444c6831fa52cc2d1db728259473c29aac6"
    },
    {
      "file": "src/ui/padpointer.ts",
      "sha256": "926c50a5018d48c3a322c2ecd8523b9bc09e69536f51b99b17a100025ef4e4ca"
    },
    {
      "file": "src/ui/panelmove.ts",
      "sha256": "705186ca382c53f96ad7b13f8ab64acb3be02f4cd340be743a615f28d4e42767"
    },
    {
      "file": "src/ui/panels.ts",
      "sha256": "d12284a4310c380ee54d2d20719391d9500c9a648deaefa2c92d633795160809"
    },
    {
      "file": "src/ui/panzoom.ts",
      "sha256": "983ca756c2b1e7ecfabe5ff3fef0f64c68fcb6c872e4013c0e79228ad7a54e46"
    },
    {
      "file": "src/ui/party.ts",
      "sha256": "5ed36219815245b5869e86c2f7219240cc82ab8c907842ae2d384e5d471747cb"
    },
    {
      "file": "src/ui/passiveFrontier.ts",
      "sha256": "43fe6b5b1cf4c1196c0ad9787aa0461a3ee3762c212ec4a4030b564c94690ba2"
    },
    {
      "file": "src/ui/portalbutton.ts",
      "sha256": "8835a1743d7d7848ddbda2807cff650fbc1b849b9ade4a33263064c8b55a1205"
    },
    {
      "file": "src/ui/portalConfig.ts",
      "sha256": "0a0ff13f5eeb156ded615f79c0c7698ec2af0e993451ee1912f843dee20d8f24"
    },
    {
      "file": "src/ui/questOffers.ts",
      "sha256": "21c76989aefec7dfd6eb0d767e0b86e77d5ab2c83943d0a1c55bf37898117bbc"
    },
    {
      "file": "src/ui/questRewards.ts",
      "sha256": "1609bf85ea96aa341e3798827280d68ff101c136de804f5eaaf40948669d532d"
    },
    {
      "file": "src/ui/reliquary.ts",
      "sha256": "fd790130fccc7c3cde5e7334a54ab946ea5d67f2837903e7ead5fddd0010300c"
    },
    {
      "file": "src/ui/roadGuide.ts",
      "sha256": "819566120d1ed6c1099cce0ecdf357df1fc068a0bcdefe6b3fb1ebdc8721ccf7"
    },
    {
      "file": "src/ui/serviceWorkspace.ts",
      "sha256": "9b02634dfd749c11b2ba0bce6c8f033cb1232eb824bad688576eb90a77cefd9a"
    },
    {
      "file": "src/ui/skillPreparation.ts",
      "sha256": "097f4fa96c9417aad6c92c849964b488295c7b2a477448adfe497b71564b525f"
    },
    {
      "file": "src/ui/stash.ts",
      "sha256": "360fa7d81ff64683b5c09a6f61b5d5e35f59662b7618d91a9b97ae7149e80d67"
    },
    {
      "file": "src/ui/storedSupports.ts",
      "sha256": "f99844ce9a45a318e06dc7e68aa1b9c3afe681bd183347d0d44d44d200a5ec74"
    },
    {
      "file": "src/ui/supportCompatibility.ts",
      "sha256": "6a5aa50d6bc46dfc6d7a0ec10ed7c153ef9e95e9179c81144c181a73b67841a2"
    },
    {
      "file": "src/ui/swapReadiness.ts",
      "sha256": "ec2bd2fb500c596f08ea4d494e122f505d2da280d175fa07de1336b5e5cbf6c6"
    },
    {
      "file": "src/ui/tooltip.ts",
      "sha256": "685d4863741b8f4b5bf80e7d99f64a7903f0ba0aee58852d28e595f3a75e8e29"
    },
    {
      "file": "src/ui/uiScale.ts",
      "sha256": "26e55702d84fc16aaff39dd52fa76e33ad176bcdf9f8d657856879440fd5019c"
    },
    {
      "file": "src/ui/wardrobe.ts",
      "sha256": "3a55335ae08341135c4b6e1dcd47fa311d4dd415f3d86d62e165ada55d834161"
    },
    {
      "file": "src/ui/zorder.ts",
      "sha256": "956d31992a75630310256b4d6930bae9c42f5fa38b6564382fcc4a5185574aad"
    },
    {
      "file": "src/world/atlas.ts",
      "sha256": "2a8bf87b5e01ce1f4a01e3029858dbea93544e63884d2d09f48d81b4f0a619f7"
    },
    {
      "file": "src/world/attention.ts",
      "sha256": "cbf43a3e2554b877473a567067ab8268ac5929a4c445d81347cc0a5621fc1285"
    },
    {
      "file": "src/world/biomeField.ts",
      "sha256": "3e3e0c37598407c5df3956dec0d20b4f85fb8454cc828b7884d911cc69858940"
    },
    {
      "file": "src/world/biomes.ts",
      "sha256": "d515fa5ea4413bdd4e0b9e75a93744ac54ecab93c669dafce06e7514735a0c34"
    },
    {
      "file": "src/world/bountyRoutes.ts",
      "sha256": "54085fc29900b034b01a5159881d0f46fc178cbbd374bb966f1fc6bd618ec985"
    },
    {
      "file": "src/world/bulletins.ts",
      "sha256": "5f480223d79512a6e32a8d0f4755ca148b4be3c5064928bace16f34326a82c50"
    },
    {
      "file": "src/world/captureGeography.ts",
      "sha256": "654798ac0b198aa5c548ceb4c26cc11c25d4ffd6c3c248fe60ff761b3b01664d"
    },
    {
      "file": "src/world/civics.ts",
      "sha256": "9bcfc5b7001109ea4c6d0799debd2d2969165a392d0dd3e3f0302b6f6e4575ad"
    },
    {
      "file": "src/world/climate.ts",
      "sha256": "bd67a06a6809959d9b2ea1387979c411f612b8d836dd404fdfe3b993e0ac7149"
    },
    {
      "file": "src/world/climateCore.ts",
      "sha256": "2c6b97ca00254e7a7f8dd646312406228fb90a57afa3ef8ecc3a1ab9c78fdfed"
    },
    {
      "file": "src/world/continentCore.ts",
      "sha256": "03f44f82f7caf0f5616ff4ea2f7270acf2d9bccb43290196b308a1337fd08303"
    },
    {
      "file": "src/world/continents.ts",
      "sha256": "458a98bd091645e3b4e57755b3ae2adb1c5d4fc1f9a2444d7d4f7fc03f46b10a"
    },
    {
      "file": "src/world/coords.ts",
      "sha256": "fded7edd91dbbbdcebfd8d00c437ef294f01e876b5127ff9324601c958c599bd"
    },
    {
      "file": "src/world/courses.ts",
      "sha256": "e20bd418d3df5e11a605e8caf479a446fb0b48b496783ad32e4baac4352df098"
    },
    {
      "file": "src/world/courseStages.ts",
      "sha256": "deb65a351862b788524a815fc07fc5ff03aab92c19d6112b7291a6130b5dacea"
    },
    {
      "file": "src/world/daynight.ts",
      "sha256": "ea91652bef417547abb7ee530b5d6dd9ea0edd777781442b6ab1876187eb2459"
    },
    {
      "file": "src/world/dimensionGeometry.ts",
      "sha256": "3e296e6a25b61013a9853a83e8725c2767f04c2756125c754f197aa1e932583c"
    },
    {
      "file": "src/world/dimensions.ts",
      "sha256": "812f2dcc8ed8fa46c0ba59b769fbcbcf1d68b6e79e7fd2cc62e5823c18c5b5e0"
    },
    {
      "file": "src/world/drives.ts",
      "sha256": "929e6c32edd115cd9a3495e4904815ddaffcdb2b629a0acc1b8f0dc57c9a4d36"
    },
    {
      "file": "src/world/edgeBlocks.ts",
      "sha256": "ac282f92c8732935e375ae15bf8e6e872408456947220658e32be3d151714c0c"
    },
    {
      "file": "src/world/escarpments.ts",
      "sha256": "06f2bc0adf8184c97cf4fdee48c77268b68c8a0e3791735f8578cc1490f56a3e"
    },
    {
      "file": "src/world/faction.ts",
      "sha256": "32427cf0dd6c32d55a956a458cf12bf8fe5286609106f3a9f8b7137047cdd439"
    },
    {
      "file": "src/world/featureActivity.ts",
      "sha256": "c2d50fb13e08873c557d642b3b642025cfe0bc8e0406ac5be16e088265937560"
    },
    {
      "file": "src/world/fieldChoice.ts",
      "sha256": "18ea0f96c03ec2f7997ee77f3684b8abffa34656316ab762d74c5890a8fd206d"
    },
    {
      "file": "src/world/fieldRegion.ts",
      "sha256": "aa9a2af78188d3805ad9256f8a6e7489568830de1ffc7aec1373bcc6a19e4c95"
    },
    {
      "file": "src/world/forechart.ts",
      "sha256": "f17371f8f2992949cd978291ff14f3156f0cc246865a0018753dc5e5007cc632"
    },
    {
      "file": "src/world/geographySource.ts",
      "sha256": "86a256bbdf10aca951fc6a776908648d3bba5c44c75c09b3382df3270d7b620c"
    },
    {
      "file": "src/world/gridWalk.ts",
      "sha256": "ee65e0a356a40b3871dba02635029d43cb5471824889b7d8615b80fd0bb702de"
    },
    {
      "file": "src/world/harborholds.ts",
      "sha256": "49f2bc973096a4ba8c1d194d45c2ad624e4a5d7ba45329c35fc8e3f8c2e20397"
    },
    {
      "file": "src/world/invasion.ts",
      "sha256": "46aa38276a06fe9a19243e8ef40c2b211d0903419c5bb8f934500c53c7ebcfc8"
    },
    {
      "file": "src/world/landmarkComplexes.ts",
      "sha256": "0b7adc3551c0910aabf73d0e7d57d49cf95918b83b63ee92e52d25844603dd1c"
    },
    {
      "file": "src/world/levelField.ts",
      "sha256": "da8ee47119eae6f2f3daa60de97626a1e966a7261cbd6e771b8849e91b76a823"
    },
    {
      "file": "src/world/localeFragments.ts",
      "sha256": "e4203e3492717e4c4b893a644c2812d2e2c75236d8d78eb2d8830586f71cdf0b"
    },
    {
      "file": "src/world/locales.ts",
      "sha256": "d60674bab125eb9dae681d72bdfd216e36563a2d76940c0e82b9925cfc7e74f2"
    },
    {
      "file": "src/world/mapMarkers.ts",
      "sha256": "670facef90abe26eacdfa0f8c69cc009478927d4107e0b05534381dca7ed5e3e"
    },
    {
      "file": "src/world/odyssey.ts",
      "sha256": "e1f61f3f45154772c9e79066588136cc7efb3731e2da74cb40798b014a032580"
    },
    {
      "file": "src/world/odysseyPressure.ts",
      "sha256": "26232832b5c4417a33bd4779dd75b53025330ba1873f3c01cc17056204902542"
    },
    {
      "file": "src/world/odysseyRisings.ts",
      "sha256": "0c711eb5ad6ffc5baf5292ce64d20ff2d9620041a070127876506957c5fad6fb"
    },
    {
      "file": "src/world/omens.ts",
      "sha256": "38c10b62f2b9b34ca5650d0c4c64a20bf625c202e769892e2c6d35f17015bf63"
    },
    {
      "file": "src/world/openingProgression.ts",
      "sha256": "5df9cf425fef32f6e378816436b4f0cb647cbe448971facbb44af5477f782c4a"
    },
    {
      "file": "src/world/overlay.ts",
      "sha256": "b6bc1c41e185c6fc80213cb8b7f6b59c413273e7f3496dd07ca1325239187432"
    },
    {
      "file": "src/world/palette.ts",
      "sha256": "f77ce9e4e7c8cc64ea92fc43ad364b8c5f0e63f15b66401f904e6955cd653258"
    },
    {
      "file": "src/world/radiance.ts",
      "sha256": "2b53dc16a2fd285f708e8b47daebfae37e426b8daab26f1eb8b4d3f3b2dc1a32"
    },
    {
      "file": "src/world/regionGeometry.ts",
      "sha256": "ebd9a868b4f05fb3241b2c02f726ecf90165221acfe6ce8244e2f3db4e27d071"
    },
    {
      "file": "src/world/regions.ts",
      "sha256": "3ad59b11d397e5c5583d9e4c8a917d58f937439cbabaad67606334b0eb796aff"
    },
    {
      "file": "src/world/relief.ts",
      "sha256": "87961ed33ee2cacfb2c4e9a7f3a352aff9528ddb54392b5a6114f9b8d1cd1901"
    },
    {
      "file": "src/world/reputation.ts",
      "sha256": "7eb9e8ea905ed0d42fa0c14bfed7a487704522d8ed6b749f0182fa4eadd92176"
    },
    {
      "file": "src/world/seas.ts",
      "sha256": "82fa3856e88b3141dacfe05a907fd52774fbf2a47fe38fc4c215fd3e144b9e99"
    },
    {
      "file": "src/world/seats.ts",
      "sha256": "43b40c3368ca14113f2e9719df75ba41622985d3d7ef7f79185eecb78447af1c"
    },
    {
      "file": "src/world/shape.ts",
      "sha256": "daf83d9d1244efe6b216e06b59ae113db4ae00e637a336229f4d97023634be81"
    },
    {
      "file": "src/world/sim.ts",
      "sha256": "830425a48c9dee315f63d8438faaa6157688cb78c2ccd3804dc16e9de6ab95f5"
    },
    {
      "file": "src/world/soulriver.ts",
      "sha256": "00b8f3958ffe742ce1ba4c0b87e6a5898db1e286150ae297b591c75618b3aa36"
    },
    {
      "file": "src/world/strata.ts",
      "sha256": "5de0808db7630d9b6bc0ca5fbc5abc7e3c030190d8bf62ffc78c21fe601c7530"
    },
    {
      "file": "src/world/tilesetChoice.ts",
      "sha256": "ff40aa849ce0aa9e34ca2a1ab3a019a5da0b6a6fcfda8625c01313a44382bd49"
    },
    {
      "file": "src/world/traits.ts",
      "sha256": "e83276d34a073a605f1b4a3a2c268fc733b81ac16085d73c13832a37e125cf9e"
    },
    {
      "file": "src/world/travelRoutes.ts",
      "sha256": "0976d78145b4d0878918e3c7edc5771b2b77e3250295eabee82acc093c4df121"
    },
    {
      "file": "src/world/voyage.ts",
      "sha256": "2f43a737f174ce2b6593e0951c6a27d4e96486c22565e2e8c1f29a555a162c8a"
    },
    {
      "file": "src/world/walk.ts",
      "sha256": "45d50e47d698caaf6464b9eda2777840ece25e68883442ca6c4f048a89ca8eac"
    },
    {
      "file": "src/world/warfield.ts",
      "sha256": "61711517dac59cf762d41fa8706cf62e8936243d608e81aa93340359f3e1ccbe"
    },
    {
      "file": "src/world/warlord.ts",
      "sha256": "a0b14c99eec78a64c1ea725854f97c7d596bcfa6666f72523e135950cd8c8834"
    },
    {
      "file": "src/world/weather.ts",
      "sha256": "453cae4bf0c20f296b1d216284bcce9e6b6cd1480f9f4d4ba245eb87579e7634"
    },
    {
      "file": "src/world/zoneInfo.ts",
      "sha256": "8dccc68e276371a3aaa09d90e5a75dde4681be93cd682775ae55d7731a3a233b"
    },
    {
      "file": "src/world/zonePolicy.ts",
      "sha256": "e677ff1c52c8e7d26ba43f5f708d4f29e4d610c364591dd30dbbded5f4b989de"
    },
    {
      "file": "src/world/zoneVariety.ts",
      "sha256": "ffea30076fc64039cbff9ff5da54caa48449eb503e487938bc14d097596bf809"
    },
    {
      "file": "src/world/zoneWash.ts",
      "sha256": "b7c351b6ae7a1ce26f0a0bc5527003bbcfe6cb2d943522cee31ad75043a14fef"
    },
    {
      "file": "src/worldmass/activitySites.ts",
      "sha256": "06b19553171365e9b9ac5a3562ff088699d6657b4dfab45e30e6146b5e35172a"
    },
    {
      "file": "src/worldmass/address.ts",
      "sha256": "bf1632c89d12907f1bc614cf73b4c85ac3a16640bb90aacfc070450186214b56"
    },
    {
      "file": "src/worldmass/ambientPacks.ts",
      "sha256": "f4793b446f4d15c3efa78e786a619c24affa07703463f8ee79caa218496d23df"
    },
    {
      "file": "src/worldmass/biomes.ts",
      "sha256": "9059af98fd2ee33c3f61476f599e34de08650a5ff3d456152ede5ebec4b20ace"
    },
    {
      "file": "src/worldmass/birth.ts",
      "sha256": "5873b1b61552b3354b04264485d31a98656c3b797552eb45331f9921113b0d77"
    },
    {
      "file": "src/worldmass/bounties.ts",
      "sha256": "792032a5025e2b5e171a09e51c6fbb8c8781c5d88c1d0497ab0a49530c419ca0"
    },
    {
      "file": "src/worldmass/cartography.ts",
      "sha256": "1a37ddcb64db0f232fc7762fecba6da3eb8f01380b3b0e5e309f27e640a5b587"
    },
    {
      "file": "src/worldmass/caveStratum.ts",
      "sha256": "acc4d19c062a2a1d027ddbd0186ca2444b01e15316b88f879777a805599be2bd"
    },
    {
      "file": "src/worldmass/checkpoint.ts",
      "sha256": "a4b9960bfdecd583f9cc288e522bb25dfb91c7acb2504367a0ecd72043476939"
    },
    {
      "file": "src/worldmass/clearance.ts",
      "sha256": "4c44e3181ed7edba0163135bcf95432621bea1bfc9639eafc372d9d9e9f92ad4"
    },
    {
      "file": "src/worldmass/compilePort.ts",
      "sha256": "78e0a67129004bdb61736d180c4da85967db838b2ac849b92d22df587b6171f4"
    },
    {
      "file": "src/worldmass/contracts.ts",
      "sha256": "5b5782a124d45a2a40e6ed4c6eb5175ee367237340b41a46ef55353cf0e548c7"
    },
    {
      "file": "src/worldmass/countryOutposts.ts",
      "sha256": "249f743a8fdc91f7029de01ba336f547e0daa5479148d391fdacfcde869c33f1"
    },
    {
      "file": "src/worldmass/courtPuzzles.ts",
      "sha256": "427d0d9c3af6fb2211d6ca4f1814f428e86675daff04c3d863cee4062ffaab97"
    },
    {
      "file": "src/worldmass/dormancy.ts",
      "sha256": "41435e7f1892b5bbb6ca53b851e9c221039deba255fbd741c08ce2cb0e36dcaf"
    },
    {
      "file": "src/worldmass/ecology.ts",
      "sha256": "7fbd147049983079ec3e7fa8eba05c9a3fbef391a06c244a39f5c978698c67c0"
    },
    {
      "file": "src/worldmass/encounters.ts",
      "sha256": "772f9e3bfeb059142756cd3a5dda79daf4af9aaf1d5966a41b0935c4a19ff227"
    },
    {
      "file": "src/worldmass/fields.ts",
      "sha256": "9bcf0f9b651700d06588df3c3c7857f6b2b33863ec8e47f0eb67d4ebc23d07b3"
    },
    {
      "file": "src/worldmass/fieldSites.ts",
      "sha256": "90d2e3bb58fb66f5e93b740e55a60ff4a609f5ad3df5714b64666924d9e83c3f"
    },
    {
      "file": "src/worldmass/foci.ts",
      "sha256": "1af3e7119aaa27d261d58668f501e9be885d9155f512e1ab7b07461a8aabe8e8"
    },
    {
      "file": "src/worldmass/generator.ts",
      "sha256": "5221fa836d274d45842acf05764ff15b63cf13a80b49ae06b58c7e5d0a54e134"
    },
    {
      "file": "src/worldmass/geographicAccess.ts",
      "sha256": "5ec8cb9b1d27cd7a948b957907566dda85db1e1f0a07c8f486f011490db938d9"
    },
    {
      "file": "src/worldmass/geographicAccessCore.ts",
      "sha256": "8aa30125b22f112db4ceafb614e1790802d9bd910b5dffd31f6d9f3107fa0ec5"
    },
    {
      "file": "src/worldmass/geographicGameplay.ts",
      "sha256": "a96987cbd6f7ce738fd88261f8ad95bc377eef07bc23601260006e82e88b81da"
    },
    {
      "file": "src/worldmass/geographicObjectiveChoice.ts",
      "sha256": "0d7fb6a7af770872ab1cc9b0d4a083b10d4a3fd53733487de64bf0d26b9c0e3f"
    },
    {
      "file": "src/worldmass/geographicPlan.ts",
      "sha256": "747117363710c8bce888b68b61960febd78b751d5a560089b9ece95ccc9d64de"
    },
    {
      "file": "src/worldmass/geographicPlan.worker.ts",
      "sha256": "bc5aef182cb7e9bcb6e0cddad69ab9415d4861b23234174fb3970c0fbebbd2d6"
    },
    {
      "file": "src/worldmass/geographicWarm.ts",
      "sha256": "b69a5597d00af0c0f231a8266157bd8081a20e564731588f257471076aa13bb2"
    },
    {
      "file": "src/worldmass/ground.ts",
      "sha256": "7965a61e922a991b3a37f27d870b395c9026fec3a5d4588259b7b409484f6331"
    },
    {
      "file": "src/worldmass/hierarchy.ts",
      "sha256": "5fca8bfdfb59a74b948e4ce10669a399572fce63aab2a65cf36a8c373a625f99"
    },
    {
      "file": "src/worldmass/journey.ts",
      "sha256": "a9c1a1120214a84eb43d0752f4e3062b3e38cbf39776bc1c3ac0cdb01e6a38ca"
    },
    {
      "file": "src/worldmass/landformDressing.ts",
      "sha256": "3d6f093d6c78ef6810e842db9184e475febcca3f7328abdfd2dfe900dd62f492"
    },
    {
      "file": "src/worldmass/landformHabitats.ts",
      "sha256": "2e3753a60c7af6c78a428229860bcf05ddab26b5cc51af56267a33d2552cb282"
    },
    {
      "file": "src/worldmass/landforms.ts",
      "sha256": "758d7cb37c43ca851470b0cc386b318a88f459c1470fa48a192a6cb62a0e0b85"
    },
    {
      "file": "src/worldmass/landformSources.ts",
      "sha256": "4e0f1e12c72cb9af274ecfee1f4cfd99a318e1e51d0520b24b07e20ca5b42f61"
    },
    {
      "file": "src/worldmass/landmarks.ts",
      "sha256": "81a8c50a83e7b5dee764ba38a9e28c5c4e1ef352036dd8e82cdb855e6857d095"
    },
    {
      "file": "src/worldmass/mapLabels.ts",
      "sha256": "014924287fde0692dee2c173e7a867b38f0b015c74858952da560b785c1a6f30"
    },
    {
      "file": "src/worldmass/nativeArea.ts",
      "sha256": "030f50d35a01ba25a4ae4fb021180fad2f90ec2e43b8c11e024d989d0cf6a439"
    },
    {
      "file": "src/worldmass/nativeAreaActorAuthority.ts",
      "sha256": "996cf7e0d5fa3143a19f84a8b0493309f32e4aeeb9bcfb56bd39b2b762b5b05d"
    },
    {
      "file": "src/worldmass/nativeAreaAmbient.ts",
      "sha256": "8958fa9d804e9274a78da348fb1b739c3cd2ea8b94b99f9d4ddef3573759f1a6"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignFrameState.ts",
      "sha256": "7ebf9efdf43106afd63e5de905a7fb9baaa7c66d2edd68767c463099fe002c8a"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignInputState.ts",
      "sha256": "3e6a87d4fe45093cc3a4fa611e448e8a75258eb423e48630dc0c443bafb68f2e"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignOdyssey.ts",
      "sha256": "e6e79295b241b9081521a763bfd4b4f791feee1977c203fb877d06cce4ab7a5a"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignSession.ts",
      "sha256": "ad190cadf1e6b2ffac2f45bfdb1610a6d22f5b666ce8bfa3b8c953605b99e3ef"
    },
    {
      "file": "src/worldmass/nativeAreaCharacterCreation.ts",
      "sha256": "948788568ce35079894428f167efd9a3007bd8a93cec34367c70d3d5c2d57863"
    },
    {
      "file": "src/worldmass/nativeAreaCharacterResume.ts",
      "sha256": "f8d3c427ab217aa22f5506b7f927d9389facfc5ebc945eed01250be25673b633"
    },
    {
      "file": "src/worldmass/nativeAreaCombatOperation.ts",
      "sha256": "27e9ddd7257ea6a426c1e86337100d3dece79c94e4bcdfb8f38bc43726d08925"
    },
    {
      "file": "src/worldmass/nativeAreaCompiler.ts",
      "sha256": "2ed4723b99ccf43fb22a5e65e3c875bc691882e8792be7a1756888f74fd99489"
    },
    {
      "file": "src/worldmass/nativeAreaDirectoryView.ts",
      "sha256": "f721bd52508aaecf47fbbe6b8fdc4ed9d7b5960cef26a5f5c83951e8b1267fb1"
    },
    {
      "file": "src/worldmass/nativeAreaGeneration.ts",
      "sha256": "a4ea667f7034bf922b2419ad9e2eb7dd18ccd34f8b1b1ce9cece93ac772d6493"
    },
    {
      "file": "src/worldmass/nativeAreaGeometry.ts",
      "sha256": "7eff9475be05da3f37db09ba1240467b776c8f0e3314ae0e148befbd6997465d"
    },
    {
      "file": "src/worldmass/nativeAreaGeometryCapture.ts",
      "sha256": "764993077dc1323a6136d349909424ff48b2166eec42fbf4843fe20bc146473f"
    },
    {
      "file": "src/worldmass/nativeAreaHostedPresentation.ts",
      "sha256": "f998370e452d841ce24bcbb4994e0ab27452990b53e014f2a2c3ca21d59598a1"
    },
    {
      "file": "src/worldmass/nativeAreaHostedRoadSupport.ts",
      "sha256": "84d1e4c31a945246ef2aba40bde53ba0bd81f25e7da11e3f4073c48b87e97821"
    },
    {
      "file": "src/worldmass/nativeAreaHostedSnapshots.ts",
      "sha256": "c2ffa21d309b5a23c682437296cc28e91f7a66c109b73b56c93f12be5062a482"
    },
    {
      "file": "src/worldmass/nativeAreaInstalledSources.ts",
      "sha256": "ffb4473a907ed16699cc56157cbbd0790e9df189304985152bb3964394031c43"
    },
    {
      "file": "src/worldmass/nativeAreaLocal.ts",
      "sha256": "a792ecd8f35892643e1dfb9a7b3c73f07d30f6f8a8f65876935788b6f6d29ce6"
    },
    {
      "file": "src/worldmass/nativeAreaMaddenLedger.ts",
      "sha256": "d4c4af52349657f28dc993eee8fa93525931a6fa05c18404e2adc3fd9e131f61"
    },
    {
      "file": "src/worldmass/nativeAreaMemoryRegistry.ts",
      "sha256": "5f25299eb4fecf7ba3725e9ab34096fb080ea50300688ed497dc91f03729fb79"
    },
    {
      "file": "src/worldmass/nativeAreaMenuPublication.ts",
      "sha256": "7d8dfcd961e3500d18d77f3a17945e0cc99ca54fd117703ceaec7ba85b2112c3"
    },
    {
      "file": "src/worldmass/nativeAreaMenuQueries.ts",
      "sha256": "0798f04eb1336818ba65019904ab312796c563f52eb3c03bf530e24b8a10ef60"
    },
    {
      "file": "src/worldmass/nativeAreaParty.ts",
      "sha256": "73dfc90f36f5017a0456228b1486b8057c98fd325d05a7ab31efc8e34c520b5c"
    },
    {
      "file": "src/worldmass/nativeAreaPopulation.ts",
      "sha256": "9c48f01ef3b331b37c20bf4c6053baab7a49cf7041b35a9c0a123dd94e3be7ac"
    },
    {
      "file": "src/worldmass/nativeAreaRandom.ts",
      "sha256": "6959b4820a9064a000428bc05351e20ba1a9ba24884dcfba5a4579a5b9b6a15d"
    },
    {
      "file": "src/worldmass/nativeAreaRetainedLifetime.ts",
      "sha256": "c14a7f9f6e5a47a353fd5769adff117ce924803d28974faccc148e9ab6fc9b10"
    },
    {
      "file": "src/worldmass/nativeAreaRetainedMassState.ts",
      "sha256": "1534e40cedcfb85e34db4e43aa4586ad0c17d6074fdabb515975184d76d46296"
    },
    {
      "file": "src/worldmass/nativeAreaRoadContext.ts",
      "sha256": "7f346fe299f37915f7f167fb555e26d3ff71aa97eb52e0a7301f618b0438d96f"
    },
    {
      "file": "src/worldmass/nativeAreaRoadDestination.ts",
      "sha256": "b1ee42339d9e427dfecbf9bb247e84095291a0b84344ffa9a27be68465342f43"
    },
    {
      "file": "src/worldmass/nativeAreaRoadOwnerBridge.ts",
      "sha256": "2971b5c8095e3d2f32d40ac42f295758894d464472fe5b0e3a7b1caa2626636e"
    },
    {
      "file": "src/worldmass/nativeAreaRoutes.ts",
      "sha256": "816cd5ae3ec7a0e2613249edf7c4d8224a5c928d2a4654722fa8b3f57c2cfd33"
    },
    {
      "file": "src/worldmass/nativeAreaSceneAdoption.ts",
      "sha256": "1671411a56c952670f976cb44f9447ea973708838f2099f18edd22e839fbccba"
    },
    {
      "file": "src/worldmass/nativeAreaSceneAI.ts",
      "sha256": "7d62abff0033053749e6a95ad9d9dd4c3addacde10709d0c46bc5dfca850d6ff"
    },
    {
      "file": "src/worldmass/nativeAreaSceneArrival.ts",
      "sha256": "814d25d7204ba0264368c4dd6a48138a39ed5193c30f2c6ffc924df3a0f56dee"
    },
    {
      "file": "src/worldmass/nativeAreaSceneAssembly.ts",
      "sha256": "b8a01af11575b4aaa94f3dda4e7c70fa0aa112af2a95a3b2b92fe835d61eaec8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneBirthAdmission.ts",
      "sha256": "f57861a7169621f8e7d97954ea0239319cded4a1ac503ee236628aa253e26ad0"
    },
    {
      "file": "src/worldmass/nativeAreaSceneBoundaries.ts",
      "sha256": "d16db8ba409c99a8a38ef7ca4e917602d8b430fef57dd0a94ed3651de3927f52"
    },
    {
      "file": "src/worldmass/nativeAreaSceneBounty.ts",
      "sha256": "4676a1252420bfdc26d63f31c3439bcc46337ccc9189e500fcb37311b7bbeabc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "sha256": "d41081b0a47d5685b0196a13e05ad7c6e54e7993260ee8a45b21f1696a3cb4dd"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignTransitions.ts",
      "sha256": "876de07b4d4144218b487eb6f81ee0b59219ef6f3675a7f2498a7d7c563d08c1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCastingPreparation.ts",
      "sha256": "41641fc498db2f8a91dc3651df761d1a0a795b9cc441efbc790703b210a3f429"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCoast.ts",
      "sha256": "fbb907bf56bd0167d987f6e00f7abbd390f7b42684ad436bbad0bf435702a1d2"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombat.ts",
      "sha256": "0ab0527f0701e3f7decbf5373f2b2f6bde7b9f6cb8deefdaa668681f214c3f33"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatArena.ts",
      "sha256": "0b0ed820ac0c4c4d27b112120a0152a2438ad50768899decff7a4bfa67f5db92"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatCampaign.ts",
      "sha256": "bbb10b0c8add1846302a86fcffe18ce6788b13ae9116407b3a6414e771f34cc8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatControl.ts",
      "sha256": "b8e146d1bd13b872192e1372f906e9d4ac49930562de062e9d6f420c067f2ee0"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatFrameState.ts",
      "sha256": "d1dda3a88d82723f79eda2eb0de25c2cff62b8286e41996d1551d70fe826c240"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatRuntimeState.ts",
      "sha256": "ace08272541de1f6033dd8acc4517931b5eddbabf36335228c06447f63acd2b8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatState.ts",
      "sha256": "f2322f51665a2d1758846d6dfc6755b5a6ad357d3ae6261da2d1d7d9a9e174c9"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDefensePreparation.ts",
      "sha256": "9f7752d2ca28ca35eecbd87fd9f08f1d6975b09d732b353111541ab65b670ba7"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDepartureMemory.ts",
      "sha256": "a3468d1117fbee02e093732d6473e83b2e582ac41dbe5ca18b44c9ff6073671c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDescent.ts",
      "sha256": "4cd5a51ec5e78a868836092a78fd385a3355cf2136881e551a39fad0fec1bbea"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDirectory.ts",
      "sha256": "0df38cf6a2d412a8e6831497bd6e27dc9059ba1392e906faf56e1379523ec471"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDisplacement.ts",
      "sha256": "9be546cb6ceea3aeeb9b76c10d93395a543fead09d7837cfbb4267e267c4461e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEcology.ts",
      "sha256": "72f88c3f477777b2ce3b4b8fb14d2789aa20faf0ea80cb10b765611da3301ae1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEncounterArrival.ts",
      "sha256": "02723a38e782da0898642f2ed6dfa68752e9cd73506d6a6ae628aa946d15a134"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEncounterBirth.ts",
      "sha256": "cee1995a9eef8290cb12c393b47f3c20c216873676f0c064820abfdd44225520"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEnvironment.ts",
      "sha256": "1a4cd214a4eaae73dcdc66dee9af901c65374305491f3350bc6d299e909782d1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGeneration.ts",
      "sha256": "0e6a9bb545ca0cd51624766712a669872d1b1150fe0a9f94376e54ea691bae50"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGeometry.ts",
      "sha256": "33a6cc466df76e4ce143efd7c64e130547654e06bf1322fd8fad106d574a8759"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGraph.ts",
      "sha256": "44c29e35f3c45a6d6dcdfdda431f2dab4482d40a65ad2c15cd819c941e43b5b3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGroundFollowUps.ts",
      "sha256": "d717f24cc92a58befca3faaee25654a3ad60d7027411ddda02ddc3ec7864fe79"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHarbor.ts",
      "sha256": "413d4477d1261074a00fe1485257e9bfcd093f0da2a7801d4c6af2b50b4b66ff"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHarborServices.ts",
      "sha256": "61b77d432a9ad7d6a5d171c04df0ed71984e08e16c0912b3856f7327bd89606c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHistory.ts",
      "sha256": "a50a940bf79c1312c64300e49ace6e510f088561476a6bac8cc2e122d6f3810c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHistoryArrival.ts",
      "sha256": "83e1c6dc6d8c186454fc225e8386f96e9d4497294c9d8026a28d8cdb98875979"
    },
    {
      "file": "src/worldmass/nativeAreaSceneInput.ts",
      "sha256": "f57d4830f90b714ad655bb4f9ca86c97f9c1724ff4be60b912b8285f1f1f416e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneKillAftermath.ts",
      "sha256": "3bbf0db85f5a37ce0498c20fdbf30a2770ccdc649e967c8ad139f80ec05db81e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneLoot.ts",
      "sha256": "20a1f13b9f69fc1d00637a0f624d39fdfa3c6338a959674baeadcd99a9846e5b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneMemory.ts",
      "sha256": "28c15407649b2836ad049efd7844141e8fb1fa84a6422853fc594f10e8c927ab"
    },
    {
      "file": "src/worldmass/nativeAreaSceneObjectiveCompletion.ts",
      "sha256": "72f4bc77bf0781c6268772b02489b96d56c054534435c083405c72de1f3f917d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneObjectiveWatching.ts",
      "sha256": "8ce5e2a0b35130ecae73a7888e373c072e6b688b7e7cebc1cda1c2b1f0dce627"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOccurrences.ts",
      "sha256": "3a11b2e4deae636e9c58eae45d1acb8c0803d1496376ff76cae011a9c7030ecb"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOdyssey.ts",
      "sha256": "93fa861ffe0f76a63d5c6bec42bb7d6103638872a1c11e81e9f9872be3dca232"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOngoing.ts",
      "sha256": "c6dac7aa728afa7b99de222d045ed3b0ca9672e7478eda8223a40cc4fc7a9da0"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOpenings.ts",
      "sha256": "c58e9d65502b566e1b670eede8548ac36ec42a14027ce8d35702ac9d51ea9ae8"
    },
    {
      "file": "src/worldmass/nativeAreaScenePhysical.ts",
      "sha256": "6cc3620c78cd3a4352191a69b76de44e849a2b2e7add380acd21d981976cb9cf"
    },
    {
      "file": "src/worldmass/nativeAreaScenePopulation.ts",
      "sha256": "eb59eeb2000f37971138c59025a6830e0d8d89673bb6fc790cce9d68807e655e"
    },
    {
      "file": "src/worldmass/nativeAreaScenePreparation.ts",
      "sha256": "7b154527e1334a0fa86ece835d12aba9441f1460163fc32f19c7f348cfca0269"
    },
    {
      "file": "src/worldmass/nativeAreaScenePresence.ts",
      "sha256": "a3943c073e5b25584deb35c68abddc3f2583871a09327e158d54224f6053dfdc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneProgression.ts",
      "sha256": "4d3ed7c3485e1be22f94ca33ef358e4a983b1c6d834763a91f0034fffb492398"
    },
    {
      "file": "src/worldmass/nativeAreaSceneProjectiles.ts",
      "sha256": "3e7d3c68aa759ab684cc7a54daf04ceaed3224836d6ae79f693acfc3696e8326"
    },
    {
      "file": "src/worldmass/nativeAreaScenePublication.ts",
      "sha256": "4e3a89a32e43cd739048fa038cfe3a956c7699093d9436175da70d35f3cee005"
    },
    {
      "file": "src/worldmass/nativeAreaScenePuzzles.ts",
      "sha256": "b14da7232808be17a11e992dafcc25edfacb81e753792b861916f9c73852fc7d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneQuestInteraction.ts",
      "sha256": "2eb07f46cd126ede8b450fd09d2e470cae8250ff9e098ae35d5f808e9144e26a"
    },
    {
      "file": "src/worldmass/nativeAreaSceneQuests.ts",
      "sha256": "256d866e6dc676a40ad7b441c8b9f37b7aa87961496b8be04c2b42be08fcc386"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRestoration.ts",
      "sha256": "6dad4f083121db8403ab07e552287d561a0c75eaeb1e7ca6f0f62017e8704ede"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRewardStorage.ts",
      "sha256": "428430cf9f3071ff0901183f9813ac77b30ca268b66f7522a5515174388dcb61"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRuntimeBirth.ts",
      "sha256": "9d07ecfac12b25ab969633a9dd18e1d02adfec25bfd73a0fcd07c1be449e228c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRuntimeRegistry.ts",
      "sha256": "825243773999808629b196079c8b05423363eda44e1d25235177e5f991a45b54"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSettlement.ts",
      "sha256": "96ce150c0bf0f32076d2483d7b770a65827321e52dc2f1d3266769f2f8a7bce8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSiteBirths.ts",
      "sha256": "c3a28edea2cdea051a58c5fee3f776c984f4175a85933b7a58c235310c429f4a"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSites.ts",
      "sha256": "c1db856c7e8d0aeb23ba5de60934691244284fe72aa9d646b56fee88678bd1ad"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSky.ts",
      "sha256": "b000054c92fb87a1e5ce24ed10f8f426c85e2d9569d54568a15f6ab442fdbfaf"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSummonPreparation.ts",
      "sha256": "ecbf3c4443c5be25f988cd442cc19835bf69df865fbb4d1e7ab6edfee8217b7b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSurfaceArrival.ts",
      "sha256": "433fe020fee3f5e21781e0cd35108180f97b3fdcc4e2d5cca589d100bfebb7fc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTethers.ts",
      "sha256": "9ebb17d28f352d0365e597b50e655bd956d58283cc3cd617d81728c3b6fdcb22"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTheater.ts",
      "sha256": "4abb057d32789b6bad0c32747327a5fb46ed810fcf8f3adbfee0f9852edd8de3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTitans.ts",
      "sha256": "661cc7809e6b76d61f29e97aae62e0d9dfa55577f2f8cdcfdfe599de97da7387"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "sha256": "34f9d2a5f15856615bb8868f66c5b1cbe82f1b2fe9f7fb2b61e5a311fc618600"
    },
    {
      "file": "src/worldmass/nativeAreaSceneWarlordArrival.ts",
      "sha256": "71f785557b1e80f281727f3fc3df8ac33308639a8555395f75ddfde03321b245"
    },
    {
      "file": "src/worldmass/nativeAreaSeams.ts",
      "sha256": "64a94560def33c8c753e7d34656a66cc3dbf8a234cbaadbced8ec3d4d8840224"
    },
    {
      "file": "src/worldmass/nativeAreaServerSeats.ts",
      "sha256": "5bc7af33daf436e106190c4759d320a81e38a856c5cd894b47b814d9977d70eb"
    },
    {
      "file": "src/worldmass/nativeAreaSourceSession.ts",
      "sha256": "e14a95699ce2b8a3d351f8f8854a72016a91066664b3cfd492afc87811dd4731"
    },
    {
      "file": "src/worldmass/nativeAreaStorageClaims.ts",
      "sha256": "c740ef289985192bc9a1bbc8159881418c3ab79faacb2b58b3965af4d3e3b113"
    },
    {
      "file": "src/worldmass/nativeAreaTimeflow.ts",
      "sha256": "69cbb3db86d025883387077d41256224c3c12fe5116105a5093979979d94974b"
    },
    {
      "file": "src/worldmass/nativeAreaTownStationRefresh.ts",
      "sha256": "9ce1f0b745e1b3087d047ac012aee20167c4a9fe506458a1fc3bc5ac0cd9bed4"
    },
    {
      "file": "src/worldmass/nativeAreaTownStations.ts",
      "sha256": "45dbd46cd4cdc7ce950d0627cba2001effe0d3b807c214bf05043c1599b67a76"
    },
    {
      "file": "src/worldmass/nativeAreaUIActions.ts",
      "sha256": "5b4477c566463ec9f1fedca01d60e71030d47bcad3a829744c7eec07e18073fb"
    },
    {
      "file": "src/worldmass/nativeAreaViewQueries.ts",
      "sha256": "f42ab210a60d01b4ebb2ccb70ef0550a5800089c896fb943280c62218c6c11bb"
    },
    {
      "file": "src/worldmass/nativeBootstrap.ts",
      "sha256": "0176c6264791d183336842df29c0d4df22965d6688c78c2b6445836df73b5619"
    },
    {
      "file": "src/worldmass/nativeBrittles.ts",
      "sha256": "6fe4a2c7e22a44f5d7ca61b760b6d3ff5246c4bf5944bfa72ac80f7a83540dc2"
    },
    {
      "file": "src/worldmass/nativeBrittleSources.ts",
      "sha256": "54654c3adcb3b08677c3434d2c33d1ea3cf47b6c84903410aaaeb230f4eb9517"
    },
    {
      "file": "src/worldmass/nativeClientContinue.ts",
      "sha256": "6f8cb1024fa243d53e96e2d607277a08b8b01a9d44aaf3e9b9328fdc7caddf60"
    },
    {
      "file": "src/worldmass/nativeClientRuntime.ts",
      "sha256": "ec9b1181b6d6b5fbd2ada9d59fd62373e3555e043185cc92712e57096386b4fc"
    },
    {
      "file": "src/worldmass/nativeClientStart.ts",
      "sha256": "897f671f598fbd8955fef5416c9507048d1fc01ef29fcc3cb8b1f53e5899c7d1"
    },
    {
      "file": "src/worldmass/nativeCompile.worker.ts",
      "sha256": "01403485027d62f09ece1fcad77b282bc5cafff427553ef89def1575fa64f337"
    },
    {
      "file": "src/worldmass/nativeCountry.ts",
      "sha256": "aa2fe9139750092a3e236d68a2c1473f4096f5ecfd061007b505534c42f46c94"
    },
    {
      "file": "src/worldmass/nativeEffects.ts",
      "sha256": "aa5af06d05ac593aa6e14e386df27a88351308f11cb5b8b640292d76f4c61e11"
    },
    {
      "file": "src/worldmass/nativeEffectSources.ts",
      "sha256": "a412ab330e09d87a9b8b48a5f5226e54ab80ce33cda7b5a919149acf3782dfc0"
    },
    {
      "file": "src/worldmass/nativeFeatures.ts",
      "sha256": "8649b18d6e0ce3411480823ee9578904829f376575275a297bc2311c3628f29d"
    },
    {
      "file": "src/worldmass/nativeGeneration.ts",
      "sha256": "4246a81a582ed07f20ccb0af51c8644e3904a828eb06781770d1eee9fc937a66"
    },
    {
      "file": "src/worldmass/nativeGeography.ts",
      "sha256": "95f80056a0d998250867072edfd4f02b4cfcdaf1bede59a8ee7da72fd65581f9"
    },
    {
      "file": "src/worldmass/nativeGeographyCatalog.ts",
      "sha256": "5474f5216c43f8eabfac2ea6f08641534dddf3f2eb66ff71be8ae7abc3c766f5"
    },
    {
      "file": "src/worldmass/nativeHost.ts",
      "sha256": "0f046a8aa8c8849dd04ed285ff53a77ef4260ec3c33146565e3cd4b06a4bb496"
    },
    {
      "file": "src/worldmass/nativeHostedSerialization.ts",
      "sha256": "61aefc92bad3b5e36f1c1b47bf57f2b71c754af212104a7f812a69e9a7982e5c"
    },
    {
      "file": "src/worldmass/nativeOdysseyGroundRefresh.ts",
      "sha256": "c22a63aa08f71c65f94be3f59f680ad18b3006bb9baabc17d58a3651df7c3901"
    },
    {
      "file": "src/worldmass/nativeOdysseyGroundRegistration.ts",
      "sha256": "d0422bc069ec5942d4694c2fcfe11a81b1221c4ceb6a817477547b91df9425c8"
    },
    {
      "file": "src/worldmass/nativePaging.ts",
      "sha256": "f542fd9c0a168c38ddcdee1941f0bfb9d379fef2c1e3eb9ceb99bb80373b4110"
    },
    {
      "file": "src/worldmass/nativePreparation.ts",
      "sha256": "458760942f1aa1dfe5c83459e5bc383f82ba7abca213fc4e23a44def74470c8d"
    },
    {
      "file": "src/worldmass/nativeQuietAnatomy.ts",
      "sha256": "67351b14a30e0bed6bb2d659deb78644948e5a82b4633c5a95cda20ba97d0afb"
    },
    {
      "file": "src/worldmass/nativeRegional.ts",
      "sha256": "215ba0e41c431d6aa437a96dcee8c2d70d59bd19e14451b07fdda1a25ba8af4f"
    },
    {
      "file": "src/worldmass/nativeRegionalGeometry.ts",
      "sha256": "68538f84272e2d0804a6f06af5d395996a6529fcf35b0a551d9bbf28f6cd7276"
    },
    {
      "file": "src/worldmass/nativeRegionalSeating.ts",
      "sha256": "50a0e99d2d892be3a86fd8fb9ad1ad977f8d5439f6bff5757f8c4e04aee976b0"
    },
    {
      "file": "src/worldmass/nativeRegionalSources.ts",
      "sha256": "830a1ecbdbb55a8691f30de1059aba7208a89498745b0be9b365e4a636ddbfa3"
    },
    {
      "file": "src/worldmass/nativeResidency.ts",
      "sha256": "1fa3c7cffb1bdd809132dd9c2f8613f847c665ae77402c843d0a8369fcf1ec43"
    },
    {
      "file": "src/worldmass/nativeResidentSession.ts",
      "sha256": "c26bef7c238afafce0fdda078faf3471d5346e20fc97541803cb41291d728170"
    },
    {
      "file": "src/worldmass/nativeRetainedSave.ts",
      "sha256": "2afef135cd3b5a3ab52eae8353dec2b0d45aea8cb3b2984f53e3bc74daf823c9"
    },
    {
      "file": "src/worldmass/nativeSceneBirthComposition.ts",
      "sha256": "6453ceaf063810e33e2616d3e8bf3b5fc63f2aa87e113c831eaed7cdeb99b024"
    },
    {
      "file": "src/worldmass/nativeSceneObjectives.ts",
      "sha256": "572adc6f7e924bd11dd8d1bf5a0cfe2423b29f0ed44564b575fffcd26da4988f"
    },
    {
      "file": "src/worldmass/nativeSceneState.ts",
      "sha256": "1d976ea8b5599d2b2d385db722329a62e7a8b3d2d48749b92b18a4667ce44611"
    },
    {
      "file": "src/worldmass/nativeSidezoneFurnish.ts",
      "sha256": "22491c051e87c4153e26fa13f4cdbdb96609889254597245100be979a0bd201d"
    },
    {
      "file": "src/worldmass/nativeSubstrate.ts",
      "sha256": "f7c0815c2279e715bd6035e3c477175b1d05f23b977a4fb9a12b8ab1219d152e"
    },
    {
      "file": "src/worldmass/nativeTownBodyLedger.ts",
      "sha256": "6d2d4f17ecfe807a7835cee94cdb0e05e20f5e253bcc6971147d7126d1d32d90"
    },
    {
      "file": "src/worldmass/nativeWarm.ts",
      "sha256": "577ad70bacdfe1e8f96b8fc1576246c481658a4a434731efd00c4542ae3c6af5"
    },
    {
      "file": "src/worldmass/noise.ts",
      "sha256": "2b0f2e6e7f81d43ea68957624ad7e4bcefa808194b9805d7fdb6ff10b485b903"
    },
    {
      "file": "src/worldmass/objectiveBodies.ts",
      "sha256": "960969361d0786ed1a0eff08f796277c35db31704274ccb91b989b62eca8d629"
    },
    {
      "file": "src/worldmass/objectives.ts",
      "sha256": "723b7d6937cc3fe1d74a53e9463bbd719c2397d36d60192cb0ff113c8ecab52e"
    },
    {
      "file": "src/worldmass/occurrences.ts",
      "sha256": "45b78853b8d14e86fa91352db71b746f7fdcc1601c72b0363e9a45b7fc4b6ec5"
    },
    {
      "file": "src/worldmass/origin.ts",
      "sha256": "bf6d85698c184eb5a77c27d855d232934b562930df10bb3d807df824e3cd219d"
    },
    {
      "file": "src/worldmass/paint.ts",
      "sha256": "27f48d99deecaccff1f934614e60efe2f85f671bb829c902bfb6761cf37ff591"
    },
    {
      "file": "src/worldmass/patchReservations.ts",
      "sha256": "28f075d64f20e07f1e8e48b5d94c674cf84653327edb94e0f65fcfb0b9bafbdf"
    },
    {
      "file": "src/worldmass/physicalIntel.ts",
      "sha256": "d4887ced42f4c252086b3f9e41ab8f12de5608078283c25b718cdcdcf4c135c5"
    },
    {
      "file": "src/worldmass/population.ts",
      "sha256": "985780d4c5f3cba42c8b901a04c9395150456d792fd2f7114e418f2470814139"
    },
    {
      "file": "src/worldmass/preset.ts",
      "sha256": "253aba1e57f627781c24ff1795c4d2a4b5ef32c2952ff27b673fb6bdd7930134"
    },
    {
      "file": "src/worldmass/processionGameplay.ts",
      "sha256": "0b87415aef988131cd0e866ea520c6c6120de288953e95019c898f5e7e84a5eb"
    },
    {
      "file": "src/worldmass/processionPlan.ts",
      "sha256": "da9c71520f326c0b72281b620bd3392d274c81caf563aa875ad4ec7aa4ec1bc8"
    },
    {
      "file": "src/worldmass/processionPlan.worker.ts",
      "sha256": "6174c9d9e1d74e5fa0337df750a09af4e940ab464ff0e264cfc75e9c40ccbf02"
    },
    {
      "file": "src/worldmass/processions.ts",
      "sha256": "39189fc56278b78e495a00d7f3580caff8a998a1feaff1d20d77964d71303f68"
    },
    {
      "file": "src/worldmass/processionSources.ts",
      "sha256": "16c7403567f45dff2d9dd7ccf92790f1e4b330d7ade88cbcb9047774435d6ce0"
    },
    {
      "file": "src/worldmass/processionTypes.ts",
      "sha256": "ddca721e57ba9b05b145890d5e2aa0c5a728b7a3da7ee201a85e097f487a1a87"
    },
    {
      "file": "src/worldmass/processionWarm.ts",
      "sha256": "f440df0f7673bfc70bc3f697611c25dd58128caa616dce86d5d524752ad7dd24"
    },
    {
      "file": "src/worldmass/progression.ts",
      "sha256": "729404dd54c7282ac65e293f054d8b19c8e3ae9b8244971906f50b82a73a672f"
    },
    {
      "file": "src/worldmass/puzzles.ts",
      "sha256": "e11bd12a9bb4ec5a6af5effeefb744cf37f6a652cf5cb8475191f073ef8eddcc"
    },
    {
      "file": "src/worldmass/quests.ts",
      "sha256": "6965103781c7cf2c5ccf1e102d16f37738ccf028a7d410200f45975a8d16dc8d"
    },
    {
      "file": "src/worldmass/random.ts",
      "sha256": "4a2a5d79ab39ed752804d7142a368f0e66f8526014128a2802d0dd2e6daf650d"
    },
    {
      "file": "src/worldmass/rebase.ts",
      "sha256": "f7daa31d4b7d93a2e2263ce904dcc9eaf150dd95dff88203b720020c1478fbd4"
    },
    {
      "file": "src/worldmass/regionalCourtShapes.ts",
      "sha256": "4a3e69089291b3ff47eaf900d25c7b3e76a79b6d42f63e935eddab5a01432eef"
    },
    {
      "file": "src/worldmass/regionalDiscoveries.ts",
      "sha256": "129605b7f6e20df3735412485cc27a8c39e2f46f22df83b7f51085a8a1c98b8f"
    },
    {
      "file": "src/worldmass/regionalDiscoverySources.ts",
      "sha256": "b23676ef391b09bcc692f99fadc62075573b3f4779492970119eab89cff96a0f"
    },
    {
      "file": "src/worldmass/regionalLandformComposition.ts",
      "sha256": "66f671565085c71dbf3869c9e1f0eb8474bf5ba61dd3757164bba149bed3eafb"
    },
    {
      "file": "src/worldmass/regionalLandforms.ts",
      "sha256": "275f10fae28f621eb9fb6be399ccbbefc57ff127d00facee1a19a4b00c8df929"
    },
    {
      "file": "src/worldmass/regionalLandformSources.ts",
      "sha256": "571beacd868c2e9e1cf31a9ebd5a634364eaf8e32e65f86da066b73e95eb9b9a"
    },
    {
      "file": "src/worldmass/regionalMotifSupport.ts",
      "sha256": "b73550976d6689f871b5eb0c8ba8e5ebf5eccbcc0c587ed468b141d0fa72e2b2"
    },
    {
      "file": "src/worldmass/regionalPathWeave.ts",
      "sha256": "f841283e2342d803205261e3a6e7c06911147cdec86d917f399093118648bf36"
    },
    {
      "file": "src/worldmass/regionalSites.ts",
      "sha256": "b3ad3c7e2e7d8b6a3a5729b537f2110f75065f48ec29172ed44111a6f8787338"
    },
    {
      "file": "src/worldmass/regionalTerrainFootprint.ts",
      "sha256": "47816fdd40ebc7fedcda6736b271a1ee5a4a3baf3857cda087e71315cd17fcc3"
    },
    {
      "file": "src/worldmass/regionalTerrainGrammar.ts",
      "sha256": "1004d4b3fcb8021eb24d21006e71d120198215e333355a50b7d728bc7172eb3b"
    },
    {
      "file": "src/worldmass/regionalTransitions.ts",
      "sha256": "6b332adb5c2abfa77a62fa0d5289a6980f25376ad7fce723bc65ac7c8de46333"
    },
    {
      "file": "src/worldmass/regionalWeave.ts",
      "sha256": "decb7fd67489992b96f60480f3439f16e3884e36dafd902c434a62ed4e731aa1"
    },
    {
      "file": "src/worldmass/regions.ts",
      "sha256": "d9d0d17ba192e765064011969174d447b878f29fbf02a8f918bcf2f6d1b96e46"
    },
    {
      "file": "src/worldmass/rewards.ts",
      "sha256": "44c48237f0f0f734572a6ac3ff52328e5e44182ccd41867f80c02a084376dfdf"
    },
    {
      "file": "src/worldmass/roadGuide.ts",
      "sha256": "79dfbc5541d66ec866b9295739dd7a7318e336a3819504f2bc43c69f2c38d295"
    },
    {
      "file": "src/worldmass/roadside.ts",
      "sha256": "dee68addde048fd5d118a6c7159baa64e34a8b7cb3df679be0661ef566a3342c"
    },
    {
      "file": "src/worldmass/runtime.ts",
      "sha256": "534c05f110108ba8853c8b884dcab2c1b5af288f109b52d705626ae29b35be7e"
    },
    {
      "file": "src/worldmass/sanctuary.ts",
      "sha256": "007df8e3cda66564f90a18acb3d63f2e3ac9adc264e1b41512ef1aa4f43dd4ea"
    },
    {
      "file": "src/worldmass/settlement.ts",
      "sha256": "fdd088db438d750eb0848e8b2bd9cc5999f53292565318c7accb59b7dfff2a31"
    },
    {
      "file": "src/worldmass/settlementDefenses.ts",
      "sha256": "2a67647a77d7a9f2fcdc078165d8d832a9bf5c5e3e14ea6c7c666f21cdfd76b0"
    },
    {
      "file": "src/worldmass/settlementExits.ts",
      "sha256": "56247b5d6aed929ed29ac4e1e2f2538b0809e933ac36e3ebf7c4fe29e4dee022"
    },
    {
      "file": "src/worldmass/shrines.ts",
      "sha256": "ba596b7253eb43ac7513f320ce81a99c665c2df8e56b689daa996418846bcf5c"
    },
    {
      "file": "src/worldmass/sideareas.ts",
      "sha256": "fd2cfedcbaf7a27e7567e49b051b1082195187df63a0a9817bb0ce0ba1c98385"
    },
    {
      "file": "src/worldmass/sites.ts",
      "sha256": "630d47c5a64764960393929df8d6605dcb859bcc059798761672af2b2f756d93"
    },
    {
      "file": "src/worldmass/snow.ts",
      "sha256": "6b650db6d122d755ff0aa3a75c7b6b5bfb0ee99a9b6f5f1887d979fdf8d3fa55"
    },
    {
      "file": "src/worldmass/state.ts",
      "sha256": "0d647a2b9b7e1499f8ea5b689bae5ebf95b00d582f0977040b19258bad9bb71c"
    },
    {
      "file": "src/worldmass/storm.ts",
      "sha256": "e52baf5cedab0af276a56f575809daaefda428200439a047ea6530f1cd3201b4"
    },
    {
      "file": "src/worldmass/stream.ts",
      "sha256": "3558668eeaea5d68e86dfab75f09310f4e97944cb4d6e9ff023754fbd52d2f8e"
    },
    {
      "file": "src/worldmass/surfaceDetail.ts",
      "sha256": "f5538c71867c0ed443fc371c352b3b992b70fff05dfd132bcea8fca382a14012"
    },
    {
      "file": "src/worldmass/survey.ts",
      "sha256": "62eced879745c4b55d33ff7d88a4dfe92e7cf7bbff2ee849b124dda51d8a7cae"
    },
    {
      "file": "src/worldmass/terrainPatches.ts",
      "sha256": "edddba13ad15c8cf74b8d8588cbfd0e3d5abf87376d26f977f5c7e9c83e8bceb"
    },
    {
      "file": "src/worldmass/territory.ts",
      "sha256": "46f0ab1925bc31e379c2f64b5b364c5594f7d2a57be99ed96dfbd5d83203e272"
    },
    {
      "file": "src/worldmass/trailWear.ts",
      "sha256": "0866ba6b98e1b94995e9e9f61f601ac9f90135dbda33e442584aa9bde3e94a80"
    },
    {
      "file": "src/worldmass/walk.ts",
      "sha256": "2b36301cf112ba33bdd62abe54553cd77e1aa52fdf0886f8b9e8499bf2f46979"
    },
    {
      "file": "src/worldmass/weather.ts",
      "sha256": "b21cd5089fe25eafb460173e62deee989527dea46c5e717a27075708180ed095"
    },
    {
      "file": "src/worldmass/wildernessPaths.ts",
      "sha256": "502a6da69276edb649aca7be78a346608236ddc40d20095f33c6f4b957339ee5"
    },
    {
      "file": "src/worldmass/worldContexts.ts",
      "sha256": "9b1c08ae45135e4a168d937ce1d2a4973b9719ee6f33981fc5f3f6d43292f13b"
    }
  ],
  "accepted": [
    {
      "lane": "admission111",
      "file": "balance/probe_nativebirthadmission.ts",
      "sha256": "5b1b6108ac36f5560a68b3460d5a9553c59ce8c735eac0dc636a2a9adcf5a894"
    },
    {
      "lane": "anchor115",
      "file": "src/engine/questRescues.ts",
      "sha256": "9997eb09e1f6cccc85512d385def7a170788a139060b5e4f9e9ac93bd45acba7"
    },
    {
      "lane": "anchor115",
      "file": "balance/probe_nativerescueanchor.ts",
      "sha256": "00c105fb2a72d486fb70fd31cad6ae63509dd6cdc5eca806766a6f5edb685330"
    },
    {
      "lane": "anchor115",
      "file": "balance/nativeRescueAnchorArchive.ts",
      "sha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
    },
    {
      "lane": "anchor115",
      "file": "balance/nativeRescueAnchorFixture.ts",
      "sha256": "a77badbb928f8764a7f6f76d9a2e1b26deae78ff7d8873d7c4b533896230f068"
    },
    {
      "lane": "anchor115",
      "file": "balance/probe_nativerescueanchorsource.ts",
      "sha256": "1f7b28ce1fac45c57920e6a993b0216266fcdf27a38c52bdb334a1ad8d5938ca"
    },
    {
      "lane": "titan112",
      "file": "balance/nativeTitanReceiptArchive.ts",
      "sha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
    },
    {
      "lane": "titan112",
      "file": "balance/nativeTitanReceiptFixture.ts",
      "sha256": "e8f0355c26390078b85fcad2a47ea716347a2d465963d995d425a9a8e17961b2"
    },
    {
      "lane": "titan112",
      "file": "balance/probe_nativescenetitans.ts",
      "sha256": "94255df3bc2dc45a81cf4ad92803a66f61f39410830c192d420b1726b43309f0"
    },
    {
      "lane": "titan112",
      "file": "balance/probe_nativetitanreceiptsource.ts",
      "sha256": "f15111d67a11ad07b322cc07835be8682a121e8d420727f86d20c744b96f9b24"
    },
    {
      "lane": "titan112",
      "file": "docs/worldgen/native-titan-receipt-parity.md",
      "sha256": "4f6d0f31ce70df42b00d8a780e4daf9cb1ecb1a13ec67653e6556562bb6eedf1"
    }
  ]
};
