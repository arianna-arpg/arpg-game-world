import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance, skillCooldownSeconds } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { landLifeDamage, applyHit } from '../src/engine/damage';
import { assaultOrbitPositions } from '../src/engine/assault';
import { serializeSnapshot } from '../src/net/snapshot';

bootSimEngine();
let failed = 0;
function check(label: string, ok: boolean) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
const near = (a: number, b: number) => Math.abs(a - b) < 0.001;
function setup(nodes: string[]) {
  const w = makeSimWorld('hivecaller', 412), p = w.player;
  p.pos = { x: 650, y: 600 };
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('life', 'override', 10000), mod('lifeRegen', 'override', 0)]); p.fillResources();
  const host = makeSkillInstance(SKILLS.command_assault, 1, 3); host.treeNodes = nodes;
  p.skills = [host]; w.meta.knownSkills.set(host.def.id, host);
  const body = (enemy = false) => {
    const a = w.createMonster('swarmling', 1, enemy ? 'enemy' : 'player');
    a.pos = { x: 680, y: 600 }; a.skills = [];
    if (!enemy) a.owner = p;
    a.sheet.setSource('rig', [mod('life', 'override', 10000), mod('lifeRegen', 'flat', 0), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('critChance', 'override', 0), mod('resist_fire', 'override', 0), mod('resist_cold', 'override', 0), mod('resist_chaos', 'override', 0)]);
    a.fillResources(); w.actors.push(a); return a;
  };
  const m = body(), t = body(true);
  const hit = (type: 'fire' | 'cold' | 'physical' = 'fire') => makeSkillInstance({ id: 'assault_probe_' + type, name: 'Probe Strike', description: '', tags: ['attack', 'melee', type], color: '#fff', manaCost: 0, cooldown: 0, useTime: 0.5, baseDamage: { [type]: [100, 100] }, delivery: { type: 'melee', range: 50, arcDeg: 180 }, effects: [{ type: 'damage' }] });
  const cast = () => { p.cooldowns.clear(); p.useLock = 0; w.executeSkill(p, host, t.pos); };
  const strike = (type: 'fire' | 'cold' | 'physical' = 'fire') => w['resolveHit'](m, hit(type), t, 1, 0);
  const tick = (seconds: number) => { w.time += seconds; w.assaults.update(seconds); };
  w.assaults.update(0);
  return { w, p, host, body, m, t, hit, cast, strike, tick };
}
{
  const { w, p, host, m, t, cast, strike } = setup(['killing_signal', 'sure_signal', 'clear_orders', 'clear_orders']);
  check('base cooldown is eight seconds', host.def.cooldown === 8);
  check('Clear Orders recovery is eight percent per rank', near(skillCooldownSeconds(p, host), 8 / 1.16));
  const speed = m.sheet.get('attackSpeed'); cast();
  check('Clear Orders boosts affected minion action speed', near(m.sheet.get('attackSpeed'), speed * 1.2));
  t.sheet.setSource('dodge', [mod('evasion', 'override', 1e9), mod('hitImmune', 'override', 1), mod('areaAvoidance', 'override', 1)]);
  const before = t.life; strike();
  check('prepared hit bypasses evasion and dodge', t.life < before);
  check('preparation spends on its own landed hit', !m.assaultPreparation && !m.buffs.has('assault_preparation'));
  const fire = t.statuses.find(s => s.id === 'impaled_fire')?.rupture ?? 0;
  check('fire attack banks a fire impale', fire > 0 && !t.statuses.some(s => s.id === 'impaled'));
  t.sheet.removeSource('dodge'); strike('cold');
  check('cold damage cannot discharge a fire impale', near(t.statuses.find(s => s.id === 'impaled_fire')?.rupture ?? 0, fire));
  strike('fire'); check('later fire damage releases the fire impale', !t.statuses.some(s => s.id === 'impaled_fire'));
  cast(); t.invulnerable = true; strike();
  check('Unerring Signal respects invulnerability and preserves preparation', !!m.assaultPreparation);
  t.invulnerable = false; t.plies = t.pliesMax = 1; t.plySpec = { count: 1 }; strike();
  check('a protective ply still absorbs an unerring hit and spends preparation', t.plies === 0 && !m.assaultPreparation);
  host.treeNodes = []; w.assaults.update(0);
  check('respec removes native command buffs', !m.buffs.has('assault_orders') && !m.buffs.has('assault_preparation'));
}
{
  const { w, p, host, m, t, cast, strike, hit } = setup(['killing_signal', 'sure_signal', 'stunning_signal', 'rapid_signals', 'patient_signal', 'rushing_signal']);
  p.cooldowns.set(host.def.id, 1); w.assaults.refund(p, host, 0.25);
  check('Rapid Signals subtracts from current cooldown', near(p.cooldowns.get(host.def.id)!, 0.75));
  p.cooldowns.clear(); w.assaults.refund(p, host, 16.5);
  check('bank shows three hits and fractional progress', p.assaultHud?.hits === 3 && p.assaultHud.progress > 0);
  cast(); check('banked command primes three hits per minion', m.assaultPreparation?.hits === 3);
  const mult = m.sheet.get('damage'); strike(); strike();
  check('banked hit counter does not multiply damage bonus', near(mult, 1.2) && m.assaultPreparation?.hits === 1 && near(m.sheet.get('damage'), 1.2));
  strike(); check('last prepared hit consumes the buff and builds haste', !m.assaultPreparation && m.buffs.get('assault_tempo')?.stacks === 3);
  p.cooldowns.clear(); w.assaults.refund(p, host, 1000);
  check('bank hard caps at five hits', p.assaultHud?.hits === 5 && p.assaultHud.progress === 1);
  const snapshot = serializeSnapshot(w, 1);
  check('prepared counter is serialized for co-op', snapshot.actors.some(a => a.assault?.hits === 5));
  cast(); const swing = hit(); m.skills = [swing]; m.useLock = 0; m.cooldowns.clear();
  check('prepared melee starts an ordinary windup', w.useSkill(m, swing, t.pos));
  const hp = t.life; t.pos.x += 400;
  w.executeSkill(m, swing, { x: 680, y: 600 });
  check('locked melee lands after target leaves range', t.life < hp);
  t.pos = { x: 680, y: 600 }; m.useLock = 0; m.cooldowns.clear(); m.casting = null;
  w.useSkill(m, swing, t.pos); t.tier++;
  const above = t.life; w.executeSkill(m, swing, t.pos);
  check('target lock cannot cross stories', t.life === above);
  host.treeNodes = []; w.assaults.update(0);
  check('respec erases bank and HUD', !p.assaultHud);
}
{
  const { p, host, t, strike } = setup(['killing_signal', 'sure_signal', 'finishing_signal', 'rapid_signals']);
  t.life = 250;
  const random = Math.random; Math.random = () => 0.1;
  try {
    p.cooldowns.set(host.def.id, 8); strike();
    check('unprepared minion hit feeds Rapid Signals', near(p.cooldowns.get(host.def.id)!, 7.75));
    check('every minion hit banks Doom', (t.statuses.find(s => s.id === 'doom')?.rupture ?? 0) > 0);
    strike(); check('Doom can finish an accumulated sentence', t.dead);
  } finally { Math.random = random; }
}
{
  const { p, m, t, body, cast, tick } = setup(['sheltered_advance', 'renewed_advance', 'mending_advance', 'lasting_advance']);
  const baselineRegen = m.sheet.get('lifeRegen') - 4 * p.sheet.get('minionDamage');
  const second = body(); p.sheet.setSource('miniondamage', [mod('minionDamage', 'increased', 1)]); tick(0.01);
  check('ready aura puts minions in defensive formation', !!m.aiCommand?.assaultFormation && !!second.aiCommand?.assaultFormation);
  check('minion damage scales aura regeneration', near(m.sheet.get('lifeRegen'), baselineRegen + 4 * p.sheet.get('minionDamage')));
  const before = [p.life, m.life, second.life]; landLifeDamage(p, 100);
  check('aura shares thirty percent evenly', near(before[0] - p.life, 70) && near(before[1] - m.life, 15) && near(before[2] - second.life, 15));
  const native = m.plies; cast(); tick(0.01);
  check('Assault grants temporary protection', m.plies === native + 1);
  check('cooldown swaps defense for ten percent more damage', !m.aiCommand?.assaultFormation && near(m.sheet.get('damage'), 1.1) && near(m.sheet.get('lifeRegen'), baselineRegen));
  const life = p.life; landLifeDamage(p, 100); check('cooldown disables shared wounds', near(life - p.life, 100));
  const enemyLife = t.life;
  applyHit(t, m, { amounts: { physical: 1000 }, crit: false, tags: new Set(['spell']), sourceName: 'Enemy' });
  check('enemy ply shatter bursts for area damage', t.life < enemyLife);
  const afterBreak = m.plies; tick(7);
  check('expiry never removes native plies after temporary ply shattered', m.plies === afterBreak && m.assaultWardCount === 0);
  p.cooldowns.clear(); tick(0.01); check('aura resumes when cooldown ends', !!m.aiCommand?.assaultFormation);
  p.skills = []; tick(0.01);
  check('unequip removes aura, formation and damage sharing', !p.lifeDamageInterceptors?.has('assault') && !m.aiCommand?.assaultFormation && near(m.sheet.get('lifeRegen'), baselineRegen));
}
{
  const { w, p, host, m, t, body, cast, tick } = setup(['sheltered_advance', 'scattered_advance', 'iron_advance', 'flowing_advance']);
  m.plies = m.pliesMax = 3; m.plySpec = { count: 3 }; cast();
  check('all plies orbit while retaining protection', m.plies === 4 && assaultOrbitPositions(m, w.time).length === 4);
  applyHit(t, m, { amounts: { physical: 1000 }, crit: false, tags: new Set(['spell']), sourceName: 'Enemy' });
  check('shattered blade disappears with its ply', assaultOrbitPositions(m, w.time).length === 3);
  for (let i = 0; i < 5; i++) { w.time += 0.31; t.pos = assaultOrbitPositions(m, w.time)[0]; w.assaults.update(0.31); }
  check('three contacts rebuild one ward', m.plies === 4 && m.assaultWardCount === 1);
  applyHit(t, m, { amounts: { physical: 1000 }, crit: false, tags: new Set(['spell']), sourceName: 'Enemy' });
  for (let i = 0; i < 5; i++) { w.time += 0.31; t.pos = assaultOrbitPositions(m, w.time)[0]; w.assaults.update(0.31); }
  check('ward can rebuild only once per cast', m.assaultWardCount === 0 && m.plies === 3);
  const second = body(); m.pos = { x: 900, y: 600 }; second.pos = { x: 930, y: 600 }; t.pos = { ...m.pos };
  const life = t.life; p.useLock = 0;
  check('Recall uses the command’s native meta action', w.useMetaSkill(p, host, p.pos));
  tick(0.001); check('first recall teleports immediately and leaves an aftershock', Math.abs(m.pos.x - p.pos.x) <= 40 && t.life < life);
  check('later minion waits for its turn', second.pos.x === 930);
  tick(0.5); check('whole court returns within half a second', Math.abs(second.pos.x - p.pos.x) <= 40);
  tick(7); check('orbit expires without removing native protection', !m.assaultOrbit && m.plies === 3);
}
{
  const { w, p, host, m, t, cast, strike } = setup(['killing_signal', 'sure_signal', 'rapid_signals', 'finishing_signal']);
  cast(); strike();
  const bank = t.statuses.find(s => s.id === 'impaled_fire')?.rupture;
  w.assaults.pooledHit(p, t, 10, { physical: 10 });
  check('pooled physical bites preserve fire impales', t.statuses.find(s => s.id === 'impaled_fire')?.rupture === bank);
  w.assaults.pooledHit(p, t, 10, { fire: 10 });
  check('matching pooled damage releases typed impales', !t.statuses.some(s => s.id === 'impaled_fire'));
  cast(); strike(); t.statuses = t.statuses.filter(s => s.id === 'impaled_fire');
  t.statuses[0].remaining = 0.001; const before = t.life; w.update(0.02);
  check('unmatched typed impales expire harmlessly', !t.statuses.some(s => s.id === 'impaled_fire') && t.life >= before);
  t.life = 30; w.assaults.pooledHit(p, t, 100, { physical: 100 });
  check('pooled minion Doom executes at a lethal bank', t.dead);
  host.treeNodes = ['sheltered_advance']; w.assaults.update(0); cast();
  const plies = m.plies; w['litePooledHit'](m, { physical: 1000 }, undefined);
  check('wild pooled bites consume the temporary ply budget', m.plies === plies - 1 && m.assaultWardCount === 0);
}
{
  const { w, p, host } = setup(['sheltered_advance']);
  const hive = makeSkillInstance(SKILLS.summon_swarmlings); p.skills.push(hive);
  w.executeSkill(p, hive, p.pos); const swarm = w.minionsOfSkill(p, hive.def.id)[0];
  const native = swarm.plies; w.executeSkill(p, host, p.pos);
  w['bakeMinionOwnerStats'](swarm, p, hive);
  check('temporary command ply survives owner stat rebake', swarm.plies === native + 1 && swarm.assaultWardCount === 1);
  w.time += 7; w.assaults.update(7); w['bakeMinionOwnerStats'](swarm, p, hive);
  check('expiry and rebake preserve native ply count', swarm.plies === native && swarm.assaultWardCount === 0);
}
console.log(`Command Assault: ${failed} failures`);
if (failed) process.exitCode = 1;
