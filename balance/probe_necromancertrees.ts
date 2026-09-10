// Real-engine regression gate for the first Necromancer tree batch.
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { MONSTERS } from '../src/data/monsters';
import { makeSkillInstance, instanceDelivery, instanceMods, treeNodeRefusal, validTreeNodes, skillContextTags } from '../src/engine/skills';
import { replenishShape } from '../src/engine/replenishment';
import { previewSkill } from '../src/engine/skillPreview';
import { updateAI } from '../src/engine/ai';
import { mod } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { rebuildSkill } from '../src/meta/character';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
}
const restore = seedGlobalRandom(0xdead51);
function setup(nodes: string[] = []) {
  const w = makeSimWorld('necromancer', 0xdead51);
  const inst = makeSkillInstance(SKILLS.shambler_horde, 20, 3);
  w.meta.knownSkills.set(inst.def.id, inst);
  w.player.skills.fill(null); w.player.skills[0] = inst;
  for (const n of nodes) w.pickTreeNode(inst.def.id, n);
  return { w, inst, p: w.player };
}
const crew = (w: World, owner = w.player) => w.actors.filter(a => !a.dead && a.owner === owner && a.sourceSkillId === 'shambler_horde');
function step(w: World, seconds: number, minds = false) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    if (minds) for (const a of [...w.actors]) updateAI(a, w, 1 / 60);
    w.update(1 / 60);
  }
}

