// SPEECH FABRIC PROBE — the talk-bubble laws, pinned headlessly against the
// same pure functions the renderer draws from (render/vis/speech.ts) and the
// same veil query that gates them (render/vis/roomVeil.ts veiledAtVolume —
// the class method delegates to it, so this rig tests the drawn contract).
//
// The failure classes this rig pins:
//   A. WRAP LAW — words break to fit, never mid-word; authored '\n' breaks;
//      an overlong word stands alone (the box widens, the word never tears);
//      no word is ever dropped or reordered.
//   B. TYPEWRITER LAW — reveal is monotonic in time, closes exactly at the
//      budget, holds beats at sentence stops / clause breaks ONLY at a true
//      break ("1.5" never stutters), scales with cps, and cps<=0 is the
//      instant-plate degenerate case.
//   C. THE FOLD — VIS_CFG.speech ← MonsterDef.speech ← call style: most
//      specific wins, `typing:false` latches until a later rung's typing
//      object re-opens it, and the fold never mutates its inputs.
//   D. THE SAME-VIEW GATE — the reported bug's exact shape: a speaker
//      INSIDE the confining room reads unveiled (bubble shows) while the
//      ground its text hangs over reads veiled (which is why the WORD
//      LAYER must draw above the wash); outsiders read veiled (no bubble
//      through walls); door/window spills stay honest.
//   E. SHIPPED DIALS — the committed VIS_CFG.speech block stays sane, and
//      Mireille's longest authored line actually wraps at the shipped width.
//
//   npx tsx balance/probe_speech.ts

import {
  resolveSpeech, revealedChars, revealBudget, wrapSpeech,
  type SpeechTuning,
} from '../src/render/vis/speech';
import {
  roomVolume, veiledAtVolume,
  type ConfineRoom, type ConfineStructure,
} from '../src/render/vis/roomVeil';
import { VIS_CFG } from '../src/render/vis/visConfig';

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

// --- A. WRAP LAW ------------------------------------------------------------
console.log('A. WRAP LAW');
{
  const measure = (s: string): number => s.length * 7; // fixed-advance stub
  const line = 'Come here, dear — I keep flasks for new faces.';
  const lines = wrapSpeech(line, 140, measure);
  check('A1 every wrapped line fits (or is a lone word)',
    lines.every(l => measure(l) <= 140 || !l.includes(' ')),
    lines.map(l => `"${l}"(${measure(l)})`).join(' '));
  check('A2 wrapping loses/reorders no word',
    lines.join(' ') === line);
  check('A3 multi-line at a width the line cannot fit', lines.length >= 3, `${lines.length}`);
  check('A4 authored \\n always breaks',
    JSON.stringify(wrapSpeech('top\nbottom', 999, measure)) === '["top","bottom"]');
  check('A5 blank paragraph survives as an empty line',
    JSON.stringify(wrapSpeech('a\n\nb', 999, measure)) === '["a","","b"]');
  const long = wrapSpeech('an extraordinarily-overlong-word here', 70, measure);
  check('A6 overlong word stands alone, untorn',
    long.includes('extraordinarily-overlong-word'), JSON.stringify(long));
  check('A7 deterministic (same input, same lines)',
    JSON.stringify(wrapSpeech(line, 140, measure)) === JSON.stringify(lines));
  check('A8 wide-enough text stays one line',
    wrapSpeech('short words', 999, measure).length === 1);
}

// --- B. TYPEWRITER LAW ------------------------------------------------------
console.log('B. TYPEWRITER LAW');
{
  const t = { cps: 20, pausePunct: 0.3, pauseComma: 0.1 };
  const text = 'Well now. Sit, rest — the road can wait.';
  const budget = revealBudget(text, t);
  let mono = true, last = 0;
  for (let e = 0; e <= budget + 0.1; e += 0.01) {
    const n = revealedChars(text, e, t);
    if (n < last) { mono = false; break; }
    last = n;
  }
  check('B1 reveal is monotonic in elapsed time', mono);
  check('B2 reveal closes whole at its own budget',
    revealedChars(text, budget, t) === text.length,
    `${revealedChars(text, budget, t)}/${text.length}`);
  check('B3 nothing shown before the first glyph arrives',
    revealedChars(text, 0, t) === 0);
  const plain = 'abcdefghij';
  check('B4 plain text budget = len/cps',
    Math.abs(revealBudget(plain, t) - plain.length / t.cps) < 1e-9);
  check('B5 sentence stop holds its beat at a break',
    Math.abs((revealBudget('ab. cd', t) - revealBudget('abc cd', t)) - t.pausePunct) < 1e-9);
  check('B6 clause break holds the shorter beat',
    Math.abs((revealBudget('ab, cd', t) - revealBudget('abc cd', t)) - t.pauseComma) < 1e-9);
  check('B7 "1.5" never stutters (mid-token stop is silent)',
    Math.abs(revealBudget('1.5', t) - 3 / t.cps) < 1e-9);
  check('B8 the em-dash pause rides a true break',
    Math.abs((revealBudget('a — b', t) - revealBudget('a x b', t)) - t.pauseComma) < 1e-9);
  check('B9 doubled cps halves a plain budget',
    Math.abs(revealBudget(plain, { ...t, cps: 40 }) * 2 - revealBudget(plain, t)) < 1e-9);
  check('B10 cps<=0 is the instant plate',
    revealedChars(text, 0, { ...t, cps: 0 }) === text.length);
}

