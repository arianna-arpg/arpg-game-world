// --- THE PACK LAYER — social state as a readable information layer --------
//
// A group of enemies reads as N independent bodies. In truth the roster has
// carried social machinery for a long time — MonsterDef.bond proximity mods,
// MoraleSpec courage, SquadSpec muster/tokens/demeanor, juvenileBelow young,
// DriveSpec.share pack appetite, PerceptionSpec.alertShout callouts — and
// NONE of it was visible. A mob with an invisible structure is a mob; the
// same mob with its structure DRAWN is a puzzle with a correct kill order.
//
// This is the READ, not a new buff system. Every mechanic here already
// existed; the pack layer binds each one to something the eye can find:
//
//   THE WARDEN     bond mods → a DRAWN LINK, holder → each body it empowers
//   THE CRAVEN     morale    → a continuous NERVE, worn as collapsing posture
//   THE MATRIARCH  juveniles → the young flee TO her, and both facts show
//   THE COURSING   shared drives → the pack's appetite worn by every member
//
// THE LAWS (probe-pinned, balance/probe_pack.ts):
//  - DRAWN == TESTED. A link is not a second scan that might disagree with
//    the first: the bond sweep RECORDS the holder it found (Actor.bondFrom)
//    at the same instant it decides Actor.bondHeld, and the draw list is
//    that record. The mods and the line are the same answer. Likewise the
//    nerve is stamped by updateMorale from the SAME terms the break
//    decision reads (the aiFoeCastSec precedent) — posture cannot drift
//    from courage.
//  - CHEAP + CAPPED. The link derivation is one pass over live bodies with
//    a SHARE LAW (PACK_CFG.links) modelled on the light budget's: a total
//    cap, a per-holder cap so one warden cannot flood the layer, and a
//    deterministic, view-bin-quantized drop order so the kept set never
//    reshuffles as the camera pans.
//  - CO-OP SAFE. The holder is shipped as its HOST id (ActorW.bl) and
//    re-pointed client-side through the same actor pool the snapshot keys
//    on; both halves then run this identical derivation over live
//    positions, so the link tracks interpolated bodies exactly and host
//    and client draw the same structure.
//  - LIVE ENDPOINTS. Rows reference the BODIES, never cached coords — a
//    link is re-read every frame from the positions actually drawn.
//
// A PURE LEAF (the mounts.ts / tells.ts idiom): types, config, the share
// law, and the courage math — structural views only, no World import, no
// data-registry import (the def lookup arrives as an injected resolver).
// Docs: docs/engine/pack.md; probe balance/probe_pack.ts.
// ---------------------------------------------------------------------------

// --- config ----------------------------------------------------------------

export const PACK_CFG = {
  /** THE LINK BUDGET — the lights share-law's kin (VIS_CFG.lights.share).
   *  Links are cheap strokes, but a warren of wardens is a real crowd and
   *  an un-capped layer is exactly the "strange lights" class war reborn. */
  links: {
    /** Total drawn links per frame across every holder. */
    max: 40,
    /** Per-holder cap — one warden's court can never eat the whole budget. */
    perHolder: 8,
    /** View-centre bin (world units) the drop order quantizes to, so the
     *  kept set changes only at bin crossings — never a per-frame
     *  reshuffle (the light cluster law's shape). */
    viewBin: 176,
    /** Default line look when a bond authors no style of its own. */
    color: '#e8c66a',
    width: 2.5,
    style: 'banner' as LinkStyleKind,
    /** Soft under-stroke width multiple + its alpha (the tether idiom). */
    haloMul: 2.6,
    haloAlpha: 0.18,
    /** Core line alpha, and the pulse depth/rate that makes a live wire
     *  read as live rather than as a static UI overlay. Tuned brighter
     *  than the tether band: a tether is a mechanic's plumbing, the bond
     *  link is the chip's HEADLINE read — "kill that one first" has to
     *  carry across a full room at a glance. */
    coreAlpha: 0.62,
    pulseDepth: 0.22,
    pulseRate: 3.2,
    /** Link endpoints inset toward each body's rim by this fraction of the
     *  body radius, so a line springs from a shoulder, not from a navel. */
    inset: 0.62,
    /** 'root' sag as a fraction of the span; 'chain' dash period (px). */
    sag: 0.16,
    dash: 9,
  },
  /** THE NERVE — the continuous courage reading behind MoraleSpec's binary
   *  break. 1 = steady, 0 = breaking. Every term is a pure function of the
   *  SAME numbers updateMorale already evaluates. */
  nerve: {
    /** Nerve floor while actually routing (a broken body is not "nearly
     *  broken", it IS broken — the posture must bottom out). */
    routed: 0,
    /** Skittish bodies read their nerve off the nearest intruder's
     *  approach across this multiple of the skittish radius: at 1 the
     *  fraying begins exactly at the bubble's edge, above 1 it begins
     *  further out (a hare is uneasy before it bolts). */
    skittishReach: 2.2,
  },
  /** THE WARD — MoraleSpec.wardTo: a rout that RUNS TO its guardian rather
   *  than merely away. The young of the world flee to the adult. */
  ward: {
    /** Default search reach for a guardian (px). */
    seek: 900,
    /** ARRIVED — inside this multiple of the guardian's radius the flight
     *  ends: the ward stops running and holds at her flank. A tight ring,
     *  because this answers "am I there yet". */
    huddleMul: 2.6,
    /** GATHERED — within this of a guardian a ward counts as huddled, and
     *  BOTH halves of the read key on this one number: the ward's own
     *  wardNear pins to 1, and the guardian's broodNear counts it. It is
     *  deliberately far wider than the arrival ring, because young cluster
     *  AROUND an adult rather than standing inside her — and because panic
     *  routinely ends before a calf reaches the flank (it ran until it was
     *  safe, which is the honest behavior). One threshold for both halves
     *  means a matriarch can never read "no young" while a young reads
     *  "guarded". */
    huddleRadius: 230,
  },
  /** THE PACK SWEEP — the shared social reads (kin counts, mean drives)
   *  every member wears. Cadenced like the tell sweep; the aggregate is
   *  computed ONCE per squad, never per member. */
  sweepSec: 0.2,
  /** Earshot for kin counts + shared drive means when a def names none. */
  kinRadius: 520,
} as const;

