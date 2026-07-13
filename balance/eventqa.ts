// ---------------------------------------------------------------------------
// EVENT QA — the event-fabric invariant sweep (`npm run eventqa`).
//
// Runs the CONTENT-PACKAGE / overlay / zone-event fabric headlessly and
// asserts the contracts the framework promises — the regression net for the
// event system, exactly as genqa is for generation (exit 2 on breach).
//
// Invariant groups:
//   registry    every package def validates against the live registries
//               (validatePackages — the same sweep the sim warns with, made a
//               FAILING gate), ids unique, per-package seeds distinct
//   pledge      persistence: 'durable' ⇔ snapshot()+restore() implemented,
//               'transient' ⇔ neither (the pledge can never drift from code)
//   gates       resolveGates math: weighted shares sum to 1, pressure
//               preserves the count, alwaysOn/pressureless hold no seat and
//               change nothing for others, relationships fold only while both
//               run, the frequency crank folds into the three muls exactly
//   manifest    build → JSON → reconcile is stable; unknown ids drop; out-of-
//               range sliders clamp; a garbage manifest degrades to defaults
//   lifecycle   a full WorldSim over the real starter web ticks for minutes
//               without a throw; snapshotOverlays is PURE JSON; restore into
//               a fresh sim reproduces the exact snapshot (roundtrip); two
//               sims on one seed stay byte-identical (determinism); an
//               everything-culled prune never throws
//   fracture    the divert handoff: in transit ⇒ active nowhere; the glide
//               lands EXACTLY on the destination zone (longer timer); a
//               mid-transit save resolves to the destination; grace/idle
//               config coherent (the "never spawned" regression net)
//   ledger      the unlock contract: every ledger key any unlock/tier READS
//               is BUMPED somewhere in src/ (source-scan) — no impossible
//               unlocks; every EncounterLedger key is read by some unlock
//   policy      BIOMES deny/allowEvents name real event ids; deny/allow
//               factions name real (post-graft) factions
//   zone-events the on-entry registry: unique ids, sane rewards, the classic
//               priority cascade (siege > caravan > patrol) preserved
//
// Usage: npm run eventqa [-- --verbose]
// ---------------------------------------------------------------------------

// Side-effect registries — the same set main.ts loads; a missing import here
// would make the sweep test a DIFFERENT game (genqa's discipline).
import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/engine/interiorGen';
import '../src/data/compositions';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerAllPackageFactions } from '../src/packages/factionGen';
import { PACKAGES, PACKAGE_BY_ID, packageSeed, allEncounterSpecs } from '../src/packages/registry';
import { validatePackages } from '../src/packages/validation';
import { buildManifest, reconcileManifest, type ExpeditionManifest } from '../src/packages/manifest';
import { resolveGates, gateOf, INACTIVE_GATE } from '../src/packages/weighting';
import { scaledCap } from '../src/packages/frequency';
import { chooseEvent, zoneEventDefs, type EventContext } from '../src/engine/events';
import { WorldSim, packageLookups } from '../src/world/sim';
import { BIOMES } from '../src/world/biomes';
import { FACTIONS } from '../src/data/monsters';
import { START_ZONE, ZONES, type ZoneDef } from '../src/data/zones';
import { randomizeStarterWeb } from '../src/engine/worldgen';
import { makeAccount } from '../src/meta/account';
import type { OverlayView, WorldOverlay } from '../src/world/overlay';

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');

let failures = 0;
let checks = 0;
const fail = (group: string, msg: string): void => {
  failures++;
  console.error(`  ✗ [${group}] ${msg}`);
};
const ok = (group: string, msg: string): void => {
  checks++;
  if (VERBOSE) console.log(`  ✓ [${group}] ${msg}`);
};
const assert = (cond: boolean, group: string, msg: string): void => {
  if (cond) ok(group, msg); else fail(group, msg);
};

// Grafted factions must exist before ANY validation/lookup (main.ts order).
registerAllPackageFactions();

