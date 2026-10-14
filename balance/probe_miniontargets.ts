import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI, issueCommand, COMMAND_KINDS } from '../src/engine/ai';
import { incidentalMinionPrey } from '../src/engine/minionTargets';
import { standingOrderFor } from '../src/engine/companionStances';
import { mod } from '../src/engine/stats';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
let checks = 0;
const check = (name: string, ok: unknown) => { assert.ok(ok, name); checks++; console.log('PASS ' + name); };
const restore = seedGlobalRandom(7293);
function rig() {
  const w = makeSimWorld('warrior', 7293), p = w.player;
  w.walk = null; w.doodads = []; w.markDoodadsChanged(); w.actors = [p];
  p.pos = { x: 500, y: 600 }; w.time = 10;
  const spawn = (id: string, x: number, team: 'player' | 'enemy' = 'enemy') => {
    const a = w.createMonster(id, 1, team); a.pos = { x, y: 600 }; a.tier = p.tier; a.spawnedAt = -1;
    w.springAmbush(a, true); a.untargetable = false;
    a.sheet.setSource('rig', [mod('life', 'override', 10000), mod('detectability', 'override', 1), mod('detectionRange', 'override', 1500)]);
    a.fillResources(); w.actors.push(a); return a;
  };
  const a = spawn('plains_wolf', 520, 'player'); a.owner = p;
  a.brain = { type: 'basic', perception: { arcDeg: 360, rearMul: 1, xray: true }, skillUse: { mode: 'priority', order: [] } };
  const think = (rescan = true) => {
    if (rescan) a.aiRescanAt = 0;
    a.casting = null; a.useLock = 0; updateAI(a, w, 0);
    return a.aiTargetId;
  };
  return { w, p, a, spawn, think };
}
try {
  for (const id of ['meadow_hare', 'marsh_toad', 'glow_moth', 'will_o_wisp']) {
    const s = rig(), prey = s.spawn(id, 740);
    check(id + ' is incidental and ignored at distance', incidentalMinionPrey(s.a, prey) && s.think() === undefined);
    prey.pos.x = 550;
    check(id + ' is available at idle contact range', s.think() === prey.id);
  }
  for (const prefer of ['nearest', 'farthest', 'highestThreat', 'lowestLife', 'highestLife', 'random'] as const) {
    const s = rig(), prey = s.spawn('meadow_hare', 550), danger = s.spawn('zombie', 710);
    s.a.brain = { ...s.a.brain, target: { prefer, stickiness: 100 } };
    s.a.aiTargetId = prey.id; s.a.aiTargetRef = prey; s.a.threat.set(prey.id, 10000);
    check(prefer + ': danger outranks a held harmless critter', s.think() === danger.id);
  }
  {
    const s = rig(), prey = s.spawn('meadow_hare', 550);
    check('idle pet first acquires close prey', s.think() === prey.id);
    prey.pos.x = 690; s.a.aiRescanAt = 100;
    check('fleeing prey drops even between scheduled scans', s.think(false) === undefined);
    s.a.pos.x = 850; prey.pos.x = 870;
    check('contact range never permits a chase away from keeper', s.think() === undefined);
  }
  for (const id of ['shore_crab', 'taiga_elk']) {
    const s = rig(), e = s.spawn(id, 750);
    check(id + ' remains a normal dangerous target', !incidentalMinionPrey(s.a, e) && s.think() === e.id);
  }
  {
    const s = rig(), e = s.spawn('meadow_hare', 750); e.skills = [makeSkillInstance(SKILLS.claw)];
    check('a live armed variant is not dismissed as harmless', s.think() === e.id);
  }
  {
    const s = rig(), prey = s.spawn('meadow_hare', 740);
    issueCommand(s.a, { kind: 'assault', pos: { ...prey.pos }, targetId: prey.id, until: 20 });
    check('explicitly pinned assault still obeys the player', s.think() === prey.id);
  }
  {
    const s = rig(), prey = s.spawn('meadow_hare', 550), danger = s.spawn('zombie', 610);
    const picked = COMMAND_KINDS.assault.step(s.a, s.w, { kind: 'assault', pos: { ...prey.pos }, radius: 100, until: 20 }, 0);
    check('an unpinned assault mark chooses the actual threat', picked === danger);
  }
  {
    const s = rig(), prey = s.spawn('meadow_hare', 550), danger = s.spawn('zombie', 710);
    s.a.standingOrder = standingOrderFor('defensive'); s.a.aiTargetId = prey.id; s.a.aiTargetRef = prey;
    s.p.lastFoeId = prey.id; s.p.lastFoeAt = 10; s.p.aiHitById = danger.id; s.p.aiHitAt = 10;
    check('defensive pets leave held prey to answer a keeper threat', s.think() === danger.id);
    s.a.standingOrder = standingOrderFor('passive');
    check('passive stance still refuses combat', s.think() === undefined);
  }
  {
    const s = rig(), prey = s.spawn('meadow_hare', 740); s.a.owner = undefined; s.a.team = 'enemy';
    s.w.actors = [s.a, prey]; s.a.brain = { ...s.a.brain, target: { prey: ['critter'] } };
    check('wild predator hunting remains unchanged', s.think() === prey.id);
  }
  {
    const s = rig(), prey = s.spawn('meadow_hare', 740, 'player'); s.a.team = 'enemy'; s.a.owner = s.spawn('zombie', 500); s.w.actors = [s.a, s.a.owner, prey];
    check('enemy minions retain their own targeting', !incidentalMinionPrey(s.a, prey) && s.think() === prey.id);
  }
  console.log('PASS ' + checks + ' minion target checks');
} finally { restore(); }
