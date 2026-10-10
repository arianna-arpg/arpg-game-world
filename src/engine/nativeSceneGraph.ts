/** Complete native campaign graph preparation, shared with classic World. No isolated replacement graph. */
import type {World} from './world';
import {escarpmentRoad} from "../world/escarpments";
import {biomeFrontierTarget,escarpmentConnection} from "./worldgen";
import {atlasDestinationAt} from "../world/locales";
import {clamp} from "../core/math";
import {type ItemRarity} from "./items";
import {START_ZONE,type ZoneDef,type ZoneExitDef} from "../data/zones";
import {underSpanPolicyOf} from "../data/underspans";
import {countRoads,generateZone,placeZoneAt,projectCoord,spacedExitAt,chordClearsNodes,footprintBars,roadBudgetOf,settleWeb,WEB_CFG} from "./worldgen";
import {TILESETS,pickTilesetForBiome} from "../data/tilesets";
import {Rng} from "../core/rng";
import {biomeSpacing,OCEAN_BIOME} from "../world/biomes";
import {fieldRegionAt,fieldCoreRect,FIELD_BIOME,FIELD_GEN,type FieldExtent} from "../world/fieldRegion";
import {berthCoordsFor,dockDestCoordsFor,isSoulriverId,riverSeatOf,riverZoneId,soulriverInstanceOf,soulriverPlan,soulwayCatchAt,SOULRIVER_CFG} from "../world/soulriver";
import {zoneKindOf} from "../data/zoneKinds";
import {EAGER_WORLD_WEB} from "../config";
import {HUB_ZONE,OPENING_PROGRESSION} from "../world/openingProgression";
import {coordDist,type MapCoord} from "../world/coords";
import {forechartSource} from "../world/forechart";
import {SEA_CFG} from "../data/seas";
import {seaAt} from "../world/seas";
import {dimensionDef,dimensionBiomeDepth,isRoadlessGateHub} from "../world/dimensions";
import {COURSE_FIELD_SALT,courseMintHints,strewnInstancesNear,type CourseInstance,type CourseMintHints} from "../world/courses";
import {type PocketSpec} from "../packages/holdfast";
import {pocketFormOf,DEFAULT_POCKET_FORM,type PocketFormDef} from "../data/pocketForms";
import {holdfastHostable} from "../world/zonePolicy";
// A frontier within this distance links to an existing node. Keep below the
// tightest biome spacing (grove 56): dedup genuine overlaps, not separate zones.
const CONNECT_DIST = 48;
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export interface NativeSceneGraphHost {
 sim:World['sim'];
 chartNeighborsOf:World['chartNeighborsOf'];
 chartFrontier:World['chartFrontier'];
 mintVeil:World['mintVeil'];
 zoneMap:World['zoneMap'];
 mintHoldfastPocket:World['mintHoldfastPocket'];
 fieldFrontierTarget:World['fieldFrontierTarget'];
 biomeFor:World['biomeFor'];
 continentFor:World['continentFor'];
 ensureSeaPorts:World['ensureSeaPorts'];
 roadIsWet:World['roadIsWet'];
 linkBackTo:World['linkBackTo'];
 visited:World['visited'];
 mintSoulriverZone:World['mintSoulriverZone'];
 nearestRiverPort:World['nearestRiverPort'];
 nearestLinkable:World['nearestLinkable'];
 roadlessGateHub:World['roadlessGateHub'];
 mintGroundTaken:World['mintGroundTaken'];
 dimensionBiomeFor:World['dimensionBiomeFor'];
 dimensionBiomeDepthFor:World['dimensionBiomeDepthFor'];
 biomeDepthFor:World['biomeDepthFor'];
 nextGenId:World['nextGenId'];
 levelFor:World['levelFor'];
 climateFor:World['climateFor'];
 courseMintFor:World['courseMintFor'];
 fieldifyZone:World['fieldifyZone'];
 simView:World['simView'];
 underSpanPass:World['underSpanPass'];
 rollPocketForm:World['rollPocketForm'];
 pullToLand:World['pullToLand'];
 applyPocketSpec:World['applyPocketSpec'];
 manifest:World['manifest'];
 soulriverPorts:World['soulriverPorts'];
 severFootprintCrossers:World['severFootprintCrossers'];
 mintSpanPartner:World['mintSpanPartner'];
 liveCourses:World['liveCourses'];
}

export function nativeGraphRollHoldfast(host:NativeSceneGraphHost,def: ZoneDef): void {
    const hf = host.sim.holdfastField;
    // THE HOSTING LAW (zonePolicy.holdfastHostable — one predicate for the
    // natural roll, the dev force, and the overlay belt): no gate on ground
    // that can't honestly anchor a fresh minted zone — off-graph caves and
    // sidezones, event-owned/floating/special/concealed mints, sanctuaries,
    // purchased pockets (a toll behind a toll would chain cul-de-sacs and
    // re-sell bought ground), breach maws, boundless streams — and biomes
    // may deny 'holdfast' as pure data.
    if (!hf || !holdfastHostable(def)) return;
    // Holdfast density = its original encounterDensity × the live MYCELIA suppression ONLY
    // (NOT the full eventDensityFor — keep biome density out of the holdfast roll so a
    // spore-laced zone raises fewer gates without otherwise re-tuning shipped behaviour).
    const info = hf.ensureRolled(def, (def.encounterDensity ?? 1) * (host.sim.myceliaField?.suppressionAt(def.id) ?? 1));
    if (!info || info.exitAppended) return;
    // The overlay's rolled `at` is a PREFERENCE — the spacing guard keeps it
    // unless its portal pixel would stack on an existing exit (same side OR a
    // corner), else it slides to the clearest slot on that side. Without this
    // a holdfast at 0.32 beside a frontier at 0.35 overlapped outright.
    def.exits.push({ to: '?', side: info.side, at: spacedExitAt(def, info.side, info.at), lock: info.lockId });
    info.exitDefIndex = def.exits.length - 1;
    info.exitAppended = true;
  }

export function nativeGraphEagerChartNeighbors(host:NativeSceneGraphHost,zone: ZoneDef): void {
    if (!EAGER_WORLD_WEB || zone.caveDepth != null || zone.objective.kind === 'safe') return;
    host.chartNeighborsOf(zone);
  }

