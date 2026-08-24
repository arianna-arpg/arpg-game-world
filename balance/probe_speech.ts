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
//   F. NAME TOKEN — '{name}' expands at the display seam; blank/whitespace
//      names degrade to 'Traveller'; token-free text passes byte-identical;
//      the seasoned lines wrap whole under a long name.
//   G. RENOWN GATE — heroKnown() on the real engine (the one section that
//      boots it): run-scope by law (a fresh world AND an account-stamped
//      account both start unknown), the three prompt sites speak their
//      pre-renown words until the run stamp and the {name} faces after,
//      and the unknown-state main.ts feed (the blank name) degrades any
//      stray token to the honest address.
//
//   npx tsx balance/probe_speech.ts

import {
  resolveSpeech, revealedChars, revealBudget, wrapSpeech, resolveNameTokens,
  dodgeSpeechBox, type SpeechRect, type SpeechTuning,
} from '../src/render/vis/speech';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { bumpLedger } from '../src/packages/ledger';
import { LEDGER_HERO_RENOWNED, type World } from '../src/engine/world';
import { QUESTS } from '../src/quests/defs';
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

// --- F. THE NAME TOKEN ------------------------------------------------------
console.log('F. THE NAME TOKEN (resolveNameTokens — the hero\'s address at the display seam)');
{
  check('F1 the token expands to the hero\'s name',
    resolveNameTokens('Linger, {name} — I have work for you…', 'Maro')
      === 'Linger, Maro — I have work for you…');
  check('F2 every occurrence expands in one pass',
    resolveNameTokens('{name}, {name}!', 'Maro') === 'Maro, Maro!');
  check('F3 a missing name degrades to the honest address, never a brace',
    resolveNameTokens('Linger, {name}.', undefined) === 'Linger, Traveller.'
    && resolveNameTokens('{name}', '') === 'Traveller');
  check('F4 a whitespace-only name degrades the same way',
    resolveNameTokens('{name}', '   ') === 'Traveller');
  check('F5 token-free text passes through byte-identical',
    resolveNameTokens('No work for you yet, traveller.', 'Maro')
      === 'No work for you yet, traveller.');
  check('F6 only {name} is claimed — other braces stay legible',
    resolveNameTokens('{namex} {bind:panelInv} {name}less', 'Maro')
      === '{namex} {bind:panelInv} Maroless');
  // A name LENGTHENS lines — every live name-bearing prompt must still wrap
  // whole at the shipped width with a LONG name standing in (the wrap-law
  // duty of the seasoning; mirrors of the world.ts innkeep/questGiver lines,
  // the way every probe mirrors content).
  const seasoned = [
    '{name}, is it? Come here — I keep flasks for new faces.',
    'Linger, {name} — I have work for you…',
    'Linger — a CALLING awaits you, {name}.',
  ];
  const longName = 'Aleximandrastra the Unbowed';
  const proxy = (s: string): number => s.length * 6.2;
  for (const [i, line] of seasoned.entries()) {
    const shown = resolveNameTokens(line, longName);
    const lines = wrapSpeech(shown, VIS_CFG.speech.maxWidth, proxy);
    check(`F7.${i} a seasoned line wraps whole under a long name`,
      lines.every(l => proxy(l) <= VIS_CFG.speech.maxWidth || !l.includes(' '))
      && lines.join(' ') === shown, `${lines.length} lines`);
  }
}