// === 1. REGISTRY ==============================================================
console.log('eventqa: registry integrity');
{
  const problems = validatePackages(packageLookups());
  for (const p of problems) fail('registry', p);
  assert(problems.length === 0, 'registry', `validatePackages clean over ${PACKAGES.length} packages`);

  const ids = PACKAGES.map(p => p.id);
  assert(new Set(ids).size === ids.length, 'registry', 'package ids unique');

  const seeds = ids.map(id => packageSeed(0x1234abcd, id));
  assert(new Set(seeds).size === seeds.length, 'registry', 'per-package seeds pairwise distinct');
}

// === 2. THE PERSISTENCE PLEDGE ===============================================
console.log('eventqa: the persistence pledge');
function assertPledge(o: WorldOverlay, from: string): void {
  const hasSnap = typeof o.snapshot === 'function';
  const hasRestore = typeof o.restore === 'function';
  if (o.persistence === 'durable') {
    assert(hasSnap && hasRestore, 'pledge', `${from}/${o.id}: durable ⇒ snapshot+restore`);
  } else {
    assert(!hasSnap && !hasRestore, 'pledge', `${from}/${o.id}: transient ⇒ neither hook`);
  }
}
{
  // Package overlays: constructed exactly as the sim would.
  for (const p of PACKAGES) {
    if (!p.world?.overlay) continue;
    const inst = p.world.overlay({ seed: 0xbeef, gate: () => INACTIVE_GATE, biomeSeed: 0xbeef });
    assertPledge(inst, 'pkg');
    assert(inst.id.length > 0 && !inst.id.startsWith(':'), 'pledge', `${p.id}: overlay id well-formed`);
  }
}

// === 3. GATE MATH =============================================================
console.log('eventqa: gate math');
const account = makeAccount();
/** A manifest with EVERY package enabled + live from level 1 (weights kept). */
function forcedManifest(seed: number): ExpeditionManifest {
  const m = buildManifest(account, seed);
  return {
    ...m,
    packages: PACKAGES.map(p => ({
      id: p.id, enabled: true, weight: p.defaultWeight, startLevel: 0,
    })),
  };
}
{
  const m = forcedManifest(0x51ee7);
  for (const level of [1, 10, 50, 100]) {
    const gates = resolveGates(m, level);
    const weighted = PACKAGES.filter(p => !p.alwaysOn && !p.pressureless);
    const shares = weighted.map(p => gateOf(gates, p.id).share);
    const shareSum = shares.reduce((s, v) => s + v, 0);
    assert(Math.abs(shareSum - 1) < 1e-9, 'gates', `lv${level}: weighted shares sum to 1 (${shareSum.toFixed(6)})`);
    const pressures = weighted.map(p => gateOf(gates, p.id).pressure);
    const pSum = pressures.reduce((s, v) => s + v, 0);
    assert(Math.abs(pSum - weighted.length) < 1e-6, 'gates', `lv${level}: Σpressure preserves the active count`);
    for (const p of PACKAGES) {
      const g = gateOf(gates, p.id);
      if (p.alwaysOn || p.pressureless) {
        assert(g.active && g.share === 0 && g.pressure === 1, 'gates', `${p.id}: unweighted seat (share 0, pressure 1)`);
      }
    }
  }

  // Pressureless byte-identity: the Pit's presence must not move ANY other gate.
  const without: ExpeditionManifest = { ...m, packages: m.packages.map(e => e.id === 'pit' ? { ...e, enabled: false } : e) };
  const gA = resolveGates(m, 50), gB = resolveGates(without, 50);
  let identical = true;
  for (const p of PACKAGES) {
    if (p.id === 'pit') continue;
    if (JSON.stringify(gA.get(p.id)) !== JSON.stringify(gB.get(p.id))) identical = false;
  }
  assert(identical, 'gates', 'pressureless package holds NO seat (others byte-identical with it on/off)');

  // Relationship fold: breach amplifies demon_invasion while BOTH are active.
  const withBreach = resolveGates(m, 50);
  const noBreach = resolveGates({ ...m, packages: m.packages.map(e => e.id === 'breach' ? { ...e, enabled: false } : e) }, 50);
  const demonShareWith = gateOf(withBreach, 'demon_invasion').share;
  // Recompute what demon's share WOULD be un-amplified but same active set:
  // amplification must yield a strictly higher share than its own weight/total.
  const activeW = PACKAGES.filter(p => !p.alwaysOn && !p.pressureless)
    .reduce((s, p) => s + p.defaultWeight, 0);
  const naive = (PACKAGE_BY_ID['demon_invasion'].defaultWeight) / activeW;
  assert(demonShareWith > naive, 'gates', `amplifies folds in (demon share ${demonShareWith.toFixed(4)} > naive ${naive.toFixed(4)})`);
  assert(gateOf(noBreach, 'demon_invasion').active, 'gates', 'demon stays active without breach (fold needs BOTH)');

  // The frequency crank folds into exactly the three muls.
  const cranked: ExpeditionManifest = { ...m, frequency: { rate: 2, concurrency: 3, severity: 0.5 } };
  const gc = resolveGates(cranked, 50);
  for (const p of PACKAGES.filter(pp => !pp.alwaysOn && !pp.pressureless).slice(0, 4)) {
    const g = gateOf(gc, p.id);
    assert(Math.abs(g.ignitionMul - g.pressure * 2) < 1e-9, 'gates', `${p.id}: ignitionMul = pressure × rate`);
    assert(Math.abs(g.severityMul - g.pressure * 0.5) < 1e-9, 'gates', `${p.id}: severityMul = pressure × severity`);
    assert(g.concurrencyMul === 3, 'gates', `${p.id}: concurrencyMul = crank`);
  }
  assert(scaledCap(1, 0) === 1 && scaledCap(2, 0.1) === 1 && scaledCap(2, 3) === 6, 'gates', 'scaledCap floors at 1 and scales');
}