export function nativeGraphChartNeighborsOf(host:NativeSceneGraphHost,zone: ZoneDef): void {
    // Snapshot the '?' exits up front, since we rebuild zone.exits at the end (the drop pass)
    // — iterate a stable array, never the one we mutate. A LOCKED frontier (a Holdfast
    // bonus exit) resolves like every other: its pocket mints eagerly (chartFrontier's
    // lock branch), pre-recognized on the map behind its gate — the LOCK gates travel
    // (isExitLocked), never the chart. One mint discipline for the whole web.
    const frontiers = zone.exits.filter(x => x.to === '?');
    const drop = new Set<ZoneExitDef>();
    for (const e of frontiers) {
      // THE ROAD BUDGET at resolution (worldgen.roadBudgetOf): '?' promises
      // never counted toward degree, so a weave-filled node still cashed
      // every frontier when the halo swept it — 6-7 roads on ordinary
      // country, sometimes more. Once the zone's charted roads reach its
      // biome budget, the remaining frontiers CONSOLIDATE (the world keeps
      // growing from its under-budget rim). A LOCKED frontier is a bought
      // deed (the Holdfast's pocket) — never dropped.
      if (!e.lock && countRoads(zone) >= roadBudgetOf(zone)) { drop.add(e); continue; }
      const gen = host.chartFrontier(zone, e);
      // COLLAPSE redundant frontiers: if the zone already connects to the resolved
      // neighbour (e.g. one big Field region borders this zone on several sides, or two
      // frontiers dedup onto the same node), DROP this extra frontier instead of stacking
      // duplicate portals to the same place. (linkBackTo already de-duped the reciprocal.)
      if (gen.id === zone.id || zone.exits.some(x => x !== e && x.to === gen.id)) { drop.add(e); continue; }
      e.to = gen.id;
    }
    if (drop.size) { // rebuild in place — safe here, BEFORE the live portals are placed
      const kept = zone.exits.filter(x => !drop.has(x));
      zone.exits.length = 0;
      zone.exits.push(...kept);
    }
  }

export function nativeGraphChartWithin(host:NativeSceneGraphHost,origin: MapCoord, radius: number, dim: string): void {
    host.mintVeil = true;
    try {
      const charted = new Set<string>();
      for (;;) {
        const batch = Object.values(host.zoneMap).filter(z =>
          !charted.has(z.id) && forechartSource(z, dim) && coordDist(z.map, origin) <= radius);
        if (!batch.length) break;
        for (const z of batch) {
          charted.add(z.id);
          host.chartNeighborsOf(z);
        }
      }
    } finally {
      host.mintVeil = false;
    }
  }

