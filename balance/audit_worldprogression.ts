/** Reproducible road/XP observations. Packages disabled: ordinary content only.
 * XP is a partial-population budget, not a win-rate or elapsed-time claim.
 * npx tsx balance/audit_worldprogression.ts 1000 [--xp] [--walk] [--steps=120]
 * --seeds=11,20,76 selects explicit problem seeds instead of 1..count. */
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { HUB_ZONE, type ZoneDef } from '../src/data/zones';
import { PROGRESSION } from '../src/data/classes';
import { openingRoads, openingGround } from '../src/world/openingProgression';
import { escarpmentRoad } from '../src/world/escarpments';
import { coordDist } from '../src/world/coords';
import type { World } from '../src/engine/world';
import { MONSTERS } from '../src/data/monsters';

export function walkable(w: World, a: ZoneDef, b: ZoneDef): boolean {
  return (w as any).landRoute(a.map, b.map)
    && escarpmentRoad(a.map, b.map, w.sim.biomeField.fieldSeed);
}
export function reachable(w: World, cap: number, start = HUB_ZONE): ZoneDef[] {
  const seen = new Set([start]), todo = [w.zoneMap[start]];
  for (let i = 0; i < todo.length; i++) {
    for (const z of openingRoads(todo[i], w.zoneMap, (a, b) => walkable(w, a, b))) {
      if (seen.has(z.id) || z.level > cap) continue;
      seen.add(z.id); todo.push(z);
    }
  }
  return todo;
}
export function population(w: World): { bodies: number; xp: number } {
  const bodies = w.actors.filter(a => !a.dead && a.team === 'enemy' && a.xpValue > 0
    && !(a.defId && MONSTERS[a.defId]?.boss));
  return { bodies: bodies.length, xp: bodies.reduce((s, a) => s + a.xpValue, 0) };
}
const median = (ns: number[]): number => ns.sort((a, b) => a - b)[Math.floor(ns.length / 2)] ?? 0;

/** Each new zone pays once: 30% of initial ordinary enemies, one objective in
 * three. Backtracking pays zero. Real roads allow at most hero level + 1;
 * nearest unvisited choice wins. This budgets XP without simulating combat. */
export function walkProjection(w: World, limit = 24): { level: number; fresh: number; crossings: number; stuck: boolean } {
  const harvested = new Set<string>(); let crossings = 0;
  while (harvested.size < limit) {
    if (!harvested.has(w.zone.id)) {
      const p = population(w);
      harvested.add(w.zone.id);
      w.grantXp(Math.round(p.xp * .3) + (harvested.size % 3 === 0 ? 40 + 30 * w.zone.level : 0));
    }
    const paths = [[w.zone.id]], seen = new Set([w.zone.id]);
    let route: string[] | undefined;
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i], from = w.zoneMap[path[path.length - 1]];
      if (!harvested.has(from.id)) { route = path; break; }
      const choices = openingRoads(from, w.zoneMap, (a, b) => walkable(w, a, b))
        .filter(z => z.level <= w.player.level + 1)
        .sort((a, b) => coordDist(from.map, a.map) - coordDist(from.map, b.map) || a.id.localeCompare(b.id));
      for (const z of choices) if (!seen.has(z.id)) { seen.add(z.id); paths.push([...path, z.id]); }
    }
    if (!route) return { level: w.player.level, fresh: harvested.size, crossings, stuck: true };
    for (const id of route.slice(1)) {
      const door = w.exits.find(e => e.to === id);
      if (!door || w.isExitLocked(door)) throw new Error(`Projected route is sealed: ${w.zone.id} -> ${id}`);
      const from = w.zone.id;
      w.loadZone(id, from); crossings++;
    }
  }
  return { level: w.player.level, fresh: harvested.size, crossings, stuck: false };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/audit_worldprogression.ts')) {
  const count = Number(process.argv[2] ?? 100), xp = process.argv.includes('--xp'), walk = process.argv.includes('--walk');
  const explicitSeeds = process.argv.find(a=>a.startsWith('--seeds='))?.slice(8);
  const seeds = explicitSeeds ? explicitSeeds.split(',').map(Number) : Array.from({length:count},(_,i)=>i+1);
  const steps = Number(process.argv.find(a=>a.startsWith('--steps='))?.slice(8) ?? 24);
  if (!seeds.length || seeds.some(s=>!Number.isSafeInteger(s)) || !Number.isSafeInteger(steps) || steps < 1) throw new Error('Invalid seed/step arguments');
  const rows: { seed: number; one: number; four: number; choices: number; biomes: number }[] = [];
  for (const seed of seeds) {
    seedGlobalRandom(seed);
    const w = makeSimWorld('warrior', seed);
    w.loadZone(HUB_ZONE);
    const low = reachable(w, 4);
    const row = { seed, one: reachable(w, 1).length, four: low.length,
      choices: openingRoads(w.zone, w.zoneMap, (a,b) => walkable(w,a,b)).filter(z=>z.level === 1).length,
      biomes: new Set(low.map(z=>z.biome).filter(Boolean)).size };
    rows.push(row);
    if (row.one < 3 || row.four < 10 || row.choices < 2) console.log('GAP', JSON.stringify(row));
    if (walk) console.log('WALK', JSON.stringify({ seed, ...walkProjection(w,steps) }));
    if (xp) {
      // Actual ordinary generated neighbours at each band. Directed coordinates
      // seed this sample; this does not claim a walk all the way from home.
      for (const level of [1, 5, 14, 23, 45, 60, 75, 80]) {
        const at = (w as any).findBandCoord(level, seed * 1009 + level);
        const root = (w as any).questLocalAnchor(at) as ZoneDef;
        (w as any).chartNeighborsOf(root);
        (w as any).chartWithin(root.map, 550, 'surface');
        const band = reachable(w,level+2,root.id).filter(z=>Math.abs(z.level-level)<=2 && coordDist(z.map,at)<=650);
        console.log('BAND', JSON.stringify({seed,level,reachable:band.length,
          biomes:new Set(band.map(z=>z.biome)).size}));
        const sample = Object.values(w.zoneMap).filter(z => openingGround(z) && z.packs
          && Math.abs(z.level - level) <= 2 && coordDist(z.map, at) <= 320).slice(0, 3);
        for (const z of sample) {
          w.loadZone(z.id);
          console.log('XP', JSON.stringify({seed, target:level, level:z.level, biome:z.biome, kind:z.objective.kind,
            ...population(w), need:PROGRESSION.xpForLevel(level), objective:40+30*z.level}));
        }
      }
    }
  }
  console.log('SUMMARY', JSON.stringify({ seeds:seeds.length,
    one:{min:Math.min(...rows.map(r=>r.one)),median:median(rows.map(r=>r.one)),max:Math.max(...rows.map(r=>r.one))},
    four:{min:Math.min(...rows.map(r=>r.four)),median:median(rows.map(r=>r.four)),max:Math.max(...rows.map(r=>r.four))},
    biomes:{min:Math.min(...rows.map(r=>r.biomes)),median:median(rows.map(r=>r.biomes))},
    failures:rows.filter(r=>r.one<3||r.four<10||r.choices<2)}));
}
