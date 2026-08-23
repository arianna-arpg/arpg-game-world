// ---------------------------------------------------------------------------
// ONE-OFF PROBE — M-CRY (docs/design/show-dont-tell.md §3f): the combat cries
// stay `combat`-kinded floaters and each earns a DRAWN TWIN. Pins:
//   A. THE VOICES — clash / glint / blur / ward stand registered (vis/cryVoices).
//   B. THE CRY — World.cry pushes ONE combat-kinded floater + ONE flash wearing
//      the voice at the same seat (radius + facing carried); fx undefined =
//      kind-only, no flash.
//   C. THE CENSUS (source-lint) — no §3f cry stands as a bare un-kinded
//      this.text(…); the twins sit at their seats (clash at the parry, glint
//      at the shield, blur at the evade, ward at immune/resisted/poised,
//      shatter at the broken guard/shell/poise, wink at the timing cries);
//      the ART ledger notes ride the notice feed; the renderer imports the
//      voices.
// Run: npx tsx balance/probe_cryvoices.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import '../src/render/vis/cryVoices';
// the borrowed twins register in their own render modules — side-effect imports (the headless boot never draws)
import '../src/render/vis/dissolveLayer';
import '../src/render/vis/statusVoiceLayer';
import '../src/render/vis/worldVoices';
import { VIS_CFG } from '../src/render/vis/visConfig';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
bootSimEngine();
seedGlobalRandom(0xc47);
const w = makeSimWorld('warrior', 0xc47);

// ------------------------------------------------- A. the voices
{
  const missing = ['clash', 'glint', 'blur', 'ward'].filter(v => !effectVoiceOf(v));
  check('A1 clash / glint / blur / ward stand registered', missing.length === 0, missing.join(',') || 'all four');
  check('A2 the borrowed twins exist too (shatter / wink / ripple)', !!effectVoiceOf('shatter') && !!effectVoiceOf('wink') && !!effectVoiceOf('ripple'));
  check('A3 the dials live on VIS_CFG.cryVoice (four blocks)', ['clash', 'glint', 'blur', 'ward'].every(k => k in VIS_CFG.cryVoice));
}

// ------------------------------------------------- B. the cry
{
  type F = { fx?: string; radius: number; facing?: number; pos: { x: number; y: number } };
  const t0 = w.texts.length, f0 = w.flashes.length;
  w.cry(vec(100, 200), 'PARRY!', '#ffd700', 15, 'clash', 16, 1.25);
  const txt = w.texts[t0] as { text: string; kind?: string } | undefined;
  const fl = w.flashes[f0] as F | undefined;
  check('B1 one combat-kinded floater + one flash wearing the voice at the same seat (radius + facing carried)',
    w.texts.length === t0 + 1 && !!txt && txt.text === 'PARRY!' && txt.kind === 'combat'
    && w.flashes.length === f0 + 1 && !!fl && fl.fx === 'clash' && fl.radius === 16 && fl.facing === 1.25 && fl.pos.x === 100 && fl.pos.y === 200,
    `kind ${txt?.kind} fx ${fl?.fx}`);
  const t1 = w.texts.length, f1 = w.flashes.length;
  w.cry(vec(0, 0), 'IMPALED 12', '#c8ccd8', 13);
  check('B2 fx undefined = kind-only: a floater, no flash', w.texts.length === t1 + 1 && w.flashes.length === f1 && (w.texts[t1] as { kind?: string }).kind === 'combat');
}

// ------------------------------------------------- C. the census
{
  const src = readFileSync('src/engine/world.ts', 'utf8');
  const rend = readFileSync('src/render/renderer.ts', 'utf8');
  const CRIES = ["'PARRY!'", "'blocked'", "'block!'", "'guard broken!'", "'shield bash!'", "'evade'", "'immune'", "'resisted'", "'backstab!'", "'AMBUSH!'", "'SHATTER!'", "'SHELL BREAKS!'", "'BROKEN!'", "'POISED'", "'CULLED!'", "'aftershock!'", "'volatile!'", "'crit mend!'", "'crit affliction!'", "'On the spark!'", "'Perfect!'", "'Flawless!'"];
  const bare: string[] = [];
  for (const line of src.split('\n')) {
    if (!line.includes('this.text(')) continue;
    for (const c of CRIES) if (line.includes(c) && !line.includes("'combat'")) bare.push(c);
  }
  check('C1 no §3f cry stands as a bare un-kinded this.text(…)', bare.length === 0, bare.join(' ') || 'all kinded');
  const has = (a: string, b: string): boolean => src.split('\n').some(l => l.includes(a) && l.includes(b));
  check('C2 the twins sit at their seats: clash@parry, glint@blocked/block!/shield bash, blur@evade, ward@immune/resisted/POISED',
    has("'PARRY!'", "'clash'") && has("'block!'", "'glint'") && has("'shield bash!'", "'glint'") && src.includes("fx: 'glint', facing: guardian.facing")
    && has("'evade'", "'blur'") && has("'immune'", "'ward'") && has("'resisted'", "'ward'") && has("'POISED'", "'ward'"));
  check('C3 shatter at the broken guard / shell / poise; wink at the timing cries',
    has("'guard broken!'", "'shatter'") && has("'SHELL BREAKS!'", "'shatter'") && has("'BROKEN!'", "'shatter'")
    && has("'Perfect!'", "'wink'") && has("'Flawless!'", "'wink'") && has("'On the spark!'", "'wink'") && has("'crit mend!'", "'wink'") && has("'crit affliction!'", "'wink'"));
  check('C4 the ART ledger notes ride the notice feed (off the head)', has('ART WITNESSED', 'this.notice(') && has('ART CAPTURED', 'this.notice(') && !has('ART WITNESSED', 'this.text('));
  check('C5 the renderer imports the cry voices', rend.includes("import './vis/cryVoices'"));
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
