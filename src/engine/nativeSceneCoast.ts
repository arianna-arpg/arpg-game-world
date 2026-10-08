/** Native coast, island and quay birth with explicit campaign and source authority. */
import type {World} from './world';
import type {ZoneDef,ZoneExitDef} from '../data/zones';
import type {Sea} from '../world/seas';
import type {IslandSpot} from '../world/voyage';
import type {Doodad} from './levelgen';
import type {MapCoord} from '../world/coords';
import type {CourseSpec} from '../world/courses';
import {vec,dist,type Vec2} from '../core/math';
import {Rng} from '../core/rng';
import {nativeExitPosition,nativeFieldExitPos,nativeBoundaryGateFor,nativeMeldFor} from './nativeExitPreparation';
type ZoneExit=ReturnType<World['placeExit']>;
export interface NativeSceneCoastHost {
 voyage:World['voyage'];
 player:World['player'];
 doodads:World['doodads'];
 nodeFromSea:World['nodeFromSea'];
 seaFromNode:World['seaFromNode'];
 continentFor:World['continentFor'];
 biomeFor:World['biomeFor'];
 sim:World['sim'];
 mintIslandZone:World['mintIslandZone'];
 ensureSeaPorts:World['ensureSeaPorts'];
 zoneMap:World['zoneMap'];
 surveyed:World['surveyed'];
 refreshExitLabels:World['refreshExitLabels'];
 manifest:World['manifest'];
 nextGenId:World['nextGenId'];
 eventLevel:World['eventLevel'];
 simView:World['simView'];
 levelFor:World['levelFor'];
 biomeDepthFor:World['biomeDepthFor'];
 climateFor:World['climateFor'];
 notarizeRoad:World['notarizeRoad'];
 exits:World['exits'];
 zone:World['zone'];
 placeExit:World['placeExit'];
 linkBackTo:World['linkBackTo'];
 roadIsWet:World['roadIsWet'];
 landRoute:World['landRoute'];
 nativeExitPreparationHost:World['nativeExitPreparationHost'];
 nativeExitPreparationSources:World['nativeExitPreparationSources'];
 boundaryGateFor:World['boundaryGateFor'];
 meldFor:World['meldFor'];
 caveMap:World['caveMap'];
 isIllegalCrossDim:World['isIllegalCrossDim'];
 warnCrossDim:World['warnCrossDim'];
 visited:World['visited'];
 inCave:World['inCave'];
 crossDimWarned:World['crossDimWarned'];
 liveCourses:World['liveCourses'];
 courseAnchor:World['courseAnchor'];
}
export interface NativeSceneCoastSources {
 VOYAGE_CFG:typeof import('../world/voyage').VOYAGE_CFG;
 ISLAND_FIELD:typeof import('../world/voyage').ISLAND_FIELD;
 islandsNear:typeof import('../world/voyage').islandsNear;
 seaSpotsNear:typeof import('../world/seas').seaSpotsNear;
 seaAt:typeof import('../world/seas').seaAt;
 TILESETS:typeof import('../data/tilesets').TILESETS;
 SEA_CFG:typeof import('../data/seas').SEA_CFG;
 placeZoneAt:typeof import('./worldgen').placeZoneAt;
 holdClassFor:typeof import('../data/harborholds').holdClassFor;
 mintHoldState:typeof import('../data/harborholds').mintHoldState;
 HOLD_COMPOSITIONS:typeof import('../data/harborholds').HOLD_COMPOSITIONS;
 HARBORCOVE_LAYOUT:string;
 resolveEventLevel:typeof import('../world/levelField').eventLevel;
 zoneKindOf:typeof import('../data/zoneKinds').zoneKindOf;
 footprintBars:typeof import('./worldgen').footprintBars;
 spacedExitAt:typeof import('./worldgen').spacedExitAt;
 biomeFrontierTarget:typeof import('./worldgen').biomeFrontierTarget;
 PORTAL_RADIUS:typeof import('./worldgen').PORTAL_RADIUS;
 COURSE_FIELD_SALT:typeof import('../world/courses').COURSE_FIELD_SALT;
 dimensionDef:typeof import('../world/dimensions').dimensionDef;
 dimensionBiomeAt:typeof import('../world/dimensions').dimensionBiomeAt;
 strewnInstancesNear:typeof import('../world/courses').strewnInstancesNear;
 courseBiomeAt:typeof import('../world/courses').courseBiomeAt;
}
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function coastSeaFromNode(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,c: { x: number; y: number }):Vec2{
    return vec(c.x * sources.VOYAGE_CFG.pxPerNode, c.y * sources.VOYAGE_CFG.pxPerNode);
  }

