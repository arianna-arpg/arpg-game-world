// ---------------------------------------------------------------------------
// THE RUNESCRIPT — the vestiges' own tongue, as data.
//
// Every socketable vestige wears a rune (the D2 rune tradition — the Elder
// Futhark's letters), and the Vault's SHROUDED class cards are WRITTEN in
// those runes: discovery prose and objectives — one rune per
// letter of the plain text (Harbinger-speak: a fixed, crackable cipher —
// community-solvable by construction, never re-dealt per account). The
// vestiges are the ROSETTA STONE: each teaches ONE letter (data/vestiges.ts
// `letter`; its drawn glyph DERIVES from this table — THE ROSETTA LAW, probe-
// pinned), so a player who has found Kessa knows what ᚲ says on a card, and
// a player who has found none can still crack it the old way (frequency,
// pattern, the hint beside it). Letters no vestige teaches are simply
// unwritten in any item — the alphabet is whole regardless, so every word
// renders and every card stays honest. This is a lore relationship, never
// a collection mechanic: revealScript follows deed progress, not found items.
//
// ONE table, three readers: `encipher` (the Vault's shroud), `runeOf` (the
// vestige registry's glyph derivation), `decipher` (probes + any future
// in-game translation lens). Adding a letter/digraph = one row here; a new
// vestige teaching it = one `letter` on its row. Nothing else knows runes.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';

/** One letter of the script: the plain LETTER (or digraph — 'th', 'ng'),
 *  the RUNE it is written as, and the rune's own name (for the Rosetta
 *  tooltip's flavor and for probes' error prints). */
export interface RuneLetter {
  letter: string;
  rune: string;
  name: string;
}

/** THE ALPHABET — 26 letters + the two Futhark digraphs. Digraphs are
 *  matched FIRST by the cipher (`th` is ONE rune, never ᛏᚺ), so the script
 *  reads consistently both ways. Every rune is unique (probe-pinned) and
 *  lives in the Unicode Runic block (U+16A0–U+16FF — Segoe UI Symbol / Noto
 *  Sans Runic; the UI's rune font stack names both). */
export const RUNESCRIPT: readonly RuneLetter[] = [
  { letter: 'th', rune: 'ᚦ', name: 'thurisaz' },
  { letter: 'ng', rune: 'ᛜ', name: 'ingwaz' },
  { letter: 'a', rune: 'ᚨ', name: 'ansuz' },
  { letter: 'b', rune: 'ᛒ', name: 'berkanan' },
  { letter: 'c', rune: 'ᚳ', name: 'cen' },
  { letter: 'd', rune: 'ᛞ', name: 'dagaz' },
  { letter: 'e', rune: 'ᛖ', name: 'ehwaz' },
  { letter: 'f', rune: 'ᚠ', name: 'fehu' },
  { letter: 'g', rune: 'ᚷ', name: 'gebo' },
  { letter: 'h', rune: 'ᚺ', name: 'hagalaz' },
  { letter: 'i', rune: 'ᛁ', name: 'isaz' },
  { letter: 'j', rune: 'ᛃ', name: 'jeran' },
  { letter: 'k', rune: 'ᚲ', name: 'kaunan' },
  { letter: 'l', rune: 'ᛚ', name: 'laguz' },
  { letter: 'm', rune: 'ᛗ', name: 'mannaz' },
  { letter: 'n', rune: 'ᚾ', name: 'naudiz' },
  { letter: 'o', rune: 'ᛟ', name: 'othalan' },
  { letter: 'p', rune: 'ᛈ', name: 'perthro' },
  { letter: 'q', rune: 'ᛩ', name: 'cweorth' },
  { letter: 'r', rune: 'ᚱ', name: 'raido' },
  { letter: 's', rune: 'ᛋ', name: 'sowilo' },
  { letter: 't', rune: 'ᛏ', name: 'tiwaz' },
  { letter: 'u', rune: 'ᚢ', name: 'uruz' },
  { letter: 'v', rune: 'ᚹ', name: 'wunjo' },
  { letter: 'w', rune: 'ᚥ', name: 'wynn' },
  { letter: 'x', rune: 'ᛪ', name: 'calc' },
  { letter: 'y', rune: 'ᛇ', name: 'eihwaz' },
  { letter: 'z', rune: 'ᛉ', name: 'algiz' },
];

