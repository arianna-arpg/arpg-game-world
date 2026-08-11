// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE COST LEVERS (2026-08-10, both rulings the user's):
//
//   RIG A — THE POOL-PRICING LEVER (costScaling.pricedFrom): pct-max costs
//           bill the RAW maxima by default — reservation NEVER cheapens the
//           default price (the bite is deliberate) and absent==identical is
//           pinned as exact equality; 'available' routes the same fold
//           through the reservation-aware twins (availableMaxMana /
//           lifeCeiling) so the price follows the spendable band; the
//           current-life lane (lifePctCur) ignores the axis entirely; every
//           shipped wearer still authors NO pricedFrom.
//   RIG B — THE BANKED RELEASE (GatherConvertSpec.releaseOnCooldown): a
//           non-gather cooldown refusal is untouched; a fresh conversion
//           press while cooling stays refused (empty and thin banks alike);
//           a standing bank at/past the fizzle floor ADMITS the press
//           through the running clock, the press re-enters the CONVERSION
//           (never a plain cast), and the release truly FIRES (fill spent,
//           clock restamped by the fire); the refusing shape — a gather
//           spec without the flag — still waits the clock out on the very
//           same bank.
//
// Run: npx tsx balance/probe_costlevers.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { makeSkillInstance, socketSpec, type SkillDef } from '../src/engine/skills';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x1e7e5);

// === RIG A — the pool-pricing lever ========================================

{
  const w = makeSimWorld('warrior', 0xA109);
  const p = w.player;
  const base = SKILLS.ground_slam;
  const cost = (over: Partial<SkillDef>): { mana: number; life: number } =>
    p.skillCost(makeSkillInstance({ ...base, ...over } as SkillDef, 1, 3));

  // --- the mana lane -------------------------------------------------------
  const maxDef = { manaCost: 10, costScaling: { manaPctMax: 0.2 } as const };
  const availDef = {
    manaCost: 10, costScaling: { manaPctMax: 0.2, pricedFrom: 'available' } as const,
  };
  p.reservedMana = 0;
  const unreserved = cost(maxDef).mana;
  check('A1 zero reservation: the twins agree — absent==\'available\' to the byte',
    unreserved === cost(availDef).mana
    && unreserved === cost({
      manaCost: 10, costScaling: { manaPctMax: 0.2, pricedFrom: 'max' } as const,
    }).mana,
    `cost ${unreserved}`);
  p.reservedMana = Math.floor(p.maxMana() / 2);
  check('A2 the raw-max law: reservation never moves the DEFAULT price (her bite)',
    cost(maxDef).mana === unreserved,
    `reserved ${p.reservedMana}/${p.maxMana()}, cost ${cost(maxDef).mana}`);
  // The flat-fold twin: a def whose flat manaCost carries the same ceiling
  // read joins the base at the identical position — exact-equality oracle.
  check('A3 \'available\' follows the spendable band (availableMaxMana)',
    cost(availDef).mana === cost({ manaCost: 10 + p.availableMaxMana() * 0.2 }).mana
    && cost(availDef).mana < unreserved,
    `avail ${cost(availDef).mana} < raw ${unreserved}`);
  p.reservedMana = 0;

  // --- the life lane -------------------------------------------------------
  const maxLifeDef = { manaCost: 0, lifeCost: 8, costScaling: { lifePctMax: 0.1 } as const };
  const availLifeDef = {
    manaCost: 0, lifeCost: 8,
    costScaling: { lifePctMax: 0.1, pricedFrom: 'available' } as const,
  };
  p.reservedLife = 0;
  const lifeUnreserved = cost(maxLifeDef).life;
  check('A4 life twins agree at zero debt',
    lifeUnreserved === cost(availLifeDef).life, `cost ${lifeUnreserved}`);
  p.reservedLife = Math.floor(p.maxLife() * 0.4);
  check('A5 the raw-max law holds on the life lane too',
    cost(maxLifeDef).life === lifeUnreserved,
    `reserved ${p.reservedLife}/${p.maxLife()}, cost ${cost(maxLifeDef).life}`);
  check('A6 \'available\' follows lifeCeiling under overdrive debt',
    cost(availLifeDef).life === cost({ manaCost: 0, lifeCost: 8 + p.lifeCeiling() * 0.1 }).life
    && cost(availLifeDef).life < lifeUnreserved,
    `avail ${cost(availLifeDef).life} < raw ${lifeUnreserved}`);

  // --- the current-life lane ignores the axis ------------------------------
  check('A7 lifePctCur reads CURRENT life either way — the lever never touches it',
    cost({ manaCost: 0, costScaling: { lifePctCur: 0.1 } as const }).life
      === cost({
        manaCost: 0, costScaling: { lifePctCur: 0.1, pricedFrom: 'available' } as const,
      }).life);
  p.reservedLife = 0;

  // --- the shipped catalog stays on the default ----------------------------
  const wearers = ['archon_lance', 'sanguine_burst', 'bonespray',
    'oblation_of_life', 'oblation_of_mana'];
  check('A8 every shipped costScaling wearer authors NO pricedFrom (absent==shipped)',
    wearers.every(id => SKILLS[id]?.costScaling !== undefined
      && SKILLS[id].costScaling!.pricedFrom === undefined),
    wearers.join(','));
}

