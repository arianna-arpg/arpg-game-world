// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE TRANSIENCE DOCTRINE end to end on the real engine
// (docs/engine/transience.md). Pins:
//   - THE WARP LAW (world/biomeField.ts): every warp keyed; setWarp/unwarp/
//     release lifecycle; release DECAYS strength at BIOME_FIELD_CFG.warpFadePerSec
//     until gone (the volcano-cooling lane); a re-push mid-fade REVIVES; the
//     unkeyed permanent warp() API is GONE,
//   - MINT-BLIND SAMPLING: sampleBiome/sampleDepth return the BASE field under
//     any live warp — no temporary event can bake its biome into newly-charted
//     ground (the "nothing but Rift biomes" leak, closed),
//   - EVENT-PINNED WEATHER (engine/eventWeather.ts): sources fold at
//     World.skyFront (strongest wins, sky fronts included), sheltered ground
//     refuses, the demon + incursion sources are registered, eventOnly weather
//     rows validate (and must NOT be sky-born),
//   - THE DEMON STORM: every invasion stage pins demonstorm at monotone
//     intensity; devIgnite → invasionOn carries the stage sky; resolve → the
//     sky clears with the strike; the overlay never touches the biome field,
//   - WEATHER DRESS (engine/weatherDress.ts): pinned demonstorm PLANTS the
//     occupation kit (tagged, spaced, player-clear, arena-bounded, capped),
//     deterministic per (zone, kind) across replants; unpinning EVAPORATES
//     every piece back to nothing; sanctuary ground never dresses,
//   - THE INCURSION, whole arc through the REAL drain: ignite → epicenter
//     minted eventOwned with a KEYED incursion_<epId> warp; the pall rides
//     skyFront off live influence; sanctuary flip silences it; the field
//     stays base-biome under the blight; resolveEpicenter → pall clears,
//     warp releases + decays to nothing, and the TRANSIENCE RULE drops the
//     unclaimed epicenter zone from the very next save,
//   - the warp sweep releases stale demon_ warps (no producer since this pass).
// Run: npx tsx balance/probe_transience.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { ZoneDef } from '../src/data/zones';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate, OverlayBuildCtx } from '../src/packages/types';
import { BiomeField } from '../src/world/biomeField';
import { BIOME_FIELD_CFG, biomeAt } from '../src/world/biomes';
import { WEATHER_DEFS, validateWeather } from '../src/world/weather';
import { WEATHER_FX } from '../src/render/vis/weatherFx';
import { WEATHER_DRESS_CFG, dressPlanFor } from '../src/engine/weatherDress';
import { registerEventFront, eventFrontSourceIds, type EventFrontPin } from '../src/engine/eventWeather';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { INCURSION_ARCHETYPES } from '../src/packages/overlays/incursion';
import { DemonInvasionField } from '../src/packages/overlays/demonInvasion';
import { DEMON_INVASION } from '../src/packages/defs/demonInvasion';
import { skyOf } from '../src/data/zones';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x7a1e5);

const step = (w: World, dt: number, n = 1): void => { for (let i = 0; i < n; i++) w.update(dt); };

