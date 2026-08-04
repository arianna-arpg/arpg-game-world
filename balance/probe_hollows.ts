// ---------------------------------------------------------------------------
// ONE-OFF PROBE — the HOLLOWS FABRIC end to end on the real engine
// (engine/levelgen stampHollows + World.openHollow + data/hollows.ts):
// pockets generate sealed (non-walkable, seam-zipped), a reveal carves the
// rect to ground and furnishes it from the hollow's own seed, a passage's
// twin seams give together, the crevice shaft joins the live sidezone
// registry with a stable position-hash seed, and zone memory re-opens a
// revealed secret on re-entry (revive: structure yes, loot/ambush no).
// Run: npx tsx balance/probe_hollows.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { mintCave } from '../src/engine/worldgen';
import { GridWalkField } from '../src/world/gridWalk';
import { hollowDef, hollowDescends, hollowShapeOf } from '../src/data/hollows';
import { generateLayout } from '../src/engine/levelgen';
import type { HollowSpec } from '../src/engine/levelgen';
import type { HollowRollSpec, ZoneDef } from '../src/data/zones';
import { TILESETS } from '../src/data/tilesets';
import type { TilesetDef } from '../src/data/tilesets';
import { BIOMES } from '../src/world/biomes';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const world = makeSimWorld('warrior', 777001);
/* eslint-disable @typescript-eslint/no-explicit-any */
const w = world as any;
const homeId: string = w.zone.id;

/** Leave the current cave for home the PROBE way (a direct zone swap) and
 *  clear the cave-return machinery the real climb-out would have handled. */
const leaveToHome = (): void => {
  w.loadZone(homeId);
  w.caveReturn = null;
  w.caveStack = [];
};

/** Enter a rooms-cave with a single-kind hollow budget THROUGH THE REAL DOOR
 *  (enterSidezone — the dwell path: caveReturn, inCave, zone-memory capture
 *  all engage), pre-seeding caveMap with our tuned def under the id the
 *  sidezone mint would use. Hunts seeds until the carver placed at least one
 *  hollow (best-effort by design). */
const enterHollowCave = (kind: string, salt: number): { id: string; seed: number; specs: HollowSpec[] } | null => {
  for (let s = 0; s < 14; s++) {
    const seed = (salt + s * 7919) >>> 0;
    const id = `cave_${homeId}_${seed}`; // the classic cave_entrance id shape
    const def: ZoneDef = mintCave(w.zone, seed, id);
    def.layoutType = 'rooms';
    def.hollows = { count: [3, 3], table: { [kind]: 1 } };
    w.caveMap[id] = def;
    w.enterSidezone({ pos: { x: w.player.pos.x, y: w.player.pos.y }, seed, kind: 'cave_entrance' });
    const specs: HollowSpec[] = w.zoneHollows;
    if (w.zone.id === id && specs.length) return { id, seed, specs };
    leaveToHome();
  }
  return null;
};

/** Re-enter a previously entered probe cave through the same real door. */
const reenter = (seed: number): void => {
  w.enterSidezone({ pos: { x: w.player.pos.x, y: w.player.pos.y }, seed, kind: 'cave_entrance' });
};

const inRect = (p: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }): boolean =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const walkableAt = (x: number, y: number): boolean =>
  w.walk instanceof GridWalkField && w.walk.isWalkable(x, y);