// === RIG B — the banked release ============================================

{
  const w = makeSimWorld('warrior', 0xB272);
  const p = w.player;
  const host = SKILLS.ground_slam;
  const aim = { x: p.pos.x + 60, y: p.pos.y };
  const step = (sec: number): void => {
    for (let t = 0; t < sec - 1e-9; t += 0.05) w.update(0.05);
  };

  const bare = makeSkillInstance(host, 1, 3);
  const inst = makeSkillInstance(host, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.gathered_casting, level: 1 };

  check('B0 the shipped gem authors the admission (releaseOnCooldown ON)',
    socketSpec(inst, 'gather')?.releaseOnCooldown === true);

  // --- the untouched refusals ---------------------------------------------
  check('B1 a non-gather cooldown refusal is byte-identical',
    p.canUse(bare) && (p.cooldowns.set(host.id, 4), !p.canUse(bare)));
  check('B2 a FRESH conversion press while cooling stays refused (empty bank)',
    !p.canUse(inst));
  p.cooldowns.delete(host.id);

  // --- fill the bank through the REAL channel machinery --------------------
  const pressed = w.useSkill(p, inst, aim);
  const converted = p.casting?.mode === 'channel' && !!p.casting?.gather;
  check('B3 the press converts to the held gather (the powerbank stands up)',
    pressed && converted,
    `mode ${p.casting?.mode ?? 'none'}`);
  step(1.2);
  const fill0 = p.brims?.get(host.id)?.fill ?? 0;
  check('B4 the hold banks past the fizzle floor', fill0 >= 0.3,
    `fill ${fill0.toFixed(2)}`);
  p.casting = null; // the interrupt idiom — casting cleared outright
  check('B5 an interrupt keeps the bank (the persistent bar)',
    (p.brims?.get(host.id)?.fill ?? 0) === fill0);

  // --- the admission -------------------------------------------------------
  p.cooldowns.set(host.id, 10); // the imposed clock (Apotheosis's shape)
  check('B6 a BANKED press is admitted through the running cooldown',
    p.canUse(inst) && !p.canUse(bare),
    `fill ${fill0.toFixed(2)}, cd ${p.cooldowns.get(host.id)}`);
  const rePressed = w.useSkill(p, inst, aim);
  // (useSkill re-seats p.casting behind TS's null narrowing from the
  //  interrupt assignments above — read through a widened lens after
  //  any mutating call)
  const liveCast = () =>
    p.casting as { mode?: string; gather?: unknown; held?: boolean } | null;
  const cast7 = liveCast();
  check('B7 the admitted press re-enters the CONVERSION, never a plain cast',
    rePressed && cast7?.mode === 'channel' && !!cast7?.gather,
    `mode ${cast7?.mode ?? 'none'}`);
  const held7 = liveCast();
  if (held7) held7.held = false;
  step(0.1);
  const spent = (p.brims?.get(host.id)?.fill ?? 0) === 0;
  check('B8 the release FIRES through the clock — bank spent, clock restamped by the fire',
    spent && p.casting === null && p.cooldowns.has(host.id),
    `fill ${(p.brims?.get(host.id)?.fill ?? 0).toFixed(2)}, cd ${p.cooldowns.get(host.id)?.toFixed(2) ?? 'none'}`);

  // --- the refusing shape on the very same bank ----------------------------
  p.cooldowns.delete(host.id);
  step(0.3); // the release's own useLock settles — the next press is clean
  const mute = {
    ...SUPPORTS.gathered_casting,
    gather: { premium: 1.5, minRelease: 0.15 },
  };
  const muteInst = makeSkillInstance(host, 1, 3);
  muteInst.sockets[0] = { def: mute, level: 1 };
  const mutePressed = w.useSkill(p, muteInst, aim) && liveCast()?.mode === 'channel';
  step(0.8);
  p.casting = null;
  const fill1 = p.brims?.get(host.id)?.fill ?? 0;
  p.cooldowns.set(host.id, 10);
  check('B9 the refusing shape waits the clock out on the SAME standing bank',
    mutePressed && fill1 >= 0.3 && !p.canUse(muteInst) && p.canUse(inst),
    `pressed ${mutePressed}, fill ${fill1.toFixed(2)}`);

  // --- the thin bank never opens the lane ----------------------------------
  const bs = p.brims?.get(host.id);
  if (bs) bs.fill = 0.05;
  check('B10 a thin bank (under the fizzle floor) stays refused with the flag ON',
    !!bs && !p.canUse(inst));
  p.cooldowns.delete(host.id);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