// ------------------------------------------------------------ A. the warp law
{
  const bf = new BiomeField(0xb10e);
  const at = { x: 40, y: -60 };
  const base = biomeAt(at, 0xb10e);
  bf.setWarp('probe_w', { center: at, radius: 300, biome: 'grove', strength: 1, label: 'probe warp' });
  check('A: mint sampler is BASE-FIELD under a live full-strength warp',
    bf.sampleBiome(at) === base, `sampled '${bf.sampleBiome(at)}' vs base '${base}'`);
  check('A: the warp still ATTRIBUTES (warpsAt names the turner)',
    bf.warpsAt(at).length === 1 && bf.warpsAt(at)[0].label === 'probe warp');
  check('A: warpIds lists every live warp (all keyed now)', bf.warpIds().join(',') === 'probe_w');
  check('A: the unkeyed permanent warp() API is GONE',
    !('warp' in BiomeField.prototype));
  // Release → decay at the config rate → gone. A mid-fade re-push revives.
  bf.release('probe_w');
  bf.update(5);
  const midFade = bf.warpsAt(at)[0]?.strength ?? -1;
  check('A: release DECAYS strength at warpFadePerSec',
    Math.abs(midFade - (1 - 5 * BIOME_FIELD_CFG.warpFadePerSec)) < 1e-6, `strength ${midFade.toFixed(3)}`);
  bf.setWarp('probe_w', { center: at, radius: 300, biome: 'grove', strength: 1 });
  bf.update(5);
  check('A: a re-push mid-fade REVIVES (the event was not over after all)',
    (bf.warpsAt(at)[0]?.strength ?? 0) === 1);
  bf.release('probe_w');
  bf.update(1 / BIOME_FIELD_CFG.warpFadePerSec + 1);
  check('A: a released warp fades to NOTHING (ids empty, attribution empty)',
    bf.warpIds().length === 0 && bf.warpsAt(at).length === 0);
  bf.setWarp('probe_w2', { center: at, radius: 300, biome: 'grove', strength: 0.6 });
  bf.unwarp('probe_w2');
  check('A: unwarp is INSTANT (the owner-managed lane)', bf.warpIds().length === 0);
}

// -------------------------------------------------- B. the weather rows' law
{
  const msgs = validateWeather(() => true, k => !!DOODAD_VISUALS[k]);
  check('B: registry validates clean (eventOnly rows legit, dress kinds real)',
    msgs.length === 0, msgs.join(' | '));
  const ds = WEATHER_DEFS.demonstorm, pall = WEATHER_DEFS.eldritch_pall;
  check('B: demonstorm is eventOnly and NEVER sky-born', !!ds?.eventOnly && !ds?.skyWeight);
  check('B: the pall is eventOnly and NEVER sky-born', !!pall?.eventOnly && !pall?.skyWeight);
  check('B: demonstorm carries the occupation dress kit',
    (ds?.dress?.rows.length ?? 0) >= 3
    && (ds?.dress?.rows ?? []).every(r => !!DOODAD_VISUALS[r.doodad]));
  check('B: both event skies wear a drawn face (WEATHER_FX rows + the veil)',
    !!WEATHER_FX.demonstorm?.veil && !!WEATHER_FX.eldritch_pall?.veil);
  check('B: spawn-neutral presentation (the overlay owns bias, the sky owns look)',
    ds?.countMul === 1 && Object.keys(ds?.factionMul ?? { x: 1 }).length === 0);
  check('B: both real event sources are registered',
    eventFrontSourceIds().includes('demon_invasion') && eventFrontSourceIds().includes('incursion'));
}

// ------------------------------------- C. the demon overlay: sky per stage --
{
  const GATE: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };
  const ctx: OverlayBuildCtx = { seed: 0xd340, gate: () => GATE, biomeSeed: 1 };
  const f = DEMON_INVASION.world!.overlay!(ctx) as DemonInvasionField;
  const stages = f.surge().stages;
  check('C: every stage pins the demonstorm', stages.every(s => s.weather?.kind === 'demonstorm'));
  check('C: the sky DEEPENS with the fester (monotone intensity, 1.0 at the end)',
    stages.every((s, i) => i === 0 || (s.weather!.intensity >= stages[i - 1].weather!.intensity))
    && stages[stages.length - 1].weather!.intensity === 1);
  const mkZone = (id: string, x: number, y: number, kind = 'clear'): ZoneDef => ({
    id, name: id, map: { x, y }, exits: [], objective: { kind }, level: 12,
  } as unknown as ZoneDef);
  const zones = [mkZone('za', 0, 0), mkZone('zb', 120, 40)];
  const view: OverlayView = {
    nodes: zones, byId: Object.fromEntries(zones.map(n => [n.id, n])), allNodes: zones,
    terrain: () => 'land', currentZoneId: 'za', time: 0, census: {}, charLevel: 20,
    gates: new Map(), visited: new Set(['za', 'zb']),
  };
  f.update(0.05, view);
  check('C: devIgnite seizes the standing zone', f.devIgnite(view, 'za') && f.activeCount() === 1);
  const info = f.invasionOn('za');
  check('C: invasionOn carries the opening stage\'s sky',
    info?.stage.weather?.kind === 'demonstorm' && info.stage.weather.intensity === stages[0].weather!.intensity);
  f.resolveInvasion('za');
  check('C: the strike broken, the sky claim is GONE with it', f.invasionOn('za') === null && f.activeCount() === 0);
}

