// ---------------------------------------------------------------------------
// ANNEXES — the zone that GROWS, as an OPEN REGISTRY (Secrets Movement II).
//
// The composite bound (world/shape.ts) lets a zone's playable area be a UNION
// of pieces, dormant until revealed. This registry is the GRAMMAR half: what
// kinds of sealed annex a country may hide, which FACE each kind wears (the
// D2 fake wall — a doodad whose DoodadRule.brittle row carries the kind-
// matched trigger verb: cracked rock breaks to a STRIKE, fitted masonry gives
// to a lingering PRESS, a draft seam wakes to a body standing NEAR), and how
// the revealed ground furnishes.
//
// THE FOREORDAINED TENET: every annex exists whole from its seed. The mint
// (engine/worldgen applyAnnexes) rolls piece boxes + kinds + the whole nested
// chain on a dedicated salted stream at zone mint — annex-less tilesets stay
// draw-for-draw byte-identical by construction — and the layout half
// (engine/levelgen stampAnnexFaces) seats the faces. Reveal runs through the
// ONE verb (World.annexReveal): bounds admit, the carve opens the walk grid,
// the face crumbles into a rubble pile that REMAINS (THE QUIET RECLASS — the
// crumble SHOWS; no text box speaks), and the kind furnishes from the
// piece's own seed.
//
// THE FIND LAW: loot pays ONCE EVER — at the live find (revive=false). Every
// replay (zone-memory revive, the found-is-found boot replay, the co-op
// wire) passes revive=true and furnishes structure only. After the find the
// annex is ordinary standing ground: the zone's own repop laws own it.
//
// This module is a pure leaf (core types only) so the engine and data files
// both reach it without cycles.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import type { Rng } from '../core/rng';

/** Grammar dials. Numbers are tuning levers (flagged, one blessing unit):
 *  `lap` — how far a convex annex overlaps INTO the base silhouette so the
 *  seam never pinches a crossing body (≥ 2× the widest body radius);
 *  `mouthCells` — the carved mouth's width in walk cells (grid zones);
 *  `edgeMargin` — keep-away from the base box's corners along an edge;
 *  `sep` — minimum separation between two mouths on one edge;
 *  `wingScale` — the 'wing' policy's size multiplier over 'room' envelopes;
 *  `defaultDepth` — nesting budget when the tileset names none (her word:
 *  depth 2 standard, authored kinds may go deeper);
 *  `depthCap` — the hard sanity ceiling on AUTHORED depth (the infinite
 *  regime arrives as a later materialization change, never by accident). */
export const ANNEX_CFG = {
  lap: 72,
  mouthCells: 2,
  edgeMargin: 90,
  sep: 140,
  wingScale: 2.2,
  defaultDepth: 2,
  depthCap: 6,
};

/** A zone's ANNEX budget (TilesetDef.annexes → the mint roll): how many
 *  secret chains a zone tries to hide, the weighted table of registered
 *  kinds each rolls, and the per-country POLICY — `scale` picks the size
 *  regime ('room' = chambers-to-a-hall, the default; 'wing' = large
 *  multi-room growth for a country whose identity IS the secret mechanism),
 *  `depth` the nesting budget (default ANNEX_CFG.defaultDepth). */
export interface AnnexRollSpec {
  count: [number, number];
  table: Record<string, number>;
  scale?: 'room' | 'wing';
  depth?: number;
}

/** The verb surface World.annexReveal hands a furnish — deliberately small,
 *  the HollowRevealCtx shape. NO text verb, by law: an annex reveal SHOWS
 *  (the crumble, the remaining rubble, the opened dark) and never announces
 *  (THE QUIET RECLASS — the Secrets Charter's presentation ruling). */
export interface AnnexRevealCtx {
  /** Center of the revealed ground (world coords). */
  center: Vec2;
  /** The furnishable rect (world coords): a grid zone's carved interior,
   *  a convex zone's piece box. Scatter inside it, not outside. */
  rect: { x: number; y: number; w: number; h: number };
  /** The piece's own seeded stream — identical furnishing on every replay. */
  rng: Rng;
  /** The zone's monster level. */
  level: number;
  /** TRUE on any replay (memory revive, found-is-found boot, the wire):
   *  furnish structure, never loot/ambush — THE FIND LAW. */
  revive: boolean;
  /** Place a doodad (registered kind) inside the reveal. */
  addDoodad(d: { pos: Vec2; radius: number; kind: string; rot?: number }): void;
  /** Spawn an enemy at the zone's level (memory-captured like residents). */
  spawnEnemy(id: string, pos: Vec2): void;
  /** One weighted pick from the zone's own pack table (null = no packs). */
  packPick(): string | null;
  /** Drop a rolled gem at a position (the kill-path gem roller). */
  dropGem(pos: Vec2): void;
  /** Shed a life/mana orb at a position. */
  shedOrb(kind: 'life' | 'mana', pos: Vec2): void;
}

