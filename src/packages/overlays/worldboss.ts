// ---------------------------------------------------------------------------
// WORLD BOSS FIELD — the PRIMEVAL sovereigns: named, colossal, once-at-a-time
// world bosses riding the zone-node graph (pure overlay).
//
// One durable field runs THREE archetypes, each a distinct scenario, all data
// (WorldBossDef rows + the surge knobs — a new world boss is one def entry):
//
//   'roamer'     — the WORLD-SERPENT. It wakes, picks a CHAIN of charted zones,
//                  and slithers across the map edge by edge. Every road it
//                  crosses SEALS after a grace window (the escape beat: if you
//                  are in the zone as it passes you can slip through before
//                  the coils close), leaving a growing body drawn across the
//                  world map that BLOCKS through-travel (the engine's edge-
//                  block gate + in-zone coil walls read this field). When it
//                  reaches its rest it SETTLES: the engine mints its arena
//                  beside the rest node and the head — a multi-part composite
//                  monster — waits there. Slay it and every sealed road falls
//                  open at once. Paths are BFS-guarded: the serpent never
//                  cuts the charted graph apart (no stranding, ever).
//
//   'apparition' — the TIMED manifestation (the D4 beat). A herald warns the
//                  map with a countdown; the boss MANIFESTS in a real zone
//                  (charted or a rolled dark node — the map pin glows either
//                  way); it DEPARTS unbeaten when its stay runs out. Wounds
//                  persist across leaves (bossLifeFrac, the amalgamation arc).
//
//   'lair'       — the ENTHRONED one (the Kitava/Belial beat). A lair zone is
//                  minted onto the graph; inside, the boss is habitat-bound to
//                  its own structure and erupts from it when approached — it
//                  IS the arena's far wall. It waits forever; wounds persist.
//
// PURE of the engine: node-space state only. The engine reads wallsFor /
// passingIn / fightAt / pendingMints to materialize, and reports back through
// setBossLife / bindMint / onBossSlain. Durable: mid-arc state (a settled
// serpent, a wounded apparition, sealed roads) is a real arc — it rides the
// save under the pledge, and minted arenas are claimed via ownedZones.
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import { coordDist, type MapCoord } from '../../world/coords';
import type { WorldBulletin } from '../../world/bulletins';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5; // fixed cadence (the slow ignition roll)

export type WorldBossArchetype = 'roamer' | 'apparition' | 'lair';

/** One named world boss — a whole scenario as one data row. */
export interface WorldBossDef {
  id: string;
  /** Full display name ("Vhorun, the Sunder-Wyrm"). */
  name: string;
  archetype: WorldBossArchetype;
  /** Which world-state fields this def (default 'surface'); matched against
   *  the overlay INSTANCE's dimension, so an underworld-only sovereign is one
   *  field on the row. */
  dimension?: string;
  /** Restrict manifestation to these ZoneDef.biome ids (the encounters.ts
   *  allowlist idiom). Absent = anywhere the zone-policy floor admits. A
   *  biome-locked sovereign only enters the roll when the charted web holds
   *  ground that admits it — it never eats the roster's turn from exile. */
  biomes?: string[];
  /** The honest ask, ONE line, shown wherever the fight is pitched (the
   *  zone-info row today) — the promise may never disagree with the ground:
   *  say what cracks this body, not just that it stands here. */
  pitch?: string;
  /** The boss ROOT monster def — its hitbox silhouette rides MonsterDef.parts. */
  monster: string;
  /** Relative roll weight among sibling defs of the same archetype (default 1). */
  weight?: number;
  /** Character level before this sovereign may stir. */
  minLevel?: number;
  /** Fight level = anchor zone level + this. */
  levelBonus?: number;
  /** Map glyph + accent colour (body, markers, rings). */
  glyph: string;
  color: string;
  /** Escorting adds spawned alongside the boss (rolled from the table). */
  escort?: { table: PackTableEntry[]; count: [number, number] };
  /** ROAMER: the passing-body visual monster (driven, untargetable), the wall
   *  doodad kind its coils plug roads with, and the minted arena's name. */
  roam?: { passingMonster: string; wallKind: string; arenaName: string };
  /** LAIR: the structure doodad it is habitat-bound to + the lair zone name. */
  lair?: { structureKind: string; zoneName: string };
  /** Kill spoils paid by the kill rule on top of the ordinary boss drop path. */
  reward: { xp: number; gems: number };
}

