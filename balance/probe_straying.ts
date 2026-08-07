// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE STRAYING end to end (packages/overlays/straying.ts +
// packages/defs/straying.ts + the world.ts scene block). Pins:
//   - THE BELT LAW: ignition seats ONLY the surge's biomes at/below levelMax,
//     honors maxConcurrent, and settles LATENT on unknown ground (rising the
//     moment the ground is known),
//   - THE TUG'S BOOKKEEPING: staged-once heads, returns/converts/losses
//     decrement, the raid flips EXACTLY at raidAt, exhaustion below it (or
//     the last caller down) breaks the call, resolve buys the reprieve and
//     the reprieve blocks fresh settles (dev pins never do),
//   - THE ABSENT CLOCK: frozen while the player stands the zone; unattended
//     it resolves BOTH ways (freeholdWinChance — statistically pinned), a
//     lost fold wears the feral hold (affectSpawns: chattel amplified +
//     injected) and the hold expires on its own,
//   - THE RAID CLOCK: a march that presses its whole ttl breaks the fold,
//   - WORLDSTATE: snapshot → JSON → restore → byte-identical re-snapshot;
//     garbage restores tolerated; pruneZones drops culled ground; same seed +
//     same script = byte-identical fields (determinism),
//   - THE DEF: validate() clean over the live registries, every stray kind
//     owns a convert row, the dormant tags are registered,
//   - LIVE (the real engine): a dev-pinned call on a real farmland mint
//     stages the scene (dormant court facing the farm, loose heads with bell
//     clocks), a player's touch turns a head home (the duty post walks it,
//     arrival pays + counts), the bell converts un-herded heads in place
//     (dormant thralls walking to the rally), the raid rouses the court, and
//     breaking it to the last body relieves the fold (ledger + resolve) —
//     then a leave/return round-trip re-stages from the overlay's counts
//     without double-spawning the court,
//   - THE CARRY LANE (the grab fabric meets the fold, section H): the mass law
//     ADMITS the fold's own stock at default policy, a head in someone's HANDS
//     is neither herded nor banked, and SETTING IT DOWN inside arriveRadius is
//     what pays — once — and re-posts it at the fold. One law with the Drove's
//     pen test (probe_drove G), driven through the real grabSeize path.
// Run: npx tsx balance/probe_straying.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { withSeededRandom } from '../src/core/rng';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { ZoneDef } from '../src/data/zones';
import { vec, dist, type Vec2 } from '../src/core/math';
import { mod } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { grabRefusal, type GrabSpec } from '../src/engine/grab';
import { MONSTERS } from '../src/data/monsters';
import { BIOMES } from '../src/world/biomes';
import { isDormant } from '../src/engine/ai';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate } from '../src/packages/types';
import { StrayField, type StrayingSurge } from '../src/packages/overlays/straying';
import { STRAYING, STRAYING_SURGE } from '../src/packages/defs/straying';
import { PACKAGES } from '../src/packages/registry';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// ============================================================ the fake web
// A hand-built OverlayView: enough zone shape for eventTargetable + the seat
// filter (biome/level/map), nothing more. The overlay never touches the rest.
const mkZone = (id: string, biome: string, level: number, x: number, y: number, veiled = false): ZoneDef =>
  ({ id, biome, level, veiled, map: { x, y }, exits: [], objective: { kind: 'clear' } } as unknown as ZoneDef);

const GATE_ON: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };

interface FakeWeb { view: OverlayView; visited: Set<string>; surveyed: Set<string>; setZone(id: string): void }
const mkWeb = (zones: ZoneDef[], at: string, known: string[]): FakeWeb => {
  const visited = new Set(known);
  const surveyed = new Set<string>();
  const byId = Object.fromEntries(zones.map(z => [z.id, z]));
  const view = {
    nodes: zones, byId, allNodes: zones,
    terrain: () => 'land',
    currentZoneId: at,
    time: 0, census: {}, charLevel: 10,
    gates: new Map(),
    visited, surveyed,
  } as unknown as OverlayView;
  return { view, visited, surveyed, setZone: (id: string) => { (view as { currentZoneId: string }).currentZoneId = id; } };
};

