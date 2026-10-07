/** Exact native load-time exit geometry and annotations. Callers own the
 * resolved graph, overlay state and source installation. This leaf preserves
 * native read/callback order; it never invents absent controller facts. */
import { clamp, vec, dist, type Vec2 } from '../core/math';
import type { ZoneDef, ZoneExitDef, ExitRoadSpec } from '../data/zones';
import type { Bounds } from '../world/shape';
import type { MapCoord } from '../world/coords';
import type { HoldfastField } from '../packages/overlays/holdfast';

export interface NativePlacedExit { pos:Vec2; to:string; defIndex:number }
export interface NativeExitPreparationHost {
  readonly zone:ZoneDef; readonly arena:Bounds; readonly exits:NativePlacedExit[];
  readonly zoneMap:Record<string,ZoneDef>; readonly caveMap:Record<string,ZoneDef>;
  readonly sim:{readonly holdfastField:Pick<HoldfastField,'infoFor'|'def'>|null};
  readonly entryFrom:string|null;
  readonly zoneMemory:ReadonlyMap<string,{procession?:{destIdx?:number}}>;
  readonly biomeFor:(at:MapCoord)=>string;
  dimensionBiomeFor(dimension:string):(at:MapCoord)=>string;
  zoneMemoryFresh(id:string):boolean;
  fieldExitPos(exit:ZoneExitDef):Vec2|null;
  pickProcessionDest(zone:ZoneDef):number|null;
}
export interface NativeExitPreparationSources {
  readonly PORTAL_EDGE_INSET:number; readonly MIN_PORTAL_SEP:number;
  readonly BIOMES:typeof import('../world/biomes').BIOMES;
  readonly TILESETS:typeof import('../data/tilesets').TILESETS;
  readonly PROCESSION_CFG:Pick<typeof import('../data/processions').PROCESSION_CFG,'road'>;
  readonly isFieldPixel:typeof import('../world/fieldRegion').isFieldPixel;
  readonly exitInside:typeof import('../world/shape').exitInside;
  readonly biomeFrontierTarget:typeof import('./worldgen').biomeFrontierTarget;
  warn(message:string):void;
}

export function nativeFieldExitPos(host:NativeExitPreparationHost,e:ZoneExitDef,sources:NativeExitPreparationSources):Vec2|null {
    const f = host.zone.field;
    if (!f) return null;
    const { w, h } = host.arena;
    const t = clamp(e.at ?? 0.5, 0.08, 0.92);
    let x: number, y: number, dx: number, dy: number;
    if (e.side === 'n') { x = w * t; y = 0; dx = 0; dy = 1; }
    else if (e.side === 's') { x = w * t; y = h; dx = 0; dy = -1; }
    else if (e.side === 'w') { x = 0; y = h * t; dx = 1; dy = 0; }
    else { x = w - 1; y = h * t; dx = -1; dy = 0; }
    const step = 24, maxI = Math.ceil(Math.max(w, h) / step);
    for (let i = 0; i < maxI; i++) {
      if (sources.isFieldPixel(f, x, y)) {
        return vec(clamp(x + dx * 80, 60, w - 60), clamp(y + dy * 80, 60, h - 60));
      }
      x += dx * step; y += dy * step;
    }
    return null;
  }

export function nativeExitPosition(host:NativeExitPreparationHost,e:ZoneExitDef,sources:NativeExitPreparationSources):Vec2 {
    const t = e.at ?? 0.5;
    const inset = sources.PORTAL_EDGE_INSET;
    const { w, h } = host.arena;
    const edge = e.side === 'n' ? vec(clamp(w * t, inset, w - inset), inset)
      : e.side === 's' ? vec(clamp(w * t, inset, w - inset), h - inset)
      : e.side === 'w' ? vec(inset, clamp(h * t, inset, h - inset))
      : vec(w - inset, clamp(h * t, inset, h - inset));
    // On an ellipse zone, pull the rect-edge portal onto the reachable rim. On a FIELD
    // zone, snap it onto the heat-map blob's edge in this direction (the expanse corners).
    const posFrac = e.posFrac;
    const pos = posFrac && Number.isFinite(posFrac.fx) && Number.isFinite(posFrac.fy)
      ? sources.exitInside(vec(clamp(w * posFrac.fx, inset, w - inset), clamp(h * posFrac.fy, inset, h - inset)), host.arena)
      : (host.zone.field && host.fieldExitPos(e)) || sources.exitInside(edge, host.arena);

  return pos;
}

export function nativeBoundaryGateFor(host:NativeExitPreparationHost,e:ZoneExitDef,sources:NativeExitPreparationSources):string|undefined {
    if (e.lock) {
      const info = host.sim.holdfastField?.infoFor(host.zone.id);
      if (info && info.lockId === e.lock) return host.sim.holdfastField?.def(info.defId)?.gate;
      return undefined; // a foreign lock (not this zone's holdfast) stays undressed
    }
    if (e.crossDim) return undefined;
    const from = host.zone.biome;
    let to: string | undefined;
    if (e.to === '?') {
      const c = sources.biomeFrontierTarget(host.zone, e.side, host.biomeFor);
      to = host.zone.dimension ? host.dimensionBiomeFor(host.zone.dimension)(c) : host.biomeFor(c);
    } else {
      to = (host.zoneMap[e.to] ?? host.caveMap[e.to])?.biome;
    }
    if (!to || to === from) return undefined;
    const fromGate = from ? sources.BIOMES[from]?.enclave?.gate : undefined;
    const toGate = sources.BIOMES[to]?.enclave?.gate;
    if (toGate && !fromGate) return toGate;
    if (fromGate && !toGate) return fromGate;
    return undefined;
  }