// --- 1. A CACHE pocket: sealed → opened → furnished --------------------------
const cache = enterHollowCave('cache_hollow', 0xca11);
check('cache cave found', !!cache, cache ? `${cache.specs.length} hollow(s)` : 'no placement in 14 seeds');
if (cache) {
  const h: HollowSpec = cache.specs[0];
  const cx = h.rect.x + h.rect.w / 2, cy = h.rect.y + h.rect.h / 2;
  check('pocket sealed before reveal', !walkableAt(cx, cy));
  const seam = w.doodads.find((d: any) => d.hollow === h.id);
  check('seam doodad present and brittle', !!seam && seam.kind === 'hollow_seam');
  const before = w.doodads.length;
  w.openHollow(h.id, w.player);
  check('opened set grows', w.openedHollows.has(h.id));
  check('pocket carved walkable', walkableAt(cx, cy));
  check('seam spliced', !w.doodads.some((d: any) => d.hollow === h.id));
  const furnished = w.doodads.filter((d: any) => inRect(d.pos, h.rect));
  check('pocket furnished (pots/urn)', furnished.length >= 2 && before !== w.doodads.length,
    furnished.map((d: any) => d.kind).join(','));
  check('reveal idempotent', (w.openHollow(h.id), w.doodads.filter((d: any) => inRect(d.pos, h.rect)).length === furnished.length));

  // --- MEMORY: leave and return — the reveal survives, structure revives ----
  const furnishedKinds = furnished.map((d: any) => d.kind).sort().join(',');
  leaveToHome();
  reenter(cache.seed);
  check('memory re-opens the hollow', w.openedHollows.has(h.id));
  check('carve persists across re-entry', walkableAt(cx, cy));
  check('seam stays gone', !w.doodads.some((d: any) => d.hollow === h.id));
  const refurn = w.doodads.filter((d: any) => inRect(d.pos, h.rect)).map((d: any) => d.kind).sort().join(',');
  check('revive re-furnishes identically (own seed)', refurn === furnishedKinds, `${refurn} vs ${furnishedKinds}`);
  leaveToHome();
}

// --- 2. A CREVICE: the wall was the lid on a whole further cave --------------
const crev = enterHollowCave('crevice_hollow', 0xc4e7);
check('crevice cave found', !!crev);
if (crev) {
  const h: HollowSpec = crev.specs[0];
  w.openHollow(h.id, w.player);
  const shaft = w.doodads.find((d: any) => d.kind === 'crevice_shaft');
  check('crevice shaft revealed', !!shaft && inRect(shaft.pos, h.rect));
  const mouth1 = w.caveEntrances.find((m: any) => m.kind === 'crevice_shaft');
  check('shaft joined the live sidezone registry', !!mouth1);
  const seed1 = mouth1?.seed;
  leaveToHome();
  reenter(crev.seed);
  const mouth2 = w.caveEntrances.find((m: any) => m.kind === 'crevice_shaft');
  check('revived shaft re-registers', !!mouth2);
  check('same seed both visits → the SAME deeper cave', !!seed1 && mouth2?.seed === seed1,
    `${seed1} vs ${mouth2?.seed}`);
  // And the mint itself: one stratum deeper, face-rolled by the strata fabric.
  if (mouth2) {
    const deeperId = `cave_crevice_${crev.id}_${mouth2.seed}`;
    const deeper = mintCave(w.zone, mouth2.seed, deeperId);
    check('crevice descends one stratum', deeper.caveDepth === (w.zone.caveDepth ?? 0) + 1,
      `parent d${w.zone.caveDepth} → child d${deeper.caveDepth}`);
  }
  leaveToHome();
}

// --- 3. A PASSAGE: twin seams give together ----------------------------------
const pass = enterHollowCave('passage_hollow', 0x9a55);
check('passage cave found', !!pass);
if (pass) {
  const h: HollowSpec = pass.specs[0];
  check('passage records two seams', h.seams.length === 2 && hollowShapeOf(h.kind) === 'passage');
  const seams = w.doodads.filter((d: any) => d.hollow === h.id);
  check('both seam doodads placed', seams.length === 2);
  w.openHollow(h.id, w.player);
  check('both seams give together', !w.doodads.some((d: any) => d.hollow === h.id));
  check('corridor carved end to end',
    walkableAt(h.seams[0].x, h.seams[0].y) && walkableAt(h.seams[1].x, h.seams[1].y)
    && walkableAt(h.rect.x + h.rect.w / 2, h.rect.y + h.rect.h / 2));
  leaveToHome();
}

