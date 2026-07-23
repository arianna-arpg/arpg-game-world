// ---------------------------------------------------------------------------
// DOODAD FAMILIES — scoped invalidation pinned (engine/doodadFamilies.ts).
//
// The churn cascade (2026-07-23 perf pass): every in-place doodad mutation
// bumped ONE shared rev, and a drying pool's radius steps (10-30/sec in
// churn zones) rebuilt the convex nav grid, the canopy veil index, the
// light clusters and the ground gather every frame, cost growing as doodads
// accumulated. Now mutation sites that know their doodad report it, and
// only the FAMILIES that kind belongs to re-derive. Pinned here:
//
//   THE SCOPING LAW — an attributed report bumps exactly its families;
//     a no-arg report bumps all (the safe default).
//   THE CONSUMER LAW — pathField/veilIndex keep their derived objects
//     across foreign churn, re-derive on their own.
//   THE SAFETY NET — an UNREPORTED push/splice still invalidates everything
//     (the length key): the registry can never make a cache stale.
//   THE EVAP ATTRIBUTION — the evaporation sweep's per-step report leaves
//     the nav grid + veil index untouched while the pool's own families move.
//
// Run: npx tsx balance/probe_doodadfams.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { HUB_ZONE } from '../src/data/zones';
import type { Doodad } from '../src/engine/levelgen';
import { doodadFamilyBits, doodadFamilyIndex } from '../src/engine/doodadFamilies';
// Render-side registrations (the sim shims carry these headless — the
// sightveil probe's precedent): 'light' + 'ground-bake' join the registry.
import '../src/render/vis/lights';
import '../src/render/vis/ground';

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail?: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (ok) pass++; else fail++;
}

bootSimEngine();
seedGlobalRandom(0x51ab);
const w = makeSimWorld('warrior', 0x51ab);
w.loadZone(HUB_ZONE);

// ------------------------------------------------ A. registry sanity
check('A: engine families registered', doodadFamilyIndex('nav-block') >= 0 && doodadFamilyIndex('veil') >= 0,
  `nav-block@${doodadFamilyIndex('nav-block')} veil@${doodadFamilyIndex('veil')}`);
check('A: render families registered (headless import)',
  doodadFamilyIndex('light') >= 0 && doodadFamilyIndex('ground-bake') >= 0,
  `light@${doodadFamilyIndex('light')} ground-bake@${doodadFamilyIndex('ground-bake')}`);
const bitsLava = doodadFamilyBits('lava');
const bitsRock = doodadFamilyBits('rock');
check('A: lava wears light, never nav-block', (bitsLava & (1 << doodadFamilyIndex('light'))) !== 0
  && (bitsLava & (1 << doodadFamilyIndex('nav-block'))) === 0, `bits ${bitsLava.toString(2)}`);
check('A: rock wears nav-block, never light', (bitsRock & (1 << doodadFamilyIndex('nav-block'))) !== 0
  && (bitsRock & (1 << doodadFamilyIndex('light'))) === 0, `bits ${bitsRock.toString(2)}`);

// ------------------------------------------------ B. THE SCOPING LAW
{
  const lavaD: Doodad = { pos: { x: 100, y: 100 }, radius: 30, kind: 'lava' };
  const rockD: Doodad = { pos: { x: 200, y: 200 }, radius: 20, kind: 'rock' };
  const nav0 = w.doodadFamilyRev('nav-block'), veil0 = w.doodadFamilyRev('veil'), light0 = w.doodadFamilyRev('light');
  w.markDoodadsChanged(lavaD);
  check('B: a lit-ground report bumps light, spares nav-block + veil',
    w.doodadFamilyRev('light') === light0 + 1
    && w.doodadFamilyRev('nav-block') === nav0 && w.doodadFamilyRev('veil') === veil0,
    `light ${light0}→${w.doodadFamilyRev('light')}, nav ${nav0}→${w.doodadFamilyRev('nav-block')}`);
  const nav1 = w.doodadFamilyRev('nav-block'), light1 = w.doodadFamilyRev('light');
  w.markDoodadsChanged(rockD);
  check('B: a blocker report bumps nav-block, spares light',
    w.doodadFamilyRev('nav-block') === nav1 + 1 && w.doodadFamilyRev('light') === light1);
  const all0 = ['nav-block', 'veil', 'light', 'ground-bake'].map(id => w.doodadFamilyRev(id));
  w.markDoodadsChanged();
  check('B: a no-arg report bumps every family (the safe default)',
    ['nav-block', 'veil', 'light', 'ground-bake'].every((id, i) => w.doodadFamilyRev(id) === all0[i] + 1));
}

// ------------------------------------------------ C. THE CONSUMER LAW
{
  const nav0 = w.pathField();
  const veilIdx0 = w.veilIndex();
  check('C: fixture has a convex nav grid + veil index', nav0 !== null && veilIdx0 !== undefined);
  const lavaD: Doodad = { pos: { x: 120, y: 140 }, radius: 26, kind: 'lava' };
  w.markDoodadsChanged(lavaD);
  check('C: foreign churn keeps the nav grid + veil index (identity)',
    w.pathField() === nav0 && w.veilIndex() === veilIdx0);
  const rockD: Doodad = { pos: { x: 220, y: 220 }, radius: 20, kind: 'rock' };
  w.markDoodadsChanged(rockD);
  check('C: own-family churn re-derives the nav grid', w.pathField() !== nav0);
}

// ------------------------------------------------ D. THE SAFETY NET
{
  const nav0 = w.pathField();
  const veil0 = w.veilIndex();
  const clusters0 = w.doodadFamilyRev('light');
  // A raw, UNREPORTED push (no markDoodadsChanged at all): the length key
  // must still re-derive every consumer.
  w.doodads.push({ pos: { x: 400, y: 300 }, radius: 18, kind: 'rock' });
  check('D: an unreported push still re-derives (length key)',
    w.pathField() !== nav0 && w.veilIndex() !== veil0, undefined);
  void clusters0;
  w.doodads.pop();
  w.markDoodadsChanged(); // leave the fixture honest
}

// ------------------------------------------------ E. THE EVAP ATTRIBUTION
{
  w.addTempGround({ x: 300, y: 260 }, 'lava', 40, 0.05, { evaporate: { rate: 400 } });
  const priv = w as unknown as { updateTempGrounds(dt: number): void; updateEvaporation(dt: number): void };
  priv.updateTempGrounds(0.1); // expire the dwell → hands to evaporation
  const nav0 = w.doodadFamilyRev('nav-block'), veil0 = w.doodadFamilyRev('veil');
  const light0 = w.doodadFamilyRev('light');
  let steps = 0;
  for (let i = 0; i < 60 && w.doodads.some(d => d.evap); i++) { priv.updateEvaporation(0.05); steps++; }
  check('E: the pool dried through quantized steps', steps > 2 && !w.doodads.some(d => d.evap), `${steps} sweeps`);
  check('E: drying bumped the pool\'s own families only',
    w.doodadFamilyRev('light') > light0
    && w.doodadFamilyRev('nav-block') === nav0 && w.doodadFamilyRev('veil') === veil0,
    `light +${w.doodadFamilyRev('light') - light0}, nav +${w.doodadFamilyRev('nav-block') - nav0}, veil +${w.doodadFamilyRev('veil') - veil0}`);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} pass / ${fail} fail`);
if (fail > 0) process.exit(2);