/** The whole World Boss mechanic as data — every number a knob. */
export interface WorldBossSurge {
  roamer: {
    /** Per-STEP wake chance (× ignitionMul) once the cooldown has lapsed. */
    igniteChance: number;
    /** Serpents abroad at once (scaledCap lifts it under the crank). */
    maxConcurrent: number;
    /** Visited-node floor before the first serpent can wake (it needs ground). */
    minCharted: number;
    /** Path length in NODES (edges = len-1), rolled in range. */
    pathLen: [number, number];
    /** Seconds the head takes to cross one edge. */
    slitherSecondsPerEdge: number;
    /** Grace window per road: seconds between the head committing to a
     *  crossing and the coils SEALING it (the slip-past beat). */
    sealSeconds: number;
    /** Seconds after a slain serpent before another may wake (rolled). */
    cooldown: [number, number];
    /** In-zone coil plug geometry: segments per blocked exit, their arc
     *  distance from the portal, and each coil doodad's radius. */
    wall: { count: number; dist: number; radius: number };
  };
  apparition: {
    igniteChance: number;
    maxConcurrent: number;
    /** Herald warning before the manifestation (rolled). */
    heraldSeconds: [number, number];
    /** How long it stays before departing unbeaten (rolled). */
    staySeconds: [number, number];
    /** Chance the target is a DARK (unvisited) node — the lure into the fog. */
    unchartedChance: number;
    /** Seconds between manifestations (rolled; per departure or kill). */
    cooldown: [number, number];
  };
  lair: {
    igniteChance: number;
    maxConcurrent: number;
    /** Chance the host node is unvisited ground (discover it exploring). */
    unchartedChance: number;
    /** Seconds after a slain lair boss before another lair grows (rolled). */
    cooldown: [number, number];
  };
  /** First-stir delays per archetype (seconds from run start) so the world
   *  doesn't erupt at minute zero. */
  firstDelay: Record<WorldBossArchetype, number>;
  /** Announcement templates ({name} / {zone} / {mins} substituted). */
  announce: {
    wake: string; settle: string; roamerSlain: string;
    herald: string; manifest: string; depart: string; departWounded: string; apparitionSlain: string;
    lairSlain: string;
  };
  /** The sovereign roster. */
  defs: WorldBossDef[];
}

// --- live state (all pure JSON — it IS the snapshot) -------------------------

interface ActiveSerpent {
  id: string;
  defId: string;
  /** The node chain; edge i = path[i] → path[i+1]. */
  path: string[];
  /** Which edge the head is crossing (slither) / crossed last (settled). */
  headEdge: number;
  /** 0..1 along the current edge. */
  headT: number;
  /** Absolute time each edge's coils SEAL (stamped when the head commits to
   *  the crossing; null = untouched road). */
  edgeSealAt: (number | null)[];
  phase: 'slither' | 'settled';
  /** The minted fight zone beside the rest node (null until the engine binds). */
  arenaZoneId: string | null;
  bossLifeFrac: number;
}

interface ActiveApparition {
  id: string;
  defId: string;
  zoneId: string;
  state: 'herald' | 'manifest';
  heraldLeft: number;
  stayLeft: number;
  bossLifeFrac: number;
}

interface ActiveLair {
  id: string;
  defId: string;
  hostZoneId: string;
  /** The minted lair zone (null until the engine binds). */
  lairZoneId: string | null;
  bossLifeFrac: number;
}

/** What the engine materializes in a fight zone. */
export interface WorldBossFight {
  instanceId: string;
  def: WorldBossDef;
  archetype: WorldBossArchetype;
  bossLifeFrac: number;
  /** Apparition only: seconds before it departs (the HUD pressure). */
  stayLeft?: number;
}

/** A mint the engine owes this field (drained in World.update). */
export interface WorldBossMint {
  instanceId: string;
  kind: 'arena' | 'lair';
  anchorZoneId: string;
  def: WorldBossDef;
  zoneName: string;
}

/** A coil wall the engine raises across one exit of a zone. */
export interface WorldBossWall {
  serpentId: string;
  /** The neighbour the sealed road leads to. */
  toZoneId: string;
  /** 0..1 — how far the coils have closed (1 = sealed shut). */
  sealFrac: number;
  wallKind: string;
  color: string;
}

