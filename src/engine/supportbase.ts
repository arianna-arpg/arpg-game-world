// ============================================================================
// THE SUPPORT BASE — the gem as an ITEM BASE (her ruling, 2026-08-28).
//
// A SupportDef wearing `rollBase` is a CHASSIS: in every mannerism an
// ordinary support — it drops through the normal gem stream, sits in a
// normal unlock pool, sockets by the normal gate, levels by the normal
// essence feed — but its PAYLOAD is CUT PER COPY: one weighted row drawn
// per axis at the mint site, stamped onto the instance, and never re-rolled.
// Four copies of the same gem are four different gems. The complexity of
// support DROPS collapses onto the support ITSELF — each copy matters
// inherently, which is what makes a chase item (skill rarity's sibling,
// in the vein a support actually wants).
//
// THE LAWS:
//  - FIXED AT THE VEIN (her Card-B ruling): the cut rolls ONCE where the
//    gem is minted and rides the copy forever — bag, socket, save, corpse,
//    vendor shelf. Re-rolling is not a mechanic (a future re-cut sink is
//    hers to open deliberately).
//  - ORDINARY IN EVERY MANNERISM (her step-back): no reserved drop family,
//    no special counter, no system name in the player's face — the gem is
//    just a support whose copies differ. Vendor mints roll under the
//    foreordained shelf's own seeded swap, so a reload meets the same cuts.
//  - THE CANONICAL CUT: each axis's FIRST row. It is the one deterministic
//    face every blob-less instance wears — the no-op matrix's census probe
//    (her Card-C: pinned, committed in data, gate-able), the worn-graft
//    grant (Card G: a granted copy is deliberately dull; the wild copy
//    stays special), and the tolerant fallback for a data-patched row id.
//  - THE GATE READS THE CUT (her Card-D ruling): each row may demand
//    mechanisms of the host; the socket gate unions the resolved cut's
//    demands and refuses ONLY a cut that structurally cannot work — the
//    same chassis with a workable cut sockets fine. Blob-less fit reads
//    the canonical cut. Structural and self-lifting, never a skill list.
//  - OPEN AXES: the table is data; new rows are content. The 'spawn'
//    chassis (the debut) folds trigger × brood × clutch into triggered
//    births through THE CLUTCH DOOR (World.birthAt — capped, mortal,
//    keeper-credited minions). Future chassis kinds name new executors.
//
// Dials in SUPPORTBASE_CFG; docs in docs/engine/supportbase.md; probe
// balance/probe_supportbase.ts. All numbers are dials.
// ============================================================================

import type { SupportDef, SupportInstance } from './skills';
import type { Modifier } from './stats';

/** THE CUT: axis id → drawn row id. Serialized verbatim on the gem's
 *  wrapper payload, socket rows, and character-save socket rows. */
export type SupportRolled = Record<string, string>;

/** One rollable row. `line` is the tooltip's read (the cut must READ —
 *  a chase item you cannot read is a lottery ticket, not a chase);
 *  `requiresMechanisms` is Card D's per-row demand on the host. The
 *  remaining fields are the 'spawn' chassis's vocabulary: a TRIGGER row
 *  carries exactly one of every/pct/hits, a BROOD row carries monsterId,
 *  a CLUTCH row carries count+cap. */
export interface SupportRollRow {
  id: string;
  weight: number;
  line: string;
  requiresMechanisms?: string[];
  /** ROLLED MODIFIERS (her Multistrike ruling): the row's own numbers,
   *  joined into instanceMods exactly like the def's mods (forwardScale
   *  prices them, overrides pass whole). A mods-only chassis needs no
   *  executor kind at all — the fold IS the behavior; a dropped copy is
   *  no longer "complete" at the drop, and the premier cut is the chase. */
  mods?: Modifier[];
  /** Trigger forms — every landed blow / a chance per blow / a gauge. */
  every?: true;
  pct?: number;
  hits?: number;
  /** Brood — the kind the vein bears (a registered MonsterDef). */
  monsterId?: string;
  /** Clutch — bodies per bearing + the live cap. */
  count?: number;
  cap?: number;
}

export interface SupportRollAxis { id: string; rows: SupportRollRow[] }

export interface SupportRollBase {
  /** The chassis kind — names the EXECUTOR that folds a cut into active
   *  behavior. 'spawn' (the vein debut): triggered births at the struck
   *  body through the clutch door. ABSENT = a pure-mods chassis (the
   *  Multistrike shape): the rows' rolled modifiers are the whole payload
   *  and no executor runs. */
  kind?: 'spawn';
  axes: SupportRollAxis[];
}

export const SUPPORTBASE_CFG = {
  spawn: {
    /** Seconds a vein-born body serves (× the keeper's effectDuration,
     *  folded by birthAt's instance-less lane). */
    duration: 12,
  },
} as const;