// --- G. THE RENOWN GATE -----------------------------------------------------
console.log('G. THE RENOWN GATE (heroKnown — the name arrives with the deed, run-scope)');
{
  bootSimEngine();
  // Town NPCs, spawned the way probe_mireille does (createMonster + push),
  // close enough that the live dist+reach reads pass — the rig never steps
  // the world, so no dwell fires and the staged states hold still.
  const spawn = (w: World, defId: string): void => {
    const npc = w.createMonster(defId, 1, 'player');
    npc.pos = { x: w.player.pos.x + 60, y: w.player.pos.y };
    w.actors.push(npc);
  };

  // The innkeep's greeting — the SAME world-state read twice, only renown
  // flipping between reads: the line changing at the stamp IS the feature.
  const A = makeSimWorld('tamer', 77031);
  spawn(A, 'townsfolk_innkeep');
  check('G1 a fresh world knows no hero', !A.heroKnown());
  check('G2 unknown: the original stranger\'s welcome, token-free',
    A.innkeepPrompt() === 'Come here, dear — I keep flasks for new faces.',
    `"${A.innkeepPrompt()}"`);
  bumpLedger(A.account.ledger, LEDGER_HERO_RENOWNED);
  check('G3 ACCOUNT renown never knows a fresh hero (run scope is the law)',
    !A.heroKnown());
  bumpLedger(A.ledger, LEDGER_HERO_RENOWNED);
  check('G4 the run stamp makes the hero known', A.heroKnown());
  check('G5 known: the same owed gift now greets by name',
    A.innkeepPrompt() === '{name}, is it? Come here — I keep flasks for new faces.',
    `"${A.innkeepPrompt()}"`);

  // The quartermaster's work offer (level 5 — exactly one acceptable quest,
  // so the offer shuffle draws nothing and the read stays deterministic).
  const B = makeSimWorld('tamer', 77032);
  spawn(B, 'townsfolk_questgiver');
  B.player.level = 5;
  check('G6 unknown: work offered in the original words',
    B.questGiverPrompt() === 'Linger, and I have work for you…',
    `"${B.questGiverPrompt()}"`);
  bumpLedger(B.ledger, LEDGER_HERO_RENOWNED);
  check('G7 known: work offered by name',
    B.questGiverPrompt() === 'Linger, {name} — I have work for you…',
    `"${B.questGiverPrompt()}"`);

  // The CALLING (vocation choice): an ordinary chain's class at its offer
  // level, every non-vocation quest marked done (derived from the registry,
  // never a hand list) so the choice line is the one on offer.
  const C = makeSimWorld('warrior', 77033);
  spawn(C, 'townsfolk_questgiver');
  C.player.level = 30;
  for (const q of Object.values(QUESTS)) if (!q.vocation) C.completedQuests.add(q.id);
  check('G8 unknown: the CALLING in the original words',
    C.questGiverPrompt() === 'Linger — a CALLING awaits you.',
    `"${C.questGiverPrompt()}"`);
  bumpLedger(C.ledger, LEDGER_HERO_RENOWNED);
  check('G9 known: the CALLING by name',
    C.questGiverPrompt() === 'Linger — a CALLING awaits you, {name}.',
    `"${C.questGiverPrompt()}"`);

  // THE COMPOSITION (main.ts's wire, mirrored — getPlayerName returns ''
  // while unknown): any token that DOES reach the seam under an unknown
  // hero degrades to the honest address, so a future unbranched line can
  // never leak a name the world has not learned.
  check('G10 the unknown feed degrades a stray token to Traveller',
    resolveNameTokens('{name}, is it? Come here — I keep flasks for new faces.', '')
      === 'Traveller, is it? Come here — I keep flasks for new faces.');

  // Wrap law under BOTH faces: the restored pre-renown lines must wrap
  // whole at the shipped width like their seasoned twins (F7 holds those).
  const originals = [
    'Come here, dear — I keep flasks for new faces.',
    'Linger, and I have work for you…',
    'Linger — a CALLING awaits you.',
  ];
  const proxy = (s: string): number => s.length * 6.2;
  for (const [i, line] of originals.entries()) {
    const lines = wrapSpeech(line, VIS_CFG.speech.maxWidth, proxy);
    check(`G11.${i} a pre-renown line wraps whole at the shipped width`,
      lines.every(l => proxy(l) <= VIS_CFG.speech.maxWidth || !l.includes(' '))
      && lines.join(' ') === line, `${lines.length} lines`);
  }
}

