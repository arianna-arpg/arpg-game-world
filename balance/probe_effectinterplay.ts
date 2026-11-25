/** Cross-family checks. Exercise gameplay events with and without the grant that earns them. */
import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { STATUS_DEFS, releasesOnEnd } from '../src/engine/status';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { deathBurstVoice } from '../src/data/mechanicVisuals';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import '../src/render/vis/mechanicVisuals';

const restore = seedGlobalRandom(5819);
let failures = 0;
function test(name: string, run: () => void) {
  try { run(); console.log('PASS ' + name); }
  catch (error) { failures++; console.error('FAIL ' + name + ': ' + (error as Error).message); }
}
function rig() {
  const w = makeSimWorld('warrior', 5819), p = w.player;
  w.actors = [p]; p.pos = {x:400,y:400};
  p.sheet.setSource('rig', [mod('accuracy','override',1e6),mod('critChance','override',0)]);
  const spawn = (dx:number, team:'enemy'|'player'='enemy', id='zombie') => {
    const a=w.createMonster(id,1,team); a.pos={x:p.pos.x+dx,y:p.pos.y}; a.tier=p.tier;
    a.skills=[]; a.brain=undefined; a.anchored=true;
    a.sheet.setSource('rig',[mod('life','override',10000),mod('evasion','override',0),mod('blockChance','override',0)]);
    a.fillResources(); w.actors.push(a); return a;
  };
  const cast=(id:string, at:typeof p) => w.executeSkill(p,makeSkillInstance(SKILLS[id]),at.pos,{targetInfo:{actor:at,pos:at.pos}});
  return {w,p,spawn,cast};
}

