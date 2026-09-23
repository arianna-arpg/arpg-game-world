import assert from 'node:assert/strict';
import { expandedTown, TOWN_TIERS, townSiteAt, townStationFeatures } from '../src/data/townBuild';
import { makeAccount } from '../src/meta/account';
import { START_ZONE, ZONES } from '../src/data/zones';
import { STRUCTURES } from '../src/data/structures';
import { siteZoneExits } from '../src/engine/exitSiting';
import { PORTAL_EDGE_INSET } from '../src/engine/worldgen';
import { plannedRect, structureMaxFootprint } from '../src/engine/levelgen';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';

bootSimEngine();
let cases = 0;
for (let tier = 0; tier < TOWN_TIERS.length; tier++) {
  for (const owned of [[], ...townStationFeatures().map(f => [f]), townStationFeatures()]) {
    const account = makeAccount(); owned.forEach(f => account.features.add(f));
    for (const side of ['n', 's', 'e', 'w'] as const) for (let fraction = 1; fraction < 20; fraction++) {
      const def = expandedTown(account, ZONES[START_ZONE], tier);
      def.exits = [{ side, at: fraction / 20, to: 'crossroads' }];
      try { siteZoneExits(def); } catch (e) { throw Error(`tier=${tier}, owned=${owned}, side=${side}: ${e}`); }
      const cfg = def.exitSiting!, e = def.exits[0], { w, h } = def.size;
      const p = side === 'n' ? { x: e.at! * w, y: PORTAL_EDGE_INSET }
        : side === 's' ? { x: e.at! * w, y: h - PORTAL_EDGE_INSET }
        : side === 'w' ? { x: PORTAL_EDGE_INSET, y: e.at! * h } : { x: w - PORTAL_EDGE_INSET, y: e.at! * h };
      const laneFraction = Math.min(1, cfg.laneLength / Math.hypot(cfg.target.x - p.x, cfg.target.y - p.y));
      for (const f of def.fixtures!) {
        if (cfg.ignoreStructures!.includes(f.structure)) continue;
        const s = STRUCTURES[f.structure];
        const size = structureMaxFootprint(f.structure)!;
        const r = s.plan || s.generator ? plannedRect(f, size.w, size.h)
          : { x: f.x - size.w / 2, y: f.y - size.h / 2, ...size };
        const hx = r.w / 2, hy = r.h / 2, cx = r.x + hx, cy = r.y + hy;
        const gap = Math.hypot(Math.max(0, Math.abs(p.x - cx) - hx), Math.max(0, Math.abs(p.y - cy) - hy));
        assert.ok(gap >= cfg.fixtureClearance - 1e-6, `${tier}/${side}/${fraction}: forecourt hits ${f.structure}`);
        for (let k = 0; k <= 200; k++) {
          const q = { x: p.x + (cfg.target.x - p.x) * laneFraction * k / 200, y: p.y + (cfg.target.y - p.y) * laneFraction * k / 200 };
          assert.ok(Math.abs(q.x - cx) > hx + cfg.laneHalfWidth || Math.abs(q.y - cy) > hy + cfg.laneHalfWidth,
            `${tier}/${side}/${fraction}: lane hits ${f.structure}`);
        }
      }
      const once = JSON.stringify(def.exits); siteZoneExits(def);
      assert.equal(JSON.stringify(def.exits), once, 'reload is stable'); cases++;
    }
  }
}
// The live load must use the same positions for the exit, return arrival and
// generated terrain. Exercise every compass direction through real worlds.
for (const side of ['n', 's', 'e', 'w'] as const) for (let tier = 0; tier < TOWN_TIERS.length; tier++) {
  const w = makeSimWorld('warrior', 3344);
  townStationFeatures().slice(0, TOWN_TIERS[tier].stations).forEach(f => w.account.features.add(f));
  w.zoneMap[START_ZONE].exits = [{ side, at: 0.2, to: 'crossroads' }];
  w.loadZone(START_ZONE, 'crossroads');
  assert.equal(w.townTierIndex(), tier);
  assert.deepEqual(w.zone.exitSiting!.target, townSiteAt(tier, 'waypoint'), 'growth refreshes exit policy');
  const exit = w.exits.find(e => e.to === 'crossroads')!;
  assert.ok(exit); assert.ok(Math.abs(Math.hypot(w.player.pos.x - exit.pos.x, w.player.pos.y - exit.pos.y) - 120) < 1);
  assert.ok(w.lineOfSight(exit.pos, w.player.pos, 0, 0), 'return apron is clear');
  for (const s of w.structures) {
    const r = s.rect;
    const dx = Math.max(r.x - exit.pos.x, 0, exit.pos.x - r.x - r.w);
    const dy = Math.max(r.y - exit.pos.y, 0, exit.pos.y - r.y - r.h);
    assert.ok(Math.hypot(dx, dy) >= w.zone.exitSiting!.fixtureClearance - 1e-6, 'live building clears portal');
  }
}
// A scripted second road gets its own forecourt without moving the first.
const appended = expandedTown(makeAccount(), ZONES[START_ZONE]);
appended.exits = [{ side: 'n', to: 'crossroads' }]; siteZoneExits(appended);
const original = JSON.stringify(appended.exits[0]);
appended.exits.push({ side: 's', to: 'qa_extra' }); siteZoneExits(appended, 1);
assert.equal(JSON.stringify(appended.exits[0]), original);
appended.exitSiting!.fixtureClearance = 10000;
const failedBefore = JSON.stringify(appended.exits);
assert.throws(() => siteZoneExits(appended), /No clear/);
assert.equal(JSON.stringify(appended.exits), failedBefore, 'impossible authoring does not partially move exits');
const untouched = { ...ZONES[START_ZONE], exits: [{ side: 'w' as const, to: 'crossroads', at: 0.1 }] };
const before = JSON.stringify(untouched); siteZoneExits(untouched); assert.equal(JSON.stringify(untouched), before, 'zones must opt in');
console.log(`TOWN EXITS: ${cases} footprint/lane/reload cases, 16 live arrivals and append stability passed`);
