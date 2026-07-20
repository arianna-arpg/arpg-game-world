// ---------------------------------------------------------------------------
// ZONE INFO AGGREGATOR — "everything happening in one zone", for the World Map's
// hover/pin side panel (and the HUD, and anything else that wants a structured
// read of a node).
//
// The map can stack many overlapping things on one node — a Ritual, a Hunt
// beast, a Fracture, a Demon epicenter, a Crusade hold, plus ambient biome /
// day-night / weather / faction territory, and (later) zone modifiers. The map
// glyphs alone can pile up illegibly, so this collapses the lot into an ordered
// list of typed rows the side box renders with high fidelity but low clutter.
//
// It is an extensible SPINE, mirroring mapMarkers' registry design:
//   • EVENTS come free by folding the existing map markers (every event already
//     has a marker + an authored title + a glyph), so a new event auto-appears
//     in the box with zero edits here — exactly like adding a marker.
//   • CONDITIONS (biome / time / weather / territory) come from WorldSim, which
//     already composes them for the HUD one-liner (one source of truth).
//   • EXTRA rows (richer event detail now; zone modifiers and other map-laden
//     effects later) come from registerZoneInfoSource(...), the open extension
//     point. Adding a row kind never touches the renderer.
//
// Like markers, this NEVER reveals what the fog hides: a 'charted' marker stays
// hidden on un-visited ground, and conditions only resolve for charted nodes.
// Secret mechanics (e.g. the Conclave incubation counter) have no marker detail
// and no source here, so they stay secret.
// ---------------------------------------------------------------------------

import { collectMarkers } from './mapMarkers';
import { BIOMES } from './biomes';
import { boundaryGateOf } from '../data/boundaryGates';
import { meldOf } from '../data/melds';
import type { World } from '../engine/world';

/** Where a row sits in the box: prominent events first, then modifiers, then the
 *  ambient conditions footer. Open string so a future contributor can add a kind
 *  without editing this union (the renderer groups known kinds, lists the rest). */
export type ZoneInfoKind = 'event' | 'modifier' | 'condition';

export interface ZoneInfoEntry {
  kind: ZoneInfoKind;
  /** A short glyph, matching the map marker where the row mirrors one — so a row
   *  and its icon on the map read as the same thing. */
  icon: string;
  /** Accent colour for the icon chip (reuse the marker stroke / faction colour
   *  for instant icon↔row correspondence). */
  color?: string;
  /** Badge disc fill. When set, the pane renders the icon as a MINI BADGE —
   *  the same filled disc + ring + glyph the chart draws — so the row and the
   *  map icon are visibly the same object (the marker fold sets it; a plain
   *  contributor may leave it unset for a flat glyph). */
  fill?: string;
  /** Glyph tone inside a filled badge (defaults to `color`). */
  glyphColor?: string;
  /** Primary text (the authored event title, the biome name, …). */
  label: string;
  /** Secondary text — stage / tier / severity / monster level, etc. */
  detail?: string;
  /** Draw order within a group (higher first). */
  z?: number;
}

/** A contributor of extra rows for a zone — modifiers, richer event detail, … */
export type ZoneInfoSource = (world: World, zoneId: string) => ZoneInfoEntry[];

const SOURCES: ZoneInfoSource[] = [];

/** Register an extra-row source (called once at boot per feature). Mirrors
 *  registerMarkerSource — overlays opt in at import time, the panel stays dumb. */
export function registerZoneInfoSource(s: ZoneInfoSource): void { SOURCES.push(s); }

const GROUP_ORDER: Record<ZoneInfoKind, number> = { event: 0, modifier: 1, condition: 2 };

/** Resolve everything touching `zoneId` into an ordered, typed row list. Sources
 *  that throw are skipped so one bad contributor can't blank the whole box. */
export function zoneInfoFor(world: World, zoneId: string): ZoneInfoEntry[] {
  const out: ZoneInfoEntry[] = [];
  const zone = world.zoneMap[zoneId];
  if (!zone) return out;
  const charted = world.visited.has(zoneId);

  // EVENTS — fold every map marker anchored on this node. Respect the SAME fog
  // gate the map uses (a 'charted' marker hides on un-visited ground), so the box
  // never reveals more than the map already shows. The fold carries the marker's
  // WHOLE badge look (fill/stroke/text) + its detail line: since map icons are
  // pointer-transparent paint (the interactivity contract), this pane row IS the
  // icon's one and only info surface — it must read as the same badge.
  for (const m of collectMarkers(world)) {
    if (m.zoneId !== zoneId) continue;
    if (m.fog === 'charted' && !charted) continue;
    out.push({
      kind: 'event', icon: m.glyph, color: m.stroke, fill: m.fill, glyphColor: m.text,
      label: m.title, detail: m.detail, z: m.z ?? 0,
    });
  }

  // EXTRA rows — richer event detail now, zone modifiers later (the spine).
  for (const s of SOURCES) {
    try { out.push(...s(world, zoneId)); } catch { /* a bad source never blanks the box */ }
  }

  // CONDITIONS — ambient biome / time / weather / territory, charted ground only
  // (reuses the HUD's composition so the box and the HUD never diverge).
  if (charted) out.push(...world.sim.zoneConditions(zone, world.time));

  // THE THRESHOLD BREATH — an enclave's gate line and a biome's edge-meld
  // words, moved here OFF the field's portal labels (the clutter-free field
  // law): in the field the stamped meld band and the gate's arch glyph are
  // the telegraph — the terrain speaks for itself — while the chart carries
  // the words. Derived from the zone's own biome row, so any future enclave
  // or meld surfaces here with zero edits. Charted ground only, like every
  // condition (the fog keeps its secrets).
  if (charted && zone.biome) {
    const bi = BIOMES[zone.biome];
    const gate = bi?.enclave ? boundaryGateOf(bi.enclave.gate) : undefined;
    if (gate?.label) {
      out.push({
        kind: 'condition', icon: '∩', color: gate.accent, label: gate.label,
        detail: 'an enclave — every crossing passes its gate', z: -1,
      });
    }
    const meld = bi?.meld ? meldOf(bi.meld) : undefined;
    if (meld?.label) {
      out.push({
        kind: 'condition', icon: '❧', label: meld.label,
        detail: 'its edges dress the neighboring approaches', z: -1,
      });
    }
  }

  // Group order (events → modifiers → conditions), highest z first within a group.
  return out.sort((a, b) =>
    GROUP_ORDER[a.kind] - GROUP_ORDER[b.kind] || (b.z ?? 0) - (a.z ?? 0));
}
