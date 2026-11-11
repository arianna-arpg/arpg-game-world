import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VOCATION_SCENES, visibleVocations } from '../site/assets/vocation-scenes.js';

test('a selected class sees only its own callings, with unknown classes empty',()=>{
  for(const classId of [null,undefined,'future-class','spellblade'])assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId,revealSecrets:true}),[]);
  const expected={warrior:['warbringer'],necromancer:['gravebinder'],summoner:['gravebinder'],ranger:['wildstalker'],magician:['spellblade'],cleric:['hierophant']};
  for(const [classId,ids] of Object.entries(expected))assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId}).map(v=>v.id),ids);
});
test('secret reveal adds only the selected class’s additional paths',()=>{
  assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId:'ranger',revealSecrets:true}).map(v=>v.id),['wildstalker','greenwarden']);
  assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId:'necromancer',revealSecrets:true}).map(v=>v.id),['gravebinder']);
});
test('a shared Vocation uses the selected class’s character artwork',()=>{
  const necro=visibleVocations(VOCATION_SCENES,{classId:'necromancer'})[0];
  const summoner=visibleVocations(VOCATION_SCENES,{classId:'summoner'})[0];
  assert.equal(necro.src,'assets/art/vocations/gravebinder.webp');
  assert.equal(summoner.src,'assets/art/vocations/gravebinder-summoner.webp');
  assert.match(summoner.alt,/Summoner/);
  assert.notEqual(necro.src,summoner.src);
});
test('a future account adapter exposes only unlocked callings, even when secrets are requested',()=>{
  assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId:'ranger',unlockedVocationIds:[],revealSecrets:true}),[]);
  const visible=visibleVocations(VOCATION_SCENES,{classId:'ranger',unlockedVocationIds:['greenwarden','gravebinder','unrelated'],revealSecrets:false});
  assert.deepEqual(visible.map(scene=>scene.id),['greenwarden']);
  assert.equal(visible[0].unlockKey,'vocation_unlocked_greenwarden');
  assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId:'warrior',unlockedVocationIds:['greenwarden'],revealSecrets:true}),[]);
});
test('each featured calling has distinct compact local art and descriptive copy',()=>{
  const images=new Set();
  for(const scene of VOCATION_SCENES){
    assert.ok(scene.description.length>60&&scene.alt.length>30);
    assert.equal(scene.unlockKey,'vocation_unlocked_'+scene.id);
    const data=readFileSync(new URL('../site/'+scene.src.split('?')[0],import.meta.url));
    assert.equal(data.toString('ascii',0,4),'RIFF');
    assert.equal(data.toString('ascii',8,12),'WEBP');
    assert.ok(data.length<600_000);
    images.add(data.toString('base64'));
  }
  assert.equal(images.size,6);
  const variant=readFileSync(new URL('../site/assets/art/vocations/gravebinder-summoner.webp',import.meta.url));
  assert.equal(variant.toString('ascii',8,12),'WEBP');
  assert.ok(variant.length<600_000);
});
