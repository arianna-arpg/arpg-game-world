import assert from 'node:assert/strict';
import {ITEM_BASES} from '../src/data/itembases';
import {ITEM_AFFIXES} from '../src/data/itemaffixes';
import {PROCS, type ProcDef} from '../src/data/procs';
import {compileItemMods} from '../src/engine/itemgen';
import {itemProcReferences,procReference,procEffectReference,PROC_REFERENCE_CFG} from '../src/engine/procReference';
import type {ItemInstance} from '../src/engine/items';
const base=Object.values(ITEM_BASES).find(b=>b.category==='helmet')!;
const item:ItemInstance={uid:99001,baseId:base.id,ilvl:1,tier:1,rarity:'magic',name:'Reference fixture',baseRoll:.5,implicitRolls:[],affixes:[{id:'proc_stormlit',tier:0,rolls:[.5]}]};
const before=JSON.stringify(item),mods=JSON.stringify(compileItemMods(item)),original=PROCS.thunderstruck.effect;
const refs=itemProcReferences(item);assert.equal(refs.length,1);assert.equal(refs[0].name,'Thunderstruck');
assert.ok(refs[0].text.includes('hit explodes around its target at 50% skill damage (radius 80)'));
try{PROCS.thunderstruck.effect={type:'explosion',damageScale:.73,radius:123};assert.ok(itemProcReferences(item)[0].text.includes('73% skill damage (radius 123)'));}finally{PROCS.thunderstruck.effect=original;}
const random=Math.random;try{Math.random=()=>{throw Error('Inspection must not roll');};assert.deepEqual(itemProcReferences(item),refs);}finally{Math.random=random;}
assert.equal(JSON.stringify(item),before);assert.equal(JSON.stringify(compileItemMods(item)),mods);
assert.equal(itemProcReferences({...item,affixes:[]}).length,0);assert.equal(itemProcReferences({...item,affixes:[...item.affixes,...item.affixes]}).length,1);
console.log('PASS actual rolled item, native base payload, live retune, duplicate suppression and mutation/RNG-free inspection');
const ids=['proc_concussive','proc_stormlit','proc_pathcutter','proc_cave_in','proc_radiant_oath','proc_cascading_light','proc_reprisal','proc_desperate_ward','proc_adrenaline','proc_slow_burn','proc_mending_ward','proc_necrotic_feast'];
for(const id of ids){assert.ok(ITEM_AFFIXES[id],id);assert.equal(itemProcReferences({...item,affixes:[{id,tier:0,rolls:[.5]}]}).length,1,id);}
const radiant=procReference(PROCS.radiant_reprisal)!;assert.ok(radiant.includes('Sanctified Strike'));assert.ok(radiant.includes('0.5 seconds'));assert.ok(radiant.includes('Simultaneous hits share one trigger'));assert.ok(!radiant.includes('once per skill use'));
assert.ok(procReference(PROCS.desperate_ward)!.includes('low life'));assert.ok(procReference(PROCS.mending_ward)!.includes('Cooldown: 4 seconds'));
assert.ok(procReference(PROCS.pathcutter_stride)!.includes('20% increased'));assert.ok(procReference(PROCS.reprisal)!.includes('stack is spent'));assert.ok(procReference(PROCS.slow_burn)!.includes('Every 5 seconds'));
assert.equal(procEffectReference({type:'cooldown',seconds:1}),null);
const custom:ProcDef={...PROCS.thunderstruck,id:'custom',description:'Authored complex effect',effect:{type:'cooldown',seconds:1},hitType:'cold',rollTop:.2,ppm:4,status:['chill'],receivedTypes:['fire']};
const desc=procReference(custom)!;for(const s of ['Authored complex effect','cold','20%','4 per minute','Chilled'])assert.ok(desc.includes(s),s);
console.log('PASS twelve native proc affixes; skill/condition/clock/consumption gates, authored override and honest unsupported fallback');
const def=PROCS.thunderstruck,description=def.description,name=def.name;
try{def.description='🔥'.repeat(1000);def.name='🌟'.repeat(1000);const r=itemProcReferences(item)[0];
 assert.equal([...r.text].length,PROC_REFERENCE_CFG.maxCharacters);assert.equal([...r.name].length,PROC_REFERENCE_CFG.maxNameCharacters);
 assert.ok(!r.text.includes('\uFFFD'));assert.ok(!r.name.includes('\uFFFD'));
}finally{def.description=description;def.name=name;}
console.log('PASS long modded descriptions and names stay bounded without splitting Unicode');
