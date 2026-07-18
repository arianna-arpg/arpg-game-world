// ---------------------------------------------------------------------------
// MAP MARKER REGISTRY — generic per-zone (or per-coordinate) world-map icons.
//
// The world map used to hand-roll a single loop for the corpse skull. This
// generalizes it: every map icon (the quest "?", the corpse skull, a future
// bounty pin) is a MarkerSource — a pure function of world state resolved fresh
// each map refresh. Adding one is `registerMarkerSource(...)`; the renderer
// (panels.refreshMap) is a dumb generic pass, so NO panels.ts edit per marker.
//
// A marker is PAINT, never a pointer target (the interactivity contract,
// ui/mapConfig.ts): the map renders the whole marker layer pointer-transparent,
// so a badge can never intercept, flicker, or occlude its zone's hover. Its
// words — `title` (+ optional `detail`) — surface in the map's ZONE PANE via
// zoneInfo's marker fold, styled as the same badge (fill/stroke/text), NOT as
// a native browser tooltip.
//
// `fog` is the visibility grant: 'always' shows even on un-charted ground (a
// quest reveals its target before a path exists — the fog-of-war affordance),
// 'charted' only once the anchor zone is visited (no spoilers — the corpse).
// ---------------------------------------------------------------------------

import { START_ZONE } from '../data/zones';
import { QUESTS } from '../quests/defs';
import type { World } from '../engine/world';

export interface MapMarker {
  id: string;
  /** Anchor on a zone node (preferred) … */
  zoneId?: string;
  /** … or a raw node-space coordinate (an off-graph / not-yet-minted target). */
  coord?: { x: number; y: number };
  glyph: string;
  /** Disc fill / ring stroke / glyph text colour. */
  fill: string;
  stroke: string;
  text: string;
  r?: number;
  title: string;
  /** Optional second line under `title` in the zone pane — the "what do I do
   *  about it" half (the corpse's "reclaim your gear"). Pane-only, like title. */
  detail?: string;
  /** 'always' = visible even on un-charted ground; 'charted' = only when the
   *  anchor zone is visited. */
  fog: 'always' | 'charted';
  /** Draw order among markers (higher = on top). */
  z?: number;
  /** The DIMENSION whose map tab this marker belongs on. Zone-anchored markers
   *  DERIVE it from their zone (leave unset); a raw-coord marker declares it
   *  (default 'surface') — a hell corpse must not haunt the surface map. */
  dimension?: string;
}

export type MarkerSource = (world: World) => MapMarker[];

const SOURCES: MarkerSource[] = [];

/** Register a marker source (called once at boot per feature). */
export function registerMarkerSource(s: MarkerSource): void { SOURCES.push(s); }

/** Resolve every source into a flat, draw-ordered marker list (sources that
 *  throw are skipped so one bad source can't blank the whole map). */
export function collectMarkers(world: World): MapMarker[] {
  const out: MapMarker[] = [];
  for (const s of SOURCES) {
    try { out.push(...s(world)); } catch { /* a bad source never blanks the map */ }
  }
  return out.sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
}

// --- built-in sources (registered on import) --------------------------------

/** EACH active quest's target: a "?" on the objective zone while it's unmet, which
 *  MOVES to the town node as a "!" once the field objective is done (go home /
 *  claim). fog:'always' so the target is visible before a road exists. One marker per
 *  concurrent quest (ids suffixed by quest id so they don't collide). */
registerMarkerSource((world): MapMarker[] => {
  const out: MapMarker[] = [];
  const ready: string[] = []; // labels of field-done turn-in quests (one shared town pin)
  for (const aq of world.activeQuests) {
    const q = QUESTS[aq.questId];
    if (aq.fieldDone && q?.turnIn) { ready.push(q.offerLabel); continue; }
    const node = world.zoneMap[aq.zoneId];
    if (!node) continue;
    out.push({
      id: `quest-target-${aq.questId}`, zoneId: node.id, coord: { x: node.map.x, y: node.map.y },
      glyph: '?', fill: '#2a1a3a', stroke: '#c8a8e8', text: '#e0c0ff', r: 9,
      title: `Quest: ${q?.offerLabel ?? aq.questId}`, fog: 'always', z: 20,
    });
  }
  // ONE aggregate turn-in marker on the town (multiple ready quests would otherwise
  // stack invisibly on the same node) — the count + labels ride its title.
  if (ready.length) {
    const town = world.zoneMap[START_ZONE];
    if (town) out.push({
      id: 'quest-turnin', zoneId: town.id, glyph: ready.length > 1 ? String(ready.length) : '!',
      fill: '#3a2a0a', stroke: '#ffd700', text: '#ffe9a0', r: 9,
      title: ready.length > 1 ? `Return to claim ${ready.length} bounties: ${ready.join('; ')}` : `Return to claim: ${ready[0]}`,
      fog: 'always', z: 20,
    });
  }
  return out;
});

/** THE BOAT — while a voyage is underway, the ship rides the map at its true
 *  node-space position (fog:'always': you always know where you are at sea),
 *  so the sailor navigates between sighted islands from the chart itself. */
registerMarkerSource((world): MapMarker[] => {
  const at = world.voyageBoatCoord();
  if (!at) return [];
  return [{
    id: 'voyage-boat', coord: { x: at.x, y: at.y },
    glyph: '⛵', fill: '#0b2033', stroke: '#7fd0ff', text: '#bfe4f4', r: 10,
    title: 'Your ship — the voyage underway', fog: 'always', z: 30,
  }];
});

/** A skull on the charted node holding each unreclaimed corpse (fog:'charted' —
 *  no spoilers; only visited ground reveals where you fell). Reads the
 *  character's interaction-scoped ring (corpseRecords): the shared account
 *  graveyard for mortals, the save's own ring for the Undying. */
registerMarkerSource((world): MapMarker[] => {
  const out: MapMarker[] = [];
  for (const d of world.corpseRecords()) {
    const node = world.corpseZoneOf(d);
    if (!node) continue;
    out.push({
      id: `corpse-${node.id}`, zoneId: node.id, glyph: '☠', fill: '#1a0e12', stroke: '#d05050',
      text: '#e8a0a0', r: 9, fog: 'charted', z: 10,
      // The pane reads this under the zone's own header, so "here" is exact —
      // the old tooltip's "fell in <name>" repeated what the header now says.
      title: `Your ${d.classId} (lv ${d.charLevel}) fell here`,
      detail: 'reclaim your gear from the corpse',
    });
  }
  return out;
});