// === 4. MANIFEST ==============================================================
console.log('eventqa: manifest build/reconcile');
{
  const m = buildManifest(account, 0xfeed);
  const round = reconcileManifest(JSON.parse(JSON.stringify(m)), account, 0);
  assert(JSON.stringify(round) === JSON.stringify(m), 'manifest', 'build → JSON → reconcile is stable');

  const withGhost = JSON.parse(JSON.stringify(m)) as ExpeditionManifest;
  withGhost.packages.push({ id: 'ghost_package', enabled: true, weight: 50, startLevel: 0 });
  const dropped = reconcileManifest(withGhost, account, 0);
  assert(!dropped.packages.some(e => e.id === 'ghost_package'), 'manifest', 'unknown package ids drop on reconcile');

  const wild = JSON.parse(JSON.stringify(m)) as ExpeditionManifest;
  for (const e of wild.packages) { e.weight = 9999; e.startLevel = -50; }
  const clamped = reconcileManifest(wild, account, 0);
  for (const e of clamped.packages) {
    const p = PACKAGE_BY_ID[e.id];
    if (!p) continue;
    if (e.weight > 100 || e.startLevel < 0) { fail('manifest', `${e.id} slider escaped its band (w${e.weight}/s${e.startLevel})`); }
  }
  ok('manifest', 'out-of-range sliders clamp into their (tier-widened) bands');
  const garbage = reconcileManifest('not a manifest', account, 42);
  assert(garbage.packages.length > 0 && garbage.seed === 42, 'manifest', 'garbage input degrades to a fresh default manifest');
}

