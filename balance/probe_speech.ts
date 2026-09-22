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
//   H. PLACEMENT LAW — dodgeSpeechBox: a bubble under an open pane slides to
//      the nearest clean ground; unobstructed is untouched byte-identical.
//   I. LAYOUT LAW — layoutSpeechSeats: bubbles never cover one another —
//      two speakers 20 px apart resolve disjoint, tails still aimed, the
//      front speaker home + the back one stacked ABOVE, a third frame of
//      the same inputs a fixed point, the stick / damping / view wall /
//      pane / crowd / order band / 'queue' clauses, and purity.
//   J. THE TRANSIENT TELLING — engine/speech.ts (the fabric's WORLD half):
//      the pure fold (a fresh approach begins the telling, the whole window
//      stands wherever the hero walks, it disperses, the tongue is held for
//      the cooldown on the world clock, standing there never re-tells, a
//      stale memory forgets nearness, Infinity is the perpetual dial,
//      purity, shipped dials) and THE LIVE INN through World.residentPrompt
//      itself — the patron shows on approach, holds exactly its window, hides
//      while the hero stays, stays hidden out-and-back inside the cooldown,
//      tells again after it; a rostered guest rides the same clock; and
//      Mireille's lesson prompt is EXEMPT (stands as long as the hero does).
//
//   npx tsx balance/probe_speech.ts

import {
  resolveSpeech, revealedChars, revealBudget, wrapSpeech, resolveNameTokens,
  dodgeSpeechBox, layoutSpeechSeats, speechTailBase,
  type SpeechRect, type SpeechTuning, type SpeechLayoutTuning,
  type SpeechSeat, type SpeechSeatMemory, type SpeechSeatResult,
} from '../src/render/vis/speech';
import { bootSimEngine, classById, makeSimWorld } from '../src/sim/arena';
import { bumpLedger } from '../src/packages/ledger';
import { LEDGER_HERO_RENOWNED, World } from '../src/engine/world';
import { SPEECH_CFG, speechTell, speechWindowFor, type SpeechMemory } from '../src/engine/speech'; // rig J — THE TRANSIENT TELLING
import { dwellFocus, type DwellFocus } from '../src/engine/dwellFocus';
import { SPEECH_ATTENTION_CFG, speechAttentionFor } from '../src/data/speechAttention';
import { makeSpeakerRow, type SpeechSpeakerRow } from '../src/engine/speechGrammar';
import { MONSTERS } from '../src/data/monsters';
import { DialogueSession, dialoguePages, type DialogueOffer } from '../src/engine/dialogue';
import { resetActorIdCounter } from '../src/engine/actor';
import { buildManifest } from '../src/packages/manifest';
import { makeAccount } from '../src/meta/account';
import { CLASSES } from '../src/data/classes';
import { START_ZONE } from '../src/data/zones';
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

