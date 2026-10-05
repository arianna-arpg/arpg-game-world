import assert from 'node:assert/strict';
import {SKILLS} from '../src/data/skills';
import {CLASSES} from '../src/data/classes';
import {configureSkillArtwork,skillAcronym,skillIconKey,skillIconSvg,SKILL_ICONS,SKILL_ICON_RULES} from '../src/render/skillIcons';
import {SKILL_ICON_CATALOG} from '../src/render/skillIconCatalog';

// Artwork is the default; the explicit text preference still works live.
for(const def of Object.values(SKILLS)) assert.ok(skillIconSvg(def).includes('<path '),def.id);
configureSkillArtwork(()=>false);
for(const def of Object.values(SKILLS)) {
 assert.ok(skillAcronym(def).length>0 && skillAcronym(def)!=='?',def.id);
 assert.ok(skillIconSvg(def).includes('data-skill-acronym='),def.id);
 assert.ok(!skillIconSvg(def).includes('<path '),def.id);
}
for(const [name,label] of [['Cleave','C'],['Sunder Maul','SM'],['Frenzy','F']]) {
 const def=Object.values(SKILLS).find(s=>s.name===name);assert.ok(def,name);assert.equal(skillAcronym(def),label);
}
assert.equal(skillAcronym({color:'#fff',name:'Mark',icon:'recall'}),'R');
configureSkillArtwork(()=>true);
const before=JSON.stringify(SKILLS),families=new Set<string>();
for(const def of Object.values(SKILLS)){
 const key=skillIconKey(def);families.add(key);
 assert.equal(key,'skill:'+def.id,'registered skill needs authored art: '+def.id);
 assert.equal(skillIconKey({...def,name:'Renamed skill'}),key,'names never select artwork');
 assert.equal(skillIconKey({...def,icon:'recall'}),'recall','runtime recall must override identity');
 assert.ok(Object.hasOwn(SKILL_ICONS,key),def.id);
 const svg=skillIconSvg(def);
 assert.ok(svg.includes('<path ')&&!svg.includes('<text'),def.id);
 for(const icon of [undefined,false,'missing','__proto__'] as const){
  const automatic=skillIconSvg({...def,icon});assert.ok(automatic.includes('<path ')&&!automatic.includes('<text'),def.id);
 }
}
assert.equal(JSON.stringify(SKILLS),before);
assert.deepEqual(Object.keys(SKILL_ICON_CATALOG).sort(),Object.keys(SKILLS).sort(),'catalog must cover every skill without stale IDs');
const art=new Map<string,string>();
for(const def of Object.values(SKILLS)){
 const signature=JSON.stringify(SKILL_ICONS[skillIconKey(def)].layers);
 assert.ok(!art.has(signature),def.id+' duplicates '+art.get(signature));art.set(signature,def.id);
 for(const icon of [false,'missing','__proto__'] as const)assert.equal(skillIconKey({...def,icon}),skillIconKey(def));
}
assert.equal(families.size,Object.keys(SKILLS).length,'all identities are distinct without color');
assert.equal(skillIconKey({...SKILLS.cleave,icon:'guard'}),'guard','explicit alternate artwork remains available');
for(const rule of SKILL_ICON_RULES)assert.ok(Object.hasOwn(SKILL_ICONS,rule.icon));
for(const cls of CLASSES)for(const id of cls.bar)if(id)assert.ok(skillIconSvg(SKILLS[id]).includes('<path '),cls.id+' '+id);
assert.equal(skillIconKey({color:'#fff',tags:['guard']}),'guard');
assert.equal(skillIconKey({color:'#fff',tags:['movement']}),'step');
assert.equal(skillIconKey({color:'#fff',icon:'recall'}),'recall');
const hostile=skillIconSvg({color:'"><script>bad</script>',icon:'missing'});assert.ok(!hostile.includes('<script>'));
console.log('PASS '+Object.keys(SKILLS).length+' skill definitions and all '+CLASSES.length+' class bars have visual faces across '+families.size+' families, including legacy/unknown keys');
console.log('PASS semantic extension, recall state, escaped SVG and registry purity');

configureSkillArtwork(()=>false);assert.ok(skillIconSvg(SKILLS.cleave).includes('>C</text>'));
console.log('PASS authored artwork by default; explicit acronym preference, live switching and recall');