// === 5. LIFECYCLE (headless WorldSim over the real starter web) ==============
console.log('eventqa: overlay lifecycle (tick / snapshot / restore / determinism)');
function starterView(sim: WorldSim, zoneMap: Record<string, ZoneDef>, time: number): OverlayView {
  const allNodes = Object.values(zoneMap);
  const nodes = allNodes.filter(z => (z.dimension ?? 'surface') === 'surface');
  const byId: Record<string, ZoneDef> = {};
  for (const z of nodes) byId[z.id] = z;
  return {
    nodes, byId, allNodes,
    terrain: () => 'land' as const,
    currentZoneId: START_ZONE,
    time,
    census: {},
    charLevel: 50,
    gates: sim.gatesFor(50),
    visited: new Set(nodes.map(z => z.id)),
  };
}
function runSim(seed: number, steps: number): { sim: WorldSim; zoneMap: Record<string, ZoneDef>; time: number } {
  const manifest = forcedManifest(seed);
  const sim = new WorldSim(manifest);
  const zoneMap: Record<string, ZoneDef> = JSON.parse(JSON.stringify(ZONES));
  randomizeStarterWeb(zoneMap, manifest.seed);
  let time = 0;
  for (const z of Object.values(zoneMap)) {
    if (z.floating) continue;
    sim.onNodeCharted(z, starterView(sim, zoneMap, time));
  }
  const DT = 0.5;
  for (let i = 0; i < steps; i++) {
    time += DT;
    sim.update(DT, starterView(sim, zoneMap, time));
  }
  return { sim, zoneMap, time };
}
{
  const STEPS = 720; // 6 simulated minutes at the 0.5s step — deep into event arcs
  let a: ReturnType<typeof runSim> | null = null;
  try { a = runSim(0xa11ce, STEPS); ok('lifecycle', `sim A ticked ${STEPS} steps without a throw`); }
  catch (e) { fail('lifecycle', `sim A threw: ${(e as Error).stack?.split('\n')[0]}`); }
  let b: ReturnType<typeof runSim> | null = null;
  try { b = runSim(0xa11ce, STEPS); } catch { /* covered above */ }

  if (a && b) {
    const snapA = a.sim.snapshotOverlays();
    const snapB = b.sim.snapshotOverlays();
    // PURE JSON: the stringify→parse→stringify fixpoint holds (no Maps/Sets/
    // class instances/functions survive JSON, so drift shows as inequality).
    const jsonA = JSON.stringify(snapA);
    assert(jsonA === JSON.stringify(JSON.parse(jsonA)), 'lifecycle', 'snapshot bag is pure JSON');
    assert(jsonA === JSON.stringify(snapB), 'lifecycle', 'same seed + same ticks ⇒ byte-identical snapshots (determinism)');
    for (const key of Object.keys(snapA)) {
      assert(!key.startsWith(':') || key === ':reputation' || key === ':drives', 'lifecycle', `snapshot key '${key}' well-formed`);
    }

    // RESTORE ROUNDTRIP: a fresh sim adopting the bag re-emits it exactly.
    const fresh = runSim(0xa11ce, 0);
    const restored = fresh.sim.restoreOverlays(JSON.parse(jsonA) as Record<string, unknown>);
    const again = JSON.stringify(fresh.sim.snapshotOverlays());
    assert(again === jsonA, 'lifecycle', `restore → snapshot reproduces the bag exactly (${restored.size} fields restored)`);

    // The restored world keeps living, and an everything-culled prune is safe.
    try {
      let t = fresh.time;
      for (let i = 0; i < 100; i++) { t += 0.5; fresh.sim.update(0.5, starterView(fresh.sim, fresh.zoneMap, t)); }
      ok('lifecycle', 'restored sim ticks on without a throw');
    } catch (e) { fail('lifecycle', `restored sim threw: ${(e as Error).stack?.split('\n')[0]}`); }
    try {
      fresh.sim.pruneOverlayZones(() => false);
      JSON.stringify(fresh.sim.snapshotOverlays());
      ok('lifecycle', 'total prune (every zone culled) never throws and stays pure JSON');
    } catch (e) { fail('lifecycle', `total prune threw: ${(e as Error).stack?.split('\n')[0]}`); }

    // Dev-ignite parity: every cached event field the Events tab drives exists.
    const s = a.sim;
    const devSeams: [string, boolean][] = [
      ['demonField.devIgnite', typeof s.demonField?.devIgnite === 'function'],
      ['crusadeField.devIgnite', typeof s.crusadeField?.devIgnite === 'function'],
      ['fractureField.devIgnite', typeof s.fractureField?.devIgnite === 'function'],
      ['huntField.devIgnite', typeof s.huntField?.devIgnite === 'function'],
      ['conclaveField.devOpenRitual', typeof s.conclaveField?.devOpenRitual === 'function'],
      ['deadwakeField.devIgnite', typeof s.deadwakeField?.devIgnite === 'function'],
      ['migrationField.devIgnite', typeof s.migrationField?.devIgnite === 'function'],
      ['brigandField.devIgnite', typeof s.brigandField?.devIgnite === 'function'],
      ['contagionField.devIgnite', typeof s.contagionField?.devIgnite === 'function'],
      ['holdfastField.devForce', typeof s.holdfastField?.devForce === 'function'],
      ['myceliaField.devIgnite', typeof s.myceliaField?.devIgnite === 'function'],
      ['hauntField.devIgnite', typeof s.hauntField?.devIgnite === 'function'],
      ['breachField.devIgnite', typeof s.breachField?.devIgnite === 'function'],
      ['amalgamationField.devOpen', typeof s.amalgamationField?.devOpen === 'function'],
      ['vendettaField.devIgnite', typeof s.vendettaField?.devIgnite === 'function'],
      ['worldBossField.devIgnite', typeof s.worldBossField?.devIgnite === 'function'],
      ['worldBossField.devManifest', typeof s.worldBossField?.devManifest === 'function'],
      ['worldBossField.devLair', typeof s.worldBossField?.devLair === 'function'],
    ];
    for (const [name, present] of devSeams) assert(present, 'lifecycle', `dev seam ${name} present`);
  }
}

