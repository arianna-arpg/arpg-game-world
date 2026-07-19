// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE QUICKENING end to end (packages/overlays/quickening.ts +
// packages/defs/quickening.ts + the world.ts reconcile sweep + the SLAYER
// LANE folds in damage.ts). Pins:
//   - THE KNOWN-GROUND LAW: ignition seats ONLY walked, outleveled,
//     event-targetable ground — never underfoot, never unvisited/veiled,
//     never a sanctuary — and leans toward the MOST outgrown zones,
//   - THE LEVEL BAND: every surge level lands in charLevel + levelBand and
//     strictly ABOVE the zone's own level (the surge only ever raises),
//   - THE SET WINDOW: duration rolled once, run on the world clock (until
//     never moves), self-expiring, cooldown honored, maxConcurrent held,
//   - THE ENGINE RECONCILE: the stamp follows the arc in BOTH directions —
//     apply stamps ZoneDef.level + remembers baseLevel + drops zone memory;
//     fade reverts level EXACTLY and drops memory again ("exactly as it had
//     been"); the live fold accessors (eventMulAt/bountyMulAt) arm and
//     disarm with the window,
//   - THE PRESENCE: the materialize beat (ledger, once per arc), the
//     quickborn pulse onto living enemies, the SURGE ECHO staged once at
//     champion rarity + its kill row (surge_echoes_slain + the arc note),
//     the quickened_kills tally,
//   - THE SLAYER LANE: overmatch folds ONLY against higher-level victims,
//     giantsbane ONLY at/over the weight ratio, regicide ONLY against
//     empowered rarities — each an exact multiplier at the mitigation
//     chokepoint, each inert un-invested,
//   - WORLDSTATE: snapshot → JSON → restore → byte-identical re-snapshot;
//     garbage tolerated; pruneZones drops culled ground; same seed + same
//     script = byte-identical fields,
//   - THE DEF: validate() clean over live registries, the package rides the
//     registry, the kin status / echo body / weather row / dress doodads /
//     support gems / stats all resolve.
// Run: npx tsx balance/probe_quickening.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { ZoneDef } from '../src/data/zones';
import { MONSTERS } from '../src/data/monsters';
import { SUPPORTS } from '../src/data/supports';
import { PROCS } from '../src/data/procs';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { STATUS_DEFS } from '../src/engine/status';
import { STAT_DEFS, mod } from '../src/engine/stats';
import { mitigateTyped, SLAYER_CFG } from '../src/engine/damage';
import { WEATHER_DEFS } from '../src/world/weather';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate } from '../src/packages/types';
import { QuickeningField, type QuickeningSurge } from '../src/packages/overlays/quickening';
import { QUICKENING, QUICKENING_SURGE } from '../src/packages/defs/quickening';
import { PACKAGES } from '../src/packages/registry';
import { packageLookups } from '../src/world/sim';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x9c1c);

// ============================================================ the fake web
const mkZone = (id: string, level: number, x: number, y: number,
  opts: { veiled?: boolean; safe?: boolean } = {}): ZoneDef =>
  ({
    id, name: id, level, veiled: opts.veiled ?? false, map: { x, y }, exits: [],
    objective: { kind: opts.safe ? 'safe' : 'clear' },
  } as unknown as ZoneDef);

const GATE_ON: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };

const mkWeb = (zones: ZoneDef[], at: string, known: string[], charLevel = 10) => {
  const visited = new Set(known);
  const byId = Object.fromEntries(zones.map(z => [z.id, z]));
  const view = {
    nodes: zones, byId, allNodes: zones,
    terrain: () => 'land',
    currentZoneId: at,
    time: 0, census: {}, charLevel,
    gates: new Map(),
    visited, surveyed: new Set<string>(),
  } as unknown as OverlayView;
  return { view, visited };
};

/** A hot surge for the unit rigs: ignition certain, the outlevel lean
 *  cranked loud (statistics want a wide gap), mechanics untouched. */
const HOT: QuickeningSurge = {
  ...QUICKENING_SURGE,
  igniteChance: 1, firstDelaySec: 0, minCharted: 1,
  cooldown: [30, 30], holdSec: [10, 10],
  outlevelWeighPer: 2, outlevelWeighCap: 100,
  seat: { range: { min: 60, max: 500 }, prefer: 'flat' },
};
const mkField = (surge: QuickeningSurge, seed = 0x5eed): QuickeningField =>
  new QuickeningField({ seed, gate: () => GATE_ON, biomeSeed: 1 }, surge);

