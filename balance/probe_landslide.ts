import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { makeSkillInstance, instanceDelivery, supportFitsInstOrCrew, type SkillInstance, type SummonDelivery } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { treeGraph } from '../src/engine/skilltree';
import { rebuildSkill } from '../src/meta/character';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { SIM_TAP } from '../src/engine/tap';
import { updateAI } from '../src/engine/ai';
import type { World } from '../src/engine/world';

let checks = 0;
const check = (name: string, ok: unknown) => { assert.ok(ok, name); checks++; console.log('PASS ' + name); };
const step = (w: World, seconds: number) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) w.update(1 / 60); };
function rig() {
  const w = makeSimWorld('brawler', 0x1a4d), p = w.player;
  w.meta.baseAttrs.willpower = 100; w.meta.baseAttrs.intelligence = 100; w.meta.baseAttrs.strength = 100; w.recalcPlayer();
  p.skills.fill(null); p.sheet.setSource('landslide:fixture', [mod('mana', 'flat', 10000)]); p.fillResources();
  return w;
}
function seat(w: World, id: string, slot = 0, nodes: string[] = []): SkillInstance {
  const inst = makeSkillInstance(SKILLS[id], 20, 4);
  w.meta.knownSkills.set(id, inst); w.player.skills[slot] = inst;
  for (const node of nodes) w.pickTreeNode(id, node);
  return inst;
}
function cast(w: World, inst: SkillInstance) {
  w.player.casting = null; w.player.cooldowns.clear(); w.player.useLock = 0; w.player.fillResources();
  assert.ok(w.useSkill(w.player, inst, w.player.pos)); step(w, 1.25);
}
const crew = (w: World, inst: SkillInstance) => w.minionsOfSkill(w.player, inst.def.id).filter(a => !a.summonOffspring);
function launchRig(nodes: string[] = [], socket = false) {
  const w = rig(), inst = seat(w, 'summon_rubblekin', 0, nodes);
  if (socket) { inst.sockets[0] = { def: SUPPORTS.resonance, level: 1 }; inst.sockets[1] = { def: SUPPORTS.splitting, level: 1 }; }
  cast(w, inst);
  const bodies = crew(w, inst), body = bodies[0], p = w.player;
  for (const b of bodies) b.pos = { x: p.pos.x - 170, y: p.pos.y + b.id * 12 };
  body.pos = { x: p.pos.x + 38, y: p.pos.y }; body.facing = 0;
  const jab = seat(w, 'one_two', 1); p.facing = 0;
  return { w, p, inst, body, jab };
}
function launch(w: World, jab: SkillInstance) {
  w.executeSkill(w.player, jab, { x: w.player.pos.x + 600, y: w.player.pos.y }, { keepFacing: true });
}
function targetAt(w: World, x: number, y = 0) {
  const target = w.createMonster('zombie', 1, 'enemy');
  target.pos = { x: w.player.pos.x + x, y: w.player.pos.y + y };
  target.anchored = true; target.skills.fill(null);
  target.sheet.setSource('landslide:target', [mod('life', 'flat', 1e5), mod('evasion', 'override', 0), mod('armor', 'override', 0)]);
  target.fillResources(); w.actors.push(target); return target;
}
const restore = seedGlobalRandom(0x1a4d);
try {
  {
    const w = rig();
    for (const [i, kind] of ['stone', 'fire', 'ice', 'blood', 'bone'].entries()) {
      const inst = seat(w, 'summon_' + kind + '_golem', i); cast(w, inst);
      check(kind + ': one reserved shared-pool type, including Stone', w.minionsOfGroup(w.player, 'golem').length === 1
        && w.minionsOfGroup(w.player, 'golem')[0].defId === kind + '_golem' && w.player.summonToggles.size === 1);
    }
    const rubble = seat(w, 'summon_rubblekin', 5); cast(w, rubble);
    check('major golem and four rubble coexist with paid slots', crew(w, rubble).length === 4 && w.minionsOfGroup(w.player, 'golem').length === 1 && w.player.reservedMana === 64);
  }
  {
    const w = rig();
    const make = (kind: string, slot: number, pool: string, exclusiveGroup?: string, persistent = true) => {
      const base = SKILLS['summon_' + kind + '_golem'];
      const d = base.delivery as SummonDelivery;
      const inst = makeSkillInstance({ ...base, delivery: { ...d, maxActive: 2, poolGroup: pool, exclusiveGroup,
        persistent: persistent ? { ...d.persistent!, slots: 1 } : undefined } }, 1);
      w.player.skills[slot] = inst; return inst;
    };
    const fire = make('fire', 0, 'mixed'), blood = make('blood', 1, 'mixed'), stone = make('stone', 2, 'mixed');
    cast(w, fire); cast(w, blood); step(w, 9);
    check('nonexclusive reserved types share capacity without replacement or duplicate queues', crew(w, fire).length === 1 && crew(w, blood).length === 1 && w.pendingRespawns.length === 0 && w.player.reservedMana === 60);
    check('full reserved pool refuses another contract before payment', !w.player.canUse(stone));
    const bloodBody = crew(w, blood)[0]; w.kill(bloodBody); step(w, 0.1);
    check('dead reserved slot cannot be stolen by another type', !w.player.canUse(stone) && w.player.reservedMana === 60);
    step(w, 7); check('mixed contract rebuilds without evicting its neighbor', crew(w, fire).length === 1 && crew(w, blood).length === 1);
    cast(w, fire); cast(w, stone); step(w, 9);
    check('released capacity admits another reserved type', !crew(w, fire).length && crew(w, stone).length === 1 && crew(w, blood).length === 1 && w.player.reservedMana === 65);
    const a = make('ice', 3, 'different_a', 'exclusive_test', false), b = make('bone', 4, 'different_b', 'exclusive_test', false);
    cast(w, a); cast(w, b);
    check('type exclusivity works for ordinary summons across different capacity pools', !crew(w, a).length && crew(w, b).length === 1);
  }
  {
    const empty = rig(); launch(empty, seat(empty, 'one_two'));
    const emptyFury = empty.player.charges.get('fury') ?? 0;
    const { w, p, inst, body, jab } = launchRig();
    body.sheet.setSource('landslide:no-regeneration', [mod('lifeRegen', 'override', 0)]);
    body.life *= 0.6; const life = body.life, mana = p.reservedMana, ids = crew(w, inst).map(a => a.id);
    const target = w.createMonster('zombie', 1, 'enemy'); target.pos = { x: p.pos.x + 200, y: p.pos.y };
    target.sheet.setSource('landslide:target', [mod('life', 'flat', 1e5), mod('evasion', 'override', 0), mod('armor', 'override', 0)]); target.fillResources(); w.actors.push(target);
    const hits: number[] = []; SIM_TAP.current = { onHit: attacker => hits.push(attacker.id) };
    launch(w, jab);
    check('One-Two releases a native minion projectile without friendly damage or extra Fury', body.summonReform && body.life === life && (p.charges.get('fury') ?? 0) === emptyFury
      && w.projectiles.some(pr => pr.caster === body && pr.inst.def.id === 'rubble_flight'));
    check('released body stays owned, invulnerable and counted against its slot', body.untargetable && body.invulnerable && crew(w, inst).length === 4 && p.reservedMana === mana);
    launch(w, jab); check('a rebuilding stone cannot be launched twice', w.projectiles.filter(pr => pr.caster === body).length === 1);
    const pos = { ...body.pos }; updateAI(body, w, 1); check('rebuilding stone does not act or move', body.pos.x === pos.x && body.pos.y === pos.y && !body.casting);
    const client = rig(); applySnapshot(client, serializeSnapshot(w, 1));
    check('co-op carries reconstruction state', client.actors.some(a => a.name === body.name && a.summonReform?.duration === 4));
    step(w, 0.5); check('launched damage is attributed to the stone', hits.includes(body.id)); SIM_TAP.current = null;
    step(w, 4); check('same wounded bodies reform without multiplying or repricing', !body.summonReform && !body.untargetable && !body.invulnerable
      && body.life === life && p.reservedMana === mana && crew(w, inst).map(a => a.id).join() === ids.join());
    applySnapshot(client, serializeSnapshot(w, 2)); check('co-op clears absent reconstruction state', !client.actors.some(a => a.summonReform));
    launch(w, jab); cast(w, inst);
    check('dismissal removes rebuilding bodies, projectiles and reservations', !crew(w, inst).length && !w.projectiles.some(pr => pr.caster === body) && p.reservedMana === 0 && !w.pendingRespawns.length);
  }
  {
    const { w, p, body, jab } = launchRig();
    body.pos = { x: p.pos.x - 38, y: p.pos.y }; launch(w, jab); check('stones behind the jab are not released', !body.summonReform);
    body.pos.x = p.pos.x + 38; body.tier = p.tier + 1; launch(w, jab); check('melee release respects story separation', !body.summonReform);
    body.tier = p.tier; const owner = body.owner; body.owner = w.createMonster('zombie', 1, 'player'); launch(w, jab);
    check('another owner cannot release your stones', !body.summonReform); body.owner = owner;
    const cross = makeSkillInstance(SKILLS.cross_jab, 1); body.pos.x = p.pos.x + 60; launch(w, cross);
    check('Cross Jab uses its real band footprint to release stones', !!body.summonReform);
  }
  {
    const { w, inst, body, jab } = launchRig(['flint_children', 'serrated_strata', 'through_the_ranks'], true);
    check('projectile supports fit the resolved release art through Resonance', supportFitsInstOrCrew(SUPPORTS.splitting, inst, w.summonCrewSkills(inst)));
    launch(w, jab); const shots = w.projectiles.filter(p => p.caster === body);
    check('flint tree and forwarded supports affect real flights', shots.length > 1 && shots.every(p => p.pierce === 5 && p.inst.def.id === 'rubble_flint'));
    const saved = rebuildSkill({ skillId: inst.def.id, level: 20, rarity: 'common', sockets: [], treeNodes: inst.treeNodes });
    check('release identity survives saving and rebuilding the skill', !!saved && (instanceDelivery(saved) as SummonDelivery).strikeRelease?.skill === 'rubble_flint');
    w.pickTreeNode(inst.def.id, 'lodged_shale');
    check('respec retires flights from the old release identity', !w.projectiles.some(p => p.caster === body));
  }
  {
    const { w, body, jab } = launchRig(['bursting_seams', 'restless_earth', 'rolling_detonations']); launch(w, jab);
    const shot = w.projectiles.find(p => p.caster === body)!;
    check('explosive route pierces, detonates and reconstructs faster', shot.pierce === 2 && shot.hitDetonate && Math.abs(body.summonReform!.duration - 2.6) < 1e-8);
    const conduit = launchRig(['bursting_seams', 'singing_shale', 'long_echo']); launch(conduit.w, conduit.jab);
    const rolling = conduit.w.projectiles.find(p => p.caster === conduit.body)!;
    check('conduit is a supported lasting projectile', rolling.inst.def.id === 'rubble_conduit' && Math.abs(rolling.maxAge! - 3.6) < 1e-8);
  }
  {
    const { w, body, jab } = launchRig(['flint_children']);
    const near = targetAt(w, 150), far = targetAt(w, 260);
    launch(w, jab); step(w, 0.6);
    check('flint pierces real enemies and leaves minion-attributed bleeds', [near, far].every(target =>
      target.life < target.maxLife() && target.statuses.some(s => s.id === 'bleed' && s.casterId === body.id)));
  }
  {
    const { w, body, jab } = launchRig(['bursting_seams']);
    const direct = targetAt(w, 150), splash = targetAt(w, 150, 45);
    const victims = new Set<number>(); SIM_TAP.current = { onHit: (attacker, target, result) => {
      if (attacker === body && result.total > 0) victims.add(target.id);
    } };
    launch(w, jab); step(w, 0.5); SIM_TAP.current = null;
    check('burst hits its contact and an enemy outside the projectile lane', victims.has(direct.id) && victims.has(splash.id));
  }
  {
    const { w, body, jab } = launchRig(['bursting_seams', 'singing_shale']);
    const side = targetAt(w, 190, 40); let pulses = 0;
    SIM_TAP.current = { onHit: (attacker, target, result) => {
      if (attacker === body && target === side && result.total > 0) pulses++;
    } };
    launch(w, jab); step(w, 1.2); SIM_TAP.current = null;
    check('rolling conduit repeatedly damages nearby enemies through its native art', pulses >= 2);
  }
  {
    const { w, p, inst, body } = launchRig();
    const reserve = p.reservedMana;
    w.kill(body); step(w, 0.1);
    check('a destroyed Rubblekin keeps its paid slot while awaiting reconstruction', crew(w, inst).length === 3 && p.reservedMana === reserve);
    step(w, 4.2);
    check('a destroyed Rubblekin is replaced once by its reserved contract', crew(w, inst).length === 4 && !crew(w, inst).includes(body) && p.reservedMana === reserve);
  }
  {
    const { w, inst, body, jab } = launchRig([], true);
    inst.sockets[2] = { def: SUPPORTS.rattling_salvo, level: 1 }; w.resyncMinionSupports(inst);
    launch(w, jab);
    check('salvo support commits a delayed second stone', w.projectiles.filter(p => p.caster === body).length === 1);
    step(w, 0.15);
    check('reconstruction does not cancel a supported volley', w.projectiles.filter(p => p.caster === body).length === 2);
    step(w, 4); launch(w, jab);
    w.pickTreeNode(inst.def.id, 'patient_stones'); step(w, 0.2);
    check('changing investment cancels delayed volleys as well as existing flights', !w.projectiles.some(p => p.caster === body));
  }
  {
    const { w, p, inst, body, jab } = launchRig(['bursting_seams', 'singing_shale', 'long_echo']);
    p.sheet.setSource('landslide:fast-reform', [mod('minionRespawnTime', 'override', 0.01)]);
    launch(w, jab); step(w, 0.2); w.kill(body); step(w, 0.05);
    check('a dead body can still have an attributable conduit in flight', w.projectiles.some(pr => pr.caster === body));
    cast(w, inst);
    check('dismissal also clears flights whose original body has died', !w.projectiles.some(pr => pr.caster === body));
  }
  {
    const { w, p, body, jab } = launchRig();
    p.sheet.setSource('landslide:sweep', [mod('meleeSweep', 'override', 1)]);
    body.pos.x = p.pos.x + 130; launch(w, jab); step(w, 0.4);
    check('a converted traveling melee wave releases stones on contact', !!body.summonReform);
  }
  {
    const w = rig(), inst = seat(w, 'summon_rubblekin');
    w.player.sheet.setSource('landslide:sequence', [mod('summonSequence', 'override', 1)]);
    cast(w, inst);
    w.player.sheet.setSource('landslide:shrink', [mod('minionMaxCount', 'override', 1)]); step(w, 8);
    check('cap reduction retires excess bodies and queued births', crew(w, inst).length === 1 && w.pendingRespawns.length === 0 && w.player.reservedMana === 8);
  }
  {
    const graph = treeGraph(SKILLS.summon_rubblekin)!;
    const nodes = [...graph.nodes.values()].map(row => row.node);
    check('Rubblekin uses the full 15-node tree anatomy', nodes.length === 15 && nodes.filter(n => n.excludes?.length).length === 2);
    for (const leaf of nodes.filter(n => n.links?.length && !nodes.some(other => other.links?.includes(n.id)))) {
      const mid = nodes.find(n => n.id === leaf.links![0])!, trunk = nodes.find(n => n.id === mid.links![0])!;
      const { w, inst, body, jab } = launchRig([trunk.id, mid.id, leaf.id]); launch(w, jab);
      check(leaf.id + ': reachable route executes its release', inst.treeNodes?.length === 3 && !!body.summonReform && w.projectiles.some(p => p.caster === body));
    }
  }
  console.log(`LANDSLIDE OK: ${checks} checks`);
} finally { SIM_TAP.current = null; restore(); }
