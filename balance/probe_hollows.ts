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
import { hollowShapeOf } from '../src/data/hollows';
import type { HollowSpec } from '../src/engine/levelgen';
import type { ZoneDef } from '../src/data/zones';

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

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
