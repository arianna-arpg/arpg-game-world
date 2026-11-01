// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SUPPORT TARGET (data/supportPower.ts) and what it pins on
// the real engine: Echoing Might's ceiling at every multiplier, so the blow that
// feeds the next can no longer diverge; and a soft spender never lifting a host's
// hard charge gate, while still feasting beside it.
// Run: npx tsx balance/probe_supportpower.ts
// ---------------------------------------------------------------------------

import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { SUPPORT_POWER_TARGET } from '../src/data/supportPower';
import { hostSockets, instanceChargeCost, instanceSideFeast, makeSkillInstance, type SkillDef } from '../src/engine/skills';
import { mod } from '../src/engine/stats';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps * Math.max(1, Math.abs(b));

const strike = {
  id: 'probe_strike', name: 'Probe Strike', noDrop: true, description: '',
  tags: ['attack', 'physical'], color: '#fff',
  manaCost: 0, cooldown: 0, useTime: 0,
  baseDamage: { physical: [100, 100] as [number, number] },
  targeting: { target: 'enemy', castRange: 400 },
  delivery: { type: 'target' },
  effects: [{ type: 'damage' }],
} as unknown as SkillDef;

/** A hero and a soak with every roll and defense held flat, so each number below is exact. */
function rig(multiplier: number) {
  seedGlobalRandom(0x5a1);
  const w = makeSimWorld('warrior', 0x5a1), p = w.player;
  const e = w.createMonster('zombie', 1, 'enemy');
  w.actors = [p, e];
  p.pos = { x: 500, y: 500 }; e.pos = { x: 560, y: 500 }; e.tier = p.tier;
  p.skills = []; e.skills = []; p.casting = null;
  p.sheet.setSource('probe-rig', [
    mod('damage', 'override', multiplier), mod('accuracy', 'override', 1e6), mod('critChance', 'override', 0),
    mod('mana', 'override', 1e6),
  ]);
  e.sheet.setSource('probe-rig', [
    mod('life', 'override', 1e15), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0),
    mod('physicalRes', 'override', 0), mod('damageTaken', 'override', 1), mod('lifeRegen', 'override', 0),
  ]);
  p.fillResources(); e.fillResources();
  const hit = (inst: ReturnType<typeof makeSkillInstance>): number => {
    const before = e.life;
    w.executeSkill(p, inst, e.pos, { targetInfo: { actor: e, pos: { ...e.pos } } });
    return before - e.life;
  };
  return { w, p, e, hit };
}

// --- 1) Echoing Might: the rate, the ceiling, and no divergence ----------------------
{
  const ceiling = SUPPORT_POWER_TARGET.high;
  const echoed = (level: number) => {
    const inst = makeSkillInstance(strike, 1);
    inst.sockets[0] = { def: SUPPORTS.echoing_might, level };
    return inst;
  };
  const held = (p: ReturnType<typeof rig>['p']): number => p.buffs.get('echoing_might')?.def.mods?.[0]?.value ?? 0;

  // Low investment sits on the rate: 2% of a 100-damage hit, worth a 2% next hit.
  {
    const { p, hit } = rig(1), inst = echoed(1);
    const first = hit(inst);
    check('echo: a 100-damage hit deals 100', near(first, 100), `dealt ${first}`);
    check('echo: it banks 2% of what it dealt', near(held(p), 2), `held ${held(p)}`);
    const second = hit(inst);
    check('echo: the next blow carries it', near(second, 102), `dealt ${second}`);
  }
  // The series that used to diverge. At these multipliers 30% would be past 1 / rate.
  for (const multiplier of [10, 100, 1e6]) {
    const { hit } = rig(multiplier), inst = echoed(1);
    const series = Array.from({ length: 60 }, () => hit(inst));
    const top = Math.max(...series);
    check(`echo: at ${multiplier}× damage, 60 blows stay under the ceiling`, top <= multiplier * 100 * ceiling * (1 + 1e-6),
      `top ${top} of ${multiplier * 100 * ceiling}`);
    check(`echo: at ${multiplier}× damage the ceiling is a level, not a climb`, near(series[59], series[30]), `${series[30]} → ${series[59]}`);
  }
  // Every source of the stat shares the one ceiling.
  {
    const { p, hit } = rig(50), inst = echoed(40);
    p.sheet.setSource('probe-more-echo', [mod('echoMight', 'flat', 5)]);
    const series = Array.from({ length: 40 }, () => hit(inst));
    check('echo: a huge rate from every source still stops at the ceiling',
      Math.max(...series) <= 5000 * ceiling * (1 + 1e-6), `top ${Math.max(...series)}`);
  }
  // Another skill's echo doesn't count against this one: the ceiling reads the skill without it.
  {
    const { p, hit } = rig(100), inst = echoed(1);
    hit(inst); hit(inst); hit(inst);
    const settled = held(p);
    check('echo: the ceiling is measured without the echo already held', near(settled, 100 * (ceiling - 1)), `held ${settled}`);
  }
  check('echo: the gem and the passive quote the rate they grant',
    /2%/.test(SUPPORTS.echoing_might.description) && SUPPORTS.echoing_might.mods?.[0]?.value === 0.02);
}

