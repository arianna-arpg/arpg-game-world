// ---------------------------------------------------------------------------
// THE STATUS VOICE — what lands ON a body is drawn ON the body (the show-don't-
// tell ladder's second rung, M-STATUS — docs/design/show-dont-tell.md §3e;
// engine doc docs/engine/statusvoice.md). A status used to announce itself
// with a caption over the head ("chilled to the bone!", "befuddled!",
// "UNHORSED"); now every status that LANDS speaks an ON-APPLY ACCENT keyed by
// its FAMILY — cold crackles rime, heat flares, poison spatters, a wound
// flecks red, the mind spirals, hard CC rings stars, time ripples, a blessing
// winks — ~9 voices serve every status, and the worn face (the status bar,
// the rim/vignette overlays, StatusDef.bodyFx) stays the standing read.
//
// THE LAWS:
//   1. RENDER-SIDE BY CONSTRUCTION — the accent is an after-image of the
//      status LIST (the tested truth): the layer diffs each body's statuses
//      frame to frame and plays a voice for every FRESH id (a body's first
//      sight seeds silently — no burst at zone load); host and co-op client
//      detect identically off the same wire rows; nothing new ships.
//   2. BY FAMILY, NEVER ONE RING — StatusDef.voice names a voice outright; a
//      def with none derives one from its nature (conceals/flight/ghost → none;
//      timeScale → ripple; hardCC → stars; the mind → spiral; by element;
//      beneficial → wink), so a new status arrives voiced.
//   3. NO TEXT — a landing that plays a voice speaks no caption (the player-
//      axis lines retired: the census pins them); the rule-name floaters the
//      genre reads by ('volatile!', 'DOOM!') stay as the `combat` float kind —
//      the player's own mute.
// This is the PURE LEAF (no canvas, no World): the dials, the family
// resolver, the frame diff law. The voices draw in render/vis/statusVoiceLayer.ts.
// ---------------------------------------------------------------------------

import type { StatusDef } from './status';

export const STATUS_VOICE_CFG = {
  /** Seconds an accent plays. */
  life: 0.55,
  /** The accent's reach as a multiple of the body radius. */
  radiusScale: 1.5,
  /** Concurrency cap on live accents (past it a landing simply wears its
   *  worn face — the honest degrade). */
  maxLive: 24,
} as const;

/** The built-in family voices (registered by the render layer into THE
 *  EFFECT VOICE — open: a StatusDef may name ANY registered voice). */
export type StatusVoiceId = 'rime' | 'flare' | 'spark' | 'spatter' | 'flecks' | 'spiral' | 'stars' | 'ripple' | 'wink' | (string & {});

/** THE FAMILY RESOLVER — pure: the def's own word, else its nature. */
export function statusVoiceOf(def: StatusDef | undefined): StatusVoiceId | false {
  if (!def) return false;
  if (def.voice !== undefined) return def.voice;
  // States that DRAW THEMSELVES need no accent: a concealed body vanishes,
  // a flying one lifts, a ghosted one fades.
  if (def.conceals || def.flight || def.ghostAlpha !== undefined) return false;
  if (def.timeScale !== undefined) return 'ripple';
  // The ELEMENT speaks first where one stands (a frozen body is rime, not
  // stars; a shocked one sparks); chaos is the poison/decay family.
  const t = def.dotType ?? def.element;
  switch (t) {
    case 'fire': return 'flare';
    case 'cold': return 'rime';
    case 'lightning': return 'spark';
    case 'chaos': return 'spatter';
    case 'physical': return 'flecks';
    default: break;
  }
  if (def.hardCC) return 'stars';
  if (def.interruptChance || def.scrambleChance || def.invertMove || def.panic || def.smellsOfPrey) return 'spiral';
  return 'wink';
}

/** THE FRAME DIFF LAW — pure: given a body's remembered status ids and its
 *  current list, the ids that just LANDED (fresh this frame). A body seen for
 *  the first time (no memory) seeds silently and reports nothing — a zone
 *  load bursts no accents. The caller replaces its memory with `now`. */
export function statusVoiceDiff(seen: ReadonlySet<string> | undefined, now: readonly { id: string }[]): string[] {
  if (!seen) return [];
  const fresh: string[] = [];
  for (const s of now) if (!seen.has(s.id) && !fresh.includes(s.id)) fresh.push(s.id);
  return fresh;
}
