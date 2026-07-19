// ---------------------------------------------------------------------------
// THE HARBORHOLD FABRIC — the world-side half: PURE resolvers over the data
// (data/harborholds.ts) and the placed town structure, plus the omen source.
//
// Everything here is deliberately leaf-shaped: plan scans, rect geometry,
// seeded dress rolls — no World state mutated, no engine imports beyond
// types. The World runtime (engine/world.ts) owns the muster, the waves, the
// state transitions, and the dress reconcile; it calls down into these so the
// probe (balance/probe_harborholds.ts) can pin the laws without a boot.
//
// THE PLAN IS THE TRUTH: service seats and the gate are read off the placed
// structure's own plan/doors — coordinates are never authored twice, so a
// re-drawn town re-seats its services by construction.
// ---------------------------------------------------------------------------

import type { Rng } from '../core/rng';
import { HARBORHOLD_CFG, HOLD_CLASSES, type HoldDressRow } from '../data/harborholds';
import { STRUCTURES, type StructureDef } from '../data/structures';
import { registerDormantTag } from '../engine/ai';
import type { PlacedDoor, PlacedStructure } from '../engine/levelgen';
import type { World } from '../engine/world';
import { registerMarkerSource, type MapMarker } from './mapMarkers';
import type { Omen } from './omens';
import { registerOmenSource } from './omens';

export interface Vec2Like { x: number; y: number }

/** Scan a plan def for a legend char — the seat resolver's pure half.
 *  Returns plan-cell coords (col, row) of the FIRST occurrence, or null. */
export function holdSeatCell(def: StructureDef, ch: string): { cx: number; cy: number } | null {
  const plan = def.plan;
  if (!plan) return null;
  for (let row = 0; row < plan.length; row++) {
    const col = plan[row].indexOf(ch);
    if (col >= 0) return { cx: col, cy: row };
  }
  return null;
}

/** A service seat's WORLD position: the placed rect + the plan cell center.
 *  Null when the def carries no such anchor (a class without that service). */
export function holdSeatPos(ps: PlacedStructure, ch: string): Vec2Like | null {
  const def = STRUCTURES[ps.defId];
  if (!def) return null;
  const cell = holdSeatCell(def, ch);
  if (!cell) return null;
  return {
    x: ps.rect.x + (cell.cx + 0.5) * ps.cellSize,
    y: ps.rect.y + (cell.cy + 0.5) * ps.cellSize,
  };
}

/** THE GATE — the town's one sealed perimeter door. The widest sealed door
 *  wins (service buildings inside use dwell doors, never sealed ones), so
 *  the resolver needs no naming convention beyond the mode itself. */
export function holdGateDoor(ps: PlacedStructure): PlacedDoor | null {
  let best: PlacedDoor | null = null;
  let bestW = -1;
  for (const pd of ps.doors) {
    if (pd.door.mode !== 'sealed') continue;
    const c = pd.door.cells;
    const w = c ? Math.max(c.w, c.h) : 0;
    if (w > bestW) { best = pd; bestW = w; }
  }
  return best;
}

/** The gate APRON point — a step OUTSIDE the sealed gate along its outward
 *  normal (where the muster horn stands, where the ward plants, where the
 *  siege camp pitches). */
export function holdGateApron(gate: PlacedDoor, dist: number): Vec2Like {
  return { x: gate.pos.x + gate.normal.x * dist, y: gate.pos.y + gate.normal.y * dist };
}

/** One rolled dress piece (state dressing: the wreckage fires, the siege
 *  camp). Pure geometry — the caller owns walkability/portal predicates. */
export interface HoldDressPiece { kind: string; x: number; y: number; r: number }

/** Roll a dress-row set around a placed town — DETERMINISTIC from the rng
 *  the caller seeds (zone seed ^ dressSalt), so a revisit re-lays the same
 *  wreckage it left burning. Bands:
 *    'rect' — inside the walls (the burned shell);
 *    'rim'  — the wall line ± the band (toppled stone, vent fires);
 *    'gate' — the gate apron fan (the camp, the ash).
 *  `ok` carries the world's truth (clear ground, no portal, no dock). */