export function coastNodeFromSea(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,p: Vec2):{ x: number; y: number }{
    return { x: p.x / sources.VOYAGE_CFG.pxPerNode, y: p.y / sources.VOYAGE_CFG.pxPerNode };
  }

export function coastStreamCoast(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,force: boolean):void{
    const run = host.voyage;
    if (!run) return;
    const p = host.player.pos;
    const R = sources.VOYAGE_CFG.streamRadius * run.ship.spyglassMul;
    if (!force && dist(p, run.lastStreamAt) < R * sources.VOYAGE_CFG.restreamFrac) return;
    run.lastStreamAt = vec(p.x, p.y);
    const stepN = sources.VOYAGE_CFG.streamStep;
    const stepPx = stepN * sources.VOYAGE_CFG.pxPerNode;
    const keep: Doodad[] = host.doodads.filter(d =>
      d.kind !== 'landmass' && d.kind !== 'isle_beacon' && d.kind !== 'quay_beacon');
    const c0 = host.nodeFromSea(vec(p.x - R, p.y - R));
    const gx0 = Math.floor(c0.x / stepN), gy0 = Math.floor(c0.y / stepN);
    const cells = Math.ceil((R * 2) / stepPx) + 1;
    for (let gy = gy0; gy <= gy0 + cells; gy++) {
      for (let gx = gx0; gx <= gx0 + cells; gx++) {
        const nc = { x: (gx + 0.5) * stepN, y: (gy + 0.5) * stepN };
        const sea = host.seaFromNode(nc);
        if (dist(sea, p) > R) continue;
        const kind = host.continentFor(nc).kind;
        if (kind === 'ocean') continue;
        keep.push({
          pos: sea, radius: stepPx * sources.VOYAGE_CFG.coastDiscFrac, kind: 'landmass',
          land: { biome: host.biomeFor(nc), bridge: kind === 'bridge' },
        });
      }
    }
    // VOYAGE ISLANDS in spyglass reach: a shore blob + a beacon, and the
    // island's ZONE mints (unvisited — a "???" node) so the world map shows
    // it and the sailor can navigate between sighted islands from the chart.
    // (The island field takes the BIOME-field seed — it derives the continent
    // seed itself and samples the climate for its def picks.)
    for (const spot of (0,sources.islandsNear)(host.nodeFromSea(p), R / sources.VOYAGE_CFG.pxPerNode + sources.VOYAGE_CFG.islandSightPad, host.sim.biomeField.fieldSeed)) {
      const zone = host.mintIslandZone(spot);
      const center = host.seaFromNode(spot.coord);
      // The blob: a center disc + a ring, sized within sources.ISLAND_FIELD.shoreRadius
      // (seeded per island). Tagged with the island id so landing routes here.
      const [sr0, sr1] = sources.ISLAND_FIELD.shoreRadius;
      const shoreN = sr0 + ((spot.h % 1000) / 1000) * (sr1 - sr0);
      const shorePx = shoreN * sources.VOYAGE_CFG.pxPerNode;
      const land = { biome: sources.TILESETS[spot.def.tileset]?.biome ?? 'beach', bridge: false, islandId: spot.id };
      keep.push({ pos: vec(center.x, center.y), radius: shorePx * 0.62, kind: 'landmass', land });
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + (spot.h % 7);
        keep.push({
          pos: vec(center.x + Math.cos(a) * shorePx * 0.55, center.y + Math.sin(a) * shorePx * 0.55),
          radius: shorePx * 0.42, kind: 'landmass', land,
        });
      }
      keep.push({
        pos: vec(center.x, center.y - shorePx * 0.2), radius: 16, kind: 'isle_beacon',
        label: zone.name, adorn: spot.def.color,
      });
    }
    // THE QUAY BEACONS (world/seas.ts): every planned PORT SPOT in spyglass
    // reach streams a beacon exactly like the isles — and SIGHTING one makes
    // it real and KNOWN (the sea's system mints if it hasn't; the sighted
    // spot's veil lifts + it surveys onto the map: seeing a harbor from the
    // water IS finding it — the isles' own mint-on-sight law). Between these
    // lights the shore is breakers: they ARE the landing zones.
    let sighted = false;
    for (const qs of (0,sources.seaSpotsNear)(host.nodeFromSea(p), R / sources.VOYAGE_CFG.pxPerNode + sources.VOYAGE_CFG.islandSightPad, host.sim.biomeField.fieldSeed)) {
      const qsea = (0,sources.seaAt)(qs.shore, host.sim.biomeField.fieldSeed);
      if (!qsea) continue;
      host.ensureSeaPorts(qsea);
      const pz = host.zoneMap[qs.id];
      if (pz?.veiled) { pz.veiled = false; host.surveyed.add(pz.id); sighted = true; }
      keep.push({
        pos: host.seaFromNode(qs.shore), radius: 16, kind: 'quay_beacon',
        label: pz?.name ?? 'a harborage',
        adorn: qs.tier === 'haven' ? '#ffd898' : '#7fd0ff',
      });
    }
    // A sighted harbor is NAMED knowledge: the standing portals re-speak at
    // once (the entry law), not on the next zone load.
    if (sighted) host.refreshExitLabels();
    host.doodads = keep;
  }

