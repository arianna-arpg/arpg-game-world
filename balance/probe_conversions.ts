// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CONVERSION FABRIC on the real stat engine: STAT_TRADES
// (rate + forgo as two SEPARABLE ordinary stats per lane) and stat LINKS
// (linkMod — "gain X% of A as B"), both under THE GOLDEN RULE: every grant
// reads its source at the links-and-trades-disabled, PRE-FORGO baseline —
// single-hop by construction, so A→B→C chains read nothing granted, A→B→A
// cycles cannot compound, and no dial combination can loop to infinity.
// Pins the duelist's-read lane (evasion → insight) end to end: the pure
// additive ECHO (rate alone, evasion kept whole), the true TRADE (rate +
// forgo), Iron-Reflexes math under a FULL forgo, dial modifiability
// ("increased Evasion Read as Insight" genuinely works), base-layer join
// (the target's own increased scales the grant), registry hygiene, and the
// shipped grantor (The Duelist's Ledger carries both dials).
// Run: npx tsx balance/probe_conversions.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { linkMod, mod, STAT_DEFS, STAT_TRADES } from '../src/engine/stats';
import { UNIQUE_LIST } from '../src/data/uniques';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) < eps;

bootSimEngine();
seedGlobalRandom(0xc0de);

// --- 0) Registry hygiene (the validator's law, asserted directly) -----------
{
  check('registry: the duelist\'s-read lane is a STAT_TRADES row',
    STAT_TRADES.some(t => t.from === 'evasion' && t.to === 'insight'
      && t.rateStat === 'evasionToInsight' && t.forgoStat === 'evasionToInsightForgo'));
  const endpoints = new Set(STAT_TRADES.flatMap(t => [t.from, t.to]));
  check('registry: every endpoint and dial is a registered stat',
    STAT_TRADES.every(t =>
      [t.from, t.to, t.rateStat, t.forgoStat].every(s => !!STAT_DEFS[s])));
  check('registry: no dial is itself a trade endpoint (loop hygiene)',
    STAT_TRADES.every(t => !endpoints.has(t.rateStat) && !endpoints.has(t.forgoStat)));
  check('registry: forgo dials are row-scoped, never shared (the squared-forgo trap)',
    new Set(STAT_TRADES.map(t => t.forgoStat)).size === STAT_TRADES.length);
  const ledger = UNIQUE_LIST.find(u => u.id === 'duelists_ledger');
  check('grantor: The Duelist\'s Ledger carries BOTH dials as separable lines',
    !!ledger && ledger.lines.some(l => l.stat === 'evasionToInsight')
    && ledger.lines.some(l => l.stat === 'evasionToInsightForgo'));
}

