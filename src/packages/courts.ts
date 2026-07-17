// ---------------------------------------------------------------------------
// EVENT COURTS — themed patron lords ANY encounter package can field.
//
// A court lord is one declarative row: a banner (color + sigil), a creed, a
// themed MINION ROSTER folded into its encounter's field mix, and a DOMAIN —
// the off-graph realm (an ArenaSpec, the shared enterRealmArena pipeline)
// where the lord's VESSEL waits as the pinnacle fight. An encounter opts in
// via EncounterDef.court (which lords it draws from + how the door tears);
// WHICH lord themes a given zone's encounter is a PURE SEEDED ROLL shared by
// every reader (courtLordForZone) — the world map's marker, the in-zone ring
// tint and the domain behind the door all agree without talking.
//
// Distinct from the Underworld's lords (packages/lords.ts) on purpose: those
// are WAR belligerents with tempers the territory sim runs on; a court lord
// is an ENCOUNTER patron — a roster, a tint, a domain, a vessel. The Breach
// registers the first four; a future package fields its own court with rows
// here and zero engine edits.
//
// Pure data leaf: imports types + core only, never World or the renderer.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import type { ArenaSpec } from '../data/arenas';
import type { PackTableEntry } from '../data/zones';

export interface CourtLordDef {
  id: string;
  /** Full style: 'Ashkarra, the Rose Pyre'. */
  name: string;
  /** Bulletin handle: 'Ashkarra'. */
  short: string;
  epithet: string;
  /** The one-line doctrine the UI shows — what waits on the far side. */
  creed: string;
  /** Banner color: ring tint, motes, gate '@event' slots, map marker. */
  color: string;
  /** One text glyph — map badge + flavor surfaces. */
  sigil: string;
  /** Themed minions folded into the field mix at CourtSpec.rosterShare
   *  (presence envelopes honored — weightedPick folds them like any table). */
  roster: PackTableEntry[];
  /** The vessel MonsterDef id — the domain's pinnacle body. */
  vessel: string;
  /** The lord's DOMAIN (data/arenas.ts) — tileset / recipe / name / packs /
   *  ward seals, minted off-graph through the shared realm-arena pipeline. */
  domain: ArenaSpec;
  /** Floating call-to-action over this lord's standing door (per-instance
   *  override of the gate look's own prompt). */
  gatePrompt: string;
  /** Announce lines: deepen = the threshold moment mid-fight; stands = the
   *  door survives the collapse; manifest = the vessel takes the field
   *  ('{name}' = the vessel's def name, the ArenaBossSpec contract). */
  deeds: { deepen: string; stands: string; manifest: string };
}

const COURT_LORDS: Record<string, CourtLordDef> = {};

export function registerCourtLord(def: CourtLordDef): void {
  if (COURT_LORDS[def.id]) console.warn(`[courts] re-registering '${def.id}' — overriding`);
  COURT_LORDS[def.id] = def;
}

export function courtLord(id: string): CourtLordDef | undefined { return COURT_LORDS[id]; }
export function allCourtLords(): CourtLordDef[] { return Object.values(COURT_LORDS); }

/** FNV-1a (the holdfast-overlay idiom — a local copy keeps this leaf pure). */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** THE ONE LORD ROLL — which of `pool` themes this zone's encounter, as a pure
 *  function of the package seed + zone id (its own salted stream, so existing
 *  placement/scale draws stay byte-identical). Every reader — the map marker,
 *  the in-zone field, the door — calls this and agrees. Unknown ids are
 *  filtered (a renamed lord degrades to the survivors, never a crash). */
export function courtLordForZone(pkgSeed: number, zoneId: string, pool: string[]): CourtLordDef | undefined {
  const live = pool.filter(id => COURT_LORDS[id]);
  if (!live.length) return undefined;
  const rng = new Rng((pkgSeed ^ hashStr(zoneId) ^ 0xc0a7) >>> 0);
  return COURT_LORDS[live[rng.int(0, live.length - 1)]];
}
