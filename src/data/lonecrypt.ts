// ---------------------------------------------------------------------------
// THE LONE CRYPT — the exhumation kit (graveland + gloamwood's grave face).
// Digging up certain gravestones breaks the seal on a lone Crypt. This file
// is the WHOLE kit, the catacombs discipline (one file, registered rows on
// standing fabrics, zero engine words beyond the ONE named seal seam):
//
//   · THE UNQUIET RING (the key): the 'exhumation' puzzle kind + the
//     'grave_exhumation' preset live in data/puzzles.ts — a STRIKE-driven
//     dig riding the knock grammar, never a dwell (the loud contrast with
//     the 'unearth' objective's stand-and-charge mounds). The crypt/
//     mournstead tilesets stand the ring up in every zone (puzzles rows at
//     chance 1) and offer it as THE ask ('puzzle' objective rows).
//   · THE SEALED GRAVE (the door): the 'sealed_grave' StructureDef
//     (data/structures.ts) — a roofed tomb whose inner cell seats the
//     lone_crypt_door mouth. Planted [1,1] by both tilesets' common rows,
//     so wherever the ring stands, somewhere a tomb is listening.
//   · THE SEAL (the law): SidezoneDef.sealedBy — the mouth admits only
//     while the zone's exhumation run reads DONE on the live board
//     (drawn == tested: the ring IS the lock). One narrow engine seam
//     (World.sidezoneSealHolds + the conditioned door's refusal float);
//     a zone that stood no ring up has no seal (degrade OPEN — absent
//     data never wedges a door).
//   · THE RESIDENT (the payoff): every mouth keeps its crypt forever
//     (position-hash seed, the den law), and each crypt draws ONE horror
//     from CRYPT_RESIDENTS on its own salted fork — two crypts rarely
//     house the same thing. The pool mixes new-authored marquee undead
//     (data/monsters.ts — the surfacing lich her words asked for) with
//     the standing court promoted to rarity tiers (the amalgam-miniboss
//     precedent). Deliberately NOT the King's Barrow: that crown lair
//     stands apart in the downs; this is the graveland's own smaller,
//     stranger lottery.
//   · THE UNQUIET YARD (the set piece): the 'graveyard_rows' formation —
//     the grid arranger's tomb-plot lattice (the farmland parcel idea in
//     funerary stone), LESS dense than crops and navigable between stones
//     by construction (corridors ≥ a player diameter after worst-case
//     radius + jitter; probe_lonecrypt pins the math). Per Arianna's note,
//     the yard NEVER decides whether a zone carries the exhumation — it is
//     dress that goes hand-in-hand, offered [0,1] beside the loop and
//     across gloamwood's other faces.
//
// VOCABULARY LAW: the RING is the key (struck, never dwelled), the TOMB is
// the door (a deliberate structure with its own undercroft), the CRYPT is
// the pocket below (its resident IS its differentiation), the YARD is the
// dress (objective-blind, per her note). Gateway seam: 'lone_crypt_entered'
// (the catacombs_entered pattern) for future packages and vault rows.
// Probe: balance/probe_lonecrypt.ts.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import { registerDoodadRule, registerFormation, registerStamp, stampSingle } from '../engine/levelgen';
import { mintCave } from '../engine/worldgen';
import { registerPuzzleAsk } from './objectives';
import { registerSidezone } from './sidezones';
import type { BossPromote } from './zones';

// --- THE UNQUIET YARD (graveyard rows — the grid arranger's tomb plots) ------
// The standing 'gravestone_rows' formation is ONE short line of headstones;
// this is the YARD — a whole plotted field off one shared bearing (the crop
// parcel's law in funerary stone). Numbers are the walkability contract:
// step 72 / rowGap 88 against stone radius ≤13 + jitter ≤5 leaves ≥36px
// along-row and ≥52px across-row corridors — both over a 30px player body
// (probe_lonecrypt pins the arithmetic so a retune can't silently close the
// lanes). Tombstones roll count [0,1] — the gap-toothed old yard, half the
// plots still marked; shallow graves are walk-over ground among them (the
// exhumation's own foreshadowing), cairns and urns the sparse punctuation.
registerFormation({
  id: 'graveyard_rows', arrange: 'grid', span: [340, 560], step: 72,
  params: { rowGap: 88, aspect: 0.62 },
  pieces: [
    { kind: 'tombstone', radius: [9, 13], count: [0, 1], jitter: 5 },
    { kind: 'shallow_grave', radius: [11, 14], every: 3, jitter: 8 },
    { kind: 'bone_cairn', radius: [10, 14], every: 5, jitter: 8 },
    { kind: 'burial_urn', radius: [9, 12], every: 4, jitter: 10 },
  ],
});

// --- THE DOOR (the lone crypt's mouth) ----------------------------------------
// Seated by the sealed_grave structure's inner cell (data/structures.ts) —
// a common row never names the kind directly today, but the stamp registers
// beside the rule anyway (the batch-25 law: a rule alone is a silently
// dropped row the day someone writes one; registered, a future row rides
// the door guarantee for free).
registerDoodadRule('lone_crypt_door', { overlap: 'trigger', spacing: 420 });
registerStamp('lone_crypt_door', stampSingle('lone_crypt_door', [14, 17]));

