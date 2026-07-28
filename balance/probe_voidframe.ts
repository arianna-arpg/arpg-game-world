// ---------------------------------------------------------------------------
// THE VOID FRAME'S CONTRAST GUARD — the rim reads on every biome.
//
// render/vis/voidFrame.ts derives its whole dressing from TWO theme colors:
// the skirt earth (floor→border), the rim seat (border→black) and the lit
// crest (border→white), all landing against an abyss ink that is itself
// floor-tinted. Nothing checked that the derived tones actually differed. On
// the pale Aetherial cloud country they did not: aether_cathedral's crest and
// its skirt earth sat 0.0006 luminance apart — one tone, an invisible
// hairline, the rim reading as a drawn rectangle instead of ground ending.
//
// The guard (color.ts contrastGuard, dialed by VIS_CFG.voidFrame.contrast)
// pushes a tone away from what it SITS ON until the two clear minGap. Pinned
// here:
//
//   THE ZERO-DRIFT LAW — a theme whose tones already read is returned
//     BYTE-IDENTICAL. The guard is a safety net, never a restyle: 89 of the
//     104 themes carrying one are untouched, and the probe re-derives the
//     pre-guard recipe to prove it.
//   THE CLEARANCE LAW — where it does fire, all four sitting pairs (earth on
//     ink, seat on earth, crest on earth, crest on seat) clear the dial.
//   THE INTENT LAW — the seat only ever darkens and the crest only ever
//     lightens. When the guard fires the two tones are within minGap BY
//     DEFINITION, so "which side is it already on" is coin-flip noise; the
//     intent keeps a realm's rims all breaking the same way.
//   THE CHAIN ORDER — the earth is guarded lighter FIRST, which is what buys
//     the seat headroom to move down. Pinned: no seat ever flips light.
//   THE KEY LAW — the memos key on every theme color their value derives
//     from. Two themes sharing a border must not share a seat or a crest.
//   THE ABLATE PATH — 'voidframe' still returns the flat pre-fabric ink.
//
// Run: npx tsx balance/probe_voidframe.ts
// ---------------------------------------------------------------------------

import { TILESETS } from '../src/data/tilesets';
import type { ZoneTheme } from '../src/data/zones';
import { luminance, mix } from '../src/render/vis/color';
import { crestColorOf, earthOf, seatColorOf, voidBaseOf } from '../src/render/vis/voidFrame';
import { VIS_ABLATE, VIS_CFG } from '../src/render/vis/visConfig';

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail?: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (ok) pass++; else fail++;
}

const CFG = VIS_CFG.voidFrame;
const gap = (a: string, b: string): number => Math.abs(luminance(a) - luminance(b));
/** A theme stub: the guard reads floor + border and nothing else. */
const theme = (floor: string, border: string): ZoneTheme =>
  ({ floor, border, grid: '#000', obstacle: '#000', obstacleEdge: '#000', accent: '#000' });

// THE PRE-GUARD RECIPE, restated. This is the drift reference — if someone
// retunes a mix constant in voidFrame.ts, this probe fires and they have to
// mean it.
const rawEarth = (t: ZoneTheme): string => mix(t.floor, t.border, CFG.skirt.floorMix);
const rawSeat = (t: ZoneTheme): string => mix(t.border, '#000000', 0.75);
const rawCrest = (t: ZoneTheme): string => mix(t.border, '#ffffff', 0.45);

const census: { id: string; t: ZoneTheme }[] = [];
for (const [id, ts] of Object.entries(TILESETS)) {
  const t = (ts as { theme?: ZoneTheme }).theme;
  if (t) census.push({ id, t });
}

// ------------------------------------------------ A. the census stands
check('A: the theme census is populated', census.length > 90, `${census.length} tilesets carry a theme`);
check('A: the contrast dial is data', typeof CFG.contrast?.minGap === 'number' && typeof CFG.contrast?.margin === 'number',
  `minGap ${CFG.contrast?.minGap} margin ${CFG.contrast?.margin}`);