/** Draw one cut: a weighted row per axis. `rand` defaults to the ambient
 *  stream — vendor mints call under the foreordained shelf's seeded swap,
 *  the commission mint passes its beat rng, kill drops ride combat dice. */
export function rollVein(base: SupportRollBase, rand: () => number = Math.random): SupportRolled {
  const cut: SupportRolled = {};
  for (const ax of base.axes) {
    let total = 0;
    for (const r of ax.rows) total += Math.max(0, r.weight);
    let roll = rand() * total;
    let picked = ax.rows[0];
    for (const r of ax.rows) {
      roll -= Math.max(0, r.weight);
      if (roll <= 0) { picked = r; break; }
    }
    cut[ax.id] = picked.id;
  }
  return cut;
}

/** THE CANONICAL CUT — each axis's first row: the census face, the
 *  worn-graft default, the tolerant fallback. Authoring order is the pin. */
export function canonicalVein(base: SupportRollBase): SupportRolled {
  const cut: SupportRolled = {};
  for (const ax of base.axes) if (ax.rows.length) cut[ax.id] = ax.rows[0].id;
  return cut;
}

/** Resolve a cut to its rows — tolerant per axis: an unknown row id (a
 *  data patch renamed it) falls back to that axis's canonical row, so a
 *  saved gem never bricks (the attunedForm law). */
export function resolveVein(
  base: SupportRollBase, rolled?: SupportRolled,
): Record<string, SupportRollRow> {
  const out: Record<string, SupportRollRow> = {};
  for (const ax of base.axes) {
    if (!ax.rows.length) continue;
    const want = rolled?.[ax.id];
    out[ax.id] = ax.rows.find(r => r.id === want) ?? ax.rows[0];
  }
  return out;
}

/** Card D's union: every mechanism the resolved cut demands of a host. */
export function veinMechanisms(base: SupportRollBase, rolled?: SupportRolled): string[] {
  const out: string[] = [];
  for (const row of Object.values(resolveVein(base, rolled))) {
    for (const m of row.requiresMechanisms ?? []) if (!out.includes(m)) out.push(m);
  }
  return out;
}

/** The tooltip's rolled block — one line per axis, in axis order. */
export function veinLines(base: SupportRollBase, rolled?: SupportRolled): string[] {
  return Object.values(resolveVein(base, rolled)).map(r => r.line);
}

/** The cut's own MODIFIERS (her Multistrike ruling) — concatenated in
 *  axis order; instanceMods folds them beside the def's mods under the
 *  same forward-scale law. Blob-less = the canonical cut's numbers, which
 *  a converted legacy gem authors to equal its OLD fixed values exactly —
 *  every existing copy, worn graft, and census probe stays byte-identical
 *  (absent == identical), and only fresh drops roll the spread. */
export function veinMods(base: SupportRollBase, rolled?: SupportRolled): Modifier[] {
  const out: Modifier[] = [];
  for (const row of Object.values(resolveVein(base, rolled))) {
    if (row.mods) out.push(...row.mods);
  }
  return out;
}

/** The 'spawn' chassis's folded spec — null when the cut cannot fold (the
 *  validator's net keeps authored tables whole; null is the tolerant
 *  refusal, never a throw). */
export function spawnVeinOf(
  base: SupportRollBase, rolled?: SupportRolled,
): { every?: true; pct?: number; hits?: number; monsterId: string; count: number; cap: number } | null {
  if (base.kind !== 'spawn') return null;
  const rows = Object.values(resolveVein(base, rolled));
  const trigger = rows.find(r => r.every || r.pct !== undefined || r.hits !== undefined);
  const brood = rows.find(r => r.monsterId !== undefined);
  const clutch = rows.find(r => r.count !== undefined);
  if (!trigger || !brood?.monsterId || !clutch?.count) return null;
  return {
    ...(trigger.every ? { every: true as const } : {}),
    ...(trigger.pct !== undefined ? { pct: trigger.pct } : {}),
    ...(trigger.hits !== undefined ? { hits: trigger.hits } : {}),
    monsterId: brood.monsterId,
    count: clutch.count,
    cap: clutch.cap ?? clutch.count * 2,
  };
}

/** THE ONE MINT: every site that stands a fresh support instance up calls
 *  this — a chassis def rolls its cut here (fixed at the vein), any other
 *  def passes through untouched. Rehydration sites never call it: a saved
 *  cut is preserved, never re-rolled. */
export function mintSupportInstance(
  def: SupportDef, level: number, rand?: () => number,
): SupportInstance {
  return {
    def, level,
    ...(def.rollBase ? { rolled: rollVein(def.rollBase, rand) } : {}),
  };
}