// --- THE RESIDENT POOL --------------------------------------------------------
// "a huge pool that really differentiates which entity type exists in
// Crypts" — one weighted draw per crypt on the mouth's own salted fork
// (the caveAirFor discipline: a named salt, an Rng forked off the mint
// seed, one range walk; the main streams never move and the same door
// answers the same forever). New-authored marquee residents carry their
// own weight (bossBar spectacle tier, no promote needed); standing-court
// entries borrow the vocation-quest law (rarity promotion + a level nudge
// makes a tabled elite read as the crypt's OWN horror). barrow_colossus is
// the undead HIGH COURT champion — champions are tabled by law, and this
// pool is deliberately another of its doors (never the zenith or apex:
// those stay doorless for the Odyssey rails).
const LONECRYPT_RESIDENT_SALT = 0x1c0e5d;

export interface CryptResidentRow {
  id: string;
  weight: number;
  promote?: BossPromote;
  levelBonus?: number;
}

export const CRYPT_RESIDENTS: CryptResidentRow[] = [
  // The marquee — her words: "a surfacing or awoken Lich".
  { id: 'crypt_lich', weight: 1 },
  // The new-authored horrors (data/monsters.ts, one standing fabric each).
  { id: 'tomb_regent', weight: 1.5 },
  { id: 'casket_maw', weight: 1.5, levelBonus: 1 },
  { id: 'sexton_shade', weight: 1.5 },
  // The standing court, promoted to crypt rank.
  { id: 'barrow_colossus', weight: 1 },
  { id: 'lich_marshal', weight: 2, promote: { rarity: 'champion' } },
  { id: 'barrow_swordsaint', weight: 2, promote: { rarity: 'champion' } },
  { id: 'oblivion_knight', weight: 2, promote: { rarity: 'champion' } },
  { id: 'grave_hag', weight: 2, promote: { rarity: 'crowned' }, levelBonus: 1 },
  { id: 'banshee', weight: 2, promote: { rarity: 'crowned' }, levelBonus: 1 },
  { id: 'dusk_rider', weight: 2, promote: { rarity: 'crowned' } },
  // The catacombs bar taperwights from their TABLES ("the Necropolis'
  // liturgy") — a crowned SINGULAR surfacing here is the other side of
  // that same doctrine: one of the liturgy's own, come up alone.
  { id: 'taperwight', weight: 1.5, promote: { rarity: 'crowned' }, levelBonus: 1 },
];

/** One crypt, one horror: the weighted walk on the mouth's salted fork.
 *  Pure per seed — the mint contract (same ctx, same def) and the probe's
 *  determinism rig both stand on it. */
export function rollCryptResident(seed: number): CryptResidentRow {
  const rng = new Rng(((seed ^ LONECRYPT_RESIDENT_SALT) >>> 0));
  let total = 0;
  for (const r of CRYPT_RESIDENTS) total += r.weight;
  let roll = rng.range(0, total);
  for (const r of CRYPT_RESIDENTS) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return CRYPT_RESIDENTS[CRYPT_RESIDENTS.length - 1];
}

// --- THE SIDEZONE (the seal + the mint) ---------------------------------------
// The King's Barrow's shape with the ROLL where its fixed id stands: dwell
// under the tomb's own roof (indoorsOnly — nobody exhumes through a wall),
// the seal reading the zone's live ring (SidezoneDef.sealedBy — the one
// narrow engine seam, World.sidezoneSealHolds), and a boss objective drawn
// per-mouth. noDeeper: a crypt is a room, not a ladder. The refusal line
// teaches the loop where a shut door would otherwise be a mystery.
registerSidezone({
  kind: 'lone_crypt_door',
  dwell: 0.8,
  indoorsOnly: true,
  ledgerOnEnter: 'lone_crypt_entered',
  sealedBy: { kind: 'exhumation', refusal: 'the seal holds — the unquiet graves keep it…' },
  mint: ({ parent, seed, id }) => {
    const resident = rollCryptResident(seed);
    const def = mintCave(parent, seed, id, 'lone_crypt', {
      rollVariant: true,
      objective: {
        kind: 'boss', id: resident.id,
        ...(resident.levelBonus ? { levelBonus: resident.levelBonus } : {}),
        ...(resident.promote ? { promote: resident.promote } : {}),
      },
      noDeeper: true,
    });
    // The NEST_FAUNA law: without authored fauna a minted pocket breathes
    // surface wildlife — a crypt full of meadow hares. Rats it is.
    def.fauna = [{ id: 'gutter_rat', chance: 0.5, count: [2, 4] }];
    return def;
  },
});

// --- THE ASK (THE ADOPTIVE LANE's puzzle class — data/objectives.ts) ----------
// Arianna's ruling (2026-08-04): a graveland/mournstead zone that rolled a
// bare cull MAY wear "solve the exhumation" as its ask — ~1-in-7 of zones
// effective, the per-tileset dials in ADOPT_CFG.puzzleChanceByTileset folding
// each table's own bare-'clear' share (crypt 15%, mournstead 12%). NEVER a
// weight row: a 'puzzle' weight in those tables would shift their weighted
// TOTAL and re-roll every mint of both countries (the weighted-total
// cascade), where the adoptive read draws nothing — the mint stream stays
// byte-identical with this row registered. Detection is the sealed grave's
// own DOOR standing in the layout + the ring authored in the zone's puzzles
// rows (adoption, never dependency — the no-conjure law); the standing
// 'puzzle' objective driver then completes the ask through the real dig with
// zero new engine words, and the same dig lifts the crypt's seal — the ask
// and the door were always one loop.
registerPuzzleAsk({ id: 'grave_exhumation', doodad: 'lone_crypt_door', puzzle: 'grave_exhumation' });