export function nativeGraphChartFrontier(host:NativeSceneGraphHost,source: ZoneDef, exitDef: ZoneExitDef): ZoneDef {
    // HOLDFAST bonus exit (lock'd): resolves into a purchased POCKET — a fresh
    // dead-end minted through the shared placement primitive (never the field
    // mint-once / eager-web LINK paths: the earned ground is genuinely new).
    // Same timing as every frontier; the LOCK gates travel, not the mint.
    if (exitDef.lock) return host.mintHoldfastPocket(source, exitDef);
    // Two distinct local openingProgression approaches. Atlas catchments and
    // huge Field footprints must not merge every starting road into one seat.
    // The normal placement/biome/layout pipeline still builds these areas.
    const openingProgression = (source.id === HUB_ZONE
      && source.exits.filter(e => e.to !== '?' && e.to !== START_ZONE && !e.lock).length < OPENING_PROGRESSION.approaches)
      || (source.id.startsWith('gen_opening_')
        && Object.keys(host.zoneMap).filter(id => id.startsWith('gen_opening_')).length < OPENING_PROGRESSION.levels.length);
    const seed = host.sim.biomeField.fieldSeed;
    // A FIELD source spans a big region, so its frontiers project from the region BOUNDARY
    // (one step past the blob edge) — not the node point, which would land back INSIDE the
    // region and mint a duplicate Field zone. Non-Field sources project the usual node step.
    const target = openingProgression ? projectCoord(source.map, exitDef.side) : source.field
      ? host.fieldFrontierTarget(source.field, exitDef.side, exitDef.at ?? 0.5)
      : biomeFrontierTarget(source, exitDef.side, host.biomeFor);
    if ((source.dimension ?? 'surface') === 'surface' && (source.geo?.escarpment?.blockedSide === exitDef.side || !escarpmentRoad(source.map, target, seed))) return source;
    // THE LAND ENDS: a frontier reaching into OCEAN mints a PORT on the shore
    // instead of a zone at sea — travel onward is by sail (the Sail menu at
    // the dock). A port's own seaward frontiers never mint (the sea is the
    // road, not more coastline); eagerChartNeighbors consolidates the stub.
    // Only the SURFACE has an ocean — other dimensions grow unbroken.
    if (!source.dimension && host.continentFor(target).kind === 'ocean') {
      if (source.port) return source;
      // THE SEA FABRIC (world/seas.ts): touching ANY water of a sea makes
      // the WHOLE sea real — filled, classed, named, its deliberate port
      // system minted veiled (ensureSeaPorts: hold-anchor + port pairs).
      // THE DRY-ROAD RESOLUTION: the frontier bends along the coast to the
      // nearest HOLD ANCHOR — the mainland gate over the quay — but only
      // one on THIS shore (the chord home must be dry) and only within
      // SEA_CFG.pair.anchorSnapRange. The old law linked every water touch
      // to the nearest harbor by raw distance, which made each port a
      // many-spoked hub and, across a narrow water, a walkable teleport —
      // the exact sprawl the sealed shores killed on the river. Farther
      // brine is just shore: the frontier consolidates onto its source,
      // and the sea stays a thing you SAIL.
      const sea = seaAt(target, host.sim.biomeField.fieldSeed);
      if (sea && sea.ports.length) {
        const ports = host.ensureSeaPorts(sea);
        let best: ZoneDef | null = null, bd = SEA_CFG.pair.anchorSnapRange;
        for (const p of ports) {
          // The land-facing half of each pair: the anchor for new-format
          // ports, the grandfathered town itself for legacy single-zone
          // ports (old saves keep their shape).
          const a = p.holdAnchor ? host.zoneMap[p.holdAnchor] : p;
          if (!a || a.id === source.id) continue;
          // THE DEGREE CAP: an anchor at its road budget takes no more
          // spokes — the coast keeps consolidating instead. Without this,
          // every halo frontier along the shore snapped in and the anchor
          // became the hub the port used to be (a dozen doors deep).
          if (countRoads(a) >= SEA_CFG.pair.anchorMaxRoads) continue;
          const d = coordDist(a.map, source.map);
          if (d >= bd) continue;
          if (host.roadIsWet(a.map, source.map)) continue;
          bd = d; best = a;
        }
        if (best) {
          host.linkBackTo(best, source);
          // The land approach FOUND this harbor's gate: if the walker
          // already stands on charted ground beside it, lift its veil now.
          if (host.visited.has(source.id)) best.veiled = false;
          return best;
        }
      }
      // Portless water, a far shore, or no dry way to a gate: the shore is
      // just shore — consolidate the frontier back onto its source.
      return source;
    }
    // Field regions are a SURFACE feature — a dimensioned source never joins one.
    const atlasDestination = !openingProgression && (source.dimension ?? 'surface') === 'surface'
      ? atlasDestinationAt(target, source.destination?.feature, source.map) : undefined;
    const ext = openingProgression || source.dimension || atlasDestination ? null : fieldRegionAt(target, seed);
    if (ext) {
      // A frontier that still lands in our OWN region (a concave blob edge) is redundant —
      // return source so eagerChartNeighbors drops it (never mint a twin of our own region).
      if (source.field?.regionId === ext.regionId) return source;
      // Mint-once: match the shard's canonical id — or CONTAINMENT in an older
      // zone's core rect (a save minted before the shard law keeps its whole
      // mega-region; a twin must never mint inside standing expanse ground).
      const existing = Object.values(host.zoneMap).find(z => z.id !== source.id && z.field
        && (z.field.regionId === ext.regionId || (() => {
          const r = fieldCoreRect(z.field!, z.size);
          return target.x >= r.x0 && target.x <= r.x1 && target.y >= r.y0 && target.y <= r.y1;
        })()));
      if (existing) {
        // Already joined both ways is a plain resolve, never a new spoke.
        if (existing.exits.some(x => x.to === source.id)) return existing;
        // THE DRY-ROAD LAW: a region met across a corner of brine is not a
        // neighbour — consolidate rather than forge a one-way wet edge.
        if (host.roadIsWet(existing.map, source.map)) return source;
        // THE HUB BUDGET (the sea-anchor degree law, on land): an expanse at
        // its road budget takes no more spokes — the rim consolidates instead.
        // Uncapped, the forechart halo walked the whole perimeter and the one
        // node collected 14-16 doors (the "enormous Fields" disease).
        if (countRoads(existing) >= roadBudgetOf(existing)) return source;
        host.linkBackTo(existing, source); return existing;
      }
    }
    // THE RIVERS OF SOULS (world/soulriver.ts): each strewn soulway instance
    // is a PLACE — a frontier landing in an instance's corridor always finds
    // THAT instance's shore (the field-region mint-once law, below ground,
    // dealt plural). The rivers hang off no gate: the strewn law deals them
    // across the realm's whole chart, so every run meets its rivers where
    // the dice poured them — beside the Hellgate only if it happens so.
    if (source.dimension === SOULRIVER_CFG.dimension && !isSoulriverId(source.id)) {
      const inst = soulwayCatchAt(target, host.sim.biomeField.fieldSeed);
      if (inst) {
        // THE SEALED SHORES (the sea-harbor law, below ground): the river's
        // edge set is exactly its dealt landings — a corridor frontier
        // resolves to the NEAREST LANDING PORT, never to the water itself
        // (the surface's ocean→nearest-harbor branch, mirrored). The port
        // is an ordinary country zone: it takes the road, the pier takes
        // you the rest of the way.
        const river = host.zoneMap[riverZoneId(inst.key)] ?? host.mintSoulriverZone(source, inst);
        const port = host.nearestRiverPort(inst.key, target);
        if (port) { host.linkBackTo(port, source); return port; }
        // A legacy river with no minted ports keeps the old shore-finding.
        host.linkBackTo(river, source, true);
        return river;
      }
    }
    if (!openingProgression && !atlasDestination && EAGER_WORLD_WEB) {
      const near = host.nearestLinkable(target, source, exitDef.side);
      if (near) { host.linkBackTo(near, source); return near; }
    }
    // THE OCCUPANCY LAW (WEB_CFG.mintOccupancy): a random frontier into
    // ground that already holds a node CONSOLIDATES — never a twin. This is
    // what a refused link used to fall through to: the mint, whose twenty
    // anti-crowd pushes fail inside a saturated pocket, and whose settled
    // 44u stand then reads as "zones accumulating in the same spot". The
    // expanse path above is exempt (region-keyed mint-once); directed mints
    // (quests/events) never pass here — the story always mints; and a
    // ROADLESS GATE HUB's fan is exempt too (its arms are the realm's
    // authored front door — a dropped arm could never be re-linked, ever).
    if (!atlasDestination && !ext && !host.roadlessGateHub(source) && host.mintGroundTaken(target, source)) return source;
    // Mint at the computed target. A Field source projects from the boundary (placeZoneAt
    // takes an explicit target); a normal source uses generateZone's node-step projection.
    // A non-surface source samples ITS OWN dimension's biome palette (hell grows hell).
    const biomeFor = source.dimension ? host.dimensionBiomeFor(source.dimension) : host.biomeFor;
    // Biome DEPTH follows the PLANE: surface mints read the surface Voronoi,
    // dimension mints read their OWN field's depth (dimensionBiomeDepth) —
    // realm countries stage their faces by it (the High Bastion), and a
    // dimension whose biomes declare no envelopes is byte-identical (the
    // envelope algebra ignores the datum).
    const depthFor = source.dimension ? host.dimensionBiomeDepthFor(source.dimension) : host.biomeDepthFor;
    // An EXPANSE mint (ext: the target stands on Field ground) skips the
    // opportunistic weave — its doors are the HUB LAW's dealt spread plus
    // budgeted inbound links (fieldifyZone), never a cluster at the
    // discovering corner. Everything else about the mint is the ordinary
    // frontier pipeline (same spec fields generateZone forwards).
    const gen = openingProgression
      ? placeZoneAt(target, source, host.zoneMap, host.nextGenId++,
        { id: `gen_opening_${host.nextGenId - 1}`, tileset: exitDef.tileset, biomeFor,
          level: source.id === HUB_ZONE ? 1 : host.levelFor(target), biomeDepthFor: depthFor, climateFor: host.climateFor, fieldBiome: true,
          noWeave: true, forceFrontiers: 3, noFactionWar: true, objective: { kind: 'clear', seal: false } })
      : ext
      ? placeZoneAt(target, source, host.zoneMap, host.nextGenId++,
        { tileset: exitDef.tileset, biomeFor, levelFor: host.levelFor, biomeDepthFor: depthFor, climateFor: host.climateFor, fieldBiome: true, dimension: source.dimension, courseFor: host.courseMintFor(source.dimension), noWeave: true })
      : source.field
        ? placeZoneAt(target, source, host.zoneMap, host.nextGenId++,
          { tileset: exitDef.tileset, biomeFor, levelFor: host.levelFor, biomeDepthFor: depthFor, climateFor: host.climateFor, fieldBiome: true, dimension: source.dimension })
        : generateZone(source, exitDef, host.zoneMap, host.nextGenId++, biomeFor, host.levelFor, depthFor, host.climateFor,
          host.courseMintFor(source.dimension));
    if (host.zoneMap[gen.id] === gen) return gen; // an atlas destination already charted by another approach
    if (!openingProgression && !gen.locale) host.fieldifyZone(gen, ext);
    if (source.dimension) gen.level += dimensionDef(source.dimension).levelBonus ?? 0;
    if (host.mintVeil) gen.veiled = true; // a forechart sweep mints AHEAD of the walker
    host.zoneMap[gen.id] = gen;
    // THE SETTLING for expanses: fieldifyZone re-centred this node onto its
    // region's middle AFTER placeZoneAt's own settle ran — if the centre
    // landed near standing nodes, the ring gives way now (the expanse itself
    // is immovable by the settle's own law: its map point IS the blob).
    if (gen.field) {
      settleWeb(host.zoneMap, null, {
        around: gen.map,
        canStand: (z, pt) => (z.dimension ? true : host.biomeFor(pt) !== OCEAN_BIOME),
      });
    }
    // Chart into the sim — it ROUTES to the overlays of the node's dimension
    // (sim.onNodeCharted): surface mints feed the surface systems, hell mints
    // feed hell's own overlay instances. Parallel world-states, one graph.
    host.sim.onNodeCharted(gen, host.simView());
    if (gen.complex?.root === gen.id) for (const member of Object.values(host.zoneMap)) {
      if (member.id !== gen.id && member.complex?.root === gen.id) host.sim.onNodeCharted(member, host.simView());
    }
    // THE ROOTED WEB (data/underspans.ts): an ORGANIC mint in a spanned biome
    // may seed an under-zone reaching other nodes — rolled on a private
    // position-hash stream, so unspanned biomes stay byte-identical and the
    // shared stream never moves. Directed mints (quests, events, soundings'
    // wire-ins) never pass this path — the story's ground sprouts no roots.
    host.underSpanPass(gen);
    return gen;
  }