// --- C. THE FOLD ------------------------------------------------------------
console.log('C. THE FOLD');
{
  const base: SpeechTuning = {
    maxWidth: 100, font: 'f', lineHeight: 10, padX: 1, padY: 1, cornerR: 1,
    tailW: 4, tailH: 3, lift: 10, bg: 'b', edgeAlpha: 0.5,
    typing: { cps: 10, pausePunct: 0.2, pauseComma: 0.1, caret: true },
  };
  const plainR = resolveSpeech(base);
  check('C1 no styles = the base, typing on',
    plainR.maxWidth === 100 && plainR.typing.cps === 10 && !plainR.typingOff);
  check('C2 the fold never aliases the base typing object',
    plainR.typing !== base.typing);
  const defOff = resolveSpeech(base, { typing: false });
  check('C3 a def may opt its kind out of typing',
    defOff.typingOff && defOff.typing.cps === 10);
  const reopened = resolveSpeech(base, { typing: false }, { typing: { cps: 50 } });
  check('C4 a later rung re-opens typing with its own pace',
    !reopened.typingOff && reopened.typing.cps === 50 && reopened.typing.pausePunct === 0.2);
  const scalar = resolveSpeech(base, { maxWidth: 120 }, { maxWidth: 140, lift: 22 });
  check('C5 most specific scalar wins, the rest fall through',
    scalar.maxWidth === 140 && scalar.lift === 22 && scalar.lineHeight === 10);
  resolveSpeech(base, { typing: { cps: 99 } });
  check('C6 the fold mutates no input', base.typing.cps === 10 && base.maxWidth === 100);
}

// --- D. THE SAME-VIEW GATE --------------------------------------------------
console.log('D. THE SAME-VIEW GATE (roomVeil veiledAtVolume — the drawn contract)');
{
  const frac = 0.88;
  const inn: ConfineStructure = {
    id: 'inn', confineVision: true,
    roofs: [{ x: 0, y: 0, w: 200, h: 120 }],
    doors: [{
      pos: { x: 100, y: 120 }, normal: { x: 0, y: 1 },
      door: { open: false, cells: { x: 90, y: 112, w: 20, h: 16 } },
    }],
  };
  const vol = roomVolume(inn);
  check('D1 the speaker inside the room reads UNVEILED (her bubble shows)',
    veiledAtVolume(vol, frac, { x: 100, y: 40 }) === 0);
  check('D2 the ground her text hangs over reads VEILED — the reported bug\'s '
    + 'shape; the WORD LAYER above the wash is why the line survives',
    veiledAtVolume(vol, frac, { x: 100, y: -40 }) === frac);
  check('D3 an outsider beyond a CLOSED door reads veiled (no talk through walls)',
    veiledAtVolume(vol, frac, { x: 100, y: 170 }) === frac);
  check('D4 the closed door\'s own cells stay seen (the room\'s one promise)',
    veiledAtVolume(vol, frac, { x: 100, y: 118 }) === 0);
  const openInn: ConfineStructure = {
    ...inn,
    doors: [{ ...inn.doors[0], door: { ...inn.doors[0].door, open: true } }],
  };
  const openVol = roomVolume(openInn);
  check('D5 an OPEN door spills sight past the frame',
    veiledAtVolume(openVol, frac, { x: 100, y: 160 }) === 0);
  check('D6 the spill is a disc, not a corridor to everywhere',
    veiledAtVolume(openVol, frac, { x: 100, y: 220 }) === frac);
  check('D7 no confinement, no veil (frac 0 gate)',
    veiledAtVolume(vol, 0, { x: 100, y: -40 }) === 0);
  const room: ConfineRoom = {
    rects: [{ x: 0, y: 0, w: 200, h: 120 }], doors: [],
    windows: [{ x: 196, y: 50, w: 8, h: 20, nx: 1, ny: 0 }],
    enclosed: true,
  };
  const roomVol = roomVolume(inn, room);
  check('D8 a window cell stays seen in rooms mode',
    veiledAtVolume(roomVol, frac, { x: 200, y: 60 }) === 0);
  check('D9 the window spills a short look at the street',
    veiledAtVolume(roomVol, frac, { x: 226, y: 60 }) === 0
    && veiledAtVolume(roomVol, frac, { x: 260, y: 60 }) === frac);
}

// --- E. SHIPPED DIALS -------------------------------------------------------
console.log('E. SHIPPED DIALS (VIS_CFG.speech + the live longest line)');
{
  const c = VIS_CFG.speech;
  check('E1 wrap width is a real bubble, not a ribbon',
    c.maxWidth >= 80 && c.maxWidth <= 400, `${c.maxWidth}`);
  check('E2 line/pad/tail geometry positive',
    c.lineHeight > 0 && c.padX >= 0 && c.padY >= 0 && c.tailW > 0 && c.tailH > 0 && c.lift > 0);
  check('E3 typing pace sane', c.typing.cps > 0 && c.typing.cps <= 200);
  check('E4 stop beat >= clause beat >= 0',
    c.typing.pausePunct >= c.typing.pauseComma && c.typing.pauseComma >= 0);
  check('E5 edge alpha in [0,1]', c.edgeAlpha >= 0 && c.edgeAlpha <= 1);
  // Mireille's longest authored lesson line, at the shipped width under a
  // Verdana-11 average-advance proxy: must wrap to multiple fitting lines.
  const longest = 'Open your inventory (I), love — find your flasks under Skill '
    + 'Gems. Press them to memory.';
  const proxy = (s: string): number => s.length * 6.2;
  const lines = wrapSpeech(longest, c.maxWidth, proxy);
  check('E6 the longest live line wraps at the shipped width',
    lines.length >= 2 && lines.every(l => proxy(l) <= c.maxWidth || !l.includes(' ')),
    `${lines.length} lines`);
  const budget = revealBudget(longest, c.typing);
  check('E7 the longest live line tells inside a patient breath (1s..12s)',
    budget > 1 && budget < 12, `${budget.toFixed(2)}s`);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
