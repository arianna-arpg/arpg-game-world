import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {makeTempDir} from './temp-dir.cjs';
import {projectCollection} from './site-collection-data.mjs';

test('compact export keeps every shuffle entry and all displayed tooltip fields', t => {
  const out=makeTempDir('hollow-site-collection-');
  t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
  execFileSync(process.execPath,['--import','tsx','scripts/export-web-data.ts'],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,WEB_DATA_OUT:out},stdio:'pipe',
  });
  const source = Object.fromEntries(['skills','supports','uniques'].map(kind => [kind, JSON.parse(fs.readFileSync(path.join(out,kind+'.json')))]));
  const result = projectCollection(source);
  const selected=JSON.parse(fs.readFileSync(new URL('../site/assets/art/icons/manifest.json',import.meta.url)));
  const icons=new Map(selected.entries.map(entry=>[entry.key,entry.imageSha256.slice(0,12)]));
  for(const id of ['gravefathers_lament','herdfathers_stampede','pyrefathers_immolation','harvestfathers_gleaning','swarmfathers_seethe','packfathers_frenzy']){
    const skill=source.skills.find(entry=>entry.id===id);
    assert.ok(skill,'startup skill is exported: '+id);
    assert.equal(skill.learnable,false);
    assert.equal(skill.icon,icons.get('skill:'+id));
    assert.ok(skill.icon,'startup skill has selected art: '+id);
  }
  const monsters=JSON.parse(fs.readFileSync(path.join(out,'monsters.json')));
  const commander=monsters.find(entry=>entry.id==='grave_colossus');
  assert.ok(commander?.portraitLook?.parts?.length,'runtime commander carries its authored portrait');
  for(const part of commander.raw.parts){
    assert.ok(monsters.find(entry=>entry.id===part.monster)?.portraitLook?.parts?.length,'carried part has its authored portrait: '+part.monster);
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'collection.json'))),result,'Pages exports the same compact collection');
  for (const kind of Object.keys(source)) {
    assert.deepEqual(result[kind].map(e => e.id), source[kind].map(e => e.id));
    result[kind].forEach((entry,i) => {
      const original=source[kind][i];
      for (const [key,value] of Object.entries(entry)) {
        if(key==='raw') { for(const field of Object.keys(value)) assert.deepEqual(value[field],original.raw[field]); }
        else if(key==='mods') value.forEach((mod,j) => { for(const field of Object.keys(mod)) assert.deepEqual(mod[field],original.mods[j][field]); });
        else assert.deepEqual(value,original[key]);
      }
    });
  }
  assert.ok(JSON.stringify(result).length < JSON.stringify(source).length*.12, 'landing export should remove at least 88% of the database payload');
});

test('projection excludes heavy engine-only fields without mutating source', () => {
  const skill={id:'sample',name:'Sample',damageTypes:['fire'],description:'A flame',raw:{color:'#f84',requiresTags:['spell'],hugeSimulationTable:[1,2,3]}};
  const unique={id:'ring',mods:[{text:'+3 life',min:3,local:false,stat:'life',when:{heavy:true}}],raw:{gameOnly:true}};
  const before=structuredClone({skills:[skill],supports:[],uniques:[unique]});
  const result=projectCollection(before);
  assert.deepEqual(result.skills[0].raw,{color:'#f84',requiresTags:['spell']});
  assert.deepEqual(result.uniques[0].mods,[{text:'+3 life',min:3,local:false}]);
  assert.deepEqual(before,{skills:[skill],supports:[],uniques:[unique]});
});
