/** Complete native encounter placement and extraction/village births. Full controllers remain required. */
import type {World} from '../engine/world';
import {clamp,vec} from '../core/math';
import {type ZoneDef} from '../data/zones';
import {type Doodad} from '../engine/levelgen';
import {Rng} from '../core/rng';
import {biomeEventDensity} from '../world/biomes';
import type {QuickeningField} from '../packages/overlays/quickening';
import {allEncounterSpecs,packageSeed} from '../packages/registry';
import {CLASSIC_EXTRACT_TEMPER,ENCOUNTER_CFG} from '../packages/encounters';
import type {ExtractSpec,ExtractTemperSpec} from '../packages/encounters';
import {gateOf} from '../packages/weighting';
import {courtLordForZone} from '../packages/courts';
import type {ActiveEncounter,BoroughRuntime} from '../engine/encounter';
import {eventTargetable} from '../world/zonePolicy';
import {extractionLookFor} from '../data/extraction';
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export interface NativeSceneEncounterBirthHost {
 inCave:World['inCave'];
 sim:World['sim'];
 player:World['player'];
 manifest:World['manifest'];
 eventDensityFor:World['eventDensityFor'];
 encRng:World['encRng'];
 clampPos:World['clampPos'];
 farPoint:World['farPoint'];
 encounters:World['encounters'];
 materializeExtractionNode:World['materializeExtractionNode'];
 materializeBorough:World['materializeBorough'];
 zone:World['zone'];
 createMonster:World['createMonster'];
 actors:World['actors'];
 doodads:World['doodads'];
 rollExtractTemper:World['rollExtractTemper'];
 findFreeSpot:World['findFreeSpot'];
 weightedPick:World['weightedPick'];
}
export function encounterBirthPlaceEncounters(host:NativeSceneEncounterBirthHost,def: ZoneDef): void {
    const o = def.objective;
    if (o.kind === 'safe' || o.kind === 'waves' || host.inCave) return;
    if (!def.packs?.table?.length) return;
    const zoneDim = def.dimension ?? 'surface';
    const gates = host.sim.gatesFor(host.player.level);
    // Roll each ACTIVE encounter package independently off its OWN package seed.
    // (Previously a single shared encRng was seeded from a hardcoded 'breach'
    // literal and `break` stopped after the first spec — which biased placement
    // and starved any later encounter package once a second one shipped.) The
    // WINNER's rng — already past its open + scale draws — becomes this.encRng, so
    // the field's later spawn pulses keep drawing from it: byte-identical when a
    // single encounter package is active.
    const winners: { def: ActiveEncounter['def']; scale: ActiveEncounter['scale']; rng: Rng }[] = [];
    for (const spec of allEncounterSpecs()) {
      const gate = gateOf(gates, spec.packageId);
      if (!gate.active) continue; // package off / below its start level → no discovery yet
      if (spec.surge) continue;   // spatial world events (Demon Invasion) place at
                                  // their epicenter, never as a random in-zone diamond
      // An encounter places only in its declared dimensions (default surface) —
      // the same seam the overlays use, so a surface package's diamonds never
      // seed in hell unless its def says so.
      if (!(spec.dimensions ?? ['surface']).includes(zoneDim)) continue;
      // …and only on its declared GROUNDS, when it declares any (the generic
      // biome allowlist — a village settles temperate country; an unbiomed
      // zone counts as outside every allowlist).
      if (spec.biomes && (!def.biome || !spec.biomes.includes(def.biome))) continue;
      if (!eventTargetable(spec.packageId, def)) continue; // biome policy + structural floor
      // EXTRACT encounters ask the overlay's SPENT LEDGER: a drained seam's
      // ground stays quiet until it replenishes (the essence-faucet guard the
      // deterministic per-zone roll needs — mycelia-suppression pattern).
      if (spec.extract && host.sim.extractionField?.nodeAvailable(def.id) === false) continue;
      // BOROUGH encounters ask theirs: settled ground (held or lost) stays
      // quiet until the country resettles.
      if (spec.borough && host.sim.boroughField?.siteAvailable(def.id) === false) continue;
      const rng = new Rng((packageSeed(host.manifest.seed, spec.packageId) ^ hashStr(def.id)) >>> 0);
      // Per-zone (encounterDensity), per-biome (eventDensityMul), and live MYCELIA
      // suppression compose onto the package pressure — a Field expanse seeds more
      // breaches; a spore-smothered zone seeds fewer (the bloom's tug-of-war).
      const densityMul = host.eventDensityFor(def);
      if (!rng.chance(clamp(ENCOUNTER_CFG.openChance * gate.ignitionMul * densityMul, 0, ENCOUNTER_CFG.openChanceCap))) continue;
      winners.push({ def: spec, scale: rng.weighted(spec.scales), rng });
    }
    if (!winners.length) return;
    // Fair, ORDER-INDEPENDENT pick among the rolled winners so registry order can
    // never let one encounter package starve another (a single winner → no draw).
    const chosen = winners.length === 1 ? winners[0]
      : winners[new Rng((host.manifest.seed ^ hashStr(def.id) ^ 0xe11c) >>> 0).int(0, winners.length - 1)];
    host.encRng = chosen.rng; // spawn pulses continue from the chosen package's stream
    const at = host.clampPos(host.farPoint(520, true), 24);
    const enc: ActiveEncounter = {
      def: chosen.def, scale: chosen.scale, pos: vec(at.x, at.y), phase: 'dormant',
      radius: chosen.scale.startRadius, timer: 0, maxTimer: 0, spawnTimer: 0,
      kills: 0, bonusUsed: 0, spawned: new Set(),
    };
    // THE COURT (def.court): roll WHICH lord themes this zone's field — its own
    // salted stream (courtLordForZone), so every existing draw above stays
    // byte-identical and the world map's marker agrees without asking us.
    if (chosen.def.court) {
      const lord = courtLordForZone(packageSeed(host.manifest.seed, chosen.def.packageId),
        def.id, chosen.def.court.lords);
      if (lord) enc.lordId = lord.id;
    }
    host.encounters.push(enc);
    // An EXTRACT encounter stands its node the moment the zone does — the seam
    // is scenery you can find, not a diamond that pops on approach.
    if (enc.def.extract) host.materializeExtractionNode(enc);
    // A BOROUGH stands its hearths + folk the same way: a place you FIND.
    if (enc.def.borough) host.materializeBorough(enc);
  }
