import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { VOCATION_SCENES, visibleVocations } from '../site/assets/vocation-scenes.js';

test('the gallery covers the authoritative roster and exact class eligibility',()=>{
  const source=ts.createSourceFile('vocations.ts',readFileSync(new URL('../src/data/vocations.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
  const declarations=new Map();
  function visit(node){if(ts.isVariableDeclaration(node))declarations.set(node.name.getText(source),node.initializer);ts.forEachChild(node,visit);}
  visit(source);
  const roster=declarations.get('VOCATIONS');
  assert.ok(roster&&ts.isObjectLiteralExpression(roster));
  const expected=roster.properties.map(prop=>{
    const definition=declarations.get(prop.initializer.getText(source));
    assert.ok(definition&&ts.isObjectLiteralExpression(definition));
    const fields=new Map(definition.properties.map(field=>[field.name.getText(source),field.initializer]));
    return {id:fields.get('id').text,classIds:[fields.get('classId').text,...(fields.get('offeredClasses')?.elements.map(value=>value.text)||[])].sort(),secret:fields.has('secret')};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(VOCATION_SCENES.map(({id,classIds,secret})=>({id,classIds:[...classIds].sort(),secret:!!secret})).sort((a,b)=>a.id.localeCompare(b.id)),expected);
  for(const classId of new Set(expected.flatMap(v=>v.classIds))){
    for(const revealSecrets of [false,true])assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId,revealSecrets}).map(v=>v.id).sort(),expected.filter(v=>v.classIds.includes(classId)&&(revealSecrets||!v.secret)).map(v=>v.id).sort());
  }
});

test('a selected class sees only its own callings, with unknown classes empty',()=>{
  for(const classId of [null,undefined,'future-class','spellblade'])assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId,revealSecrets:true}),[]);
  const expected={warrior:['warbringer'],necromancer:['gravebinder','plaguelord'],summoner:['gravebinder'],ranger:['wildstalker'],magician:['spellblade','archmage'],cleric:['hierophant'],warlord:['bannerlord'],juggernaut:[]};
  for(const [classId,ids] of Object.entries(expected))assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId}).map(v=>v.id),ids);
});
test('secret reveal adds only the selected class’s additional paths',()=>{
  assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId:'ranger',revealSecrets:true}).map(v=>v.id),['wildstalker','greenwarden']);
  assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId:'necromancer',revealSecrets:true}).map(v=>v.id),['gravebinder','plaguelord']);
  assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId:'juggernaut',revealSecrets:true}).map(v=>v.id),['stonewrought']);
  assert.deepEqual(visibleVocations(VOCATION_SCENES,{classId:'warlord',revealSecrets:true}).map(v=>v.id).sort(),['bannerlord','harborwarden']);
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
  assert.equal(images.size,VOCATION_SCENES.length);
  const variant=readFileSync(new URL('../site/assets/art/vocations/gravebinder-summoner.webp',import.meta.url));
  assert.equal(variant.toString('ascii',8,12),'WEBP');
  assert.ok(variant.length<600_000);
});
