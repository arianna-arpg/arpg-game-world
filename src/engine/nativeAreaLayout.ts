/** Exact native post-layout adoption. Same installed native sources, mutable
 * owner-local state; no arrival, body birth, source issuance or publication. */
import type { World } from './world';
import type { ZoneDef } from '../data/zones';
import type { GeneratedLayout } from './levelgen';
import type { Vec2 } from '../core/math';
import { rand, vec } from "../core/math";
import { doodadRuleOf } from "./levelgen";
import { makeTierView } from "./tiers";
import { sidezoneOf } from "../data/sidezones";
import { Rng } from "../core/rng";
import { isSoulriverId } from "../world/soulriver";
import { isDoodadGround } from "../world/regions";
import { buildZoneFog, FOG_CFG } from "./fog";
import { buildZoneCreep, CREEP_CFG } from "./creep";
import { dimensionDef, dimensionIds } from "../world/dimensions";
import { bumpLedger } from "../packages/ledger";
import { SNOW_CFG } from "./snowCover";
import { WEATHER_DRESS_CFG } from "./weatherDress";
import { clampToBounds } from "../world/shape";
const GROUND_KINDS = {
  includes: (kind: string): boolean => isDoodadGround(kind),
};
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export interface NativeAreaLayoutHost {
  doodads: World["doodads"];
  bridges: World["bridges"];
  grounds: World["grounds"];
  walk: World["walk"];
  tierViews: World["tierViews"];
  tierCrossings: World["tierCrossings"];
  tierNavs: World["tierNavs"];
  tierSeats: World["tierSeats"];
  airPockets: World["airPockets"];
  grantedPocketCache: World["grantedPocketCache"];
  grantedTrailMemory: World["grantedTrailMemory"];
  syncedGrantedPockets: World["syncedGrantedPockets"];
  structures: World["structures"];
  oceanBearing: World["oceanBearing"];
  arena: World["arena"];
  clampPos: World["clampPos"];
  seaNameOf: World["seaNameOf"];
  ledger: World["ledger"];
  notice: World["notice"];
  seasSeen: World["seasSeen"];
  breachPos: World["breachPos"];
  clearTransitSpot: World["clearTransitSpot"];
  farPoint: World["farPoint"];
  dimGates: World["dimGates"];
  bossRun: World["bossRun"];
  arenaSinks: World["arenaSinks"];
  migrantSquadId: World["migrantSquadId"];
  arenaWash: World["arenaWash"];
  shake: World["shake"];
  snowCover: World["snowCover"];
  zone: World["zone"];
  snowFloor: World["snowFloor"];
  weatherDressAcc: World["weatherDressAcc"];
  tempGrounds: World["tempGrounds"];
  evaporating: World["evaporating"];
  regrowing: World["regrowing"];
  rampageTimer: World["rampageTimer"];
  fog: World["fog"];
  currentZoneSeed: World["currentZoneSeed"];
  creep: World["creep"];
  installCreepFront: World["installCreepFront"];
  tracks: World["tracks"];
  trackSweepAcc: World["trackSweepAcc"];
  addTrack: World["addTrack"];
  collectContactHazards: World["collectContactHazards"];
  trapworks: World["trapworks"];
  trapSweepAcc: World["trapSweepAcc"];
  trapDeferred: World["trapDeferred"];
  addTrapwork: World["addTrapwork"];
  caveEntrances: World["caveEntrances"];
  roofedStructureAt: World["roofedStructureAt"];
  zoneHollows: World["zoneHollows"];
  openedHollows: World["openedHollows"];
  zoneAnnexSpecs: World["zoneAnnexSpecs"];
  caveExitGrace: World["caveExitGrace"];
  zoneEntry: World["zoneEntry"];
}