// --- I. THE LAYOUT LAW (layoutSpeechSeats) ----------------------------------
// Bubbles never cover ONE ANOTHER: two speakers 20 px apart resolve to
// disjoint boxes (the gap held), every tail still leaves its box aimed at
// its own speaker, the front speaker holds home while the one behind stacks
// ABOVE, a lone in-view bubble is untouched byte-identical, the third frame
// of unchanged inputs is a fixed point (stability), the stick swallows a
// neighbour's drift, the damping eases a re-seat and snaps at the settle,
// the view wall keeps a box on screen, a pane (fixed) is avoided, a crowd
// of six resolves pairwise disjoint within reach, the order band keeps two
// passing strollers from flip-flopping, 'queue' seats the first queued, the
// tail base clamps inside the box, and the fold mutates nothing.
console.log('I. THE LAYOUT LAW (layoutSpeechSeats — bubbles never cover one another)');
{
  const C = VIS_CFG.speech;
  const L: SpeechLayoutTuning = { ...C.layout, reach: { ...C.layout.reach } };
  const view: SpeechRect = { x: 0, y: 0, w: 1200, h: 700 };
  const R = 14; // a townsfolk radius
  // A seat the renderer's way: the box hangs centred over the tip, tailH
  // above it, the tip `lift` above the scalp.
  const seat = (id: number, sx: number, sy: number, prev?: SpeechSeatMemory,
    w = 160, h = 48): SpeechSeat => {
    const tipX = sx, tipY = sy - R - C.lift;
    return { id, tipX, tipY, x: tipX - w / 2, y: tipY - C.tailH - h, w, h, prev };
  };
  const box = (r: SpeechSeatResult, s: SpeechSeat): SpeechRect => ({ x: r.x, y: r.y, w: s.w, h: s.h });
  const apart = (a: SpeechRect, b: SpeechRect, gap: number): boolean =>
    a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x
    || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y;
  const allApart = (seats: SpeechSeat[], res: SpeechSeatResult[]): boolean => {
    for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) {
      if (!apart(box(res[i], seats[i]), box(res[j], seats[j]), L.gap)) return false;
    }
    return true;
  };
  const tailAims = (r: SpeechSeatResult, s: SpeechSeat): boolean => {
    const base = speechTailBase(r.x, s.w, s.h, C.cornerR, s.tipX, C.tailW);
    return s.tipY > r.y + s.h + 1 && base >= r.x && base + C.tailW <= r.x + s.w;
  };
  const remember = (seats: SpeechSeat[], res: SpeechSeatResult[]): SpeechSeat[] =>
    seats.map((s, i) => ({ ...s, prev: res[i] }));
  const same = (a: SpeechSeatResult[], b: SpeechSeatResult[]): boolean =>
    a.every((r, i) => r.x === b[i].x && r.y === b[i].y && r.dx === b[i].dx
      && r.dy === b[i].dy && r.tx === b[i].tx && r.ty === b[i].ty);
  const k = L.damping; // one 60 Hz frame's ease

  const lone = [seat(1, 600, 400)];
  const l1 = layoutSpeechSeats(lone, view, [], L, 1);
  check('I1 a lone in-view bubble is untouched byte-identical',
    l1[0].x === lone[0].x && l1[0].y === lone[0].y && l1[0].dx === 0 && l1[0].dy === 0);

  // The pair, 20 px apart; #2 stands 4 px behind #1.
  const pair = [seat(1, 600, 400), seat(2, 620, 396)];
  const f1 = layoutSpeechSeats(pair, view, [], L, 1);
  check('I2 two speakers 20 px apart resolve to DISJOINT boxes (the gap held)',
    allApart(pair, f1), JSON.stringify(f1.map(r => [r.x, r.y])));
  check('I3 both tails still leave their boxes aimed at their own speakers',
    tailAims(f1[0], pair[0]) && tailAims(f1[1], pair[1]));
  check('I4 the front speaker holds home; the one behind stacks ABOVE, no sideways travel',
    f1[0].dx === 0 && f1[0].dy === 0 && f1[1].dy < 0 && f1[1].dx === 0,
    `front (${f1[0].dx},${f1[0].dy}) back (${f1[1].dx},${f1[1].dy})`);
  check('I5 the lifted box clears the front box by exactly the gap',
    Math.abs((f1[0].y - (f1[1].y + pair[1].h)) - L.gap) < 1e-9);

  const f2 = layoutSpeechSeats(remember(pair, f1), view, [], L, k);
  const f3 = layoutSpeechSeats(remember(pair, f2), view, [], L, k);
  check('I6 a third frame of the same inputs yields the same placement (a fixed point)',
    same(f1, f2) && same(f2, f3));

  // THE STICK: the front speaker steps down 5 px — the back bubble's old
  // seat is still clean, so it holds; stick 0 would re-seat it.
  const stepped = [seat(1, 600, 405, f2[0]), { ...pair[1], prev: f2[1] }];
  const f4 = layoutSpeechSeats(stepped, view, [], L, k);
  const f4loose = layoutSpeechSeats(stepped, view, [], { ...L, stick: 0 }, k);
  check('I7 the stick holds a settled seat through a neighbour\'s 5 px step (stick 0 re-seats)',
    f4[1].ty === f2[1].ty && f4loose[1].ty !== f2[1].ty && allApart(stepped, f4),
    `stick ${f4[1].ty} vs loose ${f4loose[1].ty}`);

  // THE DAMPING: the neighbour leaves — the lifted bubble eases home, then snaps.
  const parted = [seat(1, 300, 400, f2[0]), { ...pair[1], prev: f2[1] }];
  const g1 = layoutSpeechSeats(parted, view, [], L, k);
  check('I8a with the neighbour gone the target is home and the shift eases part way',
    g1[1].ty === 0 && g1[1].dy < 0 && g1[1].dy > f2[1].dy, `dy ${g1[1].dy} from ${f2[1].dy}`);
  let cur = g1, frames = 1;
  while (cur[1].dy !== 0 && frames < 120) {
    cur = layoutSpeechSeats(remember(parted, cur), view, [], L, k); frames++;
  }
  check('I8b the ease converges and SNAPS exactly home inside the settle',
    cur[1].dy === 0 && frames < 60, `${frames} frames`);
  const snap = layoutSpeechSeats(parted, view, [], { ...L, damping: 1 }, 1);
  check('I8c damping 1 is the snap', snap[1].dy === 0 && snap[1].dx === 0);

  // THE VIEW WALL: a speaker at the screen's top.
  const high = [seat(1, 600, 60)];
  const v1 = layoutSpeechSeats(high, view, [], L, 1);
  check('I9 a bubble that would hang above the screen is walled inside the view',
    high[0].y < view.y && v1[0].y === view.y && v1[0].x === high[0].x);

  // A FIXED obstacle (an open pane) is avoided like a neighbour.
  const pane: SpeechRect = { x: 500, y: 250, w: 200, h: 120 };
  const p1 = layoutSpeechSeats(lone, view, [pane], L, 1);
  check('I10 a pane over the home is dodged (clear by the gap, lifted, within reach)',
    apart(box(p1[0], lone[0]), pane, L.gap) && p1[0].dy < 0
    && Math.abs(p1[0].dy) <= L.reach.up && Math.abs(p1[0].dx) <= L.reach.side,
    `→ (${p1[0].dx},${p1[0].dy})`);

  // THE CROWD: six speakers 30 px apart on one row.
  const crowd = [1, 2, 3, 4, 5, 6].map(i => seat(i, 300 + 30 * i, 400));
  const c1 = layoutSpeechSeats(crowd, view, [], L, 1);
  check('I11a six speakers 30 px apart resolve pairwise disjoint', allApart(crowd, c1),
    JSON.stringify(c1.map(r => [r.dx, r.dy])));
  check('I11b every seat stays within reach of its speaker and inside the view',
    c1.every((r, i) => Math.abs(r.dx) <= L.reach.side && Math.abs(r.dy) <= L.reach.up
      && r.x >= view.x && r.y >= view.y
      && r.x + crowd[i].w <= view.x + view.w && r.y + crowd[i].h <= view.y + view.h));
  check('I11c every tail still aims at its own speaker', c1.every((r, i) => tailAims(r, crowd[i])));
  check('I11d the crowd is a fixed point too',
    same(c1, layoutSpeechSeats(remember(crowd, c1), view, [], L, k)));

  // THE ORDER BAND: the back stroller steps 6 px forward (inside the band)
  // — the stack holds; 24 px past — the deeper speaker takes home.
  const drift = [{ ...pair[0], prev: f2[0] }, seat(2, 620, 402, f2[1])];
  const d1 = layoutSpeechSeats(drift, view, [], L, k);
  check('I12a inside the order band the stacking order holds (no flip-flop as strollers pass)',
    d1[0].ty === 0 && d1[1].ty < 0, `${d1[0].ty} / ${d1[1].ty}`);
  const crossed = [{ ...pair[0], prev: d1[0] }, seat(2, 620, 420, d1[1])];
  const d2 = layoutSpeechSeats(crossed, view, [], L, k);
  check('I12b past the band the deeper speaker takes home and the other lifts',
    d2[1].ty === 0 && d2[0].ty < 0, `${d2[0].ty} / ${d2[1].ty}`);

  // 'queue': the first queued holds home even standing behind.
  const queued = [seat(1, 600, 396), seat(2, 620, 400)];
  const q1 = layoutSpeechSeats(queued, view, [], { ...L, order: 'queue' }, 1);
  const q2 = layoutSpeechSeats(queued, view, [], L, 1);
  check('I13 order \'queue\' seats the first queued at home; \'front\' the deeper speaker',
    q1[0].dy === 0 && q1[1].dy < 0 && q2[1].dy === 0 && q2[0].dy < 0);

  const before = JSON.stringify([pair, view, L]);
  const r1 = layoutSpeechSeats(pair, view, [], L, 1);
  const r2 = layoutSpeechSeats(pair, view, [], L, 1);
  check('I14 the fold is deterministic and mutates nothing it is handed',
    JSON.stringify(r1) === JSON.stringify(r2) && JSON.stringify([pair, view, L]) === before);

  const tb = speechTailBase(100, 160, 48, C.cornerR, 180, C.tailW);
  check('I15a the tail base centres on the tip when the box allows', tb === 180 - C.tailW / 2);
  const tbEdge = speechTailBase(100, 160, 48, C.cornerR, 500, C.tailW);
  check('I15b past the box the base clamps off the rounded corner, inside the box',
    tbEdge === 100 + 160 - C.cornerR - C.tailW);

  check('I16 shipped layout dials are sane',
    C.layout.gap >= 0 && C.layout.lateralWeight > 0 && C.layout.reach.up > 0
    && C.layout.reach.side > 0 && C.layout.stick >= 0 && C.layout.orderBand >= 0
    && C.layout.damping > 0 && C.layout.damping <= 1 && C.layout.settle >= 0
    && (C.layout.order === 'front' || C.layout.order === 'queue'));
}

