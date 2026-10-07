/** Complete native layout seed/memory and held-city fixture preparation.
 * Keeps both native random streams, physical fixtures and failure order. */
import type { World } from './world';
import type { ZoneDef } from '../data/zones';
import type { Vec2 } from '../core/math';
import { vec, clamp, dist } from '../core/math';
import { Rng, rollSeed } from '../core/rng';
import { generateLayout } from './levelgen';
import { ZONE_MEMORY_CFG } from './zonecontents';
import { STRUCTURES } from '../data/structures';
export interface NativeLayoutGenerationHost {
  zoneMemory: World['zoneMemory'];
  time: World['time'];
  inCave: World['inCave'];
  sim: World['sim'];
  arena: World['arena'];
  exits: World['exits'];
  zoneMemoryFresh: World['zoneMemoryFresh'];
  currentZoneSeed: World['currentZoneSeed'];
  charBorn: World['charBorn'];
  charRegrowAcc: World['charRegrowAcc'];
  farPointDraws: World['farPointDraws'];
  crusadeFixtureSpecs: World['crusadeFixtureSpecs'];
  crusadeWorksAt: World['crusadeWorksAt'];
}
export function nativeZoneMemoryFresh(host:NativeLayoutGenerationHost,zoneId: string): boolean {
    const m = host.zoneMemory.get(zoneId);
    return !!m && host.time - m.savedAt < ZONE_MEMORY_CFG.ttl;
  }
export function nativeCrusadeFixtureSpecs(host:NativeLayoutGenerationHost,def: ZoneDef, entry: Vec2): { fixtures: { structure: string; x: number; y: number }[]; center: Vec2 } | null {
    if (host.inCave || def.caveDepth != null || def.special || def.objective.kind === 'safe') return null;
    const info = host.sim.crusadeField?.crusadeOn(def.id);
    if (!info?.structure || !STRUCTURES[info.structure]) return null;
    const rng = new Rng((((def.seed ?? 0) ^ 0xc205) + info.tier * 0x9e37) >>> 0);
    const { w, h } = host.arena;
    const margin = 200;
    const exitPts = host.exits.map(e => e.pos);
    const clearOf = (p: Vec2, entryClear: number, portalClear: number): boolean =>
      dist(p, entry) >= entryClear && exitPts.every(x => dist(p, x) >= portalClear);
    // The main works: the candidate FARTHEST from the entry that clears every
    // portal (fixed-count draws — a rejected candidate never shifts later
    // rolls, the findSpot discipline).
    let center = vec(w / 2, h / 2);
    let bestD = -1;
    for (let t = 0; t < 12; t++) {
      const p = vec(rng.range(margin, w - margin), rng.range(margin, h - margin));
      const d = dist(p, entry);
      if (clearOf(p, 320, 260) && d > bestD) { bestD = d; center = p; }
    }
    const fixtures: { structure: string; x: number; y: number }[] = [
      { structure: info.structure, x: center.x, y: center.y },
    ];
    const placed: Vec2[] = [vec(center.x, center.y)];
    // The town square: raised once, a street's remove from the works.
    if (info.cityFill?.square && STRUCTURES[info.cityFill.square]) {
      for (let t = 0; t < 8; t++) {
        const a = rng.range(0, Math.PI * 2);
        const p = vec(
          clamp(center.x + Math.cos(a) * rng.range(300, 420), margin, w - margin),
          clamp(center.y + Math.sin(a) * rng.range(300, 420), margin, h - margin));
        if (!clearOf(p, 260, 220) || placed.some(q => dist(p, q) < 280)) continue;
        fixtures.push({ structure: info.cityFill.square, x: p.x, y: p.y });
        placed.push(p);
        break;
      }
    }
    // The street-mix: weighted picks spread around the works.
    if (info.cityFill?.structures?.length) {
      const fills = rng.int(info.cityFill.count[0], info.cityFill.count[1]);
      const total = info.cityFill.structures.reduce((a, s) => a + s.weight, 0);
      for (let i = 0; i < fills; i++) {
        let roll = rng.range(0, total);
        let pick = info.cityFill.structures[0].structure;
        for (const s of info.cityFill.structures) { roll -= s.weight; if (roll <= 0) { pick = s.structure; break; } }
        if (!STRUCTURES[pick]) continue;
        for (let t = 0; t < 10; t++) {
          const a = rng.range(0, Math.PI * 2);
          const p = vec(
            clamp(center.x + Math.cos(a) * rng.range(260, 560), margin, w - margin),
            clamp(center.y + Math.sin(a) * rng.range(260, 560), margin, h - margin));
          if (!clearOf(p, 240, 200) || placed.some(q => dist(p, q) < 230)) continue;
          fixtures.push({ structure: pick, x: p.x, y: p.y });
          placed.push(p);
          break;
        }
      }
    }
    return { fixtures, center };
  }
export function generateNativeAreaLayout(host:NativeLayoutGenerationHost,def:ZoneDef,entry:Vec2,zoneId:string) {
    const memory = !def.boundless && host.zoneMemoryFresh(zoneId) ? host.zoneMemory.get(zoneId)! : null;
    const layoutSeed = memory?.seed ?? def.seed ?? rollSeed();
    host.currentZoneSeed = layoutSeed;
    // THE REGROWTH CYCLE's authored clock (updateCharRegrowth): remembered
    // ground keeps its age across the leaving; fresh ground is born now.
    host.charBorn = memory?.charBorn ?? host.time;
    host.charRegrowAcc = 0;
    host.farPointDraws = 0; // the seeded-fallback lane replays from the top
    const rng = new Rng(layoutSeed);
    // CRUSADE WORKS ride the REAL structure pipeline: a held zone's tier
    // structures inject as per-load fixtures (plan walls carve the walk grid,
    // gates are true doors, tower slots man, breakables live, footprints
    // reserve + hold aprons) at seats deterministic per seed + tier — never
    // stamped over portals, never ghost-geometry.
    const crusadeWorks = host.crusadeFixtureSpecs(def, entry);
    host.crusadeWorksAt = crusadeWorks ? vec(crusadeWorks.center.x, crusadeWorks.center.y) : null;
    const layout = generateLayout(def, host.arena, rng, entry, host.exits.map(e => e.pos), crusadeWorks?.fixtures);
    return {memory,layoutSeed,rng,layout};
}
