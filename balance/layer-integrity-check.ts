/** Floor-changing combat and loot regression course. Run with tsx. */
import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { skillFieldVisual } from '../src/engine/skillFieldVisual';
import type { World, Projectile } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { GridWalkField } from '../src/world/gridWalk';
import { skillToLoot, type DeathRecord } from '../src/meta/death';
import { SUPPORTS } from '../src/data/supports';
import { CREEPS } from '../src/engine/creep';
type Guts = {
  updateProjectiles(dt:number):void; updateZones(dt:number):void;
  nearestProjTarget(p:Projectile):Actor|null; zoneVictims(z:World['zones'][number]):Actor[];
  updateChests(dt:number):void; updateShrines():void;
  updateTerrainEffects(dt:number):void; updateDrops(dt:number):void;
  spawnPlayerCorpses(def:World['zone']):void; reclaimCorpse(c:World['playerCorpses'][number]):void;
  pickupSeat(at:Actor['pos'],reach:number,exclude?:string,story?:number):unknown;
  advanceProjectile(p:Projectile,dt:number):void;
};
const guts = (w:World) => w as unknown as Guts;
function fixture() {
  const w=makeSimWorld('warrior',1971),p=w.player; p.pos={x:500,y:500};p.tier=0;
  w.zone={...w.zone,tiers:{kind:'over',levels:1,exposure:'covered'}};
  w.doodads=[];w.markDoodadsChanged();w.rebuildClientTerrain();w.actors=[p];
  const foes=[0,1].map(tier=>{
    const e=w.createMonster('zombie',1,'enemy');e.pos={x:560,y:500};e.tier=tier;e.skills=[];
    e.sheet.setSource('layer-check',[mod('life','override',10000),mod('armor','override',0),mod('evasion','override',0),mod('blockChance','override',0),mod('energyShield','override',0)]);
    e.fillResources();w.actors.push(e);return e;
  });
  p.sheet.setSource('layer-check',[mod('accuracy','override',100000),mod('critChance','override',0)]);
  return {w,p,lower:foes[0],upper:foes[1]};
}
let failures=0;
const check=(name:string,run:()=>void)=>{try{run();console.log('PASS '+name);}catch(e){failures++;console.error('FAIL '+name+': '+String(e));}};
const restore=seedGlobalRandom(1971);
try {
  check('free projectile keeps launch floor for homing and contact after caster climbs',()=>{
    const {w,p,lower,upper}=fixture();
    const inst=makeSkillInstance({...SKILLS.fireball,baseDamage:{fire:[25,25]},effects:[{type:'damage'}],
      delivery:{type:'projectile',speed:200,range:500,radius:10}});
    w.spawnProjectile(p,inst,{...p.pos},0);const flight=w.projectiles[0];p.tier=1;
    assert.equal(guts(w).nearestProjTarget(flight),lower,'homing reads the flight floor');
    const hp=[lower.life,upper.life];guts(w).updateProjectiles(.3);
    assert.ok(lower.life<hp[0],'lower foe takes the launch-floor shot');
    assert.equal(upper.life,hp[1],'upper foe is untouched');
  });
  check('placed fields stamp their floor before the first tick and keep damaging it',()=>{
    const {w,p,lower,upper}=fixture(),def=SKILLS.toxic_cloud;
    assert.equal(def.delivery.type,'ground');
    w.executeSkill(p,makeSkillInstance(def),lower.pos,{noCooldown:true,noRepeat:true});
    const z=w.zones[0];assert.ok(z);assert.equal(z.tier,0,'birth stamp exists');
    p.tier=1;guts(w).updateZones(.05);
    assert.equal(z.tier,0);assert.equal(skillFieldVisual(z,w.time).tier,0);
    assert.ok(guts(w).zoneVictims(z).includes(lower));
    assert.ok(!guts(w).zoneVictims(z).includes(upper));
  });
  check('projectile terminal fields and shards inherit the flight floor',()=>{
    const {w,p}=fixture();w.actors=[p];
    p.sheet.setSource('layer-shrapnel',[mod('returnShrapnel','flat',2)]);
    const inst=makeSkillInstance({...SKILLS.fireball,effects:[{type:'damage'}],
      delivery:{type:'projectile',speed:200,range:20,radius:5,endZone:{radius:40,duration:2}}});
    w.spawnProjectile(p,inst,{...p.pos},0);p.tier=1;guts(w).updateProjectiles(.2);
    assert.ok(w.zones.length);assert.ok(w.zones.every(z=>z.tier===0),'terminal field');
    assert.ok(w.projectiles.length);assert.ok(w.projectiles.every(p=>p.tier===0),'terminal shards');
  });
  check('co-op snapshots retain projectile and drop floors independently of item rank',()=>{
    const {w,p}=fixture();p.tier=1;w.spawnProjectile(p,makeSkillInstance(SKILLS.fireball),p.pos,0);
    w.drops=[{pos:{...p.pos},bob:0,tier:1,item:{kind:'abilityEssence',tier:3,count:2}}];
    const snap=serializeSnapshot(w,1),remote=makeSimWorld('warrior',18);applySnapshot(remote,snap);
    assert.equal(remote.projectiles[0].tier,1);assert.equal(remote.drops[0].tier,1);
    assert.equal(remote.drops[0].item.kind,'abilityEssence');
    if(remote.drops[0].item.kind==='abilityEssence')assert.equal(remote.drops[0].item.tier,3);
  });
  check('chests and shrines cannot be used through a ceiling',()=>{
    const {w,p}=fixture();p.tier=1;
    w.chests=[{pos:{...p.pos},kind:'timed',mimic:false,opened:false,lockTime:1,maxLock:1}];
    w.shrines=[{pos:{...p.pos},used:false,def:{id:'floor',name:'Floor Shrine',duration:10,color:'#fff',mods:[]}}];
    guts(w).updateChests(.2);guts(w).updateShrines();
    assert.equal(w.chests[0].lockTime,1);assert.equal(w.shrines[0].used,false);
    p.tier=0;guts(w).updateChests(.2);guts(w).updateShrines();
    assert.equal(w.chests[0].lockTime,.8);assert.equal(w.shrines[0].used,true);
  });
  check('sight cache invalidates immediately when an endpoint changes floor',()=>{
    const {w,p,lower}=fixture();let rays=0;
    w.lineOfSight=(_a,_b,a,b)=>{rays++;return a===b;};
    assert.equal(w.losCached(p,lower),true);p.tier=1;
    assert.equal(w.losCached(p,lower),false);assert.equal(rays,2);
  });
  check('attached fields and orbiting shots follow their living anchor to its floor',()=>{
    const {w,p}=fixture();w.actors=[p];
    w.executeSkill(p,makeSkillInstance(SKILLS.toxic_cloud),p.pos,{noCooldown:true,noRepeat:true});
    const z=w.zones[0];z.follow=true;
    w.spawnProjectile(p,makeSkillInstance(SKILLS.fireball),p.pos,0);
    const shot=w.projectiles[0];shot.orbit=1;shot.orbRadius=50;shot.orbitR0=50;
    p.tier=1;guts(w).updateZones(.01);guts(w).advanceProjectile(shot,.01);
    assert.equal(z.tier,1);assert.equal(shot.tier,1);
  });
  check('projectile secondary casts inherit an explicit origin floor',()=>{
    const {w,p,lower}=fixture();p.tier=1;
    w.executeSkill(p,makeSkillInstance(SKILLS.toxic_cloud),lower.pos,{noCooldown:true,noRepeat:true,tier:0});
    assert.ok(w.zones.length);assert.ok(w.zones.every(z=>z.tier===0));
    assert.ok(guts(w).zoneVictims(w.zones[0]).includes(lower));
  });
  check('secondary burst damage and its delayed aftermath stay on the impact floor',()=>{
    const {w,p,lower,upper}=fixture();p.tier=1;
    p.sheet.setSource('layer-pulse',[mod('pulseCount','flat',1)]);
    const inst=makeSkillInstance({...SKILLS.fireball,baseDamage:{fire:[25,25]},effects:[{type:'damage'}],
      delivery:{type:'nova',radius:100}});
    const hp=[lower.life,upper.life];
    w.executeSkill(p,inst,lower.pos,{targetInfo:{pos:{...lower.pos}},tier:0,noCooldown:true,noRepeat:true});
    assert.ok(lower.life<hp[0]);assert.equal(upper.life,hp[1]);
    assert.ok(w.zones.length);assert.ok(w.zones.every(z=>z.tier===0));
  });
  check('support gems spilled from a full upstairs bag stay upstairs',()=>{
    const {w,p}=fixture();p.tier=1;
    const gem={def:SUPPORTS[Object.keys(SUPPORTS)[0]],level:1};
    for(let i=0;i<160&&!w.drops.length;i++)w.grantSupportGemItem(w.localSeat,gem,true);
    assert.ok(w.drops.length);assert.ok(w.drops.every(d=>d.tier===1));
  });
  check('a blast cannot quench or feed a terrain front on another floor',()=>{
    const {w,p}=fixture(),f=w.creepEnsure()!;
    const fire=f.addFront(CREEPS.wildfire,p.pos.x,p.pos.y,0,{reach:100,bornFrac:1})!;
    const before=fire.front!.vigor;
    assert.equal(f.damageSkin(p.pos.x,p.pos.y,60,{cold:9999},1),false);
    assert.equal(fire.front!.vigor,before);
    assert.equal(f.damageSkin(p.pos.x,p.pos.y,60,{cold:9999},0),true);
    assert.equal(fire.state,'recede');
  });
  check('grid brush conceals only bodies on its floor and clears their region on ascent',()=>{
    const {w,p,upper}=fixture(),grid=new GridWalkField(1200,1200);
    grid.fillRegion(0,0,1199,1199,'brush');w.walk=grid;
    guts(w).updateTerrainEffects(.05);
    assert.ok(p.statuses.some(s=>s.id==='concealed'));
    assert.ok(!upper.statuses.some(s=>s.id==='concealed'));assert.equal(upper.gridRegion,undefined);
    p.tier=1;guts(w).updateTerrainEffects(.05);assert.equal(p.gridRegion,undefined);
  });
  check('saved corpse floor survives reload and all reclaimed gems retain that floor',()=>{
    const {w,p}=fixture();w.zoneMap[w.zone.id]=w.zone;
    const rec:DeathRecord={schema:1,mapX:w.zone.map.x,mapY:w.zone.map.y,pos:{...p.pos},tier:1,
      zoneId:w.zone.id,loot:{items:[skillToLoot(makeSkillInstance(SKILLS.fireball)),
      {kind:'support',supportId:Object.keys(SUPPORTS)[0],level:1}]},classId:'warrior',charLevel:1,
      zoneName:w.zone.name,owner:'p0',timestamp:1};
    w.corpseRecords().push(JSON.parse(JSON.stringify(rec)));guts(w).spawnPlayerCorpses(w.zone);
    const c=w.playerCorpses[0];assert.equal(c.tier,1);p.pos={...c.pos};
    assert.equal(w.nearPlayerCorpse(),false);p.tier=1;assert.equal(w.nearPlayerCorpse(),true);
    guts(w).reclaimCorpse(c);assert.equal(w.drops.length,2);assert.ok(w.drops.every(d=>d.tier===1));
    assert.equal(guts(w).pickupSeat(p.pos,80,undefined,0),undefined);
    assert.ok(guts(w).pickupSeat(p.pos,80,undefined,1));
  });
  check('old corpse records infer terrain and old network packets default to ground',()=>{
    const {w,p}=fixture();w.spawnProjectile(p,makeSkillInstance(SKILLS.fireball),p.pos,0);
    w.drops=[{pos:{...p.pos},bob:0,tier:1,item:{kind:'abilityEssence',tier:2,count:1}}];
    const snap=serializeSnapshot(w,2);delete snap.projectiles[0].tier;delete snap.drops[0].tier;
    const remote=makeSimWorld('warrior',20);applySnapshot(remote,snap);
    assert.equal(remote.projectiles[0].tier,0);assert.equal(remote.drops[0].tier,0);
    const rec:DeathRecord={schema:1,mapX:w.zone.map.x,mapY:w.zone.map.y,pos:{...p.pos},
      zoneId:w.zone.id,loot:{items:[skillToLoot(makeSkillInstance(SKILLS.fireball))]},
      classId:'warrior',charLevel:1,zoneName:w.zone.name,owner:'p0',timestamp:2};
    w.zoneMap[w.zone.id]=w.zone;w.corpseRecords().push(rec);guts(w).spawnPlayerCorpses(w.zone);
    assert.equal(w.playerCorpses[0].tier,0);
  });
} finally {restore();}
if(failures)process.exitCode=1;