try {
  for (const grant of ['skill','stat']) test('a refused '+grant+' ailment cannot plant a seed',()=>{
    const {w,p,spawn}=rig(), t=spawn(35);
    p.sheet.setSource('grant',[mod('ruptureSeed','flat',50),mod('apply_poison','flat',grant==='stat'?1:0)]);
    const hit=makeSkillInstance({...SKILLS.cleave, baseDamage:{physical:[12,12]},
      effects:grant==='stat'?[{type:'damage'}]:[{type:'damage'},{type:'status',status:'poison',chance:1,magnitude:1}]});
    t.sheet.setSource('deny',[mod('debuffImmunity','override',1)]);
    w['resolveHit'](p,hit,t); assert(!t.ruptureSeed && !t.statuses.length,'refusal produced a seed');
    t.sheet.removeSource('deny'); w['resolveHit'](p,hit,t); assert(t.ruptureSeed,'accepted wound should plant the granted seed');
  });
  test('Draw Corruption moves only accepted ailments in the same story and heals for those',()=>{
    const {p,spawn,cast}=rig(), ally=spawn(25,'player'), above=spawn(25,'player'); above.tier++;
    ally.applyStatus('shock',0,1,'donor'); ally.applyStatus('warded',0,1,'donor');
    above.applyStatus('poison',2,1,'donor'); p.life-=40;
    p.sheet.setSource('deny',[mod('debuffImmunity','override',1)]); const before=p.life;
    cast('draw_corruption',p); assert.equal(p.life,before); assert(ally.statuses.some(s=>s.id==='shock'));
    p.sheet.removeSource('deny'); cast('draw_corruption',p);
    assert.deepEqual(p.statuses.map(s=>s.id),['shock']); assert.equal(p.life-before,8);
    assert(ally.statuses.some(s=>s.id==='warded') && above.statuses.some(s=>s.id==='poison'));
  });
  test('a Grounding Relay directs a real siphon trail and credits its new applier',()=>{
    const {w,p,spawn,cast}=rig(), ally=spawn(25,'player'), receiver=spawn(45);
    ally.applyStatus('shock',0,1,'source',{casterId:ally.id});
    p.sheet.setSource('relay',[mod('relayStatus_grounding','flat',1)]);
    cast('draw_corruption',p);
    const link=w.flashes.find(f=>f.mechanicLink?.kind==='siphonTransfer')?.mechanicLink;
    assert.equal(link?.from,ally.id); assert.equal(link?.to,receiver.id);
    assert.equal(receiver.statuses.find(s=>s.id==='shock')?.casterId,p.id);
    assert(!p.statuses.some(s=>s.id==='shock') && !ally.statuses.some(s=>s.id==='shock'));
  });
  test('Transfusion retains rejected wounds and moves an aggregate charge just once',()=>{
    const {p,spawn,cast}=rig(), t=spawn(40), near=spawn(55); near.tier++;
    p.applyStatus('warded',0,1,'blessing');
    for(let i=0;i<3;i++)p.applyStatus('poison',10,1,'wound',{rupture:15,ruptureType:'chaos',casterId:p.id});
    t.sheet.setSource('deny',[mod('debuffImmunity','override',1)]); cast('transfusion',t);
    assert(p.statuses.some(s=>s.id==='poison')); assert.equal(t.statuses.length,0);
    t.sheet.removeSource('deny'); cast('transfusion',t);
    const moved=t.statuses.find(s=>s.id==='poison'); assert.equal(moved?.stacks,3); assert.equal(moved.rupture,45);
    assert.equal(moved.casterId,p.id); assert(p.statuses.some(s=>s.id==='warded')); assert.equal(near.statuses.length,0);
  });
  test('a field-bound wound stays on its donor and a held bank preserves its owner and release rule',()=>{
    const {p,spawn,cast}=rig(), ally=spawn(25,'player');
    ally.applyStatus('bleed',4,1,'field',{challengeField:123});
    ally.applyStatus('impaled',0,1,'rhythm',{sourceKey:'rk',holdDischarge:true,rupture:12,ruptureType:'physical',casterId:77});
    cast('draw_corruption',p); const held=p.statuses.find(s=>s.id==='impaled');
    assert(ally.statuses.some(s=>s.challengeField===123)); assert.equal(held?.holdDischarge,true); assert.equal(held.sourceKey,'rk'); assert.equal(held.casterId,77);
  });
  for(const exit of ['quiet','immortal','combat']) test(exit+' ending respects death-only passives',()=>{
    const {p,w,spawn}=rig(), t=spawn(30,'enemy',exit==='immortal'?Object.values(MONSTERS).find(m=>m.immortal)!.id:'zombie'), kin=spawn(60);
    t.ruptureSeed={casterId:p.id,damage:100,until:w.time+3,threshold:200,dmgTaken:0};
    p.sheet.setSource('grant',[mod('fueledRatePower','flat',1)]);
    const before=kin.life; w.kill(t,exit==='quiet',p);
    assert.equal(kin.life<before,exit==='combat'); assert.equal(p.fueledStacks,exit==='combat'?1:0);
  });
  test('a timed-out seed has no payload when its host falls',()=>{
    const {w,p,spawn}=rig(), t=spawn(35), kin=spawn(55), before=kin.life;
    t.ruptureSeed={casterId:p.id,damage:100,until:w.time,threshold:200,dmgTaken:0};
    w.kill(t,false,p);
    assert.equal(kin.life,before); assert(!w.flashes.some(f=>f.fx==='mechanic:ruptureSeed'));
  });
  test('Offering distinguishes a blessing from an active field-bound wound',()=>{
    const {w,p,spawn}=rig(); p.sheet.setSource('grant',[mod('offeringPower','flat',1)]);
    const blessed=spawn(35); blessed.applyStatus('warded',0,1,'ward'); w.kill(blessed,false,p);
    assert.equal(p.offeringStacks,0);
    const afflicted=spawn(35); afflicted.applyStatus('bleed',2,1,'field',{challengeField:73}); w.kill(afflicted,false,p);
    assert.equal(p.offeringStacks,1);
  });
  test('an upper floor does not promote a normal enemy for Trophy rewards',()=>{
    const {p,w,spawn}=rig(); p.sheet.setSource('grant',[mod('trophyPower','flat',.08)]);
    const common=spawn(30); common.rarity='normal'; common.tier=p.tier=1; w.kill(common,false,p); assert.equal(p.trophyStacks,0);
    const elite=spawn(30); elite.rarity='rare'; w.kill(elite,false,p); assert.equal(p.trophyStacks,1);
  });
  test('authored Impale end triggers compose with Recall, cleanse and ordinary Impale',()=>{
    const id='audit_barbed_impale';
    try {
      for(const armed of ['death','expiry'] as const) for(const end of ['death','expiry','recall','cleanse'] as const) {
        STATUS_DEFS[id]={...STATUS_DEFS.impaled, ruptureOnEnd:[armed]};
        const {p,w,spawn,cast}=rig(), t=spawn(40), kin=spawn(70);
        for(const key of ['impaled',id]) t.applyStatus(key,0,1,'steel',{casterId:p.id,rupture:10,ruptureType:'physical'});
        const before=kin.life;
        if(end==='recall') cast('spear_recall',p);
        if(end==='cleanse') t.cleanseDebuffs();
        if(end==='expiry'){for(const st of t.statuses)st.remaining=.001; w.update(.01);}
        else w.kill(t,false,p);
        const blasts=w.flashes.filter(f=>f.statusRelease?.trigger==='death'||f.statusRelease?.trigger==='expiry');
        assert.equal(blasts.length,end===armed?1:0,armed+' / '+end);
        if(blasts.length) assert.equal(blasts[0].statusRelease?.status,id);
        assert.equal(kin.life<before,end===armed);
      }
    }finally{delete STATUS_DEFS[id];}
  });
  for(const quiet of [true,false]) test('a '+(quiet?'dismissed':'slain')+' ooze earns only its declared death division',()=>{
    const {w,p,spawn}=rig(), ooze=spawn(35,'enemy','viscous_ooze');
    ooze.brain=MONSTERS.viscous_ooze.brain;
    w.kill(ooze,quiet,p);
    assert.equal(w.actors.filter(a=>a.defId==='lesser_ooze').length,quiet?0:2);
  });
  test('an explicitly breakable construct bursts once on its own floor even on quiet removal',()=>{
    const {w,p,spawn}=rig(), wall=spawn(35,'player'), near=spawn(45), below=spawn(45);
    wall.owner=p; wall.tier=near.tier=1; below.tier=0;
    wall.construct={kind:'barrier',timer:0,range:0,breakable:{ownerMult:1},
      deathBurst:{fraction:.1,radius:55,damageType:'physical',impactFx:'mechanic:deathStone'}};
    const hp=near.life, safe=below.life; w.kill(wall,true);
    assert(near.life<hp); assert.equal(below.life,safe);
    assert.equal(w.flashes.filter(f=>f.radius===55).length,1);
    assert(w.flashes.some(f=>f.fx==='mechanic:deathStone' && f.recoveryCueTier===1));
  });
  test('only nearby same-floor carriers inherit a propagating ailment',()=>{
    const {w,p,spawn}=rig(), t=spawn(35), carrier=spawn(55), below=spawn(55);
    below.tier++; t.applyStatus('poison',2,1,'plague',{casterId:p.id,propagates:true});
    w.kill(t,false,p);
    assert(carrier.statuses.some(s=>s.id==='poison' && s.casterId===p.id && s.propagates));
    assert(!below.statuses.some(s=>s.id==='poison'));
  });
  test('the bestiary opts into a registered blast and the same warning reaches co-op',()=>{
    const {w,spawn,p}=rig(), mirror=rig().w;
    let armed=0;
    for(const def of Object.values(MONSTERS)){
      const cfg=w['resolveDeathBurst']({deathBurst:def.deathBurst,explodeOnDeath:def.explodeOnDeath??0} as typeof p);
      assert.equal(!!cfg,!!(def.deathBurst || (def.explodeOnDeath??0)>0),def.id);
      if(cfg){assert(effectVoiceOf(deathBurstVoice(cfg)),def.id); armed++;}
    }
    console.log(Object.keys(MONSTERS).length+' monster definitions inspected; '+armed+' explosive definitions');
    for(const id of ['fungal_puffball','storm_acolyte','clot_shambler','grave_shambler']){
      const t=spawn(85,'enemy',id); t.tier=p.tier=1; w.flashes=[]; w.kill(t,false,p);
      const b=w.deathBurstsView()[0]; assert(b,id);
      applySnapshot(mirror,serializeSnapshot(w,2));
      const remote=mirror.deathBurstsView()[0]; assert.equal(remote.impactFx,b.impactFx); assert.equal(remote.tier,1);
      const key=b.impactFx; assert(key && effectVoiceOf(key));
      w['updateDeathBursts'](b.coalesce+.01);
      if(b.mode==='orb'){assert(w.flashes.some(f=>f.fx==='mechanic:deathOrbForm')); w['updateDeathBursts'](b.life+.01);}
      assert.equal(w.flashes.filter(f=>f.fx===key && f.radius===b.radius && f.recoveryCueTier===1).length,1,id);
      assert.equal(w.deathBurstsView().length,0);
    }
  });
  test('all native statuses require a bank for a terminal payout',()=>{
    const {spawn}=rig(), t=spawn(30); let rows=0;
    for(const [id,def] of Object.entries(STATUS_DEFS)){
      const s={id,dps:0,remaining:1,stacks:1,sourceName:'catalog'};
      for(const end of ['death','expiry'] as const){assert(!releasesOnEnd(s,end),id); if(def.dischargeOnHit&&!def.ruptureOnEnd) assert(!releasesOnEnd({...s,rupture:9},end),id);}
      if(def.ruptureFx)assert(effectVoiceOf(def.ruptureFx),id); rows++;
    }
    assert(rows>100 && !t.dead); console.log(rows+' status definitions inspected');
  });
} finally {restore();}
if(failures) process.exitCode=1;
