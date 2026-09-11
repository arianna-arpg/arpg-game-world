import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { NECROMANCER_SACRAMENTS } from '../src/data/necromancerSacraments';
import { makeSkillInstance, instanceDelivery, instanceBaseTags, instanceMods, skillContextTags, treeNodeRefusal, type SkillInstance } from '../src/engine/skills';
import { replenishmentActive } from '../src/engine/replenishment';
import { costWard } from '../src/engine/costward';
import { previewSkill } from '../src/engine/skillPreview';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import { mod } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { updateAI } from '../src/engine/ai';
import type { World } from '../src/engine/world';
let failed = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
function setup(id: string, nodes: string[] = []) {
  const w = makeSimWorld('necromancer', 0xb100d), p = w.player;
  for (const attr of ['willpower', 'intelligence', 'strength'] as const) w.meta.baseAttrs[attr] = 100;
  w.recalcPlayer(); const inst = makeSkillInstance(SKILLS[id], 20, 3);
  w.meta.knownSkills.set(id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const n of nodes) w.pickTreeNode(id, n);
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('accuracy', 'flat', 100000), mod('lifeRegen', 'override', 0)]);
  p.fillResources(); return { w, p, inst };
}
function step(w: World, seconds: number, minds = false) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) { if (minds) for (const a of [...w.actors]) if (a.owner) updateAI(a, w, 1 / 60); w.update(1 / 60); }
}
function input(w: World, edge: boolean, held = true, dx = 0) {
  w.applyInputs(new Map([[w.localSeat.id, { dx, dy: 0, aim: { x: w.player.pos.x + 75, y: w.player.pos.y }, held: [held], edge: [edge] }]]), 1 / 60);
}
function cast(w: World, inst: SkillInstance) {
  const p = w.player; p.casting = null; p.useLock = 0; p.cooldowns.clear();
  const ok = w.useSkill(p, inst, { x: p.pos.x + 75, y: p.pos.y }, true);
  for (let i = 0; i < 150 && p.casting; i++) step(w, 1 / 60);
  return ok;
}
function foe(w: World, x = 75) {
  const a = w.createMonster('zombie', 1, 'enemy'); a.skills = []; a.pos = { x: w.player.pos.x + x, y: w.player.pos.y };
  a.sheet.setSource('rig', [mod('life', 'flat', 100000), mod('moveSpeed', 'override', 0)]); a.fillResources(); w.actors.push(a); return a;
}
function corpses(w: World, count = 1) {
  for (let i = 0; i < count; i++) w.corpses.push({ pos: { x: w.player.pos.x + 75 + i, y: w.player.pos.y }, defId: 'zombie', level: 1, maxLife: 100, remaining: 60, tier: w.player.tier });
}
function channel(w: World, seconds: number, move = false) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) { input(w, i === 0, true, move ? (Math.floor(i / 60) % 2 ? -1 : 1) : 0); step(w, 1 / 60, true); }
  input(w, false, false); step(w, 1 / 60);
}
const restore = seedGlobalRandom(0xb100d);
try {
  for (const [id, tree] of Object.entries(NECROMANCER_SACRAMENTS)) {
    const nodes = tree.nodes!, roots = nodes.filter(n => n.excludes?.length), neutral = nodes.find(n => !n.links?.length && !n.excludes?.length)!;
    const plain = setup(id), passive = setup(id, Array(4).fill(neutral.id)), m = neutral.mods![0];
    check(id + ': four neutral ranks keep the base form and tags', passive.inst.treeNodes?.length === 4 && instanceDelivery(passive.inst) === plain.inst.def.delivery && instanceBaseTags(passive.inst).join() === instanceBaseTags(plain.inst).join());
    check(id + ': neutral ranks really strengthen the skill', passive.p.sheet.get(m.stat, skillContextTags(passive.inst), instanceMods(passive.inst)) > plain.p.sheet.get(m.stat, skillContextTags(plain.inst), instanceMods(plain.inst)));
    check(id + ': binary tree has 15 nodes and two exclusive trunks', nodes.length === 15 && roots.length === 2 && roots.every(r => nodes.filter(n => n.links?.includes(r.id)).length === 2));
    for (const root of roots) {
      const mids = nodes.filter(n => n.links?.includes(root.id)), s = setup(id, [root.id, ...mids.map(n => n.id), neutral.id]);
      check(id + '/' + root.id + ': both forks and neutral mix while rival locks', s.inst.treeNodes?.length === 4 && !!treeNodeRefusal(s.inst, root.excludes![0]));
    }
    for (const leaf of nodes.filter(n => n.links?.length && !nodes.some(other => other.links?.includes(n.id)))) {
      const mid = nodes.find(n => n.id === leaf.links![0])!, s = setup(id, [mid.links![0], mid.id, leaf.id]), a = foe(s.w);
      if (id === 'corpse_explosion') corpses(s.w, 3);
      if (id === 'spirit_pyre') channel(s.w, 2); else cast(s.w, s.inst);
      step(s.w, 0.6, true);
      check(id + '/' + leaf.id + ': live route lands damage', a.life < a.maxLife());
      const loaded = rebuildSkill({ skillId: id, level: 20, rarity: 'common', sockets: [], treeNodes: s.inst.treeNodes });
      check(id + '/' + leaf.id + ': save rebuild preserves the route', loaded?.treeNodes?.join() === s.inst.treeNodes?.join());
    }
  }
  for (const root of ['running_wildfire', 'banked_pyre']) {
    const { w, p, inst } = setup('spirit_pyre', [root]);
    for (let i = 0; i < 240; i++) { input(w, i === 0); step(w, 1 / 60); }
    const before = p.pos.x; input(w, false, true, 1);
    check(root + ': resolved channel stride changes actual movement', root === 'banked_pyre' ? near(p.pos.x, before) : p.pos.x > before);
    const bodies = w.minionsOfSkill(p, inst.def.id);
    check(root + ': real channel births respect the shared spirit cap', bodies.length > 0 && bodies.length <= (root === 'banked_pyre' ? 8 : 20) && bodies.every(a => a.sourcePoolGroup === 'raging_spirit'));
    input(w, false, false); step(w, 1 / 60);
  }
  {
    const { w, p, inst } = setup('sanguine_burst', ['hemorrhagic_rite', 'deep_veins', 'bursting_veins', 'red_circulation']);
    const a = foe(w); cast(w, inst); const bleed = a.statuses.find(s => s.id === 'bleed');
    check('hemorrhagic bleed carries rupture, leech and its original caster', !!bleed && bleed.casterId === p.id && !!bleed.propagates && !!bleed.rupture && bleed.leech === 0.04);
    const life = p.life; step(w, 0.5); check('hemorrhagic bleed repays its caster over time', p.life > life);
    const next = foe(w, 80); w.kill(a, false, p); step(w, 0.05);
    check('hemorrhagic death spreads the attributed bleeding chain', next.statuses.some(s => s.id === 'bleed' && s.casterId === p.id && s.propagates && s.leech === 0.04));
  }
  {
    const { w, p, inst } = setup('shambler_horde', ['wandering_dead']); let casts = 0;
    SIM_TAP.current = { onCast: () => casts++ }; step(w, 3.1);
    const bodies = w.minionsOfSkill(p, inst.def.id), ids = bodies.map(a => a.id).join(), mana = p.mana;
    check('passive replenishment remains unavailable to AI cast selection', !p.canUse(inst) && !w.pressUsable(p, inst));
    w.metaDirty.clear(); input(w, true);
    check('horde starts on and a deliberate press pauses births', bodies.length === 1 && !replenishmentActive(inst) && !!inst.replenishmentPaused);
    check('toggle publishes the owning seat metadata', w.metaDirty.has(w.localSeat.id));
    for (let i = 0; i < 240; i++) { input(w, false); step(w, 1 / 60); }
    check('holding the button does not flip repeatedly; existing corpses remain', !!inst.replenishmentPaused && w.minionsOfSkill(p, inst.def.id).map(a => a.id).join() === ids);
    check('toggle spends no resource, starts no cast and triggers no cast event', p.mana >= mana && !p.casting && casts === 0);
    const saved = serializeCharacter(w).knownSkills.find(s => s.skillId === inst.def.id)!;
    check('paused preference survives character saving and rebuild', saved.replenishmentPaused === true && rebuildSkill(saved)?.replenishmentPaused === true);
    const wire = serializeSeatMeta(w.localSeat); check('paused preference travels on wire', wire.known[inst.def.id].rp === 1);
    const other = setup('shambler_horde'); applySeatMeta(other.w, other.w.localSeat, wire);
    check('client rebuild remains paused', other.w.meta.knownSkills.get(inst.def.id)?.replenishmentPaused === true);
    check('stale paused flag is discarded for an unmutated skill', !rebuildSkill({ ...saved, treeNodes: undefined })?.replenishmentPaused);
    input(w, true); step(w, 2.8); check('resuming starts a fresh birth interval', replenishmentActive(inst) && w.minionsOfSkill(p, inst.def.id).length === 1);
    step(w, 0.3); check('resumed births use the normal clock', w.minionsOfSkill(p, inst.def.id).length === 2);
    check('AI and free execution cannot toggle or force births', !w.useSkill(p, inst, p.pos) && !w.executeSkill(p, inst, p.pos) && replenishmentActive(inst));
    input(w, true); p.skills[0] = null; step(w, 4); p.skills[0] = inst; step(w, 4);
    check('paused preference survives reseating', !!inst.replenishmentPaused && w.minionsOfSkill(p, inst.def.id).length === 0);
    w.fonts.push({ pos: { ...p.pos } }); w.meta.abilityEssences.ability4 = 999;
    check('respec clears the paused preference', w.fontResetTree(inst.def.id) && !inst.replenishmentPaused && !inst.treeNodes);
    SIM_TAP.current = null;
  }
  {
    const { w, p, inst } = setup('sanguine_burst', ['crimson_carapace', 'clotted_layers', 'thick_carapace']);
    const cost = p.skillCost(inst), expected = costWard(p, inst, cost), before = p.life;
    check('blood cast pays life and immediately grants its capped shield', w.useSkill(p, inst, p.pos, true) && near(p.life, before - cost.life) && near(p.absorb, expected.amount) && near(p.absorbTimer, expected.duration));
    check('preview shares the actual payment shield resolver', previewSkill(p, inst).rows.some(r => r.key === 'costWard' && r.value.startsWith(String(Math.round(expected.amount)))));
    p.casting = null; p.useLock = 0; p.cooldowns.clear(); p.life = before;
    w.useSkill(p, inst, p.pos, true); check('repeated payments refresh without adding pools', near(p.absorb, expected.amount));
    p.casting = null; p.absorb = 0; p.absorbTimer = 0; w.executeSkill(p, inst, p.pos);
    check('unpaid execution cannot generate a shield', p.absorb === 0);
    p.useLock = 0; p.cooldowns.clear(); w.useSkill(p, inst, p.pos, true); p.casting = null;
    const shield = p.absorb, life = p.life, enemy = foe(w, 25);
    w.executeSkill(enemy, makeSkillInstance({ ...SKILLS.sanguine_burst, baseDamage: { physical: [1, 1] }, effects: [{ type: 'damage' }], innateMods: [] }, 1), p.pos);
    check('payment shield absorbs a real enemy hit before life', p.absorb < shield && near(p.life, life));
    step(w, expected.duration + 0.2); check('unused payment shield expires', p.absorb === 0);
    const capInst = makeSkillInstance({ ...SKILLS.sanguine_burst, innateMods: [mod('costWard_life', 'flat', 999)] });
    check('oversized payment reward obeys the maximum-life cap', near(costWard(p, capInst, { mana: 0, life: 999 }).amount, p.maxLife() * 0.3));
  }
  {
    const { w, p, inst } = setup('spirit_pyre', ['banked_pyre', 'sheltered_flame']);
    let bills = 0, paid = 0; const pay = p.payCost.bind(p);
    p.payCost = cost => { bills++; paid += cost.mana; pay(cost); };
    channel(w, 2);
    check('held channel awards shielding on real pulse payments', bills >= 4 && paid >= 20 && near(p.absorb, p.skillCost(inst).mana * 4) && p.absorbTimer > 4.5);
    check('larger fire skulls use the intended shared pool and body', w.minionsOfSkill(p, inst.def.id).every(a => a.defId === 'court_ember' && a.radius >= 12));
    step(w, costWard(p, inst, p.skillCost(inst)).duration + 0.2); check('releasing the channel lets payment shields expire', p.absorb === 0);
  }
  {
    // Exercise the shared payment seam directly for alternate resource/debt lanes.
    const { w, p, inst } = setup('sanguine_burst', ['crimson_carapace']);
    const bill = (cost: { mana: number; life: number }) => (w as unknown as { paySkillCost: (a: typeof p, i: SkillInstance, c: typeof cost) => void }).paySkillCost(p, inst, cost);
    p.sheet.setSource('ward', [mod('costWard_mana', 'flat', 2), mod('esToMana', 'override', 1)]);
    p.mana = 3; p.es = 100; bill({ mana: 10, life: 0 });
    check('ES substitution earns only the actual mana portion', near(p.absorb, 6) && near(p.es, 93));
    p.absorb = 0; p.absorbTimer = 0; p.overdrive.life = { inst: makeSkillInstance(SKILLS.blood_mortgage), debt: 0, idle: 0 }; p.life = 1;
    bill({ mana: 0, life: 5 }); check('borrowed life cannot mint a payment shield', p.absorb === 0 && p.overdrive.life.debt === 5);
    p.overdrive.life = undefined; p.life = p.maxLife();
    p.sheet.setSource('converted', [mod('costToMana', 'override', 1)]); const cost = p.skillCost(inst); p.mana = 10000;
    bill(cost); check('converted life cost awards through the mana lane', cost.life === 0 && near(p.absorb, cost.mana * 2));
    p.absorb = 0; p.construct = { kind: 'totem', range: 100, timer: 0 };
    bill({ mana: 10, life: 0 }); check('synthetic construct payments cannot mint shields', p.absorb === 0);
    p.construct = undefined; p.mana = 2; p.es = 0;
    p.overdrive.mana = { inst: makeSkillInstance(SKILLS.overclock), debt: 0, idle: 0 };
    bill({ mana: 10, life: 0 }); check('borrowed mana earns only its paid portion', near(p.absorb, 4) && p.overdrive.mana.debt === 8);
  }
  {
    const { w, p, inst } = setup('corpse_explosion', ['funeral_pyre', 'spreading_ashes', 'long_cremation']); const a = foe(w); corpses(w); cast(w, inst);
    const z = w.zones.find(z => z.inst === inst && z.caster === p), life = a.life;
    check('funeral pyre leaves its actual configured field', !!z && near(z.radius, 104) && z.linger > 4.3 && z.tickInterval === 0.5 && z.dmgMult === 0.4);
    step(w, 1.1); check('funeral field continues damaging after the blast', a.life < life);
    w.fonts.push({ pos: { ...p.pos } }); w.meta.abilityEssences.ability4 = 999;
    check('respec removes the old funeral field', w.fontResetTree(inst.def.id) && !w.zones.some(z => z.inst === inst));
  }
  {
    const { w, p, inst } = setup('corpse_explosion', ['living_offerings', 'ritual_pace', 'crawling_remains', 'heaped_offerings']);
    const victims = Array.from({ length: 3 }, () => { const a = w.createMonster('zombie', 1, 'player', p); a.pos = { x: p.pos.x + 75, y: p.pos.y }; w.actors.push(a); return a; });
    let deaths = 0; SIM_TAP.current = { onDeath: a => { if (victims.includes(a)) deaths++; } };
    foe(w); cast(w, inst); SIM_TAP.current = null;
    const crawlers = w.minionsOfSkill(p, '__hive:corpse_explosion');
    check('living offerings consumes three real minions with death events', victims.every(a => a.dead) && deaths === 3);
    check('each consumed body supplies one bounded crawler', crawlers.length === 3 && crawlers.every(a => a.defId === 'zombie_crawler' && a.lifespan > 11));
  }
} finally { restore(); SIM_TAP.current = null; }
if (failed) process.exitCode = 1;
console.log(`Necromancer sacraments: ${failed} failures`);
