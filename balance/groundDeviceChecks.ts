import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance, type ConstructDelivery } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { updateAI } from '../src/engine/ai';
import { deviceTriggerErrors } from '../src/engine/groundDevices';

export function checkGroundDevices(): void {
  let checks = 0;
  const check = (label: string, value: unknown) => { assert.ok(value, label); checks++; };
  function rig() {
    seedGlobalRandom(8181);
    const w = makeSimWorld('necromancer', 8181), p = w.player;
    w.walk = null; w.doodads = []; w.markDoodadsChanged(); w.actors = [p];
    p.pos = { x: 700, y: 700 }; p.skills = []; p.buffs.clear(); p.statuses = [];
    p.sheet.setSource('qa', [mod('life', 'override', 10000), mod('mana', 'override', 10000),
      mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('critChance', 'override', 0)]);
    p.fillResources();
    const enemy = () => {
      const a = w.createMonster('skeleton_warrior', 1, 'enemy'); a.pos = { x: 1000, y: 700 };
      a.brain = undefined; a.spawnedAt = -10;
      a.sheet.setSource('qa', [mod('life', 'override', 10000), mod('mana', 'override', 10000),
        mod('accuracy', 'override', 10000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0),
        mod('moveSpeed', 'override', 1000), mod('traction', 'override', 1)]);
      a.fillResources(); w.actors.push(a); return a;
    };
    const skill = (id: string) => makeSkillInstance({ ...SKILLS[id], requirements: undefined });
    const place = (id = 'frost_trap', trigger?: ConstructDelivery['deviceTrigger']) => {
      const base = skill(id), d = base.def.delivery;
      assert(d.type === 'construct');
      const inst = makeSkillInstance({ ...base.def, delivery: { ...d, deviceTrigger: trigger } });
      w.executeSkill(p, inst, { x: 850, y: 700 });
      const c = [...w.actors].reverse().find(a => a.summonInst === inst);
      assert(c); return c;
    };
    const api = w as unknown as { updateConstructs(dt: number): void; updateDetonations(dt: number): void; separateActors(): void };
    return { w, p, enemy, skill, place, api };
  }
  {
    const { w, enemy, place, api } = rig(), e = enemy(), c = place();
    e.pos = { ...c.pos }; const life = e.life;
    api.updateConstructs(.49); check('contact waits through arming delay', !c.dead && e.life === life);
    w.actorGridRev++; api.updateConstructs(.02); check('occupied armed trap fires its cast-bar payload immediately', c.dead && e.life < life && !c.casting);
    const after = e.life; api.updateConstructs(1); check('trap payload is single-use', e.life === after);
  }
  for (const kind of ['frost_trap', 'fire_mine']) {
    const { p, place, api } = rig(), c = place(kind);
    p.pos = { x: c.pos.x + 1, y: c.pos.y }; const before = { ...p.pos };
    api.separateActors();
    check(kind + ' is walkable atop, without body separation', p.pos.x === before.x && p.pos.y === before.y);
  }
  for (const reason of ['ally', 'dead', 'downed', 'untargetable', 'tier', 'flying', 'levitating', 'construct']) {
    const { enemy, place, api, p } = rig(), e = enemy(), c = place(undefined, { armTime: 0 });
    e.pos = { ...c.pos };
    if (reason === 'ally') { e.team = p.team; e.owner = p; }
    if (reason === 'dead') e.dead = true;
    if (reason === 'downed') e.downed = true;
    if (reason === 'untargetable') e.untargetable = true;
    if (reason === 'tier') e.tier = 1;
    if (reason === 'flying') e.flying = true;
    if (reason === 'levitating') e.sheet.setSource('float', [mod('levitation', 'flat', 1)]);
    if (reason === 'construct') e.construct = { kind: 'mine', range: 0, timer: 0 };
    api.updateConstructs(.1); check(reason + ' cannot press a ground trap', !c.dead);
  }
  for (const airborne of [false, true]) {
    for (const groundOnly of [true, false]) {
      const { w, enemy, place, api } = rig(), e = enemy(), c = place(undefined, { armTime: 0, radius: 12, groundOnly });
      e.pos = { x: 700, y: 700 }; e.flying = airborne;
      w.moveActor(e, 1, 0, .3); assert(e.pos.x > c.pos.x + 50, 'fixture crossed entirely');
      api.updateConstructs(.3);
      check('resolved fast crossing respects groundOnly=' + groundOnly + '/air=' + airborne, c.dead === (!groundOnly || !airborne));
    }
  }
  {
    const { enemy, place, api } = rig(), e = enemy(), c = place(undefined, { armTime: 0, radius: 12 });
    e.pos = { x: 700, y: 700 }; e.pos = { x: 1000, y: 700 }; api.updateConstructs(.1);
    check('teleporting over a trap does not invent contact', !c.dead);
    e.pos = { ...c.pos }; api.updateConstructs(.1); check('teleport landing can press an armed plate', c.dead);
  }
  {
    const { w, p, api } = rig();
    const snare = w.createMonster('jaw_snare', 1, 'enemy'); snare.pos = { ...p.pos }; w.actors.push(snare);
    check('authored jaw snare is a visible contact device', snare.construct?.kind === 'trap' && !snare.untargetable);
    p.pos.x += 1; const at = { ...p.pos }; api.separateActors();
    check('monster-authored snare is also flat', p.pos.x === at.x && p.pos.y === at.y);
    const life = p.life; api.updateConstructs(.51);
    check('jaw snaps immediately once with real damage', snare.dead && p.life < life && !snare.casting);
  }
  {
    const { w, p, enemy, place, skill, api } = rig(), e = enemy(), cmd = skill('detonate_mines');
    const first = place('fire_mine'), second = place('fire_mine'), arming = place('fire_mine', { armTime: 1 });
    e.pos = { ...first.pos };
    check('owned ready mines make command useful', w.deviceCommandUseful(p, cmd));
    const peer = rig().w, firstSnap = serializeSnapshot(w, 1); applySnapshot(peer, firstSnap);
    check('arming duration reaches peers', peer.actors[firstSnap.actors.findIndex(a => a.id === arming.id)]?.construct?.armingDuration === 1);
    api.updateConstructs(.2); check('contact never detonates remote mines', !first.dead && !second.dead);
    w.executeSkill(p, cmd, p.pos); w.executeSkill(p, cmd, p.pos);
    check('repeat command cannot queue a mine twice; arming mine waits', w.pendingDetonations.length === 2);
    check('queued devices no longer lure the AI picker', !w.deviceCommandUseful(p, cmd));
    const queuedSnap = serializeSnapshot(w, 2); applySnapshot(peer, queuedSnap);
    check('remote pending fuse has real queue clock', peer.actors[queuedSnap.actors.findIndex(a => a.id === first.id)]?.construct?.detonationLeft === .05);
    const life = e.life; api.updateDetonations(.06);
    check('first mine fires and deals damage', first.dead && !second.dead && e.life < life);
    api.updateDetonations(.08); check('second mine preserves stagger', second.dead && !arming.dead);
    api.updateConstructs(1); w.executeSkill(p, cmd, p.pos); arming.dead = true;
    const saved = e.life; api.updateDetonations(1); check('destroyed mine cancels pending payload', e.life === saved);
  }
  {
    const { w, p, enemy, place, skill } = rig(), e = enemy(), cmd = skill('detonate_mines'), c = place('fire_mine');
    check('empty blast footprint is not useful', !w.deviceCommandUseful(p, cmd));
    e.pos = { ...c.pos }; e.tier = 1;
    check('other floor is not a useful target', !w.deviceCommandUseful(p, cmd));
    e.tier = 0;
    check('another commander cannot spend these mines', !w.deviceCommandUseful(e, cmd));
    const host = skill('fire_mine'); p.skills = [host, host];
    check('duplicate hosts expose one autonomous command', w.autonomousMetas(p).length === 1);
    check('reserved host suppresses its command', !w.autonomousMetas(p, new Set(['fire_mine'])).length);
    p.aiSkillBans = new Set(['fire_mine']);
    check('banned host suppresses its command', !w.autonomousMetas(p).length);
    p.aiSkillBans.clear(); p.skills.push(cmd);
    check('explicit command bar wins over host meta', !w.autonomousMetas(p).length);
  }
  {
    const { w, enemy, place, api } = rig(), e = enemy();
    const old = place(undefined, { armTime: 0, radius: 12 }); old.pos.y = 900;
    e.pos = { x: 700, y: 700 }; w.moveActor(e, 1, 0, .3);
    const fresh = place(undefined, { armTime: 0, radius: 12 }); api.updateConstructs(.3);
    check('newly placed trap cannot see movement from before its birth', !fresh.dead);
    e.pos = { x: 700, y: 700 }; w.moveActor(e, 1, 0, .3); api.updateConstructs(.3);
    check('new trap watches subsequent movement', fresh.dead);
  }
  {
    const { w, enemy, place, api } = rig(), e = enemy(), c = place(undefined, { armTime: 0, radius: 12 });
    e.pos = { x: 700, y: 700 };
    w.doodads.push({ pos: { x: 780, y: 700 }, radius: 42, kind: 'rock' } as typeof w.doodads[number]);
    w.markDoodadsChanged(); w.moveActor(e, 1, 0, .3); api.updateConstructs(.3);
    check('wall-clamped travel does not press a trap beyond the wall', !c.dead && e.pos.x < 750);
  }
  {
    const { w, enemy, place } = rig(), e = enemy(), c = place(undefined, { armTime: 0, radius: 12 });
    e.pos = { x: 700, y: 700 }; e.push = { vx: 1500, vy: 0 };
    w.update(.2); check('resolved knockback can cross a contact trap', c.dead);
  }
  {
    const { w, p, enemy, place, skill } = rig(), e = enemy(), c = place('fire_mine');
    e.pos = { ...c.pos };
    const base = skill('detonate_mines').def;
    const two = makeSkillInstance({ ...base, ai: { ...base.ai!, deployed: { kind: 'mine', minTargets: 2 } } });
    check('configured minimum targets holds detonation', !w.deviceCommandUseful(p, two));
    const e2 = enemy(); e2.pos = { ...c.pos };
    check('configured target threshold can be met', w.deviceCommandUseful(p, two));
    const stock = makeSkillInstance({ ...base, ai: { ...base.ai!, deployed: { kind: 'mine', minCount: 2 } } });
    check('configured mine count holds detonation', !w.deviceCommandUseful(p, stock));
    place('fire_mine'); check('configured mine count can be met', w.deviceCommandUseful(p, stock));
  }
  {
    const { w, p, api } = rig();
    const gnoll = w.createMonster('gnoll_trapper', 1, 'enemy');
    gnoll.pos = { x: 900, y: 700 }; gnoll.facing = Math.PI; gnoll.spawnedAt = -10;
    w.actors.push(gnoll);
    let snare: typeof gnoll | undefined;
    for (let i = 0; i < 60 * 17 && !snare; i++) {
      updateAI(gnoll, w, 1 / 60); w.update(1 / 60);
      snare = w.actors.find(a => a.defId === 'jaw_snare' && !a.dead);
    }
    check('shipped Gnoll Trapper really lays its device', snare?.construct?.kind === 'trap');
    assert(snare);
    check('rule-laid devices retain their creator and no-bounty policy', snare.owner === gnoll && snare.noBounty);
    p.pos = { ...snare.pos }; w.actorGridRev++;
    const life = p.life; api.updateConstructs(.51);
    check('the real rule-laid snare snaps on the player', snare.dead && p.life < life);
  }
  for (const hz of [30, 60]) {
    const { w, p, enemy, skill } = rig(), a = enemy();
    a.pos = { x: 900, y: 700 }; a.facing = Math.PI; a.skills = [skill('fire_mine')];
    a.sheet.setSource('still', [mod('moveSpeed', 'override', 0)]);
    a.brain = { type: 'basic', move: { style: 'holdRange', hold: 300 } };
    const life = p.life; let laid = false, queued = false;
    for (let i = 0; i < hz * 12; i++) {
      updateAI(a, w, 1 / hz); w.update(1 / hz);
      laid ||= w.actors.some(c => c.owner === a && c.construct?.kind === 'mine');
      queued ||= w.pendingDetonations.some(d => d.mine.owner === a);
    }
    check('AI places and remotely detonates its mine at ' + hz + ' Hz', laid && queued && p.life < life);
    check('AI meta uses normal cooldown/payment path', a.metaInsts.size > 0 && a.mana < a.maxMana());
  }
  check('device authoring rejects invalid numbers', deviceTriggerErrors({ radius: NaN, armTime: -1 }).length === 2);
  console.log(`PASS ${checks} ground-device checks: contacts, arming, movement, AI mine loop and peers`);
}
