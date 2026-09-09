// ---------------------------------------------------------------------------
// THE SPEECH FABRIC — the WORLD'S half: WHEN a body speaks.
//
// render/vis/speech.ts draws HOW a line is told (the wrap, the typewriter,
// the placement + layout laws); this module decides WHETHER the line
// stands at all on a given read. THE TRANSIENT TELLING: a folk line is an
// UTTERANCE, not a caption. It begins on A FRESH APPROACH, holds for its
// window, disperses, and the speaker's tongue is then HELD for a cooldown on
// the world clock — never perpetual, never flickering at the radius edge.
//
// THE LAWS:
//  - THE FRESH APPROACH: a telling begins only on the EDGE — the hero is
//    near now and was not near at the last live read (a memory older than
//    `staleSec` forgets nearness, so an unread speaker — off-screen, a
//    teleport — meets the next read as a fresh approach, never a mute).
//    Standing there earns nothing: the level is not the edge.
//  - THE WHOLE TELLING: once begun, the line stands its whole window
//    wherever the hero walks — the words were said, the speaker finishes
//    the sentence at your back. (The renderer's same-view gate still decides
//    whether the DRAWN bubble shows; that is a render law, not this one.)
//  - THE HELD TONGUE: after the window the speaker is silent for
//    `cooldownSec` on the WORLD clock — stepping out and back in inside it
//    earns nothing, and the cooldown runs whether or not the hero is there.
//  - THE READING ALLOWANCE: the window grows `holdPerChar` per character, so
//    a long line is never cut mid-telling; the typewriter's pace is a render
//    dial (VIS_CFG.speech.typing) this module never reads — the allowance
//    is generous by design, and Settings.speechTyping OFF only leaves the
//    whole line standing a little longer.
//  - THE LANE IS THE OVERRIDE: every resident line arrives by a LANE (a
//    plan's spoken seat, a rostered guest, a ward family) and each lane may
//    override any dial; `holdSec: Infinity` on a lane is the old perpetual
//    bubble as data (the cooldown is then moot).
//  - THE LESSON EXEMPTION: the counters' prompts (World.innkeepPrompt —
//    Mireille's flask lesson included — questGiverPrompt, caravanPrompt,
//    amalgamPrompt, delverPrompt) are FUNCTIONAL: they say what a station
//    will do and stand until acted on. They never ride this clock; only the
//    resident lane (World.residentPrompt) does.
//  - TRANSIENT BY CONSTRUCTION: the memory is a per-world map keyed by actor
//    id, cleared with the lines at every zone load, never serialized, never
//    on the wire — a co-op client polls its own world through the same read.
//
// `speechTell` is the ONE fold (pure over its inputs — it returns a new
// memory row and never mutates the one it was handed), `speechWindowFor`
// the ONE dial read; World.residentPrompt is their consumer, the renderer
// stays dumb, and probe_speech rig J pins both plus the live inn.
// Docs: docs/render/speech.md (THE TRANSIENT TELLING) +
// docs/design/townsfolk-life.md §1.4.
// ---------------------------------------------------------------------------

/** Where a resident line came by — the per-lane override key. */
export type SpeechLane =
  /** A plan's SPOKEN SEAT (StructureDef.npcs[].line — the patron, the lodger). */
  | 'seat'
  /** A rostered guest (data/innfolk.ts — rolled per seat + day). */
  | 'folk'
  /** A ward family at its cottage door (data/boroughs.ts TOWN_RESIDENTS). */
  | 'resident';

/** The telling's window, as dials. */
export interface SpeechWindow {
  /** Seconds the line stands once it begins — the base, before the
   *  reading allowance. Infinity = the perpetual bubble (a lane's opt-out). */
  holdSec: number;
  /** THE READING ALLOWANCE: extra seconds per character of the line. */
  holdPerChar: number;
  /** THE HELD TONGUE: seconds after the window ends before the speaker
   *  will speak again — on the world clock, wherever the hero is. */
  cooldownSec: number;
}

export const SPEECH_CFG = {
  /** The window every lane starts from. */
  window: {
    holdSec: 4,
    holdPerChar: 0.05,
    cooldownSec: 24,
  } as SpeechWindow,
  /** THE LANE IS THE OVERRIDE: per-lane dials over `window` (any subset).
   *  A spoken seat's line is DIRECTIONS (the rooms above, the corner room)
   *  and bears repeating sooner than a guest's small talk. */
  lanes: {
    seat: { cooldownSec: 12 },
  } as Partial<Record<SpeechLane, Partial<SpeechWindow>>>,
  /** THE FRESH APPROACH's memory: a speaker unread for longer than this
   *  forgets whether the hero was near — its next read judges a fresh
   *  approach against nothing. The renderer reads every drawn frame, so
   *  only a true gap (off-screen, a teleport) ever crosses it. */
  staleSec: 1,
};

/** One speaker's telling state — transient, per world, never persisted. */
export interface SpeechMemory {
  /** World-clock second the current (or last) telling began; null before
   *  the first. The cooldown counts from `spokeAt + holdSec`. */
  spokeAt: number | null;
  /** The window that telling holds — stamped at its start, so a dial
   *  retuned mid-telling changes the NEXT telling, never a running one. */
  holdSec: number;
  /** Was the hero near at the last read (the edge's other half). */
  near: boolean;
  /** World-clock second of the last read (the staleness read). */
  readAt: number;
}

/** The folded window for one line on one lane: `window` ← `lanes[lane]`,
 *  the hold grown by THE READING ALLOWANCE for the line's length. */
export function speechWindowFor(lane: SpeechLane, text: string, cfg: typeof SPEECH_CFG = SPEECH_CFG): { holdSec: number; cooldownSec: number } {
  const w: SpeechWindow = { ...cfg.window, ...(cfg.lanes[lane] ?? {}) };
  return { holdSec: w.holdSec + w.holdPerChar * text.length, cooldownSec: w.cooldownSec };
}

/** THE TELLING FOLD — one read of one speaker. Given the speaker's memory
 *  (undefined before its first read), whether the hero is near NOW, the
 *  world clock and the line's folded window, answer whether the line stands
 *  this read and hand back the memory to keep. Pure: the memory handed in is
 *  never mutated. THE FRESH APPROACH begins a telling only on the edge and
 *  only once THE HELD TONGUE has run; THE WHOLE TELLING stands its window
 *  whatever `near` says meanwhile. */
export function speechTell(
  mem: SpeechMemory | undefined, near: boolean, now: number,
  win: { holdSec: number; cooldownSec: number }, staleSec: number = SPEECH_CFG.staleSec,
): { mem: SpeechMemory; telling: boolean } {
  const live = mem !== undefined && now - mem.readAt <= staleSec;
  const wasNear = live && mem.near;
  let spokeAt = mem?.spokeAt ?? null;
  let hold = mem?.holdSec ?? 0;
  let telling = spokeAt !== null && now < spokeAt + hold;
  if (!telling && near && !wasNear) {
    const cooled = spokeAt === null || now >= spokeAt + hold + win.cooldownSec;
    if (cooled) { spokeAt = now; hold = win.holdSec; telling = hold > 0; }
  }
  return { mem: { spokeAt, holdSec: hold, near, readAt: now }, telling };
}