// --- 4. AN AMBUSH: wakes once, remembered as survivors, never re-waked -------
const amb = enterHollowCave('ambush_hollow', 0xa3b5);
check('ambush cave found', !!amb);
if (amb) {
  const h: HollowSpec = amb.specs[0];
  const enemiesBefore = w.actors.filter((a: any) => a.team === 'enemy' && !a.dead).length;
  w.openHollow(h.id, w.player);
  const woken = w.actors.filter((a: any) => a.team === 'enemy' && !a.dead && a.fromZoneGen && inRect(a.pos, h.rect));
  check('the pocket woke hungry', woken.length >= 1, `${woken.length} woken (zone had ${enemiesBefore})`);
  const totalAfterOpen = w.actors.filter((a: any) => a.team === 'enemy' && !a.dead).length;
  leaveToHome();
  reenter(amb.seed);
  const totalAfterReturn = w.actors.filter((a: any) => a.team === 'enemy' && !a.dead).length;
  check('revive never re-wakes (memory owns survivors)', totalAfterReturn <= totalAfterOpen,
    `${totalAfterReturn} after return vs ${totalAfterOpen} after open`);
  leaveToHome();
}

// --- 5-7. THE AUTHORED BUDGETS (durance + crypt author; ossuary abstains) ----
// stampHollows is GRID-ONLY, so a tileset budget is honest exactly where the
// host's own layout rolls build a GridWalkField. These sections MEASURE that
// qualification per host — run each face's real generator headless (the
// genqa call shape) with the tileset's OWN authored budget, and assert the
// walk class plus the stamping. Never assumed from the biome table alone.

/** Generate one face of a tileset headless; report walk class + hollows. */
const genFace = (
  ts: TilesetDef, layoutType: string, seed: number,
  budget: HollowRollSpec | undefined, size: { w: number; h: number },
): { grid: boolean; hollows: HollowSpec[] } => {
  const def: ZoneDef = {
    id: `probe_h_${ts.id}_${layoutType}_${seed}`, name: 'probe face', level: 8,
    size: { w: size.w, h: size.h },
    theme: ts.theme, layout: [...(ts.common ?? []), ...ts.layout],
    layoutType,
    ...(ts.layoutParams ? { layoutParams: ts.layoutParams } : {}),
    ...(budget ? { hollows: budget } : {}),
    objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    seed,
  };
  const arena = { w: size.w, h: size.h };
  const layout = generateLayout(def, arena, new Rng(seed), vec(120, arena.h / 2),
    [vec(arena.w - 120, arena.h / 2)]);
  return { grid: layout.walk instanceof GridWalkField, hollows: layout.hollows ?? [] };
};

/** Hunt seeds until a face stamps (best-effort by the fabric's own law);
 *  reports whether EVERY hunted seed built a grid + the first placed count. */
const huntFace = (ts: TilesetDef, face: string, salt: number, budget: HollowRollSpec,
  size: { w: number; h: number }): { gridEvery: boolean; placed: number } => {
  let gridEvery = true, placed = 0;
  for (let s = 0; s < 10 && !placed; s++) {
    const r = genFace(ts, face, (salt + s * 101) >>> 0, budget, size);
    gridEvery = gridEvery && r.grid;
    placed = r.hollows.length;
  }
  return { gridEvery, placed };
};

// --- 5. THE DURANCE: authored, and every biome face qualifies ----------------
// The durance biome allows dungeon/edifice only — both interiorGen grids —
// so the citadel's budget must stamp on EVERY face it can roll. A future
// CONVEX face added to the biome row fails here honestly: the budget's
// "never idles" claim would no longer hold.
{
  const ts = TILESETS.durance;
  const spec = ts?.hollows;
  check('durance authors a hollows budget', !!spec);
  if (spec) {
    check('durance table names only registered kinds',
      Object.keys(spec.table).every(k => !!hollowDef(k)), Object.keys(spec.table).join(','));
    const faces = Object.keys(BIOMES.durance?.allowedLayouts ?? {});
    check('durance biome rolls at least one face', faces.length > 0, faces.join(','));
    for (const face of faces) {
      const r = huntFace(ts, face, 0xd07a + faces.indexOf(face) * 0x2000, spec, { w: 2200, h: 1600 });
      check(`durance '${face}' face is a grid`, r.gridEvery);
      check(`durance '${face}' face stamps the authored budget`, r.placed >= 1, `${r.placed} hollow(s)`);
    }
  }
}

