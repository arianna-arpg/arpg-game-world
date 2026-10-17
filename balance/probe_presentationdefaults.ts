import assert from 'node:assert/strict';
import {STATUS_DEFS,type ActiveStatus} from '../src/engine/status';
import {statusIcons} from '../src/render/vis/statusIcons';
import {collectActiveFx} from '../src/render/screenFx';
import {composeAfflictionEdge} from '../src/render/vis/afflictionEdge';
import {STATUS_PRESENTATION,statusPresentation} from '../src/render/statusPresentation';
import {makeSettings,serializeSettings,deserializeSettings} from '../src/meta/settings';
import {makeSimWorld} from '../src/sim/arena';
import {serializeSnapshot,applySnapshot} from '../src/net/snapshot';
import {seedGlobalRandom} from '../src/sim/rng';
import {gemInitials} from '../src/engine/gemitems';
import {SKILLS} from '../src/data/skills';
import {configureSkillArtwork,skillIconSvg,skillAcronym} from '../src/render/skillIcons';
const defaults=makeSettings();assert.equal(defaults.aimTick.style,'line');
for(const style of ['line','dot','focus'])for(const alpha of [0,.35,1]){
 const loaded=deserializeSettings(serializeSettings({...defaults,aimTick:{style,alpha}}))!;
 assert.deepEqual(loaded.aimTick,{style,alpha});
}
const old={...serializeSettings(defaults),spreadCombatText:true};
assert.ok(!('spreadCombatText' in deserializeSettings(old)!),'retired spreading preference is ignored');
assert.ok(!('spreadCombatText' in serializeSettings(deserializeSettings(old)!)),'retired preference is not saved again');
configureSkillArtwork(()=>false);
for(const def of Object.values(SKILLS)){assert.equal(skillAcronym(def),gemInitials(def.name));const markup=skillIconSvg(def);
 assert.ok(!/<svg|style=/.test(markup),'classicFallback inherits native DOM fonts and colors');}
assert.equal(skillAcronym({...SKILLS.cleave,icon:'recall'}),'REC');configureSkillArtwork(()=>true);
console.log('PASS classic defaults, all saved Aim Tick styles/opacity, legacy settings, exact main initials and inherited DOM faces');
const status=(id:string):ActiveStatus=>({id,remaining:3,total:5,dps:0,stacks:1,sourceName:'Probe'});
for(const [id,def]of Object.entries(STATUS_DEFS)){
 const s=status(id),icons=statusIcons([s],{}),fx=collectActiveFx([s]);
 assert.equal(icons.length,def.beneficial?0:1,id+' icon');
 assert.equal(fx.length,def.beneficial||def.screenCue===false?0:1,id+' screen cue');
 s.remaining=0;assert.equal(statusIcons([s],{}).length,0);assert.equal(collectActiveFx([s]).length,0);
 s.remaining=3;s.stacks=0;assert.equal(statusIcons([s],{}).length,0);assert.equal(collectActiveFx([s]).length,0);
}
const custom='probe_presentation_extension';STATUS_DEFS[custom]={label:'A new slow',color:'#6acbb1',duration:5};
try{assert.equal(STATUS_PRESENTATION[custom],undefined);assert.equal(statusPresentation(status(custom))!.screen!.motif,'soft');
 const fx=collectActiveFx([status(custom),status('vulnerable')]);const edge=composeAfflictionEdge(fx,{},'gentle',1)!;
 assert.equal(edge.layers.length,2,'distinct soft colors cannot collapse into one dominant tint');assert.ok(edge.layers.every(l=>l.alpha>0));
}finally{delete STATUS_DEFS[custom];}
console.log('PASS every debuff pairs icon and native screen cue; expiry/empty stacks/beneficial/opt-out rules and future data-only extensions');
const restore=seedGlobalRandom(8667);
try{
 const w=makeSimWorld('warrior',8667),p=w.player;p.statuses=[];
 for(const id of ['poison','mired','vulnerable'])p.applyStatus(id,id==='poison'?2:0,1,'Native');
 const ids=()=>statusIcons(p.statuses,{}).map(i=>i.id).sort(),fxids=()=>collectActiveFx(p.statuses).map(f=>f.id).sort();
 assert.deepEqual(ids(),fxids());p.updateTimers(.5);assert.deepEqual(ids(),fxids());
 const before=JSON.stringify([p.statuses,p.life,p.pos,p.sheet]);statusIcons(p.statuses,{});collectActiveFx(p.statuses);assert.equal(JSON.stringify([p.statuses,p.life,p.pos,p.sheet]),before);
 const client=makeSimWorld('warrior',8668);applySnapshot(client,serializeSnapshot(w,1));assert.deepEqual(collectActiveFx(client.player.statuses),collectActiveFx(p.statuses));
 p.endStatus('poison');assert.deepEqual(ids(),fxids());assert.ok(!ids().includes('poison'));
 p.updateTimers(20);assert.equal(ids().length,0);assert.equal(fxids().length,0);
}finally{restore();}
console.log('PASS native application/decay/cleanse/expiry and co-op mirrors drive both presentations without changing gameplay');
