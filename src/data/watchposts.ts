// ---------------------------------------------------------------------------
// THE WATCH POST — a court ring held by a POSTED WATCHER (the ring-tenant
// registry's sentry door, beside data/massifs.ts's held_stock): three standing
// fabrics composed and ZERO new machinery —
//   · the massif fabric's occupancy draw (engine/massif.ts registerTenantKind:
//     one weighted tenant per court on the per-mass TENANT_SALT fork — the
//     table IS the occupancy law, so a ring is a watch post XOR a garrison
//     XOR a stocked yard, never a pile of independent rolls),
//   · the watch fabric's suspicion ladder (engine/watch.ts MonsterDef.watch —
//     the seated body's cone/ring/nose is the REAL WatchSpec its def wears:
//     drawn == tested arrives from the fabric, never from dress; the ladder
//     is a language, WATCH_CFG.rungs stay global, defs tune only speeds),
//   · the sentry fabric's duty posts (brain.ts PostSpec via MonsterDef.post —
//     the def-lane stamp at createMonster: every seated watcher keeps its
//     placed stand as its first-tick-anchor STATION, so idle drift, a shove
//     or a gale ends with the watch RE-FORMED at the ring, not scattered).
//
// The read: a lit stand on the court floor, one sentinel sweeping its fan
// beside the fire — ground you creep past, distract (noiseAt says WHERE,
// never WHO), snipe (pain needs no ladder — but the wound jumps it to
// SEARCHING toward you), or clear deliberately. The trio's goal (shrine /
// lair mouth / watch post): rings stop being only garrison rooms and become
// little destinations.
//
// THE BODY LAW: a watch_post row names its kin itself (params.watchers, or a
// params.detail preset below) — no patron fallback, on purpose: the garrison
// tenant is the "whoever owns the land" lane; a watch post is an AUTHORED
// posting, and a body qualifies only wearing BOTH MonsterDef.watch (the
// ladder — a gateless body here would lie about the read) and MonsterDef.post
// (the station — a drifting body here would not be a post). A row naming
// neither, or only strangers, warns once and seats nothing (the stock
// handler's honest-refusal precedent).
//
// THE ORDER LAW (the lite agreement, engine/massif.ts's tenant contract): a
// lite and a full mint must agree on WHO holds the ring — every occupancy
// draw (watcher pick, the stand, the flank, the aides) runs first, and the
// dress draws sit dead last behind the !ctx.lite gate, so the fork stream is
// byte-identical through the last body either way. The fire is dress ON TOP
// of a true watcher, never the truth itself.
//
// Debut tables are DEFERRED to data/massifs.ts (the court kinds' tenants
// rows adjudicate there); this file ships the registrant + the presets.
// Probe: balance/probe_watchers.ts rigs 12-13.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { GenCtx, DoodadKind } from '../engine/levelgen';
import { registerTenantKind, type TenantRow } from '../engine/massif';
import type { Rng } from '../core/rng';
import { MONSTERS } from './monsters';

/** One weighted body row in a watch-post table. */
export interface WatchPostBodyRow {
  /** Monster id — must wear BOTH MonsterDef.watch and MonsterDef.post. */
  id: string;
  weight: number;
}

/** A watch_post row's tailoring (TenantRow.params — inline, or by preset
 *  name via `{ detail: '<WATCH_POST_DETAILS key>' }`). */
export interface WatchPostSpec {
  /** The sentinel table — ONE weighted draw seats the post's watcher. */
  watchers: WatchPostBodyRow[];
  /** The detail beyond the lone sentinel (a drowser at the fire, a second
   *  pair of eyes): a count band drawn once, each aide its own weighted
   *  pick + a floor-checked ring seat. Absent = the sentinel stands alone. */
  aides?: { count: [number, number]; pool: WatchPostBodyRow[] };
  /** The lit stand's dress kind (default WATCH_POST_CFG.dress — the standing
   *  'brazier' fire-bowl, its light spec already registered; false = a dark
   *  post, the watcher alone). Dress only — the fan's honesty is the def's. */
  dress?: DoodadKind | false;
  dressRadius?: [number, number];
}

/** Framework dials (the MASSIF_CFG idiom — reference numbers, never magic
 *  inlined at the seat sites). */