export function nativeGraphFieldFrontierTarget(host:NativeSceneGraphHost,f: { originX: number; originY: number; nodeW: number; nodeH: number }, side: ZoneExitDef['side'], at: number): { x: number; y: number } {
    const STEP = 80, t = clamp(at, 0.1, 0.9);
    if (side === 'n') return { x: f.originX + f.nodeW * t, y: f.originY - STEP };
    if (side === 's') return { x: f.originX + f.nodeW * t, y: f.originY + f.nodeH + STEP };
    if (side === 'w') return { x: f.originX - STEP, y: f.originY + f.nodeH * t };
    return { x: f.originX + f.nodeW + STEP, y: f.originY + f.nodeH * t };
  }

export function nativeGraphNearestLinkable(host:NativeSceneGraphHost,target: { x: number; y: number }, source: ZoneDef, side: ZoneExitDef['side']): ZoneDef | null {
    const ux = side === 'e' ? 1 : side === 'w' ? -1 : 0; // the frontier's cardinal direction
    const uy = side === 's' ? 1 : side === 'n' ? -1 : 0;
    let best: ZoneDef | null = null, bd = CONNECT_DIST;
    for (const z of Object.values(host.zoneMap)) {
      if (z.id === source.id || z.caveDepth != null || z.floating || z.concealed || z.pocket) continue;
      if ((z.dimension ?? 'surface') !== (source.dimension ?? 'surface')) continue; // the web never crosses dimensions
      if (z.objective.kind === 'safe') continue;
      // A ROADLESS GATE HUB (DimensionEntry.road === false — the Firmament)
      // swore off roads: its edge set is exactly its minted frontiers,
      // FOREVER. It sits at the web's origin coordinate, so a second-ring
      // frontier curling back toward the origin used to link INTO it (the
      // hub silently accreted inbound roads — the "Firmament exit that leads
      // straight back to the Firmament" round-trip). Registry-driven: no new
      // zone flags, and existing saves heal by construction (link decisions
      // consult the live registry, never persisted edges).
      if (host.roadlessGateHub(z)) continue;
      // THE SEALED SHORES (ZoneKindDef.staticExits — the river): a kind
      // whose edge set is its dealt exits never accretes web links either;
      // same registry-driven healing as the roadless hub above.
      if (zoneKindOf(z)?.staticExits) continue;
      // DIRECTIONAL: only link to a node in this frontier's direction FROM the source (a ±50°
      // cone), so an 'e' frontier never links to a node that's actually NE/SE of us (which
      // would draw a road in the wrong direction and break the map's directional read).
      // THE CHEAP-FIRST GATE: the cone + the nearest-so-far cut run BEFORE the
      // expensive laws below (the wet-road chord march, the footprint scan,
      // the bypass chord test) — every gate is a pure read, and the strict `<`
      // keeps the same first-in-insertion-order winner on ties, so reordering
      // them changes which candidates PAY, never which candidate WINS.
      const vx = z.map.x - source.map.x, vy = z.map.y - source.map.y;
      const vl = Math.hypot(vx, vy) || 1;
      if ((vx * ux + vy * uy) / vl < 0.64) continue; // cos(50°) ≈ 0.64
      const d = Math.hypot(z.map.x - target.x, z.map.y - target.y);
      if (d >= bd) continue;
      // THE DRY-ROAD LAW: a candidate across the water is no neighbour —
      // the web walks, it never swims (the far shore is a voyage away).
      if (!escarpmentConnection(source, z)) continue;
      if (!source.dimension && host.roadIsWet(source.map, z.map)) continue;
      // THE FOOTPRINT LAW: a link whose chord cuts across a Field expanse's
      // core rect is a shortcut over the meadow — refused (spokes exempt:
      // an endpoint inside the rect passes inside footprintBars itself).
      if (!source.dimension && footprintBars(source.map, z.map, host.zoneMap)) continue;
      // THE ROAD BUDGET (per-biome, worldgen.roadBudgetOf): a node at its
      // budget takes no opportunistic link — nearestLinkable was the one
      // road-former still stacking spokes past the cap.
      if (countRoads(z) >= roadBudgetOf(z)) continue;
      if (source.exits.some(x => x.to === z.id)) continue; // already linked — don't duplicate
      // THE BYPASS RULE: never link along a chord that would draw through a
      // third node's disc — the web reaches that country through the
      // neighbour instead (one shared predicate with the weave).
      if (!chordClearsNodes(source.map, z.map, host.zoneMap, source.dimension, new Set([source.id, z.id]))) continue;
      bd = d; best = z;
    }
    return best;
  }

