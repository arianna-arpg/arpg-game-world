// ---------------------------------------------------------------------------
// THE SPEECH GRAMMAR — generative folk talk as DATA (the speech fabric's
// WORD half; docs/engine/speech-grammar.md).
//
// engine/speech.ts decides WHEN a body speaks (THE TRANSIENT TELLING) and
// render/vis/speech.ts HOW the line is drawn; this module decides WHAT is
// said. Her ruling (2026-09-06): "Rimworld levels of colony member
// discussion" — the folk talk about the world and about EACH OTHER, varied,
// never the same three fixed lines.
//
// THE SHAPE: a line is a TEMPLATE with SLOTS ('{other}', '{weather}',
// '{monster}' …) resolved from the world's own state at the moment it is
// told. Templates live in an open registry (registerSpeechTemplates) with a
// ROLE pool, a weight and optional gates; slots are RESOLVERS in a second
// open registry (registerSpeechSlot), each a pure read of a narrow
// SpeechContext that returns a phrase or null. A template whose slot cannot
// be filled is SKIPPED, never thrown.
//
// THE LAWS:
//  - THE SPEAKER IS A ROW: every spoken body registers one SpeechSpeaker
//    (a stable key, its COMPANY, its roles, whether it is NAMED, its own
//    authored lines) — the world's loadZone builds them; nothing here
//    knows an Actor.
//  - THE DEAL (dealSpeechDecks): once per (zone seed, company, day) every
//    template a company's roles admit is shuffled on a LOCAL seeded stream
//    (THE OFF-STREAM LAW — the global die never moves) and handed, one by one,
//    to the eligible speaker with the shortest deck. Decks are pairwise
//    DISJOINT by construction: no two folk in one company say the same
//    line the same day. The next dawn re-deals.
//  - THE FIRST WORD: a body's authored lines lead its deck as slotless
//    templates of its own, so the first approach of every day still says
//    what it always said; a line already claimed by an earlier body of the
//    company (two drovers share a row's lines) yields to the next.
//  - THE ROTATION (composeSpeech): each telling takes the next RESOLVABLE
//    deck entry from the position on; skipped entries stay dealt (the sky
//    may open them later). Deterministic per (seed, position) — the
//    telling's die is seeded off both, so '{other}' is the same body on a
//    replay under equal world state.
//  - THE COMPANY LAW, SPOKEN: '{other}' names only a NAMED, LIVING, PRESENT
//    body of the same company, never the speaker; '{doing}' is that body's
//    arrived haunt piece as the world reads it, or the template skips.
//  - THE EMPTY WORLD: every resolver answers null on nothing, and the
//    template is skipped — a fresh run's first inn talks in slotless
//    templates and grows worldly as the world happens.
//  - THE HERO'S ADDRESS: '{name}' in a TEMPLATE is the SPEAKER (a grammar
//    line is the speaker's sentence); the hero is '{hero}', which resolves
//    to the literal '{name}' token the renderer's display seam expands
//    (vis/speech.ts resolveNameTokens) — renown-gated at the world.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import type { DayPhase } from '../world/daynight';
import type { SpeechLane } from './speech';

/** The role pools a template may address. Open: a package may name its own
 *  ('dockhand', 'novice') — the string tail keeps the union honest. */
export type SpeechRole =
  | 'patron' | 'lodger' | 'merchant' | 'warden' | 'pilgrim' | 'resident'
  | 'mercenary' | 'camper' | 'traveler' | 'visitor' | 'any' | (string & {});

/** One line the folk may say — with '{slot}' tokens resolved at the telling. */
export interface SpeechTemplate {
  /** Stable id (re-registering an id replaces the row — HMR-safe). */
  id: string;
  /** The words; '{slot}' tokens name registered resolvers. */
  text: string;
  /** Who may say it: ANY of these roles on the speaker, or 'any' for all. */
  roles: SpeechRole[];
  /** The deal's draw weight (default 1). */
  weight?: number;
  /** GATE: only under these hours of the day. */
  phase?: DayPhase[];
  /** GATE: only under a clear sky ('clear') or a standing front ('front'). */
  sky?: 'clear' | 'front';
}

