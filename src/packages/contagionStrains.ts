// ---------------------------------------------------------------------------
// THE STRAIN GRAMMAR — the Contagion's variant identities as open data
// (Movement II of the mycelia/contagion differentiation pass, her charter
// ratified 2026-08-06).
//
// A fresh outbreak ROLLS one strain at ignition (seeded on the overlay's own
// stream), and every body the plague takes wears that strain's STATUS — the
// look, the buff, and the temper all live on the status row (engine/status.ts),
// so a strain is one registry row + one status row and NOTHING else. The
// registry is open (registerStrain) so a variant contagion — a second
// corruption, a realm's own pox — adds strains without touching the overlay
// or the engine.
//
// THE RESERVED-WORD LAW (the Descent's abyssal-register precedent): a strain
// registered at weight 0 is RESERVED, structurally unrollable, and the
// validators skip its status — 'mutant' rides that row below (registered by
// defs/contagion.ts): its id and row shape are Movement III's seam (the
// runtime part-graft), and nothing of it is built here.
//
// Every consumer resolves through strainOf()/rollStrain(); no strain id is
// ever compared as a literal outside this module's rows.
// ---------------------------------------------------------------------------

import type { Rng } from '../core/rng';
import type { MonsterPartDef } from '../engine/actor';

/** One strain of the plague — the whole variant as one row. */
export interface StrainDef {
  id: string;
  /** The severity word's companion on the map row ("virulent (Miasmal)"). */
  label: string;
  /** The status every infected body wears (engine/status.ts row — the buff,
   *  the zombie-lean flags, and the worn body fx all live there). Weight-0
   *  RESERVED strains may name a status that does not exist yet. */
  statusId: string;
  /** The strain's accent (announce lines; the status row carries its own). */
  color?: string;
  /** Roll weight at ignition. 0 = RESERVED (never rolled, validators skip —
   *  the weight-0 reserved-word law). */
  weight: number;
  /** Optional stumble-in line (materializeContagion's arrival text). */
  arrive?: string;
  /** THE GRAFT (Movement III — the mutant's face): a part row this strain
   *  SPROUTS on every body it takes, minted mid-life through World.graftPart
   *  onto the standing composite fabric — so the growth inherits the whole
   *  death asymmetry as law: the host's death takes its graft with it; the
   *  graft's death frees the host unharmed. The engine grafts once per
   *  infection (a killed growth stays killed) and the cure WITHERS it (a
   *  cured body keeps no scar — transience). Absent = the strain marks
   *  flesh and grows nothing (miasma/adrenal). */
  graft?: MonsterPartDef;
  /** RESERVED (her future pass, recorded 2026-08-06: per-strain zero
   *  identities — "each strain's outbreak fields its own zero"). Nothing
   *  reads this yet — the shape is held so wave two lands as pure data: a
   *  strain-owned boss def + name pool overriding the surge's own zero. */
  zero?: { bossDefId?: string; names?: string[] };
}

const STRAINS: StrainDef[] = [];

/** Register a strain (module scope, once per row — replace-by-id, HMR-safe:
 *  the registerGroundClaim idiom). */
export function registerStrain(row: StrainDef): void {
  const i = STRAINS.findIndex(s => s.id === row.id);
  if (i >= 0) STRAINS[i] = row;
  else STRAINS.push(row);
}

/** Resolve a strain by id (undefined when unknown — consumers must tolerate:
 *  a legacy save may name a strain a mod removed). */
export function strainOf(id: string | undefined): StrainDef | undefined {
  return id === undefined ? undefined : STRAINS.find(s => s.id === id);
}

/** The strain a worn status marks, if any (the infection sweep's revert scan
 *  reads worn statuses backward into strains). */
export function strainByStatus(statusId: string): StrainDef | undefined {
  return STRAINS.find(s => s.statusId === statusId);
}

/** Registered ids, reserved rows included (probes / dev introspection). */
export function strainIds(): string[] { return STRAINS.map(s => s.id); }

/** ROLL a strain for a fresh outbreak on the caller's own stream — weighted
 *  over the ROLLABLE rows (weight > 0). Returns undefined only when nothing
 *  rollable is registered (the overlay then runs strainless, exactly the
 *  pre-Movement-II plague — absent rows degrade, never throw). */
export function rollStrain(rng: Rng): StrainDef | undefined {
  const live = STRAINS.filter(s => s.weight > 0);
  if (!live.length) return undefined;
  let total = 0;
  for (const s of live) total += s.weight;
  let r = rng.next() * total;
  for (const s of live) { r -= s.weight; if (r <= 0) return s; }
  return live[live.length - 1];
}