export function nativeGraphMintGroundTaken(host:NativeSceneGraphHost,target: MapCoord, source: ZoneDef): boolean {
    const dim = source.dimension ?? 'surface';
    const biome = source.dimension
      ? host.dimensionBiomeFor(source.dimension)(target)
      : host.biomeFor(target);
    const sep = biomeSpacing(biome) * WEB_CFG.mintOccupancy;
    for (const z of Object.values(host.zoneMap)) {
      if (z.id === source.id || z.caveDepth != null || (z.dimension ?? 'surface') !== dim) continue;
      let d: number;
      if (z.field) {
        const r = fieldCoreRect(z.field, z.size);
        const px = clamp(target.x, r.x0, r.x1), py = clamp(target.y, r.y0, r.y1);
        d = Math.hypot(target.x - px, target.y - py);
      } else {
        d = Math.hypot(z.map.x - target.x, z.map.y - target.y);
      }
      if (d < sep) return true;
    }
    return false;
  }

export function nativeGraphRoadlessGateHub(host:NativeSceneGraphHost,z: ZoneDef): boolean {
    return isRoadlessGateHub(z); // one predicate (world/dimensions.ts) — the
    // weaver, the linkers, the anchor pickers and the load heal all read it.
  }

export function nativeGraphMintHoldfastPocket(host:NativeSceneGraphHost,source: ZoneDef, exitDef: ZoneExitDef): ZoneDef {
    const hf = host.sim.holdfastField;
    const gdef = hf ? hf.def(hf.infoFor(source.id)?.defId ?? '') : undefined;
    const pocket = gdef?.pocket;
    // THE FORM: which SHAPE the earned ground takes (data/pocketForms.ts) — a
    // small loot-littered hollow or a full hidden zone — rolled ONCE from the
    // guardian's weighted rows, seeded on the run + the lock (deterministic
    // however the mint is re-asked), then BAKED on the def (`pocketForm`).
    const roll = host.rollPocketForm(source, exitDef, pocket);
    const form = pocketFormOf(roll.form);
    let target = projectCoord(source.map, exitDef.side);
    // The earned ground must be LAND — a pocket never mints a port (the ocean
    // gate belongs to the open frontier path alone).
    if (!source.dimension && host.continentFor(target).kind === 'ocean') target = host.pullToLand(target);
    const gen = placeZoneAt(target, source, host.zoneMap, host.nextGenId++, {
      // A def may force its pocket's tileset; otherwise the heat-map biome at
      // the coord decides (fieldBiome), sampled from the source's OWN plane.
      tileset: pocket?.tileset ?? exitDef.tileset,
      biomeFor: source.dimension ? host.dimensionBiomeFor(source.dimension) : host.biomeFor,
      levelFor: host.levelFor,
      biomeDepthFor: source.dimension
        ? host.dimensionBiomeDepthFor(source.dimension) : host.biomeDepthFor,
      climateFor: host.climateFor,
      fieldBiome: !pocket?.tileset,
      dimension: source.dimension,
      pocket: true,
      // The form's word on the mint itself: footprint band, objective policy,
      // and whether a war may brawl in the bought ground.
      ...(form.size ? { sizeBand: form.size } : {}),
      ...(form.objective ? { objective: form.objective } : {}),
      ...(form.objectivePool ? { objectivePool: form.objectivePool } : {}),
      ...(form.factionWar === false ? { noFactionWar: true } : {}),
    });
    gen.pocketForm = form.id;
    // The node reads as what it is ("Sunken Grove Hoard") — feel is part of
    // the promise. Base names are already dedupe'd, so the suffix can't clash.
    if (form.nameWord) gen.name = `${gen.name} ${form.nameWord}`;
    if (source.dimension) gen.level += dimensionDef(source.dimension).levelBonus ?? 0;
    if (gdef?.reward.destLevelDelta) gen.level = Math.max(1, gen.level + gdef.reward.destLevelDelta); // the base reward bias
    host.applyPocketSpec(gen, form, roll, pocket);
    if (host.mintVeil) gen.veiled = true; // a pocket minted in veiled country stays veiled with it
    host.zoneMap[gen.id] = gen;
    host.sim.onNodeCharted(gen, host.simView());
    return gen;
  }

export function nativeGraphMintSoulriverZone(host:NativeSceneGraphHost,source: ZoneDef, inst: CourseInstance): ZoneDef {
    const dimId = SOULRIVER_CFG.dimension;
    const seat = riverSeatOf(inst);
    const gen = placeZoneAt(seat, source, host.zoneMap, host.nextGenId++, {
      id: riverZoneId(inst.key),
      // Every instance wears the one name: it is ONE river, met again.
      name: 'The River of Souls',
      tileset: SOULRIVER_CFG.tileset,
      seed: (host.manifest.seed ^ 0x5001f ^ hashStr(inst.key)) >>> 0,
      // A place, not a task: the ship is the ask, and docks never seal.
      objective: { kind: 'none', label: 'the Soul-Ship calls at every shore' },
      forceFrontiers: 0,
      dimension: dimId,
      biomeFor: host.dimensionBiomeFor(dimId),
      levelFor: host.levelFor,
      biomeDepthFor: host.dimensionBiomeDepthFor(dimId),
      climateFor: host.climateFor,
      // THE AUTHORED BASIN: the river's own bands, read from the registry —
      // a spec'd sizeBand stands the spec-less 1.4× height stretch down
      // (worldgen's SPECLESS_H_STRETCH), so the sea mints inside its
      // authored footprint by construction. Without it the aspect roll
      // admitted faces up to 4480 tall against a 3200 ceiling (measured:
      // 6/6 sampled mints outside the band, 5 pinned at the stretched cap).
      sizeBand: {
        w: TILESETS[SOULRIVER_CFG.tileset].sizeW,
        h: TILESETS[SOULRIVER_CFG.tileset].sizeH,
      },
    });
    gen.level += dimensionDef(dimId)?.levelBonus ?? 0;
    // The sea-node identity (data/zoneKinds.ts): ring + ship glyph on the
    // chart, lane-styled roads — the node reads as water, not ground.
    gen.kind = 'soulriver';
    // A forechart sweep mints AHEAD of the walker — the sea keeps its veil
    // like any other ahead-minted ground (the one fog seam).
    if (host.mintVeil) gen.veiled = true;
    host.zoneMap[gen.id] = gen;
    host.soulriverPorts(gen);
    host.sim.onNodeCharted(gen, host.simView());
    return gen;
  }