// --- J. THE TRANSIENT TELLING (engine/speech.ts) ----------------------------
console.log('J. THE TRANSIENT TELLING (speechTell — a fresh approach, a held window, a held tongue)');
{
  // THE PURE FOLD — one speaker, one clock, the window {hold 3 s, cooldown
  // 10 s}: free again at t = 13 from a telling begun at t = 0.
  const W = { holdSec: 3, cooldownSec: 10 };
  const cfg: typeof SPEECH_CFG = {
    window: { holdSec: 4, holdPerChar: 0.05, cooldownSec: 24 },
    lanes: { seat: { cooldownSec: 12 } },
    staleSec: 1,
  };
  const f1 = speechWindowFor('folk', 'x'.repeat(40), cfg);
  const f2 = speechWindowFor('seat', 'x'.repeat(40), cfg);
  check('J1 the window folds base ← lane, the hold grown by THE READING ALLOWANCE per character',
    f1.holdSec === 6 && f1.cooldownSec === 24 && f2.holdSec === 6 && f2.cooldownSec === 12,
    `${f1.holdSec}/${f1.cooldownSec} ${f2.holdSec}/${f2.cooldownSec}`);
  check('J1b the fold never mutates the config it reads',
    cfg.window.holdSec === 4 && cfg.lanes.seat?.cooldownSec === 12 && cfg.lanes.seat?.holdSec === undefined);

  const r2 = speechTell(undefined, true, 0, W);
  check('J2 THE FRESH APPROACH — the first near read begins the telling at once',
    r2.telling && r2.mem.spokeAt === 0 && r2.mem.holdSec === 3 && r2.mem.near && r2.mem.readAt === 0);
  const r2b = speechTell(undefined, false, 0, W);
  check('J2b a far first read tells nothing and stamps no clock', !r2b.telling && r2b.mem.spokeAt === null);

  const r3 = speechTell(r2.mem, false, 1, W);
  check('J3 THE WHOLE TELLING — inside the window the line stands though the hero walked off', r3.telling);

  const r4 = speechTell(speechTell(r2.mem, true, 2.5, W).mem, true, 3, W);
  check('J4 at the window\'s end the line disperses — the hero still standing there earns nothing',
    !r4.telling && r4.mem.spokeAt === 0);

  let m = speechTell(r4.mem, false, 3.5, W).mem;   // out
  const r5 = speechTell(m, true, 4, W);            // back in — an edge, inside the cooldown
  check('J5 THE HELD TONGUE — stepping out and back in inside the cooldown earns nothing',
    !r5.telling && r5.mem.spokeAt === 0);

  m = r5.mem;
  let told = false;
  for (let t = 4.5; t <= 20; t += 0.5) { const s = speechTell(m, true, t, W); m = s.mem; told ||= s.telling; }
  check('J6 standing there through the cooldown never re-tells (the level is not the edge)', !told && m.spokeAt === 0);

  m = speechTell(m, false, 20.5, W).mem;
  const r7 = speechTell(m, true, 21, W);
  check('J7 a fresh approach after the cooldown tells again', r7.telling && r7.mem.spokeAt === 21 && r7.mem.holdSec === 3);

  // The cooldown counts from the WINDOW's end on the world clock, whether
  // or not the hero is there: begun at 0, hold 3, free at 13 exactly.
  const gone = speechTell(speechTell(undefined, true, 0, W).mem, false, 0.5, W).mem;
  const early = speechTell(gone, true, 12.99, W);
  const onTime = speechTell(gone, true, 13, W);
  check('J8 the cooldown runs from the window\'s end on the world clock, the hero away the while',
    !early.telling && onTime.telling && onTime.mem.spokeAt === 13);

  // THE STALE MEMORY: a speaker unread for longer than staleSec forgets the
  // hero was near — the next near read is a fresh approach; a LIVE memory
  // holds the level (no edge, no telling).
  const nearLast: SpeechMemory = { spokeAt: null, holdSec: 0, near: true, readAt: 0 };
  const stale = speechTell(nearLast, true, 5, W, 1);
  const live = speechTell(nearLast, true, 0.5, W, 1);
  check('J9 a stale memory forgets nearness (an unread speaker meets the next read as a fresh approach); a live one holds the level',
    stale.telling && !live.telling);

  const INF = { holdSec: Infinity, cooldownSec: 0 };
  const inf = speechTell(speechTell(undefined, true, 0, INF).mem, false, 1e6, INF);
  check('J10 holdSec Infinity is the old perpetual bubble as a dial (never disperses)', inf.telling);
  const mute = speechTell(undefined, true, 0, { holdSec: 0, cooldownSec: 5 });
  check('J10b a zero window tells nothing (the lane muted by data), the clock still stamped', !mute.telling && mute.mem.spokeAt === 0);

  const before = JSON.stringify(r2.mem);
  speechTell(r2.mem, false, 2, W); speechTell(r2.mem, true, 50, W);
  check('J11 the fold never mutates the memory it is handed', JSON.stringify(r2.mem) === before);

  check('J12 shipped SPEECH_CFG dials are sane (a real window, a real cooldown, a live memory, only known lanes)',
    SPEECH_CFG.window.holdSec > 0 && SPEECH_CFG.window.holdPerChar >= 0 && SPEECH_CFG.window.cooldownSec > 0
    && SPEECH_CFG.staleSec > 0
    && Object.keys(SPEECH_CFG.lanes).every(k => k === 'seat' || k === 'folk' || k === 'resident'));

  // THE LIVE INN — the real World, the real town, the patron's spoken seat,
  // World.residentPrompt the read (the same read the renderer polls each
  // frame): drawn == tested. Stood the way probe_towngrowth stands it.
  bootSimEngine();
  resetActorIdCounter();
  const account = makeAccount();
  for (const c of CLASSES) account.unlockedClasses.add(c.id);
  const manifest = buildManifest(account, 0x5eec);
  for (const p of manifest.packages) p.enabled = false;
  const w = new World(account, Object.freeze(manifest));
  w.createPlayer(classById('warrior'));
  w.loadZone(START_ZONE);
  const patron = w.actors.find(a => a.defId === 'townsfolk_patron');
  check('J13 the inn seats the patron (the spoken seat)', !!patron);
  if (patron) {
    const DT = 1 / 30;
    const beside = (a: { pos: { x: number; y: number }; tier?: number }): void => {
      w.player.pos.x = a.pos.x + 24; w.player.pos.y = a.pos.y + 24; w.player.tier = a.tier ?? 0;
    };
    const away = (a: { pos: { x: number; y: number } }): void => { w.player.pos.x = a.pos.x + 700; w.player.pos.y = a.pos.y + 500; };
    /** Step n frames, reading the prompt after each (the renderer's poll). */
    const run = (a: World['actors'][number], n: number): { shown: number; first: number; last: number } => {
      let shown = 0, first = -1, last = -1;
      for (let i = 0; i < n; i++) {
        w.update(DT);
        if (w.residentPrompt(a)) { shown++; if (first < 0) first = i; last = i; }
      }
      return { shown, first, last };
    };
    beside(patron);
    const line = w.residentPrompt(patron);
    check('J14 a fresh approach begins the telling at once (the read is the poll)', !!line && line.includes('stair'), `"${line}"`);
    const win = speechWindowFor('seat', line ?? '');
    const frames = Math.round(win.holdSec / DT);
    const a = run(patron, frames + 30);
    check('J15 drawn == tested — the line stands its whole window with no gap, then disperses though the hero still stands there',
      a.first === 0 && a.shown === a.last + 1 && Math.abs(a.shown - frames) <= 2 && a.shown < frames + 30,
      `${a.shown} shown of ~${frames}, last at frame ${a.last}`);
    away(patron); const b1 = run(patron, 30);
    beside(patron); const b2 = run(patron, 30);
    check('J16 THE HELD TONGUE — stepping out and back in inside the cooldown earns nothing', b1.shown === 0 && b2.shown === 0,
      `${b1.shown}/${b2.shown}`);
    away(patron); run(patron, Math.round(win.cooldownSec / DT));
    beside(patron);
    check('J17 a fresh approach after the cooldown tells again', !!w.residentPrompt(patron));
    // Every lane rides the one clock: a rostered guest (the 'folk' lane).
    const guest = w.actors.find(g => g.defId?.startsWith('folk_') && (beside(g), !!w.residentPrompt(g)));
    check('J18 a rostered guest speaks on approach (the folk lane)', !!guest, `${guest?.name ?? '-'}`);
    if (guest) {
      const gl = w.residentPrompt(guest) ?? '';
      const gw = speechWindowFor('folk', gl);
      const g = run(guest, Math.round(gw.holdSec / DT) + 30);
      check('J18b …stands its own window, then holds its tongue while the hero stays', g.first === 0 && g.shown === g.last + 1 && g.shown < g.last + 31,
        `${g.shown} shown, last at ${g.last}`);
    }
    // THE LESSON EXEMPTION: Mireille's counter prompt (the welcome gift, then
    // the flask lesson) is FUNCTIONAL — it stands as long as the hero does.
    const mir = w.actors.find(x => x.defId === 'townsfolk_innkeep');
    let stood = 0;
    if (mir) {
      w.player.pos.x = mir.pos.x; w.player.pos.y = mir.pos.y + 60; w.player.tier = 0;
      for (let i = 0; i < 600; i++) { w.update(DT); if (w.innkeepPrompt()) stood++; }
    }
    check('J19 THE LESSON EXEMPTION — Mireille\'s prompt stands every frame of a 20 s stand (the counters never ride this clock)',
      !!mir && stood === 600, `${stood}/600`);
  }
}