try {
  {
    const { w, inst } = setup();
    check('unpicked delivery is the original object', instanceDelivery(inst) === inst.def.delivery);
    inst.level = 4; w.pickTreeNode(inst.def.id, 'wandering_dead');
    check('identity refuses before the first milestone', !inst.treeNodes?.length);
    inst.level = 20; w.pickTreeNode(inst.def.id, 'wandering_dead');
    check('passive identity spends through the real tree action', inst.treeNodes?.join() === 'wandering_dead');
    check('all rival identities are locked', !!treeNodeRefusal(inst, 'grave_rush') && !!treeNodeRefusal(inst, 'corpse_engine'));
    w.pickTreeNode(inst.def.id, 'gathering_dead'); w.pickTreeNode(inst.def.id, 'gathering_dead');
    w.pickTreeNode(inst.def.id, 'restless_graves');
    check('ranked investment and cadence fill four points', inst.treeNodes?.length === 4 && !!treeNodeRefusal(inst, 'stitched_flesh'));
    const d = instanceDelivery(inst);
    check('authored base never mutates', SKILLS.shambler_horde.delivery.type === 'summon'
      && SKILLS.shambler_horde.delivery.maxActive === 6 && SKILLS.shambler_horde.delivery.duration === 7);
    check('full passive allocation has 8 slots and a 2.25-second beat', d.type === 'summon'
      && replenishShape(w.player, inst, d).cap === 8 && replenishShape(w.player, inst, d).interval === 2.25);
    const loaded = rebuildSkill({ skillId: inst.def.id, level: 20, rarity: 'common', sockets: [], treeNodes: inst.treeNodes });
    check('save rebuild preserves ranks and delivery', !!loaded && loaded.treeNodes?.join() === inst.treeNodes?.join()
      && JSON.stringify(instanceDelivery(loaded)) === JSON.stringify(d));
    check('hostile saved picks cannot cross branches', validTreeNodes(inst.def,
      ['wandering_dead', 'grave_rush', 'corpse_engine'], 20, { quiet: true })?.join() === 'wandering_dead');
  }
  {
    const { w, p, inst } = setup(['wandering_dead']);
    let casts = 0;
    SIM_TAP.current = { onCast: () => casts++ };
    const mana = p.mana;
    check('manual and trigger execution cannot bypass the passive rate', !p.canUse(inst)
      && !w.useSkill(p, inst, p.pos, true) && !w.executeSkill(p, inst, p.pos));
    step(w, 2.9); check('first birth waits its interval', crew(w).length === 0);
    step(w, 0.2); check('one free birth, no cast event or use lock', crew(w).length === 1 && casts === 0 && p.mana >= mana && !p.casting);
    step(w, 9.2); check('horde gradually reaches its cap', crew(w).length === 4);
    const waiting = crew(w); const ids = waiting.map(a => a.id).join();
    step(w, 15, true);
    check('waiting bodies neither expire nor churn at a full cap', crew(w).map(a => a.id).join() === ids && waiting.every(a => a.lifespan === 0));
    w.kill(waiting[0], true);
    step(w, 2.8); check('a vacancy cannot spend banked full-pool time', crew(w).length === 3);
    step(w, 0.3); check('one loss replenishes on cadence', crew(w).length === 4);
    const preview = previewSkill(p, inst);
    check('preview reports passive cadence, cap and permanence without cast/cooldown rows',
      preview.rows.some(r => r.key === 'replenish' && r.value === '1 every 3s')
      && preview.rows.some(r => r.key === 'minionCap' && r.value === '4')
      && preview.rows.some(r => r.key === 'minionDuration' && r.value === 'Until destroyed')
      && !preview.rows.some(r => ['castTime', 'cooldown', 'cost'].includes(r.key)));
    p.skills[0] = null; step(w, 4);
    check('removing the bar anchor dismisses the horde and stops births', crew(w).length === 0);
    p.skills[0] = inst; step(w, 2.8); check('reseating starts a fresh clock', crew(w).length === 0);
    step(w, 0.3); check('reseating resumes ordinary births', crew(w).length === 1);
    w.fonts.push({ pos: { ...p.pos } });
    p.casting = null;
    w.meta.abilityEssences.ability4 = 999;
    check('Font reset succeeds', w.fontResetTree(inst.def.id));
    check('reset removes permanent bodies and restores active casting', crew(w).length === 0 && !inst.treeNodes && p.canUse(inst));
    step(w, 4); check('reset leaves no passive birth clock running', crew(w).length === 0);
    SIM_TAP.current = null;
  }
  {
    const { w, p, inst } = setup(['wandering_dead']);
    p.skills[1] = inst;
    step(w, 3.1); check('duplicate bar references share one clock', crew(w).length === 1);
    p.skills.fill(null);
    const ally = w.createMonster('skeleton_warrior', 1, 'player', p);
    const otherInst = makeSkillInstance(SKILLS.shambler_horde, 20, 1);
    otherInst.treeNodes = ['wandering_dead']; ally.skills = [otherInst]; w.actors.push(ally);
    step(w, 3.1);
    check('same data works for a non-player caster with separate owner credit', crew(w, ally).length === 1 && crew(w).length === 0);
    ally.downed = true; step(w, 5); check('downed owners raise nothing', crew(w, ally).length === 1);
    ally.downed = false; step(w, 2.8); check('revival does not catch up missed births', crew(w, ally).length === 1);
    step(w, 0.3); check('revived owner resumes after the interval', crew(w, ally).length === 2);
  }
  {
    const { w, p, inst } = setup(['wandering_dead']);
    const extra = instanceMods(inst), tags = skillContextTags(inst.def);
    const d = instanceDelivery(inst);
    p.sheet.setSource('probe', [mod('minionMaxCount', 'more', 0.5), mod('minionRespawnTime', 'more', -0.5)]);
    check('multiplicative cap investment uses the authored base in preview',
      previewSkill(p, inst).rows.find(r => r.key === 'minionCap')?.value === '6');
    step(w, 1.6); check('owner respawn investment accelerates the passive clock', crew(w).length === 1);
    check('new bodies inherit the exact summon instance and scaled life', crew(w)[0]?.summonInst === inst
      && Math.abs(crew(w)[0].sheet.get('life') - crew(w)[0].maxLife()) < 0.01);
    check('identity life trade is live on the sheet', p.sheet.get('minionLife', tags, extra) < 1 + 19 * 0.12);
    check('resolved capacity agrees with runtime', d.type === 'summon' && replenishShape(p, inst, d).cap === 6);
    inst.sockets[0] = { def: SUPPORTS.legion_call, level: 1 };
    step(w, 1.6);
    check('ordinary summon-count support increases a replenishment batch', crew(w).length >= 3);
  }
  for (const path of ['grave_rush', 'corpse_engine']) {
    const { w, p, inst } = setup([path]);
    p.mana = p.availableMaxMana();
    check(`${path}: active cast remains available`, w.useSkill(p, inst, p.pos, true));
    step(w, 0.8);
    const bodies = crew(w);
    check(`${path}: cast reaches resolved count and lifespan`, bodies.length === (path === 'grave_rush' ? 2 : 1)
      && bodies.every(a => a.lifespan > (path === 'grave_rush' ? 3 : 13)));
    if (path === 'grave_rush') { step(w, 4.2); check('rush bodies retain their finite expiry', crew(w).length === 0); }
  }
  {
    const { w, p } = setup();
    const pool = ['a', 'b'].map(id => makeSkillInstance({ ...SKILLS.shambler_horde,
      id: `probe_pool_${id}`, tree: undefined,
      delivery: { type: 'summon', monsterId: 'grave_shambler', count: 1, maxActive: 1,
        poolGroup: 'replenish_probe', replenish: { interval: 1 } } }, 1, 1));
    p.skills = pool;
    step(w, 1.1);
    const born = w.actors.find(a => !a.dead && a.sourcePoolGroup === 'replenish_probe');
    step(w, 3);
    const alive = w.actors.filter(a => !a.dead && a.sourcePoolGroup === 'replenish_probe');
    check('simultaneous shared-pool beats never evict or double-fill', !!born && !born.dead && alive.length === 1 && alive[0] === born);
  }
  {
    const { w } = setup(['wandering_dead']);
    w.timeflow.hold({ id: 'replenish_probe', kind: 'menu', scale: 0 });
    step(w, 6); check('world pause freezes passive births', crew(w).length === 0);
    w.timeflow.release('replenish_probe');
    step(w, 2.8); check('unpause has no catch-up births', crew(w).length === 0);
    step(w, 0.3); check('unpause resumes the ordinary birth interval', crew(w).length === 1);
  }
  {
    const { w, p } = setup(['wandering_dead']);
    step(w, 3.1);
    const body = crew(w)[0];
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.pos = { x: body.pos.x + 150, y: body.pos.y }; foe.life = 1;
    w.actors.push(foe);
    let killer: Actor | undefined, hits = 0;
    SIM_TAP.current = { onDeath: (a, k) => { if (a === foe) killer = k; },
      onHit: (a, target, result) => { if (a === body && target === foe && result.total > 0) hits++; } };
    step(w, 4, true);
    check('a waiting corpse sights a foe, pursues and detonates', body.dead && foe.dead);
    check('blast hit and kill retain the corpse and its owning player', hits > 0 && killer === body && killer.owner === p);
    SIM_TAP.current = null;
  }
  {
    const { w } = setup(['wandering_dead']);
    step(w, 3.1);
    const body = crew(w)[0];
    const foe = w.createMonster('target_dummy', 1, 'enemy');
    foe.pos = { ...body.pos }; foe.tier = body.tier + 1;
    w.actors.push(foe); const life = foe.life;
    w.explodeActor(body, MONSTERS.grave_shambler.explodeOnDeath!);
    check('explosion cannot cross stories', foe.life === life);
    foe.tier = body.tier; foe.invulnerable = true;
    w.explodeActor(body, 2.2); check('explosion honors hit immunity', foe.life === life);
    foe.invulnerable = false;
    const packets: number[] = [];
    SIM_TAP.current = { onHit: (a, target, _r, packet) => {
      if (a === body && target === foe) packets.push(Object.values(packet.amounts).reduce((n, v) => n + (v ?? 0), 0));
    } };
    w.explodeActor(body, 2.2);
    foe.life = foe.maxLife();
    body.sheet.setSource('probe_damage', [mod('damage', 'more', 1)]);
    w.explodeActor(body, 2.2);
    check('the blast reads minion damage investment exactly once', packets.length === 2 && Math.abs(packets[1] - packets[0] * 2) < 0.01);
    SIM_TAP.current = null;
  }
} finally { SIM_TAP.current = null; restore(); }
console.log(failed ? `${failed} CHECK(S) FAILED` : 'ALL CHECKS PASSED');
process.exit(failed ? 2 : 0);
