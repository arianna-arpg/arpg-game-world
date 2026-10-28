import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { makeSkillInstance, instanceDelivery, instanceMetas, skillContextTags, instanceMods, treeNodeRefusal } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { applyHit, applyDot } from '../src/engine/damage';
import { SIM_TAP } from '../src/engine/tap';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
let failed = 0;
const check = (name: string, pass: boolean) => { console.log((pass ? 'PASS ' : 'FAIL ') + name); if (!pass)
  failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < .01;
function step(w: World, t: number) { for (let i = 0; i < Math.ceil(t * 60); i++)
  w.update(1 / 60); }
function setup(nodes: string[] = []) {
  const w = makeSimWorld('necromancer', 0xb06e), p = w.player;
  w.meta.baseAttrs.intelligence = 100;
  w.meta.baseAttrs.willpower = 100;
  w.recalcPlayer();
  const host = makeSkillInstance(SKILLS.summon_bone_golem, 20, 3);
  w.meta.knownSkills.set(host.def.id, host);
  p.skills.fill(null);
  p.skills[0] = host;
  for (const n of nodes)
    w.pickTreeNode(host.def.id, n);
  p.sheet.setSource('probe', [mod('mana', 'flat', 10000)]);
  p.fillResources();
  return { w, p, host };
}
function summon(t: ReturnType<typeof setup>) { t.w.useSkill(t.p, t.host, t.p.pos, true); step(t.w, Math.max(1.5, t.p.skillUseTime(t.host) + .3)); return t.w.actors.find(a => !a.dead && a.owner === t.p && a.summonInst === t.host && !a.summonOffspring)!; }
function enemy(w: World, a: Actor, offset = 50) {
  const e = w.createMonster('zombie', 1, 'enemy');
  e.pos = { x: a.pos.x + offset, y: a.pos.y };
  e.sheet.setSource('probe', [mod('life', 'flat', 100000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('moveSpeed', 'override', 0)]);
  e.fillResources();
  w.actors.push(e);
  return e;
}
function fire(w: World, a: Actor, id: string, target: Actor) {
  const inst = a.skills.find(s => s?.def.id === id) ?? a.frameState?.kit.find(s => s.def.id === id);
  if (!inst)
    throw Error('Missing ' + id);
  a.casting = null;
  a.useLock = 0;
  a.cooldowns.clear();
  w.useSkill(a, inst, target.pos);
  step(w, Math.max(.1, a.skillUseTime(inst) + .1));
  return inst;
}
const restore = seedGlobalRandom(0xb06e);
try {
  {
    const t = setup(), a = summon(t);
    check('unallocated golem retains one reserved persistent body', !!a && t.p.reservedMana > 0 && !a.frameState);
    t.w.kill(a, false, t.p);
    check('baseline reconstruction remains eight seconds', near(t.w.pendingRespawns[0].timer, 8 * t.p.sheet.get('minionRespawnTime')));
  }
  {
    const t = setup(['osseous_might', 'drilled_bones', 'bone_cohort', 'assembled_legion']), a = summon(t), e = enemy(t.w, a);
    check('sacrifice and legion are a legal four-point route', t.host.treeNodes?.length === 4 && !!a.frameState);
    check('Juggernaut does not grant Crush', instanceMetas(t.host).every(m => m.skillId !== 'frame_crush_order'));
    let paid = 0, novas = 0, barrages = 0;
    SIM_TAP.current = { onHit: (source, target, r, p) => { if (source === a && target === a && p.resourceHit)
        paid += r.total; }, onCast: (source, s) => { if (source === a) {
        if (s.def.id === 'frame_nova')
          novas++;
        if (s.def.id === 'frame_barrage')
          barrages++;
      } } };
    for (let i = 0; i < 3; i++)
      fire(t.w, a, 'claw', e);
    check('three landed claws pay once each and fire one barrage', near(paid, a.maxLife() * .09) && barrages === 1);
    fire(t.w, a, 'frame_bonebreaker', e);
    SIM_TAP.current = null;
    check('completed Bonebreaker pays once, emits nova, and earns reconstruction credit', novas === 1 && a.frameState!.slams === 1 && near(paid, a.maxLife() * .12));
    const nova = a.frameState!.kit.find(s => s.def.id === 'frame_nova')!;
    check('nova exposes its own projectile stats', a.sheet.get('projectileCount', skillContextTags(nova), instanceMods(nova)) === 9);
    for (let i = 0; i < 30; i++) {
      a.life = a.maxLife();
      applyHit(a, a, { amounts: { physical: 1 }, tags: new Set(['physical']), crit: false, resourceHit: true, sourceName: 'fixture' });
    }
    const heirs = () => t.w.actors.filter(x => !x.dead && x.owner === t.p && x.summonInst === t.host && x.summonOffspring);
    check('self-hits can shed exactly one active lesser member', heirs().length === 1);
    t.w.kill(a, false, t.p);
    check('death creates two additional nonrecursive heirs', heirs().length === 3 && heirs().every(x => !x.frameState));
    check('earned recovery credit applies to the next death', near(t.w.pendingRespawns[0].timer, 8 * .88 * t.p.sheet.get('minionRespawnTime')));
    const pending = t.w.pendingRespawns.length;
    for (const h of heirs())
      t.w.kill(h, false, t.p);
    check('heirs never divide or queue reconstruction', heirs().length === 0 && t.w.pendingRespawns.length === pending);
    step(t.w, 9);
    const fresh = t.w.actors.find(x => !x.dead && x.owner === t.p && !x.summonOffspring)!;
    t.w.kill(fresh, false, t.p);
    check('reconstruction credits are consumed once', near(t.w.pendingRespawns[0].timer, 8 * t.p.sheet.get('minionRespawnTime')));
  }
  {
    const t = setup(['osseous_might', 'great_bones', 'ossuary_commander', 'marrow_bruiser']);
    t.host.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    t.host.sockets[1] = { def: SUPPORTS.widening, level: 1 };
    const a = summon(t), e = enemy(t.w, a, 160);
    let strikes = 0, faults = 0;
    SIM_TAP.current = { onCast: (x, s) => { if (x === a && s.def.id === 'frame_crush')
        strikes++; if (x === a && s.def.id === 'frame_fault')
        faults++; } };
    t.p.useLock = 0;
    check('Crush command is available only on its leaf', t.w.useMetaSkill(t.p, t.host, e.pos));
    step(t.w, 4);
    SIM_TAP.current = null;
    check('command advances, finishes empowered slam, and releases its own fault', strikes === 1 && faults === 3);
    const remaining = a.frameState!.commandReady - t.w.time;
    faults=0;SIM_TAP.current={onCast:(x,s)=>{if(x===a&&s.def.id==="frame_fault")faults++;}};
    fire(t.w, a, 'frame_bonebreaker', e);
    check('ordinary Bonebreaker reduces command recovery', a.frameState!.commandReady - t.w.time < remaining - 2);
    check('ordinary slams release a fault on its own recovery',faults===3);
    fire(t.w,a,'frame_bonebreaker',e);check('normal faults cannot bypass their recovery',faults===3);
    fire(t.w,a,'frame_crush',e);SIM_TAP.current=null;check('empowered faults remain independent of normal fault recovery',faults===6);
    const art = a.frameState!.kit.find(s => s.def.id === 'frame_fault')!;
    check('fault has its own applicable forwarded support', art.sockets.some(g => g?.forwarded && g.def.id === 'widening'));
    t.host.sockets[1] = null;
    t.w.resyncMinionSupports(t.host);
    check('removing a support refreshes auxiliary payloads', !art.sockets.some(g => g?.forwarded && g.def.id === 'widening'));
  }
  {
    const t = setup(['keepers_bulwark', 'close_guard', 'bone_stand', 'warding_reach']);
    t.p.sheet.setSource('extra', [mod('minionMaxCount', 'flat', 2)]);
    const a = summon(t);
    check('worn frame protects rear and sides with a forward opening', !!a.summonShell && a.shellGuard?.side === 'rear' && a.shellGuard.arcDeg === 300);
    check('worn strike has shorter authored reach', a.skills.some(s => s?.def.id === 'frame_marrow_sweep' && s.def.delivery.type === 'cone' && s.def.delivery.range === 85));
    const slots = t.p.summonToggles.get(t.host.def.id)!.slots;
    step(t.w, 10);
    check('extra reserved slots consolidate into one stronger worn frame', slots === 3 && a.frameState?.reservedSlots === 3 && t.w.actors.filter(x => !x.dead && x.summonInst === t.host).length === 1);
    const warrior = t.w.createMonster('skeleton_warrior', 1, 'player');
    warrior.owner = t.p;
    warrior.pos = { x: t.p.pos.x - 45, y: t.p.pos.y - 45 };
    t.w.actors.push(warrior);
    const e = enemy(t.w, a, 120), before = { ...t.p.pos };
    let waves = 0;
    SIM_TAP.current = { onCast: (x, s) => { if (x === a && s.def.id === 'frame_wave')
        waves++; } };
    t.p.useLock = 0;
    t.w.useMetaSkill(t.p, t.host, { x: t.p.pos.x + 250, y: t.p.pos.y });
    step(t.w, .1);
    check('wave includes a nearby melee ally and protects it during charge', warrior.frameCharging && applyHit(e, warrior, { amounts: { physical: 100 }, tags: new Set(['physical']), crit: false, sourceName: 'fixture' }).immune);
    check('charge immunity also prevents ongoing damage', applyDot(warrior, 10, 'physical') === 0);
    const cost = applyHit(warrior, warrior, { resourceHit: true, amounts: { physical: 1 }, tags: new Set(['physical']), crit: false, sourceName: 'fixture' });
    check('charge immunity cannot waive voluntary health costs', near(cost.total, 1));
    step(t.w, 3);
    SIM_TAP.current = null;
    check('projected wave attacks without moving the caster and clears immunity', waves > 0 && near(t.p.pos.x, before.x) && near(t.p.pos.y, before.y) && !warrior.frameCharging);
  }
  {
    const t = setup(['keepers_bulwark', 'renewing_frame', 'sheltering_bones', 'adamant_frame']), a = summon(t);
    check('Sanctuary and Reliquary share a legal four-point route', t.host.treeNodes?.length === 4 && !!treeNodeRefusal(t.host, 'close_guard'));
    const delivery = instanceDelivery(t.host);
    check('mechanics remain authored in the resolved summon configuration', delivery.type === 'summon' && delivery.frame?.sanctuary?.regen === .05);
    check('active primary slot becomes Reknit', t.w.slotFaceOf(t.p, t.host).id === 'frame_reknit');
    const remote = makeSimWorld('necromancer', 0xb06e);
    applySnapshot(remote, serializeSnapshot(t.w, 1));
    const mirror = remote.player;
    check('multiplayer replica presents the same converted primary', remote.slotFaceOf(mirror, t.host).id === 'frame_reknit');
    a.life = a.maxLife() * .5;
    a.sheet.setSource('no-healing', [mod('healTaken', 'override', 0), mod('lifeRegen', 'override', 0)]);
    step(t.w, 1);
    check('innate regeneration survives healing suppression', a.life > a.maxLife() * .549);
    t.p.life = t.p.maxLife() * .3;
    t.p.useLock = 0;
    t.w.useSkill(t.p, t.host, t.p.pos, true);
    const life = t.p.life;
    step(t.w, 1.2);
    check('player channels while autonomous frame spends health to restore allies', t.p.casting?.inst.def.id === 'frame_reknit' && t.p.life > life && a.frameState!.strain > 0);
    if (t.p.casting)
      t.p.casting.held = false;
    step(t.w, .1);
    check('voluntary release grants a ward earned from actual healing', t.p.absorbLayers.size > 0);
    const origin = { ...a.pos }, e = enemy(t.w, a, 400);
    a.life = 0;
    t.w.kill(a, false, e);
    check('Reliquary defers death and retains its reserved body', !a.dead && !!a.frameState?.terminal && t.p.reservedMana > 0);
    t.p.absorbLayers.clear();
    t.p.es = 0;
    t.p.sheet.setSource('field-only', [mod('armor', 'override', 0), mod('blockChance', 'override', 0), mod('damageTaken', 'override', 1)]);
    t.p.pos = { ...origin };
    const hit = applyHit(e, t.p, { amounts: { physical: 20 }, tags: new Set(['physical']), crit: false, sourceName: 'fixture' });
    check('protective pool exists immediately at original lethal location', hit.total === 0);
    t.p.pos = { x: origin.x + 450, y: origin.y };
    const outside = applyHit(e, t.p, { amounts: { physical: 20 }, tags: new Set(['physical']), crit: false, sourceName: 'fixture' });
    check('protection is spatially limited to its original field', outside.total > 0);
    let exploded = 0;
    SIM_TAP.current = { onCast: (x, s) => { if (x === a && s.def.id === 'frame_explosion')
        exploded++; } };
    step(t.w, 4);
    SIM_TAP.current = null;
    check('terminal golem detonates once and then enters reconstruction', exploded === 1 && a.dead && t.w.pendingRespawns.length === 1);
    t.p.pos = { ...origin };
    check('original field remains after the golem detonates elsewhere', a.dead && Math.hypot(a.pos.x - origin.x, a.pos.y - origin.y) > 250 && applyHit(e, t.p, { amounts: { physical: 20 }, tags: new Set(['physical']), crit: false, sourceName: 'fixture' }).total === 0);
    t.p.sheet.setSource('field-exhaustion', [mod('life', 'flat', 1000000)]);
    t.p.fillResources();
    t.p.es = 0;
    const overflow = applyHit(e, t.p, { amounts: { physical: 1000000 }, tags: new Set(['physical']), crit: false, sourceName: 'fixture' });
    t.w.frameArts.update(.01);
    check('finite field exhaustion removes protection and its ground visual', overflow.total > 0 && !t.w.zones.some(z => z.inst.def.id === 'frame_reliquary'));
    check('reconstructing contract retains disabled Reknit instead of accidentally toggling off', t.w.slotFaceOf(t.p, t.host).id === 'frame_reknit' && !t.w.pressUsable(t.p, t.host));
    t.w.requestMeta({ t: 'dismissFrame', skillId: t.host.def.id });
    check('explicit dismissal releases reservation and pending reconstruction', t.p.reservedMana === 0 && t.w.pendingRespawns.length === 0);
  }
  {
    const t = setup(['osseous_might', 'great_bones', 'ossuary_commander']), a = summon(t), e = enemy(t.w, a);
    const bolt = makeSkillInstance({ ...SKILLS.frame_explosion, id: 'frame_probe_bolt', baseDamage: { physical: [20, 20] }, delivery: { type: 'nova', radius: 800 } }, 1);
    t.p.sheet.setSource('steady', [mod('critChance', 'override', 0)]);
    let hits: number[] = [];
    SIM_TAP.current = { onHit: (source, target, r) => { if (source === t.p && target === e)
        hits.push(r.total); } };
    t.w.executeSkill(t.p, bolt, e.pos);
    fire(t.w, a, 'frame_bonebreaker', e);
    t.w.executeSkill(t.p, bolt, e.pos);
    t.w.executeSkill(t.p, bolt, e.pos);
    SIM_TAP.current = null;
    check('Warcall empowers exactly the next damaging action', hits.length === 3 && near(hits[1], hits[0] * 1.25) && near(hits[2], hits[0]));
  }
  {
    const t = setup(['osseous_might', 'drilled_bones', 'bone_cohort']), a = summon(t), e = enemy(t.w, a);
    a.life = 1;
    let slams = 0, novas = 0;
    const before = e.life;
    SIM_TAP.current = { onCast: (source, s) => { if (source === a) {
        if (s.def.id === 'frame_bonebreaker')
          slams++;
        if (s.def.id === 'frame_nova')
          novas++;
      } } };
    fire(t.w, a, 'frame_bonebreaker', e);
    SIM_TAP.current = null;
    check('a lethal life payment still completes its committed slam and nova', a.dead && e.life < before && slams === 1 && novas === 1 && a.frameState!.slams === 1);
  }
  {
    const plain = setup(['keepers_bulwark', 'renewing_frame']), boost = setup(['keepers_bulwark', 'renewing_frame']);
    boost.host.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    boost.host.sockets[1] = { def: SUPPORTS.intensive_care, level: 1 };
    const a = summon(plain), b = summon(boost);
    a.life = a.maxLife() * .2;
    b.life = b.maxLife() * .2;
    for (const body of [a, b])
      body.sheet.setSource('isolate-repair', [mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0), mod('critChance', 'override', 0)]);
    const aa = a.life, bb = b.life;
    for (const t of [plain, boost]) {
      t.p.useLock = 0;
      t.w.useSkill(t.p, t.host, t.p.pos, true);
      step(t.w, 1);
    }
    check('Reknitting Pulse receives and uses its own healing support', b.frameState!.kit.find(s => s.def.id === 'frame_repair')!.sockets.some(g => g?.forwarded && g.def.id === 'intensive_care') && (b.life - bb) > (a.life - aa) * 1.35);
    const e = enemy(boost.w, b, 30);
    step(boost.w, 3.5);
    check('Reknit taunts without replacing the golem autonomous attack kit', e.statuses.some(s => s.id === 'taunted') && b.skills.some(s => s?.def.id === 'warding_sweep'));
    boost.w.requestMeta({ t: 'dismissFrame', skillId: boost.host.def.id });
    check('dismissal immediately cancels the held repair channel', boost.p.casting === null && !boost.p.summonToggles.has(boost.host.def.id));
  }
  {
    const t = setup(['keepers_bulwark', 'renewing_frame', 'sheltering_bones', 'adamant_frame']);
    t.host.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    t.host.sockets[1] = { def: SUPPORTS.mending_echoes, level: 1 };
    const a = summon(t);
    t.p.life = t.p.maxLife() * .2;
    t.p.useLock = 0;
    t.w.useSkill(t.p, t.host, t.p.pos, true);
    step(t.w, 1);
    check('mending support creates real restoration streams', t.p.restoreStreams.length > 0);
    if (t.p.casting)
      t.p.casting.held = false;
    step(t.w, .1);
    check('delayed healing earns wards from restoration already delivered', t.p.absorbLayers.size > 0);
    t.p.absorbLayers.clear();
    t.p.restoreStreams = [];
    t.p.fillResources();
    a.life = a.maxLife();
    t.p.useLock = 0;
    t.w.useSkill(t.p, t.host, t.p.pos, true);
    step(t.w, .8);
    check('full-health allies create neither life bills nor free wards', near(a.life, a.maxLife()) && a.frameState!.channelTotal === 0);
  }
  {
    const t = setup(['keepers_bulwark', 'renewing_frame']), a = summon(t);
    a.frameState!.slams = 7;
    t.w.loadZone(t.w.zone.id);
    step(t.w, .1);
    check('zone travel preserves the bound frame and usable repair identity', t.w.actors.includes(a) && a.frameState!.slams === 7 && !!a.hitObservers?.has('frame') && t.w.frameArts.ready(t.p, t.host) && t.w.slotFaceOf(t.p, t.host).id === 'frame_reknit');
  }
  {
    function wave(count: number) {
      const t = setup(['keepers_bulwark', 'close_guard', 'bone_stand', 'warding_reach']), a = summon(t), e = enemy(t.w, a, 120);
      a.sheet.setSource('stable', [mod('critChance', 'override', 0)]);
      e.sheet.setSource('no-armor', [mod('armor', 'override', 0)]);
      const art = a.frameState!.kit.find(s => s.def.id === 'frame_wave')!;
      art.def = { ...art.def, baseDamage: { physical: [20, 20] } };
      for (let i = 0; i < count; i++) {
        const m = t.w.createMonster('skeleton_warrior', 1, 'player');
        m.owner = t.p;
        m.pos = { x: a.pos.x - 30, y: a.pos.y + (i ? 30 : -30) };
        t.w.actors.push(m);
      }
      let hits = 0, total = 0;
      SIM_TAP.current = { onHit: (source, target, r, p) => { if (source === a && target === e && p.sourceName === art.def.name) {
          hits++;
          total += r.total;
        } } };
      t.p.useLock = 0;
      t.w.useMetaSkill(t.p, t.host, { x: a.pos.x + 250, y: a.pos.y });
      for (let i = 0; i < 30; i++)
        t.w.frameArts.update(.05);
      SIM_TAP.current = null;
      return { hits, total };
    }
    const solo = wave(0), company = wave(2);
    check('wedge damage includes worn frame mass and grows with its melee company', solo.total > 0 && company.total > solo.total * 1.1);
    check('overlapping wave positions hit each enemy only once', solo.hits === 1 && company.hits === 1);
  }
  {
    const t = setup(['keepers_bulwark', 'renewing_frame', 'sheltering_bones', 'adamant_frame']), a = summon(t), e = enemy(t.w, a, 400);
    a.life = 0;
    t.w.kill(a, false, e);
    t.w.loadZone(t.w.zone.id);
    step(t.w, .1);
    check('zone travel retires terminal charges without carrying immunity or stale fields', a.dead && !a.invulnerable && !a.frameState!.terminal && !t.w.zones.some(z => z.inst.def.id === 'frame_reliquary') && t.w.pendingRespawns.length === 1);
  }

  {
    const t=setup(['keepers_bulwark','close_guard','bone_stand','warding_reach']),a=summon(t),e=enemy(t.w,a,-80);
    a.facing=0;a.sheet.setSource('directional-wave',[mod('aoeShape','override',4,['attack'])]);
    let hits=0;SIM_TAP.current={onHit:(source,target,_r,p)=>{if(source===a&&target===e&&p.sourceName===SKILLS.frame_wave.name)hits++;}};
    t.p.useLock=0;t.w.useMetaSkill(t.p,t.host,{x:a.pos.x-20,y:a.pos.y});t.w.frameArts.update(.2);SIM_TAP.current=null;
    check('a supported directional wave keeps its heading on the arrival frame',hits===1);
    check('projected payloads preserve their source body facing',near(a.facing,0));
  }
  {
    const t=setup(['keepers_bulwark','renewing_frame']),a=summon(t);a.facing=Math.PI;a.life=a.maxLife()*.5;const before=a.life;
    t.w.executeSkill(t.p,t.w.frameArts.view(t.p,t.host)!,t.p.pos);
    check('repair pulses heal without turning the autonomous frame',a.life>before&&near(a.facing,Math.PI));
  }
}
finally {
  SIM_TAP.current = null;
  restore();
}
if (failed)
  process.exitCode = 1;