const BY_LETTER: ReadonlyMap<string, RuneLetter> = new Map(RUNESCRIPT.map(r => [r.letter, r]));
const BY_RUNE: ReadonlyMap<string, RuneLetter> = new Map(RUNESCRIPT.map(r => [r.rune, r]));

/** The digraphs, longest first — the cipher's match order. */
const DIGRAPHS: readonly RuneLetter[] = RUNESCRIPT
  .filter(r => r.letter.length > 1)
  .sort((x, y) => y.letter.length - x.letter.length);

/** The rune a letter (or digraph) is written as; undefined for anything the
 *  script does not spell (digits, punctuation, space). */
export function runeOf(letter: string): string | undefined {
  return BY_LETTER.get(letter.toLowerCase())?.rune;
}

/** The letter a rune stands for (the reverse read); undefined for a non-rune. */
export function runeLetterOf(rune: string): string | undefined {
  return BY_RUNE.get(rune)?.letter;
}

/** The whole row for a letter — the Rosetta tooltip's flavor read. */
export function runeLetterRow(letter: string): RuneLetter | undefined {
  return BY_LETTER.get(letter.toLowerCase());
}

/** Is this character a rune of the script? */
export function isRune(ch: string): boolean {
  return BY_RUNE.has(ch);
}

/** THE SHROUD: write plain text in the script. Case-insensitive (the
 *  script has one case); digraphs first; everything the script does not
 *  spell (spaces, digits, punctuation, already-runic text) passes through
 *  unchanged — so word shapes, counts and punctuation survive, which is
 *  exactly what a cipher-cracker needs and exactly what a class name must
 *  not give away outright. */
export function encipher(text: string): string {
  const src = text.toLowerCase();
  let out = '';
  for (let i = 0; i < src.length;) {
    let matched: RuneLetter | undefined;
    for (const d of DIGRAPHS) {
      if (src.startsWith(d.letter, i)) { matched = d; break; }
    }
    if (matched) { out += matched.rune; i += matched.letter.length; continue; }
    const ch = src[i];
    out += BY_LETTER.get(ch)?.rune ?? ch;
    i += 1;
  }
  return out;
}

/** The reverse read — runes back to plain lowercase text (a digraph rune
 *  yields its digraph). Non-runes pass through. Probes round-trip through
 *  it; an in-game translation lens would read through it. */
export function decipher(runes: string): string {
  let out = '';
  for (const ch of runes) out += BY_RUNE.get(ch)?.letter ?? ch;
  return out;
}

/** Reveal scattered rune occurrences in a stable, phrase-seeded order.
 *  Repeated letters reveal independently, leaving partial words throughout
 *  the sentence for the player to recognize. The order never uses gameplay
 *  randomness or changes with progress, so revealed letters stay revealed.
 *  Digraphs stay whole; any credit reveals at least one token, and incomplete
 *  progress always leaves some script. No item or account alphabet is consulted. */
export function revealScript(text: string, fraction: number): string {
  if (fraction >= 1) return text;
  const runes = [...encipher(text)];
  const order = runes.flatMap((ch, i) => isRune(ch) ? [i] : []);
  const count = order.length;
  const clear = fraction > 0 ? Math.min(count - 1, Math.max(1, Math.floor(count * fraction))) : 0;
  if (clear <= 0) return runes.join('');
  // FNV-1a seeds the existing local RNG from the inscription itself.
  let seed = 0x811c9dc5;
  for (const ch of runes) seed = Math.imul(seed ^ ch.codePointAt(0)!, 0x01000193);
  const rng = new Rng(seed);
  for (let i = count - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const i of order.slice(0, clear)) runes[i] = runeLetterOf(runes[i])!;
  return runes.join('');
}