// --------------------------------- D. skyFront fold + dress, the real world --
const w = makeSimWorld('warrior', 0x7a1e5);
let pin: EventFrontPin | null = null;
registerEventFront({ id: 'probe_pin', sample: () => pin });
{
  const arena = w.zoneMap[SIM_ARENA_ID];
  arena.objective = { kind: 'clear' }; // wake the quiet floor (restored below)
  check('D: the proving ground stands under an open sky', skyOf(w.zone) === 'open');
  check('D: no event, no sky claim (fold quiet)', w.skyFront()?.kind !== 'demonstorm');
  pin = { kind: 'demonstorm', intensity: 0.6 };
  const f1 = w.skyFront();
  check('D: a pinned event front reads through skyFront', f1?.kind === 'demonstorm' && Math.abs((f1?.intensity ?? 0) - 0.6) < 1e-9);
  // A STRONGER sky front outvotes; a stronger pin takes it back.
  w.sim.weather.fronts.push({ kind: 'storm', pos: { x: w.zone.map.x, y: w.zone.map.y }, vel: { x: 0, y: 0 }, radius: 300, intensity: 0.95, age: 10, life: 400 });
  check('D: strongest wins — a raging sky front outvotes a faint pin', w.skyFront()?.kind === 'storm');
  pin = { kind: 'demonstorm', intensity: 0.99 };
  check('D: …and a deepened event takes the sky back', w.skyFront()?.kind === 'demonstorm');
  w.sim.weather.fronts.length = 0;
  // Shelter refuses every sky, pinned or born.
  w.zone.sky = 'sheltered';
  check('D: sheltered ground refuses the pinned sky too', w.skyFront() === null);
  delete w.zone.sky;

  // --- the dress: plant → verify → dissolve → determinism → sanctuary ---
  pin = { kind: 'demonstorm', intensity: 0.8 };
  step(w, 0.55, 2); // one reconcile beat
  const dressed = (): typeof w.doodads => w.doodads.filter(d => d.weatherDress === 'demonstorm' && !d.gone && !d.evap);
  const plan = dressPlanFor('demonstorm')!;
  const first = dressed();
  check('D: the storm PLANTS its occupation kit', first.length > 0, `${first.length} pieces`);
  check('D: every row is represented and none overfilled',
    plan.rows.every(r => {
      const n = first.filter(d => d.kind === r.doodad).length;
      return n >= 1 && n <= r.count[1];
    }), plan.rows.map(r => `${r.doodad}:${first.filter(d => d.kind === r.doodad).length}`).join(' '));
  check('D: the kit respects the hard cap', first.length <= WEATHER_DRESS_CFG.maxPieces);
  check('D: pieces stand off the player\'s feet',
    first.every(d => Math.hypot(d.pos.x - w.player.pos.x, d.pos.y - w.player.pos.y) >= WEATHER_DRESS_CFG.playerClear));
  check('D: pieces stand inside the arena inset',
    first.every(d => d.pos.x >= WEATHER_DRESS_CFG.edgeInset && d.pos.y >= WEATHER_DRESS_CFG.edgeInset
      && d.pos.x <= w.arena.w - WEATHER_DRESS_CFG.edgeInset && d.pos.y <= w.arena.h - WEATHER_DRESS_CFG.edgeInset));
  const sig = (ds: typeof w.doodads): string =>
    ds.map(d => `${d.kind}@${d.pos.x.toFixed(1)},${d.pos.y.toFixed(1)}`).sort().join('|');
  const firstSig = sig(first);
  const replantBeats = step; void replantBeats;
  // Idempotence: further beats under the same sky plant NOTHING new.
  step(w, 0.55, 4);
  check('D: the reconcile is idempotent while the front holds', sig(dressed()) === firstSig);
  // The front lifts → every piece EVAPORATES → the land is exactly itself.
  pin = null;
  step(w, 0.55, 2);
  check('D: the front gone, every piece is dissolving (evap-tagged)',
    dressed().length === 0 && w.doodads.some(d => d.weatherDress && d.evap));
  step(w, 0.5, 60);
  check('D: …and the land dissolves back to NOTHING',
    w.doodads.every(d => !d.weatherDress || d.gone), `${w.doodads.filter(d => d.weatherDress && !d.gone).length} lingering`);
  // The same sky over the same zone lays the same dress (seeded determinism).
  pin = { kind: 'demonstorm', intensity: 0.8 };
  step(w, 0.55, 2);
  check('D: a returning front lays the SAME dress (per-zone, per-kind stream)', sig(dressed()) === firstSig);
  pin = null;
  step(w, 0.5, 60);
  // Sanctuary ground never dresses.
  arena.objective = { kind: 'safe' };
  pin = { kind: 'demonstorm', intensity: 0.9 };
  step(w, 0.55, 2);
  check('D: sanctuary ground never dresses', w.doodads.every(d => !d.weatherDress || d.gone));
  pin = null;
  arena.objective = { kind: 'clear' };
  check('D: demonstorm bends the light (radiance dial authored)', (WEATHER_DEFS.demonstorm.radiance?.mul ?? 1) < 1);
}