/** The head slithering through a zone right now (the glimpse + the visual). */
export interface WorldBossPassing {
  serpentId: string;
  def: WorldBossDef;
  /** Road it came in by (null in its wake-zone) and the one it leaves by. */
  fromZoneId: string | null;
  toZoneId: string;
  /** 0..1 across the zone. */
  frac: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const edgeKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

export class WorldBossField implements WorldOverlay {
  readonly id = 'worldboss';
  /** DURABLE: a settled serpent strangling four roads, a half-bloodied
   *  apparition, a discovered lair — every one is a real arc mid-flight, and
   *  the blockade itself is world structure. It all rides the save. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'World Bosses';
  readonly dimension?: string;

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: WorldBossSurge;
  private serpents: ActiveSerpent[] = [];
  private apparitions: ActiveApparition[] = [];
  private lairs: ActiveLair[] = [];
  private cool: Record<WorldBossArchetype, number>;
  private acc = 0;
  private seq = 0;
  private now = 0;
  private nodesById: Record<string, ZoneDef> = {};
  private pending: WorldBulletin[] = [];

  constructor(ctx: OverlayBuildCtx, surge: WorldBossSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
    this.dimension = ctx.dimension;
    this.cool = { ...surge.firstDelay };
  }

  // --- the tick ---------------------------------------------------------------

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    this.now = view.time;
    const g = this.gate();

    // 1. SERPENTS slither: the head advances edge by edge, stamping each road's
    //    seal as it commits to the crossing; reaching the last node = SETTLED.
    for (const s of this.serpents) {
      if (s.phase !== 'slither') continue;
      s.headT += dt / Math.max(1, this.cfg.roamer.slitherSecondsPerEdge);
      while (s.headT >= 1) {
        if (s.headEdge >= s.path.length - 2) {
          s.headT = 1;
          s.phase = 'settled';
          const def = this.defById(s.defId);
          const rest = this.nodesById[s.path[s.path.length - 1]];
          if (def && rest) this.say(this.cfg.announce.settle, def, rest.name);
          break;
        }
        s.headT -= 1;
        s.headEdge += 1;
        s.edgeSealAt[s.headEdge] = this.now + this.cfg.roamer.sealSeconds;
      }
    }

    // 2. APPARITIONS count down: herald → manifest → depart-unbeaten.
    const departed: ActiveApparition[] = [];
    for (const a of this.apparitions) {
      const def = this.defById(a.defId);
      const zn = this.nodesById[a.zoneId]?.name ?? 'a far place';
      if (a.state === 'herald') {
        a.heraldLeft -= dt;
        if (a.heraldLeft <= 0) {
          a.state = 'manifest';
          if (def) this.say(this.cfg.announce.manifest, def, zn);
        }
      } else {
        a.stayLeft -= dt;
        if (a.stayLeft <= 0) {
          departed.push(a);
          if (def) this.say(a.bossLifeFrac < 1 ? this.cfg.announce.departWounded : this.cfg.announce.depart, def, zn);
        }
      }
    }
    if (departed.length) {
      this.apparitions = this.apparitions.filter(a => !departed.includes(a));
      this.cool.apparition = this.rng.range(this.cfg.apparition.cooldown[0], this.cfg.apparition.cooldown[1]);
    }

    // 3. Cooldowns breathe out.
    for (const k of Object.keys(this.cool) as WorldBossArchetype[]) {
      if (this.cool[k] > 0) this.cool[k] -= dt;
    }

    // 4. STEP cadence — the slow stir rolls (gate + caps + cooldowns).
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (!g.active) continue;
      const R = this.cfg.roamer, A = this.cfg.apparition, L = this.cfg.lair;
      if (this.cool.roamer <= 0
        && this.serpents.length < scaledCap(R.maxConcurrent, g.concurrencyMul)
        && view.visited.size >= R.minCharted
        && this.rng.chance(R.igniteChance * g.ignitionMul)) {
        this.tryWakeSerpent(view);
      }
      if (this.cool.apparition <= 0
        && this.apparitions.length < scaledCap(A.maxConcurrent, g.concurrencyMul)
        && this.rng.chance(A.igniteChance * g.ignitionMul)) {
        this.tryHerald(view);
      }
      if (this.cool.lair <= 0
        && this.lairs.length < scaledCap(L.maxConcurrent, g.concurrencyMul)
        && this.rng.chance(L.igniteChance * g.ignitionMul)) {
        this.trySeedLair(view);
      }
    }
  }

  onNodeCharted(): void { /* sovereigns target existing nodes; growth just widens the pool */ }

  affectSpawns(): SpawnBias { return NO_BIAS; } // explicit spawns, never a table bias

  /** A sovereign IS something happening here (feeds the Mycelia bloom). */
  activityAt(zoneId: string): number {
    for (const s of this.serpents) {
      if (s.arenaZoneId === zoneId || s.path.includes(zoneId)) return 1;
    }
    for (const a of this.apparitions) if (a.zoneId === zoneId && a.state === 'manifest') return 1.5;
    for (const l of this.lairs) if (l.lairZoneId === zoneId || l.hostZoneId === zoneId) return 0.5;
    return 0;
  }

  // --- the map ------------------------------------------------------------------

