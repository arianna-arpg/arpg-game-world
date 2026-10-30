/** Exact classic load graph/boundary stage. Caller owns authentic native graph and campaign services; this is not an issuer. */
import type { World } from './world';
import type { ZoneDef } from '../data/zones';
import {siteZoneExits} from "./exitSiting";
import {escarpmentRoad} from "../world/escarpments";
import {MASS_ZONE} from "../worldmass/preset";
import {HUB_ZONE,tuneOpeningProgression} from "../world/openingProgression";
import {FORECHART_CFG} from "../world/forechart";
import {dimensionDef,isRoadlessGateHub,GATE_FANOUT} from "../world/dimensions";
export interface NativeAreaBoundaryHost {
  zoneMap:World['zoneMap'];
  visited:World['visited'];
  sim:World['sim'];
  exits:World['exits'];
  rollHoldfast:World['rollHoldfast'];
  eagerChartNeighbors:World['eagerChartNeighbors'];
  chartWithin:World['chartWithin'];
  landRoute:World['landRoute'];
  placeExit:World['placeExit'];
  exitRoadAnnotations:World['exitRoadAnnotations'];
  separateOverlappingExits:World['separateOverlappingExits'];
}
export function prepareNativeAreaBoundaries(host:NativeAreaBoundaryHost,def:ZoneDef,firstVisit:boolean,isCave:boolean):void {    // HOLDFAST: on first arrival in an uncharted zone, maybe raise a fortified, LOCKED
    // bonus exit (appended to def.exits BEFORE eager-charting + portal placement, so it
    // places like a normal exit yet the eager web skips it — see eagerChartNeighbors).
    if (firstVisit) host.rollHoldfast(def);

    // EAGER WEB: resolve this zone's '?' frontiers into real, connected, pre-recognized
    // neighbour nodes (mint or link) BEFORE placing the live portals — so each portal
    // shows its real destination and the map renders an interwoven web, not stray '?'
    // ghosts. One ring only (the new nodes' own frontiers stay lazy). A cave/town or the
    // flag-off case is a no-op. (Charts from this zone's context, like the lazy path did.)
    if (!isCave) host.eagerChartNeighbors(def);

    // THE MINT HORIZON (FORECHART_CFG.horizon — the pregen doctrine's hard
    // half): the player's ACTIVE VICINITY is fully-resolved ground, always.
    // Everything within the horizon of an arrival resolves NOW, veiled, so
    // ambient growth can never happen underfoot — by the time the player
    // walks anywhere inside it, every node they can meet already exists and
    // is merely FOUND. On sweep-filled ground this is one no-op scan; real
    // work only follows a long teleport/sail into thin chart, at a zone-load
    // boundary that is already paying for a layout build.
    if (!isCave && FORECHART_CFG.enabled && def.objective.kind !== 'safe' && def.id !== MASS_ZONE) {
      host.chartWithin(def.map, FORECHART_CFG.horizon, def.dimension ?? 'surface');
    }

    // Birth-only openingProgression: the road graph is now real, but none of
    // its field neighbours has been played. Existing saves retain their levels.
    if (def.id === HUB_ZONE && firstVisit && Object.keys(host.zoneMap).some(id => id.startsWith('gen_opening_'))
      && !Object.keys(host.zoneMap).some(id => id.startsWith('gen_') && host.visited.has(id))) {
      tuneOpeningProgression(host.zoneMap, (a, b) => host.landRoute(a.map, b.map)
        && escarpmentRoad(a.map, b.map, host.sim.biomeField.fieldSeed));
    }

    // THE RING-1 UNVEIL (the forechart law): every direct neighbour of ground
    // you STAND ON is part of the classic one-ring map preview — if the
    // forechart minted it ahead (veiled), finding this zone finds them. The
    // per-sweep invariant pass (updateForechart) backstops the same rule for
    // late weaves; this is the immediate, entry-moment lift.
    if (!isCave) {
      for (const e of def.exits) {
        const n = e.to !== '?' ? host.zoneMap[e.to] : undefined;
        if (n?.veiled) n.veiled = false;
      }
    }

    // ROADLESS-DIMENSION HEAL: a persisted cross-edge into (or out of) a
    // dimension that has since sworn off its road (DimensionEntry.road:
    // false) strips at load — older saves carried a Firmament↔surface road,
    // and a stripped edge heals the def permanently (worldstate tolerance).
    if (def.exits.some(e => e.crossDim)) {
      const roadless = (to: string): boolean =>
        [def.dimension, host.zoneMap[to]?.dimension].some(d =>
          d !== undefined && dimensionDef(d).entry?.road === false);
      const kept = def.exits.filter(e => !e.crossDim || !roadless(e.to));
      if (kept.length !== def.exits.length) def.exits = kept;
    }
    // UNMARKED CROSS-DIMENSION HEAL: an edge whose destination lives in
    // another dimension WITHOUT the declared crossDim marker is never legal
    // (isIllegalCrossDim used to seal it forever as "a sealed rift" — a dead
    // portal squatting the zone). Strip it at load instead: the def heals
    // permanently, and the live seal stays as the belt for anything appended
    // mid-session. Warn once per edge so the appender stays traceable.
    {
      const kept = def.exits.filter(e => {
        if (e.to === '?' || e.crossDim) return true;
        const dest = host.zoneMap[e.to];
        if (!dest || (dest.dimension ?? 'surface') === (def.dimension ?? 'surface')) return true;
        console.warn(`[world] healed unmarked cross-dimension edge ${def.id}(${def.dimension ?? 'surface'}) → ${e.to}(${dest.dimension ?? 'surface'}) — stripped at load`);
        return false;
      });
      if (kept.length !== def.exits.length) def.exits = kept;
    }
    // ROADLESS-HUB FAN HEAL: a roadless gate hub holds EXACTLY its minted fan
    // (GATE_FANOUT — the same constant enterDimension mints with). Older
    // saves accreted weave roads onto the Firmament before the weaver learned
    // the hub rule; trim the def back to its fan and drop the partners'
    // reciprocals (their own back-edges at index 0 are never touched — the
    // append-only invariant makes the fan a stable prefix).
    if (isRoadlessGateHub(def) && def.exits.length > GATE_FANOUT) {
      const dropped = def.exits.slice(GATE_FANOUT);
      def.exits = def.exits.slice(0, GATE_FANOUT);
      console.warn(`[world] trimmed roadless gate hub '${def.id}' back to its ${GATE_FANOUT}-road fan (${dropped.length} accreted edge(s) healed)`);
      for (const e of dropped) {
        const p = host.zoneMap[e.to];
        if (!p || def.exits.some(x => x.to === p.id)) continue;
        const kept = p.exits.filter((x, i) => i === 0 || x.to !== def.id);
        if (kept.length !== p.exits.length) p.exits = kept;
      }
    } else if (!isRoadlessGateHub(def)) {
      // The partner-side mirror: an accreted edge INTO a roadless hub that
      // the hub itself no longer names (its fan heal ran on an earlier load)
      // strips here too — whichever side loads first, both heal.
      const kept = def.exits.filter((e, i) => {
        if (e.to === '?' || i === 0) return true;
        const dest = host.zoneMap[e.to];
        if (!dest || !isRoadlessGateHub(dest)) return true;
        return dest.exits.some(x => x.to === def.id);
      });
      if (kept.length !== def.exits.length) def.exits = kept;
    }
    siteZoneExits(def);
    host.exits = def.exits.map((e, i) => host.placeExit(e, i));
    // Stash the boundary annotations on the def (index-aligned, TRANSIENT —
    // re-derived every load) so generateLayout below can erect the gate
    // terrain for whichever exits cross an enclave boundary.
    def.exitBoundaries = host.exits.map(x => x.boundary);
    // EXIT ROADS ride the same transient seam: a zone whose Holdfast rolled a
    // KEPT ROAD annotates that exit with its guardian's road spec, and the
    // layout pipeline carves the traveled way (source portal → gate mouth).
    def.exitRoads = host.exitRoadAnnotations(def);
    // BIOME MELDS ride it too: exits facing a different biome that declares
    // an edge dressing grow a band of the foreign kit (data/melds.ts) along
    // this zone's edge — the terrain says "jungle ahead" before the label.
    def.exitMelds = host.exits.map(x => x.meld);
    // BELT-AND-SUSPENDERS: whatever def data or edge-snapping produced, no two
    // live portals may overlap (an overlapped pair leaves one of them un-dwellable
    // — the "can't choose which zone I enter" hard-lock). Runs BEFORE the layout
    // carve below, so the clears open around the RESOLVED positions.
    host.separateOverlappingExits();
}
