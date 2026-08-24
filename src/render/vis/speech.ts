// ---------------------------------------------------------------------------
// THE SPEECH FABRIC — NPC talk as wrapped BUBBLES with a typewriter reveal.
//
// This module is the fabric's PURE half: wrap layout, reveal timing, and the
// style fold — all deterministic functions with no canvas, no World, no DOM,
// so balance/probe_speech.ts can pin every law headlessly. The renderer owns
// the pixels (queueSpeech / drawSpeeches) and the per-speaker clocks.
//
// THE LAWS:
//   WRAP    — words break to fit a width, never mid-word; authored '\n'
//             always breaks; an overlong single word stands alone (the box
//             widens rather than the word tearing).
//   REVEAL  — glyphs arrive on a per-character clock (cps), with a held
//             beat after sentence stops and a shorter one after clause
//             breaks — but ONLY at a true break ("1.5" never stutters).
//             Monotonic in elapsed time by construction.
//   FOLD    — tuning resolves VIS_CFG.speech ← MonsterDef.speech ← the call
//             site's style, most specific wins; `typing: false` at any rung
//             opts that speaker out, and a later rung's typing object opts
//             back in. Settings.speechTyping is the player's master switch,
//             read by the renderer above the whole fold.
//   NAME    — '{name}' in world-authored talk is the HERO'S ADDRESS, expanded
//             at the display seam only (resolveNameTokens, invoked beside the
//             '{bind:…}' expansion in Renderer.resolveText — one token
//             grammar); a missing name degrades to an honest word, never a
//             raw brace.
//   PLACE   — a bubble that would draw UNDER an open DOM pane (inventory,
//             the SKILLS drawer, a counter menu) SLIDES to visible ground
//             instead of being silently swallowed — the pane stays whole,
//             the words stay read, the tail keeps pointing at the speaker
//             (dodgeSpeechBox; the renderer feeds it the panes' rects
//             through the UI's obstruction census). Unobstructed bubbles
//             are untouched BY CONSTRUCTION — no panes open, no change.
// ---------------------------------------------------------------------------

/** The typewriter's own dials (VIS_CFG.speech.typing is the shipped base). */
export interface SpeechTypingTuning {
  /** Characters revealed per second (<= 0 = everything at once). */
  cps: number;
  /** Extra held seconds after a sentence stop (. ! ? … :) at a break. */
  pausePunct: number;
  /** Extra held seconds after a clause break (, ; —) at a break. */
  pauseComma: number;
  /** Blink a caret on the arriving glyph while the telling is unfinished. */
  caret: boolean;
}

/** One resolved bubble tuning — the fabric's full dial set. */
export interface SpeechTuning {
  /** Wrap width for the text (world px) — lines break to fit. */
  maxWidth: number;
  font: string;
  lineHeight: number;
  /** Box padding around the wrapped lines. */
  padX: number;
  padY: number;
  cornerR: number;
  /** The tail wedge pointing down at the speaker. */
  tailW: number;
  tailH: number;
  /** Tail-tip lift above the speaker's scalp (past name + bar stack). */
  lift: number;
  /** Box fill — one neutral dark everywhere; the INK keeps each speaker's
   *  own accent color, so who is talking stays attributable at a glance. */
  bg: string;
  /** Accent-colored border strength (× the ink color). */
  edgeAlpha: number;
  typing: SpeechTypingTuning;
}

/** A partial override — what MonsterDef.speech and queueSpeech call sites
 *  carry. Any scalar dial, plus `typing: false` for instant plates (signs,
 *  echo-stones) or a partial typing object to re-pace the reveal. */
export type SpeechStyle = Partial<Omit<SpeechTuning, 'typing'>> & {
  typing?: false | Partial<SpeechTypingTuning>;
};

/** Fold a base tuning through override rungs (def, then call site) — most
 *  specific wins per dial; `typing: false` latches the opt-out until a later
 *  rung carries its own typing object. */
export function resolveSpeech(base: SpeechTuning,
  ...styles: (SpeechStyle | undefined)[]): SpeechTuning & { typingOff: boolean } {
  const out: SpeechTuning & { typingOff: boolean } =
    { ...base, typing: { ...base.typing }, typingOff: false };
  for (const s of styles) {
    if (!s) continue;
    const { typing, ...rest } = s;
    Object.assign(out, rest);
    if (typing === false) out.typingOff = true;
    else if (typing) { out.typingOff = false; Object.assign(out.typing, typing); }
  }
  return out;
}

/** Greedy word wrap under a measure function (the renderer hands
 *  ctx.measureText; the probe hands a fixed-advance stub). Authored '\n'
 *  always breaks; a word wider than maxWidth stands alone on its line. */
export function wrapSpeech(text: string, maxWidth: number,
  measure: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(' ').filter(w => w.length > 0);
    if (!words.length) { lines.push(''); continue; }
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      if (measure(cur + ' ' + w) <= maxWidth) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    }
    lines.push(cur);
  }
  return lines;
}

/** Sentence stops that hold pausePunct; clause breaks that hold pauseComma.
 *  A pause counts only when the NEXT character is a break (space/newline/
 *  end) — "1.5" and "co.uk" never stutter the telling. */
const STOP_PUNCT = '.!?…:';
const CLAUSE_PUNCT = ',;—';

/** How many characters of `text` have arrived after `elapsed` seconds.
 *  Character i arrives at cumulative time (i+1)/cps + every pause held by
 *  the characters before it. Monotonic nondecreasing in elapsed. */
