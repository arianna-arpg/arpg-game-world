import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { makeSkillGem } from '../src/engine/skills';
import { bagSkillSupport, freeCellCount, skillGemPayloadOf } from '../src/engine/gemitems';
import { NullInput, type MetaAction } from '../src/net/intent';
import { serializeCharacter, rebuildSavedMeta } from '../src/meta/character';
import { storedSupportsHtml } from '../src/ui/storedSupports';
import { canonical } from '../src/worldmass/random';

const restore=seedGlobalRandom(4781);
try {
 const w=makeSimWorld('magician',4781),seat=w.localSeat,m=seat.meta;
 const inst=makeSkillGem(SKILLS.firebolt,4,'rare');
 inst.locked=true;inst.empowermentRank=2;inst.replenishmentPaused=true;
 inst.sockets[0]={def:SUPPORTS.splitting,level:3,locked:true,rolled:{shape:'test-native-cargo'}};
 inst.sockets[2]={def:SUPPORTS.arcing,level:2};
 const item=w.grantSkillGemItem(seat,inst)!,p=skillGemPayloadOf(item)!;
 const original=JSON.parse(canonical(item));
 const read=bagSkillSupport(item,0)!;read.rolled!.shape='separate';
 assert.equal(p.sockets[0]!.rolled!.shape,'test-native-cargo','UI reader cannot edit cargo');
 const active=m.knownSkills.get('firebolt')!,liveBefore=canonical([active.sockets,[...w.player.cooldowns],w.player.skills.map(s=>s?.def.id??null)]);
 const html=storedSupportsHtml(m.items,null);
 assert.ok(html.includes('Remove Splitting')&&html.includes('Remove Arcing'));
 item.name='<unsafe name>';assert.ok(storedSupportsHtml(m.items,null).includes('&lt;unsafe name&gt;'));item.name=original.name;
 const count=m.items.length;
 w.requestMeta({t:'unsocketBagSkill',uid:item.uid,socket:0});
 assert.equal(p.sockets[0],null);assert.equal(m.items.length,count+1);assert.ok(item.locked);
 const support=m.items.find(i=>i.gem?.kind==='support'&&i.gem.supportId==='splitting')!;
 assert.ok(support.locked);assert.equal(support.gem!.kind,'support');
 if(support.gem!.kind==='support'){assert.equal(support.gem!.level,3);assert.deepEqual(support.gem!.rolled,{shape:'test-native-cargo'});}
 original.gem.sockets[0]=null;assert.equal(canonical(item),canonical(original),'only the selected cargo cell changes');
 assert.equal(canonical([active.sockets,[...w.player.cooldowns],w.player.skills.map(s=>s?.def.id??null)]),liveBefore,'active skill is not replaced or recalculated');
 assert.equal(w.unsocketBagSkill(item.uid,0),false,'duplicate request cannot mint again');
 assert.equal(m.items.length,count+1);
 const saved=serializeCharacter(w),rebuilt=rebuildSavedMeta(saved)!;
 assert.equal(canonical(rebuilt.meta.items.find(i=>i.uid===item.uid)!.gem),canonical(item.gem));
 assert.equal(canonical(rebuilt.meta.items.find(i=>i.uid===support.uid)!.gem),canonical(support.gem));
 assert.ok(w.socketSupport(support.uid,'firebolt'));assert.equal(active.sockets[0]?.def.id,'splitting');
 assert.ok(active.sockets[0]?.locked);assert.equal(active.sockets[0]?.level,3);
 console.log('PASS exact stored cargo, locked/rolled support, native removal/fitting and checkpoint persistence');

 const peer=w.addSeat('support-test-peer',CLASSES.find(c=>c.id==='warrior')!,new NullInput());
 const bagBefore=canonical([m.items,peer.meta.items]);
 w.applyAction(peer,{t:'unsocketBagSkill',uid:item.uid,socket:2});
 assert.equal(canonical([m.items,peer.meta.items]),bagBefore,'a peer cannot name another seat\'s item');
 for(const action of [
  {t:'unsocketBagSkill',uid:item.uid,socket:-1},{t:'unsocketBagSkill',uid:item.uid,socket:.5},
  {t:'unsocketBagSkill',uid:item.uid,socket:'2'},{t:'unsocketBagSkill',uid:String(item.uid),socket:2},
  {t:'unsocketBagSkill',uid:item.uid,socket:999},{t:'unsocketBagSkill',uid:-1,socket:2}])
  w.applyAction(seat,action as unknown as MetaAction);
 assert.equal(canonical([m.items,peer.meta.items]),bagBefore);
 const row=p.sockets[2]!;row.supportId='__proto__';
 assert.equal(w.unsocketBagSkill(item.uid,2),false);assert.equal(row.supportId,'__proto__');row.supportId='arcing';
 console.log('PASS host seat ownership, stale/malformed index and unknown support refusal');

 // Native bag capacity refuses before either owner changes.
 while(freeCellCount(m.items)>0)assert.ok(w.grantSupportGemItem(seat,{def:SUPPORTS.splitting,level:1}));
 const full=canonical(m.items);assert.equal(w.unsocketBagSkill(item.uid,2),false);assert.equal(canonical(m.items),full);
 m.items.pop();
 const field=Object.values(w.zoneMap).find(z=>!z.boundless&&z.objective?.kind!=='safe')!;
 w.loadZone(field.id);for(const a of w.actors)if(a.team==='enemy')a.dead=true;
 w.lastCombatAt=w.time;
 const hot=canonical(m.items);assert.equal(w.unsocketBagSkill(item.uid,2),false);assert.equal(canonical(m.items),hot);
 assert.ok(storedSupportsHtml(m.items,w.swapRefusal(seat,'unsocket')).includes('disabled title="the blood is still hot"'));
 w.lastCombatAt=-999;
 w.devGrabSpawn('dire_wolf');const foe=w.actors[w.actors.length-1];foe.pos={x:w.player.pos.x+50,y:w.player.pos.y};
 assert.equal(w.unsocketBagSkill(item.uid,2),false);assert.equal(canonical(m.items),hot);
 foe.dead=true;
 assert.ok(w.unsocketBagSkill(item.uid,2));assert.equal(p.sockets[2],null);
 assert.equal(storedSupportsHtml(m.items,null),'','empty stored skills add no clutter');
 console.log('PASS full-bag atomic refusal, shared hot/near-foe gates and calm retry');
} finally {restore();}
