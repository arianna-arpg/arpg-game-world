import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance, instanceDelivery, instanceMods } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { landLifeDamage, applyHit, applyDot } from '../src/engine/damage';
import { hivecallState } from '../src/engine/hivecall';
import { serializeSnapshot } from '../src/net/snapshot';
import type { World } from '../src/engine/world';

bootSimEngine();
let failed = 0;
function check(label: string, ok: boolean, detail = '') { console.log(`${ok ? 'PASS' : 'FAIL'} ${label} ${detail}`); if (!ok) failed++; }
function setup(nodes: string[] = []) {
  const w = makeSimWorld('hivecaller', 0x812), p = w.player;
  p.pos = { x: 650, y: 600 };
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('life', 'override', 1000), mod('lifeRegen', 'override', 0)]);
  p.fillResources();
  const inst = makeSkillInstance(SKILLS.summon_swarmlings, 1, 3); inst.treeNodes = nodes;
  p.skills = [inst]; w.meta.knownSkills.set(inst.def.id, inst);
  w.executeSkill(p, inst, p.pos);
  return { w, p, inst, roster: () => w.minionsOfSkill(p, inst.def.id).filter(a => !a.summonOffspring) };
}
function step(w: World, sec: number) { for (let i = 0; i < Math.ceil(sec * 60); i++) w.update(1 / 60); }
function foe(w: World) {
  const a = w.createMonster('zombie', 1, 'enemy'); a.pos = { x: 660, y: 600 }; a.skills = [];
  a.sheet.setSource('rig', [mod('life', 'override', 100000), mod('lifeRegen', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('areaAvoidance', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
{
  const { w, p, inst, roster } = setup();
  check('baseline births one Swarmling and reserves three slots', roster().length === 1 && p.reservedMana === 21);
  step(w, 3.9); check('no early second birth', roster().length === 1);
  step(w, 0.2); check('first missing body hatches after four seconds', roster().length === 2);
  step(w, 4.1); check('baseline caps at three', roster().length === 3);
  for (const a of roster()) w.kill(a);
  step(w, 3.9); check('wiped swarm waits', roster().length === 0);
  step(w, 0.2); check('wipe recovery produces one, not a batch', roster().length === 1);
  step(w, 8.2); check('serial recovery fills to three', roster().length === 3);
  check('serial contract never accumulates generic respawn timers', !w.pendingRespawns.some(q => q.inst === inst));
  w['dismissSummonToggle'](p, inst.def.id); step(w, 5);
  check('toggle off stops hatching and refunds reservation', roster().length === 0 && p.reservedMana === 0);
  check('Skeleton Warrior baseline is three', instanceDelivery(makeSkillInstance(SKILLS.summon_skeleton)).type === 'summon' && SKILLS.summon_skeleton.delivery.type === 'summon' && SKILLS.summon_skeleton.delivery.maxActive === 3);
}
{
  const { w, p, inst, roster } = setup(['teeming_contract', 'crowded_cells', 'overflowing_cells', 'sacrificial_chitin']);
  step(w, 6.1); check('Crowded Cells fills ten bodies after the wait', roster().length === 10, String(roster().length));
  const victim = roster()[0], survivor = roster()[1]; survivor.life = 1; const plies = survivor.plies;
  w.kill(victim); check('death fully heals and adds a protective ply', survivor.life === survivor.maxLife() && survivor.plies === plies + 1);
  w['bakeMinionOwnerStats'](survivor, p, inst);
  check('death-granted ply survives stat rebake', survivor.plies === plies + 1);
  const target = foe(w); target.pos = { ...victim.pos }; const before = target.life;
  step(w, 0.6); check('death poison pool damages enemies after its caster dies', target.life < before);
  step(w, 4.2); const old = roster().map(a => a.id); const preBlast = target.life;
  check('Sacrificial Chitin meta fires', w.useMetaSkill(p, inst, p.pos));
  check('detonation replaces all bodies immediately at full health', roster().length === 10 && roster().every(a => !old.includes(a.id) && a.life === a.maxLife()));
  check('detonation respects cooldown', !w.useMetaSkill(p, inst, p.pos));
  step(w, 0.1); check('detonation deals area damage', target.life < preBlast);
}
{
  const { w, p, inst, roster } = setup(['teeming_contract', 'scurrying_tide', 'needle_mandibles', 'brood_nourishment']);
  const guard = roster()[0]; const plain = setup(['teeming_contract']).roster()[0];
  check('Royal Guard has multiplicative life, damage, size and speed', guard.maxLife() > plain.maxLife() * 2.9 && guard.radius > plain.radius * 1.4 && guard.sheet.get('damage') > plain.sheet.get('damage') * 1.9 && guard.sheet.get('attackSpeed') > plain.sheet.get('attackSpeed') * 1.3);
  check('Guard kit has melee impale and ranged poison', guard.sheet.get('impalePower', new Set(['melee'])) === 0.2 && guard.sheet.get('impalePower', new Set(['projectile'])) === 0 && guard.skills.some(s => s?.def.id === 'hive_poison_spit'));
  step(w, 9.9); check('guards do not hatch offspring at birth', !w.minionsOfSkill(p, inst.def.id).some(a => a.summonOffspring));
  step(w, 0.3); const children = w.minionsOfSkill(p, inst.def.id).filter(a => a.summonOffspring);
  check('guard hatches two ordinary temporary children after ten seconds', children.length === 2 && children.every(a => a.defId === 'swarmling' && a.maxLife() < guard.maxLife() / 2 && !a.skills.some(s => s?.def.id === 'hive_poison_spit')));
  check('maximum investment is halved with rounding, never fixed at two', roster().length === 3);
  step(w, Math.max(...children.map(a => a.lifespan ?? 8)) + 0.1); check('first brood expires', children.every(a => a.dead), JSON.stringify(children.map(a => ({life:a.lifespan,dead:a.dead}))));
}
{
  const { w, p, inst, roster } = setup(['royal_guard', 'royal_carapace', 'barbed_regents', 'royal_ferocity', 'crushing_mandibles', 'regal_execution']);
  step(w, 8.2); for (const a of roster()) w.kill(a);
  check('base deaths accumulate Sovereignty', hivecallState(inst).meter === 60);
  check('Enrage transforms with accumulated resource', w.useMetaSkill(p, inst, p.pos));
  const form = w.player;
  check('form has independent health and consumed meter', form !== p && w.localSeat.home === p && form.maxLife() === 1500 && hivecallState(inst).meter === 0 && Math.abs(form.hiveForm!.remaining - 10.8) < 0.01);
  check('form has three abilities plus return slot', form.skills.filter(Boolean).length === 4 && form.skills.some(s => s?.def.id === 'hive_royal_cataclysm'));
  check('Crushing Mandibles modifies only base skills', instanceMods(form.skills[0]!).some(m => m.stat === 'damage' && m.kind === 'more' && m.value === 1) && !instanceMods(form.skills[2]!).some(m => m.stat === 'damage' && m.value === 1));
  check('Perpetual Reign immediately hatches two missing bodies', roster().length === 2);
  const time = form.hiveForm!.remaining; w.kill(roster()[0]);
  check('Perpetual Reign deaths extend the active form', form.hiveForm!.remaining > time + 3.5);
  step(w, 0.1);
  check('carried caster keeps the paid contract', p.reservedMana === 21 && p.summonToggles.has(inst.def.id));
  const shield = roster()[0]; shield.pos = { ...form.pos }; shield.sheet.setSource('rig', [mod('life', 'override', 1000)]); shield.fillResources();
  const life = form.life; landLifeDamage(form, 100);
  check('aura distributes sixty percent to nearby Swarmlings', Math.abs(form.life - (life - 40)) < 0.01 && shield.life === 940);
  check('damage within aura enrages the victim', form.buffs.has('hivecall_fury'));
  check('shared wounds also enrage the protecting Swarmling', shield.buffs.has('hivecall_fury'));
  const otherStory = w.createMonster('swarmling', 1, 'player', p); otherStory.pos = { ...form.pos }; otherStory.tier = form.tier + 1; w.actors.push(otherStory);
  step(w, 0.1); landLifeDamage(otherStory, 1); check('aura does not cross stories', !otherStory.buffs.has('hivecall_fury'));
  check('HUD travels in snapshots', JSON.stringify(serializeSnapshot(w, 1)).includes('"hive"'));
  check('return action exits voluntarily', w.useMetaSkill(form, inst, form.pos) && w.player === p && !p.dead);
  check('Crown of Ruin stamps a two-second cooldown', p.cooldowns.get('enrage_swarm') === 2);
  hivecallState(inst).meter = 100; check('manual transformation cannot bypass cooldown', !w.useMetaSkill(p, inst, p.pos));
  step(w, 2.1); w.useMetaSkill(p, inst, p.pos); const doomed = w.player;
  landLifeDamage(doomed, 100000); w.kill(doomed);
  check('form death restores living base body and empties resource', w.player === p && !p.dead && hivecallState(inst).meter === 0);
}
{
  const { w, p, inst } = setup(['royal_guard', 'royal_carapace', 'knitted_regents']); step(w, 0.1);
  const target = foe(w);
  hivecallState(inst).meter = 20; p.life = 100;
  landLifeDamage(p, 100); check('exactly twenty does not trigger emergency form', w.player === p && p.life === 0);
  p.life = 100; hivecallState(inst).meter = 100;
  applyHit(target, p, { amounts: { chaos: 100000 }, tags: new Set(['spell']), crit: false, sourceName: 'rescue rig' });
  const first = w.player;
  check('real lethal hit triggers rescue and leaves home alive', first !== p && p.life === 1 && first.hiveForm?.automatic === true);
  check('first rescue grants full duration and form health', first.hiveForm?.remaining === 18 && first.maxLife() === 1500);
  w.useMetaSkill(first, inst, first.pos); check('automatic return heals forty percent', p.life === 401);
  hivecallState(inst).meter = 100; step(w, 0.1); landLifeDamage(p, 100000);
  const second = w.player; check('successive rescue halves duration and life, bypassing manual cooldown', second !== p && second.hiveForm?.remaining === 9 && second.maxLife() === 750);
  w.useMetaSkill(second, inst, second.pos); check('successive rescue halves recovery', p.life === 201);
  step(w, 20.1); hivecallState(inst).meter = 100; landLifeDamage(p, 100000);
  check('diminishing returns clear after twenty quiet seconds', w.player.hiveForm?.factor === 1);
  w.useMetaSkill(w.player, inst, w.player.pos); step(w, 0.1); hivecallState(inst).meter = 100; p.life = 1;
  applyDot(p, 1000, 'chaos');
  check('lethal damage over time also triggers rescue', w.player !== p && !p.dead);
}
{
  const { w, p, inst } = setup(['royal_guard']); step(w, 0.1);
  hivecallState(inst).meter = 20; w.useMetaSkill(p, inst, p.pos); step(w, 3.7);
  check('form expires at resource-derived duration', w.player === p && !p.dead);
  step(w, 4.1); hivecallState(inst).meter = 100; w.useMetaSkill(p, inst, p.pos);
  p.skills = []; step(w, 0.1); check('unequipping host ejects the form safely', w.player === p && !p.dead);
}
for (const ranks of [1, 4]) {
  const { w, p, inst, roster } = setup(['royal_guard', ...Array(ranks).fill('hive_tending')]);
  const baseDamage = p.sheet.get('damage');
  step(w, 4 * (2 + ranks) + 0.3);
  check(`Hive Tending rank ${ranks} funds and fills an extra slot per point`, roster().length === 3 + ranks && p.reservedMana === 7 * (3 + ranks));
  const mods = instanceMods(inst);
  check(`Hive Tending rank ${ranks} retains life and damage`, Math.abs(mods.filter(m => m.stat === 'minionLife').reduce((sum, m) => sum + m.value, 0) - 0.15 * ranks) < 0.001
    && Math.abs(mods.filter(m => m.stat === 'minionDamage').reduce((sum, m) => sum + m.value, 0) - 0.15 * ranks) < 0.001);
  hivecallState(inst).meter = 100; w.useMetaSkill(p, inst, p.pos);
  const form = w.player, damage = form.sheet.get('damage');
  form.sheet.removeSource('hivecall:tending');
  check(`Hive Tending rank ${ranks} increases actual form damage`, damage > form.sheet.get('damage'));
  step(w, 0.1);
  check('form bonus resynchronizes without stacking', form.sheet.get('damage') === damage);
  inst.treeNodes = ['royal_guard']; step(w, 0.1);
  check('removing tending removes its form bonus', form.sheet.get('damage') < damage);
  w.useMetaSkill(form, inst, form.pos);
  check('Sovereign damage never leaks onto the normal hero', p.sheet.get('damage') === baseDamage);
}
{
  const { w, p, roster } = setup(['teeming_contract', 'scurrying_tide', ...Array(4).fill('hive_tending')]);
  step(w, 17);
  check('Hive Tending capacity scales through Royal Guard count reduction', roster().length === 5 && p.reservedMana === 35);
  check('army branch receives no Sovereign damage', !roster().some(a => a.sheet.getSourceMods('hivecall:tending')) && !p.sheet.getSourceMods('hivecall:tending'));
}
console.log(`Hivecall: ${failed} failed`);
process.exitCode = failed ? 1 : 0;