// ------------------------------------------------ B. THE ZERO-DRIFT LAW
{
  let untouched = 0, moved = 0, wrongly = 0;
  const movers: string[] = [];
  for (const { id, t } of census) {
    const e0 = rawEarth(t), s0 = rawSeat(t), c0 = rawCrest(t);
    const base = voidBaseOf(t), e = earthOf(t), s = seatColorOf(t), c = crestColorOf(t);
    // Every pair this theme's tones already cleared BEFORE the guard.
    const clearPre = gap(e0, base) >= CFG.contrast.minGap && gap(s0, e0) >= CFG.contrast.minGap
      && gap(c0, e0) >= CFG.contrast.minGap && gap(c0, s0) >= CFG.contrast.minGap;
    const same = e === e0 && s === s0 && c === c0;
    if (same) untouched++; else { moved++; movers.push(id); }
    if (clearPre && !same) { wrongly++; console.log(`      DRIFT ${id}: ${e0}/${s0}/${c0} → ${e}/${s}/${c}`); }
  }
  check('B: a theme that already reads is BYTE-IDENTICAL to the pre-guard recipe', wrongly === 0,
    `${untouched} untouched / ${moved} guarded of ${census.length}`);
  check('B: the guard is a net, not a restyle (a small minority moves)', moved > 0 && moved < census.length * 0.25,
    `moved: ${movers.slice(0, 4).join(', ')}${movers.length > 4 ? ` +${movers.length - 4}` : ''}`);
}

// ------------------------------------------------ C. THE CLEARANCE LAW
{
  const g = CFG.contrast.minGap;
  const bad: string[] = [];
  let worstE = 1, worstS = 1, worstC = 1, worstCS = 1;
  for (const { id, t } of census) {
    const base = voidBaseOf(t), e = earthOf(t), s = seatColorOf(t), c = crestColorOf(t);
    const ge = gap(e, base), gs = gap(s, e), gc = gap(c, e), gcs = gap(c, s);
    worstE = Math.min(worstE, ge); worstS = Math.min(worstS, gs);
    worstC = Math.min(worstC, gc); worstCS = Math.min(worstCS, gcs);
    if (ge < g || gs < g || gc < g || gcs < g) bad.push(`${id}(e${ge.toFixed(3)} s${gs.toFixed(3)} c${gc.toFixed(3)} cs${gcs.toFixed(3)})`);
  }
  check('C: every theme clears the dial on all four sitting pairs', bad.length === 0,
    bad.length ? bad.slice(0, 4).join(' ') : `worst: earth ${worstE.toFixed(3)} seat ${worstS.toFixed(3)} crest ${worstC.toFixed(3)}/${worstCS.toFixed(3)} vs minGap ${g}`);
}

// ------------------------------------------------ D. THE INTENT + CHAIN LAWS
{
  let flips = 0, dims = 0;
  for (const { t } of census) {
    if (luminance(seatColorOf(t)) > luminance(rawSeat(t)) + 1e-9) flips++;
    if (luminance(crestColorOf(t)) < luminance(rawCrest(t)) - 1e-9) dims++;
  }
  check('D: no seat ever flips light (the chain order buys its headroom)', flips === 0);
  check('D: no crest ever dims (the lit hairline keeps its identity)', dims === 0);
}

// ------------------------------------------------ E. THE AETHERIAL WITNESS
{
  const t = census.find(x => x.id === 'aether_cathedral')?.t;
  check('E: aether_cathedral is in the census', !!t);
  if (t) {
    const pre = gap(rawCrest(t), rawEarth(t)), post = gap(crestColorOf(t), earthOf(t));
    check('E: the invisible crest was invisible before the guard', pre < 0.01, `pre-guard gap ${pre.toFixed(4)}`);
    check('E: the guard restores it as a LIT line', post >= CFG.contrast.minGap
      && luminance(crestColorOf(t)) > luminance(rawCrest(t)),
      `${rawCrest(t)} → ${crestColorOf(t)}, gap ${pre.toFixed(4)} → ${post.toFixed(4)}`);
  }
}

