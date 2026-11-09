import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { VOCATIONS } from '../src/data/vocations';
import { MINION_FAMILIES } from '../src/data/minionFamilies';
import { BATTLE_DOCTRINES, MINION_TRANSMUTATIONS } from '../src/data/battleDoctrines';
import { LOOKS } from '../src/data/looks';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { mod, gaugeMod, gaugeGateMod, STAT_DEFS } from '../src/engine/stats';
import { serializeSeatMeta, applySeatMeta, serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let checks = 0;
function check(name: string, run: () => void) { run(); checks++; console.log('PASS ' + name); }
const close = (a: number, b: number) => assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const restore = seedGlobalRandom(58149);
function rig(vocation: string) {
  const w = makeSimWorld(VOCATIONS[vocation].classId, 58149), p = w.player;
  w.walk = null; w.doodads = []; w.markDoodadsChanged(); w.actors = [p]; p.pos = { x: 700, y: 700 };
  if (vocation !== 'packwarden') { p.skills.fill(null); w.meta.knownSkills.clear(); } p.invulnerable = true;
  assert(w.grantVocation(vocation)); w.meta.vocationPoints = 30;
  return { w, p, take: (id: string, choice?: string) => assert(w.allocateNode(`voc_${vocation}_${id}`, w.localSeat, choice)) };
}
function summon(w: World, id = 'skeleton_warrior') {
  const inst = makeSkillInstance({ ...SKILLS.summon_skeleton, requirements: undefined, manaCost: 0, useTime: 0, cooldown: 0,
    delivery: { type: 'summon', monsterId: id, count: 1, maxActive: 100, duration: 60 } }, 1, 3);
  inst.devGift = true; w.player.skills[0] = inst; w.meta.knownSkills.set(inst.def.id, inst);
  const before = new Set(w.actors); assert(w.executeSkill(w.player, inst, w.player.pos, { noRepeat: true, noCooldown: true }));
  const body = w.actors.find(a => !before.has(a) && a.owner === w.player)!; assert(body, id); body.pos = { x: 750, y: 700 };
  return { body, inst };
}
function enemy(w: World) {
  const b = w.createMonster('zombie', 1, 'enemy'); b.pos = { x: 800, y: 700 }; b.tier = w.player.tier;
  b.sheet.setSource('test', [mod('life', 'override', 10000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  b.fillResources(); b.spawnedAt = -10; w.actors.push(b); return b;
}
function action(w: World, id: string) {
  const inst = w.localSeat.grantedInsts?.get(BATTLE_DOCTRINES.find(d => d.id === id)!.skill); assert(inst); return inst;
}
function cast(w: World, inst: SkillInstance, x = 880) { assert(w.executeSkill(w.player, inst, { x, y: 700 }, { noCooldown: true })); }
function tick(w: World, dt = .4) { w.time += dt; w.battleDoctrines.update(); }
function play(w: World, seconds: number) { for (let i = 0; i < Math.ceil(seconds / .05); i++) w.update(.05); }
const bank = (w: World, id: string) => w.battleDoctrines.view(w.player).find(s => s.id === id)?.bank ?? 0;
const aid = (id: string, p: Actor) => `doctrine:${id}:${p.id}`;

try {
  check('authored doctrines reference real grants, payloads, bodies, forms and personal channels', () => {
    for (const d of BATTLE_DOCTRINES) {
      assert(STAT_DEFS[d.stat] && SKILLS[d.skill].doctrine === d.id);
      assert(d.forms.length >= 2 && d.radius > 0 && d.duration > 0);
      for (const f of d.forms) { assert(f.stat && STAT_DEFS[f.stat]); if (f.payload) assert(SKILLS[f.payload]); }
      for (const t of d.traits ?? []) for (const m of [...(t.mods ?? []), ...(t.shelter?.mods ?? [])]) assert(STAT_DEFS[m.stat], m.stat);
    }
    for (const d of MINION_TRANSMUTATIONS) { for (const s of d.personalStats) assert(STAT_DEFS[s], s); for (const look of Object.values(d.looks)) assert(LOOKS[look]); }
    for (const body of MINION_FAMILIES.skeleton) assert(MONSTERS[body], body);
    for (const body of Object.keys(MONSTERS).filter(id => /^(skeletal_|skeleton_)/.test(id))) assert((MINION_FAMILIES.skeleton as readonly string[]).includes(body), body + ' needs family membership');
  });
  for (const vocation of ['swarmlord', 'packwarden', 'warbringer', 'stonewrought', 'greenwarden']) {
    check(vocation + ' allocates a real granted action and persists its specialization', () => {
      const { w, take } = rig(vocation); take('s1'); take('n1', '1');
      assert.equal(w.meta.vocationPoints, 28); assert(w.localSeat.grantedInsts?.size);
      const wire = serializeSeatMeta(w.localSeat); w.meta.choices = {}; applySeatMeta(w, w.localSeat, wire);
      assert.deepEqual(w.meta.choices[`voc_${vocation}_n1`], ['1']);
      for (const id of ['s2', 's3', 'n2', 'n3', 'n4', 'k1']) take(id);
      if (vocation === 'greenwarden') take('n5');
    });
  }
  {
    const { w, p, take } = rig('warbringer'); take('s1'); const call = action(w, 'breach');
    check('empty Breach refuses a real press without paying mana or cooldown', () => {
      const mana = p.mana; assert(!w.useSkill(p, call, { x: 800, y: 700 })); close(p.mana, mana); assert(!p.cooldowns.get(call.def.id));
    });
    check('real nearby kills bank Breach with cadence and capacity limits', () => {
      for (let i = 0; i < 12; i++) { w.kill(enemy(w), false, p); tick(w); } assert.equal(bank(w, 'breach'), 4);
    });
    take('n1', '0'); take('k1');
    // Changing the doctrine clears any old bank; earn a fresh one.
    w.kill(enemy(w), false, p); tick(w);
    check('a directed release spends one bank, hits an enemy and schedules one attributed echo', () => {
      const target = enemy(w), before = target.life; cast(w, call);
      assert.equal(bank(w, 'breach'), 0); assert(target.life < before); assert.equal(w.pendingRepeats.filter(r => r.inst.hostSkillId === call.def.id).length, 1);
      assert(!p.buffs.has(aid('breach', p)), 'released power must not also become a second damage multiplier');
    });
    check('revoking a grant removes its pending echo and stored state', () => {
      w.meta.allocated.delete('voc_warbringer_s1'); w.recalcSeat(w.localSeat);
      assert(!w.pendingRepeats.some(r => r.inst.hostSkillId === call.def.id)); assert(!w.battleDoctrines.view(p).length);
    });
  }
  {
    const { w, p, take } = rig('swarmlord'); take('s1'); take('s2'); take('n2'); take('n1', '1');
    const a = summon(w, 'swarmling'), b = summon(w, 'swarmling'), call = action(w, 'swarm'), target = enemy(w);
    const attack = makeSkillInstance(SKILLS.claw);
    check('one contributor cannot build chorus; alternating contributors do', () => {
      for (let i = 0; i < 3; i++) { w.battleDoctrines.hit(a.body, attack, target, false); tick(w); }
      assert.equal(bank(w, 'swarm'), 0); w.battleDoctrines.hit(b.body, attack, target, false); assert.equal(bank(w, 'swarm'), 1);
    });
    const priorPly = a.body.plies; a.body.life = a.body.maxLife() * .2;
    check('Shell orders own allies to distinct positions, spending a real ply for healing', () => {
      cast(w, call); assert.equal(bank(w, 'swarm'), 0); assert.equal(a.body.aiCommand?.kind, 'guard');
      assert.notDeepEqual(a.body.aiCommand?.pos, b.body.aiCommand?.pos); assert.equal(a.body.plies, priorPly - 1);
      close(a.body.life / a.body.maxLife(), .45); assert(a.body.sheet.get('attackSpeed') > 1); assert(a.body.sheet.get('damageTaken') < 1);
    });
    check('an empty shell cannot repeatedly heal; foreign minions are untouched', () => {
      a.body.plies = 0; const life = a.body.life; const foreign = w.createMonster('swarmling', 1, 'player'); w.actors.push(foreign);
      cast(w, call); close(a.body.life, life); assert(!foreign.aiCommand);
    });
    check('refund cancels owned formation effects without erasing a later manual command', () => {
      const manual = { kind: 'guard', pos: { x: 700, y: 700 }, until: w.time + 10 }; b.body.aiCommand = manual;
      w.meta.allocated.delete('voc_swarmlord_s1'); w.recalcSeat(w.localSeat);
      assert(!a.body.aiCommand); assert.equal(b.body.aiCommand, manual); assert(!a.body.buffs.has(aid('swarm', p)));
    });
  }
  {
    const { w, p, take } = rig('packwarden'); w.grantStartingCompanions(); const pet = w.actors.find(a => a.companion)!; assert(pet);
    take('s1'); take('n1', '2'); take('n3'); take('k1'); const call = action(w, 'pack');
    pet.pos = { x: 740, y: 700 }; pet.life = pet.maxLife() * .2; p.life = p.maxLife() * .2;
    check('Flank and One Body apply the selected attack mutator and recovery to keeper and companion', () => {
      cast(w, call); close(pet.life / pet.maxLife(), .32); close(p.life / p.maxLife(), .32);
      close(pet.sheet.get('apply_vulnerable'), .5); close(p.sheet.get('apply_vulnerable'), .5); assert(pet.aiCommand);
    });
    check('downed companions cannot receive orders or pay cooperative credit', () => {
      pet.downed = true; assert(w.battleDoctrines.refusal(p, call)); pet.downed = false;
    });
    check('a real granted-skill press pays mana and cooldown and preserves the aimed formation point', () => {
      p.skills[1] = call; p.mana = p.maxMana(); const mana = p.mana;
      assert(w.useSkill(p, call, { x: 1000, y: 700 }, true)); play(w, .4);
      assert(p.mana < mana); assert((p.cooldowns.get(call.def.id) ?? 0) > 0);
      assert((pet.aiCommand?.pos.x ?? 0) > 1000, 'self-delivery must retain the aimed order point');
    });
    check('travel cleanup removes commands and lingering formation buffs', () => {
      w.battleDoctrines.clear(); assert(!pet.aiCommand); assert(!p.buffs.has(aid('pack', p))); assert(!pet.buffs.has(aid('pack', p)));
    });
  }
  for (const [vocation, id, kind] of [['stonewrought', 'quarry', 'stone_cairns'], ['greenwarden', 'grove', 'sapling_ring']]) {
    const { w, p, take } = rig(vocation); take('s1'); const call = action(w, id);
    check(vocation + ' refuses harvesting before actual mature growth exists', () => assert(w.battleDoctrines.refusal(p, call)));
    play(w, 7); const grown = w.doctrineGrowths(p, kind); assert(grown.length, kind);
    check(vocation + ' grows real owned terrain and harvests only mature growth', () => {
      assert(grown.every(g => g.d.tier === p.tier)); const mature = grown.filter(g => g.maxTtl - g.ttl >= 2).slice(0, BATTLE_DOCTRINES.find(d => d.id === id)!.growth!.maximum);
      assert(mature.length); cast(w, call); assert(mature.every(g => g.ttl === 0 && g.d.gone));
      assert(w.flashes.some(f => f.doctrineCue?.kind === 'harvest'));
    });
    take('n1', id === 'grove' ? '2' : '1'); play(w, 7);
    check(vocation + ' relocation preserves lifetime and leaves natural terrain intact', () => {
      const mature = w.doctrineGrowths(p, kind).filter(g => g.maxTtl - g.ttl >= 2).slice(0, BATTLE_DOCTRINES.find(d => d.id === id)!.growth!.maximum);
      const before = mature.map(g => ({ pos: { ...g.d.pos }, ttl: g.ttl })); assert(mature.length);
      const natural = { kind: 'tree' as const, pos: { x: 900, y: 750 }, radius: 15, rot: 0 }; w.doodads.push(natural);
      cast(w, call); for (const [i, g] of mature.entries()) { close(g.ttl, before[i].ttl); assert.notDeepEqual(g.d.pos, before[i].pos); }
      assert(w.doodads.includes(natural)); assert.equal(natural.pos.x, 900);
    });
  }
  {
    const { w, p, take } = rig('greenwarden');
    p.sheet.setSource('test:personal', [mod('damage', 'increased', 1), mod('lifeRegen', 'flat', 7), mod('addedFire', 'flat', 9), mod('damage', 'increased', 2, ['cold']), gaugeMod('critMulti', 'flat', .1, 'test:charge')]);
    p.sheet.setGauges([['test:charge', 3]]);
    p.sheet.setSource('test:minions', [mod('minionDamage', 'increased', 6), mod('minionRegen', 'flat', 90)]);
    const { body, inst } = summon(w), original = body.look;
    const normal = body.sheet.get('damage'); take('s3');
    check('existing skeleton becomes Sylvan with personal investment and no minion double counting', () => {
      assert.equal(body.faction, 'sylvan'); assert.equal(body.look, 'sylvan_boneblade'); assert(body.name.startsWith('Sylvan'));
      assert(body.sheet.get('damage') < normal); assert(body.sheet.get('lifeRegen') >= 7 && body.sheet.get('lifeRegen') < 20); close(body.sheet.get('addedFire'), 9);
      assert(body.sheet.getSourceMods('transmute:sylvan:test:personal')?.some(m => m.stat === 'damage'));
      assert(!body.sheet.getSourceMods('owner')?.some(m => m.stat === 'lifeRegen' && m.value >= 90)); assert.equal(body.summonInst, inst);
    });
    check('skill filters and owner gauges retain their meaning on the recipient', () => {
      assert(body.sheet.get('damage', new Set(['cold'])) > body.sheet.get('damage', new Set(['fire'])));
      close(body.sheet.getSourceMods('transmute:sylvan:test:personal')!.find(m => m.stat === 'critMulti')!.value, .3);
    });
    check('nested skeleton summons inherit the granting keeper and preserve their own skill investment', () => {
      const nested = w['spawnMinion'](body, inst)!; assert(nested); assert.equal(nested.faction, 'sylvan');
      assert(nested.sheet.getSourceMods('transmute:sylvan:test:personal')?.some(m => m.stat === 'addedFire' && m.value === 9));
      const tuned = makeSkillInstance({ ...inst.def, innateMods: [mod('minionLife', 'increased', .8)] });
      const ordinary = w['spawnMinion'](p, inst)!, strengthened = w['spawnMinion'](p, tuned)!;
      assert(strengthened.maxLife() > ordinary.maxLife(), 'summon-local investment must survive the rewrite');
    });
    check('shared buffs are inherited once and inactive gated overrides stay absent', () => {
      const before = body.sheet.get('damage');
      const shared = { type: 'buff' as const, id: 'test:shared', label: 'Shared', duration: 5, mods: [mod('damage', 'more', .4)] };
      p.addBuff(shared); body.addBuff(shared);
      p.sheet.setSource('test:gate', [gaugeGateMod('life', 'override', 999, 'test:locked', 5)]);
      w.battleDoctrines.reconcile(p); close(body.sheet.get('damage'), before * 1.4);
      assert(!body.sheet.getSourceMods('transmute:sylvan:test:gate'));
      p.removeBuff(shared.id); body.removeBuff(shared.id); p.sheet.removeSource('test:gate'); w.battleDoctrines.reconcile(p);
    });
    check('live personal changes propagate without healing wounds or duplicating sources', () => {
      body.life = 5; const count = body.sheet.sourceNames().length;
      for (let i = 0; i < 4; i++) tick(w); close(body.life, 5); assert.equal(body.sheet.sourceNames().length, count);
      const regen = body.sheet.get('lifeRegen');
      p.sheet.setSource('test:personal', [mod('lifeRegen', 'flat', 13)]); tick(w); close(body.sheet.get('lifeRegen'), regen + 6);
    });
    check('every registered skeleton family body is converted; an unrelated zombie stays undead', () => {
      for (const id of MINION_FAMILIES.skeleton) { const b = summon(w, id).body; assert.equal(b.faction, 'sylvan', id); assert(b.transmutation); }
      assert.equal(summon(w, 'zombie').body.faction, 'undead');
    });
    check('peers receive the changed body identity and doctrine receipts', () => {
      w.flashes.push({ pos: { ...p.pos }, radius: 30, color: '#fff', life: 1, maxLife: 1, fx: 'battle_doctrine', doctrineCue: { kind: 'order', count: 3, max: 3, formation: 'wedge' } });
      const wire = serializeSnapshot(w, 1), peer = makeSimWorld('ranger', 58149); applySnapshot(peer, wire);
      const b = peer.actors.find(a => a.name === body.name); assert(b); assert.equal(b.look, body.look);
      assert.deepEqual(peer.flashes.find(f => f.doctrineCue)?.doctrineCue, w.flashes.find(f => f.doctrineCue)?.doctrineCue);
    });
    check('refunding Sylvan Rebirth restores identity and ordinary minion inheritance', () => {
      w.meta.allocated.delete('voc_greenwarden_s3'); w.recalcSeat(w.localSeat);
      assert.equal(body.faction, 'undead'); assert.equal(body.look, original); assert(!body.transmutation);
      assert(!body.sheet.sourceNames().some(s => s.startsWith('transmute:'))); close(body.sheet.get('damage'), normal);
    });
  }
  console.log(`PASS ${checks} vocation mutation checks`);
} finally { restore(); }
