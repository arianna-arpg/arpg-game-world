import test from 'node:test';
import assert from 'node:assert/strict';
import {skillAcquisition, supportRules, supportMatchesTags, compareEntries, matchesQuery} from '../site/assets/database-rules.js';
import {supportFitsTags} from '../src/engine/skills.ts';
import {SUPPORTS} from '../src/data/supports.ts';
import {SKILLS} from '../src/data/skills.ts';

test('website compatibility agrees with the game for every support and authored skill tag pool', () => {
  const pools=[...new Set(Object.values(SKILLS).map(skill=>JSON.stringify(skill.tags||[])))].map(value=>JSON.parse(value));
  for(const support of Object.values(SUPPORTS)) for(const tags of pools) {
    assert.equal(supportMatchesTags(support,tags),supportFitsTags(support,tags),support.id+' / '+tags.join(','));
  }
});

test('skill acquisition separates learnability from normal gem drops', () => {
  assert.deepEqual(skillAcquisition({id:'fireball'}), {learnable:true,droppable:true});
  assert.deepEqual(skillAcquisition({id:'gift',dropWeight:0}), {learnable:true,droppable:false});
  assert.deepEqual(skillAcquisition({id:'command_detonate',noDrop:true}), {learnable:false,droppable:false});
  assert.deepEqual(skillAcquisition({id:'alight',raw:{noDrop:true}}), {learnable:false,droppable:false});
  assert.deepEqual(skillAcquisition({id:'legacy',monsterOnly:true}), {learnable:false,droppable:false});
});

test('support tag gate accepts any requirement, honors every veto and keeps mechanics distinct', () => {
  const echo={raw:{requiresTags:['spell'],excludeTags:['channel']}};
  assert.equal(supportMatchesTags(echo,['spell','fire']),true);
  assert.equal(supportMatchesTags(echo,['spell','channel']),false);
  assert.equal(supportMatchesTags(echo,['attack']),false);
  assert.equal(supportMatchesTags({requiresTags:['attack','spell']},['attack']),true);
  assert.equal(supportMatchesTags({requiresTags:['attack','spell']},['spell']),true);
  assert.equal(supportMatchesTags({requiresMechanisms:['cooldown'],grantsTags:['fire']},['cold']),true);
  assert.deepEqual(supportRules({raw:{requiresMechanisms:['cooldown']}}).requiresMechanisms,['cooldown']);
});

test('recommended order retains all skills, alphabetizes both acquisition groups and remains transitive for mixed entries', () => {
  const entries=[{type:'skill',id:'alight',name:'Alight',raw:{noDrop:true}},{type:'skill',id:'shield',name:'Shield Up'},
    {type:'skill',id:'fire',name:'Fireball'},{type:'support',id:'added',name:'Added Fire'},
    {type:'skill',id:'command',name:'Command Detonate',raw:{noDrop:true}}];
  assert.deepEqual(entries.toSorted((a,b)=>compareEntries(a,b)).map(e=>e.id),['fire','shield','added','alight','command']);
  assert.deepEqual(entries.toSorted((a,b)=>compareEntries(a,b,'name')).map(e=>e.id),['added','alight','command','fire','shield']);
});

test('search combines tag compatibility, acquisition and ordinary prose without treating excluded tags as compatibility', () => {
  const echo={type:'support',name:'Spell Echo',raw:{requiresTags:['spell'],excludeTags:['channel']}};
  assert.equal(matchesQuery(echo,'tag:spell'),true);
  assert.equal(matchesQuery(echo,'tag:spell tag:channel'),false);
  assert.equal(matchesQuery({type:'support',name:'Alacrity',requiresMechanisms:['cooldown']},'tag:spell'),true);
  assert.equal(matchesQuery({type:'skill',name:'Fireball',tags:['fire','spell']},'learnable:true fire'),true);
  assert.equal(matchesQuery({type:'skill',name:'Fireball'},'learnable:false'),false);
  assert.equal(matchesQuery({type:'skill',name:'Alight',raw:{noDrop:true}},'unlearnable'),true);
  assert.equal(matchesQuery({type:'skill',name:'Gift',raw:{dropWeight:0}},'droppable:false'),true);
  assert.equal(matchesQuery({type:'unique',name:'Ring',mods:[{text:'Ignites nearby enemies'}]},'ignites'),true);
});