export function encounterBirthEventDensityFor(host:NativeSceneEncounterBirthHost,def: ZoneDef): number {
    return (def.encounterDensity ?? 1) * biomeEventDensity(def.biome)
      * (host.sim.myceliaField?.suppressionAt(def.id) ?? 1)
      * (host.sim.overlayFor<QuickeningField>('quickening', def.dimension)?.eventMulAt(def.id) ?? 1);
  }
export function encounterBirthMaterializeExtractionNode(host:NativeSceneEncounterBirthHost,e: ActiveEncounter): void {
    const spec = e.def.extract!;
    const look = extractionLookFor(host.zone.biome);
    const lvl = Math.max(1, host.zone.level);
    const node = host.createMonster(look.node, lvl, 'player');
    const target = Math.round((spec.node.lifeBase + lvl * spec.node.lifePerLevel) * (e.scale.nodeLifeMul ?? 1));
    node.sheet.setSource('extract_node', [{ stat: 'life', kind: 'flat', value: Math.max(0, target - node.maxLife()) }]);
    node.life = node.maxLife();
    node.pos = vec(e.pos.x, e.pos.y);
    node.untargetable = true;   // scenery until tapped —
    node.invulnerable = true;   // — no ambient wanderer chews the prize early
    node.tag = 'extraction_node';
    node.eventKey = `extraction:${host.zone.id}`;
    host.actors.push(node);
    const well: Doodad = { pos: vec(e.pos.x, e.pos.y + 6), radius: 26, kind: look.well ?? 'marrow_well' };
    host.doodads.push(well);
    // THE TEMPER ROLL (ExtractSwarmSpec.tempers, her ask 2026-09-11): one row
    // per seam on the encounter stream — who the swarm comes for first.
    const temper = host.rollExtractTemper(spec);
    e.ex = { nodeId: node.id, well, dwellStart: 0, stood: 0, reseedAt: 0, entries: new Map(), temper: temper.id };
    // Per-biome dressing on radial bands (the runtime ring-scatter idiom).
    for (const row of look.dressing ?? []) {
      const n = host.encRng.int(row.count[0], row.count[1]);
      for (let i = 0; i < n; i++) {
        const ang = host.encRng.range(0, Math.PI * 2);
        const r = host.encRng.range(row.ring[0], row.ring[1]);
        const spot = host.findFreeSpot(vec(e.pos.x + Math.cos(ang) * r, e.pos.y + Math.sin(ang) * r), 14);
        if (spot) host.doodads.push({ pos: spot, radius: host.encRng.range(9, 14), kind: row.kind });
      }
    }
  }