/** A hot surge for the unit rigs: ignition certain, mechanics untouched. */
const HOT: StrayingSurge = { ...STRAYING_SURGE, igniteChance: 1, resolveCooldownSeconds: [50, 50] };
const mkField = (surge: StrayingSurge, seed = 0x5eed): StrayField =>
  new StrayField({ seed, gate: () => GATE_ON, biomeSeed: 1 }, surge);

// ------------------------------------------------ A. the belt law
{
  const zones = [
    mkZone('home', 'farmland', 5, 0, 0),        // the player stands here
    mkZone('croft', 'farmland', 5, 60, 0),      // the legal seat
    mkZone('deep', 'farmland', STRAYING_SURGE.levelMax + 9, 120, 0), // too hard
    mkZone('meadow', 'field', 5, 0, 60),        // wrong biome
    mkZone('city', 'metropolis', 5, 60, 60),    // wrong biome
  ];
  let croft = 0, other = 0;
  for (let s = 0; s < 30; s++) {
    const f = mkField(HOT, 0x1000 + s);
    const web = mkWeb(zones, 'home', ['home', 'croft', 'deep', 'meadow', 'city']);
    for (let i = 0; i < 8 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const seat = f.peek()[0];
    if (!seat) continue;
    if (seat.zoneId === 'croft') croft++; else other++;
  }
  check('A1: ignition seats ONLY the belt at/below levelMax — never underfoot', croft >= 25 && other === 0,
    `${croft} croft, ${other} illegal`);

  const f = mkField(HOT);
  const web = mkWeb(zones, 'home', ['home', 'croft', 'deep', 'meadow', 'city']);
  for (let i = 0; i < 40; i++) f.update(0.5, web.view);
  check('A2: maxConcurrent honored', f.activeCount() <= HOT.maxConcurrent, `${f.activeCount()} active`);
  check('A3: a known seat rises LIVE (not latent)', f.peek().every(s => !s.latent));
}

// ------------------------------------------------ B. the latent call
{
  const zones = [mkZone('home', 'farmland', 5, 0, 0), mkZone('far', 'farmland', 5, 80, 0)];
  const f = mkField(HOT);
  const web = mkWeb(zones, 'home', ['home']); // 'far' is unknown ground
  for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
  const s = f.peek()[0];
  check('B1: an unknown seat settles LATENT', !!s && s.zoneId === 'far' && s.latent);
  check('B2: a latent call reads as nothing (strayingOn)', f.strayingOn('far') === null);
  f.update(200, web.view);
  check('B3: latent clocks are FROZEN (no absent resolution)', f.activeCount() === 1 && !!f.peek()[0]?.latent);
  web.visited.add('far');
  f.update(0.5, web.view);
  check('B4: known ground RISES the call', f.activeCount() === 1 && !f.peek()[0].latent && !!f.strayingOn('far'));
}

// ------------------------------------------------ C. the tug's bookkeeping
{
  const zones = [mkZone('home', 'farmland', 5, 0, 0), mkZone('croft', 'farmland', 5, 60, 0)];
  const rig = (): { f: StrayField; id: string; web: FakeWeb } => {
    const f = mkField(HOT);
    const web = mkWeb(zones, 'home', ['home', 'croft']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const id = f.peek()[0].id;
    web.setZone(f.peek()[0].zoneId); // stand the ground — the absent clock freezes
    return { f, id, web };
  };

  {
    const { f, id } = rig();
    f.noteStaged(id, 6, 2);
    f.noteStaged(id, 99, 99); // a second stage must be ignored
    const info = f.strayingOn(f.peek()[0].zoneId)!;
    check('C1: heads staged ONCE', info.staged && info.straysLeft === 6 && info.callersLeft === 2);
    f.noteReturned(id); f.noteStrayLost(id);
    const i2 = f.strayingOn(f.peek()[0].zoneId)!;
    check('C2: returns + losses decrement', i2.straysLeft === 4 && i2.returned === 1);
    f.noteConverted(id); f.noteConverted(id);
    check('C3: below raidAt the call keeps gathering', f.strayingOn(f.peek()[0].zoneId)!.phase === 'gathering');
    f.noteConverted(id);
    const i3 = f.strayingOn(f.peek()[0].zoneId)!;
    check('C4: the raid flips EXACTLY at raidAt', i3.phase === 'raid' && i3.converted === HOT.raidAt);
    f.update(HOT.raidTtl + 1, mkWeb(zones, 'home', ['home', 'croft']).view);
    check('C5: a raid pressing its whole ttl breaks the fold', f.peek()[0]?.phase === 'overrun');
    const bias = f.affectSpawns(zones[1]);
    check('C6: a lost fold wears the feral hold', bias.factionMul.chattel === HOT.overrunFactionMul
      && bias.injectFactions.includes('chattel'));
    check('C7: standing ground stirs the bloom by phase', f.activityAt(zones[1].id) === 0.6);
    const overrunId = f.peek()[0].id;
    f.update(HOT.overrunHoldSec + 1, mkWeb(zones, 'home', ['home', 'croft']).view);
    // An expired hold buys no reprieve (deliberate — only RELIEF earns quiet),
    // so a fresh call may already stand; the LOST one must be gone.
    check('C8: the hold expires and the land settles', !f.peek().some(x => x.id === overrunId));
  }
  {
    const { f, id } = rig();
    f.noteStaged(id, 4, 2);
    f.noteReturned(id); f.noteReturned(id); f.noteConverted(id); f.noteStrayLost(id);
    check('C9: heads exhausted below raidAt break the call', f.peek()[0].phase === 'relieved');
  }
  {
    const { f, id, web } = rig();
    f.noteStaged(id, 6, 2);
    f.noteCallerDown(id);
    check('C10: a fallen caller is not yet relief', f.peek()[0].phase === 'gathering');
    f.noteCallerDown(id);
    check('C11: the LAST caller breaks the call', f.peek()[0].phase === 'relieved');
    f.resolve(id);
    check('C12: resolve removes the call + starts the reprieve', f.activeCount() === 0 && f.cooldownRemaining() > 0);
    for (let i = 0; i < 20; i++) f.update(0.5, web.view);
    check('C13: the reprieve blocks fresh settles', f.activeCount() === 0);
    f.update(HOT.resolveCooldownSeconds![1], web.view);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    check('C14: the reprieve spent, the bell may call again', f.activeCount() === 1);
  }
}

// ------------------------------------------------ D. the absent clock
{
  const zones = [mkZone('home', 'farmland', 5, 0, 0), mkZone('croft', 'farmland', 5, 60, 0)];
  {
    const f = mkField(HOT);
    const web = mkWeb(zones, 'home', ['home', 'croft']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    web.setZone(f.peek()[0].zoneId);
    f.update(HOT.absentResolveSec[1] + 30, web.view);
    check('D1: ATTENDED ground never absent-resolves', f.activeCount() === 1 && f.peek()[0].phase === 'gathering');
  }
  let held = 0, lost = 0;
  for (let s = 0; s < 40; s++) {
    const f = mkField(HOT, 0x2000 + s);
    const web = mkWeb(zones, 'home', ['home', 'croft']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const first = f.peek()[0];
    if (!first) continue;
    // Stay HOME (the seat is 'croft' — unattended) and step HONEST ticks until
    // the tug settles: the id vanishing quietly = the drovers won; the ground
    // running feral = the bell did.
    let outcome: 'held' | 'lost' | null = null;
    for (let t = 0; t < HOT.absentResolveSec[1] + 30 && !outcome; t += 2) {
      f.update(2, web.view);
      const cur = f.peek().find(x => x.id === first.id);
      if (!cur) outcome = 'held';
      else if (cur.phase === 'overrun') outcome = 'lost';
    }
    if (outcome === 'held') held++;
    else if (outcome === 'lost') lost++;
  }
  check('D2: the unattended tug goes BOTH ways', held >= 8 && lost >= 8, `${held} held, ${lost} lost (of 40)`);
}

// ------------------------------------------------ E. worldstate + determinism
{
  const zones = [mkZone('home', 'farmland', 5, 0, 0), mkZone('croft', 'farmland', 5, 60, 0)];
  const f = mkField(HOT);
  const web = mkWeb(zones, 'home', ['home', 'croft']);
  for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
  f.noteStaged(f.peek()[0].id, 5, 2);
  f.noteReturned(f.peek()[0].id);
  const snap = JSON.parse(JSON.stringify(f.snapshot()));
  const g = mkField(HOT, 0x9999);
  g.restore(snap);
  check('E1: snapshot → JSON → restore → byte-identical', JSON.stringify(g.snapshot()) === JSON.stringify(snap));
  const junk = mkField(HOT);
  junk.restore(null); junk.restore(42); junk.restore({ strayings: [{}, { id: 7 }, null] });
  junk.update(0.5, web.view);
  check('E2: garbage restores tolerated (still functional)', true);
  g.pruneZones(id => id !== f.peek()[0].zoneId);
  check('E3: pruneZones drops culled ground', g.activeCount() === 0);

  const a = mkField(HOT, 0xd00d), b = mkField(HOT, 0xd00d);
  for (let i = 0; i < 60; i++) {
    const wa = mkWeb(zones, 'home', ['home', 'croft']);
    const wb = mkWeb(zones, 'home', ['home', 'croft']);
    a.update(0.5, wa.view); b.update(0.5, wb.view);
  }
  check('E4: same seed + same script = byte-identical fields',
    JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot()));
}

// ------------------------------------------------ F. the def's own integrity
{
  const lookups = {
    monster: (id: string) => !!MONSTERS[id], skill: () => true, support: () => true,
    faction: () => true, tileset: () => true, layout: () => true, structure: () => true,
    boundaryGate: () => true, sidezone: () => true, biome: (id: string) => !!BIOMES[id],
    dimension: () => true, pocketForm: () => true,
  };
  const errs = STRAYING.validate ? STRAYING.validate(lookups) : [];
  check('F1: validate() clean over live registries', errs.length === 0, errs.join('; '));
  const uncovered = STRAYING_SURGE.strayTable.filter(e => !STRAYING_SURGE.convertTo[e.id]);
  check('F2: every stray kind owns a convert row', uncovered.length === 0, uncovered.map(e => e.id).join(','));
  check('F3: the package rides the registry', PACKAGES.some(p => p.id === 'straying'));
  check('F4: the court + the changed are DORMANT species',
    isDormant({ tag: 'drove_call' } as unknown as Actor) && isDormant({ tag: 'drove_thrall' } as unknown as Actor)
    && !isDormant({ tag: 'drove_call', aiAwakened: true } as unknown as Actor));
  check('F5: the broken ewe exists and answers the bell',
    !!MONSTERS.broken_ewe && MONSTERS.broken_ewe.faction === 'chattel'
    && STRAYING_SURGE.convertTo.wool_sheep === 'broken_ewe');
}

// ------------------------------------------------ G. LIVE — the real engine
// THE SEEDED SPANS (the flake-healing recipe — 2026-08-01; probe_radiance
// carries the class autopsy): the LIVE halves run the REAL web — each
// devMintTileset mint charts its halo (eagerChartNeighbors + chartWithin),
// and that surrounding country rolls Math.random (rollSeed per halo mint,
// AI draws every stepped tick). Sections A-F never touch the global die
// (StrayField rolls only its own Rng(seed)), so each live half wears its
// OWN span: a pure function of its seed, decoupled from every rig above
// it, the true die handed back at the close (THE OFF-STREAM LAW,
// core/rng.ts) — this replaces the old file-top seedGlobalRandom, which
// pinned the die but chained every rig onto ONE stream (any upstream
// draw-count change re-rolled every rig below it). The roster's 07-26
// thin-tail sighting predates the governor pin (bd45bea); the 2026-08-01
// pre-span census measured 18/18 strict greens with byte-identical check
// lines — the spans close the residual STRUCTURAL exposure, not a live
// rate. Every assertion inside is unchanged.
withSeededRandom(0xbe1107, () => {
  const w: World = makeSimWorld('warrior', 0xbe1102);
  const zid = w.devMintTileset('farmland', 0, 5, { seed: 771177 });
  check('G1: a farmland mint stands', !!zid, zid ?? 'null');
  const sf = w.sim.strayField;
  check('G2: the field rides the default manifest', !!sf);
  if (zid && sf) {
    const ok = sf.devIgnite(w.devOverlayView(), zid);
    check('G3: devIgnite pins the call here', ok);
    const step = (secs: number, dt = 0.25): void => { for (let t = 0; t < secs; t += dt) w.update(dt); };
    step(1.5);
    const info = () => sf.strayingOn(zid);
    const callers = () => w.actors.filter(a => !a.dead && a.tag === 'drove_call');
    const thralls = () => w.actors.filter(a => !a.dead && a.tag === 'drove_thrall');
    const i0 = info();
    check('G4: the scene stages (heads rolled once)', !!i0 && i0.staged && i0.straysLeft > 0 && i0.callersLeft > 0,
      i0 ? `${i0.straysLeft} loose, ${i0.callersLeft} callers` : 'no info');
    check('G5: the ledger surfaces the Vault card', (w.ledger.straying_seen ?? 0) >= 1);
    const court = callers();
    check('G6: the court stands DORMANT at its posts', court.length > 0 && court.every(a => isDormant(a) && !!a.aiPost));

    // THE TOUCH: strays keep their 'critter' texture on purpose (the wolf-
    // drama contract — no scene tag to find them by), so the probe reads the
    // scene's own roster for a TARGET (targeting only; every assertion still
    // goes through the public surfaces).
    const scene = (w as unknown as { strayScene: { strays: { a: Actor; state: string }[] } | null }).strayScene;
    const before = info()!;
    check('G7: loose heads graze the corridor (critter texture, no tag)',
      !!scene && scene.strays.length === before.straysLeft
      && scene.strays.every(s => s.a.tag === 'critter' && !s.a.dead),
      scene ? `${scene.strays.length} tracked for ${before.straysLeft} loose` : 'no scene');
    if (scene && scene.strays.length) {
      const target = scene.strays[0].a;
      // The touch, then STEP AWAY: a body parked in even a sheep's dim sight
      // is a standing worry that owns its tick — the walk home is an idle-
      // ladder act, and herding is done MOVING (touch and keep walking).
      w.player.pos.x = target.pos.x + 26; w.player.pos.y = target.pos.y;
      step(0.8);
      w.player.pos.x = 40; w.player.pos.y = 40;
      step(16);
    }
    const after = info();
    check('G8: a touched head walks home and COUNTS (paid by the head)',
      !!after && after.returned > before.returned,
      after ? `returned ${before.returned} → ${after.returned}` : 'resolved early');

    // CALL 1 ENDS BY THE BLADE: break every caller mid-gathering — the call
    // breaks, the loose remember themselves, the purse pays.
    for (const a of callers()) w.kill(a, false, w.player);
    step(2);
    check('G9: breaking every caller breaks the call (relieved + paid)',
      info() === null && (w.ledger.strayings_relieved ?? 0) >= 1,
      `ledger ${w.ledger.strayings_relieved ?? 0}`);

    // CALL 2 — THE BELL UNOPPOSED: no touches, no farm hands, no wolves (rig
    // isolation — the farm helping itself is D2's weather, not this rig's
    // mechanism). Every head converts, the court rouses at raidAt, and
    // breaking the march is the defense lane.
    for (const a of w.actors) {
      if (!a.dead && (a.faction === 'freehold' || a.defId === 'plains_wolf' || (a.defId ?? '').startsWith('den_'))) {
        w.kill(a, true);
      }
    }
    w.player.pos.x = 40; w.player.pos.y = 40;
    check('G10: a pinned relief cools nothing — the bell may call again at once',
      sf.devIgnite(w.devOverlayView(), zid));
    step(1.5);
    let sawDormantThrall = false;
    let guard = 0;
    while (guard++ < 700 && info()?.phase === 'gathering') {
      step(0.5, 0.25);
      sawDormantThrall ||= thralls().some(a => isDormant(a));
    }
    step(0.5); // the engine performs the rouse on the tick AFTER the flip
    const i1 = info();
    check('G11: the bell unopposed converts every head into the march',
      !!i1 && i1.phase === 'raid' && i1.converted >= STRAYING_SURGE.raidAt
      && callers().every(a => a.aiAwakened === true),
      i1 ? `phase ${i1.phase}, ${i1.converted} gone` : 'resolved early');
    check('G12: the changed walked to the rally DORMANT first', sawDormantThrall && thralls().length >= 1,
      `${thralls().length} thralls`);
    // plain-weight authoring (2026-08-06): farmland@771177 now deals 'the
    // patchwork acres' — the plain face's richer stock leaves 2 heads still
    // LOOSE when the bell turns, and the sweep converts a ripe head even
    // mid-raid (world.ts THE DEFENSE: the fold holds when the march is
    // broken to the LAST body — fresh thralls are more march). The break
    // therefore PRESSES until no marcher stands (the player's own fight),
    // instead of assuming the loose pool was spent at raid time; every
    // assertion below is unchanged.
    let presses = 0;
    while (presses++ < 8 && info() !== null) {
      for (const a of [...callers(), ...thralls()]) w.kill(a, false, w.player);
      step(2);
    }
    check('G13: breaking the march holds the fold (the defense pays too)',
      info() === null && (w.ledger.strayings_relieved ?? 0) >= 2,
      `ledger ${w.ledger.strayings_relieved ?? 0}`);

    // CALL 3 — THE ROUND TRIP: a fresh pinned call, a walk away, a walk back —
    // the scene re-stages from the overlay's counts without double-spawning.
    const ok3 = sf.devIgnite(w.devOverlayView(), zid);
    check('G14: the ground may be called a third time', ok3);
    step(1.5);
    const staged = info();
    const courtBefore = callers().length;
    const zid2 = w.devMintTileset('grassland', 3, 5, { seed: 881188 });
    check('G15: the call stands while the player is away (pinned)', !!zid2 && sf.peek().some(s => s.zoneId === zid),
      `${sf.activeCount()} active`);
    w.loadZone(zid);
    step(1.5);
    const restaged = info();
    check('G16: re-entry re-stages from the remembered counts',
      !!staged && !!restaged && restaged.staged && restaged.callersLeft === staged.callersLeft
      && callers().length === restaged.callersLeft,
      restaged ? `${callers().length} court vs ${restaged.callersLeft} remembered (was ${courtBefore})` : 'gone');
  }
});

// ------------------------------------------------ H. LIVE — THE CARRY LANE
// The grab fabric meets the fold. THE LAW (the Drove's pen law, worn by both
// events): a head in someone's HANDS is not herded and is not banked — SETTING
// IT DOWN on the fold ground is what pays. Driven end to end through the
// ordinary grabSeize path (useSkill → the real seize), never by setting
// heldBy/gripping by hand; the only rig pokes are ISOLATION (the bell's clock
// is G11's lane, the grip's patience is probe_grab's) so this rig tests the
// straying's bookkeeping and nothing else.
// THE SEEDED SPAN — the carry lane's own die (section G's note carries the law).
withSeededRandom(0xbe1108, () => {
  const w: World = makeSimWorld('warrior', 0xbe1104);
  const p = w.player;
  // (Mint seed re-pinned 553355 → 553356 at the theater re-founding, 2026-08-05:
  // the zone-event lane's keyed draws re-roll per-seed event seating world-wide
  // — same rates, new verdicts — and the old seed's post-boot stream staged the
  // carry head onto a road the walk budget couldn't finish. The rig's claims
  // are structural; any workable staging proves them.)
  const zid = w.devMintTileset('farmland', 0, 5, { seed: 553356 });
  const sf = w.sim.strayField;
  check('H1: a farmland mint + the field stand', !!zid && !!sf, zid ?? 'null');
  if (zid && sf) {
    const step = (secs: number, dt = 0.25): void => { for (let t = 0; t < secs; t += dt) w.update(dt); };
    const info = () => sf.strayingOn(zid);
    const cfg = sf.surge();
    const SPEC = (SKILLS.seize.effects.find(f => f.type === 'grabSeize') as { grab: GrabSpec }).grab;
    /** A point `d` along the from→to bearing (rig placement, no hardcoded map). */
    const along = (from: Vec2, to: Vec2, d: number): Vec2 => {
      const dx = to.x - from.x, dy = to.y - from.y, l = Math.hypot(dx, dy) || 1;
      return vec(from.x + (dx / l) * d, from.y + (dy / l) * d);
    };

    // THE MASS GATE, measured over the AUTHORED table: the fold's own stock is
    // carryable at DEFAULT policy — no `grabbable` word on any def. The ox is
    // the honest exception (it is authored as 'the heavy save'): the mass law
    // prices it out of a bare pair of hands, and that is reported, not gated.
    const verdicts = cfg.strayTable.map(e =>
      `${e.id} ${grabRefusal(p, w.createMonster(e.id, 5, 'enemy'), SPEC, 0) ?? 'CARRYABLE'}`);
    const ewe = w.createMonster('wool_sheep', 5, 'enemy');
    check('H2: the mass/policy gate ADMITS the fold\'s ewe at default policy',
      grabRefusal(p, ewe, SPEC, 0) === null && ewe.grabbable === undefined,
      `${verdicts.join(' · ')} (hands ${p.effectiveWeight().toFixed(2)})`);

    sf.devIgnite(w.devOverlayView(), zid);
    step(1.5);
    type SStray = { a: Actor; state: string; bellLeft: number };
    type SScene = { fold: Vec2; rally: Vec2; strays: SStray[] } | null;
    const scene = (w as unknown as { strayScene: SScene }).strayScene;
    const carryable = (scene?.strays ?? []).filter(s => grabRefusal(p, s.a, SPEC, 0) === null);
    const sheep = carryable.filter(s => s.a.defId === 'wool_sheep');
    const carry = sheep[0] ?? carryable[0];
    const touch = sheep[1] ?? carryable.find(s => s !== carry);
    check('H3: the staged fold offers heads a pair of hands can lift',
      !!scene && !!carry && !!touch,
      scene ? `${carryable.length} carryable of ${scene.strays.length}` : 'no scene');

    if (scene && carry && touch) {
      // RIG ISOLATION — the spares are scenery (parked at the rally, out of
      // every swing), the field is cleared of the farm's own weather (G8's
      // lane), and both lane heads cannot whiff a single roll.
      for (const s of scene.strays) {
        s.bellLeft = cfg.bellPull[1] * 4;   // the bell's own lane is G11
        if (s === carry || s === touch) continue;
        s.a.pos = w.clampPos(vec(scene.rally.x, scene.rally.y), s.a.radius);
        s.a.untargetable = true;
      }
      for (const a of w.actors) {
        if (a.dead || a === p || a.tag === 'drove_call') continue;
        if (scene.strays.some(s => s.a === a)) continue;
        w.kill(a, true);
      }
      for (const s of [carry, touch]) s.a.sheet.setSource('probe', [mod('evasion', 'flat', -1e6)]);
      // THE TOUCH LANE'S OWN ISOLATION (2026-07-30): the scatter may stage
      // the second head ANYWHERE — including square on the carry's road
      // home, where the player's own passage herds it mid-walk (touched at
      // herdRadius), pre-spending its 'loose' state AND banking a second
      // return into the ledger H5-H7 read. A world-geography reshuffle (a
      // new biome joining the field table moves the mint's coord, and
      // coord-fed generation moves the fold and the whole scatter with it)
      // tripped exactly that — minTouchD measured 27px against herdR 84.
      // So the touch head waits out the carry lane AS SCENERY at the rally
      // beside the spares (the rig's own proven parking), and returns to
      // its staged ground — still loose, still untouched — for the gaff
      // lane below, which is the lane that actually tests it.
      const touchHome = vec(touch.a.pos.x, touch.a.pos.y);
      touch.a.pos = w.clampPos(vec(scene.rally.x, scene.rally.y), touch.a.radius);
      touch.a.untargetable = true;
      w.devGrabGrant('seize'); w.devGrabGrant('gaff_cast');
      const seize = p.skills.find(s => s?.def.id === 'seize')!;
      const gaff = p.skills.find(s => s?.def.id === 'gaff_cast')!;

      // --- THE CARRY: Seize a loose head, walk it home, SET IT DOWN --------
      const r0 = info()!.returned, l0 = w.ledger.strays_returned ?? 0, xp0 = w.localSeat.meta.xp;
      // Stand on the head's ROAD HOME: the touch starts the wheel, and a head
      // that remembers the fold trots off DURING the swing — meet it coming.
      p.pos = w.clampPos(along(carry.a.pos, scene.fold, 50), p.radius);
      p.facing = Math.atan2(carry.a.pos.y - p.pos.y, carry.a.pos.x - p.pos.x);
      w.useSkill(p, seize, vec(carry.a.pos.x, carry.a.pos.y));
      for (let i = 0; i < 90 && !p.gripping; i++) w.update(1 / 60);
      check('H4: a REAL Seize closes the hold on a staged head (the pair 1:1)',
        p.gripping?.id === carry.a.id && carry.a.heldBy === p.id && !carry.a.dead,
        p.gripping ? `verb ${p.gripping.verb}` : 'no hold');
      if (p.gripping) {
        // WALK the holder home (the catch REELS to its seat, it never
        // teleports) on the wheel's own pathing idiom. The hold's patience and
        // break meter are pinned every tick: those clocks are probe_grab's
        // lane, and this rig must not race them across a field's width.
        for (let i = 0; i < 1200 && dist(p.pos, scene.fold) > 6; i++) {
          const pf = w.pathField();
          let goal: Vec2 = scene.fold;
          if (pf?.pathStep && !(pf.lineWalkable?.(p.pos, scene.fold) ?? false)) {
            goal = pf.pathStep(p.pos, scene.fold) ?? scene.fold;
          }
          p.facing = Math.atan2(goal.y - p.pos.y, goal.x - p.pos.x);
          w.moveActor(p, goal.x - p.pos.x, goal.y - p.pos.y, 1 / 60);
          if (p.gripping) { p.gripping.until = w.time + 60; p.gripping.struggle = 0; }
          w.update(1 / 60);
        }
        for (let i = 0; i < 240 && dist(carry.a.pos, scene.fold) > cfg.arriveRadius * 0.5; i++) {
          if (p.gripping) { p.gripping.until = w.time + 60; p.gripping.struggle = 0; }
          w.update(1 / 60);
        }
        step(0.6);
        const dHeld = dist(carry.a.pos, scene.fold);
        check('H5: a CARRIED head standing the fold banks NOTHING (still in hand)',
          dHeld <= cfg.arriveRadius && carry.a.heldBy === p.id
          && info()?.returned === r0 && (w.ledger.strays_returned ?? 0) === l0,
          `d ${dHeld.toFixed(0)} ≤ ${cfg.arriveRadius} · returned ${info()?.returned} · ledger ${w.ledger.strays_returned ?? 0}`);
        p.gripping.until = w.time;   // patience over — carry has no throw spec, so a plain SET DOWN
        step(1.5);
        const paid = info();
        check('H6: SET DOWN inside arriveRadius pays — once, and re-posted at the fold',
          !!paid && paid.returned === r0 + 1 && (w.ledger.strays_returned ?? 0) === l0 + 1
          && w.localSeat.meta.xp > xp0 && carry.a.heldBy === undefined
          && !!carry.a.aiPost && dist(carry.a.aiPost, scene.fold) < 1
          && !scene.strays.some(s => s.a === carry.a),
          paid ? `returned ${r0}→${paid.returned} · ledger ${w.ledger.strays_returned ?? 0} · xp +${w.localSeat.meta.xp - xp0}` : 'call resolved');
        step(4);
        check('H7: and it counts EXACTLY once (the fold does not re-bank it)',
          info()?.returned === r0 + 1 && (w.ledger.strays_returned ?? 0) === l0 + 1,
          `returned ${info()?.returned} · ledger ${w.ledger.strays_returned ?? 0}`);
      }

      // --- THE TOUCH GUARD: held from BEYOND herdRadius, then walked in ----
      // The gaff is the only reach longer than the herd radius (melee closes
      // inside it by law), so this is the one honest way to hold a head that
      // has never been touched.
      // The parked touch head takes its staged ground back for its own lane.
      touch.a.pos = w.clampPos(touchHome, touch.a.radius);
      touch.a.untargetable = false;
      p.pos = w.clampPos(along(touch.a.pos, scene.rally, 160), p.radius);
      p.facing = Math.atan2(touch.a.pos.y - p.pos.y, touch.a.pos.x - p.pos.x);
      const reach = dist(p.pos, touch.a.pos);
      w.useSkill(p, gaff, vec(touch.a.pos.x, touch.a.pos.y));
      for (let i = 0; i < 120 && !p.gripping; i++) w.update(1 / 60);
      check('H8: the gaff takes an UNTOUCHED head from beyond herdRadius',
        p.gripping?.id === touch.a.id && touch.a.heldBy === p.id && touch.state === 'loose',
        `reach ${reach.toFixed(0)} > ${cfg.herdRadius} · state ${touch.state}`);
      if (p.gripping) {
        p.gripping.until = w.time + 60;
        step(0.8);
        check('H9: a HELD head in herd reach does not remember the fold',
          dist(p.pos, touch.a.pos) <= cfg.herdRadius && touch.a.heldBy === p.id && touch.state === 'loose',
          `d ${dist(p.pos, touch.a.pos).toFixed(0)} ≤ ${cfg.herdRadius} · state ${touch.state}`);
        p.gripping.until = w.time;   // set it down where it stands — the touch may take NOW
        step(1.0);
        check('H10: set down in herd reach, the touch takes at once (the guard reads the HOLD, not the head)',
          touch.a.heldBy === undefined && touch.state === 'homing', `state ${touch.state}`);
      }
    }
  }
});

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
