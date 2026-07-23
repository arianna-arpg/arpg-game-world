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
