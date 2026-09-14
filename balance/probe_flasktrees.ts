import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { FLASK_TREES } from '../src/data/flaskTrees';
import { CLASSES } from '../src/data/classes';
import { SUPPORTS } from '../src/data/supports';
import { LEDGER_FLASK_LESSON } from '../src/meta/account';
import { serializeCharacter, rebuildSkill, applySavedCharacter } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta, serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { treeGraph } from '../src/engine/skilltree';
import { makeSkillInstance, instanceMods, instanceEffects, instanceChargeCost, instanceChargeGain, instanceFollowUps, skillContextTags, type SkillInstance } from '../src/engine/skills';
import { mod, STAT_DEFS } from '../src/engine/stats';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { mkdirSync, writeFileSync } from 'node:fs';

let failed = 0, passed = 0;
function check(name: string, ok: boolean, detail = '') { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); ok ? passed++ : failed++; }
const near = (a: number, b: number, eps = 1e-5) => Math.abs(a - b) < eps;
const json = (x: unknown) => JSON.stringify(x);
function setup(id: string, nodes: string[] = [], level = 20) {
  const w = makeSimWorld('warrior', 0xf1a5c), p = w.player;
  const inst = makeSkillInstance(SKILLS[id], level, 3);
  p.skills.fill(null); p.skills[0] = inst; w.meta.knownSkills.clear(); w.meta.knownSkills.set(id, inst);
  for (const nid of nodes) w.pickTreeNode(id, nid);
  p.sheet.setSource('rig', [mod('life', 'flat', 10000), mod('mana', 'flat', 10000), mod('poise', 'flat', 100), mod('energyShield', 'flat', 100),
    mod('lifeRegen', 'override', 0), mod('manaRegen', 'override', 0), mod('critChance', 'override', 0)]);
  p.fillResources(); p.life /= 2; p.mana /= 2; p.poise = 0; p.es = 0;
  const cost = instanceChargeCost(inst)!; p.charges.set(cost.charge, 20);
  return { w, p, inst };
}
function step(w: World, seconds: number, dt = 1 / 60) { for (let i = 0; i < Math.round(seconds / dt); i++) w.update(dt); }
function target(w: World, x = 50, team: 'player' | 'enemy' = 'enemy') {
  const a = w.createMonster('plains_wolf', 1, team); a.skills = []; a.pos = { x: w.player.pos.x + x, y: w.player.pos.y }; a.tier = w.player.tier;
  a.sheet.setSource('dummy', [mod('life', 'flat', 100000), mod('moveSpeed', 'override', 0), mod('lifeRegen', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('armor', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
function reset(w: World, inst: SkillInstance) { w.fonts.push({ pos: { ...w.player.pos } }); w.meta.abilityEssences.ability4 = 999; return w.fontResetTree(inst.def.id); }
function path(id: string, nid: string): string[] { const gn = treeGraph(SKILLS[id])!.nodes.get(nid)!; return [...(gn.links.length ? path(id, gn.links[0]) : []), nid]; }
function stat(p: Actor, inst: SkillInstance, key: string) { return p.sheet.get(key, skillContextTags(inst), instanceMods(inst)); }
function drink(s: ReturnType<typeof setup>, aim = s.p.pos) { return s.w.useSkill(s.p, s.inst, aim); }

const restoreRandom = seedGlobalRandom(0xf1a5c);
try {
  // Every node, including leaves, is purchased through the real tree gate.
  // Each authored modifier is observed in the actual drink/buff/payload context;
  // branch-dependent payloads must exist and fire, not merely resolve to JSON.
  for (const id of Object.keys(FLASK_TREES)) {
    const g = treeGraph(SKILLS[id])!;
    check(id + ' anatomy', g.nodes.size === 23 && g.limbs.length === 3 && g.order.length === 23);
    for (const [nid, gn] of g.nodes) {
      const s = setup(id, path(id, nid));
      check(id + '/' + nid + ' real purchase', s.inst.treeNodes?.includes(nid) === true);
      const foe = target(s.w), ally = target(s.w, 60, 'player');
      ally.life /= 2; s.p.applyStatus('poison', 1, 1, 'probe'); ally.applyStatus('poison', 1, 1, 'probe');
      const beforeCharge = s.p.charges.get(instanceChargeCost(s.inst)!.charge)!;
      const beforeLife = foe.life;
      const did = drink(s, foe.pos);
      check(nid + ' drink pays and resolves', did && s.p.charges.get(instanceChargeCost(s.inst)!.charge)! < beforeCharge);
      for (const m of gn.node.mods ?? []) {
        const prior = { ...s.inst, treeNodes: path(id, nid).slice(0, -1) };
        check(nid + ' changes resolved ' + m.stat, !!STAT_DEFS[m.stat] && Number.isFinite(stat(s.p, s.inst, m.stat))
          && !near(stat(s.p, s.inst, m.stat), stat(s.p, prior, m.stat)));
      }
      for (const patch of gn.node.buffs ?? []) {
        const buff = s.p.buffs.get(patch.id);
        check(nid + ' live buff ' + patch.id, !!buff && (patch.mods ?? []).every(m => buff.def.mods.some(v => v.stat === m.stat && v.value === m.value)));
      }
      for (const fx of gn.node.utilityEffects ?? []) {
        if (fx.type === 'ward') check(nid + ' real Ward', s.p.ward > 0);
        if (fx.type === 'cleanse') check(nid + ' real cleanse', !s.p.statuses.some(x => x.id === 'poison'));
        if (fx.type === 'restore') check(nid + ' real resource', fx.resource === 'poise' ? s.p.poise > 0 : s.p.es > 0);
      }
      const pending = [...s.w.pendingFollowUps];
      for (const fu of instanceFollowUps(s.inst)) check(nid + ' queued ' + fu.skillId, pending.some(p => p.inst.def.id === fu.skillId && p.caster === s.p && p.inst.followUpHost === s.inst));
      step(s.w, 1.5);
      if (pending.some(p => p.inst.def.baseDamage)) check(nid + ' damage reaches enemy', foe.life < beforeLife, `${(beforeLife - foe.life).toFixed(2)}`);
      const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(x => x.skillId === id)!);
      check(nid + ' save roundtrip', !!saved && json(instanceEffects(saved)) === json(instanceEffects(s.inst)) && json(instanceChargeGain(saved)) === json(instanceChargeGain(s.inst)) && json(instanceFollowUps(saved)) === json(instanceFollowUps(s.inst)));
      const wire = setup(id); applySeatMeta(wire.w, wire.w.localSeat, serializeSeatMeta(s.w.localSeat));
      const wired = wire.w.meta.knownSkills.get(id)!;
      check(nid + ' network roundtrip', json(instanceMods(wired)) === json(instanceMods(s.inst)) && json(instanceChargeCost(wired)) === json(instanceChargeCost(s.inst)));
      check(nid + ' respec', reset(s.w, s.inst) && !s.inst.treeNodes?.length && !s.w.pendingFollowUps.some(p => p.inst.followUpHost === s.inst)
        && !s.w.zones.some(z => z.inst.followUpHost === s.inst) && !s.w.projectiles.some(p => p.inst.followUpHost === s.inst));
    }
  }

  // Native base drinking remains safe, while offensive riders can use full pools.
  for (const id of Object.keys(FLASK_TREES)) {
    const g = treeGraph(SKILLS[id])!;
    for (const limb of g.limbs) {
      const branch = g.nodes.get(limb.id)!.children[0];
      const leaves = g.nodes.get(branch)!.children;
      const s = setup(id, [limb.id, branch, ...leaves]);
      check(id + '/' + branch + ' sibling leaves coexist at level 20', s.inst.treeNodes?.length === 4);
      drink(s); check(id + '/' + branch + ' four-point loadout resolves', instanceEffects(s.inst).length > 0);
    }
  }
  for (const id of ['life_flask', 'mana_flask']) {
    const s = setup(id, [], 1); s.p.fillResources(); const charge = instanceChargeCost(s.inst)!.charge;
    check(id + ' brimming spends nothing', !drink(s) && s.p.charges.get(charge) === 20 && !s.p.cooldowns.has(id));
  }
  for (const id of Object.keys(FLASK_TREES)) {
    const s = setup(id);
    const held = { inst: makeSkillInstance(SKILLS.firebolt), mode: 'cast', aim: { x: s.p.pos.x + 90, y: s.p.pos.y }, elapsed: 0.2, total: 2, held: true, baseMult: 1 } as Actor['casting'];
    s.p.casting = held; s.p.facing = 1.2; s.p.useLock = 0.6;
    const reflexDid = drink(s, { x: s.p.pos.x - 50, y: s.p.pos.y });
    check(id + ' reflex pierces without disturbing cast or facing', reflexDid
      && s.p.casting === held && s.p.facing === 1.2 && s.p.useLock === 0.6 && held!.elapsed === 0.2, json({ reflexDid, same: s.p.casting === held, facing: s.p.facing, lock: s.p.useLock, elapsed: held!.elapsed }));
    const bank = s.p.charges.get(instanceChargeCost(s.inst)!.charge);
    check(id + ' held repeat respects cooldown/reflex lock', !drink(s) && s.p.charges.get(instanceChargeCost(s.inst)!.charge) === bank);
  }
  // Timers have exact empty-bank starts at multiple update rates. Removing a
  // tree or its bar instance discards fractional progress, never refunds fuel.
  for (const id of Object.keys(FLASK_TREES)) for (const [nid, gn] of treeGraph(SKILLS[id])!.nodes) {
    for (const cg of gn.node.chargeGain ?? []) if (cg.on === 'second') for (const dt of [0.05, 1 / 60]) {
      const s = setup(id, path(id, nid)); s.p.charges.clear();
      step(s.w, cg.everySeconds! - 0.1, dt);
      check(nid + ` empty before deadline ${dt}`, !s.p.charges.get(cg.charge));
      step(s.w, 0.2, dt);
      check(nid + ` one charge at deadline ${dt}`, s.p.charges.get(cg.charge) === 1);
      s.p.charges.clear(); step(s.w, cg.everySeconds! / 2, dt); reset(s.w, s.inst); step(s.w, cg.everySeconds!, dt);
      check(nid + ' reset stops clock', !s.p.charges.get(cg.charge));
    }
  }
  {
    const s = setup('life_flask', ['red_cellar', 'red_cork', 'red_release']); s.p.fillResources();
    check('reserve prime banks without cleansing', drink(s) && s.p.primedPours.length === 1 && s.p.restoreStreams.length === 0);
    s.p.applyStatus('poison', 1, 1, 'probe');
    // Exercise the real delayed-pour release after a wound through engine seam.
    s.p.life -= 10; (s.w as any).releasePrimedPours(s.p);
    check('reserve prime releases cleanse and streams', !s.p.statuses.some(x => x.id === 'poison') && s.p.restoreStreams.length === 2);
  }
  {
    const s = setup('mana_flask', ['blue_lance']); s.p.fillResources();
    s.p.sheet.setSource('prime', [mod('pourPrime', 'flat', 1)]);
    const aim = { x: s.p.pos.x + 200, y: s.p.pos.y + 80 };
    check('offensive prime defers its rider', drink(s, aim) && !s.w.pendingFollowUps.length);
    s.p.life -= 5; (s.w as any).releasePrimedPours(s.p);
    check('offensive prime retains aim and exactly one rider', s.w.pendingFollowUps.length === 1 && json(s.w.pendingFollowUps[0].aim) === json(aim));
  }
  {
    const s = setup('life_flask', ['red_bloom']); s.p.charges.clear(); step(s.w, 2);
    s.w.bindSkill(0, null); step(s.w, 1); s.w.bindSkill(0, 'life_flask');
    step(s.w, 2.1); check('unseating discards partial tree clock', !s.p.charges.get('flask_life'));
    step(s.w, 2); check('reseating starts a fresh full clock', s.p.charges.get('flask_life') === 1);
    s.p.charges.set('flask_life', 1); drink(s); s.w.bindSkill(0, null);
    check('unseating cancels queued flask riders immediately', !s.w.pendingFollowUps.length);
  }
  {
    const s = setup('life_flask', ['red_bloom']); const foe = target(s.w);
    s.p.sheet.setSource('orbs', [mod('orbOnHit_life', 'flat', 100), mod('orbOnHit_mana', 'flat', 100)]);
    for (let i = 0; i < 20; i++) {
      s.p.cooldowns.clear(); s.p.reflexLock = 0; s.p.useLock = 0;
      s.p.charges.set('flask_life', 1); drink(s, foe.pos); step(s.w, 0.2);
    }
    check('twenty generated blooms never shed resource orbs', s.w.orbs.length === 0);
    const count = s.w.pendingFollowUps.length; step(s.w, 2);
    check('generated blooms never chain follow-ups', count === 0 && s.w.pendingFollowUps.length === 0);
  }
  {
    const s = setup('antidote_flask', ['green_company', 'green_circle', 'green_bless']);
    const other = target(s.w, 70, 'player'); const remote = makeSkillInstance(SKILLS.antidote_flask, 20);
    remote.treeNodes = ['green_company', 'green_circle', 'green_bless']; other.skills = [remote]; other.charges.set('flask_antidote', 2);
    s.w.useSkill(other, remote, other.pos); drink(s);
    check('two owners pay their own flask charge', other.charges.get('flask_antidote') === 1 && s.p.charges.get('flask_antidote') === 19);
    step(s.w, 0.2); reset(s.w, s.inst);
    // The most recent owner owns the shared blessing; reset removes its own
    // application rather than allowing the other owner's stale refresh to return.
    check('owner reset cancels only its pending casts', !s.w.pendingFollowUps.some(p => p.caster === s.p));
    other.cooldowns.clear(); other.reflexLock = 0; other.useLock = 0; s.w.useSkill(other, remote, other.pos);
    check('other owner can refresh allied blessing after reset', s.p.buffs.has('green_bless'));
  }
  for (const sid of ['acrid_draught', 'shared_draught', 'chaser']) {
    const results: number[] = [];
    for (const level of [1, 20]) {
      const s = setup('life_flask', [], 10); s.inst.sockets[0] = { def: SUPPORTS[sid], level };
      drink(s); const payload = s.w.pendingFollowUps[0].inst;
      const key = sid === 'acrid_draught' ? 'damage' : sid === 'shared_draught' ? 'healPower' : 'effectDuration';
      results.push(stat(s.p, payload, key));
      check(sid + ' child has no repeat fuel', payload.procChainDepth === 1 && instanceFollowUps(payload).length === 0 && instanceChargeGain(payload).length === 0);
    }
    check(sid + ' level improves emitted rider', results[1] > results[0] * 1.5, results.join(' -> '));
  }
  {
    const s = setup('mana_flask', ['blue_lance', 'blue_shock', 'blue_feedback']);
    s.p.charges.set('flask_mana', 2); s.p.fillResources(); s.p.sheet.setSource('prime', [mod('pourPrime', 'flat', 1)]);
    const aim = { x: s.p.pos.x + 80, y: s.p.pos.y + 40 }; drink(s, aim);
    const saved = serializeCharacter(s.w), loaded = setup('mana_flask');
    check('save stores paid ammunition and prime aim', saved.flaskCharges?.flask_mana === 1 && json(saved.primedPours?.[0].aim) === json(aim));
    check('load restores spent ammunition without refund', applySavedCharacter(loaded.w, saved) && loaded.p.charges.get('flask_mana') === 1 && json(loaded.p.primedPours[0]?.aim) === json(aim));
    loaded.p.gainEvents = []; applySavedCharacter(loaded.w, saved);
    check('load cannot manufacture charge proc events', !loaded.p.gainEvents.some(e => e.kind === 'charge'));
    const remote = setup('mana_flask'); remote.w.clientSeatId = s.w.localSeat.id;
    applySnapshot(remote.w, serializeSnapshot(s.w, 1));
    check('snapshot mirrors host-owned flask ammunition', remote.w.player.charges.get('flask_mana') === 1);
  }
  // Per-charge scales the paid bank exactly once, with no secret charge return.
  for (const root of ['gold_retort', 'gold_grand']) {
    const totals: number[] = [], damage: number[] = [];
    for (const count of [4, 6]) {
      const s = setup('catalyst_flask', [root]); const foe = target(s.w); s.p.charges.set('flask_catalyst', count);
      drink(s, foe.pos); totals.push(s.p.restoreStreams.reduce((n, st) => n + st.remaining, 0));
      damage.push(s.w.pendingFollowUps[0]?.dmgMult ?? 0);
      check(root + ' consumes exact bank', s.p.charges.get('flask_catalyst') === 0);
    }
    check(root + ' total conservation 6/4', near(totals[1] / totals[0], 1.5));
    if (root === 'gold_retort') check(root + ' damage scaling 6/4', near(damage[1] / damage[0], 1.5));
  }
  // Fresh veteran starts preserve every authored class bar; first accounts
  // continue through the existing Mireille lesson (covered by its own rig).
  for (const c of CLASSES) {
    const w = makeSimWorld(c.id, 0xf1a5c); const before = w.player.skills.map(s => s?.def.id);
    w.account.ledger[LEDGER_FLASK_LESSON] = 1; w.dealVeteranFlasks();
    check(c.id + ' veteran Life and Mana', ['life_flask', 'mana_flask'].every(id => w.meta.knownSkills.has(id)) && before.every((id, i) => !id || w.player.skills[i]?.def.id === id));
  }
} finally { restoreRandom(); }
console.log(`FLASK TREES: ${passed} passed, ${failed} failed`);
mkdirSync('balance/reports', { recursive: true });
writeFileSync('balance/reports/flask-catalog.json', JSON.stringify(Object.keys(FLASK_TREES).map(id => SKILLS[id])));
process.exitCode = failed ? 1 : 0;