// --- 2) A soft spender never lifts a hard gate --------------------------------------
{
  const softs = Object.values(SUPPORTS).filter(s => s.chargeCost?.optional);
  const hards = Object.values(SKILLS).filter(s => s.chargeCost && !s.chargeCost.optional);
  check('spender: the census has both sides', softs.length >= 2 && hards.length >= 10, `${softs.length} soft gems, ${hards.length} hard hosts`);
  const lifted: string[] = [], lost: string[] = [];
  for (const host of hards) for (const gem of softs) {
    const inst = makeSkillInstance(host, 1);
    inst.sockets[0] = { def: gem, level: 1 };
    if (instanceChargeCost(inst) !== host.chargeCost) lifted.push(`${host.id}+${gem.id}`);
    // A gem that doesn't fit its host isn't socketed at all (Ravening on a flask).
    if (hostSockets(inst).length && instanceSideFeast(inst) !== gem.chargeCost) lost.push(`${host.id}+${gem.id}`);
  }
  check('spender: every hard host keeps its own price under every soft gem', !lifted.length, lifted.slice(0, 6).join(', '));
  check('spender: and every soft gem still feasts beside it', !lost.length, lost.slice(0, 6).join(', '));

  const gated = { ...strike, id: 'probe_gated', chargeCost: { charge: 'fury', amount: 1 } } as SkillDef;
  const { w, p, e } = rig(1);
  const inst = makeSkillInstance(gated, 1);
  inst.sockets[0] = { def: SUPPORTS.ravening, level: 1 };
  p.skills = [inst];
  p.gainCharge('frenzy', 4, 10);
  check('spender: a banked feast does not open the host\'s empty gate', !w.useSkill(p, inst, { x: 560, y: 500 }) && p.charges.get('frenzy') === 4);
  p.useLock = 0;
  p.gainCharge('fury', 2, 10);
  const before = e.life;
  check('spender: with its own bank paid, the use goes through', w.useSkill(p, inst, { ...e.pos }));
  const dealt = before - e.life;
  check('spender: the host pays its own price, once', p.charges.get('fury') === 1, `fury ${p.charges.get('fury')}`);
  check('spender: the feast eats its whole bank', (p.charges.get('frenzy') ?? 0) === 0, `frenzy ${p.charges.get('frenzy')}`);
  check('spender: and pays 15% more per charge eaten', near(dealt, 160), `dealt ${dealt}`);
  check('spender: the pool clock sees a feast as a spender', p.spendsCharge('frenzy') && p.spendsCharge('fury'));

  const plain = makeSkillInstance(SKILLS.reckoning, 1);
  plain.sockets[0] = { def: SUPPORTS.ravening, level: 1 };
  check('spender: a soft host still swaps economies, as before', instanceChargeCost(plain) === SUPPORTS.ravening.chargeCost && !instanceSideFeast(plain));
  const levied = makeSkillInstance(SKILLS.requiem, 1);
  levied.sockets[0] = { def: SUPPORTS.embargo, level: 1 };
  check('spender: a hard levy still swaps a hard gate, as before', instanceChargeCost(levied) === SUPPORTS.embargo.chargeCost && !instanceSideFeast(levied));
  const flask = makeSkillInstance(SKILLS.life_flask, 1);
  flask.sockets[0] = { def: SUPPORTS.slow_brew, level: 1 };
  check('spender: a flask keeps counting its own bank', instanceChargeCost(flask) === SKILLS.life_flask.chargeCost);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
