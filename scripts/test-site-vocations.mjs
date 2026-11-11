import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VOCATION_SCENES, visibleVocations } from '../site/assets/vocation-scenes.js';

test('the initial preview withholds secret callings until deliberately revealed',()=>{
  const initial=visibleVocations(VOCATION_SCENES);
  assert.equal(initial.length,5);
  assert.ok(initial.every(scene=>!scene.secret));
  assert.equal(visibleVocations(VOCATION_SCENES,{revealSecrets:true}).length,6);
});
test('a future account adapter exposes only unlocked callings, even when secrets are requested',()=>{
  assert.deepEqual(visibleVocations(VOCATION_SCENES,{unlockedVocationIds:[],revealSecrets:true}),[]);
  const visible=visibleVocations(VOCATION_SCENES,{unlockedVocationIds:['greenwarden','unrelated'],revealSecrets:false});
  assert.deepEqual(visible.map(scene=>scene.id),['greenwarden']);
  assert.equal(visible[0].unlockKey,'vocation_unlocked_greenwarden');
});
test('each featured calling has distinct compact local art and descriptive copy',()=>{
  const images=new Set();
  for(const scene of VOCATION_SCENES){
    assert.ok(scene.description.length>60&&scene.alt.length>30);
    assert.equal(scene.unlockKey,'vocation_unlocked_'+scene.id);
    const data=readFileSync(new URL('../site/'+scene.src,import.meta.url));
    assert.equal(data.toString('ascii',0,4),'RIFF');
    assert.equal(data.toString('ascii',8,12),'WEBP');
    assert.ok(data.length<600_000);
    images.add(data.toString('base64'));
  }
  assert.equal(images.size,6);
});
