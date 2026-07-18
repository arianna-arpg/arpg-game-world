// ---------------------------------------------------------------------------
// HOLLOWS — what the walls are hiding, as an OPEN REGISTRY.
//
// The hollows fabric (engine/levelgen stampHollows) carves sealed secrets
// INSIDE a grid zone's wall mass: pocket rooms swallowed whole, and through-
// wall passages sealed at both ends. This registry is the CONTENTS half:
// when a hollow's seam gives (World.openHollow), the hollow's HollowDef
// furnishes the freshly carved space through a small verb surface — doodads,
// pack monsters, gems, orbs — drawing every roll from the hollow's OWN seed,
// so a remembered reveal re-furnishes identically on re-entry.
//
// Adding a secret kind = one registerHollow call; tilesets weight the kinds
// per face (TilesetDef.hollows). `shape` tells the carver what geometry to
// hunt: a 'pocket' wants swallowing mass, a 'passage' wants a pierceable run
// between two open floors. REVIVE discipline: on a remembered re-reveal the
// engine passes revive=true — furnish STRUCTURE (doodads, the crevice shaft)
// but never re-pay loot or re-wake ambushes; survivors ride zone memory.
//
// This module is a pure leaf (core types only) so the engine and data files
// both reach it without cycles.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import type { Rng } from '../core/rng';

/** The verb surface World.openHollow hands a reveal — deliberately small.
 *  Positions are WORLD coordinates; `rect` is the carved space. */
export interface HollowRevealCtx {
  /** Center of the carved space (a pocket's heart; a passage's midpoint). */
  center: Vec2;
  /** The carved rect (world coords). Scatter inside it, not outside. */
  rect: { x: number; y: number; w: number; h: number };
  /** The hollow's own seeded stream — identical furnishing on revive. */
  rng: Rng;
  /** The zone's monster level. */
  level: number;
  /** TRUE on a remembered re-reveal: furnish structure, never loot/ambush. */
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
  /** A floating combat-text line. */
  text(pos: Vec2, msg: string, color?: string): void;
}

export interface HollowDef {
  id: string;
  /** What geometry the carver hunts for this kind (default 'pocket'). */
  shape?: 'pocket' | 'passage';
  /** This reveal opens a WAY DOWN (a sidezone mouth, a shaft — the crevice).
   *  A pocket minted noDeeper (ZoneDef.noDeeper — pit-dropped hollows)
   *  filters descending kinds from its roll table at mint, so the wall never
   *  hides a door the pocket promised not to have. Declare it on any future
   *  shaft-like secret; caches/ambushes/veins stay unmarked and survive. */
  descends?: boolean;
  /** Furnish the carved space. Runs once at reveal and once per remembered
   *  re-reveal (revive=true) — honor the revive discipline. */
  reveal(ctx: HollowRevealCtx): void;
  blurb?: string;
}

export const HOLLOWS: Record<string, HollowDef> = {};

export function registerHollow(def: HollowDef): void {
  if (HOLLOWS[def.id]) console.warn(`[hollows] re-registering '${def.id}' — overriding`);
  HOLLOWS[def.id] = def;
}

export function hollowDef(id: string): HollowDef | undefined { return HOLLOWS[id]; }

export function hollowShapeOf(id: string): 'pocket' | 'passage' {
  return HOLLOWS[id]?.shape ?? 'pocket';
}

/** Does this reveal kind open a way down? (Unregistered ids answer false —
 *  the roll table validator owns the typo complaint, not this fold.) */
export function hollowDescends(id: string): boolean {
  return !!HOLLOWS[id]?.descends;
}

/** A seeded point inside the rect, inset from its edges. */
const spot = (ctx: HollowRevealCtx, inset = 14): Vec2 => ({
  x: ctx.rect.x + inset + ctx.rng.range(0, Math.max(1, ctx.rect.w - inset * 2)),
  y: ctx.rect.y + inset + ctx.rng.range(0, Math.max(1, ctx.rect.h - inset * 2)),
});

// --- THE DEFAULT SECRETS -----------------------------------------------------

/** A CACHE: somebody walled up what they couldn't carry — pots, an urn, and
 *  the glitter that made the wall worth knocking on. */
registerHollow({
  id: 'cache_hollow',
  blurb: 'A walled-up store: pots, an urn, and somebody’s unfinished plans.',
  reveal(c) {
    c.addDoodad({ pos: spot(c), radius: c.rng.range(10, 13), kind: 'clay_pots' });
    c.addDoodad({ pos: spot(c), radius: c.rng.range(12, 15), kind: 'burial_urn' });
    if (!c.revive) {
      c.dropGem(c.center);
      const orbs = c.rng.int(2, 3);
      for (let i = 0; i < orbs; i++) c.shedOrb(c.rng.chance(0.5) ? 'life' : 'mana', spot(c));
      c.text(c.center, 'a hidden cache!', '#ffd700');
    }
  },
});