// --- the drawn bond -----------------------------------------------------------

/** How a link READS. Four grammars, all one stroke pass:
 *   'beam'   a straight taut line of light (arcane wardship)
 *   'banner' the same line with a slow travelling swell (a rallying flag)
 *   'root'   a sagging ground-cord (fungal / vegetal / chthonic kinship)
 *   'chain'  dashed segments (bound service, thrall-work) */
export type LinkStyleKind = 'beam' | 'banner' | 'root' | 'chain';

/** THE DRAWN BOND's look, authored on MonsterDef.bond.link. Absent = the
 *  PACK_CFG defaults (every bond is legible out of the box — the point of
 *  the chip); `false` = a deliberately INVISIBLE bond, for the rare synergy
 *  a player is meant to infer rather than see. */
export interface BondLinkStyle {
  color?: string;
  width?: number;
  style?: LinkStyleKind;
  /** Draw priority when the budget is short — higher survives (a boss's
   *  court outranks a trash warden's). Default 0. */
  weight?: number;
}

/** The narrow body view the link derivation reads. Actor satisfies it
 *  structurally; the probe hand-builds one in four lines. READS ONLY. */
export interface PackLinkBody {
  id: number;
  dead: boolean;
  pos: { x: number; y: number };
  radius: number;
  defId?: string;
  /** True while this body currently WEARS its bond mods. */
  bondHeld: boolean;
  /** The living holder those mods came from — recorded by the same scan
   *  that set bondHeld, so the line and the buff are one answer. */
  bondFrom?: PackLinkBody;
}

/** One drawn link. Endpoints are the BODIES (live positions at draw time),
 *  never cached coords — the line can never detach from what it binds. */
export interface PackLink {
  from: PackLinkBody;
  to: PackLinkBody;
  color: string;
  width: number;
  style: LinkStyleKind;
}

/** Resolve a def id to its authored link style (injected so this leaf never
 *  imports the monster registry). undefined = defaults; false = no link. */
export type LinkStyleOf = (defId: string | undefined) => BondLinkStyle | false | undefined;

/** Is this pairing currently REAL — both bodies alive and the bond worn?
 *  The single predicate the derivation and the probe share, so "what the
 *  probe checks" and "what gets drawn" are the same sentence. */
export function bondLinkLive(b: PackLinkBody): boolean {
  const h = b.bondFrom;
  return !!(b.bondHeld && !b.dead && h && !h.dead && h !== b);
}

/** THE LINK DERIVATION — every live bond, share-law capped, deterministic.
 *
 *  Order of survival when the budget is short:
 *    1. authored `weight` (a court outranks a rabble)
 *    2. proximity of the pair's midpoint to the VIEW CENTRE, quantized to
 *       PACK_CFG.links.viewBin — so panning does not reshuffle the set
 *    3. holder id, then beneficiary id — a total order, so two runs over
 *       the same world produce byte-identical lists (co-op + replay)
 *
 *  Writes into `into` when given (steady-state zero alloc) and returns it. */