export interface AnnexKindDef {
  id: string;
  /** The sealed face's doodad kind — the seam tell standing at the mouth.
   *  Its DoodadRule.brittle row IS the trigger vocabulary (kind-matched
   *  defaults; authored rows may mix verbs freely). */
  face: string;
  /** Piece box envelopes (world units) at 'room' scale; the 'wing' policy
   *  multiplies both axes by ANNEX_CFG.wingScale. */
  size: { w: [number, number]; h: [number, number] };
  /** Piece silhouette within its box (composite-bound law; default 'rect').
   *  Grid zones always carve rect interiors regardless — the silhouette is
   *  the BOUNDS shape, which only convex zones express directly. */
  shape?: 'rect' | 'ellipse';
  /** NESTING: chance this kind's revealed ground hides a FURTHER face,
   *  rolled once from the piece's own seed at MINT (deterministic — the
   *  whole chain exists from the zone seed), budgeted by AnnexRollSpec
   *  .depth. `table` re-weights the child's kind; omitted = same kind. */
  child?: { chance: number; table?: Record<string, number> };
  /** Furnish the revealed ground. Honor the revive discipline: structure
   *  always, loot/ambush only when revive is false. */
  furnish(ctx: AnnexRevealCtx): void;
  blurb?: string;
}

export const ANNEXES: Record<string, AnnexKindDef> = {};

export function registerAnnex(def: AnnexKindDef): void {
  if (ANNEXES[def.id]) console.warn(`[annexes] re-registering '${def.id}' — overriding`);
  ANNEXES[def.id] = def;
}

export function annexKindDef(id: string): AnnexKindDef | undefined { return ANNEXES[id]; }

/** A chain piece's parent id ('ax0.2' → 'ax0.1', 'ax0.1' → 'ax0'); ring-0
 *  pieces answer null. The id IS the chain path — the mint writes it, the
 *  face stamp and the reveal's child-planting both read it. */
export function annexParentIdOf(id: string): string | null {
  const dot = id.lastIndexOf('.');
  if (dot < 0) return null;
  const d = Number(id.slice(dot + 1));
  const stem = id.slice(0, dot);
  return d <= 1 ? stem : `${stem}.${d - 1}`;
}

/** Roll a piece box's dimensions for a kind under a scale policy. */
export function rollAnnexBox(def: AnnexKindDef, rng: Rng, scale: 'room' | 'wing' | undefined):
  { w: number; h: number } {
  const m = scale === 'wing' ? ANNEX_CFG.wingScale : 1;
  return {
    w: Math.round(rng.range(def.size.w[0], def.size.w[1]) * m),
    h: Math.round(rng.range(def.size.h[0], def.size.h[1]) * m),
  };
}

/** A seeded point inside the rect, inset from its edges. */
const spot = (ctx: AnnexRevealCtx, inset = 18): Vec2 => ({
  x: ctx.rect.x + inset + ctx.rng.range(0, Math.max(1, ctx.rect.w - inset * 2)),
  y: ctx.rect.y + inset + ctx.rng.range(0, Math.max(1, ctx.rect.h - inset * 2)),
});

// --- THE DEFAULT KINDS -------------------------------------------------------
// Debut trio, one per trigger verb (her kind-matched ruling). All counts,
// chances and envelopes are tuning levers (one blessing unit, unblessed).

/** A BURROW: something dug through here and the rock never healed over.
 *  The cracked face breaks to a STRIKE — the visual-first crumble. */
registerAnnex({
  id: 'burrow_annex',
  face: 'cracked_face',
  size: { w: [240, 420], h: [240, 420] },
  child: { chance: 0.35 },
  blurb: 'The crack ran deeper than the wall it split.',
  furnish(c) {
    c.addDoodad({ pos: spot(c), radius: c.rng.range(12, 18), kind: 'bone_pile' });
    c.addDoodad({ pos: spot(c), radius: c.rng.range(16, 26), kind: 'web' });
    if (!c.revive) {
      const n = c.rng.int(2, 4);
      for (let i = 0; i < n; i++) {
        const id = c.packPick();
        if (!id) break;
        c.spawnEnemy(id, spot(c));
      }
      c.shedOrb(c.rng.chance(0.5) ? 'life' : 'mana', spot(c));
    }
  },
});

/** A RELIQUARY: masonry laid too neatly to be structural — somebody walled
 *  a room away on purpose. The fitted face gives to a lingering PRESS. */
registerAnnex({
  id: 'reliquary_annex',
  face: 'fitted_face',
  size: { w: [300, 480], h: [240, 390] },
  child: { chance: 0.25 },
  blurb: 'Stones this even were hiding something, not holding something.',
  furnish(c) {
    c.addDoodad({ pos: spot(c), radius: c.rng.range(12, 15), kind: 'burial_urn' });
    c.addDoodad({ pos: spot(c), radius: c.rng.range(12, 15), kind: 'burial_urn' });
    c.addDoodad({ pos: spot(c), radius: c.rng.range(10, 13), kind: 'clay_pots' });
    if (!c.revive) {
      c.dropGem(c.center);
      const orbs = c.rng.int(1, 2);
      for (let i = 0; i < orbs; i++) c.shedOrb(c.rng.chance(0.5) ? 'life' : 'mana', spot(c));
    }
  },
});

/** A DRAFT GALLERY: cold air moving where no air should move. The seam
 *  wakes to a body standing NEAR — and the draft usually comes from
 *  deeper still (the chain kind: its child chance is the grammar's
 *  dungeon-scape seed). */
registerAnnex({
  id: 'draft_gallery',
  face: 'draft_seam',
  size: { w: [360, 600], h: [210, 300] },
  child: { chance: 0.75 },
  blurb: 'The candle bent. The wall was lying about being a wall.',
  furnish(c) {
    c.addDoodad({ pos: spot(c), radius: c.rng.range(16, 24), kind: 'web' });
    c.addDoodad({ pos: spot(c), radius: c.rng.range(11, 15), kind: 'bone_pile' });
    if (!c.revive) c.shedOrb(c.rng.chance(0.5) ? 'life' : 'mana', spot(c));
  },
});
