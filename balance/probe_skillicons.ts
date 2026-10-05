import assert from 'node:assert/strict';
import {SKILLS} from '../src/data/skills';
import {CLASSES} from '../src/data/classes';
import {skillIconKey,skillIconSvg,SKILL_ICONS,SKILL_ICON_RULES} from '../src/render/skillIcons';
const before=JSON.stringify(SKILLS),families=new Set<string>();
for(const def of Object.values(SKILLS)){
 const key=skillIconKey(def);families.add(key);
 assert.ok(Object.hasOwn(SKILL_ICONS,key),def.id);
 const svg=skillIconSvg(def);
 assert.ok(svg.includes('<path ')&&!svg.includes('<text'),def.id);
 for(const icon of [undefined,false,'missing','__proto__'] as const){
  const automatic=skillIconSvg({...def,icon});assert.ok(automatic.includes('<path ')&&!automatic.includes('<text'),def.id);
 }
}
assert.equal(JSON.stringify(SKILLS),before);
for(const rule of SKILL_ICON_RULES)assert.ok(Object.hasOwn(SKILL_ICONS,rule.icon));
for(const cls of CLASSES)for(const id of cls.bar)if(id)assert.ok(skillIconSvg(SKILLS[id]).includes('<path '),cls.id+' '+id);
assert.equal(skillIconKey({color:'#fff',tags:['guard']}),'guard');
assert.equal(skillIconKey({color:'#fff',tags:['movement']}),'step');
assert.equal(skillIconKey({color:'#fff',icon:'recall'}),'recall');
const hostile=skillIconSvg({color:'"><script>bad</script>',icon:'missing'});assert.ok(!hostile.includes('<script>'));
console.log('PASS '+Object.keys(SKILLS).length+' skill definitions and all '+CLASSES.length+' class bars have visual faces across '+families.size+' families, including legacy/unknown keys');
console.log('PASS semantic extension, recall state, escaped SVG and registry purity');
