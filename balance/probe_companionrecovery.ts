import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { COMPANION_CFG, companionRecoverySeconds } from '../src/engine/companionSpec';
import { applyHit, applyDot, mitigateTyped, landLifeDamage, rollSkillDamage } from '../src/engine/damage';
import { STATUS_DEFS } from '../src/engine/status';
import { mod } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { serializeSnapshot } from '../src/net/snapshot';

let passed = 0, failed = 0;
const check = (name: string, ok: unknown) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); ok ? passed++ : failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-5;
const shelter = COMPANION_CFG.recovery.status;
function setup(count = 1) {
  const w = makeSimWorld('tamer', 92126), p = w.player;
  const host = p.skills.find(s => s?.def.id === 'tame_beast')!;
  if (count > 1) host.treeNodes = ['swift_claim', ...(count > 2 ? ['repeat_claim', 'light_claim'] : [])];
  w.grantStartingCompanions();
  for (let i = 1; i < count; i++) {
    const a = w.createMonster('shepherds_hound', 1, 'enemy');
    a.pos = { x: p.pos.x + 25 * i, y: p.pos.y }; w.actors.push(a); w.tameCompanion(p, a, host.def.id);
  }
  w.companionBonds.refresh();
  const pets = w.actors.filter(a => a.companion);
  for (const a of pets) a.sheet.setSource('probe', [mod('lifeRegen', 'override', 0), mod('evasion', 'override', 0)]);
  const tick = (sec: number) => { for (let i = 0; i < Math.ceil(sec * 60); i++) w.update(1 / 60); };
  const whistle = (rally = false) => {
    const inst = makeSkillInstance(SKILLS[rally ? 'beast_rallying_whistle' : 'companion_whistle']);
    inst.hostSkillId = host.def.id; w.executeSkill(p, inst, p.pos);
  };
  return { w, p, host, pets, tick, whistle };
}
const remaining = (a: ReturnType<typeof setup>['p']) => a.statuses.find(s => s.id === shelter)?.remaining ?? 0;
function afflict(a: ReturnType<typeof setup>['p']) {
  a.applyStatus('poison', 100, 1, 'probe'); a.applyStatus('rooted', 0, 1, 'probe'); a.applyStatus('moonlit', 0, 10, 'probe');
  a.applyStatus('bleed', 100, 1, 'probe', { rupture: 1000, ruptureRadius: 200 });
}
const restore = seedGlobalRandom(92126);
try {
  check('Default budget is 3/1, 3/2, 3/3 seconds', [1, 2, 3].every(n => near(companionRecoverySeconds(n), 3 / n)));
  {
    const { w, p, pets: [a], tick } = setup(); afflict(a);
    check('Fixture carries actual damage and control debuffs', a.statuses.some(s => s.id === 'poison') && a.statuses.some(s => s.id === 'rooted'));
    w.kill(a); check('Death leaves a downed afflicted beast before recovery', a.downed && a.statuses.some(s => s.dps > 0));
    w.reviveCompanion(a);
    check('Revival preserves half-life policy and grants three seconds', !a.downed && near(a.life, a.maxLife() / 2) && near(remaining(a), 3));
    check('Revival consumes all harmful statuses and their modifiers', a.statuses.every(s => STATUS_DEFS[s.id]?.beneficial)
      && !a.sheet.hasSource('status:rooted'));
    check('Recovery preserves beneficial statuses', a.statuses.some(s => s.id === 'moonlit'));
    check('Shelter has a persistent visible body cue', !!STATUS_DEFS[shelter].bodyFx?.glow && !!STATUS_DEFS[shelter].bodyFx?.rim);
    const life = a.life;
    const foe = w.createMonster('zombie', 1, 'enemy');
    const hit = applyHit(foe, a, rollSkillDamage(foe, makeSkillInstance(SKILLS.claw)));
    check('Direct hits report immune', hit.immune && a.life === life);
    check('Typed and untyped damage over time are blocked', applyDot(a, 10000, 'chaos') === 0 && applyDot(a, 10000) === 0 && a.life === life);
    check('Direct typed hazards and life-damage seam are blocked', mitigateTyped(a, { fire: 10000 }) === 0 && landLifeDamage(a, 10000) === 0 && a.life === life);
    p.invulnerable = true; // the hazard fixture targets the pet, not the run's life cycle
    w['burstDamage'](a.pos, 100, 10000, 'fire', '#fff', 'enemy');
    check('Stray lethal area burst cannot down the revived beast', !a.downed && a.life === life);
    a.applyStatus('poison', 1000, 1, 'probe'); a.applyStatus('stun', 0, 1, 'probe');
    check('Fresh damage/control debuffs cannot queue under immunity', !a.statuses.some(s => s.id === 'poison' || s.id === 'stun'));
    a.applyStatus('moonlit', 0, 10, 'probe');
    check('Beneficial applications remain allowed under immunity', a.statuses.some(s => s.id === 'moonlit'));
    tick(2.8); check('Protection remains before its deadline', a.invulnerable);
    tick(.3); check('Protection and both immunity modifiers expire', !a.invulnerable && !a.sheet.get('debuffImmunity') && remaining(a) === 0);
    a.applyStatus('poison', 1, 1, 'probe'); check('Debuffs land normally after expiry', a.statuses.some(s => s.id === 'poison'));
    check('Damage lands normally after expiry', applyDot(a, 1, 'chaos') > 0);
  }
  for (const count of [1, 2, 3]) {
    const { w, pets, whistle, tick } = setup(count);
    pets.forEach(a => { afflict(a); a.life = a.maxLife() / 4; });
    w.kill(pets[count - 1]); whistle();
    check(`Whistle cleanses, fully heals and protects living/downed pack of ${count}`, pets.every(a => !a.downed
      && near(a.life, a.maxLife()) && near(remaining(a), 3 / count) && a.statuses.every(s => STATUS_DEFS[s.id]?.beneficial)));
    check(`Pack of ${count} receives three total body-seconds`, near(pets.reduce((sum, a) => sum + remaining(a), 0), 3));
    tick(.25); whistle();
    check(`Repeated Whistle refreshes without stacking for ${count}`, pets.every(a => near(remaining(a), 3 / count) && a.statuses.filter(s => s.id === shelter).length === 1));
  }
  {
    const { w, p, host, pets, whistle } = setup(3);
    // Body count, not bond groups or number currently standing, owns the budget.
    pets.forEach(a => { a.bondGroup = 'one-pack'; w.kill(a); });
    w.reviveCompanion(pets[0]);
    check('Individual revive counts downed bodies and shared bond groups', near(remaining(pets[0]), 1));
    const guest = w.addSeat('recovery-guest', w.meta.classDef, w.localSeat.input);
    const guestPet = w.actors.find(a => a.companion && a.owner === guest.actor)!;
    whistle(); check('Other keepers neither dilute nor receive this shelter', pets.every(a => near(remaining(a), 1)) && remaining(guestPet) === 0);
    pets.forEach((a, i) => { a.bondGroup = String(i); });
    host.treeNodes = []; w.companionBonds.refresh(); whistle();
    check('Dormant bodies are excluded from budget and Whistle', near(remaining(pets[0]), 3)
      && pets.slice(1).every(a => a.companionDormant && a.downed && a.life === 0 && remaining(a) === 0));
    p.sheet.setSource('probe:duration', [mod('effectDuration', 'increased', 10)]); whistle();
    check('Generic duration investment cannot multiply shelter budget', near(remaining(pets[0]), 3));
    pets[0].invulnerable = true; pets[0].endStatus(shelter);
    check('Removing timed immunity preserves intrinsic invulnerability', pets[0].invulnerable);
    pets[0].invulnerable = false; check('Intrinsic flag can still be cleared independently', !pets[0].invulnerable);
  }
  {
    const { w, p, pets, tick, whistle, host } = setup(2);
    pets.forEach(a => { afflict(a); w.kill(a); a.pos.x = p.pos.x + 400; });
    pets[0].companionReviveRemaining = .01; tick(.05);
    check('Growing Litter auto-revival cleanses and shares protection', !pets[0].downed && remaining(pets[0]) > 1.4 && pets[0].statuses.every(s => STATUS_DEFS[s.id]?.beneficial));
    host.treeNodes = ['swift_claim', 'repeat_claim', 'light_claim', 'steady_claim'];
    whistle(true);
    check('Rallying Whistle shares the same recovery', pets.every(a => !a.downed && near(remaining(a), 1.5)));
    const wire = JSON.stringify(serializeSnapshot(w, 1));
    check('Shelter presentation travels on ordinary co-op status wire', wire.includes(shelter));
  }
  {
    const { w, p, pets: [a], tick } = setup(); afflict(a); w.kill(a);
    a.pos = { ...p.pos }; tick(1.2);
    check('Nearby idle tending invokes the same protected revival', !a.downed && remaining(a) > 2.5 && a.statuses.every(s => STATUS_DEFS[s.id]?.beneficial));
  }
  {
    const { w, pets: [a] } = setup();
    const full = a.maxLife();
    STATUS_DEFS.probe_recovery_wound = { label: 'Probe wound', color: '#fff', duration: 10,
      mods: [mod('life', 'more', -.5)] };
    try {
      a.applyStatus('probe_recovery_wound', 0, 1, 'probe');
      a.expiredStatuses.push({ id: 'bleed', remaining: 0, stacks: 1, dps: 0, rupture: 1000, sourceName: 'probe' });
      w.kill(a); w.reviveCompanion(a);
      check('Revived life fraction uses the cleansed maximum-life pool', near(a.maxLife(), full) && near(a.life, full / 2));
      check('Lethal-frame pending debuff expiry cannot detonate after revival', a.expiredStatuses.length === 0);
      w.kill(a);
      check('A scripted re-downing clears the old protection window', a.downed && !a.invulnerable && remaining(a) === 0);
    } finally { delete STATUS_DEFS.probe_recovery_wound; }
  }
} finally { restore(); }
console.log(`\n${passed} pass, ${failed} fail`);
if (failed) process.exitCode = 1;
