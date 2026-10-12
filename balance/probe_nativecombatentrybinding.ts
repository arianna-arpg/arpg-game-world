import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
import {Actor} from '../src/engine/actor';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
const setup=nativeCampaignFixture(991),hero=setup.writer.player,oldHealed=hero.onLifeHealed,oldSpent=hero.onLifeSpent;
const results=refuseWorldCombat([setup.writer],calls=>{
 const area=birthActualNativeArea(setup),combat=area.ongoing.combat;
 assert.notEqual(hero.onLifeHealed,oldHealed);assert.notEqual(hero.onLifeSpent,oldSpent);assert.equal(typeof hero.onLifeHealed,'function');assert.equal(typeof hero.onLifeSpent,'function');
 const selectedHealed=hero.onLifeHealed,selectedSpent=hero.onLifeSpent,life=hero.life;
 hero.payCost({mana:0,life:2});assert.equal(hero.life,life-2);assert.equal(hero.healBy(2),2);assert.equal(hero.life,life);
 assert.equal(hero.onLifeHealed,selectedHealed);assert.equal(hero.onLifeSpent,selectedSpent);
 const p={returnMode:1,returnPhase:false,hits:new Map([[1,0]]),traveled:17,range:25},pBefore=structuredClone(p);
 assert.throws(()=>combat.enterReturn(p as never),/native combat operation|issued record|native record selection/i);assert.deepEqual(p,pBefore);
 const q={speed:100,accel:1,stall:.5,age:0,traveled:0,pulse:0,landAt:{x:10,y:0},pos:{x:0,y:0},dir:0,guideDir:0},qBefore=structuredClone(q);
 assert.throws(()=>combat.advanceProjectile(q as never,.1),/native combat operation|issued record|native record selection/i);assert.deepEqual(q,qBefore);
 const foreign=new Actor('foreign status sheet','enemy',{x:0,y:0}),z={domainAffected:new Set([foreign]),domain:{allyMods:[],enemyMods:[]},caster:combat.scene.player,tier:combat.scene.player.tier,domainKey:'critic-foreign-row'};
 let removals=0;const remove=foreign.sheet.removeSource;foreign.sheet.removeSource=function(key){removals++;return Reflect.apply(remove,this,[key]);};
 assert.throws(()=>combat.updateZoneDomain(z as never),/native combat operation|issued record|native record selection/i);assert.equal(removals,0);assert.equal(z.domainAffected.size,1);
 const inst=makeSkillInstance(SKILLS.fireball,12);combat.spawnProjectile(hero,inst,{...hero.pos},0);combat.spawnProjectile(hero,inst,{...hero.pos},Math.PI);
 const rows=combat.state.projectiles.slice(-2);assert.equal(rows.length,2);let scopedRefusals=0,sameKindRefusals=0,realSteps=0;
 const advance=combat.advanceProjectile;Object.defineProperty(combat,'advanceProjectile',{configurable:true,value:function(row:Parameters<typeof advance>[0],dt:number){
  assert.throws(()=>Reflect.apply(advance,combat,[q,dt]),/issued record/);assert.deepEqual(q,qBefore);scopedRefusals++;
  const other=rows.find(r=>r!==row)!;assert.throws(()=>Reflect.apply(advance,combat,[other,dt]),/different selected record/);sameKindRefusals++;
  const result=Reflect.apply(advance,combat,[row,dt]);realSteps++;return result;
 }});
 try{combat.updateProjectiles(.001);}finally{Reflect.deleteProperty(combat,'advanceProjectile');}
 assert.ok(realSteps>=2);assert.equal(scopedRefusals,realSteps);assert.equal(sameKindRefusals,realSteps);
 const c={};assert.throws(()=>combat.removeCorpse(c as never),/native combat operation|issued record|native record selection/i);
 assert.equal(calls.length,0);
 return {bodies:combat.scene.actors.length,worldDriverCalls:calls.length,freshBootCallbacks:{healedReplaced:true,spentReplaced:true,realCost:2,realHeal:2},forgedRowsRefusedBeforeMutation:4,activeSelectedRows:{realSteps,scopedRefusals,sameKindRefusals}};
});
fs.writeFileSync(new URL('../../ACTIVATION-RECORD-ENTRY-RESULT.v4.json',import.meta.url),JSON.stringify({status:'PASS',boundary:'Fresh native boot callback migration and actual owner helper refusals; not mid-combat tracker adoption or complete frame acceptance',results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