export function coastMintIslandZone(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,spot: IslandSpot):ZoneDef{
    const existing = host.zoneMap[spot.id];
    if (existing) return existing;
    const def = spot.def;
    const rng = new Rng((host.manifest.seed ^ spot.h) >>> 0);
    const name = `${rng.pick(def.nameFirst)} ${rng.pick(def.nameSecond)}`;
    const gen = (0,sources.placeZoneAt)(spot.coord, null, host.zoneMap, host.nextGenId++, {
      id: spot.id, tileset: def.tileset,
      level: Math.max(1, host.eventLevel(spot.coord) + (def.levelDelta ?? 0)),
      objective: def.objective,
      packsOverride: def.packs,
      name, port: true,
      seed: (host.manifest.seed ^ spot.h ^ 0x151e) >>> 0,
      floating: true,       // no back-edge, no weave — the sea is the road
      forceFrontiers: 0,    // self-contained: no '?' stubs into open water
      noFactionWar: true,   // an island is its own story, not a warfront
    });
    gen.floating = false;   // …and never drain-wired either (a dry strait is no road)
    if (def.structures?.length) gen.structures = [...(gen.structures ?? []), ...def.structures];
    if (def.landmarks?.length) gen.landmarks = [...(gen.landmarks ?? []), ...def.landmarks];
    // THE ISLE'S SEA (world/seas.ts): bake the hosting water's identity and —
    // per the lane law — run a route to its HAVEN on sighting: the harbor
    // knows its isles, and the isles know the way home.
    const isleSea = (0,sources.seaAt)(spot.coord, host.sim.biomeField.fieldSeed);
    if (isleSea) {
      gen.seaId = isleSea.id;
      if (sources.SEA_CFG.lanes.islandToHaven && isleSea.ports.length) {
        const haven = host.ensureSeaPorts(isleSea).find(z => z.portTier === 'haven');
        if (haven && haven.id !== gen.id) {
          if (!(gen.searoutes ??= []).includes(haven.id)) gen.searoutes.push(haven.id);
          if (!(haven.searoutes ??= []).includes(gen.id)) haven.searoutes.push(gen.id);
        }
      }
    }
    host.zoneMap[spot.id] = gen;
    host.sim.onNodeCharted(gen, host.simView());
    return gen;
  }

