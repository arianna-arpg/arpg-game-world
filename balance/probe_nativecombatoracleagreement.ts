/** Execute actual retained acceptance first, then an independent ordinary World
 * oracle. The comparison is a named behavior projection, not whole-area equality. */
import './probe_nativecombatacceptance';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {NATIVE_COMBAT_COURSES,ordinaryWorldCourse,writeCombatProof,combatHash} from './probe_nativecombatcycle';
interface RetainedRow{name:string;accepted:boolean;casting:boolean;trace:string[];targetLife:number;targetDead:boolean;spawned:{def:string|undefined;construct:boolean}[];objectiveDone:boolean;queues:{projectiles:number;zones:number};worldDrivers:string[]}
const retained=JSON.parse(fs.readFileSync(new URL('./reports/native-combat-actual-acceptance.json',import.meta.url),'utf8')) as {courses:number;receipt:string;results:RetainedRow[]};assert.equal(retained.courses,NATIVE_COMBAT_COURSES.length,'all actual retained courses must execute in this process');
const rows=NATIVE_COMBAT_COURSES.map((course,index)=>{const actual=retained.results[index],oracle=ordinaryWorldCourse(course,44001+index).value,body=oracle.projection.actors.find(a=>a.label==='target');assert.ok(body);assert.deepEqual(actual.worldDrivers,[]);const native={accepted:oracle.accepted,casting:oracle.started,trace:oracle.trace,targetLife:body.life,targetDead:body.dead},projected={accepted:actual.accepted,casting:actual.casting,trace:actual.trace,targetLife:actual.targetLife,targetDead:actual.targetDead};assert.deepEqual(projected,native,'actual retained versus ordinary native cast/hit/death trace: '+course.name);
 if(course.objective)assert.equal(actual.objectiveDone,oracle.projection.objectiveDone);
 return{name:course.name,projection:projected,objectiveCompared:!!course.objective};
});const report={mode:'Nine newly executed actual-born retained courses versus independent ordinary World: exact cast acceptance/start, complete selected-method trace, target life/death and explicit final-clear completion. Whole scene/loot/RNG/controller equality is not asserted by this projection; no World provider in retained lane.',retainedReceipt:retained.receipt,rows,receipt:combatHash(JSON.stringify(rows))};writeCombatProof('native-combat-oracle-agreement.json',report);console.log(JSON.stringify({courses:rows.length,receipt:report.receipt}));