export function adoptNativeAreaLayout(host: NativeAreaLayoutHost, def: ZoneDef, layout: GeneratedLayout, entry: Vec2, zoneId: string): void {
    host.doodads = layout.doodads;
    // RULE-EFFECT ATTACH: a kind whose DOODAD_RULES row declares a standing
    // `effect` (lava's heat wash, a leyline node's element surge) gets it
    // here — on the FRESH doodad list, with a randomized first cooldown —
    // the ONE seam every gen path pours through (tileset stamps, landmark
    // pours, cave mints). The old lava/magma_core special case ran BEFORE
    // this assignment and armed the PREVIOUS zone's array — any kind's data
    // row now arms the zone actually being loaded.
    for (const d of host.doodads) {
      if (d.effect) continue;
      const rEff = doodadRuleOf(d.kind).effect;
      if (rEff) d.effect = { ...rEff, cd: rand(0, rEff.interval) };
    }
    host.bridges = layout.doodads.filter(d => doodadRuleOf(d.kind).spans);
    host.grounds = layout.doodads.filter(d => GROUND_KINDS.includes(d.kind));
    host.walk = layout.walk ?? null; // a non-convex layout's walkability (else convex)
    // THE TIER FABRIC (engine/tiers.ts): one walk view per elevated story —
    // stateless adapters over the SAME grid (tier flags on region rows), so
    // carves and repaints self-heal on every layer by construction. Reads
    // `def.tiers` (generateLayout just stamped it), never this.zone (stale
    // until the assignment below).
    if (host.walk) {
      const lv = Math.max(1, def.tiers?.levels ?? 1);
      host.tierViews = [];
      for (let t = 1; t <= lv; t++) host.tierViews[t] = makeTierView(host.walk, t);
    } else host.tierViews = null;
    host.tierCrossings.length = 0; // the chase ledger is zone-local
    host.tierNavs.clear(); host.tierSeats = null; // per-story fields die with their zone
    host.airPockets = layout.airPockets ?? []; // underwater: circular bubbles for the renderer
    host.grantedPocketCache.clear();
    host.grantedTrailMemory.clear();
    host.syncedGrantedPockets = undefined;
    host.structures = layout.structures ?? []; // plan structures (rects/roofs/doors/slots)
    // A PORT's DOCK: planted on the oceanward arena edge (the coast landmark's
    // liquid pools that side too, since both read the same bearing convention).
    // Dwell at it to open the Sail menu.
    // THE DOCK-LOCATION LAW: a layout that placed its own dock (the
    // harborcove pier's BERTH) owns the whole quay — this oceanward formula
    // plant and its dressing stand down, so a recipe's dock is a real PLACE
    // (piers, planks, lanterns), never doubled by the fallback. Legacy
    // ports without one keep the old shape byte-true.
    if (def.port && !host.doodads.some(d => d.kind === 'dock')) {
      const a = host.oceanBearing(def.map);
      const dock = vec(
        host.arena.w / 2 + Math.cos(a) * (host.arena.w / 2 - 150),
        host.arena.h / 2 + Math.sin(a) * (host.arena.h / 2 - 150));
      host.doodads.push({ pos: host.clampPos(dock, 26), radius: 26, kind: 'dock' });
      // THE HARBOR BOARD (data/ports.ts): planted a step INLAND of the dock —
      // dwell to read the hearsay (far omens as rumor rows), hire passage down
      // the shipping lanes, or buy a chart of a far seat. The dock keeps its
      // own law: dwelling THERE still casts off directly. HARBORHOLD ground
      // (a legacy town, or a paired quay reading its anchor's ladder)
      // suppresses this plant — the board is a SERVICE seated at its plan
      // anchor (the knowledge network is the hold's reward; refreshHoldServices).
      if (!def.harborhold && !def.holdAnchor) {
        const board = vec(dock.x - Math.cos(a) * 130, dock.y - Math.sin(a) * 130);
        host.doodads.push({ pos: host.clampPos(board, 16), radius: 16, kind: 'harbor_board' });
      }
      // THE HAVEN'S QUAY (ZoneDef.portTier — the sea's hub harbor wears its
      // trade): lantern posts flanking the dock and cargo stacked along the
      // quay line, seeded per zone — a haven READS as a haven from the pier.
      if (def.portTier === 'haven') {
        const qr = new Rng(((def.seed ?? 0) ^ 0x9a7b0) >>> 0);
        const px = -Math.sin(a), py = Math.cos(a); // along-quay axis
        for (const side of [-1, 1]) {
          host.doodads.push({
            pos: host.clampPos(vec(dock.x + px * side * 110, dock.y + py * side * 110), 10),
            radius: 10, kind: 'lantern_post',
          });
        }
        const stacks = qr.int(2, 4);
        for (let i = 0; i < stacks; i++) {
          const t = qr.range(-1.4, 1.4);
          const inland = qr.range(60, 150);
          host.doodads.push({
            pos: host.clampPos(vec(
              dock.x + px * t * 130 - Math.cos(a) * inland,
              dock.y + py * t * 130 - Math.sin(a) * inland), 16),
            radius: 16, kind: 'cargo_stack',
          });
        }
      }
    }
    if (def.port) {
      // THE FIRST PORT (once per account-run arc): finding your first harbor
      // is finding THE SEA — name it, say what the dock means, and stamp the
      // ledger (the meta hooks future shipwright/voyager unlocks read).
      // seas_found counts each named water once per run session.
      const seaName = host.seaNameOf(def);
      if (!host.ledger.first_port_found) {
        bumpLedger(host.ledger, 'first_port_found');
        host.notice(`you have found ${seaName ?? 'the sea'} — the dock casts off, the board knows the water`, '#7fd0ff', 16, 'world');
      }
      if (def.seaId && !host.seasSeen.has(def.seaId)) {
        host.seasSeen.add(def.seaId);
        bumpLedger(host.ledger, 'seas_found');
      }
    }
    // THE RIVER OF SOULS (world/soulriver.ts): finding ANY of its strewn
    // shores stamps the one ledger mark and says what the ferry means (the
    // untethered river is one river, met again — the first meeting speaks).
    if (isSoulriverId(def.id) && !host.ledger.soul_river_found) {
      bumpLedger(host.ledger, 'soul_river_found');
      host.notice('the River of Souls — board the Pale Ferry; the dead pour this way through every country of the deep', '#9fd8ec', 16, 'world');
    }
    // THE BREACH (bottom of the cave ladder): the torn way into the Underworld.
    host.breachPos = null;
    if (def.breach) {
      // clearTransitSpot: the tear must never open ON the climb-out portal or a
      // deeper mouth — stacked transitions leave one of them un-dwellable.
      const p = host.clearTransitSpot(host.clampPos(host.farPoint(360), 30));
      host.breachPos = vec(p.x, p.y);
      host.doodads.push({ pos: vec(p.x, p.y), radius: 30, kind: 'breach' });
    }
    // DIMENSION GATE DOODADS (DimensionEntry.gateDoodad): any registered
    // dimension whose entry names a gate doodad KIND turns every standing
    // doodad of that kind into a realm gate here (the Ascent's shining arch
    // at a cloud shelf's far end). Pure registry scan — no kind literals.
    // ONE exception, same registry read: a gate whose DESTINATION is the
    // zone underfoot never arms. enterDimension can only land in the
    // dimension's own gate zone, so an arch standing INSIDE that zone is a
    // door to the ground it stands on — the "Firmament inside the Firmament"
    // loop: an exit-labeled ring that recenters the player where they
    // arrived (and, planted near a fan portal, OUT-DWELLS it — realm_gate
    // 0.45s vs zone_exit 0.5s — sealing a real road out). The doodad still
    // stands (the arrival's own monument); only the crossing disarms, and
    // dimGatesView stops labeling it as a way somewhere. Heals by
    // construction: dimGates is re-derived every load, never persisted.
    host.dimGates = [];
    for (const dimId of dimensionIds()) {
      const ent = dimensionDef(dimId).entry;
      const gd = ent?.gateDoodad;
      if (!ent || !gd || ent.gate.id === def.id) continue;
      for (const d of host.doodads) {
        if (d.kind === gd) host.dimGates.push({ pos: vec(d.pos.x, d.pos.y), dimId, radius: d.radius });
      }
    }
    // Reset the boss-fight runtime + its FX HERE (before the boss-spawn block below
    // sets bossRun) — the late overlay-reset block runs AFTER the population spawn
    // and would otherwise clobber a freshly-inited bossRun.
    host.bossRun = null;
    host.arenaSinks.clear(); // per-boss collapse records are zone-transient
    host.migrantSquadId = undefined; // each zone's herd is its own squad
    host.arenaWash = null;
    host.shake = 0;
    // Snow is per-visit: frozen biomes wake already blanketed (their floor),
    // everyone else starts bare and lets the sky decide. The runtime floor
    // resets with it — whoever holds snow here (Deepwinter) re-pins on entry.
    host.snowCover = (host.zone.theme.heat ?? 0.5) <= 0.05 ? SNOW_CFG.frozenBaseline : 0;
    host.snowFloor = 0;
    host.weatherDressAcc = WEATHER_DRESS_CFG.cadenceSec; // dress reconciles on the first beat in
    host.tempGrounds = [];
    // Evaporating pools persist ON their doodads (zone memory) — harvest
    // them back into the sweep so a revisit resumes the drying mid-step.
    host.evaporating = host.doodads.filter(d => d.evap && !d.gone);
    // THE RAMPAGE FABRIC: felled state is strictly runtime — a fresh load
    // mints pristine ground from seed (the reversion guarantee's second
    // road), so the regrow sweep starts empty by construction.
    host.regrowing = [];
    host.rampageTimer = 0;
    // THE LIVING FOG (engine/fog.ts): banks gather on a SALTED copy of the
    // layout seed — fog can never advance layout/spawn rng — and roam from
    // there, transient like all ambient texture. Open-sky zones (no
    // ambientDark) also breed sky-born mist under a 'fog' weather front.
    host.fog = buildZoneFog(
      host.zone.theme.fog, host.currentZoneSeed, host.arena, host.doodads,
      new Rng((host.currentZoneSeed ^ FOG_CFG.salt) >>> 0),
      host.zone.theme.ambientDark == null);
    // THE CREEP (engine/creep.ts): ambient membrane pockets seed on their
    // OWN salted stream — like fog, creep can never advance layout/spawn
    // rng. Runtime spreaders (packages, creep-heart monsters) plant more
    // through creepEnsure(); everything here is rebuilt per visit.
    host.creep = buildZoneCreep(
      host.zone.theme.creep,
      // The aquatic flag rides along so sea-forsworn kinds (notAquatic —
      // no water waves inside the sea) are refused structurally at build.
      { ...host.arena, ...(host.zone.aquatic ? { aquatic: true } : {}) },
      new Rng((host.currentZoneSeed ^ CREEP_CFG.salt) >>> 0));
    // Advancing fronts read the land through ONE installed window (ways
    // snapshot + terrain adapter); a front-less field pays nothing for it.
    if (host.creep) host.installCreepFront(host.creep);
    // THE TRACK FABRIC (engine/tracks.ts): moving-hazard lanes. Gen-emitted
    // lanes (landmark builders — the groove already baked under them) plus
    // ZoneTheme rows; packages ensure more at runtime. Placement is pure
    // geometry — no rng, no state: rider poses derive from the synced clock.
    host.tracks = [];
    host.trackSweepAcc = 0;
    for (const spec of [...(layout.tracks ?? []), ...(host.zone.theme.tracks ?? [])]) {
      host.addTrack(spec);
    }
    // Standing contact doodads (DoodadRule.contact — bumpers): collected once;
    // swept beside the lanes.
    host.collectContactHazards();
    // THE TRAPWORKS FABRIC (engine/trapworks.ts): triggers wired to the
    // world's own hazards. Gen-emitted rows (the interiors' trap pass) plus
    // ZoneTheme rows; runtime ensures extend. Sprung state is transient —
    // the zone re-generation re-arms every mechanism (the collapse
    // transience doctrine: leave and return, the crypt has reset its teeth).
    host.trapworks = [];
    host.trapSweepAcc = 0;
    host.trapDeferred = [];
    for (const spec of [...(layout.trapworks ?? []), ...(host.zone.theme.trapworks ?? [])]) {
      host.addTrapwork(spec);
    }
    // Cave mouths: pair each cave_entrance doodad with its stable seed (pushed
    // in lock-step by stampCaveMouth). Stepping onto one descends into a cave.
    // THE MOUTH SEAT: a STORY-SEATED door (tier >= 1 — relocateDeepDoors'
    // sunken gates) keeps its EXACT seat, bounds-only — the ground-story
    // furniture push and ground confinement are the wrong frame for a door
    // standing on its own story's floor (the street-lamp law), and they
    // tore the dwell entry off the drawn door (the 264px crypt_gate
    // divergence; the relocation now guarantees an in-shape duct seat, so
    // the bounds clamp is a no-op safety). Ground mouths keep the classic
    // byte-identical clamp.
    const mouthSeat = (d: { pos: Vec2; tier?: number }): Vec2 =>
      (d.tier ?? 0) >= 1
        ? clampToBounds(vec(d.pos.x, d.pos.y), 28, host.arena)
        : host.clampPos(vec(d.pos.x, d.pos.y), 28);
    const mouths = layout.doodads.filter(d => d.kind === 'cave_entrance');
    host.caveEntrances = mouths.map((d, i) => ({
      pos: mouthSeat(d),
      seed: layout.caveSeeds[i] ?? 0,
      kind: 'cave_entrance',
      mouthTier: d.tier,
    }));
    // REGISTERED SIDEZONE entrances (data/sidezones.ts): any OTHER doodad kind
    // with a SidezoneDef is a dwell-mouth too — the cellar hatch, a package's
    // arena maw. Their pocket seed derives from the mouth's POSITION (stable:
    // the layout regenerates from a fixed def.seed), where classic caves ride
    // the stampCaveMouth caveSeeds zip. An indoorsOnly mouth resolves its home
    // roof HERE, once — mouths never move.
    for (const d of layout.doodads) {
      const sz = sidezoneOf(d.kind);
      if (d.kind === 'cave_entrance' || !sz) continue;
      const pos = mouthSeat(d);
      host.caveEntrances.push({
        pos,
        seed: hashStr(`${zoneId}:${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}`),
        kind: d.kind,
        roof: sz.indoorsOnly ? host.roofedStructureAt(pos) : null,
        mouthTier: d.tier,
      });
    }
    // THE SPAN MOUTHS (the rooted web, data/underspans.ts): pair this zone's
    // spanMouth doodads with its span MEMBERSHIPS — mouths sorted by
    // position, spans by id, zipped by ordinal (both orders deterministic per
    // layout, so the pairing is persistent geography). A paired mouth's seed
    // re-keys to the SPAN hash — parent-independent, so every member's door
    // derives the one shared pocket (`cave_<span>`). A surplus mouth stays a
    // dead gate (opens nothing, warned); a missing mouth leaves the far
    // arrival landing at the zone's own spawn instead of a doorstep.
    {
      const spanIds = [...new Set((def.underways ?? []).map(u => u.span))].sort();
      if (spanIds.length) {
        const spanMouths = host.caveEntrances
          .filter(en => sidezoneOf(en.kind)?.spanMouth)
          .sort((a, b) => (a.pos.y - b.pos.y) || (a.pos.x - b.pos.x));
        for (let i = 0; i < spanMouths.length && i < spanIds.length; i++) {
          spanMouths[i].underSpan = spanIds[i];
          spanMouths[i].seed = hashStr(spanIds[i]);
        }
        if (spanMouths.length < spanIds.length) {
          console.warn(`[underspans] zone '${zoneId}': ${spanIds.length} span membership(s), only ${spanMouths.length} mouth(s) seated`);
        }
      }
    }
    // SECRET HOLLOWS (the hollows fabric): the layout's sealed pockets. Fresh
    // per visit; the remembered opens re-carve just below (after door states),
    // once the doodads and the walk grid are both live.
    host.zoneHollows = layout.hollows ?? [];
    host.openedHollows = new Set();
    // SEALED ANNEX FACES (the growing zone): the layout's reveal records —
    // remembered + found opens replay below through the same seam.
    host.zoneAnnexSpecs = layout.annexes ?? [];
    host.caveExitGrace = false; // re-armed by the cave-return path after this returns

    host.zoneEntry = vec(entry.x, entry.y);
}

export type NativeAreaLayoutArguments=Parameters<typeof adoptNativeAreaLayout> extends [unknown,...infer A]?A:never;