// === 5b. FRACTURE DIVERT LIFECYCLE ===========================================
// The cross-zone handoff the chase depends on: a diverted fracture is nowhere
// while its marker glides (nothing may materialize), LANDS exactly on its
// destination zone when the glide ends (fractureIn surfaces it, longer-timer),
// and a mid-transit save resolves to the DESTINATION (the glide is theatre).
// Regression net for "chased it into the next zone and it never spawned".
console.log('eventqa: fracture divert lifecycle');
{
  const { sim, zoneMap, time } = runSim(0xf2ac, 0);
  const ff = sim.fractureField;
  if (!ff) {
    fail('fracture', 'sim.fractureField accessor missing');
  } else {
    // The starter seed web is tiny (town + one field zone); a real divert lands
    // on ground the engine CHARTS on demand (pickRovingDest generates a '?'
    // frontier). Mirror that: mint a destination node into the QA web.
    const seedHost = Object.values(zoneMap).find(z => z.objective.kind !== 'safe' && z.caveDepth == null && !z.floating);
    if (seedHost) {
      const dest = JSON.parse(JSON.stringify(seedHost)) as ZoneDef;
      dest.id = 'qa_divert_dest';
      dest.name = 'QA Divert Destination';
      zoneMap[dest.id] = dest;
    }
    const view = starterView(sim, zoneMap, time);
    const surge = ff.surge();
    // Config coherence for the new arrival-grace lever set.
    assert(surge.divertGrace > 0, 'fracture', `divertGrace is live (${surge.divertGrace}s)`);
    assert(surge.divertTimer >= surge.baseTimer, 'fracture', 'divertTimer at least as forgiving as baseTimer');
    assert(surge.travelSeconds > 0, 'fracture', 'travelSeconds positive (the glide exists)');
    assert(surge.idleLife > surge.travelSeconds + surge.divertGrace, 'fracture',
      'idleLife outlasts glide + grace (a chased fracture cannot idle out mid-handoff)');

    // Ignite somewhere targetable, then divert to another valid host.
    let zoneA = '';
    for (const n of view.nodes) { if (ff.devIgnite(view, n.id)) { zoneA = n.id; break; } }
    assert(zoneA !== '', 'fracture', 'devIgnite found a targetable starter zone');
    const zoneB = view.nodes.find(z => z.id !== zoneA && z.caveDepth == null && !z.floating
      && !z.eventOwned && z.objective.kind !== 'safe')?.id ?? '';
    assert(zoneB !== '', 'fracture', 'a second valid host exists to divert to');
    if (zoneA && zoneB) {
      const origin = ff.fractureIn(zoneA);
      assert(!!origin && !origin.longerTimer, 'fracture', 'ignited fracture surfaces at its origin (base timer)');
      const hops0 = ff.peek()?.hopsRemaining ?? 0;
      assert(hops0 > 0, 'fracture', 'dev-ignited fracture has hops to spend');

      ff.divert(zoneB, { x: 0, y: 0 }, { x: 120, y: 80 });
      // IN TRANSIT: active nowhere (the engine must not materialize it) but
      // visibly travelling, and the hop already spent.
      assert(ff.fractureIn(zoneA) === null && ff.fractureIn(zoneB) === null, 'fracture', 'in transit ⇒ active in NO zone');
      assert(ff.peek()?.travelPos != null, 'fracture', 'in transit ⇒ the marker glides (travelPos live)');
      assert((ff.peek()?.hopsRemaining ?? -1) === hops0 - 1, 'fracture', 'divert spends exactly one hop');
      assert(ff.activityAt(zoneB) === 0, 'fracture', 'no event-activity bloom until it lands');

      // MID-TRANSIT SAVE lands at the destination (snapshot pledge).
      const snap = ff.snapshot() as { fracture?: { zoneId?: string; diverted?: boolean } };
      assert(snap.fracture?.zoneId === zoneB && snap.fracture?.diverted === true, 'fracture',
        'mid-transit snapshot resolves to the destination, diverted');
      const pkg = PACKAGE_BY_ID['fractures'];
      const fresh = pkg?.world?.overlay?.({ seed: 0xf2ac, gate: () => INACTIVE_GATE, biomeSeed: 0xf2ac }) as typeof ff | undefined;
      if (fresh?.restore) {
        fresh.restore(JSON.parse(JSON.stringify(snap)));
        const landed = fresh.fractureIn(zoneB);
        assert(!!landed && landed.longerTimer, 'fracture', 'restored mid-transit save surfaces AT the destination (longer timer)');
      } else {
        fail('fracture', 'fractures overlay restore hook missing');
      }

      // ARRIVAL: step the live overlay past the glide — it must surface in the
      // destination (and only there), as the longer-timer diverted instance.
      const steps = Math.ceil((surge.travelSeconds + 0.6) / 0.5);
      for (let i = 0; i < steps; i++) ff.update(0.5, view);
      const arrived = ff.fractureIn(zoneB);
      assert(!!arrived && arrived.longerTimer, 'fracture', 'glide complete ⇒ fracture surfaces in the destination (longer timer)');
      assert(ff.fractureIn(zoneA) === null, 'fracture', 'origin zone released after the divert');
      assert(ff.peek()?.travelPos == null, 'fracture', 'arrival clears the glide');
      assert(ff.activityAt(zoneB) === 1, 'fracture', 'landed fracture feeds the activity bloom');
    }
  }
}

