// Exact frozen61 admission correction. Native restoration and original archives remain unchanged.
export const nativeOdysseyGroundAdmissionArchive = {
  "parentManifest": "f8e4b802658420b66509eb88681d39c30e77076508d673df1c64f56cf1ead9da",
  "parentInputs": "3b1f4bd0920f0e6470c6c55e6ec687e935ee2d6ab8acb1a45082263f5ff44c36",
  "rows": [
    {
      "file": "src/worldmass/nativeOdysseyGroundRefresh.ts",
      "beforeHash": "51982d0059d2cd81387caa16ae3b35f508de6571901b00681540510f81dbdc74",
      "afterHash": "c22a63aa08f71c65f94be3f59f680ad18b3006bb9baabc17d58a3651df7c3901",
      "before": "/** Plain deferred Odyssey refresh data. It grants no live area authority. */\nimport type {WorldStateSave} from '../meta/worldstate';\nimport {ODYSSEY_CFG,ODYSSEY_FACTIONS,odysseyQuestId} from '../data/odyssey';\nimport {odysseyReadiness,odysseyAct} from '../world/odyssey';\nimport {freezeData} from './random';\nexport interface NativeOdysseyGroundTarget {readonly zoneId:string;readonly faction:string;readonly level:number;readonly escortCount:number}\nexport interface NativeOdysseyGroundRefresh {readonly version:1;readonly pending:readonly NativeOdysseyGroundTarget[]}\nfunction keys(value:unknown,expected:string):asserts value is Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).sort().join(',')!==expected)throw Error('Malformed retained Odyssey ground refresh');for(const d of Object.values(Object.getOwnPropertyDescriptors(value)))if(!Object.hasOwn(d,'value'))throw Error('Retained ground refresh needs plain data');}\nexport function validateNativeOdysseyGroundRefresh(raw:unknown,world:WorldStateSave):NativeOdysseyGroundRefresh {\n keys(raw,'pending,version');if(raw.version!==1||!Array.isArray(raw.pending)||!raw.pending.length||raw.pending.length>ODYSSEY_FACTIONS.length)throw Error('Invalid retained Odyssey ground refresh version or count');\n const state=world.odyssey;if(!state||!Array.isArray(state.roster)||!Array.isArray(state.defeated)||!Array.isArray(state.prepared))throw Error('Deferred ground refresh has no actual campaign state');\n const seen=new Set<string>(),factions=new Set<string>(),pending:NativeOdysseyGroundTarget[]=[];\n for(const row of raw.pending){keys(row,'escortCount,faction,level,zoneId');const {zoneId,faction,level,escortCount}=row;if(typeof faction!=='string'||typeof zoneId!=='string'||!ODYSSEY_FACTIONS.some(f=>f.id===faction)||zoneId!=='quest_'+odysseyQuestId(faction,'leader')||seen.has(zoneId)||factions.has(faction))throw Error('Deferred ground refresh is unknown or duplicated');\n  if(typeof level!=='number'||!Number.isSafeInteger(level)||level<=0||typeof escortCount!=='number'||!Number.isSafeInteger(escortCount)||escortCount<0)throw Error('Deferred ground refresh target is invalid');\n  const zones=world.zones.filter(z=>z.id===zoneId),z=zones[0],count=state.prepared.includes(faction)?0:ODYSSEY_CFG.escortPerAct[Math.min(3,odysseyAct(state))];if(!state.roster.includes(faction)||state.defeated.includes(faction)||level!==odysseyReadiness(state)||escortCount!==count||zones.length!==1||!z||z.level!==level||z.packs?.count[0]!==escortCount||z.packs.count[1]!==escortCount||z.packs.size[0]!==1||z.packs.size[1]!==1)throw Error('Deferred ground refresh differs from its actual saved definition or campaign');\n  const installed=ODYSSEY_FACTIONS.find(f=>f.id===faction)!;if(z.objective?.kind!=='boss'||z.objective.id!==installed.leader||z.packs.count.length!==2||z.packs.size.length!==2||z.packs.table.length!==1||z.packs.table[0].id!==installed.escort||z.packs.table[0].weight!==1)throw Error('Deferred ground refresh differs from its installed leader or escorts');\n  const memories=world.memory?.filter(m=>m.zoneId===zoneId);if(memories?.length!==1||!Array.isArray(memories[0].enemies))throw Error('Deferred occupied ground has no preserved memory');seen.add(zoneId);factions.add(faction);pending.push({zoneId,faction,level,escortCount});\n }\n return freezeData({version:1 as const,pending});\n}\n",
      "hunks": [
        {
          "before": "",
          "after": "import {ZONE_MEMORY_CFG} from '../engine/zonecontents';\n"
        },
        {
          "before": "import {odysseyReadiness,odysseyAct} from '../world/odyssey';\n",
          "after": "import {odysseyReadiness,odysseyAct,restoreOdyssey} from '../world/odyssey';\n"
        },
        {
          "before": " const state=world.odyssey;if(!state||!Array.isArray(state.roster)||!Array.isArray(state.defeated)||!Array.isArray(state.prepared))throw Error('Deferred ground refresh has no actual campaign state');\n",
          "after": " const rawState=world.odyssey;if(!rawState||rawState.version!==1||!Array.isArray(rawState.roster)||rawState.roster.length!==ODYSSEY_CFG.rosterSize||new Set(rawState.roster).size!==rawState.roster.length||rawState.roster.some(id=>!ODYSSEY_FACTIONS.some(f=>f.id===id))||!Array.isArray(rawState.defeated)||!Array.isArray(rawState.prepared))throw Error('Deferred ground refresh has no actual campaign state');\n // The valid roster gate makes native restoration independent of fallback seed/ledger.\n const state=restoreOdyssey(rawState,0,{});\n"
        },
        {
          "before": "  const memories=world.memory?.filter(m=>m.zoneId===zoneId);if(memories?.length!==1||!Array.isArray(memories[0].enemies))throw Error('Deferred occupied ground has no preserved memory');seen.add(zoneId);factions.add(faction);pending.push({zoneId,faction,level,escortCount});\n",
          "after": "  const memories=world.memory?.filter(m=>m.zoneId===zoneId);if(memories?.length!==1||!Array.isArray(memories[0].enemies))throw Error('Deferred occupied ground has no preserved memory');const memory=memories[0];if(typeof memory.seed!=='number'||!Number.isFinite(memory.seed)||typeof memory.savedAt!=='number'||!Number.isFinite(memory.savedAt)||Math.max(0,world.time)-memory.savedAt>=ZONE_MEMORY_CFG.ttl)throw Error('Deferred occupied ground memory cannot survive native restoration');seen.add(zoneId);factions.add(faction);pending.push({zoneId,faction,level,escortCount});\n"
        }
      ]
    }
  ],
  "nativeFiles": [
    {
      "file": "src/world/odyssey.ts",
      "sha256": "e1f61f3f45154772c9e79066588136cc7efb3731e2da74cb40798b014a032580"
    },
    {
      "file": "src/engine/nativeCharacterRestoration.ts",
      "sha256": "1c543e476e6e29efc0930a88f5318b43f3caeae6766f588bff356743de969997"
    },
    {
      "file": "src/worldmass/nativeRetainedSave.ts",
      "sha256": "2afef135cd3b5a3ab52eae8353dec2b0d45aea8cb3b2984f53e3bc74daf823c9"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "sha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    }
  ],
  "reader": {
    "file": "balance/probe_nativeodysseygroundsource.ts",
    "before": "import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import {nativeOdysseyGroundArchive as archive} from './nativeOdysseyGroundArchive';import {beforeNativeOdysseyGround as before} from './nativeOdysseyGroundFixtureSource';import {combatHash,writeCombatProof} from './probe_nativecombatcycle';\nlet mutations=0,duplicates=0,portable=0,outside=0;for(const row of archive.rows){const raw=fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8').replaceAll('\\r\\n','\\n');assert.equal(combatHash(raw),row.afterHash);assert.equal(before(row.file,raw),row.before);assert.equal(combatHash(row.before),row.beforeHash);let line=0;for(const text of [raw,raw.replaceAll('\\n','\\r\\n'),raw.replace(/\\n/g,()=>++line%2?'\\r\\n':'\\n')]){assert.equal(before(row.file,text),row.before);portable++;}for(const h of row.hunks){const changed=h.after.replace(/[a-z]/,'!');assert.notEqual(changed,h.after);assert.throws(()=>before(row.file,raw.replace(h.after,changed)));mutations++;assert.throws(()=>before(row.file,raw+'\\n'+h.after));duplicates++;}assert.throws(()=>before(row.file,raw+'\\n// unknown outside delta\\n'));outside++;}\nfor(const row of archive.newFiles){const raw=fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8').replaceAll('\\r\\n','\\n');assert.equal(combatHash(raw),row.sha256);assert.notEqual(combatHash(raw+'\\n// altered'),row.sha256);}\nconst body=(file:string,text:string,name:string)=>{const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),node=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(node&&ts.isFunctionDeclaration(node)&&node.body);return node.body.getText(sf);};const quest=archive.rows.find(r=>r.file==='src/engine/nativeSceneQuests.ts')!,q=fs.readFileSync(new URL('../'+quest.file,import.meta.url),'utf8').replaceAll('\\r\\n','\\n');assert.equal(body(quest.file,q,'scenePrepareOdysseyGround').replace('    afterDelete?.(z);\\n',''),body(quest.file,quest.before,'scenePrepareOdysseyGround'));\nconst save=archive.rows.find(r=>r.file==='src/worldmass/nativeRetainedSave.ts')!,next=fs.readFileSync(new URL('../'+save.file,import.meta.url),'utf8').replaceAll('\\r\\n','\\n');for(const name of ['makeNativeRetainedSave','makeNativeCatalogRetainedSave','readNativeCatalogSave'])assert.equal(body(save.file,next,name),body(save.file,save.before,name));assert.equal(body(save.file,next,'readNativeRetainedSave').replace(' if(envelope.version===3)return readNativeGroundSave(save,clean,envelope);\\n',''),body(save.file,save.before,'readNativeRetainedSave'));\nconst report={files:archive.rows.length,newFiles:archive.newFiles.length,mutations,duplicates,portable,outside,nativeResetBody:'exact except successful-delete observer',legacyEnvelopeBodies:4,stage1:archive.stage1};writeCombatProof('native-odyssey-ground-source.json',report);console.log(JSON.stringify(report));\r\n",
    "sha256": "07656a15c5a033dec928eb42f13e00d0de0b3a12d5061e3f635281248386ab79"
  }
} as const;