export function nativeGraphNearestRiverPort(host:NativeSceneGraphHost,instKey: string, at: MapCoord): ZoneDef | null {
    const pre = `${SOULRIVER_CFG.dockIdBase}_${instKey}_`;
    let best: ZoneDef | null = null, bd = Infinity;
    for (const z of Object.values(host.zoneMap)) {
      if (!z.id.startsWith(pre)) continue;
      const d = (z.map.x - at.x) ** 2 + (z.map.y - at.y) ** 2;
      if (d < bd) { bd = d; best = z; }
    }
    return best;
  }

export function nativeGraphFieldifyZone(host:NativeSceneGraphHost,def: ZoneDef, ext: FieldExtent | null): void {
    if (def.locale || def.biome !== FIELD_BIOME) return;
    const seed = host.sim.biomeField.fieldSeed;
    const e = ext ?? fieldRegionAt(def.map, seed);
    if (!e) return;
    def.size = { w: e.sizeW, h: e.sizeH };
    def.shape = 'rect'; // the blob mask carries the silhouette — no ellipse projection
    def.field = { originX: e.originX, originY: e.originY, scale: e.scale, seed, regionId: e.regionId, nodeW: e.nodeW, nodeH: e.nodeH };
    // CENTRE the map NODE on the region, so the region-spanning rect, its label, and its
    // radiating roads all anchor to the blob's middle (the mint nudge can leave the raw point
    // off to one side). Neighbours sit OUTSIDE the region, so re-centring never overlaps them.
    def.map = { x: e.originX + e.nodeW / 2, y: e.originY + e.nodeH / 2 };
    // MANY EXITS: a Field expanse is an exploration HUB — replace the default 1-2 frontiers
    // with a SPREAD of boundary frontiers (FIELD_GEN.hubSpread per side) so neighbours
    // radiate from the region's edges/corners (chartFrontier projects each OUT past the
    // blob boundary). Keep the back-edge + any real roads (non-'?') — they're already
    // wired. This runs at mint, before the zone is loaded, so rebuilding def.exits in
    // place is safe. The TOTAL door count answers the biome's ROAD BUDGET at frontier
    // resolution (chartNeighborsOf) — the spread deals the doors, the budget seats them.
    const tileset = def.exits.find(x => x.tileset)?.tileset;
    const reals = def.exits.filter(x => x.to !== '?');
    // Each spread frontier claims a SPACED slot against everything already in
    // the rebuilt list (the kept weave roads included) — a real road at n@0.35
    // used to sit 0.05·w from the spread's n@0.3, overlapping portals.
    const rebuilt: ZoneExitDef[] = [...reals];
    const probe = { exits: rebuilt, size: def.size };
    for (const side of ['n', 's', 'e', 'w'] as const) {
      for (const at of FIELD_GEN.hubSpread) rebuilt.push({ to: '?', side, at: spacedExitAt(probe, side, at), tileset });
    }
    def.exits.length = 0;
    def.exits.push(...rebuilt);
    // THE LANDINGS (ZoneDef.berths — the soulriver's many-mouthed law): a map
    // BERTH at each spread stop on the region's boundary, so every road into
    // the expanse lands at its true edge instead of converging on the centre
    // dot (panels' anchorOf snaps each edge to its nearest berth). Node-space
    // rect edge = the drawn region boundary; persisted with the def.
    def.berths = [];
    for (const at of FIELD_GEN.hubSpread) {
      def.berths.push(
        { x: e.originX + e.nodeW * at, y: e.originY },            // n
        { x: e.originX + e.nodeW * at, y: e.originY + e.nodeH },  // s
        { x: e.originX, y: e.originY + e.nodeH * at },            // w
        { x: e.originX + e.nodeW, y: e.originY + e.nodeH * at },  // e
      );
    }
    // THE FOOTPRINT LAW, retroactive half: roads forged BEFORE this expanse
    // stood (the halo weaves the approach ring first) may cut across the
    // just-claimed core rect — sever them now, while they are still veiled
    // rim country nobody has walked.
    host.severFootprintCrossers(def);
  }

