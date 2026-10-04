import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { castMovementHeld, drawCastName } from '../src/render/vis/castReadout';
import { mod } from '../src/engine/stats';
import { VIS_CFG } from '../src/render/vis/visConfig';

const w=makeSimWorld('magician',724),p=w.player;w.actors=[p];p.invulnerable=true;
const fire=makeSkillInstance(SKILLS.firebolt,1,1);p.skills[0]=fire;
assert.ok(w.useSkill(p,fire,{x:p.pos.x+200,y:p.pos.y},true));
const before=JSON.stringify([p.pos,p.life,p.mana,p.casting?.elapsed,p.casting?.total,w.time]);
assert.equal(castMovementHeld(w,p),true);
const start={...p.pos};w.moveActor(p,1,0,.1);assert.deepEqual(p.pos,start);
assert.equal(JSON.stringify([p.pos,p.life,p.mana,p.casting?.elapsed,p.casting?.total,w.time]),before);
const text:{s:string;y:number}[]=[];
const ctx={save(){},restore(){},measureText(s:string){return {width:Array.from(s).length*6};},
 strokeText(){},fillText(s:string,_x:number,y:number){text.push({s,y});}} as unknown as CanvasRenderingContext2D;
drawCastName(ctx,p,0,0,104,VIS_CFG.castReadout.plantedText);
assert.deepEqual(text.map(t=>t.s),['Firebolt','Feet planted']);assert.ok(text[0].y<text[1].y);
assert.equal(JSON.stringify([p.pos,p.life,p.mana,p.casting?.elapsed,p.casting?.total,w.time]),before);
console.log('PASS native planted cast, refused actual movement and read-only two-line presentation');

p.sheet.setSource('probe:mobile',[mod('castMobility','flat',.5)]);
assert.equal(castMovementHeld(w,p),false);w.moveActor(p,1,0,.1);assert.ok(p.pos.x>start.x);
p.sheet.removeSource('probe:mobile');w.clientActionHook=()=>{};
assert.equal(castMovementHeld(w,p),false,'unresolved client cannot derive a false rooted read');
delete w.clientActionHook;
p.downed=true;assert.equal(castMovementHeld(w,p),false);p.downed=false;
p.dead=true;assert.equal(castMovementHeld(w,p),false);p.dead=false;
const foe=w.createMonster('zombie',1,'enemy');foe.casting=p.casting;assert.equal(castMovementHeld(w,foe),false);
p.casting=null;assert.equal(castMovementHeld(w,p),false);
console.log('PASS native mobility investment, authoritative-owner gate and dead/downed/idle exclusions');

const guardWorld=makeSimWorld('warrior',725),g=guardWorld.player;guardWorld.actors=[g];
assert.ok(guardWorld.useSkill(g,g.skills[1]!,{x:g.pos.x+200,y:g.pos.y},true));
assert.equal(g.casting?.mode,'guard');assert.equal(castMovementHeld(guardWorld,g),false);
const guardPos={...g.pos};guardWorld.moveActor(g,1,0,.1);assert.ok(Math.hypot(g.pos.x-guardPos.x,g.pos.y-guardPos.y)>0);
const capped=makeSimWorld('magician',726),a=capped.player;capped.actors=[a];a.fillResources();
const hold=makeSkillInstance(SKILLS.frost_storm,1,1);assert.ok(capped.useSkill(a,hold,{x:a.pos.x+200,y:a.pos.y},true));
assert.equal(a.casting?.mode,'channel');assert.equal(castMovementHeld(capped,a),true);
a.sheet.setSource('probe:channel',[mod('channelMobility','flat',1)]);
assert.equal(castMovementHeld(capped,a),false);
console.log('PASS actual mobile guard and native channel mobility use the same movement law');
