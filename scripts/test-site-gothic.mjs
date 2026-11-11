import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../site/',import.meta.url),context={window:{}};
for(const file of ['field-art','collection-art'])vm.runInNewContext(readFileSync(new URL('assets/'+file+'.js',root),'utf8'),context);
const field=context.window.HWFieldArt,collection=context.window.HWCollectionArt;
test('unknown and specialized places retain a neutral illustration without borrowing an unrelated landscape',()=>{
 for(const entry of [{id:'future',biomeTag:'unknown'},{id:'constructor'},{id:'__proto__'},{id:'ocean-bed',biomeTag:'deepsea'}])assert.equal(field.resolve('biomes',entry),field.fallback);
 assert.equal(field.resolve('events',{id:'new-event'}),field.fallback);
 assert.match(field.resolve('biomes',{id:'snowcrown'}),/frost.webp$/);
 assert.match(field.resolve('biomes',{id:'new-forest',biomeTag:'forest'}),/woods.webp$/);
 assert.match(field.resolve('events',{id:'warbands'}),/warband.webp$/);
});
test('every generated painting is distinct, compact WebP and has a recorded prompt',()=>{
 const hashes=new Set();let count=0;
 for(const folder of ['field-guide','collection']){
  const path=new URL('assets/art/'+folder+'/',root),manifest=JSON.parse(readFileSync(new URL('prompts.json',path),'utf8'));
  for(const name of readdirSync(path).filter(f=>f.endsWith('.webp'))){
   const bytes=readFileSync(new URL(name,path));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length<200_000);
   assert.ok(manifest.images.some(i=>i.id+'.webp'===name&&i.prompt.length>100));hashes.add(bytes.toString('base64'));count++;
  }
 }
 assert.equal(count,19);assert.equal(hashes.size,count);
});
test('all category selections own their image, copy and descriptive alternative',()=>{
 assert.deepEqual(Object.keys(collection.scenes),['skills','supports','uniques']);
 for(const scene of Object.values(collection.scenes)){assert.ok(readFileSync(new URL(scene.src,root)).length);assert.ok(scene.alt.length>30&&scene.copy.length>40);}
 for(const type of ['skill','support','unique'])assert.match(collection.emblem({damageTypes:['future-element']},type),/<svg.*aria-hidden="true"/);
});