export function nativeGraphUnderSpanPass(host:NativeSceneGraphHost,seat: ZoneDef): void {
    const pol = underSpanPolicyOf(seat.biome ?? '');
    if (!pol) return; // absent == identical: no stream is even created
    if ((seat.locale && !seat.locale.underways) || seat.underways?.length || seat.field || seat.pocket || seat.floating
      || seat.concealed || seat.kind || seat.caveDepth != null || seat.special
      || seat.port || seat.holdAnchor || seat.objective.kind === 'safe') return;
    const rng = new Rng(hashStr(`ugspan:${host.manifest.seed}:${seat.id}`));
    if (!rng.chance(pol.chance)) return;
    const spanId = `ugspan_${seat.id}`;
    const reach = rng.int(pol.reach[0], pol.reach[1]);
    const dim = seat.dimension ?? 'surface';
    // Standing candidates: plain UNVISITED same-biome kin in radius — walked
    // ground is never mutated (its layout is realized; a new mouth row would
    // tear the zone-memory pairing). Deterministic order by span-salted hash.
    const cands = Object.values(host.zoneMap).filter(z =>
      z.id !== seat.id && (z.dimension ?? 'surface') === dim && z.caveDepth == null
      && z.biome === seat.biome && !z.field && !z.pocket && !z.floating
      && !z.concealed && !z.kind && !z.special && !z.port && !z.holdAnchor
      && z.objective.kind !== 'safe' && !host.visited.has(z.id)
      && !z.underways?.some(u => u.span === spanId)
      && Math.hypot(z.map.x - seat.map.x, z.map.y - seat.map.y) <= pol.radius)
      .sort((a, b) => hashStr(`${spanId}:${a.id}`) - hashStr(`${spanId}:${b.id}`));
    const members: ZoneDef[] = [seat];
    for (let i = 0; i < reach; i++) {
      const fresh = rng.chance(pol.fresh);
      const sealed = fresh && rng.chance(pol.exitless);
      // THE DIAL IS HONEST: fresh 0 NEVER mints — an adopt-only slot with no
      // standing candidate simply goes empty (the first node in a patch
      // spans nothing; a later mint adopts IT instead). A fresh slot whose
      // ground hunt misses degrades to adoption.
      const partner = fresh
        ? host.mintSpanPartner(seat, spanId, i, rng, pol, sealed) ?? cands.shift() ?? null
        : cands.shift() ?? null;
      if (partner) members.push(partner);
    }
    if (members.length < 2) return; // no partner seated — the roots stay a rumor
    // Stamp the CLIQUE both ways + one forced mouth per membership. Arrays
    // are cloned before the push: a merged landmark list may share the
    // registry's rows, and a registry is never mutated from here.
    for (const a of members) {
      for (const b of members) {
        if (a.id === b.id) continue;
        a.underways = [...(a.underways ?? []), { to: b.id, span: spanId }];
      }
      a.landmarks = [...(a.landmarks ?? []), { landmark: pol.mouth, chance: 1 }];
    }
  }

export function nativeGraphRollPocketForm(host:NativeSceneGraphHost,
    source: ZoneDef, exitDef: ZoneExitDef, pocket: PocketSpec | undefined,
  ): { form: string; bounty?: number; features?: { kind: string; min: number; max?: number }[] } {
    const rows = pocket?.forms?.length ? pocket.forms : [{ form: DEFAULT_POCKET_FORM, weight: 1 }];
    const rng = new Rng((host.sim.biomeField.fieldSeed ^ hashStr(exitDef.lock ?? `pocket:${source.id}`)) >>> 0);
    let total = 0;
    for (const r of rows) total += Math.max(0, r.weight);
    let x = rng.next() * total;
    for (const r of rows) { x -= Math.max(0, r.weight); if (x <= 0) return r; }
    return rows[rows.length - 1];
  }

export function nativeGraphApplyPocketSpec(host:NativeSceneGraphHost,
    gen: ZoneDef, form: PocketFormDef,
    roll: { bounty?: number; features?: { kind: string; min: number; max?: number }[]; cacheRarity?: ItemRarity },
    pocket: PocketSpec | undefined,
  ): void {
    const bounty = Math.max(form.bounty ?? 0, roll.bounty ?? 0, pocket?.bounty ?? 0);
    if (bounty > 0) gen.bounty = bounty;
    if (form.packDensity !== undefined) gen.packDensity = form.packDensity;
    // THE THEMED CACHE: the guardian's promised chest rarity rides the minted
    // def (row override wins) — loadZone's staked chest reads it back.
    const cr = roll.cacheRarity ?? pocket?.cacheRarity;
    if (cr) gen.cacheRarity = cr;
    const feats = [...(form.features ?? []), ...(roll.features ?? []), ...(pocket?.features ?? [])];
    if (feats.length) {
      const rows = [...gen.layout];
      for (const f of feats) {
        const i = rows.findIndex(r => r.kind === f.kind);
        if (i >= 0) {
          const [lo, hi] = rows[i].count;
          rows[i] = { ...rows[i], count: [Math.max(lo, f.min), Math.max(hi, f.max ?? f.min)] };
        } else {
          rows.push({ kind: f.kind, count: [f.min, f.max ?? f.min] });
        }
      }
      gen.layout = rows;
    }
  }

export function nativeGraphPullToLand(host:NativeSceneGraphHost,coord: { x: number; y: number }): { x: number; y: number } {
    if (host.continentFor(coord).kind !== 'ocean') return coord;
    for (let ring = 1; ring <= 6; ring++) {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const c = { x: coord.x + Math.cos(a) * ring * 190, y: coord.y + Math.sin(a) * ring * 190 };
        if (host.continentFor(c).kind !== 'ocean') return c;
      }
    }
    return coord; // mid-Pacific — let the caller's own fallback handle it
  }

export function nativeGraphMintSpanPartner(host:NativeSceneGraphHost,
    seat: ZoneDef, spanId: string, slot: number, rng: Rng,
    pol: { radius: number; heldKind: string }, sealed: boolean,
  ): ZoneDef | null {
    const biomeFor = seat.dimension ? host.dimensionBiomeFor(seat.dimension) : host.biomeFor;
    const depthFor = seat.dimension ? host.dimensionBiomeDepthFor(seat.dimension) : host.biomeDepthFor;
    // THE ELBOW-ROOM FLOOR: a fresh partner minted inside the seat's own
    // frontier ring squats the ground every promise wants — the occupancy
    // law then consolidates (drops) promise after promise and the country's
    // organic growth starves (measured: a chance-1/fresh-1 forced regime
    // froze a world at 23 zones). Partners therefore mint BEYOND the seat
    // biome's own spacing with margin — under-web reach, never a crowd.
    const dMin = Math.max(pol.radius * 0.45, biomeSpacing(seat.biome ?? '') * 1.4);
    const dMax = Math.max(pol.radius, dMin * 1.15);
    for (let t = 0; t < 6; t++) {
      const ang = rng.next() * Math.PI * 2;
      const d = dMin + (dMax - dMin) * rng.next();
      const c = { x: seat.map.x + Math.cos(ang) * d, y: seat.map.y + Math.sin(ang) * d };
      if (biomeFor(c) !== seat.biome) continue;
      const def = placeZoneAt(c, seat, host.zoneMap, host.nextGenId++, {
        id: `${spanId}_r${slot + 1}`,
        seed: rng.int(1, 0x7fffffff),
        biomeFor, levelFor: host.levelFor, biomeDepthFor: depthFor,
        climateFor: host.climateFor, fieldBiome: true,
        dimension: seat.dimension,
        noBackEdge: true, noWeave: true, forceFrontiers: 0,
        ...(sealed ? { kind: pol.heldKind } : {}),
      });
      def.veiled = true; // the far mouth is met as FOUND ground, never shown early
      host.zoneMap[def.id] = def;
      host.sim.onNodeCharted(def, host.simView());
      return def;
    }
    return null;
  }