// ------------------------------------------------ F. what ACTUALLY collapses
//
// THE PREMISE INVERSION, pinned. The obvious guess is that a floor and border
// close in luminance hand you the mush — they don't, and no shipping theme
// even gets close (the tightest floor/border gap across the census is 0.110,
// well clear of ground.ts's own 0.09). The three derived tones are DIFFERENT
// functions of the pair, so what collapses a read is WHERE the pair sits:
// near the ink the skirt and seat vanish into the dark; on a pale floor the
// lit crest vanishes into its own ground. These fixtures pin both, so nobody
// "fixes" the guard toward a trigger that was never the mechanism.
{
  // A near-identical MIDTONE pair — the intuitive collapse, which isn't one.
  const t = theme('#2b2b2e', '#2d2d30');
  const pre = { e: rawEarth(t), s: rawSeat(t), c: rawCrest(t) }, base = voidBaseOf(t);
  check('F: floor≈border ALONE is not the mechanism (a midtone pair reads fine)',
    gap(pre.e, base) >= CFG.contrast.minGap && gap(pre.s, pre.e) >= CFG.contrast.minGap
    && gap(pre.c, pre.e) >= CFG.contrast.minGap,
    `e-ink ${gap(pre.e, base).toFixed(4)} s-e ${gap(pre.s, pre.e).toFixed(4)} c-e ${gap(pre.c, pre.e).toFixed(4)}`);
  check('F: ...so it is returned BYTE-IDENTICAL',
    earthOf(t) === pre.e && seatColorOf(t) === pre.s && crestColorOf(t) === pre.c);

  // Near the INK: the skirt drops into the dark it was drawn to describe.
  const dark = theme('#0b0b0f', '#0d0d12');
  const dPre = rawEarth(dark), dBase = voidBaseOf(dark);
  check('F: a pair sitting near the ink DOES collapse the skirt', gap(dPre, dBase) < CFG.contrast.minGap,
    `earth-on-ink ${gap(dPre, dBase).toFixed(4)} pre-guard`);
  check('F: the guard pushes it off the ink',
    gap(earthOf(dark), dBase) >= CFG.contrast.minGap
    && gap(seatColorOf(dark), earthOf(dark)) >= CFG.contrast.minGap
    && gap(crestColorOf(dark), earthOf(dark)) >= CFG.contrast.minGap
    && gap(crestColorOf(dark), seatColorOf(dark)) >= CFG.contrast.minGap,
    `ink ${dBase} → earth ${dPre}→${earthOf(dark)} / seat ${seatColorOf(dark)} / crest ${crestColorOf(dark)}`);

  // A PALE floor: the Aetherial's mechanism, synthesized.
  const pale = theme('#e8e8e8', '#9a9aa0');
  check('F: a pale floor DOES collapse the crest', gap(rawCrest(pale), rawEarth(pale)) < CFG.contrast.minGap,
    `crest-on-earth ${gap(rawCrest(pale), rawEarth(pale)).toFixed(4)} pre-guard`);
  check('F: the guard restores the pale crest',
    gap(crestColorOf(pale), earthOf(pale)) >= CFG.contrast.minGap,
    `${rawCrest(pale)} → ${crestColorOf(pale)}, gap → ${gap(crestColorOf(pale), earthOf(pale)).toFixed(4)}`);

  // THE DEGENERATE: floor === border === the ink itself. Earth lands exactly
  // on the base (gap 0.0000) — the worst input the fabric can be handed.
  const zero = theme(CFG.color, CFG.color);
  check('F: floor === border === the ink is a total collapse pre-guard',
    gap(rawEarth(zero), voidBaseOf(zero)) === 0, `earth-on-ink ${gap(rawEarth(zero), voidBaseOf(zero)).toFixed(4)}`);
  check('F: ...and still resolves to four readable tones',
    gap(earthOf(zero), voidBaseOf(zero)) >= CFG.contrast.minGap
    && gap(seatColorOf(zero), earthOf(zero)) >= CFG.contrast.minGap
    && gap(crestColorOf(zero), earthOf(zero)) >= CFG.contrast.minGap
    && gap(crestColorOf(zero), seatColorOf(zero)) >= CFG.contrast.minGap,
    `${voidBaseOf(zero)} / ${earthOf(zero)} / ${seatColorOf(zero)} / ${crestColorOf(zero)}`);

  // A near-WHITE ground: the crest's 'lighter' intent has no headroom left
  // and MUST flip dark rather than fail to separate — the intent law's one
  // escape hatch, and the reason it is a preference and not a rule.
  const white = theme('#fbfbfb', '#f6f6f6');
  check('F: a near-white theme flips the crest dark rather than fail to clear',
    gap(crestColorOf(white), earthOf(white)) >= CFG.contrast.minGap
    && luminance(crestColorOf(white)) < luminance(rawCrest(white)),
    `earth ${earthOf(white)} crest ${rawCrest(white)}→${crestColorOf(white)} gap ${gap(crestColorOf(white), earthOf(white)).toFixed(4)}`);
}

