import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { makeSkillGem } from '../src/engine/skills';
import { findBagGem, freeCellCount } from '../src/engine/gemitems';
import { skillPreparationHtml, SKILL_PREPARATION_CFG } from '../src/ui/skillPreparation';
import { dialogueConditionMet } from '../src/engine/npcDialogues';
import { LEDGER_FLASK_LESSON } from '../src/meta/account';
import type { MetaAction } from '../src/net/intent';

const labels = ['LMB','RMB','1','2','3','4','5','6'];
const create = () => {
  const w = makeSimWorld('magician', 421);
  const a = w.createMonster('townsfolk_innkeep', 1, 'player'); a.pos = {...w.player.pos}; w.actors.push(a);
  for (let i=0;i<100;i++) w.update(1/60);
  assert.equal(w.mireilleGiftLesson(), 'learn');
  return w;
};
const snapshot = (w: ReturnType<typeof create>) => JSON.stringify({
  bar: w.player.skills.map(s=>s?.def.id), bag: w.meta.items, ledger: w.ledger,
  life: w.player.life, mana: w.player.mana, charges: [...w.player.charges], memory: w.account.skillSlotMemory,
});
const uid = (w: ReturnType<typeof create>, id: string) => findBagGem(w.meta.items,'skill',id)!.uid;
const w=create(), untouched=snapshot(w), html=skillPreparationHtml(w,labels);
assert.match(html,/Ready for the road/); assert.match(html,/Place on 2/); assert.match(html,/Place on 3/);
assert.equal(snapshot(w),untouched,'reading cannot fit, fill or grant');
assert.ok(dialogueConditionMet(w,{fact:'mireillePreparingFlasks'}));
w.requestMeta({t:'learn',uid:uid(w,'life_flask'),slot:3,emptyOnly:true});
assert.equal(w.player.skills[3]?.def.id,'life_flask');
assert.match(skillPreparationHtml(w,labels),/Mana Flask/);
assert.doesNotMatch(skillPreparationHtml(w,labels),/<strong>Life Flask/);
assert.ok(w.mireilleGiftLesson());
w.requestMeta({t:'learn',uid:uid(w,'mana_flask'),slot:4,emptyOnly:true});
assert.equal(skillPreparationHtml(w,labels),'');
for(let i=0;i<10;i++)w.update(1/60);
assert.equal(w.account.ledger[LEDGER_FLASK_LESSON],1);
for (const id of ['life_flask','mana_flask']) {
 const inst=w.meta.knownSkills.get(id)!;
 assert.equal(w.player.charges.get(inst.def.chargeCost!.charge),w.player.chargeCapFor(inst.def.chargeCost!.charge,inst));
}
w.player.charges.set('flask_life',0);
for(let i=0;i<10;i++)w.update(1/60);
assert.equal(w.player.charges.get('flask_life'),0,'the presentation cannot repeat the fill');
assert.ok(w.unlearnSkill('life_flask'));assert.equal(skillPreparationHtml(w,labels),'','finished lesson never reopens');
console.log('PASS native dwell gift, pure suggested slots, two validated placements, once-only fill/graduation and intentional removal');

const s=create(), life=uid(s,'life_flask');
let before=snapshot(s);
s.applyAction(s.localSeat,{t:'learn',uid:life,slot:0,emptyOnly:true});
assert.equal(snapshot(s),before,'occupied destination refuses before any swap');
s.player.dead=true;before=snapshot(s);s.applyAction(s.localSeat,{t:'learn',uid:life,slot:3,emptyOnly:true});
assert.equal(snapshot(s),before);assert.equal(skillPreparationHtml(s,labels),'');s.player.dead=false;
s.player.downed=true;before=snapshot(s);s.applyAction(s.localSeat,{t:'learn',uid:life,slot:3,emptyOnly:true});
assert.equal(snapshot(s),before);s.player.downed=false;
before=snapshot(s);s.applyAction(s.localSeat,{t:'learn',uid:life,slot:3,emptyOnly:'yes'} as unknown as MetaAction);
assert.equal(snapshot(s),before,'malformed optional policy refuses');
s.applyAction(s.localSeat,{t:'learn',uid:life,slot:3,emptyOnly:true});
const spare=s.grantSkillGemItem(s.localSeat,makeSkillGem(SKILLS.life_flask,1,'common'))!;
before=snapshot(s);s.applyAction(s.localSeat,{t:'learn',uid:spare.uid,slot:4,emptyOnly:true});
assert.equal(snapshot(s),before,'existing known copy refuses even with an empty target');
s.applyAction(s.localSeat,{t:'learn',uid:spare.uid,slot:3});
assert.equal(s.meta.knownSkills.get('life_flask')?.rarity,'common','ordinary explicit replacement retains native behavior');
console.log('PASS stale occupied/known, dead/downed, invalid policy; native intentional replacement unchanged');

const m=create();
m.account.skillSlotMemory={life_flask:7,mana_flask:6};
assert.match(skillPreparationHtml(m,labels),/Place on 6/);assert.match(skillPreparationHtml(m,labels),/Place on 5/);
const original=SKILLS.life_flask.requirements;
try {SKILLS.life_flask.requirements={strength:9999};assert.match(skillPreparationHtml(m,labels),/Requirements not met/);
 const before=snapshot(m);m.applyAction(m.localSeat,{t:'learn',uid:uid(m,'life_flask'),slot:7,emptyOnly:true});assert.equal(snapshot(m),before);
} finally {SKILLS.life_flask.requirements=original;}
assert.match(skillPreparationHtml(m,['a','b','c','<img onerror=x>','z']),/Place on 8/);
m.account.skillSlotMemory={};
assert.ok(skillPreparationHtml(m,['a','b','c','<img onerror=x>','z']).includes('&lt;img onerror=x&gt;'));
assert.ok(!skillPreparationHtml(m,['a','b','c','<img onerror=x>','z']).includes('<img'));
m.player.skills=m.player.skills.map(s=>s??m.player.skills[0]);
assert.match(skillPreparationHtml(m,labels),/No empty skill slot/);
m.clientActionHook=()=>{};assert.equal(skillPreparationHtml(m,labels),'');m.clientActionHook=undefined;
SKILL_PREPARATION_CFG.enabled=false;assert.equal(skillPreparationHtml(m,labels),'');SKILL_PREPARATION_CFG.enabled=true;
console.log('PASS remembered binds, native requirements, escaped player labels, full bar, mirror and optional presentation');

const packed=makeSimWorld('magician',771);
const keeper=packed.createMonster('townsfolk_innkeep',1,'player');keeper.pos={...packed.player.pos};packed.actors.push(keeper);
while(freeCellCount(packed.meta.items)>1) {
 if(!packed.grantSkillGemItem(packed.localSeat,makeSkillGem(SKILLS.fireball,1,'common')))throw Error('filler failed');
}
for(let i=0;i<100;i++)packed.update(1/60);
assert.ok(packed.mireilleGiftOwed());assert.equal(packed.mireilleGiftLesson(),null);
const packedBefore=snapshot(packed),waiting=skillPreparationHtml(packed,labels);
assert.match(waiting,/Open pack/);assert.match(waiting,/need room/);
assert.doesNotMatch(waiting,/data-prepare-skill/);assert.equal(snapshot(packed),packedBefore);
console.log('PASS an undelivered full-pack gift shows recovery, never a nonexistent skill');