/** One spoken body as the grammar sees it — built by the world at the spawn. */
export interface SpeechSpeaker {
  /** Stable per (zone, seat): the folk seat's key, the plan seat, the ward row. */
  key: string;
  /** The house this body belongs to (the placed structure's id, or 'ward'). */
  company: string;
  /** A NAMED body's name (a rolled guest, a family); null = the def's generic
   *  face ("Patron") — never spoken of as '{other}', never says '{name}'. */
  name: string | null;
  /** The role pools this body draws from. */
  roles: string[];
  /** Its authored lines, kept whole (THE FIRST WORD). */
  own: string[];
  /** Alive and standing in the zone right now (refreshed at each telling). */
  present: boolean;
}

/** What a resolver may read — the world's state, narrowed. Every field may
 *  be null (THE EMPTY WORLD); `doingOf` reads a company member's haunt. */
export interface SpeechContext {
  /** The world day (floor(time / DAY_LENGTH)). */
  day: number;
  phase: DayPhase;
  /** The home town's name (Lastlight). */
  town: string | null;
  /** This zone's name. */
  zone: string | null;
  /** The standing front's label ('Rain', 'Fog' …), null when clear or sheltered. */
  weather: string | null;
  /** The newest world news line (THE NOTICE FEED) inside the gossip window. */
  lastEvent: string | null;
  /** The zone the hero arrived from, by name. */
  from: string | null;
  /** The hero's class name. */
  heroClass: string | null;
  /** May a line address the hero by name (the renown law)? */
  heroKnown: boolean;
  /** A kind the hero put down recently, by def NAME. */
  monster: string | null;
  /** The piece a company member keeps at right now — a haunt phrase
   *  ('at the keg'), or null when it is not at one. */
  doingOf(speaker: SpeechSpeaker): string | null;
}

/** A resolver's inputs: the speaker, its company, the world view, the
 *  '{other}' chosen for this telling (null when none qualifies) and the
 *  telling's own die (seeded — never the global die). */
export interface SpeechSlotArgs {
  speaker: SpeechSpeaker;
  company: readonly SpeechSpeaker[];
  ctx: SpeechContext;
  other: SpeechSpeaker | null;
  rng: Rng;
}
export type SpeechSlotResolver = (a: SpeechSlotArgs) => string | null;

/** A dealt deck entry: an authored line of the speaker's own, or a template. */
export type SpeechDeckEntry = { kind: 'own'; text: string } | { kind: 'tpl'; tpl: SpeechTemplate };

/** The world's per-speaker row: the §1.4 lane + line beneath, the grammar's
 *  speaker + deck + position above, and the line stamped for the running
 *  telling. Transient — cleared with the lines at every zone load. */
export interface SpeechSpeakerRow {
  /** The actor this row speaks through. */
  actorId: number;
  /** The authored fallback line (what the lane said before the grammar). */
  line: string;
  lane: SpeechLane;
  speaker: SpeechSpeaker;
  /** The day the deck was dealt for (-1 = never). */
  dealtDay: number;
  deck: SpeechDeckEntry[];
  /** THE ROTATION's position — the next entry to try. */
  pos: number;
  /** The composed line of the running telling (stable for its window). */
  current: string | null;
}

