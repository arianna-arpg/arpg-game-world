import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { VOCATIONS, vocationOwnClass } from '../src/data/vocations';
import { PASSIVE_NODES } from '../src/data/passives';
import { SUMMON_PACTS } from '../src/data/summonPacts';
import { makeSkillInstance, crewBoardingOpen, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { deriveSummonPactSupports } from '../src/engine/summonPacts';
import { serializeSeatMeta, applySeatMeta, serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import type { World } from '../src/engine/world';

let checks = 0;
function check(name: string, run: () => void) { run(); checks++; console.log('PASS ' + name); }
const restore = seedGlobalRandom(0x6b1ad);
function setup(...pacts: string[]) {
  const w = makeSimWorld('necromancer', 0x6b1ad);
  w.player.skills.fill(null); w.meta.knownSkills.clear();
  w.player.sheet.setSource('pact-check', pacts.map(id => mod('summonPact_' + id, 'flat', 1)));
  return w;
}
function skill(w: World, monster = 'zombie', duration = 7) {
  const inst = makeSkillInstance({ ...SKILLS.shambler_horde, requirements: undefined,
    delivery: { type: 'summon', monsterId: monster, count: 1, maxActive: 30, duration }, useTime: 0, cooldown: 0, manaCost: 0 }, 1, 3);
  inst.devGift = true;
  w.meta.knownSkills.set(inst.def.id, inst); w.player.skills[0] = inst;
  return inst;
}
function birth(w: World, inst: SkillInstance) {
  const before = new Set(w.actors);
  assert(w.executeSkill(w.player, inst, w.player.pos, { noRepeat: true, noCooldown: true }));
  const body = w.actors.find(a => !before.has(a) && a.owner === w.player && !a.summonPactReward);
  assert(body); return body;
}
const rewards = (w: World, id: string) => w.actors.filter(a => !a.dead && a.owner === w.player && a.summonPactReward === id);
function tick(w: World, seconds: number) { w.time += seconds; w.summonPacts.update(seconds); }
function play(w: World, seconds: number) { for (let i = 0; i < Math.ceil(seconds / 0.05); i++) w.update(0.05); }

try {
  check('Gravebinder is a Necromancer calling, retaining Summoner access and gated foreign access', () => {
    assert.equal(VOCATIONS.gravebinder.classId, 'necromancer');
    assert(vocationOwnClass(VOCATIONS.gravebinder, 'summoner'));
    assert(!vocationOwnClass(VOCATIONS.gravebinder, 'warrior'));
    assert.equal(PASSIVE_NODES.voc_gravebinder_n1.choice?.group, 'gravebinder_wraith');
  });
  {
    const w = setup();
    check('real vocation allocation spends the separate pool and enforces Wraith parent and choice', () => {
      assert(w.grantVocation('gravebinder')); w.meta.vocationPoints = 10;
      assert(!w.allocateNode('voc_gravebinder_n1', w.localSeat, 'rime'));
      assert(w.allocateNode('voc_gravebinder_s1'));
      assert(!w.allocateNode('voc_gravebinder_n1'));
      assert(w.allocateNode('voc_gravebinder_n1', w.localSeat, 'rime'));
      assert.equal(w.meta.vocationPoints, 8);
      assert(!w.allocateNode('voc_gravebinder_n1', w.localSeat, 'dirge'));
    });
    check('choice survives normal meta serialization and rebuilding', () => {
      const wire = serializeSeatMeta(w.localSeat);
      w.meta.choices = {}; applySeatMeta(w, w.localSeat, wire);
      assert.equal(w.player.sheet.get('summonPactForm_rime'), 1);
    });
    const inst = skill(w);
    check('six actual temporary deaths create one selected Rime Wraith with attribution', () => {
      for (let i = 0; i < 6; i++) w.kill(birth(w, inst));
      const bodies = rewards(w, 'last_breath'); assert.equal(bodies.length, 1);
      assert.equal(bodies[0].sourceSkillId, 'pact_wraith');
      assert(bodies[0].skills.some(s => s?.def.id === 'skeletal_cold_bolt'));
      assert(!bodies[0].skills.some(s => s?.def.id === 'venom_bolt'));
      assert(bodies[0].lifespan > 0);
    });
    check('replacement, dismissal and reward deaths cannot feed a summon loop', () => {
      for (let i = 0; i < 6; i++) w.kill(birth(w, inst), true);
      w.kill(rewards(w, 'last_breath')[0]);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'last_breath')?.bank, 0);
      assert.equal(rewards(w, 'last_breath').length, 0);
    });
    check('permanent deaths do not fill the temporary soul bank', () => {
      const permanent = skill(w, 'zombie', 0);
      for (let i = 0; i < 6; i++) w.kill(birth(w, permanent));
      assert.equal(rewards(w, 'last_breath').length, 0);
    });
    check('natural expiry fills the soul bank through the real world update', () => {
      const temporary = skill(w, 'zombie', 0.01);
      for (let i = 0; i < 6; i++) birth(w, temporary);
      w.update(0.05);
      assert.equal(rewards(w, 'last_breath').length, 1);
    });
    check('reward capacity preserves at most one full pending bank and never evicts a Wraith', () => {
      for (let i = 0; i < 30; i++) w.kill(birth(w, inst));
      assert.equal(rewards(w, 'last_breath').length, 2);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'last_breath')?.bank, 6);
      w.kill(rewards(w, 'last_breath')[0]); tick(w, 0.01);
      assert.equal(rewards(w, 'last_breath').length, 2);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'last_breath')?.bank, 0);
    });
  }
  {
    const w = setup('last_breath', 'burial_ground'), inst = skill(w);
    check('death banks belong to the immediate owner, not another seat or summoner', () => {
      const body = birth(w, inst); body.owner = w.createMonster('zombie', 1, 'player');
      w.kill(body); assert.equal(w.summonPacts.view(w.player).length, 0);
    });
    check('nearby deaths build a fixed graveyard with a threshold and timed outbreak', () => {
      for (let i = 0; i < 4; i++) { const body = birth(w, inst); body.pos = { ...w.player.pos }; w.kill(body); }
      tick(w, 0.01); assert.equal(rewards(w, 'burial_ground').length, 0);
      const fifth = birth(w, inst); fifth.pos = { ...w.player.pos }; w.kill(fifth);
      tick(w, 0.01); assert.equal(rewards(w, 'burial_ground').length, 1);
      for (let i = 0; i < 3; i++) tick(w, 1.51);
      assert.equal(rewards(w, 'burial_ground').length, 4);
      tick(w, 1.51);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'burial_ground')?.graves.length, 0);
    });
    check('expiry, remote deaths and another floor do not charge graveyards', () => {
      const far = birth(w, inst); far.pos.x += 900; w.kill(far);
      const otherFloor = birth(w, inst); otherFloor.tier = w.player.tier + 1; w.kill(otherFloor);
      const expired = birth(w, inst); w.kill(expired, true, undefined, 'expire');
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'burial_ground')?.graves.length, 0);
    });
    check('Undying Loyalty contributes once on final passing and remembers a slain origin', () => {
      const body = birth(w, inst); body.pos = { ...w.player.pos }; body.undyingTime = 0.05;
      w.kill(body); assert(!body.dead);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'burial_ground')?.graves.length, 0);
      w.update(0.1); assert(body.dead);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'burial_ground')?.graves[0].count, 1);
      w.kill(body); assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'burial_ground')?.graves[0].count, 1);
    });
    check('an expiry with death effects and Undying retains its natural cause', () => {
      const before = w.summonPacts.view(w.player).find(s => s.id === 'burial_ground')?.graves[0].count;
      const body = birth(w, skill(w, 'zombie', 0.01));
      body.undyingTime = 0.1; body.expiryTriggersDeath = true;
      play(w, 0.3); assert(body.dead);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'burial_ground')?.graves[0].count, before);
    });
  }
  {
    const w = setup('undead_resonance'), inst = skill(w, 'skeletal_cryomancer');
    inst.sockets[0] = { def: SUPPORTS.splitting, level: 1 };
    deriveSummonPactSupports(w.player, inst);
    check('innate Resonance opens ordinary crew costs and forwards compatible gems to undead', () => {
      assert(crewBoardingOpen(inst));
      const body = birth(w, inst);
      assert(body.skills.some(s => s?.sockets.some(g => g?.def.id === 'splitting' && g.forwarded)));
    });
    check('respec removes native admission from living minions without removing socketed gems', () => {
      w.player.sheet.removeSource('pact-check'); w.recalcPlayer();
      assert(!crewBoardingOpen(inst));
      assert(w.actors.filter(a => a.owner === w.player).every(a => a.skills.every(s => !s?.sockets.some(g => g?.forwarded))));
      assert.equal(inst.sockets[0]?.def.id, 'splitting');
      inst.sockets[1] = { def: SUPPORTS.resonance, level: 1 }; w.resyncMinionSupports(inst);
      assert(w.actors.some(a => a.owner === w.player && a.skills.some(s => s?.sockets.some(g => g?.def.id === 'splitting' && g.forwarded))));
    });
    check('mixed pools enforce innate faction admission on each actual body', () => {
      inst.nativeCrewFactions = ['undead']; inst.sockets[1] = null;
      assert(crewBoardingOpen(inst, 'undead')); assert(!crewBoardingOpen(inst, 'beast'));
    });
  }
  {
    const w = setup('open_invitation', 'last_breath', 'undead_resonance'), inst = skill(w);
    const guest = makeSkillInstance(SKILLS.summon_skeleton_archer, 20, 2); guest.devGift = true;
    w.meta.knownSkills.set(guest.def.id, guest);
    guest.sockets[0] = { def: SUPPORTS.resonance, level: 1 }; guest.sockets[1] = { def: SUPPORTS.splitting, level: 1 };
    check('an off-bar learned summon supplies exactly one temporary guest with its own supports', () => {
      const mana = w.player.reservedMana; birth(w, inst);
      const bodies = rewards(w, 'open_invitation'); assert.equal(bodies.length, 1);
      assert.equal(bodies[0].summonInst, guest); assert.equal(w.player.reservedMana, mana);
      assert(bodies[0].skills.some(s => s?.sockets.some(g => g?.def.id === 'splitting')));
    });
    check('an off-bar guest survives normal anchor cleanup and expires on its own clock', () => {
      const body = rewards(w, 'open_invitation')[0];
      play(w, 0.6); assert(!body.dead);
      play(w, body.lifespan + 0.1); assert(body.dead);
      // Begin the following capacity scenario with a fresh guest.
      birth(w, inst); assert.equal(rewards(w, 'open_invitation').length, 1);
    });
    check('batch births, recursive guests and capacity cannot create an unbounded army', () => {
      for (let i = 0; i < 10; i++) birth(w, inst);
      assert.equal(rewards(w, 'open_invitation').length, 1);
      for (let i = 0; i < 10; i++) { tick(w, 1.1); birth(w, inst); }
      assert.equal(rewards(w, 'open_invitation').length, 3);
      const before = w.summonPacts.view(w.player).find(s => s.id === 'last_breath')?.bank ?? 0;
      for (const body of rewards(w, 'open_invitation')) w.kill(body);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'last_breath')?.bank ?? 0, before);
    });
    check('removing a grant clears its active state and owned bonus bodies', () => {
      tick(w, 1.1); birth(w, inst); assert(rewards(w, 'open_invitation').length);
      w.player.sheet.removeSource('pact-check'); w.recalcPlayer();
      assert.equal(w.summonPacts.view(w.player).length, 0);
      assert.equal(rewards(w, 'open_invitation').length, 0);
    });
  }
  {
    const w = setup('open_invitation', 'undead_resonance'), inst = skill(w);
    const guest = makeSkillInstance(SKILLS.summon_skeleton_archer, 20, 1); guest.devGift = true;
    guest.sockets[0] = { def: SUPPORTS.splitting, level: 1 }; w.meta.knownSkills.set(guest.def.id, guest);
    check('Resonance refunds also refresh living guests whose learned source is off the bar', () => {
      birth(w, inst); const body = rewards(w, 'open_invitation')[0]; assert(body);
      assert(body.skills.some(s => s?.sockets.some(g => g?.forwarded && g.def.id === 'splitting')));
      w.player.sheet.setSource('pact-check', [mod('summonPact_open_invitation', 'flat', 1)]); w.recalcPlayer();
      assert(!body.dead);
      assert(body.skills.every(s => !s?.sockets.some(g => g?.forwarded)));
    });
    check('owner death cancels the owner-scoped state and retires guests', () => {
      w.kill(w.player);
      assert.equal(w.summonPacts.view(w.player).length, 0);
      assert.equal(rewards(w, 'open_invitation').length, 0);
    });
  }
  {
    const w = setup('patchwork');
    check('safe zones do not generate body parts', () => { tick(w, 60); assert.equal(w.summonPacts.view(w.player)[0].parts.length, 0); });
    w.zone = { ...w.zone, objective: { kind: 'clear' } };
    check('parts surface at bounded walkable positions and expire without collection', () => {
      for (let i = 0; i < 12; i++) tick(w, 4.6);
      const parts = w.summonPacts.view(w.player)[0].parts;
      assert(parts.length > 0 && parts.length <= 10);
      assert(parts.every(p => Math.hypot(p.pos.x - w.player.pos.x, p.pos.y - w.player.pos.y) >= 90));
    });
    const chosen: string[] = [];
    check('walking over five chosen parts builds one temporary construct with attributable ingredients', () => {
      for (let i = 0; i < 5; i++) {
        let p = w.summonPacts.view(w.player)[0].parts[0];
        if (!p) { tick(w, 4.6); p = w.summonPacts.view(w.player)[0].parts[0]; }
        assert(p); chosen.push(p.id); w.player.pos = { ...p.pos }; tick(w, 0.01);
      }
      const bodies = rewards(w, 'patchwork'); assert.equal(bodies.length, 1);
      assert.deepEqual(bodies[0].summonPactParts?.slice().sort(), chosen.sort());
      assert.equal(bodies[0].sourceSkillId, 'pact_construct'); assert(bodies[0].lifespan > 0);
      assert(bodies[0].sheet.hasSource('summon:crew'));
    });
    check('an assembled construct survives ordinary updates and its complete configured lifetime', () => {
      const body = rewards(w, 'patchwork')[0];
      play(w, 0.6); assert(!body.dead);
      play(w, body.lifespan + 0.1); assert(body.dead);
    });
    check('paint snapshots clone actual banks, body-part shapes and graveyard progress', () => {
      tick(w, 0.01); const snap = serializeSnapshot(w, 1);
      const cue = snap.flashes.find(f => f.summonPactCue?.kind === 'assembly'); assert(cue);
      const source = w.flashes.find(f => f.summonPactCue?.kind === 'assembly')!;
      assert.notEqual(cue.summonPactCue, source.summonPactCue);
      assert.notEqual(cue.summonPactCue!.parts, source.summonPactCue!.parts);
      const client = setup(); applySnapshot(client, snap);
      assert(client.flashes.some(f => f.summonPactCue?.kind === 'assembly'));
    });
    check('zone departure retires bonuses and clears every transient bank, part and site', () => {
      w.loadZone('sim_arena'); assert.equal(w.summonPacts.view(w.player).length, 0);
      assert.equal(rewards(w, 'patchwork').length, 0);
    });
  }
  {
    const w = setup('last_breath', 'burial_ground'), inst = skill(w);
    check('Blood Toll consumes a temporary minion and records one attributed pact contribution', () => {
      const body = birth(w, inst); body.pos = { ...w.player.pos };
      const cast = makeSkillInstance({ ...SKILLS.firebolt, requirements: undefined, useTime: 0, cooldown: 0, manaCost: 0 }, 1, 1);
      cast.devGift = true; cast.sockets[0] = { def: SUPPORTS.blood_toll, level: 1 }; w.player.skills[1] = cast;
      assert(w.executeSkill(w.player, cast, { x: w.player.pos.x + 100, y: w.player.pos.y }, { noCooldown: true }));
      assert(body.dead);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'last_breath')?.bank, 1);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'burial_ground')?.graves[0].count, 1);
      w.summonPacts.clear();
    });
    check('Wraiths and graveyard zombies survive normal updates, then retire by duration', () => {
      for (let i = 0; i < 6; i++) { const body = birth(w, inst); body.pos = { ...w.player.pos }; w.kill(body); }
      play(w, 0.6);
      const wraith = rewards(w, 'last_breath')[0], zombie = rewards(w, 'burial_ground')[0];
      assert(wraith && zombie);
      play(w, zombie.lifespan + 0.1); assert(zombie.dead); assert(!wraith.dead);
      play(w, wraith.lifespan + 0.1); assert(wraith.dead);
      assert.equal(w.summonPacts.view(w.player).find(s => s.id === 'last_breath')?.bank, 0);
    });
  }
  check('all pact definitions have bounded positive thresholds, cadences and capacities', () => {
    for (const p of SUMMON_PACTS) {
      assert(SKILLS[p.reward.skill]); assert(p.reward.duration > 0 && p.reward.maxActive > 0);
      if (p.kind === 'deathBank' || p.kind === 'graveyard') assert(p.threshold > 1);
      if (p.kind === 'assembly') assert(p.required === 5 && p.interval[0] > 0 && p.maxParts >= p.required);
    }
  });
  console.log(`PASS Gravebinder: ${checks} real-engine checks`);
} finally { restore(); }