// ------------------------- E. the incursion, whole arc, through the real drain
{
  // A wild SURFACE web zone hosts the landing (the arena sits mid-ocean —
  // pullToLand would drag a landing far off its reach).
  const wild = Object.values(w.zoneMap).find(z =>
    (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.special
    && !z.eventOwned && !z.floating && z.id !== SIM_ARENA_ID
    && z.objective.kind !== 'safe' && skyOf(z) === 'open');
  check('E: a wild surface zone exists to host the landing', !!wild, wild?.id ?? 'none');
  if (wild) {
    w.loadZone(wild.id);
    // The probe archetype: lands ON TOP of the wild zone with a vast, steady
    // reach so influence there ≈ 1 — every dial through the open registry.
    INCURSION_ARCHETYPES.probe = {
      id: 'probe', factions: ['eldritch'],
      announce: 'probe landing', color: '#7fce6a',
      weather: { kind: 'eldritch_pall', max: 0.8 },
      tileset: 'eldritch', biome: 'eldritch', adorn: 'tentacles',
      nodeCount: [1, 1], mintDistance: [1, 1], clusterRadius: 8,
      biomeWarp: { radius: 400, strength: 0.7 },
      spread: {
        model: 'freeSpace', pseudopods: 4, startReach: 3000, growthPerSec: 0,
        retractPerSec: 0, maxReach: 3000, reachWidth: 3000, wander: 0,
        lengthJitter: 0, falloff: 0.01, renderLagFrac: 1,
      },
      cap: { maxInfluencedZones: 0, maxConcurrent: 1 },
      termination: { policy: 'hybridCleanseObserver', observer: 'vhal_serrat', cleanseRetract: 60 },
      eventInterval: 3, eventChance: 0,
      events: [],
      eventConfig: {
        corruption: { dmgMore: 0, lifeMore: 0, maxFraction: 0, perFire: 0, intensityFloor: 0, intensityGain: 0 },
        tentacleField: { radius: 0, duration: 0, perFire: 0, intensityFloor: 0, intensityGain: 0, farFrom: 0 },
        doodadMutation: { maxFraction: 0, perFire: 0, intensityFloor: 0, intensityGain: 0, swingChance: 0, swing: { interval: 1, radius: 0, chance: 0, power: 0, powerPerLevel: 0 } },
        spawn: { maxAlive: 0, farFrom: 0, perFire: 0, intensityFloor: 0, intensityGain: 0 },
      },
    };
    const inc = w.sim.incursionField;
    const lit = inc.ignite('probe', { x: wild.map.x, y: wild.map.y }, 10);
    check('E: the landing ignites', !!lit);
    step(w, 0.1, 2); // the engine drains the mint
    const ep = inc.peek().find(i => i.archetype === 'probe')?.epicenters[0];
    check('E: the epicenter zone is MINTED and bound', !!ep?.zoneId, ep?.zoneId ?? 'unbound');
    const epZone = ep?.zoneId ? w.zoneMap[ep.zoneId] : undefined;
    check('E: minted ground is eventOwned (the claim convention)', !!epZone?.eventOwned);
    check('E: the blight warp is KEYED to its epicenter',
      !!ep && w.sim.biomeField.warpIds().includes(`incursion_${ep.id}`));
    // MINT-BLIND: the field under the blight still samples BASE geology.
    if (ep) {
      const seedF = w.sim.biomeField.fieldSeed;
      let blind = true;
      for (let i = 0; i < 24; i++) {
        const c = { x: ep.coord.x + (i % 5 - 2) * 90, y: ep.coord.y + (Math.floor(i / 5) - 2) * 90 };
        if (w.sim.biomeField.sampleBiome(c) !== biomeAt(c, seedF)) { blind = false; break; }
      }
      check('E: the mint sampler stays BASE under the live blight', blind);
    }
    // THE PALL: standing in influenced ground, the sky is the incursion's.
    w.sim.weather.fronts.length = 0;
    const infl = inc.influence(wild.id);
    check('E: the wild zone stands under deep influence', infl > 0.6, `influence ${infl.toFixed(2)}`);
    const pall = w.skyFront();
    check('E: THE PALL rides skyFront off live influence',
      pall?.kind === 'eldritch_pall' && Math.abs((pall?.intensity ?? 0) - 0.8 * infl) < 1e-6,
      `kind ${pall?.kind} intensity ${(pall?.intensity ?? 0).toFixed(2)}`);
    // Sanctuary courtesy through the REAL source.
    const kept = wild.objective;
    wild.objective = { kind: 'safe' };
    check('E: sanctuary ground silences the pall (the source\'s own gate)', w.skyFront()?.kind !== 'eldritch_pall');
    wild.objective = kept;
    // While the incursion LIVES, its minted ground rides the save (claimed)…
    const ws1 = w.serializeWorldState();
    check('E: a live epicenter zone RIDES the save (ownedZones claim)',
      !!ep?.zoneId && ws1.zones.some(z => z.id === ep.zoneId));
    // …the Observer falls: the pall clears, the warp releases + fades to
    // nothing, and the TRANSIENCE RULE drops the unclaimed ground.
    if (ep?.zoneId) {
      inc.resolveEpicenter(ep.zoneId);
      check('E: the collapse clears the pall within the same beat', w.skyFront()?.kind !== 'eldritch_pall');
      step(w, 0.5, 4); // ≥1 warp-sweep beat → released
      const midFade = w.sim.biomeField.warpsAt(ep.coord).find(m => m.id === `incursion_${ep.id}`);
      check('E: the blight is RELEASED, fading — not snapped', !!midFade && midFade.strength < 0.7,
        midFade ? `strength ${midFade.strength.toFixed(2)}` : 'already gone');
      step(w, 0.5, 60); // ~30s — 0.7 / 0.03 ≈ 23s to heal
      check('E: …and the land HEALS to nothing',
        !w.sim.biomeField.warpIds().includes(`incursion_${ep.id}`));
      const ws2 = w.serializeWorldState();
      check('E: the TRANSIENCE RULE drops the unclaimed epicenter from the next save',
        !ws2.zones.some(z => z.id === ep.zoneId));
    }
    delete INCURSION_ARCHETYPES.probe;
  }
}

// ---------------------------------------- F. the sweep's stale-warp release --
{
  const bf = w.sim.biomeField;
  bf.setWarp('demon_ghost', { center: { x: 0, y: 0 }, radius: 100, biome: 'grove', strength: 1 });
  step(w, 0.55, 2); // one sweep beat → released (no producer owns demon_ anymore)
  step(w, 0.5, 8);
  const ghost = bf.warpsAt({ x: 0, y: 0 }).find(m => m.id === 'demon_ghost');
  check('F: the sweep releases stale demon_ warps (fading, no producer left)',
    !ghost || ghost.strength < 1, ghost ? `strength ${ghost.strength.toFixed(2)}` : 'gone');
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