export function revealedChars(text: string, elapsed: number,
  t: Pick<SpeechTypingTuning, 'cps' | 'pausePunct' | 'pauseComma'>): number {
  if (t.cps <= 0) return text.length;
  const per = 1 / t.cps;
  let acc = 0;
  for (let i = 0; i < text.length; i++) {
    acc += per;
    if (acc > elapsed) return i;
    const c = text[i];
    const atBreak = i + 1 >= text.length
      || text[i + 1] === ' ' || text[i + 1] === '\n';
    if (atBreak) {
      if (STOP_PUNCT.includes(c)) acc += t.pausePunct;
      else if (CLAUSE_PUNCT.includes(c)) acc += t.pauseComma;
    }
  }
  return text.length;
}

/** Total seconds the whole telling takes (the probe's closure bound —
 *  revealedChars(text, revealBudget(text)) is always the full length). */
export function revealBudget(text: string,
  t: Pick<SpeechTypingTuning, 'cps' | 'pausePunct' | 'pauseComma'>): number {
  if (t.cps <= 0) return 0;
  const per = 1 / t.cps;
  let acc = 0;
  for (let i = 0; i < text.length; i++) {
    acc += per;
    const atBreak = i + 1 >= text.length
      || text[i + 1] === ' ' || text[i + 1] === '\n';
    if (atBreak) {
      if (STOP_PUNCT.includes(text[i])) acc += t.pausePunct;
      else if (CLAUSE_PUNCT.includes(text[i])) acc += t.pauseComma;
    }
  }
  return acc;
}

/** THE NAME TOKEN — text that addresses the hero never bakes the name in.
 *  A world-authored line carries plain '{name}' and only the surface that
 *  DISPLAYS it expands the token, at draw time, against the LIVE hero
 *  (Renderer.resolveText invokes this beside the '{bind:…}' expansion — one
 *  token grammar, one seam) — so a renamed hero re-addresses every line the
 *  same frame, and world code needs no import to participate. A missing or
 *  blank name degrades to an honest address — 'Traveller', standing in the
 *  name's own position — never a raw brace and never 'undefined'. (Announce
 *  templates whose '{name}' means a CHAMPION substitute at their own push
 *  sites — worldboss/breach/grudge lines — and by standing law never reach
 *  the display seam raw, so the hero owns the token there.) */
const NAME_TOKEN_RE = /\{name\}/g;
export function resolveNameTokens(text: string, name?: string): string {
  if (!text.includes('{name}')) return text;
  return text.replace(NAME_TOKEN_RE, name?.trim() || 'Traveller');
}

/** An axis-aligned rect in whatever space the caller works in (the renderer
 *  hands world units; the probe hands plain numbers). */
export interface SpeechRect { x: number; y: number; w: number; h: number }

const rectsOverlap = (a: SpeechRect, b: SpeechRect, m: number): boolean =>
  a.x < b.x + b.w + m && a.x + a.w > b.x - m
  && a.y < b.y + b.h + m && a.y + a.h > b.y - m;

/** THE PLACEMENT LAW — dodgeSpeechBox: where a talk bubble stands when open
 *  DOM panes cover its ground. Pure geometry, no DOM:
 *    - UNOBSTRUCTED IS UNTOUCHED: a box clear of every obstacle returns its
 *      own position byte-identical — with no panes open the fabric cannot
 *      change a pixel.
 *    - THE LATTICE: an obstructed box tries the candidate lattice — its own
 *      coordinate and every pane's `margin`-clear edge exit, per axis,
 *      CROSSED (one- and two-axis slides alike: real screens leave their
 *      free ground in corners — below one pane AND beside another — that
 *      no single-axis slide can reach). Every candidate is clamped inside
 *      `view` and must stand clear of EVERY obstacle to count.
 *    - NEAREST WINS: among clean candidates the one displaced least from
 *      the true anchor is chosen — the bubble stays as close to its
 *      speaker as the panes allow.
 *    - NO GROUND, NO MOVE: when nothing clean exists (panes cover the whole
 *      view) the original position returns — a hidden bubble beats a bubble
 *      squatting ON a pane, which would trade one obscured surface for
 *      another (the player-visibility symmetry this law exists to keep).
 *  The caller passes `view` already shrunk by its edge margin; `margin` is
 *  the clearance kept between the box and any pane edge. Cost is bounded:
 *  (2n+1)² candidates × n overlap tests for n obstacles, and it runs only
 *  for a bubble a pane actually covers. */
export function dodgeSpeechBox(box: SpeechRect, obstacles: readonly SpeechRect[],
  view: SpeechRect, margin: number): { x: number; y: number } {
  const home = { x: box.x, y: box.y };
  if (!obstacles.some(o => rectsOverlap(box, o, margin))) return home;
  const clampView = (x: number, y: number): { x: number; y: number } => ({
    x: Math.min(Math.max(x, view.x), view.x + Math.max(0, view.w - box.w)),
    y: Math.min(Math.max(y, view.y), view.y + Math.max(0, view.h - box.h)),
  });
  const xs = new Set<number>([home.x]);
  const ys = new Set<number>([home.y]);
  for (const o of obstacles) {
    xs.add(o.x - margin - box.w); xs.add(o.x + o.w + margin);
    ys.add(o.y - margin - box.h); ys.add(o.y + o.h + margin);
  }
  let best: { x: number; y: number } | null = null;
  let bestCost = Infinity;
  for (const cx of xs) {
    for (const cy of ys) {
      const p = clampView(cx, cy);
      const placed = { x: p.x, y: p.y, w: box.w, h: box.h };
      if (obstacles.some(ob => rectsOverlap(placed, ob, margin))) continue;
      const cost = (p.x - home.x) ** 2 + (p.y - home.y) ** 2;
      if (cost < bestCost) { bestCost = cost; best = p; }
    }
  }
  return best ?? home;
}
