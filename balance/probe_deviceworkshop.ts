import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { makeSkillInstance, instanceDelivery, instanceMetas, supportFitsInst, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import type { World } from '../src/engine/world';
import { CLASS_BUNDLES } from '../src/meta/unlocks';
let passed = 0, failed = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); ok ? passed++ : failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
const json = (v: unknown) => JSON.stringify(v);
const step = (w: World, sec: number) => { for (let i = 0; i < Math.ceil(sec * 60); i++) w.update(1 / 60); };
function setup(id = 'flame_totem', supported = true) {
  const w = makeSimWorld('trapper', 0x902), p = w.player;
  for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
  w.recalcPlayer();
  const inst = makeSkillInstance(SKILLS[id], 20, 3);
  if (supported) inst.sockets[0] = { def: SUPPORTS.packed_workshop, level: 1 };
  w.meta.knownSkills.set(id, inst); p.skills.fill(null); p.skills[0] = inst;
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('manaRegen', 'override', 0)]); p.fillResources();
  return { w, p, inst };
}
function deploy(s: ReturnType<typeof setup>, inst = s.inst) {
  s.p.useLock = 0; s.p.cooldowns.clear(); s.p.casting = null;
  const used = s.w.useSkill(s.p, inst, { x: s.p.pos.x + 70, y: s.p.pos.y }, true);
  for (let i = 0; i < 180 && s.p.casting; i++) step(s.w, 1 / 60);
  if (!used) throw Error('deployment refused: ' + inst.def.id);
  return s.w.actors.filter(a => !a.dead && a.summonInst === inst).at(-1)!;
}
function ready(s: ReturnType<typeof setup>) { s.p.useLock = 0; s.p.casting = null; s.p.cooldowns.delete('relocate_workshop'); }
function move(s: ReturnType<typeof setup>, host: SkillInstance = s.inst) {
  return s.w.useMetaSkill(s.p, host, { x: s.p.pos.x, y: s.p.pos.y + 500 });
}
const restore = seedGlobalRandom(0x902);
try {
  check('Trapper bundle makes Packed Workshop obtainable', CLASS_BUNDLES.find(b => b.classId === 'trapper')!.supportIds!.includes('packed_workshop'));
  const eligible: string[] = [], mismatches: string[] = [];
  for (const [id, def] of Object.entries(SKILLS).filter(([, d]) => !d.noDrop)) {
    const inst = makeSkillInstance(def), d = instanceDelivery(inst);
    const fits = d.type === 'construct' && ['totem', 'sentry'].includes(d.kind) && !!d.castSkillId;
    if (supportFitsInst(SUPPORTS.packed_workshop, inst) !== fits) mismatches.push(id);
    if (fits) eligible.push(id);
  }
  check('whole-catalog gate admits exactly native aimed totems and sentries', eligible.length > 0 && !mismatches.length);
  for (const id of eligible) {
    const s = setup(id), plain = setup(id, false), c = deploy(s), bare = deploy(plain);
    check(id + ': supported real deployment lasts exactly 15% less time', near(c.lifespan! + 1 / 60, (bare.lifespan! + 1 / 60) * 0.85));
    c.life = c.maxLife() * 0.37; c.construct!.timer = 0.33; c.construct!.fxAt = s.w.time + 0.45;
    c.cooldowns.set('probe_clock', 2.4); c.useLock = 0.25;
    const original = { life: c.life, lifespan: c.lifespan, construct: c.construct, payload: c.construct!.castInst, cooldowns: json([...c.cooldowns]), useLock: c.useLock };
    const origin = { ...s.p.pos }, roster = [...s.w.actors];
    ready(s); const mana = s.p.mana;
    check(id + ': Shift action successfully repositions the device', move(s) && c.pos.y > origin.y + 50 && near(c.pos.x, origin.x));
    const d = instanceDelivery(s.inst);
    check(id + ': destination clamps to native placement reach and faces the new lane', d.type === 'construct' && near(c.pos.y - origin.y, d.placeRange ?? 100) && near(c.facing, Math.PI / 2));
    check(id + ': actor identity, health, life remaining, payload and clocks are preserved', original.life === c.life && original.lifespan === c.lifespan && original.construct === c.construct && original.payload === c.construct!.castInst && original.cooldowns === json([...c.cooldowns]) && c.useLock === original.useLock && c.construct!.timer === 0.33 && c.construct!.fxAt === s.w.time + 0.45 && roster.length === s.w.actors.length && roster.every((a, i) => a === s.w.actors[i]));
    check(id + ': movement spends its own real mana cost and cooldown', s.p.mana < mana && s.p.cooldowns.get('relocate_workshop')! > 0);
    const after = s.p.mana, pos = json(c.pos);
    check(id + ': immediate repeat refuses without another payment or movement', !move(s) && s.p.mana === after && json(c.pos) === pos);
    ready(s); s.p.mana = 0;
    check(id + ': unaffordable relocation refuses without touching the device', !move(s) && json(c.pos) === pos);
  }
  {
    const s = setup(), c = deploy(s), second = makeSkillInstance(SKILLS.flame_totem, 20, 3);
    second.sockets[0] = { def: SUPPORTS.packed_workshop, level: 1 }; s.p.skills[1] = second;
    const other = deploy(s, second); c.pos = { x: s.p.pos.x + 50, y: s.p.pos.y }; other.pos = { x: s.p.pos.x + 10, y: s.p.pos.y };
    const otherPos = json(other.pos); ready(s); move(s);
    check('a nearer device from another instance of the same skill is untouched', json(other.pos) === otherPos && c.pos.y > s.p.pos.y + 50);
    ready(s); const ownPos = json(c.pos); move(s, second);
    check('cached meta changes host identity when the second same-skill instance acts', json(c.pos) === ownPos && other.pos.y > s.p.pos.y + 50);
    const foreignCaster = s.w.createMonster('zombie', 1, 'player'); foreignCaster.pos = { ...s.p.pos }; s.w.actors.push(foreignCaster);
    const d = instanceDelivery(s.inst); if (d.type !== 'construct') throw Error('not a device');
    const foreign = s.w.spawnConstruct(foreignCaster, s.inst, d, s.p.pos)!;
    c.dead = true; other.dead = true; ready(s); const mana = s.p.mana;
    check('same-team device with a different owner cannot satisfy relocation', !move(s) && s.p.mana === mana && !foreign.dead && json(foreign.pos) === json(s.p.pos));
  }
  for (const reason of ['dead', 'expired', 'other-story', 'out-of-range', 'downed', 'removed', 'unsocketed', 'unseated'] as const) {
    const s = setup(), c = deploy(s); ready(s);
    if (reason === 'dead') c.dead = true;
    if (reason === 'expired') c.lifespan = 0;
    if (reason === 'other-story') c.tier = s.p.tier + 1;
    if (reason === 'out-of-range') c.pos.x = s.p.pos.x + 601;
    if (reason === 'downed') c.downed = true;
    if (reason === 'removed') s.w.actors = s.w.actors.filter(a => a !== c);
    if (reason === 'unsocketed') s.inst.sockets[0] = null;
    if (reason === 'unseated') s.p.skills[0] = null;
    const mana = s.p.mana, pos = json(c.pos);
    check(reason + ': no eligible device means no payment, cooldown or movement', !move(s) && mana === s.p.mana && json(c.pos) === pos && !s.p.cooldowns.has('relocate_workshop'));
  }
  {
    const s = setup(), c = deploy(s); ready(s);
    const standalone = makeSkillInstance(SKILLS.relocate_workshop); const mana = s.p.mana;
    check('unhosted direct casts cannot control a device or spend mana', !s.w.useSkill(s.p, standalone, s.p.pos, true) && mana === s.p.mana);
    const payload = c.construct!.castInst!;
    c.useLock = 0; c.cooldowns.clear(); s.w.useSkill(c, payload, { x: c.pos.x + 200, y: c.pos.y });
    const casting = !!c.casting, clocks = json([...c.cooldowns]);
    check('real device cast starts before relocation', casting);
    move(s);
    check('relocation cancels that cast while preserving its paid cooldown clocks', !c.casting && clocks === json([...c.cooldowns]));
  }
  {
    const s = setup(), c = deploy(s); c.lifespan = 0.4; ready(s); move(s);
    step(s.w, 0.6);
    check('moved device still expires at its original remaining lifetime', c.dead);
    ready(s); const mana = s.p.mana;
    check('an expired device cannot be moved again or refunded', !move(s) && mana === s.p.mana);
  }
  {
    const s = setup('ballista_sentry'); s.w.pickTreeNode('ballista_sentry', 'broadside_battery');
    const c = deploy(s); ready(s); move(s);
    const enemy = s.w.createMonster('zombie', 1, 'enemy'); enemy.pos = { x: c.pos.x, y: c.pos.y + 140 }; enemy.skills = [];
    enemy.sheet.setSource('rig', [mod('life', 'flat', 10000), mod('evasion', 'override', 0), mod('moveSpeed', 'override', 0), mod('lifeRegen', 'override', 0)]); enemy.fillResources(); s.w.actors.push(enemy);
    const payload = c.construct!.castInst; step(s.w, 2);
    check('a repositioned tree-invested sentry fires its existing payload down the new lane', enemy.life < enemy.maxLife() && c.construct!.castInst === payload && s.inst.treeNodes?.[0] === 'broadside_battery');
  }
  {
    const s = setup(), c = deploy(s); c.construct!.deathBurst = { radius: 300, fraction: 1 }; c.explodeOnDeath = 1;
    const enemy = s.w.createMonster('zombie', 1, 'enemy'); enemy.pos = { ...s.p.pos }; s.w.actors.push(enemy); const life = enemy.life;
    ready(s); const mana = s.p.mana; move(s);
    check('relocation awards neither a death burst nor any resource refund', !c.dead && !c.construct!.burstFired && enemy.life === life && s.p.mana < mana);
  }
  {
    const s = setup('ballista_sentry'), c = deploy(s), other = deploy(s); c.pos.x += 200;
    ready(s); const cPos = json(c.pos); move(s);
    check('one press moves only the nearest eligible device', json(c.pos) === cPos && other.pos.y > s.p.pos.y + 50);
    const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === s.inst.def.id)!)!;
    check('save reconstruction restores the support and meta grant', instanceMetas(saved).some(m => m.skillId === 'relocate_workshop'));
    const net = setup('ballista_sentry', false); applySeatMeta(net.w, net.w.localSeat, serializeSeatMeta(s.w.localSeat));
    net.inst = net.w.meta.knownSkills.get('ballista_sentry')!;
    const rebuilt = deploy(net); ready(net);
    check('network reconstruction can deploy and reposition its own new device', move(net) && rebuilt.pos.y > net.p.pos.y + 50);
    s.inst.treeNodes = [s.inst.def.tree!.nodes!.find(n => n.excludes?.length)!.id];
    s.w.fonts.push({ pos: { ...s.p.pos } }); s.w.meta.abilityEssences.ability4 = 999;
    const reset = s.w.fontResetTree(s.inst.def.id); ready(s);
    check('respec retires relocated devices from that instance and blocks further movement', reset && c.dead && other.dead && !move(s));
  }
} finally { restore(); }
console.log(`Packed Workshop: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