  renderMap(): MapLayer {
    let under = '', over = '';
    for (const s of this.serpents) {
      const def = this.defById(s.defId);
      if (!def) continue;
      const pts = this.bodyPoints(s);
      if (pts.length >= 2) {
        const d = this.wavyPath(pts, s.id);
        // The body: a fat dark corridor under the roads, the scaled hide over them.
        under += `<path d="${d}" fill="none" stroke="#120d08" stroke-opacity="0.5" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`;
        over += `<path d="${d}" fill="none" stroke="${def.color}" stroke-opacity="0.85" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
        over += `<path d="${d}" fill="none" stroke="#120d08" stroke-opacity="0.75" stroke-width="8" stroke-dasharray="3 7" stroke-linecap="round"/>`;
      }
      // The head — a pulsing eye while abroad, a heavy coiled knot once settled.
      const h = this.headCoord(s);
      if (h) {
        const hx = h.x.toFixed(1), hy = h.y.toFixed(1);
        if (s.phase === 'settled') {
          over += `<circle cx="${hx}" cy="${hy}" r="11" fill="none" stroke="${def.color}" stroke-width="3" stroke-opacity="0.9"/>`
            + `<circle cx="${hx}" cy="${hy}" r="6" fill="none" stroke="${def.color}" stroke-width="2.4" stroke-opacity="0.8"/>`;
        }
        over += `<circle cx="${hx}" cy="${hy}" r="7" fill="#120d08" stroke="${def.color}" stroke-width="2.5">`
          + `<animate attributeName="r" values="6;9;6" dur="1.6s" repeatCount="indefinite"/></circle>`
          + `<circle cx="${hx}" cy="${hy}" r="2.2" fill="${def.color}"/>`;
      }
    }
    for (const a of this.apparitions) {
      const z = this.nodesById[a.zoneId];
      const def = this.defById(a.defId);
      if (!z || !def) continue;
      const x = z.map.x.toFixed(1), y = z.map.y.toFixed(1);
      const secs = Math.max(0, Math.ceil(a.state === 'herald' ? a.heraldLeft : a.stayLeft));
      const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, '0');
      if (a.state === 'herald') {
        over += `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="${def.color}" stroke-width="2" stroke-dasharray="4 4" stroke-opacity="0.85">`
          + `<animate attributeName="r" values="13;19;13" dur="2.2s" repeatCount="indefinite"/></circle>`;
      } else {
        over += `<circle cx="${x}" cy="${y}" r="15" fill="${def.color}" fill-opacity="0.16" stroke="${def.color}" stroke-width="2.6" stroke-opacity="0.95"/>`;
      }
      over += `<text x="${x}" y="${(z.map.y + 30).toFixed(1)}" text-anchor="middle" font-size="10" `
        + `fill="${def.color}" stroke="#120d08" stroke-width="2.6" paint-order="stroke">${mm}:${ss}</text>`;
    }
    for (const l of this.lairs) {
      const z = this.nodesById[l.lairZoneId ?? l.hostZoneId];
      const def = this.defById(l.defId);
      if (!z || !def) continue;
      over += `<circle cx="${z.map.x.toFixed(1)}" cy="${z.map.y.toFixed(1)}" r="14" fill="none" `
        + `stroke="${def.color}" stroke-width="1.6" stroke-opacity="0.55" stroke-dasharray="2 5"/>`;
    }
    return { under, over };
  }

  /** The traversed body extent as node coords (with the head's partial edge). */
  private bodyPoints(s: ActiveSerpent): MapCoord[] {
    const pts: MapCoord[] = [];
    for (let i = 0; i <= s.headEdge; i++) {
      const z = this.nodesById[s.path[i]];
      if (!z) return pts;
      pts.push(z.map);
    }
    const a = this.nodesById[s.path[s.headEdge]], b = this.nodesById[s.path[s.headEdge + 1]];
    if (a && b) {
      const t = s.phase === 'settled' ? 1 : clamp01(s.headT);
      pts.push({ x: a.map.x + (b.map.x - a.map.x) * t, y: a.map.y + (b.map.y - a.map.y) * t });
    }
    return pts;
  }

  /** A sinuous SVG path through the body points — the slither made visible.
   *  Deterministic per serpent (seeded by id hash), so the map never jitters. */
  private wavyPath(pts: MapCoord[], sid: string): string {
    let phase = 0;
    for (let i = 0; i < sid.length; i++) phase = (phase + sid.charCodeAt(i)) % 97;
    let d = '', dist = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const seg = coordDist(a, b);
      const steps = Math.max(2, Math.round(seg / 16));
      for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
        const t = k / steps;
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        const along = dist + seg * t;
        const nx = -(b.y - a.y) / (seg || 1), ny = (b.x - a.x) / (seg || 1);
        const amp = Math.sin(along / 14 + phase) * 6;
        const px = (x + nx * amp).toFixed(1), py = (y + ny * amp).toFixed(1);
        d += d === '' ? `M ${px} ${py}` : ` L ${px} ${py}`;
      }
      dist += seg;
    }
    return d;
  }

  /** The head's live map coordinate (lerped mid-edge while slithering). */
  headCoord(s: ActiveSerpent): MapCoord | null {
    const pts = this.bodyPoints(s);
    return pts.length ? pts[pts.length - 1] : null;
  }

  // --- accessors the engine reads -----------------------------------------------

  surge(): WorldBossSurge { return this.cfg; }

  defById(defId: string): WorldBossDef | null {
    return this.cfg.defs.find(d => d.id === defId) ?? null;
  }

  /** Is the road a→b sealed by a serpent's body? (Directionless.) */
  edgeBlocked(a: string, b: string): { serpentId: string; def: WorldBossDef } | null {
    const key = edgeKey(a, b);
    for (const s of this.serpents) {
      for (let i = 0; i < s.path.length - 1; i++) {
        const at = s.edgeSealAt[i];
        if (at == null || this.now < at) continue;
        if (edgeKey(s.path[i], s.path[i + 1]) === key) {
          const def = this.defById(s.defId);
          if (def) return { serpentId: s.id, def };
        }
      }
    }
    return null;
  }

  /** The coil walls (sealing or sealed) touching this zone — one per road. */
  wallsFor(zoneId: string): WorldBossWall[] {
    const out: WorldBossWall[] = [];
    for (const s of this.serpents) {
      const def = this.defById(s.defId);
      if (!def?.roam) continue;
      for (let i = 0; i < s.path.length - 1; i++) {
        const at = s.edgeSealAt[i];
        if (at == null) continue;
        const a = s.path[i], b = s.path[i + 1];
        if (a !== zoneId && b !== zoneId) continue;
        out.push({
          serpentId: s.id,
          toZoneId: a === zoneId ? b : a,
          sealFrac: clamp01(1 - (at - this.now) / Math.max(0.01, this.cfg.roamer.sealSeconds)),
          wallKind: def.roam.wallKind,
          color: def.color,
        });
      }
    }
    return out;
  }

  /** The head crossing THIS zone right now (spawn the passing body, offer the
   *  slip-past window). It crosses zone path[i] while traversing edge i. */
  passingIn(zoneId: string): WorldBossPassing | null {
    for (const s of this.serpents) {
      if (s.phase !== 'slither') continue;
      if (s.path[s.headEdge] !== zoneId) continue;
      const def = this.defById(s.defId);
      if (!def) continue;
      return {
        serpentId: s.id, def,
        fromZoneId: s.headEdge > 0 ? s.path[s.headEdge - 1] : null,
        toZoneId: s.path[s.headEdge + 1],
        frac: clamp01(s.headT),
      };
    }
    return null;
  }

  /** The fight that materializes in this zone (arena head / manifest / lair). */
  fightAt(zoneId: string): WorldBossFight | null {
    for (const s of this.serpents) {
      if (s.phase === 'settled' && s.arenaZoneId === zoneId) {
        const def = this.defById(s.defId);
        if (def) return { instanceId: s.id, def, archetype: 'roamer', bossLifeFrac: s.bossLifeFrac };
      }
    }
    for (const a of this.apparitions) {
      if (a.state === 'manifest' && a.zoneId === zoneId) {
        const def = this.defById(a.defId);
        if (def) return { instanceId: a.id, def, archetype: 'apparition', bossLifeFrac: a.bossLifeFrac, stayLeft: a.stayLeft };
      }
    }
    for (const l of this.lairs) {
      if (l.lairZoneId === zoneId) {
        const def = this.defById(l.defId);
        if (def) return { instanceId: l.id, def, archetype: 'lair', bossLifeFrac: l.bossLifeFrac };
      }
    }
    return null;
  }

  /** Mints the engine owes this field (settled serpents / seeded lairs without
   *  ground yet). Drained by World.update; bind with bindMint. */
  pendingMints(): WorldBossMint[] {
    const out: WorldBossMint[] = [];
    for (const s of this.serpents) {
      if (s.phase !== 'settled' || s.arenaZoneId !== null) continue;
      const def = this.defById(s.defId);
      if (def?.roam) {
        out.push({
          instanceId: s.id, kind: 'arena',
          anchorZoneId: s.path[s.path.length - 1], def, zoneName: def.roam.arenaName,
        });
      }
    }
    for (const l of this.lairs) {
      if (l.lairZoneId !== null) continue;
      const def = this.defById(l.defId);
      if (def?.lair) {
        out.push({ instanceId: l.id, kind: 'lair', anchorZoneId: l.hostZoneId, def, zoneName: def.lair.zoneName });
      }
    }
    return out;
  }

  /** The engine minted the requested zone — bind it to the instance. */
  bindMint(instanceId: string, zoneId: string): void {
    const s = this.serpents.find(x => x.id === instanceId);
    if (s) { s.arenaZoneId = zoneId; return; }
    const l = this.lairs.find(x => x.id === instanceId);
    if (l) l.lairZoneId = zoneId;
  }

  /** Engine sync: the live boss's health, preserved across leaves. */
  setBossLife(instanceId: string, frac: number): void {
    const f = clamp01(frac);
    const s = this.serpents.find(x => x.id === instanceId);
    if (s) { s.bossLifeFrac = f; return; }
    const a = this.apparitions.find(x => x.id === instanceId);
    if (a) { a.bossLifeFrac = f; return; }
    const l = this.lairs.find(x => x.id === instanceId);
    if (l) l.bossLifeFrac = f;
  }

  /** The sovereign fell. Roads open, timers clear, the cooldown breathes. */
  onBossSlain(instanceId: string): WorldBossDef | null {
    const s = this.serpents.find(x => x.id === instanceId);
    if (s) {
      this.serpents = this.serpents.filter(x => x !== s);
      this.cool.roamer = this.rng.range(this.cfg.roamer.cooldown[0], this.cfg.roamer.cooldown[1]);
      const def = this.defById(s.defId);
      if (def) this.say(this.cfg.announce.roamerSlain, def);
      return def;
    }
    const a = this.apparitions.find(x => x.id === instanceId);
    if (a) {
      this.apparitions = this.apparitions.filter(x => x !== a);
      this.cool.apparition = this.rng.range(this.cfg.apparition.cooldown[0], this.cfg.apparition.cooldown[1]);
      const def = this.defById(a.defId);
      if (def) this.say(this.cfg.announce.apparitionSlain, def, this.nodesById[a.zoneId]?.name);
      return def;
    }
    const l = this.lairs.find(x => x.id === instanceId);
    if (l) {
      this.lairs = this.lairs.filter(x => x !== l);
      this.cool.lair = this.rng.range(this.cfg.lair.cooldown[0], this.cfg.lair.cooldown[1]);
      const def = this.defById(l.defId);
      if (def) this.say(this.cfg.announce.lairSlain, def);
      return def;
    }
    return null;
  }

  /** Read-only views for markers / zone info / dev / tests. */
  peekSerpents(): ReadonlyArray<{ id: string; def: WorldBossDef; phase: string; head: MapCoord | null; restZoneId: string; arenaZoneId: string | null }> {
    return this.serpents.flatMap(s => {
      const def = this.defById(s.defId);
      return def ? [{
        id: s.id, def, phase: s.phase, head: this.headCoord(s),
        restZoneId: s.path[s.path.length - 1], arenaZoneId: s.arenaZoneId,
      }] : [];
    });
  }

  peekApparitions(): ReadonlyArray<{ id: string; def: WorldBossDef; zoneId: string; state: string; timeLeft: number }> {
    return this.apparitions.flatMap(a => {
      const def = this.defById(a.defId);
      return def ? [{
        id: a.id, def, zoneId: a.zoneId, state: a.state,
        timeLeft: a.state === 'herald' ? a.heraldLeft : a.stayLeft,
      }] : [];
    });
  }

  peekLairs(): ReadonlyArray<{ id: string; def: WorldBossDef; hostZoneId: string; lairZoneId: string | null }> {
    return this.lairs.flatMap(l => {
      const def = this.defById(l.defId);
      return def ? [{ id: l.id, def, hostZoneId: l.hostZoneId, lairZoneId: l.lairZoneId }] : [];
    });
  }

  /** World-notice drain (the bulletins registry's contract: return the new,
   *  clear the queue). */
  drainBulletins(): WorldBulletin[] {
    return this.pending.splice(0);
  }

  // --- dev seams (the QA Events tab) ---------------------------------------------

  /** DEV: wake a serpent whose path BEGINS at this zone when this zone can
   *  host one, else from the nearest eligible visited ground (the serpent is
   *  a MAP event — pressing the button in town must still produce a wyrm).
   *  A force button FORCES: the per-def level floor is waived (that gate
   *  belongs to passive ignition, not QA). */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    return this.tryWakeSerpent(view, zoneId, true);
  }

  /** DEV: manifest an apparition in THIS zone at once (herald skipped, level
   *  floor waived — a force button forces; the zone must still be eligible
   *  ground, so sanctuaries refuse like every other in-zone event button). */
  devManifest(view: OverlayView, zoneId: string, defId?: string): boolean {
    const z = view.byId[zoneId];
    if (!z || !this.targetable(z)) return false;
    // Force waives TUNING (level floors), never ELIGIBILITY: the biome lock
    // is zone policy, so both dev branches re-apply it (the Ashvein-on-the-
    // surface lesson — an explicit id needs the full natural predicate).
    const def = defId
      ? this.cfg.defs.find(d => d.id === defId && d.archetype === 'apparition'
        && (d.dimension ?? 'surface') === (this.dimension ?? 'surface')
        && this.admitsBiome(d, z)) ?? null
      : this.pickDef('apparition', Number.POSITIVE_INFINITY, d => this.admitsBiome(d, z));
    if (!def) return false;
    const a: ActiveApparition = {
      id: `wb_${this.seq++}`, defId: def.id, zoneId,
      state: 'manifest', heraldLeft: 0,
      stayLeft: this.rng.range(this.cfg.apparition.staySeconds[0], this.cfg.apparition.staySeconds[1]),
      bossLifeFrac: 1,
    };
    this.apparitions.push(a);
    this.say(this.cfg.announce.manifest, def, z.name);
    return true;
  }

  /** DEV: grow a lair anchored to THIS zone (the engine mints on its drain;
   *  level floor waived — a force button forces). */
  devLair(view: OverlayView, zoneId: string): boolean {
    const z = view.byId[zoneId];
    if (!z || !this.targetable(z)) return false;
    const def = this.pickDef('lair', Number.POSITIVE_INFINITY);
    if (!def) return false;
    this.lairs.push({ id: `wb_${this.seq++}`, defId: def.id, hostZoneId: zoneId, lairZoneId: null, bossLifeFrac: 1 });
    return true;
  }

  // --- internals -------------------------------------------------------------------

  /** Announce with {name}/{zone} substitution (drained by the bulletin source). */
  private say(template: string, def: WorldBossDef, zoneName?: string): void {
    this.pending.push({
      text: template.replace('{name}', def.name).replace('{zone}', zoneName ?? 'a far place'),
      color: def.color,
      size: 16,
    });
  }

  /** THE shared eligibility floor (zonePolicy) — one line, in lockstep with
   *  every other event. */
  private targetable(z: ZoneDef): boolean {
    return eventTargetable(this.id, z);
  }

  private pickDef(
    archetype: WorldBossArchetype, charLevel: number,
    eligible?: (d: WorldBossDef) => boolean,
  ): WorldBossDef | null {
    const pool = this.cfg.defs
      .filter(d => d.archetype === archetype
        && (d.dimension ?? 'surface') === (this.dimension ?? 'surface')
        && charLevel >= (d.minLevel ?? 1)
        && (!eligible || eligible(d)))
      .map(d => ({ def: d, weight: d.weight ?? 1 }));
    return pool.length ? this.rng.weighted(pool).def : null;
  }

  /** Does this zone's biome admit the def? (No lock = every biome does.) */
  private admitsBiome(def: WorldBossDef, z: ZoneDef): boolean {
    return !def.biomes || (z.biome != null && def.biomes.includes(z.biome));
  }

  /** A zone's charted, unlocked, in-dimension road neighbours. */
  private roadNeighbors(z: ZoneDef, view: OverlayView): string[] {
    const out: string[] = [];
    for (const e of z.exits) {
      if (e.to === '?' || e.lock || !view.byId[e.to]) continue;
      if (!out.includes(e.to)) out.push(e.to);
    }
    return out;
  }

  /** Wake a serpent: roll a def, walk a chain over VISITED eligible ground,
   *  and REFUSE any chain whose sealed roads would cut the charted graph
   *  apart (all visited nodes must stay mutually reachable). `preferStart`
   *  biases the wake to a zone (the dev button); ineligible preferred ground
   *  (a sanctuary) falls back to the whole pool. `force` waives the per-def
   *  level floor (dev only — passive ignition always passes the real level). */
  private tryWakeSerpent(view: OverlayView, preferStart?: string, force = false): boolean {
    const def = this.pickDef('roamer', force ? Number.POSITIVE_INFINITY : view.charLevel);
    if (!def?.roam) return false;
    const eligible = (id: string): boolean => {
      const z = view.byId[id];
      return !!z && view.visited.has(id) && this.targetable(z);
    };
    const pool = view.nodes.filter(z => eligible(z.id)).map(z => z.id);
    const starts = preferStart && eligible(preferStart) ? [preferStart] : pool;
    if (!starts.length) return false;

    for (let attempt = 0; attempt < 8; attempt++) {
      const start = starts[this.rng.int(0, starts.length - 1)];
      const targetLen = this.rng.int(this.cfg.roamer.pathLen[0], this.cfg.roamer.pathLen[1]);
      const path = [start];
      while (path.length < targetLen) {
        const cur = view.byId[path[path.length - 1]];
        if (!cur) break;
        const next = this.roadNeighbors(cur, view).filter(id => eligible(id) && !path.includes(id));
        if (!next.length) break;
        path.push(next[this.rng.int(0, next.length - 1)]);
      }
      if (path.length < 3) continue;
      if (!this.keepsGraphWhole(path, view)) continue;

      const s: ActiveSerpent = {
        id: `wb_${this.seq++}`, defId: def.id,
        path, headEdge: 0, headT: 0,
        edgeSealAt: path.slice(0, -1).map(() => null),
        phase: 'slither', arenaZoneId: null, bossLifeFrac: 1,
      };
      s.edgeSealAt[0] = this.now + this.cfg.roamer.sealSeconds; // it commits to the first road at once
      this.serpents.push(s);
      this.say(this.cfg.announce.wake, def, view.byId[start]?.name);
      return true;
    }
    return false;
  }

  /** Would sealing this chain's roads keep every VISITED node reachable from
   *  the player? BFS over the visited web minus the chain's edges (and minus
   *  any roads other serpents already hold). The no-stranding guarantee. */
  private keepsGraphWhole(path: string[], view: OverlayView): boolean {
    const banned = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) banned.add(edgeKey(path[i], path[i + 1]));
    for (const s of this.serpents) {
      for (let i = 0; i < s.path.length - 1; i++) banned.add(edgeKey(s.path[i], s.path[i + 1]));
    }
    const visited = [...view.visited].filter(id => view.byId[id]);
    if (visited.length <= 1) return true;
    const root = view.byId[view.currentZoneId] ? view.currentZoneId : visited[0];
    const seen = new Set<string>([root]);
    const queue = [root];
    while (queue.length) {
      const cur = queue.pop()!;
      const z = view.byId[cur];
      if (!z) continue;
      for (const e of z.exits) {
        if (e.to === '?' || e.lock || !view.byId[e.to] || seen.has(e.to)) continue;
        if (banned.has(edgeKey(cur, e.to))) continue;
        seen.add(e.to);
        queue.push(e.to);
      }
    }
    return visited.every(id => seen.has(id));
  }

  /** Herald an apparition at an eligible node (dark-node lure by config). */
  private tryHerald(view: OverlayView): boolean {
    const open = (z: ZoneDef): boolean => this.targetable(z)
      && !this.apparitions.some(a => a.zoneId === z.id)
      && !this.serpents.some(s => s.arenaZoneId === z.id)
      && !this.lairs.some(l => l.lairZoneId === z.id);
    // Biome-locked sovereigns only join the roll when admissible ground is
    // actually on the web — a karst-bound bell over a karstless chart must
    // not eat the whole roster's turn.
    const def = this.pickDef('apparition', view.charLevel,
      d => !d.biomes || view.nodes.some(z => open(z) && this.admitsBiome(d, z)));
    if (!def) return false;
    const all = view.nodes.filter(z => open(z) && this.admitsBiome(def, z));
    const seen = all.filter(z => view.visited.has(z.id));
    const dark = all.filter(z => !view.visited.has(z.id));
    const pool = (this.rng.chance(this.cfg.apparition.unchartedChance) && dark.length) ? dark
      : (seen.length ? seen : dark);
    if (!pool.length) return false;
    const z = pool[this.rng.int(0, pool.length - 1)];
    const a: ActiveApparition = {
      id: `wb_${this.seq++}`, defId: def.id, zoneId: z.id,
      state: 'herald',
      heraldLeft: this.rng.range(this.cfg.apparition.heraldSeconds[0], this.cfg.apparition.heraldSeconds[1]),
      stayLeft: this.rng.range(this.cfg.apparition.staySeconds[0], this.cfg.apparition.staySeconds[1]),
      bossLifeFrac: 1,
    };
    this.apparitions.push(a);
    const mins = Math.max(1, Math.round(a.heraldLeft / 60));
    this.pending.push({
      text: this.cfg.announce.herald
        .replace('{name}', def.name).replace('{zone}', z.name).replace('{mins}', String(mins)),
      color: def.color, size: 16,
    });
    return true;
  }

  /** Grow a lair beside an eligible node (the engine mints the zone itself). */
  private trySeedLair(view: OverlayView): boolean {
    const def = this.pickDef('lair', view.charLevel);
    if (!def?.lair) return false;
    const all = view.nodes.filter(z => this.targetable(z)
      && !this.lairs.some(l => l.hostZoneId === z.id));
    const seen = all.filter(z => view.visited.has(z.id));
    const dark = all.filter(z => !view.visited.has(z.id));
    const pool = (this.rng.chance(this.cfg.lair.unchartedChance) && dark.length) ? dark
      : (seen.length ? seen : dark);
    if (!pool.length) return false;
    const z = pool[this.rng.int(0, pool.length - 1)];
    this.lairs.push({ id: `wb_${this.seq++}`, defId: def.id, hostZoneId: z.id, lairZoneId: null, bossLifeFrac: 1 });
    return true;
  }

  // --- the pledge -------------------------------------------------------------------

  snapshot(): unknown {
    const ownedZones: string[] = [];
    for (const s of this.serpents) if (s.arenaZoneId) ownedZones.push(s.arenaZoneId);
    for (const l of this.lairs) if (l.lairZoneId) ownedZones.push(l.lairZoneId);
    return {
      ownedZones,
      serpents: this.serpents.map(s => ({ ...s, path: [...s.path], edgeSealAt: [...s.edgeSealAt] })),
      apparitions: this.apparitions.map(a => ({ ...a })),
      lairs: this.lairs.map(l => ({ ...l })),
      cool: { ...this.cool },
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const raw = snap as {
      serpents?: unknown[]; apparitions?: unknown[]; lairs?: unknown[];
      cool?: Record<string, number>; seq?: number;
    } | null;
    if (!raw || typeof raw !== 'object') return;
    const num = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? v : d);
    this.seq = Math.max(this.seq, num(raw.seq, 0));
    if (raw.cool && typeof raw.cool === 'object') {
      for (const k of ['roamer', 'apparition', 'lair'] as WorldBossArchetype[]) {
        this.cool[k] = num(raw.cool[k], this.cool[k]);
      }
    }
    if (Array.isArray(raw.serpents)) {
      this.serpents = raw.serpents.flatMap((v) => {
        const s = v as Partial<ActiveSerpent> | null;
        if (!s || typeof s.id !== 'string' || typeof s.defId !== 'string') return [];
        if (!this.defById(s.defId)?.roam) return [];
        if (!Array.isArray(s.path) || s.path.length < 3 || !s.path.every(p => typeof p === 'string')) return [];
        const edges = s.path.length - 1;
        const seals = Array.isArray(s.edgeSealAt) ? s.edgeSealAt : [];
        return [{
          id: s.id, defId: s.defId, path: [...s.path],
          headEdge: Math.min(Math.max(0, Math.floor(num(s.headEdge, 0))), edges - 1),
          headT: clamp01(num(s.headT, 0)),
          edgeSealAt: s.path.slice(0, -1).map((_, i) => {
            const v2 = seals[i];
            return typeof v2 === 'number' && isFinite(v2) ? v2 : null;
          }),
          phase: s.phase === 'settled' ? 'settled' : 'slither',
          arenaZoneId: typeof s.arenaZoneId === 'string' ? s.arenaZoneId : null,
          bossLifeFrac: clamp01(num(s.bossLifeFrac, 1)),
        } satisfies ActiveSerpent];
      });
    }
    if (Array.isArray(raw.apparitions)) {
      this.apparitions = raw.apparitions.flatMap((v) => {
        const a = v as Partial<ActiveApparition> | null;
        if (!a || typeof a.id !== 'string' || typeof a.defId !== 'string' || typeof a.zoneId !== 'string') return [];
        if (!this.defById(a.defId)) return [];
        return [{
          id: a.id, defId: a.defId, zoneId: a.zoneId,
          state: a.state === 'manifest' ? 'manifest' : 'herald',
          heraldLeft: Math.max(0, num(a.heraldLeft, 0)),
          stayLeft: Math.max(1, num(a.stayLeft, 60)),
          bossLifeFrac: clamp01(num(a.bossLifeFrac, 1)),
        } satisfies ActiveApparition];
      });
    }
    if (Array.isArray(raw.lairs)) {
      this.lairs = raw.lairs.flatMap((v) => {
        const l = v as Partial<ActiveLair> | null;
        if (!l || typeof l.id !== 'string' || typeof l.defId !== 'string' || typeof l.hostZoneId !== 'string') return [];
        if (!this.defById(l.defId)?.lair) return [];
        return [{
          id: l.id, defId: l.defId, hostZoneId: l.hostZoneId,
          lairZoneId: typeof l.lairZoneId === 'string' ? l.lairZoneId : null,
          bossLifeFrac: clamp01(num(l.bossLifeFrac, 1)),
        } satisfies ActiveLair];
      });
    }
  }

  /** Post-resume scrub: drop state whose ground the sanitizer culled. A
   *  serpent losing ANY path node loses its whole blockade (roads must heal
   *  coherently); a minted zone that vanished re-requests its mint. */
  pruneZones(has: (zoneId: string) => boolean): void {
    this.serpents = this.serpents.filter(s => s.path.every(has));
    for (const s of this.serpents) {
      if (s.arenaZoneId && !has(s.arenaZoneId)) s.arenaZoneId = null;
    }
    this.apparitions = this.apparitions.filter(a => has(a.zoneId));
    this.lairs = this.lairs.filter(l => has(l.hostZoneId));
    for (const l of this.lairs) {
      if (l.lairZoneId && !has(l.lairZoneId)) l.lairZoneId = null;
    }
  }
}
