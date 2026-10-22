/** Current shared bug fixes, exercised through the real game. Run with tsx. */
import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { SKILLS } from '../src/data/skills';
import { CLASSES } from '../src/data/classes';
import { NullInput } from '../src/net/intent';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { puzzleContactHeatsCombat, type PuzzleRun } from '../src/engine/puzzles';
import { STATUS_DEFS } from '../src/engine/status';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import type { Doodad } from '../src/engine/levelgen';
type Internals = {
  updateTerrainEffects(dt: number): void; updateChests(dt: number): void; updateShrines(): void;
  tryGuardBlock(v: Actor, a: Actor, from: {x:number;y:number}, raw: number): boolean;
  bootPuzzles(def: unknown, pois: {x:number;y:number}[]): void; puzzles: PuzzleRun[];
  resolveHit(a: Actor, s: SkillInstance, b: Actor): void; updatePuzzles(dt: number): void;
};
const inside = (w: World) => w as unknown as Internals;
const restore = seedGlobalRandom(5531);
try {
  const w = makeSimWorld('warrior', 42), p = w.player;
  const e = w.createMonster('zombie', 1, 'enemy'); e.skills = [];
  w.actors = [p, e]; const at = {x:500,y:500}; p.pos = {...at};
  for (const kind of ['brush', 'reeds', 'berry_bush']) {
    const d: Doodad = {kind,pos:{...at},radius:55};
    w.doodads = [d]; w.markDoodadsChanged(); w.rebuildClientTerrain();
    p.pos = {...at}; e.pos = {...at}; p.updateTimers(2); e.updateTimers(2);
    inside(w).updateTerrainEffects(1/60);
    assert.equal(p.sheet.get('detectability'), .5, kind+' covers the hero');
    assert.equal(e.sheet.get('detectability'), .5, kind+' covers enemies');
    const mirror = makeSimWorld('warrior', 71); applySnapshot(mirror, serializeSnapshot(w, 1));
    assert.equal(mirror.player.sheet.get('detectability'), .5, 'cover replicates');
    p.pos.x += 100; p.updateTimers(1); inside(w).updateTerrainEffects(1/60);
    assert.equal(p.sheet.get('detectability'), 1, 'cover expires after leaving');
    p.pos = {...at}; d.felled = {at:w.time,wake:w.time+100}; w.markDoodadsChanged();
    inside(w).updateTerrainEffects(1/60); assert.equal(p.sheet.get('detectability'), 1, 'felled cover');
    delete d.felled; d.gone = true; w.markDoodadsChanged(); inside(w).updateTerrainEffects(1/60);
    assert.equal(p.sheet.get('detectability'), 1, 'removed cover');
    delete d.gone; p.tier = 1; w.markDoodadsChanged(); inside(w).updateTerrainEffects(1/60);
    assert.equal(p.sheet.get('detectability'), 1, 'cover does not cross floors'); p.tier = 0;
  }
  console.log('PASS brush/reed/berry cover, both teams, replication, expiry, removal and floor isolation');

  w.doodads = []; w.markDoodadsChanged(); w.rebuildClientTerrain();
  e.pos = {x:700,y:500}; p.pos = {...at};
  for (const held of [0, 2]) {
    p.updateTimers(10); p.casting = null; p.useLock = 0; p.cooldowns.clear();
    const guard = makeSkillInstance({...SKILLS.shield_up, requirements:undefined, manaCost:0,
      guard:{...SKILLS.shield_up.guard!,parry:{window:1,counterMult:0}}});
    w.useSkill(p, guard, e.pos, true); const casting = (p as Actor).casting;
    assert.ok(casting); casting.channelTime = held;
    assert.equal(inside(w).tryGuardBlock(p,e,{x:300,y:500},40),false);
    assert.equal(p.recently('block'),false,'rear miss grants no block');
    assert.equal(inside(w).tryGuardBlock(p,e,e.pos,40),true);
    assert.equal(p.recently('block'),true,held?'held guard recency':'parry recency');
    p.updateTimers(10); assert.equal(p.recently('block'),false,'recency expires');
  }
  console.log('PASS held guard/parry block recency, wrong-angle refusal and expiry');

  p.casting = null;
  inside(w).bootPuzzles({id:'shared-check',level:1,objective:{kind:'puzzle',puzzle:'twin_accord'},puzzles:[]}, [{x:800,y:700}]);
  const r = inside(w).puzzles[0], node = r.nodes[0]; assert.ok(node.passive);
  const hit = makeSkillInstance({...SKILLS.fireball,manaCost:0});
  w.time = 100; w.lastCombatAt = 90;
  inside(w).resolveHit(p,hit,node); inside(w).updatePuzzles(0);
  assert.equal(w.lastCombatAt,90,'quiet puzzle does not prolong or erase combat');
  assert.equal(puzzleContactHeatsCombat(r,node),false);
  assert.equal(puzzleContactHeatsCombat({...r,nodes:[]},node),true,'stale identity is combat');
  assert.equal(puzzleContactHeatsCombat(undefined,node),true,'unregistered marker is combat');
  inside(w).resolveHit(p,hit,e); assert.equal(w.lastCombatAt,100,'real enemy remains combat');
  w.time = 101; inside(w).resolveHit(p,hit,node); assert.equal(w.lastCombatAt,100);
  console.log('PASS enrolled puzzle contacts preserve calm; genuine combat and invalid markers retain lock');

  const a = w.createMonster('zombie',1,'enemy'), b = w.createMonster('zombie',1,'enemy');
  let rays = 0; const originalRay = w.lineOfSight;
  w.lineOfSight = () => ++rays === 1;
  a.id = 1; b.id = 1_000_001; assert.equal(w.losCached(a,b),true);
  a.id = 2; b.id = 1; assert.equal(w.losCached(a,b),false,'distinct large ids cannot collide');
  a.id = 2**26; assert.equal(w.losCached(a,b),false); assert.equal(rays,3,'overflow falls back to a ray');
  w.lineOfSight = originalRay;
  const mire = STATUS_DEFS.mired.screenCue, befuddled = STATUS_DEFS.befuddlement.screenCue;
  assert.ok(mire); assert.ok(befuddled);
  assert.equal(mire.motif,'mire'); assert.equal(befuddled.motif,'befuddlement');
  console.log('PASS large actor sight keys and distinct Mired/Befuddled cues');

  const guest = w.addSeat('qa-guest', CLASSES.find(c => c.id === 'warrior') ?? CLASSES[0], new NullInput());
  p.dead = true; guest.actor.pos = {...at};
  w.chests = [{pos:{...at},kind:'timed',mimic:false,opened:false,lockTime:1,maxLock:1}];
  inside(w).updateChests(.2); assert.equal(w.chests[0].lockTime,.8,'guest searches while host is dead');
  guest.actor.downed = true; inside(w).updateChests(.2); assert.equal(w.chests[0].lockTime,.8,'downed hands excluded');
  guest.actor.downed = false;
  w.shrines = [{pos:{...at},used:false,def:{id:'qa',name:'QA Shrine',color:'#fff',duration:10,mods:[]}}];
  inside(w).updateShrines(); assert.equal(w.shrines[0].used,true);
  assert.equal(guest.actor.buffs.get('shrine_qa')?.def.label,'QA Shrine');
  assert.equal(p.buffs.has('shrine_qa'),false,'the touching human receives the shrine');
  console.log('PASS guest chest/shrine interaction, downed exclusion and named buff on actual recipient');
} finally { restore(); }
