import { clamp } from '../core/math';
import type { Rng } from '../core/rng';
import type { Actor } from './actor';
import type { ZoneDef, PackTableEntry } from '../data/zones';
import type { FACTIONS, MONSTERS, WILDLIFE, CAVE_POOL_CFG, CAVE_POOLS } from '../data/monsters';
import type { TILESETS, CAVE_FACE_IDS } from '../data/tilesets';
import type { factionAllowed } from '../world/zonePolicy';
import type { presenceMul } from './presence';
import type { OverlayView } from '../world/overlay';
import type { WorldSim } from '../world/sim';

/** Explicit installed native providers. They remain live in classic World.
 * This is a trusted source boundary, not a capture of controllers or factories.
 * Cave sources must preserve the native packs-to-face reference relation. */
export interface NativePopulationSources {
  readonly FACTIONS: typeof FACTIONS; readonly MONSTERS: typeof MONSTERS;
  readonly WILDLIFE: typeof WILDLIFE; readonly TILESETS: typeof TILESETS;
  readonly CAVE_FACE_IDS: typeof CAVE_FACE_IDS; readonly CAVE_POOL_CFG: typeof CAVE_POOL_CFG;
  readonly CAVE_POOLS: typeof CAVE_POOLS; readonly CAVE_POOL_SALT: number;
  readonly Rng: typeof Rng; factionAllowed: typeof factionAllowed; presenceMul: typeof presenceMul;
}
export type NativePopulationSim = Pick<WorldSim, 'resolve'|'gatesFor'|'crusadeField'|'faction'|'hellWarField'|'verminfallField'>;
export interface NativePopulationHost {
  readonly actors: readonly Pick<Actor, 'team'|'dead'|'faction'>[];
  readonly player: Pick<Actor, 'level'> | undefined;
  readonly zoneMap: Readonly<Record<string, ZoneDef>>;
  readonly zone: Pick<ZoneDef, 'id'>;
  readonly time: number;
  readonly sim: NativePopulationSim;
  readonly visited: OverlayView['visited']; readonly surveyed: OverlayView['surveyed'];
  continentFor(c: {x:number;y:number}): {kind: ReturnType<OverlayView['terrain']>};
  simView(): OverlayView;
}
export interface NativeResolvedSpawn { table: PackTableEntry[]; countMul: number; inject: string[] }

export function nativeSimView(host: NativePopulationHost): OverlayView {
    const census: Record<string, number> = {};
    for (const a of host.actors) {
      if (a.team === 'enemy' && !a.dead && a.faction) {
        census[a.faction] = (census[a.faction] ?? 0) + 1;
      }
    }
    const charLevel = host.player ? host.player.level : 1;
    const allNodes = Object.values(host.zoneMap);
    const nodes: ZoneDef[] = [];
    const byId: Record<string, ZoneDef> = {};
    for (const z of allNodes) {
      if ((z.dimension ?? 'surface') !== 'surface') continue;
      nodes.push(z); byId[z.id] = z;
    }
    return {
      nodes, byId, allNodes,
      currentZoneId: host.zone.id, time: host.time, census,
      charLevel, gates: host.sim.gatesFor(charLevel), visited: host.visited,
      surveyed: host.surveyed,
      terrain: (c) => host.continentFor(c).kind,
    };
  }

export function nativeBaseTable(host: Pick<NativePopulationHost, 'sim'>, sources: NativePopulationSources, def: ZoneDef): PackTableEntry[] {
    // THE COHORT LAW: a closed-membership zone NEVER swaps its table — not
    // for a conqueror, a crusade's grip, or a hell lord's heartland. The
    // authored cohort is the population, whoever's banner flies on the map.
    if (def.cohort === 'authored') return def.packs?.table ?? [];
    // A Crusade that's TIGHTENED its grip (entrenched / converted) floods the zone
    // with its own faction, the rivals gone — the population IS the crusade's.
    const cru = host.sim.crusadeField?.crusadeOn(def.id);
    if (cru?.suppressNatives && sources.FACTIONS[cru.faction]) return sources.FACTIONS[cru.faction].table;
    const conqueror = host.sim.faction.conquerorOf(def.id);
    if (conqueror && sources.FACTIONS[conqueror]) return sources.FACTIONS[conqueror].table;
    // THE WAR BELOW: a lord's HEARTLAND (the ground around its citadel) is
    // fully the lord's — the population IS the host (the crusade's suppress-
    // natives grip, in hell's grammar). Ordinary owned ground keeps its native
    // country and takes the host as an injected contingent (affectSpawns).
    const hw = host.sim.hellWarField;
    if (hw && def.dimension === hw.dimension) {
      const st = hw.zoneWar(def.id);
      if (st?.heartland && sources.FACTIONS[st.lord.faction]) return sources.FACTIONS[st.lord.faction].table;
    }
    return def.packs?.table ?? [];
  }