// --- 6. THE CRYPT: authored; the grave biome's GRID faces stamp it -----------
// The graveland is a MIXED country: plains rolls stay convex (the classic
// secret_wall beat rides `common` there), the interior rolls are native
// grids, and the mixture faces (massif/metropolis) grid via ensureGrid. The
// interior faces must stamp; the mixture faces must at least stand a grid
// (their wall mass is geometry-dependent — best-effort by the fabric's law).
{
  const ts = TILESETS.crypt;
  const spec = ts?.hollows;
  check('crypt authors a hollows budget', !!spec);
  if (spec) {
    check('crypt table names only registered kinds',
      Object.keys(spec.table).every(k => !!hollowDef(k)), Object.keys(spec.table).join(','));
    // The crevice pick DESCENDS — worldgen's sealedHollows noDeeper filter
    // keys on exactly this flag, so pin it against a silent registry drift.
    check('crypt crevice pick declares descent', hollowDescends('crevice_hollow'));
    const faces = Object.keys(BIOMES.grave?.allowedLayouts ?? {});
    for (const face of ['dungeon', 'labyrinth', 'edifice'].filter(f => faces.includes(f))) {
      const r = huntFace(ts, face, 0xc09b + faces.indexOf(face) * 0x2000, spec, { w: 2400, h: 1800 });
      check(`crypt '${face}' face is a grid`, r.gridEvery);
      check(`crypt '${face}' face stamps the authored budget`, r.placed >= 1, `${r.placed} hollow(s)`);
    }
    for (const face of ['massif', 'metropolis'].filter(f => faces.includes(f))) {
      const r = genFace(ts, face, 0xc09b, spec, { w: 2400, h: 1800 });
      check(`crypt '${face}' mixture face grids (ensureGrid)`, r.grid);
    }
    // THE TOMB LAW (data/lonecrypt.ts, 2026-08-03): every graveland zone
    // raises the sealed_grave [1,1] from `common`, so the plains face now
    // ALWAYS stands a grid — the convex-law witness this block once was
    // lives on with the ossuary (§7, the injected-budget half, which
    // proves convex ⇒ nothing recorded with a FAT budget). Pin the new
    // truth instead: the tomb grids every plains seed, and losing the
    // common row would read here as a fallen count.
    let tombGridded = 0;
    for (let s = 0; s < 10; s++) {
      const r = genFace(ts, 'plains', (0x9d41 + s * 101) >>> 0, spec, { w: 2400, h: 1800 });
      if (r.grid) tombGridded++;
    }
    check('crypt plains faces raise the sealed grave → every seed grids (the tomb law)',
      tombGridded === 10, `${tombGridded}/10 gridded`);
  }
}

// --- 7. THE OSSUARY ABSTAINS: convex everywhere, so NO budget (adjudicated) --
// Both its layout rows are plains-only (tileset caveLayouts AND the biome's
// allowedLayouts), and plains is the convex classic — even a FAT injected
// budget must record nothing. The tileset therefore authors none (inert data
// is a lie waiting to be believed); the ruling comment sits on its
// caveLayouts row. If either row ever grows a grid face, this section fails
// and the budget question re-opens.
{
  const ts = TILESETS.ossuary;
  check('ossuary authors NO budget (adjudicated abstention)', !ts?.hollows);
  const tsFaces = Object.keys(ts?.caveLayouts ?? {});
  const biomeFaces = Object.keys(BIOMES.ossuary?.allowedLayouts ?? {});
  check('ossuary faces are still plains-only',
    tsFaces.join(',') === 'plains' && biomeFaces.join(',') === 'plains',
    `tileset: ${tsFaces.join(',')} / biome: ${biomeFaces.join(',')}`);
  const fat: HollowRollSpec = { count: [3, 3], table: { cache_hollow: 1 } };
  let anyGrid = false, anyHollow = false;
  for (let s = 0; s < 6; s++) {
    const r = genFace(ts, 'plains', (0x055a + s * 101) >>> 0, fat, { w: 1600, h: 1200 });
    anyGrid = anyGrid || r.grid; anyHollow = anyHollow || r.hollows.length > 0;
  }
  check('ossuary plains face stays convex under a fat budget', !anyGrid);
  check('…and stamps nothing (the fabric cannot reach it)', !anyHollow);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
