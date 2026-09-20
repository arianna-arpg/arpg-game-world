import { strict as assert } from 'node:assert';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { mod } from '../src/engine/stats';
import { makeSkillInstance, type SkillDef } from '../src/engine/skills';
import { castingCompletion, castingCueOf, castingEventFlash } from '../src/engine/castingCues';
import { castingCueStyle, CASTING_CUE_STYLES } from '../src/data/castingCues';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

seedGlobalRandom(0xca5719);
let count = 0;
const check = (name: string, ok: boolean) => { assert.ok(ok, name); count++; console.log('PASS ' + name); };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;
function setup(def: SkillDef = SKILLS.surgewind) {
  const w = makeSimWorld('guardian', 0xca5719), p = w.player;
  const e = w.createMonster('zombie', 1, 'enemy'); w.actors = [p, e];
  p.pos = { x: 500, y: 500 }; e.pos = { x: 630, y: 500 };
  for (const a of [p,e]) {
    a.sheet.setSource('casting-cue-rig', [mod('life', 'override', 10000), mod('mana', 'override', 10000),
      ...['energyShield','poise','lifeRegen','armor','evasion','blockChance'].map(s => mod(s,'override',0))]);
    a.fillResources(); a.poise = 0;
  }
  const inst = makeSkillInstance(def, 1, 3);
  const start = () => { assert.ok(w.useSkill(p, inst, e.pos)); assert.ok(p.casting); };
  const step = (n: number, hz = 60) => { for (let i=0;i<n;i++) w.update(1/hz); };
  return { w, p, e, inst, start, step };
}
for (const hz of [30,60,120]) {
  const {w,p,e,start,step}=setup(SKILLS.firebolt); start();
  const cs=p.casting!, before=e.life, at=castingEventFlash(p,cs,'interrupt')!;
  p.applyStatus('stun',0,1,'probe'); step(1,hz);
  const cues=w.flashes.filter(f=>f.combatCue?.style==='cast_interrupt');
  check(`${hz}Hz: real stun cancels the cast and emits one fracture`, !p.casting && cues.length===1);
  check(`${hz}Hz: fracture is anchored to prepared aim and skill color`, near(cues[0].pos.x,at.pos.x) && near(cues[0].pos.y,at.pos.y) && cues[0].color===cs.inst.def.color);
  check(`${hz}Hz: interrupted preparation never damages or announces`, e.life===before && !w.texts.some(t=>t.text==='interrupted'));
  step(hz); check(`${hz}Hz: fracture expires without repeating`, !w.flashes.some(f=>f.combatCue?.style==='cast_interrupt'));
}
const focus: SkillDef = { ...SKILLS.firebolt, id:'casting_probe_focus', manaCost:0, cooldown:1,
  targeting:{target:'enemy',castRange:400}, concentration:{time:1,onBreak:'drain',drainRate:1} };
{
  const {w,p,e,start,step}=setup(focus); start(); step(24);
  const cs=p.casting!, before=e.life;
  check('concentration actually builds while on quarry', cs.elapsed>0.3 && !cs.focusBroken);
  cs.aim={x:900,y:900};step(4);
  check('lost focus persists as a broken/draining frame', !!p.casting && p.casting.focusBroken===true && p.casting.elapsed<0.4);
  const client=makeSimWorld('guardian',3), snap=serializeSnapshot(w,1);applySnapshot(client,snap);
  const mirror=client.actors[snap.actors.findIndex(a=>a.id===p.id)];
  check('lost focus reaches the co-op bar', mirror.casting?.focusBroken===true);
  cs.aim={...e.pos};step(2);applySnapshot(client,serializeSnapshot(w,2));
  check('reacquisition closes local and remote frame', !cs.focusBroken && mirror.casting?.focusBroken===false);
  cs.held=false;step(1);
  check('abandoned concentration emits one fizzle and pays its cooldown', !p.casting && (p.cooldowns.get(focus.id)??0)>0 && w.flashes.filter(f=>f.combatCue?.style==='cast_fizzle').length===1);
  check('fizzle is distinct from interruption and does not fire damage', e.life===before && !w.flashes.some(f=>f.combatCue?.style==='cast_interrupt') && !w.texts.some(t=>t.text==='fizzled'));
  applySnapshot(client,serializeSnapshot(w,3));
  check('fizzle effect replicates and cast frame clears', !mirror.casting && client.flashes.some(f=>f.combatCue?.style==='cast_fizzle'));
}
{
  const {w,p,start,step}=setup(focus);start();step(65);
  check('successful concentration does not emit a fizzle', !p.casting && !w.flashes.some(f=>f.combatCue?.style==='cast_fizzle') && w.projectiles.length>0);
}
for (const def of [SKILLS.lightning_blast,SKILLS.surgewind,SKILLS.kindled_ruin]) {
  const {w,p,start,step}=setup(def);start();step(20);
  const cue=castingCueOf(p)!;
  check(def.id+': preparation follows actual partial completion', cue.fill>0 && cue.fill<1 && near(cue.fill,castingCompletion(p)!));
  const snap=serializeSnapshot(w,1), client=makeSimWorld('guardian',2);applySnapshot(client,snap);
  const mirror=client.actors[snap.actors.findIndex(a=>a.id===p.id)];
  check(def.id+': remote body geometry and completion gauge agree', JSON.stringify(castingCueOf(mirror))===JSON.stringify(cue) && castingCompletion(mirror)===cue.fill);
  p.casting=null;applySnapshot(client,serializeSnapshot(w,2));
  check(def.id+': clearing the cast clears local and remote readiness', !castingCueOf(p) && !castingCueOf(mirror));
}
{
  const {w,p,start,step}=setup(); start();
  for(let i=0;i<1200 && (p.brims?.get('surgewind')?.fill??0)<1;i++)step(1);
  check('brim completion emits one lock cue at the real cap', castingCueOf(p)?.fill===1 && w.flashes.filter(f=>f.combatCue?.style==='cast_ready').length===1);
  check('BRIMMING caption is retired', !w.texts.some(t=>t.text==='BRIMMING'));
  step(90);check('full hold retains a stable ready silhouette without repeating burst', castingCueOf(p)?.fill===1 && !w.flashes.some(f=>f.combatCue?.style==='cast_ready'));
  p.casting!.held=false;step(1);
  check('real release clears held read and spends the brim into the buff', !castingCueOf(p) && p.buffs.has('surgewind') && (p.brims?.get('surgewind')?.fill??0)===0);
}
{
  const {w,p,inst,start,step}=setup(SKILLS.ground_slam);
  inst.sockets[0]={def:SUPPORTS.gathered_casting,level:1};start();step(10);
  check('support-converted gathers use the same completion resolver', !!p.casting?.gather && castingCompletion(p)!>0);
  const before=castingCompletion(p)!;p.poise=0;p.applyStatus('stun',0,1,'probe');
  check('stun immediately suppresses ready geometry before next sim tick', !castingCueOf(p));step(1);
  check('interrupt preserves persistent bank rather than inventing a spend', !!p.brims?.size && [...p.brims!.values()][0].fill>=before-0.1 && w.flashes.some(f=>f.combatCue?.style==='cast_interrupt'));
}
{
  const {p,start}=setup(SKILLS.kindled_ruin);start();p.casting!.channelTime=2;
  const base=castingCompletion(p)!;p.sheet.setSource('duration',[mod('effectDuration','more',1)]);
  check('invested duration changes completion cue with the actual cap', near(castingCompletion(p)!,base/2));
}
{
  const {w,p,start,step}=setup({...SKILLS.lightning_blast,castingCue:false});start();step(10);
  check('authored opt-out keeps completion bars but omits body/event embellishment', castingCompletion(p)!>0 && !castingCueOf(p) && !castingEventFlash(p,p.casting!,'interrupt'));
  const snap=serializeSnapshot(w,1), client=makeSimWorld('guardian',2);applySnapshot(client,snap);
  const mirror=client.actors[snap.actors.findIndex(a=>a.id===p.id)];
  check('co-op respects opt-out without losing completion gauge', !castingCueOf(mirror) && castingCompletion(mirror)===castingCompletion(p));
  p.dead=true;check('dead casters have no live readiness', !castingCueOf(p));
  check('unknown profiles use the universal casting fallback', castingCueStyle('missing')===CASTING_CUE_STYLES.standard && castingCueStyle('__proto__')===CASTING_CUE_STYLES.standard);
}
for (const def of [SKILLS.surgewind,SKILLS.kindled_ruin]) {
  const {w,p,e,start,step}=setup(def);start();step(1);const life=e.life;
  p.casting!.held=false;step(1);
  check(def.id+': underfilled release uses the same fizzle family', !p.casting && w.flashes.some(f=>f.combatCue?.style==='cast_fizzle'));
  check(def.id+': underfilled release never fires its payload or instruction text', e.life===life && !p.buffs.has('surgewind')
    && !w.texts.some(t=>/gather broke early|gather is too thin/.test(t.text)));
}
{
  const {w,p,start,step}=setup({...SKILLS.surgewind,channel:{...SKILLS.surgewind.channel!,brim:{fillTime:0.3,autoRelease:true}}});
  start();step(30);
  check('automatic brim payoff has one ready cue and no stale hold', !p.casting && w.flashes.filter(f=>f.combatCue?.style==='cast_ready').length===1 && p.buffs.has('surgewind'));
}
console.log(`PASS ${count} casting cue checks`);