export function coastEnsureSeaPorts(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,sea: Sea):ZoneDef[]{
    const out: ZoneDef[] = [];
    for (const spot of sea.ports) {
      let z = host.zoneMap[spot.id];
      if (!z) {
        const P = sources.SEA_CFG.pair;
        // The spot's LANDWARD normal (shore sample → land anchor): the
        // port node stands offshore along its inverse; the harborcove
        // recipe aligns its outcrop back along it (quayFacing).
        const ln = Math.hypot(spot.coord.x - spot.shore.x, spot.coord.y - spot.shore.y) || 1;
        const lx = (spot.coord.x - spot.shore.x) / ln, ly = (spot.coord.y - spot.shore.y) / ln;
        // — THE HOLD ANCHOR: the mainland gate over the quay. Reused when a
        //   half-minted pair resumes (a save cut between the two mints). —
        const anchorId = `${spot.id}_hold`;
        let anchor = host.zoneMap[anchorId];
        if (!anchor) {
          anchor = (0,sources.placeZoneAt)(spot.coord, null, host.zoneMap, host.nextGenId++, {
            id: anchorId,
            biomeFor: host.biomeFor, levelFor: host.levelFor,
            biomeDepthFor: host.biomeDepthFor, climateFor: host.climateFor,
            fieldBiome: true,
            objective: { kind: 'clear' },
            seed: (host.manifest.seed ^ hashStr(anchorId)) >>> 0,
            noBackEdge: true,           // roadless-charted: the land web weaves in (dry) as it grows
          });
          anchor.veiled = true;         // foreordained ground — found like all of it
          anchor.seaId = sea.id;
          anchor.name = `${anchor.name}${P.holdSuffix}`;
          // THE HARBORHOLD (data/harborholds.ts): the anchor raises the walled
          // town — state minted BESIEGED (the discovery beat), the composition
          // baked at chance 1 so the ordinary pipeline seats the walls. Sea
          // class × tier decides the hold class; islands never pass through
          // here (mintIslandZone is their own path) — isles stay small locales.
          const holdCls = (0,sources.holdClassFor)(sea.cls.id, spot.tier);
          if (holdCls) {
            anchor.harborhold = (0,sources.mintHoldState)(holdCls);
            (anchor.compositions ??= []).push({ composition: sources.HOLD_COMPOSITIONS[holdCls.id], chance: 1 });
          }
          host.zoneMap[anchor.id] = anchor;
          host.sim.onNodeCharted(anchor, host.simView());
        }
        // — THE PORT: the quay zone on the water. —
        const at = { x: spot.shore.x - lx * P.offshore, y: spot.shore.y - ly * P.offshore };
        z = (0,sources.placeZoneAt)(at, anchor, host.zoneMap, host.nextGenId++, {
          id: spot.id,
          biomeFor: host.biomeFor, levelFor: host.levelFor,
          biomeDepthFor: host.biomeDepthFor, climateFor: host.climateFor,
          fieldBiome: true, port: true,
          kind: 'port',                 // sealed shores bind INSIDE the mint (the weave already honors it)
          shape: 'rect',                // her ruling 2026-08-05: the quay carve is rect-oriented — no ellipse ports
          layoutType: sources.HARBORCOVE_LAYOUT,
          layoutParams: { quayFacing: Math.atan2(ly, lx) },
          sizeBand: { w: P.sizeW, h: P.sizeH },
          // NEAR-SANCTUARY: the quay asks nothing (no objective to clear,
          // no faction war over the pier) — the Lastlight read, not the
          // cave read. The hold's WAR lives at the anchor.
          objective: { kind: 'none', label: 'a harbor' },
          noFactionWar: true,
          forceFrontiers: 0,            // sealed shores: no '?' roads, ever
          seed: (host.manifest.seed ^ hashStr(spot.id)) >>> 0,
          noBackEdge: true,             // the causeway below is the one land door
        });
        z.veiled = true;
        z.seaId = sea.id;
        z.portTier = spot.tier;
        z.packDensity = P.portPackDensity; // 0 = no wild packs at the quay (explicit-zero law)
        z.fauna = P.quayFauna.map(f => ({ ...f })); // authored strand texture, dialed in data
        if (spot.tier === 'haven') z.name = `${z.name}${P.havenSuffix}`;
        z.holdAnchor = anchor.id;
        anchor.holdPort = z.id;
        host.zoneMap[z.id] = z;
        host.sim.onNodeCharted(z, host.simView());
        // — THE CAUSEWAY: one notarized deed joins the pair; the anchor's
        //   side seals behind the hold's own state until the muster wins. —
        host.notarizeRoad(z, anchor);
        const gateEdge = anchor.exits.find(e => e.to === z.id);
        if (gateEdge) gateEdge.lock = 'harborhold';
      }
      out.push(z);
    }
    const lane = (a: ZoneDef, b: ZoneDef): void => {
      if (a.id === b.id) return;
      if (!(a.searoutes ??= []).includes(b.id)) a.searoutes.push(b.id);
      if (!(b.searoutes ??= []).includes(a.id)) b.searoutes.push(a.id);
    };
    if (out.length > 1) {
      const ring = [...out].sort((a, b) =>
        Math.atan2(a.map.y - sea.centroid.y, a.map.x - sea.centroid.x)
        - Math.atan2(b.map.y - sea.centroid.y, b.map.x - sea.centroid.x));
      if (sources.SEA_CFG.lanes.ring) {
        for (let i = 0; i < ring.length; i++) lane(ring[i], ring[(i + 1) % ring.length]);
      }
      const haven = out.find(z => z.portTier === 'haven');
      if (sources.SEA_CFG.lanes.havenSpokes && haven) for (const z of out) lane(haven, z);
    }
    return out;
  }