// --- H. PLACEMENT LAW (dodgeSpeechBox) --------------------------------------
// A bubble under an open DOM pane slides to visible ground: unobstructed is
// untouched byte-identical, slid boxes stand margin-clear of EVERY pane and
// inside the view, the nearest clean candidate wins, and a fully-covered
// view moves nothing (a hidden bubble beats one squatting on a pane).
console.log('H. PLACEMENT LAW');
{
  const view: SpeechRect = { x: 0, y: 0, w: 1000, h: 600 };
  const m = 10;
  const clearOf = (p: { x: number; y: number }, box: SpeechRect, obs: SpeechRect[]): boolean =>
    obs.every(o => p.x + box.w <= o.x - m || p.x >= o.x + o.w + m
      || p.y + box.h <= o.y - m || p.y >= o.y + o.h + m);
  const inView = (p: { x: number; y: number }, box: SpeechRect): boolean =>
    p.x >= view.x && p.y >= view.y
    && p.x + box.w <= view.x + view.w && p.y + box.h <= view.y + view.h;

  // H1: unobstructed → byte-identical position (panes elsewhere on screen).
  const box: SpeechRect = { x: 120, y: 80, w: 160, h: 60 };
  const far: SpeechRect[] = [{ x: 700, y: 300, w: 250, h: 250 }];
  const h1 = dodgeSpeechBox(box, far, view, m);
  check('H1 unobstructed is untouched', h1.x === box.x && h1.y === box.y);

  // H2: a centered pane over the box → slid clean of it, inside the view.
  const pane: SpeechRect = { x: 300, y: 100, w: 400, h: 400 };
  const under: SpeechRect = { x: 420, y: 250, w: 160, h: 60 };
  const h2 = dodgeSpeechBox(under, [pane], view, m);
  check('H2 an obstructed box slides clean of the pane',
    clearOf(h2, under, [pane]) && inView(h2, under),
    `→ (${h2.x},${h2.y})`);

  // H3: nearest wins — a box near the pane's LEFT edge exits leftward.
  const nearLeft: SpeechRect = { x: 310, y: 250, w: 160, h: 60 };
  const h3 = dodgeSpeechBox(nearLeft, [pane], view, m);
  check('H3 the nearest clean candidate wins (left exit for a left-lean box)',
    h3.x + nearLeft.w <= pane.x - m && h3.y === nearLeft.y,
    `→ (${h3.x},${h3.y})`);

  // H4: two panes (inventory + flanking drawer) → clean of BOTH at once.
  const drawer: SpeechRect = { x: 60, y: 120, w: 230, h: 360 };
  const h4 = dodgeSpeechBox(under, [pane, drawer], view, m);
  check('H4 two panes: the slide clears both (the union wall)',
    clearOf(h4, under, [pane, drawer]) && inView(h4, under),
    `→ (${h4.x},${h4.y})`);

  // H5: panes covering the whole view → no clean ground, no move.
  const wall: SpeechRect[] = [{ x: -50, y: -50, w: 1100, h: 700 }];
  const h5 = dodgeSpeechBox(under, wall, view, m);
  check('H5 no clean ground moves nothing', h5.x === under.x && h5.y === under.y);

  // H6: the margin is honored — the slid edge sits >= margin off the pane.
  const gap = Math.min(
    Math.abs(pane.x - (h2.x + under.w)), Math.abs(h2.x - (pane.x + pane.w)),
    Math.abs(pane.y - (h2.y + under.h)), Math.abs(h2.y - (pane.y + pane.h)));
  check('H6 the slid box keeps the margin clearance', gap >= m, `gap=${gap}`);

  // H7: the shipped dials exist and stay sane.
  const d = VIS_CFG.speech.dodge;
  check('H7 shipped dodge dials are sane', d.margin >= 0 && d.edge >= 0);

  // H8: THE CORNER CASE (the live regression that grew the lattice) — a
  // centered pane, a flanking drawer, and a bottom hotbar leave clean
  // ground ONLY in a corner pocket no single-axis slide can reach (below
  // the pane AND past the drawer); the lattice must find it. Shape taken
  // from the real 1280×720 screen: inventory + SKILLS drawer + hotbar.
  const screen: SpeechRect = { x: 8, y: 8, w: 1264, h: 704 };
  const inv: SpeechRect = { x: 604, y: 56, w: 660, h: 398 };
  const drw: SpeechRect = { x: 243, y: 57, w: 360, h: 499 };
  const bar: SpeechRect = { x: 403, y: 628, w: 474, h: 54 };
  const bub: SpeechRect = { x: 448, y: 194, w: 228, h: 117 };
  const h8 = dodgeSpeechBox(bub, [inv, drw, bar], screen, m);
  const clean = clearOf(h8, bub, [inv, drw, bar]);
  check('H8 the corner pocket is found (two-axis slide)',
    clean && (h8.x !== bub.x || h8.y !== bub.y)
    && h8.x >= screen.x && h8.y >= screen.y
    && h8.x + bub.w <= screen.x + screen.w && h8.y + bub.h <= screen.y + screen.h,
    `→ (${Math.round(h8.x)},${Math.round(h8.y)})`);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