export const WATCH_POST_CFG = {
  /** The lit stand's distance band off the court's POI seat (px): past the
   *  seat's dress standoff below, inside the floor. */
  standD: [46, 82] as [number, number],
  /** The sentinel's flank off the fire (px) — beside it, never in it. */
  watcherD: [22, 30] as [number, number],
  /** Aides ring the stand (px). */
  aideD: [26, 46] as [number, number],
  /** Floors thinner than this seat the watcher AT the POI seat, fireless —
   *  an honest small ring holds one pair of eyes and nothing else. */
  minFloorR: 64,
  /** The POI seat's dress standoff (the cache knot's own number — dress
   *  never crowds the seat's spawn/loot scatter). */
  seatStandoff: 42,
  dress: 'brazier' as DoodadKind,
  dressRadius: [11, 14] as [number, number],
};

/** Named post-detail presets — massifs rows reference these by
 *  `params: { detail: '<key>' }` so the kin tables live in ONE place (and a
 *  serialized layoutParams row carries a name, not a copy). */
export const WATCH_POST_DETAILS: Record<string, WatchPostSpec> = {
  /** THE RIM SENTINEL — the courtlands' own posted watch (ushabti_sentinel:
   *  the long-eyed sweeper the threshold rhythm already teaches between the
   *  rings) pulled INSIDE one: the kept ring whose crossing you read first. */
  rim_sentinel: {
    watchers: [{ id: 'ushabti_sentinel', weight: 1 }],
  },
  /** THE BARROW WATCH — the downs' lamplit posting: a sweeping watchman at
   *  the fire, and sometimes the off-shift drowser heaped beside it (the
   *  gorged ghoul's shut-eye ring — two postures, one glance). */
  barrow_watch: {
    watchers: [{ id: 'barrow_watchman', weight: 1 }],
    aides: { count: [0, 1], pool: [{ id: 'gorged_ghoul', weight: 1 }] },
  },
};

// --- The registrant ----------------------------------------------------------

