import '../src/engine/world';
import assert from 'node:assert/strict';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {FEATURE} from '../src/meta/account';
import {clientSetup} from './nativeClientRuntimeFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
const result=withSeededRandom(45926,()=>{const {writer,definition,geography}=clientSetup(45926),town=writer.zone.id;return refuseWorldCombat([writer],drivers=>{const runtime=new NativeClientRuntime({writer,definition,geography:geography.spec});runtime.install();const c=runtime.current.combat.input.coordinator; c.runFrom(runtime.current,()=>c.loadZone(town));const first=runtime.current,old=first.assembly.input.geometry.arena.w;assert.equal(writer.stationAnchor('salvage'),null);c.runFrom(first,()=>c.loadZone(definition.id));writer.account.features.add(FEATURE.SALVAGE_STATION);writer.account.features.add(FEATURE.BOUNTY_BOARD);c.runFrom(runtime.current,()=>c.loadZone(town));const row={sameTown:first===runtime.current,before:old,after:first.assembly.input.geometry.arena.w,anchor:writer.stationAnchor('salvage'),features:[...writer.account.features],drivers};console.log(JSON.stringify(row));return row;});});assert.ok(result.anchor,'actual newly unlocked station must stand on retained return');assert.ok(result.after>result.before,'native tier growth must be applied');