/** AN AMBUSH: the wall was keeping something IN. The pocket wakes hungry —
 *  drawn from the zone's own pack table, so the dark matches its address. */
registerHollow({
  id: 'ambush_hollow',
  blurb: 'The wall was load-bearing in a way you didn’t expect.',
  reveal(c) {
    c.addDoodad({ pos: spot(c), radius: c.rng.range(16, 26), kind: 'web' });
    c.addDoodad({ pos: spot(c), radius: c.rng.range(12, 18), kind: 'bone_pile' });
    if (!c.revive) {
      const n = c.rng.int(3, 5);
      let woke = 0;
      for (let i = 0; i < n; i++) {
        const id = c.packPick();
        if (!id) break;
        c.spawnEnemy(id, spot(c));
        woke++;
      }
      if (woke) c.text(c.center, 'something was sealed in here!', '#d84a2a');
    }
  },
});

/** A MINERAL VEIN: the seam was honest — the rock really is rich here.
 *  Strike the veins loose (they're brittle finds themselves). */
registerHollow({
  id: 'vein_hollow',
  blurb: 'The rock runs rich behind the face — a geode the cave kept quiet.',
  reveal(c) {
    const veins = c.rng.int(2, 3);
    for (let i = 0; i < veins; i++) {
      c.addDoodad({ pos: spot(c), radius: c.rng.range(11, 14), kind: 'crystal_vein', rot: c.rng.range(0, Math.PI * 2) });
    }
    c.addDoodad({ pos: spot(c), radius: c.rng.range(13, 17), kind: 'crystal_cluster' });
    if (!c.revive) c.dropGem(c.center);
  },
});

/** A HERMIT'S HOLLOW: someone lived in here, walled themselves in on
 *  purpose, and left the kit for whoever knocked politely enough. */
registerHollow({
  id: 'hermit_hollow',
  blurb: 'A cold camp behind the wall — the door was never on any map.',
  reveal(c) {
    c.addDoodad({ pos: c.center, radius: 12, kind: 'campfire' });
    c.addDoodad({ pos: spot(c), radius: c.rng.range(10, 13), kind: 'spelunker_pack' });
    c.addDoodad({ pos: spot(c), radius: c.rng.range(10, 13), kind: 'firewood_pile' });
    if (!c.revive) c.text(c.center, 'a hermit\'s hollow…', '#c8b89a');
  },
});

/** A CREVICE: the wall was hiding a whole further cave. The shaft is a
 *  registered sidezone mouth (data/sidezones.ts) — one stratum deeper,
 *  face-rolled fresh by the strata fabric. STRUCTURAL: revives always. */
registerHollow({
  id: 'crevice_hollow',
  descends: true, // the shaft is a WAY DOWN — noDeeper pockets filter it at mint
  blurb: 'The wall was the lid on a whole further cave.',
  reveal(c) {
    c.addDoodad({ pos: c.center, radius: 24, kind: 'crevice_shaft' });
    if (!c.revive) c.text(c.center, 'a crevice yawns below…', '#8fb0c8');
  },
});

/** A STAIRWELL: the block was hiding a way UP — the settled belt's ascension
 *  lane through the hollows fabric (a tenement's walled-off stair; the
 *  garret_stair mouth mints the rooms above — data/sidezones.ts). The
 *  massif-as-building payoff: crack the wall, climb what it hid.
 *  STRUCTURAL: revives always. NOT flagged `descends` — it goes UP, and a
 *  noDeeper pocket's mint already strips the mouth itself. */
registerHollow({
  id: 'stairwell_hollow',
  blurb: 'The brick was a lid on a stair nobody finished walling away.',
  reveal(c) {
    c.addDoodad({ pos: c.center, radius: 13, kind: 'garret_stair' });
    if (!c.revive) c.text(c.center, 'a stairwell climbs into the block…', '#d8c890');
  },
});

/** A PASSAGE: the corridor IS the reward — a way through the mass the map
 *  never promised, sealed at both ends until either seam gives. */
registerHollow({
  id: 'passage_hollow',
  shape: 'passage',
  blurb: 'A way through the wall the map never admitted to.',
  reveal(c) {
    if (!c.revive) c.text(c.center, 'a hidden passage runs through!', '#d8c890');
  },
});