export const SPEECH_GRAMMAR_CFG = {
  /** '{monster}' remembers a credited kill this many seconds (two days). */
  slainWindowSec: 480,
  /** '{lastEvent}' repeats news this many seconds old at most (three days). */
  newsWindowSec: 720,
  /** How many news lines / kills the world keeps for the gossip. */
  newsKeep: 8,
  slainKeep: 8,
  /** The role every speaker draws from. */
  anyRole: 'any',
  /** The deal's stream salt (a stream of its own beside the folk roll's). */
  dealSalt: 0x5a1de77e,
  /** '{phase}' as a noun that follows "at" / "by" / "for". */
  phaseWords: { dawn: 'dawn', day: 'midday', dusk: 'dusk', night: 'night' } as Record<DayPhase, string>,
  /** '{doing}' for a haunt piece with no registered phrase: "by the <kind>". */
  doingFallback: (kind: string): string => `by the ${kind.replace(/_/g, ' ')}`,
};

// --- THE REGISTRIES ------------------------------------------------------------

const SLOTS: Record<string, SpeechSlotResolver> = {};
const TEMPLATES: SpeechTemplate[] = [];
const HAUNT_PHRASE: Record<string, string> = {};

/** Register (or replace) a slot resolver. */
export function registerSpeechSlot(name: string, fn: SpeechSlotResolver): void {
  SLOTS[name] = fn;
}
export function speechSlotNames(): string[] { return Object.keys(SLOTS); }

/** Register templates; an id already registered is replaced in place. */
export function registerSpeechTemplates(rows: SpeechTemplate[]): void {
  for (const t of rows) {
    const i = TEMPLATES.findIndex(x => x.id === t.id);
    if (i >= 0) TEMPLATES[i] = t; else TEMPLATES.push(t);
  }
}
export function speechTemplates(): readonly SpeechTemplate[] { return TEMPLATES; }

/** Register what a body "is doing" at a haunt piece of this kind. */
export function registerHauntPhrase(kind: string, phrase: string): void { HAUNT_PHRASE[kind] = phrase; }
/** '{doing}' for a piece kind: the registered phrase, else the fallback. */
export function hauntPhrase(kind: string): string { return HAUNT_PHRASE[kind] ?? SPEECH_GRAMMAR_CFG.doingFallback(kind); }
export function hauntPhraseKinds(): string[] { return Object.keys(HAUNT_PHRASE); }

