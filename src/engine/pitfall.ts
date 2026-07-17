// ---------------------------------------------------------------------------
// THE PITFALL FABRIC — one rule set for every drop in the world.
//
// Every pit is the SAME pit: the karst reach's gorge cells, a cave floor's
// chasm cells, the outer steppes' stamped abyssal rents, an overworld
// chasm-doodad chain — grid region cells and stamped pit doodads share one
// fall vocabulary (RecoveryPolicy — regions.ts), one grasp rule
// (WALK_CFG.ledgeGrasp — the aetherial cloud-lip law, applied here in disc
// space), one policy resolution (ZoneTheme.pitfall overriding the region
// row's default), and one consequence (`descend`: the pit's own underzone,
// minted deterministically one stratum down the strata ladder).
//
// This module is a PURE LEAF: config + geometry only. The World owns the pit
// list (built at loadZone from fall-able doodads — engine/levelgen.ts
// `pitRegionOf` derives WHICH doodads and WHICH region row governs each) and
// passes plain arrays here; nothing in this file imports the engine.
//
// THE HIT SURFACE IS THE DRAWN SURFACE: a pit doodad's interior is the union
// of its discs at their stamped radii — exactly the dark the chasmPit painter
// fills (blobPath(group, 0)). The lip stone the painter grows OUTWARD
// (rim.grow) is standing ground, as drawn. Spanning decks (DoodadRule.spans —
// World.bridges) negate the drop beneath them, as drawn.
//
// Docs: docs/engine/pitfall.md.
// ---------------------------------------------------------------------------

import type { DamageSpec, RecoveryPolicy } from '../world/regions';

/** One fall-able pit disc, resolved by the World at loadZone: the doodad's
 *  stamped geometry plus the REGION row that owns its falls (the policy /
 *  label / palette authority — 'chasm', 'void', 'abyss', any future row). */
export interface PitSurface {
  x: number;
  y: number;
  r: number;
  /** The doodad kind (habitat/immuneGround matching — a body HOME in this
   *  ground never falls into it: the void angler keeps its chasm). */
  kind: string;
  /** The region row falls resolve through (regionKind(region).boundaryPolicy,
   *  unless ZoneTheme.pitfall overrides zone-wide). */
  region: string;
}

/** A spanning deck disc (World.bridges — anything whose DoodadRule.spans). */
export interface DeckLike {
  pos: { x: number; y: number };
  radius: number;
  gone?: boolean;
}

/** Every knob modular (the avoid-hardcoding doctrine) — tune, never re-derive. */
export const PIT_CFG = {
  /** Pit IDENTITY lattice (world units): falls landing in one sector of a
   *  zone share one deterministically-minted underzone — fall into the same
   *  stretch of the same gorge and the same hollow catches you, every run,
   *  every client (the crevice-shaft contract). A gulf longer than a sector
   *  riddles into SEVERAL hollows — the future cave-web pass (the reserved
   *  UNDERWAY seam, docs/engine/pitfall.md) links them laterally. */
  sectorSize: 480,
  /** Sweep granularity (world units) for the pit confine's segment march —
   *  pit rims are smooth discs, so a fixed step serves every zone model. */
  sweepGran: 8,
  /** Rim probes on the grasp disc (plus its center): the disc-space
   *  equivalent of the grid's cell-overlap support test — both approximate
   *  the body's footprint at ~10px fidelity. */
  probes: 8,
  /** Default landing toll of a `descend` fall when the policy names none:
   *  the classic chasm bite (18% max life), resistless physical, and NEVER
   *  lethal for the one descending — the pit delivers you hurt, not dead
   *  (monsters shoved in don't land at all: the swallow is the kill). */
  fallDamage: { amount: 0, pctMaxLife: 0.18, type: 'physical', canKill: false } as DamageSpec,
  /** Ledger row a survived player descent bumps (Vault/discovery fodder). */
  ledger: 'pit_descents',
  /** THE CAVE DEFAULT: every rung below the surface (ZoneDef.caveDepth ≥ 1)
   *  treats its pits as mouths of the NEXT stratum — falls descend unless
   *  the zone's own theme.pitfall says otherwise (the descent abyss opts
   *  back out: its shaft-and-banking economy owns its own drops). One
   *  structural default instead of a row on every cave face, so every
   *  future face inherits the ladder for free. */
  caveFall: { kind: 'descend' } as RecoveryPolicy,
};