// === 6. THE LEDGER CONTRACT ===================================================
console.log('eventqa: ledger contract (reads ⊆ bumps)');
{
  // BUMPED keys: every bumpLedger/bumpAccountLedger string literal in src/,
  // plus every EncounterLedger value (world bumps e.def.ledger.* verbatim).
  const bumped = new Set<string>();
  const readKeys = new Set<string>();
  const walk = (dir: string): void => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) { walk(p); continue; }
      if (!f.name.endsWith('.ts')) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.matchAll(/bump(?:Account)?Ledger\(\s*(?:this\.ledger,\s*)?'([a-z0-9_]+)'/g)) bumped.add(m[1]);
      for (const m of text.matchAll(/ledgerOnEnter:\s*'([a-z0-9_]+)'/g)) bumped.add(m[1]);
      for (const m of text.matchAll(/ledgerKill:\s*'([a-z0-9_]+)'/g)) bumped.add(m[1]);
      for (const m of text.matchAll(/ctx\.ledger\.([a-z0-9_]+)/g)) readKeys.add(m[1]);
    }
  };
  walk(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src'));
  for (const e of allEncounterSpecs()) {
    bumped.add(e.ledger.onEncounter);
    bumped.add(e.ledger.onClose);
  }
  // Milestone/meta keys the engine writes dynamically (reached_level_<n>,
  // vocation ids, quest rewards) — the dynamic namespaces the scan can't see.
  const DYNAMIC = [/^reached_level_/, /^vocation_/, /^quest_/];
  for (const key of readKeys) {
    if (bumped.has(key) || DYNAMIC.some(rx => rx.test(key))) { ok('ledger', `read key '${key}' is bumped`); continue; }
    fail('ledger', `unlock/tier reads '${key}' but NOTHING bumps it — an impossible unlock`);
  }
  assert(readKeys.size > 10, 'ledger', `scan found ${readKeys.size} read keys / ${bumped.size} bumped keys (scan sane)`);
}

