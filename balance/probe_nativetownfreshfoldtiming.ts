import '../src/engine/world';
import assert from 'node:assert/strict';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {CLASSES} from '../src/data/classes';
import {START_ZONE} from '../src/data/zones';
import {FEATURE} from '../src/meta/account';
import {withSeededRandom} from '../src/core/rng';
import {freshClientSetup,refuseWorldStartup} from './nativeClientStartFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
function course(retained:boolean,when:'before-install'|'party-join'){
 return withSeededRandom(45101,()=>{
  const {writer,geography}=freshClientSetup(1241,false),trace:string[]=[];
  const unlock=()=>{writer.account.features.add(FEATURE.SALVAGE_STATION);writer.account.features.add(FEATURE.BOUNTY_BOARD);};
  if(when==='before-install')unlock();
  writer.events.on('party/join',()=>{trace.push('join:'+writer.arena.w+':'+writer.zoneMap[START_ZONE].size.w);if(when==='party-join')unlock();});
  const facts=()=>({when,trace,width:writer.arena.w,definition:writer.zoneMap[START_ZONE].size.w,tier:writer['townTierIdx'],changed:writer['townLayoutChangedOnLoad'],anchors:(['salvage','bounty_board'] as const).map(id=>writer.stationAnchor(id)?.pos),hero:{class:writer.meta.classDef.id,life:writer.player.life,visited:[...writer.visited],seats:writer.seats.length}});
  if(!retained){writer.createPlayer(CLASSES[0]);return facts();}
  return refuseWorldStartup([writer],drivers=>{const runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:geography.spec,fresh:{classDef:CLASSES[0]}});runtime.install();const current=runtime.current;assert.equal(current.assembly.input.settlement.input.state.townTierIdx,writer['townTierIdx']);assert.equal(current.combat.runtimeState.frame.townLayoutChangedOnLoad,writer['townLayoutChangedOnLoad']);const result=facts();assert.equal(writer.actors.filter(a=>a===writer.localSeat.actor).length,1);assert.equal(new Set(writer.actors).size,writer.actors.length);assert.deepEqual(drivers,[]);runtime.retire();return result;});
 });
}
const results=[];for(const when of ['before-install','party-join'] as const){const ordinary=course(false,when),retained=course(true,when);assert.deepEqual(retained,ordinary);assert.equal(retained.width,1700);assert.deepEqual(retained.trace,['join:1400:1400']);results.push(retained);}
const report={scope:'Exact original first-load folding after actual party/join, including acquired-before-install and acquired-in-join account features; no duplicate hero or foreign World driver.',results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-town-fresh-fold-timing.json',report);console.log(JSON.stringify(report));