// ------------------------------------------------ G. THE KEY LAW
{
  // Two themes sharing a BORDER but not a floor, engineered so the guard
  // fires for exactly ONE of them: a near-black floor leaves the seat sitting
  // in its own skirt (guarded), a pale floor throws the skirt far clear of it
  // (untouched). Keyed on border alone — as the seat and crest memos were
  // before the guard gave them a second input — the second theme would be
  // served the first's tone. The non-vacuity check below is the point: the
  // two must differ BECAUSE one was guarded, not by accident of the recipe.
  const dark = theme('#030303', '#3d3d3d'), pale = theme('#e8e8e8', '#3d3d3d');
  const guardedOne = seatColorOf(dark) !== rawSeat(dark) && seatColorOf(pale) === rawSeat(pale);
  check('G: the fixture is honest (the shared border is guarded for one floor only)', guardedOne,
    `dark ${rawSeat(dark)}→${seatColorOf(dark)}, pale ${rawSeat(pale)}→${seatColorOf(pale)}`);
  check('G: a shared border does not leak a seat across floors', seatColorOf(dark) !== seatColorOf(pale),
    `${seatColorOf(dark)} vs ${seatColorOf(pale)}`);
  const a = theme('#101010', '#404050'), b = theme('#e8e8e8', '#404050');
  check('G: a shared border does not leak a crest across floors', crestColorOf(a) !== crestColorOf(b),
    `${crestColorOf(a)} vs ${crestColorOf(b)}`);
  // ...and the memo is still a memo: keyed by VALUE, stable across calls.
  check('G: a theme is keyed by value, not identity (memo hit, same answer)',
    earthOf(theme('#101010', '#404050')) === earthOf(a)
    && seatColorOf(theme('#101010', '#404050')) === seatColorOf(a)
    && crestColorOf(theme('#101010', '#404050')) === crestColorOf(a));
}

// ------------------------------------------------ H. THE ABLATE PATH
{
  const t = theme('#0f1a0c', '#2c4a28');
  const lit = voidBaseOf(t);
  VIS_ABLATE.add('voidframe');
  const flat = voidBaseOf(t);
  VIS_ABLATE.delete('voidframe');
  check('H: ablated, the void base is the flat pre-fabric ink', flat === CFG.color,
    `${lit} (tinted) → ${flat} (flat ${CFG.color})`);
  check('H: un-ablating restores the tinted base', voidBaseOf(t) === lit && lit !== CFG.color, lit);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} pass / ${fail} fail`);
if (fail > 0) process.exit(2);