export function nativeMeldFor(host:NativeExitPreparationHost,e:ZoneExitDef,sources:NativeExitPreparationSources):string|undefined {
    if (e.lock || e.crossDim) return undefined;
    const from = host.zone.biome;
    let to: string | undefined;
    let toFace: string | undefined;
    if (e.to === '?') {
      const c = sources.biomeFrontierTarget(host.zone, e.side, host.biomeFor);
      to = host.zone.dimension ? host.dimensionBiomeFor(host.zone.dimension)(c) : host.biomeFor(c);
    } else {
      const n = host.zoneMap[e.to] ?? host.caveMap[e.to];
      to = n?.biome;
      toFace = n?.tileset;
    }
    if (!to || to === from) return undefined;
    // THE FACE VOICE (#50 Part B): a RESOLVED neighbor announces in its own
    // face's words when its tileset declares them (TilesetDef.meld ▷
    // BiomeInfo.meld, read off ZoneDef.tileset mint provenance). A '?'
    // frontier carries just a predicted biome — no face exists until the
    // mint rolls one — so the biome meld keeps the frontier's promise BY
    // CONSTRUCTION (toFace is assigned only on the resolved branch).
    const faceMeld = toFace ? sources.TILESETS[toFace]?.meld : undefined;
    return faceMeld ?? sources.BIOMES[to]?.meld;
  }

export function nativeExitRoadAnnotations(host:NativeExitPreparationHost,def:ZoneDef,sources:NativeExitPreparationSources):(ExitRoadSpec|undefined)[]|undefined {
    let out: (ExitRoadSpec | undefined)[] | undefined;
    const annotate = (idx: number, spec: ExitRoadSpec): void => {
      (out ??= new Array<ExitRoadSpec | undefined>(def.exits.length).fill(undefined))[idx] = spec;
    };
    // HOLDFAST: a guardian's KEPT ROAD runs to its locked gate.
    const hf = host.sim.holdfastField;
    const info = hf?.infoFor(def.id);
    const road = info?.decorRoad ? hf?.def(info.defId)?.road : undefined;
    if (info && road) {
      const idx = def.exits.findIndex(e => e.lock === info.lockId);
      if (idx >= 0) {
        const { chance: _rolledAtEnsure, ...spec } = road;
        annotate(idx, spec);
      }
    }
    // PROCESSION: the caravan's TRAVELED WAY — entry portal to the crossing,
    // carved at generation time so the land itself says where the goods are
    // headed. The destination is picked here (and pinned by the Zone Memory
    // rider), since the annotation must exist BEFORE the layout carves.
    if (def.objective.kind === 'procession') {
      const destIdx = host.pickProcessionDest(def);
      if (destIdx != null) annotate(destIdx, { ...sources.PROCESSION_CFG.road });
    }
    return out;
  }

export function nativeProcessionDestination(host:NativeExitPreparationHost,def:ZoneDef):number|null {
    const memo = !def.boundless && host.zoneMemoryFresh(def.id)
      ? host.zoneMemory.get(def.id)!.procession : undefined;
    if (memo?.destIdx !== undefined && def.exits[memo.destIdx]
      && !def.exits[memo.destIdx].lock) return memo.destIdx;
    const back = host.entryFrom ? host.exits.find(x => x.to === host.entryFrom) : undefined;
    const from = back?.pos ?? vec(host.arena.w / 2, host.arena.h / 2);
    let best: number | null = null, bd = -1;
    for (const x of host.exits) {
      const ed = def.exits[x.defIndex];
      if (!ed || ed.lock) continue;                 // never march into a sealed gate
      if (host.entryFrom && ed.to === host.entryFrom) continue; // outward, not back
      const d = dist(x.pos, from);
      if (d > bd) { bd = d; best = x.defIndex; }
    }
    return best;
  }

export function separateNativeExits(host:NativeExitPreparationHost,sources:NativeExitPreparationSources,fromIdx=1):void {
    const { w, h } = host.arena;
    const inset = 60; // stay comfortably inside the arena while sliding
    for (let i = Math.max(1, fromIdx); i < host.exits.length; i++) {
      const e = host.exits[i];
      const side = host.zone.exits[e.defIndex]?.side;
      const horiz = side === undefined || side === 'n' || side === 's'; // slide along the edge
      for (let guard = 0; guard < 24; guard++) {
        let clash: NativePlacedExit | null = null;
        for (let j = 0; j < i; j++) {
          if (dist(host.exits[j].pos, e.pos) < sources.MIN_PORTAL_SEP) { clash = host.exits[j]; break; }
        }
        if (!clash) break;
        if (guard === 0) {
          sources.warn(`[world] overlapping portals in '${host.zone.id}' `
            + `(defIndex ${clash.defIndex} vs ${e.defIndex}) — sliding the later one apart. `
            + 'The def-level spacing guard should have prevented this; trace the appender.');
        }
        const step = sources.MIN_PORTAL_SEP - dist(clash.pos, e.pos) + 8;
        const along = horiz ? e.pos.x - clash.pos.x : e.pos.y - clash.pos.y;
        const dir = along !== 0 ? Math.sign(along) : (i % 2 === 0 ? 1 : -1);
        if (horiz) e.pos.x = clamp(e.pos.x + dir * step, inset, w - inset);
        else e.pos.y = clamp(e.pos.y + dir * step, inset, h - inset);
        // Clamped back INTO the clash (a corner)? Push along the other axis too.
        if (dist(clash.pos, e.pos) < sources.MIN_PORTAL_SEP) {
          if (horiz) e.pos.y = clamp(e.pos.y + (e.pos.y >= h / 2 ? -1 : 1) * step, inset, h - inset);
          else e.pos.x = clamp(e.pos.x + (e.pos.x >= w / 2 ? -1 : 1) * step, inset, w - inset);
        }
      }
    }
  }