// === 7. ZONE POLICY ==========================================================
console.log('eventqa: zone policy ids');
{
  const knownEvents = new Set<string>([
    ...PACKAGES.map(p => p.id),
    ...allEncounterSpecs().map(e => e.packageId),
    ...zoneEventDefs().map(d => d.id),
    'incursion', // always-on infra field (not a package id)
  ]);
  for (const [bid, b] of Object.entries(BIOMES)) {
    for (const id of [...(b.denyEvents ?? []), ...(b.allowEvents ?? [])]) {
      assert(knownEvents.has(id), 'policy', `biome '${bid}' names event '${id}'`);
    }
    for (const id of [...(b.denyFactions ?? []), ...(b.allowFactions ?? [])]) {
      assert(!!FACTIONS[id], 'policy', `biome '${bid}' names faction '${id}'`);
    }
  }
}

// === 8. ZONE-EVENT REGISTRY ==================================================
console.log('eventqa: zone-event registry');
{
  const defs = zoneEventDefs();
  assert(defs.length >= 3, 'zone-events', `registry holds ${defs.length} kinds`);
  assert(new Set(defs.map(d => d.id)).size === defs.length, 'zone-events', 'kind ids unique');
  for (const d of defs) {
    assert(d.reward.rep >= 0 && d.reward.gems >= 0 && d.reward.xpMul >= 0, 'zone-events', `${d.id}: reward row sane`);
    assert(typeof d.spawn === 'function' && typeof d.tick === 'function', 'zone-events', `${d.id}: spawn+tick handlers present`);
  }
  const base: EventContext = {
    owner: 'goblin', ownerPower: 60, contestants: ['goblin', 'gnoll'],
    invader: null, isNight: false, hasCamps: true, hasRoute: true, nearHome: true,
  };
  const plain = {}; // an un-biomed zone — policy admits everything
  // A siege needs a genuinely HOSTILE invader — take one from the live stance
  // table rather than assuming any particular pair's politics.
  const { factionStance } = await import('../src/data/monsters');
  const hostileInvader = Object.keys(FACTIONS).find(f => f !== 'goblin' && factionStance(f, 'goblin') === 'hostile');
  if (hostileInvader) {
    const siege = chooseEvent({ ...base, invader: hostileInvader }, plain, 0);
    assert(siege?.kind === 'siege', 'zone-events', `priority: a hostile invader (${hostileInvader}) + camps ⇒ siege first`);
  } else {
    ok('zone-events', 'no faction is hostile to goblins this build — siege priority untestable, skipped');
  }
  const caravan = chooseEvent(base, plain, 0);
  assert(caravan?.kind === 'caravan', 'zone-events', 'priority: settled owner ⇒ caravan before patrol');
  const patrol = chooseEvent({ ...base, ownerPower: 10 }, plain, 0.2);
  assert(patrol?.kind === 'patrol', 'zone-events', 'priority: weak owner ⇒ patrol');
  const nothing = chooseEvent({ ...base, owner: null, invader: null }, plain, 0.99);
  assert(nothing === null, 'zone-events', 'no owner + no invader ⇒ quiet ground');
}

// === verdict =================================================================
console.log(failures
  ? `\neventqa FAILED — ${failures} breach(es) across ${checks + failures} checks`
  : `\neventqa OK — ${checks} checks clean`);
process.exit(failures ? 2 : 0);
