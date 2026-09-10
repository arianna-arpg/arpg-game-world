import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { UNDEAD_COURT_TREES } from '../src/data/necromancerCourts';
import { makeSkillInstance, instanceDelivery, supportFitsInstOrCrew } from '../src/engine/skills';
import type { SkillInstance } from '../src/engine/skills';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { mod } from '../src/engine/stats';
import { updateAI } from '../src/engine/ai';
import { SIM_TAP } from '../src/engine/tap';
import { rebuildSkill } from '../src/meta/character';
import { dist } from '../src/core/math';
let failed=0;
function check(name:string,ok:boolean){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)failed++;}
function setup(id:string,nodes:string[]=[]){
  const w=makeSimWorld('necromancer',0xc047),p=w.player;
  w.meta.baseAttrs.willpower=100;w.meta.baseAttrs.intelligence=100;w.recalcPlayer();
  const inst=makeSkillInstance(SKILLS[id],20,3);w.meta.knownSkills.set(id,inst);p.skills.fill(null);p.skills[0]=inst;
  for(const node of nodes)w.pickTreeNode(id,node);
  p.sheet.setSource('probe',[mod('mana','flat',10000)]);p.fillResources();return{w,p,inst};
}
const crew=(w:World,inst:SkillInstance)=>w.actors.filter(a=>!a.dead&&a.owner===w.player&&a.summonInst===inst);
function step(w:World,seconds:number,mind?:Actor){for(let i=0;i<Math.ceil(seconds*60);i++){if(mind)updateAI(mind,w,1/60);w.update(1/60);}}
function cast(w:World,inst:SkillInstance,aim={...w.player.pos}){w.player.casting=null;w.player.useLock=0;w.player.cooldowns.clear();w.player.fillResources();const ok=w.useSkill(w.player,inst,aim,true);step(w,1.5);return ok;}
function dummy(w:World,at:Actor,range=50){const a=w.createMonster('zombie',1,'enemy');a.pos={x:at.pos.x+range,y:at.pos.y};a.skills=[];a.sheet.setSource('probe',[mod('life','flat',100000),mod('moveSpeed','more',-1)]);a.fillResources();w.actors.push(a);return a;}
const restore=seedGlobalRandom(0xc047);
try{
  for(const [id,tree]of Object.entries(UNDEAD_COURT_TREES)){
    const nodes=tree.nodes!;
    for(const leaf of nodes.filter(n=>n.links?.length&&!nodes.some(other=>other.links?.includes(n.id)))){
      const middle=nodes.find(n=>n.id===leaf.links![0])!,root=middle.links![0];
      const {w,inst}=setup(id,[root,middle.id,leaf.id]);
      check(id+'/'+leaf.id+': legal path actually summons',inst.treeNodes?.length===3&&cast(w,inst)&&crew(w,inst).length>0);
      const known=w.summonCrewSkills(inst);
      check(id+'/'+leaf.id+': actual kit agrees with support census',Array.isArray(known)&&crew(w,inst).every(a=>a.skills.every(s=>!s||known.some(k=>k.id===s.def.id))));
      const loaded=rebuildSkill({skillId:id,level:20,rarity:'common',sockets:[],treeNodes:inst.treeNodes});
      check(id+'/'+leaf.id+': allocation survives saving',loaded?.treeNodes?.join()===inst.treeNodes?.join());
    }
  }
  {
    const {w,p,inst}=setup('summon_skeleton',['grave_phalanx','interlocking_shields','barbed_lattice','oath_banner']);
    p.sheet.setSource('spikes',[mod('thorns','flat',40)]);const armor=p.sheet.get('armor');cast(w,inst);step(w,0.3);
    const a=crew(w,inst)[0];check('phalanx guards and grants its banner',a.guardMode&&a.activeAuras.has('sentinel_banner')&&p.sheet.get('armor')>armor);
    check('barbed phalanx inherits Thorns into strikes',a.sheet.get('thorns')===19&&a.sheet.get('thornsToHit')===0.5);
    const foe=dummy(w,a,50);let challenges=0;SIM_TAP.current={onCast:(actor,s)=>{if(actor===a&&s.def.id==='court_challenge')challenges++;}};
    for(let i=0;i<240&&!foe.statuses.some(s=>s.id==='taunted');i++){updateAI(a,w,1/60);w.update(1/60);}SIM_TAP.current=null;
    check('sentinel actually challenges and taunts toward itself',challenges>0&&foe.statuses.some(s=>s.id==='taunted'&&s.casterId===a.id));
    w.fonts.push({pos:{...p.pos}});w.meta.abilityEssences.ability4=999;w.fontResetTree(inst.def.id);step(w,0.5);
    check('respec removes sentinel and its protective aura',a.dead&&crew(w,inst).length===0&&p.sheet.get('armor')===armor);
  }
  {
    const {w,inst}=setup('summon_skeleton',['grave_phalanx','veteran_watch','last_watch']);cast(w,inst);const parent=crew(w,inst)[0];w.kill(parent,false,w.player);
    const heirs=crew(w,inst);check('Last Watch leaves one temporary smaller sentinel',heirs.length===1&&!!heirs[0].summonOffspring&&heirs[0].radius<parent.radius&&heirs[0].lifespan>0);
    w.kill(heirs[0],false,w.player);check('Last Watch cannot recursively raise heirs',crew(w,inst).length===0);
  }
  {
    const {w,inst}=setup('summon_skeleton',['ossuary_duelists','line_breakers','relentless_footwork','dueling_pairs']);cast(w,inst);
    const a=crew(w,inst)[0],foe=dummy(w,a,130);let lunges=0,hits=0;
    SIM_TAP.current={onCast:(actor,s)=>{if(actor===a&&s.def.id==='court_bone_lunge')lunges++;},onHit:(actor,target,r)=>{if(actor===a&&target===foe&&r.total>0)hits++;}};step(w,7,a);SIM_TAP.current=null;
    check('duelist pairs are real two-body casts and land their pursuit kit',crew(w,inst).length===2&&lunges>0&&hits>0);
  }
  {
    const {w,inst}=setup('raise_dead',['grave_levy','fresh_draft','mass_graves']);cast(w,inst);
    const seen=new Set(crew(w,inst).map(a=>a.defId));check('levy mints five temporary mixed undead',crew(w,inst).length===5&&crew(w,inst).every(a=>a.defId==='skeleton_warrior'||a.defId==='zombie')&&crew(w,inst).every(a=>a.lifespan>12));
    for(let i=0;i<4;i++){cast(w,inst);for(const a of crew(w,inst))seen.add(a.defId);}check('levy samples both kinds across repeated casts',seen.has('skeleton_warrior')&&seen.has('zombie'));check('mass graves obey eleven-body cap',crew(w,inst).length===11);
  }
  {
    const {w,inst}=setup('raise_dead',['grave_levy','rotting_ranks','last_service']);cast(w,inst);const a=crew(w,inst)[0],foe=dummy(w,a,20);const resistance=foe.sheet.get('chaosRes');step(w,0.4);
    check('rotting levy carries a working chaos-resistance debuff',foe.sheet.get('chaosRes')<resistance);
    const life=foe.life;let source=false;SIM_TAP.current={onHit:(actor,target,r)=>{if(actor===a&&target===foe&&r.total>0)source=true;}};
    a.lifespan=0.05;step(w,0.2);SIM_TAP.current=null;
    check('expiring levy explodes as an attributed true death',a.dead&&foe.life<life&&source);
  }
  {
    const {w,p,inst}=setup('raise_dead',['flesh_assembly','feasting_mass','borrowed_limbs','stitched_carapace']);cast(w,inst);const eater=crew(w,inst)[0];
    check('flesh assembly is one abomination with the configured appetite',crew(w,inst).length===1&&eater.defId==='court_abomination'&&eater.devour?.spec.interval===5);
    const food=makeSkillInstance(SKILLS.summon_skeleton,20,0);p.skills[1]=food;w.meta.knownSkills.set(food.def.id,food);cast(w,food);const meal=crew(w,food)[0];meal.pos={x:eater.pos.x+20,y:eater.pos.y};eater.life=eater.maxLife()/4;
    const life=eater.life,damage=eater.sheet.get('damage');let death=false;SIM_TAP.current={onDeath:(a,killer)=>{if(a===meal)death=killer===eater;}};
    step(w,5.5);SIM_TAP.current=null;
    check('abomination eats another skill\'s servant and owns the death',meal.dead&&death);
    check('meal heals and strengthens the eater',eater.life>life&&eater.sheet.get('damage')>damage);
    step(w,13);check('feast bonus expires without fresh meals',eater.sheet.get('damage')===damage);
  }
  {
    const {w,p,inst}=setup('summon_raging_spirit',['vigil_flames','focusing_lens','forked_light','furnace_watch']);
    inst.sockets[0]={def:SUPPORTS.resonance,level:1};const census=w.summonCrewSkills(inst);
    check('sentry support gate sees spells instead of the assault bite',supportFitsInstOrCrew(SUPPORTS.splitting,inst,census)&&Array.isArray(census)&&!census.some(s=>s.id==='court_searing_bite'));
    const aim={x:p.pos.x+280,y:p.pos.y};cast(w,inst,aim);const a=crew(w,inst)[0],at={...a.pos};
    check('vigil is targetable and placed at the mark',!a.untargetable&&dist(a.pos,aim)<25&&!!a.stationary);
    const foe=dummy(w,a,260);let bolts=0,ignites=0,hits=0;SIM_TAP.current={onCast:(actor,s)=>{if(actor===a){if(s.def.id==='court_vigil_bolt')bolts++;if(s.def.id==='skeletal_ignite')ignites++;}},onHit:(actor,target,r)=>{if(actor===a&&target===foe&&r.total>0)hits++;}};
    step(w,7,a);SIM_TAP.current=null;
    check('stationary sentry casts and lands its ranged lessons',bolts>0&&ignites>0&&hits>0&&dist(a.pos,at)<0.01);
    w.teleportActor(p,{x:p.pos.x-500,y:p.pos.y});step(w,1,a);check('sentry does not recall with a moving keeper',dist(a.pos,at)<0.01);
    const d=instanceDelivery(inst);check('vigil retains the spirit family\'s shared pool',d.type==='summon'&&d.poolGroup==='raging_spirit');
    step(w,20);check('stationary sentries still expire',a.dead);
  }
  {
    const {w,inst}=setup('summon_raging_spirit',['frenzied_embers','hunting_flame','singe_halo']);cast(w,inst);const a=crew(w,inst)[0],foe=dummy(w,a,20);foe.life=0.1;
    let attributed=false;SIM_TAP.current={onDeath:(target,killer)=>{if(target===foe)attributed=killer===a;}};
    // Isolate one halo to identify its exact owner in the overlapping swarm.
    for(const other of crew(w,inst))if(other!==a)other.pos={x:w.player.pos.x-300,y:w.player.pos.y};
    step(w,0.5);SIM_TAP.current=null;check('Singe Halo kills retain the summoned bearer as source',foe.dead&&attributed);
  }
  {
    const {w,inst}=setup('summon_wraith',['hexwoven_shades','withering_words','echoed_malediction','hollow_channels']);cast(w,inst);const a=crew(w,inst)[0],foe=dummy(w,a,220);
    for(let i=0;i<300&&!foe.statuses.some(s=>s.id==='despair');i++){updateAI(a,w,1/60);w.update(1/60);}
    check('hexer lands its learned curse and retains exponential decay',foe.statuses.some(s=>s.id==='despair'&&s.casterId===a.id)&&!!a.decay);
    step(w,60);check('decay investment never makes hexers permanent',a.dead);
  }
  {
    const {w,inst}=setup('summon_wraith',['soul_reavers','reaping_steps','long_shadow','hungry_veil']);cast(w,inst);const a=crew(w,inst)[0],foe=dummy(w,a,130);let hits=0;
    SIM_TAP.current={onHit:(actor,target,r)=>{if(actor===a&&target===foe&&r.total>0)hits++;}};step(w,6,a);SIM_TAP.current=null;
    check('two soul reavers replace bolts with real close-combat hits',crew(w,inst).length===2&&hits>0&&!a.skills.some(s=>s?.def.tags.includes('projectile')));
    step(w,60);check('reaver durability also yields to compounding decay',a.dead);
  }
}finally{restore();SIM_TAP.current=null;}
console.log(failed?failed+' CHECK(S) FAILED':'ALL CHECKS PASSED');process.exit(failed?2:0);
