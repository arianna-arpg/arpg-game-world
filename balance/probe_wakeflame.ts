// ---------------------------------------------------------------------------
// ONE-OFF PROBE — the wakeflame votive loop, end to end, on the real engine:
// shed → magnet → scoop → bank → cooldown refund → vigil ignite/drain/starve
// → spend-all → passive accrual → orbPickup proc. Run: npx tsx balance/probe_wakeflame.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { mod } from '../src/engine/stats';
import type { BuildSpec } from '../src/sim/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const world = makeSimWorld('juggernaut', 12345);
const spec: BuildSpec = {
  id: 'wakeflame_probe', classId: 'juggernaut', level: 9,
  skills: [
    { id: 'cindershell', level: 3 },
    { id: 'deathwatch', level: 3 },
    { id: 'requiem', level: 3 },
    { id: 'frenzy', level: 3, supports: [{ id: 'kindled_wake', level: 1 }] },
  ],
};
const warnings = applyBuild(world, spec, 7);
if (warnings.length) console.log('build warnings:', warnings.join(' | '));

const p = world.player;
const bank = (): number => p.charges.get('wakeflame') ?? 0;
const step = (s: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < s; t += dt) world.update(dt);
};

// --- 1) shed → magnet drift → scoop banks a charge --------------------------
world.shedOrb('wakeflame', { x: p.pos.x + 60, y: p.pos.y });
check('shed: wakeflame orb entered the world', world.orbs.some(o => o.kind === 'wakeflame'));
step(1.0);
check('magnet+scoop: banked 1 wakeflame', bank() === 1, `bank=${bank()}`);
check('scoop: orb consumed', !world.orbs.some(o => o.kind === 'wakeflame'));

// --- 2) cooldown refund on scoop (cindershell subscribes 1s) ----------------
const cind = p.skills.find(s => s?.def.id === 'cindershell');
check('build: cindershell on the bar', !!cind);
world.useSkill(p, cind!, { x: p.pos.x + 50, y: p.pos.y });
step(0.6);
const cdBefore = p.cooldowns.get('cindershell') ?? 0;
check('cast armed its cooldown', cdBefore > 5, `left=${cdBefore.toFixed(2)}s`);
world.shedOrb('wakeflame', { x: p.pos.x, y: p.pos.y });
step(0.25);
const cdAfter = p.cooldowns.get('cindershell') ?? 0;
const refunded = cdBefore - cdAfter;
check('scoop refunded ~1s of cindershell', refunded > 0.9 && refunded < 1.6,
  `${cdBefore.toFixed(2)}s → ${cdAfter.toFixed(2)}s (Δ${refunded.toFixed(2)})`);

// --- 3) deathwatch: ignition cost + flare + charge upkeep + starve ----------
while (bank() < 3) { world.shedOrb('wakeflame', { x: p.pos.x, y: p.pos.y }); step(0.3); }
const dw = p.skills.find(s => s?.def.id === 'deathwatch');
check('build: deathwatch on the bar', !!dw);
const preIgnite = bank();
world.useSkill(p, dw!, { x: p.pos.x, y: p.pos.y });
step(0.6);
check('vigil lit (aura active)', p.activeAuras.has('deathwatch'));
check('ignition cost 1 wakeflame', bank() === preIgnite - 1, `${preIgnite} → ${bank()}`);
check('ignition flare (vigil_flare buff)', p.buffs.has('vigil_flare'));
const litBank = bank();
step(2.4); // upkeep 0.5/s → 1 due in this window
check('vigil drank a flame as upkeep', bank() === litBank - 1, `${litBank} → ${bank()}`);
step(8);   // burn the rest dry
check('starved vigil guttered out', !p.activeAuras.has('deathwatch'), `bank=${bank()}`);

// --- 4) requiem: spend-all -----------------------------------------------
while (bank() < 2) { world.shedOrb('wakeflame', { x: p.pos.x, y: p.pos.y }); step(0.3); }
const req = p.skills.find(s => s?.def.id === 'requiem');
check('build: requiem on the bar', !!req);
world.useSkill(p, req!, { x: p.pos.x + 40, y: p.pos.y });
step(0.9);
check('requiem consumed the whole bank', bank() === 0, `bank=${bank()}`);

// --- 5) passive accrual (chargeRegen_wakeflame, per 10s) --------------------
p.sheet.setSource('probe_regen', [mod('chargeRegen_wakeflame', 'flat', 5)]); // 1 per 2s
const preRegen = bank();
step(2.6);
check('passive accrual ticked the bank', bank() > preRegen, `${preRegen} → ${bank()}`);
p.sheet.setSource('probe_regen', []);

// --- 6) orbPickup proc (votive_spark: +6 mana on wakeflame scoop) -----------
p.sheet.setSource('probe_spark', [mod('proc_votive_spark', 'flat', 1)]);
p.mana = 20;
world.shedOrb('wakeflame', { x: p.pos.x, y: p.pos.y });
step(0.35);
check('votive spark poured mana on scoop', p.mana >= 25, `mana=${p.mana.toFixed(1)}`);

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