export function encounterBirthMaterializeBorough(host:NativeSceneEncounterBirthHost,e: ActiveEncounter): void {
    const spec = e.def.borough!;
    const lvl = Math.max(1, host.zone.level + spec.folk.levelBonus);
    // The hearth + ring dressing (small kinds only — a runtime stamp must
    // never wall a path; the extraction ring-scatter idiom).
    host.doodads.push({ pos: vec(e.pos.x, e.pos.y + 6), radius: 18, kind: spec.site.center.kind });
    for (const row of spec.site.dressing) {
      const n = host.encRng.int(row.count[0], row.count[1]);
      for (let i = 0; i < n; i++) {
        const ang = host.encRng.range(0, Math.PI * 2);
        const r = host.encRng.range(row.ring[0], row.ring[1]);
        const spot = host.findFreeSpot(vec(e.pos.x + Math.cos(ang) * r, e.pos.y + Math.sin(ang) * r), 14);
        if (spot) host.doodads.push({ pos: spot, radius: host.encRng.range(10, 14), kind: row.kind });
      }
    }
    const bo: BoroughRuntime = {
      stage: 'muster', folkIds: [], stood: 0, reseedAt: 0, graceUntil: 0,
      entries: new Map(), quarry: new Map(), arms: new Map(),
      armDwellStart: new Map(), armAsked: new Set(),
    };
    const band = spec.folk.byScale[e.scale.id] ?? [3, 4];
    const count = host.encRng.int(band[0], band[1]);
    for (let i = 0; i < count; i++) {
      const type = host.weightedPick(spec.folk.roster, lvl);
      const f = host.createMonster(type, lvl, 'player');
      const ang = host.encRng.range(0, Math.PI * 2);
      const r = Math.sqrt(host.encRng.next()) * spec.folk.huddleRadius;
      f.pos = host.clampPos(vec(e.pos.x + Math.cos(ang) * r, e.pos.y + Math.sin(ang) * r), f.radius);
      f.tag = 'borough_huddled';
      f.untargetable = true;
      f.invulnerable = true;
      f.eventKey = `borough:${host.zone.id}`;
      bo.folkIds.push(f.id);
      host.actors.push(f);
    }
    e.bo = bo;
  }
export function encounterBirthRollExtractTemper(host:NativeSceneEncounterBirthHost,spec: ExtractSpec): ExtractTemperSpec {
    const rows = spec.swarm.tempers;
    if (!rows?.length) return CLASSIC_EXTRACT_TEMPER;
    const total = rows.reduce((s, t) => s + Math.max(0, t.weight), 0);
    let roll = host.encRng.range(0, total);
    for (const t of rows) {
      roll -= Math.max(0, t.weight);
      if (roll <= 0) return t;
    }
    return rows[rows.length - 1];
  }