const warned = new Set<string>();
function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[watchpost] ${msg}`);
}

/** THE BODY LAW's gate: a seat-worthy body wears watch AND post. */
function watcherStands(id: string): boolean {
  const def = MONSTERS[id];
  if (def?.watch && def.post) return true;
  warnOnce(`body:${id}`, !def
    ? `unknown monster '${id}' in a watch_post table — dropped`
    : `'${id}' is no watcher (needs BOTH MonsterDef.watch and MonsterDef.post) — dropped`);
  return false;
}

function specOf(row: TenantRow): WatchPostSpec | undefined {
  const p = row.params as (Partial<WatchPostSpec> & { detail?: string }) | undefined;
  if (p?.detail !== undefined) {
    const hit = WATCH_POST_DETAILS[p.detail];
    if (!hit) warnOnce(`detail:${p.detail}`, `unknown watch_post detail '${p.detail}' — seating nothing`);
    return hit;
  }
  if (p?.watchers?.length) return p as WatchPostSpec;
  warnOnce('row:bare', 'a watch_post row names no watchers (params.watchers or params.detail) — seating nothing');
  return undefined;
}

/** The massif fabric's private weighted pick, mirrored (rows carry weight). */
function pickW<T extends { weight: number }>(rng: Rng, rows: readonly T[]): T {
  const total = rows.reduce((a, m) => a + m.weight, 0);
  let roll = rng.range(0, total);
  for (const m of rows) { roll -= m.weight; if (roll <= 0) return m; }
  return rows[rows.length - 1];
}

/** The reservation probe (massif.ts's local idiom — circles OR rects). */
function resHits(ctx: GenCtx, x: number, y: number, r: number): boolean {
  for (const res of ctx.reserved) {
    if ('pos' in res) {
      const dx = x - res.pos.x, dy = y - res.pos.y;
      const reach = res.radius + r;
      if (dx * dx + dy * dy < reach * reach) return true;
    } else {
      const m = (res.margin ?? 0) + r;
      if (x > res.rect.x - m && x < res.rect.x + res.rect.w + m
        && y > res.rect.y - m && y < res.rect.y + res.rect.h + m) return true;
    }
  }
  return false;
}

// THE WATCH POST — seat the posting. Bodies land as landmarkSpawns rows (the
// pit-dweller lane: loadZone materializes them inside the memory-tagging
// window at their sampled cells), so the def-lane post stamp (world.ts
// createMonster: MonsterDef.post → Actor.postSpec) and the first-tick anchor
// at the placed stand make each body's STATION exactly where this handler
// stood it — displacement walks it back through the standing sentry fabric,
// and the watch gate/sweep/fan all read the def's own WatchSpec.
registerTenantKind('watch_post', (ctx, _def, grid, cm, rng, kd, row) => {
  if (!cm.interior) return;
  const spec = specOf(row);
  if (!spec) return;
  const watchers = spec.watchers.filter(r => watcherStands(r.id));
  if (!watchers.length) {
    warnOnce('table:empty', 'watch_post table holds no valid watcher — seating nothing');
    return;
  }
  const cfg = WATCH_POST_CFG;
  const seat = cm.interior;
  // The court's usable floor (the cache handler's own law).
  const floorR = cm.r * (kd.ringInner ?? 0.6) * 0.9;

  // THE STAND — the post's own spot on the floor, drawn as OCCUPANCY (lite
  // and full mints both draw it; lite only skips planting the fire on it):
  // past the seat's standoff so the dress law holds by construction, inside
  // the floor, walkable and reservation-free. No stand on a thin floor —
  // the watcher then takes the POI seat itself (reachability-guaranteed).
  let stand: Vec2 | undefined;
  if (floorR >= cfg.minFloorR) {
    for (let t = 0; t < 6 && !stand; t++) {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(cfg.standD[0],
        Math.max(cfg.standD[0] + 1, Math.min(cfg.standD[1], floorR - 16)));
      const x = seat.x + Math.cos(a) * d, y = seat.y + Math.sin(a) * d;
      if (grid.isWalkable(x, y) && !resHits(ctx, x, y, 16)) stand = vec(x, y);
    }
  }

  // THE SENTINEL — one weighted draw; it flanks the fire (falling back to
  // the stand itself, and last to the seat).
  const pick = pickW(rng, watchers);
  let wx = seat.x, wy = seat.y;
  if (stand) {
    wx = stand.x; wy = stand.y;
    for (let t = 0; t < 3; t++) {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(cfg.watcherD[0], cfg.watcherD[1]);
      const x = stand.x + Math.cos(a) * d, y = stand.y + Math.sin(a) * d;
      if (Math.hypot(x - seat.x, y - seat.y) > floorR) continue;
      if (!grid.isWalkable(x, y) || resHits(ctx, x, y, 14)) continue;
      wx = x; wy = y; break;
    }
  }
  const seats: Vec2[] = [vec(wx, wy)];
  (ctx.landmarkSpawns ??= []).push({ id: pick.id, pos: vec(wx, wy) });

  // THE AIDES — the small detail around the fire, each its own pick + a
  // floor-checked ring seat; a crowded or broken floor honestly seats fewer.
  if (spec.aides && floorR >= cfg.minFloorR) {
    const pool = spec.aides.pool.filter(r => watcherStands(r.id));
    if (pool.length) {
      const around = stand ?? seat;
      const n = rng.int(spec.aides.count[0], spec.aides.count[1]);
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < 4; t++) {
          const a = rng.range(0, Math.PI * 2);
          const d = rng.range(cfg.aideD[0], cfg.aideD[1]);
          const x = around.x + Math.cos(a) * d, y = around.y + Math.sin(a) * d;
          if (Math.hypot(x - seat.x, y - seat.y) > floorR) continue;
          if (!grid.isWalkable(x, y) || resHits(ctx, x, y, 14)) continue;
          if (seats.some(p => Math.hypot(p.x - x, p.y - y) < 20)) continue;
          const aide = pickW(rng, pool);
          seats.push(vec(x, y));
          ctx.landmarkSpawns!.push({ id: aide.id, pos: vec(x, y) });
          break;
        }
      }
    }
  }

  // THE FIRE — dress, DEAD LAST and lite-gated (the order law above): the
  // brazier plants AT the stand, read-sugar over a true watcher. It stands
  // down where a body ended up on the spot, and on standless thin floors.
  if (!ctx.lite && spec.dress !== false && stand) {
    const s = stand;
    if (!seats.some(p => Math.hypot(p.x - s.x, p.y - s.y) < 18)) {
      const rad = spec.dressRadius ?? cfg.dressRadius;
      ctx.doodads.push({
        pos: vec(s.x, s.y), radius: rng.range(rad[0], rad[1]),
        kind: spec.dress ?? cfg.dress, rot: rng.range(0, Math.PI * 2),
      });
    }
  }
});
