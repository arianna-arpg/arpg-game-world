import '../src/engine/world';
import assert from 'node:assert/strict';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {newOdyssey,defeatOdysseyLeader} from '../src/world/odyssey';
import {ODYSSEY_RISINGS,risingTag} from '../src/data/odysseyRisings';
import {clientSetup} from './nativeClientRuntimeFixture';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
import {dist,vec} from '../src/core/math';
const rows=[];
for(const def of ODYSSEY_RISINGS)rows.push(withSeededRandom(59003,()=>{const setup=clientSetup(45927),{writer,geography,definition}=setup;const state=newOdyssey(writer.manifest.seed,writer.account.ledger);state.roster=['goblin','bandit','undead','gnoll'];assert(defeatOdysseyLeader(state,'gnoll'));state.initialized=true;writer.odyssey.restore(state);
return refuseWorldCombat([writer],calls=>{const runtime=new NativeClientRuntime({writer,definition,geography:geography.spec});runtime.install();const area=runtime.current,g=area.assembly.input.geometry;const step=()=>runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});
const sources=g.doodads.filter(d=>!d.gone&&(d.tier??0)===0&&def.sourceKinds.includes(d.kind));assert(sources.length,'actual generated field needs installed rising scenery');let selected:typeof sources[number]|undefined;
for(const d of sources){for(let i=0;i<8;i++){const at=g.findFreeSpot(vec(d.pos.x+320*Math.cos(i*Math.PI/4),d.pos.y+320*Math.sin(i*Math.PI/4)),writer.player.radius);if(dist(at,d.pos)<def.sourceRange[0]||dist(at,d.pos)>def.sourceRange[1])continue;writer.player.pos=at;writer.time=125;step();writer.odyssey.state!.risings![def.id].nextAt=writer.time;step();if(g.flashes.some(f=>f.fx===def.cue.fx&&f.life>0)){selected=d;break;}}if(selected)break;}
assert(selected,'native source selection must find actual warned ground');const patches=g.flashes.filter(f=>f.fx===def.cue.fx&&f.life>0);assert(patches.length>0);assert.equal(g.actors.filter(a=>a.tag===risingTag(def.id)).length,0);writer.time+=def.warningSec;step();const risen=g.actors.filter(a=>a.tag===risingTag(def.id));assert(risen.length>0);for(const actor of risen){area.authority.require(actor);assert(actor.fromZoneGen);assert(patches.some(f=>dist(f.pos,actor.pos)<.001));assert.equal(actor.level,definition.level);}assert.deepEqual(calls,[]);const row={id:def.id,generatedSources:sources.length,source:selected.kind,warnings:patches.length,born:risen.map(a=>a.defId),claimed:true,worldDrivers:calls.length};runtime.retire();return row;});}));
const report={scope:'Installed rising rows through actual generated scenery, native warning/placement and full retained frames; explicit night/clock/physical-position fixtures.',rows,receipt:combatHash(JSON.stringify(rows))};writeCombatProof('native-odyssey-risings-first.json',report);console.log(JSON.stringify(report));