// K. The presentation seam: attention + telling clocks, as the renderer reads.
console.log('K. THE SPEECH FOCUS (idle dwell, priority, stability and cooldowns)');
{
  const tune = SPEECH_ATTENTION_CFG.focus;
  const ambient = { id: 2, distance: 10, ...speechAttentionFor('ambient', 'resident') };
  const service = { id: 3, distance: 90, ...speechAttentionFor('functional', 'innkeep') };
  let f = dwellFocus(undefined, [ambient, service], true, 0, tune)!;
  check('K1 a farther functional speaker wins, with no immediate bubble', f.id === 3 && !f.ready);
  check('K2 selection is independent of enumeration order',
    dwellFocus(undefined, [service, ambient], true, 0, tune)?.id === f.id);
  f = dwellFocus(f, [ambient, service], true, 0.41, tune)!;
  check('K3 sustained idle focus opens the functional prompt', f.ready);
  const peer = { ...ambient, id: 1, distance: 9 };
  let a = dwellFocus(undefined, [ambient], true, 0, tune)!;
  check('K4 a tiny distance change preserves the incumbent', dwellFocus(a, [peer, ambient], true, 0.1, tune)?.id === 2);
  check('K5 a materially closer peer changes focus and restarts dwell',
    dwellFocus(a, [{ ...peer, distance: 0 }, { ...ambient, distance: 40 }], true, 0.2, tune)?.since === 0.2);
  a = dwellFocus(a, [ambient], false, 0.3, tune)!;
  a = dwellFocus(a, [ambient], true, 0.6, tune)!;
  check('K6 acting resets an unfinished dwell', !a.ready && a.since === 0.6);
  check('K7 stale/unobserved time cannot complete dwell',
    !dwellFocus(a, [ambient], true, 5, tune)?.ready);
  check('K8 an action between polls also resets pending dwell',
    dwellFocus(a, [ambient], true, 1.1, tune, 0.7)?.since === 1.1);
  check('K9 completed lessons remain open during an action', !!dwellFocus(f, [service], false, 0.5, tune)?.ready);
  check('K10 no reachable candidate clears focus', dwellFocus(f, [], true, 0.5, tune) === undefined);
  const snapshot = JSON.stringify(f);
  dwellFocus(f, [ambient], true, 0.5, tune);
  check('K11 the focus fold does not mutate its inputs', JSON.stringify(f) === snapshot);
  for (const hz of [20, 30, 60, 144]) {
    let m: DwellFocus | undefined;
    let at = -1;
    for (let i = 0; i < hz * 2; i++) {
      m = dwellFocus(m, [ambient], true, i / hz, tune);
      if (m?.ready) { at = i / hz; break; }
    }
    check(`K12.${hz} dwell uses elapsed time at ${hz} Hz`, at >= ambient.dwellSec && at < ambient.dwellSec + 1 / hz + 1e-9);
  }
  SPEECH_ATTENTION_CFG.roles.resident = { priority: 25 };
  const folded = speechAttentionFor('ambient', 'resident', { dwellSec: 0.9 });
  delete SPEECH_ATTENTION_CFG.roles.resident;
  check('K13 purpose, role and definition compose', folded.priority === 25 && folded.dwellSec === 0.9);

  const w = makeSimWorld('warrior', 77034);
  const patron = w.createMonster('townsfolk_patron', 1, 'player');
  const keeper = w.createMonster('townsfolk_innkeep', 1, 'player');
  patron.pos = { x: w.player.pos.x + 30, y: w.player.pos.y };
  keeper.pos = { x: w.player.pos.x + 90, y: w.player.pos.y };
  w.actors.push(patron, keeper);
  const rows = (w as unknown as { speakerRows: Map<number, SpeechSpeakerRow> }).speakerRows;
  rows.set(patron.id, makeSpeakerRow(patron.id, 'Take the stairs.', 'seat', {
    key: 'focus:patron', company: 'focus', name: null, roles: ['patron'], own: ['Take the stairs.'],
  }));
  w.time = 10; w.localSeat.lastActedAt = 10;
  check('K14 walking into two ranges produces no immediate bubble', w.npcSpeechView().length === 0);
  const poll = (seconds: number) => {
    let view = w.npcSpeechView();
    for (let i = 0; i < Math.ceil(seconds * 60); i++) { w.time += 1 / 60; view = w.npcSpeechView(); }
    return view;
  };
  let view = poll(0.3);
  check('K15 input grace and speech dwell both apply', view.length === 0);
  view = poll(0.5);
  check('K16 Mireille beats the closer patron in the real world seam', view.length === 1 && view[0].a === keeper);
  w.actors.reverse();
  check('K17 reversing real actor order cannot change the speaker', w.npcSpeechView()[0]?.a === keeper);
  const old = MONSTERS[patron.defId!].speechAttention;
  MONSTERS[patron.defId!].speechAttention = { priority: 200 };
  check('K18 a data override changes focus but earns a new dwell', w.npcSpeechView().length === 0);
  view = poll(0.7);
  check('K19 the newly selected patron speaks its first authored line', view.length === 1 && view[0].text === 'Take the stairs.');
  const win = speechWindowFor('seat', view[0]?.text ?? '');
  view = poll(win.holdSec + win.cooldownSec + 1);
  check('K20 standing through window and cooldown never repeats', view.length === 0);
  const home = { ...w.player.pos };
  w.player.pos.x -= 500; poll(0.1); w.player.pos = { ...home };
  check('K21 returning after cooldown still requires a fresh dwell', w.npcSpeechView().length === 0);
  check('K22 the fresh dwell admits another line', poll(0.7).some(x => x.a === patron));
  w.player.pos.x -= 500; poll(win.holdSec + 1); w.player.pos = { ...home };
  check('K23 stepping out/back during cooldown cannot bypass it', poll(0.7).length === 0);
  MONSTERS[patron.defId!].speechAttention = old;
  view = poll(0.5);
  check('K24 functional prompts preempt a cooling resident', view.length === 1 && view[0].a === keeper);
  keeper.tier = 1;
  check('K25 another story cannot win speech focus', !w.npcSpeechView().some(x => x.a === keeper));
  keeper.dead = true;
  check('K26 a dead speaker cannot win focus', !poll(0.7).some(x => x.a === keeper));
  w.loadZone(START_ZONE);
  check('K27 zone loading clears transient focus', (w as unknown as { speechFocus: Map<unknown, unknown> }).speechFocus.size === 0);
}