export function nativeGraphSeverFootprintCrossers(host:NativeSceneGraphHost,fieldZone: ZoneDef): void {
    if (!fieldZone.field) return;
    const lone = { [fieldZone.id]: fieldZone } as Record<string, ZoneDef>;
    for (const z of Object.values(host.zoneMap)) {
      if (z.dimension || z.caveDepth != null || z.id === fieldZone.id) continue;
      for (let i = z.exits.length - 1; i >= 0; i--) {
        const e = z.exits[i];
        if (e.to === '?' || e.crossDim || e.notarized === true || e.to === fieldZone.id) continue;
        const dest = host.zoneMap[e.to];
        if (!dest || dest.dimension) continue;
        if (dest.exits.some(x => x.to === z.id && x.notarized === true)) continue;
        if (!footprintBars(z.map, dest.map, lone)) continue;
        if (z.exits.filter(x => x.to !== '?').length <= 1) continue;        // the belt…
        if (dest.exits.filter(x => x.to !== '?').length <= 1) continue;     // …both ends
        z.exits.splice(i, 1);
        const back = dest.exits.findIndex(x => x.to === z.id && x.notarized !== true);
        if (back >= 0) dest.exits.splice(back, 1);
      }
    }
  }

export function nativeGraphSoulriverPorts(host:NativeSceneGraphHost,river: ZoneDef): void {
    if (!isSoulriverId(river.id)) return;
    const inst = soulriverInstanceOf(river.id, host.sim.biomeField.fieldSeed);
    // A legacy bare-id river (pre-untethering save) keeps the shape it
    // saved with — no instance to re-derive, nothing to rebuild.
    if (!inst) return;
    const dimId = SOULRIVER_CFG.dimension;
    const palette = (dimensionDef(dimId)?.biomes ?? []).map(b => b.biome);
    // Stamp the deal the layout reads (layoutParam 'dockBiomes') — a saved
    // river keeps its promised shores even if the realm's palette moves.
    river.layoutParams = { ...river.layoutParams, dockBiomes: palette };
    const plan = soulriverPlan(river.seed ?? 0, river.size.w, river.size.h, palette);
    const chMax = Math.max(1, plan.channel.length - 1);
    const landingFracs = plan.landings.map(d => d.chIdx / chMax);
    const coords = dockDestCoordsFor(inst, landingFracs);
    // THE BERTHS (ZoneDef.berths — one zone, several mouths): a small river
    // node on the ribbon at every landing, so the chart's roads meet the
    // water at their true geography. Re-stamped on every reconcile.
    river.berths = berthCoordsFor(inst, landingFracs);
    const rng = new Rng(((river.seed ?? 0) ^ 0xd0c5) >>> 0);
    // THE SEALED SHORES: a keyed river's edge set is EXACTLY its landings
    // plus any NOTARIZED deeds — nothing else survives the rebuild (an old
    // save's accumulated discovery roads heal away right here; the world
    // web routes new arrivals to the ports instead). Idempotent per call.
    const dockPre = `${SOULRIVER_CFG.dockIdBase}_`;
    const rebuilt: ZoneExitDef[] = river.exits.filter(e =>
      e.to !== '?' && e.notarized === true && !e.to.startsWith(dockPre));
    const probe = { exits: rebuilt, size: river.size };
    let prevId: string | undefined;
    for (let k = 0; k < plan.landings.length; k++) {
      const dock = plan.landings[k];
      const id = `${dockPre}${inst.key}_${dock.i}`;
      let dest = host.zoneMap[id];
      if (!dest) {
        const tileset = pickTilesetForBiome(dock.biome, rng, undefined, dimId);
        dest = placeZoneAt(coords[k] ?? river.map, river, host.zoneMap, host.nextGenId++, {
          id,
          ...(tileset ? { tileset } : {}),
          seed: (host.manifest.seed ^ hashStr(id)) >>> 0,
          dimension: dimId,
          biomeFor: host.dimensionBiomeFor(dimId),
          levelFor: host.levelFor,
          biomeDepthFor: host.dimensionBiomeDepthFor(dimId),
          climateFor: host.climateFor,
        });
        dest.level += dimensionDef(dimId)?.levelBonus ?? 0;
        dest.veiled = true; // the sea's ports reveal as found (ride past, or walk in)
        host.zoneMap[id] = dest;
        host.sim.onNodeCharted(dest, host.simView());
      }
      rebuilt.push({ to: id, side: dock.side, at: spacedExitAt(probe, dock.side, dock.at) });
      // THE LANE LAW: chain the ports so the hell map draws the dashed way
      // down the ribbon (both ends veil-gated — the lane reveals as found).
      if (prevId) {
        const prev = host.zoneMap[prevId];
        if (prev && !(prev.searoutes ?? []).includes(id)) (prev.searoutes ??= []).push(id);
      }
      prevId = id;
    }
    river.exits.length = 0;
    river.exits.push(...rebuilt);
  }

export function nativeGraphDimensionBiomeDepthFor(host:NativeSceneGraphHost,dimId: string): (c: { x: number; y: number }) => number {
    const seed = (host.sim.biomeField.fieldSeed ^ COURSE_FIELD_SALT) >>> 0;
    return (c) => dimensionBiomeDepth(dimId, c, seed);
  }

export function nativeGraphCourseMintFor(host:NativeSceneGraphHost,dimId: string | undefined): ((c: { x: number; y: number }) => CourseMintHints | null) | undefined {
    const courses = host.liveCourses(dimId ?? 'surface');
    if (!courses.length) return undefined;
    const seed = (host.sim.biomeField.fieldSeed ^ COURSE_FIELD_SALT) >>> 0;
    return (c) => {
      for (const { spec, anchor } of courses) {
        if (spec.anchor === 'strewn') {
          for (const inst of strewnInstancesNear(spec, c, seed)) {
            const h = courseMintHints([spec], inst.anchor, c, inst.iseed);
            if (h) return h;
          }
          continue;
        }
        if (!anchor) continue;
        const h = courseMintHints([spec], anchor, c, seed);
        if (h) return h;
      }
      return null;
    };
  }
