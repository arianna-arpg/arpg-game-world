export interface NativeCaravanSourceRow {file:string;kind:string;beforeHash:string;afterHash:string;rawBeforeHash:string;crlfLines:number[];edits:{before:string;after:string}[]}
export interface NativeCaravanSourceArchive {parents:{role:string;input:string;files:number}[];rows:NativeCaravanSourceRow[];readers:{file:string;beforeHash:string;afterHash:string;assertions:number;assertionHash:string;compatibility?:string;edits:{before:string;after:string}[]}[];priorArchives:{file:string;sha256:string}[];reviewedTargets:{file:string;beforeSha256:string|null;afterSha256:string}[]}
/** Exact reviewed caravan reversal plus complete unchanged reader predecessors. */
export const nativeCaravanCompositionArchive:NativeCaravanSourceArchive = {
  "parents": [
    {
      "role": "runtime predecessor",
      "input": "4d2323e86df9ef606ead3fd2a3b9db0aa604d2fd1c4b9974d5711186cb5cb858",
      "files": 3322
    },
    {
      "role": "reviewed caravan and reader predecessor",
      "input": "8c601cd0f899344d29a75be28264b19bddb6f257885dd4b61c6af0321443466a",
      "files": 3326
    }
  ],
  "rows": [
    {
      "file": "src/engine/world.ts",
      "kind": "runtime",
      "beforeHash": "478aac8f8027bf44acd6575b03177cc0c68bbfc04fac1366763f17ad5276b092",
      "afterHash": "653eefaa6b22c334e7f670e05aa1b5c8184d1c51fe3c3341b5d2b3b52c1f7f70",
      "rawBeforeHash": "478aac8f8027bf44acd6575b03177cc0c68bbfc04fac1366763f17ad5276b092",
      "crlfLines": [],
      "edits": [
        {
          "before": "      get nearestHand(){const fn=world.nearestHand;return(...args:Parameters<NativeSceneObjectiveWatchingHost['nearestHand']>)=>fn.apply(world,args);},\n      get objectiveCountable(){const fn=world.objectiveCountable;return(...args:Parameters<NativeSceneObjectiveWatchingHost['objectiveCountable']>)=>fn.apply(world,args);},",
          "after": "      get nearestHand(){const fn=world.nearestHand;return(...args:Parameters<NativeSceneObjectiveWatchingHost['nearestHand']>)=>fn.apply(world,args);},\n      get notice(){const fn=world.notice;return(...args:Parameters<NativeSceneObjectiveWatchingHost['notice']>)=>Reflect.apply(fn,world,args);},\n      get objectiveCountable(){const fn=world.objectiveCountable;return(...args:Parameters<NativeSceneObjectiveWatchingHost['objectiveCountable']>)=>fn.apply(world,args);},"
        }
      ]
    },
    {
      "file": "src/engine/nativeSceneObjectiveWatching.ts",
      "kind": "runtime",
      "beforeHash": "ba59f13393efacd339567b75694c62d58aa368c4f8ecb4c46230bd65b2c05620",
      "afterHash": "fd3dd3eb012531bff794f1a93837db7e4cc7e9efe1821d57101f8bd17ded78c0",
      "rawBeforeHash": "ba59f13393efacd339567b75694c62d58aa368c4f8ecb4c46230bd65b2c05620",
      "crlfLines": [],
      "edits": [
        {
          "before": " isPresentLocalPlayer?():boolean;\n actorById:World['actorById'];",
          "after": " isPresentLocalPlayer?():boolean;\n notice:World['notice'];\n actorById:World['actorById'];"
        },
        {
          "before": "        const state:NativeProcessionState={...pr,enteredAt:host.zoneEnteredAt,done:host.objectiveDone,lost:host.objectiveLost};\n        driveNativeProcession(dt,state,nativeProcessionConfig(o),{",
          "after": "        const state:NativeProcessionState={...pr,enteredAt:host.zoneEnteredAt,done:host.objectiveDone,lost:host.objectiveLost};\n        let justLost=false;\n        driveNativeProcession(dt,state,nativeProcessionConfig(o),{"
        },
        {
          "before": "          spawnAmbush:(a,h,n,c)=>host.spawnProcessionAmbush(a,h,n,c),\n          wreck:cart=>host.dropGemAt(cart.pos),lose:()=>{host.objectiveLost=true;},\n          win:()=>host.completeObjective('The caravan arrives — the road held!'),",
          "after": "          spawnAmbush:(a,h,n,c)=>host.spawnProcessionAmbush(a,h,n,c),\n          wreck:cart=>host.dropGemAt(cart.pos),lose:()=>{host.objectiveLost=true;justLost=true;},\n          win:()=>host.completeObjective('The caravan arrives — the road held!'),"
        },
        {
          "before": "        Object.assign(pr,progress);host.objectiveDone=done;host.objectiveLost=lost;\n        return;",
          "after": "        Object.assign(pr,progress);host.objectiveDone=done;host.objectiveLost=lost;\n        // The original loss speaks after wreck effects and the cleared cart id.\n        if(justLost)host.notice('The caravan is lost — its bounty with it.', '#d05050', 16, 'events');\n        return;"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneObjectiveWatching.ts",
      "kind": "runtime",
      "beforeHash": "f74fa3cbf9c0faaf2e081b2f79e3415a63bc426b2698ea7177d84a1483e9fcdb",
      "afterHash": "8ce5e2a0b35130ecae73a7888e373c072e6b688b7e7cebc1cda1c2b1f0dce627",
      "rawBeforeHash": "f74fa3cbf9c0faaf2e081b2f79e3415a63bc426b2698ea7177d84a1483e9fcdb",
      "crlfLines": [],
      "edits": [
        {
          "before": "  methods(()=>input.objectiveServices,['countedEnemies','objectiveCountable']);\n  methods(()=>input.completion,['completeObjective']);methods(()=>input.loot,['dropGemAt','ownSpoils']);",
          "after": "  methods(()=>input.objectiveServices,['countedEnemies','objectiveCountable']);\n  Object.defineProperty(host,'notice',{enumerable:true,get(){const p=input.objectiveServices,fn=p.notice;return(...args:Parameters<Host['notice']>)=>Reflect.apply(fn,p,args);}});\n  methods(()=>input.completion,['completeObjective']);methods(()=>input.loot,['dropGemAt','ownSpoils']);"
        }
      ]
    },
    {
      "file": "balance/nativeArrivalCompositionFixture.ts",
      "kind": "reader",
      "beforeHash": "4426810acbd5ac0ee999f0a01c9121d550bb069d6ca490c74992643a6dc0aa41",
      "afterHash": "c73e2456376d7edfb8890f9d580f49f89077e59feddd3737d2dc0c7385b0e706",
      "rawBeforeHash": "1c910a3711a12da0a2f62b7a0f8efe16d2d7f1d5f25aec27842667f7c53f8ad3",
      "crlfLines": [
        30
      ],
      "edits": [
        {
          "before": "import fs,{readFileSync} from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs,readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_anatomycues.ts",
      "kind": "reader",
      "beforeHash": "2c2497a86fbe4549ff02a82114d2704a2364885b44bdef07d530b0536ea4a3ea",
      "afterHash": "2f1f17c76a829ac4b232c97833760ea591ea21d7ab48b5e71d1313a53cbe8b30",
      "rawBeforeHash": "2c2497a86fbe4549ff02a82114d2704a2364885b44bdef07d530b0536ea4a3ea",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
          "after": "import {mkdirSync,writeFileSync} from 'node:fs';\nimport {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_bodyvoices.ts",
      "kind": "reader",
      "beforeHash": "b7e545045556ecc40712d59cd3730245f3e814938a9e214ec0d86f336af5ad1e",
      "afterHash": "ef164e9e8d943f478ffeb766e06780c0fcbc4efafa58d16ffc0b015e273574ea",
      "rawBeforeHash": "b7e545045556ecc40712d59cd3730245f3e814938a9e214ec0d86f336af5ad1e",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_combatreadability.ts",
      "kind": "reader",
      "beforeHash": "4af612bce2e1f9c6209ffbfc2ef8272a619487a10237f9c38055f59f263fc071",
      "afterHash": "ab05c31003c6513e1f4b0ac795a53ea3fe31ac2cc6749f22f4d63c82ca0037d7",
      "rawBeforeHash": "4af612bce2e1f9c6209ffbfc2ef8272a619487a10237f9c38055f59f263fc071",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_companioncues.ts",
      "kind": "reader",
      "beforeHash": "f1cf75ad3be66da265ca838d2852fb938c56aaf7421eeb5c9f939b4cd5767037",
      "afterHash": "d8b0651179647f2c0ed6624dd02865eb93df46f2f9ff9c0d3235352af546997a",
      "rawBeforeHash": "f1cf75ad3be66da265ca838d2852fb938c56aaf7421eeb5c9f939b4cd5767037",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';",
          "after": "import {mkdirSync,writeFileSync} from 'node:fs';\nimport {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_cryvoices.ts",
      "kind": "reader",
      "beforeHash": "0740e6e5ecfc7635d6e3aa5cfd2292a73370ee98e1c3e1dd3c439164268c5644",
      "afterHash": "c318edb95faf4131d271d5f3a01289d6fdd18b3e52803ba13519ae8af0edaefa",
      "rawBeforeHash": "0740e6e5ecfc7635d6e3aa5cfd2292a73370ee98e1c3e1dd3c439164268c5644",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_doomcues.ts",
      "kind": "reader",
      "beforeHash": "13564da31da0eb563ae97d61f700fcb7ce554933015b70a751a0397933931f90",
      "afterHash": "0f348d27032b2bac31cdde3c73748d27e35cfbfe55da3a19b2b03fca91792e5f",
      "rawBeforeHash": "13564da31da0eb563ae97d61f700fcb7ce554933015b70a751a0397933931f90",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_feedingcues.ts",
      "kind": "reader",
      "beforeHash": "821974a9772c5d75ae812c9aa95469966350aaa2dcbdcc78431f09a7b7648740",
      "afterHash": "868eba19070db2334ffded920dc2df77afcc2bb9775e2b4dcec39bc679a35bb1",
      "rawBeforeHash": "821974a9772c5d75ae812c9aa95469966350aaa2dcbdcc78431f09a7b7648740",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';",
          "after": "import {mkdirSync,writeFileSync} from 'node:fs';\nimport {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_folio.ts",
      "kind": "reader",
      "beforeHash": "8ecb686187c8ae1f74d6e5a1a186d5781c89e93fc30334b62201a9c72940bbd0",
      "afterHash": "bf533ab31d61b4d17187e806036325c4094721e712da0144e1e50d5e7cbebe23",
      "rawBeforeHash": "8ecb686187c8ae1f74d6e5a1a186d5781c89e93fc30334b62201a9c72940bbd0",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_menubar.ts",
      "kind": "reader",
      "beforeHash": "f37dc615864bf75355f534aaccb54c23483143a8e17f973e9dd1f6d056cdd3eb",
      "afterHash": "7b11692ffab6708f8fb24e507845830baeb6553ba4a83e984348fa77ce0a1ac6",
      "rawBeforeHash": "f37dc615864bf75355f534aaccb54c23483143a8e17f973e9dd1f6d056cdd3eb",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeareamemory.ts",
      "kind": "reader",
      "beforeHash": "ce76ac2d4266c5e216502acbebd8a3ff098635a5c4c62ae486e70168262dfd87",
      "afterHash": "feeddf4c8cf1a873cde7d1c738cdbbce1adfa7f561de9656947938e6c9b0c060",
      "rawBeforeHash": "ce76ac2d4266c5e216502acbebd8a3ff098635a5c4c62ae486e70168262dfd87",
      "crlfLines": [],
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeareamenusource.ts",
      "kind": "reader",
      "beforeHash": "03ab435eecda44031f13e671a5876c71caa97a842c3c0236533769832579493a",
      "afterHash": "bf91cb5f4920038554eb01499386f5b84a8c807a2880606106999c8fb0fa524f",
      "rawBeforeHash": "03ab435eecda44031f13e671a5876c71caa97a842c3c0236533769832579493a",
      "crlfLines": [],
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeareasourcesession.ts",
      "kind": "reader",
      "beforeHash": "25517bdff3b5deddc60a5feacd7512c905fbbb879b14b63811a373bcd2ecdc03",
      "afterHash": "a0e2de5bb87c1e911bb9f96a3cf382f60b0d682239f0e7ca96877aa3c9620399",
      "rawBeforeHash": "25517bdff3b5deddc60a5feacd7512c905fbbb879b14b63811a373bcd2ecdc03",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeareauiactionssource.ts",
      "kind": "reader",
      "beforeHash": "5e0fb2bdfd7e5dfb89977398314b81bbd1874016823934e6b457f1cc70f13d3e",
      "afterHash": "3d0d7f4422023781469115313282c0428307afb82c992f09823fecc70a7bf6ef",
      "rawBeforeHash": "5e0fb2bdfd7e5dfb89977398314b81bbd1874016823934e6b457f1cc70f13d3e",
      "crlfLines": [],
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeareaviewqueriessource.ts",
      "kind": "reader",
      "beforeHash": "53220cc8769ec3157a3e08912027aef58f161fc5a69c2361c1f9fb2b460c032b",
      "afterHash": "dbaabb88c6400e519b1305983c07bb66b3fe4e88ea6e5fdad10b1fdde00726e1",
      "rawBeforeHash": "53220cc8769ec3157a3e08912027aef58f161fc5a69c2361c1f9fb2b460c032b",
      "crlfLines": [],
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativearrivalcompositionsource.ts",
      "kind": "reader",
      "beforeHash": "c5ecbfe2d80bc53e776b7befa3236c12a023cf0dfa9078b9a42667f1cb32df36",
      "afterHash": "d0b349911c4629d84f2e45c5ba9d70b6994891f0f23a967fdca8e5ffb7aeeded",
      "rawBeforeHash": "94a93c12bc22a107c9cf575419d71c66d168bdc0da1f1a59b7c0d14c7c45a99f",
      "crlfLines": [
        26
      ],
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecampaignframeclosuresource.ts",
      "kind": "reader",
      "beforeHash": "e9e390df40351db5d387833a3f8409cf7a1f96e41050bf7dd3695da416abbf5e",
      "afterHash": "82fa7c7df9e39a3c93d2abe0731e05885e516847841fbb07a39fb372cee07137",
      "rawBeforeHash": "e9e390df40351db5d387833a3f8409cf7a1f96e41050bf7dd3695da416abbf5e",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecampaignframesource.ts",
      "kind": "reader",
      "beforeHash": "c00076f2d7a66bca19053445922fc63069caf1b12d22ca3707c776296d024971",
      "afterHash": "8f1a84043172c3cc69fe747b5be611356844a85b7c7f1337d43e266a4856d24f",
      "rawBeforeHash": "c00076f2d7a66bca19053445922fc63069caf1b12d22ca3707c776296d024971",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecampaigntransitionssource.ts",
      "kind": "reader",
      "beforeHash": "ca123d27513ca3c3121750006c3c0d807882e9b61ec7d7d912e2c63f1c0c7de0",
      "afterHash": "2aa9c8c3b5e88e797e7bef14ace2395a34b7bdf554a3f9eec41f5aa28f2456f1",
      "rawBeforeHash": "ca123d27513ca3c3121750006c3c0d807882e9b61ec7d7d912e2c63f1c0c7de0",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecastingpreparation.ts",
      "kind": "reader",
      "beforeHash": "55f265a8b19c68be42ebac5882fd950da1057c72fd2b44719f60514b96964891",
      "afterHash": "cd7d6a0e84ca0d63bc2d742fba9894c6f773359743dd1a674a7d4c4694f4d290",
      "rawBeforeHash": "55f265a8b19c68be42ebac5882fd950da1057c72fd2b44719f60514b96964891",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecombatcampaignarenasource.ts",
      "kind": "reader",
      "beforeHash": "a5e57b1d689ddb373ab33574f3722bd452519d473e79880b17d60f9cf8b5eaaa",
      "afterHash": "8517315f41004aa279348457f2e6cf396ed5a42f9af09fc02b096757ec74400d",
      "rawBeforeHash": "a5e57b1d689ddb373ab33574f3722bd452519d473e79880b17d60f9cf8b5eaaa",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecombatmotionsource.ts",
      "kind": "reader",
      "beforeHash": "585db5d7f30a02babfb62a1b61c0476b4dcc8d38451e85da8ea92b1e9a1c5768",
      "afterHash": "dc4022c5836417b8f9edfd29e9b8f2f7ed008c5521ae4543aac8579e5fcab52b",
      "rawBeforeHash": "585db5d7f30a02babfb62a1b61c0476b4dcc8d38451e85da8ea92b1e9a1c5768",
      "crlfLines": [],
      "edits": [
        {
          "before": "import * as fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecombatstate.ts",
      "kind": "reader",
      "beforeHash": "756554e8585a8b530a61a546f84ea1faf5c4fd1a7dee24d05b1145d29b1ae924",
      "afterHash": "42c07c8bace6f61ea861fde8192e13d6c3510e761fb89aee91c4bf32588dd175",
      "rawBeforeHash": "756554e8585a8b530a61a546f84ea1faf5c4fd1a7dee24d05b1145d29b1ae924",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativedefensepreparation.ts",
      "kind": "reader",
      "beforeHash": "62eac1e174218d030dbcb520cd5f45e2efb03d202e572e38a129d0624fda6b1d",
      "afterHash": "cfdd10fb9099b6a77c0c8dbef77d445028f10b4641610a058b85d89c8757800a",
      "rawBeforeHash": "62eac1e174218d030dbcb520cd5f45e2efb03d202e572e38a129d0624fda6b1d",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativedisplacement.ts",
      "kind": "reader",
      "beforeHash": "6e0f40e76e1fbe33e51fb8baa684a1b4180dd7fbecf08075563b4044537cfb09",
      "afterHash": "51bb4cfd26e4fa3762cf51eba46f499a75c2dab89d379e3c494b1f9ea9ad3a66",
      "rawBeforeHash": "6e0f40e76e1fbe33e51fb8baa684a1b4180dd7fbecf08075563b4044537cfb09",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeframesource.ts",
      "kind": "reader",
      "beforeHash": "259a3e6fcfa529b19f7d51f71c6a5519f4600abdd2b9d18e14d6aef7cb6d847a",
      "afterHash": "559f0f2669c08fb13416de78640896df152296d9a8d5187194f4c7f725ef9071",
      "rawBeforeHash": "259a3e6fcfa529b19f7d51f71c6a5519f4600abdd2b9d18e14d6aef7cb6d847a",
      "crlfLines": [],
      "edits": [
        {
          "before": "import * as fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativegroundfollowups.ts",
      "kind": "reader",
      "beforeHash": "c6ad41f4a45c10c9fa28bd125d4ec79e04b937f434b6f065f32adfaf8c58fd7c",
      "afterHash": "3b1c13fbe5d24ae93edfdfae1057a2812d62c2d93e0299466c296905085313bb",
      "rawBeforeHash": "c6ad41f4a45c10c9fa28bd125d4ec79e04b937f434b6f065f32adfaf8c58fd7c",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativegroundfollowupsintegration.ts",
      "kind": "reader",
      "beforeHash": "ed7cadb2c755d1d486fee943b045d3f6c1095ac9bc80ec3398a6f7a3a19cbd83",
      "afterHash": "617af050c2a092403125aa84ac40c2dbd5f04c1e2d7ad199b80becb442d25f4f",
      "rawBeforeHash": "ed7cadb2c755d1d486fee943b045d3f6c1095ac9bc80ec3398a6f7a3a19cbd83",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativehistoricalguards.ts",
      "kind": "reader",
      "beforeHash": "81045a6257d5c4b451e6a9ad71a701c6b059b6096d90638ea1629a45aee6ef4a",
      "afterHash": "3dfb700cb5dbc28a884ee84334149fdff42b0826c1d02a025b6274945a717410",
      "rawBeforeHash": "81045a6257d5c4b451e6a9ad71a701c6b059b6096d90638ea1629a45aee6ef4a",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativehistoricalreceipts.ts",
      "kind": "reader",
      "beforeHash": "a1884666bfddf2374748cd2ac4d656921c53a4304a61c11913a311bbf5083ee8",
      "afterHash": "ba2962fecfc4591f7b1dec8357f4c82d47c3553dc8b20a28813c45d0811c0c97",
      "rawBeforeHash": "a1884666bfddf2374748cd2ac4d656921c53a4304a61c11913a311bbf5083ee8",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeinstalledsources.ts",
      "kind": "reader",
      "beforeHash": "118fc69cd7ac864f308edf68142b2b7adf93755b1860ea73e210901d869545bc",
      "afterHash": "ecfce430327fee822c48048a83e220776d111212c7ddc812bb4bddd47658c110",
      "rawBeforeHash": "118fc69cd7ac864f308edf68142b2b7adf93755b1860ea73e210901d869545bc",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativekillaftermath.ts",
      "kind": "reader",
      "beforeHash": "076bf9886aed945c44ae7a7d2a03f9b73c596759c7ae99ec988e6f3a614691ef",
      "afterHash": "81404872eacfce56927ec6fc1c310e56735292e59d5c94b4d5906c4dc7f1d864",
      "rawBeforeHash": "076bf9886aed945c44ae7a7d2a03f9b73c596759c7ae99ec988e6f3a614691ef",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanExtractedFS as fs} from './nativeCaravanExtractedReadFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeprojectilelaunch.ts",
      "kind": "reader",
      "beforeHash": "64630cddf6c81b7e0894a5eeb484e1ae8b038a20b16a8168063145c431d151bb",
      "afterHash": "7d30154c3b1635eaa8cbbc46d60faf30c13d01d36ace7b706e83ea2e15bf08b7",
      "rawBeforeHash": "64630cddf6c81b7e0894a5eeb484e1ae8b038a20b16a8168063145c431d151bb",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanExtractedFS as fs} from './nativeCaravanExtractedReadFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativequestinteraction.ts",
      "kind": "reader",
      "beforeHash": "eee9da4391e3886867e3080db7dabe525e448e50248ddd217bbd9bad22928a04",
      "afterHash": "1ef379efce81c987a1d81a4d60f0ac4add1115d82c9443f115b495f4429147a0",
      "rawBeforeHash": "eee9da4391e3886867e3080db7dabe525e448e50248ddd217bbd9bad22928a04",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativerestoration.ts",
      "kind": "reader",
      "beforeHash": "cfd8c4fd11b9593119df40d55b2f086fde291ce778b93ee9788b69c8ca4aeb6f",
      "afterHash": "f9335d97345fd18f42fa4beec0bcbd468125d1434779f1d23fb53c00c0dd4a95",
      "rawBeforeHash": "cfd8c4fd11b9593119df40d55b2f086fde291ce778b93ee9788b69c8ca4aeb6f",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativerunconclusionsource.ts",
      "kind": "reader",
      "beforeHash": "119423fbf425916f7b43f92443c61b944b70f19097e3e94fcc96037da50cc814",
      "afterHash": "07d5cb99be18b8a2cb2971b28863a927eb781a50366e9595fd4dd2d626c46a8c",
      "rawBeforeHash": "119423fbf425916f7b43f92443c61b944b70f19097e3e94fcc96037da50cc814",
      "crlfLines": [],
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativescenearrival.ts",
      "kind": "reader",
      "beforeHash": "1daf1adcb5459c7c05c920a2424ff19ae263e38c9e139f3bf4eb161a9c943bd0",
      "afterHash": "290dd91104de3121948e8a3e801838b54b56ee722b52688bb3d270fd063c58e5",
      "rawBeforeHash": "1daf1adcb5459c7c05c920a2424ff19ae263e38c9e139f3bf4eb161a9c943bd0",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        },
        {
          "before": "import {assertHistoricalConcealmentSource,beforeHistoricalArrivalGrounds} from './nativeHistoricalArrivalGrounds';",
          "after": "import {assertHistoricalConcealmentSource,beforeHistoricalArrivalGrounds} from './nativeCaravanArrivalReceiptFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativescenegraph.ts",
      "kind": "reader",
      "beforeHash": "6e1a7b3772800cf387688c19916eaf9a61b49313e443ba9db4faf51a49f2c815",
      "afterHash": "b60a46d341164c6dc72f668d5fb5623606f89bda78e13dc6552fa4c84f06b3be",
      "rawBeforeHash": "6e1a7b3772800cf387688c19916eaf9a61b49313e443ba9db4faf51a49f2c815",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativesceneloot.ts",
      "kind": "reader",
      "beforeHash": "7daa87554646af02c81a2be0dddfefd9efce44d6df3305735e430b512f32b547",
      "afterHash": "2d209d7bb144e8d596fb2673c5f161a21e205f8580476daf5e0c46437fe92a16",
      "rawBeforeHash": "7daa87554646af02c81a2be0dddfefd9efce44d6df3305735e430b512f32b547",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativesceneobjectivecompletion.ts",
      "kind": "reader",
      "beforeHash": "d879fea112212fd99e0144747ac293c8a7fb980499f95aab5ff89639786f2959",
      "afterHash": "fdb8bab77ceb5f5901abb77823713c3f3a3fb6623ebaf963e391dad5686d484b",
      "rawBeforeHash": "d879fea112212fd99e0144747ac293c8a7fb980499f95aab5ff89639786f2959",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativesceneprogression.ts",
      "kind": "reader",
      "beforeHash": "df402418d68684e275c86f400aaa163fca49451a7c3df5d8992af06c405f668a",
      "afterHash": "509aa346c25c57b523df9474bffc18f6017466727f24368d2cc3cf286d83ba95",
      "rawBeforeHash": "df402418d68684e275c86f400aaa163fca49451a7c3df5d8992af06c405f668a",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativescenepuzzles.ts",
      "kind": "reader",
      "beforeHash": "3dab018960f8e1e5c8cdb6f3fdb839d629371dde908e21f59cee55b4cfccfb26",
      "afterHash": "a81fb08163c95020e9b852604f1070f8c2255bc3904949682addcfbbb1572c6b",
      "rawBeforeHash": "3dab018960f8e1e5c8cdb6f3fdb839d629371dde908e21f59cee55b4cfccfb26",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanExtractedFS as fs} from './nativeCaravanExtractedReadFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativescenequests.ts",
      "kind": "reader",
      "beforeHash": "2ec12b5670620938f314d322e008759bc2e00f3222257be97e3464048c492084",
      "afterHash": "cf2ab893e1c04043db56c9b7da15a5ece32e46ace95328be835d8e685902c157",
      "rawBeforeHash": "2ec12b5670620938f314d322e008759bc2e00f3222257be97e3464048c492084",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativescenesky.ts",
      "kind": "reader",
      "beforeHash": "d7627a4b32377f77d3bc1693b52b979b54e3d19e338fc9dd602f5637a0ff62f2",
      "afterHash": "ee68f208c2c90d620b8c336f2c59e146e79b1adab2aef0c5b1bbddb23888a711",
      "rawBeforeHash": "d7627a4b32377f77d3bc1693b52b979b54e3d19e338fc9dd602f5637a0ff62f2",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativetetherconstruction.ts",
      "kind": "reader",
      "beforeHash": "4fc7a45dd5b9a8c9d63dc3a2fb3535e55515f6107980c52f60614c14e75499ab",
      "afterHash": "79a14db7a064cf66631beec3243d756b4790ad4755aac6b2a2d3837717bc8370",
      "rawBeforeHash": "4fc7a45dd5b9a8c9d63dc3a2fb3535e55515f6107980c52f60614c14e75499ab",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativetownstationsource.ts",
      "kind": "reader",
      "beforeHash": "778bcf71603f4a636a1296656d81e5efc8375c1a3658e7e2d75ff4aac9690e92",
      "afterHash": "b2027eefe74329b8b1a35d384331b267ae8b6b9f8f7e2d661b96ba3398e2c59a",
      "rawBeforeHash": "778bcf71603f4a636a1296656d81e5efc8375c1a3658e7e2d75ff4aac9690e92",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalMainCastFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_proccues.ts",
      "kind": "reader",
      "beforeHash": "961481fa242dff66134c9747430f99559162e4f434283e4c8db22858fb8f2cd5",
      "afterHash": "6dc4e62efff688e24fde2f511ccee3e3d88e9d0f345a550a3b00ccfe3d3516df",
      "rawBeforeHash": "961481fa242dff66134c9747430f99559162e4f434283e4c8db22858fb8f2cd5",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
          "after": "import {mkdirSync,writeFileSync} from 'node:fs';\nimport {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_reservecues.ts",
      "kind": "reader",
      "beforeHash": "9b04b8cb043dba5216430c2251992a9ca10177ddbbb1a6bf1e2814b3be68aa61",
      "afterHash": "302c6fae6e45830b8d5d32150d9cd43180a2039b061326c2f273ac36ec8ce7cc",
      "rawBeforeHash": "9b04b8cb043dba5216430c2251992a9ca10177ddbbb1a6bf1e2814b3be68aa61",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_shardunits.ts",
      "kind": "reader",
      "beforeHash": "ff871f3377911c23457554fb1e2ac53fad63756a4bdbb131114b105a81f4924f",
      "afterHash": "8a8364b7b493fe9dc9d47cb6c3a273d4ad77a9cff01d6619fa6d08977bdfea3d",
      "rawBeforeHash": "ff871f3377911c23457554fb1e2ac53fad63756a4bdbb131114b105a81f4924f",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';",
          "after": "import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';\nimport {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_shimmy.ts",
      "kind": "reader",
      "beforeHash": "5b10f07654228124458df7c5cc26183344b473ce15b67bbbcfdadc0012ca32b8",
      "afterHash": "2c1661dbd30f5f8f5da6069c0828a4af0e080cc99321cf794972cd4c43431ec1",
      "rawBeforeHash": "5b10f07654228124458df7c5cc26183344b473ce15b67bbbcfdadc0012ca32b8",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_statusvoice.ts",
      "kind": "reader",
      "beforeHash": "40a3d8ab755a8d9b55d0a2389bb22fc79e84219ace98d504454ecd10a1c64533",
      "afterHash": "e1e048e8559200b9168cc65b3e69019d81a4706469b9ae18aa1707730efd01ce",
      "rawBeforeHash": "40a3d8ab755a8d9b55d0a2389bb22fc79e84219ace98d504454ecd10a1c64533",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import { readFileSync } from 'node:fs';\nimport {nativeStatusVoiceSources} from './nativeCaravanLegacySourceFixture';"
        },
        {
          "before": "const src = readFileSync('src/engine/world.ts', 'utf8');",
          "after": "const src = nativeStatusVoiceSources(readFileSync('src/engine/world.ts', 'utf8'), readFileSync('src/engine/nativeSceneRestoration.ts', 'utf8'));"
        }
      ]
    },
    {
      "file": "balance/probe_tiers.ts",
      "kind": "reader",
      "beforeHash": "22cc12497e2e37b1310c69b7753627cd6652ceeaa23e4e4a04d0ffcf94b1e077",
      "afterHash": "d049895135edd19715b374c472e708979d3219f5222b748666c3588b51cd8e94",
      "rawBeforeHash": "22cc12497e2e37b1310c69b7753627cd6652ceeaa23e4e4a04d0ffcf94b1e077",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_worldmass_nativeareageometry.ts",
      "kind": "reader",
      "beforeHash": "e7b71df4a6fe21ab5a081af0a7682b28cefe2e9ae4e970328af16b65c368ea52",
      "afterHash": "d34075267307953f94cdd98955368918dbd6757bfd379474e25bfe1c9efdb12e",
      "rawBeforeHash": "e7b71df4a6fe21ab5a081af0a7682b28cefe2e9ae4e970328af16b65c368ea52",
      "crlfLines": [],
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/nativeMainCastSourceFixture.ts",
      "kind": "reader",
      "beforeHash": "89aedcc3ab319d6cd58b6b500f538715615646454d76e34390b57a55a825f0e9",
      "afterHash": "ffad0c874f720eac5d0721a41cd556c60814e49723ee1cfe2fc26df5d47b8f2d",
      "rawBeforeHash": "89aedcc3ab319d6cd58b6b500f538715615646454d76e34390b57a55a825f0e9",
      "crlfLines": [],
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/nativeGroundCurrentSourceFixture.ts",
      "kind": "reader",
      "beforeHash": "907caf958d33563bbae144d06f0ec907daa03b9b25154a650895892021724ea2",
      "afterHash": "40104878129cb3292c6fc8e0a825810e708f03226fc298f9df8a9fb23f5689aa",
      "rawBeforeHash": "907caf958d33563bbae144d06f0ec907daa03b9b25154a650895892021724ea2",
      "crlfLines": [],
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanGroundFS as fs} from './nativeCaravanLegacySourceFixture';"
        }
      ]
    }
  ],
  "readers": [
    {
      "file": "balance/nativeArrivalCompositionFixture.ts",
      "beforeHash": "1c910a3711a12da0a2f62b7a0f8efe16d2d7f1d5f25aec27842667f7c53f8ad3",
      "afterHash": "4e3175f23d2171deb8ec072c9fc0fb58de0707769379ef41a3817dae39b7e914",
      "assertions": 0,
      "assertionHash": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      "edits": [
        {
          "before": "import fs,{readFileSync} from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs,readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_anatomycues.ts",
      "beforeHash": "2c2497a86fbe4549ff02a82114d2704a2364885b44bdef07d530b0536ea4a3ea",
      "afterHash": "2f1f17c76a829ac4b232c97833760ea591ea21d7ab48b5e71d1313a53cbe8b30",
      "assertions": 52,
      "assertionHash": "461cee4d44908874a605db11cef678ba8138e7c728e4cd02b753a80c88205a6a",
      "edits": [
        {
          "before": "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
          "after": "import {mkdirSync,writeFileSync} from 'node:fs';\nimport {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_bodyvoices.ts",
      "beforeHash": "b7e545045556ecc40712d59cd3730245f3e814938a9e214ec0d86f336af5ad1e",
      "afterHash": "ef164e9e8d943f478ffeb766e06780c0fcbc4efafa58d16ffc0b015e273574ea",
      "assertions": 20,
      "assertionHash": "fb42cd3da82717a7006be7706eb93af40425f68bcfc2535d4053c7849bc2d87c",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_combatreadability.ts",
      "beforeHash": "4af612bce2e1f9c6209ffbfc2ef8272a619487a10237f9c38055f59f263fc071",
      "afterHash": "ab05c31003c6513e1f4b0ac795a53ea3fe31ac2cc6749f22f4d63c82ca0037d7",
      "assertions": 41,
      "assertionHash": "34395f82c0e31e9249bf1fa561648f7cf0de4809970c6a2ecd9114c3a7878565",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_companioncues.ts",
      "beforeHash": "f1cf75ad3be66da265ca838d2852fb938c56aaf7421eeb5c9f939b4cd5767037",
      "afterHash": "d8b0651179647f2c0ed6624dd02865eb93df46f2f9ff9c0d3235352af546997a",
      "assertions": 63,
      "assertionHash": "c42fc0c02b1d42db32aba820711e113a2e61cdd6b18c6534b30275da1d2bb94c",
      "edits": [
        {
          "before": "import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';",
          "after": "import {mkdirSync,writeFileSync} from 'node:fs';\nimport {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_cryvoices.ts",
      "beforeHash": "0740e6e5ecfc7635d6e3aa5cfd2292a73370ee98e1c3e1dd3c439164268c5644",
      "afterHash": "c318edb95faf4131d271d5f3a01289d6fdd18b3e52803ba13519ae8af0edaefa",
      "assertions": 10,
      "assertionHash": "d4c0594f59dadc8456f8a2e991008c72e09ac1c9e60aaf9ce78c3631246c8d8b",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_doomcues.ts",
      "beforeHash": "13564da31da0eb563ae97d61f700fcb7ce554933015b70a751a0397933931f90",
      "afterHash": "0f348d27032b2bac31cdde3c73748d27e35cfbfe55da3a19b2b03fca91792e5f",
      "assertions": 36,
      "assertionHash": "7dc9299043590bd11b5814dca8844761a0f742a944be1a713353d94bac62fab5",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_feedingcues.ts",
      "beforeHash": "821974a9772c5d75ae812c9aa95469966350aaa2dcbdcc78431f09a7b7648740",
      "afterHash": "868eba19070db2334ffded920dc2df77afcc2bb9775e2b4dcec39bc679a35bb1",
      "assertions": 41,
      "assertionHash": "5b37de8325dc031d297e0ffac1800613516feb57f8a08976aaa141000fac5e09",
      "edits": [
        {
          "before": "import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';",
          "after": "import {mkdirSync,writeFileSync} from 'node:fs';\nimport {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_folio.ts",
      "beforeHash": "8ecb686187c8ae1f74d6e5a1a186d5781c89e93fc30334b62201a9c72940bbd0",
      "afterHash": "bf533ab31d61b4d17187e806036325c4094721e712da0144e1e50d5e7cbebe23",
      "assertions": 167,
      "assertionHash": "8648f21ce892f875d2936cf432d89c68bd51cbb983be971b70f560a2b9e9e6e6",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_menubar.ts",
      "beforeHash": "f37dc615864bf75355f534aaccb54c23483143a8e17f973e9dd1f6d056cdd3eb",
      "afterHash": "7b11692ffab6708f8fb24e507845830baeb6553ba4a83e984348fa77ce0a1ac6",
      "assertions": 64,
      "assertionHash": "b316d6bdd7b6d5261a3eab585c615da7d2abe2834b1f2e0856ecde67d28fe77e",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeareamemory.ts",
      "beforeHash": "ce76ac2d4266c5e216502acbebd8a3ff098635a5c4c62ae486e70168262dfd87",
      "afterHash": "feeddf4c8cf1a873cde7d1c738cdbbce1adfa7f561de9656947938e6c9b0c060",
      "assertions": 91,
      "assertionHash": "9316fd59b096e0bd0fb6b6fc845977ad2937502725ad548da7e7c81587e972e8",
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeareamenusource.ts",
      "beforeHash": "03ab435eecda44031f13e671a5876c71caa97a842c3c0236533769832579493a",
      "afterHash": "bf91cb5f4920038554eb01499386f5b84a8c807a2880606106999c8fb0fa524f",
      "assertions": 13,
      "assertionHash": "1f53ffc95ddb07b67ef40bd83323a7f42728b7a25e2ca3b221044c99092f108e",
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact MainCast predecessor selection"
    },
    {
      "file": "balance/probe_nativeareasourcesession.ts",
      "beforeHash": "25517bdff3b5deddc60a5feacd7512c905fbbb879b14b63811a373bcd2ecdc03",
      "afterHash": "a0e2de5bb87c1e911bb9f96a3cf382f60b0d682239f0e7ca96877aa3c9620399",
      "assertions": 108,
      "assertionHash": "d1b81f1b2904a9990dedfb3ca76f91af015f62d5133e47fcf1035609e4f9c162",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeareauiactionssource.ts",
      "beforeHash": "5e0fb2bdfd7e5dfb89977398314b81bbd1874016823934e6b457f1cc70f13d3e",
      "afterHash": "3d0d7f4422023781469115313282c0428307afb82c992f09823fecc70a7bf6ef",
      "assertions": 12,
      "assertionHash": "7b957290bf38ec7303ce596b7174b21f56a77f6741211c49574954cee49eceec",
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact MainCast predecessor selection"
    },
    {
      "file": "balance/probe_nativeareaviewqueriessource.ts",
      "beforeHash": "53220cc8769ec3157a3e08912027aef58f161fc5a69c2361c1f9fb2b460c032b",
      "afterHash": "dbaabb88c6400e519b1305983c07bb66b3fe4e88ea6e5fdad10b1fdde00726e1",
      "assertions": 17,
      "assertionHash": "9afabee84046acc6d1ff9e318745a64c7ed32905a9b35f5c2ce651e0903470f0",
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact MainCast predecessor selection"
    },
    {
      "file": "balance/probe_nativearrivalcompositionsource.ts",
      "beforeHash": "94a93c12bc22a107c9cf575419d71c66d168bdc0da1f1a59b7c0d14c7c45a99f",
      "afterHash": "81766caa0a7c8372e46b709e022c49c2c00011c2bc122d7519055064f40bd2a9",
      "assertions": 22,
      "assertionHash": "ddfe30820eeccf2d454ee3b33b7ee4b013ed4914ad47d3eb318d51ec527bdd8c",
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecampaignframeclosuresource.ts",
      "beforeHash": "e9e390df40351db5d387833a3f8409cf7a1f96e41050bf7dd3695da416abbf5e",
      "afterHash": "82fa7c7df9e39a3c93d2abe0731e05885e516847841fbb07a39fb372cee07137",
      "assertions": 18,
      "assertionHash": "a20babe195aa7c6e979c3521d4a886105f4d87af4bac8aef84a2f1f656a09205",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecampaignframesource.ts",
      "beforeHash": "c00076f2d7a66bca19053445922fc63069caf1b12d22ca3707c776296d024971",
      "afterHash": "8f1a84043172c3cc69fe747b5be611356844a85b7c7f1337d43e266a4856d24f",
      "assertions": 36,
      "assertionHash": "fa7ae20ffd0431ec4e7f5df54314c065077843451e89cda74e8b1510500fea7b",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecampaigntransitionssource.ts",
      "beforeHash": "ca123d27513ca3c3121750006c3c0d807882e9b61ec7d7d912e2c63f1c0c7de0",
      "afterHash": "2aa9c8c3b5e88e797e7bef14ace2395a34b7bdf554a3f9eec41f5aa28f2456f1",
      "assertions": 17,
      "assertionHash": "639a72474bf6c6a21ecd1055777d328482d41cd590f869046e9645ac4b75954a",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecastingpreparation.ts",
      "beforeHash": "55f265a8b19c68be42ebac5882fd950da1057c72fd2b44719f60514b96964891",
      "afterHash": "cd7d6a0e84ca0d63bc2d742fba9894c6f773359743dd1a674a7d4c4694f4d290",
      "assertions": 208,
      "assertionHash": "674c38b114a1a4d07c73edaa2d3ad39504cb4ad70d56072c3c4b9b02d524dc3e",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativecombatcampaignarenasource.ts",
      "beforeHash": "a5e57b1d689ddb373ab33574f3722bd452519d473e79880b17d60f9cf8b5eaaa",
      "afterHash": "8517315f41004aa279348457f2e6cf396ed5a42f9af09fc02b096757ec74400d",
      "assertions": 17,
      "assertionHash": "752deaabb236825bc31023e1d9a1a6d9a25b35d4c8685c920cd14f900809fc2c",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecombatmotionsource.ts",
      "beforeHash": "585db5d7f30a02babfb62a1b61c0476b4dcc8d38451e85da8ea92b1e9a1c5768",
      "afterHash": "dc4022c5836417b8f9edfd29e9b8f2f7ed008c5521ae4543aac8579e5fcab52b",
      "assertions": 12,
      "assertionHash": "ff5270bc9a91b9cfb2675c2043ad7ba1ea0a0b651b0e42e3ed5872f4da2e53a4",
      "edits": [
        {
          "before": "import * as fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativecombatstate.ts",
      "beforeHash": "756554e8585a8b530a61a546f84ea1faf5c4fd1a7dee24d05b1145d29b1ae924",
      "afterHash": "42c07c8bace6f61ea861fde8192e13d6c3510e761fb89aee91c4bf32588dd175",
      "assertions": 150,
      "assertionHash": "7ddf925a819ed19297e14a8e8fa8c5a138a43e4f144bde6aa59ea2846747853e",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativedefensepreparation.ts",
      "beforeHash": "62eac1e174218d030dbcb520cd5f45e2efb03d202e572e38a129d0624fda6b1d",
      "afterHash": "cfdd10fb9099b6a77c0c8dbef77d445028f10b4641610a058b85d89c8757800a",
      "assertions": 145,
      "assertionHash": "7a72d1cf3f8945313e2d6deb81c5d986dbfad55aeb30e283f1e6bb13f3d4fcfb",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativedisplacement.ts",
      "beforeHash": "6e0f40e76e1fbe33e51fb8baa684a1b4180dd7fbecf08075563b4044537cfb09",
      "afterHash": "51bb4cfd26e4fa3762cf51eba46f499a75c2dab89d379e3c494b1f9ea9ad3a66",
      "assertions": 218,
      "assertionHash": "da0ce44ad08cc81acd4e8c0381a3c7b0481cf3ae54d5ac46d54546d9c277c216",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativeframesource.ts",
      "beforeHash": "259a3e6fcfa529b19f7d51f71c6a5519f4600abdd2b9d18e14d6aef7cb6d847a",
      "afterHash": "559f0f2669c08fb13416de78640896df152296d9a8d5187194f4c7f725ef9071",
      "assertions": 34,
      "assertionHash": "358e584d34ba9aca879cd378a196b14b93bc4c73e0800ef198df2c1be9ab449d",
      "edits": [
        {
          "before": "import * as fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativegroundfollowups.ts",
      "beforeHash": "c6ad41f4a45c10c9fa28bd125d4ec79e04b937f434b6f065f32adfaf8c58fd7c",
      "afterHash": "3b1c13fbe5d24ae93edfdfae1057a2812d62c2d93e0299466c296905085313bb",
      "assertions": 118,
      "assertionHash": "5ec576eaa35a9e986fd735e84d04cac5a0e2b69651b399ecd24282bb6851351f",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativegroundfollowupsintegration.ts",
      "beforeHash": "ed7cadb2c755d1d486fee943b045d3f6c1095ac9bc80ec3398a6f7a3a19cbd83",
      "afterHash": "617af050c2a092403125aa84ac40c2dbd5f04c1e2d7ad199b80becb442d25f4f",
      "assertions": 74,
      "assertionHash": "660e02ec88208cdeeba3e95abf3f98f1efc48a2d170827044a55aa5e372b81dc",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativehistoricalguards.ts",
      "beforeHash": "81045a6257d5c4b451e6a9ad71a701c6b059b6096d90638ea1629a45aee6ef4a",
      "afterHash": "3dfb700cb5dbc28a884ee84334149fdff42b0826c1d02a025b6274945a717410",
      "assertions": 14,
      "assertionHash": "de4d934bd79fa05eda4ff6b0847e8ec529905c2c5e1bd4a98ee78f0b987a0ad5",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativehistoricalreceipts.ts",
      "beforeHash": "a1884666bfddf2374748cd2ac4d656921c53a4304a61c11913a311bbf5083ee8",
      "afterHash": "ba2962fecfc4591f7b1dec8357f4c82d47c3553dc8b20a28813c45d0811c0c97",
      "assertions": 16,
      "assertionHash": "bd1d1f706a7d1b585c30d83d39461de83688d9e2b2beb54f03e500ebe4e9d10e",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativeinstalledsources.ts",
      "beforeHash": "118fc69cd7ac864f308edf68142b2b7adf93755b1860ea73e210901d869545bc",
      "afterHash": "ecfce430327fee822c48048a83e220776d111212c7ddc812bb4bddd47658c110",
      "assertions": 33,
      "assertionHash": "91df62c9751b02687e31d82740655ce5ad793a87e052bccf6fd66e9398ddaf75",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativekillaftermath.ts",
      "beforeHash": "076bf9886aed945c44ae7a7d2a03f9b73c596759c7ae99ec988e6f3a614691ef",
      "afterHash": "81404872eacfce56927ec6fc1c310e56735292e59d5c94b4d5906c4dc7f1d864",
      "assertions": 163,
      "assertionHash": "45dc0a77be3fdd644990b34aee620ab58a1980ff1cf5daeba04565c9ff264d23",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanExtractedFS as fs} from './nativeCaravanExtractedReadFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativeprojectilelaunch.ts",
      "beforeHash": "64630cddf6c81b7e0894a5eeb484e1ae8b038a20b16a8168063145c431d151bb",
      "afterHash": "7d30154c3b1635eaa8cbbc46d60faf30c13d01d36ace7b706e83ea2e15bf08b7",
      "assertions": 74,
      "assertionHash": "537be7c0c463c5eb835d18f75a23f0f8a3a158293f5a82ed2964cf23749e1307",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanExtractedFS as fs} from './nativeCaravanExtractedReadFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativequestinteraction.ts",
      "beforeHash": "eee9da4391e3886867e3080db7dabe525e448e50248ddd217bbd9bad22928a04",
      "afterHash": "1ef379efce81c987a1d81a4d60f0ac4add1115d82c9443f115b495f4429147a0",
      "assertions": 185,
      "assertionHash": "27defdde5afd67c9aa54fa61e81eed5facf48e5a4aded10fe95c091459b0528c",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativerestoration.ts",
      "beforeHash": "cfd8c4fd11b9593119df40d55b2f086fde291ce778b93ee9788b69c8ca4aeb6f",
      "afterHash": "f9335d97345fd18f42fa4beec0bcbd468125d1434779f1d23fb53c00c0dd4a95",
      "assertions": 206,
      "assertionHash": "de874158adcb58e34ba32a6b4df54abb8f378c6433268f0a97dc1543b9938a20",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativerunconclusionsource.ts",
      "beforeHash": "119423fbf425916f7b43f92443c61b944b70f19097e3e94fcc96037da50cc814",
      "afterHash": "07d5cb99be18b8a2cb2971b28863a927eb781a50366e9595fd4dd2d626c46a8c",
      "assertions": 12,
      "assertionHash": "56cc0c0c41f843e3fb7688918fc723af3342215c5ba4a15513e818dd1635d875",
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact MainCast predecessor selection"
    },
    {
      "file": "balance/probe_nativescenearrival.ts",
      "beforeHash": "1daf1adcb5459c7c05c920a2424ff19ae263e38c9e139f3bf4eb161a9c943bd0",
      "afterHash": "290dd91104de3121948e8a3e801838b54b56ee722b52688bb3d270fd063c58e5",
      "assertions": 40,
      "assertionHash": "a393d022023480081e24939cd1714114371aa135e8fa487f7d5f5f42caca11e4",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        },
        {
          "before": "import {assertHistoricalConcealmentSource,beforeHistoricalArrivalGrounds} from './nativeHistoricalArrivalGrounds';",
          "after": "import {assertHistoricalConcealmentSource,beforeHistoricalArrivalGrounds} from './nativeCaravanArrivalReceiptFixture';"
        }
      ],
      "compatibility": "Independent five-unused-Actor-slot receipt projection; raw lane equality and original golden unchanged"
    },
    {
      "file": "balance/probe_nativescenegraph.ts",
      "beforeHash": "6e1a7b3772800cf387688c19916eaf9a61b49313e443ba9db4faf51a49f2c815",
      "afterHash": "b60a46d341164c6dc72f668d5fb5623606f89bda78e13dc6552fa4c84f06b3be",
      "assertions": 50,
      "assertionHash": "da9e4c103e602f946e8087d01d5e8a77b23d35b2969e9f36a9072269bfd151d7",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativesceneloot.ts",
      "beforeHash": "7daa87554646af02c81a2be0dddfefd9efce44d6df3305735e430b512f32b547",
      "afterHash": "2d209d7bb144e8d596fb2673c5f161a21e205f8580476daf5e0c46437fe92a16",
      "assertions": 60,
      "assertionHash": "df28c99b9cf36cafb6fbdeb4a5192727e8b6751e3a5e50e53b74903c3a905bbf",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativesceneobjectivecompletion.ts",
      "beforeHash": "d879fea112212fd99e0144747ac293c8a7fb980499f95aab5ff89639786f2959",
      "afterHash": "fdb8bab77ceb5f5901abb77823713c3f3a3fb6623ebaf963e391dad5686d484b",
      "assertions": 63,
      "assertionHash": "8ae695977f489c0bc01d1f70806e5ade4ac91d2abb9af83e4b7ec3618b789bdd",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativesceneprogression.ts",
      "beforeHash": "df402418d68684e275c86f400aaa163fca49451a7c3df5d8992af06c405f668a",
      "afterHash": "509aa346c25c57b523df9474bffc18f6017466727f24368d2cc3cf286d83ba95",
      "assertions": 131,
      "assertionHash": "1d48eb1288d52ce27f931662c3a911fa4663eedec883c4e3282557b4487a4ac8",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativescenepuzzles.ts",
      "beforeHash": "3dab018960f8e1e5c8cdb6f3fdb839d629371dde908e21f59cee55b4cfccfb26",
      "afterHash": "a81fb08163c95020e9b852604f1070f8c2255bc3904949682addcfbbb1572c6b",
      "assertions": 70,
      "assertionHash": "a72e326062371cb71035badf609916d2b5e0930c01538d435a03f22d2382dbf4",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanExtractedFS as fs} from './nativeCaravanExtractedReadFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativescenequests.ts",
      "beforeHash": "2ec12b5670620938f314d322e008759bc2e00f3222257be97e3464048c492084",
      "afterHash": "cf2ab893e1c04043db56c9b7da15a5ece32e46ace95328be835d8e685902c157",
      "assertions": 213,
      "assertionHash": "d3deb8da1accfb497903ed37935555e6c8b17129dace6de062dc9c4e1aaaa794",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_nativescenesky.ts",
      "beforeHash": "d7627a4b32377f77d3bc1693b52b979b54e3d19e338fc9dd602f5637a0ff62f2",
      "afterHash": "ee68f208c2c90d620b8c336f2c59e146e79b1adab2aef0c5b1bbddb23888a711",
      "assertions": 39,
      "assertionHash": "1406ecd851e74733509371c4c48807fb7270b337ea38066761a6f76176ff8a4e",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativetetherconstruction.ts",
      "beforeHash": "4fc7a45dd5b9a8c9d63dc3a2fb3535e55515f6107980c52f60614c14e75499ab",
      "afterHash": "79a14db7a064cf66631beec3243d756b4790ad4755aac6b2a2d3837717bc8370",
      "assertions": 145,
      "assertionHash": "bbc6dbc714ab26dc1a1f7e493f8d510ee8b5181a8364cdb057dd7ac69642f222",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact SummonBoundary predecessor selection"
    },
    {
      "file": "balance/probe_nativetownstationsource.ts",
      "beforeHash": "778bcf71603f4a636a1296656d81e5efc8375c1a3658e7e2d75ff4aac9690e92",
      "afterHash": "b2027eefe74329b8b1a35d384331b267ae8b6b9f8f7e2d661b96ba3398e2c59a",
      "assertions": 13,
      "assertionHash": "84d292dee7d7162924514dc8a7774c848b510641ee93b2b746888e7fcfb80b83",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeArrivalMainCastFS as fs} from './nativeArrivalCompositionFixture';"
        }
      ],
      "compatibility": "existing exact MainCast predecessor selection"
    },
    {
      "file": "balance/probe_proccues.ts",
      "beforeHash": "961481fa242dff66134c9747430f99559162e4f434283e4c8db22858fb8f2cd5",
      "afterHash": "6dc4e62efff688e24fde2f511ccee3e3d88e9d0f345a550a3b00ccfe3d3516df",
      "assertions": 55,
      "assertionHash": "37b79c7d3ac6e0ff748ee31bfe506118b62f494e58c85feedb9923db6efc3006",
      "edits": [
        {
          "before": "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
          "after": "import {mkdirSync,writeFileSync} from 'node:fs';\nimport {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_reservecues.ts",
      "beforeHash": "9b04b8cb043dba5216430c2251992a9ca10177ddbbb1a6bf1e2814b3be68aa61",
      "afterHash": "302c6fae6e45830b8d5d32150d9cd43180a2039b061326c2f273ac36ec8ce7cc",
      "assertions": 42,
      "assertionHash": "dc72c20f7d54cbe63324d0080dcdc46ca2662f0177c3a5eede3b727e7ff56617",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_shardunits.ts",
      "beforeHash": "ff871f3377911c23457554fb1e2ac53fad63756a4bdbb131114b105a81f4924f",
      "afterHash": "8a8364b7b493fe9dc9d47cb6c3a273d4ad77a9cff01d6619fa6d08977bdfea3d",
      "assertions": 132,
      "assertionHash": "a33ba858e472218ac2e73bcfc202bcbd0961229034c005ffafc7b96faa6b6865",
      "edits": [
        {
          "before": "import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';",
          "after": "import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';\nimport {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_shimmy.ts",
      "beforeHash": "5b10f07654228124458df7c5cc26183344b473ce15b67bbbcfdadc0012ca32b8",
      "afterHash": "2c1661dbd30f5f8f5da6069c0828a4af0e080cc99321cf794972cd4c43431ec1",
      "assertions": 17,
      "assertionHash": "8a97730da5090fe193508d5379ce2257c327d7a0959060990b643025aece7440",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_statusvoice.ts",
      "beforeHash": "40a3d8ab755a8d9b55d0a2389bb22fc79e84219ace98d504454ecd10a1c64533",
      "afterHash": "e1e048e8559200b9168cc65b3e69019d81a4706469b9ae18aa1707730efd01ce",
      "assertions": 14,
      "assertionHash": "fd73bf3f544f86e44de11ee8d8ffc1768b50ebc22f9287e83cec37c677d54f2e",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import { readFileSync } from 'node:fs';\nimport {nativeStatusVoiceSources} from './nativeCaravanLegacySourceFixture';"
        },
        {
          "before": "const src = readFileSync('src/engine/world.ts', 'utf8');",
          "after": "const src = nativeStatusVoiceSources(readFileSync('src/engine/world.ts', 'utf8'), readFileSync('src/engine/nativeSceneRestoration.ts', 'utf8'));"
        }
      ],
      "compatibility": "Declared actual World plus exact two extracted cure-body census; original assertions unchanged"
    },
    {
      "file": "balance/probe_tiers.ts",
      "beforeHash": "22cc12497e2e37b1310c69b7753627cd6652ceeaa23e4e4a04d0ffcf94b1e077",
      "afterHash": "d049895135edd19715b374c472e708979d3219f5222b748666c3588b51cd8e94",
      "assertions": 215,
      "assertionHash": "84701ca87596f99c8eafe9389ab5d0625b4006ac89fa6bf09709c10cb8240662",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/probe_worldmass_nativeareageometry.ts",
      "beforeHash": "e7b71df4a6fe21ab5a081af0a7682b28cefe2e9ae4e970328af16b65c368ea52",
      "afterHash": "d34075267307953f94cdd98955368918dbd6757bfd379474e25bfe1c9efdb12e",
      "assertions": 41,
      "assertionHash": "dedc4bc84b6de51940d32d2001e92194fceff2d01f2342c00bee4fec05ac902f",
      "edits": [
        {
          "before": "import { readFileSync } from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/nativeMainCastSourceFixture.ts",
      "beforeHash": "89aedcc3ab319d6cd58b6b500f538715615646454d76e34390b57a55a825f0e9",
      "afterHash": "ffad0c874f720eac5d0721a41cd556c60814e49723ee1cfe2fc26df5d47b8f2d",
      "assertions": 0,
      "assertionHash": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      "edits": [
        {
          "before": "import {readFileSync} from 'node:fs';",
          "after": "import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';"
        }
      ]
    },
    {
      "file": "balance/nativeGroundCurrentSourceFixture.ts",
      "beforeHash": "907caf958d33563bbae144d06f0ec907daa03b9b25154a650895892021724ea2",
      "afterHash": "40104878129cb3292c6fc8e0a825810e708f03226fc298f9df8a9fb23f5689aa",
      "assertions": 18,
      "assertionHash": "40b818083b1bdb47a32e5dcf80d0609fc9caaf81c25565a6440870e898f894fb",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import {nativeCaravanGroundFS as fs} from './nativeCaravanLegacySourceFixture';"
        }
      ],
      "compatibility": "two exact ground predecessor selections"
    }
  ],
  "priorArchives": [
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
    }
  ],
  "reviewedTargets": [
    {
      "file": "src/engine/world.ts",
      "beforeSha256": "478aac8f8027bf44acd6575b03177cc0c68bbfc04fac1366763f17ad5276b092",
      "afterSha256": "653eefaa6b22c334e7f670e05aa1b5c8184d1c51fe3c3341b5d2b3b52c1f7f70"
    },
    {
      "file": "src/engine/nativeSceneObjectiveWatching.ts",
      "beforeSha256": "ba59f13393efacd339567b75694c62d58aa368c4f8ecb4c46230bd65b2c05620",
      "afterSha256": "fd3dd3eb012531bff794f1a93837db7e4cc7e9efe1821d57101f8bd17ded78c0"
    },
    {
      "file": "src/worldmass/nativeAreaSceneObjectiveWatching.ts",
      "beforeSha256": "f74fa3cbf9c0faaf2e081b2f79e3415a63bc426b2698ea7177d84a1483e9fcdb",
      "afterSha256": "8ce5e2a0b35130ecae73a7888e373c072e6b688b7e7cebc1cda1c2b1f0dce627"
    },
    {
      "file": "balance/probe_nativecaravannews.ts",
      "beforeSha256": null,
      "afterSha256": "b6cf85f08e905434207be9bda6c75ef5f2b63dad3c6faf6cbb61a6cd12abf1a6"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "beforeSha256": null,
      "afterSha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
    },
    {
      "file": "balance/nativeCaravanNewsFixture.ts",
      "beforeSha256": null,
      "afterSha256": "c3d559256b31fa71495fd0d41e710e34fa129557c39dc9e73e483675c7c79f39"
    },
    {
      "file": "balance/probe_nativecaravannewssource.ts",
      "beforeSha256": null,
      "afterSha256": "509f70e55eedf1360788c70fc0230959ddd5f0a7c32a43e097ffb089c0bc89f0"
    },
    {
      "file": "balance/probe_newsmove.ts",
      "beforeSha256": "570859b8f1ee21a8466b3611afcb917f247696b6c084d17f33808da8660aebe0",
      "afterSha256": "f19061ee6ee5f36d376cb05073f244fad6815249a1df4271b43a94177c12979a"
    },
    {
      "file": "balance/probe_nativesceneobjectivewatching.ts",
      "beforeSha256": "e83819a86148f2cef0681f67575a1b85ebad4ab6a8b4e74f041dc6946c39f5d4",
      "afterSha256": "193e28d6af8d54f35be2c4e09491e7400ddf01f7ef841f2e61a127d2e38cf589"
    }
  ]
};