export function coastRefreshExitLabels(host:NativeSceneCoastHost,sources:NativeSceneCoastSources):void{
    for (const ex of host.exits) {
      const d = host.zone.exits[ex.defIndex];
      if (d) ex.label = host.placeExit(d, ex.defIndex).label;
    }
  }

export function coastEventLevel(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,coord: { x: number; y: number }):number{
    return (0,sources.resolveEventLevel)(host.levelFor(coord), host.player ? host.player.level : 1);
  }

export function coastNotarizeRoad(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,target: ZoneDef,source: ZoneDef):void{
    host.linkBackTo(target, source, true);
    host.linkBackTo(source, target, true);
    const a = target.exits.find(e => e.to === source.id);
    if (a) a.notarized = true;
    const b = source.exits.find(e => e.to === target.id);
    if (b) b.notarized = true;
  }

export function coastLinkBackTo(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,target: ZoneDef,source: ZoneDef,notarized = false):void{
    if (target.id === source.id || target.exits.some(e => e.to === source.id)) return;
    if (!notarized && (0,sources.zoneKindOf)(target)?.staticExits) return;
    // THE DRY-ROAD LAW (sources.SEA_CFG.dryRoad): no auto-forged land road may cross
    // ocean water — a strait is crossed by VOYAGE, never by a lucky link.
    // Notarized deeds are exempt (a causeway that MEANS to cross says so in
    // code); only the surface has an ocean, so dimension links pay nothing.
    if (!notarized && !target.dimension && !source.dimension
      && host.roadIsWet(target.map, source.map)) return;
    // THE FOOTPRINT LAW: nor may one cut ACROSS a Field expanse's core rect
    // (both-ends-outside; a spoke into the expanse itself passes — its own
    // endpoint stands inside the rect, which sources.footprintBars exempts).
    if (!notarized && !target.dimension && !source.dimension
      && (0,sources.footprintBars)(target.map, source.map, host.zoneMap)) return;
    // Dimensions are sealed — a LINKER may never forge a cross-dimension road
    // (the gate's marked back-edge is MINTED by enterDimension, never linked).
    if ((target.dimension ?? 'surface') !== (source.dimension ?? 'surface')) {
      console.warn(`[world] refused cross-dimension link ${target.id} → ${source.id}`);
      return;
    }
    const dx = source.map.x - target.map.x, dy = source.map.y - target.map.y;
    const side: ZoneExitDef['side'] = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : (dy > 0 ? 's' : 'n');
    // Claim a SPACED `at` via the shared worldgen guard (corner-aware, pixel-true) —
    // the old per-side fractional scan couldn't see an n@~0 vs w@~0 corner stack.
    target.exits.push({ to: source.id, side, at: (0,sources.spacedExitAt)(target, side) });
  }