export function packLinks(
  bodies: readonly PackLinkBody[],
  styleOf: LinkStyleOf,
  view: { x: number; y: number },
  into?: PackLink[],
): PackLink[] {
  const out = into ?? [];
  out.length = 0;
  const cfg = PACK_CFG.links;
  // Collect every live pairing whose def has not opted out of the draw.
  const rows: { l: PackLink; w: number; d: number }[] = [];
  const bin = Math.max(1, cfg.viewBin);
  const vx = Math.round(view.x / bin);
  const vy = Math.round(view.y / bin);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (!bondLinkLive(b)) continue;
    const st = styleOf(b.defId);
    if (st === false) continue;
    const h = b.bondFrom!;
    // Distance is measured from the BIN-QUANTIZED view centre to the pair's
    // midpoint, also binned: the comparison key only moves when the camera
    // crosses a bin, which is what makes the kept set stable.
    const mx = Math.round((h.pos.x + b.pos.x) * 0.5 / bin) - vx;
    const my = Math.round((h.pos.y + b.pos.y) * 0.5 / bin) - vy;
    rows.push({
      l: {
        from: h, to: b,
        color: st?.color ?? cfg.color,
        width: st?.width ?? cfg.width,
        style: st?.style ?? cfg.style,
      },
      w: st?.weight ?? 0,
      d: mx * mx + my * my,
    });
  }
  if (!rows.length) return out;
  rows.sort((p, q) =>
    q.w - p.w || p.d - q.d ||
    p.l.from.id - q.l.from.id || p.l.to.id - q.l.to.id);
  // THE SHARE LAW: a per-holder cap first (no single warden floods the
  // layer), then the total budget.
  const perHolder = new Map<number, number>();
  for (let i = 0; i < rows.length && out.length < cfg.max; i++) {
    const l = rows[i].l;
    const n = perHolder.get(l.from.id) ?? 0;
    if (n >= cfg.perHolder) continue;
    perHolder.set(l.from.id, n + 1);
    out.push(l);
  }
  return out;
}

// --- the nerve ------------------------------------------------------------------
//
// MoraleSpec decides a BINARY break. The nerve is that decision's continuous
// shadow: the same terms, un-thresholded, so a body about to break LOOKS
// like a body about to break. Each helper is pure and total; updateMorale
// stamps min(terms) onto Actor.aiNerve at the one place the terms are known.

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Courage from wounds: 1 at full life, 0 exactly at the break line and
 *  below (a body under its own threshold has no nerve left to lose). */
export function nerveFromLife(lifeFrac: number, breakAtLife: number): number {
  if (breakAtLife >= 1) return lifeFrac >= 1 ? 1 : 0;
  return clamp01((lifeFrac - breakAtLife) / (1 - breakAtLife));
}

/** Courage from the odds: 1 while not outnumbered, 0 at the full deficit.
 *  `deficit` ≤ 0 is degenerate (breaks immediately) and reads 0. */
export function nerveFromOdds(foes: number, friends: number, deficit: number): number {
  if (deficit <= 0) return 0;
  return clamp01(1 - (foes - friends) / deficit);
}

/** Courage from proximity (the SKITTISH lane): 1 while the nearest
 *  intruder is beyond PACK_CFG.nerve.skittishReach × radius, easing to 0
 *  as it reaches the bolt bubble itself. A hare frays before it runs. */
export function nerveFromProximity(nearest: number, radius: number): number {
  if (radius <= 0) return 1;
  const reach = radius * PACK_CFG.nerve.skittishReach;
  if (reach <= radius) return nearest <= radius ? 0 : 1;
  return clamp01((nearest - radius) / (reach - radius));
}

// --- the shared reads ----------------------------------------------------------

/** One squad's social aggregate, recomputed on the pack sweep and read by
 *  every member's tells (computed ONCE per squad, never per member). */
export interface PackAggregate {
  /** Living members counted in the sweep. */
  kin: number;
  /** Mean of each drive present on any member — THE PACK'S appetite, the
   *  thing DriveSpec.share was already producing invisibly. */
  drives: Map<string, number>;
}

/** Fold a squad's members into its aggregate, IN PLACE when given (the
 *  no-churn law: the map instances persist across sweeps). Pure over the
 *  member list; the caller supplies only living, in-earshot bodies. */
export function foldPack(
  members: readonly { drives: Map<string, number> }[],
  into?: PackAggregate,
): PackAggregate {
  const agg: PackAggregate = into ?? { kin: 0, drives: new Map() };
  agg.kin = members.length;
  const d = agg.drives;
  for (const k of d.keys()) d.set(k, 0);
  if (!members.length) { d.clear(); return agg; }
  for (const m of members) {
    for (const [k, v] of m.drives) d.set(k, (d.get(k) ?? 0) + v);
  }
  for (const [k, v] of d) d.set(k, v / members.length);
  return agg;
}