const SLOT_RE = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** The slot names a template text carries (unique, in order of first use). */
export function templateSlots(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(SLOT_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** May this speaker say this template (the role pool)? */
export function templateFits(t: SpeechTemplate, s: SpeechSpeaker): boolean {
  return t.roles.includes(SPEECH_GRAMMAR_CFG.anyRole) || t.roles.some(r => s.roles.includes(r));
}

/** Do the template's gates hold under this world view? */
export function templateOpen(t: SpeechTemplate, ctx: SpeechContext): boolean {
  if (t.phase && !t.phase.includes(ctx.phase)) return false;
  if (t.sky === 'clear' && ctx.weather !== null) return false;
  if (t.sky === 'front' && ctx.weather === null) return false;
  return true;
}

/** Registry lint: every problem as one line (empty = clean). The probe and
 *  the boot warn read it; a bad row never throws at the telling. */
export function validateSpeechGrammar(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of TEMPLATES) {
    if (seen.has(t.id)) out.push(`duplicate template id '${t.id}'`);
    seen.add(t.id);
    if (!t.text.trim()) out.push(`template '${t.id}' has no text`);
    if (!t.roles.length) out.push(`template '${t.id}' names no role`);
    if (t.weight !== undefined && !(t.weight > 0)) out.push(`template '${t.id}' has a non-positive weight`);
    for (const s of templateSlots(t.text)) if (!SLOTS[s]) out.push(`template '${t.id}' names an unregistered slot '{${s}}'`);
  }
  return out;
}

// --- THE DEAL ---------------------------------------------------------------------

/** Deal every speaker of a company its deck for the day. Pure: the same
 *  (company, seed, templates) deal the same decks; decks are pairwise
 *  disjoint (a template lands in ONE deck; an authored line is claimed by
 *  ONE body). Speakers are walked in key order, so a company's deal never
 *  depends on spawn order. */
export function dealSpeechDecks(
  company: readonly SpeechSpeaker[], seed: number, templates: readonly SpeechTemplate[] = TEMPLATES,
): Map<string, SpeechDeckEntry[]> {
  const order = [...company].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const decks = new Map<string, SpeechDeckEntry[]>();
  // THE FIRST WORD: authored lines lead, each claimed once per company —
  // dealt ROUND-ROBIN (one unclaimed line per speaker per pass) so two
  // bodies sharing a row's lines each open with a line of their own.
  const claimed = new Set<string>();
  for (const s of order) decks.set(s.key, []);
  for (let pass = 0, more = true; more; pass++) {
    more = false;
    for (const s of order) {
      const line = s.own.find(l => !!l && !claimed.has(l));
      if (!line) continue;
      claimed.add(line);
      decks.get(s.key)!.push({ kind: 'own', text: line });
      if (s.own.some(l => !!l && !claimed.has(l))) more = true;
    }
  }
  // THE DEAL: a weighted shuffle of every template someone here may say …
  const rng = new Rng(seed >>> 0);
  const rest = templates.filter(t => order.some(s => templateFits(t, s)));
  const walk: SpeechTemplate[] = [];
  while (rest.length) {
    let total = 0;
    for (const t of rest) total += Math.max(0, t.weight ?? 1);
    let x = rng.next() * total;
    let i = 0;
    for (; i < rest.length - 1; i++) { x -= Math.max(0, rest[i].weight ?? 1); if (x <= 0) break; }
    walk.push(rest[i]);
    rest.splice(i, 1);
  }
  // … handed one by one to the eligible speaker with the fewest so far
  // (ties broken on the same die), so no two decks ever share a row.
  const counts = new Map<string, number>(order.map(s => [s.key, 0]));
  for (const t of walk) {
    let bestN = Infinity;
    let tied: SpeechSpeaker[] = [];
    for (const s of order) {
      if (!templateFits(t, s)) continue;
      const n = counts.get(s.key) ?? 0;
      if (n < bestN) { bestN = n; tied = [s]; } else if (n === bestN) tied.push(s);
    }
    if (!tied.length) continue;
    const pick = tied.length === 1 ? tied[0] : tied[Math.min(tied.length - 1, Math.floor(rng.next() * tied.length))];
    decks.get(pick.key)!.push({ kind: 'tpl', tpl: t });
    counts.set(pick.key, bestN + 1);
  }
  return decks;
}

// --- THE TELLING --------------------------------------------------------------------

/** Resolve one template's slots for one telling. Null = skip (an unfilled
 *  slot, an unknown slot, a resolver that threw). '{hero}' resolves LAST so
 *  its literal '{name}' (the renderer's address token) is never mistaken
 *  for the speaker's own. */
export function resolveTemplate(
  text: string, speaker: SpeechSpeaker, company: readonly SpeechSpeaker[], ctx: SpeechContext, rng: Rng,
): string | null {
  const slots = templateSlots(text);
  if (!slots.length) return text;
  let other: SpeechSpeaker | null = null;
  if (slots.includes('other') || slots.includes('doing')) {
    const cands = company.filter(s => s.key !== speaker.key && s.present && !!s.name);
    if (!cands.length) return null;
    other = cands[Math.min(cands.length - 1, Math.floor(rng.next() * cands.length))];
  }
  const args: SpeechSlotArgs = { speaker, company, ctx, other, rng };
  const ordered = [...slots.filter(s => s !== 'hero'), ...slots.filter(s => s === 'hero')];
  let out = text;
  for (const s of ordered) {
    const fn = SLOTS[s];
    if (!fn) return null;
    let v: string | null;
    try { v = fn(args); } catch { v = null; }
    if (v === null || v === undefined || v === '') return null;
    out = out.split(`{${s}}`).join(v);
  }
  return out;
}

/** THE ROTATION: the next line from the deck position on — the first entry
 *  that resolves under this world view (an authored line always does; a
 *  template must pass its gates and fill every slot). Returns the line and
 *  the position to keep for the next telling; null when nothing in the
 *  deck can be said right now. The telling's die is seeded off (seed,
 *  position), so the same approach replays the same words. */
export function composeSpeech(
  speaker: SpeechSpeaker, company: readonly SpeechSpeaker[], deck: readonly SpeechDeckEntry[],
  pos: number, ctx: SpeechContext, seed: number,
): { text: string; pos: number } | null {
  if (!deck.length) return null;
  for (let step = 0; step < deck.length; step++) {
    const i = (((pos + step) % deck.length) + deck.length) % deck.length;
    const e = deck[i];
    if (e.kind === 'own') return { text: e.text, pos: i + 1 };
    if (!templateOpen(e.tpl, ctx)) continue;
    const rng = new Rng(((seed >>> 0) ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0);
    const text = resolveTemplate(e.tpl.text, speaker, company, ctx, rng);
    if (text) return { text, pos: i + 1 };
  }
  return null;
}

/** One speaker row for the world's map — the §1.4 lane + line beneath the
 *  grammar's speaker; the deck is dealt lazily at the first telling. */
export function makeSpeakerRow(
  actorId: number, line: string, lane: SpeechLane,
  s: { key: string; company: string; name: string | null; roles?: readonly string[]; own?: readonly string[] },
): SpeechSpeakerRow {
  return {
    actorId, line, lane,
    speaker: { key: s.key, company: s.company, name: s.name, roles: [...(s.roles ?? [])], own: [...(s.own ?? [])], present: true },
    dealtDay: -1, deck: [], pos: 0, current: null,
  };
}

// --- THE DEBUT SLOTS (pure reads of the context) --------------------------------------

/** "a"/"an" before a lowercased noun phrase. */
export function withArticle(phrase: string): string {
  const p = phrase.trim();
  if (!p) return p;
  return `${/^[aeiou]/i.test(p) ? 'an' : 'a'} ${p}`;
}

/** A news line as a clause: trailing stops and shouts trimmed. */
export function newsClause(text: string): string {
  return text.trim().replace(/[.!…\s]+$/u, '');
}

registerSpeechSlot('name', a => a.speaker.name);
registerSpeechSlot('other', a => a.other?.name ?? null);
registerSpeechSlot('doing', a => (a.other ? a.ctx.doingOf(a.other) : null));
registerSpeechSlot('phase', a => SPEECH_GRAMMAR_CFG.phaseWords[a.ctx.phase] ?? null);
registerSpeechSlot('weather', a => (a.ctx.weather ? a.ctx.weather.toLowerCase().replace(/^the\s+/, '') : null));
registerSpeechSlot('lastEvent', a => (a.ctx.lastEvent ? newsClause(a.ctx.lastEvent) || null : null));
registerSpeechSlot('from', a => a.ctx.from);
registerSpeechSlot('heroClass', a => (a.ctx.heroClass ? a.ctx.heroClass.toLowerCase() : null));
registerSpeechSlot('town', a => a.ctx.town);
registerSpeechSlot('zone', a => a.ctx.zone);
registerSpeechSlot('monster', a => (a.ctx.monster ? withArticle(a.ctx.monster.toLowerCase()) : null));
// THE HERO'S ADDRESS: the literal token the renderer expands (renown-gated here).
registerSpeechSlot('hero', a => (a.ctx.heroKnown ? '{name}' : null));

/** THE EMPTY WORLD as a context — what a fresh run's inn knows. */
export function emptySpeechContext(phase: DayPhase = 'day', day = 0): SpeechContext {
  return {
    day, phase, town: null, zone: null, weather: null, lastEvent: null, from: null,
    heroClass: null, heroKnown: false, monster: null, doingOf: () => null,
  };
}
