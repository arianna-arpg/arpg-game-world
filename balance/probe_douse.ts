// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE DOUSE LAW + THE MIRAGE PROMISE (docs/engine/douse.md):
// water-family ground SHEDS sunscorched/heatstroke (RegionKind.douses, the
// region fabric's refuge lane), the heat loop refuses to bake what the
// ground douses, insurance waives it (a flier is not wet), the brine keeps
// NO mercy by design — and the mirage oasis wears REAL water's exact face
// (shared WATER_LOOK params, reference-equal) with only the flicker lever
// and the brittle 'near' pop to give it away.
// Run: npx tsx balance/probe_douse.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { regionKind, DOUSE_CFG } from '../src/world/regions';
import { resistValue } from '../src/engine/damage';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { doodadRuleOf } from '../src/engine/levelgen';
import { liquidBodyIsLive } from '../src/render/vis/painters';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const world = makeSimWorld('tamer', 31173);
const p = world.player;
const step = (s: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < s; t += dt) world.update(dt);
};
const scorchStacks = (): number => p.statuses.find(s => s.id === 'sunscorched')?.stacks ?? 0;
const NOON = 48; // dayCycle light peaks at t=0.20 of 240s (the radiance probe's clock)
// Three well-separated stands inside the 1600×1200 arena (pools are r90 —
// each stand is dry ground until its own rig pours there).
const POOL = { x: 400, y: 600 }, SUN = { x: 1200, y: 300 }, BRINE = { x: 400, y: 1000 };

// --- 0) the registry weave: rows where refuge belongs, absent where the
// design says no mercy ------------------------------------------------------
check('registry: water carries the douse row',
  !!regionKind('water')?.douses?.statuses.includes('sunscorched'));
check('registry: water douses heatstroke too (the ladder unwinds in the pool)',
  !!regionKind('water')?.douses?.statuses.includes('heatstroke'));
check('registry: deep_water and tide_pool echo the row',
  !!regionKind('deep_water')?.douses && !!regionKind('tide_pool')?.douses);
check('registry: the BRINE keeps no mercy (saltflat commitment, deliberate absence)',
  regionKind('brine_sink')?.douses === undefined);
check('registry: DOUSE_CFG defaults sane', DOUSE_CFG.every > 0 && DOUSE_CFG.every < 2);

// --- 1) the douse beat: wading strips the scorch, sheet kept honest --------
p.pos = { ...POOL };
for (let i = 0; i < 6; i++) p.applyStatus('sunscorched', 0, 1, 'the desert sun');
check('setup: six scorch stacks worn', scorchStacks() === 6);
const fireResScorched = resistValue(p, 'fire');
world.addTempGround(POOL, 'water', 90, 600);
step(0.8);
const midway = scorchStacks();
check('douse: stacks shedding at the row beat (0.25s)', midway >= 1 && midway <= 4, `6 → ${midway} after 0.8s`);
step(1.2);
check('douse: the scorch fully quenched', scorchStacks() === 0);
check('douse: fire-res erosion LIFTED with the last stack (source removed)',
  resistValue(p, 'fire') > fireResScorched, `${fireResScorched.toFixed(2)} → ${resistValue(p, 'fire').toFixed(2)}`);
check('douse: the quench spoke', world.texts.some(t => t.text.includes('quenches')));

// --- 2) heatstroke: the ladder's top unwinds in the pool too ---------------
p.applyStatus('heatstroke', 0, 1, 'the desert sun');
check('setup: heatstroke worn', p.statuses.some(s => s.id === 'heatstroke'));
step(0.6);
check('douse: heatstroke stripped in the water', !p.statuses.some(s => s.id === 'heatstroke'));

// --- 3) water is REFUGE, not a slower tug-of-war: the bake lanes hold ------
world.zone.theme.swelter = 1;
world.time = NOON;
step(8);
check('suppress: swelter noon bakes NOTHING while the pool holds you', scorchStacks() === 0);
world.time = NOON;
p.pos = { ...SUN }; // off the pool, into the open sun
step(4.5);
const baked = scorchStacks();
check('suppress-control: the open sun still bakes off the water', baked >= 1, `${baked} stacks in 4.5s dry`);
world.zone.theme.swelter = 0; // quiet the sun for the rigs below

// --- 4) insurance: a flier skimming the pool is not wet --------------------
world.addTempGround(SUN, 'water', 90, 600);
// flyingBase, not flying: the flag is RE-DERIVED each status tick from
// flyingBase || worn flight statuses — the innate half is the settable one.
p.flyingBase = true;
const flyingStacks = scorchStacks();
step(1.5);
check('insured: airborne over water, nothing quenches', scorchStacks() === flyingStacks, `${flyingStacks} held`);
p.flyingBase = false;
step(1.5);
check('insured: landing in the same pool quenches after all', scorchStacks() === 0);

// --- 5) no phantom mercy: dry ground and the brine both hold the stacks ----
p.pos = { ...BRINE };
for (let i = 0; i < 3; i++) p.applyStatus('sunscorched', 0, 1, 'the desert sun');
step(2.5);
check('no-row: dry ground sheds nothing (no swelter, no shade, no douse)', scorchStacks() === 3);
world.addTempGround(BRINE, 'brine_sink', 90, 600);
step(2.5);
check('no-row: the BRINE sheds nothing (wading in it is not refuge)', scorchStacks() === 3);

// --- 6) THE MIRAGE PROMISE: the lie wears real water's face ----------------
const water = DOODAD_VISUALS.water, mirage = DOODAD_VISUALS.mirage_oasis;
check('mirage: rides the liquid painter at water\'s own order',
  mirage.painter === 'liquid' && mirage.order === water.order);
check('mirage: body/tint/sheen are water\'s EXACT rows (reference-equal — the reskin doctrine)',
  mirage.params!.rim === water.params!.rim && mirage.params!.core === water.params!.core
  && mirage.params!.sheen === water.params!.sheen && mirage.params!.fords === water.params!.fords);
check('mirage: no lily pads on the lie (pads are water\'s own row)',
  mirage.params!.pads === undefined && water.params!.pads !== undefined);
const flick = mirage.params!.flicker as { every?: number; len?: number; dip?: number } | undefined;
check('mirage: wears the flicker tell (brief, dipped, rare)',
  !!flick && (flick.dip ?? 1) < 1 && (flick.len ?? 9) < 0.5 && (flick.every ?? 0) > 1);
check('mirage: flicker implies a LIVE body; true water stays chunk-baked',
  liquidBodyIsLive(mirage) === true && liquidBodyIsLive(water) === false);
const rule = doodadRuleOf('mirage_oasis');
check('mirage: the vanish is untouched (brittle near, inert light)',
  rule.overlap === 'inert' && !!rule.brittle?.on.includes('near') && (rule.brittle?.reach ?? 0) >= 100);
check('mirage: bastion/caravan stay DISTANT promises (mirageGhost silhouettes)',
  DOODAD_VISUALS.mirage_bastion.painter === 'mirageGhost'
  && DOODAD_VISUALS.mirage_caravan.painter === 'mirageGhost');

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