// --- 1) The ECHO, the TRADE, and Iron-Reflexes math -------------------------
{
  const w = makeSimWorld('rogue', 0xe5a1);
  const p = w.player;
  p.sheet.setSource('probeBase', [mod('evasion', 'flat', 200)]);
  const E0 = p.sheet.get('evasion');
  const I0 = p.sheet.get('insight');
  check('baseline: insight ships empty (the defense-texture doctrine)', I0 === 0,
    `insight ${I0}`);
  // The build may carry LATENT increased-insight (class/gear) that is
  // invisible while the pool is empty — measure the multiplier once and
  // fold it into every expectation (the grant joins the BASE layer, so
  // latent increased genuinely scales it; that is the fabric's own law).
  p.sheet.setSource('probeCal', [mod('insight', 'flat', 100)]);
  const insMul = p.sheet.get('insight') / 100;
  p.sheet.setSource('probeCal', []);

  // THE PURE ECHO: rate alone — insight granted, evasion KEPT WHOLE.
  p.sheet.setSource('probeDials', [mod('evasionToInsight', 'flat', 0.5)]);
  check('echo: rate alone grants insight while evasion stands whole',
    near(p.sheet.get('insight'), 0.5 * E0 * insMul, 1e-4)
    && near(p.sheet.get('evasion'), E0),
    `insight ${p.sheet.get('insight').toFixed(1)}, evasion ${p.sheet.get('evasion').toFixed(1)} (E0 ${E0.toFixed(1)}, ×${insMul.toFixed(2)})`);

  // THE TRADE: the forgo joins — its own separable price, the grant
  // STILL reads the PRE-forgo baseline (renouncing never shrinks the read).
  p.sheet.setSource('probeDials', [
    mod('evasionToInsight', 'flat', 0.5), mod('evasionToInsightForgo', 'flat', 0.4)]);
  check('trade: forgo prices the source while the grant reads PRE-forgo',
    near(p.sheet.get('insight'), 0.5 * E0 * insMul, 1e-4)
    && near(p.sheet.get('evasion'), E0 * 0.6, 1e-4),
    `insight ${p.sheet.get('insight').toFixed(1)}, evasion ${p.sheet.get('evasion').toFixed(1)}`);

  // IRON-REFLEXES MATH: a FULL forgo still converts the WHOLE pool.
  p.sheet.setSource('probeDials', [
    mod('evasionToInsight', 'flat', 1), mod('evasionToInsightForgo', 'flat', 1)]);
  check('trade: full forgo converts the whole pre-forgo pool (nothing lost to order)',
    near(p.sheet.get('insight'), E0 * insMul, 1e-4) && near(p.sheet.get('evasion'), 0),
    `insight ${p.sheet.get('insight').toFixed(1)}, evasion ${p.sheet.get('evasion').toFixed(1)}`);

  // DIAL MODIFIABILITY: the dials are ordinary stats — "20% increased
  // Evasion Read as Insight" genuinely moves the rate.
  p.sheet.setSource('probeDials', [
    mod('evasionToInsight', 'flat', 0.5), mod('evasionToInsight', 'increased', 0.2)]);
  check('dials: the rate itself takes ordinary modifiers',
    near(p.sheet.get('insight'), 0.5 * 1.2 * E0 * insMul, 1e-4),
    `insight ${p.sheet.get('insight').toFixed(1)} (want ${(0.6 * E0 * insMul).toFixed(1)})`);

  // BASE-LAYER JOIN: the target's own increased scales the granted base
  // (summing with whatever latent increase the build already carried).
  p.sheet.setSource('probeDials', [
    mod('evasionToInsight', 'flat', 0.5), mod('insight', 'increased', 0.5)]);
  check('grant joins the BASE layer — the target\'s own increased scales it',
    near(p.sheet.get('insight'), 0.5 * E0 * (insMul + 0.5), 1e-4),
    `insight ${p.sheet.get('insight').toFixed(1)} (want ${(0.5 * E0 * (insMul + 0.5)).toFixed(1)})`);
  p.sheet.setSource('probeDials', []);
}

// --- 2) THE GOLDEN RULE: no cycles, no chains, no infinities ----------------
{
  const w = makeSimWorld('rogue', 0x100b);
  const p = w.player;
  p.sheet.setSource('probeBase', [
    mod('thorns', 'flat', 10), mod('lifeRegen', 'flat', 8)]);
  const T0 = p.sheet.get('thorns');
  const R0 = p.sheet.get('lifeRegen');
  // A→B AND B→A at once: each side reads the OTHER's links-disabled
  // baseline — one hop each way, settled values, no compounding series.
  p.sheet.setSource('probeLinks', [
    linkMod('thorns', 'lifeRegen', 0.5), linkMod('lifeRegen', 'thorns', 0.5)]);
  check('golden rule: A→B→A settles at one hop each way (never a series)',
    near(p.sheet.get('thorns'), T0 + 0.5 * R0)
    && near(p.sheet.get('lifeRegen'), R0 + 0.5 * T0),
    `thorns ${p.sheet.get('thorns').toFixed(1)}, regen ${p.sheet.get('lifeRegen').toFixed(1)}`);

  // CHAINS READ NOTHING GRANTED: evasion→armor (trade) fills armor, but a
  // link FROM armor sees only armor's own baseline — the traded-in
  // evasion never rides a second hop.
  p.sheet.setSource('probeBase', [
    mod('evasion', 'flat', 100), mod('armor', 'flat', 40)]);
  const A0 = p.sheet.get('armor');
  p.sheet.setSource('probeLinks', [
    mod('evasionToArmor', 'flat', 1), linkMod('thorns', 'armor', 1)]);
  const armorNow = p.sheet.get('armor');
  const thornsNow = p.sheet.get('thorns');
  check('golden rule: a chain\'s second hop reads the UNGRANTED baseline',
    armorNow > A0 && near(thornsNow, A0),
    `armor ${armorNow.toFixed(1)} (granted), thorns ${thornsNow.toFixed(1)} (baseline ${A0.toFixed(1)})`);
  p.sheet.setSource('probeLinks', []);
  p.sheet.setSource('probeBase', []);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
