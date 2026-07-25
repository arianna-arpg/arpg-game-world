// --- THE ROOTED FABRIC — ground-worn power as data (engine/rooted.ts) ------
//
// The conditional-mod family had two axes and always wanted a third:
//
//   MonsterDef.bond      WHO IS NEAR   — mods worn while a bond-holder stands
//                                        close. Counterplay: burst the holder.
//   MonsterDef.nocturne  WHAT HOUR     — mods worn while the day wheel stands
//                                        in the def's phases. Counterplay:
//                                        fight it in its off-hours.
//   MonsterDef.rooted    WHERE IT      — mods worn while the body stands on
//                        STANDS          ground it counts as its own.
//                                        Counterplay: TAKE THE GROUND.
//
// All three are the same shape (a Modifier[] worn on an edge, one sheet
// source, no per-frame fold), and all three now TELL: `bonded`, `nocturne`
// and `rooted` are tell sources reading the exact held flags the sheet
// wears, so a conditional mod can never again be an invisible number.
//
// WHAT COUNTS AS ITS GROUND is deliberately two lists, because the world
// already carries two kinds of claimed floor:
//   `creep`  — a living membrane (engine/creep.ts). The claimer's OWN heart
//              (MonsterDef.creepSource) or any kin's: the skin is shared, so
//              a court fights better on its matron's floor. Kill the heart
//              and the membrane recoils — the buff recedes with the visible
//              ground, which is the whole loop.
//   `ground` — a region / ground kind (sand, ash, snow, a flux pad). The
//              static half: a thing native to a terrain, stronger on it.
//
// THE GRACE IS LOAD-BEARING. A creep rim BREATHES on the warren's shared
// pulse and its edge wobbles every beat; a bare on/off test at the rim would
// flap the sheet source forever. The claim drops only once the body has
// stood clear for the whole grace, so stepping across a bare seam never
// unroots — and the drop, when it comes, is a real event worth a floater.
//
// A PURE LEAF (the mounts.ts idiom): types, config, the predicate. The
// edge-triggered fold lives at the World chokepoint beside bond/nocturne.
// Docs: docs/engine/reserves.md (THE ROOTED); probe balance/probe_spent.ts.
// ---------------------------------------------------------------------------

import type { Modifier } from './stats';

export const ROOTED_CFG = {
  /** Seconds a body must stand CLEAR of its claim before the mods drop —
   *  the anti-flicker window over a breathing creep rim. */
  grace: 0.6,
  /** Floater tint for the uprooted beat. */
  offColor: '#c8b48a',
  /** Floater tint for the re-rooted beat. */
  onColor: '#a8d8a0',
} as const;

/** GROUND-WORN MODS. `mods` while standing on the claim, `off` while not. */
export interface RootedSpec {
  /** Creep KINDS whose live membrane counts as this body's ground (the
   *  creep fabric's hit surface — drawn == tested by construction: the
   *  skin the player sees under its feet IS the test). */
  creep?: string[];
  /** Region / ground KINDS that count (the static half). */
  ground?: string[];
  /** Worn while rooted. */
  mods: Modifier[];
  /** Worn while NOT rooted — the WILT. Absent = simply losing `mods`. */
  off?: Modifier[];
  /** Seconds clear before the claim drops (default ROOTED_CFG.grace). */
  grace?: number;
  /** Floater on the drop ('uprooted!'). Absent = silent. */
  note?: string;
  /** Floater when the claim is retaken. Absent = silent. */
  noteOn?: string;
}

/** The narrow world view the predicate reads — a probe can hand-build one
 *  in two lines, and the leaf imports no World. */
export interface RootedGround {
  /** Live creep cover of the named KIND at this point, 0..1 (undefined
   *  when the zone grows no creep at all). */
  creepCover?(kind: string, x: number, y: number): number;
  /** The region/ground kind under this point, if any. */
  groundKind?: string;
}

/** Does this body stand on its own ground RIGHT NOW? Pure. The creep read
 *  uses the fabric's own gameplay predicate (cover ≥ its kind's hitFloor,
 *  resolved by the caller) so "on creep" means here exactly what it means
 *  to a grant, a drag or a drown. */
export function standsRooted(
  spec: RootedSpec, at: { x: number; y: number }, g: RootedGround,
): boolean {
  if (spec.ground?.length && g.groundKind && spec.ground.includes(g.groundKind)) {
    return true;
  }
  if (spec.creep?.length && g.creepCover) {
    for (const kind of spec.creep) {
      if (g.creepCover(kind, at.x, at.y) > 0) return true;
    }
  }
  return false;
}

/** Walk a def registry: a rooted row must name at least one claim, carry
 *  mods worth wearing, and name kinds that actually exist — AND, THE
 *  HONESTY LAW (the reserve fabric's law in its territorial voice), must
 *  be VISIBLE: a body whose power depends on where it stands has to show
 *  it, or the player is guessing. Returns human-readable faults. */
export function validateRooted(
  defs: Record<string, {
    rooted?: RootedSpec;
    creepSource?: { kind: string };
    tells?: { source: string }[];
    brainVariants?: { tells?: { source: string }[] }[];
  } | undefined>,
  has: { creep(id: string): boolean; ground(id: string): boolean },
): string[] {
  const bad: string[] = [];
  for (const id in defs) {
    const def = defs[id];
    const r = def?.rooted;
    if (!def || !r) continue;
    const tag = `${id} rooted`;
    if (!r.creep?.length && !r.ground?.length) {
      bad.push(`${tag}: names no claim (needs creep[] and/or ground[])`);
    }
    if (!r.mods.length && !r.off?.length) {
      bad.push(`${tag}: carries no mods on either side — an inert row`);
    }
    for (const k of r.creep ?? []) {
      if (!has.creep(k)) bad.push(`${tag}: unknown creep kind '${k}'`);
    }
    for (const k of r.ground ?? []) {
      if (!has.ground(k)) bad.push(`${tag}: unknown ground kind '${k}'`);
    }
    if (r.grace !== undefined && r.grace < 0) bad.push(`${tag}: negative grace`);
    // A body that plants its OWN membrane should count it — otherwise the
    // heart it carries buys it nothing and the silhouette lies about the
    // loop. (Naming a KIN's kind instead is legitimate; this only fires
    // when the def's own kind is nowhere in its claim.)
    const own = def.creepSource?.kind;
    if (own && r.creep?.length && !r.creep.includes(own)) {
      bad.push(`${tag}: plants '${own}' but does not claim it`);
    }
    const tells = (rows?: { source: string }[]): boolean =>
      !!rows?.some(t => t.source === 'rooted');
    if (!tells(def.tells) && !def.brainVariants?.some(v => tells(v.tells))) {
      bad.push(`${tag}: ground-worn power with no 'rooted' tell — the player cannot read the claim`);
    }
  }
  return bad;
}