export function nativeEffectiveSpawn(host: Pick<NativePopulationHost, 'sim'|'simView'>, sources: NativePopulationSources, zone: ZoneDef, base: PackTableEntry[]): NativeResolvedSpawn {
    const r = host.sim.resolve(zone, base, host.simView());
    // HARD per-biome faction deny: drop entries whose faction the zone forbids
    // (no goblins in the deep sea). Done HERE, not via spawn-bias, because the
    // bias path's degenerate guard re-adds a fully-zeroed table. Keep a non-empty
    // result — if the deny would empty the roster, fall back to the resolved table.
    const allowed = r.table.filter(e => (0, sources.factionAllowed)(sources.MONSTERS[e.id]?.faction ?? '', zone));
    const table = allowed.length ? allowed : r.table;
    // THE COHORT LAW (ZoneDef.cohort 'authored'): membership is closed —
    // injected contest/invasion rosters never stage here. The reweighs above
    // (day/night, weather, territory tilts on the AUTHORED members) stand.
    const inject = zone.cohort === 'authored' ? [] : r.injectFactions;
    return { table, countMul: clamp(r.countMul, 0.5, 2.5), inject };
  }

export function nativeWildlifeTableFor(sources: NativePopulationSources, def: ZoneDef, caveAirFor: (def:ZoneDef)=>(typeof WILDLIFE)[string]|undefined): (typeof WILDLIFE)[string]|undefined {
    if (def.fauna) return def.fauna;
    if (def.faunaProvenance) return def.faunaProvenance;
    if (def.biome !== undefined) return sources.WILDLIFE[def.biome];
    const air = caveAirFor(def);
    if (air?.length) return air;
    return sources.WILDLIFE[def.anchor ?? 'plains'] ?? sources.WILDLIFE.plains;
  }

export function nativeCaveAirFor(sources: NativePopulationSources, def: ZoneDef): (typeof WILDLIFE)[string]|undefined {
    if (def.caveDepth == null || def.seed == null || def.dimension !== undefined) return undefined;
    const face = def.packs
      ? sources.CAVE_FACE_IDS.find(id => sources.TILESETS[id]?.packs === def.packs) : undefined;
    const spec = face !== undefined ? sources.TILESETS[face]?.caveFace : undefined;
    if (face === undefined || !spec) return undefined;
    // THE THEMED BYPASS: the face's own biomes map names its country. A row
    // may be BANDED (CaveFaceBiomeRow — the caveFaceBiomeW fold's shape);
    // the bypass reads the row's own weight band-free, since it identifies
    // the face's home country, not a depth's share (rootways under the
    // garden stays themed 'garden' at every rung it serves).
    let themed: string | undefined; let best = 0;
    for (const [b, bw] of Object.entries(spec.biomes ?? {})) {
      const w = typeof bw === 'number' ? bw : bw.w;
      if (b !== '*' && w >= sources.CAVE_POOL_CFG.themedBar && w > best) { themed = b; best = w; }
    }
    if (themed !== undefined) return sources.WILDLIFE[themed];
    // THE POOL ROLL: claiming rows × strata × anchor affinity, plus the echo.
    const cands: { table?: (typeof sources.WILDLIFE)[string]; w: number }[] = [];
    for (const p of sources.CAVE_POOLS) {
      if (!p.faces.includes(face)) continue;
      const aff = p.anchors
        ? (def.anchor !== undefined && p.anchors[def.anchor] !== undefined
          ? p.anchors[def.anchor] : p.anchors['*'] ?? 1)
        : 1;
      const w = p.weight * (0, sources.presenceMul)(p.strata, def.caveDepth) * aff;
      if (w > 0) cands.push({ table: p.table, w });
    }
    if (!cands.length) return undefined;
    cands.push({ table: undefined, w: sources.CAVE_POOL_CFG.anchorEcho }); // the echo's seat
    let total = 0;
    for (const c of cands) total += c.w;
    let roll = new sources.Rng(((def.seed ^ sources.CAVE_POOL_SALT) >>> 0)).range(0, total);
    for (const c of cands) { roll -= c.w; if (roll <= 0) return c.table; }
    return cands[cands.length - 1].table;
  }

/** Called only at the original wildlife stage, after its own early gates. */
export function nativeVerminPressure(host: Pick<NativePopulationHost, 'sim'>): number {
  return host.sim.verminfallField?.townPressure() ?? 1;
}
