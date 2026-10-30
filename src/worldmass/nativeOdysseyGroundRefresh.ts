import {ZONE_MEMORY_CFG} from '../engine/zonecontents';
/** Plain deferred Odyssey refresh data. It grants no live area authority. */
import type {WorldStateSave} from '../meta/worldstate';
import {ODYSSEY_CFG,ODYSSEY_FACTIONS,odysseyQuestId} from '../data/odyssey';
import {odysseyReadiness,odysseyAct,restoreOdyssey} from '../world/odyssey';
import {freezeData} from './random';
export interface NativeOdysseyGroundTarget {readonly zoneId:string;readonly faction:string;readonly level:number;readonly escortCount:number}
export interface NativeOdysseyGroundRefresh {readonly version:1;readonly pending:readonly NativeOdysseyGroundTarget[]}
function keys(value:unknown,expected:string):asserts value is Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).sort().join(',')!==expected)throw Error('Malformed retained Odyssey ground refresh');for(const d of Object.values(Object.getOwnPropertyDescriptors(value)))if(!Object.hasOwn(d,'value'))throw Error('Retained ground refresh needs plain data');}
export function validateNativeOdysseyGroundRefresh(raw:unknown,world:WorldStateSave):NativeOdysseyGroundRefresh {
 keys(raw,'pending,version');if(raw.version!==1||!Array.isArray(raw.pending)||!raw.pending.length||raw.pending.length>ODYSSEY_FACTIONS.length)throw Error('Invalid retained Odyssey ground refresh version or count');
 const rawState=world.odyssey;if(!rawState||rawState.version!==1||!Array.isArray(rawState.roster)||rawState.roster.length!==ODYSSEY_CFG.rosterSize||new Set(rawState.roster).size!==rawState.roster.length||rawState.roster.some(id=>!ODYSSEY_FACTIONS.some(f=>f.id===id))||!Array.isArray(rawState.defeated)||!Array.isArray(rawState.prepared))throw Error('Deferred ground refresh has no actual campaign state');
 // The valid roster gate makes native restoration independent of fallback seed/ledger.
 const state=restoreOdyssey(rawState,0,{});
 const seen=new Set<string>(),factions=new Set<string>(),pending:NativeOdysseyGroundTarget[]=[];
 for(const row of raw.pending){keys(row,'escortCount,faction,level,zoneId');const {zoneId,faction,level,escortCount}=row;if(typeof faction!=='string'||typeof zoneId!=='string'||!ODYSSEY_FACTIONS.some(f=>f.id===faction)||zoneId!=='quest_'+odysseyQuestId(faction,'leader')||seen.has(zoneId)||factions.has(faction))throw Error('Deferred ground refresh is unknown or duplicated');
  if(typeof level!=='number'||!Number.isSafeInteger(level)||level<=0||typeof escortCount!=='number'||!Number.isSafeInteger(escortCount)||escortCount<0)throw Error('Deferred ground refresh target is invalid');
  const zones=world.zones.filter(z=>z.id===zoneId),z=zones[0],count=state.prepared.includes(faction)?0:ODYSSEY_CFG.escortPerAct[Math.min(3,odysseyAct(state))];if(!state.roster.includes(faction)||state.defeated.includes(faction)||level!==odysseyReadiness(state)||escortCount!==count||zones.length!==1||!z||z.level!==level||z.packs?.count[0]!==escortCount||z.packs.count[1]!==escortCount||z.packs.size[0]!==1||z.packs.size[1]!==1)throw Error('Deferred ground refresh differs from its actual saved definition or campaign');
  const installed=ODYSSEY_FACTIONS.find(f=>f.id===faction)!;if(z.objective?.kind!=='boss'||z.objective.id!==installed.leader||z.packs.count.length!==2||z.packs.size.length!==2||z.packs.table.length!==1||z.packs.table[0].id!==installed.escort||z.packs.table[0].weight!==1)throw Error('Deferred ground refresh differs from its installed leader or escorts');
  const memories=world.memory?.filter(m=>m.zoneId===zoneId);if(memories?.length!==1||!Array.isArray(memories[0].enemies))throw Error('Deferred occupied ground has no preserved memory');const memory=memories[0];if(typeof memory.seed!=='number'||!Number.isFinite(memory.seed)||typeof memory.savedAt!=='number'||!Number.isFinite(memory.savedAt)||Math.max(0,world.time)-memory.savedAt>=ZONE_MEMORY_CFG.ttl)throw Error('Deferred occupied ground memory cannot survive native restoration');seen.add(zoneId);factions.add(faction);pending.push({zoneId,faction,level,escortCount});
 }
 return freezeData({version:1 as const,pending});
}