/** The pit interior covering a point — or null where the world still holds
 *  you. A spanning deck NEGATES every pit beneath it (the bridge contract);
 *  `homeKinds` are pit kinds the mover is HOME in (MonsterDef.habitat /
 *  immuneGround — the lava-wader doctrine), whose discs hold it like ground. */
export function pitAt(
  pits: readonly PitSurface[], decks: readonly DeckLike[],
  x: number, y: number, homeKinds?: readonly string[] | null,
): PitSurface | null {
  let over: PitSurface | null = null;
  for (const p of pits) {
    if (homeKinds && homeKinds.includes(p.kind)) continue;
    const dx = x - p.x, dy = y - p.y;
    if (dx * dx + dy * dy <= p.r * p.r) { over = p; break; }
  }
  if (!over) return null;
  for (const b of decks) {
    if (b.gone) continue;
    const dx = x - b.pos.x, dy = y - b.pos.y;
    if (dx * dx + dy * dy <= b.radius * b.radius) return null; // decked: the planks hold
  }
  return over;
}

/** LEDGE GRASP in disc space — the aetherial cloud-lip law verbatim: a body
 *  is SUPPORTED while any part of its grasp disc (radius already scaled by
 *  WALK_CFG.ledgeGrasp at the call site) still overlaps something that holds
 *  it — any ground outside the pit union, or a spanning deck. Only a body
 *  wholly past all support has truly walked off. r <= 0 degrades to the
 *  center-point test. */
export function pitSupportedAt(
  pits: readonly PitSurface[], decks: readonly DeckLike[],
  x: number, y: number, r: number, homeKinds?: readonly string[] | null,
): boolean {
  if (!pitAt(pits, decks, x, y, homeKinds)) return true;
  if (r <= 0) return false;
  for (let k = 0; k < PIT_CFG.probes; k++) {
    const a = (k / PIT_CFG.probes) * Math.PI * 2;
    if (!pitAt(pits, decks, x + Math.cos(a) * r, y + Math.sin(a) * r, homeKinds)) return true;
  }
  return false;
}

/** Cheap outer gate: does the swept segment's padded box touch any pit disc's
 *  box at all? Zones keep their pit lists tiny (a handful of stamped wells),
 *  so a miss here — almost every move in a pitted zone — costs a few compares
 *  and the confine never runs. */
export function anyPitNear(
  pits: readonly PitSurface[],
  x0: number, y0: number, x1: number, y1: number, pad: number,
): boolean {
  const lox = Math.min(x0, x1) - pad, hix = Math.max(x0, x1) + pad;
  const loy = Math.min(y0, y1) - pad, hiy = Math.max(y0, y1) + pad;
  for (const p of pits) {
    if (p.x + p.r < lox || p.x - p.r > hix || p.y + p.r < loy || p.y - p.r > hiy) continue;
    return true;
  }
  return false;
}

/** The pit-identity key a fall at (x, y) resolves to — hashed by the caller
 *  (hashStr) into the underzone's mint seed. Pure string math so co-op
 *  clients, revisits, and the probe all derive the same hollow. */
export function pitSectorKey(zoneId: string, x: number, y: number): string {
  const sx = Math.floor(x / PIT_CFG.sectorSize), sy = Math.floor(y / PIT_CFG.sectorSize);
  return `${zoneId}:pitfall:${sx},${sy}`;
}