export function coastRoadIsWet(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,a: MapCoord,b: MapCoord):boolean{
    if (!sources.SEA_CFG.dryRoad.enabled) return false;
    return !host.landRoute(a, b);
  }

export function coastLandRoute(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,a: { x: number; y: number },b: { x: number; y: number }):boolean{
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(3, Math.ceil(d / Math.max(20, sources.SEA_CFG.dryRoad.sampleStep)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (host.continentFor({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }).kind === 'ocean') return false;
    }
    return true;
  }

export function coastPlaceExit(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,e: ZoneExitDef,defIndex: number):ZoneExit{
    const pos=nativeExitPosition(host.nativeExitPreparationHost(),e,host.nativeExitPreparationSources());
    // BOUNDARY GATE: does this edge cross an enclave biome's boundary? Rides
    // the same prediction seam as the level preview below — an unminted
    // frontier already knows what looms behind it. Streams to clients like
    // the label; the layout pipeline reads the same ids off def.exitBoundaries.
    const boundary = host.boundaryGateFor(e);
    // BIOME MELD: does a DIFFERENT biome past this edge declare an edge
    // dressing? Same prediction seam; the layout pipeline grows the band off
    // def.exitMelds. THE WORDS stay off the field label (the clutter-free
    // field law): the stamped band and the gate's arch glyph ARE the field's
    // telegraph — terrain speaks for itself — and the breath lives on the
    // chart instead (world/zoneInfo.ts threshold rows).
    const meld = host.meldFor(e);
    if (e.to === '?') {
      // A frontier: the zone behind it doesn't exist yet. PREVIEW its danger by
      // sampling the difficulty field at the SAME coordinate the mint will use
      // (projectCoord of this zone toward the frontier side) — so the number shown
      // is EXACTLY the level the zone will carry, letting the player read an exit as
      // "safe ahead" vs "deadly — reroute" before committing. Host computes it; the
      // label string streams to clients verbatim (they never re-mint).
      const lv = host.levelFor((0,sources.biomeFrontierTarget)(host.zone, e.side, host.biomeFor));
      return {
        pos, radius: sources.PORTAL_RADIUS, to: '?', defIndex,
        label: `Uncharted · Lv ${lv}`,
        ...(boundary ? { boundary } : {}),
        ...(meld ? { meld } : {}),
      };
    }
    const dest = host.zoneMap[e.to] ?? host.caveMap[e.to];
    // An UNMARKED cross-dimension edge never opens (isExitLocked seals it); the
    // portal reads as a dead rift and the console names the culprit edge once.
    if (host.isIllegalCrossDim(e as ZoneExitDef)) {
      host.warnCrossDim(host.zone.exits[defIndex] ?? (e as ZoneExitDef), dest);
      return { pos, radius: sources.PORTAL_RADIUS, to: e.to, defIndex, label: 'a sealed rift' };
    }
    // THE ENTRY LAW (the uncharted doctrine): a destination's NAME is earned —
    // by walking its ground (visited) or by deliberate recon (surveyed: spire
    // pulses, bought charts, omen out-scries, quay sightings) — never granted
    // free at the door. Until earned, every way out reads the same: what it
    // costs to walk in, never what it is (the danger preview stays exact — it
    // IS the real level; even the endless-waves tell waits for entry). The
    // forechart's veil is the same rule's outer ring (minted ahead, unfound).
    // Cave floors live OFF the chart (caveMap — visited never tracks them),
    // so a cave's own doors keep their names: the law governs the chart, and
    // only the chart.
    if (dest.veiled
      || (!!host.zoneMap[e.to] && !host.visited.has(e.to) && !host.surveyed.has(e.to))) {
      return {
        pos, radius: sources.PORTAL_RADIUS, to: e.to, defIndex,
        label: `Uncharted · Lv ${dest.level}`,
        ...(boundary ? { boundary } : {}),
        ...(meld ? { meld } : {}),
      };
    }
    const sub = dest.objective.kind === 'waves' && dest.objective.waves === 0
      ? 'endless' : `Lv ${dest.level}`;
    // THE BARE-NAME LAW, portal edition: the field label is the destination's
    // NAME and its danger read, nothing else — no meld breath, no gate prose.
    const label = host.inCave ? `Surface · ${dest.name}` : `${dest.name} · ${sub}`;
    return {
      pos, radius: sources.PORTAL_RADIUS, to: e.to, defIndex, label,
      ...(boundary ? { boundary } : {}),
      ...(meld ? { meld } : {}),
    };
  }

export function coastIsIllegalCrossDim(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,ed: { to: string; crossDim?: true } | undefined):boolean{
    if (!ed || ed.to === '?' || ed.crossDim) return false;
    const dest = host.zoneMap[ed.to];
    if (!dest) return false;
    return (dest.dimension ?? 'surface') !== (host.zone.dimension ?? 'surface');
  }

export function coastWarnCrossDim(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,ed: { to: string },dest: ZoneDef | undefined):void{
    const key = `${host.zone.id}→${ed.to}`;
    if (host.crossDimWarned.has(key)) return;
    host.crossDimWarned.add(key);
    console.warn(`[world] ILLEGAL cross-dimension exit ${key} `
      + `(${host.zone.dimension ?? 'surface'} → ${dest?.dimension ?? 'surface'}) — sealed. `
      + 'Trace whatever appended it: every legal crossing carries crossDim.');
  }

export function coastDimensionBiomeFor(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,dimId: string):(c: { x: number; y: number }) => string{
    const seed = (host.sim.biomeField.fieldSeed ^ sources.COURSE_FIELD_SALT) >>> 0;
    const courses = host.liveCourses(dimId);
    if (!courses.length) return (c) => (0,sources.dimensionBiomeAt)(dimId, c, seed);
    return (c) => {
      for (const { spec, anchor } of courses) {
        // A STREWN course paints per dealt instance (each with its OWN
        // seed — heading and meander all its own); the sample walks the
        // instances near this coordinate in stable order, first covering
        // wins. Gate courses keep the one-anchor path byte-identical.
        if (spec.anchor === 'strewn') {
          for (const inst of (0,sources.strewnInstancesNear)(spec, c, seed)) {
            const b = (0,sources.courseBiomeAt)([spec], inst.anchor, c, inst.iseed);
            if (b) return b;
          }
          continue;
        }
        if (!anchor) continue;
        const b = (0,sources.courseBiomeAt)([spec], anchor, c, seed);
        if (b) return b;
      }
      return (0,sources.dimensionBiomeAt)(dimId, c, seed);
    };
  }

export function coastLiveCourses(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,dimId: string):{ spec: CourseSpec; anchor?: { x: number; y: number } }[]{
    const specs = (0,sources.dimensionDef)(dimId).courses;
    if (!specs?.length) return [];
    const out: { spec: CourseSpec; anchor?: { x: number; y: number } }[] = [];
    for (const spec of specs) {
      if (spec.anchor === 'strewn') { out.push({ spec }); continue; }
      const anchor = host.courseAnchor(dimId, spec);
      if (anchor) out.push({ spec, anchor });
    }
    return out;
  }

export function coastCourseAnchor(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,dimId: string,spec: CourseSpec):{ x: number; y: number } | undefined{
    if (spec.anchor === 'gate') {
      const gateId = (0,sources.dimensionDef)(dimId).entry?.gate.id;
      return gateId ? host.zoneMap[gateId]?.map : undefined;
    }
    return undefined;
  }

export function coastFieldExitPos(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,e: ZoneExitDef):Vec2 | null{ return nativeFieldExitPos(host.nativeExitPreparationHost(),e,host.nativeExitPreparationSources()); }

export function coastBoundaryGateFor(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,e: ZoneExitDef):string | undefined{ return nativeBoundaryGateFor(host.nativeExitPreparationHost(),e,host.nativeExitPreparationSources()); }

export function coastMeldFor(host:NativeSceneCoastHost,sources:NativeSceneCoastSources,e: ZoneExitDef):string | undefined{ return nativeMeldFor(host.nativeExitPreparationHost(),e,host.nativeExitPreparationSources()); }