export function rollHoldDressPieces(
  rng: Rng, rows: readonly HoldDressRow[], ps: PlacedStructure,
  gate: { pos: Vec2Like; normal: Vec2Like } | null,
  ok: (x: number, y: number, r: number) => boolean,
): HoldDressPiece[] {
  const out: HoldDressPiece[] = [];
  const band = HARBORHOLD_CFG.dressBand;
  const rect = ps.rect;
  for (const row of rows) {
    const want = rng.int(row.count[0], row.count[1]);
    let placed = 0;
    for (let i = 0; i < want * 6 && placed < want; i++) {
      const r = rng.range(row.radius[0], row.radius[1]);
      let x: number, y: number;
      if (row.where === 'rect') {
        x = rng.range(rect.x + r, rect.x + rect.w - r);
        y = rng.range(rect.y + r, rect.y + rect.h - r);
      } else if (row.where === 'rim') {
        // A point along the wall line, jittered into the band each side.
        const t = rng.range(0, 2 * (rect.w + rect.h));
        const j = rng.range(-band * 0.4, band);
        if (t < rect.w) { x = rect.x + t; y = rect.y - j; }
        else if (t < rect.w + rect.h) { x = rect.x + rect.w + j; y = rect.y + (t - rect.w); }
        else if (t < 2 * rect.w + rect.h) { x = rect.x + rect.w - (t - rect.w - rect.h); y = rect.y + rect.h + j; }
        else { x = rect.x - j; y = rect.y + (t - 2 * rect.w - rect.h); }
      } else {
        // 'gate' — a fan on the apron, outward of the doorway.
        if (!gate) continue;
        const d = rng.range(band * 0.5, band * 1.8);
        const s = rng.range(-band, band);
        x = gate.pos.x + gate.normal.x * d - gate.normal.y * s;
        y = gate.pos.y + gate.normal.y * d + gate.normal.x * s;
      }
      // Never inside a roofed room (rect pieces keep to courtyards via `ok`),
      // never overlapping a sibling piece.
      let clear = true;
      for (const p of out) {
        if (Math.hypot(p.x - x, p.y - y) < (p.r + r) * 0.9) { clear = false; break; }
      }
      if (!clear || !ok(x, y, r)) continue;
      out.push({ kind: row.kind, x, y, r });
      placed++;
    }
  }
  return out;
}

/** The placed harborhold town structure in a zone's structure ledger — the
 *  one whose def id the hold class names (null while unbuilt/unplaced). */
export function holdStructureIn(structures: readonly PlacedStructure[], structureDefId: string): PlacedStructure | null {
  return structures.find(s => s.defId === structureDefId) ?? null;
}

// --- THE OMEN SOURCE ---------------------------------------------------------
// A hold under a DEADLINE siege (a recurring siege on an already-won town)
// murmurs — and ages louder — until found or fallen. First-found besieged
// holds stay silent: an unfound harbor never nags (the crusade's discipline,
// softened — the deadline is the one moment the world genuinely needs you).
registerOmenSource((world: World): Omen[] => world.harborholdOmens());

// --- THE CAMP WATCH (the sentry fabric) --------------------------------------
// Dormant besiegers PLANTED at a besieged hold's camp: texture that wakes —
// a wound rouses them (the world's rouse rule), the muster drafts them into
// wave 1. The reset rule lets a chased-off watch settle back to stillness.
registerDormantTag('hold_camp', { coolDownSecs: 8, disengageDist: 380 });

// --- THE MAP BADGE -----------------------------------------------------------
// Every KNOWN hold wears its standing beside the ⚓ (the marker registry —
// no map-panel edits): besieged ⚔ red, burned 🔥 ember, open ⚑ with the
// prosperity rung. fog 'charted' keeps unfound harbors unspoiled.
registerMarkerSource((world: World): MapMarker[] => {
  const out: MapMarker[] = [];
  for (const def of Object.values(world.zoneMap)) {
    const h = def.harborhold;
    if (!h) continue;
    const label = HOLD_CLASSES[h.cls]?.label ?? h.cls;
    const at = { x: def.map.x + 16, y: def.map.y + 10 };
    if (h.state === 'besieged') {
      out.push({
        id: `hold:${def.id}`, coord: at, glyph: '⚔', r: 7,
        fill: '#33131a', stroke: '#9a4a4a', text: '#e88a8a',
        title: `${def.name} — a ${label} besieged`,
        detail: 'Sound the horn at the gate to break the siege.',
        fog: 'charted', z: 18, dimension: def.dimension,
      });
    } else if (h.state === 'fallen') {
      out.push({
        id: `hold:${def.id}`, coord: at, glyph: '🔥', r: 7,
        fill: '#2a1a10', stroke: '#9a6a3a', text: '#e8b07a',
        title: `${def.name} — a ${label} burned`,
        detail: 'It rebuilds on its own clock — or Mortal Essence raises it today.',
        fog: 'charted', z: 18, dimension: def.dimension,
      });
    } else {
      out.push({
        id: `hold:${def.id}`, coord: at, glyph: '⚑', r: 7,
        fill: '#102030', stroke: '#4a7a9a', text: '#9ad0e8',
        title: `${def.name} — a ${label} standing (prosperity ${h.prosperity})`,
        detail: 'Defended sieges raise its standing; a lost one burns it.',
        fog: 'charted', z: 18, dimension: def.dimension,
      });
    }
  }
  return out;
});