// ------------------------------------------------ A. the known-ground law
{
  const zones = [
    mkZone('home', 2, 0, 0),            // underfoot (inside seat min — never)
    mkZone('walked_low', 2, 80, 0),     // walked, deeply outgrown — the prime seat
    mkZone('walked_mid', 6, 0, 80),     // walked, mildly outgrown — legal
    mkZone('walked_high', 9, 160, 80),  // walked but NOT outleveled (10 - 3 < 9)
    mkZone('fresh', 2, 80, 80),         // never walked
    mkZone('veiled', 2, 160, 0, { veiled: true }), // minted ahead, unseen
    mkZone('town', 2, 0, 160, { safe: true }),     // sanctuary
  ];
  const known = ['home', 'walked_low', 'walked_mid', 'walked_high', 'town'];
  let low = 0, mid = 0, illegal = 0, raiseBreach = 0;
  const levels: number[] = [];
  for (let s = 0; s < 120; s++) {
    const f = mkField(HOT, 0x2000 + s);
    const web = mkWeb(zones, 'home', known);
    for (let i = 0; i < 6 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const arc = f.peek()[0];
    if (!arc) continue;
    if (arc.zoneId === 'walked_low') low++;
    else if (arc.zoneId === 'walked_mid') mid++;
    else illegal++;
    const ground = zones.find(z => z.id === arc.zoneId)!;
    if (arc.level <= ground.level) raiseBreach++;
    levels.push(arc.level);
  }
  check('A1: ignition seats ONLY walked, outleveled, targetable ground', illegal === 0 && low + mid >= 110,
    `${low} low, ${mid} mid, ${illegal} illegal`);
  check('A2: the seat leans toward the MOST outgrown ground', low > mid, `${low} vs ${mid}`);
  check('A3: every surge level lands in charLevel + levelBand',
    levels.every(l => l >= 10 + QUICKENING_SURGE.levelBand[0] && l <= 10 + QUICKENING_SURGE.levelBand[1]),
    `range ${Math.min(...levels)}..${Math.max(...levels)}`);
  check('A4: the band actually SPREADS (both halves rolled)',
    Math.min(...levels) <= 10 && Math.max(...levels) >= 12,
    `range ${Math.min(...levels)}..${Math.max(...levels)}`);
  check('A5: the surge only ever RAISES (level strictly above the ground\'s own)', raiseBreach === 0);
}

// ------------------------------------------------ B. the set window
{
  const zones = [mkZone('home', 2, 0, 0), mkZone('walked_low', 2, 80, 0)];
  const f = mkField(HOT, 0x77);
  const web = mkWeb(zones, 'home', ['home', 'walked_low']);
  const step = (n: number): void => { for (let i = 0; i < n; i++) { (web.view as { time: number }).time += 0.5; f.update(0.5, web.view); } };
  step(4);
  const arc = f.peek()[0];
  check('B1: the window is the rolled hold (timeLeft ≈ holdSec at birth)',
    !!arc && arc.timeLeft > 8 && arc.timeLeft <= 10.01,
    arc ? `timeLeft ${arc.timeLeft.toFixed(1)}` : 'no arc');
  const until0 = arc?.until ?? 0;
  step(6); // 3s — mid-window
  check('B2: THE SET CLOCK — nothing moves `until` once rolled',
    f.peek()[0]?.until === until0, `${f.peek()[0]?.until} vs ${until0}`);
  check('B3: maxConcurrent holds mid-window', f.activeCount() === 1);
  step(16); // past the 10s hold
  check('B4: the window closes ON the clock (self-expiry)', f.activeCount() === 0);
  // The cooldown: ignition certain, yet nothing lands until ~30s pass.
  step(40);  // 20s in — still cooling
  const early = f.activeCount();
  step(24);  // ~32s past the fade
  check('B5: the cooldown holds, then the next window lands',
    early === 0 && f.activeCount() === 1, `early ${early}, later ${f.activeCount()}`);
}

// ------------------------------------------------ C. accessors + dev seams
{
  const zones = [
    mkZone('home', 2, 0, 0), mkZone('walked_low', 2, 80, 0),
    mkZone('town', 2, 0, 160, { safe: true }), mkZone('fresh', 2, 80, 80),
  ];
  const f = mkField({ ...HOT, igniteChance: 0 }, 0x88);
  const web = mkWeb(zones, 'home', ['home', 'walked_low']);
  const step = (n: number): void => { for (let i = 0; i < n; i++) { (web.view as { time: number }).time += 0.5; f.update(0.5, web.view); } };
  step(2);
  check('C1: quiet ground folds NOTHING (muls 1, no activity)',
    f.eventMulAt('walked_low') === 1 && f.bountyMulAt('walked_low') === 1 && f.activityAt('walked_low') === 0);
  check('C2: devIgnite refuses a sanctuary (force waives tuning, never eligibility)',
    !f.devIgnite(web.view, 'town'));
  check('C3: devIgnite takes UNWALKED ground (the visited floor is tuning)',
    f.devIgnite(web.view, 'fresh'));
  check('C4: devIgnite quickens the asked zone', f.quickeningOn('fresh') !== null);
  check('C5: a live window folds its muls',
    f.eventMulAt('fresh') === QUICKENING_SURGE.eventMul
    && f.bountyMulAt('fresh') === QUICKENING_SURGE.bountyMul
    && f.activityAt('fresh') > 0);
  check('C6: the same ground never hosts two windows', !f.devIgnite(web.view, 'fresh'));
  check('C7: devFade closes the window at once', f.devFade('fresh') && (step(1), f.quickeningOn('fresh') === null));
  check('C8: devFade on quiet ground is a quiet no', !f.devFade('walked_low'));
}

// ------------------------------------------------ D. the pledge
{
  const zones = [mkZone('home', 2, 0, 0), mkZone('walked_low', 2, 80, 0), mkZone('walked_mid', 6, 0, 80)];
  const script = (f: QuickeningField): void => {
    const web = mkWeb(zones, 'home', ['home', 'walked_low', 'walked_mid']);
    for (let i = 0; i < 30; i++) { (web.view as { time: number }).time += 0.5; f.update(0.5, web.view); }
  };
  const a = mkField(HOT, 0xd07);
  const b = mkField(HOT, 0xd07);
  script(a); script(b);
  const snapA = JSON.stringify(a.snapshot());
  check('D1: same seed + same script ⇒ byte-identical snapshots', snapA === JSON.stringify(b.snapshot()));
  check('D2: the snapshot is pure JSON', snapA === JSON.stringify(JSON.parse(snapA)));
  const c = mkField(HOT, 0x999);
  c.restore(JSON.parse(snapA));
  check('D3: restore → re-snapshot reproduces the bag exactly', JSON.stringify(c.snapshot()) === snapA);
  c.restore(null); c.restore('garbage'); c.restore({ arcs: [null, 42, { id: 7 }, { id: 'x', zoneId: 'y', level: 'NaN' }] });
  check('D4: garbage restores are tolerated (rows dropped, no throw)',
    JSON.stringify(JSON.parse(JSON.stringify(c.snapshot()))).length > 0);
  const d = mkField(HOT, 0xd07);
  script(d);
  d.pruneZones(() => false);
  check('D5: a total prune drops every arc', d.activeCount() === 0 && d.peek().length === 0);
}

// ------------------------------------------------ E. the def + the registries
{
  check('E1: the package rides the registry', PACKAGES.some(p => p.id === 'quickening'));
  const problems = QUICKENING.validate?.(packageLookups()) ?? [];
  check('E2: validate() clean over the live registries', problems.length === 0, problems.join('; '));
  check('E3: the echo body resolves and wears its kill tag',
    !!QUICKENING_SURGE.echo && MONSTERS[QUICKENING_SURGE.echo.monster]?.tag === 'surge_echo');
  const kin = STATUS_DEFS[QUICKENING_SURGE.kin.status];
  check('E4: the kin mark is BENEFICIAL and outlives its pulse',
    !!kin && kin.beneficial === true && (kin.duration ?? 0) > QUICKENING_SURGE.kin.pulseSec,
    kin ? `dur ${kin.duration} vs pulse ${QUICKENING_SURGE.kin.pulseSec}` : 'missing');
  const wk = WEATHER_DEFS[QUICKENING_SURGE.weatherKind ?? ''];
  check('E5: the quickened sky is a registered eventOnly row', !!wk && wk.eventOnly === true);
  check('E6: every dress doodad resolves (the surge kit)',
    (wk?.dress?.rows ?? []).length >= 3 && (wk?.dress?.rows ?? []).every(r => !!DOODAD_VISUALS[r.doodad]));
  check('E7: the SLAYER gems ride the support registry',
    ['overmatch', 'giantsbane', 'regicide'].every(id => !!SUPPORTS[id]
      && SUPPORTS[id].mods.some(m => m.stat === id)));
  check('E8: the SLAYER stats ride the stat registry (base 0 — built, never ambient)',
    ['overmatch', 'giantsbane', 'regicide'].every(id => STAT_DEFS[id]?.base === 0));
  check('E9: the band + laws read sane',
    QUICKENING_SURGE.levelBand[0] <= QUICKENING_SURGE.levelBand[1]
    && QUICKENING_SURGE.minOutlevel >= 0 && QUICKENING_SURGE.holdSec[0] > 0
    && QUICKENING_SURGE.eventMul >= 1 && QUICKENING_SURGE.bountyMul >= 1);
  check('E10: the evade proc ceded the name (Quickstep — ids are contracts, names are presentation)',
    PROCS.quickening?.name === 'Quickstep');
}

// ------------------------------------------------ F. LIVE — the real engine
{
  const w: World = makeSimWorld('warrior', 0x9c1c2);
  const zid = w.devMintTileset('grassland', 0, 2, { seed: 424242 });
  check('F1: a grassland mint stands', !!zid, zid ?? 'null');
  const qf = w.sim.quickeningField;
  check('F2: the field rides the default manifest', !!qf);
  if (zid && qf) {
    w.player.invulnerable = true;
    // Rig reach into the engine's private seams (mint + memory + density) —
    // targeting/setup only; every assertion goes through public surfaces
    // or the stamped defs themselves.
    const wx = w as unknown as {
      createMonster(id: string, lvl: number, team: 'enemy'): Actor;
      zoneMemory: Map<string, unknown>;
      eventDensityFor(def: ZoneDef): number;
      zoneMap: Record<string, ZoneDef>;
    };
    const zdef = wx.zoneMap[zid];
    const baseLevel = zdef.level;
    const step = (secs: number, dt = 0.25): void => { for (let t = 0; t < secs; t += dt) w.update(dt); };

    // A remembered visit to drop: the surge's refresh must clear it.
    wx.zoneMemory.set(zid, { probe: true });
    const densityQuiet = wx.eventDensityFor(zdef);

    const ok = qf.devIgnite(w.devOverlayView(), zid);
    check('F3: devIgnite quickens the ground underfoot', ok);
    step(1.2);
    const info = qf.quickeningOn(zid);
    check('F4: THE STAMP — ZoneDef.level runs at the surge, the block remembers home',
      !!info && zdef.level === info.level && zdef.quickened?.key === info.id
      && zdef.quickened?.baseLevel === baseLevel,
      `level ${zdef.level} (base ${baseLevel}), key ${zdef.quickened?.key}`);
    check('F5: THE REFRESH — the zone\'s memory dropped at the surge', !wx.zoneMemory.has(zid));
    check('F6: the materialize beat stamps the Vault ledger once',
      (w.ledger.quickenings_seen ?? 0) === 1 && !!qf.quickeningOn(zid)?.seen);
    check('F7: the event-density fold arms (trouble comes looking)',
      Math.abs(wx.eventDensityFor(zdef) / densityQuiet - QUICKENING_SURGE.eventMul) < 1e-9,
      `×${(wx.eventDensityFor(zdef) / densityQuiet).toFixed(2)}`);

    // THE KIN PULSE: a living enemy wears the mark within one beat.
    const kinMob = wx.createMonster('bog_dweller', zdef.level, 'enemy');
    kinMob.pos.x = w.player.pos.x + 220; kinMob.pos.y = w.player.pos.y;
    w.actors.push(kinMob);
    step(QUICKENING_SURGE.kin.pulseSec + 1.5);
    check('F8: the kin pulse marks living enemies quickborn',
      kinMob.statuses.some(s => s.id === QUICKENING_SURGE.kin.status));

    // THE SURGE ECHO: staged once, champion-promoted, a level over the surge.
    const echo = w.actors.find(a => !a.dead && a.defId === QUICKENING_SURGE.echo?.monster);
    check('F9: the SURGE ECHO stands (staged once, champion, a level over)',
      !!echo && echo.rarity === 'champion'
      && echo.level === zdef.level + (QUICKENING_SURGE.echo?.levelBonus ?? 0)
      && !!qf.quickeningOn(zid)?.echoStaged,
      echo ? `${echo.name} L${echo.level} ${echo.rarity}` : 'missing');

    // THE GROUND'S LEDGERS: a credited kill counts; the echo pays its row.
    w.kill(kinMob, false, w.player);
    step(0.5);
    check('F10: quickened_kills tallies credited kills on quick ground',
      (w.ledger.quickened_kills ?? 0) >= 1);
    if (echo) {
      w.kill(echo, false, w.player);
      step(0.5);
      check('F11: the echo\'s fall pays its row and the arc remembers',
        (w.ledger.surge_echoes_slain ?? 0) === 1 && qf.quickeningOn(zid)?.echoDown === true);
    }

    // THE REVERT: close the window — the ground lies back down EXACTLY.
    wx.zoneMemory.set(zid, { probe: 2 });
    qf.devFade(zid);
    step(1.2);
    check('F12: THE REVERT — level restored exactly, the stamp gone',
      zdef.level === baseLevel && zdef.quickened === undefined,
      `level ${zdef.level}`);
    check('F13: the fade refresh drops the memory again (re-mint true)', !wx.zoneMemory.has(zid));
    check('F14: the folds disarm with the window',
      Math.abs(wx.eventDensityFor(zdef) - densityQuiet) < 1e-9
      && qf.bountyMulAt(zid) === 1);

    // THE SLAYER LANE at the chokepoint (fresh victims, pools zeroed so the
    // ratio reads pure): overmatch arms ONLY above, giantsbane ONLY at the
    // weight ratio, regicide ONLY against empowered blood.
    const mkVictim = (lvl: number): Actor => {
      const v = wx.createMonster('bog_dweller', lvl, 'enemy');
      v.es = 0; v.insight = 0; v.poiseBroken = true;
      return v;
    };
    const hit = (v: Actor): number => mitigateTyped(v, { physical: 60 }, { attacker: w.player });
    // Baselines FIRST (no slayer source), then arm one stat at a time — the
    // 'probe_slayer' source key REPLACES, so exactly one axis is live per
    // measurement and every ratio is exact.
    const above = mkVictim(w.player.level + 4);
    const equal = mkVictim(Math.max(1, w.player.level));
    const light = mkVictim(1);
    const heavy = mkVictim(1);
    heavy.sheet.setSource('probe_weight', [mod('weight', 'flat',
      w.player.effectiveWeight() * SLAYER_CFG.giantsbaneRatio + 5)]);
    const plain = mkVictim(1);
    const named = mkVictim(1);
    named.rarity = 'rare';
    const base = { above: hit(above), equal: hit(equal), light: hit(light), heavy: hit(heavy), plain: hit(plain), named: hit(named) };
    w.player.sheet.setSource('probe_slayer', [mod('overmatch', 'flat', 0.5)]);
    check('F15: overmatch folds ×1.5 against HIGHER-level victims only',
      Math.abs(hit(above) / base.above - 1.5) < 1e-6 && Math.abs(hit(equal) / base.equal - 1) < 1e-6,
      `above ×${(hit(above) / base.above).toFixed(3)}, equal ×${(hit(equal) / base.equal).toFixed(3)}`);
    w.player.sheet.setSource('probe_slayer', [mod('giantsbane', 'flat', 0.4)]);
    check('F16: giantsbane folds ×1.4 against far-heavier victims only',
      Math.abs(hit(heavy) / base.heavy - 1.4) < 1e-6 && Math.abs(hit(light) / base.light - 1) < 1e-6,
      `heavy ×${(hit(heavy) / base.heavy).toFixed(3)}, light ×${(hit(light) / base.light).toFixed(3)}`);
    w.player.sheet.setSource('probe_slayer', [mod('regicide', 'flat', 0.3)]);
    check('F17: regicide folds ×1.3 against empowered blood only',
      Math.abs(hit(named) / base.named - 1.3) < 1e-6 && Math.abs(hit(plain) / base.plain - 1) < 1e-6,
      `named ×${(hit(named) / base.named).toFixed(3)}, plain ×${(hit(plain) / base.plain).toFixed(3)}`);
    w.player.sheet.removeSource('probe_slayer');
  }
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
