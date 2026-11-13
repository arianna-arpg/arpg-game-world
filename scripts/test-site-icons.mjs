import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {makeIconResolver} from './site-icon-data.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../site/assets/art/icons/manifest.json',import.meta.url)));
test('every selected icon ships with its verified distribution hash and portable provenance',()=>{
 const ids=new Set(),images=new Set();
 for(const e of manifest.entries){
  assert.equal(e.key,e.kind+':'+e.id);assert.ok(!ids.has(e.key));ids.add(e.key);
  assert.ok(!images.has(e.src));images.add(e.src);
  assert.match(e.src,/^assets\/art\/icons\/(skill|support|unique)\/[a-z0-9_-]+\.[a-f0-9]{12}\.webp$/);
  const image=fs.readFileSync(new URL('../site/'+e.src,import.meta.url));
  assert.equal(crypto.createHash('sha256').update(image).digest('hex'),e.imageSha256);
  assert.equal(image.toString('ascii',8,12),'WEBP');assert.ok(image.length<32768);
  assert.ok(e.originalSha256&&e.provenance&&e.generator);
  const source=manifest.canonicalSources[e.canonicalSourceRef];
  assert.ok(source&&!source.definition,'source references resolve without copying gameplay snapshots');
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex'),e.canonicalSourceRef);
  assert.ok(e.status==='art-approved'?e.approval:e.status==='author-checked'&&e.review);
  assert.ok(!JSON.stringify(e).includes('D:\\'),'provenance does not expose local absolute paths');
 }
 assert.equal(ids.size,manifest.entries.length);
});
test('icon lookup preserves kind collisions and unknown identities fall back',()=>{
 const resolve=makeIconResolver(manifest);
 assert.notEqual(resolve('skill','overload'),resolve('support','overload'));
 assert.notEqual(resolve('skill','lodestone'),resolve('unique','lodestone'));
 assert.equal(resolve('skill','future_unpainted_skill'),null);
 assert.equal(resolve('skill','__proto__'),null);
 assert.equal(resolve('monster','overload'),null);
 assert.match(resolve('skill','shield_up'),/^[a-f0-9]{12}$/);
});