console.log('Kp. POINTER ATTENTION (eligible intent, overlap, dwell and cues)');
{
  const tune = SPEECH_ATTENTION_CFG.focus;
  const keeper = { id: 1, distance: 15, priority: 100, dwellSec: 0.4 };
  const patron = { id: 2, distance: 80, priority: 0, dwellSec: 0.65, pointerDistance: 4 };
  const guest = { ...patron, id: 3, pointerDistance: 8 };
  let focus = dwellFocus(undefined, [keeper, guest, patron], true, 0, tune)!;
  check('Kp1 nearest pointer hit overrides purpose and hero distance', focus.id === patron.id && !focus.ready);
  check('Kp2 overlap selection is independent of enumeration order',
    dwellFocus(undefined, [patron, keeper, guest], true, 0, tune)?.id === patron.id);
  check('Kp3 a passing hover cannot bank a completed dwell',
    dwellFocus(focus, [keeper, { ...patron, pointerDistance: undefined }], true, 0.1, tune)?.id === keeper.id);
  const automatic = dwellFocus(focus, [{ ...patron, pointerDistance: undefined }], true, 0.7, tune)!;
  check('Kp3b an unfinished hover cannot latch later automatic dwell', automatic.ready && !automatic.pointed
    && dwellFocus(automatic, [keeper, { ...patron, pointerDistance: undefined }], true, 0.8, tune)?.id === keeper.id);
  focus = dwellFocus(focus, [keeper, patron], true, 0.7, tune)!;
  check('Kp4 sustained hover earns the full ambient dwell', focus.ready);
  focus = dwellFocus(focus, [keeper, { ...patron, pointerDistance: undefined }], true, 0.8, tune)!;
  check('Kp5 moving to reader controls preserves completed cursor choice', focus.id === patron.id && focus.ready);
  focus = dwellFocus(focus, [{ ...keeper, pointerDistance: 0 }, patron], true, 0.9, tune)!;
  check('Kp6 pointing at a new target resets its dwell', focus.id === keeper.id && !focus.ready && focus.since === 0.9);
  check('Kp7 an unreachable cursor choice is forgotten', dwellFocus(focus, [], true, 1, tune) === undefined);
  check('Kp8 exact overlaps break ties by stable id',
    dwellFocus(undefined, [guest, { ...patron, pointerDistance: guest.pointerDistance }], true, 0, tune)?.id === patron.id);

  const w = makeSimWorld('warrior', 77035);
  const a = w.createMonster('townsfolk_patron', 1, 'player');
  const k = w.createMonster('townsfolk_innkeep', 1, 'player');
  a.pos = { x: w.player.pos.x + 30, y: w.player.pos.y };
  k.pos = { x: w.player.pos.x + 80, y: w.player.pos.y };
  w.actors.push(a, k);
  const rows = (w as unknown as { speakerRows: Map<number, SpeechSpeakerRow> }).speakerRows;
  rows.set(a.id, makeSpeakerRow(a.id, 'Stay by the fire.', 'seat', {
    key: 'pointer:patron', company: 'pointer', name: null, roles: ['patron'], own: ['Stay by the fire.'],
  }));
  w.time = 20; w.localSeat.lastActedAt = 0;
  const hits = new Map([[a.id, 0]]);
  const poll = (seconds: number, pointer = hits) => {
    let lines = w.npcSpeechView(true, pointer);
    for (let i = 0; i < seconds * 60; i++) { w.time += 1 / 60; lines = w.npcSpeechView(true, pointer); }
    return lines;
  };
  check('Kp9 unselected speakers advertise availability without starting speech',
    w.speechDwellTargetsView().some(r => r.a === a && r.frac === 0 && !r.selected));
  check('Kp10 hover never skips the initial dwell', poll(0.2).length === 0);
  const cue = w.speechDwellTargetsView().find(r => r.a === a);
  check('Kp11 cue progress comes from the selected speech clock', !!cue && cue.selected && cue.frac > 0 && cue.frac < 1);
  check('Kp12 hovered patron speaks with Mireille still in range', poll(0.6).some(r => r.a === a));
  w.finishNpcDialogue(a.id);
  poll(0.5, new Map([[k.id, 0]]));
  check('Kp13 cooling patrons cannot steal pointer focus or advertise ready rings',
    !poll(0.8).some(r => r.a === a) && w.speechFocusTarget()?.id === k.id
    && !w.speechDwellTargetsView().some(r => r.a === a));
  a.tier = 1;
  check('Kp14 another floor cannot be pointed at or advertise a cue',
    !poll(13).some(r => r.a === a) && !w.speechDwellTargetsView().some(r => r.a === a));
  a.tier = 0; a.pos.x += 1000;
  check('Kp15 remote pointer hits cannot widen dwell reach', !poll(1).some(r => r.a === a));
  w.ledger.mireille_flasks_given = 1;
  w.mireilleUnlocked = () => true;
  check('Kp16 a keeper without a gift or lesson offers the configured resting line',
    w.innkeepPrompt() === SPEECH_ATTENTION_CFG.roles.innkeep?.restingLine);
  const def = MONSTERS[k.defId!], prior = def.speechAttention;
  def.speechAttention = { restingLine: 'Make yourself at home.' };
  check('Kp17 packages can customize a keeper response by definition', w.innkeepPrompt() === 'Make yourself at home.');
  def.speechAttention = prior;
}

