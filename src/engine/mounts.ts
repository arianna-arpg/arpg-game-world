// --- THE MOUNT FABRIC — cavalry as ONE state pair (engine/mounts.ts) -------
//
// A RIDER is a full actor pinned to a SEAT on another full actor's back:
// `Actor.mountId` (the beast I ride) / `Actor.riderIds` (who rides me).
// World.updateMounts owns everything at runtime — the lazy PAIRING sweep
// (spawn-time cavalry via the composite-parts idiom), the per-frame seat pin
// (drawn == seated), and the severance beats (the unhorsed tumble, the
// widowed steed's conduct). The {do:'mount'} / {do:'dismount'} AI verbs let
// any body claim or quit a saddle mid-fight — remounting is a brain rule,
// never an engine special case.
//
// TWO PAIRING LEVERS, both plain data, both served by the one sweep:
//   MonsterDef.mount      — rider-side: this body ARRIVES mounted (the sweep
//                           mints its steed beneath it). The cavalry lever.
//   mountSlot.crew        — steed-side: this beast ARRIVES crewed (the sweep
//                           mints riders into its free seats). The howdah
//                           lever. A minted steed with crew fills its
//                           remaining seats — bounded by construction, since
//                           minted bodies never pair further.
//
// VOCABULARY LAW (vs the anatomy gamut): composite PARTS are organs — rigid,
// xp-less, break-lesson turrets fused to the platform (the siegeback
// aurochs). MOUNT LINKS are cavalry — two sovereign bodies sharing a saddle,
// either of which may die first, flee, or ride again. A faction that fields
// parts speaks siege; a faction that fields links speaks horsemanship.
//
// This module is a PURE LEAF (the tracks.ts idiom): types, config, seat
// math, the acceptance predicate. The engine half lives in World; the verbs
// in aiActions.ts. Docs: docs/engine/mounts.md; probe balance/probe_mount.ts.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';

// --- config ----------------------------------------------------------------

export const MOUNT_CFG = {
  /** Default seat perch: this × the steed's radius, screen-up. */
  defaultLift: 0.9,
  /** THE UNHORSED BEAT — a steed dying under a live rider throws them: */
  unhorse: {
    /** STATUS_DEFS row stamped on the thrown rider (the tumble daze). */
    status: 'unhorsed',
    /** Tumble impulse away from the dying steed (pushActor units). */
    push: 90,
    /** Floater color for the 'UNHORSED' beat text. */
    color: '#e8c884',
  },
  /** Vault flash color (mount/dismount teleports). */
  vaultFx: '#d8b0ff',
} as const;

// --- data shapes -----------------------------------------------------------

/** One saddle on a steed's back. dx/dy sit in the steed's BODY FRAME in
 *  radius units, rotated by its facing exactly like composite parts (+dx
 *  toward the snout); `lift` then perches the rider screen-up — "on top" is
 *  a presentation truth, not a body-plane one, so it never rotates. */
export interface MountSeat {
  dx?: number;
  dy?: number;
  /** Screen-up perch, radius units (default MOUNT_CFG.defaultLift). */
  lift?: number;
}

/** Steed-side: a rideable back, declared on MonsterDef.mountSlot. */
export interface MountSlotSpec {
  /** Who may sit: matched against a candidate's tag, def id, or faction. */
  kinds: string[];
  /** LEGACY single-seat vertical lift in px (straight above the center,
   *  unrotated). Pre-seats defs keep their exact old geometry; ignored the
   *  moment `seats` is authored. */
  offsetY?: number;
  /** The saddle roster — seat count IS capacity (default: one seat at the
   *  config lift). */
  seats?: MountSeat[];
  /** Conduct when the LAST rider dies (default 'fight'): 'fight' = the
   *  steed's own brain keeps its war (the empty-saddle warg still hunts);
   *  'rout' = its nerve breaks and it flees the field for good. */
  onRiderDeath?: 'fight' | 'rout';
  /** Arrive CREWED: the sweep mints `count` riders (each rolled from
   *  `riders`) into free seats at spawn, `chance`-gated per steed (default
   *  1). Crew are full actors — they fight, die, and pay xp as themselves. */
  crew?: { riders: string[]; count?: [number, number]; chance?: number };
}

/** Rider-side: this body arrives mounted, declared on MonsterDef.mount. */
export interface MountSpec {
  /** Steed def id — an array is an even pick per spawn. */
  on: string | string[];
  /** Fraction of spawns that arrive mounted (default 1) — the rest walk. */
  chance?: number;
}

// --- pure math -------------------------------------------------------------

/** Seat capacity of a slot (legacy slots hold one). */
export function seatCount(slot: MountSlotSpec | undefined): number {
  return slot?.seats?.length ?? 1;
}

/** World-space saddle point for seat `idx` on a steed. Pure — the pin, the
 *  renderer, and any probe all read the SAME resolver (drawn == seated). */
export function seatPos(
  steed: { pos: Vec2; facing: number; radius: number },
  slot: MountSlotSpec | undefined, idx: number,
): { x: number; y: number } {
  const s = slot?.seats?.[idx];
  if (!s) {
    // Legacy geometry, verbatim: straight above by offsetY px (or 0.9r).
    return { x: steed.pos.x, y: steed.pos.y - (slot?.offsetY ?? steed.radius * MOUNT_CFG.defaultLift) };
  }
  const c = Math.cos(steed.facing), sn = Math.sin(steed.facing);
  const dx = s.dx ?? 0, dy = s.dy ?? 0;
  return {
    x: steed.pos.x + (dx * c - dy * sn) * steed.radius,
    y: steed.pos.y + (dx * sn + dy * c) * steed.radius
      - (s.lift ?? MOUNT_CFG.defaultLift) * steed.radius,
  };
}

/** May this candidate sit this saddle? Tag / def id / faction, the mount
 *  verb's original contract — shared by the verb, the crew mint, and the
 *  pairing sweep so acceptance can never fork. */
export function mountAccepts(
  slot: MountSlotSpec | undefined,
  who: { tag?: string; defId?: string; faction?: string },
): boolean {
  if (!slot) return false;
  return slot.kinds.some(k => who.tag === k || who.defId === k || who.faction === k);
}