console.log('L. THE DIALOGUE READER (pages, explicit advance, pending state and dismissal)');
{
  const text = 'One two three four five six seven eight nine ten.';
  const pages = dialoguePages(text, 15);
  check('L1 pagination preserves every word in order', pages.length > 1 && pages.join(' ') === text && pages.every(p => p.length <= 15));
  check('L2 blank lines author explicit page breaks', dialoguePages('First.\n\nSecond.', 210).join('|') === 'First.|Second.');
  check('L3 a long token stays intact and a blank offer stays empty',
    dialoguePages('abcdefghijk small', 3).join('|') === 'abcdefghijk|small' && dialoguePages('  ', 10).length === 0);
  const d = new DialogueSession();
  const offer: DialogueOffer = { speakerId: 1, key: 'first', pages: ['First page.', 'Second page.'] };
  d.sync(1, offer);
  check('L4 an admitted offer opens on its first page', d.reading?.page === 0 && d.hasNext());
  d.sync(1, null);
  check('L5 expiry of the overhead window never cuts off the reader', d.reading?.offer.key === 'first');
  d.advance();
  check('L6 advance moves one page', d.reading?.page === 1 && !d.hasNext());
  const changed = { speakerId: 1, key: 'lesson', pages: ['A new lesson.'] };
  d.sync(1, changed);
  check('L7 a changed lesson queues without replacing the page being read', d.reading?.page === 1 && d.hasNext());
  d.sync(1, { ...changed, key: 'latest', pages: ['The current lesson.'] });
  d.advance();
  check('L8 advancing reaches the latest state, not obsolete queued instructions', d.reading?.offer.key === 'latest' && d.reading.page === 0);
  check('L9 finish reports the speaker for cooldown attribution', d.advance()?.speakerId === 1 && d.reading === null);
  d.sync(1, offer);
  check('L10 closing cannot immediately reopen while still focused', d.reading === null);
  d.sync(null, null); d.sync(1, offer);
  check('L11 a genuinely new approach rearms the reader', d.reading?.page === 0);
  check('L12 switching speakers ends the prior exchange', d.sync(2, null)?.speakerId === 1 && d.reading === null);
  d.sync(2, offer);
  check('L13 another speaker cannot borrow the selected actor\'s dialogue', d.reading === null);
  d.sync(2, { ...offer, speakerId: 2 }); d.reset();
  check('L14 resetting clears reading and dismissal state', d.reading === null);
  d.sync(2, { ...offer, speakerId: 2 });
  check('L15 reset permits a fresh conversation with reused actor ids', !!d.reading);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
